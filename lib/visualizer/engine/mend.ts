import { featherMask, spreadMask } from './recolor'
import { hash2, type Img, type Pt } from './pixels'
import { polygonMask } from './segment'

/* AI Visualizer engine (wave E, F181 · F028) — mending what a piece taken out had hidden, when the empty plate can't show it: the rest of
   a rug that ran on under the sofa, laid in the rug's own perspective from its own weave (`weaveFill`). Pure, like the rest of the engine. */

/** A flat thing lying on the floor, by its four corners (0…1): back-left, back-right, front-right, front-left — a rug in perspective. */
export type Plane = [Pt, Pt, Pt, Pt]

/** The unit square ↔ the picture (pixels) through a plane's four corners: (0,0) back-left … (0,1) front-left. */
export function planeMap(plane: Plane, W: number, H: number): { fwd: (u: number, v: number) => Pt; inv: (x: number, y: number) => Pt } {
  const [p0, p1, p2, p3] = plane.map((p) => ({ x: p.x * W, y: p.y * H })) as [Pt, Pt, Pt, Pt]
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x, sy = p0.y - p1.y + p2.y - p3.y
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y
  /* the inverse: the adjugate of [[a b c] [d e f] [g h 1]] */
  const A = e - f * h, B = c * h - b, C = b * f - c * e, D = f * g - d, E = a - c * g, F = c * d - a * f, G = d * h - e * g, Hh = b * g - a * h, I = a * e - b * d
  return {
    fwd: (u, v) => { const z = g * u + h * v + 1; return { x: (a * u + b * v + c) / z, y: (d * u + e * v + f) / z } },
    inv: (x, y) => { const z = G * x + Hh * y + I; return { x: (A * x + B * y + C) / z, y: (D * x + E * y + F) / z } },
  }
}
const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y)
const luma = (d: Uint8ClampedArray, p: number) => 0.299 * d[p]! + 0.587 * d[p + 1]! + 0.114 * d[p + 2]!
/** A normalised blur: the mean of `v` over where `w` is set, around each pixel (two box passes of radius r). */
function blurOver(v: Float32Array, w: Float32Array, W: number, H: number, r: number, far?: number): Float32Array {
  const vw = new Float32Array(v.length); for (let i = 0; i < v.length; i++) vw[i] = v[i]! * w[i]!
  const a = featherMask(featherMask(vw, W, H, r), W, H, r), b = featherMask(featherMask(w, W, H, r), W, H, r), o = new Float32Array(v.length)
  /* `far` — what a pixel beyond the blur's reach takes, eased into (never a hard edge where the reach ends) */
  if (far !== undefined) { for (let i = 0; i < v.length; i++) o[i] = (a[i]! + 0.03 * far) / (b[i]! + 0.03); return o }
  for (let i = 0; i < v.length; i++) o[i] = b[i]! > 1e-4 ? a[i]! / b[i]! : 0
  return o
}

/** A separable box blur, `rx` across and `ry` down (clamped at the edges). */
function boxXY(m: Float32Array, W: number, H: number, rx: number, ry: number): Float32Array {
  const tmp = new Float32Array(m.length), out = new Float32Array(m.length), sx = 2 * rx + 1, sy = 2 * ry + 1
  for (let y = 0; y < H; y++) { let acc = 0; for (let x = -rx; x <= rx; x++) acc += m[y * W + Math.min(W - 1, Math.max(0, x))]!; for (let x = 0; x < W; x++) { tmp[y * W + x] = acc / sx; acc += m[y * W + Math.min(W - 1, x + rx + 1)]! - m[y * W + Math.max(0, x - rx)]! } }
  for (let x = 0; x < W; x++) { let acc = 0; for (let y = -ry; y <= ry; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]!; for (let y = 0; y < H; y++) { out[y * W + x] = acc / sy; acc += tmp[Math.min(H - 1, y + ry + 1) * W + x]! - tmp[Math.max(0, y - ry) * W + x]! } }
  return out
}

export type WeaveOpts = {
  /** The picture before the plate went on — what shows of the piece is read off it, and a soft edge of what is laid blends with it. */
  under: Img
  /** The room's empty plate as laid — its floor's light tells the lifted piece's shade on what shows of the rug from the rug's own light. */
  plate: Img
  /** Where the plate went over it with nothing kept in front (0…1) — what is laid. */
  reach: Float32Array
  /** (wave F) The shade pieces that stay cast on it (a table's, traced) — they shade what is laid themselves, so it is never taken as the
      rug's own tone. */
  shaded?: Float32Array
}
/** (wave E) Lays a flat piece's hidden part (a rug under a sofa taken out) from its own weave, in its own perspective: the piece is
    unwarped onto its plane, its weave (the photo over its own colour close by) is quilted into the hidden part block by block — each
    block the best match of what already shows around it, joined along the seam where the two agree best — then laid back through the
    plane from the photo's own pixels, in the rug's colour at that depth where it shows clear. What still shows next to it (the rug the
    sofa shaded) comes up to the rug's own light and eases into the laid part across a few pixels, so the sofa's shade goes with the sofa
    and no line marks where it stood; the rug's edge where it was hidden gets the thin dark line its edges draw where they show. A sliver
    (the rim of a piece beside it) is left as the photo shows it. `own` — the piece's outline; `hole` — what to lay (0…1); `blocked` — what
    stands in front of it and never gives its pixels. */
export function weaveFill(dst: Img, own: Float32Array, hole: Float32Array, blocked: Float32Array | undefined, plane: Plane, o: WeaveOpts): void {
  /* (wave F) what shows of it is read off the picture as it was before this plate went on (`under`) — a part laid when another piece
     came out earlier in the same Generate is the rug too */
  const W = dst.width, H = dst.height, n = W * H, D = dst.data, U = o.under.data, P = o.plate.data, S = U
  /* what shows of the piece, and how far each pixel of it lies from what is hidden */
  const shows = new Float32Array(n), hidden = new Float32Array(n)
  for (let i = 0; i < n; i++) { if (own[i]! > 0.5 && hole[i]! <= 0.02 && (!blocked || blocked[i]! <= 0.02)) shows[i] = 1; if (hole[i]! > 0.02) hidden[i] = 1 }
  let any = 0; for (let i = 0; i < n; i++) if (hidden[i] && own[i]! > 0.5) any++
  if (!any) return
  /* only a sliver along what was lifted (its rim brushed the rug's edge — a fig's saucer by its corner): the rug there is as the photo
     shows it */
  if (any < Math.max(200, n / 400)) { for (let i = 0; i < n; i++) { const h = Math.min(1, hole[i]!) * Math.min(1, own[i]!); if (h > 0.002) for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c]! + (U[i * 4 + c]! - D[i * 4 + c]!) * h } return }
  const near = featherMask(featherMask(hidden, W, H, Math.max(4, Math.round(W / 40))), W, H, Math.max(4, Math.round(W / 40)))   // > 0 within ~45 px of it
  /* a band of what shows along the hidden part (1…BAND px out): quilted too, so the laid weave can fade into the photo's across it */
  const BAND = Math.max(4, Math.round(W / 90)), band = new Uint8Array(n)
  /* how far each pixel lies from the hidden part (a chamfer distance, in pixels) */
  const away = new Float32Array(n).fill(1e9)
  for (let i = 0; i < n; i++) if (hidden[i]) away[i] = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) away[i] = Math.min(away[i]!, away[i - 1]! + 1); if (y) away[i] = Math.min(away[i]!, away[i - W]! + 1) }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) away[i] = Math.min(away[i]!, away[i + 1]! + 1); if (y < H - 1) away[i] = Math.min(away[i]!, away[i + W]! + 1) }
  for (let i = 0; i < n; i++) if (shows[i] && away[i]! >= 1 && away[i]! <= BAND) band[i] = away[i]!
  /* the plate floor's light (blurred wide: no boards), and the piece's light close up — its mottling and any shade on it */
  const Ls = new Float32Array(n), Lp = new Float32Array(n), one = new Float32Array(n).fill(1)
  for (let i = 0; i < n; i++) { Ls[i] = luma(S, i * 4) + 4; Lp[i] = luma(P, i * 4) + 4 }
  const floor = blurOver(Lp, one, W, H, Math.max(12, Math.round(W / 16))), local = blurOver(Ls, shows, W, H, Math.max(4, Math.round(W / 75)))
  /* the piece's light against the floor's where it shows clear of what was lifted — one ratio for the whole piece */
  const ratio = (L: Float32Array) => {
    const ks: number[] = []
    for (let i = 0; i < n; i += 2) if (shows[i]! && near[i]! < 0.001 && L[i]! > 0) ks.push(L[i]! / floor[i]!)
    if (ks.length < 50) for (let i = 0; i < n; i += 2) if (shows[i]! && L[i]! > 0) ks.push(L[i]! / floor[i]!)
    ks.sort((p, q) => p - q)
    return ks.length ? ks[Math.floor(ks.length / 2)]! : 0
  }
  const k0 = ratio(local)
  if (!k0) return
  /* its weave: the photo over its own colour close by, channel by channel — the ribs and the small flecks, never a block's broader cast
     (a sunlit tan beside a shaded grey reads as a patchwork) */
  const r = Math.max(8, Math.round(W / 40)), alb = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  const nearC: Float32Array[] = [], fineC: Float32Array[] = []
  for (let c = 0; c < 3; c++) {
    const v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = S[i * 4 + c]! + 4
    const near_ = blurOver(v, shows, W, H, r)
    for (let i = 0; i < n; i++) if (shows[i]) alb[c]![i] = v[i]! / (near_[i]! || 1)
    nearC.push(near_)
    /* (wave F) …and its light close up (over a few ribs): the light the laid part meets at the join is the light right there */
    fineC.push(blurOver(v, shows, W, H, Math.max(3, Math.round(W / 150))))
  }
  /* the piece unwarped onto its plane: about a pixel of it per pixel of the photo where it lies nearest */
  const map = planeMap(plane, W, H), [p0, p1, p2, p3] = plane.map((p) => ({ x: p.x * W, y: p.y * H })) as [Pt, Pt, Pt, Pt]
  const RU = Math.min(900, Math.max(16, Math.round(Math.max(dist(p0, p1), dist(p3, p2))))), RV = Math.min(900, Math.max(16, Math.round(Math.max(dist(p0, p3), dist(p1, p2)))))
  const rn = RU * RV, R = [new Float32Array(rn), new Float32Array(rn), new Float32Array(rn)]
  const known = new Uint8Array(rn), clean = new Uint8Array(rn), need = new Uint8Array(rn)
  /* a source clear of the lifted piece, out of any shade, and a few pixels in from its outline (never its edge line or the floor) */
  const inside = (p: number) => { const x = p % W, y = (p - x) / W; return x > 2 && y > 2 && x < W - 3 && y < H - 3 && own[p - 2]! > 0.5 && own[p + 2]! > 0.5 && own[p - 2 * W]! > 0.5 && own[p + 2 * W]! > 0.5 }
  const clean_ = (p: number) => near[p]! < 0.001 && local[p]! > 0.8 * k0 * floor[p]! && inside(p)
  /* (wave F) a source for the weave may lie close to the hidden part (just past the band that fades into it): a rug's ribs turn across
     it (they run at another angle by the far side than by the sofa), so the weave laid by the join comes from the rug beside the join —
     never from a shade on it (a standing piece's, or the band the sofa threw): a block cut from a shade lays a darker slab */
  const source_ = (p: number) => away[p]! > BAND + 2 && local[p]! > 0.8 * k0 * floor[p]! && inside(p) && (!o.shaded || o.shaded[p]! < 0.5)
  /* the colour it lies in where it was hidden: its own colour at the same depth where it shows clear (the rug's rows run across the
     room) — the laid part is the rug as the rest of it reads, never the plate's brighter floor; the light on it is read beside it (below) */
  const rows: number[][][] = Array.from({ length: RV }, () => [])
  for (let j = 0; j < RV; j++) for (let i = 0; i < RU; i++) {
    const q = map.fwd((i + 0.5) / RU, (j + 0.5) / RV), x = Math.round(q.x - 0.5), y = Math.round(q.y - 0.5)
    if (x < 0 || y < 0 || x >= W || y >= H) continue
    const p = y * W + x, t = j * RU + i
    if (hidden[p] || band[p]) need[t] = 1
    else if (shows[p]) {
      known[t] = 1
      if (source_(p)) clean[t] = 1
      if (clean_(p)) rows[j]!.push([nearC[0]![p]!, nearC[1]![p]!, nearC[2]![p]!])
      /* bilinear over the pixels that show */
      const fx = q.x - 0.5, fy = q.y - 0.5, x0 = Math.max(0, Math.min(W - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(H - 2, Math.floor(fy))), tx = fx - x0, ty = fy - y0
      let wsum = 0; const acc = [0, 0, 0]
      for (const [dx, dy, wt] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]] as const) {
        const pp = (y0 + dy) * W + x0 + dx
        if (!shows[pp] || wt <= 0) continue
        wsum += wt; for (let c = 0; c < 3; c++) acc[c] = acc[c]! + alb[c]![pp]! * wt
      }
      for (let c = 0; c < 3; c++) R[c]![t] = wsum > 0 ? acc[c]! / wsum : alb[c]![p]!
    }
  }
  /* each row's colour — its lighter half (a shade across part of a row is not the rug's colour), over a few rows either side; a row with
     none of it clear takes the nearest that has */
  const sm = Math.max(2, Math.round(RV / 20))
  const toneOf = (src: number[][][], lo0: number, hi0: number) => {
    const tn = [new Float32Array(RV), new Float32Array(RV), new Float32Array(RV)]
    for (let j = 0; j < RV; j++) {
      const pool: number[][] = []
      for (let jj = Math.max(0, j - sm); jj <= Math.min(RV - 1, j + sm); jj++) pool.push(...src[jj]!)
      if (pool.length < 20) continue
      pool.sort((p, q) => p[0]! + p[1]! + p[2]! - (q[0]! + q[1]! + q[2]!))
      const lo = Math.floor(pool.length * lo0), hi = Math.max(lo + 1, Math.floor(pool.length * hi0))
      for (let c = 0; c < 3; c++) { let t = 0; for (let q = lo; q < hi; q++) t += pool[q]![c]!; tn[c]![j] = t / (hi - lo) }
    }
    if (!tn[0]!.some((v) => v > 0)) return null
    for (let pass = 0; pass < 2; pass++) for (let j0 = 0; j0 < RV; j0++) { const j = pass ? RV - 1 - j0 : j0, pj = pass ? j + 1 : j - 1; if (tn[0]![j]! || pj < 0 || pj >= RV || !tn[0]![pj]) continue; for (let c = 0; c < 3; c++) tn[c]![j] = tn[c]![pj]! }
    return tn
  }
  /* (wave F) the rug's one colour, as it reads beside the hidden part (its middle, the shade beside the throw in it, a standing piece's
     own shade left out): a jute rug is one colour, the light on it varies — a colour per row carried along the rug's rows printed the
     shade at its visible end as a slanted band across the laid part; the light is carried in the picture instead (below). Where too
     little of it shows beside the hidden part, its colour row by row where it shows clear */
  const M = Math.max(40, Math.round(W / 9))
  const lightSample = (i: number) => shows[i]! > 0 && away[i]! <= BAND + 2 + M && inside(i) && (!o.shaded || o.shaded[i]! < 0.5)
  const beside: number[][] = []
  for (let i = 0; i < n; i++) if (lightSample(i)) beside.push([nearC[0]![i]!, nearC[1]![i]!, nearC[2]![i]!])
  let tone: Float32Array[] | null
  if (beside.length >= 50) {
    beside.sort((p, q) => p[0]! + p[1]! + p[2]! - (q[0]! + q[1]! + q[2]!))
    const lo = Math.floor(beside.length * 0.4), hi = Math.max(lo + 1, Math.floor(beside.length * 0.6))
    tone = [0, 1, 2].map((c) => { let t = 0; for (let q = lo; q < hi; q++) t += beside[q]![c]!; return new Float32Array(RV).fill(t / (hi - lo)) })
  } else tone = toneOf(rows, 0.5, 0.8)
  if (!tone) return
  const from = quilt(R, known, clean, need, RU, RV)
  if (!from) return
  /* the weave at a point of the photo, read over the pixels of it that show */
  const weave = (px: number, py: number, out: number[]) => {
    const fx = px - 0.5, fy = py - 0.5, x0 = Math.max(0, Math.min(W - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(H - 2, Math.floor(fy))), tx = Math.min(1, Math.max(0, fx - x0)), ty = Math.min(1, Math.max(0, fy - y0))
    let ws = 0; out[0] = 0; out[1] = 0; out[2] = 0
    for (const [dx, dy, wt] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]] as const) {
      const pp = (y0 + dy) * W + x0 + dx
      if (!shows[pp] || wt <= 0) continue
      ws += wt; for (let c = 0; c < 3; c++) out[c] = out[c]! + alb[c]![pp]! * wt
    }
    if (ws <= 0) return false
    for (let c = 0; c < 3; c++) out[c] = out[c]! / ws
    return true
  }
  const wv = [0, 0, 0]
  /* the laid weave at a pixel: from where its quilted block came from — the photo's own pixels, read at full sharpness through the plane
     (never the raster resampled twice) */
  const rowOf = new Int16Array(n), weaveAt = (i: number) => {
    const x = i % W, y = (i - x) / W, uv = map.inv(x + 0.5, y + 0.5)
    const fu = Math.min(RU - 1, Math.max(0, uv.x * RU - 0.5)), fv = Math.min(RV - 1, Math.max(0, uv.y * RV - 0.5))
    const cu = Math.round(fu), cv = Math.round(fv), t = cv * RU + cu, q = from.src[t]!
    rowOf[i] = cv
    let ok = false
    if (q >= 0) {
      const qu = q % RU, qv = (q - qu) / RU, su = qu + (fu - cu), sv = qv + (fv - cv)
      const sp = map.fwd((su + 0.5) / RU, (sv + 0.5) / RV)
      ok = weave(sp.x, sp.y, wv)
    }
    if (!ok) for (let c = 0; c < 3; c++) wv[c] = R[c]![t]!
  }
  /* (wave F) …its blocks evened out: each block brings its ribs and flecks, never the brightness of where it was cut from (a block cut
     from the rug's shaded corner laid as a darker slab along its front) — the weave's own light over ~20 px is taken out, the rug's
     colour and the light it lies in (below) put it back */
  const laidW = new Float32Array(n), aw = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], aL = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (!((hidden[i] && own[i]! > 0.02) || band[i])) continue
    weaveAt(i)
    laidW[i] = 1
    for (let c = 0; c < 3; c++) aw[c]![i] = wv[c]!
    aL[i] = 0.299 * wv[0]! + 0.587 * wv[1]! + 0.114 * wv[2]!
  }
  const lowA = blurOver(aL, laidW, W, H, Math.max(6, Math.round(W / 45)))
  const valRaw = (i: number, out: number[]) => {
    const f = lowA[i]! > 0.05 ? 1 / lowA[i]! : 1, cv = rowOf[i]!
    for (let c = 0; c < 3; c++) out[c] = Math.min(255, Math.max(0, aw[c]![i]! * f * tone[c]![cv]! - 4))
  }
  /* (wave F) …and the light it lies in: the light the rug has BESIDE the hidden part (its colour there against its own colour at that
     depth — the shade beside the throw, the window's light at its far end), read over the rug that shows within M px of it and carried
     into the laid part the way light falls, in the picture (a shade runs on across where the sofa stood as it lies, never along the rug's
     rows), fading over FADE px into the rug's own colour at its depth. Never a standing piece's own shade (the table's, traced — that one
     shades what is laid itself). At the join the laid rug is the rug beside it, in tone and colour: no lighter patch, no step */
  const FADE = Math.max(24, Math.round(W / 6))
  const inward = new Float32Array(n).fill(1e9)   // how far into the hidden part from the rug that shows
  for (let i = 0; i < n; i++) if (shows[i]) inward[i] = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) inward[i] = Math.min(inward[i]!, inward[i - 1]! + 1); if (y) inward[i] = Math.min(inward[i]!, inward[i - W]! + 1) }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) inward[i] = Math.min(inward[i]!, inward[i + 1]! + 1); if (y < H - 1) inward[i] = Math.min(inward[i]!, inward[i + W]! + 1) }
  const lw = new Float32Array(n), gain = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  for (let i = 0; i < n; i++) {
    if (!lightSample(i)) continue
    const x = i % W, y = (i - x) / W, uv = map.inv(x + 0.5, y + 0.5), j = Math.min(RV - 1, Math.max(0, Math.round(uv.y * RV - 0.5)))
    lw[i] = 1
    for (let c = 0; c < 3; c++) gain[c]![i] = fineC[c]![i]! / (tone[c]![j]! || 1) - 1
  }
  /* read over reaches that double, each three times wider than tall: a shade lies across the picture as the light throws it, so it is
     carried in along the picture's rows and keeps its height. The near reach weighs most — by the join the laid rug is the rug beside it
     (no step where two laid parts meet, nor at the join), further in the wider reaches take over with the shading's mean; one smooth
     field, never a reach's edge showing as a line across the laid rug */
  const rs = Math.max(3, Math.round(W / 150)), reaches = [rs, rs * 2, rs * 4, rs * 8, rs * 16], weightOf = (k: number) => 0.35 ** k
  const blur2 = (f: Float32Array, r: number) => { const ry = Math.max(2, Math.round(r / 3)); return boxXY(boxXY(f, W, H, r, ry), W, H, r, ry) }
  const Bsum = new Float32Array(n)
  reaches.forEach((r, k) => { const b = blur2(lw, r), wk = weightOf(k); for (let i = 0; i < n; i++) Bsum[i] = Bsum[i]! + b[i]! * wk })
  const lightF = gain.map((d) => {
    const dw = new Float32Array(n); for (let i = 0; i < n; i++) dw[i] = d[i]! * lw[i]!
    const A = new Float32Array(n)
    reaches.forEach((r, k) => { const a = blur2(dw, r), wk = weightOf(k); for (let i = 0; i < n; i++) A[i] = A[i]! + a[i]! * wk })
    /* where little of the rug that shows is within reach (far from it, or below a thin strip of it), the light eases back to none — the
       field never ends at a reach's edge as a step */
    const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = A[i]! / Math.max(0.004, Bsum[i]!)
    return out
  })
  const valAt = (i: number, out: number[]) => {
    valRaw(i, out)
    const k = band[i] ? 1 : hidden[i] ? Math.max(0, 1 - inward[i]! / FADE) : 0
    if (k <= 0) return
    const s = k * k * (3 - 2 * k)
    for (let c = 0; c < 3; c++) out[c] = Math.min(255, Math.max(0, (out[c]! + 4) * (1 + lightF[c]![i]! * s) - 4))
  }
  const val = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    const h = Math.min(1, hole[i]!)
    if (h <= 0.002 || own[i]! <= 0.02) continue
    valAt(i, val)
    const cov = Math.min(1, own[i]!), a = Math.min(1, o.reach[i]!)
    for (let c = 0; c < 3; c++) {
      const laid = U[i * 4 + c]! + (val[c]! - U[i * 4 + c]!) * Math.max(h, a)
      D[i * 4 + c] = D[i * 4 + c]! + (laid - D[i * 4 + c]!) * cov
    }
  }
  const laidOnly = new Float32Array(n); for (let i = 0; i < n; i++) if (hidden[i] && own[i]! > 0.5) laidOnly[i] = 1
  /* the join itself: across a few pixels of what shows beside it, the laid weave fades into the photo's — no straight line where the
     lifted piece's outline ran; a standing piece's shade there stays the photo's own (no lighter sliver between two shades) */
  for (let i = 0; i < n; i++) {
    const d = band[i]!
    if (!d || (o.shaded && o.shaded[i]! > 0.5)) continue
    valAt(i, val)
    const w = Math.max(0, 1 - d / (BAND + 1)) * 0.85
    for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c]! + (val[c]! - D[i * 4 + c]!) * w
  }
  /* its edge where it was hidden: the thin dark line a rug's side draws on the floor, as along the edges that show */
  const sides: [Pt, Pt][] = [[p0, p1], [p1, p2], [p2, p3], [p3, p0]], byLaid = spreadMask(laidOnly, W, H, 3)
  for (let i = 0; i < n; i++) {
    const a = Math.min(1, o.reach[i]!) * byLaid[i]!   // only along an edge that was laid — an edge that shows keeps its own line
    if (a <= 0.02) continue
    const x = i % W + 0.5, y = (i - (i % W)) / W + 0.5
    let dmin = 9
    for (const [e0, e1] of sides) {
      const ex = e1.x - e0.x, ey = e1.y - e0.y, L2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((x - e0.x) * ex + (y - e0.y) * ey) / L2))
      const d = Math.hypot(x - (e0.x + ex * t), y - (e0.y + ey * t))
      if (d < dmin) dmin = d
    }
    if (dmin > 3) continue
    /* the line sits on the outline, a touch outside */
    const inside = own[i]! > 0.5, dd = inside ? dmin + 0.4 : Math.max(0, dmin - 0.4)
    const f = 1 - 0.36 * Math.exp(-(dd * dd) / 0.7) * a
    for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c]! * f
  }
}

/** Quilting on a plane (Efros–Freeman): `need` filled block by block from `clean` blocks of the same raster, in rows, each row from the
    side the piece shows on — each block the best match (within a hair, picked evenly by position) of everything already set under it,
    joined to the blocks before it along the seam where the two agree best (a cheapest path through their overlap), never over the
    photo's own pixels. A block along the front or the back edge copies the same rows (the rug at the same depth). */
function quilt(R: Float32Array[], known: Uint8Array, clean: Uint8Array, need: Uint8Array, w: number, h: number): { src: Int32Array } | null {
  const B = Math.max(10, Math.min(44, Math.round(Math.min(w, h) / 3.3))), O = Math.max(3, Math.round(B / 3)), step = B - O, E = Math.max(3, Math.round(B / 3)), D0 = Math.max(2 * B, w / 5)
  if (w < B || h < B) return null
  /* an integral image of `clean`: a block is a source when all of it is clean */
  const I = new Int32Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += clean[y * w + x]!; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1]! + s } }
  const cleanBlock = (x: number, y: number) => x >= 0 && y >= 0 && x + B <= w && y + B <= h && I[(y + B) * (w + 1) + x + B]! - I[y * (w + 1) + x + B]! - I[(y + B) * (w + 1) + x]! + I[y * (w + 1) + x]! === B * B
  const free: [number, number][] = []
  for (let y = 0; y + B <= h; y += 2) for (let x = 0; x + B <= w; x += 2) if (cleanBlock(x, y)) free.push([x, y])
  if (!free.length) return null
  /* rows from the side the piece shows on: the first block of a row matches the photo's own */
  let kl = 0, kr = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (known[y * w + x]) { if (x < w / 2) kl++; else kr++ }
  const rtl = kr > kl
  const xs: number[] = [], ys: number[] = []
  for (let x = 0; ; x += step) { xs.push(Math.min(x, w - B)); if (x + B >= w) break }
  for (let y = 0; ; y += step) { ys.push(Math.min(y, h - B)); if (y + B >= h) break }
  if (rtl) xs.reverse()
  const set = new Uint8Array(known)   // 1 — the photo's own; 2 — laid by a block
  /* where each pixel's weave comes from (its own, for the photo's) — the lay-back reads the photo there */
  const src = new Int32Array(w * h).fill(-1)
  for (let t = 0; t < w * h; t++) if (known[t]) src[t] = t
  const [R0, R1, R2] = R as [Float32Array, Float32Array, Float32Array]
  const nw = new Float32Array(3 * B * B), cost = new Float32Array(B * B), take = new Uint8Array(B * B)
  for (const ty of ys) for (const tx of xs) {
    let open = false
    for (let yy = ty; yy < ty + B && !open; yy++) for (let xx = tx; xx < tx + B; xx++) if (need[yy * w + xx] && !set[yy * w + xx]) { open = true; break }
    if (!open) continue
    /* the sources this block may take: along an edge, the same edge at the same place; else any clean block */
    type Src = { x: number; y: number }
    let cands: Src[] = []
    if (ty < E || ty + B > h - E) for (let x = 0; x + B <= w; x++) if (cleanBlock(x, ty)) cands.push({ x, y: ty })
    if (!cands.length) cands = free.map(([x, y]) => ({ x, y }))
    const at = (s: Src, xx: number, yy: number) => (yy + s.y) * w + s.x + xx
    /* the error against everything already set in the block (a sparse probe) */
    const probe: number[] = []
    for (let yy = 0; yy < B; yy += 2) for (let xx = (yy >> 1) & 1; xx < B; xx += 2) if (set[(ty + yy) * w + tx + xx]) probe.push(yy * B + xx)
    /* (wave F) nearer sources first: a weave's ribs turn across the piece, so a block copied from close by keeps the angle they run at
       there (the far side of a rug is another angle) — measured from the nearest source, so a block far from any still has a choice */
    const dist = cands.map((s) => Math.hypot(s.x - tx, s.y - ty))
    let dmin = Infinity; for (const d of dist) if (d < dmin) dmin = d
    const err = cands.map((s, ci) => {
      let e = 0
      for (const k of probe) { const q = at(s, k % B, (k / B) | 0), t = (ty + ((k / B) | 0)) * w + tx + (k % B), a = R0[q]! - R0[t]!, b = R1[q]! - R1[t]!, c = R2[q]! - R2[t]!; e += a * a + b * b + c * c }
      const dd = dist[ci]! - dmin
      return (probe.length ? e / probe.length : 0) * (1 + (dd * dd) / (D0 * D0))
    })
    let lo = Infinity; for (const e of err) if (e < lo) lo = e
    const ok = cands.filter((_, i) => err[i]! <= lo * 1.1 + 1e-6)
    const pick = ok[Math.min(ok.length - 1, Math.floor(hash2(tx * 7 + 3, ty * 13 + 5) * ok.length))]!
    for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) {
      const q = at(pick, xx, yy), k = yy * B + xx, t = (ty + yy) * w + tx + xx
      nw[k * 3] = R0[q]!; nw[k * 3 + 1] = R1[q]!; nw[k * 3 + 2] = R2[q]!
      const st = set[t]!
      cost[k] = st ? (nw[k * 3]! - R0[t]!) ** 2 + (nw[k * 3 + 1]! - R1[t]!) ** 2 + (nw[k * 3 + 2]! - R2[t]!) ** 2 : 0
      take[k] = st === 1 ? 0 : 1
    }
    /* the seams with the blocks laid before it: the cheapest path down its side overlap, and along its top one */
    const side = (yy: number, j: number) => (rtl ? B - 1 - j : j) + yy * B   // j-th column into the side overlap, from the block before
    const cut = (len: number, cell: (i: number, j: number) => number) => {
      /* dynamic programming over `len` lines of O cells: the path of least cost, one cell of drift per line */
      const acc = new Float32Array(len * O), from = new Int8Array(len * O)
      for (let i = 0; i < len; i++) for (let j = 0; j < O; j++) {
        const c = cost[cell(i, j)]!
        if (!i) { acc[j] = c; continue }
        let best = acc[(i - 1) * O + j]!, d = 0
        if (j > 0 && acc[(i - 1) * O + j - 1]! < best) { best = acc[(i - 1) * O + j - 1]!; d = -1 }
        if (j < O - 1 && acc[(i - 1) * O + j + 1]! < best) { best = acc[(i - 1) * O + j + 1]!; d = 1 }
        acc[i * O + j] = best + c; from[i * O + j] = d
      }
      const path = new Int8Array(len)
      let j = 0; for (let q = 1; q < O; q++) if (acc[(len - 1) * O + q]! < acc[(len - 1) * O + j]!) j = q
      for (let i = len - 1; i >= 0; i--) { path[i] = j; j += from[i * O + j]! }
      return path
    }
    const sideSet = (() => { for (let yy = 0; yy < B; yy++) if (set[(ty + yy) * w + tx + (rtl ? B - 1 : 0)] === 2) return true; return false })()
    if (sideSet) { const p = cut(B, (i, j) => side(i, j)); for (let yy = 0; yy < B; yy++) for (let j = 0; j < p[yy]!; j++) { const k = side(yy, j); if (set[(ty + yy) * w + tx + (k % B)] === 2) take[k] = 0 } }
    const topSet = (() => { for (let xx = 0; xx < B; xx++) if (set[ty * w + tx + xx] === 2) return true; return false })()
    if (topSet) { const p = cut(B, (i, j) => j * B + i); for (let xx = 0; xx < B; xx++) for (let j = 0; j < p[xx]!; j++) { const k = j * B + xx; if (set[(ty + j) * w + tx + xx] === 2) take[k] = 0 } }
    /* laid, the seam softened by a pixel */
    for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) {
      const k = yy * B + xx, t = (ty + yy) * w + tx + xx
      if (!take[k]) continue
      const edge = set[t] === 2 && ((xx > 0 && !take[k - 1]) || (xx < B - 1 && !take[k + 1]) || (yy > 0 && !take[k - B]) || (yy < B - 1 && !take[k + B]))
      const a = edge ? 0.5 : 1
      R0[t] = R0[t]! + (nw[k * 3]! - R0[t]!) * a; R1[t] = R1[t]! + (nw[k * 3 + 1]! - R1[t]!) * a; R2[t] = R2[t]! + (nw[k * 3 + 2]! - R2[t]!) * a
      src[t] = at(pick, xx, yy)
      if (!set[t]) set[t] = 2
    }
  }
  return { src }
}

/** (wave E) How a hidden part of a piece comes back when what stood in front of it goes — one step on one area (0…1 outlines):
    `rows` / `columns` — continued from what shows of that area beside it, along its rows or down its columns (a seat's front, a post);
    `along` — continued along a line (`line`, two points) from what shows of that area on it (a table top's front edge in perspective;
    `side` — only from the line's end (1) or its start (-1));
    `copy` — copied from the piece itself `from` away (0…1; a leg from the leg that shows); `shade` — whatever is laid there (the plate,
    the rug) taken down to the shadow under the piece (`depth` 0…1; `fade` — deepest at the top, lifting downward; with `soft`, over all
    that was laid — `shadeReach`, the rug's weave too — never over what still shows). `frame` — a part a finish for the whole piece never
    paints (an armchair's wooden post and leg under a new upholstery). */
export type RebuildStep = { how: 'rows' | 'columns' | 'along' | 'copy' | 'shade'; area: Pt[][]; from?: Pt; line?: [Pt, Pt]; side?: 1 | -1; depth?: number; fade?: 'down'; frame?: boolean
  /** (wave F) With `shade`: the shade's colour at full depth, per channel (a shadow on jute is warm, never grey — read off the piece's own
      shadow where the photo shows it), and how soft its edge is in px (only over what is laid). */
  tint?: [number, number, number]; soft?: number
  /** (wave F) With `along`: read off all of the piece that shows along the line, not only its traced area (a table top's lip that shows
      beyond where the throw hung). */
  wide?: boolean }
const polyUnion = (W: number, H: number, ps: Pt[][]) => { const m = new Float32Array(W * H); for (const q of ps) { const pm = polygonMask(W, H, q); for (let i = 0; i < m.length; i++) if (pm[i]! > m[i]!) m[i] = pm[i]! } return m }
/** Runs a piece's rebuild steps where it was hidden (`reach`, 0…1 — where the plate went and nothing kept stands in front), over what is
    laid there now; reads the photo (`src`). Returns where the piece itself was rebuilt (its shade left out). */
export function rebuild(dst: Img, src: Img, reach: Float32Array, steps: RebuildStep[], blocked?: Float32Array, shadeReach?: Float32Array, piece?: Float32Array): Float32Array {
  const W = dst.width, H = dst.height, n = W * H, D = dst.data, S = src.data, made = new Float32Array(n)
  const sample = (x: number, y: number, c: number) => {
    const fx = Math.min(W - 1.001, Math.max(0, x)), fy = Math.min(H - 1.001, Math.max(0, y)), x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, p = (y0 * W + x0) * 4 + c
    return (S[p]! * (1 - tx) + S[p + 4]! * tx) * (1 - ty) + (S[p + W * 4]! * (1 - tx) + S[p + W * 4 + 4]! * tx) * ty
  }
  for (const st of steps) {
    const A = polyUnion(W, H, st.area), E = new Float32Array(n)
    let any = false
    /* an area's edge pixel is the area's in full — two areas traced edge to edge leave no pixel half done between them */
    const full = st.how === 'shade' ? 1 : 2
    for (let i = 0; i < n; i++) { const v = Math.min(1, A[i]! * full) * Math.min(1, reach[i]!); if (v > 0.01) { E[i] = v; any = true } }
    if (!any) continue
    if (st.how === 'shade') {
      /* soft sides, deepest right under the piece */
      /* with `soft`: the area's own edge softened, over all that was laid (never the edge of what was laid showing as a lighter line) */
      const rr = st.soft ?? 2, soft = featherMask(featherMask(st.soft ? A : E, W, H, rr), W, H, rr)
      let y0 = H, y1 = 0; for (let i = 0; i < n; i++) if (E[i]! > 0.01) { const y = (i - (i % W)) / W; if (y < y0) y0 = y; if (y > y1) y1 = y }
      const depth = st.depth ?? 0.5, tint = st.tint ?? [1 - depth, 1 - depth, 1 - depth]
      for (let i = 0; i < n; i++) {
        const w = soft[i]! * (st.soft ? Math.min(1, (shadeReach ?? reach)[i]! * 2) : 1); if (w <= 0.002) continue
        const y = (i - (i % W)) / W, t = st.fade ? Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0))) : 0
        for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c]! * (1 - (1 - tint[c]!) * w * (1 - 0.6 * t))
      }
      continue
    }
    if (st.how !== 'copy') {
      /* the rim of what hid it (a bowl's pale lip, a book's edge) is never what the part is continued from: a couple of pixels more of the
         area are rebuilt too */
      const grown = featherMask(featherMask(E.map((v) => (v > 0.02 ? 1 : 0)), W, H, 1), W, H, 1)
      for (let i = 0; i < n; i++) if (A[i]! > 0.5 && grown[i]! > 0.05 && (!blocked || blocked[i]! <= 0.02)) E[i] = Math.max(E[i]!, Math.min(1, grown[i]! * 3))
    }
    const shows = (i: number) => A[i]! > 0.5 && E[i]! <= 0.02 && (!blocked || blocked[i]! <= 0.02)
    const put = (i: number, v: (c: number) => number) => { const w = Math.min(1, E[i]!); for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c]! + (v(c) - D[i * 4 + c]!) * w; if (!st.frame && Math.min(1, w * 2) > made[i]!) made[i] = Math.min(1, w * 2) }
    if (st.how === 'copy' && st.from) {
      const dx = st.from.x * W, dy = st.from.y * H
      for (let i = 0; i < n; i++) { if (E[i]! <= 0.01) continue; const x = i % W, y = (i - x) / W; put(i, (c) => sample(x + dx, y + dy, c)) }
    } else if (st.how === 'along' && st.line) {
      /* (wave F) read off all of the piece that shows along the line (`piece`, its outline) — the lip left of where the throw hung, not
         only what shows inside the traced area */
      const showsAlong = st.wide && piece ? (i: number) => piece[i]! > 0.5 && Math.min(1, reach[i]!) <= 0.02 && (!blocked || blocked[i]! <= 0.02) : shows
      /* each pixel takes the mean of the first stretch of the area that shows along the line through it — sampled at exactly its own
         offset across the line, so an edge, a rail or a gap runs on straight and crisp (never stepped, never streaked) */
      const ex = (st.line[1].x - st.line[0].x) * W, ey = (st.line[1].y - st.line[0].y) * H, L = Math.hypot(ex, ey) || 1, ux = ex / L, uy = ey / L
      const dirs = st.side ? [st.side] : [1, -1], K = 10
      for (let i = 0; i < n; i++) {
        if (E[i]! <= 0.01) continue
        const x = i % W, y = (i - x) / W
        let best: number[] | null = null, bestT = Infinity
        for (const sg of dirs) {
          const acc = [0, 0, 0]
          let got = 0, first = 0
          for (let t = 1; t < 600 && got < K && (!got || t - first < 3 * K); t++) {
            const px = x + ux * t * sg, py = y + uy * t * sg, xx = Math.round(px), yy = Math.round(py)
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) break
            if (!showsAlong(yy * W + xx)) continue   // a pixel off the line's own row where it steps — the next one on it counts
            if (!got) first = t
            for (let c = 0; c < 3; c++) acc[c] = acc[c]! + sample(px, py, c)
            got++
          }
          if (got && first < bestT) { bestT = first; best = acc.map((v) => v / got) }
        }
        if (best) { const b = best; put(i, (c) => b[c]!) }
      }
    } else {
      /* rows / columns: each run of the hidden area continued from the run of it that shows next to it (mirrored back and forth, never a
         sliver stretched) */
      const done = new Uint8Array(n)
      const lines = (rows: boolean) => {
        const N = rows ? H : W, M = rows ? W : H, at = (a: number, k: number) => (rows ? a * W + k : k * W + a)
        for (let a = 0; a < N; a++) {
          let k = 0
          while (k < M) {
            if (E[at(a, k)]! <= 0.01 || done[at(a, k)]) { k++; continue }
            const k0 = k; while (k < M && E[at(a, k)]! > 0.01 && !done[at(a, k)]) k++
            const k1 = k - 1
            let L0 = 0; while (L0 < 40 && k0 - 1 - L0 >= 0 && shows(at(a, k0 - 1 - L0))) L0++
            let L1 = 0; while (L1 < 40 && k1 + 1 + L1 < M && shows(at(a, k1 + 1 + L1))) L1++
            if (L0 < 2 && L1 < 2) continue
            const fwd = L0 >= L1, Ln = fwd ? L0 : L1
            for (let j = k0; j <= k1; j++) {
              const d = fwd ? j - k0 : k1 - j, t = d % (2 * Ln), off = t < Ln ? t : 2 * Ln - 1 - t
              const sk = fwd ? k0 - 1 - off : k1 + 1 + off, sp = at(a, sk) * 4
              put(at(a, j), (c) => S[sp + c]!); done[at(a, j)] = 1
            }
          }
        }
      }
      lines(st.how === 'rows'); lines(st.how !== 'rows')
    }
  }
  return made
}
