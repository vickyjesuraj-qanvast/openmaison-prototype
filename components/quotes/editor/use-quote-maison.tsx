'use client'

import { useMemo } from 'react'
import type { MaisonRow, MaisonSuggestion } from '@/lib/maison-ai'
import type { PriceBookItem, QuoteItem } from '@/lib/db/schema'
import { planBookMatches } from './items/match-book-dialog'
import { money2 } from '@/lib/quotes/math'
import { THIN_MARGIN_PCT, quoteHints, type LineHint } from '@/lib/quotes/hints'

/**
 * (pending modules S04 — 1.0's quote insights and its drafter's "set a global margin"; card held:quotes: "AI help in the editor … the editor's
 * Maison AI sheet is empty · below-cost and low-margin hints can be worked out by rule") The quote editor's Maison AI sheet, by rule from the
 * quote's own lines (lib/quotes/hints.ts): the lines that sell below cost, the ones under a 10 % margin, the ones with no price yet — each a
 * row that takes the grid to the line — and one markup set across the lines (the Items table's own Set a value, Markup (%), with its lines
 * ticked). Nothing is metered and nothing calls a model; it reads the lines as they are on the screen. The sheet's panel is the shell's
 * (`MaisonAnswerPanel`), so it reads as every other page's Maison AI.
 * (pending modules S10) The suggestions are the house contract (`{ answer | run }`) for the shell's own sheet (`MaisonAiSheet`) — with its Ask
 * box ("which lines are below cost?" asks the hint in other words) and Recent.
 * (pending modules S12 — 1.0's auto-match after a parse) First, when some lines not taken from My Items read like items in it, *Match them*
 * opens the Items table's review — their real cost makes the margin hints true (an uploaded quote's lines carry their price as their cost);
 * when none match but some lines aren't in My Items, the same review offers to add them.
 */
export function useQuoteMaison(o: { lines: QuoteItem[]; onGoTo: (ids: string[]) => void; onSetMarkup: (ids: string[]) => void; book?: PriceBookItem[]; onMatch?: () => void
  /** (pending modules S41b-1) the member sees costs — else no cost or margin hint (below cost, thin margin, a markup across the lines): the
      lines came with their cost folded into their price; "no price yet" and Match lines (as "link them") stay */
  costs?: boolean }): MaisonSuggestion[] {
  const costs = o.costs !== false
  const hints = useMemo(() => quoteHints(o.lines), [o.lines])
  const plan = useMemo(() => (o.book ? planBookMatches(o.lines, o.book) : null), [o.lines, o.book])
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const row = (h: LineHint, meta: string): MaisonRow => ({ id: h.id, label: h.name, meta, run: () => o.onGoTo([h.id]) })
  const pct = (h: LineHint) => (h.marginPct === null ? '' : `${Math.round(h.marginPct)}% margin`)
  /* (pending modules S12) the review's door leads the sheet — beside the margin hints, never in place of their "Check the margins" */
  const book: MaisonSuggestion[] = []
  if (plan && o.onMatch) {
    const match = o.onMatch
    if (plan.matches.length) book.push({ label: `${plural(plan.matches.length, 'line matches an item', 'lines match items')} in the Price book — ${costs ? 'take their cost' : 'link them'}`, run: () => match() })   // (pending modules S41b-1)
    else if (plan.fresh.length) book.push({ label: `${plural(plan.fresh.length, 'line isn’t', 'lines aren’t')} in the Price book yet — add them`, run: () => match() })
  }
  const out: MaisonSuggestion[] = []
  if (costs && hints.below.length) out.push({ label: `${plural(hints.below.length, 'line sells', 'lines sell')} below cost`, answer: {
    title: `${plural(hints.below.length, 'line sells', 'lines sell')} below cost`,
    text: 'Each earns less than it costs. Raise its price or its markup — or print it FOC if giving it away is the deal.',
    rows: hints.below.map((h) => row(h, `Sells ${money2(h.sellsMinor)} · costs ${money2(h.costMinor)}`)) } })
  if (costs && hints.thin.length) out.push({ label: `${plural(hints.thin.length, 'line', 'lines')} under a ${THIN_MARGIN_PCT}% margin`, answer: {
    title: `${plural(hints.thin.length, 'line', 'lines')} under a ${THIN_MARGIN_PCT}% margin`,
    text: `Each clears its cost by less than a tenth of its price — little room for a surprise on site.`,
    rows: hints.thin.map((h) => row(h, `${pct(h)} · sells ${money2(h.sellsMinor)}`)) } })
  if (hints.unpriced.length) out.push({ label: `${plural(hints.unpriced.length, 'line has', 'lines have')} no price yet`, answer: {
    title: `${plural(hints.unpriced.length, 'line has', 'lines have')} no price yet`,
    text: 'They print at S$0.00 — price them before the quote goes out.',
    rows: hints.unpriced.map((h) => row(h, 'S$0.00')) } })
  if (costs && !out.length && hints.priced) out.push({ label: 'Check the margins', answer: {
    title: 'Check the margins', text: `Every priced line clears its cost and a ${THIN_MARGIN_PCT}% margin. Nothing sells below cost and nothing is left unpriced.` } })
  /* the markup across the lines: the thin ones (below cost counts) when there are any, else every priced line */
  const weak = [...hints.below, ...hints.thin].map((h) => h.id)
  const priced = o.lines.filter((i) => i.kind === 'item' && i.costMinor > 0).map((i) => i.id)   // a markup is a share of the cost
  if (!costs) return [...book, ...out]   // (pending modules S41b-1) a markup is a share of the cost
  if (weak.length) out.push({ label: `Set a markup on the ${plural(weak.length, 'line', 'lines')} under ${THIN_MARGIN_PCT}%`, run: () => o.onSetMarkup(weak) })
  else if (priced.length) out.push({ label: 'Set one markup on every line', run: () => o.onSetMarkup(priced) })
  return [...book, ...out]
}
