import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectPayments } from '@/lib/db/schema'
import type { MoneyPayment } from './money'
import { countsAsPaid, isPending } from './payments-model'

/*
 * (Projects round 6) The payments `moneyOf` reads (lib/projects/money.ts — the one set of numbers): for each invoice, what counts (Confirmed,
 * or a client's proof trusted on arrival) and what waits for the confirmer (`pending`). Reversed and Not received count for nothing. Kept apart
 * from lib/projects/payments.ts so money-queries.ts can read it without a cycle.
 */
export async function moneyPaymentsOf(projectId: string): Promise<MoneyPayment[]> {
  const rows = await db.select({ invoiceId: projectPayments.invoiceId, amountMinor: projectPayments.amountMinor, status: projectPayments.status, trusted: projectPayments.trusted, paidOn: projectPayments.paidOn, creditNoteId: projectPayments.creditNoteId })
    .from(projectPayments).where(and(eq(projectPayments.projectId, projectId), inArray(projectPayments.status, ['confirmed', 'to_confirm'])))
  /* (fix-D, D-03 · D-27) the day it moved (a paid invoice says when), and a trusted proof that counts but waits to be checked */
  return rows.flatMap((r): MoneyPayment[] => (countsAsPaid(r) ? [{ invoiceId: r.invoiceId, amountMinor: r.amountMinor, paidOn: r.paidOn.getTime(), ...(r.status === 'to_confirm' ? { unchecked: true } : {}), ...(r.creditNoteId ? { creditNoteId: r.creditNoteId } : {}) }] : isPending(r) ? [{ invoiceId: r.invoiceId, amountMinor: r.amountMinor, pending: true }] : []))   // (pending modules S07) a payment from a client's credit names it
}
