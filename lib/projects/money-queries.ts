import 'server-only'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { contractBaseOf } from '@/lib/quotes/contract-value'
import { cache } from 'react'
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadEvents, leads, members, paymentTemplates, projectInvoices, projectMilestones, projects, quoteItems, quotePayments, quotes, settings, type Project, type ProjectInvoice, type Quote, type QuoteItem } from '@/lib/db/schema'
import { countedLines, parseDiscounts, quoteTotals } from '@/lib/quotes/math'   // (S43D, F2-04)
import { parseSplitRows } from '@/lib/quotes/payments'
import { parseLines } from './invoices-kinds'   // (gaps build B)
import { DEFAULT_PAPER_SETTINGS, INVOICE_NUMBERING_ENTITIES_KEY, INVOICE_PAPER_KEY, numberingFor, paperExtrasOf, paperFor, parseEntityNumbering, parsePaperSettings, type EntityNumbering, type InvoicePaperLayout, type PaperLetterhead, type PaperSettings } from './invoices-paper'
import { fetchLiveMethodValues } from './payment-methods-queries'   // (parity map, FB-112 — P-D) the ways the studio takes money today
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { fetchStudio } from '@/lib/settings/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchPaymentsData, type PaymentsData } from './payments'
import { currentPortalSlug } from '@/lib/portal/queries'
import { portalPath } from '@/lib/portal/model'
import type { IssuingEntity, StudioDetails } from '@/lib/templates/model'
import { titleCaseName } from '@/lib/format'
import { parseProjectSplit, type ProjectNumbering } from './model'
import { CHANGE_RULE, seesMoney } from './policy'
import { isAccounting } from '@/lib/settings/roles'
import { isWithClient, moneyOf, type InvoiceRecord, type MoneyInput, type MoneyMilestone, type MoneyStage, type MoneySummary, type MoneyVariation } from './money'
import { moneyPaymentsOf } from './payments-records'   // (Projects round 6) the payments that count, and the proofs waiting
import { creditsOf } from '@/lib/finance/credit-records'   // (gaps build F2 — F2-Q9) credit notes
import { netOf } from '@/lib/finance/commission'   // (pending modules S45A) the books' one division of a GST-inclusive figure
import { completedBlock } from './handover-model'   // (REG-1069) a completed project's money reads only
import {
  DEFAULT_INVOICE_NUMBERING, DEFAULT_INVOICE_RULES, INVOICE_NUMBERING_KEY, INVOICE_RULES_KEY, approvesInvoices, marksVariationApproved, nextInvoiceNumber, parseInvoiceNumbering,
  parseInvoiceRules, preparesInvoices, sendsAtOnce, voidsInvoices, type InvoiceRules,
} from './invoices-model'

/*
 * (Projects round 5) Money on the server: the records `moneyOf` (lib/projects/money.ts) reads, for one project or many; the Money tab's and
 * the invoice page's loaders; the settings. Who sees money (F-17) is `seesMoney` — the project's team, Owners and Admins — checked here, so a
 * page or an action never hands figures to anyone else.
 */

/** (pending modules S19 — 1.0's plan gating: invoice approval forced off for Free) the rules as every screen and action reads them. */
export async function fetchInvoiceRules(): Promise<InvoiceRules> {
  const rules = await fetchInvoiceRulesStored()
  return rules.approval && !(await planAllowsNow('internal_approvals')) ? { ...rules, approval: false } : rules
}
/** The studio's own invoice rules, as stored — what a setting change merges with (never the Free plan's forced-off read). */
export async function fetchInvoiceRulesStored(): Promise<InvoiceRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, INVOICE_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_INVOICE_RULES
  try { return parseInvoiceRules(JSON.parse(row.value)) } catch { return DEFAULT_INVOICE_RULES }
}
export async function fetchInvoiceNumbering(): Promise<ProjectNumbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, INVOICE_NUMBERING_KEY)).limit(1)
  if (!row) return DEFAULT_INVOICE_NUMBERING
  try { return parseInvoiceNumbering(JSON.parse(row.value)) } catch { return DEFAULT_INVOICE_NUMBERING }
}
export async function fetchInvoiceNumbers(): Promise<string[]> {
  return (await db.select({ number: projectInvoices.number }).from(projectInvoices).where(isNotNull(projectInvoices.number))).map((r) => r.number!).filter(Boolean)
}
/** (gaps build B, item 12) Each issuing entity's own invoice number pattern (blank = the studio-wide one). */
export async function fetchEntityNumbering(): Promise<EntityNumbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, INVOICE_NUMBERING_ENTITIES_KEY)).limit(1)
  if (!row) return {}
  try { return parseEntityNumbering(JSON.parse(row.value)) } catch { return {} }
}
/** (gaps build B, item 14) The studio's invoice paper and each entity's own. */
export async function fetchInvoicePaper(): Promise<PaperSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, INVOICE_PAPER_KEY)).limit(1)
  if (!row) return DEFAULT_PAPER_SETTINGS
  try { return parsePaperSettings(JSON.parse(row.value)) } catch { return DEFAULT_PAPER_SETTINGS }
}
/** (gaps build B, item 12) The number an invoice raised under this entity takes next — its own pattern, else the studio-wide one. */
export async function nextNumberFor(entityName: string | null, at: Date): Promise<string> {
  const [studioWide, own, numbers, brand] = await Promise.all([fetchInvoiceNumbering(), fetchEntityNumbering(), fetchInvoiceNumbers(), fetchBrand()])
  const list = brand.details.entities
  const e = (entityName ? list.find((x) => x.name === entityName) : null) ?? list[0] ?? null
  return nextInvoiceNumber(numberingFor(studioWide, own, e?.id ?? null), numbers, at)
}

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)
export const invoiceRecord = (i: ProjectInvoice): InvoiceRecord => ({
  id: i.id, stageRef: i.stageRef, stageName: i.stageName, pct: i.pct, position: i.position, number: i.number, status: i.status,
  amountMinor: i.amountMinor, gstMinor: i.gstMinor, issuingEntity: i.issuingEntity, varianceReason: i.varianceReason, editedBy: i.editedBy, editedAt: ms(i.editedAt),
  submittedBy: i.submittedBy, submittedAt: ms(i.submittedAt), reviewNote: i.reviewNote, reviewedBy: i.reviewedBy, reviewedAt: ms(i.reviewedAt),
  sentBy: i.sentBy, sentAt: ms(i.sentAt), dueAt: ms(i.dueAt), voidReason: i.voidReason, voidedBy: i.voidedBy, voidedAt: ms(i.voidedAt), replacesId: i.replacesId,
  createdAt: i.createdAt.getTime(),
  issuedContractMinor: i.contractMinor, issuedBaseMinor: i.baseMinor, issuedVariationsMinor: i.variationsMinor,   // (fix-D, D-02)
  /* (gaps build B) money in, complete */
  kind: (['stage', 'variation', 'one_off', 'external'] as const).find((k) => k === i.kind) ?? 'stage',
  variationId: i.variationId, reason: i.reason, description: i.description, clientNote: i.clientNote, lines: parseLines(i.linesJson), chargeGst: i.chargeGst,
  dueMode: i.dueMode === 'date' || i.dueMode === 'handover' ? i.dueMode : null, dueOn: ms(i.dueOn), externalRef: i.externalRef, externalFileId: i.externalFileId,
  shareToken: i.shareToken, fileId: i.fileId, fixedMinor: i.fixedMinor,
})
/** (gaps build B, item 10) Remind on WhatsApp, counted from its Activity lines per invoice: how many times and the last. */
export async function remindersOf(projectIds: string[]): Promise<Map<string, { count: number; last: number }>> {
  const out = new Map<string, { count: number; last: number }>()
  if (!projectIds.length) return out
  const rows = await db.select({ id: sql<string>`json_extract(${leadEvents.detail}, '$.id')`, at: leadEvents.at }).from(leadEvents)
    .where(and(inArray(leadEvents.projectId, projectIds), eq(leadEvents.kind, 'project_invoice_reminded')))
  for (const r of rows) {
    if (!r.id) continue
    const was = out.get(r.id), at = r.at.getTime()
    out.set(r.id, { count: (was?.count ?? 0) + 1, last: Math.max(was?.last ?? 0, at) })
  }
  return out
}
export const variationRecord = (q: Quote): MoneyVariation => ({
  id: q.id, number: q.number, title: q.title, status: q.status, amountMinor: q.amountMinor,
  createdAt: q.createdAt.getTime(), clientSentAt: ms(q.clientSentAt), confirmedAt: ms(q.confirmedAt), confirmedBy: q.confirmedBy, confirmedVia: q.confirmedVia,
  changeAskedAt: ms(q.changeAskedAt), changeAskedNote: q.changeAskedNote,   // (fix-D, D-33)
  declinedAt: ms(q.declinedAt), declinedNote: q.declinedNote, declinedBy: q.declinedBy,   // (gaps build D, item 2)
  createdBy: q.createdBy, issuingEntity: q.issuingEntity,   // (parity map, MI-104 · FB-012) who may delete it; Money in's Issued by
})

/** (F-02 · F-03) The base: the signed (else Won) system quote's total and its Payment Schedule; else the agreed value and its split. */
async function baseOf(p: Pick<Project, 'quoteId' | 'agreedValueMinor' | 'paymentTemplate'>, gst: { pct: number; registered: boolean }): Promise<{ quote: Quote | null; base: number | null; source: MoneyInput['source']; gstRate: number; stages: MoneyStage[] }> {
  const [q] = p.quoteId ? await db.select().from(quotes).where(and(eq(quotes.id, p.quoteId), isNull(quotes.deletedAt))).limit(1) : []
  const pays = q ? await db.select().from(quotePayments).where(eq(quotePayments.quoteId, q.id)).orderBy(asc(quotePayments.position)) : []
  const split = parseProjectSplit(p.paymentTemplate)
  const stages: MoneyStage[] = pays.length
    /* (parity map, MI-021) a quote's Payment Schedule may open with a fixed fee too (Settings › Finance › Invoices › May open with a fixed fee):
       its first row bills `fixed_minor` and the shares split what it leaves — one set of numbers, `moneyOf` */
    ? pays.map((r, i) => ({ ref: r.id, name: r.name, pct: r.pct, position: i, due: r.description, onSigning: r.dueKind === 'approval', fixedMinor: i === 0 && r.fixedMinor != null && r.fixedMinor > 0 ? r.fixedMinor : null }))
    : (split?.rows ?? []).map((r, i) => ({ ref: `split:${i}`, name: r.name, pct: r.pct, position: i, due: null, onSigning: i === 0, fixedMinor: r.fixedMinor ?? null }))   // (gaps build B, item 13)
  const base = q ? contractBaseOf(q) : p.agreedValueMinor ?? null   // (pending modules S03) the total as signed, frozen — 1.0's contract value
  return { quote: q ?? null, base, source: q ? 'quote' : base ? 'agreed' : null, gstRate: (q ? q.gstEnabled : gst.registered) ? gst.pct : 0, stages }
}

/** (S43D, F2-04 — 1.0's quotes/port Phase 9 §B.6, its `docs/rules/finance.md`) The GST inside a quote's own total, as a rate on its net: the
    studio's rate while every counted line carries it and none is "On behalf" (REG-555) — else the share its own lines give, so a bill of a slice
    of it splits out the GST the quote holds, never more. 0 with the quote's GST off. */
function ownGstRate(q: Quote, lines: QuoteItem[], studioPct: number): number {
  if (!q.gstEnabled) return 0
  if (!countedLines(lines).some((l) => l.printAs === 'behalf' || Number(l.gstPct) !== studioPct)) return studioPct
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
  const net = t.totalMinor - t.gstMinor
  return net > 0 && t.gstMinor > 0 ? (100 * t.gstMinor) / net : 0
}

/** (pending modules S45A — H-UHD-1 · H-UHD-3) What a quote stands for before GST: its total as signed (`contractBaseOf`) less the GST its own
    lines hold (`ownGstRate`) — the base books' `contractNetOf` reads. `minor` keeps the total with GST, `rate` the share it was taken at. */
export type QuoteNet = { minor: number; netMinor: number; rate: number }
/** (S45A) Many quotes' figures before GST at once — their lines read in one go. Pure of any viewer: callers decide who may see money. */
export async function quoteNetsOf(qs: Quote[]): Promise<Map<string, QuoteNet>> {
  const out = new Map<string, QuoteNet>()
  if (!qs.length) return out
  const [studio, lines] = await Promise.all([fetchStudio(), db.select().from(quoteItems).where(inArray(quoteItems.quoteId, qs.map((q) => q.id)))])
  for (const q of qs) {
    const rate = ownGstRate(q, lines.filter((l) => l.quoteId === q.id), studio.gstPct)
    const minor = contractBaseOf(q)
    out.set(q.id, { minor, netMinor: netOf(minor, rate), rate })
  }
  return out
}
/** (S45A) A project's sale as signed, before GST: the signed (else Won) system quote as signed, else the agreed value at the studio's rate
    (`baseOf`'s rule) — variation orders not included (1.0's "Total Sales — Initial Amount bf GST", UHD's B3). THE one rule for the Projects
    listing's Value before GST and Reports › Leads › Sales' Won value, so the two never disagree. */
export type SignedNet = QuoteNet & { from: 'quote' | 'agreed'; quoteNumber: string | null }
export async function signedNetBy(ps: Pick<Project, 'id' | 'quoteId' | 'agreedValueMinor'>[]): Promise<Map<string, SignedNet>> {
  const out = new Map<string, SignedNet>()
  if (!ps.length) return out
  const ids = ps.map((p) => p.quoteId).filter((x): x is string => !!x)
  const [studio, qs] = await Promise.all([fetchStudio(), ids.length ? db.select().from(quotes).where(and(inArray(quotes.id, ids), isNull(quotes.deletedAt))) : Promise.resolve([] as Quote[])])
  const nets = await quoteNetsOf(qs)
  for (const p of ps) {
    const q = p.quoteId ? qs.find((x) => x.id === p.quoteId) : undefined
    const n = q ? nets.get(q.id) : undefined
    if (q && n) { out.set(p.id, { ...n, from: 'quote', quoteNumber: q.number }); continue }
    if (p.agreedValueMinor) { const rate = studio.gstRegistered ? studio.gstPct : 0; out.set(p.id, { minor: p.agreedValueMinor, netMinor: netOf(p.agreedValueMinor, rate), rate, from: 'agreed', quoteNumber: null }) }
  }
  return out
}

/** Everything `moneyOf` reads for one project (its row as stored). */
/** (pending modules S02 — MI-014, 1.0's "From signed quote · n line items") How many lines the signed quote holds — the Overview's Money card
    and the Money tab's Contract value say it; a line the client declined is left out. */
export async function signedQuoteLines(quoteId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.kind, 'item'), ne(quoteItems.status, 'Declined')))
  return r?.n ?? 0
}

export async function moneyInputOf(p: Project): Promise<MoneyInput & { quote: Quote | null }> {
  const studio = await fetchStudio()
  const b = await baseOf(p, { pct: studio.gstPct, registered: studio.gstRegistered })
  const [ms_, vos, invs, payments, reminders, credits] = await Promise.all([
    db.select().from(projectMilestones).where(and(eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt), isNotNull(projectMilestones.paymentRef))),
    db.select().from(quotes).where(and(eq(quotes.projectId, p.id), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select().from(projectInvoices).where(eq(projectInvoices.projectId, p.id)),
    moneyPaymentsOf(p.id),   // (Projects round 6) Collected · Part paid · Paid · Payment to confirm
    remindersOf([p.id]),   // (gaps build B, item 10)
    creditsOf(p.id),   // (gaps build F2 — F2-Q9)
  ])
  const milestones: Record<string, MoneyMilestone> = {}
  for (const m of ms_) if (m.paymentRef) milestones[m.paymentRef] = { id: m.id, title: m.title, status: m.status, due: m.paymentDue === 'start' ? 'start' : 'end', start: m.startDate.getTime(), end: m.endDate.getTime(), doneAt: m.doneAt ? m.doneAt.getTime() : null }
  const invoices = invs.map((i) => { const r = reminders.get(i.id); return { ...invoiceRecord(i), remindedCount: r?.count ?? 0, lastRemindedAt: r?.last ?? null } })
  /* (S43D, F2-04) the GST each bill splits out: the contract's own share and each variation order's — the studio's rate unless lines are mixed */
  const quoteIds = [...(b.quote ? [b.quote.id] : []), ...vos.map((v) => v.id)]
  const lines = quoteIds.length ? await db.select().from(quoteItems).where(inArray(quoteItems.quoteId, quoteIds)) : []
  const linesOf = (id: string) => lines.filter((l) => l.quoteId === id)
  const contractGstRate = b.quote ? ownGstRate(b.quote, linesOf(b.quote.id), studio.gstPct) : b.gstRate
  const variationGstRates = Object.fromEntries(vos.map((v) => [v.id, ownGstRate(v, linesOf(v.id), studio.gstPct)]))
  return { quote: b.quote, baseMinor: b.base, source: b.source, gstRate: b.gstRate, contractGstRate, variationGstRates, stages: b.stages, milestones, variations: vos.map(variationRecord), invoices, payments, since: p.createdAt.getTime(), credits }
}
export async function moneySummaryOf(p: Project, now = Date.now()): Promise<MoneySummary> {
  return moneyOf(await moneyInputOf(p), now)
}

/* ── For the listing and the rail (many projects at once, cheap reads) ─────────────────────────────────────────────────────── */

/** (F-02) The approved variation orders' sum per project — the listing's Contract value adds it to the base. */
export async function approvedVariationsBy(projectIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!projectIds.length) return out
  const rows = await db.select({ projectId: quotes.projectId, status: quotes.status, amountMinor: quotes.amountMinor }).from(quotes)
    .where(and(inArray(quotes.projectId, projectIds), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt)))
  for (const r of rows) if (r.projectId && (r.status === 'Confirmed' || r.status === 'Signed')) out.set(r.projectId, (out.get(r.projectId) ?? 0) + r.amountMinor)
  return out
}
/** Waiting on client: the variation orders the client holds, per project. */
export async function variationsWithClientBy(projectIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (!projectIds.length) return out
  /* (gaps build D, item 2) a declined order is no longer with the client */
  const rows = await db.select({ projectId: quotes.projectId, number: quotes.number, status: quotes.status }).from(quotes)
    .where(and(inArray(quotes.projectId, projectIds), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(quotes.declinedAt)))
  for (const r of rows) if (r.projectId && isWithClient(r.status)) out.set(r.projectId, [...(out.get(r.projectId) ?? []), `Variation order ${r.number} awaits approval`])   // (REG-1075) the one rule
  return out
}
/** "Needs my review": invoices waiting for an Owner's or an Admin's approval, per project. */
export async function invoicesAwaitingBy(projectIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!projectIds.length) return out
  const rows = await db.select({ projectId: projectInvoices.projectId }).from(projectInvoices)
    .where(and(inArray(projectInvoices.projectId, projectIds), eq(projectInvoices.status, 'draft'), isNotNull(projectInvoices.submittedAt)))
  for (const r of rows) out.set(r.projectId, (out.get(r.projectId) ?? 0) + 1)
  return out
}

/* ── The Money tab ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type MoneyPerson = { id: string; name: string }
export type ProjectMoneyData = {
  project: { id: string; number: string; name: string; stage: string; leadId: string; quoteId: string | null }
  client: { name: string; firstName: string; phone: string }
  /** null = this viewer may not see the project's money (F-17) — the tab says so and shows nothing else. */
  money: MoneySummary | null
  rules: InvoiceRules
  viewer: {
    id: string; role: string; name: string; prepares: boolean; sendsAtOnce: boolean; approves: boolean; voids: boolean; marksApproved: boolean
    /** (REG-1069, REG-1022) The project is completed: its agreed money reads only (the server's words) — payments stay open. */
    locked: string | null
  }
  /** The names behind the records' member ids (who sent, who submitted, who voided). */
  people: MoneyPerson[]
  /** The client portal's address the WhatsApp draft points at (round 4a). */
  portalUrl: string
  /** (REG-1056) Whether the client holds the portal (invited, not withdrawn) — the WhatsApp drafts send them to it only then. */
  portalAccess: boolean
  studioName: string
  /** The base quote, for the Money tab's "From the signed quote" link. */
  quote: { id: string; number: string; title: string; /** (pending modules S02 — MI-014) */ lines?: number } | null
  now: number
  /** (Projects round 6) The payments against the invoices, who confirms a client's, and what this viewer may do with them; null with money. */
  payments?: PaymentsData | null
  /** (fix-D, D-10) The number the next invoice sent takes — the WhatsApp draft names it before it opens. */
  nextInvoiceNumber?: string
  /** (fix-D, D-10 · F-15) How the client pays (the base quote's issuing entity, else the studio's first): a client without the portal gets it
      in the message itself. */
  payTo?: { bankName: string; accountName: string; accountNo: string; payNow: string } | null
  /* (gaps build B) money in, complete */
  /** (item 4) The project's handover day (its target end) — a Draft may fall due on it. */
  handoverDay?: number | null
  /** (item 11) When this viewer last reminded the approvers about each invoice waiting for approval. */
  approverReminded?: Record<string, number>
  /** (item 13) The payment split agreed outside a system quote, and whether it may still change (no stage invoice sent yet). Null with a system
      quote's Payment Schedule — that schedule is the quote's (F-03). */
  split?: SplitEditor | null
  /** (item 9) The stages whose invoice is still an unsent Draft — a recorded invoice may stand for one of them. */
  recordable?: { ref: string; name: string; amountMinor: number }[]
  /** (item 8) Work done by the schedule: its milestones done, in % — null with no schedule. */
  progressPct?: number | null
  /** (simplify S-07) How many of the project's variation orders are deleted — the Changes to the contract sub-list keeps its sheet's way in. */
  deletedVariations?: number
}
/** (gaps build B, item 13) What the split dialog edits and offers. */
export type SplitEditor = {
  rows: { name: string; pct: number; fixedMinor: number | null; milestoneId: string | null }[]
  /** null = it may change; else why not (the rule's words) */ block: string | null
  /** Settings › Projects › *A fixed fee first* — the first stage may be a fixed amount */ feeFirst: boolean
  templates: { id: string; name: string; rows: { name: string; pct: number }[] }[]
  milestones: { id: string; title: string; ref: string | null; due: 'start' | 'end' }[]
  template: string | null
}

/** The Money tab's data. Who sees the project: its lead's rule (not found otherwise); who sees money: F-17. (simplify S-07) One read per request:
    the page's frame reads it for Needs you (lib/projects/money-needs.ts) while the tab reads it for its body — React's `cache` serves both (a
    server action outside a render reads it fresh). */
export const fetchProjectMoney = cache(fetchProjectMoneyNow)
async function fetchProjectMoneyNow(projectId: string): Promise<ProjectMoneyData | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null
  const now = Date.now()
  const [team, people, rules, slug, studio, access] = await Promise.all([
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id)),
    db.select({ id: members.id, name: members.name }).from(members),
    fetchInvoiceRules(), currentPortalSlug(), fetchStudio(),
    db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).where(and(eq(homeownerLeadLinks.leadId, l.id), isNotNull(homeownerLeadLinks.invitedAt), isNull(homeownerLeadLinks.withdrawnAt))).limit(1),
  ])
  const teamIds = team.map((t) => t.memberId)
  const sees = seesMoney(viewer, teamIds)
  const input = sees ? await moneyInputOf(p) : null
  const client = titleCaseName(l.name)
  const me = people.find((m) => m.id === viewer.id)
  return {
    project: { id: p.id, number: p.number, name: p.name, stage: p.stage, leadId: l.id, quoteId: p.quoteId },
    client: { name: client, firstName: client.split(' ')[0] ?? client, phone: l.phone },
    money: input ? moneyOf(input, now) : null,
    rules,
    viewer: { id: viewer.id, role: viewer.role, name: me?.name ?? 'You', prepares: sees && preparesInvoices(viewer, teamIds), sendsAtOnce: sendsAtOnce(viewer.role, rules), approves: approvesInvoices(viewer.role), voids: voidsInvoices(viewer.role), marksApproved: marksVariationApproved(viewer.role), locked: completedBlock(p.stage, 'money') },
    people,
    portalUrl: portalPath(slug),
    portalAccess: access.length > 0,
    studioName: studio.name,
    quote: input?.quote ? { id: input.quote.id, number: input.quote.number, title: input.quote.title, lines: await signedQuoteLines(input.quote.id) } : null,
    now,
    payments: sees ? await fetchPaymentsData(p, l, viewer, teamIds) : null,   // (Projects round 6)
    ...(sees ? await sendFacts(input?.quote?.issuingEntity ?? null) : {}),   // (fix-D, D-10)
    ...(sees && input ? splitFor(await moneyExtras(p, input, viewer.id, rules), viewer.role) : {}),   // (gaps build B) · (parity map, MI-007) the split is what was agreed — never Accounting's to change
    /* (simplify S-07) the VO sub-list hides with none — unless one was deleted, so Deleted variation orders keeps its way in */
    deletedVariations: sees ? (await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.projectId, p.id), eq(quotes.kind, 'variation'), isNotNull(quotes.deletedAt)))).length : 0,
  }
}

/** (parity map, MI-007 · PR-022) Accounting prepares a project's invoices but never changes what was agreed: the split reads its rule where its
    editor would open (the server's `setProjectSplit` asks `mayChangeProject` too). */
const splitFor = <T extends { split?: SplitEditor | null }>(x: T, role: string): T =>
  (isAccounting(role) && x.split && !x.split.block ? { ...x, split: { ...x.split, block: CHANGE_RULE } } : x)
/** (gaps build B) What the Money tab adds for money in, complete: the handover day, the viewer's approver reminders, the split it may edit, the
    stages a recorded invoice may stand for. */
async function moneyExtras(p: Project, input: Awaited<ReturnType<typeof moneyInputOf>>, viewerId: string, rules: InvoiceRules): Promise<Pick<ProjectMoneyData, 'handoverDay' | 'approverReminded' | 'split' | 'recordable' | 'progressPct'>> {
  const [mine, msRows] = await Promise.all([
    db.select({ id: sql<string>`json_extract(${leadEvents.detail}, '$.id')`, at: leadEvents.at }).from(leadEvents)
      .where(and(eq(leadEvents.projectId, p.id), eq(leadEvents.kind, 'project_invoice_approver_reminded'), eq(leadEvents.actorId, viewerId))),
    db.select({ id: projectMilestones.id, title: projectMilestones.title, ref: projectMilestones.paymentRef, due: projectMilestones.paymentDue, position: projectMilestones.position, status: projectMilestones.status })
      .from(projectMilestones).where(and(eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position)),
  ])
  const approverReminded: Record<string, number> = {}
  for (const r of mine) if (r.id) approverReminded[r.id] = Math.max(approverReminded[r.id] ?? 0, r.at.getTime())
  const m = moneyOf(input, Date.now())
  /* (item 9) a recorded invoice may stand for a stage whose invoice is still an unsent Draft (never one waiting for approval) */
  const recordable = m.stages.filter((s) => s.invoice && s.invoice.status === 'draft' && !s.invoice.submittedAt).map((s) => ({ ref: s.ref, name: s.name, amountMinor: s.invoice!.amountMinor }))
  let split: SplitEditor | null = null
  if (!input.quote) {
    const tpls = await db.select({ id: paymentTemplates.id, name: paymentTemplates.name, rowsJson: paymentTemplates.rowsJson }).from(paymentTemplates).where(isNull(paymentTemplates.deletedAt)).orderBy(desc(paymentTemplates.isPreset), asc(paymentTemplates.createdAt))
    const own = parseProjectSplit(p.paymentTemplate)
    const sentStage = input.invoices.some((i) => !i.stageRef.startsWith('extra:') && !i.stageRef.startsWith('vo:') && (i.status !== 'draft' || !!i.number))
    const waiting = input.invoices.some((i) => !i.stageRef.startsWith('extra:') && !i.stageRef.startsWith('vo:') && i.status === 'draft' && !!i.submittedAt)
    split = {
      rows: (own?.rows ?? []).map((r, i) => ({ name: r.name, pct: r.pct, fixedMinor: r.fixedMinor ?? null, milestoneId: msRows.find((x) => x.ref === `split:${i}`)?.id ?? null })),
      block: completedBlock(p.stage, 'money') ?? (sentStage ? 'A stage’s invoice has been sent — the split agreed then stays' : waiting ? 'A stage’s invoice is waiting for approval — send it back first' : null),
      feeFirst: !!rules.feeFirst,
      templates: tpls.map((t) => ({ id: t.id, name: t.name, rows: parseSplitRows(t.rowsJson).map((r) => ({ name: r.name, pct: r.pct })) })).filter((t) => t.rows.length),
      milestones: msRows.map((x) => ({ id: x.id, title: x.title, ref: x.ref, due: x.due === 'start' ? 'start' : 'end' })),
      template: own?.template ?? null,
    }
  }
  const progressPct = msRows.length ? Math.round((msRows.filter((x) => x.status === 'done').length / msRows.length) * 100) : null
  return { handoverDay: p.targetEndDate ? p.targetEndDate.getTime() : null, approverReminded, split, recordable, progressPct }
}

/** (fix-D, D-10) What an invoice's WhatsApp draft names before it opens: the number the send takes, and the bank / PayNow it is paid to. */
async function sendFacts(entityName: string | null): Promise<{ nextInvoiceNumber: string; payTo: ProjectMoneyData['payTo'] }> {
  const [brand, next] = await Promise.all([fetchBrand(), nextNumberFor(entityName, new Date())])   // (gaps build B, item 12) the entity's own pattern
  const list = brand.details.entities
  const e = (entityName ? list.find((x) => x.name === entityName) : null) ?? list[0] ?? null
  const payTo = e && (e.bankName || e.accountNo || e.payNow) ? { bankName: e.bankName ?? '', accountName: e.accountName ?? '', accountNo: e.accountNo ?? '', payNow: e.payNow ?? '' } : null
  return { nextInvoiceNumber: next, payTo }
}

/** (fix-D, D-35) Whether the viewer may see the project but not its money — the invoice and receipt pages say so, as the Money tab does. */
export async function moneyHiddenFor(projectId: string): Promise<{ project: { id: string; name: string } } | null> {
  const d = await fetchProjectMoney(projectId)
  return d && !d.money ? { project: { id: d.project.id, name: d.project.name } } : null
}

/* ── The invoice page (F-12's frame: the quote preview's, on the issuing entity's letterhead, with how to pay — F-15) ─────────── */

export type InvoiceDocData = ProjectMoneyData & {
  invoice: MoneySummary['invoices'][number]
  stage: MoneySummary['stages'][number] | null
  studio: StudioDetails
  brandLogo: string | null
  /** The entity it is raised under (the quote's issuing entity, else the studio's own): its letterhead and how to pay. */
  entity: IssuingEntity | null
  /** (parity map, FB-103 · MI-065 — P-D) the letterhead with the entity's extras (tagline, contacts, footer, accent, branch) */
  letterhead: PaperLetterhead
  property: string | null
  /** (gaps build B, item 14) the studio's invoice paper for the entity it is raised under */
  layout: InvoicePaperLayout
  /** (parity map, FB-112 — P-D) the ways the studio takes money today: How to pay and Record a payment follow them */
  methods?: string[]
}

export async function fetchInvoiceDoc(projectId: string, invoiceId: string): Promise<InvoiceDocData | null> {
  const base = await fetchProjectMoney(projectId)
  if (!base || !base.money) return base ? null : null
  const invoice = base.money.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return null
  const [brand, lead] = await Promise.all([fetchBrand(), db.select({ propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }).from(leads).where(eq(leads.id, base.project.leadId)).limit(1)])
  const studio = brand.details
  const { entity, letterhead } = await letterheadOf(brand, invoice.issuingEntity, base.project.quoteId)
  return {
    ...base, invoice, stage: base.money.stages.find((s) => s.ref === invoice.stageRef) ?? null, studio, brandLogo: brand.kit.logo ?? null, entity, letterhead,
    property: lead[0]?.propertyAddress ?? lead[0]?.leadAddress ?? null,
    layout: paperFor(await fetchInvoicePaper(), entity?.id ?? null),   // (gaps build B, item 14)
    methods: await fetchLiveMethodValues(),   // (parity map, FB-112)
  }
}

/** (round 5, shared by round 6's receipt and the portal) The entity an invoice is raised under — its own, else the base quote's, else the studio's
    first — and the letterhead it prints on (`docLetterhead`'s rule: another entity's name, logo and registration numbers; the studio's address
    when it has none). */
export async function letterheadOf(brand: Awaited<ReturnType<typeof fetchBrand>>, entityName: string | null, quoteId: string | null): Promise<{ entity: IssuingEntity | null; letterhead: PaperLetterhead }> {
  const studio = brand.details
  const quoteEntity = quoteId ? (await db.select({ e: quotes.issuingEntity }).from(quotes).where(eq(quotes.id, quoteId)).limit(1))[0]?.e ?? null : null
  const list = studio.entities
  const entity = (entityName ?? quoteEntity ? list.find((e) => e.name === (entityName ?? quoteEntity)) : null) ?? list[0] ?? null
  const own = !entity || entity === list[0]
  const letterhead = own || !entity
    ? { name: studio.name, address: studio.address, uen: studio.uen, gstReg: studio.gstRegistered === false || (entity && !entity.gstRegistered) ? '' : studio.gstReg, logo: brand.kit.logo ?? null }
    : { name: entity.name || studio.name, address: entity.address || studio.address, uen: entity.uen, gstReg: entity.gstRegistered ? entity.gstReg : '', logo: entity.logo ?? brand.kit.logo ?? null }
  /* (parity map, FB-103 · MI-065 — P-D's paper chrome) every money paper prints its entity's extras: the tagline, contacts, website, footer line,
     the accent (the brand's by default) and the bank's branch code */
  const extras = paperExtrasOf(entity, studio, list[0] ?? null, brand.kit.colors.accent ?? null)
  return { entity, letterhead: { ...letterhead, extras } }
}

/** The projects a member's newest invoice rows belong to, newest first — for the bell's links. */
export async function projectOfInvoice(invoiceId: string): Promise<{ projectId: string; leadId: string } | null> {
  const [r] = await db.select({ projectId: projectInvoices.projectId, leadId: projects.leadId }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId)).where(eq(projectInvoices.id, invoiceId)).orderBy(desc(projectInvoices.createdAt)).limit(1)
  return r ?? null
}
