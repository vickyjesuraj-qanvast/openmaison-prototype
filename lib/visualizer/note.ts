import { CATALOGUE } from './catalogue'
import { COLOUR_HEX } from './furniture'
import { RELIGHT_PRESETS } from './lighting'
import { STYLE_NAMES } from './styles'

/* AI Visualizer (REG-674, audit §5.5) — the note, read by rules: a colour on a surface ("sage green walls", "paint the ceiling navy"),
   a style ("make it japandi"), a mood ("warmer", "evening"), "empty the room". 1.0 sent the note to the model; the curated engine reads
   what it can and says when it can't. Pure and client-safe. */

const COLOURS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(COLOUR_HEX).map(([k, v]) => [k.toLowerCase(), v])),
  white: '#F4F2EE', 'warm white': '#F3EDE2', 'off white': '#F2EEE5', ivory: '#F1EAD8', beige: '#D9C9AE', sand: '#D6C3A1', greige: '#C8BCAB', taupe: '#A69585', mushroom: '#B8A99A',
  grey: '#A9AAAB', gray: '#A9AAAB', 'dark grey': '#5A5C5E', 'dark gray': '#5A5C5E', 'warm grey': '#ADA69C', 'cool grey': '#9FA5AA', stone: '#BDB5A8', concrete: '#9C9A96',
  black: '#1D1D1D', 'jet black': '#121212', brown: '#7A5537', chocolate: '#4E3426', walnut: '#6B4A2E', oak: '#C8A165', 'light oak': '#D6B98C', teak: '#9A6B43',
  green: '#4F7A55', 'forest green': '#2E4A36', olive: '#7A7A4A', sage: '#98AB8A', mint: '#BFD8C4', teal: '#2F6F6F',
  blue: '#4A6FA5', 'sky blue': '#9CC3E0', 'powder blue': '#B8CFE0', 'dusty blue': '#7F97AE', indigo: '#34406B',
  yellow: '#E0C35A', ochre: '#C08A2E', orange: '#D8793A', rust: '#A5532F', coral: '#E27D6A', red: '#A93A34', burgundy: '#6E2233', pink: '#E6B3B8', blush: '#E7B7B9',
  lavender: '#B9A8CF', lilac: '#C4A9D2', purple: '#6D4A7E', gold: '#C9A441', brass: '#B59B4E', copper: '#B06A3B', silver: '#BFC3C7',
}
const SURFACES: { words: string[]; target: string }[] = [
  { words: ['feature wall', 'accent wall'], target: 'feature wall' }, { words: ['walls', 'wall'], target: 'wall' }, { words: ['ceiling'], target: 'ceiling' },
  { words: ['floors', 'floor', 'flooring'], target: 'floor' }, { words: ['lower cabinets', 'base cabinets'], target: 'lower cabinet' }, { words: ['upper cabinets', 'wall cabinets'], target: 'upper cabinet' },
  { words: ['cabinets', 'cabinet', 'cabinetry', 'kitchen'], target: 'cabinet' }, { words: ['wardrobe', 'wardrobes'], target: 'wardrobe' }, { words: ['countertop', 'countertops', 'worktop', 'worktops', 'counter'], target: 'worktop' },
  { words: ['backsplash', 'splashback'], target: 'backsplash' }, { words: ['island'], target: 'island' },
  { words: ['sofa', 'couch'], target: 'sofa' }, { words: ['armchair', 'chair'], target: 'chair' }, { words: ['rug', 'carpet'], target: 'rug' }, { words: ['curtains', 'drapes'], target: 'curtain' },
  { words: ['bedspread', 'bedding', 'duvet'], target: 'bedspread' }, { words: ['headboard', 'bed'], target: 'headboard' }, { words: ['stools', 'stool', 'bar stools'], target: 'stool' },
]
const MOODS: { words: string[]; preset: string }[] = [
  { words: ['golden hour', 'sunset', 'afternoon sun'], preset: 'golden-hour' }, { words: ['evening', 'cosy', 'cozy', 'lamplight', 'night'], preset: 'warm-cozy' },
  { words: ['dusk', 'blue hour', 'moody'], preset: 'blue-hour' }, { words: ['daylight', 'bright', 'brighter', 'airy', 'airier', 'sunny'], preset: 'daylight' },
  { words: ['overcast', 'soft light', 'softer light', 'flat light'], preset: 'overcast' }, { words: ['dramatic', 'spotlight', 'spotlit'], preset: 'spotlight' },
]

export type NoteReading = {
  /** A colour for every surface or piece whose label names the target. */
  paints: { target: string; hex: string; name: string }[]
  style: string | null
  lighting: string | null
  warmer: number
  empty: boolean
}

const has = (text: string, w: string) => new RegExp(`\\b${w.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)
/** Longest match first, so "sage green" wins over "green". (verify round 1) Also what a Replace's words name ("…walnut coffee table…"). */
export function colourIn(text: string): { name: string; hex: string } | null {
  const cat = [...CATALOGUE].sort((a, b) => b.name.length - a.name.length).find((c) => c.category !== 'Gush Paints' && c.category !== 'Gush Enamel' && has(text, c.name.toLowerCase()))
  if (cat) return { name: cat.name, hex: cat.swatch }
  const k = Object.keys(COLOURS).sort((a, b) => b.length - a.length).find((w) => has(text, w))
  return k ? { name: k.replace(/\b\w/g, (c) => c.toUpperCase()), hex: COLOURS[k]! } : null
}

export function readNote(raw: string): NoteReading | null {
  const text = raw.toLowerCase().replace(/[“”"]/g, ' ')
  if (!text.trim()) return null
  const r: NoteReading = { paints: [], style: null, lighting: null, warmer: 0, empty: false }
  /* each clause on its own ("sage green walls and a walnut floor") */
  for (const clause of text.split(/,|;|\band\b|\bwith\b|\.|\bthen\b/)) {
    const c = clause.trim()
    if (!c) continue
    const surface = SURFACES.find((s) => s.words.some((w) => has(c, w)))
    const colour = colourIn(c)
    if (surface && colour) r.paints.push({ target: surface.target, ...colour })
  }
  r.style = STYLE_NAMES.find((s) => has(text, s.toLowerCase())) ?? null
  r.lighting = MOODS.find((m) => m.words.some((w) => has(text, w)))?.preset ?? null
  if (/\bwarm(er)?\b|\bcosier\b/.test(text) && !r.lighting) r.warmer = 1
  if (/\bcool(er)?\b|\bfresher\b/.test(text) && !r.lighting) r.warmer = -1
  r.empty = /\b(empty|declutter|defurnish|clear)\b.*\b(room|space|it)\b|\bremove (all )?(the )?furniture\b/.test(text)
  if (r.lighting && !RELIGHT_PRESETS.some((p) => p.id === r.lighting)) r.lighting = null
  return r.paints.length || r.style || r.lighting || r.warmer || r.empty ? r : null
}

/* ── (audit 2026-09-26, F056) "Keep unchanged": what a transfer must leave alone ── */
const KEEP_STOP = /^(the|my|our|their|his|her|a|an|all|any|every|keep|unchanged|as|is|it|its|please|leave|alone)$/
const SYNONYM: Record<string, string> = { couch: 'sofa', settee: 'sofa', sectional: 'sofa', drape: 'curtain', drapery: 'curtain', blind: 'curtain', carpet: 'rug', cabinetry: 'cabinet', joinery: 'cabinet', counter: 'worktop', countertop: 'worktop', benchtop: 'worktop', flooring: 'floor', television: 'tv', telly: 'tv', wallpaper: 'wall' }
/** A word on its own: lower-case, singular, its common synonym ("drapes" → curtain, "couch" → sofa). */
export function nounOf(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
  return SYNONYM[w] ?? w
}
/** Each phrase of a "keep unchanged" text, cleaned of articles and possessives ("the client's green sofa" → green sofa), with its head noun. */
export function keepTargets(text: string): { phrase: string; head: string }[] {
  return text.toLowerCase().replace(/[“”"]/g, ' ').split(/[,;&]|\band\b|\bplus\b/).map((raw) => {
    const words = raw.trim().split(/\s+/).filter((w) => w && !KEEP_STOP.test(w) && !/['’]s$/.test(w))
    return { phrase: words.join(' '), head: nounOf(words[words.length - 1] ?? '') }
  }).filter((t) => t.head.length > 1)
}
/** The noun a label is about — before any "in / with / on" ("fig in a terracotta pot" is a fig), without its "(position)". */
export const headOfLabel = (label: string) => { const main = label.toLowerCase().replace(/\([^)]*\)/g, '').split(/\s+(?:in|with|on|by|of)\s+/)[0]!.trim().split(/[\s-]+/); return main[main.length - 1] ?? '' }
/** Whether a surface or a piece is kept: its label holds the whole phrase, or — a surface — its label or its group ("Walls") holds the
    head noun, or — a piece (no group) — the piece IS that noun ("walls" keeps the walls, not the wall-mounted TV). The head alone, so
    "green sofa" never keeps a green feature wall. */
export function keepMatch(targets: { phrase: string; head: string }[], label: string, group?: string): boolean {
  const words = group !== undefined ? new Set([...label.toLowerCase().split(/[^a-z]+/), ...group.toLowerCase().split(/[^a-z]+/)].filter(Boolean).map(nounOf)) : new Set([nounOf(headOfLabel(label))])
  return targets.some((t) => (t.phrase.length > 2 && label.toLowerCase().includes(t.phrase)) || words.has(t.head))
}
