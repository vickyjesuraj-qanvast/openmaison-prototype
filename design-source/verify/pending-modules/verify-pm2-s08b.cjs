// Pending modules, step S08b (inserted by the orchestrator, 2026-10-11 — S19's "the demo credits month riding the demo day on restore",
// moved forward, and the server-side lock leak S08 found). Each item asserted as the rule it builds, never another round's count:
//  1 the demo's AI credits month holds today: this month and last month both carry their AI work, nothing in the story is after now, the
//    balance is its ledger's sum, every invoice is numbered by the month it was issued
//  2 the first pages (Leads, Company › Plan & AI credits, Plan & billing) write nothing to the credits story — no month roll, no bell row
//  3 Company › Plan & AI credits reads mid-month at 1440 and 390: what was used (at the top-up price), Pro render · High this month, Render ·
//    Fast and Kevin Ng last month; no sideways scroll at 390 / 320 (against screen.width)
//  4 repair R111 on a copy whose month has ended: the whole story moves by whole days to sit 18 days into its month (R63's day), its shape
//    kept (every stamp moved by the same days, the balance and the buckets as they were), the AI work the charges paid for rides with them
//    (S19 — it was "the renders keep their own day"), nothing else in the database moves; run again, nothing changes
//    (S42 audit A-03: a restore now moves every moment of the demo by the same days — §6 asserts it for the renders)
//  5 R111's guard: a month that ended on a plan that is not the demo's (a studio's own) is left for the app — nothing moves
//  6 restoreBaseline({ now }): the same day restores the credits as snapshotted; 40 days later every stamp of the story rides 40 days, as
//    open tasks do, the month holds that day, invoices follow their month; a snapshot whose own month had ended re-anchors like R111
//  7 the lock harness: a sqlite3 process holds the file while the server writes — an autocommit write and a page's transaction wait for a
//    short write lock, a page's COMMIT waits for a reader, a lock held past the server's wait fails that one write cleanly; after each, the
//    server's writes land and a sqlite3 write gets the file within 3 s (before S08b: 6 of these 12 failed — the server kept the lock)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. What it changes on that DB is put back at the end;
// the repair and restore checks run on copies beside it (removed after).
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s08b.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { execSync, spawn } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s08b')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const TZ = 'Asia/Kolkata'   // the demo's day (scripts/repair-demo-data.ts runs IST; the owner's machine does)
const DAY = 86400
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sqlOn = (db, q) => execSync(`sqlite3 -cmd ".timeout 30000" "${db}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const jsonOn = (db, q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${db}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sql = (q) => sqlOn(DB, q)
const sqlFile = (db, text) => { const f = path.join(os.tmpdir(), `pm2-s08b-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${db}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const nowS = () => Math.floor(Date.now() / 1000)
const dayOf = (sec) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(sec * 1000))
const monthOf = (sec) => dayOf(sec).slice(0, 7).replace('-', '')
const daysBetween = (a, b) => Math.round((Date.parse(dayOf(b)) - Date.parse(dayOf(a))) / 86400000)
/* one month back, keeping the day (lib/credits/ledger.ts addMonths, in the demo's zone — the repair's) */
const monthBack = (sec) => { const d = new Date(sec * 1000), t = new Date(d.getFullYear(), d.getMonth() - 1, 1, d.getHours(), d.getMinutes(), d.getSeconds()); t.setDate(Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return Math.floor(t.getTime() / 1000) }

/* the credits story's stamps (lib/credits/demo-month.ts DEMO_CREDIT_TIMES) */
const BELL = ['credits_low', 'credits_out', 'credit_request', 'credit_request_answered', 'credit_amount_reached', 'credits_renewed', 'payment_failed', 'credit_receipt']
const STORY = [
  { table: 'subscriptions', key: 'id', times: ['current_period_start', 'current_period_end', 'trial_ends_at', 'cancelled_at', 'grace_until', 'created_at', 'updated_at'] },
  { table: 'studio_credit_balances', key: 'id', times: ['period_start', 'period_end', 'enforcement_starts_at', 'updated_at'] },
  { table: 'credit_ledger', key: 'id', times: ['created_at'] },
  { table: 'studio_member_credit_caps', key: 'member_id', times: ['updated_at'] },
  { table: 'billing_checkout_sessions', key: 'id', times: ['created_at', 'completed_at'] },
  { table: 'invoices', key: 'id', times: ['billing_period_start', 'billing_period_end', 'issued_at', 'paid_at'] },
  { table: 'credit_requests', key: 'id', times: ['created_at', 'answered_at'] },
  { table: 'notifications', key: 'id', times: ['created_at', 'read_at'], where: `kind IN (${BELL.map((k) => `'${k}'`).join(',')})` },
  { table: 'notification_outbox', key: 'id', times: ['created_at', 'send_after', 'next_try_at'], where: `event IN (${BELL.map((k) => `'${k}'`).join(',')})` },
]
const storyOf = (db) => Object.fromEntries(STORY.map((t) => [t.table, jsonOn(db, `SELECT * FROM ${t.table}${t.where ? ` WHERE ${t.where}` : ''} ORDER BY ${t.key}`)]))
const monthOn = (db) => jsonOn(db, `SELECT period_start AS s, period_end AS e, plan_credits AS plan, topup_credits AS topup FROM studio_credit_balances WHERE id = 'studio'`)[0]
const hashOn = (db, t) => crypto.createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${db}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
/* the repair re-stamps the three seeded quote templates' "used n days ago" relative to its run, every run, by design (its R-block at
   `last_used_at is re-stamped RELATIVE to the run`) — compared without that column */
const RUN_RELATIVE = { quote_templates: 'last_used_at' }
const repairHash = (db, t) => (RUN_RELATIVE[t] ? crypto.createHash('sha1').update(JSON.stringify(jsonOn(db, `select * from "${t}" order by rowid`).map((r) => ({ ...r, [RUN_RELATIVE[t]]: null })))).digest('hex') : hashOn(db, t))
const tablesOn = (db) => sqlOn(db, `select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
/* the story's own rules, on any database */
function storyRules(db, tag) {
  const m = monthOn(db), t = nowS()
  ok(m && m.s <= t && m.e > t, `${tag}: the credits month holds today (${dayOf(m?.s ?? 0)} → ${dayOf(m?.e ?? 0)})`)
  const spends = (from, to) => Number(sqlOn(db, `SELECT count(*) FROM credit_ledger WHERE reason = 'spend' AND created_at >= ${from} AND created_at < ${to}`))
  ok(spends(m.s, m.e) > 0 && spends(monthBack(m.s), m.s) > 0, `${tag}: this month and last month both carry AI work (${spends(m.s, m.e)} · ${spends(monthBack(m.s), m.s)} charges)`)
  ok(Number(sqlOn(db, `SELECT count(*) FROM credit_ledger WHERE created_at > ${t + 60}`)) === 0, `${tag}: nothing in the credits story is after now`)
  ok(Number(sqlOn(db, `SELECT coalesce(sum(credits), 0) FROM credit_ledger WHERE reason <> 'shadow_spend'`)) === m.plan + m.topup, `${tag}: the balance is its ledger’s sum (${m.plan} + ${m.topup})`)
  const inv = jsonOn(db, `SELECT invoice_number AS n, issued_at AS at FROM invoices`)
  ok(inv.length > 0 && inv.every((r) => !/^INV-\d{6}-/.test(r.n) || r.n.slice(4, 10) === monthOf(r.at)), `${tag}: every invoice is numbered by the month it was issued (${inv.map((r) => r.n).join(' · ')})`)
  ok(jsonOn(db, `SELECT ref_id AS r, created_at AS at FROM credit_ledger WHERE action_key = 'plan_allowance' AND ref_id LIKE 'period:%'`).every((r) => r.r === `period:${r.at}`), `${tag}: a month’s refresh names its own boundary`)
}

/* restoreBaseline / the snapshot, through the repo's own code (tsx), on a copy */
const HELPER = path.join(os.tmpdir(), `pm2-s08b-helper-${process.pid}.mts`)
fs.writeFileSync(HELPER, `
const [mode, a, b] = process.argv.slice(2)
const repo = process.env.REPO!
const { BASELINE_TABLES, restoreBaseline } = await import(repo + '/lib/db/baseline.ts')
const { client } = await import(repo + '/lib/db/index.ts')
const { writeFile } = await import('node:fs/promises')
if (mode === 'snap') {
  const out: Record<string, unknown> = { takenAt: new Date().toISOString(), demoDay: b }
  for (const t of BASELINE_TABLES) { const r = await client.execute('SELECT * FROM ' + t); out[t] = r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i] === undefined ? null : row[i]]))) }
  await writeFile(a!, JSON.stringify(out))
  console.log(JSON.stringify({ ok: true }))
} else console.log(JSON.stringify(await restoreBaseline({ file: a, now: new Date(b!) })))
process.exit(0)
`)
const tsx = (db, ...args) => JSON.parse(execSync(`DATABASE_URL=file:${db} REPO="${REPO}" "${REPO}/node_modules/.bin/tsx" "${HELPER}" ${args.map((x) => JSON.stringify(x)).join(' ')}`, { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString().trim().split('\n').pop())
const repair = (db) => { if (/local\.db$/.test(db)) throw new Error('never local.db'); return execSync(`DATABASE_URL=file:${db} npm run db:repair 2>&1`, { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString() }
const copies = []
const copy = (name) => { const f = path.join(path.dirname(DB), `s08b-${process.pid}-${name}.db`); fs.copyFileSync(DB, f); copies.push(f); return f }
/* (pending modules, a deliberate change of this rule — S19: the AI work the credits story paid for rides with its charges, so an old base's
   work is as old as its charges) the designs whose renders the ledger charged, and what is dated inside them — lib/credits/demo-month.ts
   `paidWorkIds`, in SQL */
const PAID_DESIGNS = `(SELECT DISTINCT r.design_id FROM credit_ledger l JOIN render_jobs j ON l.ref_id = 'render:' || j.id JOIN project_rooms r ON r.id = j.room_id WHERE l.reason = 'spend')`
const PAID_ROOMS = `(SELECT id FROM project_rooms WHERE design_id IN ${PAID_DESIGNS})`
const PAID_JOBS = `(SELECT id FROM render_jobs WHERE room_id IN ${PAID_ROOMS})`
const PAID_LINKS = `(SELECT id FROM render_share_links WHERE design_id IN ${PAID_DESIGNS})`
const PAID = [
  { table: 'visualizer_designs', times: ['created_at', 'updated_at', 'deleted_at'], where: `id IN ${PAID_DESIGNS}` },
  { table: 'project_rooms', times: ['created_at', 'updated_at', 'deleted_at'], where: `design_id IN ${PAID_DESIGNS}` },
  { table: 'render_jobs', times: ['created_at', 'completed_at'], where: `room_id IN ${PAID_ROOMS}` },
  { table: 'render_annotations', times: ['created_at', 'updated_at', 'deleted_at'], where: `job_id IN ${PAID_JOBS}` },
  { table: 'render_share_links', times: ['created_at', 'last_viewed_at', 'revoked_at', 'expires_at'], where: `design_id IN ${PAID_DESIGNS}` },
  { table: 'render_consultation_requests', times: ['created_at'], where: `share_link_id IN ${PAID_LINKS}` },
  { table: 'lead_files', times: ['created_at', 'updated_at', 'deleted_at', 'shown_to_client_at'], where: `id IN (SELECT file_id FROM lead_file_renders WHERE design_id IN ${PAID_DESIGNS})` },
  { table: 'notifications', times: ['created_at', 'read_at'], where: `kind = 'render_feedback' AND EXISTS (SELECT 1 FROM ${PAID_DESIGNS} p WHERE instr(href, '/visualizer/' || p.design_id) > 0)` },
]
/* every charged render sits on its charge's time */
const rendersOnCharges = (db) => jsonOn(db, `SELECT abs(l.created_at - j.created_at) AS gap FROM credit_ledger l JOIN render_jobs j ON l.ref_id = 'render:' || j.id WHERE l.reason = 'spend'`)
/* a month that ended: the whole story moved back by `days` (as an old snapshot or base would be) — with the work it paid for */
const ageStory = (db, days) => {
  let text = 'BEGIN;\n'
  for (const t of STORY) text += `UPDATE ${t.table} SET ${t.times.map((c) => `${c} = ${c} - ${days * DAY}`).join(', ')}${t.where ? ` WHERE ${t.where}` : ''};\n`
  for (const t of PAID) text += `UPDATE ${t.table} SET ${t.times.map((c) => `${c} = ${c} - ${days * DAY}`).join(', ')} WHERE ${t.where};\n`
  text += `UPDATE credit_ledger SET ref_id = 'period:' || (CAST(substr(ref_id, 8) AS INTEGER) - ${days * DAY}) WHERE ref_id GLOB 'period:[0-9]*';\nCOMMIT;\n`
  sqlFile(db, text)
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const you0 = sql(`select id from members where is_you = 1`)
  sql(`update members set is_you = (id = 'dane')`)

  /* what this probe may change on the server's DB, kept as it is now (put back at the end); every other table must not change */
  const TOUCHED = ['studio_credit_balances', 'subscriptions', 'credit_ledger', 'invoices', 'notifications', 'notification_outbox', 'settings', 'project_rooms', 'members']
  const ALL = tablesOn(DB)
  const before = new Map(ALL.map((t) => [t, hashOn(DB, t)]))
  const kept = new Map(TOUCHED.map((t) => [t, jsonOn(DB, `select * from "${t}"`)]))
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    const changed = TOUCHED.filter((t) => hashOn(DB, t) !== before.get(t))
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(DB, text)
    return changed
  }

  try {
    if (want(1)) {
      console.log('1 · the demo’s credits month holds today')
      storyRules(DB, 'the base')
    }

    if (want(2)) {
      console.log('2 · the first pages write nothing to the credits story')
      const s0 = JSON.stringify(storyOf(DB))
      const bells0 = Number(sql(`select count(*) from notifications where kind = 'credits_renewed'`))
      const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
      const p = await page(ctx, 'first pages')
      for (const u of ['/leads', '/company/plan', '/company/plan/billing']) await go(p, u)
      await settle(p, 1500)
      ok(JSON.stringify(storyOf(DB)) === s0, 'Leads · Plan & AI credits · Plan & billing: no month roll, the credits story as it was')
      ok(Number(sql(`select count(*) from notifications where kind = 'credits_renewed'`)) === bells0, 'no “This month’s AI credits are in” bell row')
      await ctx.close()
    }

    if (want(3)) {
      console.log('3 · Company › Plan & AI credits reads mid-month')
      const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
      const p = await page(ctx, 'plan 1440')
      await go(p, '/company/plan')
      await p.getByTestId('plan-usage').waitFor({ timeout: 15000 }); await settle(p)
      ok(/at the top-up price/.test(await text(p.getByTestId('tile-used'))), 'this month: what was used, at the top-up price')
      ok((await text(p.getByTestId('usage-tools'))).includes('Pro render · High'), 'this month: By tool — Pro render · High')
      ok((await p.getByTestId('usage-activity').locator('[role="row"]').count()) > 1, 'this month: Activity has its rows')
      await shot(p, '01-plan-usage-1440', true)
      await p.getByRole('button', { name: /Period: This month/ }).click()
      await p.getByRole('menuitemradio', { name: 'Last month' }).click()
      await p.waitForURL(/range=last/, { timeout: 10000 }); await settle(p)
      ok((await text(p.getByTestId('usage-tools'))).includes('Render · Fast'), 'last month: By tool — Render · Fast')
      ok((await text(p.getByTestId('usage-leads'))).includes('Kevin Ng'), 'last month: By lead — Kevin Ng')
      await shot(p, '02-plan-last-month-1440', true)
      await go(p, '/company/plan/billing')
      await p.getByTestId('plan-billing').waitFor({ timeout: 15000 }); await settle(p)
      const invTxt = await text(p.getByTestId('billing-invoices'))
      const nums = sql(`select invoice_number from invoices order by issued_at`).split('\n').filter(Boolean)
      ok(nums.length > 0 && nums.every((n) => invTxt.includes(n)), `Plan & billing lists the invoices by their numbers (${nums.join(' · ')})`)
      await shot(p, '03-plan-billing-1440', true)
      await ctx.close()
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
        const pp = await page(pc, `plan ${w}`)
        await go(pp, '/company/plan')
        await pp.getByTestId('plan-usage').waitFor({ timeout: 15000 }); await settle(pp)
        ok((await sideways(pp)) <= 0, `${w}: no sideways scroll on Plan & AI credits`)
        if (w === 390) { ok((await text(pp.getByTestId('usage-tools'))).includes('Pro render · High'), '390: this month’s Pro render · High'); await shot(pp, '04-plan-usage-390', true) }
        await pc.close()
      }
    }

    if (want(4)) {
      console.log('4 · repair R111: a month that ended moves, whole, to hold today')
      const db = copy('r111')
      const m0 = monthOn(db)
      const aged = Math.ceil((m0.e - nowS()) / DAY) + 3
      ageStory(db, aged)
      const stale = storyOf(db), mStale = monthOn(db)
      ok(mStale.e <= nowS(), `the copy’s month ended (${dayOf(mStale.s)} → ${dayOf(mStale.e)})`)
      const others = tablesOn(db).filter((t) => !STORY.some((s) => s.table === t) && t !== 'settings')
      /* the paid work's tables are compared without its own rows (they ride, below); every other row of them must not move */
      const restHash = (t) => { const w = PAID.find((x) => x.table === t); return w ? crypto.createHash('sha1').update(JSON.stringify(jsonOn(db, `select * from "${t}" where not (${w.where}) order by rowid`))).digest('hex') : repairHash(db, t) }
      const othersBefore = new Map(others.map((t) => [t, restHash(t)]))
      const paidBefore = jsonOn(db, `SELECT id, created_at FROM render_jobs WHERE room_id IN ${PAID_ROOMS} ORDER BY id`)
      const out = repair(db)
      ok(/R111[^\n]*\n\s+moved \d+ days/.test(out) && /all checks pass/.test(out), `R111 says what it moved: “${(/R111[^\n]*\n\s+(moved [^\n·]*)/.exec(out) || [])[1] || '?'}” · all checks pass`)
      const m1 = monthOn(db), moved = (m1.s - mStale.s) / DAY
      ok(Number.isInteger(moved) && moved > 0, `the story moved by whole days (${moved})`)
      ok(daysBetween(m1.s, nowS()) === 18, `today is 18 days into the month, as R63 made it (${dayOf(m1.s)} → ${dayOf(m1.e)})`)
      const fresh = storyOf(db)
      let same = true
      for (const t of STORY) for (const r of stale[t.table]) {
        const n = fresh[t.table].find((x) => x[t.key] === r[t.key])
        if (!n) { same = false; continue }
        for (const c of t.times) if (r[c] != null && n[c] !== r[c] + moved * DAY) same = false
      }
      ok(same, 'every stamp of the story moved by the same days — its shape kept')
      ok(m1.plan === mStale.plan && m1.topup === mStale.topup, `the buckets as they were (${m1.plan} + ${m1.topup})`)
      storyRules(db, 'after R111')
      /* (pending modules, a deliberate change of this rule — S19) the work rides with its charges: every render the same days, each on its charge */
      const paidAfter = jsonOn(db, `SELECT id, created_at FROM render_jobs WHERE room_id IN ${PAID_ROOMS} ORDER BY id`)
      ok(paidBefore.length > 0 && paidAfter.every((r, i) => r.created_at === paidBefore[i].created_at + moved * DAY) && rendersOnCharges(db).every((r) => r.gap <= 3600), `the AI work rides with its charges — ${paidAfter.length} renders ${moved} days on, each on its charge`)
      const movedToo = others.filter((t) => restHash(t) !== othersBefore.get(t))
      ok(!movedToo.length, `nothing else in the database moved${movedToo.length ? ` — ${movedToo.join(', ')}` : ''}`)
      const all = tablesOn(db), dump1 = new Map(all.map((t) => [t, repairHash(db, t)]))
      const out2 = repair(db)
      const again = all.filter((t) => repairHash(db, t) !== dump1.get(t))
      ok(/R111[^\n]*\n\s+the month holds today/.test(out2) && !again.length, `run again: “the month holds today — nothing to move”, the database unchanged${again.length ? ` — ${again.join(', ')}` : ''}`)
    }

    if (want(5)) {
      console.log('5 · R111’s guard: a studio’s own plan never moves')
      const db = copy('guard')
      const m0 = monthOn(db)
      ageStory(db, Math.ceil((m0.e - nowS()) / DAY) + 3)
      const ended = monthOn(db)
      sqlFile(db, `BEGIN;
UPDATE subscriptions SET cancelled_at = ${ended.s}, status = 'cancelled' WHERE cancelled_at IS NULL;
INSERT INTO subscriptions (id, plan_id, billing_cycle, status, seats, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, cancelled_at, grace_until, created_by, created_at, updated_at)
  VALUES ('probe-own-plan', 'pro_studio', 'monthly', 'active', 7, ${ended.s}, ${ended.e}, NULL, 0, NULL, NULL, 'dane', ${ended.s}, ${ended.s});
INSERT INTO invoices (id, subscription_id, invoice_number, plan_name, amount, currency, billing_period_start, billing_period_end, status, issued_at, paid_at)
  VALUES ('probe-own-invoice', 'probe-own-plan', 'INV-${monthOf(ended.s)}-0099', 'Pro — Studio · 7 seats', 24000, 'SGD', ${ended.s}, ${ended.e}, 'paid', ${ended.s}, ${ended.s});
COMMIT;\n`)
      const s0 = JSON.stringify(storyOf(db))
      const out = repair(db)
      ok(/R111[^\n]*\n\s+the month ended on a plan that is not the demo’s/.test(out), 'R111: “the month ended on a plan that is not the demo’s — the app rolls it on its next read”')
      ok(JSON.stringify(storyOf(db)) === s0 && /all checks pass/.test(out), 'nothing in the story moved; all checks pass')
    }

    if (want(6)) {
      console.log('6 · restoreBaseline: the credits ride the demo day')
      const src = copy('snapsrc'), fixture = path.join(os.tmpdir(), `pm2-s08b-fixture-${process.pid}.json`), staleFix = fixture.replace('.json', '-stale.json')
      const today = dayOf(nowS())
      tsx(src, 'snap', fixture, today)
      const fx = JSON.parse(fs.readFileSync(fixture, 'utf8'))
      const fxStory = Object.fromEntries(STORY.map((t) => [t.table, t.where ? fx[t.table].filter((r) => (t.table === 'notifications' ? BELL.includes(r.kind) : BELL.includes(r.event))) : fx[t.table]]))
      const keyed = (t, rows) => [...rows].sort((x, y) => (String(x[t.key]) < String(y[t.key]) ? -1 : String(x[t.key]) > String(y[t.key]) ? 1 : 0))   // byte order, as SQLite's ORDER BY
      const db = copy('restore')
      // the same day
      const r0 = tsx(db, 'restore', fixture, `${today}T12:00:00+05:30`)
      ok(r0.shiftedDays === 0 && r0.creditDays === 0, `the same day: nothing shifts (tasks ${r0.shiftedDays} · credits ${r0.creditDays})`)
      const got0 = storyOf(db)
      ok(STORY.every((t) => JSON.stringify(keyed(t, got0[t.table])) === JSON.stringify(keyed(t, fxStory[t.table]))), 'the credits story restores exactly as snapshotted')
      storyRules(db, 'restored the same day')
      // 40 days later
      const later = new Date(Date.parse(`${today}T12:00:00+05:30`) + 40 * DAY * 1000)
      const openTask = fx.lead_tasks.find((t) => t.done === 0 && t.due_at != null)
      const r40 = tsx(db, 'restore', fixture, later.toISOString())
      ok(r40.shiftedDays === 40 && r40.creditDays === 40, `40 days later: open tasks and the credits both ride 40 days (${r40.shiftedDays} · ${r40.creditDays})`)
      const got40 = storyOf(db)
      let rides = true
      for (const t of STORY) for (const r of fxStory[t.table]) {
        const n = got40[t.table].find((x) => x[t.key] === r[t.key])
        if (!n) { rides = false; continue }
        for (const c of t.times) if (r[c] != null && n[c] !== r[c] + 40 * DAY) rides = false
      }
      ok(rides, 'every stamp of the story is 40 days on')
      const m40 = monthOn(db), at40 = Math.floor(later.getTime() / 1000)
      ok(m40.s <= at40 && m40.e > at40, `the month holds that day (${dayOf(m40.s)} → ${dayOf(m40.e)})`)
      const inv40 = jsonOn(db, `SELECT invoice_number AS n, issued_at AS at FROM invoices`)
      ok(inv40.every((r) => r.n.slice(4, 10) === monthOf(r.at)), `the invoices follow their month (${inv40.map((r) => r.n).join(' · ')})`)
      ok(!openTask || Number(sqlOn(db, `SELECT due_at FROM lead_tasks WHERE id = '${openTask.id}'`)) === openTask.due_at + 40 * DAY, 'an open task rides the same 40 days (REG-341)')
      /* (pending modules, a deliberate change of this rule — S19) the renders the story charged ride its 40 days; (S42 audit A-03, a deliberate
         change of this rule) every other render rides the same 40 days now — the whole demo rides the demo day (lib/db/demo-day.ts) */
      const paidIds = new Set(jsonOn(db, `SELECT id FROM render_jobs WHERE room_id IN ${PAID_ROOMS}`).map((r) => r.id))
      const got = new Map(jsonOn(db, `SELECT id, created_at FROM render_jobs`).map((r) => [r.id, r.created_at]))
      ok(got.size === fx.render_jobs.length && paidIds.size > 0 && fx.render_jobs.every((r) => got.get(r.id) === r.created_at + 40 * DAY) && rendersOnCharges(db).every((r) => r.gap <= 3600), `the AI work rides with its charges — every render 40 days on (${paidIds.size} paid), each on its charge`)
      // a snapshot whose own month had ended by its demo day
      const fxm = fx.studio_credit_balances.find((r) => r.id === 'studio')
      const staleDay = dayOf(fxm.period_end + 3 * DAY)
      fs.writeFileSync(staleFix, JSON.stringify({ ...fx, demoDay: staleDay }))
      const rs = tsx(db, 'restore', staleFix, `${staleDay}T12:00:00+05:30`)
      const ms = monthOn(db), atS = Math.floor(Date.parse(`${staleDay}T12:00:00+05:30`) / 1000)
      ok(rs.shiftedDays === 0 && rs.creditDays > 0 && ms.s <= atS && ms.e > atS && daysBetween(ms.s, atS) === 18, `a snapshot whose month had ended: re-anchored ${rs.creditDays} days, 18 days into its month (${dayOf(ms.s)} → ${dayOf(ms.e)})`)
      for (const f of [fixture, staleFix]) fs.rmSync(f, { force: true })
    }

    if (want(7)) {
      console.log('7 · the lock harness: no write collision leaves the server holding the file')
      const ROOM = sql(`select id from project_rooms order by id limit 1`)
      const cliWrite = () => { try { execSync(`sqlite3 -cmd ".timeout 3000" "${DB}" "UPDATE settings SET updated_at = updated_at WHERE key = 'brand'"`, { stdio: 'pipe' }); return true } catch { return false } }
      const hold = (lines) => { const p = spawn('sqlite3', ['-cmd', '.timeout 5000', DB], { stdio: ['pipe', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', (d) => (err += d)); p.stdin.write(lines.join('\n') + '\n'); p.stdin.end(); return new Promise((r) => p.on('exit', (code) => r({ code, err }))) }
      const rev = () => Number(sql(`SELECT state_rev FROM project_rooms WHERE id = '${ROOM}'`))
      const save = async () => { const t = Date.now(); try { const r = await fetch(`${BASE}/visualizer/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ roomId: ROOM }) }); await r.text(); return { status: r.status, ms: Date.now() - t } } catch { return { status: 0, ms: Date.now() - t } } }
      const get = async (u) => { const t = Date.now(); try { const r = await fetch(`${BASE}${u}`); await r.text(); return { status: r.status, ms: Date.now() - t } } catch { return { status: 0, ms: Date.now() - t } } }
      const stale = () => sql(`UPDATE studio_credit_balances SET period_start = strftime('%s','now') - 31*86400, period_end = strftime('%s','now') - 3600; UPDATE subscriptions SET current_period_start = strftime('%s','now') - 31*86400, current_period_end = strftime('%s','now') - 3600 WHERE cancelled_at IS NULL`)
      const rolled = () => sql(`SELECT period_end > strftime('%s','now') FROM studio_credit_balances WHERE id = 'studio'`) === '1'
      const WRITE = ['BEGIN IMMEDIATE;', "UPDATE settings SET updated_at = updated_at WHERE key = 'brand';"]

      let r0 = rev(), h = hold([...WRITE, '.shell sleep 1.5', 'COMMIT;'])
      await sleep(300); let s = await save(); await h
      ok(s.status === 200 && rev() === r0 + 1, `an autocommit write meets a 1.5 s write lock: it waits (${s.ms} ms) and lands`)
      r0 = rev(); s = await save()
      ok(s.status === 200 && rev() === r0 + 1, '… and the next write lands too (the connection was not left half-way)')
      ok(cliWrite(), '… a sqlite3 write after it gets the file within 3 s')

      stale(); h = hold([...WRITE, '.shell sleep 1.5', 'COMMIT;'])
      await sleep(300); let g = await get('/company/plan'); await h
      ok(g.status === 200 && rolled(), `a page’s transaction (the month roll) meets a 1.5 s write lock: it waits (${g.ms} ms) and commits`)
      ok(cliWrite(), '… a sqlite3 write after it gets the file within 3 s')

      stale(); h = hold(['BEGIN;', 'SELECT count(*) FROM leads;', '.shell sleep 1.5', 'COMMIT;'])
      await sleep(300); g = await get('/company/plan'); await h
      ok(g.status === 200 && rolled(), `a page’s COMMIT meets a 1.5 s reader: it waits (${g.ms} ms) and lands`)
      ok(cliWrite(), '… a sqlite3 write after it gets the file within 3 s')

      r0 = rev(); h = hold([...WRITE, '.shell sleep 7', 'COMMIT;'])
      await sleep(300); s = await save(); const held = await h
      ok(s.status >= 500 && rev() === r0 && held.code === 0, `a lock held past the server’s wait (7 s): that write fails after ${s.ms} ms and leaves nothing behind`)
      r0 = rev(); s = await save()
      ok(s.status === 200 && rev() === r0 + 1, '… once the lock is gone the next write lands')
      ok(cliWrite(), '… a sqlite3 write after it gets the file within 3 s')
      ok((await get('/leads')).status === 200, '… pages load')
    }
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e && e.stack || e).split('\n').slice(0, 6).join(' | '))
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    const after = ALL.filter((t) => hashOn(DB, t) !== before.get(t))
    ok(after.length === 0, `the server’s DB is as the probe found it${after.length ? ` — changed: ${after.join(', ')}` : ''}`)
    ok(!errors.length, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
    for (const f of copies) for (const x of ['', '-journal', '-wal', '-shm']) fs.rmSync(f + x, { force: true })
    fs.rmSync(HELPER, { force: true })
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
