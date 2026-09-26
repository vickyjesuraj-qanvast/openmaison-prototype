export { ROOM_PROGRAMS, FURNISH_DENSITIES, type RoomProgram, type FurnishDensity } from './data/programs.gen'
import { headOfLabel, nounOf } from './note'

/* AI Visualizer (REG-674) — the Tools mode's choices, 1.0's words (C-15, C-104, C-105). Pure and client-safe. */

export type EmptyScope = 'keep-builtins' | 'joinery'
export const EMPTY_SCOPES: { key: EmptyScope; label: string; hint: string }[] = [
  { key: 'keep-builtins', label: 'Keep built-ins', hint: 'Clear furniture, accessories, wall TVs and wall lights. Keep panelling and fitted cabinetry.' },
  { key: 'joinery', label: 'Strip to shell', hint: 'Remove everything, panelling and protruding built-ins too — back to plain walls. The floor stays.' },
]

export type StyleAspect = 'palette' | 'materials' | 'furniture' | 'lighting' | 'decor'
export const STYLE_ASPECTS: { key: StyleAspect; label: string; hint: string }[] = [
  { key: 'palette', label: 'Colour palette', hint: 'Wall, textile and accent colours' },
  { key: 'materials', label: 'Materials & finishes', hint: 'Flooring, joinery, stone, metal' },
  { key: 'furniture', label: 'Furniture style', hint: 'Swaps forms — needs flexible geometry' },
  { key: 'lighting', label: 'Lighting mood', hint: 'Warmth, contrast, fixture character' },
  { key: 'decor', label: 'Decor & styling', hint: 'Art, plants, textiles, objects' },
]
export const DEFAULT_ASPECTS: StyleAspect[] = ['palette', 'materials', 'lighting', 'decor']
export type ReferenceRole = 'overall' | 'palette' | 'materials' | 'furniture' | 'lighting'
export const REFERENCE_ROLES: { key: ReferenceRole; label: string }[] = [{ key: 'overall', label: 'Overall' }, { key: 'palette', label: 'Palette' }, { key: 'materials', label: 'Materials' }, { key: 'furniture', label: 'Furniture' }, { key: 'lighting', label: 'Lighting' }]   // (F068) one plain word each under 'Use it for'
export type StyleStrength = 'hint' | 'balanced' | 'full'
export const STRENGTHS: { key: StyleStrength; label: string; hint: string }[] = [{ key: 'hint', label: 'Subtle', hint: 'Light refresh — same room, better' }, { key: 'balanced', label: 'Balanced', hint: 'Clearly the reference’s style' }, { key: 'full', label: 'Full', hint: 'Commit fully to the reference' }]
export type GeometryLock = 'locked' | 'structural' | 'flexible'
export const GEOMETRIES: { key: GeometryLock; label: string; hint: string }[] = [{ key: 'locked', label: 'Locked', hint: 'Re-finish only — nothing moves' }, { key: 'structural', label: 'Structural', hint: 'Shell fixed, furniture may be swapped' }, { key: 'flexible', label: 'Flexible', hint: 'Shell fixed, layout is open' }]
export const MAX_REFERENCES = 3

/* ── (audit 2026-09-26, F055 · F064) which pieces a free text names — Furnish's Leave out, Empty's "anything else to take out" ── */
const PIECE_STOP = /^(no|not|without|the|a|an|any|all|my|our|please|leave|out|take|remove|and|or|dont|don|t|too|also|extra|other|of)$/
/** A piece's kind, the way a studio names it: "fiddle leaf fig in a terracotta pot" → plant; "sheer curtains (left)" → curtain. */
const KIND: Record<string, string> = { fig: 'plant', palm: 'plant', fern: 'plant', monstera: 'plant', tree: 'plant', pot: 'plant', planter: 'plant', succulent: 'plant',
  armchair: 'chair', seat: 'chair', painting: 'art', print: 'art', artwork: 'art', picture: 'art', frame: 'art', light: 'lamp', lighting: 'lamp', pendant: 'lamp' }
const kindOf = (w: string) => { const n = nounOf(w); return KIND[n] ?? n }
/** The phrases of a free text ("no TV, no rug" → tv · rug), each with its kind and its qualifiers ("coffee table" → table, coffee). */
function phrasesOf(text: string): { raw: string; kind: string; quals: string[] }[] {
  return text.toLowerCase().replace(/[“”"]/g, ' ').split(/[,;&.]|\band\b|\bor\b/).map((raw) => {
    const words = raw.trim().replace(/['’]/g, '').split(/\s+/).filter((w) => w && !PIECE_STOP.test(w))
    const last = words[words.length - 1] ?? ''
    return { raw: raw.trim(), kind: kindOf(last), quals: words.slice(0, -1).map(nounOf).filter((w) => w.length > 2) }
  }).filter((p) => p.kind.length > 1)
}
/** Whether a phrase names a piece: the same kind, and every qualifier in its label ("coffee table" isn't the dining table). */
const names = (p: { kind: string; quals: string[] }, label: string) => {
  const words = label.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(nounOf)
  return kindOf(headOfLabel(label)) === p.kind && p.quals.every((q) => words.includes(q) || q === 'area')
}
/** The pieces a text names, and the phrases that named none (for an honest "couldn't find" line). */
export function namedPieces<T extends { label: string }>(text: string, pieces: T[]): { matched: T[]; unmatched: string[] } {
  const matched = new Set<T>(), unmatched: string[] = []
  for (const p of phrasesOf(text)) { const hit = pieces.filter((x) => names(p, x.label)); if (hit.length) hit.forEach((x) => matched.add(x)); else unmatched.push(p.raw) }
  return { matched: [...matched], unmatched }
}
/** Whether a leave-out names this item of a room's program — the Tools panel's "Will place" list and the engine read it alike. */
export const leavesOut = (text: string, item: string) => phrasesOf(text).some((p) => names(p, item))
