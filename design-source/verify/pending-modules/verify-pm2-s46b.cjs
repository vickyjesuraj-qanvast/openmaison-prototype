// S46B — what a 1.0 user can't find, made findable (Vicky 2026-10-19: "Please go ahead and fix everything and make sure every pixel, feature
// and functionality is fixed", after the findability audit design-source/context/parity/31-findability-audit-2026-10-19/). Each item asserted
// as the rule it builds — never a literal demo date or a count from another round:
//  M1 · Tickets stays in the Projects ⋮ (REG-1425): New ticket on Projects › Tickets — the header's button opens "Which project is this ticket
//       for?" (the projects this member may not change kept, refused with the rule), then the project tab's own compose; the ticket lands on the
//       picked project and opens in the drawer; `?new=1` opens the picker, `&project=` the compose; the empty list's card carries New ticket.
//       (Dane's Tickets review, merged 2026-10-28) New issue is ONE form, Project its first field (only the projects this member may raise on —
//       the select can't grey one); a pick names its client; Assigned to offers only who can work on the project (Owners and Admins before a
//       pick) and lets go of a pick the next project can't take; `?new=1` opens the form with no project, `&project=` with it filled. At 390 the
//       scope is one pill over an "Issue status" sheet, and the open search has the row (the pill steps aside).
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
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own, as Tasks is — his ask 2026-10-19): the ⋮ row is gone; the rail's Tickets wears the count */
    await go(p, '/projects')
    await p.getByTestId('projects-kebab').click(); await settle(p, 400)
    const row = (await menuRows(p)).find((r) => r[0].startsWith('Tickets'))
    await p.keyboard.press('Escape'); await settle(p, 300)
    const railItem = p.locator('[class*="app-rail-module__"] a[href^="/tickets"]')
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-04 · 1-10) the rail says Issues, no number on the glyph — the count is its accessible name, "Issues (n waiting)";
       (Vicky 2026-10-29: brought back) its mark is the red dot every navigation count wears (the calm build drew it grey) */
    const railLabel = (await railItem.getAttribute('aria-label').catch(() => '')) ?? ''
    const rowCount = Number((/\((\d+) waiting\)/.exec(railLabel) ?? ['', '0'])[1])
    const redDot = await railItem.locator('[class*="__badgeDot"][data-badge="dot"]').count()
    ok(!row && await railItem.count() === 1 && rowCount === toAnswer && (toAnswer === 0 ? redDot === 0 : new RegExp(`^Issues \\(${toAnswer} waiting\\)`).test(railLabel) && redDot === 1), `the rail carries Tickets after Tasks, its count the tickets waiting on the studio (${rowCount} = ${toAnswer}); the Projects ⋮ has no Tickets row`, (await railItem.getAttribute('aria-label')) ?? '')
    const railOrder = await p.locator('[class*="app-rail-module__"] a[href]').evaluateAll((as) => as.map((a) => new URL(a.href).pathname))
    ok(railOrder.indexOf('/tickets') === railOrder.indexOf('/tasks') + 1, 'Tickets sits right after Tasks', railOrder.join(' · '))

    await go(p, '/tickets')
    const newBtn = p.getByTestId('studio-new-ticket')
    ok(await newBtn.count() === 1 && /New issue/.test(await text(newBtn)), 'the header carries New issue (an Owner may raise one on any project)')   // (the calm UI build 2026-10-27, a deliberate change) "Issues" on screen (3-37)
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own, as Tasks is) */
    ok(await p.locator('header a[data-kb="back"]').count() === 0 && /^Issues$/.test((await text(p.locator('main h1, header h1').first())).trim()), 'an L1 page: “Issues”, no Back')   // (the calm UI build 2026-10-27, a deliberate change)
    await shot(p, 'm1-tickets-1440')
    await newBtn.click(); await settle(p, 700)
    /* (Dane's Tickets review, merged 2026-10-28) the picker and the compose are one form: "Which project is this issue for?" is its first field */
    const compose = p.getByRole('dialog', { name: 'New issue' })
    const comboNames = async () => (await compose.getByRole('combobox').evaluateAll((els) => els.map((e) => (document.getElementById(e.getAttribute('aria-labelledby') ?? '')?.textContent ?? '').trim())))
    ok(await compose.isVisible() && /^Project/.test((await comboNames())[0] ?? '') && /The project’s client sees it on their page/.test(await text(compose)), 'New issue asks which project first — the form’s first field, the subtitle the client’s in general', (await comboNames()).join(' | '))   // (Dane's Tickets review, merged 2026-10-28)
    const projectBox = compose.getByRole('combobox', { name: /^Project/ })
    const assignBox = compose.getByRole('combobox', { name: /^Assigned to/ })
    /* who may be given it: active, on projects, and able to work on the project — Owners and Admins, its team, the Managers of its team (`mayTakeTicket`) */
    const takersOf = (number) => sql(`select group_concat(name, '|') from (select m.name from members m where m.is_active = 1 and m.role not in ('Accounting','Marketing') and (m.role in ('Owner','Admin')${number ? ` or m.id in (select a.member_id from lead_assignees a join projects p on p.lead_id = a.lead_id where p.number = '${number}') or (m.role = 'Manager' and exists (select 1 from members r join lead_assignees a on a.member_id = r.id join projects p on p.lead_id = a.lead_id where r.manager_id = m.id and p.number = '${number}'))` : ''}) order by m.name)`).split('|').filter(Boolean)
    const assignOptions = async () => { await assignBox.click(); await settle(p, 300); const o = (await p.getByRole('option').allInnerTexts()).map((x) => x.trim()); await p.getByRole('option', { name: 'Unassigned', exact: true }).click(); await settle(p, 200); return o }
    await compose.getByTestId('new-ticket-save').click(); await settle(p, 500)
    ok(await compose.isVisible() && await projectBox.getAttribute('aria-invalid') === 'true', 'Add issue with no project keeps the form open, the Project field marked required')   // (Dane's Tickets review, merged 2026-10-28)
    const before = await assignOptions()
    ok(before[0] === 'Unassigned' && JSON.stringify(before.slice(1).sort()) === JSON.stringify(takersOf(null)), `before a project is picked, Assigned to offers Owners and Admins only (${before.slice(1).join(', ')})`, before.join(' | '))   // (Dane's Tickets review, merged 2026-10-28)
    await projectBox.click(); await settle(p, 300)
    const options = await p.getByRole('option').allInnerTexts()
    const projectsSeen = Number(sql(`select count(*) from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null`))
    ok(options.length === projectsSeen && options.every((o) => / · P-\d{4}-\d{3}$/.test(o.trim())), `every project an Owner sees, each with its number (${options.length})`, options.join(' | '))
    await shot(p, 'm1-pick-1440')
    await p.getByRole('option', { name: `${BEN_NAME} · P-2026-002` }).click(); await settle(p, 300)
    ok(await compose.isVisible() && /For Benjamin Han — they see it on their page/.test(await text(compose)), 'the picked project names its client — the project tab’s own compose')   // (Dane's Tickets review, merged 2026-10-28)
    const onBen = await assignOptions()
    ok(onBen[0] === 'Unassigned' && JSON.stringify(onBen.slice(1).sort()) === JSON.stringify(takersOf('P-2026-002')), `then Assigned to offers only who can work on it (${onBen.slice(1).join(', ')})`, onBen.join(' | '))   // (Dane's Tickets review, merged 2026-10-28)
    /* a pick the next project can't take lets go: someone on Benjamin's team who isn't on Ryan's */
    const offRyan = onBen.slice(1).find((n) => !takersOf('P-2026-001').includes(n))
    if (offRyan) {
      await assignBox.click(); await settle(p, 300); await p.getByRole('option', { name: offRyan, exact: true }).click(); await settle(p, 200)
      await projectBox.click(); await settle(p, 300); await p.getByRole('option', { name: `${RYAN_NAME} · P-2026-001` }).click(); await settle(p, 300)
      ok(/Unassigned/.test(await text(assignBox)) && !new RegExp(offRyan).test(await text(assignBox)), `switching to a project ${offRyan} can't work on puts Assigned to back to Unassigned`, await text(assignBox))   // (Dane's Tickets review, merged 2026-10-28)
      await projectBox.click(); await settle(p, 300); await p.getByRole('option', { name: `${BEN_NAME} · P-2026-002` }).click(); await settle(p, 300)
    }
    await compose.getByRole('combobox', { name: /^Category/ }).click(); await settle(p, 250)   // (Dane's Tickets review, merged 2026-10-28) Project is the first combobox now
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
    /* (the calm UI build 2026-10-27, a deliberate change) the card names its project by its name (1-22) — its number is the drawer's Project row */
    ok(await p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`).count() === 1 && (await text(p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`))).includes(BEN_NAME), 'its card on the list names its project')
    await go(p, `/projects/${BEN}/tickets`)
    ok(await p.locator(`[data-testid="ticket-card"][data-ticket="${made[0]}"]`).count() === 1, '…and it is on the project’s own Tickets tab')

    console.log('M1 · ?new=1 and &project=')
    await go(p, '/tickets?new=1', 1400)
    ok(/The project’s client sees it on their page/.test(await text(p.getByRole('dialog', { name: 'New issue' }))) && !/new=1/.test(p.url()), '?new=1 opens the form with no project picked, and the address loses the mark')   // (Dane's Tickets review, merged 2026-10-28) one form
    await p.keyboard.press('Escape'); await settle(p, 400)
    await go(p, `/tickets?new=1&project=${RYAN}`, 1400)
    ok(/For Ryan D’Souza/.test(await text(p.getByRole('dialog', { name: 'New issue' }))), '&project= goes straight to that project’s compose')
    await p.keyboard.press('Escape'); await settle(p, 400)

    console.log('M1 · the Dashboard tile')
    const toAnswer2 = Number(sql(TO_ANSWER))
    await go(p, '/dashboard', 1800)
    /* (the Dashboard redesigned 2026-10-26 — a deliberate change of this rule, his marks P-04 · P-13 and brief § 4: the Tickets tile is gone; a
       ticket waiting on the studio is its project's Needs you row under Clients waiting, one per ticket, and the rail's Tickets keeps the count) */
    const railTickets = p.locator('[class*="app-rail-module__"] a[href^="/tickets"]')
    /* (the calm UI build 2026-10-27, a deliberate change) 1-04: the rail's Issues keeps its number in its name ("Issues (n waiting)") — (Vicky 2026-10-29: brought back) its mark a red dot */
    const rowCount2 = Number((/\((\d+) waiting\)/.exec((await railTickets.getAttribute('aria-label').catch(() => '')) || '') ?? ['', '0'])[1])
    const more = p.locator('[data-card="needs"] [data-testid="needs-more"]')
    /* (the calm UI build 2026-10-27, a deliberate change) 1-01: "See all n" opens every row in the house Drawer (was "Show all n" unrolling the card) */
    let needsRows = p.locator('[data-card="needs"]')
    if (await more.count() && /See all \d+/.test(await more.innerText())) { await more.click(); await settle(p, 700); needsRows = p.getByTestId('needs-all-list') }
    else if (await more.count() && /Show all \d+|Show \d+ more/.test(await more.innerText())) { await more.click(); await settle(p, 500) }   // (the calm pass 2026-10-26, a deliberate change) Needs you's "Show all n" (was "Show n more")
    const ticketRows = await needsRows.locator('[data-inbox-row*=":ticket:"]').count()
    ok(ticketRows === rowCount2 && rowCount2 <= toAnswer2, `Needs you holds a row per ticket waiting on you, the rail's Tickets count (${ticketRows} = ${rowCount2}; ${toAnswer2} wait in the studio)`)
    ok(await p.getByTestId('tile-tickets').count() === 0, 'no Tickets tile on the Dashboard any more — its count is the rail’s, its rows Needs you’s')
    if (await p.getByTestId('needs-all').isVisible().catch(() => false)) { await p.keyboard.press('Escape'); await settle(p, 500) }   // (the calm UI build 2026-10-27, a deliberate change) the drawer closes before the rail is pressed
    await shot(p, 'm1-dashboard-1440', true)
    await railTickets.click(); await p.waitForURL(/\/tickets/, { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
    ok(new URL(p.url()).pathname === '/tickets' && await p.getByTestId('studio-tickets').isVisible(), 'the rail’s Tickets opens Tickets', p.url())
    ok(await p.locator('header a[data-kb="back"]').count() === 0 && await railTickets.getAttribute('aria-current') === 'page', 'Tickets is a rail place: no Back, the rail’s Tickets lit')
    await go(p, '/dashboard', 1800)
    /* the loader draws the Pulse strip as the page does */
    const gctx = await desk({ reducedMotion: 'reduce' }); const gl = await loader(gctx, '/dashboard')
    const ghostTiles = await gl.locator('[class*="pulseTiles"], [class*="standTiles"]').first().locator('> *').count()
    await gctx.close()
    ok(ghostTiles === await p.locator('[data-testid="stands-tiles"] > *').count(), `the Dashboard’s ghost draws as many Pulse figures as the page (${ghostTiles})`)

    console.log('M1 · roles')
    as('germaine')
    await go(p, '/tickets')
    ok(await p.getByTestId('studio-new-ticket').count() === 1, 'germaine (Designer, on two projects’ teams): New ticket')
    await p.getByTestId('studio-new-ticket').click(); await settle(p, 600)
    /* (Dane's Tickets review, merged 2026-10-28) one form: the Project select holds only the projects she may raise on — a select can't grey an
       option, so a project she isn't on is left out (it was kept in the picker, refused with the rule) */
    const gpick = p.getByRole('dialog', { name: 'New issue' })
    await gpick.getByRole('combobox', { name: /^Project/ }).click(); await settle(p, 300)
    const gopts = (await p.getByRole('option').allInnerTexts()).map((x) => x.trim())
    const mine = sql(`select group_concat(p.number, ',') from projects p join lead_assignees a on a.lead_id = p.lead_id where a.member_id = 'germaine' and p.deleted_at is null`).split(',').filter(Boolean)
    ok(gopts.length === mine.length && mine.every((n) => gopts.some((o) => o.endsWith(n))), `her own projects, and only them (${mine.join(', ')})`, gopts.join(' | '))   // (Dane's Tickets review, merged 2026-10-28)
    ok(!gopts.some((o) => o.endsWith('P-2026-001')), 'a project she isn’t on is not offered', gopts.join(' | '))   // (Dane's Tickets review, merged 2026-10-28)
    await shot(p, 'm1-germaine-refused-1440')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, '/dashboard', 1800)
    /* (the Dashboard redesigned 2026-10-26 — a deliberate change of this rule: no Tickets tile for anyone; her projects' tickets that wait on the
       studio come as their Needs you rows) */
    ok(await p.getByTestId('tile-tickets').count() === 0, 'germaine: no Tickets tile — her projects’ tickets come as Needs you rows')
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
    ok(rows.indexOf('See it as Ryan') === Math.max(rows.indexOf('Client portal'), rows.indexOf('Invite to Portal')) + 1,   /* (the calm UI build 2026-10-27, a deliberate change) the row reads "Client portal" */ 'See it as Ryan sits beside Invite to Portal', rows.join(' · '))
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
    /* (the calm UI build 2026-10-27, a deliberate change) B2 1-30 · 2-47: the header's outlined "Insights" door is the toolbar ⋮'s first row,
       "Reports" (`open-insights`) — the Leads and Projects listings' own door (their ⋮'s Reports) — still into Reports › Meetings with Back */
    const moreMeetings = async (pg) => { await pg.getByRole('button', { name: 'More options' }).last().click(); await settle(pg, 500) }
    await moreMeetings(p)
    const ins = p.getByTestId('open-insights')
    ok(await ins.count() === 1 && /^\s*Reports\s*$/.test(await text(ins)), 'the Leads and Projects listings’ Insights door, after New Meeting — the ⋮’s Reports row')
    await shot(p, 'm5-meetings-1440')
    await ins.click(); await p.waitForURL(/\/company\/reports\/meetings/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
    ok(new URL(p.url()).searchParams.get('from') === '/meetings', 'it opens Company › Reports › Meetings with the way back', p.url())
    const back = p.locator('header').getByRole('link', { name: 'Back to Meetings' })
    ok(await back.count() === 1 && /Meetings \/ Company \//.test(await text(p.locator('header:has(a[data-kb="back"])').first())), 'Back to Meetings; the crumb “Meetings / Company / Reports”')
    await shot(p, 'm5-reports-1440')
    await back.click(); await p.waitForURL(/\/meetings$/, { timeout: 10000 }).catch(() => {}); await settle(p, 900)
    ok(new URL(p.url()).pathname === '/meetings', 'Back returns to Meeting Copilot')
    const mctx = await desk({ reducedMotion: 'reduce' }); const ml = await loader(mctx, '/meetings')
    ok(await ml.locator('[aria-label="Loading meetings"]').first().locator('[class*="headActions"] > *').count() === 1, 'its loader draws New Meeting — as the page’s header, Reports in its ⋮')   // (the calm UI build 2026-10-27, a deliberate change) 1-30
    await mctx.close()
    as('germaine')
    await go(p, '/meetings', 1300)
    await moreMeetings(p)   // (the calm UI build 2026-10-27, a deliberate change) read in the ⋮, where the door lives now
    ok(await p.getByRole('menuitem', { name: 'Meeting settings' }).count() === 1 && await p.getByTestId('open-insights').count() === 0, 'germaine: no Insights — Reports › Meetings is Owners’ and Admins’')
    await p.keyboard.press('Escape'); await settle(p, 300)
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
    /* (the calm UI build 2026-10-27, a deliberate change) — 6-08 · 6-16: the kind rides the name's tooltip in the editor's bar, not a chip */
    await p.locator('h1').first().hover(); await settle(p, 900)
    ok(/Project · P-2026-001/i.test(await text(p.locator('[role="tooltip"]').first())), 'the editor names it the project’s: “Project · P-2026-001” (its name’s tooltip)')
    await p.mouse.move(2, 2)
    await shot(p, 'm8-editor-1440')
    /* a room on it, so the landing shows it (a lead's design shows once it has a room) */
    const R0 = sql(`select id from project_rooms where deleted_at is null and design_id = (select id from visualizer_designs where name = 'Kevin Ng' or lead_id = (select id from leads where name = 'Kevin Ng') limit 1) limit 1`)
    sql(`create temp table s46b as select * from project_rooms where id = '${R0}'; update s46b set id = 's46b-room', design_id = '${D}'; insert into project_rooms select * from s46b;`)
    await go(p, '/visualizer', 1500)
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 300)
    const kinds = (await p.getByRole('menuitemradio').allInnerTexts()).map((x) => x.split(/\s·\s|\n/)[0].trim())
    ok(kinds.slice(0, 4).join(' · ') === 'All · Projects · Leads · Studio’s own', `the Kind pill: Projects · Leads · Studio’s own, the planner’s order (${kinds.join(' · ')})`)   // (the calm UI build 2026-10-27, a deliberate change) — W-027
    await p.getByRole('menuitemradio', { name: /^Projects/ }).click(); await settle(p, 600)
    /* (the calm UI build 2026-10-27, a deliberate change) — 6-21 · 6-32: the card leads with the client; the project's number is the list view's Kind column */
    await p.getByRole('button', { name: 'List view' }).first().click(); await settle(p, 500)
    const vmain = await text(p.locator('main'))
    ok(/Ryan D’Souza/.test(vmain) && /P-2026-001/.test(vmain) && !/Kevin Ng/.test(vmain), 'Kind: Projects — Ryan’s design with its number; Kevin Ng (a lead still) under Leads', vmain.slice(0, 200))
    await p.getByRole('button', { name: 'Grid view' }).first().click(); await settle(p, 400)
    await shot(p, 'm8-projects-1440')
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 250); await p.getByRole('menuitemradio', { name: /^Leads/ }).click(); await settle(p, 500)
    const lmain = await text(p.locator('main'))
    ok(/Kevin Ng/.test(lmain) && !/Ryan D’Souza/.test(lmain), 'Kind: Leads keeps the designs whose lead is still a lead')
    await p.getByRole('button', { name: /^Kind: / }).click(); await settle(p, 250); await p.getByRole('menuitemradio', { name: /^All/ }).click(); await settle(p, 500)
    ok(/Project · \d+ rooms?/.test(await text(p.locator('main'))), 'under All its line says it is a project’s: “Project · 1 room …” (its number is the list’s Kind column)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-32
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
    ok(await q.getByRole('button', { name: 'New issue' }).count() === 1 && await sideways(q) <= 0, '390: New ticket as the header’s square, no sideways scroll', `${await sideways(q)}px`)
    await shot(q, 'm1-tickets-390')
    /* (Dane's Tickets review, merged 2026-10-28 — his change 3) the scope is one pill over its sheet "Issue status" (All · Open · Closed); his Tasks
       review's note fixed at the merge: the open search has the row, the pill steps aside, and comes back when the box folds */
    const qscope = q.getByTestId('ticket-scope')
    const pillWords = (await qscope.locator('[class*="label"]').first().innerText().catch(() => '')).trim()
    ok(await qscope.getByRole('radio').count() === 0 && /^Open( · \d+)?$/.test(pillWords), `390: the scope is one pill, "${pillWords} ▾"`)   // (Dane's Tickets review, merged 2026-10-28)
    await qscope.getByRole('button').first().click(); await settle(q, 600)
    const scopeSheet = q.getByRole('menu', { name: 'Issue status' })   // the house Dropdown as a sheet (role menu)
    const scopeRows = (await scopeSheet.getByRole('menuitemradio').allInnerTexts()).map((x) => x.split('\n')[0].trim())
    ok(await scopeSheet.isVisible() && scopeRows.join(' · ') === 'All · Open · Closed', '390: its sheet "Issue status" — All · Open · Closed', scopeRows.join(' · '))   // (Dane's Tickets review, merged 2026-10-28)
    await shot(q, 'm1-scope-390')
    await q.keyboard.press('Escape'); await settle(q, 500)
    await q.getByRole('button', { name: 'Search tickets' }).click(); await settle(q, 500)
    /* (Dane's Tickets review, merged 2026-10-28 — the closing run) the search's box, not its input: the input starts after the box's glyph (52 at 390,
       as on Tasks, whose open search is the reference) — the box itself takes the row from the page's 16 */
    const qbox = await q.getByRole('searchbox', { name: 'Search tickets' }).locator('xpath=..').boundingBox().catch(() => null)
    ok(!(await qscope.isVisible()) && !!qbox && qbox.x <= 24 && await sideways(q) <= 0, '390: the open search has the row from the left edge — the pill steps aside', JSON.stringify(qbox))   // (Dane's Tickets review, merged 2026-10-28)
    await shot(q, 'm1-search-390')
    await q.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined)); await settle(q, 500)   // an empty box folds once it loses focus
    ok(await qscope.isVisible(), '390: the box folds and the pill comes back')   // (Dane's Tickets review, merged 2026-10-28)
    await q.getByRole('button', { name: 'New issue' }).click(); await settle(q, 900)
    /* (Dane's Tickets review, merged 2026-10-28) one form, the Project its first field — as a sheet */
    ok(await q.getByRole('dialog', { name: 'New issue' }).isVisible() && await sideways(q) <= 0, '390: the one form as a sheet')
    await shot(q, 'm1-pick-390')
    await q.getByRole('dialog', { name: 'New issue' }).getByRole('combobox', { name: /^Project/ }).click(); await settle(q, 400)
    await q.getByRole('option', { name: `${BEN_NAME} · P-2026-002` }).click(); await settle(q, 300)
    ok(/For Benjamin Han/.test(await text(q.getByRole('dialog', { name: 'New issue' }))) && await sideways(q) <= 0, '390: the compose as a sheet, for the picked project’s client')
    await shot(q, 'm1-compose-390')
    await q.keyboard.press('Escape'); await settle(q, 500)
    await go(q, '/dashboard', 1800)
    /* (the Dashboard redesigned 2026-10-26 — a deliberate change: the Tickets tile is gone; the phone's Dashboard holds no Tickets figure) */
    ok(await q.getByTestId('tile-tickets').count() === 0 && await sideways(q) <= 0, '390: no Tickets tile, nothing scrolls sideways')
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
    /* (the calm UI build 2026-10-27, a deliberate change) B2 2-13: Meeting Copilot's Insights is the toolbar ⋮'s "Reports" row (`open-insights`) */
    await q.getByRole('button', { name: 'More options' }).last().click(); await settle(q, 500)
    ok(await q.getByTestId('open-insights').count() === 1 && await sideways(q) <= 0, '390: Insights as the header’s square')
    await q.keyboard.press('Escape'); await settle(q, 300)
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
