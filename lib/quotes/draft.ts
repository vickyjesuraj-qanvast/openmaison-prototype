/**
 * (pending modules S04 — 1.0's Draft with AI, the quote drafter: `src/lib/quote-agent/*`, its always-returns-a-quote fallback `fallback.ts`;
 * card held:quotes, "a rule-built draft from the price book by property type would replace the dead row") **Draft with Maison AI**: a brief in
 * the studio's own words becomes a first cut of the quote — by rule, never a model, and never a guessed price (1.0's "no tier may hand back a
 * guessed number"). Pure: the server action feeds it the lead's property type, My Sections and My Items, and builds the quote from its plan.
 *
 * How the brief is read:
 * - **The works it names.** Each trade has its words ("hack", "tiles", "wardrobe", "paint"…); each room brings the trades a room's renovation
 *   takes (a kitchen: hacking, tiling, plumbing, electrical, carpentry, the countertop); "full renovation" / "whole flat" takes every trade.
 *   Preliminaries come with any hacking (protection, debris, permits — 1.0's baseline), cleaning with a whole-home job.
 * - **My Sections first.** A saved section for this property type (or for any) whose name or tags name a room or a work in the brief goes in
 *   whole, with its own lines and prices; a room's section covers that room's works.
 * - **Then My Items**, trade by trade: the items filed under the trade (its category), the ones sharing the brief's words first — up to three
 *   a trade (1.0's fallback). Only items the member may pick (the live book, and their own proposals).
 * - **Then the scope, unpriced.** A trade the book has nothing for comes in as 1.0's baseline lines at S$0, marked to price — the shape of the
 *   scope with every price left to the designer.
 * Quantities start at 1 (the book's unit kept); a section keeps its own. (S42 B-15 · call B·5) A number the brief gives before a work
 * ("install 6 downlights", "3 x wardrobes") is that line's quantity — on a line counted in units, never a Lot or a lump sum.
 */

export type DraftBookItem = { id: string; name: string; description: string | null; category: string | null; unit: string | null; costMinor: number; markupMinor: number }
export type DraftBookSection = { id: string; name: string; description: string | null; propertyType: string | null; tags: string[]; lineCount: number; totalMinor: number; categories: string[] }
export type DraftLine = { name: string; unit: string | null; qty: number; unitPriceMinor: number; priceBookItemId: string | null; needsPrice: boolean }
export type DraftGroup =
  | { kind: 'section'; name: string; sectionId: string; lineCount: number; totalMinor: number }
  | { kind: 'trade'; name: string; lines: DraftLine[] }
export type DraftPlan = {
  groups: DraftGroup[]
  /** the works read from the brief, in the trade order — the preview's "Read as" line */
  read: string[]
  lines: number; fromBook: number; toPrice: number
}

/** The brief's limit (the Ask box's own is 300; a brief runs longer). */
export const BRIEF_MAX = 600
/** At most this many of one trade's My Items (1.0's fallback: "max 3 per category"). */
export const ITEMS_PER_TRADE = 3

type Trade = { name: string; words: RegExp; aliases: string[]; base: { name: string; unit: string; rooms?: string[] }[] }
/* The trades in 1.0's baseline order, named as 2.0's demo files its categories (Hacking, Masonry, Tiling …); `aliases` = the other names a
   studio's book may use for the same trade. The baseline lines are 1.0's BASELINE_ITEMS (src/lib/quote-agent/fallback.ts), grouped. */
const TRADES: Trade[] = [
  { name: 'Preliminaries', words: /\b(preliminar\w*|site protection|protection|permits?|mcst)\b/, aliases: ['preliminary', 'prelims'], base: [
    { name: 'Site protection and floor covering', unit: 'Lot' }, { name: 'Waste disposal and hacking debris removal', unit: 'Lot' }, { name: 'HDB / condo permits and MCST submission', unit: 'Lot' }] },
  { name: 'Hacking', words: /\b(hack\w*|demoli\w*|tear (?:down|out)|dismantl\w*|remove (?:the )?(?:old|existing))\b/, aliases: ['demolition', 'hacking & demolition'], base: [
    { name: 'Hack existing wall tiles', unit: 'Lot', rooms: ['kitchen', 'bathroom'] }, { name: 'Hack existing floor tiles', unit: 'Lot', rooms: ['living', 'kitchen', 'bathroom', 'bedroom'] }, { name: 'Dismantle existing built-in carpentry', unit: 'Lot', rooms: ['bedroom', 'living', 'kitchen'] }] },
  { name: 'Masonry', words: /\b(mason\w*|brick\w*|partition wall|new wall|plaster\w*|screed\w*|waterproof\w*|cement)\b/, aliases: ['masonry & waterproofing', 'wet works'], base: [
    { name: 'New brick wall partition', unit: 'Lot' }, { name: 'Screeding and waterproofing', unit: 'Lot', rooms: ['bathroom', 'kitchen'] }, { name: 'Plaster walls for painting finish', unit: 'Lot' }] },
  { name: 'Plumbing', words: /\b(plumb\w*|pip(?:e|es|ing)|sink|basin|wc|toilet bowl|water heater|heater|mixer|tap|sanitar\w*)\b/, aliases: ['sanitary', 'plumbing & sanitary'], base: [
    { name: 'Relocate and install plumbing points (basin, WC, shower, sink)', unit: 'Lot', rooms: ['bathroom', 'kitchen'] }, { name: 'Supply and install sanitary ware (WC, basin, mixer, shower set)', unit: 'Lot', rooms: ['bathroom'] }] },
  { name: 'Electrical', words: /\b(electric\w*|wiring|rewir\w*|power points?|sockets?|switch(?:es)?|lighting|light points?|downlights?|spotlights?|pendant lights?|db box)\b/, aliases: ['electrical works', 'lighting'], base: [
    { name: 'Rewiring and new circuits', unit: 'Lot' }, { name: 'Additional lighting, power and data points', unit: 'Lot', rooms: ['kitchen', 'living', 'bedroom'] }] },
  { name: 'Ceiling', words: /\b(ceilings?|l-box|cove|cornices?|false ceiling|bulkheads?)\b/, aliases: ['partition & ceiling', 'false ceiling', 'ceiling works'], base: [
    { name: 'L-box ceiling and cove lighting details', unit: 'Lot' }] },
  { name: 'Painting', words: /\b(paint\w*|repaint\w*|feature wall paint)\b/, aliases: ['paint', 'painting works'], base: [
    { name: 'Interior paint, walls and ceiling, two coats', unit: 'Lot' }] },
  { name: 'Flooring', words: /\b(flooring|vinyl|laminate|parquet|spc|timber floor\w*|wood(?:en)? floor\w*)\b/, aliases: ['floor', 'floors'], base: [
    { name: 'Supply and lay vinyl or laminate flooring', unit: 'Lot', rooms: ['bedroom', 'living'] }] },
  { name: 'Tiling', words: /\b(tiles?|tiling|re-?tile\w*|homogeneous|porcelain|marble)\b/, aliases: ['tiles', 'tile works'], base: [
    { name: 'Supply and lay tiles', unit: 'Lot', rooms: ['living', 'kitchen', 'bathroom', 'balcony'] }] },
  { name: 'Carpentry', words: /\b(carpentry|cabinets?|cabinetry|wardrobes?|tv (?:console|feature wall)|console|feature wall|shoe cabinet|vanity|built-?ins?|study table|bed frame|joinery|carpenter)\b/, aliases: ['joinery', 'built-in carpentry'], base: [
    { name: 'Kitchen cabinets, top and bottom', unit: 'Lot', rooms: ['kitchen'] }, { name: 'Master bedroom wardrobe', unit: 'Lot', rooms: ['bedroom'] }, { name: 'Common bedroom wardrobe', unit: 'Lot', rooms: ['bedroom'] },
    { name: 'TV console and feature wall', unit: 'Lot', rooms: ['living'] }, { name: 'Shoe cabinet at the entrance', unit: 'Lot', rooms: ['living'] }] },
  { name: 'Countertop', words: /\b(countertops?|counter tops?|worktops?|quartz|solid surface|granite)\b/, aliases: ['countertops', 'worktop'], base: [
    { name: 'Quartz countertop for the kitchen and vanity', unit: 'Lot', rooms: ['kitchen', 'bathroom'] }] },
  { name: 'Glass & Mirror', words: /\b(glass\w*|shower screens?|mirrors?)\b/, aliases: ['glass', 'glass & mirror works', 'fittings'], base: [
    { name: 'Shower screen, tempered glass', unit: 'Lot', rooms: ['bathroom'] }, { name: 'Bathroom vanity mirror', unit: 'Lot', rooms: ['bathroom'] }] },
  { name: 'Doors', words: /\b(doors?|door frames?|main door|digital lock|gate)\b/, aliases: ['door', 'doors & windows'], base: [
    { name: 'Solid bedroom doors with frame and hinges', unit: 'Lot', rooms: ['bedroom'] }, { name: 'Main door hardware and handle set', unit: 'Lot' }] },
  { name: 'Cleaning', words: /\b(clean\w*|chemical wash)\b/, aliases: ['post-renovation cleaning'], base: [
    { name: 'Post-renovation deep cleaning', unit: 'Lot' }] },
  { name: 'Design', words: /\b(design fee|design|3d|drawings?|consult\w*|renders?)\b/, aliases: ['design fee', 'design & drawings'], base: [
    { name: 'Design consultation and 3D drawings', unit: 'Lot' }] },
]
type Room = { key: string; words: RegExp; trades: string[] }
const ROOMS: Room[] = [
  { key: 'kitchen', words: /\b(kitchens?|pantry)\b/, trades: ['Hacking', 'Tiling', 'Plumbing', 'Electrical', 'Carpentry', 'Countertop'] },
  { key: 'bathroom', words: /\b(bath ?rooms?|toilets?|washrooms?|powder room|wcs|shower)\b/, trades: ['Hacking', 'Masonry', 'Tiling', 'Plumbing', 'Glass & Mirror'] },
  { key: 'bedroom', words: /\b(bed ?rooms?|master room|common rooms?|guest rooms?|kids'? rooms?)\b/, trades: ['Flooring', 'Carpentry', 'Doors'] },
  { key: 'living', words: /\b(living(?: room| area)?|dining|hall|foyer|entrance)\b/, trades: ['Flooring', 'Carpentry', 'Electrical'] },
  { key: 'balcony', words: /\b(balcon(?:y|ies)|yard|service yard)\b/, trades: ['Tiling'] },
  { key: 'study', words: /\b(study|home office)\b/, trades: ['Carpentry'] },
]
/* a whole-home renovation (every trade) — never a whole-home single work: "paint the whole flat" is painting */
const WHOLE = /\b(full (?:reno\w*|works)|complete reno\w*|renovat\w* (?:the |a |our |my )?(?:whole|entire) (?:flat|unit|house|home|apartment)|(?:whole|entire)[- ](?:flat|unit|house|home|apartment) reno\w*|everything|full house)\b/

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()
const tradeOf = (category: string | null | undefined): Trade | null => {
  const c = norm(category ?? '')
  if (!c) return null
  return TRADES.find((t) => norm(t.name) === c || t.aliases.includes(c)) ?? null
}
/** The words worth matching on — three letters and up, not the brief's glue. */
const STOP = new Set(['and', 'the', 'for', 'with', 'new', 'all', 'our', 'two', 'both', 'from', 'into', 'redo', 'need', 'needs', 'want', 'wants', 'also', 'plus', 'whole', 'full', 'flat', 'unit', 'room', 'rooms', 'supply', 'install', 'lay', 'existing', 'old'])
const wordsOf = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map((w) => w.replace(/s$/, '')))
const roomsIn = (text: string) => ROOMS.filter((r) => r.words.test(text)).map((r) => r.key)

/* (S42 B-15 · call B·5) "<n> <noun>" in the brief: the quantity and the words after it ("6 downlights" → 6 · downlight). A count of rooms
   ("both bathrooms", "2 bedrooms") is not a quantity of work — it chooses where the work goes. */
const COUNT = /\b(\d{1,4})\s*(?:x\s*|nos?\.?\s+|no\.\s*)?([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/g
type Count = { n: number; words: Set<string>; text: string }
function countsIn(brief: string): Count[] {
  const out: Count[] = []
  for (const m of norm(brief).matchAll(COUNT)) {
    const n = Number(m[1]); const text = m[2] ?? ''
    if (!(n >= 1 && n <= 9999) || ROOMS.some((r) => r.words.test(text.split(' ')[0] ?? '')) || /^(?:room|rooms|storey|storeys|year|years|week|weeks|day|days|month|months|sqft|sq|m|ft|mm|cm|percent)\b/.test(text)) continue
    out.push({ n, words: wordsOf(text), text })
  }
  return out
}
const LOT = /^(?:lot|lots|ls|lump ?sum|set of works|job)$/i
/** The quantity the brief gives for a line — its words share one with the count's, or the count names the line's trade and the trade has this
    one line counted in units — else 1. A line sold as a Lot keeps 1. */
function qtyFor(line: { name: string; description: string | null; unit: string | null }, trade: Trade, counts: Count[], onlyCounted: boolean): number {
  if (!line.unit || LOT.test(line.unit.trim())) return 1
  const words = wordsOf(`${line.name} ${line.description ?? ''}`)
  const hit = counts.find((c) => [...c.words].some((w) => words.has(w))) ?? (onlyCounted ? counts.find((c) => trade.words.test(c.text)) : undefined)
  return hit?.n ?? 1
}

/** Where a trade is wanted: the rooms a clause names it for, or `*` — the whole home (named with no room, or a whole-home job). */
const ALL = '*'
/**
 * What the brief asks for, clause by clause (split at commas, full stops, semicolons, new lines and "then"): a clause that names works wants
 * them in its rooms (none named = everywhere); a clause that names only rooms ("redo both bathrooms and the kitchen") wants every work those
 * rooms take. A whole-home renovation wants every trade everywhere; any hacking brings the preliminaries. In the trade order.
 */
export function readBrief(brief: string): { need: Map<string, Set<string>>; rooms: string[]; whole: boolean } {
  const b = norm(brief)
  const whole = WHOLE.test(b)
  const want = new Map<string, Set<string>>()
  const add = (t: string, where: string) => { const s = want.get(t) ?? new Set<string>(); s.add(where); want.set(t, s) }
  if (whole) TRADES.forEach((t) => add(t.name, ALL))
  for (const clause of b.split(/[,;.\n]+|\bthen\b/)) {
    const rooms = roomsIn(clause)
    const works = TRADES.filter((t) => t.words.test(clause))
    if (works.length) for (const t of works) { if (rooms.length) rooms.forEach((r) => add(t.name, r)); else add(t.name, ALL) }
    else for (const r of ROOMS) if (rooms.includes(r.key)) r.trades.forEach((t) => add(t, r.key))
  }
  if (want.has('Hacking')) add('Preliminaries', ALL)
  const need = new Map<string, Set<string>>()
  for (const t of TRADES) { const w = want.get(t.name); if (w) need.set(t.name, w) }
  return { need, rooms: roomsIn(b), whole }
}

/**
 * The draft for a brief. `propertyType` = the lead's (a saved section for another property type is never taken); `book` = the My Items the
 * member may pick; `sections` = My Sections. An empty plan (no works read) is the page's "say the rooms or the works".
 */
export function draftPlan(brief: string, o: { propertyType: string | null; book: DraftBookItem[]; sections: DraftBookSection[] }): DraftPlan {
  const { need, rooms } = readBrief(brief)
  const groups: DraftGroup[] = []
  const read = [...need.keys()]
  if (!read.length) return { groups, read, lines: 0, fromBook: 0, toPrice: 0 }
  const briefWords = wordsOf(brief)
  const counts = countsIn(brief)   // (S42 B-15)
  /* 1 · My Sections: for the lead's property type (or any), named or tagged with a room or a work the brief asks for. A room's section takes
     that room off every work it was wanted in; a work's section takes the work. */
  const pt = norm(o.propertyType ?? '')
  for (const s of o.sections) {
    if (s.propertyType && pt && norm(s.propertyType) !== pt) continue
    const text = norm([s.name, ...s.tags].join(' '))
    const room = ROOMS.find((r) => rooms.includes(r.key) && r.words.test(text))
    const work = TRADES.find((t) => need.has(t.name) && (t.words.test(text) || text.includes(norm(t.name))))
    if (!room && !work) continue
    groups.push({ kind: 'section', name: s.name, sectionId: s.id, lineCount: s.lineCount, totalMinor: s.totalMinor })
    if (room) for (const [t, where] of need) { where.delete(room.key); if (!where.size) need.delete(t) }
    if (work) need.delete(work.name)
  }
  /* 2 · My Items by trade — never one made for a room the brief doesn't name it for — 3 · else the trade's scope, unpriced */
  for (const [name, where] of need) {
    const trade = TRADES.find((t) => t.name === name)!
    const everywhere = where.has(ALL)
    const fits = (text: string) => { const named = roomsIn(norm(text)); return everywhere || !named.length || named.some((r) => where.has(r)) }
    const mine = o.book.filter((i) => tradeOf(i.category)?.name === name && fits(i.name))
      .map((i, k) => ({ i, k, score: [...wordsOf(`${i.name} ${i.description ?? ''}`)].filter((w) => briefWords.has(w)).length }))
      .sort((a, b) => b.score - a.score || a.k - b.k)
      .slice(0, ITEMS_PER_TRADE)
    const counted = mine.filter(({ i }) => i.unit && !LOT.test(i.unit.trim())).length === 1
    const lines: DraftLine[] = mine.length
      ? mine.map(({ i }) => ({ name: i.name, unit: i.unit, qty: qtyFor(i, trade, counts, counted), unitPriceMinor: i.costMinor + i.markupMinor, priceBookItemId: i.id, needsPrice: false }))
      : trade.base.filter((l) => everywhere || !l.rooms || l.rooms.some((r) => where.has(r)))
          .map((l) => ({ name: l.name, unit: l.unit, qty: 1, unitPriceMinor: 0, priceBookItemId: null, needsPrice: true }))
    if (lines.length) groups.push({ kind: 'trade', name, lines })
  }
  const count = groups.reduce((n, g) => n + (g.kind === 'section' ? g.lineCount : g.lines.length), 0)
  const fromBook = groups.reduce((n, g) => n + (g.kind === 'section' ? g.lineCount : g.lines.filter((l) => !l.needsPrice).length), 0)
  return { groups, read, lines: count, fromBook, toPrice: count - fromBook }
}
