// Projects gaps build 2026-10-08 — package I: workload, compliance and AI on projects (the owner's "build everything"; Q-08 · Q-12 · Q-31's "later";
// calls I-Q1…I-Q18 in design-source/context/parity/projects-gaps-build/i-read.md). Each check asserts a rule: the Workload view — who sees it, what it
// counts (the list's own rows), the states, Set capacity with Undo, a Manager's team, a Designer's refusal (1); Projects › Insights — the tiles from the
// records, money for Owners and Admins only, a Manager's team, the gate (2); the Compliance tab — the kind of home, the phase, an answer with Undo, Not
// needed, the read-only member, a deep link (3); starter tasks — the task and its item in step both ways, the Settings switch with Undo, a new project's
// ten (4); the Compliance Navigator — the studio's steps read from Company › Profile's one record of registrations, set there with Undo
// (one-home N-07), the rules by home (5); Maison AI's drafted schedule — the review, a
// rebuild with a milestone left out and Undo, the Start card (6); Maison AI acting — an answer, a proposal that adds a task, a draft update (7); the
// phone (390). Run against `next start -p 3130` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-i.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-i')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3130'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gapi-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), marcus = P('P-2026-004')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const benLead = leadOf(ben), aishaLead = leadOf(aisha), marcusLead = leadOf(marcus), ryanLead = leadOf(ryan)
  const leads = `'${ryanLead}','${benLead}','${aishaLead}','${marcusLead}'`
  const pids = `'${ryan}','${ben}','${aisha}','${marcus}'`
  /* what the run may change, kept to put back */
  const SNAP = [
    ['members', '1'], ['settings', `key in ('compliance_studio','compliance_starter_tasks','project_capacity_default','project_numbers_given')`], ['project_compliance', '1'],
    ['lead_tasks', `lead_id in (${leads})`], ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`], ['lead_events', `lead_id in (${leads})`],
    ['project_milestones', `project_id in (${pids})`], ['project_milestone_links', `milestone_id in (select id from project_milestones where project_id in (${pids}))`],
    ['projects', `id in (${pids})`], ['project_updates', `project_id in (${pids})`], ['notifications', '1'], ['notification_outbox', '1'],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const probeLeads = []
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const l of probeLeads) for (const t of ['lead_events', 'lead_tasks', 'lead_files', 'lead_assignees', 'questions', 'lead_notes']) text += `DELETE FROM ${t} WHERE lead_id = ${lit(l)};\n`
    for (const l of probeLeads) text += `DELETE FROM project_invoices WHERE project_id IN (SELECT id FROM projects WHERE lead_id = ${lit(l)});\nDELETE FROM projects WHERE lead_id = ${lit(l)};\nDELETE FROM leads WHERE id = ${lit(l)};\n`
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
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1400) }
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const fab = async (p) => { await p.getByRole('button', { name: 'Maison AI' }).click(); await settle(p, 500) }
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  as('dane')
  try {
    // ── 1 · Workload ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The Workload view')
    const D = await desk(); const d = await D.newPage(); watch(d, 'studio')
    await go(d, '/projects')
    ok(await d.locator('[data-testid="projects-view"]').count() === 1, 'an Owner meets List · Workload on the listing')
    await d.locator('[data-testid="projects-view"]').getByRole('button', { name: 'Workload view' }).click(); await settle(d, 900)
    ok(/view=workload/.test(d.url()) && await d.locator('[data-testid="workload-view"]').count() === 1, 'Workload view opens, and the address keeps it')
    const running = Number(sql(`select count(*) from projects p join leads l on l.id=p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed'`))
    /* (the calm UI build 2026-10-27, a deliberate change — 3-15) the caption is one plain line ("Each person runs up to 4 projects"); what it counts
       is its tooltip and its data-counted */
    ok(Number(await d.locator('[data-testid="workload-caption"]').getAttribute('data-counted')) === running && /Each person runs up to \d+ project/.test(await d.locator('[data-testid="workload-caption"]').innerText()), `it counts the ${running} running projects the list shows`)
    const row = (id) => d.locator(`[data-testid="workload-row"][data-person="${id}"]`)
    const michelleN = Number(sql(`select count(*) from projects p join lead_assignees a on a.lead_id=p.lead_id join leads l on l.id=p.lead_id where a.member_id='michelle' and p.deleted_at is null and l.deleted_at is null and p.stage<>'completed'`))
    ok(await row('michelle').getAttribute('data-state') === (michelleN < 2 ? 'room' : michelleN === 2 ? 'full' : 'over') && (await row('michelle').innerText()).includes(`${michelleN} of 2`), `Michelle: ${michelleN} of her capacity 2, said in words`)
    ok((await row('germaine').innerText()).includes('of 3') && await row('germaine').locator('[data-testid="workload-block"]').count() === Number(sql(`select count(*) from projects p join lead_assignees a on a.lead_id=p.lead_id where a.member_id='germaine' and p.deleted_at is null and p.stage<>'completed'`)), 'Germaine: her own capacity 3, one block per running project')
    ok(/4 free slots/i.test(await row('alex').innerText()) && (await row('alex').getAttribute('data-default')) === '', 'Alex: the studio’s default 4, room for all of it')   // (the calm UI build 2026-10-27, a deliberate change — 3-15) "4 free slots"; the default rides data-default
    ok(await row('sarah').count() === 1 && await row('james').count() === 1, 'every Designer and Manager is listed, with nothing on them too')
    await shot(d, '01-workload-1440')
    /* the list's search narrows the view — 1.0 always counted the full list (A-170) */
    await d.locator('input[aria-label="Search projects"]').fill('Benjamin')
    await settle(d, 900)
    ok(await d.locator('[data-testid="workload-caption"]').getAttribute('data-counted') === '1', 'a search narrows what it counts')   // (the calm UI build 2026-10-27, a deliberate change)
    ok(await row('germaine').locator('[data-testid="workload-block"]').count() === 1 && await row('michelle').locator('[data-testid="workload-block"]').count() === 0, '…and each person’s blocks with it')
    await d.locator('[data-testid="workload-block"]').first().click(); await settle(d, 1500)
    ok(d.url().includes(`/projects/${ben}`) && /from=/.test(d.url()), 'a block opens its project, with the way back')
    await go(d, '/projects?view=workload')
    /* Set capacity, with Undo */
    await d.locator('[data-testid="workload-set"]').click(); await settle(d, 600)
    const capDlg = d.locator('[data-testid="capacity-dialog"]')
    ok(await capDlg.count() === 1, 'Set capacity opens for an Owner')
    await d.locator('[data-testid="capacity-alex"]').fill('25'); await settle(d, 200)
    ok(await d.getByRole('button', { name: 'Save' }).isDisabled() || /from 1 to 20/.test(await capDlg.innerText()), 'a number past 20 is refused in the field')
    await d.locator('[data-testid="capacity-alex"]').fill('5')
    await d.locator('[data-testid="capacity-save"]').click(); await settle(d, 1500)
    ok(sql(`select project_capacity from members where id='alex'`) === '5' && /Capacity saved for 1 person/.test(await snackText(d)), 'saved: Alex runs up to 5, said once')
    ok(/5 free slots/i.test(await row('alex').innerText()), 'the view follows at once')   // (the calm UI build 2026-10-27, a deliberate change) was "room for 5 more"
    await undo(d)
    ok(sql(`select coalesce(project_capacity,'') from members where id='alex'`) === '', 'Undo puts the studio default back')
    /* the Manager sees their team; a Designer meets no view */
    as('james'); await go(d, '/projects?view=workload')
    const people = await d.locator('[data-testid="workload-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-person')))
    ok(people.length === 3 && ['james', 'sarah', 'michelle'].every((x) => people.includes(x)) && await d.locator('[data-testid="workload-set"]').count() === 0, 'a Manager sees themselves and the Designers who report to them, and sets no capacity')
    as('sarah'); await go(d, '/projects?view=workload')
    /* (pending modules, a deliberate change of this rule — S45B · H-UHD-2) a Designer still meets no Members workload; once the studio keeps a
       contractor the view's toggle offers them its Contractors alone (no Members chip) — else the address falls back to the list as before */
    const keeps = sql(`select count(*) from vendors where is_contractor = 1 and is_active = 1`) !== '0'
    ok(await d.locator('[data-testid="workload-view"]').count() === 0 && await d.locator('[data-testid="workload-of"]').count() === 0
      && (keeps ? await d.locator('[data-testid="contractors-view"]').count() === 1 : await d.locator('[data-testid="projects-view"]').count() === 0), 'a Designer meets no Members workload — Contractors alone when the studio keeps contractors, else the list')
    as('dane')

    // ── 2 · Insights ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Company › Reports › Projects (was Projects › Insights, REG-1361)')
    await go(d, '/company/reports/projects')
    ok(await d.locator('[data-testid="project-insights-tiles"] > *').count() === 5 && await d.locator('[data-testid="tile-collection"]').count() === 1, 'an Owner reads five tiles, collection days among them')
    await d.locator('[data-testid="project-insights-range"]').getByRole('button').first().click(); await settle(d, 400)   // (the calm UI build 2026-10-27, a deliberate change) R-B3-1: the period is the house pill
    await d.getByRole('menuitemradio', { name: /^All time/ }).click(); await settle(d, 500)
    const startedAll = sql(`select count(*) from projects p join leads l on l.id=p.lead_id where p.deleted_at is null and l.deleted_at is null and p.started_at is not null`)
    const completedAll = sql(`select count(*) from projects p join leads l on l.id=p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage='completed'`)
    ok((await d.locator('[data-testid="tile-started"]').innerText()).includes(startedAll) && (await d.locator('[data-testid="tile-completed"]').innerText()).includes(completedAll), `All time: ${startedAll} started and ${completedAll} completed, from the records`)
    /* (parity P-28 · P-32, a deliberate change of this rule) the tile is named for its span and reads "n days" — never weeks */
    { const t = await d.locator('[data-testid="tile-duration"]').innerText(); ok(/Project length|Start → Completed/i.test(t) /* (the calm UI build 2026-10-27, a deliberate change) 5-09 */ && /\d+ days?|--/.test(t) && !/weeks/.test(t), 'Start → Completed reads in days, never weeks') }
    ok(await d.locator('[data-testid="project-insights-member-row"]').count() >= 4, 'By team member lists the people who run projects')
    await shot(d, '02-insights-1440')
    as('james'); await go(d, '/company/reports/projects')
    ok(((await d.locator('[data-testid="project-insights-scope"]').getAttribute('data-tip')) ?? '').startsWith('Your team’s projects') /* (the calm UI build 2026-10-27, a deliberate change) R-B3-1: the pill's tooltip */ && await d.locator('[data-testid="tile-collection"]').count() === 0, 'a Manager reads their team’s projects, without money')
    as('sarah'); await go(d, '/company/reports/projects')
    ok(await d.locator('[data-testid="project-insights-gate"]').count() === 1, 'a Designer meets the gate')
    as('dane')

    // ── 3 · The Compliance tab ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · The Compliance tab')
    await go(d, `/projects/${ben}/compliance`)
    /* (simplify S-06 · S-03, a deliberate change of this rule) Compliance is Tasks' second view: the checklist's kind rides in the view's grey line */
    ok(await d.locator('[data-testid="project-compliance"]').count() === 1 && /HDB flat/.test(await d.locator('[data-testid="project-compliance"]').innerText()), 'Benjamin’s HDB 5-Room reads the HDB flat’s checklist')
    ok(/^Tasks/.test(await d.locator('[role="tab"][aria-selected="true"]').innerText()) && /^Compliance/.test(await d.locator('[data-testid="project-view-chips"] [aria-checked="true"]').innerText()), 'the strip lights Tasks; the view switch marks Compliance')
    /* (simplify S-04 · S-06, a deliberate change of this rule) Compliance stops counting on the strip: its chip carries no count, and its view
       says in grey what is still to do in the phase the project is in — the number the phase's own chip says */
    /* (the calm UI build 2026-10-27, a deliberate change — 3-08 · 3-29) the phase is the list's one scope pill; its menu says each phase's "n to do",
       and the view's grey line says "n to do now" */
    await d.locator('[data-testid="compliance-phases"] button').click(); await settle(d, 300)
    const execChip = await d.locator('[data-testid="compliance-phase-execution"] [role="menuitemradio"]').innerText()
    await d.keyboard.press('Escape'); await settle(d, 200)
    const execOpen = (/(\d+) to do/.exec(execChip) ?? [])[1] ?? null
    const note = await d.locator('[data-testid="project-view-note"]').innerText()
    ok(!/\d/.test(await d.locator('[data-testid="project-view-chips"] [role="radio"]').filter({ hasText: 'Compliance' }).innerText()) && (execOpen ? note.includes(`${execOpen} to do now`) : /nothing to do now/.test(note)),
       `the strip doesn’t count Compliance; the view’s grey line says ${execOpen ?? 'nothing'} to do now`)
    ok(await d.locator('[data-testid="compliance-phases"]').innerText().then((t) => t.trim().startsWith('Execution')), 'it opens on the project’s own phase')
    const item = d.locator('[data-testid="compliance-item"][data-item="HDB_WATER_TEST"]')
    await item.locator('[data-testid="compliance-details"]').click(); await settle(d, 300)
    ok(/Source: HDB/.test(await item.locator('[data-testid="compliance-detail"]').innerText()), 'Details opens what to do and the official source in place')
    await shot(d, '03-compliance-1440')
    await item.locator('[data-testid="compliance-done"]').click(); await settle(d, 1500)
    ok(sql(`select state || '|' || by from project_compliance where project_id='${ben}' and item_id='HDB_WATER_TEST'`) === 'done|dane' && /marked done/.test(await snackText(d)), 'Mark done: on the record, by who, said once')
    ok(sql(`select count(*) from lead_events where project_id='${ben}' and kind='project_compliance_done' and json_extract(detail,'$.item')='HDB_WATER_TEST'`) === '1', '…with its Activity line')
    ok(/done/i.test(await item.locator('[class*="meta"]').first().innerText()) && /Dane|You/.test(await item.locator('[data-testid="compliance-who"]').innerText()), 'the row says Done, who and when')
    await undo(d)
    ok(sql(`select count(*) from project_compliance where project_id='${ben}' and item_id='HDB_WATER_TEST'`) === '0' && sql(`select count(*) from lead_events where project_id='${ben}' and kind='project_compliance_done' and json_extract(detail,'$.item')='HDB_WATER_TEST'`) === '0', 'Undo takes the answer and its line back')
    await item.locator('[data-testid="compliance-menu"]').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /Not needed/ }).click(); await settle(d, 1400)
    ok(sql(`select state from project_compliance where project_id='${ben}' and item_id='HDB_WATER_TEST'`) === 'not_needed', 'Not needed from the row’s menu')
    await undo(d)
    /* (the calm UI build 2026-10-27, a deliberate change — 3-08) the phase from its pill's menu */
    await d.locator('[data-testid="compliance-phases"] button').click(); await settle(d, 300)
    ok(/all answered/.test(await d.locator('[data-testid="compliance-phase-design"]').innerText()), 'Design’s row says all answered')
    await d.locator('[data-testid="compliance-phase-design"] [role="menuitemradio"]').click(); await settle(d, 400)
    ok(/^Design/.test((await d.locator('[data-testid="compliance-phases"]').innerText()).trim()) && await d.locator('[data-testid="compliance-done"]').count() === 0, 'Design: every item answered, as the works began')
    await go(d, `/projects/${ben}/compliance?item=HDB_RENO_PERMIT`)
    ok(await d.locator('[data-testid="compliance-item"][data-item="HDB_RENO_PERMIT"] [data-testid="compliance-detail"]').count() === 1, 'a deep link opens its item on its phase')
    as('alex'); await go(d, `/projects/${ben}/compliance`)
    ok(await d.locator('[data-testid="compliance-done"]').count() === 0, 'someone not on the team reads the list, with no Mark done')
    as('dane')
    await go(d, `/projects/${P('P-2025-001')}/compliance`)
    ok(await d.locator('[data-testid="compliance-phases"]').innerText().then((t) => t.trim().startsWith('Handover')), 'a completed project opens on Handover')   // (the calm UI build 2026-10-27, a deliberate change — 3-08) the pill names the phase

    // ── 4 · Starter tasks ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Starter tasks')
    ok(sql(`select count(*) from lead_tasks where lead_id='${marcusLead}' and compliance_item is not null`) === '10', 'Marcus’s condo started with its ten tasks')
    await go(d, `/projects/${marcus}/compliance`)
    const deposit = d.locator('[data-testid="compliance-item"][data-item="MCST_SECURITY_DEPOSIT"]')
    ok(/Has a task/.test(await deposit.innerText()), 'an item names its task')
    await deposit.locator('[data-testid="compliance-done"]').click(); await settle(d, 1500)
    ok(sql(`select done from lead_tasks where lead_id='${marcusLead}' and compliance_item='MCST_SECURITY_DEPOSIT'`) === '1', 'the item done → its task done')
    await undo(d)
    ok(sql(`select done from lead_tasks where lead_id='${marcusLead}' and compliance_item='MCST_SECURITY_DEPOSIT'`) === '0', 'Undo opens the task again')
    await go(d, `/projects/${marcus}/tasks`)
    const lew = d.getByRole('button', { name: 'Mark Engage Licensed Electrical Worker (LEW) as completed' }).first()
    await lew.click(); await settle(d, 1600)
    ok(sql(`select state from project_compliance where project_id='${marcus}' and item_id='ENGAGE_LEW'`) === 'done', 'the task ticked on the Tasks tab → its item done')
    /* the Settings switch, with Undo */
    await go(d, '/settings?section=projects')
    const sw = d.locator('[data-testid="compliance-starter-row"] label').first()
    await d.locator('#compliance-settings').scrollIntoViewIfNeeded()
    await sw.click(); await settle(d, 1400)
    ok(sql(`select value from settings where key='compliance_starter_tasks'`) === 'false', 'Settings › Projects › Compliance: off, saved')
    await shot(d, '04-settings-1440')
    await undo(d)
    ok(sql(`select value from settings where key='compliance_starter_tasks'`) === 'true', 'Undo turns it back on')
    /* a new project gets them */
    await go(d, '/projects')
    await d.keyboard.press('c'); await settle(d, 800)
    const dlg = d.locator('[role="dialog"][aria-label="New project"]')
    await dlg.getByLabel('Client name').fill('Probe Gap I')
    await dlg.getByLabel('Client’s phone number').fill('96417783')
    await dlg.getByLabel('Property type').click(); await settle(d, 300)
    await d.getByRole('option', { name: 'Landed — Terrace', exact: true }).click(); await settle(d, 200)
    await dlg.getByLabel('Agreed value (S$)').fill('88000')
    /* (S42F, a deliberate change of this rule) a project needs a member — an Owner picks one */
    await dlg.getByLabel('Assign member').click(); await settle(d, 500)
    await d.locator('[role="option"]').filter({ hasText: 'Germaine' }).first().click(); await d.keyboard.press('Escape'); await settle(d, 300)
    await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(d, 2600)
    const newLead = sql(`select id from leads where name='Probe Gap I'`)
    if (newLead) probeLeads.push(newLead)
    const landed = newLead ? sql(`select group_concat(compliance_item) from (select compliance_item from lead_tasks where lead_id='${newLead}' and compliance_item is not null order by created_at)`) : ''
    ok(!!newLead && new Set(landed.split(',')).size === 10 && sql(`select count(*) from lead_events where lead_id='${newLead}' and kind='project_compliance_tasks'`) === '1', 'a new landed project gets its ten flagged tasks, and its line')
    ok(!!newLead && sql(`select count(*) from lead_tasks t where t.lead_id='${newLead}' and t.compliance_item is not null and (select count(*) from task_assignees a where a.task_id = t.id) <> (select count(*) from lead_assignees x where x.lead_id = t.lead_id)`) === '0', '…each for the project’s team')

    // ── 5 · The Compliance Navigator ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · The Compliance Navigator')
    await go(d, '/projects'); await d.getByRole('button', { name: 'Tools', exact: true }).first().click(); await settle(d, 500)
    await d.getByRole('menuitem', { name: 'Compliance Navigator', exact: true }).click(); await settle(d, 1800)
    ok(new URL(d.url()).pathname === '/compliance' && await d.locator('[data-testid="navigator-action"]').count() === 5, 'the Tools tile is live: the Navigator, the studio’s five steps')
    const drc = d.locator('[data-testid="navigator-action"]').first()
    await drc.locator('[data-testid="navigator-steps-toggle"]').click(); await settle(d, 300)
    const studioName = sql(`select json_extract(value,'$.details.entities[0].name') from settings where key='brand'`) || sql(`select json_extract(value,'$.details.name') from settings where key='brand'`)
    ok(!studioName || (await drc.locator('[data-testid="navigator-steps"]').innerText()).includes(studioName), 'the steps carry the studio’s own name')
    await shot(d, '05-navigator-1440')
    /* (one-home N-07, a deliberate change of this rule) The studio's registrations are recorded once, on Company › Profile › Registrations &
       accreditations — the Navigator reads that record; its card's Mark done became the door to it. */
    await drc.locator('[data-testid="navigator-menu"]').click(); await settle(d, 300)   // (the calm UI build 2026-10-27, a deliberate change) — 6-02: Record as done is the card's ⋮ row
    const rec = d.locator('[data-testid="navigator-record"]')
    ok(await drc.locator('[data-testid="navigator-done"]').count() === 0 && await rec.count() === 1, 'the Navigator records nothing itself: Record as done (in Company › Profile) instead of Mark done')
    await rec.click(); await settle(d, 1800)
    const at = new URL(d.url())
    ok(at.pathname === '/company/profile' && at.searchParams.get('from') === '/compliance' && at.hash === '#registrations', '…which opens Profile’s registrations, with the way back')
    /* (pending modules S14, a deliberate change of this rule) repair R116 records the demo's HDB listing and CaseTrust as its brand shows them,
       so the toggle runs on a registration the studio has not recorded yet — bizSAFE */
    const REG = 'BIZSAFE_ENTERPRISE'
    const regRow = d.locator(`[data-testid="registration"][data-id="${REG}"]`)
    const regDone = () => sql(`select coalesce(json_extract(value,'$.${REG}.done'),'') from settings where key='compliance_studio'`)
    await regRow.scrollIntoViewIfNeeded(); await regRow.locator('label').first().click(); await settle(d, 1500)
    ok(regDone() === '1' && /Dane|You/.test(await regRow.innerText()), 'Done on Profile: kept on the server, by who and when')
    await undo(d)
    ok(!regDone(), 'Undo puts it back to do')
    await regRow.locator('label').first().click(); await settle(d, 1500)
    await go(d, '/compliance')
    ok(/done/i.test(await d.locator(`[data-testid="navigator-action"]#${REG}`).locator('[data-testid="navigator-state"]').innerText()), 'the Navigator reads Profile’s record: Done, by who and when')
    await go(d, '/company/profile#registrations')
    await d.locator(`[data-testid="registration"][data-id="${REG}"] label`).first().click(); await settle(d, 1500)
    ok(regDone() === '0', 'back to do on Profile (the run leaves it as found)')
    await go(d, '/compliance?tab=rules')
    const count = async () => d.locator('[data-testid="navigator-count"]').innerText()
    ok((await count()).startsWith('38 rules'), 'Rules by home: an HDB flat’s 38')
    await d.locator('[data-testid="navigator-kind"]').getByRole('radio', { name: 'Condo' }).click(); await settle(d, 300)
    ok((await count()).startsWith('29 rules'), '…a condo’s 29')
    await d.getByRole('button', { name: 'Search the rules' }).click().catch(() => {})
    await d.locator('input[aria-label="Search the rules"]').fill('MCST'); await settle(d, 500)
    ok(Number((await count()).split(' ')[0]) > 0 && Number((await count()).split(' ')[0]) < 29, 'search narrows the rules')
    await shot(d, '06-navigator-rules-1440')
    as('sarah'); await go(d, '/compliance')
    ok(await d.locator('[data-testid="navigator-record"]').count() === 0, 'a Designer reads the studio’s steps')   // (one-home N-07) no door to a record they may not change
    await go(d, '/company/profile')
    ok(await d.locator('[data-testid="registration"] input').first().isDisabled(), '…and reads the registrations on Profile, switches resting')
    as('dane')

    // ── 6 · Drafted by Maison AI ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Drafted by Maison AI')
    await go(d, `/projects/${ben}/schedule?draft=ai`); await settle(d, 600)
    const rebuild = d.locator('[data-testid="rebuild-dialog"]')
    ok(await rebuild.count() === 1 && await rebuild.locator('[data-testid="ai-draft"]').count() === 1, 'Draft a schedule from the quote opens the Rebuild dialog on Maison AI’s draft')
    const aiRow = (k) => rebuild.locator(`[data-testid="ai-draft-row"][data-key="${k}"]`)
    ok(/\bnew\b/i.test(await aiRow('permits').innerText()) && /\bkept\b/i.test(await aiRow('carpentry').innerText()), 'the HDB permit stage is new; the stages already there are kept')
    ok(/carpentry line/.test(await aiRow('carpentry').innerText()) && await rebuild.locator('[data-testid="ai-draft-notes"]').count() === 1, 'each milestone says why; Worth knowing shows the tips and the risks')
    await shot(d, '07-ai-rebuild-1440')
    await aiRow('painting').getByRole('checkbox').click({ force: true }); await settle(d, 300)
    ok(/Left out/.test(await aiRow('painting').innerText()), 'unticked: Painting is left out')
    await d.locator('[data-testid="rebuild-go"]').click(); await settle(d, 600)
    const confirm = d.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: 'Take off' }).last()
    if (await confirm.count()) { await confirm.getByRole('button', { name: 'Rebuild' }).click(); await settle(d, 1800) }
    ok(sql(`select count(*) from project_milestones where project_id='${ben}' and deleted_at is null and title='HDB permit & neighbours’ notice'`) === '1' && sql(`select count(*) from project_milestones where project_id='${ben}' and deleted_at is null and title='Painting'`) === '0', 'rebuilt: the permit stage in, Painting taken off')
    ok(/drafted by Maison AI/.test(await snackText(d)), 'the sentence names where it came from')
    await undo(d)
    ok(sql(`select count(*) from project_milestones where project_id='${ben}' and deleted_at is null and title='HDB permit & neighbours’ notice'`) === '0' && sql(`select count(*) from project_milestones where project_id='${ben}' and deleted_at is null and title='Painting'`) === '1', 'Undo puts the schedule back as it was')
    /* the Start card: Aisha's schedule set aside for the run */
    sql(`update project_milestones set deleted_at = 1 where project_id='${aisha}' and deleted_at is null`)
    await go(d, `/projects/${aisha}/schedule?draft=ai`)
    ok(await d.locator('[data-testid="start-schedule"] [data-testid="ai-draft"]').count() === 1, 'with no schedule yet, the Start card opens on Maison AI’s draft')
    await shot(d, '08-ai-start-1440', true)
    const drafted = await d.locator('[data-testid="start-schedule"] [data-testid="ai-draft-row"]').count()
    await d.locator('[data-testid="create-schedule"]').click(); await settle(d, 2000)
    ok(Number(sql(`select count(*) from project_milestones where project_id='${aisha}' and deleted_at is null`)) === drafted && sql(`select json_extract(detail,'$.source') from lead_events where project_id='${aisha}' and kind='project_schedule_created' order by at desc limit 1`).startsWith('drafted by Maison AI'), `Create schedule lands the ${drafted} milestones reviewed, its line names Maison AI`)

    // ── 7 · Maison AI acting ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Maison AI acting')
    await go(d, '/projects')
    await fab(d)
    await sheet(d).getByRole('button', { name: 'Find late milestones' }).click(); await settle(d, 1500)
    const ans = sheet(d).locator('[data-testid="maison-answer"]')
    ok(await ans.count() === 1 && /overdue|running late|Nothing is late|Nothing is overdue/.test(await ans.innerText()), 'Find late milestones answers in the sheet, from the records')   // (parity P-34, a deliberate change of this rule: "overdue" is the one word once the listing takes it)
    await shot(d, '09-maison-answer-1440')
    if (await ans.locator('[data-testid="maison-row"]').count()) {
      await ans.locator('[data-testid="maison-row"]').first().click(); await settle(d, 1600)
      ok(/\/schedule\?open=/.test(d.url()), 'a row opens the milestone’s panel on its schedule')
    } else ok(true, 'nothing late to open')
    await go(d, `/projects/${ben}`)
    await fab(d)
    await sheet(d).getByRole('button', { name: 'Add a task for the next step' }).click(); await settle(d, 1500)
    const prop = sheet(d).locator('[data-testid="maison-proposal"]')
    ok(await prop.count() === 1, 'Add a task for the next step proposes before it acts')
    await shot(d, '10-maison-proposal-1440')
    const before = Number(sql(`select count(*) from lead_tasks where lead_id='${benLead}'`))
    await prop.locator('[data-testid="maison-confirm"]').click(); await settle(d, 1600)
    ok(Number(sql(`select count(*) from lead_tasks where lead_id='${benLead}'`)) === before + 1 && sql(`select count(*) from lead_tasks where lead_id='${benLead}' and description='Added by Maison AI from the schedule.'`) === '1', 'the press adds the task through the Tasks tab’s action')
    ok(Number(sql(`select count(*) from task_assignees where task_id = (select id from lead_tasks where lead_id='${benLead}' and description='Added by Maison AI from the schedule.')`)) === Number(sql(`select count(*) from lead_assignees where lead_id='${benLead}'`)), '…for the project’s team')
    await fab(d)
    await sheet(d).getByRole('button', { name: 'Draft an update about this week' }).click(); await settle(d, 1500)
    await sheet(d).locator('[data-testid="maison-confirm"]').click(); await settle(d, 1600)
    ok(sql(`select status from project_updates where project_id='${ben}' order by created_at desc limit 1`) === 'draft' && /isn’t sent/.test(await snackText(d)), 'Draft an update saves a draft — never sent, the review rule untouched')
    as('alex'); await go(d, `/projects/${ben}`)
    await fab(d)
    await sheet(d).getByRole('button', { name: 'Add a task for the next step' }).click(); await settle(d, 1500)
    ok(await sheet(d).locator('[data-testid="maison-proposal"]').count() === 0 && /Only the project’s members/.test(await sheet(d).innerText()), 'someone not on the team is told the rule, with nothing to press')   // (parity P-17 · Q-05, a deliberate change of this rule) "Members" for a project's people
    as('dane')
    await D.close()

    // ── phone 390 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('· The phone (390)')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, '/projects?view=workload')
    ok(await m.locator('[data-testid="workload-row"]').count() >= 5 && await noOverflow(m), 'the Workload view as cards, no sideways scroll')
    await shot(m, '11-phone-workload', true)
    await go(m, `/projects/${ben}/compliance`)
    ok(await m.locator('[data-testid="compliance-item"]').count() > 5 && await noOverflow(m), 'the Compliance tab on a phone, no sideways scroll')
    await m.locator('[data-testid="compliance-item"]').first().locator('[data-testid="compliance-details"]').tap(); await settle(m, 300)
    await shot(m, '12-phone-compliance', true)
    await go(m, '/compliance')
    ok(await m.locator('[data-testid="navigator-action"]').count() === 5 && await noOverflow(m), 'the Navigator on a phone')
    await shot(m, '13-phone-navigator', true)
    await go(m, '/company/reports/projects')
    ok(await m.locator('[data-testid="project-insights-tiles"]').count() === 1 && await noOverflow(m), 'Insights on a phone')
    await shot(m, '14-phone-insights', true)
    await go(m, `/projects/${ben}/schedule?draft=ai`); await settle(m, 600)
    ok(await m.locator('[data-testid="ai-draft"]').count() === 1 && await noOverflow(m), 'Maison AI’s draft on a phone')
    await shot(m, '15-phone-ai-draft')
    await M.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    as('dane')
    putBack()
    await b.close()
    const left = sql(`select count(*) from leads where name='Probe Gap I'`)
    console.log(left === '0' ? '  (the database is as it was)' : `  ! ${left} probe leads left`)
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
