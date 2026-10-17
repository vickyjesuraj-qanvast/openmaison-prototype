import type { DepthMap } from './depth'

/*
 * (pending modules S41 — card studio:ai-sandboxes, 1.0's Spatial View: "Drag mesh", "Angles" (src/app/api/render/reangle) and "Orbit video"
 * (src/app/api/render/orbit-video, and its no-key "AI frames" engine)) THE PHOTO AS A ROOM YOU CAN STEP INTO, BY RULE. 1.0 had two answers:
 * a real-time mesh of the photo pushed back by a depth map — "content is pixel-identical, only the viewpoint moves" — and an image model asked
 * to redraw the room from six camera moves, or a video model asked for an orbit clip, both inventing what the photo never saw. 2.0 builds the
 * first by rule from `depthOf` (no model anywhere): every pixel lifted to its place in the room, then seen from a moved camera. Its honest
 * limit is 1.0's own: behind a sofa the photo saw nothing, so a big move stretches the edge it last saw (`trim` cuts the stretch away, leaving
 * a gap). A model that invents the hidden room plugs in at `CAMERA_MOVES` (one picture per move — lib/services/registry.ts `reangle`) and
 * `orbitYaw` (a clip — `orbit-video`). Pure: the bench draws the mesh with three.js; the harness checks the geometry in Node.
 */

export type MoveId = 'orbit-left' | 'orbit-right' | 'step-in' | 'step-back' | 'raise' | 'lower'
/** A camera move from where the photo was taken: turned about the room's middle (yaw, degrees — negative goes left), tilted (pitch, degrees
    — negative looks down), and moved (metres: right, up, back). 1.0's six, at 1.0's sizes (its route kept them "intentionally small"). */
export type CameraMove = { id: MoveId; label: string; v1: string; yaw: number; pitch: number; dx: number; dy: number; dz: number }
export const CAMERA_MOVES: CameraMove[] = [
  { id: 'orbit-left', label: 'Orbit left', v1: 'Orbit ←', yaw: -15, pitch: 0, dx: 0, dy: 0, dz: 0 },
  { id: 'orbit-right', label: 'Orbit right', v1: 'Orbit →', yaw: 15, pitch: 0, dx: 0, dy: 0, dz: 0 },
  { id: 'step-in', label: 'Step in', v1: 'Step in', yaw: 0, pitch: 0, dx: 0, dy: 0, dz: -1 },
  { id: 'step-back', label: 'Step back', v1: 'Step back', yaw: 0, pitch: 0, dx: 0, dy: 0, dz: 1 },
  { id: 'raise', label: 'Raise the camera', v1: 'Look up', yaw: 0, pitch: -4, dx: 0, dy: 0.3, dz: 0 },
  { id: 'lower', label: 'Lower the camera', v1: 'Look down', yaw: 0, pitch: 4, dx: 0, dy: -0.3, dz: 0 },
]
export const moveById = (id: string) => CAMERA_MOVES.find((m) => m.id === id) ?? null

/** Where a camera stands and looks: position (metres; the photo's camera at 0,0,0 looking down −z) and its turn (radians). */
export type Pose = { x: number; y: number; z: number; yaw: number; pitch: number }
export const FRONT: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }
/** The pose a move makes, turning about a point `pivot` metres ahead at eye height (the room's middle). */
export function poseFor(m: Pick<CameraMove, 'yaw' | 'pitch' | 'dx' | 'dy' | 'dz'>, pivot: number): Pose {
  const th = (m.yaw * Math.PI) / 180
  return { x: pivot * Math.sin(th) + m.dx, y: m.dy, z: -pivot + pivot * Math.cos(th) + m.dz, yaw: th, pitch: (m.pitch * Math.PI) / 180 }
}

/** The room's middle — the median distance of the photo's middle third, the point an orbit turns about. */
export function pivotOf(d: Pick<DepthMap, 'metres' | 'width' | 'height'>): number {
  const v: number[] = []
  for (let y = Math.floor(d.height / 3); y < Math.floor((2 * d.height) / 3); y += 2) for (let x = Math.floor(d.width / 3); x < Math.floor((2 * d.width) / 3); x += 2) v.push(d.metres[y * d.width + x]!)
  v.sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)]! : 3
}

/** A slow look round for a clip: side to side and back, `amp` degrees each way, once every `period` seconds (1.0's frames played the
    same arc as a ping-pong). */
export const ORBIT_AMP = 8, ORBIT_SECONDS = 6
export const orbitYaw = (t: number, amp = ORBIT_AMP, period = ORBIT_SECONDS) => amp * Math.sin((2 * Math.PI * t) / period)

/** The relief a slider gives (1.0's "Room depth"): 1 as read; lower flattens the room toward its middle, higher deepens it. */
export const RELIEF_MIN = 0.4, RELIEF_MAX = 1.6
const relieved = (z: number, pivot: number, k: number) => pivot * Math.pow(z / pivot, k)

export type MeshInput = {
  /** distances, metres, on a grid `width` × `height` — the photo's own map, or one extended past its edges (`ox`, `oy` its margins) */
  metres: Float32Array; width: number; height: number; ox?: number; oy?: number
  /** the photo's camera, in the map's own pixels (engine/texture Frame: focal length, horizon row, centre column) */
  frame: { f: number; yh: number; cx: number }
  /** one vertex every `step` pixels */ step?: number
  relief?: number; pivot: number
  /** a triangle whose far corner is this much farther than its near one is a silhouette, cut away (0: keep every triangle) */ trim?: number
}
export type Mesh = { positions: Float32Array; uvs: Float32Array; index: Uint32Array; triangles: number; trimmed: number; cols: number; rows: number }

/** Every pixel lifted to its place in the room: X = (x − cx)/f · Z, Y = (horizon − y)/f · Z, at −Z. */
export function roomMesh(i: MeshInput): Mesh {
  const step = Math.max(1, Math.round(i.step ?? 2)), k = i.relief ?? 1, ox = i.ox ?? 0, oy = i.oy ?? 0
  const cols = Math.floor((i.width - 1) / step) + 1, rows = Math.floor((i.height - 1) / step) + 1
  const positions = new Float32Array(cols * rows * 3), uvs = new Float32Array(cols * rows * 2), zs = new Float32Array(cols * rows)
  const { f, yh, cx } = i.frame
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = Math.min(i.width - 1, c * step), y = Math.min(i.height - 1, r * step), v = r * cols + c
    const z = relieved(i.metres[y * i.width + x]!, i.pivot, k)
    const px = x + 0.5 - ox, py = y + 0.5 - oy
    positions[v * 3] = ((px - cx) / f) * z
    positions[v * 3 + 1] = ((yh - py) / f) * z
    positions[v * 3 + 2] = -z
    uvs[v * 2] = (x + 0.5) / i.width
    uvs[v * 2 + 1] = 1 - (y + 0.5) / i.height
    zs[v] = z
  }
  const trim = i.trim ?? 0
  const tris: number[] = []
  let trimmed = 0
  const keep = (a: number, b: number, c: number) => {
    if (trim <= 0) return true
    const lo = Math.min(zs[a]!, zs[b]!, zs[c]!), hi = Math.max(zs[a]!, zs[b]!, zs[c]!)
    return hi / Math.max(1e-3, lo) <= 1 + trim
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1
    if (keep(a, d, b)) tris.push(a, d, b); else trimmed++
    if (keep(b, d, e)) tris.push(b, d, e); else trimmed++
  }
  return { positions, uvs, index: Uint32Array.from(tris), triangles: tris.length / 3, trimmed, cols, rows }
}

/** The photo's own camera for three.js: the vertical view angle and the view offset that puts its horizon row back where the photo has
    it (the optical axis runs through the horizon, which is rarely the photo's middle). */
export function photoCamera(W: number, H: number, f: number, yh: number): { fovDeg: number; fullW: number; fullH: number; offsetY: number } {
  const fullH = 2 * Math.max(yh, H - yh)
  return { fovDeg: (2 * Math.atan(fullH / 2 / f) * 180) / Math.PI, fullW: W, fullH, offsetY: fullH / 2 - yh }
}
