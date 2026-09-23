/**
 * (REG-595) What changed between a quote's kept version and the one being worked on — Urban Home's "removed items struck through
 * in red, added items marked new" on a revised quotation. Pure, client-safe: the preview's loader feeds it the kept snapshot's
 * lines and the current ones; the renderer prints the marks; Version History reads the counts.
 */
import { lineTotalMinor, unitPriceMinor } from './math'

export type Diffable = { id: string; parentId: string | null; kind: string; status: string; name: string; qty: number; costMinor: number; markupMinor: number; discountPct: number; position: number }
export type LineWas = { name: string; qty: number; unitPriceMinor: number; totalMinor: number }
export type ItemChange = 'added' | 'removed' | 'changed'
export type QuoteDiff<T extends Diffable> = { added: Set<string>; removed: T[]; changed: Map<string, LineWas>; counts: { added: number; removed: number; changed: number } }

/** Lines by id: gone since the kept version, new since it, or priced / counted / named differently. Sections are not compared. */
export function diffQuoteItems<T extends Diffable>(prev: T[], cur: Diffable[]): QuoteDiff<T> {
  const prevById = new Map(prev.map((i) => [i.id, i]))
  const curIds = new Set(cur.map((i) => i.id))
  const added = new Set(cur.filter((i) => i.kind === 'item' && !prevById.has(i.id)).map((i) => i.id))
  const removed = prev.filter((i) => i.kind === 'item' && !curIds.has(i.id) && i.status !== 'Declined')
  const changed = new Map<string, LineWas>()
  for (const i of cur) {
    const p = prevById.get(i.id)
    if (!p || i.kind !== 'item') continue
    if (p.name !== i.name || p.qty !== i.qty || unitPriceMinor(p) !== unitPriceMinor(i) || p.discountPct !== i.discountPct) changed.set(i.id, { name: p.name, qty: p.qty, unitPriceMinor: unitPriceMinor(p), totalMinor: lineTotalMinor(p) })
  }
  return { added, removed, changed, counts: { added: added.size, removed: removed.length, changed: changed.size } }
}

/**
 * The removed lines put back where they were — right after the previous sibling that still exists (else first in their section),
 * a half-step in position so the table's order keeps them there. A line whose whole section is gone is left out.
 */
export function withRemoved<T extends { id: string; parentId: string | null; position: number }, R extends Diffable>(cur: T[], removed: R[], prev: R[], make: (r: R, position: number) => T): T[] {
  const out = [...cur]
  for (const r of removed) {
    if (r.parentId && !out.some((o) => o.id === r.parentId)) continue
    const sibs = prev.filter((p) => (p.parentId ?? null) === (r.parentId ?? null)).sort((a, b) => a.position - b.position)
    const idx = sibs.findIndex((s) => s.id === r.id)
    const before = sibs.slice(0, idx).reverse().find((s) => out.some((o) => o.id === s.id))
    const pos = before ? (out.find((o) => o.id === before.id)?.position ?? 0) + 0.5 : -0.5
    out.push(make(r, pos))
  }
  return out
}
