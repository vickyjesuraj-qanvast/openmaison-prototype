/*
 * (pending modules S28 — card studio:floorplan-isometric-ai, R119) The demo's floor-plan PHOTO: a printed HDB 4-room plan photographed on a
 * desk at an angle, as a homeowner sends it on WhatsApp — what Make a 3D picture straightens. Drawn once with @napi-rs/canvas in the house's
 * plan style (scripts/demo-floor-plans.mjs: walls, doors with their swing, windows, room names, the printed lengths) from the planner's own
 * HDB 4-Room (lib/planner/templates.ts — the rooms the photo's room list starts from), then laid on a wooden desk turned 7°, lit unevenly, with
 * a camera's grain. Kept in public/planner/demo/, where repair R119 reads it into Farah Ahmad's Files › Floor plans (and the S28 probe uploads
 * it). Run: `npx tsx scripts/planner/floor-plan-photo.mts`.
 */
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planFromTemplate } from '../../lib/planner/templates.ts'
import { PX, drawPlanPaper } from './plan-paper.mts'   // (Floorplan to 3D Isometric, REG-2657) the printed plan, shared with the tool's sample plans

const plan = planFromTemplate('hdb-4')
const { canvas: paper, width: PW, height: PH } = drawPlanPaper(plan, { title: 'WATERWAY SUNRISE · 4-ROOM FLAT (TYPE A)', note: 'Approx. floor area 93 sqm · not to scale' })

/* ── the photo: the paper on a desk, turned, lit unevenly, with grain ── */
const W = 2000, H = 1500
const photo = createCanvas(W, H)
const p = photo.getContext('2d')
let seed = 28
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
p.fillStyle = '#9C7350'; p.fillRect(0, 0, W, H)
for (let i = 0; i < 900; i++) { const y = rnd() * H; p.strokeStyle = rnd() > 0.5 ? 'rgba(70,45,25,0.10)' : 'rgba(210,170,130,0.08)'; p.lineWidth = 1 + rnd() * 3; p.beginPath(); p.moveTo(0, y); p.bezierCurveTo(W * 0.3, y + (rnd() - 0.5) * 30, W * 0.7, y + (rnd() - 0.5) * 30, W, y + (rnd() - 0.5) * 20); p.stroke() }
const k = Math.min((W * 0.8) / PW, (H * 0.84) / PH)
p.save()
p.translate(W / 2 + 20, H / 2 - 10); p.rotate((-7 * Math.PI) / 180); p.scale(k, k)
p.shadowColor = 'rgba(0,0,0,0.45)'; p.shadowBlur = 40; p.shadowOffsetX = 18; p.shadowOffsetY = 24
p.fillStyle = '#FBF8F1'; p.fillRect(-PW / 2, -PH / 2, PW, PH)
p.shadowColor = 'transparent'
p.drawImage(paper, -PW / 2, -PH / 2)
p.restore()
/* the window's light from the top left, the phone's shade at the bottom right */
const light = p.createRadialGradient(W * 0.25, H * 0.2, 100, W * 0.5, H * 0.55, W * 0.85)
light.addColorStop(0, 'rgba(255,248,235,0.10)'); light.addColorStop(0.6, 'rgba(0,0,0,0)'); light.addColorStop(1, 'rgba(20,10,0,0.30)')
p.fillStyle = light; p.fillRect(0, 0, W, H)
const img = p.getImageData(0, 0, W, H)
for (let i = 0; i < img.data.length; i += 4) { const n = (rnd() - 0.5) * 14; img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n)); img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n)); img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n * 0.9)) }
p.putImageData(img, 0, 0)

const OUT = join(process.cwd(), 'public', 'planner', 'demo')
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'floor-plan-photo-waterway-sunrise.jpg'), photo.toBuffer('image/jpeg', 84))
console.log('wrote public/planner/demo/floor-plan-photo-waterway-sunrise.jpg', `${W}×${H}`, `paper ${PW}×${PH} at ${PX} px/cm, turned 7°`)
