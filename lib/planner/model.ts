/*
 * (gaps build J — the 3D Space Planner, J-Q4) A layout's plan, pure and client-safe: the editor, the viewers, the paper, the server's shape
 * check and the repair all read this one model. Every length is a whole CENTIMETRE (1.0 kept metres as floats and drifted); the top view's
 * axes are x to the right and z downwards (1.0's), and the 3D scene's metres are these divided by 100.
 *
 * A room is a rectangle (1.0's templates are rectangles placed by offset) with four sides — n (its top edge), e, s, w — each a wall or open,
 * and its doors and windows on a side: `at` is the opening's start measured from the side's start (west → east on n / s, north → south on
 * e / w). Two rooms that touch share their wall: `wallRuns` merges every side on one line into runs, an open side removing the wall it
 * covers whoever else draws it (so "Open this side" opens the wall between the living room and the kitchen), and every opening cuts the run
 * it sits on. A piece is placed by its centre with a rotation in degrees, clockwise on the top view; at 0 its back faces north.
 */

export type Side = 'n' | 'e' | 's' | 'w'
export const SIDES: Side[] = ['n', 'e', 's', 'w']
export const SIDE_LABEL: Record<Side, string> = { n: 'Top', e: 'Right', s: 'Bottom', w: 'Left' }

export type RoomKind = 'living' | 'dining' | 'kitchen' | 'master' | 'bedroom' | 'bathroom' | 'study' | 'store' | 'yard' | 'corridor' | 'foyer' | 'balcony' | 'outdoor'
export const OUTDOOR: RoomKind[] = ['balcony', 'outdoor']
export const KIND_LABEL: Record<RoomKind, string> = { living: 'Living room', dining: 'Dining', kitchen: 'Kitchen', master: 'Master bedroom', bedroom: 'Bedroom', bathroom: 'Bathroom', study: 'Study', store: 'Store', yard: 'Service yard', corridor: 'Corridor', foyer: 'Foyer', balcony: 'Balcony', outdoor: 'Outdoor' }

export type DoorSwing = 'left' | 'right'
export type Opening = {
  id: string
  kind: 'door' | 'window'
  side: Side
  /** cm from the side's start to the opening's start */ at: number
  width: number
  /** a door's hinge, looking in from the side (doors only) */ swing?: DoorSwing
  /** a window's sill and its height, cm (windows only) */ sill?: number
  height?: number
}
export type Room = {
  id: string
  name: string
  kind: RoomKind
  x: number; z: number; w: number; d: number
  /** wall height, cm (HDB 260) */ height: number
  walls: Record<Side, boolean>
  openings: Opening[]
  /** a material id (the AI Visualizer's catalogue, or `lib:<id>` — Company › Materials) or null = the template's colour */ floor: string | null
  wall: string | null
  floorHex: string
  wallHex: string
}
export type Piece = {
  id: string
  /** the catalogue's key (lib/planner/catalogue.ts) */ key: string
  x: number; z: number
  /** degrees, clockwise on the top view; 0 = its back to the north */ rot: number
  w: number; d: number; h: number
  /** its own colour (hex) — or a material id in `finish` */ color: string | null
  finish: string | null
}
/** (J-Q18) G's floor plan under the top view at its true size — studio only, never in a snapshot. */
export type Underlay = { planId: string; projectId: string; name: string; url: string; mmPerPx: number; pxW: number; pxH: number; x: number; z: number; opacity: number; visible: boolean }
/** The 3D camera as last left: its turn, its tilt, its distance (cm) and where it looks. */
export type Camera = { theta: number; phi: number; dist: number; tx: number; tz: number }
/**
 * (parity map, TD-075 — 1.0's multi-floor plans) A further level of the layout — an upper storey, a mezzanine: its own rooms, its own pieces
 * and its own floor-plan picture. Level 1 is the plan's own `rooms` / `pieces` / `underlay` (named by `levelName`), so every layout made
 * before levels reads as one level and nothing that reads `plan.rooms` changes meaning.
 */
export type Level = { id: string; name: string; rooms: Room[]; pieces: Piece[]; underlay: Underlay | null }
export type PlanDoc = { v: 1; rooms: Room[]; pieces: Piece[]; underlay: Underlay | null; camera: Camera | null; wallsLow: boolean
  /** (TD-075) the levels above level 1, in order */ levels?: Level[]
  /** (TD-075) level 1's name — "Level 1" when unset */ levelName?: string
  /** (pending modules S28) the rooms still to place on a floor-plan photo, in order — each drag on the plan takes the first (studio only) */ toPlace?: ToPlace[] }
/** (pending modules S28) A room the studio listed for a floor-plan photo, before it is placed on it. */
export type ToPlace = { name: string; kind: RoomKind }

export const EMPTY_PLAN: PlanDoc = { v: 1, rooms: [], pieces: [], underlay: null, camera: null, wallsLow: false }

/* ── levels (parity map, TD-075) ───────────────────────────────────────────────────────────────────────────────────────────────── */
export const LEVEL_ONE = 'l1'
export const MAX_LEVELS = 6
export type LevelView = { id: string; name: string; rooms: Room[]; pieces: Piece[] }
/** Every level, level 1 first. */
export function levelsOf(p: Pick<PlanDoc, 'rooms' | 'pieces'> & Pick<Partial<PlanDoc>, 'levels' | 'levelName'>): LevelView[] {
  return [{ id: LEVEL_ONE, name: p.levelName || 'Level 1', rooms: p.rooms, pieces: p.pieces }, ...(p.levels ?? []).map((l) => ({ id: l.id, name: l.name, rooms: l.rooms, pieces: l.pieces }))]
}
/** The plan as one level shows it — level 1 IS the plan (the same object, so nothing re-renders for it); another level lends its rooms,
    pieces and floor plan to a copy that keeps the plan's camera and walls. */
export function onLevel(p: PlanDoc, id: string): PlanDoc {
  if (id === LEVEL_ONE) return p
  const l = p.levels?.find((x) => x.id === id)
  return l ? { ...p, rooms: l.rooms, pieces: l.pieces, underlay: l.underlay } : p
}
/** A level's edited view written back into the plan (`onLevel`'s other half). */
export function putLevel(doc: PlanDoc, id: string, next: PlanDoc): PlanDoc {
  if (id === LEVEL_ONE || !doc.levels?.some((l) => l.id === id)) return next
  return { ...doc, camera: next.camera, wallsLow: next.wallsLow, levels: doc.levels.map((l) => (l.id === id ? { ...l, rooms: next.rooms, pieces: next.pieces, underlay: next.underlay } : l)) }
}
export const allRooms = (p: Pick<PlanDoc, 'rooms'> & Pick<Partial<PlanDoc>, 'levels'>): Room[] => [...p.rooms, ...(p.levels ?? []).flatMap((l) => l.rooms)]
export const allPieces = (p: Pick<PlanDoc, 'pieces'> & Pick<Partial<PlanDoc>, 'levels'>): Piece[] => [...p.pieces, ...(p.levels ?? []).flatMap((l) => l.pieces)]
/** The floor area inside, every level counted. */
export const totalArea = (p: Pick<PlanDoc, 'rooms'> & Pick<Partial<PlanDoc>, 'levels'>) => planArea(p) + (p.levels ?? []).reduce((n, l) => n + planArea(l), 0)

/* ── numbers ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** (J-Q8) 1.0's numbers in centimetres: the grid (finer than 1.0's 25 — an HDB wardrobe sat 12 cm off), the wall snap, the wall's
    drawn thickness, the overlap margin. */
export const GRID = 5
export const WALL_SNAP = 15
export const WALL_T = 10
export const OVERLAP_MARGIN = 3
export const EYE = 160
export const DEFAULT_HEIGHT = 260
export const LIMITS = { rooms: 40, pieces: 400, openings: 12, name: 60, w: 3000, x: 6000 }

export const snap = (v: number, step = GRID) => Math.round(v / step) * step
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const normRot = (r: number) => ((Math.round(r) % 360) + 360) % 360

/** "3.40 × 3.10 m" — a room's size as a studio says it (metres, two decimals). */
export const sizeText = (w: number, d: number) => `${(w / 100).toFixed(2)} × ${(d / 100).toFixed(2)} m`
/** "11.6 m²" */
export const areaText = (sqcm: number) => `${(sqcm / 10000).toFixed(1)} m²`
export const roomArea = (r: Pick<Room, 'w' | 'd'>) => r.w * r.d
export const planArea = (p: Pick<PlanDoc, 'rooms'>, indoorOnly = true) => p.rooms.filter((r) => !indoorOnly || !OUTDOOR.includes(r.kind)).reduce((n, r) => n + roomArea(r), 0)
/** A piece's size: "210 × 90 × 85 cm" */
export const pieceSizeText = (p: Pick<Piece, 'w' | 'd' | 'h'>) => `${p.w} × ${p.d} × ${p.h} cm`
/** (parity map, TD-081) A measured length as a studio says it: "85 cm" under a metre, "2.35 m" past it. */
export const lengthText = (cm: number) => (Math.abs(cm) < 100 ? `${Math.round(cm)} cm` : `${(cm / 100).toFixed(2)} m`)

/* ── sides ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** A side as a line: `axis` h = a constant z (n / s), v = a constant x (e / w); `c` the constant; `a0`…`a1` its span along the axis. */
export type Line = { axis: 'h' | 'v'; c: number; a0: number; a1: number }
export function sideLine(r: Pick<Room, 'x' | 'z' | 'w' | 'd'>, s: Side): Line {
  if (s === 'n') return { axis: 'h', c: r.z, a0: r.x, a1: r.x + r.w }
  if (s === 's') return { axis: 'h', c: r.z + r.d, a0: r.x, a1: r.x + r.w }
  if (s === 'w') return { axis: 'v', c: r.x, a0: r.z, a1: r.z + r.d }
  return { axis: 'v', c: r.x + r.w, a0: r.z, a1: r.z + r.d }
}
export const sideLength = (r: Pick<Room, 'w' | 'd'>, s: Side) => (s === 'n' || s === 's' ? r.w : r.d)
/** An opening's span along its line (absolute). */
export function openingSpan(r: Pick<Room, 'x' | 'z' | 'w' | 'd'>, o: Pick<Opening, 'side' | 'at' | 'width'>): [number, number] {
  const l = sideLine(r, o.side)
  const a = l.a0 + clamp(o.at, 0, Math.max(0, l.a1 - l.a0 - o.width))
  return [a, a + Math.min(o.width, l.a1 - l.a0)]
}
/** Where an opening may sit on its side: inside it, 5 cm clear of each corner. */
export function fitOpening(r: Pick<Room, 'w' | 'd'>, o: Pick<Opening, 'side' | 'at' | 'width'>): { at: number; width: number } {
  const len = sideLength(r, o.side)
  const width = clamp(Math.round(o.width), 30, Math.max(30, len - 10))
  return { width, at: clamp(Math.round(o.at), 5, Math.max(5, len - width - 5)) }
}

/* ── the walls, merged ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type Cut = { a0: number; a1: number; kind: 'door' | 'window'; sill: number; height: number; roomId: string; id: string }
/** A straight run of wall: its line, the spans that stand (`solid`, along the axis) and the openings cutting them. */
export type WallRun = { axis: 'h' | 'v'; c: number; solid: [number, number][]; cuts: Cut[]; height: number; roomIds: string[] }

export function wallRuns(rooms: Room[]): WallRun[] {
  type Seg = { a0: number; a1: number; wall: boolean; roomId: string; height: number }
  const groups = new Map<string, { axis: 'h' | 'v'; c: number; segs: Seg[]; cuts: Cut[] }>()
  for (const r of rooms) {
    for (const s of SIDES) {
      const l = sideLine(r, s)
      const key = `${l.axis}:${Math.round(l.c)}`
      const g = groups.get(key) ?? { axis: l.axis, c: Math.round(l.c), segs: [], cuts: [] }
      g.segs.push({ a0: l.a0, a1: l.a1, wall: r.walls[s], roomId: r.id, height: r.height })
      for (const o of r.openings.filter((x) => x.side === s)) {
        const [a0, a1] = openingSpan(r, o)
        g.cuts.push({ a0, a1, kind: o.kind, sill: o.kind === 'door' ? 0 : (o.sill ?? 90), height: o.kind === 'door' ? Math.min(210, r.height) : (o.height ?? 120), roomId: r.id, id: o.id })
      }
      groups.set(key, g)
    }
  }
  const out: WallRun[] = []
  for (const g of groups.values()) {
    const marks = [...new Set(g.segs.flatMap((s) => [s.a0, s.a1]))].sort((a, b) => a - b)
    const solid: [number, number][] = []
    let height = 0
    const ids = new Set<string>()
    for (let i = 0; i < marks.length - 1; i++) {
      const a = marks[i]!, b = marks[i + 1]!, mid = (a + b) / 2
      const over = g.segs.filter((s) => s.a0 <= mid && s.a1 >= mid)
      if (!over.length || over.some((s) => !s.wall)) continue   // an open side wins
      over.forEach((s) => { ids.add(s.roomId); height = Math.max(height, s.height) })
      const last = solid[solid.length - 1]
      if (last && last[1] === a) last[1] = b
      else solid.push([a, b])
    }
    if (!solid.length) continue
    /* a cut counts only where the wall stands; two rooms naming the same door on a shared wall cut it once */
    const cuts = g.cuts.filter((c) => solid.some(([a, b]) => c.a1 > a && c.a0 < b))
      .filter((c, i, all) => all.findIndex((x) => x.kind === c.kind && Math.abs(x.a0 - c.a0) < 2 && Math.abs(x.a1 - c.a1) < 2) === i)
    out.push({ axis: g.axis, c: g.c, solid, cuts, height: height || DEFAULT_HEIGHT, roomIds: [...ids] })
  }
  return out
}

/** A run's standing pieces with the openings taken out, each as a box: along-axis span, and the height band [y0, y1] it fills. */
export type WallBox = { axis: 'h' | 'v'; c: number; a0: number; a1: number; y0: number; y1: number }
export function wallBoxes(run: WallRun, low: number | null = null): WallBox[] {
  const top = low ?? run.height
  const out: WallBox[] = []
  for (const [s0, s1] of run.solid) {
    const cuts = run.cuts.filter((c) => c.a1 > s0 && c.a0 < s1).sort((a, b) => a.a0 - b.a0)
    let at = s0
    for (const c of cuts) {
      const c0 = Math.max(s0, c.a0), c1 = Math.min(s1, c.a1)
      if (c0 > at) out.push({ axis: run.axis, c: run.c, a0: at, a1: c0, y0: 0, y1: top })
      /* below a window's sill and above an opening's head, the wall goes on (to the cut-down height when the walls are low) */
      if (c.sill > 0) out.push({ axis: run.axis, c: run.c, a0: c0, a1: c1, y0: 0, y1: Math.min(top, c.sill) })
      if (c.sill + c.height < top) out.push({ axis: run.axis, c: run.c, a0: c0, a1: c1, y0: c.sill + c.height, y1: top })
      at = Math.max(at, c1)
    }
    if (at < s1) out.push({ axis: run.axis, c: run.c, a0: at, a1: s1, y0: 0, y1: top })
  }
  return out.filter((b) => b.a1 - b.a0 > 0.5 && b.y1 - b.y0 > 0.5)
}

/** The plan's extent (cm) — rooms, pieces and (when shown) the underlay. */
export function planBounds(p: Pick<PlanDoc, 'rooms' | 'pieces'> & { underlay?: Underlay | null }, withUnderlay = false): { x0: number; z0: number; x1: number; z1: number } {
  const xs: number[] = [], zs: number[] = []
  for (const r of p.rooms) { xs.push(r.x, r.x + r.w); zs.push(r.z, r.z + r.d) }
  for (const q of p.pieces) { const f = footprint(q); f.forEach(([x, z]) => { xs.push(x); zs.push(z) }) }
  const u = withUnderlay ? p.underlay : null
  if (u && u.visible) { const [uw, ud] = underlaySize(u); xs.push(u.x, u.x + uw); zs.push(u.z, u.z + ud) }
  if (!xs.length) return { x0: 0, z0: 0, x1: 800, z1: 600 }
  return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) }
}
/** An underlay's size on the plan, cm (G's scale is mm per picture pixel). */
export const underlaySize = (u: Pick<Underlay, 'mmPerPx' | 'pxW' | 'pxH'>): [number, number] => [Math.round((u.pxW * u.mmPerPx) / 10), Math.round((u.pxH * u.mmPerPx) / 10)]

/* ── pieces ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** A piece's four corners on the plan (clockwise from its back-left), cm. */
export function footprint(p: Pick<Piece, 'x' | 'z' | 'w' | 'd' | 'rot'>): [number, number][] {
  const t = (p.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), hw = p.w / 2, hd = p.d / 2
  return ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as const).map(([lx, lz]) => [p.x + lx * c - lz * s, p.z + lx * s + lz * c] as [number, number])
}
/** Its axis-aligned extent once rotated. */
export function pieceBox(p: Pick<Piece, 'x' | 'z' | 'w' | 'd' | 'rot'>) {
  const f = footprint(p)
  return { x0: Math.min(...f.map((q) => q[0])), x1: Math.max(...f.map((q) => q[0])), z0: Math.min(...f.map((q) => q[1])), z1: Math.max(...f.map((q) => q[1])) }
}
/** Two convex outlines overlap (the separating-axis test). */
function polysOverlap(a: [number, number][], b: [number, number][]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]!, p2 = poly[(i + 1) % poly.length]!
      const nx = p2[1] - p1[1], nz = p1[0] - p2[0]
      const proj = (q: [number, number][]) => q.map(([x, z]) => x * nx + z * nz)
      const pa = proj(a), pb = proj(b)
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false
    }
  }
  return true
}
/* each outline shrunk by the margin first, so pieces that merely touch don't count */
const shrunk = (p: Pick<Piece, 'x' | 'z' | 'w' | 'd' | 'rot'>) => footprint({ ...p, w: Math.max(1, p.w - OVERLAP_MARGIN * 2), d: Math.max(1, p.d - OVERLAP_MARGIN * 2) })

/**
 * (J-Q8) What a piece runs into — shown, never refused: a standing wall it crosses, and the pieces it overlaps. A flat piece (a rug) and a
 * hanging one (a pendant) never count, and nothing counts against them.
 */
export function overlapsOf(p: Piece, all: Piece[], runs: WallRun[], loose: (key: string) => boolean): { wall: boolean; pieces: string[] } {
  if (loose(p.key)) return { wall: false, pieces: [] }
  const me = shrunk(p)
  let wall = false
  outer: for (const run of runs) {
    for (const b of wallBoxes(run)) {
      if (b.y0 > 0) continue   // only what stands on the floor: full height, or under a window's sill
      const h = WALL_T / 2
      const box: [number, number][] = run.axis === 'h'
        ? [[b.a0, run.c - h], [b.a1, run.c - h], [b.a1, run.c + h], [b.a0, run.c + h]]
        : [[run.c - h, b.a0], [run.c + h, b.a0], [run.c + h, b.a1], [run.c - h, b.a1]]
      if (polysOverlap(me, box)) { wall = true; break outer }
    }
  }
  const pieces = all.filter((q) => q.id !== p.id && !loose(q.key) && polysOverlap(me, shrunk(q))).map((q) => q.id)
  return { wall, pieces }
}

/**
 * (J-Q8) Where a dragged piece lands: the grid first, then — square to the walls only — its nearest face within 15 cm of a standing wall's
 * face slides flush to it (1.0's wall snap). `free` (Alt held) skips both.
 */
export function snapPiece(p: Piece, runs: WallRun[], free = false): { x: number; z: number } {
  if (free) return { x: Math.round(p.x), z: Math.round(p.z) }
  let x = snap(p.x), z = snap(p.z)
  if (p.rot % 90 !== 0) return { x, z }
  const b = pieceBox({ ...p, x, z })
  const h = WALL_T / 2
  let bestX: number | null = null, bestZ: number | null = null, dx = WALL_SNAP + 1, dz = WALL_SNAP + 1
  for (const run of runs) {
    if (run.axis === 'v') {
      if (!run.solid.some(([a0, a1]) => b.z1 > a0 && b.z0 < a1)) continue
      /* a piece left of the wall meets its left face with its right edge; right of it, the right face with its left edge */
      const left = run.c - h - b.x1, right = run.c + h - b.x0
      if (Math.abs(left) < dx && b.x0 < run.c) { dx = Math.abs(left); bestX = x + left }
      if (Math.abs(right) < dx && b.x1 > run.c) { dx = Math.abs(right); bestX = x + right }
    } else {
      if (!run.solid.some(([a0, a1]) => b.x1 > a0 && b.x0 < a1)) continue
      const above = run.c - h - b.z1, below = run.c + h - b.z0
      if (Math.abs(above) < dz && b.z0 < run.c) { dz = Math.abs(above); bestZ = z + above }
      if (Math.abs(below) < dz && b.z1 > run.c) { dz = Math.abs(below); bestZ = z + below }
    }
  }
  if (bestX !== null && dx <= WALL_SNAP) x = Math.round(bestX)
  if (bestZ !== null && dz <= WALL_SNAP) z = Math.round(bestZ)
  return { x, z }
}

/** (J-Q6) A dragged room's edge snaps to another room's edge within 15 cm, else to the grid; `free` (Alt held) skips both. */
export function snapRoomEdge(v: number, axis: 'x' | 'z', rooms: Room[], self: string, free = false): number {
  if (free) return Math.round(v)
  let best = snap(v), gap = WALL_SNAP + 1
  for (const r of rooms) {
    if (r.id === self) continue
    for (const e of axis === 'x' ? [r.x, r.x + r.w] : [r.z, r.z + r.d]) if (Math.abs(e - v) < gap) { gap = Math.abs(e - v); best = e }
  }
  return gap <= WALL_SNAP ? best : snap(v)
}

/** The room a point stands in (the smallest that holds it). */
export function roomAt(rooms: Room[], x: number, z: number): Room | null {
  return rooms.filter((r) => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d).sort((a, b) => roomArea(a) - roomArea(b))[0] ?? null
}
/**
 * (parity map, TD-081 — 1.0's Ruler) Where a ruler's end lands: on the nearest room edge or piece side within `tol` cm on each axis (the
 * eye aims at a wall or a cabinet's face), else to the whole centimetre. `free` (Alt held) skips the edges.
 */
export function snapMeasure(pt: { x: number; z: number }, plan: Pick<PlanDoc, 'rooms' | 'pieces'>, tol: number, free = false): { x: number; z: number } {
  if (free) return { x: Math.round(pt.x), z: Math.round(pt.z) }
  const xs: number[] = [], zs: number[] = []
  for (const r of plan.rooms) { xs.push(r.x, r.x + r.w); zs.push(r.z, r.z + r.d) }
  for (const q of plan.pieces) { const b = pieceBox(q); xs.push(b.x0, b.x1); zs.push(b.z0, b.z1) }
  const near = (v: number, list: number[]) => { let best = Math.round(v), gap = tol; for (const e of list) if (Math.abs(e - v) <= gap) { gap = Math.abs(e - v); best = Math.round(e) } return best }
  return { x: near(pt.x, xs), z: near(pt.z, zs) }
}

/** Where a new room goes when it isn't drawn: a metre right of everything, level with the plan's top. */
export function freeSpot(rooms: Room[]): { x: number; z: number } {
  if (!rooms.length) return { x: 0, z: 0 }
  const b = planBounds({ rooms, pieces: [] })
  return { x: snap(b.x1 + 100, 10), z: snap(b.z0, 10) }
}

/* ── ids and names ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const newId = (prefix: string) => `${prefix}${(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 10)}`
/** "Bedroom 3" when "Bedroom 2" is taken. */
export function nextName(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  for (let n = 2; n < 100; n++) if (!taken.includes(`${base} ${n}`)) return `${base} ${n}`
  return base
}

/* ── the server's shape check ──────────────────────────────────────────────────────────────────────────────────────────────────── */
const num = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : dflt)
const str = (v: unknown, max: number, dflt = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : dflt)
const HEX = /^#[0-9a-fA-F]{6}$/
const hex = (v: unknown, dflt: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : dflt)
const matId = (v: unknown) => (typeof v === 'string' && /^[\w:.~-]{1,80}$/.test(v) ? v : null)
const KINDS: RoomKind[] = ['living', 'dining', 'kitchen', 'master', 'bedroom', 'bathroom', 'study', 'store', 'yard', 'corridor', 'foyer', 'balcony', 'outdoor']
const isSide = (v: unknown): v is Side => v === 'n' || v === 'e' || v === 's' || v === 'w'
/** The studio's floor-plan picture routes — the addresses an underlay may name: a project's floor plan (G), or (pending modules S28) a
    floor-plan photo kept for a layout (`/planner/plan-picture/<id>` — a lead's until it is won, then its project's; a personal layout's own). */
const UNDERLAY_URL = /^(?:\/projects\/[\w-]{1,64}\/plan-picture\/[\w-]{1,64}|\/planner\/plan-picture\/[\w-]{1,64})$/

/**
 * What the server keeps of a plan a browser sent (every save and every create): known keys only, every number a whole centimetre inside
 * its limits, names cut to 60, at most 40 rooms, 400 pieces and 12 openings a room; `knownPiece` drops a catalogue key that no longer
 * exists. Never trusts the editor.
 */
export function cleanPlan(raw: unknown, knownPiece: (key: string) => boolean): PlanDoc {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const one = cleanLevel(o, knownPiece)
  const c = (o.camera && typeof o.camera === 'object' ? o.camera : null) as Record<string, unknown> | null
  const fin = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d)
  const camera: Camera | null = c ? { theta: fin(c.theta, -100, 100, 0.8), phi: fin(c.phi, 0.05, 1.55, 0.9), dist: fin(c.dist, 50, 20000, 1500), tx: fin(c.tx, -LIMITS.x, LIMITS.x, 0), tz: fin(c.tz, -LIMITS.x, LIMITS.x, 0) } : null
  /* (parity map, TD-075) the levels above level 1: at most five more, each cleaned as level 1 is; ids unique, names cut to 60 */
  const seen = new Set<string>([LEVEL_ONE])
  const levels: Level[] = []
  for (const x of Array.isArray(o.levels) ? o.levels : []) {
    if (levels.length >= MAX_LEVELS - 1) break
    const l = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const id = str(l.id, 40)
    if (!id || seen.has(id)) continue
    seen.add(id)
    levels.push({ id, name: str(l.name, LIMITS.name) || `Level ${levels.length + 2}`, ...cleanLevel(l, knownPiece) })
  }
  const levelName = str(o.levelName, LIMITS.name)
  /* (pending modules S28) the rooms still to place: known kinds, names cut to 60, at most a layout's rooms */
  const toPlace: ToPlace[] = (Array.isArray(o.toPlace) ? o.toPlace : []).slice(0, LIMITS.rooms).flatMap((x): ToPlace[] => {
    const t = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const name = str(t.name, LIMITS.name)
    return name && KINDS.includes(t.kind as RoomKind) ? [{ name, kind: t.kind as RoomKind }] : []
  })
  return { v: 1, ...one, camera, wallsLow: o.wallsLow === true, ...(levels.length ? { levels } : {}), ...(levelName && levelName !== 'Level 1' ? { levelName } : {}), ...(toPlace.length ? { toPlace } : {}) }
}
/** One level's rooms, pieces and floor-plan picture, as the server keeps them. */
function cleanLevel(o: Record<string, unknown>, knownPiece: (key: string) => boolean): { rooms: Room[]; pieces: Piece[]; underlay: Underlay | null } {
  const rooms: Room[] = (Array.isArray(o.rooms) ? o.rooms : []).slice(0, LIMITS.rooms).flatMap((x): Room[] => {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const id = str(r.id, 40); if (!id) return []
    const walls = (r.walls && typeof r.walls === 'object' ? r.walls : {}) as Record<string, unknown>
    const room: Room = {
      id, name: str(r.name, LIMITS.name, 'Room') || 'Room', kind: KINDS.includes(r.kind as RoomKind) ? (r.kind as RoomKind) : 'bedroom',
      x: num(r.x, -LIMITS.x, LIMITS.x, 0), z: num(r.z, -LIMITS.x, LIMITS.x, 0), w: num(r.w, 50, LIMITS.w, 300), d: num(r.d, 50, LIMITS.w, 300),
      height: num(r.height, 200, 600, DEFAULT_HEIGHT),
      walls: { n: walls.n !== false, e: walls.e !== false, s: walls.s !== false, w: walls.w !== false },
      openings: [], floor: matId(r.floor), wall: matId(r.wall), floorHex: hex(r.floorHex, '#E8DCC8'), wallHex: hex(r.wallHex, '#F5F1EB'),
    }
    room.openings = (Array.isArray(r.openings) ? r.openings : []).slice(0, LIMITS.openings).flatMap((y): Opening[] => {
      const q = (y && typeof y === 'object' ? y : {}) as Record<string, unknown>
      const oid = str(q.id, 40); if (!oid || !isSide(q.side) || (q.kind !== 'door' && q.kind !== 'window')) return []
      const fit = fitOpening(room, { side: q.side, at: num(q.at, 0, LIMITS.w, 0), width: num(q.width, 30, LIMITS.w, 90) })
      return [q.kind === 'door'
        ? { id: oid, kind: 'door', side: q.side, ...fit, swing: q.swing === 'right' ? 'right' : 'left' }
        : { id: oid, kind: 'window', side: q.side, ...fit, sill: num(q.sill, 0, 250, 90), height: num(q.height, 30, 300, 120) }]
    })
    return [room]
  })
  const pieces: Piece[] = (Array.isArray(o.pieces) ? o.pieces : []).slice(0, LIMITS.pieces).flatMap((x): Piece[] => {
    const p = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const id = str(p.id, 40), key = str(p.key, 40)
    if (!id || !key || !knownPiece(key)) return []
    return [{ id, key, x: num(p.x, -LIMITS.x, LIMITS.x, 0), z: num(p.z, -LIMITS.x, LIMITS.x, 0), rot: normRot(num(p.rot, -720, 720, 0)),
              w: num(p.w, 5, 1200, 100), d: num(p.d, 5, 1200, 100), h: num(p.h, 1, 400, 80), color: typeof p.color === 'string' && HEX.test(p.color) ? p.color.toUpperCase() : null, finish: matId(p.finish) }]
  })
  const u = (o.underlay && typeof o.underlay === 'object' ? o.underlay : null) as Record<string, unknown> | null
  const url = u ? str(u.url, 200) : ''
  const underlay: Underlay | null = u && UNDERLAY_URL.test(url) && typeof u.mmPerPx === 'number' && u.mmPerPx > 0 && u.mmPerPx < 1000
    ? { planId: str(u.planId, 64), projectId: str(u.projectId, 64), name: str(u.name, 120), url, mmPerPx: u.mmPerPx, pxW: num(u.pxW, 1, 20000, 1), pxH: num(u.pxH, 1, 20000, 1),
        x: num(u.x, -LIMITS.x, LIMITS.x, 0), z: num(u.z, -LIMITS.x, LIMITS.x, 0), opacity: clamp(typeof u.opacity === 'number' ? u.opacity : 0.5, 0.1, 1), visible: u.visible !== false }
    : null
  return { rooms, pieces, underlay }
}
/** What the client is given: the plan without the studio's underlay — on any level — and (pending modules S28) without the rooms still to place. */
export const forClient = (p: PlanDoc): PlanDoc => { const { toPlace: _left, ...rest } = p; void _left; return { ...rest, underlay: null, ...(p.levels ? { levels: p.levels.map((l) => ({ ...l, underlay: null })) } : {}) } }
/** (parity map, TD-076 · TD-087) A copy that leaves the project: no floor-plan picture on any level (the picture is the project's). */
export const withoutUnderlays = forClient

/* ── what changed between two saves (parity map, TD-087 — 1.0's automatic version summary) ─────────────────────────────────────── */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/**
 * "2 pieces added · 1 moved · finishes changed" — what a version holds that the one before it did not (1.0: "Added 2 items, Moved 1
 * item"). Pieces and rooms are matched by their ids across every level; `null` before = the first version, which says what it holds.
 */
export function versionSummary(before: PlanDoc | null, now: PlanDoc): string {
  const rooms = allRooms(now), pieces = allPieces(now)
  if (!before) return [plural(rooms.length, 'room', 'rooms'), plural(pieces.length, 'piece', 'pieces'), ...(now.levels?.length ? [plural(now.levels.length + 1, 'level', 'levels')] : [])].join(' · ')
  const r0 = new Map(allRooms(before).map((r) => [r.id, r])), p0 = new Map(allPieces(before).map((p) => [p.id, p]))
  const r1 = new Map(rooms.map((r) => [r.id, r])), p1 = new Map(pieces.map((p) => [p.id, p]))
  const added = pieces.filter((p) => !p0.has(p.id)).length, removed = [...p0.keys()].filter((id) => !p1.has(id)).length
  const moved = pieces.filter((p) => { const q = p0.get(p.id); return q && (q.x !== p.x || q.z !== p.z || q.rot !== p.rot) }).length
  const resized = pieces.filter((p) => { const q = p0.get(p.id); return q && (q.w !== p.w || q.d !== p.d || q.h !== p.h) }).length
  const roomsAdded = rooms.filter((r) => !r0.has(r.id)).length, roomsGone = [...r0.keys()].filter((id) => !r1.has(id)).length
  const roomsChanged = rooms.filter((r) => { const q = r0.get(r.id); return q && (q.x !== r.x || q.z !== r.z || q.w !== r.w || q.d !== r.d || JSON.stringify(q.walls) !== JSON.stringify(r.walls) || JSON.stringify(q.openings) !== JSON.stringify(r.openings) || q.name !== r.name) }).length
  const finishes = rooms.some((r) => { const q = r0.get(r.id); return q && (q.floor !== r.floor || q.wall !== r.wall) }) || pieces.some((p) => { const q = p0.get(p.id); return q && (q.color !== p.color || q.finish !== p.finish) })
  const levels = (now.levels?.length ?? 0) - (before.levels?.length ?? 0)
  const parts = [
    added ? `${plural(added, 'piece', 'pieces')} added` : null, removed ? `${plural(removed, 'piece', 'pieces')} removed` : null,
    moved ? `${plural(moved, 'piece', 'pieces')} moved` : null, resized ? `${plural(resized, 'piece', 'pieces')} resized` : null,
    roomsAdded ? `${plural(roomsAdded, 'room', 'rooms')} added` : null, roomsGone ? `${plural(roomsGone, 'room', 'rooms')} removed` : null,
    roomsChanged ? `${plural(roomsChanged, 'room', 'rooms')} changed` : null, finishes ? 'finishes changed' : null,
    levels > 0 ? `${plural(levels, 'level', 'levels')} added` : levels < 0 ? `${plural(-levels, 'level', 'levels')} removed` : null,
  ].filter((x): x is string => !!x)
  if (!parts.length) return 'No changes from the one before'
  const s = parts.join(' · ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function parsePlan(json: string | null | undefined, knownPiece: (key: string) => boolean): PlanDoc {
  try { return cleanPlan(JSON.parse(json ?? '{}'), knownPiece) } catch { return { ...EMPTY_PLAN } }
}
