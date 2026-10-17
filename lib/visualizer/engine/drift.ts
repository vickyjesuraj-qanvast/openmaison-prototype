import type { Img } from './pixels'
import type { DriftReport } from '../drift'

/*
 * (pending modules S20 — the drift guard by rule, lib/visualizer/drift.ts) Pure and client-safe; runs in the browser (engine/run.ts
 * `guardRender`) and in Node (scripts/viz/drift-test.mts) on the same maths.
 *
 * The camera's framing, read by the picture's lines: both pictures as grey at 160 px wide, their edges (Sobel), and the zoom and slide that
 * best lay the render's edges on the photo's (normalised cross-correlation — a whole-room look changes colours and pieces, the room's lines
 * stay: the walls' corners, the window frames, the ceiling's edge). First coarse (zoom 0.94…1.06 in 0.02, slide ±5% in 2 px), then fine
 * around the best (±0.01 in 0.005, ±1 px). The camera moved when lining up gains clearly over leaving it be — by the thresholds below,
 * read off 1.0's own finished looks: the kitchen in Scandinavian (about 4% further back) gains 0.16; every other look and every edit gains
 * under 0.04 and sits at no zoom, no slide.
 */

type Grey = { w: number; h: number; d: Float32Array }

/** The picture as grey, `w` wide, each cell the mean of the pixels it covers. */
function grey(img: Img, w: number): Grey {
  const h = Math.max(8, Math.round((img.height * w) / img.width))
  const d = new Float32Array(w * h), n = new Float32Array(w * h)
  const fx = w / img.width, fy = h / img.height
  for (let y = 0; y < img.height; y++) {
    const gy = Math.min(h - 1, Math.floor(y * fy)) * w
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, k = gy + Math.min(w - 1, Math.floor(x * fx))
      d[k]! += 0.299 * img.data[i]! + 0.587 * img.data[i + 1]! + 0.114 * img.data[i + 2]!; n[k]!++
    }
  }
  for (let k = 0; k < d.length; k++) d[k] = d[k]! / (n[k] || 1)
  return { w, h, d }
}
/** Sobel edge strength. */
function edges(g: Grey): Grey {
  const { w, h, d } = g, o = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const gx = d[i - w + 1]! + 2 * d[i + 1]! + d[i + w + 1]! - d[i - w - 1]! - 2 * d[i - 1]! - d[i + w - 1]!
    const gy = d[i + w - 1]! + 2 * d[i + w]! + d[i + w + 1]! - d[i - w - 1]! - 2 * d[i - w]! - d[i - w + 1]!
    o[i] = Math.hypot(gx, gy)
  }
  return { w, h, d: o }
}
/** How well b's edges, zoomed by `s` about the centre and slid by (dx, dy) px, lie on a's — over a's inner 84% (−1…1). */
function ncc(a: Grey, b: Grey, dx: number, dy: number, s: number): number {
  const cx = a.w / 2, cy = a.h / 2, mx = Math.round(a.w * 0.08), my = Math.round(a.h * 0.08)
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0
  for (let y = my; y < a.h - my; y++) {
    const by = Math.round((y - cy) * s + cy + dy)
    if (by < 1 || by >= b.h - 1) continue
    for (let x = mx; x < a.w - mx; x++) {
      const bx = Math.round((x - cx) * s + cx + dx)
      if (bx < 1 || bx >= b.w - 1) continue
      const va = a.d[y * a.w + x]!, vb = b.d[by * b.w + bx]!
      sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb; n++
    }
  }
  if (n < 64) return -1
  const ma = sa / n, mb = sb / n, va = saa / n - ma * ma, vb = sbb / n - mb * mb
  return va <= 1e-6 || vb <= 1e-6 ? 0 : (sab / n - ma * mb) / Math.sqrt(va * vb)
}

/** The render's framing against the photo: the zoom and slide (shares of its width and height) that line it up, and how well its lines
    match before (`base`) and after (`best`). */
export type Framing = { scale: number; dx: number; dy: number; base: number; best: number }
/** When the camera counts as moved (see the header): lining up must gain this much, this share, over a zoom or a slide this large. */
export const FRAMING_RULE = { gain: 0.06, share: 0.12, zoom: 0.015, slide: 0.012 } as const

/** Read the framing — null when the two pictures aren't the same shape (a different crop is not a camera that moved: nothing to line up). */
export function readFraming(photo: Img, render: Img): Framing | null {
  if (!photo.width || !render.width || Math.abs(photo.width / photo.height - render.width / render.height) > 0.03) return null
  const a = edges(grey(photo, 160)), b = edges(grey(render, 160))
  const base = ncc(a, b, 0, 0, 1)
  let c = { s: 1, dx: 0, dy: 0, v: base }
  for (const s of [0.94, 0.96, 0.98, 1, 1.02, 1.04, 1.06]) for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
    const v = ncc(a, b, dx, dy, s); if (v > c.v + 1e-9) c = { s, dx, dy, v }
  }
  let f = c
  for (let ds = -0.01; ds <= 0.0101; ds += 0.005) for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++) {
    const s = Math.round((c.s + ds) * 1000) / 1000, dx = c.dx + ex, dy = c.dy + ey
    const v = ncc(a, b, dx, dy, s); if (v > f.v + 1e-9) f = { s, dx, dy, v }
  }
  return { scale: f.s, dx: f.dx / a.w, dy: f.dy / a.h, base, best: f.v }
}

/** Whether the camera moved, by the rule. */
export function framingMoved(f: Framing | null): boolean {
  if (!f) return false
  const gain = f.best - f.base
  const shifted = Math.abs(f.scale - 1) >= FRAMING_RULE.zoom || Math.abs(f.dx) >= FRAMING_RULE.slide || Math.abs(f.dy) >= FRAMING_RULE.slide
  return shifted && gain >= FRAMING_RULE.gain && gain / Math.max(0.05, Math.abs(f.base)) >= FRAMING_RULE.share
}

/** The framing in words — "The camera moved: the room sits 4% further back" (the report's detail). */
export function framingWords(f: Framing): string {
  const pc = (v: number) => `${Math.max(1, Math.round(Math.abs(v) * 100))}%`
  const parts: string[] = []
  if (f.scale <= 1 - FRAMING_RULE.zoom) parts.push(`the room sits ${pc(1 - f.scale)} further back`)
  else if (f.scale >= 1 + FRAMING_RULE.zoom) parts.push(`the room sits ${pc(f.scale - 1)} closer`)
  if (Math.abs(f.dx) >= FRAMING_RULE.slide) parts.push(`${pc(f.dx)} to the ${f.dx > 0 ? 'right' : 'left'}`)
  if (Math.abs(f.dy) >= FRAMING_RULE.slide) parts.push(`${pc(f.dy)} ${f.dy > 0 ? 'lower' : 'higher'}`)
  return `The camera moved from where the photo was taken${parts.length ? `: ${parts.join(', ')}` : ''}`
}

/** The rule's report: the camera, or nothing. */
export function framingReport(f: Framing | null): DriftReport {
  return framingMoved(f) && f
    ? { violations: [{ category: 'structure', severity: 'blocking', object: 'camera', location: 'the whole picture', detail: framingWords(f) }], by: 'rule' }
    : { violations: [], by: 'rule' }
}

/** The repair: the render zoomed and slid back onto the photo's framing (bilinear; a slide past its edge repeats the edge's last pixel). */
export function reframe(render: Img, f: Framing): Img {
  const { width: W, height: H, data: src } = render
  const out = new Uint8ClampedArray(W * H * 4), cx = W / 2, cy = H / 2, ox = f.dx * W, oy = f.dy * H
  for (let y = 0; y < H; y++) {
    const sy = Math.min(H - 1, Math.max(0, (y + 0.5 - cy) * f.scale + cy + oy - 0.5)), y0 = Math.floor(sy), y1 = Math.min(H - 1, y0 + 1), ty = sy - y0
    for (let x = 0; x < W; x++) {
      const sx = Math.min(W - 1, Math.max(0, (x + 0.5 - cx) * f.scale + cx + ox - 0.5)), x0 = Math.floor(sx), x1 = Math.min(W - 1, x0 + 1), tx = sx - x0
      const a = (y0 * W + x0) * 4, b = (y0 * W + x1) * 4, c = (y1 * W + x0) * 4, d = (y1 * W + x1) * 4, o = (y * W + x) * 4
      for (let k = 0; k < 3; k++) out[o + k] = (src[a + k]! * (1 - tx) + src[b + k]! * tx) * (1 - ty) + (src[c + k]! * (1 - tx) + src[d + k]! * tx) * ty
      out[o + 3] = 255
    }
  }
  return { width: W, height: H, data: out }
}
