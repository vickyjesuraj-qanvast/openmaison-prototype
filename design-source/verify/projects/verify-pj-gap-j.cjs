// Projects gaps build 2026-10-07 — package J, the 3-D Space Planner (the owner's "build everything"; Q-19's "later"; calls J-Q1…J-Q20 in
// design-source/context/parity/projects-gaps-build/j-read.md). Each check asserts a rule: the Tools tile and the gallery (1); a layout from a flat,
// furnished, personal (2); the editor — place a piece, Undo / Redo, a drag snapped to the grid, the inspector's size, remove with Undo (3);
// rooms — add, size, a wall opened, a door (4); finishes from the Visualizer's materials (5); 3D, Walls Low, Walk (6); Download PNG and the
// paper (7); sharing — a snapshot without the underlay, the client's link, its first open on the bell, Stop sharing with Undo (8); a project's
// layouts from its menu, traced from its floor plan, saved with the project, Back to it (9); the portal's Designs › 3D layouts (10); who may
// change it (11); Activity, search, Settings › Notifications (12); the phone (390) and 320 (13). Run against `next start -p 3131` on a fresh copy
// of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-j.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-j')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3131'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gapj-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PHONE = { ben: '97731968' }
const planOf = (id) => JSON.parse(sql(`select plan from space_layouts where id='${id}'`) || '{}')

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = []
  const ben = P('P-2026-002'), ryan = P('P-2026-001')
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  const SKY = sql(`select id from space_layouts where name='SkyOasis — proposed layout'`)
  const SHOW = sql(`select id from space_layouts where name='Showroom — HDB 4-Room'`)
  const TOKEN = sql(`select token from space_layout_shares where layout_id='${SKY}' and revoked_at is null`)
  /* what the run may change, kept to put back */
  const SNAP = [['space_layouts', '1'], ['space_layout_shares', '1'], ['lead_events', `kind like 'project_layout_%'`], ['notifications', '1'], ['members', '1'], ['portal_sessions', '1'], ['portal_bell_reads', '1'], ['homeowner_lead_links', '1']]
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
  const go = async (p, url, ms = 1200) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"]').allInnerTexts()).join(' | ')
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const saved = async (p) => { await p.waitForFunction(() => /Saved/.test(document.querySelector('[data-testid="planner-saved"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {}) }
  const menu = async (p, row) => { await p.getByTestId('planner-menu').click(); await settle(p, 300); await p.getByRole('menuitem', { name: row }).first().click(); await settle(p, 500) }
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  let made = null

  try {
    as('dane')
    const D = await desk(); const d = await D.newPage(); watch(d, 'desk')

    // ── 1 · Tools › 3-D Space Planner ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The Tools tile and the gallery')
    await go(d, '/leads')
    await d.getByRole('button', { name: /^Tools/ }).first().click().catch(() => {}); await settle(d, 500)
    const tile = d.getByRole('menuitem', { name: '3D Space Planner', exact: true })   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
    ok(await tile.count() === 1 && await tile.getAttribute('data-soon') === null, 'the Tools tile is live (no Soon)')
    await tile.click(); await d.waitForURL(/\/planner$/, { timeout: 10000 }).catch(() => {}); await settle(d, 2500)
    ok(/\/planner$/.test(d.url()), 'it opens Tools › 3-D Space Planner')
    ok(await d.getByText('SkyOasis — proposed layout').count() > 0 && await d.getByText('Showroom — HDB 4-Room').count() > 0, 'the gallery lists a project’s layout and a personal one')
    await shot(d, '01-gallery')

    // ── 2 · New layout from a flat ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · A layout from a Singapore flat, furnished')
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 300)
    /* (parity map, TD-076 — a deliberate change of this rule) with the studio's own templates (R95) the row reads "From a template or a flat…" */
    await d.getByRole('menuitem', { name: /From a (flat template|template or a flat|ready-made flat)/ }).click(); await settle(d, 600)   // (the calm UI build 2026-10-27, a deliberate change) — 6-30
    const dlg = d.getByTestId('planner-new-dialog')
    ok(await dlg.locator('[data-testid="planner-template"]').count() >= 7, 'the dialog offers the six flats and Blank')
    await shot(d, '02-new-layout')
    await dlg.locator('[data-key="hdb-3"]').click()
    await d.getByRole('switch', { name: 'Start with furniture placed' }).or(d.locator('label:has-text("Start with furniture placed") input')).first().check({ force: true }).catch(() => {})
    await d.getByTestId('planner-start').click()
    await d.waitForURL(/\/planner\/[^/?]+/, { timeout: 15000 }); await settle(d, 2500)
    made = d.url().split('/planner/')[1].split('?')[0]
    const mp = planOf(made)
    ok(sql(`select project_id is null and lead_id is null from space_layouts where id='${made}'`) === '1', 'a layout from the gallery is personal (no project, no lead)')
    ok(mp.rooms?.length === 8 && mp.pieces?.length > 5, `the HDB 3-Room comes with its eight rooms, furnished (${mp.pieces?.length} pieces)`)
    ok(await d.getByTestId('planner-top').count() === 1, 'the editor opens on the Top view')
    await shot(d, '03-editor-new')

    // ── 3 · Place, undo, drag, size, remove ───────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Pieces: place, Undo / Redo, a snapped drag, the size, remove with Undo')
    const n0 = mp.pieces.length
    await d.getByTestId('planner-tab-furniture').click(); await settle(d, 400)
    await d.locator('[data-testid="planner-piece"][data-key="armchair"]').click(); await settle(d, 300); await saved(d); await settle(d, 900)
    ok(planOf(made).pieces.length === n0 + 1, 'pressing a piece places it and the layout saves itself')
    ok(await d.getByTestId('planner-inspector').count() === 1, 'the placed piece is picked — its inspector shows')
    await d.keyboard.press('Meta+z'); await settle(d, 300); await saved(d); await settle(d, 900)
    ok(planOf(made).pieces.length === n0, '⌘Z takes it back')
    await d.keyboard.press('Meta+Shift+z'); await settle(d, 300); await saved(d); await settle(d, 900)
    const after = planOf(made).pieces
    ok(after.length === n0 + 1, '⇧⌘Z puts it back')
    const chair = after.find((p) => p.key === 'armchair')
    /* drag it 61 px right on the Top view: it lands on the 5 cm grid */
    const g = await d.locator(`[data-piece-id="${chair.id}"]`).first().boundingBox()
    await d.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await d.mouse.down(); await d.mouse.move(g.x + g.width / 2 + 30, g.y + g.height / 2 + 7, { steps: 5 }); await d.mouse.move(g.x + g.width / 2 + 61, g.y + g.height / 2 + 13, { steps: 5 }); await d.mouse.up()
    await settle(d, 300); await saved(d); await settle(d, 900)
    const moved = planOf(made).pieces.find((p) => p.id === chair.id)
    /* the axis it moves along lands on the 5 cm grid; the other stays on the grid, or flush where the wall snap holds it */
    ok(moved.x !== chair.x && moved.x % 5 === 0 && (moved.z % 5 === 0 || moved.z === chair.z), `a drag moves it on the 5 cm grid, flush to a wall it meets (${chair.x},${chair.z} → ${moved.x},${moved.z})`)
    await d.getByTestId('planner-w').locator('input').fill('120'); await d.getByTestId('planner-w').locator('input').press('Enter'); await settle(d, 300); await saved(d); await settle(d, 900)
    ok(planOf(made).pieces.find((p) => p.id === chair.id).w === 120, 'the inspector’s width keeps a typed size')
    await d.getByTestId('planner-top').focus(); await d.keyboard.press('Delete'); await settle(d, 400)
    ok(/removed/.test(await snackText(d)), 'Delete removes the piece and says so, with Undo')
    await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 300); await saved(d); await settle(d, 900)
    ok(planOf(made).pieces.some((p) => p.id === chair.id), 'the snackbar’s Undo puts it back')

    // ── 4 · Rooms ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Rooms: add, size, a wall opened, a door')
    await d.getByTestId('planner-tab-rooms').click(); await settle(d, 300)
    await d.getByTestId('planner-add-room').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /^Study/ }).click(); await settle(d, 600); await saved(d); await settle(d, 900)
    const study = planOf(made).rooms.find((r) => r.kind === 'study')
    ok(!!study && study.w === 250, 'Add a room › Study adds a 2.50 m study')
    await d.getByTestId('planner-room-w').locator('input').fill('320'); await d.getByTestId('planner-room-w').locator('input').press('Enter'); await settle(d, 300)
    await d.getByTestId('planner-walls').getByRole('button', { name: 'Right' }).click(); await settle(d, 300)
    await d.getByTestId('planner-add-door').click(); await settle(d, 300); await d.getByRole('menuitem', { name: /top side/ }).click(); await settle(d, 400); await saved(d); await settle(d, 900)
    const s2 = planOf(made).rooms.find((r) => r.id === study.id)
    ok(s2.w === 320 && s2.walls.e === false && s2.openings.some((o) => o.kind === 'door' && o.side === 'n'), 'its width, an opened side and a door on the top side are kept')
    await shot(d, '04-room-inspector')

    // ── 5 · Finishes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Finishes from the AI Visualizer’s materials')
    await d.getByTestId('planner-tab-finishes').click(); await settle(d, 500)
    await d.getByTestId('planner-finishes-panel').getByRole('button', { name: 'Oak Herringbone', exact: true }).first().click(); await settle(d, 300); await saved(d); await settle(d, 900)
    ok(planOf(made).rooms.find((r) => r.id === study.id).floor === 'floor-002', 'a room’s floor takes a catalogue material')
    await shot(d, '05-finishes')

    // ── 6 · 3D and Walk ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 3D, Walls Low, Walk')
    await d.keyboard.press('2'); await settle(d, 2500)
    ok(await d.locator('[data-testid="planner-3d"] canvas').count() === 1, '2 opens the 3D view (a WebGL canvas)')
    await d.getByTestId('planner-walls-height').getByRole('radio', { name: 'Low' }).click(); await settle(d, 1500); await saved(d); await settle(d, 900)
    ok(planOf(made).wallsLow === true, 'Walls: Low is kept with the layout')
    await shot(d, '06-3d')
    await d.keyboard.press('3'); await settle(d, 1500)
    ok(await d.getByTestId('planner-walk-pad').count() === 1, '3 opens Walk with its pad')
    await shot(d, '07-walk')
    await d.keyboard.press('1'); await settle(d, 800)

    // ── 7 · Export ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Download PNG and the paper')
    const dl = d.waitForEvent('download', { timeout: 10000 }).catch(() => null)
    await menu(d, /Download PNG/)
    const file = await dl
    ok(!!file && /\.png$/.test(file.suggestedFilename()), 'Download PNG saves the view as a picture named after the layout')
    await go(d, `/planner/${SKY}/print`, 3500)
    ok(await d.getByTestId('layout-print').count() === 1 && await d.locator('table').first().locator('tbody tr').count() === planOf(SKY).rooms.length, 'the paper lists every room')
    await shot(d, '08-paper', true)

    // ── 8 · Sharing ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Share with client — a snapshot, the link, its first open, Stop sharing')
    await go(d, `/planner/${made}`, 2500)
    await d.getByTestId('planner-share').click(); await settle(d, 500)
    await d.getByTestId('planner-create-link').click(); await settle(d, 1500)
    const sh = json(`select token, snapshot, revoked_at from space_layout_shares where layout_id='${made}'`)[0]
    ok(!!sh && !sh.revoked_at && JSON.parse(sh.snapshot).underlay === null, 'Make the link stores a snapshot, never the underlay')
    ok(await d.getByTestId('planner-share-url').innerText().then((t) => t.endsWith(`/space/${sh.token}`)), 'the dialog shows the client’s link')
    await shot(d, '09-share-dialog')
    await d.keyboard.press('Escape'); await settle(d, 300)
    const C = await desk(); const c = await C.newPage(); watch(c, 'client-link')
    await go(c, `/space/${sh.token}`, 3500)
    ok(await c.getByTestId('layout-viewer').count() === 1 && await c.locator('[data-testid="planner-3d"] canvas').count() === 1, 'the link opens the layout in 3D, no sign-in')
    ok(Number(sql(`select view_count from space_layout_shares where token='${sh.token}'`)) === 1, 'the client’s first open is counted once')
    await shot(c, '10-client-link')
    await menu(d, 'Stop sharing')
    ok(sql(`select revoked_at is not null from space_layout_shares where token='${sh.token}'`) === '1' && /Sharing stopped/.test(await snackText(d)), 'Stop sharing ends the link and says so, with Undo')
    await go(c, `/space/${sh.token}`, 1500)
    ok(await c.getByTestId('render-share-closed').count() === 1, 'a stopped link answers with the studio’s notice')
    await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1200)
    ok(sql(`select revoked_at is null from space_layout_shares where token='${sh.token}'`) === '1', 'Undo opens the same link again')
    await C.close()

    // ── 9 · From a project ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · A project’s layouts — listed, traced from its floor plan, saved with it')
    await go(d, `/projects/${ben}`, 1500)
    /* (parity P-03 · P-11, a deliberate change of this rule) the project's way into its layouts is the Create strip's 3-D Space Planner, not a ⋮ row */
    await d.locator('aside[aria-label="Create"][data-set="project"]').getByRole('button', { name: '3D Space Planner' }).click(); await settle(d, 1500)   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
    const pd = d.getByTestId('project-layouts-dialog')
    ok(await pd.getByText('SkyOasis — proposed layout').count() === 1, 'the project’s dialog lists its layout (1.0 never did — F-265)')
    await shot(d, '11-project-dialog')
    await d.getByTestId('project-layout-new').click(); await settle(d, 600)
    const trace = d.locator('[data-testid="planner-template"][data-key^="trace:"]').first()
    ok(await trace.count() === 1 && !(await trace.isDisabled()), 'the project’s scaled floor plan can be traced')
    await trace.click(); await d.getByTestId('planner-start').click()
    await d.waitForURL(/\/planner\/[^/?]+/, { timeout: 15000 }); await settle(d, 2500)
    const traced = d.url().split('/planner/')[1].split('?')[0]
    const tp = planOf(traced)
    ok(sql(`select project_id='${ben}' and lead_id='${benLead}' from space_layouts where id='${traced}'`) === '1', 'the new layout carries its project and its lead')
    ok(!!tp.underlay && tp.underlay.mmPerPx > 0 && await d.locator('[data-testid="planner-top"] image[data-underlay]').count() === 1, 'the floor plan lies under the Top view at its scale')
    ok(Number(sql(`select count(*) from lead_events where kind='project_layout_created' and project_id='${ben}' and json_extract(detail,'$.id')='${traced}'`)) === 1, 'its start is on the project’s Activity')
    await shot(d, '12-traced')
    await d.getByTestId('planner-back').click(); await d.waitForURL(new RegExp(`/projects/${ben}`), { timeout: 10000 }).catch(() => {})
    ok(new RegExp(`/projects/${ben}`).test(d.url()), 'Back returns to the project')

    // ── 10 · The portal ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · The portal’s Designs › 3D layouts')
    const BC = await desk(); const bc = await BC.newPage(); watch(bc, 'portal')
    await signIn(bc, PHONE.ben)
    await go(bc, '/my/demo-studio/designs', 1500)
    ok(await bc.getByTestId('portal-layouts').getByText('SkyOasis — proposed layout').count() === 1, 'the shared layout is on the client’s Designs')
    await bc.getByRole('button', { name: /^Notifications/ }).first().click(); await settle(bc, 600)
    ok(await bc.getByRole('dialog', { name: 'Notifications' }).getByText('A 3D layout from your designer').count() >= 1, 'the client’s bell has the layout')
    await bc.keyboard.press('Escape'); await settle(bc, 300)
    await shot(bc, '13-portal-designs', true)
    await bc.getByTestId('portal-layout').first().click(); await bc.waitForURL(/\/layout\//, { timeout: 10000 }); await settle(bc, 3000)
    ok(await bc.getByTestId('layout-viewer').count() === 1, 'it opens inside the portal')
    await shot(bc, '14-portal-viewer')
    await BC.close()

    // ── 11 · Who may ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · Who may change it')
    as('alex')
    await go(d, `/planner/${SHOW}`, 2500)
    ok(await d.getByTestId('planner-readonly').innerText().then((t) => /Only Dane, an Owner or an Admin/.test(t)), 'someone else’s personal layout opens read-only and says why')
    ok(await d.getByTestId('planner-share').isDisabled(), 'and Share with client waits on the same rule')
    as('dane')

    // ── 12 · Activity, search, Settings ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('12 · Activity, search, Settings › Notifications')
    await go(d, `/projects/${ben}/activity`, 1500)
    ok(await d.getByRole('radio', { name: '3D layouts' }).count() + await d.getByRole('button', { name: '3D layouts' }).count() > 0, 'Activity has a 3D layouts chip')
    ok(await d.getByText(/opened the 3D layout/).count() > 0, 'the client’s first open is on Activity')
    ok(Number(sql(`select count(*) from notifications where kind='layout_viewed' and member_id='germaine'`)) >= 1, 'the bell told whoever shared it')
    await go(d, '/settings?section=notifications', 1500)
    ok(await d.getByText('A client opens a shared 3D layout').count() > 0, 'Settings › Notifications lists the event')
    await go(d, '/planner', 1200)
    await d.keyboard.press('Meta+k'); await settle(d, 500)
    await d.keyboard.type('SkyOasis'); await settle(d, 1500)
    ok(await d.getByText('3D layout · HDB 5-Room — Benjamin Han').count() > 0, 'the studio search finds the layout under Designs')
    await D.close()

    // ── 13 · The phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('13 · The phone (390) and 320')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, '/planner', 1500)
    ok(await noOverflow(m), 'the gallery fits a phone')
    await go(m, `/planner/${made}`, 2500)
    ok(await m.getByTestId('planner-tab-furniture').count() === 1 && await m.getByTestId('planner-views').count() === 1, 'the phone has the dock and the view switch on the stage')
    await shot(m, '15-phone-editor')
    await m.getByTestId('planner-tab-furniture').tap(); await settle(m, 600)
    await m.locator('[data-testid="planner-piece"][data-key="plant"]').tap(); await settle(m, 800)
    ok(await m.getByTestId('planner-selbar').count() === 1, 'a placed piece shows the selection bar')
    await m.getByTestId('planner-details').tap(); await settle(m, 600)
    ok(await m.getByTestId('planner-inspector').count() === 1, 'Details opens the inspector in a sheet')
    await shot(m, '16-phone-inspector')
    ok(await noOverflow(m), 'the editor never scrolls sideways at 390')
    await go(m, `/space/${TOKEN}`, 3000)
    ok(await m.getByTestId('layout-viewer').count() === 1 && await noOverflow(m), 'the client’s link fits a phone (no Rotate-your-device wall)')
    await shot(m, '17-phone-link')
    await M.close()
    const N = await phone(320); const n = await N.newPage(); watch(n, '320')
    await go(n, `/planner/${made}`, 2500)
    ok(await noOverflow(n), 'the editor fits 320')
    await go(n, `/space/${TOKEN}`, 2500)
    ok(await noOverflow(n), 'the link fits 320')
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
