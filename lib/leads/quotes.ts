import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { asc, and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { count } from 'drizzle-orm'
import { priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate, members } from '@/lib/db/schema'
import type { Member } from '@/lib/db/schema'
import { fetchBrand, pickerExtras } from '@/lib/templates/queries'
import type { PickerExtras } from '@/lib/templates/picker'
import { SAMPLE_DATA, type DocData } from '@/lib/templates/data'
import type { BrandKit } from '@/lib/templates/model'

/* Lead Details › Quotes (910-36240) — one loader for the tab. Archived / deleted quotes leave the list. The studio's
   design templates ride along for the Create Quote modal (REG-412): default first, then most recently used. */

/** A quote with the member who created it (REG-471) — the Quotes tables' Creator column. */
export type QuoteRow = Quote & { creator: Member | null }
export type LeadQuotesData = {
  quotes: QuoteRow[]
  templates: QuoteTemplate[]
  /** The studio's My Items count — the Create Quote modal's "n-item price book" (REG-412). */
  priceBookCount: number
  /** (REG-489) The brand kit and the sample quote the Create Quote modal draws each template's first page with. */
  brand: BrandKit
  sample: DocData
  /** (REG-538) The picker's facts: the payment library's names and the text templates' titles. */
  extras: PickerExtras
  now: number
}

export async function fetchLeadQuotes(leadId: string): Promise<LeadQuotesData> {
  const [rows, templates, book, team, brand, extras] = await Promise.all([
    db.select().from(quotes)
      .where(and(eq(quotes.leadId, leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt)))
      .orderBy(asc(quotes.createdAt)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    db.select({ n: count() }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))),   // (REG-653, price book parity Q-11) the live book — not the trash, not proposals
    db.select().from(members),
    fetchBrand(),
    pickerExtras(),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  return { quotes: rows.map((q) => ({ ...q, creator: q.createdBy ? byMember.get(q.createdBy) ?? null : null })), templates, priceBookCount: book[0]?.n ?? 0, extras, brand: brand.kit, sample: { ...SAMPLE_DATA, studio: brand.details }, now: Date.now() }
}
