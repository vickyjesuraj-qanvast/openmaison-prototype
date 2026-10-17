#!/usr/bin/env node
/**
 * (pending modules S25) The demo Market Insights' pictures (public/market-insights/*.jpg), cut from the AI Visualizer's sample rooms
 * (public/visualizer/samples): each sample article's cover at 3:2 and the pictures inside two of them at 16:9. Run once; the files are
 * committed. `node scripts/market-insights/gen-assets.mjs`
 * (pending modules S43C) The committed files were cut from 1.0's earlier sample photos; the sample rooms are the owner's newer photos now
 * (1.0's 4a51f3522), so a re-run needs new boxes — the pictures stand as they are (they show rooms, never claim to be the samples).
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'public/visualizer/samples', OUT = 'public/market-insights'
mkdirSync(OUT, { recursive: true })
/* name → [sample room, left, top, width] of a box in the 900 × 603 photo; height follows the box's shape */
const COVERS = {
  'resale-living': ['living-room/original', 0, 0, 900], 'benchmark-kitchen': ['kitchen/original', 0, 0, 900], 'studio-japandi': ['living-room/japandi', 0, 0, 900],
  'lumen-lighting': ['kitchen/scandinavian', 0, 0, 900], 'materials-kitchen': ['kitchen/japandi', 0, 0, 900], 'budget-bedroom': ['bedroom/scandinavian', 0, 0, 900],
}
const FIGURES = { 'resale-empty': ['living-room/defurnished', 0, 40, 900], 'materials-stone': ['kitchen/dubai-luxury', 0, 60, 900] }
for (const [k, [s, x, y, w]] of Object.entries(COVERS)) await sharp(join(SRC, `${s}.jpg`)).extract({ left: x, top: y, width: w, height: Math.round((w * 2) / 3) }).resize(900, 600).jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, `${k}.jpg`))
for (const [k, [s, x, y, w]] of Object.entries(FIGURES)) await sharp(join(SRC, `${s}.jpg`)).extract({ left: x, top: y, width: w, height: Math.round((w * 9) / 16) }).resize(900, 506).jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, `${k}.jpg`))
console.log('market insights pictures written to', OUT)
