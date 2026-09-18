import { BRAND_NOTES } from './brands'
import type { RefLine, RefQuote } from './reference'

/**
 * Quote X-Ray (REG-529) — the comparison itself, pure and deterministic (the prototype's "AI"): your lines against the other
 * studio's, matched by what the words say, then the real difference once the work each quote leaves out is counted, three
 * client-ready points, the brands worth a word, and the item-by-item rows. Everything the result page prints comes from here.
 */
export type YourLine = { id: string; name: string; description: string | null; trade: string | null; room: string | null; qty: number; unit: string | null; amountMinor: number; optional: boolean }
export type XrayRowStatus = 'matched' | 'yours-only' | 'theirs-only' | 'unpriced'
export type XrayRow = { key: string; name: string; theirName: string | null; trade: string; room: string | null; yoursMinor: number | null; theirsMinor: number | null; status: XrayRowStatus }
export type XrayPoint = { n: number; kind: 'missing' | 'below-market' | 'unpriced'; say: string; evidenceLabel: string; evidence: string; asQuestion: string | null }
export type XrayBrand = { brand: string; trade: string; side: 'yours' | 'theirs' | 'both'; tone: 'advantage' | 'risk' | 'note'; impact: 'high' | 'mild' | null; text: string; sources: string[] }
export type XrayResult = {
  yourLabel: string; yourStudio: string; otherStudio: string
  yoursMinor: number; theirsMinor: number
  /** theirs − yours: negative = the other quote is cheaper on paper. */
  onPaperMinor: number
  yoursOnlyMinor: number; theirsOnlyMinor: number; unpricedCount: number
  /** (yours − yours-only) − (theirs − theirs-only): the like-for-like gap; negative = ours is less. */
  realDiffMinor: number
  headline: string; footnote: string
  points: XrayPoint[]; brands: XrayBrand[]; rows: XrayRow[]
  compared: number
  /** The WhatsApp draft. */
  message: string
}

const STOP = new Set(['and', 'the', 'with', 'to', 'of', 'for', 'a', 'an', 'in', 'on', 'at', 'existing', 'supply', 'install', 'installation', 'labour', 'labor', 'tools', 'works', 'work', 'design', 'fabricate', 'new', 'all', 'per', 'entire', 'unit', 'lot', 'no', 'w', 'x', 'by', 'from', 'into', 'up', 'or', 'as', 'is', 'be'])
const tokens = (s: string) => Array.from(new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t))))
const score = (a: string[], b: string[]) => { if (!a.length || !b.length) return 0; const shared = a.filter((t) => b.includes(t)).length; return shared < 2 ? 0 : shared / Math.min(a.length, b.length) }

export const money = (minor: number) => `S$ ${(minor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const moneyK = (minor: number) => { const v = Math.abs(minor) / 100; return `S$ ${v >= 1000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}K` : v.toFixed(0)}` }
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const short = (s: string, max = 72) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s)

export function compareQuotes(yours: YourLine[], other: RefQuote, ctx: { yourLabel: string; yourStudio: string; clientName: string | null }): XrayResult {
  const mine = yours.filter((l) => !l.optional)
  const theirs = other.lines
  const mineTok = mine.map((l) => tokens(`${l.name} ${l.description ?? ''}`))
  const theirTok = theirs.map((l) => tokens(l.name))
  // greedy best match, the strongest pairs first
  const pairs: { i: number; j: number; s: number }[] = []
  mine.forEach((_, i) => theirs.forEach((_, j) => { const s = score(mineTok[i]!, theirTok[j]!); if (s >= 0.5) pairs.push({ i, j, s }) }))
  pairs.sort((a, b) => b.s - a.s)
  const usedI = new Set<number>(), usedJ = new Set<number>(); const match = new Map<number, number>()
  for (const p of pairs) { if (usedI.has(p.i) || usedJ.has(p.j)) continue; usedI.add(p.i); usedJ.add(p.j); match.set(p.i, p.j) }

  const rows: XrayRow[] = []
  mine.forEach((l, i) => {
    const j = match.get(i)
    if (j === undefined) rows.push({ key: `y-${l.id}`, name: l.name, theirName: null, trade: l.trade ?? 'Other', room: l.room, yoursMinor: l.amountMinor, theirsMinor: null, status: 'yours-only' })
    else { const t = theirs[j]!; rows.push({ key: `m-${l.id}`, name: l.name, theirName: t.name, trade: l.trade ?? t.trade, room: l.room ?? t.room, yoursMinor: l.amountMinor, theirsMinor: t.amountMinor, status: t.amountMinor === 0 ? 'unpriced' : 'matched' }) }
  })
  theirs.forEach((t, j) => { if (!usedJ.has(j)) rows.push({ key: `t-${j}`, name: t.name, theirName: t.name, trade: t.trade, room: t.room, yoursMinor: null, theirsMinor: t.amountMinor, status: t.amountMinor === 0 ? 'unpriced' : 'theirs-only' }) })

  const yoursMinor = mine.reduce((s, l) => s + l.amountMinor, 0)
  const theirsMinor = theirs.reduce((s, l) => s + l.amountMinor, 0)
  const yoursOnlyMinor = rows.filter((r) => r.status === 'yours-only').reduce((s, r) => s + (r.yoursMinor ?? 0), 0)
  const theirsOnlyMinor = rows.filter((r) => r.status === 'theirs-only').reduce((s, r) => s + (r.theirsMinor ?? 0), 0)
  const unpricedCount = rows.filter((r) => r.status === 'unpriced').length
  const onPaperMinor = theirsMinor - yoursMinor
  const realDiffMinor = (yoursMinor - yoursOnlyMinor) - (theirsMinor - theirsOnlyMinor)
  const O = other.studio

  const headline = onPaperMinor < 0
    ? (realDiffMinor > 0
        ? `On paper, ${O} is ${money(-onPaperMinor)} cheaper; after counting the work each quote leaves out, ours is only ${money(realDiffMinor)} more like-for-like.`
        : `On paper, ${O} is ${money(-onPaperMinor)} cheaper — but like-for-like, ours comes to ${money(-realDiffMinor)} less.`)
    : (realDiffMinor <= 0
        ? `On paper, ${O} is ${money(onPaperMinor)} more; like-for-like, ours is ${money(-realDiffMinor)} less.`
        : `On paper, ${O} is ${money(onPaperMinor)} more, and like-for-like ours is still ${money(realDiffMinor)} more — the difference is in what each quote includes.`)
  const footnote = `On paper the difference is ${money(Math.abs(onPaperMinor))} — their quote leaves out ${money(yoursOnlyMinor)} of work your quote includes${theirsOnlyMinor ? ` (and yours leaves out ${money(theirsOnlyMinor)} of theirs)` : ''}${unpricedCount ? `, plus ${unpricedCount} ${unpricedCount === 1 ? 'line' : 'lines'} with no price given` : ''}.`

  // Say this: the two biggest things their quote leaves out, then a price that looks too good
  const points: XrayPoint[] = []
  const missing = rows.filter((r) => r.status === 'yours-only' && (r.yoursMinor ?? 0) > 0).sort((a, b) => (b.yoursMinor ?? 0) - (a.yoursMinor ?? 0)).slice(0, 2)
  for (const r of missing) {
    points.push({ n: points.length + 1, kind: 'missing',
      say: `${O}'s quote does not include the ${lower(short(r.name, 60))}${r.room ? ` for the ${r.room.toLowerCase()}` : ''}, which ours includes at ${money(r.yoursMinor!)} — that would likely be an extra cost later.`,
      evidenceLabel: 'Missing from their quote',
      evidence: `“${short(r.name, 90)}” (${r.trade}) is in our quote at ${money(r.yoursMinor!)} but does not appear in ${O} — the client would likely pay for it later.`,
      asQuestion: null })
  }
  const cheap = rows.filter((r) => r.status === 'matched' && r.yoursMinor && r.theirsMinor && r.theirsMinor < r.yoursMinor * 0.6).sort((a, b) => (a.theirsMinor! / a.yoursMinor!) - (b.theirsMinor! / b.yoursMinor!))[0]
  if (cheap && points.length < 3) {
    const pctBelow = Math.round((1 - cheap.theirsMinor! / cheap.yoursMinor!) * 100)
    points.push({ n: points.length + 1, kind: 'below-market',
      say: `Regarding the ‘${lower(short(cheap.theirName ?? cheap.name, 60))}’ in the other quote, it is priced well below what we see for this work; you might want to ask them what is excluded at that price.`,
      evidenceLabel: 'Priced below market',
      evidence: `${O}'s “${short(cheap.theirName ?? cheap.name, 80)}” (${cheap.trade}) is ${pctBelow}% below ours — ${money(cheap.theirsMinor!)} vs ${money(cheap.yoursMinor!)}. Worth asking what is excluded at that price.`,
      asQuestion: `Could you confirm what “${short(cheap.theirName ?? cheap.name, 60)}” includes at ${money(cheap.theirsMinor!)}?` })
  }
  if (points.length < 3 && unpricedCount) {
    points.push({ n: points.length + 1, kind: 'unpriced',
      say: `${unpricedCount} ${unpricedCount === 1 ? 'line' : 'lines'} in ${O}'s quote ${unpricedCount === 1 ? 'carries' : 'carry'} no price (FOC or Inclusive) — it is worth asking exactly what they cover before comparing totals.`,
      evidenceLabel: 'No price given',
      evidence: `${unpricedCount} ${unpricedCount === 1 ? 'line prints' : 'lines print'} FOC / Inclusive in ${O}; the work is promised but not costed, so the total can move.`,
      asQuestion: `Which of the FOC / Inclusive lines are covered in full, and by whom?` })
  }

  // Brands worth a word
  const yourText = mine.map((l) => `${l.name} ${l.description ?? ''}`).join(' | ')
  const theirText = theirs.map((l) => `${l.name} ${l.brand ?? ''}`).join(' | ')
  const brands: XrayBrand[] = []
  for (const b of BRAND_NOTES) {
    const y = b.match.test(yourText), t = b.match.test(theirText)
    if (!y && !t) continue
    const side: XrayBrand['side'] = y && t ? 'both' : y ? 'yours' : 'theirs'
    if (side === 'yours') brands.push({ brand: b.brand, trade: b.trade, side, tone: 'advantage', impact: null, text: `Your quote names ${b.brand}. The other quote doesn't say what the client would get.`, sources: [] })
    else if (side === 'theirs') brands.push({ brand: b.brand, trade: b.trade, side, tone: b.impact ? 'risk' : 'note', impact: b.impact, text: `${b.note}${b.impact ? ` You can ask ${O} how they handle this with ${b.brand}.` : ''}`, sources: b.sources })
    else brands.push({ brand: b.brand, trade: b.trade, side, tone: 'note', impact: null, text: `Both quotes name ${b.brand} — like for like on this one.`, sources: [] })
  }
  brands.sort((a, b) => (a.tone === 'advantage' ? 0 : a.tone === 'risk' ? 1 : 2) - (b.tone === 'advantage' ? 0 : b.tone === 'risk' ? 1 : 2) || (b.impact === 'high' ? 1 : 0) - (a.impact === 'high' ? 1 : 0))

  const first = ctx.clientName?.split(/\s+/)[0] ?? null
  const message = [`Hi ${first ?? 'there'}, I've looked at both quotes and wanted to share a few differences I found:`, ...points.map((p) => `${p.n}. ${p.say}`), `Happy to walk you through it whenever suits — ${ctx.yourStudio}`].join('\n')

  return { yourLabel: ctx.yourLabel, yourStudio: ctx.yourStudio, otherStudio: O, yoursMinor, theirsMinor, onPaperMinor, yoursOnlyMinor, theirsOnlyMinor, unpricedCount, realDiffMinor, headline, footnote, points, brands, rows, compared: rows.length, message }
}

/** The other studio's lines as "yours" — the Upload two quotes mode, where your side is a file too. */
export function refAsYours(q: RefQuote): YourLine[] {
  return q.lines.map((l: RefLine, i) => ({ id: `${q.key}-${i}`, name: l.name, description: null, trade: l.trade, room: l.room, qty: l.qty, unit: l.unit, amountMinor: l.amountMinor, optional: false }))
}
