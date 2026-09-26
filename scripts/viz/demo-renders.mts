import sharp from 'sharp'
import { runPass, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Pending } from '../../lib/visualizer/model.ts'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { RELIGHT_PRESETS } from '../../lib/visualizer/lighting.ts'
import { DEMO_EDIT } from '../../lib/visualizer/demo.ts'
import { dominantColour } from '../../lib/visualizer/engine/palette.ts'

/* The demo design's pre-rendered versions (REG-673, repair R61): the edit and its golden-hour relight, made by the very passes the browser's
   Generate runs (engine/run.ts `runPass`, Fast quality, one variant) — only the picture IO is Node's (sharp in, the raw pixels out, saved as
   the browser's JPEG 0.9) — and two swatch crops. Re-run after an engine or living-room sample change, then `npm run db:baseline`.
   Usage: npx tsx scripts/viz/demo-renders.mts */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => {
    const m = mem.get(url)
    if (m) return { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) }
    if (url.startsWith('data:')) return fromSharp(sharp(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')))
    return fromSharp(sharp(`public${url}`))
  },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const save = async (url: string, p: string) => {
  const img = mem.get(url)
  if (!img) throw new Error(`nothing rendered for ${p}`)
  await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 90 }).toFile(`public${p}`)
}

const sample = sampleByKey(DEMO_EDIT.sample)!
const detection = sampleDetection(sample)
const room = { sampleKey: sample.key, detection, name: sample.name }
const resolve = (id: string) => resolveMaterial(id, [], [])
const idOf = (label: string, list: { id: string; label: string }[]) => { const x = list.find((d) => d.label === label); if (!x) throw new Error(`no ${label} in ${sample.key}`); return x.id }
const pending: Pending = {
  ...emptyPending(), variants: 1, quality: 'fast',
  materials: Object.fromEntries(DEMO_EDIT.surfaces.map((s) => [idOf(s.label, detection.surfaces), s.material])),
  furniture: Object.fromEntries(DEMO_EDIT.furniture.map((f) => [idOf(f.label, detection.furniture), { ...f.pick }])),
}
const edit = await runPass({ kind: 'edit', base: { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }, room, pending, resolve })
if ('error' in edit) throw new Error(edit.error)
const v = edit.variants[0]!
await save(v.dataUrl, DEMO_EDIT.image)
const preset = RELIGHT_PRESETS.find((p) => p.id === DEMO_EDIT.relit.preset)!
const relit = await runPass({ kind: 'relight', base: { key: 'demo-edit', url: v.dataUrl, finishes: v.finishes }, room, pending: { ...emptyPending(), variants: 1, lighting: { presetId: preset.id, knobs: preset.knobs, instruction: '' } }, resolve })
if ('error' in relit) throw new Error(relit.error)
await save(relit.variants[0]!.dataUrl, DEMO_EDIT.relit.image)
for (const s of Object.values(DEMO_EDIT.swatches)) {
  const meta = await sharp(`public${s.from}`).metadata()
  const [x0, y0, x1, y1] = s.box, W = meta.width!, H = meta.height!
  await sharp(`public${s.from}`).extract({ left: Math.round(x0 * W), top: Math.round(y0 * H), width: Math.round((x1 - x0) * W), height: Math.round((y1 - y0) * H) }).resize(320, 320, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(`public${s.image}`)
}
for (const [k, s] of Object.entries(DEMO_EDIT.swatches)) {
  const hex = dominantColour(await fromSharp(sharp(`public${s.image}`)))
  console.log(`swatch ${k}: renders as ${hex}${hex.toUpperCase() === s.hex.toUpperCase() ? ' (in step)' : ` — set DEMO_EDIT.swatches.${k}.hex to '${hex}'`}`)
}
console.log(`demo renders written · ${v.applied.surfaces.map((x) => x.name).join(', ')} · ${v.applied.furniture.map((x) => x.desc).join(', ')}${v.applied.caveat ? ` · caveat: ${v.applied.caveat}` : ''}`)
