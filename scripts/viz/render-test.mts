import sharp from 'sharp'
import { regionOf, runPass, setImageIO, type PassInput } from '../../lib/visualizer/engine/run.ts'
import { composite, paintAcc, recolor, shadeTarget } from '../../lib/visualizer/engine/recolor.ts'
import { rgbToLab } from '../../lib/visualizer/engine/pixels.ts'
import { polygonMask } from '../../lib/visualizer/engine/segment.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Finishes, type Pending } from '../../lib/visualizer/model.ts'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { RELIGHT_PRESETS } from '../../lib/visualizer/lighting.ts'
import { DEMO_EDIT } from '../../lib/visualizer/demo.ts'

/* Dev check (REG-673; audit 2026-09-26 F179 · F181 · F193): the engine's real passes (`runPass`, Node picture IO) on the living-room
   sample, with assertions — each prints PASS / FAIL and the script exits 1 on a failure. Pictures go to <outDir> to look at.
   · F179 — Empty the room on V2 (sage walls, walnut floor): the wall where the TV and the art hung is sage, the floor where the sofa and
     the rug stood is walnut (no white or oak ghosts of the furniture).
   · F179 · F181 — V2 without the TV and the coffee table: the sofa in front of the table is untouched; the TV's wall is sage.
   · F193 — the back wall and the ceiling painted navy in one pass: no seam along their shared edge (and the old one-after-another
     painting, measured the same way, shows why).
   Usage: npx tsx scripts/viz/render-test.mts <outDir> */
type Img = { width: number; height: number; data: Uint8ClampedArray }
type Box = [number, number, number, number]
const out = process.argv[2] ?? '.'
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); return m ? { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) } : fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const pic = (url: string) => mem.get(url) ?? null
const save = (img: Img, name: string) => sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 85 }).toFile(`${out}/${name}.jpg`)
let failed = 0
const check = (ok: boolean, what: string, detail: string) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what} — ${detail}`) }
/** Mean Lab inside a box (0…1), optionally only where `keep` is set. */
function labIn(img: Img, [x0, y0, x1, y1]: Box, keep?: (i: number) => boolean): [number, number, number] {
  let r = 0, g = 0, b = 0, c = 0
  for (let y = Math.round(y0 * img.height); y < Math.round(y1 * img.height); y++) for (let x = Math.round(x0 * img.width); x < Math.round(x1 * img.width); x++) {
    const i = y * img.width + x; if (keep && !keep(i)) continue
    r += img.data[i * 4]!; g += img.data[i * 4 + 1]!; b += img.data[i * 4 + 2]!; c++
  }
  return rgbToLab(Math.round(r / c), Math.round(g / c), Math.round(b / c))
}
/** Hue and chroma distance (lightness left out — a wall is darker behind where the TV hung, as paint is). */
const chromaGap = (a: number[], b: number[]) => Math.hypot(a[1]! - b[1]!, a[2]! - b[2]!)
const fmt = (l: number[]) => `L${l[0]!.toFixed(0)} a${l[1]!.toFixed(1)} b${l[2]!.toFixed(1)}`

const sample = sampleByKey('living-room')!
const detection = sampleDetection(sample)
const room = { sampleKey: sample.key, detection, name: sample.name }
const resolve = (id: string) => resolveMaterial(id, [], [])
const id = (label: string, list: { id: string; label: string }[]) => list.find((d) => d.label === label)!.id
const pend = (p: Partial<Pending>): Pending => ({ ...emptyPending(), variants: 1, ...p })
async function pass(kind: PassInput['kind'], base: { key: string; url: string; finishes: Finishes }, p: Pending) {
  const t = Date.now(), o = await runPass({ kind, base, room, pending: p, resolve })
  if ('error' in o) throw new Error(`${kind}: ${o.error}`)
  const v = o.variants[0]!
  console.log(`      ${kind} · ${Date.now() - t} ms${v.applied.caveat ? ` · ${v.applied.caveat}` : ''}`)
  return { ...v, img: pic(v.dataUrl)! }
}
const original = { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }

/* V2 — the demo edit */
const v2 = await pass('edit', original, pend({
  materials: Object.fromEntries(DEMO_EDIT.surfaces.map((s) => [id(s.label, detection.surfaces), s.material])),
  furniture: Object.fromEntries(DEMO_EDIT.furniture.map((f) => [id(f.label, detection.furniture), { ...f.pick }])),
}))
await save(v2.img, 'test-v2')
const V2 = { key: 'v2', url: v2.dataUrl, finishes: v2.finishes }
const sage = labIn(v2.img, [0.8, 0.3, 0.9, 0.4]), walnut = labIn(v2.img, [0.9, 0.85, 0.98, 0.95])
console.log(`      V2 sage wall ${fmt(sage)} · walnut floor ${fmt(walnut)}`)

/* F179 — Empty the room on V2 */
const empty = await pass('empty', V2, pend({ tool: 'empty' }))
await save(empty.img, 'test-v2-empty')
for (const [what, box] of [['old TV', [0.6, 0.48, 0.7, 0.57]], ['old art', [0.38, 0.38, 0.43, 0.48]], ['old armchair', [0.31, 0.56, 0.37, 0.62]]] as [string, Box][]) {
  const l = labIn(empty.img, box)
  check(chromaGap(l, sage) < 8, `F179 Empty on V2: the wall where the ${what} was is sage`, `${fmt(l)} vs ${fmt(sage)}, Δab ${chromaGap(l, sage).toFixed(1)}`)
}
const oak = labIn(await fromSharp(sharp(`public${sample.original}`)), [0.9, 0.85, 0.98, 0.95])
for (const [what, box] of [['sofa', [0.3, 0.8, 0.45, 0.9]], ['rug', [0.72, 0.8, 0.8, 0.9]]] as [string, Box][]) {
  const l = labIn(empty.img, box)
  check(chromaGap(l, walnut) < 6 && chromaGap(l, walnut) < chromaGap(l, oak) && Math.abs(l[0] - walnut[0]) < 12, `F179 Empty on V2: the floor where the ${what} stood is walnut, not the photo’s oak`, `${fmt(l)} vs walnut ${fmt(walnut)} (Δab ${chromaGap(l, walnut).toFixed(1)}), oak ${fmt(oak)} (Δab ${chromaGap(l, oak).toFixed(1)})`)
}

/* F179 · F181 — V2 without the TV and the coffee table */
const rm = await pass('edit', V2, pend({ furniture: { [id('wall-mounted TV', detection.furniture)]: { action: 'remove', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null }, [id('oak coffee table', detection.furniture)]: { action: 'remove', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null } } }))
await save(rm.img, 'test-v2-remove-tv-table')
const tvWall = labIn(rm.img, [0.6, 0.48, 0.7, 0.57])
check(chromaGap(tvWall, sage) < 8, 'F179 Remove on V2: the TV’s wall is sage', `${fmt(tvWall)} vs ${fmt(sage)}`)
const sofa = sample.furniture.find((f) => f.label === 'grey fabric sofa')!, table = sample.furniture.find((f) => f.label === 'oak coffee table')!
const W = rm.img.width, H = rm.img.height
const inSofa = polygonMask(W, H, sofa.cut!), inTable = polygonMask(W, H, table.cut!)
let diff = 0, n = 0, worst = 0
for (let i = 0; i < W * H; i++) {
  if (inSofa[i]! < 0.99 || inTable[i]! > 0) continue
  const p = i * 4, d = (Math.abs(rm.img.data[p]! - v2.img.data[p]!) + Math.abs(rm.img.data[p + 1]! - v2.img.data[p + 1]!) + Math.abs(rm.img.data[p + 2]! - v2.img.data[p + 2]!)) / 3
  diff += d; n++; if (d > worst) worst = d
}
check(diff / n < 0.5, 'F181 Remove on V2: the sofa in front of the coffee table is untouched', `mean |Δ| ${(diff / n).toFixed(2)} over ${n} px, worst ${worst.toFixed(0)}`)

/* (round 2) Remove and a new floor in one Generate, from the Original: the sofa's footprint is the same walnut as the floor around it */
const both = await pass('edit', original, pend({ materials: { [id('light oak floor', detection.surfaces)]: 'floor-006' }, furniture: { [id('grey fabric sofa', detection.furniture)]: { action: 'remove', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null } } }))
await save(both.img, 'test-floor-and-remove')
const footprint = labIn(both.img, [0.3, 0.9, 0.38, 0.97]), around = labIn(both.img, [0.9, 0.85, 0.98, 0.95])   // the floor the sofa stood on, out of the window's sunlit patch (the rug goes on under its right half)
/* (verify round 1) …and the rug that goes on under the sofa stays the rug — the new floor never paints its weave */
const rugUnder = labIn(both.img, [0.45, 0.76, 0.6, 0.85]), rugSeen = labIn(both.img, [0.72, 0.8, 0.82, 0.9])
check(chromaGap(rugUnder, rugSeen) < 6, 'Remove + walnut floor: the rug under the sofa is the rug, not walnut', `${fmt(rugUnder)} vs the rug ${fmt(rugSeen)} (Δab ${chromaGap(rugUnder, rugSeen).toFixed(1)})`)
check(chromaGap(footprint, around) < 5 && Math.abs(footprint[0] - around[0]) < 10 && chromaGap(footprint, around) < chromaGap(footprint, oak), 'Remove + walnut floor from the Original: the sofa’s footprint is the walnut around it, not the photo’s oak', `${fmt(footprint)} vs ${fmt(around)} (Δab ${chromaGap(footprint, around).toFixed(1)}), oak ${fmt(oak)} (Δab ${chromaGap(footprint, oak).toFixed(1)})`)

/* (D3, verify round 1) a finish that names a part paints that part only: the fig's pot, never its leaves; the TV's frame, never its screen */
const orig0 = await fromSharp(sharp(`public${sample.original}`))
const meanDiff = (a: Img, b: Img, poly: { x: number; y: number }[]) => { const m = polygonMask(a.width, a.height, poly); let d = 0, n = 0; for (let i = 0; i < m.length; i++) { if (m[i]! < 0.99) continue; const q = i * 4; d += (Math.abs(a.data[q]! - b.data[q]!) + Math.abs(a.data[q + 1]! - b.data[q + 1]!) + Math.abs(a.data[q + 2]! - b.data[q + 2]!)) / 3; n++ } return n ? d / n : 0 }
const cz = (label: string, p: Record<string, string>) => pass('edit', original, pend({ furniture: { [id(label, detection.furniture)]: { action: 'customize', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null, ...p } } }))
const fig = await cz('fiddle leaf fig in a terracotta pot', { customizeMaterial: 'Matte black pot', customizeColor: 'Navy' })
const leaves = [{ x: 0.84, y: 0.44 }, { x: 0.93, y: 0.44 }, { x: 0.93, y: 0.55 }, { x: 0.84, y: 0.55 }], pot = [{ x: 0.868, y: 0.68 }, { x: 0.905, y: 0.68 }, { x: 0.905, y: 0.725 }, { x: 0.868, y: 0.725 }]
check(meanDiff(fig.img, orig0, leaves) < 1 && meanDiff(fig.img, orig0, pot) > 40, 'D3 Planter finish: the pot changes, the leaves stay green', `leaves |Δ| ${meanDiff(fig.img, orig0, leaves).toFixed(1)}, pot |Δ| ${meanDiff(fig.img, orig0, pot).toFixed(1)}`)
const tv = await cz('wall-mounted TV', { customizeMaterial: 'Gloss white' })
const screen = [{ x: 0.59, y: 0.48 }, { x: 0.71, y: 0.48 }, { x: 0.71, y: 0.57 }, { x: 0.59, y: 0.57 }]
check(meanDiff(tv.img, orig0, screen) < 1, 'D3 TV finish: the screen stays a screen', `screen |Δ| ${meanDiff(tv.img, orig0, screen).toFixed(1)}`)

/* F193 — two surfaces painted in one pass meet without a seam */
const orig = pic((await pass('edit', original, pend({ materials: { [id('white painted back wall', detection.surfaces)]: 'paint-004', [id('white ceiling', detection.surfaces)]: 'paint-004' } }))).dataUrl)!
const photo = await fromSharp(sharp(`public${sample.original}`))
const wall = regionOf(photo, sample.original, detection.surfaces.find((s) => s.label === 'white painted back wall')!, 480, { reading: detection })
const ceiling = regionOf(photo, sample.original, detection.surfaces.find((s) => s.label === 'white ceiling')!, 480, { reading: detection })
const navy = resolve('paint-004')!
const seq2: Img = { ...photo, data: new Uint8ClampedArray(photo.data) }
recolor(seq2, wall, navy.hex, 'matte'); recolor(seq2, ceiling, navy.hex, 'matte')
const one: Img = { ...photo, data: new Uint8ClampedArray(photo.data) }, acc = paintAcc(one)
shadeTarget(one, ceiling, navy.hex, 'matte', 1, null, acc); shadeTarget(one, wall, navy.hex, 'matte', 1, null, acc); composite(one, acc)
/** How far the shared edge's pixels stand from the paint on either side of it (the median ΔE of the worst tenth). */
function seam(img: Img): number {
  const L = (i: number) => rgbToLab(img.data[i * 4]!, img.data[i * 4 + 1]!, img.data[i * 4 + 2]!)
  const edge: number[] = []
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x
    if (!(wall[i]! > 0.05 && ceiling[i]! > 0.05)) continue
    const up = L(i - 2 * W), down = L(i + 2 * W), me = L(i)
    const ref = [(up[0] + down[0]) / 2, (up[1] + down[1]) / 2, (up[2] + down[2]) / 2]
    edge.push(Math.hypot(me[0] - ref[0]!, me[1] - ref[1]!, me[2] - ref[2]!))
  }
  edge.sort((a, b) => a - b)
  return edge[Math.floor(edge.length * 0.9)] ?? 0
}
const sSeq = seam(seq2), sOne = seam(one), sPass = seam(orig)
await save(orig, 'test-seam-navy')
check(sOne < 4 && sPass < 4, 'F193 back wall + ceiling in navy: no seam where they meet', `90th-percentile ΔE on the shared edge ${sPass.toFixed(1)} (runPass), ${sOne.toFixed(1)} (composite) — painted one after the other it was ${sSeq.toFixed(1)}`)

/* the light presets, for the eye */
for (const pid of ['golden-hour', 'blue-hour', 'warm-cozy', 'daylight']) {
  const pr = RELIGHT_PRESETS.find((x) => x.id === pid)!
  const r = await pass('relight', original, pend({ lighting: { presetId: pr.id, knobs: pr.knobs, instruction: '' } }))
  await save(r.img, `test-light-${pid}`)
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed')
process.exit(failed ? 1 : 0)
