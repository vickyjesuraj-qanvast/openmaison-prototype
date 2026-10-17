/**
 * (pending modules S41b-1 — 1.0's Cost & Margin Visibility: `omitLineItemCost` · `omitPriceBookCost` · `mergeStoredCost` ·
 * `mergeStoredPackageCost`, src/lib/cost-visibility.ts and quote-cost-restore.ts on `origin/deployment/qanvast`) What a member's browser is
 * sent of a quote line's and a price-book item's cost, and how a write from a member who doesn't see costs keeps them.
 *
 * **The projection.** 2.0 keeps a line as cost + mark-up (the unit price is their sum, REG-417), so a member who doesn't see costs is sent the
 * line with its cost folded into its mark-up: cost 0, mark-up = the unit price. Every price and total reads right; neither the cost nor the
 * mark-up is in the payload. A rebate is the Owner's alone (REG-596) and is sent as 0 to everyone else. The screens leave out what they would
 * draw from cost (the Cost · Markup · Margin columns, Below cost, the margin hints) by `seesCost`, never by a 0.
 *
 * **The write rule.** A member who doesn't see costs only ever moves a price: whatever their browser sends as cost + mark-up is read as the
 * unit price (their cost is 0 by the projection), the stored cost stays, and the mark-up becomes price − cost (1.0: "markup is re-derived from
 * cost and the new unit price"). A cost sent alone is never theirs to change. A rebate from anyone but an Owner keeps the stored one.
 * Pure, client-safe.
 */
import type { PriceBookItem, PriceBookSection } from '@/lib/db/schema'
import type { DocData } from '@/lib/templates/data'
import { seesCost, seesRebate, type CostSighted } from '@/lib/settings/cost-visibility'
import type { SavedLine, SavedSection } from './items-model'

export type CostSight = { /** cost, mark-up and margin */ costs: boolean; /** the Owner's rebate */ rebate: boolean }
export const FULL_SIGHT: CostSight = { costs: true, rebate: true }
export const sightOf = (v: CostSighted): CostSight => ({ costs: seesCost(v), rebate: seesRebate(v) })
const whole = (s: CostSight) => s.costs && s.rebate

type Priced = { costMinor: number; markupMinor: number }
/** A line (or a saved line, a book item) as `s` may see it. */
export function pricedFor<T extends Priced & { rebateMinor?: number }>(l: T, s: CostSight): T {
  if (whole(s)) return l
  const out = { ...l }
  if (!s.costs) { out.costMinor = 0; out.markupMinor = l.costMinor + l.markupMinor }
  if (!s.rebate && typeof l.rebateMinor === 'number') out.rebateMinor = 0
  return out
}
export const linesFor = <T extends Priced & { rebateMinor?: number }>(ls: T[], s: CostSight): T[] => (whole(s) ? ls : ls.map((l) => pricedFor(l, s)))

/** A price-book item as `s` may see it — its waste share stays (an ordering rule, not a figure of money). */
export const bookItemFor = <T extends PriceBookItem>(i: T, s: CostSight): T => (s.costs ? i : pricedFor(i, s))
export const bookItemsFor = <T extends PriceBookItem>(is: T[], s: CostSight): T[] => (s.costs ? is : is.map((i) => bookItemFor(i, s)))

/** A saved section's body (My Sections) as `s` may see it. */
export function sectionBodyFor(b: SavedSection, s: CostSight): SavedSection {
  if (whole(s)) return b
  const line = (l: SavedLine) => pricedFor(l, s)
  return { ...b, lines: b.lines.map(line), subs: b.subs.map((g) => ({ ...g, lines: g.lines.map(line) })) }
}
/** A saved section's stored row: its `linesJson` projected (an unreadable one is sent as it is — it carries nothing the parser can read). */
export function sectionFor<T extends PriceBookSection>(row: T, s: CostSight, parse: (json: string) => SavedSection | null): T {
  if (whole(s)) return row
  const body = parse(row.linesJson)
  return body ? { ...row, linesJson: JSON.stringify(sectionBodyFor(body, s)) } : { ...row, linesJson: JSON.stringify({ name: row.name, description: null, descriptionHtml: null, lines: [], subs: [] }) }
}

/** A kept version's snapshot JSON (`quote_versions.snapshot_json`: `{ quote, items, payments }`) with its lines projected. */
export function snapshotFor(json: string, s: CostSight): string {
  if (whole(s)) return json
  try {
    const raw = JSON.parse(json) as { items?: unknown[] }
    if (!Array.isArray(raw.items)) return json
    return JSON.stringify({ ...raw, items: raw.items.map((i) => (i && typeof i === 'object' && typeof (i as Priced).costMinor === 'number' ? pricedFor(i as Priced & { rebateMinor?: number }, s) : i)) })
  } catch { return json }
}

/** A quote's document data (the studio's Preview, a kept version, the template editor's Preview with) with its lines as `s` may see them —
    the print never shows a cost, but the page's Internal copy does, and the payload carried every line's record. */
export function docDataFor<T extends DocData>(d: T, s: CostSight): T {
  return whole(s) ? d : { ...d, items: linesFor(d.items, s) }
}

/* ── writes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A patch from a member who doesn't see costs, against what is stored: the cost stays; a sent mark-up (with any cost beside it) is the unit
 * price their screen showed, so the stored mark-up becomes that price − the stored cost. Nothing about price → nothing about cost.
 */
export function keptCostPatch(stored: Priced, patch: { costMinor?: number; markupMinor?: number }): { costMinor?: number; markupMinor?: number } {
  if (patch.markupMinor === undefined) return {}
  const price = (patch.costMinor ?? 0) + patch.markupMinor
  return { costMinor: stored.costMinor, markupMinor: price - stored.costMinor }
}
/** The same rule for values the SERVER read (a History entry's before-values): the price they imply, the stored cost kept. */
export function keptCostOfTrue(stored: Priced, values: { costMinor?: number; markupMinor?: number }): { costMinor?: number; markupMinor?: number } {
  if (values.costMinor === undefined && values.markupMinor === undefined) return {}
  const price = (values.costMinor ?? stored.costMinor) + (values.markupMinor ?? stored.markupMinor)
  return { costMinor: stored.costMinor, markupMinor: price - stored.costMinor }
}

/** What a hidden member's incoming line (whole — an Undo snapshot, a section's line) is written with: its price kept, the cost from `from`
    (the stored line, a deleted line's kept cost, its My Items entry — else none), the mark-up the difference; a rebate kept from `from`. */
export function withKeptCost<T extends Priced & { rebateMinor?: number }>(incoming: T, from: (Priced & { rebateMinor?: number }) | null, s: CostSight): T {
  const out = { ...incoming }
  if (!s.costs) {
    const price = incoming.costMinor + incoming.markupMinor
    const cost = from?.costMinor ?? 0
    out.costMinor = cost; out.markupMinor = price - cost
  }
  if (!s.rebate && 'rebateMinor' in incoming) out.rebateMinor = from?.rebateMinor ?? 0
  return out
}

/** A saved section's lines (no ids) matched to what is stored — 1.0's `mergeStoredPackageCost`: by its My Items entry first, then by name and
    category, each stored line used once; an unmatched line linked to My Items takes that item's cost. */
export function sectionWithKeptCosts(incoming: SavedSection, stored: SavedSection | null, s: CostSight, bookCost: (id: string) => Priced | null): SavedSection {
  if (whole(s)) return incoming
  const pool = stored ? [...stored.lines, ...stored.subs.flatMap((g) => g.lines)] : []
  const used = new Set<SavedLine>()
  const key = (l: SavedLine) => `${l.name.trim().toLowerCase()}|${(l.category ?? '').trim().toLowerCase()}`
  const match = (l: SavedLine): (Priced & { rebateMinor?: number }) | null => {
    const hit = (l.priceBookItemId ? pool.find((p) => !used.has(p) && p.priceBookItemId === l.priceBookItemId) : undefined) ?? pool.find((p) => !used.has(p) && key(p) === key(l))
    if (hit) { used.add(hit); return hit }
    return l.priceBookItemId ? bookCost(l.priceBookItemId) : null
  }
  const line = (l: SavedLine) => withKeptCost(l, match(l), s)
  return { ...incoming, lines: incoming.lines.map(line), subs: incoming.subs.map((g) => ({ ...g, lines: g.lines.map(line) })) }
}
