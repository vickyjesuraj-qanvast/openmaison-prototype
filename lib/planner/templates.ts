import { catalogueItem } from './catalogue'
import { DEFAULT_HEIGHT, OUTDOOR, WALL_T, fitOpening, openingSpan, sideLength, sideLine, type Opening, type Piece, type PlanDoc, type Room, type RoomKind, type Side } from './model'

/*
 * (gaps build J, J-Q5) The Singapore flats a layout starts from — 1.0's Quick Start Templates (HDB 3-, 4-, 5-Room, Condo 2- and 3-Bedroom,
 * a landed house), re-laid so every room meets its neighbours and every room has a way in (1.0's offsets left gaps and an unreachable
 * bedroom). Rooms are rectangles in centimetres; a side left `open` takes its wall away (an open kitchen, a living room onto its
 * corridor). `furnish` is 1.0's "Pre-Furnished" as a rule, not a model: each room's main pieces against its longest wall without a door.
 * Pure and client-safe.
 */

export type TemplateGroup = 'hdb' | 'condo' | 'landed'
/** `line` says what the flat holds; its area is computed from its rooms (indoor only) wherever it is shown. */
export type FlatTemplate = { key: string; name: string; group: TemplateGroup; line: string; rooms: Room[] }
export const TEMPLATE_GROUPS: { key: 'all' | TemplateGroup; label: string }[] = [{ key: 'all', label: 'All' }, { key: 'hdb', label: 'HDB' }, { key: 'condo', label: 'Condo' }, { key: 'landed', label: 'Landed' }]

const FLOOR: Partial<Record<RoomKind, string>> = { living: '#E8DCC8', dining: '#E8DCC8', foyer: '#E8DCC8', corridor: '#E8DCC8', master: '#E2D8CA', bedroom: '#E2D8CA', study: '#E2D8CA', kitchen: '#D9D1C4', store: '#D9D1C4', bathroom: '#C8D6D2', yard: '#C8D6D2', balcony: '#CFCFCB', outdoor: '#C9C7C0' }
const WALL: Partial<Record<RoomKind, string>> = { bathroom: '#EEF2F0', yard: '#EEF2F0' }
type O = { doors?: [Side, number, number, ('left' | 'right')?][]; windows?: [Side, number, number][]; open?: Side[]; height?: number }
function R(t: string, id: string, name: string, kind: RoomKind, x: number, z: number, w: number, d: number, o: O = {}): Room {
  const room: Room = { id: `${t}-${id}`, name, kind, x, z, w, d, height: o.height ?? DEFAULT_HEIGHT, walls: { n: true, e: true, s: true, w: true }, openings: [], floor: null, wall: null,
    floorHex: FLOOR[kind] ?? '#E8DCC8', wallHex: WALL[kind] ?? '#F5F1EB' }
  for (const s of o.open ?? []) room.walls[s] = false
  if (OUTDOOR.includes(kind)) room.height = kind === 'balcony' ? 110 : 100   // a balcony's parapet, a porch's low wall
  let n = 0
  for (const [side, at, width, swing] of o.doors ?? []) room.openings.push({ id: `${room.id}-o${++n}`, kind: 'door', side, ...fitOpening(room, { side, at, width }), swing: swing ?? 'left' })
  for (const [side, at, width] of o.windows ?? []) room.openings.push({ id: `${room.id}-o${++n}`, kind: 'window', side, ...fitOpening(room, { side, at, width }), sill: 90, height: 120 })
  return room
}

export const TEMPLATES: FlatTemplate[] = [
  { key: 'hdb-3', name: 'HDB 3-Room', group: 'hdb', line: 'Two bedrooms, two bathrooms', rooms: [
    R('h3', 'living', 'Living / Dining', 'living', 0, 0, 600, 420, { doors: [['n', 450, 100]], windows: [['w', 80, 240]] }),
    R('h3', 'kitchen', 'Kitchen', 'kitchen', 600, 0, 300, 260, { doors: [['w', 60, 90]], windows: [['n', 100, 120], ['e', 70, 120]] }),
    R('h3', 'bath1', 'Bathroom', 'bathroom', 600, 260, 150, 160, { doors: [['w', 45, 70]] }),
    R('h3', 'yard', 'Service yard', 'yard', 750, 260, 150, 160, { doors: [['n', 35, 80]], windows: [['e', 30, 100]] }),
    R('h3', 'bed2', 'Bedroom 2', 'bedroom', 0, 420, 330, 340, { doors: [['n', 220, 90]], windows: [['w', 90, 150], ['s', 90, 150]] }),
    R('h3', 'store', 'Store', 'store', 330, 420, 150, 160, { doors: [['n', 35, 80]] }),
    R('h3', 'mbath', 'Master bathroom', 'bathroom', 330, 580, 150, 180, { doors: [['e', 55, 70]], windows: [['s', 45, 60]] }),
    R('h3', 'master', 'Master bedroom', 'master', 480, 420, 420, 340, { doors: [['n', 15, 90, 'right']], windows: [['s', 140, 180], ['e', 100, 140]] }),
  ] },
  { key: 'hdb-4', name: 'HDB 4-Room', group: 'hdb', line: 'Three bedrooms, two bathrooms', rooms: [
    R('h4', 'living', 'Living / Dining', 'living', 0, 0, 600, 440, { doors: [['n', 420, 100]], windows: [['w', 100, 240]], open: ['s'] }),
    R('h4', 'kitchen', 'Kitchen', 'kitchen', 600, 0, 320, 260, { doors: [['w', 60, 90]], windows: [['n', 100, 120]] }),
    R('h4', 'yard', 'Service yard', 'yard', 920, 0, 140, 440, { doors: [['w', 80, 80]], windows: [['e', 150, 120]] }),
    R('h4', 'bath1', 'Bathroom', 'bathroom', 600, 260, 170, 180, { doors: [['w', 55, 70]] }),
    R('h4', 'store', 'Store', 'store', 770, 260, 150, 180, { doors: [['n', 35, 80]] }),
    R('h4', 'corridor', 'Corridor', 'corridor', 0, 440, 1060, 100),
    R('h4', 'bed3', 'Bedroom 3', 'bedroom', 0, 540, 300, 340, { doors: [['n', 200, 90]], windows: [['w', 100, 150], ['s', 80, 140]] }),
    R('h4', 'bed2', 'Bedroom 2', 'bedroom', 300, 540, 300, 340, { doors: [['n', 200, 90]], windows: [['s', 80, 140]] }),
    R('h4', 'mbath', 'Master bathroom', 'bathroom', 600, 540, 170, 190, { doors: [['e', 60, 70]] }),
    R('h4', 'walkin', 'Walk-in wardrobe', 'store', 600, 730, 170, 150, { doors: [['e', 40, 80]] }),
    R('h4', 'master', 'Master bedroom', 'master', 770, 540, 290, 340, { doors: [['n', 30, 90, 'right']], windows: [['e', 100, 140], ['s', 70, 150]] }),
  ] },
  { key: 'hdb-5', name: 'HDB 5-Room', group: 'hdb', line: 'Three bedrooms, a separate dining, a store', rooms: [
    R('h5', 'living', 'Living room', 'living', 0, 0, 500, 450, { doors: [['n', 300, 100]], windows: [['w', 100, 250]], open: ['e', 's'] }),
    R('h5', 'dining', 'Dining', 'dining', 500, 0, 340, 450, { windows: [['n', 100, 140]], open: ['s'] }),
    R('h5', 'kitchen', 'Kitchen', 'kitchen', 840, 0, 400, 280, { doors: [['w', 80, 90]], windows: [['n', 140, 140]] }),
    R('h5', 'yard', 'Service yard', 'yard', 840, 280, 200, 170, { doors: [['n', 60, 80]] }),
    R('h5', 'bath1', 'Bathroom', 'bathroom', 1040, 280, 200, 170, { doors: [['s', 60, 70]], windows: [['e', 50, 60]] }),
    R('h5', 'corridor', 'Corridor', 'corridor', 0, 450, 1240, 100),
    R('h5', 'bed3', 'Bedroom 3', 'bedroom', 0, 550, 330, 350, { doors: [['n', 230, 90]], windows: [['w', 100, 150], ['s', 90, 150]] }),
    R('h5', 'bed2', 'Bedroom 2', 'bedroom', 330, 550, 330, 350, { doors: [['n', 230, 90]], windows: [['s', 90, 150]] }),
    R('h5', 'store', 'Store', 'store', 660, 550, 160, 170, { doors: [['n', 40, 80]] }),
    R('h5', 'mbath', 'Master bathroom', 'bathroom', 660, 720, 160, 180, { doors: [['e', 50, 70]], windows: [['s', 50, 60]] }),
    R('h5', 'master', 'Master bedroom', 'master', 820, 550, 420, 350, { doors: [['n', 40, 90, 'right']], windows: [['e', 100, 150], ['s', 130, 180]] }),
  ] },
  { key: 'condo-2', name: 'Condo 2-Bedroom', group: 'condo', line: 'An open kitchen, a balcony', rooms: [
    R('c2', 'balcony', 'Balcony', 'balcony', 0, 0, 420, 150, { doors: [['s', 90, 240]] }),
    R('c2', 'living', 'Living / Dining', 'living', 0, 150, 560, 420, { windows: [['w', 120, 200]] }),
    R('c2', 'kitchen', 'Kitchen', 'kitchen', 560, 150, 280, 220, { windows: [['n', 80, 120]], open: ['w', 's'] }),
    R('c2', 'bath1', 'Bathroom', 'bathroom', 840, 150, 160, 220, { doors: [['s', 45, 70]], windows: [['e', 70, 60]] }),
    R('c2', 'foyer', 'Foyer', 'foyer', 560, 370, 440, 200, { doors: [['e', 50, 100]], open: ['w'] }),   /* (REG-2803) its north side was open too, which opened the bathroom beside the kitchen — the kitchen's own open south side joins the two */
    R('c2', 'bed2', 'Bedroom 2', 'bedroom', 0, 570, 300, 300, { doors: [['n', 200, 90]], windows: [['w', 80, 140], ['s', 80, 140]] }),
    R('c2', 'mbath', 'Master bathroom', 'bathroom', 300, 570, 170, 300, { doors: [['e', 200, 70]] }),
    R('c2', 'master', 'Master bedroom', 'master', 470, 570, 530, 300, { doors: [['n', 130, 90, 'right']], windows: [['s', 180, 180], ['e', 90, 120]] }),
  ] },
  { key: 'condo-3', name: 'Condo 3-Bedroom', group: 'condo', line: 'An open kitchen, a balcony, three bedrooms', rooms: [
    R('c3', 'balcony', 'Balcony', 'balcony', 0, 0, 500, 160, { doors: [['s', 100, 280]] }),
    R('c3', 'living', 'Living / Dining', 'living', 0, 160, 620, 440, { windows: [['w', 120, 220]] }),
    R('c3', 'kitchen', 'Kitchen', 'kitchen', 620, 160, 300, 240, { windows: [['n', 90, 120]], open: ['w', 's'] }),
    R('c3', 'bath1', 'Bathroom', 'bathroom', 920, 160, 180, 240, { doors: [['s', 50, 70]], windows: [['e', 80, 60]] }),
    R('c3', 'foyer', 'Foyer', 'foyer', 620, 400, 480, 200, { doors: [['e', 50, 100]], open: ['w'] }),   /* (REG-2803) its north side was open too, which opened the bathroom beside the kitchen — the kitchen's own open south side joins the two */
    R('c3', 'bed3', 'Bedroom 3', 'bedroom', 0, 600, 290, 320, { doors: [['n', 190, 90]], windows: [['w', 90, 140], ['s', 80, 140]] }),
    R('c3', 'bed2', 'Bedroom 2', 'bedroom', 290, 600, 290, 320, { doors: [['n', 190, 90]], windows: [['s', 80, 140]] }),
    R('c3', 'mbath', 'Master bathroom', 'bathroom', 580, 600, 170, 320, { doors: [['e', 220, 70]] }),
    R('c3', 'master', 'Master bedroom', 'master', 750, 600, 350, 320, { doors: [['n', 40, 90, 'right']], windows: [['e', 90, 150], ['s', 110, 150]] }),
  ] },
  { key: 'landed', name: 'Landed house', group: 'landed', line: 'Single storey with a car porch', rooms: [
    R('ld', 'porch', 'Car porch', 'outdoor', 0, 0, 1300, 450, { doors: [['s', 250, 100]] }),
    R('ld', 'living', 'Living room', 'living', 0, 450, 600, 500, { windows: [['n', 60, 150], ['w', 150, 200]], open: ['e', 's'] }),
    R('ld', 'dining', 'Dining', 'dining', 600, 450, 350, 500, { windows: [['n', 100, 150]], open: ['s'] }),
    R('ld', 'kitchen', 'Kitchen', 'kitchen', 950, 450, 350, 500, { doors: [['w', 200, 90]], windows: [['n', 100, 150], ['e', 150, 150]] }),
    R('ld', 'corridor', 'Corridor', 'corridor', 0, 950, 1300, 120),
    R('ld', 'bed3', 'Bedroom 3', 'bedroom', 0, 1070, 350, 380, { doors: [['n', 250, 90]], windows: [['w', 100, 160], ['s', 100, 150]] }),
    R('ld', 'bed2', 'Bedroom 2', 'bedroom', 350, 1070, 350, 380, { doors: [['n', 250, 90]], windows: [['s', 100, 150]] }),
    R('ld', 'bath1', 'Bathroom', 'bathroom', 700, 1070, 200, 200, { doors: [['n', 60, 70]] }),
    R('ld', 'mbath', 'Master bathroom', 'bathroom', 700, 1270, 200, 180, { doors: [['e', 60, 70]], windows: [['s', 70, 60]] }),
    R('ld', 'master', 'Master bedroom', 'master', 900, 1070, 400, 380, { doors: [['n', 40, 90, 'right']], windows: [['e', 110, 160], ['s', 120, 160]] }),
  ] },
]
export const templateByKey = (key: string | null | undefined) => TEMPLATES.find((t) => t.key === key) ?? null
/** (parity map, TD-075) A room drawn as the templates draw theirs — for the repair's two-storey demo layout (an upper level's rooms). */
export const templateRoom = R

/** A template as a fresh plan — its rooms, furnished when asked (1.0's Pre-Furnished). */
export function planFromTemplate(key: string | null, furnished = false): PlanDoc {
  const t = templateByKey(key)
  const rooms = t ? t.rooms.map((r) => ({ ...r, walls: { ...r.walls }, openings: r.openings.map((o) => ({ ...o })) })) : []
  return { v: 1, rooms, pieces: furnished ? furnish(rooms) : [], underlay: null, camera: null, wallsLow: false }
}

/** (J-Q6) A room added from the Rooms panel: its preset size and kind. */
export const ROOM_PRESETS: { kind: RoomKind; name: string; w: number; d: number }[] = [
  { kind: 'bedroom', name: 'Bedroom', w: 300, d: 300 },
  { kind: 'master', name: 'Master bedroom', w: 380, d: 340 },
  { kind: 'bathroom', name: 'Bathroom', w: 170, d: 200 },
  { kind: 'kitchen', name: 'Kitchen', w: 300, d: 250 },
  { kind: 'living', name: 'Living room', w: 450, d: 400 },
  { kind: 'dining', name: 'Dining', w: 330, d: 300 },
  { kind: 'study', name: 'Study', w: 250, d: 250 },
  { kind: 'store', name: 'Store', w: 150, d: 160 },
  { kind: 'yard', name: 'Service yard', w: 150, d: 200 },
  { kind: 'balcony', name: 'Balcony', w: 300, d: 150 },
]
export function presetRoom(kind: RoomKind, id: string, name: string, x: number, z: number, w?: number, d?: number): Room {
  const p = ROOM_PRESETS.find((q) => q.kind === kind) ?? ROOM_PRESETS[0]!
  const r = R('n', 'x', name, p.kind, x, z, w ?? p.w, d ?? p.d)
  return { ...r, id }
}

/* ── furnishing (1.0's Pre-Furnished, as rules) ────────────────────────────────────────────────────────────────────────────────── */
type Rect = { x: number; z: number; w: number; d: number }
const ROT: Record<Side, number> = { n: 0, e: 90, s: 180, w: 270 }
const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' }

/** Whether a stretch of a side is free of the room's doors (and, for tall pieces, its windows). */
function blocked(room: Room, rect: Rect, s: Side, a0: number, a1: number, tall: boolean): boolean {
  return room.openings.some((o: Opening) => {
    if (o.kind === 'window' && !tall) return false
    const l = sideLine(room, o.side), m = sideLine(rect, s)
    if (l.axis !== m.axis || Math.abs(l.c - m.c) > 1) return false
    const [b0, b1] = openingSpan(room, o)
    return b1 > a0 - 20 && b0 < a1 + 20   // 20 cm clear of a door's frame
  })
}
/** A piece with its back to a side of `rect`, at the side's centre, start or end. */
function against(room: Room, rect: Rect, s: Side, key: string, where: 'centre' | 'start' | 'end', id: string, shift = 0): Piece | null {
  const c = catalogueItem(key); if (!c) return null
  const len = sideLength(rect, s), inset = WALL_T / 2 + 2
  if (c.w > len - 2 * inset) return null
  const along = where === 'centre' ? len / 2 + shift : where === 'start' ? inset + c.w / 2 + shift : len - inset - c.w / 2 - shift
  if (along - c.w / 2 < inset - 0.5 || along + c.w / 2 > len - inset + 0.5) return null   // it stays on its own wall
  const l = sideLine(rect, s)
  if (blocked(room, rect, s, l.a0 + along - c.w / 2, l.a0 + along + c.w / 2, c.h > 100)) return null
  const off = inset + c.d / 2
  const x = s === 'n' || s === 's' ? l.a0 + along : s === 'w' ? rect.x + off : rect.x + rect.w - off
  const z = s === 'e' || s === 'w' ? l.a0 + along : s === 'n' ? rect.z + off : rect.z + rect.d - off
  return { id, key, x: Math.round(x), z: Math.round(z), rot: ROT[s], w: c.w, d: c.d, h: c.h, color: null, finish: null }
}
/** The sides a piece may stand against, longest first: a standing wall, on the room's own outline. */
function wallSides(room: Room, rect: Rect): Side[] {
  const own = (s: Side) => { const a = sideLine(room, s), b = sideLine(rect, s); return a.axis === b.axis && Math.abs(a.c - b.c) < 1 }
  return (['n', 'e', 's', 'w'] as Side[]).filter((s) => room.walls[s] && own(s)).sort((a, b) => sideLength(rect, b) - sideLength(rect, a))
}
/* two square-placed pieces' extents overlap */
const box = (p: Piece) => { const q = p.rot % 180 === 0 ? { w: p.w, d: p.d } : { w: p.d, d: p.w }; return { x0: p.x - q.w / 2, x1: p.x + q.w / 2, z0: p.z - q.d / 2, z1: p.z + q.d / 2 } }
const hits = (a: Piece, taken: Piece[]) => { const A = box(a); return taken.some((t) => { const B = box(t); return A.x0 < B.x1 - 1 && B.x0 < A.x1 - 1 && A.z0 < B.z1 - 1 && B.z0 < A.z1 - 1 }) }
/** The first side (in order) and spot a piece fits against without running into what is already placed. */
function onAny(room: Room, rect: Rect, sides: Side[], key: string, where: 'centre' | 'start' | 'end', id: string, taken: Piece[] = []): { p: Piece; s: Side } | null {
  const spots: ('centre' | 'start' | 'end')[] = [where, ...(['end', 'start', 'centre'] as const).filter((w) => w !== where)]
  for (const s of sides) for (const w of spots) { const p = against(room, rect, s, key, w, id); if (p && !hits(p, taken)) return { p, s } }
  return null
}
const inFront = (p: Piece, gap: number, key: string, id: string): Piece | null => {
  const c = catalogueItem(key); if (!c) return null
  const t = (p.rot * Math.PI) / 180, fx = -Math.sin(t), fz = Math.cos(t), dist = p.d / 2 + gap + c.d / 2
  return { id, key, x: Math.round(p.x + fx * dist), z: Math.round(p.z + fz * dist), rot: p.rot, w: c.w, d: c.d, h: c.h, color: null, finish: null }
}
const centred = (rect: Rect, key: string, id: string, rot = 0): Piece | null => {
  const c = catalogueItem(key); if (!c) return null
  return { id, key, x: Math.round(rect.x + rect.w / 2), z: Math.round(rect.z + rect.d / 2), rot, w: c.w, d: c.d, h: c.h, color: null, finish: null }
}

function furnishRoom(room: Room, rect: Rect = room, tag = ''): Piece[] {
  const out: Piece[] = []
  const id = (n: string) => `${room.id}${tag}-${n}`
  const push = (p: Piece | null) => { if (p) out.push(p) }
  const sides = wallSides(room, rect)
  const area = (rect.w * rect.d) / 10000
  if (room.kind === 'master' || room.kind === 'bedroom') {
    const bed = onAny(room, rect, sides, room.kind === 'master' ? (area > 13 ? 'bed-king' : 'bed-queen') : 'bed-ss', room.kind === 'master' ? 'centre' : 'start', id('bed'))
    if (bed) {
      out.push(bed.p)
      /* the bedsides stand either side of the bed wherever it landed on its wall */
      const l = sideLine(rect, bed.s), at = (bed.s === 'n' || bed.s === 's' ? bed.p.x : bed.p.z) - l.a0 - sideLength(rect, bed.s) / 2
      const half = bed.p.w / 2 + 27
      for (const [k, sh] of (room.kind === 'master' ? [['a', at - half], ['b', at + half]] : [['a', at + half]]) as [string, number][]) {
        const side = against(room, rect, bed.s, 'bedside', 'centre', id(`side${k}`), sh)
        if (side && !hits(side, out)) out.push(side)
      }
    }
    const rest = sides.filter((s) => s !== bed?.s && s !== (bed ? OPPOSITE[bed.s] : null))
    push(onAny(room, rect, [...rest, ...(bed ? [OPPOSITE[bed.s]] : [])], room.kind === 'master' ? 'wardrobe-3' : 'wardrobe-2', 'end', id('wardrobe'), out)?.p ?? null)
    if (room.kind === 'bedroom') { const desk = onAny(room, rect, bed ? [OPPOSITE[bed.s], ...rest] : rest, 'desk', 'centre', id('desk'), out); if (desk) { out.push(desk.p); const ch = inFront(desk.p, 5, 'office-chair', id('chair')); if (ch && !hits(ch, out)) out.push(ch) } }
  } else if (room.kind === 'living' && /dining/i.test(room.name) && Math.max(rect.w, rect.d) >= 500) {
    /* a living / dining room: the sofa set on one half, the dining set on the other */
    const wide = rect.w >= rect.d
    const a: Rect = wide ? { ...rect, w: Math.round(rect.w * 0.55) } : { ...rect, d: Math.round(rect.d * 0.55) }
    const b: Rect = wide ? { x: rect.x + a.w, z: rect.z, w: rect.w - a.w, d: rect.d } : { x: rect.x, z: rect.z + a.d, w: rect.w, d: rect.d - a.d }
    out.push(...furnishRoom({ ...room, name: 'Living' }, a, 'l'))
    push(centred(b, 'dining-6', id('dining'), b.w >= b.d ? 90 : 0))
  } else if (room.kind === 'living') {
    const sofa = onAny(room, rect, sides, rect.w * rect.d > 160000 ? 'sofa-l' : 'sofa-3', 'centre', id('sofa')) ?? onAny(room, rect, sides, 'sofa-3', 'centre', id('sofa'))
    if (sofa) {
      out.push(sofa.p)
      const tv = against(room, rect, OPPOSITE[sofa.s], 'tv-console', 'centre', id('tv'))
      const roomFor = sideLength(rect, sofa.s === 'n' || sofa.s === 's' ? 'e' : 'n') - sofa.p.d - 60
      if (tv && roomFor > 200) out.push(tv)
      const table = inFront(sofa.p, 45, 'coffee-table', id('table'))
      if (table && roomFor > 160) { push(inFront(sofa.p, 15, 'rug', id('rug'))); out.push(table) }
    }
  } else if (room.kind === 'dining') {
    push(centred(rect, 'dining-6', id('dining'), rect.w >= rect.d ? 0 : 90))
    push(onAny(room, rect, sides, 'sideboard', 'centre', id('sideboard'), out)?.p ?? null)
  } else if (room.kind === 'kitchen') {
    const side = sides[0]
    if (side) {
      const len = sideLength(rect, side), c = catalogueItem('counter')!
      const run = Math.max(120, Math.min(len - 90, 360))
      const counter = against(room, rect, side, 'counter', 'start', id('counter'))
      if (counter) out.push({ ...counter, w: run, ...shiftTo(counter, side, (run - c.w) / 2) })
      push(against(room, rect, side, 'fridge', 'end', id('fridge')))
    }
    if (area > 11) push(centred(rect, 'island', id('island'), rect.w >= rect.d ? 0 : 90))
  } else if (room.kind === 'bathroom') {
    const s = sides[0]
    if (s) { push(against(room, rect, s, 'toilet', 'start', id('wc'))); push(against(room, rect, s, 'vanity', 'end', id('vanity'))) }
    if (area >= 3.2) push(onAny(room, rect, sides.slice(1), 'shower', 'end', id('shower'), out)?.p ?? null)
  } else if (room.kind === 'study') {
    const desk = onAny(room, rect, sides, 'desk', 'centre', id('desk'))
    if (desk) { out.push(desk.p); push(inFront(desk.p, 5, 'office-chair', id('chair'))) }
    push(onAny(room, rect, sides.slice(1), 'bookshelf', 'end', id('shelf'), out)?.p ?? null)
  } else if (room.kind === 'yard') {
    push(onAny(room, rect, sides, 'washer', 'start', id('washer'))?.p ?? null)
  } else if (room.kind === 'foyer') {
    push(onAny(room, rect, sides, 'shoe-cabinet', 'centre', id('shoes'))?.p ?? null)
  } else if (room.kind === 'balcony') {
    push(onAny(room, rect, sides, 'plant', 'start', id('plant'))?.p ?? null)
    push(onAny(room, rect, sides, 'armchair', 'end', id('chair'), out)?.p ?? null)
  }
  return out
}
/* a piece stretched along its wall stays flush to the side's start */
function shiftTo(p: Piece, s: Side, by: number): { x: number; z: number } {
  if (s === 'n') return { x: Math.round(p.x + by), z: p.z }
  if (s === 's') return { x: Math.round(p.x + by), z: p.z }
  return { x: p.x, z: Math.round(p.z + by) }
}

/** Every room's main pieces (rooms with no rule — a store, a corridor, a porch — stay empty). */
export function furnish(rooms: Room[]): Piece[] {
  return rooms.flatMap((r) => furnishRoom(r))
}

/** (parity map, TD-088 — 1.0's Auto-Arrange, by rule) The kinds of room the furnishing rule knows. */
export const ARRANGED_KINDS: RoomKind[] = ['master', 'bedroom', 'living', 'dining', 'kitchen', 'bathroom', 'study', 'yard', 'foyer', 'balcony']
/** Why a room can't be arranged, or null — the menu row says it. */
export const arrangeBlock = (r: Pick<Room, 'kind'>) => (ARRANGED_KINDS.includes(r.kind) ? null : `There’s no furnishing rule for a ${KIND_WORD[r.kind] ?? 'room like this'} — place its pieces from Furniture`)
const KIND_WORD: Partial<Record<RoomKind, string>> = { store: 'store', corridor: 'corridor', outdoor: 'space outside', yard: 'service yard' }
/** (TD-088) One room furnished afresh — the same rule as *Start with furniture placed*, as the room stands now (its size, walls, doors). */
export function arrangeRoom(room: Room): Piece[] {
  return furnishRoom(room)
}
