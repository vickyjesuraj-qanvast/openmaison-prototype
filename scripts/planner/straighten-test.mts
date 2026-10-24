/*
 * (pending modules S28) A harness for Make a 3D picture's first step: the browser's own pipeline (lib/planner/straighten-run.ts) run in Node on
 * @napi-rs/canvas, on the demo's floor-plan photo (public/planner/demo/floor-plan-photo-waterway-sunrise.jpg — drawn by floor-plan-photo.mts at
 * 1.25 px/cm, turned 7° on a wooden desk) and on the same plan as a clean scan (no sheet to find): the sheet found and cut out, the tilt read
 * back, the plan's footprint read, and the floor area's size checked against the drawing's own. Writes the straightened pictures to the folder
 * given (default: the system temp folder). Run: `npx tsx scripts/planner/straighten-test.mts [outDir]`.
 */
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { straightenCanvas, type Can } from '../../lib/planner/straighten-run.ts'
import { scaleFromArea, sizeAt } from '../../lib/planner/photo.ts'

const out = process.argv[2] ?? tmpdir()
const make = (w: number, h: number) => createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))) as unknown as Can
const fails: string[] = []
const src = await loadImage(join(process.cwd(), 'public', 'planner', 'demo', 'floor-plan-photo-waterway-sunrise.jpg'))
const photo = createCanvas(src.width, src.height); photo.getContext('2d').drawImage(src, 0, 0)

/* the drawing's own scale on the photo: the paper (1585 px wide at 1.25 px/cm) laid at k = min(1600/1585, 1260/1450) */
const truth = 10 / (1.25 * Math.min((2000 * 0.8) / 1585, (1500 * 0.84) / 1450))
const t0 = Date.now()
const r = straightenCanvas(make, photo as unknown as Can, { clean: true, quarter: 0, edge: 2400 })
const mm = scaleFromArea(93, r.share, r.canvas.width, r.canvas.height)!
console.log(`photo · sheet ${r.paper ? 'found' : 'NOT found'} · tilt ${r.angle.toFixed(2)}° · ${r.canvas.width}×${r.canvas.height} · footprint ${r.read ? `${(r.share * 100).toFixed(1)} %` : 'not read'} · ${mm.toFixed(2)} mm/px (drawing ${truth.toFixed(2)}) · ${sizeAt(mm, r.canvas.width, r.canvas.height)} · ${Date.now() - t0} ms`)
if (!r.paper) fails.push('the sheet of paper was not found on the photo')
if (Math.abs(r.angle - 7) > 0.6) fails.push(`the tilt read ${r.angle.toFixed(2)}° (the photo is turned 7°)`)
if (!r.read) fails.push('the outline did not read')
if (Math.abs(mm / truth - 1) > 0.12) fails.push(`the floor area's size ${mm.toFixed(2)} mm/px is more than 12 % off the drawing's ${truth.toFixed(2)}`)
writeFileSync(join(out, 'straightened-photo.jpg'), (r.canvas as unknown as Canvas).toBuffer('image/jpeg', 88))

/* the same plan as a scan: on white, turned 3° — no sheet to cut out, the tilt read from the walls alone */
const clean = r.canvas as unknown as Canvas
const scan = createCanvas(clean.width + 200, clean.height + 200), sg = scan.getContext('2d')
sg.fillStyle = '#ffffff'; sg.fillRect(0, 0, scan.width, scan.height)
sg.save(); sg.translate(scan.width / 2, scan.height / 2); sg.rotate((-3 * Math.PI) / 180); sg.drawImage(clean, -clean.width / 2, -clean.height / 2); sg.restore()
const s2 = straightenCanvas(make, scan as unknown as Can, { clean: true, quarter: 0, edge: 2400 })
console.log(`scan · sheet ${s2.paper ? 'found' : 'none'} · tilt ${s2.angle.toFixed(2)}° · ${s2.canvas.width}×${s2.canvas.height} · footprint ${s2.read ? `${(s2.share * 100).toFixed(1)} %` : 'not read'}`)
if (s2.paper) fails.push('a scan on white has no sheet to cut out')
if (Math.abs(s2.angle - 3) > 0.5) fails.push(`a scan turned 3° read a tilt of ${s2.angle.toFixed(2)}°`)
/* as it was: only a quarter turn */
const q = straightenCanvas(make, photo as unknown as Can, { clean: false, quarter: 1, edge: 2400 })
if (q.canvas.width !== photo.height || q.canvas.height !== photo.width || q.angle !== 0) fails.push(`as it was, a quarter turn should only swap the sides (${q.canvas.width}×${q.canvas.height})`)
writeFileSync(join(out, 'straightened-scan.jpg'), (s2.canvas as unknown as Canvas).toBuffer('image/jpeg', 88))
/* (REG-2804) a clean page — a plan saved from a PDF: white, its rooms in hairlines (well under 2 % ink) — stays white with its lines dark;
   both levels read white and the plan came out black */
const page = createCanvas(1240, 1754), pg = page.getContext('2d')
pg.fillStyle = '#ffffff'; pg.fillRect(0, 0, page.width, page.height)
pg.strokeStyle = '#000000'; pg.lineWidth = 2
pg.strokeRect(170, 250, 920, 880); pg.beginPath(); pg.moveTo(170, 580); pg.lineTo(1090, 580); pg.moveTo(630, 580); pg.lineTo(630, 1130); pg.moveTo(840, 250); pg.lineTo(840, 580); pg.stroke()
const p3 = straightenCanvas(make, page as unknown as Can, { clean: true, quarter: 0, edge: 2400 })
const px3 = (p3.canvas as unknown as Canvas).getContext('2d').getImageData(0, 0, p3.canvas.width, p3.canvas.height).data
let lum = 0, dark = 0
for (let i = 0; i < px3.length; i += 4) { const l = 0.299 * px3[i]! + 0.587 * px3[i + 1]! + 0.114 * px3[i + 2]!; lum += l; if (l < 128) dark++ }
const mean = lum / (px3.length / 4)
console.log(`page · ${p3.canvas.width}×${p3.canvas.height} · mean ${mean.toFixed(0)} · ${dark} dark pixels`)
if (mean < 230) fails.push(`a clean page came out dark (mean ${mean.toFixed(0)})`)
if (dark < 1000) fails.push('a clean page lost its lines')
writeFileSync(join(out, 'straightened-page.jpg'), (p3.canvas as unknown as Canvas).toBuffer('image/jpeg', 88))
console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'pass')
process.exit(fails.length ? 1 : 0)
