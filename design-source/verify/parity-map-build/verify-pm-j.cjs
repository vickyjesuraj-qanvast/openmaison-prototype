// The parity-map build, package P-J — the 3-D Space Planner (the owner's "build everything that's in 1.0 to 2.0", 2026-10-10; map rows
// TD-073 · TD-075 · TD-076 · TD-081 · TD-087 · TD-088 · TD-089 · TD-090 · TD-091 · TD-092 · TD-098). Each item asserted as the rule it builds:
//  TD-098  Tools › Floorplan to 3D Isometric is live: it opens the planner with ?view=iso, and a layout opened from there opens isometric
//  TD-092  View ▾ › Present: the bar and the panels step away, the room on screen and "1 of n", → goes on, Esc ends it
//  TD-081  View ▾ › Furniture and Dimensions take the pieces and the sizes off the Top view and put them back; the Ruler measures between two
//          presses (its length on the line), Esc clears it, Esc again stops it
//  TD-090  the Furniture search reads a description into the closest piece — its colour and size — and places it
//  TD-088  a room's ⋮ › Arrange the furniture furnishes it by the rule, Undo puts back exactly what was there; a store says why it can't
//  TD-091  a room's ⋮ › Wall elevations… draws a wall with the pieces against it; Download PNG saves it
//  TD-075  + Add a level: the level switch on the stage, its own empty state, Copy Level 1's rooms, Remove with Undo; the client's link and the
//          paper show the levels
//  TD-087  ⋮ › Save a version keeps one; Versions… lists them; Bring back keeps the layout as it was first, then puts the version on screen (Undo)
//  TD-076  ⋮ › Save as a template (Undo takes it away); the gallery's Kind: Templates; New layout › My templates starts a personal copy; a template
//          never shares
//  TD-073  New ▾ › From an example… — the six flats furnished and finished in a style, opening as the studio's own copy
//  TD-089  ⋮ › Render in AI Visualizer opens a Visualizer design with the 3D view as its room photo
//  Read-only (Alex, a Designer, on Dane's personal layout): the View ▾ still works, Arrange says why it can't. Phone 390: the View ▾ and the
//  level switch on the stage, no sideways scroll; 320 too.
// Self-contained: it makes what it needs through the screens (no other round's rows are counted). Run against `next start` on a fresh copy
// of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: BASE=http://localhost:3131 NODE_PATH=<repo>/node_modules node verify-pm-j.cjs <scratch.db> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-j')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3131'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pmj-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const planOf = (id) => JSON.parse(sql(`select plan from space_layouts where id='${id}'`) || '{}')
const inRoom = (q, r) => q.x >= r.x && q.x <= r.x + r.w && q.z >= r.z && q.z <= r.z + r.d

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = []
  const SHOW = sql(`select id from space_layouts where name='Showroom — HDB 4-Room' and deleted_at is null`)
  /* what the run may change, kept to put back */
  const SNAP = [['space_layouts', '1'], ['space_layout_shares', '1'], ['space_layout_versions', '1'], ['lead_events', `kind like 'project_layout_%'`], ['notifications', '1'], ['members', '1'], ['visualizer_designs', '1'], ['project_rooms', '1']]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phone = (w = 390) => b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"]').allInnerTexts()).join(' | ')
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const saved = async (p) => { await settle(p, 300); await p.waitForFunction(() => /Saved/.test(document.querySelector('[data-testid="planner-saved"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {}); await settle(p, 900) }
  const menu = async (p, row) => { await p.getByTestId('planner-menu').click(); await settle(p, 300); await p.getByRole('menuitem', { name: row }).first().click(); await settle(p, 600) }
  const viewMenu = async (p, row, role = 'menuitemcheckbox') => { await p.getByTestId('planner-view-menu').first().click(); await settle(p, 300); await p.getByRole(role, { name: row }).first().click(); await settle(p, 600) }
  const pieceCount = (p) => p.locator('[data-testid="planner-top"] [data-piece-id]').count()
  const sizeWords = (p) => p.locator('[data-testid="planner-top"] text', { hasText: '×' }).count()
  const roomRow = (p, name) => p.getByTestId('planner-room-list').getByRole('button', { name: new RegExp(`^${name}`) }).first()
  const newLayoutId = (p) => p.url().split('/planner/')[1].split(/[?/]/)[0]

  try {
    as('dane')
    const D = await desk(); const d = await D.newPage(); watch(d, 'desk')

    // ── TD-098 · Floorplan to 3D Isometric ───────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-098 · The Isometric tile opens the planner, and a layout opens isometric')
    await go(d, '/leads')
    await d.getByRole('button', { name: /^Tools/ }).first().click().catch(() => {}); await settle(d, 500)
    const tile = d.getByRole('menuitem', { name: 'Floorplan to 3D Isometric', exact: true })
    ok(await tile.count() === 1 && await tile.getAttribute('data-soon') === null, 'the Floorplan to 3D Isometric tile is live (no Soon)')
    await tile.click(); await d.waitForURL(/\/planner\?view=iso/, { timeout: 10000 }).catch(() => {}); await settle(d, 2500)
    /* (pending modules S28, a deliberate change of this rule) the tile opens on Make a 3D picture — 1.0's tool's first step, its upload —
       over the planner's isometric gallery; closed, the gallery and its line are as before */
    if (await d.locator('[role="dialog"][aria-label="Make a 3D picture"]').count()) { await d.keyboard.press('Escape'); await settle(d, 600) }
    ok(/\/planner\?view=iso/.test(d.url()) && await d.getByTestId('planner-iso-note').count() === 1, 'it opens the 3-D Space Planner, saying layouts open in the isometric view')
    await shot(d, '01-iso-home')
    await d.getByText('Showroom — HDB 4-Room', { exact: true }).first().click()
    await d.waitForURL(/\/planner\/[^/?]+\?view=iso/, { timeout: 15000 }).catch(() => {}); await settle(d, 3000)
    ok(/view=iso/.test(d.url()) && await d.locator('[data-testid="planner-3d"] canvas').count() === 1, 'a layout opened from there opens on the 3D view, isometric')
    await d.getByTestId('planner-view-menu').first().click(); await settle(d, 300)
    ok(await d.getByRole('menuitemcheckbox', { name: /^Isometric/ }).getAttribute('aria-checked') === 'true', 'View ▾ marks Isometric')
    await shot(d, '02-isometric')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── TD-092 · Present ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-092 · Present walks the rooms')
    await viewMenu(d, /^Present/, 'menuitem'); await settle(d, 1200)
    const bar = d.getByTestId('planner-present')
    const total = planOf(SHOW).rooms.filter((r) => r.kind !== 'corridor').length
    ok(await bar.isVisible() && new RegExp(`1 of ${total}`).test(await bar.innerText()) && !(await d.getByTestId('planner-topbar').isVisible()), `Present: the stage alone, the room on screen, "1 of ${total}" (corridors skipped)`)
    const first = await d.getByTestId('planner-present-title').innerText()
    await d.keyboard.press('ArrowRight'); await settle(d, 900)
    ok(new RegExp(`2 of ${total}`).test(await bar.innerText()) && (await d.getByTestId('planner-present-title').innerText()) !== first, '→ goes to the next room')
    await shot(d, '03-present')
    await d.getByTestId('planner-present-exit').click(); await settle(d, 600)
    ok(await d.getByTestId('planner-present').count() === 0 && await d.getByTestId('planner-topbar').isVisible(), 'Exit ends it and the editor comes back')
    await viewMenu(d, /^Isometric/); await d.keyboard.press('1'); await settle(d, 1200)

    // ── TD-081 · Furniture · Dimensions · Ruler ──────────────────────────────────────────────────────────────────────────────────
    console.log('TD-081 · The View ▾: Furniture, Dimensions, the Ruler')
    ok(await pieceCount(d) > 0 && await sizeWords(d) > 0, 'the Top view draws the pieces and the rooms’ sizes')
    await viewMenu(d, /^Furniture/)
    ok(await pieceCount(d) === 0, 'Furniture off: the rooms bare')
    await viewMenu(d, /^Furniture/)
    ok(await pieceCount(d) > 0, 'Furniture on again')
    await viewMenu(d, /^Dimensions/)
    ok(await sizeWords(d) === 0, 'Dimensions off: no sizes on the plan')
    await viewMenu(d, /^Dimensions/)
    ok(await sizeWords(d) > 0, 'Dimensions on again')
    await viewMenu(d, /^Ruler/)
    ok(await d.getByTestId('planner-ruler-hint').isVisible(), 'the Ruler says how it measures')
    const box = await d.getByTestId('planner-top').boundingBox()
    await d.mouse.click(box.x + box.width / 2 - 120, box.y + box.height / 2); await settle(d, 200)
    await d.mouse.click(box.x + box.width / 2 + 120, box.y + box.height / 2); await settle(d, 400)
    const line = d.locator('[data-testid="planner-ruler"][data-done]')
    /* an SVG <text> has no innerText — its textContent is the words */
    const measured = (await line.locator('text').textContent().catch(() => '')) ?? ''
    ok(await line.count() === 1 && Number(await line.getAttribute('data-length')) > 0 && /\d (m|cm)$/.test(measured.trim()), `two presses measure — ${measured || '?'}`)
    await shot(d, '04-ruler')
    await d.keyboard.press('Escape'); await settle(d, 300)
    ok(await d.getByTestId('planner-ruler').count() === 0 && await d.getByTestId('planner-ruler-hint').count() === 1, 'Esc clears the measure')
    await d.keyboard.press('Escape'); await settle(d, 300)
    ok(await d.getByTestId('planner-ruler-hint').count() === 0, 'Esc again stops the Ruler')

    // ── TD-090 · Describe a piece ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-090 · A described piece')
    await d.getByTestId('planner-tab-furniture').click(); await settle(d, 400)
    await d.getByTestId('planner-furniture-panel').getByRole('searchbox').fill('a 3-seater sofa in grey'); await settle(d, 500)
    const said = d.getByTestId('planner-described')
    ok(await said.count() === 1 && /3-seater sofa/.test(await said.innerText()) && /Stone grey/.test(await said.innerText()), 'the closest piece to the words, in their colour')
    const before = planOf(SHOW).pieces.map((p) => p.id)
    await d.getByTestId('planner-place-described').click(); await saved(d)
    const placed = planOf(SHOW).pieces.filter((p) => !before.includes(p.id))
    ok(placed.length === 1 && placed[0].key === 'sofa-3' && placed[0].color === '#8C8C8C', 'Place it puts that sofa in, grey')
    await d.getByTestId('planner-top').focus(); await d.keyboard.press('Delete'); await saved(d)

    // ── TD-088 · Arrange the furniture ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-088 · Arrange a room by the rule, Undo')
    await d.getByTestId('planner-tab-rooms').click(); await settle(d, 400)
    await roomRow(d, 'Master bedroom').click(); await settle(d, 500)
    const master = planOf(SHOW).rooms.find((r) => r.name === 'Master bedroom')
    const was = planOf(SHOW).pieces.filter((q) => inRoom(q, master)).map((q) => q.id).sort()
    await d.getByTestId('planner-room-menu').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /^Arrange the furniture/ }).click(); await saved(d)
    const now = planOf(SHOW).pieces.filter((q) => inRoom(q, master)).map((q) => q.id).sort()
    ok(now.length > 0 && now.every((id) => !was.includes(id)) && /arranged/.test(await snackText(d)), `the room is furnished afresh and says so (${now.length} pieces)`)
    await d.getByRole('button', { name: 'Undo' }).last().click(); await saved(d)
    ok(JSON.stringify(planOf(SHOW).pieces.filter((q) => inRoom(q, master)).map((q) => q.id).sort()) === JSON.stringify(was), 'Undo puts back exactly what was there')
    await roomRow(d, 'Store').click(); await settle(d, 400)
    await d.getByTestId('planner-room-menu').click(); await settle(d, 300)
    const storeRow = d.getByRole('menuitem', { name: /^Arrange the furniture/ })
    ok(await storeRow.getAttribute('aria-disabled') === 'true' && /no furnishing rule/.test(await storeRow.innerText()), 'a store can’t be arranged — the row says why')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── TD-091 · Wall elevations ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-091 · A wall’s elevation')
    await roomRow(d, 'Master bedroom').click(); await settle(d, 400)
    await d.getByTestId('planner-room-menu').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /^Wall elevations/ }).click(); await settle(d, 800)
    const el = d.getByTestId('planner-elevation')
    ok(await el.count() === 1 && await el.locator('[data-testid="planner-elevation-drawing"] [data-piece]').count() > 0, 'the longest wall opens with the pieces against it')
    await shot(d, '05-elevation')
    const dl = d.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await d.getByTestId('planner-elevation-png').click()
    const file = await dl
    ok(!!file && /\.png$/.test(file.suggestedFilename()), 'Download PNG saves the wall')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── TD-075 · Levels ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-075 · A second level')
    const l1 = planOf(SHOW).rooms.length
    await d.getByTestId('planner-add-level').first().click(); await saved(d)
    const sw = d.getByTestId('planner-level-switch')
    ok(await sw.getByRole('radio').count() === 2 && await d.getByText('No rooms on Level 2 yet').count() === 1, 'the level switch appears, and Level 2 opens on its own empty state')
    await d.getByTestId('planner-copy-rooms').click(); await saved(d)
    ok(planOf(SHOW).levels?.[0]?.rooms.length === l1 && planOf(SHOW).rooms.length === l1, `Copy Level 1’s rooms copies its ${l1} rooms onto Level 2, Level 1 untouched`)
    await shot(d, '06-level-2')
    await d.getByTestId('planner-level-remove').click(); await saved(d)
    ok(!planOf(SHOW).levels?.length && /removed/.test(await snackText(d)), 'Remove takes the level away and says so')
    await d.getByRole('button', { name: 'Undo' }).last().click(); await saved(d)
    ok(planOf(SHOW).levels?.length === 1, 'Undo brings it back')
    await sw.getByRole('radio', { name: 'Level 1' }).click(); await settle(d, 400)

    // ── TD-087 · Versions ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-087 · Save a version, Bring back')
    const v0 = Number(sql(`select count(*) from space_layout_versions where layout_id='${SHOW}'`))
    await menu(d, /^Save a version/); await settle(d, 600)
    ok(Number(sql(`select count(*) from space_layout_versions where layout_id='${SHOW}'`)) === v0 + 1, 'Save a version keeps one')
    const keptLevels = planOf(SHOW).levels?.length
    await d.getByTestId('planner-tab-rooms').click(); await settle(d, 300)
    await d.getByTestId('planner-level-switch').getByRole('radio', { name: 'Level 2' }).click(); await settle(d, 400)
    await d.getByTestId('planner-level-remove').click(); await saved(d)
    await menu(d, /^Versions/); await settle(d, 1200)
    const rows = d.getByTestId('planner-version')
    ok(await rows.count() >= 1, 'Versions… lists the kept versions')
    await shot(d, '07-versions')
    await rows.first().getByTestId('planner-bring-back').click(); await saved(d)
    ok(planOf(SHOW).levels?.length === keptLevels && sql(`select count(*) from space_layout_versions where layout_id='${SHOW}' and note like '@before:%'`) !== '0', 'Bring back puts the version on screen, the layout as it was kept first')
    await d.getByRole('button', { name: 'Undo' }).last().click(); await saved(d)
    ok(!planOf(SHOW).levels?.length, 'Undo takes the brought-back version off again')
    await d.keyboard.press('Meta+z'); await saved(d)   // the level's removal, undone too: the layout keeps its two levels for the rest of the run
    ok(planOf(SHOW).levels?.length === 1, '…and ⌘Z walks back further')

    // ── TD-076 · Save as a template ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-076 · Save as a template, My templates, Kind: Templates')
    const t0 = Number(sql(`select count(*) from space_layouts where is_template=1`))
    await menu(d, /^Save as a template/); await settle(d, 900)
    ok(Number(sql(`select count(*) from space_layouts where is_template=1 and project_id is null and lead_id is null`)) === t0 + 1 && /template/.test(await snackText(d)), 'Save as a template keeps the studio’s own starting point (never a project’s)')
    await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1200)
    ok(Number(sql(`select count(*) from space_layouts where is_template=1`)) === t0, 'Undo takes it away')
    await menu(d, /^Save as a template/); await settle(d, 900)
    const TPL = sql(`select id from space_layouts where is_template=1 order by created_at desc limit 1`)
    await go(d, '/planner', 2000)
    await d.getByRole('button', { name: /^Kind/ }).first().click(); await settle(d, 300)
    ok(await d.getByRole('menuitemradio', { name: /^Templates/ }).count() === 1, 'the gallery’s Kind has Templates')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /From a template or a flat/ }).click(); await settle(d, 700)
    ok(await d.getByTestId('planner-my-templates').locator(`[data-key="tpl:${TPL}"]`).count() === 1, 'New layout lists it under My templates, above the flats')
    await shot(d, '08-my-templates')
    await d.locator(`[data-key="tpl:${TPL}"]`).click(); await d.getByTestId('planner-start').click()
    await d.waitForURL(/\/planner\/[^/?]+/, { timeout: 15000 }); await settle(d, 2500)
    const fromTpl = newLayoutId(d), fp = planOf(fromTpl)
    ok(sql(`select is_template=0 and project_id is null from space_layouts where id='${fromTpl}'`) === '1' && fp.rooms.length === planOf(TPL).rooms.length && (fp.levels?.length ?? 0) === (planOf(TPL).levels?.length ?? 0), 'it starts a personal layout with the template’s rooms and levels')
    await go(d, `/planner/${TPL}`, 2500)
    ok(/template/i.test(await d.getByTestId('planner-topbar').innerText())   /* the chip prints in capitals (its own type) */ && await d.getByTestId('planner-share').isDisabled(), 'a template says so and never shares')

    // ── TD-073 · Examples ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-073 · Start from an example')
    await go(d, '/planner', 1800)
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /From an example/ }).click(); await settle(d, 900)
    const exDlg = d.getByTestId('planner-new-dialog')
    ok(await d.getByRole('dialog', { name: /Start from an example/ }).count() === 1 && await exDlg.locator('[data-testid="planner-template"][data-key^="ex:"]').count() === 6, 'the six flats as furnished examples')
    await shot(d, '09-examples')
    await exDlg.locator('[data-key="ex:ex-hdb-4-japandi"]').click(); await d.getByTestId('planner-start').click()
    await d.waitForURL(/\/planner\/[^/?]+/, { timeout: 15000 }); await settle(d, 2500)
    const ex = newLayoutId(d), ep = planOf(ex)
    ok(sql(`select name from space_layouts where id='${ex}'`).startsWith('HDB 4-Room — Japandi') && ep.pieces.length > 10 && ep.rooms.filter((r) => r.floor).length >= 5, `it opens as the studio’s own copy, furnished (${ep.pieces.length} pieces) and finished in its style`)

    // ── TD-089 · Render in AI Visualizer ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('TD-089 · Render in AI Visualizer')
    const rooms0 = Number(sql(`select count(*) from project_rooms`))
    await menu(d, /^Render in AI Visualizer/)
    await d.waitForURL(/\/visualizer\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(d, 6000)
    const vid = (d.url().split('/visualizer/')[1] ?? '').split(/[?/]/)[0]
    ok(!!vid && Number(sql(`select count(*) from project_rooms where design_id='${vid}'`)) >= 1 && Number(sql(`select count(*) from project_rooms`)) > rooms0, 'the 3D view becomes a room photo of a Visualizer design')
    await shot(d, '10-visualizer')

    // ── TD-075 · the client's link and the paper show the levels ─────────────────────────────────────────────────────────────────
    console.log('TD-075 · The levels on the client’s link and the paper')
    await go(d, `/planner/${SHOW}`, 2500)
    await d.getByTestId('planner-share').click(); await settle(d, 500)
    await d.getByTestId('planner-create-link').click(); await settle(d, 1500)
    const sh = json(`select token, snapshot from space_layout_shares where layout_id='${SHOW}' and revoked_at is null`)[0]
    const snap = sh ? JSON.parse(sh.snapshot) : {}
    ok(!!sh && snap.levels?.length === 1 && snap.levels.every((l) => l.underlay === null), 'the snapshot carries the level, never a floor plan under it')
    ok(Number(sql(`select count(*) from space_layout_versions where layout_id='${SHOW}' and note='@shared'`)) >= 1, 'the share kept a version')
    await d.keyboard.press('Escape'); await settle(d, 300)
    const C = await desk(); const c = await C.newPage(); watch(c, 'client-link')
    await go(c, `/space/${sh.token}`, 3500)
    const lv = c.getByTestId('layout-viewer-levels')
    ok(await lv.getByRole('radio').count() === 2, 'the client’s link shows the levels as chips')
    await lv.getByRole('radio', { name: 'Level 2' }).click(); await settle(c, 1200)
    ok(await lv.getByRole('radio', { name: 'Level 2' }).getAttribute('aria-checked') === 'true', 'a chip shows that level')
    await shot(c, '11-client-levels')
    await C.close()
    await go(d, `/planner/${SHOW}/print`, 3500)
    ok(await d.locator('section[aria-label^="The plan — "]').count() === 2, 'the paper prints a plan page per level')

    // ── read-only ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Read-only — Alex on Dane’s personal layout')
    as('alex')
    await go(d, `/planner/${SHOW}`, 2500)
    await viewMenu(d, /^Furniture/)
    ok(await pieceCount(d) === 0, 'the View ▾ still works for a reader')
    await viewMenu(d, /^Furniture/)
    await roomRow(d, 'Master bedroom').click(); await settle(d, 400)
    await d.getByTestId('planner-room-menu').click(); await settle(d, 300)
    const ro = d.getByRole('menuitem', { name: /^Arrange the furniture/ })
    ok(await ro.getAttribute('aria-disabled') === 'true' && /Only Dane/.test(await ro.innerText()), 'Arrange waits on the layout’s rule, said in the row')
    await d.keyboard.press('Escape')
    as('dane')
    await D.close()

    // ── the phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The phone (390) and 320')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/planner/${SHOW}`, 2500)
    ok(await m.getByTestId('planner-view-menu').isVisible() && await m.getByTestId('planner-level-switch').isVisible(), 'the View ▾ and the level switch sit on the stage')
    ok(await noOverflow(m), 'no sideways scroll at 390')
    await m.getByTestId('planner-view-menu').tap(); await settle(m, 600)
    ok(await m.getByRole('menuitemcheckbox', { name: /^Ruler/ }).count() === 1, 'the View ▾ opens as a sheet with its rows')
    await shot(m, '12-phone-view-menu')
    await M.close()
    const N = await phone(320); const n = await N.newPage(); watch(n, '320')
    await go(n, `/planner/${SHOW}`, 2500)
    ok(await noOverflow(n), 'the editor fits 320')
    await N.close()
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    await b.close()
  }
  const real = errors.filter((e) => !/WebGL|GPU|ResizeObserver/.test(e))
  ok(!real.length, `no page errors${real.length ? ` — ${real.join(' · ')}` : ''}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
