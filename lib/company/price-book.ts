import 'server-only'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, priceBookItems, priceBookSections, quoteItems, quotes, type PriceBookItem, type PriceBookSection } from '@/lib/db/schema'
import { parseSavedSection, parseSectionTags, savedSectionCount, type SavedSection } from '@/lib/quotes/items-model'
import { fetchTrades, fetchUnits } from '@/lib/settings/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import { itemVisible, runsBook } from './price-book-rules'
import { bookItemFor, sectionBodyFor, sightOf } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)

/* Company › Price book (REG-594): My Items and My Sections as libraries — what the quote editor's Add Item row offers. */

/** `author` = who last changed it (the list's *Updated by*); `maker` = who added it; `proposer` = who proposed it, while it waits (REG-652). */
export type PriceBookItemRow = PriceBookItem & { usedBy: number; author: string | null; authorColor: string | null; maker: string | null; makerColor: string | null; proposer: string | null; reviewer: string | null }
export type PriceBookSectionRow = PriceBookSection & { body: SavedSection | null; lineCount: number; usedBy: number; author: string | null; authorColor: string | null; /** (REG-653) who saved it */ maker?: string | null; makerColor?: string | null; /** (REG-619) the parsed `tags` */ tagList: string[] }
export type PriceBookData = {
  items: PriceBookItemRow[]; deletedItems: PriceBookItemRow[]
  sections: PriceBookSectionRow[]; deletedSections: PriceBookSectionRow[]
  /** Every vendor named on an item, for the filter chips and the Add Item popover. */
  vendors: string[]
  /** (REG-651, price book parity Q-07) The studio's trades — an item's category is one of them. */
  trades: string[]
  /** (S44I — M9) the studio's units (Settings › Quotes & pricing › Units) — the item and section dialogs' Unit list */
  units: string[]
  /** (REG-652, price book parity Q-03) Who is reading: an Owner or an Admin changes the book; anyone else reads it and proposes items. */
  viewer: { id: string; role: string }
  runsBook: boolean
  /** (pending modules S41b-1 — 1.0's Cost & Margin Visibility) Whether the viewer sees costs: when not, every item and saved line came with
      its cost folded into its price (lib/quotes/cost-sight.ts) and the page leaves out Cost and Markup. */
  costs: boolean
  now: number
}

/** How many quotes carry a line (or a section) taken from each entry — `quote_items.price_book_item_id` names the source. (REG-653, price
    book parity Q-11) Deleted quotes don't count: an entry only live quotes came from is what the trash keeps. */
async function usage(): Promise<Map<string, number>> {
  const rows = await db.select({ id: quoteItems.priceBookItemId, n: sql<number>`count(distinct ${quoteItems.quoteId})` }).from(quoteItems).innerJoin(quotes, eq(quotes.id, quoteItems.quoteId))
    .where(and(sql`${quoteItems.priceBookItemId} IS NOT NULL`, isNull(quotes.deletedAt))).groupBy(quoteItems.priceBookItemId)
  return new Map(rows.filter((r) => r.id).map((r) => [r.id as string, Number(r.n)]))
}

export async function fetchPriceBookData(): Promise<PriceBookData> {
  const [all, sections, n, trades, v, team, units] = await Promise.all([
    db.select().from(priceBookItems).orderBy(asc(priceBookItems.name)),
    db.select().from(priceBookSections).orderBy(asc(priceBookSections.name)),
    usage(),
    fetchTrades(),
    fetchViewer(),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    fetchUnits(),
  ])
  const who = new Map(team.map((m) => [m.id, m]))
  const nameOf = (id: string | null) => (id ? who.get(id)?.name ?? null : null)
  /* (REG-652, price book parity Q-04) A proposal is its proposer's and the reviewers' until it is approved — nobody else sees it. */
  const viewer = { id: v.id, role: v.role }
  const sight = sightOf(v)   // (pending modules S41b-1) what this member's browser is sent
  const items = all.filter((i) => itemVisible(viewer, i)).map((i) => bookItemFor(i, sight))
  const itemRows: PriceBookItemRow[] = items.map((i) => {
    const last = who.get(i.updatedBy ?? i.createdBy ?? '')
    const made = who.get(i.createdBy ?? '')
    return { ...i, usedBy: n.get(i.id) ?? 0, author: last?.name ?? null, authorColor: last?.color ?? null, maker: made?.name ?? null, makerColor: made?.color ?? null, proposer: i.status === 'proposed' ? nameOf(i.createdBy) : null, reviewer: nameOf(i.reviewedBy) }
  })
  const sectionRows: PriceBookSectionRow[] = sections.map((s0) => { const read = parseSavedSection(s0.linesJson); const body = read ? sectionBodyFor(read, sight) : null; const s = body ? { ...s0, linesJson: JSON.stringify(body) } : s0; const last = who.get(s.updatedBy ?? s.createdBy ?? ''); const made = who.get(s.createdBy ?? ''); return { ...s, body, lineCount: body ? savedSectionCount(body) : 0, usedBy: n.get(s.id) ?? 0, author: last?.name ?? null, authorColor: last?.color ?? null, maker: made?.name ?? null, makerColor: made?.color ?? null, tagList: parseSectionTags(s.tags) } })
  const vendors = [...new Set(items.filter((i) => !i.deletedAt && i.vendor).map((i) => i.vendor as string))].sort((a, b) => a.localeCompare(b))
  return {
    items: itemRows.filter((i) => !i.deletedAt), deletedItems: itemRows.filter((i) => !!i.deletedAt),
    sections: sectionRows.filter((s) => !s.deletedAt), deletedSections: sectionRows.filter((s) => !!s.deletedAt),
    vendors, trades: trades.trades, units: units.units, viewer, runsBook: runsBook(viewer), costs: sight.costs, now: Date.now(),
  }
}
