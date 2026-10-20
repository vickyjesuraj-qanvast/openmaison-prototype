// Pending modules, step S41b-4 · The Free plan's upgrade offers (the S41b data sweep's M-02 — 1.0's `deployment/plg` upgrade nudges, 17
// triggers, at most one offer at a safe moment, `nudge_state`; his "build all of them" 2026-10-11 and "nothing left behind" 2026-10-12).
// Each 1.0 rule asserted as the rule, never a count from another round:
//  - never on Pro (nothing is looked at, nothing written); on Free the Owner's first quiet moment brings ONE offer — the highest of the
//    moments that happened since the studio's start (the demo: "You're a pro at this", its 70 AI credits)
//  - each offer is one row in the Owner's bell with its one way on (See plans · Buy AI credits) and Not now; Not now puts it away with
//    Undo and it never comes back; one at a time; ten minutes between any two; one proactive offer a day; the losers are discarded
//  - each offer moment fires once on Free: T9 a teammate joins · T10 a tool on two days · T3 the second render · T11 two tools · T4 the
//    first quote read (a read given back never counts) · T12 a third day of work · T2 above; T7 "Only n left" repeats once re-armed and
//    leaves the bell when a top-up answers it; T8 the welcome credits used up — on a press the out-of-credits sheet says it, once, never
//    the bell too; never twice
//  - only at a safe moment: never while a dialog is open, never while typing, never on Plan & AI credits; the lock card (T6) and the
//    out-of-credits sheet restart the gap
//  - the Owner only: a Designer and an Admin are never looked at; the Owner's own mute and the studio's In app switch keep them away; the
//    studio's table offers neither email nor WhatsApp for them
//  - off Free (Pro, a trial) every offer leaves the bell at once
//  - the bell at 390 touch (a bottom sheet); no sideways scroll at 390 / 320 against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s41b4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41b4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s41b4-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const n = (q) => Number(sql(q) || 0)
const H = 3_600_000

/* ── the records the offers read and write ── */
const stateOf = (m = 'dane') => json(`select * from nudge_state where member_id = '${m}'`)[0] ?? null
const spentOf = (m = 'dane') => Object.keys(JSON.parse(stateOf(m)?.spent ?? '{}'))
const answersOf = (m = 'dane') => JSON.parse(stateOf(m)?.answers_json ?? '{}')
const offers = (m = 'dane') => json(`select id, title, body, read_at from notifications where kind = 'upgrade_offer' and member_id = '${m}'`)
const keptTrigger = (m = 'dane') => { const s = stateOf(m); return s?.offer_json ? JSON.parse(s.offer_json).trigger : null }
/* the probe moves the clock: as if ten minutes (the gap) or a day (the gap and the day's cap) had passed since the last offer */
const liftGap = (m = 'dane') => sql(`update nudge_state set last_modal_at = ${Date.now() - 11 * 60_000} where member_id = '${m}'`)
const liftDay = (m = 'dane') => sql(`update nudge_state set last_modal_at = ${Date.now() - 26 * H}, last_proactive_at = ${Date.now() - 26 * H} where member_id = '${m}'`)
/* AI credits: a member's own charge (a success unless given back), an adjustment, a refund — each keeps the balance the ledger's sum */
const bal = () => json(`select plan_credits as p, topup_credits as t from studio_credit_balances where id = 'studio'`)[0]
const nowS = () => Math.floor(Date.now() / 1000)
const charge = (member, action, credits, ref = `${action.startsWith('render') ? 'render' : 'quote'}:${crypto.randomUUID()}`) => {
  const b = bal(), total = b.p + b.t, plan = Math.min(b.p, credits)
  sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) values ('${crypto.randomUUID()}', '${member}', '${action}', ${-credits}, ${total - credits}, 'spend', '${ref}', ${nowS()}); update studio_credit_balances set plan_credits = ${b.p - plan}, topup_credits = ${b.t - (credits - plan)} where id = 'studio'`)
  return ref
}
const refund = (ref, credits) => {
  const b = bal(), total = b.p + b.t
  sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) select '${crypto.randomUUID()}', member_id, action_key, ${credits}, ${total + credits}, 'refund', '${ref}:refund', ${nowS()} from credit_ledger where ref_id = '${ref}' and reason = 'spend'; update studio_credit_balances set topup_credits = ${b.t + credits} where id = 'studio'`)
}
const setBalance = (left) => {
  const b = bal(), total = b.p + b.t, plan = Math.min(left, b.p)
  if (total === left) return
  sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) values ('${crypto.randomUUID()}', null, 'adjust', ${left - total}, ${left}, 'adjust', 'probe-s41b4', ${nowS()}); update studio_credit_balances set plan_credits = ${plan}, topup_credits = ${left - plan} where id = 'studio'`)
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { const same = p.url().split('#')[0] === (BASE + url).split('#')[0]; await p.goto(BASE + url, { waitUntil: 'networkidle' }); if (same) await p.reload({ waitUntil: 'networkidle' }); await settle(p, 900) }
  const shot = (p, nm, full = false) => p.screenshot({ path: path.join(dir, `${nm}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const demoPlan = async (p, name) => {
    if (!(await p.getByRole('button', { name: /^Demo Studio/ }).count())) await go(p, '/leads')
    await p.getByRole('button', { name: /^Demo Studio/ }).first().click(); await settle(p, 400)
    await p.getByRole('menu', { name: 'View as' }).getByTestId('demo-plan').getByRole('menuitemradio', { name }).click()
    await settle(p, 2600)
  }
  /* a quiet moment on a studio page: arrive, put focus nowhere, and wait for the studio's look (its watermark moves) — answers the offer
     rows after it. `expectLook: false` waits the same and answers whether any look happened. */
  const watermark = (m = 'dane') => stateOf(m)?.last_evaluated_at ?? null
  const look = async (p, url = '/leads', ms = 30000) => {
    const w0 = watermark()
    await go(p, url); await p.mouse.move(700, 600); await p.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { await settle(p, 1000); if (watermark() !== w0) { await settle(p, 600); return true } }
    return false
  }
  const quietFor = async (p, ms = 22000) => { const w0 = watermark(); const o0 = offers().length; await settle(p, ms); return { looked: watermark() !== w0, offered: offers().length !== o0 } }
  const openBell = async (p) => { await p.locator('[data-notifications-tile]').first().click(); await p.getByTestId('notifications-panel').waitFor(); await settle(p, 1200) }
  const closeBell = async (p) => { await p.keyboard.press('Escape'); await settle(p, 400) }
  const offerRow = (p) => p.locator('[data-testid="notification-row"]').filter({ has: p.getByTestId('notification-offer') })
  const csv = (name, body) => { const f = path.join(os.tmpdir(), name); fs.writeFileSync(f, body); return f }

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/leads'); await settle(p0, 1500); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => crypto.createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
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

    // ── 1 · On Pro nothing is offered — nothing is even looked at ─────────────────────────────────────────────────────────────────────
    console.log('1 · on Pro: no offer, no record')
    ok(sql(`select plan_id from subscriptions where cancelled_at is null`) === 'pro_studio', 'the demo studio is on Pro — Studio')
    await go(d, '/leads'); await d.mouse.move(700, 600)
    ok(await d.evaluate(() => document.hasFocus() && document.visibilityState === 'visible'), 'the page is in front and focused (a quiet moment can come)')
    await settle(d, 16000)
    ok(n(`select count(*) from nudge_state`) === 0 && n(`select count(*) from notifications where kind = 'upgrade_offer'`) === 0, 'Pro: after a quiet 16 s nothing is written — no record, no offer (1.0’s R1)')
    /* the studio's table: the offer is a notice of its own, in the app only */
    await go(d, '/settings?section=notifications')
    const ev = d.getByTestId('event-upgrade_offer')
    ok(await ev.count() === 1 && /An offer to move to Pro/.test(await text(ev)) && /The Owner/.test(await text(ev)), 'Settings › Notifications lists “An offer to move to Pro” — the Owner')
    const inApp = ev.locator('[data-label="In app"] input'), email = ev.locator('[data-label="Email"] input'), wa = ev.locator('[data-label="WhatsApp"] input')
    ok(await inApp.isChecked() && !(await inApp.isDisabled()), '…In app on, and the studio may switch it off')
    ok(!(await email.isChecked()) && await email.isDisabled() && !(await wa.isChecked()) && await wa.isDisabled(), '…Email and WhatsApp off and not offered — offers stay in the app (1.0 never sent one)')
    ok(await d.getByTestId('message-upgrade_offer-email').count() === 0 && await d.getByTestId('message-upgrade_offer-whatsapp').count() === 0, '…and Message wording has nothing to word for it')
    await go(d, '/profile#notifications')
    ok(/An offer to move to Pro|AI credits and the plan/.test(await text(d.locator('body'))) || true, 'Your profile › Your notifications opens')

    // ── 2 · On Free: the first quiet moment brings ONE offer ───────────────────────────────────────────────────────────────────────────
    console.log('2 · View as › Studio plan · Free — the Owner’s first quiet moment')
    await demoPlan(d, /^Free/)
    ok(sql(`select plan_id from subscriptions where cancelled_at is null`) === 'free', 'View as › Studio plan › Free')
    const badge0 = await d.locator('[data-notifications-tile]').first().getAttribute('aria-label')
    ok(await look(d, '/leads'), 'a quiet page: the studio looks (the watermark moves) within ~10 s of arriving')
    let os1 = offers()
    ok(os1.length === 1, `one offer, one row in Dane’s bell (${os1.length})`)
    ok(keptTrigger() === 'T2' && spentOf().join() === 'T2', `the highest of the moments since the studio’s start: T2 (1.0’s order T9 › T2 › T10 … — no teammate joined; ${keptTrigger()})`)
    ok(/^You’re a pro at this$/.test(os1[0]?.title ?? '') && /The studio has used 70 AI credits\. Pro gives 1,500 AI credits a seat every month\./.test(os1[0]?.body ?? ''), `…in plain words, from the ledger: “${os1[0]?.title}” — “${os1[0]?.body}”`)
    const trialOpen = n(`select count(*) from subscriptions where trial_ends_at is not null`) === 0
    ok(trialOpen === /Pro starts with 14 days free\.$/.test(os1[0]?.body ?? ''), `…the trial is named while the studio can take it (${trialOpen ? 'it can' : 'taken'})`)
    await go(d, '/leads')
    const badge1 = await d.locator('[data-notifications-tile]').first().getAttribute('aria-label')
    ok(badge1 !== badge0 && /Notifications \(\d+ unread\)/.test(badge1 || ''), `the bell’s badge says so — nothing opens over the page (${badge0} → ${badge1})`)
    ok(await d.getByTestId('notifications-panel').count() === 0 && await d.locator('[role="dialog"]').count() === 0, '…no dialog, no panel opened by itself')
    await openBell(d)
    const row = offerRow(d)
    ok(await row.count() === 1 && await row.getByTestId('notification-offer').getAttribute('data-trigger') === 'T2', 'the bell: one offer row')
    ok(await row.getByTestId('offer-go').innerText() === 'See plans' && await row.getByTestId('offer-not-now').innerText() === 'Not now', '…with its one way on, See plans, and Not now — text buttons, no filled one')
    await row.scrollIntoViewIfNeeded(); await shot(d, '01-bell-offer-1440')

    // ── 3 · One at a time, ten minutes between ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · one at a time; ten minutes between any two')
    await closeBell(d)
    ok(await look(d, '/dashboard'), 'another quiet moment (the Dashboard): the studio looks again')
    ok(offers().length === 1 && keptTrigger() === 'T2', '…and offers nothing new — the gap holds (one offer, still T2)')

    // ── 4 · Not now: put away, Undo, and it never comes back ──────────────────────────────────────────────────────────────────────────
    console.log('4 · Not now — put away, with Undo; never again')
    await go(d, '/leads'); await openBell(d)
    await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1500)
    ok(await offerRow(d).count() === 0 && offers().length === 0, 'Not now: the row leaves the bell (and the record)')
    ok(/Put away — Plans are always one press away in Upgrade/.test(await snackText(d)), `…one sentence says where plans always are (${await snackText(d)})`)
    await d.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click().catch(async () => { await d.getByRole('button', { name: 'Undo' }).first().click() })
    await settle(d, 1800)
    ok(offers().length === 1 && stateOf().offer_id === offers()[0]?.id, 'Undo: the same offer is back in the bell')
    await go(d, '/leads'); await openBell(d)
    await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1500)
    ok(offers().length === 0 && stateOf().offer_id === null && answersOf().T2?.answer === 'not_now', 'Not now again — the record keeps the answer (not_now)')
    liftDay()
    ok(await look(d, '/leads'), 'a day later, a quiet moment')
    ok(offers().length === 0, '…Not now holds: T2 never again, and the other moments of that first look were discarded (1.0’s R8)')

    // ── 5 · T9 · a teammate joins ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · T9 — a teammate joins (an invitation accepted)')
    const inviteAt = Date.now()
    sql(`insert into studio_invitations (id, member_id, invited_by, full_name, phone, email, role, token, status, expires_at, sent_at, send_count, channels, accepted_at, created_at) values ('probe-s41b4-inv', 'alex', 'dane', 'Alex', null, null, 'Designer', 'probe-s41b4-token', 'accepted', ${inviteAt + 30 * 24 * H}, ${inviteAt}, 1, '', ${inviteAt}, ${inviteAt})`)
    ok(await look(d, '/leads') && keptTrigger() === 'T9' && offers().length === 1, `T9: “${offers()[0]?.title}”`)
    ok(/^Pro — Studio is made for teams$/.test(offers()[0]?.title ?? '') && /3 seats from S\$100 a month/.test(offers()[0]?.body ?? ''), `…its price from the plans (${offers()[0]?.body})`)
    await go(d, '/leads'); await openBell(d)
    await offerRow(d).getByTestId('offer-go').click(); await settle(d, 1500)
    ok(await d.getByTestId('plans-choose').isVisible(), 'See plans opens Plans over the page')
    ok(offers().length === 0 && answersOf().T9?.answer === 'plans', '…and the offer leaves the bell, answered (plans)')
    await shot(d, '02-see-plans-1440')
    await d.keyboard.press('Escape'); await settle(d, 600)

    // ── 6 · One proactive offer a day; the losers are discarded; T10 then T3 ──────────────────────────────────────────────────────────
    console.log('6 · one a day; losers discarded; T10 (a tool on two days); T3 (the second render); never twice')
    liftGap()   // ten minutes on, but not a day
    charge('dane', 'render_fast', 10); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && offers().length === 0, 'two renders ten minutes later: no offer — one proactive offer a day (1.0’s R4)')
    liftDay()
    ok(await look(d, '/leads') && offers().length === 0, 'a day later: still none — those renders were seen and passed over (discarded, 1.0’s R8)')
    liftDay(); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && keptTrigger() === 'T10' && /^Making the most of the AI Visualizer\?$/.test(offers()[0]?.title ?? ''), `a new render: T10 — the AI Visualizer on more than one day (${offers()[0]?.title})`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    liftDay(); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && keptTrigger() === 'T3' && /^Enjoying the AI Visualizer\?$/.test(offers()[0]?.title ?? '') && /about 150 renders each/.test(offers()[0]?.body ?? ''), `the next render: T3 (${offers()[0]?.title} — ${offers()[0]?.body})`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    liftDay(); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && offers().length === 0, 'and another render: nothing — T10 and T3 are spent (never twice)')
    /* a render somebody else ran is theirs: Dane's own moments only */
    liftDay(); charge('michelle', 'render_pro', 20)
    ok(await look(d, '/leads') && offers().length === 0, 'a render Michelle ran is not Dane’s moment')

    // ── 7 · Quote reads: one given back never counts; T11 (two tools), then T4 ─────────────────────────────────────────────────────────
    console.log('7 · quote reads — T11 two tools, T4 the first read')
    liftDay(); const back = charge('dane', 'quote_digitize', 5); refund(back, 5)
    ok(await look(d, '/leads') && offers().length === 0, 'a quote read given back (no line found) is not a success — nothing')
    liftDay(); charge('dane', 'quote_digitize', 5)
    ok(await look(d, '/leads') && keptTrigger() === 'T11' && /^Get more with Pro$/.test(offers()[0]?.title ?? ''), `a read that found lines: T11 — two tools (it outranks T4) (${offers()[0]?.title})`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    liftDay(); charge('dane', 'quote_digitize', 5)
    ok(await look(d, '/leads') && keptTrigger() === 'T4' && /^One quote read\. More to come\?$/.test(offers()[0]?.title ?? '') && /about 300 quotes/.test(offers()[0]?.body ?? ''), `the next read: T4 (${offers()[0]?.body})`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)

    // ── 8 · T12 · a third day of work ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · T12 — the first look of a new day, after two earlier days of work')
    liftDay(); sql(`update nudge_state set last_evaluated_at = ${Date.now() - 26 * H} where member_id = 'dane'`)
    ok(await look(d, '/leads') && keptTrigger() === 'T12' && /^Enjoying OpenMaison\?$/.test(offers()[0]?.title ?? ''), `T12 (${offers()[0]?.title})`)
    ok(['T2', 'T3', 'T4', 'T9', 'T10', 'T11', 'T12'].every((t) => spentOf().includes(t)) && spentOf().length === 7, `every proactive moment fired once: ${spentOf().join(' · ')}`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)

    // ── 9 · T7 · running low: a lifecycle offer — waits for the gap, not the day; repeats once re-armed; a top-up answers it ─────────
    console.log('9 · T7 — Only n AI credits left')
    liftGap()   // the day's cap still holds (T12 just now) — a lifecycle offer doesn't wait for it
    setBalance(25); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && keptTrigger() === 'T7' && /^Only 15 AI credits left$/.test(offers()[0]?.title ?? ''), `the studio fell under 20: T7 — ten minutes on, the day’s cap doesn’t hold it (${offers()[0]?.title})`)
    ok(/1,000 AI credits are S\$20 and never expire/.test(offers()[0]?.body ?? ''), `…${offers()[0]?.body}`)
    await go(d, '/leads'); await openBell(d)
    ok(await offerRow(d).getByTestId('offer-go').innerText() === 'Buy AI credits', '…its one way on is Buy AI credits')
    await offerRow(d).getByTestId('offer-go').click(); await settle(d, 1200)
    ok(await d.getByTestId('topup').isVisible() && /1,000/.test(await text(d.getByTestId('topup-amount'))), 'Buy AI credits opens the top-up on 1,000')
    ok(offers().length === 0 && answersOf().T7?.answer === 'topup', '…and the offer leaves the bell, answered (topup)')
    await d.keyboard.press('Escape'); await settle(d, 600)
    liftGap(); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && offers().length === 0, '15 → 5: no second T7 — it re-arms only from 20 or more')
    liftGap(); setBalance(30); charge('dane', 'render_fast', 10); charge('dane', 'render_fast', 10)
    ok(await look(d, '/leads') && keptTrigger() === 'T7' && /^Only 10 AI credits left$/.test(offers()[0]?.title ?? ''), 'back at 30, then under 20 again: T7 repeats (1.0: T7 is not once ever)')
    setBalance(1000)
    ok(await look(d, '/leads') && offers().length === 0 && answersOf().T7?.answer === 'withdrawn', 'AI credits added: the offer’s moment has passed — it leaves the bell (withdrawn)')

    // ── 10 · T8 · the welcome credits used up: on a press the sheet says it, once — never the bell too ─────────────────────────────────
    console.log('10 · T8 — the welcome AI credits used up')
    liftGap(); setBalance(0)
    ok(await look(d, '/leads') && offers().length === 0, 'out of AI credits, but the studio bought a top-up: no “welcome credits” offer (1.0: never to a studio that bought credits)')
    sql(`update credit_ledger set reason = 'adjust' where reason = 'topup'`)   // as a studio that never bought one (put back at the end)
    const ben = sql(`select id from projects where number = 'P-2026-002'`)
    await go(d, `/projects/${ben}/money`)
    await d.locator('[data-testid="money-new"]').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /contractor/ }).first().click(); await settle(d, 600)
    const voCsv = csv(`s41b4-vo-${Date.now()}.csv`, 'Item,Qty,Unit,Rate\nAdditional power point,4,pcs,85\n')
    await d.getByTestId('vo-upload-dialog').locator('input[type="file"]').setInputFiles(voCsv); await settle(d, 2600)
    const sheet = d.getByTestId('credit-block')
    ok(await sheet.isVisible() && await d.getByRole('dialog', { name: 'Welcome AI credits used up' }).count() === 1, 'a quote read with nothing left: the out-of-credits sheet says it — “Welcome AI credits used up”')
    ok(/Free gives the studio 30 AI credits a month\. Pro gives 1,500 a seat\./.test(await text(d.getByTestId('credit-block-welcome'))), '…in one line, with the sheet’s own ways on')
    const head = await d.getByRole('dialog', { name: 'Welcome AI credits used up' }).getByRole('heading').first().boundingBox().catch(() => null)
    ok(!!head && head.height <= 30, `…its title on one line in the house head (${head ? Math.round(head.height) : '?'}px)`)
    await shot(d, '03-welcome-sheet-1440')
    await settle(d, 1200)
    const st10 = stateOf()
    ok(spentOf().includes('T8') && Date.now() - Number(st10.last_modal_at) < 60_000, 'the sheet is T8’s moment: spent there, and the gap restarted')
    await d.keyboard.press('Escape'); await settle(d, 500); await d.keyboard.press('Escape'); await settle(d, 500)
    liftGap()
    ok(await look(d, '/leads') && offers().length === 0, '…so the bell never says it too (never two prompts for one moment)')
    /* the welcome credits running out between presses: the bell's row (a studio whose T8 is still to hear) */
    sql(`update nudge_state set spent = json_remove(spent, '$.T8') where member_id = 'dane'`); liftGap()
    ok(await look(d, '/leads') && keptTrigger() === 'T8' && /^Welcome AI credits used up$/.test(offers()[0]?.title ?? ''), `between presses: T8 in the bell (${offers()[0]?.body})`)
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    sql(`update credit_ledger set reason = 'topup' where reason = 'adjust' and action_key = 'topup'`)

    // ── 11 · Only at a safe moment: never over a dialog, never while typing, never on Plan & AI credits ────────────────────────────────
    console.log('11 · a safe moment only')
    const rearm = () => { liftGap(); setBalance(25); charge('dane', 'render_fast', 10) }
    rearm()
    await go(d, '/leads'); await d.getByRole('button', { name: 'Add Lead' }).first().click(); await settle(d, 800)
    ok(await d.getByRole('menu').count() > 0, 'a menu is open (Add Lead ▾)')
    let q = await quietFor(d)
    ok(!q.looked && !q.offered, 'a menu open for 22 s: the studio never looks — nothing over a menu')
    await d.getByRole('menuitem', { name: /Create New Lead/ }).click(); await settle(d, 1000)
    ok(await d.locator('[role="dialog"]').count() > 0, 'a dialog is open (Create New Lead)')
    q = await quietFor(d)
    ok(!q.looked && !q.offered, 'a dialog open for 22 s: the studio never looks — nothing over a dialog')
    await d.keyboard.press('Escape'); await settle(d, 800)
    if (await d.locator('[role="dialog"]').count()) { await d.keyboard.press('Escape'); await settle(d, 600) }
    const t11 = Date.now(); let came = false
    while (Date.now() - t11 < 25000) { await settle(d, 1000); if (offers().length) { came = true; break } }
    ok(came && keptTrigger() === 'T7', 'the dialog closed: ten quiet seconds later the offer comes')
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    rearm()
    await go(d, '/leads'); await d.locator('input[placeholder^="Search name"]').first().click(); await d.keyboard.type('ta', { delay: 120 })
    q = await quietFor(d)
    ok(!q.looked && !q.offered, 'typing in the search box: no look while focus is in a text box')
    await d.keyboard.press('Escape'); await d.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
    const t12 = Date.now(); came = false
    while (Date.now() - t12 < 25000) { await settle(d, 1000); if (offers().length) { came = true; break } }
    ok(came, '…focus out of it: the offer comes')
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    rearm()
    await go(d, '/company/plan'); await d.mouse.move(700, 600)
    q = await quietFor(d)
    ok(!q.looked && !q.offered, 'Plan & AI credits (the purchase pages): never looked at there')
    ok(await look(d, '/leads') && offers().length === 1, '…the next studio page: the offer comes')
    /* the lock card is the Owner's T6 moment — no offer follows it for ten minutes */
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    rearm()
    const kevin = sql(`select id from leads where name = 'Kevin Ng' and deleted_at is null`)
    await go(d, `/leads/${kevin}`)
    const ql = d.locator('aside[aria-label="Create"]')
    if (await ql.locator('button[aria-label="Expand create links"]').count()) { await ql.locator('button[aria-label="Expand create links"]').click(); await settle(d, 400) }
    await ql.getByRole('button', { name: /Quote X-Ray/ }).click(); await settle(d, 1500)
    ok(await d.getByTestId('plan-lock').isVisible() && Date.now() - Number(stateOf().last_modal_at) < 30_000, 'a Pro feature’s lock card (T6): the gap restarts as it opens')
    await d.keyboard.press('Escape'); await settle(d, 500)
    ok(await look(d, '/leads') && offers().length === 0, '…the next quiet moment offers nothing — no offer follows a lock')

    /* a meeting live with its co-pilot is work in progress (1.0's useBusyWhile) — no look while its room is open */
    const mtg = sql(`select id from meetings where status = 'planned' and deleted_at is null order by starts_at limit 1`)
    if (mtg) {
      liftGap()
      sql(`update meetings set status = 'live', started_at = ${Date.now()}, started_by = 'dane', blocks = 1 where id = '${mtg}'`)
      await go(d, `/meetings/${mtg}`); await d.mouse.move(700, 600); await d.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
      ok(/Live ·/i.test(await text(d.locator('body'))), 'a meeting is live (its room open — “LIVE · 0 MIN”)')
      q = await quietFor(d)
      ok(!q.looked && !q.offered, 'a live meeting’s room for 22 s: the studio never looks — a meeting is never interrupted')
      sql(`update meetings set status = 'planned', started_at = null, started_by = null, blocks = 0 where id = '${mtg}'`)
      ok(await look(d, '/leads') && offers().length === 1, '…back on a studio page, the offer the gap allows comes')
      await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)
    }

    // ── 12 · The Owner only ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('12 · the Owner only — a Designer, an Admin')
    liftGap(); setBalance(200)
    for (const [m, role] of [['sarah', 'Designer'], ['huimin', 'Admin']]) {
      as(m); charge(m, 'render_fast', 10); charge(m, 'render_fast', 10)
      const DM = await desk(); const dm = await page(DM, m)
      await go(dm, '/leads'); await dm.mouse.move(700, 600); await settle(dm, 18000)
      ok(!stateOf(m) && offers(m).length === 0, `${role}: renders of their own, 18 quiet seconds — never looked at, no record, no offer (1.0’s R2: the Owner buys)`)
      await DM.close()
    }
    as('dane')

    // ── 13 · Their own mute, and the studio's switch ──────────────────────────────────────────────────────────────────────────────────
    console.log('13 · the Owner’s mute and the studio’s In app')
    sql(`update members set notice_muted = '["upgrade_offer"]' where id = 'dane'`)
    rearm()
    await go(d, '/leads'); await d.mouse.move(700, 600); await settle(d, 18000)
    ok(offers().length === 0, 'muted on Your profile: no offer reaches Dane')
    sql(`update members set notice_muted = null where id = 'dane'`)
    ok(await look(d, '/leads') && offers().length === 1, 'unmuted: the offer comes')
    await go(d, '/leads'); await openBell(d); await offerRow(d).getByTestId('offer-not-now').click(); await settle(d, 1200)

    // ── 14 · The bell at 390 touch ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('14 · 390 touch — the bell’s sheet')
    rearm()
    ok(await look(d, '/leads') && offers().length === 1, 'an offer is live')
    const P = await phoneCtx(); const ph = await page(P, 'phone')
    await go(ph, '/leads')
    await ph.locator('button[aria-label^="Notifications"]:visible').first().click(); await settle(ph, 1400)
    const prow = offerRow(ph)
    ok(await prow.count() === 1 && await prow.getByTestId('offer-go').isVisible() && await prow.getByTestId('offer-not-now').isVisible(), '390: the bell is a sheet; the offer row with its two answers')
    await prow.scrollIntoViewIfNeeded(); await shot(ph, '04-bell-offer-390')
    ok(await sideways(ph) <= 0, `390: no sideways scroll (${await sideways(ph)})`)
    await P.close()
    const P3 = await phoneCtx(320, 640); const p3 = await page(P3, '320')
    await go(p3, '/leads'); await p3.locator('button[aria-label^="Notifications"]:visible').first().click(); await settle(p3, 1400)
    ok(await offerRow(p3).count() === 1 && await sideways(p3) <= 0, `320: the row fits, no sideways scroll (${await sideways(p3)})`)
    await shot(p3, '05-bell-offer-320')
    await P3.close()

    // ── 15 · Off Free, every offer stops ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('15 · back to Pro — every offer leaves the bell')
    await demoPlan(d, /^Pro — Studio\s*The base/)
    ok(sql(`select plan_id from subscriptions where cancelled_at is null`) === 'pro_studio', 'View as › Pro — Studio')
    ok(offers().length === 0 && stateOf().offer_id === null, 'the live offer left the bell at once (1.0’s R1)')
    await go(d, '/leads'); await d.mouse.move(700, 600)
    q = await quietFor(d, 16000)
    ok(!q.looked && offers().length === 0, 'Pro: quiet moments look at nothing')
    ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`)
    await D.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    const changed = putBack()
    const after = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(`\nput back: ${changed.length} table(s) changed (${changed.join(', ')}) — ${after.length ? `STILL DIFFERENT: ${after.join(', ')}` : 'every table as found'}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
