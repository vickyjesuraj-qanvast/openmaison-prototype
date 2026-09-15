import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate } from '@/lib/db/schema'
import { fetchQuoteApproval } from '@/lib/settings/queries'
import type { QuoteApproval } from '@/lib/settings/types'

/* Tools › Quotes (REG-422): every live quote in the studio with the lead it belongs to — the Quotes tab's table plus a
   Client column — and the leads the Create Quote modal's Client field can choose from. */

export type StudioQuoteRow = Quote & { leadName: string }
export type StudioQuotesData = {
  quotes: StudioQuoteRow[]
  leads: { id: string; name: string }[]
  templates: QuoteTemplate[]
  priceBookCount: number
  approval: QuoteApproval
  now: number
}

export async function fetchStudioQuotes(): Promise<StudioQuotesData> {
  const [rows, clients, templates, approval, book] = await Promise.all([
    db.select({ quote: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    fetchQuoteApproval(),
    db.select({ n: count() }).from(priceBookItems),
  ])
  return { quotes: rows.map((r) => ({ ...r.quote, leadName: r.leadName })), leads: clients, templates, priceBookCount: book[0]?.n ?? 0, approval, now: Date.now() }
}
