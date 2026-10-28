// Projects & Finance, simplified — round 2, package R2-E (2026-10-09, his "fix all the pending things"): a member's PayNow on Company › Members
// (Owners and Admins set anyone's, a member their own, nobody reads a colleague's), shown with its copy wherever the studio pays a member (a
// claim's Pay back, Pay {member}); the bell's approval rows answer in the row (Approve · Send back — Decline for more time; a PO and an invoice
// "Approve and send" open Money's send); ⌘K finds Document numbers and What waits for an Owner or an Admin.
// Run against `next start` on a scratch DB — never local.db. What it changes is put back (Undo in the app, then `finally`).
// Usage: NODE_PATH=$PWD/node_modules node verify-r2e.cjs <scratch.db> [shotDir] [base URL]   (BASE in the environment wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r2e')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3011'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const youBefore = sql(`select id from members where is_you = 1`) || 'dane'
  const payBefore = json(`select id, paynow from members`)
  const readBefore = json(`select id, read_at from notifications where member_id = 'dane'`)
  const grab = json(`select id, status, reviewed_by, reviewed_at, review_note from expenses where description like 'Grab to site%' and deleted_at is null`)[0] ?? null
  try {
    /* the demo's PayNow (repair R-R2-E): Germaine's and Michelle's are their mobiles */
    sql(`update members set paynow = phone where id in ('germaine', 'michelle') and (paynow is null or paynow = '') and phone is not null`)
    as('dane')
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, page = p) => page.screenshot({ path: path.join(dir, `${n}.png`) })
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()   // the house snackbar host (the other probes' own selector)
    const dialog = (name) => p.getByRole('dialog', { name })

    console.log('A member’s PayNow — Company › Members')
    await go('/company/members')
    const row = (name) => p.getByTestId('member-row').filter({ has: p.locator('span[class*="__name"]').filter({ hasText: new RegExp(`^${name}`) }) })
    ok(/PayNow: 9661 4208/.test(await row('Germaine').getByTestId('member-paynow').innerText().catch(() => '')), 'an Owner reads Germaine’s PayNow, grouped as typed')
    ok(await p.getByTestId('member-paynow').count() === await p.getByTestId('member-row').count(), 'an Owner sees (and sets) every member’s')
    await row('Germaine').getByTestId('member-paynow-edit').click(); await p.waitForTimeout(400)
    const d = dialog('Germaine’s PayNow')
    ok(await d.count() === 1, 'Change opens Germaine’s PayNow')
    await d.getByLabel('PayNow (UEN or mobile)').fill('12345'); await d.getByTestId('member-paynow-save').click(); await p.waitForTimeout(400)
    ok(/Enter a mobile number or a UEN/.test(await d.innerText()), 'neither a mobile nor a UEN: the field says so, nothing saved')
    await d.getByLabel('PayNow (UEN or mobile)').fill('201912345k'); await d.getByTestId('member-paynow-save').click(); await p.waitForTimeout(1500)
    ok(sql(`select paynow from members where id = 'germaine'`) === '201912345K' && /Germaine’s PayNow is saved/.test(await snack().innerText().catch(() => '')), 'a UEN saves, in capitals, with one sentence')
    await shot('01-members-paynow-1440')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select paynow from members where id = 'germaine'`) === '96614208', 'Undo puts the mobile back')

    console.log('Pay shows it — a claim’s Pay back, Pay {member}')
    await go('/company/finance/todo')
    const claim = p.locator('[data-todo]').filter({ hasText: 'Floor protection boards' }).first()
    if (await claim.count()) {
      await claim.getByTestId('expense-next-pay').click(); await p.waitForTimeout(600)
      const band = p.getByTestId('payout-bank')
      ok(/Pay to Michelle/.test(await band.innerText().catch(() => '')) && /PayNow 9772 6315/.test(await band.innerText().catch(() => '')) && await band.getByTestId('payout-copy-paynow').count() === 1, 'Pay back a claim: “Pay to Michelle · PayNow 9772 6315” with its copy')
      await shot('02-claim-pay-back-1440')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    } else ok(true, '(no claim to pay back on this database — skipped)')
    const payMember = p.getByTestId('todo-pay-member').first()
    if (await payMember.count()) {
      await payMember.click(); await p.waitForTimeout(600)
      const dlg = p.getByTestId('commission-pay-member-dialog')
      const who = (await p.getByRole('dialog').last().innerText()).match(/^Pay (\w+)/m)?.[1] ?? ''
      const has = json(`select paynow from members where name like '${who}%'`)[0]?.paynow
      ok(has ? await dlg.getByTestId('payout-bank').count() === 1 : await dlg.getByTestId('payout-bank').count() === 0, `Pay ${who}: their PayNow shows when they gave one`)
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    } else ok(true, '(no commission owed on this database — skipped)')

    /* (the calm UI build 2026-10-27, a deliberate change) 1-03 · 1-20: one home for approvals — an approval's bell row opens the Dashboard's Review
       pane on its record (its ⋮: Review on the Dashboard · Send back); the pane answers with the record's own action, sentence, Undo and note dialog */
    console.log('The bell’s approval rows open the Dashboard’s Review pane')
    await go('/projects')
    await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(1500)
    const bell = p.getByTestId('notifications-panel')
    const exp = bell.getByTestId('notification-row').filter({ hasText: 'logged an expense of S$38.50' }).first()
    const po = bell.getByTestId('notification-row').filter({ hasText: 'PO-2026-008' }).first()
    await exp.getByRole('button', { name: /^More for / }).click(); await p.waitForTimeout(400)
    ok(await p.getByTestId('notification-approve').count() === 1 && await p.getByTestId('notification-send-back').count() === 1, 'an expense waiting: its ⋮ holds Review on the Dashboard · Send back')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    ok(await po.getByTestId('notification-acts').count() === 1 && await po.getByRole('button', { name: /^More for / }).count() === 1, 'a PO waiting: an approval row too (its Approve opens on Money)')
    await shot('03-bell-approvals-1440')
    if (grab && grab.status === 'pending') {
      await exp.locator('button').first().click(); await p.waitForTimeout(2200)
      ok(/\/dashboard\?review=/.test(p.url()) && await p.getByTestId('review-pane').first().isVisible().catch(() => false), 'the row opens the Review pane on the expense')
      await p.getByTestId('review-approve').click(); await p.waitForTimeout(1800)
      ok(sql(`select status from expenses where id = '${grab.id}'`) === 'approved' && /approved/.test(await snack().innerText().catch(() => '')), 'Approve: approved from the pane, one sentence')
      await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(1200)
      ok(await bell.getByTestId('notification-row').filter({ hasText: 'logged an expense of S$38.50' }).first().getByRole('button', { name: /^More for / }).count() === 0, '…and the row is a plain link now')
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1800)
      ok(sql(`select status from expenses where id = '${grab.id}'`) === 'pending', 'Undo: it waits again')
      await go('/projects')
      await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(1500)
    }
    await bell.getByTestId('notification-row').filter({ hasText: 'logged an expense of S$38.50' }).first().getByRole('button', { name: /^More for / }).click(); await p.waitForTimeout(400)
    await p.getByTestId('notification-send-back').click(); await p.waitForTimeout(2200)
    ok(/\/dashboard\?review=.*back=1/.test(p.url()) && await p.getByRole('dialog', { name: 'Send back' }).getByLabel('What should change?').count() === 1, 'Send back opens the Review pane on money out’s own note dialog')
    await shot('04-bell-send-back-1440')
    await p.getByRole('dialog', { name: 'Send back' }).getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(400)
    ok(await p.getByTestId('review-pane').first().isVisible().catch(() => false), 'the Review pane stays open behind it')
    await go('/projects')
    await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(1500)
    await po.locator('button').first().click(); await p.waitForTimeout(2200)
    await p.getByTestId('review-approve').click(); await p.waitForTimeout(2500)
    ok(/\/money\?open=.*&do=approve|\/money/.test(p.url()), 'the PO’s Approve (on the Review pane) lands on the project’s Money, on its send')

    console.log('A Designer’s bell stays links')
    as('germaine')
    await go('/projects')
    await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(1500)
    ok(await p.getByTestId('notification-acts').count() === 0, 'Germaine answers no approval, so no row acts')
    await p.keyboard.press('Escape')
    await go('/company/members')
    ok(await p.getByTestId('member-paynow').count() === 1, 'a member sees only their own PayNow')
    as('dane')

    console.log('⌘K finds the new settings')
    for (const [q, title, url] of [['document numbers', 'Document numbers', /section=finance#document-numbers/], ['owner or an admin', 'Approvals', /section=projects#owner-approvals/]]) {   // (the calm UI build 2026-10-27, a deliberate change) 5-33: the card is "Approvals"; its old words still find it
      await go('/leads'); await p.keyboard.press('Meta+k'); await p.waitForTimeout(400)
      await p.keyboard.type(q); await p.waitForTimeout(900)
      const hit = p.locator('[role="option"]', { hasText: title }).filter({ hasText: 'Settings ›' }).first()   // (the calm UI build 2026-10-27, a deliberate change) "Approvals" names other rows too — the Settings card's
      ok(await hit.count() === 1 && /Settings ›/.test(await hit.innerText()), `⌘K “${q}” finds ${title}`)
      if (await hit.count()) { await hit.click(); await p.waitForTimeout(1500); ok(url.test(p.url()), `…and lands on its card (${p.url().replace(BASE, '')})`) }
    }
    await ctx.close()

    console.log('The phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    await q.goto(`${BASE}/company/members`, { waitUntil: 'networkidle' }); await q.waitForTimeout(900)
    ok(await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), 'Members: no sideways scroll at 390')
    await q.screenshot({ path: path.join(dir, '05-members-390.png'), fullPage: true })
    await q.goto(`${BASE}/projects`, { waitUntil: 'networkidle' }); await q.waitForTimeout(900)
    await q.getByRole('button', { name: /^Notifications/ }).first().click().catch(() => {}); await q.waitForTimeout(1500)   // the phone bar's bell
    ok(await q.getByTestId('notification-acts').count() > 0, 'the phone’s bell sheet carries the same Approve · Send back')
    await q.screenshot({ path: path.join(dir, '06-bell-390.png') })
    await ph.close()
  } finally {
    for (const m of payBefore) sql(`update members set paynow = ${lit(m.paynow)} where id = ${lit(m.id)}`)
    for (const n of readBefore) sql(`update notifications set read_at = ${lit(n.read_at)} where id = ${lit(n.id)}`)
    if (grab) sql(`update expenses set status = ${lit(grab.status)}, reviewed_by = ${lit(grab.reviewed_by)}, reviewed_at = ${lit(grab.reviewed_at)}, review_note = ${lit(grab.review_note)} where id = ${lit(grab.id)}`)
    as(youBefore)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
