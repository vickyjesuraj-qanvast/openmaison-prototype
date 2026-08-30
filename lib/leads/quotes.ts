import { asc, and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quotes, type Quote } from '@/lib/db/schema'

/* Lead Details › Quotes (910-36240) — one loader for the tab. Archived / deleted quotes leave the list. */

export type LeadQuotesData = {
  quotes: Quote[]
  now: number
}

export async function fetchLeadQuotes(leadId: string): Promise<LeadQuotesData> {
  const rows = await db.select().from(quotes)
    .where(and(eq(quotes.leadId, leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt)))
    .orderBy(asc(quotes.createdAt))
  return { quotes: rows, now: Date.now() }
}
