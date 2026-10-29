// Projects round 1 (REG-911…935) — the record: Won → project → View; New project (a direct project); the listing (tiles, scopes, search,
// Filters, columns, sort, selection + bulk bar, cards on a phone); the project page (header, one primary, kebab, tabs, Overview cards,
// Start the project, Rename); the rail, the dock, G P / G B; the studio search's Project kind; a direct lead kept out of Leads; Who sees.
// Run against `next start -p 3011` on a FRESH copy of the repaired scratch DB (scratchpad pj-r1/serve.sh) — never local.db.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-r1.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r1')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3011'   // pass BASE when the server under test is elsewhere
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const P = (n) => sql(`select id from projects where number='${n}'`)
const LEAD = (n) => sql(`select lead_id from projects where number='${n}'`)
const VIVIEN = 'bb054aa5-7284-492e-b232-607bd4cfb0f6'   // Quote Sent · Won reachable (an Approved quote)

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  const p = await ctx.newPage()
  const errors = []
  let where = 'start'
  p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
  p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
  const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
  const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
  const rows = () => p.locator('[data-kb-list="project"] [data-kb-row]')
  const tile = (k) => p.locator(`[data-testid="tile-${k}"]`)
  const benjamin = P('P-2026-002'), marcus = P('P-2026-004'), marcusLead = LEAD('P-2026-004')

  try {
    // ── The listing ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Listing')
    await go('/projects')
    ok(await rows().count() === 4, 'four open projects (three Won leads, one direct)')
    ok(/In progress\s*3/i.test(await tile('in_progress').innerText()), 'tile: In progress 3')
    const attentionN = Number((/Needs (?:your )?attention\s*(\d+)/i.exec(await tile('attention').innerText()) || [])[1] || 0)   /* (the calm UI build 2026-10-27, a deliberate change) T-01 words; the reports' door is the ⋮'s "Reports" row (1-30); rows say money as cards do, "S$ 81,355" (T-11) */   // later rounds add reasons (the schedule's, the update gap)
    ok(attentionN >= 1, 'tile: Needs attention counts at least the overdue cabinet order')
    /* (S44 landing, 2026-10-15) the demo moves with the day of a restore (S42A), so Ryan's target end can cross a month: count what the tile counts —
       open projects whose target end falls in this month (components/projects/scopes.ts completingThisMonth) */
    const nowD = new Date(), monthN = sql(`select target_end_date from projects where stage <> 'completed' and deleted_at is null and target_end_date is not null`).split('\n').filter(Boolean).filter((t) => { const d = new Date(Number(t) * 1000); return d.getFullYear() === nowD.getFullYear() && d.getMonth() === nowD.getMonth() }).length
    ok(new RegExp(`Completing this month\\s*${monthN}`, 'i').test(await tile('month').innerText()), `tile: Completing this month ${monthN} (the open projects ending this month)`)
    ok(await p.locator('[data-testid="tile-value"]').isVisible(), 'the Owner sees the open projects\' contract value')
    ok(/overdue|Waiting on|No update for|stalled|Set-up|invoice ready for|trailing progress/i.test(await p.locator('[data-testid="row-attention"]').first().innerText()), 'the row says why it needs attention')   // (gaps build B, REG-b.9) money's two reasons join the list
    await shot('listing-1440')
    await tile('attention').click(); await p.waitForTimeout(500)
    ok(await rows().count() === attentionN && p.url().includes('scope=attention'), 'a tile filters when pressed — and the address keeps it')
    await tile('attention').click(); await p.waitForTimeout(500)
    ok(await rows().count() === 4 && !p.url().includes('scope='), 'pressed again, it lets go')
    /* (Lead ↔ Project parity, package K-D2 — new rules) the Leads listing's header, scope menu and Members cell */
    await p.locator('[data-testid="projects-kebab"]').click(); await p.waitForTimeout(300)   /* (the calm UI build 2026-10-27, a deliberate change) T-01 words; the reports' door is the ⋮'s "Reports" row (1-30); rows say money as cards do, "S$ 81,355" (T-11) */
    ok(await p.locator('[data-testid="open-insights"] [role="menuitem"]').isVisible() && /^Reports$/.test((await p.locator('[data-testid="open-insights"]').innerText()).trim()) && await p.locator('[data-testid="open-tickets"]').count() === 0, 'the header: New project · ⋮ — the reports\' door is ⋮ › Reports (1-30); no Tickets row (P-21 · Q-06)')
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — his ask 2026-10-19) */
    ok(await p.getByRole('menuitem', { name: /^Tickets/ }).count() === 0 && await p.getByRole('menuitem', { name: 'Insights', exact: true }).count() === 0, '⋮: no Tickets row (it is on the rail now), no Insights row (P-21)')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    ok(await p.locator('[role="columnheader"][data-col="team"]').innerText().then((t) => /MEMBERS/i.test(t)) && await p.locator('[data-testid="members-cell"], [data-testid="members-assign"]').count() >= 4, 'the Members column (REG-290), the lead\'s cell on every row (P-17)')
    { const first = rows().first().locator('[data-col="project"]')
      const box = await first.boundingBox(), frame = await p.locator('[data-cols="projects"]').boundingBox()
      const nameX = await rows().first().locator('button[data-kb-open]').evaluate((e) => e.getBoundingClientRect().left)
      ok(!!box && !!frame && Math.abs(nameX - frame.x - 1 - 52) <= 1, `the name lands at 52 (REG-820), as the Quotes table's — ${frame ? Math.round(nameX - frame.x - 1) : '?'} (P-22)`) }
    { const before = p.url(); const first = rows().first(); const sub = first.locator('[data-col="project"] span').last()
      await sub.click(); await p.waitForTimeout(900)
      ok(/\/projects\/[^/?]+/.test(new URL(p.url()).pathname) && p.url() !== before, 'a press on the second line opens the project — the whole cell (REG-349, P-22)')
      await go('/projects') }
    await p.getByRole('button', { name: /^Open projects/ }).click(); await p.waitForTimeout(300)
    { const radios = (await p.getByRole('menuitemradio').allInnerTexts()).map((t) => t.split('\n')[0].trim())
      const at = (w) => radios.findIndex((t) => t.startsWith(w))
      ok(at('Open projects') === 0 && at('All projects') === 1 && at('Mine') === 2 && at('Needs your attention') === 3 && at('Setting up') > at('Approvals'), `the scope menu in the lead's order: the default · All · Mine · To do · the stages (${radios.slice(0, 4).join(' · ')}) (P-20)`)
      ok(await p.getByText('To do', { exact: true }).count() >= 1 && await p.getByText('Active', { exact: true }).count() >= 1, 'the groups: To do, then the stages under Active (P-20 · Q-07)') }
    await p.getByRole('menuitemradio', { name: /Completed/ }).click(); await p.waitForTimeout(400)
    { const doneN = Number(sql(`select count(*) from projects where stage='completed' and deleted_at is null`))   // (consistency walk) a rule, not round 1's count — round 7 seeds a completed project
      ok(doneN ? await rows().count() === doneN : await p.locator('[data-testid="search-empty"]').isVisible(), 'Completed — its projects, or "No results found" when none, never a first run') }
    await p.locator('[data-testid="view-open-projects"]').click(); await p.waitForTimeout(400)
    await p.locator('input[aria-label="Search projects"]').fill('marcus'); await p.waitForTimeout(500)
    ok(await rows().count() === 1 && p.url().includes('q=marcus'), 'search finds the client, and the address keeps it')
    await p.locator('input[aria-label="Search projects"]').fill('9773'); await p.waitForTimeout(500)
    ok(await rows().count() === 1, 'search finds a project by its client\'s phone digits')
    await p.locator('input[aria-label="Search projects"]').fill(''); await p.waitForTimeout(400)
    await p.getByRole('button', { name: 'Filters', exact: true }).click(); await p.waitForTimeout(400)
    await p.getByRole('tab', { name: 'Project type' }).click()
    await p.locator('[role="dialog"][aria-label="Filters"]').getByText('Partial renovation', { exact: true }).click(); await p.waitForTimeout(400)
    ok(await rows().count() === 1, 'Filters apply live — Partial renovation: the direct project')
    await shot('filters-live-1440')
    await p.getByRole('button', { name: 'Clear All' }).click(); await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(400)
    ok(await rows().count() === 4, 'Clear All puts every open project back')
    await p.locator('[role="columnheader"][data-col="number"] button').click(); await p.waitForTimeout(300)
    ok(/P-2026-001/.test(await rows().first().innerText()), 'a head sorts — Number ascending')
    await p.getByRole('button', { name: 'Column settings' }).click(); await p.waitForTimeout(500)
    ok(await p.locator('[role="dialog"]').filter({ hasText: 'Column settings' }).isVisible(), 'Column settings opens its drawer')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    await rows().nth(0).locator('[data-kb-select] label').click()   // the DS Checkbox's input is hidden — its label takes the press
    await rows().nth(1).locator('[data-kb-select] label').click(); await p.waitForTimeout(300)
    /* (parity P-17, a deliberate change of this rule) a row with nobody on it has the Members cell's own "Assign" link now — the bar's is inside the toolbar */
    const bulk = p.locator('[role="toolbar"][aria-label$="selected"]')
    const bar = bulk.getByRole('button', { name: 'Assign', exact: true })
    ok(await bar.isVisible() && await bulk.getByRole('button', { name: 'Export', exact: true }).isVisible(), 'selection brings the bulk bar — Assign · Export')
    await shot('bulk-bar-1440')
    await bulk.getByRole('button', { name: 'Export', exact: true }).click(); await p.waitForTimeout(400)
    ok(await p.locator('[role="dialog"][aria-label="Export Projects"]').isVisible(), 'Export opens the house export dialog')
    /* (parity P-25, a deliberate change of this rule) the Leads listing's statement: Which projects (the selection among them, picked) · Start date · Columns · the summary */
    { const ex = p.locator('[role="dialog"][aria-label="Export Projects"]')
      ok(await ex.getByRole('radio', { name: /^Selected projects \(2\)/ }).isChecked() && await ex.getByRole('radio', { name: /^All projects/ }).count() === 1 && /Start date/.test(await ex.innerText()) && /Columns/.test(await ex.innerText()) && /2 projects · every column · CSV/.test(await ex.locator('[data-testid="export-summary"]').innerText()), 'the export is the statement — Selected projects (2) picked, the period on Start date, Columns, “2 projects · every column · CSV”') }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await p.getByRole('button', { name: /clear selection|close/i }).last().click().catch(() => {})

    // ── New project (Q-04) ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('New project')
    await go('/projects')
    await p.keyboard.press('c'); await p.waitForTimeout(600)
    const dlg = p.locator('[role="dialog"][aria-label="New project"]')
    ok(await dlg.isVisible(), 'C opens New project')
    ok(await p.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null && (document.activeElement)?.tagName === 'INPUT'), 'the caret lands in the client\'s name')
    await dlg.getByRole('button', { name: 'Create project' }).click(); await p.waitForTimeout(400)
    ok(/This field is required/.test(await dlg.innerText()), 'Create with nothing says what is missing')
    await dlg.getByLabel('Client name').fill('Siti Rahim')
    await dlg.getByLabel('Client’s phone number').fill('97731968')   // Benjamin Han's
    await dlg.getByLabel('Property type').click(); await p.waitForTimeout(300)
    await p.getByRole('option', { name: 'HDB 4-Room', exact: true }).click()
    await dlg.getByLabel('Agreed value (S$)').fill('52000')
    /* (S42F, a deliberate change of this rule) a project needs a member — an Owner picks one (Sarah: Who sees below counts Germaine's and Alex's) */
    /* (the calm UI build 2026-10-27, a deliberate change) the picker's label reads "Members" (B2 · T-01: Members everywhere) — the same picker */
    await dlg.getByLabel('Members', { exact: true }).click(); await p.waitForTimeout(500)
    await p.locator('[role="option"]').filter({ hasText: 'Sarah' }).first().click(); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await shot('new-project-form-1440')
    await dlg.getByRole('button', { name: 'Create project' }).click(); await p.waitForTimeout(900)
    const dup = p.locator('[role="dialog"]').filter({ hasText: 'A client with this phone already exists' })
    ok(await dup.isVisible() && /Benjamin Han/.test(await dup.innerText()), 'a phone already on a lead asks first — the lead form\'s question')
    await shot('new-project-duplicate-1440')
    await dup.getByRole('button', { name: 'Close' }).click(); await p.waitForTimeout(300)
    await dlg.getByLabel('Client’s phone number').fill('96417753')
    /* (simplify Q-16) More details ▾ holds District · Address · Floor area · Style · Rooms · First note */
    ok(await dlg.getByLabel('District').count() === 0 && await p.locator('[data-testid="new-project-more"]').isVisible(), 'Q-16: the required fields first, More details folded')
    await dlg.getByRole('button', { name: 'Create project' }).click(); await p.waitForTimeout(2000)
    ok(/Project P-2026-\d{3} created/.test(await snack().innerText()), 'Create — "Project P-2026-… created"')
    const siti = sql(`select l.direct || '|' || l.stage || '|' || p.stage from projects p join leads l on l.id = p.lead_id where p.number = 'P-2026-005'`)
    ok(siti === '1|Won|setting_up', 'the client is a direct lead row, its project Setting up')
    ok(sql(`select count(*) from lead_events where kind='project_created' and project_id=(select id from projects where number='P-2026-005')`) === '1', 'its project_created event is written')
    /* (simplify Q-16, a deliberate change of this rule) Create opens the new project — no View to press */
    await p.waitForURL(/\/projects\/[^/?]+/); await p.waitForTimeout(900)
    ok(/Siti Rahim/.test(await p.locator('h1').innerText()), 'Create opens the new project')

    // ── A direct lead stays out of Leads ─────────────────────────────────────────────────────────────────────────────────
    console.log('Direct leads')
    await go('/leads')
    ok(!(await p.locator('body').innerText()).includes('Marcus Teo') && !(await p.locator('body').innerText()).includes('Siti Rahim'), 'the Leads listing never lists a direct project\'s client')
    await go(`/leads/${marcusLead}`)
    ok(p.url().includes(`/projects/${marcus}`), '/leads/<id> of a direct lead opens its project')
    await go(`/leads/${marcusLead}/files`)
    ok(p.url().includes(`/projects/${marcus}/files`), '…and its Files tab opens the project\'s')

    // ── The project page ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Project page')
    await go(`/projects/${marcus}?from=${encodeURIComponent('/projects')}`)
    const primary = p.locator('[data-testid="project-primary"] button')
    ok((await primary.innerText()).trim() === 'Start the project', 'Setting up: the one filled action is "Start the project"')
    /* (simplify S-01 · S-17, a deliberate change of this rule) Getting started is Needs you while set up — "Before work starts": what the Start step
       does not ask for, then Start; the dates, the schedule and the invite are the Start step's own */
    ok(/Before work starts/i.test(await p.locator('section[data-card="needs"]').first().innerText()), 'Before work starts names what is missing')
    ok(await p.locator('[data-testid="need-start"]').getByRole('button', { name: 'Start' }).isVisible() && await p.locator('[data-testid="need-setup-end"]').count() === 0, 'each open item has its own button; the target end is the Start step\'s')
    /* (parity P-01 · P-04, a deliberate change of this rule) the client and the members moved into the lead's info column on the left; the lead's
       own task / file cards joined the Overview */
    /* (simplify S-01, a deliberate change of this rule) Needs you · With {client} | Progress (still data-card "status") · Money · Recent activity; Key
       documents became Project info rows in the info column */
    for (const c of ['needs', 'with-client', 'status', 'money', 'recent-activity']) ok(await p.locator(`[data-card="${c}"]`).first().isVisible(), `Overview card: ${c}`)
    ok(await p.locator('[data-card="client"], [data-card="team"]').count() === 0, 'no Client or Team card — the info column holds them')
    ok(/Collaborators|Members/.test(await p.locator('aside, [class*="info"]').first().innerText().catch(() => '')) || await p.getByText(/^(Collaborators|Members)$/).count() > 0 /* (the calm UI build 2026-10-27, a deliberate change) B2: "Members" */, 'the info column on the left: Collaborators')
    ok(/S\$ 48,600/.test(await p.locator('[data-testid="contract-value"]').innerText()), 'Money: the direct project\'s agreed value')   // (parity Q-03, a deliberate change of this rule) a card's sum reads "S$ 48,600"
    await p.locator('[data-testid="payment-stages-toggle"]').click(); await p.waitForTimeout(300)   // (simplify S-01, a deliberate change of this rule) the stages fold under "Payment stages ▾"
    ok(await p.locator('[data-testid="payment-stages"] > *').count() === 4, 'Money: the agreed split\'s four stages')
    ok(/Projects/.test(await p.locator('[data-testid="project-page"] header').first().innerText()), 'the L2 crumb reads Projects')
    await shot('project-setting-up-1440', true)
    await p.locator('[data-testid="project-page"] header').getByRole('button', { name: 'More options' }).click(); await p.waitForTimeout(400)
    const menu = p.locator('[role="menu"]').last()
    /* (parity P-09 · P-11, a deliberate change of this rule) the ⋮ opens with Edit details — the project's name is a field of it; no Rename… row */
    ok(await menu.getByRole('menuitem', { name: /^Edit details/ }).isVisible() && !(await menu.innerText()).includes('Rename') && !(await menu.innerText()).includes('Open the lead’s record'), 'kebab: Edit details first, no Rename…, and no lead record for a direct project')
    await menu.getByRole('menuitem', { name: /^Edit details/ }).click(); await p.waitForTimeout(500)
    await p.locator('[role="dialog"][aria-label="Edit details"]').getByLabel('Project name').fill('Condo 3-bedder — Marcus Teo, kitchen and baths')
    await p.locator('[role="dialog"][aria-label="Edit details"] [data-testid="details-save"]').click(); await p.waitForTimeout(1500)
    ok(/kitchen and baths/.test(await p.locator('h1').innerText()), 'the name saved in Edit details lands in the header')
    await primary.click(); await p.waitForTimeout(1800)
    const start = p.locator('[role="dialog"][aria-label="Start the project"]')
    /* (simplify S-17, a deliberate change of this rule) the Start sheet: the date once, the schedule's picker beside its preview, ☑ invite,
       ☑ the deposit — here Not now and both unticked, so the steps that follow (Set up the schedule, the invite, the deposit) still read as rows */
    ok(await start.isVisible() && await start.getByLabel('Works start on').count() === 1 && await start.locator('[data-testid="start-sheet-schedule"]').isVisible(), 'Start the project: the Start sheet — Works start on, the schedule')
    ok(await start.locator('[data-testid="start-sheet-invite"]').count() === 1 && await start.locator('[data-testid="start-sheet-deposit"]').count() === 1, '…☑ Invite Marcus to his page, ☑ Send the Deposit invoice')
    await shot('start-project-1440')
    await start.getByRole('radio', { name: /^Not now/ }).click(); await p.waitForTimeout(200)
    for (const t of ['start-sheet-invite', 'start-sheet-deposit']) { const c = start.locator(`[data-testid="${t}"] input`); if (await c.count() && await c.isChecked()) await start.locator(`[data-testid="${t}"]`).click() }
    await start.locator('[data-testid="start-sheet-go"]').click(); await p.waitForTimeout(1800)
    ok(/is in progress/.test(await snack().innerText()) && await snack().getByRole('button', { name: 'Undo' }).count() >= 1, 'S-17: one sentence, with Undo')
    /* (parity P-08, a deliberate change of this rule) the stage is the lead's Stage button, not a chip */
    ok(/Stage: In progress/.test(await p.locator('[data-testid="project-stage"] button').innerText()), 'started: the Stage button reads “Stage: In progress”')
    /* (simplify S-02 · Q-03, a deliberate change of this rule) the header's action is Needs you's top row — the deposit (client money) before the
       set-up leftovers; Set up the schedule is a row of the list */
    /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
    { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
    ok((await p.locator('[data-testid="project-primary"]').innerText()).trim() !== '' && /Set up/.test(await p.locator('[data-testid="need-setup-schedule"]').innerText()), 'once it runs, Needs you offers Set up the schedule (round 2), the header its top row')
    ok(sql(`select stage from projects where id='${marcus}'`) === 'in_progress', 'the record moved to In progress')
    await p.getByRole('tab', { name: 'Tasks' }).click(); await p.waitForURL(/\/tasks/); await p.waitForTimeout(900)
    ok(/Confirm the site measurements/.test(await p.locator('main, body').first().innerText()) && p.url().includes(`/projects/${marcus}/tasks`), 'Tasks: the lead\'s own tab, on the project\'s address')
    await shot('project-tasks-1440')
    /* (simplify S-03 · Q-02, a deliberate change of this rule) Activity is a view of Files & notes: its tab opens Files, the view switch reaches Activity */
    await p.getByRole('tab', { name: /^Files & notes/ }).click(); await p.waitForURL(/\/files/); await p.waitForTimeout(900)
    await p.locator('[data-testid="project-view-chips"] [role="radio"]').filter({ hasText: 'Activity' }).click(); await p.waitForURL(/\/activity/); await p.waitForTimeout(900)
    const act = await p.locator('body').innerText()
    ok(/started the project/.test(act) && /renamed the project/.test(act) && /created the project/.test(act), 'Activity carries the project\'s events')
    ok(!/Lead created from/.test(act), 'a direct project\'s Activity never says a lead was created')
    await shot('project-activity-1440')
    await p.getByRole('tab', { name: /^Files & notes/ }).click(); await p.waitForURL(/\/files/); await p.waitForTimeout(900)
    ok(p.url().includes(`/projects/${marcus}/files`), 'Files: on the project\'s address (the Files & notes tab opens its first view)')
    await go(`/projects/${benjamin}`)
    /* (simplify S-01, a deliberate change of this rule) an overdue task is never a Needs you row — MY TASKS says it; Needs you lists the rest */
    ok(/Overdue/.test(await p.locator('section[data-card="my-work"]').first().innerText()) && await p.locator('section[data-card="needs"] [data-testid^="need-"]').count() > 0, 'MY TASKS names the overdue task; Needs you lists what waits')
    /* (simplify S-01, a deliberate change of this rule) the signed quote and the contract are Project info rows in the info column */
    ok(/OM-10005/.test(await p.locator('[data-testid="doc-quote"]').innerText()) && await p.locator('[data-testid="doc-contract"]').isVisible(), 'Project info: the signed quote and the contract')
    await p.locator('[data-testid="payment-stages-toggle"]').click(); await p.waitForTimeout(300)
    ok(/From the signed quote/.test(await p.locator('[data-card="money"]').first().innerText()) && await p.locator('[data-testid="payment-stages"] > *').count() === 4, 'Money: the signed quote\'s Payment Schedule')
    await shot('project-in-progress-1440', true)

    // ── Won creates the project — the Won step, then View ────────────────────────────────────────────────────────────────
    console.log('Won → project')
    await go(`/leads/${VIVIEN}`)
    await p.locator('[data-testid="header-primary"] button').click(); await p.waitForTimeout(800)
    const wiz = p.locator('[role="dialog"][aria-label="Move stage"]')
    ok(await wiz.isVisible() && /Moving to Won/.test(await wiz.innerText()), 'Convert to Project opens the Won step')
    /* Vivien's quote is Approved, not signed: the Won step takes the signed copies as uploads (780:92744) — the quote's amount typed, the
       split reset to the studio's 10/30/30/30, the signed contract a file. */
    const tabs = wiz.getByRole('tab', { name: 'Upload' })
    await tabs.nth(0).click(); await p.waitForTimeout(200)
    await wiz.locator('input[type="file"]').nth(0).setInputFiles({ name: 'Vivien-signed-quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await p.waitForTimeout(1800)
    await wiz.getByLabel('Quote amount (S$)').fill('88500')
    await tabs.nth(1).click(); await p.waitForTimeout(200)
    await wiz.locator('input[type="file"]').last().setInputFiles({ name: 'Vivien-signed-contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await p.waitForTimeout(1800)
    await wiz.getByRole('button', { name: 'Reset to default' }).click(); await p.waitForTimeout(200)
    await shot('won-step-1440')
    await wiz.getByRole('button', { name: 'Save & Convert to Project' }).click()
    /* (simplify Q-16, a deliberate change of this rule) Save & Convert opens the new project, and the project page says the sentence */
    await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500)
    ok(/Project P-\d{4}-\d{3} created/.test(await snack().innerText().catch(() => '')), 'the snackbar: "Project P-… created" — New project’s sentence, the project’s own number (REG-1052), said on the new project')
    const vp = sql(`select id || '|' || number || '|' || stage || '|' || coalesce(agreed_value_minor, 0) || '|' || (contract_id is not null) from projects where lead_id='${VIVIEN}'`)
    ok(/\|P-2026-\d{3}\|setting_up\|8850000\|1$/.test(vp), 'the Won press made the project — numbered, Setting up, the uploaded quote\'s amount, the uploaded contract')
    ok(sql(`select count(*) from notifications where kind='project_created' and lead_id='${VIVIEN}'`) !== '0', 'the lead\'s members hear of it in the bell')
    await shot('won-snackbar-1440')
    await p.waitForURL(/\/projects\//); await p.waitForTimeout(500)
    ok(!/created=1/.test(p.url()), 'the address keeps nothing of the hand-over (simplify Q-16)')
    ok(p.url().includes(vp.split('|')[0]) && /Vivien Lee/.test(await p.locator('h1').innerText()), 'Save & Convert opens the new project')
    await go(`/leads/${VIVIEN}`)
    ok((await p.locator('[data-testid="header-primary"] button').innerText()).trim() === 'Open project', 'the Won lead\'s header opens its project')
    await p.locator('[data-testid="header-primary"] button').click(); await p.waitForURL(/\/projects\//); await p.waitForTimeout(800)
    ok(/Vivien Lee/.test(await p.locator('h1').innerText()) && /Back to Vivien Lee/.test(await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('aria-label')), 'one record, two chapters — and Back returns to the lead')
    ok(sql(`select count(*) from projects where lead_id='${VIVIEN}'`) === '1', 'idempotent: still one project for the lead')

    // ── Rail, keys, search, settings ───────────────────────────────────────────────────────────────────────────────────
    console.log('Rail · keys · search · settings')
    await go('/leads')
    const railItem = p.locator('nav[aria-label="Workspace"] a[href^="/projects"]')
    /* (Vicky 2026-10-29: brought back) the rail's Projects wears its count again, as a red dot (no number on the glyph); the number is its name, and it lands on the listing's
       Needs your attention scope — the projects it counts */
    const attn = await railItem.getAttribute('aria-label') ?? ''
    ok(await railItem.count() === 1 && (/needs? attention/.test(attn) ? (await railItem.getAttribute('href')) === '/projects?scope=attention' && await railItem.locator('[class*="__badgeDot"][data-badge="dot"]').count() === 1 && (await railItem.locator('[class*="__badge"]').innerText()).trim() === '' : attn === '' || attn === 'Projects'), 'the rail\'s Projects is a destination wearing its count — a red dot, the number in its name', attn)   // (Vicky 2026-10-29: brought back)
    await p.keyboard.press('g'); await p.waitForTimeout(150); await p.keyboard.press('p'); await p.waitForURL(/\/projects/); await p.waitForTimeout(1200)
    ok(new URL(p.url()).pathname === '/projects', 'G P goes to Projects')
    await p.keyboard.press('g'); await p.waitForTimeout(150); await p.keyboard.press('b'); await p.waitForURL(/price-book/); await p.waitForTimeout(600)
    ok(p.url().includes('/company/price-book'), 'G B goes to the Price book')
    await go('/projects')
    await p.keyboard.press('Meta+k'); await p.waitForTimeout(500)
    await p.getByRole('combobox', { name: 'Search the studio' }).or(p.getByLabel('Search the studio')).first().fill('Benjamin'); await p.waitForTimeout(1500)
    const grp = p.locator('[role="group"][aria-label="Projects"]')
    ok(await grp.isVisible() && /HDB 5-Room — Benjamin Han/.test(await grp.innerText()), 'the studio search finds the project')
    await shot('search-project-1440')
    await grp.locator('[role="option"]').first().click(); await p.waitForURL(/\/projects\/[^/?]+/); await p.waitForTimeout(800)
    ok(p.url().includes(benjamin), '…and opens it')
    await go('/settings?section=projects')
    { const next = `P-2026-${String(Number(sql(`select max(cast(substr(number, 8) as integer)) from projects where number like 'P-2026-%'`)) + 1).padStart(3, '0')}`
      ok(await p.locator('[data-testid="settings-projects"]').isVisible() && new RegExp(next).test(await p.locator('[data-testid="project-number-example"]').innerText()), `Settings › Projects is live — the next number ${next}`) }
    await shot('settings-projects-1440')

    // ── Who sees (Q-23): the lead's rule ─────────────────────────────────────────────────────────────────────────────────
    console.log('Who sees')
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
    sql(`update members set is_you = (id = 'alex')`)
    await go(`/projects/${benjamin}`)   // the route streams its ghost first, so "not found" is the page's, not the status line's
    ok(await p.locator('[data-testid="project-page"]').count() === 0 && !/Benjamin Han/.test(await p.locator('body').innerText()), 'a Designer off the team: another designer\'s project answers not found')
    await shot('who-sees-not-found-1440')
    await go('/projects')
    ok(await p.locator('[data-testid="projects-empty"]').isVisible(), '…and the listing shows none of them (the first-run card)')
    sql(`update members set is_you = (id = 'germaine')`)
    await go('/projects')
    ok(await rows().count() === 2, 'Germaine sees her two — Benjamin\'s and the direct project')
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).split('\n')[0])
  } finally {
    sql(`delete from settings where key = 'lead_visibility'`)
    sql(`update members set is_you = (id = 'dane')`)
  }

  // ── Phone 390 (touch) ───────────────────────────────────────────────────────────────────────────────────────────────
  console.log('Phone 390')
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const m = await phone.newPage()
  try {
    await m.goto(BASE + '/projects', { waitUntil: 'networkidle' }); await m.waitForTimeout(900)
    ok(await m.locator('[data-kb-list="project"] article').count() >= 4, 'a phone gets the cards')
    const dock = m.locator('nav[aria-label="Primary"] a[href^="/projects"]')
    ok(await dock.count() === 1 && await dock.getAttribute('data-active') !== null, 'the dock\'s Projects is live and lit')
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at 390')
    await m.screenshot({ path: path.join(dir, 'listing-390.png'), fullPage: true })
    await m.goto(BASE + `/projects/${benjamin}`, { waitUntil: 'networkidle' }); await m.waitForTimeout(900)
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the project page fits 390')
    await m.screenshot({ path: path.join(dir, 'project-390.png'), fullPage: true })
    await m.locator('[data-testid="project-page"] header').getByRole('button', { name: 'More options' }).click(); await m.waitForTimeout(500)
    ok(/Open the lead’s record/.test(await m.locator('body').innerText()), 'the kebab opens as a sheet with the project\'s menu')
    /* (parity P-03 · P-11) ≤767 the Create strip is hidden: the sheet carries its AI Visualizer and 3-D Space Planner; Edit details leads it */
    ok(await m.getByRole('menuitem', { name: 'AI Visualizer' }).count() === 1 && await m.getByRole('menuitem', { name: '3D Space Planner' }).count() === 1 && await m.locator('aside[aria-label="Create"]').isHidden(), 'the phone sheet carries AI Visualizer and 3D Space Planner; the strip is hidden')   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
    /* (simplify S-14 · Q-04) the sheet opens with the Create group — the strip's own seven — before the record rows */
    const sheetRows = (await m.getByRole('menuitem').allInnerTexts()).map((t) => t.split('\n')[0].trim())
    /* (pending modules S23, a deliberate change of this rule) Meeting is back after Contact Log — REG-552's hold lifted */
    ok(['Task', 'Note', 'Contact log', 'Meeting', 'Update', 'Variation order', 'AI Visualizer', '3D Space Planner'].every((l, i) => sheetRows[i] === l) && sheetRows.indexOf('Edit details') === 8, 'the sheet’s Create group: Task · Note · Contact log · Meeting · Update · Variation order · AI Visualizer · 3D Space Planner, then Edit details')   /* (the calm UI build 2026-10-27, a deliberate change) "Contact log" in sentence case (T-13, B2's quick links) — every Create row kept, in the same order */   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
    await m.screenshot({ path: path.join(dir, 'project-kebab-390.png') })
    await m.goto(BASE + '/projects?new=1', { waitUntil: 'networkidle' }); await m.waitForTimeout(2000)
    ok(await m.locator('[role="dialog"][aria-label="New project"]').isVisible(), '⌘K\'s Create lands on New project (?new=1), a bottom sheet on a phone')
    await m.screenshot({ path: path.join(dir, 'new-project-390.png') })
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).split('\n')[0])
  }
  // ── Ghosts (REG-708): the loader each route streams (scripts off), beside the page it turns into ───────────────────────
  console.log('Ghosts')
  for (const [w, h, touch] of [[1440, 1024, false], [390, 844, true]]) {
    const g = await b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
    const gp = await g.newPage()
    for (const [name, url] of [['listing', '/projects'], ['project', `/projects/${P('P-2026-002')}`], ['tasks', `/projects/${P('P-2026-002')}/tasks`]]) {
      await gp.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(400)
      const ghost = await gp.locator('[aria-busy="true"][role="status"]').count()
      ok(ghost > 0, `${name} @${w}: the route streams its own ghost`)
      await gp.screenshot({ path: path.join(dir, `ghost-${name}-${w}.png`) })
    }
    await g.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors[0]}` : ''}`)
  await b.close()
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
