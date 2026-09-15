import 'server-only'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'

/** Every section write ends here: the quote's `updatedAt` moves (the header's "Saved …" follows it) and the lead re-renders. */
export async function stampQuote(quoteId: string): Promise<{ updatedAt: number }> {
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  const now = new Date()
  await db.update(quotes).set({ updatedAt: now }).where(eq(quotes.id, quoteId))
  revalidateLead(q.leadId); revalidatePath(`/quotes/${quoteId}`)
  return { updatedAt: now.getTime() }
}
