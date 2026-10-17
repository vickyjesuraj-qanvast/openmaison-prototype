/**
 * (gaps build B — M-04 and the report's 4-finance rows; 1.0 G-56 · G-131…134 · G-208…245 · G-226…227 · G-253…281) Money in, complete: the
 * invoices that are not a payment stage's — a variation order billed on its own, a one-off outside the stages (a reimbursement, an upgrade,
 * out-of-scope work), one recorded from elsewhere — and what every invoice now carries (a description, a note to the client, its own due day,
 * its reminders). Pure and client-safe: the words and the arithmetic the actions (app/projects/money-actions.ts), the Money tab and the papers
 * read, so a refusal and a figure read the same on both.
 */
import { money2 } from '@/lib/quotes/math'
import { displayDate } from '@/lib/format'
import { gstOf, type InvoiceLine, type InvoiceRecord } from './money'

/* ── One-off invoices (M-04 · 1.0 G-269: "Reason (for reporting)") ─────────────────────────────────────────────────────────────── */

export type OneOffReason = 'reimbursement' | 'upgrade' | 'out_of_scope' | 'other'
/** The reason chips, 1.0's four in 2.0's plain words (the report's: reimbursement, upgrade, out of scope). (invented copy for "Other") */
export const ONE_OFF_REASONS: { value: OneOffReason; label: string }[] = [
  { value: 'reimbursement', label: 'Reimbursement' }, { value: 'upgrade', label: 'Upgrade' }, { value: 'out_of_scope', label: 'Out of scope' }, { value: 'other', label: 'Other' },
]
export const isOneOffReason = (v: unknown): v is OneOffReason => ONE_OFF_REASONS.some((r) => r.value === v)
export const reasonLabel = (v: string | null | undefined) => ONE_OFF_REASONS.find((r) => r.value === v)?.label ?? 'One-off'

export const LINES_MAX = 30
export const TITLE_MAX = 120
export const DESCRIPTION_MAX = 300
export const NOTE_MAX = 500
export const REF_MAX = 40

/** A line's amount before GST: qty × unit price, to the cent. */
export const lineAmount = (l: Pick<InvoiceLine, 'qty' | 'unitMinor'>) => Math.round((Number.isFinite(l.qty) ? l.qty : 0) * (Number.isFinite(l.unitMinor) ? l.unitMinor : 0))
/** A one-off's totals: the lines before GST, GST on top at the project's rate when it is charged, the total the client pays. */
export function linesTotals(lines: Pick<InvoiceLine, 'qty' | 'unitMinor'>[], gstRate: number, chargeGst: boolean): { subtotalMinor: number; gstMinor: number; totalMinor: number } {
  const subtotalMinor = lines.reduce((s, l) => s + lineAmount(l), 0)
  const gstMinor = chargeGst && gstRate ? Math.round((subtotalMinor * gstRate) / 100) : 0
  return { subtotalMinor, gstMinor, totalMinor: subtotalMinor + gstMinor }
}
/** The lines as the server keeps them — trimmed, bounded, the empty ones dropped. */
export function cleanLines(v: unknown): InvoiceLine[] {
  const list = Array.isArray(v) ? v : []
  return list.slice(0, LINES_MAX).flatMap((x, i) => {
    const o = (x ?? {}) as Partial<Record<keyof InvoiceLine, unknown>>
    const description = typeof o.description === 'string' ? o.description.replace(/\s+/g, ' ').trim().slice(0, DESCRIPTION_MAX) : ''
    const qty = typeof o.qty === 'number' && Number.isFinite(o.qty) ? Math.round(o.qty * 100) / 100 : 1
    const unitMinor = typeof o.unitMinor === 'number' && Number.isFinite(o.unitMinor) ? Math.round(o.unitMinor) : 0
    if (!description && !unitMinor) return []
    return [{ id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : `l${i + 1}`, description, qty, unitMinor }]
  })
}
export function parseLines(v: string | null | undefined): InvoiceLine[] | null {
  if (!v) return null
  try { const l = cleanLines(JSON.parse(v)); return l.length ? l : null } catch { return null }
}
/* ── (parity map, MI-031 — 1.0's line grid on a stage invoice) A stage invoice itemised ─────────────────────────────────────────────── */

/** What an itemised stage invoice's lines must come to — the paper's line, its amount before GST (GST is split out of a stage, F-03) — and how
    far they are from it: more than 0 is left to itemise, less than 0 is itemised beyond the invoice. Within a cent they add up. */
export function itemiseGap(lines: Pick<InvoiceLine, 'qty' | 'unitMinor'>[], amountMinor: number, gstRate: number): number {
  const target = amountMinor - gstOf(amountMinor, gstRate)
  const gap = target - lines.reduce((s, l) => s + lineAmount(l), 0)
  return Math.abs(gap) <= 1 ? 0 : gap
}
/** The gap in the dialog's words: "S$174.31 left to itemise" · "S$20.00 more than the invoice" · null when they add up. (invented copy) */
export const itemiseWords = (gap: number) => (gap > 0 ? `${money2(gap)} left to itemise` : gap < 0 ? `${money2(-gap)} more than the invoice` : null)
/** Why an itemised stage invoice can't be sent as it stands — its lines no longer add up (its amount moved since: a variation order, a re-size,
    an edit) — or null. The server's `sendInvoice` and the screen read the same words. */
export function itemiseBlock(i: Pick<InvoiceRecord, 'kind' | 'lines' | 'amountMinor'>, gstRate: number): string | null {
  if ((i.kind ?? 'stage') !== 'stage' || !i.lines?.length) return null
  const gap = itemiseGap(i.lines, i.amountMinor, gstRate)
  return gap > 0 ? `Its lines leave ${money2(gap)} to itemise, so change them first` : gap < 0 ? `Its lines come to ${money2(-gap)} more than the invoice, so change them first` : null
}

/* ── (parity map, MI-035 — 1.0's "Have a PDF? Upload PDF") A one-off filled from an invoice's PDF ────────────────────────────────────── */

/** A note the invoice's text carries ("Notes: …", "Remarks: …") for the one-off's Note to the client — the label's line and the lines under it
    up to the bank, the totals or an amount — or null. Pure: the dialog reads the PDF's text in the browser (lib/pdf-text.ts), the bill reader
    (lib/finance/bill-reader.ts `readBill`) takes the lines and the due day, this the note. A rule, not a model: a stand-in for 1.0's AI read. */
export function noteFromText(lines: string[]): string | null {
  const LABEL = /^(notes?|remarks?|comments?|message)\b\s*[:\-–]?\s*/i
  const text = lines.map((l) => l.trim()).filter(Boolean)
  const at = text.findIndex((l) => LABEL.test(l))
  if (at < 0) return null
  const out = [text[at]!.replace(LABEL, '')]
  for (let k = at + 1; k < text.length && out.length < 4; k++) {
    const l = text[k]!
    if (/^(bank|account|acc\.?|paynow|swift|total|sub[\s-]?total|gst|thank|payment|signature)/i.test(l) || /\d{1,3}(?:,\d{3})*\.\d{2}/.test(l)) break
    out.push(l)
  }
  const note = out.join(' ').replace(/\s+/g, ' ').trim()
  return note ? note.slice(0, NOTE_MAX) : null
}

/** What is wrong with a one-off's lines, in the house words — or null. */
export function linesProblem(lines: InvoiceLine[]): string | null {
  if (!lines.length) return 'Add a line with what is billed'
  if (lines.some((l) => !l.description)) return 'Say what each line is for'
  if (lines.some((l) => l.qty <= 0)) return 'A line’s quantity is more than 0'
  if (lines.reduce((s, l) => s + lineAmount(l), 0) <= 0) return 'The invoice comes to S$0.00 — price its lines'
  return null
}

/* ── What an invoice is called, and its kind's words ─────────────────────────────────────────────────────────────────────────── */

/** The kind as a row's tag says it: "Variation order" · "One-off · Reimbursement" · "Recorded". */
export function kindWords(i: Pick<InvoiceRecord, 'kind' | 'reason' | 'stageRef'>): string {
  if (i.kind === 'variation' || i.stageRef.startsWith('vo:')) return 'Variation order'
  if (i.kind === 'external') return 'Recorded'
  if (i.kind === 'one_off') return `One-off · ${reasonLabel(i.reason)}`
  return 'Payment stage'
}
/** An invoice in a sentence's words: "the Mid-Project invoice", "the Permit fees invoice", "INV-2026-008". */
export const invoiceWords = (i: Pick<InvoiceRecord, 'stageName' | 'number' | 'externalRef'>) => i.number ?? i.externalRef ?? `the ${i.stageName} invoice`

/* ── Its own due day (item 4 · 1.0 G-227) ─────────────────────────────────────────────────────────────────────────────────────── */

export type DueMode = 'terms' | 'date' | 'handover'
/** The day a Draft would fall due if it went today: the day picked, the project's handover day (its target end), else the terms. */
export function dueOf(i: Pick<InvoiceRecord, 'dueMode' | 'dueOn'>, o: { sentAt: Date; termsDays: number; handoverDay: number | null }): Date {
  if (i.dueMode === 'date' && i.dueOn) return dayOf(new Date(i.dueOn))
  if (i.dueMode === 'handover' && o.handoverDay) return dayOf(new Date(o.handoverDay))
  return new Date(o.sentAt.getFullYear(), o.sentAt.getMonth(), o.sentAt.getDate() + o.termsDays)
}
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
/** A Draft's due words for its row and dialog: "Due 14 Oct ’26 — the day picked", "On handover day, 30 Nov ’26", "7 days after it’s sent". */
export function dueModeWords(i: Pick<InvoiceRecord, 'dueMode' | 'dueOn'>, o: { termsDays: number; handoverDay: number | null }): string {
  if (i.dueMode === 'date' && i.dueOn) return `Due ${displayDate(new Date(i.dueOn))}`
  if (i.dueMode === 'handover' && o.handoverDay) return `Due on handover day, ${displayDate(new Date(o.handoverDay))}`
  return o.termsDays === 0 ? 'Due on receipt' : `Due ${o.termsDays} day${o.termsDays === 1 ? '' : 's'} after it’s sent`
}

/* ── Chasing (item 10 · 1.0 G-63 · G-70) ──────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000
const days = (a: number, b: number) => { const d = (t: number) => { const x = new Date(t); return Math.round(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / DAY) }; return d(b) - d(a) }
const n = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`
/** A sent invoice's age, beside who sent it: "12 days ago", "today". */
export const sentAgo = (sentAt: number | null, now: number) => (sentAt == null ? null : days(sentAt, now) <= 0 ? 'today' : `${n(days(sentAt, now), 'day')} ago`)
/** Its due day against today, while something is owed: "due in 3 days" · "due today" · "4 days overdue". */
export function dueIn(dueAt: number | null, now: number): { words: string; late: boolean } | null {
  if (dueAt == null) return null
  const d = days(now, dueAt)
  if (d > 0) return { words: `due in ${n(d, 'day')}`, late: false }
  if (d === 0) return { words: 'due today', late: false }
  return { words: `${n(-d, 'day')} overdue`, late: true }
}
/** (parity map, MI-068 — 1.0 raised an escalation from the third logged reminder) After this many reminders an overdue invoice's step is a call:
    its row says so and offers Call {client}; Owners and Admins hear `invoice_reminded` once, on the third. */
export const CALL_AFTER_REMINDERS = 3
/** The client's number as a `tel:` link ("tel:+6597731968") — null without one. */
export const telHref = (phone: string | null | undefined) => { const d = (phone ?? '').replace(/\D/g, ''); return d.length >= 8 ? `tel:+65${d.slice(-8)}` : null }
/** "Reminded 2× · last 3 Oct" — the count of Remind on WhatsApp, read from its Activity lines. */
export const remindedWords = (count: number | undefined, last: number | null | undefined) => (count ? `Reminded ${count}×${last ? ` · last ${new Date(last).getDate()} ${new Date(last).toLocaleString('en-SG', { month: 'short' })}` : ''}` : null)

/* ── Remind the approver (item 11 · 1.0 G-226: once an hour per person) ───────────────────────────────────────────────────────── */

export const APPROVER_REMIND_GAP_MS = 60 * 60_000
/** Why this person may not remind the approvers again yet, or null. */
export function approverRemindBlock(last: number | null | undefined, now: number): string | null {
  if (!last || now - last >= APPROVER_REMIND_GAP_MS) return null
  const mins = Math.max(1, Math.ceil((APPROVER_REMIND_GAP_MS - (now - last)) / 60_000))
  return `You reminded them ${Math.max(1, Math.round((now - last) / 60_000))} min ago — again in ${mins} min`
}

/* ── Money warnings (item 8 · 1.0 G-441 · G-442) ──────────────────────────────────────────────────────────────────────────────── */

/** (1.0 G-441's critical step) Collection is raised when work done by the schedule runs this many points ahead of money collected. */
export const COLLECTION_TRAIL_POINTS = 30
/** (invented threshold, as WAIT_GRACE_DAYS) A stage's invoice ready to send for this many days is raised. (simplify P3 §6.8, the one readiness
    rule) From the day it is ready — Money's Needs you row and the listing's reason say it at once. */
export const READY_GRACE_DAYS = 0
/** How far collection trails the work, in points — or null when it does not (or there is nothing to read). */
export function collectionTrail(o: { progressPct: number; collectedMinor: number; contractMinor: number }): number | null {
  if (!o.contractMinor || o.progressPct <= 0) return null
  const collectedPct = Math.round((o.collectedMinor / o.contractMinor) * 100)
  const gap = o.progressPct - collectedPct
  return gap >= COLLECTION_TRAIL_POINTS ? gap : null
}
/** Days a Draft has been ready to send (0 on its first day). */
export const readyDays = (since: number | null, now: number) => (since == null ? 0 : Math.max(0, days(since, now)))

/** (item 5) The one sentence the bell and the band say for a stage's invoice ready to send. */
export const readySentence = (stage: string, amountMinor: number) => `${stage} invoice is ready to send — ${money2(amountMinor)}`
