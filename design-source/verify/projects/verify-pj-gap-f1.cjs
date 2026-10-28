// Gaps build F1 — money out: the costs (the owner's "build everything", 2026-10-07 — M-08; calls F1-Q1…Q16 in projects-gaps-build/f1-read.md).
// Each item asserted as the rule it builds, never another round's count:
//  Costs half on Money (tiles for Owners and Admins only — Q-20; the bands; the tables) · a PO made from the quote, sent on WhatsApp, answered on
//  the vendor's link, paid in full (it closes itself), the payment undone · a PO over the limit approved and sent in one press (the submitter hears
//  it) · a supplier bill read from its PDF, its duplicate check, a vendor not in the directory · an expense claim waiting, approved, paid back ·
//  merge a duplicate vendor (and Undo) · Finance's tabs and the rail item · Settings › Projects › Costs · the PO page and the vendor's link (and a
//  dead one) · Activity, Needs attention, the bell, the search · a Designer's view · phone 390 (no sideways scroll, New cost as a sheet).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3126 NODE_PATH=<repo>/node_modules node verify-pj-gap-f1.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-f1')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3126'
const REPO = path.join(__dirname, '..', '..', '..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PO = (n) => sql(`select id from purchase_orders where number='${n}'`)
const undo = []   // SQL that puts back what the probe changed, run last-first in `finally`
const later = (q) => undo.push(q)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002')
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const menuItem = (p, re) => p.getByRole('menuitem', { name: re }).first()
  const pick = async (p, scope, label, option) => { await scope.getByRole('combobox', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).first().click(); await p.waitForTimeout(300); await p.getByRole('option', { name: option }).first().click(); await p.waitForTimeout(250) }
  const before = { pos: sql('select count(*) from purchase_orders'), bills: sql('select count(*) from supplier_bills'), expenses: sql('select count(*) from expenses'), payouts: sql('select count(*) from payments_out'), vendors: sql('select count(*) from vendors') }
  const startEvents = sql('select count(*) from lead_events'), startBell = sql('select count(*) from notifications')
  const startAt = Math.floor(Date.now() / 1000) - 5

  try {
    as('dane')
    const S = await desk()
    await S.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const s = await page(S, 'studio')

    // ── The Costs half on Ryan D'Souza's Money tab (Owner) ───────────────────────────────────────────────────────────────────────────────
    console.log('Costs half — an Owner')
    await go(s, `/projects/${ryan}/money`)
    /* (simplify S-07, a deliberate change of this rule) Costs is ONE list (costs-list) with a Kind column; its tiles are the To pay tile; its bands
       are Needs you rows (three shown, the rest behind Show n more); New cost ▾ is the tab's one New ▾ (its Costs group) */
    const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
    const costRows = async (p, attr) => (await p.locator(`[data-testid="costs-list"] [data-${attr}]`).allInnerTexts()).join('\n')
    const costs = s.locator('[data-testid="project-costs"]')
    await costs.scrollIntoViewIfNeeded(); await settle(s, 400)
    ok(await costs.count() === 1, 'the Money tab carries a Costs half')
    ok(await s.locator('[data-testid="tile-pay"]').count() === 1 && /To pay/i.test(await s.locator('[data-testid="tile-pay"]').innerText()), 'an Owner reads To pay (committed and paid out on its hover)')
    const posText = await costRows(s, 'po')
    ok(/PO-2026-003/.test(posText) && /PO-2026-004/.test(posText) && /PO-2026-007/.test(posText) && !/PO-2026-005/.test(posText), 'the project’s own POs only')
    ok(/Part paid/i.test(posText) && /Closed/i.test(posText) && /Changes asked/i.test(posText), 'each PO has its one word (part paid · closed · changes asked)')
    await allNeeds(s)
    ok(/Bright Spark Electrical asked for changes to PO-2026-007/.test(await s.locator('[data-testid="costs-answered"]').innerText()), 'a vendor’s changes raise a Needs you row with the vendor’s words')
    const listText = await s.locator('[data-testid="costs-list"]').innerText()
    ok(/WC-2391/.test(listText) && /with its file/.test(listText), 'the Woodcraft bill read from its PDF keeps its file (on its PO’s line, or its own row)')
    ok(/To pay back/i.test(await costRows(s, 'expense')), 'Michelle’s approved claim waits to be paid back')
    await shot(s, 'f1-01-ryan-costs')
    // the PO's panel
    await s.locator(`[data-po="${PO('PO-2026-003')}"] [data-testid="po-open"]`).click(); await settle(s, 1200)
    const panel = s.locator('[data-testid="po-panel"]')
    const panelText = await panel.innerText()
    ok(/Woodcraft/.test(panelText) && /Against the quote/.test(panelText) && /from the quote/.test(panelText), 'the PO’s panel: vendor, its quote lines, the margin against the quote (Owner)')
    ok(/accepted it on the link/.test(panelText) && /made it/.test(panelText), 'its history reads its Activity lines')
    await shot(s, 'f1-02-po-panel', false)
    await s.keyboard.press('Escape'); await settle(s, 500)

    // ── A PO from the quote: Draft → sent on WhatsApp → accepted on the vendor's link → paid in full (it closes itself) → Undo ─────────────────
    console.log('A PO from the quote')
    await s.getByTestId('money-new').click(); await settle(s, 400)   // (simplify S-07) the one New ▾ — its Costs group
    await menuItem(s, /^Purchase order/).click(); await settle(s, 500)   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */
    if (await s.locator('[data-testid="money-new-level"]').count()) { await s.getByRole('menuitem', { name: /^New purchase order/ }).first().click(); await s.waitForTimeout(700) }
    const dlg = s.locator('[role="dialog"][aria-label="New purchase order"]')
    ok(await dlg.count() === 1, 'New cost › Purchase order opens its dialog')
    await pick(s, dlg, 'Vendor', /ColourPro/)
    await dlg.getByLabel('What it’s for (optional)').fill('Painting, whole unit')
    await dlg.getByTestId('po-from-quote').click(); await settle(s, 600)
    const quoteList = s.locator('[data-testid="po-quote-lines"]')
    ok(await quoteList.count() === 1, 'Add from the quote lists the signed quote’s lines')
    await quoteList.locator('[data-testid="po-quote-line"]', { hasText: 'Painting, whole unit' }).first().click(); await settle(s, 200)
    await s.getByTestId('po-quote-add').click(); await settle(s, 500)
    const lineFrom = await dlg.locator('[data-testid="po-line"]').last().innerText()
    ok(/From the quote/.test(lineFrom), 'the line says it came from the quote, at its cost')
    ok(/the client pays/i.test(await dlg.getByTestId('po-against-quote').innerText()), 'an Owner reads what the PO leaves of the client’s price')
    await shot(s, 'f1-03-po-dialog', false)
    await dlg.getByTestId('po-save-draft').click(); await settle(s, 1600)
    const newPo = sql(`select id from purchase_orders where title='Painting, whole unit' and project_id='${ryan}' and status='draft'`)
    ok(!!newPo && /^PO-2026-\d{3}$/.test(sql(`select number from purchase_orders where id='${newPo}'`)), 'Save as Draft numbers it at once (PO-{YYYY}-{seq})')
    later(`delete from purchase_order_lines where po_id='${newPo}'`); later(`delete from purchase_orders where id='${newPo}'`)
    later(`delete from lead_events where json_extract(detail,'$.id')='${newPo}'`)
    const n = sql(`select number from purchase_orders where id='${newPo}'`)
    ok(sql(`select count(*) from purchase_order_lines where po_id='${newPo}' and quote_item_id is not null`) === '1', 'its line keeps the quote line it came from')
    ok(sql(`select gst_minor > 0 from purchase_orders where id='${newPo}'`) === '1', 'GST is added — ColourPro charges it')
    // Send
    const row = s.locator(`[data-po="${newPo}"]`)
    await row.getByRole('button', { name: 'Send', exact: true }).click(); await settle(s, 700)
    const send = dialog(s)
    ok(/Send PO-2026-\d+ to ColourPro/.test(await send.innerText()), 'Send opens the WhatsApp dialog to the vendor')
    await send.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(s, 1500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const opened = await s.evaluate(() => window.__opened)
    ok(opened.some((u) => /wa\.me\/6590213344/.test(u) && /po%2F/.test(u)), 'WhatsApp opens on the press with the vendor’s mobile and the PO’s link')
    ok(sql(`select status || '|' || (sent_at is not null) || '|' || (due_on is not null) from purchase_orders where id='${newPo}'`) === 'sent|1|1', 'it is recorded as sent, its payment day worked out from the terms')
    // the vendor's link — a context of its own, no session
    const token = sql(`select vendor_token from purchase_orders where id='${newPo}'`)
    const V = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const v = await page(V, 'vendor')
    await go(v, `/po/${token}`)
    ok(/Purchase order PO-2026-/.test(await v.locator('[data-testid="vendor-po-page"]').innerText()) && await v.locator('[data-testid="po-paper"]').count() === 1, 'the vendor’s link opens the PO without signing in')
    ok(sql(`select vendor_viewed_at is not null from purchase_orders where id='${newPo}'`) === '1', 'opening it stamps Viewed')
    ok(await overflow(v) <= 1, 'the vendor’s link has no sideways scroll at 390')
    await shot(v, 'f1-04-vendor-link-390')
    await v.getByTestId('vendor-po-accept').click(); await settle(v, 1500)
    ok(sql(`select vendor_answer || '|' || answer_via from purchase_orders where id='${newPo}'`) === 'accepted|link', 'the vendor accepts on the link')
    ok(/You accepted/.test(await v.locator('[data-testid="vendor-po-answer"]').innerText()), 'the link then says it was accepted')
    later(`delete from notifications where kind='po_answered' and href like '%${newPo}%'`)
    await go(v, '/po/not-a-real-token-at-all-000')
    ok(await v.locator('[data-testid="link-notice"]').count() === 1, 'a dead link reads the notice, never a bare 404')
    await V.close()
    // pay it in full — it closes itself; Undo opens it again
    await go(s, `/projects/${ryan}/money`)
    await s.locator(`[data-po="${newPo}"]`).getByRole('button', { name: 'Pay', exact: true }).click(); await settle(s, 700)
    const pay = s.locator('[data-testid="payout-dialog"]')
    ok(await pay.count() === 1, 'an Owner pays the vendor from the row')
    await s.getByTestId('payout-save').click(); await settle(s, 1600)
    ok(sql(`select status from purchase_orders where id='${newPo}'`) === 'closed', 'paid in full, the PO closes itself')
    ok(/paid in full and closed/.test(await snack(s).innerText()), 'one sentence says so, with Undo')
    later(`delete from payments_out where po_id='${newPo}'`)
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select status || '|' || (select count(*) from payments_out where po_id='${newPo}') from purchase_orders where id='${newPo}'`) === 'sent|0', 'Undo takes the payment away and opens the PO again')

    // ── A PO over the limit: Germaine's PO-2026-008 approved and sent in one press ────────────────────────────────────────────────────────
    console.log('Approval')
    const po8 = PO('PO-2026-008')
    const po8Was = sql(`select json_object('status',status,'sa',submitted_at,'sb',submitted_by,'sent',sent_at,'sentby',sent_by,'ab',approved_by,'aa',approved_at,'due',due_on) from purchase_orders where id='${po8}'`)
    later(`update purchase_orders set status=json_extract('${po8Was}','$.status'), submitted_at=json_extract('${po8Was}','$.sa'), submitted_by=json_extract('${po8Was}','$.sb'), sent_at=json_extract('${po8Was}','$.sent'), sent_by=json_extract('${po8Was}','$.sentby'), approved_by=json_extract('${po8Was}','$.ab'), approved_at=json_extract('${po8Was}','$.aa'), due_on=json_extract('${po8Was}','$.due') where id='${po8}'`)
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    ok(/Germaine/.test(await s.locator('[data-testid="costs-po-awaiting"]').innerText()), 'the Needs you row names who submitted it')
    await s.getByTestId('costs-approve-po').click(); await settle(s, 700)
    await dialog(s).getByRole('button', { name: /Approve and send (via|on) WhatsApp/ }).click(); await settle(s, 1600)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    ok(sql(`select status || '|' || approved_by from purchase_orders where id='${po8}'`) === 'sent|dane', 'an Owner’s send approves it — one path')
    ok(sql(`select count(*) from notifications where kind='po_approved' and member_id='germaine' and href like '%${po8}%' and created_at >= ${startAt}`) === '1', 'Germaine hears it was approved and sent')
    later(`delete from notifications where kind='po_approved' and href like '%${po8}%' and created_at >= ${startAt}`)
    later(`delete from lead_events where json_extract(detail,'$.id')='${po8}' and kind='project_po_sent'`)

    // ── The other steps: mark accepted, cancel, remove a Draft, reverse a payment — each with its Undo ──────────────────────────────────
    console.log('The other steps, each with Undo')
    await go(s, '/company/finance/purchase-orders')
    const po7 = PO('PO-2026-007'), po5 = PO('PO-2026-005'), po9 = PO('PO-2026-009')
    await s.locator(`[data-po="${po7}"]`).getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
    await menuItem(s, /^Mark as accepted/).click(); await settle(s, 600)
    await dialog(s).getByRole('radio', { name: 'On WhatsApp' }).click(); await settle(s, 200)
    await s.getByTestId('po-accept-save').click(); await settle(s, 1400)
    ok(sql(`select vendor_answer || '|' || answer_via from purchase_orders where id='${po7}'`) === 'accepted|whatsapp', 'Mark as accepted records how the vendor said yes')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
    ok(sql(`select vendor_answer from purchase_orders where id='${po7}'`) === 'changes', 'Undo puts the vendor’s changes back')
    await s.locator(`[data-po="${po5}"]`).getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
    await menuItem(s, /^Cancel the PO/).click(); await settle(s, 600)
    await dialog(s).getByRole('textbox').first().fill('Probe — the vendor cannot come'); await settle(s, 200)
    await dialog(s).getByRole('button', { name: 'Cancel the PO' }).click(); await settle(s, 1400)
    ok(sql(`select status || '|' || cancel_reason from purchase_orders where id='${po5}'`) === 'cancelled|Probe — the vendor cannot come', 'Cancel needs a reason the vendor reads')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
    ok(sql(`select status || '|' || coalesce(cancel_reason,'') from purchase_orders where id='${po5}'`) === 'sent|', 'Undo brings it back with the vendor')
    await s.locator(`[data-po="${po9}"]`).getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
    await menuItem(s, /^Remove the Draft/).click(); await settle(s, 1400)
    ok(sql(`select deleted_at is not null from purchase_orders where id='${po9}'`) === '1' && !/PO-2026-009/.test(await s.getByTestId('costs-pos').innerText()), 'Remove the Draft takes it off the list')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
    ok(sql(`select deleted_at is null from purchase_orders where id='${po9}'`) === '1', 'Undo brings the Draft back')
    await go(s, '/company/finance/payments')
    const adv = sql(`select id from payments_out where advance = 1 limit 1`)
    await s.locator(`[data-payout="${adv}"]`).getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
    await menuItem(s, /^Reverse the payment/).click(); await settle(s, 600)
    await dialog(s).getByRole('textbox').first().fill('Probe — the transfer bounced'); await settle(s, 200)
    await dialog(s).getByRole('button', { name: 'Reverse' }).click(); await settle(s, 1400)
    ok(sql(`select reversed_at is not null from payments_out where id='${adv}'`) === '1' && /Reversed/.test(await s.locator(`[data-payout="${adv}"]`).innerText()), 'Reverse keeps the payment on the record, struck through')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
    ok(sql(`select reversed_at is null from payments_out where id='${adv}'`) === '1', 'Undo makes it count again')

    // ── A supplier bill read from its PDF (Finance › Bills) ──────────────────────────────────────────────────────────────────────────────
    console.log('A bill read from its PDF')
    await go(s, '/company/finance/bills')
    ok(await s.getByTestId('finance-bills').count() === 1 && /Studio overhead/.test(await s.getByTestId('costs-bills').innerText()), 'Finance › Bills lists the projects’ bills and the overhead’s (Owner)')
    /* (simplify S-11, a deliberate change of this rule) Money out has one New ▾ — Purchase order · Supplier bill · Expense */
    await s.getByTestId('finance-new').click(); await settle(s, 300); await s.getByTestId('finance-new-bill').click(); await settle(s, 600)
    await s.locator('[data-testid="bill-pick"] input[type="file"]').setInputFiles(path.join(REPO, 'public', 'uat-files', 'colourpro-bill-CP-0412.pdf')); await settle(s, 3500)
    const bill = s.locator('[data-testid="bill-dialog"]')
    ok(/Read from colourpro-bill-CP-0412\.pdf/.test(await s.getByTestId('bill-read').innerText()), 'the PDF is read — the band says from which file')
    ok((await bill.getByLabel('Their invoice number').inputValue()) === 'CP-0412' && (await bill.getByRole('textbox', { name: /^Total/ }).inputValue()).replace(/,/g, '') === '817.50', 'its number and total come from the file')
    ok(/ColourPro/.test(await s.getByTestId('bill-vendor').innerText()), 'the supplier read finds its vendor in the directory')
    ok(/Read from the file — check it/.test(await bill.innerText()), 'each read field says so')
    await pick(s, bill, 'Project', /P-2026-002/)
    await shot(s, 'f1-05-bill-read', false)
    await s.getByTestId('bill-save').click(); await settle(s, 1600)
    const cp = sql(`select id from supplier_bills where reference='CP-0412'`)
    ok(!!cp && sql(`select count(*) from cost_documents where record_id='${cp}'`) === '1', 'the bill is recorded with its file kept')
    later(`delete from cost_documents where record_id='${cp}'`); later(`delete from supplier_bills where id='${cp}'`); later(`delete from lead_events where json_extract(detail,'$.id')='${cp}'`)
    // the same again: the duplicate check asks
    /* (simplify S-11, a deliberate change of this rule) Money out has one New ▾ — Purchase order · Supplier bill · Expense */
    await s.getByTestId('finance-new').click(); await settle(s, 300); await s.getByTestId('finance-new-bill').click(); await settle(s, 600)
    await s.locator('[data-testid="bill-pick"] input[type="file"]').setInputFiles(path.join(REPO, 'public', 'uat-files', 'colourpro-bill-CP-0412.pdf')); await settle(s, 3500)
    await pick(s, s.locator('[data-testid="bill-dialog"]'), 'Project', /P-2026-002/)
    await s.getByTestId('bill-save').click(); await settle(s, 1400)
    ok(/Record it anyway\?/.test(await dialog(s).innerText()) && /numbered CP-0412/.test(await dialog(s).innerText()), 'the same vendor and number asks before it is recorded twice')
    await dialog(s).getByRole('button', { name: 'Cancel' }).click(); await settle(s, 400)
    ok(sql(`select count(*) from supplier_bills where reference='CP-0412'`) === '1', 'nothing recorded twice')
    await s.keyboard.press('Escape'); await settle(s, 500)
    // a supplier not in the directory
    await go(s, '/company/finance/bills')
    /* (simplify S-11, a deliberate change of this rule) Money out has one New ▾ — Purchase order · Supplier bill · Expense */
    await s.getByTestId('finance-new').click(); await settle(s, 300); await s.getByTestId('finance-new-bill').click(); await settle(s, 600)
    await s.locator('[data-testid="bill-pick"] input[type="file"]').setInputFiles(path.join(REPO, 'public', 'uat-files', 'printhub-bill-PH-2210.pdf')); await settle(s, 3500)
    ok(/Add PrintHub Singapore as a vendor/.test(await s.getByTestId('bill-vendor-add').innerText()), 'a supplier not in the directory is offered as a new vendor, by the name read')
    await s.keyboard.press('Escape'); await settle(s, 500)

    // ── An expense claim: Germaine logs it (it waits), Dane approves and pays it back ────────────────────────────────────────────────────
    console.log('An expense claim')
    as('germaine')
    const G = await desk(); const g = await page(G, 'germaine')
    await go(g, `/projects/${ben}/money`)
    ok(await g.locator('[data-testid="tile-pay"]').count() === 0 && /totals are for Owners and Admins/.test(await g.locator('[data-testid="project-costs"]').innerText()), 'a Designer sees the records, never the totals (Q-20)')
    await g.getByTestId('money-new').click(); await settle(g, 400)
    await menuItem(g, /^Expense/).click(); await settle(g, 700)
    const ex = g.locator('[data-testid="expense-dialog"]')
    await ex.getByLabel('Amount paid (S$)').fill('42.80')
    await pick(g, ex, 'Category', 'Site supplies')
    await ex.getByLabel('What it was for').fill('Probe tape and masking film')
    await ex.getByTestId('expense-paid-by').getByRole('radio', { name: /I paid/ }).click(); await settle(g, 200)
    await g.getByTestId('expense-save').click(); await settle(g, 1600)
    const exp = sql(`select id from expenses where description='Probe tape and masking film'`)
    ok(!!exp && sql(`select status || '|' || paid_by || '|' || claimant_id from expenses where id='${exp}'`) === 'pending|member|germaine', 'a Designer’s claim waits for approval')
    ok(sql(`select count(*) from notifications where kind='expense_review' and href like '%${exp}%'`) === '2', 'Dane and Hui Min hear it on the bell')
    later(`delete from notifications where href like '%${exp}%'`); later(`delete from payments_out where expense_id='${exp}'`); later(`delete from expenses where id='${exp}'`); later(`delete from lead_events where json_extract(detail,'$.id')='${exp}'`)
    await G.close()
    as('dane')
    await go(s, '/company/finance/expenses')
    const exRow = s.locator(`[data-expense="${exp}"]`)
    await exRow.getByRole('button', { name: 'Approve', exact: true }).click(); await settle(s, 1400)
    ok(sql(`select status from expenses where id='${exp}'`) === 'approved', 'an Owner approves it from Finance › Expenses')
    await exRow.getByRole('button', { name: 'Pay back', exact: true }).click(); await settle(s, 700)
    await s.getByTestId('payout-save').click(); await settle(s, 1600)
    ok(sql(`select count(*) from payments_out where expense_id='${exp}' and kind='claim' and member_id='germaine'`) === '1', 'it is paid back to Germaine')
    ok(/Paid back/i.test(await exRow.innerText()), 'the row reads Paid back')
    ok(sql(`select count(*) from notifications where kind='claim_paid' and member_id='germaine' and href like '%${exp}%'`) === '1', 'Germaine hears her claim is paid back')
    later(`delete from lead_events where kind='project_payout_recorded' and created_at >= 0 and json_extract(detail,'$.title') like '%Probe tape%'`)

    // ── Vendors: merge the duplicate, then Undo ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Vendors')
    await go(s, '/company/finance/vendors')
    const dup = sql(`select id from vendors where name='Wood Craft Carpentry'`), wood = sql(`select id from vendors where name='Woodcraft Carpentry Pte Ltd'`)
    ok(/Wood Craft Carpentry/.test(await s.getByTestId('costs-vendors').innerText()) && /Committed/i.test(await s.getByTestId('costs-vendors').innerText()), 'the directory, with its balances for an Owner')
    await shot(s, 'f1-06-vendors')
    await s.locator(`[data-vendor="${dup}"]`).getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
    await menuItem(s, /Merge into another/).click(); await settle(s, 600)
    const merge = s.locator('[data-testid="merge-dialog"]')
    await pick(s, merge, 'Keep', 'Woodcraft Carpentry Pte Ltd')
    await settle(s, 800)
    ok(/1 expense moves to Woodcraft Carpentry Pte Ltd/.test(await s.getByTestId('merge-preview').innerText()), 'what moves is said before it moves')
    await s.getByTestId('merge-save').click(); await settle(s, 1600)
    ok(sql(`select merged_into || '|' || is_active from vendors where id='${dup}'`) === `${wood}|0` && sql(`select count(*) from expenses where vendor_id='${dup}'`) === '0', 'the duplicate is merged; its expense moved')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select coalesce(merged_into,'') || '|' || is_active from vendors where id='${dup}'`) === '|1' && sql(`select count(*) from expenses where vendor_id='${dup}'`) === '1', 'Undo puts both back as they were')

    // ── Finance's tabs, the rail, Settings, the PO page, Activity, attention, the bell, the search ───────────────────────────────────────
    console.log('Finance and the rest')
    await go(s, '/company/finance')
    /* (gaps build F2 — F2-Q1, a deliberate change of this rule) Finance lands an Owner or an Admin on the books' Overview; the PO list is
       its own tab · (simplify S-10 · S-11, a deliberate change of this rule) Finance lands everyone on To do; the PO list is Money out's first kind,
       and the old tab address lands there with a 307 */
    ok(/\/company\/finance\/todo/.test(s.url()), 'Company › Finance lands an Owner on To do')
    const oldPos = await s.request.get(BASE + '/company/finance/purchase-orders?open=abc', { maxRedirects: 0 })
    ok(oldPos.status() === 307 && /\/company\/finance\/money-out\?kind=purchase-orders&open=abc$/.test(oldPos.headers()['location'] ?? ''), 'the old Purchase orders tab redirects (307) to Money out › Purchase orders, its query kept')
    await go(s, '/company/finance/purchase-orders')
    ok(/\/company\/finance\/money-out\?kind=purchase-orders/.test(s.url()) && await s.getByTestId('money-out-kinds').count() === 1, 'and lands on Money out, the kind switch on Purchase orders')
    /* (REG-1360, a deliberate change of this rule) Finance is a Company section: no rail item of its own — the Company panel opens it, and an old
       /finance address lands on the same tab, its query kept */
    ok(await s.locator('nav a[href="/finance"], nav a[href="/company/finance"]').count() === 0, 'no Finance item on the rail — it is in Company (REG-1360)')
    await s.getByRole('button', { name: /^Company/ }).first().click(); await settle(s, 500)
    const coFin = s.getByRole('menuitem', { name: /^Finance/ })
    ok(await coFin.isVisible() && (await coFin.getAttribute('aria-current')) === 'page' && /Purchase orders, bills, expenses, vendors and commission/.test(await coFin.innerText()), 'the Company panel lists Finance, marked as the page you are on')
    await s.keyboard.press('Escape'); await settle(s, 300)
    const old = await s.request.get(BASE + '/finance/bills?open=abc', { maxRedirects: 0 })
    ok([307, 308].includes(old.status()) && /\/company\/finance\/bills\?open=abc$/.test(old.headers()['location'] ?? ''), 'an old /finance address redirects to the same tab in Company, its query kept')
    const fp = await s.getByTestId('costs-pos').innerText()
    ok(/PO-2026-001/.test(fp) && /PO-2026-009/.test(fp) && /Marcus/.test(fp), 'every project’s POs, with a Project column')
    await shot(s, 'f1-07-finance-pos')
    await go(s, '/company/finance/payments')
    ok(/Paid to/i.test(await s.getByTestId('costs-payouts').innerText()) && /Sarah/.test(await s.getByTestId('costs-payouts').innerText()), 'Payments out lists vendors and claims paid')
    await go(s, '/settings?section=finance')
    const cs = s.locator('[data-testid="cost-settings"]')
    await cs.scrollIntoViewIfNeeded(); await settle(s, 300)
    /* (simplify S-15, a deliberate change of this rule) the PO numbers moved from the Costs card to Finance's one Document numbers card */
    ok((await cs.getByTestId('po-number-example').count()) === 0 && (/PO-2026-010/.test(await s.getByTestId('po-number-example').innerText()) || /PO-2026-01\d/.test(await s.getByTestId('po-number-example').innerText())), 'Settings › Finance › Document numbers shows the next PO number')
    await shot(s, 'f1-08-settings-costs', false)
    await go(s, `/projects/${ryan}/purchase-orders/${PO('PO-2026-003')}`)
    ok(await s.locator('[data-testid="po-paper"]').count() === 1 && /Advance, paid first/.test(await s.locator('[data-testid="po-paper"]').innerText()), 'the PO page prints the paper with its advance')
    await shot(s, 'f1-09-po-page')
    await go(s, `/po/${sql(`select vendor_token from purchase_orders where number='PO-2026-007'`)}`)
    ok(/You asked for changes/.test(await s.locator('[data-testid="vendor-po-answer"]').innerText()), 'a PO answered with changes says so on its link')
    await go(s, `/projects/${ryan}/activity`)
    ok(/accepted the purchase order “PO-2026-003” on its link/.test(await s.locator('body').innerText()), 'Activity carries the vendor’s own line')
    await go(s, `/projects/${ryan}`)
    ok(/Bright Spark Electrical asked for changes to PO-2026-007/.test(await s.locator('body').innerText()), 'Needs attention (the Overview’s Status card) names the vendor’s changes')
    /* (simplify round 3) "coming due" is a window on the real clock (three days, lib/finance/bell.ts) — a baseline copy read on a later day
       finds WC-2391 already past it, so the probe puts it two days out for this read and puts it back after */
    const wcDue = sql(`select due_on from supplier_bills where reference='WC-2391'`)
    const inTwo = (() => { const d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2).getTime() / 1000) })()
    sql(`update supplier_bills set due_on=${inTwo} where reference='WC-2391'`)
    await s.getByRole('button', { name: /^Notifications/ }).first().click(); await settle(s, 900)
    const bellText = await s.locator('body').innerText()
    sql(`update supplier_bills set due_on=${wcDue || 'NULL'} where reference='WC-2391'`)
    ok(/Purchase order PO-2026-008 needs your approval/.test(bellText) || sql(`select count(*) from notifications where kind='po_review' and member_id='dane'`) === '1', 'the approvers’ bell row for a PO waiting')
    ok(/bill WC-2391 is due/.test(bellText) && /AF-7781 is overdue/.test(bellText), 'the bell raises a bill coming due and one overdue')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await s.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(s, 600)
    await s.keyboard.type('Woodcraft'); await settle(s, 1500)
    const searchText = await s.locator('body').innerText()
    ok(/Finance/.test(searchText) && /Woodcraft Carpentry Pte Ltd/.test(searchText) && /PO-2026-003/.test(searchText), 'the search finds the vendor and its POs under Finance')
    await s.keyboard.press('Escape'); await settle(s, 300)

    // ── A Designer: no totals, no Payments out ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('A Designer')
    as('michelle')
    const M = await desk(); const m = await page(M, 'michelle')
    await go(m, '/company/finance/payments')
    /* (simplify S-11, a deliberate change of this rule) Payments out is Money out › Paid — the Owners' and Admins'; a Designer lands on Money out */
    ok(/\/company\/finance\/money-out$/.test(m.url()), 'Payments out is the Owners’ and Admins’ — a Designer lands on Money out')
    ok(!/Paid/.test(await m.getByTestId('money-out-kinds').innerText().catch(() => '')) && !/Xero/.test(await m.locator('[aria-label="Finance sections"]').first().innerText().catch(() => '')), 'and has no Paid kind and no Xero tab')
    ok(!/committed across the studio/.test(await m.getByTestId('costs-pos').innerText()), 'Finance carries no cost figures for a Designer')
    await go(m, `/projects/${ryan}/money`)
    await m.locator(`[data-po="${PO('PO-2026-003')}"] [data-testid="po-open"]`).click(); await settle(m, 1200)
    ok(!/Against the quote/.test(await m.locator('[data-testid="po-panel"]').innerText()), 'no margin against the quote for a Designer')
    await M.close()
    as('dane')

    // ── Phone 390 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const Ph = await phoneCtx(); const ph = await page(Ph, 'phone')
    await go(ph, `/projects/${ryan}/money`)
    /* (simplify Q-06) on a phone the two lists sit behind two chips — Costs is one press away */
    await ph.locator('[data-testid="money-list-switch"]').getByRole('radio', { name: 'Costs' }).click(); await settle(ph, 500)
    await ph.locator('[data-testid="project-costs"]').scrollIntoViewIfNeeded(); await settle(ph, 400)
    ok(await overflow(ph) <= 1, 'the Money tab with its Costs half has no sideways scroll at 390')
    await shot(ph, 'f1-10-phone-costs')
    await ph.getByTestId('money-new').click(); await settle(ph, 600)
    ok(await ph.getByRole('menuitem', { name: /Purchase order/ }).count() >= 1, 'the one New (+) opens as a sheet on a phone, its Costs group with it')
    await shot(ph, 'f1-11-phone-new-cost', false)
    await ph.keyboard.press('Escape'); await settle(ph, 300)
    await ph.locator('[data-testid="money-list-switch"]').getByRole('radio', { name: 'Billing' }).click(); await settle(ph, 300)   // the switch is remembered per browser — put it back
    await go(ph, '/company/finance/purchase-orders')
    ok(await overflow(ph) <= 1, 'Finance has no sideways scroll at 390')
    await shot(ph, 'f1-12-phone-finance')
    await ph.setViewportSize({ width: 320, height: 700 }); await settle(ph, 500)
    ok(await overflow(ph) <= 1, 'Finance has no sideways scroll at 320')
    await go(ph, `/projects/${ryan}/money`)
    ok(await overflow(ph) <= 1, 'the Money tab with its Costs half has no sideways scroll at 320')
    await Ph.close()
    await S.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    for (const q of undo.reverse()) { try { sql(q) } catch (e) { console.log('  (undo failed)', q.slice(0, 80)) } }
    sql(`delete from lead_events where at >= ${startAt} and kind like 'project_%' and (kind like 'project_po_%' or kind like 'project_bill_%' or kind like 'project_expense_%' or kind like 'project_payout_%')`)
    sql(`delete from notifications where created_at >= ${startAt} and kind in ('po_review','po_sent_back','po_approved','po_answered','expense_review','expense_answered','claim_paid')`)
    as('dane')
    await b.close()
    const after = { pos: sql('select count(*) from purchase_orders'), bills: sql('select count(*) from supplier_bills'), expenses: sql('select count(*) from expenses'), payouts: sql('select count(*) from payments_out'), vendors: sql('select count(*) from vendors') }
    const same = JSON.stringify(before) === JSON.stringify(after) && sql('select count(*) from lead_events') === startEvents && sql('select count(*) from notifications') === startBell
    console.log(same ? '  ✓ the DB is as found' : `  ✗ the DB moved: ${JSON.stringify({ before, after, events: [startEvents, sql('select count(*) from lead_events')], bell: [startBell, sql('select count(*) from notifications')] })}`)
    if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '))
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail || !same ? 1 : 0)
  }
})()
