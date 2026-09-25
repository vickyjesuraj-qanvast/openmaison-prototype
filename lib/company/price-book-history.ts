import 'server-only'
import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, priceBookChanges, type PriceBookItem } from '@/lib/db/schema'
import { BOOK_FIELDS, type BookChangeKind, type ItemChange } from './price-book-changes'

/* (REG-652, price book parity Q-05) Every change to an item is kept — who, when, before → after — from its creation. */

type Tracked = Pick<PriceBookItem, (typeof BOOK_FIELDS)[number]['key']>
/** The real changes between two versions of an item: `{ field: [before, after] }`, nothing when nothing moved. */
export function diffItem(before: Tracked, after: Tracked): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {}
  for (const f of BOOK_FIELDS) { const a = before[f.key] ?? null, b = after[f.key] ?? null; if (a !== b) out[f.key] = [a, b] }
  return out
}
export async function logBookChange(itemId: string, kind: BookChangeKind, by: string | null, changes: Record<string, [unknown, unknown]> | null = null, note: string | null = null, at = new Date()): Promise<void> {
  if (kind === 'edited' && (!changes || !Object.keys(changes).length)) return
  await db.insert(priceBookChanges).values({ id: randomUUID(), itemId, kind, changes: changes && Object.keys(changes).length ? JSON.stringify(changes) : null, note, by, at })
}
export async function fetchItemHistory(itemId: string): Promise<ItemChange[]> {
  const [rows, team] = await Promise.all([
    db.select().from(priceBookChanges).where(eq(priceBookChanges.itemId, itemId)).orderBy(desc(priceBookChanges.at)),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const name = new Map(team.map((m) => [m.id, m.name]))
  return rows.map((r) => {
    let changes: Record<string, [unknown, unknown]> = {}
    try { changes = r.changes ? JSON.parse(r.changes) as Record<string, [unknown, unknown]> : {} } catch { changes = {} }
    return { id: r.id, kind: r.kind as BookChangeKind, changes, note: r.note, by: r.by ? name.get(r.by) ?? null : null, at: r.at.getTime() }
  })
}
