// Projects bug audit 2026-10-06 — fix package E (the ending, the rules and the settings) + A-01 · A-09 · A-12. Each check asserts a rule:
// a lead with a live project stays Won (A-01) and its Delete is refused before the press (A-09 · E-10), a bulk delete names who stays (E-08);
// Deleted Leads never purges a project with its lead and names what stays (E-01 · E-09); a deleted project's addresses land on the listing,
// which says where it went (E-07 · E-28 · E-26 · E-27); a Designer asks an Owner to complete with items open (E-13), answering a handover
// clears every approver's row (E-04), the record keeps the open items as they stood open (E-03), whose handover went back (E-23), the team
// hears completion and reopening (E-20), the completed line (E-24 · A-12), review switched off frees the asker (E-14), Needs my review names
// why (E-21); Make the project again for a Designer (E-05); Settings › Projects' Undo (E-15), Who may do what (E-22), Notifications (E-20 ·
// E-29); a completed project's Status card and milestone panel (E-19 · E-17); the phone: Deleted Projects' labelled rows (E-26) and the 320 foot
// (E-11). Run against `next start -p 3124` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in
// `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-pj-fix-E.cjs <scratch.db> [shotDir] [base URL]   (BASE in the environment wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'fix-E')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3124'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const T0 = Math.floor(Date.now() / 1000) - 2
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), shalini = P('P-2025-001'), tan = P('P-2026-005')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), aishaLead = leadOf(aisha), tanLead = leadOf(tan)
  const olivia = sql(`select id from leads where name='Olivia Martinez'`)
  /* two throwaway direct projects on Germaine's team: one with an open milestone (items open), one with none (a met checklist) */
  const tA = { lead: 'probe-fe-lead-a', pid: 'probe-fe-a', name: 'Bathroom refit — Probe Tan', number: 'P-2026-951' }
  const tB = { lead: 'probe-fe-lead-b', pid: 'probe-fe-b', name: 'Study nook — Probe Lim', number: 'P-2026-952' }
  const make = (t, phone) => {
    sql(`insert into leads (id, name, phone, source, property_type, stage, direct, created_at, updated_at, seen_at, budget_minor) values ('${t.lead}', '${t.name.split(' — ')[1]}', '${phone}', 'Others', 'HDB 4-Room', 'Won', 1, ${T0 - 86400}, ${T0 - 86400}, ${T0 - 86400}, 900000)`)
    sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at) values ('${t.lead}-as', '${t.lead}', 'germaine', ${T0 - 86400})`)
    sql(`insert into projects (id, lead_id, number, name, stage, project_type, agreed_value_minor, start_date, started_at, created_by, created_at, updated_at) values ('${t.pid}', '${t.lead}', '${t.number}', '${t.name}', 'in_progress', 'Partial renovation', 900000, ${T0 - 3600}, ${T0 - 3600}, 'germaine', ${T0 - 86400}, ${T0 - 3600})`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail, project_id) values ('${t.pid}-ev', '${t.lead}', 'project_created', 'germaine', ${T0 - 86400}, '{"name":"${t.name}","number":"${t.number}","direct":true}', '${t.pid}')`)
    /* (simplify S-19, a deliberate change of this rule) an HDB home's mandatory compliance Handover item joins the checklist — answered here, so
       these checks count the same open items as before */
    sql(`insert into project_compliance (id, project_id, item_id, state, by, at) values ('${t.pid}-cmp', '${t.pid}', 'DEFECTS_LIABILITY_12M', 'done', 'germaine', ${T0 * 1000})`)
  }
  const clean = () => {
    for (const t of [tA, tB]) { sql(`delete from projects where id='${t.pid}'`); sql(`delete from lead_assignees where lead_id='${t.lead}'`); sql(`delete from lead_events where lead_id='${t.lead}'`); sql(`delete from leads where id='${t.lead}'`) }
    sql(`delete from leads where id='probe-fe-purge'`)
  }
  clean()
  make(tA, '93330951'); make(tB, '93330952')
  sql(`insert into project_milestones (id, project_id, title, position, start_date, end_date, status, created_at, updated_at) values ('probe-fe-ms', '${tA.pid}', 'Waterproofing', 0, ${T0 - 86400 * 3}, ${T0 + 86400 * 4}, 'in_progress', ${T0 - 86400}, ${T0 - 86400})`)
  const settingsBefore = sql(`select coalesce((select value from settings where key='project_handover'), '')`)
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
    const menu = (name) => p.getByRole('menuitem', { name })
    const kebab = async () => { await p.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(350) }
    const stageMenu = async () => { await p.locator('[data-kb="move-stage"]').first().click(); await p.waitForTimeout(400) }   // (parity P-08) Stage ▾ holds the stage moves
    const primary = () => p.locator('[data-testid="handover-primary"]')
    const bar = () => p.locator('[data-testid="handover-bar"]')
    const dlg = () => p.locator('[role="dialog"]').last()

    // ── A-01: a lead whose project is live stays Won ─────────────────────────────────────────────────────────────────────────────
    console.log('A-01 · the lead stays Won')
    as('dane')
    await go(`/leads/${ryanLead}`)
    await p.locator('[data-kb="move-stage"] button').first().click(); await p.waitForTimeout(400)
    const onHold = menu(/^On Hold/), lost = menu(/^Lost/)
    ok(await onHold.getAttribute('aria-disabled') === 'true' && await lost.getAttribute('aria-disabled') === 'true', 'the stage menu shows On Hold and Lost refused for a lead whose project is live')
    await lost.hover({ force: true }); await p.waitForTimeout(500)
    ok(/Has project P-2026-001 — it stays Won/.test(await p.locator('[role="tooltip"]').last().innerText().catch(() => '')), 'its reason, in the house tooltip: “Has project P-2026-001 — it stays Won”')
    await shot('a01-stage-menu-1440')
    await p.keyboard.press('Escape')
    ok(sql(`select stage from leads where id='${ryanLead}'`) === 'Won', 'the lead is still Won')

    // ── A-09 · E-08 · E-10: a lead with a project, deleted ──────────────────────────────────────────────────────────────────────
    console.log('A-09 · E-08 · E-10 · the lead delete knows its project')
    await go(`/leads/${benLead}`)
    await p.locator('button[aria-label="More options"]').first().click(); await p.waitForTimeout(300)
    const del = menu(/^Delete/)
    ok(await del.getAttribute('aria-disabled') === 'true' && /Has project P-2026-002 — delete the project first/.test(await del.innerText()), 'the lead page ⋮: Delete refused in the row, with the project')
    await shot('a09-lead-kebab-1440')
    await p.keyboard.press('Escape')
    await go('/leads?view=table')
    await p.locator('[role="row"]').filter({ hasText: 'Benjamin Han' }).first().hover().catch(() => {})
    await p.locator('button[aria-label="More actions for Benjamin Han"]:visible').first().click({ force: true }); await p.waitForTimeout(400)
    ok(await menu(/Open project/).count() === 1 && await menu(/^Delete/).getAttribute('aria-disabled') === 'true', 'the listing row menu: Open project, and Delete refused in the row')
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    await p.getByRole('checkbox', { name: 'Select Olivia Martinez' }).check({ force: true }).catch(() => {})
    await p.getByRole('checkbox', { name: 'Select Benjamin Han' }).check({ force: true }).catch(() => {})
    await p.waitForTimeout(300)
    await p.getByRole('button', { name: 'Delete', exact: true }).last().click(); await p.waitForTimeout(700)
    const bulk = await dlg().innerText()
    ok(/Benjamin Han has a project, so it stays — delete the project first/.test(bulk) && /Delete this lead\?/.test(bulk), 'the bulk dialog names the lead with a project; it deletes the other one')
    await shot('e08-bulk-dialog-1440')
    await dlg().getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select deleted_at is not null from leads where id='${olivia}'`) === '1' && sql(`select deleted_at is null from leads where id='${benLead}'`) === '1', 'Olivia Martinez is deleted, Benjamin Han stays')
    sql(`update leads set deleted_at = NULL, delete_reason = NULL, stage = coalesce(stage_before_delete, stage), stage_before_delete = NULL where id='${olivia}'`)

    // ── E-01 · E-09: Deleted Leads never purges a project with its lead ────────────────────────────────────────────────────────
    console.log('E-01 · E-09 · Deleted Leads')
    sql(`update projects set deleted_at = ${T0}, deleted_by = 'dane' where id='${aisha}'`)
    sql(`update leads set deleted_at = ${T0}, delete_reason = 'Spam', stage_before_delete = stage where id='${aishaLead}'`)
    sql(`insert into leads (id, name, phone, source, property_type, stage, created_at, updated_at, deleted_at, delete_reason, budget_minor) values ('probe-fe-purge', 'Probe Purge', '93330959', 'Others', 'HDB 4-Room', 'New', ${T0 - 86400}, ${T0 - 86400}, ${T0}, 'Spam', 0)`)
    const listed = Number(sql(`select count(*) from leads where deleted_at is not null and coalesce(direct, 0) = 0`))
    await go('/leads')
    await p.locator('button[aria-label="More options"]:visible').first().click(); await p.waitForTimeout(300)
    await menu('Deleted Leads').click(); await p.waitForTimeout(900)
    const aishaRow = p.locator('[role="dialog"][aria-label="Deleted leads"] [role="row"]').filter({ hasText: 'Aisha Rahman' })   // (the calm UI build 2026-10-27, a deliberate change) B2 T-13: "Deleted leads"
    ok(await aishaRow.locator('[data-testid="deleted-lead-forever"]').isDisabled(), 'a lead whose project still exists: its Delete Forever is shown refused')
    await p.getByRole('button', { name: 'Empty Trash' }).first().click(); await p.waitForTimeout(500)
    const count = await p.locator('[data-testid="empty-trash-count"]').innerText()
    ok(new RegExp(`${listed - 1} of the ${listed} deleted leads will be removed`).test(count) && /Aisha Rahman stays: P-2026-003 is in Deleted [Pp]rojects — delete it forever there first/.test(count), `Empty Trash counts what it removes (${listed - 1} of the ${listed} listed — never a direct client) and names what stays`)
    await shot('e01-empty-trash-confirm-1440')
    await dlg().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300)
    await p.getByRole('checkbox', { name: 'Select Aisha Rahman' }).check({ force: true }).catch(() => {})
    await p.getByRole('checkbox', { name: 'Select Probe Purge' }).check({ force: true }).catch(() => {})
    await p.waitForTimeout(300)
    await p.locator('[role="dialog"][aria-label="Deleted leads"]').getByRole('button', { name: 'Delete Forever' }).last().click(); await p.waitForTimeout(500)   // (the calm UI build 2026-10-27, a deliberate change) B2 T-13: "Deleted leads"
    ok(/Delete this lead forever\?/.test(await dlg().innerText()) && /Aisha Rahman stays/.test(await dlg().innerText()), 'Delete Forever on a selection: the confirm counts the one that goes and names the one that stays')
    await dlg().getByRole('button', { name: 'Delete Forever' }).click(); await p.waitForTimeout(1600)
    ok(/1 deleted forever — Aisha Rahman stays: P-2026-003 is in Deleted [Pp]rojects/.test(await snack().innerText()) && await snack().getByRole('button', { name: /^Deleted [Pp]rojects$/ }).count() === 1, 'the answer: what went, who stayed and why, with the way to Deleted [Pp]rojects')
    ok(sql(`select count(*) from leads where id='probe-fe-purge'`) === '0' && sql(`select count(*) from projects where id='${aisha}'`) === '1' && sql(`select count(*) from leads where id='${aishaLead}'`) === '1' && sql(`select count(*) from projects where id='${tan}'`) === '1', 'the free lead is gone; Aisha’s lead and project, and Tan Wei Ling’s deleted project, are all still there')
    await shot('e09-purged-snack-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    sql(`update leads set deleted_at = NULL, delete_reason = NULL, stage = coalesce(stage_before_delete, stage), stage_before_delete = NULL where id='${aishaLead}'`)

    // ── E-05: Make the project again, as a Designer (Michelle) ───────────────────────────────────────────────────────────────────
    console.log('E-05 · Make the project again, a Designer')
    as('michelle')
    await go(`/leads/${aishaLead}`)
    const hp = p.locator('[data-testid="header-primary"]')
    ok(/Make the project again/.test(await hp.innerText()) && await hp.locator('.msr, .mso, [class*="icon"]').filter({ hasText: 'lock' }).count() >= 1, 'the primary is locked for a Designer (Convert’s look)')
    await hp.locator('button').click(); await p.waitForTimeout(700)
    ok(/P-2026-003 is in Deleted [Pp]rojects — an Owner or an Admin can restore it or make it again/.test(await snack().innerText()) && await p.locator('[role="dialog"]').count() === 0, 'its press says who may — no confirm the server would refuse')
    await shot('e05-remake-designer-1440')
    as('dane')
    sql(`update projects set deleted_at = NULL, deleted_by = NULL where id='${aisha}'`)

    // ── E-28 · E-07 · E-26 · E-27: a deleted project's addresses ───────────────────────────────────────────────────────────────
    console.log('E-28 · E-07 · E-26 · E-27 · deleted addresses')
    await go(`/projects/${tan}/schedule`)
    await p.waitForTimeout(900)
    ok(/\/projects($|\?)/.test(p.url().replace(BASE, '')) && /P-2026-005 is in Deleted [Pp]rojects/.test(await snack().innerText()), 'a deleted project’s tab lands on the listing, which says where it went')
    await snack().getByRole('button', { name: 'Open' }).click(); await p.waitForTimeout(1500)
    const tanRow = p.locator('[data-testid="deleted-project"]').filter({ hasText: 'Tan Wei Ling' })
    ok(await tanRow.count() === 1 && (await tanRow.locator('[data-testid="deleted-project-number"]').innerText()) === 'P-2026-005', 'Open opens Deleted Projects; the row carries its number')
    await shot('e26-deleted-sheet-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await go(`/leads/${tanLead}`)
    ok(/\/projects($|\?)/.test(p.url().replace(BASE, '')) && !/could not be found/.test(await p.locator('body').innerText()), 'a deleted direct project’s client address lands there too, never on the bare 404')
    await go(`/projects/${ben}`)
    await kebab(); await menu(/^Delete$/).click()   /* (parity P-11) the ⋮ says Delete, as the lead's */; await p.waitForTimeout(1200)
    ok(/This project can’t be deleted/.test(await dlg().innerText()), 'a refused delete is titled as a refusal')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    // ── E-13 · E-21 · E-12 · E-04 · E-23 · E-03 · E-20 · E-24: the handover with items open ──────────────────────────────────────
    console.log('E-13 · E-04 · E-03 · E-20 · the handover with items open')
    as('germaine')
    await go(`/projects/${tA.pid}`)
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    ok(await p.locator('[data-testid="check-milestones"]').getAttribute('data-met') === 'no' && /Ask an Owner or an Admin/.test(await primary().innerText()) && await primary().isEnabled(), 'a Designer with items open: “Ask an Owner or an Admin” is the press, not a disabled button')
    ok((await p.locator('[data-testid="handover-checklist"] [role="columnheader"]').nth(1).textContent()) === 'Action', 'the checklist’s action column has a name for a screen reader (E-32)')
    await shot('e13-designer-ask-1440')
    await primary().click(); await p.waitForTimeout(1500)
    ok(sql(`select handover_requested_by from projects where id='${tA.pid}'`) === 'germaine' && sql(`select count(*) from notifications where kind='handover_review' and href='/projects/${tA.pid}'`) === '2', 'the request is filed; both approvers’ bells ring')
    ok(/one item open/.test(sql(`select body from notifications where kind='handover_review' and href='/projects/${tA.pid}' and member_id='dane'`)), 'the bell row says items are open')
    as('dane')
    await go('/projects?scope=review')
    ok(/Handover to review — Germaine asked/.test(await p.locator('[data-kb-row]').filter({ hasText: tA.name }).innerText()), 'Needs my review: the row names why it is there (E-21)')
    await go(`/projects/${tA.pid}`)
    const headBg = await p.locator('[data-testid="project-primary"] button').evaluate((el) => getComputedStyle(el).backgroundColor)
    const barBg = await p.locator('[data-testid="handover-bar-review"]').evaluate((el) => getComputedStyle(el).backgroundColor)
    ok(headBg !== barBg, 'one filled action: the bar’s Review is outlined under the header’s (E-12)')
    ok(await bar().getAttribute('role') === 'region' && await bar().locator('[role="status"]').count() === 1, 'the bar is a region; only its sentence is a status (E-32)')
    await p.locator('[data-testid="handover-bar-send-back"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('What does the handover still need?').fill('Finish the waterproofing test first')
    await dlg().getByRole('button', { name: 'Send back' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select count(*) from notifications where kind='handover_review' and href='/projects/${tA.pid}'`) === '0', 'sent back: no approver keeps the review row (E-04)')
    ok(/Handover sent back[\s\S]*“Finish the waterproofing test first”\./.test(await bar().innerText()) && !/Ask again when it’s ready/.test(await bar().innerText()), 'the reviewer reads the note quoted and closed — the “Ask again” hint is not theirs (E-23)')
    await go(`/projects/${tA.pid}/activity`)
    ok(/sent Germaine’s handover back — “Finish the waterproofing test first”/.test(await p.locator('main').innerText()), 'Activity: whose handover went back')
    as('germaine')
    await go(`/projects/${tA.pid}`)
    ok(/Ask again when it’s ready/.test(await bar().innerText()), 'whoever asked reads “Ask again when it’s ready.”')
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await primary().click(); await p.waitForTimeout(1500)
    as('dane')
    await go(`/projects/${tA.pid}`)
    await p.locator('[data-testid="project-primary"] button').click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await p.locator('input[name="handover-reason"]').fill('Waterproofing passed on site; the test sheet follows')
    await primary().click(); await p.waitForTimeout(1800)
    ok(sql(`select stage from projects where id='${tA.pid}'`) === 'completed' && sql(`select count(*) from notifications where kind='handover_review' and href='/projects/${tA.pid}'`) === '0', 'approved anyway: Completed, and every review row is gone (E-04)')
    ok(/One item was still open: “Waterproofing passed on site; the test sheet follows”\. Its schedule, choices and agreed money are read-only until you reopen it — payments, updates, tasks and its team stay open\./.test(await bar().innerText()), 'the completed line: how many were open and why, and what stays open (E-24 · A-12)')
    await shot('e24-completed-bar-1440')
    await go(`/projects/${tA.pid}/activity`)
    ok(/approved Germaine’s handover — the project is completed with one item open \(1 milestone not done\)/.test(await p.locator('main').innerText()), 'Activity names the open item as it stood open (E-03)')
    await go(`/projects/${tA.pid}`)
    await p.locator('[data-testid="handover-bar-reopen"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('Why is it reopened?').fill('The test sheet failed')
    await dlg().getByRole('button', { name: 'Reopen' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select count(*) from notifications where kind='project_reopened' and member_id='germaine' and href='/projects/${tA.pid}'`) === '1', 'Reopen: the team hears it (E-20)')
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await p.locator('input[name="handover-reason"]').fill('Signed off by the client')
    await primary().click(); await p.waitForTimeout(1600)
    ok(sql(`select count(*) from notifications where kind='project_completed' and member_id='germaine' and href='/projects/${tA.pid}'`) === '1', 'Complete anyway by an Owner: the team hears it (E-20)')

    // ── E-14: the review switched off while a request waits ──────────────────────────────────────────────────────────────────────
    console.log('E-14 · review off frees the asker')
    sql(`insert or replace into settings (key, value, updated_at) values ('project_handover', '{"review":true}', ${T0})`)
    as('germaine')
    await go(`/projects/${tB.pid}`)
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    await primary().click(); await p.waitForTimeout(1500)
    sql(`update settings set value = '{"review":false}' where key='project_handover'`)
    await go(`/projects/${tB.pid}`)
    ok(await p.locator('[data-testid="handover-bar-complete"]').count() === 1, 'the asker’s bar offers Complete handover once the review is off')
    await p.locator('[data-testid="handover-bar-complete"]').click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 })
    ok(/Complete handover/.test(await primary().innerText()) && await p.locator('[data-testid="handover-withdraw"]').count() === 1, 'the dialog completes it — or takes the request back')
    await primary().click(); await p.waitForTimeout(1500)
    ok(sql(`select stage from projects where id='${tB.pid}'`) === 'completed', 'completed by whoever asked')

    // ── E-15 · E-22 · E-29: Settings ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('E-15 · E-22 · E-29 · Settings')
    as('dane')
    await go('/settings?section=projects')
    const was = /"review":true/.test(sql(`select coalesce((select value from settings where key='project_handover'), '')`))
    await p.locator('[data-testid="handover-review-row"] label, [data-testid="handover-review-row"] [role="switch"]').first().click(); await p.waitForTimeout(1200)
    ok(await snack().getByRole('button', { name: 'Undo' }).count() === 1, 'the rule switch saves with Undo (E-15)')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1200)
    ok(/"review":true/.test(sql(`select coalesce((select value from settings where key='project_handover'), '')`)) === was, 'Undo puts the rule back')
    sql(`insert or replace into settings (key, value, updated_at) values ('project_handover', '{"review":true}', ${T0})`)
    await go('/settings?section=studio')
    await openRoles(p)   // (the calm UI build 2026-10-27, a deliberate change)
    const may = async (k) => (await p.locator(`[data-testid="may-${k}"]`).count()) ? p.locator(`[data-testid="may-${k}"]`).innerText() : ''
    ok(/Submits for approval — their team’s[\s\S]*Submits for approval — their own/.test(await may('project-handover')), 'Complete a handover: a Manager submits their team’s, a Designer their own (E-22)')
    ok(/Take back a handover request/.test(await may('project-handover-withdraw')) && /Make a Won lead’s project again/.test(await may('project-remake')), 'the two missing rules are listed (E-22)')
    ok(/#update-settings/.test(await p.locator('[data-testid="may-link-project-update"]').getAttribute('href')), 'Set under Projects › Updates lands on its card (E-22)')
    await go('/settings?section=notifications')
    ok(await p.locator('[data-testid="event-project_completed"]').count() === 1 && await p.locator('[data-testid="event-project_reopened"]').count() === 1, 'Notifications: a project completed · reopened (E-20)')
    ok(/A Designer or a Manager asked/.test(await p.locator('[data-testid="event-handover_review"]').innerText()), 'the handover row names Managers too (E-29)')

    // ── E-19 · E-17: a completed project ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('E-19 · E-17 · completed')
    await go(`/projects/${shalini}`)
    /* (E-19 with fix-A's A-14, which merged later) the head says the stage's fact — "Completed on 28 Sep ’26" — and no longer counts on */
    { const card = await p.locator('section[data-card="status"]').innerText()
      ok(/Took \d+ days?/.test(card) && !/since (won|it began)/.test(card) && !/current/.test(await p.locator('[data-testid="stage-completed"]').innerText()), 'the Status card stops at completion: “Took n days” (REG-1163), Completed done on its date (E-19 · A-14)') }
    const ms = sql(`select id from project_milestones where project_id='${shalini}' and deleted_at is null order by position limit 1`)
    await go(`/projects/${shalini}/schedule?open=${ms}`)
    await p.waitForTimeout(800)
    ok(/This project is completed — reopen it to change its schedule/.test(await p.locator('[data-testid="read-only-line"]').first().innerText().catch(() => '')), 'the milestone panel says why it reads only, once (E-17)')
    await shot('e17-milestone-panel-1440')

    // ── The phone: Deleted Projects' rows (E-26) and the 320 foot (E-11) ─────────────────────────────────────────────────────────
    console.log('Phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 160)}`))
    await q.goto(`${BASE}/projects/${tan}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1600)
    await q.locator('[role="status"][aria-live="polite"]').last().getByRole('button', { name: 'Open' }).click(); await q.waitForTimeout(1500)
    const row = q.locator('[data-testid="deleted-project"]').first()
    const lab = await row.locator('[data-label="Client"]').evaluate((el) => getComputedStyle(el, '::before').content)
    const strip = await row.evaluate((el) => getComputedStyle(el, '::after').content)
    ok(/Client/.test(lab) && (strip === 'none' || strip === 'normal'), 'a phone row labels its values; no empty strip over it (E-26)')
    await q.screenshot({ path: path.join(dir, 'e26-deleted-sheet-390.png') })
    await ph.close()
    sql(`update projects set handover_requested_by = 'germaine', handover_requested_at = ${T0}, stage = 'in_progress', completed_at = NULL, completed_by = NULL where id='${tB.pid}'`)
    const tiny = await b.newContext({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const r = await tiny.newPage()
    await r.goto(`${BASE}/projects/${tB.pid}`, { waitUntil: 'networkidle' }); await r.waitForTimeout(1400)
    await r.locator('[data-testid="project-primary"] button').click()
    await r.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }); await r.waitForTimeout(1200)
    const sb = await r.locator('[data-testid="handover-send-back"]').boundingBox()
    const cancel = await r.locator('[role="dialog"]').last().getByRole('button', { name: 'Cancel' }).boundingBox()
    ok(!!sb && !!cancel && (sb.x + sb.width <= cancel.x + 0.5 || sb.y + sb.height <= cancel.y + 0.5), 'at 320 “Send back” and “Cancel” no longer run into each other (E-11)')
    await r.screenshot({ path: path.join(dir, 'e11-review-foot-320.png') })
    ok(await r.evaluate(() => document.scrollingElement.scrollWidth <= 320), 'no sideways scroll at 320')
    await tiny.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    /* put back everything it changed */
    clean()
    sql(`delete from project_milestones where id='probe-fe-ms'`)
    sql(`update projects set deleted_at = NULL, deleted_by = NULL where id='${aisha}'`)
    sql(`update leads set deleted_at = NULL, delete_reason = NULL, stage = coalesce(stage_before_delete, stage), stage_before_delete = NULL where id in ('${aishaLead}', '${olivia}') and deleted_at >= ${T0}`)
    sql(`delete from notifications where created_at >= ${T0}`)
    sql(`delete from lead_events where at >= ${T0} and lead_id in ('${ryanLead}','${benLead}','${aishaLead}','${olivia}')`)
    sql(`delete from settings where key = 'project_handover'`)
    if (settingsBefore) sql(`insert into settings (key, value, updated_at) values ('project_handover', '${settingsBefore.replace(/'/g, "''")}', ${T0})`)
    as('dane')
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
