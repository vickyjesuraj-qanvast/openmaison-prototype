import sharp from 'sharp'
import { SAMPLE_ROOMS } from '../../lib/visualizer/samples.ts'
import { sampleDetection } from '../../lib/visualizer/model.ts'
import { regionOf } from '../../lib/visualizer/engine/run.ts'
/* Dev check for the AI Visualizer's sample readings (REG-673): every region of every sample room, one cell each, tinted over the photo.
   (verify round 1) Read through the engine's own `regionOf` with the room's reading — a surface's see-through `soft` outlines and glass,
   a piece's whole outline, what stands in front of each — so a cell is exactly what a Generate paints.
   Usage: npx tsx scripts/viz/regions.mts <outDir> [room-key] */
const out = process.argv[2]!, only = process.argv[3]
async function load(p: string) { const { data, info } = await sharp(`public${p}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
for (const room of SAMPLE_ROOMS) {
  if (only && room.key !== only) continue
  const img = await load(room.original)
  const reading = sampleDetection(room)
  const items = [...reading.surfaces.map((d) => ({ d, kind: 's' as const })), ...reading.furniture.map((d) => ({ d, kind: 'f' as const }))]
  const cells: Buffer[] = []
  for (const { d, kind } of items) {
    const it = { label: d.label, seeds: d.seeds ?? [{ x: d.x, y: d.y }] }
    const m = regionOf(img, room.original, d, 480, { reading })
    const px = new Uint8ClampedArray(img.data)
    let cov = 0
    for (let k = 0; k < m.length; k++) { const a = m[k]! * 0.6; cov += m[k]!; if (a > 0) { px[k * 4] = px[k * 4]! * (1 - a) + 255 * a; px[k * 4 + 1] = px[k * 4 + 1]! * (1 - a) + 20 * a; px[k * 4 + 2] = px[k * 4 + 2]! * (1 - a) + 147 * a } }
    for (const p of it.seeds) { const cx = Math.round(p.x * img.width), cy = Math.round(p.y * img.height); for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue; const q = (y * img.width + x) * 4; px[q] = 0; px[q + 1] = 255; px[q + 2] = 0 } }
    const label = `${kind === 's' ? 'S' : 'F'} ${it.label} · ${(cov / m.length * 100).toFixed(1)}%`
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="450" height="24"><rect width="450" height="24" fill="black"/><text x="6" y="17" font-size="14" fill="white" font-family="Arial">${label.replace(/&/g, '&amp;')}</text></svg>`)
    const small = await sharp(Buffer.from(px.buffer), { raw: { width: img.width, height: img.height, channels: 4 } }).resize(450).png().toBuffer()
    const cell = await sharp(small).composite([{ input: svg, top: 0, left: 0 }]).png().toBuffer()
    cells.push(cell)
  }
  const cols = 3, cw = 450, ch = Math.round(450 * img.height / img.width), rows = Math.ceil(cells.length / cols)
  await sharp({ create: { width: cols * cw, height: rows * ch, channels: 3, background: '#222' } }).composite(cells.map((c, i) => ({ input: c, left: (i % cols) * cw, top: Math.floor(i / cols) * ch }))).jpeg({ quality: 78 }).toFile(`${out}/regions-${room.key}.jpg`)
  console.log('wrote', room.key, cells.length)
}
