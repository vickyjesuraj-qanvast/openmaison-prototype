// Parity-map build, package P-A · Money in (the owner's "build everything that's in 1.0 to 2.0", 2026-10-10; map rows MI-104 · MI-021 · MI-031 ·
// MI-035 · MI-068 · UC-098 · FB-013 · FB-016 · FB-012). Each item asserted as the rule it builds, never another round's count:
//  MI-104 an approved VO's ⋮ Delete says why in its row; another VO deletes with one sentence + Undo
//  MI-021 the quote's first payment: the % · S$ switch only while Settings › Finance › Invoices › May open with a fixed fee is on; S$ keeps what
//         it bills and the other shares make 100% of what it leaves; Undo puts the shares back
//  MI-031 a stage invoice itemised: the grid starts as one line for the whole, "S$x left to itemise" until it adds up, Save waits, the paper prints
//         the lines under the stage's line
//  MI-035 a one-off filled from a text PDF (lines and the due day, each marked); a picture says it has no text
//  MI-068 the third reminder: Owners and Admins hear `invoice_reminded`, the row says "reminded 3× … — call Benjamin on +65 …" with Call Benjamin
//  UC-098 an invoice sent: `invoice_sent` for Owners and Admins, never the sender
//  FB-013 · FB-016 · FB-012 Company › Finance › Money in (To do · Money in · Money out …): Invoices · Payments · Variation orders · Credit notes,
//         the Status pill (only what is present), no Issued by with one entity, rows open the project's Money with ?from=, a Designer's projects
//         only, Export, 390 with no sideways scroll
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pm-a.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-a')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3123'
const REPO = path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
/** The rows as INSERT statements — what a `finally` puts back exactly (a payment schedule rewritten under new ids, a sent invoice). */
const snapshot = (table, where) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table} where ${where.replace(/"/g, '\\"')}"`).toString().trim()
const runSql = (statements) => { if (statements) execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: statements }) }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const undo = []
const later = (q) => undo.push(q)
const T0 = Math.floor(Date.now() / 1000) - 2

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), marcus = P('P-2026-004')
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const menuItem = (p, re) => p.getByRole('menuitem', { name: re }).first()
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  const stub = (ctx) => ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })

  try {
    later(`delete from notifications where created_at >= ${T0}`)
    later(`delete from notification_outbox where created_at >= ${T0}`)
    as('dane')
    const S = await desk(); await stub(S)
    const s = await page(S, 'studio')

    // ── FB-013 · FB-016 · FB-012 — Company › Finance › Money in ─────────────────────────────────────────────────────────────────
    console.log('Money in, studio-wide')
    await go(s, '/company/finance/money-in')
    const tabs = (await s.locator('[role="tablist"] [role="tab"]').allInnerTexts()).map((t) => t.replace(/\s*\d+$/, '').trim())
    ok(tabs[0] === 'To do' && tabs[1] === 'Money in' && tabs[2] === 'Money out', `the strip reads To do · Money in · Money out … (${tabs.join(' · ')})`)
    ok(await s.locator('[data-testid="money-in-kinds"] [role="radio"]').count() === 4, 'one kind switch: Invoices · Payments · Variation orders · Credit notes')
    const invRows = s.locator('[data-testid="money-in-table-invoices"] [data-row]')
    const sentVoid = Number(sql(`select count(*) from project_invoices i join projects p on p.id=i.project_id join leads l on l.id=p.lead_id where p.deleted_at is null and l.deleted_at is null and i.status in ('sent','void')`))
    const listedSent = await s.locator('[data-testid="money-in-table-invoices"] [data-row]:not([data-status="ready"]):not([data-status="awaiting"]):not([data-status="sent_back"])').count()
    ok(listedSent === sentVoid, `Invoices lists every invoice sent or void on a live project (${listedSent}/${sentVoid}) — plain future Drafts wait on their project`)
    const inv006 = s.locator('[data-testid="money-in-table-invoices"] [data-row]', { hasText: 'INV-2026-006' }).first()
    ok(await inv006.count() === 1 && /overdue/i.test(await inv006.innerText()) && /P-2026-002/.test(await inv006.innerText()), 'INV-2026-006 reads Overdue, on P-2026-002')
    ok(await s.locator('[data-testid="money-in-entity"]').count() === 0, 'one issuing entity: no Issued by pill')
    await shot(s, 'a01-money-in-invoices-1440')
    await s.locator('[data-testid="money-in-status"] button').click(); await settle(s, 300)
    const statusRows = await s.getByRole('menuitemradio').allInnerTexts()
    ok(statusRows[0]?.startsWith('All ·') && statusRows.some((r) => /^Overdue · \d+/.test(r)) && !statusRows.some((r) => / · 0$/.test(r)), `the Status pill lists only the statuses present, with counts (${statusRows.join(' | ')})`)
    await s.getByRole('menuitemradio', { name: /^Overdue/ }).click(); await settle(s, 400)
    ok((await invRows.count()) > 0 && (await s.locator('[data-testid="money-in-table-invoices"] [data-row]:not([data-status="overdue"])').count()) === 0, 'Status: Overdue narrows the list to it')
    await inv006.locator('[data-testid="money-in-open"]').click(); await settle(s, 1200)
    ok(new RegExp(`/projects/${ben}/money`).test(s.url()) && /from=%2Fcompany%2Ffinance%2Fmoney-in/.test(s.url()), 'Open lands on the project’s Money, the way back riding along')
    await go(s, '/company/finance/money-in?kind=payments')
    ok(await s.locator('[data-testid="money-in-table-payments"]').count() === 1 && /Payments/.test(await s.locator('[data-testid="money-in-kinds"] [aria-checked="true"]').innerText()), '?kind=payments lands on Payments')
    const receipts = Number(sql(`select count(*) from project_payments pp join projects p on p.id=pp.project_id where p.deleted_at is null`))
    ok(await s.locator('[data-testid="money-in-table-payments"] [data-row]').count() === receipts, `every client payment is listed (${receipts})`)
    const view = s.locator('[data-testid="money-in-view-receipt"]').first()
    if (await view.count()) { await view.click(); await settle(s, 1200); ok(/\/receipts\//.test(s.url()) && /from=%2Fcompany%2Ffinance%2Fmoney-in%3Fkind%3Dpayments/.test(s.url()), 'View receipt opens the receipt, Back returning to Payments') }
    else ok(false, 'a confirmed payment offers View receipt')
    await go(s, '/company/finance/money-in?kind=variations')
    const vos = Number(sql(`select count(*) from quotes q join projects p on p.id=q.project_id where q.kind='variation' and q.deleted_at is null and p.deleted_at is null`))
    ok(await s.locator('[data-testid="money-in-table-variations"] [data-row]').count() === vos, `Variation orders lists every VO (${vos})`)
    await go(s, '/company/finance/money-in?kind=credits')
    const cns = Number(sql(`select count(*) from credit_notes c join projects p on p.id=c.project_id where p.deleted_at is null`))
    ok((await s.locator('[data-testid="money-in-table-credits"] [data-row]').count()) === cns, `Credit notes lists every credit note (${cns})`)
    await s.locator('[data-testid="money-in-export"]').click(); await settle(s, 400)
    ok(/Export Credit notes/.test(await dialog(s).innerText()), 'Export opens the house export, for the kind on screen')
    await s.keyboard.press('Escape'); await settle(s, 300)
    {
      const P2 = await phoneCtx(); const ph = await page(P2, 'phone')
      await go(ph, '/company/finance/money-in')
      ok(await overflow(ph) <= 1, '390: no sideways scroll on Money in')
      await shot(ph, 'a02-money-in-390')
      await P2.close()
    }
    /* a Designer: the projects she works on, nothing else */
    as('germaine')
    await go(s, '/company/finance/money-in')
    const hers = sql(`select p.id from projects p join lead_assignees a on a.lead_id=p.lead_id where a.member_id='germaine'`).split('\n').filter(Boolean)
    const seenP = await s.locator('[data-testid="money-in-table-invoices"] [data-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-project')))
    ok(seenP.length > 0 && seenP.every((id) => hers.includes(id)), `Germaine sees only her projects’ invoices (${new Set(seenP).size} project(s))`)
    as('dane')

    // ── MI-068 — the third reminder ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('MI-068 the third reminder')
    const inv6 = sql(`select id from project_invoices where number='INV-2026-006'`)
    later(`delete from lead_events where kind='project_invoice_reminded' and at >= ${T0}`)
    ok(Number(sql(`select count(*) from lead_events where kind='project_invoice_reminded' and json_extract(detail,'$.id')='${inv6}'`)) === 2, 'INV-2026-006 starts reminded twice')
    as('germaine')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    const over = s.locator('[data-testid="invoice-overdue"]', { hasText: 'INV-2026-006' }).first()
    await over.locator('[data-testid="invoice-remind"]').click(); await settle(s, 1500)
    ok(/Third reminder drafted on WhatsApp for Benjamin/.test(await snack(s).innerText()), 'the third reminder says the next step is a call')
    ok(sql(`select group_concat(member_id) from (select member_id from notifications where kind='invoice_reminded' and created_at >= ${T0} order by member_id)`) === 'dane,huimin,priya', 'Owners, Admins and Accounting hear invoice_reminded — once each') /* (parity map, FB-114 — a deliberate change of this rule) */
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    const call = s.locator('[data-testid="invoice-overdue"][data-call]', { hasText: 'INV-2026-006' }).first()
    ok(await call.count() === 1 && /reminded 3× · last \d+ \w+ — call Benjamin on \+65 9773 1968/.test(await call.innerText()), 'the row: "reminded 3× · last … — call Benjamin on +65 9773 1968"')
    ok(await call.locator('[data-testid="invoice-call"]').innerText() === 'Call Benjamin' && await call.locator('[data-testid="invoice-remind"]').count() === 0, 'its second button is Call Benjamin (Remind stays in the invoice’s ⋮)')
    await shot(s, 'a03-overdue-call-row', false)
    await call.locator('[data-testid="invoice-call"]').click(); await settle(s, 700)
    ok(/\+65 9773 1968/.test(await snack(s).innerText()), 'at a desk, Call copies the number (said in the snackbar)')
    ok(Number(sql(`select count(*) from notifications where kind='invoice_reminded' and created_at >= ${T0}`)) === 3, 'the bell was told once per Owner, Admin and Accounting member') /* (parity map, FB-114 — a deliberate change of this rule) */
    as('dane')

    // ── UC-098 — an invoice sent ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('UC-098 an invoice sent')
    const dep = sql(`select id from project_invoices where project_id='${marcus}' and stage_name='Deposit' and status='draft'`)
    const depRow = snapshot('project_invoices', `id='${dep}'`)
    const waiting = sql(`select id from project_milestones where project_id='${marcus}' and status='not_started' and payment_ref is not null`).split('\n').filter(Boolean)
    undo.push(() => { sql(`delete from project_invoices where id='${dep}'`); runSql(depRow) })   // the deposit back as it was, Draft and all
    later(`delete from lead_files where lead_id=(select lead_id from projects where id='${marcus}') and created_at >= ${T0}`)
    later(`delete from lead_events where project_id='${marcus}' and at >= ${T0}`)
    for (const id of waiting) later(`update project_milestones set status='not_started' where id='${id}'`)
    sql(`update project_milestones set status='in_progress' where project_id='${marcus}' and status='not_started' and payment_ref is not null`)
    await go(s, `/projects/${marcus}/money`)
    const send = s.locator(`[data-invoice="${dep}"] [data-testid="invoice-send"]`).first()
    if (await send.count()) {
      await send.click(); await settle(s, 700)
      await dialog(s).getByRole('button', { name: 'Send via WhatsApp' }).click(); await settle(s, 1800)
      ok(sql(`select status from project_invoices where id='${dep}'`) === 'sent', 'Marcus’s deposit is sent')
      ok(sql(`select count(*) from notifications where kind='invoice_sent' and member_id='huimin' and created_at >= ${T0}`) === '1' && sql(`select count(*) from notifications where kind='invoice_sent' and member_id='dane' and created_at >= ${T0}`) === '0', 'the Admin hears invoice_sent — never the Owner who sent it')
    } else ok(false, 'Marcus’s Deposit offers Send')

    // ── MI-104 — an approved VO stays on the contract ─────────────────────────────────────────────────────────────────────────
    console.log('MI-104 deleting a variation order')
    const vo2 = sql(`select id from quotes where project_id='${ryan}' and number='VO-2'`)
    later(`update quotes set deleted_at=null where id='${vo2}'`)
    await go(s, `/projects/${ryan}/money`)
    await s.getByRole('button', { name: 'More actions for VO-1' }).click(); await settle(s, 300)
    const del1 = menuItem(s, /^Delete VO-1/)
    ok(await del1.count() === 1 && ((await del1.getAttribute('aria-disabled')) === 'true' || await del1.isDisabled()) && /An approved variation order stays on the contract — revise it to change it/.test(await del1.innerText()), 'VO-1 (approved): Delete rests, its row saying why')
    await shot(s, 'a04-vo-delete-rule', false)
    await s.keyboard.press('Escape'); await settle(s, 300)
    await s.getByRole('button', { name: 'More actions for VO-2' }).click(); await settle(s, 300)
    await menuItem(s, /^Delete VO-2/).click(); await settle(s, 1500)
    ok(/VO-2 deleted — it’s under Deleted variation orders/.test(await snack(s).innerText()) && sql(`select deleted_at is not null from quotes where id='${vo2}'`) === '1', 'VO-2 (with the client) deletes, one sentence')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select deleted_at is null from quotes where id='${vo2}'`) === '1', 'Undo brings VO-2 back')

    // ── MI-031 — a stage invoice itemised ─────────────────────────────────────────────────────────────────────────────────────
    console.log('MI-031 itemise a stage invoice')
    const comp = sql(`select id from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`)
    later(`update project_invoices set lines_json=null where id='${comp}'`)
    later(`delete from lead_events where kind='project_invoice_details' and json_extract(detail,'$.id')='${comp}' and at >= ${T0}`)
    await go(s, `/projects/${ben}/money`)
    await s.locator(`[data-testid="money-stages"] [data-invoice="${comp}"] button[aria-haspopup="menu"]`).last().click(); await settle(s, 300)
    await menuItem(s, /Description, note and due day/).click(); await settle(s, 500)
    const dd = dialog(s)
    await dd.locator('[data-testid="invoice-itemise"] label').first().click(); await settle(s, 300)
    ok(await dd.locator('[data-testid="itemise-line"]').count() === 1 && /^Completion \(\d+(\.\d)?%\)$/.test(await dd.getByLabel('Description', { exact: true }).first().inputValue()), 'Itemise starts as one line for the whole — "Completion (n%)"')
    ok(/The lines add up to the invoice/.test(await dd.locator('[data-testid="itemise-left"]').innerText()), '…which adds up from the first moment')
    const whole = Number((await dd.getByLabel('Unit price (S$)').first().inputValue()).replace(/,/g, ''))
    await dd.getByLabel('Unit price (S$)').first().fill((whole - 100).toFixed(2)); await settle(s, 200)
    ok(/S\$100\.00 left to itemise/.test(await dd.locator('[data-testid="itemise-left"]').innerText()), '"S$100.00 left to itemise" until it adds up')
    await dd.locator('[data-testid="details-save"]').click(); await settle(s, 500)
    ok(await dd.locator('[data-testid="itemise-error"]').count() === 1 && sql(`select lines_json is null from project_invoices where id='${comp}'`) === '1', 'Save waits for it — nothing is saved')
    await dd.getByLabel('Unit price (S$)').first().press('Enter'); await settle(s, 300)
    ok(await dd.locator('[data-testid="itemise-line"]').count() === 2, 'Enter in the last price adds a row')
    await dd.getByLabel('Description', { exact: true }).nth(1).fill('Defect touch-ups')
    await dd.getByLabel('Unit price (S$)').nth(1).fill('100.00'); await settle(s, 200)
    await shot(s, 'a05-itemise-dialog', false)
    await dd.locator('[data-testid="details-save"]').click(); await settle(s, 1500)
    ok(sql(`select json_array_length(lines_json) from project_invoices where id='${comp}'`) === '2', 'the two lines are kept on the invoice')
    await go(s, `/projects/${ben}/invoices/${comp}`)
    ok(await s.locator('[data-testid="invoice-line"][data-stage-line]').count() === 2, 'the paper prints the lines under the stage’s line')
    await shot(s, 'a06-itemised-paper')

    // ── MI-035 — Fill from a PDF ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('MI-035 a one-off filled from a PDF')
    await go(s, `/projects/${aisha}/money`)
    await s.locator('[data-testid="money-new"]').click(); await settle(s, 300)
    await menuItem(s, /^One-off invoice/).click(); await settle(s, 500)
    const od = dialog(s)
    await od.locator('[data-testid="oneoff-pdf-input"]').setInputFiles(path.join(REPO, 'public/uat-files/printhub-bill-PH-2210.pdf')); await settle(s, 3000)
    ok(/Read from printhub-bill-PH-2210\.pdf — 2 lines and the due day filled/.test(await od.locator('[data-testid="oneoff-read"]').innerText().catch(() => '')), 'a text PDF fills the lines and the due day, and says so')
    ok(await od.locator('[data-testid="oneoff-line"]').count() === 2 && (await od.getByLabel('Description', { exact: true }).first().inputValue()) === 'A1 plotting of design drawings', 'its lines are the PDF’s')
    ok(/Read from the file — check it/.test(await od.innerText()), 'the due day says it was read, until it is changed')
    await shot(s, 'a07-oneoff-from-pdf', false)
    await od.locator('[data-testid="oneoff-pdf-input"]').setInputFiles(path.join(REPO, 'public/uat-files/fluted-panel.jpg')); await settle(s, 1200)
    ok(/This file has no text to read — type the lines in/.test(await od.locator('[data-testid="oneoff-read"]').innerText().catch(() => '')), 'a picture says plainly it has no text to read')
    await od.getByRole('button', { name: 'Cancel' }).click(); await settle(s, 400)

    // ── MI-021 — a fixed fee first on a quote's Payment Schedule ──────────────────────────────────────────────────────────────
    console.log('MI-021 fee first on a quote')
    const om1 = sql(`select q.id from quotes q where q.kind='quote' and q.status='Draft' and q.deleted_at is null and exists(select 1 from quote_payments p where p.quote_id=q.id) order by q.number limit 1`)
    const pays = snapshot('quote_payments', `quote_id='${om1}'`)
    const qUpdated = sql(`select updated_at from quotes where id='${om1}'`)
    undo.push(() => { sql(`delete from quote_payments where quote_id='${om1}'`); runSql(pays) })   // the schedule back under its own ids
    later(`update quotes set updated_at=${qUpdated} where id='${om1}'`)
    later(`delete from settings where key='project_invoices'`)
    const hadRule = sql(`select count(*) from settings where key='project_invoices'`) !== '0'
    ok(!hadRule, 'the demo studio has the fixed fee off (no invoice rules saved)')
    await go(s, `/quotes/${om1}`)
    await s.locator('#section-payment').scrollIntoViewIfNeeded().catch(() => {})
    ok(await s.locator('[data-testid="payment-fee-switch"]').count() === 0, 'with the rule off, the first payment has no % · S$ switch')
    sql(`insert into settings(key, value, updated_at) values('project_invoices', '{"approval":true,"termsDays":7,"feeFirst":true}', strftime('%s','now'))`)
    await go(s, `/quotes/${om1}`)
    await s.locator('#section-payment').scrollIntoViewIfNeeded().catch(() => {}); await settle(s, 600)
    const sw = s.locator('[data-testid="payment-fee-switch"]')
    ok(await sw.count() === 1, 'with it on, the first payment carries the % · S$ switch')
    const before = sql(`select group_concat(round(pct, 2), '/') from (select pct from quote_payments where quote_id='${om1}' order by position)`)
    await sw.getByRole('radio', { name: 'S$' }).click(); await settle(s, 1500)
    ok(/is a fixed fee of S\$[\d,.]+ — the other payments share what it leaves/.test(await snack(s).innerText()), 'S$: one sentence, with Undo')
    ok(Number(sql(`select fixed_minor from quote_payments where quote_id='${om1}' and position=0`)) > 0 && Math.abs(Number(sql(`select sum(pct) from quote_payments where quote_id='${om1}' and position > 0`)) - 100) < 0.02, 'the first row keeps what it bills as a fee; the other shares make 100% of what it leaves')
    ok(await s.locator('[data-testid="payment-fixed-fee"]').count() === 1, 'its share cell reads Fixed fee')
    await shot(s, 'a08-quote-fee-first', false)
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select fixed_minor is null from quote_payments where quote_id='${om1}' and position=0`) === '1' && sql(`select group_concat(round(pct, 2), '/') from (select pct from quote_payments where quote_id='${om1}' order by position)`) === before, `Undo puts the shares back (${before})`)

    ok(!errors.length, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    for (const q of undo.reverse()) {
      try { if (typeof q === 'function') q(); else sql(q) } catch (e) { console.log('  (undo failed)', String(q).slice(0, 80)) }
    }
    as('dane')
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
