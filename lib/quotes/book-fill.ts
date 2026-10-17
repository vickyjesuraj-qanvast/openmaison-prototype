import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { priceBookItems, quoteItems, type PriceBookItem, type QuoteItem } from '@/lib/db/schema'
import { itemPickable } from '@/lib/company/price-book-rules'
import { bookFill, costUnknown, matchLines, startsTicked, type BookEntry, type LineIn } from '@/lib/company/price-book-match'

/**
 * (pending modules S12 — card held:price-book, 1.0's cost auto-match) Quote lines matched to My Items, on the server: the editor's *Match lines*
 * review writes the matches the member ticked, and an uploaded quote's lines take the **sure** matches at once — 1.0 filled only its "high"
 * tier after a parse, and only on lines with no cost of their own (`costUnknown`: the upload's whole price sits in the cost) — never one that
 * would leave the line below the item's cost (`startsTicked`). A match takes the
 * item's cost and keeps the client's price (`bookFill`, lib/company/price-book-match.ts). Only an item the member may pick is ever taken —
 * the live book and their own proposals (REG-652). No figure from the browser is trusted: each line and item is read again here.
 */

type Viewer = { id: string | null; role: string | null | undefined }
const entryOf = (i: PriceBookItem): BookEntry => ({ id: i.id, name: i.name, description: i.description, category: i.category, unit: i.unit, costMinor: i.costMinor, markupMinor: i.markupMinor, vendor: i.vendor, link: i.link, kind: i.kind, status: i.status })
const lineOf = (l: QuoteItem): LineIn & { link: string | null; icon: string | null } => ({ id: l.id, name: l.name, description: l.description, category: l.category, unit: l.unit, costMinor: l.costMinor, markupMinor: l.markupMinor, qty: l.qty, kind: l.kind, priceBookItemId: l.priceBookItemId, vendor: l.vendor, link: l.link, icon: l.icon })

/** The book a member may match against: live items and their own proposals, none deleted. */
export async function pickableBook(v: Viewer): Promise<PriceBookItem[]> {
  const rows = await db.select().from(priceBookItems).where(isNull(priceBookItems.deletedAt))
  return rows.filter((i) => itemPickable(v, i))
}

/** Writes each pick — a line of this quote not yet from My Items, an item the member may pick — and answers the lines it matched. */
export async function writeBookMatches(quoteId: string, picks: { lineId: string; itemId: string }[], v: Viewer): Promise<string[]> {
  const want = picks.filter((p) => typeof p?.lineId === 'string' && typeof p?.itemId === 'string').slice(0, 500)
  if (!want.length) return []
  const [lines, items] = await Promise.all([
    db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), inArray(quoteItems.id, want.map((p) => p.lineId)))),
    db.select().from(priceBookItems).where(and(inArray(priceBookItems.id, [...new Set(want.map((p) => p.itemId))]), isNull(priceBookItems.deletedAt))),
  ])
  const done: string[] = []
  const now = new Date()
  for (const p of want) {
    const line = lines.find((l) => l.id === p.lineId), item = items.find((i) => i.id === p.itemId)
    if (!line || !item || line.kind !== 'item' || line.priceBookItemId || !itemPickable(v, item)) continue
    await db.update(quoteItems).set({ ...bookFill(lineOf(line), entryOf(item)), updatedAt: now }).where(eq(quoteItems.id, line.id))
    done.push(line.id)
  }
  return done
}

/** An uploaded quote's lines with no cost of their own take their **sure** matches (1.0's high tier) — answers how many did. */
export async function fillUploadFromBook(quoteId: string, v: Viewer): Promise<number> {
  const [lines, book] = await Promise.all([db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)), pickableBook(v)])
  if (!book.length) return 0
  const open = lines.filter((l) => costUnknown(l)).map(lineOf)
  /* sure ones only — and never one that would sell the line below the item's cost (the review shows it, red, for the member's own tick) */
  const sure = matchLines(open, book.map(entryOf)).filter((m) => m.tier === 'sure' && m.item && startsTicked(m, open.find((l) => l.id === m.lineId)!))
  return (await writeBookMatches(quoteId, sure.map((m) => ({ lineId: m.lineId, itemId: m.item!.id })), v)).length
}
