import 'server-only'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { and, asc, eq, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  costDocuments, expenses, leadAssignees, leads, members, paymentsOut, priceBookItems, projectMilestones, projects, purchaseOrderLines, purchaseOrders, quoteItems, quotes,
  settings, supplierBills, vendors, type Expense, type PaymentOut, type PurchaseOrder, type PurchaseOrderLine, type SupplierBill, type Vendor,
} from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { type Viewer } from '@/lib/leads/assign-policy'
import { runsStudio, seesBooks } from '@/lib/settings/roles'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { approvesInvoices } from '@/lib/projects/invoices-model'
import { seesMoney } from '@/lib/projects/policy'
import { fetchStudio, fetchTrades } from '@/lib/settings/queries'
import { completedBlock } from '@/lib/projects/handover-model'
import { titleCaseName } from '@/lib/format'
import { lineTotalMinor } from '@/lib/quotes/math'
import { costsOf, type CostSummary, type QuoteLineFacts } from './costs'
import { COST_RULES_KEY, DEFAULT_COST_RULES, approvesExpense, approvesPo, changesVendor, logsExpense, parseCostRules, paysOut, preparesPo, recordsBill, recordsPo, seesBank, seesCostFigures, seesPoMargin, type CostRules } from './rules'
import { isPoTerms } from './rules'
import type { BillLine, BillRecord, ExpenseRecord, PayoutRecord, PoLine, PoRecord, VendorRecord } from './model'
import { entityOptions, type EntityOption } from './entity-scope'
import { parsePoPaper, type PoPaperLayout } from './rules'
import { extrasIn, type PaperExtras } from '@/lib/projects/invoices-paper'
import { raiseDueRepeats } from './repeats-server'
import { isRepeatEvery } from './repeats'
import { EXPENSE_CATEGORIES_KEY, parseExpenseCategories } from './expense-categories'
import { parseCrewTrades } from '@/lib/projects/contractors-model'   // (S45B)

/*
 * (gaps build F1 — money out: the costs) Money out on the server: the records `costsOf` (lib/finance/costs.ts) reads, for one project or the
 * whole studio; the Money tab's Costs half, Finance's pages, a PO's paper and the vendor's link. Who sees a project is its lead's rule (Who sees
 * leads); who sees its costs is who sees its money (F-17); the cost figures are the Owners' and Admins' (Q-20, F1-Q2) — a viewer who may not see
 * them is handed none: the totals, the margins against the quote and the vendors' balances come back zero and empty.
 */

export async function fetchCostRules(): Promise<CostRules> {
  const rules = await fetchCostRulesStored()   // (pending modules S19 — 1.0: PO accounts review and expense approval forced off for Free)
  /* (S44R, C8) a bill's OK is an approval too — off with the others on Free */
  return (rules.poApproval || rules.expenseApproval || rules.billApproval) && !(await planAllowsNow('internal_approvals')) ? { ...rules, poApproval: false, expenseApproval: false, billApproval: false } : rules
}
export async function fetchCostRulesStored(): Promise<CostRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, COST_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_COST_RULES
  try { return parseCostRules(JSON.parse(row.value)) } catch { return DEFAULT_COST_RULES }
}
/** (pending modules S06) The studio's expense categories — its own list once saved (Settings › Finance › Money out), else the eleven. */
export async function fetchExpenseCategories(): Promise<{ list: string[]; managed: boolean }> {
  const [row] = await db.select().from(settings).where(eq(settings.key, EXPENSE_CATEGORIES_KEY)).limit(1)
  if (!row) return parseExpenseCategories(null)
  try { return parseExpenseCategories(JSON.parse(row.value)) } catch { return parseExpenseCategories(null) }
}
/** (pending modules S06) How many live expenses each category carries — the card's rename note and a remove's sentence. */
export async function expenseCategoryCounts(): Promise<Record<string, number>> {
  const rows = await db.select({ c: expenses.category, n: sql<number>`count(*)` }).from(expenses).where(isNull(expenses.deletedAt)).groupBy(expenses.category)
  return Object.fromEntries(rows.map((r) => [r.c, Number(r.n)]))
}
/** The studio's own PO numbers — a PO made elsewhere keeps its own number and never moves the studio's sequence (parity map, MO-038). */
export async function fetchPoNumbers(): Promise<string[]> {
  return (await db.select({ n: purchaseOrders.number }).from(purchaseOrders).where(eq(purchaseOrders.external, false))).map((r) => r.n)
}
/** (parity map, MO-079 · MO-058) The studio's issuing entities as the "Issued by" scope reads them — empty with fewer than two. */
export async function fetchEntityOptions(): Promise<EntityOption[]> {
  const { fetchBrand } = await import('@/lib/templates/queries')
  return entityOptions((await fetchBrand()).details.entities)
}

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)
export const vendorRecord = (v: Vendor, bank: boolean): VendorRecord => ({
  id: v.id, name: v.name, trade: v.trade, contactName: v.contactName, phone: v.phone, email: v.email, uen: v.uen, chargesGst: v.chargesGst, notes: v.notes,
  isActive: v.isActive, mergedInto: v.mergedInto, createdAt: v.createdAt.getTime(),
  bank: bank ? { bankName: v.bankName, accountName: v.accountName, accountNo: v.accountNo, payNow: v.payNow } : null,
  marketplaceBrandId: v.marketplaceBrandId,   // (pending modules S24)
  contractor: v.isContractor ? { trades: parseCrewTrades(v.tradesJson ?? (v.trade ? JSON.stringify([v.trade]) : null)), capacity: Math.max(1, v.crewCapacity ?? 1), code: v.code ?? null } : null,   // (S45B)
})
export const poRecord = (p: PurchaseOrder, lines: PurchaseOrderLine[]): PoRecord => ({
  id: p.id, projectId: p.projectId, vendorId: p.vendorId, number: p.number, status: (['draft', 'sent', 'closed', 'cancelled'] as const).find((s) => s === p.status) ?? 'draft', title: p.title,
  subtotalMinor: p.subtotalMinor, gstMinor: p.gstMinor, totalMinor: p.totalMinor, chargesGst: p.chargesGst, gstRate: p.gstRate,
  advanceKind: p.advanceKind === 'pct' || p.advanceKind === 'fixed' ? p.advanceKind : 'none', advanceValue: p.advanceValue, advanceMinor: p.advanceMinor,
  terms: isPoTerms(p.terms) ? p.terms : 'net30', termsText: p.termsText, expectedOn: ms(p.expectedOn), deliveryAddress: p.deliveryAddress, vendorNote: p.vendorNote, issuingEntity: p.issuingEntity,
  createdBy: p.createdBy, createdAt: p.createdAt.getTime(), updatedAt: ms(p.updatedAt),
  submittedBy: p.submittedBy, submittedAt: ms(p.submittedAt), reviewNote: p.reviewNote, reviewedBy: p.reviewedBy, reviewedAt: ms(p.reviewedAt),
  approvedBy: p.approvedBy, approvedAt: ms(p.approvedAt), sentBy: p.sentBy, sentAt: ms(p.sentAt), dueOn: ms(p.dueOn),
  vendorToken: p.vendorToken, vendorViewedAt: ms(p.vendorViewedAt), vendorAnswer: p.vendorAnswer === 'accepted' || p.vendorAnswer === 'changes' || p.vendorAnswer === 'declined' ? p.vendorAnswer : null,
  vendorAnswerNote: p.vendorAnswerNote, vendorAnsweredAt: ms(p.vendorAnsweredAt), answerVia: p.answerVia, answerMarkedBy: p.answerMarkedBy,
  closedBy: p.closedBy, closedAt: ms(p.closedAt), closeNote: p.closeNote, cancelledBy: p.cancelledBy, cancelledAt: ms(p.cancelledAt), cancelReason: p.cancelReason,
  lines: lines.filter((l) => l.poId === p.id).sort((a, b) => a.position - b.position).map((l): PoLine => ({ id: l.id, description: l.description, category: l.category, qty: l.qty, unit: l.unit, unitMinor: l.unitMinor, amountMinor: l.amountMinor, quoteItemId: l.quoteItemId, milestoneId: l.milestoneId })),
  /* (parity map, MO-011 · MO-094 · MO-038) */
  billTo: p.billTo, deliveredAt: ms(p.deliveredAt), deliveredBy: p.deliveredBy, external: p.external, externalRef: p.externalRef, externalFileId: p.externalFileId,
})
export function parseBillLines(json: string | null): BillLine[] {
  if (!json) return []
  try {
    const v = JSON.parse(json) as unknown
    return Array.isArray(v) ? v.filter((x): x is BillLine => !!x && typeof x === 'object' && typeof (x as BillLine).description === 'string').map((x, i) => ({ id: String(x.id ?? `l${i}`), description: x.description, qty: Number(x.qty) || 0, unitMinor: Math.round(Number(x.unitMinor) || 0) })) : []
  } catch { return [] }
}
const parseFields = (json: string | null): string[] => { try { const v = JSON.parse(json ?? '[]') as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
type DocRow = { id: string; recordKind: string; recordId: string; name: string; mime: string }
export const billRecord = (b: SupplierBill, docs: DocRow[]): BillRecord => {
  const doc = docs.find((d) => d.recordKind === 'bill' && d.recordId === b.id) ?? null
  return {
    id: b.id, projectId: b.projectId, vendorId: b.vendorId, poId: b.poId, reference: b.reference, issuedOn: b.issuedOn.getTime(), dueOn: ms(b.dueOn),
    subtotalMinor: b.subtotalMinor, gstMinor: b.gstMinor, totalMinor: b.totalMinor, lines: parseBillLines(b.linesJson), note: b.note, readFrom: b.readFrom, readFields: parseFields(b.readFields),
    createdBy: b.createdBy, createdAt: b.createdAt.getTime(), docId: doc?.id ?? null, docName: doc?.name ?? null,
    approvalWhy: b.approvalWhy === 'limit' || b.approvalWhy === 'differs' ? b.approvalWhy : null, approvedBy: b.approvedBy, approvedAt: ms(b.approvedAt),   // (S44R, C8)
  }
}
export const expenseRecord = (e: Expense, docs: DocRow[]): ExpenseRecord => ({
  id: e.id, projectId: e.projectId, vendorId: e.vendorId, category: e.category, description: e.description, amountMinor: e.amountMinor, gstMinor: e.gstMinor, spentOn: e.spentOn.getTime(),
  paidBy: e.paidBy === 'member' ? 'member' : 'studio', claimantId: e.claimantId, status: e.status === 'approved' || e.status === 'sent_back' ? e.status : 'pending',
  reviewNote: e.reviewNote, reviewedBy: e.reviewedBy, reviewedAt: ms(e.reviewedAt), note: e.note, createdBy: e.createdBy, createdAt: e.createdAt.getTime(),
  receipts: docs.filter((d) => d.recordKind === 'expense' && d.recordId === e.id).map((d) => ({ id: d.id, name: d.name, mime: d.mime, image: d.mime.startsWith('image/') })),
  issuingEntity: e.issuingEntity,   // (parity map, MO-058)
  /* (pending modules S06) its repeat */
  repeatEvery: isRepeatEvery(e.repeatEvery) ? e.repeatEvery : null, repeatNext: ms(e.repeatNext), repeatOf: e.repeatOf, repeatStoppedAt: ms(e.repeatStoppedAt), repeatStoppedBy: e.repeatStoppedBy,
})
export const payoutRecord = (p: PaymentOut, docs: DocRow[]): PayoutRecord => ({
  id: p.id, kind: p.kind === 'bill' || p.kind === 'claim' ? p.kind : 'po', projectId: p.projectId, vendorId: p.vendorId, memberId: p.memberId, poId: p.poId, billId: p.billId, expenseId: p.expenseId,
  amountMinor: p.amountMinor, advance: p.advance, paidOn: p.paidOn.getTime(), method: p.method, reference: p.reference, note: p.note, createdBy: p.createdBy, createdAt: p.createdAt.getTime(),
  reversedAt: ms(p.reversedAt), reversedBy: p.reversedBy, reverseReason: p.reverseReason, docId: docs.find((d) => d.recordKind === 'payout' && d.recordId === p.id)?.id ?? null,
})

/** The records of a scope: some projects (and / or the studio's overhead). Deleted records are left out; cancelled POs stay (the record). */
export async function loadCostRecords(scope: { projectIds: string[] | null; overhead: boolean }): Promise<{ pos: PoRecord[]; bills: BillRecord[]; expenses: ExpenseRecord[]; payouts: PayoutRecord[] }> {
  await raiseDueRepeats()   // (pending modules S06) a repeating expense whose day has come is logged before anything reads money out
  const ids = scope.projectIds
  if (ids && !ids.length && !scope.overhead) return { pos: [], bills: [], expenses: [], payouts: [] }
  const where = (col: Parameters<typeof eq>[0]): SQL | undefined => {
    const parts: SQL[] = []
    if (ids === null) parts.push(isNotNull(col)); else if (ids.length) parts.push(inArray(col, ids))
    if (scope.overhead) parts.push(isNull(col))
    return parts.length === 1 ? parts[0] : or(...parts)
  }
  const [poRows, billRows, expRows, payRows] = await Promise.all([
    ids && !ids.length ? Promise.resolve([] as PurchaseOrder[]) : db.select().from(purchaseOrders).where(and(ids === null ? undefined : inArray(purchaseOrders.projectId, ids), isNull(purchaseOrders.deletedAt))).orderBy(asc(purchaseOrders.createdAt)),
    db.select().from(supplierBills).where(and(where(supplierBills.projectId), isNull(supplierBills.deletedAt))).orderBy(asc(supplierBills.issuedOn)),
    db.select().from(expenses).where(and(where(expenses.projectId), isNull(expenses.deletedAt))).orderBy(asc(expenses.spentOn)),
    db.select().from(paymentsOut).where(where(paymentsOut.projectId)).orderBy(asc(paymentsOut.paidOn)),
  ])
  const [lines, docs] = await Promise.all([
    poRows.length ? db.select().from(purchaseOrderLines).where(inArray(purchaseOrderLines.poId, poRows.map((p) => p.id))) : Promise.resolve([] as PurchaseOrderLine[]),
    db.select({ id: costDocuments.id, recordKind: costDocuments.recordKind, recordId: costDocuments.recordId, name: costDocuments.name, mime: costDocuments.mime }).from(costDocuments)
      .where(inArray(costDocuments.recordId, [...billRows.map((b) => b.id), ...expRows.map((e) => e.id), ...payRows.map((p) => p.id), '-'])),
  ])
  return {
    pos: poRows.map((p) => poRecord(p, lines)),
    bills: billRows.map((b) => billRecord(b, docs)),
    expenses: expRows.map((e) => expenseRecord(e, docs)),
    payouts: payRows.map((p) => payoutRecord(p, docs)),
  }
}

/** (F1-Q7) A project's signed quote lines a PO may take — the line, its trade, its vendor, its quantity, its cost and the client's price per unit.
    (pending modules S12) `wastePct` = its My Items entry's waste share (0 = none): a PO orders `orderedQty(qty, wastePct)` of it; `qty` stays the quote's. */
export type QuotePick = { id: string; name: string; category: string | null; vendor: string | null; section: string | null; qty: number; unit: string | null; costMinor: number; priceMinor: number; wastePct: number }
/** (pending modules S12) The waste share of the My Items entries quote lines came from — a deleted entry's too (the line still came from it). */
export async function wasteOf(itemIds: (string | null)[]): Promise<Map<string, number>> {
  const ids = [...new Set(itemIds.filter((x): x is string => !!x))]
  if (!ids.length) return new Map()
  const rows = await db.select({ id: priceBookItems.id, wastePct: priceBookItems.wastePct }).from(priceBookItems).where(inArray(priceBookItems.id, ids))
  return new Map(rows.filter((r) => r.wastePct > 0).map((r) => [r.id, r.wastePct]))
}
async function quotePicks(quoteId: string | null): Promise<QuotePick[]> {
  if (!quoteId) return []
  return quotePicksOf([quoteId])
}
/** The signed quotes' lines a PO may take, for several quotes in one read (Finance's lists — simplify S-10). */
async function quotePicksOf(quoteIds: string[]): Promise<QuotePick[]> {
  if (!quoteIds.length) return []
  const rows = await db.select().from(quoteItems).where(and(inArray(quoteItems.quoteId, quoteIds), eq(quoteItems.kind, 'item'))).orderBy(asc(quoteItems.position))
  const waste = await wasteOf(rows.map((r) => r.priceBookItemId))
  return rows.filter((r) => r.status !== 'Declined' && !r.optional).map((r) => ({
    id: r.id, name: r.name, category: r.category, vendor: r.vendor, section: r.section, qty: r.qty, unit: r.unit, costMinor: r.costMinor,
    priceMinor: r.qty ? Math.round(lineTotalMinor(r) / r.qty) : r.costMinor + r.markupMinor,
    wastePct: (r.priceBookItemId ? waste.get(r.priceBookItemId) : 0) ?? 0,
  }))
}

export type CostPerson = { id: string; name: string; role: string; active: boolean
  /** (simplify round 2 · F1 §6.9.3) their PayNow, for whoever pays them (Owners and Admins — `paysOut`) and for themselves; null otherwise */
  paynow: string | null }
export type CostViewer = {
  id: string; role: string; name: string
  /** (F1-Q2) the cost figures — tiles, margins, balances */ seesFigures: boolean
  /** (pending modules S41b-1) a quote line's cost (Who sees costs and margins) — else the quote's lines reach a PO without it */ costs: boolean
  /** (pending modules S41b-1) a PO's margin against the quote, and the client's price beside its lines — the books' and the cost switch */ margins: boolean
  approvesPo: boolean; pays: boolean; approvesExpense: boolean; changesVendor: boolean; seesBank: boolean
  /** (parity map, MO-098) the approvals To do's To approve offers — a client invoice, a commission ask: Owners and Admins, never Accounting */
  approvesInvoices: boolean; answersAsks: boolean
  /** the studio's books — the runner's tabs, groups and the overhead (parity map, MO-098: Owners, Admins and Accounting, `seesBooks`); what
      they may approve is in the flags above, never in this one */ runs: boolean
}
const viewerFlags = (v: Viewer, name: string): CostViewer => ({
  id: v.id, role: v.role, name, seesFigures: seesCostFigures(v), costs: seesCost(v), margins: seesPoMargin(v), approvesPo: approvesPo(v.role), pays: paysOut(v.role), approvesExpense: approvesExpense(v.role),
  changesVendor: changesVendor(v.role), seesBank: seesBank(v.role), runs: seesBooks(v.role),
  approvesInvoices: approvesInvoices(v.role), answersAsks: runsStudio(v.role),
})
/** (F1-Q2, Q-20) Figures handed to a viewer who may not see them: none — the records stay (they work on them), the totals don't. */
function maskFigures(s: CostSummary): CostSummary {
  return { ...s, committedMinor: 0, paidMinor: 0, owedMinor: 0, overdueMinor: 0, pipelineMinor: 0, claimsOwedMinor: 0, byCategory: [], byVendor: [], pos: s.pos.map((p) => ({ ...p, againstQuote: null })) }
}

/** A project a cost may sit on, as a picker and a list name it. */
export type CostProject = { id: string; number: string; name: string; leadId: string; stage: string; address: string | null; entity: string | null; quoteId: string | null
  /** (the calm UI build 2026-10-27, 5-26) the client's name — the first line of Finance's one Project cell (display only) */ client: string
  /** whether this viewer may raise a PO / record a bill / log an expense on it */ prepares: boolean; locked: string | null
  /** (parity map, MO-098) whether they may record a bill, an expense, a PO made elsewhere or a delivery on it — `prepares` for the team;
      Accounting records on every project without raising a PO (lib/finance/rules.ts `recordsPo`) */ records: boolean }
/** The context a PO dialog works in: the project, the signed quote's lines, its milestones, the studio's GST and the issuing entity. */
export type PoContext = { project: CostProject; quoteLines: QuotePick[]; milestones: { id: string; title: string }[]; gstRate: number
  /** (parity map, MO-011) where the vendor sends its invoice, to start — the issuing entity's name and address (its letterhead) */ billTo: string }

async function projectFacts(rows: { p: typeof projects.$inferSelect; l: typeof leads.$inferSelect }[], viewer: Viewer): Promise<(CostProject & { teamIds: string[]; seesMoney: boolean })[]> {
  if (!rows.length) return []
  const team = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, rows.map((r) => r.l.id)))
  const qs = await db.select({ id: quotes.id, entity: quotes.issuingEntity }).from(quotes).where(inArray(quotes.id, rows.map((r) => r.p.quoteId).filter((x): x is string => !!x).concat('-')))
  return rows.map(({ p, l }) => {
    const teamIds = team.filter((t) => t.leadId === l.id).map((t) => t.memberId)
    return {
      id: p.id, number: p.number, name: p.name, leadId: l.id, stage: p.stage, address: l.propertyAddress ?? l.leadAddress ?? null, entity: qs.find((q) => q.id === p.quoteId)?.entity ?? null, quoteId: p.quoteId, client: titleCaseName(l.name),
      prepares: preparesPo(viewer, teamIds), records: recordsPo(viewer, teamIds), locked: completedBlock(p.stage, 'money'), teamIds, seesMoney: seesMoney(viewer, teamIds),
    }
  })
}

/** Every member as money out names them. `viewer` decides whose PayNow comes along: everyone's for whoever pays (a claim's Pay back, Pay {member}),
    only their own for anyone else — never a colleague's number (simplify round 2). */
export async function fetchPeople(viewer: { id: string; role: string } | null = null): Promise<CostPerson[]> {
  const all = viewer !== null && paysOut(viewer.role)
  return (await db.select({ id: members.id, name: members.name, role: members.role, active: members.isActive, paynow: members.paynow }).from(members))
    .map((m) => ({ id: m.id, name: m.name, role: m.role, active: m.active !== false, paynow: all || m.id === viewer?.id ? m.paynow || null : null }))
}
/** Every vendor (inactive and merged too — the records name them), the bank details only for whoever may see them. */
export async function fetchVendors(viewer: Viewer): Promise<VendorRecord[]> {
  const rows = await db.select().from(vendors).orderBy(asc(vendors.name))
  return rows.map((v) => vendorRecord(v, seesBank(viewer.role)))
}
const tradesOf = (list: VendorRecord[]) => Object.fromEntries(list.map((v) => [v.id, v.trade]))

/* ── The project's Money tab: its Costs half ────────────────────────────────────────────────────────────────────────────────── */

export type ProjectCostsData = {
  project: CostProject
  summary: CostSummary
  vendors: VendorRecord[]
  context: PoContext
  rules: CostRules
  viewer: CostViewer & { prepares: boolean; logs: boolean; recordsBill: boolean; /** (parity map, MO-098) a PO made elsewhere, a delivery */ records: boolean }
  people: CostPerson[]
  trades: string[]
  now: number
  studio: string
  /** (parity map, MO-058 · MO-079) the issuing entities — empty with fewer than two (then no Issued by anywhere) */ entities: EntityOption[]
  /** (pending modules S06) the studio's expense categories, in its order */ categories: string[]
}
/** The Money tab's Costs: null when the viewer may not see the project's money (the tab already says so). */
export async function fetchProjectCosts(projectId: string): Promise<ProjectCostsData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return null
  const [facts] = await projectFacts([row], viewer)
  if (!facts || !facts.seesMoney) return null
  const [records, vendorList, people, rules, studio, trades, milestones, picks, letter, entities, categories] = await Promise.all([
    loadCostRecords({ projectIds: [projectId], overhead: false }), fetchVendors(viewer), fetchPeople(viewer), fetchCostRules(), fetchStudio(), fetchTrades(),
    db.select({ id: projectMilestones.id, title: projectMilestones.title }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position)),
    quotePicks(row.p.quoteId), billToOf(null, row.p.quoteId), fetchEntityOptions(), fetchExpenseCategories(),
  ])
  const figures = seesCostFigures(viewer)
  /* (pending modules S41b-1) a PO's margin against the quote is worked out only for whoever sees margins */
  const quoteLines: QuoteLineFacts[] = figures && seesPoMargin(viewer) ? picks.map((q) => ({ id: q.id, costMinor: q.costMinor, priceMinor: q.priceMinor, qty: q.qty })) : []
  const summary = costsOf({ ...records, quoteLines, vendorTrades: tradesOf(vendorList) }, Date.now())
  const { teamIds, seesMoney: _s, ...project } = facts
  void _s
  const me = people.find((m) => m.id === viewer.id)
  return {
    project, summary: figures ? summary : maskFigures(summary), vendors: vendorList,
    /* (pending modules S41b-1) the quote's lines reach the PO dialog without their cost for a member who doesn't see costs — they enter the vendor's price */
    context: { project, quoteLines: seesCost(viewer) ? picks : picks.map((q) => ({ ...q, costMinor: 0 })), milestones, gstRate: studio.gstRegistered ? studio.gstPct : 0, billTo: letter },
    rules, viewer: { ...viewerFlags(viewer, me?.name ?? 'You'), prepares: preparesPo(viewer, teamIds), logs: logsExpense(viewer, teamIds), recordsBill: recordsBill(viewer, teamIds), records: recordsPo(viewer, teamIds) },
    people, trades: trades.trades, now: Date.now(), studio: studio.name, entities, categories: categories.list,
  }
}
/** (parity map, MO-011) The letterhead a PO is raised under, as "Invoice to" starts: its name, then its address on the next line. */
async function billToOf(entityName: string | null, quoteId: string | null): Promise<string> {
  const { fetchBrand } = await import('@/lib/templates/queries')
  const { letterheadOf } = await import('@/lib/projects/money-queries')
  const { letterhead } = await letterheadOf(await fetchBrand(), entityName, quoteId)
  return [letterhead.name, letterhead.address].filter((x) => !!x?.trim()).join('\n')
}

/* ── Finance's pages (F-01 · F-19 · F1-Q1) ──────────────────────────────────────────────────────────────────────────────────── */

export type FinanceData = {
  summary: CostSummary
  /** The projects whose costs this viewer sees (names for the lists, a picker's options). */
  projects: CostProject[]
  vendors: VendorRecord[]
  rules: CostRules
  viewer: CostViewer
  people: CostPerson[]
  trades: string[]
  gstRate: number
  now: number
  studio: string
  /** (parity map, MO-079 · FB-105 · MO-058) the issuing entities — empty with fewer than two (then no Issued by pill, no entity chips) */ entities: EntityOption[]
  /** (pending modules S06) the studio's expense categories, in its order */ categories: string[]
}
/**
 * Everything Finance lists for this viewer: the costs of the projects whose money they see (Who sees leads, then F-17) and the studio's overhead
 * — all of it for Owners and Admins, a member's own overhead expenses and claims otherwise. The figures are masked for whoever may not see them.
 */
export async function fetchFinance(): Promise<FinanceData> {
  const viewer = await fetchViewer()
  const runs = seesBooks(viewer.role)   // (parity map, MO-098) Accounting sees the studio's overhead as Owners and Admins do
  const [visible, people, vendorList, rules, studio, trades, entities, categories] = await Promise.all([visibleLeadIds(viewer), fetchPeople(viewer), fetchVendors(viewer), fetchCostRules(), fetchStudio(), fetchTrades(), fetchEntityOptions(), fetchExpenseCategories()])
  const rows = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(asc(projects.number))
  const facts = (await projectFacts(rows.filter((r) => visible === null || visible.has(r.l.id)), viewer)).filter((f) => f.seesMoney)
  const records = await loadCostRecords({ projectIds: facts.map((f) => f.id), overhead: true })
  /* the studio's overhead: Owners and Admins see it all; anyone else their own expenses and claims (no overhead bills, F1-Q3) */
  const mine = (e: ExpenseRecord) => e.createdBy === viewer.id || e.claimantId === viewer.id
  const scoped = runs ? records : {
    pos: records.pos,
    bills: records.bills.filter((b) => b.projectId !== null),
    expenses: records.expenses.filter((e) => e.projectId !== null || mine(e)),
    payouts: records.payouts.filter((p) => p.projectId !== null || (p.kind === 'claim' && p.memberId === viewer.id)),
  }
  /* (simplify S-10 · F1 P5) the approver decides with the facts: a PO's "against the quote" (what the client pays for its lines, what it leaves) —
     the studio-wide summary was built without the quotes' lines, so Finance's panel and To do never said it; the project's Money tab did */
  const figures = seesCostFigures(viewer)
  const picks = figures && seesPoMargin(viewer) ? await quotePicksOf(facts.map((f) => f.quoteId).filter((x): x is string => !!x)) : []
  const summary = costsOf({ ...scoped, quoteLines: picks.map((q) => ({ id: q.id, costMinor: q.costMinor, priceMinor: q.priceMinor, qty: q.qty })), vendorTrades: tradesOf(vendorList) }, Date.now())
  const me = people.find((m) => m.id === viewer.id)
  return {
    summary: figures ? summary : maskFigures(summary),
    projects: facts.map(({ teamIds: _t, seesMoney: _s, ...p }) => { void _t; void _s; return p }),
    vendors: vendorList, rules, viewer: viewerFlags(viewer, me?.name ?? 'You'), people, trades: trades.trades,
    gstRate: studio.gstRegistered ? studio.gstPct : 0, now: Date.now(), studio: studio.name, entities, categories: categories.list,
  }
}

/** (F1-Q7) The PO dialog's context for a project picked in Finance — null when the viewer may not prepare its POs. */
export async function fetchPoContext(projectId: string): Promise<PoContext | null> {
  const d = await fetchProjectCosts(projectId)
  return d && d.viewer.prepares ? d.context : null
}

/* ── One PO: its paper (the studio's page) and the vendor's link ────────────────────────────────────────────────────────────── */

export type PoDoc = {
  po: PoRecord
  vendor: VendorRecord
  project: { id: string; number: string; name: string; address: string | null; client: string }
  studio: { name: string; address: string; uen: string; gstReg: string; logo: string | null; phone: string; email: string
    /** (parity map, FB-103 — P-D's paper chrome) the issuing entity's tagline, contacts, website, footer line and accent, once `letterheadOf` hands them */ extras: PaperExtras | null }
  paidMinor: number
  milestones: { id: string; title: string }[]
  /** (parity map, FB-097) the studio's PO paper — its header note, terms, acceptance block and whether the bank prints */ paper: PoPaperLayout
  /** (FB-097) the issuing entity's bank, only while the paper shows it (and it has one) */ bank: { name: string; bankName: string; accountNo: string; branch: string; payNow: string; swift: string } | null
}
async function docOf(po: PurchaseOrder): Promise<PoDoc | null> {
  const [[vendor], [row], lines, payouts, milestones] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, po.vendorId)).limit(1),
    db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(eq(projects.id, po.projectId)).limit(1),
    db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id)),
    db.select({ amount: paymentsOut.amountMinor }).from(paymentsOut).where(and(eq(paymentsOut.poId, po.id), isNull(paymentsOut.reversedAt))),
    db.select({ id: projectMilestones.id, title: projectMilestones.title }).from(projectMilestones).where(eq(projectMilestones.projectId, po.projectId)),
  ])
  if (!vendor || !row) return null
  const { fetchBrand } = await import('@/lib/templates/queries')
  const { letterheadOf } = await import('@/lib/projects/money-queries')
  const [brand, rules] = await Promise.all([fetchBrand(), fetchCostRules()])
  const { entity, letterhead } = await letterheadOf(brand, po.issuingEntity, row.p.quoteId)
  const paper = rules.paper ?? parsePoPaper(null)
  const bank = paper.showBank && entity && (entity.accountNo || entity.payNow)
    ? { name: entity.accountName || entity.name || letterhead.name, bankName: entity.bankName, accountNo: entity.accountNo, branch: entity.branch ?? '', payNow: entity.payNow, swift: entity.swift ?? '' } : null
  return {
    po: poRecord(po, lines), vendor: vendorRecord(vendor, false),
    project: { id: row.p.id, number: row.p.number, name: row.p.name, address: po.deliveryAddress ?? row.l.propertyAddress ?? null, client: titleCaseName(row.l.name) },
    studio: { name: letterhead.name, address: letterhead.address, uen: letterhead.uen, gstReg: letterhead.gstReg, logo: letterhead.logo, phone: brand.details.phone ?? '', email: brand.details.email ?? '', extras: extrasIn(letterhead) },
    paidMinor: payouts.reduce((s, p) => s + p.amount, 0), milestones, paper, bank,
  }
}
/** The studio's page of one PO — whoever sees the project's money. */
export async function fetchPoDoc(projectId: string, poId: string): Promise<PoDoc | null> {
  const d = await fetchProjectCosts(projectId)
  if (!d) return null
  const [po] = await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.projectId, projectId), isNull(purchaseOrders.deletedAt))).limit(1)
  return po ? docOf(po) : null
}
/** (F1-Q9) The vendor's link: a PO that was sent (a Draft or a removed one opens nothing). */
export async function fetchPoByToken(token: string): Promise<{ doc: PoDoc; state: 'open' | 'cancelled' | 'closed' } | null> {
  if (!token || token.length < 16) return null
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorToken, token)).limit(1)
  if (!po || po.deletedAt || !po.sentAt || po.external) return null   // (parity map, MO-038) a PO made elsewhere never opens on a link
  const doc = await docOf(po)
  if (!doc) return null
  return { doc, state: po.status === 'cancelled' ? 'cancelled' : po.status === 'closed' ? 'closed' : 'open' }
}
