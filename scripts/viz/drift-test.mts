import sharp from 'sharp'
import { guardRender, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { framingMoved, readFraming, reframe } from '../../lib/visualizer/engine/drift.ts'
import { hasBlockingDrift } from '../../lib/visualizer/drift.ts'

/* Dev check (pending modules S20 — the drift guard by rule, lib/visualizer/drift.ts + engine/drift.ts): the camera's framing read off every
   sample room's made-ahead picture, the demo's own edits, and a photo slid and zoomed on purpose — each prints PASS / FAIL, the script exits
   1 on a failure. Pictures go to <outDir> to look at (a look moved on purpose, before and after the guard, each half-blended over the photo).
   (pending modules S43C) The sample rooms' pictures are the engine's own now (scripts/viz/sample-looks.mts) — none moves the camera; 1.0's
   Scandinavian kitchen that did is gone with 1.0's photos, so the guard's repair is shown on a look moved on purpose.
   Usage: npx tsx scripts/viz/drift-test.mts <outDir> */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const out = process.argv[2] ?? '.'
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); return m ? { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) } : fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const load = (url: string) => fromSharp(sharp(`public${url}`))
const save = (img: Img, name: string) => sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 85 }).toFile(`${out}/${name}.jpg`)
const blend = (a: Img, b: Img): Img => { const d = new Uint8ClampedArray(a.data.length); for (let i = 0; i < d.length; i++) d[i] = (a.data[i]! + b.data[i]!) / 2; return { width: a.width, height: a.height, data: d } }
let failed = 0
const check = (ok: boolean, what: string, detail: string) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what} — ${detail}`) }
const fmt = (f: ReturnType<typeof readFraming>) => (f ? `zoom ${f.scale.toFixed(3)} · slide ${(f.dx * 100).toFixed(1)}% ${(f.dy * 100).toFixed(1)}% · lines ${f.base.toFixed(3)} → ${f.best.toFixed(3)}` : 'not the same shape')

const LOOKS = ['scandinavian', 'industrial', 'japandi', 'bohemian', 'dubai-luxury']
const ROOMS: Record<string, string[]> = { 'living-room': [...LOOKS, 'defurnished'], bedroom: [...LOOKS, 'relit-golden-hour'], kitchen: LOOKS }

console.log('1 · every made-ahead picture of a sample room, against its photo')
for (const [room, looks] of Object.entries(ROOMS)) {
  const photo = await load(`/visualizer/samples/${room}/original.jpg`)
  for (const look of looks) {
    const t = Date.now(), f = readFraming(photo, await load(`/visualizer/samples/${room}/${look}.jpg`)), ms = Date.now() - t
    check(!framingMoved(f), `${room} · ${look} keeps its camera`, `${fmt(f)} · ${ms} ms`)
  }
}

console.log('2 · the demo’s own renders keep the camera (the engine never moves it)')
const living = await load('/visualizer/samples/living-room/original.jpg')
for (const url of ['/visualizer/demo/living-room-edit.jpg', '/visualizer/demo/living-room-edit-golden-hour.jpg']) {
  const f = readFraming(living, await load(url))
  check(!framingMoved(f), `${url.split('/').pop()} keeps its camera`, fmt(f))
}

console.log('3 · a photo slid and zoomed on purpose is read, and lined up again')
for (const [scale, dx, dy] of [[0.95, 0.02, 0], [1.04, -0.02, 0.015], [1, 0.03, 0]] as const) {
  const moved = reframe(living, { scale, dx, dy, base: 0, best: 0 })
  const f = readFraming(living, moved)
  check(framingMoved(f), `zoom ${scale} · slide ${dx * 100}% ${dy * 100}% is read as moved`, fmt(f))
  const back = f ? readFraming(living, reframe(moved, f)) : null
  check(!!back && !framingMoved(back) && back.base > (f?.base ?? 1) + 0.05, '…and lined up again it keeps the camera', fmt(back))
}

console.log('4 · the guard, as Generate runs it')
{
  const t = Date.now()
  const photo = await load('/visualizer/samples/kitchen/original.jpg'), look = reframe(await load('/visualizer/samples/kitchen/scandinavian.jpg'), { scale: 1.05, dx: -0.025, dy: 0.012, base: 0, best: 0 })
  mem.set('mem:moved-look', look)
  const g = await guardRender('/visualizer/samples/kitchen/original.jpg', 'mem:moved-look')
  check(!!g && hasBlockingDrift(g.report) && !!g.repaired && !hasBlockingDrift(g.repaired.report), 'the kitchen’s Scandinavian look, moved on purpose: a fault, one repair, the repair clean', `${g?.report.violations[0]?.detail ?? 'no report'} · ${Date.now() - t} ms`)
  const fixed = g?.repaired ? mem.get(g.repaired.dataUrl) ?? null : null
  if (fixed) { await save(blend(photo, look), 'kitchen-moved-before'); await save(blend(photo, fixed), 'kitchen-moved-after'); await save(fixed, 'kitchen-moved-lined-up') }
  const clean = await guardRender('/visualizer/samples/living-room/original.jpg', '/visualizer/demo/living-room-edit.jpg')
  check(!!clean && !hasBlockingDrift(clean.report) && !clean.repaired, 'an edit: no fault, nothing repaired (nothing charged)', clean ? `${clean.report.violations.length} faults` : 'no report')
  const sketch = await guardRender('/visualizer/samples/kitchen/sketch.jpg', '/visualizer/samples/kitchen/japandi.jpg')
  check(!!sketch, 'a pair it can read never throws', sketch ? `${sketch.report.violations.length} faults` : 'null')
}

console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
