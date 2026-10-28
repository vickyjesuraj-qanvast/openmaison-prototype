// The Dashboard redesigned (2026-10-26), lane D3 · the grid's five cards — his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY (every
// proposal Build, every question as recommended; "the CTAs are too much to the eyes because of primary color") and the build's contract
// `design-source/context/dashboard-redesign-2026-10-26/brief.md` § 5 D3. Each rule asserted as the rule it builds, never another round's count;
// every press pressed for real on the production build:
//  0 · the pure rules (dash-d3-health-pure.mts): a project's health by rule, the Pipeline's going quiet, Your day's order, ring, lengths, Team.
//  1 · P-14 — the Dashboard reads every project's whole Coming up: seven milestones more on one project, all on Your day; the project's own
//      Coming up card keeps its six.
//  2 · P-06 Your day at 1440 — seven days from today, today tinted (never a solid block); a day pressed shows its own agenda in place and says when
//      it is empty; late tasks first and red; a meeting ahead says its time and length with Prepare me (Maison AI is asked) and a site visit's
//      Directions (the home's map, opened on the press); a call has Call and WhatsApp (wa.me on the press), the call remembered so "Log the
//      call" is offered on return and opens the house log sheet; the tick completes with Undo through the Tasks tab's own actions and the ring
//      counts it; a meeting's reminder is the meeting (never twice); every row opens its record with ?from=/dashboard.
//  3 · P-07 Pipeline — each stage the listing's own count, its press the listing scoped to it; going quiet is Sales' own count (All time) —
//      (2026-10-27, a deliberate change: his "take a call from our 2.0 consistency pov") no stuck mark or count of the card's own.
//  4 · P-08 · Q-10 Projects — one line per open project, "n running" the listing's; health by rule (a milestone of ours past its end → late; on
//      hold · setting up say so), red only on late; worst first; a line opens its project; a Manager who sees no money reads no money reason.
//  5 · P-09 Team — Workload's lines, over capacity amber (never red), "closed to new leads" said, the contractors' line opens the view.
//  6 · P-09 On site — the week's published photos, each opening its update; nothing this week → no card.
//  7 · by role (P-11): Dane · Hui Min · James · Germaine · Priya · Nurul — the cards each role's page holds; Mine (?scope=mine) narrows Projects
//      and Pipeline to the member's own.
//  8 · § 2 quiet: no filled primary background and no filled button in the five cards at rest; at 1280 · 1024 touch · 768 touch · 390 touch ·
//      320 touch · 844×390 touch no sideways scroll, 44 targets and 14px words on touch, five days across on a phone.
//  9 · everything written is put back; no page errors.
// (the calm pass 2026-10-26 — lane C3, brief-calm.md: his "too busy … simplify" and the Claude Design option with six corrections) The checks
// the calm pass changes are restated in place, each marked "(the calm pass 2026-10-26, a deliberate change)", and § 10 adds the pass's own:
// the card's surface and head (white, no border, no shadow, radius 8; the title, its count, one right slot; ✦ Ask and ⋮ only on hover / focus
// at a desk, one ⋮ under a finger), Team load's segments, On site's large photos, and the busy measure of the five cards. (§ 3's stuck rule by
// the studio's own pace went 2026-10-27 with the card's stuck marks.)
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3223 NODE_PATH=<repo>/node_modules node verify-dash-d3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'dash-d3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3223'
const REPO = fs.existsSync(path.resolve(__dirname, '../../../lib')) ? path.resolve(__dirname, '../../..') : process.cwd()
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `dash-d3-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PRIMARY = 'rgb(85, 0, 255)'
const RED = 'rgb(219, 56, 42)'
const AMBER = 'rgb(241, 158, 43)'

;(async () => {
  // 0 · the pure rules
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/dashboard-2026-10-26/dash-d3-health-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure rules: ${p} passed, ${f} failed`)
    if (f) console.log(out.split('\n').filter((l) => l.includes('✗')).join('\n'))
  } catch (e) { fail++; console.log('  ✗ the pure rules did not run:', String(e.stdout || e).slice(0, 600)) }

  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }   // the app's own lazy writes first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return changed
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }

  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const desk = (w = 1440, h = 1024) => b.newContext({ viewport: { width: w, height: h } })
  const touch = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  const card = (p, k) => p.locator(`[data-card="${k}"]`).first()
  const dayRows = (p) => card(p, 'day').getByTestId('day-row')
  /* the external addresses a press opens are answered here, never fetched */
  const quiet = async (ctx) => { await ctx.route(/https:\/\/(www\.google\.com|wa\.me)\/.*/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>ok' })) }

  /* the demo's facts the probe reads, by what they are */
  const now = new Date()
  const sod = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
  const BEN_PROJECT = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Benjamin Han' and p.deleted_at is null`)
  const visit = sql(`select id from meetings where lead_id = (select id from leads where name = 'Benjamin Han') and aim = 'site_visit_debrief' and status = 'planned' and deleted_at is null limit 1`)
  const consult = sql(`select id from meetings where lead_id = (select id from leads where name = 'Priya Nair') and status = 'planned' and deleted_at is null limit 1`)
  const callTask = sql(`select t.id from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id = 'dane' and t.done = 0 and t.kind = 'Call' and t.lead_id = (select id from leads where name = 'Cheryl Lim') limit 1`)
  ok(!!visit && !!consult && !!callTask && !!BEN_PROJECT, 'R179’s day is on record: a site visit at Benjamin’s, a first consultation with Priya, a call to Cheryl')

  try {
    // ── 1 · P-14: the whole Coming up ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · P-14 — every project’s whole Coming up reaches Your day; the project’s own card keeps its six')
    as('dane')
    const ms = []
    for (let k = 0; k < 7; k++) {
      const start = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + (k % 6)).getTime() / 1000)
      const id = `d3probe-${k}`
      ms.push(id)
      sql(`insert into project_milestones (id, project_id, title, position, start_date, end_date, status, gap_days, payment_due, client_visible, created_at, updated_at) values ('${id}', '${BEN_PROJECT}', 'Probe step ${k + 1}', ${900 + k}, ${start}, ${start + 86400}, 'not_started', 1, 'end', 1, ${sod}, ${sod})`)
    }
    const C1 = await desk(); const p1 = await page(C1, 'p14')
    await go(p1, '/dashboard', 1600)
    let probeRows = 0
    const cells1 = card(p1, 'day').getByTestId('day-cell')
    for (let i = 0; i < 7; i++) { await cells1.nth(i).click(); await settle(p1, 150); probeRows += await dayRows(p1).filter({ hasText: /Probe step \d starts/ }).count() }
    ok(probeRows === 7, `all seven milestones starting this week are on Your day — the project's whole list, not its card's six (${probeRows})`)
    await go(p1, `/projects/${BEN_PROJECT}`, 2000)
    const cardRows = await p1.locator('[data-card="coming-up"]').getByTestId('coming-up-row').evaluateAll((els) => els.filter((e) => !/\/money/.test(e.getAttribute('href') ?? '')).length)
    ok(cardRows > 0 && cardRows <= 6, `the project's own Coming up keeps its six dated rows (${cardRows})`)
    await C1.close()
    sql(`delete from project_milestones where id in (${ms.map((x) => `'${x}'`).join(',')})`)

    // ── 2 · Your day ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · P-06 Your day at 1440 (Dane)')
    /* the day's two meetings ahead of now (a probe run at any hour sees them ahead), the reminders on their hour */
    /* (the calm pass 2026-10-26) …and a run late in the evening puts them on tomorrow morning, pressed on tomorrow's agenda */
    const lateRun = Math.floor(Date.now() / 1000) + 3600 + 5400 + 3600 - sod >= 86400
    const t1 = lateRun ? sod + 86400 + 10 * 3600 : Math.floor(Date.now() / 1000) + 3600, t2 = t1 + 5400
    const meetDay = lateRun ? 1 : 0
    sql(`update meetings set starts_at = ${t1 * 1000}, ends_at = ${(t1 + 2700) * 1000} where id = '${visit}'; update meetings set starts_at = ${t2 * 1000}, ends_at = ${(t2 + 3600) * 1000} where id = '${consult}'; update lead_tasks set due_at = (select starts_at / 1000 from meetings m where m.id = lead_tasks.meeting_id) where meeting_id in ('${visit}', '${consult}')`)
    const keepsToday = (t1 - sod < 86400) && (t2 - sod < 86400)
    sql(`update lead_tasks set due_at = ${Math.min(sod + 86400 - 600, Math.floor(Date.now() / 1000) + 7200)} where id = '${callTask}'`)
    const C2 = await desk(); await quiet(C2); const p = await page(C2, 'day')
    await go(p, '/dashboard', 1600)
    const day = card(p, 'day')
    await day.scrollIntoViewIfNeeded(); await shot(p, '2-day-1440')
    const cells = day.getByTestId('day-cell')
    ok(await cells.count() === 7, 'the week is seven days from today')
    const todayCell = cells.first()
    ok(await todayCell.getAttribute('data-today') !== null && await todayCell.getAttribute('aria-pressed') === 'true', 'today leads the week, shown')
    const cellBg = await todayCell.evaluate((e) => getComputedStyle(e).backgroundColor)
    ok(cellBg !== PRIMARY && cellBg !== 'rgba(0, 0, 0, 0)', `the day shown is a tint, never a solid block (${cellBg})`)
    /* every row of every day opens its record with the way back; nothing past the seventh day */
    let hrefs = [], perDay = []
    for (let i = 0; i < 7; i++) {
      await cells.nth(i).click(); await settle(p, 150)
      const n = await dayRows(p).count()
      perDay.push(n)
      hrefs = hrefs.concat(await day.getByTestId('day-open').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')))
      const dots = await cells.nth(i).locator('i').count()
      if (n === 0) ok(/^Nothing planned (today|on [A-Z][a-z]+)$/.test((await day.getByTestId('day-empty').innerText()).trim()) || await day.getByTestId('day-quiet').count() === 1, `an empty day says so (day ${i + 1})`)
      if (i === 1 || n > 3) ok(dots === Math.min(3, n), `a day's dots are what it holds, three at most (day ${i + 1}: ${dots} for ${n})`)
    }
    ok(hrefs.length > 0 && hrefs.every((h) => /[?&]from=%2Fdashboard/.test(h)), `every row opens its record with the way back (${hrefs.length} rows across the week)`)
    await todayCell.click(); await settle(p, 200)
    /* today: late first and red */
    const keys = await dayRows(p).evaluateAll((els) => els.map((e) => ({ key: e.getAttribute('data-key'), late: e.hasAttribute('data-late') })))
    const firstOnTime = keys.findIndex((k) => !k.late)
    ok(keys.some((k) => k.late) && keys.slice(firstOnTime).every((k) => !k.late), `ours and late come first (${keys.filter((k) => k.late).length} late)`)
    /* (the calm pass 2026-10-26, a deliberate change) the lateness is the row's time column, in red */
    const lateWord = day.locator('[data-testid="day-row"][data-late] [data-testid="day-when"]').first()
    ok(await lateWord.count() === 1 && await lateWord.evaluate((e) => getComputedStyle(e).color) === RED && /^\d+ days? late$/.test((await lateWord.innerText()).trim()), `…their lateness red, in words ("${await lateWord.innerText().catch(() => '')}") — never "(5d)"`)
    /* today's own tasks: the rail badge's rule (due by today, the meeting reminders folded into their meetings) */
    const dueToday = Number(sql(`select count(*) from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id = 'dane' and t.done = 0 and t.due_at is not null and t.due_at < ${sod + 86400} and (t.meeting_id is null or t.meeting_id not in (select id from meetings where deleted_at is null and status <> 'cancelled' and member_ids like '%"dane"%'))`))
    ok(await dayRows(p).filter({ has: p.getByTestId('day-tick') }).count() === dueToday, `today lists Dane's own tasks due by today, late ones too (${dueToday})`)
    ok(await dayRows(p).filter({ hasText: /^Meet Benjamin|Meet Priya/ }).count() === 0 && keepsToday ? await day.locator(`[data-key="meeting:${visit}"]`).count() === 1 : true, 'a meeting’s reminder is the meeting — never a second row')
    /* (the calm pass 2026-10-26, a deliberate change — the ring goes, the head's count says it) the count beside "Your day": what is still
       ahead on the day shown — its rows not ticked, not held, not over */
    const countOf = async () => Number((await day.getByTestId('your-day-count').innerText().catch(() => '0')).trim() || 0)
    const leftRows = async () => dayRows(p).evaluateAll((els) => els.filter((e) => !e.hasAttribute('data-done') && !e.hasAttribute('data-ended')).length)
    if (await day.getByTestId('day-more').count()) { await day.getByTestId('day-more').click(); await settle(p, 200) }
    const n0 = await countOf()
    ok(n0 === await leftRows() && await day.getByTestId('day-ring').count() === 0, `the head's count is what is still ahead today (${n0} of ${await dayRows(p).count()} rows) — no ring`)
    {
      /* a meeting ahead: its time and length, Prepare me asks Maison AI; a site visit has Directions */
      if (meetDay) { await cells.nth(meetDay).click(); await settle(p, 250); console.log('  · (a late run: the two meetings are tomorrow morning — pressed on tomorrow’s agenda)') }
      const vRow = day.locator(`[data-key="meeting:${visit}"]`)
      /* (the calm pass 2026-10-26, a deliberate change) the hour in the time column, the length in the caption */
      ok(/^\d{1,2}:\d{2} (AM|PM)$/.test((await vRow.getByTestId('day-when').innerText()).trim()) && /45 min/.test(await vRow.innerText()), 'a meeting ahead says its time and its length (45 min)')
      const dir = vRow.getByTestId('day-directions')
      const addr = sql(`select property_address from leads where name = 'Benjamin Han'`)
      ok(decodeURIComponent((await dir.getAttribute('data-href')) ?? '').replace(/\+/g, ' ').includes(addr), `Directions is the home's map (${addr})`)
      const [pop] = await Promise.all([C2.waitForEvent('page', { timeout: 8000 }).catch(() => null), dir.click()])
      ok(!!pop && /google\.com\/maps/.test(pop.url()), 'Directions opens the map on the press')
      if (pop) await pop.close()
      /* (the calm pass 2026-10-26, a deliberate change — one action at most) Prepare me is in the row's ⋮, which shows on the row's hover */
      const cRow = day.locator(`[data-key="meeting:${consult}"]`)
      const rm = cRow.getByTestId('day-row-menu')
      await p.mouse.move(2, 2); await settle(p, 200)
      ok(await rm.evaluate((e) => getComputedStyle(e.parentElement).opacity) === '0', 'at rest the row’s ⋮ is out of sight')
      await cRow.hover(); await settle(p, 250)
      ok(await rm.evaluate((e) => getComputedStyle(e.parentElement).opacity) === '1', '…and shows while the row is under the pointer')
      await rm.click(); await settle(p, 300)
      await p.getByTestId('day-prepare').getByRole('menuitem').click(); await settle(p, 1500)
      /* the question reaches Maison AI — its field (the FAB's sheet today, the dock once lane D4 lands) or its thread holds it */
      const asked = await p.evaluate(() => [...document.querySelectorAll('input, textarea')].map((e) => e.value).join(' | ') + ' | ' + document.body.innerText)
      ok(/Prepare me for my meeting with Priya at \d{1,2}:\d{2} (AM|PM)/.test(asked), 'Prepare me asks Maison AI about that meeting, by its client and hour')
      await p.keyboard.press('Escape'); await settle(p, 400)
      if (meetDay) { await cells.first().click(); await settle(p, 250) }
    }
    /* a call: WhatsApp on the press, Call remembered — Log the call on return opens the house log sheet */
    const kRow = day.locator(`[data-key="task:${callTask}"]`)
    /* (the calm pass 2026-10-26, a deliberate change — one action at most) Call is the row's one action (its glyph; the house Row's text button since 2026-10-27), WhatsApp in its ⋮ */
    const call = kRow.getByTestId('day-call')
    ok(await kRow.getAttribute('data-kind') === 'call' && await call.count() === 1 && await kRow.locator('a[data-testid="day-directions"]').count() === 0, 'a Call task is a call: Call on its row, nothing beside it')
    await kRow.hover(); await kRow.getByTestId('day-row-menu').click(); await settle(p, 300)
    const wa = p.getByTestId('day-whatsapp')
    const phone = sql(`select phone from leads where name = 'Cheryl Lim'`)
    ok((await wa.getAttribute('data-href')) === `https://wa.me/65${phone}` && (await call.getAttribute('data-href')) === `tel:+65${phone}`, 'WhatsApp (in the ⋮) is wa.me and Call is tel: on the lead’s own number')
    const [wpop] = await Promise.all([C2.waitForEvent('page', { timeout: 8000 }).catch(() => null), wa.getByRole('menuitem').click()])
    ok(!!wpop && /wa\.me\/65/.test(wpop.url()), 'WhatsApp opens on the press (REG-534)')
    if (wpop) await wpop.close()
    await settle(p, 1700)
    await p.evaluate(() => { window.dispatchEvent(new Event('focus')) }); await settle(p, 700)
    ok(/Log the WhatsApp with Cheryl/.test(await snackText(p)), `back on the page, the snackbar offers to log it ("${await snackText(p)}")`)
    await p.locator('[data-om-snackbar]').getByRole('button', { name: /Log it/ }).click(); await settle(p, 1800)
    const sheet = p.locator('[role="dialog"]').last()
    ok(await sheet.count() === 1 && /Cheryl/.test(await sheet.innerText()), 'Log it opens the house log sheet on Cheryl')
    await p.keyboard.press('Escape'); await settle(p, 600)
    if (await p.locator('[role="dialog"]').count()) { await p.keyboard.press('Escape'); await settle(p, 400) }
    /* the tick: done with Undo, the ring counts it */
    const contacts0 = Number(sql(`select count(*) from lead_notes where lead_id = (select id from leads where name = 'Cheryl Lim')`))
    await kRow.getByTestId('day-tick').click(); await settle(p, 1600)
    ok(/Task completed/.test(await snackText(p)) && sql(`select done from lead_tasks where id = '${callTask}'`) === '1', 'the tick completes the task and says so (the Tasks tab’s own words)')
    /* (the calm pass 2026-10-26, a deliberate change) the head's count goes down by one, the row stays ticked */
    const n1 = await countOf()
    ok(n1 === n0 - 1 && await kRow.getAttribute('data-done') !== null, `the count goes down, the row stays ticked (${n0} → ${n1})`)
    await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first().click(); await settle(p, 1800)
    ok(sql(`select done from lead_tasks where id = '${callTask}'`) === '0' && await countOf() === n0, 'Undo opens it again and the count with it')
    ok(Number(sql(`select count(*) from lead_notes where lead_id = (select id from leads where name = 'Cheryl Lim')`)) === contacts0, 'closing the log sheet logged nothing')
    /* a day pressed shows its own agenda in place */
    const busy = perDay.findIndex((n, i) => i > 0 && n > 0)
    if (busy > 0) {
      await cells.nth(busy).click(); await settle(p, 200)
      const dn = await cells.nth(busy).getAttribute('data-day')
      ok(await cells.nth(busy).getAttribute('aria-pressed') === 'true' && await cells.first().getAttribute('aria-pressed') === 'false', 'a day pressed is the one shown')
      ok(await dayRows(p).count() === perDay[busy] && /\/dashboard$/.test(new URL(p.url()).pathname), `its agenda is in place, the page where it was (${perDay[busy]} rows on day ${dn})`)
      await cells.first().click(); await settle(p, 200)
    }
    await C2.close()

    // ── 3 · Pipeline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · P-07 Pipeline')
    const C3 = await desk(); const p3 = await page(C3, 'pipeline')
    await go(p3, '/dashboard', 1500)
    const pipe = card(p3, 'pipeline')
    const stages = await pipe.getByTestId('pipeline-stage').evaluateAll((els) => els.map((e) => ({ stage: e.getAttribute('data-stage'), count: Number(e.querySelector('[class*="__stageCount"]')?.textContent ?? -1), stuck: !!e.querySelector('[data-testid="pipeline-stuck"]'), href: e.getAttribute('href') })))
    ok(stages.map((s) => s.stage).join(',') === 'New,Contacted,Met,Quote Sent,Won', 'New → Won')
    const counts = Object.fromEntries(json(`select stage, count(*) as n from leads where deleted_at is null and direct = 0 group by stage`).map((r) => [r.stage, r.n]))
    ok(stages.every((s) => s.count === (counts[s.stage] ?? 0)), `each stage is the listing's own count (${stages.map((s) => `${s.stage} ${s.count}`).join(' · ')})`)
    /* (2026-10-27, a deliberate change — his "take a call from our 2.0 consistency pov") the card's own stuck rule is gone: no amber mark on a
       stage, no "n stuck" — going quiet (Sales' rule) is the line's one fact */
    ok(stages.every((s) => !s.stuck) && !(await pipe.locator('[data-testid="pipeline-stuck"], [data-testid="pipeline-stuck-line"]').count()), 'no stuck mark on any stage, no stuck count')
    const line = (await pipe.getByTestId('pipeline-line').innerText()).replace(/\s+/g, ' ')
    ok(!/stuck/i.test(line) && /^(\d+ going quiet|Nothing going quiet)$/.test(line.trim()), `the line under the bars is going quiet alone (${line})`)
    const openN = ['New', 'Contacted', 'Met', 'Quote Sent'].reduce((n, k) => n + (counts[k] ?? 0), 0)
    ok((await pipe.getByTestId('pipeline-open').innerText()).trim() === `${openN} open`, `the head's one fact: the open stages' leads (${openN} open)`)
    const qn = Number(/(\d+) going quiet/.exec(line)?.[1] ?? 0)
    const quietLink = pipe.getByTestId('pipeline-quiet')
    if (qn && (await quietLink.getAttribute('href'))) {
      await quietLink.click(); await p3.waitForURL(/report=sales/, { timeout: 15000 }).catch(() => {}); await settle(p3, 2200)
      const note = Number(/(\d+) leads? with no contact for over 30 days/.exec(await p3.locator('main').innerText())?.[1] ?? -1)
      ok(note === qn && /range=all/.test(p3.url()) && /from=%2Fdashboard/.test(p3.url()), `going quiet is Sales' own count, All time (${qn} = ${note})`)
      await go(p3, '/dashboard', 1400)
    }
    const met = stages.find((s) => s.stage === 'Met')
    ok(/^\/leads\?scope=met&from=%2Fdashboard$/.test(met.href), `a stage opens the listing scoped to it with the way back (${met.href})`)
    await pipe.locator('[data-stage="Met"]').click(); await p3.waitForURL(/scope=met/, { timeout: 15000 }).catch(() => {}); await settle(p3, 1800)
    /* (the calm UI build 2026-10-27, a deliberate change — T-07, W-479) the scope pill reads "Met · 3" (was "Met (3)") */
    const pill = Number(/Met · (\d+)/.exec(await p3.locator('main').innerText())?.[1] ?? -2)
    ok(pill === met.count, `…the listing says the same number (${pill} = ${met.count})`)
    await C3.close()

    // ── 4 · Projects ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · P-08 · Q-10 Projects')
    const C4 = await desk(); const p4 = await page(C4, 'projects')
    await go(p4, '/dashboard', 1500)
    const pc = card(p4, 'projects')
    const open = json(`select p.id, p.name, p.stage, p.on_hold_at as hold from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed'`)
    /* (the calm pass 2026-10-26, a deliberate change) the health is a word at the line's right (its colour the dot's was) */
    const lines = await pc.getByTestId('project-line').evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('href'), health: e.getAttribute('data-health'), name: e.querySelector('[class*="__projectName"]')?.textContent ?? '', why: e.querySelector('[data-testid="project-why"]')?.textContent ?? '', state: e.querySelector('[data-testid="project-state"]')?.textContent ?? '', dot: getComputedStyle(e.querySelector('[data-testid="project-state"]')).color })))
    ok(lines.length === open.length && (await pc.getByTestId('projects-running').innerText()).includes(`${open.length} running`), `one line per open project, the head "${open.length} running" — the old Open projects tile`)
    const ORDER = { late: 0, at_risk: 1, on_track: 2, setting_up: 3, on_hold: 4 }
    ok(lines.every((l, i) => i === 0 || ORDER[lines[i - 1].health] <= ORDER[l.health]), `worst first (${lines.map((l) => l.health).join(' · ')})`)
    for (const o of open) {
      const l = lines.find((x) => x.name === o.name)
      if (!l) { ok(false, `${o.name} has its line`); continue }
      const oursLate = Number(sql(`select count(*) from project_milestones where project_id = '${o.id}' and deleted_at is null and status <> 'done' and waiting_on is null and date(end_date, 'unixepoch', 'localtime') < date('now', 'localtime')`))
      const want = o.hold ? 'on_hold' : o.stage === 'setting_up' ? 'setting_up' : oursLate ? 'late' : null
      /* (the calm pass 2026-10-26, a deliberate change) the state word says the health ("Starts 4 Nov" for a project setting up with a start); the
         line under the bar the progress and the first reason */
      if (want) ok(l.health === want && ({ on_hold: /^On hold$/, setting_up: /^(Setting up|Starts .+)$/, late: /^Late$/ }[want]).test(l.state) && (want !== 'late' || /^\d+% · /.test(l.why)), `${o.name}: ${want.replace('_', ' ')} by rule — "${l.state}" · "${l.why}"`)
      ok(/\/projects\/[^/?]+\?from=%2Fdashboard$/.test(l.href), `${o.name}: its line opens the project with the way back`)
    }
    ok(lines.every((l) => (l.dot === RED) === (l.health === 'late')), 'red only on what is ours and late (S-05)')
    const lateN = lines.filter((l) => l.health === 'late').length
    ok((await pc.getByTestId('projects-running').innerText()).trim() === `${open.length} running${lateN ? ` · ${lateN} late` : ''}`, `the head: "n running · n late" (${await pc.getByTestId('projects-running').innerText()})`)
    await pc.getByTestId('project-line').first().click(); await p4.waitForURL(/\/projects\/[^/]+/, { timeout: 15000 }).catch(() => {}); await settle(p4, 1200)
    ok(/\/projects\/[^/]+$/.test(new URL(p4.url()).pathname), 'a line lands on its project')
    as('james'); await go(p4, '/dashboard', 1500)
    const jWhy = await card(p4, 'projects').getByTestId('project-why').allInnerTexts()
    ok(jWhy.length > 0 && jWhy.every((w) => !/bill|payment|Costs/.test(w)), `a Manager who sees no project money reads no money reason (${jWhy.join(' | ')})`)
    as('dane')
    await C4.close()

    // ── 5 · Team ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · P-09 Team')
    const g0 = json(`select project_capacity as cap, accepting_leads as acc from members where id = 'germaine'`)[0]
    sql(`update members set project_capacity = 1 where id = 'germaine'; update members set accepting_leads = 0 where id = 'alex'`)
    const C5 = await desk(); const p5 = await page(C5, 'team')
    await go(p5, '/dashboard', 1500)
    const tc = card(p5, 'team')
    const g = tc.getByTestId('team-row').filter({ hasText: 'Germaine' })
    /* (the calm pass 2026-10-26, a deliberate change — Team load's segments) one segment per project they can carry; past it, amber; "1 over" */
    const gProjects = Number((await g.getAttribute('aria-label')).match(/: (\d+) projects?/)?.[1] ?? -1)
    ok(await g.getAttribute('data-over') !== null && gProjects > 1 && (await g.getByTestId('team-load').innerText()).trim() === `${gProjects - 1} over`, `a member past their capacity is over ("${(await g.getByTestId('team-load').innerText()).trim()}")`)
    const segs = await g.locator('[data-testid="team-segments"] i').evaluateAll((els) => els.map((e) => [e.getAttribute('data-s'), getComputedStyle(e).backgroundColor]))
    const fill = segs.find(([k]) => k === 'over')?.[1]
    ok(segs.length === gProjects && segs.filter(([k]) => k === 'over').length === gProjects - 1 && fill === AMBER && fill !== RED, `…the segments past capacity in amber, never red — a load, not a lateness (${segs.map(([k]) => k).join(' ')})`)
    const figures = await tc.getByTestId('team-load').allInnerTexts()
    ok(figures.every((f) => /^(Full \(\d+ of \d+\)|\d+ of \d+ projects?|\d+ over)$/.test(f.trim())), `each member's figure in words: "Full (2 of 2)" · "2 of 3 projects" · "1 over" (${figures.join(' · ')})`)   // (the calm UI build 2026-10-27, a deliberate change) (was "Full" · "2/3")
    ok(/closed to new leads/.test(await tc.getByTestId('team-row').filter({ hasText: 'Alex' }).innerText()), 'a member closed to new leads says so')
    const firstName = (await tc.getByTestId('team-row').first().locator('[class*="__teamName"]').innerText()).trim()
    const rowHref = await tc.getByTestId('team-row').first().getAttribute('href')
    ok(/^\/projects\?view=workload&from=%2Fdashboard$/.test(rowHref), `a member opens Workload with the way back (${rowHref})`)
    await tc.getByTestId('team-row').first().click(); await p5.waitForURL(/view=workload/, { timeout: 15000 }).catch(() => {}); await settle(p5, 2000)
    ok((await p5.locator('main').innerText()).includes(firstName), `Workload lists the same people, busiest first (${firstName})`)
    await go(p5, '/dashboard', 1400)
    const crew = card(p5, 'team').getByTestId('team-contractors')
    if (await crew.count()) {
      await crew.click(); await p5.waitForURL(/of=contractors|finance\/vendors/, { timeout: 15000 }).catch(() => {}); await settle(p5, 1600)
      ok(/of=contractors|\/company\/finance\/vendors/.test(p5.url()), 'the contractors’ line opens Workload › Contractors (or Vendors, with none yet)')
    }
    sql(`update members set project_capacity = ${lit(g0.cap)} where id = 'germaine'; update members set accepting_leads = 1 where id = 'alex'`)
    await C5.close()

    // ── 6 · On site ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · P-09 On site')
    const C6 = await desk(); const p6 = await page(C6, 'site')
    await go(p6, '/dashboard', 1500)
    const week = json(`select u.id, u.project_id as pid from project_updates u join projects p on p.id = u.project_id where u.status = 'published' and u.deleted_at is null and p.deleted_at is null and u.published_at >= ${sod - 6 * 86400}`)
    const photos = card(p6, 'site').getByTestId('site-photo')
    if (week.length) {
      const nPhotos = Number(sql(`select count(*) from project_update_files f join lead_files lf on lf.id = f.file_id where lf.deleted_at is null and (lf.kind = 'image' or lf.mime like 'image/%') and f.update_id in (${week.map((w) => `'${w.id}'`).join(',')})`))
      /* (the calm pass 2026-10-26, a deliberate change) one row of large photos at rest (three at a desk), the rest in place under "All n photos" */
      const shown0 = await photos.count()
      ok(shown0 === Math.min(3, nPhotos) && (await card(p6, 'site').getByTestId('site-all').count()) === (nPhotos > 3 ? 1 : 0), `the week's published photos, one row of them (${shown0} of ${nPhotos})`)
      const tw = await photos.first().evaluate((e) => e.getBoundingClientRect().width)
      ok(tw >= 110, `…large (${Math.round(tw)}px wide)`)
      const cap = (await card(p6, 'site').getByTestId('site-caption').first().innerText()).trim()
      const titles = json(`select title from project_updates where id in (${week.map((w) => `'${w.id}'`).join(',')})`).map((r) => r.title)
      ok(cap.split(' · ').length >= 3 && titles.some((t) => cap.startsWith(t)), `a caption under each update: its title · whose · when ("${cap}")`)
      const href = await photos.first().getAttribute('href')
      ok(/\/projects\/[^/]+\/updates\?open=[^&]+&from=%2Fdashboard$/.test(href), 'a photo opens its update on the project’s Updates, with the way back')
      await photos.first().click(); await p6.waitForURL(/\/updates/, { timeout: 15000 }).catch(() => {}); await settle(p6, 1600)
      ok(/\/projects\/[^/]+\/updates/.test(new URL(p6.url()).pathname), '…and lands there')
      sql(`update project_updates set published_at = published_at - 10 * 86400 where id in (${week.map((w) => `'${w.id}'`).join(',')})`)
      await go(p6, '/dashboard', 1500)
      ok(await card(p6, 'site').count() === 0, 'nothing published this week: the card is left out')
    } else ok(await card(p6, 'site').count() === 0, 'nothing published this week: the card is left out')
    await C6.close()
    putBack()

    // ── 7 · roles and Mine ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · P-11 by role · Mine')
    const ROLES = [['dane', ['day', 'pipeline', 'projects', 'team']], ['huimin', ['day', 'pipeline', 'projects', 'team']], ['james', ['day', 'pipeline', 'projects', 'team']], ['germaine', ['day', 'projects']], ['priya', ['day']], ['nurul', ['day', 'pipeline']]]
    const NOT = { germaine: ['pipeline', 'team'], priya: ['pipeline', 'projects', 'team', 'site'], nurul: ['projects', 'team', 'site'] }
    const C7 = await desk(); const p7 = await page(C7, 'roles')
    for (const [who, has] of ROLES) {
      as(who); await go(p7, '/dashboard', 1500)
      const shown = await p7.locator('[data-card]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-card')))])
      ok(has.every((k) => shown.includes(k)) && (NOT[who] ?? []).every((k) => !shown.includes(k)), `${who}: ${has.join(' · ')}${NOT[who] ? ` — never ${NOT[who].join(' · ')}` : ''} (${shown.filter((k) => ['day', 'pipeline', 'projects', 'team', 'site'].includes(k)).join(' · ')})`)
      if (who === 'priya') {
        /* Accounting's week is To do's money due in it — no project's milestones, no meeting */
        const kinds = []
        const cellsP = card(p7, 'day').getByTestId('day-cell')
        for (let i = 0; i < 7; i++) { await cellsP.nth(i).click(); await settle(p7, 120); kinds.push(...await card(p7, 'day').getByTestId('day-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))) }
        ok(kinds.every((k) => k === 'money' || k === 'task' || k === 'call') && !kinds.includes('milestone') && !kinds.includes('meeting'), `priya: her week is money due and her own tasks (${kinds.join(' · ') || 'nothing this week'})`)
      }
      if (who === 'germaine') {
        const own = Number(sql(`select count(*) from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed' and exists (select 1 from lead_assignees a where a.lead_id = p.lead_id and a.member_id = 'germaine')`))
        ok(await card(p7, 'projects').getByTestId('project-line').count() === own, `germaine: her own projects (${own})`)
      }
    }
    as('dane'); await go(p7, '/dashboard?scope=mine', 1500)
    const mineProjects = Number(sql(`select count(*) from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed' and exists (select 1 from lead_assignees a where a.lead_id = p.lead_id and a.member_id = 'dane')`))
    const mineLeads = Number(sql(`select count(*) from leads l where l.deleted_at is null and l.direct = 0 and l.stage in ('New','Contacted','Met','Quote Sent','Won') and exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = 'dane')`))
    ok(await card(p7, 'projects').getByTestId('project-line').count() === mineProjects, `Mine: Dane's own projects (${mineProjects})`)
    const mineCounts = await card(p7, 'pipeline').getByTestId('pipeline-stage').evaluateAll((els) => els.reduce((n, e) => n + Number(e.querySelector('[class*="__stageCount"]')?.textContent ?? 0), 0))
    ok(mineCounts === mineLeads && /member=dane/.test(await card(p7, 'pipeline').getByTestId('pipeline-stage').first().getAttribute('href')), `Mine: the pipeline is his leads, its doors keep the member filter (${mineCounts})`)
    await C7.close()

    // ── 8 · § 2 quiet · every width ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · his note (§ 2) · every width')
    const C8 = await desk(); const p8 = await page(C8, 'quiet')
    await go(p8, '/dashboard', 1600)
    /* (the calm pass 2026-10-26 — § 2.1 "data marks are not buttons: bars, progress and capacity segments may take the primary's tones") the
       marks take the primary's TONES — the deepest (Won, a full load) the primary's darker hover ink — so nothing in the five cards is a button's
       primary fill, mark or control */
    const loud = await p8.locator('[data-card="day"], [data-card="pipeline"], [data-card="projects"], [data-card="team"], [data-card="site"]').evaluateAll((cards, primary) => cards.flatMap((c) => [...c.querySelectorAll('*')].filter((e) => getComputedStyle(e).backgroundColor === primary).map((e) => e.className || e.tagName)), PRIMARY)
    ok(loud.length === 0, `no filled primary background in the five cards at rest — a mark is a tone, never a button's fill (${loud.slice(0, 4).join(', ')})`)
    const filled = await p8.locator('[data-card="day"] [data-appearance="filled"], [data-card="pipeline"] [data-appearance="filled"], [data-card="projects"] [data-appearance="filled"], [data-card="team"] [data-appearance="filled"], [data-card="site"] [data-appearance="filled"]').count()
    ok(filled === 0, 'no filled button on a card — a row\'s verb is the house text button')
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-19: one door for Maison AI) each card head carries ONE ⋮, whose first row
       is Ask Maison AI about this (the ✦ Ask button went into it) */
    const asks = await p8.locator('[data-card] [data-testid^="menu-"][aria-haspopup="menu"]').count()
    ok(asks >= 4, `each card head carries its ⋮ — Ask Maison AI about this inside it (${asks})`)
    await shot(p8, '8-desk-1440', true)
    await C8.close()
    for (const [w, h, t] of [[1280, 800, false], [1024, 768, true], [768, 1024, true], [390, 844, true], [320, 700, true], [844, 390, true]]) {
      const c = t ? await touch(w, h) : await desk(w, h); const q = await page(c, `${w}`)
      await go(q, '/dashboard', 1600)
      ok(await sideways(q) <= 0, `${w}×${h}${t ? ' touch' : ''}: no sideways scroll`, `${await sideways(q)}px`)
      if (t) {
        /* an icon button draws 36 and carries a 44 box of its own under a finger (the house IconButton's ::after, REG-344) — measured as that box */
        /* (the calm pass 2026-10-26) + the head's ⋮ under a finger and the cards' text links (All photos · View · Show n more · the head's door) */
        const small = await q.locator('[data-card="day"] [data-testid="day-row"] button, [data-card="day"] [data-testid="day-row"] a[data-testid="day-directions"], [data-card="day"] [data-testid="day-cell"], [data-testid="pipeline-stage"], [data-testid="project-line"], [data-testid="team-row"], [data-testid$="-ask"], [data-card] [data-testid^="menu-"], [data-testid="team-contractors"], [data-testid="projects-running"], [data-testid="site-all"], [data-testid="day-more"], [data-testid="projects-more"], [data-testid="team-more"]').evaluateAll((els) => els.filter((e) => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false
          const after = getComputedStyle(e, '::after'); const box = after.content !== 'none' && after.position === 'absolute' ? Math.max(r.height, parseFloat(after.height) || 0) : r.height
          return box < 43.5
        }).map((e) => `${e.getAttribute('data-testid') ?? e.tagName} ${Math.round(e.getBoundingClientRect().height)}`))
        const real = small
        ok(real.length === 0, `${w}: every press is 44 tall under a finger (${real.slice(0, 4).join(', ')})`)
        /* (the calm pass 2026-10-26, a deliberate change) the time column is `__when`; + the state word, the photo caption, the head's facts */
        const tiny = await q.locator('[class*="cards-module"][class*="__title"], [class*="cards-module"][class*="__caption"], [class*="__projectName"], [class*="__projectLine"], [class*="__projectState"], [class*="__teamName"], [class*="__teamCaption"], [class*="__stageName"], [class*="__stageCount"], [class*="__loadFigure"], [class*="cards-module"][class*="__when"], [class*="__dayDate"], [class*="__funnelFoot"], [class*="__crewWords"], [class*="__photoCaption"], [class*="__headFact"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width && parseFloat(getComputedStyle(e).fontSize) < 14).map((e) => e.className.split('__').pop()))
        ok(tiny.length === 0, `${w}: no name, value or sentence under 14px (${tiny.slice(0, 4).join(', ')})`)
      }
      if (w <= 390 && t) {
        /* (the calm pass 2026-10-26, a deliberate change) the week takes its own row under the title on a phone: seven across where they fit,
           each a 44 target, else the rail scrolls (the house chip rail) */
        const cw = await q.locator('[data-testid="day-cell"]').first().evaluate((e) => e.getBoundingClientRect().width)
        const fits = await q.locator('[data-testid="day-week"] [role="group"]').evaluate((e) => e.scrollWidth <= e.clientWidth + 1)
        const head = await q.locator('[data-card="day"] [class*="__headTitle"]').boundingBox(), wk = await q.locator('[data-testid="day-week"]').boundingBox()
        ok(cw >= 44 && wk.y >= head.y + head.height - 1, `${w}: the week under the title, each day a 44 target, ${fits ? 'all seven across' : 'the rest a swipe away'} (${Math.round(cw)}px a day)`)
      }
      await q.locator('[data-card="day"]').first().scrollIntoViewIfNeeded().catch(() => {}); await shot(q, `8-${w}x${h}`)
      /* under a finger: a day tapped shows its own; the tick tapped completes with Undo (put back) */
      if (t && (w === 390 || w === 1024)) {
        const tapEl = async (loc) => { await loc.scrollIntoViewIfNeeded(); await settle(q, 250); const r = await loc.boundingBox(); await q.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await settle(q, 400) }
        const cellsT = q.locator('[data-card="day"] [data-testid="day-cell"]')
        await tapEl(cellsT.nth(1))
        ok(await cellsT.nth(1).getAttribute('aria-pressed') === 'true', `${w}: a tapped day is the one shown`)
        await tapEl(cellsT.first())
        const tk = q.locator('[data-card="day"] [data-testid="day-row"]:not([data-done]) [data-testid="day-tick"]').first()
        if (await tk.count()) {
          const key = (await tk.locator('xpath=ancestor::*[@data-testid="day-row"]').getAttribute('data-key')).replace(/^task:/, '')
          await tapEl(tk); await settle(q, 1200)
          ok(sql(`select done from lead_tasks where id = '${key}'`) === '1' && /Task completed/.test(await snackText(q)), `${w}: a tapped tick completes the task`)
          const undo = q.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first()
          if (await undo.count()) { await tapEl(undo); await settle(q, 1400) }
          ok(sql(`select done from lead_tasks where id = '${key}'`) === '0', `${w}: …and Undo, tapped, opens it again`)
        }
      }
      await c.close()
    }

    // ── 10 · the calm pass (2026-10-26): the card's surface and head, its hover tools, a finger's ⋮, the busy measure ───────────────────────
    console.log('10 · the calm pass — the card, its head, its tools, the busy measure')
    as('dane')
    const C10 = await desk(); const d10 = await page(C10, 'calm')
    await go(d10, '/dashboard', 1600)
    await d10.mouse.move(2, 2); await settle(d10, 300)
    const KEYS = ['day', 'pipeline', 'projects', 'team', 'site']
    const surf = await d10.locator(KEYS.map((k) => `[data-card="${k}"] > section`).join(', ')).evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return { k: e.parentElement.getAttribute('data-card'), bg: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow, r: cs.borderRadius, pad: cs.paddingTop } }))
    ok(surf.length >= 4 && surf.every((x) => x.bg === 'rgb(255, 255, 255)' && x.border === '0px' && x.shadow === 'none' && x.r === '8px'), `each card is white with no border and no shadow, 8 round (${surf.map((x) => x.k).join(' · ')})`)
    const heads = await d10.locator(KEYS.map((k) => `[data-card="${k}"] h2`).join(', ')).evaluateAll((els) => els.map((e) => { const n = e.firstElementChild; const cs = getComputedStyle(n); const c = n.nextElementSibling; return { t: n.textContent, size: cs.fontSize, w: cs.fontWeight, tt: cs.textTransform, count: c ? getComputedStyle(c).color : null } }))
    ok(heads.every((h) => h.size === '20px' && h.w === '600' && h.tt === 'none' && /^[A-Z][a-z]/.test(h.t) && h.t !== h.t.toUpperCase()), `each title in sentence case at 20 semibold (${heads.map((h) => h.t).join(' · ')})`)
    ok(heads.filter((h) => h.count).every((h) => h.count === 'rgb(102, 102, 102)'), 'a count beside its title in the secondary ink')
    const rights = await d10.locator(KEYS.map((k) => `[data-card="${k}"] [class*="__headRight"]`).join(', ')).evaluateAll((els) => els.map((e) => e.querySelectorAll('button:not([data-testid="day-cell"]), a').length))
    ok(rights.every((n) => n <= 1), `at most one control in a head's right slot, the week's days aside (${rights.join(' · ')})`)
    const toolsOp = () => d10.locator(KEYS.map((k) => `[data-card="${k}"] [class*="__tools"]`).join(', ')).evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))
    ok((await toolsOp()).every((o) => o === '0'), 'at rest, no card shows its ✦ Ask or its ⋮ (his “out of sight until wanted”)')
    await card(d10, 'pipeline').hover(); await settle(d10, 250)
    const pOp = await card(d10, 'pipeline').locator('[class*="__tools"]').evaluate((e) => getComputedStyle(e).opacity)
    ok(pOp === '1', 'the pointer on a card shows its ⋮')   // (the calm UI build 2026-10-27, a deliberate change) one ⋮ — the ✦ Ask is its first row
    await d10.mouse.move(2, 2); await settle(d10, 250)
    await card(d10, 'projects').getByTestId('menu-projects').focus(); await settle(d10, 250)
    ok(await card(d10, 'projects').locator('[class*="__tools"]').evaluate((e) => getComputedStyle(e).opacity) === '1', '…and so does the keyboard in its head')
    await card(d10, 'pipeline').hover(); await d10.getByTestId('menu-pipeline').click(); await settle(d10, 300)
    const deskMenu = await d10.locator('[role="menu"] [role="menuitem"]').allInnerTexts()
    ok(deskMenu.some((t) => /Hide this card/.test(t)) && deskMenu.some((t) => /Ask Maison AI about this/.test(t)), `a desk's ⋮ holds Ask Maison AI about this and Hide this card (${deskMenu.join(' · ')})`)   // (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-19: one door)
    await d10.locator('[role="menuitem"]', { hasText: 'Ask Maison AI about this' }).first().click(); await settle(d10, 500)
    ok(await d10.locator('[data-testid="dock-about"]').count() === 1, 'its Ask puts the card in Maison AI’s question (the dock’s chip)')
    await d10.locator('[data-testid="dock-about-clear"]').click().catch(() => {}); await settle(d10, 200)
    /* the busy measure of the five cards (brief-calm.md's measure, read over this lane's region at rest) */
    await d10.mouse.move(2, 2); await settle(d10, 300)
    const measure = await d10.evaluate((keys) => {
      const roots = keys.map((k) => document.querySelector(`[data-card="${k}"]`)).filter(Boolean)
      const els = roots.flatMap((r) => [...r.querySelectorAll('*')]).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).opacity !== '0' && !e.closest('[style*="opacity: 0"]') })
      const shown = els.filter((e) => { let n = e; while (n && !n.matches?.('[data-card]')) { if (getComputedStyle(n).opacity === '0') return false; n = n.parentElement } return true })
      const mark = (e) => e.closest('[aria-hidden="true"]') || e.matches('i, [class*="__stageBar"], [class*="__stageTrack"], [class*="__progress"], [class*="__dot"], [class*="__stuck"], [class*="__photo"]')
      const boxed = shown.filter((e) => { const s = getComputedStyle(e); return !mark(e) && ((parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0) || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)' && e.getBoundingClientRect().width > 24)) })
      const controls = shown.filter((e) => e.matches('button, a[href], [role="button"], [role="tab"], [role="radio"]'))
      const texts = shown.filter((e) => !e.matches('.msr, .mso') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))   // an icon's ligature is a glyph, not words
      const sizes = new Set(texts.map((e) => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight))
      const colours = new Set(texts.map((e) => getComputedStyle(e).color))
      const words = texts.map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ').split(/\s+/).filter(Boolean).length
      const upper = texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length
      const tints = new Set(shown.filter((e) => !mark(e)).map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(255, 255, 255)'))
      return { cards: roots.length, words, boxed: boxed.length, boxedWhat: boxed.map((e) => e.className.toString().split('__').pop()).slice(0, 6), controls: controls.length, textSizes: sizes.size, sizeList: [...sizes], textColours: colours.size, colourList: [...colours], uppercase: upper, tints: tints.size, tintList: [...tints] }
    }, KEYS)
    console.log('  · the busy measure (the five cards at rest, 1440):', JSON.stringify(measure))
    ok(measure.uppercase === 0, 'no uppercase label in the five cards (Pulse’s four are the page’s only)')
    ok(measure.boxed <= 3, `boxes in the five cards: the selected day's tint and at most two more, no more (${measure.boxed}: ${measure.boxedWhat.join(', ')})`)
    ok(measure.textColours <= 5 && measure.colourList.every((c) => ['rgb(26, 26, 26)', 'rgb(102, 102, 102)', PRIMARY, RED, 'rgb(193, 126, 34)'].includes(c)), `text in the two inks, the primary for a door, red and amber only when earned (${measure.colourList.join(' · ')})`)
    ok(measure.textSizes <= 5, `five type sizes and weights at most (${measure.sizeList.join(' · ')})`)
    ok(measure.tints <= 2, `no tinted surface but the day shown (and a hover) (${measure.tintList.join(' · ')})`)
    await C10.close()
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-28) a phone's cards carry no ⋮ — a card hides from the page's ⋮, Maison AI is the dock */
    { const P10 = await touch(390, 844); const ph = await page(P10, 'calm-phone'); await go(ph, '/dashboard', 1600)
      ok(await ph.locator('[data-card] [data-testid^="menu-"]').count() === 0 && await ph.locator('[data-card] button[data-testid$="-ask"]').count() === 0 && await ph.getByTestId('page-menu').isVisible(), 'a phone: no card ⋮ and no Ask button — the page’s ⋮ hides cards')
      await P10.close() }
    /* a finger on a tablet: one ⋮ in each head, holding Ask Maison AI and Hide this card */
    const T10 = await touch(1024, 768); const t10 = await page(T10, 'calm-touch')
    await go(t10, '/dashboard', 1600)
    ok(await t10.locator('[data-card] button[data-testid$="-ask"]').count() === 0 && await t10.locator('[data-card="pipeline"] [data-testid="menu-pipeline"]').isVisible(), 'under a finger no card shows an Ask button — one ⋮ in its head')
    const pm = t10.getByTestId('menu-pipeline')
    await pm.scrollIntoViewIfNeeded(); await settle(t10, 200)
    /* the head's content edge (the head carries the card's side padding) */
    const headEnd = await t10.locator('[data-card="pipeline"] [class*="__head"]').first().evaluate((e) => e.getBoundingClientRect().right - parseFloat(getComputedStyle(e).paddingRight)), mb = await pm.boundingBox()
    ok(mb.x + mb.width >= headEnd - 2, '…at the head’s end, after its slot')
    /* (the landing's asks) at a desk too the ✦ and ⋮ come after the slot, holding their room — the slot sits where it sits while they show */
    const D10 = await desk(); const e10 = await page(D10, 'calm-room')
    await go(e10, '/dashboard', 1600); await e10.mouse.move(2, 2); await settle(e10, 300)
    const slotAt = () => e10.locator('[data-card="pipeline"] [class*="__headRight"]').first().boundingBox()
    const r0 = await slotAt(), tb = await e10.locator('[data-card="pipeline"] [class*="__tools"]').first().boundingBox()
    await card(e10, 'pipeline').hover(); await settle(e10, 300)
    const r1 = await slotAt()
    ok(tb.x >= r0.x + r0.width - 1 && Math.abs(r1.x - r0.x) < 0.5, `the ⋮ sits after the slot and the slot never moves when it shows (${Math.round(r0.x)} → ${Math.round(r1.x)})`)
    await D10.close()
    await pm.tap(); await settle(t10, 600)
    const touchMenu = await t10.locator('[role="menu"] [role="menuitem"], [role="dialog"] [role="menuitem"]').allInnerTexts()
    ok(touchMenu.some((t) => /Ask Maison AI/.test(t)) && touchMenu.some((t) => /Hide this card/.test(t)), `…holding Ask Maison AI and Hide this card (${touchMenu.join(' · ')})`)
    await t10.locator('[role="menuitem"]', { hasText: 'Ask Maison AI' }).first().tap(); await settle(t10, 800)
    ok(await t10.locator('[data-testid="dock-about"]').count() >= 1 || await t10.locator('[role="dialog"][aria-label="Maison AI"]').count() >= 1, '…and its Ask puts the card in Maison AI’s question')
    await T10.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    const changed = putBack()
    const after = TABLES.filter((t) => hashOf(t) !== before.get(t))
    ok(after.length === 0, `everything written is put back (${changed.length ? changed.join(', ') : 'nothing written'})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
