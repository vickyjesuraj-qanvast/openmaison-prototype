import { hash2, hexToRgb, labL, labToRgb, rgbToLab, type Box, type Img } from './pixels'
import { sampleTexture, tileLab, type Texture } from './texture'

/* AI Visualizer engine (REG-673, audit §5.3) — recolouring a region while keeping the photo's light. Worked out in Lab: each pixel's
   lightness against the region's average is its shading, and the material's own lightness is scaled by it — so a mid-tone paint reads
   as that paint (a white wall doesn't turn it pastel), a lit patch stays lit and a shadow stays a shadow; the material's colour thins in
   the shadows as real colour does. Gloss lifts the highlights; textured and natural finishes add a faint grain. The mask's soft edge
   blends.

   (audit 2026-09-26, F059 · F187 · F191) The photo's lightness is split in two: its LIGHT (a blur inside the region, so a dark TV next to
   the wall doesn't shade the paint) scales the material, and its fine DETAIL (grain, grout, the boards' joints) is laid back on as much
   as the new material shares it — all of it for paint on a painted wall or walnut on oak, a quarter for walnut on tile, so the old grout
   doesn't print through a new floor. Light above the region's average rolls off on a filmic shoulder instead of clipping: a white paint
   in a sunlit patch keeps its gradient. A laid tile (a wallpaper, a herringbone) follows its surface's perspective (engine/texture). */

export type Sheen = 'matte' | 'gloss' | 'satin' | 'textured' | 'natural'
export type RecolorOpts = {
  /** How much of the photo's fine texture stays: 1 — the old surface's grain and joints (paint on paint, walnut on oak); ~0.25 — the
      material is another kind (tile → wood). Default 1, or 0.35 under a laid tile. */
  detail?: number
  /** (wave E) The picture whose light the finish takes — the untouched photo, when this Generate's surfaces were laid on `img` first
      (a floor that ran a pixel onto a sofa's rail never darkens the sofa's new colour there). Same size as `img`; default `img`. */
  light?: Img
  /** (wave F) Where the colour stands in the surface's light: 'mean' (default) — the colour is the surface's average, so a shadowed floor
      and a sunlit one average to it; 'lit' — the colour is how the surface looks where it is well lit (a reference swatch photographed in
      good light): a walnut swatch gives a walnut-dark floor with lighter sunlit boards, never a honey one. */
  anchor?: 'mean' | 'lit'
}

/** Highlights roll off above L* 80 instead of clipping at 100. */
const KNEE = 80
const shoulder = (y: number) => (y <= KNEE ? y : KNEE + (100 - KNEE) * (1 - Math.exp(-(y - KNEE) / (100 - KNEE))))

/** `texture` (REG-680): a tile laid across the surface — a wallpaper's motif or its photo, a floor's boards; each pixel takes the tile's
    colour where it falls, under the same light. An Img is laid flat on the photo (as before); a Texture follows its surface. */
export function recolor(img: Img, mask: Float32Array, hex: string, sheen: Sheen = 'matte', strength = 1, texture: Img | Texture | null = null, o: RecolorOpts = {}): void {
  shadeInto(img, mask, hex, sheen, strength, texture, o, null)
}

/** (F193) Several surfaces painted in one pass: each one's colour is worked out on the untouched photo and gathered here, then laid in
    one go (`composite`) — no seam of the old paint, and no first surface's paint read as shade by the second. Gathered FRONT TO BACK:
    the first surface lies on top, each next one fills only what those before it leave uncovered. Two outlines sharing a line both
    cover its pixels (segment.ts clips them generously), so together they cover all of it; where two regions truly overlap (a cabinet
    run grown into the wall behind it) the one on top wins outright instead of the two mixing. */
export type PaintAcc = { r: Float32Array; g: Float32Array; b: Float32Array; w: Float32Array }
export const paintAcc = (img: Img): PaintAcc => { const n = img.width * img.height; return { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), w: new Float32Array(n) } }
/** `recolor`'s colour for one surface, gathered into `acc` under the surfaces gathered before it — the picture is left as it is. */
export function shadeTarget(img: Img, mask: Float32Array, hex: string, sheen: Sheen, strength: number, texture: Img | Texture | null, acc: PaintAcc, o: RecolorOpts = {}): void {
  shadeInto(img, mask, hex, sheen, strength, texture, o, acc)
}
/** Lays what `shadeTarget` gathered: each pixel takes its surfaces' colours, as much as they cover it together. */
export function composite(img: Img, acc: PaintAcc): void {
  const d = img.data, n = img.width * img.height
  for (let i = 0; i < n; i++) {
    const w = acc.w[i]!
    if (w <= 0.002) continue
    const a = Math.min(1, w), p = i * 4
    d[p] = d[p]! + (acc.r[i]! / w - d[p]!) * a
    d[p + 1] = d[p + 1]! + (acc.g[i]! / w - d[p + 1]!) * a
    d[p + 2] = d[p + 2]! + (acc.b[i]! / w - d[p + 2]!) * a
  }
}

function shadeInto(img: Img, mask: Float32Array, hex: string, sheen: Sheen, strength: number, texture: Img | Texture | null, o: RecolorOpts, acc: PaintAcc | null): void {
  const W = img.width, H = img.height, d = img.data
  /* where the light is read (`o.light`, the untouched photo) — `d` is what the finish is laid over */
  const s = (o.light && o.light.width === W && o.light.height === H ? o.light : img).data
  /* (wave F) a colour that stands for the lit surface is laid against the surface's well-lit level (its upper quartile), not its mean */
  const hist = o.anchor === 'lit' ? new Uint32Array(101) : null
  /* the region's box, grown by the blur's reach */
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1, sum = 0, cnt = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = mask[i]!
    if (m <= 0.002) continue
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y
    if (m >= 0.5) { const p = i * 4, l = labL(s[p]!, s[p + 1]!, s[p + 2]!); sum += l; cnt++; if (hist) hist[Math.min(100, Math.max(0, Math.round(l)))]!++ }
  }
  if (!cnt || bx1 < 0) return
  const mean = hist ? percentile(hist, cnt, 0.75) : sum / cnt
  const r = Math.max(3, Math.round(W / 110))
  const x0 = Math.max(0, bx0 - r), y0 = Math.max(0, by0 - r), x1 = Math.min(W - 1, bx1 + r), y1 = Math.min(H - 1, by1 + r)
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  /* L* and the region's weight on the box, then the light: a box blur of L* weighted by the region (normalised) */
  const Lb = new Float32Array(bw * bh), Wt = new Float32Array(bw * bh)
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = (y + y0) * W + (x + x0), p = i * 4, k = y * bw + x
    Lb[k] = labL(s[p]!, s[p + 1]!, s[p + 2]!)
    Wt[k] = Math.min(1, mask[i]! * 2)
  }
  const num = boxBlur(mul(Lb, Wt), bw, bh, r), den = boxBlur(Wt, bw, bh, r)
  /* (wave E, surfaces-4 · surfaces-12) the region's own colour just around each pixel — a blur of its firm pixels. A pixel on the region's
     edge is a mix of the region and what borders it (a leaf half over the wall, a sofa's rim over the shadow under it): it takes the new
     finish in place of the region's own colour and keeps the rest — never the old colour's share left as a pale or grey fringe. */
  const rs = Math.max(2, Math.round(W / 300))
  const fw = new Float32Array(bw * bh), fc = [new Float32Array(bw * bh), new Float32Array(bw * bh), new Float32Array(bw * bh)]
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = (y + y0) * W + (x + x0), k = y * bw + x
    if (mask[i]! < 0.9) continue
    fw[k] = 1; fc[0]![k] = s[i * 4]!; fc[1]![k] = s[i * 4 + 1]!; fc[2]![k] = s[i * 4 + 2]!
  }
  const ow = boxBlur(fw, bw, bh, rs), oc = fc.map((a) => boxBlur(a, bw, bh, rs))
  const [Lt, at, bt] = rgbToLab(...hexToRgb(hex))
  const legacy = texture && 'data' in texture ? { ...tileLab(texture), w: texture.width, h: texture.height } : null
  const tex = texture && !('data' in texture) ? texture : null
  const detailGain = o.detail ?? (texture ? 0.35 : 1)
  const T = new Float32Array(3)
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const i = y * W + x, m = mask[i]! * strength
    if (m <= 0.002) continue
    const p = i * 4, k = (y - y0) * bw + (x - x0)
    /* the material here: its flat colour, or the tile's texel (a motif as drawn; a grain around the material's colour) */
    let tL = Lt, ta = at, tb = bt
    if (legacy) { const q = ((y % legacy.h) * legacy.w + (x % legacy.w)) * 3; tL = legacy.lab[q]!; ta = legacy.lab[q + 1]!; tb = legacy.lab[q + 2]! }
    else if (tex && sampleTexture(tex, x, y, T)) {
      if (tex.strength >= 0.999) { tL = T[0]!; ta = T[1]!; tb = T[2]! }
      else { tL = Lt + (T[0]! - tex.mean[0]) * tex.strength; ta = at + (T[1]! - tex.mean[1]) * tex.strength; tb = bt + (T[2]! - tex.mean[2]) * tex.strength }
    }
    const Lp = Lb[k]!, blur = den[k]! > 1e-6 ? num[k]! / den[k]! : Lp
    /* A very dark patch taking a light material (a black cabinet → white lacquer) would amplify its light unevenly; the light is softened
       toward flat the further this texel sits from the patch. Wood and weave keep more of their variation. */
    const gap = Math.abs(Math.log((tL + 4) / (mean + 4)))
    const soften = Math.min(0.45, gap * 0.25) * (sheen === 'natural' || sheen === 'textured' ? 0.5 : 1)
    let light = Math.min(1.8, Math.max(0.15, (blur + 4) / (mean + 4)))
    light = light * (1 - soften) + soften
    let yv = tL * light
    let c = Math.min(1.12, Math.max(0.5, light))   // colour thins in shadow, holds in light
    if (sheen === 'gloss' && light > 1.08) { const g = Math.min(0.45, (light - 1.08) * 1.3); yv += (100 - Math.min(100, yv)) * g; c *= 1 - g }
    if (sheen === 'satin' && light > 1.14) { const g = Math.min(0.22, (light - 1.14) * 0.7); yv += (100 - Math.min(100, yv)) * g; c *= 1 - g }
    const dg = Math.min(1.25, Math.max(0.35, (tL + 4) / (mean + 4))) * detailGain
    /* (wave F) a weave's faint fleck (textured); a wood's grain is its own — the photo's boards and joints kept above (`detail`) or the laid
       tile's — never a synthetic streak down the picture's columns, which cut across a floor's diagonal boards */
    const grain = sheen === 'textured' ? 1 + (hash2(x >> 1, y >> 1) - 0.5) * 0.06 : 1
    let [nr, ng, nb] = labToRgb(Math.min(100, Math.max(0, (shoulder(yv) + (Lp - blur) * dg) * grain)), ta * c, tb * c)
    /* an edge pixel: the finish as it lies on the region's own colour here, in place of that colour — the rest of the pixel stays */
    const e = mask[i]! < 0.95 && ow[k]! > 0.05 ? 1 - Math.min(1, Math.max(0, (mask[i]! - 0.5) / 0.45)) : 0
    if (e > 0) {
      const w = ow[k]!, o0 = oc[0]![k]! / w, o1 = oc[1]![k]! / w, o2 = oc[2]![k]! / w
      const [r0, g0, b0] = labToRgb(Math.min(100, Math.max(0, (shoulder(yv) + (labL(Math.round(o0), Math.round(o1), Math.round(o2)) - blur) * dg) * grain)), ta * c, tb * c)
      const s = e * e * (3 - 2 * e)
      nr += (Math.min(255, Math.max(0, d[p]! + r0 - o0)) - nr) * s
      ng += (Math.min(255, Math.max(0, d[p + 1]! + g0 - o1)) - ng) * s
      nb += (Math.min(255, Math.max(0, d[p + 2]! + b0 - o2)) - nb) * s
    }
    if (acc) { const k = Math.min(1, m) * (1 - acc.w[i]!); if (k <= 0) continue; acc.w[i] = acc.w[i]! + k; acc.r[i] = acc.r[i]! + nr * k; acc.g[i] = acc.g[i]! + ng * k; acc.b[i] = acc.b[i]! + nb * k; continue }
    d[p] = d[p]! + (nr - d[p]!) * m
    d[p + 1] = d[p + 1]! + (ng - d[p + 1]!) * m
    d[p + 2] = d[p + 2]! + (nb - d[p + 2]!) * m
  }
}
const mul = (a: Float32Array, b: Float32Array) => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i]! * b[i]!; return o }
/** The value a share `f` of a 0…100 histogram's `n` counts lies at or below. */
const percentile = (hist: Uint32Array, n: number, f: number) => { let acc = 0; for (let v = 0; v < hist.length; v++) { acc += hist[v]!; if (acc >= f * n) return v } return hist.length - 1 }
/** A separable box blur (running sums, clamped at the edges). */
function boxBlur(f: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(f.length), out = new Float32Array(f.length)
  for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += f[row + Math.min(w - 1, Math.max(0, x))]!; for (let x = 0; x < w; x++) { tmp[row + x] = acc; acc += f[row + Math.min(w - 1, x + r + 1)]! - f[row + Math.max(0, x - r)]! } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!; for (let y = 0; y < h; y++) { out[y * w + x] = acc; acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]! } }
  return out
}

/** Lays `src`'s pixels over `dst` inside the mask — a piece taken out with the room's empty plate. The plate was shot in its own light, so
    it is matched to the photo the way a retoucher would: the light ratio is read in a ring just outside the piece (only where the photo and
    the plate show the same surface — same hue, a plausible brightness), carried smoothly into the piece (push-pull over a coarse grid), and
    the seam is feathered. The plate's floor then meets the photo's floor with no slab and no edge.
    (F028 · F181) `keep` — the pieces that stay: the ring never reads them (a jute rug beside the sofa is not the plate's floor), and where
    the ring reads almost nothing it falls back on the ring's median light instead of the plate as it is (no flat grey box for the TV). */
export function paste(dst: Img, src: Img, mask: Float32Array, keep?: Float32Array, o: { feathered?: boolean; zones?: Float32Array[]; asIs?: boolean } = {}): void {
  const W = dst.width, H = dst.height, n = W * H
  /* (pending modules S43C) a plate cut from the photo itself (`asIs`) has the photo's own light: laid as it is — a ring read beside a piece
     is its shade, never a light to match */
  if (o.asIs) {
    const soft = o.feathered ? mask : featherMask(featherMask(mask, W, H, 4), W, H, 4), D = dst.data, S = src.data
    for (let i = 0; i < n; i++) { const m = soft[i]!; if (m <= 0.002) continue; const p = i * 4; for (let c = 0; c < 3; c++) D[p + c] = D[p + c]! + (S[p + c]! - D[p + c]!) * m }
    return
  }
  const ring = spreadMask(mask, W, H, 18)
  const CW = 96, CH = Math.max(1, Math.round((CW * H) / W)), sx = W / CW, sy = H / CH
  const sum = [new Float32Array(CW * CH), new Float32Array(CW * CH), new Float32Array(CW * CH)], cnt = new Float32Array(CW * CH)
  const D = dst.data, S = src.data
  /* (wave F) surfaces that catch a light of their own (`zones`, 0…1, as the plate shows them — lift passes the floor): each is matched on
     its own part of the ring, so a strip of floor laid beside the wall never takes the wall's light (a pale block); the rest as before */
  const Z = o.zones ?? [], zs = Z.map(() => [new Float32Array(CW * CH), new Float32Array(CW * CH), new Float32Array(CW * CH)]), zc = Z.map(() => new Float32Array(CW * CH))
  const loose: number[][] = [[], [], []]
  let ringN = 0, taken = 0
  for (let i = 0; i < n; i++) {
    if (ring[i]! < 0.5 || mask[i]! > 0.02) continue
    if (keep && keep[i]! > 0.02) continue
    ringN++
    const p = i * 4
    const dr = D[p]! + 6, dg = D[p + 1]! + 6, db = D[p + 2]! + 6, sr = S[p]! + 6, sg = S[p + 1]! + 6, sb = S[p + 2]! + 6
    const dt = dr + dg + db, st = sr + sg + sb, k = dt / st
    if (k < 0.5 || k > 1.9) continue   // not the same surface in the two pictures
    if ((i & 3) === 0) { loose[0]!.push(dr / sr); loose[1]!.push(dg / sg); loose[2]!.push(db / sb) }
    if (Math.abs(dr / dt - sr / st) + Math.abs(dg / dt - sg / st) + Math.abs(db / dt - sb / st) > 0.07) continue   // another hue: a piece the plate lacks
    const x = i % W, y = (i - x) / W, c = Math.min(CH - 1, Math.floor(y / sy)) * CW + Math.min(CW - 1, Math.floor(x / sx))
    sum[0]![c] = sum[0]![c]! + dr / sr; sum[1]![c] = sum[1]![c]! + dg / sg; sum[2]![c] = sum[2]![c]! + db / sb; cnt[c] = cnt[c]! + 1
    for (let z = 0; z < Z.length; z++) if (Z[z]![i]! > 0.5) { const q = zs[z]!; q[0]![c] = q[0]![c]! + dr / sr; q[1]![c] = q[1]![c]! + dg / sg; q[2]![c] = q[2]![c]! + db / sb; zc[z]![c] = zc[z]![c]! + 1 }
    taken++
  }
  const median = (a: number[]) => { if (!a.length) return 1; const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]! }
  const fallback = loose.map(median) as [number, number, number]
  /* too little of the ring reads as the plate's own surface: trust the ring's median light everywhere */
  if (ringN && taken < ringN * 0.01) { for (let c = 0; c < cnt.length; c++) { sum[0]![c] = 0; sum[1]![c] = 0; sum[2]![c] = 0; cnt[c] = 0 } }
  const gain = pushPull(sum, cnt, CW, CH, fallback)
  const zg = Z.map((_, z) => { let t = 0; for (const v of zc[z]!) t += v; return taken >= ringN * 0.01 && t >= 12 ? pushPull(zs[z]!, zc[z]!, CW, CH, fallback) : null })
  const soft = o.feathered ? mask : featherMask(featherMask(mask, W, H, 4), W, H, 4)   // a wide, smooth seam: the plate's boards never line up exactly with the photo's
  for (let i = 0; i < n; i++) {
    const m = soft[i]!
    if (m <= 0.002) continue
    const x = i % W, y = (i - x) / W, p = i * 4
    const gx = Math.min(CW - 1.001, Math.max(0, x / sx - 0.5)), gy = Math.min(CH - 1.001, Math.max(0, y / sy - 0.5))
    const x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0, a = y0 * CW + x0, b = a + (x0 + 1 < CW ? 1 : 0), cc = a + (y0 + 1 < CH ? CW : 0), dd = cc + (x0 + 1 < CW ? 1 : 0)
    for (let ch = 0; ch < 3; ch++) {
      const at = (G: Float32Array) => (G[a]! * (1 - tx) + G[b]! * tx) * (1 - ty) + (G[cc]! * (1 - tx) + G[dd]! * tx) * ty
      let g = at(gain[ch]!), wz = 0, gz = 0
      for (let z = 0; z < Z.length; z++) { const G = zg[z]; if (!G) continue; const w = Z[z]![i]!; if (w > 0.002) { wz += w; gz += w * at(G[ch]!) } }
      if (wz > 0) { const k = Math.min(1, wz); g = g * (1 - k) + (gz / wz) * k }
      D[p + ch] = D[p + ch]! + (Math.min(255, Math.max(0, (S[p + ch]! + 6) * g - 6)) - D[p + ch]!) * m
    }
  }
}

/** Fills a sparse grid of light ratios everywhere, smoothly: sums and counts go down a pyramid to one cell, then each finer level keeps what
    it measured (weighted by how much) and takes the rest from the level above. A grid with nothing measured takes `fallback` (the ring's
    median light), else 1 — the plate as it is. */
function pushPull(sum: Float32Array[], cnt: Float32Array, w: number, h: number, fallback: [number, number, number] = [1, 1, 1]): Float32Array[] {
  type L = { w: number; h: number; s: Float32Array[]; c: Float32Array }
  const levels: L[] = [{ w, h, s: sum.map((a) => Float32Array.from(a)), c: Float32Array.from(cnt) }]
  while (levels[levels.length - 1]!.w > 1 || levels[levels.length - 1]!.h > 1) {
    const f = levels[levels.length - 1]!, nw = Math.max(1, Math.ceil(f.w / 2)), nh = Math.max(1, Math.ceil(f.h / 2))
    const s = [new Float32Array(nw * nh), new Float32Array(nw * nh), new Float32Array(nw * nh)], c = new Float32Array(nw * nh)
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const i = y * f.w + x, j = (y >> 1) * nw + (x >> 1); c[j] = c[j]! + f.c[i]!; for (let k = 0; k < 3; k++) s[k]![j] = s[k]![j]! + f.s[k]![i]! }
    levels.push({ w: nw, h: nh, s, c })
  }
  let val = [0, 1, 2].map((k) => { const t = levels[levels.length - 1]!; return Float32Array.from([t.c[0]! > 0 ? t.s[k]![0]! / t.c[0]! : fallback[k]!]) })
  for (let l = levels.length - 2; l >= 0; l--) {
    const f = levels[l]!, up = levels[l + 1]!, next = [0, 1, 2].map(() => new Float32Array(f.w * f.h))
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      /* the coarser level read bilinearly — a nearest read left the fill in visible blocks */
      const ux = Math.min(up.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), uy = Math.min(up.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5))
      const x0 = Math.floor(ux), y0 = Math.floor(uy), tx = ux - x0, ty = uy - y0, x1 = Math.min(up.w - 1, x0 + 1), y1 = Math.min(up.h - 1, y0 + 1)
      const i = y * f.w + x, wgt = Math.min(1, f.c[i]! / 6)
      for (let k = 0; k < 3; k++) {
        const U = val[k]!, coarse = (U[y0 * up.w + x0]! * (1 - tx) + U[y0 * up.w + x1]! * tx) * (1 - ty) + (U[y1 * up.w + x0]! * (1 - tx) + U[y1 * up.w + x1]! * tx) * ty
        next[k]![i] = (f.c[i]! > 0 ? f.s[k]![i]! / f.c[i]! : 1) * wgt + coarse * (1 - wgt)
      }
    }
    val = next
  }
  /* two soft passes (5 × 5) so the field has no steps a floor could show */
  const blur = (g: Float32Array) => { const o = new Float32Array(g.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0, m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue; t += g[yy * w + xx]!; m++ } o[y * w + x] = t / m } return o }
  return val.map((g) => blur(blur(g)))
}

/** A mask's edge softened by a separable box blur — the seam of a pasted piece disappears into the photo. */
export function featherMask(m: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(m.length), out = new Float32Array(m.length), span = 2 * r + 1
  for (let y = 0; y < H; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += m[y * W + Math.min(W - 1, Math.max(0, x))]!; for (let x = 0; x < W; x++) { tmp[y * W + x] = acc / span; acc += m[y * W + Math.min(W - 1, x + r + 1)]! - m[y * W + Math.max(0, x - r)]! } }
  for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]!; for (let y = 0; y < H; y++) { out[y * W + x] = acc / span; acc += tmp[Math.min(H - 1, y + r + 1) * W + x]! - tmp[Math.max(0, y - r) * W + x]! } }
  return out
}

/** A mask grown outward by `r` pixels and softened — a removed piece takes its shadow with it. */
export function spreadMask(m: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(m.length), out = new Float32Array(m.length)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < W) v = Math.max(v, m[y * W + xx]!) } tmp[y * W + x] = v }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < H) v = Math.max(v, tmp[yy * W + x]!) } out[y * W + x] = v }
  return out
}

/** (F181) A piece's cast shadow: the pixels in a band around it where the photo is darker than the empty plate (beyond the plate's
    overall light) but the same hue — the TV's shade on the wall, the sofa's on the floor. 0…1, to take with the piece. */
export function castShadow(dst: Img, src: Img, mask: Float32Array, keep: Float32Array | undefined, band = 12): Float32Array {
  const W = dst.width, H = dst.height, n = W * H, D = dst.data, S = src.data
  const near = spreadMask(mask, W, H, band), out = new Float32Array(n)
  const ratios: number[] = []
  const lum = (a: Uint8ClampedArray, p: number) => 0.299 * a[p]! + 0.587 * a[p + 1]! + 0.114 * a[p + 2]! + 6
  for (let i = 0; i < n; i += 3) { if (near[i]! < 0.5 || mask[i]! > 0.02 || (keep && keep[i]! > 0.02)) continue; ratios.push(lum(D, i * 4) / lum(S, i * 4)) }
  if (ratios.length < 20) return out
  ratios.sort((a, b) => a - b)
  const g = ratios[Math.floor(ratios.length * 0.6)]!   // the plate's light against the photo's, on the room's own surfaces nearby
  for (let i = 0; i < n; i++) {
    if (near[i]! < 0.5 || mask[i]! > 0.98 || (keep && keep[i]! > 0.02)) continue
    const p = i * 4
    const dr = D[p]! + 6, dg = D[p + 1]! + 6, db = D[p + 2]! + 6, sr = S[p]! + 6, sg = S[p + 1]! + 6, sb = S[p + 2]! + 6
    const dt = dr + dg + db, st = sr + sg + sb
    if (Math.abs(dr / dt - sr / st) + Math.abs(dg / dt - sg / st) + Math.abs(db / dt - sb / st) > 0.05) continue   // another thing, not a shade
    const r = lum(D, p) / (lum(S, p) * g)
    if (r < 0.92) out[i] = Math.min(1, (0.95 - r) / 0.12)
  }
  /* the shade fades out toward the band's edge — a shadow reaching past it never ends in a line */
  const fade = featherMask(spreadMask(mask, W, H, Math.round(band * 0.55)), W, H, Math.max(1, Math.round(band * 0.45)))
  for (let i = 0; i < n; i++) if (out[i]! > 0) out[i] = out[i]! * fade[i]!
  return out
}

/** (F181) Fills `hole` (0…1) on `dst` with `src`'s pixels of the same piece (`own` — where the piece is; `blocked` — what stands in front
    of it there), mirrored across the hole's edge: the part of a piece another one hid is continued from what shows of it next to it —
    above or below (a console's drawer fronts behind a bowl), else beside (a rug behind a table leg) — its grain and its joints run on,
    where the empty plate would only show the floor or the wall behind it. */
export function mendFrom(dst: Img, src: Img, own: Float32Array, hole: Float32Array, blocked?: Float32Array, o: { rowsFirst?: boolean; under?: Img } = {}): void {
  const W = dst.width, H = dst.height, D = dst.data, S = src.data, U = (o.under ?? dst).data
  const shows = (i: number) => own[i]! > 0.5 && hole[i]! <= 0.02 && (!blocked || blocked[i]! <= 0.02)
  const done = new Uint8Array(W * H)
  const put = (i: number, q: number) => {
    /* over the picture as it was before the plate went on (`under`): a soft edge of the hole is the piece and its mend, never a third of plate */
    const p = i * 4, w = Math.min(1, hole[i]!)
    D[p] = U[p]! + (S[q]! - U[p]!) * w; D[p + 1] = U[p + 1]! + (S[q + 1]! - U[p + 1]!) * w; D[p + 2] = U[p + 2]! + (S[q + 2]! - U[p + 2]!) * w
    done[i] = 1
  }
  /* one line (a column, or a row) at a time: `at(k)` its k-th pixel's index, `n` its length */
  const line = (n: number, at: (k: number) => number) => {
    let k = 0
    while (k < n) {
      if (hole[at(k)]! <= 0.02 || done[at(k)]) { k++; continue }
      const a = k
      while (k < n && hole[at(k)]! > 0.02 && !done[at(k)]) k++
      const b = k - 1
      /* enough of the piece to copy — a sliver repeated over a long gap reads as streaks; the other way round may have more */
      const need = Math.max(3, Math.min(16, Math.ceil((b - a + 1) / 2)))
      /* past what the other pass already mended — and past a thin thing standing in front of it (a table's leg on the rug) — then the run
         of the piece showing */
      const skip = (i: number) => done[i] || (!!blocked && blocked[i]! > 0.02 && own[i]! > 0.5)
      let e0 = a - 1; for (let g = 0; e0 >= 0 && skip(at(e0)) && g < 40; g++) e0--
      let e1 = b + 1; for (let g = 0; e1 < n && skip(at(e1)) && g < 40; g++) e1++
      let L = 0, fwd = true
      while (L < 48 && e0 - L >= 0 && shows(at(e0 - L))) L++
      if (L < need) { fwd = false; L = 0; while (L < 48 && e1 + L < n && shows(at(e1 + L))) L++ }
      if (L < need) continue
      for (let j = a; j <= b; j++) {
        const t = (fwd ? j - a : b - j) % (2 * L)
        const sj = fwd ? (t < L ? e0 - t : e0 - L + 1 + (t - L)) : (t < L ? e1 + t : e1 + L - 1 - (t - L))
        put(at(j), at(sj) * 4)
      }
    }
  }
  /* (verify round 1) a piece that runs across the picture (a rug under a sofa's arm, a chair's seat behind cushions) continues along its
     rows first — its weave or its seat, never its back mirrored down */
  const cols = () => { for (let x = 0; x < W; x++) line(H, (k) => k * W + x) }, rows = () => { for (let y = 0; y < H; y++) line(W, (k) => y * W + k) }
  if (o.rowsFirst) { rows(); cols() } else { cols(); rows() }
}
/** (verify round 1) The space under a piece another one hid (below a coffee table's top, its legs in shade): the plate laid there is taken
    down to shadow — a table reads as standing, never as a top floating over a bright floor. */
export function shadeIn(dst: Img, hole: Float32Array, depth = 0.55): void {
  const D = dst.data
  for (let i = 0; i < hole.length; i++) { const w = Math.min(1, hole[i]!) * depth; if (w <= 0.002) continue; const p = i * 4; D[p] = D[p]! * (1 - w); D[p + 1] = D[p + 1]! * (1 - w); D[p + 2] = D[p + 2]! * (1 - w) }
}

/** (verify round 1) Fills `hole` with a piece's own weave, laid from a clean patch of it (`patch`, a 0…1 box) in tiles cross-faded at
    their seams — a rug going on under a sofa taken out, its ribs continuing as they run, never the chevrons a reflection draws. The
    weave is laid on the piece's own light nearby (a wide blur of what shows of it), so a far, dim end stays dim. */
export function textureFill(dst: Img, src: Img, hole: Float32Array, patch: Box, under?: Img, own?: Float32Array): void {
  const W = dst.width, H = dst.height, D = dst.data, S = src.data, U = (under ?? dst).data
  const px0 = Math.round(patch[0] * W), py0 = Math.round(patch[1] * H)
  const pw = Math.max(8, Math.round((patch[2] - patch[0]) * W)), ph = Math.max(8, Math.round((patch[3] - patch[1]) * H))
  const ov = Math.max(4, Math.round(Math.min(pw, ph) * 0.2)), tw = pw - ov, th = ph - ov
  const at = (u: number, v: number, c: number) => S[((Math.min(H - 1, py0 + v)) * W + Math.min(W - 1, px0 + u)) * 4 + c]!
  /* the patch's own light (a blur over it) — only its weave is laid, on the piece's light around the hole (what shows of it, blurred wide
     enough to reach across); no tile carries its shading into the next */
  const pl = [0, 1, 2].map((c) => { const a = new Float32Array(pw * ph); for (let v = 0; v < ph; v++) for (let u = 0; u < pw; u++) a[v * pw + u] = at(u, v, c); return featherMask(featherMask(a, pw, ph, Math.max(2, Math.round(Math.min(pw, ph) / 6))), pw, ph, Math.max(2, Math.round(Math.min(pw, ph) / 6))) })
  const pm = [0, 1, 2].map((c) => { let t = 0; for (const v of pl[c]!) t += v; return t / (pw * ph) })
  const flat = (u: number, v: number, c: number) => at(u, v, c) * ((pm[c]! + 6) / (pl[c]![Math.min(ph - 1, v) * pw + Math.min(pw - 1, u)]! + 6))
  let light: { w: Float32Array; c: Float32Array[] } | null = null
  if (own) {
    const wt = new Float32Array(hole.length), ch = [new Float32Array(hole.length), new Float32Array(hole.length), new Float32Array(hole.length)]
    for (let i = 0; i < hole.length; i++) { if (own[i]! < 0.5 || hole[i]! > 0.02) continue; wt[i] = 1; for (let c = 0; c < 3; c++) ch[c]![i] = S[i * 4 + c]! }
    const r = Math.max(8, Math.round(W * 0.06))
    light = { w: featherMask(featherMask(wt, W, H, r), W, H, r), c: ch.map((a) => featherMask(featherMask(a, W, H, r), W, H, r)) }
  }
  for (let i = 0; i < hole.length; i++) {
    const h = Math.min(1, hole[i]!)
    if (h <= 0.002) continue
    const x = i % W, y = (i - x) / W
    const u = (((x - px0) % tw) + tw) % tw, v = (((y - py0) % th) + th) % th
    const wu = u < ov ? u / ov : 1, wv = v < ov ? v / ov : 1
    const lw = light && light.w[i]! > 1e-3 ? light.w[i]! : 0
    for (let c = 0; c < 3; c++) {
      const row = (vv: number) => wu * flat(u, vv, c) + (1 - wu) * flat(u + tw, vv, c)
      let val = wv * row(v) + (1 - wv) * row(v + th)
      if (lw) val = val * ((light!.c[c]![i]! / lw + 6) / (pm[c]! + 6))
      D[i * 4 + c] = U[i * 4 + c]! + (Math.min(255, Math.max(0, val)) - U[i * 4 + c]!) * h
    }
  }
}
/** (verify round 1) Fills `hole` from the piece's other side, mirrored about its upright axis (`axis`, 0…1 across the photo): an
    armchair's arm and seat hidden behind a sofa's cushions come back as the side that shows — a chair is its own mirror. What the other
    side can't give (it is hidden too, or not the piece) is left for the ordinary mend (returned). */
export function mirrorFill(dst: Img, src: Img, own: Float32Array, hole: Float32Array, blocked: Float32Array | undefined, axis: number, under?: Img): Float32Array {
  const W = dst.width, D = dst.data, S = src.data, U = (under ?? dst).data, left = new Float32Array(hole.length), ax = axis * W
  for (let i = 0; i < hole.length; i++) {
    const h = Math.min(1, hole[i]!)
    if (h <= 0.002) continue
    const x = i % W, y = (i - x) / W, mx = Math.round(2 * ax - x)
    const j = y * W + mx
    if (mx < 0 || mx >= W || own[j]! < 0.5 || hole[j]! > 0.02 || (blocked && blocked[j]! > 0.02)) { left[i] = hole[i]!; continue }
    for (let c = 0; c < 3; c++) D[i * 4 + c] = U[i * 4 + c]! + (S[j * 4 + c]! - U[i * 4 + c]!) * h
  }
  return left
}

/** (verify round 1) Fills `hole` along a strip that runs across the picture at a slope (`slope`, in pixels down per pixel across — a
    console's bottom rail in perspective): each pixel takes the nearest pixel of the piece showing along that line, so the rail's edges run
    on straight instead of stepping as a row-by-row copy would. What it can't reach is returned. */
export function alongFill(dst: Img, src: Img, own: Float32Array, hole: Float32Array, blocked: Float32Array | undefined, slope: number, under?: Img, reach = 400): Float32Array {
  const W = dst.width, H = dst.height, D = dst.data, S = src.data, U = (under ?? dst).data, left = new Float32Array(hole.length)
  const shows = (x: number, y: number) => { if (x < 0 || x >= W || y < 0 || y >= H - 1) return false; const j = Math.round(y) * W + x; return own[j]! > 0.5 && hole[j]! <= 0.02 && (!blocked || blocked[j]! <= 0.02) }
  for (let i = 0; i < hole.length; i++) {
    const h = Math.min(1, hole[i]!)
    if (h <= 0.002) continue
    const x = i % W, y = (i - x) / W
    let found = -1, fy = 0
    for (let t = 1; t <= reach && found < 0; t++) {
      for (const dir of [1, -1]) { const xx = x + dir * t, yy = y + slope * dir * t; if (shows(xx, yy)) { found = xx; fy = yy; break } }
    }
    if (found < 0) { left[i] = hole[i]!; continue }
    const y0 = Math.floor(fy), ty = fy - y0, a = (y0 * W + found) * 4, b = (Math.min(H - 1, y0 + 1) * W + found) * 4
    for (let c = 0; c < 3; c++) { const v = S[a + c]! * (1 - ty) + S[b + c]! * ty; D[i * 4 + c] = U[i * 4 + c]! + (v - U[i * 4 + c]!) * h }
  }
  return left
}
