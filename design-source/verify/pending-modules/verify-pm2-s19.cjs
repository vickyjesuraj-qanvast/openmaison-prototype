// Pending modules, step S19 · AI credits and plans (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:ai-credits — every pending line as the card and the audit recommended). Each item asserted as the rule it builds, never a count:
//  - a render and its charge are one moment: every charged render sits on its charge's time (the paid work rides with its charges)
//  - the top-up on 1.0's grid: any amount 100–5,000 in fifties at S$2 per 100 — the quick amounts and the stepper set it, the price follows,
//    the checkout record keeps the amount (`credits_requested`), the ledger, the invoice and the receipt say it
//  - Change seats (1.0's seat route): never under the members who use the AI tools; more seats start today, billed for the days left (the
//    amount said before the press is the amount invoiced); fewer wait for the billing date (Undo calls it off) and the renewal carries them
//  - auto top-up: off by default; turned on in Plan & billing; when a charge leaves the studio under the line one top-up is bought through the
//    checkout record (kind auto_topup) with its invoice and a receipt in the bell; a second crossing in the month past the ceiling buys none
//    and says so once
//  - one price for every quote read: a contractor's quote into a variation order and an uploaded quote into a schedule cost 5, said before
//    the press, keyed by the work (the VO keeps the charged id; the schedule read names its project), a file that can't be read gives it back
//  - plan locks on Free (1.0's seven Pro features): the Pro tag on every opener, the lock card on a press (See plans for the Owner, an ask for
//    an Admin), the lock in place of X-Ray, quote templates, My Sections and the expenses; approvals forced off at read time, stored as set;
//    WhatsApp messages written, never sent; the Plans table's locked rows derived from the plans; back on Pro everything returns
//  - Usage: a quiet month after a busy one says so, one press from last month
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width); the lock’s ghost draws where the lock lands, and Plan & billing’s
//    loader its boxes where the page puts them
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s19.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s19')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s19-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const n = (q) => Number(sql(q) || 0)
const balance = () => n(`select plan_credits + topup_credits from studio_credit_balances where id = 'studio'`)
const ledgerSum = () => n(`select coalesce(sum(case when reason = 'shadow_spend' then 0 else credits end), 0) from credit_ledger`)
const projectOf = (name) => sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = '${name}' and p.deleted_at is null limit 1`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { const same = p.url().split('#')[0] === (BASE + url).split('#')[0]; await p.goto(BASE + url, { waitUntil: 'networkidle' }); if (same) await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1100) }
  const shot = (p, nm, full = false) => p.screenshot({ path: path.join(dir, `${nm}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const lockCard = (p) => p.getByTestId('plan-lock')
  const lockFeature = async (p) => (await lockCard(p).count()) ? await lockCard(p).first().getAttribute('data-feature') : null
  const closeLock = async (p) => { await p.keyboard.press('Escape'); await settle(p, 400) }
  const demoPlan = async (p, name) => {
    if (!(await p.getByRole('button', { name: /^Demo Studio/ }).count())) await go(p, '/leads')   // the editors have no rail
    await p.getByRole('button', { name: /^Demo Studio/ }).first().click(); await settle(p, 400)
    await p.getByRole('menu', { name: 'View as' }).getByTestId('demo-plan').getByRole('menuitemradio', { name }).click()
    await settle(p, 2600)
  }
  /* the studio down to 15 AI credits as View as › Almost out writes it (a ledger adjustment, so the balance is still the ledger's sum) — the
     switch itself does nothing while it is already the plan picked */
  const lowTo = (left) => {
    const [bal] = json(`select plan_credits as p, topup_credits as t from studio_credit_balances where id = 'studio'`)
    const total = bal.p + bal.t, nowS = Math.floor(Date.now() / 1000), plan = Math.min(left, bal.p)
    if (total === left) return
    sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) values ('${require('crypto').randomUUID()}', null, 'adjust', ${left - total}, ${left}, 'adjust', 'demo', ${nowS}); update studio_credit_balances set plan_credits = ${plan}, topup_credits = ${left - plan}, updated_at = ${nowS} where id = 'studio'`)
  }
  /* REG-708: Plan & billing's loader (its streamed HTML with the scripts taken out, so the Suspense fallback stays) draws its four boxes where
     the page puts them */
  const billingGhost = async (state, sizes) => {
    for (const [vw, vh, touch] of sizes) {
      const o = { viewport: { width: vw, height: vh }, reducedMotion: 'reduce', ...(touch ? { isMobile: true, hasTouch: true } : {}) }
      const url = BASE + '/company/plan/billing'
      const boxes = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('section[data-card]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.card, [r.x, r.y, r.width, r.height].map(Math.round)] })))
      const ca = await b.newContext(o); const pa = await ca.newPage()
      await pa.route((u) => u.href === url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await pa.goto(url, { waitUntil: 'load' }).catch(() => {}); await pa.waitForTimeout(700)
      const A = await boxes(pa); await ca.close()
      const cb = await b.newContext(o); const pb = await page(cb, `billing-${vw}`); await go(pb, '/company/plan/billing')
      const B = await boxes(pb); await cb.close()
      const off = Object.keys(B).filter((k) => !A[k] || A[k].some((v, i) => Math.abs(v - B[k][i]) > 4))
      ok(Object.keys(B).length === 4 && off.length === 0, `${vw}: Plan & billing’s loader draws its four boxes where the page puts them — ${state}${off.length ? ` (off: ${off.map((k) => `${k} ${A[k]} vs ${B[k]}`).join(' · ')})` : ''}`)
    }
  }
  const csv = (name, body) => { const f = path.join(os.tmpdir(), name); fs.writeFileSync(f, body); return f }

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
    as('dane')
    const D = await desk(); const d = await page(D, 'desk')

    // ── 1 · A render and its charge are one moment ───────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · a render and its charge are one moment')
    const apart = json(`select l.ref_id, l.created_at - j.created_at as gap from credit_ledger l join render_jobs j on l.ref_id = 'render:' || j.id where l.reason = 'spend'`)
    ok(apart.length > 0 && apart.every((r) => Math.abs(Number(r.gap)) <= 3600), `every charged render sits on its charge’s time (${apart.length} renders, gaps ${[...new Set(apart.map((r) => r.gap))].join(', ')} s)`)
    const pinEarly = n(`select count(*) from render_annotations a join render_jobs j on j.id = a.job_id where a.created_at < j.created_at`)
    ok(pinEarly === 0, 'no pin is older than the version it is on')
    const linkEarly = n(`select count(*) from render_share_links s join project_rooms r on r.design_id = s.design_id join render_jobs j on j.room_id = r.id where s.created_at < j.created_at and s.snapshot like '%' || j.id || '%'`)
    ok(linkEarly === 0, 'no client link was sent before a version it shows')
    ok(balance() === ledgerSum(), `the balance is still the ledger’s sum (${balance()})`)

    /* Plan & billing's loader draws its boxes where the page puts them — the seats line, Change seats, the Auto top-up row (the base: Pro, auto top-up off) */
    await billingGhost('auto top-up off', [[1440, 1024, false], [390, 844, true]])

    // ── 2 · The top-up on 1.0's grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · the top-up: any amount, 100–5,000 in fifties')
    await go(d, '/company/plan/billing')
    ok(/Buy 1,000 AI credits · S\$20/.test(await text(d.getByTestId('billing-topups'))), 'the top-ups card still offers 1,000 for S$20 — where the buy starts')
    await d.getByTestId('billing-topups').getByRole('button', { name: /Buy 1,000 AI credits/ }).click(); await settle(d, 700)
    const tu = d.getByTestId('topup')
    ok(await tu.isVisible() && /S\$20\.00/.test(await text(d.getByTestId('demo-checkout'))), 'Buy AI credits opens on 1,000 · S$20.00')
    await d.getByTestId('topup-picks').getByRole('radio', { name: '2,000' }).click(); await settle(d, 300)
    ok(/S\$40\.00/.test(await text(d.getByTestId('demo-checkout'))) && /about 200 renders/.test(await text(tu)), 'a quick amount: 2,000 · S$40.00, about 200 renders')
    await d.getByRole('button', { name: '50 more AI credits' }).click(); await settle(d, 300)
    ok(/2,050/.test(await text(d.getByTestId('topup-amount'))) && /S\$41\.00/.test(await text(d.getByTestId('demo-checkout'))), 'the stepper: 2,050 · S$41.00 — the price follows before the press')
    ok(/S\$2 per 100 AI credits · 100 to 5,000/.test(await text(tu)), 'the rate and the range are said')
    await shot(d, '01-topup-1440')
    const bal0 = balance()
    await d.getByTestId('demo-checkout').getByRole('button', { name: 'Complete demo payment' }).click()
    await d.waitForFunction(() => /2,050 AI credits added/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {})
    await settle(d, 900)
    ok(balance() === bal0 + 2050 && balance() === ledgerSum(), `2,050 AI credits added — the balance is the ledger’s (${bal0} → ${balance()})`)
    ok(n(`select count(*) from billing_checkout_sessions where kind = 'topup' and credits_requested = 2050 and credits_granted = 2050 and status = 'completed'`) === 1, 'the checkout record keeps the amount bought (credits_requested · credits_granted)')
    ok(n(`select count(*) from invoices where plan_name = '2,050 AI credits' and amount = 4100`) === 1, 'its tax invoice: 2,050 AI credits · S$41.00')
    ok(n(`select count(*) from notifications where kind = 'credit_receipt' and member_id = 'dane' and title = 'Receipt · S$41.00'`) >= 1, 'a receipt in the Owner’s bell')

    // ── 3 · Change seats ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Change seats — 1.0’s seat change')
    await go(d, '/company/plan/billing')
    const seats0 = n(`select seats from subscriptions where cancelled_at is null`)
    const team = n(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`)   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
    ok(new RegExp(`${team} of ${seats0} seats in use`).test(await text(d.getByTestId('billing-seats'))), `the plan card says the seats in use (${team} of ${seats0})`)
    await d.getByTestId('billing-change-seats').click(); await settle(d, 600)
    const sd = d.getByTestId('seats-dialog')
    ok(await sd.isVisible() && await d.getByRole('button', { name: 'Fewer seats' }).isDisabled(), `Change seats opens on ${seats0}; Fewer can’t go under the ${team} members who use the AI tools`)
    await d.getByRole('button', { name: 'More seats' }).click(); await settle(d, 300)
    const line = await text(d.getByTestId('seats-line'))
    const today = (line.match(/Today S\$([\d,.]+)/) || [])[1]
    ok(!!today && /days? left of this period/.test(line) && /This month’s AI credits stay as they are/.test(line), `a seat more: “${line.slice(0, 90)}…”`)
    const press = await text(d.getByTestId('seats-save'))
    ok(new RegExp(`Pay S\\$${(today || 'x').replace('.', '\\.')} and add a seat`).test(press), `the press says the amount: “${press}”`)
    ok(/no card is charged/.test(await text(sd)), 'the dialog says no card is charged in the prototype')
    await shot(d, '02-seats-1440')
    await d.getByTestId('seats-save').click(); await settle(d, 1800)
    ok(n(`select seats from subscriptions where cancelled_at is null`) === seats0 + 1, `the plan has ${seats0 + 1} seats at once`)
    const prorated = n(`select amount from invoices where plan_name like '1 more seat%' order by issued_at desc limit 1`)
    ok(prorated > 0 && (prorated / 100).toFixed(2) === Number(String(today).replace(/,/g, '')).toFixed(2), `the invoice is the amount said: S$${(prorated / 100).toFixed(2)}`)
    ok(/1 seat added/.test(await snackText(d)), 'the sentence: 1 seat added')
    await go(d, '/company/plan/billing')
    ok(new RegExp(`${team} of ${seats0 + 1} seats in use`).test(await text(d.getByTestId('billing-seats'))), 'the card follows')
    await d.getByTestId('billing-change-seats').click(); await settle(d, 600)
    await d.getByRole('button', { name: 'Fewer seats' }).click(); await settle(d, 300)
    ok(/from .* the billing date/.test(await text(d.getByTestId('seats-line'))) && /nothing is refunded/.test(await text(d.getByTestId('seats-line'))), 'fewer seats wait for the billing date, nothing refunded')
    await d.getByTestId('seats-save').click(); await settle(d, 1600)
    ok(n(`select scheduled_seats from subscriptions where cancelled_at is null`) === seats0 && n(`select seats from subscriptions where cancelled_at is null`) === seats0 + 1, 'the plan keeps its seats until then — the change waits on it (scheduled_seats)')
    ok(/the studio has 7 seats/.test(await snackText(d)), 'the sentence names the date and the seats, with Undo')
    await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1600)
    ok(sql(`select coalesce(scheduled_seats, 'none') from subscriptions where cancelled_at is null`) === 'none', 'Undo calls the change off')
    /* the renewal carries a waiting change: the month and the bill end, the new bill is for the seats asked for */
    const sub = json(`select id, current_period_start as s, current_period_end as e from subscriptions where cancelled_at is null`)[0]
    const nowS = Math.floor(Date.now() / 1000)
    sql(`update subscriptions set scheduled_seats = ${seats0}, current_period_end = ${nowS - 120} where id = '${sub.id}'`)
    sql(`update studio_credit_balances set period_end = ${nowS - 120} where id = 'studio'`)
    await go(d, '/company/plan/billing')
    ok(n(`select seats from subscriptions where id = '${sub.id}'`) === seats0 && sql(`select coalesce(scheduled_seats, 'none') from subscriptions where id = '${sub.id}'`) === 'none', `the renewal carries the waiting change: ${seats0} seats from the billing date`)
    ok(n(`select count(*) from invoices where plan_name = 'Pro — Studio · ${seats0} seats' and issued_at >= ${nowS - 200}`) === 1, 'the renewal’s bill is for those seats')
    ok(balance() === ledgerSum(), 'the balance is still the ledger’s sum')

    // ── 4 · Auto top-up ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · auto top-up')
    await go(d, '/company/plan/billing')
    ok(/Off — when the studio runs low, nothing is bought/.test(await text(d.getByTestId('billing-auto-line'))) && n(`select count(*) from settings where key = 'auto_topup'`) === 0, 'off by default — nothing is set until the Owner turns it on')
    await d.getByTestId('billing-auto-topup').locator('label').first().click(); await settle(d, 700)
    const ad = d.getByTestId('auto-topup-dialog')
    ok(await ad.isVisible() && /When AI credits fall under 500, add 1,000 \(S\$20\) · at most once a month/.test(await text(d.getByTestId('auto-topup-line'))), 'turning it on asks the three things, the sentence says what will happen')
    ok(/no card is charged/.test(await text(ad)), '…and that no card is charged in the prototype')
    await shot(d, '03-auto-topup-1440')
    await d.getByTestId('auto-topup-save').click(); await settle(d, 1500)
    const auto = JSON.parse(sql(`select value from settings where key = 'auto_topup'`) || '{}')
    ok(auto.on === true && auto.below === 500 && auto.credits === 1000 && auto.ceiling === 2000, 'the setting is stored: under 500, add 1,000, at most S$20 a month')
    ok(/When AI credits fall under 500/.test(await text(d.getByTestId('billing-auto-line'))), 'the card says it is on')
    await billingGhost('auto top-up on', [[1440, 1024, false], [390, 844, true]])
    /* the studio runs low; a quote read takes 5 — the charge leaves it under the line, and one top-up is bought */
    await demoPlan(d, /^Almost out/)
    ok(balance() === 15, 'Almost out: 15 AI credits')
    const ben = sql(`select id from projects where number = 'P-2026-002'`)
    const voCsv = csv(`s19-vo-${Date.now()}.csv`, 'Item,Qty,Unit,Rate\nAdditional power point,4,pcs,85\nCove light along the ceiling,12,m,45\n')
    await go(d, `/projects/${ben}/money`)
    await d.locator('[data-testid="money-new"]').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /contractor/ }).first().click(); await settle(d, 600)
    const vo = d.getByTestId('vo-upload-dialog')
    ok(/XLSX · CSV · PDF · 5 AI credits/.test(await text(vo)), '5 · one price for every quote read: the VO dialog says it before the press')   // (S42 D-08 · D·2, a deliberate change of this rule) PDFs read by rule, at the same price
    await vo.locator('input[type="file"]').setInputFiles(voCsv); await settle(d, 2600)
    const read = json(`select ref_id, credits from credit_ledger where action_key = 'quote_digitize' and reason = 'spend' order by created_at desc limit 1`)[0]
    ok(read && read.credits === -5 && /^quote:[0-9a-f-]{36}$/.test(read.ref_id), `5 · reading the contractor’s quote took 5, keyed by the order it becomes (${read?.ref_id})`)
    ok(n(`select count(*) from billing_checkout_sessions where kind = 'auto_topup' and status = 'completed' and credits_granted = 1000`) === 1, '4 · the charge left the studio under 500 — one top-up of 1,000 was bought through the checkout record')
    ok(balance() === 1010 && balance() === ledgerSum(), `4 · the balance: 15 − 5 + 1,000 = ${balance()} (the ledger agrees)`)
    ok(n(`select count(*) from credit_ledger where action_key = 'auto_topup' and reason = 'topup' and credits = 1000 and member_id is null`) === 1, '4 · its ledger row is the studio’s, not a member’s')
    ok(n(`select count(*) from invoices where plan_name = '1,000 AI credits · auto top-up' and amount = 2000`) === 1, '4 · its tax invoice')
    ok(n(`select count(*) from notifications where kind = 'credit_receipt' and member_id = 'dane' and title = 'Auto top-up · S$20.00'`) === 1, '4 · a receipt in the Owner’s bell says why')
    await d.getByTestId('vo-upload-make').click()
    await d.waitForURL(/\/quotes\//, { timeout: 15000 }).catch(() => {})
    const voId = read ? read.ref_id.slice(6) : ''
    ok(n(`select count(*) from quotes where id = '${voId}' and kind = 'variation'`) === 1, '5 · the variation order is made with the id its read was charged against')
    /* a second crossing in the month: past the ceiling (once a month), no second top-up — and the Owner hears it once */
    lowTo(15)
    const marcus = sql(`select id from projects where number = 'P-2026-004'`)
    const schedCsv = csv(`s19-schedule-${Date.now()}.csv`, 'Section,Item,Trade,Qty,Unit,Rate\nKitchen,Hack wall,Hacking & demolition,1,lot,800\nKitchen,Cabinets,Carpentry fabrication,6,m,450\nLiving,Paint walls,Painting,1,lot,1200\n')
    await go(d, `/projects/${marcus}/schedule`)
    ok(/reading it uses 5 AI credits/i.test(await text(d.locator('body'))), '5 · the schedule’s uploaded quote says its 5 AI credits before the press')
    await d.locator('[data-testid="source-file"]').first().setInputFiles(schedCsv); await settle(d, 2000)
    const sread = json(`select ref_id from credit_ledger where action_key = 'quote_digitize' and reason = 'spend' order by created_at desc limit 1`)[0]
    ok(sread && new RegExp(`^schedule:${marcus}:[0-9a-f-]{36}$`).test(sread.ref_id), `5 · the schedule read took 5, keyed by its project (${sread?.ref_id?.slice(0, 50)})`)
    ok(n(`select count(*) from billing_checkout_sessions where kind = 'auto_topup'`) === 1, '4 · past the month’s ceiling no second top-up is bought — never twice')
    ok(n(`select count(*) from notifications where kind = 'credits_low' and member_id = 'dane' and title like 'Auto top-up has spent this month%'`) === 1, '4 · the Owner hears once that it stops until the refresh')
    /* a file that can't be read gives its 5 back, and says so — a sheet that is only its header has no lines (it used to read the header as a
       line called "Item") */
    const emptyCsv = csv(`s19-empty-${Date.now()}.csv`, 'Item,Qty\n')
    const bal1 = balance()
    await d.locator('[data-testid="source-file"]').first().setInputFiles(emptyCsv); await settle(d, 2200)
    ok(balance() === bal1 && /That file has no lines we could read — your 5 AI credits are back/.test(await text(d.locator('body'))), '5 · a sheet with only its header has no lines — its 5 come back, in the same sentence')
    /* Usage: the charge rows link their work */
    await go(d, '/company/plan')
    const act = await text(d.getByTestId('usage-activity'))
    ok(/Quote read/.test(act) && /Schedule/.test(act) && /Auto top-up/.test(act), 'Usage › Activity: the quote reads (one names the project’s Schedule) and the auto top-up')
    await go(d, '/company/plan/billing')
    ok(/This month: 1 top-up · 1,000 AI credits · S\$20/.test(await text(d.getByTestId('billing-auto-month'))), 'Plan & billing says what auto top-up did this month')
    await demoPlan(d, /^Pro — Studio The base plan/)

    // ── 6 · Plan locks on Free ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · plan locks on Free (1.0’s seven Pro features)')
    const storedApproval = sql(`select coalesce(value, 'none') from settings where key = 'quote_approval'`)
    await go(d, '/leads')
    await demoPlan(d, /^Free/)
    ok(sql(`select plan_id from subscriptions where cancelled_at is null`) === 'free', 'View as › Studio plan › Free')
    /* Tools: the X-Ray tile wears Pro and still opens its page */
    await d.locator('[data-rail-item="tools"], [aria-label="Tools"]').first().click(); await settle(d, 600)
    const tile = d.getByRole('menuitem', { name: /Quote X-Ray, Pro feature/ })
    ok(await tile.count() === 1, 'the Tools tile reads “Quote X-Ray, Pro feature” and wears the Pro tag')
    await shot(d, '04-free-tools-1440')
    await tile.click(); await d.waitForURL(/\/quote-x-ray/, { timeout: 10000 }); await settle(d, 1500)
    ok(await d.getByTestId('xray-locked').isVisible() && await d.getByTestId('xray-setup').count() === 0, 'X-Ray: the setup is the lock (“Quote X-Ray comes with Pro”)')
    ok(/comparisons are kept/.test(await text(d.getByTestId('xray-locked'))) && await d.getByTestId('xray-recent').count() > 0, '…the comparisons made are kept and still listed')
    await shot(d, '05-free-xray-1440')
    await d.getByTestId('xray-recent').first().getByRole('button', { name: /^Delete/ }).click(); await settle(d, 600)
    ok(await lockFeature(d) === 'quote_xray' && /See plans/.test(await text(lockCard(d).locator('xpath=ancestor::*[@role="dialog"][1]'))), 'deleting one opens the lock card — See plans for the Owner')
    await shot(d, '06-free-lock-card-1440'); await closeLock(d)
    const cmp = sql(`select id from quote_comparisons order by created_at desc limit 1`)
    await go(d, `/quote-x-ray/${cmp}`)
    ok(await d.getByTestId('xray-record-locked').isVisible() && await d.getByTestId('xray-summary').count() === 0, 'a comparison opened on Free: its frame and the lock — none of the reading is sent')
    /* a lead's quick link and the quote editor */
    const kevin = sql(`select id from leads where name = 'Kevin Ng' and deleted_at is null`)
    await go(d, `/leads/${kevin}`)
    const ql = d.locator('aside[aria-label="Create"]')
    if (await ql.locator('button[aria-label="Expand create links"]').count()) { await ql.locator('button[aria-label="Expand create links"]').click(); await settle(d, 400) }
    const xrayLink = ql.getByRole('button', { name: /Quote X-Ray/ })
    ok(/Pro/.test(await text(xrayLink)), 'the lead’s Quote X-Ray quick link wears the Pro tag')
    await xrayLink.click(); await settle(d, 600)
    ok(await lockFeature(d) === 'quote_xray' && /\/leads\//.test(d.url()), '…and its press opens the lock card where you are')
    await closeLock(d)
    const q1 = sql(`select id from quotes where number = 'OM-10001' and kind = 'quote' limit 1`)
    await go(d, `/quotes/${q1}`)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 400)
    const cmpRow = d.getByRole('menuitem', { name: /Compare with another quote/ })
    ok(/Pro/.test(await text(cmpRow)), 'the quote editor’s Compare with another quote wears Pro')
    await cmpRow.click(); await settle(d, 600)
    ok(await lockFeature(d) === 'quote_xray', '…its press opens the lock card')
    await closeLock(d)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 400)
    await d.getByRole('menuitem', { name: /Save as Template/ }).click(); await settle(d, 600)
    ok(await lockFeature(d) === 'template_editor', 'Save as Template opens the template lock')
    await closeLock(d)
    ok(/\bpro\b/i.test(await text(d.getByTestId('template-card'))), 'the quote’s Template card wears Pro')
    await d.getByTestId('template-card').getByRole('button', { name: /Change|Choose a template/ }).click(); await settle(d, 600)
    ok(await lockFeature(d) === 'template_editor', '…Change opens the lock, not the picker')
    await closeLock(d)
    /* the places that are the feature itself */
    await go(d, '/company/templates/quotes')
    ok(await d.getByTestId('templates-locked').isVisible() && /quote templates are kept/.test(await text(d.getByTestId('templates-locked'))), 'Company › Templates › Quotes is the lock — the templates are kept')
    await shot(d, '07-free-templates-1440')
    const tpl = sql(`select id from quote_templates where deleted_at is null limit 1`)
    await go(d, `/templates/${tpl}`)
    ok(await d.getByTestId('template-locked').isVisible(), 'a template opened on Free is shown locked, never opened to edit')
    await go(d, '/company/price-book/sections')
    ok(await d.getByTestId('sections-locked').isVisible(), 'Price book › My Sections is the lock')
    await go(d, '/company/finance/money-out?kind=expenses')
    ok(await d.getByTestId('expenses-locked').isVisible() && /still count in the reports/.test(await text(d.getByTestId('expenses-locked'))), 'Money out › Expenses is the lock — what was logged still counts in the reports')
    await d.getByTestId('finance-new').click(); await settle(d, 400)
    const expRow = d.getByRole('menuitem', { name: /Expense/ })
    ok(/Pro/.test(await text(expRow)), 'New ▾ › Expense wears Pro')
    await expRow.click(); await settle(d, 600)
    ok(await lockFeature(d) === 'expense_management', '…its press opens the lock card, not the expense form')
    await closeLock(d)
    await go(d, '/company/reports/finance?report=expenses')
    ok(await d.getByTestId('report-expenses-locked').isVisible(), 'Reports › Finance › Expenses is the lock')
    await go(d, '/company/reports/finance?report=pl')
    ok(await d.getByTestId('report-tiles').isVisible(), '…Profit and loss still counts them')
    await go(d, '/settings?section=finance')
    ok(await d.getByTestId('expense-categories-locked').isVisible(), 'Settings › Finance › Expense categories is the lock')
    /* approvals forced off when read, stored as set */
    await go(d, '/settings?section=quotes')
    const qa = d.locator('#quote-approval')
    ok(/Pro/.test(await text(qa)) && await qa.getByRole('radio', { name: /Not required/ }).getAttribute('aria-checked') === 'true', 'Quote approval wears Pro and reads Not required on Free')
    await qa.getByRole('radio', { name: /^Required/ }).click(); await settle(d, 600)
    ok(await lockFeature(d) === 'internal_approvals', '…choosing Required opens the lock card')
    await closeLock(d)
    ok(sql(`select coalesce(value, 'none') from settings where key = 'quote_approval'`) === storedApproval, 'the studio’s own rule is kept as stored — it comes back with Pro')
    await go(d, '/settings?section=projects')
    ok(/Pro/.test(await text(d.getByTestId('owner-approvals'))), 'Settings › Projects › What waits for an Owner or an Admin wears Pro')
    /* stage rules */
    await go(d, '/settings?section=leads')
    const stagesBefore = sql(`select coalesce(value, 'none') from settings where key = 'lead_stage_rules'`)
    await d.getByTestId('lead-stages').locator('label').filter({ has: d.getByTestId('lead-stage-ask-won') }).click(); await settle(d, 600)
    ok(await lockFeature(d) === 'custom_stages' && sql(`select coalesce(value, 'none') from settings where key = 'lead_stage_rules'`) === stagesBefore, 'a lead stage rule opens the lock card; the rule stands as set')
    await closeLock(d)
    /* WhatsApp: the column reads off, and a WhatsApp message is written, never sent */
    await go(d, '/settings?section=notifications')
    ok(await d.getByTestId('whatsapp-locked').isVisible() && !(await d.getByRole('switch', { name: 'A new lead arrives — WhatsApp' }).isChecked()), 'Settings › Notifications: WhatsApp reads off on Free and says why')
    await d.getByTestId('event-new_lead').locator('label').filter({ has: d.getByRole('switch', { name: 'A new lead arrives — WhatsApp' }) }).click().catch(async () => { await d.getByRole('switch', { name: 'A new lead arrives — WhatsApp' }).click({ force: true }) })
    await settle(d, 600)
    ok(await lockFeature(d) === 'whatsapp_notifications', '…a press opens the lock card')
    await closeLock(d)
    /* the bell's reminders go out with their channels when it opens (deliverDerived) — on Free their WhatsApp copies are written, never sent */
    const waBefore = n(`select count(*) from notification_outbox where channel = 'whatsapp' and status = 'not_in_plan'`)
    const sentBefore = n(`select count(*) from notification_outbox where channel = 'whatsapp' and status = 'sent'`)
    await go(d, '/leads')
    await d.locator('[data-notifications-tile]').first().click(); await settle(d, 2600)
    const waHeld = n(`select count(*) from notification_outbox where channel = 'whatsapp' and status = 'not_in_plan'`) - waBefore
    ok(waHeld > 0 && n(`select count(*) from notification_outbox where channel = 'whatsapp' and status = 'sent'`) === sentBefore, `the bell’s reminders on Free: their WhatsApp copies are written, never sent (${waHeld} held)`)
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, '/settings?section=notifications')
    const sentLog = d.getByTestId('sent-messages')
    if (await sentLog.count()) ok(/Not sent — WhatsApp notifications come with Pro/.test(await text(sentLog)), 'Sent messages says why: “Not sent — WhatsApp notifications come with Pro”')
    /* Plans: the locked rows come from the plans */
    await go(d, '/company/plan/billing')
    await d.getByTestId('billing-change-plan').click(); await settle(d, 900)
    await d.getByRole('button', { name: 'Compare everything' }).click(); await settle(d, 400)
    const table = await text(d.getByRole('dialog', { name: 'Plans' }))
    ok(/Lead stage rules/.test(table) && !/Custom stage definitions/.test(table) && /My Sections \(packages\)/.test(table), 'Plans › Compare everything names what 2.0 locks — Lead stage rules, My Sections (packages)')
    await d.keyboard.press('Escape'); await settle(d, 500)
    /* Usage: a quiet month after a busy one */
    await go(d, '/company/plan')
    const quiet = d.getByTestId('usage-empty-last')
    ok(await quiet.isVisible() && /last month used/.test(await text(quiet)), 'Usage: this month quiet after a busy one — it says so')
    await quiet.getByRole('button', { name: 'See last month' }).click(); await settle(d, 1500)
    ok(/range=last/.test(d.url()), '…one press to last month')
    /* an Admin asks the Owner */
    as(sql(`select id from members where name = 'Hui Min'`))
    await go(d, '/quote-x-ray')
    const ask = d.getByTestId('xray-locked-ask')
    ok(await ask.isVisible() && /Only Dane changes the plan/.test(await text(d.getByTestId('xray-locked'))), 'an Admin sees why (only Dane changes the plan) and an ask')
    await ask.click(); await settle(d, 1400)
    ok(n(`select count(*) from notifications where kind = 'credit_request' and member_id = 'dane' and title like 'Hui Min asks to move the studio to%'`) >= 1, '…the ask reaches Dane’s bell')
    ok(/Asked Dane/.test(await text(d.getByTestId('xray-locked'))), '…and the panel says it was asked')
    as('dane')
    /* back on Pro, everything returns */
    await go(d, '/leads')
    await demoPlan(d, /^Pro — Studio The base plan/)
    await go(d, '/quote-x-ray')
    ok(await d.getByTestId('xray-setup').isVisible() && await d.getByTestId('xray-locked').count() === 0, 'back on Pro: X-Ray’s setup is back')
    await go(d, '/company/templates/quotes')
    ok(await d.getByTestId('templates-locked').count() === 0, 'back on Pro: the quote templates are back')
    await go(d, '/settings?section=quotes')
    ok(!(/Pro/.test(await text(d.locator('#quote-approval .' + 'x')))) && await d.locator('#quote-approval').getByRole('radio', { name: /^Required/ }).getAttribute('aria-checked') === (storedApproval.includes('not-required') ? 'false' : 'true'), 'back on Pro: the studio’s own approval rule reads as it was stored')

    // ── 7 · The lock's ghost, and the phone ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · the lock’s ghost; 390 and 320')
    await demoPlan(d, /^Free/)
    /* REG-708: the route's loader (its streamed HTML with the scripts taken out, so the Suspense fallback stays — verify-ghosts-same.cjs's A) draws
       the lock where the page puts it, on a cold load: the layouts seed the plan's locks to the ghosts */
    const cmpId = sql(`select id from quote_comparisons order by created_at desc limit 1`)
    const tplId = sql(`select id from quote_templates where deleted_at is null limit 1`)
    const LOCKS = [
      ['X-Ray', '/quote-x-ray', 'Quote X-Ray comes with Pro'], ['a comparison', `/quote-x-ray/${cmpId}`, 'Quote X-Ray comes with Pro'],
      ['Templates › Quotes', '/company/templates/quotes', 'Your own quote templates come with Pro'], ['My Sections', '/company/price-book/sections', 'My Sections come with Pro'],
      ['the template editor', `/templates/${tplId}`, 'Your own quote templates come with Pro'], ['Money out › Expenses', '/company/finance/money-out?kind=expenses', 'Expenses come with Pro'],
    ]
    for (const [vw, vh, touch] of [[1440, 1024, false], [390, 844, true]]) {
      for (const [name, url, title] of LOCKS) {
        const ca = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce', ...(touch ? { isMobile: true, hasTouch: true } : {}) })
        const pa = await ca.newPage()
        await pa.route((u) => u.href === BASE + url, async (route) => {
          const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, '')
          await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } })
        })
        await pa.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await pa.waitForTimeout(700)
        const gl = pa.locator(`section[aria-label="Loading — ${title}"]`)
        const gb = (await gl.count()) ? await gl.first().boundingBox() : null
        if (vw === 1440 && name === 'X-Ray') await shot(pa, '07-free-xray-loader-1440')
        await ca.close()
        const cb = await b.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce', ...(touch ? { isMobile: true, hasTouch: true } : {}) })
        const pb = await page(cb, `lock-${name}`)
        await go(pb, url)
        const pl = pb.locator(`section[aria-label="${title}"]`)
        const bb = (await pl.count()) ? await pl.first().boundingBox() : null
        await cb.close()
        ok(!!gb && !!bb && Math.abs(gb.x - bb.x) <= 4 && Math.abs(gb.y - bb.y) <= 8 && Math.abs(gb.width - bb.width) <= 4,
          `${vw}: ${name} — its loader draws the lock where it lands (ghost ${gb ? [gb.x, gb.y, gb.width].map(Math.round).join(',') : '—'} · page ${bb ? [bb.x, bb.y, bb.width].map(Math.round).join(',') : '—'})`)
      }
    }
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const C = await phoneCtx(w, h); const p = await page(C, `phone-${w}`)
      await go(p, '/quote-x-ray')
      ok(await sideways(p) <= 0 && await p.getByTestId('xray-locked').isVisible(), `${w}: X-Ray’s lock fits, no sideways scroll`)
      if (w === 390) await shot(p, '08-free-xray-390')
      await go(p, '/company/plan/billing')
      ok(await sideways(p) <= 0, `${w}: Plan & billing has no sideways scroll`)
      if (w === 390) await shot(p, '09-billing-390', true)
      await go(p, '/company/finance/money-out?kind=expenses')
      ok(await sideways(p) <= 0, `${w}: Money out › Expenses (locked) has no sideways scroll`)
      await C.close()
    }
    await demoPlan(d, /^Pro — Studio The base plan/)
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const C = await phoneCtx(w, h); const p = await page(C, `phone-pro-${w}`)
      await go(p, '/company/plan/billing')
      await p.getByTestId('billing-change-seats').click(); await settle(p, 800)
      ok(await p.getByTestId('seats-dialog').isVisible() && await sideways(p) <= 0, `${w}: Change seats rises as a sheet, no sideways scroll`)
      if (w === 390) await shot(p, '10-seats-390')
      await p.keyboard.press('Escape'); await settle(p, 500)
      await p.getByTestId('billing-topups').getByRole('button', { name: /Buy 1,000 AI credits/ }).click(); await settle(p, 800)
      ok(await p.getByTestId('topup').isVisible() && await sideways(p) <= 0, `${w}: Buy AI credits (the amount picker) fits`)
      if (w === 390) await shot(p, '11-topup-390')
      await C.close()
    }
    await D.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n').slice(0, 3).join(' '))
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing to put back'}`)
    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})().catch((e) => { console.error(e); process.exit(1) })
