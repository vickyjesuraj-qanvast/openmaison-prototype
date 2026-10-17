import { squareToQuad } from '@/lib/visualizer/engine/texture'
import { findPaper, type RasterRGBA } from './straighten'

/*
 * (pending modules S41 — card studio:ai-sandboxes; 1.0's /tools/floorplan-3d-sandbox, "Adjust paper corners": scanic's corner editor — drag
 * the sheet's four corners yourself, Apply warps exactly that quad, "the ground-truth escape hatch") A FLOOR-PLAN PHOTO SQUARED BY ITS FOUR
 * CORNERS. S28's Make a 3D picture finds the sheet by rule and takes out its turn, but a photo taken at a slant keeps its perspective (only a
 * model finds a sheet's true corners). Four corners a person places are enough to take the slant out exactly: the quad they mark is mapped
 * onto a rectangle by one homography (engine/texture `squareToQuad`, the house's own), every output pixel read bilinearly from the photo.
 * Pure — the developers' bench (/dev/ai-bench) runs it in the browser, the harness in Node. Proposed for Make a 3D picture in outcome-S41.
 */

export type Corner = { x: number; y: number }
/** top-left · top-right · bottom-right · bottom-left, in the picture's own pixels */
export type Quad = [Corner, Corner, Corner, Corner]
export const CORNER_NAMES = ['Top-left corner', 'Top-right corner', 'Bottom-right corner', 'Bottom-left corner'] as const

/** Four points in any order, as top-left · top-right · bottom-right · bottom-left (round their middle, starting nearest the top-left). */
export function orderCorners(pts: Corner[]): Quad {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const round = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))   // clockwise on screen (y down)
  const start = round.reduce((bi, p, i) => (p.x + p.y < round[bi]!.x + round[bi]!.y ? i : bi), 0)
  const q = [0, 1, 2, 3].map((k) => round[(start + k) % 4]!)
  return [q[0]!, q[1]!, q[2]!, q[3]!]
}

/** Where to start the corners: the sheet the rule finds (S28's `findPaper`), else the picture's own corners 6 % in. */
export function seedCorners(r: RasterRGBA): { quad: Quad; found: boolean } {
  const p = findPaper(r)
  if (p && p.corners.length === 4) return { quad: orderCorners(p.corners.map(([x, y]) => ({ x: Math.min(r.width, Math.max(0, x)), y: Math.min(r.height, Math.max(0, y)) }))), found: true }
  const mx = r.width * 0.06, my = r.height * 0.06
  return { quad: [{ x: mx, y: my }, { x: r.width - mx, y: my }, { x: r.width - mx, y: r.height - my }, { x: mx, y: r.height - my }], found: false }
}

/** A quad's size once squared: its longer top/bottom edge by its longer side edge, kept under `maxLong` on the long side. */
export function squaredSize(q: Quad, maxLong = 1600): { w: number; h: number } {
  const d = (a: Corner, b: Corner) => Math.hypot(a.x - b.x, a.y - b.y)
  let w = Math.max(d(q[0], q[1]), d(q[3], q[2])), h = Math.max(d(q[0], q[3]), d(q[1], q[2]))
  const s = Math.min(1, maxLong / Math.max(1, w, h))
  w = Math.max(16, Math.round(w * s)); h = Math.max(16, Math.round(h * s))
  return { w, h }
}

/** Whether four corners make a quad worth squaring: convex, and not a sliver (each side at least 4 % of the picture's short side). */
export function quadUsable(q: Quad, W: number, H: number): boolean {
  const min = 0.04 * Math.min(W, H)
  for (let i = 0; i < 4; i++) { const a = q[i]!, b = q[(i + 1) % 4]!; if (Math.hypot(a.x - b.x, a.y - b.y) < min) return false }
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]!, b = q[(i + 1) % 4]!, c = q[(i + 2) % 4]!
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(z) < 1e-6) return false
    if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false
  }
  return true
}

/** The photo inside `q`, squared onto a rectangle (white beyond the photo's edge). */
export function warpToRect(r: RasterRGBA, q: Quad, maxLong = 1600): RasterRGBA {
  const { w, h } = squaredSize(q, maxLong)
  const m = squareToQuad([q[0], q[1], q[2], q[3]])
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = m as [number, number, number, number, number, number, number, number, number]
  const out = new Uint8ClampedArray(w * h * 4)
  const W = r.width, H = r.height, src = r.data
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w
      const den = m6 * u + m7 * v + m8
      const sx = (m0 * u + m1 * v + m2) / den - 0.5, sy = (m3 * u + m4 * v + m5) / den - 0.5
      const o = (y * w + x) * 4
      if (!(sx >= 0 && sy >= 0 && sx <= W - 1 && sy <= H - 1)) { out[o] = 255; out[o + 1] = 255; out[o + 2] = 255; out[o + 3] = 255; continue }
      const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1), tx = sx - x0, ty = sy - y0
      for (let c = 0; c < 3; c++) {
        const a = src[(y0 * W + x0) * 4 + c]!, b = src[(y0 * W + x1) * 4 + c]!, d = src[(y1 * W + x0) * 4 + c]!, e = src[(y1 * W + x1) * 4 + c]!
        out[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty
      }
      out[o + 3] = 255
    }
  }
  return { data: out, width: w, height: h }
}
