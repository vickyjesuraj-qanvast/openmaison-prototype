/*
 * (REG-2800) Tools › Floorplan to 3D Isometric's sample plans — the two drawn ones (the third sample is the S28 photo of a printed HDB 4-Room on a
 * desk, public/planner/demo/floor-plan-photo-waterway-sunrise.jpg). Each is a planner flat (lib/planner/templates.ts — so its "We found" rooms
 * are the plan's own) drawn in the house's plan style (scripts/planner/plan-paper.mts) on white, as a plan saved from a developer's PDF reads.
 * Their ready-made renders sit beside them (lib/floorplan-3d/samples.ts). Run: `npx tsx scripts/floorplan-3d/sample-plans.mts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planFromTemplate } from '../../lib/planner/templates.ts'
import { drawPlanPaper } from '../planner/plan-paper.mts'

const OUT = join(process.cwd(), 'public', 'floorplan-3d', 'samples')
mkdirSync(OUT, { recursive: true })

const SHEETS = [
  { file: 'hdb-3-room.png', template: 'hdb-3', title: '3-ROOM FLAT (TYPE B)', note: 'Approx. floor area 68 sqm · not to scale' },
  { file: 'condo-3-bedroom.png', template: 'condo-3', title: '3-BEDROOM CONDOMINIUM UNIT', note: 'Approx. floor area 101 sqm · not to scale' },
]
for (const s of SHEETS) {
  const { canvas, width, height } = drawPlanPaper(planFromTemplate(s.template), { title: s.title, note: s.note, paper: '#FFFFFF' })
  writeFileSync(join(OUT, s.file), canvas.toBuffer('image/png'))
  console.log(`wrote public/floorplan-3d/samples/${s.file}`, `${width}×${height}`)
}
