import sharp from 'sharp'
import { runPass, setImageIO } from '../../lib/visualizer/engine/run.ts'
import { emptyPending, sampleDetection, NO_FINISHES, ORIGINAL, type Pending } from '../../lib/visualizer/model.ts'
import { SAMPLE_ROOMS } from '../../lib/visualizer/samples.ts'
import { LOOK_STYLES } from '../../lib/visualizer/sample-rooms/shape.ts'
import { resolveMaterial } from '../../lib/visualizer/materials.ts'
import { RELIGHT_PRESETS } from '../../lib/visualizer/lighting.ts'

/* (pending modules S43C) The sample rooms' made-ahead pictures, by the very passes the browser's Generate runs (engine/run.ts `runPass`, Fast,
   one variant — the demo-renders harness's IO): each room's five looks (a Style card's picture — Generate's first variant makes the same
   picture) and each relit picture a room lists (the bedroom's golden hour). Re-run after an engine or a sample reading change; the demo's
   records point at these files (repair R61 · R162). Usage: npx tsx scripts/viz/sample-looks.mts [room key…] */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const only = process.argv.slice(2)
const mem = new Map<string, Img>()
let seq = 0
async function fromSharp(s: sharp.Sharp): Promise<Img> { const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
setImageIO({
  decode: async (url) => { const m = mem.get(url); if (m) return { width: m.width, height: m.height, data: new Uint8ClampedArray(m.data) }; return fromSharp(sharp(`public${url}`)) },
  encode: (img) => { const k = `mem:${++seq}`; mem.set(k, { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }); return k },
})
const save = async (url: string, p: string) => {
  const img = mem.get(url)
  if (!img) throw new Error(`nothing rendered for ${p}`)
  await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).jpeg({ quality: 90 }).toFile(`public${p}`)
}
const resolve = (id: string) => resolveMaterial(id, [], [])
for (const sample of SAMPLE_ROOMS) {
  if (only.length && !only.includes(sample.key)) continue
  const room = { sampleKey: sample.key, detection: sampleDetection(sample), name: sample.name }
  const original = { key: ORIGINAL, url: sample.original, finishes: NO_FINISHES }
  for (const style of LOOK_STYLES) {
    const pending: Pending = { ...emptyPending(), variants: 1, quality: 'fast', style }
    const o = await runPass({ kind: 'restyle', base: original, room, pending, resolve })
    if ('error' in o) throw new Error(`${sample.key} · ${style}: ${o.error}`)
    await save(o.variants[0]!.dataUrl, sample.looks[style]!)
    console.log(`${sample.looks[style]} · ${o.variants[0]!.applied.surfaces.map((s) => `${s.label} → ${s.name}`).join(', ')}`)
  }
  /* the relit picture is what a relight of the photo makes — made with the room's relit files set aside (else the pass hands them back) */
  const relit = sample.relit
  delete sample.relit
  try {
    for (const [preset, file] of Object.entries(relit ?? {})) {
      const p = RELIGHT_PRESETS.find((x) => x.id === preset)!
      const pending: Pending = { ...emptyPending(), variants: 1, quality: 'fast', lighting: { presetId: p.id, knobs: p.knobs, instruction: '' } }
      const o = await runPass({ kind: 'relight', base: original, room, pending, resolve })
      if ('error' in o) throw new Error(`${sample.key} · ${preset}: ${o.error}`)
      await save(o.variants[0]!.dataUrl, file)
      console.log(`${file} · ${p.label}`)
    }
  } finally { if (relit) sample.relit = relit }
}
