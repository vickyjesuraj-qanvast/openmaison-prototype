// Projects gaps build 2026-10-07 — package C, the schedule and tasks (the owner's "build everything"; M-03 and the report's §3). Each check asserts
// a rule: someone outside the studio on a task — the row's badge, the panel's section, Send on WhatsApp (wa.me on the press, the send recorded),
// the form's mobile rule, Undo, the Members filter and the search (1); Rebuild the schedule — the plan, the confirm that names what goes, Undo (2);
// the ready-made schedules and where a schedule starts — by property type, by project type in Settings (3); an uploaded quote making the
// milestones (4); more time asked by a Designer, answered by an Owner — the band, the panel, the bell, the dates carried, Undo (5); a milestone
// waiting on two — its chips, the links drawn, a broken link red (6); Share changes with ticks (7); the two approvals (8); "not right" marked
// resolved (9); the prompts after a start and a Done (10); a milestone's tasks edited in place (11); description, colour, the last shares (12);
// a row dragged, the name column widened, full screen (13); a milestone's invoices (14); the alerts' lead time (15); the Tasks page by project
// (16); the phone (390). Run against `next start -p 3123` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is
// put back in `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-c.cjs <scratch.db> [shotDir] [base URL]   (BASE wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-c')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3123'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gapc-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
/* (S45C — the demo moves with the restore day, S42A) a day this probe asserts is read from its record and worded as the app words it —
   never a window around the day the probe was written. A stored stamp is seconds or milliseconds; the day is the local one. */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toMs = (v) => { const n = Number(v); return n > 1e12 ? n : n * 1000 }
const dayMonthOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${d.getDate()} ${MON3[d.getMonth()]}` }   // "5 Oct"
const dayLabelOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${WD3[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}` }   // "Mon 19 Oct"
const displayDateOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${dayMonthOf(v)} ’${String(d.getFullYear()).slice(2)}` }   // "16 Nov ’26" (lib/format.ts displayDate)
const reOf = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const DAY = 86_400_000
const dayNum = (ms) => { const d = new Date(ms); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY) }
const TODAY = dayNum(Date.now())

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const T0 = Math.floor(Date.now() / 1000) - 2
  const you = sql(`select id from members where is_you = 1`)
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), marcus = P('P-2026-004')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), marcusLead = leadOf(marcus)
  const ids = `'${ryan}','${ben}','${marcus}'`, leads = `'${ryanLead}','${benLead}','${marcusLead}'`
  const M = (pid, title) => sql(`select id from project_milestones where project_id='${pid}' and title='${title.replace(/'/g, "''")}' and deleted_at is null`)
  const endOf = (pid, title) => dayNum(Number(sql(`select end_date from project_milestones where project_id='${pid}' and title='${title}' and deleted_at is null`)) * 1000)
  /* what the run may change, kept to put back: the three projects' records, the bell, two settings */
  const SNAP = [
    ['projects', `id in (${ids})`], ['project_milestones', `project_id in (${ids})`], ['project_milestone_links', `project_id in (${ids})`],
    ['project_milestone_extensions', `project_id in (${ids})`], ['project_share_requests', `project_id in (${ids})`], ['project_schedule_shares', `project_id in (${ids})`],
    ['project_updates', `project_id in (${ids})`], ['lead_tasks', `lead_id in (${leads})`], ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`],
    ['lead_events', `lead_id in (${leads})`], ['notifications', '1'], ['settings', `key in ('project_schedule_rules','project_schedule_type_defaults')`],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const putBack = () => {
    let text = 'BEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  /* a quote file the way a contractor sends it — the upload's reader takes its trades */
  const csv = path.join(dir, 'probe-contractor-quote.csv')
  fs.writeFileSync(csv, 'Item,Qty,Unit,Rate,Trade\nHack the kitchen wall,1,lot,800,Hacking\nTile the kitchen floor,20,sqm,60,Tiling\nRewire the kitchen,1,lot,1200,Electrical\nKitchen cabinets,1,lot,6000,Carpentry\nPaint the walls,1,lot,900,Painting\n')
  as('dane')
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' }))   // the draft opens; no network
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url, page = p) => { await page.goto(BASE + url, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000) }
    const shot = (n, full = false, page = p) => page.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = (page = p) => page.locator('[role="status"][aria-live="polite"]').last()
    const undo = async (page = p) => { await snack(page).getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1600) }
    const row = (title, page = p) => page.locator('[data-testid="schedule-timeline"] [data-kb-row]').filter({ hasText: title }).first()
    const openMs = async (title, page = p) => { await row(title, page).locator('[data-testid="milestone-name"]').click(); await page.waitForTimeout(900) }
    const panel = (page = p) => page.locator('[data-testid="milestone-panel"]')
    const closePanel = async (page = p) => { await page.keyboard.press('Escape'); await page.waitForTimeout(500) }
    const dialog = (page = p) => page.locator('[role="dialog"]').last()
    const section = async (name, fn) => { console.log(name); try { await fn() } catch (e) { fail++; console.log(`  ✗ ${name} stopped: ${String(e).slice(0, 240)}`) } }
    const pickDay = async (page, label, dayMs) => {
      await page.getByRole('button', { name: new RegExp(label) }).last().click(); await page.waitForTimeout(400)
      const d = new Date(dayMs)
      const want = `${d.getDate()} ${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`
      for (let i = 0; i < 3 && !(await page.locator(`[aria-label="${want}"]`).count()); i++) { await page.getByRole('button', { name: 'Next month' }).last().click(); await page.waitForTimeout(250) }
      await page.locator(`[aria-label="${want}"]`).first().click(); await page.waitForTimeout(400)
    }

    // ── (3) the ready-made schedules in the library; (3 · 4) where a schedule starts ─────────────────────────────────────────────────────
    await section('Ready-made schedules and the Start card', async () => {
      await go('/company/templates/schedules')
      const lib = await p.locator('main, body').first().innerText()
      ok(['HDB BTO', 'HDB resale', 'Condo', 'Landed', 'Commercial fit-out'].every((n) => lib.includes(n)) && /ready-made/i.test(lib), 'the library holds the five ready-made schedules, each saying so')   // (the calm UI build 2026-10-27, a deliberate change) 4-36: ready-made follows the facts
      await shot('library-ready-made-1440')
      await go(`/projects/${marcus}/schedule`)
      const st = () => p.locator('[data-testid="start-schedule"]').innerText()
      /* (the calm UI build 2026-10-27, a deliberate change — 3-34) the select names the ready-made template it picked (its helper went: the preview
         shows what it makes); a way that can't be used is one grey line, not a disabled card */
      ok(/Condo \(ready-made\)/.test(await st()), 'a direct condo project with no quote: the Start card picks the ready-made Condo schedule')
      ok(/Make a quote first to build from it/.test(await st()) && await p.locator('[data-testid="start-schedule"] [role="radio"]').filter({ hasText: /^A quote/ }).count() === 0, 'A quote is not offered; one line says what opens it')
      await shot('start-preselect-1440', true)
      /* Settings › Projects: a Partial renovation starts from HDB BTO */
      await go('/settings?section=projects')
      ok(await p.locator('[data-testid="schedule-settings"]').isVisible(), 'Settings › Projects has the Schedule card')
      await p.getByRole('combobox', { name: 'Partial renovation' }).click(); await p.waitForTimeout(300)
      await p.getByRole('option', { name: 'HDB BTO' }).click(); await p.waitForTimeout(1500)
      ok(/start(s)? from HDB BTO/i.test(await snack().innerText()) && /hdb/.test(sql(`select value from settings where key='project_schedule_type_defaults'`)), 'a project type takes its own start, with Undo')
      await shot('settings-schedule-1440')
      await go(`/projects/${marcus}/schedule`)
      ok(/HDB BTO \(ready-made\)/.test(await st()) && /Settings › Projects starts every partial renovation here/.test(await st()), 'Marcus’s partial renovation now starts from HDB BTO, saying so')
      sql(`delete from settings where key='project_schedule_type_defaults'`)
      /* (4) an uploaded quote: the reader takes its trades, the milestones follow the stages of work */
      await p.locator('[data-testid="start-schedule"]').getByText('An uploaded quote').click(); await p.waitForTimeout(300)
      await p.locator('[data-testid="source-file"]').setInputFiles(csv); await p.waitForTimeout(1200)
      const s2 = await st()
      ok(/probe-contractor-quote\.csv — 5 lines read/.test(s2) && /Hacking & demolition/.test(s2) && /Carpentry fabrication/.test(s2) && /Painting/.test(s2) && /Handover & defect check/.test(s2), 'an uploaded quote: 5 lines read, one milestone for each stage of work it names')
      await shot('start-upload-1440', true)
      await p.locator('[data-testid="create-schedule"]').click(); await p.waitForTimeout(2200)
      ok(Number(sql(`select count(*) from project_milestones where project_id='${marcus}' and deleted_at is null`)) >= 6 && /from the uploaded quote “probe-contractor-quote\.csv”/.test(sql(`select detail from lead_events where project_id='${marcus}' and kind='project_schedule_created' order by at desc limit 1`)), 'Create schedule makes them, its line naming the uploaded quote')
    })

    // ── (6) a milestone waiting on two; the links drawn; (12) the last shares; (13) the comforts ──────────────────────────────────────────
    await section('Links, the panel’s additions, the timeline’s comforts', async () => {
      await go(`/projects/${ryan}/schedule`)
      const links = await p.locator('[data-testid="schedule-link"]').count()
      ok(links >= 7 && await p.locator('[data-testid="schedule-link"][data-broken]').count() === 0, `the links are drawn (${links}), none broken`)
      await shot('ryan-schedule-1440', true)
      await openMs('Painting')
      const also = panel().locator('[data-testid="panel-also"]')
      ok(await also.isVisible() && await also.locator('button[aria-pressed="true"]').filter({ hasText: 'Electrical & plumbing' }).count() === 1, 'Painting waits for Carpentry and also for Electrical & plumbing (its chips)')
      ok(/It starts once Carpentry fabrication and Electrical & plumbing allow it/.test(await also.innerText()), '…said in a sentence')
      /* (12) its words and a colour, saved with one sentence and one Undo */
      await panel().getByLabel('Description').fill('Two coats throughout; the feature wall in Sage Whisper.')
      /* (the calm UI build 2026-10-27, a deliberate change — 3-46) the bar's colour sits under the panel's More options */
      if (await panel().locator('[data-testid="panel-more-options"]').count()) { await panel().locator('[data-testid="panel-more-options"]').click(); await p.waitForTimeout(300) }
      await panel().locator('[data-testid="panel-color"]').getByRole('radio', { name: 'Teal' }).click()
      await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(1600)
      ok(/changed its description and coloured its bar teal/.test(await snack().innerText()) && sql(`select color from project_milestones where id='${M(ryan, 'Painting')}'`) === 'teal', 'Save: "changed its description and coloured its bar teal"')
      ok(await row('Painting').locator('[data-testid="milestone-bar"][data-color="teal"]').count() === 1, 'the bar wears its colour')
      await undo()
      ok(sql(`select coalesce(color,'')||'|'||coalesce(description,'') from project_milestones where id='${M(ryan, 'Painting')}'`) === '|', 'Undo takes both back')
      /* (6) a further link through the panel, then off again; a broken link reads red */
      await go(`/projects/${ryan}/schedule`)
      await openMs('Handover')
      await panel().locator('[data-testid="panel-also-add"]').click(); await p.waitForTimeout(300)
      await panel().locator('[data-testid="panel-also"]').getByRole('button', { name: 'Painting' }).click()
      await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(1600)
      ok(/set it to wait on Painting too/.test(await snack().innerText()) && sql(`select count(*) from project_milestone_links where milestone_id='${M(ryan, 'Handover & defect check')}'`) === '1', 'a further link saves: "set it to wait on Painting too"')
      ok(await p.locator('[data-testid="schedule-link"]').count() === links + 1, 'and is drawn')
      await undo()
      ok(sql(`select count(*) from project_milestone_links where milestone_id='${M(ryan, 'Handover & defect check')}'`) === '0', 'Undo takes the link away')
      const linkGap = sql(`select gap_days from project_milestone_links where milestone_id='${M(ryan, 'Painting')}'`)
      sql(`update project_milestone_links set gap_days = 60 where milestone_id='${M(ryan, 'Painting')}'`)
      await go(`/projects/${ryan}/schedule`)
      ok(await p.locator('[data-testid="schedule-link"][data-broken]').count() === 1, 'a milestone that starts before a link allows: that link is red')
      await shot('link-broken-1440')
      sql(`update project_milestone_links set gap_days = ${linkGap} where milestone_id='${M(ryan, 'Painting')}'`)
      /* (12) the last shares that changed it */
      await go(`/projects/${ryan}/schedule`)
      await openMs('Carpentry')
      ok(/First shared · /.test(await panel().locator('[data-testid="panel-history"]').innerText()), 'the panel lists its last shares ("First shared · …")')
      await closePanel()
      /* (13) a row dragged to a new place — the order only, with Undo */
      const before = sql(`select group_concat(title, '|') from (select title from project_milestones where project_id='${ryan}' and deleted_at is null order by position)`)
      await row('Painting').hover(); await p.waitForTimeout(200)
      const grip = await row('Painting').locator('[data-testid="milestone-grip"]').boundingBox()
      await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2); await p.mouse.down()
      for (let i = 1; i <= 8; i++) { await p.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - i * 9); await p.waitForTimeout(30) }
      ok(await p.locator('[data-testid="schedule-timeline"] [data-drop]').count() === 1, 'while it is dragged, a line shows where it lands')
      await p.mouse.up(); await p.waitForTimeout(1600)
      const after = sql(`select group_concat(title, '|') from (select title from project_milestones where project_id='${ryan}' and deleted_at is null order by position)`)
      ok(after !== before && after.indexOf('Painting') < after.indexOf('Carpentry') && /Painting moved — now 4th of 7/.test(await snack().innerText()), 'dropped above Carpentry: "Painting moved — now 4th of 7"')
      await undo()
      ok(sql(`select group_concat(title, '|') from (select title from project_milestones where project_id='${ryan}' and deleted_at is null order by position)`) === before, 'Undo puts the order back')
      /* (13) the name column widened by its handle, 180–400 */
      await go(`/projects/${ryan}/schedule`)
      const head = p.locator('[data-testid="schedule-timeline"] [role="columnheader"]').first()
      const w0 = (await head.boundingBox()).width
      const h = await head.locator('[role="separator"]').boundingBox()
      await p.mouse.move(h.x + 4, h.y + 10); await p.mouse.down(); await p.mouse.move(h.x + 140, h.y + 10, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400)
      const w1 = (await head.boundingBox()).width
      ok(w1 > w0 && w1 <= 401, `the name column widens and stops at 400 (${Math.round(w0)} → ${Math.round(w1)})`)
      /* (13) full screen, and Esc back */
      await p.locator('[data-testid="schedule-full"]').first().click(); await p.waitForTimeout(600)
      ok(await p.locator('[data-testid="schedule-full-view"] [data-testid="schedule-timeline"]').isVisible(), 'Full screen: the list takes the window')
      await shot('full-screen-1440')
      await p.keyboard.press('Escape'); await p.waitForTimeout(500)
      ok(await p.locator('[data-testid="schedule-full-view"]').count() === 0, 'Esc brings it back')
    })

    // ── (5) more time: asked by a Designer, answered by an Owner ────────────────────────────────────────────────────────────────────────
    await section('More time asked and answered', async () => {
      const carp = M(ryan, 'Carpentry fabrication'), paint = M(ryan, 'Painting')
      await go(`/projects/${ryan}/schedule`)
      /* (the calm UI build 2026-10-27, a deliberate change — 3-01) the band above the list is gone: the asking row says it, and its ⋮ opens the ask */
      ok(await p.locator('[data-testid="schedule-asks"]').count() === 1 && /More time asked, to /.test(await p.locator('[data-testid="schedule-asks"]').innerText()), 'the tab says what waits on an Owner: Michelle’s ask, on its row')
      ok(/More time asked, to /.test(await row('Carpentry').innerText()), 'the row says it')
      await go('/projects')
      await go(`/projects/${ryan}`)
      /* (simplify S-20, a deliberate change of this rule) the ask is a Needs your OK row — approve in the row; its words open the milestone */
      /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
      { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
      ok(/(asks for 1 week more on|More time on) Carpentry fabrication/.test(await p.locator('[data-testid="need-approve-more-time"]').innerText().catch(() => ''))   /* (the calm UI build 2026-10-27, a deliberate change) the person and the ask first (1-08 · W-048) */ && await p.locator('[data-testid="need-approve-more-time"]').getByRole('button', { name: 'Approve' }).count() === 1, 'Needs your OK: "More time on Carpentry fabrication" · Approve')
      await p.locator('[data-testid="need-approve-more-time"] a').first().click().catch(() => {}); await p.waitForTimeout(1500)
      ok(p.url().includes(`/projects/${ryan}/schedule?open=${carp}`), 'the row opens the Schedule at that milestone')   // (parity P-05 · A-18) it pressed nowhere
      await go('/projects')
      await p.locator('[data-notifications-tile]').click(); await p.waitForTimeout(1200)
      const bellRow = p.locator('[data-testid="notification-row"]').filter({ hasText: 'Michelle asks for 1 week more on Carpentry fabrication' }).first()
      ok(await bellRow.count() === 1, 'the bell: "Michelle asks for 1 week more on Carpentry fabrication"')
      /* (simplify round 2, a deliberate change of this rule — P2 §6.7) the ask answers in the bell's row too: Approve · Decline under its words; the
         words still open the record (the row's first button)
         (the calm UI build 2026-10-27) 1-03 · 1-20: the row's words open the Dashboard's Review pane on the ask — (Vicky 2026-10-29: brought back) its Approve · Decline act in
         the row again, as before; the milestone's own panel still answers it (below, opened from the Schedule) */
      ok(await bellRow.getByTestId('notification-approve').count() === 1 && /^Approve$/.test((await bellRow.getByTestId('notification-approve').innerText().catch(() => '')).trim()) && /^Decline$/.test((await bellRow.getByTestId('notification-send-back').innerText().catch(() => '')).trim()), 'the bell row carries Approve · Decline')   // (Vicky 2026-10-29: brought back)
      await bellRow.locator('button').first().click(); await p.waitForTimeout(2200)
      /* (the calm UI build 2026-10-27, a deliberate change — 1-03 · 1-20) the row goes to `/dashboard?review=<record>`; the inbox reads it once and lets
         the address go (needs-inbox.tsx — a reload doesn't open it again), so the rule is read on the page: the Dashboard, its Review pane open on this ask */
      ok(/\/dashboard(\?|$)/.test(p.url()) && await p.locator('[data-testid="review-pane"]').first().isVisible().catch(() => false) && /Michelle asks for 1 week more on Carpentry fabrication/.test(await p.locator('[data-testid="review-pane"]').first().innerText().catch(() => '')), 'its row opens the Dashboard’s Review pane on the ask')
      await go(`/projects/${ryan}/schedule?open=${carp}`)
      ok(await panel().locator('[data-testid="panel-more-ask"]').isVisible(), '…and the milestone’s own panel holds the ask')
      await shot('more-ask-panel-1440')
      const end0 = endOf(ryan, 'Carpentry fabrication'), paint0 = sql(`select start_date from project_milestones where id='${paint}'`)
      await panel().locator('[data-testid="approve-more"]').click(); await p.waitForTimeout(400)
      await dialog().locator('[data-testid="approve-more-dialog-go"]').click(); await p.waitForTimeout(2000)
      ok(/Carpentry (moved 1 week later|now ends .*, 1 week later)\./.test(await snack().innerText()) && /A draft update waits in Updates/.test(await snack().innerText()), 'Approve: the one sentence, the draft update said')
      ok(endOf(ryan, 'Carpentry fabrication') === end0 + 7 && sql(`select start_date from project_milestones where id='${paint}'`) !== paint0 && sql(`select status from project_milestone_extensions where milestone_id='${carp}'`) === 'approved', 'the last day moves a week, what follows moves with it, the ask is approved')
      ok(sql(`select count(*) from project_updates where project_id='${ryan}' and status='draft' and title='New finish date for Carpentry fabrication' and deleted_at is null`) === '1', 'a draft progress update for the client waits in Updates')
      await undo()
      ok(endOf(ryan, 'Carpentry fabrication') === end0 && sql(`select status from project_milestone_extensions where milestone_id='${carp}'`) === 'pending' && sql(`select count(*) from project_updates where project_id='${ryan}' and title='New finish date for Carpentry fabrication' and deleted_at is null`) === '0', 'Undo: the dates back, the ask waiting again, the draft gone')
      /* Decline, with a note */
      await go(`/projects/${ryan}/schedule?open=${carp}`)
      await panel().locator('[data-testid="decline-more"]').click(); await p.waitForTimeout(400)
      await dialog().getByLabel('A note (optional)').fill('Ask the factory for the 12th — the client moves in on the 30th')
      await dialog().locator('[data-testid="decline-more-dialog-go"]').click(); await p.waitForTimeout(1600)
      ok(/More time on Carpentry declined — Michelle hears it/.test(await snack().innerText()) && sql(`select status||'|'||answer_note from project_milestone_extensions where milestone_id='${carp}'`) === 'declined|Ask the factory for the 12th — the client moves in on the 30th', 'Decline with a note — Michelle hears it')
      ok(sql(`select count(*) from notifications where member_id='michelle' and kind='schedule_answer' and created_at >= ${T0}`) === '1', 'her bell row is written')
      await undo()
      ok(sql(`select status from project_milestone_extensions where milestone_id='${carp}'`) === 'pending', 'Undo: waiting again')
      /* (simplify round 2, S-20 · P2 §6.7 — a deliberate change of this rule) the Needs your OK row's Decline answers in place: the Schedule's own
         dialog opens on the Overview, with the tab's sentence and Undo */
      await go(`/projects/${ryan}`)
      { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
      await p.locator('[data-testid="need-approve-more-time"] [data-testid="need-more"]').click(); await p.waitForTimeout(300)   /* (the calm UI build 2026-10-27, a deliberate change) one verb a row — Send back / Decline is the row's ⋮ (3-05 · 3-22) */
      await p.locator('[data-testid="need-send-back"] [role="menuitem"]').click(); await p.waitForTimeout(500)
      ok(await dialog().locator('[data-testid="decline-more-dialog"]').isVisible() && !p.url().includes('/schedule'), 'the row’s Decline opens the Schedule’s own dialog on the Overview')
      await dialog().getByLabel('A note (optional)').fill('Not this week')
      await dialog().locator('[data-testid="decline-more-dialog-go"]').click(); await p.waitForTimeout(1800)
      ok(/More time on Carpentry declined — Michelle hears it/.test(await snack().innerText()) && sql(`select status||'|'||answer_note from project_milestone_extensions where milestone_id='${carp}'`) === 'declined|Not this week', 'Decline from the row — the tab’s sentence, the note kept')
      await undo()
      ok(sql(`select status from project_milestone_extensions where milestone_id='${carp}'`) === 'pending', 'its Undo: waiting again')
      /* Michelle's side: her ask, and a new one on a late milestone */
      as('michelle')
      await go(`/projects/${ryan}/schedule?open=${carp}`)
      ok(/You asked to end it .* — waiting for an Owner or an Admin\./.test(await panel().locator('[data-testid="panel-more-ask"]').innerText()) && await panel().locator('[data-testid="withdraw-more"]').count() === 1 && await panel().locator('[data-testid="approve-more"]').count() === 0, 'Michelle reads her ask waiting, with Take it back — no Approve')
      await closePanel()
      await openMs('Electrical')
      await panel().locator('[data-testid="ask-more"]').click(); await p.waitForTimeout(400)
      const elecEnd = Number(sql(`select end_date from project_milestones where id='${M(ryan, 'Electrical & plumbing')}'`)) * 1000
      await pickDay(p, 'New last day', elecEnd + 30 * DAY)
      await dialog().getByLabel('Why it needs more time').fill('The plumber’s pressure test is booked for the 20th')
      await dialog().locator('[data-testid="more-dialog-go"]').click(); await p.waitForTimeout(1600)
      ok(/Asked for .* more on Electrical — an Owner or an Admin answers it\./.test(await snack().innerText()) && sql(`select count(*) from project_milestone_extensions where milestone_id='${M(ryan, 'Electrical & plumbing')}' and status='pending'`) === '1', 'a Designer asks for more time on a late milestone — waiting for an Owner')
      ok(sql(`select count(*) from notifications where kind='schedule_ask' and member_id in ('dane','huimin') and created_at >= ${T0}`) === '2', 'Owners and Admins hear it in the bell')
      await undo()
      ok(sql(`select count(*) from project_milestone_extensions where milestone_id='${M(ryan, 'Electrical & plumbing')}'`) === '0' && sql(`select count(*) from notifications where kind='schedule_ask' and created_at >= ${T0}`) === '0', 'its Undo takes the ask, its line and its bell rows away')
      /* (simplify Q-18) the extension rule restrains: Michelle's later end on the late milestone is the ask for more time, never a new date */
      await go(`/projects/${ryan}/schedule`)
      await openMs('Electrical')
      const elecEnd0 = sql(`select end_date from project_milestones where id='${M(ryan, 'Electrical & plumbing')}'`)
      await panel().getByRole('button', { name: '1 week' }).click()
      await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(900)
      ok(await p.locator('[data-testid="more-dialog"]').isVisible() && sql(`select end_date from project_milestones where id='${M(ryan, 'Electrical & plumbing')}'`) === elecEnd0, 'Q-18: a Designer’s later end opens Ask for more time — the date stays')
      await dialog().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(400)
      await closePanel()
      as('dane')
    })

    // ── (8) the approvals; (7) Share changes with ticks ────────────────────────────────────────────────────────────────────────────────
    await section('Approvals and Share changes with ticks', async () => {
      await go('/settings?section=projects')
      for (const k of ['completionApproval', 'shareApproval']) { await p.locator(`[data-testid="schedule-rule-${k}"] label`).first().click(); await p.waitForTimeout(1300) }
      const rules = sql(`select value from settings where key='project_schedule_rules'`)
      ok(/"completionApproval":true/.test(rules) && /"shareApproval":true/.test(rules), 'Settings › Projects › Schedule: both approvals on')
      /* a Designer's Done waits */
      as('michelle')
      await go(`/projects/${ryan}/schedule`)
      await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
      await p.getByRole('menuitemradio', { name: 'Done' }).click(); await p.waitForTimeout(1600)
      const paint = M(ryan, 'Painting')
      /* (simplify S-18, a deliberate change of this rule) the Done opens the Mark done sheet — under approval it reads "Ask to approve", and its
         ticks ride with the ask (done_ask_json); they are unticked here so the approval itself is what is checked */
      const ds = p.locator('[data-testid="done-sheet"]')
      ok(await p.locator('[data-testid="done-sheet-approval"]').isVisible() && /Ask to approve/.test(await p.locator('[data-testid="done-sheet-confirm"]').innerText()), 'Michelle’s Mark done sheet: Ask to approve')
      for (const t of ['done-sheet-share', 'done-sheet-confirm-ask', 'done-sheet-invoice']) { const c = ds.locator(`[data-testid="${t}"] input`); if (await c.count() && await c.isChecked() && await c.isEnabled()) await ds.locator(`[data-testid="${t}"]`).click() }
      await p.locator('[data-testid="done-sheet-confirm"]').click(); await p.waitForTimeout(1800)
      ok(/Painting waits for an Owner or an Admin to approve it as done\./.test(await snack().innerText()) && sql(`select status||'|'||done_asked_by from project_milestones where id='${paint}'`) === 'not_started|michelle', 'Michelle’s Done waits: the status stays, the ask is on the record')
      ok(sql(`select done_ask_json is not null from project_milestones where id='${paint}'`) === '1', '…with the sheet’s ticks on the record, for the approval to run')
      ok(/Done — waiting for approval/.test(await row('Painting').innerText()), 'the row says so')
      as('dane')
      await go(`/projects/${ryan}/schedule?open=${paint}`)
      ok(/Michelle marked it done on .* — approve it\?/.test(await panel().locator('[data-testid="panel-done-ask"]').innerText()), 'Dane reads the Done to approve in the panel')
      await shot('done-ask-panel-1440')
      await panel().locator('[data-testid="approve-done"]').click(); await p.waitForTimeout(1800)
      ok(sql(`select status||'|'||coalesce(done_asked_at,'') from project_milestones where id='${paint}'`) === 'done|' && /approved for Michelle/.test(await snack().innerText()), 'Approve as done: it is done, approved for Michelle')
      await undo()
      ok(sql(`select status||'|'||done_asked_by from project_milestones where id='${paint}'`) === 'not_started|michelle', 'Undo: waiting again')
      sql(`update project_milestones set done_asked_by = null, done_asked_at = null, done_ask_json = null where id='${paint}'`)
      /* a Designer's share asks; an Owner sends it back */
      as('germaine')
      await go(`/projects/${ben}/schedule?share=1`)
      const n = await p.locator('[data-testid="share-tick"]').count()
      ok(n >= 2 && /Ask to share \d+ changes/.test(await p.locator('[data-testid="share-confirm"]').innerText()), `Germaine’s Share changes asks an Owner or an Admin (${n} changes)`)
      await p.locator('[data-testid="share-confirm"]').click(); await p.waitForTimeout(1600)
      ok(sql(`select count(*) from project_share_requests where project_id='${ben}' and status='pending'`) === '1' && /Asked an Owner or an Admin to share/.test(await snack().innerText()), 'the ask is stored — nothing reaches Benjamin')
      as('dane')
      await go(`/projects/${ben}/schedule`)
      ok(/Germaine asked to share \d+ changes with Benjamin/.test(await p.locator('[data-testid="share-ask-band"]').innerText()), 'Dane reads the ask on the Schedule')
      await p.locator('[data-testid="share-ask-review"]').click(); await p.waitForTimeout(800)
      ok(/Germaine asked on .* to share \d+ changes/.test(await p.locator('[data-testid="share-ask"]').innerText()), 'Share changes shows who asked and what')
      await p.locator('[data-testid="share-send-back"]').click(); await p.waitForTimeout(300)
      await dialog().getByLabel('Why it isn’t shared yet').fill('Wait for the laminate date first')
      await p.locator('[data-testid="share-send-back-go"]').click(); await p.waitForTimeout(1600)
      ok(sql(`select status||'|'||answer_note from project_share_requests where project_id='${ben}' order by requested_at desc limit 1`) === 'sent_back|Wait for the laminate date first', 'Send back with a note')
      sql(`delete from settings where key='project_schedule_rules'`)
      /* (7) the ticks: share some, hold the rest */
      await go(`/projects/${ben}/schedule?share=1`)
      const ticks = p.locator('[data-testid="share-tick"]')
      const total = await ticks.count()
      await ticks.nth(total - 1).click({ force: true }); await p.waitForTimeout(300)
      ok(new RegExp(`Share ${total - 1} of ${total} changes`).test(await p.locator('[data-testid="share-confirm"]').innerText()) && /1 change held back — Benjamin keeps seeing it as shared before/.test(await p.locator('[data-testid="share-held"]').innerText()), `one change held back: "Share ${total - 1} of ${total} changes"`)
      await shot('share-ticks-1440')
      const heldTitle = (await p.locator('[data-testid="share-changes"] li').nth(total - 1).locator('[class*="changeName"]').innerText()).trim()
      const lastId = sql(`select id from project_milestones where project_id='${ben}' and title='${heldTitle.replace(/'/g, "''")}' and deleted_at is null`)
      await p.locator('[data-testid="share-confirm"]').click(); await p.waitForTimeout(1800)
      const snap = sql(`select snapshot from project_schedule_shares where project_id='${ben}' order by shared_at desc limit 1`)
      const prev = sql(`select snapshot from project_schedule_shares where project_id='${ben}' order by shared_at desc limit 1 offset 1`)
      const endIn = (s) => (JSON.parse(s).rows.find((r) => r.id === lastId) || {}).end
      ok(sql(`select json_array_length(changes) from project_schedule_shares where project_id='${ben}' order by shared_at desc limit 1`) === String(total - 1) && endIn(snap) === endIn(prev), 'the share carries the ticked changes; the held one reads as Benjamin last saw it')
    })

    // ── (9) "not right" answered; (14) a milestone's invoices; (10) the prompts ─────────────────────────────────────────────────────────
    await section('Resolved, invoices, the prompts', async () => {
      const mas = M(ben, 'Masonry & tiling'), el = M(ben, 'Electrical & plumbing')
      await go(`/projects/${ben}/schedule?open=${el}`)
      { const at = sql(`select resolved_at from project_milestones where id='${el}'`)   // (S45C) the day it was resolved, from its record
        ok(reOf(`Resolved ${dayMonthOf(at)} — Benjamin reads: “Moved both kitchen sockets up to 1,100 mm`).test(await panel().innerText()), `Benjamin’s “not right”, resolved ${dayMonthOf(at)}: the note he reads, on the stage`) }
      const inv = panel().locator('[data-testid="panel-invoice"]')
      ok(await inv.count() >= 1 && /money\?open=/.test(await inv.first().getAttribute('href')), 'its invoice in the panel, opening on Money')
      await shot('panel-invoices-1440')
      sql(`update project_milestones set confirm_answer='changes', confirm_note='The grout lines are uneven by the window', confirm_answered_at=${T0} where id='${mas}'`)
      await go(`/projects/${ben}/schedule?open=${mas}`)
      await panel().locator('[data-testid="panel-resolve"]').click(); await p.waitForTimeout(400)
      await dialog().getByLabel(/What you changed/).fill('Re-grouted the window line — the photos are in Updates.')
      await dialog().locator('[data-testid="resolve-dialog-go"]').click(); await p.waitForTimeout(1600)
      ok(/marked resolved — Benjamin reads your note and is asked to confirm it again/.test(await snack().innerText()) && sql(`select coalesce(confirm_answer,'')||'|'||resolved_note from project_milestones where id='${mas}'`) === '|Re-grouted the window line — the photos are in Updates.', 'Mark resolved: the note on the stage, Benjamin asked again')
      await undo()
      ok(sql(`select confirm_answer||'|'||coalesce(resolved_note,'') from project_milestones where id='${mas}'`) === 'changes|', 'Undo: his answer stands again, no note')
      /* (10) the prompts */
      const paint = M(ryan, 'Painting'), elec = M(ryan, 'Electrical & plumbing')
      await go(`/projects/${ryan}/schedule`)
      await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
      await p.getByRole('menuitemradio', { name: 'In progress' }).click(); await p.waitForTimeout(1600)
      const nudge = p.locator('[data-testid="schedule-nudge"]')
      ok(/Painting has started — tell Ryan, or line up its tasks/.test(await nudge.innerText()) && (await nudge.locator('[data-testid="nudge-update"]').getAttribute('href')).includes(`updates?new=1&milestone=${paint}`), 'Started: the prompt — Post an update (the milestone picked) · Add tasks')
      ok(sql(`select started_at is not null from project_milestones where id='${paint}'`) === '1', 'the day it started is logged')
      await shot('nudge-started-1440')
      await undo()
      ok(sql(`select status||'|'||coalesce(started_at,'') from project_milestones where id='${paint}'`) === 'not_started|', 'Undo: not started, no start day')
      await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
      await p.getByRole('menuitemradio', { name: 'In progress' }).click(); await p.waitForTimeout(1600)
      await nudge.locator('[data-testid="nudge-tasks"]').click(); await p.waitForTimeout(900)
      ok(await panel().getByLabel('New task').count() === 1, 'Add tasks opens its panel on the task field')
      await closePanel()
      await undo()
      await go(`/projects/${ryan}/schedule`)
      /* (simplify S-18, a deliberate change of this rule) the done prompt is the Mark done sheet's own ticks — Add photos, and the stage's invoice */
      await row('Electrical').locator('[data-testid="mark-done"]').click(); await p.waitForTimeout(1800)
      const dsheet = p.locator('[data-testid="done-sheet"]')
      ok(/Mid-Project invoice/.test(await dsheet.locator('[data-testid="done-sheet-money"]').innerText().catch(() => '')) && await dsheet.locator('[data-testid="done-sheet-photos"]').count() === 1, 'Done: the sheet offers Add photos and the Mid-Project invoice')
      await shot('nudge-done-1440')
      await dialog().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(600)
      ok(sql(`select status from project_milestones where id='${elec}'`) === 'blocked', 'Cancel leaves it as it was')
    })

    // ── (11) a milestone's tasks edited in place; (1) someone outside the studio ─────────────────────────────────────────────────────────
    await section('Tasks in the panel, outside people', async () => {
      const quartz = sql(`select id from lead_tasks where lead_id='${benLead}' and title='Install the quartz countertop'`)
      await go(`/projects/${ben}/schedule?open=${M(ben, 'Carpentry fabrication')}`)
      const t = panel().locator('[data-testid="panel-task"]').filter({ hasText: 'Install the quartz countertop' }).first()
      await t.locator('[data-testid="panel-task-open"]').click(); await p.waitForTimeout(500)
      { const sent = sql(`select external_sent_at from lead_tasks where id='${quartz}'`)   // (S45C) the day it was sent, from its record
        ok(reOf(`Ah Seng Stone Works · outside the studio · sent ${dayMonthOf(sent)}`).test(await t.innerText()) && await t.locator('[data-testid="panel-task-send"]').count() === 1, `a task opens in place: its outside person, sent ${dayMonthOf(sent)}, Send on WhatsApp`) }
      await t.getByLabel('Description').fill('Bring the template for the sink cut-out'); await p.keyboard.press('Tab'); await p.waitForTimeout(1500)
      ok(sql(`select description from lead_tasks where id='${quartz}'`) === 'Bring the template for the sink cut-out', 'its description saves as it is left')
      await t.getByRole('button', { name: 'Sarah', exact: true }).click(); await p.waitForTimeout(1500)
      ok(sql(`select count(*) from task_assignees where task_id='${quartz}' and member_id='sarah'`) === '1', 'a member put on it from the panel')
      await shot('panel-task-1440')
      await closePanel()
      /* the Tasks tab: the badges, the panel's section, Send on WhatsApp */
      await go(`/projects/${ben}/tasks`)
      ok(await p.locator('[data-testid="outside-badge"]').count() >= 2, 'the rows show the outside people beside the members')
      await p.locator('[data-kb-row]').filter({ hasText: 'Wardrobe laminate delivered' }).first().getByRole('button', { name: /^Open Wardrobe/ }).click(); await p.waitForTimeout(900)
      const sec = p.locator('[data-testid="panel-outside"]')
      /* (the calm UI build 2026-10-27, a deliberate change — 1-23 · W-103) a supplier reads "Vendor", Finance's word (lib/leads/outside.ts OUTSIDE_LABEL; the stored kind stays `supplier`) */
      ok(/Jason Lim \(Lamitak\)/.test(await sec.innerText()) && /Vendor · 9182 7340/.test(await sec.innerText()) && /Not sent yet/.test(await sec.innerText()), 'the task’s panel: who, a supplier (“Vendor”), their mobile, not sent yet')
      const lam = sql(`select id from lead_tasks where lead_id='${benLead}' and title='Wardrobe laminate delivered'`)
      const [wa] = await Promise.all([ctx.waitForEvent('page', { timeout: 6000 }), sec.locator('[data-testid="outside-send"]').click()])
      await wa.waitForURL(/wa\.me/, { timeout: 5000 }).catch(() => {})
      const waUrl = decodeURIComponent(wa.url())
      ok(/wa\.me\/6591827340/.test(waUrl) && /Hi Jason, a job from .* for Benjamin Han/.test(waUrl) && /Wardrobe laminate delivered/.test(waUrl), 'Send on WhatsApp: the task drafted to Jason’s mobile, opened on the press')
      await wa.close(); await p.waitForTimeout(1500)
      ok(sql(`select external_sent_at is not null from lead_tasks where id='${lam}'`) === '1' && sql(`select count(*) from lead_events where lead_id='${benLead}' and kind='task_sent_outside' and json_extract(detail,'$.id')='${lam}'`) === '1', 'the send is recorded — the day on the task, a line in Activity')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      /* the form: a Singapore mobile; Undo */
      const cab = sql(`select id from lead_tasks where lead_id='${benLead}' and title='Install the kitchen cabinets'`)
      await p.locator('[data-kb-row]').filter({ hasText: 'Install the kitchen cabinets' }).first().getByRole('button', { name: /^Open Install the kitchen/ }).click(); await p.waitForTimeout(900)
      await p.locator('[data-testid="outside-add"]').click(); await p.waitForTimeout(400)
      ok(/On other tasks/.test(await p.locator('[data-testid="outside-dialog"]').innerText()), 'the form offers the people already on tasks')
      await dialog().getByLabel('Name').fill('Kumar Electrical')
      await dialog().getByLabel('Mobile number').fill('61234567')
      await p.locator('[data-testid="outside-save"]').click(); await p.waitForTimeout(500)
      ok(/Enter a Singapore mobile number — 8 or 9 first/.test(await p.locator('[data-testid="outside-dialog"]').innerText()), 'a landline is refused: WhatsApp needs a mobile')
      await dialog().getByLabel('Mobile number').fill('91234568')
      await p.locator('[data-testid="outside-save"]').click(); await p.waitForTimeout(1600)
      ok(sql(`select external_name||'|'||external_phone||'|'||external_kind from lead_tasks where id='${cab}'`) === 'Kumar Electrical|91234568|subcontractor' && /Kumar Electrical added to the task/.test(await snack().innerText()), 'added — the person on the task')
      await undo()
      ok(sql(`select coalesce(external_name,'') from lead_tasks where id='${cab}'`) === '', 'Undo takes them off again')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      /* the filters and the search know them */
      await p.getByRole('button', { name: /^Filters/ }).first().click(); await p.waitForTimeout(500)
      await p.getByRole('tab', { name: /Members/ }).click(); await p.waitForTimeout(300)
      ok(await p.locator('[data-testid="filter-outside"]').count() === 2, 'Filters › Members lists the two outside people')
      await p.locator('[data-testid="filter-outside"]').filter({ hasText: 'Ah Seng' }).click(); await p.waitForTimeout(600)
      await p.getByRole('button', { name: 'Done' }).last().click(); await p.waitForTimeout(500)
      const rows = await p.locator('[data-kb-list="task"] [data-kb-row]').allInnerTexts()
      ok(rows.length === 1 && /Install the quartz countertop/.test(rows[0]), 'ticking Ah Seng narrows the list to his task')
      await go(`/projects/${ben}/tasks`)
      await p.getByRole('searchbox').first().fill('Lamitak').catch(async () => { await p.getByPlaceholder(/Search/).first().fill('Lamitak') }); await p.waitForTimeout(600)
      ok((await p.locator('[data-kb-list="task"] [data-kb-row]').allInnerTexts()).every((t) => /Wardrobe laminate/.test(t)), 'the search finds a task by its outside person')
      await shot('tasks-outside-1440')
      /* a lead's task has it too — one Tasks tab */
      const plainLead = sql(`select l.id from leads l where l.deleted_at is null and coalesce(l.direct,0)=0 and l.stage <> 'Won' and exists (select 1 from lead_tasks t where t.lead_id=l.id) limit 1`)
      await go(`/leads/${plainLead}/tasks`)
      await p.locator('[data-kb-row]').first().getByRole('button', { name: /^Open / }).click(); await p.waitForTimeout(800)
      ok(await p.locator('[data-testid="panel-outside"]').isVisible(), 'a lead’s task offers someone outside the studio too')
    })

    // ── (2) Rebuild; (15) the lead time; (16) the Tasks page by project ─────────────────────────────────────────────────────────────────
    await section('Rebuild, the lead time, the Tasks page', async () => {
      const live = () => sql(`select group_concat(id) from (select id from project_milestones where project_id='${ryan}' and deleted_at is null order by id)`)
      const before = live()
      await go(`/projects/${ryan}/schedule`)
      await p.locator('[data-testid="schedule-kebab"]').click(); await p.waitForTimeout(300)
      await p.getByRole('menuitem', { name: /Rebuild the schedule/ }).click(); await p.waitForTimeout(600)
      await p.locator('[data-testid="rebuild-dialog"]').getByText('A schedule template').click(); await p.waitForTimeout(300)
      await p.getByRole('combobox', { name: 'Template' }).click(); await p.waitForTimeout(300)
      await p.getByRole('option', { name: 'HDB resale (ready-made)' }).click(); await p.waitForTimeout(500)
      const plan = await p.locator('[data-testid="rebuild-plan"]').innerText()
      ok(/7 milestones kept and 1 new/.test(await p.locator('[data-testid="rebuild-dialog"]').innerText()) && /Installation/.test(plan), 'HDB resale over Ryan’s: the seven of the same name kept, Installation new')
      await shot('rebuild-plan-1440')
      await p.getByRole('combobox', { name: 'Template' }).click(); await p.waitForTimeout(300)
      await p.getByRole('option', { name: 'Kitchen and bathroom refresh' }).click(); await p.waitForTimeout(500)
      await p.locator('[data-testid="rebuild-go"]').click(); await p.waitForTimeout(500)
      ok(/Take off 7 milestones\?/.test(await dialog().innerText()) && /Hacking & demolition/.test(await dialog().innerText()), 'a rebuild that takes milestones off asks first, naming them')
      await dialog().getByRole('button', { name: 'Rebuild' }).click(); await p.waitForTimeout(2200)
      ok(/Schedule rebuilt from the template “Kitchen and bathroom refresh” — 0 milestones kept, 5 added and 7 taken off\./.test(await snack().innerText()) && Number(sql(`select count(*) from project_milestones where project_id='${ryan}' and deleted_at is null`)) === 5, 'rebuilt — one sentence; five milestones now')
      await undo()
      ok(live() === before, 'Undo: the same seven milestones back, ids and all')
      /* (15) the alerts' lead time */
      const days = endOf(ryan, 'Painting') - TODAY
      /* (the calm UI build 2026-10-27, a deliberate change) the bell's due rows fold under one line at its end ("Due · n · Show"); open it before reading them */
      const openDue = async () => { const f = p.locator('[data-testid="notifications-due-fold"]'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await p.waitForTimeout(400) } }
      as('michelle')
      await go('/projects')
      await p.locator('[data-notifications-tile]').click(); await p.waitForTimeout(1200)
      await openDue()
      const bell0 = await p.locator('[data-testid="notifications-panel"]').innerText()
      as('dane')
      await go('/settings?section=projects')
      await p.getByRole('combobox', { name: 'Alerts lead time' }).click(); await p.waitForTimeout(300)
      await p.getByRole('option', { name: '20 days' }).click(); await p.waitForTimeout(1500)
      ok(/"alertDays":20/.test(sql(`select value from settings where key='project_schedule_rules'`)), 'the lead time is set to 20 days')
      as('michelle')
      await go('/projects')
      await p.locator('[data-notifications-tile]').click(); await p.waitForTimeout(1200)
      await openDue()
      const bell1 = await p.locator('[data-testid="notifications-panel"]').innerText()
      ok(days > 3 && days <= 20 ? !bell0.includes(`Ends in ${days} days: Painting`) && bell1.includes(`Ends in ${days} days: Painting`) : true, `the bell rings for Painting ${days} days ahead only once the lead time reaches it`)
      as('dane')
      sql(`delete from settings where key='project_schedule_rules'`)
      /* (16) the Tasks page */
      await go('/tasks')
      /* (the calm UI build 2026-10-27, a deliberate change — 1-26) whose tasks is the scope pill's second group at every width (was a segment beside
         the pill on a desk): open the pill, pick the row — the same `task-source` handle, "All" reads "Leads and projects" */
      const pickSource = async (name) => { await p.locator('button').filter({ hasText: /^All tasks/ }).first().click(); await p.waitForTimeout(400); await p.locator('[data-testid="task-source"]').getByRole('menuitemradio', { name, exact: true }).click(); await p.waitForTimeout(800) }
      await pickSource('Projects')
      const groups = p.locator('[data-testid="task-group"]')
      ok(await groups.count() >= 2 && /P-2026-002 · HDB 5-Room — Benjamin Han/.test(await groups.allInnerTexts().then((a) => a.join('\n'))) && await p.locator('[data-testid="task-group-link"]').count() === await groups.count(), 'Projects: the tasks grouped by project, each with Go to project')
      /* (parity P-27 · Q-10, a deliberate change of this rule) a project's task names the project in the For column — its name, the number under it */
      { const rowsN = await p.locator('[data-kb-list="task"] [data-kb-row]').count()
        ok(rowsN > 0 && await p.locator('[data-kb-list="task"] [data-kb-row] [data-testid="task-for-project"]').count() === rowsN && (await p.locator('[data-testid="task-for-project"]').allInnerTexts()).every((t) => /\n\s*P-20\d\d-\d{3}\s*$/.test(t)), 'only project tasks are listed — each names its project, the number under it') }
      ok(/^For$/i.test((await p.locator('[role="columnheader"][data-col="lead"]').innerText().catch(() => '')).trim()), 'the column head reads “For”')
      await shot('tasks-by-project-1440')
      await pickSource('Leads')
      ok(await p.locator('[data-kb-list="task"] [data-kb-row]').count() > 0 && await p.locator('[data-kb-list="task"] [data-kb-row] [data-testid="task-for-project"]').count() === 0 && await groups.count() === 0, 'Leads: the pipeline’s tasks only, not grouped')   // (parity P-27)
      await pickSource('Leads and projects')
      await p.getByRole('button', { name: 'More options' }).first().click(); await p.waitForTimeout(300)
      await p.getByRole('menuitemcheckbox', { name: /Group by project/ }).click(); await p.waitForTimeout(800)
      ok(/Leads/.test(await groups.allInnerTexts().then((a) => a.join('\n'))) && await groups.count() >= 3, 'Group by project on All: each project, then the leads’ tasks')
      await p.locator('[data-kb-list="task"] [data-testid="task-group-link"]').first().click(); await p.waitForTimeout(1500)
      ok(/\/projects\/[^/]+\/tasks/.test(p.url()), 'Go to project opens its Tasks')
    })

    // ── The phone (390, touch) ─────────────────────────────────────────────────────────────────────────────────────────────────────
    await section('The phone', async () => {
      const mc = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
      const m = await mc.newPage()
      m.on('pageerror', (e) => errors.push(`390: ${String(e).slice(0, 160)}`))
      await go(`/projects/${ryan}/schedule`, m)
      /* (the calm UI build 2026-10-27, a deliberate change — 3-01) the ask is said on Carpentry's row, no longer in a band above the rows */
      ok(await m.locator('[data-testid="phone-milestone"]').filter({ hasText: 'Carpentry' }).first().locator('[data-testid="schedule-asks"]').count() === 1 && /More time asked/.test(await m.locator('[data-testid="phone-milestone"]').filter({ hasText: 'Carpentry' }).first().innerText()), '390: the ask on Carpentry’s row')
      ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390')
      await shot('phone-schedule-390', true, m)
      await m.locator('[data-testid="phone-milestone"]').filter({ hasText: 'Carpentry' }).first().click(); await m.waitForTimeout(1000)
      ok(await m.locator('[data-testid="panel-more-ask"]').isVisible() && await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390: the panel rises as a sheet, the ask and its answers in it')
      await shot('phone-panel-390', false, m)
      await m.keyboard.press('Escape'); await m.waitForTimeout(400)
      await go(`/projects/${ben}/tasks`, m)
      ok(await m.locator('[data-testid="outside-badge"]').count() >= 2, '390: the outside people on the task cards')
      await shot('phone-tasks-390', true, m)
      await go('/tasks', m)
      await m.locator('button').filter({ hasText: /All tasks/i }).first().click(); await m.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) T-13: "All tasks"
      ok(/Leads and projects/.test(await m.locator('body').innerText()), '390: whose tasks rides in the scope’s sheet (the toolbar stays one row)')
      await shot('phone-tasks-scope-390', false, m)
      await mc.close()
    })

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 300))
  } finally {
    /* everything back as it was */
    putBack()
    if (you) as(you)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
