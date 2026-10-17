import 'server-only'
import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, priceBookChanges, priceBookItems, type PriceBookItem } from '@/lib/db/schema'
import { FULL_SIGHT, type CostSight } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)
import { BOOK_FIELDS, type BookChangeKind, type ItemChange } from './price-book-changes'

/* (REG-652, price book parity Q-05) Every change to an item is kept — who, when, before → after — from its creation. */

type Tracked = Pick<PriceBookItem, (typeof BOOK_FIELDS)[number]['key']>
/** The real changes between two versions of an item: `{ field: [before, after] }`, nothing when nothing moved. */
export function diffItem(before: Tracked, after: Tracked): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {}
  for (const f of BOOK_FIELDS) { const a = before[f.key] ?? null, b = after[f.key] ?? null; if (a !== b) out[f.key] = [a, b] }
  return out
}
/** Keeps one change; answers its id (null when an edit moved nothing) — (UX audit S7) an import's Undo reads back the changes it made. */
export async function logBookChange(itemId: string, kind: BookChangeKind, by: string | null, changes: Record<string, [unknown, unknown]> | null = null, note: string | null = null, at = new Date()): Promise<string | null> {
  if (kind === 'edited' && (!changes || !Object.keys(changes).length)) return null
  const id = randomUUID()
  await db.insert(priceBookChanges).values({ id, itemId, kind, changes: changes && Object.keys(changes).length ? JSON.stringify(changes) : null, note, by, at })
  return id
}
/**
 * (pending modules S41b-1 — 1.0: "price-book-history … history without cost rows") For a member who doesn't see costs, an entry's Cost and
 * Markup lines become ONE Unit price line — before → after, worked back from the item as it is now through every newer entry — so History
 * says what the price did and never what it cost; an entry that moved neither keeps its own lines.
 */
export async function fetchItemHistory(itemId: string, sight: CostSight = FULL_SIGHT): Promise<ItemChange[]> {
  const [rows, team, cur] = await Promise.all([
    db.select().from(priceBookChanges).where(eq(priceBookChanges.itemId, itemId)).orderBy(desc(priceBookChanges.at)),
    db.select({ id: members.id, name: members.name }).from(members),
    sight.costs ? Promise.resolve([] as PriceBookItem[]) : db.select().from(priceBookItems).where(eq(priceBookItems.id, itemId)),
  ])
  const name = new Map(team.map((m) => [m.id, m.name]))
  const out = rows.map((r) => {
    let changes: Record<string, [unknown, unknown]> = {}
    try { changes = r.changes ? JSON.parse(r.changes) as Record<string, [unknown, unknown]> : {} } catch { changes = {} }
    return { id: r.id, kind: r.kind as BookChangeKind, changes, note: r.note, by: r.by ? name.get(r.by) ?? null : null, at: r.at.getTime() }
  })
  if (sight.costs) return out
  /* newest first: the state after each entry is the state before the newer ones */
  const now = cur[0]
  let cost = now?.costMinor ?? 0, markup = now?.markupMinor ?? 0
  return out.map((h) => {
    const { costMinor: c, markupMinor: m, ...rest } = h.changes
    if (!c && !m) return h
    const after = cost + markup
    if (c) cost = Number(c[0]) || 0
    if (m) markup = Number(m[0]) || 0
    const before = cost + markup
    return { ...h, changes: before === after ? rest : { ...rest, price: [before, after] as [unknown, unknown] } }
  })
}
