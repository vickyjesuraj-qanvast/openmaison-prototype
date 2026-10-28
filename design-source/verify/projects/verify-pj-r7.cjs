// Projects round 7 — ending and rules: Complete handover's checklist (unmet items with their own button, Complete anyway with a reason), a
// completed project read-only (the schedule's controls gone, a money press refused on the server), Reopen with a reason, the owner's review
// (Settings › Projects › Handover needs an owner's review: a Designer asks, the Owner sends back, then approves), Delete refused while money is
// recorded, the soft delete + Undo + the Deleted projects sheet (Restore · Delete Forever), Q-27 (a lead with a project refuses its delete),
// Make the project again on a Won lead whose project is deleted, the seeded completed project (hidden under the default scope) and deleted one,
// Settings › Projects in the house order (a Designer reads it), the Who may do what rows, Notifications' project rows and the Q-29 line, and
// the phone. Run against `next start -p 3022` on the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-r7.cjs <scratch.db> [shotDir] [base URL]   (BASE in the environment wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r7')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3022'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const ENDING_COLS = ['stage', 'completed_at', 'completed_by', 'complete_note', 'complete_reason', 'handover_requested_by', 'handover_requested_at', 'handover_note', 'handover_review_note', 'handover_reviewed_by', 'handover_reviewed_at', 'reopened_by', 'reopened_at', 'reopen_reason', 'deleted_at', 'deleted_by', 'updated_at']

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), shalini = P('P-2025-001')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), aishaLead = leadOf(aisha)
  /* a throwaway direct project for the review and delete flows: Germaine's, running, no milestones and no payment stages — a met checklist */
  const T0 = Math.floor(Date.now() / 1000) - 2
  const tLead = 'probe-r7-lead', tPid = 'probe-r7-project', tName = 'Kitchen refresh — Probe Ong'
  const before = json(`select id, ${ENDING_COLS.join(', ')} from projects where id in ('${ryan}','${aisha}','${ben}','${shalini}')`)
  const shaliniLead = leadOf(shalini)
  const settingsBefore = json(`select * from settings where key in ('project_handover','project_schedule_defaults')`)
  sql(`delete from leads where id='${tLead}'`)
  sql(`insert into leads (id, name, phone, source, property_type, stage, direct, created_at, updated_at, seen_at, budget_minor) values ('${tLead}', 'Probe Ong', '93330001', 'Others', 'HDB 4-Room', 'Won', 1, ${T0 - 86400}, ${T0 - 86400}, ${T0 - 86400}, 1200000)`)
  sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at) values ('probe-r7-assignee', '${tLead}', 'germaine', ${T0 - 86400})`)
  sql(`insert into projects (id, lead_id, number, name, stage, project_type, agreed_value_minor, start_date, started_at, created_by, created_at, updated_at) values ('${tPid}', '${tLead}', 'P-2026-901', '${tName}', 'in_progress', 'Partial renovation', 1200000, ${T0 - 3600}, ${T0 - 3600}, 'germaine', ${T0 - 86400}, ${T0 - 3600})`)
  sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail, project_id) values ('probe-r7-ev', '${tLead}', 'project_created', 'germaine', ${T0 - 86400}, '{"name":"${tName}","number":"P-2026-901","direct":true}', '${tPid}')`)
  /* (simplify S-19, a deliberate change of this rule) an HDB home's mandatory compliance Handover item is on the checklist now — answered, so the
     probe project's checklist is met as before */
  sql(`insert into project_compliance (id, project_id, item_id, state, by, at) values ('probe-r7-cmp', '${tPid}', 'DEFECTS_LIABILITY_12M', 'done', 'germaine', ${T0 * 1000})`)
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
    const kebab = async () => { await p.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(350) }
    const menu = (name) => p.getByRole('menuitem', { name })
    /* (parity P-08, a deliberate change of this rule) the ending's moves are stage rows: Stage ▾ › Completed runs Complete handover (or Review) */
    const stageTo = async (row) => { await p.locator('[data-testid="project-stage"] button').click(); await p.waitForTimeout(350); await menu(new RegExp(`^${row}`)).click() }
    const handover = () => p.locator('[data-testid="handover-dialog"]')
    const primary = () => p.locator('[data-testid="handover-primary"]')
    const bar = () => p.locator('[data-testid="handover-bar"]')
    const stage = (pid) => sql(`select stage from projects where id='${pid}'`)

    // ── Settings › Projects, in the house order (Dane, Owner) ────────────────────────────────────────────────────────────────
    console.log('Settings › Projects')
    as('dane')
    await go('/settings?section=projects')
    // (one-home N-11 · N-12, a deliberate change of this rule) Schedule defaults is the Schedule card's Studio default row
    // (simplify S-15 · S-20, a deliberate change of this rule) the module opens on What waits for an Owner or an Admin (the Updates card's one
    // rule among them); Invoices and Credit notes went to Settings › Finance
    const order = await p.evaluate(() => ['owner-approvals', 'project-numbering', 'handover-setting', 'schedule-settings'].map((t) => { const el = document.querySelector(`[data-testid="${t}"]`); return el ? el.getBoundingClientRect().top + window.scrollY : -1 }))
    ok(order.every((y) => y >= 0) && order.every((y, i) => i === 0 || y > order[i - 1]), 'the module in the house order: What waits for an Owner or an Admin · Numbers · Stages and handover · Schedule')
    ok((await p.locator('[data-testid="invoice-settings"], [data-testid="credit-settings"], [data-testid="payment-settings"], [data-testid="update-review-setting"]').count()) === 0, 'the money cards and the Updates card are not on Settings › Projects any more')
    ok((await p.locator('[data-testid="schedule-defaults"]').count()) === 0, 'no separate Schedule defaults card — one place asks where a schedule starts')
    ok(!(await p.locator('[data-testid="handover-review-row"] input').first().isChecked()), 'Handover needs an owner’s review is off by default')
    ok(/The signed quote’s stages/.test(await p.locator('[data-testid="schedule-studio-default"]').innerText()), 'the Studio default: new schedules start from the signed quote’s stages')
    ok(!/As Schedule defaults says/.test(await p.locator('[data-testid="schedule-settings"]').innerText()), 'no "As Schedule defaults says" — a type with no pick shows the studio default')
    await shot('settings-projects-1440', true)
    await go('/settings?section=studio')
    await openRoles(p)   // (the calm UI build 2026-10-27, a deliberate change)
    const may = async (k) => (await p.locator(`[data-testid="may-${k}"]`).count()) ? p.locator(`[data-testid="may-${k}"]`).innerText() : ''
    const rowsTxt = await Promise.all(['project-see', 'project-create', 'project-change', 'project-schedule', 'project-update', 'project-update-approve', 'project-choices', 'project-vo', 'project-handover', 'project-handover-anyway', 'project-handover-review', 'project-reopen', 'project-delete', 'portal-access', 'portal-setup', 'invoice-send'].map(may))
    ok(rowsTxt.every(Boolean), 'Who may do what lists every project action the server checks (16 rows)')
    ok(/Delete, restore or delete forever a project[\s\S]*Yes[\s\S]*Yes[\s\S]*No[\s\S]*No/.test(rowsTxt[12]), 'Delete a project: Owners and Admins only')
    ok(/Complete a project’s handover[\s\S]*Yes[\s\S]*Yes[\s\S]*Their team’s[\s\S]*Their own/.test(rowsTxt[8]), 'Complete a handover: the team (review off)')
    await p.locator('[data-testid="may-project-delete"]').scrollIntoViewIfNeeded()
    await shot('who-may-do-what-1440')
    await go('/settings?section=notifications')
    const evs = ['update_review', 'stage_confirmed', 'stage_changes', 'milestone_due', 'milestone_late', 'handover_review', 'handover_approved', 'handover_sent_back']
    ok((await Promise.all(evs.map((k) => p.locator(`[data-testid="event-${k}"]`).count()))).every((n) => n === 1), 'Notifications: the project events in the event table, the handover’s three among them')
    ok(/Lost, On Hold, or Won with no open project/.test(await p.locator('[data-testid="stop-when-closed"]').innerText()) && /a project’s tasks keep their reminders/.test(await p.locator('[data-testid="stop-when-closed"]').innerText()), 'Q-29: the follow-up rule says what it does — a project’s tasks keep their reminders')
    console.log('A Designer reads Settings › Projects')
    as('sarah')
    await go('/settings?section=projects')
    ok(await p.locator('[data-testid="handover-review-row"] input').first().isDisabled(), 'Sarah (Designer) sees the rule, its switch disabled')
    await shot('settings-projects-designer-1440')

    // ── The checklist; Complete anyway (Dane on Ryan's project — milestones open, money outstanding) ─────────────────────────────
    console.log('Complete handover — the checklist')
    as('dane')
    await go(`/projects/${ryan}`)
    await stageTo('Completed')
    await handover().waitFor({ timeout: 8000 })
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    ok(await p.locator('[data-testid="check-milestones"]').getAttribute('data-met') === 'no' && /aren’t done yet|isn’t done yet/.test(await p.locator('[data-testid="check-milestones"]').innerText()), 'unmet: the milestones not done, by name')
    ok(await p.locator('[data-testid="check-money"]').getAttribute('data-met') === 'no' && /still to collect|isn’t invoiced yet|wait for approval/.test(await p.locator('[data-testid="check-money"]').innerText()), 'unmet: money outstanding, read from the money module')
    /* (the calm UI build 2026-10-27, a deliberate change — 3-17) one verb on a row, the rest in its ⋮: Money's verb is its fix (Send the invoice), its
       door (Open Money) one press away in the ⋮ */
    const moneyGo = async () => { if (!(await p.locator('[data-testid="check-money-go"]').count())) { await p.locator('[data-testid="check-money-more"]').click(); await p.waitForTimeout(300) } return p.locator('[data-testid="check-money-go"]').first() }
    ok(await p.locator('[data-testid="check-milestones-go"]').count() === 1 && await (await moneyGo()).count() === 1, 'each unmet item has its own button')
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    /* (simplify S-19) the Hand over sheet's new row — no ticket waits on the studio — deferrable as every row is */
    ok(await p.locator('[data-testid="check-tickets"]').count() === 1, 'S-19: the checklist carries "No ticket waits on the studio"')
    ok(/Hand over anyway/.test(await primary().innerText()), 'an Owner gets Hand over anyway')   // (the calm UI build 2026-10-27, a deliberate change) was Complete anyway
    await p.waitForTimeout(600); await shot('handover-checklist-1440')
    await (await moneyGo()).click()
    await p.waitForURL(/\/money/, { timeout: 8000 }); await p.waitForTimeout(900)
    ok(/\/projects\/[^/]+\/money/.test(p.url()) && !(await handover().count()), 'an item’s button closes the dialog and opens the tab that fixes it')
    await stageTo('Completed')
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await primary().click(); await p.waitForTimeout(400)
    ok(await handover().count() === 1 && /Say why it is completed with items open/.test(await handover().innerText()) && stage(ryan) === 'in_progress', 'Complete anyway asks for the reason first')
    await p.locator('input[name="handover-reason"]').fill('Client moved in; the last fixes are booked as defects.')
    await primary().click(); await p.waitForTimeout(1600)
    ok(stage(ryan) === 'completed' && /Client moved in/.test(sql(`select complete_reason from projects where id='${ryan}'`)), 'Completed, with the reason stored')
    /* (simplify Q-15) the completion answers with Undo for the snackbar's life — Reopen stays the way back after it */
    ok(await snack().getByRole('button', { name: 'Undo' }).count() >= 1 && /is completed/.test(await snack().innerText()), 'Q-15: "… is completed" with Undo')
    /* (fix-E, E-24) the bar says how many were open and why — "Two items were still open: “…”" (it read "Completed with items open") */
    ok(await bar().getAttribute('data-state') === 'completed' && /(item was|items were) still open: “Client moved in/.test(await bar().innerText()), 'the bar under the tabs: completed, with items open and why — on the Money tab too')
    await shot('completed-money-1440')

    // ── Completed is read-only on the server — and the screen offers none of what it refuses (REG-1069) ─────────────────────────
    console.log('Completed is read-only')
    /* (simplify S-07, a deliberate change of this rule) one New ▾ for both halves: on a completed project it may still offer the Costs group (a
       final bill, an expense — the server takes them), never the Bill {client} group */
    { const nw = p.locator('[data-testid="money-new"]')
      let billGroup = 0
      if (await nw.count()) { await nw.click(); await p.waitForTimeout(300); billGroup = await p.getByRole('menuitem', { name: /^(Variation order|Invoice$|One-off invoice|Record an invoice made elsewhere)/ }).count();   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */ await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
      ok(billGroup === 0 && await p.locator('[data-testid="invoice-send"], [data-testid="invoice-submit"], [data-testid="money-rebalance"]').count() === 0, 'the Money tab offers no New variation order, no Send, no Re-size — what the server refuses (REG-1069)') }
    ok(/Its schedule, choices and agreed money are read-only until you reopen it — payments, updates, tasks and its team stay open/.test(await bar().innerText()) && await p.locator('[data-testid="handover-bar-reopen"]').count() === 1, 'the bar names Reopen as the way back')
    const draftRow = p.locator('[data-testid="money-stages"] [role="row"]').filter({ hasText: /^Completion/ }).first()
    await draftRow.getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    const change = p.getByRole('menuitem', { name: /Change the amount/ })
    ok(await change.getAttribute('aria-disabled') === 'true' && /This project is completed — reopen it to change its money/.test(await change.innerText()), 'a refused row says the rule in the row (Change the amount)')
    await p.keyboard.press('Escape')
    ok(sql(`select count(*) from quotes where project_id='${ryan}' and kind='variation' and created_at >= ${T0}`) === '0', 'nothing was made')
    await go(`/projects/${ryan}/choices`)
    ok(await p.getByRole('button', { name: /^(Add a choice|New choice)$/ }).count() === 0 && await p.locator('[data-testid="choice-share"], [data-testid="choice-choose"], [data-testid="choice-change"], [data-testid="choice-add-option"], [data-testid="choice-draft-vo"]').count() === 0, 'the Choices tab reads only — nothing to add, share, pick or draft (REG-1069)')   // (the calm UI build 2026-10-27, a deliberate change) New choice was Add a choice
    await shot('completed-choices-1440')
    await go(`/projects/${ryan}/money`)
    await go(`/projects/${ryan}/schedule`)
    ok(await p.locator('[data-testid="add-milestone"]').count() === 0, 'the schedule reads only — no Add milestone')
    await go(`/projects/${ryan}`)
    /* (simplify S-02, a deliberate change of this rule) the header is Needs you's top row on every stage — on a completed project only what still
       waits after handover (money, the client's tickets and messages) can be one */
    { const firstNeed = await p.locator('section[data-card="needs"] [data-testid^="need-"]').count()
      ok(firstNeed ? await p.locator('[data-testid="project-primary"]').count() === 1 : await p.locator('[data-testid="project-primary"]').count() === 0, 'a completed project’s filled action is only what still waits (Needs you’s top row)') }
    ok(await p.locator('[data-testid="status-start"]').evaluate((el) => el.tagName) === 'DIV', 'the dates read only on the Overview')
    await shot('completed-overview-1440')

    // ── Reopen (Owner, a reason) ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Reopen')
    await p.locator('[data-testid="handover-bar-reopen"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('Why is it reopened?').fill('The carpentry snag list needs a second visit.')
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Reopen' }).click(); await p.waitForTimeout(1600)
    ok(stage(ryan) === 'in_progress' && /second visit/.test(sql(`select reopen_reason from projects where id='${ryan}'`)) && sql(`select completed_at is null from projects where id='${ryan}'`) === '1', 'back In progress, the reason kept, the completion cleared')
    await go(`/projects/${ryan}/activity`)
    const act = await p.locator('main').innerText()
    ok(/reopened the project — “The carpentry snag list needs a second visit”/.test(act) && /completed the handover — the project is completed with \d items? open|completed the handover — the project is completed with one item open/.test(act), 'Activity: the completion with its open items and reason, and the reopening')

    // ── The owner's review (Settings on; Germaine asks; Dane sends back, then approves) ─────────────────────────────────────────
    console.log('The owner’s review')
    await go('/settings?section=projects')
    await p.locator('[data-testid="handover-review-row"] label, [data-testid="handover-review-row"] [role="switch"]').first().click(); await p.waitForTimeout(1200)
    ok(/"review":true/.test(sql(`select value from settings where key='project_handover'`)), 'the Owner turns Handover needs an owner’s review on')
    as('germaine')
    await go(`/projects/${tPid}`)
    await stageTo('Completed')
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    const met = await p.locator('[data-testid="handover-checklist"] [data-met="no"]').count()
    ok(met === 0 && /Ask for review/.test(await primary().innerText()), 'Germaine’s checklist is met; her press asks for the owner’s review')
    await p.locator('input[name="handover-note"]').fill('Keys returned on Friday.')
    await primary().click(); await p.waitForTimeout(1500)
    ok(stage(tPid) === 'in_progress' && sql(`select handover_requested_by from projects where id='${tPid}'`) === 'germaine' && sql(`select count(*) from notifications where kind='handover_review' and member_id='dane' and created_at >= ${T0}`) === '1', 'it waits: the request stored, the Owner’s bell row raised')
    ok(await bar().getAttribute('data-state') === 'requested' && await p.locator('[data-testid="handover-bar-withdraw"]').count() === 1, 'her bar: waiting, with Take it back')
    await shot('review-asked-designer-1440')
    as('dane')
    await go('/projects?scope=review')
    ok(await p.locator('[data-kb-row]').filter({ hasText: tName }).count() === 1, 'Needs my review lists the handover for the Owner')
    await go(`/projects/${tPid}`)
    ok(/Review the handover/.test(await p.locator('[data-testid="project-primary"]').innerText()) && await p.locator('[data-testid="handover-bar-send-back"]').count() === 1, 'the Owner’s header: Review the handover; the bar: Send back · Review')
    await shot('review-owner-1440')
    await p.locator('[data-testid="handover-bar-send-back"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('What does the handover still need?').fill('Add the final photos first.')
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Send back' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select handover_review_note from projects where id='${tPid}'`) === 'Add the final photos first.' && sql(`select count(*) from notifications where kind='handover_sent_back' and member_id='germaine' and created_at >= ${T0}`) === '1', 'sent back with a note — Germaine’s bell row')
    as('germaine')
    await go(`/projects/${tPid}`)
    ok(await bar().getAttribute('data-state') === 'sent_back' && /Add the final photos first/.test(await bar().innerText()), 'her bar reads the note')
    await stageTo('Completed')
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await primary().click(); await p.waitForTimeout(1500)
    as('dane')
    await go(`/projects/${tPid}`)
    await p.locator('[data-testid="project-primary"] button').click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    ok(/Review the handover/.test(await p.locator('[role="dialog"]').last().innerText()) && /Approve/.test(await primary().innerText()), 'Review: the request and the checklist, Approve')
    await p.waitForTimeout(600); await shot('review-dialog-1440')
    await primary().click(); await p.waitForTimeout(1600)
    ok(stage(tPid) === 'completed' && sql(`select count(*) from notifications where kind='handover_approved' and member_id='germaine' and created_at >= ${T0}`) === '1', 'approved: Completed, Germaine told')

    // ── Delete (Q-26) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    /* (parity P-11 · Q-12, a deliberate change of this rule) the ⋮'s danger row reads "Delete", as the lead's — no "Delete project…" */
    console.log('Delete')
    await go(`/projects/${ben}`)
    await kebab(); await menu(/^Delete\b/).click(); await p.waitForTimeout(1200)
    const refusedTxt = await p.locator('[data-testid="delete-project-dialog"]').innerText()
    ok(/can’t be deleted/.test(refusedTxt) && /(payments? (is|are) recorded on this project|invoices? ha(s|ve) gone to the client on this project)/.test(refusedTxt) && await p.locator('[data-testid="delete-open-money"]').count() === 1, 'money recorded keeps a project: the dialog says so, with Open Money in place of Delete')
    await shot('delete-refused-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await go(`/projects/${tPid}`)
    await kebab(); await menu(/^Delete\b/).click(); await p.waitForTimeout(1200)
    ok(/Deleted projects/i.test(await p.locator('[data-testid="delete-project-dialog"]').innerText()), 'a project with no money: Delete says where it goes')   /* (the calm UI build 2026-10-27, a deliberate change) sentence case; Delete forever is the row's ⋮ (3-47 · 3-40) */
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(2000)
    ok(/\/projects($|\?)/.test(p.url().replace(BASE, '')) && sql(`select deleted_at is not null from projects where id='${tPid}'`) === '1' && sql(`select deleted_at is not null from leads where id='${tLead}'`) === '1', 'soft: the project and its direct client record go to the trash; the page leaves for the listing')
    const undo = snack().getByRole('button', { name: 'Undo' })
    ok(await undo.count() === 1, 'the delete offers Undo')
    await undo.click(); await p.waitForTimeout(1500)
    ok(sql(`select deleted_at is null from projects where id='${tPid}'`) === '1' && sql(`select deleted_at is null from leads where id='${tLead}'`) === '1' && sql(`select count(*) from lead_events where project_id='${tPid}' and kind='project_deleted'`) === '0', 'Undo brings both back and takes the line away')
    await go(`/projects/${tPid}`)
    await kebab(); await menu(/^Delete\b/).click(); await p.waitForTimeout(1000)
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(2000)
    await go(`/projects/${tPid}`)
    ok(/\/projects$/.test(p.url().replace(BASE, '')), 'a deleted project’s address lands on the listing')
    await p.locator('[data-testid="projects-workspace"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(300)
    await p.getByText(/^Deleted projects$/i).click(); await p.waitForTimeout(1500)   /* (the calm UI build 2026-10-27, a deliberate change) sentence case; Delete forever is the row's ⋮ (3-47 · 3-40) */
    const sheet = p.locator('[data-testid="deleted-projects"]')
    ok(await sheet.locator('[data-testid="deleted-project"]').filter({ hasText: tName }).count() === 1 && /Tan Wei Ling[\s\S]*Dane/.test(await sheet.innerText()), 'the Deleted projects sheet: this one, and the seeded one deleted by Dane')
    await shot('deleted-sheet-1440')
    await sheet.locator('[data-testid="deleted-project"]').filter({ hasText: tName }).locator('[data-testid="deleted-project-restore"]').click(); await p.waitForTimeout(1500)
    ok(sql(`select deleted_at is null from projects where id='${tPid}'`) === '1' && sql(`select count(*) from lead_events where project_id='${tPid}' and kind='project_restored'`) === '1', 'Restore puts it back, with its line')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await go(`/projects/${tPid}`)
    await kebab(); await menu(/^Delete\b/).click(); await p.waitForTimeout(1000)
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(2000)
    await p.locator('[data-testid="projects-workspace"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(300)
    await p.getByText(/^Deleted projects$/i).click(); await p.waitForTimeout(1500)   /* (the calm UI build 2026-10-27, a deliberate change) sentence case; Delete forever is the row's ⋮ (3-47 · 3-40) */
    await sheet.locator('[data-testid="deleted-project"]').filter({ hasText: tName }).locator('[data-testid="deleted-project-more"]').click(); await p.waitForTimeout(400)   /* (the calm UI build 2026-10-27, a deliberate change) sentence case; Delete forever is the row's ⋮ (3-47 · 3-40) */
    await p.locator('[data-testid="deleted-project-forever"] [role="menuitem"]').click(); await p.waitForTimeout(400)
    await p.locator('[role="dialog"]').last().getByRole('button', { name: /^Delete forever$/i }).click(); await p.waitForTimeout(1800)
    ok(sql(`select count(*) from projects where id='${tPid}'`) === '0' && sql(`select count(*) from leads where id='${tLead}'`) === '0', 'Delete Forever, after its confirm: the project and its direct client record are gone')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    as('sarah')
    await go(`/projects/${shalini}`)
    await kebab()
    ok(/Owners or Admins/.test(await menu(/^Delete\b/).innerText()) && await menu(/^Delete\b/).evaluate((el) => el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled') || el.hasAttribute('data-disabled')), 'a Designer’s Delete row is shown refused, with who may')
    await p.keyboard.press('Escape')

    // ── Q-27: a lead with a project refuses its delete ──────────────────────────────────────────────────────────────────────────
    console.log('Q-27')
    as('dane')
    await go(`/leads/${benLead}`)
    await p.locator('button[aria-label="More options"]').first().click(); await p.waitForTimeout(300)
    /* (fix-E, A-09 · E-10 · REG-728) the refusal comes before the press: the row is shown refused, with the project's number, and asks no reason */
    const delRow = menu(/^Delete/)
    ok(await delRow.getAttribute('aria-disabled') === 'true' && /Has project P-\d{4}-\d{3} — delete the project first/.test(await delRow.innerText()) && sql(`select deleted_at is null from leads where id='${benLead}'`) === '1', 'a lead with a project: Delete is refused in the row, before any reason — and the lead stays')
    await shot('lead-delete-refused-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    // ── Make the project again (a Won lead whose project is in Deleted Projects) ────────────────────────────────────────────────
    console.log('Make the project again')
    sql(`update projects set deleted_at = ${T0}, deleted_by = 'dane' where id='${aisha}'`)
    await go(`/leads/${aishaLead}`)
    ok(/Make the project again/.test(await p.locator('[data-testid="header-primary"]').innerText()), 'the Won lead stays Won; its primary reads Make the project again')
    await p.locator('[data-testid="header-primary"] button').click(); await p.waitForTimeout(500)
    ok(/is in Deleted [Pp]rojects/.test(await p.locator('[role="dialog"]').last().innerText()), 'it asks first, naming the deleted one and the way to keep it')
    await shot('make-again-1440')
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Cancel' }).click()
    sql(`update projects set deleted_at = NULL, deleted_by = NULL where id='${aisha}'`)

    // ── The seeded ending: Shalini Menon's completed project ─────────────────────────────────────────────────────────────────────
    console.log('The seeded completed project')
    await go('/projects')
    ok(await p.locator('[data-kb-row]').filter({ hasText: 'Shalini Menon' }).count() === 0, 'the listing hides Completed under its default scope')
    await go('/projects?scope=completed')
    ok(await p.locator('[data-kb-row]').filter({ hasText: 'Shalini Menon' }).count() === 1, '…and shows it when asked')
    await go(`/projects/${shalini}/activity`)
    ok(/Sarah completed the handover — the project is completed/.test(await p.locator('main').innerText()) && /Shalini Menon confirmed that “Handover & defect check” is done/.test(await p.locator('main').innerText()), 'its trail: the client’s confirmation and the completion')
    await go(`/projects/${shalini}`)
    ok(await bar().getAttribute('data-state') === 'completed', 'its bar: completed')
    await shot('completed-seeded-1440')
    /* (REG-1073) a Designer completed it with no reason — so every item was met when she did: nothing the checklist reads came after it */
    const sAt = Number(sql(`select completed_at from projects where id='${shalini}'`))
    ok(sql(`select completed_by || '·' || coalesce(complete_reason, '') from projects where id='${shalini}'`) === 'sarah·' && sql(`select count(*) from project_payments x where x.project_id='${shalini}' and x.status='confirmed' and coalesce(x.confirmed_at, x.created_at) > ${sAt}`) === '0' && sql(`select count(*) from project_invoices where project_id='${shalini}' and sent_at > ${sAt}`) === '0', 'Sarah completed it after the completion payment was in — no reason needed, none given')
    const sAct = await (async () => { await go(`/projects/${shalini}/activity`); return p.locator('[data-testid="activity-feed"]').innerText() })()
    ok(sAct.indexOf('completed the handover') >= 0 && sAct.indexOf('completed the handover') < sAct.indexOf('Completion invoice'), 'Activity: the completion is the newest line, after the payment and the invoice')
    ok(/set up the schedule from the template “Whole-home renovation \(HDB\)”/.test(sAct), 'her schedule names the template it started from')
    /* the checklist as it reads now, in the app: reopened (the probe puts it back), every item met */
    await go(`/projects/${shalini}`)
    await p.locator('[data-testid="handover-bar-reopen"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('Why is it reopened?').fill('The probe reads the checklist.')
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Reopen' }).click(); await p.waitForTimeout(1600)
    await stageTo('Completed')
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    const items = await p.locator('[data-testid="handover-checklist"] [data-met]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}:${e.getAttribute('data-met')}`))
    ok(items.length >= 3 && items.every((x) => /:yes$/.test(x)) && !/Complete anyway|Hand over anyway/.test(await primary().innerText()), `her checklist, read in the app: every item met (${items.join(' · ')})`)
    await p.waitForTimeout(600); await shot('shalini-checklist-1440')
    await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300)
    /* put her ending back at once — the phone below reads her completed bar */
    for (const r of before.filter((x) => x.id === shalini)) sql(`update projects set ${ENDING_COLS.map((c) => `${c} = ${lit(r[c])}`).join(', ')} where id = '${r.id}'`)
    sql(`delete from lead_events where at >= ${T0} and lead_id='${shaliniLead}'`)

    // ── The phone (390, touch) ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 160)}`))
    await q.goto(`${BASE}/projects`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    await q.locator('button[aria-label^="More actions for"][aria-label*="Ryan"]').first().click(); await q.waitForTimeout(500)
    /* (parity P-08 · P-11, a deliberate change of this rule) the row's ⋮ is the record's menu — the record links, Invite to Portal, Copy Link,
       Delete; the stage moves live on the project's Stage ▾ */
    /* (pending modules S46B, a deliberate change of this rule — his "fix everything" 2026-10-19, M6) Complete handover is back in ⋮, just
       before Delete (1.0's Close project) — the Stage menu's Completed row; the other stage rows stay on Stage ▾ */
    const phoneRows = (await q.getByRole('menuitem').allInnerTexts()).map((x) => x.split('\n')[0].trim())
    ok(phoneRows.indexOf('Complete handover') === phoneRows.length - 2 && phoneRows[phoneRows.length - 1] === 'Delete' && !phoneRows.some((r) => /^(On hold|Reopen|Start the project)/.test(r)), 'the phone card’s menu: Complete handover just before Delete, no other stage rows')
    await q.screenshot({ path: path.join(dir, 'phone-card-menu-390.png') })
    await q.goto(`${BASE}/projects/${ryan}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    await q.locator('[data-testid="project-stage"] button').click(); await q.waitForTimeout(500)   // (parity P-08) the "Move stage" sheet
    await q.getByRole('menuitem', { name: /^Completed/ }).click()
    await q.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await q.waitForTimeout(1200)   // the sheet has risen
    ok(await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), 'no sideways scroll at 390')
    await q.screenshot({ path: path.join(dir, 'phone-handover-390.png') })
    await q.goto(`${BASE}/projects/${shalini}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    ok(await q.locator('[data-testid="handover-bar"]').isVisible(), 'the completed bar on a phone')
    await q.screenshot({ path: path.join(dir, 'phone-completed-390.png') })
    await ph.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    /* put back everything it changed */
    for (const r of before) sql(`update projects set ${ENDING_COLS.map((c) => `${c} = ${lit(r[c])}`).join(', ')} where id = '${r.id}'`)
    sql(`delete from projects where id='${tPid}'`); sql(`delete from lead_assignees where lead_id='${tLead}'`); sql(`delete from lead_events where lead_id='${tLead}'`); sql(`delete from leads where id='${tLead}'`)
    sql(`delete from lead_events where at >= ${T0} and lead_id in ('${ryanLead}','${benLead}','${aishaLead}','${shaliniLead}')`)
    sql(`delete from notifications where created_at >= ${T0}`)
    sql(`delete from settings where key in ('project_handover','project_schedule_defaults')`)
    for (const r of settingsBefore) sql(`insert into settings (key, value, updated_at) values (${lit(r.key)}, ${lit(r.value)}, ${lit(r.updated_at)})`)
    as('dane')
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
