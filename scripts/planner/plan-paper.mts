/*
 * The house's printed floor plan, drawn once for every script that needs one: walls with their doors and windows cut out, each door's leaf and
 * swing, the rooms' names and sizes as an HDB brochure prints them, the overall lengths, and the sheet's title. Drawn with @napi-rs/canvas from a
 * planner plan (lib/planner/templates.ts), in scripts/demo-floor-plans.mjs's style. Used by the S28 photo (scripts/planner/floor-plan-photo.mts)
 * and Tools › Floorplan to 3D Isometric's sample plans (scripts/floorplan-3d/sample-plans.mts).
 */
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas'
import { openingSpan, sideLine, wallRuns, type PlanDoc, type Room } from '../../lib/planner/model.ts'

export const PX = 1.25   // pixels per centimetre on the paper
const PAD = 130

export function drawPlanPaper(plan: PlanDoc, o: { title: string; note: string; paper?: string }): { canvas: Canvas; width: number; height: number } {
  const xs = plan.rooms.flatMap((r) => [r.x, r.x + r.w]), zs = plan.rooms.flatMap((r) => [r.z, r.z + r.d])
  const X0 = Math.min(...xs), Z0 = Math.min(...zs), X1 = Math.max(...xs), Z1 = Math.max(...zs)
  const PW = Math.round((X1 - X0) * PX + PAD * 2), PH = Math.round((Z1 - Z0) * PX + PAD * 2 + 90)
  const px = (x: number) => PAD + (x - X0) * PX, pz = (z: number) => PAD + (z - Z0) * PX

  const paper = createCanvas(PW, PH)
  const g = paper.getContext('2d')
  g.fillStyle = o.paper ?? '#FBF8F1'; g.fillRect(0, 0, PW, PH)
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
        for (const k of [-4, 4]) { if (run.axis === 'h') line(g, px(c.a0), pz(run.c) + k, px(c.a1), pz(run.c) + k, 2); else line(g, px(run.c) + k, pz(c.a0), px(run.c) + k, pz(c.a1), 2) }
      }
    }
  }
  /* a door: its leaf from the hinge into its room and the swing back to the wall */
  const inward = (side: Room['openings'][number]['side']) => (side === 'n' ? { dx: 0, dz: 1 } : side === 's' ? { dx: 0, dz: -1 } : side === 'w' ? { dx: 1, dz: 0 } : { dx: -1, dz: 0 })
  for (const r of plan.rooms) {
    for (const op of r.openings.filter((x) => x.kind === 'door')) {
      const l = sideLine(r, op.side), [a0, a1] = openingSpan(r, op)
      const hinge = op.swing === 'right' ? a1 : a0, free = op.swing === 'right' ? a0 : a1
      const w = (a1 - a0) * PX, n = inward(op.side)
      /* a wide opening (a balcony's) is a sliding door: two leaves overlapping in the gap, as a plan draws one */
      if (a1 - a0 > 150) {
        const leaf = (a1 - a0) * 0.55
        for (const [s, e, k] of [[a0, a0 + leaf, -4], [a1 - leaf, a1, 4]] as const) {
          if (l.axis === 'h') line(g, px(s), pz(l.c) + k, px(e), pz(l.c) + k, 3); else line(g, px(l.c) + k, pz(s), px(l.c) + k, pz(e), 3)
        }
        continue
      }
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
  g.textAlign = 'left'; g.fillStyle = '#222222'; g.font = '700 26px sans-serif'; g.fillText(o.title, PAD - 40, PH - 58)
  g.font = '400 18px sans-serif'; g.fillStyle = '#666666'; g.fillText(o.note, PAD - 40, PH - 28)
  return { canvas: paper, width: PW, height: PH }
}
