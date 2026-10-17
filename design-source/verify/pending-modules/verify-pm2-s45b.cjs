// S45B · H-UHD-2 — Urban Home Design's Contractors, built as a feature every studio gets (Vicky 2026-10-17: "can you go ahead and build
// everything and complete it"; the row in s42/sweep-newer-branches-2026-10-15.md §2.1; 1.0's spec docs/features/contractor-dashboard/spec.md
// @ urbanhomedemo 4da810229). Each item asserted as the rule it builds — never a literal demo date (the demo moves with the restore day):
//  1 · A contractor is a Finance › Vendors record: the Contractors chip narrows the directory to the vendors marked as working on site (the
//      chip's count is the DB's); a contractor's row says its trades and "works on site"; its panel says On site (trades · sites at once ·
//      code) and This week, and lists its Sites, each opening the project's Schedule. The vendor dialog's Works on site switch reveals the
//      trades (the vendor's Trade picked first), Sites at once (1–20, the house message) and Code, and saves them.
//  2 · Projects › Workload: Members · Contractors (Owners, Admins, Managers); Contractors in the address (`of=contractors`); the four tiles
//      agree with the rows (Free this week = rows free, Over capacity = rows over; a free row has no block, an over row more sites than it runs at
//      once); a tile pressed narrows the rows; the gaps name a trade some active contractor does; By site is the house table with a column per
//      trade. A Designer (Germaine) meets Contractors only, no Members chip; Accounting and Marketing never open the listing.
//  3 · A gap's Add a contractor opens the dialog on its milestone and trade, the free contractors first; Add → the row, its Activity line,
//      the gap gone; Undo takes both away.
//  4 · The project's Schedule: the toolbar's Contractors opens every crew row by trade; a milestone row's line names its crew (or its gap); the
//      milestone panel lists its crew with Add a contractor; a crew row's ⋮ — Done (Undo), Leader checked (Undo) for an Owner; a Designer on the
//      team changes the status but reads the Leader-check rule in the row; Needs you on the Overview offers Add a contractor for the gap and
//      lands on the dialog.
//  5 · ⌘K finds Contractors; the project's Activity says who put whom on.
//  Width: 390 touch (and 768 touch, 320) with no sideways scroll; no page errors. Everything written is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s45b.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s45b')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const TABLES = ['vendors', 'project_contractors', 'lead_events', 'notifications', 'settings']
const dump = () => Object.fromEntries(TABLES.map((t) => [t, execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" ".mode insert ${t}" "select * from ${t}"`, { maxBuffer: 256 * 1024 * 1024 }).toString()]))
const restore = (d) => {
  const file = path.join(os.tmpdir(), `s45b-restore-${process.pid}.sql`)
  fs.writeFileSync(file, `PRAGMA foreign_keys=OFF;\nBEGIN;\n${TABLES.map((t) => `DELETE FROM ${t};\n${d[t]}`).join('\n')}\nCOMMIT;\n`)
  execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${file}"`)
  fs.unlinkSync(file)
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const saved = dump()
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await snack(p).getByRole('button', { name: 'Undo' }).click(); await settle(p, 1500) }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const tileValue = async (p, key) => Number((await p.getByTestId(`crew-tile-${key}`).locator('[class*="value"]').first().innerText().catch(() => 'NaN')).trim())

  const RYAN = sql(`select id from projects where number = 'P-2026-001'`)
  const RYAN_LEAD = sql(`select lead_id from projects where id = '${RYAN}'`)
  const contractors = Number(sql(`select count(*) from vendors where is_contractor = 1 and is_active = 1 and merged_into is null`))
  const WOOD = sql(`select id from vendors where name = 'Woodcraft Carpentry Pte Ltd'`)
  const capOf = (id) => Number(sql(`select crew_capacity from vendors where id = '${id}'`))
  const activeTrades = sql(`select group_concat(lower(j.value), '|') from vendors v, json_each(v.trades_json) j where v.is_contractor = 1 and v.is_active = 1`).split('|')

  try {
    ok(contractors > 0, `R148: the demo keeps contractors (${contractors}) — vendors marked as working on site`)
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')

    // ── 1 · a contractor is a Finance › Vendors record ──────────────────────────────────────────────────────────────────────────────
    console.log('1 · Finance › Vendors')
    await go(p, '/company/finance/vendors')
    const chip = p.getByTestId('finance-chips').getByRole('radio', { name: /^Contractors/ })
    ok(await chip.count() === 1 && new RegExp(`\\b${contractors}\\b`).test(await chip.innerText()), 'the Contractors chip, its count the DB’s')
    await chip.click(); await settle(p, 500)
    const vrows = p.locator('[data-vendor]')
    ok(await vrows.count() === contractors, 'pressed, it lists the contractors alone')
    ok(/works on site/.test(await vrows.first().innerText()), 'a contractor’s row says its trades and “works on site”')
    await shot(p, '1-vendors-contractors-1440')
    await go(p, `/company/finance/vendors?open=${WOOD}`)
    const vp = p.getByTestId('vendor-panel')
    await vp.waitFor({ timeout: 8000 }).catch(() => {})
    const vpText = (await vp.innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(new RegExp(`On site Carpentry · ${capOf(WOOD)} sites? at once · WC`).test(vpText), 'its panel: On site — trades · sites at once · code')
    ok(/This week (Free this week|Room for \d+ more|Full|\d+ over)/.test(vpText), 'and how it stands this week, in the Workload view’s words')
    const sites = vp.getByTestId('vendor-panel-sites')
    ok(await sites.locator('li').count() === Number(sql(`select count(*) from project_contractors where vendor_id = '${WOOD}' and removed_at is null`)), 'Sites: every place it has on a project')
    ok(await sites.getByRole('link').first().getAttribute('href').then((h) => /\/projects\/[^/]+\/schedule\?crew=1.*from=/.test(h || '')).catch(() => false), 'each opens the project’s Schedule with its contractors, and comes back (?from=)')
    await shot(p, '1-vendor-panel-1440')
    /* the dialog: Works on site on a vendor that isn't one */
    const HAUL = sql(`select id from vendors where name = 'Lim Brothers Haulage'`)
    await go(p, `/company/finance/vendors?open=${HAUL}`)
    await p.getByTestId('vendor-edit').click(); await settle(p, 500)
    const dlg = p.getByTestId('vendor-dialog')
    ok(await dlg.getByTestId('vendor-crew-trades').count() === 0, 'a vendor that isn’t a contractor: no trades asked')
    await dlg.getByTestId('vendor-contractor').click(); await settle(p, 300)
    ok(await dlg.getByTestId('vendor-crew-trades').getByRole('button', { name: 'Logistics', pressed: true }).count() === 1, 'Works on site: the trades, the vendor’s own Trade picked first')
    await dlg.getByTestId('vendor-capacity').fill('0'); await p.getByTestId('vendor-save').click(); await settle(p, 400)
    ok(/Enter a number from 1 to 20/.test(await dlg.innerText()), 'Sites at once out of 1–20: the house message, nothing saved')
    await dlg.getByTestId('vendor-capacity').fill('3'); await dlg.getByTestId('vendor-code').fill('LB')
    await p.getByTestId('vendor-save').click(); await settle(p, 1500)
    ok(sql(`select is_contractor || '|' || trades_json || '|' || crew_capacity || '|' || code from vendors where id = '${HAUL}'`) === '1|["Logistics"]|3|LB', 'saved: a contractor, its trades, 3 sites at once, its code')
    await shot(p, '1-vendor-dialog-1440')

    // ── 2 · Projects › Workload › Contractors ───────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The Workload view’s Contractors')
    await go(p, '/projects?view=workload')
    const of = p.getByTestId('workload-of')
    ok(await of.getByRole('radio', { name: 'Members' }).count() === 1 && await of.getByRole('radio', { name: 'Contractors' }).count() === 1, 'Members · Contractors for an Owner')
    await of.getByRole('radio', { name: 'Contractors' }).click(); await settle(p, 800)
    ok(/of=contractors/.test(p.url()), 'Contractors rides the address')
    const view = p.getByTestId('contractors-view')
    ok(await view.count() === 1, 'the Contractors view')
    const rows = view.getByTestId('contractor-row')
    const nRows = await rows.count()
    const active = Number(sql(`select count(*) from vendors where is_contractor = 1 and is_active = 1 and merged_into is null`))
    ok(nRows === active, `a row per active contractor (${nRows})`)
    const states = await rows.evaluateAll((els) => els.map((e) => ({ id: e.getAttribute('data-contractor'), state: e.getAttribute('data-state'), blocks: e.querySelectorAll('[data-testid="contractor-block"]').length })))
    ok(await tileValue(p, 'free') === states.filter((s) => s.state === 'free').length, 'Free this week = the rows free')
    ok(await tileValue(p, 'over') === states.filter((s) => s.state === 'over').length, 'Over capacity = the rows over')
    ok(states.filter((s) => s.state === 'free').every((s) => s.blocks === 0), 'a free contractor has no site this week')
    ok(states.filter((s) => s.state === 'over').every((s) => s.blocks > capOf(s.id)), 'an over-capacity contractor is on more sites than it runs at once')
    ok(states.some((s) => s.state === 'over') && states.some((s) => s.state === 'free'), 'the demo shows both — someone over capacity, someone free to send')
    const order = states.map((s) => s.state)
    ok(order.indexOf('free') === 0 || !order.includes('free'), 'free first (1.0’s idle rows pinned to the top)')
    const gapRows = view.getByTestId('contractor-gap')
    const nGaps = await gapRows.count()
    ok(nGaps === await tileValue(p, 'gaps') && nGaps >= 1, `No contractor yet = the gaps listed (${nGaps})`)
    const gapNames = await gapRows.evaluateAll((els) => els.map((e) => (e.getAttribute('data-trade') || '').toLowerCase()))
    ok(gapNames.every((t) => activeTrades.includes(t)), 'each gap is of a trade some active contractor does')
    await shot(p, '2-workload-contractors-1440')
    await p.getByTestId('crew-tile-free').click(); await settle(p, 400)
    const narrowed = await view.getByTestId('contractor-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))
    ok(narrowed.length > 0 && narrowed.every((s) => s === 'free') && await p.getByTestId('crew-tile-free').getAttribute('aria-pressed') === 'true', 'a tile pressed narrows the rows to its state')
    await p.getByTestId('crew-tile-free').click(); await settle(p, 300)
    /* 1.0's window: Next 30 days — the free tile's words follow, and nobody free over a month is busy this week */
    await view.getByRole('button', { name: /^Window: This week/ }).click(); await settle(p, 300)
    await p.getByRole('menuitemradio', { name: 'Next 30 days' }).click(); await settle(p, 500)
    ok(/Free in the next 30 days/i.test(await p.getByTestId('crew-tile-free').innerText()), 'Window › Next 30 days: the tiles say so')
    const wide = await view.getByTestId('contractor-row').evaluateAll((els) => els.filter((e) => e.getAttribute('data-state') === 'free').map((e) => e.getAttribute('data-contractor')))
    ok(wide.every((id) => states.find((x) => x.id === id)?.state === 'free'), 'free over 30 days ⇒ free this week')
    await view.getByRole('button', { name: /^Window:/ }).click(); await settle(p, 300)
    await p.getByRole('menuitemradio', { name: 'This week' }).click(); await settle(p, 400)
    /* By site — the house table, a column per trade */
    await view.getByTestId('contractors-by').getByRole('radio', { name: 'By site' }).click(); await settle(p, 600)
    const table = view.getByTestId('contractors-sites')
    const heads = (await table.locator('[role="columnheader"]').allInnerTexts()).map((h) => h.trim())
    ok(/^Project/i.test(heads[0] || '') && heads.some((h) => /^Carpentry/i.test(h)), `By site: a running project a row, a column per trade (${heads.slice(0, 4).join(' · ')})`)
    ok(await table.getByRole('row').filter({ hasText: 'Ryan' }).count() === 1, 'Ryan’s project is a row')
    ok(await table.getByTestId('site-gap').count() >= 1, 'a gap says “Nobody yet” in its trade’s cell')
    await shot(p, '2-by-site-1440')
    await view.getByTestId('contractors-by').getByRole('radio', { name: 'By contractor' }).click(); await settle(p, 400)
    /* the Dashboard's Contractors tile (S45A's hand-over): the view's own figure, its door the view */
    const freeHere = await tileValue(p, 'free')
    await go(p, '/dashboard')
    const dt = p.getByTestId('tile-contractors')
    ok(await dt.count() === 1 && Number((await dt.locator('[class*="__value"]').innerText()).trim()) === freeHere, `the Dashboard’s Contractors tile: the view’s Free this week (${freeHere})`)
    ok(/over capacity/.test(await dt.innerText()) && /starting with no contractor/.test(await dt.innerText()), 'its line: over capacity · starting with no contractor')
    await dt.click(); await p.waitForURL(/of=contractors/, { timeout: 10000 }).catch(() => {}); await settle(p, 800)
    ok(await p.getByTestId('contractors-view').count() === 1, 'it opens the Contractors view')
    await go(p, '/projects?view=workload&of=contractors')

    // ── 3 · a gap's Add a contractor ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Add a contractor from a gap')
    const crew0 = Number(sql(`select count(*) from project_contractors where removed_at is null`))
    const g0 = view.getByTestId('contractor-gap').first()
    const gTrade = await g0.getAttribute('data-trade')
    await g0.getByTestId('contractor-gap-add').click(); await settle(p, 600)
    const cd = p.getByTestId('crew-dialog')
    ok(await cd.count() === 1, 'the dialog opens')
    const choices = cd.getByTestId('crew-choices').getByRole('radio')
    ok(await choices.count() >= 1, `the contractors who do ${gTrade}`)
    ok(/Free|Room/.test(await choices.first().innerText()), 'the free ones first, each with how it stands over the work’s days')
    await choices.first().click()
    await shot(p, '3-assign-dialog-1440')
    await p.getByTestId('crew-save').click(); await settle(p, 1800)
    ok(Number(sql(`select count(*) from project_contractors where removed_at is null`)) === crew0 + 1, 'Add: the row is on record')
    const newId = sql(`select id from project_contractors order by created_at desc limit 1`)
    ok(sql(`select count(*) from lead_events where kind = 'project_contractor_assigned' and json_extract(detail, '$.id') = '${newId}'`) === '1', 'its Activity line')
    ok(new RegExp(`is on .+ for ${gTrade}`).test(await snackText(p)), 'the sentence: “… is on {milestone} for {trade}”, with Undo')
    ok(await p.getByTestId('contractor-gap').count() === nGaps - 1, 'the gap is gone')
    await undo(p)
    ok(Number(sql(`select count(*) from project_contractors where removed_at is null`)) === crew0 && sql(`select count(*) from lead_events where json_extract(detail, '$.id') = '${newId}'`) === '0', 'Undo: the row and its line taken away')
    ok(await p.getByTestId('contractor-gap').count() === nGaps, 'and the gap is back')
    await go(p, `/projects/${RYAN}/schedule`)
    ok(await p.getByTestId('schedule-crew').count() === 1, 'the Schedule’s toolbar: Contractors')

    // ── 4 · the project's Schedule ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · The project’s Schedule')
    const carp = p.getByTestId('milestone-name').filter({ hasText: 'Carpentry fabrication' })
    ok(/Woodcraft Carpentry on site/.test(await carp.innerText().catch(() => '')), 'a milestone row’s line names its crew')
    await p.getByTestId('schedule-crew').click(); await settle(p, 600)
    const panel = p.getByTestId('crew-panel')
    ok(await panel.getByTestId('crew-row').count() === Number(sql(`select count(*) from project_contractors where project_id = '${RYAN}' and removed_at is null`)), 'Contractors: every crew row on the project, by trade')
    await shot(p, '4-crew-panel-1440')
    const aqua = panel.getByTestId('crew-row').filter({ hasText: 'AquaFlow' })
    const aquaId = await aqua.getAttribute('data-crew')
    await aqua.getByTestId('crew-menu').click(); await settle(p, 300)
    await p.getByRole('menuitemradio', { name: /^Done/ }).click(); await settle(p, 1500)
    ok(sql(`select status from project_contractors where id = '${aquaId}'`) === 'done' && /is done with Plumbing/.test(await snackText(p)), 'Done: on record, its sentence')
    await undo(p)
    ok(sql(`select status from project_contractors where id = '${aquaId}'`) === 'on_site' && sql(`select count(*) from lead_events where kind = 'project_contractor_status' and json_extract(detail, '$.to') = 'Done'`) === '0', 'Undo: on site again, its line gone')
    const wood = p.getByTestId('crew-panel').getByTestId('crew-row').filter({ hasText: 'Woodcraft' }).first()
    const woodId = await wood.getAttribute('data-crew')
    await wood.getByTestId('crew-menu').click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /^Leader checked/ }).click(); await settle(p, 1500)
    ok(sql(`select checked_by from project_contractors where id = '${woodId}'`) === 'dane' && /Leader checked/.test(await snackText(p)), 'Leader checked (an Owner): stamped with who')
    ok(await p.getByTestId('crew-panel').getByTestId('crew-row').filter({ hasText: 'Woodcraft' }).first().getByTestId('crew-checked').count() === 1, 'the row says Leader checked by whom')
    await undo(p)
    ok(sql(`select ifnull(checked_by, '-') from project_contractors where id = '${woodId}'`) === '-', 'Undo: the check taken off')
    /* the dialog's own dates path: Add a contractor from the panel, on dates of their own, then Undo */
    await p.getByTestId('crew-panel-add').click(); await settle(p, 500)
    const cd2 = p.getByTestId('crew-dialog')
    await cd2.getByLabel('Trade').click(); await settle(p, 200)
    await p.getByRole('option', { name: 'Fittings', exact: true }).click().catch(async () => { await p.keyboard.type('Fittings'); await p.keyboard.press('Enter') })
    await settle(p, 300)
    await cd2.getByTestId('crew-choices').getByRole('radio').first().click()
    await cd2.getByLabel('Works on').click(); await settle(p, 200)
    await p.getByRole('option', { name: 'Its own dates' }).click(); await settle(p, 300)
    await p.getByTestId('crew-save').click(); await settle(p, 500)
    ok(/Choose the day they start/.test(await cd2.innerText()), 'own dates: both days are asked for')
    await shot(p, '4-own-dates-1440')
    await p.keyboard.press('Escape'); await settle(p, 400)
    await p.keyboard.press('Escape'); await settle(p, 400)
    /* the milestone panel's Contractors */
    await go(p, `/projects/${RYAN}/schedule`)
    await p.getByTestId('milestone-name').filter({ hasText: 'Carpentry fabrication' }).click(); await settle(p, 700)
    const pc = p.getByTestId('panel-crew')
    ok(await pc.count() === 1 && /Woodcraft/.test(await pc.innerText()) && await pc.getByTestId('panel-crew-add').count() === 1, 'the milestone panel lists its crew, with Add a contractor')
    await pc.scrollIntoViewIfNeeded().catch(() => {}); await shot(p, '4-milestone-panel-1440')
    /* Needs you: the gap's row lands on the dialog */
    await go(p, `/projects/${RYAN}`)
    if (await p.getByTestId('needs-more').count()) { await p.getByTestId('needs-more').first().click(); await settle(p, 300) }
    const need = p.getByRole('link', { name: 'Add a contractor' }).or(p.getByRole('button', { name: 'Add a contractor' }))
    ok(/No Painting contractor on Painting/.test(await p.locator('body').innerText()) && await need.count() >= 1, 'Needs you: the gap’s row, Add a contractor (the gap Undo put back)')
    if (await need.count()) {
      await need.first().click(); await p.waitForURL(/\/schedule/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
      ok(await p.getByTestId('crew-dialog').count() === 1 && /Painting/.test(await p.getByTestId('crew-dialog').innerText()), 'Add a contractor: the Schedule with the dialog open on the gap’s milestone and trade')
      await shot(p, '4-needs-you-dialog-1440')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }
    /* the Activity */
    await go(p, `/projects/${RYAN}/activity`)
    ok(/put .+ on .+ for /.test(await p.locator('body').innerText()), 'the project’s Activity says who put whom on')

    // ── a Designer on the team: the status, never the check ─────────────────────────────────────────────────────────────────────────
    as('michelle')
    await go(p, `/projects/${RYAN}/schedule?crew=1`)
    const mw = p.getByTestId('crew-panel').getByTestId('crew-row').filter({ hasText: 'Woodcraft' }).first()
    await mw.getByTestId('crew-menu').click(); await settle(p, 300)
    const chk = p.getByRole('menuitem', { name: /Leader checked/ })
    ok(await chk.count() === 1 && /Only an Owner, an Admin or a Manager marks a contractor’s work Leader checked/.test(await chk.innerText()), 'a Designer on the team: Leader checked says its rule in the row')
    ok(await p.getByRole('menuitemradio', { name: /^On site/ }).count() === 1, 'and she changes the status')
    await p.keyboard.press('Escape'); await settle(p, 200)
    as('germaine')
    await go(p, '/projects?view=workload')
    ok(await p.getByTestId('contractors-view').count() === 1 && await p.getByTestId('workload-of').count() === 0, 'a Designer (Germaine): the Contractors view, no Members chip')
    await go(p, '/dashboard')
    ok(await p.getByTestId('tile-contractors').count() === 0, 'and no Contractors tile on her Dashboard (the Workload view’s readers)')
    as('james')
    await go(p, '/dashboard')
    ok(await p.getByTestId('tile-contractors').count() === 1, 'a Manager (James): the Contractors tile')
    as('priya')
    await go(p, '/projects?view=workload&of=contractors')
    ok(await p.getByTestId('contractors-view').count() === 0, 'Accounting never opens the listing')
    as('dane')

    // ── 5 · ⌘K ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    await go(p, '/projects')
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type('contractors'); await settle(p, 900)
    ok(await p.getByRole('option', { name: /Contractors/ }).count() >= 1 || /Contractors/.test(await p.locator('[role="dialog"], [data-testid*="search"]').first().innerText().catch(() => '')), '⌘K finds Contractors')
    await p.keyboard.press('Escape')

    // ── width ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Width')
    const ph = await touch(); const m = await page(ph, 'phone')
    await go(m, '/projects?view=workload&of=contractors')
    ok(await m.getByTestId('contractors-view').count() === 1 && await sideways(m) <= 0, '390: the Contractors view, no sideways scroll')
    await shot(m, '5-contractors-390', true)
    await go(m, `/projects/${RYAN}/schedule?crew=1`); await settle(m, 900)
    ok(await m.getByTestId('crew-panel').count() === 1 && await sideways(m) <= 0, '390: the project’s Contractors as a sheet, no sideways scroll')
    await shot(m, '5-crew-sheet-390')
    /* the milestone panel's Contractors under a finger: the ⋮'s hit area stays inside the sheet (fix-B B-42's rule) */
    await go(m, `/projects/${RYAN}/schedule`)
    await m.locator('[data-testid="phone-milestone"]').filter({ hasText: 'Carpentry fabrication' }).first().click(); await settle(m, 1200)
    const over = await m.locator('[data-testid="milestone-panel"]').evaluate((el) => { let n = el; while (n && n.scrollWidth <= n.clientWidth + 1 && n.parentElement && !/sheet|drawer/i.test(n.className)) n = n.parentElement; return n ? n.scrollWidth - n.clientWidth : 0 })
    ok(await m.getByTestId('panel-crew').count() === 1 && over <= 1, `390: the milestone sheet’s Contractors, no sideways overflow (${over}px)`)
    await m.getByTestId('panel-crew').scrollIntoViewIfNeeded().catch(() => {}); await shot(m, '5-milestone-sheet-390')
    await go(m, `/company/finance/vendors?open=${WOOD}`)
    ok(await sideways(m) <= 0, '390: a contractor’s panel, no sideways scroll')
    await shot(m, '5-vendor-panel-390')
    await ph.close()
    const tab = await touch(768, 1024); const t = await page(tab, 'tablet')
    await go(t, '/projects?view=workload&of=contractors')
    ok(await sideways(t) <= 0, '768 touch: the Contractors view, no sideways scroll')
    await shot(t, '5-contractors-768')
    await tab.close()
    const d1025 = await b.newContext({ viewport: { width: 1025, height: 900 } }); const w = await page(d1025, 'desk1025')
    await go(w, `/projects/${RYAN}/schedule`)
    ok(await w.getByTestId('schedule-crew').isVisible() && await sideways(w) <= 0, '1025: the Schedule’s toolbar keeps Contractors, no sideways scroll')
    await shot(w, '5-schedule-1025')
    await go(w, '/projects?view=workload&of=contractors')
    ok(await sideways(w) <= 0, '1025: the Contractors view, no sideways scroll')
    await d1025.close()
    const p320 = await touch(320, 640); const s = await page(p320, 'phone320')
    await go(s, '/projects?view=workload&of=contractors'); ok(await sideways(s) <= 0, '320: no sideways scroll')
    await p320.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    restore(saved)
    sql(`update members set is_you = (id = '${you0}')`)
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    ok(stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'put back: every lead’s stage and the stage logs as found')
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
