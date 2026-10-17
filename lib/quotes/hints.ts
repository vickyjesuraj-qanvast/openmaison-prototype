import type { QuoteItem } from '@/lib/db/schema'
import { belowCost, counts, lineCostMinor, lineTotalMinor, printsWord, unitPriceMinor } from './math'

/**
 * (pending modules S04 — 1.0's quote insights `src/app/api/quotes/insights` and the drafter's `set_global_margin`; card held:quotes: "the
 * editor's Maison AI sheet is empty · below-cost and low-margin hints can be worked out by rule") What Maison AI points at in a quote, by
 * rule from its own lines — never a model, never a market guess (1.0's "underquote" and "upsell" needed one; its margin warning did not):
 * - **below cost** — the line sells for less than it costs (the grid's own *Below cost* tag, REG-623);
 * - **thin margin** — it clears its cost by less than 10 % of its price (1.0's "dangerously low (<10%)");
 * - **no price yet** — a counted line at S$0 that prints no word (Draft with Maison AI's "to price" lines; 1.0's `needs_pricing`).
 * A line the client passed on, an optional line or one that prints a word (FOC, Inclusive …) is never flagged. Pure, client-safe.
 */
export const THIN_MARGIN_PCT = 10

type HintLine = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'status' | 'name' | 'qty' | 'costMinor' | 'markupMinor' | 'discountPct' | 'optional' | 'printAs'>
export type LineHint = { id: string; name: string; sellsMinor: number; costMinor: number; marginPct: number | null }
export type QuoteHints = { below: LineHint[]; thin: LineHint[]; unpriced: LineHint[]; priced: number }

/** The margin a line makes on its own price, in % (null when it sells for nothing). */
export const lineMarginPct = (l: Pick<QuoteItem, 'qty' | 'costMinor' | 'markupMinor' | 'discountPct'>) => {
  const sells = lineTotalMinor(l)
  return sells > 0 ? ((sells - lineCostMinor(l)) / sells) * 100 : null
}

export function quoteHints(items: HintLine[]): QuoteHints {
  /* a line under a section the client passed on is out with it (math.ts's rule) */
  const passed = new Set(items.filter((i) => i.kind === 'group' && i.status === 'Declined').map((i) => i.id))
  const under = (i: HintLine) => { let p = i.parentId; const seen = new Set<string>(); while (p && !seen.has(p)) { if (passed.has(p)) return true; seen.add(p); p = items.find((x) => x.id === p)?.parentId ?? null } return false }
  const live = items.filter((i) => counts({ ...i, optional: !!i.optional }) && !under(i))
  const hint = (i: HintLine): LineHint => ({ id: i.id, name: i.name.trim() || 'Untitled line', sellsMinor: lineTotalMinor(i), costMinor: lineCostMinor(i), marginPct: lineMarginPct(i) })
  const below = live.filter((i) => belowCost(i)).map(hint)
  const thin = live.filter((i) => !belowCost(i) && i.costMinor > 0 && lineTotalMinor(i) > 0 && (lineMarginPct(i) ?? 100) < THIN_MARGIN_PCT).map(hint)
  const unpriced = live.filter((i) => unitPriceMinor(i) === 0 && !printsWord(i) && i.qty > 0).map(hint)
  return { below, thin, unpriced, priced: live.filter((i) => lineTotalMinor(i) > 0).length }
}
