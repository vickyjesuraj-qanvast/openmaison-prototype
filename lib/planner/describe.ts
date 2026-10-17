import { CATALOGUE, PIECE_COLOURS, PIECE_COLOUR_NAMES, catalogueItem, type CatalogueItem } from './catalogue'
import { clamp } from './model'

/*
 * (parity map, TD-090 — 1.0's "Create furniture from text", as a rule) A described piece — "a 3-seater sofa in grey", "king bed",
 * "wardrobe 180 cm wide in walnut", "round dining table for 4" — read into the closest piece of the planner's own catalogue, its colour
 * from the eight the inspector offers and its size when one is said. A STAND-IN: 1.0 asked a model to build a new 3D shape; this reads
 * words against a table, so it only ever picks a piece the catalogue already has. Pure and client-safe.
 */

export type Described = { item: CatalogueItem; color: string | null; colorName: string | null; w: number; d: number; h: number; sized: boolean }

/* the colour words, longest first so "dark grey" is never "grey" — each to one of the eight */
const COLOUR_WORDS: [string, number][] = ([
  ['dark grey', 6], ['dark gray', 6], ['dark wood', 4], ['dark brown', 4], ['light wood', 2], ['light grey', 5], ['light gray', 5], ['off white', 1], ['off-white', 1],
  ['charcoal', 6], ['black', 6], ['graphite', 6], ['espresso', 4], ['chocolate', 4], ['walnut', 3], ['teak', 3], ['brown', 3], ['tan', 3],
  ['grey', 5], ['gray', 5], ['stone', 5], ['white', 0], ['chalk', 0], ['cream', 1], ['beige', 1], ['linen', 1], ['ivory', 1],
  ['oat', 2], ['sand', 2], ['oak', 2], ['natural', 2], ['blue', 7], ['navy', 7], ['slate', 7], ['teal', 7],
] as [string, number][]).sort((a, b) => b[0].length - a[0].length)

/* what a word or two names, longest first — the catalogue's own key */
const PHRASES: [string, string][] = ([
  ['l-shaped', 'sofa-l'], ['l shaped', 'sofa-l'], ['sectional', 'sofa-l'], ['corner sofa', 'sofa-l'], ['loveseat', 'sofa-2'],
  ['super single', 'bed-ss'], ['single bed', 'bed-single'], ['king', 'bed-king'], ['queen', 'bed-queen'],
  ['accent chair', 'armchair'], ['lounge chair', 'armchair'], ['armchair', 'armchair'], ['arm chair', 'armchair'],
  ['coffee table', 'coffee-table'], ['side table', 'side-table'], ['end table', 'side-table'],
  ['tv console', 'tv-console'], ['media console', 'tv-console'], ['television', 'tv-console'], ['tv', 'tv-console'],
  ['bookshelf', 'bookshelf'], ['bookcase', 'bookshelf'], ['shelves', 'bookshelf'], ['shelf', 'bookshelf'],
  ['round table', 'round-4'], ['round dining', 'round-4'], ['dining chair', 'dining-chair'], ['dining table', 'dining-table'], ['dining set', 'dining-6'], ['dining', 'dining-6'],
  ['bench', 'bench'], ['sideboard', 'sideboard'], ['buffet', 'sideboard'], ['credenza', 'sideboard'],
  ['bedside', 'bedside'], ['nightstand', 'bedside'], ['night stand', 'bedside'],
  ['full height wardrobe', 'wardrobe-full'], ['full-height wardrobe', 'wardrobe-full'], ['built-in wardrobe', 'wardrobe-full'], ['wardrobe', 'wardrobe-2'], ['closet', 'wardrobe-2'],
  ['dressing table', 'dresser'], ['dresser', 'dresser'],
  ['office chair', 'office-chair'], ['desk chair', 'office-chair'], ['task chair', 'office-chair'], ['study table', 'desk'], ['work table', 'desk'], ['desk', 'desk'],
  ['drawers', 'drawers'], ['pedestal', 'drawers'], ['filing', 'drawers'],
  ['kitchen island', 'island'], ['island', 'island'], ['tall unit', 'tall-unit'], ['pantry', 'tall-unit'], ['oven', 'tall-unit'], ['counter', 'counter'], ['worktop', 'counter'], ['kitchen cabinet', 'counter'],
  ['refrigerator', 'fridge'], ['fridge', 'fridge'], ['washing machine', 'washer'], ['washer', 'washer'], ['dryer', 'washer'],
  ['toilet', 'toilet'], ['wc', 'toilet'], ['basin', 'vanity'], ['sink', 'vanity'], ['vanity', 'vanity'], ['shower', 'shower'], ['bathtub', 'bathtub'], ['bath tub', 'bathtub'], ['tub', 'bathtub'],
  ['carpet', 'rug'], ['rug', 'rug'], ['plant', 'plant'], ['floor lamp', 'floor-lamp'], ['standing lamp', 'floor-lamp'], ['pendant', 'pendant'], ['ceiling light', 'pendant'], ['chandelier', 'pendant'],
  ['shoe cabinet', 'shoe-cabinet'], ['shoe rack', 'shoe-cabinet'], ['console', 'console'],
  ['sofa', 'sofa-3'], ['couch', 'sofa-3'], ['settee', 'sofa-3'], ['chair', 'dining-chair'], ['table', 'dining-table'], ['bed', 'bed-queen'], ['lamp', 'floor-lamp'],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length)

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 }
const has = (text: string, phrase: string) => new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(text)
/** a length as said: "1.8 m", "180cm", "180" (centimetres unless it is under 10, which is metres) */
const cm = (n: string, unit?: string) => { const v = Number(n); return unit === 'm' || (!unit && v < 10) ? Math.round(v * 100) : Math.round(v) }

/** The closest catalogue piece to what the words describe, or null when they name nothing the catalogue has. */
export function describePiece(input: string): Described | null {
  let text = ` ${input.toLowerCase().replace(/×/g, 'x').replace(/[^\w.\- ]+/g, ' ').replace(/\s+/g, ' ')} `
  /* the colour first, taken out of the words so "stone grey" never reads as a stone */
  let color: string | null = null, colorName: string | null = null
  for (const [w, i] of COLOUR_WORDS) if (has(text, w)) { color = PIECE_COLOURS[i]!; colorName = PIECE_COLOUR_NAMES[i]!; text = text.replace(new RegExp(w.replace(/-/g, '\\-'), 'g'), ' '); break }
  /* a size: "180 x 90", "2 m wide", "60 cm deep", "2.1 m tall" */
  let w: number | null = null, d: number | null = null, h: number | null = null
  const pair = text.match(/(\d+(?:\.\d+)?)\s*(cm|m)?\s*x\s*(\d+(?:\.\d+)?)\s*(cm|m)?(?:\s*x\s*(\d+(?:\.\d+)?)\s*(cm|m)?)?/)
  if (pair) { w = cm(pair[1]!, pair[2] ?? pair[4]); d = cm(pair[3]!, pair[4] ?? pair[2]); if (pair[5]) h = cm(pair[5], pair[6] ?? pair[4]) }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(cm|m)\b\s*(wide|long|width|length|deep|depth|tall|high|height)?/g)) {
    const v = cm(m[1]!, m[2]), k = m[3] ?? ''
    if (/deep|depth/.test(k)) d = v; else if (/tall|high|height/.test(k)) h = v; else if (w === null) w = v
  }
  /* how many it seats: "3-seater", "three seat", "for 4", "6 pax" */
  const seatsAt = text.match(/(\d|one|two|three|four|five|six|seven|eight)\s*-?\s*(seater|seat|person|people|pax)/) ?? text.match(/for\s+(\d|two|three|four|five|six|seven|eight)\b/)
  const seats = seatsAt ? (NUMBER_WORDS[seatsAt[1]!] ?? Number(seatsAt[1])) : null
  let key = PHRASES.find(([p]) => has(text, p))?.[1] ?? null
  if (key) {
    if (key === 'sofa-3' && seats !== null) key = seats <= 2 ? 'sofa-2' : seats >= 5 ? 'sofa-l' : 'sofa-3'
    if ((key === 'dining-6' || key === 'dining-table') && seats !== null && !has(text, 'table only')) key = seats <= 4 ? (has(text, 'round') ? 'round-4' : 'dining-4') : 'dining-6'
    if (key === 'dining-chair' && has(text, 'office')) key = 'office-chair'
    if (key === 'wardrobe-2') key = w !== null ? (w >= 180 ? 'wardrobe-full' : w >= 130 ? 'wardrobe-3' : 'wardrobe-2') : /(3|three)\s*-?\s*door/.test(text) ? 'wardrobe-3' : 'wardrobe-2'
  } else {
    /* no phrase: the piece whose name and words hold the most of the description's words */
    const words = text.split(' ').filter((x) => x.length > 2 && !/^\d/.test(x) && !['the', 'and', 'with', 'for', 'one', 'that', 'in'].includes(x))
    let best: { item: CatalogueItem; n: number } | null = null
    for (const c of CATALOGUE) {
      const hay = `${c.name} ${c.words ?? ''}`.toLowerCase()
      const n = words.filter((x) => hay.includes(x)).length
      if (n && (!best || n > best.n)) best = { item: c, n }
    }
    key = best?.item.key ?? null
  }
  const item = key ? catalogueItem(key) : null
  if (!item) return null
  const sized = w !== null || d !== null || h !== null
  return { item, color, colorName, w: clamp(w ?? item.w, 10, 1200), d: clamp(d ?? item.d, 10, 1200), h: clamp(h ?? item.h, 1, 400), sized }
}
