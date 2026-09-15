import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { asc, and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { count } from 'drizzle-orm'
import { priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate } from '@/lib/db/schema'

/* Lead Details › Quotes (910-36240) — one loader for the tab. Archived / deleted quotes leave the list. The studio's
   design templates ride along for the Create Quote modal (REG-412): default first, then most recently used. */

export type LeadQuotesData = {
  quotes: Quote[]
  templates: QuoteTemplate[]
  /** The studio's My Items count — the Create Quote modal's "n-item price book" (REG-412). */
  priceBookCount: number
  now: number
}

export async function fetchLeadQuotes(leadId: string): Promise<LeadQuotesData> {
  const [rows, templates, book] = await Promise.all([
    db.select().from(quotes)
      .where(and(eq(quotes.leadId, leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt)))
      .orderBy(asc(quotes.createdAt)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    db.select({ n: count() }).from(priceBookItems),
  ])
  return { quotes: rows, templates, priceBookCount: book[0]?.n ?? 0, now: Date.now() }
}
