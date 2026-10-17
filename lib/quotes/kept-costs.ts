import 'server-only'
import { inArray, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { keptLineCosts, type QuoteItem } from '@/lib/db/schema'

/**
 * (pending modules S41b-1 — 1.0's "their edits keep the costs you have already entered") A line's cost, mark-up and rebate, kept for 30 days when
 * the line is deleted or overwritten. A member who doesn't see costs is sent each line with its cost folded into its price
 * (lib/quotes/cost-sight.ts), so when they bring it back — an Undo, ⌘Z, a pick's Undo on Choices — their browser has no cost to send: the server
 * puts it back from here. Server-only.
 */
const KEEP_MS = 30 * 86_400_000

export async function keepLineCosts(lines: Pick<QuoteItem, 'id' | 'quoteId' | 'kind' | 'costMinor' | 'markupMinor' | 'rebateMinor'>[]): Promise<void> {
  const priced = lines.filter((l) => l.kind === 'item')
  if (!priced.length) return
  const now = new Date()
  for (const l of priced) {
    await db.insert(keptLineCosts).values({ lineId: l.id, quoteId: l.quoteId, costMinor: l.costMinor, markupMinor: l.markupMinor, rebateMinor: l.rebateMinor, keptAt: now })
      .onConflictDoUpdate({ target: keptLineCosts.lineId, set: { costMinor: l.costMinor, markupMinor: l.markupMinor, rebateMinor: l.rebateMinor, keptAt: now } })
  }
  await db.delete(keptLineCosts).where(lt(keptLineCosts.keptAt, new Date(now.getTime() - KEEP_MS)))
}

export async function keptCostsOf(lineIds: string[]): Promise<Map<string, { costMinor: number; markupMinor: number; rebateMinor: number }>> {
  const ids = [...new Set(lineIds.filter(Boolean))]
  if (!ids.length) return new Map()
  const rows = await db.select().from(keptLineCosts).where(inArray(keptLineCosts.lineId, ids))
  return new Map(rows.map((r) => [r.lineId, { costMinor: r.costMinor, markupMinor: r.markupMinor, rebateMinor: r.rebateMinor }]))
}
