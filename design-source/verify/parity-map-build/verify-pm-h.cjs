// The parity-map build 2026-10-10 — package P-H: tasks, design, compliance & Maison AI (his "build everything that's in 1.0 to 2.0 without losing
// anything"; map rows TD-019 · TD-027 · TD-044 · TD-049 · TD-067 · TD-107 · TD-110 · UC-094 · UC-113 · PR-059 · SC-060 · FB-118). Each check asserts
// a rule: the rail's Tasks add row offers the projects made with New project under Projects (1); an outside person's "Ask an Owner to add them" —
// the Owners' task, the bell for Owners and Admins, one open ask per person, Undo, Members' Add member filled from ?add= (2); the client's no has
// its selection receipt, saying which answer (3); the Floor plan's first run asks a client on the portal for their plan — the stamp, the email,
// Activity, Undo — and still invites one who is not (4); a plan the studio adds tells the client once (5); a registration's note on the
// Compliance Navigator, Owners and Admins only, with Undo (6); Maison AI's Ask box — answers by rule from the records, money for Owners and Admins,
// the milestone a question names, the chips when nothing matches, Start a project filling New project (7); the phone (390).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules BASE=http://localhost:3011 node verify-pm-h.cjs <scratch.db> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-h')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3011'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pmh-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), marcus = P('P-2026-004')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), marcusLead = leadOf(marcus)
  const leads = `'${ryanLead}','${benLead}','${marcusLead}'`
  const pids = `'${ryan}','${ben}','${marcus}'`
  /* what the run may change, kept to put back (pictures and file bytes: only the ones the run adds are taken away) */
  const SNAP = [
    ['members', '1'], ['lead_tasks', '1'], ['task_assignees', '1'], ['notifications', '1'], ['notification_outbox', '1'],
    ['settings', `key in ('compliance_studio_notes')`], ['projects', `id in (${pids})`], ['lead_events', `lead_id in (${leads})`],
    ['project_floor_plans', '1'], ['lead_files', `lead_id in (${leads})`], ['project_selections', `project_id in (${pids})`],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const pictures = json(`select plan_id from floor_plan_pictures`).map((r) => r.plan_id)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `DELETE FROM floor_plan_pictures WHERE plan_id NOT IN (${pictures.map(lit).join(',') || "''"});\n`
    text += `DELETE FROM lead_file_images WHERE file_id NOT IN (SELECT id FROM lead_files);\nDELETE FROM lead_file_thumbs WHERE file_id NOT IN (SELECT id FROM lead_files);\n`
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
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.getByRole('button', { name: 'Maison AI' }).click(); await settle(p, 500) }
  const ask = async (p, q) => {
    const box = sheet(p).locator('[data-testid="maison-ask"] input')
    await box.fill(q); await box.press('Enter')
    await p.waitForFunction(() => !!document.querySelector('[data-testid="maison-answer"]') && !/Looking through your records/.test(document.querySelector('[data-testid="maison-answer"]').textContent || ''), null, { timeout: 15000 }).catch(() => {})
    await settle(p, 300)
    return sheet(p).locator('[data-testid="maison-answer"]')
  }
  as('dane')
  try {
    // ── 1 · TD-027 · the rail's Tasks: projects made with New project in the Lead picker ────────────────────────────────────────────
    console.log('1 · Tasks in the rail: a project made with New project, under Projects')
    const D = await desk(); const d = await D.newPage(); watch(d, 'studio')
    await go(d, '/tasks')
    await d.locator('[data-kb="create"]').first().click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /Create New Task/ }).click(); await settle(d, 500)
    await d.locator('[data-testid="task-add-lead"] button').first().click(); await settle(d, 400)
    const menu = d.locator('[role="menu"]').last()
    const marcusName = sql(`select name from projects where id='${marcus}'`)
    ok(/^Projects$/im.test(await menu.innerText()) && /^Leads$/im.test(await menu.innerText()), 'the picker groups Leads and Projects (TD-027)')   // the group titles are uppercase captions — innerText carries the CSS case
    const pick = menu.getByRole('menuitemradio', { name: new RegExp(marcusName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
    ok(await pick.count() === 1 && /P-2026-004/.test(await pick.innerText()), `a direct project is offered by its name with its number — ${marcusName}`)
    await shot(d, '01-tasks-picker-1440')
    await pick.click(); await settle(d, 300)
    const title = 'Probe — order the hinges'
    const field = d.locator('[data-add] input[aria-label="Task title"]').first()
    await field.fill(title); await field.press('Enter'); await settle(d, 1600)
    ok(sql(`select lead_id from lead_tasks where title='${title}'`) === marcusLead, 'the task lands on the project’s own record (its lead)')
    ok(/P-2026-004/.test(await d.locator('[data-kb-row]').filter({ hasText: title }).first().innerText()), 'its row names the project')

    // ── 2 · TD-019 · ask an Owner to add an outside person ──────────────────────────────────────────────────────────────────────────
    console.log('2 · An outside person: ask an Owner to add them to the studio')
    as('germaine')
    await go(d, `/projects/${ben}/tasks`)
    const cab = sql(`select id from lead_tasks where lead_id='${benLead}' and done=0 and external_name is null order by created_at limit 1`)
    const cabTitle = sql(`select title from lead_tasks where id='${cab}'`)
    await go(d, `/projects/${ben}/tasks?open=${cab}`)
    await d.locator('[data-testid="outside-add"]').click(); await settle(d, 400)
    const dlg = d.locator('[data-testid="outside-dialog"]')
    ok(await dlg.locator('[data-testid="outside-ask-invite"]').count() === 1, 'the form offers "Ask an Owner to add them to the studio", unticked')
    await d.locator('[role="dialog"]').last().getByLabel('Name').fill('Probe Tiler')
    await d.locator('[role="dialog"]').last().getByLabel('Mobile number').fill('91230001')
    await dlg.getByText('Ask an Owner to add them to the studio').click(); await settle(d, 200)
    ok(/The Owners get a task to add Probe Tiler/.test(await dlg.innerText()), 'ticked, it says what happens')
    await shot(d, '02-outside-ask-1440')
    await d.locator('[data-testid="outside-save"]').click(); await settle(d, 1800)
    const askTask = () => sql(`select id from lead_tasks where lead_id is null and title='Add Probe Tiler to the studio' and done=0`)
    const t1 = askTask()
    ok(!!t1 && sql(`select group_concat(member_id) from task_assignees where task_id='${t1}'`) === 'dane', 'the Owners get a studio task "Add Probe Tiler to the studio"')
    ok(/9123 0001/.test(sql(`select description from lead_tasks where id='${t1}'`)) && /Germaine/.test(sql(`select description from lead_tasks where id='${t1}'`)), 'it carries the mobile and who asked')
    const bells = json(`select member_id, href from notifications where kind='invite_requested'`)
    ok(bells.length === 2 && bells.every((x) => /\/company\/members\?add=Probe\+Tiler&phone=91230001/.test(x.href)) && bells.some((x) => x.member_id === 'huimin'), 'invite_requested rings the Owners and Admins, opening Members filled in')
    ok(sql(`select count(*) from notifications where kind='task_assigned' and title like '%Probe Tiler%'`) === '0', 'one bell row each — no second "task assigned" ring')
    await undo(d)
    ok(!askTask() && sql(`select count(*) from notifications where kind='invite_requested'`) === '0' && sql(`select coalesce(external_name,'') from lead_tasks where id='${cab}'`) === '', 'Undo takes the person, the Owners’ task and its bell rows back')
    /* again, kept this time; a second ask for the same person answers the open task */
    await d.locator('[data-testid="outside-add"]').click(); await settle(d, 400)
    await d.locator('[role="dialog"]').last().getByLabel('Name').fill('Probe Tiler')
    await d.locator('[role="dialog"]').last().getByLabel('Mobile number').fill('91230001')
    await d.locator('[data-testid="outside-dialog"]').getByText('Ask an Owner to add them to the studio').click()
    await d.locator('[data-testid="outside-save"]').click(); await settle(d, 1800)
    await d.locator('[data-testid="outside-edit"]').click(); await settle(d, 400)
    ok(await d.locator('[data-testid="outside-ask-invite"]').count() === 0, 'editing the same person never asks twice')
    await d.keyboard.press('Escape'); await settle(d, 300)
    const other = sql(`select id from lead_tasks where lead_id='${benLead}' and done=0 and external_name is null and id<>'${cab}' order by created_at limit 1`)
    await go(d, `/projects/${ben}/tasks?open=${other}`)
    await d.locator('[data-testid="outside-add"]').click(); await settle(d, 400)
    await d.locator('[role="dialog"]').last().getByLabel('Name').fill('Probe Tiler')
    await d.locator('[role="dialog"]').last().getByLabel('Mobile number').fill('91230001')
    await d.locator('[data-testid="outside-dialog"]').getByText('Ask an Owner to add them to the studio').click()
    await d.locator('[data-testid="outside-save"]').click(); await settle(d, 1800)
    ok(sql(`select count(*) from lead_tasks where lead_id is null and title='Add Probe Tiler to the studio' and done=0`) === '1', 'a second ask for the same person makes no second task')
    as('dane')
    const href = sql(`select href from notifications where kind='invite_requested' and member_id='dane' limit 1`)
    await go(d, href)
    await settle(d, 900)
    const add = d.getByRole('dialog', { name: 'Add member' })
    ok(await add.count() === 1 && await add.getByLabel('Name').inputValue() === 'Probe Tiler' && /9123 ?0001/.test(await add.getByLabel('Phone').inputValue()), 'the bell opens Company › Members with Add member filled in')
    ok(!/add=/.test(d.url()), 'the address drops the ask, so a refresh does not open it again')
    await shot(d, '02-members-add-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 3 · TD-044 · the client's no has its receipt ────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Selection receipts for a client’s no')
    const tiles = sql(`select id from project_selections where project_id='${ryan}' and title='Bathroom tiles'`)
    ok(sql(`select status||'|'||client_answer from project_selections where id='${tiles}'`) === 'declined|other_options', 'Ryan asked for other options on Bathroom tiles (the demo’s no)')
    await go(d, `/projects/${ryan}/choices`)
    const card = d.locator('[data-testid="choice-card"]').filter({ hasText: 'Bathroom tiles' }).first()
    await card.locator('[data-testid="choice-kebab"]').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /^Selection receipt/ }).click(); await d.waitForURL(/selection-receipts/).catch(() => {}); await settle(d, 1400)
    const paper = d.locator('[data-testid="selection-receipt"]')
    ok(await paper.count() === 1 && /Their answer/i.test(await paper.innerText()) && /Other options asked/.test(await paper.innerText()), 'the receipt says which answer — other options asked')
    ok(await paper.locator('[data-testid="receipt-pick"]').getAttribute('data-answer') === 'other_options' && await paper.locator('[aria-label="Picked"]').count() === 0, 'no option is ticked on a no')
    ok(/[0-9a-f]{4} [0-9a-f]{4}/.test(await paper.locator('[data-testid="receipt-fingerprint"]').innerText()), 'with its fingerprint')
    await shot(d, '03-receipt-no-1440', true)

    // ── 4 · TD-049 · UC-094 · asking the client for their plan ──────────────────────────────────────────────────────────────────────
    console.log('4 · The Floor plan’s first run asks the client for their plan')
    sql(`update project_floor_plans set put_away_at = 1700000000000 where project_id='${ben}'`)   // Benjamin's plans out of the way: a first run, on the portal
    await go(d, `/projects/${ben}/floor-plan`)
    const askLink = d.locator('[data-testid="plan-empty-ask"]')
    ok(await askLink.count() === 1 && /Ask Benjamin for their floor plan/.test(await askLink.innerText()), 'a client on the portal is asked, not invited')
    await askLink.click(); await settle(d, 1800)
    ok(!!sql(`select floor_plan_asked_at from projects where id='${ben}'`) && sql(`select floor_plan_asked_by from projects where id='${ben}'`) === 'dane', 'the ask is stamped on the project, by whom')
    ok(Number(sql(`select count(*) from notification_outbox where event='client_floor_plan_ask' and lead_id='${benLead}'`)) >= 1, 'the client is told — client_floor_plan_ask through the delivery layer')
    ok(sql(`select count(*) from lead_events where lead_id='${benLead}' and kind='parity_h_floor_plan_asked'`) === '1', 'Activity files the ask')
    ok(/Asked Benjamin/.test(await snack(d).innerText()), 'the snackbar says what happened, with Undo')
    await go(d, `/projects/${ben}/floor-plan`)
    ok(/Asked Benjamin for theirs on/.test(await d.locator('[data-testid="plan-empty"]').innerText()) && /Ask again/.test(await askLink.innerText()), 'the first run says when it was asked, and offers Ask again')
    await shot(d, '04-floor-plan-asked-1440')
    await go(d, `/projects/${ben}/activity`)
    ok(/asked Benjamin Han for their floor plan/.test(await d.locator('body').innerText()), 'the project’s Activity reads it')
    sql(`update projects set floor_plan_asked_at = null, floor_plan_asked_by = null where id='${ben}'`)
    sql(`delete from lead_events where lead_id='${benLead}' and kind='parity_h_floor_plan_asked'`)   // a fresh ask, to see its Undo
    await go(d, `/projects/${ben}/floor-plan`)
    await askLink.click(); await settle(d, 1500)
    await undo(d)
    ok(!sql(`select coalesce(floor_plan_asked_at,'') from projects where id='${ben}'`) && sql(`select count(*) from lead_events where lead_id='${benLead}' and kind='parity_h_floor_plan_asked'`) === '0', 'Undo takes the ask and its line back')
    sql(`update project_floor_plans set put_away_at = null where project_id='${ben}'`)
    await go(d, `/projects/${marcus}/floor-plan`)
    ok(await d.locator('[data-testid="plan-empty-ask"]').count() === 0 && /to the portal/.test(await d.locator('[data-testid="plan-empty"]').innerText()), 'a client not on the portal is invited first, as before')

    // ── 5 · TD-067 · UC-113 · a plan the studio adds tells the client ───────────────────────────────────────────────────────────────
    console.log('5 · A new plan tells the client, once')
    await go(d, `/projects/${ryan}/floor-plan`)
    await d.locator('[data-testid="plan-add"]').click(); await settle(d, 500)
    await d.locator('[data-testid="plan-add-dialog"] input[type="file"]').setInputFiles(path.join(__dirname, '..', '..', '..', 'public', 'projects', 'demo', 'floor-plan-existing.png'))
    await settle(d, 400)
    await d.locator('[data-testid="plan-add-save"]').click()
    await d.waitForFunction(() => !document.querySelector('[data-testid="plan-add-dialog"]'), null, { timeout: 20000 }).catch(() => {}); await settle(d, 1500)
    const newPlan = sql(`select id from project_floor_plans where project_id='${ryan}' and put_away_at is null order by created_at desc limit 1`)
    const told = json(`select status from notification_outbox where event='client_floor_plan' and key like '%:${newPlan}:%'`)
    ok(told.length >= 1, 'client_floor_plan goes for the new plan (its key is the plan’s, so once per plan)')
    await undo(d)
    if (told.every((x) => x.status === 'held')) ok(sql(`select count(*) from notification_outbox where event='client_floor_plan' and key like '%:${newPlan}:%'`) === '0', 'Undo takes the held email back with the plan')

    // ── 6 · TD-110 · a registration's note ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The Compliance Navigator: a note on a registration')
    await go(d, '/compliance')
    const first = d.locator('[data-testid="navigator-action"]').first()
    await first.locator('[data-testid="navigator-note-add"]').click(); await settle(d, 300)
    await first.locator('[data-testid="navigator-note-edit"] textarea').fill('Applied on 12 Jan — waiting for HDB to respond.')
    await first.locator('[data-testid="navigator-note-save"]').click(); await settle(d, 1400)
    ok(/waiting for HDB to respond/.test(await first.locator('[data-testid="navigator-note"]').innerText()) && /Dane/.test(await first.locator('[data-testid="navigator-note"]').innerText()), 'the note shows on its card, with who and when')
    ok(/waiting for HDB/.test(sql(`select value from settings where key='compliance_studio_notes'`)), 'kept with the studio’s compliance record (its own key beside it)')
    await shot(d, '06-navigator-note-1440')
    await undo(d)
    ok(!/waiting for HDB/.test(sql(`select coalesce(value,'') from settings where key='compliance_studio_notes'`)), 'Undo takes it back')
    as('germaine')
    await go(d, '/compliance')
    ok(await d.locator('[data-testid="navigator-note-add"]').count() === 0, 'a Designer reads notes and writes none')
    as('dane')

    // ── 7 · Maison AI's Ask box (TD-107 · SC-060 · FB-118 · PR-059) ─────────────────────────────────────────────────────────────────
    console.log('7 · Maison AI answers from the records')
    await go(d, `/projects/${ben}`)
    await fab(d)
    ok(await sheet(d).locator('[data-testid="maison-ask"]').count() === 1 && /Answers from your records/.test(await sheet(d).innerText()), 'one Ask box heads the sheet, "Answers from your records"')
    let a = await ask(d, 'What is overdue?')
    ok(/overdue/i.test(await a.innerText()), 'the schedule: what is overdue on this project')
    await shot(d, '07-ask-overdue-1440')
    a = await ask(d, 'Tell me about carpentry')
    ok(/Carpentry fabrication/.test(await a.innerText()) && await sheet(d).locator('[data-testid="maison-link"]').count() === 1, 'a milestone the question names: when, what it waits on, its tasks, and the way to it (SC-060)')
    a = await ask(d, 'What compliance is still to do here?')
    ok(/mandatory|Nothing mandatory/i.test(await a.innerText()), 'compliance still to do on this project (TD-107)')
    a = await ask(d, 'Do I need a permit for hacking a wall in a condo?')
    ok(/for a condo/.test(await a.innerText()) && await a.locator('[data-testid="maison-row"]').count() >= 1, 'the rules for a kind of home and a topic, from the checklist')
    a = await ask(d, 'GST this quarter')
    ok(/GST/.test(await a.innerText()) && /Open GST/.test(await sheet(d).locator('[data-testid="maison-link"]').innerText()), 'the books: GST this quarter, with the button to its report (FB-118)')
    a = await ask(d, 'Who owes the studio money?')
    ok(/owe|Nothing is owed/i.test(await a.innerText()), 'who owes the studio')
    a = await ask(d, 'hello there')
    ok(await sheet(d).locator('[data-testid="maison-chips"] button, [data-testid="maison-chips"] [role="radio"]').count() >= 5, 'nothing matched: the questions it answers, as chips')
    await sheet(d).locator('[data-testid="maison-chips"]').getByText('What is overdue?').click(); await settle(d, 1500)
    ok(/overdue/i.test(await sheet(d).locator('[data-testid="maison-answer"]').innerText()), 'a chip asks its question')
    await shot(d, '07-ask-chips-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)
    as('germaine')
    await go(d, `/projects/${ben}`)
    await fab(d)
    a = await ask(d, 'GST this quarter')
    ok(/Owners, Admins and Accounting only/.test(await a.innerText()), 'a Designer is told the books are for Owners, Admins and Accounting')   // (pending modules, a deliberate change of this rule — S10: the books are Accounting's too, P-I's seesBooks)
    await d.keyboard.press('Escape'); await settle(d, 300)
    as('dane')
    await go(d, '/projects')
    await fab(d)
    await sheet(d).getByRole('button', { name: 'Start a project' }).click(); await settle(d, 1500)
    ok(await sheet(d).locator('[data-testid="maison-row"]').filter({ hasText: 'Start a new project' }).count() === 1, 'the listing’s Start a project: the ways in, from the records (PR-059)')
    a = await ask(d, 'Start a new project for Mr Lim, 9123 4567, HDB 4-Room')
    await sheet(d).locator('[data-testid="maison-row"]').filter({ hasText: 'Start a new project for Mr Lim' }).click(); await settle(d, 1500)
    const np = d.locator('[role="dialog"]').filter({ hasText: /New project/ }).last()
    ok(await np.count() === 1 && await np.getByLabel('Client name').inputValue() === 'Mr Lim', 'New project opens filled from the question — the client, their mobile, the property type')
    await shot(d, '07-new-project-filled-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)
    ok(sql(`select count(*) from leads where name='Mr Lim'`) === '0', 'nothing is made without the form')
    await D.close()

    // ── 8 · The phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · The phone (390)')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/projects/${ben}`)
    await fab(m)
    ok(await sheet(m).locator('[data-testid="maison-ask"]').isVisible() && await noOverflow(m), 'the Ask box fits the phone’s sheet, no sideways scroll')
    await ask(m, 'What starts this week?')
    await shot(m, '08-ask-390')
    await go(m, '/compliance')
    ok(await noOverflow(m), 'the Navigator’s cards with their notes fit')
    await shot(m, '08-navigator-390')
    await go(m, '/tasks')
    ok(await noOverflow(m), 'the Tasks page fits')
    await M.close()
  } catch (e) {
    fail++; console.log('  ✗ the run stopped —', String(e).slice(0, 300))
  } finally {
    putBack(); as('dane')
    await b.close()
    if (errors.length) { console.log('page errors:'); for (const e of errors.slice(0, 10)) console.log('  ', e) }
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
