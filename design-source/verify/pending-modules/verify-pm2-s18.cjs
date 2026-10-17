// Pending modules, step S18 · Notifications (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:notifications — Leads Q-42 · Q-43 opened as recommended). Each item asserted as the rule it builds, never another round's count:
//  - **Your notifications** on Your profile, every member's own: Emails — As they happen · A daily summary (the summary needs an email); Muted —
//    one sentence and *Choose what reaches you* (the notices that can reach THIS member, by area, a switch each; one the studio has off says so)
//  - a **personal mute**: a muted notice never reaches the member — no bell row (so no email), everyone else still hears it; a muted reminder
//    leaves their bell's Due list; unmuted, both come back
//  - the **daily summary**: a member who takes it gets their non-urgent emails in it, not one by one; *Send one now* writes it through the
//    delivery layer (Sent messages lists it, Read it opens it as the member reads it) — every line of it is one of their bell's rows; the 8 AM
//    one goes on the first read from 8 AM for a member who chose it before today's 8 AM (once a day), never the day they chose it after 8
//  - the bell's door: its Notification settings opens Your profile › Your notifications (with the way back); its notices are headed
//    **Notices** (one-home N-14 — "Updates" was a project's tab); Settings › Notifications points to Your profile; ⌘K finds it
//  - Maison AI's "What did I miss?" answers from the same rows; the bell's due line says a project task's day (not "Due in 29 min")
//  - the ghost draws the card where the page does; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s18.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s18')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s18-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const n = (q) => Number(sql(q) || 0)
const now = new Date()
const DAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const AFTER8 = now.getHours() >= 8
const FARAH = sql(`select id from leads where name = 'Farah Ahmad' and deleted_at is null`)
const TASK = sql(`select t.id from lead_tasks t join task_assignees a on a.task_id = t.id and a.member_id = 'sarah' where t.lead_id = '${FARAH}' and t.title = 'Follow up on WhatsApp'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  /* the same address again (a hash alone differs) is a fresh load — a goto there would only move the hash and keep the old records */
  const go = async (p, url) => { const same = p.url().split('#')[0] === (BASE + url).split('#')[0]; await p.goto(BASE + url, { waitUntil: 'networkidle' }); if (same) await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1100) }
  const shot = (p, nm, full = false) => p.screenshot({ path: path.join(dir, `${nm}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const card = (p) => p.getByTestId('profile-notifications')
  const openBell = async (p) => { await p.locator('[data-notifications-tile]').first().click(); await p.getByTestId('notifications-panel').waitFor(); await settle(p, 1400) }
  const closeBell = async (p) => { await p.keyboard.press('Escape'); await settle(p, 300) }
  const openChooser = async (p) => { await p.getByTestId('notices-choose').click(); await p.getByTestId('notices-list').waitFor(); await settle(p, 400) }
  const flip = async (p, key) => { await p.getByTestId(`notice-${key}`).click(); await settle(p, 1100) }
  const done = async (p) => { await p.getByTestId('notices-done').click(); await settle(p, 500) }
  const mutedOf = (m) => { const v = sql(`select coalesce(notice_muted, '[]') from members where id = '${m}'`); return JSON.parse(v || '[]') }
  /* a comment on Farah's "Follow up on WhatsApp" (Dane and Sarah are on it), as whoever is signed in — notify's own path */
  const comment = async (p, words) => {
    await go(p, `/leads/${FARAH}/tasks?open=${TASK}&panel=comments`)
    const box = p.locator('[role="dialog"][aria-label="Comments"] textarea')
    await box.waitFor({ timeout: 10000 }); await box.click(); await p.keyboard.type(words)
    await p.locator('[role="dialog"][aria-label="Comments"]').getByRole('button', { name: 'Submit' }).click(); await settle(p, 1300)
  }
  const heard = (m, words) => n(`select count(*) from notifications where kind = 'task_comment' and member_id = '${m}' and body like '%${words}%'`)
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/leads'); await settle(p0, 1500); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let body = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      body += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) body += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    body += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(body)
    return changed
  }

  try {
    ok(!!FARAH && !!TASK, 'the demo has Farah Ahmad’s “Follow up on WhatsApp”, with Dane and Sarah on it')
    as('dane')
    const D = await desk(); const d = await page(D, 'desk')

    // ── 1 · Your notifications on Your profile ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Your notifications — the member’s own card')
    await go(d, '/profile')
    ok(await card(d).count() === 1 && /Your notifications/.test(await text(card(d).locator('h2'))), 'Your profile has a Your notifications card')
    ok(/\/settings\?section=notifications/.test(await d.getByTestId('notices-studio-link').getAttribute('href') || ''), '…its line names the studio’s rules, as a link to Settings › Notifications')
    ok(await d.getByRole('radio', { name: 'As they happen' }).getAttribute('aria-checked') === 'true' && /Each email goes out with its notice/.test(await text(d.getByTestId('notices-email-help'))), 'Emails: As they happen by default — a member who never opens it hears what they heard before')
    ok(/^Nothing muted/.test(await text(d.getByTestId('notices-muted-line'))), 'Muted: nothing, in one sentence')
    await shot(d, '01-your-notifications-1440')

    // ── 2 · The bell's door, and its words ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · the bell: Notices · Due, and Notification settings opens Your notifications')
    await go(d, '/leads')
    await openBell(d)
    const heads = (await d.getByTestId('notifications-panel').locator('h3').allInnerTexts()).map((s) => s.toLowerCase())
    ok(heads.some((h) => h.startsWith('notices')) && heads.some((h) => h.startsWith('due')) && !heads.some((h) => h.startsWith('updates')), `the bell’s groups are Notices and Due — no “Updates” beside a project’s Updates tab (${heads.join(' · ')})`)
    const soonRows = await d.locator('[data-testid="notification-row"]:has([data-kind="task_due_soon"])').allInnerTexts()
    ok(soonRows.every((r) => !/Due (tomorrow|in \d+ days):/.test(r) || !/Due in \d+ min/.test(r)), 'a project task due in days reads its day — never “Due in 29 min”')
    await shot(d, '02-bell-1440')
    await d.getByTestId('notifications-settings-link').click(); await d.waitForURL(/\/profile/); await settle(d, 1600)
    const url = new URL(d.url())
    ok(url.pathname === '/profile' && url.searchParams.get('from') === '/leads' && url.hash === '#notifications', `Notification settings opens Your profile at Your notifications, with the way back (${url.pathname}${url.search}${url.hash})`)
    ok(await card(d).evaluate((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 }), '…and the card is in view')

    // ── 3 · Muting a reminder leaves the bell's Due list ────────────────────────────────────────────────────────────────────────────────
    console.log('3 · a muted reminder leaves the member’s bell')
    await go(d, '/leads'); await openBell(d)
    const overdue0 = await d.locator('[data-testid="notifications-due"] [data-kind="task_due"]').count()
    await closeBell(d)
    ok(overdue0 > 0, `Dane’s bell lists overdue tasks (${overdue0})`)
    await go(d, '/profile#notifications'); await openChooser(d)
    const areas = await d.getByTestId('notices-list').locator('h3').allInnerTexts()
    ok(areas.length >= 6 && /^leads$/i.test(areas[0] || ''), `What reaches you: the notices by area (${areas.join(' · ')})`)
    ok(await d.getByTestId('notice-send_held').count() === 1 && await d.getByTestId('notice-new_lead').count() === 1, 'an Owner’s list holds the Owner’s notices (a large send waiting) and the runners’ (a new lead)')
    await flip(d, 'task_due')
    ok(JSON.stringify(mutedOf('dane')) === '["task_due"]' && /Muted for you: A task is overdue/.test(await snackText(d)), 'switched off: kept on Dane alone, and said')
    ok(await d.getByTestId('notice-task_due').locator('input').first().isChecked() === false, '…its switch reads off')
    await shot(d, '03-what-reaches-you-1440')
    await done(d)
    ok(/^1 muted: A task is overdue\.$/.test(await text(d.getByTestId('notices-muted-line'))), 'the card says what is muted, in one sentence')
    await go(d, '/leads'); await openBell(d)
    ok(await d.locator('[data-testid="notifications-due"] [data-kind="task_due"]').count() === 0, 'Dane’s bell no longer lists his overdue tasks')
    await closeBell(d)
    ok(n(`select count(*) from members where notice_muted is not null`) === 1, 'the mute is Dane’s alone — no one else’s list changed')
    await go(d, '/profile#notifications'); await openChooser(d); await flip(d, 'task_due'); await done(d)
    ok(mutedOf('dane').length === 0 && /reaches you again/.test(await snackText(d)), 'switched back on: nothing muted')
    await go(d, '/leads'); await openBell(d)
    ok(await d.locator('[data-testid="notifications-due"] [data-kind="task_due"]').count() === overdue0, '…and the overdue tasks are back in his bell')
    await closeBell(d)

    // ── 4 · Who sees which notices; the studio's own switch says so ─────────────────────────────────────────────────────────────────────
    console.log('4 · only the notices that can reach you')
    as('sarah')
    const S = await desk(); const s = await page(S, 'sarah')
    await go(s, '/profile#notifications'); await openChooser(s)
    ok(await s.getByTestId('notice-send_held').count() === 0 && await s.getByTestId('notice-new_lead').count() === 0 && await s.getByTestId('notice-credits_low').count() === 0, 'a Designer’s list leaves out the Owners’ and Admins’ notices')
    ok(await s.getByTestId('notice-task_comment').count() === 1 && await s.getByTestId('notice-assigned').count() === 1, '…and keeps hers (a comment on a task, a lead assigned to her)')
    await s.keyboard.press('Escape'); await settle(s, 300)
    as('priya')
    { const P = await desk(); const p = await page(P, 'priya'); await go(p, '/profile#notifications')
      ok(await p.getByTestId('notices-studio-link').count() === 0 && /its Owners and Admins set it/.test(await text(card(p))), 'Accounting’s card names no page they can’t open (their Settings are Finance alone)')
      await openChooser(p)
      ok(await p.getByTestId('notice-invoice_sent').count() === 1 && await p.getByTestId('notice-assigned').count() === 0 && await p.getByTestId('notice-task_assigned').count() === 1, 'Accounting’s list: the money notices and their own tasks — never a lead’s')
      await P.close() }
    /* the studio switches a notice off → it shows off for her, saying why */
    sql(`insert into settings (key, value, updated_at) values ('notification_rules', '{"channels":{"render_feedback":{"in_app":false}}}', strftime('%s','now')) on conflict(key) do update set value = json_set(coalesce(value,'{}'), '$.channels.render_feedback', json('{"in_app":false,"email":false,"whatsapp":true}'))`)
    as('sarah'); await go(s, '/profile#notifications'); await openChooser(s)
    const off = s.getByTestId('notice-render_feedback')
    ok(/Off for the whole studio/.test(await text(off)) && await off.locator('input').first().isDisabled(), 'a notice the studio has off reads “Off for the whole studio” — its switch can’t move')
    await s.keyboard.press('Escape'); await settle(s, 300)
    sql(`update settings set value = json_remove(value, '$.channels.render_feedback') where key = 'notification_rules'`)

    // ── 5 · A personal mute keeps a notice from one member — notify's own path ──────────────────────────────────────────────────────────
    console.log('5 · a muted notice never reaches the member who muted it')
    /* the studio sends comments by email too (Settings › Notifications, as Dane) — so a summary member's email can be seen to wait */
    as('dane'); await go(d, '/settings?section=notifications')
    await d.getByTestId('event-task_comment').locator('[data-label="Email"] label').first().click(); await settle(d, 1300)
    ok(sql(`select json_extract(value, '$.channels.task_comment.email') from settings where key = 'notification_rules'`) === '1', 'Settings › Notifications: comments go by email too (the studio’s switch)')
    ok(/\/profile/.test(await d.getByTestId('events-personal-link').getAttribute('href') || '') && /mute one for themselves, or take their emails as one daily summary, on Your profile/.test(await text(d.getByTestId('notification-channels'))), '…and its table says each member mutes for themselves on Your profile (a link)')
    await comment(d, 'Probe S18 one')
    const n1 = sql(`select id from notifications where kind = 'task_comment' and member_id = 'sarah' and body like '%Probe S18 one%'`)
    ok(!!n1 && n(`select count(*) from notification_outbox where key = 'n:${n1}:email' and member_id = 'sarah'`) === 1, 'Sarah hears Dane’s comment — in her bell and by email, as it happens')
    as('sarah'); await go(s, '/profile#notifications'); await openChooser(s); await flip(s, 'task_comment'); await done(s)
    ok(JSON.stringify(mutedOf('sarah')) === '["task_comment"]', 'Sarah mutes comments on tasks, for herself')
    as('dane'); await comment(d, 'Probe S18 two')
    ok(heard('sarah', 'Probe S18 two') === 0 && n(`select count(*) from notification_outbox where member_id = 'sarah' and body like '%Probe S18 two%'`) === 0, 'Dane comments again: no bell row for Sarah, so no email either')
    as('sarah'); await go(s, '/profile#notifications'); await openChooser(s); await flip(s, 'task_comment'); await done(s)
    as('dane'); await comment(d, 'Probe S18 three')
    ok(mutedOf('sarah').length === 0 && heard('sarah', 'Probe S18 three') === 1, 'unmuted, the next comment reaches her again')

    // ── 6 · The daily summary ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · a daily summary instead of one email at a time')
    as('sarah'); await go(s, '/profile#notifications')
    await s.getByRole('radio', { name: 'A daily summary' }).click(); await settle(s, 1600)
    ok(sql(`select notice_email from members where id = 'sarah'`) === 'daily' && n(`select count(*) from members where id = 'sarah' and notice_email_at is not null`) === 1, 'A daily summary: kept on Sarah, with when she chose it')
    ok(/One email at 8 AM/.test(await text(s.getByTestId('notices-email-help'))) && new RegExp(`Your first summary goes ${AFTER8 ? 'tomorrow' : 'today'} at 8 AM`).test(await text(s.getByTestId('notices-last-summary'))), `…its line says when the first one goes (${AFTER8 ? 'tomorrow — she chose it after 8' : 'today at 8'})`)
    ok(/Your emails come as one summary/.test(await snackText(s)), '…and the snackbar says so')
    await shot(s, '06-daily-summary-1440')
    as('dane'); await comment(d, 'Probe S18 four')
    const n4 = sql(`select id from notifications where kind = 'task_comment' and member_id = 'sarah' and body like '%Probe S18 four%'`)
    ok(!!n4 && n(`select count(*) from notification_outbox where key = 'n:${n4}:email'`) === 0, 'Dane comments: Sarah’s bell has it, her email waits for the summary')
    /* the bell's read from 8 AM sends the summaries due — never Sarah's, who chose it after this morning's 8 */
    await go(d, '/leads'); await openBell(d); await closeBell(d)
    ok(n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah'`) === 0, 'no summary for Sarah today — her first goes at the next 8 AM after her choice')
    as('sarah'); await go(s, '/profile#notifications')
    await s.getByTestId('notices-send-now').click(); await settle(s, 1800)
    const sum = json(`select * from notification_outbox where event = 'daily_summary' and member_id = 'sarah' order by created_at desc limit 1`)[0]
    ok(!!sum && sum.channel === 'email' && sum.status === 'sent' && sum.key === `s:sarah:${DAY}` && sum.to_address === 'sarah@demostudio.sg', 'Send one now: her summary goes through the delivery layer — an email to her, today’s')
    ok(!!sum && /^Your summary from Demo Studio — /.test(sum.subject) && /Hi Sarah,/.test(sum.body) && /Probe S18 four/.test(sum.body) && /Probe S18 one|Probe S18 three/.test(sum.body), '…it carries the comment whose email waited, and her other unread notices')
    ok(/Your summary went to sarah@demostudio\.sg/.test(await snackText(s)), '…and the snackbar says where it went')
    /* every line of it is one of her bell's rows — never a second list */
    const bullets = (sum?.body || '').split('\n').filter((l) => l.startsWith('• ')).map((l) => l.slice(2))
    await go(s, '/leads'); await openBell(s)
    const bellTitles = (await s.locator('[data-testid="notification-row"] [class*="title"]').allInnerTexts()).map((t) => t.trim())
    const rowOf = async (w) => text(s.locator('[data-testid="notification-row"]', { hasText: w }))
    const four = await rowOf('Probe S18 four'), one = await rowOf('Probe S18 one')
    ok(/in your daily summary/.test(four) && !/also by email/.test(four) && /also by email/.test(one), 'her bell says which email waited for the summary (“in your daily summary”) and which went as it happened (“also by email”)')
    await closeBell(s)
    ok(bullets.length > 0 && bullets.every((l) => bellTitles.some((t) => t && l.startsWith(t))), `every line of the summary is a row of her bell (${bullets.length} lines)`)
    await go(s, '/profile#notifications')
    ok(/Last one .* — .*\. The next goes (tomorrow|today) at 8 AM\./.test(await text(s.getByTestId('notices-last-summary'))), 'the card: when the last one went and what it held, and when the next goes')
    await s.getByTestId('notices-read-summary').click(); await settle(s, 700)
    const read = s.getByRole('dialog', { name: 'Your summary' })
    ok(await read.count() === 1 && /Hi Sarah,/.test(await text(read.getByTestId('sent-detail'))) && /sarah@demostudio\.sg/.test(await text(read)), 'Read it opens the summary as Sarah reads it')
    await shot(s, '06-read-summary-1440')
    await s.keyboard.press('Escape'); await settle(s, 300)
    /* sent again at once: only what came in since the last one (and what is due) — nothing new and nothing due, no email */
    const hadDue = /\nDue \(\d+\)/.test(sum?.body || '')
    await s.getByTestId('notices-send-now').click(); await settle(s, 1600)
    ok(hadDue ? n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah'`) === 2 : /Nothing to sum up/.test(await snackText(s)) && n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah'`) === 1, hadDue ? 'sent again at once: her Due list again' : 'sent again at once: “Nothing to sum up” — no email when nothing came in since and nothing is due')
    as('dane'); await comment(d, 'Probe S18 five')
    as('sarah'); await go(s, '/profile#notifications')
    const before2 = n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah'`)
    await s.getByTestId('notices-send-now').click(); await settle(s, 1600)
    const sum2 = json(`select * from notification_outbox where event = 'daily_summary' and member_id = 'sarah' order by created_at desc, rowid desc limit 1`)[0]
    ok(n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah'`) === before2 + 1 && n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'sarah' and key = 's:sarah:${DAY}'`) === 1 && sum2?.key !== `s:sarah:${DAY}`, 'a new comment, sent again the same day: another summary — today’s own kept once')
    ok(!!sum2 && /Probe S18 five/.test(sum2.body) && !/Probe S18 four/.test(sum2.body) && /since /.test(sum2.body), '…carrying only what came in since the last one')
    /* the 8 AM one — Hui Min chose it yesterday */
    sql(`update members set notice_email = 'daily', notice_email_at = strftime('%s','now','-1 day') - ${Math.floor(Math.random() * 500)} where id = 'huimin'`)
    as('dane'); await go(d, '/leads'); await openBell(d); await closeBell(d); await openBell(d); await closeBell(d)
    const hm = n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'huimin' and key = 's:huimin:${DAY}'`)
    ok(AFTER8 ? hm === 1 : hm === 0, AFTER8 ? 'from 8 AM, the first read (Dane’s bell) sends Hui Min’s summary — she chose it yesterday — once, however often the bell opens' : 'before 8 AM no summary goes')
    ok(n(`select count(*) from notification_outbox where event = 'daily_summary' and member_id = 'dane'`) === 0, 'Dane takes no summary, and gets none')

    // ── 7 · Sent messages lists the summaries ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Sent messages')
    await go(d, '/settings?section=notifications#sent-messages'); await settle(d, 1200)
    const rows = d.locator('[data-testid="sent-row"][data-event="daily_summary"]')
    ok(await rows.count() >= 2 && /Your notifications · A daily summary/.test(await text(rows.first())), 'Sent messages lists the summaries, named for what they are')
    await rows.first().locator('button').first().click(); await settle(d, 600)
    ok(/Your summary from Demo Studio/.test(await text(d.getByTestId('sent-detail'))), '…a row opens as it went out')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await shot(d, '07-sent-messages-1440')
    as('sarah'); await go(s, '/settings?section=notifications#sent-messages'); await settle(s, 1200)
    ok(await s.locator('[data-testid="sent-row"][data-event="daily_summary"]').count() >= 2 && await s.locator('[data-testid="sent-row"]').evaluateAll((rs) => rs.every((r) => !/Hui Min/.test(r.textContent || ''))), 'Sarah reads her own summaries there — never Hui Min’s')

    // ── 8 · Maison AI: what did I miss? ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Maison AI answers “What did I miss?” from the same rows')
    as('dane'); await go(d, '/leads')
    await d.locator('button[aria-label="Maison AI"]').last().click(); await settle(d, 700)
    const box = sheet(d).locator('[data-testid="maison-ask"] input'); await box.fill('What did I miss today?'); await box.press('Enter')
    await d.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
    await settle(d, 400)
    const ans = await text(sheet(d).locator('[data-testid="maison-answer"]'))
    ok(/(\d+ notices?|\d+ due)/.test(ans) && /Your notifications/.test(ans), `the answer counts the unread notices and what is due, with the way to Your notifications (“${ans.slice(0, 80)}…”)`)
    await shot(d, '08-maison-missed-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 9 · ⌘K, the ghost, phones ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · ⌘K, the ghost, phones')
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 500)
    await d.keyboard.type('daily summary', { delay: 20 }); await settle(d, 1000)
    ok(/Your notifications/.test(await d.locator('body').innerText()), '⌘K “daily summary” finds Your notifications')
    await d.keyboard.press('Escape'); await settle(d, 300)
    /* the reveal's ghost (first paint faked, as the ghosts probes hold it) draws the card where the page does */
    {
      const G = await desk()
      await G.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const g = await page(G, 'ghost'); await g.goto(BASE + '/profile', { waitUntil: 'load' }); await settle(g, 1600)
      const boxes = (sel) => g.$$eval(sel, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] }))
      const ghost = await boxes('[aria-label="Loading your profile"] section')
      await G.close()
      const P2 = await desk(); const p2 = await page(P2, 'page'); await p2.goto(BASE + '/profile', { waitUntil: 'load' }); await settle(p2, 2200)
      const real = await p2.$$eval('[data-testid="your-profile"] section', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] }))
      await P2.close()
      const last = (a) => a[a.length - 1] || [0, 0, 0, 0]
      const dy = Math.abs(last(ghost)[1] - last(real)[1]), dh = Math.abs(last(ghost)[3] - last(real)[3])
      ok(ghost.length === real.length && dy <= 4 && dh <= 4, `the ghost draws Your notifications where the page does (${ghost.length}/${real.length} cards · Δy ${dy} Δh ${dh})`)
    }
    for (const [w, h] of [[390, 844], [320, 640]]) {
      as('sarah')
      const C = await phoneCtx(w, h); const p = await page(C, `phone-${w}`)
      await go(p, '/profile#notifications')
      ok(await sideways(p) <= 0, `${w}: Your profile has no sideways scroll`)
      if (w === 390) await shot(p, '09-your-notifications-390')
      await openChooser(p)
      ok(await sideways(p) <= 0 && await p.getByTestId('notices-done').isVisible(), `${w}: What reaches you rises as a sheet, Done in reach`)
      if (w === 390) await shot(p, '09-what-reaches-you-390')
      await p.getByTestId('notices-done').click(); await settle(p, 400)
      await go(p, '/settings?section=notifications')
      ok(await sideways(p) <= 0, `${w}: Settings › Notifications has no sideways scroll`)
      if (w === 390) {
        /* a Designer reads the studio's rules (read-only) — the way to her own choices still opens */
        await p.getByTestId('events-personal-link').click(); await p.waitForURL(/\/profile/); await settle(p, 1200)
        ok(new URL(p.url()).hash === '#notifications' && await card(p).count() === 1, `${w}: from the read-only Settings › Notifications, “Your profile” opens Sarah’s own choices`)
      }
      await go(p, '/leads')
      await p.locator('button[aria-label^="Notifications"]:visible').first().click(); await settle(p, 1400)
      ok(await p.getByTestId('notifications-settings-link').isVisible(), `${w}: the bell’s sheet has Notification settings`)
      if (w === 390) await shot(p, '09-bell-390')
      await C.close()
    }
    await D.close(); await S.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing to put back'}`)
    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})().catch((e) => { console.error(e); process.exit(1) })
