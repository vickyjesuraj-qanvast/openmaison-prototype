// The parity-map build, package P-E — the record, the schedule & the handover (the owner's "build everything that's in 1.0 to 2.0",
// 2026-10-10; map rows PR-058 · PR-121 · PR-122 · PR-123 · SC-016 · SC-056 · SC-084 · SC-094 · UC-084 · TD-022 · TD-023 · MO-101 · CP-064 ·
// FB-055 — and the door to FB-042 · FB-043). Each item asserted as the rule it builds, never another round's count:
//  PR-058           the project's ⋮ › Duplicate project: for a new client (name + phone), ☑ the schedule re-dated from works start, ☑ a draft of the
//                   signed quote — it lands on the new project, Setting up, on its own client record, every copied milestone Not started and the
//                   first on the day picked, the draft on the new record; "Project P-… created" with Undo, which takes it all back. The same
//                   client's copy is named "(copy)".
//  FB-042 · FB-043  the ⋮ › Commission opens P-C's dialog (the project's team, Owners and Admins); a Designer off the team has no row
//  PR-121 · MO-101  the Hand over sheet's "Vendors are paid": open while a PO or a bill is owed, its sum for an Owner, the count alone for a
//                   Designer, Open Costs to Money's Costs; deferrable as every row
//  PR-122 · PR-123  Costs and Margin in the Hand over sheet's Closing summary and on a completed project's Closing summary card — an Owner's and
//                   an Admin's, never a Designer's; the strip shows exactly when the margin line is the alert one
//  FB-055           with the studio paying no commission by default, completing a project with no rule of its own gives the Owners "Set
//                   commission for {project}" (its bell row opens the dialog); the completion's Undo takes it back
//  SC-084 · UC-084  a share sent directly rings the studio — Owners, Admins and the project's members, never whoever shared
//  SC-094           a variation order's "Adds days to the schedule" (General info; locked once approved), "+n days from changes" on the Schedule, its
//                   dialog's Move the schedule (the milestone runs n days longer, what follows moves) and Not now, each with Undo; the VO's
//                   paper prints "Adds n days to the schedule"; Needs you's "VO-1 adds 3 days — move what follows?" (once the Overview's
//                   loader passes `voDays` — the orchestrator's wiring)
//  CP-064           a Blocked milestone's "Expected to resume" day is kept, and leaves with the pause
//  SC-016           Save as a template keeps a milestone's description, colour and links by position; a template row's Details edits them
//  SC-056 · TD-023  the milestone panel's Suggest tasks: a tick list from the quote's lines and the stage's usual steps; Add makes tasks in the
//  TD-022           milestone, Undo takes them back; Tasks › Add Task › Suggest tasks from the quote — the signed quote's sections as tasks
//  Phone 390        the Duplicate dialog and the Hand over sheet as sheets, no sideways scroll.
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pm-e.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-e')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3123'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pme-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const DAY = 86_400_000
const dayNum = (ms) => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const T0 = Math.floor(Date.now() / 1000) - 2
  const you = sql(`select id from members where is_you = 1`)
  const ben = P('P-2026-002'), ryan = P('P-2026-001'), aisha = P('P-2026-003'), shalini = P('P-2025-001')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const benLead = leadOf(ben), ryanLead = leadOf(ryan), aishaLead = leadOf(aisha)
  const ids = `'${ben}','${ryan}','${aisha}'`, leads = `'${benLead}','${ryanLead}','${aishaLead}'`
  const ryanVo = sql(`select id from quotes where project_id='${ryan}' and kind='variation' and number='VO-1' and deleted_at is null`)
  const aishaVo = sql(`select id from quotes where project_id='${aisha}' and kind='variation' and number='VO-1' and deleted_at is null`)
  /* what the run may change, kept to put back */
  const SNAP = [
    ['projects', `id in (${ids})`], ['project_milestones', `project_id in (${ids})`], ['project_milestone_links', `project_id in (${ids})`],
    ['project_milestone_extensions', `project_id in (${ids})`], ['project_schedule_shares', `project_id in (${ids})`], ['project_share_requests', `project_id in (${ids})`],
    ['lead_tasks', `lead_id in (${leads})`], ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`], ['lead_events', `lead_id in (${leads})`],
    ['notifications', '1'], ['commission_rules', '1'], ['schedule_templates', '1'], ['schedule_template_items', '1'],
    ['quotes', `id in ('${ryanVo}','${aishaVo}')`], ['settings', `key in ('project_numbers_given','project_handover')`], ['notification_outbox', '1'],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const putBack = () => {
    let text = 'PRAGMA foreign_keys = ON;\nBEGIN;\n'
    /* anything the run made from nothing: a duplicate (its client record takes the rest with it), its draft quote */
    text += `DELETE FROM projects WHERE created_at >= ${T0} AND id NOT IN (${ids});\nDELETE FROM leads WHERE direct = 1 AND created_at >= ${T0};\n`
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  as('dane')
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }))
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url, page = p) => { await page.goto(BASE + url, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000) }
    const shot = (n, full = false, page = p) => page.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = (page = p) => page.locator('[data-om-snackbar]')   // the house host — other live regions on the page are not it
    const onProject = (u, id) => new URL(String(u)).pathname.replace(/\/$/, '') === `/projects/${id}`
    const offProject = (u, id) => { const path = new URL(String(u)).pathname; return /^\/projects\/[0-9a-f-]{36}$/.test(path) && !path.includes(id) }
    const undo = async (page = p) => { await snack(page).getByRole('button', { name: 'Undo' }).last().click(); await page.waitForTimeout(1800) }
    const dialog = (page = p) => page.locator('[role="dialog"]').last()
    const menu = (name, page = p) => page.getByRole('menuitem', { name })
    const kebab = async (page = p) => { await page.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await page.waitForTimeout(400) }
    const stageTo = async (row, page = p) => { await page.locator('[data-testid="project-stage"] button').click(); await page.waitForTimeout(400); await menu(new RegExp(`^${row}`), page).click() }
    const row = (title, page = p) => page.locator('[data-testid="schedule-timeline"] [data-kb-row]').filter({ hasText: title }).first()
    const openMs = async (title, page = p) => { await row(title, page).locator('[data-testid="milestone-name"]').click(); await page.waitForTimeout(900) }
    const panel = (page = p) => page.locator('[data-testid="milestone-panel"]')

    // ── PR-058 · Duplicate project ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('PR-058 · Duplicate project')
    const benMs = Number(sql(`select count(*) from project_milestones where project_id='${ben}' and deleted_at is null`))
    await go(`/projects/${ben}`)
    await kebab()
    ok(await menu(/^Duplicate project$/).count() === 1 && await menu(/^Commission$/).count() === 1, 'the ⋮ carries Commission and Duplicate project — no "…" (Q-12)')
    await menu(/^Duplicate project$/).click(); await p.waitForTimeout(1200)
    await p.locator('[data-testid="duplicate-dialog"]').waitFor({ timeout: 8000 })
    ok(await p.locator('[data-testid="duplicate-schedule"]').count() === 1 && await p.locator('[data-testid="duplicate-quote"]').count() === 1, 'it offers the schedule and the signed quote (Benjamin has both)')
    await shot('pm-e-duplicate-1440')
    await p.locator('[data-testid="duplicate-for"] button').filter({ hasText: 'A new client' }).click(); await p.waitForTimeout(200)
    await p.locator('[data-testid="duplicate-save"]').click(); await p.waitForTimeout(600)
    ok(/This field is required/.test(await dialog().innerText()), 'a new client needs a name and a phone — the house words, nothing saved')
    await p.locator('input[name="duplicate-name"]').fill('probe client')
    await dialog().getByLabel(/Client’s phone number/).fill('91234567')
    await p.locator('[data-testid="duplicate-save"]').click()
    await p.waitForURL((u) => offProject(u, ben), { timeout: 15000 }); await p.waitForTimeout(1500)   // its `?from=` names the source — the path is the copy's
    const dup = sql(`select id from projects where created_at >= ${T0} and id not in (${ids}) order by created_at desc limit 1`)
    const dupLead = dup ? leadOf(dup) : ''
    ok(!!dup && onProject(p.url(), dup) && new URL(p.url()).searchParams.get('from') === `/projects/${ben}`, 'it lands on the new project — Back returns to the source (?from=)')
    ok(/Project P-\d{4}-\d+ created/.test(await snack().innerText()) && await snack().getByRole('button', { name: 'Undo' }).count() >= 1, '“Project P-… created” with Undo')
    ok(sql(`select stage from projects where id='${dup}'`) === 'setting_up' && sql(`select direct || '|' || name || '|' || phone from leads where id='${dupLead}'`) === '1|Probe Client|91234567', 'Setting up, on its own client record (direct) — the name title-cased, the phone as digits')
    const dms = json(`select status, start_date from project_milestones where project_id='${dup}' and deleted_at is null`)
    ok(dms.length === benMs && dms.every((m) => m.status === 'not_started') && Math.min(...dms.map((m) => dayNum(m.start_date * 1000))) === dayNum(Date.now()), `the schedule copied (${dms.length} milestones), every one Not started, the first on works start (today)`)
    ok(sql(`select count(*) from quotes where lead_id='${dupLead}' and kind='quote' and status='Draft' and deleted_at is null`) === '1', 'a draft of the signed quote on the new record')
    ok(sql(`select count(*) from lead_events where project_id='${dup}' and kind='parity_e_duplicated'`) === '1' && sql(`select count(*) from lead_events where project_id='${ben}' and kind='parity_e_duplicated_to' and at >= ${T0}`) === '1', 'Activity on both: duplicated from … · duplicated as …')
    await shot('pm-e-duplicated-1440')
    await undo(); await p.waitForTimeout(800)
    ok(sql(`select count(*) from projects where id='${dup}'`) === '0' && sql(`select count(*) from leads where id='${dupLead}'`) === '0' && sql(`select count(*) from lead_events where project_id='${ben}' and kind='parity_e_duplicated_to' and at >= ${T0}`) === '0', 'Undo: the copy and its client record are gone, the source’s line too')
    ok(onProject(p.url(), ben), 'Undo returns to the project it came from')
    /* the same client, nothing copied: "(copy)" */
    await kebab(); await menu(/^Duplicate project$/).click(); await p.locator('[data-testid="duplicate-dialog"]').waitFor({ timeout: 8000 }); await p.waitForTimeout(400)
    await p.locator('[data-testid="duplicate-schedule"]').click(); await p.locator('[data-testid="duplicate-quote"]').click(); await p.waitForTimeout(200)
    await p.locator('[data-testid="duplicate-save"]').click()
    await p.waitForURL((u) => offProject(u, ben), { timeout: 15000 }); await p.waitForTimeout(1500)
    const dup2 = sql(`select id from projects where created_at >= ${T0} and id not in (${ids}) order by created_at desc limit 1`)
    ok(/\(copy\)$/.test(sql(`select name from projects where id='${dup2}'`)) && sql(`select count(*) from project_milestones where project_id='${dup2}'`) === '0', 'for the same client: “… (copy)”, no schedule when unticked')
    await undo()

    // ── FB-042 · FB-043 · the door to Commission ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Commission')
    await go(`/projects/${ben}`)
    await kebab(); await menu(/^Commission$/).click(); await p.waitForTimeout(1500)
    ok(await p.locator('[data-testid="project-commission-save"], [data-testid="project-commission-close"]').count() > 0, 'the ⋮ › Commission opens the project’s commission dialog (P-C’s)')
    await shot('pm-e-commission-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    as('alex')   // a Designer who sees Benjamin but is not on his team
    await go(`/projects/${ben}`)
    if (await p.locator('[data-testid="project-page"]').count()) { await kebab(); ok(await menu(/^Commission$/).count() === 0, 'a Designer off the team has no Commission row') ; await p.keyboard.press('Escape') }
    else ok(true, 'a Designer off the team does not see the project at all (Who sees leads)')
    as('dane')

    // ── PR-121 · MO-101 · PR-122 · PR-123 · the Hand over sheet ────────────────────────────────────────────────────────────────────────────
    console.log('Hand over sheet — vendors, costs and margin')
    await go(`/projects/${ben}`)
    await stageTo('Completed'); await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await p.waitForTimeout(600)
    const vend = p.locator('[data-testid="check-vendors"]')
    ok(await vend.count() === 1 && await vend.getAttribute('data-met') === 'no' && /still owed — S\$[\d,]+\.\d\d/.test(await vend.innerText()), 'Vendors are paid: open while a PO or a bill is owed — with the sum, for an Owner')
    ok(await p.locator('[data-testid="check-vendors-defer"]').count() === 1, 'deferrable, as every row')
    ok(await p.locator('[data-testid="summary-costs"]').count() === 1 && await p.locator('[data-testid="summary-margin"]').count() === 1, 'the Closing summary: Costs and Margin (an Owner)')
    const alert = await p.locator('[data-testid="summary-margin"][data-open]').count()
    ok((await p.locator('[data-testid="handover-margin-warning"]').count()) === alert, 'the strip shows exactly when the margin is more than 25 points off the expected')
    await shot('pm-e-handover-1440')
    await p.locator('[data-testid="check-vendors-go"]').click(); await p.waitForTimeout(1400)
    ok(/\/money/.test(p.url()) && /#costs/.test(p.url()), 'Open Costs lands on Money’s Costs')
    as('germaine')   // a Designer on Benjamin's team
    await go(`/projects/${ben}`)
    await stageTo('Completed'); await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await p.waitForTimeout(600)
    ok(/still owed\./.test(await p.locator('[data-testid="check-vendors"]').innerText()) && !/S\$/.test(await p.locator('[data-testid="check-vendors"]').innerText()), 'a Designer reads the count, never the sum (F1-Q2)')
    ok(await p.locator('[data-testid="summary-costs"]').count() === 0 && await p.locator('[data-testid="summary-margin"]').count() === 0, 'no Costs or Margin for a Designer')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await go(`/projects/${shalini}`)
    ok(await p.locator('[data-testid="closing-costs"]').count() === 0, 'a completed project’s card shows a Designer no costs')
    as('dane')
    await go(`/projects/${shalini}`)
    ok(await p.locator('[data-testid="closing-costs"]').count() === 1 && await p.locator('[data-testid="closing-margin"]').count() === 1, 'the completed project’s Closing summary card: Costs and Margin for an Owner')
    await shot('pm-e-closing-card-1440', true)

    // ── FB-055 · the commission task at completion ──────────────────────────────────────────────────────────────────────────────────────
    console.log('FB-055 · Set commission for …')
    const ryanName = sql(`select name from projects where id='${ryan}'`)
    sql(`update commission_rules set basis = 'none' where member_id is null and project_id is null and ended_at is null`)
    as('huimin')   // an Admin completes it — the Owners' bell row is Dane's (`notify` never rings whoever acts)
    await go(`/projects/${ryan}`)
    await stageTo('Completed'); await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await p.waitForTimeout(500)
    if (await p.locator('input[name="handover-reason"]').count()) await p.locator('input[name="handover-reason"]').fill('Probe — completed to read the commission rule')
    await p.locator('[data-testid="handover-primary"]').click(); await p.waitForTimeout(2200)
    ok(sql(`select stage from projects where id='${ryan}'`) === 'completed', 'Ryan’s project completed (an Admin, anyway with a reason)')
    const title = `Set commission for ${ryanName}`.replace(/'/g, "''")
    ok(sql(`select count(*) from lead_tasks where lead_id='${ryanLead}' and title='${title}' and done=0`) === '1' && sql(`select count(*) from notifications where kind='task_assigned' and href='/projects/${ryan}?commission=1' and member_id='dane' and created_at >= ${T0}`) === '1', 'no rule decides it: the Owners get “Set commission for …”, its bell row opens the dialog')
    await undo()
    ok(sql(`select stage from projects where id='${ryan}'`) === 'in_progress' && sql(`select count(*) from lead_tasks where lead_id='${ryanLead}' and title='${title}'`) === '0', 'the completion’s Undo takes the task back with it')
    sql(`update commission_rules set basis = 'payments' where member_id is null and project_id is null and ended_at is null`)
    as('dane')

    // ── SC-084 · UC-084 · a share rings the studio ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('SC-084 · schedule_shared')
    /* a change to share: Painting a day longer */
    sql(`update project_milestones set end_date = end_date + 86400 where project_id='${ben}' and title='Painting' and deleted_at is null`)
    await go(`/projects/${ben}/schedule`)
    if (await p.locator('[data-testid="schedule-share"]').count()) {
      await p.locator('[data-testid="schedule-share"]').click(); await p.waitForTimeout(800)
      await dialog().getByRole('button', { name: /^Share/ }).last().click(); await p.waitForTimeout(1800)
      ok(sql(`select count(*) from notifications where kind='schedule_shared' and member_id='germaine' and created_at >= ${T0}`) === '1' && sql(`select count(*) from notifications where kind='schedule_shared' and member_id='huimin' and created_at >= ${T0}`) === '1', 'a direct share rings the project’s members and the Admins')
      ok(sql(`select count(*) from notifications where kind='schedule_shared' and member_id='dane' and created_at >= ${T0}`) === '0', '…never whoever shared it')
    } else ok(false, 'Benjamin has a change to share')

    // ── SC-094 · a variation order's days ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('SC-094 · Adds days to the schedule')
    await go(`/quotes/${aishaVo}`)
    const daysBox = p.locator('input[name="vo-days"]')
    ok(await daysBox.count() === 1 && await daysBox.isEnabled(), 'a VO with the client: General info’s Adds days to the schedule')
    await daysBox.fill('2'); await daysBox.blur(); await p.waitForTimeout(1200)
    ok(sql(`select timeline_days from quotes where id='${aishaVo}'`) === '2', 'it saves as it is left')
    await go(`/quotes/${aishaVo}/preview`)
    ok(/Adds 2 days to the schedule/.test(await p.locator('body').innerText()), 'the VO’s paper prints it')
    await go(`/quotes/${ryanVo}`)
    ok(await p.locator('input[name="vo-days"]').isDisabled() && /revise the order/.test(await p.locator('body').innerText()), 'an approved VO’s days are locked, and it says why')
    sql(`update quotes set timeline_days = 3 where id='${ryanVo}'`)
    await go(`/projects/${ryan}`)
    const needRow = p.locator('[data-testid="need-vo-days"]')
    if (await p.locator('[data-testid="needs-more"]').count() && !(await needRow.count())) { await p.locator('[data-testid="needs-more"]').click(); await p.waitForTimeout(300) }
    ok(await needRow.count() === 1 && /VO-1 adds 3 days — move what follows\?/.test(await needRow.innerText()), 'Needs you: “VO-1 adds 3 days — move what follows?” (needs the Overview loader’s `voDays`)')
    await go(`/projects/${ryan}/schedule`)
    const chip = p.locator('[data-testid="vo-days"]')
    ok(await chip.count() === 1 && /\+3 days from changes/i.test(await chip.innerText()), 'the Schedule’s toolbar: “+3 days from changes”')
    await chip.click(); await p.waitForTimeout(700)
    ok(await p.locator('[data-testid="vo-days-dialog"]').isVisible() && /runs 3 days longer/.test(await dialog().innerText()), 'its dialog says what the move does before the press')
    await shot('pm-e-vo-days-1440')
    /* the milestone the dialog picked (the running one first) — read from its own preview line, "{milestone} ends …" */
    const pickName = (await p.locator('[data-testid="vo-days-preview"]').innerText()).replace(/ ends .*$/s, '').trim()
    const picked = json(`select id, end_date from project_milestones where project_id='${ryan}' and deleted_at is null and title='${pickName.replace(/'/g, "''")}' limit 1`)[0]
    ok(!!picked && sql(`select status from project_milestones where id='${picked.id}'`) !== 'done', `the dialog picks a milestone still to do (${pickName})`)
    await p.locator('[data-testid="vo-days-move"]').click(); await p.waitForTimeout(1800)
    ok(Number(sql(`select end_date from project_milestones where id='${picked.id}'`)) === picked.end_date + 3 * 86400 && sql(`select count(*) from lead_events where project_id='${ryan}' and kind='parity_e_vo_days' and json_extract(detail,'$.answer')='moved'`) === '1', `Move the schedule: ${pickName || 'the running milestone'} runs 3 days longer; the answer is on the record`)
    ok(/runs 3 days longer for VO-1/.test(await snack().innerText()), 'one sentence, with Undo')
    await undo()
    ok(Number(sql(`select end_date from project_milestones where id='${picked.id}'`)) === picked.end_date && sql(`select count(*) from lead_events where project_id='${ryan}' and kind='parity_e_vo_days'`) === '0', 'Undo: the dates back, the answer gone — the VO waits again')
    await go(`/projects/${ryan}/schedule?vo=${ryanVo}`)
    await p.locator('[data-testid="vo-days-not-now"]').click(); await p.waitForTimeout(1500)
    ok(sql(`select count(*) from lead_events where project_id='${ryan}' and kind='parity_e_vo_days' and json_extract(detail,'$.answer')='not_now'`) === '1' && /\+3 days from changes/i.test(await p.locator('[data-testid="vo-days"]').innerText()), 'Not now: the dates stay, the days still counted')

    // ── CP-064 · a Blocked milestone's expected restart ────────────────────────────────────────────────────────────────────────────────────
    console.log('CP-064 · Expected to resume')
    await go(`/projects/${ben}/schedule`)
    await openMs('Painting')
    await panel().getByRole('radio', { name: 'Blocked' }).click(); await p.waitForTimeout(300)
    /* a date field is a trigger (no <input>): its button, named by its label, opens the picker; the picker's Today picks */
    const resume = panel().getByRole('button', { name: 'Expected to resume (optional)' })
    ok(await resume.count() === 1, 'Blocked: an optional Expected to resume')
    await resume.click(); await p.waitForTimeout(400)
    await p.getByRole('button', { name: 'Today', exact: true }).last().click(); await p.waitForTimeout(300)
    await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(1600)
    const pm = M => sql(`select ${M} from project_milestones where project_id='${ben}' and title='Painting' and deleted_at is null`)
    ok(pm('status') === 'blocked' && pm('resume_on') !== '', 'saved: Blocked, with its restart day')
    await undo()
    ok(pm('status') === 'not_started' && pm('resume_on') === '', 'Undo: as it was')

    // ── SC-016 · Save as a template keeps the words, the colour, the links ───────────────────────────────────────────────────────────────
    console.log('SC-016 · templates keep description · colour · links')
    sql(`update project_milestones set description = 'Two coats, the client’s colours', color = 'teal' where project_id='${ben}' and title='Painting' and deleted_at is null`)
    await go(`/projects/${ben}/schedule`)
    await p.locator('[data-testid="schedule-kebab"]').click(); await p.waitForTimeout(300)
    await menu(/^Save as a template/).click(); await p.waitForTimeout(400)
    await dialog().locator('input').first().fill('Probe — Benjamin’s schedule')
    await p.locator('[data-testid="name-dialog-save"]').click(); await p.waitForTimeout(1500)
    const tpl = sql(`select id from schedule_templates where name like 'Probe — Benjamin%' order by created_at desc limit 1`)
    ok(!!tpl && sql(`select description || '|' || color from schedule_template_items where template_id='${tpl}' and title='Painting'`) === 'Two coats, the client’s colours|teal', 'the template keeps the milestone’s description and colour')
    await go(`/templates/schedules/${tpl}`)
    await p.locator('[data-testid="schedule-item"]').nth(2).locator('[data-testid="template-item-kebab"]').click(); await p.waitForTimeout(300)
    await menu(/^Details/).click(); await p.waitForTimeout(500)
    ok(await p.locator('[data-testid="template-item-details"]').isVisible(), 'a row’s ⋮ › Details: its description, colour and what it waits on')
    await p.locator('[data-testid="template-item-waits"] button').first().click(); await p.waitForTimeout(150)
    await shot('pm-e-template-details-1440')
    await p.locator('[data-testid="template-item-details-save"]').click(); await p.waitForTimeout(1600)
    const fj = sql(`select follows_json from schedule_template_items where template_id='${tpl}' and position=2`)
    ok(/\[0,1\]|\[1,0\]/.test(fj), `the links by position are saved (${fj})`)

    // ── SC-056 · TD-023 · TD-022 · suggested tasks ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('SC-056 · TD-022 · suggested tasks')
    await go(`/projects/${ben}/schedule`)
    await openMs('Carpentry fabrication')
    ok(await panel().locator('[data-testid="panel-ask-maison"]').count() === 1, 'the panel’s quiet “Ask Maison AI about this” (P-H’s sheet)')
    await panel().locator('[data-testid="panel-suggest-tasks"]').click(); await p.waitForTimeout(600)
    const sRows = p.locator('[data-testid="suggest-row"]')
    ok(await sRows.count() >= 3 && await p.locator('[data-testid="suggest-row"][data-source="quote"]').count() >= 1, 'Suggest tasks: the quote’s carpentry lines first, then the stage’s usual steps')
    ok(await p.locator('[data-testid="suggest-add"]').isDisabled(), 'nothing ticked until you tick it')
    await sRows.nth(0).locator('label').click(); await sRows.nth(1).locator('label').click(); await p.waitForTimeout(200)
    await shot('pm-e-suggest-1440')
    const carp = sql(`select id from project_milestones where project_id='${ben}' and title='Carpentry fabrication' and deleted_at is null`)
    const tBefore = Number(sql(`select count(*) from lead_tasks where milestone_id='${carp}'`))
    await p.locator('[data-testid="suggest-add"]').click(); await p.waitForTimeout(1800)
    ok(Number(sql(`select count(*) from lead_tasks where milestone_id='${carp}'`)) === tBefore + 2, 'Add 2 tasks: two tasks inside the milestone')
    await undo()
    ok(Number(sql(`select count(*) from lead_tasks where milestone_id='${carp}'`)) === tBefore, 'Undo takes them back')
    await go(`/projects/${ben}/tasks`)
    await p.getByRole('button', { name: /^Add Task/ }).first().click(); await p.waitForTimeout(400)
    ok(await menu(/^Suggest tasks from the quote/).count() === 1, 'Tasks › Add Task offers Suggest tasks from the quote (a signed quote with lines)')
    await menu(/^Suggest tasks from the quote/).click(); await p.waitForTimeout(1500)
    ok(await p.locator('[data-testid="quote-tasks-section"]').count() >= 1, 'its sections, each with its lines as tasks')
    const allT = Number(sql(`select count(*) from lead_tasks where lead_id='${benLead}'`))
    await p.locator('[data-testid="quote-tasks-row"]').first().locator('label').click(); await p.waitForTimeout(150)
    await shot('pm-e-quote-tasks-1440')
    await p.locator('[data-testid="quote-tasks-add"]').click(); await p.waitForTimeout(1800)
    ok(Number(sql(`select count(*) from lead_tasks where lead_id='${benLead}'`)) === allT + 1, 'one ticked, one task added')
    await undo()
    ok(Number(sql(`select count(*) from lead_tasks where lead_id='${benLead}'`)) === allT, 'Undo takes it back')
    await ctx.close()

    // ── Phone 390 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 160)}`))
    await go(`/projects/${ben}`, q)
    await q.locator('[data-testid="project-page"] header').getByRole('button', { name: 'More options' }).click(); await q.waitForTimeout(600)
    await menu(/^Duplicate project$/, q).click(); await q.waitForTimeout(1400)
    ok(await q.locator('[data-testid="duplicate-dialog"]').isVisible() && await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), 'the Duplicate dialog as a sheet — no sideways scroll at 390')
    await q.screenshot({ path: path.join(dir, 'pm-e-duplicate-390.png') })
    await q.keyboard.press('Escape'); await q.waitForTimeout(400)
    await q.locator('[data-testid="project-stage"] button').click(); await q.waitForTimeout(500)
    await q.getByRole('menuitem', { name: /^Completed/ }).click()
    await q.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await q.waitForTimeout(1200)
    ok(await q.locator('[data-testid="check-vendors"]').count() === 1 && await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), 'the Hand over sheet with Vendors are paid — fits 390')
    await q.screenshot({ path: path.join(dir, 'pm-e-handover-390.png') })
    await ph.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).split('\n')[0])
  } finally {
    putBack()
    as(you || 'dane')
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
