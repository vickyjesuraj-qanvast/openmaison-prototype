// Pending modules, step S15 · The 3-D Space Planner's leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey
// key held:space-planner — "Only the elevation lines and the dead AI suggestions are worth doing now"). Each item asserted as the rule it
// builds, never another round's count:
//  - a wall's elevation draws 1.0's reference heights (ElevationDrawing.tsx `H`) as dashed lines with their words beside the wall: a kitchen
//    wall — the counter top 85 and the upper cabinets' band 145–225, with switches 120 and sockets 30; a bathroom wall — the mirror 150 alone;
//    every other standing wall — switches and sockets; an open side — none, and no switch
//  - *Show the usual heights* takes them away and gives the drawing its width back; the PNG carries what is on screen (the lines' colour in its
//    pixels with them, none without); the legend under the drawing names the heights on screen
//  - the panel opens on the wall the room's built-ins stand against (1.0's Kitchen / Wardrobe Elevation presets): the kitchen's counter wall,
//    the master bedroom's wardrobe wall; with nothing in the room, its longest standing wall
//  - the list under the drawing walks the wall left to right with its doors and windows too (a window's height off the floor)
//  - the editor's Maison AI suggestions act (the card's last line, built in S10 — checked here): the room sizes and the overlaps answer from
//    the plan with rows that pick, "Furnish the …" is proposed first and Arrange it changes the plan, the editor's Undo puts back what was there;
//    none answers Coming soon
//  - a reader (Alex, a Designer, on Dane's layout) opens the same drawing with its heights
//  - 390 and 320: the elevation as a sheet with its heights, no sideways scroll against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s15.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s15')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s15-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const planOf = (id) => JSON.parse(sql(`select plan from space_layouts where id='${id}'`) || '{}')
const sideLength = (r, s) => (s === 'n' || s === 's' ? r.w : r.d)

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = []
  const SHOW = sql(`select id from space_layouts where name='Showroom — HDB 4-Room' and deleted_at is null`)
  const you0 = sql(`select id from members where is_you = 1`)
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phone = (w = 390) => b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 2200) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const snackText = async (p) => (await p.locator('[role="status"]').allInnerTexts()).join(' | ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const saved = async (p) => { await settle(p, 300); await p.waitForFunction(() => /Saved/.test(document.querySelector('[data-testid="planner-saved"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {}); await settle(p, 900) }
  const roomRow = (p, name) => p.getByTestId('planner-room-list').getByRole('button', { name: new RegExp(`^${name}`) }).first()
  const el = (p) => p.getByTestId('planner-elevation')
  const drawing = (p) => p.getByTestId('planner-elevation-drawing')
  const refKeys = async (p) => (await drawing(p).locator('[data-ref]').evaluateAll((ns) => ns.map((n) => `${n.getAttribute('data-ref')}:${n.getAttribute('data-height')}`))).sort()
  /* an SVG <text> has no innerText — each line's textContent, a band's two lines joined by a space */
  const words = (p, key) => drawing(p).locator(`[data-ref-words="${key}"]`).evaluate((n) => [...n.querySelectorAll('text')].map((t) => t.textContent || '').join(' ').trim()).catch(() => '')
  const viewWidth = (p) => drawing(p).evaluate((n) => Number((n.getAttribute('viewBox') || '0 0 0 0').split(' ')[2]))
  const openElevation = async (p, room) => {
    await p.getByTestId('planner-tab-rooms').click(); await settle(p, 300)
    await roomRow(p, room).click(); await settle(p, 400)
    await p.getByTestId('planner-room-menu').click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /^Wall elevations/ }).click(); await settle(p, 900)
  }
  const closeElevation = async (p) => { await p.keyboard.press('Escape'); await settle(p, 500) }
  /* the downloaded PNG read back in the page: how many of its pixels wear the primary colour (the dashed lines and their words) */
  const purplePixels = async (p, file) => {
    const b64 = fs.readFileSync(await file.path()).toString('base64')
    return p.evaluate(async (src) => {
      const img = new Image(); img.src = `data:image/png;base64,${src}`
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad })
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const g = c.getContext('2d'); g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, c.width, c.height).data
      let n = 0
      for (let i = 0; i < d.length; i += 4) { const [r, gg, bb] = [d[i], d[i + 1], d[i + 2]]; if (bb > 180 && r < 175 && gg < 130 && bb - gg > 100) n++ }
      return n
    }, b64)
  }
  const download = async (p) => {
    const dl = p.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await p.getByTestId('planner-elevation-png').click()
    return dl
  }
  const toggleHeights = async (p) => { await p.getByTestId('planner-elevation-heights').click(); await settle(p, 400) }
  const heightsOn = (p) => p.getByTestId('planner-elevation-heights').locator('input').isChecked()

  /* what the run may change, kept to put back */
  const SNAP = [['space_layouts', '1'], ['space_layout_versions', '1'], ['maison_questions', '1']]   // whole tables, so their order holds
  let kept = []
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }

  try {
    as('dane')
    const D = await desk(); const d = await D.newPage(); watch(d, 'desk')
    /* open one page and wait before the snapshot (the probe habit after S08) */
    await go(d, `/planner/${SHOW}`, 3000)
    kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
    const plan = planOf(SHOW)
    const room = (name) => plan.rooms.find((r) => r.name === name)

    // ── 1 · the kitchen's counter wall, with its heights ─────────────────────────────────────────────────────────────────────────
    console.log('1 · The kitchen: its counter wall, the counter and the upper cabinets, switches and sockets')
    await openElevation(d, 'Kitchen')
    ok(await el(d).count() === 1 && await drawing(d).locator('[data-piece="counter"]').count() === 1, 'Wall elevations… opens on the wall the counter stands against (1.0’s Kitchen Elevation)')
    const kitchen = await refKeys(d)
    ok(JSON.stringify(kitchen) === JSON.stringify(['cabinets:145-225', 'counter:85', 'sockets:30', 'switches:120']), `the kitchen wall’s heights — ${kitchen.join(' · ')}`)
    ok(await words(d, 'counter') === 'Counter 85' && await words(d, 'cabinets') === 'Cabinets 145–225' && await words(d, 'switches') === 'Switches 120' && await words(d, 'sockets') === 'Sockets 30', 'each height’s words beside the wall')
    const legend = await d.getByTestId('planner-elevation-legend').innerText().catch(() => '')
    ok(/upper cabinets 145–225 cm/.test(legend) && /counter top 85 cm/.test(legend) && /switches 120 cm/.test(legend) && /sockets 30 cm/.test(legend) && /Check them on site/.test(legend), 'the legend names the heights on screen')
    const rows = await d.getByTestId('planner-elevation-list').locator('li').allInnerTexts()
    const flat = rows.map((r) => r.replace(/\s+/g, ' '))
    const iCounter = flat.findIndex((r) => /^Kitchen counter/.test(r)), iWindow = flat.findIndex((r) => /^Window/.test(r)), iFridge = flat.findIndex((r) => /^Fridge/.test(r))
    ok(iCounter >= 0 && iWindow > iCounter && iFridge > iWindow, `the list walks the wall left to right — ${flat.map((r) => r.split(' ')[0]).join(', ')}`)
    ok(/90 off the floor/.test(flat[iWindow] ?? '') && /120 wide · 120 high/.test(flat[iWindow] ?? ''), `a window says its size and its height off the floor — “${flat[iWindow]}”`)
    await shot(d, '01-kitchen-heights-1440')

    // ── 2 · Show the usual heights, and the PNG ──────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The switch takes the heights away; the PNG carries what is on screen')
    ok(await heightsOn(d), 'Show the usual heights is on to begin with')
    const wOn = await viewWidth(d)
    const fileOn = await download(d)
    const pxOn = fileOn ? await purplePixels(d, fileOn) : 0
    ok(!!fileOn && /\.png$/.test(fileOn.suggestedFilename()) && pxOn > 300, `the PNG carries the dashed heights (${pxOn} pixels in their colour)`)
    await toggleHeights(d)
    ok(!(await heightsOn(d)) && await drawing(d).locator('[data-ref], [data-ref-words]').count() === 0 && await d.getByTestId('planner-elevation-legend').count() === 0, 'off: no lines, no words, no legend')
    const wOff = await viewWidth(d)
    ok(wOff < wOn, `the drawing takes back the words’ room (${Math.round(wOn)} → ${Math.round(wOff)} cm across)`)
    const fileOff = await download(d)
    const pxOff = fileOff ? await purplePixels(d, fileOff) : 999
    ok(pxOff < pxOn / 10, `a clean PNG without them (${pxOff} pixels in their colour)`)
    await shot(d, '02-kitchen-no-heights-1440')
    await toggleHeights(d)
    ok(await heightsOn(d) && await drawing(d).locator('[data-ref]').count() === 4, 'on again: the four heights back')

    // ── 3 · which heights, which wall ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Which heights apply, and which wall opens')
    await el(d).getByRole('radio', { name: /^Left/ }).click(); await settle(d, 500)
    ok(JSON.stringify(await refKeys(d)) === JSON.stringify(kitchen), 'another kitchen wall keeps the kitchen’s heights')
    await closeElevation(d)
    await openElevation(d, 'Bathroom')
    const bath = await refKeys(d)
    ok(JSON.stringify(bath) === JSON.stringify(['mirror:150']) && await drawing(d).locator('[data-piece="vanity"]').count() === 1, `a bathroom wall: the mirror alone, no switches or sockets — opening on the vanity’s wall (${bath.join(' · ')})`)
    await shot(d, '03-bathroom-mirror-1440')
    await closeElevation(d)
    await openElevation(d, 'Master bedroom')
    const master = await refKeys(d)
    ok(await drawing(d).locator('[data-piece^="wardrobe"]').count() === 1, 'the master bedroom opens on its wardrobe’s wall (1.0’s Wardrobe Elevation)')
    ok(JSON.stringify(master) === JSON.stringify(['sockets:30', 'switches:120']), `a bedroom wall: switches and sockets (${master.join(' · ')})`)
    await shot(d, '04-master-wardrobe-1440')
    await closeElevation(d)
    await openElevation(d, 'Store')
    const store = room('Store'), side = await el(d).getAttribute('data-side')
    const longest = Math.max(...['n', 'e', 's', 'w'].filter((s) => store.walls[s]).map((s) => sideLength(store, s)))
    ok(!!side && sideLength(store, side) === longest && await drawing(d).locator('[data-piece]').count() === 0, `a room with nothing in it opens on its longest standing wall (${side})`)
    await closeElevation(d)
    await openElevation(d, 'Living / Dining')
    const openSide = ['n', 'e', 's', 'w'].find((s) => !room('Living / Dining').walls[s])
    await el(d).getByRole('radio', { name: /\(open\)/ }).click(); await settle(d, 500)
    ok(!!openSide && await el(d).getAttribute('data-side') === openSide && await drawing(d).locator('[data-ref]').count() === 0 && await d.getByTestId('planner-elevation-heights').count() === 0, 'an open side has no wall: no heights, and no switch for them')
    await closeElevation(d)

    // ── 4 · the editor's Maison AI suggestions act (S10's, checked here) ─────────────────────────────────────────────────────────
    console.log('4 · Maison AI in the planner acts — never Coming soon')
    const sheet = d.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
    const fab = async () => { await d.locator('button[aria-label="Maison AI"]').last().click(); await settle(d, 700) }
    const back = async () => { await sheet.locator('[data-testid="maison-back"]').click().catch(() => {}); await settle(d, 300) }
    await d.keyboard.press('Escape'); await settle(d, 300)   // nothing picked
    await fab()
    const sug = (await sheet.locator('button[class*="suggestion"]').allInnerTexts()).map((s) => s.trim()).filter((s) => !/Keyboard shortcuts/.test(s))
    /* (S42 D-12, a deliberate change of this rule) a room with pieces in it is offered as "Re-arrange the …"; "Furnish the …" only for a bare one */
    ok(sug.length >= 3 && sug.some((s) => /^(Furnish|Re-arrange) the /.test(s)) && sug.includes('Which pieces overlap?') && sug.includes('How big is each room?'), `three suggestions — ${sug.join(' · ')}`)
    await sheet.getByRole('button', { name: 'How big is each room?', exact: true }).click(); await settle(d, 900)
    const sizes = sheet.locator('[data-testid="maison-answer"] [data-testid="maison-row"]')
    ok(await sizes.count() === plan.rooms.length && /m²/.test(await sizes.first().innerText()), `How big is each room? answers from the plan — ${await sizes.count()} rooms with their sizes`)
    await sizes.filter({ hasText: 'Kitchen' }).first().click(); await settle(d, 700)
    ok(/Kitchen/.test(await d.getByRole('complementary', { name: 'What is picked' }).innerText().catch(() => '')), 'a room’s row picks it on the plan')
    await d.keyboard.press('Escape'); await settle(d, 300)
    if (!(await sheet.isVisible().catch(() => false))) await fab(); else await back()
    await sheet.getByRole('button', { name: 'Which pieces overlap?', exact: true }).click(); await settle(d, 900)
    ok(await sheet.locator('[data-testid="maison-answer"]').count() === 1 && /overlap|Nothing overlaps/i.test(await sheet.locator('[data-testid="maison-answer"]').innerText()), 'Which pieces overlap? answers from the plan')
    await back()
    const furnish = sug.find((s) => /^(Furnish|Re-arrange) the /.test(s))
    await sheet.getByRole('button', { name: furnish, exact: true }).click(); await settle(d, 900)
    const proposal = sheet.locator('[data-testid="maison-proposal"]')
    ok(await proposal.count() === 1 && await proposal.getByTestId('maison-confirm').count() === 1, `“${furnish}” is shown before it happens, with one button`)
    const target = plan.rooms.find((r) => r.name.toLowerCase() === furnish.replace(/^(Furnish|Re-arrange) the /, ''))
    const inRoom = (q, r) => q.x >= r.x && q.x <= r.x + r.w && q.z >= r.z && q.z <= r.z + r.d
    const was = plan.pieces.filter((q) => inRoom(q, target)).map((q) => q.id).sort()
    await proposal.getByTestId('maison-confirm').click(); await saved(d)
    const now = planOf(SHOW).pieces.filter((q) => inRoom(q, target)).map((q) => q.id).sort()
    ok(now.length > 0 && now.every((x) => !was.includes(x)) && /arranged/.test(await snackText(d)), `Arrange it furnishes the ${target.name.toLowerCase()} afresh and says so (${now.length} pieces)`)
    await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await saved(d)
    ok(JSON.stringify(planOf(SHOW).pieces.filter((q) => inRoom(q, target)).map((q) => q.id).sort()) === JSON.stringify(was), 'the editor’s Undo puts back exactly what was there')
    ok(!/Coming soon/i.test(await snackText(d)), 'no suggestion answered Coming soon')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 5 · a reader opens the same drawing ──────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Alex (a Designer) reading Dane’s layout')
    as('alex')
    await go(d, `/planner/${SHOW}`, 2500)
    ok(await d.getByTestId('planner-readonly').count() === 1, 'the layout is read-only for Alex')
    await openElevation(d, 'Kitchen')
    ok(await drawing(d).locator('[data-ref]').count() === 4 && await d.getByTestId('planner-elevation-heights').count() === 1, 'the drawing, its heights and the switch are there to read and download')
    await closeElevation(d)
    as('dane')
    await D.close()

    // ── 6 · the phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The phone (390) and 320')
    for (const w of [390, 320]) {
      const M = await phone(w); const m = await M.newPage(); watch(m, `phone ${w}`)
      await go(m, `/planner/${SHOW}`, 2500)
      await m.getByTestId('planner-tab-rooms').tap(); await settle(m, 600)
      await m.getByTestId('planner-room-list').getByRole('button', { name: /^Kitchen/ }).first().tap(); await settle(m, 600)
      await m.getByTestId('planner-details').tap(); await settle(m, 600)
      await m.getByTestId('planner-room-menu').tap(); await settle(m, 500)
      await m.getByRole('menuitem', { name: /^Wall elevations/ }).tap(); await settle(m, 1000)
      const svgBox = await drawing(m).boundingBox().catch(() => null)
      ok(await el(m).count() === 1 && await drawing(m).locator('[data-ref]').count() === 4 && !!svgBox && svgBox.x >= 0 && svgBox.x + svgBox.width <= w + 1, `${w}: the elevation as a sheet, the heights drawn inside the screen`)
      ok(await sideways(m) <= 0, `${w}: no sideways scroll (against screen.width)`)
      await shot(m, `05-kitchen-heights-${w}`)
      await M.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    if (kept.length) putBack()
    else sql(`update members set is_you = (id = '${you0}')`)
    await b.close()
  }
  const real = errors.filter((e) => !/WebGL|GPU|ResizeObserver/.test(e))
  ok(!real.length, `no page errors${real.length ? ` — ${real.join(' · ')}` : ''}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
