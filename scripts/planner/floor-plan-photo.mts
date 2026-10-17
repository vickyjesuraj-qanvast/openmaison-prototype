/*
 * (pending modules S28 — card studio:floorplan-isometric-ai, R119) The demo's floor-plan PHOTO: a printed HDB 4-room plan photographed on a
 * desk at an angle, as a homeowner sends it on WhatsApp — what Make a 3D picture straightens. Drawn once with @napi-rs/canvas in the house's
 * plan style (scripts/demo-floor-plans.mjs: walls, doors with their swing, windows, room names, the printed lengths) from the planner's own
 * HDB 4-Room (lib/planner/templates.ts — the rooms the photo's room list starts from), then laid on a wooden desk turned 7°, lit unevenly, with
 * a camera's grain. Kept in public/planner/demo/, where repair R119 reads it into Farah Ahmad's Files › Floor plans (and the S28 probe uploads
 * it). Run: `npx tsx scripts/planner/floor-plan-photo.mts`.
 */
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planFromTemplate } from '../../lib/planner/templates.ts'
import { openingSpan, sideLine, wallRuns, type Room } from '../../lib/planner/model.ts'

const PX = 1.25   // pixels per centimetre on the paper
const PAD = 130
const plan = planFromTemplate('hdb-4')
const xs = plan.rooms.flatMap((r) => [r.x, r.x + r.w]), zs = plan.rooms.flatMap((r) => [r.z, r.z + r.d])
const X0 = Math.min(...xs), Z0 = Math.min(...zs), X1 = Math.max(...xs), Z1 = Math.max(...zs)
const PW = Math.round((X1 - X0) * PX + PAD * 2), PH = Math.round((Z1 - Z0) * PX + PAD * 2 + 90)
const px = (x: number) => PAD + (x - X0) * PX, pz = (z: number) => PAD + (z - Z0) * PX

/* ── the plan, on paper ── */
const paper = createCanvas(PW, PH)
const g = paper.getContext('2d')
g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, PW, PH)
g.strokeStyle = '#222222'; g.fillStyle = '#222222'; g.lineCap = 'square'
const line = (c: SKRSContext2D, x1: number, y1: number, x2: number, y2: number, t: number, col = '#222222') => { c.strokeStyle = col; c.lineWidth = t; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke() }
/* the walls: every standing run, its doors and windows cut out */
for (const run of wallRuns(plan.rooms)) {
  for (const [s0, s1] of run.solid) {
    const cuts = run.cuts.filter((c) => c.a1 > s0 && c.a0 < s1).sort((a, b) => a.a0 - b.a0)
    let at = s0
    const seg = (a: number, b: number) => { if (b - a < 1) return; if (run.axis === 'h') line(g, px(a), pz(run.c), px(b), pz(run.c), 12); else line(g, px(run.c), pz(a), px(run.c), pz(b), 12) }
    for (const c of cuts) { seg(at, Math.max(at, c.a0)); at = Math.max(at, c.a1) }
    seg(at, s1)
    /* a window: two thin lines in its gap */
    for (const c of cuts.filter((x) => x.kind === 'window')) {
      for (const o of [-4, 4]) { if (run.axis === 'h') line(g, px(c.a0), pz(run.c) + o, px(c.a1), pz(run.c) + o, 2); else line(g, px(run.c) + o, pz(c.a0), px(run.c) + o, pz(c.a1), 2) }
    }
  }
}
/* a door: its leaf from the hinge into its room and the swing back to the wall */
const inward = (r: Room, side: Room['openings'][number]['side']) => (side === 'n' ? { dx: 0, dz: 1 } : side === 's' ? { dx: 0, dz: -1 } : side === 'w' ? { dx: 1, dz: 0 } : { dx: -1, dz: 0 })
for (const r of plan.rooms) {
  for (const o of r.openings.filter((x) => x.kind === 'door')) {
    const l = sideLine(r, o.side), [a0, a1] = openingSpan(r, o)
    const hinge = o.swing === 'right' ? a1 : a0, free = o.swing === 'right' ? a0 : a1
    const w = (a1 - a0) * PX, n = inward(r, o.side)
    const hx = l.axis === 'h' ? px(hinge) : px(l.c), hz = l.axis === 'h' ? pz(l.c) : pz(hinge)
    const fx = l.axis === 'h' ? px(free) : px(l.c), fz = l.axis === 'h' ? pz(l.c) : pz(free)
    const tx = hx + n.dx * w, tz = hz + n.dz * w
    line(g, hx, hz, tx, tz, 2.5)
    g.setLineDash([7, 5]); g.lineWidth = 2; g.beginPath()
    const aT = Math.atan2(tz - hz, tx - hx), aF = Math.atan2(fz - hz, fx - hx)
    let d = aF - aT; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
    g.arc(hx, hz, w, aT, aF, d < 0); g.stroke(); g.setLineDash([])
  }
}
/* the rooms' names and their sizes, as an HDB brochure prints them */
for (const r of plan.rooms) {
  if (r.kind === 'corridor') continue
  const cx = px(r.x + r.w / 2), cz = pz(r.z + r.d / 2)
  const small = r.w < 200 || r.d < 200
  g.textAlign = 'center'; g.fillStyle = '#333333'; g.font = `600 ${small ? 15 : 21}px sans-serif`
  const words = r.name.toUpperCase().split(' ')
  const lines = small && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [words.join(' ')]
  lines.forEach((t, i) => g.fillText(t, cx, cz - (lines.length - 1) * 9 + i * 18))
  g.font = `400 ${small ? 13 : 15}px sans-serif`; g.fillStyle = '#6A6A6A'
  g.fillText(`${(r.w / 100).toFixed(1)} × ${(r.d / 100).toFixed(1)}`, cx, cz + (lines.length - 1) * 9 + (small ? 18 : 24))
}
/* the overall lengths, printed above and to the left — what a studio sets a scale from */
const dim = (x1: number, y1: number, x2: number, y2: number, mm: number) => {
  const horiz = y1 === y2
  line(g, x1, y1, x2, y2, 1.5, '#8A8A8A')
  for (const [x, y] of [[x1, y1], [x2, y2]] as const) { if (horiz) line(g, x, y - 7, x, y + 7, 1.5, '#8A8A8A'); else line(g, x - 7, y, x + 7, y, 1.5, '#8A8A8A') }
  g.save(); g.translate((x1 + x2) / 2 + (horiz ? 0 : -16), (y1 + y2) / 2 + (horiz ? -10 : 0)); if (!horiz) g.rotate(-Math.PI / 2)
  g.font = '500 17px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#555555'; g.fillText(mm.toLocaleString('en-SG'), 0, 0); g.restore()
}
dim(px(X0), pz(Z0) - 60, px(X1), pz(Z0) - 60, (X1 - X0) * 10)
dim(px(X0) - 60, pz(Z0), px(X0) - 60, pz(Z1), (Z1 - Z0) * 10)
g.textAlign = 'left'; g.fillStyle = '#222222'; g.font = '700 26px sans-serif'; g.fillText('WATERWAY SUNRISE · 4-ROOM FLAT (TYPE A)', PAD - 40, PH - 58)
g.font = '400 18px sans-serif'; g.fillStyle = '#666666'; g.fillText('Approx. floor area 93 sqm · not to scale', PAD - 40, PH - 28)

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
