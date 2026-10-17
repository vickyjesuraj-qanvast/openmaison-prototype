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
  /** (S44T — call C1) on a section: its work is priced after the contract — out of the quote's total, its split and its margin */
  pricedAfter?: boolean | null
}
export type NamedDiscount = { id: string; label: string; mode: 'pct' | 'amount'; value: number }
export type QuotePricing = { additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean; /** (REG-559) the named discounts after the additional one */ discounts?: NamedDiscount[]
  /** (S44O — call C3) how the quote's GST is rounded: the rule stamped on it when it first went to its client (`quotes.gst_rule`); null = a
      quote not yet with its client, which follows today's rule (`GST_RULE_NOW`) */
  gstRule?: string | null }

/**
 * (S44O — call C3 · UAT rows 282 · 283, Dyel's GST drifting by cents; as recommended — her UAT ask 2026-10-15) How GST is rounded.
 *   'rate' — today's rule: each rate's GST is the rate × that rate's taxable net (its lines after the discounts), rounded ONCE per rate — as a
 *            studio's own paper takes 9% of the subtotal. On-behalf lines carry none.
 *   'line' — the rule before: each line's GST rounded on its own and the pieces added. A quote that went to its client under it keeps it, so
 *            its figures never move (repair R163 stamped those; the first send stamps every other — lib/quotes/gst-rule-server.ts).
 * Net + GST = Total, always.
 */
export const GST_RULES = ['rate', 'line'] as const
export type GstRule = (typeof GST_RULES)[number]
export const GST_RULE_NOW: GstRule = 'rate'
export const gstRuleOf = (stamp: string | null | undefined): GstRule => (stamp === 'line' ? 'line' : stamp === 'rate' ? 'rate' : GST_RULE_NOW)

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

/**
 * (REG-623, parity Q-13) A line that sells below what it costs: its total after the line discount, before GST, is under Qty × Cost.
 * 1.0's cost-exceeds-price warning (B-48): a line whose price is a word (FOC, Inclusive, By client …) is deliberate and never
 * flagged, nor is a line with nothing to sell yet (a zero total — an unpriced row or a 100 % discount), nor one the client declined.
 */
export const belowCost = (l: Pick<Line, 'kind' | 'status' | 'printAs' | 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) => {
  if (l.kind !== 'item' || l.status === 'Declined' || printsWord(l)) return false
  const total = lineTotalMinor(l)
  return total > 0 && lineCostMinor(l) > total
}

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

/* ── (S44I — the team's sections prototype, B1; her ask 2026-10-15) the rules a ticked set of rows follows, pure — the bulk bar, the drag and
   the server (app/quotes/items-actions.ts) read the same ones ── */
/** The refusal when the ticked lines all sit in one sub-section (the server says the same, word for word). */
export const GROUP_DEPTH_RULE = 'Sections go two levels deep — these lines are in a sub-section already'
/** The ticked rows without those a ticked section carries with it — moving the section moves them. */
export function carried<T extends Pick<Line, 'id' | 'parentId'>>(items: T[], ids: Iterable<string>): string[] {
  const want = new Set(ids)
  return items.filter((i) => want.has(i.id) && !ancestorIds(items, i.id).some((a) => want.has(a))).map((i) => i.id)
}
/** What *Group into…* makes of the ticked lines: a section at the top, a sub-section in the one section they share, or the rule that refuses
    (they share a sub-section already — sections go two levels deep). Lines from several places make a section at the top. */
export function groupLevel<T extends Pick<Line, 'id' | 'parentId' | 'kind'>>(items: T[], ids: Iterable<string>): 'section' | 'sub-section' | { refused: string } {
  const want = new Set(ids)
  const lines = items.filter((i) => want.has(i.id) && i.kind === 'item')
  const parents = new Set(lines.map((l) => l.parentId ?? null))
  if (parents.size !== 1) return 'section'
  const only = [...parents][0] ?? null
  if (!only) return 'section'
  const host = items.find((i) => i.id === only)
  return host?.parentId ? { refused: GROUP_DEPTH_RULE } : 'sub-section'
}
/** The sections the ticked rows may join, in the table's order: never one of them or inside one of them; a section joins only a top section,
    and only while it holds no sub-sections (REG-558's two levels); a section every ticked row already sits in is left out. */
export function moveTargets<T extends Pick<Line, 'id' | 'parentId' | 'kind'> & { position: number; pricedAfter?: boolean | null }>(items: T[], ids: Iterable<string>): T[] {
  const rows = carried(items, ids).map((id) => items.find((i) => i.id === id)!).filter(Boolean)
  if (!rows.length) return []
  const blocks = descendantIds(items, rows.filter((r) => r.kind === 'group').map((r) => r.id))
  const sectionMoves = rows.some((r) => r.kind === 'group')
  const withSubs = rows.some((r) => r.kind === 'group' && (items.some((x) => x.parentId === r.id && x.kind === 'group') || !!r.pricedAfter))   // (S44T, C1) a priced-after section stays at the top too
  return flattenItems(items).filter((g) => g.kind === 'group' && !blocks.has(g.id)
    && !(sectionMoves && (g.parentId || withSubs))
    && !rows.every((r) => (r.parentId ?? null) === g.id))
}

/** (REG-596) A vendor rebate lowers the line's true cost — a rebate per unit, never past the line's cost. The owner's figures count it. */
/** (fix-D, D-07) Sign-aware: an omission (a minus quantity on a variation order) credits its cost as well as its price, its rebate with it. */
export const trueCostMinor = (l: Pick<Line, 'qty' | 'costMinor' | 'rebateMinor'>) => {
  const cost = lineCostMinor(l)
  return cost - Math.sign(cost) * Math.min(Math.abs(cost), Math.abs(Math.round(l.qty * (l.rebateMinor ?? 0))))
}

/** (S44T — call C1, UAT rows 277 · 278 · 280 · 281 · 317 · 318) Every row under a section priced after the contract (the sections included):
    estimates the quote prints after its own items — never in its total, its payment split or its margin. */
export function afterContractIds<T extends Pick<Line, 'id' | 'parentId' | 'kind' | 'pricedAfter'>>(items: T[]): Set<string> {
  return descendantIds(items, items.filter((i) => i.kind === 'group' && i.pricedAfter).map((i) => i.id))
}
/**
 * (S44I — M17, UAT row 323 · 274; as recommended, her UAT ask 2026-10-15) A section may print a word in place of its amount — FOC, Inclusive,
 * KIV, By client, Packaged or the studio's own word — set from its row's ⋮ › Print as. Each of its lines without a word of its own then counts
 * as if it carried the section's: out of the totals, and its cost still the studio's for FOC · Inclusive · Packaged (REG-555's rules). A
 * section summing ITSELF (`stopAt`) keeps its own lines — the grid strikes that figure under the word, as a line's own word does.
 */
export function withSectionWords<T extends Pick<Line, 'id' | 'parentId' | 'kind' | 'printAs'> & { printAsText?: string | null }>(items: T[], stopAt?: string): T[] {
  const skip = new Set<string>(stopAt ? [stopAt, ...ancestorIds(items, stopAt)] : [])
  const words = new Map(items.filter((g) => g.kind === 'group' && printsWord(g) && !skip.has(g.id)).map((g) => [g.id, g]))
  if (!words.size) return items
  const byId = new Map(items.map((i) => [i.id, i]))
  return items.map((i) => {
    if (i.kind !== 'item' || isPrintAs(i.printAs)) return i
    let p = i.parentId
    const seen = new Set<string>()
    while (p && !seen.has(p)) { const g = words.get(p); if (g) return { ...i, printAs: g.printAs, printAsText: g.printAsText ?? null }; seen.add(p); p = byId.get(p)?.parentId ?? null }
    return i
  })
}
/** (S44I — M17) The section whose word a line prints under (the nearest one), when the line has none of its own. */
export function sectionWordOf<T extends Pick<Line, 'id' | 'parentId' | 'kind' | 'printAs'>>(items: T[], line: T): T | null {
  if (line.kind !== 'item' || isPrintAs(line.printAs)) return null
  const byId = new Map(items.map((i) => [i.id, i]))
  let p = line.parentId
  const seen = new Set<string>()
  while (p && !seen.has(p)) { const g = byId.get(p); if (g && printsWord(g)) return g; seen.add(p); p = g?.parentId ?? null }
  return null
}
/** The lines that price: items the client has not declined, outside any group the client declined — and (S44T, C1) outside the sections
    priced after the contract. */
export function countedLines<T extends Line>(items: T[]): T[] {
  items = withSectionWords(items)   // (S44I — M17) a line in a section that prints a word counts as that word does
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && (i.status === 'Declined' || i.pricedAfter)).map((i) => i.id))
  return items.filter((i) => counts(i) && !declined.has(i.id))
}

/** The lines that price (items, not groups); a group's own figures are the sums of its children — sub-sections included. */
export function groupTotals<T extends Line>(items: T[], groupId: string) {
  items = withSectionWords(items, groupId)   // (S44I — M17) a sub-section that prints a word leaves its section's sum; the section's own word strikes its figure in the grid
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
  items = withSectionWords(items)   // (S44I — M17)
  const lines = countedLines(items)
  const subtotalMinor = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  const discountMinor = lines.reduce((s, l) => s + lineDiscountMinor(l), 0)
  // (REG-555) The cost of FOC / Inclusive / Packaged lines is the studio's: it meets the margin though it prints as a word.
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && (i.status === 'Declined' || i.pricedAfter)).map((i) => i.id))   // (S44T, C1) an estimate's cost is not the contract's
  /* (REG-596) A vendor rebate lowers the line's true cost: the owner's margin counts it, nothing printed does. */
  const trueCost = trueCostMinor
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
  // GST on each line's share of what is left after the discounts; an "On behalf" line carries none (REG-555).
  const scale = subtotalMinor !== 0 ? net / subtotalMinor : 0   // (Projects round 5) a variation order's net omission (below zero) keeps its GST
  const gstMinor = q.gstEnabled ? gstOfLines(lines, scale, gstRuleOf(q.gstRule)) : 0   // (S44O — call C3) rounded once per rate
  const totalMinor = net + gstMinor
  const marginMinor = net - costMinor
  /* (fix-D, D-07) a variation order's net can be below zero (an omission): its margin is the change less the change in cost, on the change's size */
  return { itemCount: lines.length, subtotalMinor, discountMinor, additionalMinor, discountLines, gstMinor, totalMinor, costMinor, marginMinor, marginPct: net !== 0 ? (marginMinor / Math.abs(net)) * 100 : 0 }
}

/** (S44O — call C3) The quote's GST from its counted lines and the discounts' scale, by the rounding rule it carries: once per rate (each rate's
    taxable net × the rate) or, for a quote that went out before, per line. */
export function gstOfLines(lines: Pick<Line, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'printAs'>[], scale: number, rule: GstRule = GST_RULE_NOW): number {
  const taxed = lines.filter((l) => l.printAs !== 'behalf')
  if (rule === 'line') return taxed.reduce((s, l) => s + Math.round(lineTotalMinor(l) * scale * clampPct(l.gstPct) / 100), 0)
  const byRate = new Map<number, number>()
  for (const l of taxed) { const r = clampPct(l.gstPct); if (r > 0) byRate.set(r, (byRate.get(r) ?? 0) + lineTotalMinor(l)) }
  let gst = 0
  for (const [rate, net] of byRate) gst += Math.round(net * scale * rate / 100)
  return gst
}

/**
 * (REG-532) By category, under the table: the counted lines' totals bucketed the way View by › Category buckets them — a line's own
 * category, else its group's, else Uncategorized (items-table.tsx `buildDisplay`). Biggest share first, Uncategorized last; `pct` is the
 * share of the subtotal, so the rows agree with the Subtotal line beside them. A bucket whose lines carry no price keeps its count.
 */
export type CategoryShare = {
  name: string; count: number; totalMinor: number; pct: number
  /** (REG-623, parity Q-14) What the category's lines cost the studio — rebates counted, FOC / Inclusive / Packaged work included — and
      its margin on its own lines before the quote's discounts (null when nothing in it sells). Owners only on screen. */
  costMinor: number; marginPct: number | null
}
export function categoryShares<T extends Line & { category: string | null }>(items: T[], unlabelled = 'Uncategorized'): CategoryShare[] {
  items = withSectionWords(items)   // (S44I — M17)
  const byId = new Map(items.map((i) => [i.id, i]))
  const labelOf = (l: T) => { let cur: T | undefined = l; while (cur) { if (cur.category) return cur.category; cur = cur.parentId ? byId.get(cur.parentId) : undefined } return unlabelled }
  const acc = new Map<string, CategoryShare>()
  for (const l of countedLines(items)) {
    const name = labelOf(l)
    const cur = acc.get(name) ?? { name, count: 0, totalMinor: 0, pct: 0, costMinor: 0, marginPct: null }
    cur.count += 1; cur.totalMinor += lineTotalMinor(l); cur.costMinor += trueCostMinor(l); acc.set(name, cur)
  }
  // Work the client reads as a word but the studio still pays for (quoteTotals' rule) meets its own category's margin.
  const declined = descendantIds(items, items.filter((i) => i.kind === 'group' && (i.status === 'Declined' || i.pricedAfter)).map((i) => i.id))
  for (const l of items) { if (!bearsCost(l) || declined.has(l.id)) continue; const c = acc.get(labelOf(l)); if (c) c.costMinor += trueCostMinor(l) }
  /* (fix-D, D-07) a variation order's categories can be below zero: each one's share is of the change's whole size, its margin on its own size */
  const subtotal = [...acc.values()].reduce((s, c) => s + Math.abs(c.totalMinor), 0)
  return [...acc.values()]
    .map((c) => ({ ...c, pct: subtotal > 0 ? (Math.abs(c.totalMinor) / subtotal) * 100 : 0, marginPct: c.totalMinor !== 0 ? ((c.totalMinor - c.costMinor) / Math.abs(c.totalMinor)) * 100 : null }))
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
/** (sweep S1 · U-03) A loss prints the house minus: "−40%", never the hyphen "-40%". */
export const pct = (p: number) => { const a = Math.abs(p); return `${p < 0 ? '−' : ''}${Number.isInteger(a) ? a : Number(a.toFixed(2))}%` }

/** (S44T — call C1 · S44I) A top section priced after the contract stands after the contract's own rows, wherever it was stored: the grid
    gathers them at the table's end under their divider, the print after its items. Siblings otherwise keep their stored order. */
const rowOrder = (a: { parentId?: string | null; position?: number; pricedAfter?: boolean | null }, b: typeof a) =>
  (!a.parentId && !b.parentId ? Number(!!a.pricedAfter) - Number(!!b.pricedAfter) : 0) || (a.position ?? 0) - (b.position ?? 0)

/** (S44I — row 308, the triage's §12.5) Why a row the grid shows carries no number: the print passes over it, so the grid does too. */
export type NoNumber = 'skip' | 'hidden' | 'empty'
export function whyNoNumber<T extends Pick<Line, 'id' | 'parentId' | 'kind' | 'noNumber'> & { visibility?: string | null }>(items: T[], row: T): NoNumber | null {
  if (row.kind === 'item') return row.noNumber ? 'skip' : row.visibility === 'hidden' ? 'hidden' : null
  return row.parentId && !items.some((c) => c.parentId === row.id && c.kind === 'item') ? 'empty' : null
}

/** Line numbering (1260:31259 "1", "4.1"): top-level rows count 1…n; a group's children n.1, n.2 — and a sub-section's n.1.1 (REG-558).
    A line marked "no number" gets '' and the count passes over it. (S44I — row 308) So do a line hidden from the client and a sub-section
    with no line in it — the print never shows them, so "1.1 · 1.2" in the grid is "1.1 · 1.2" on the paper. */
export function numberItems<T extends Line & { position?: number; visibility?: string | null }>(items: T[], parentId: string | null = null, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  // In position order, not array order: an optimistic reorder (a drag's drop, REG-571) moves positions without re-sorting the array.
  const siblings = items.filter((i) => (i.parentId ?? null) === parentId).sort(rowOrder)
  let idx = 0
  for (const s of siblings) {
    if (whyNoNumber(items, s)) { out.set(s.id, ''); continue }
    idx += 1
    const n = `${prefix}${idx}`
    out.set(s.id, n)
    if (s.kind === 'group') for (const [k, v] of numberItems(items, s.id, `${n}.`)) out.set(k, v)
  }
  return out
}

/** Siblings in `position` order, then each group's children right after it (the table's row order). (S44I) A top section priced after the
    contract comes after the rest (`rowOrder`). */
export function flattenItems<T extends Pick<Line, 'id' | 'parentId' | 'kind'> & { position: number; pricedAfter?: boolean | null }>(items: T[]): T[] {
  const byParent = new Map<string | null, T[]>()
  for (const i of items) { const k = i.parentId ?? null; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k)!.push(i) }
  for (const list of byParent.values()) list.sort(rowOrder)
  const out: T[] = []
  const walk = (parent: string | null) => { for (const i of byParent.get(parent) ?? []) { out.push(i); if (i.kind === 'group') walk(i.id) } }
  walk(null)
  return out
}
