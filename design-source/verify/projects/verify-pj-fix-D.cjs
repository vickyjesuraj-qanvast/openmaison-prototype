// Projects fix-D — money in (studio side): the bug audit's D findings (design-source/context/parity/25-projects-bug-audit-2026-10-06/D-money.md)
// and the items routed to it (E-02, A-03, A-18, G-12), each asserted as the rule it fixes, never another round's count:
//  D-01 an approved variation order's Revise — refused for a Designer; for an Owner the contract moves back with the trail, the bell and Undo
//  D-02 a sent invoice keeps the contract it was raised on (stamp) · D-03 a paid invoice says so and asks nothing · D-04 who sees money
//  D-06 no "out of step" band for a rounding cent · D-07 a VO's margin counts its omissions' cost · D-08 / G-12 a VO prints as one
//  D-09 a S$0 Draft offers no Send · D-10 a client without the portal gets the number and how to pay · D-11 / E-02 money owed after completion
//  D-12 / A-18 a receipt's file opens the receipt; invoice numbers are found · D-15 ?open= lights the invoice · A-03 a direct project's value
//  re-sizes its Drafts with Undo · phone 390 (tiles two by two, no overflow).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. `members.is_you` is put back in `finally`.
// Usage: BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pj-fix-D.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'fix-D')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3123'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const money = (minor) => `S$${(minor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), marcus = P('P-2026-004'), shalini = P('P-2025-001')
  const ryanVo = sql(`select id from quotes where project_id='${ryan}' and kind='variation' and number='VO-1'`)
  const aishaVo = sql(`select id from quotes where project_id='${aisha}' and kind='variation' and number='VO-1'`)
  const inv = (n) => sql(`select id from project_invoices where number='${n}'`)
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }

  try {
    as('dane')
    const S = await desk()
    await S.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })

    // ── D-02 · D-03 — the invoice papers ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('D-02 · D-03 the invoice papers')
    const s = await page(S, 'studio')
    await go(s, `/projects/${ryan}/invoices/${inv('INV-2026-001')}`)
    const basis = await s.locator('[data-testid="invoice-basis"]').innerText()
    ok(/S\$77,900\.12 when issued/.test(basis) && !/S\$81,355\.42/.test(basis), `D-02 Ryan's Deposit keeps the contract it was raised on (${basis.trim()})`)
    await shot(s, 'd02-sent-invoice-keeps-its-contract')
    await go(s, `/projects/${ben}/invoices/${inv('INV-2026-003')}`)
    const paperBen = await s.locator('[data-testid="invoice-paper"]').innerText()
    ok(await s.locator('[data-testid="invoice-paid-stamp"]').count() === 1 && /Paid in full on/i.test(paperBen), 'D-03 a paid invoice wears its Paid in full stamp')
    ok(await s.locator('[data-testid="invoice-pay"]').count() === 0 && !/Total due/.test(paperBen) && !/Please pay by/.test(paperBen), 'D-03 … and asks nothing: no How to pay, "Total" not "Total due"')
    const box = async (sel) => s.locator(sel).evaluate((el) => el.getBoundingClientRect().right)
    const totalsRight = await box('[data-testid="invoice-totals"] dd:last-of-type'), amtRight = await box('[data-testid="invoice-paper"] table td:last-child')
    ok(Math.abs(totalsRight - amtRight) <= 2, `D-38 the totals end on the Amount column (${Math.round(totalsRight)} vs ${Math.round(amtRight)})`)
    await shot(s, 'd03-paid-invoice')
    await go(s, `/projects/${ryan}/money`)
    /* (simplify S-07 · Q-05, a deliberate change of this rule) Invoices sent is the admin's Invoices view of Billing */
    await s.locator('[data-testid="money-billing-view"]').getByRole('radio', { name: 'Invoices' }).click(); await s.waitForTimeout(500)
    ok(/10% of S\$77,900\.12/.test(await s.locator('[data-testid="money-invoices"]').innerText()), 'D-02 the Invoices view says the share of the contract it was raised on')

    // ── D-15 — ?open= lights the invoice ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('D-15 ?open=')
    const mid = inv('INV-2026-006')
    await s.goto(`${BASE}/projects/${ben}/money?open=${mid}`, { waitUntil: 'networkidle' })
    await s.waitForSelector(`[data-invoice="${mid}"][data-focus]`, { timeout: 5000 }).catch(() => {})
    ok(await s.locator(`[data-invoice="${mid}"][data-focus]`).count() > 0 && !/open=/.test(s.url()), 'D-15 the bell\'s ?open= lights INV-2026-006 and the address keeps nothing')

    // ── D-06 — a rounding cent is not "out of step" ────────────────────────────────────────────────────────────────────────────────────
    console.log('D-06 the out-of-step band')
    const com = sql(`select id from project_invoices where project_id='${aisha}' and stage_name='Commencement' and status='draft'`)
    const comBefore = sql(`select status||'|'||coalesce(number,'')||'|'||coalesce(sent_at,'')||'|'||coalesce(due_at,'') from project_invoices where id='${com}'`)
    sql(`update project_invoices set status='sent', number='INV-2026-990', sent_at=strftime('%s','now'), due_at=strftime('%s','now')+7*86400, contract_minor=6270225, base_minor=6270225, variations_minor=0 where id='${com}'`)
    await go(s, `/projects/${aisha}/money`)
    ok(await s.locator('[data-testid="money-out-of-step"]').count() === 0, 'D-06 Aisha: with Commencement sent, the Drafts that add up to what is left raise no band (only a cent would move)')
    const [st, num, sent, due] = comBefore.split('|')
    sql(`update project_invoices set status='${st}', number=${num ? `'${num}'` : 'NULL'}, sent_at=${sent || 'NULL'}, due_at=${due || 'NULL'}, contract_minor=NULL, base_minor=NULL, variations_minor=NULL where id='${com}'`)

    // ── D-10 — a client without the portal ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('D-10 the send to a client without the portal')
    sql(`update project_milestones set status='in_progress' where project_id='${marcus}' and status='not_started' and payment_ref is not null`)
    await go(s, `/projects/${marcus}/money`)
    const deposit = s.locator('[data-testid="money-stages"] [data-stage]').first()
    const send = deposit.locator('[data-testid="invoice-send"]')
    if (await send.count()) {
      await send.click(); await settle(s, 700)
      const box10 = dialog(s)
      const msg = await box10.locator('textarea').inputValue()
      ok(/INV-\d{4}-\d{3}/.test(msg) && /To pay:/.test(msg) && /reference/.test(msg), `D-10 Marcus (no portal): the message names the number and how to pay (${msg.split('\n')[0].slice(0, 80)}…)`)
      ok(/no portal/.test(await box10.innerText()), 'D-10 the dialog says the client has no portal and how to attach the PDF')
      await shot(s, 'd10-send-without-portal', false)
      await box10.getByRole('button', { name: 'Cancel' }).click().catch(() => s.keyboard.press('Escape')); await settle(s, 400)
      if (await dialog(s).count()) await s.keyboard.press('Escape')
    } else ok(false, 'D-10 Marcus\'s Deposit offers Send')

    // ── D-09 — a S$0 Draft offers no Send ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('D-09 a S$0 Draft')
    const mDep = sql(`select id||'|'||amount_minor||'|'||gst_minor from project_invoices where project_id='${marcus}' and stage_name='Deposit' and status='draft'`)
    const [depId, depAmt, depGst] = mDep.split('|')
    sql(`update project_invoices set amount_minor=0, gst_minor=0, variance_reason='Paid in kind' where id='${depId}'`)
    await go(s, `/projects/${marcus}/money`)
    const row0 = s.locator(`[data-invoice="${depId}"]`).first()
    ok(await row0.locator('[data-testid="invoice-send"], [data-testid="invoice-submit"]').count() === 0, 'D-09 a S$0 Draft offers no Send in its row')
    await row0.getByRole('button', { name: /More actions/ }).click(); await settle(s, 500)
    const sendNow = s.getByRole('menuitem', { name: /Send now/ })
    ok(await sendNow.count() === 1 && (await sendNow.getAttribute('aria-disabled')) === 'true' && /nothing to send/.test(await s.locator('[role="menu"]').last().innerText()), 'D-09 … its menu\'s Send now is off and says why')
    await s.keyboard.press('Escape'); await settle(s, 300)
    sql(`update project_invoices set amount_minor=${depAmt}, gst_minor=${depGst}, variance_reason=NULL where id='${depId}'`)

    // ── A-03 — a direct project's agreed value re-sizes its Drafts, with Undo ───────────────────────────────────────────────────────────
    console.log('A-03 the agreed value')
    const before = Number(sql(`select agreed_value_minor from projects where id='${marcus}'`))
    await go(s, `/projects/${marcus}`)
    const setup = s.locator('section[data-card="money"]').getByRole('button', { name: 'Change the value' })   // (simplify S-01, a deliberate change of this rule) Getting started's done row left; the Money card's head link changes an agreed value
    if (await setup.count()) {
      await setup.click(); await settle(s, 600)
      const f = dialog(s).getByLabel('Agreed value (S$)')
      await f.fill('60000'); await dialog(s).getByRole('button', { name: 'Save' }).click(); await settle(s, 1500)
      const drafts = Number(sql(`select sum(amount_minor) from project_invoices where project_id='${marcus}' and status='draft'`))
      ok(drafts === 6000000, `A-03 Marcus at S$60,000: the Drafts add up to it (${money(drafts)})`)
      const sn = await snack(s).innerText().catch(() => '')
      ok(/re-sized/.test(sn) && /Undo/.test(sn), `A-03 one sentence with Undo ("${sn.split('\n')[0]}")`)
      await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
      ok(Number(sql(`select agreed_value_minor from projects where id='${marcus}'`)) === before && Number(sql(`select sum(amount_minor) from project_invoices where project_id='${marcus}' and status='draft'`)) === before, 'A-03 Undo puts the value and the Drafts back')
    } else ok(false, 'A-03 Marcus\'s Money card offers Change the value')

    // ── D-07 · D-08 — a variation order in the editor and on paper ─────────────────────────────────────────────────────────────────────
    console.log('D-07 · D-08 a variation order')
    await go(s, `/quotes/${aishaVo}`)
    await settle(s, 800)
    const strip = await s.locator('text=Margin · owners only').locator('..').innerText().catch(() => '')
    ok(/−S\$30\b/.test(strip), `D-07 Aisha's VO-1: the owners' margin counts the omission's cost (${strip.replace(/\s+/g, ' ').trim()})`)
    await go(s, `/quotes/${aishaVo}/preview`)
    const paper = await s.locator('[data-testid="quote-preview"]').innerText()
    ok(!/Sales Contract/i.test(paper) && /Variation order VO-1/i.test(paper), 'D-08 the print names the variation order, never "Sales Contract"')
    ok(/Change to the contract/i.test(paper) && /−S\$545\.00/.test(paper) && !/S\$−/.test(paper), 'D-08 its total is the change to the contract, in the house money format')
    await shot(s, 'd08-vo-print')

    // ── D-01 — Revise on an approved variation order ───────────────────────────────────────────────────────────────────────────────────
    console.log('D-01 Revise on an approved VO')
    const baseContract = Number(sql(`select q.amount_minor from projects p join quotes q on q.id=p.quote_id where p.id='${ryan}'`))
    as('michelle')
    const M = await desk(); const m = await page(M, 'michelle')
    await go(m, `/quotes/${ryanVo}`)
    await m.locator('[data-testid="sent-banner"]').getByRole('button', { name: 'Revise — new version' }).click(); await settle(m, 800)
    const refusal = await snack(m).innerText().catch(() => '')
    ok(/only an Owner or an Admin revises an approved variation order/i.test(refusal) && await m.locator('[data-testid="revise-confirm"]').count() === 0 && sql(`select status from quotes where id='${ryanVo}'`) === 'Confirmed', `D-01 a Designer's Revise is refused with the rule ("${refusal.split('\n')[0]}") and VO-1 stays approved`)
    await shot(m, 'd01-designer-refused', false)
    await M.close()
    as('dane')
    await go(s, `/quotes/${ryanVo}`)
    await s.locator('[data-testid="sent-banner"]').getByRole('button', { name: 'Revise — new version' }).click(); await settle(s, 700)
    const dlg = await dialog(s).innerText()
    ok(new RegExp(`goes back to ${money(baseContract).replace(/[$.]/g, (c) => `\\${c}`)}`).test(dlg) && /Approved by the client/.test(dlg), 'D-01 the Owner\'s dialog says the contract goes back until the client approves the new version')
    await shot(s, 'd01-owner-dialog', false)
    await s.locator('[data-testid="revise-confirm"]').click(); await settle(s, 2000)
    ok(sql(`select status||'|'||version from quotes where id='${ryanVo}'`) === 'Draft|2', 'D-01 VO-1 is a Draft at version 2')
    ok(Number(sql(`select count(*) from lead_events where project_id='${ryan}' and kind='project_vo_reopened'`)) === 1 && Number(sql(`select count(*) from notifications where quote_id='${ryanVo}' and kind='variation_reopened'`)) > 0, 'D-01 … with its line in Activity and the team\'s bell row')
    const sn1 = await snack(s).innerText().catch(() => '')
    ok(/approval no longer counts/.test(sn1) && /Undo/.test(sn1), 'D-01 the snackbar says what moved, with Undo')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 2000)
    ok(sql(`select status||'|'||version from quotes where id='${ryanVo}'`) === 'Confirmed|1' && Number(sql(`select count(*) from lead_events where project_id='${ryan}' and kind='project_vo_reopened'`)) === 0 && Number(sql(`select count(*) from quote_versions where quote_id='${ryanVo}'`)) === 0, 'D-01 Undo: version 1 approved again, the trail and the kept copy gone')

    // ── D-11 · E-02 — money owed on a completed project ────────────────────────────────────────────────────────────────────────────────
    console.log('D-11 · E-02 a completed project owed money')
    const shalPay = sql(`select y.id from project_payments y join project_invoices i on i.id=y.invoice_id where i.number='INV-2026-007' and y.status='confirmed'`)
    sql(`update project_payments set status='reversed', reversed_by='dane', reversed_at=strftime('%s','now'), reverse_reason='Probe' where id='${shalPay}'`)
    await go(s, `/projects?scope=completed`)
    await go(s, `/projects/${shalini}`)
    /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
    { const more = s.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await s.waitForTimeout(300) } }
    const ov = await s.locator('main, body').first().innerText()
    /* (simplify S-01, a deliberate change of this rule) the money still owed is a Needs you row on the completed project, named by its invoice */
    ok(/overdue/i.test(await s.locator('section[data-card="needs"]').first().innerText().catch(() => '')) && /INV-2026-007/.test(ov), 'D-11 the completed project\'s Overview keeps the overdue invoice (a Needs you row)')
    ok(/agreed money are read-only .* payments, updates, tasks and its team stay open/.test(ov), 'D-11 the completed bar says the agreed money reads only and payments stay open')
    await shot(s, 'd11-completed-owed')
    sql(`update project_payments set status='confirmed', reversed_by=NULL, reversed_at=NULL, reverse_reason=NULL where id='${shalPay}'`)

    // ── D-12 · A-18 — a receipt's file opens the receipt; the search finds invoices ────────────────────────────────────────────────────
    console.log('D-12 receipts and search')
    const rcFile = sql(`select receipt_file_id from project_payments where receipt_number is not null and project_id='${ben}' limit 1`)
    await go(s, `/projects/${ben}/files/${rcFile}`)
    ok(/\/receipts\//.test(s.url()) && await s.locator('[data-testid="receipt-page"]').count() === 1, 'D-12 the receipt\'s file in Files › Payments opens the receipt')
    await go(s, `/projects/${ben}`)
    await s.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(s, 600)
    await s.keyboard.type('INV-2026-006'); await settle(s, 1500)
    const found = await s.locator('[role="dialog"], [data-testid="global-search"]').last().innerText().catch(() => '')
    ok(/INV-2026-006/.test(found) && /Invoice/.test(found), 'D-12 ⌘K finds INV-2026-006 by its number')
    await s.keyboard.press('Escape')

    // ── D-04 — who sees money (Sarah, a Designer on none of these teams) ───────────────────────────────────────────────────────────────
    console.log('D-04 who sees money')
    as('sarah')
    const R = await desk(); const r = await page(R, 'sarah')
    await go(r, `/projects/${aisha}/activity`)
    const act = await r.locator('main, body').first().innerText()
    ok(!/S\$\d/.test(act) && !/RCT-|INV-/.test(act), 'D-04 Aisha\'s Activity carries no money line for Sarah')
    await go(r, `/projects/${ryan}/files`)
    ok(!/\bPayments\b/.test(await r.locator('main, body').first().innerText()), 'D-04 Ryan\'s Files shows no Payments folder to Sarah')
    const proof = sql(`select proof_file_id from project_payments where project_id='${ryan}' and proof_file_id is not null limit 1`)
    const res = await r.request.get(`${BASE}/files/img/${proof}`)
    ok(res.status() === 404, 'D-04 the client\'s bank proof answers 404 to Sarah')
    await go(r, `/projects/${ben}`)
    const benOv = await r.locator('main, body').first().innerText()
    ok(!/Payment overdue/.test(benOv) && !/awaits payment/.test(benOv), 'D-04 Benjamin\'s Overview names no payment to Sarah')
    await go(r, `/projects/${ben}/invoices/${mid}`)
    ok(await r.locator('[data-testid="money-hidden-page"]').count() === 1, 'D-35 an invoice\'s address shows the Money tab\'s words, never a bare 404')
    await shot(r, 'd04-sarah-invoice-hidden')
    await R.close()
    as('dane')

    // ── Phone 390 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390')
    const Ph = await phone(); const ph = await page(Ph, 'phone')
    await go(ph, `/projects/${ben}/money`)
    const tops = await ph.locator('[data-testid="money-tiles"] > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    /* (simplify round 2, R2-A — P3 §6.3, a deliberate change of this rule) To collect takes the row; To pay · Profit side by side under it */
    ok(tops.length === 3 && tops[1] > tops[0] && tops[1] === tops[2], 'D-40 on a phone To collect stands whole, To pay · Profit side by side under it')
    ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no page-level overflow at 390')
    await shot(ph, 'phone-money-390')
    await go(ph, `/projects/${ben}/invoices/${inv('INV-2026-006')}`)
    ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'the invoice page holds at 390')
    await shot(ph, 'phone-invoice-390')
    await Ph.close()
    await S.close()
  } catch (e) {
    fail++; console.log('  ✗ the run threw:', String(e).slice(0, 300))
  } finally {
    as('dane')
    await b.close()
  }
  if (errors.length) { fail++; console.log('  ✗ page errors:', errors.join(' | ')) }
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
