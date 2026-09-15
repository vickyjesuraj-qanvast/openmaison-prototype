import type { QuoteItem } from '@/lib/db/schema'

/**
 * Quote maths (owner 2026-09-11, build plan): Unit Price = Cost + Markup; line Total = Qty × Unit Price × (1 − Discount%),
 * before GST; Subtotal = Σ line totals of the lines the client has not declined; Discount = Σ what the line discounts took;
 * Additional Discount is % of the subtotal or a S$ amount; GST = Σ line gst% on what is left, when the switch is on;
 * Total = Subtotal − Additional Discount + GST; Margin (owners only) = (Total − GST − Σ Qty × Cost) / (Total − GST).
 * Groups sum their children. All money is integer cents; every product is rounded once, at the line.
 * Status (review 2026-09-11): the chip sits on the group row and a child's STATUS cell is empty (spec 03), so a group's
 * answer IS its children's — `countedLines` leaves out every line under a Declined group, and the server keeps the
 * children's own status in step with the group (app/quotes/items-actions.ts).
 */
export type Line = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'status' | 'qty' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct'>
export type QuotePricing = { additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean }

export const unitPriceMinor = (l: Pick<Line, 'costMinor' | 'markupMinor'>) => l.costMinor + l.markupMinor
export const markupPct = (l: Pick<Line, 'costMinor' | 'markupMinor'>) => (l.costMinor > 0 ? (l.markupMinor / l.costMinor) * 100 : 0)
/** Qty × Unit Price × (1 − Discount%), rounded to the cent. */
export const lineTotalMinor = (l: Pick<Line, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) =>
  Math.round(l.qty * unitPriceMinor(l) * (1 - clampPct(l.discountPct) / 100))
export const lineDiscountMinor = (l: Pick<Line, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) =>
  Math.round(l.qty * unitPriceMinor(l)) - lineTotalMinor(l)
export const lineCostMinor = (l: Pick<Line, 'qty' | 'costMinor'>) => Math.round(l.qty * l.costMinor)
const clampPct = (p: number) => Math.min(100, Math.max(0, Number.isFinite(p) ? p : 0))
/** A Declined line stays on the table but leaves every total. */
export const counts = (l: Pick<Line, 'kind' | 'status'>) => l.kind === 'item' && l.status !== 'Declined'
/** The lines that price: items the client has not declined, outside any group the client declined. */
export function countedLines<T extends Line>(items: T[]): T[] {
  const declinedGroups = new Set(items.filter((i) => i.kind === 'group' && i.status === 'Declined').map((i) => i.id))
  return items.filter((i) => counts(i) && !(i.parentId && declinedGroups.has(i.parentId)))
}

/** The lines that price (items, not groups); a group's own figures are the sums of its children. */
export function groupTotals<T extends Line>(items: T[], groupId: string) {
  const group = items.find((i) => i.id === groupId)
  // An open group sums the lines that still count; a Declined group shows what the client passed on (its lines went with it).
  const kids = items.filter((i) => i.parentId === groupId && i.kind === 'item' && (group?.status === 'Declined' || i.status !== 'Declined'))
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
  const costMinor = lines.reduce((s, l) => s + lineCostMinor(l), 0)
  // The additional discount never exceeds what there is to discount (a degenerate negative subtotal discounts nothing).
  const base = Math.max(0, subtotalMinor)
  const additionalMinor = Math.min(base, Math.max(0, q.additionalDiscountMode === 'amount'
    ? Math.round(q.additionalDiscountValue * 100)
    : Math.round(base * clampPct(q.additionalDiscountValue) / 100)))
  const net = subtotalMinor - additionalMinor
  // GST per line on its share of what is left after the additional discount.
  const scale = subtotalMinor > 0 ? net / subtotalMinor : 0
  const gstMinor = q.gstEnabled ? lines.reduce((s, l) => s + Math.round(lineTotalMinor(l) * scale * clampPct(l.gstPct) / 100), 0) : 0
  const totalMinor = net + gstMinor
  const marginMinor = net - costMinor
  return { itemCount: lines.length, subtotalMinor, discountMinor, additionalMinor, gstMinor, totalMinor, costMinor, marginMinor, marginPct: net > 0 ? (marginMinor / net) * 100 : 0 }
}

/** "S$1,000.00" — the editor prints two decimals everywhere (1260:31277). */
export function money2(minor: number): string {
  const v = minor / 100
  const s = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))
  return `${v < 0 ? '−' : ''}S$${s}`
}
/** "10.99%" style — one or two decimals, no trailing zeros ("10%" · "12.5%"). */
export const pct = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`

/** Line numbering (1260:31259 "1", "4.1"): top-level rows count 1…n; a group's children n.1, n.2. */
export function numberItems<T extends Line>(items: T[], parentId: string | null = null, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  const siblings = items.filter((i) => i.parentId === parentId)
  siblings.forEach((s, idx) => {
    const n = `${prefix}${idx + 1}`
    out.set(s.id, n)
    if (s.kind === 'group') for (const [k, v] of numberItems(items, s.id, `${n}.`)) out.set(k, v)
  })
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
