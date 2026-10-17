// Projects bug audit 2026-10-06, package F — the client portal as the client lives in it. Asserts the rules the Majors broke: the household's
// actions under their own name (Schedule · Choices · Money · the refusal · Activity · the studio's "Seen by"), the bell's phone sheet above the
// phone bar, the tablet bar fitting, a shown file opening in a new tab with pages (and leaving What needs you once opened), a part payment's
// receipt, how to pay on a phone (a picture QR, Copy), board 7's Money card, the questions page in the client's words; plus the demo's boards
// (3 · 6 · Designs), the way back after signing in, a not-theirs id's notice, the contact line to a mobile. Phone 390 and desk 1440.
// Run against `next start` on a FRESH copy of the repaired scratch DB — never local.db. What it changes is put back in `finally`.
// Usage: BASE=http://localhost:<port> NODE_PATH=<repo>/node_modules node verify-pj-fix-F.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'fix-F')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3125'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const n = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const leadId = (name) => sql(`select id from leads where name='${name.replace(/'/g, "''")}' and deleted_at is null`)
const PHONE = { ben: '97731968', wife: '91827364', ryan: '97551246', serena: '98230785', kevin: '96882109' }
const BEN = leadId('Benjamin Han'), SERENA = leadId('Serena Koh'), KEVIN = leadId('Kevin Ng')
const BEN_P = sql(`select id from projects where lead_id='${BEN}'`)
const WIFE_H = sql(`select homeowner_id from homeowner_household_links where lead_id='${BEN}'`)
const EL = sql(`select id from project_milestones where project_id='${BEN_P}' and title like 'Electrical%'`)
const PAINT = sql(`select id from project_selections where project_id='${BEN_P}' and title like 'Paint%'`)
const KITCHEN = sql(`select id from project_updates where project_id='${BEN_P}' and title like 'Kitchen cabinets%'`)
const PLAN = sql(`select id from lead_files where lead_id='${BEN}' and name like 'Floor plan%' and kind <> 'folder'`)   /* (gaps build E, REG-e.10) the starter folder "Floor plans" shares the name's start */
const MID = sql(`select id from project_invoices where project_id='${BEN_P}' and status='sent' order by sent_at desc limit 1`)
const T0 = Math.floor(Date.now() / 1000)
const STUB = `(() => { window.__wa = []; const o = window.open.bind(window); window.open = (u, ...a) => { if (String(u).startsWith('https://wa.me')) { window.__wa.push(String(u)); return null } return o(u, ...a) } })()`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const ctx = async (o) => { const c = await b.newContext(o); await c.addInitScript(STUB); return c }
  const desk = () => ctx({ viewport: { width: 1440, height: 1024 } })
  const phone = () => ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const signIn = async (p, num, from = '/my/demo-studio/login') => {
    await go(p, from)
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

  try {
    // ── Benjamin, at a desk: his schedule open before Mei Ling answers (the refusal), board 7's Money card, the contact line, board 3 ─────
    /* Mei Ling signs in first: her home's Latest update is the newest one, still unopened — she is the one who opens it (C-07) */
    const W = await phone(); const w = await W.newPage(); watch(w, 'wife')
    await signIn(w, PHONE.wife)
    await w.locator('[data-testid="portal-latest-update"]').scrollIntoViewIfNeeded().catch(() => {}); await settle(w, 1800)
    ok(sql(`select client_opened_by from project_updates where id='${KITCHEN}'`) === WIFE_H, 'C-07 the update she opened records her as the one who opened it')

    console.log('Benjamin at a desk (1440)')
    const D = await desk(); const d = await D.newPage(); watch(d, 'ben-desk')
    await signIn(d, PHONE.ben)
    const money = d.locator('[data-testid="portal-home-money"]')
    ok(await money.count() === 1 && /Paid so far/.test(await money.innerText()) && /is due/.test(await money.innerText()), 'F-09 board 7’s Money card on the home: Paid so far and what is due')
    const contact = d.locator('[data-testid="portal-contact"] a').first()
    ok(/Message Germaine on WhatsApp/.test(await contact.innerText()) && /wa\.me\/6596614208/.test(await contact.getAttribute('href') ?? ''), 'F-13 the contact line reaches the designer’s mobile, by name')
    const fileNeed = d.locator('[data-testid="portal-need"][data-kind="file"]')
    ok(await fileNeed.count() === 1 && await fileNeed.getAttribute('target') === '_blank', 'F-06 · F-24 a new file opens in a new tab — the portal stays put')
    await shot(d, 'home-money-card-1440')
    await go(d, '/my/demo-studio/updates')
    ok(await d.locator('[data-testid="portal-update-confirm"]').count() >= 1, 'F-38 board 3: an update on the stage waiting for him carries “Confirm this stage”')
    ok(await d.locator('[data-testid="portal-updates"]').evaluate((el) => el.parentElement?.querySelector('[data-testid="portal-contact"]') !== null), 'C’s note: Updates at a desk is the split page — the designer line beside the feed')
    await shot(d, 'updates-split-1440')
    await go(d, '/my/demo-studio/schedule')   // left open: Mei Ling answers first, then his press is refused by name

    // ── Mei Ling on her phone: she confirms, picks, says she paid; the bell's sheet above the phone bar ─────────────────────────────────
    console.log('Mei Ling on her phone (390)')
    await go(w, '/my/demo-studio')
    await w.locator('[data-testid="portal-bell"]').click(); await settle(w, 1200)
    const rows = w.locator('[data-testid="portal-bell-row"]')
    if (await rows.count()) {
      const last = rows.last()
      await last.scrollIntoViewIfNeeded()
      const hit = await last.evaluate((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && el.contains(t) })
      ok(hit, 'F-01 the bell’s phone sheet sits above the phone bar — its last row takes the press')
    } else ok(false, 'F-01 her bell has rows')
    const old = await w.locator('[data-testid="portal-bell-row"]').evaluateAll((els) => els.filter((e) => e.hasAttribute('data-unread')).length)
    ok(old < await rows.count(), 'F-16 her bell starts at her invite — the rows from before it read as read')
    await shot(w, 'bell-sheet-390')
    await w.keyboard.press('Escape'); await settle(w, 500)
    await go(w, '/my/demo-studio/schedule')
    await w.locator('[data-testid="portal-confirm-yes"]').first().click(); await settle(w, 1500)
    ok(sql(`select confirm_answered_by from project_milestones where id='${EL}'`) === WIFE_H, 'she confirms Electrical & plumbing — recorded as hers')
    await go(w, '/my/demo-studio/schedule')
    ok(/You confirmed it/.test(await w.locator(`[data-stage-id="${EL}"]`).innerText()), 'F-03 her own answer reads “You confirmed it” for her')
    await go(w, `/my/demo-studio/choices?open=${PAINT}`)
    const paint = w.locator(`[data-choice-id="${PAINT}"]`)
    await settle(w, 1200)   // the ?open= pulse has scrolled the card to the top
    await paint.locator('[data-testid="portal-choice-option"]').first().click(); await settle(w, 1400)
    const confirmBox = await paint.locator('[data-testid="portal-choice-confirm"]').boundingBox()
    ok(!!confirmBox && confirmBox.y + confirmBox.height <= 844 - 70, 'F-25 a pick brings Confirm into reach on a phone — above the phone bar')
    await paint.locator('[data-testid="portal-choice-confirm"]').click(); await settle(w, 1600)
    ok(sql(`select chosen_homeowner_id from project_selections where id='${PAINT}'`) === WIFE_H, 'her pick records who picked it (chosen_homeowner_id)')
    await go(w, `/my/demo-studio/money?open=${MID}`)
    ok(/\?open=/.test(w.url()) === false, 'F-17 Money reads ?open= and puts its address back')
    const pay = w.locator('[data-testid="portal-pay-box"]').first()
    ok(await pay.locator('img[data-testid="paynow-qr"]').count() === 1, 'F-08 the PayNow QR is a picture (it saves on a long press)')
    ok(await pay.locator('[data-testid="portal-copy-reference"]').count() === 1 && await pay.locator('[data-testid="portal-copy-amount"]').count() === 1, 'F-08 the reference and the amount carry Copy')
    await pay.locator('[data-testid="portal-qr-open"]').click(); await settle(w, 900)
    ok(await w.getByRole('dialog').count() >= 1, 'F-08 the QR opens large on a tap')
    await w.keyboard.press('Escape'); await settle(w, 1000)
    await shot(w, 'money-paybox-390', true)
    /* F-35 on a page fresh from its load (Chromium's emulated "hover: none" drifts after a long run of presses in one page) */
    { const w2 = await W.newPage(); watch(w2, 'wife-2'); await go(w2, '/my/demo-studio/money')
      await w2.locator('[data-testid="portal-i-have-paid"]').first().click(); await settle(w2, 1000)
      const proofText = await w2.locator('[data-testid="proof-field"]').last().innerText()
      ok(/Add a screenshot or PDF/.test(proofText), `F-35 the proof box speaks to a touch screen${/Add a screenshot/.test(proofText) ? '' : ` — read: ${JSON.stringify(proofText.slice(0, 80))} · hover:none=${await w2.evaluate(() => matchMedia('(hover: none)').matches)}`}`)
      await shot(w2, 'i-have-paid-390'); await w2.close() }
    await w.locator('[data-testid="portal-i-have-paid"]').first().click(); await settle(w, 900)
    await w.locator('[data-testid="proof-field"]').last().waitFor({ timeout: 5000 }).catch(() => {}); await settle(w, 400)
    await w.locator('[data-testid="proof-field"] input[type="file"]').setInputFiles(path.join(process.cwd(), 'public/uat-files/paynow-qr.png')); await settle(w, 900)
    await w.locator('[data-testid="portal-paid-send"]').click(); await settle(w, 2200)
    const paid = sql(`select id from project_payments where submitted_by='${WIFE_H}' and created_at >= ${T0} limit 1`)
    ok(!!paid, 'her “I have paid” is recorded as hers')
    ok(sql(`select json_extract(detail,'$.person') from lead_events where kind='project_payment_submitted' and json_extract(detail,'$.id')='${paid}'`) === 'Mei Ling Han', 'F-04 the event carries her name')

    // ── Benjamin reads what she did — under her name; his stale press is refused by name ──────────────────────────────────────────────
    console.log('Benjamin reads it (1440)')
    await d.locator('[data-testid="portal-confirm-yes"]').first().click(); await settle(d, 1400)
    ok(/Mei Ling has already answered for this stage/.test(await snack(d).innerText()), 'F-03 his stale press is refused by name — “Mei Ling has already answered”')
    await go(d, '/my/demo-studio/schedule')
    ok(/Mei Ling confirmed it/.test(await d.locator(`[data-stage-id="${EL}"]`).innerText()) && !/You confirmed it/.test(await d.locator(`[data-stage-id="${EL}"]`).innerText()), 'F-03 Schedule: “Mei Ling confirmed it”, never “You”')
    await go(d, '/my/demo-studio/choices')
    const chosen = await d.locator(`[data-choice-id="${PAINT}"] [data-testid="portal-choice-chosen"]`).innerText()
    ok(/Mei Ling chose /.test(chosen) && !/You chose/.test(chosen), 'F-03 Choices: “Mei Ling chose …”')
    ok(/You chose /.test(await d.locator('[data-testid="portal-choice-chosen"]').allInnerTexts().then((t) => t.join(' | '))), '…and his own pick still reads “You chose”')
    await go(d, '/my/demo-studio/money')
    ok(/Mei Ling told Demo Studio about a payment/.test(await d.locator('[data-testid="portal-pay-waiting"]').allInnerTexts().then((t) => t.join(' '))), 'F-03 Money: “Mei Ling told Demo Studio about a payment …”')
    await shot(d, 'household-names-money-1440')
    // the studio's records
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio')
    /* (one-home N-10, a deliberate change of this rule) a Won lead's Activity is its project's tab once the project is live — the lead's address
       redirects there; read it where it lives */
    await go(s, `/projects/${BEN_P}/activity`); await settle(s, 800)
    ok(/Mei Ling Han, from Benjamin Han’s household, said they paid/.test(await s.locator('main').innerText()), 'F-04 Activity: her payment under her name')
    await go(s, `/projects/${BEN_P}/updates`); await settle(s, 800)
    ok(/Seen by Mei Ling/.test(await s.locator('main').innerText()), 'C-07 the studio card: “Seen by Mei Ling” for the update she opened')
    await shot(s, 'studio-seen-by-1440')

    // ── A shown file: its pages, then not new once opened ────────────────────────────────────────────────────────────────────────────
    const f = await d.request.get(BASE + `/my/demo-studio/file/${PLAN}`, { headers: { accept: 'text/html' } })
    ok(f.status() === 200 && /application\/pdf/.test(f.headers()['content-type'] ?? ''), 'F-06 the floor plan opens its pages (a PDF), not a bare icon')
    await go(d, '/my/demo-studio')
    ok(await d.locator('[data-testid="portal-need"][data-kind="file"]').count() === 0, 'F-14 once opened, the file leaves What needs you')
    const gone = await d.request.get(BASE + '/my/demo-studio/money/invoice/not-an-invoice')
    ok(/This isn’t on your page any more/.test(await gone.text()) && /Back to Money/.test(await gone.text()), 'F-23 another id: the portal’s notice with Back to Money — never a bare 404')

    // ── Ryan on his phone: a part payment's receipt ──────────────────────────────────────────────────────────────────────────────────
    console.log('Ryan (390)')
    const R = await phone(); const r = await R.newPage(); watch(r, 'ryan')
    await signIn(r, PHONE.ryan)
    await go(r, '/my/demo-studio/money')
    const part = r.locator('[data-testid="portal-pay-part"]')
    ok(await part.count() >= 1 && /Receipt/.test(await part.first().innerText()), 'F-07 a part payment confirmed keeps its line and its Receipt in the due block')
    ok(!/Your signed quote S\$[\d,]+ [+−]/.test(await r.locator('[data-testid="portal-paid"]').innerText()) || /\.\d\d/.test(await r.locator('[data-testid="portal-paid-parts"]').innerText()), 'F-33 the contract’s parts in cents')
    await shot(r, 'ryan-part-receipt-390', true)

    // ── Signed out: back to the page asked for ───────────────────────────────────────────────────────────────────────────────────────
    console.log('The way back after signing in')
    const O = await phone(); const o = await O.newPage(); watch(o, 'out')
    await go(o, '/my/demo-studio/schedule')
    ok(/\/login\?next=/.test(o.url()), 'F-20 a signed-out deep link goes to sign in carrying the page')
    await signIn(o, PHONE.ben, o.url().replace(BASE, ''))
    ok(/\/my\/demo-studio\/schedule$/.test(o.url()), '…and comes back to it after the code')
    await go(o, '/my/DEMO-STUDIO/files')
    ok(/\/my\/demo-studio\/files$/.test(o.url()), 'F-22 the address in capitals opens the same page')
    ok(/^Files$/.test((await o.locator('h1').first().innerText()).trim()), 'F-30 Files heads with the tab’s word')

    // ── Board 6 (Serena) and Designs (Kevin) ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Board 6 · Designs')
    const V = await phone(); const v = await V.newPage(); watch(v, 'serena')
    await signIn(v, PHONE.serena)
    ok(await v.locator('[data-testid="portal-step"]').count() >= 2, 'F-38 board 6: Serena’s steps before work starts (questions, her quote)')
    ok(await v.locator('[data-testid="portal-need"][data-kind="questions"]').count() === 0, 'F-36 What needs you leaves the current step’s ask to the step')
    await shot(v, 'before-work-starts-390', true)
    await v.locator('[data-testid="portal-step"][data-step="questions"] a').first().click(); await v.waitForURL(/\/questions\//).catch(() => {}); await settle(v, 1600)
    const labels = (await v.locator('[data-testid="portal-question"]').allInnerTexts()).join(' | ')
    ok(!/Single select|Multi select|\bText\b|\bDate\b/.test(labels) && /Your answer|Pick one/.test(labels), 'F-05 the questions page labels its fields in the client’s words')
    const sendBox = await v.locator('[data-testid="portal-send-answers"]').boundingBox()
    ok(!!sendBox && sendBox.width > 300, 'F-44 “Send my answers” is the full-width primary on a phone')
    await shot(v, 'questions-390', true)
    const K = await desk(); const k = await K.newPage(); watch(k, 'kevin')
    await signIn(k, PHONE.kevin)
    await go(k, '/my/demo-studio/designs')
    ok(await k.locator('[data-testid="portal-design-link"]').count() >= 1, 'F-38 Designs: Kevin’s shared designs open on his portal')

    // ── The tablet bar ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The tablet bar')
    for (const [wd, touch] of [[768, true], [834, false], [1024, false]]) {
      const T = await ctx({ viewport: { width: wd, height: 1024 }, isMobile: touch, hasTouch: touch }); const t = await T.newPage(); watch(t, `tab${wd}`)
      await signIn(t, PHONE.ben)
      const so = await t.locator('[data-testid="portal-sign-out"]').boundingBox()
      ok(await noOverflow(t) && !!so && so.x + so.width <= wd, `F-02 ${wd}: no sideways scroll, Sign out on screen`)
      if (wd === 768) await shot(t, 'tablet-bar-768')
      await T.close()
    }
    ok(!errors.length, `no page errors${errors.length ? `: ${errors.join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 300))
  } finally {
    // put back what it changed (the copy is thrown away after, but the rule is to leave it as found)
    const paidIds = sql(`select group_concat(quote(id)) from project_payments where created_at >= ${T0}`)
    if (paidIds) {
      sql(`delete from lead_files where id in (select proof_file_id from project_payments where id in (${paidIds}))`)
      sql(`delete from lead_events where kind like 'project_payment_%' and json_extract(detail,'$.id') in (${paidIds})`)
      sql(`delete from project_payments where id in (${paidIds})`)
    }
    sql(`update project_milestones set confirm_answer=null, confirm_note=null, confirm_answered_at=null, confirm_answered_by=null where id='${EL}' and confirm_answered_at >= ${T0}`)
    sql(`delete from lead_events where at >= ${T0} and kind in ('project_stage_confirmed','project_choice_chosen','portal_opened','household_opened')`)
    sql(`update project_selections set status='shared', chosen_option_id=null, chosen_by=null, chosen_homeowner_id=null, chosen_at=null, chosen_note=null where id='${PAINT}' and chosen_at >= ${T0}`)
    /* (simplify S-21) a priced pick on the portal drafts its variation order: its line and its record go with it */
    sql(`delete from quote_items where quote_id in (select id from quotes where selection_id='${PAINT}' and created_at >= ${T0})`)
    sql(`delete from lead_events where kind='project_vo_created' and at >= ${T0}`)
    sql(`delete from quotes where selection_id='${PAINT}' and created_at >= ${T0}`)
    sql(`update project_updates set client_opened_at=null, client_opened_by=null where client_opened_at >= ${T0}`)
    sql(`delete from portal_bell_reads where read_at >= ${T0}`)
    sql(`delete from notifications where created_at >= ${T0}`)
    sql(`update homeowner_lead_links set opened_at=null where opened_at >= ${T0}`)
    sql(`update homeowner_lead_links set last_opened_at=opened_at where last_opened_at >= ${T0}`)
    sql(`update homeowner_household_links set last_opened_at=opened_at where last_opened_at >= ${T0}`)
    sql(`update homeowner_lead_links set schedule_seen_at=null where schedule_seen_at >= ${T0}`)
    sql(`update homeowner_household_links set schedule_seen_at=null where schedule_seen_at >= ${T0}`)
    sql(`delete from portal_sessions where created_at >= ${T0}`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
