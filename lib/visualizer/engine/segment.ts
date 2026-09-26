import { downscale, rgbToLab, type Box, type Img, type Pt } from './pixels'

/* AI Visualizer engine (REG-673, audit §5.2) — a surface's or a piece's REGION: grown from its dot (and a sample's extra seeds) over
   neighbouring pixels of a similar colour, on a small copy, closed, then scaled up soft. 1.0 asked a model for masks (C-08); 2.0 grows
   them. A drawn region (Draw a surface) is a polygon. Masks are Float32Array, 0…1, one value per full-size pixel.

   (audit 2026-09-26, F026 · F185 · F186 · F060 · F180) The small copy decides WHAT belongs; the full-size photo decides WHERE the edge
   runs. Outlines (a hull, a cutout) are clipped at full size, anti-aliased, so a traced line never turns into a staircase and two
   surfaces that share a line meet with no gap; the flood reaches a little past an outline so the clip, not the grid, draws it. Along the
   colour-decided edges each full-size pixel is matted against the region's own colour nearby, so a leaf's soft edge takes part of the
   paint instead of keeping a white fringe. `within` / `exclude` boxes are axis-aligned and clip at full size too. A photo nobody traced
   (the fallback reading) weighs lightness fully, stops at strong edges and leaves a pixel to the rival surface whose colour it is nearer. */

export type GrowOpts = {
  /** Lab ΔE a step may take from its neighbour — what keeps the region inside an edge. */
  local?: number
  /** Lab ΔE a pixel may sit from its seed's colour — what keeps a gradient from walking into the next surface. */
  global?: number
  /** Parts of the photo the region never enters (a rug on a floor). */
  exclude?: Box[]
  /** Limits the region to a box (a piece of furniture). */
  within?: Box
  /** Limits the region to where the surface can be — one or more outlines (0…1 points), the sample rooms' curated hull. */
  hull?: Pt[][]
  /** Outlines the region never enters (a sofa standing on the floor). */
  cutout?: Pt[][]
  /** (F186, verify round 1) See-through things standing in front of the surface (pampas plumes, a plant's leaves, the gap under a chair's
      arm): the flood keeps out of them, then each pixel inside is keyed against the surface's own colour just around it — the wall
      between the fronds is the wall, a frond is not. */
  soft?: Pt[][]
  /** Glass in front of the surface (a tumbler): keyed like `soft`, and the surface shows through the rest at least `GLASS` strong. */
  glass?: Pt[][]
  /** Colour-key inside the outline instead of flooding from the seeds: every pixel near a seed's colour counts, connected or not — a
      floor seen in pieces between the furniture is one surface. Only with a hull. */
  key?: boolean
  /** The small copy's long side: 480 (Fast) · 640 (High quality). */
  size?: number
} & GrowExtras

/** Options a reading may carry for its own region (SurfaceDef.grow) — passed through to growRegion as they are. */
export type GrowExtras = {
  /** How much a lightness difference counts against the seed's colour. 0.5 (the default) keeps a shadowed or sunlit patch on its
      surface; 1 for a photo nobody traced, where a white bed must not read as a white wall. */
  lightWeight?: number
  /** Stops the flood at strong edges: a step into a pixel whose L* gradient (Sobel, per small pixel) is above this. For a photo nobody
      traced — the corner line between a white wall and a white ceiling. */
  edgeStop?: number
  /** The other surfaces' seeds: a pixel whose colour is nearer one of theirs than its own seed's is left to them, so the surfaces of
      one reading never paint the same pixels. */
  rivals?: Pt[]
  /** Takes in the pockets the flood could not reach — the wall seen between a plant's leaves — when they match the region's colour
      nearby closely. On by default with a hull. */
  pockets?: boolean
  /** Mattes the colour-decided edge at full size (default on). */
  matte?: boolean
  /** (F060 · F180, verify round 1) Smooths the region's outline on the small copy — a majority over this radius, twice — so a photo
      nobody traced gets a wall with clean edges, never torn-paper teeth where a gradient met the colour limit. */
  smooth?: number
}

type Lab3 = [number, number, number]

export function growRegion(img: Img, seeds: Pt[], o: GrowOpts = {}): Float32Array {
  const local = o.local ?? 7, global = o.global ?? 24, size = o.size ?? 480, LW = o.lightWeight ?? 0.5
  const s = downscale(img, size)
  const w = s.width, h = s.height, n = w * h
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n)
  for (let i = 0; i < n; i++) { const [l, a, b] = rgbToLab(s.data[i * 4]!, s.data[i * 4 + 1]!, s.data[i * 4 + 2]!); L[i] = l; A[i] = a; B[i] = b }

  /* Blocked cells: boxes (clipped again at full size) and outlines (hull / cutout — the region may run a little past these, the
     full-size clip draws them). */
  const boxBlocked = new Uint8Array(n), polyBlocked = new Uint8Array(n)
  const inBox = (bx: Box, x: number, y: number) => x >= bx[0] * w && x <= bx[2] * w && y >= bx[1] * h && y <= bx[3] * h
  const scale = (polys: Pt[][] | undefined) => polys?.filter((p) => p.length >= 3).map((p) => p.map((q) => ({ x: q.x * w, y: q.y * h })))
  const hull = scale(o.hull), cutout = scale([...(o.cutout ?? []), ...(o.soft ?? []), ...(o.glass ?? [])])
  if (o.exclude?.length || o.within || hull?.length || cutout?.length) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (o.within && !inBox(o.within, x + 0.5, y + 0.5)) boxBlocked[i] = 1
    else if (o.exclude?.some((bx) => inBox(bx, x + 0.5, y + 0.5))) boxBlocked[i] = 1
    else if (hull?.length && !hull.some((poly) => inside(poly, x + 0.5, y + 0.5))) polyBlocked[i] = 1
    else if (cutout?.some((poly) => inside(poly, x + 0.5, y + 0.5))) polyBlocked[i] = 1
  }
  const blocked = (i: number) => boxBlocked[i] === 1 || polyBlocked[i] === 1

  const labAt = (p: Pt): Lab3 => {
    const cx = Math.round(Math.min(w - 1, Math.max(0, p.x * w))), cy = Math.round(Math.min(h - 1, Math.max(0, p.y * h)))
    let l = 0, a = 0, b = 0, c = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = y * w + x; l += L[i]!; a += A[i]!; b += B[i]!; c++ }
    return [l / c, a / c, b / c]
  }
  /* Lightness counts at LW up to a shadow's depth (20 L*), fully beyond it: a floor in shade stays floor, a dark leg on it does not. */
  const dL = (dl: number) => { const m = Math.abs(dl); return m <= 20 ? m * LW : 20 * LW + (m - 20) }
  const d2 = (i: number, c: Lab3) => { const el = dL(L[i]! - c[0]), ea = A[i]! - c[1], eb = B[i]! - c[2]; return el * el + ea * ea + eb * eb }
  const rivalLab = (o.rivals ?? []).map(labAt)
  const rivalD2 = (i: number) => { let m = Infinity; for (const c of rivalLab) m = Math.min(m, d2(i, c)); return m }

  const mask = new Uint8Array(n)
  const origin = new Int32Array(n).fill(-1)   // which seed reached a pixel: its colour is the one to stay near
  const seedLab: Lab3[] = []
  const queue = new Int32Array(n)
  let head = 0, tail = 0
  seeds.forEach((p, si) => {
    const cx = Math.round(Math.min(w - 1, Math.max(0, p.x * w))), cy = Math.round(Math.min(h - 1, Math.max(0, p.y * h)))
    seedLab.push(labAt(p))
    const i = cy * w + cx
    if (!mask[i] && !blocked(i)) { mask[i] = 1; origin[i] = si; queue[tail++] = i }
  })
  const g2 = global * global, l2 = local * local
  const edge = o.edgeStop ? sobelL(L, w, h) : null

  if (o.key && hull?.length) {
    for (let i = 0; i < n; i++) {
      if (blocked(i)) continue
      let best = Infinity
      for (const sl of seedLab) best = Math.min(best, d2(i, sl))
      if (best <= g2 && (!rivalLab.length || best <= rivalD2(i))) mask[i] = 1
    }
  } else {
    while (head < tail) {
      const i = queue[head++]!, x = i % w, y = (i - x) / w, sl = seedLab[origin[i]!]!
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = ny * w + nx
        if (mask[j] || blocked(j)) continue
        const dl = L[j]! - L[i]!, da = A[j]! - A[i]!, db = B[j]! - B[i]!
        if (dl * dl + da * da + db * db > l2) continue
        const own = d2(j, sl)
        if (own > g2) continue
        if (edge && edge[j]! > o.edgeStop!) continue
        if (rivalLab.length && rivalD2(j) < own) continue
        mask[j] = 1; origin[j] = origin[i]!; queue[tail++] = j
      }
    }
  }

  /* Close small gaps, drop the boxes, keep what reaches a little way past an outline (the clip draws that line). */
  /* The close only fills what is near the surface's colour (a grain line, a speck) — never a stool's thin dark leg. */
  let region = erode(dilate(mask, w, h, 2), w, h, 2)
  const c2 = (global * 1.2) ** 2
  for (let i = 0; i < n; i++) {
    if (boxBlocked[i]) { region[i] = 0; continue }
    if (region[i] && !mask[i]) { let best = Infinity; for (const sl of seedLab) best = Math.min(best, d2(i, sl)); if (best > c2) region[i] = 0 }
  }
  const T = Math.max(8, 2 * local)   // the matte's and the pockets' tolerance against the region's own colour nearby
  let mean = localMean(region, polyBlocked, L, A, B, w, h, 5)
  if (o.pockets ?? !!hull?.length) {
    /* The wall between a plant's leaves: near the region, not reached, the region's own colour — a few rounds, each a short hop. */
    const t2 = (T * 0.7) ** 2
    for (let round = 0; round < 3; round++) {
      const near = dilate(region, w, h, 5)
      let added = 0
      for (let i = 0; i < n; i++) {
        if (region[i] || !near[i] || blocked(i) || !mean.wt[i]) continue
        const el = (L[i]! - mean.L[i]!) * LW, ea = A[i]! - mean.A[i]!, eb = B[i]! - mean.B[i]!   // a pocket in the leaves' shade is still the wall
        if (el * el + ea * ea + eb * eb > t2) continue
        let own = Infinity
        for (const sl of seedLab) own = Math.min(own, d2(i, sl))
        if (own > g2 || (rivalLab.length && rivalD2(i) < own)) continue   // still the surface's colour, so the rounds never creep
        region[i] = 1; added++
      }
      if (!added) break
      mean = localMean(region, polyBlocked, L, A, B, w, h, 5)
    }
  }
  if (o.smooth) {
    for (let k = 0; k < 2; k++) {
      const box = boxSum(Float32Array.from(region), w, h, o.smooth), span = (2 * o.smooth + 1) ** 2
      const next = new Uint8Array(n)
      for (let i = 0; i < n; i++) next[i] = !blocked(i) && box[i]! / span > 0.5 ? 1 : 0
      region = next
    }
    /* (wave E, desktop-3) a photo nobody traced: a scrap the smoothing cut off from the surface (a pill along the ceiling line, a dot in a
       corner) is no part of it — only what holds a seed, or is a good part of the surface in its own right, stays */
    region = keepHeld(region, w, h, seeds.map((p) => Math.round(Math.min(h - 1, Math.max(0, p.y * h))) * w + Math.round(Math.min(w - 1, Math.max(0, p.x * w)))))
    mean = localMean(region, polyBlocked, L, A, B, w, h, 5)
  }
  if (hull?.length || cutout?.length) {
    const reach = dilate(region, w, h, 2)
    const grown = new Uint8Array(n)
    for (let i = 0; i < n; i++) grown[i] = region[i] && !polyBlocked[i] ? 1 : polyBlocked[i] && !boxBlocked[i] && reach[i] ? 1 : 0
    region = grown
  }

  const W = img.width, H = img.height
  const out = o.matte === false
    ? upscaleMask(region, w, h, W, H)
    : matteUp(img, region, mean, localMean(invert(region), boxBlocked, L, A, B, w, h, 3), w, h, T, LW, hull?.length || cutout?.length ? dilate(polyBlocked, w, h, 2) : null, 2.2 * global)
  clipToOutlines(out, W, H, o)
  if (o.soft?.length || o.glass?.length) {
    const back = keyedInside(img, out, [...(o.soft ?? []), ...(o.glass ?? [])], o.lightWeight ?? 0.5)
    for (const q of o.glass ?? []) { const gm = polygonMask(W, H, q); for (let i = 0; i < back.length; i++) if (gm[i]! > 0) back[i] = Math.max(back[i]!, GLASS * gm[i]!) }
    /* inside the hull (and the boxes) — a soft outline may lie over a hard one (the gap under a chair's arm, inside the chair) */
    const keep = new Float32Array(out.length); keep.fill(1)
    clipToOutlines(keep, W, H, { hull: o.hull, within: o.within, exclude: o.exclude })
    for (let i = 0; i < out.length; i++) { const v = Math.min(back[i]!, keep[i]!); if (v > out[i]!) out[i] = v }
  }
  return out
}

/** A region's connected parts (4-neighbour) that hold one of `seedCells`, or that are at least a quarter of its largest part. */
function keepHeld(region: Uint8Array, w: number, h: number, seedCells: number[]): Uint8Array {
  const n = w * h, label = new Int32Array(n).fill(-1), sizes: number[] = [], stack = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    if (!region[i] || label[i]! >= 0) continue
    const id = sizes.length
    let top = 0, size = 0
    stack[top++] = i; label[i] = id
    while (top) {
      const j = stack[--top]!, x = j % w
      size++
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (k >= 0 && k < n && region[k] && label[k]! < 0) { label[k] = id; stack[top++] = k }
    }
    sizes.push(size)
  }
  if (sizes.length <= 1) return region
  const held = new Set(seedCells.map((c) => label[c]!).filter((l) => l >= 0)), big = Math.max(...sizes)
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) { const l = label[i]!; if (l >= 0 && (held.has(l) || sizes[l]! >= big * 0.25)) out[i] = 1 }
  return out
}

/** How strongly a new finish shows through glass standing in front of it. */
const GLASS = 0.72
/** (F186) Inside see-through outlines, how much each pixel is the region's own surface: its colour against the region's colour just
    around (a blur of the region's pixels outside the outlines, wide enough to reach the middle), 1 where it matches, 0 a clear step off. */
export function keyedInside(img: Img, m: Float32Array, polys: Pt[][], LW = 0.5): Float32Array {
  const W = img.width, H = img.height, n = W * H, d = img.data
  const out = new Float32Array(n)
  for (const poly of polys) {
    if (poly.length < 3) continue
    const P = polygonMask(W, H, poly)
    const bx0 = Math.min(...poly.map((q) => q.x)), by0 = Math.min(...poly.map((q) => q.y)), bx1 = Math.max(...poly.map((q) => q.x)), by1 = Math.max(...poly.map((q) => q.y))
    /* the surface's colour around: its firm pixels outside the outline, averaged near (a pixel by the edge) and wide enough to reach the
       outline's middle */
    const wt = new Float32Array(n), ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
    for (let i = 0; i < n; i++) { if (m[i]! < 0.6 || P[i]! >= 0.02) continue; wt[i] = 1; for (let c = 0; c < 3; c++) ch[c]![i] = d[i * 4 + c]! }
    const near = (r: number) => ({ w: boxBlurF(wt, W, H, r), c: ch.map((a) => boxBlurF(a, W, H, r)) })
    const small = near(Math.max(4, Math.round(W * 0.012))), wide = near(Math.max(8, Math.round(Math.max((bx1 - bx0) * W, (by1 - by0) * H) * 0.6)))
    const like = new Float32Array(n), bg = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      if (P[i]! <= 0.002) continue
      const g = small.w[i]! > 0.02 ? small : wide.w[i]! > 1e-4 ? wide : null
      if (!g) continue
      const k = (c: number) => Math.min(255, Math.max(0, Math.round(g.c[c]![i]! / g.w[i]!)))
      bg[i * 3] = k(0); bg[i * 3 + 1] = k(1); bg[i * 3 + 2] = k(2)
      const a = rgbToLab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!), b = rgbToLab(k(0), k(1), k(2))
      /* a shade the thing casts on the surface is still the surface — darker counts little, colour counts fully (a stool's walnut leg is
         told from the grey floor in its shadow by its hue) */
      const dist = Math.hypot((a[0] - b[0]) * (a[0] < b[0] ? LW * 0.2 : LW), a[1] - b[1], a[2] - b[2])
      const t = Math.min(1, Math.max(0, (dist - 4) / 6))
      like[i] = 1 - t * t * (3 - 2 * t)
    }
    /* the thing's own colour nearby (its clear pixels): an edge pixel between it and the surface is unmixed — half over the wall takes half
       the paint, so a leaf keeps no pale rim */
    const ow = new Float32Array(n), oc = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
    for (let i = 0; i < n; i++) if (P[i]! > 0.5 && like[i]! < 0.1 && bg[i * 3]! + bg[i * 3 + 1]! + bg[i * 3 + 2]! > 0) { ow[i] = 1; for (let c = 0; c < 3; c++) oc[c]![i] = d[i * 4 + c]! }
    const r2 = Math.max(2, Math.round(W * 0.004)), bow = boxBlurF(ow, W, H, r2), boc = oc.map((a) => boxBlurF(a, W, H, r2))
    for (let i = 0; i < n; i++) {
      if (P[i]! <= 0.002) continue
      let v = like[i]!
      if (bow[i]! > 0.5 && v < 0.98) {
        const o0 = boc[0]![i]! / bow[i]!, o1 = boc[1]![i]! / bow[i]!, o2 = boc[2]![i]! / bow[i]!
        const f0 = bg[i * 3]! - o0, f1 = bg[i * 3 + 1]! - o1, f2 = bg[i * 3 + 2]! - o2, ff = f0 * f0 + f1 * f1 + f2 * f2
        if (ff > 900) {
          const p0 = d[i * 4]! - o0, p1 = d[i * 4 + 1]! - o1, p2 = d[i * 4 + 2]! - o2, t = (p0 * f0 + p1 * f1 + p2 * f2) / ff
          if (Math.hypot(p0 - t * f0, p1 - t * f1, p2 - t * f2) < 18) v = Math.max(v, Math.min(1, Math.max(0, (t - 0.12) / 0.76)))
        }
      }
      v *= P[i]!
      if (v > out[i]!) out[i] = v
    }
    /* (wave E, surfaces-4) the thing's rim: a pixel beside the keyed surface that is lighter than the thing, toward the surface's light (a
       leaf's soft, sharpened edge — greyer than both, so it isn't on the line between them), is part surface by its lightness; it takes
       that share of the new finish instead of keeping a pale fringe on a dark paint */
    const X0 = Math.max(1, Math.floor(bx0 * W) - 1), X1 = Math.min(W - 2, Math.ceil(bx1 * W) + 1), Y0 = Math.max(1, Math.floor(by0 * H) - 1), Y1 = Math.min(H - 2, Math.ceil(by1 * H) + 1)
    const Lof = (r: number, g: number, b: number) => rgbToLab(Math.round(r), Math.round(g), Math.round(b))[0]
    const add: [number, number][] = []
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const i = y * W + x
      if (P[i]! <= 0.002 || out[i]! >= 0.5 || bow[i]! <= 0.5 || bg[i * 3]! + bg[i * 3 + 1]! + bg[i * 3 + 2]! <= 0) continue
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (out[i + dy * W + dx]! > 0.8) { near = true; break }
      if (!near) continue
      const lo = Lof(boc[0]![i]! / bow[i]!, boc[1]![i]! / bow[i]!, boc[2]![i]! / bow[i]!), lb = Lof(bg[i * 3]!, bg[i * 3 + 1]!, bg[i * 3 + 2]!), lp = Lof(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!)
      if (Math.abs(lb - lo) < 15) continue
      const s = (lp - lo) / (lb - lo)
      if (s > 0.15) add.push([i, Math.min(1, s * 1.25) * P[i]!])
    }
    for (const [i, v] of add) if (v > out[i]!) out[i] = v
  }
  return out
}
/** A separable box blur (running sums, clamped at the edges) on a full-size field. */
function boxBlurF(f: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(f.length), out = new Float32Array(f.length)
  for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += f[row + Math.min(w - 1, Math.max(0, x))]!; for (let x = 0; x < w; x++) { tmp[row + x] = acc; acc += f[row + Math.min(w - 1, x + r + 1)]! - f[row + Math.max(0, x - r)]! } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!; for (let y = 0; y < h; y++) { out[y * w + x] = acc; acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]! } }
  return out
}

/** A small mask → full size: a tent blur on the small grid (so a shallow edge is not a staircase), bilinear, a narrow smoothstep. */
function upscaleMask(m: Uint8Array, w: number, h: number, W: number, H: number): Float32Array {
  const soft = blur121(m, w, h)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.max(0, ((y + 0.5) * h) / H - 0.5)), y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1), ty = sy - y0
    for (let x = 0; x < W; x++) {
      const sx = Math.min(w - 1, Math.max(0, ((x + 0.5) * w) / W - 0.5)), x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1), tx = sx - x0
      const v = (soft[y0 * w + x0]! * (1 - tx) + soft[y0 * w + x1]! * tx) * (1 - ty) + (soft[y1 * w + x0]! * (1 - tx) + soft[y1 * w + x1]! * tx) * ty
      out[y * W + x] = smooth(v)
    }
  }
  return out
}
const smooth = (v: number) => { const t = Math.min(1, Math.max(0, (v - 0.35) / 0.3)); return t * t * (3 - 2 * t) }

/** Full size with the colour-decided edge matted: inside the region's core the mask is 1; in the band around its edge (one small pixel
    either side) each full-size pixel takes alpha from its colour — unmixed between the region's own colour nearby and what borders it
    (a leaf's soft edge half over the wall takes half the paint), or, where the two are too alike to unmix, by its distance from the
    region's colour. */
function matteUp(img: Img, region: Uint8Array, mean: Mean, bg: Mean, w: number, h: number, T: number, LW: number, nearOutline: Uint8Array | null, strict: number): Float32Array {
  const W = img.width, H = img.height, d = img.data
  const inner = erode(region, w, h, 1), outer = dilate(region, w, h, 1)
  const inSoft = blur121(region, w, h), outSoft = blur121(outer, w, h)
  const out = new Float32Array(W * H)
  const half = 0.5 * T, t2min = (1.5 * T) ** 2
  /* A full-size pixel far from the surface's colour nearby is a thin thing in front of it (a stool's leg on a keyed floor, blurred in
     by the small copy), whatever the grid says; a crease or a shadow stays well inside this. */
  const keepOf = (dist: number) => (dist <= strict ? 1 : Math.max(0, 1 - (dist - strict) / (0.3 * strict)))
  for (let y = 0; y < H; y++) {
    const sy = Math.min(h - 1, Math.max(0, ((y + 0.5) * h) / H - 0.5)), y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1), ty = sy - y0
    const ky = Math.min(h - 1, Math.floor(((y + 0.5) * h) / H)) * w
    for (let x = 0; x < W; x++) {
      const sx = Math.min(w - 1, Math.max(0, ((x + 0.5) * w) / W - 0.5)), x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1), tx = sx - x0
      const a = y0 * w + x0, b = y0 * w + x1, c = y1 * w + x0, e = y1 * w + x1
      const allIn = inner[a] && inner[b] && inner[c] && inner[e]
      if (!allIn && !outer[a] && !outer[b] && !outer[c] && !outer[e]) continue
      const k = ky + Math.min(w - 1, Math.floor(((x + 0.5) * w) / W)), o = y * W + x, p = o * 4
      if (!mean.wt[k]) { if (allIn) out[o] = 1; else out[o] = smooth((inSoft[a]! * (1 - tx) + inSoft[b]! * tx) * (1 - ty) + (inSoft[c]! * (1 - tx) + inSoft[e]! * tx) * ty); continue }
      const [l, aa, bb] = rgbToLab(d[p]!, d[p + 1]!, d[p + 2]!)
      const ml = mean.L[k]!, ma = mean.A[k]!, mb = mean.B[k]!
      const kept = allIn || nearOutline?.[k] ? keepOf(Math.hypot(l - ml, aa - ma, bb - mb)) : 0
      if (allIn) { out[o] = kept; continue }
      const vOut = smooth((outSoft[a]! * (1 - tx) + outSoft[b]! * tx) * (1 - ty) + (outSoft[c]! * (1 - tx) + outSoft[e]! * tx) * ty)
      if (vOut <= 0) continue
      let alpha: number
      const bl = bg.L[k]!, ba = bg.A[k]!, bb2 = bg.B[k]!
      const fl = ml - bl, fa = ma - ba, fb = mb - bb2, ff = fl * fl + fa * fa + fb * fb
      const t = bg.wt[k] && ff > t2min ? ((l - bl) * fl + (aa - ba) * fa + (bb - bb2) * fb) / ff : NaN
      /* Unmix only a pixel that IS a mix of the two (it sits near the line between them) — a third thing (a pot beside the wall, below
         the leaves) is judged by its own distance from the surface. */
      if (Number.isFinite(t) && Math.hypot(l - bl - t * fl, aa - ba - t * fa, bb - bb2 - t * fb) <= T) {
        alpha = Math.min(1, Math.max(0, (Math.min(1, Math.max(0, t)) - 0.15) / 0.7))   // a pixel mostly one or the other is that one
      } else {
        const dl = l - ml, el = dl * (dl > 0 ? 0.4 : Math.max(LW, 0.75)), ea = aa - ma, eb = bb - mb   // a brighter rim is the surface's own (a sharpened edge's halo)
        alpha = Math.min(1, Math.max(0, (T - Math.sqrt(el * el + ea * ea + eb * eb)) / half))
      }
      /* Beside an outline the outline draws the edge (its clip follows): a shadow line at a traced corner is not a colour edge. */
      if (nearOutline?.[k]) out[o] = Math.max(alpha * vOut, smooth((inSoft[a]! * (1 - tx) + inSoft[b]! * tx) * (1 - ty) + (inSoft[c]! * (1 - tx) + inSoft[e]! * tx) * ty) * kept)
      else out[o] = alpha * vOut
    }
  }
  return out
}

type Mean = { L: Float32Array; A: Float32Array; B: Float32Array; wt: Uint8Array }
/** The region's own colour around each small pixel (a box mean over the region's cells within r). */
function localMean(region: Uint8Array, skip: Uint8Array, L: Float32Array, A: Float32Array, B: Float32Array, w: number, h: number, r: number): Mean {
  const n = w * h
  const m = new Float32Array(n), l = new Float32Array(n), a = new Float32Array(n), b = new Float32Array(n)
  for (let i = 0; i < n; i++) if (region[i] && !skip[i]) { m[i] = 1; l[i] = L[i]!; a[i] = A[i]!; b[i] = B[i]! }
  const bm = boxSum(m, w, h, r), bl = boxSum(l, w, h, r), ba = boxSum(a, w, h, r), bb = boxSum(b, w, h, r)
  const wt = new Uint8Array(n)
  for (let i = 0; i < n; i++) { const c = bm[i]!; if (c >= 1) { wt[i] = 1; bl[i] = bl[i]! / c; ba[i] = ba[i]! / c; bb[i] = bb[i]! / c } }
  return { L: bl, A: ba, B: bb, wt }
}
const invert = (m: Uint8Array) => { const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = m[i] ? 0 : 1; return o }
function boxSum(f: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(f.length), out = new Float32Array(f.length)
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x < w + r; x++) { if (x + r < w && x + r >= 0) s += f[y * w + x + r]!; if (x - r - 1 >= 0 && x - r - 1 < w) s -= f[y * w + x - r - 1]!; if (x >= 0 && x < w) tmp[y * w + x] = s } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y < h + r; y++) { if (y + r < h && y + r >= 0) s += tmp[(y + r) * w + x]!; if (y - r - 1 >= 0 && y - r - 1 < h) s -= tmp[(y - r - 1) * w + x]!; if (y >= 0 && y < h) out[y * w + x] = s } }
  return out
}
function blur121(m: Uint8Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(m.length), out = new Float32Array(m.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; tmp[i] = (m[x > 0 ? i - 1 : i]! + 2 * m[i]! + m[x < w - 1 ? i + 1 : i]!) / 4 }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; out[i] = (tmp[y > 0 ? i - w : i]! + 2 * tmp[i]! + tmp[y < h - 1 ? i + w : i]!) / 4 }
  return out
}
/** L* gradient magnitude per small pixel (Sobel, divided by 4 so it reads as L* per pixel). */
function sobelL(L: Float32Array, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h)
  const at = (x: number, y: number) => L[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
    const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
    g[y * w + x] = Math.hypot(gx, gy) / 4
  }
  return g
}

/** Clips a full-size mask to its outlines, anti-aliased: inside the hull (any of its polygons), outside every cutout, inside `within`,
    outside every `exclude` box. Two outlines that share a line give each edge pixel complementary coverage. */
export function clipToOutlines(m: Float32Array, W: number, H: number, o: Pick<GrowOpts, 'hull' | 'cutout' | 'within' | 'exclude'>): void {
  const hulls = (o.hull ?? []).filter((p) => p.length >= 3), cuts = (o.cutout ?? []).filter((p) => p.length >= 3)
  if (hulls.length) {
    const keep = new Float32Array(W * H)
    /* A shade generous (coverage ×2): two outlines that share a line both cover its pixels, so no pale seam is left between them. */
    for (const p of hulls) { const pm = polygonMask(W, H, p); for (let i = 0; i < keep.length; i++) { const v = Math.min(1, pm[i]! * 2); if (v > keep[i]!) keep[i] = v } }
    for (let i = 0; i < m.length; i++) m[i] = m[i]! * keep[i]!
  }
  for (const p of cuts) { const pm = polygonMask(W, H, p); for (let i = 0; i < m.length; i++) if (pm[i]! > 0.5) m[i] = m[i]! * Math.max(0, 2 - 2 * Math.min(1, pm[i]!)) }
  const boxes: { b: Box; keepInside: boolean }[] = [...(o.within ? [{ b: o.within, keepInside: true }] : []), ...(o.exclude ?? []).map((b) => ({ b, keepInside: false }))]
  for (const { b, keepInside } of boxes) {
    const x0 = b[0] * W, y0 = b[1] * H, x1 = b[2] * W, y1 = b[3] * H
    for (let y = 0; y < H; y++) {
      const cy = Math.max(0, Math.min(y + 1, y1) - Math.max(y, y0))
      for (let x = 0; x < W; x++) {
        const cover = cy * Math.max(0, Math.min(x + 1, x1) - Math.max(x, x0))
        const i = y * W + x
        m[i] = m[i]! * (keepInside ? cover : 1 - cover)
      }
    }
  }
}

/** A drawn outline → the surface inside it, without what stands in front of it (audit F033). With seeds (a curated surface redrawn),
    the region grows from those inside the outline with the surface's own options; without, it is keyed on the outline's main colour
    and kept when it covers most of the outline (a patterned or high-contrast surface falls back to the outline itself). `avoid` —
    the masks of the pieces standing in front — are taken out either way. `grow: false` (glass, a window) keeps the outline as drawn. */
export function outlineRegion(img: Img, poly: Pt[], o: GrowOpts & { avoid?: Float32Array[]; see?: Pt[][]; grow?: boolean; seeds?: Pt[]; minShare?: number } = {}): Float32Array {
  const W = img.width, H = img.height
  const plain = polygonMask(W, H, poly)
  let m = plain
  if (poly.length >= 3 && o.grow !== false) {
    const own = (o.seeds ?? []).filter((p) => inside(poly, p.x, p.y))
    const seeds = own.length ? own : interiorSeeds(img, poly)
    if (seeds.length) {
      /* (wave E, surfaces-8) keyed on the outline's main colour, its shading counting little — the shade a speaker casts on the wall
         inside a drawn panel is the wall, not a ragged hole */
      const grown = growRegion(img, seeds, { ...o, hull: [poly], key: own.length ? o.key : true, local: o.local ?? 6, global: o.global ?? (own.length ? undefined : 14), ...(own.length || o.lightWeight !== undefined ? {} : { lightWeight: 0.3 }) })
      const share = maskCoverage(grown) / Math.max(1e-6, maskCoverage(plain))
      if (share >= (o.minShare ?? (own.length ? 0.3 : 0.6))) m = grown
    }
  }
  if (m === plain) m = new Float32Array(plain)
  for (const a of o.avoid ?? []) for (let i = 0; i < m.length; i++) if (a[i]! > 0) m[i] = m[i]! * (1 - Math.min(1, a[i]!))
  /* (F033, verify round 1) a see-through piece in front (a fig): its outline is taken out, then the surface keyed back between its leaves */
  if (o.see?.length) {
    for (const q of o.see) { const pm = polygonMask(W, H, q); for (let i = 0; i < m.length; i++) if (pm[i]! > 0) m[i] = m[i]! * (1 - pm[i]!) }
    const back = keyedInside(img, m, o.see, o.lightWeight ?? 0.5)
    /* (wave E, surfaces-8) what the outline took out is keyed back in its place — added, not the larger of the two: a pixel on the outline's
       line is half kept and half keyed, never half painted (no light dashed seam round the fig) */
    for (let i = 0; i < m.length; i++) { const v = back[i]! * plain[i]!; if (v > 0) m[i] = Math.min(1, m[i]! + v) }
  }
  return m
}

/** Points inside an outline on its main colour — a coarse Lab histogram's fullest bin, up to 12 of its pixels spread across. */
export function interiorSeeds(img: Img, poly: Pt[]): Pt[] {
  if (poly.length < 3) return []
  const s = downscale(img, 160), w = s.width, h = s.height
  const pts: { x: number; y: number; k: number }[] = []
  const bins = new Map<number, number>()
  const P = poly.map((p) => ({ x: p.x * w, y: p.y * h }))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inside(P, x + 0.5, y + 0.5)) continue
    const i = (y * w + x) * 4
    const [l, a, b] = rgbToLab(s.data[i]!, s.data[i + 1]!, s.data[i + 2]!)
    const k = Math.floor(l / 10) * 10000 + Math.floor((a + 128) / 8) * 100 + Math.floor((b + 128) / 8)
    bins.set(k, (bins.get(k) ?? 0) + 1); pts.push({ x, y, k })
  }
  let best = -1, cnt = 0
  for (const [k, c] of bins) if (c > cnt) { cnt = c; best = k }
  const on = pts.filter((p) => p.k === best)
  if (!on.length) return []
  const step = Math.max(1, Math.floor(on.length / 12))
  return on.filter((_, i) => i % step === 0).slice(0, 12).map((p) => ({ x: (p.x + 0.5) / w, y: (p.y + 0.5) / h }))
}

/** (wave E, surfaces-14) Where a piece marked with one click grows from: the click, and the main colour on a small disc around it when that
    is the click's own colour in another light (a click that landed in the shade between a plant's leaves grows from the leaves too) —
    never a colour of another hue (the window behind the plant). `r` — the disc's radius, 0…1 of the width. `hue` — the click is on a
    colour (a leaf, a timber, a velvet), so its shade can be told from another thing by its hue; on a white or a grey it can't. */
export function tapSeeds(img: Img, p: Pt, r = 0.025): { seeds: Pt[]; hue: boolean } {
  const s = downscale(img, 240), w = s.width, h = s.height
  const lab = (x: number, y: number) => { const i = (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4; return rgbToLab(s.data[i]!, s.data[i + 1]!, s.data[i + 2]!) }
  const cx = Math.round(p.x * w), cy = Math.round(p.y * h), R = Math.max(3, Math.round(r * w))
  /* the click's own colour: a 3 × 3 mean */
  let l0 = 0, a0 = 0, b0 = 0
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = lab(cx + dx, cy + dy); l0 += c[0] / 9; a0 += c[1] / 9; b0 += c[2] / 9 }
  const bins = new Map<number, { x: number; y: number; l: number; a: number; b: number }[]>()
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h || (x - cx) ** 2 + (y - cy) ** 2 > R * R) continue
    const [l, a, b] = lab(x, y)
    const k = Math.floor(l / 12) * 10000 + Math.floor((a + 128) / 8) * 100 + Math.floor((b + 128) / 8)
    const list = bins.get(k); const q = { x, y, l, a, b }
    if (list) list.push(q); else bins.set(k, [q])
  }
  let best: { x: number; y: number; l: number; a: number; b: number }[] = []
  for (const v of bins.values()) if (v.length > best.length) best = v
  const out: Pt[] = [p], c0 = Math.hypot(a0, b0), hue = c0 >= 18   // a cream vase (C≈11) is told from a white sill by its lightness, not its hue
  if (!best.length) return { seeds: out, hue }
  const ma = best.reduce((t, q) => t + q.a, 0) / best.length, mb = best.reduce((t, q) => t + q.b, 0) / best.length, ml = best.reduce((t, q) => t + q.l, 0) / best.length
  /* the same hue as the click (lightness free — shade or sun); on a white or a grey, the same colour outright (a white vase on a white sill
     is not told by its hue) */
  const c1 = Math.hypot(ma, mb)
  const same = hue ? Math.hypot(ma - a0, mb - b0) <= Math.max(8, 0.45 * Math.max(c0, c1)) : Math.hypot(ma - a0, mb - b0) <= 5 && Math.abs(ml - l0) <= 8
  if (!same) return { seeds: out, hue }
  const step = Math.max(1, Math.floor(best.length / 8))
  for (let k = 0; k < best.length && out.length < 9; k += step) out.push({ x: (best[k]!.x + 0.5) / w, y: (best[k]!.y + 0.5) / h })
  return { seeds: out, hue }
}

/** Even-odd point-in-polygon. */
function inside(poly: Pt[], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c
  }
  return c
}

function dilate(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const xx = x + d; if (xx >= 0 && xx < w && m[y * w + xx]) v = 1 } tmp[y * w + x] = v }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let d = -r; d <= r && !v; d++) { const yy = y + d; if (yy >= 0 && yy < h && tmp[yy * w + x]) v = 1 } out[y * w + x] = v }
  return out
}
function erode(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const inv = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1
  const d = dilate(inv, w, h, r); const out = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) out[i] = d[i] ? 0 : 1
  return out
}

/** (wave F) Keeps a keyed part off what stands in front of it by its hue: a pixel of clear colour inside the outlines (a walnut leg's lit
    face — chroma over `c`) goes, and so do the pixels within `reach` of it (the same leg's shaded side, as dark and as grey as the panel
    behind it). In place. */
export function offHue(img: Img, m: Float32Array, polys: Pt[][], c = 7.5, reach = 2): void {
  const W = img.width, H = img.height, d = img.data, n = W * H
  const inside = new Uint8Array(n)
  for (const q of polys) { if (q.length < 3) continue; const pm = polygonMask(W, H, q); for (let i = 0; i < n; i++) if (pm[i]! > 0) inside[i] = 1 }
  const hued = new Uint8Array(n)
  for (let i = 0; i < n; i++) { if (!inside[i]) continue; const [, a, b] = rgbToLab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!); if (Math.hypot(a, b) > c) hued[i] = 1 }
  const near = dilate(hued, W, H, reach)
  for (let i = 0; i < n; i++) if (inside[i] && near[i]) m[i] = 0
}

/** (wave F) A keyed part checked at full size: each pixel stays as far as its own colour is its seeds' (lightness counting fully) — a seat's
    shaded rim that the small copy averaged into the panel's colour is let go. In place. */
export function keepNear(img: Img, m: Float32Array, seeds: Pt[], limit: number): void {
  const W = img.width, H = img.height, d = img.data
  const labs = seeds.map((p) => {
    const cx = Math.round(Math.min(W - 1, Math.max(0, p.x * W))), cy = Math.round(Math.min(H - 1, Math.max(0, p.y * H)))
    let r = 0, g = 0, b = 0, c = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const q = (y * W + x) * 4; r += d[q]!; g += d[q + 1]!; b += d[q + 2]!; c++ }
    return rgbToLab(Math.round(r / c), Math.round(g / c), Math.round(b / c))
  })
  for (let i = 0; i < m.length; i++) {
    if (m[i]! <= 0) continue
    const [l, a, b] = rgbToLab(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!)
    let best = Infinity
    for (const s of labs) best = Math.min(best, Math.hypot(l - s[0], a - s[1], b - s[2]))
    m[i] = m[i]! * Math.min(1, Math.max(0, (1.5 * limit - best) / (0.5 * limit)))
  }
}

/** A drawn shape (0…1 points) → a mask, 4× supersampled along each row for a clean edge. */
export function polygonMask(W: number, H: number, poly: Pt[]): Float32Array {
  const out = new Float32Array(W * H)
  if (poly.length < 3) return out
  const pts = poly.map((p) => ({ x: p.x * W, y: p.y * H }))
  const SUB = 4
  for (let y = 0; y < H; y++) {
    for (let s = 0; s < SUB; s++) {
      const yy = y + (s + 0.5) / SUB
      const xs: number[] = []
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i]!, b = pts[j]!
        if ((a.y > yy) !== (b.y > yy)) xs.push(a.x + ((yy - a.y) / (b.y - a.y)) * (b.x - a.x))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.max(0, xs[k]!), x1 = Math.min(W, xs[k + 1]!)
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const cover = Math.min(x + 1, x1) - Math.max(x, x0)
          if (cover > 0) out[y * W + x]! += cover / SUB
        }
      }
    }
  }
  return out
}

/** How much of the photo a mask covers, 0…1. */
export function maskCoverage(m: Float32Array): number { let s = 0; for (let i = 0; i < m.length; i++) s += m[i]!; return s / m.length }
/** The mask's centre of mass — where a drawn surface's dot goes. */
export function maskCentre(m: Float32Array, W: number, H: number): Pt {
  let sx = 0, sy = 0, s = 0
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const v = m[y * W + x]!; if (v > 0.5) { sx += x; sy += y; s++ } }
  return s ? { x: sx / s / W, y: sy / s / H } : { x: 0.5, y: 0.5 }
}

/** A full-size mask held to the pixels `r` or more inside it (a square min filter over `m > 0.5`), softened by a pixel — the firm middle
    of a traced outline, well away from its line. */
export function insideOf(m: Float32Array, W: number, H: number, r: number): Float32Array {
  const on = new Uint8Array(m.length)
  for (let i = 0; i < m.length; i++) on[i] = m[i]! > 0.5 ? 1 : 0
  const core = erode(on, W, H, r), out = new Float32Array(m.length)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (!core[i]) continue
    /* a one-pixel soft edge: a pixel of the core beside a pixel outside it is half in */
    const edge = (x > 0 && !core[i - 1]) || (x < W - 1 && !core[i + 1]) || (y > 0 && !core[i - W]) || (y < H - 1 && !core[i + W])
    out[i] = edge ? 0.6 : 1
  }
  return out
}

/** (wave E, surfaces-12) A traced outline whose line the colour finishes: pixels well inside it are in, pixels well outside it are out, and
    in a band `r` pixels either side of its line each pixel is unmixed between the piece's own colour just inside and what borders it just
    outside — a line traced a pixel short of a sofa's lit base rail still takes the rail, a line a pixel over the floor leaves the floor.
    Where the two sides are too alike to tell apart (a white curtain against a white wall) the traced coverage stands. `cutouts` — what
    lies inside it and isn't it (a throw, the cushions of another colour, the pieces in front): their lines are finished the same way. */
export function edgeMatte(img: Img, poly: Pt[], r = 2, cutouts: Pt[][] = []): Float32Array {
  const W = img.width, H = img.height, n = W * H, d = img.data
  const traced = polygonMask(W, H, poly)   // the outline alone — what a cutout took out never joins back
  if (poly.length < 3) return traced
  /* (wave F) what a cutout covers is taken out by its area — an edge a cutout shares with the outline (the cushions' tops on the sofa's
     back) goes with it whole, never a half-covered hairline left along it — then what is left thinner than three pixels (two lines drawn
     a hair apart) or cut off from the piece (a scrap between two cushions) is dropped */
  const P = new Float32Array(traced)
  const holes = new Float32Array(n)   // what the cutouts cover, inside the outline or just past it (a leg under the sofa's frame)
  for (const q of cutouts) { if (q.length < 3) continue; const pm = polygonMask(W, H, q); for (let i = 0; i < n; i++) if (pm[i]! > 0) { P[i] = Math.max(0, P[i]! - pm[i]!); if (pm[i]! > holes[i]!) holes[i] = pm[i]! } }
  if (cutouts.length) dropSlivers(P, W, H)
  const inb = new Uint8Array(n), outb = new Uint8Array(n)
  for (let i = 0; i < n; i++) { inb[i] = P[i]! > 0.5 ? 1 : 0; outb[i] = P[i]! < 0.5 ? 1 : 0 }
  const core = erode(inb, W, H, r), far = erode(outb, W, H, r)
  /* each side's colour near the line: a blur of its firm pixels, normalised */
  /* (wave F) read close to the line: what lies just beyond it (a table's thin shadow over the sofa's back), not the brighter things further on */
  const side = (f: Uint8Array) => {
    const wt = new Float32Array(n), ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
    for (let i = 0; i < n; i++) if (f[i]) { wt[i] = 1; for (let c = 0; c < 3; c++) ch[c]![i] = d[i * 4 + c]! }
    /* the near read where it reaches that side, else a wider one (a pixel two out from the line still sees the piece's own colour) */
    const near = { w: boxBlurF(wt, W, H, r + 1), c: ch.map((a) => boxBlurF(a, W, H, r + 1)) }, wide = { w: boxBlurF(wt, W, H, 2 * r + 1), c: ch.map((a) => boxBlurF(a, W, H, 2 * r + 1)) }
    for (let i = 0; i < n; i++) if (near.w[i]! < 0.02 && wide.w[i]! >= 0.02) { near.w[i] = wide.w[i]!; for (let c = 0; c < 3; c++) near.c[c]![i] = wide.c[c]![i]! }
    return near
  }
  const I = side(core), O = side(far)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (core[i]) { out[i] = 1; continue }
    if (far[i]) continue
    out[i] = P[i]!
    /* (wave F) inside the traced line the trace is the piece — a lit cushion top against a bright window or a pale rug is never unpicked
       pixel by pixel into flecks (a lit rim reads as what borders it); on the line and outside it (never inside a cutout) the colour adds
       what the trace missed */
    if (P[i]! >= 0.95 || holes[i]! > 0.25) continue
    if (I.w[i]! < 0.02 || O.w[i]! < 0.02) continue
    const i0 = I.c[0]![i]! / I.w[i]!, i1 = I.c[1]![i]! / I.w[i]!, i2 = I.c[2]![i]! / I.w[i]!
    const o0 = O.c[0]![i]! / O.w[i]!, o1 = O.c[1]![i]! / O.w[i]!, o2 = O.c[2]![i]! / O.w[i]!
    const f0 = i0 - o0, f1 = i1 - o1, f2 = i2 - o2, ff = f0 * f0 + f1 * f1 + f2 * f2
    if (ff < 30 * 30) continue
    /* the pixel as its 3 × 3 neighbourhood reads it — a weave's grain or a rug's fleck doesn't decide on its own */
    const x = i % W, y = (i - x) / W
    let c0 = 0, c1 = 0, c2 = 0, cn = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = (yy * W + xx) * 4; c0 += d[q]!; c1 += d[q + 1]!; c2 += d[q + 2]!; cn++ }
    const p0 = c0 / cn - o0, p1 = c1 / cn - o1, p2 = c2 / cn - o2, t = (p0 * f0 + p1 * f1 + p2 * f2) / ff
    /* only a pixel that IS a mix of the two sides — a third thing on the line keeps the traced coverage, and so does one well past the
       piece's own colour (a dark metal leg, the deep shade under a sofa: not the piece, only darker than it) */
    if (Math.hypot(p0 - t * f0, p1 - t * f1, p2 - t * f2) > 26 || t > 1.25) continue
    /* outside its line a pixel joins by how much of it is the piece (the lit rail under a sofa; the rim of a cushion a pixel above a line
       drawn a hair low, half over the shadow behind it) — a faint likeness (the floor's shade, the rug's grain) never */
    const a = Math.min(1, Math.max(0, (t - 0.4) / 0.6))
    out[i] = Math.max(out[i]!, a)
  }
  /* what the colour added holds on to the trace — a join cut off from it (a speck in the shade under a sofa) is no part of the piece */
  const added = (i: number) => out[i]! > P[i]! + 0.05, held = new Uint8Array(n), queue: number[] = []
  for (let i = 0; i < n; i++) if (P[i]! >= 0.5) { held[i] = 1; queue.push(i) }
  for (let h = 0; h < queue.length; h++) {
    const j = queue[h]!, x = j % W, y = (j - x) / W
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const k = yy * W + xx
      if (held[k] || !added(k)) continue
      held[k] = 1
      if (out[k]! >= 0.3) queue.push(k)   // a faint join stays beside the piece, but nothing reaches further through it
    }
  }
  for (let i = 0; i < n; i++) if (added(i) && !held[i]) out[i] = P[i]!
  /* a weave's grain unmixes pixel by pixel into a ragged line: what the colour added outside the trace is evened out over its neighbours
     (3 × 3) — the trace itself and what a cutout took out stay as they are */
  const even = new Float32Array(out)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (core[i] || far[i] || traced[i]! >= 0.5) continue
    let s = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += out[i + dy * W + dx]!
    even[i] = Math.max(P[i]!, (out[i]! + s / 9) / 2)
  }
  return even
}
/** (wave F) A mask with its slivers and scraps dropped: what is thinner than three pixels (an opening over 3 × 3) and a scrap cut off from
    the piece (a few dozen pixels) goes; the soft edge beside what stays is kept. In place. */
function dropSlivers(m: Float32Array, W: number, H: number): void {
  const n = W * H, on = new Uint8Array(n)
  for (let i = 0; i < n; i++) on[i] = m[i]! >= 0.5 ? 1 : 0
  const open = dilate(erode(on, W, H, 1), W, H, 1)
  /* its parts (4-neighbour): a scrap under a quarter of the largest part is not the piece */
  const label = new Int32Array(n).fill(-1), sizes: number[] = [], stack = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    if (!open[i] || label[i]! >= 0) continue
    const id = sizes.length
    let top = 0, size = 0
    stack[top++] = i; label[i] = id
    while (top) {
      const j = stack[--top]!, x = j % W
      size++
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < n && open[k] && label[k]! < 0) { label[k] = id; stack[top++] = k }
    }
    sizes.push(size)
  }
  /* a scrap is a few dozen pixels; a real part cut off by a cutout (an armchair's side panel beside its wooden post) is kept */
  const big = sizes.length ? Math.max(...sizes) : 0, least = Math.max(40, big * 0.002)
  const kept = new Uint8Array(n)
  for (let i = 0; i < n; i++) { const l = label[i]!; if (l >= 0 && sizes[l]! >= least) kept[i] = 1 }
  const near = dilate(kept, W, H, 1)
  for (let i = 0; i < n; i++) if (!near[i]) m[i] = 0
}
