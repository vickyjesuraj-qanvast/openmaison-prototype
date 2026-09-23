import type { QuoteItem } from '@/lib/db/schema'
import { isPrintAs } from './items-model'

/**
 * Quote maths (owner 2026-09-11, build plan): Unit Price = Cost + Markup; line Total = Qty × Unit Price × (1 − Discount%),
 * before GST; Subtotal = Σ line totals of the lines the client has not declined; Discount = Σ what the line discounts took;
 * Additional Discount is % of the subtotal or a S$ amount — and (REG-559) any named discounts after it, each % or S$, taken
 * in order from what is left; GST = Σ line gst% on what is left, when the switch is on; Total = Subtotal − discounts + GST;
 * Margin (owners only) = (Total − GST − Σ Qty × Cost) / (Total − GST). Groups sum their children — and their children's
 * children (REG-558: a section inside a section). All money is integer cents; every product is rounded once, at the line.
 * Status (review 2026-09-11): the chip sits on the group row and a child's STATUS cell is empty (spec 03), so a group's
 * answer IS its children's — `countedLines` leaves out every line under a Declined group, and the server keeps the
 * children's own status in step with the group (app/quotes/items-actions.ts).
 * Print as (REG-555): a line that prints a word in place of its amount leaves the totals — except "On behalf", which counts
 * in the subtotal and carries no GST; FOC / Inclusive / Packaged work still costs the studio, so their cost meets the margin.
 */
export type Line = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'status' | 'qty' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct'> & {
  /** (REG-492) an optional line prints in its own section and leaves every total */
  optional?: boolean
  /** (REG-555) the word printed in place of the amount; null = the price */
  printAs?: string | null
  /** (REG-558) the line prints without a number */
  noNumber?: boolean
  /** (REG-596) a vendor rebate on the line, per unit — lowers the true cost the owner's margin counts */
  rebateMinor?: number
}
export type NamedDiscount = { id: string; label: string; mode: 'pct' | 'amount'; value: number }
export type QuotePricing = { additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean; /** (REG-559) the named discounts after the additional one */ discounts?: NamedDiscount[] }

/** (REG-559) The stored named discounts, defensively. */
export function parseDiscounts(json: string | null | undefined): NamedDiscount[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json)
    if (!Array.isArray(raw)) return []
    return raw.slice(0, 10).flatMap((d: Partial<NamedDiscount> | null) => (d && typeof d.id === 'string' ? [{ id: d.id, label: typeof d.label === 'string' ? d.label.slice(0, 60) : '', mode: d.mode === 'amount' ? 'amount' as const : 'pct' as const, value: typeof d.value === 'number' && Number.isFinite(d.value) && d.value >= 0 ? d.value : 0 }] : []))
  } catch { return [] }
}

export const unitPriceMinor = (l: Pick<Line, 'costMinor' | 'markupMinor'>) => l.costMinor + l.markupMinor
export const markupPct = (l: Pick<Line, 'costMinor' | 'markupMinor'>) => (l.costMinor > 0 ? (l.markupMinor / l.costMinor) * 100 : 0)
/** Qty × Unit Price × (1 − Discount%), rounded to the cent. */
export const lineTotalMinor = (l: Pick<Line, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) =>
  Math.round(l.qty * unitPriceMinor(l) * (1 - clampPct(l.discountPct) / 100))
export const lineDiscountMinor = (l: Pick<Line, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) =>
  Math.round(l.qty * unitPriceMinor(l)) - lineTotalMinor(l)
export const lineCostMinor = (l: Pick<Line, 'qty' | 'costMinor'>) => Math.round(l.qty * l.costMinor)
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0))
/** (REG-555) A line whose word replaces its amount — every Print as but "On behalf". */
export const printsWord = (l: Pick<Line, 'printAs'>) => isPrintAs(l.printAs) && l.printAs !== 'behalf'
/** (REG-555) Work the studio still pays for though the client reads a word: FOC · Inclusive · Packaged. */
export const bearsCost = (l: Pick<Line, 'kind' | 'status' | 'optional' | 'printAs'>) => l.kind === 'item' && l.status !== 'Declined' && !l.optional && (l.printAs === 'foc' || l.printAs === 'inclusive' || l.printAs === 'packaged')
/** A Declined line stays on the table but leaves every total; so does an optional line and a line that prints a word. */
export const counts = (l: Pick<Line, 'kind' | 'status' | 'optional' | 'printAs'>) => l.kind === 'item' && l.status !== 'Declined' && !l.optional && !printsWord(l)

/** Every id under a set of groups, however deep (REG-558). */
export function descendantIds<T extends Pick<Line, 'id' | 'parentId'>>(items: T[], roots: Iterable<string>): Set<string> {
  const out = new Set<string>(roots)
  let grew = true
  while (grew) { grew = false; for (const i of items) if (i.parentId && out.has(i.parentId) && !out.has(i.id)) { out.add(i.id); grew = true } }
  return out
}
/** A line's ancestors, nearest first. */
export function ancestorIds<T extends Pick<Line, 'id' | 'parentId'>>(items: T[], id: string): string[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const out: string[] = []
  let cur = byId.get(id)?.parentId ?? null
  while (cur && !out.includes(cur)) { out.push(cur); cur = byId.get(cur)?.parentId ?? null }
  return out
}
/** How deep a row sits: 0 at the top, 1 in a section, 2 in a sub-section. */
export const depthOf = <T extends Pick<Line, 'id' | 'parentId'>>(items: T[], id: string) => ancestorIds(items, id).length

/** The lines that price: items the client has not declined, outside any group the client declined. */
export function countedLines<T extends Line>(items: T[]): T[] {
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && i.status === 'Declined').map((i) => i.id))
  return items.filter((i) => counts(i) && !declined.has(i.id))
}

/** The lines that price (items, not groups); a group's own figures are the sums of its children — sub-sections included. */
export function groupTotals<T extends Line>(items: T[], groupId: string) {
  const group = items.find((i) => i.id === groupId)
  const under = descendantIds(items, [groupId])
  // An open group sums the lines that still count; a Declined group shows what the client passed on (its lines went with it).
  const kids = items.filter((i) => i.id !== groupId && under.has(i.id) && i.kind === 'item' && !i.optional && !printsWord(i) && (group?.status === 'Declined' || i.status !== 'Declined'))
  return {
    count: kids.length,
    costMinor: kids.reduce((s, i) => s + lineCostMinor(i), 0),
    markupMinor: kids.reduce((s, i) => s + Math.round(i.qty * i.markupMinor), 0),
    unitPriceMinor: kids.reduce((s, i) => s + Math.round(i.qty * unitPriceMinor(i)), 0),
    totalMinor: kids.reduce((s, i) => s + lineTotalMinor(i), 0),
  }
}

export type QuoteTotals = {
  itemCount: number
  subtotalMinor: number
  discountMinor: number
  additionalMinor: number
  /** (REG-559) Each named discount's applied amount, in order — the Totals block prints one line per entry. */
  discountLines: { id: string; label: string; minor: number }[]
  gstMinor: number
  totalMinor: number
  costMinor: number
  marginMinor: number
  marginPct: number
}

export function quoteTotals(items: Line[], q: QuotePricing): QuoteTotals {
  const lines = countedLines(items)
  const subtotalMinor = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  const discountMinor = lines.reduce((s, l) => s + lineDiscountMinor(l), 0)
  // (REG-555) The cost of FOC / Inclusive / Packaged lines is the studio's: it meets the margin though it prints as a word.
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && i.status === 'Declined').map((i) => i.id))
  /* (REG-596) A vendor rebate lowers the line's true cost: the owner's margin counts it, nothing printed does. */
  const trueCost = (l: Line) => lineCostMinor(l) - Math.min(lineCostMinor(l), Math.round(l.qty * (l.rebateMinor ?? 0)))   // a rebate per unit, never past the line's cost
  const costMinor = lines.reduce((s, l) => s + trueCost(l), 0) + items.filter((i) => bearsCost(i) && !declined.has(i.id)).reduce((s, l) => s + trueCost(l), 0)
  // The additional discount never exceeds what there is to discount (a degenerate negative subtotal discounts nothing).
  const base = Math.max(0, subtotalMinor)
  const applied = (mode: string, value: number, left: number) => Math.min(left, Math.max(0, mode === 'amount' ? Math.round(value * 100) : Math.round(base * clampPct(value) / 100)))
  let left = base
  const first = applied(q.additionalDiscountMode, q.additionalDiscountValue, left)
  left -= first
  // (REG-559) The named discounts follow, each a % of the subtotal or a S$ amount, taken from what is left.
  const discountLines = (q.discounts ?? []).map((d) => { const minor = applied(d.mode, d.value, left); left -= minor; return { id: d.id, label: d.label, minor } })
  const additionalMinor = first + discountLines.reduce((s, d) => s + d.minor, 0)
  const net = subtotalMinor - additionalMinor
  // GST per line on its share of what is left after the discounts; an "On behalf" line carries none (REG-555).
  const scale = subtotalMinor > 0 ? net / subtotalMinor : 0
  const gstMinor = q.gstEnabled ? lines.reduce((s, l) => s + (l.printAs === 'behalf' ? 0 : Math.round(lineTotalMinor(l) * scale * clampPct(l.gstPct) / 100)), 0) : 0
  const totalMinor = net + gstMinor
  const marginMinor = net - costMinor
  return { itemCount: lines.length, subtotalMinor, discountMinor, additionalMinor, discountLines, gstMinor, totalMinor, costMinor, marginMinor, marginPct: net > 0 ? (marginMinor / net) * 100 : 0 }
}

/**
 * (REG-532) By category, under the table: the counted lines' totals bucketed the way View by › Category buckets them — a line's own
 * category, else its group's, else Uncategorized (items-table.tsx `buildDisplay`). Biggest share first, Uncategorized last; `pct` is the
 * share of the subtotal, so the rows agree with the Subtotal line beside them. A bucket whose lines carry no price keeps its count.
 */
export type CategoryShare = { name: string; count: number; totalMinor: number; pct: number }
export function categoryShares<T extends Line & { category: string | null }>(items: T[], unlabelled = 'Uncategorized'): CategoryShare[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  const labelOf = (l: T) => { let cur: T | undefined = l; while (cur) { if (cur.category) return cur.category; cur = cur.parentId ? byId.get(cur.parentId) : undefined } return unlabelled }
  const acc = new Map<string, CategoryShare>()
  for (const l of countedLines(items)) {
    const name = labelOf(l)
    const cur = acc.get(name) ?? { name, count: 0, totalMinor: 0, pct: 0 }
    cur.count += 1; cur.totalMinor += lineTotalMinor(l); acc.set(name, cur)
  }
  const subtotal = [...acc.values()].reduce((s, c) => s + c.totalMinor, 0)
  return [...acc.values()]
    .map((c) => ({ ...c, pct: subtotal > 0 ? (c.totalMinor / subtotal) * 100 : 0 }))
    .sort((a, b) => (a.name === unlabelled ? 1 : b.name === unlabelled ? -1 : b.totalMinor - a.totalMinor || a.name.localeCompare(b.name)))
}
/** "44%" — one decimal under 10 so the small trades stay apart ("5.5%", "1.3%"). */
export const sharePct = (p: number) => `${p < 10 ? p.toFixed(1) : Math.round(p)}%`

/** "S$1,000.00" — the editor prints two decimals everywhere (1260:31277). */
export function money2(minor: number): string {
  const v = minor / 100
  const s = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))
  return `${v < 0 ? '−' : ''}S$${s}`
}
/** "10.99%" style — one or two decimals, no trailing zeros ("10%" · "12.5%"). */
export const pct = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`

/** Line numbering (1260:31259 "1", "4.1"): top-level rows count 1…n; a group's children n.1, n.2 — and a sub-section's n.1.1 (REG-558).
    A line marked "no number" gets '' and the count passes over it. */
export function numberItems<T extends Line & { position?: number }>(items: T[], parentId: string | null = null, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  // In position order, not array order: an optimistic reorder (a drag's drop, REG-571) moves positions without re-sorting the array.
  const siblings = items.filter((i) => i.parentId === parentId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  let idx = 0
  for (const s of siblings) {
    if (s.noNumber && s.kind === 'item') { out.set(s.id, ''); continue }
    idx += 1
    const n = `${prefix}${idx}`
    out.set(s.id, n)
    if (s.kind === 'group') for (const [k, v] of numberItems(items, s.id, `${n}.`)) out.set(k, v)
  }
  return out
}

/** Siblings in `position` order, then each group's children right after it (the table's row order). */
export function flattenItems<T extends Line & { position: number }>(items: T[]): T[] {
  const byParent = new Map<string | null, T[]>()
  for (const i of items) { const k = i.parentId ?? null; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k)!.push(i) }
  for (const list of byParent.values()) list.sort((a, b) => a.position - b.position)
  const out: T[] = []
  const walk = (parent: string | null) => { for (const i of byParent.get(parent) ?? []) { out.push(i); if (i.kind === 'group') walk(i.id) } }
  walk(null)
  return out
}
