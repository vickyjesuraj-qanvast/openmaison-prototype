import sharp from 'sharp'
import { runPass, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Pending } from '../../lib/visualizer/model.ts'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { WELCOME_AFTER } from '../../lib/visualizer/welcome-after.ts'
import { TRIAL_CARDS } from '../../lib/visualizer/trial/content.ts'

/* (pending modules S36 — 1.0's trial-start.tsx TOOL_CARDS: "each tool card is a live before → after … dedicated assets rather than borrowing a
   restyle that would misrepresent what the tool does") The two tool cards' afters the sample rooms don't already carry, painted by the passes
   the browser's Generate runs (engine/run.ts `runPass`, Fast, one variant — the welcome-render harness's IO), so each before and after is one
   photo and the divider shows only what that tool changes: Materials (the walls and the floor, nothing else) and Furniture (the sofa
   recoloured, the coffee table taken out). The other four cards use the sample rooms' own pictures (a look, the relit bedroom, the emptied
   living room, the kitchen sketch). Re-run after an engine or living-room sample change.  Usage: npx tsx scripts/viz/trial-cards.mts */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); if (m) return { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) }; return fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const sample = sampleByKey('living-room')!
const detection = sampleDetection(sample)
const room = { sampleKey: sample.key, detection, name: sample.name }
/* (pending modules S43C) the owner's living room: its three painted walls (the TV wall's oak panels and the cabinet stay oak) */
const WALLS = ['cream painted side wall', 'cream painted back wall', 'cream painted TV wall']
const idOf = (label: string, list: { id: string; label: string }[]) => { const x = list.find((d) => d.label === label); if (!x) throw new Error(`no ${label}`); return x.id }
async function paint(out: string, pending: Pending) {
  const r = await runPass({ kind: 'edit', base: { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }, room, pending, resolve: (id) => resolveMaterial(id, [], []) })
  if ('error' in r) throw new Error(r.error)
  const img = mem.get(r.variants[0]!.dataUrl)!
  await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 88 }).toFile(`public${out}`)
  const a = r.variants[0]!.applied
  console.log(`${out} · ${[...a.surfaces.map((x) => x.name), ...a.furniture.map((x) => `${x.label}: ${x.action}${x.desc ? ` ${x.desc}` : ''}`)].join(', ')}`)
}
await paint(TRIAL_CARDS.materials.after, {
  ...emptyPending(), variants: 1, quality: 'fast',
  materials: { ...Object.fromEntries(WALLS.map((w) => [idOf(w, detection.surfaces), WELCOME_AFTER.walls])), [idOf('beige stone floor', detection.surfaces)]: WELCOME_AFTER.floor },
})
await paint(TRIAL_CARDS.furniture.after, {
  ...emptyPending(), variants: 1, quality: 'fast',
  furniture: {
    [idOf('cream bouclé sofa', detection.furniture)]: { action: 'customize', customizeColor: 'Emerald', customizeMaterial: 'Velvet', replacementDesc: null, refImage: null },
    [idOf('travertine coffee table', detection.furniture)]: { action: 'remove', customizeColor: null, customizeMaterial: null, replacementDesc: null, refImage: null },
  },
})
/* the watermark every trial render carries — 1.0's white OpenMaison logo (public/logo-full-mono.svg in 1.0: the mark and the wordmark), drawn at
   twice the largest size it is stamped (260 px wide) so it stays crisp */
await sharp('scripts/viz/trial-watermark.svg', { density: 288 }).resize({ width: 1040 }).png().toFile('public/site/try/watermark.png')
console.log('public/site/try/watermark.png')
