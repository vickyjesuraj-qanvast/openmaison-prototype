import 'server-only'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { syncPreparedSnapshot } from './prepared-server'

/**
 * (REG-626, quote editor parity Q-31) A contract raised from a quote carries the quote with it: when the contract is signed — online, in a
 * bundle, marked signed by hand or picked Signed in a list — the quote becomes Signed too (1.0 signed the quote itself). The client has it,
 * so it reads Shared; a quote already signed, deleted or never linked is left as it is. Returns the quote's id when it moved.
 */
export async function signQuoteThrough(contract: { fromQuoteId: string | null; leadId: string }, signedAt: Date): Promise<string | null> {
  if (!contract.fromQuoteId) return null
  const [q] = await db.select({ id: quotes.id, clientSentAt: quotes.clientSentAt, amountMinor: quotes.amountMinor }).from(quotes)
    .where(and(eq(quotes.id, contract.fromQuoteId), isNull(quotes.deletedAt), ne(quotes.status, 'Signed')))
  if (!q) return null
  /* (pending modules S03 — 1.0 froze the contract value at signing) the total as signed: the project's contract reads it from here on */
  await db.update(quotes).set({ status: 'Signed', signedAt, visibility: 'Shared', clientSentAt: q.clientSentAt ?? signedAt, signedAmountMinor: q.amountMinor, updatedAt: new Date() }).where(eq(quotes.id, q.id))
  await syncPreparedSnapshot(q.id)   // (pending modules S04) signed: the paper keeps its preparer, if it had not gone out before
  revalidateLead(contract.leadId); revalidatePath(`/quotes/${q.id}`); revalidatePath('/quotes')
  return q.id
}

export { contractBaseOf } from './contract-value'
