import 'server-only'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'

/**
 * (REG-626, quote editor parity Q-31) A contract raised from a quote carries the quote with it: when the contract is signed — online, in a
 * bundle, marked signed by hand or picked Signed in a list — the quote becomes Signed too (1.0 signed the quote itself). The client has it,
 * so it reads Shared; a quote already signed, deleted or never linked is left as it is. Returns the quote's id when it moved.
 */
export async function signQuoteThrough(contract: { fromQuoteId: string | null; leadId: string }, signedAt: Date): Promise<string | null> {
  if (!contract.fromQuoteId) return null
  const [q] = await db.select({ id: quotes.id, clientSentAt: quotes.clientSentAt }).from(quotes)
    .where(and(eq(quotes.id, contract.fromQuoteId), isNull(quotes.deletedAt), ne(quotes.status, 'Signed')))
  if (!q) return null
  await db.update(quotes).set({ status: 'Signed', signedAt, visibility: 'Shared', clientSentAt: q.clientSentAt ?? signedAt, updatedAt: new Date() }).where(eq(quotes.id, q.id))
  revalidateLead(contract.leadId); revalidatePath(`/quotes/${q.id}`); revalidatePath('/quotes')
  return q.id
}
