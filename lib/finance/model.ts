/**
 * (gaps build F1 — money out: the costs, F1-Q4 · Q5 · Q7 · Q8 · Q10 · Q11 · Q12) The records of money out as every screen reads them, their
 * one word each, the words around them and the small arithmetic — pure and client-safe. The server loads the rows (lib/finance/queries.ts)
 * and hands them in as these records (times in ms); `costsOf` (lib/finance/costs.ts) adds them up — nothing else recomputes.
 */
import { money2 } from '@/lib/quotes/math'
import { payNowProxy } from '@/lib/projects/payments-paynow'   // pure: the PayNow QR's own reading of an ID (simplify round 2)
import { PO_TERMS, type PoTerms } from './rules'
import type { RepeatEvery } from './repeats'

const DAY = 86_400_000

/* ── Records ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type VendorRecord = {
  id: string; name: string; trade: string | null; contactName: string | null; phone: string | null; email: string | null; uen: string | null
  chargesGst: boolean; notes: string | null; isActive: boolean; mergedInto: string | null
  /** null for a viewer who may not see them (F1-Q3 — the Owners' and Admins') */
  bank: { bankName: string | null; accountName: string | null; accountNo: string | null; payNow: string | null } | null
  createdAt: number
  /** (pending modules S24) the Marketplace brand it is — its panel opens the brand's page */
  marketplaceBrandId?: string | null
  /** (S45B · H-UHD-2) A vendor who works on site — the studio's trades they do, how many sites they run at once, the studio's code for them;
      null while it isn't marked as one (lib/projects/contractors-model.ts) */
  contractor?: { trades: string[]; capacity: number; code: string | null } | null
}
export type PoLine = { id: string; description: string; category: string | null; qty: number; unit: string | null; unitMinor: number; amountMinor: number; quoteItemId: string | null; milestoneId: string | null }
export type PoStatus = 'draft' | 'sent' | 'closed' | 'cancelled'
export type AdvanceKind = 'none' | 'pct' | 'fixed'
export type VendorAnswer = 'accepted' | 'changes' | 'declined'
export type PoRecord = {
  id: string; projectId: string; vendorId: string; number: string; status: PoStatus; title: string | null
  subtotalMinor: number; gstMinor: number; totalMinor: number; chargesGst: boolean; gstRate: number
  advanceKind: AdvanceKind; advanceValue: number; advanceMinor: number
  terms: PoTerms; termsText: string | null; expectedOn: number | null; deliveryAddress: string | null; vendorNote: string | null; issuingEntity: string | null
  createdBy: string | null; createdAt: number; updatedAt: number | null
  submittedBy: string | null; submittedAt: number | null; reviewNote: string | null; reviewedBy: string | null; reviewedAt: number | null
  approvedBy: string | null; approvedAt: number | null; sentBy: string | null; sentAt: number | null; dueOn: number | null
  vendorToken: string | null; vendorViewedAt: number | null; vendorAnswer: VendorAnswer | null; vendorAnswerNote: string | null; vendorAnsweredAt: number | null
  answerVia: string | null; answerMarkedBy: string | null
  closedBy: string | null; closedAt: number | null; closeNote: string | null
  cancelledBy: string | null; cancelledAt: number | null; cancelReason: string | null
  lines: PoLine[]
  /** (parity map, MO-011) where the vendor sends its invoice — null = the letterhead's own (then the paper prints no "Invoice to") */
  billTo: string | null
  /** (parity map, MO-094 · PR-089) delivered — the late-delivery row ends */
  deliveredAt: number | null; deliveredBy: string | null
  /** (parity map, MO-038) a PO made elsewhere, recorded: its own number is `number`; its file a cost document; never on the vendor's link */
  external: boolean; externalRef: string | null; externalFileId: string | null
}
export type BillLine = { id: string; description: string; qty: number; unitMinor: number }
export type BillRecord = {
  id: string; projectId: string | null; vendorId: string; poId: string | null; reference: string; issuedOn: number; dueOn: number | null
  subtotalMinor: number; gstMinor: number; totalMinor: number; lines: BillLine[]; note: string | null; readFrom: string | null; readFields: string[]
  createdBy: string | null; createdAt: number
  /** its file (`cost_documents`), when it keeps one */ docId: string | null; docName: string | null
  /** (S44R — UAT row 361, call C8) why it waits for an Owner's or an Admin's OK before it is paid (null = it never waited), and the OK */
  approvalWhy: 'limit' | 'differs' | null; approvedBy: string | null; approvedAt: number | null
}
export type ExpenseStatus = 'pending' | 'approved' | 'sent_back'
export type ExpenseRecord = {
  id: string; projectId: string | null; vendorId: string | null; category: string; description: string; amountMinor: number; gstMinor: number; spentOn: number
  paidBy: 'studio' | 'member'; claimantId: string | null; status: ExpenseStatus; reviewNote: string | null; reviewedBy: string | null; reviewedAt: number | null
  note: string | null; createdBy: string | null; createdAt: number
  receipts: { id: string; name: string; mime: string; image: boolean }[]
  /** (parity map, MO-058) the issuing entity it is recorded under; null = the project's (or the studio's own) */
  issuingEntity: string | null
  /** (pending modules S06) its repeat — on a series' first expense: how often, the next day it logs, when (and by whom) it stopped; on one the
      rule logged: the first expense it repeats (`repeatOf`). All null on an expense that never repeated. lib/finance/repeats.ts */
  repeatEvery: RepeatEvery | null; repeatNext: number | null; repeatOf: string | null; repeatStoppedAt: number | null; repeatStoppedBy: string | null
}
export type PayoutKind = 'po' | 'bill' | 'claim'
export type PayoutRecord = {
  id: string; kind: PayoutKind; projectId: string | null; vendorId: string | null; memberId: string | null; poId: string | null; billId: string | null; expenseId: string | null
  amountMinor: number; advance: boolean; paidOn: number; method: string; reference: string | null; note: string | null
  createdBy: string | null; createdAt: number; reversedAt: number | null; reversedBy: string | null; reverseReason: string | null
  docId: string | null
}

/* ── A PO's one word (F1-Q5) ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PoState = 'draft' | 'awaiting' | 'sent_back' | 'sent' | 'accepted' | 'changes' | 'declined' | 'part_paid' | 'closed' | 'cancelled'
export const PO_STATE_LABEL: Record<PoState, string> = {
  draft: 'Draft', awaiting: 'Waiting for approval', sent_back: 'Sent back', sent: 'Sent', accepted: 'Accepted', changes: 'Changes asked', declined: 'Declined',
  part_paid: 'Part paid', closed: 'Closed', cancelled: 'Cancelled',
}
export type Tone = 'default' | 'green' | 'yellow' | 'red' | 'blue'
export const PO_STATE_TONE: Record<PoState, Tone> = {
  draft: 'default', awaiting: 'yellow', sent_back: 'yellow', sent: 'blue', accepted: 'green', changes: 'yellow', declined: 'red', part_paid: 'yellow', closed: 'green', cancelled: 'default',
}
export function poState(po: Pick<PoRecord, 'status' | 'submittedAt' | 'reviewNote' | 'vendorAnswer'>, paidMinor: number): PoState {
  if (po.status === 'cancelled') return 'cancelled'
  if (po.status === 'closed') return 'closed'
  if (po.status === 'draft') return po.submittedAt ? 'awaiting' : po.reviewNote ? 'sent_back' : 'draft'
  if (po.vendorAnswer === 'changes') return 'changes'
  if (po.vendorAnswer === 'declined') return 'declined'
  if (paidMinor > 0) return 'part_paid'
  return po.vendorAnswer === 'accepted' ? 'accepted' : 'sent'
}
/** From Sent on, a PO binds the studio (F1-Q13); a Draft, one waiting, sent back, answered with changes or a no, or cancelled binds nothing. */
export const binds = (s: PoState) => s === 'sent' || s === 'accepted' || s === 'part_paid' || s === 'closed'
/** What may be edited: a Draft (sent back too), and a sent PO the vendor answered with changes or a no — the edit puts it back to a Draft. */
export const editable = (s: PoState) => s === 'draft' || s === 'sent_back' || s === 'changes' || s === 'declined'

/* ── A bill's and an expense's one word ───────────────────────────────────────────────────────────────────────────────────────── */

export type BillState = 'awaiting' | 'unpaid' | 'part_paid' | 'paid' | 'overdue'
export const BILL_STATE_LABEL: Record<BillState, string> = { awaiting: 'Waiting for approval', unpaid: 'Unpaid', part_paid: 'Part paid', paid: 'Paid', overdue: 'Overdue' }
export const BILL_STATE_TONE: Record<BillState, Tone> = { awaiting: 'yellow', unpaid: 'default', part_paid: 'yellow', paid: 'green', overdue: 'red' }
/** (S44R, C8) A bill waits for its OK while it has a reason, no OK and nothing paid on it (a payment made before the rule is past the gate). */
export const billWaiting = (b: Pick<BillRecord, 'approvalWhy' | 'approvedAt'>, paidMinor: number) => !!b.approvalWhy && !b.approvedAt && paidMinor <= 0
/** (1.0 G-423, worked out, never stored) Paid when the payments reach the total; overdue past its due day; part paid; else unpaid.
    (S44R, C8) Waiting for approval comes first — nobody pays it until an Owner or an Admin says so. */
export function billState(b: Pick<BillRecord, 'totalMinor' | 'dueOn' | 'approvalWhy' | 'approvedAt'>, paidMinor: number, now: number): BillState {
  if (billWaiting(b, paidMinor) && b.totalMinor > 0) return 'awaiting'
  if (b.totalMinor > 0 && paidMinor >= b.totalMinor) return 'paid'
  if (b.totalMinor === 0) return 'paid'
  if (b.dueOn && now >= b.dueOn + DAY) return 'overdue'
  return paidMinor > 0 ? 'part_paid' : 'unpaid'
}

export type ExpenseState = 'pending' | 'sent_back' | 'approved' | 'to_pay_back' | 'paid_back'
export const EXPENSE_STATE_LABEL: Record<ExpenseState, string> = { pending: 'Waiting for approval', sent_back: 'Sent back', approved: 'Approved', to_pay_back: 'To pay back', paid_back: 'Paid back' }
export const EXPENSE_STATE_TONE: Record<ExpenseState, Tone> = { pending: 'yellow', sent_back: 'yellow', approved: 'green', to_pay_back: 'blue', paid_back: 'green' }
export function expenseState(e: Pick<ExpenseRecord, 'status' | 'paidBy' | 'amountMinor'>, paidBackMinor: number): ExpenseState {
  if (e.status === 'pending') return 'pending'
  if (e.status === 'sent_back') return 'sent_back'
  if (e.paidBy !== 'member') return 'approved'
  return paidBackMinor >= e.amountMinor ? 'paid_back' : 'to_pay_back'
}

/* ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (F1-Q11) The expense categories a studio starts with (invented copy) — (pending modules S06) its own list is kept on Settings › Finance ›
    Money out (lib/finance/expense-categories.ts); this is the default and Xero's hints. */
export const EXPENSE_CATEGORIES = ['Materials', 'Site supplies', 'Transport', 'Labour', 'Equipment', 'Meals', 'Office', 'Software', 'Marketing', 'Utilities', 'Other'] as const
export const isExpenseCategory = (v: string) => (EXPENSE_CATEGORIES as readonly string[]).includes(v)
/** (F1-Q12 = F-10's four) How money went out. */
export const PAY_OUT_METHODS: { value: string; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'paynow', label: 'PayNow' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' },
]
export const methodLabel = (m: string) => PAY_OUT_METHODS.find((x) => x.value === m)?.label ?? m
/* (simplify round 2 · F1 §6.9.3) A member's PayNow (`members.paynow`) — what the studio pays a claim or commission to. One reading of a PayNow ID
   for the whole app: `payNowProxy`, the one the PayNow QR is drawn from (a Singapore mobile, 8 or 9 first, or a UEN — 8 to 10 letters and digits
   ending in a letter). Kept bare: a mobile's eight digits, a UEN in capitals; shown grouped as a phone box shows its digits (REG-456). */
export const PAYNOW_MAX = 14
export const PAYNOW_MSG = 'Enter a mobile number or a UEN, e.g. 9123 4567 or 201912345K'   // invented copy (simplify round 2)
/** The PayNow to keep: '' for none, the bare ID, or null when it is neither a mobile nor a UEN. */
export function cleanPayNow(v: string | null | undefined): string | null {
  const raw = (v ?? '').replace(/\s+/g, '')
  if (!raw) return ''
  const p = payNowProxy(raw)
  return p ? (p.type === 'mobile' ? p.value.slice(-8) : p.value) : null
}
/** "9123 4567" for a mobile kept bare; anything else as kept. */
export const payNowShown = (v: string) => (/^\d{8}$/.test(v) ? `${v.slice(0, 4)} ${v.slice(4)}` : v)
/** (F1-Q5) How a vendor's yes given off the link is recorded. */
export const ANSWER_VIA: { value: string; label: string }[] = [
  { value: 'phone', label: 'On the phone' }, { value: 'whatsapp', label: 'On WhatsApp' }, { value: 'email', label: 'By email' }, { value: 'in_person', label: 'In person' },
]
export const viaWords = (via: string | null) => (!via || via === 'link' ? 'on the link' : (ANSWER_VIA.find((v) => v.value === via)?.label ?? via).replace(/^./, (c) => c.toLowerCase()))
export const termsLabel = (t: PoTerms, text: string | null) => (t === 'custom' ? (text?.trim() || 'As agreed') : PO_TERMS.find((x) => x.value === t)?.help.replace(/ — the usual$/, '') ?? t)
/** (F1-Q8) The payment due day a send works out: the send day + the terms' days; custom terms work out none. A day, local midnight. */
export function dueFromTerms(terms: PoTerms, sentAt: Date): Date | null {
  const days = PO_TERMS.find((t) => t.value === terms)?.days
  if (days === null || days === undefined) return null
  return new Date(sentAt.getFullYear(), sentAt.getMonth(), sentAt.getDate() + days)
}
/** (F1-Q8) The advance: a share of the total or a fixed amount, never more than the total. */
export function advanceOf(kind: AdvanceKind, value: number, totalMinor: number): number {
  if (kind === 'pct') return Math.min(totalMinor, Math.max(0, Math.round((totalMinor * value) / 100)))
  if (kind === 'fixed') return Math.min(totalMinor, Math.max(0, Math.round(value)))
  return 0
}
export const lineAmount = (qty: number, unitMinor: number) => Math.round(qty * unitMinor)
/** A PO's totals from its lines: GST added on top only when the vendor charges it (F1-Q7, 1.0 G-388 fixed). */
export function poTotals(lines: { qty: number; unitMinor: number }[], chargesGst: boolean, gstRate: number): { subtotalMinor: number; gstMinor: number; totalMinor: number } {
  const subtotalMinor = lines.reduce((s, l) => s + lineAmount(l.qty, l.unitMinor), 0)
  const gstMinor = chargesGst && gstRate > 0 ? Math.round((subtotalMinor * gstRate) / 100) : 0
  return { subtotalMinor, gstMinor, totalMinor: subtotalMinor + gstMinor }
}
/** GST inside an amount that already includes it (an expense's receipt). */
export const gstInside = (totalMinor: number, rate: number) => (rate > 0 ? Math.round((totalMinor * rate) / (100 + rate)) : 0)

export const LINES_MAX = 60
export const DESCRIPTION_MAX = 200
export const NOTE_MAX = 600
export const REASON_MAX = 300
export const REF_MAX = 40
export const NAME_MAX = 120
export const RECEIPTS_MAX = 5
/** A receipt or a bill's file: up to 8 MB (E's FILE_UPLOAD_MAX) as read in the browser. */
export const DOC_CAP = 8 * 1024 * 1024 * 1.37 + 100
export const DOC_TYPES = 'image/jpeg,image/png,image/webp,application/pdf'

/** (F1-Q5) Problems with a PO's lines, or null: at least one line with words and an amount; no line without words; quantities above zero. */
export function poLinesProblem(lines: { description: string; qty: number; unitMinor: number }[]): string | null {
  const used = lines.filter((l) => l.description.trim() || l.unitMinor)
  if (!used.length) return 'Add at least one line with what it is and its price'
  if (used.some((l) => !l.description.trim())) return 'Say what each line is'
  if (used.some((l) => !(l.qty > 0))) return 'Each line needs a quantity above zero'
  if (used.some((l) => l.unitMinor < 0)) return 'A line’s price can’t be below zero'
  if (used.length > LINES_MAX) return `Up to ${LINES_MAX} lines on one PO`
  return null
}

/** (F1-Q5 · Q9) The vendor's WhatsApp: the PO's number, the project's address, the total, the terms and the no-login link (opened on the press). */
export function poMessage(o: { vendor: string; contact: string | null; studio: string; number: string; where: string; total: number; terms: string; link: string; again?: boolean }): string {
  const first = (o.contact?.trim() || o.vendor).split(/\s+/)[0] ?? o.vendor
  const head = `Hi ${first}, ${o.studio} ${o.again ? 'has changed' : 'has sent you'} purchase order ${o.number}${o.where ? ` for ${o.where}` : ''}: ${money2(o.total)}, payment ${o.terms.replace(/^Paid /, '').toLowerCase()}.`
  return `${head}\n\nSee it, download it and accept it here: ${o.link}`
}
/** (F1-Q12) A claim paid back, in the member's words — the bell's line. */
export const claimPaidWords = (amount: number, what: string) => `${money2(amount)} for “${what}” is paid back`

/** A vendor's first contact name, else its name — what a message opens with. */
export const vendorFirst = (v: Pick<VendorRecord, 'contactName' | 'name'>) => (v.contactName?.trim() || v.name).split(/\s+/)[0] ?? v.name
/** Names are compared case-blind and space-blind (a duplicate vendor). */
export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\b(pte|ltd|llp|private|limited|co|company)\b\.?/g, '').replace(/[^a-z0-9]+/g, '')

/* ── (one-home N-16) The one vendor list ───────────────────────────────────────────────────────────────────────────────────────────
   The Price book item's Vendor and the quote lines' Vendor/Sub pick from Company › Finance › Vendors — type-ahead over the directory; a new
   name is added to it (F1-Q4: anyone adds a vendor), or, refused, kept as typed. A line or an item still names its vendor in words. */
/** A directory vendor as a picker reads it: active and not merged. */
export type VendorName = { id: string; name: string; trade: string | null }
export const vendorNameOf = (v: Pick<VendorRecord, 'id' | 'name' | 'trade'>): VendorName => ({ id: v.id, name: v.name, trade: v.trade })
export const byVendorName = (a: VendorName, b: VendorName) => a.name.localeCompare(b.name)
/** The directory's vendor a typed name means — the same words, case, spaces and "Pte Ltd" aside (`nameKey`) — else null. */
export const findVendor = (list: readonly VendorName[], name: string | null | undefined): VendorName | null => {
  const k = nameKey(name ?? '')
  return k ? list.find((v) => nameKey(v.name) === k) ?? null : null
}
/** The type-ahead: the vendors whose name or trade holds the typed words, any case — every one while nothing is typed. */
export const vendorMatches = (list: readonly VendorName[], query: string): VendorName[] => {
  const q = query.trim().toLowerCase()
  return q ? list.filter((v) => v.name.toLowerCase().includes(q) || (v.trade ?? '').toLowerCase().includes(q)) : [...list]
}
/** A typed name as the directory spells it, else as typed (trimmed) — null when empty. */
export const spellVendor = (list: readonly VendorName[], name: string | null | undefined): string | null => {
  const t = (name ?? '').trim()
  return t ? findVendor(list, t)?.name ?? t : null
}

/** (gaps build F2) A way of paying inside a sentence — "by bank transfer", "by PayNow" (a name keeps its capitals). */
export const methodInLine = (m: string) => (m === 'paynow' ? 'PayNow' : methodLabel(m).toLowerCase())

/* ── (parity map 2026-10-10) money out's missing pieces ─────────────────────────────────────────────────────────────────────────── */

/** (parity map, MO-094 · PR-089 — 1.0 `overdue-po`) How many days a PO's delivery is late: it binds the studio, is not closed, has an expected
    day that has passed (late from the day after it — the bills' rule) and nobody marked it delivered. 0 otherwise. A vendor's lateness is
    neutral (S-05) — never red. */
export function deliveryLateDays(po: Pick<PoRecord, 'expectedOn' | 'deliveredAt'>, state: PoState, now: number): number {
  if (!po.expectedOn || po.deliveredAt || !binds(state) || state === 'closed') return 0
  const d = new Date(po.expectedOn), n = new Date(now)
  const days = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY)
  return days >= 1 ? days : 0
}
/** (MO-094) "PO-2026-008 delivery is 3 days late" — the Needs you row's and the bell's title (1.0's "delivery overdue by n days"). */
export const lateDeliveryTitle = (number: string, days: number) => `${number} delivery is ${days} ${days === 1 ? 'day' : 'days'} late`   // invented copy (parity map, MO-094)
/** (MO-094) the same, as a row's sub-line: "Delivery is 3 days late". */
export const lateDeliveryWords = (days: number) => `Delivery is ${days} ${days === 1 ? 'day' : 'days'} late`
/** (MO-094) The WhatsApp the studio sends the vendor about a late delivery — opened on the press. */
export function lateDeliveryMessage(o: { vendor: string; contact: string | null; studio: string; number: string; expected: string; where: string }): string {
  const first = (o.contact?.trim() || o.vendor).split(/\s+/)[0] ?? o.vendor
  return `Hi ${first}, this is ${o.studio} about purchase order ${o.number}${o.where ? ` for ${o.where}` : ''} — the delivery was expected on ${o.expected}. When can we expect it?`   // invented copy (parity map, MO-094)
}
/** (MO-038) A PO made elsewhere is recorded with its own number — the reference the other system gave it. */
export const EXTERNAL_PO_WORDS = 'Recorded — made elsewhere'   // invented copy (parity map, MO-038; the recorded invoice's "Recorded — made outside OpenMaison")

/** (parity map, MO-027 — 1.0's Export CSV on the vendor's page) A PO's lines as a sheet: the head, the lines, then its totals. */
export function poSheet(po: Pick<PoRecord, 'lines' | 'subtotalMinor' | 'gstMinor' | 'gstRate' | 'totalMinor' | 'advanceMinor'>): { head: string[]; body: string[][] } {
  const m = (minor: number) => (minor / 100).toFixed(2)
  const head = ['Description', 'Trade', 'Qty', 'Unit', 'Unit price (S$)', 'Amount (S$)']
  const body = po.lines.map((l) => [l.description, l.category ?? '', String(l.qty), l.unit ?? '', m(l.unitMinor), m(l.amountMinor)])
  body.push(['Subtotal', '', '', '', '', m(po.subtotalMinor)])
  if (po.gstMinor) body.push([`GST (${po.gstRate}%)`, '', '', '', '', m(po.gstMinor)])
  body.push(['Total', '', '', '', '', m(po.totalMinor)])
  if (po.advanceMinor) body.push(['Advance, paid first', '', '', '', '', m(po.advanceMinor)])
  return { head, body }
}
