import sharp from 'sharp'
import { runPass, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Pending } from '../../lib/visualizer/model.ts'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { rgbToLab } from '../../lib/visualizer/engine/pixels.ts'

/* Dev check (wave E, F181 · F028): Remove on the living room, piece by piece, from the Original — each render saved at full size (PNG, no
   JPEG smear to hide a seam) and, beside the photo, the places a Remove used to leave a ghost, enlarged three times. Look at every one.
   The places a Remove used to leave a ghost are also measured (PASS / FAIL; the script exits 1 on a failure).
   Usage: npx tsx scripts/viz/remove-test.mts <outDir> [case…] (default: every case; "sofa+floor" = the sofa with a walnut floor) */
type Img = { width: number; height: number; data: Uint8ClampedArray }
type Box = [number, number, number, number]
const [out = '.', ...only] = process.argv.slice(2)
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); return m ? { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) } : fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const raw = (img: Img) => sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } })
const sample = sampleByKey('living-room')!
const detection = sampleDetection(sample)
const room = { sampleKey: sample.key, detection, name: sample.name }
const resolve = (id: string) => resolveMaterial(id, [], [])
const pieceId = (label: string) => { const f = detection.furniture.find((d) => d.label === label); if (!f) throw new Error(`no ${label}`); return f.id }
const surfaceId = (label: string) => detection.surfaces.find((d) => d.label === label)!.id
const photo = await fromSharp(sharp(`public${sample.original}`))
const made = new Map<string, Img>()
const REMOVE: { action: 'remove' | 'replace' | 'customize'; replacementDesc: string | null; customizeMaterial: string | null; customizeColor: string | null; refImage: string | null } = { action: 'remove', replacementDesc: null, customizeMaterial: null, customizeColor: null, refImage: null }

/** Where each Remove used to go wrong — the crops looked at 3×. */
const CASES: { name: string; pieces: string[]; materials?: Record<string, string>; picks?: Record<string, Partial<typeof REMOVE>>; crops: Record<string, Box> }[] = [
  { name: 'sofa', pieces: ['grey fabric sofa'], crops: { whole: [0.1, 0.45, 0.9, 1], armchair: [0.27, 0.52, 0.42, 0.7], rug: [0.38, 0.64, 0.88, 1], table: [0.44, 0.63, 0.74, 0.8] } },
  { name: 'sofa+floor', pieces: ['grey fabric sofa'], materials: { 'light oak floor': 'floor-006' }, crops: { whole: [0.1, 0.45, 0.9, 1], rug: [0.38, 0.64, 0.88, 1] } },
  { name: 'coffee-table', pieces: ['oak coffee table'], crops: { whole: [0.4, 0.55, 0.9, 0.85], console: [0.5, 0.6, 0.8, 0.73], rug: [0.44, 0.64, 0.76, 0.82] } },
  { name: 'rug', pieces: ['jute area rug'], crops: { whole: [0.35, 0.6, 0.9, 1], throw: [0.58, 0.68, 0.76, 1] } },
  { name: 'armchair', pieces: ['upholstered armchair'], crops: { whole: [0.24, 0.42, 0.44, 0.72], lamp: [0.3, 0.44, 0.36, 0.68] } },
  { name: 'console', pieces: ['oak TV console'], crops: { whole: [0.45, 0.42, 0.82, 0.76] } },
  { name: 'lamp', pieces: ['floor lamp'], crops: { whole: [0.28, 0.44, 0.38, 0.68] } },
  { name: 'fig', pieces: ['fiddle leaf fig in a terracotta pot'], crops: { whole: [0.78, 0.38, 1, 0.78] } },
  { name: 'tv', pieces: ['wall-mounted TV'], crops: { whole: [0.54, 0.42, 0.8, 0.64] } },
  { name: 'art', pieces: ['framed abstract art'], crops: { whole: [0.35, 0.33, 0.46, 0.53] } },
  { name: 'sofa+table', pieces: ['grey fabric sofa', 'oak coffee table'], crops: { whole: [0.1, 0.45, 0.9, 1] } },
  { name: 'sofa+armchair', pieces: ['grey fabric sofa', 'upholstered armchair'], crops: { whole: [0.1, 0.45, 0.9, 1] } },
  /* what is rebuilt of a piece takes a finish laid on it in the same Generate — the wood of it never does */
  { name: 'sofa+chair-replace', pieces: ['grey fabric sofa'], picks: { 'upholstered armchair': { action: 'replace', replacementDesc: 'Mid-Century armchair' } }, crops: { armchair: [0.27, 0.52, 0.42, 0.7] } },
  { name: 'sofa+rug-customize', pieces: ['grey fabric sofa'], picks: { 'jute area rug': { action: 'customize', customizeColor: 'Navy' } }, crops: { whole: [0.1, 0.45, 0.9, 1] } },
]
/** The photo and the render side by side, a box of each, enlarged. */
async function pair(img: Img, [x0, y0, x1, y1]: Box, file: string) {
  const W = img.width, H = img.height, L = Math.round(x0 * W), T = Math.round(y0 * H), w = Math.round((x1 - x0) * W), h = Math.round((y1 - y0) * H)
  const S = Math.max(1, Math.min(4, Math.floor(1000 / Math.max(w, h))))
  const cut = async (x: Img) => raw(x).extract({ left: L, top: T, width: w, height: h }).resize(w * S, h * S, { kernel: 'lanczos3' }).png().toBuffer()
  await sharp({ create: { width: w * S * 2 + 6, height: h * S, channels: 3, background: '#f0f' } }).composite([{ input: await cut(photo), left: 0, top: 0 }, { input: await cut(img), left: w * S + 6, top: 0 }]).png().toFile(file)
}
for (const c of CASES) {
  if (only.length && !only.includes(c.name)) continue
  const furniture = { ...Object.fromEntries(c.pieces.map((l) => [pieceId(l), { ...REMOVE }])), ...Object.fromEntries(Object.entries(c.picks ?? {}).map(([l, f]) => [pieceId(l), { ...REMOVE, ...f }])) }
  const p: Pending = { ...emptyPending(), variants: 1, quality: 'fast', furniture, materials: Object.fromEntries(Object.entries(c.materials ?? {}).map(([l, m]) => [surfaceId(l), m])) }
  const t = Date.now()
  const o = await runPass({ kind: 'edit', base: { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }, room, pending: p, resolve })
  if ('error' in o) { console.log(`${c.name}: ${o.error}`); continue }
  const img = mem.get(o.variants[0]!.dataUrl)!
  await raw(img).png().toFile(`${out}/rm-${c.name}.png`)
  for (const [k, b] of Object.entries(c.crops)) await pair(img, b, `${out}/rm-${c.name}-${k}.png`)
  console.log(`${c.name} · ${Date.now() - t} ms${o.variants[0]!.applied.caveat ? ` · ${o.variants[0]!.applied.caveat}` : ''}`)
  made.set(c.name, img)
}

/* the places a Remove used to leave a ghost, measured (wave E) — the pictures above are still the check; these catch a regression */
let failed = 0
const check = (ok: boolean, what: string, detail: string) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what} — ${detail}`) }
const lab = (im: Img, [x0, y0, x1, y1]: Box) => {
  let r = 0, g = 0, b = 0, n = 0
  for (let y = Math.round(y0 * im.height); y < Math.round(y1 * im.height); y++) for (let x = Math.round(x0 * im.width); x < Math.round(x1 * im.width); x++) { const i = (y * im.width + x) * 4; r += im.data[i]!; g += im.data[i + 1]!; b += im.data[i + 2]!; n++ }
  return rgbToLab(Math.round(r / n), Math.round(g / n), Math.round(b / n))
}
const fmt = (l: number[]) => `L${l[0]!.toFixed(0)} a${l[1]!.toFixed(1)} b${l[2]!.toFixed(1)}`
const sofaRm = made.get('sofa'), tableRm = made.get('coffee-table'), rugRm = made.get('rug'), chairRm = made.get('armchair')
if (sofaRm) {
  /* (wave F) read below the table's shadow — it lies on the laid rug as it lies on the rug beside the throw */
  const laid = lab(sofaRm, [0.46, 0.815, 0.6, 0.87]), seen = lab(sofaRm, [0.72, 0.8, 0.82, 0.9])
  check(Math.abs(laid[0] - seen[0]) < 6 && Math.hypot(laid[1] - seen[1], laid[2] - seen[2]) < 4, 'Sofa out: the rug laid under it reads as the rug that shows', `${fmt(laid)} vs ${fmt(seen)}`)
  const cols: number[] = []; for (let x = 0.62; x < 0.72; x += 0.0034) cols.push(lab(sofaRm, [x, 0.8, x + 0.0034, 0.9])[0])
  let jump = 0; for (let k = 1; k < cols.length; k++) jump = Math.max(jump, Math.abs(cols[k]! - cols[k - 1]!))
  check(jump < 3, 'Sofa out: no seam in the rug where the throw hung', `largest step between neighbouring columns ΔL ${jump.toFixed(1)}`)
  /* (wave F) the join below the table's right leg: the laid rug and the rug beside it the same light and colour (look at the crops for
     the rest — the ribs' run, no strip of the throw's edge) */
  const laidJ = lab(sofaRm, [0.64, 0.82, 0.67, 0.86]), realJ = lab(sofaRm, [0.685, 0.82, 0.715, 0.86])
  check(Math.abs(laidJ[0] - realJ[0]) < 3 && Math.hypot(laidJ[1] - realJ[1], laidJ[2] - realJ[2]) < 3, 'Sofa out: the rug laid under it meets the rug by the table’s leg in one tone', `${fmt(laidJ)} vs ${fmt(realJ)}`)
  const leg = lab(sofaRm, [0.4585, 0.7, 0.4645, 0.745]), rugBy = lab(sofaRm, [0.475, 0.815, 0.5, 0.85])
  check(leg[0] < rugBy[0] - 12, 'Sofa out: the coffee table stands on a front left leg', `leg ${fmt(leg)} vs the rug beside it ${fmt(rugBy)}`)
}
/* (wave F) a rug Customize after the sofa Remove: the laid rug beside where the throw hung reads as the rug beside it — under the table's
   shadow as the rug there is, never a lighter patch */
const navyRm = made.get('sofa+rug-customize')
if (navyRm) {
  const laidS = lab(navyRm, [0.62, 0.78, 0.66, 0.81]), realS = lab(navyRm, [0.69, 0.78, 0.72, 0.81])
  check(Math.abs(laidS[0] - realS[0]) < 3, 'Sofa out + rug Customize: the laid rug by the table’s leg is in the shade the rug beside it has', `${fmt(laidS)} vs ${fmt(realS)}`)
}
if (tableRm) {
  const leg = lab(tableRm, [0.5425, 0.664, 0.5485, 0.683]), gap = lab(tableRm, [0.525, 0.668, 0.535, 0.682])
  check(leg[0] < 40 && leg[2] > gap[2] + 5, 'Coffee table out: the console stands on a left leg, over the dark under it', `leg ${fmt(leg)} vs under the console ${fmt(gap)}`)
  /* (wave F) the floor strip laid beside the console's end is the floor's light, not the wall's (no pale block) */
  const strip = lab(tableRm, [0.485, 0.667, 0.505, 0.678]), floorLeft = lab(tableRm, [0.425, 0.66, 0.445, 0.67])
  check(Math.abs(strip[0] - floorLeft[0]) < 5, 'Coffee table out: the floor beside the console’s end is the floor beside it', `${fmt(strip)} vs ${fmt(floorLeft)}`)
}
if (rugRm) {
  const fringe = lab(rugRm, [0.645, 0.9, 0.665, 0.935]), floor = lab(rugRm, [0.7, 0.9, 0.75, 0.94])
  check(Math.abs(fringe[0] - floor[0]) < 6, 'Rug out: no rug left between the throw’s fringe strands', `fringe zone ${fmt(fringe)} vs the floor ${fmt(floor)}`)
}
/* (wave F) the fig taken out, the console keeps its own shade on the wall beside it */
const figRm = made.get('fig')
if (figRm) {
  const shade = lab(figRm, [0.79, 0.63, 0.81, 0.69]), was = lab(photo, [0.79, 0.63, 0.81, 0.69])
  check(Math.abs(shade[0] - was[0]) < 6, 'Fig out: the console’s shade on the wall right of it stays', `${fmt(shade)} vs the photo’s ${fmt(was)}`)
}
if (chairRm) {
  const wall = lab(chairRm, [0.395, 0.57, 0.41, 0.64]), away = lab(chairRm, [0.425, 0.57, 0.45, 0.64])
  check(Math.abs(wall[0] - away[0]) < 5, 'Armchair out: no ghost of its shade on the wall', `${fmt(wall)} vs ${fmt(away)}`)
  const pole: number[] = []; for (let y = 0.55; y < 0.6; y += 0.0017) pole.push(lab(chairRm, [0.3262, y, 0.3278, y + 0.0017])[0])
  check(Math.max(...pole) - Math.min(...pole) < 10, 'Armchair out: the lamp’s pole runs on even, no pale stub', `pole L ${Math.min(...pole).toFixed(0)}…${Math.max(...pole).toFixed(0)}`)
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed')
process.exit(failed ? 1 : 0)
