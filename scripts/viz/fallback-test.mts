import sharp from 'sharp'
import { fallbackReading } from '../../lib/visualizer/engine/fallback.ts'
import { growRegion } from '../../lib/visualizer/engine/segment.ts'
import { recolor } from '../../lib/visualizer/engine/recolor.ts'
/* Dev check (audit 2026-09-26, F060 · F180): photos read as uploads — no curated reading, the fallback's Walls · Floor · Ceiling grown with
   the options the reading carries (as regionOf spreads `grow`) and painted navy · walnut · terracotta, seeds in green, one cell each.
   (verify round 1) The dots the editor places are drawn in red; a caption bar's rows are left out as the reading's `frame` says.
   Usage: npx tsx scripts/viz/fallback-test.mts <outDir> [public paths…] (default: the three samples and the UAT site photo) */
const [out, ...args] = process.argv.slice(2)
const photos = args.length ? args : ['/visualizer/samples/bedroom/original.jpg', '/visualizer/samples/kitchen/original.jpg', '/visualizer/samples/living-room/original.jpg', '/uat-files/sophia-living-room.jpg']
const paint: Record<string, [string, 'matte' | 'natural']> = { Walls: ['#1B2A4A', 'matte'], Floor: ['#6D4C3D', 'natural'], Ceiling: ['#C1694F', 'matte'] }
const cells: Buffer[] = []
for (const p of photos) {
  /* as the editor reads an upload: at most 1600 px on the long side */
  const { data, info } = await sharp(`public${p}`).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const orig = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) }
  const r = fallbackReading(orig), img = { ...orig, data: new Uint8ClampedArray(orig.data) }
  const line: string[] = []
  for (const s of r.surfaces) {
    const f = r.frame, within = f && (f.top > 0 || f.bottom < 1) ? [0, f.top, 1, f.bottom] as [number, number, number, number] : undefined
    const m = growRegion(orig, s.seeds, { local: s.local, global: s.global, ...s.grow, within, size: 480 })   // as regionOf grows it
    let c = 0; for (const v of m) c += v
    line.push(`${s.label} ${((c / m.length) * 100).toFixed(0)}%`)
    recolor(img, m, paint[s.label]![0], paint[s.label]![1])
  }
  /* the dots the editor places (red), the seeds (green) */
  for (const s of r.surfaces) { const cx = Math.round(s.x * img.width), cy = Math.round(s.y * img.height); for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) { if (dx * dx + dy * dy > 81) continue; const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue; const k = (y * img.width + x) * 4; img.data[k] = 255; img.data[k + 1] = 0; img.data[k + 2] = 0 } }
  for (const s of r.surfaces) for (const q of s.seeds) { const cx = Math.round(q.x * img.width), cy = Math.round(q.y * img.height); for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue; const k = (y * img.width + x) * 4; img.data[k] = 0; img.data[k + 1] = 255; img.data[k + 2] = 0 } }
  console.log(p, '·', line.join(' · ') || 'nothing read')
  cells.push(await sharp(Buffer.from(img.data.buffer), { raw: { width: img.width, height: img.height, channels: 4 } }).resize(600, 400, { fit: 'fill' }).png().toBuffer())
}
const cols = 2, rows = Math.ceil(cells.length / cols)
await sharp({ create: { width: cols * 600, height: rows * 400, channels: 3, background: '#222' } }).composite(cells.map((c, i) => ({ input: c, left: (i % cols) * 600, top: Math.floor(i / cols) * 400 }))).jpeg({ quality: 85 }).toFile(`${out}/fallback.jpg`)
console.log('wrote fallback.jpg')
