// Pending modules, step S28 · Floor-plan photo to a 3D picture (the owner's "build all of them but one after the other", 2026-10-11; survey
// key studio:floorplan-isometric-ai — "Upload a floor-plan photo and get a furnished 3D picture" · "The room list read from the plan, editable
// before drawing" · "Two looks, Dollhouse and Top-down, and a download"). Each item asserted as the rule it builds, never another round's count:
//  - the doors: /planner?view=iso&photo=1 (⌘K's Make a 3D picture — Tools › Floorplan to 3D Isometric until REG-2800) opens Make a 3D picture (For: Personal); the planner's New ▾ and
//    the New layout dialog's photo card; ⌘K's Create; a floor plan's ⋮ in Files (a picture named so, or in Floor plans — never any photo); the
//    project's Floor plan tab ⋮
//  - the photo straightened and cleaned in the browser by 1.0's rules (the demo photo is turned 7° on a desk: the sheet is found, the tilt
//    read back), Turn a quarter swaps its sides, the switch off keeps it as it was taken
//  - the room list by rule from the flat type on record (an HDB 4-Room's eleven rooms, 1.0's chips), changed before drawing (a room off, a
//    room on), the size from the floor area (within 15 % of the drawing's own) or a length marked on the plan; a project's plan with a scale
//    keeps its scale
//  - one record: from Files the photo is the lead's file (no second file), its straightened picture a floor_plan_photos row, served by
//    /planner/plan-picture/<id> to the studio and never to Accounting; a project's photo IS a Floor plan tab plan; a personal one keeps nothing
//    in any client's Files; at Won the lead's photo becomes the project's floor plan with the same id and the layout's picture keeps its address
//  - placing: each rectangle drawn on the photo becomes the next listed room (its name and kind), Not on this plan takes one off with Undo,
//    a row goes next, "Every room is on the plan", Make the 3D picture furnishes the bare rooms by rule (Undo) and opens the picture:
//    Dollhouse and Top-down, Download (a PNG named for the look), Save to Files (Files › Renders), Render in AI Visualizer (REG-1658's door)
//  - Change its size… resizes the plan with its rooms (Undo); a Designer not on the lead is told why; Activity names the photo
//  - 390 / 768 touch / 320: the dialog as a sheet, the guide on the stage, no sideways scroll against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s28.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s28')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const PHOTO = path.join(__dirname, '..', '..', '..', 'public', 'planner', 'demo', 'floor-plan-photo-waterway-sunrise.jpg')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s28-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const planOf = (id) => JSON.parse(sql(`select plan from space_layouts where id='${id}'`) || '{}')
const FARAH = 'c9691890-3132-4902-9c2a-d251f6bfda9a'
const VIVIEN = sql(`select id from leads where name = 'Vivien Lee' and deleted_at is null`)
const BEN = sql(`select id from projects where number = 'P-2026-002'`)
const BEN_PLAN = sql(`select id from project_floor_plans where project_id = '${BEN}' and name = 'Proposed layout'`)
/* the planner's HDB 4-Room (lib/planner/templates.ts) — the rooms the photo is drawn from, in centimetres */
const HDB4 = { 'Living / Dining': [0, 0, 600, 440], Kitchen: [600, 0, 320, 260], 'Service yard': [920, 0, 140, 440], Bathroom: [600, 260, 170, 180], Store: [770, 260, 150, 180], Corridor: [0, 440, 1060, 100],
  'Bedroom 3': [0, 540, 300, 340], 'Bedroom 2': [300, 540, 300, 340], 'Master bathroom': [600, 540, 170, 190], 'Walk-in wardrobe': [600, 730, 170, 150], 'Master bedroom': [770, 540, 290, 340] }
/* the drawing's own size on the photo: 1.25 px/cm on paper, the paper laid at min(1600/1585, 1260/1450) — mm per picture pixel */
const TRUTH_MM = 10 / (1.25 * Math.min(1600 / 1585, 1260 / 1450))

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, acceptDownloads: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1800) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  /* (the calm UI build 2026-10-27, a deliberate change) — 6-06 · W-020: the planner's photo start is named apart from Tools › Floorplan to 3D Isometric — "Trace a floor-plan photo" (the
     doors in ⌘K, Files and a project's Floor plan still read "Make a 3D picture" until their lanes rename them) */
  const photoDialog = (p) => p.locator('[role="dialog"][aria-label="Trace a floor-plan photo"]')
  const saved = async (p) => { await settle(p, 300); await p.waitForFunction(() => /Saved/.test(document.querySelector('[data-testid="planner-saved"]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {}); await settle(p, 700) }
  const waitPicture = (p) => p.waitForFunction(() => !!document.querySelector('[data-testid="photo-picture"]'), null, { timeout: 30000 }).catch(() => {})
  const pictureFacts = (p) => p.getByTestId('photo-picture').evaluate((n) => ({ angle: Number(n.getAttribute('data-angle')), w: Number(n.getAttribute('data-width')), h: Number(n.getAttribute('data-height')) }))
  const upload = async (p) => { await photoDialog(p).locator('input[type="file"]').setInputFiles(PHOTO); await waitPicture(p); await settle(p, 400) }
  const layoutIdOf = (p) => p.url().split('/planner/')[1]?.split(/[?/]/)[0] ?? ''
  const fileMenu = async (p, name) => { await p.getByRole('button', { name: new RegExp(`^Actions for ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click(); await settle(p, 400); return (await p.getByRole('menuitem').allInnerTexts()).map((x) => x.split('\n')[0].trim()) }
  /** each listed room dragged over its place on the photo: the walls' outline found in the picture, the drawing's rooms mapped onto it */
  const traceRooms = async (p, names) => { for (const n of names) if (!(await traceRoom(p, n))) return false; return true }
  const traceRoom = async (p, n) => {
    const g = await p.evaluate(async () => {
      const im = document.querySelector('[data-testid="planner-top"] image[data-underlay]')
      if (!im) return null
      const img = new Image(); img.src = im.getAttribute('href'); await img.decode()
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      const dark = (x, y) => { const i = (y * c.width + x) * 4; return d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90 }
      const long = (len, n, at) => { let run = 0, best = 0; for (let k = 0; k < len; k++) { if (at(k)) { run++; if (run > best) best = run } else run = 0 } return best > n }
      let top = -1, bottom = -1, left = -1, right = -1
      for (let y = 0; y < c.height; y++) if (long(c.width, c.width * 0.3, (x) => dark(x, y))) { if (top < 0) top = y; bottom = y }
      for (let x = 0; x < c.width; x++) if (long(c.height, c.height * 0.3, (y) => dark(x, y))) { if (left < 0) left = x; right = x }
      let t = 0; const mid = Math.round((left + right) / 2) + 40; while (top + t < c.height && dark(mid, top + t)) t++
      const svg = document.querySelector('[data-testid="planner-top"] svg'), r = svg.getBoundingClientRect()
      return { nat: [c.width, c.height], box: [left + t / 2, top + t / 2, right - t / 2, bottom - t / 2], u: ['x', 'y', 'width', 'height'].map((k) => Number(im.getAttribute(k))), vb: svg.getAttribute('viewBox').split(' ').map(Number), rect: [r.left, r.top, r.width, r.height] }
    })
    if (!g) return false
    const [bx0, bz0, bx1, bz1] = g.box, [ux, uz, uw, uh] = g.u, [vx, vz, vw, vh] = g.vb, [rl, rt, rw, rh] = g.rect
    const s = Math.min(rw / vw, rh / vh), ox = rl + (rw - vw * s) / 2, oz = rt + (rh - vh * s) / 2
    const screen = (tx, tz) => { const px = bx0 + (tx / 1060) * (bx1 - bx0), pz = bz0 + (tz / 880) * (bz1 - bz0); const cx = ux + (px / g.nat[0]) * uw, cz = uz + (pz / g.nat[1]) * uh; return [ox + (cx - vx) * s, oz + (cz - vz) * s] }
    const [x, z, w, d] = HDB4[n]
    const [x0, y0] = screen(x + 4, z + 4), [x1, y1] = screen(x + w - 4, z + d - 4)
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await p.mouse.move(x1, y1, { steps: 4 }); await p.mouse.up(); await settle(p, 350)
    return true
  }

  const FAR_FILE = sql(`select id from lead_files where lead_id = '${FARAH}' and name = 'Floor plan — Waterway Sunrise.jpg' and deleted_at is null`)
  try {
    const ctx = await desk()
    const p = await page(ctx, 'desk')
    as('dane')

    // ── 1 · The doors ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Where Make a 3D picture opens from')
      /* (REG-2800, a deliberate change of this rule) Tools › Floorplan to 3D Isometric is 1.0's module on its own page again (verify-fp3d.cjs);
         ⌘K's Make a 3D picture still opens the planner on it */
      await go(p, '/planner?view=iso&photo=1', 2500)
      const d = photoDialog(p)
      ok(await d.count() === 1 && /Step 1 of 2/.test(await text(d)), 'it opens on Make a 3D picture — step 1 of 2 (1.0’s tool began with the upload)')
      ok(/Personal — not for a client/.test(await d.getByRole('combobox', { name: 'For' }).innerText()) && /Pick a lead or a project/.test(await text(d)), 'For: Personal by default, and it says a lead or a project keeps the photo in their Files')
      ok(/\/planner\?view=iso$/.test(p.url()), 'the address keeps the isometric view and drops the one-time photo=1')
      await shot(p, '01-tools-dialog-1440')
      await p.keyboard.press('Escape'); await settle(p, 600)
      ok(await p.getByTestId('planner-iso-note').count() === 1 && await p.getByTestId('planner-iso-photo').count() === 1, 'closed: the isometric line under it carries Make a 3D picture')
      await p.getByTestId('planner-iso-photo').click(); await settle(p, 900)
      ok(await photoDialog(p).count() === 1, 'the line’s Make a 3D picture opens it again'); await p.keyboard.press('Escape'); await settle(p, 500)
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 400)
      ok(await p.getByRole('menuitem', { name: /Trace a floor-plan photo/ }).count() === 1, 'New ▾ › Trace a floor-plan photo…')   // (the calm UI build 2026-10-27, a deliberate change)
      await p.getByRole('menuitem', { name: /From a (flat template|template or a flat|ready-made flat)/ }).click(); await settle(p, 700)   // (the calm UI build 2026-10-27, a deliberate change) — 6-30
      const card = p.locator('[data-testid="planner-template"][data-key="photo"]')
      ok(await card.count() === 1 && /Trace a floor-plan photo/.test(await card.innerText()), 'the New layout dialog has the photo’s card beside Blank')   // (the calm UI build) — 6-06
      await card.click(); ok(/^Next$/.test((await p.getByTestId('planner-start').innerText()).trim()), 'its button reads Next')
      await p.getByTestId('planner-start').click(); await settle(p, 900)
      ok(await photoDialog(p).count() === 1 && await p.getByTestId('planner-new-dialog').count() === 0, 'Next: the photo’s dialog takes over')
      await p.keyboard.press('Escape'); await settle(p, 500)
      /* ⌘K's Create */
      await p.keyboard.press('Meta+k'); await settle(p, 500)
      await p.keyboard.type('3d picture'); await settle(p, 1200)
      const create = p.getByRole('option', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: ⌘K's row and the project's Floor plan ⋮ read "Trace a floor-plan photo" */ /Trace a floor-plan photo/ })
      ok(await create.count() >= 1, '⌘K › Create offers Trace a floor-plan photo (found by “3d picture”)')
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* Files: only a floor plan offers it */
      await go(p, `/leads/${FARAH}/files`)
      await p.getByText('Floor plans', { exact: true }).first().dblclick(); await settle(p, 1500)
      ok((await fileMenu(p, 'Floor plan — Waterway Sunrise.jpg')).includes('Trace a floor-plan photo') /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020 */, 'Files: the floor plan’s ⋮ has Make a 3D picture')
      await p.keyboard.press('Escape'); await settle(p, 300)
      const olivia = sql(`select id from leads where name = 'Olivia Martinez'`)
      await go(p, `/leads/${olivia}/files`)
      const any = sql(`select name from lead_files where lead_id = '${olivia}' and kind = 'image' and parent_id is null and deleted_at is null limit 1`)
      ok(!!any && !(await fileMenu(p, any)).includes('Trace a floor-plan photo') /* (the calm UI build 2026-10-27, a deliberate change) 6-06 */, `any other picture’s ⋮ doesn’t (${any})`)
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* the project's Floor plan tab */
      await go(p, `/projects/${BEN}/floor-plan?plan=${BEN_PLAN}`, 2500)
      await p.getByTestId('plan-kebab').click(); await settle(p, 400)
      ok(await p.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: ⌘K's row and the project's Floor plan ⋮ read "Trace a floor-plan photo" */ /Trace a floor-plan photo/ }).count() === 1, 'the project’s Floor plan ⋮ has Trace a floor-plan photo')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 2 · From Files: the photo straightened, the rooms by rule, the size — one record ────────────────────────────────────────────────
    let LAY = '', PH = ''
    if (want(2) || want(3) || want(4)) {
      console.log('2 · Farah’s floor-plan photo from her Files')
      const files0 = Number(sql(`select count(*) from lead_files where lead_id = '${FARAH}'`))
      await go(p, `/leads/${FARAH}/files`)
      await p.getByText('Floor plans', { exact: true }).first().dblclick(); await settle(p, 1500)
      await fileMenu(p, 'Floor plan — Waterway Sunrise.jpg')
      await p.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: Files' ⋮ */ 'Trace a floor-plan photo' }).click(); await waitPicture(p); await settle(p, 600)
      const d = photoDialog(p)
      ok(/For Farah Ahmad — the photo is kept in their Files › Floor plans/.test(await text(d)), 'the dialog names Farah and where the photo is kept')
      const f0 = await pictureFacts(p)
      ok(Math.abs(f0.angle - 7) < 0.6 && /Straightened by 7\.\d° and cleaned/.test(await text(p.getByTestId('photo-line'))), `the photo is straightened — the sheet found on the desk, its 7° tilt read back (${f0.angle}°)`)
      await shot(p, '02-straightened-1440')
      await p.getByTestId('photo-turn').click(); await waitPicture(p); await settle(p, 1500)
      const f1 = await pictureFacts(p)
      ok(Math.abs(f1.w - f0.h) <= 4 && Math.abs(f1.h - f0.w) <= 4, `Turn a quarter swaps its sides (${f0.w}×${f0.h} → ${f1.w}×${f1.h})`)
      for (let i = 0; i < 3; i++) { await p.getByTestId('photo-turn').click(); await settle(p, 1500) }
      const f2 = await pictureFacts(p)
      ok(f2.w === f0.w && f2.h === f0.h && f2.angle === f0.angle, 'four quarters bring it back — the same picture')
      await d.locator('label', { hasText: 'Straighten and clean it' }).click(); await settle(p, 1800)
      ok(/As it was taken/.test(await text(p.getByTestId('photo-line'))) && (await pictureFacts(p)).w === 2000, 'the switch off: the photo as it was taken')
      await shot(p, '03-as-taken-1440')
      await d.locator('label', { hasText: 'Straighten and clean it' }).click(); await settle(p, 1800)
      await p.getByTestId('photo-next').click(); await settle(p, 700)
      const summary = await text(p.getByTestId('photo-summary'))
      ok(/3 bedrooms/i.test(summary) && /2 bathrooms/i.test(summary) && /Kitchen/i.test(summary) && /11 rooms in total/i.test(summary), `the rooms by rule from her HDB 4-Room — 1.0’s chips (${summary})`)
      ok(/Started from HDB 4-Room — the flat type on record/.test(await text(d)), 'it says where the list came from')
      await p.getByTestId('photo-rooms-change').click(); await settle(p, 400)
      ok(await p.getByTestId('photo-room-list').locator('li').count() === 11, 'Change the rooms: the eleven, each with a way off')
      await p.getByRole('button', { name: 'Take Corridor off the list' }).click(); await settle(p, 300)
      await p.getByTestId('photo-room-add').click(); await settle(p, 300); await p.getByRole('menuitem', { name: 'Study' }).click(); await settle(p, 400)
      const list = (await p.getByTestId('photo-room-list').locator('li').allInnerTexts()).map((x) => x.split('\n')[0])
      ok(!list.includes('Corridor') && list[list.length - 1] === 'Study' && list.length === 11, 'the corridor off, a study on — still eleven, the study last')
      ok(/1 study/i.test(await text(p.getByTestId('photo-summary'))), 'the chips follow the list')
      const area = d.getByLabel('Floor area (m²)')
      ok((await area.inputValue()) === '93' && /The planner’s HDB 4-Room/.test(await text(p.getByTestId('photo-size'))), 'the floor area starts at the planner’s HDB 4-Room’s 93 m², said so')
      ok(/The plan reads as about \d+\.\d m × \d+\.\d m/.test(await text(p.getByTestId('photo-size-line'))), 'and the line says what the plan then measures')
      await shot(p, '04-rooms-size-1440')
      await area.fill('9'); await p.getByTestId('photo-start').click(); await settle(p, 600)
      ok(/Between 15 and 2000 m²/.test(await text(d)) && await photoDialog(p).count() === 1, 'a floor area that can’t be is refused in the field, the dialog stays')
      await area.fill('93')
      /* a length instead — set, then back to the area */
      await p.getByTestId('photo-size-by').getByRole('radio', { name: 'A length on the plan' }).click(); await settle(p, 700)
      ok(await p.getByTestId('photo-scale').count() === 1 && /Set the plan’s scale/.test(await text(p.getByTestId('photo-length'))), 'A length on the plan: the Floor plan tab’s own Set the scale, on the photo')
      await p.getByTestId('photo-size-by').getByRole('radio', { name: 'Its floor area' }).click(); await settle(p, 400)
      await p.getByTestId('photo-start').click()
      await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(p, 2600)
      LAY = layoutIdOf(p)
      const L = json(`select lead_id, project_id, name, plan from space_layouts where id = '${LAY}'`)[0]
      const plan = L ? JSON.parse(L.plan) : {}
      PH = (plan.underlay?.url ?? '').split('/').pop() ?? ''
      const ph = json(`select lead_id, file_id, width, height, scale_mm_per_px from floor_plan_photos where id = '${PH}'`)[0]
      ok(!!L && L.lead_id === FARAH && !L.project_id && L.name === 'Traced — Waterway Sunrise', `the layout is Farah’s, before Won — “${L?.name}”`)
      ok(!!ph && ph.lead_id === FARAH && ph.file_id === FAR_FILE && ph.scale_mm_per_px === null, 'one record: the straightened picture kept beside her file (its original), no size measured on it')
      ok(Number(sql(`select count(*) from lead_files where lead_id = '${FARAH}'`)) === files0, 'from Files, no second copy of the photo')
      ok(plan.underlay?.url === `/planner/plan-picture/${PH}` && plan.underlay.pxW === ph?.width, 'the layout lies on it')
      const mm = plan.underlay?.mmPerPx ?? 0
      ok(Math.abs(mm / TRUTH_MM - 1) < 0.15, `its size from 93 m²: ${mm.toFixed(2)} mm per pixel against the drawing’s ${TRUTH_MM.toFixed(2)}`)
      ok(Array.isArray(plan.toPlace) && plan.toPlace.length === 11 && plan.toPlace[0].name === 'Living / Dining' && plan.toPlace.some((t) => t.name === 'Study' && t.kind === 'study') && !plan.toPlace.some((t) => t.name === 'Corridor'), 'the rooms to place, as the list was left')
      const r = await p.evaluate(async (u) => { const res = await fetch(u); return { status: res.status, type: res.headers.get('content-type') } }, `/planner/plan-picture/${PH}`)
      ok(r.status === 200 && r.type === 'image/jpeg', 'its picture is served to the studio')
      /* (the calm UI build 2026-10-27, a deliberate change) — 6-16 · 6-08: whose it is rides the layout name's tooltip, not a chip that cut the name */
      await p.getByTestId('planner-topbar').locator('h1').hover(); await settle(p, 900)
      ok(/Farah Ahmad · Lead/i.test(await text(p.locator('[role="tooltip"]'))) && /Back to Files|Back to the lead|Back to Farah/.test(await p.getByTestId('planner-back').getAttribute('aria-label')), 'the editor names the lead (its name’s tooltip); Back returns to Files')
      await p.mouse.move(2, 2)
      ok(sql(`select count(*) from lead_events where lead_id = '${FARAH}' and kind = 'project_layout_created' and json_extract(detail, '$.photo') = 'Floor plan — Waterway Sunrise' and json_extract(detail, '$.id') = '${LAY}'`) === '1', 'its line on the lead names the photo')
    }

    // ── 3 · Placing the rooms on the photo ────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3) && LAY) {
      console.log('3 · Each rectangle on the photo is the next listed room')
      const guide = p.getByTestId('planner-place-guide')
      ok(/Drag over the Living \/ Dining on the plan/.test(await text(guide)) && /0 placed · 11 to go/.test(await text(guide)), 'the guide: “Drag over the Living / Dining on the plan · 0 placed · 11 to go”')
      ok(await p.getByTestId('planner-to-place').getByTestId('planner-to-place-row').count() === 11 && await p.getByTestId('planner-empty').count() === 0, 'the Rooms panel lists the eleven to place — no empty state over the photo')
      await shot(p, '05-placing-1440')
      await traceRooms(p, ['Living / Dining', 'Kitchen', 'Service yard'])
      await saved(p)
      let plan = planOf(LAY)
      ok(plan.rooms.length === 3 && plan.rooms[0].name === 'Living / Dining' && plan.rooms[0].kind === 'living' && plan.rooms[2].kind === 'yard' && plan.toPlace.length === 8, 'three drags: the Living / Dining, the Kitchen, the Service yard — named and kinded as listed')
      const lv = plan.rooms[0]
      ok(Math.abs(lv.w / 600 - 1) < 0.15 && Math.abs(lv.d / 440 - 1) < 0.15, `the living room measures about 6.0 × 4.4 m, as the plan prints (${(lv.w / 100).toFixed(2)} × ${(lv.d / 100).toFixed(2)} m)`)
      ok(/Drag over the Bathroom/.test(await text(guide)) && /3 placed · 8 to go/.test(await text(guide)), 'the guide moves on to the Bathroom')
      /* a row goes next; one comes off the list and back */
      await p.getByTestId('planner-to-place-row').filter({ hasText: /^Store$/ }).click(); await settle(p, 500)
      ok(/Drag over the Store/.test(await text(guide)), 'a row pressed goes next')
      await p.getByTestId('planner-place-skip').click(); await settle(p, 700)
      ok(/Store taken off the list/.test(await snackText(p)) && !planOf(LAY).toPlace?.some((t) => t.name === 'Store'), 'Not on this plan takes it off, and says so')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await saved(p)
      ok(planOf(LAY).toPlace?.some((t) => t.name === 'Store'), 'Undo puts it back')
      await p.getByTestId('planner-to-place-row').filter({ hasText: /^Bathroom/ }).first().click(); await settle(p, 400)
      await traceRooms(p, ['Bathroom', 'Store', 'Bedroom 3', 'Bedroom 2', 'Master bathroom', 'Walk-in wardrobe', 'Master bedroom'])
      await saved(p)
      plan = planOf(LAY)
      ok(plan.rooms.length === 10 && plan.toPlace?.length === 1 && plan.toPlace[0].name === 'Study', 'ten rooms placed, the study left')
      ok(/Drag over the Study/.test(await text(guide)), 'the guide asks for the study')
      await p.getByTestId('planner-place-skip').click(); await saved(p)
      ok(/Every room is on the plan/.test(await text(guide)) && !planOf(LAY).toPlace && await p.getByTestId('planner-make-picture').count() === 1, 'the study not on this plan: “Every room is on the plan”, and Make the 3D picture')
      const kinds = Object.fromEntries(planOf(LAY).rooms.map((r) => [r.name, r.kind]))
      ok(kinds['Master bedroom'] === 'master' && kinds['Walk-in wardrobe'] === 'store' && kinds['Bedroom 2'] === 'bedroom' && kinds['Master bathroom'] === 'bathroom', 'each room keeps its listed kind')
      await shot(p, '06-placed-1440')
    }

    // ── 4 · The 3D picture: Dollhouse · Top-down · Download · Save to Files · Change its size ─────────────────────────────────────────
    if (want(4) && LAY) {
      console.log('4 · Make the 3D picture')
      const pieces0 = planOf(LAY).pieces.length
      await p.getByTestId('planner-make-picture').click(); await settle(p, 2500)
      const furnished = planOf(LAY).pieces.length
      ok(furnished > pieces0 + 10 && /rooms furnished by the planner’s rule for the picture/.test(await text(p.getByTestId('picture-furnished'))), `the bare rooms furnished by rule first (${furnished} pieces), said in the picture`)
      const pd = p.getByTestId('picture-dialog')
      ok(await pd.count() === 1 && await pd.locator('[data-testid="planner-3d"] canvas').count() === 1, 'the 3D picture opens, drawn live')
      ok(/Dollhouse/.test(await text(pd.getByTestId('picture-look'))) && /angled cutaway/.test(await text(pd)), 'Dollhouse first — 1.0’s angled cutaway')
      ok(/A photographic picture is the AI Visualizer’s/.test(await text(pd)), 'honest: a photographic look is the AI Visualizer’s, its own price there')
      await shot(p, '07-dollhouse-1440')
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.getByTestId('picture-download').click()])
      ok(!!dl && dl.suggestedFilename() === 'Traced — Waterway Sunrise — Dollhouse.png', `Download: a PNG named for the look (${dl?.suggestedFilename()})`)
      if (dl) { const buf = fs.readFileSync(await dl.path()); ok(buf.slice(1, 4).toString() === 'PNG' && buf.length > 20000, `a real picture (${Math.round(buf.length / 1024)} KB)`) }
      await pd.getByTestId('picture-look').getByRole('radio', { name: 'Top-down' }).click(); await settle(p, 1800)
      ok(/Straight down from above/.test(await text(pd)), 'Top-down: straight down, as the plan reads')
      await shot(p, '08-top-down-1440')
      const renders0 = Number(sql(`select count(*) from lead_files f join lead_files d on d.id = f.parent_id where f.lead_id = '${FARAH}' and d.name = 'Renders' and f.deleted_at is null`))
      await p.getByTestId('picture-save').click(); await settle(p, 2500)
      const kept = json(`select f.id, f.name, f.mime from lead_files f join lead_files d on d.id = f.parent_id where f.lead_id = '${FARAH}' and d.name = 'Renders' and f.deleted_at is null order by f.created_at desc limit 1`)[0]
      ok(Number(sql(`select count(*) from lead_files f join lead_files d on d.id = f.parent_id where f.lead_id = '${FARAH}' and d.name = 'Renders' and f.deleted_at is null`)) === renders0 + 1 && kept?.name === 'Traced — Waterway Sunrise — Top-down.jpg' && kept.mime === 'image/jpeg', `Save to Files: Files › Renders keeps “${kept?.name}”`)
      ok(/Saved to Farah Ahmad’s Files › Renders/.test(await snackText(p)), 'and the snackbar says where, with Open')
      await p.getByTestId('picture-unfurnish').click(); await saved(p)
      ok(planOf(LAY).pieces.length === pieces0 && await p.getByTestId('picture-furnished').count() === 0, 'the picture’s own Undo takes the furniture out again — the bare rooms on screen')
      await p.keyboard.press('Escape'); await settle(p, 600)
      await p.getByTestId('planner-make-picture').click(); await settle(p, 2000)
      ok(planOf(LAY).pieces.length === furnished, 'Make the 3D picture again furnishes them again')
      await p.keyboard.press('Escape'); await settle(p, 600)
      /* Change its size… — the plan and its rooms follow (Undo) */
      await p.getByTestId('planner-tab-rooms').click(); await settle(p, 300)
      const w0 = planOf(LAY).rooms[0].w, mm0 = planOf(LAY).underlay.mmPerPx
      await p.getByTestId('planner-resize').click(); await settle(p, 2500)
      const sd = p.getByTestId('planner-size-dialog')
      ok(await sd.count() === 1 && /What the plan measures now/.test(await text(sd)), 'Set its size…: the floor area the plan measures now')   // (the calm UI build 2026-10-27, a deliberate change) — W-133
      await sd.getByLabel('Floor area (m²)').fill('80'); await settle(p, 300)
      await p.getByTestId('planner-size-apply').click(); await saved(p)
      const k = planOf(LAY).underlay.mmPerPx / mm0
      ok(k < 0.97 && Math.abs(planOf(LAY).rooms[0].w / w0 - k) < 0.03, `the floor plan and its rooms shrink together (×${k.toFixed(3)})`)
      ok(/Its size changed/.test(await snackText(p)), 'said, with Undo')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await saved(p)
      ok(Math.abs(planOf(LAY).underlay.mmPerPx - mm0) < 1e-9 && planOf(LAY).rooms[0].w === w0, 'Undo: as it was')
      /* the menu's 3D picture… for any layout with rooms */
      await p.getByTestId('planner-menu').click(); await settle(p, 300)
      ok(await p.getByRole('menuitem', { name: /^3D floor plan…/ }).count() === 1, 'the layout’s ⋮ has 3D floor plan…')   // (the calm UI build 2026-10-27, a deliberate change) — 6-06: one name for the picture
      await p.getByRole('menuitem', { name: /^3D floor plan…/ }).click(); await settle(p, 1500)
      ok(await p.getByTestId('picture-dialog').count() === 1 && planOf(LAY).pieces.length === furnished, 'it opens the picture again — the furnished rooms left as they are')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* Activity, the Accounting rule */
      await go(p, `/leads/${FARAH}/activity`)
      ok(/started the 3D layout “Traced — Waterway Sunrise” on the floor-plan photo “Floor plan — Waterway Sunrise”/.test(await text(p.locator('main'))), 'Activity names the photo it was traced on')
      as('priya')
      const r = await p.evaluate(async (u) => (await fetch(u, { cache: 'no-store' })).status, `/planner/plan-picture/${PH}`)
      ok(r === 404, 'Accounting never gets the floor plan’s picture')
      as('dane')
    }

    // ── 5 · A Designer not on the lead is told why ───────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Who may make one')
      const notOn = sql(`select id from members where role = 'Designer' and is_active = 1 and id not in (select member_id from lead_assignees where lead_id = '${FARAH}') and manager_id is null limit 1`) || 'germaine'
      as(notOn)
      await go(p, `/leads/${FARAH}/files`)
      const vis = await p.getByText('Floor plans', { exact: true }).count()
      if (vis) {
        await p.getByText('Floor plans', { exact: true }).first().dblclick(); await settle(p, 1500)
        await fileMenu(p, 'Floor plan — Waterway Sunrise.jpg')
        await p.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: Files' ⋮ */ 'Trace a floor-plan photo' }).click(); await settle(p, 3500)
        ok(/Only the lead’s members, their Managers, Owners and Admins can add a layout to this lead/.test(await text(photoDialog(p))) && await p.getByTestId('photo-next').isDisabled(), `${notOn} (a Designer not on Farah) is told why, and Next waits`)
        await p.keyboard.press('Escape'); await settle(p, 300)
      } else ok(true, `${notOn} doesn’t see Farah at all (Who sees leads)`)
      as('dane')
    }

    // ── 6 · A project's floor plan, as the Floor plan tab has it ─────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Benjamin’s project: its Floor plan tab’s plan, at its own scale')
      const scale = Number(sql(`select scale_mm_per_px from project_floor_plans where id = '${BEN_PLAN}'`))
      await go(p, `/projects/${BEN}/floor-plan?plan=${BEN_PLAN}`, 2500)
      await p.getByTestId('plan-kebab').click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: ⌘K's row and the project's Floor plan ⋮ read "Trace a floor-plan photo" */ 'Trace a floor-plan photo' }).click(); await waitPicture(p); await settle(p, 800)
      const d = photoDialog(p)
      ok(/Proposed layout, from .*Floor plan tab/.test(await text(d)) && /As it is on the Floor plan tab/.test(await text(p.getByTestId('photo-line'))) && await p.getByTestId('photo-turn').count() === 0, 'the plan as the tab has it — no straightening of what the client marks up')
      await p.getByTestId('photo-next').click(); await settle(p, 600)
      ok(/Its size is set on the Floor plan tab/.test(await text(p.getByTestId('photo-size'))) && await p.getByTestId('photo-size-by').count() === 0, 'its size is the tab’s own scale — nothing to ask')
      ok(/11 rooms in total/i.test(await text(p.getByTestId('photo-summary'))) && /HDB 5-Room/.test(await text(d)), 'the rooms of an HDB 5-Room, his flat type')
      const plans0 = Number(sql(`select count(*) from project_floor_plans where project_id = '${BEN}'`))
      await p.getByTestId('photo-start').click(); await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(p, 2600)
      const id = layoutIdOf(p), plan = planOf(id)
      ok(sql(`select project_id from space_layouts where id = '${id}'`) === BEN && plan.underlay?.url === `/projects/${BEN}/plan-picture/${BEN_PLAN}` && Math.abs(plan.underlay.mmPerPx - scale) < 1e-9, 'the project’s layout lies on that plan at its scale')
      ok(Number(sql(`select count(*) from project_floor_plans where project_id = '${BEN}'`)) === plans0 && Number(sql(`select count(*) from floor_plan_photos where lead_id = (select lead_id from projects where id = '${BEN}')`)) === 0, 'one record: no second plan, no photo row')
      await shot(p, '09-project-plan-1440')
    }

    // ── 7 · Personal, from Tools — nothing in any client's Files ─────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Personal: the picture stays with the layout')
      const files0 = Number(sql(`select count(*) from lead_files`))
      await go(p, '/planner?view=iso&photo=1', 2500)
      await upload(p)
      ok(Math.abs((await pictureFacts(p)).angle - 7) < 0.6, 'an upload is straightened the same way')
      await p.getByTestId('photo-next').click(); await settle(p, 600)
      await p.getByTestId('photo-start').click(); await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(p, 2600)
      const id = layoutIdOf(p), plan = planOf(id), phId = (plan.underlay?.url ?? '').split('/').pop()
      ok(sql(`select coalesce(lead_id,'') || coalesce(project_id,'') from space_layouts where id = '${id}'`) === '' && sql(`select coalesce(lead_id,'-') || coalesce(file_id,'-') from floor_plan_photos where id = '${phId}'`) === '--', 'a personal layout and its own photo — no client, no file')
      ok(Number(sql(`select count(*) from lead_files`)) === files0, 'nothing went into anyone’s Files')
      await traceRooms(p, ['Living / Dining', 'Kitchen']); await saved(p)
      await p.getByTestId('planner-make-picture').click(); await settle(p, 2200)
      ok(await p.getByTestId('picture-dialog').count() === 1 && await p.getByTestId('picture-save').count() === 0 && await p.getByTestId('picture-download').count() === 1, 'its picture downloads; no Save to Files (no client’s Files)')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 8 · Won: the lead's photo becomes the project's floor plan ───────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · Vivien Lee: the photo follows her to the project')
      ok(sql(`select count(*) from projects where lead_id = '${VIVIEN}'`) === '0', 'Vivien Lee has no project yet')
      await go(p, `/leads/${VIVIEN}`)
      await p.locator('aside[aria-label="Create"]').getByRole('button', { name: '3D Space Planner' }).click(); await settle(p, 1200)
      await p.getByTestId('project-layout-new').click(); await settle(p, 700)
      await p.locator('[data-testid="planner-template"][data-key="photo"]').click(); await p.getByTestId('planner-start').click(); await settle(p, 1200)
      ok(/For Vivien Lee/.test(await text(photoDialog(p))), 'Plan the space in 3D › Start a new layout › A floor-plan photo: for Vivien')
      await upload(p)
      await p.getByTestId('photo-next').click(); await settle(p, 600)
      ok(/Started from Condo 2-bedder/.test(await text(photoDialog(p))) && /8 rooms in total/i.test(await text(p.getByTestId('photo-summary'))), 'her Condo 2-bedder’s rooms')
      await p.getByTestId('photo-start').click(); await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(p, 2600)
      const id = layoutIdOf(p), plan = planOf(id), phId = (plan.underlay?.url ?? '').split('/').pop()
      const orig = sql(`select file_id from floor_plan_photos where id = '${phId}'`)
      ok(!!orig && sql(`select d.name from lead_files f join lead_files d on d.id = f.parent_id where f.id = '${orig}'`) === 'Floor plans', 'the upload is kept in her Files › Floor plans, its picture beside it')
      /* a second try from the same file in Files — its own photo record, the same original */
      const origName = sql(`select name from lead_files where id = '${orig}'`)
      await go(p, `/leads/${VIVIEN}/files`)
      await p.getByText('Floor plans', { exact: true }).first().dblclick(); await settle(p, 1500)
      await fileMenu(p, origName); await p.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020: Files' ⋮ */ 'Trace a floor-plan photo' }).click(); await waitPicture(p); await settle(p, 600)
      await p.getByTestId('photo-next').click(); await settle(p, 500)
      await p.getByTestId('photo-start').click(); await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(p, 2600)
      const id2 = layoutIdOf(p), ph2 = (planOf(id2).underlay?.url ?? '').split('/').pop()
      ok(!!ph2 && ph2 !== phId && sql(`select file_id from floor_plan_photos where id = '${ph2}'`) === orig, 'a second try from Files: its own picture record, the same original')
      /* Won — the same steps as pm2-s07 */
      await go(p, `/leads/${VIVIEN}`)
      await p.locator('[data-testid="header-primary"] button').click(); await settle(p, 900)
      const wiz = p.locator('[role="dialog"][aria-label="Move stage"]')
      const tabs = wiz.getByRole('tab', { name: 'Upload' })
      await tabs.nth(0).click(); await settle(p, 200)
      await wiz.locator('input[type="file"]').nth(0).setInputFiles({ name: 'Vivien-signed-quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await settle(p, 1800)
      await wiz.getByLabel('Quote amount (S$)').fill('88500')
      await tabs.nth(1).click(); await settle(p, 200)
      await wiz.locator('input[type="file"]').last().setInputFiles({ name: 'Vivien-signed-contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await settle(p, 1800)
      await wiz.getByRole('button', { name: 'Reset to default' }).click(); await settle(p, 200)
      await wiz.getByRole('button', { name: 'Save & Convert to Project' }).click()
      await p.waitForURL(/\/projects\//, { timeout: 20000 }).catch(() => {}); await settle(p, 1500)
      const vp = sql(`select id from projects where lead_id = '${VIVIEN}'`)
      const g = json(`select project_id, file_id, is_main, put_away_at from project_floor_plans where id = '${ph2}'`)[0]
      const g1 = json(`select project_id, is_main, put_away_at from project_floor_plans where id = '${phId}'`)[0]
      ok(!!vp && g?.project_id === vp && g.file_id === orig && g.is_main === 1 && g.put_away_at === null && sql(`select count(*) from floor_plan_photos where lead_id = '${VIVIEN}'`) === '0' && sql(`select count(*) from floor_plan_pictures where plan_id in ('${phId}', '${ph2}')`) === '2', 'Won: the newest photo is the project’s floor plan now — the same id, its original, its picture, the main plan')
      ok(g1?.project_id === vp && g1.is_main === 0 && g1.put_away_at !== null, 'the earlier try of the same original comes put away — one plan per original on the client’s page')
      const r = await p.evaluate(async (us) => Promise.all(us.map(async (u) => (await fetch(u, { cache: 'no-store' })).status)), [`/planner/plan-picture/${phId}`, `/planner/plan-picture/${ph2}`])
      ok(r.every((x) => x === 200) && sql(`select count(*) from space_layouts where id in ('${id}', '${id2}') and project_id = '${vp}'`) === '2', 'both layouts went with her and their pictures keep their addresses')
      ok(sql(`select count(*) from lead_events where project_id = '${vp}' and kind = 'project_floor_plan_added' and json_extract(detail, '$.carried') = 1`) === '1' && sql(`select json_extract(detail, '$.id') from lead_events where project_id = '${vp}' and kind = 'project_floor_plan_added' and json_extract(detail, '$.carried') = 1`) === ph2, 'one line on the project, for the plan that is live')
      await go(p, `/projects/${vp}/floor-plan`, 2500)
      ok(await p.getByTestId('project-floor-plan').count() === 1 && await p.getByTestId('plan-empty').count() === 0, 'the project’s Floor plan tab opens on it')
      await shot(p, '10-won-floor-plan-1440')
      await go(p, `/projects/${vp}/activity`)
      ok(/kept on the lead for its 3D layout, is now on the project’s Floor plan/.test(await text(p.locator('main'))), 'Activity: the floor plan, kept on the lead for its 3D layout, is now on the project’s Floor plan')
    }

    // ── 9 · Phone, tablet, 320 ───────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · 390 · 768 touch · 320')
      for (const [w, h, tag] of [[390, 844, '390'], [768, 1024, '768'], [320, 640, '320']]) {
        const pc = await phoneCtx(w, h); const q = await page(pc, tag)
        await go(q, `/leads/${FARAH}/files`, 2200)
        await q.getByText('Floor plans', { exact: true }).first().click(); await settle(q, 1600)
        if (!/folder=/.test(q.url())) { await q.getByText('Floor plans', { exact: true }).first().dblclick().catch(() => {}); await settle(q, 1400) }
        await q.getByRole('button', { name: /^Actions for Floor plan — Waterway/ }).first().click(); await settle(q, 600)
        await q.getByRole('menuitem', { name: /* (the calm UI build 2026-10-27, a deliberate change) 6-06 · W-020 */ 'Trace a floor-plan photo' }).click(); await waitPicture(q); await settle(q, 900)
        ok(await photoDialog(q).count() === 1 && (await sideways(q)) <= 0, `${tag}: the dialog, no sideways scroll`)
        await shot(q, `11-dialog-${tag}`)
        await q.getByTestId('photo-next').click(); await settle(q, 700)
        ok((await sideways(q)) <= 0, `${tag}: step 2 fits`)
        await shot(q, `12-step2-${tag}`)
        if (w !== 320) {
          await q.getByTestId('photo-start').click(); await q.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(q, 2600)
          const guide = q.getByTestId('planner-place-guide')
          const gb = await guide.boundingBox()
          ok(!!gb && gb.x >= 0 && gb.x + gb.width <= w + 1 && (await sideways(q)) <= 0, `${tag}: the editor's guide sits on the stage, inside the screen`)
          await shot(q, `13-placing-${tag}`)
        }
        await pc.close()
      }
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e?.message ?? e).split('\n')[0])
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
