import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sessionMemberId } from '@/lib/db/session'
import {
  commissionPayouts, commissionRequests, commissionRules, commissionShares, creditNotes, leadAssignees, leadEvents, leads, members, projectInvoices, projectPayments, projects, quotes, settings, vendors as vendorsTable,
  type CommissionPayout, type CommissionRequest, type CommissionRule, type CreditNote,
} from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { runsMoney, seesBooks } from '@/lib/settings/roles'
import { seesMoney } from '@/lib/projects/policy'
import { moneyInputOf } from '@/lib/projects/money-queries'
import { billGstRate, isOutsideContract, moneyOf, type MoneySummary } from '@/lib/projects/money'
import { countsAsPaid } from '@/lib/projects/payments-model'
import { holdOf } from '@/lib/projects/hold'
import { fetchStudio } from '@/lib/settings/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { titleCaseName } from '@/lib/format'
import { costsOf, type CostSummary } from './costs'
import { fetchPeople, fetchVendors, loadCostRecords, type CostPerson } from './queries'
import type { VendorRecord } from './model'
import { insightsOf, profitOf, withoutProfit, type Insight, type ProfitView } from './profit'
import { seesProfit } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { CREDIT_RULES_KEY, DEFAULT_CREDIT_RULES, parseCreditRules, type CreditRules } from './credit-model'
import {
  commissionsOf, isBasis, netOf, parseRuleStages,
  type CommissionAsk, type CommissionPayoutRecord, type CommissionProject, type CommissionRuleRecord, type CommissionSummary, type ShareRecord,
} from './commission'

/*
 * (gaps build F2 — the books) The books on the server: every project's money in (`moneyOf`) and money out (`costsOf`) side by side, its profit and
 * what its numbers say, the studio's overhead, commission, and the credit notes — read by Finance › Overview · Commissions, Company › Reports,
 * the Money tab's profit half and Accounting. Q-20 · F2-Q2 · F2-Q8 on the server: the figures go to Owners and Admins only; a member is handed
 * their own commission and nothing else.
 */

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)
export const ruleRecord = (r: CommissionRule): CommissionRuleRecord => ({
  id: r.id, memberId: r.memberId, projectId: r.projectId, basis: isBasis(r.basis) ? r.basis : 'none', rateBp: r.rateBp, fixedMinor: r.fixedMinor,
  fromDay: r.fromDay.getTime(), endedAt: ms(r.endedAt), requestId: r.requestId, createdBy: r.createdBy, createdAt: r.createdAt.getTime(),
  stages: parseRuleStages(r.stagesJson),   // (parity map, FB-043) a project's rule on chosen payment stages
  endedBy: r.endedBy,   // (parity map, FB-073) the Changes list
})
export const payoutRecord = (p: CommissionPayout): CommissionPayoutRecord => ({
  id: p.id, memberId: p.memberId, projectId: p.projectId, amountMinor: p.amountMinor, paidOn: p.paidOn.getTime(), method: p.method, reference: p.reference, note: p.note,
  createdBy: p.createdBy, createdAt: p.createdAt.getTime(), reversedAt: ms(p.reversedAt), reversedBy: p.reversedBy, reverseReason: p.reverseReason,
})
export const askRecord = (r: CommissionRequest): CommissionAsk => ({
  id: r.id, projectId: r.projectId, memberId: r.memberId, basis: isBasis(r.basis) ? r.basis : 'payments', rateBp: r.rateBp, fixedMinor: r.fixedMinor, reason: r.reason,
  status: r.status === 'approved' || r.status === 'declined' || r.status === 'withdrawn' ? r.status : 'open', answeredBy: r.answeredBy, answeredAt: ms(r.answeredAt),
  answerNote: r.answerNote, approvedRateBp: r.approvedRateBp, approvedFixedMinor: r.approvedFixedMinor, createdAt: r.createdAt.getTime(),
})

/** A credit note as the screens show it (F2-Q9). */
export type CreditNoteView = {
  id: string; projectId: string; invoiceId: string; number: string; reason: string; amountMinor: number; gstMinor: number; status: 'issued' | 'void'
  issuedAt: number; issuedBy: string | null; voidReason: string | null; voidedAt: number | null; voidedBy: string | null
  refundMinor: number | null; refundedOn: number | null; refundMethod: string | null; refundReference: string | null; fileId: string | null
  /** Its invoice, as named on Money ("INV-2026-004 · Deposit"). */
  invoiceLabel: string; stageName: string
  /** (pending modules S07 — D-14) `overpayment`: the client's money held as credit — it lowers no invoice (its invoice is the one overpaid) */
  kind: 'credit' | 'overpayment'
}
export const creditView = (c: CreditNote, inv: { label: string; stageName: string } | undefined): CreditNoteView => ({
  id: c.id, projectId: c.projectId, invoiceId: c.invoiceId, number: c.number, reason: c.reason, amountMinor: c.amountMinor, gstMinor: c.gstMinor, status: c.status === 'void' ? 'void' : 'issued',
  issuedAt: c.issuedAt.getTime(), issuedBy: c.issuedBy, voidReason: c.voidReason, voidedAt: ms(c.voidedAt), voidedBy: c.voidedBy,
  refundMinor: c.refundMinor, refundedOn: ms(c.refundedOn), refundMethod: c.refundMethod, refundReference: c.refundReference, fileId: c.fileId,
  invoiceLabel: inv?.label ?? 'Invoice', stageName: inv?.stageName ?? '',
  kind: c.kind === 'overpayment' ? 'overpayment' : 'credit',
})
export async function creditViewsOf(projectIds: string[]): Promise<CreditNoteView[]> {
  if (!projectIds.length) return []
  const [rows, invs] = await Promise.all([
    db.select().from(creditNotes).where(inArray(creditNotes.projectId, projectIds)).orderBy(asc(creditNotes.issuedAt)),
    db.select({ id: projectInvoices.id, number: projectInvoices.number, ext: projectInvoices.externalRef, stage: projectInvoices.stageName }).from(projectInvoices).where(inArray(projectInvoices.projectId, projectIds)),
  ])
  return rows.map((c) => { const i = invs.find((x) => x.id === c.invoiceId); return creditView(c, i ? { label: i.number ?? i.ext ?? 'Invoice', stageName: i.stage } : undefined) })
}

/** A payment that counts, as the books read it — its own id, its invoice, its day, before and after GST, whether it pays the contract. */
export type BookPayment = { id: string; invoiceId: string; paidOn: number; amountMinor: number; netMinor: number; contract: boolean; method: string; reference: string | null; receipt: string | null }

export type BookProject = {
  id: string; number: string; name: string; stage: string; projectType: string | null; leadId: string; client: string
  team: { id: string; name: string }[]; onHold: boolean; completedAt: number | null; createdAt: number
  money: MoneySummary; costs: CostSummary; profit: ProfitView; insights: Insight[]
  payments: BookPayment[]; credits: CreditNoteView[]
  /** (parity map, FB-105) the entity its signed quote is issued under (null = the studio's own) — Reports' Issued by scope */
  entity: string | null
  /** (parity map, FB-077) when it started (In progress) and the client's budget on the lead — Profitability's days to complete and budget range */
  startedAt: number | null; budgetMinor: number | null
}

/** Everything a set of projects' books read — money in, money out, the payments that count, the credit notes. */
async function projectBooks(rows: { p: typeof projects.$inferSelect; l: typeof leads.$inferSelect }[], vendors: VendorRecord[], now: number): Promise<BookProject[]> {
  if (!rows.length) return []
  const ids = rows.map((r) => r.p.id)
  const quoteIds = rows.map((r) => r.p.quoteId).filter((x): x is string => !!x)
  const [records, team, people, pays, credits, entities] = await Promise.all([
    loadCostRecords({ projectIds: ids, overhead: false }),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, rows.map((r) => r.l.id))),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select().from(projectPayments).where(inArray(projectPayments.projectId, ids)),
    creditViewsOf(ids),
    quoteIds.length ? db.select({ id: quotes.id, entity: quotes.issuingEntity }).from(quotes).where(inArray(quotes.id, quoteIds)) : Promise.resolve([] as { id: string; entity: string | null }[]),   // (parity map, FB-105)
  ])
  const trades = Object.fromEntries(vendors.map((v) => [v.id, v.trade]))
  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.name ?? 'The vendor'
  return Promise.all(rows.map(async ({ p, l }) => {
    const input = await moneyInputOf(p)
    const money = moneyOf(input, now)
    const costs = costsOf({
      pos: records.pos.filter((x) => x.projectId === p.id), bills: records.bills.filter((x) => x.projectId === p.id),
      expenses: records.expenses.filter((x) => x.projectId === p.id), payouts: records.payouts.filter((x) => x.projectId === p.id), vendorTrades: trades,
    }, now)
    const profit = profitOf(money, costs)
    const invoiceOf = (id: string) => money.invoices.find((i) => i.id === id)
    const payments: BookPayment[] = pays.filter((x) => x.projectId === p.id && countsAsPaid(x)).map((x) => {
      const inv = invoiceOf(x.invoiceId)
      return { id: x.id, invoiceId: x.invoiceId, paidOn: x.paidOn.getTime(), amountMinor: x.amountMinor, netMinor: netOf(x.amountMinor, inv ? billGstRate(input, inv) : money.gstRate),   // (S43D, F2-04) the GST its bill holds
        contract: !!inv && inv.status === 'sent' && !isOutsideContract(inv), method: x.method, reference: x.reference, receipt: x.receiptNumber }
    }).sort((a, b) => a.paidOn - b.paidOn)
    const teamIds = team.filter((t) => t.leadId === l.id).map((t) => t.memberId)
    return {
      id: p.id, number: p.number, name: p.name, stage: p.stage, projectType: p.projectType, leadId: l.id, client: titleCaseName(l.name),
      team: teamIds.map((id) => ({ id, name: people.find((m) => m.id === id)?.name ?? 'A member' })), onHold: !!holdOf(p), completedAt: ms(p.completedAt), createdAt: p.createdAt.getTime(),
      money, costs, profit, insights: insightsOf({ projectId: p.id, stage: p.stage, money, costs, profit, vendorName, now }),
      payments, credits: credits.filter((c) => c.projectId === p.id),
      entity: entities.find((q) => q.id === p.quoteId)?.entity ?? null, startedAt: ms(p.startedAt), budgetMinor: l.budgetMinor ?? null,
    }
  }))
}

/** The commission records, and `commissionsOf` over the projects given. */
/** (S43D, F2-04) The contract before GST: the base at the contract's own GST share and each approved variation order at its own — the one
    figure as before while every rate is the studio's. */
function contractNetOf(m: MoneySummary): number {
  const rates = Object.values(m.variationGstRates)
  if (m.contractGstRate === m.gstRate && rates.every((r) => r === m.gstRate)) return netOf(m.contractMinor, m.gstRate)
  const vos = m.variations.filter((v) => v.approved).reduce((s, v) => s + netOf(v.amountMinor, m.variationGstRates[v.id] ?? m.gstRate), 0)
  return Math.max(0, netOf(m.baseMinor ?? 0, m.contractGstRate) + vos)
}

export async function commissionFacts(list: BookProject[], now: number): Promise<{ summary: CommissionSummary; rules: CommissionRuleRecord[]; shares: ShareRecord[]; asks: CommissionAsk[]; payouts: CommissionPayoutRecord[] }> {
  const [ruleRows, shareRows, askRows, payoutRows] = await Promise.all([
    db.select().from(commissionRules).orderBy(asc(commissionRules.fromDay)),
    db.select().from(commissionShares),
    db.select().from(commissionRequests).orderBy(asc(commissionRequests.createdAt)),
    db.select().from(commissionPayouts).orderBy(asc(commissionPayouts.paidOn)),
  ])
  const rules = ruleRows.map(ruleRecord)
  const shares: ShareRecord[] = shareRows.map((s) => ({ projectId: s.projectId, memberId: s.memberId, shareBp: s.shareBp }))
  const payouts = payoutRows.map(payoutRecord)
  const projectsIn: CommissionProject[] = list.map((p) => ({
    id: p.id, name: p.name, number: p.number, stage: p.stage, team: p.team.map((m) => m.id),
    /* (parity map, FB-043) each payment's stage — a rule on chosen stages pays on those only */
    payments: p.payments.filter((x) => x.contract).map((x) => ({ id: x.id, paidOn: x.paidOn, netMinor: x.netMinor, stageRef: p.money.invoices.find((v) => v.id === x.invoiceId)?.stageRef ?? null })),
    contractNetMinor: contractNetOf(p.money), profitNetMinor: Math.max(0, netOf(p.profit.profitMinor, p.money.gstRate)),
    stages: p.money.stages.map((st) => ({ ref: st.ref, netMinor: netOf(st.nominalMinor, p.money.contractGstRate) })),   // (parity map, FB-072) what Expected reads — (S43D) the contract's own GST share
  }))
  return { summary: commissionsOf({ projects: projectsIn, rules, shares, payouts, now }), rules, shares, asks: askRows.map(askRecord), payouts }
}

export type BooksViewer = { id: string; role: string; name: string; runs: boolean
  /** (parity map, MO-098 · FB-114) sets commission rates and shares and answers asks — Owners and Admins; `runs` (the books) is Accounting's too */ sets: boolean }
export type BooksData = {
  projects: BookProject[]
  overhead: CostSummary
  vendors: VendorRecord[]
  people: CostPerson[]
  commission: Awaited<ReturnType<typeof commissionFacts>>
  viewer: BooksViewer
  gstRate: number
  studio: string
  now: number
  /** (parity map, FB-105) the studio's issuing entities (Company › Profile) — the Issued by scope shows only with two or more */
  entities: { id: string; name: string; retired?: boolean }[]
  /** (pending modules S41b-1) whether the viewer sees profit and margin (Who sees costs and margins) — else each project's came without them
      and the P&L and Profitability reports stay closed */
  profits?: boolean
}
const allProjectRows = () => db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(asc(projects.number))

/** Finance › Overview · Accounting and Company › Reports › Finance: the whole studio's books — Owners and Admins only (null for anyone else);
    (parity map, FB-114 · MO-098) and Accounting, who keeps them. */
export async function fetchBooks(): Promise<BooksData | null> {
  const viewer = await fetchViewer()
  if (!seesBooks(viewer.role)) return null
  const now = Date.now()
  const [vendors, people, studio, rows, overheadRecords, brand] = await Promise.all([fetchVendors(viewer), fetchPeople(viewer), fetchStudio(), allProjectRows(), loadCostRecords({ projectIds: [], overhead: true }), fetchBrand()])
  const list = await projectBooks(rows, vendors, now)
  const overhead = costsOf({ ...overheadRecords, vendorTrades: Object.fromEntries(vendors.map((v) => [v.id, v.trade])) }, now)
  const me = people.find((m) => m.id === viewer.id)
  const commission = await commissionFacts(list, now)   // on the real profit, before anything is left out below
  /* (pending modules S41b-1 — 1.0: P&L, profitability and margin alerts refused, the overview's margin null) a member whose role doesn't see
     profit and margin is sent every project's money and costs, never its profit, margin or the insights that quote them */
  const shown = seesProfit(viewer) ? list : list.map((p) => ({ ...p, profit: withoutProfit(p.profit), insights: [] }))
  return {
    projects: shown, overhead, vendors, people, commission, profits: seesProfit(viewer),
    viewer: { id: viewer.id, role: viewer.role, name: me?.name ?? 'You', runs: true, sets: runsStudio(viewer.role) }, gstRate: studio.gstRegistered ? studio.gstPct : 0, studio: studio.name, now,
    entities: brand.details.entities.map((e) => ({ id: e.id, name: e.name, retired: !!e.retired })),
  }
}

/* ── Finance › Commissions (F2-Q8: everyone — a member their own) ─────────────────────────────────────────────────────────────── */

export type CommissionsData = {
  viewer: BooksViewer
  /** The projects in the list: every one for Owners and Admins; the ones a member works on (or was paid on) otherwise. */
  projects: { id: string; number: string; name: string; stage: string; team: { id: string; name: string }[]
    /** (the calm UI build 2026-10-27, 5-26) the client's name — the first line of Finance's one Project cell (display only) */ client: string }[]
  summary: CommissionSummary
  rules: CommissionRuleRecord[]
  shares: ShareRecord[]
  asks: CommissionAsk[]
  payouts: CommissionPayoutRecord[]
  people: CostPerson[]
  now: number
}
export async function fetchCommissions(): Promise<CommissionsData> {
  const viewer = await fetchViewer()
  const runs = seesBooks(viewer.role)   // (parity map, FB-114) everyone's commission — Owners, Admins and Accounting (who pays it)
  const now = Date.now()
  const [vendors, people, rows] = await Promise.all([fetchVendors(viewer), fetchPeople(viewer), allProjectRows()])
  /* a member: the projects they are on (Who sees leads lets them see those) */
  const team = runs ? [] : await db.select({ leadId: leadAssignees.leadId }).from(leadAssignees).where(eq(leadAssignees.memberId, viewer.id))
  const paidOn = runs ? [] : await db.select({ projectId: commissionPayouts.projectId }).from(commissionPayouts).where(eq(commissionPayouts.memberId, viewer.id))
  const mine = rows.filter((r) => runs || team.some((t) => t.leadId === r.l.id) || paidOn.some((x) => x.projectId === r.p.id))
  const list = await projectBooks(mine, vendors, now)
  const facts = await commissionFacts(list, now)
  const me = people.find((m) => m.id === viewer.id)
  const own = <T extends { memberId: string | null }>(xs: T[]) => (runs ? xs : xs.filter((x) => x.memberId === viewer.id))
  return {
    viewer: { id: viewer.id, role: viewer.role, name: me?.name ?? 'You', runs, sets: runsStudio(viewer.role) },
    projects: list.map((p) => ({ id: p.id, number: p.number, name: p.name, stage: p.stage, team: runs ? p.team : p.team.filter((m) => m.id === viewer.id), client: p.client })),
    summary: runs ? facts.summary : (() => { const lines = facts.summary.lines.filter((l) => l.memberId === viewer.id); const s = (k: 'earnedMinor' | 'paidMinor' | 'owedMinor') => lines.reduce((x, l) => x + l[k], 0); return { lines, earnedMinor: s('earnedMinor'), paidMinor: s('paidMinor'), owedMinor: s('owedMinor'), byMember: facts.summary.byMember.filter((b) => b.memberId === viewer.id) } })(),
    /* a member reads the rules that touch them (the studio's, their own, their projects') — never another member's own rate */
    rules: runs ? facts.rules : facts.rules.filter((r) => r.memberId === null ? (r.projectId === null || mine.some((x) => x.p.id === r.projectId)) : r.memberId === viewer.id),
    shares: runs ? facts.shares : facts.shares.filter((s) => s.memberId === viewer.id),
    asks: own(facts.asks), payouts: own(facts.payouts), people, now,
  }
}

/* ── One project's books (the Money tab: profit, what the numbers say, credit notes) ──────────────────────────────────────────── */

export type ProjectBooks = {
  /** Owners and Admins only (Q-20) — null for anyone else. */
  profit: ProfitView | null
  insights: Insight[] | null
  credits: CreditNoteView[]
  /** Whether this viewer issues, voids and refunds credit notes (Owners and Admins, F-18's rule — parity map, MI-007: and Accounting). */
  issues: boolean
}
export async function fetchProjectBooks(projectId: string): Promise<ProjectBooks | null> {
  const viewer: Viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return null
  const teamIds = (await db.select({ m: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.l.id))).map((t) => t.m)
  if (!seesMoney(viewer, teamIds)) return null
  /* (parity map, MI-007) profit and what the numbers say are the books (Owners, Admins, Accounting); issuing a credit note is running the money */
  if (!seesBooks(viewer.role)) return { profit: null, insights: null, credits: await creditViewsOf([projectId]), issues: false }
  /* (pending modules S41b-1) the books, without the profit, its margin and what they say, for a role the Owner switched off */
  if (!seesProfit(viewer)) return { profit: null, insights: null, credits: await creditViewsOf([projectId]), issues: runsMoney(viewer.role) }
  const vendors = await fetchVendors(viewer)
  const [b] = await projectBooks([row], vendors, Date.now())
  if (!b) return null
  return { profit: b.profit, insights: b.insights, credits: b.credits, issues: runsMoney(viewer.role) }
}

/* ── Settings › Finance › Commission · Credit notes (F2-Q4 · Q9) ──────────────────────────────────────────────────────────────── */

export type BooksSettings = {
  credit: { rules: CreditRules; numbers: string[] }
  commission: {
    /** The rules in force today, per scope. */
    rules: CommissionRuleRecord[]
    members: { id: string; name: string; role: string }[]
    projects: { id: string; number: string; name: string; team: string[] }[]
  }
}
/** What Settings › Finance shows of the books — everyone reads it (the read-only scope), Owners and Admins change it. */
export async function fetchBooksSettings(): Promise<BooksSettings> {
  const [creditRow, numbers, ruleRows, people, rows] = await Promise.all([
    db.select().from(settings).where(eq(settings.key, CREDIT_RULES_KEY)).limit(1),
    db.select({ n: creditNotes.number }).from(creditNotes),
    db.select().from(commissionRules).where(isNull(commissionRules.endedAt)).orderBy(asc(commissionRules.createdAt)),
    db.select({ id: members.id, name: members.name, role: members.role, active: members.isActive }).from(members),
    allProjectRows(),
  ])
  let credit: CreditRules = DEFAULT_CREDIT_RULES
  try { if (creditRow[0]) credit = parseCreditRules(JSON.parse(creditRow[0].value)) } catch { /* the default */ }
  const team = rows.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, rows.map((r) => r.l.id))) : []
  return {
    credit: { rules: credit, numbers: numbers.map((r) => r.n) },
    commission: {
      rules: ruleRows.map(ruleRecord),
      members: people.filter((m) => m.active !== false).map((m) => ({ id: m.id, name: m.name, role: m.role })),
      projects: rows.filter((r) => r.p.stage !== 'completed').map((r) => ({ id: r.p.id, number: r.p.number, name: r.p.name, team: team.filter((t) => t.leadId === r.l.id).map((t) => t.memberId) })),
    },
  }
}

/** (F2-Q1 · Q2) The projects listing's Margin column and the Overview's Profit line: each project's profit — for Owners and Admins only (the
    caller asks `seesStudioMoney`; nobody else is handed a figure). */
export async function profitsFor(projectIds: string[], now = Date.now()): Promise<Map<string, ProfitView>> {
  const out = new Map<string, ProfitView>()
  if (!projectIds.length) return out
  const [rows, records, vendors] = await Promise.all([
    db.select().from(projects).where(and(inArray(projects.id, projectIds), isNull(projects.deletedAt))),
    loadCostRecords({ projectIds, overhead: false }),
    db.select({ id: vendorsTable.id, trade: vendorsTable.trade }).from(vendorsTable),
  ])
  const trades = Object.fromEntries(vendors.map((v) => [v.id, v.trade]))
  for (const p of rows) {
    const money = moneyOf(await moneyInputOf(p), now)
    const costs = costsOf({ pos: records.pos.filter((x) => x.projectId === p.id), bills: records.bills.filter((x) => x.projectId === p.id), expenses: records.expenses.filter((x) => x.projectId === p.id), payouts: records.payouts.filter((x) => x.projectId === p.id), vendorTrades: trades }, now)
    out.set(p.id, profitOf(money, costs))
  }
  return out
}

/* ── Commission on the project's Activity (parity map, FB-057 — 1.0 D-213 · D-214) ───────────────────────────────────────────────── */

/**
 * (parity map, FB-057) A commission step on the project's Activity — the lead's `lead_events` with the project (lib/leads/activity.ts, region
 * P-C, reads them): a rate set on the project or on a member there (`rule` — `from` → `to` as words, `removed` when it went), a member's ask for
 * another rate (`asked`), its answer (`answered` — `answer` approved · declined, `note`) and its withdrawal (`withdrawn`). `memberId` names the
 * member a line is about: those lines read only for that member and for Owners and Admins (F2-Q8, as commission paid); a project's own rate reads
 * for whoever sees the project's money. Returns the event's id (an Undo deletes it).
 */
export type CommissionEventKind = 'parity_c_commission_rule' | 'parity_c_commission_asked' | 'parity_c_commission_answered' | 'parity_c_commission_withdrawn'
export type CommissionEventDetail = { memberId?: string | null; title?: string | null; from?: string | null; to?: string | null; removed?: boolean; answer?: 'approved' | 'declined'; note?: string | null; reason?: string | null }
export async function logCommissionEvent(projectId: string, kind: CommissionEventKind, detail: CommissionEventDetail, actorId?: string | null): Promise<string | null> {
  const [p] = await db.select({ leadId: projects.leadId, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!p) return null
  const id = randomUUID()
  await db.insert(leadEvents).values({ id, leadId: p.leadId, projectId, kind, actorId: actorId === undefined ? await sessionMemberId() : actorId, at: new Date(), detail: { name: p.name, ...detail } })
  return id
}
/** An Undo's half: the line its step wrote goes with it. */
export async function dropCommissionEvent(eventId: string | null | undefined): Promise<void> {
  if (eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, eventId), inArray(leadEvents.kind, ['parity_c_commission_rule', 'parity_c_commission_asked', 'parity_c_commission_answered', 'parity_c_commission_withdrawn'])))
}
