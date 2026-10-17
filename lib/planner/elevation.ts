import { catalogueItem, pieceName } from './catalogue'
import { DEFAULT_HEIGHT, SIDES, SIDE_LABEL, WALL_T, openingSpan, pieceBox, sideLength, type Piece, type Room, type Side } from './model'

/*
 * (parity map, TD-091 — 1.0's Room · Kitchen · Wardrobe elevations, as one drawing) A wall of a room as you face it from inside: its
 * length and the room's ceiling, its doors and windows cut where they stand, and the pieces against it — each as its outline to scale with
 * its width and height (a pendant hangs from the ceiling). "Against it" = a piece in the room whose nearest side is within 45 cm of the
 * wall's face and that overlaps it along its length. The horizontal axis runs left to right as you face the wall, so a wardrobe drawn on the
 * left is on your left in the room. Pure and client-safe; the editor draws it (components/planner/editor/elevation-panel.tsx).
 */

export const ELEVATION_REACH = 45
export type ElevationOpening = { id: string; kind: 'door' | 'window'; a0: number; a1: number; y0: number; y1: number }
export type ElevationPiece = { id: string; key: string; name: string; a0: number; a1: number; y0: number; y1: number; gap: number }
export type Elevation = { side: Side; wallName: string; length: number; height: number; standing: boolean; openings: ElevationOpening[]; pieces: ElevationPiece[] }

/** Facing the wall from inside: which way its length runs on the plan, and where it starts. */
function along(room: Room, side: Side): (x: number, z: number) => number {
  if (side === 'n') return (x) => x - room.x                      // facing north: west on the left
  if (side === 's') return (x) => room.x + room.w - x             // facing south: east on the left
  if (side === 'e') return (_x, z) => z - room.z                  // facing east: north on the left
  return (_x, z) => room.z + room.d - z                           // facing west: south on the left
}

export function elevationOf(room: Room, side: Side, pieces: Piece[]): Elevation {
  const length = sideLength(room, side)
  const height = room.height || DEFAULT_HEIGHT
  const a = along(room, side)
  const openings: ElevationOpening[] = room.openings.filter((o) => o.side === side).map((o) => {
    const [p0, p1] = openingSpan(room, o)
    const ends = side === 'n' || side === 's' ? [a(p0, 0), a(p1, 0)] : [a(0, p0), a(0, p1)]
    const y0 = o.kind === 'door' ? 0 : (o.sill ?? 90)
    const y1 = o.kind === 'door' ? Math.min(210, height) : Math.min(height, y0 + (o.height ?? 120))
    return { id: o.id, kind: o.kind, a0: Math.min(...ends), a1: Math.max(...ends), y0, y1 }
  })
  const face = WALL_T / 2
  const inRoom = (p: Piece) => p.x >= room.x && p.x <= room.x + room.w && p.z >= room.z && p.z <= room.z + room.d
  const out: ElevationPiece[] = []
  for (const p of pieces) {
    if (!inRoom(p)) continue
    const b = pieceBox(p)
    const gap = side === 'n' ? b.z0 - (room.z + face) : side === 's' ? room.z + room.d - face - b.z1 : side === 'w' ? b.x0 - (room.x + face) : room.x + room.w - face - b.x1
    if (gap > ELEVATION_REACH) continue
    const ends = side === 'n' || side === 's' ? [a(b.x0, 0), a(b.x1, 0)] : [a(0, b.z0), a(0, b.z1)]
    const a0 = Math.max(0, Math.min(...ends)), a1 = Math.min(length, Math.max(...ends))
    if (a1 - a0 < 1) continue
    const c = catalogueItem(p.key)
    const y1 = c?.ceiling ? height - 60 : p.h, y0 = c?.ceiling ? height - 60 - p.h : 0
    out.push({ id: p.id, key: p.key, name: pieceName(p.key), a0, a1, y0: Math.max(0, y0), y1: Math.max(1, y1), gap: Math.max(0, Math.round(gap)) })
  }
  /* the farthest first, so a nearer piece is drawn over it */
  out.sort((x, y) => y.gap - x.gap)
  return { side, wallName: room.walls[side] ? `${SIDE_LABEL[side]} wall` : `Open ${SIDE_LABEL[side].toLowerCase()} side`, length, height, standing: room.walls[side], openings, pieces: out }   // (S42 D-18) an open side is no wall — the download and its line say so
}

/*
 * (pending modules S15 — card held:space-planner, "Elevations' reference lines (counter, cabinets, sockets) · revisit: cheap and useful for
 * briefing carpenters") 1.0's reference heights (src/components/floor-plan/ElevationDrawing.tsx `H`: COUNTER 0.85 · UPPER_CAB_BOTTOM 1.45 ·
 * UPPER_CAB_TOP 2.25 · SWITCH 1.2 · SOCKET 0.3 · MIRROR 1.5), in centimetres, drawn across a wall as dashed lines — the heights a carpenter and
 * an electrician work to. Which apply follows the wall, as 1.0's did (a kitchen by its name or an appliance against the wall; a bathroom by
 * its name): a kitchen wall — the counter and the upper cabinets' band; a bathroom wall — the mirror, and no switch or socket (they sit
 * outside a Singapore bathroom); every other standing wall — switches and sockets, a kitchen's too. An open side has no wall, so none.
 */
export const REFERENCE_HEIGHTS = { counter: 85, cabinetsFrom: 145, cabinetsTo: 225, switches: 120, sockets: 30, mirror: 150 } as const
export type ReferenceKey = 'counter' | 'cabinets' | 'mirror' | 'switches' | 'sockets'
/** A line (`y0 === y1`) or a band (the upper cabinets) across the wall, cm off the floor; `short` = its word beside the drawing. */
export type ReferenceLine = { key: ReferenceKey; label: string; short: string; y0: number; y1: number }
const KITCHEN_SHAPES = new Set(['counter', 'island', 'tall', 'fridge'])

export function referenceLinesOf(room: Pick<Room, 'kind'>, e: Pick<Elevation, 'standing' | 'height' | 'pieces'>): ReferenceLine[] {
  if (!e.standing) return []
  const against = e.pieces.map((p) => catalogueItem(p.key)?.shape ?? '')
  const kitchen = room.kind === 'kitchen' || against.some((s) => KITCHEN_SHAPES.has(s))
  const bathroom = room.kind === 'bathroom' || (!kitchen && against.includes('vanity'))
  const H = REFERENCE_HEIGHTS
  const lines: ReferenceLine[] = []
  if (kitchen) {
    lines.push({ key: 'cabinets', label: 'Upper cabinets', short: 'Cabinets', y0: H.cabinetsFrom, y1: H.cabinetsTo })
    lines.push({ key: 'counter', label: 'Counter top', short: 'Counter', y0: H.counter, y1: H.counter })
  }
  if (bathroom) lines.push({ key: 'mirror', label: 'Mirror', short: 'Mirror', y0: H.mirror, y1: H.mirror })
  else {
    lines.push({ key: 'switches', label: 'Switches', short: 'Switches', y0: H.switches, y1: H.switches })
    lines.push({ key: 'sockets', label: 'Sockets', short: 'Sockets', y0: H.sockets, y1: H.sockets })
  }
  /* a low ceiling (a mezzanine, a loft) keeps what fits under it — a band is cut at the ceiling */
  return lines.filter((l) => l.y0 < e.height).map((l) => ({ ...l, y1: Math.min(l.y1, e.height) })).sort((a, b) => b.y1 - a.y1)
}
/** "85 cm", "145–225 cm" */
export const referenceText = (l: Pick<ReferenceLine, 'y0' | 'y1'>) => (l.y1 > l.y0 ? `${l.y0}–${l.y1} cm` : `${l.y0} cm`)

/*
 * (pending modules S15 — 1.0's Kitchen Elevation and Wardrobe Elevation presets, FloorPlanEditor.tsx `handleElevationPreset`: the kitchen's
 * counter wall, the bedroom's wardrobe wall) The wall a room's elevations open on: the one its built-ins stand against — the longest run of
 * wardrobes, counters, tall units, a fridge, a vanity, shelves, a TV console or a washer along it; with none, the wall the most furniture
 * stands against (a rug and a pendant never count); with nothing at all, the longest standing wall.
 */
const BUILT_IN_SHAPES = new Set(['wardrobe', 'counter', 'tall', 'fridge', 'vanity', 'shelf', 'tv', 'washer'])
export function firstWallOf(room: Room, pieces: Piece[]): Side {
  const standing = SIDES.filter((s) => room.walls[s])
  if (!standing.length) return 'n'
  const score = new Map(standing.map((s) => {
    const against = elevationOf(room, s, pieces).pieces.filter((p) => !catalogueItem(p.key)?.loose)
    const run = (ps: ElevationPiece[]) => ps.reduce((n, p) => n + (p.a1 - p.a0), 0)
    return [s, { built: run(against.filter((p) => BUILT_IN_SHAPES.has(catalogueItem(p.key)?.shape ?? ''))), any: run(against) }]
  }))
  const of = (s: Side) => score.get(s) ?? { built: 0, any: 0 }
  return [...standing].sort((a, b) => of(b).built - of(a).built || of(b).any - of(a).any || sideLength(room, b) - sideLength(room, a))[0] ?? 'n'
}
