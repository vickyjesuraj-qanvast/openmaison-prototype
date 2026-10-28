import { KIND_LABEL, LIMITS, fitOpening, nextName, planArea, type PlanDoc, type RoomKind } from './model'
import { ROOM_PRESETS, planFromTemplate, templateByKey } from './templates'

/*
 * (pending modules S28 — card studio:floorplan-isometric-ai: "Upload a floor-plan photo and get a furnished 3D picture" · "The room list read
 * from the plan, editable before drawing" · "Two looks, Dollhouse and Top-down, and a download") The rules behind Make a 3D picture, pure
 * and client-safe. 1.0 asked a model to list the plan's rooms (its manifest) and to draw the picture; here the list comes from what is on
 * record — the client's flat type, read through the planner's own Singapore flats — and the studio corrects it, then places each room on the
 * photo; the 3D Space Planner draws the picture (lib/planner/model.ts, components/planner/scene). 1.0's chip wording (`summarizeInventory`)
 * and its six room groups are kept for the list's summary.
 */

export type PlaceRoom = { name: string; kind: RoomKind }
/** The rooms a photo's list holds at most (a layout's own limit). */
export const PLACE_MAX = LIMITS.rooms

/** Which of the planner's flats a property type reads as, and how many bedrooms it has beyond (or short of) that flat's. */
function flatOf(propertyType: string | null | undefined): { key: string; extraBeds: number; study: boolean; less: boolean } {
  const t = (propertyType ?? '').toLowerCase()
  if (/landed/.test(t)) return { key: 'landed', extraBeds: 0, study: false, less: false }
  if (/^(hdb|bto)/.test(t)) {
    if (/2-room/.test(t)) return { key: 'hdb-3', extraBeds: -1, study: false, less: true }
    if (/3-room/.test(t)) return { key: 'hdb-3', extraBeds: 0, study: false, less: false }
    if (/4-room/.test(t)) return { key: 'hdb-4', extraBeds: 0, study: false, less: false }
    if (/5-room/.test(t)) return { key: 'hdb-5', extraBeds: 0, study: false, less: false }
    if (/executive/.test(t)) return { key: 'hdb-5', extraBeds: 0, study: true, less: false }
  }
  if (/executive condo/.test(t)) return { key: 'condo-3', extraBeds: 0, study: false, less: false }
  if (/condo|penthouse/.test(t)) {
    if (/studio|1-bedder/.test(t)) return { key: 'condo-2', extraBeds: -1, study: false, less: true }
    if (/2-bedder/.test(t)) return { key: 'condo-2', extraBeds: 0, study: false, less: false }
    if (/3-bedder/.test(t)) return { key: 'condo-3', extraBeds: 0, study: false, less: false }
    if (/4-bedder/.test(t)) return { key: 'condo-3', extraBeds: 1, study: false, less: false }
    if (/5-bedder/.test(t)) return { key: 'condo-3', extraBeds: 2, study: false, less: false }
    if (/penthouse/.test(t)) return { key: 'condo-3', extraBeds: 1, study: true, less: false }
  }
  return { key: 'hdb-4', extraBeds: 0, study: false, less: false }   // anything else starts from the most common home in Singapore
}

/**
 * The rooms to place, by rule: the planner's flat for the client's property type (an HDB 4-Room's eleven rooms, a Condo 2-Bedroom's eight),
 * one bedroom more or less where the type says so (a 4-bedder, a 1-bedder — whose second bathroom goes too), a study for an Executive flat
 * or a penthouse. `basis` names what it started from, for the line under the list.
 */
export function roomsForType(propertyType: string | null | undefined): { rooms: PlaceRoom[]; basis: string } {
  const f = flatOf(propertyType)
  const t = templateByKey(f.key)!
  let rooms: PlaceRoom[] = t.rooms.map((r) => ({ name: r.name, kind: r.kind }))
  if (f.less) {
    rooms = rooms.filter((r) => r.name !== 'Bedroom 2')
    const baths = rooms.filter((r) => r.kind === 'bathroom')
    if (baths.length > 1) { const drop = baths.find((r) => r.name === 'Bathroom') ?? baths[0]!; rooms = rooms.filter((r) => r !== drop) }
    rooms = rooms.map((r) => (r.kind === 'master' ? { ...r, name: 'Bedroom' } : r.name === 'Master bathroom' ? { ...r, name: 'Bathroom' } : r))
  }
  for (let i = 0; i < f.extraBeds; i++) rooms.push(addedRoom('bedroom', rooms))
  if (f.study) rooms.push(addedRoom('study', rooms))
  const basis = (propertyType ?? '').trim() || t.name
  return { rooms, basis }
}

/** A room added to the list by hand: its preset's name, numbered past what the list holds — a bedroom counts the bedrooms ("Bedroom 4"
    beside a master bedroom and Bedrooms 2 and 3), anything else takes the next free number ("Bathroom 2"). */
export function addedRoom(kind: RoomKind, list: PlaceRoom[]): PlaceRoom {
  const taken = list.map((r) => r.name)
  if (kind === 'bedroom') {
    const beds = list.filter((r) => r.kind === 'master' || r.kind === 'bedroom').length
    let n = beds + 1
    while (taken.includes(`Bedroom ${n}`) && n < 99) n++
    return { name: beds ? `Bedroom ${n}` : 'Bedroom', kind }
  }
  const base = ROOM_PRESETS.find((p) => p.kind === kind)?.name ?? KIND_LABEL[kind]
  return { name: nextName(base, taken), kind }
}

/* ── 1.0's chips (floorplan-inventory.ts `summarizeInventory`): its six groups, in 2.0's room kinds ─────────────────────────────── */
type Group = { label: string; one: string; many: string; bare?: boolean; kinds: RoomKind[] }
const GROUPS: Group[] = [
  { label: 'bedrooms', one: 'bedroom', many: 'bedrooms', kinds: ['master', 'bedroom'] },
  { label: 'bathrooms', one: 'bathroom', many: 'bathrooms', kinds: ['bathroom'] },
  { label: 'kitchen', one: 'kitchen', many: 'kitchens', bare: true, kinds: ['kitchen'] },
  { label: 'living', one: 'living / dining area', many: 'living / dining areas', bare: true, kinds: ['living', 'dining'] },
  { label: 'balcony', one: 'balcony', many: 'balconies', kinds: ['balcony', 'outdoor'] },
  { label: 'yard', one: 'service yard', many: 'service yards', kinds: ['yard'] },
  { label: 'storage', one: 'storeroom', many: 'storerooms', kinds: ['store'] },
  { label: 'study', one: 'study', many: 'studies', kinds: ['study'] },
]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "3 bedrooms" · "2 bathrooms" · "Kitchen" · … · "11 rooms in total" — the list at a glance, as 1.0's chip row said it (2026-10-27: 1.0's "in total", was "in all").
    (the calm UI build 2026-10-27, 6-22 · W-080 — T-17) the total counts what it names: a room of a kind outside 1.0's groups (a corridor, a foyer)
    is named too, by its own kind ("Corridor"), so 3 + 2 + 1 + 1 + 1 + 2 + 1 = "11 rooms in total". */
export function roomSummary(rooms: PlaceRoom[]): string[] {
  const out: string[] = []
  for (const g of GROUPS) {
    const n = rooms.filter((r) => g.kinds.includes(r.kind)).length
    if (!n) continue
    out.push(cap(n === 1 ? (g.bare ? g.one : `1 ${g.one}`) : `${n} ${g.many}`))
  }
  const grouped = new Set(GROUPS.flatMap((g) => g.kinds))
  for (const kind of [...new Set(rooms.map((r) => r.kind))].filter((k) => !grouped.has(k))) {
    const n = rooms.filter((r) => r.kind === kind).length, word = KIND_LABEL[kind].toLowerCase()
    out.push(cap(n === 1 ? word : `${n} ${word}s`))
  }
  out.push(`${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} in total`)
  return out
}
/** (the calm UI build 2026-10-27, 6-08 · 6-22 — T-06: capitals are for a status) The same list as one plain sentence, not a row of capital chips:
    "3 bedrooms, 2 bathrooms, kitchen, living / dining area, 1 service yard, 2 storerooms, corridor — 11 rooms in total". */
export function roomSentence(rooms: PlaceRoom[]): string {
  const parts = roomSummary(rooms)
  const total = parts.pop() ?? ''
  if (!parts.length) return cap(total)
  return `${parts.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1))).join(', ')} — ${total}`
}

/** The bedrooms and bathrooms a list holds — what 1.0's fidelity check counted (its gate: "the plan has 3 bedrooms, the render has 4"). */
export const bedsAndBaths = (rooms: Pick<PlaceRoom, 'kind'>[]) => ({ beds: rooms.filter((r) => r.kind === 'master' || r.kind === 'bedroom').length, baths: rooms.filter((r) => r.kind === 'bathroom').length })

/* ── the plan's size ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const AREA_MIN = 15, AREA_MAX = 2000
export const SQFT_PER_M2 = 10.7639
/**
 * The floor area a photo's plan starts at: the client's own (the lead's area in square feet, in square metres), else the planner's flat for
 * their property type, every room drawn (`basis` says which, for the field's helper).
 */
export function startingArea(propertyType: string | null | undefined, areaSqft: number | null | undefined): { m2: number; basis: 'lead' | 'flat'; flat: string } {
  const f = flatOf(propertyType)
  const flat = templateByKey(f.key)!
  if (areaSqft && areaSqft > 0) { const m2 = Math.round(areaSqft / SQFT_PER_M2); if (m2 >= AREA_MIN && m2 <= AREA_MAX) return { m2, basis: 'lead', flat: flat.name } }
  /* a bedroom more is the flat's average bedroom more; a study a 2.5 m square */
  const plan = planFromTemplate(f.key)
  const beds = plan.rooms.filter((r) => r.kind === 'bedroom')
  const bed = beds.length ? beds.reduce((n, r) => n + r.w * r.d, 0) / beds.length : 90000
  const cm2 = planArea(plan, false) + f.extraBeds * bed + (f.study ? 62500 : 0)
  return { m2: Math.max(AREA_MIN, Math.round(cm2 / 10000)), basis: 'flat', flat: flat.name }
}

/** Millimetres per picture pixel for a plan of `areaM2` that covers `share` of a `w` × `h` picture. */
export function scaleFromArea(areaM2: number, share: number, w: number, h: number): number | null {
  if (!(areaM2 > 0) || !(share > 0) || !(w > 0) || !(h > 0)) return null
  const px = share * w * h
  return Math.sqrt((areaM2 * 1_000_000) / px)
}
/** A scale a layout can hold — the planner's underlay check (0 < mm per pixel < 1000). */
export const scaleOk = (mmPerPx: number | null | undefined): mmPerPx is number => typeof mmPerPx === 'number' && Number.isFinite(mmPerPx) && mmPerPx > 0.05 && mmPerPx < 1000

/** "11.6 m × 8.2 m" — a plan's size at a scale, as a check line under the size field. */
export function sizeAt(mmPerPx: number, w: number, h: number): string {
  const m = (px: number) => `${((px * mmPerPx) / 1000).toFixed(1)} m`
  return `${m(w)} × ${m(h)}`
}

/* ── the two looks (1.0's Dollhouse · Top-down) ───────────────────────────────────────────────────────────────────────────────── */
export type Look = 'dollhouse' | 'top'
export const LOOKS: { value: Look; label: string; line: string }[] = [
  { value: 'dollhouse', label: 'Dollhouse', line: 'An angled cutaway — the walls cut low, every room seen at once' },
  { value: 'top', label: 'Top-down', line: 'Straight down from above — it reads like the plan, furnished' },
]
export const lookLabel = (l: Look) => LOOKS.find((x) => x.value === l)?.label ?? 'Dollhouse'
/** "Showroom — HDB 4-Room — Dollhouse.png" */
export const pictureFileName = (layout: string, look: Look) => `${layout.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Layout'} — ${lookLabel(look)}.png`
/** (S42 D·1) "Showroom — HDB 4-Room — Dollhouse turning.webm" — the turning clip's file */
export const clipFileName = (layout: string, ext: string) => `${layout.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Layout'} — Dollhouse turning.${ext}`

/** Whether a file reads as a floor plan by its name or its folder — where Files offers Make a 3D picture. */
export function looksLikeFloorPlan(fileName: string, folderNames: string[]): boolean {
  if (/floor\s*-?\s*plans?|floorplans?|unit\s+layout|layout\s+plan/i.test(fileName)) return true
  return folderNames.some((n) => /^floor\s*-?\s*plans?$|^floorplans?$/i.test(n.trim()))
}

/**
 * (S28) The plan given a new size with the floor plan under it — Change its size…: every room's place and size and every piece's place grow by
 * `k` about the floor plan's corner (whole centimetres; a room never under 50 cm; doors and windows keep their widths and stay on their
 * walls), the pieces keep their own sizes, the floor plan's scale follows. Level 1 as the plan holds it (the level on screen is passed in).
 */
export function rescalePlan(p: PlanDoc, k: number): PlanDoc {
  const u = p.underlay
  if (!u || !(k > 0) || !Number.isFinite(k) || Math.abs(k - 1) < 1e-6) return p
  const ox = u.x, oz = u.z
  const at = (v: number, o: number) => Math.round(o + (v - o) * k)
  return {
    ...p,
    underlay: { ...u, mmPerPx: u.mmPerPx * k },
    rooms: p.rooms.map((r) => {
      const x = at(r.x, ox), z = at(r.z, oz)
      const next = { ...r, x, z, w: Math.max(50, at(r.x + r.w, ox) - x), d: Math.max(50, at(r.z + r.d, oz) - z) }
      return { ...next, openings: r.openings.map((o) => ({ ...o, ...fitOpening(next, { side: o.side, at: o.at * k, width: o.width }) })) }
    }),
    pieces: p.pieces.map((q) => ({ ...q, x: at(q.x, ox), z: at(q.z, oz) })),
  }
}
