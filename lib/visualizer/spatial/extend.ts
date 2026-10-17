import { downscale, makeImg, resample, type Img } from '../engine/pixels'

/*
 * (pending modules S41 — card studio:ai-sandboxes, 1.0's Spatial View › "Extend room", src/app/api/render/outpaint + src/lib/spatial/
 * pad-for-outpaint.ts) A PHOTO WITH MORE ROOM AROUND IT, BY RULE. 1.0 built a padded canvas — the photo sharp in the middle over a blurred,
 * stretched copy of itself — and asked an image model to paint a sharp continuation of the same room into the blur, so looking around in the
 * 3D photo met more room instead of a hard edge. 2.0 calls no model, so it builds the canvas and fills the margin by rule:
 *   · `cover` — 1.0's own padded canvas, exactly what it sent the model: the blurred stretch, the photo on top;
 *   · `mirror` — the photo's own edge reflected outward (a skirting runs on, a floor keeps its boards), fading into the blurred stretch the
 *     farther it gets from the photo, so nothing sharp is invented where the photo saw nothing.
 * Nothing new is painted: a margin repeats or softens what the photo already shows. Painting more of the room is a model's — it plugs in at
 * `extendRoom` (lib/services/registry.ts `outpaint`) and answers the same shape. Pure: the bench and the harness run the same code.
 */

export type ExtendMode = 'mirror' | 'cover'
export const EXTEND_MODES: { key: ExtendMode; label: string; line: string }[] = [
  { key: 'mirror', label: 'Mirror the edges', line: 'The photo’s own edges, reflected outward and fading into a soft blur.' },
  { key: 'cover', label: '1.0’s padded canvas', line: 'The blurred stretch 1.0 sent its model, with the photo on top.' },
]
export const EXTEND_FACTORS = [1.2, 1.4, 1.6] as const
export type Extended = { img: Img; inner: { x: number; y: number; w: number; h: number }; factor: number; mode: ExtendMode }

/** A box blur, three passes (close to a gaussian), each side's radius `r` px. */
function blur(src: Img, r: number): Img {
  const W = src.width, H = src.height
  const a = new Float32Array(W * H * 3)
  for (let i = 0; i < W * H; i++) { a[i * 3] = src.data[i * 4]!; a[i * 3 + 1] = src.data[i * 4 + 1]!; a[i * 3 + 2] = src.data[i * 4 + 2]! }
  const b = new Float32Array(a.length)
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean) => {
    const len = horizontal ? W : H, lines = horizontal ? H : W
    for (let l = 0; l < lines; l++) for (let c = 0; c < 3; c++) {
      let acc = 0
      const at = (k: number) => { const kk = Math.min(len - 1, Math.max(0, k)); return horizontal ? (l * W + kk) * 3 + c : (kk * W + l) * 3 + c }
      for (let k = -r; k <= r; k++) acc += from[at(k)]!
      for (let k = 0; k < len; k++) {
        to[at(k)] = acc / (2 * r + 1)
        acc += from[at(k + r + 1)]! - from[at(k - r)]!
      }
    }
  }
  for (let n = 0; n < 3; n++) { pass(a, b, true); pass(b, a, false) }   // each round ends back in `a`
  const out = makeImg(W, H)
  for (let i = 0; i < W * H; i++) { out.data[i * 4] = a[i * 3]!; out.data[i * 4 + 1] = a[i * 3 + 1]!; out.data[i * 4 + 2] = a[i * 3 + 2]!; out.data[i * 4 + 3] = 255 }
  return out
}

/** Reflect an index into 0 … n−1 (the edge pixel itself is not repeated). */
const reflect = (k: number, n: number) => {
  if (n <= 1) return 0
  const p = 2 * (n - 1)
  let m = ((k % p) + p) % p
  if (m >= n) m = p - m
  return m
}
const smooth = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u) }

/** `src` on a canvas `factor` times its size, the margin filled by `mode`. */
export function extendRoom(src: Img, factor = 1.4, mode: ExtendMode = 'mirror'): Extended {
  const k = Math.max(1, Math.min(2, factor))
  const W = src.width, H = src.height
  const OW = Math.round(W * k), OH = Math.round(H * k)
  const ox = Math.round((OW - W) / 2), oy = Math.round((OH - H) / 2)
  /* the blurred stretch — worked small (a quarter) then laid back at size: 1.0's `blur(28px)` over the whole canvas */
  const small = downscale(resample(src, OW, OH), Math.max(64, Math.round(Math.max(OW, OH) / 4)))
  const cover = resample(blur(small, Math.max(2, Math.round(Math.max(small.width, small.height) * 0.02))), OW, OH)
  const out = makeImg(OW, OH)
  const margin = Math.max(1, Math.max(ox, oy))
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const o = (y * OW + x) * 4, sx = x - ox, sy = y - oy
    if (sx >= 0 && sy >= 0 && sx < W && sy < H) { const i = (sy * W + sx) * 4; out.data[o] = src.data[i]!; out.data[o + 1] = src.data[i + 1]!; out.data[o + 2] = src.data[i + 2]!; out.data[o + 3] = 255; continue }
    if (mode === 'cover') { out.data[o] = cover.data[o]!; out.data[o + 1] = cover.data[o + 1]!; out.data[o + 2] = cover.data[o + 2]!; out.data[o + 3] = 255; continue }
    /* how far outside the photo this pixel is, as a share of the margin: the mirror holds near the edge and gives way to the blur */
    const dx = sx < 0 ? -sx : sx >= W ? sx - W + 1 : 0, dy = sy < 0 ? -sy : sy >= H ? sy - H + 1 : 0
    const t = smooth(Math.hypot(dx, dy) / margin * 1.15)
    const i = (reflect(sy, H) * W + reflect(sx, W)) * 4
    for (let c = 0; c < 3; c++) out.data[o + c] = src.data[i + c]! * (1 - t) + cover.data[o + c]! * t
    out.data[o + 3] = 255
  }
  return { img: out, inner: { x: ox, y: oy, w: W, h: H }, factor: k, mode }
}

/** A depth map (metres) laid on the same bigger canvas: the margin takes the distance of the photo's nearest edge (the room goes on at the
    distance its edge was). */
export function extendDepth(metres: Float32Array, W: number, H: number, factor: number): { metres: Float32Array; width: number; height: number; ox: number; oy: number } {
  const k = Math.max(1, Math.min(2, factor))
  const OW = Math.round(W * k), OH = Math.round(H * k)
  const ox = Math.round((OW - W) / 2), oy = Math.round((OH - H) / 2)
  const out = new Float32Array(OW * OH)
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const sx = Math.min(W - 1, Math.max(0, x - ox)), sy = Math.min(H - 1, Math.max(0, y - oy))
    out[y * OW + x] = metres[sy * W + sx]!
  }
  return { metres: out, width: OW, height: OH, ox, oy }
}
