/**
 * How a quote line's words are read when two lines are compared — one reading for every matcher in the app: Quote X-Ray pairs your lines
 * with the other studio's (lib/xray/compare.ts, engine 2), and the Price book matches a quote's lines to My Items (lib/company/price-book-match.ts,
 * pending modules S12). Moved here unchanged from the X-Ray engine (REG-636…642) so both read the same words. Pure, client-safe.
 */

/** Words that say nothing about which work a line is ("supply and install", "works", "lot"). */
const STOP = new Set(['and', 'the', 'with', 'to', 'of', 'for', 'a', 'an', 'in', 'on', 'at', 'existing', 'supply', 'install', 'installation', 'labour', 'labor', 'tools', 'works', 'work', 'design', 'fabricate', 'new', 'all', 'per', 'entire', 'unit', 'lot', 'no', 'w', 'x', 'by', 'from', 'into', 'up', 'or', 'as', 'is', 'be', 'including', 'included', 'include', 'provide', 'provision'])
/** (X-Ray Q-03) Trade words that mean the same work. */
const SAME: Record<string, string> = {
  hacking: 'hack', demolish: 'hack', demolishing: 'hack', demolition: 'hack', dismantle: 'hack', dismantling: 'hack', removal: 'hack', remove: 'hack',
  cabinetry: 'cabinet', worktop: 'countertop', tiling: 'tile', painting: 'paint', plastering: 'plaster', screeding: 'screed',
  waterproofing: 'waterproof', lighting: 'light', wiring: 'wire', rewiring: 'wire', flooring: 'floor', socket: 'point',
  closing: 'close', glasswork: 'glass', toilet: 'bathroom', debri: 'debris', dispose: 'disposal', haulage: 'disposal', cart: 'disposal',
  plumbing: 'plumb', partitioning: 'partition', laminated: 'laminate',
}
export function stem(w: string): string {
  const s = SAME[w]; if (s) return s
  let t = w
  if (t.length > 4 && t.endsWith('ies')) t = `${t.slice(0, -3)}y`
  else if (t.length > 4 && /(sh|ch|x|z)es$/.test(t)) t = t.slice(0, -2)
  else if (t.length > 3 && t.endsWith('s') && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1)
  return SAME[t] ?? t
}
/** Two-letter words that name work ("TV console", "WC", "DB box", "3D drawings"). */
const SHORT = new Set(['tv', 'wc', 'db', '3d'])
/** A line's words: lower case, the glue and bare numbers dropped, plurals and trade words read alike — each once. */
export const tokens = (s: string) => Array.from(new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => (t.length > 2 || SHORT.has(t)) && !STOP.has(t) && !/^\d+$/.test(t)).map(stem)))
/** A trade's own words ("Carpentry Works" → carpentry). */
export const tradeWords = (t: string | null) => tokens(t ?? '').filter((w) => w !== 'common')
/** Two trades are the same work when their names share a word ("Tiling" and "Tile works"). */
export const sameTrade = (a: string | null, b: string | null) => { const x = tradeWords(a), y = tradeWords(b); return x.length > 0 && y.length > 0 && x.some((w) => y.includes(w)) }

/** A unit as rates compare it — metres stay metres (1.0 read "rm" and "lm" as feet, B-58). */
export function normUnit(u: string | null | undefined): string | null {
  const s = (u ?? '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  if (!s) return null
  if (/^(sq ?ft|sf|psf|square f(ee|oo)t)$/.test(s)) return 'sqft'
  if (/^(ft|feet|foot|ft run|run ft|running ft|rft|lft|l ft)$/.test(s)) return 'ft'
  if (/^(sq ?m|m2|square met(re|er)s?)$/.test(s)) return 'sqm'
  if (/^(m|lm|rm|met(re|er)s?|run m|running m)$/.test(s)) return 'm'
  if (/^(pts?|points?)$/.test(s)) return 'point'
  if (/^(pcs?|pieces?|nos?|units?|ea|each)$/.test(s)) return 'pc'
  if (/^sets?$/.test(s)) return 'set'
  if (/^(lots?|ls|lump ?sum|sum)$/.test(s)) return 'lot'
  return s
}
