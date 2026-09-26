import { downscale, rgbToLab, type Img, type Pt } from './pixels'
import { growRegion, type GrowExtras } from './segment'

/* AI Visualizer engine (REG-673, audit §5.2) — where 1.0's fallback three (Walls · Floor · Ceiling, B-40) sit on a photo nobody curated.

   (audit 2026-09-26, F060 · F180) The reading places seeds, never a band: a region is grown from its seeds and stopped by colour, by
   strong edges and by the other surfaces' colours — no `within` box, so no straight seam across the photo. Walls take several calm
   seeds of the wall colour across the middle band; Floor is read only from the photo's last rows, from the calm colour that holds most
   of them and is neither the walls' own colour nor a black shadow — otherwise the photo has no Floor reading (the studio adds it by
   name or draws it); a ceiling is read from the top rows only, and left out when it is the walls' colour (splitting two
   whites by their light would cut a wall where the light changes, not at the corner). Lightness counts fully (a white bed is not a white wall).

   (verify round 1, F060 · F180 · fresh-tablet) A caption bar across the photo's foot (or head) — a flat band of another colour, with its
   words — is no part of the room: nothing is read from it or painted on it. The walls' seeds come from the upper band only (never a
   white worktop or an island top below them), and a wall's outline is smoothed — no torn-paper teeth where a gradient met the colour
   limit. The floor is read from the calm, low part of the photo by its hue, its lit and its shaded boards together, off the walls' colour.
   Each dot sits inside its own region, near the middle of what it will paint — never on a caption or a lone seed at the edge. */

export type FallbackSurface = { label: 'Walls' | 'Floor' | 'Ceiling'; x: number; y: number; seeds: Pt[]; local: number; global: number
  /** Passed to growRegion as they are (SurfaceDef.grow). */
  grow: GrowExtras
  /** How much of the photo the surface covers as read, 0…1. */
  share?: number }
export type FallbackReading = { walls: FallbackSurface; floor: FallbackSurface | null; ceiling: FallbackSurface | null
  /** The three in paint order, the missing ones left out. */
  surfaces: FallbackSurface[]
  /** The rows (0…1) a caption bar or a border takes at the photo's head and foot — no surface reaches into them. */
  frame?: { top: number; bottom: number } }

type Lab3 = [number, number, number]
type Cand = { x: number; y: number; c: Lab3; calm: number }
const dE = (a: Lab3, b: Lab3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** The photo read as Walls · Floor · Ceiling, each with its seeds and how it grows. */
export function fallbackReading(img: Img): FallbackReading {
  const s = downscale(img, 160)
  const w = s.width, h = s.height
  const lab: Lab3[] = new Array(w * h)
  for (let i = 0; i < w * h; i++) lab[i] = rgbToLab(s.data[i * 4]!, s.data[i * 4 + 1]!, s.data[i * 4 + 2]!)
  const at = (x: number, y: number) => lab[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!
  const calmAt = (x: number, y: number) => { const c = at(x, y); let v = 0; for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) v += dE(at(x + dx, y + dy), c); return v }
  const median = (cs: Lab3[]): Lab3 => [0, 1, 2].map((k) => { const v = cs.map((c) => c[k]!).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0 }) as Lab3

  /* a caption bar or a border: rows at the edge whose colour is one flat band (words on it allowed), unlike the photo beside it */
  const rowMedian = (y: number) => median(Array.from({ length: w }, (_, x) => at(x, y)))
  const share = (y: number, c: Lab3) => { let k = 0; for (let x = 0; x < w; x++) if (dE(at(x, y), c) < 7) k++; return k / w }
  const band = (from: number, step: 1 | -1): number => {
    const first = rowMedian(from)
    let y = from, n = 0, clean = 0
    /* its rows hold the band's colour across most of the width — a row of its words, across a third of it */
    for (let f = share(y, first); n < h * 0.14 && y >= 0 && y < h && f >= 0.35; y += step, n++, f = y >= 0 && y < h ? share(y, first) : 0) if (f >= 0.8) clean++
    if (n < 2 || clean < 2 || n >= h * 0.14 || y < 0 || y >= h) return 0
    /* the room beside it is another colour (a dark bar under a light floor) */
    const room = median(Array.from({ length: 4 }, (_, k) => rowMedian(Math.min(h - 1, Math.max(0, y + step * k)))))
    return dE(room, first) > 12 ? n : 0
  }
  const capB = band(h - 1, -1), capT = band(0, 1)
  const top = capT, bottom = h - 1 - capB   // the rows the room takes
  const span = Math.max(1, bottom - top)
  const rowAt = (f: number) => Math.round(top + f * span)
  const cands = (f0: number, f1: number): Cand[] => {
    const out: Cand[] = []
    for (let y = Math.max(2, rowAt(f0)); y <= Math.min(h - 3, rowAt(f1)); y += 2) for (let x = 2; x < w - 2; x += 2) out.push({ x, y, c: at(x, y), calm: calmAt(x, y) })
    return out
  }
  /** The calmest point near the band's median colour, a little drawn to the middle (1.0's pick). */
  const best = (ps: Cand[], fMid: number): Cand => {
    if (!ps.length) { const x = Math.floor(w / 2), y = Math.min(h - 1, rowAt(fMid)); return { x, y, c: at(x, y), calm: 0 } }   // a sliver of a photo
    const med = median(ps.map((p) => p.c))
    let pick = ps[0]!, score = Infinity
    for (const p of ps) { const d = dE(p.c, med) + p.calm * 0.8 + Math.abs(p.x / w - 0.5) * 6; if (d < score) { score = d; pick = p } }
    return pick
  }
  /** Up to n calm points of one colour, spread across the width. */
  const spread = (ps: Cand[], c: Lab3, tol: number, n: number): Pt[] => {
    const ok = ps.filter((p) => dE(p.c, c) <= tol && p.calm < 10)
    const out: Pt[] = []
    for (let k = 0; k < n; k++) {
      const x0 = (k / n) * w, x1 = ((k + 1) / n) * w
      const inCol = ok.filter((p) => p.x >= x0 && p.x < x1).sort((a, b) => a.calm + dE(a.c, c) - (b.calm + dE(b.c, c)))
      const p = inCol[0]
      if (p) out.push({ x: (p.x + 0.5) / w, y: (p.y + 0.5) / h })
    }
    return out
  }
  const pt = (p: { x: number; y: number }): Pt => ({ x: (p.x + 0.5) / w, y: (p.y + 0.5) / h })
  const apart = (ps: Pt[], r: number) => ps.filter((p, i, all) => all.findIndex((q) => Math.abs(q.x - p.x) < r && Math.abs(q.y - p.y) < r) === i)

  /* the walls: their colour from the middle band, their seeds from the upper one (a white worktop or island top below is not a wall) */
  const wallBand = cands(0.14, 0.5), wallPick = best(cands(0.18, 0.5), 0.36)
  const wallSeeds = apart([pt(wallPick), ...spread(wallBand, wallPick.c, 11, 6)], 0.04)

  const ceilBand = cands(0.01, 0.06), ceilPick = best(ceilBand, 0.03)
  const ceilSeeds = capT === 0 && dE(ceilPick.c, wallPick.c) >= 8 ? apart([pt(ceilPick), ...spread(ceilBand, ceilPick.c, 5, 3)], 0.04) : null

  /* The floor: the calm colour that holds most of the photo's low part, by its hue — a floor lit by a window and shaded away from it is
     one floor — weighted toward the bottom (a floor widens toward the camera; a wall or a cabinet end standing on it narrows or stops),
     neither the walls' own colour nor a black shadow. Read on a very small copy, so a floor's grain or a rug's weave is one colour. */
  const t = downscale(img, 64), tw = t.width, th = t.height
  const tTop = Math.round((top / h) * th), tBot = Math.max(tTop + 1, Math.round(((bottom + 1) / h) * th) - 1)
  const cells: { x: number; y: number; c: Lab3; wt: number; calm: number }[] = []
  const tlab = (x: number, y: number) => { const i = (Math.min(th - 1, Math.max(0, y)) * tw + Math.min(tw - 1, Math.max(0, x))) * 4; return rgbToLab(t.data[i]!, t.data[i + 1]!, t.data[i + 2]!) }
  const y0f = Math.max(tTop, tBot - Math.max(2, Math.round((tBot - tTop) * 0.08)))
  for (let y = y0f; y <= tBot; y++) for (let x = 0; x < tw; x++) {
    const c = tlab(x, y)
    let calm = 0; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) calm += dE(tlab(x + dx, y + dy), c)
    if (c[0] < 12 || dE(c, wallPick.c) <= 8) continue
    cells.push({ x, y, c, wt: 1 + (2 * (y - y0f)) / Math.max(1, tBot - y0f), calm })
  }
  const bins = new Map<string, typeof cells>()
  for (const p of cells) { if (p.calm > 40) continue; const k = `${Math.floor((p.c[1] + 128) / 7)}|${Math.floor((p.c[2] + 128) / 7)}|${p.c[0] > 55 ? 1 : 0}`; const b = bins.get(k); if (b) b.push(p); else bins.set(k, [p]) }
  /* a hue and its neighbours (a floor's colour straddling a bin's edge) */
  const groups = [...bins.entries()].map(([k, b]) => {
    const [a, bb] = k.split('|').map(Number) as [number, number]
    const near = [...bins.entries()].filter(([k2]) => { const [a2, b2] = k2.split('|').map(Number) as [number, number]; return Math.abs(a2 - a) <= 1 && Math.abs(b2 - bb) <= 1 }).flatMap(([, v]) => v)
    /* a floor runs out to the photo's sides; a sofa or a bed standing on it rarely reaches both */
    const sides = (near.some((p) => p.x <= 1) ? 1 : 0) + (near.some((p) => p.x >= tw - 2) ? 1 : 0)
    return { key: k, cells: near, score: near.reduce((t2, p) => t2 + p.wt, 0) * (1 + 0.35 * sides), own: b }
  }).sort((a, b) => b.score - a.score)
  let floorSeeds: Pt[] | null = null
  for (const g of groups.slice(0, 5)) {
    if (g.cells.length < cells.length * 0.12) continue
    /* it reaches the photo's foot — a floor runs to the camera */
    if (!g.cells.some((p) => p.y >= tBot - 1)) continue
    const seeds: Pt[] = []
    for (let k = 0; k < 8; k++) {
      const col = g.cells.filter((p) => p.x >= (k / 8) * tw && p.x < ((k + 1) / 8) * tw).sort((a, b) => a.calm - b.calm || b.y - a.y)[0]
      if (col) seeds.push({ x: (col.x + 0.5) / tw, y: (col.y + 0.5) / th })
    }
    if (seeds.length >= 2) { floorSeeds = seeds; break }
  }

  const walls: FallbackSurface = { label: 'Walls', ...wallSeeds[0]!, seeds: wallSeeds, local: 5, global: 15, grow: { lightWeight: 1, edgeStop: 4, pockets: true, smooth: 2 } }
  const floor: FallbackSurface | null = floorSeeds ? { label: 'Floor', ...floorSeeds[0]!, seeds: floorSeeds, local: 5, global: 11, grow: { lightWeight: 0.55, edgeStop: 5, pockets: true, smooth: 2 } } : null
  const ceiling: FallbackSurface | null = ceilSeeds ? { label: 'Ceiling', ...ceilSeeds[0]!, seeds: ceilSeeds, local: 4, global: 10, grow: { lightWeight: 1, edgeStop: 6, smooth: 1 } } : null
  const surfaces = [walls, floor, ceiling].filter((x): x is FallbackSurface => !!x)
  /* Each surface leaves to the others what is nearer their colour: a white island or worktop is the walls' white, not the floor's. */
  for (const a of surfaces) a.grow.rivals = surfaces.filter((b) => b !== a).flatMap((b) => b.seeds)
  /* A caption bar is never painted. */
  const frame = { top: top / h, bottom: (bottom + 1) / h }
  /* Each dot inside its own region, near the middle of what it paints (grown on a small copy, as the render will) */
  for (const a of surfaces) {
    const m = growRegion(img, a.seeds, { local: a.local, global: a.global, ...a.grow, size: 160, within: [0, frame.top, 1, frame.bottom] })
    const W = img.width, H = img.height
    let sx = 0, sy = 0, c = 0
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) { const v = m[y * W + x]!; if (v > 0.5) { sx += x; sy += y; c++ } }
    a.share = c / Math.ceil(H / 4) / Math.ceil(W / 4)
    if (!c) continue
    const cx = sx / c, cy = sy / c
    let bx = cx, by = cy, bd = Infinity
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) { if (m[y * W + x]! <= 0.9) continue; const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; bx = x; by = y } }
    a.x = bx / W; a.y = by / H
  }
  return { walls, floor, ceiling, surfaces, frame }
}

/** The three dots (1.0's shape), with the full reading beside them (`reading`) — what `fallbackDetection` builds the surfaces from. Floor
    falls back to the bottom band's middle when the reading found none, so the old shape holds; `reading.floor` says when there is none. */
export function fallbackDots(img: Img): { walls: Pt; floor: Pt; ceiling: Pt | null; reading: FallbackReading } {
  const r = fallbackReading(img)
  return { walls: { x: r.walls.x, y: r.walls.y }, floor: r.floor ? { x: r.floor.x, y: r.floor.y } : { x: 0.5, y: 0.92 }, ceiling: r.ceiling ? { x: r.ceiling.x, y: r.ceiling.y } : null, reading: r }
}
