import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, type CreditNote } from '@/lib/db/schema'
import type { MoneyCredit } from '@/lib/projects/money'

/**
 * (gaps build F2 — F2-Q9) A project's credit notes as `moneyOf` reads them — the issued ones lower what their invoice is owed, a void one counts
 * for nothing, the refund recorded on one is taken off what the client is owed back. Kept apart from money-queries so the read is one line there.
 */
export const creditRecord = (c: CreditNote): MoneyCredit => ({
  id: c.id, invoiceId: c.invoiceId, number: c.number, amountMinor: c.amountMinor, gstMinor: c.gstMinor, status: c.status === 'void' ? 'void' : 'issued',
  refundedMinor: c.refundMinor ?? 0, issuedAt: c.issuedAt.getTime(),
  kind: c.kind === 'overpayment' ? 'overpayment' : 'credit', paymentId: c.paymentId ?? null,   // (pending modules S07 — D-14)
})
export async function creditsOf(projectId: string): Promise<MoneyCredit[]> {
  return (await db.select().from(creditNotes).where(eq(creditNotes.projectId, projectId)).orderBy(asc(creditNotes.issuedAt))).map(creditRecord)
}
/** Many projects at once (Finance's pages, the reports). */
export async function creditsByProject(projectIds: string[]): Promise<Map<string, MoneyCredit[]>> {
  const out = new Map<string, MoneyCredit[]>()
  if (!projectIds.length) return out
  const rows = await db.select().from(creditNotes).where(inArray(creditNotes.projectId, projectIds)).orderBy(asc(creditNotes.issuedAt))
  for (const r of rows) { const list = out.get(r.projectId) ?? []; list.push(creditRecord(r)); out.set(r.projectId, list) }
  return out
}
/** (F2-Q9) The credit note a file in Files › Payments is — its entry opens the paper (the receipts' rule, `receiptOfFile`). */
export async function creditOfFile(fileId: string): Promise<{ projectId: string; creditId: string } | null> {
  const [r] = await db.select({ projectId: creditNotes.projectId, creditId: creditNotes.id }).from(creditNotes).where(eq(creditNotes.fileId, fileId)).limit(1)
  return r ?? null
}

/** (pending modules S07 — D-14) The overpayment's credit a payment carried, if any (one per payment). */
export async function heldCreditOfPayment(paymentId: string): Promise<CreditNote | null> {
  const [cn] = await db.select().from(creditNotes).where(and(eq(creditNotes.paymentId, paymentId), eq(creditNotes.kind, 'overpayment'))).limit(1)
  return cn ?? null
}
/** (pending modules S07) What a receipt says of its payment's extra: the overpayment's credit note and what it held. */
export async function receiptExtraOf(paymentId: string): Promise<{ number: string; amountMinor: number } | null> {
  const cn = await heldCreditOfPayment(paymentId)
  return cn ? { number: cn.number, amountMinor: cn.amountMinor } : null
}
