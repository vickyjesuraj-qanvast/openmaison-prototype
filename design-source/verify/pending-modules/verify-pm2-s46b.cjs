// S46B — what a 1.0 user can't find, made findable (Vicky 2026-10-19: "Please go ahead and fix everything and make sure every pixel, feature
// and functionality is fixed", after the findability audit design-source/context/parity/31-findability-audit-2026-10-19/). Each item asserted
// as the rule it builds — never a literal demo date or a count from another round:
//  M1 · Tickets stays in the Projects ⋮ (REG-1425): New ticket on Projects › Tickets — the header's button opens "Which project is this ticket
//       for?" (the projects this member may not change kept, refused with the rule), then the project tab's own compose; the ticket lands on the
//       picked project and opens in the drawer; `?new=1` opens the picker, `&project=` the compose; the empty list's card carries New ticket.
//       The Dashboard's Tickets tile is the ⋮ row's count (and the DB's turn rule), a door with the way back. Accounting and Marketing: neither.
//  M6 · Complete handover in the project's ⋮, just before Delete — the Stage menu's Completed row: the same sheet, the same refusal in the row
//       (Setting up: "Start the project first"; a Designer off the team: the team rule), no row once completed, the same answer while on hold.
//  M7 · See it as {client} in the project's ⋮ beside Invite to Portal — the client's portal as them in a new tab; refused in the row for a member
//       off the team and once their access is withdrawn.
//  H3 · A client conversation's People and files: the client's number in their row, Call (copied at a desk, with the house sentence) and Copy,
//       for a project's and a lead's conversation; a team conversation has none.
//  M5 · Tools › Meeting Copilot: Insights (Owners and Admins) into Company › Reports › Meetings with Back to Meetings.
//  M8 · AI Visualizer: New ▾ › For a project… opens the project's lead's design ("Project · P-…"); the Kind pill's Projects once a design is one.
//  Widths: 390 touch shots of every new door, no sideways scroll at 390 / 320 (against screen.width); ghosts that draw what the page draws; no
//  page errors. Everything written is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s46b.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s46b')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name, got) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, got !== undefined ? `— ${String(got).slice(0, 220)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const TABLES = ['project_tickets', 'ticket_replies', 'lead_events', 'notifications', 'notification_outbox', 'settings', 'visualizer_designs', 'project_rooms', 'projects', 'homeowner_lead_links', 'portal_sessions']
const dump = () => Object.fromEntries(TABLES.map((t) => [t, execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" ".mode insert ${t}" "select * from ${t}"`, { maxBuffer: 256 * 1024 * 1024 }).toString()]))
const restore = (d) => {
  const file = path.join(os.tmpdir(), `s46b-restore-${process.pid}.sql`)
  fs.writeFileSync(file, `PRAGMA foreign_keys=OFF;\nBEGIN;\n${TABLES.map((t) => `DELETE FROM ${t};\n${d[t]}`).join('\n')}\nCOMMIT;\n`)
  execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${file}"`)
  fs.unlinkSync(file)
}
/** The studio's turn on a live ticket — lib/projects/tickets-model.ts `turnOf`, in SQL. */
const TO_ANSWER = `select count(*) from project_tickets t join projects p on p.id = t.project_id join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null and t.status in ('open','in_progress') and (t.last_studio_at is null or coalesce(t.last_client_at, t.created_at) > t.last_studio_at)`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const saved = dump()
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1200) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => (await l.innerText().catch(() => '')).replace(/\s+/g, ' ')
  const menuRows = async (p) => (await p.getByRole('menuitem').allInnerTexts()).map((x) => x.split('\n').map((s) => s.trim()).filter(Boolean))
  const kebab = async (p) => { await p.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await settle(p, 450) }
  const stageMenu = async (p) => { await p.locator('[data-testid="project-stage"] button').click(); await settle(p, 400) }
  /** A no-script first paint of the route: its loading.tsx ghost (the streamed HTML, scripts removed — ghosts-same's way). */
  const loader = async (ctx, url) => {
    const p = await ctx.newPage()
    await p.route((u) => u.href === BASE + url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
    await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await settle(p, 700)
    return p
  }

  const RYAN = sql(`select id from projects where number = 'P-2026-001'`)
  const BEN = sql(`select id from projects where number = 'P-2026-002'`)
  const AISHA = sql(`select id from projects where number = 'P-2026-003'`)
  const MARCUS = sql(`select id from projects where number = 'P-2026-004'`)
  const SHALINI = sql(`select id from projects where number = 'P-2025-001'`)
  const RYAN_LEAD = sql(`select lead_id from projects where id = '${RYAN}'`)
  const BEN_NAME = sql(`select name from projects where id = '${BEN}'`)
  const RYAN_NAME = sql(`select name from projects where id = '${RYAN}'`)
  const RYAN_PHONE = sql(`select phone from leads where id = '${RYAN_LEAD}'`).replace(/\D/g, '').slice(-8)
  const local = `${RYAN_PHONE.slice(0, 4)} ${RYAN_PHONE.slice(4)}`
  const SUBJECT = `S46B probe — cabinet hinge loose ${Date.now() % 100000}`

  try {
    // ── M1 · Projects › Tickets: New ticket, and the count you can see ─────────────────────────────────────────────────────────────
    console.log('M1 · New ticket on Projects › Tickets')
    as('dane')
    /* a client's word newer than the studio's on one live ticket — the studio's turn, so the count is not nothing */
    const T2 = sql(`select id from project_tickets where project_id = '${RYAN}' and status in ('open','in_progress') limit 1`)
    if (T2) sql(`update project_tickets set last_client_at = ${Date.now() - 3600_000}, last_studio_at = ${Date.now() - 7200_000} where id = '${T2}'`)
    const toAnswer = Number(sql(TO_ANSWER))
    const ctx = await desk(); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
    const p = await page(ctx, 'desk')
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own, as Tasks is — her ask 2026-10-19): the ⋮ row is gone; the rail's Tickets wears the count */
    await go(p, '/projects')
    await p.getByTestId('projects-kebab').click(); await settle(p, 400)
    const row = (await menuRows(p)).find((r) => r[0].startsWith('Tickets'))
    await p.keyboard.press('Escape'); await settle(p, 300)
    const railItem = p.locator('[class*="app-rail-module__"] a[href^="/tickets"]')
    const rowCount = Number((((await railItem.innerText().catch(() => '')) || '').match(/\d+/) ?? ['0'])[0])
    ok(!row && await railItem.count() === 1 && rowCount === toAnswer && (toAnswer === 0 || new RegExp(`Tickets \\(${toAnswer} waiting\\)`).test((await railItem.getAttribute('aria-label')) ?? '')), `the rail carries Tickets after Tasks, its count the tickets waiting on the studio (${rowCount} = ${toAnswer}); the Projects ⋮ has no Tickets row`, (await railItem.getAttribute('aria-label')) ?? '')
    const railOrder = await p.locator('[class*="app-rail-module__"] a[href]').evaluateAll((as) => as.map((a) => new URL(a.href).pathname))
    ok(railOrder.indexOf('/tickets') === railOrder.indexOf('/tasks') + 1, 'Tickets sits right after Tasks', railOrder.join(' · '))

    await go(p, '/tickets')
    const newBtn = p.getByTestId('studio-new-ticket')
    ok(await newBtn.count() === 1 && /New ticket/.test(await text(newBtn)), 'the header carries New ticket (an Owner may raise one on any project)')
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own, as Tasks is) */
    ok(await p.locator('header a[data-kb="back"]').count() === 0 && /^Tickets$/.test((await text(p.locator('main h1, header h1').first())).trim()), 'an L1 page: “Tickets”, no Back')
    await shot(p, 'm1-tickets-1440')
    await newBtn.click(); await settle(p, 700)
    const pick = p.getByRole('dialog', { name: 'Which project is this ticket for?' })
    ok(await pick.isVisible(), 'New ticket asks which project first')
    await pick.getByRole('combobox').click(); await settle(p, 300)
    const options = await p.getByRole('option').allInnerTexts()
    const projectsSeen = Number(sql(`select count(*) from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null`))
    ok(options.length === projectsSeen && options.every((o) => / · P-\d{4}-\d{3}$/.test(o.trim())), `every project an Owner sees, each with its number (${options.length})`, options.join(' | '))
    await shot(p, 'm1-pick-1440')
    await p.getByRole('option', { name: `${BEN_NAME} · P-2026-002` }).click(); await settle(p, 200)
    await pick.getByRole('button', { name: 'Continue' }).click(); await settle(p, 700)
    const compose = p.getByRole('dialog', { name: 'New ticket' })
    ok(await compose.isVisible() && /For Benjamin Han — they see it on their page/.test(await text(compose)), 'then the project tab’s own compose, for its client')
    await compose.getByRole('combobox').first().click(); await settle(p, 250)
    const cat = (await p.getByRole('option').allInnerTexts())[0]?.trim()
    await p.getByRole('option', { name: cat, exact: true }).click(); await settle(p, 200)
    await compose.getByLabel(/^Subject/).fill(SUBJECT)
    await shot(p, 'm1-compose-1440')
    await compose.getByTestId('new-ticket-save').click(); await settle(p, 2200)
    const made = sql(`select id || '|' || project_id || '|' || raised_kind || '|' || raised_by_id || '|' || number from project_tickets where subject = '${SUBJECT}'`).split('|')
    ok(made[1] === BEN && made[2] === 'studio' && made[3] === 'dane', 'the ticket lands on the picked project, raised by the studio — Dane', made.join(' · '))
    ok(new RegExp(`${made[4]} added — Benjamin sees it on their page`).test(await snackText(p)), 'the tab’s own sentence', await snackText(p))
    const drawer = p.getByRole('dialog', { name: `Ticket ${made[4]}` })
    ok(await drawer.isVisible() && new RegExp(SUBJECT).test(await text(drawer)), 'and it opens in the drawer')
    ok(!(await compose.isVisible().catch(() => false)), 'the compose closed once the save landed')
    await shot(p, 'm1-made-1440')
    await p.keyboard.press('Escape'); await settle(p, 500)
    ok(await p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`).count() === 1 && new RegExp(`P-2026-002`).test(await text(p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`))), 'its card on the list names its project')
    await go(p, `/projects/${BEN}/tickets`)
    ok(await p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`).count() === 1, '…and it is on the project’s own Tickets tab')

    console.log('M1 · ?new=1 and &project=')
    await go(p, '/tickets?new=1', 1400)
    ok(await p.getByRole('dialog', { name: 'Which project is this ticket for?' }).isVisible() && !/new=1/.test(p.url()), '?new=1 opens the picker, and the address loses the mark')
    await p.keyboard.press('Escape'); await settle(p, 400)
    await go(p, `/tickets?new=1&project=${RYAN}`, 1400)
    ok(/For Ryan D’Souza/.test(await text(p.getByRole('dialog', { name: 'New ticket' }))), '&project= goes straight to that project’s compose')
    await p.keyboard.press('Escape'); await settle(p, 400)

    console.log('M1 · the Dashboard tile')
    const toAnswer2 = Number(sql(TO_ANSWER))
    await go(p, '/dashboard', 1800)
    const tile = p.getByTestId('tile-tickets')
    const tileVal = Number((await tile.locator('[class*="__value"]').innerText()).trim())
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — her ask 2026-10-19): the count the ⋮ row wore is the rail item's badge now */
    const railTickets = p.locator('[class*="app-rail-module__"] a[href^="/tickets"]')
    const rowCount2 = Number((((await railTickets.innerText().catch(() => '')) || '').match(/\d+/) ?? ['0'])[0])
    ok(tileVal === rowCount2 && tileVal === toAnswer2, `the tile is the rail’s Tickets count (${tileVal} = ${rowCount2} = DB ${toAnswer2})`)
    const open = Number(sql(`select count(*) from project_tickets t join projects p on p.id = t.project_id where p.deleted_at is null and t.status in ('open','in_progress')`))
    await go(p, '/dashboard', 1800)
    const help = await text(tile.locator('[class*="__help"]'))
    ok(toAnswer2 ? new RegExp(`^waiting on you( · ${open} open)?`).test(help) : new RegExp(`^Nothing waits on you · ${open} open`).test(help), `its line: whose turn and how many are open (${help})`)
    ok(await tile.getAttribute('data-grade') === null && await p.locator('[data-testid="stands-tiles"] [data-grade]').count() === 0, 'no colour on it — red is the project’s Needs you’s')
    await shot(p, 'm1-dashboard-1440', true)
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — her ask 2026-10-19): an L1 page, the rail's Tickets lit — no Back, as Tasks has none */
    await tile.click(); await p.waitForURL(/\/tickets/, { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
    ok(new URL(p.url()).pathname === '/tickets' && await p.getByTestId('studio-tickets').isVisible(), 'the tile opens Tickets', p.url())
    ok(await p.locator('header a[data-kb="back"]').count() === 0 && await railTickets.getAttribute('aria-current') === 'page', 'Tickets is a rail place: no Back, the rail’s Tickets lit')
    await go(p, '/dashboard', 1800)   // the tile count below is the Dashboard's
    /* the loader draws the tile too */
    const gctx = await desk({ reducedMotion: 'reduce' }); const gl = await loader(gctx, '/dashboard')
    const ghostTiles = await gl.locator('[class*="standTiles"]').first().locator('> *').count()   // the loader comes first in the streamed page
    await gctx.close()
    ok(ghostTiles === await p.locator('[data-testid="stands-tiles"] > *').count(), `the Dashboard’s ghost draws as many tiles as the page (${ghostTiles})`)

    console.log('M1 · roles')
    as('germaine')
    await go(p, '/tickets')
    ok(await p.getByTestId('studio-new-ticket').count() === 1, 'germaine (Designer, on two projects’ teams): New ticket')
    await p.getByTestId('studio-new-ticket').click(); await settle(p, 600)
    const gpick = p.getByRole('dialog', { name: 'Which project is this ticket for?' })
    await gpick.getByRole('combobox').click(); await settle(p, 300)
    const gopts = (await p.getByRole('option').allInnerTexts()).map((x) => x.trim())
    const mine = sql(`select group_concat(p.number, ',') from projects p join lead_assignees a on a.lead_id = p.lead_id where a.member_id = 'germaine' and p.deleted_at is null`).split(',').filter(Boolean)
    ok(mine.every((n) => gopts.slice(0, mine.length).some((o) => o.endsWith(n))), `her own projects first (${mine.join(', ')})`, gopts.join(' | '))
    await p.getByRole('option', { name: `${RYAN_NAME} · P-2026-001` }).click(); await settle(p, 300)
    ok(/can’t be picked — only the project’s team, their Managers, Owners and Admins change a project/.test(await text(gpick)) && await gpick.getByRole('button', { name: 'Continue' }).isDisabled(), 'a project she isn’t on stays in the list, refused with the rule')
    await shot(p, 'm1-germaine-refused-1440')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, '/dashboard', 1800)
    ok(await p.getByTestId('tile-tickets').count() === 1, 'germaine: the Tickets tile is hers too (she opens projects)')
    for (const who of ['priya', 'nurul']) {
      as(who)
      await go(p, '/dashboard', 1600)
      ok(await p.getByTestId('tile-tickets').count() === 0, `${who}: no Tickets tile — no project is theirs`)
      await go(p, '/tickets', 1200)
      ok(await p.getByTestId('studio-tickets').count() === 0 && await p.getByTestId('studio-new-ticket').count() === 0, `${who}: Projects › Tickets is not theirs`)
    }
    as('dane')

    console.log('M1 · the empty list')
    /* every project holding a ticket put aside for a moment: the list's first run, its card carrying New ticket; its ghost the same card */
    const holding = sql(`select group_concat(distinct project_id) from project_tickets`).split(',').filter(Boolean)
    sql(`update projects set deleted_at = ${Date.now()} where id in (${holding.map((x) => `'${x}'`).join(',')})`)
    await go(p, '/tickets')
    const empty = p.getByTestId('studio-tickets-empty')
    ok(await empty.isVisible() && await empty.getByTestId('studio-new-ticket').count() === 1 && await p.locator('header').getByTestId('studio-new-ticket').count() === 0, 'no ticket yet: the empty card carries New ticket, the header steps back')
    await shot(p, 'm1-empty-1440')
    const ectx = await desk({ reducedMotion: 'reduce' }); const el = await loader(ectx, '/tickets')
    ok(await el.locator('[aria-label="Loading tickets"]').first().locator('[data-tone="first"]').count() === 1, 'its loader draws the first-run card (the seed’s studio-tickets)')
    await ectx.close()
    sql(`update projects set deleted_at = null where id in (${holding.map((x) => `'${x}'`).join(',')})`)
    /* and the full list's loader draws the header's button */
    const fctx = await desk({ reducedMotion: 'reduce' }); const fl = await loader(fctx, '/tickets')
    ok(await fl.locator('[aria-label="Loading tickets"]').first().locator('[class*="headActions"] > *').count() === 1, 'the list’s loader draws the header’s New ticket')
    await fctx.close()

    // ── M6 · M7 · the project's ⋮ ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('M6 · M7 · the project’s ⋮')
    await go(p, `/projects/${RYAN}`, 1500)
    await kebab(p)
    const rows = (await menuRows(p)).map((r) => r[0])
    ok(rows.indexOf('See it as Ryan') === rows.indexOf('Invite to Portal') + 1, 'See it as Ryan sits beside Invite to Portal', rows.join(' · '))
    ok(rows.indexOf('Complete handover') === rows.length - 2 && rows[rows.length - 1] === 'Delete', 'Complete handover just before Delete (1.0’s Close project)', rows.join(' · '))
    await shot(p, 'm6-menu-1440')
    await p.getByRole('menuitem', { name: 'Complete handover' }).click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 10000 }).catch(() => {}); await settle(p, 800)
    ok(await p.getByRole('dialog', { name: 'Complete handover' }).isVisible() && await p.getByTestId('handover-checklist').isVisible(), 'it opens the Hand over sheet — the Stage menu’s own')
    await shot(p, 'm6-handover-1440')
    await p.keyboard.press('Escape'); await settle(p, 500)
    await kebab(p)
    const [pv] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.getByRole('menuitem', { name: 'See it as Ryan' }).click()])
    await pv.waitForLoadState('networkidle').catch(() => {}); await settle(pv, 1500)
    ok(/\/my\//.test(pv.url()) && await pv.locator('[data-testid="portal-preview-bar"]').isVisible() && /Ryan/.test(await text(pv.locator('main'))), 'See it as Ryan opens his portal as him, as a preview', pv.url())
    await shot(pv, 'm7-preview-1440')
    await pv.close()

    /* the same answer as the Stage menu's Completed row, project by project */
    const sameAsStage = async (id, label) => {
      await go(p, `/projects/${id}`, 1500)
      await stageMenu(p)
      const st = (await menuRows(p)).find((r) => r[0] === 'Completed') ?? null
      const stDisabled = st ? await p.getByRole('menuitem', { name: /^Completed/ }).getAttribute('aria-disabled') === 'true' : null
      await p.keyboard.press('Escape'); await settle(p, 300)
      await kebab(p)
      const mine2 = (await menuRows(p)).find((r) => /^(Complete handover|Review the handover)$/.test(r[0])) ?? null
      const myDisabled = mine2 ? await p.getByRole('menuitem', { name: /^(Complete handover|Review the handover)/ }).getAttribute('aria-disabled') === 'true' : null
      await p.keyboard.press('Escape'); await settle(p, 300)
      return { st, stDisabled, mine: mine2, myDisabled, label }
    }
    const marcus = await sameAsStage(MARCUS, 'Setting up')
    ok(marcus.myDisabled === true && marcus.mine?.[1] === 'Start the project first' && marcus.stDisabled === true && marcus.st?.[1] === marcus.mine?.[1], 'Setting up: refused in the row — “Start the project first”, the Stage menu’s own words', JSON.stringify(marcus))
    const aisha = await sameAsStage(AISHA, 'On hold')
    ok(aisha.mine && aisha.myDisabled === aisha.stDisabled && (aisha.mine[1] ?? null) === (aisha.st?.[1] ?? null), `On hold: the Stage menu’s answer exactly (${aisha.myDisabled ? `refused — ${aisha.mine[1]}` : 'open: a hold ends with the project'})`, JSON.stringify(aisha))
    await go(p, `/projects/${SHALINI}`, 1500); await kebab(p)
    ok(!(await menuRows(p)).some((r) => /^(Complete handover|Review the handover)$/.test(r[0])), 'a completed project: no Complete handover row')
    await p.keyboard.press('Escape'); await settle(p, 300)
    as('germaine')
    const off = await sameAsStage(RYAN, 'off the team')
    ok(off.myDisabled === true && off.mine?.[1] === off.st?.[1] && /team, Owners or Admins/.test(off.mine?.[1] ?? ''), 'germaine off Ryan’s team: refused with the Stage menu’s rule', JSON.stringify(off))
    await go(p, `/projects/${RYAN}`, 1500); await kebab(p)
    const seeOff = (await menuRows(p)).find((r) => r[0] === 'See it as Ryan')
    ok(seeOff && /team, Owners or Admins/.test(seeOff[1] ?? '') && await p.getByRole('menuitem', { name: /^See it as Ryan/ }).getAttribute('aria-disabled') === 'true', 'See it as Ryan: refused in the row for a member off the team', JSON.stringify(seeOff))
    await shot(p, 'm7-refused-1440')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, `/projects/${BEN}`, 1500); await kebab(p)
    ok(await p.getByRole('menuitem', { name: /^See it as Benjamin/ }).getAttribute('aria-disabled') !== 'true' && await p.getByRole('menuitem', { name: /^Complete handover/ }).getAttribute('aria-disabled') !== 'true', 'germaine on Benjamin’s team: both rows open')
    await p.keyboard.press('Escape'); await settle(p, 300)
    as('dane')
    sql(`update homeowner_lead_links set withdrawn_at = ${Date.now()} where lead_id = '${RYAN_LEAD}'`)
    await go(p, `/projects/${RYAN}`, 1500); await kebab(p)
    const seeW = (await menuRows(p)).find((r) => r[0] === 'See it as Ryan')
    ok(seeW && seeW[1] === 'Ryan can no longer open the portal', 'access withdrawn: See it as is refused in the row, in the panel’s words', JSON.stringify(seeW))
    await p.keyboard.press('Escape'); await settle(p, 300)
    sql(`update homeowner_lead_links set withdrawn_at = null where lead_id = '${RYAN_LEAD}'`)
    await go(p, '/projects', 1300)
    const ryanRow = p.locator('button[aria-label^="More actions for"][aria-label*="Ryan"]').first()
    if (await ryanRow.count()) {
      await ryanRow.hover().catch(() => {}); await ryanRow.click({ force: true }); await settle(p, 400)
      const lrows = (await menuRows(p)).map((r) => r[0])
      ok(lrows.indexOf('Complete handover') === lrows.length - 2, 'the listing’s row menu: Complete handover before Delete too (REG-925: the same items wherever)', lrows.join(' · '))
      await p.getByRole('menuitem', { name: 'Complete handover' }).click(); await settle(p, 1200)
      ok(await p.getByRole('dialog', { name: 'Complete handover' }).isVisible(), '…and it opens the same sheet from the listing')
      await p.keyboard.press('Escape'); await settle(p, 400)
    }

    // ── H3 · the client's number in a conversation ─────────────────────────────────────────────────────────────────────────────────
    console.log('H3 · Call the client from a conversation')
    await go(p, `/chat?open=${encodeURIComponent(`project:${RYAN}`)}`, 1800)
    await p.getByTestId('conversation-details').first().click(); await settle(p, 900)
    ok((await text(p.getByTestId('details-client-meta'))) === `Client · ${local}`, `the client’s row: Client · ${local}`, await text(p.getByTestId('details-client-meta')))
    await p.getByTestId('details-call').click(); await settle(p, 600)
    const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    ok(clip === `+65 ${local}` && new RegExp(`Ryan’s number, \\+65 ${local}, is copied — call from your phone`).test(await snackText(p)), 'Call at a desk: the number copied, and the snackbar says to call from a phone', `${clip} / ${await snackText(p)}`)
    await shot(p, 'h3-details-1440')
    await p.evaluate(() => navigator.clipboard.writeText(''))
    await p.getByTestId('details-copy-phone').click(); await settle(p, 500)
    ok(await p.evaluate(() => navigator.clipboard.readText()).catch(() => '') === `+65 ${local}` && /Copied to clipboard/.test(await snackText(p)), 'Copy: the house copy format and words')
    await p.keyboard.press('Escape'); await settle(p, 400)
    const KEVIN = sql(`select id from leads where name = 'Kevin Ng' and deleted_at is null limit 1`)
    await go(p, `/chat?open=${encodeURIComponent(`lead:${KEVIN}`)}`, 1800)
    await p.getByTestId('conversation-details').first().click(); await settle(p, 900)
    ok(/^Client · \d{4} \d{4}$/.test(await text(p.getByTestId('details-client-meta'))) && await p.getByTestId('details-call').count() === 1, 'a lead’s conversation: the same row')
    await p.keyboard.press('Escape'); await settle(p, 400)
    await go(p, `/chat?open=${encodeURIComponent(`team:${RYAN}`)}`, 1800)
    if (await p.getByTestId('conversation-details').count()) {
      await p.getByTestId('conversation-details').first().click(); await settle(p, 900)
      ok(await p.getByTestId('details-call').count() === 0, 'a Team conversation: no client, no number')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── M5 · Meeting Copilot's Insights ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('M5 · Tools › Meeting Copilot › Insights')
    await go(p, '/meetings', 1500)
    const ins = p.getByTestId('open-insights')
    ok(await ins.count() === 1 && /Insights/.test(await text(ins)), 'the Leads and Projects listings’ Insights door, after New Meeting')
    await shot(p, 'm5-meetings-1440')
    await ins.click(); await p.waitForURL(/\/company\/reports\/meetings/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
    ok(new URL(p.url()).searchParams.get('from') === '/meetings', 'it opens Company › Reports › Meetings with the way back', p.url())
    const back = p.locator('header').getByRole('link', { name: 'Back to Meetings' })
    ok(await back.count() === 1 && /Meetings \/ Company \//.test(await text(p.locator('header:has(a[data-kb="back"])').first())), 'Back to Meetings; the crumb “Meetings / Company / Reports”')
    await shot(p, 'm5-reports-1440')
    await back.click(); await p.waitForURL(/\/meetings$/, { timeout: 10000 }).catch(() => {}); await settle(p, 900)
    ok(new URL(p.url()).pathname === '/meetings', 'Back returns to Meeting Copilot')
    const mctx = await desk({ reducedMotion: 'reduce' }); const ml = await loader(mctx, '/meetings')
    ok(await ml.locator('[aria-label="Loading meetings"]').first().locator('[class*="headActions"] > *').count() === 2, 'its loader draws New Meeting and Insights')
    await mctx.close()
    as('germaine')
    await go(p, '/meetings', 1300)
    ok(await p.getByTestId('open-insights').count() === 0, 'germaine: no Insights — Reports › Meetings is Owners’ and Admins’')
    as('dane')

    // ── M8 · AI Visualizer by project ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('M8 · AI Visualizer: For a project… and Projects')
    const designs0 = Number(sql(`select count(*) from visualizer_designs`))
    await go(p, '/visualizer', 1500)
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 300)
    ok(await p.getByRole('menuitemradio', { name: /^Projects/ }).count() === 0 && await p.getByRole('menuitemradio', { name: /^Leads/ }).count() === 1, 'no project’s design yet: the Kind pill offers no Projects (shown when it applies)')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await p.getByRole('button', { name: 'New', exact: true }).click(); await settle(p, 400)
    const vrows = (await menuRows(p)).map((r) => r[r.length - 1])   // each row: its glyph's ligature, then its words
    ok(vrows.indexOf('For a project…') === vrows.indexOf('For a lead…') + 1, 'New ▾: For a project… after For a lead…', vrows.join(' · '))
    await shot(p, 'm8-new-1440')
    await p.getByRole('menuitem', { name: 'For a project…' }).click(); await settle(p, 600)
    const vpick = p.getByRole('dialog', { name: 'Design for a project' })
    await vpick.getByRole('combobox').click(); await settle(p, 300)
    await p.getByRole('option', { name: new RegExp(`^${RYAN_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · P-2026-001`) }).click(); await settle(p, 200)
    await vpick.getByRole('button', { name: 'Open design' }).click()
    await p.waitForURL(/\/visualizer\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {}); await settle(p, 2000)
    const D = (p.url().split('/visualizer/')[1] ?? '').split(/[?#/]/)[0]
    ok(sql(`select kind || '|' || lead_id from visualizer_designs where id = '${D}'`) === `lead|${RYAN_LEAD}` && Number(sql(`select count(*) from visualizer_designs`)) === designs0 + 1, 'For a project… opens the project’s lead’s design (made on first open)')
    ok(/Project · P-2026-001/i.test(await text(p.locator('body'))), 'the editor names it the project’s: “Project · P-2026-001”')
    await shot(p, 'm8-editor-1440')
    /* a room on it, so the landing shows it (a lead's design shows once it has a room) */
    const R0 = sql(`select id from project_rooms where deleted_at is null and design_id = (select id from visualizer_designs where name = 'Kevin Ng' or lead_id = (select id from leads where name = 'Kevin Ng') limit 1) limit 1`)
    sql(`create temp table s46b as select * from project_rooms where id = '${R0}'; update s46b set id = 's46b-room', design_id = '${D}'; insert into project_rooms select * from s46b;`)
    await go(p, '/visualizer', 1500)
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 300)
    const kinds = (await p.getByRole('menuitemradio').allInnerTexts()).map((x) => x.split(/\s·\s|\n/)[0].trim())
    ok(kinds.slice(0, 4).join(' · ') === 'All · Projects · Leads · Personal', `the Kind pill: Projects · Leads · Personal, the planner’s order (${kinds.join(' · ')})`)
    await p.getByRole('menuitemradio', { name: /^Projects/ }).click(); await settle(p, 600)
    const vmain = await text(p.locator('main'))
    ok(/Ryan D’Souza/.test(vmain) && /P-2026-001/.test(vmain) && !/Kevin Ng/.test(vmain), 'Kind: Projects — Ryan’s design with its number; Kevin Ng (a lead still) under Leads', vmain.slice(0, 200))
    await shot(p, 'm8-projects-1440')
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 250); await p.getByRole('menuitemradio', { name: /^Leads/ }).click(); await settle(p, 500)
    const lmain = await text(p.locator('main'))
    ok(/Kevin Ng/.test(lmain) && !/Ryan D’Souza/.test(lmain), 'Kind: Leads keeps the designs whose lead is still a lead')
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 250); await p.getByRole('menuitemradio', { name: /^All/ }).click(); await settle(p, 500)
    ok(/Project · P-2026-001/.test(await text(p.locator('main'))), 'under All its line says “Project · P-2026-001”')
    as('germaine')
    await go(p, '/visualizer', 1500)
    await p.getByRole('button', { name: 'New', exact: true }).click(); await settle(p, 400)
    ok(await p.getByRole('menuitem', { name: 'For a project…' }).count() === 1, 'germaine: For a project… too (a design is any member’s)')
    await p.keyboard.press('Escape'); await settle(p, 300)
    as('dane')

    // ── 390 touch · 320 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390 · 320')
    const ph = await touch(); await ph.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }); const q = await page(ph, 'phone')
    await go(q, '/tickets', 1500)
    ok(await q.getByRole('button', { name: 'New ticket' }).count() === 1 && await sideways(q) <= 0, '390: New ticket as the header’s square, no sideways scroll', `${await sideways(q)}px`)
    await shot(q, 'm1-tickets-390')
    await q.getByRole('button', { name: 'New ticket' }).click(); await settle(q, 900)
    ok(await q.getByRole('dialog', { name: 'Which project is this ticket for?' }).isVisible() && await sideways(q) <= 0, '390: the picker as a sheet')
    await shot(q, 'm1-pick-390')
    await q.getByRole('dialog', { name: 'Which project is this ticket for?' }).getByRole('combobox').click(); await settle(q, 400)
    await q.getByRole('option', { name: `${BEN_NAME} · P-2026-002` }).click(); await settle(q, 300)
    await q.getByRole('button', { name: 'Continue' }).click(); await settle(q, 900)
    ok(await q.getByRole('dialog', { name: 'New ticket' }).isVisible() && await sideways(q) <= 0, '390: the compose as a sheet')
    await shot(q, 'm1-compose-390')
    await q.keyboard.press('Escape'); await settle(q, 500)
    await go(q, '/dashboard', 1800)
    await q.getByTestId('tile-tickets').scrollIntoViewIfNeeded(); await settle(q, 300)
    ok(await q.getByTestId('tile-tickets').isVisible() && await sideways(q) <= 0, '390: the Tickets tile')
    await q.getByTestId('tile-tickets').screenshot({ path: path.join(dir, 'm1-tile-390.png') }).catch(() => {})
    await shot(q, 'm1-dashboard-390', true)
    await go(q, `/projects/${RYAN}`, 1600)
    await q.locator('[data-testid="project-page"] header').getByRole('button', { name: 'More options' }).click(); await settle(q, 700)
    const qrows = (await menuRows(q)).map((r) => r[0])
    ok(qrows.includes('See it as Ryan') && qrows.indexOf('Complete handover') === qrows.length - 2 && await sideways(q) <= 0, '390: the ⋮ sheet carries See it as Ryan and Complete handover', qrows.join(' · '))
    await q.getByRole('menuitem', { name: 'Delete' }).scrollIntoViewIfNeeded().catch(() => {}); await settle(q, 300)
    await shot(q, 'm6-menu-390')
    await q.getByRole('menuitem', { name: 'Complete handover' }).click(); await q.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }).catch(() => {}); await settle(q, 1000)
    ok(await q.getByTestId('handover-checklist').isVisible() && await sideways(q) <= 0, '390: the Hand over sheet from ⋮')
    await q.keyboard.press('Escape'); await settle(q, 500)
    await go(q, `/chat?open=${encodeURIComponent(`project:${RYAN}`)}`, 1800)
    await q.getByTestId('conversation-details').first().click(); await settle(q, 900)
    ok(await q.getByTestId('details-call').isVisible() && await sideways(q) <= 0, '390: Call and Copy in the client’s row')
    await shot(q, 'h3-details-390')
    await q.getByTestId('details-call').click(); await settle(q, 600)
    ok(!/is copied — call from your phone/.test(await snackText(q)), 'on a touch screen Call dials — it never says “copied”')
    await go(q, '/meetings', 1500)
    ok(await q.getByRole('button', { name: 'Insights' }).count() === 1 && await sideways(q) <= 0, '390: Insights as the header’s square')
    await shot(q, 'm5-meetings-390')
    await go(q, '/visualizer', 1500)
    await q.getByRole('button', { name: 'New', exact: true }).click().catch(async () => { await q.getByRole('button', { name: /^New/ }).first().click() }); await settle(q, 700)
    ok(await q.getByRole('menuitem', { name: 'For a project…' }).count() === 1 && await sideways(q) <= 0, '390: New ▾ sheet with For a project…')
    await shot(q, 'm8-new-390')
    await ph.close()
    const narrow = await touch(320, 700); const n = await page(narrow, '320')
    for (const u of ['/tickets', '/meetings', '/dashboard', `/projects/${RYAN}`]) {
      await go(n, u, 1400)
      ok(await sideways(n) <= 0, `320: ${u} — no sideways scroll`, `${await sideways(n)}px`)
    }
    await narrow.close()
    await ctx.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).split('\n')[0])
  } finally {
    restore(saved)
    sql(`update members set is_you = (id = '${you0}')`)
    ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the DB is as it was (stages, stage logs)')
    await b.close()
    console.log(`\n${pass} ok · ${fail} fail`)
    process.exit(fail ? 1 : 0)
  }
})()
