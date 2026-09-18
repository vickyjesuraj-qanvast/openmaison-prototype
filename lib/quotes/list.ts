import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate, members } from '@/lib/db/schema'
import type { Member } from '@/lib/db/schema'
import { fetchQuoteApproval } from '@/lib/settings/queries'
import type { QuoteApproval } from '@/lib/settings/types'
import { fetchBrand } from '@/lib/templates/queries'
import { SAMPLE_DATA, type DocData } from '@/lib/templates/data'
import type { BrandKit } from '@/lib/templates/model'

/* Tools › Quotes (REG-422): every live quote in the studio with the lead it belongs to — the Quotes tab's table plus a
   Client column — and the leads the Create Quote modal's Client field can choose from. */

export type StudioQuoteRow = Quote & { leadName: string; creator: Member | null }   /* creator: REG-471 */
export type StudioQuotesData = {
  quotes: StudioQuoteRow[]
  leads: { id: string; name: string }[]
  templates: QuoteTemplate[]
  priceBookCount: number
  approval: QuoteApproval
  brand: BrandKit
  sample: DocData
  now: number
}

export async function fetchStudioQuotes(): Promise<StudioQuotesData> {
  const [rows, clients, templates, approval, book, team, brand] = await Promise.all([
    db.select({ quote: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    fetchQuoteApproval(),
    db.select({ n: count() }).from(priceBookItems),
    db.select().from(members),
    fetchBrand(),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  return { quotes: rows.map((r) => ({ ...r.quote, leadName: r.leadName, creator: r.quote.createdBy ? byMember.get(r.quote.createdBy) ?? null : null })), leads: clients, templates, priceBookCount: book[0]?.n ?? 0, approval, brand: brand.kit, sample: { ...SAMPLE_DATA, studio: brand.details }, now: Date.now() }
}
