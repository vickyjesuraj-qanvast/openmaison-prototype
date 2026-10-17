/**
 * (pending modules S12 — card held:price-book, "Matching quote lines to the book (cost filled after an upload, new-item suggestions) · revisit:
 * 1.0's matcher is plain code (synonyms + overlap)") A quote line matched to My Items, by rule — 1.0's `src/lib/price-book-matcher.ts`
 * (`matchItemsToPriceBook`) in 2.0's words: the line's words against each item's (overlap of the two sets, Jaccard), with the trade and the unit
 * as two smaller votes — 70 · 15 · 15 — and 1.0's two bars: a **sure** match at 0.75, a **close** one at 0.50, else none. An item sold by
 * another unit is never a match (a cost a square foot is not a Lot's cost). 2.0 reads an item's
 * name as well as its description (1.0 read the description alone, so an item with only a name never matched — audit 13, B-62), and the words
 * are the X-Ray's (lib/quotes/line-words.ts: the glue dropped, plurals and trade words read alike) with 1.0's renovation synonyms on top.
 * A price more than 15 % off the item's is said (1.0's discrepancy). Nothing here calls a model. Pure, client-safe: the quote editor's
 * dialog previews with it and the server applies with it.
 *
 * What a match does to a line (`bookFill`): it points at the item, takes the item's **cost** — the client's price stays exactly as it was, the
 * markup takes the difference — and fills only what the line left empty (vendor, link, unit, category, its kind's glyph). 1.0 filled the
 * same: cost, the link, the vendor (its waste and cost type, which 2.0's line has no place for).
 */
import { normUnit, sameTrade, tokens } from '@/lib/quotes/line-words'
import { isItemKind } from '@/lib/quotes/items-model'

export type MatchTier = 'sure' | 'close' | 'none'
/** 1.0's bars (`tier`: high ≥ 0.75, suggested ≥ 0.50). */
export const SURE_MATCH = 0.75
export const CLOSE_MATCH = 0.5
/** 1.0's `priceDiscrepancy`: the line's price more than this share off the item's. */
export const PRICE_GAP_PCT = 15

/** What the matcher reads of an item — My Items' rows as the editor holds them. */
export type BookEntry = { id: string; name: string; description: string | null; category: string | null; unit: string | null; costMinor: number; markupMinor: number
  vendor: string | null; link?: string | null; kind?: string | null; status?: string }
/** What it reads of a quote line. */
export type LineIn = { id: string; name: string; description: string | null; category: string | null; unit: string | null; costMinor: number; markupMinor: number
  qty: number; kind?: string; priceBookItemId?: string | null; vendor?: string | null }
export type LineMatch = { lineId: string; item: BookEntry | null; score: number; tier: MatchTier
  /** the line's price against the item's, in % (+ above, − below); null when either has none */ gapPct: number | null }

/* 1.0's RENOVATION_SYNONYMS, said once each: a phrase becomes one word before the words are read, a word becomes the one its group reads as.
   (The X-Ray's own SAME already reads hacking · demolition · removal as one, tiling as tile, painting as paint, haulage as disposal.) */
const PHRASES: [RegExp, string][] = [
  [/\bwater closets?\b/g, 'wc'], [/\btoilet bowls?\b/g, 'wc'], [/\bwash ?basins?\b/g, 'basin'],
  [/\bdistribution boards?\b/g, 'db'], [/\bswitch ?boards?\b/g, 'db'],
  [/\bair[- ]?con(?:ditioning|ditioners?)?\b/g, 'aircon'], [/\bpower points?\b/g, 'powerpoint'],
  [/\bbuilt[- ]in wardrobes?\b/g, 'wardrobe'], [/\bcounter tops?\b/g, 'countertop'], [/\bshoe (?:racks?|storage)\b/g, 'shoe cabinet'],
  [/\b(?:tv|accent) walls?\b/g, 'feature wall'],
  [/\bluxury vinyl\b/g, 'vinyl'], [/\bnatural stone\b/g, 'marble'],
  [/\b(?:false|plaster|gypsum|suspended) ceilings?\b/g, 'ceiling'], [/\bl[- ]box(?:es)?\b/g, 'lbox'],
  [/\bshower (?:doors?|screens?)\b/g, 'showerscreen'], [/\b(?:slide|track) doors?\b/g, 'sliding door'],
  [/\b(?:floor )?level(?:l)?ing\b/g, 'screed'], [/\bdivider walls?\b/g, 'partition'], [/\bwaste removal\b/g, 'disposal'],
]
const CANON: Record<string, string> = {
  teardown: 'hack', rubbish: 'disposal', debris: 'disposal', bowl: 'wc',
  sink: 'basin', faucet: 'tap', mixer: 'tap', geyser: 'heater', pipe: 'plumb', piping: 'plumb', repiping: 'plumb',
  spotlight: 'downlight', outlet: 'powerpoint', point: 'powerpoint',
  cupboard: 'cabinet', closet: 'wardrobe', benchtop: 'countertop', lam: 'laminate', melamine: 'laminate',
  spc: 'vinyl', lvt: 'vinyl', porcelain: 'homogeneous', ceramic: 'homogeneous', granite: 'marble',
  pelmet: 'lbox', cove: 'lbox', moulding: 'cornice', molding: 'cornice', emulsion: 'paint', coating: 'paint',
  membrane: 'waterproof', leveling: 'screed', levelling: 'screed', divider: 'partition',
}
/** A text's words, as both sides of a match read them. */
export function matchWords(text: string): Set<string> {
  let t = text.toLowerCase().replace(/[×]/g, ' x ')
  for (const [re, to] of PHRASES) t = t.replace(re, to)
  return new Set(tokens(t).map((w) => CANON[w] ?? w))
}
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0
  let n = 0
  for (const w of a) if (b.has(w)) n++
  return n / (a.size + b.size - n)
}

/** The price a line or an item sells at, a unit. */
export const unitPriceOf = (x: { costMinor: number; markupMinor: number }) => x.costMinor + x.markupMinor

type Prepared = { e: BookEntry; name: Set<string>; all: Set<string>; unit: string | null }
/** The book read once: each item's words, and which items carry each word — a line is scored only against the items sharing a word with it
    (no shared word is never a match), so a book of thousands reads a quote in a blink. Kept per book array (the editor's state holds one). */
type Index = { items: Prepared[]; byWord: Map<string, number[]>
  /** a line's best item by what decides it — its words, trade, unit and vendor (its price only moves the gap): a cell edit elsewhere, or a
      price typed, reads nothing again */ best: Map<string, { p: Prepared; score: number } | null> }
const INDEX = new WeakMap<readonly BookEntry[], Index>()
function indexOf(book: readonly BookEntry[]): Index {
  const hit = INDEX.get(book)
  if (hit) return hit
  const items = book.map((e) => ({ e, name: matchWords(e.name), all: matchWords(`${e.name} ${e.description ?? ''}`), unit: normUnit(e.unit) }))
  const byWord = new Map<string, number[]>()
  items.forEach((p, k) => { for (const w of p.all) { const l = byWord.get(w); if (l) l.push(k); else byWord.set(w, [k]) } })
  const ix: Index = { items, byWord, best: new Map() }
  INDEX.set(book, ix)
  return ix
}

function best(line: LineIn, ix: Index): LineMatch {
  const key = [line.name, line.description ?? '', line.category ?? '', line.unit ?? '', line.vendor ?? ''].join('\u0001')
  let top = ix.best.get(key)
  if (top === undefined) {
    top = search(line, ix)
    if (ix.best.size > 5000) ix.best.clear()
    ix.best.set(key, top)
  }
  if (!top) return { lineId: line.id, item: null, score: 0, tier: 'none', gapPct: null }
  const tier: MatchTier = top.score >= SURE_MATCH ? 'sure' : top.score >= CLOSE_MATCH ? 'close' : 'none'
  const item = tier === 'none' ? null : top.p.e
  const mine = unitPriceOf(line), theirs = item ? unitPriceOf(item) : 0
  return { lineId: line.id, item, score: Math.round(top.score * 100) / 100, tier, gapPct: item && mine > 0 && theirs > 0 ? Math.round(((mine - theirs) / theirs) * 1000) / 10 : null }
}
function search(line: LineIn, ix: Index): { p: Prepared; score: number } | null {
  const name = matchWords(line.name), all = matchWords(`${line.name} ${line.description ?? ''}`)
  const unit = normUnit(line.unit)
  const near = new Set<number>()
  for (const w of all) for (const k of ix.byWord.get(w) ?? []) near.add(k)
  let top: { p: Prepared; score: number } | null = null
  for (const k of [...near].sort((a, b) => a - b)) {   // the book's order, so a tie goes the same way every time
    const p = ix.items[k]!
    /* 70 · 15 · 15 (1.0): the words — the names alone, or with their descriptions, whichever reads closer — the trade, the unit */
    if (unit && p.unit && unit !== p.unit) continue   // a cost per sqft is never a Lot's cost — another unit is another item (1.0 matched it, B-58's kin)
    if (all.has('hack') !== p.all.has('hack')) continue   // taking out is never putting in — the X-Ray's rule (B-29): "hack the tiles" is not "lay the tiles"
    const words = Math.max(jaccard(name, p.name), jaccard(all, p.all))
    if (words === 0) continue   // no word in common is never a match, whatever the trade and the unit
    const score = words * 0.7 + (sameTrade(line.category, p.e.category) ? 0.15 : 0) + (unit && unit === p.unit ? 0.15 : 0)
    /* a tie (the same tile from two vendors) goes to the line's own vendor, then the live item, then the book's order */
    if (!top || score > top.score + 1e-9 || (Math.abs(score - top.score) <= 1e-9 && rank(line, p.e) > rank(line, top.p.e))) top = { p, score }
  }
  return top
}
const rank = (line: LineIn, e: BookEntry) => (line.vendor && e.vendor && line.vendor.trim().toLowerCase() === e.vendor.trim().toLowerCase() ? 2 : 0) + (e.status !== 'proposed' ? 1 : 0)

/** A line the matcher may take: an item line not taken from My Items, with a price and a quantity (an omission's minus quantity is a credit, not a purchase). */
export const matchable = (l: LineIn) => (l.kind ?? 'item') === 'item' && !l.priceBookItemId && unitPriceOf(l) > 0 && l.qty > 0

/** Every matchable line against the book — each with its best item, or none. */
export function matchLines(lines: readonly LineIn[], book: readonly BookEntry[]): LineMatch[] {
  const ix = indexOf(book)
  return lines.filter(matchable).map((l) => best(l, ix))
}

/** Whether the price is far enough off the item's to be said (1.0's 15 %). */
export const priceGapSaid = (m: Pick<LineMatch, 'gapPct'>) => m.gapPct !== null && Math.abs(m.gapPct) > PRICE_GAP_PCT
/** Whether a match may be written without the member's own tick: never one that leaves the line selling below the item's cost (one press
    would sell it at a loss — the review shows it red, unticked); then a sure one always, a close one only when its price sits within 15 % of
    the item's — a close match far off in price is likely another thing (1.0 ticked every match it found). The upload's own fill and the
    review's starting ticks read the same rule. */
export const startsTicked = (m: Pick<LineMatch, 'tier' | 'gapPct' | 'item'>, line: { costMinor: number; markupMinor: number }) => {
  if (!m.item || m.tier === 'none') return false
  if ((marginAfter(line, m.item) ?? 0) < 0) return false
  return m.tier === 'sure' || !priceGapSaid(m)
}

/** What a match writes on a line: the item, its cost — the price kept, the markup takes the rest (never below nothing) — and the item's
    vendor, link, unit, category and kind's glyph only where the line has none. */
export function bookFill(line: LineIn & { link?: string | null; icon?: string | null }, item: BookEntry): { priceBookItemId: string; costMinor: number; markupMinor: number
  vendor?: string; link?: string; unit?: string; category?: string; icon?: string } {
  const price = unitPriceOf(line)
  const cost = Math.max(0, item.costMinor)
  const out: ReturnType<typeof bookFill> = { priceBookItemId: item.id, costMinor: cost, markupMinor: Math.max(-cost, price - cost) }
  if (!line.vendor?.trim() && item.vendor) out.vendor = item.vendor
  if (!line.link && item.link) out.link = item.link
  if (!line.unit?.trim() && item.unit) out.unit = item.unit
  if (!line.category?.trim() && item.category) out.category = item.category
  if (!line.icon && isItemKind(item.kind)) out.icon = item.kind
  return out
}
/** The line's margin once matched, in % of its price (null without a price). */
export function marginAfter(line: { costMinor: number; markupMinor: number }, item: { costMinor: number }): number | null {
  const price = unitPriceOf(line)
  return price > 0 ? Math.round(((price - item.costMinor) / price) * 1000) / 10 : null
}
/** A line whose whole price sits in its cost (markup 0) — the upload's and the paste's "Rate": its real cost is unknown until the book says. */
export const costUnknown = (l: { markupMinor: number; costMinor: number }) => l.markupMinor === 0 && l.costMinor > 0
