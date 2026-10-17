/*
 * (gaps build G, R85) The demo's floor-plan pictures — drawn once with @napi-rs/canvas (the optional canvas pdfjs-dist installs; R82 draws the
 * demo PDFs' pages with it too) and kept in public/projects/demo/, where the repair reads them into each plan's own picture and file:
 *   floor-plan-existing.png · floor-plan-proposed.png — Benjamin Han's HDB 5-room flat at SkyOasis @ Dawson, as it is and as proposed
 *   floor-plan-ec.png — Ryan D'Souza's executive condo
 * A plan line drawing: walls, doors with their swing, windows, room names and the printed lengths (mm) a studio sets the scale from.
 * Drawn at 1600 × 1150 px, 9 mm to a pixel (R85 sets that scale on the plans that have one). Run: `node scripts/demo-floor-plans.mjs`.
 */
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const W = 1600, H = 1150, MM = 9   // millimetres per pixel
const OUT = join(process.cwd(), 'public', 'projects', 'demo')
mkdirSync(OUT, { recursive: true })

function plan(file, draw) {
  const c = createCanvas(W, H)
  const g = c.getContext('2d')
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H)
  g.strokeStyle = '#222222'; g.fillStyle = '#222222'; g.lineCap = 'square'
  draw(g)
  writeFileSync(join(OUT, file), c.toBuffer('image/png'))
  console.log('wrote', file)
}
const wall = (g, x1, y1, x2, y2, t = 12) => { g.lineWidth = t; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
const thin = (g, x1, y1, x2, y2) => { g.lineWidth = 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
/** A door: the gap is drawn by the caller; the leaf and its swing from the hinge (hx, hy). */
function door(g, hx, hy, r, a0, a1) {
  g.lineWidth = 2
  g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + r * Math.cos(a1), hy + r * Math.sin(a1)); g.stroke()
  g.setLineDash([6, 5]); g.beginPath(); g.arc(hx, hy, r, a0, a1, a1 < a0); g.stroke(); g.setLineDash([])
}
/** A window: two thin lines over a white gap in the wall. */
function win(g, x1, y1, x2, y2) {
  g.save(); g.strokeStyle = '#ffffff'; wall(g, x1, y1, x2, y2, 14); g.restore()
  const dx = y1 === y2 ? 0 : 4, dy = y1 === y2 ? 4 : 0
  thin(g, x1 - dx, y1 - dy, x2 - dx, y2 - dy); thin(g, x1 + dx, y1 + dy, x2 + dx, y2 + dy)
}
function gap(g, x1, y1, x2, y2) { g.save(); g.strokeStyle = '#ffffff'; wall(g, x1, y1, x2, y2, 16); g.restore() }
function label(g, text, x, y, size = 22) { g.font = `600 ${size}px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#333333'; g.fillText(text, x, y) }
function small(g, text, x, y) { g.font = `400 15px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#666666'; g.fillText(text, x, y) }
/** A printed length along a side, with its ticks — the number a studio teaches the plan's scale from. */
function dim(g, x1, y1, x2, y2, off = 34) {
  const horiz = y1 === y2
  const ox = horiz ? 0 : -off, oy = horiz ? -off : 0
  g.strokeStyle = '#888888'
  thin(g, x1 + ox, y1 + oy, x2 + ox, y2 + oy)
  thin(g, x1 + ox - (horiz ? 0 : 6), y1 + oy - (horiz ? 6 : 0), x1 + ox + (horiz ? 0 : 6), y1 + oy + (horiz ? 6 : 0))
  thin(g, x2 + ox - (horiz ? 0 : 6), y2 + oy - (horiz ? 6 : 0), x2 + ox + (horiz ? 0 : 6), y2 + oy + (horiz ? 6 : 0))
  g.strokeStyle = '#222222'
  const mm = Math.round((Math.hypot(x2 - x1, y2 - y1) * MM) / 50) * 50
  g.save(); g.translate((x1 + x2) / 2 + ox * 1.45, (y1 + y2) / 2 + oy * 1.45); if (!horiz) g.rotate(-Math.PI / 2)
  g.font = '500 16px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#555555'; g.fillText(mm.toLocaleString('en-SG'), 0, 5); g.restore()
}
function title(g, a, b) { g.font = '700 26px sans-serif'; g.textAlign = 'left'; g.fillStyle = '#222222'; g.fillText(a, 60, 1110); g.font = '400 17px sans-serif'; g.fillStyle = '#666666'; g.fillText(b, 60 + g.measureText(a).width + 380, 1110) }

/* Benjamin's HDB 5-room: the shell both drawings share — 1,330 × 940 px (about 12.0 m × 8.5 m) */
function hdbShell(g) {
  const L = 140, T = 90, R = 1470, B = 1030
  wall(g, L, T, R, T); wall(g, R, T, R, B); wall(g, R, B, L, B); wall(g, L, B, L, T)
  win(g, 260, T, 520, T); win(g, 700, T, 900, T); win(g, 1120, T, 1360, T); win(g, R, 600, R, 800); win(g, 320, B, 640, B); win(g, L, 600, L, 820)
  gap(g, 860, B, 960, B); door(g, 860, B, 95, 0, -Math.PI / 2)   // the main door
  /* bedroom 3, top right, its door on the corridor side */
  gap(g, 1150, 470, 1240, 470); door(g, 1150, 470, 85, 0, -Math.PI / 2)
  dim(g, L, T, R, T); dim(g, L, T, L, B)
  return { L, T, R, B }
}
plan('floor-plan-existing.png', (g) => {
  const { L, T, R, B } = hdbShell(g)
  /* bedrooms along the top, the kitchen closed off at the right */
  wall(g, L, 470, 980, 470); wall(g, 600, T, 600, 470); wall(g, 980, T, 980, 470)
  wall(g, 1080, 470, R, 470); wall(g, 1080, 470, 1080, B)   // the kitchen's wall — hacked in the proposal
  wall(g, 980, 470, 980, 640)
  gap(g, 420, 470, 510, 470); door(g, 420, 470, 85, 0, -Math.PI / 2)
  gap(g, 800, 470, 890, 470); door(g, 800, 470, 85, 0, -Math.PI / 2)
  gap(g, 1080, 700, 1080, 790); door(g, 1080, 700, 85, Math.PI / 2, Math.PI)
  label(g, 'Bedroom 2', 370, 280); small(g, '3,100 × 3,400', 370, 306)
  label(g, 'Master bedroom', 790, 280); small(g, '3,400 × 3,400', 790, 306)
  label(g, 'Bedroom 3', 1275, 280); small(g, '3,500 × 3,400', 1275, 306)
  label(g, 'Kitchen', 1275, 700); small(g, 'closed, with its own door', 1275, 726)
  label(g, 'Living and dining', 610, 760); small(g, 'as handed over', 610, 786)
  title(g, 'SkyOasis @ Dawson — existing layout', 'HDB 5-room · drawn 1:100 · lengths in mm')
})
plan('floor-plan-proposed.png', (g) => {
  const { L, T, R, B } = hdbShell(g)
  wall(g, L, 470, 980, 470); wall(g, 600, T, 600, 470); wall(g, 980, T, 980, 470)
  wall(g, 1080, 470, R, 470)   // the kitchen opens to the living — its wall is hacked
  wall(g, 980, 470, 980, 640)
  thin(g, 1100, 560, 1440, 560); thin(g, 1100, 640, 1440, 640)   // the kitchen run
  thin(g, 1180, 760, 1180, 900); thin(g, 1300, 760, 1300, 900); thin(g, 1180, 760, 1300, 760); thin(g, 1180, 900, 1300, 900)   // the island
  gap(g, 420, 470, 510, 470); door(g, 420, 470, 85, 0, -Math.PI / 2)
  gap(g, 800, 470, 890, 470); door(g, 800, 470, 85, 0, -Math.PI / 2)
  thin(g, 620, 110, 620, 450); thin(g, 660, 110, 660, 450)   // the master's wardrobe
  label(g, 'Bedroom 2 · study', 370, 280); small(g, '3,100 × 3,400', 370, 306)
  label(g, 'Master bedroom', 800, 280); small(g, 'with full-height wardrobe', 800, 306)
  label(g, 'Bedroom 3', 1275, 280); small(g, '3,500 × 3,400', 1275, 306)
  label(g, 'Open kitchen', 1275, 530); small(g, 'island 1,200 × 1,100', 1240, 940)
  label(g, 'Living and dining', 560, 760); small(g, 'feature wall on the left', 560, 786)
  title(g, 'SkyOasis @ Dawson — proposed layout', 'HDB 5-room · drawn 1:100 · lengths in mm')
})
plan('floor-plan-ec.png', (g) => {
  const L = 160, T = 110, R = 1440, B = 1010
  wall(g, L, T, R, T); wall(g, R, T, R, B); wall(g, R, B, L, B); wall(g, L, B, L, T)
  win(g, 300, T, 640, T); win(g, 860, T, 1100, T); win(g, R, 300, R, 520); win(g, 420, B, 820, B)
  gap(g, 1260, B, 1360, B); door(g, 1260, B, 95, Math.PI, Math.PI * 1.5)
  wall(g, L, 520, 760, 520); wall(g, 760, T, 760, 520); wall(g, 1060, T, 1060, 520); wall(g, 1060, 520, R, 520)
  gap(g, 600, 520, 690, 520); door(g, 600, 520, 85, 0, -Math.PI / 2)
  gap(g, 1150, 520, 1240, 520); door(g, 1150, 520, 85, 0, -Math.PI / 2)
  label(g, 'Study', 460, 320); small(g, '3,300 × 3,600', 460, 346)
  label(g, 'Kitchen', 910, 320)
  label(g, 'Bedroom', 1250, 320)
  label(g, 'Living and dining', 760, 780)
  dim(g, L, T, R, T); dim(g, L, T, L, B)
  title(g, 'Executive condo — unit layout', 'drawn 1:100 · lengths in mm')
})
