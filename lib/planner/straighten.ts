/*
 * (pending modules S28 — card studio:floorplan-isometric-ai, "Upload a floor-plan photo and get a furnished 3D picture") A floor-plan photo
 * made straight and clean, by rule — 1.0's zero-AI half of its tool, ported (src/lib/render/floorplan-deskew.ts, its 27 tests' maths): the
 * walls of a plan are square to each other, so the strongest edge direction folded into a quarter turn IS the photo's tilt (Sobel gradients →
 * an orientation histogram over [0°, 90°) → its peak, refined by a second pass on the corrected picture); then the paper's shading divided
 * away (a per-tile background, smoothed), the levels stretched so paper reads white and linework dark, and the picture cropped to what is
 * drawn. 1.0's ML paper finder (scanic) — a model — is not here: a photo taken at a slant keeps some of its perspective (the studio takes it
 * from straight above, or turns it a quarter when it reads sideways — walls can't tell "up" from "sideways").
 * New in 2.0: `footprintShare` — how much of the picture the plan covers (the paper outside its outline, reached from the picture's edge), so
 * a floor area gives the plan its true size (`lib/planner/photo.ts` `scaleFromArea`).
 * Pure and DOM-free: rasters in, numbers out (the browser half is components/planner/photo/straighten-photo.ts).
 */

/** Paper-ish grey a rotation fills the exposed corners with. */
const BG = 235

/** Any angle folded into (-45°, 45°] (mod 90). */
export function foldTo45(deg: number): number {
  let a = deg % 90
  while (a <= -45) a += 90
  while (a > 45) a -= 90
  return a
}

/** A grey raster turned clockwise by `deg` about its centre (same size, bilinear, the paper's grey in the corners). */
export function rotateGray(gray: Float64Array, w: number, h: number, deg: number): Float64Array {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad), s = Math.sin(rad)
  const out = new Float64Array(w * h).fill(BG)
  const cx = w / 2, cy = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy
      const sx = cx + dx * c + dy * s, sy = cy - dx * s + dy * c
      const x0 = Math.floor(sx), y0 = Math.floor(sy)
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) continue
      const fx = sx - x0, fy = sy - y0
      out[y * w + x] = gray[y0 * w + x0]! * (1 - fx) * (1 - fy) + gray[y0 * w + x0 + 1]! * fx * (1 - fy) + gray[(y0 + 1) * w + x0]! * (1 - fx) * fy + gray[(y0 + 1) * w + x0 + 1]! * fx * fy
    }
  }
  return out
}

/** One pass: the dominant line direction folded mod 90°, as the turn to APPLY (clockwise-positive, in (-45, 45]); null with too few strong edges. */
function estimateSkewOnce(gray: Float64Array, w: number, h: number): number | null {
  const angles: number[] = [], mags: number[] = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -gray[i - w - 1]! - 2 * gray[i - 1]! - gray[i + w - 1]! + gray[i - w + 1]! + 2 * gray[i + 1]! + gray[i + w + 1]!
      const gy = -gray[i - w - 1]! - 2 * gray[i - w]! - gray[i - w + 1]! + gray[i + w - 1]! + 2 * gray[i + w]! + gray[i + w + 1]!
      const mag = Math.hypot(gx, gy)
      if (mag < 8) continue   // flat paper and sensor noise
      let ang = (Math.atan2(gy, gx) * 180) / Math.PI
      ang = ((ang % 90) + 90) % 90   // the gradient is square to its line: fold to the line's direction mod 90
      angles.push(ang); mags.push(mag)
    }
  }
  if (mags.length < 500) return null
  /* only the strongest quarter of the edges — faint paper texture and JPEG noise can't drown the walls (photos vary in contrast) */
  const sample = mags.length > 100_000 ? mags.filter((_, i) => i % Math.ceil(mags.length / 100_000) === 0) : [...mags]
  sample.sort((a, b) => a - b)
  const thr = sample[Math.floor(sample.length * 0.75)]!
  const BINS = 360   // quarter-degree bins over [0, 90)
  const hist = new Float64Array(BINS)
  for (let i = 0; i < mags.length; i++) {
    if (mags[i]! < thr) continue
    hist[Math.round((angles[i]! / 90) * BINS) % BINS]! += mags[i]!
  }
  const smooth = new Float64Array(BINS)   // ±1.25°, round the circle
  for (let b = 0; b < BINS; b++) { let s = 0; for (let k = -5; k <= 5; k++) s += hist[(b + k + BINS) % BINS]!; smooth[b] = s }
  let best = 0
  for (let b = 1; b < BINS; b++) if (smooth[b]! > smooth[best]!) best = b
  if (smooth[best]! <= 0) return null
  let num = 0, den = 0   // the peak's weighted centre
  for (let k = -8; k <= 8; k++) { const b = (best + k + BINS) % BINS; num += k * smooth[b]!; den += smooth[b]! }
  const peak = best + (den > 0 ? num / den : 0)
  return foldTo45(-((peak / BINS) * 90))
}

/**
 * Two passes on a grey raster: the coarse estimate, applied, then the residual read again on the corrected raster (near 0° the smoothing's
 * bias is symmetric, so the residual falls under half a degree — 1.0 measured 0.32° at worst across −44°…87°). The turn to APPLY,
 * clockwise-positive, in (-45, 45]; 0 when the picture has too few edges to tell.
 */
export function estimateSkewGray(gray: Float64Array, w: number, h: number): number {
  const first = estimateSkewOnce(gray, w, h)
  if (first === null) return 0
  const second = estimateSkewOnce(rotateGray(gray, w, h, first), w, h) ?? 0
  return foldTo45(first + second)
}

/** A raster's shape — a real ImageData passes, and so does a test's plain object. */
export type RasterRGBA = { data: Uint8ClampedArray; width: number; height: number }

const lumOf = (px: Uint8ClampedArray, i: number) => 0.299 * px[i * 4]! + 0.587 * px[i * 4 + 1]! + 0.114 * px[i * 4 + 2]!

/** A raster's grey, at most `maxDim` on its long edge: each block's MEAN (a canvas's own shrink — 1.0 read the tilt on a 512 px drawImage;
    a nearest-pixel shrink stair-steps a turned wall and pulls the read towards square), or its DARKEST pixel, so a thin line (a window's, a
    door's swing) survives (what the footprint reads). */
export function grayOf(r: RasterRGBA, maxDim = 512, darkest = false): { gray: Float64Array; w: number; h: number } {
  const step = Math.max(1, Math.ceil(Math.max(r.width, r.height) / maxDim))
  const w = Math.max(2, Math.floor(r.width / step)), h = Math.max(2, Math.floor(r.height / step))
  const gray = new Float64Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (step === 1) { gray[y * w + x] = lumOf(r.data, Math.min(r.height - 1, y) * r.width + Math.min(r.width - 1, x)); continue }
    let v = darkest ? 255 : 0, cnt = 0
    for (let yy = y * step; yy < Math.min(r.height, (y + 1) * step); yy++) for (let xx = x * step; xx < Math.min(r.width, (x + 1) * step); xx++) {
      const l = lumOf(r.data, yy * r.width + xx)
      if (darkest) v = Math.min(v, l); else { v += l; cnt++ }
    }
    gray[y * w + x] = darkest ? v : v / Math.max(1, cnt)
  }
  return { gray, w, h }
}

/**
 * The scan's levels, in place: black and white points from the luminance's 2nd and 92nd percentiles, stretched per channel (a coloured plan
 * keeps its colours). Runs on the picture BEFORE it is turned — a turn's white corners would spoil the white point.
 */
export function cleanPlanImageData(data: RasterRGBA): void {
  const px = data.data, n = data.width * data.height
  const hist = new Uint32Array(256)
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.max(0, Math.round(lumOf(px, i))))]!++
  const percentile = (p: number): number => { const target = p * n; let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]!; if (acc >= target) return v } return 255 }
  let black = percentile(0.02)
  let white = percentile(0.92)
  /* a low-contrast photo keeps some contrast — and a clean page (a PDF's plan: under 2 % ink, both points read white) takes its span from below:
     with white already at 255 the span was nothing, every pixel divided by 0 and the plan came out black (REG-2804) */
  if (white - black < 60) { white = Math.min(255, black + 60); black = Math.min(black, white - 60) }
  const span = white - black
  for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) { const v = ((px[i * 4 + ch]! - black) * 255) / span; px[i * 4 + ch] = v < 0 ? 0 : v > 255 ? 255 : v }
}

/**
 * The paper's shading taken away, in place — a scanner app's "enhance": each pixel divided by its neighbourhood's background (each tile's
 * 85th-percentile luminance, smoothed 3×3 and read bilinearly), then near-white snapped to white. A desk, a tinted paper, uneven light and a
 * turned photo's edges all go white; the linework stays. A tile filled by a thick black wall would whiten it away, so the background never
 * falls under half the picture's white point.
 */
export function flattenPlanBackground(raster: RasterRGBA, opts: { tileSize?: number; percentile?: number; whiteSnap?: number } = {}): void {
  const { tileSize = 64, percentile = 0.85, whiteSnap = 232 } = opts
  const { data: px, width: w, height: h } = raster
  const n = w * h
  const gHist = new Uint32Array(256)
  for (let i = 0; i < n; i += 2) gHist[Math.min(255, Math.max(0, Math.round(lumOf(px, i))))]!++
  let acc = 0, globalWhite = 255
  const gTarget = 0.9 * Math.ceil(n / 2)
  for (let v = 0; v < 256; v++) { acc += gHist[v]!; if (acc >= gTarget) { globalWhite = v; break } }
  const bgFloor = Math.max(80, 0.5 * globalWhite)
  const gx = Math.max(1, Math.ceil(w / tileSize)), gy = Math.max(1, Math.ceil(h / tileSize))
  const bg = new Float64Array(gx * gy)
  for (let ty = 0; ty < gy; ty++) {
    for (let tx = 0; tx < gx; tx++) {
      const x0 = tx * tileSize, y0 = ty * tileSize, x1 = Math.min(w, x0 + tileSize), y1 = Math.min(h, y0 + tileSize)
      const vals: number[] = []
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) vals.push(lumOf(px, y * w + x))
      vals.sort((a, b) => a - b)
      const p = vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * percentile))]! : 255
      bg[ty * gx + tx] = Math.max(bgFloor, p)
    }
  }
  const sm = new Float64Array(gx * gy)
  for (let ty = 0; ty < gy; ty++) {
    for (let tx = 0; tx < gx; tx++) {
      let s = 0, cnt = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = ty + dy, xx = tx + dx; if (yy < 0 || xx < 0 || yy >= gy || xx >= gx) continue; s += bg[yy * gx + xx]!; cnt++ }
      sm[ty * gx + tx] = s / cnt
    }
  }
  for (let y = 0; y < h; y++) {
    const gyf = Math.min(gy - 1, Math.max(0, y / tileSize - 0.5)), ty0 = Math.floor(gyf), ty1 = Math.min(gy - 1, ty0 + 1), fy = gyf - ty0
    for (let x = 0; x < w; x++) {
      const gxf = Math.min(gx - 1, Math.max(0, x / tileSize - 0.5)), tx0 = Math.floor(gxf), tx1 = Math.min(gx - 1, tx0 + 1), fx = gxf - tx0
      const b = sm[ty0 * gx + tx0]! * (1 - fx) * (1 - fy) + sm[ty0 * gx + tx1]! * fx * (1 - fy) + sm[ty1 * gx + tx0]! * (1 - fx) * fy + sm[ty1 * gx + tx1]! * fx * fy
      const f = 255 / Math.max(1, b), i = (y * w + x) * 4
      const r = Math.min(255, px[i]! * f), g = Math.min(255, px[i + 1]! * f), bl = Math.min(255, px[i + 2]! * f)
      if (0.299 * r + 0.587 * g + 0.114 * bl >= whiteSnap) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255 } else { px[i] = r; px[i + 1] = g; px[i + 2] = bl }
    }
  }
}

/**
 * Where the plan's drawing is — the box round its dark pixels (the 0.5th to 99.5th percentile of their places, so a speck or a paper edge's
 * shadow doesn't count), padded by 3 % — so a turned photo's diamond crops down to the plan. Null with too little drawn, or nothing to trim.
 * (S28) A thin band at the picture's very edge is left out first (0.6 % of its long side): dark there is the sheet's own edge or its shadow
 * where the cut runs close, never the drawing — with it the box spanned the whole picture on one turn and not on the next.
 */
export function cropToContent(raster: RasterRGBA, opts: { darkThreshold?: number; padFraction?: number; edgeFraction?: number } = {}): { x: number; y: number; w: number; h: number } | null {
  const { darkThreshold = 180, padFraction = 0.03, edgeFraction = 0.006 } = opts
  const { data: px, width: w, height: h } = raster
  const e = Math.max(2, Math.round(Math.max(w, h) * edgeFraction))
  const xs: number[] = [], ys: number[] = []
  /* every pixel (1.0 read every second one: a one-pixel line was in on one turn and out on the next) */
  for (let y = e; y < h - e; y++) for (let x = e; x < w - e; x++) if (lumOf(px, y * w + x) < darkThreshold) { xs.push(x); ys.push(y) }
  if (xs.length < 800) return null
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b)
  const lo = Math.floor(xs.length * 0.005), hi = Math.ceil(xs.length * 0.995) - 1
  const pad = Math.round(Math.max(w, h) * padFraction)
  const x0 = Math.max(0, xs[lo]! - pad), x1 = Math.min(w - 1, xs[hi]! + pad), y0 = Math.max(0, ys[lo]! - pad), y1 = Math.min(h - 1, ys[hi]! + pad)
  const box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  if (box.w < 8 || box.h < 8) return null
  if (box.w * box.h > 0.95 * w * h) return null   // nothing worth trimming
  return box
}

/** The share a cropped plan is taken to cover when its outline can't be read (the crop's 3 % margin, and some paper inside its corners). */
export const FALLBACK_SHARE = 0.8

/**
 * (S28, new) How much of the picture the plan covers — its walls and everything inside them. The paper outside the outline is everything
 * light that can be reached from the picture's edge once the drawing's small gaps are closed (a window's thin lines, a door's swing — the
 * drawing is thickened a little first); what can't be reached is the plan. Null when it can't tell: a gap in the outline floods the inside
 * (the plan would read as little more than its walls), or nothing outside is paper.
 */
export function footprintShare(raster: RasterRGBA, o: { maxDim?: number; dark?: number; close?: number } = {}): number | null {
  const { maxDim = 400, dark = 170, close = 2 } = o
  const { gray, w, h } = grayOf(raster, maxDim, true)
  const n = w * h
  /* the drawing, thickened by `close` pixels each way */
  const ink = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (gray[i]! < dark) ink[i] = 1
  const wall = new Uint8Array(n)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!ink[y * w + x]) continue
    for (let dy = -close; dy <= close; dy++) for (let dx = -close; dx <= close; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < h && xx < w) wall[yy * w + xx] = 1 }
  }
  const drawn = wall.reduce((s, v) => s + v, 0)
  if (drawn < n * 0.01) return null
  /* the paper outside: a flood from every light pixel on the edge */
  const outside = new Uint8Array(n)
  const stack: number[] = []
  const seed = (i: number) => { if (!wall[i] && !outside[i]) { outside[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i - x) / w
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (y > 0) seed(i - w)
    if (y < h - 1) seed(i + w)
  }
  const out = outside.reduce((s, v) => s + v, 0)
  const share = (n - out) / n
  /* the outline leaked: the "plan" is about the drawing itself — not a footprint */
  if (share < Math.max(0.12, (drawn / n) * 1.6)) return null
  if (share > 0.98) return null
  return share
}

/* ── (S28, new) the sheet of paper in a photo — the deterministic stand-in for 1.0's ML paper finder (scanic) ─────────────────────── */
export type Paper = {
  /** the turn to APPLY so the sheet's edges run square to the picture (clockwise-positive, in (-45, 45]) */ angle: number
  /** the sheet's four corners, in the picture's own pixels (its minimum-area rectangle) */ corners: [number, number][]
  /** how much of the picture the sheet covers */ share: number
}
/**
 * Where the sheet of paper lies in a photo of it on a desk, by rule: paper is the brightest NEUTRAL part of the photo (a desk, a table cloth,
 * a hand are coloured or darker), so the light grey-to-white pixels are taken, the biggest piece of them kept with the drawing inside it
 * (its holes filled), and the smallest rectangle round its outline read off its convex hull (rotating calipers). Null when no sheet stands
 * out — a scan or a screenshot that IS the paper, a sheet that isn't rectangular enough (it must fill 85 % of its rectangle), or a sheet too
 * small to trust — and the whole picture is used, as 1.0 did when scanic found nothing. A sheet photographed at a slant keeps its
 * perspective (only a turn is taken out).
 */
export function findPaper(r: RasterRGBA, maxDim = 400): Paper | null {
  const step = Math.max(1, Math.ceil(Math.max(r.width, r.height) / maxDim))
  const w = Math.max(2, Math.floor(r.width / step)), h = Math.max(2, Math.floor(r.height / step)), n = w * h
  const lum = new Float64Array(n), chroma = new Float64Array(n)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.min(r.height - 1, y * step) * r.width + Math.min(r.width - 1, x * step)) * 4
    const R = r.data[i]!, G = r.data[i + 1]!, B = r.data[i + 2]!
    lum[y * w + x] = 0.299 * R + 0.587 * G + 0.114 * B
    chroma[y * w + x] = Math.max(R, G, B) - Math.min(R, G, B)
  }
  const sorted = Float64Array.from(lum).sort()
  const bright = sorted[Math.floor(n * 0.95)]!
  if (bright < 90) return null   // a dark photo: nothing reads as paper
  const T = bright * 0.78
  /* the paper's pixels: light and neutral */
  const m = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (lum[i]! >= T && chroma[i]! <= Math.max(24, bright * 0.14)) m[i] = 1
  /* the biggest piece of them (4-neighbours) */
  const comp = new Int32Array(n).fill(-1)
  let best = -1, bestSize = 0, id = 0
  const stack: number[] = []
  for (let s = 0; s < n; s++) {
    if (!m[s] || comp[s]! >= 0) continue
    let size = 0
    comp[s] = id; stack.push(s)
    while (stack.length) {
      const i = stack.pop()!, x = i % w
      size++
      const push = (j: number) => { if (m[j] && comp[j]! < 0) { comp[j] = id; stack.push(j) } }
      if (x > 0) push(i - 1)
      if (x < w - 1) push(i + 1)
      if (i >= w) push(i - w)
      if (i < n - w) push(i + w)
    }
    if (size > bestSize) { bestSize = size; best = id }
    id++
  }
  if (best < 0) return null
  /* its holes (the drawing on it) filled: what the picture's edge can't reach without crossing it */
  const sheet = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (comp[i] === best) sheet[i] = 1
  const out = new Uint8Array(n)
  const seed = (i: number) => { if (!sheet[i] && !out[i]) { out[i] = 1; stack.push(i) } }
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1) }
  while (stack.length) {
    const i = stack.pop()!, x = i % w
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (i >= w) seed(i - w)
    if (i < n - w) seed(i + w)
  }
  let area = 0
  const pts: [number, number][] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (out[i]) continue
    area++
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || out[i - 1] || out[i + 1] || out[i - w] || out[i + w]
    if (edge) pts.push([x, y])
  }
  const share = area / n
  if (share < 0.15 || share > 0.97 || pts.length < 8) return null
  const hull = convexHull(pts)
  if (hull.length < 3) return null
  /* the smallest rectangle round the hull: one of its sides lies along a hull edge */
  let bestArea = Infinity, bestAng = 0, rect: [number, number][] = []
  for (let k = 0; k < hull.length; k++) {
    const [ax, ay] = hull[k]!, [bx, by] = hull[(k + 1) % hull.length]!
    const ang = Math.atan2(by - ay, bx - ax), c = Math.cos(-ang), s = Math.sin(-ang)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const [px, py] of hull) { const u = px * c - py * s, v = px * s + py * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v) }
    const a = (x1 - x0) * (y1 - y0)
    if (a < bestArea) {
      bestArea = a; bestAng = ang
      const ci = Math.cos(ang), si = Math.sin(ang)
      rect = ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const).map(([u, v]) => [(u * ci - v * si + 0.5) * step, (u * si + v * ci + 0.5) * step] as [number, number])
    }
  }
  if (!Number.isFinite(bestArea) || area / bestArea < 0.85) return null   // not a sheet: it doesn't fill its rectangle
  return { angle: foldTo45(-(bestAng * 180) / Math.PI), corners: rect, share }
}

/** Andrew's monotone chain — the convex hull of points, counter-clockwise. */
function convexHull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = [], upper: [number, number][] = []
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop(); lower.push(q) }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]!; while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop(); upper.push(q) }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}
