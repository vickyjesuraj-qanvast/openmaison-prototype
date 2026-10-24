// Tools › Floorplan to 3D Isometric (REG-2800…2803) — the rules without a browser: the samples and their files, the rooms they say, the
// download's name, who opens the page, 1.0's addresses, ⌘K, the image model's seam. Run: npx tsx design-source/verify/floorplan-3d/fp3d-pure.mts
import fs from 'node:fs'
import path from 'node:path'
import { FP3D_WORDS, LOOK_CHOICES, READY_SAMPLES, SAMPLE_PLANS, renderFileName, sampleLooks, samplePlan, sampleRooms } from '../../../lib/floorplan-3d/model.ts'
import { roomSummary } from '../../../lib/planner/photo.ts'
import { opensPath } from '../../../lib/settings/roles.ts'
import { OLD_REDIRECTS } from '../../../lib/links/old-addresses.ts'
import { SERVICES } from '../../../lib/services/registry.ts'
import { SLOT_KEYS } from '../../../lib/services/slots.ts'
import { BENCH_SEAMS } from '../../../lib/dev/ai-benches.ts'
import { TEMPLATES } from '../../../lib/planner/templates.ts'
import { wallRuns } from '../../../lib/planner/model.ts'

let pass = 0, fail = 0
const ok = (c: unknown, what: string) => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}`) } }
const REPO = process.cwd()
const pub = (u: string) => path.join(REPO, 'public', u.replace(/^\//, ''))

console.log('the samples and their files')
ok(SAMPLE_PLANS.length === 3 && new Set(SAMPLE_PLANS.map((s) => s.key)).size === 3, 'three sample plans defined, each its own key')
for (const s of SAMPLE_PLANS) ok(fs.existsSync(pub(s.plan)), `${s.name}: its plan is a file (${s.plan})`)
/* (his "Ship HDB 4-Room only", 2026-10-23) a sample is offered only with views, and only the looks it has views for */
ok(READY_SAMPLES.map((s) => s.key).join() === 'hdb-4-room', 'the page offers the HDB 4-Room alone — the two others wait for their views')
ok(sampleLooks(samplePlan('hdb-4-room')!).map((l) => l.value).join() === 'dollhouse', '…in Dollhouse alone')
for (const s of READY_SAMPLES) for (const l of sampleLooks(s)) {
  const takes = s.renders[l.value]
  ok(takes.length === 2, `${s.name}: two ${l.label} takes, so Regenerate shows another`)
  for (const t of takes) ok(fs.existsSync(pub(t)) && fs.statSync(pub(t)).size > 20_000, `${s.name}: ${t.split('/').pop()} is a real picture`)
}
for (const l of LOOK_CHOICES) ok(fs.existsSync(pub(l.example)), `1.0's ${l.label} example is a file`)
ok(samplePlan('hdb-4-room')?.name === 'HDB 4-Room' && samplePlan('nope') === null, 'a sample is found by its key, and only by it')

console.log('the rooms a sample says (its plan\'s own)')
const chips = (k: string) => roomSummary(sampleRooms(samplePlan(k)!)).join(' · ')
ok(chips('hdb-4-room') === '3 bedrooms · 2 bathrooms · Kitchen · Living / dining area · 1 service yard · 2 storerooms · 11 rooms in all', `HDB 4-Room: ${chips('hdb-4-room')}`)
ok(/^2 bedrooms · 2 bathrooms · Kitchen/.test(chips('hdb-3-room')), `HDB 3-Room: ${chips('hdb-3-room')}`)
ok(/^3 bedrooms · 2 bathrooms · Kitchen · Living \/ dining area · 1 balcony/.test(chips('condo-3-bedroom')), `Condo 3-Bedroom: ${chips('condo-3-bedroom')}`)

console.log('the download, named for the plan and the look')
ok(renderFileName('HDB 4-Room', 'dollhouse', 'jpg') === 'HDB 4-Room — Dollhouse.jpg', 'HDB 4-Room — Dollhouse.jpg')
ok(renderFileName('My/plan:1', 'top', 'png') === 'My plan 1 — Top-down.png', 'a file name never carries / or :')
ok(FP3D_WORDS.pipeline.join(' · ') === 'Read the plan · Confirm the rooms · 3D render', '1.0\'s three steps')

console.log('who opens it (the planner\'s and the Visualizer\'s roles)')
for (const r of ['Owner', 'Admin', 'Designer', 'Manager']) ok(opensPath(r, '/floorplan-3d'), `${r} opens /floorplan-3d`)
for (const r of ['Accounting', 'Marketing']) ok(!opensPath(r, '/floorplan-3d') && opensPath(r, '/planner') === opensPath(r, '/floorplan-3d'), `${r} doesn't, as with the planner`)

console.log('1.0\'s addresses land on it')
const to = (from: string) => OLD_REDIRECTS.find((r) => r.source === from)?.destination
ok(to('/tools/floorplan-3d-isometric') === '/floorplan-3d', '/tools/floorplan-3d-isometric → /floorplan-3d')
ok(to('/tools/floorplan-3d-sandbox') === '/floorplan-3d', '/tools/floorplan-3d-sandbox → /floorplan-3d')

console.log('the image model\'s seam')
const seam = SERVICES.find((s) => s.key === 'floorplan-3d')
ok(seam && seam.kind === 'provider' && seam.slot === 'floorplan-3d' && SLOT_KEYS.includes('floorplan-3d'), 'a provider with its own slot')
ok(seam && fs.readFileSync(path.join(REPO, seam.swap.file), 'utf8').includes(`export const ${seam.swap.symbol}`), `its swap is ${seam?.swap.call} in ${seam?.swap.file}`)
ok((BENCH_SEAMS as readonly string[]).includes('floorplan-3d'), 'the developers\' bench names it')

console.log('the Condo flats: a bathroom keeps its wall to the foyer (REG-2803)')
for (const key of ['condo-2', 'condo-3']) {
  const t = TEMPLATES.find((x) => x.key === key)!
  const bath = t.rooms.find((r) => r.name === 'Bathroom')!
  const run = wallRuns(t.rooms).find((w) => w.axis === 'h' && w.c === bath.z + bath.d)
  const covered = run?.solid.some(([a, b]) => a <= bath.x + 1 && b >= bath.x + bath.w - 1)
  ok(covered, `${t.name}: the wall under its bathroom stands (its door cut in it)`)
  const kitchen = t.rooms.find((r) => r.kind === 'kitchen')!
  const kRun = wallRuns(t.rooms).find((w) => w.axis === 'h' && w.c === kitchen.z + kitchen.d)
  ok(!kRun || !kRun.solid.some(([a, b]) => a < kitchen.x + kitchen.w - 1 && b > kitchen.x + 1), `${t.name}: the kitchen stays open to the foyer`)
}

console.log(`\n${pass} passed · ${fail} failed`)
process.exit(fail ? 1 : 0)
