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
  /* (pending modules S43C) the owner's living room: each piece, the pairs that stand on or in front of each other, a finish laid with them */
  { name: 'sofa', pieces: ['cream bouclé sofa'], crops: { whole: [0, 0.4, 0.6, 1], corner: [0.25, 0.4, 0.45, 0.62], rug: [0.08, 0.6, 0.6, 1] } },
  { name: 'sofa+floor', pieces: ['cream bouclé sofa'], materials: { 'beige stone floor': 'floor-006' }, crops: { whole: [0, 0.4, 0.6, 1] } },
  { name: 'coffee-table', pieces: ['travertine coffee table'], crops: { whole: [0.38, 0.45, 0.65, 0.9] } },
  { name: 'rug', pieces: ['jute area rug'], crops: { whole: [0.05, 0.6, 0.95, 1] } },
  { name: 'armchair', pieces: ['olive velvet armchair'], crops: { whole: [0.55, 0.45, 0.75, 0.72] } },
  { name: 'side-table', pieces: ['walnut side table'], crops: { whole: [0, 0.45, 0.25, 0.95] } },
  { name: 'lamp', pieces: ['mushroom table lamp'], crops: { whole: [0, 0.45, 0.2, 0.7] } },
  { name: 'stool', pieces: ['travertine side table'], crops: { whole: [0.62, 0.5, 0.76, 0.72] } },
  { name: 'tree', pieces: ['potted olive tree'], crops: { whole: [0.26, 0.3, 0.46, 0.56] } },
  { name: 'tv', pieces: ['wall-mounted TV'], crops: { whole: [0.76, 0.18, 1, 0.66] } },
  { name: 'soundbar', pieces: ['black soundbar'], crops: { whole: [0.76, 0.5, 0.96, 0.66] } },
  { name: 'vase', pieces: ['olive branches in a glass vase'], crops: { whole: [0.86, 0.38, 1, 0.7] } },
  { name: 'art', pieces: ['framed abstract art'], crops: { whole: [0.05, 0.05, 0.3, 0.52] } },
  { name: 'sofa+table', pieces: ['cream bouclé sofa', 'travertine coffee table'], crops: { whole: [0, 0.4, 0.7, 1] } },
  { name: 'lamp+side-table', pieces: ['mushroom table lamp', 'walnut side table'], crops: { whole: [0, 0.45, 0.3, 0.95] } },
  { name: 'tv+soundbar', pieces: ['wall-mounted TV', 'black soundbar'], crops: { whole: [0.72, 0.15, 1, 0.7] } },
  /* what a Remove rebuilds of a piece behind takes a finish laid on it in the same Generate */
  { name: 'table+sofa-recolour', pieces: ['travertine coffee table'], picks: { 'cream bouclé sofa': { action: 'customize', customizeColor: 'Navy' } }, crops: { whole: [0.3, 0.45, 0.65, 0.9] } },
  { name: 'sofa+rug-customize', pieces: ['cream bouclé sofa'], picks: { 'jute area rug': { action: 'customize', customizeColor: 'Navy' } }, crops: { whole: [0, 0.4, 0.9, 1] } },
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
/* (pending modules S43C) the owner's living room — the places a Remove could leave a ghost, measured against the room around them */
const sofaRm = made.get('sofa'), tableRm = made.get('coffee-table'), rugRm = made.get('rug'), chairRm = made.get('armchair'), tvRm = made.get('tv'), sideRm = made.get('lamp+side-table')
if (sofaRm) {
  /* the rug laid under the sofa reads as the rug that shows */
  const laid = lab(sofaRm, [0.2, 0.86, 0.3, 0.92]), seen = lab(sofaRm, [0.6, 0.86, 0.7, 0.92])
  check(Math.abs(laid[0] - seen[0]) < 8 && Math.hypot(laid[1] - seen[1], laid[2] - seen[2]) < 5, 'Sofa out: the rug laid under it reads as the rug that shows', `${fmt(laid)} vs ${fmt(seen)}`)
  /* the side wall behind it is the wall above, not a sofa's ghost */
  const wall = lab(sofaRm, [0.15, 0.56, 0.25, 0.6]), above = lab(sofaRm, [0.15, 0.42, 0.25, 0.46])
  check(Math.abs(wall[0] - above[0]) < 10 && Math.hypot(wall[1] - above[1], wall[2] - above[2]) < 5, 'Sofa out: the wall behind it is the wall', `${fmt(wall)} vs ${fmt(above)}`)
  /* the lamp and the side table in front stay as they are */
  const lamp = lab(sofaRm, [0.035, 0.6, 0.065, 0.63]), was = lab(photo, [0.035, 0.6, 0.065, 0.63])
  check(Math.abs(lamp[0] - was[0]) < 3, 'Sofa out: the lamp in front stays', `${fmt(lamp)} vs the photo’s ${fmt(was)}`)
}
if (tableRm) {
  /* the rug is woven back where the table's drum stood, in the light between the sofa's shade on its left and the sun on its right */
  const laid = lab(tableRm, [0.47, 0.75, 0.55, 0.79]), left = lab(tableRm, [0.38, 0.75, 0.44, 0.79]), right = lab(tableRm, [0.62, 0.75, 0.7, 0.79])
  const lo = Math.min(left[0], right[0]) - 3, hi = Math.max(left[0], right[0]) + 3
  check(laid[0] >= lo && laid[0] <= hi && Math.hypot(laid[1] - (left[1] + right[1]) / 2, laid[2] - (left[2] + right[2]) / 2) < 5, 'Coffee table out: the rug is laid where its drum stood, in the light around it', `${fmt(laid)} between ${fmt(left)} and ${fmt(right)}`)
  /* no tabletop or drum left: the drum's place is the rug's own texture (its weave varies), never a flat patch */
  const v: number[] = []; for (let x = 0.47; x < 0.55; x += 0.004) v.push(lab(tableRm, [x, 0.77, x + 0.004, 0.775])[0])
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - v.reduce((p, q) => p + q, 0) / v.length) ** 2, 0) / v.length)
  check(sd > 1.2, 'Coffee table out: the drum’s place carries the rug’s weave', `ΔL spread ${sd.toFixed(1)}`)
}
if (rugRm) {
  const was = lab(rugRm, [0.45, 0.88, 0.6, 0.92]), floor = lab(rugRm, [0.45, 0.955, 0.6, 0.99])
  check(Math.abs(was[0] - floor[0]) < 14 && Math.hypot(was[1] - floor[1], was[2] - floor[2]) < 6, 'Rug out: the floor where it lay is the floor in front of it', `${fmt(was)} vs ${fmt(floor)}`)
}
if (chairRm) {
  const glass = lab(chairRm, [0.6, 0.47, 0.65, 0.52]), beside = lab(chairRm, [0.53, 0.47, 0.57, 0.52])
  check(Math.abs(glass[0] - beside[0]) < 14, 'Armchair out: the balcony behind it, no chair ghost', `${fmt(glass)} vs ${fmt(beside)}`)
}
if (tvRm) {
  const wall = lab(tvRm, [0.85, 0.35, 0.9, 0.45]), above = lab(tvRm, [0.85, 0.12, 0.9, 0.2])
  check(Math.abs(wall[0] - above[0]) < 12 && Math.hypot(wall[1] - above[1], wall[2] - above[2]) < 5, 'TV out: the wall where it hung is the wall above it', `${fmt(wall)} vs ${fmt(above)}`)
}
if (sideRm) {
  const floor = lab(sideRm, [0.03, 0.85, 0.08, 0.89]), front = lab(sideRm, [0.03, 0.95, 0.08, 0.99])
  check(Math.abs(floor[0] - front[0]) < 14, 'Lamp and side table out: the floor where the table stood', `${fmt(floor)} vs ${fmt(front)}`)
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed')
process.exit(failed ? 1 : 0)
