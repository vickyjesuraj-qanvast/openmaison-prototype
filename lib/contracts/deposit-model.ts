/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) *Ask for the deposit* on Send for digital signature: once the client
 * signs, the signing page ends on "Pay the deposit" — the named quote's FIRST payment stage, to its issuing entity's PayNow (the money papers'
 * pay box, `components/portal/money/pay-box.tsx`). Pure and client-safe; the server reads the records (`lib/contracts/deposit.ts`).
 *
 * The amount is the one the project bills for that stage (`moneyOf`'s stage view, lib/projects/money.ts): a fixed fee's own amount when the
 * schedule opens with one, else the stage's share of the quote's total as signed (`contractBaseOf`). Once the project exists, its invoice for
 * that stage is the figure (and says when it is paid).
 */
import { shareOf } from '@/lib/projects/money'

/** The first payment stage's amount: its fixed fee, else its share of the total. */
export function depositAmount(baseMinor: number, first: { pct: number; fixedMinor: number | null } | null | undefined): number {
  if (!first) return 0
  return first.fixedMinor != null && first.fixedMinor > 0 ? first.fixedMinor : shareOf(Math.max(0, baseMinor), first.pct)
}

/** What the editor's Send dialog knows about a quote's deposit: its amount and stage, or why it can't be asked for. */
export type DepositOption = { amountMinor: number; stage: string; quoteNumber: string; entity: string; why: string | null }
/** The signing page's "Pay the deposit": the amount, its stage, the reference the studio matches it by, where it goes, whether it is paid. */
export type DepositView = {
  amountMinor: number; stage: string; quoteNumber: string; reference: string; entity: string
  /** how to pay — null when the entity has no bank or PayNow (the page says the studio sends the details) */
  pay: { entity: string; accountName: string; bankName: string; accountNo: string; swift: string; payNow: string | null; payNowQr: string | null; branch?: string; methods?: string[] } | null
  /** the project's invoice for the stage is paid in full */ paid: boolean
}

/** Why the deposit can't be asked for — the Send dialog says it in the row (invented copy, S44R). */
export const depositWhy = {
  noQuote: 'Name the quote it signs first — the deposit is its first payment',
  noSchedule: (n: string) => `${n} has no payment schedule — add one on the quote first`,
  zero: (n: string) => `${n}’s first payment is S$0`,
  noPay: (e: string) => `${e} has no PayNow or bank details — add them on Company › Profile first`,
} as const
