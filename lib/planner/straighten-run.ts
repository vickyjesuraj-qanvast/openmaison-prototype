import { FALLBACK_SHARE, cleanPlanImageData, cropToContent, estimateSkewGray, findPaper, flattenPlanBackground, footprintShare, grayOf, type RasterRGBA } from './straighten'

/*
 * (pending modules S28 — card studio:floorplan-isometric-ai) Make a 3D picture's straightening, start to end, on any 2D canvas — the
 * browser's (components/planner/photo/straighten-photo.ts) and Node's (@napi-rs/canvas, scripts/planner/straighten-test.mts), so the
 * harness checks exactly what the studio's browser runs. 1.0's order (src/lib/render/floorplan-pipeline.ts `prepareScan`):
 *   1. the sheet of paper found and cut out (1.0: scanic's ML paper finder; here `findPaper`, by rule) — everything off the sheet white, the
 *      sheet turned square and cropped to it;
 *   2. the tilt left read from the walls on it (1.0's two-pass `estimateSkewGray`);
 *   3. 1.0's bake: the paper's shading divided away and its levels stretched on the picture before it turns, then the turn (and a quarter
 *      more per press of Turn a quarter), then the crop to what is drawn.
 * `clean` off ("Straighten and clean it" off) takes only the quarter turns. The plan's footprint is read last, for the floor area's size.
 */

export type Ctx2D = {
  fillStyle: unknown
  fillRect(x: number, y: number, w: number, h: number): void
  drawImage(img: never, ...a: number[]): void
  getImageData(x: number, y: number, w: number, h: number): RasterRGBA
  putImageData(d: never, x: number, y: number): void
  translate(x: number, y: number): void
  rotate(r: number): void
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  save(): void
  restore(): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
  clip(): void
}
export type Can = { width: number; height: number; getContext(t: '2d', o?: { willReadFrequently?: boolean }): unknown }
export type Make = (w: number, h: number) => Can
export type StraightenOut = { canvas: Can; angle: number; paper: boolean; share: number; read: boolean }

const ctxOf = (c: Can): Ctx2D => c.getContext('2d', { willReadFrequently: true }) as Ctx2D
const draw = (g: Ctx2D, img: Can, ...a: number[]) => g.drawImage(img as never, ...a)

/** `src` turned clockwise by `deg` on white, on a canvas big enough for it — and where a point of `src` lands on it. */
function turnedBy(make: Make, src: Can, deg: number): { canvas: Can; map: (p: [number, number]) => [number, number] } {
  if (!deg) return { canvas: src, map: (p) => p }
  const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad)
  const W = Math.max(1, Math.round(src.width * Math.abs(cos) + src.height * Math.abs(sin))), H = Math.max(1, Math.round(src.width * Math.abs(sin) + src.height * Math.abs(cos)))
  const out = make(W, H), g = ctxOf(out)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  g.translate(W / 2, H / 2); g.rotate(rad); draw(g, src, -src.width / 2, -src.height / 2); g.setTransform(1, 0, 0, 1, 0, 0)
  const cx = src.width / 2, cy = src.height / 2
  return { canvas: out, map: ([x, y]) => [W / 2 + (x - cx) * cos - (y - cy) * sin, H / 2 + (x - cx) * sin + (y - cy) * cos] }
}
function cropped(make: Make, src: Can, b: { x: number; y: number; w: number; h: number }): Can {
  const x = Math.max(0, Math.round(b.x)), y = Math.max(0, Math.round(b.y))
  const w = Math.max(1, Math.min(src.width - x, Math.round(b.w))), h = Math.max(1, Math.min(src.height - y, Math.round(b.h)))
  const out = make(w, h), g = ctxOf(out)
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h)
  draw(g, src, x, y, w, h, 0, 0, w, h)
  return out
}

/** The plan made straight and clean (see above), at most `edge` pixels on its long side. Never throws on a plan that won't read: it keeps it as it came. */
export function straightenCanvas(make: Make, src: Can, o: { clean: boolean; quarter: number; edge: number; /** (S42 D·1) off: the sheet is already cut out and squared by its corners — step 1 is skipped */ paper?: boolean }): StraightenOut {
  const q = ((Math.round(o.quarter) % 4) + 4) % 4
  let base = src, paperTurn = 0, paper = false, tilt = 0
  if (o.clean) {
    /* 1 · the sheet of paper, alone and square */
    const p = o.paper === false ? null : findPaper(ctxOf(src).getImageData(0, 0, src.width, src.height))
    if (p) {
      const masked = make(src.width, src.height), m = ctxOf(masked)
      m.fillStyle = '#ffffff'; m.fillRect(0, 0, src.width, src.height)
      m.save(); m.beginPath(); p.corners.forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y))); m.closePath(); m.clip(); draw(m, src, 0, 0); m.restore()
      const t = turnedBy(make, masked, p.angle)
      const pts = p.corners.map(t.map)
      const x0 = Math.min(...pts.map((v) => v[0])), x1 = Math.max(...pts.map((v) => v[0])), y0 = Math.min(...pts.map((v) => v[1])), y1 = Math.max(...pts.map((v) => v[1]))
      const inset = Math.max(x1 - x0, y1 - y0) * 0.012   // the sheet's own edge and its shadow stay off the plan
      base = cropped(make, t.canvas, { x: x0 + inset, y: y0 + inset, w: x1 - x0 - inset * 2, h: y1 - y0 - inset * 2 })
      paperTurn = p.angle; paper = true
    }
    /* 2 · the tilt left, read from the walls on it */
    const { gray, w, h } = grayOf(ctxOf(base).getImageData(0, 0, base.width, base.height), 512)
    try { tilt = estimateSkewGray(gray, w, h) } catch { tilt = 0 }
    if (Math.abs(tilt) < 0.2 || (paper && Math.abs(tilt) > 8)) tilt = 0   // a sheet already square: a big read is the drawing's own diagonals
    /* 3 · the bake: shading and levels before the turn */
    const work = make(base.width, base.height), g = ctxOf(work)
    draw(g, base, 0, 0)
    const data = g.getImageData(0, 0, work.width, work.height)
    flattenPlanBackground(data); cleanPlanImageData(data)
    g.putImageData(data as never, 0, 0)
    base = work
  }
  let out = turnedBy(make, base, tilt + q * 90).canvas
  if (o.clean) { const box = cropToContent(ctxOf(out).getImageData(0, 0, out.width, out.height)); if (box) out = cropped(make, out, box) }
  const k = Math.min(1, o.edge / Math.max(out.width, out.height))
  if (k < 1) { const s = make(Math.max(1, Math.round(out.width * k)), Math.max(1, Math.round(out.height * k))), g = ctxOf(s); g.fillStyle = '#ffffff'; g.fillRect(0, 0, s.width, s.height); draw(g, out, 0, 0, s.width, s.height); out = s }
  const share = footprintShare(ctxOf(out).getImageData(0, 0, out.width, out.height))
  const angle = paperTurn + tilt
  return { canvas: out, angle: Math.abs(angle) < 0.05 ? 0 : angle, paper, share: share ?? FALLBACK_SHARE, read: share !== null }
}
