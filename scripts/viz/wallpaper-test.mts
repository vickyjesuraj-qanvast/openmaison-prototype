import sharp from 'sharp'
import { sampleByKey } from '../../lib/visualizer/samples.ts'
import { growRegion } from '../../lib/visualizer/engine/segment.ts'
import { recolor } from '../../lib/visualizer/engine/recolor.ts'
import { catalogueItem } from '../../lib/visualizer/catalogue.ts'
import { fromCatalogue } from '../../lib/visualizer/materials.ts'
import { patternTile } from '../../lib/visualizer/patterns.ts'
/* Dev check (REG-680): three wallpapers on the living room's back wall, as the engine lays them. Usage: npx tsx scripts/viz/wallpaper-test.mts <outDir> */
type Img = { width: number; height: number; data: Uint8ClampedArray }
async function load(p: string): Promise<Img> { const { data, info } = await sharp(`public${p}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
const room = sampleByKey('living-room')!, wall = room.surfaces.find((s) => s.label === 'white painted back wall')!
const cells: Buffer[] = []
for (const id of ['wp-006', 'wp-012', 'wp-001', 'wp-004']) {
  const img = await load(room.original), m = fromCatalogue(catalogueItem(id)!)
  const mask = growRegion(img, wall.seeds, { local: wall.local, global: wall.global, exclude: wall.exclude, within: wall.within, hull: wall.hull, cutout: wall.cutout, key: wall.key, size: 480 })
  recolor(img, mask, m.hex, m.finish, 1, m.pattern ? patternTile(m.pattern, m.hex, Math.max(18, Math.round(img.width / 20))) : null)
  cells.push(await sharp(Buffer.from(img.data.buffer), { raw: { width: img.width, height: img.height, channels: 4 } }).resize(600).png().toBuffer())
}
await sharp({ create: { width: 1200, height: 804, channels: 3, background: '#222' } }).composite(cells.map((c, i) => ({ input: c, left: (i % 2) * 600, top: Math.floor(i / 2) * 402 }))).jpeg({ quality: 82 }).toFile(`${process.argv[2]}/wallpapers.jpg`)
console.log('wrote wallpapers.jpg')
