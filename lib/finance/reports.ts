/**
 * (gaps build F2 — the books, F2-Q12; 1.0 G-491, `finance/reports/page.tsx`) Finance › Reports — pure and client-safe. Each report reads the one
 * set of numbers the rest of 2.0 reads — `moneyOf` (money in), `costsOf` (money out), `commissionsOf` — handed in by the server
 * (lib/finance/books.ts); none recomputes a total its own way (1.0's reports each had their own queries). Revenue and costs are before GST
 * (the GST is the government's); a period picks what happened in it. Every report is a few tiles and one or more tables, and exports as
 * those tables (the house Export).
 * (simplify S-13, his "build everything" 2026-10-09 — F1 §6.7, P3) One set of numbers: a PO with bills is aged by its bills' days in You owe and
 * Cash flow (as `costsOf` does — S$1,400 overdue, never the PO's own day as well); a project whose profit is not graded yet (no costs, or an early
 * estimate — `profitGrade`, lib/finance/profit.ts) stays out of Profitability's weighted margin and its by-type and by-designer margins ("--"); the
 * two margins are named apart (*Margin on what was invoiced* · *Margin on contracts*); and a row's tone colours the one figure that carries it.
 */
import { money2 } from '@/lib/quotes/math'
import { calendarDaysBetween, dayWords, displayDate } from '@/lib/format'
import { matchesEntity, type EntityOption } from './entity-scope'
import { moneyInHref, moneyOutHref } from './sections'
import type { MoneySummary } from '@/lib/projects/money'
import type { CostSummary } from './costs'
import type { VendorRecord } from './model'
import { ruleWords, type CommissionAsk, type CommissionPayoutRecord, type CommissionRuleRecord, type CommissionSummary } from './commission'
import { marginCell, profitGrade, tierOf, TIER_LABEL, type ProfitView } from './profit'

/* (parity map, FB-065 · FB-076 — his "build everything that's in 1.0" 2026-10-10) GST and Expenses join the reports: GST reverses REG-1307's
   "Tax report dropped"; Expenses is 1.0's expenses-only report. Each sits beside its kin — GST after Cash flow, Expenses after Vendor spend. */
export type ReportKey = 'pl' | 'ar' | 'ap' | 'profitability' | 'cashflow' | 'gst' | 'vendors' | 'expenses' | 'commissions' | 'statement'
/* (the calm UI build 2026-10-27 — 5-06 · 5-20 · T-01) the reports in the one money vocabulary: To collect (what clients still owe), To pay (what the
   studio still owes), Collected, Commission — the keys and `?report=` values are unchanged */
export const REPORTS: { key: ReportKey; label: string; help: string }[] = [
  { key: 'pl', label: 'Profit and loss', help: 'What was invoiced and what it cost, before GST' },
  { key: 'ar', label: 'To collect', help: 'Clients’ unpaid invoices by how late they are — and the net once what you have to pay is taken off' },
  { key: 'ap', label: 'To pay', help: 'Vendors’ and claims’ balances by how late they are' },
  { key: 'profitability', label: 'Profitability', help: 'Expected profit and margin by project, by type, by designer and by budget' },
  { key: 'cashflow', label: 'Cash flow', help: 'Collected and paid out by month against the same month last year, and what the next 90 days hold' },
  { key: 'gst', label: 'GST', help: 'The GST you charged on invoices and paid on bills and expenses, and the net to pay' },
  { key: 'vendors', label: 'Vendor spend', help: 'What each vendor was committed, was paid and is still to be paid' },
  { key: 'expenses', label: 'Expenses', help: 'Approved expenses by category, with their GST and the claims paid back' },
  { key: 'commissions', label: 'Commission', help: 'What each member earned, was paid and is still to be paid — and what each project is expected to pay' },
  { key: 'statement', label: 'Client statement', help: 'One project’s invoices, payments and credit notes, with the balance' },
]
export const isReportKey = (v: unknown): v is ReportKey => REPORTS.some((r) => r.key === v)
/** (pending modules S41b-1) The reports made of profit and margin — closed to a role the Owner keeps from them (Who sees costs and margins). */
export const PROFIT_REPORTS: ReportKey[] = ['pl', 'profitability']
/** Reports a period changes (the others are as they stand today, or the project's whole life). */
export const PERIOD_REPORTS: ReportKey[] = ['pl', 'cashflow', 'gst', 'vendors', 'expenses', 'commissions']
/** (parity map, FB-065) GST is filed by the quarter: picking it on a period that is not a quarter lands on This quarter. */
export const QUARTER_PERIODS: PeriodKey[] = ['this_quarter', 'last_quarter']
/** (parity map, FB-105) The reports the Issued by scope applies to — every one but a single project's statement. */
export const ENTITY_REPORTS: ReportKey[] = ['pl', 'ar', 'ap', 'profitability', 'cashflow', 'gst', 'vendors', 'expenses', 'commissions']

export type PeriodKey = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'all'
export const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'this_month', label: 'This month' }, { value: 'last_month', label: 'Last month' }, { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },   // (parity map, FB-065) the quarter a GST return is filed for
  { value: 'this_year', label: 'This year' }, { value: 'last_year', label: 'Last year' }, { value: 'all', label: 'All time' },
]
export const isPeriod = (v: unknown): v is PeriodKey => PERIODS.some((p) => p.value === v)
export function periodRange(key: PeriodKey, now: number): { from: number; to: number; label: string } {
  const d = new Date(now)
  const y = d.getFullYear(), m = d.getMonth()
  const at = (yy: number, mm: number) => new Date(yy, mm, 1).getTime()
  switch (key) {
    case 'this_month': return { from: at(y, m), to: at(y, m + 1), label: d.toLocaleString('en-SG', { month: 'long', year: 'numeric' }) }
    case 'last_month': return { from: at(y, m - 1), to: at(y, m), label: new Date(y, m - 1, 1).toLocaleString('en-SG', { month: 'long', year: 'numeric' }) }
    case 'this_quarter': { const q = Math.floor(m / 3) * 3; return { from: at(y, q), to: at(y, q + 3), label: `Q${q / 3 + 1} ${y}` } }
    case 'last_quarter': { const q = Math.floor(m / 3) * 3 - 3; const yy = q < 0 ? y - 1 : y, qq = (q + 12) % 12; return { from: at(yy, qq), to: at(yy, qq + 3), label: `Q${qq / 3 + 1} ${yy}` } }
    case 'this_year': return { from: at(y, 0), to: at(y + 1, 0), label: String(y) }
    case 'last_year': return { from: at(y - 1, 0), to: at(y, 0), label: String(y - 1) }
    default: return { from: 0, to: Number.MAX_SAFE_INTEGER, label: 'All time' }
  }
}

/* ── What a report is ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ColumnKind = 'text' | 'money' | 'pct' | 'date' | 'count'
export type ReportColumn = { key: string; label: string; kind?: ColumnKind; track?: string }
export type Cell = string | number | null
/** `toneKey` (simplify S-13): the one cell the tone colours — the figure that carries the meaning, never every money cell on the row. */
export type ReportRow = { id: string; cells: Record<string, Cell>; tone?: 'green' | 'yellow' | 'red'; toneKey?: string; strong?: boolean; href?: string }
export type ReportTable = { key: string; title: string; help?: string; columns: ReportColumn[]; rows: ReportRow[]; total?: ReportRow | null; empty: string }
/** (the Dashboard redesigned, 2026-10-26 — P-13 "one Owed to you") `minor` = a money tile's own figure, unformatted — so a card that writes sums
    as a record card does ("S$ 34,803", `moneyCard`) shows the report's own number, never a second count of it. The report draws `value`. */
export type ReportTile = { label: string; value: string; help?: string; grade?: 'good' | 'warn' | 'bad'; minor?: number
  /** (the calm UI build 2026-10-27 — 5-07, T-05) how the figure is worked out — the tile's value says it on hover and focus, off the page */
  how?: string }
export type Report = { key: ReportKey; title: string; help: string; tiles: ReportTile[]; tables: ReportTable[] }

/** What a cell prints (the screen and the export read this one function). */
export function cellText(c: Cell, kind: ColumnKind = 'text'): string {
  if (c === null || c === undefined || c === '') return '--'
  if (kind === 'money') return typeof c === 'number' ? money2(c) : String(c)
  if (kind === 'pct') return typeof c === 'number' ? `${Number.isInteger(c) ? c : c.toFixed(1)}%` : String(c)
  if (kind === 'date') return typeof c === 'number' ? displayDate(new Date(c)) : String(c)
  return String(c)
}

/* ── The books a report reads (BooksData's shape, without the server) ─────────────────────────────────────────────────────────── */

export type ReportPayment = { id: string; invoiceId: string; paidOn: number; amountMinor: number; netMinor: number; contract: boolean; method: string; reference: string | null; receipt: string | null }
export type ReportCredit = { id: string; invoiceId: string; number: string; reason: string; amountMinor: number; gstMinor: number; status: 'issued' | 'void'; issuedAt: number; voidedAt: number | null; refundMinor: number | null; refundedOn: number | null; invoiceLabel: string
  /** (pending modules S07 — D-14) `overpayment`: money a client paid beyond an invoice, held as their credit — money IN on its day, never a credit given */ kind?: 'credit' | 'overpayment' }
/** (pending modules S07) A credit note that lowers revenue and GST — never an overpayment's (that is the client's money, held). */
const lowers = (c: Pick<ReportCredit, 'kind'>) => c.kind !== 'overpayment'
/** (pending modules S07) A payment taken from a client's credit: not money that came in that day (it came with the overpayment). */
const fromCredit = (x: Pick<ReportPayment, 'method'>) => x.method === 'credit'
export type ReportProject = {
  id: string; number: string; name: string; stage: string; projectType: string | null; client: string; team: { id: string; name: string }[]
  money: MoneySummary; costs: CostSummary; profit: ProfitView; payments: ReportPayment[]; credits: ReportCredit[]
  /** (parity map, FB-105) the entity its signed quote is issued under (null = the studio's own) — what the Issued by scope reads for it */
  entity?: string | null
  /** (parity map, FB-077) started (In progress) and completed — Profitability's days to complete; the client's budget on the lead */
  startedAt?: number | null; completedAt?: number | null; budgetMinor?: number | null
}
export type ReportInput = {
  projects: ReportProject[]; overhead: CostSummary; vendors: VendorRecord[]; people: { id: string; name: string }[]
  commission: { summary: CommissionSummary; payouts: CommissionPayoutRecord[]
    /** (parity map, FB-073) every rule version and every ask — the Changes list */ rules?: CommissionRuleRecord[]; asks?: CommissionAsk[] }
  now: number
  /** (parity map, FB-105) the Issued by options (`entityOptions` — empty with fewer than two entities) and, once scoped, which projects count
      whole (Profitability · Commissions · commission in P&L and Cash flow) — `scopeReportInput` sets both */
  entities?: EntityOption[]; scope?: EntityOption | null; projectIn?: (p: ReportProject) => boolean
}

/** One cost as the books count it: its day, before and with GST, its category, its vendor — the P&L, cash flow and vendor spend read these. */
type CostItem = { id: string; day: number; netMinor: number; grossMinor: number; category: string; kind: 'po' | 'bill' | 'expense'; projectId: string | null; vendorId: string | null }
function costItems(c: CostSummary, projectId: string | null, trades: Record<string, string | null>): CostItem[] {
  const out: CostItem[] = []
  for (const po of c.pos) {
    if (!po.committedMinor) continue
    const day = po.sentAt ?? po.createdAt
    const ratio = po.totalMinor ? po.subtotalMinor / po.totalMinor : 1
    const total = po.lines.reduce((s, l) => s + l.amountMinor, 0)
    if (!total) { out.push({ id: po.id, day, grossMinor: po.committedMinor, netMinor: Math.round(po.committedMinor * ratio), category: trades[po.vendorId] ?? 'Other', kind: 'po', projectId, vendorId: po.vendorId }); continue }
    let given = 0
    po.lines.forEach((l, i) => {
      const gross = i === po.lines.length - 1 ? po.committedMinor - given : Math.round((po.committedMinor * l.amountMinor) / total)
      given += gross
      out.push({ id: `${po.id}:${l.id}`, day, grossMinor: gross, netMinor: Math.round(gross * ratio), category: l.category ?? trades[po.vendorId] ?? 'Other', kind: 'po', projectId, vendorId: po.vendorId })
    })
  }
  for (const b of c.bills) if (b.committedMinor) out.push({ id: b.id, day: b.issuedOn, grossMinor: b.totalMinor, netMinor: b.subtotalMinor, category: trades[b.vendorId] ?? 'Other', kind: 'bill', projectId, vendorId: b.vendorId })
  for (const e of c.expenses) if (e.committedMinor) out.push({ id: e.id, day: e.spentOn, grossMinor: e.amountMinor, netMinor: e.amountMinor - e.gstMinor, category: e.category || 'Other', kind: 'expense', projectId, vendorId: e.vendorId })
  return out
}
const inRange = (t: number | null | undefined, r: { from: number; to: number }) => !!t && t >= r.from && t < r.to
const DAY = 86_400_000
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)
const pct1 = (n: number) => Math.round(n * 10) / 10
const nameOf = (people: { id: string; name: string }[], id: string | null) => people.find((p) => p.id === id)?.name ?? 'A member'
/* (parity map, FB-073) a rule in force on a day, and the order a member's rules apply (member on the project → project → member → studio) */
const inForceAt = (r: Pick<CommissionRuleRecord, 'fromDay' | 'endedAt'>, day: number) => r.fromDay <= day && (r.endedAt === null || r.endedAt > day)
const rank = (r: Pick<CommissionRuleRecord, 'memberId' | 'projectId'>, a: { memberId: string; projectId: string }) => (r.memberId === a.memberId && r.projectId === a.projectId ? 0 : r.projectId === a.projectId ? 1 : r.memberId === a.memberId ? 2 : 3)
const trades = (vendors: VendorRecord[]) => Object.fromEntries(vendors.map((v) => [v.id, v.trade]))
const allCosts = (i: ReportInput) => {
  const t = trades(i.vendors)
  return [...i.projects.flatMap((p) => costItems(p.costs, p.id, t)), ...costItems(i.overhead, null, t)]
}
/** Late by: current · 1–30 · 31–60 · 61–90 · over 90 days past the due day. */
export const AGING = ['Current', '1–30 days', '31–60 days', '61–90 days', 'Over 90 days'] as const
export const agingOf = (due: number | null, now: number) => { if (!due || now < due + DAY) return 0; const d = Math.floor((now - due) / DAY); return d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4 }
const agingTable = (key: string, title: string, rows: { amount: number; bucket: number }[], empty: string): ReportTable => ({
  key, title, empty, columns: [{ key: 'bucket', label: 'Late by', track: 'minmax(180px, 1fr)' }, { key: 'count', label: 'Records', kind: 'count', track: '120px' }, { key: 'amount', label: 'Amount', kind: 'money', track: '160px' }],
  rows: AGING.map((label, b) => ({ id: `b${b}`, cells: { bucket: label, count: rows.filter((r) => r.bucket === b).length, amount: sum(rows.filter((r) => r.bucket === b), (r) => r.amount) }, tone: b >= 3 ? 'red' as const : b >= 1 ? 'yellow' as const : undefined, toneKey: 'amount' })),
  total: { id: 'total', strong: true, cells: { bucket: 'Total', count: rows.length, amount: sum(rows, (r) => r.amount) } },
})

/* ── The Issued by scope (parity map, FB-105 — 1.0's entity picker on every report) ───────────────────────────────────────────── */

/**
 * (parity map, FB-105) The books as one issuing entity sees them — only with two or more entities (`entityOptions`), only once one is picked.
 * Every record counts under the entity it names: an invoice (and its payments and credit notes) its own; a PO its own; a bill its PO's, else its
 * project's; an expense its own, else its project's; a payment out the record it pays. A project counts whole (Profitability, Commissions,
 * commission in P&L and Cash flow) under its signed quote's entity. A record that names none is the studio's own — the first entity
 * (`matchesEntity`). The figures are the same functions' over fewer records — nothing is recomputed another way.
 */
export function scopeReportInput(i: ReportInput, scope: EntityOption | null): ReportInput {
  const options = i.entities ?? []
  if (!scope || options.length < 2) return { ...i, scope: null }
  const isIn = (name: string | null | undefined) => matchesEntity(name ?? null, scope, options)
  const costsIn = (c: CostSummary, projectEntity: string | null): CostSummary => {
    const pos = c.pos.filter((po) => isIn(po.issuingEntity))
    const poIds = new Set(pos.map((x) => x.id))
    const bills = c.bills.filter((b) => (b.poId ? poIds.has(b.poId) : isIn(projectEntity)))
    const billIds = new Set(bills.map((x) => x.id))
    const expenses = c.expenses.filter((e) => isIn(e.issuingEntity ?? projectEntity))
    const expIds = new Set(expenses.map((x) => x.id))
    const payouts = c.payouts.filter((x) => (x.poId ? poIds.has(x.poId) : x.billId ? billIds.has(x.billId) : x.expenseId ? expIds.has(x.expenseId) : isIn(projectEntity)))
    return { ...c, pos, bills, expenses, payouts }
  }
  const projects = i.projects.map((p) => {
    const pe = p.entity ?? null
    const invoices = p.money.invoices.filter((v) => isIn(v.issuingEntity))
    const ids = new Set(invoices.map((v) => v.id))
    return { ...p, money: { ...p.money, invoices }, payments: p.payments.filter((x) => ids.has(x.invoiceId)), credits: p.credits.filter((c) => ids.has(c.invoiceId)), costs: costsIn(p.costs, pe) }
  })
  const whole = new Set(i.projects.filter((p) => isIn(p.entity ?? null)).map((p) => p.id))
  const lines = i.commission.summary.lines.filter((l) => whole.has(l.projectId))
  const add = (k: 'earnedMinor' | 'paidMinor' | 'owedMinor') => lines.reduce((x, l) => x + l[k], 0)
  return {
    ...i, projects, overhead: costsIn(i.overhead, null), scope, projectIn: (p) => whole.has(p.id),
    commission: { ...i.commission, summary: { ...i.commission.summary, lines, earnedMinor: add('earnedMinor'), paidMinor: add('paidMinor'), owedMinor: add('owedMinor') },
      payouts: i.commission.payouts.filter((x) => whole.has(x.projectId)), asks: i.commission.asks?.filter((a) => whole.has(a.projectId)),
      rules: i.commission.rules?.filter((r) => !r.projectId || whole.has(r.projectId)) },
  }
}
const projectsIn = (i: ReportInput) => (i.projectIn ? i.projects.filter(i.projectIn) : i.projects)

/** What the studio owes, row by row — You owe's balances, and (FB-004) the Net position on Owed to you. */
type ApRow = { id: string; who: string; record: string; project: string; due: number | null; amount: number; bucket: number; href: string }
function apRowsOf(i: ReportInput): ApRow[] {
  const vName = (id: string | null) => i.vendors.find((v) => v.id === id)?.name ?? 'A vendor'
  const pName = (id: string | null) => (id ? i.projects.find((p) => p.id === id)?.name ?? '' : 'Studio overhead')
  const rows: ApRow[] = []
  const add = (c: CostSummary, projectId: string | null) => {
    const where = projectId ? `/projects/${projectId}/money` : '/company/finance'
    const at = (id: string, kind: 'purchase-orders' | 'bills') => (projectId ? `${where}?open=${encodeURIComponent(id)}` : `/company/finance/money-out?kind=${kind}&open=${encodeURIComponent(id)}`)
    for (const po of c.pos) {
      if (po.balanceMinor <= 0) continue
      /* (simplify S-13) a PO with bills owes by its bills' days (costsOf's rule): each unpaid bill its own row, the PO only what is not billed yet */
      const unpaid = po.billIds.map((id) => c.bills.find((b) => b.id === id)).filter((b): b is NonNullable<typeof b> => !!b && b.balanceMinor > 0)
      for (const b of unpaid) rows.push({ id: b.id, who: vName(b.vendorId), record: `Bill ${b.reference} · ${po.number}`, project: pName(projectId), due: b.dueOn, amount: b.balanceMinor, bucket: agingOf(b.dueOn, i.now), href: at(b.id, 'bills') })
      const rest = Math.max(0, po.balanceMinor - sum(unpaid, (b) => b.balanceMinor))
      if (!rest) continue
      const due = po.billIds.length ? null : po.dueOn
      rows.push({ id: po.id, who: vName(po.vendorId), record: po.billIds.length ? `${po.number} · not billed yet` : po.number, project: pName(projectId), due, amount: rest, bucket: agingOf(due, i.now), href: at(po.id, 'purchase-orders') })
    }
    for (const b of c.bills) if (!b.poId && !b.waits && b.balanceMinor > 0) rows.push({   /* (S44R, C8) a bill that waits for its OK is owed once approved (costsOf's rule) */ id: b.id, who: vName(b.vendorId), record: `Bill ${b.reference}`, project: pName(projectId), due: b.dueOn, amount: b.balanceMinor, bucket: agingOf(b.dueOn, i.now), href: at(b.id, 'bills') })
    for (const e of c.expenses) if (e.owedMinor > 0) rows.push({ id: e.id, who: nameOf(i.people, e.claimantId), record: `Claim · ${e.description}`, project: pName(projectId), due: null, amount: e.owedMinor, bucket: 0, href: `/company/finance/money-out?kind=expenses&open=${encodeURIComponent(e.id)}` })
  }
  for (const p of i.projects) add(p.costs, p.id)
  add(i.overhead, null)
  return rows.sort((a, b) => b.bucket - a.bucket || (a.due ?? 0) - (b.due ?? 0))
}

/* (parity map, FB-077 — 1.0's comparative analytics) the client's budget on the lead, in 1.0's four bands */
const BUDGET_BANDS: { label: string; upTo: number }[] = [
  { label: 'Under S$30,000', upTo: 3_000_000 }, { label: 'S$30,000 – S$60,000', upTo: 6_000_000 }, { label: 'S$60,000 – S$100,000', upTo: 10_000_000 }, { label: 'S$100,000 and over', upTo: Number.MAX_SAFE_INTEGER },
]
const budgetBand = (minor: number | null | undefined) => (!minor || minor <= 0 ? 'No budget' : BUDGET_BANDS.find((b) => minor < b.upTo)!.label)
const BAND_ORDER = [...BUDGET_BANDS.map((b) => b.label), 'No budget']
/** Days to complete: start (In progress, else the record's making) → completed, in calendar days, over the completed projects. */
const daysToComplete = (p: ReportProject) => (p.completedAt && p.startedAt ? Math.max(0, calendarDaysBetween(p.startedAt, p.completedAt)) : null)

/* ── The reports ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function buildReport(key: ReportKey, i: ReportInput, period: PeriodKey, o: { projectId?: string | null } = {}): Report {
  const meta = REPORTS.find((r) => r.key === key)!
  const range = periodRange(period, i.now)
  const base = { key, title: meta.label, help: meta.help }
  const href = (projectId: string) => `/projects/${projectId}/money`

  if (key === 'pl') {
    const sent = i.projects.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && inRange(v.sentAt, range)).map((v) => ({ v, p })))
    const kinds: { key: string; label: string; pick: (k: string, outside: boolean) => boolean }[] = [
      { key: 'stage', label: 'Scheduled payments', pick: (k) => k === 'stage' },   // (the calm UI build 2026-10-27 — §2: "stage" is a lead's or a project's; a payment part is a payment)
      { key: 'variation', label: 'Variation orders billed on their own', pick: (k) => k === 'variation' },
      { key: 'one_off', label: 'One-off invoices', pick: (k) => k === 'one_off' },
      { key: 'external', label: 'Invoices recorded from elsewhere', pick: (k) => k === 'external' },
    ]
    const credits = i.projects.flatMap((p) => p.credits.filter((c) => c.status === 'issued' && lowers(c) && inRange(c.issuedAt, range)))
    const revRows: ReportRow[] = kinds.map((k) => {
      const xs = sent.filter(({ v }) => k.pick(v.kind ?? 'stage', v.outside))
      return { id: k.key, cells: { line: k.label, count: xs.length, amount: sum(xs, ({ v }) => v.amountMinor - v.gstMinor) } }
    }).filter((r) => r.cells.count)
    if (credits.length) revRows.push({ id: 'credits', cells: { line: 'Credit notes', count: credits.length, amount: -sum(credits, (c) => c.amountMinor - c.gstMinor) } })
    const revenue = sum(revRows, (r) => Number(r.cells.amount) || 0)
    const costs = allCosts(i).filter((c) => inRange(c.day, range))
    const cats = new Map<string, number>()
    for (const c of costs) cats.set(c.category, (cats.get(c.category) ?? 0) + c.netMinor)
    const costTotal = sum(costs, (c) => c.netMinor)
    const earned = i.commission.summary.lines.flatMap((l) => l.entries).filter((e) => inRange(e.paidOn, range))
    const commission = sum(earned, (e) => e.amountMinor)
    const profit = revenue - costTotal - commission
    const margin = revenue ? pct1((profit / revenue) * 100) : 0
    const cols: ReportColumn[] = [{ key: 'line', label: 'Line', track: 'minmax(240px, 1fr)' }, { key: 'count', label: 'Records', kind: 'count', track: '110px' }, { key: 'amount', label: 'Before GST', kind: 'money', track: '170px' }]
    return {
      ...base,
      tiles: [
        { label: 'Revenue', value: money2(revenue), minor: revenue, help: `Invoices sent in ${range.label}, before GST` },
        { label: 'Costs', value: money2(costTotal + commission), minor: costTotal + commission, help: commission ? `${money2(commission)} of it commission` : 'POs sent, bills and approved expenses' },
        { label: 'Profit', value: money2(profit), minor: profit, grade: profit < 0 ? 'bad' : undefined, help: profit < 0 ? 'A loss for the period' : 'Revenue less costs' },
        { label: 'Margin on what was invoiced', value: revenue ? `${margin}%` : '--', grade: revenue ? ({ healthy: 'good', tight: 'warn', at_risk: 'bad' } as const)[tierOf(margin)] : undefined, help: revenue ? `${TIER_LABEL[tierOf(margin)]} · before GST, in the period` : 'Nothing invoiced in the period' },
      ],
      tables: [
        { key: 'revenue', title: 'Revenue', help: 'Invoices sent in the period, less the credit notes issued in it.', columns: cols, rows: revRows, total: { id: 't', strong: true, cells: { line: 'Revenue', count: null, amount: revenue } }, empty: 'Nothing invoiced in the period.' },
        { key: 'costs', title: 'Costs by trade and category', help: 'POs sent, bills on no PO and approved expenses — the projects’ and the studio’s overhead.', columns: cols,
          rows: [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ id: cat, cells: { line: cat, count: costs.filter((c) => c.category === cat).length, amount } }))
            .concat(commission ? [{ id: 'commission', cells: { line: 'Commission earned', count: earned.length, amount: commission } }] : []),
          total: { id: 't', strong: true, cells: { line: 'Costs', count: null, amount: costTotal + commission } }, empty: 'No costs in the period.' },
      ],
    }
  }

  if (key === 'ar') {
    const rows = i.projects.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && v.balanceMinor > 0).map((v) => ({ v, p, bucket: agingOf(v.dueAt, i.now) })))
      .sort((a, b) => b.bucket - a.bucket || (a.v.dueAt ?? 0) - (b.v.dueAt ?? 0))
    const owed = sum(rows, (r) => r.v.balanceMinor), late = sum(rows.filter((r) => r.bucket > 0), (r) => r.v.balanceMinor), old = sum(rows.filter((r) => r.bucket >= 2), (r) => r.v.balanceMinor)
    /* (parity map, FB-004 — 1.0's working capital: Owed to you · You owe · Net position) the view opens on the net: what clients owe less what
       the studio owes (You owe's own rows). How late each side is rides its tile's line; the Net is a position, never a fault — no colour. */
    const ap = apRowsOf(i)
    const youOwe = sum(ap, (r) => r.amount), apLate = sum(ap.filter((r) => r.bucket > 0), (r) => r.amount)
    const net = owed - youOwe
    return {
      ...base,
      tiles: [
        { label: 'To collect', value: money2(owed), minor: owed, grade: old ? 'bad' : undefined, help: `${rows.length} invoice${rows.length === 1 ? '' : 's'} not paid in full${late ? ` · ${money2(late)} overdue` : ' · nothing overdue'}` },
        { label: 'To pay', value: money2(youOwe), minor: youOwe, help: `${ap.length} balance${ap.length === 1 ? '' : 's'} to pay${apLate ? ` · ${money2(apLate)} overdue` : ''}` },
        { label: 'Net', value: money2(net), minor: net, help: net >= 0 ? 'To collect, less to pay' : 'More to pay than to collect' },
      ],
      tables: [
        agingTable('buckets', 'By how late', rows.map((r) => ({ amount: r.v.balanceMinor, bucket: r.bucket })), 'Nothing owed.'),
        { key: 'invoices', title: 'Invoices', empty: 'Every sent invoice is paid.', columns: [
          { key: 'invoice', label: 'Invoice', track: 'minmax(160px, 1fr)' }, { key: 'project', label: 'Project', track: 'minmax(220px, 1.4fr)' }, { key: 'client', label: 'Client', track: 'minmax(150px, 1fr)' },
          { key: 'due', label: 'Due', kind: 'date', track: '130px' }, { key: 'late', label: 'Late by', track: '140px' }, { key: 'amount', label: 'To collect', kind: 'money', track: '150px' }],
          rows: rows.map(({ v, p, bucket }) => ({ id: v.id, href: `${href(p.id)}?open=${encodeURIComponent(v.id)}`, tone: bucket >= 2 ? 'red' as const : bucket ? 'yellow' as const : undefined, toneKey: 'amount',
            cells: { invoice: v.label ?? v.stageName, project: p.name, client: p.client, due: v.dueAt, late: AGING[bucket]!, amount: v.balanceMinor } })),
          total: { id: 't', strong: true, cells: { invoice: 'Total', project: null, client: null, due: null, late: null, amount: owed } } },
      ],
    }
  }

  if (key === 'ap') {
    const rows = apRowsOf(i)
    const owed = sum(rows, (r) => r.amount), late = sum(rows.filter((r) => r.bucket > 0), (r) => r.amount)
    return {
      ...base,
      tiles: [
        { label: 'To pay', value: money2(owed), help: `${rows.length} balance${rows.length === 1 ? '' : 's'} to pay` },
        { label: 'Overdue', value: money2(late), grade: late ? 'bad' : undefined, help: late ? 'Past their due day' : 'Nothing overdue' },
        { label: 'Claims to pay back', value: money2(sum(rows.filter((r) => r.record.startsWith('Claim')), (r) => r.amount)) },
      ],
      tables: [
        agingTable('buckets', 'By how late', rows, 'Nothing owed.'),
        { key: 'balances', title: 'Balances', empty: 'Nothing to pay.', columns: [
          { key: 'who', label: 'To', track: 'minmax(180px, 1fr)' }, { key: 'record', label: 'For', track: 'minmax(180px, 1fr)' }, { key: 'project', label: 'Project', track: 'minmax(200px, 1.2fr)' },
          { key: 'due', label: 'Due', kind: 'date', track: '130px' }, { key: 'late', label: 'Late by', track: '140px' }, { key: 'amount', label: 'To pay', kind: 'money', track: '150px' }],
          rows: rows.map((r) => ({ id: r.id, href: r.href, tone: r.bucket >= 2 ? 'red' as const : r.bucket ? 'yellow' as const : undefined, toneKey: 'amount', cells: { who: r.who, record: r.record, project: r.project, due: r.due, late: AGING[r.bucket]!, amount: r.amount } })),
          total: { id: 't', strong: true, cells: { who: 'Total', record: null, project: null, due: null, late: null, amount: owed } } },
      ],
    }
  }

  if (key === 'profitability') {
    const ps = projectsIn(i).filter((p) => p.money.contractMinor > 0)
    /* (simplify S-13 · S-09 · Q-08) a profit counts once it is graded — costs past a tenth of the contract (`profitGrade`); one with no costs (or an
       early estimate) would weigh in at near 100% and lift every margin. Those projects stay listed, their profit and margin "--". */
    const graded = (list: ReportProject[]) => list.filter((p) => profitGrade(p.profit) === 'graded')
    const g = graded(ps)
    const contract = sum(ps, (p) => p.money.contractMinor)
    const gContract = sum(g, (p) => p.money.contractMinor), profit = sum(g, (p) => p.profit.profitMinor)
    const avg = gContract ? pct1((profit / gContract) * 100) : 0
    /* (parity map, FB-077 — 1.0's comparative analytics) each group also says how long its completed projects took, start to completed, on
       average — 1.0's average duration; its average satisfaction is not carried (2.0 never asks the client for a rating) */
    const group = (keyOf: (p: ReportProject) => string[], order?: string[]) => {
      const m = new Map<string, ReportProject[]>()
      for (const p of ps) for (const k of keyOf(p)) m.set(k, [...(m.get(k) ?? []), p])
      return [...m.entries()].map(([k, list]) => {
        const gl = graded(list)
        const c = sum(list, (p) => p.money.contractMinor), gc = sum(gl, (p) => p.money.contractMinor), pr = sum(gl, (p) => p.profit.profitMinor), mg = gc ? pct1((pr / gc) * 100) : 0
        const ds = list.map(daysToComplete).filter((d): d is number => d !== null)
        return { id: k, tone: gc ? ({ healthy: 'green', tight: 'yellow', at_risk: 'red' } as const)[tierOf(mg)] : undefined, toneKey: 'margin', cells: { name: k, projects: list.length, contract: c, committed: sum(list, (p) => p.costs.committedMinor), profit: gl.length ? pr : null, margin: gc ? mg : null,
          days: ds.length ? dayWords(Math.round(sum(ds, (d) => d) / ds.length)) : null } }
      }).sort((a, b) => (order ? order.indexOf(a.id) - order.indexOf(b.id) : Number(b.cells.profit ?? -Infinity) - Number(a.cells.profit ?? -Infinity)))
    }
    const groupCols: ReportColumn[] = [{ key: 'name', label: 'Name', track: 'minmax(200px, 1fr)' }, { key: 'projects', label: 'Projects', kind: 'count', track: '110px' }, { key: 'contract', label: 'Contract value', kind: 'money', track: '160px' },
      { key: 'committed', label: 'Committed', kind: 'money', track: '150px' }, { key: 'profit', label: 'Profit', kind: 'money', track: '150px' }, { key: 'margin', label: 'Margin', kind: 'pct', track: '110px' },
      { key: 'days', label: 'Days to complete', track: '160px' }]
    const daysHelp = 'Days to complete: the average from start to completed, on the group’s completed projects.'
    return {
      ...base,
      tiles: [
        { label: 'Projects', value: String(ps.length), help: 'With a contract value' },
        { label: 'Contract value', value: money2(contract) },
        /* (the calm UI build 2026-10-27 — 5-07 · W-322 · W-252) the profit a signed contract is set to make, named apart from Profit and loss's —
           its basis said on its line (contract value and committed costs, with GST — the project's Payments tab figure; the maths is unchanged),
           how it counts on its value's hover */
        { label: 'Expected profit', value: g.length ? money2(profit) : '--', grade: g.length && profit < 0 ? 'bad' : undefined,
          help: g.length ? `On signed contracts, with GST · ${g.length} project${g.length === 1 ? '' : 's'}` : 'Shown once a project’s costs pass a tenth of its contract',
          how: 'Contract value less committed costs, both with GST, as each project’s Payments tab shows it. A project counts once its costs pass a tenth of its contract — before that it shows “--”.' },
        { label: 'Expected margin', value: gContract ? `${avg}%` : '--', grade: gContract ? ({ healthy: 'good', tight: 'warn', at_risk: 'bad' } as const)[tierOf(avg)] : undefined,
          help: gContract ? `${TIER_LABEL[tierOf(avg)]} · on signed contracts` : 'Shown once a project’s costs pass a tenth of its contract',
          how: 'Expected profit over contract value, weighted by contract value · early estimates left out' },
      ],
      tables: [
        { key: 'projects', title: 'By project', help: 'Profit = contract value − committed costs, both with GST (the Money tab’s figure) — “--” until its costs pass a tenth of the contract.', empty: 'No project has a contract value yet.', columns: [
          { key: 'project', label: 'Project', track: 'minmax(240px, 1.4fr)' }, { key: 'stage', label: 'Stage', track: '130px' }, { key: 'contract', label: 'Contract value', kind: 'money', track: '160px' },
          { key: 'invoiced', label: 'Invoiced', kind: 'money', track: '150px' }, { key: 'collected', label: 'Collected', kind: 'money', track: '150px' }, { key: 'committed', label: 'Committed', kind: 'money', track: '150px' },
          { key: 'profit', label: 'Profit', kind: 'money', track: '150px' }, { key: 'margin', label: 'Margin', track: '170px' }],
          rows: ps.map((p) => { const mc = marginCell(p.profit); const on = profitGrade(p.profit) === 'graded'; return { id: p.id, href: href(p.id), tone: mc.tone === 'default' ? undefined : mc.tone, toneKey: 'margin', cells: { project: `${p.name} · ${p.number}`, stage: STAGE_WORDS[p.stage] ?? p.stage, contract: p.money.contractMinor, invoiced: p.money.invoicedMinor, collected: p.money.collectedMinor, committed: p.costs.committedMinor, profit: on ? p.profit.profitMinor : null, margin: mc.text } } }),
          total: { id: 't', strong: true, cells: { project: 'Total', stage: null, contract, invoiced: sum(ps, (p) => p.money.invoicedMinor), collected: sum(ps, (p) => p.money.collectedMinor), committed: sum(ps, (p) => p.costs.committedMinor), profit: g.length ? profit : null, margin: gContract ? `${avg}%` : null } } },
        { key: 'types', title: 'By project type', help: daysHelp, empty: 'No project has a type.', columns: groupCols, rows: group((p) => [p.projectType || 'No type']) },
        { key: 'designers', title: 'By designer', help: `A project with two people on it counts for both. ${daysHelp}`, empty: 'No project has a team.', columns: groupCols, rows: group((p) => (p.team.length ? p.team.map((m) => m.name) : ['Nobody'])) },
        /* (parity map, FB-077) 1.0's third grouping — the client's budget on the lead, in its four bands */
        { key: 'budgets', title: 'By budget range', help: `The client’s budget on the lead. ${daysHelp}`, empty: 'No project has a contract value yet.', columns: groupCols, rows: group((p) => [budgetBand(p.budgetMinor)], BAND_ORDER) },
      ],
    }
  }

  if (key === 'cashflow') {
    /* (pending modules S07) money in = the payments that brought money, and an overpayment's extra on its day; a payment from a credit moved none */
    const ins = i.projects.flatMap((p) => [...p.payments.filter((x) => !fromCredit(x)).map((x) => ({ day: x.paidOn, amount: x.amountMinor })),
      ...p.credits.filter((c) => !lowers(c) && c.status === 'issued').map((c) => ({ day: c.issuedAt, amount: c.amountMinor }))])
    const outs: { day: number; amount: number }[] = []
    const addOut = (c: CostSummary) => {
      for (const x of c.payouts) if (!x.reversedAt) outs.push({ day: x.paidOn, amount: x.amountMinor })
      for (const e of c.expenses) if (e.status === 'approved' && e.paidBy !== 'member') outs.push({ day: e.spentOn, amount: e.amountMinor })
    }
    for (const p of i.projects) { addOut(p.costs); for (const c of p.credits) if (c.refundMinor && c.refundedOn) outs.push({ day: c.refundedOn, amount: c.refundMinor }) }
    addOut(i.overhead)
    for (const x of i.commission.payouts) if (!x.reversedAt) outs.push({ day: x.paidOn, amount: x.amountMinor })
    const days = [...ins, ...outs].map((x) => x.day)
    const first = period === 'all' ? (days.length ? Math.min(...days) : i.now) : range.from
    const last = period === 'all' ? i.now : Math.min(range.to - 1, Math.max(range.from, i.now))
    const months: { from: number; to: number; label: string }[] = []
    for (let d = new Date(new Date(first).getFullYear(), new Date(first).getMonth(), 1); d.getTime() <= last && months.length < 36; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      months.push({ from: d.getTime(), to: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), label: d.toLocaleString('en-SG', { month: 'short', year: 'numeric' }) })
    }
    let running = 0
    /* (parity map, FB-075 — 1.0's monthly revenue against the year before) each month's money in beside the same month a year earlier, and the
       change — a column, no chart; a month with nothing a year before has no change to show */
    const yearBack = (t: number) => { const d = new Date(t); return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()).getTime() }
    const changeWords = (now: number, then: number) => { if (!then) return null; const c = pct1(((now - then) / then) * 100); return `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}%` }
    const monthRows: ReportRow[] = months.map((m) => {
      const a = sum(ins.filter((x) => inRange(x.day, m)), (x) => x.amount), b = sum(outs.filter((x) => inRange(x.day, m)), (x) => x.amount)
      const ly = sum(ins.filter((x) => inRange(x.day, { from: yearBack(m.from), to: yearBack(m.to) })), (x) => x.amount)
      running += a - b
      return { id: String(m.from), tone: a - b < 0 ? 'red' as const : undefined, toneKey: 'net', cells: { month: m.label, in: a, lastYear: ly, change: changeWords(a, ly), out: b, net: a - b, running } }
    })
    const totIn = sum(monthRows, (r) => Number(r.cells.in)), totOut = sum(monthRows, (r) => Number(r.cells.out)), totLy = sum(monthRows, (r) => Number(r.cells.lastYear))
    /* the next 90 days: what is due in (sent invoices' balances) and out (vendors' balances), by when */
    const ahead = [{ label: 'Overdue now', from: -Infinity, to: i.now }, { label: 'Next 30 days', from: i.now, to: i.now + 30 * DAY }, { label: '31–60 days', from: i.now + 30 * DAY, to: i.now + 60 * DAY }, { label: '61–90 days', from: i.now + 60 * DAY, to: i.now + 90 * DAY }]
    const dueIn = i.projects.flatMap((p) => p.money.invoices.filter((v) => v.status === 'sent' && v.balanceMinor > 0).map((v) => ({ day: v.dueAt ?? i.now, amount: v.balanceMinor })))
    const dueOut: { day: number; amount: number }[] = []
    for (const c of [...i.projects.map((p) => p.costs), i.overhead]) {
      for (const po of c.pos) {
        if (po.balanceMinor <= 0) continue
        /* (simplify S-13) a PO with bills falls due on its bills' days (costsOf's rule) — what is not billed yet, when its next bill comes (from today) */
        const unpaid = po.billIds.map((id) => c.bills.find((b) => b.id === id)).filter((b): b is NonNullable<typeof b> => !!b && b.balanceMinor > 0)
        for (const b of unpaid) dueOut.push({ day: b.dueOn ?? i.now, amount: b.balanceMinor })
        const rest = Math.max(0, po.balanceMinor - sum(unpaid, (b) => b.balanceMinor))
        if (rest) dueOut.push({ day: po.billIds.length ? i.now : po.dueOn ?? i.now, amount: rest })
      }
      for (const b of c.bills) if (!b.poId && !b.waits && b.balanceMinor > 0) dueOut.push({ day: b.dueOn ?? i.now, amount: b.balanceMinor })   // (S44R, C8)
    }
    const within = (x: { day: number }, w: { from: number; to: number }) => x.day >= w.from && x.day < w.to
    return {
      ...base,
      tiles: [
        /* (the calm UI build 2026-10-27 — W-554, §2) money received is Collected — "Money in" is no longer a Finance list's name */
        { label: 'Collected', value: money2(totIn), help: `Client payments, ${range.label}` },
        { label: 'Paid out', value: money2(totOut), help: 'Vendors, claims, the studio’s expenses, commission, refunds' },
        { label: 'Net', value: money2(totIn - totOut), grade: totIn - totOut < 0 ? 'bad' : 'good' },
      ],
      tables: [
        { key: 'months', title: 'By month', help: 'What was collected beside the same month last year, and the change.', empty: 'No money moved in the period.', columns: [
          { key: 'month', label: 'Month', track: 'minmax(150px, 1fr)' }, { key: 'in', label: 'In', kind: 'money', track: '150px' },
          { key: 'lastYear', label: 'In, same month last year', kind: 'money', track: '200px' }, { key: 'change', label: 'Change', track: '110px' },
          { key: 'out', label: 'Out', kind: 'money', track: '150px' }, { key: 'net', label: 'Net', kind: 'money', track: '150px' }, { key: 'running', label: 'Running', kind: 'money', track: '150px' }],
          rows: monthRows, total: { id: 't', strong: true, cells: { month: 'Total', in: totIn, lastYear: totLy, change: changeWords(totIn, totLy), out: totOut, net: totIn - totOut, running: null } } },
        { key: 'ahead', title: 'The next 90 days', help: 'What is due to come in (sent invoices) and go out (POs and bills), by their due days.', empty: 'Nothing due.', columns: [
          { key: 'when', label: 'When', track: 'minmax(150px, 1fr)' }, { key: 'in', label: 'Due in', kind: 'money', track: '150px' }, { key: 'out', label: 'Due out', kind: 'money', track: '150px' }, { key: 'net', label: 'Net', kind: 'money', track: '150px' }],
          rows: ahead.map((w) => { const a = sum(dueIn.filter((x) => within(x, w)), (x) => x.amount), b = sum(dueOut.filter((x) => within(x, w)), (x) => x.amount); return { id: w.label, tone: a - b < 0 ? 'red' as const : undefined, toneKey: 'net', cells: { when: w.label, in: a, out: b, net: a - b } } }) },
      ],
    }
  }

  if (key === 'vendors') {
    const items = allCosts(i).filter((c) => c.vendorId && inRange(c.day, range))
    /* (parity map, FB-105) owed and overdue from the records themselves — `costsOf`'s byVendor rule (a PO's balance, a bill on no PO's) — so an
       entity's scope reads the same way; unscoped, the same figures as before */
    const owed = new Map<string, { owed: number; overdue: number }>()
    const owe = (vendorId: string, owedMinor: number, overdueMinor: number) => { const x = owed.get(vendorId) ?? { owed: 0, overdue: 0 }; x.owed += owedMinor; x.overdue += overdueMinor; owed.set(vendorId, x) }
    for (const c of [...i.projects.map((p) => p.costs), i.overhead]) {
      for (const po of c.pos) owe(po.vendorId, po.balanceMinor, po.overdueMinor)
      for (const b of c.bills) if (!b.poId && !b.waits) owe(b.vendorId, b.balanceMinor, b.overdueMinor)   // (S44R, C8)
    }
    const paid = new Map<string, number>()
    for (const c of [...i.projects.map((p) => p.costs), i.overhead]) for (const x of c.payouts) if (!x.reversedAt && x.vendorId && x.kind !== 'claim' && inRange(x.paidOn, range)) paid.set(x.vendorId, (paid.get(x.vendorId) ?? 0) + x.amountMinor)
    const ids = [...new Set([...items.map((c) => c.vendorId!), ...paid.keys(), ...[...owed.entries()].filter(([, v]) => v.owed).map(([k]) => k)])]
    const rows: ReportRow[] = ids.map((id) => {
      const v = i.vendors.find((x) => x.id === id)
      const mine = items.filter((c) => c.vendorId === id)
      const o = owed.get(id) ?? { owed: 0, overdue: 0 }
      return { id, href: `/company/finance/vendors?open=${encodeURIComponent(id)}`, tone: o.overdue ? 'red' as const : undefined, toneKey: 'owed',
        cells: { vendor: v?.name ?? 'A vendor', trade: v?.trade ?? null, pos: new Set(mine.filter((c) => c.kind === 'po').map((c) => c.id.split(':')[0])).size, committed: sum(mine, (c) => c.grossMinor), paid: paid.get(id) ?? 0, owed: o.owed } }
    }).sort((a, b) => Number(b.cells.committed) - Number(a.cells.committed))
    return {
      ...base,
      tiles: [
        { label: 'Vendors', value: String(rows.length), help: `With money in ${range.label}, or owed` },
        { label: 'Committed', value: money2(sum(rows, (r) => Number(r.cells.committed))), help: 'With GST, as the vendors charge it' },
        { label: 'Paid', value: money2(sum(rows, (r) => Number(r.cells.paid))) },
        { label: 'To pay', value: money2(sum(rows, (r) => Number(r.cells.owed))), help: 'As it stands today' },   // (the calm UI build 2026-10-27 — W-386)
      ],
      tables: [{ key: 'vendors', title: 'By vendor', empty: 'No vendor spend in the period.', columns: [
        { key: 'vendor', label: 'Vendor', track: 'minmax(200px, 1.2fr)' }, { key: 'trade', label: 'Trade', track: 'minmax(140px, 1fr)' }, { key: 'pos', label: 'POs', kind: 'count', track: '90px' },
        { key: 'committed', label: 'Committed', kind: 'money', track: '150px' }, { key: 'paid', label: 'Paid', kind: 'money', track: '150px' }, { key: 'owed', label: 'To pay', kind: 'money', track: '150px' }],
        rows, total: { id: 't', strong: true, cells: { vendor: 'Total', trade: null, pos: sum(rows, (r) => Number(r.cells.pos)), committed: sum(rows, (r) => Number(r.cells.committed)), paid: sum(rows, (r) => Number(r.cells.paid)), owed: sum(rows, (r) => Number(r.cells.owed)) } } }],
    }
  }

  if (key === 'gst') {
    /* (parity map, FB-065 — 1.0 G-491's Tax report; REG-1307's "Tax report dropped" reversed) The GST of the period: on the invoices sent in it,
       less the credit notes issued in it (output tax) — and on the supplier bills, the POs not billed yet and the approved expenses dated in it
       (input tax); the net is what the return pays, or claims back. One set of numbers: each record's own GST, as its paper prints it — a PO's
       share of what it binds the studio to, the rest waiting on its bill. */
    type G = { id: string; day: number; kind: 'invoice' | 'credit' | 'bill' | 'po' | 'expense'; record: string; project: string; netMinor: number; gstMinor: number; entity: string | null; href: string }
    const g: G[] = []
    const pName = (p: ReportProject | null) => (p ? `${p.name} · ${p.number}` : 'Studio overhead')
    const costsG = (c: CostSummary, p: ReportProject | null) => {
      for (const b of c.bills) if (inRange(b.issuedOn, range) && !(b.waits && !b.poId)) g.push({ id: b.id, day: b.issuedOn, kind: 'bill',   /* (S44R, C8) its input tax once approved */ record: `Bill ${b.reference}`, project: pName(p), netMinor: b.subtotalMinor, gstMinor: b.gstMinor, entity: (b.poId ? c.pos.find((x) => x.id === b.poId)?.issuingEntity : p?.entity) ?? null, href: p ? `${href(p.id)}?open=${encodeURIComponent(b.id)}` : `/company/finance/money-out?kind=bills&open=${encodeURIComponent(b.id)}` })
      for (const po of c.pos) {
        if (!po.committedMinor || po.billIds.length || !po.gstMinor) continue
        const day = po.sentAt ?? po.createdAt
        if (!inRange(day, range)) continue
        const share = po.totalMinor ? po.committedMinor / po.totalMinor : 1
        g.push({ id: po.id, day, kind: 'po', record: `${po.number} · not billed yet`, project: pName(p), netMinor: Math.round(po.subtotalMinor * share), gstMinor: Math.round(po.gstMinor * share), entity: po.issuingEntity, href: p ? `${href(p.id)}?open=${encodeURIComponent(po.id)}` : `/company/finance/money-out?kind=purchase-orders&open=${encodeURIComponent(po.id)}` })
      }
      for (const e of c.expenses) if (e.status === 'approved' && e.gstMinor && inRange(e.spentOn, range)) g.push({ id: e.id, day: e.spentOn, kind: 'expense', record: `Expense · ${e.description}`, project: pName(p), netMinor: e.amountMinor - e.gstMinor, gstMinor: e.gstMinor, entity: e.issuingEntity ?? p?.entity ?? null, href: `/company/finance/money-out?kind=expenses&open=${encodeURIComponent(e.id)}` })
    }
    for (const p of i.projects) {
      for (const v of p.money.invoices) if (v.status === 'sent' && inRange(v.sentAt, range)) g.push({ id: v.id, day: v.sentAt!, kind: 'invoice', record: v.label ?? v.stageName, project: pName(p), netMinor: v.amountMinor - v.gstMinor, gstMinor: v.gstMinor, entity: v.issuingEntity, href: `${href(p.id)}?open=${encodeURIComponent(v.id)}` })
      for (const c of p.credits) if (c.status === 'issued' && lowers(c) && inRange(c.issuedAt, range)) g.push({ id: c.id, day: c.issuedAt, kind: 'credit', record: `${c.number} · on ${c.invoiceLabel}`, project: pName(p), netMinor: -(c.amountMinor - c.gstMinor), gstMinor: -c.gstMinor, entity: p.money.invoices.find((v) => v.id === c.invoiceId)?.issuingEntity ?? null, href: `${href(p.id)}?open=${encodeURIComponent(c.id)}` })
      costsG(p.costs, p)
    }
    costsG(i.overhead, null)
    const of = (k: G['kind']) => g.filter((x) => x.kind === k)
    const line = (id: string, label: string, xs: G[], to: string): ReportRow => ({ id, href: to, cells: { line: label, count: xs.length, net: sum(xs, (x) => x.netMinor), gst: sum(xs, (x) => x.gstMinor) } })
    /* each line opens its list: Company › Finance › Money in (invoices · credit notes) and Money out (bills · POs · expenses) */
    const outRows = [line('invoices', 'GST on invoices sent', of('invoice'), moneyInHref('invoices')), line('credits', 'Less GST on credit notes issued', of('credit'), moneyInHref('credits'))].filter((r) => r.cells.count)
    const inRows = [line('bills', 'GST on supplier bills', of('bill'), moneyOutHref('bills')), line('pos', 'GST on POs not billed yet', of('po'), moneyOutHref('purchase-orders')), line('expenses', 'GST on expenses', of('expense'), moneyOutHref('expenses'))].filter((r) => r.cells.count)
    const output = sum([...of('invoice'), ...of('credit')], (x) => x.gstMinor)
    const input = sum([...of('bill'), ...of('po'), ...of('expense')], (x) => x.gstMinor)
    const net = output - input
    const cols: ReportColumn[] = [{ key: 'line', label: 'Line', track: 'minmax(260px, 1fr)' }, { key: 'count', label: 'Records', kind: 'count', track: '110px' }, { key: 'net', label: 'Before GST', kind: 'money', track: '170px' }, { key: 'gst', label: 'GST', kind: 'money', track: '150px' }]
    const options = i.entities ?? []
    const byEntity: ReportRow[] = options.length >= 2 && !i.scope ? options.map((o) => {
      const mine = g.filter((x) => matchesEntity(x.entity, o, options))
      const out = sum(mine.filter((x) => x.kind === 'invoice' || x.kind === 'credit'), (x) => x.gstMinor), inp = sum(mine.filter((x) => x.kind !== 'invoice' && x.kind !== 'credit'), (x) => x.gstMinor)
      return { id: o.key, cells: { entity: o.label, output: out, input: inp, net: out - inp } }
    }) : []
    const KIND: Record<G['kind'], string> = { invoice: 'Invoice', credit: 'Credit note', bill: 'Bill', po: 'PO', expense: 'Expense' }
    return {
      ...base,
      tiles: [
        { label: 'Output tax', value: money2(output), help: `GST charged on invoices sent in ${range.label}${of('credit').length ? ', less credit notes' : ''}` },
        { label: 'Input tax', value: money2(input), help: 'GST paid on bills, POs not billed yet and expenses' },
        { label: net >= 0 ? 'Net GST to pay' : 'Net GST to claim back', value: money2(Math.abs(net)), help: net >= 0 ? 'Output tax less input tax' : 'More GST was paid than charged' },
      ],
      tables: [
        { key: 'output', title: 'GST you charged', help: 'Each line opens its list.', columns: cols, rows: outRows, total: { id: 't', strong: true, cells: { line: 'Output tax', count: null, net: sum(outRows, (r) => Number(r.cells.net)), gst: output } }, empty: 'No invoice sent in the period.' },
        { key: 'input', title: 'GST you paid', help: 'A PO’s GST counts here until its bill comes — the bill then carries it.', columns: cols, rows: inRows, total: { id: 't', strong: true, cells: { line: 'Input tax', count: null, net: sum(inRows, (r) => Number(r.cells.net)), gst: input } }, empty: 'No bill, PO or expense with GST in the period.' },
        ...(byEntity.length ? [{ key: 'entities', title: 'By issuing entity', help: 'Each entity files its own return.', empty: 'No GST in the period.', columns: [
          { key: 'entity', label: 'Issued by', track: 'minmax(220px, 1fr)' }, { key: 'output', label: 'Output tax', kind: 'money' as const, track: '160px' }, { key: 'input', label: 'Input tax', kind: 'money' as const, track: '160px' }, { key: 'net', label: 'Net', kind: 'money' as const, track: '160px' }],
          rows: byEntity, total: { id: 't', strong: true, cells: { entity: 'Total', output, input, net } } }] : []),
        { key: 'records', title: 'Records', help: 'Every record in the period with its GST — each opens it.', empty: 'Nothing with GST in the period.', columns: [
          { key: 'record', label: 'Record', track: 'minmax(200px, 1.2fr)' }, { key: 'kind', label: 'Kind', track: '120px' }, { key: 'day', label: 'Date', kind: 'date', track: '130px' }, { key: 'project', label: 'Project', track: 'minmax(200px, 1.2fr)' },
          { key: 'net', label: 'Before GST', kind: 'money', track: '150px' }, { key: 'gst', label: 'GST', kind: 'money', track: '140px' }],
          rows: [...g].sort((a, b) => a.day - b.day).map((x) => ({ id: `${x.kind}:${x.id}`, href: x.href, cells: { record: x.record, kind: KIND[x.kind], day: x.day, project: x.project, net: x.netMinor, gst: x.gstMinor } })) },
      ],
    }
  }

  if (key === 'expenses') {
    /* (parity map, FB-076 — 1.0 G-491's Expenses report) Approved expenses dated in the period — the projects' and the studio's own — by category:
       how many, what they came to with GST, the GST in them, what members paid themselves and the studio pays back (claims), and the share. */
    const xs = [...i.projects.flatMap((p) => p.costs.expenses), ...i.overhead.expenses].filter((e) => e.status === 'approved' && inRange(e.spentOn, range))
    const total = sum(xs, (e) => e.amountMinor), gst = sum(xs, (e) => e.gstMinor)
    const claims = xs.filter((e) => e.paidBy === 'member')
    const claimed = sum(claims, (e) => e.amountMinor), paidBack = sum(claims, (e) => e.paidBackMinor)
    const cats = [...new Set(xs.map((e) => e.category || 'Other'))]
    const rows: ReportRow[] = cats.map((c) => {
      const mine = xs.filter((e) => (e.category || 'Other') === c)
      const t = sum(mine, (e) => e.amountMinor)
      return { id: c, href: '/company/finance/money-out?kind=expenses', cells: { category: c, count: mine.length, total: t, gst: sum(mine, (e) => e.gstMinor), claims: sum(mine.filter((e) => e.paidBy === 'member'), (e) => e.paidBackMinor), share: total ? pct1((t / total) * 100) : 0 } }
    }).sort((a, b) => Number(b.cells.total) - Number(a.cells.total))
    return {
      ...base,
      tiles: [
        { label: 'Total', value: money2(total), help: `${xs.length} approved expense${xs.length === 1 ? '' : 's'} in ${range.label}, with GST` },
        { label: 'GST paid', value: money2(gst), help: 'In those expenses — it counts in GST’s input tax' },
        { label: 'Reimbursements', value: money2(paidBack), help: claims.length ? `Paid back on ${claims.length} member claim${claims.length === 1 ? '' : 's'}${claimed - paidBack > 0 ? ` · ${money2(claimed - paidBack)} still to pay back` : ''}` : 'No member paid for one themselves' },
      ],
      tables: [{ key: 'categories', title: 'By category', help: 'Reimbursed: what the studio paid back to members who paid themselves. Each row opens Money out › Expenses.', empty: 'No approved expense in the period.', columns: [
        { key: 'category', label: 'Category', track: 'minmax(200px, 1.2fr)' }, { key: 'count', label: 'Expenses', kind: 'count', track: '110px' }, { key: 'total', label: 'Total', kind: 'money', track: '150px' },
        { key: 'gst', label: 'GST', kind: 'money', track: '140px' }, { key: 'claims', label: 'Reimbursed', kind: 'money', track: '150px' }, { key: 'share', label: 'Share', kind: 'pct', track: '100px' }],
        rows, total: { id: 't', strong: true, cells: { category: 'Total', count: xs.length, total, gst, claims: paidBack, share: total ? 100 : null } } }],
    }
  }

  if (key === 'commissions') {
    const lines = i.commission.summary.lines
    const paidIn = i.commission.payouts.filter((x) => !x.reversedAt && inRange(x.paidOn, range))
    const members = [...new Set(lines.map((l) => l.memberId))]
    const memberRows: ReportRow[] = members.map((m) => {
      const mine = lines.filter((l) => l.memberId === m)
      return { id: m, cells: { member: nameOf(i.people, m), projects: mine.filter((l) => l.earnedMinor || l.paidMinor).length, earned: sum(mine.flatMap((l) => l.entries).filter((e) => inRange(e.paidOn, range)), (e) => e.amountMinor), paid: sum(paidIn.filter((x) => x.memberId === m), (x) => x.amountMinor), owed: sum(mine, (l) => l.owedMinor) } }
    }).sort((a, b) => Number(b.cells.owed) - Number(a.cells.owed))
    const pName = (id: string) => i.projects.find((p) => p.id === id)?.name ?? 'A project'
    /* (parity map, FB-072 — 1.0's commissions by project: expected · actual · variance) Expected = today's rule × the contract (its chosen stages'
       shares of it, at their rates) × the member's share, before GST; Earned catches up as the client pays; Variance = earned − expected */
    const lineRows: ReportRow[] = lines.filter((l) => l.earnedMinor || l.paidMinor || l.expectedMinor).map((l) => ({ id: `${l.projectId}:${l.memberId}`, href: `/company/finance/commissions?open=${encodeURIComponent(`${l.projectId}:${l.memberId}`)}`,
      cells: { member: nameOf(i.people, l.memberId), project: pName(l.projectId), rule: l.words, expected: l.expectedMinor, earned: l.earnedMinor, variance: l.earnedMinor - l.expectedMinor, paid: l.paidMinor, owed: l.owedMinor } }))
    /* (parity map, FB-073 — 1.0's commission change log) every ask and every rate change in the period: when, who, which project (or the
       studio / a member everywhere), from → to, its status, who answered and their note — from the asks and the rules' versions */
    type Ch = { id: string; at: number; who: string; project: string; change: string; status: string; answeredBy: string | null; note: string | null }
    const changes: Ch[] = []
    const scopeName = (r: Pick<CommissionRuleRecord, 'memberId' | 'projectId'>) => r.projectId ? (r.memberId ? `${pName(r.projectId)} · ${nameOf(i.people, r.memberId)}` : pName(r.projectId)) : r.memberId ? `${nameOf(i.people, r.memberId)} · every project` : 'The studio · every project'
    const rules = [...(i.commission.rules ?? [])].sort((a, b) => a.createdAt - b.createdAt)
    const sameScope = (a: CommissionRuleRecord, b: CommissionRuleRecord) => a.memberId === b.memberId && a.projectId === b.projectId
    for (const r of rules) {
      const prev = rules.filter((x) => x !== r && sameScope(x, r) && x.createdAt <= r.createdAt && x.endedAt !== null && Math.abs(x.endedAt - r.createdAt) < 60_000).at(-1)
      if (inRange(r.createdAt, range)) changes.push({ id: `rule:${r.id}`, at: r.createdAt, who: nameOf(i.people, r.createdBy), project: scopeName(r), change: `${prev ? ruleWords(prev) : r.projectId || r.memberId ? 'The next rule up' : 'No rule'} → ${ruleWords(r)}`, status: r.requestId ? 'From an ask' : r.endedAt ? 'Replaced' : 'In force', answeredBy: null, note: null })
      /* ended with nothing after it in the same scope (a removed rate) */
      const next = rules.find((x) => x !== r && sameScope(x, r) && r.endedAt !== null && Math.abs(x.createdAt - r.endedAt) < 60_000)
      if (r.endedAt !== null && !next && inRange(r.endedAt, range)) changes.push({ id: `end:${r.id}`, at: r.endedAt, who: nameOf(i.people, r.endedBy ?? null), project: scopeName(r), change: `${ruleWords(r)} → removed — the next rule up applies`, status: 'Removed', answeredBy: null, note: null })
    }
    const ASK: Record<CommissionAsk['status'], string> = { open: 'Waiting for an answer', approved: 'Approved', declined: 'Declined', withdrawn: 'Withdrawn' }
    for (const a of i.commission.asks ?? []) {
      if (!inRange(a.createdAt, range) && !inRange(a.answeredAt, range)) continue
      const current = rules.filter((r) => inForceAt(r, a.createdAt) && (r.projectId === a.projectId || r.projectId === null) && (r.memberId === a.memberId || r.memberId === null))
        .sort((x, y) => rank(x, a) - rank(y, a))[0] ?? null
      const asked = ruleWords({ basis: a.basis, rateBp: a.rateBp, fixedMinor: a.fixedMinor })
      const got = a.status === 'approved' && (a.approvedRateBp != null || a.approvedFixedMinor != null) ? ` (approved at ${ruleWords({ basis: a.basis, rateBp: a.approvedRateBp ?? a.rateBp, fixedMinor: a.approvedFixedMinor ?? a.fixedMinor })})` : ''
      changes.push({ id: `ask:${a.id}`, at: a.createdAt, who: nameOf(i.people, a.memberId), project: `${pName(a.projectId)} · ${nameOf(i.people, a.memberId)}`, change: `Asked: ${ruleWords(current)} → ${asked}${got}`, status: ASK[a.status], answeredBy: a.answeredBy ? nameOf(i.people, a.answeredBy) : null, note: [a.reason ? `Why: ${a.reason}` : null, a.answerNote ? `Answer: ${a.answerNote}` : null].filter(Boolean).join(' · ') || null })
    }
    changes.sort((a, b) => b.at - a.at)
    const earned = sum(memberRows, (r) => Number(r.cells.earned)), paid = sum(memberRows, (r) => Number(r.cells.paid))
    return {
      ...base,
      tiles: [
        { label: 'Earned', value: money2(earned), help: `On payments in ${range.label}` },
        { label: 'Paid', value: money2(paid), help: `Paid out in ${range.label}` },
        { label: 'To pay', value: money2(i.commission.summary.owedMinor), help: 'As it stands today' },   // (the calm UI build 2026-10-27 — T-01) studio money still due
      ],
      tables: [
        { key: 'members', title: 'By member', empty: 'No commission in the period.', columns: [
          { key: 'member', label: 'Member', track: 'minmax(180px, 1fr)' }, { key: 'projects', label: 'Projects', kind: 'count', track: '110px' }, { key: 'earned', label: 'Earned', kind: 'money', track: '150px' },
          { key: 'paid', label: 'Paid', kind: 'money', track: '150px' }, { key: 'owed', label: 'To pay today', kind: 'money', track: '150px' }],
          rows: memberRows, total: { id: 't', strong: true, cells: { member: 'Total', projects: null, earned, paid, owed: i.commission.summary.owedMinor } } },
        { key: 'projects', title: 'By project', help: 'Since each project began. Expected: today’s rule on the whole contract, before GST — Variance is earned less expected, and closes as the client pays.', empty: 'No commission earned yet.', columns: [
          { key: 'member', label: 'Member', track: 'minmax(150px, 1fr)' }, { key: 'project', label: 'Project', track: 'minmax(220px, 1.4fr)' }, { key: 'rule', label: 'Rule', track: 'minmax(200px, 1.2fr)' },
          { key: 'expected', label: 'Expected', kind: 'money', track: '140px' }, { key: 'earned', label: 'Earned', kind: 'money', track: '140px' }, { key: 'variance', label: 'Variance', kind: 'money', track: '140px' },
          { key: 'paid', label: 'Paid', kind: 'money', track: '140px' }, { key: 'owed', label: 'To pay', kind: 'money', track: '140px' }],
          rows: lineRows },
        { key: 'changes', title: 'Changes', help: `Every ask for another rate and every rate set or removed in ${range.label}, newest first.`, empty: 'No commission change in the period.', columns: [
          { key: 'at', label: 'Date', kind: 'date', track: '130px' }, { key: 'who', label: 'Who', track: 'minmax(130px, 1fr)' }, { key: 'project', label: 'Applies to', track: 'minmax(220px, 1.4fr)' },
          { key: 'change', label: 'From → to', track: 'minmax(280px, 1.8fr)' }, { key: 'status', label: 'Status', track: '170px' }, { key: 'answeredBy', label: 'Answered by', track: 'minmax(130px, 1fr)' }, { key: 'note', label: 'Note', track: 'minmax(220px, 1.4fr)' }],
          rows: changes.map((c) => ({ id: c.id, cells: { at: c.at, who: c.who, project: c.project, change: c.change, status: c.status, answeredBy: c.answeredBy, note: c.note } })) },
      ],
    }
  }

  /* the client statement — one project's whole life */
  const p = i.projects.find((x) => x.id === o.projectId) ?? null
  if (!p) return { ...base, tiles: [], tables: [{ key: 'lines', title: 'Statement', empty: 'Pick a project.', columns: [{ key: 'line', label: 'Line' }], rows: [] }] }
  type L = { id: string; day: number; what: string; ref: string; charge: number; credit: number; href?: string }
  const ls: L[] = []
  for (const v of p.money.invoices) {
    if (!v.sentAt || !v.label) continue
    ls.push({ id: v.id, day: v.sentAt, what: `Invoice — ${v.stageName}`, ref: v.label, charge: v.amountMinor, credit: 0, href: `${href(p.id)}?open=${encodeURIComponent(v.id)}` })
    if (v.status === 'void' && v.voidedAt) ls.push({ id: `${v.id}:void`, day: v.voidedAt, what: `Invoice void — ${v.voidReason ?? ''}`.trim(), ref: v.label, charge: 0, credit: v.amountMinor })
  }
  /* (pending modules S07 — D-14) a payment from the client's credit moves no money: its line says where the credit went, with no figure (the
     overpayment's own line carried the money in) */
  for (const x of p.payments) ls.push(fromCredit(x)
    ? { id: x.id, day: x.paidOn, what: `Credit used — ${p.money.invoices.find((v) => v.id === x.invoiceId)?.label ?? ''}`.trim(), ref: x.reference ?? x.receipt ?? '', charge: 0, credit: 0 }
    : { id: x.id, day: x.paidOn, what: `Payment received — ${p.money.invoices.find((v) => v.id === x.invoiceId)?.label ?? ''}`.trim(), ref: x.receipt ?? x.reference ?? '', charge: 0, credit: x.amountMinor })
  for (const c of p.credits) {
    ls.push({ id: c.id, day: c.issuedAt, what: lowers(c) ? `Credit note — ${c.reason}` : `Paid beyond ${c.invoiceLabel} — kept as credit`, ref: c.number, charge: 0, credit: c.amountMinor })
    if (c.status === 'void' && c.voidedAt) ls.push({ id: `${c.id}:void`, day: c.voidedAt, what: 'Credit note void', ref: c.number, charge: c.amountMinor, credit: 0 })
    if (c.refundMinor && c.refundedOn) ls.push({ id: `${c.id}:refund`, day: c.refundedOn, what: 'Refund paid', ref: c.number, charge: c.refundMinor, credit: 0 })
  }
  ls.sort((a, b) => a.day - b.day)
  let bal = 0
  const rows: ReportRow[] = ls.map((l) => { bal += l.charge - l.credit; return { id: l.id, href: l.href, cells: { day: l.day, what: l.what, ref: l.ref, charge: l.charge || null, credit: l.credit || null, balance: bal } } })
  const charged = sum(ls, (l) => l.charge), credited = sum(ls, (l) => l.credit)
  return {
    ...base, title: `Statement — ${p.client}`,
    tiles: [
      { label: 'Invoiced', value: money2(sum(p.money.invoices.filter((v) => v.status === 'sent'), (v) => v.amountMinor)), help: `${p.name} · ${p.number}` },
      { label: 'Paid', value: money2(sum(p.payments.filter((x) => !fromCredit(x)), (x) => x.amountMinor) + sum(p.credits.filter((c) => !lowers(c) && c.status === 'issued'), (c) => c.amountMinor)) },   // (pending modules S07) what came in
      { label: 'Credited', value: money2(sum(p.credits.filter((c) => c.status === 'issued' && lowers(c)), (c) => c.amountMinor)) },
      { label: 'Balance', value: money2(bal), grade: bal > 0 ? 'warn' : undefined, help: bal > 0 ? `${p.client} owes it` : bal < 0 ? 'The studio owes it back' : 'Settled' },
    ],
    tables: [{ key: 'lines', title: 'Statement of account', help: `${p.name} · ${p.number} — from the first invoice to today.`, empty: 'Nothing invoiced yet.', columns: [
      { key: 'day', label: 'Date', kind: 'date', track: '130px' }, { key: 'what', label: 'What', track: 'minmax(260px, 1.6fr)' }, { key: 'ref', label: 'Reference', track: 'minmax(140px, 1fr)' },
      { key: 'charge', label: 'Charged', kind: 'money', track: '140px' }, { key: 'credit', label: 'Paid or credited', kind: 'money', track: '160px' }, { key: 'balance', label: 'Balance', kind: 'money', track: '150px' }],
      rows, total: { id: 't', strong: true, cells: { day: null, what: 'Balance', ref: null, charge: charged, credit: credited, balance: bal } } }],
  }
}

const STAGE_WORDS: Record<string, string> = { setting_up: 'Setting up', in_progress: 'In progress', completed: 'Completed' }

/** A report as one sheet: each table's title, its head and its rows, a blank row between (the house Export's `buildTable`). */
export function reportSheet(r: Report): { head: string[]; body: string[][] } {
  const body: string[][] = []
  r.tables.forEach((t, k) => {
    if (k) body.push([])
    body.push([t.title])
    body.push(t.columns.map((c) => c.label))
    for (const row of [...t.rows, ...(t.total ? [t.total] : [])]) body.push(t.columns.map((c) => cellText(row.cells[c.key] ?? null, c.kind)))
  })
  return { head: [r.title], body }
}
