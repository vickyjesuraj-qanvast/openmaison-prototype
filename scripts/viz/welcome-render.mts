import sharp from 'sharp'
import { runPass, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Pending } from '../../lib/visualizer/model.ts'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { WELCOME_AFTER } from '../../lib/visualizer/welcome-after.ts'

/* (UX audit build, the owner 2026-09-30: "this before and after image looks different … keep one image and do perfect before and after of the
   same image") The AI Visualizer welcome's after (components/visualizer/home/welcome.tsx): the living-room sample's OWN photo, painted by the
   passes the browser's Generate runs (engine/run.ts `runPass`, Fast, one variant) — the demo-renders harness's IO — so the before and the after
   are one photo, pixel for pixel, and the divider shows only what the tool changes. Re-run after an engine or living-room sample change.
   Usage: npx tsx scripts/viz/welcome-render.mts [out path under public/ — default WELCOME_AFTER.image] [walls] [floor] [sofa colour] [sofa material] */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); if (m) return { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) }; return fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const [out = WELCOME_AFTER.image, walls = WELCOME_AFTER.walls, floor = WELCOME_AFTER.floor, colour = WELCOME_AFTER.sofa.colour, material = WELCOME_AFTER.sofa.material] = process.argv.slice(2)
const sample = sampleByKey(WELCOME_AFTER.sample)!
const detection = sampleDetection(sample)
const room = { sampleKey: sample.key, detection, name: sample.name }
/* (pending modules S43C) the owner's living room: its three painted walls (the TV wall's oak panels and the cabinet stay oak) */
const WALLS = ['cream painted side wall', 'cream painted back wall', 'cream painted TV wall']
const idOf = (label: string, list: { id: string; label: string }[]) => { const x = list.find((d) => d.label === label); if (!x) throw new Error(`no ${label}`); return x.id }
const pending: Pending = {
  ...emptyPending(), variants: 1, quality: 'fast',
  materials: { ...Object.fromEntries(WALLS.map((w) => [idOf(w, detection.surfaces), walls])), [idOf('beige stone floor', detection.surfaces)]: floor },
  furniture: { [idOf('cream bouclé sofa', detection.furniture)]: { action: 'customize', customizeColor: colour, customizeMaterial: material, replacementDesc: null, refImage: null } },
}
const r = await runPass({ kind: 'edit', base: { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }, room, pending, resolve: (id) => resolveMaterial(id, [], []) })
if ('error' in r) throw new Error(r.error)
const img = mem.get(r.variants[0]!.dataUrl)!
await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 90 }).toFile(out.startsWith('/') && !out.startsWith('/visualizer') ? out : `public${out}`)
console.log(`welcome after written → ${out} · ${r.variants[0]!.applied.surfaces.map((x) => x.name).join(', ')} · ${r.variants[0]!.applied.furniture.map((x) => x.desc).join(', ')}`)
