/**
 * (gaps build F2 — F2-Q9; 1.0 G-194 · G-335 · G-336) Credit notes — the words, the numbers and the rules, pure and client-safe. 1.0's dialog
 * had no opener and no list (G-337), no role check and no ceiling (G-336). Here: against a sent invoice, never more than it has left to credit,
 * GST split out at the invoice's own rate, numbered when issued (`CN-{YYYY}-{seq}`, the invoices' numbering model), Owners and Admins only.
 */
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from '@/lib/projects/model'
import type { InvoiceView, MoneySummary } from '@/lib/projects/money'
import { money2 } from '@/lib/quotes/math'

export const CREDIT_RULES_KEY = 'credit_note_rules'
export const DEFAULT_CREDIT_NUMBERING: ProjectNumbering = { prefix: 'CN', year: true, next: 0, digits: 3 }
export type CreditRules = { numbering: ProjectNumbering }
export const DEFAULT_CREDIT_RULES: CreditRules = { numbering: DEFAULT_CREDIT_NUMBERING }
export function parseCreditRules(v: unknown): CreditRules {
  const n = ((v ?? {}) as { numbering?: Partial<Record<keyof ProjectNumbering, unknown>> }).numbering ?? {}
  const prefix = typeof n.prefix === 'string' ? n.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : ''
  return {
    numbering: {
      prefix: prefix || DEFAULT_CREDIT_NUMBERING.prefix,
      year: n.year === undefined ? DEFAULT_CREDIT_NUMBERING.year : n.year === true,
      next: typeof n.next === 'number' && Number.isFinite(n.next) && n.next > 0 ? Math.floor(n.next) : 0,
      digits: typeof n.digits === 'number' && Number.isFinite(n.digits) ? Math.min(6, Math.max(0, Math.floor(n.digits))) : DEFAULT_CREDIT_NUMBERING.digits,
    },
  }
}
/** The number the next credit note takes, never below the highest already given under the prefix. */
export const nextCreditNumber = (n: ProjectNumbering, numbers: string[], at: Date) => formatProjectNumber(n, nextProjectSeq(numbers, n), at)

/** What an invoice can still be credited: its amount less the credit notes already issued on it (a sent invoice only). */
export const creditableOf = (i: Pick<InvoiceView, 'status' | 'amountMinor' | 'creditedMinor'>) => (i.status === 'sent' ? Math.max(0, i.amountMinor - (i.creditedMinor ?? 0)) : 0)
/** The GST inside a credit, at the invoice's own rate (its GST over what it is before GST) — 1.0 G-335's rule. */
export const creditGstOf = (amountMinor: number, invoice: Pick<InvoiceView, 'amountMinor' | 'gstMinor'>) =>
  invoice.amountMinor > 0 && invoice.gstMinor > 0 ? Math.round((amountMinor * invoice.gstMinor) / invoice.amountMinor) : 0

export const CREDIT_RULE = 'Only an Owner, an Admin or Accounting issues, voids or refunds a credit note'   // (parity map, MI-007 — a deliberate change of this rule)
export const CREDIT_SENT_RULE = 'A credit note goes against a sent invoice'
export const CREDIT_REASON_MAX = 300
/** The reasons a studio gives most — the dialog's chips (the words are the studio's to change). */
export const CREDIT_REASONS = ['Overcharged', 'Work left out', 'Goodwill', 'Contract adjustment'] as const

/* ── (pending modules S07 — the projects card's D-14, as recommended: "an overpayment can become a credit note now that credit notes exist") ──
   A client who pays more than an invoice owes: the payment settles what was owed and the extra is THEIR credit — a credit note of its own kind,
   numbered as every credit note, filed in Files › Payments, on their portal. It lowers no invoice and carries no GST (it is money held, not a
   price changed); it is used on a later invoice (a payment taken from it) or refunded. 1.0 refused the overpayment (its studio route) or left
   it to a person to look at (the client's proof) and asked for "a refund / credit note owed before closing" — this is that credit note. */
/** The reason an overpayment's credit note gives — what came, and what the invoice owed. *(invented copy)* */
export const overpaymentReason = (o: { invoice: string; paidMinor: number; owedMinor: number }) => `Paid ${money2(o.paidMinor)} when ${o.invoice} owed ${money2(o.owedMinor)}`
/** *(invented copy)* */
export const OVERPAY_VOID_RULE = 'An overpayment’s credit is the client’s money — use it on an invoice or refund it'
export const OVERPAY_USED_RULE = 'Nothing of this credit is left to use'
/** What a held credit can take off an invoice: what is left of it, never more than the invoice still owes. */
export const usableOn = (heldMinor: number, owedMinor: number) => Math.max(0, Math.min(heldMinor, owedMinor))
/** What is left of an overpayment's credit, read off the one set of numbers. */
export const heldNow = (m: Pick<MoneySummary, 'held'>, creditId: string) => m.held?.find((h) => h.id === creditId)?.heldMinor ?? 0
