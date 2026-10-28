// Projects gaps build 2026-10-07 — package G, floor-plan mark-up with the client (the owner's "build everything"; Q-19's "later"; calls G-Q1…G-Q18
// in design-source/context/parity/projects-gaps-build/g-read.md). Each check asserts a rule: the tab and its count (1); plans — add (upload, the main
// plan asked, Undo), put away and back (2); the canvas — a pin, a box, Undo (⌘Z / Ctrl Z), Erase refused on someone else's mark (3); a thread, resolve
// with Undo, a task and a variation order from a mark (4); the scale and a measurement (5); the export's legend, with and without Studio only (6);
// the portal — Studio only stripped on the server, the client's pin and its bell row for the team, Erase refused on the studio's mark, a layout
// confirmed after the drawing changed, the client's bell (7); the Floor plan switch refuses the page and the picture (8); who may change it (9);
// Activity, Settings › Notifications, the first run (10); the phone (390). Run against `next start -p 3128` on a fresh copy of the repaired scratch
// DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-g.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-g')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3128'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gapg-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PHONE = { ben: '97731968', ryan: '97551246' }
const W = 1600, H = 1150

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), marcus = P('P-2026-004')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), marcusLead = leadOf(marcus)
  const leads = `'${ryanLead}','${benLead}','${marcusLead}'`
  const PROPOSED = sql(`select id from project_floor_plans where project_id='${ben}' and name='Proposed layout'`)
  const EXISTING = sql(`select id from project_floor_plans where project_id='${ben}' and name='Existing layout'`)
  const UNIT = sql(`select id from project_floor_plans where project_id='${ryan}' and name='Unit layout'`)
  const markBy = (plan, text) => sql(`select id from floor_plan_marks where plan_id='${plan}' and json_extract(shape,'$.text')='${text.replace(/'/g, "''")}'`)
  const SOCKET = markBy(PROPOSED, 'Could we have one more socket on this side of the bed?')
  const TV = markBy(PROPOSED, 'Can the TV wall take a 75-inch TV?')
  const BEAM = sql(`select id from floor_plan_marks where plan_id='${PROPOSED}' and layer='studio_only' limit 1`)
  const PHOTO = sql(`select json_extract(shape,'$.photos[0]') from floor_plan_marks where plan_id='${PROPOSED}' and tool='photo' limit 1`)
  /* what the run may change, kept to put back */
  const SNAP = [
    ['project_floor_plans', '1'], ['floor_plan_pictures', '1'], ['floor_plan_marks', '1'], ['floor_plan_comments', '1'], ['floor_plan_confirmations', '1'], ['floor_plan_seen', '1'],
    ['lead_tasks', `lead_id in (${leads})`], ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`], ['lead_events', `lead_id in (${leads})`],
    ['notifications', '1'], ['lead_files', `lead_id in (${leads})`], ['lead_file_images', `file_id in (select id from lead_files where lead_id in (${leads}))`],
    ['lead_file_thumbs', `file_id in (select id from lead_files where lead_id in (${leads}))`], ['quotes', `lead_id in (${leads})`], ['project_invoices', `project_id in ('${ryan}','${ben}','${marcus}')`],
    ['settings', `key in ('portal_sections')`], ['homeowner_lead_links', `lead_id in (${leads})`], ['portal_sessions', '1'], ['portal_bell_reads', '1'], ['members', '1'], ['notification_outbox', '1'],
  ]
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
  const ctxOf = (o) => b.newContext(o)
  const desk = () => ctxOf({ viewport: { width: 1440, height: 1024 } })
  const phone = () => ctxOf({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"]').allInnerTexts()).join(' | ')
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const stage = (p) => p.locator('[data-testid$="plan-canvas"] [role="img"]').first()
  const at = async (p, x, y) => { const bx = await stage(p).boundingBox(); return { x: bx.x + (x / W) * bx.width, y: bx.y + (y / H) * bx.height } }
  /* (the calm UI build 2026-10-27, a deliberate change — 3-28) Select · Pin · Pen · Text stay on the row; every other tool is under More tools */
  const tool = async (p, name) => {
    const chip = p.locator('[data-testid="plan-tool-chips"]').getByRole('radio', { name, exact: true })
    if (await chip.count()) return chip.click()
    await p.locator('[data-testid="plan-more-tools"] button').first().click(); await p.waitForTimeout(250)
    return p.getByRole('menuitemradio', { name: new RegExp(`^${name}\\b`) }).first().click()
  }
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  const dropPin = async (p, x, y, words, touch = false) => {
    await tool(p, 'Pin')
    const pt = await at(p, x, y)
    if (touch) await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y)
    await settle(p, 400)
    const card = p.locator('[data-testid="plan-typing"]')
    await card.locator('input, textarea').first().fill(words)
    await card.getByRole('button', { name: 'Add pin' }).click()
    await settle(p, 1600)
  }
  as('dane')
  try {
    // ── 1 · The tab ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The Floor plan tab')
    const D = await desk(); const d = await D.newPage(); watch(d, 'studio')
    await go(d, `/projects/${ben}`)
    /* (simplify S-03 · S-04, a deliberate change of this rule) Floor plan is the Design tab's second view: the strip lists Design, and the view's
       chip carries its own count */
    const tabLink = d.locator('[aria-label="Project sections"] a', { hasText: /^Design/ }).first()
    ok(await tabLink.count() === 1, 'the project’s tabs list Design (Choices · Floor plan · Designs)')
    await go(d, `/projects/${ben}/floor-plan`)
    ok(/^Floor plan\s*·\s*1/.test(await d.locator('[data-testid="project-view-chips"] [aria-checked="true"]').innerText()), 'its view’s count says one of Benjamin’s marks waits for an answer')
    /* (simplify S-03) the title line is the view switch now: the plan's name rides in its checked chip */
    ok(/Proposed layout/.test(await d.locator('[data-testid="plan-chips"] [aria-checked="true"]').innerText()), 'it opens on the main plan, the proposed layout')
    ok(await d.locator('[data-testid="plan-chips"] [role="radio"]').count() === 2, 'both plans are chips')
    ok(/Layout confirmed by Benjamin Han/.test(await d.locator('[data-testid="plan-banner"]').innerText()), 'the banner says Benjamin confirmed this layout')
    ok(/not a contract-grade signature/.test(await d.locator('[data-testid="plan-banner"]').innerText()), '…and that it is not a signature')
    const loaded = await d.locator('[data-testid="plan-picture"]').evaluate((i) => i.complete && i.naturalWidth > 0)
    ok(loaded, 'the plan’s picture comes through its route')
    ok(await d.locator('svg [data-mark]').count() >= 20, 'the marks are drawn on the plan')
    ok(await d.locator(`[data-mark-id="${BEAM}"]`).count() === 1, 'the studio sees its Studio only note')
    ok(/11 points/.test(await d.locator('[data-testid="plan-points"]').innerText()), 'Points counts the eleven stamps')
    ok(await d.locator('[data-testid="plan-diary"]').count() === 1, 'the site diary shows the kitchen photo')
    await shot(d, '01-studio-plan')

    // ── 2 · Plans ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Plans: add, the main plan asked, Undo; put away and back')
    await go(d, `/projects/${ryan}/floor-plan`)
    await d.locator('[data-testid="plan-add"]').click(); await settle(d, 500)
    const dlg = d.locator('[data-testid="plan-add-dialog"]')
    ok(await dlg.count() === 1, 'Add a plan opens its dialog')
    ok(/Make it the main plan/.test(await d.locator('[role="dialog"]').last().innerText()), 'with a plan already there, it asks whether this one becomes the main plan')
    await dlg.locator('input[type="file"]').setInputFiles(path.join(__dirname, '..', '..', '..', 'public', 'projects', 'demo', 'floor-plan-existing.png'))
    await settle(d, 400)
    await d.locator('[data-testid="plan-add-save"]').click()
    await d.waitForFunction(() => !document.querySelector('[data-testid="plan-add-dialog"]'), null, { timeout: 20000 }).catch(() => {}); await settle(d, 1500)
    const ryanPlans = json(`select id, name, is_main, file_id from project_floor_plans where project_id='${ryan}' and put_away_at is null order by created_at`)
    ok(ryanPlans.length === 2 && ryanPlans[1].is_main === 1 && ryanPlans[0].is_main === 0, 'the new plan is kept and is the main plan; the old one stays')
    ok(!!sql(`select id from lead_files where id='${ryanPlans[1]?.file_id}' and lead_id='${ryanLead}' and parent_id in (select id from lead_files where name='Floor plans')`), 'its file is kept in Files › Floor plans')
    ok(!!sql(`select length(data) from floor_plan_pictures where plan_id='${ryanPlans[1]?.id}'`), 'with the picture to mark up beside it')
    await shot(d, '02-added-plan')
    await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click(); await settle(d, 1800)
    ok(sql(`select count(*) from project_floor_plans where project_id='${ryan}' and put_away_at is null`) === '1' && sql(`select is_main from project_floor_plans where id='${UNIT}'`) === '1', 'Undo takes it off and the unit layout is the main plan again')
    await go(d, `/projects/${ben}/floor-plan?plan=${EXISTING}`)
    await d.locator('[data-testid="plan-kebab"]').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /^Put away/ }).click(); await settle(d, 1500)
    ok(!!sql(`select put_away_at from project_floor_plans where id='${EXISTING}'`), 'Put away hides the existing layout, its marks kept')
    await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click(); await settle(d, 1500)
    ok(!sql(`select put_away_at from project_floor_plans where id='${EXISTING}'`), 'Undo puts it back')

    // ── 3 · The canvas ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · The canvas: a pin, a box, Undo, Erase refused')
    await go(d, `/projects/${ben}/floor-plan`)
    await dropPin(d, 300, 300, 'Probe pin — the study desk')
    const probePin = markBy(PROPOSED, 'Probe pin — the study desk')
    ok(!!probePin && sql(`select author_kind || '/' || layer from floor_plan_marks where id='${probePin}'`) === 'studio/general', 'a studio pin is kept on General, by the studio')
    ok(await d.locator(`[data-mark-id="${probePin}"]`).count() === 1, 'its card is in the rail')
    await d.keyboard.press('Control+z'); await settle(d, 1600)
    ok(!!sql(`select deleted_at from floor_plan_marks where id='${probePin}'`), 'Ctrl Z undoes it')
    await tool(d, 'Box')
    const a1 = await at(d, 1150, 150), a2 = await at(d, 1400, 400)
    await d.mouse.move(a1.x, a1.y); await d.mouse.down(); await d.mouse.move(a2.x, a2.y, { steps: 6 }); await d.mouse.up(); await settle(d, 1600)
    const box = sql(`select id from floor_plan_marks where plan_id='${PROPOSED}' and tool='rect' and author_id='dane' and deleted_at is null order by created_at desc limit 1`)
    ok(!!box, 'a dragged box is kept')
    await tool(d, 'Erase')
    const sp = await at(d, 720, 330)
    await d.mouse.click(sp.x, sp.y); await settle(d, 700)
    ok(/only they can delete it/.test(await snackText(d)), 'Erase on Benjamin’s pin is refused — only whoever drew a mark deletes it')
    ok(!sql(`select deleted_at from floor_plan_marks where id='${SOCKET}'`), '…and his pin stays')
    await shot(d, '03-canvas')

    // ── 4 · A thread, resolve, a task, a variation order ─────────────────────────────────────────────────────────────────────────
    console.log('4 · A thread, resolve with Undo, a task and a variation order')
    await go(d, `/projects/${ben}/floor-plan?mark=${SOCKET}`)
    const card = d.locator(`[data-mark-id="${SOCKET}"]`)
    ok(await card.locator('button').first().getAttribute('aria-expanded') === 'true', 'arriving with ?mark= (the bell) opens that mark’s thread')
    if (await card.locator('button').first().getAttribute('aria-expanded') !== 'true') { await card.locator('button').first().click(); await settle(d, 400) }
    await card.locator('textarea').fill('Yes — a double socket on that side, we’ve added it to the electrical points.')
    await card.locator('[data-testid="plan-comment-send"]').click(); await settle(d, 1600)
    ok(sql(`select count(*) from floor_plan_comments where mark_id='${SOCKET}' and author_kind='studio'`) === '1', 'the studio’s answer is kept on the thread')
    await card.locator('[data-testid="plan-mark-status"]').click(); await settle(d, 1400)
    ok(sql(`select status from floor_plan_marks where id='${SOCKET}'`) === 'resolved', 'Mark resolved')
    await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click(); await settle(d, 1400)
    ok(sql(`select status from floor_plan_marks where id='${SOCKET}'`) === 'open', 'Undo reopens it')
    /* (simplify S-22, a deliberate change of this rule) a mark's Make a task · Raise a variation order sit on the ⋮ every client ask carries */
    await card.locator('[data-testid="plan-mark-asks"]').click(); await settle(d, 400)
    await d.locator('[data-testid="plan-mark-task"]').click(); await settle(d, 1600)
    const taskId = sql(`select task_id from floor_plan_marks where id='${SOCKET}'`)
    ok(!!taskId && sql(`select title from lead_tasks where id='${taskId}'`) === 'Could we have one more socket on this side of the bed?', 'Make a task — the house task, titled from the mark, linked to it')
    ok(sql(`select member_id from task_assignees where task_id='${taskId}'`) === 'dane', '…assigned to whoever pressed it')
    await card.locator('[data-testid="plan-mark-asks"]').click(); await settle(d, 400)
    await d.locator('[data-testid="plan-mark-vo"]').click()
    await d.waitForURL(/\/quotes\//, { timeout: 15000 }).catch(() => {}); await settle(d, 1200)
    const voId = sql(`select variation_id from floor_plan_marks where id='${SOCKET}'`)
    ok(!!voId && sql(`select kind || '/' || project_id from quotes where id='${voId}'`) === `variation/${ben}`, 'Raise a variation order — a VO on the project, linked to the mark')
    ok(d.url().includes(`/quotes/${voId}`), '…and the editor opens on it')
    ok(sql(`select count(*) from lead_events where project_id='${ben}' and kind in ('project_floor_plan_task','project_floor_plan_vo')`) === '3', 'both are on the project’s Activity record')

    // ── 5 · Scale and measure ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Set the scale, then measure')
    await go(d, `/projects/${ryan}/floor-plan`)
    await tool(d, 'Measure'); await settle(d, 300)
    ok(await d.locator('[data-testid="plan-scale"]').count() === 1, 'Measure on a plan with no scale opens the scale’s steps first')
    for (const [x, y] of [[160, 110], [1440, 110]]) { const q = await at(d, x, y); await d.mouse.click(q.x, q.y); await settle(d, 300) }
    await d.locator('[data-testid="plan-scale"] input').fill('11.52 m'); await settle(d, 200)
    ok(/Reading that as 11\.52 m/.test(await d.locator('[data-testid="plan-scale"]').innerText()), 'the length is read back as it is understood')
    await d.locator('[data-testid="plan-scale"]').getByRole('button', { name: 'Set' }).click(); await settle(d, 1600)
    const scale = Number(sql(`select scale_mm_per_px from project_floor_plans where id='${UNIT}'`))
    ok(Math.abs(scale - 9) < 0.2, `the plan learns its scale (${scale.toFixed(2)} mm a pixel)`)
    const m1 = await at(d, 160, 520), m2 = await at(d, 760, 520)
    await d.mouse.move(m1.x, m1.y); await d.mouse.down(); await d.mouse.move(m2.x, m2.y, { steps: 6 }); await d.mouse.up(); await settle(d, 1600)
    ok(!!sql(`select id from floor_plan_marks where plan_id='${UNIT}' and tool='dimension' and deleted_at is null`), 'then Measure draws a measurement')
    ok(/5\.40 m|5\.4\d m/.test(await d.locator('[data-testid="plan-marks"]').innerText()), 'which reads in metres from the scale')
    await shot(d, '05-measured')

    // ── 6 · The export ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Download PDF for the contractor')
    await go(d, `/projects/${ben}/floor-plan/${PROPOSED}`)
    const legend = d.locator('section[aria-label="Legend"] table').first()
    const rowsWith = await legend.locator('tbody tr').count()
    ok(rowsWith >= 4 && /S1/.test(await legend.innerText()), 'the legend lists the pins, the callout and the studio’s own note')
    ok(/HDB 5-Room — Benjamin Han/.test(await d.locator('[data-testid="plan-print"]').innerText()), 'the papers carry the project’s name, not the plan’s')
    await shot(d, '06-export', true)
    await d.getByText('Include Studio only').click(); await settle(d, 400)
    ok(!/S1/.test(await legend.innerText()) && await legend.locator('tbody tr').count() === rowsWith - 1, 'Include Studio only off — the note leaves the copy')

    // ── 7 · The portal ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · The client’s Floor plan')
    const C = await desk(); const c = await C.newPage(); watch(c, 'ben')
  /* (the calm UI build 2026-10-27, a deliberate change — 3-36) at a desk the bar is the phone's five: Home · Schedule · Updates · Payments and More ▾,
     the rest in its menu — a section is "in the bar" when it is either */
  const deskSections = async (pg) => {
    const bar = await pg.locator('[data-testid="portal-nav"]').innerText()
    if (!(await pg.locator('[data-testid="portal-nav-more"]').count())) return bar
    await pg.locator('[data-testid="portal-nav-more"]').click(); await pg.waitForTimeout(300)
    const rows = await pg.locator('[data-testid="portal-nav-more-row"]').allInnerTexts()
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(250)
    return `${bar}\n${rows.join('\n')}`
  }
  const deskHas = async (pg, key) => {
    if (await pg.locator(`[data-testid="portal-nav"] a[data-key="${key}"]`).isVisible()) return true
    if (!(await pg.locator('[data-testid="portal-nav-more"]').count())) return false
    await pg.locator('[data-testid="portal-nav-more"]').click(); await pg.waitForTimeout(300)
    const there = await pg.locator(`[data-testid="portal-nav-more-row"][data-key="${key}"] [role="menuitem"]`).isVisible()
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(250)
    return there
  }
    await signIn(c, PHONE.ben)
    await c.locator('[data-testid="portal-bell"]').click(); await settle(c, 1200)
    ok(await c.locator('[data-testid="portal-bell-row"][data-kind="floor_plan_reply"][data-unread]').count() >= 1, 'the studio’s answer on his pin rings Benjamin’s bell')
    await c.keyboard.press('Escape'); await settle(c, 300)
    ok(/Floor plan/.test(await deskSections(c)), 'the portal lists Floor plan')
    const html = await (await c.request.get(`${BASE}/my/demo-studio/floor-plan`)).text()
    ok(!/beam depth/i.test(html) && !html.includes(BEAM), 'Studio only never reaches the client — not in the page it is sent')
    await go(c, '/my/demo-studio/floor-plan')
    ok(await c.locator('[data-testid="portal-floor-plan"]').count() === 1, 'the plan opens on his portal')
    ok(await c.locator(`[data-mark-id="${BEAM}"]`).count() === 0 && await c.locator(`[data-mark-id="${TV}"]`).count() === 1, 'his own marks and the studio’s are there; the studio’s note is not')
    ok((await c.request.get(`${BASE}/my/demo-studio/file/${PHOTO}`)).status() === 200, 'a photo on a mark opens through the portal’s file route')
    ok(/It has changed since/.test(await c.locator('[data-testid="portal-plan-confirm"]').innerText()), 'the studio’s new box changed the drawing — he is asked to confirm again')
    await dropPin(c, 500, 800, 'Probe — can the sofa face the window?')
    const clientPin = markBy(PROPOSED, 'Probe — can the sofa face the window?')
    ok(!!clientPin && sql(`select author_kind || '/' || layer from floor_plan_marks where id='${clientPin}'`) === 'client/client', 'his pin is kept on Client requests')
    ok(sql(`select count(*) from notifications where kind='floor_plan_client' and href like '%${clientPin}%'`) !== '0', 'the team hears it on the bell')
    await tool(c, 'Erase')
    const ac = await at(c, 800, 112); await c.mouse.click(ac.x, ac.y); await settle(c, 700)
    ok(/only they can delete it/.test(await snackText(c)), 'Erase on the studio’s stamp is refused')
    await c.locator('[data-testid="portal-plan-confirm-open"]').click(); await settle(c, 400)
    await c.locator('[role="dialog"] textarea').fill('Yes, this is the one.')
    await c.locator('[data-testid="portal-plan-confirm-save"]').click(); await settle(c, 1600)
    ok(sql(`select count(*) from floor_plan_confirmations where plan_id='${PROPOSED}'`) === '2', 'Confirm this layout adds a dated record — the first one kept')
    ok(sql(`select count(*) from notifications where kind='floor_plan_confirmed' and member_id='dane' and read_at is null`) === '1', 'the studio hears it at once')
    await shot(c, '07-portal-plan', true)

    // ── 8 · The switch ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Company › Client portal switches the Floor plan off')
    sql(`insert or replace into settings (key, value, updated_at) values ('portal_sections', '{"floor-plan":false}', strftime('%s','now'))`)
    await go(c, '/my/demo-studio/floor-plan')
    ok(!/floor-plan/.test(c.url()), 'the page leads home while the section is off')
    ok(!/Floor plan/.test(await deskSections(c)), 'the tab is gone')
    ok((await c.request.get(`${BASE}/my/demo-studio/floor-plan/picture/${PROPOSED}`)).status() === 404, 'the plan’s picture is refused')
    ok((await c.request.get(`${BASE}/my/demo-studio/file/${PHOTO}`)).status() !== 200, 'and its photos')
    sql(`delete from settings where key='portal_sections'`)
    await C.close()

    // ── 9 · Who may change it ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · Who may change the floor plan')
    as('alex')
    await go(d, `/projects/${ben}/floor-plan`)
    const seesIt = await d.locator('[data-testid="project-floor-plan"]').count()
    ok(seesIt === 0 || (await d.locator('[data-testid="plan-tools"]').count() === 0 && /Only the project’s team/.test(await d.locator('[data-testid="plan-caption"]').innerText())), 'a Designer off the team gets no tools — the line says whose plan it is to change')
    as('dane')

    // ── 10 · Activity, Settings, the first run ───────────────────────────────────────────────────────────────────────────────────
    console.log('10 · Activity, Settings › Notifications, a first run')
    await go(d, `/projects/${ben}/activity`)
    await d.locator('[data-testid="activity-chips"]').getByRole('radio', { name: 'Floor plan' }).click(); await settle(d, 400)
    const act = await d.locator('[data-testid="activity-feed"]').innerText()
    ok(/confirmed the layout/.test(act) && /made the task/.test(act), 'the project’s Activity files the floor plan under its own chip')
    await go(d, '/settings?section=notifications')
    ok(/A client marks up the floor plan/.test(await d.locator('body').innerText()), 'Settings › Notifications lists the floor plan’s events')
    await go(d, `/projects/${marcus}/floor-plan`)
    ok(await d.locator('[data-testid="plan-empty"]').count() === 1 && await d.locator('[data-testid="plan-empty-add"]').count() === 1, 'a project with no plan opens on the first run, with Add a plan')
    await shot(d, '10-first-run')
    await D.close()

    // ── 11 · The phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · The phone (390)')
    const M = await phone(); const mp = await M.newPage(); watch(mp, 'phone')
    await go(mp, `/projects/${ben}/floor-plan`)
    ok(await stage(mp).count() === 1 && await mp.locator('[data-testid="plan-tool-chips"]').count() === 1, 'the studio’s plan and its tools fit a phone')
    ok(await noOverflow(mp), 'no sideways scroll')
    await shot(mp, '11-phone-studio', true)
    const MC = await phone(); const mc = await MC.newPage(); watch(mc, 'phone-ben')
    await signIn(mc, PHONE.ben)
    await go(mc, '/my/demo-studio/floor-plan')
    await dropPin(mc, 300, 700, 'Probe — a phone pin', true)
    ok(!!markBy(PROPOSED, 'Probe — a phone pin'), 'a tap drops the client’s pin on a phone')
    ok(await noOverflow(mc), 'the portal’s plan has no sideways scroll')
    await shot(mc, '11-phone-portal', true)
    await M.close(); await MC.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    await b.close()
    const left = sql(`select count(*) from floor_plan_marks where json_extract(shape,'$.text') like 'Probe%'`)
    console.log(left === '0' ? '  (the database is as it was)' : `  ! ${left} probe marks left`)
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
