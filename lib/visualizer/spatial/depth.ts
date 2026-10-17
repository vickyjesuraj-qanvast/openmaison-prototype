import { CAMERA_M, CEILING_M, frameFor, quadCorners, type Frame } from '../engine/texture'
import { inFront, regionOf } from '../engine/run'
import { downscale, type Img } from '../engine/pixels'
import { surfaceGroupFor } from '../surfaces'
import type { Detection, FurnitureDef, SurfaceDef } from '../model'

/*
 * (pending modules S41 — card studio:ai-sandboxes, 1.0's Visualizer v2 sandbox › Spatial View › Depth; src/app/api/render/depth asked an image
 * model to paint a grey depth map, near white) A PHOTO'S DEPTH, BY RULE — read from the room's own shape, never a model. The engine already
 * knows the camera (engine/texture `frameFor`: the horizon row, the vanishing points and the focal length, read off the walls' outlines; the
 * camera 1.4 m up in a 2.7 m room) and what each pixel is (engine/run `regionOf` over the room's reading). From those, every pixel's distance
 * along the camera's axis, in metres:
 *   · the floor is the ground plane — a row y below the horizon lies f·1.4 / (y − horizon) away; a worktop the same, 0.9 m up; the ceiling
 *     the same, 1.3 m above the eye;
 *   · an upright surface (a wall, a cabinet run, a wardrobe) stands where its foot meets the floor or a worktop (or its head the ceiling),
 *     column by column, one straight line through those (1 / distance is straight across a flat surface in a photo) — its traced outline's
 *     lower corners counting most where they meet the floor; one with neither (upper cabinets over a splashback) takes the surface it is
 *     mounted over or under;
 *   · a piece: a rug lies on the floor; a piece that hangs on a wall (art, a TV, curtains) hangs 4 cm in front of it; a pendant hangs over
 *     what is below it; anything else stands where its foot is seen on the floor — on a nearer piece's top when that is under it (a lamp on
 *     a nightstand), and never behind the wall above it;
 *   · what nobody read (a photo with only Walls · Floor · Ceiling) stands where its column's floor ends — the "pop-up" rule — and any gap left
 *     takes its nearest neighbour.
 * What it can't know it says: a room nobody traced takes the default camera (the horizon at 45 %), and every layer reports its own near and
 * far. A model's map plugs in at `depthOf` (lib/services/registry.ts `depth`). Pure — the developers' bench (/dev/ai-bench) and Node's harness
 * (scripts/viz/spatial-test.mts) run the same code.
 */

export type DepthKind = 'floor' | 'ceiling' | 'level' | 'upright' | 'piece' | 'rest'
export type DepthLayer = { label: string; kind: DepthKind; near: number; far: number; share: number }
export type DepthMap = {
  width: number; height: number
  /** distance along the camera's axis, metres, one per pixel (row-major) */
  metres: Float32Array
  /** what each pixel was read as — `KIND_CODES` (0 nothing read · 1 floor · 2 ceiling · 3 worktop · 4 upright · 5 piece) */
  kinds: Uint8Array
  /** the 1st and 99th percentiles — the map's near and far; every value lies inside them */
  near: number; far: number
  frame: Frame
  /** how the camera was read: off the walls' traced outlines, or the default (a photo nobody traced) */
  camera: 'traced' | 'default'
  layers: DepthLayer[]
  source: Detection['source']
}

/** A pixel's reading as one byte (the bench's "What it read" tints by it). */
export const KIND_CODES: Record<DepthKind, number> = { rest: 0, floor: 1, ceiling: 2, level: 3, upright: 4, piece: 5 }
const WORKTOP_M = 0.9
const ON_WALL_M = 0.04
/** Nothing in a home stands farther than this (a floor seen right up to the horizon would run on for ever). */
const MAX_M = 12
const isRug = (label: string) => /\b(rugs?|carpets?|mats?|runners?)\b/i.test(label)
const onWall = (label: string) => /\b(art|painting|print|frame|framed|mirror|tv|television|curtains?|drapes?|blinds?|sconce|shelf|shelves|clock|poster|canvas)\b/i.test(label)
const fromCeiling = (label: string) => /\b(pendants?|chandeliers?|ceiling (light|fan)|downlights?)\b/i.test(label)
const median = (v: number[]) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]! }

/** Least squares of 1/Z against x (a flat surface in perspective); one pass drops what lies more than 2.5σ off. */
function fitInverse(samples: { x: number; inv: number; w: number }[]): ((x: number) => number) | null {
  const fit = (pts: typeof samples) => {
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0
    for (const p of pts) { sw += p.w; sx += p.w * p.x; sy += p.w * p.inv; sxx += p.w * p.x * p.x; sxy += p.w * p.x * p.inv }
    if (sw <= 0) return null
    const d = sw * sxx - sx * sx
    const b = Math.abs(d) < 1e-9 ? 0 : (sw * sxy - sx * sy) / d
    return { a: (sy - b * sx) / sw, b }
  }
  if (!samples.length) return null
  if (samples.length === 1) { const v = samples[0]!.inv; return () => v }
  let m = fit(samples)
  if (!m) return null
  const mm = m
  const res = samples.map((p) => p.inv - (mm.a + mm.b * p.x))
  const sw = samples.reduce((s, p) => s + p.w, 0)
  const sd = Math.sqrt(res.reduce((s, r, i) => s + r * r * samples[i]!.w, 0) / Math.max(1e-9, sw))
  const kept = samples.filter((_, i) => Math.abs(res[i]!) <= 2.5 * sd + 1e-6)
  if (kept.length >= 2) m = fit(kept) ?? m
  const { a, b } = m
  return (x) => a + b * x
}

/** The depth of every pixel of `photo` (any size; worked at `long` px on its long side) from the room's reading. `key` names the picture
    (the engine caches its regions by it). */
export function depthOf(photo: Img, key: string, reading: Detection, o: { long?: number } = {}): DepthMap {
  const img = downscale(photo, o.long ?? 480)
  const W = img.width, H = img.height, N = W * H
  const rkey = `${key}#depth${W}`
  const surfaces = reading.surfaces.map((s) => ({ s, group: surfaceGroupFor(s.label) }))
  const fr = frameFor(surfaces.map(({ s, group }) => ({ label: s.label, hull: s.region && s.region.length >= 4 ? [s.region] : s.hull, group })), W, H)
  const traced = fr.x1 !== null || surfaces.some(({ s, group }) => !/^(Floor|Ceiling|Countertops|Other|Trim & Moulding)$/.test(group) && (s.hull ?? []).some((p) => !!quadCorners(p, W, H)))
  const f = fr.f, eps = 0.012 * H

  /* what each pixel is: the surfaces (the strongest mask wins), then the pieces painted back to front */
  type Item = { def: SurfaceDef | FurnitureDef; kind: DepthKind; piece: boolean }
  const defs: Item[] = []
  const owner = new Int16Array(N).fill(-1)
  const best = new Float32Array(N)
  for (const { s, group } of surfaces) {
    const kind: DepthKind = group === 'Floor' ? 'floor' : group === 'Ceiling' ? 'ceiling' : group === 'Countertops' ? 'level' : 'upright'
    const idx = defs.push({ def: s, kind, piece: false }) - 1
    const m = regionOf(img, rkey, s, Math.max(W, H), { reading })
    for (let i = 0; i < N; i++) { const v = m[i]!; if (v > 0.5 && v > best[i]!) { best[i] = v; owner[i] = idx } }
  }
  const pieces = [...reading.furniture].sort((a, b) => (inFront(a, b) ? 1 : inFront(b, a) ? -1 : 0))
  for (const p of pieces) {
    const idx = defs.push({ def: p, kind: isRug(p.label) ? 'floor' : 'piece', piece: true }) - 1
    const m = regionOf(img, rkey, p, Math.max(W, H), { reading })
    for (let i = 0; i < N; i++) if (m[i]! > 0.5) owner[i] = idx
  }
  const kindAt = (i: number): DepthKind => (owner[i]! < 0 ? 'rest' : defs[owner[i]!]!.kind)
  const levelAt = (i: number) => { const k = kindAt(i); return k === 'floor' || k === 'level' }
  /* each item's columns: its top and lowest rows */
  const spans = defs.map(() => ({ top: new Int16Array(W).fill(-1), low: new Int16Array(W).fill(-1) }))
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = owner[y * W + x]!; if (o < 0) continue; const s = spans[o]!; if (s.top[x]! < 0) s.top[x] = y; s.low[x] = y }

  /* the horizon, checked where an upright meets BOTH the floor and the ceiling in one column: there the eye's 1.4 m of the room's 2.7 m
     puts it exactly (yh = (foot·1.3 + head·1.4) / 2.7) — so the floor and the ceiling agree on every wall's distance. Too few such columns
     (a twentieth of the photo's width): the frame's own horizon stands. */
  const both: number[] = []
  defs.forEach((d, idx) => {
    if (d.kind !== 'upright') return
    const s = spans[idx]!
    for (let x = 0; x < W; x++) {
      const lo = s.low[x]!, hi = s.top[x]!
      if (lo < 0 || hi < 0) continue
      let foot = false, head = false
      for (let k = 1; k <= 3 && lo + k < H; k++) if (kindAt((lo + k) * W + x) === 'floor') { foot = true; break }
      for (let k = 1; k <= 3 && hi - k >= 0; k++) if (kindAt((hi - k) * W + x) === 'ceiling') { head = true; break }
      if (foot && head) both.push((lo * (CEILING_M - CAMERA_M) + hi * CAMERA_M) / CEILING_M)
    }
  })
  const yh = both.length >= Math.max(4, W * 0.05) ? Math.max(0.2 * H, Math.min(0.75 * H, median(both))) : fr.yh
  const zFloor = (y: number) => (y > yh + eps ? (f * CAMERA_M) / (y - yh) : null)
  const zCeil = (y: number) => (y < yh - eps ? (f * (CEILING_M - CAMERA_M)) / (yh - y) : null)
  const zLevel = (y: number, h: number) => (y > yh + eps ? (f * (CAMERA_M - h)) / (y - yh) : null)
  const farthest = Math.min(MAX_M, (f * CAMERA_M) / Math.max(1, eps * 1.5))
  /* a foot at row y over pixel i below it: on a worktop at its height, else on the floor */
  const footZ = (y: number, below: number) => (kindAt(below) === 'level' ? zLevel(y, WORKTOP_M) : zFloor(y))

  const Z = new Float32Array(N).fill(NaN)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = kindAt(i)
    if (k === 'floor') Z[i] = zFloor(y) ?? farthest
    else if (k === 'ceiling') Z[i] = zCeil(y) ?? farthest
    else if (k === 'level') Z[i] = zLevel(y, WORKTOP_M) ?? NaN
  }

  /* upright surfaces, most trusted first: where they meet the floor or a worktop (a traced outline's lower corners counting most); else the
     upright they are mounted over or under (upper cabinets over a splashback, across a small gap — a hood, a light strip); else where their
     head meets the ceiling (the ceiling's height is the least sure of the room's numbers) */
  const lines = new Map<number, (x: number) => number>()
  const uprightIdx = defs.map((d, i) => (d.kind === 'upright' ? i : -1)).filter((i) => i >= 0)
  type Sample = { x: number; inv: number; w: number }
  const gap = Math.max(4, Math.round(0.05 * H))
  const feetOf = (idx: number): Sample[] => {
    const s = spans[idx]!, out: Sample[] = []
    for (let x = 0; x < W; x++) {
      const lo = s.low[x]!
      if (lo < 0) continue
      for (let k = 1; k <= 3 && lo + k < H; k++) { const b = (lo + k) * W + x; if (levelAt(b)) { const z = footZ(lo, b); if (z) out.push({ x, inv: 1 / z, w: 1 }); break } }
    }
    for (const poly of (defs[idx]!.def as SurfaceDef).hull ?? []) {
      const q = quadCorners(poly, W, H); if (!q) continue
      for (const c of [q[3], q[2]]) {
        const cx = Math.min(W - 1, Math.max(0, Math.round(c.x))), cy = Math.min(H - 1, Math.max(0, Math.round(c.y + 2)))
        if (!levelAt(cy * W + cx)) continue
        const z = zFloor(c.y); if (z) out.push({ x: c.x, inv: 1 / z, w: 40 })
      }
    }
    return out
  }
  const mountedOf = (idx: number): Sample[] => {
    const s = spans[idx]!, out: Sample[] = []
    for (let x = 0; x < W; x++) {
      const lo = s.low[x]!, hi = s.top[x]!
      if (lo < 0) continue
      for (const [from, step] of [[lo, 1], [hi, -1]] as const) for (let k = 1; k <= gap; k++) {
        const y = from + step * k; if (y < 0 || y >= H) break
        const i = y * W + x, o = owner[i]!
        if (o === idx || kindAt(i) === 'rest') continue
        if (kindAt(i) === 'upright') { const l = lines.get(o); if (l) out.push({ x, inv: l(x), w: 1 }) }
        break
      }
    }
    return out
  }
  const headsOf = (idx: number): Sample[] => {
    const s = spans[idx]!, out: Sample[] = []
    for (let x = 0; x < W; x++) {
      const hi = s.top[x]!
      if (hi < 0) continue
      for (let k = 1; k <= 3 && hi - k >= 0; k++) if (kindAt((hi - k) * W + x) === 'ceiling') { const z = zCeil(hi); if (z) out.push({ x, inv: 1 / z, w: 1 }); break }
    }
    return out
  }
  for (const idx of uprightIdx) { const l = fitInverse(feetOf(idx)); if (l) lines.set(idx, l) }
  for (let round = 0; round < 3; round++) for (const idx of uprightIdx) { if (lines.has(idx)) continue; const l = fitInverse(mountedOf(idx)); if (l) lines.set(idx, l) }
  for (const idx of uprightIdx) { if (lines.has(idx)) continue; const l = fitInverse(headsOf(idx)); if (l) lines.set(idx, l) }
  const farWall = (x: number) => { const v = [...lines.values()].map((l) => l(x)).filter((v) => v > 1e-4); return v.length ? 1 / Math.min(...v) : farthest }
  for (const idx of uprightIdx) {
    const s = spans[idx]!, line = lines.get(idx)
    for (let x = 0; x < W; x++) {
      if (s.low[x]! < 0) continue
      const inv = line ? line(x) : 0, z = inv > 1e-4 ? 1 / inv : farWall(x)
      for (let y = s.top[x]!; y <= s.low[x]!; y++) { const i = y * W + x; if (owner[i] === idx) Z[i] = z }
    }
  }

  /* pieces — on the floor where its foot is seen, on the piece its foot stands on, on the wall, or over what is below it */
  const wallAbove = (x: number, y0: number): number | null => {
    for (let y = y0 - 1; y >= 0; y--) { const i = y * W + x, k = kindAt(i); if (k === 'upright' && Number.isFinite(Z[i]!)) return Z[i]!; if (k === 'ceiling') return null }
    return null
  }
  const pieceIdx = defs.map((d, i) => (d.kind === 'piece' ? i : -1)).filter((i) => i >= 0)
  const done = new Set<number>()
  const place = (idx: number, round: number): boolean => {
    const d = defs[idx]!, s = spans[idx]!, label = d.def.label
    const cols: number[] = []
    for (let x = 0; x < W; x++) if (s.low[x]! >= 0) cols.push(x)
    if (!cols.length) return true
    const width = cols[cols.length - 1]! - cols[0]! + 1
    let at: ((x: number) => number) | null = null
    if (onWall(label)) {
      const per = new Map<number, number>()
      for (const x of cols) { const z = wallAbove(x, s.top[x]!) ?? (() => { for (let y = s.low[x]! + 1; y < H; y++) { const i = y * W + x; if (kindAt(i) === 'upright' && Number.isFinite(Z[i]!)) return Z[i]! } return null })(); if (z) per.set(x, z) }
      const med = median([...per.values()])
      if (Number.isFinite(med)) at = (x) => Math.max(0.3, (per.get(x) ?? med) - ON_WALL_M)
    } else if (fromCeiling(label)) {
      /* a pendant hangs over what is below it — the first worktop, table or floor under it (the wall seen behind its cord is farther) */
      const under: number[] = []
      for (const x of cols) for (let y = s.low[x]! + 1; y < H; y++) { const i = y * W + x, k = kindAt(i); if (owner[i] === idx || (k !== 'level' && k !== 'floor' && k !== 'piece')) continue; if (Number.isFinite(Z[i]!)) { under.push(Z[i]!); break } }
      const med = median(under)
      if (Number.isFinite(med)) at = () => med
    } else {
      const seen: { x: number; z: number }[] = [], on: number[] = [], wall: number[] = []
      let edge = false
      for (const x of cols) {
        const below = s.low[x]! + 1
        if (below >= H) { edge = true; continue }
        const b = below * W + x, k = kindAt(b)
        if (k === 'floor' || k === 'level') { const z = footZ(s.low[x]!, b); if (z) seen.push({ x, z }) }
        else if (k === 'piece' && owner[b]! < idx && Number.isFinite(Z[b]!)) on.push(Z[b]!)   // stands on a piece behind it; one in front only hides the foot
        else if (k === 'upright' && Number.isFinite(Z[b]!)) wall.push(Z[b]! - ON_WALL_M)
      }
      if (seen.length) {
        const zs = seen.map((p) => p.z).sort((a, b) => a - b), zc = zs[Math.floor(zs.length * 0.25)]!
        const spanX = seen[seen.length - 1]!.x - seen[0]!.x
        const line = width >= 0.15 * W && spanX >= 0.35 * width ? fitInverse(seen.map((p) => ({ x: p.x, inv: 1 / p.z, w: 1 }))) : null
        const lo = zs[0]! * 0.9, hi = zs[zs.length - 1]! * 1.1, x0 = seen[0]!.x, x1 = seen[seen.length - 1]!.x
        at = line ? (x) => { const inv = line(Math.min(x1, Math.max(x0, x))); return inv > 1e-4 ? Math.min(hi, Math.max(lo, 1 / inv)) : zc } : () => zc
      } else if (on.length) { const z = median(on); at = () => z }
      else if (round >= 1 && wall.length) { const z = median(wall); at = () => z }
      else if (round >= 2 && edge) { const z = (zFloor(H - 1) ?? 1) * 0.95; at = () => z }
      else if (round >= 2) {
        const p = d.def as FurnitureDef, foot = p.box ? p.box[3] * H : Math.max(...cols.map((x) => s.low[x]!))
        const z = zFloor(foot) ?? farthest; at = () => z
      }
    }
    if (!at && round < 2) return false
    for (const x of cols) {
      const behind = onWall(label) ? null : wallAbove(x, s.top[x]!)   // what shows above a piece — even a pendant's cord — stands behind it
      const z0 = at ? at(x) : farthest
      const z = behind ? Math.min(z0, behind - ON_WALL_M) : z0
      for (let y = s.top[x]!; y <= s.low[x]!; y++) { const i = y * W + x; if (owner[i] === idx) Z[i] = z }
    }
    return true
  }
  for (let round = 0; round < 3; round++) for (const idx of pieceIdx) { if (done.has(idx)) continue; if (place(idx, round)) done.add(idx) }

  /* what nobody read: below the horizon it stands where its column's floor ends; any gap left takes its nearest known neighbour */
  for (let x = 0; x < W; x++) {
    let foot: number | null = null
    for (let y = H - 1; y >= 0; y--) {
      const i = y * W + x, k = kindAt(i)
      if (k !== 'rest') { foot = null; continue }
      if (foot === null && y > yh + eps) { const b = y + 1; foot = b >= H ? zFloor(H - 1) : levelAt(b * W + x) ? footZ(y, b * W + x) : null }
      if (foot !== null) { const behind = wallAbove(x, y); Z[i] = behind ? Math.min(foot, behind) : foot }
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const fwd = pass === 0
    for (let yy = 0; yy < H; yy++) {
      const y = fwd ? yy : H - 1 - yy
      for (let xx = 0; xx < W; xx++) {
        const x = fwd ? xx : W - 1 - xx, i = y * W + x
        if (Number.isFinite(Z[i]!)) continue
        const a = fwd ? (x > 0 ? Z[i - 1]! : NaN) : (x < W - 1 ? Z[i + 1]! : NaN)
        const b = fwd ? (y > 0 ? Z[i - W]! : NaN) : (y < H - 1 ? Z[i + W]! : NaN)
        const v = Number.isFinite(a) && Number.isFinite(b) ? Math.max(a, b) : Number.isFinite(a) ? a : b
        if (Number.isFinite(v)) Z[i] = v
      }
    }
  }
  for (let i = 0; i < N; i++) Z[i] = Number.isFinite(Z[i]!) ? Math.min(MAX_M, Z[i]!) : farthest

  /* the map's near and far (1st · 99th percentile), every value kept inside them */
  const sorted = Float32Array.from(Z).sort()
  const near = Math.max(0.3, sorted[Math.floor(N * 0.01)]!), far = Math.max(near + 0.5, sorted[Math.min(N - 1, Math.floor(N * 0.99))]!)
  for (let i = 0; i < N; i++) Z[i] = Math.min(far, Math.max(near, Z[i]!))

  const kinds = new Uint8Array(N)
  for (let i = 0; i < N; i++) kinds[i] = KIND_CODES[kindAt(i)]
  const layers: DepthLayer[] = defs.map((d, idx) => {
    let lo = Infinity, hi = -Infinity, n = 0
    for (let i = 0; i < N; i++) if (owner[i] === idx) { const z = Z[i]!; if (z < lo) lo = z; if (z > hi) hi = z; n++ }
    return { label: d.def.label, kind: d.kind, near: n ? lo : 0, far: n ? hi : 0, share: n / N }
  }).filter((l) => l.share > 0)
  return { width: W, height: H, metres: Z, kinds, near, far, frame: { ...fr, yh }, camera: traced ? 'traced' : 'default', layers, source: reading.source }
}

/** The map as 1.0's picture: grey, near white and far black (by 1 / distance, so the room's near half keeps its detail). */
export function depthPicture(d: DepthMap): Img {
  const out = { width: d.width, height: d.height, data: new Uint8ClampedArray(d.width * d.height * 4) }
  const inN = 1 / d.near, inF = 1 / d.far
  for (let i = 0; i < d.metres.length; i++) {
    const v = Math.round(((1 / d.metres[i]! - inF) / Math.max(1e-6, inN - inF)) * 255)
    out.data[i * 4] = v; out.data[i * 4 + 1] = v; out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255
  }
  return out
}

/** Metres as the bench says them: "2.4 m", "12 m". */
export const metresWord = (m: number) => `${m < 10 ? m.toFixed(1) : Math.round(m)} m`
