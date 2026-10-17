import { money2 } from '@/lib/quotes/math'
import { moneyCompact } from '@/lib/format'
import { BRAND_NOTES } from './brands'
import { materialFindings } from './materials'
import type { RefLine, RefQuote } from './reference'
import { normUnit, sameTrade, tokens, tradeWords } from '@/lib/quotes/line-words'

/**
 * Quote X-Ray (REG-529; engine 2, REG-638) — the comparison itself, pure and deterministic (the prototype's "AI"): your lines
 * against the other studio's, matched by what the words say, then the real difference once the work each quote leaves out is
 * counted, up to three client-ready points, the brands worth a word, and the item-by-item rows. Everything the record prints
 * comes from here. Engine 2 (X-Ray parity round 1): your side is what the quote counts (Q-02); plurals and trade words read
 * alike and one line may stand against several (Q-03); rates, not lump sums, when both sides give a quantity (Q-04); 1.0's kinds
 * of point, weights and "a question never stands alone" (Q-05); the client never reads the other studio's name (Q-07); the draft
 * follows the screen (Q-08); key points by 1.0's rules (Q-09). (pending modules S21) 1.0's seventh kind of point, their arithmetic, on the
 * rates a spreadsheet or a PDF states — readings made before carried no stated rate, so they read the same: the engine stays 2.
 */
export const ENGINE = 2

export type YourLine = {
  id: string; name: string; description: string | null; trade: string | null; room: string | null; qty: number; unit: string | null
  amountMinor: number; optional: boolean
  /** (Q-02) The word the line prints instead of its amount (FOC · Inclusive · KIV · By client · Packaged · a custom word): covered, not priced. */
  word?: string | null
  /** A reference line's brand column (Upload two quotes, Q-09). */
  brand?: string | null
}
export type TheirLine = RefLine
export type XrayRowStatus = 'matched' | 'yours-only' | 'theirs-only' | 'unpriced'
export type XrayRow = {
  key: string; name: string; theirName: string | null; trade: string; room: string | null
  yoursMinor: number | null; theirsMinor: number | null; status: XrayRowStatus
  /** Engine 2: the lines behind the row — your line ids and the other side's line indexes (one line may stand against several). */
  yourIds?: string[]; theirIdx?: number[]
  /** Your line prints this word instead of its amount. */
  yourWord?: string | null
  /** Both quantities, when both sides give one in the same unit and they differ (Q-04). */
  qty?: { yours: number; theirs: number; unit: string } | null
  /** (Q-14) A pair the studio made by hand. */
  by?: 'you' | null
  /** (pending modules S21 — 1.0's arithmetic check) one of their lines here states an amount its own rate × quantity doesn't make */
  slip?: { statedMinor: number; computedMinor: number } | null
}
export type XrayPointKind = 'missing' | 'cheaper' | 'below' | 'below-market' | 'unpriced' | 'material' | 'brand' | 'arithmetic'
export type XrayPoint = {
  n: number; kind: XrayPointKind; say: string; evidenceLabel: string; evidence: string; asQuestion: string | null
  /** 1.0's medium confidence: a point better put as a question, never said alone. */
  medium?: boolean
  rowKey?: string | null
}
export type XrayBrand = { brand: string; trade: string; side: 'yours' | 'theirs' | 'both'; tone: 'advantage' | 'risk' | 'note' | 'checked'; impact: 'high' | 'mild' | null; text: string; sources: string[] }
export type XrayResult = {
  engine?: number
  yourLabel: string; yourStudio: string; otherStudio: string
  /** The client's first name at the reading (the draft's greeting). */
  client?: string | null
  /** Your quote's own total at the reading — after its discounts, GST in — printed beside "Yours" (Q-02). */
  quoteTotalMinor?: number | null
  yoursMinor: number; theirsMinor: number
  /** theirs − yours: negative = the other quote is cheaper on paper. */
  onPaperMinor: number
  yoursOnlyMinor: number; theirsOnlyMinor: number; unpricedCount: number
  /** (yours − yours-only) − (theirs − theirs-only): the like-for-like gap; negative = ours is less. */
  realDiffMinor: number
  headline: string; footnote: string
  points: XrayPoint[]; brands: XrayBrand[]; rows: XrayRow[]
  compared: number
  /** The WhatsApp draft as the reading made it (every point as a statement). */
  message: string
}
/** (Q-14) The studio's corrections: pairs taken apart, and pairs made by hand — [your line id, their line index]. */
export type XrayOverrides = { split?: [string, number][]; pair?: [string, number][] }

// ── Money (the house formats: the editor's two decimals, the header chips' compact figure) ─────────────────────────────
export const money = money2
export const moneyK = (minor: number) => `${minor < 0 ? '−' : ''}${moneyCompact(Math.abs(minor))}`

// ── Words ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/* (pending modules S12) STOP · SAME · stem · SHORT · tokens · tradeWords · sameTrade · normUnit moved to lib/quotes/line-words.ts unchanged —
   the Price book's matcher reads the same words; re-exported here for anything that read them from the engine. */
export { tokens, sameTrade, normUnit }
/** Things a line is about — one of these shared, in the same trade and room, makes a pair (a quartz and a solid-surface countertop). */
const ITEM_NOUNS = new Set(['countertop', 'wardrobe', 'cabinet', 'vanity', 'console', 'backsplash', 'shelving', 'desk', 'settee', 'heater', 'fan', 'screen', 'door', 'window', 'grille', 'gate', 'mirror', 'sink', 'basin'])
const shared = (a: string[], b: string[]) => a.filter((t) => b.includes(t)).length
/** Two lines' likeness: at least two shared words, as a share of the shorter list; 0 below that. */
const score = (a: string[], b: string[]) => { if (!a.length || !b.length) return 0; const n = shared(a, b); return n < 2 ? 0 : n / Math.min(a.length, b.length) }
/** Rooms: the same room shares a word that names it; a whole-unit line fits any room; two named rooms with nothing in common clash. */
const ROOM_GENERIC = new Set(['room', 'common', 'master', 'whole', 'area'])
const roomWords = (r: string | null) => tokens(r ?? '').filter((w) => !ROOM_GENERIC.has(w))
const wholeUnit = (r: string | null) => !r || /whole\s*unit|entire|general/i.test(r)
const roomFit = (a: string | null, b: string | null): 'same' | 'open' | 'clash' => {
  if (wholeUnit(a) || wholeUnit(b)) return 'open'
  const x = roomWords(a), y = roomWords(b)
  return x.some((w) => y.includes(w)) ? 'same' : 'clash'
}

const UNIT_WORD: Record<string, string> = { sqft: 'sqft', ft: 'ft', sqm: 'sqm', m: 'm', point: 'point', pc: 'piece', set: 'set' }

/** Lower-case a name's first letter for the middle of a sentence — never an acronym or a brand ("TV console", "KDK fan"). */
const BRAND_FIRST = new Set(BRAND_NOTES.map((b) => b.brand.split(/\s+/)[0]!.toLowerCase()))
function lowerFirst(s: string): string {
  const w = s.split(/\s+/)[0] ?? ''
  return /^[A-Z][a-z]/.test(w) && !BRAND_FIRST.has(w.toLowerCase()) ? s.charAt(0).toLowerCase() + s.slice(1) : s
}
/** Cut at a word, never mid-word. */
function short(s: string, max = 72): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:–—-]+$/, '')}…`
}
/** The work itself, for a sentence to the client: "Design, fabricate and install kitchen top-hung cabinet" → "kitchen top-hung cabinet". */
const VERBS = /^(?:to\s+)?(?:design,?\s+fabricate\s+(?:and|&)\s+install|supply\s+(?:and|&)\s+(?:install|lay|fix)|supply\s+labou?r\s+(?:and\s+tools\s+)?to|supply|install|provide)\s+/i
const TAIL = /,?\s+(?:supply\s+(?:and|&)\s+(?:install|lay|fix)|supply\s+only|install(?:ation)?\s+only|new)$/i
const plainName = (s: string) => { const t = s.replace(VERBS, '').replace(TAIL, '').trim(); return t.length > 3 ? t : s }
/* (pending modules S21) a line read from a PDF keeps a wrapped detail after "; " — a sentence that has to be short says the line's own first words */
const say = (s: string, max = 60) => lowerFirst(short(plainName(s.length > max && s.includes('; ') ? s.split('; ')[0]! : s), max))

// ── Matching ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type Pairing = { rows: { yours: number[]; theirs: number[]; by: 'you' | null }[] }

function pairLines(mine: YourLine[], theirs: TheirLine[], o: XrayOverrides): Pairing {
  const mineTok = mine.map((l) => tokens(`${l.name} ${l.description ?? ''}`))
  const mineName = mine.map((l) => tokens(l.name))
  const theirTok = theirs.map((l) => tokens(l.name))
  const like = (i: number, j: number) => {
    // taking out is not putting in: "hack bathroom tiles" never pairs with "lay bathroom tiles" (1.0's false merge, B-29)
    if (mineTok[i]!.includes('hack') !== theirTok[j]!.includes('hack')) return 0
    const s = Math.max(score(mineTok[i]!, theirTok[j]!), score(mineName[i]!, theirTok[j]!))
    if (s > 0) return s
    // one shared word is enough when it names the thing itself — a countertop is a countertop, quartz or solid surface
    const one = mineTok[i]!.filter((t) => theirTok[j]!.includes(t))
    return one.length === 1 && ITEM_NOUNS.has(one[0]!) ? 0.35 : 0
  }
  /* A trade fits when the two trades share a word, or one line names the other's trade ("Countertop" and "Kitchen countertop, quartz"). */
  const tradeFit = (i: number, j: number) => sameTrade(mine[i]!.trade, theirs[j]!.trade) || tradeWords(theirs[j]!.trade).some((w) => mineTok[i]!.includes(w)) || tradeWords(mine[i]!.trade).some((w) => theirTok[j]!.includes(w))
  const idxOf = new Map(mine.map((l, i) => [l.id, i]))
  const split = new Set((o.split ?? []).map(([y, t]) => `${y}|${t}`))
  const apart = (i: number, j: number) => split.has(`${mine[i]!.id}|${j}`)
  /** A lump sum for a whole trade: a lot (or no unit) whose name says its trade — "Plumbing works, kitchen and bathrooms". */
  const lump = (unit: string | null, text: string, trade: string | null) => {
    const u = normUnit(unit), words = tokens(text), tw = tradeWords(trade)
    return (!u || u === 'lot') && tw.some((w) => words.includes(w)) && (/\bworks?\b/i.test(text) || tw.includes(words[0] ?? ''))
  }
  const isLumpMine = (i: number) => lump(mine[i]!.unit, mine[i]!.name, mine[i]!.trade)
  const isLumpTheirs = (j: number) => lump(theirs[j]!.unit, theirs[j]!.name, theirs[j]!.trade)
  const rowOfMine = new Map<number, number>(), rowOfTheirs = new Map<number, number>()
  const rows: Pairing['rows'] = []
  const open = (ys: number[], ts: number[], by: 'you' | null) => { rows.push({ yours: [...ys], theirs: [...ts], by }); ys.forEach((i) => rowOfMine.set(i, rows.length - 1)); ts.forEach((j) => rowOfTheirs.set(j, rows.length - 1)) }
  // 1 · the studio's own pairs first (Q-14)
  for (const [y, t] of o.pair ?? []) { const i = idxOf.get(y); if (i === undefined || t < 0 || t >= theirs.length || rowOfMine.has(i) || rowOfTheirs.has(t)) continue; open([i], [t], 'you') }
  // 2 · the strongest pairs, one to one (Q-03). The same trade and room let fewer shared words count; across trades a pair must
  //     read almost alike — "hacking of floor tiles" is not "laying floor tiles" (1.0's false merge, B-29).
  const cand: { i: number; j: number; s: number }[] = []
  mine.forEach((l, i) => theirs.forEach((t, j) => {
    if (rowOfMine.has(i) || rowOfTheirs.has(j) || apart(i, j)) return
    const s = like(i, j), trade = tradeFit(i, j), room = roomFit(l.room, t.room)
    const need = trade ? (room === 'same' ? 0.34 : room === 'open' ? 0.4 : 0.5) : (room === 'same' ? 0.5 : room === 'open' ? 0.6 : 0.8)
    if (s >= need) cand.push({ i, j, s: s + (trade ? 0.05 : 0) + (room === 'same' ? 0.03 : 0) })
  }))
  cand.sort((a, b) => b.s - a.s)
  for (const c of cand) { if (rowOfMine.has(c.i) || rowOfTheirs.has(c.j)) continue; open([c.i], [c.j], null) }
  // 3 · one line against several: a leftover line joins a pair of its own trade, in a room that fits, that it reads like (Q-03)
  const attach = (side: 'theirs' | 'yours') => {
    const n = side === 'theirs' ? theirs.length : mine.length
    for (let k = 0; k < n; k += 1) {
      if ((side === 'theirs' ? rowOfTheirs : rowOfMine).has(k)) continue
      let best: { r: number; s: number } | null = null
      rows.forEach((row, r) => {
        if (row.by === 'you') return
        const pairs = side === 'theirs' ? row.yours.map((i) => [i, k] as const) : row.theirs.map((j) => [k, j] as const)
        if (pairs.some(([i, j]) => apart(i, j))) return
        // the trade fits across, or the line shares its trade with the row's own lines on its side
        const kin = side === 'theirs' ? row.theirs.some((j) => sameTrade(theirs[j]!.trade, theirs[k]!.trade)) : row.yours.some((i) => sameTrade(mine[i]!.trade, mine[k]!.trade))
        const lumpRow = side === 'theirs' ? row.yours.some(isLumpMine) : row.theirs.some(isLumpTheirs)
        const fits = pairs.filter(([i, j]) => (tradeFit(i, j) || kin) && (lumpRow || roomFit(mine[i]!.room, theirs[j]!.room) !== 'clash'))
        if (!fits.length) return
        const s = Math.max(...fits.map(([i, j]) => like(i, j)))
        if (s >= (lumpRow ? 0.25 : 0.4) && (!best || s > best.s)) best = { r, s }
      })
      if (best) { const { r } = best as { r: number; s: number }; if (side === 'theirs') { rows[r]!.theirs.push(k); rowOfTheirs.set(k, r) } else { rows[r]!.yours.push(k); rowOfMine.set(k, r) } }
    }
  }
  attach('theirs'); attach('yours')
  // 4 · a lump sum for a whole trade ("Plumbing works, 1 lot") stands against the other side's lone lines of that trade (B-29)
  mine.forEach((l, i) => {
    if (rowOfMine.has(i) || !isLumpMine(i)) return
    const js = theirs.map((_, j) => j).filter((j) => !rowOfTheirs.has(j) && !apart(i, j) && sameTrade(l.trade, theirs[j]!.trade))
    if (js.length) open([i], js, null)
  })
  theirs.forEach((t, j) => {
    if (rowOfTheirs.has(j) || !isLumpTheirs(j)) return
    const is = mine.map((_, i) => i).filter((i) => !rowOfMine.has(i) && !apart(i, j) && sameTrade(mine[i]!.trade, t.trade))
    if (is.length) open(is, [j], null)
  })
  // your lines left alone, then theirs, each a one-sided row
  mine.forEach((_, i) => { if (!rowOfMine.has(i)) open([i], [], null) })
  theirs.forEach((_, j) => { if (!rowOfTheirs.has(j)) open([], [j], null) })
  // your quote's order: each row stands where its first line of yours stands; their lone lines follow in their order
  const first = (r: Pairing['rows'][number]) => (r.yours.length ? Math.min(...r.yours) : mine.length + Math.min(...r.theirs))
  rows.forEach((r) => { r.yours.sort((a, b) => a - b); r.theirs.sort((a, b) => a - b) })
  rows.sort((a, b) => first(a) - first(b))
  return { rows }
}

/** Rates on a pair: one line each side, both giving a quantity in the same unit (not a lump sum), both priced. */
function rates(ys: YourLine[], ts: TheirLine[]) {
  if (ys.length !== 1 || ts.length !== 1) return null   // several lines on a side may overlap in area: their total is compared, not a rate
  const units = new Set([...ys.map((l) => normUnit(l.unit)), ...ts.map((l) => normUnit(l.unit))])
  const u = [...units][0]
  if (units.size !== 1 || !u || u === 'lot' || ys.some((l) => !(l.qty > 0) || l.word) || ts.some((l) => !(l.qty > 0))) return null
  const ya = ys.reduce((s, l) => s + l.amountMinor, 0), ta = ts.reduce((s, l) => s + l.amountMinor, 0)
  const yq = ys.reduce((s, l) => s + l.qty, 0), tq = ts.reduce((s, l) => s + l.qty, 0)
  if (ya <= 0 || ta <= 0) return null
  return { unit: UNIT_WORD[u] ?? u, yq, tq, yr: ya / yq, tr: ta / tq }
}

// ── Their arithmetic (pending modules S21 — 1.0's src/lib/quote-xray/arithmetic-check.ts, deterministic) ─────────────────────────
/**
 * A line of theirs whose stated amount isn't its own rate × quantity, beyond S$1 or 1% of the amount (1.0's tolerance) — only where the
 * quote states all three. A line that prints a word, or no price, is not checked. When most of their rated lines disagree the difference is
 * the quote's way of pricing (GST or a discount in every line, a column read wrongly), not a slip: none is said (a slip disagrees with the
 * rest). Your own lines are never checked — 1.0's rule: your slips are never a point.
 */
export function slipsOf(theirs: TheirLine[]): Map<number, { statedMinor: number; computedMinor: number }> {
  const rated = theirs.map((l, j) => ({ l, j })).filter(({ l }) => (l.rateMinor ?? 0) > 0 && l.qty > 0 && l.amountMinor > 0)
  const out = new Map<number, { statedMinor: number; computedMinor: number }>()
  for (const { l, j } of rated) {
    const computedMinor = Math.round(l.rateMinor! * l.qty)
    if (Math.abs(l.amountMinor - computedMinor) > Math.max(100, Math.round(l.amountMinor * 0.01))) out.set(j, { statedMinor: l.amountMinor, computedMinor })
  }
  return rated.length >= 3 && out.size * 3 > rated.length ? new Map() : out
}
const qtyWords = (n: number, unit: string | null) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}${unit ? ` ${unit}` : ''}`

// ── The reading ──────────────────────────────────────────────────────────────────────────────────────────────────────
type Fact = { kind: XrayPointKind; weight: number; medium: boolean; say: string; asQuestion: string | null; evidenceLabel: string; evidence: string; rowKey: string | null }
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
/** " for the living room" · " in Bedroom 2" · "" for the whole unit or none. */
const where = (room: string | null) => (!room || wholeUnit(room) ? '' : /\d/.test(room) ? ` in ${room}` : ` for the ${room.toLowerCase()}`)

export function compareQuotes(yours: YourLine[], other: RefQuote, ctx: { yourLabel: string; yourStudio: string; clientName: string | null; quoteTotalMinor?: number | null }, overrides: XrayOverrides = {}): XrayResult {
  const mine = yours.filter((l) => !l.optional)
  const theirs = other.lines
  const O = other.studio
  const { rows: pairing } = pairLines(mine, theirs, overrides)
  const slips = slipsOf(theirs)

  const rows: XrayRow[] = pairing.map((p) => {
    const ys = p.yours.map((i) => mine[i]!), ts = p.theirs.map((j) => theirs[j]!)
    const lead = ys[0] ?? null, tLead = ts[0] ?? null
    const yoursMinor = ys.length ? ys.reduce((s, l) => s + (l.word ? 0 : l.amountMinor), 0) : null
    const theirsMinor = ts.length ? ts.reduce((s, l) => s + l.amountMinor, 0) : null
    const status: XrayRowStatus = ys.length && ts.length ? (theirsMinor === 0 ? 'unpriced' : 'matched') : ys.length ? 'yours-only' : theirsMinor === 0 ? 'unpriced' : 'theirs-only'
    const r = rates(ys, ts)
    const words = ys.map((l) => l.word).filter(Boolean) as string[]
    return {
      key: ys.length ? `${ts.length ? 'm' : 'y'}-${lead!.id}` : `t-${p.theirs[0]}`,
      name: ys.length ? ys.map((l) => l.name).join(' · ') : tLead!.name,
      theirName: ts.length ? ts.map((l) => l.name).join(' · ') : null,
      trade: lead?.trade ?? tLead?.trade ?? 'Other',
      room: lead?.room ?? tLead?.room ?? null,
      yoursMinor, theirsMinor, status,
      yourIds: ys.map((l) => l.id), theirIdx: [...p.theirs],
      yourWord: words.length && words.length === ys.length ? words[0]! : null,
      qty: r && Math.abs(r.yq - r.tq) > Math.max(r.yq, r.tq) * 0.05 ? { yours: r.yq, theirs: r.tq, unit: r.unit } : null,
      by: p.by,
      slip: p.theirs.map((j) => slips.get(j)).find(Boolean) ?? null,
    }
  })

  const yoursMinor = mine.reduce((s, l) => s + (l.word ? 0 : l.amountMinor), 0)
  const theirsMinor = theirs.reduce((s, l) => s + l.amountMinor, 0)
  const yoursOnlyMinor = rows.filter((r) => r.status === 'yours-only').reduce((s, r) => s + (r.yoursMinor ?? 0), 0)
  const theirsOnlyMinor = rows.filter((r) => r.status === 'theirs-only').reduce((s, r) => s + (r.theirsMinor ?? 0), 0)
  const unpricedCount = rows.filter((r) => r.status === 'unpriced').length
  const onPaperMinor = theirsMinor - yoursMinor
  const realDiffMinor = (yoursMinor - yoursOnlyMinor) - (theirsMinor - theirsOnlyMinor)

  const m = (minor: number) => money(Math.abs(minor))
  const likeForLike = realDiffMinor === 0 ? 'the two quotes come to the same' : realDiffMinor < 0 ? `ours is ${m(realDiffMinor)} less` : `ours is ${m(realDiffMinor)} more`
  const headline = onPaperMinor < 0
    ? (realDiffMinor > 0 ? `On paper, ${O} is ${m(onPaperMinor)} cheaper; after counting the work each quote leaves out, ours is only ${m(realDiffMinor)} more like-for-like.`
      : realDiffMinor < 0 ? `On paper, ${O} is ${m(onPaperMinor)} cheaper — but like-for-like, ours comes to ${m(realDiffMinor)} less.`
      : `On paper, ${O} is ${m(onPaperMinor)} cheaper — but like-for-like, the two quotes come to the same.`)
    : onPaperMinor === 0 ? `On paper, the two quotes come to the same; like-for-like, ${likeForLike}.`
    : (realDiffMinor > 0 ? `On paper, ${O} is ${m(onPaperMinor)} more, and like-for-like ours is still ${m(realDiffMinor)} more — the difference is in what each quote includes.`
      : `On paper, ${O} is ${m(onPaperMinor)} more; like-for-like, ${likeForLike}.`)
  const footnote = `On paper the difference is ${m(onPaperMinor)} — their quote leaves out ${m(yoursOnlyMinor)} of work yours includes${theirsOnlyMinor ? ` (and yours leaves out ${m(theirsOnlyMinor)} of theirs)` : ''}${unpricedCount ? `, plus ${unpricedCount} ${plural(unpricedCount, 'line', 'lines')} with no price given` : ''}.`

  // ── Say this: 1.0's fact pool (B-38…B-45) — weighed, the three heaviest said, a question never alone (Q-05)
  const facts: Fact[] = []
  const byKey = new Map(rows.map((r, k) => [r.key, { r, p: pairing[k]! }]))
  for (const r of rows.filter((x) => x.status === 'yours-only' && (x.yoursMinor ?? 0) > 0).sort((a, b) => (b.yoursMinor ?? 0) - (a.yoursMinor ?? 0)).slice(0, 5)) {
    facts.push({ kind: 'missing', weight: r.yoursMinor!, medium: false, rowKey: r.key,
      say: `The other quote doesn’t appear to include the ${say(r.name)}${where(r.room)}, which ours includes at ${m(r.yoursMinor!)} — worth checking, as it would likely be an extra cost later.`,
      evidenceLabel: 'Missing from their quote',
      evidence: `“${short(r.name, 90)}” (${r.trade}) is in our quote at ${m(r.yoursMinor!)} but does not appear in ${O}’s quote — the client would likely pay for it later.`,
      asQuestion: null })
  }
  const cheaper: Fact[] = [], below: Fact[] = []
  for (const r of rows.filter((x) => x.status === 'matched' && !x.yourWord && (x.yoursMinor ?? 0) > 0 && (x.theirsMinor ?? 0) > 0)) {
    const { p } = byKey.get(r.key)!
    const rt = rates(p.yours.map((i) => mine[i]!), p.theirs.map((j) => theirs[j]!))
    const y = r.yoursMinor!, t = r.theirsMinor!
    const ours = rt ? rt.yr : y, theirsRate = rt ? rt.tr : t
    const their = (r.theirIdx?.length ?? 0) === 1 && r.theirName ? r.theirName : r.name   // several lines of theirs: the work, in our words
    if (ours < theirsRate * 0.98) {
      const weight = rt ? Math.round((rt.tr - rt.yr) * Math.min(rt.yq, rt.tq)) : t - y
      cheaper.push({ kind: 'cheaper', weight, medium: false, rowKey: r.key,
        say: rt ? `On the ${say(r.name)}, our rate is ${m(rt.yr)}/${rt.unit} against ${m(rt.tr)}/${rt.unit} in the other quote.`
          : `On the ${say(r.name)}, ours is ${m(t - y)} less than the other quote for the same work.`,
        evidenceLabel: 'Same item, different price',
        evidence: `On the same item “${short(r.name, 80)}” (${r.trade}) our quote is ${rt ? `${m(rt.yr)}/${rt.unit} against ${m(rt.tr)}/${rt.unit}` : `${m(t - y)} less`} than ${O}’s (${m(y)} vs ${m(t)}).`,
        asQuestion: null })
    } else if (theirsRate < ours * 0.6) {
      const pct = Math.round((1 - theirsRate / ours) * 100)
      const weight = rt ? Math.round((rt.yr - rt.tr) * rt.tq) : y - t
      const several = (r.theirIdx?.length ?? 0) > 1
      below.push({ kind: 'below', weight, medium: true, rowKey: r.key,
        say: `The ${say(their)} in the other quote ${several ? 'are' : 'is'} priced well below ours — it’s worth asking what is excluded at that price.`,
        evidenceLabel: 'Priced well below ours',
        evidence: `${several ? `${O}’s ${r.theirIdx!.length} lines for “${short(r.name, 80)}”` : `${O}’s “${short(their, 80)}”`} (${r.trade}) ${several ? 'are' : 'is'} ${pct}% below ours — ${rt ? `${m(rt.tr)}/${rt.unit} against our ${m(rt.yr)}/${rt.unit}` : `${m(t)} against our ${m(y)}`}. Worth asking what is excluded at that price.`,
        asQuestion: several ? `Could you confirm what your ${say(their)} include at ${m(t)}?` : `Could you confirm what “${short(plainName(their), 60)}” includes at ${m(t)}?` })
    }
  }
  facts.push(...cheaper.sort((a, b) => b.weight - a.weight).slice(0, 3), ...below.sort((a, b) => b.weight - a.weight).slice(0, 3))
  if (unpricedCount) {
    facts.push({ kind: 'unpriced', weight: 20_000 * Math.min(unpricedCount, 5), medium: false, rowKey: null,
      say: `${unpricedCount} ${plural(unpricedCount, 'line', 'lines')} in the other quote ${plural(unpricedCount, 'carries', 'carry')} no price (FOC or Inclusive) — it’s worth asking exactly what ${plural(unpricedCount, 'it covers', 'they cover')} before comparing totals.`,
      evidenceLabel: 'No price given',
      evidence: `${unpricedCount} ${plural(unpricedCount, 'line prints', 'lines print')} FOC / Inclusive in ${O}’s quote; the work is promised but not costed, so the total can move.`,
      asQuestion: 'Which of the FOC / Inclusive lines are covered in full, and by whom?' })
  }
  // their arithmetic: a stated amount their own rate × quantity doesn't make — a hard number, never a question alone (1.0's fact 4, at most two)
  const theirRowKey = new Map<number, string>(); rows.forEach((r) => (r.theirIdx ?? []).forEach((j) => theirRowKey.set(j, r.key)))
  for (const [j, sl] of [...slips.entries()].sort((a, b) => Math.abs(b[1].statedMinor - b[1].computedMinor) - Math.abs(a[1].statedMinor - a[1].computedMinor)).slice(0, 2)) {
    const l = theirs[j]!, diff = Math.abs(sl.statedMinor - sl.computedMinor)
    const times = `${m(l.rateMinor!)} × ${qtyWords(l.qty, l.unit)}`
    facts.push({ kind: 'arithmetic', weight: diff, medium: false, rowKey: theirRowKey.get(j) ?? null,
      say: `In the other quote, the ${say(l.name)} is priced at ${m(sl.statedMinor)}, but its own rate and quantity (${times}) come to ${m(sl.computedMinor)} — worth asking which figure is right.`,
      evidenceLabel: 'Their numbers don’t add up',
      evidence: `${O}’s “${short(l.name, 80)}” (${l.trade}) states ${m(sl.statedMinor)}, but ${times} is ${m(sl.computedMinor)} — a ${m(diff)} difference worth clarifying.`,
      asQuestion: `Could you confirm the price of “${short(plainName(l.name), 60)}” — ${times} comes to ${m(sl.computedMinor)}, not ${m(sl.statedMinor)}?` })
  }
  // materials: 1.0's sixteen, on their lines, never when one of yours uses the same material the same way
  const yourText = (l: YourLine) => `${l.trade ?? ''} ${l.room ?? ''} ${l.name} ${l.description ?? ''} ${l.brand ?? ''}`
  const theirText = (l: TheirLine) => `${l.trade} ${l.room ?? ''} ${l.name} ${l.brand ?? ''}`
  for (const f of materialFindings(theirs.map((l, j) => ({ key: theirRowKey.get(j) ?? `t-${j}`, text: theirText(l), trade: l.trade, name: l.name, amountMinor: l.amountMinor })), mine.map((l) => ({ text: yourText(l), trade: l.trade ?? '' })), sameTrade).slice(0, 2)) {
    facts.push({ kind: 'material', weight: Math.max(f.lineMinor, 100_000), medium: false, rowKey: f.rowKey,
      say: f.question, evidenceLabel: 'Material difference',
      evidence: `${O}’s “${short(f.item, 80)}” (${f.trade}) specifies ${f.material}. ${f.weakness}${f.ownAlternative ? ` Your quote uses ${f.ownAlternative} there.` : ''}`,
      asQuestion: null })
  }
  // brands: the notes on each side (Q-09) — and the two brand facts (B-44, B-45)
  const theirBrandIn = (l: TheirLine) => l.brand ?? BRAND_NOTES.find((b) => b.match.test(l.name))?.brand ?? null
  const brands: XrayBrand[] = []
  const brandFacts: Fact[] = []
  for (const b of BRAND_NOTES) {
    const yLine = mine.find((l) => b.match.test(yourText(l)))
    const tIdx = theirs.findIndex((l) => b.match.test(`${l.name} ${l.brand ?? ''}`))
    const tLine = tIdx >= 0 ? theirs[tIdx]! : null
    if (!yLine && !tLine) continue
    if (yLine && tLine) continue   // both name it: like for like, left out (1.0)
    if (yLine) {
      const theirsThere = theirs.map((l) => (sameTrade(l.trade, b.trade) || sameTrade(l.trade, yLine.trade) ? theirBrandIn(l) : null)).find((x) => x && x !== b.brand) ?? null
      brands.push({ brand: b.brand, trade: b.trade, side: 'yours', tone: 'advantage', impact: null, sources: [],
        text: theirsThere ? `Your quote names ${b.brand}; the other quote names ${theirsThere} there.` : `Your quote names ${b.brand}. The other quote doesn’t say what brand the client would get.` })
      if (!theirsThere) brandFacts.push({ kind: 'brand', weight: 60_000, medium: true, rowKey: rows.find((r) => r.yourIds?.includes(yLine.id))?.key ?? null,
        say: `Our quote states exactly what you get — ${b.brand} for the ${b.trade.toLowerCase()}. The other quote doesn’t name a brand there, so it’s worth asking what they would actually install.`,
        evidenceLabel: 'Brand difference',
        evidence: `Your quote names ${b.brand} for “${short(yLine.name, 80)}” (${yLine.trade ?? b.trade}); ${O}’s quote does not say what brand would be used there.`,
        asQuestion: null })
    } else if (b.impact) {
      brands.push({ brand: b.brand, trade: b.trade, side: 'theirs', tone: 'risk', impact: b.impact, sources: b.sources, text: `${b.note} You can ask ${O} how they handle this with ${b.brand}.` })
      if (b.ask) brandFacts.push({ kind: 'brand', weight: b.impact === 'high' ? 40_000 : 25_000, medium: true, rowKey: theirRowKey.get(tIdx) ?? null,
        say: `The other quote specifies ${b.brand} for the ${b.trade.toLowerCase()} — ${b.ask}`,
        evidenceLabel: 'Brand difference',
        evidence: `${O} names ${b.brand} for “${short(tLine!.name, 80)}” (${tLine!.trade}). ${b.note}`,
        asQuestion: null })
    } else {
      brands.push({ brand: b.brand, trade: b.trade, side: 'theirs', tone: 'checked', impact: null, sources: [], text: b.note })
    }
  }
  facts.push(...brandFacts.sort((a, b) => b.weight - a.weight).slice(0, 2))
  brands.sort((a, b) => (a.tone === 'advantage' ? 0 : a.tone === 'risk' ? 1 : 2) - (b.tone === 'advantage' ? 0 : b.tone === 'risk' ? 1 : 2) || (b.impact === 'high' ? 1 : 0) - (a.impact === 'high' ? 1 : 0))

  const picked: Fact[] = []
  const usedRows = new Set<string>()
  for (const f of [...facts].sort((a, b) => b.weight - a.weight)) {
    if (picked.length === 3) break
    if (f.rowKey && usedRows.has(f.rowKey)) continue
    picked.push(f); if (f.rowKey) usedRows.add(f.rowKey)
  }
  const points: XrayPoint[] = (picked.length === 1 && picked[0]!.medium ? [] : picked)   // "confidence beats completeness" (1.0, B-47)
    .map((f, k) => ({ n: k + 1, kind: f.kind, say: f.say, evidenceLabel: f.evidenceLabel, evidence: f.evidence, asQuestion: f.asQuestion, medium: f.medium, rowKey: f.rowKey }))

  const client = ctx.clientName?.trim().split(/\s+/)[0] ?? null
  const result: XrayResult = {
    engine: ENGINE, yourLabel: ctx.yourLabel, yourStudio: ctx.yourStudio, otherStudio: O, client, quoteTotalMinor: ctx.quoteTotalMinor ?? null,
    yoursMinor, theirsMinor, onPaperMinor, yoursOnlyMinor, theirsOnlyMinor, unpricedCount, realDiffMinor,
    headline, footnote, points, brands, rows, compared: rows.length, message: '',
  }
  result.message = draftMessage(result)
  return result
}

/**
 * (Q-07 · Q-08) The WhatsApp draft: what the screen says — each point as shown (its question when switched), then the
 * like-for-like line (1.0's, B-50), then the sign-off. It never names the other studio.
 */
export function draftMessage(r: Pick<XrayResult, 'points' | 'client' | 'yourStudio' | 'onPaperMinor' | 'realDiffMinor' | 'yoursOnlyMinor'>, questions: ReadonlySet<number> = new Set()): string {
  const m = (minor: number) => money(Math.abs(minor))
  const hi = `Hi ${r.client || 'there'},`
  const lines = r.points.length
    ? [`${hi} I’ve looked at both quotes and wanted to share a few differences I found:`, ...r.points.map((p) => `${p.n}. ${questions.has(p.n) && p.asQuestion ? p.asQuestion : p.say}`)]
    : [`${hi} I’ve looked at both quotes side by side.`]
  const gap = r.onPaperMinor < 0
    ? (r.realDiffMinor > 0 && r.yoursOnlyMinor > 0 ? `So like-for-like, the real difference between the two quotes is ${m(r.realDiffMinor)}, not ${m(r.onPaperMinor)}.`
      : r.realDiffMinor < 0 ? `So like-for-like, ours actually comes to ${m(r.realDiffMinor)} less.`
      : r.realDiffMinor === 0 ? 'So like-for-like, the two quotes come to the same.' : null)
    : r.onPaperMinor > 0 && r.realDiffMinor <= 0 ? `Our quote is already ${m(r.onPaperMinor)} lower for the work covered.` : null
  if (gap) lines.push(gap)
  lines.push(`Happy to walk you through it whenever suits — ${r.yourStudio}`)
  return lines.join('\n')
}

/** The other studio's lines as "yours" — the Upload two quotes mode, where your side is a file too; brands kept (Q-09). */
export function refAsYours(q: RefQuote): YourLine[] {
  return q.lines.map((l: RefLine, i) => ({ id: `${q.key}-${i}`, name: l.name, description: null, trade: l.trade, room: l.room, qty: l.qty, unit: l.unit, amountMinor: l.amountMinor, optional: false, word: null, brand: l.brand ?? null }))
}

/** A stored reading, read back whole: an engine-1 reading lacks the fields engine 2 added. */
export function readResult(json: string): XrayResult {
  const r = JSON.parse(json) as XrayResult
  return { ...r, points: r.points ?? [], brands: r.brands ?? [], rows: r.rows ?? [], client: r.client ?? null, quoteTotalMinor: r.quoteTotalMinor ?? null }
}
