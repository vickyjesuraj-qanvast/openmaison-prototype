import 'server-only'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { priceBookItems, priceBookSections, quoteItems, type PriceBookItem, type PriceBookSection } from '@/lib/db/schema'
import { parseSavedSection, savedSectionCount, type SavedSection } from '@/lib/quotes/items-model'

/* Company › Price book (REG-594): My Items and My Sections as libraries — what the quote editor's Add Item row offers. */

export type PriceBookItemRow = PriceBookItem & { usedBy: number; author: string | null; authorColor: string | null }
export type PriceBookSectionRow = PriceBookSection & { body: SavedSection | null; lineCount: number; usedBy: number; author: string | null; authorColor: string | null }
export type PriceBookData = {
  items: PriceBookItemRow[]; deletedItems: PriceBookItemRow[]
  sections: PriceBookSectionRow[]; deletedSections: PriceBookSectionRow[]
  /** Every vendor named on an item, for the filter chips and the Add Item popover. */
  vendors: string[]
  now: number
}

/** How many quotes carry a line (or a section) taken from each entry — `quote_items.price_book_item_id` names the source. */
async function usage(): Promise<Map<string, number>> {
  const rows = await db.select({ id: quoteItems.priceBookItemId, n: sql<number>`count(distinct ${quoteItems.quoteId})` }).from(quoteItems).where(sql`${quoteItems.priceBookItemId} IS NOT NULL`).groupBy(quoteItems.priceBookItemId)
  return new Map(rows.filter((r) => r.id).map((r) => [r.id as string, Number(r.n)]))
}

export async function fetchPriceBookData(): Promise<PriceBookData> {
  const [items, sections, n] = await Promise.all([
    db.select().from(priceBookItems).orderBy(asc(priceBookItems.name)),
    db.select().from(priceBookSections).orderBy(asc(priceBookSections.name)),
    usage(),
  ])
  const itemRows: PriceBookItemRow[] = items.map((i) => ({ ...i, usedBy: n.get(i.id) ?? 0, author: null, authorColor: null }))
  const sectionRows: PriceBookSectionRow[] = sections.map((s) => { const body = parseSavedSection(s.linesJson); return { ...s, body, lineCount: body ? savedSectionCount(body) : 0, usedBy: n.get(s.id) ?? 0, author: null, authorColor: null } })
  const vendors = [...new Set(items.filter((i) => !i.deletedAt && i.vendor).map((i) => i.vendor as string))].sort((a, b) => a.localeCompare(b))
  return {
    items: itemRows.filter((i) => !i.deletedAt), deletedItems: itemRows.filter((i) => !!i.deletedAt),
    sections: sectionRows.filter((s) => !s.deletedAt), deletedSections: sectionRows.filter((s) => !!s.deletedAt),
    vendors, now: Date.now(),
  }
}

export async function fetchPriceBookSection(id: string): Promise<PriceBookSectionRow | null> {
  const [s] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!s) return null
  const body = parseSavedSection(s.linesJson)
  return { ...s, body, lineCount: body ? savedSectionCount(body) : 0, usedBy: 0, author: null, authorColor: null }
}
