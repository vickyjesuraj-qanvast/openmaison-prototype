import { rgbToLab, type Img, type Pt } from './pixels'

/* AI Visualizer engine (audit 2026-09-26, F047 · F187 · F191) — how a material's tile lies on a surface. A wall the reading traced as a
   quad takes the tile through that quad's perspective (a homography); a floor or a ceiling takes it through the ground plane — the
   horizon and the room's vanishing points, read off the back wall; anything else lies flat on the photo as before. Scale is real: the
   camera stands 1.4 m up in a 2.7 m room, so a 60 cm tile is 60 cm wherever it lies. Sampling is bilinear and fades to the tile's own
   average where one pixel covers several texels (the far floor), so a pattern recedes instead of shimmering. Pure. */

/** Tile repeats (u across, v down) at a pixel, or null where the surface's frame doesn't reach (lays the material's flat colour). */
export type TexMap = (x: number, y: number) => [number, number] | null
export type Texture = {
  lab: Float32Array; tw: number; th: number; mean: [number, number, number]
  /** The tile halved and halved again (box-filtered): a far floor samples the level its pixels span, so it recedes smoothly. */
  mips?: { lab: Float32Array; w: number; h: number }[]
  map: TexMap
  /** 1 — the tile's own light and colour (a printed motif); lower — a grain around the material's colour, at that strength. */
  strength: number
}
/** The room seen by the camera: the horizon row, the vanishing points on it (px) and the focal length (px). */
export type Frame = { W: number; H: number; yh: number; x1: number | null; x2: number; f: number; cx: number }

export const CAMERA_M = 1.4, CEILING_M = 2.7

export function tileLab(tile: Img): { lab: Float32Array; mean: [number, number, number] } {
  const n = tile.width * tile.height, lab = new Float32Array(n * 3)
  let L = 0, A = 0, B = 0
  for (let k = 0; k < n; k++) {
    const [l, a, b] = rgbToLab(tile.data[k * 4]!, tile.data[k * 4 + 1]!, tile.data[k * 4 + 2]!)
    lab[k * 3] = l; lab[k * 3 + 1] = a; lab[k * 3 + 2] = b; L += l; A += a; B += b
  }
  return { lab, mean: [L / n, A / n, B / n] }
}
export function makeTexture(tile: Img, map: TexMap, strength = 1): Texture {
  const { lab, mean } = tileLab(tile)
  const mips: { lab: Float32Array; w: number; h: number }[] = [{ lab, w: tile.width, h: tile.height }]
  while (mips.length < 6) {
    const up = mips[mips.length - 1]!, w = Math.max(1, up.w >> 1), h = Math.max(1, up.h >> 1)
    if (w === up.w && h === up.h) break
    const o = new Float32Array(w * h * 3)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let t = 0, n = 0
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const xx = Math.min(up.w - 1, x * 2 + dx), yy = Math.min(up.h - 1, y * 2 + dy); t += up.lab[(yy * up.w + xx) * 3 + c]!; n++ }
      o[(y * w + x) * 3 + c] = t / n
    }
    mips.push({ lab: o, w, h })
  }
  return { lab, tw: tile.width, th: tile.height, mean, map, strength, mips }
}

/** Flat on the photo — one tile every `px` pixels (the old wallpaper lay, and any photo nobody traced). */
export const screenMap = (px: number, aspect = 1): TexMap => (x, y) => [x / px, y / (px * aspect)]

/* ── the room's frame ── */
type Line = { a: Pt; b: Pt }
const cross = (l: Line, m: Line): Pt | null => {
  const d = (l.a.x - l.b.x) * (m.a.y - m.b.y) - (l.a.y - l.b.y) * (m.a.x - m.b.x)
  if (Math.abs(d) < 1e-9) return null
  const t = ((l.a.x - m.a.x) * (m.a.y - m.b.y) - (l.a.y - m.a.y) * (m.a.x - m.b.x)) / d
  return { x: l.a.x + t * (l.b.x - l.a.x), y: l.a.y + t * (l.b.y - l.a.y) }
}
const area = (q: Pt[]) => Math.abs(q.reduce((s, a, i) => { const b = q[(i + 1) % q.length]!; return s + a.x * b.y - b.x * a.y }, 0)) / 2
/** A point set's convex hull (Andrew's monotone chain), counter-clockwise. */
function convexHull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  if (p.length < 3) return p
  const cr = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: Pt[] = [], hi: Pt[] = []
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q) }
  for (const q of [...p].reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop(); hi.push(q) }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)]
}
/** An upright outline's four corners (px) — top-left · top-right · bottom-right · bottom-left: the largest quadrilateral inside its
    convex hull (a traced wall with a notch at the skirting, or a return at the bulkhead, is still that wall). Null for anything that
    isn't a band with two upright sides. */
export function quadCorners(poly: Pt[], W: number, H: number): [Pt, Pt, Pt, Pt] | null {
  if (poly.length < 4) return null
  const h = convexHull(poly.map((q) => ({ x: q.x * W, y: q.y * H })))
  if (h.length < 4) return null
  let best: Pt[] | null = null, bestA = -1
  if (h.length === 4) best = h
  else {
    const n = Math.min(h.length, 24), pts = h.length > 24 ? h.filter((_, i) => i % Math.ceil(h.length / 24) === 0) : h
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
      const q = [pts[a]!, pts[b]!, pts[c]!, pts[d]!], ar = area(q)
      if (ar > bestA) { bestA = ar; best = q }
    }
  }
  if (!best) return null
  const byX = [...best].sort((a, b) => a.x - b.x)
  const [tl, bl] = byX.slice(0, 2).sort((a, b) => a.y - b.y) as [Pt, Pt], [tr, br] = byX.slice(2).sort((a, b) => a.y - b.y) as [Pt, Pt]
  const width = (tr.x + br.x - tl.x - bl.x) / 2
  if (width < 0.06 * W || bl.y - tl.y < 0.04 * H || br.y - tr.y < 0.04 * H) return null
  if (Math.abs(tl.x - bl.x) > 0.5 * width || Math.abs(tr.x - br.x) > 0.5 * width) return null   // not upright sides
  return [tl, tr, br, bl]
}

/** The frame from a reading's upright outlines (walls first, then cabinet runs): each one's top and bottom lines meet on the horizon at
    a vanishing point. The biggest wall gives the first; a wall that recedes the other way (a room's corner) gives the second and, with
    it, the focal length; else the second is square to the first through a typical interior lens. A wall seen square-on puts the horizon
    at eye level (1.4 m of 2.7 m) and the depth point at its middle. No upright outline: the horizon at 45 %, the depth point centred. */
export function frameFor(surfaces: { label: string; hull?: Pt[][]; group?: string }[], W: number, H: number): Frame {
  const cx = W / 2
  type Cand = { q: [Pt, Pt, Pt, Pt]; a: number; wall: boolean; vp: Pt | null }
  const cands: Cand[] = []
  for (const s of surfaces) {
    const g = s.group ?? ''
    if (/^(Floor|Ceiling|Countertops|Other|Trim & Moulding)$/.test(g)) continue
    for (const poly of s.hull ?? []) {
      const q = quadCorners(poly, W, H); if (!q) continue
      const [tl, tr, br, bl] = q
      const top: Line = { a: tl, b: tr }, bottom: Line = { a: bl, b: br }
      const slope = (l: Line) => Math.atan2(l.b.y - l.a.y, l.b.x - l.a.x)
      let vp = Math.abs(slope(top) - slope(bottom)) > (2.5 * Math.PI) / 180 ? cross(top, bottom) : null
      if (vp && !(vp.y > 0.2 * H && vp.y < 0.75 * H && (vp.x < Math.min(tl.x, bl.x) - 10 || vp.x > Math.max(tr.x, br.x) + 10) && Math.abs(vp.x - cx) < 12 * W)) vp = null
      cands.push({ q, a: area(q), wall: /Walls|Feature Walls|Panelling/.test(g), vp })
    }
  }
  const ranked = cands.sort((a, b) => Number(b.wall) - Number(a.wall) || b.a - a.a)
  const first = ranked.find((c) => c.vp && c.a > 0.02 * W * H)
  if (first?.vp) {
    const x1 = first.vp.x, other = ranked.find((c) => c !== first && c.vp && Math.sign(c.vp.x - cx) !== Math.sign(x1 - cx) && c.a > 0.015 * W * H)
    if (other?.vp) {
      const f2 = -(x1 - cx) * (other.vp.x - cx)
      const f = Math.max(0.3 * W, Math.min(1.2 * W, Math.sqrt(Math.max(1, f2))))
      return { W, H, yh: Math.max(0.25 * H, Math.min(0.7 * H, (first.vp.y + other.vp.y) / 2)), x1, x2: other.vp.x, f, cx }
    }
    const f = 0.55 * W, d = x1 - cx
    return { W, H, yh: Math.max(0.25 * H, Math.min(0.7 * H, first.vp.y)), x1, x2: Math.max(-3 * W, Math.min(4 * W, cx - (f * f) / (Math.abs(d) < 1 ? 1 : d))), f, cx }
  }
  const front = ranked[0]
  if (!front) return { W, H, yh: 0.45 * H, x1: null, x2: cx, f: 0.55 * W, cx }
  const [tl, tr, br, bl] = front.q
  const tall = br.y - tr.y > bl.y - tl.y ? { t: tr, b: br } : { t: tl, b: bl }
  const eye = tall.b.y - (CAMERA_M / CEILING_M) * (tall.b.y - tall.t.y)
  return { W, H, yh: Math.max(0.25 * H, Math.min(0.65 * H, eye)), x1: null, x2: (tl.x + tr.x + br.x + bl.x) / 4, f: 0.55 * W, cx }
}

/** Plane coordinates (metres) of a pixel on a level surface `heightM` up — the floor (0), a worktop (~0.9), the ceiling (2.7): [a along
    the back wall, b square to it], or null too close to the horizon (or on the wrong side of it). */
export function planeAt(fr: Frame, x: number, y: number, heightM = 0): [number, number] | null {
  const above = heightM > CAMERA_M
  const dy = above ? fr.yh - y : y - fr.yh
  if (dy < 0.012 * fr.H) return null
  const h = Math.max(0.1, Math.abs(heightM - CAMERA_M))   // the plane's distance from the eye
  const ref = above ? fr.yh : fr.H - fr.yh                  // the reference row (the photo's bottom, or top) below / above the horizon
  const k = h / ref                                         // metres per pixel along the reference row
  const s = ref / dy
  if (fr.x1 === null) return [(x - fr.x2) * s * k, (s - 1) * fr.f * k]   // one point: across · into the room
  const xa = fr.x2 + (x - fr.x2) * s, xb = fr.x1 + (x - fr.x1) * s     // where the pixel's lines through each vanishing point cross the reference row
  const ca = Math.abs(fr.x1 - fr.cx) / Math.hypot(fr.x1 - fr.cx, fr.f), cb = Math.abs(fr.x2 - fr.cx) / Math.hypot(fr.x2 - fr.cx, fr.f)
  return [xa * k * ca, xb * k * Math.max(0.05, cb)]
}
/** A floor, a worktop or a ceiling: the tile `tileM` metres square, laid on the plane `heightM` up. */
export function planeMap(fr: Frame, tileM: number, heightM = 0): TexMap {
  return (x, y) => { const g = planeAt(fr, x, y, heightM); return g ? [g[0] / tileM, g[1] / tileM] : null }
}

/** A homography from the unit square onto a quad (Heckbert) and its inverse, as 3 × 3 row-major. */
function squareToQuad(q: [Pt, Pt, Pt, Pt]): number[] {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  let g = 0, h = 0
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den }
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x, p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h, 1]
}
function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m as [number, number, number, number, number, number, number, number, number]
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]
}
/** Real metres per pixel along an upright edge whose foot (or head) is at `y`: from the floor plane below the horizon, the ceiling above. */
function pxPerMetre(fr: Frame, yFoot: number, yHead: number): number {
  if (yFoot - fr.yh > 0.03 * fr.H) return (yFoot - fr.yh) / CAMERA_M
  if (fr.yh - yHead > 0.03 * fr.H) return (fr.yh - yHead) / (CEILING_M - CAMERA_M)
  return (0.35 * fr.H) / CEILING_M
}
/** An upright quad (a wall, a cabinet run): the tile through the quad's perspective, `tileM` metres square. */
export function quadMap(poly: Pt[], fr: Frame, tileM: number): TexMap | null {
  const q = quadCorners(poly, fr.W, fr.H)
  if (!q) return null
  const [tl, tr, br, bl] = q
  const inv = invert3(squareToQuad(q))
  /* its real size: the height from the nearer (taller) edge; the width from where its foot (or head) lies on the floor (or ceiling) */
  const nearRight = br.y - tr.y >= bl.y - tl.y
  const ppm = nearRight ? pxPerMetre(fr, br.y, tr.y) : pxPerMetre(fr, bl.y, tl.y)
  const realH = Math.max(0.2, (nearRight ? br.y - tr.y : bl.y - tl.y) / ppm)
  let realW: number | null = null
  const onFloor = Math.min(bl.y, br.y) - fr.yh > 0.03 * fr.H, onCeiling = fr.yh - Math.max(tl.y, tr.y) > 0.03 * fr.H
  const a = onFloor ? planeAt(fr, bl.x, bl.y, 0) : onCeiling ? planeAt(fr, tl.x, tl.y, CEILING_M) : null
  const b = onFloor ? planeAt(fr, br.x, br.y, 0) : onCeiling ? planeAt(fr, tr.x, tr.y, CEILING_M) : null
  if (a && b) realW = Math.hypot(a[0] - b[0], a[1] - b[1])
  if (!realW || !Number.isFinite(realW) || realW < 0.1) realW = realH * (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / Math.max(1, (br.y - tr.y) + (bl.y - tl.y))
  const rx = realW / tileM, ry = realH / tileM
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = inv as [number, number, number, number, number, number, number, number, number]
  return (x, y) => {
    const w = m6 * x + m7 * y + m8
    if (Math.abs(w) < 1e-12) return null
    const u = (m0 * x + m1 * y + m2) / w, v = (m3 * x + m4 * y + m5) / w
    if (u < -0.25 || u > 1.25 || v < -0.25 || v > 1.25) return null
    return [u * rx, v * ry]
  }
}

/** Bilinear read of one level at tile coordinates (repeats). */
function readLevel(lv: { lab: Float32Array; w: number; h: number }, u: number, v: number, k: number): number {
  const w = lv.w, h = lv.h, fu = (u - Math.floor(u)) * w - 0.5, fv = (v - Math.floor(v)) * h - 0.5
  const x0 = Math.floor(fu), y0 = Math.floor(fv), tx = fu - x0, ty = fv - y0
  const X0 = ((x0 % w) + w) % w, X1 = (((x0 + 1) % w) + w) % w, Y0 = ((y0 % h) + h) % h, Y1 = (((y0 + 1) % h) + h) % h
  const L = lv.lab
  return (L[(Y0 * w + X0) * 3 + k]! * (1 - tx) + L[(Y0 * w + X1) * 3 + k]! * tx) * (1 - ty) + (L[(Y1 * w + X0) * 3 + k]! * (1 - tx) + L[(Y1 * w + X1) * 3 + k]! * tx) * ty
}
/** The tile's colour (Lab) at a pixel, written into `out`: the mip level the pixel spans, blended between the two nearest (trilinear); a
    pixel spanning more than the whole tile takes its average. */
export function sampleTexture(t: Texture, x: number, y: number, out: Float32Array): boolean {
  const c = t.map(x, y)
  if (!c) return false
  const cx = t.map(x + 1, y), cy = t.map(x, y + 1)
  let foot = 1
  if (cx) foot = Math.max(foot, Math.hypot((cx[0] - c[0]) * t.tw, (cx[1] - c[1]) * t.th))
  if (cy) foot = Math.max(foot, Math.hypot((cy[0] - c[0]) * t.tw, (cy[1] - c[1]) * t.th))
  const mips = t.mips ?? [{ lab: t.lab, w: t.tw, h: t.th }]
  const lod = Math.min(mips.length - 1, Math.max(0, Math.log2(foot))), l0 = Math.floor(lod), l1 = Math.min(mips.length - 1, l0 + 1), f = lod - l0
  const beyond = Math.min(1, Math.max(0, (foot - t.tw) / t.tw))   // a pixel wider than the tile: its average
  for (let k = 0; k < 3; k++) {
    const a = readLevel(mips[l0]!, c[0], c[1], k), b = l1 !== l0 ? readLevel(mips[l1]!, c[0], c[1], k) : a
    const v = a + (b - a) * f
    out[k] = v + (t.mean[k]! - v) * beyond
  }
  return true
}
