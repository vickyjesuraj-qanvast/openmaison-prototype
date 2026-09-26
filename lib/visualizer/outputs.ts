import { BRAND_CATEGORIES, CATALOGUE, resolveSurfaceCategories, type CatalogueCategory } from './catalogue'
import { hexToRgb, rgbToLab } from './engine/pixels'
import { groupWord, type Applied, type Detection, type Finishes } from './model'
import { groupMaterialCategories, surfaceGroupFor, titleCaseLabel } from './surfaces'

/* AI Visualizer — what leaves the editor, in one place (audit 2026-09-26): the name a render is filed and downloaded under, the lines a
   version adds to a quote, and the words the client reads on a shared link. Pure and client-safe: the server actions, the repair and the
   screens all read the same helpers, so a dialog never promises what the action then does differently. */

/* ── Files and downloads (F113) ── */
/** A version's file name, the same in Files › Renders and in a download — 1.0's pattern (parity map 17: `Render - {Room} - V{n}`). */
export const renderFileName = (room: string, n: number) => `Render - ${room} - V${n}.jpg`
/** The room's own photo, downloaded. */
export const originalFileName = (room: string) => `${room} - Original.jpg`
/** (wave E, files-10) A filed render's name where the folder already has one by that name — a render of another design of the lead, or of
    one deleted for good — "Render - Kitchen - V1 (2).jpg", so two pictures never share a name in Files › Renders. `taken` = the folder's
    live names (any case). */
export function freeFileName(name: string, taken: Iterable<string>): string {
  const had = new Set([...taken].map((n) => n.trim().toLowerCase()))
  if (!had.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : ''
  let k = 2
  while (had.has(`${stem} (${k})${ext}`.toLowerCase())) k++
  return `${stem} (${k})${ext}`
}

/* ── Add to a quote (F096 · F097 · F101) ── */
export type QuoteLine = {
  /** The surface group ("Walls", "Floor") or the piece ("Grey Fabric Sofa") — the line's first word. */
  what: string
  /** The finish: a material's name, or a piece's new look ("Emerald Velvet"). */
  to: string
  /** The material behind a surface line (a catalogue id, `lib:{studio material}`, `own:{swatch}`) — what the Price book is looked up by. */
  materialId: string | null
  /** How many surfaces of the room carry it (two walls in the same paint are one line). */
  count: number
}
const pieceWord = (label: string) => titleCaseLabel(label).replace(/\s*\([^)]*\)\s*$/, '')

/**
 * The finishes a version shows — not just what its own pass changed: a relight of V2 still has V2's walls, floor and sofa (F097). One line
 * per surface group and finish, as the client's link and Present list them (F096); every customised piece that is still in the room. A
 * version with no finishes (a whole-room look, a relight of the photo) has no lines.
 */
export function quoteLines(v: { finishes: Finishes; applied: Applied }, detection: Pick<Detection, 'surfaces' | 'furniture'> | null): QuoteLine[] {
  const out: QuoteLine[] = []
  const at = new Map<string, number>()
  const surfaceLabel = (id: string) => v.finishes.surfaces[id]?.label ?? detection?.surfaces.find((s) => s.id === id)?.label ?? v.applied.surfaces.find((s) => s.id === id)?.label ?? null
  for (const [id, f] of Object.entries(v.finishes.surfaces ?? {})) {
    const label = surfaceLabel(id)
    const what = label ? groupWord(label) : 'Surface'
    const to = plainFinishName(f.name, label)
    const k = `${what}|${to}`
    const i = at.get(k)
    if (i !== undefined) { out[i]!.count++; continue }
    at.set(k, out.length)
    out.push({ what, to, materialId: f.materialId ?? null, count: 1 })
  }
  const removed = new Set(v.finishes.removed ?? [])
  for (const [id, desc] of Object.entries(v.finishes.customized ?? {})) {
    if (removed.has(id) || !desc) continue
    const label = detection?.furniture.find((x) => x.id === id)?.label ?? v.applied.furniture.find((x) => x.id === id)?.label ?? null
    out.push({ what: label ? pieceWord(label) : 'Piece', to: desc, materialId: null, count: 1 })
  }
  return out
}
/** A studio material's id behind a line — `lib:{id}`, or a shaded variant of one (`lib:{id}~2`). */
export const studioMaterialOf = (materialId: string | null) => (materialId?.startsWith('lib:') ? materialId.slice(4).replace(/~\d+$/, '') : null)
/** What the Price book can price, as the editor receives it (`VisualizerEditorData.quotable`); (verify round 1) `measured*` = the ones it
    prices by area or length (S$ / sqft, / m run). */
export type Quotable = { bookNames: string[]; linkedMaterials: string[]; measuredNames?: string[]; measuredMaterials?: string[] }
/** Whether Add to a quote will price this line: its studio material names a Price book item, or an item has the finish's name. */
export const isPriced = (l: QuoteLine, q: Quotable) => {
  const sm = studioMaterialOf(l.materialId)
  return (!!sm && q.linkedMaterials.includes(sm)) || q.bookNames.includes(l.to.trim().toLowerCase())
}
/** (verify round 1) Whether the line's price is a rate by area or length — Add to a quote then puts it in with no quantity (a photo can't
    measure a floor; "1 sqft" was a made-up amount): the studio types the measured one. Same lookup as `isPriced` and the action. */
export const isMeasured = (l: QuoteLine, q: Quotable) => {
  const sm = studioMaterialOf(l.materialId)
  if (sm && q.linkedMaterials.includes(sm)) return !!q.measuredMaterials?.includes(sm)
  return !!q.measuredNames?.includes(l.to.trim().toLowerCase())
}
/** (wave E, tablet-15) Why a version has nothing to quote — a whole-room look names its look, not finishes the Price book can price; the
    menu row and Add to a quote's refusal say the same words. Null when it has lines. */
export function noQuoteReason(v: { finishes: Finishes; applied: Pick<Applied, 'kind'> }, lines: number): string | null {
  if (lines) return null
  return v.applied.kind === 'restyle' || v.finishes.style ? 'A whole-room look has no finishes to quote — pick finishes on the Original' : 'This version has no finishes to quote — pick finishes, then Generate'
}
/** The section a version lands in on the quote — also how a second add of the same version is recognised (F100). */
export const quoteGroupName = (room: string, n: number) => `${room} · V${n} finishes`

/** (verify round 1) A colour a style transfer read off a reference photo carries its hex as a name ("Reference #E8E6E2"); what leaves the
    editor — a quote line, the client's link, Present and the moodboard — reads it in words: the nearest catalogue finish of the kind the
    surface takes (a wall's among the paints, a floor's among the floorings, a cabinet's among the laminates), by eye — in Lab, so a light warm grey is "close to Off-White
    Matte", never "Blush Pink" — and only when it is close; else just "Reference colour". Any other name is kept as it is. */
const REF = /^reference\s*(#[0-9a-f]{6})$/i
const NEAR = 20   // ΔE: past this, naming a finish would mislead
const labOf = (hex: string) => rgbToLab(...hexToRgb(hex))
const byCategory = new Map<string, { name: string; lab: [number, number, number]; outdoor: boolean }[]>()
for (const c of CATALOGUE) if (!BRAND_CATEGORIES.includes(c.category) && /^#[0-9a-f]{6}$/i.test(c.swatch)) byCategory.set(c.category, [...(byCategory.get(c.category) ?? []), { name: c.name, lab: labOf(c.swatch), outdoor: c.tags.includes('outdoor') }])
/** (audit 2026-09-26) An indoor surface is never named after an outdoor finish ("close to Teak Outdoor" for a living-room floor). */
const OUTDOOR_SURFACE = /\b(balcon\w*|outdoor|terrace|patio|deck(ing)?|garden|yard)\b/i
/**
 * (wave E, desktop-4 · 8 · 15) The kinds of finish a surface takes, most likely first — read through its surface group, as the Surfaces
 * list and the version's lines group it ("Quartz Island Waterfall End" is a countertop, so a stone, never a paint called "Linen"), then
 * through the label's own words, else a paint. A pattern (wallpaper) never names a flat colour.
 */
function finishKinds(surfaceLabel: string | null | undefined): CatalogueCategory[] {
  if (!surfaceLabel) return ['Paints']
  const g = surfaceGroupFor(surfaceLabel)
  const list = (g !== 'Other' ? groupMaterialCategories(g) : []).length ? groupMaterialCategories(g) : resolveSurfaceCategories(surfaceLabel) ?? []
  const kinds = list.filter((c) => c !== 'Wallpapers' && byCategory.has(c))
  return kinds.length ? kinds : ['Paints']
}
function nearestIn(kind: CatalogueCategory, L: number, A: number, B: number, outdoor = false): { name: string; d: number } | null {
  let best: { name: string; d: number } | null = null
  for (const c of byCategory.get(kind) ?? []) {
    if (c.outdoor && !outdoor) continue
    const d = Math.hypot(L - c.lab[0], A - c.lab[1], B - c.lab[2])
    if (!best || d < best.d) best = { name: c.name, d }
  }
  return best
}
/** The nearest finish of the surface's first kind; a hard surface (a worktop, a floor, a splashback) looks on through its other kinds (a
    stone, a tile) before saying none is close — a painted one (walls, ceiling, trim) stays with the paints: its colour is a paint's. */
function nearestFinish(hex: string, surfaceLabel?: string | null): string | null {
  const [L, A, B] = labOf(hex)
  const kinds = finishKinds(surfaceLabel)
  for (const kind of kinds[0] === 'Paints' ? kinds.slice(0, 1) : kinds) {
    const best = nearestIn(kind, L, A, B, !!surfaceLabel && OUTDOOR_SURFACE.test(surfaceLabel))
    if (best && best.d <= NEAR) return best.name
  }
  return null
}
export function plainFinishName(name: string, surfaceLabel?: string | null): string {
  const m = REF.exec(name.trim())
  if (!m) return name
  const near = nearestFinish(m[1]!, surfaceLabel)
  return near ? `Reference colour, close to ${near}` : 'Reference colour'
}

/* ── the client's words on a shared link (F103) ── */
/** A room as the client reads it: a sample's sketch room is just its room. */
export const clientRoomName = (room: string) => room.replace(/\s+sketch$/i, '').trim() || room
/**
 * (verify round 1) The rooms on one link as the client reads them: a sample's sketch room is just its room, and the number the editor adds
 * to tell a room from another of the same name ("Living room 2", made while the design had a "Living room") goes when no other room on the
 * link has that name — the client has one living room. A number the studio typed ("Bedroom 2" in a design with no "Bedroom") stays.
 * `inDesign` = every room name of the design (default: the link's own).
 */
export function clientRoomNames(rooms: string[], inDesign: string[] = rooms): Map<string, string> {
  const plain = [...new Set(rooms)].map((r) => [r, clientRoomName(r)] as const)
  const had = new Set(inDesign.map((n) => clientRoomName(n).toLowerCase()))
  const base = (n: string) => { const b = n.replace(/\s+\d+$/, '').trim(); return b && b !== n && had.has(b.toLowerCase()) ? b : n }
  const out = new Map<string, string>()
  const same = (x: string, y: string) => x.toLowerCase() === y.toLowerCase()
  for (const [room, name] of plain) {
    const b = base(name)
    if (plain.filter(([, n]) => same(base(n), b)).length <= 1) { out.set(room, b); continue }
    /* two rooms on the link read alike: each keeps what tells it apart ("Kitchen" and "Kitchen sketch", "Living room" and "Living room 2") */
    out.set(room, plain.filter(([, n]) => same(n, name)).length > 1 ? room : name)
  }
  return out
}
/** A design's title on the client's link — "Design 2 · Golden Hour": (verify round 1) numbered as the studio numbers it (V2 is Design 2 on
    every link, so "I like Design 2" finds V2), with the look or the light it was given, never the studio's shorthand ("Walls, Floor +1",
    "From a note"). */
export function clientVersionLabel(n: number, a: Pick<Applied, 'style' | 'lighting'> | null): string {
  const tail = a?.style ?? a?.lighting ?? null
  return tail ? `Design ${n} · ${tail}` : `Design ${n}`
}
/**
 * (verify round 1) What a design on the client's link lists: everything the picture shows next to their own room — each surface group's
 * finish, the pieces restyled or taken out, an emptied room, the look and the light — as Present's "Everything in V…" reads it. Never the
 * studio's typed instruction (a note to the engine is not a finish).
 */
export function clientLines(v: { finishes: Finishes; applied: Applied }, detection: Pick<Detection, 'surfaces' | 'furniture'> | null): { label: string; material: string }[] {
  const out: { label: string; material: string }[] = []
  const seen = new Set<string>()
  for (const [id, f] of Object.entries(v.finishes.surfaces ?? {})) {
    const label = f.label ?? detection?.surfaces.find((s) => s.id === id)?.label ?? v.applied.surfaces.find((s) => s.id === id)?.label ?? null
    const what = label ? groupWord(label) : 'Surface'
    const to = plainFinishName(f.name, label)
    const k = `${what}|${to}`
    if (seen.has(k)) continue
    seen.add(k); out.push({ label: what, material: to })
  }
  const piece = (id: string) => { const l = detection?.furniture.find((x) => x.id === id)?.label ?? v.applied.furniture.find((x) => x.id === id)?.label ?? null; return l ? pieceWord(l) : null }
  const removed = new Set(v.finishes.removed ?? [])
  for (const [id, desc] of Object.entries(v.finishes.customized ?? {})) if (!removed.has(id) && desc) out.push({ label: piece(id) ?? 'A piece', material: desc })
  for (const id of v.finishes.removed ?? []) { const what = piece(id); if (what) out.push({ label: what, material: 'Taken out' }) }
  if (v.finishes.emptied) out.push({ label: 'Room', material: 'Emptied' })
  if (v.finishes.style) out.push({ label: 'Style', material: v.finishes.style })
  if (v.finishes.lighting) out.push({ label: 'Lighting', material: v.finishes.lighting })
  return out
}
/** (verify round 1) A room inside a sentence — "for your living room": a room's own word goes lower-case; a name the studio gave it
    ("Sophia's loft", "HDB 4-room") keeps its casing. */
const ROOM_WORD = /^(living|dining|master|common|guest|family|kids|children|bed\s*room|bedroom|bathroom|bath|toilet|powder|kitchen|dry|wet|pantry|study|office|balcony|patio|foyer|entrance|utility|service|yard|laundry|walk-in|wardrobe|store\s*room|storeroom|room|home|lounge)\b/i
export const roomInSentence = (room: string) => (ROOM_WORD.test(room) && room.slice(1) === room.slice(1).toLowerCase() ? room.charAt(0).toLowerCase() + room.slice(1) : room)
/** The rooms of a link inside a sentence — "your living room, master bedroom and kitchen". */
export const roomsInSentence = (rooms: string[]) => joinWords(rooms.map(roomInSentence))
/** Names joined the way a sentence says them — "living room, master bedroom and kitchen" (F102). */
export function joinWords(words: string[]): string {
  try { return new Intl.ListFormat('en-SG', { style: 'long', type: 'conjunction' }).format(words) } catch { return words.join(', ') }
}
