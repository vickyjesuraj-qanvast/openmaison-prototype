/**
 * (gaps build F1 — money out: the costs, F1-Q3 · Q5 · Q6 · Q11 · Q12) Who may do what with the studio's costs, and Settings › Projects ›
 * Costs — pure and client-safe. The server actions (app/finance/actions.ts) and the screens read the same functions, so a refusal reads the
 * same on both. Owners and Admins run money (approve, pay, change vendors); the project's team prepares. (parity map, MO-098 — F-16 lifted)
 * Accounting keeps the books beside them: sees the figures and the bank details, records bills and expenses, pays out, changes a vendor — and
 * approves nothing (lib/settings/roles.ts).
 */
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { runsMoney, seesBooks } from '@/lib/settings/roles'
import { seesProfit, type CostSighted } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { worksOn } from '@/lib/projects/policy'
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from '@/lib/projects/model'

type Who = Pick<Viewer, 'id' | 'role' | 'teamIds'>

/* ── Settings › Finance › Costs ──────────────────────────────────────────────────────────────────────────────────────────────── */

export const COST_RULES_KEY = 'cost_rules'
export type PoTerms = 'cod' | 'net15' | 'net30' | 'net60' | 'custom'
export const PO_TERMS: { value: PoTerms; label: string; help: string; days: number | null }[] = [
  { value: 'cod', label: 'On sending', help: 'Paid as soon as the PO is sent (COD)', days: 0 },
  { value: 'net15', label: '15 days', help: 'Paid within 15 days of sending (Net 15)', days: 15 },
  { value: 'net30', label: '30 days', help: 'Paid within 30 days of sending (Net 30) — the usual', days: 30 },
  { value: 'net60', label: '60 days', help: 'Paid within 60 days of sending (Net 60)', days: 60 },
  { value: 'custom', label: 'Custom', help: 'In your own words — “50% upfront, 50% on delivery”', days: null },
]
export const isPoTerms = (v: unknown): v is PoTerms => PO_TERMS.some((t) => t.value === v)

/** (F1-Q6 · Q8 · Q11 · Q5) The studio's rules: POs over a limit need approval (on, S$5,000 incl. GST), expenses need approval (on), the usual
    terms (Net 30), and the PO numbers (`PO-{YYYY}-{seq}`, the quotes' numbering model). */
export type CostRules = { poApproval: boolean; poLimitMinor: number; expenseApproval: boolean; terms: PoTerms; numbering: ProjectNumbering
  /** (parity map, FB-097) the purchase order paper's own words and blocks */ paper: PoPaperLayout
  /** (S44R — UAT row 361, call C8, as recommended — her UAT ask 2026-10-15; REVERSES F1-Q10 "bills: no approval") A supplier bill waits for an
      Owner's or an Admin's OK before it is paid when it is over the PO approval limit with no PO, or when its PO's bills come to more than the
      PO by over `billTolerancePct` per cent. Every other bill is paid as before. On by default, at 10%. */
  billApproval: boolean; billTolerancePct: number }
export const DEFAULT_PO_NUMBERING: ProjectNumbering = { prefix: 'PO', year: true, next: 0, digits: 3 }

/** (parity map, FB-097 — 1.0's Accounts Setup › Document Templates › Purchase Order) What a PO prints besides its figures: a header note under
    its title, a terms block, an acceptance block for the vendor to sign, and the issuing entity's bank. Blank by default; the bank stays off —
    vendors bill the studio, not the other way round, 1.0's default. (pending modules S06 — REG-1580's call for Vicky, as recommended) The
    acceptance block is ON by default, as 1.0 printed it: a PO is the vendor's to accept (its link has Accept, the PO's word says Accepted), so
    the paper carries the place to sign — and once accepted it fills itself in. A studio that switched it off keeps it off. */
export type PoPaperLayout = { header: string; terms: string; acceptance: boolean; showBank: boolean }
export const PO_PAPER_TEXT_MAX = 600
export const PO_PAPER_TERMS_MAX = 2000
export const DEFAULT_PO_PAPER: PoPaperLayout = { header: '', terms: '', acceptance: true, showBank: false }
const paperText = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, max) : '')
export function parsePoPaper(v: unknown): PoPaperLayout {
  const r = (v ?? {}) as Partial<Record<keyof PoPaperLayout, unknown>>
  return { header: paperText(r.header, PO_PAPER_TEXT_MAX), terms: paperText(r.terms, PO_PAPER_TERMS_MAX), acceptance: r.acceptance === undefined ? DEFAULT_PO_PAPER.acceptance : r.acceptance === true, showBank: r.showBank === true }
}

export const DEFAULT_COST_RULES: CostRules = { poApproval: true, poLimitMinor: 500_000, expenseApproval: true, terms: 'net30', numbering: DEFAULT_PO_NUMBERING, paper: DEFAULT_PO_PAPER, billApproval: true, billTolerancePct: 10 }
/** (S44R, C8) How far over its PO a bill may come before it waits — 0 (any amount over) to 100 per cent. */
export const BILL_TOLERANCE_MAX = 100
export const PO_LIMIT_MAX_MINOR = 100_000_000   // S$1,000,000 — a limit above it is no limit

export function parseCostRules(v: unknown): CostRules {
  const r = (v ?? {}) as Partial<Record<keyof CostRules, unknown>>
  const n = (r.numbering ?? {}) as Partial<Record<keyof ProjectNumbering, unknown>>
  const prefix = typeof n.prefix === 'string' ? n.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : ''
  const limit = typeof r.poLimitMinor === 'number' && Number.isFinite(r.poLimitMinor) ? Math.round(r.poLimitMinor) : DEFAULT_COST_RULES.poLimitMinor
  return {
    poApproval: r.poApproval === undefined ? DEFAULT_COST_RULES.poApproval : r.poApproval === true,
    poLimitMinor: Math.min(PO_LIMIT_MAX_MINOR, Math.max(0, limit)),
    expenseApproval: r.expenseApproval === undefined ? DEFAULT_COST_RULES.expenseApproval : r.expenseApproval === true,
    terms: isPoTerms(r.terms) ? r.terms : DEFAULT_COST_RULES.terms,
    numbering: {
      prefix: prefix || DEFAULT_PO_NUMBERING.prefix,
      year: n.year === undefined ? DEFAULT_PO_NUMBERING.year : n.year === true,
      next: typeof n.next === 'number' && Number.isFinite(n.next) && n.next > 0 ? Math.floor(n.next) : 0,
      digits: typeof n.digits === 'number' && Number.isFinite(n.digits) ? Math.min(6, Math.max(0, Math.floor(n.digits))) : DEFAULT_PO_NUMBERING.digits,
    },
    paper: parsePoPaper(r.paper),
    billApproval: r.billApproval === undefined ? DEFAULT_COST_RULES.billApproval : r.billApproval === true,   // (S44R, C8)
    billTolerancePct: typeof r.billTolerancePct === 'number' && Number.isFinite(r.billTolerancePct) ? Math.min(BILL_TOLERANCE_MAX, Math.max(0, Math.round(r.billTolerancePct))) : DEFAULT_COST_RULES.billTolerancePct,
  }
}
/** The number the next PO takes, never below the highest already given under the prefix. */
export const nextPoNumber = (n: ProjectNumbering, numbers: string[], at: Date) => formatProjectNumber(n, nextProjectSeq(numbers, n), at)

/* ── Who may do what (the *Who may do what* rows in lib/settings/permissions.ts) ─────────────────────────────────────────────── */

/* (pending modules S06 — the Accounting role's open question 6, as recommended: 1.0's `managePOs` included accounting) Accounting raises POs
   on any project too — theirs over the limit or with an advance wait for an Owner or an Admin, as a Designer's do; approving stays runsStudio */
export const PO_RULE = 'Only the project’s team, their Managers, Owners, Admins and Accounting prepare its purchase orders'
export const PO_APPROVE_RULE = 'Only an Owner or an Admin approves a purchase order'
/* (parity map, MO-098 — a deliberate change of these rules) Accounting pays out, records bills (the studio's overhead too), logs a claim for
   someone, changes a vendor and sees every project's costs; approving stays an Owner's or an Admin's */
export const PAY_RULE = 'Only an Owner, an Admin or Accounting pays a vendor or a claim'
export const BILL_RULE = 'Only the project’s team, Owners, Admins and Accounting record its bills'
export const OVERHEAD_BILL_RULE = 'Only an Owner, an Admin or Accounting records the studio’s overhead bills'
export const EXPENSE_RULE = 'You log expenses on the projects you work on, or as the studio’s overhead'
export const EXPENSE_APPROVE_RULE = 'Only an Owner or an Admin approves an expense'
export const EXPENSE_CHANGE_RULE = 'Only whoever logged it changes an expense while it waits — Owners, Admins and Accounting until it is paid back'
export const CLAIM_FOR_RULE = 'Only an Owner, an Admin or Accounting logs a claim for someone else'
export const VENDOR_RULE = 'Only an Owner, an Admin or Accounting changes, deactivates or merges a vendor'
export const COST_SETTINGS_RULE = 'Only Owners and Admins change the cost rules'
/** (pending modules S06) A repeating expense's rhythm: whoever logged its first one, Owners, Admins and Accounting change or stop it. */
export const REPEAT_RULE = 'Only whoever logged it, an Owner, an Admin or Accounting changes or stops its repeat'   // invented copy (pending modules S06)
/** (pending modules S06) The studio's expense categories are a Settings rule — Owners and Admins. */
export const CATEGORIES_RULE = 'Only Owners and Admins change the expense categories'   // invented copy (pending modules S06)
export const COSTS_RULE = 'Only the project’s team, Owners, Admins and Accounting see its costs'
/** (parity map, MO-098) A PO made elsewhere and a PO's delivery are bookkeeping: the project's team, Owners, Admins and Accounting. */
export const PO_RECORD_RULE = 'Only the project’s team, Owners, Admins and Accounting record a PO made elsewhere or its delivery'

/** (F1-Q2, Q-20) The cost figures — the Costs tiles, a PO's margin against the quote, a vendor's balance — are the Owners' and Admins' —
    (parity map, MO-098) and Accounting's, who keeps the books. */
export const seesCostFigures = (v: Pick<Viewer, 'role'>) => seesBooks(v.role)
/** (pending modules S41b-1 — 1.0: "POs themselves still show vendor amounts … only the margin variance is hidden") A PO's margin against the
    quote — what the client pays for its lines beside it — is a margin: the books' and the Owner's cost switch (Who sees costs and margins). The
    totals and the vendors' balances above stay the books'. */
export const seesPoMargin = (v: CostSighted) => seesProfit(v)
/** (F1-Q3) The project's team prepares its POs (`worksOn`: its members, their Managers, Owners and Admins) — (pending modules S06) and
    Accounting, on every project (1.0's `managePOs`). */
export const preparesPo = (v: Who, teamIds: readonly string[]) => runsMoney(v.role) || worksOn(v, teamIds)
/** (F1-Q6) Whether this PO waits for an Owner or an Admin: while the rule is on, over the limit or with an advance — never theirs. */
export function poWaits(v: Pick<Viewer, 'role'>, rules: CostRules, po: { totalMinor: number; advanceMinor: number }): boolean {
  if (runsStudio(v.role) || !rules.poApproval) return false
  return po.totalMinor > rules.poLimitMinor || po.advanceMinor > 0
}
/** Why it waits, in words — the dialog's button and the PO's band. */
export function waitWhy(rules: CostRules, po: { totalMinor: number; advanceMinor: number }, money: (m: number) => string): string {
  if (po.advanceMinor > 0 && po.totalMinor <= rules.poLimitMinor) return 'It asks for an advance, so an Owner or an Admin approves it first'
  return `It is over ${money(rules.poLimitMinor)}, so an Owner or an Admin approves it first`
}
export const approvesPo = (role: string) => runsStudio(role)
/** (parity map, MO-094 · MO-038 · MO-098) A PO made elsewhere and a PO's delivery: whoever prepares the project's POs (Accounting among them). */
export const recordsPo = (v: Who, teamIds: readonly string[]) => preparesPo(v, teamIds)
/** (F1-Q12) Paying out — a PO, a bill, a claim — and reversing a payment out: Owners and Admins (parity map, MO-098: and Accounting). */
export const paysOut = (role: string) => runsMoney(role)
/** (F1-Q10) A project's bills: its team; the studio's overhead bills: Owners and Admins. `teamIds` null = overhead. (parity map, MO-098)
    Accounting records both. */
export const recordsBill = (v: Who, teamIds: readonly string[] | null) => runsMoney(v.role) || (teamIds !== null && worksOn(v, teamIds))
/** (F1-Q11) Anyone logs an expense — on a project they work on, or as the studio's overhead (`teamIds` null). (parity map, MO-098)
    Accounting on any project. */
export const logsExpense = (v: Who, teamIds: readonly string[] | null) => (teamIds === null ? true : runsMoney(v.role) || worksOn(v, teamIds))
/** (F1-Q11) Whether this member's expense waits for approval: while the rule is on, a Designer's or a Manager's. */
export const expenseWaits = (role: string, rules: Pick<CostRules, 'expenseApproval'>) => rules.expenseApproval && !runsStudio(role)
export const approvesExpense = (role: string) => runsStudio(role)

/* ── (S44R — UAT row 361, call C8, as recommended — her UAT ask 2026-10-15; REVERSES F1-Q10 "bills: no approval") A bill's OK ─────────────
   Approval only where it earns its place: a bill on no PO over the PO approval limit, or a bill that takes its PO's bills over the PO by more
   than the studio's tolerance (Settings › Finance › Money out). It waits for an Owner or an Admin in Finance › To do before anyone pays it; an
   Owner's or an Admin's own bill never waits (their recording is the OK, as their own PO is); a bill something is already paid on is past the
   gate. Every other bill is paid as before. */
export const BILL_APPROVE_RULE = 'Only an Owner or an Admin approves a bill'   // invented copy (S44R)
export type BillWaitWhy = 'limit' | 'differs'
export const approvesBill = (role: string) => runsStudio(role)
/** Why this bill waits, else null: `po` = its PO's total and what its other live bills already come to. */
export function billWaitWhy(v: Pick<Viewer, 'role'>, rules: Pick<CostRules, 'billApproval' | 'poLimitMinor' | 'billTolerancePct'>, bill: { totalMinor: number }, po: { totalMinor: number; otherBilledMinor: number } | null): BillWaitWhy | null {
  if (approvesBill(v.role) || !rules.billApproval) return null
  if (!po) return bill.totalMinor > rules.poLimitMinor ? 'limit' : null
  return billOverPo(rules, bill.totalMinor, po) > 0 ? 'differs' : null
}
/** How far the PO's bills, this one with them, come over what the tolerance allows (0 = within it). */
export function billOverPo(rules: Pick<CostRules, 'billTolerancePct'>, totalMinor: number, po: { totalMinor: number; otherBilledMinor: number }): number {
  const billed = po.otherBilledMinor + totalMinor
  return Math.max(0, billed - Math.round(po.totalMinor * (1 + rules.billTolerancePct / 100)))
}
/** A waiting bill's reason in words — To do's "What to know", the bill's panel and its bell row. (invented copy, S44R) */
export function billWaitWords(why: BillWaitWhy, o: { limitMinor: number; po?: { number: string; totalMinor: number; billedMinor: number } | null }, money: (m: number) => string): string {
  if (why === 'limit') return `Over ${money(o.limitMinor)}, on no PO`
  const po = o.po
  if (!po) return 'More than its PO'
  const over = po.billedMinor - po.totalMinor
  const pct = po.totalMinor > 0 ? Math.round((over / po.totalMinor) * 100) : 100
  return `Its bills come to ${money(over)} more than ${po.number} (${pct}% over)`
}
/** What a payment on a waiting bill is refused with — said where Pay would be, and by the server. (invented copy, S44R) */
export const BILL_WAITS_RULE = 'An Owner or an Admin approves this bill before it is paid'
/** (F1-Q4) Changing, deactivating and merging a vendor, and its bank details: Owners and Admins. Anyone adds one. (parity map, MO-098)
    Accounting too — they pay the vendor. */
export const changesVendor = (role: string) => runsMoney(role)
export const seesBank = (role: string) => seesBooks(role)
/** (parity map, MO-098) Changing someone else's bill or expense (before it is paid back): Owners, Admins and Accounting. An Owner's or an
    Admin's edit of a sent-back expense still approves it (app/finance/cost-actions.ts) — Accounting's never does. */
export const changesOthersCosts = (role: string) => runsMoney(role)
export const changesCostRules = (role: string) => runsStudio(role)
