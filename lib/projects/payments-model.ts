/**
 * (Projects round 6 — F-10 · F-11 · F-12 · F-13 · F-14 · F-15 · F-18 · Q-48; the 1.0 inventory G §11, I §7c, M-254…M-257) Payments, pure and
 * client-safe: the words, the statuses and what counts, Settings › Projects › Payments (who confirms a client's payment, *Trust the client's
 * proof*, the receipt numbers), who may record, confirm and reverse, the checks a payment must pass and the WhatsApp reminder. The server
 * (lib/projects/payments.ts, app/projects/payment-actions.ts, app/portal/payment-actions.ts) and the screens read the same functions, so a
 * refusal reads the same on both.
 *
 * What counts toward an invoice's Paid: a Confirmed payment, and a client's proof that came while the trust switch was on (it counts at once
 * and still waits to be checked). A client's proof otherwise waits as To confirm and counts for nothing — 1.0 showed it in the same green as
 * money received (I-313); here it reads "Received, waiting for {studio} to confirm".
 */
import { runsMoney } from '@/lib/settings/roles'
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from './model'
import { worksOn } from './policy'

/* ── The words ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (F-10) How the money came — 1.0's six less Credit Card and GIRO (no card payments, F-15). */
export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'paynow', label: 'PayNow' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' },
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']
export const isPaymentMethod = (v: unknown): v is PaymentMethod => typeof v === 'string' && PAYMENT_METHODS.some((m) => m.value === v)
/** (pending modules S07 — D-14) A payment taken from the client's credit (an overpayment's credit note used on a later invoice): never a way
    anyone picks, so it is not in PAYMENT_METHODS. */
export const CREDIT_METHOD = 'credit'
export const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? (v === CREDIT_METHOD ? 'Credit note' : v)
/** The two a client chooses between on the portal (they say how they sent it; cash and cheques go by hand to the studio). */
export const CLIENT_METHODS = PAYMENT_METHODS.filter((m) => m.value === 'bank_transfer' || m.value === 'paynow')

export type PaymentStatus = 'to_confirm' | 'confirmed' | 'not_received' | 'reversed'
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { to_confirm: 'To confirm', confirmed: 'Confirmed', not_received: 'Not received', reversed: 'Reversed' }
export const PAYMENT_STATUS_TONE: Record<PaymentStatus, 'default' | 'green' | 'yellow' | 'red'> = { to_confirm: 'yellow', confirmed: 'green', not_received: 'red', reversed: 'default' }
export const isPaymentStatus = (v: unknown): v is PaymentStatus => typeof v === 'string' && v in PAYMENT_STATUS_LABEL
export type PaymentSource = 'studio' | 'client'

/** Counts toward the invoice's Paid: Confirmed, or a client's proof trusted on arrival. */
export const countsAsPaid = (p: { status: string; trusted: boolean }) => p.status === 'confirmed' || (p.status === 'to_confirm' && p.trusted)
/** Waiting for the confirmer without counting — the invoice reads "Payment to confirm" and is not overdue while it waits. */
export const isPending = (p: { status: string; trusted: boolean }) => p.status === 'to_confirm' && !p.trusted
/** Still to be checked by the confirmer — pending, or trusted and counted already. */
export const toConfirm = (p: { status: string }) => p.status === 'to_confirm'

/* ── Settings › Projects › Payments (F-11 · F-13, Q-48; 1.0's Payment Confirmation and trust mode, M-255 · M-256) ──────────────── */

export const PAYMENT_RULES_KEY = 'project_payments'
export const RECEIPT_NUMBERING_KEY = 'receipt_numbering'
/** Who confirms a client's payment: the project's designer (1.0's default), the studio's Owner, or one named member. */
export type Confirmer = 'designer' | 'owner' | 'member'
export const CONFIRMERS: { value: Confirmer; label: string; help: string }[] = [
  { value: 'designer', label: 'Assigned designer', help: 'The project’s designer; the Owner when it has none' },
  { value: 'owner', label: 'Studio owner', help: 'The Owner confirms every client’s payment' },
  { value: 'member', label: 'A member', help: 'One person confirms them all' },
]
export type PaymentRules = { confirmer: Confirmer; memberId: string | null; /** M-256: off by default — a proof never marks an invoice paid by itself */ trust: boolean }
export const DEFAULT_PAYMENT_RULES: PaymentRules = { confirmer: 'designer', memberId: null, trust: false }
export function parsePaymentRules(v: unknown): PaymentRules {
  const r = (v ?? {}) as Partial<Record<keyof PaymentRules, unknown>>
  const confirmer: Confirmer = r.confirmer === 'owner' || r.confirmer === 'member' ? r.confirmer : 'designer'
  const memberId = typeof r.memberId === 'string' && r.memberId ? r.memberId : null
  return { confirmer: confirmer === 'member' && !memberId ? 'designer' : confirmer, memberId: confirmer === 'member' ? memberId : null, trust: r.trust === true }
}
/** (F-13) `RCT-{YYYY}-{seq}` — the project numbers' model under its own key. */
export const DEFAULT_RECEIPT_NUMBERING: ProjectNumbering = { prefix: 'RCT', year: true, next: 0, digits: 3 }
export function parseReceiptNumbering(v: unknown): ProjectNumbering {
  const r = (v ?? {}) as Partial<Record<keyof ProjectNumbering, unknown>>
  const prefix = typeof r.prefix === 'string' ? r.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : ''
  return {
    prefix: prefix || DEFAULT_RECEIPT_NUMBERING.prefix,
    year: r.year === undefined ? DEFAULT_RECEIPT_NUMBERING.year : r.year === true,
    next: typeof r.next === 'number' && Number.isFinite(r.next) && r.next > 0 ? Math.floor(r.next) : 0,
    digits: typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : DEFAULT_RECEIPT_NUMBERING.digits,
  }
}
/** The number the next receipt takes, never below the highest already given under the prefix. */
export const nextReceiptNumber = (n: ProjectNumbering, numbers: string[], at: Date) => formatProjectNumber(n, nextProjectSeq(numbers, n), at)

/* ── Who may do what (F-16 · F-17 · F-18, Q-48; *Who may do what* rows in lib/settings/permissions.ts) ──────────────────────────── */

type Who = { id: string; role: string; teamIds: string[] }
/* (parity map, MI-007 — a deliberate change of these rules) Accounting records, confirms and reverses a client's payment on every project */
export const RECORD_RULE = 'Only the project’s team, Owners, Admins and Accounting record a payment'
export const CONFIRM_RULE = 'Only whoever confirms the studio’s payments, an Owner, an Admin or Accounting confirms a client’s payment'
export const REVERSE_RULE = 'Only an Owner, an Admin or Accounting reverses a payment'
export const PAYMENT_SETTINGS_RULE = 'Only Owners and Admins change the payment rules'

/** The project's team records the payments that reach it (confirmed on entry, F-11) — the Owners and Admins run every project, (parity
    map, MI-007) and Accounting keeps every project's books. */
export const recordsPayments = (viewer: Who, teamIds: readonly string[]) => runsMoney(viewer.role) || worksOn(viewer, teamIds)
/** (F-18) Reversing a confirmed payment is the Owners' and Admins' — (parity map, MI-007) and Accounting's. */
export const reversesPayments = (role: string) => runsMoney(role)

export type TeamMember = { id: string; role: string; active: boolean }
/**
 * (Q-48) Who is told when a client says they have paid, and whose "Needs my review" it lands in: the project's Designer(s) — else the
 * studio's Owner (1.0's fallback) —, the Owner, or the member Settings names (the Owner while that member is away or gone).
 */
export function confirmersOf(rules: PaymentRules, team: readonly TeamMember[], studio: readonly TeamMember[]): string[] {
  const owners = studio.filter((m) => m.active && m.role === 'Owner').map((m) => m.id)
  if (rules.confirmer === 'owner') return owners
  if (rules.confirmer === 'member') return rules.memberId && studio.some((m) => m.id === rules.memberId && m.active) ? [rules.memberId] : owners
  const designers = team.filter((m) => m.active && m.role === 'Designer').map((m) => m.id)
  return designers.length ? designers : owners
}
/** The confirmer, and every Owner and Admin (they run money, F-16), may confirm a client's payment or say it did not arrive — (parity map,
    MI-007 · FR-040: 1.0's verify) and Accounting, who is told of every one (app/projects/payment-actions.ts). */
export const confirmsPayments = (viewer: Pick<Who, 'id' | 'role'>, confirmerIds: readonly string[]) => confirmerIds.includes(viewer.id) || runsMoney(viewer.role)

/* ── The checks a payment passes, on the screen and on the server ────────────────────────────────────────────────────────────────── */

export const REFERENCE_MAX = 60
export const NOTE_MAX = 300
export const REASON_MAX = 300
/** A proof travels inside one object argument (F205), a picture sized to land or a PDF up to ~6 MB. */
export const PROOF_CAP = 8_000_000
export const PROOF_TYPES = 'image/jpeg,image/png,image/webp,image/heic,application/pdf'

/** Why an amount can't be recorded against what is still owed, or null. A client may not say they paid more than is due. (fix-D, D-14 →
    pending modules S07, D-14 as recommended) The studio records what arrived: more than is owed settles the invoice and the extra becomes the
    client's credit (`overpaidBy`, an overpayment's credit note) — only an invoice with nothing owed refuses it. */
export function amountProblem(amountMinor: number, owedMinor: number, o: { /** the studio's Record a payment — what arrived, the extra kept as credit */ studio?: boolean } = {}): string | null {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return 'Enter the amount paid'
  if (amountMinor > owedMinor) return owedMinor > 0 ? (o.studio ? null : `That’s more than the ${moneyWords(owedMinor)} still owed`) : 'Nothing is owed on this invoice'
  return null
}
/** (pending modules S07 — D-14) What a payment brings beyond what the invoice still owes (0 when it does not) — kept as the client's credit. */
export const overpaidBy = (amountMinor: number, owedMinor: number) => (owedMinor > 0 && amountMinor > owedMinor ? amountMinor - owedMinor : 0)
/** (pending modules S07) Record a payment's line under the amount when more came than is owed — two short lines in the field's column (the
    dialog's subtitle already says what is owed; the snackbar names the credit note). *(invented copy)* */
export const overpaidLine = (o: { extraMinor: number; client: string }) =>
  `${moneyWords(o.extraMinor)} more than is owed — it becomes ${o.client}’s credit, for a later invoice or a refund`
const moneyWords = (minor: number) => `S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)}`
/** The day the money moved: never in the future. Local midnight. (fix-D, D-32) A payment may come before the invoice went out — a deposit
    paid on signing — so a day before the send is kept (the dialog says it settles the invoice all the same). */
export function paidOnProblem(day: Date | null, o: { now: number; sentAt?: number | null }): string | null {
  if (!day) return 'Pick the day it was paid'
  const today = new Date(o.now); const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (day.getTime() > end) return 'That day hasn’t come yet'
  return null
}
/** (fix-D, D-32) A day before the invoice was sent — the dialog's note. */
export const paidBeforeSent = (day: Date | null, sentAt: number | null) => { if (!day || !sentAt) return false; const s = new Date(sentAt); return day.getTime() < new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime() }

/* ── Overdue (F-14) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000
/** Whole days past the due day (0 on the due day and before). Due = the day sent + the payment terms, a calendar day. */
export function daysOverdue(dueAt: number | null, now: number): number {
  if (!dueAt) return 0
  return Math.max(0, Math.floor((now - dueAt) / DAY))
}
/** "Payment overdue" · "2 payments overdue" — the listing's reason (Q-07's words). */
export const overdueReason = (n: number) => (n === 1 ? 'Payment overdue' : `${n} payments overdue`)

/* ── The WhatsApp reminder (F-14: one press drafts the client's message, opened on the press) ─────────────────────────────────── */

/** (REG-1056) `url` only when the client holds the portal; without it the reminder keeps its first line and the thanks. */
export function reminderMessage(o: { client: string; studio: string; stage: string; number: string; amount: string; due: string; url: string | null; /** (fix-D, D-25) past its due day — "was due", else "is due" */ late?: boolean }): string {
  const first = o.client.trim().split(/\s+/)[0] ?? o.client
  const head = `Hi ${first}, a reminder from ${o.studio}: the ${o.stage.toLowerCase()} payment (${o.number}, ${o.amount}) ${o.late === false ? 'is' : 'was'} due on ${o.due}.`
  return o.url ? `${head}\n\nIf you have paid already, thank you — tap “I have paid” on your page so we can match it. How to pay is there too: ${o.url}` : `${head}\n\nIf you have paid already, thank you.`
}
