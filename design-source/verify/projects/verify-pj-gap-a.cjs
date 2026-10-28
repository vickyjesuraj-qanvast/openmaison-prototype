// Projects gaps build 2026-10-07 — package A, the project record (the owner's "build everything"; M-01 · M-02 and the report's gaps). Each check
// asserts a rule: On hold — the mark on the listing (glyph, words, scope), the Overview (head, row, reason, Resume as the one action), the paused
// attention, Put on hold / Resume / Change the hold with Undo, its Activity lines (M-01); a direct project's client and property corrected (the
// phone moves the portal sign-in's number, the Activity line), a Won project's type and scope (1 · 7); Notes & Logs and Questionnaire on a
// project (M-02); New project: the name rule, the scope, floor area, style, the first note, the question bank, one transaction, the team picker's
// load and suggestion (3 · 9 · 10 · 13); rename refuses a taken name (10); the Contract step (6); the closing summary (4); the handover's
// deferrals and the refund-due item (5); the tabs' counts (12); the listing's Project type column and team sort (8); an error page with Try again
// (11); the phone (390). Run against `next start -p 3121` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is
// put back in `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-a.cjs <scratch.db> [shotDir] [base URL]   (BASE wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-a')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3121'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()   // the shell's own characters escaped ($ in a JSON path)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
/* (S45C — the demo moves with the restore day, S42A) a day this probe asserts is read from its record and worded as the app words it —
   never a window around the day the probe was written. A stored stamp is seconds or milliseconds; the day is the local one. */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toMs = (v) => { const n = Number(v); return n > 1e12 ? n : n * 1000 }
const dayMonthOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${d.getDate()} ${MON3[d.getMonth()]}` }   // "5 Oct"
const dayLabelOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${WD3[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}` }   // "Mon 19 Oct"
const displayDateOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${dayMonthOf(v)} ’${String(d.getFullYear()).slice(2)}` }   // "16 Nov ’26" (lib/format.ts displayDate)
const reOf = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const T0 = Math.floor(Date.now() / 1000) - 2
  const you = sql(`select id from members where is_you = 1`)
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), marcus = P('P-2026-004'), shalini = P('P-2025-001')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const marcusLead = leadOf(marcus)
  const keep = {
    aishaHold: sql(`select coalesce(on_hold_at,'') || '|' || coalesce(on_hold_reason,'') || '|' || coalesce(on_hold_until,'') || '|' || coalesce(on_hold_by,'') from projects where id='${aisha}'`),
    ryanName: sql(`select name from projects where id='${ryan}'`),
    ryanScope: sql(`select coalesce(scope,'') from projects where id='${ryan}'`),
    marcusLead: sql(`select phone || '|' || coalesce(area_sqft,'') || '|' || coalesce(style,'') from leads where id='${marcusLead}'`),
    marcusName: sql(`select name from projects where id='${marcus}'`),
    given: sql(`select coalesce((select value from settings where key='project_numbers_given'), '')`),
  }
  /* (S45C) Aisha's hold as her record holds it — since, until, and the day her hold's Activity line names */
  const [HOLD_AT, HOLD_UNTIL] = sql(`select on_hold_at || '|' || on_hold_until from projects where id='${aisha}'`).split('|')
  const HOLD_WHEN = sql(`select json_extract(detail,'$.when') from lead_events where project_id='${aisha}' and kind='project_put_on_hold' order by at desc limit 1`)
  const holdTill = `On hold till: ${WD3[new Date(toMs(HOLD_UNTIL)).getDay()]}, ${displayDateOf(HOLD_UNTIL)}`   // lib/format.ts displayDateLong
  /* throwaway direct projects on Dane's team for the handover: one with an open milestone (deferred), one over-collected (refund due) */
  const tA = { lead: 'probe-ga-lead-a', pid: 'probe-ga-a', name: 'Bathroom refit — Probe Ong', number: 'P-2026-961' }
  const tB = { lead: 'probe-ga-lead-b', pid: 'probe-ga-b', name: 'Study nook — Probe Koh', number: 'P-2026-962' }
  const made = { project: null, lead: null }
  const make = (t, phone, extra = '') => {
    sql(`insert into leads (id, name, phone, source, property_type, stage, direct, created_at, updated_at, seen_at, budget_minor) values ('${t.lead}', '${t.name.split(' — ')[1]}', '${phone}', 'Others', 'HDB 4-Room', 'Won', 1, ${T0 - 86400 * 30}, ${T0 - 86400 * 30}, ${T0 - 86400 * 30}, 900000)`)
    sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at) values ('${t.lead}-as', '${t.lead}', 'dane', ${T0 - 86400 * 30})`)
    sql(`insert into projects (id, lead_id, number, name, stage, project_type, agreed_value_minor, start_date, started_at, target_end_date, created_by, created_at, updated_at${extra ? ', payment_template' : ''}) values ('${t.pid}', '${t.lead}', '${t.number}', '${t.name}', 'in_progress', 'Partial renovation', 900000, ${T0 - 86400 * 20}, ${T0 - 86400 * 20}, ${T0 - 86400 * 2}, 'dane', ${T0 - 86400 * 30}, ${T0 - 3600}${extra ? `, '${extra}'` : ''})`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail, project_id) values ('${t.pid}-ev', '${t.lead}', 'project_created', 'dane', ${T0 - 86400 * 30}, '{"name":"${t.name}","number":"${t.number}","direct":true}', '${t.pid}')`)
    /* (simplify S-19, a deliberate change of this rule) an HDB home's mandatory compliance Handover item is on the checklist now — answered here,
       so the deferral checks below count the same open items as before */
    sql(`insert into project_compliance (id, project_id, item_id, state, by, at) values ('${t.pid}-cmp', '${t.pid}', 'DEFECTS_LIABILITY_12M', 'done', 'dane', ${T0 * 1000})`)
  }
  const clean = () => {
    for (const t of [tA, tB]) { sql(`delete from projects where id='${t.pid}'`); sql(`delete from lead_assignees where lead_id='${t.lead}'`); sql(`delete from lead_events where lead_id='${t.lead}'`); sql(`delete from notifications where lead_id='${t.lead}'`); sql(`delete from leads where id='${t.lead}'`) }
  }
  clean()
  make(tA, '93330961')
  sql(`insert into project_milestones (id, project_id, title, position, start_date, end_date, status, created_at, updated_at) values ('probe-ga-ms', '${tA.pid}', 'Waterproofing', 0, ${T0 - 86400 * 3}, ${T0 + 86400 * 4}, 'in_progress', ${T0 - 86400}, ${T0 - 86400})`)
  make(tB, '93330962', '{"template":null,"rows":[{"name":"Full","pct":100}]}')
  sql(`insert into project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, sent_by, sent_at, due_at, created_at, updated_at, contract_minor, base_minor, variations_minor) values ('probe-ga-inv', '${tB.pid}', 'split:0', 'Full', 100, 0, 'INV-PROBE-962', 'sent', 1000000, 0, 'dane', ${T0 - 86400 * 10}, ${T0 + 86400 * 5}, ${T0 - 86400 * 10}, ${T0 - 86400 * 10}, 900000, 900000, 0)`)
  sql(`insert into project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, source, status, trusted, recorded_by, confirmed_by, confirmed_at, created_at, updated_at) values ('probe-ga-pay', '${tB.pid}', 'probe-ga-inv', 1000000, ${T0 - 86400 * 8}, 'Bank transfer', 'studio', 'confirmed', 1, 'dane', 'dane', ${T0 - 86400 * 8}, ${T0 - 86400 * 8}, ${T0 - 86400 * 8})`)
  as('dane')
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
    const kebab = async () => { await p.getByRole('button', { name: 'More options' }).first().click(); await p.waitForTimeout(400) }
    const stageMenu = async () => { await p.locator('[data-kb="move-stage"]').first().click(); await p.waitForTimeout(400) }   // (parity P-08) Stage ▾ holds the stage moves
    const dialog = () => p.locator('[role="dialog"]').last()
    const row = (txt) => p.locator('[data-kb-list="project"] [data-kb-row]').filter({ hasText: txt }).first()

    // ── On hold on the listing (M-01): the glyph beside the stage, the words on the row's second line, the scope ─────────────────────────
    console.log('On hold — the listing')
    await go('/projects')
    const aRow = row('Aisha')
    /* (parity P-14, a deliberate change of this rule) the Leads listing's words to the letter: "On hold till: Mon, 16 Nov ’26" */
    ok(await aRow.locator('[data-testid="stage-hold"]').count() === 1 && reOf(holdTill).test(await aRow.locator('[data-testid="row-hold"]').innerText()), `Aisha’s row: the hold’s glyph beside the stage and “${holdTill}” on its second line`)
    ok(await aRow.locator('[data-testid="row-attention"]').count() === 0, 'her row raises nothing while on hold (the reasons rest)')
    await aRow.locator('[data-testid="stage-hold"] [role="img"]').hover(); await p.waitForTimeout(500)
    ok(reOf(`On hold since ${displayDateOf(HOLD_AT)} — Aisha is away until mid-November`).test(await p.locator('[role="tooltip"]').last().innerText().catch(() => '')), `the glyph’s tooltip: since when (${displayDateOf(HOLD_AT)}), why, when it resumes`)
    await shot('listing-hold-1440')
    await go('/projects?scope=on_hold')
    ok(await p.locator('[data-kb-list="project"] [data-kb-row]').count() === 1 && /On hold \(1\)/.test(await p.locator('main, body').first().innerText()), 'the scope “On hold (1)” lists her project alone')
    // (8) the Project type column in Column settings, off by default; (parity P-22, a deliberate change of this rule) Members and Project type are labels, no sort (REG-468)
    await go('/projects')
    ok(!(await p.locator('[role="columnheader"], [class*="hCell"]').allInnerTexts()).some((t) => /PROJECT TYPE/i.test(t)), 'Project type is not a column until it is turned on')
    await p.getByRole('button', { name: /Column settings|Columns/ }).first().click().catch(() => {}); await p.waitForTimeout(600)
    ok(/Project type/.test(await dialog().innerText().catch(() => '')), 'Column settings offers Project type')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    await go('/projects?col=team&dir=asc')
    /* (parity P-22) the Members head is a label as the lead's (several people per cell); an old address naming it sorts nothing */
    const membersHead = p.locator('[role="columnheader"][data-col="team"]')
    ok(/MEMBERS/i.test(await membersHead.innerText().catch(() => '')) && await membersHead.locator('button').count() === 0 && await p.locator('[data-sorted]').count() === 0, 'the Members head is a label — no sort, even from ?col=team')

    // ── Aisha's Overview: the hold said, Resume the one action; Resume + Undo; Change the hold ─────────────────────────────────────────────
    console.log('On hold — the project')
    await go(`/projects/${aisha}`)
    ok(/Resume/.test(await p.locator('[data-testid="project-primary"]').innerText()), 'the header’s one filled action is Resume')
    ok(/On hold/.test(await p.locator('[data-card="status"]').first().innerText()) && await p.locator('[data-testid="status-hold-row"]').count() === 1, 'the Status card says On hold, since when and when it resumes')
    ok(/Aisha is away until mid-November/.test(await p.locator('[data-testid="need-hold"]').innerText()) && /reads the reason/.test(await p.locator('[data-testid="status-hold-reason"]').innerText()), 'the reason reads in full on its row, Progress says who reads it')   /* (the calm UI build 2026-10-27, a deliberate change) the hold's reason is said once — on its Needs your attention row (3-31); "Last update to …" (W-537) */
    /* (simplify S-01 · Q-14, a deliberate change of this rule) Needs you leads with the hold row (Resume · Change); what the hold pauses rests
       under "Paused while on hold" */
    ok((await p.locator('section[data-card="needs"] [data-testid^="need-"]').first().getAttribute('data-testid')) === 'need-hold', 'Needs you leads with the hold row; what it pauses rests under “Paused while on hold”')
    await shot('overview-hold-1440', true)
    await p.locator('[data-testid="project-primary"] button').click(); await p.waitForTimeout(1500)
    ok(/is running again/.test(await snack().innerText()) && sql(`select coalesce(on_hold_at,'') from projects where id='${aisha}'`) === '', 'Resume: the project runs again — one sentence')
    ok(sql(`select count(*) from lead_events where project_id='${aisha}' and kind='project_resumed'`) === '1', 'its Activity line is written')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select on_hold_reason from projects where id='${aisha}'`) === 'Aisha is away until mid-November — the works pause' && sql(`select count(*) from lead_events where project_id='${aisha}' and kind='project_resumed'`) === '0', 'Undo puts the hold back as it was and takes its line away')
    await go(`/projects/${aisha}`)
    await p.locator('[data-testid="need-hold"]').getByRole('button', { name: 'Change' }).click(); await p.waitForTimeout(600)   // (simplify S-01, a deliberate change of this rule) the hold row's own Change in Needs you
    ok(await p.locator('[data-testid="hold-dialog"]').isVisible() && (await dialog().getByLabel('Why is it on hold?').inputValue()) === 'Aisha is away until mid-November — the works pause', 'Change the hold opens on the hold as it stands')
    await shot('hold-change-1440')
    await dialog().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(400)
    await go(`/projects/${aisha}/activity`)
    ok(reOf(`put the project on hold — “Aisha is away until mid-November — the works pause”; it resumes ${displayDateOf(HOLD_WHEN)}`).test(await p.locator('main, body').first().innerText()), `Activity: “put the project on hold — … ; it resumes ${displayDateOf(HOLD_WHEN)}”`)

    // ── Put Ryan on hold from the menu: the reason is asked; the resume presets; attention rests; Resume is next ───────────────────────────
    console.log('Put on hold')
    await go(`/projects/${ryan}`)
    /* (parity P-08, a deliberate change of this rule) the hold is a stage row now: Stage ▾ › On hold — no ⋮ row */
    await p.locator('[data-testid="project-stage"] button').click(); await p.waitForTimeout(400)
    /* (the calm UI build 2026-10-27, a deliberate change) the running stage says "since <day>" (3-53) */
    ok(/current|since /.test(await menu(/^In progress/).innerText()), 'the stage menu: In progress current, On hold its Inactive row')
    await menu(/^On hold/).click(); await p.waitForTimeout(600)
    await p.locator('[data-testid="hold-save"]').click(); await p.waitForTimeout(400)
    ok(/This field is required/.test(await dialog().innerText()), 'Put on hold asks why first')
    await dialog().getByLabel('Why is it on hold?').fill('Ryan’s lift renovation stops deliveries')
    await dialog().getByRole('radio', { name: '1 month' }).click(); await p.waitForTimeout(200)
    ok(/It resumes .* the team is reminded that day/.test(await dialog().innerText()), 'a preset says the day it resumes')
    /* (simplify P2 §6.8) ☑ Tell Ryan on WhatsApp — on for a new hold; unticked here so no WhatsApp tab opens in the probe */
    ok(await p.locator('[data-testid="hold-tell"] input').isChecked().catch(() => false), 'P2 §6.8: the hold offers Tell Ryan on WhatsApp, ticked')
    await p.locator('[data-testid="hold-tell"]').click(); await p.waitForTimeout(200)
    await p.locator('[data-testid="hold-save"]').click(); await p.waitForTimeout(1500)
    const rh = sql(`select (on_hold_at is not null) || '|' || on_hold_reason || '|' || (on_hold_until is not null) || '|' || on_hold_by from projects where id='${ryan}'`)
    ok(rh === `1|Ryan’s lift renovation stops deliveries|1|dane`, `saved: since, why, the resume day, who (${rh})`)
    ok(/is on hold/.test(await snack().innerText()) && /Resume/.test(await p.locator('[data-testid="project-primary"]').innerText()), 'the snackbar says it; Resume is the next step')
    /* (simplify round 2 — R2-C, a deliberate change of this rule) Ryan is on his page, so the hold tells him by email — held in the outbox for the
       snackbar's Undo (status 'held', with when it goes), no longer sent at once; an Undo would delete it */
    const ryanLead = sql(`select lead_id from projects where id='${ryan}'`)
    ok(/^held\|\d+$/.test(sql(`select status || '|' || coalesce(send_after,'') from notification_outbox where event='client_paused' and lead_id='${ryanLead}' order by created_at desc limit 1`)), 'the “works are paused” email waits out the Undo — held in the outbox, with when it goes')
    await go('/projects')
    ok(await row('Ryan').locator('[data-testid="row-attention"]').count() === 0, 'his “1 milestone overdue” rests while on hold')
    sql(`update projects set on_hold_at = null, on_hold_reason = null, on_hold_until = null, on_hold_by = null where id='${ryan}'`)
    sql(`delete from lead_events where project_id='${ryan}' and kind='project_put_on_hold'`)
    sql(`delete from notification_outbox where event='client_paused' and lead_id='${ryanLead}' and status in ('held','sending')`)   // (simplify round 2) the probe's hold never happened — its email doesn't go
    await go('/projects')
    ok(/milestones? overdue/.test(await row('Ryan').innerText()), '…and comes back once it runs')   // one or more, as the day moves on

    // ── (10) A taken name is refused ────────────────────────────────────────────────────────────────────────────────────────────────────
    /* (parity P-09 · P-11, a deliberate change of this rule) the name is a field of Edit details (the ⋮'s first row, key E); no Rename… row */
    console.log('Names')
    await go(`/projects/${ryan}`)
    await kebab(); await menu(/^Edit details/).click(); await p.waitForTimeout(700)
    await dialog().getByLabel('Project name').fill(sql(`select name from projects where id='${aisha}'`))
    await p.locator('[data-testid="details-save"]').click(); await p.waitForTimeout(1500)
    ok(/a project with this name already exists/i.test(await snack().innerText()) && sql(`select name from projects where id='${ryan}'`) === keep.ryanName, 'a name another project holds is refused — the name stays, the form stays open')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    // ── (1 · 7) A Won project: its type and scope here, its client on its lead ─────────────────────────────────────────────────────────
    /* (parity P-01 · P-09 · Q-04, a deliberate change of this rule) the "Client and property" card is gone: the lead's info column on the left
       carries the client, Project info and Property info; its pencil is Edit details (the lead's form in place, the project's section after it) */
    console.log('Client and property — the info column')
    await go(`/projects/${ryan}`)
    const col = p.locator('aside[aria-label="Project info"]')
    ok(await col.isVisible() && await p.locator('[data-card="client"], [data-card="team"]').count() === 0, 'the info column on the left; no Client and property or Team card')
    ok(/Collaborators|Members/.test(await col.innerText()) /* (the calm UI build 2026-10-27, a deliberate change) B2: "Members" */ && /Project info/.test(await col.innerText()) && /Property info/.test(await col.innerText()), 'its sections: Collaborators · Project info · Property info')
    await col.getByRole('button', { name: 'Edit details' }).click(); await p.waitForTimeout(700)
    ok(await p.locator('[data-testid="project-details-section"]').isVisible() && /Rooms in the scope/.test(await dialog().innerText()), 'its pencil opens Edit details — the lead’s form with the project’s section (Q-04)')
    await dialog().getByRole('button', { name: 'Study', exact: true }).click(); await p.waitForTimeout(200)
    await p.locator('[data-testid="details-save"]').click(); await p.waitForTimeout(1500)
    ok(/Study/.test(sql(`select scope from projects where id='${ryan}'`)) && /Study/.test(await p.locator('[data-testid="info-project-scope"]').innerText()), 'the scope keeps the room, and Project info says it')
    ok(sql(`select count(*) from lead_events where project_id='${ryan}' and kind='project_edited' and detail like '%Scope%'`) === '1', 'its Activity line names the scope')
    // a direct project: the client's details, the phone with them
    await go(`/projects/${marcus}`)
    { const info = await p.locator('aside[aria-label="Project info"]').innerText()   // (parity P-01, a deliberate change of this rule) the info column's Property info and Project info
      ok(/1,050/.test(info) && /Scandinavian/.test(info) && /Kitchen, Bathroom 1 and Bathroom 2/.test(await p.locator('[data-testid="info-project-scope"]').innerText()), 'a direct project’s column shows floor area, style and the scope') }
    await p.locator('aside[aria-label="Project info"]').getByRole('button', { name: 'Edit details' }).click(); await p.waitForTimeout(700)
    /* (parity P-09 · D-08, a deliberate change of this rule) the lead form's block word for word — Lead name, Lead phone number, NRIC / FIN,
       Customer ID — then the project's section; the client's line in Activity is the lead form's `field_edited` */
    { const dt = await dialog().innerText()
      ok(/Edit details/.test(dt) && /* (the calm UI build 2026-10-27, a deliberate change) B2 2-33 · W-475: the "New lead" form — "Name*", "Mobile number*" */ /(^|\n)Name\*?(\n|$)/m.test(dt) && /NRIC \/ FIN/.test(dt) && /Customer ID/.test(dt) && /Project name/.test(dt) && /Rooms in the scope/.test(dt), 'Edit details: the lead form’s block (NRIC / FIN, Customer ID …) and the project’s section') }
    await shot('client-edit-1440')
    await dialog().getByLabel('Mobile number*', { exact: true }).fill('91')   /* (the calm UI build 2026-10-27, a deliberate change) B2 2-33 · W-475: the "New lead" form — "Name*", "Mobile number*" */
    await p.locator('[data-testid="details-save"]').click(); await p.waitForTimeout(500)
    ok(/Enter a valid 8-digit Singapore number/.test(await dialog().innerText()), 'the lead form’s phone rule')
    const editsBefore = Number(sql(`select count(*) from lead_events where lead_id='${marcusLead}' and kind='field_edited'`))
    await dialog().getByLabel('Mobile number*', { exact: true }).fill('96517777')
    await p.locator('[data-testid="details-save"]').click(); await p.waitForTimeout(1500)
    ok(sql(`select phone from leads where id='${marcusLead}'`) === '96517777' && /Details saved/.test(await snack().innerText()), 'Save writes the client’s record')
    ok(Number(sql(`select count(*) from lead_events where lead_id='${marcusLead}' and kind='field_edited' and lower(detail) like '%phone%'`)) > 0 && Number(sql(`select count(*) from lead_events where lead_id='${marcusLead}' and kind='field_edited'`)) === editsBefore + 1, 'Activity: the lead form’s “edited … — Phone: …” line')
    // (parity P-09 · D-15) E opens the same form on every tab
    await go(`/projects/${marcus}/tasks`)
    await p.keyboard.press('e'); await p.waitForTimeout(700)
    ok(/Edit details/.test(await dialog().innerText().catch(() => '')) && await p.locator('[data-testid="project-details-section"]').isVisible(), 'E opens Edit details on the Tasks tab')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    // ── (M-02) Notes & Logs and Questionnaire on the project ─────────────────────────────────────────────────────────────────────────────
    console.log('Notes & Logs · Questionnaire')
    await go(`/projects/${marcus}/notes`)
    ok(/Site visit|Visit/.test(await p.locator('main, body').first().innerText()) /* (the calm UI build 2026-10-27, a deliberate change) B2: "Visit" */ && /Contact log/.test(await p.locator('main, body').first().innerText()) && p.url().includes(`/projects/${marcus}/notes`), 'the direct project’s Notes & Logs, on the project’s address')
    await shot('notes-1440')
    await go(`/leads/${marcusLead}/notes`)
    ok(p.url().includes(`/projects/${marcus}/notes`), 'the client’s old Notes address lands on the project’s tab')
    await go(`/projects/${marcus}/questionnaire`)
    /* (simplify S-03 · Q-01, a deliberate change of this rule) Questionnaire is the Client tab's view: the strip lights Client, the view switch
       in the title line marks Questionnaire */
    ok(/^Client/.test(await p.locator('[role="tab"][aria-selected="true"]').innerText()) && /^Questionnaire/.test(await p.locator('[data-testid="project-view-chips"] [aria-checked="true"]').innerText()), 'the Questionnaire view is the project’s (Client › Questionnaire)')
    // (12) the tabs' counts — (simplify S-04, a deliberate change of this rule) a tab counts what waits on you there: the Tasks tab's badge is its
    // views' sum (All tasks; Compliance never counts on the strip), and the All tasks chip carries the same number
    await go(`/projects/${marcus}/tasks`)
    const tasksTab = p.locator('[role="tab"]').filter({ hasText: 'Tasks' })
    const chipN = Number((/·\s*(\d+)/.exec(await p.locator('[data-testid="project-view-chips"] [role="radio"]').filter({ hasText: 'All tasks' }).innerText()) ?? [])[1] ?? 0)
    const tabN = Number((/(\d+)/.exec(await tasksTab.innerText()) ?? [])[1] ?? 0)
    ok(tabN === chipN && !/\d/.test(await p.locator('[data-testid="project-view-chips"] [role="radio"]').filter({ hasText: 'Compliance' }).innerText()), `Tasks’ badge is the All tasks chip’s count (${chipN}); Compliance counts nothing on the strip`)

    // ── (6) the Contract step: upload the signed copy to Files › Contract ────────────────────────────────────────────────────────────────
    console.log('Contract step')
    await go(`/projects/${marcus}`)
    /* (simplify S-01, a deliberate change of this rule) Getting started's rows are Before work starts' (Needs you) */
    ok(await p.locator('[data-testid="need-setup-contract"]').getByRole('button', { name: 'Add' }).isVisible(), 'Before work starts asks for the contract')
    await p.locator('[data-testid="need-setup-contract"]').getByRole('button', { name: 'Add' }).click(); await p.waitForTimeout(900)
    ok(await p.locator('[data-testid="contract-dialog"]').isVisible() && /No contract yet/.test(await dialog().innerText()), 'the Contract dialog: no contract yet, link or upload')
    /* (simplify S-25 (2)) it names the folder it really files into, read from the record */
    ok(/filed in Files › (Contract & VOs|Contract)\./.test(await p.locator('[data-testid="contract-folder-line"]').innerText()), 'S-25 (2): the dialog names the real folder')
    await shot('contract-dialog-1440')
    await dialog().locator('input[type="file"]').setInputFiles({ name: 'Marcus-signed-contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 probe') }); await p.waitForTimeout(2200)
    const filed = sql(`select f.name from lead_files f join lead_files d on d.id = f.parent_id where f.lead_id='${marcusLead}' and d.name in ('Contract & VOs','Contract') and d.kind='folder' and f.deleted_at is null`)   /* (gaps build E, REG-e.10) the starter folder Contract & VOs is the contract's place now */
    ok(filed === 'Marcus-signed-contract.pdf' && /filed in Files › Contract/.test(await snack().innerText()), 'the copy is filed in Files › Contract')
    await go(`/projects/${marcus}`)
    ok(await p.locator('[data-testid="need-setup-contract"]').count() === 0 && await p.locator('[data-testid="doc-contract-file"]').count() === 1, 'the step leaves Needs you and Project info opens the copy')   // (simplify S-01, a deliberate change of this rule)

    // ── (4) the closing summary on a completed project ───────────────────────────────────────────────────────────────────────────────────
    console.log('Closing summary')
    await go(`/projects/${shalini}`)
    const cs = p.locator('[data-card="closing-summary"]').first()
    ok(await cs.isVisible() && /All of it/.test(await p.locator('[data-testid="closing-collected"]').innerText()), 'Shalini’s: contract against collected — all of it')
    ok(/50 days/.test(await p.locator('[data-testid="closing-days"]').innerText()) && /2 more than the 48 planned/.test(await p.locator('[data-testid="closing-days"]').innerText()) && /0 of 5/.test(await p.locator('[data-testid="closing-late"]').innerText()), 'days against plan, milestones finished late — from the records')
    await shot('closing-summary-1440', true)

    // ── (5) the handover: defer an item with its reason; the refund-due item ─────────────────────────────────────────────────────────────
    console.log('Handover — defer · refund')
    await go(`/projects/${tA.pid}`)
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */; await p.waitForTimeout(1500)
    ok(await p.locator('[data-testid="handover-summary"]').isVisible() && /Milestones finished late/.test(await p.locator('[data-testid="handover-summary"]').innerText()), 'the dialog shows the closing summary under the checklist')
    ok(/Hand over anyway/.test(await p.locator('[data-testid="handover-primary"]').innerText()), 'an open milestone: Hand over anyway')   // (the calm UI build 2026-10-27, a deliberate change) was Complete anyway
    await p.locator('[data-testid="check-milestones-defer"]').click(); await p.waitForTimeout(300)
    await dialog().getByLabel('Why defer it?').fill('Waterproofing cures for a week; the client agreed to hand over now')
    await p.waitForTimeout(300)
    ok(/Complete handover/.test(await p.locator('[data-testid="handover-primary"]').innerText()) && await dialog().getByLabel('Why complete it with items open?').count() === 0, 'every open item deferred: no other reason asked, Complete handover')
    await shot('handover-defer-1440')
    await p.locator('[data-testid="handover-primary"]').click(); await p.waitForTimeout(1800)
    const td = sql(`select stage || '|' || coalesce(json_extract(handover_deferred,'$[0].reason'),'') from projects where id='${tA.pid}'`)
    ok(td === 'completed|Waterproofing cures for a week; the client agreed to hand over now', `completed, the deferral on the record (${td})`)
    await go(`/projects/${tA.pid}`)
    ok(/item was deferred: 1 milestone not done — “Waterproofing cures for a week/.test(await p.locator('[data-testid="handover-bar"]').innerText()), 'the completed bar names the deferred item with its reason')
    await go(`/projects/${tB.pid}`)
    await stageMenu(); await menu(/^Completed/).click()   /* (parity P-08, a deliberate change of this rule) the handover runs from Stage ▾ › Completed */; await p.waitForTimeout(1500)
    ok(/Nothing is owed back to Probe/.test(await p.locator('[data-testid="check-refund"]').innerText()) && /S\$1,000\.00 more was collected than the S\$9,000\.00 contract/.test(await p.locator('[data-testid="check-refund"]').innerText()), 'over-collected: the refund-due item says how much')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    // ── (3 · 7 · 9 · 10 · 13) New project ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('New project')
    await go('/projects')
    await p.keyboard.press('c'); await p.waitForTimeout(700)
    const dlg = p.locator('[role="dialog"][aria-label="New project"]')
    await dlg.getByLabel('Client name').fill('Probe Tay')
    await dlg.getByLabel('Client’s phone number').fill('96417781')
    await dlg.getByLabel('Property type').click(); await p.waitForTimeout(300)
    await p.getByRole('option', { name: 'HDB 4-Room', exact: true }).click(); await p.waitForTimeout(200)
    ok((await dlg.getByLabel('Project name').inputValue()) === 'HDB 4-Room — Probe Tay', 'the name follows “{property type} — {client}” until typed')
    await dlg.getByLabel('Agreed value (S$)').fill('45000')
    /* (simplify Q-16 · P2 §6.2, a deliberate change of this rule) Floor area, Rooms and the first note sit under More details ▾ */
    await dlg.getByTestId('new-project-more').click(); await p.waitForTimeout(300)
    await dlg.getByLabel('Floor area (sq ft)').fill('950')
    await dlg.getByRole('button', { name: 'Kitchen', exact: true }).click()
    await dlg.getByRole('button', { name: 'Study', exact: true }).click()
    await dlg.getByLabel('A first note (optional)').fill('Client wants the study ready before school term.')
    await dlg.getByLabel('Assign member').click(); await p.waitForTimeout(500)
    const pick = p.locator('[role="option"]').filter({ hasText: 'Germaine' }).first()
    ok(/projects? running/.test(await pick.innerText()), 'the team picker says each member’s load')
    ok(await p.locator('[data-testid="assignee-suggestion"]').count() === 1, 'and the Assign popover’s suggestion heads the list')
    await pick.click(); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await dlg.getByLabel('Project name').fill(sql(`select name from projects where id='${aisha}'`))
    await shot('new-project-1440')
    await dlg.getByRole('button', { name: 'Create project' }).click(); await p.waitForTimeout(1800)
    ok(/A project with this name already exists/.test(await dlg.innerText()) && sql(`select count(*) from leads where name='Probe Tay'`) === '0', 'a taken name is said on its field — and nothing was saved (one transaction)')
    await dlg.getByLabel('Project name').fill('Study first — Probe Tay')
    await dlg.getByRole('button', { name: 'Create project' }).click(); await p.waitForTimeout(2200)
    made.lead = sql(`select id from leads where name='Probe Tay'`)
    made.project = made.lead ? sql(`select id from projects where lead_id='${made.lead}'`) : null
    const np = made.project ? sql(`select p.name || '|' || coalesce(p.scope,'') || '|' || coalesce(l.area_sqft,'') || '|' || l.direct from projects p join leads l on l.id = p.lead_id where p.id='${made.project}'`) : ''
    ok(np === 'Study first — Probe Tay|["Kitchen","Study"]|950|1', `created: its name, scope, floor area (${np})`)
    ok(made.lead && sql(`select count(*) from questions where lead_id='${made.lead}'`) === sql(`select count(*) from studio_scope_questions where is_enabled = 1`), 'its questionnaire starts with the studio’s enabled questions')
    ok(made.lead && sql(`select body from lead_notes where lead_id='${made.lead}'`) === 'Client wants the study ready before school term.', 'the first note starts its Notes & Logs')
    ok(made.lead && sql(`select count(*) from lead_events where lead_id='${made.lead}' and kind='project_created'`) === '1', 'its line, once')

    // ── (11) A page that fails: the shell stays, Try again; a failed shell falls to the root's notice ───────────────────────────────────
    console.log('Error page')
    sql(`alter table lead_file_renders rename to lead_file_renders_probe_off`)   // only the project's page reads it — its shell does not
    try {
      await p.goto(`${BASE}/projects/${ben}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
      ok(await p.locator('[data-testid="route-error"]').isVisible() && /Something went wrong/.test(await p.locator('[data-testid="route-error"]').innerText()) && await p.locator('[data-testid="route-error-page"] h1, [data-testid="route-error-page"] header').count() > 0, 'a failed page: “Something went wrong” under the module’s own header, in the shell')
      ok(await p.getByRole('button', { name: 'Try again' }).isVisible() && await p.getByRole('button', { name: 'Back to Projects' }).isVisible(), 'with Try again and Back to Projects')
      await shot('error-page-1440')
    } finally { sql(`alter table lead_file_renders_probe_off rename to lead_file_renders`) }
    await p.getByRole('button', { name: 'Try again' }).click(); await p.waitForTimeout(2500)
    ok(await p.locator('[data-testid="project-page"]').isVisible(), 'Try again draws the page once it loads')
    /* (parity map, a deliberate change of this rule) the rail's counts fail soft now (a badge that can't be read shows none), so the shell is
       made to fail through what it reads strictly: the signed-in team (AppShell › fetchSessionTeam) */
    sql(`alter table members rename to members_probe_off`)
    try {
      await p.goto(`${BASE}/projects/${ben}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
      ok(await p.locator('[data-testid="route-error"]').isVisible() && await p.getByRole('button', { name: 'Go back' }).isVisible(), 'a shell that fails: the root’s notice, Try again and Go back — never Next’s bare page')
      await shot('error-root-1440')
    } finally { sql(`alter table members_probe_off rename to members`) }

    // ── The phone (390, touch) ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
    m.on('pageerror', (e) => errors.push(`390: ${String(e).slice(0, 160)}`))
    await m.goto(`${BASE}/projects`, { waitUntil: 'networkidle' }); await m.waitForTimeout(1200)
    ok(reOf(holdTill).test(await m.locator('[data-kb-row]').filter({ hasText: 'Aisha' }).first().innerText()), 'the phone card says the hold')   // (parity P-14, a deliberate change of this rule)
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390')
    await m.screenshot({ path: path.join(dir, 'listing-390.png') })
    await m.goto(`${BASE}/projects/${aisha}`, { waitUntil: 'networkidle' }); await m.waitForTimeout(1200)
    ok(await m.locator('[data-testid="status-hold-row"]').isVisible() && await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'the Overview’s hold row, no sideways scroll')
    await m.screenshot({ path: path.join(dir, 'overview-hold-390.png'), fullPage: true })
    await m.goto(`${BASE}/projects/${shalini}`, { waitUntil: 'networkidle' }); await m.waitForTimeout(1200)
    const order = await m.evaluate(() => [...document.querySelectorAll('[data-card]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.getAttribute('data-card')))
    ok(order.indexOf('closing-summary') === order.indexOf('status') + 1 || order.indexOf('closing-summary') > order.indexOf('status'), 'the closing summary follows Status on a phone')
    await m.screenshot({ path: path.join(dir, 'closing-summary-390.png'), fullPage: true })
    await m.goto(`${BASE}/projects`, { waitUntil: 'networkidle' }); await m.waitForTimeout(1200)
    await m.getByRole('button', { name: 'New project' }).first().click(); await m.waitForTimeout(900)
    /* (simplify Q-16 · P2 §6.2, a deliberate change of this rule) the scope rests under More details ▾ */
    await m.locator('[role="dialog"][aria-label="New project"]').getByTestId('new-project-more').click().catch(() => {}); await m.waitForTimeout(400)
    ok(await m.locator('[role="dialog"][aria-label="New project"]').isVisible() && /Rooms in the scope/.test(await m.locator('[role="dialog"]').last().innerText()), 'New project on a phone: the sheet with the scope (under More details)')
    await m.screenshot({ path: path.join(dir, 'new-project-390.png') })
    await m.context().close()
    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 300))
  } finally {
    /* everything back as it was */
    const [at, reason, until, by] = keep.aishaHold.split('|')
    sql(`update projects set on_hold_at = ${at || 'null'}, on_hold_reason = ${reason ? `'${reason.replace(/'/g, "''")}'` : 'null'}, on_hold_until = ${until || 'null'}, on_hold_by = ${by ? `'${by}'` : 'null'} where id='${aisha}'`)
    sql(`delete from lead_events where project_id='${aisha}' and kind in ('project_resumed') and at >= ${T0}`)
    sql(`update projects set on_hold_at = null, on_hold_reason = null, on_hold_until = null, on_hold_by = null, name = '${keep.ryanName.replace(/'/g, "''")}', scope = ${keep.ryanScope ? `'${keep.ryanScope}'` : 'null'} where id='${ryan}'`)
    sql(`delete from lead_events where project_id in ('${ryan}','${marcus}') and kind in ('project_put_on_hold','project_resumed','project_edited','project_client_edited','project_renamed') and at >= ${T0}`)
    sql(`delete from lead_events where lead_id in ('${leadOf(ryan)}','${marcusLead}') and kind = 'field_edited' and at >= ${T0}`)   // (parity P-09) Edit details writes the lead form's line
    const [phone, area, style] = keep.marcusLead.split('|')
    sql(`update leads set phone='${phone}', area_sqft=${area || 'null'}, style=${style ? `'${style}'` : 'null'} where id='${marcusLead}'`)
    sql(`update projects set name='${keep.marcusName.replace(/'/g, "''")}' where id='${marcus}'`)
    sql(`delete from lead_files where lead_id='${marcusLead}' and created_at >= ${T0} * 1`)
    sql(`delete from lead_files where lead_id='${marcusLead}' and name in ('Marcus-signed-contract.pdf','Contract')`)
    for (const id of [made.lead, ...sql(`select id from leads where name='Probe Tay'`).split('\n')].filter(Boolean)) {
      /* the sqlite3 shell keeps foreign keys off — nothing cascades, so what hangs off the project goes first, by hand */
      for (const t of ['project_invoices', 'project_milestones']) sql(`delete from ${t} where project_id in (select id from projects where lead_id='${id}')`)
      for (const t of ['projects', 'lead_events', 'notifications', 'lead_notes', 'questions', 'lead_assignees']) sql(`delete from ${t} where lead_id='${id}'`)
      sql(`delete from leads where id='${id}'`)
    }
    if (keep.given) sql(`update settings set value='${keep.given}' where key='project_numbers_given'`)
    sql(`delete from project_payments where id='probe-ga-pay'`); sql(`delete from project_invoices where id='probe-ga-inv' or project_id in ('${tA.pid}','${tB.pid}')`); sql(`delete from project_milestones where id='probe-ga-ms'`)
    clean()
    if (you) as(you)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
