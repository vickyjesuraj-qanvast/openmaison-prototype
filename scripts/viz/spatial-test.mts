import sharp from 'sharp'
import { tmpdir } from 'node:os'
import { SAMPLE_ROOMS } from '../../lib/visualizer/samples.ts'
import { fallbackDetection, sampleDetection } from '../../lib/visualizer/model.ts'
import { fallbackDots } from '../../lib/visualizer/engine/fallback.ts'
import { depthOf, depthPicture, KIND_CODES } from '../../lib/visualizer/spatial/depth.ts'
import { extendDepth, extendRoom } from '../../lib/visualizer/spatial/extend.ts'
import { CAMERA_MOVES, FRONT, orbitYaw, photoCamera, pivotOf, poseFor, roomMesh } from '../../lib/visualizer/spatial/moves.ts'
import { orderCorners, quadUsable, seedCorners, squaredSize, warpToRect, type Quad } from '../../lib/planner/corners.ts'

/* Dev check (pending modules S41 — card studio:ai-sandboxes; the developers' bench /dev/ai-bench): the four experiments that only lived in 1.0's
   sandboxes, built by rule, run in Node on the AI Visualizer's three sample rooms and a photo nobody traced — a photo's depth (lib/visualizer/
   spatial/depth), the room mesh and the camera moves (moves.ts), the extended canvas (extend.ts) — and 1.0's floor-plan corner editor
   (lib/planner/corners.ts) on the demo plan photo. Each check prints PASS / FAIL; the script exits 1 on a failure. Depth maps, a squared plan
   and an extended room go to <outDir> to look at.
   Usage: npx tsx scripts/viz/spatial-test.mts [outDir] */
type Img = { width: number; height: number; data: Uint8ClampedArray }
const out = process.argv[2] ?? tmpdir()
const load = async (p: string): Promise<Img> => { const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) } }
const save = (img: Img, name: string) => sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toFile(`${out}/${name}.png`)
let failed = 0
const check = (ok: boolean, what: string, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? ` — ${detail}` : ''}`) }

console.log('1 · a photo’s depth, read from the room’s shape')
for (const room of SAMPLE_ROOMS) {
  const photo = await load(`public${room.original}`)
  const t = Date.now(), d = depthOf(photo, room.original, sampleDetection(room)), ms = Date.now() - t
  const N = d.width * d.height
  check(d.metres.length === N && d.kinds.length === N && d.metres.every((z) => Number.isFinite(z) && z >= d.near - 1e-6 && z <= d.far + 1e-6), `${room.key}: every pixel has a distance inside its near and far`, `${d.width}×${d.height} · ${d.near.toFixed(2)}–${d.far.toFixed(2)} m · ${ms} ms`)
  check(d.camera === 'traced', `${room.key}: the camera is read off the walls’ outlines`, `horizon at ${Math.round((d.frame.yh / d.height) * 100)} %`)
  check(d.near > 0.3 && d.near < 3 && d.far > d.near + 1 && d.far <= 12, `${room.key}: a home’s distances (nearest 0.3–3 m, farthest ≤ 12 m)`)
  /* the floor comes nearer row by row down the photo (a column through its middle) */
  let mono = true, rows = 0
  for (let y = 0, prev = Infinity; y < d.height; y++) {
    const i = y * d.width + Math.round(d.width * 0.5)
    if (d.kinds[i] !== KIND_CODES.floor) continue
    if (prev !== Infinity && d.metres[i]! > prev + 1e-3) mono = false
    prev = d.metres[i]!; rows++
  }
  check(rows === 0 || mono, `${room.key}: the floor comes nearer down the photo`, `${rows} floor rows in the middle column`)
  /* a standing piece is never behind the wall above it */
  let behind = 0, measured = 0
  for (let x = 0; x < d.width; x += 3) {
    let wall = -1
    for (let y = 0; y < d.height; y++) {
      const i = y * d.width + x, k = d.kinds[i]
      if (k === KIND_CODES.upright) wall = d.metres[i]!
      else if (k === KIND_CODES.piece && wall > 0) { measured++; if (d.metres[i]! > wall + 0.05) behind++ }
    }
  }
  check(measured === 0 || behind / measured < 0.03, `${room.key}: pieces stand in front of the walls above them`, `${behind} of ${measured} piece pixels behind`)
  check(d.layers.some((l) => l.kind === 'floor') && d.layers.some((l) => l.kind === 'upright'), `${room.key}: its floor and walls are layers`, d.layers.map((l) => `${l.label} ${l.near.toFixed(1)}–${l.far.toFixed(1)}`).slice(0, 4).join(' · '))
  await save(depthPicture(d), `spatial-depth-${room.key}`)
}
{
  const photo = await load('public/uat-files/sophia-living-room.jpg')
  const det = fallbackDetection(fallbackDots(photo)), d = depthOf(photo, 'sophia', det)
  check(d.camera === 'default' && d.source === 'fallback', 'a photo nobody traced: the default camera, said', `horizon at ${Math.round((d.frame.yh / d.height) * 100)} %`)
  check(d.metres.every((z) => Number.isFinite(z)) && d.far > d.near, 'a photo nobody traced still gets a whole map', `${d.near.toFixed(2)}–${d.far.toFixed(2)} m`)
  await save(depthPicture(d), 'spatial-depth-upload')
}

console.log('2 · the room mesh and the camera moves')
{
  const room = SAMPLE_ROOMS[0]!
  const d = depthOf(await load(`public${room.original}`), room.original, sampleDetection(room))
  const pivot = pivotOf(d)
  check(pivot > d.near && pivot < d.far, 'the orbit turns about the room’s middle', `${pivot.toFixed(2)} m`)
  const m = roomMesh({ metres: d.metres, width: d.width, height: d.height, frame: d.frame, step: 2, pivot })
  check(m.triangles > 0 && m.positions.every((v) => Number.isFinite(v)), 'every pixel lifts to a finite point', `${m.triangles} triangles`)
  const trimmed = roomMesh({ metres: d.metres, width: d.width, height: d.height, frame: d.frame, step: 2, pivot, trim: 0.12 })
  check(trimmed.trimmed > 0 && trimmed.triangles + trimmed.trimmed === m.triangles, 'Trim edges cuts the silhouettes away, nothing else', `${trimmed.trimmed} cut`)
  /* at rest the mesh projects back onto the photo: a vertex's own pixel */
  const v = Math.floor(m.cols / 2) + Math.floor(m.rows / 2) * m.cols, X = m.positions[v * 3]!, Y = m.positions[v * 3 + 1]!, Zc = -m.positions[v * 3 + 2]!
  const px = d.frame.cx + (X / Zc) * d.frame.f, py = d.frame.yh - (Y / Zc) * d.frame.f
  const gx = Math.min(d.width - 1, Math.floor(m.cols / 2) * 2) + 0.5, gy = Math.min(d.height - 1, Math.floor(m.rows / 2) * 2) + 0.5
  check(Math.abs(px - gx) < 0.01 && Math.abs(py - gy) < 0.01, 'from the photo’s own camera, a lifted pixel lands back on itself', `${px.toFixed(2)},${py.toFixed(2)} vs ${gx},${gy}`)
  const cam = photoCamera(d.width, d.height, d.frame.f, d.frame.yh)
  check(cam.fullH >= d.height && cam.offsetY >= 0 && cam.fovDeg > 20 && cam.fovDeg < 120, 'the photo’s camera: its horizon kept where the photo has it', `${cam.fovDeg.toFixed(1)}° · offset ${cam.offsetY.toFixed(1)}`)
  const f0 = poseFor({ yaw: 0, pitch: 0, dx: 0, dy: 0, dz: 0 }, pivot)
  check(Math.abs(f0.x) + Math.abs(f0.y) + Math.abs(f0.z) < 1e-9 && FRONT.yaw === 0, 'no move is the photo’s own camera')
  const left = poseFor(CAMERA_MOVES.find((x) => x.id === 'orbit-left')!, pivot), right = poseFor(CAMERA_MOVES.find((x) => x.id === 'orbit-right')!, pivot)
  check(left.x < 0 && right.x > 0 && Math.abs(Math.hypot(left.x, left.z + pivot) - pivot) < 1e-6, 'an orbit keeps the room’s middle at the same distance, left goes left')
  const back = poseFor(CAMERA_MOVES.find((x) => x.id === 'step-back')!, pivot), raise = poseFor(CAMERA_MOVES.find((x) => x.id === 'raise')!, pivot)
  check(back.z > 0 && raise.y > 0 && raise.pitch < 0, 'a step back moves back; raising looks down a little (1.0’s words)')
  check(Math.abs(orbitYaw(0)) < 1e-9 && Math.abs(orbitYaw(1.5) - 8) < 1e-6 && Math.abs(orbitYaw(4.5) + 8) < 1e-6, 'the clip’s swing: 8° each way every 6 s')
}

console.log('3 · more room around the photo')
{
  const room = SAMPLE_ROOMS[1]!, photo = await load(`public${room.original}`)
  for (const mode of ['mirror', 'cover'] as const) {
    const e = extendRoom(photo, 1.4, mode)
    check(e.img.width === Math.round(photo.width * 1.4) && e.img.height === Math.round(photo.height * 1.4), `${mode}: 1.4 times the photo`, `${e.img.width}×${e.img.height}`)
    let same = true
    for (let y = 0; y < photo.height && same; y += 7) for (let x = 0; x < photo.width; x += 7) {
      const a = (y * photo.width + x) * 4, b = ((y + e.inner.y) * e.img.width + x + e.inner.x) * 4
      if (photo.data[a] !== e.img.data[b] || photo.data[a + 1] !== e.img.data[b + 1]) { same = false; break }
    }
    check(same, `${mode}: the photo sits in the middle untouched`)
    if (mode === 'mirror') await save(e.img, 'spatial-extended-kitchen')
  }
  const e = extendRoom(photo, 1.4, 'mirror')
  const edge = (e.inner.y + 100) * e.img.width + e.inner.x - 1, inside = (100 * photo.width + 1)
  const near = Math.abs(e.img.data[edge * 4]! - photo.data[inside * 4]!)
  check(near < 40, 'mirror: just past the edge, the photo runs on', `Δ ${near}`)
  const dep = extendDepth(new Float32Array(photo.width * photo.height).fill(3), photo.width, photo.height, 1.4)
  check(dep.width === e.img.width && dep.height === e.img.height && dep.metres.every((z) => z === 3), 'the depth is laid on the same canvas, its edge carried out')
}

console.log('4 · a floor-plan photo squared by its four corners')
{
  const plan = await load('public/planner/demo/floor-plan-photo-waterway-sunrise.jpg')
  const seed = seedCorners(plan)
  check(seed.found && quadUsable(seed.quad, plan.width, plan.height), 'the demo plan photo: the corners start on the sheet the rule finds', seed.quad.map((c) => `${Math.round(c.x)},${Math.round(c.y)}`).join(' '))
  const sq = warpToRect(plan, seed.quad)
  const sz = squaredSize(seed.quad)
  check(sq.width === sz.w && sq.height === sz.h && Math.max(sq.width, sq.height) <= 1600, 'Square it: the sheet’s own size, at most 1600 px', `${sq.width}×${sq.height}`)
  await save(sq, 'spatial-plan-squared')
  /* the picture's own corners give the picture back */
  const small = await sharp('public/planner/demo/floor-plan-photo-waterway-sunrise.jpg').resize(200).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const s = { width: small.info.width, height: small.info.height, data: new Uint8ClampedArray(small.data) }
  const whole: Quad = [{ x: 0, y: 0 }, { x: s.width, y: 0 }, { x: s.width, y: s.height }, { x: 0, y: s.height }]
  const id = warpToRect(s, whole)
  let diff = 0
  for (let i = 0; i < s.width * s.height; i += 13) diff = Math.max(diff, Math.abs(id.data[i * 4]! - s.data[i * 4]!))
  check(id.width === s.width && id.height === s.height && diff < 40, 'the picture’s own corners give the picture back', `Δ ${diff}`)
  const shuffled = orderCorners([whole[2], whole[0], whole[3], whole[1]])
  check(shuffled.every((c, i) => c.x === whole[i]!.x && c.y === whole[i]!.y), 'corners in any order are put round: top-left, top-right, bottom-right, bottom-left')
  check(!quadUsable([whole[0], whole[2], whole[1], whole[3]], s.width, s.height) && !quadUsable([whole[0], whole[0], whole[2], whole[3]], s.width, s.height), 'a crossed or collapsed quad is refused')
}

console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
