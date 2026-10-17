#!/usr/bin/env node
/**
 * (pending modules S24) The demo Marketplace's pictures (public/marketplace/**), cut from the AI Visualizer's sample rooms
 * (public/visualizer/samples) — the rooms the brands' pages show, square product shots, 3:2 deal pictures and the wide banners — and each
 * invented brand's logo as a plain monogram. Run once; the files are committed. `node scripts/marketplace/gen-assets.mjs`
 * (pending modules S43C) The committed files were cut from 1.0's earlier sample photos (their stools, pendants and sofas); the sample rooms are
 * the owner's newer photos now (1.0's 4a51f3522), so a re-run needs new boxes — the pictures stand as they are (product shots, never the samples).
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'public/visualizer/samples', OUT = 'public/marketplace'
for (const d of ['rooms', 'products', 'deals', 'banners', 'logos']) mkdirSync(join(OUT, d), { recursive: true })
const src = (name) => { const [room, ...style] = name.split('/'); return join(SRC, room, `${style.join('/')}.jpg`) }

/* the rooms a brand's page shows — `<room>-<style>` */
const ROOMS = ['living-room-scandinavian', 'living-room-original', 'bedroom-scandinavian', 'kitchen-scandinavian', 'bedroom-original', 'living-room-japandi', 'living-room-bohemian',
  'kitchen-original', 'bedroom-japandi', 'living-room-dubai-luxury', 'kitchen-dubai-luxury', 'kitchen-japandi', 'bedroom-dubai-luxury', 'bedroom-bohemian']
const splitRoom = (n) => { const m = /^(living-room|bedroom|kitchen)-(.+)$/.exec(n); return `${m[1]}/${m[2]}` }
/* product shots: a square in the 900 × 603 photo */
const PRODUCTS = {
  'oslo-sofa': ['living-room/original', 150, 250, 350], 'hudson-sofa': ['living-room/industrial', 170, 250, 340], 'haven-bed': ['bedroom/original', 330, 250, 350],
  'arc-stool': ['kitchen/original', 500, 330, 260], 'teak-table': ['living-room/japandi', 380, 330, 240], 'teak-console': ['living-room/japandi', 600, 300, 260],
  'dome-pendant': ['kitchen/original', 460, 20, 200], 'paper-lamp': ['living-room/japandi', 250, 250, 180], 'bedside-lamp': ['bedroom/original', 255, 270, 150],
  'vinyl-floor': ['living-room/original', 0, 440, 160], 'spc-floor': ['bedroom/original', 40, 450, 150], 'marble-porcelain': ['kitchen/dubai-luxury', 240, 450, 150],
  'fluted-doors': ['kitchen/scandinavian', 30, 290, 270], 'woven-stool': ['kitchen/japandi', 480, 340, 260], 'white-quartz': ['kitchen/original', 400, 270, 220],
  'calacatta-quartz': ['kitchen/dubai-luxury', 380, 290, 240], 'black-mixer': ['kitchen/original', 505, 225, 150], 'brass-mixer': ['kitchen/dubai-luxury', 510, 220, 150],
  emulsion: ['bedroom/japandi', 440, 80, 260], limewash: ['living-room/japandi', 300, 120, 260], 'sheer-curtain': ['bedroom/original', 0, 40, 260],
  jacquard: ['living-room/dubai-luxury', 0, 30, 260], 'bamboo-blind': ['living-room/japandi', 150, 120, 240], 'rattan-headboard': ['bedroom/bohemian', 390, 230, 330],
  'rattan-pendant': ['kitchen/japandi', 440, 20, 220],
}
/* deal pictures: a 3:2 box (x, y, width) */
const DEALS = {
  'oak-sofas': ['living-room/scandinavian', 100, 136, 700], 'oak-chairs': ['kitchen/original', 430, 250, 470], 'lumen-pendants': ['kitchen/scandinavian', 380, 0, 450],
  floor: ['bedroom/original', 0, 303, 450], 'hearth-worktops': ['kitchen/japandi', 200, 203, 600], 'basin-mixer': ['kitchen/original', 380, 180, 420],
  'kaya-paint': ['bedroom/japandi', 240, 60, 600], 'homesense-living': ['living-room/japandi', 250, 150, 650], 'rattan-bedroom': ['bedroom/bohemian', 240, 120, 660],
}
/* banners: a 900 × 400 band */
const BANNERS = { 'kitchen-month': ['kitchen/japandi', 150], 'rattan-row': ['bedroom/bohemian', 120], pendants: ['kitchen/scandinavian', 30] }
/* each invented brand's monogram: its initials on its colour */
const LOGOS = {
  'oak-linen': ['O&L', '#6B4F3A'], 'kampong-teak': ['KT', '#8A5A2B'], 'lumen-lane': ['LL', '#1F2A44'], 'floor-xpert': ['FX', '#2E6B5E'], tessera: ['TT', '#5B5F97'],
  'hearth-ember': ['H&E', '#A3412A'], 'stone-republic': ['SR', '#4A4A4A'], 'basin-tap': ['B&T', '#1E6F9F'], 'kaya-paints': ['K', '#C47F3A'], 'shade-atelier': ['SA', '#7A6A8E'],
  'drape-draw': ['D&D', '#3F7D6E'], homesense: ['HS', '#2B5BA8'], nook: ['N', '#2F2F2F'], 'rattan-row': ['RR', '#9C7A3C'],
}

for (const r of ROOMS) await sharp(src(splitRoom(r))).jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, 'rooms', `${r}.jpg`))
for (const [k, [s, x, y, n]] of Object.entries(PRODUCTS)) await sharp(src(s)).extract({ left: x, top: y, width: n, height: n }).resize(480, 480).jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, 'products', `${k}.jpg`))
for (const [k, [s, x, y, w]] of Object.entries(DEALS)) await sharp(src(s)).extract({ left: x, top: y, width: w, height: Math.round((w * 2) / 3) }).resize(720, 480).jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, 'deals', `${k}.jpg`))
for (const [k, [s, y]] of Object.entries(BANNERS)) await sharp(src(s)).extract({ left: 0, top: y, width: 900, height: 400 }).resize(1350, 600).jpeg({ quality: 78, mozjpeg: true }).toFile(join(OUT, 'banners', `${k}.jpg`))
for (const [k, [initials, colour]] of Object.entries(LOGOS)) {
  const size = initials.length >= 3 ? 30 : initials.length === 2 ? 36 : 44
  writeFileSync(join(OUT, 'logos', `${k}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96"><rect width="96" height="96" fill="${colour}"/><text x="48" y="48" dy="0.35em" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="#FFFFFF" letter-spacing="1">${initials.replace(/&/g, '&amp;')}</text></svg>\n`)
}
console.log('marketplace pictures written to', OUT)
