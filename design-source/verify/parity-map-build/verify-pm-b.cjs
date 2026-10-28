// The parity-map build, package P-B · Money out (his "build everything that's in 1.0", 2026-10-10 — map rows MO-009 · MO-011 · MO-027 · MO-038 ·
// MO-058 · MO-074 · MO-079 · MO-084 · MO-087 · MO-094, FB-009 · FB-031 · FB-097 · FB-105's lists, PR-089). Each item asserted as the rule it
// builds, never another round's count:
//  Where costs go on a project's Costs (Owners and Admins only; none for a Designer) · a late delivery: the neutral Needs you row, Mark delivered
//  and its Undo, Message {vendor} opened on the press, the bell row · the PO dialog's More details › Invoice to (the letterhead to start) and a
//  line's ⋮ › Link to a milestone · Record a PO made elsewhere (Recorded, never a vendor's link, its file, removed with Undo) · the vendor's page
//  Download CSV · Settings › Finance › The purchase order paper (header note, terms, the acceptance block — on the vendor's page too) · a vendor's
//  panel lists its expenses · the Issued by scope (none with one entity; with two: the pill, the column, the expense dialog's Issued by) · To do's
//  Recently (five, then Show more) · phone 390 (no sideways scroll).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3131 NODE_PATH=<repo>/node_modules node verify-pm-b.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-b')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3131'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const esc = (v) => String(v).replace(/'/g, "''")
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PO = (n) => sql(`select id from purchase_orders where number='${n}'`)
const undo = []   // SQL that puts back what the probe changed, run last-first in `finally`
const later = (q) => undo.push(q)
/* a 1×1 PNG — the recorded PO's "file" */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001')
  const po3 = PO('PO-2026-003')
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const menuItem = (p, re) => p.getByRole('menuitem', { name: re }).first()
  const pick = async (p, scope, label, option) => { await scope.getByRole('combobox', { name: new RegExp(`^${label.replace(/[()]/g, '\\$&')}`) }).first().click(); await p.waitForTimeout(300); await p.getByRole('option', { name: option }).first().click(); await p.waitForTimeout(250) }
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  const before = { pos: sql('select count(*) from purchase_orders'), docs: sql('select count(*) from cost_documents'), expenses: sql('select count(*) from expenses') }
  const startEvents = sql('select count(*) from lead_events'), startBell = sql('select count(*) from notifications')
  const startAt = Math.floor(Date.now() / 1000) - 5
  const rulesBefore = sql(`select value from settings where key='cost_rules'`)
  const brandBefore = sql(`select value from settings where key='brand'`)
  /* the late delivery reads the real clock: PO-2026-003's expected day three days ago for this run, put back after */
  const expectedBefore = sql(`select coalesce(expected_on, 'NULL') from purchase_orders where id='${po3}'`)
  const threeAgo = (() => { const d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 3).getTime() / 1000) })()

  try {
    sql(`update purchase_orders set expected_on=${threeAgo}, delivered_at=NULL, delivered_by=NULL where id='${po3}'`)
    later(`update purchase_orders set expected_on=${expectedBefore}, delivered_at=NULL, delivered_by=NULL where id='${po3}'`)
    as('dane')
    const S = await desk()
    await S.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const s = await page(S, 'studio')

    // ── MO-087 · FB-031 Where costs go, and MO-094 · PR-089 a late delivery, on Ryan D'Souza's Money (Owner) ──────────────────────────────
    console.log('Where costs go · a late delivery')
    await go(s, `/projects/${ryan}/money`)
    const where = s.getByTestId('where-costs-go')
    await where.scrollIntoViewIfNeeded().catch(() => {}); await settle(s, 300)
    ok(await where.count() === 1 && await s.locator('[data-testid="project-costs"] [data-testid="where-costs-go"]').count() === 1, 'the Costs half opens with Where costs go (an Owner)')
    ok(await where.getByTestId('where-costs-seg').count() >= 1 && await where.getByTestId('where-costs-seg').count() === await where.getByTestId('where-costs-item').count(), 'one stacked bar, one legend row per segment')
    ok(/committed/.test(await where.innerText()) && /%/.test(await where.innerText()), 'the legend names each category with its share and amount')
    await allNeeds(s)
    const late = s.locator('[data-testid="costs-po-late"]')
    ok(await late.count() === 1 && /PO-2026-003 delivery is 3 days late/.test(await late.innerText()), 'a PO past its expected day raises “PO-2026-003 delivery is 3 days late”')
    ok(await late.getAttribute('data-tone') === 'note', 'the vendor’s lateness is neutral — never red (S-05)')
    await shot(s, 'pm-b-01-ryan-costs-1440')
    if (await late.getByTestId('costs-po-late-more').count()) { await late.getByTestId('costs-po-late-more').click(); await settle(s, 300) }   /* (the calm UI build 2026-10-27, a deliberate change) one verb a row — its other steps are the row's ⋮ (3-05 · 3-22); amounts as on every row, "S$ 13,370" (T-11) */
    const message = s.getByTestId('po-late-message')
    if (await message.count()) {
      await message.locator('[role="menuitem"]').click(); await settle(s, 300)
      const opened = await s.evaluate(() => window.__opened.slice(-1)[0] || '')
      ok(/^https:\/\/wa\.me\/65\d{8}\?text=/.test(opened) && /PO-2026-003/.test(decodeURIComponent(opened)), 'Message {vendor} opens WhatsApp on the press with the PO named')
    } else ok(/Open/.test(await s.locator('[role="menu"]').innerText().catch(() => '')) || /Mark delivered/.test(await late.innerText()), 'a vendor with no mobile: the row opens the PO instead')
    await late.getByTestId('po-late-delivered').click(); await settle(s, 1500)
    ok(sql(`select delivered_at is not null from purchase_orders where id='${po3}'`) === '1', 'Mark delivered stamps the PO delivered')
    ok(/marked delivered/.test(await snack(s).innerText()), 'it says so, with Undo')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select delivered_at is null from purchase_orders where id='${po3}'`) === '1', 'Undo takes the delivery back')
    // the PO's panel: the late note, Mark delivered beside the next step
    await s.locator(`[data-po="${po3}"] [data-testid="po-open"]`).first().click(); await settle(s, 1200)
    const panel = s.locator('[data-testid="po-panel"]')
    ok(/delivery is 3 days late/.test(await panel.innerText()) && await s.getByTestId('panel-po-delivered').count() === 1, 'the PO’s panel says the delivery is late and offers Mark delivered')
    await s.keyboard.press('Escape'); await settle(s, 400)

    // ── MO-011 Invoice to · MO-009 a line's milestone (the PO dialog) ───────────────────────────────────────────────────────────────────
    console.log('The PO dialog')
    await s.getByTestId('money-new').click(); await settle(s, 400)
    await menuItem(s, /^Purchase order/).click(); await settle(s, 500)   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */
    if (await s.locator('[data-testid="money-new-level"]').count()) { await s.getByRole('menuitem', { name: /^New purchase order/ }).first().click(); await s.waitForTimeout(700) }
    const dlg = s.locator('[role="dialog"][aria-label="New purchase order"]')
    ok(await dlg.count() === 1 && await dlg.getByTestId('po-bill-to').count() === 0, 'Invoice to waits behind More details')
    await dlg.getByTestId('po-more').click(); await settle(s, 300)
    const billTo = dlg.getByTestId('po-bill-to')
    ok(await billTo.count() === 1 && (await billTo.locator('textarea, input').first().inputValue()).length > 0, 'More details › Invoice to starts from the issuing entity’s letterhead')
    const lineMenu = dlg.getByTestId('po-line-menu').first()
    ok(await lineMenu.count() === 1, 'a line on a project with milestones has its ⋮')
    await lineMenu.click(); await settle(s, 300)
    const ms = sql(`select title from project_milestones where project_id='${ryan}' and deleted_at is null order by position limit 1`)
    ok(await s.getByRole('menuitemradio', { name: 'No milestone' }).count() === 1 && await s.getByRole('menuitemradio', { name: ms }).count() >= 1, '⋮ › Link to a milestone lists the project’s milestones')
    await s.getByRole('menuitemradio', { name: ms }).first().click(); await settle(s, 300)
    ok(new RegExp(`For ${ms.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(await dlg.getByTestId('po-line-milestone').first().innerText()), 'the line says the milestone it is for')
    await shot(s, 'pm-b-02-po-dialog', false)
    await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(s, 500)

    // ── MO-074 a vendor's expenses · MO-038 a PO made elsewhere (Company › Finance › Money out) ────────────────────────────────────────────
    console.log('Money out')
    await go(s, '/company/finance/vendors')
    const woodcraft = sql(`select id from vendors where name like 'Woodcraft%' limit 1`)
    await s.locator(`[data-vendor="${woodcraft}"] [data-testid="vendor-open"]`).first().click(); await settle(s, 900)
    ok(await s.getByTestId('vendor-panel-expenses').count() === 1, 'a vendor’s panel lists the expenses naming it, beside POs · Bills · Paid')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, '/company/finance/money-out?kind=purchase-orders')
    ok(await s.locator('[data-testid="finance-money-out"]').getByText(/^Issued by:/).count() === 0, 'one issuing entity: no Issued by pill')
    await s.getByTestId('finance-new').click(); await settle(s, 400)
    await s.getByTestId('finance-new-external-po').click(); await settle(s, 700)
    const ext = s.locator('[data-testid="external-po-dialog"]')
    ok(await ext.count() === 1, 'New ▾ › Record a PO made elsewhere opens its dialog')
    await s.getByTestId('external-po-save').click(); await settle(s, 400)
    ok(/Pick the project|Pick the vendor|Enter the PO’s own number/.test(await ext.innerText()), 'it asks for what it needs after the first press')
    await pick(s, ext, 'Project', /P-2026-001/)
    await pick(s, ext, 'Vendor', /Woodcraft/)
    await ext.getByLabel('Its PO number').fill('EXT-PMB-1')
    await ext.getByLabel('What it comes to (S$)').fill('1234.50')
    await ext.locator('input[type="file"]').first().setInputFiles({ name: 'ext-po.png', mimeType: 'image/png', buffer: PNG }); await settle(s, 900)
    await s.getByTestId('external-po-save').click(); await settle(s, 1800)
    const extId = sql(`select id from purchase_orders where number='EXT-PMB-1'`)
    if (extId) {
      later(`delete from cost_documents where record_id='${extId}'`); later(`delete from purchase_orders where id='${extId}'`)
    }
    ok(!!extId && sql(`select external || '|' || coalesce(vendor_token,'none') || '|' || total_minor || '|' || status from purchase_orders where id='${extId}'`) === '1|none|123450|sent', 'it is a PO marked external, for its amount, binding — and with no vendor link')
    ok(!!extId && sql(`select count(*) from cost_documents where record_kind='po' and record_id='${extId}'`) === '1', 'its file is kept with it')
    ok(/EXT-PMB-1 recorded/.test(await snack(s).innerText()), 'it says so')
    const extRow = s.locator(`[data-po="${extId}"]`).first()
    ok(/Recorded — made elsewhere/.test(await extRow.innerText()), 'its row reads Recorded — made elsewhere')
    ok(sql(`select count(*) from purchase_orders where number like 'PO-%' and external=1`) === '0', 'it keeps its own number — the studio’s PO numbers are untouched')
    await extRow.getByRole('button', { name: /More actions for EXT-PMB-1/ }).click(); await settle(s, 300)
    ok(await menuItem(s, /^Open its file/).count() === 1 && await menuItem(s, /Copy the vendor’s link/).count() === 0, 'its ⋮ opens its file and never offers a vendor’s link')
    await menuItem(s, /^Remove the record/).click(); await settle(s, 1500)
    ok(sql(`select deleted_at is not null from purchase_orders where id='${extId}'`) === '1' && /removed/.test(await snack(s).innerText()), 'Remove the record — one sentence, with Undo')
    await shot(s, 'pm-b-03-money-out', false)

    // ── MO-027 Download CSV · FB-097 the purchase order paper ─────────────────────────────────────────────────────────────────────────
    console.log('The vendor’s page and the PO paper')
    await go(s, '/settings?section=finance')
    const card = s.getByTestId('po-paper-settings')
    ok(await card.count() === 1 && await s.getByTestId('finance-money-out').getByTestId('po-paper-settings').count() === 1, 'Settings › Finance › Money out has The purchase order paper')
    await card.getByLabel('Header note').fill('Please confirm delivery a day ahead.')
    /* (pending modules, a deliberate change of this rule) S06 turned the acceptance block on by default (1.0's) — it is switched on only if a run finds it off */
    if (!(await card.getByLabel('An acceptance block for the vendor').isChecked())) { await card.getByLabel('An acceptance block for the vendor').locator('xpath=ancestor::label').first().click(); await settle(s, 200) }
    await card.getByTestId('po-paper-save').click(); await settle(s, 1400)
    later(rulesBefore ? `update settings set value='${esc(rulesBefore)}' where key='cost_rules'` : `delete from settings where key='cost_rules'`)
    ok(sql(`select json_extract(value,'$.paper.acceptance') || '|' || json_extract(value,'$.paper.header') from settings where key='cost_rules'`) === '1|Please confirm delivery a day ahead.', 'Save keeps the paper’s note and its acceptance block')
    await shot(s, 'pm-b-04-po-paper-settings', false)
    const token = sql(`select vendor_token from purchase_orders where id='${po3}'`)
    const V = await desk(); const v = await page(V, 'vendor')
    await go(v, `/po/${token}`)
    ok(await v.getByTestId('vendor-po-csv').count() === 1 && await v.getByTestId('vendor-po-download').count() === 1, 'the vendor’s page: Download CSV beside Download PDF')
    const [dl] = await Promise.all([v.waitForEvent('download', { timeout: 8000 }).catch(() => null), v.getByTestId('vendor-po-csv').click()])
    ok(!!dl && dl.suggestedFilename() === 'PO-2026-003.csv', 'Download CSV hands the vendor the PO’s lines as PO-2026-003.csv')
    const paperText = await v.getByTestId('po-paper').innerText()
    ok(/Please confirm delivery a day ahead/.test(paperText) && await v.getByTestId('po-paper-acceptance').count() === 1, 'the paper prints the header note and the acceptance block')
    ok(/Accepted on its link/.test(await v.getByTestId('po-paper-acceptance').innerText()), 'an accepted PO’s block is filled in')
    await shot(v, 'pm-b-05-vendor-page')
    await V.close()

    // ── MO-084 · FB-009 To do › Recently ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('To do › Recently')
    await go(s, '/company/finance/todo')
    const recent = s.getByTestId('todo-recently')
    await recent.scrollIntoViewIfNeeded().catch(() => {}); await settle(s, 300)
    const rows = await recent.getByTestId('todo-recent').count()
    ok(await recent.count() === 1 && rows >= 1 && rows <= 5, 'To do ends with Recently — five at most to start')
    const kinds = await recent.getByTestId('todo-recent').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
    ok(kinds.every((k) => ['invoice', 'payment', 'vo', 'credit', 'po', 'bill', 'expense', 'paid'].includes(k)), 'each row is chipped by its kind')
    if (await recent.getByTestId('todo-recent-more').count()) {
      await recent.getByTestId('todo-recent-more').click(); await settle(s, 300)
      const all = await recent.getByTestId('todo-recent').count()
      ok(all > 5 && all <= 10, 'Show more lists the rest — ten at most')
    }
    await shot(s, 'pm-b-06-todo-recently')

    // ── MO-079 · FB-105 · MO-058 the Issued by scope, with a second entity ─────────────────────────────────────────────────────────────
    console.log('Issued by, with two entities')
    later(`update settings set value='${esc(brandBefore)}' where key='brand'`)
    sql(`update settings set value=json_insert(value, '$.details.entities[#]', json('{"id":"pmb-two","name":"Demo Studio Two Pte Ltd","bankName":"","accountName":"","accountNo":"","payNow":"","payNowQr":null,"gstRegistered":true,"swift":"","logo":null,"address":"","uen":"","gstReg":""}')) where key='brand'`)
    await go(s, '/company/finance/money-out?kind=expenses')
    const pill = s.locator('[data-testid="finance-money-out"]').getByRole('button', { name: /^Issued by: All/ })
    ok(await pill.count() === 1, 'two entities: the Issued by pill on Money out')
    ok(await s.locator('[data-testid="costs-expenses"]').getByText('Issued by', { exact: true }).count() >= 1, 'and the rows’ Issued by column')
    await pill.click(); await settle(s, 300)
    await s.getByRole('menuitemradio', { name: 'Demo Studio Two Pte Ltd' }).click(); await settle(s, 600)
    ok(/entity=pmb-two/.test(s.url()), 'the scope rides the address')
    ok(await s.locator('[data-testid="costs-expenses"] [data-expense]').count() === 0, 'nothing is issued under the new entity yet — the list is empty under it')
    await s.getByTestId('finance-new').click(); await settle(s, 400)
    await s.getByTestId('finance-new-expense').click(); await settle(s, 700)
    ok(await s.locator('[data-testid="expense-dialog"]').getByRole('combobox', { name: /^Issued by/ }).count() === 1, 'the expense dialog offers Issued by')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, '/company/finance/todo')
    ok(await s.locator('[data-testid="finance-todo"]').getByRole('button', { name: /^Issued by: All/ }).count() === 1, 'To do has the same pill')
    await shot(s, 'pm-b-07-issued-by', false)
    sql(`update settings set value='${esc(brandBefore)}' where key='brand'`)

    // ── A Designer: no figures ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('A Designer')
    as('michelle')
    await go(s, `/projects/${ryan}/money`)
    ok(await s.getByTestId('where-costs-go').count() === 0, 'a Designer sees the records, never Where costs go (F1-Q2)')
    await allNeeds(s)
    ok(await s.locator('[data-testid="costs-po-late"]').count() === 1, 'the project’s team hears the late delivery (whoever prepares its POs)')
    as('dane')
    await S.close()

    // ── the bell (the derived row, once lib/notifications/queries.ts asks `derivedPoLateRows`) ─────────────────────────────────────────
    console.log('The bell')
    as('michelle')
    const B = await desk(); const bp = await page(B, 'bell')
    await go(bp, `/projects/${ryan}`)
    await bp.getByRole('button', { name: /^Notifications/ }).first().click(); await settle(bp, 900)
    ok(/PO-2026-003 delivery is 3 days late/.test(await bp.locator('body').innerText()), 'whoever made the PO hears the late delivery on the bell')
    await B.close()
    as('dane')

    // ── phone 390 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390')
    const Ph = await phoneCtx(); const ph = await page(Ph, 'phone')
    await go(ph, `/projects/${ryan}/money`)
    await ph.getByTestId('where-costs-go').scrollIntoViewIfNeeded().catch(() => {}); await settle(ph, 400)
    ok(await overflow(ph) <= 0, 'no sideways scroll on Money at 390')
    await shot(ph, 'pm-b-08-ryan-costs-390')
    await go(ph, '/company/finance/todo')
    ok(await overflow(ph) <= 0, 'no sideways scroll on To do at 390')
    await shot(ph, 'pm-b-09-todo-390')
    await go(ph, `/po/${token}`)
    ok(await overflow(ph) <= 0 && await ph.getByTestId('vendor-po-csv').count() === 1, 'the vendor’s page at 390: both downloads, no sideways scroll')
    await shot(ph, 'pm-b-10-vendor-390')
    await Ph.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    for (const q of undo.reverse()) { try { sql(q) } catch (e) { console.log('  (undo failed)', q.slice(0, 80)) } }
    sql(`delete from lead_events where at >= ${startAt} and (kind like 'parity_b_%' or kind like 'project_po_%' or kind like 'project_expense_%')`)
    sql(`delete from notifications where created_at >= ${startAt} and kind in ('po_review','po_sent_back','po_approved','po_answered','expense_review','expense_answered')`)
    as('dane')
    await b.close()
    const after = { pos: sql('select count(*) from purchase_orders'), docs: sql('select count(*) from cost_documents'), expenses: sql('select count(*) from expenses') }
    const same = JSON.stringify(before) === JSON.stringify(after) && sql('select count(*) from lead_events') === startEvents && sql('select count(*) from notifications') === startBell
      && sql(`select value from settings where key='brand'`) === brandBefore && sql(`select coalesce(value,'') from settings where key='cost_rules'`) === (rulesBefore || '')
    console.log(same ? '  ✓ the DB is as found' : `  ✗ the DB moved: ${JSON.stringify({ before, after, events: [startEvents, sql('select count(*) from lead_events')], bell: [startBell, sql('select count(*) from notifications')] })}`)
    if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '))
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail || !same ? 1 : 0)
  }
})()
