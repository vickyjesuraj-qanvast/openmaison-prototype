/**
 * (Projects round 5 — F-02 · F-03 · F-04 · F-08 · F-09 · F-17; the 1.0 inventory G §7) ONE SET OF NUMBERS for a project's money. 1.0 had three
 * (the cockpit, the Overview card and the lists each defined billed, collected and cost their own way, G bottom line); here every surface —
 * the Money tab, the Overview's Money card, the listing's Contract value, the invoice page, the portal (round 6) — reads `moneyOf`, and
 * nothing recomputes. Pure and client-safe: the server loads the records (lib/projects/money-queries.ts) and hands them in.
 *
 * The model, as 1.0 had it (G-170…G-200), its faults left behind:
 * - Contract value = the signed quote's total (else the Won quote's, else a direct project's agreed value) + the variation orders the client
 *   approved. Totals include GST, as quotes do (F-02).
 * - Each payment stage bills its share of the contract value; GST is split OUT of the slice, never added on top (F-03).
 * - One invoice per stage, a Draft from the start. Sent and paid invoices never change; agreed shares never move. When the contract moves
 *   (a variation order approved) the unsent Drafts are re-sized by their shares — the rebalance (F-08). A Draft someone edited keeps its
 *   amount (it says why, F-09) and the others absorb the rest.
 * - Collected comes from round 6's payments (`payments`, filled by `moneyInputOf` from lib/projects/payments-records.ts): what counts, and a
 *   client's proof waiting for the confirmer (`pending` — it counts for nothing; the invoice reads Payment to confirm meanwhile).
 */
import { money2 } from '@/lib/quotes/math'

/** (F-09, 1.0 G-198) An amount within S$1 of the schedule is the schedule. */
export const VARIANCE_TOLERANCE_MINOR = 100

/* ── What the server hands in ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A payment stage as agreed: a row of the signed quote's Payment Schedule (`ref` its id), or the n-th share of a direct project's split. */
export type MoneyStage = { ref: string; name: string; pct: number; position: number; /** the quote row's words ("Upon signing") */ due: string | null; /** due on signing — the deposit */ onSigning: boolean
  /** (gaps build B, item 13 — 1.0's fee first) a fixed-amount stage ("Design fees S$3,000"): it bills this, and the shares split what is left */
  fixedMinor?: number | null }
/** (round 2) The milestone a stage is tied to — it falls due when the milestone starts or when it is done (`project_milestones.payment_due`). */
export type MoneyMilestone = { id: string; title: string; status: string; due: 'start' | 'end'; start: number; end: number
  /** (gaps build B, items 5 · 8) when it was marked done — an invoice due at its end is ready from then */ doneAt?: number | null }
export type VariationStatus = 'Draft' | 'Sent for Approval' | 'Approved' | 'Sent to Client' | 'Confirmed' | 'Signed'
export type MoneyVariation = {
  id: string; number: string; title: string; status: string; amountMinor: number
  createdAt: number; clientSentAt: number | null; confirmedAt: number | null; confirmedBy: string | null; confirmedVia: string | null
  /** (fix-D, D-33) the client's *Ask for a change* on its link — the ball is with the studio until it is revised */
  changeAskedAt?: number | null; changeAskedNote?: string | null
  /** (gaps build D, item 2 — M-07) the client's Decline on its link, their reason and the name they typed — the order is back with the studio */
  declinedAt?: number | null; declinedNote?: string | null; declinedBy?: string | null
  /** (parity map, MI-104) who made it — Owners, Admins and its maker delete it (`canDeleteQuote`) */ createdBy?: string | null
  /** (parity map, FB-012) the entity it is raised under — Company › Finance › Money in's *Issued by* scope */ issuingEntity?: string | null
}
export type InvoiceRecord = {
  id: string; stageRef: string; stageName: string; pct: number; position: number
  number: string | null; status: string; amountMinor: number; gstMinor: number; issuingEntity: string | null
  varianceReason: string | null; editedBy: string | null; editedAt: number | null
  submittedBy: string | null; submittedAt: number | null; reviewNote: string | null; reviewedBy: string | null; reviewedAt: number | null
  sentBy: string | null; sentAt: number | null; dueAt: number | null
  voidReason: string | null; voidedBy: string | null; voidedAt: number | null; replacesId: string | null
  createdAt: number
  /** (fix-D, D-02 · F-08) The contract it was raised on, stamped when it was sent — a sent invoice never changes, so neither does its paper. */
  issuedContractMinor?: number | null; issuedBaseMinor?: number | null; issuedVariationsMinor?: number | null
  /* (gaps build B) money in, complete — lib/projects/invoices-kinds.ts has the words and the arithmetic */
  /** stage · variation (a VO billed on its own) · one_off · external (recorded from elsewhere) */
  kind?: InvoiceKind
  variationId?: string | null
  /** a one-off's reason (reimbursement · upgrade · out_of_scope · other) */ reason?: string | null
  /** (item 3) what the client reads under the line, and a note at the paper's foot */ description?: string | null; clientNote?: string | null
  /** (items 2 · 3) a one-off's lines, priced before GST; `chargeGst` adds the GST on top */ lines?: InvoiceLine[] | null; chargeGst?: boolean | null
  /** (item 4) its own due day on a Draft: a day picked, or the project's handover day; null = the payment terms */ dueMode?: 'date' | 'handover' | null; dueOn?: number | null
  /** (item 9) recorded from elsewhere: its own number and its file */ externalRef?: string | null; externalFileId?: string | null
  /** (item 6) the no-login link's token; its entry in Files › Payments */ shareToken?: string | null; fileId?: string | null
  /** (item 13) a fixed-amount stage's amount */ fixedMinor?: number | null
  /** (item 10) Remind on WhatsApp, read from its Activity lines: how many times, and the last */ remindedCount?: number; lastRemindedAt?: number | null
}
export type InvoiceKind = 'stage' | 'variation' | 'one_off' | 'external'
/** (gaps build B, items 2 · 3) A one-off invoice's line — its price before GST. */
export type InvoiceLine = { id: string; description: string; qty: number; unitMinor: number }
/** (gaps build B) An invoice outside the payment stages and the contract value: a one-off, or one recorded from elsewhere that stands for no
    stage (`extra:<id>`). Counted in Invoiced / Collected / Outstanding, never in the contract, the allocation or "left to invoice". */
export const isOutsideContract = (i: Pick<InvoiceRecord, 'stageRef'>) => i.stageRef.startsWith('extra:')
/** (gaps build B, item 1) A variation order billed on its own (`vo:<quoteId>`): in the contract, its amount fixed — the Drafts give it back. */
export const isVariationBill = (i: Pick<InvoiceRecord, 'stageRef'>) => i.stageRef.startsWith('vo:')
/** (round 6) A payment against an invoice that counts (confirmed, or a client's proof trusted on arrival) — or, `pending`, a client's proof
    waiting for the confirmer: it counts for nothing, and the invoice reads "Payment to confirm" (never Overdue) while it waits. */
export type MoneyPayment = { invoiceId: string; amountMinor: number; pending?: boolean
  /** (fix-D, D-03) the day the money moved — a paid invoice says when it was paid in full */ paidOn?: number
  /** (fix-D, D-27) a client's proof that counts already (trust on) but the confirmer has not checked yet */ unchecked?: boolean
  /** (pending modules S07 — D-14) paid FROM a client's credit: the overpayment's credit note used on this invoice */ creditNoteId?: string | null }

/** (gaps build F2 — F2-Q9) A credit note against a sent invoice: issued ones lower what it is owed; a void one counts for nothing. `refundedMinor`
    is the refund recorded on it (paid beyond what the invoice was left owing). */
export type MoneyCredit = { id: string; invoiceId: string; number: string; amountMinor: number; gstMinor: number; status: 'issued' | 'void'; refundedMinor: number; issuedAt: number
  /** (pending modules S07 — D-14, as recommended) `overpayment`: what a client paid beyond what `invoiceId` owed, held as their credit — it lowers
      no invoice and carries no GST; it is used on a later invoice (a payment `from` it) or refunded. Absent = `credit`, the kind that lowers its invoice. */
  kind?: CreditKind; paymentId?: string | null }
export type CreditKind = 'credit' | 'overpayment'
/** (pending modules S07) An overpayment's credit as Money reads it: what it held, what was used on which invoice, what was refunded, what is left. */
export type HeldCredit = { id: string; number: string; invoiceId: string; amountMinor: number; usedMinor: number; refundedMinor: number; heldMinor: number; issuedAt: number
  usedOn: { invoiceId: string; amountMinor: number }[] }
/** (pending modules S07) What is left of an overpayment's credit: what it held less what was used and refunded, never below zero. */
export const heldOf = (c: Pick<MoneyCredit, 'amountMinor' | 'refundedMinor'>, usedMinor: number) => Math.max(0, c.amountMinor - usedMinor - (c.refundedMinor ?? 0))
export const isOverpayment = (c: { kind?: string | null }) => c.kind === 'overpayment'

export type MoneyInput = {
  baseMinor: number | null
  source: 'quote' | 'agreed' | null
  /** The base quote's GST rate in percent of the net (9), or 0 when it carries none — the fraction a slice's GST is split out by. */
  gstRate: number
  /** (S43D, F2-04 — 1.0's quotes/port Phase 9 §B.6) The GST inside the contract's own total as a rate on its net — `gstRate` unless the base
      quote's lines carry mixed rates (an "On behalf" line carries none, a line may carry another); a stage's bill splits out this, never more.
      Absent = `gstRate`. */
  contractGstRate?: number
  /** (S43D) each variation order's own, by its quote id — its bill splits out what the order holds (0 with its GST off). Absent = `gstRate`. */
  variationGstRates?: Record<string, number>
  stages: MoneyStage[]
  /** The milestone each stage is tied to, by the stage's ref. */
  milestones: Record<string, MoneyMilestone>
  variations: MoneyVariation[]
  invoices: InvoiceRecord[]
  payments?: MoneyPayment[]
  /** (gaps build B, item 8) when the project began (ms) — a deposit due on signing is ready from then */
  since?: number | null
  /** (gaps build F2 — F2-Q9) the project's credit notes */
  credits?: MoneyCredit[]
}

/* ── Small pure helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (F-03, 1.0 G-174) GST split out of an amount that already includes it. */
export function gstOf(totalMinor: number, rate: number): number {
  if (!rate || !totalMinor) return 0
  return Math.round((totalMinor * rate) / (100 + rate))
}
/** (S43D, F2-04 — 1.0's quotes/port Phase 9 §B.6) The rate a bill splits its GST out by: a variation order's bill its order's own; a stage's bill
    (made, edited, recorded or sent) the contract's own share; anything else the studio's rate (a one-off's GST is its own lines'). */
export function billGstRate(input: Pick<MoneyInput, 'gstRate' | 'contractGstRate' | 'variationGstRates'>, bill: { kind?: string | null; stageRef?: string | null; variationId?: string | null }): number {
  const vo = bill.variationId ?? (bill.stageRef?.startsWith('vo:') ? bill.stageRef.slice(3) : null)
  if (vo || bill.kind === 'variation') return (vo ? input.variationGstRates?.[vo] : undefined) ?? input.gstRate
  if (!bill.stageRef || bill.stageRef.startsWith('extra:') || bill.kind === 'one_off') return input.gstRate
  return input.contractGstRate ?? input.gstRate
}
/** A share of the contract value: round(contract × pct ÷ 100). */
export const shareOf = (contractMinor: number, pct: number) => Math.round((contractMinor * pct) / 100)
/** A variation order counts once the client approved it — Confirmed on its link or marked by the studio (F-07). */
export const isApprovedVariation = (status: string) => status === 'Confirmed' || status === 'Signed'
/** (parity map, MI-104 — 1.0's "Approved variation orders can't be deleted — revise first") Once the client approved it, a variation order is
    part of the contract: it is never deleted (deleting it dropped it from the contract with no re-size). A Draft, one waiting for approval,
    one with the client or one they declined still deletes, with Undo. (invented copy) */
export const VO_DELETE_RULE = 'An approved variation order stays on the contract — revise it to change it'
export const variationDeleteBlock = (status: string): string | null => (isApprovedVariation(status) ? VO_DELETE_RULE : null)
/** A variation order the client holds and has not answered: sent to them (REG-1075 — an order the studio's approver passed but nobody sent
    is not with the client; it reads "Approved — not sent" and waits on the studio, so Waiting on client never counts it). */
export const isWithClient = (status: string) => status === 'Sent to Client'
const isDraftStatus = (s: string) => s === 'draft'
const isVoid = (s: string) => s === 'void'

export type AllocEntry = { id: string; pct: number; amountMinor: number; locked: boolean }
/**
 * (F-08, 1.0 G-188) What each unlocked entry bills: the contract less what is locked (sent, or a Draft someone edited), shared among the
 * unlocked entries by their shares — the last absorbing the rounding. Below zero, every unlocked entry bills nothing (the excess is "to
 * credit"). Repeating it changes nothing.
 */
export function allocate(contractMinor: number, entries: AllocEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  const open = entries.filter((e) => !e.locked)
  if (!open.length) return out
  const rest = contractMinor - entries.filter((e) => e.locked).reduce((s, e) => s + e.amountMinor, 0)
  if (rest <= 0) { for (const e of open) out[e.id] = 0; return out }
  const weight = open.reduce((s, e) => s + Math.max(0, e.pct), 0)
  let given = 0
  open.forEach((e, i) => {
    const amount = i === open.length - 1 ? rest - given : Math.round(weight > 0 ? (rest * Math.max(0, e.pct)) / weight : rest / open.length)
    out[e.id] = amount
    given += amount
  })
  return out
}
/** The pool every allocation reads: the live (not void) invoices, a Draft locked once someone edited its amount. (gaps build B) Only what bills
    the contract: an invoice outside it (a one-off, one recorded for no stage) takes no part; a variation order billed on its own and a
    fixed-amount stage are always locked — the shares split what they leave. */
const poolOf = (invoices: InvoiceRecord[]): AllocEntry[] =>
  invoices.filter((i) => !isVoid(i.status) && !isOutsideContract(i)).sort((a, b) => a.position - b.position || a.createdAt - b.createdAt)
    .map((i) => ({ id: i.id, pct: i.pct, amountMinor: i.amountMinor, locked: !isDraftStatus(i.status) || !!i.varianceReason || isVariationBill(i) || i.fixedMinor != null }))

/** (F-09) What a Draft should bill by the schedule: the allocation with it unlocked (every other lock as it is). */
export function expectedFor(invoiceId: string, contractMinor: number, invoices: InvoiceRecord[]): number | null {
  const own = invoices.find((i) => i.id === invoiceId)
  if (own && own.fixedMinor != null) return own.fixedMinor   // (gaps build B, item 13) a fixed-amount stage bills its fixed amount
  if (own && (isOutsideContract(own) || isVariationBill(own))) return null   // not a share of anything
  const pool = poolOf(invoices)
  const me = pool.find((e) => e.id === invoiceId)
  if (!me) return null
  return allocate(contractMinor, pool.map((e) => (e.id === invoiceId ? { ...e, locked: false } : e)))[invoiceId] ?? null
}
/** (F-09) Is an amount off the schedule — more than S$1 either way? */
export const differs = (amountMinor: number, expectedMinor: number | null) => expectedMinor !== null && Math.abs(amountMinor - expectedMinor) > VARIANCE_TOLERANCE_MINOR

/** (F-08) The rebalance: each unsent, unedited Draft re-sized to its share of what the contract leaves. Only what changes is listed. */
export type RebalanceChange = { id: string; stageName: string; fromMinor: number; toMinor: number }
export function rebalancePlan(contractMinor: number, invoices: InvoiceRecord[]): RebalanceChange[] {
  const alloc = allocate(contractMinor, poolOf(invoices))
  return invoices.filter((i) => i.id in alloc && alloc[i.id] !== i.amountMinor).map((i) => ({ id: i.id, stageName: i.stageName, fromMinor: i.amountMinor, toMinor: alloc[i.id]! }))
}

/* ── Invoice states ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type InvoiceState = 'draft' | 'ready' | 'awaiting' | 'sent' | 'overdue' | 'part_paid' | 'paid' | 'void'
  | 'to_confirm'   // (round 6, Q-48) the client says they paid; the confirmer checks
  | 'credited'     // (gaps build F2 — F2-Q9) credit notes cover all of it, nothing paid
/** (pending modules S02 — MI-014) "95 lines" — the signed quote's size where its value is quoted from. */
export const linesWord = (n: number) => `${n} ${n === 1 ? 'line' : 'lines'}`
export const INVOICE_STATE_LABEL: Record<InvoiceState, string> = {
  draft: 'Draft', ready: 'Ready to send', awaiting: 'Waiting for approval', sent: 'Sent', overdue: 'Overdue', part_paid: 'Part paid', paid: 'Paid', void: 'Void',
  to_confirm: 'Payment to confirm',
  credited: 'Credited',
}
export const INVOICE_STATE_TONE: Record<InvoiceState, 'default' | 'green' | 'yellow' | 'red' | 'blue'> = {
  draft: 'default', ready: 'green', awaiting: 'yellow', sent: 'blue', overdue: 'red', part_paid: 'yellow', paid: 'green', void: 'default',
  to_confirm: 'yellow',
  credited: 'default',
}

const DAY = 86_400_000
/** (F-04) A stage tied to a milestone is ready to invoice when the milestone reaches its payment point: begun for a stage due at its start,
    done for one due at its end. A stage on no milestone is ready from the start only when it is due on signing (the deposit). */
export function stageReady(stage: Pick<MoneyStage, 'onSigning'>, milestone: MoneyMilestone | null | undefined): boolean {
  if (milestone) return milestone.due === 'start' ? milestone.status !== 'not_started' : milestone.status === 'done'
  return stage.onSigning
}
/** (F-04) The one word an invoice shows. Overdue = sent and past its due day; Part paid · Paid from round 6's payments; Payment to confirm
    while a client's proof waits for the confirmer (round 6 — the ball is in the studio's court, so it is never Overdue meanwhile). */
export function invoiceState(i: Pick<InvoiceRecord, 'status' | 'submittedAt' | 'dueAt' | 'amountMinor'>, o: { ready: boolean; paidMinor: number; now: number; toConfirmMinor?: number; /** (F2-Q9) issued credit notes */ creditedMinor?: number }): InvoiceState {
  if (isVoid(i.status)) return 'void'
  if (isDraftStatus(i.status)) return i.submittedAt ? 'awaiting' : o.ready ? 'ready' : 'draft'
  const credited = o.creditedMinor ?? 0
  if (o.paidMinor > 0 && o.paidMinor + credited >= i.amountMinor) return 'paid'
  if (credited > 0 && credited >= i.amountMinor) return 'credited'   // (gaps build F2 — F2-Q9) credited in full, nothing paid
  if (o.toConfirmMinor) return 'to_confirm'
  if (i.dueAt && o.now >= i.dueAt + DAY) return 'overdue'   // (fix-D, D-16) one word per state: a part-paid invoice past its due day is Overdue (its paid figure is the sub)
  if (o.paidMinor > 0) return 'part_paid'
  return 'sent'
}
/** (round 6, F-14) What is overdue on a sent invoice: past its due day, what is still owed less a client's proof waiting to be confirmed. */
export function overdueOf(i: Pick<InvoiceRecord, 'status' | 'dueAt' | 'amountMinor'>, o: { paidMinor: number; toConfirmMinor: number; now: number; /** (F2-Q9) */ creditedMinor?: number }): number {
  if (i.status !== 'sent' || !i.dueAt || o.now < i.dueAt + DAY) return 0
  return Math.max(0, i.amountMinor - (o.creditedMinor ?? 0) - o.paidMinor - o.toConfirmMinor)
}

/* ── The summary every surface reads ──────────────────────────────────────────────────────────────────────────────────────────── */

export type InvoiceView = InvoiceRecord & {
  state: InvoiceState
  paidMinor: number
  /** What is still owed on a sent invoice. */
  balanceMinor: number
  subtotalMinor: number
  /** A Draft's amount by the schedule (null once sent or void). */
  expectedMinor: number | null
  /** (F-09) How far a Draft's amount is off the schedule — 0 within S$1. */
  differsMinor: number
  milestone: MoneyMilestone | null
  /** (round 6) A client's proof waiting for the confirmer — counted for nothing yet. */
  toConfirmMinor: number
  /** (round 6, F-14) What is past its due day and still owed (0 when nothing is). */
  overdueMinor: number
  /** (fix-D, D-03) Paid in full: the day the last payment that settled it moved; null otherwise. */
  paidOn: number | null
  /** (fix-D, D-27) Counted already but not yet checked — a client's proof while *Trust the client's proof* is on. */
  uncheckedMinor: number
  /** (fix-D, D-02) The contract the paper prints: the one it was issued on (sent or void, stamped at send), else today's (a Draft). */
  basis: { contractMinor: number; baseMinor: number; variationsMinor: number; issued: boolean }
  /** (gaps build B) Outside the payment stages and the contract (a one-off, or recorded for no stage). */
  outside: boolean
  /** (gaps build B, item 9) What the invoice is called: its number, else a recorded invoice's own reference, else null (a Draft). */
  label: string | null
  /** (gaps build B, items 5 · 8) A Draft ready to send: since when (its milestone done or begun, the project's start for a deposit). */
  readySince: number | null
  /** (gaps build B, item 15) A stage invoice a variation order re-sized: its share of the signed quote (or agreed value) and the orders that
      moved it — the paper prints "Original → adjusted". Null when it bills its share of the base, or for any other kind. */
  adjustedFrom: { minor: number; variations: string[] } | null
  /** (gaps build F2 — F2-Q9) What its issued credit notes take off it, and what was paid beyond what it is left owing less the refunds recorded. */
  creditedMinor?: number; refundDueMinor?: number
}
export type StageView = MoneyStage & {
  /** Its share of today's contract value, and the GST inside it. */
  nominalMinor: number; gstMinor: number
  milestone: MoneyMilestone | null
  ready: boolean
  /** The stage's live invoice (not void) — one per stage. */
  invoice: InvoiceView | null
  /** Invoices on this stage that were voided, newest first. */
  voided: InvoiceView[]
}
export type VariationView = MoneyVariation & { approved: boolean; withClient: boolean; /** (fix-D, D-33) with the client, who asked for a change */ changeAsked: boolean
  /** (gaps build D, item 2) sent to the client, who declined it on its link — no longer waiting on them */ declined?: boolean
  /** (gaps build B, item 1) its own invoice, when it was billed on its own (not void) */ billedBy: { id: string; label: string | null; status: string } | null
  /** (gaps build B, item 1) approved, an addition, not billed on its own — *Bill this VO* offers it */ billable: boolean }
export type MoneySummary = {
  baseMinor: number | null
  source: 'quote' | 'agreed' | null
  gstRate: number
  /** (S43D, F2-04) the GST inside the contract's own total as a rate (`MoneyInput.contractGstRate`) — what a stage's lines are checked against */
  contractGstRate: number
  /** (S43D) each variation order's own (`MoneyInput.variationGstRates`) */
  variationGstRates: Record<string, number>
  /** The approved variation orders' sum (an omission is negative). */
  variationsMinor: number
  /** Base + approved variation orders, never below zero (1.0 G-171). */
  contractMinor: number
  /** Sent invoices (not void), whatever they have been paid. */
  invoicedMinor: number
  collectedMinor: number
  outstandingMinor: number
  /** Unsent Drafts — prepared, not owed (1.0's "Finance (4)" counted these as owed, G-17). */
  draftsMinor: number
  /** What the contract still leaves to invoice after the sent invoices. */
  leftMinor: number
  /** (F-09) What has been invoiced beyond the contract — an omission the Drafts could not absorb. No credit notes in this build. */
  toCreditMinor: number
  stages: StageView[]
  invoices: InvoiceView[]
  variations: VariationView[]
  /** The Drafts no longer add up to what the contract leaves — a rebalance would change them. */
  outOfStep: RebalanceChange[]
  readyCount: number
  awaitingCount: number
  withClient: VariationView[]
  /** (round 6) Past due and still owed, across the sent invoices; and the client's proofs waiting for the confirmer. */
  overdueMinor: number
  toConfirmMinor: number
  /** (fix-D, D-27) Collected already but not yet checked (trusted proofs). */
  uncheckedMinor: number
  /* (gaps build B) money in, complete */
  /** Sent invoices that bill the contract (stages, variation orders billed on their own, recorded for a stage) — what "left to invoice" and
      "to credit" read; `invoicedMinor` also counts the ones outside it. */
  contractInvoicedMinor: number
  /** Sent invoices outside the contract (one-offs, recorded for no stage). */
  outsideMinor: number
  /** Collected on the invoices that bill the contract only — what a refund or an over-collection is measured against (contract money with contract
      money); `collectedMinor` also counts what was paid on a one-off or a recorded invoice for no stage. */
  collectedContractMinor: number
  /** Every live invoice that is not a payment stage's: variation orders billed on their own, one-offs, recorded ones for no stage. */
  extras: InvoiceView[]
  /** (item 1) Approved additions not billed on their own. */
  billable: VariationView[]
  /** (item 1) Payment stages still a Draft — the rebalance carries an approved order's money into them; none left, it needs its own invoice. */
  stageDraftsLeft: number
  /** (gaps build F2 — F2-Q9) Issued credit notes in all, and what the client paid beyond what their invoices are left owing (refunds recorded taken off). */
  creditedMinor?: number; refundDueMinor?: number
  /** (pending modules S07 — D-14) the client's overpayments held as credit (issued ones), and what is left of them to use or refund */
  held?: HeldCredit[]; heldMinor?: number
}

/** (fix-D, D-06) A plan that only moves rounding cents between Drafts that already add up is not out of step — the last open Draft takes the
    odd cent, and which one is last changes as invoices go out. */
const centsOnly = (plan: RebalanceChange[]) => plan.every((c) => Math.abs(c.toMinor - c.fromMinor) <= 1) && plan.reduce((s, c) => s + c.toMinor - c.fromMinor, 0) === 0

export function moneyOf(input: MoneyInput, now: number): MoneySummary {
  /* (gaps build B, item 1) a variation order billed on its own — its live invoice, if any */
  const billOf = (voId: string) => input.invoices.find((i) => !isVoid(i.status) && isVariationBill(i) && (i.variationId === voId || i.stageRef === `vo:${voId}`)) ?? null
  const variations: VariationView[] = input.variations.map((v) => {
    const approved = isApprovedVariation(v.status)
    const bill = billOf(v.id)
    /* (gaps build D, item 2 — M-07) a declined order stays Sent to Client on the record but is back with the studio: never "with the client" */
    const declined = isWithClient(v.status) && !!v.declinedAt
    return { ...v, approved, withClient: isWithClient(v.status) && !declined, changeAsked: isWithClient(v.status) && !!v.changeAskedAt && !declined, declined,
      billedBy: bill ? { id: bill.id, label: bill.number, status: bill.status } : null, billable: approved && v.amountMinor > 0 && !bill }
  })
  const variationsMinor = variations.filter((v) => v.approved).reduce((s, v) => s + v.amountMinor, 0)
  const base = input.baseMinor ?? 0
  const contractMinor = Math.max(0, base + variationsMinor)
  const paidOf = (id: string) => (input.payments ?? []).filter((p) => p.invoiceId === id && !p.pending).reduce((s, p) => s + p.amountMinor, 0)
  const pendingOf = (id: string) => (input.payments ?? []).filter((p) => p.invoiceId === id && p.pending).reduce((s, p) => s + p.amountMinor, 0)   // (round 6)
  const uncheckedOf = (id: string) => (input.payments ?? []).filter((p) => p.invoiceId === id && !p.pending && p.unchecked).reduce((s, p) => s + p.amountMinor, 0)   // (fix-D, D-27)
  /* (gaps build F2 — F2-Q9) issued credit notes per invoice, and the refunds recorded on them */
  /* (pending modules S07 — D-14) an overpayment's credit lowers no invoice and its refund is its own: only the kind that lowers its invoice counts here */
  const lowers = (input.credits ?? []).filter((c) => !isOverpayment(c))
  const creditedOf = (id: string) => lowers.filter((c) => c.invoiceId === id && c.status === 'issued').reduce((s, c) => s + c.amountMinor, 0)
  const refundedOf = (id: string) => lowers.filter((c) => c.invoiceId === id).reduce((s, c) => s + (c.refundedMinor ?? 0), 0)
  const lastPaidOn = (id: string) => (input.payments ?? []).filter((p) => p.invoiceId === id && !p.pending && p.paidOn).reduce((m, p) => Math.max(m, p.paidOn ?? 0), 0) || null   // (fix-D, D-03)
  const stageOf = (ref: string) => input.stages.find((s) => s.ref === ref) ?? null
  /* (gaps build B, item 13) a fixed-amount stage bills its amount; the shares split what it leaves */
  const fixedTotal = input.stages.reduce((s, x) => s + Math.max(0, x.fixedMinor ?? 0), 0)
  const approvedVos = variations.filter((v) => v.approved)
  const views: InvoiceView[] = [...input.invoices].sort((a, b) => a.position - b.position || a.createdAt - b.createdAt).map((i) => {
    const outside = isOutsideContract(i)
    const extra = outside || isVariationBill(i)
    const stage = extra ? null : stageOf(i.stageRef)
    const milestone = extra ? null : input.milestones[i.stageRef] ?? null
    /* (gaps build B) an invoice outside the stages is ready the moment it is made — it waits on no milestone */
    const ready = extra ? true : stage ? stageReady(stage, milestone) : false
    const paidMinor = paidOf(i.id)
    const toConfirmMinor = isVoid(i.status) ? 0 : pendingOf(i.id)
    const draft = isDraftStatus(i.status)
    const expectedMinor = draft ? expectedFor(i.id, contractMinor, input.invoices) : null
    const stamped = !draft && i.issuedContractMinor != null
    const basis = stamped
      ? { contractMinor: i.issuedContractMinor!, baseMinor: i.issuedBaseMinor ?? i.issuedContractMinor!, variationsMinor: i.issuedVariationsMinor ?? 0, issued: true }
      : { contractMinor, baseMinor: base, variationsMinor, issued: false }
    const creditedMinor = isVoid(i.status) || isDraftStatus(i.status) ? 0 : creditedOf(i.id)   // (gaps build F2 — F2-Q9)
    const state = invoiceState(i, { ready, paidMinor, now, toConfirmMinor, creditedMinor })
    /* (gaps build B, item 15) "Original → adjusted": a stage's share of the base, when variation orders moved it (an edit with a reason says its own why) */
    const plainStage = !extra && i.fixedMinor == null && (i.kind ?? 'stage') !== 'external'
    const original = plainStage && basis.variationsMinor !== 0 && !i.varianceReason ? shareOf(Math.max(0, basis.baseMinor - fixedTotal), i.pct) : null
    const adjustedFrom = original !== null && Math.abs(i.amountMinor - original) > VARIANCE_TOLERANCE_MINOR
      ? { minor: original, variations: approvedVos.filter((v) => !basis.issued || (v.confirmedAt ?? 0) <= (i.sentAt ?? now)).map((v) => v.number) }
      : null
    const readySince = state !== 'ready' ? null : extra ? i.createdAt
      : milestone ? (milestone.due === 'end' ? milestone.doneAt ?? Math.min(now, milestone.end) : Math.min(now, milestone.start))
        : input.since ?? i.createdAt
    return {
      ...i,
      state,
      outside, label: i.number ?? i.externalRef ?? null, readySince, adjustedFrom,
      paidMinor,
      balanceMinor: isVoid(i.status) || draft ? 0 : Math.max(0, i.amountMinor - creditedMinor - paidMinor),   // (gaps build F2) less its credit notes
      creditedMinor, refundDueMinor: isVoid(i.status) || draft ? 0 : Math.max(0, paidMinor - Math.max(0, i.amountMinor - creditedMinor) - refundedOf(i.id)),
      subtotalMinor: i.amountMinor - i.gstMinor,
      expectedMinor,
      /* (fix-D, D-34) "Differs from the schedule" is an edit someone made, with its reason; a Draft off the schedule without one is out of step (the band) */
      differsMinor: draft && i.varianceReason && differs(i.amountMinor, expectedMinor) ? i.amountMinor - (expectedMinor ?? 0) : 0,
      milestone,
      toConfirmMinor,
      overdueMinor: overdueOf(i, { paidMinor, toConfirmMinor, now, creditedMinor }),
      paidOn: !isVoid(i.status) && !draft && paidMinor > 0 && paidMinor + creditedMinor >= i.amountMinor ? lastPaidOn(i.id) : null,
      uncheckedMinor: isVoid(i.status) ? 0 : uncheckedOf(i.id),
      basis,
    }
  })
  const live = views.filter((v) => !isVoid(v.status))
  const sent = live.filter((v) => !isDraftStatus(v.status))
  const invoicedMinor = sent.reduce((s, v) => s + v.amountMinor, 0)
  /* (gaps build B) what bills the contract, and what sits outside it */
  const contractInvoicedMinor = sent.filter((v) => !v.outside).reduce((s, v) => s + v.amountMinor, 0)
  const outsideMinor = invoicedMinor - contractInvoicedMinor
  const collectedMinor = sent.reduce((s, v) => s + Math.min(v.amountMinor, v.paidMinor), 0)
  const collectedContractMinor = sent.filter((v) => !v.outside).reduce((s, v) => s + Math.min(v.amountMinor, v.paidMinor), 0)   // (gaps build B)
  const draftsMinor = live.filter((v) => isDraftStatus(v.status)).reduce((s, v) => s + v.amountMinor, 0)
  /* (gaps build F2 — F2-Q9) credit notes: what they take off, on the contract's invoices too (the "to credit" figure) */
  const creditedMinor = sent.reduce((s, v) => s + (v.creditedMinor ?? 0), 0)
  const contractCreditedMinor = sent.filter((v) => !v.outside).reduce((s, v) => s + (v.creditedMinor ?? 0), 0)
  const isExtra = (v: InvoiceView) => v.outside || isVariationBill(v)
  const stages: StageView[] = [...input.stages].sort((a, b) => a.position - b.position).map((s) => {
    const nominalMinor = s.fixedMinor != null ? s.fixedMinor : shareOf(Math.max(0, contractMinor - fixedTotal), s.pct)   // (gaps build B, item 13)
    const milestone = input.milestones[s.ref] ?? null
    return {
      ...s, nominalMinor, gstMinor: gstOf(nominalMinor, input.contractGstRate ?? input.gstRate), milestone, ready: stageReady(s, milestone),   // (S43D, F2-04)
      invoice: live.find((v) => v.stageRef === s.ref) ?? null,
      voided: views.filter((v) => v.stageRef === s.ref && isVoid(v.status)).sort((a, b) => (b.voidedAt ?? 0) - (a.voidedAt ?? 0)),
    }
  })
  /* (pending modules S07 — D-14) each overpayment held as credit: used on later invoices (payments from it, the void ones' left out), refunded, left */
  const voidIds = new Set(input.invoices.filter((i) => isVoid(i.status)).map((i) => i.id))
  const held: HeldCredit[] = (input.credits ?? []).filter((c) => isOverpayment(c) && c.status === 'issued').map((c) => {
    const usedOn = (input.payments ?? []).filter((p) => p.creditNoteId === c.id && !p.pending && !voidIds.has(p.invoiceId)).map((p) => ({ invoiceId: p.invoiceId, amountMinor: p.amountMinor }))
    const usedMinor = usedOn.reduce((s, u) => s + u.amountMinor, 0)
    return { id: c.id, number: c.number, invoiceId: c.invoiceId, amountMinor: c.amountMinor, usedMinor, refundedMinor: c.refundedMinor ?? 0, heldMinor: heldOf(c, usedMinor), issuedAt: c.issuedAt, usedOn }
  })
  return {
    baseMinor: input.baseMinor, source: input.source, gstRate: input.gstRate, contractGstRate: input.contractGstRate ?? input.gstRate, variationGstRates: input.variationGstRates ?? {},
    variationsMinor, contractMinor, invoicedMinor, collectedMinor,
    /* (gaps build F2) what is still owed on each sent invoice, less its credit notes — the same figure as invoiced − collected while none is issued */
    outstandingMinor: sent.reduce((s, v) => s + v.balanceMinor, 0), draftsMinor,
    leftMinor: Math.max(0, contractMinor - contractInvoicedMinor),   // (gaps build B) what bills the contract — a one-off never "leaves" less of it
    toCreditMinor: Math.max(0, contractInvoicedMinor - contractCreditedMinor - contractMinor),   // (gaps build F2) a credit note issued takes it off
    creditedMinor, refundDueMinor: sent.reduce((s, v) => s + (v.refundDueMinor ?? 0), 0),
    held, heldMinor: held.reduce((s, h) => s + h.heldMinor, 0),   // (pending modules S07 — D-14)
    stages, invoices: views, variations,
    outOfStep: (() => { const plan = rebalancePlan(contractMinor, input.invoices); return centsOnly(plan) ? [] : plan })(),   // (fix-D, D-06)
    readyCount: live.filter((v) => v.state === 'ready' && !isExtra(v)).length,
    awaitingCount: live.filter((v) => v.state === 'awaiting').length,
    withClient: variations.filter((v) => v.withClient),
    overdueMinor: sent.reduce((s, v) => s + v.overdueMinor, 0),
    toConfirmMinor: sent.reduce((s, v) => s + v.toConfirmMinor, 0),
    uncheckedMinor: sent.reduce((s, v) => s + v.uncheckedMinor, 0),
    contractInvoicedMinor, outsideMinor, collectedContractMinor,
    extras: views.filter((v) => isExtra(v) && (!isVoid(v.status) || !!v.label)),   // a void one stays on the record once it had a number
    billable: variations.filter((v) => v.billable),
    stageDraftsLeft: live.filter((v) => !isExtra(v) && isDraftStatus(v.status)).length,
  }
}

/* ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const sgd = money2
/** A signed change: "+S$1,250.00" · "−S$800.00". */
export const signedMoney = (minor: number) => (minor > 0 ? `+${sgd(minor)}` : sgd(minor))

/* (simplify round 2, R2-A) `moneyStory` — the Money tab's old story sentence — is gone: its parts are Needs you rows and the To collect tile's
   lines since S-07, and nothing read it any more. */
const listOf = (names: string[]) => (names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and '))
/**
 * (F-08) The rebalance in one sentence — the snackbar's. It names what moved (REG-1067): the contract only when it did (`moved` — a variation
 * order approved), else the unsent invoices alone — the band's *Re-size them* never moves the contract, it brings the invoices back to it.
 */
export function rebalanceSentence(changes: RebalanceChange[], contractMinor: number, o: { moved?: boolean; /** (fix-D, D-17) how many unsent Drafts there are */ drafts?: number
  /** (gaps build B, item 1) the approved order no unsent invoice is left to carry — the sentence offers to bill it on its own */ bill?: string | null } = {}): string {
  const list = listOf(changes.map((c) => c.stageName))
  const verb = changes.length === 1 ? 'was' : 'were'
  if (o.moved && !changes.length && !o.drafts && o.bill) return `The contract is now ${sgd(contractMinor)} — no unsent invoice is left to carry it, so bill ${o.bill} on its own.`
  if (o.moved) return changes.length ? `The contract is now ${sgd(contractMinor)} — ${list} ${verb} re-sized. Sent invoices and the agreed shares stay as they are.` : o.drafts ? `The contract is now ${sgd(contractMinor)} — nothing changes on the unsent invoices.` : `The contract is now ${sgd(contractMinor)} — no unsent invoice to re-size.`
  return changes.length ? `${list} ${verb} re-sized to add up to the ${sgd(contractMinor)} contract. Sent invoices and the agreed shares stay as they are.` : `The unsent invoices already add up to the ${sgd(contractMinor)} contract.`
}
/**
 * (F-08 · F-09, REG-1067) A Draft's amount changed, in one sentence — the same press re-sizes the other unsent invoices so they take the
 * difference (`changes`, the edited one left out), or says none is left to.
 */
export function amountSentence(stage: string, amountMinor: number, differs: boolean, changes: RebalanceChange[]): string {
  const list = listOf(changes.map((c) => c.stageName))
  const verb = changes.length === 1 ? 'was' : 'were'
  if (!differs) return changes.length ? `${stage} invoice follows the schedule — ${list} ${verb} re-sized to match` : `${stage} invoice follows the schedule`
  return changes.length ? `${stage} invoice is ${sgd(amountMinor)} — ${list} ${verb} re-sized to take the difference` : `${stage} invoice is ${sgd(amountMinor)} — no other unsent invoice is left to take the difference`
}

/** A variation order's status in the Money tab's words (the quote statuses underneath). */
export function variationLabel(v: Pick<MoneyVariation, 'status' | 'declinedAt'>): string {
  if (isApprovedVariation(v.status)) return 'Approved by the client'
  if (v.status === 'Sent to Client' && v.declinedAt) return 'Declined by the client'   // (gaps build D, item 2)
  if (v.status === 'Sent to Client') return 'With client'   // (the calm UI build 2026-10-27, 4-04 · W-441) the quotes' own word
  if (v.status === 'Sent for Approval') return 'Waiting for approval'
  if (v.status === 'Approved') return 'Approved — not sent'
  return 'Draft'
}
export function variationTone(v: Pick<MoneyVariation, 'status' | 'declinedAt'>): 'default' | 'green' | 'yellow' | 'blue' | 'red' {
  if (isApprovedVariation(v.status)) return 'green'
  if (v.status === 'Sent to Client' && v.declinedAt) return 'red'   // (gaps build D, item 2)
  if (v.status === 'Sent to Client') return 'blue'
  if (v.status === 'Sent for Approval') return 'yellow'
  return 'default'
}
/** (F-07) How the client's approval was given, as the studio recorded it. */
export const APPROVAL_VIA: { value: string; label: string }[] = [
  { value: 'in_person', label: 'In person' }, { value: 'whatsapp', label: 'On WhatsApp' }, { value: 'email', label: 'By email' }, { value: 'paper', label: 'Signed on paper' },
]
/** (fix-D, D-42) the first word lower-cased, a brand keeps its case ("on WhatsApp") */
export const viaLabel = (via: string | null) => (via === 'link' || !via ? 'on the confirmation link' : via === 'marked' ? 'marked by the studio' : (APPROVAL_VIA.find((o) => o.value === via)?.label ?? via).replace(/^./, (c) => c.toLowerCase()))
