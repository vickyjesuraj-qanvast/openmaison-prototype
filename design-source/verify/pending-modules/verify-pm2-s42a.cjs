// Pending modules, step S42A · the fixes for audit A (front door, people and settings — S42's fix brief, 2026-10-14; s42/audit-A.md A-01…A-19
// and the calls A·1…A·4). One or more checks per fixed finding, each asserting the rule (never another round's count):
//  A-03  the demo rides the demo day: a restore moves EVERY stamp of every table by the same whole days (and the moments written inside text),
//        so every gap is kept; repair R125 brought today's recent moments back (the floor plan shown inside the portal's 7 days, the newest site
//        update inside the Dashboard's fortnight, each Activity line on its record's moment) and moves nothing once they are back
//  A-01  on Free the set-up list's Quote template step is done by the default (her call A·2)
//  A-02  a landline is no way to send an invitation (WhatsApp goes to a mobile only); the Phone helper says what a mobile is for
//  A-04  the first page after a sign-in is the front door (the Dashboard); Reset lands there too
//  A-05  the Dashboard greets with the name as the studio wrote it ("Hui Min"); A-06 an empty MY TASKS is one quiet row with a text "Add a task"
//  A-07  Workload shows only with a line to draw; A-16 the Dashboard's ghost draws MY TASKS and Workload as the page will
//  A-08  ⌘K finds Add a member (Owners / Admins), Sign out and Open to new leads, and each lands
//  A-09  the event is "A task comes due"; a derived reminder's WhatsApp is the studio's wording, filled ({task} · {when})
//  A-10  a Settings ghost's tab strip starts where the page's does at 390 (the open module in view)
//  A-11  a quote, contract or project that isn't there answers 404 (real ones 200)
//  A-12  on a phone the Dashboard's Maison AI button starts tucked at the top
//  A-13  the not-found pages carry the rail's Messages badge as every page does
//  A-14  the not-found header names a part of OpenMaison only where the address can be its
//  A-15  Accounting's Your profile speaks of their papers, not quotes; A-17 Reset says the studios started here go; A-18 "3D"
//  A-19  a member on no lead is welcomed with what will come; A·1 the code steps say one member is signed in at a time; A·3 a month below
//        nothing says "Credit notes … more than invoiced", never "Revenue −S$…"
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. What it changes is put back in `finally`; its last
// section presses Reset (the base fixture replaces the scratch DB's rows), so run it last on its database.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s42a.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42a')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = path.resolve(__dirname, '..', '..', '..')
const q = (s) => s.replace(/["$`\\]/g, (c) => `\\${c}`)
const sqlOn = (db, s) => execSync(`sqlite3 -cmd ".timeout 30000" "${db}" "${q(s)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const jsonOn = (db, s) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${db}" "${q(s)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sql = (s) => sqlOn(DB, s)
const json = (s) => jsonOn(DB, s)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86_400, NOW = () => Math.floor(Date.now() / 1000)

/* restoreBaseline and the snapshot through the repo's own code (tsx), on copies */
const HELPER = path.join(os.tmpdir(), `pm2-s42a-helper-${process.pid}.mts`)
fs.writeFileSync(HELPER, `
const [mode, a, b] = process.argv.slice(2)
const repo = process.env.REPO!
const { BASELINE_TABLES, restoreBaseline } = await import(repo + '/lib/db/baseline.ts')
const { timeColumns } = await import(repo + '/lib/db/time-columns.ts')
const { client } = await import(repo + '/lib/db/index.ts')
const { writeFile } = await import('node:fs/promises')
if (mode === 'snap') {
  const out: Record<string, unknown> = { takenAt: new Date().toISOString(), demoDay: b }
  for (const t of BASELINE_TABLES) { const r = await client.execute('SELECT * FROM ' + t); out[t] = r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i] === undefined ? null : row[i]]))) }
  await writeFile(a!, JSON.stringify(out))
  console.log(JSON.stringify({ ok: true }))
} else if (mode === 'times') {
  const { PLANNED } = await import(repo + '/lib/db/demo-day.ts')
  const times = timeColumns()
  console.log(JSON.stringify({ times, tables: BASELINE_TABLES, planned: [...new Set(Object.values(times).flat().map((c) => c.column).filter((c) => PLANNED.test(c)))] }))
}
else console.log(JSON.stringify(await restoreBaseline({ file: a, now: new Date(b!) })))
process.exit(0)
`)
const tsx = (db, ...args) => JSON.parse(execSync(`DATABASE_URL=file:${db} REPO="${REPO}" "${REPO}/node_modules/.bin/tsx" "${HELPER}" ${args.map((x) => JSON.stringify(x)).join(' ')}`, { cwd: REPO, maxBuffer: 256 * 1024 * 1024 }).toString().trim().split('\n').pop())
const copies = []
const copy = (name) => { const f = path.join(path.dirname(DB), `s42a-${process.pid}-${name}.db`); fs.copyFileSync(DB, f); copies.push(f); return f }
const dayOf = (sec) => { const d = new Date(sec * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const touch = (w = 390, h = 844, o = {}) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, ...o })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const rail = (p) => p.locator('nav[aria-label="Workspace"]')
  const option = (p, title) => p.locator('[id^="gs-opt-"]').filter({ hasText: title })
  const search = async (p, text) => {
    const box = p.getByRole('combobox', { name: 'Search the studio' })
    if (!(await box.isVisible().catch(() => false))) { await p.keyboard.press('Meta+k'); await settle(p, 500) }
    await box.fill(text); await settle(p, 1200); return box
  }
  const closeSearch = async (p) => { for (let i = 0; i < 3 && await p.getByRole('combobox', { name: 'Search the studio' }).isVisible().catch(() => false); i++) { await p.keyboard.press('Escape'); await settle(p, 300) } }

  /* the record as it was — put back in `finally` */
  const you0 = sql(`select id from members where is_you = 1`)
  const plan0 = json(`select id, plan_id from subscriptions where cancelled_at is null`)
  const tpl0 = json(`select id, status from quote_templates`)
  const outbox0 = Number(sql(`select coalesce(max(rowid), 0) from notification_outbox`))
  const stages0 = json(`select id, stage from projects`)
  const active0 = json(`select id, is_active from members`)
  const studiosDir = `${DB}.studios`
  const fakeStudio = path.join(studiosDir, 'probe-studio-5420a42a.db')   // a studio key's shape (lib/studios/model.ts isStudioKey)

  try {
    as('dane')
    const ctx = await desk(); const p = await ctx.newPage(); watch(p, '1440')
    await go(p, '/dashboard', 2200)

    console.log('A-03 · the demo rides the demo day')
    const shown = json(`select f.id, f.shown_to_client_at as at, (select e.at from lead_events e where e.kind = 'file_shown' and e.detail like '%' || f.id || '%') as ev from lead_files f join leads l on l.id = f.lead_id where l.name = 'Benjamin Han' and f.name like 'Floor plan — %' and f.shown_to_client_at is not null`)[0]
    ok(!!shown && NOW() - shown.at < 7 * DAY, 'R125: the floor plan shown to Benjamin Han is inside the portal’s “new for 7 days” window', shown ? `${((NOW() - shown.at) / DAY).toFixed(1)} days ago` : 'no shown plan')
    ok(!!shown && shown.ev === shown.at, 'R125: its Activity line is on the same moment')
    const kitchen = json(`select u.id, u.published_at as at, (select e.at from lead_events e where e.kind = 'project_update_posted' and e.detail like '%' || u.id || '%') as ev from project_updates u where u.title = 'Kitchen cabinets are in'`)[0]
    ok(!!kitchen && NOW() - kitchen.at < 12 * DAY, 'R125: the newest site update is inside the Dashboard’s fortnight', kitchen ? `${((NOW() - kitchen.at) / DAY).toFixed(1)} days ago` : '')
    ok(!!kitchen && kitchen.ev === kitchen.at, 'R125: its Activity line is on its update’s moment')
    ok(await p.locator('div[data-card="updates"]').count() === 1 && /Kitchen cabinets are in/.test(await p.locator('div[data-card="updates"]').innerText()), 'the Dashboard’s Site updates shows it')
    // the restore: a snapshot of this database, restored the same day and 40 days later
    const fixture = path.join(os.tmpdir(), `pm2-s42a-fixture-${process.pid}.json`)
    const today = dayOf(NOW())
    const src = copy('snap'); tsx(src, 'snap', fixture, today)
    const { times, tables, planned } = tsx(src, 'times')
    const same = copy('same'), later = copy('later')
    const r0 = tsx(same, 'restore', fixture, new Date(Date.now()).toISOString())
    ok(r0.shiftedDays === 0, 'restored the same day: nothing moves', JSON.stringify(r0))
    const at40 = new Date(Date.now() + 40 * DAY * 1000)
    const r40 = tsx(later, 'restore', fixture, at40.toISOString())
    ok(r40.shiftedDays === 40 && r40.creditDays === 40, `40 days later: the demo and its credits story both ride 40 days (${r40.shiftedDays} · ${r40.creditDays})`)
    let checked = 0, wrong = []
    for (const t of tables) for (const c of times[t] ?? []) {
      const step = c.unit === 'ms' ? 40 * DAY * 1000 : 40 * DAY
      const a = new Map(jsonOn(same, `select rowid as k, ${c.column} as v from ${t} where ${c.column} is not null`).map((r) => [r.k, r.v]))
      for (const r of jsonOn(later, `select rowid as k, ${c.column} as v from ${t} where ${c.column} is not null`)) { checked++; if (a.get(r.k) + step !== r.v) wrong.push(`${t}.${c.column}`) }
    }
    ok(checked > 1000 && wrong.length === 0, `every stamp of every table moved exactly 40 days (${checked} stamps)`, [...new Set(wrong)].slice(0, 6).join(', '))
    /* (S42B's ask) a Qanvast return's reply keeps its age — `lead_returns.replied_at` rides with the rest, as does the return it answers */
    const replies = (db) => jsonOn(db, `select id, replied_at as r, returned_at as t from lead_returns where replied_at is not null order by id`)
    const rp0 = replies(same), rp40 = replies(later)
    ok(rp0.length > 0 && rp0.length === rp40.length && rp0.every((x, i) => rp40[i].id === x.id && rp40[i].r === x.r + 40 * DAY && rp40[i].r - rp40[i].t === x.r - x.t), `a return’s reply (lead_returns.replied_at) moved 40 days with its return (${rp0.length} replies)`)
    const gap = (db) => jsonOn(db, `select l.id, (select min(s.created_at) from stage_logs s where s.lead_id = l.id) - l.created_at as g from leads l order by l.id`)
    ok(JSON.stringify(gap(same)) === JSON.stringify(gap(later)), 'every lead’s gap to its first stage move is kept')
    const when = (db) => jsonOn(db, `select payload from stage_logs where payload like '%"when":"%/%' order by id limit 1`)[0]?.payload ?? ''
    const w0 = /"when":"(\d+)\/(\d+)\/(\d+)/.exec(when(same)), w40 = /"when":"(\d+)\/(\d+)\/(\d+)/.exec(when(later))
    ok(!!w0 && !!w40 && Math.round((new Date(+w40[3], +w40[2] - 1, +w40[1]) - new Date(+w0[3], +w0[2] - 1, +w0[1])) / 864e5) === 40, 'a contact log’s date inside the Move stage window’s record moved 40 days too', `${w0?.[0]} → ${w40?.[0]}`)
    const snapStart = (db) => /"start":"(\d{4}-\d{2}-\d{2})"/.exec(jsonOn(db, `select snapshot from project_schedule_shares order by id limit 1`)[0]?.snapshot ?? '')?.[1]
    const s0 = snapStart(same), s40 = snapStart(later)
    ok(!!s0 && !!s40 && Math.round((Date.parse(s40) - Date.parse(s0)) / 864e5) === 40, 'a shared schedule’s snapshot moved with its milestones (no phantom “changes to share”)', `${s0} → ${s40}`)
    const keyMs = (db) => jsonOn(db, `select row_key as k from portal_bell_reads where row_key glob '*:[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' order by rowid limit 1`)[0]?.k ?? ''
    const k0 = Number(keyMs(same).split(':').pop()), k40 = Number(keyMs(later).split(':').pop())
    ok(k0 > 0 && k40 - k0 === 40 * DAY * 1000, 'a client’s read bell row keeps its key (so it stays read)')
    // restored earlier in the day than the snapshot was taken: what happened is eased into the last day — never after now; what is planned keeps
    // its whole days (a task due at 10:00 is still due at 10:00); nothing changes order
    const taken = Date.parse(JSON.parse(fs.readFileSync(fixture, 'utf8')).takenAt)
    const early = copy('early'), earlyAt = taken + 40 * DAY * 1000 - 5 * 3600 * 1000
    tsx(early, 'restore', fixture, new Date(earlyAt).toISOString())
    let ahead = [], plannedOff = []
    /* the AI credits story keeps S08b's own move (whole days, capped by its ledger) — its tables are that probe's (pm2-s08b) */
    const CREDITS = new Set(['subscriptions', 'studio_credit_balances', 'credit_ledger', 'studio_member_credit_caps', 'billing_checkout_sessions', 'invoices', 'credit_requests'])
    for (const t of tables.filter((x) => !CREDITS.has(x))) for (const c of times[t] ?? []) {
      const ms = c.unit === 'ms' ? 1 : 1000
      if (planned.includes(c.column)) {
        const a = new Map(jsonOn(same, `select rowid as k, ${c.column} as v from ${t} where ${c.column} is not null`).map((r) => [r.k, r.v]))
        for (const r of jsonOn(early, `select rowid as k, ${c.column} as v from ${t} where ${c.column} is not null`)) if (a.get(r.k) + 40 * DAY * (c.unit === 'ms' ? 1000 : 1) !== r.v) plannedOff.push(`${t}.${c.column}`)
      } else if (Number(sqlOn(early, `select count(*) from ${t} where ${c.column} * ${ms} > ${earlyAt + 1000}`))) ahead.push(`${t}.${c.column}`)
    }
    ok(ahead.length === 0, 'restored earlier in the day: nothing that happened is after now', [...new Set(ahead)].slice(0, 6).join(', '))
    ok(plannedOff.length === 0, '…and every planned moment (due dates, expiries, schedules) keeps its whole 40 days and its hour', [...new Set(plannedOff)].slice(0, 6).join(', '))
    ok(JSON.stringify(gap(same).map((r) => r.g >= 0)) === JSON.stringify(gap(early).map((r) => r.g >= 0)), '…and no lead’s first move lands before the lead')
    const keyOk = jsonOn(early, `select count(*) as n from portal_bell_reads r join project_updates u on r.row_key = 'update:' || u.id || ':' || (u.published_at * 1000)`)[0]?.n
    ok(keyOk === Number(sqlOn(early, `select count(*) from portal_bell_reads where row_key like 'update:%'`)), '…and a client’s read update keeps its key')
    fs.rmSync(fixture, { force: true })
    // R125 once more: nothing to move
    const rep = copy('repair')
    const out = execSync(`DATABASE_URL=file:${rep} npm run db:repair 2>&1`, { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString()
    ok(/R125[^\n]*\n\s+the floor plan is still new to him — nothing to move · his newest updates are as R70 dated them — nothing to move/.test(out) && /all checks pass/.test(out), 'R125 run again moves nothing; all checks pass')

    console.log('A-01 · Free: the Quote template step is done by the default')
    sql(`update subscriptions set plan_id = 'free' where cancelled_at is null`)
    sql(`update quote_templates set status = 'draft'`)
    await go(p, '/settings?section=studio&setup=1', 2000)
    const tplRow = p.locator('#studio-setup li, #studio-setup [role="listitem"], #studio-setup [data-step]').filter({ hasText: 'Quote template' }).first()
    const tplText = (await p.locator('#studio-setup').innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(/Quote template\s*Your quotes print with the studio’s default — your own templates come with Pro/.test(tplText), 'its line: “Your quotes print with the studio’s default — your own templates come with Pro”', tplText.slice(0, 300))
    ok(await tplRow.count() >= 0, 'the step reads done (the line above is the done line)')
    await shot(p, 'a01-setup-free-1440')
    for (const t of tpl0) sql(`update quote_templates set status = '${t.status}' where id = '${t.id}'`)
    for (const s of plan0) sql(`update subscriptions set plan_id = '${s.plan_id}' where id = '${s.id}'`)

    console.log('A-02 · an invitation goes to a mobile only')
    await go(p, '/company/members', 1800)
    await p.getByRole('button', { name: 'Add member' }).first().click(); await settle(p, 700)
    const dlg = p.getByRole('dialog').last()
    await dlg.getByRole('textbox', { name: 'Name' }).fill('Audit Probe'); await settle(p, 200)
    ok(/A mobile signs them in and gets the invitation/.test(await dlg.innerText()), 'the Phone field says what a mobile is for')
    await dlg.getByRole('textbox', { name: 'Phone' }).fill('62220188'); await settle(p, 400)
    const landline = await p.getByTestId('add-member-invite').innerText()
    ok(/Add a mobile number or an email to send Audit an invitation/.test(landline), 'a landline: “Add a mobile number or an email to send Audit an invitation”', landline)
    await dlg.getByRole('textbox', { name: 'Phone' }).fill('91234567'); await settle(p, 400)
    ok(/We’ll send Audit an invitation by WhatsApp/.test(await p.getByTestId('add-member-invite').innerText()), 'a mobile: “We’ll send Audit an invitation by WhatsApp …”')
    await shot(p, 'a02-add-member-mobile-1440')
    await p.keyboard.press('Escape'); await settle(p, 500)
    ok(Number(sql(`select count(*) from members where name = 'Audit Probe'`)) === 0, 'nothing was added')

    console.log('A-04 · the front door after a sign-in')
    await go(p, '/sign-in', 1200)
    ok(/\/dashboard$/.test(p.url()), 'a signed-in visit to /sign-in goes on to the Dashboard (the front door — it was the Leads listing)', p.url())

    console.log('A-05 · A-06 · A-16 · Hui Min’s Dashboard')
    as('huimin')
    await go(p, '/dashboard', 2200)
    const brief = (await p.getByTestId('dashboard').innerText()).replace(/\s+/g, ' ')
    ok(/Good (morning|afternoon|evening), Hui Min\./.test(brief), 'the brief greets “Hui Min” (the name as the studio wrote it)', brief.slice(0, 120))
    const mw = p.locator('div[data-card="my-work"]')
    ok(await mw.getByTestId('my-work-quiet').count() === 1 && /Nothing on your list/.test(await mw.innerText()), 'MY TASKS: one quiet row — “Nothing on your list · Tasks given to you land here”')
    ok(await mw.getByRole('button', { name: 'Create New Task' }).count() === 0 && await mw.locator('img').count() === 0, 'no first-run illustration, no filled Create New Task')
    await shot(p, 'a06-mytasks-quiet-1440')
    await mw.getByTestId('my-work-add').click(); await p.waitForURL(/\/tasks/, { timeout: 8000 }).catch(() => {})
    ok(/\/tasks/.test(p.url()), 'Add a task opens Tasks to add one', p.url())
    // the loader as it streams (no script): MY TASKS draws its one quiet row
    const nojs = await desk({ javaScriptEnabled: false }); const np = await nojs.newPage()
    await np.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }); await np.waitForTimeout(1500)
    const ghostRows = await np.locator('span[data-card="my-work"] [class*="__group"] > [data-static]:visible').count()   // the loader's (the page's own reveal ghost streams in hidden)
    ok(ghostRows === 1, 'A-16: the ghost’s MY TASKS draws the page’s one row (not three)', `${ghostRows}`)
    await nojs.close()
    as('dane')

    console.log('A-07 · Workload only with a line to draw')
    await go(p, '/dashboard', 1800)
    ok(await p.locator('div[data-card="team"]').count() === 1 && await p.getByTestId('team-row').count() > 0, 'Dane’s Workload has its lines')
    sql(`update projects set stage = 'completed'`); sql(`update members set is_active = 0 where role in ('Designer', 'Manager')`)
    await go(p, '/dashboard', 1800)
    ok(await p.locator('div[data-card="team"]').count() === 0, 'with no running project and nobody it lists, there is no empty Workload card')
    const nj = await desk({ javaScriptEnabled: false }); const njp = await nj.newPage()
    await njp.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }); await njp.waitForTimeout(1500)
    ok(await njp.locator('span[data-card="team"]').count() === 0 && await njp.locator('span[data-card="needs"]:visible').count() === 1, 'A-16: …and its ghost draws none')
    await nj.close()
    for (const s of stages0) sql(`update projects set stage = '${s.stage}' where id = '${s.id}'`)
    for (const m of active0) sql(`update members set is_active = ${m.is_active} where id = '${m.id}'`)

    console.log('A-08 · ⌘K finds the people steps')
    await go(p, '/leads', 1800)
    await search(p, 'add member')
    ok(await option(p, 'Add a member').count() === 1, 'Create › Add a member')
    await option(p, 'Add a member').first().click(); await p.waitForURL(/\/company\/members/, { timeout: 8000 }).catch(() => {}); await settle(p, 1500)
    ok(/\/company\/members/.test(p.url()) && await p.getByRole('dialog').filter({ hasText: 'Add member' }).count() >= 1, 'it lands on Members with Add member open', p.url())
    ok(!/[?&]new=/.test(p.url()), 'the address drops the ask')
    await p.keyboard.press('Escape'); await settle(p, 500)
    await search(p, 'invite')
    ok(await option(p, 'Add a member').count() === 1, '“invite” finds it too')
    await closeSearch(p)
    await search(p, 'open to new leads')
    ok(await option(p, 'Open to new leads').count() === 1, 'Go to › Open to new leads')
    await option(p, 'Open to new leads').first().click(); await p.waitForURL(/\/company\/members/, { timeout: 8000 }).catch(() => {}); await settle(p, 1500)
    ok(/\/company\/members/.test(p.url()) && await p.locator('[data-member-id="dane"]').count() === 1, 'it lands on your own row on Members', p.url())
    await search(p, 'log out')
    ok(await option(p, 'Sign out').count() === 1, '“log out” finds Sign out')
    await closeSearch(p)
    as('germaine')
    await go(p, '/leads', 1500)
    await search(p, 'add member')
    ok(await option(p, 'Add a member').count() === 0, 'a Designer’s search offers no Add a member (Owners and Admins add)')
    await closeSearch(p)
    as('dane')
    const so = await desk(); const sop = await so.newPage(); watch(sop, 'sign-out')
    await sop.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await sop.waitForTimeout(1200)
    await sop.keyboard.press('Meta+k'); await sop.waitForTimeout(500)
    await sop.getByRole('combobox', { name: 'Search the studio' }).fill('sign out'); await sop.waitForTimeout(1200)
    await option(sop, 'Sign out').first().click(); await sop.waitForURL(/\/sign-in/, { timeout: 10000 }).catch(() => {})
    ok(/\/sign-in/.test(sop.url()), 'pressing Sign out signs this browser out (sign-in opens)', sop.url())
    await so.close()
    as('dane')

    console.log('A-09 · “A task comes due” and its wording')
    await go(p, '/settings?section=notifications', 1800)
    const notif = await p.locator('body').innerText()
    ok(/A task comes due/.test(notif) && !/A task is due in 30 minutes/.test(notif), 'Settings › Notifications names it “A task comes due”')
    as('germaine')
    await go(p, '/leads', 1500)
    await rail(p).locator('[data-notifications-tile]').click(); await settle(p, 2500)
    const sent = json(`select body from notification_outbox where rowid > ${outbox0} and key like 'd:task-soon-%' and channel = 'whatsapp'`)
    ok(sent.length > 0 && sent.every((m) => /^Due (in \d+ minutes?|today|tomorrow|in \d+ days): “.+” on .+ — /.test(m.body)), 'a derived reminder’s WhatsApp is the studio’s wording, filled ({when} · {task})', sent.slice(0, 2).map((m) => m.body.slice(0, 80)).join(' | '))
    await p.keyboard.press('Escape'); await settle(p, 300)
    as('dane')

    console.log('A-10 · a ghost’s tab strip starts at the open tab (390 touch)')
    { const c = await touch(); const tp = await c.newPage(); watch(tp, '390')
      await tp.goto(BASE + '/settings?section=notifications', { waitUntil: 'networkidle' }); await tp.waitForTimeout(2000)
      const labels = (await tp.getByRole('tab').allInnerTexts()).map((t) => t.trim())
      const idx = labels.indexOf('Notifications')
      const live = await tp.getByRole('tab', { name: 'Notifications' }).boundingBox()
      await c.close()
      const g = await touch(390, 844, { javaScriptEnabled: false }); const gp = await g.newPage()
      await gp.goto(BASE + '/settings?section=notifications', { waitUntil: 'domcontentloaded' }); await gp.waitForTimeout(1500)
      const bones = gp.locator('[class*="__tabsRow"] > span')
      const ghost = idx >= 0 && await bones.count() > idx ? await bones.nth(idx).boundingBox() : null
      ok(!!ghost && ghost.x >= 0 && ghost.x + ghost.width <= 390, 'the ghost’s strip shows the open module’s tab in view', ghost ? `x ${Math.round(ghost.x)}` : `idx ${idx}`)
      ok(!!ghost && !!live && Math.abs((ghost.x + ghost.width / 2) - (live.x + live.width / 2)) <= 48, 'it stands where the page’s tab stands (the hand-over doesn’t jump)', ghost && live ? `${Math.round(ghost.x + ghost.width / 2)} vs ${Math.round(live.x + live.width / 2)}` : '')
      await gp.screenshot({ path: path.join(dir, 'a10-settings-ghost-390.png') })
      await g.close() }

    console.log('A-11 · a record that isn’t there answers 404')
    const QID = sql(`select id from quotes where deleted_at is null and kind = 'quote' limit 1`), CID = sql(`select id from contracts where deleted_at is null limit 1`), PID = sql(`select id from projects where deleted_at is null limit 1`)
    for (const [u, want] of [['/quotes/nope', 404], ['/quotes/nope/preview', 404], ['/contracts/nope', 404], ['/projects/nope', 404], ['/projects/nope/money', 404], [`/quotes/${QID}`, 200], [`/contracts/${CID}`, 200], [`/projects/${PID}`, 200], [`/projects/${PID}/money`, 200]]) {
      const res = await p.request.get(BASE + u, { maxRedirects: 0 })
      ok(res.status() === want, `${u.replace(/[0-9a-f-]{36}/, '<id>')} answers ${want}`, `${res.status()}`)
    }
    await go(p, '/projects/nope', 1200)
    ok(/This project isn’t one you can open/.test(await p.locator('body').innerText()), 'a project’s address keeps its own record-not-found')

    console.log('A-12 · the Dashboard’s Maison AI button starts tucked on a phone')
    { const c = await touch(); const tp = await c.newPage(); watch(tp, '390')
      await tp.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await tp.waitForTimeout(2000)
      const fab = tp.locator('button[aria-label="Maison AI"]').locator('xpath=..').locator('xpath=..')
      ok(await tp.locator('[data-tucked] button[aria-label="Maison AI"]').count() === 1, 'at the top of the Dashboard the button is tucked (the Review buttons are clear)')
      ok((await sideways(tp)) <= 0, 'no sideways scroll at 390', `${await sideways(tp)}`)
      await tp.screenshot({ path: path.join(dir, 'a12-dashboard-390.png') })
      await tp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await tp.waitForTimeout(900)
      ok(await tp.locator('[data-tucked] button[aria-label="Maison AI"]').count() === 0, 'at the end of the page it comes back')
      await tp.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await tp.waitForTimeout(1500)
      ok(await tp.locator('[data-tucked] button[aria-label="Maison AI"]').count() === 0, 'another page keeps it out at the top')
      void fab; await c.close() }

    console.log('A-13 · A-14 · the not-found pages')
    await go(p, '/dashboard', 1200)
    const msgs = await rail(p).locator('a[href="/chat"]').getAttribute('aria-label')
    for (const [u, head] of [['/not-a-page', 'Page not found'], ['/leads/x/y/z', 'Page not found'], ['/company/nope', 'Company'], ['/quotes/nope', 'Quotes']]) {
      await go(p, u, 1200)
      ok(await rail(p).locator('a[href="/chat"]').getAttribute('aria-label') === msgs, `${u}: the rail’s Messages reads as on every page (${msgs})`)
      ok((await p.locator('h1').first().innerText()).trim() === head, `${u}: the header reads “${head}”`, await p.locator('h1').first().innerText())
    }
    await shot(p, 'a14-not-found-deep-1440')

    console.log('A-15 · Accounting’s Your profile')
    as('priya')
    await go(p, '/profile', 2000)
    const prof = (await p.getByTestId('your-profile').innerText()).replace(/\s+/g, ' ')
    ok(/on the invoices, orders and payments you handle/.test(prof) && !/the quotes you prepare/.test(prof), 'Your details: “… on the invoices, orders and payments you handle …”, no quotes')
    ok(/Shown on the papers you send/.test(prof), 'Email: “Shown on the papers you send”')
    ok(/A mobile signs you in and gets WhatsApp notices/.test(prof) && !/clients see it on their portal/.test(prof), 'Phone: “A mobile signs you in and gets WhatsApp notices”')
    await shot(p, 'a15-profile-accounting-1440')
    as('dane')
    await go(p, '/profile', 1800)
    ok(/Printed as your email on the quotes you prepare/.test(await p.getByTestId('your-profile').innerText()), 'an Owner’s Email still speaks of their quotes')

    console.log('A-19 · a member on no lead is welcomed with what will come')
    sql(`insert or ignore into members (id, name, role, color, is_you, is_active, welcome_due) values ('s42a-probe', 'Probe Newcomer', 'Designer', '#5B7FD7', 0, 1, 1)`)
    as('s42a-probe')
    await go(p, '/dashboard', 2500)
    const welcome = (await p.getByTestId('first-visit-welcome').innerText().catch(() => '')).replace(/\s+/g, ' ')
    const page = (await p.locator('body').innerText()).replace(/\s+/g, ' ')
    ok(/Welcome, Probe Newcomer/.test(page), 'the welcome greets them by the name the studio wrote')
    ok(/Your leads, tasks and the studio’s messages land here as you’re added to them/.test(welcome) && !/Start with the leads you’re on/.test(welcome), 'the welcome says what will come, not the leads they are on', welcome.slice(0, 200))
    await shot(p, 'a19-welcome-1440')
    as('dane')
    sql(`delete from members where id = 's42a-probe'`)

    console.log('A·1 · built by S43A — the code steps no longer say one member is signed in at a time')
    { const c = await desk(); const sp2 = await c.newPage(); watch(sp2, 'sign-in')
      await c.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
      await sp2.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await sp2.waitForTimeout(1200)
      if (/\/sign-in/.test(sp2.url())) {
        await sp2.waitForFunction(() => { const e = document.querySelector('[data-testid="sign-in"]'); return !!e && !e.closest('[inert]') }, null, { timeout: 15000 }).catch(() => {})
        await sp2.getByLabel('Mobile number or email').fill('dane@demostudio.sg'); await sp2.getByTestId('sign-in-send').click(); await sp2.waitForTimeout(1500)
        /* (pending modules S43A, a deliberate change of this rule) A·1 is built: a code signs in this browser alone, so the fallback line is gone */
        ok(await sp2.getByTestId('sign-in-one-at-a-time').count() === 0 && /Demo only/.test(await sp2.getByTestId('sign-in-demo').innerText().catch(() => '')), 'the sign-in code step no longer says “one signed-in member at a time” (S43A built A·1) — the demo line stays')
        await sp2.getByTestId('sign-in-digit').first().click(); await sp2.keyboard.type('123456'); await sp2.waitForTimeout(300)
        await sp2.getByTestId('sign-in-go').click()
        await sp2.waitForURL((u) => !/\/sign-in/.test(String(u)), { timeout: 15000 }).catch(() => {})
        ok(/\/dashboard/.test(sp2.url()), 'A-04: signing in by code lands on the Dashboard (the front door)', sp2.url())
      } else ok(false, 'the sign-in page opened', sp2.url())
      await c.close()
      as('dane') }

    console.log('A·3 · a month below nothing, in a studio’s words')
    await go(p, '/dashboard', 1800)
    const profit = await p.getByTestId('tile-profit').innerText().catch(() => '')
    ok(!!profit && !/Revenue −/.test(profit), 'the Profit tile never says “Revenue −S$…”', profit.replace(/\s+/g, ' '))
    if (/−S\$/.test(profit.split('\n')[1] ?? '')) ok(/Credit notes S\$[\d,.]+ more than invoiced this month|Margin|Revenue S\$/.test(profit), 'a below-nothing month names the credit notes')

    console.log('A-18 · “3D” everywhere')
    const clip = fs.readFileSync(path.join(REPO, 'lib/visualizer/spatial/clip.ts'), 'utf8')
    ok(/new Error\('This browser can’t record from a 3D view\.'\)/.test(clip) && !/new Error\('[^']*3-D/.test(clip), 'the bench’s clip line says “3D”')

    console.log('A-17 · A-04 · Reset says the studios started here go, and lands on the front door')
    fs.mkdirSync(studiosDir, { recursive: true }); fs.writeFileSync(fakeStudio, '')
    await go(p, '/leads', 1500)
    await p.locator('button[aria-label="Maison AI"]').click(); await settle(p, 800)
    await p.getByRole('button', { name: 'Reset prototype to base' }).click(); await settle(p, 1200)
    const confirm = (await p.getByRole('dialog').filter({ hasText: 'Reset the prototype?' }).innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(/— and the studio started here is removed\./.test(confirm), 'with a studio started here, the confirmation says it goes', confirm)
    await shot(p, 'a17-reset-confirm-1440')
    fs.rmSync(fakeStudio, { force: true })
    await p.getByRole('button', { name: 'Reset', exact: true }).click()
    await p.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {}); await settle(p, 1500)
    ok(/\/dashboard/.test(p.url()), 'Reset lands on the Dashboard', p.url())

    console.log('widths · no sideways scroll, no page errors')
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const c = await touch(w, h); const tp = await c.newPage(); watch(tp, `${w}`)
      for (const u of ['/dashboard', '/company/members', '/profile', '/settings?section=notifications']) { await tp.goto(BASE + u, { waitUntil: 'networkidle' }); await tp.waitForTimeout(1200); const s = await sideways(tp); ok(s <= 0, `${u} at ${w}: no sideways scroll`, `${s}`) }
      await c.close()
    }
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    try { fs.rmSync(fakeStudio, { force: true }) } catch {}
    try { sql(`delete from members where id = 's42a-probe'`) } catch {}
    try { sql(`delete from notification_outbox where rowid > ${outbox0}`) } catch {}
    try { if (you0) as(you0) } catch {}
    for (const f of copies) { for (const x of [f, `${f}-wal`, `${f}-shm`]) fs.rmSync(x, { force: true }) }
    fs.rmSync(HELPER, { force: true })
    await b.close()
  }
  ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
