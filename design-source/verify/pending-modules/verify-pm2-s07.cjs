// Pending modules, step S07 · Projects leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key held:projects).
// Each item asserted as the rule it builds, never another round's count:
//  - an overpayment becomes a credit note (D-14, as recommended): Record a payment takes what arrived — the dialog says the extra becomes the
//    client's credit — and settles the invoice with what it owed; the extra is a credit note of its own kind (no GST, on the invoice it came
//    with, naming the payment, filed in Files › Payments, its Activity line); Money's Needs you says the credit is held with one filled step;
//    the receipt prints the extra, the credit note's paper says what is left; it is never voided; once a later invoice is sent, Use on it takes
//    the credit off as a payment FROM the credit note (method credit, its receipt, its line) with Undo; the original payment can't be reversed
//    while some of its credit is used; reversing the use gives the credit back; Record the refund gives it back to the client; the client's
//    portal says it; a client's proof above what is owed now splits on Confirm (and its Undo puts it back as they sent it)
//  - Files' Download on a money paper's entry (an invoice, a receipt, a credit note, a selection receipt) opens the paper printing (?print=1),
//    Back names Files; a credit note's entry holds no stand-in page (R109); Accounting downloads too and opens a selection receipt
//  - a lead's 3-D layout: the lead's 3-D Space Planner link lists the lead's own layouts and starts one saved with the lead (its line on the
//    lead's Activity, the gallery's Leads kind, the editor's "{lead} · Lead" and Back to the lead); Won carries it to the project (Design ›
//    Designs lists it, the Activity says it came from the lead)
//  - Accounting's project page and money papers start their crumb at Finance and Back leads to Finance (or where they came from)
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s07.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s07')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
/* the shell's double quotes: a quote, a dollar and a backtick in the SQL travel as themselves ("S$700.00" stays S$700.00) */
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s07-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const VIVIEN = sql(`select id from leads where name = 'Vivien Lee' and deleted_at is null`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it: every table whose rows differ at the end (a Won press touches many) */
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  const billingView = async (p, name) => { await p.locator('[data-testid="money-billing-view"]').getByRole('radio', { name }).click(); await settle(p, 500) }
  const menuItems = async (p) => (await p.getByRole('menuitem').allInnerTexts()).map((x) => x.split('\n')[0].trim())
  /* a paper's Download prints: the browser's dialog is counted, never opened */
  const stubPrint = (ctx) => ctx.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed = (window.__printed || 0) + 1 } })
  const printed = (p) => p.evaluate(() => window.__printed || 0)

  const ben = sql(`select id from projects where number = 'P-2026-002'`)
  const benLead = sql(`select lead_id from projects where id = '${ben}'`)
  const ryan = sql(`select id from projects where number = 'P-2026-001'`)
  const INV6 = sql(`select id from project_invoices where number = 'INV-2026-006'`)
  const COMP = sql(`select id from project_invoices where project_id = '${ben}' and stage_name = 'Completion' and status = 'draft'`)
  const XR = sql(`select id from project_invoices where external_ref = 'XR-1042'`)

  try {
    const ctx = await desk(); await stubPrint(ctx)
    const p = await page(ctx, 'desk')

    // ── 1 · An overpayment becomes the client's credit note ─────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Record a payment above what is owed — the extra becomes a credit note')
      as('dane')
      const owed = 2078494
      ok(Number(sql(`select amount_minor - (select coalesce(sum(amount_minor),0) from project_payments where invoice_id = '${INV6}' and status in ('confirmed','to_confirm')) from project_invoices where id = '${INV6}'`)) === owed, 'INV-2026-006 owes S$20,784.94 to start')
      await go(p, `/projects/${ben}/money`); await allNeeds(p)
      const od = p.locator('[data-testid="invoice-overdue"]').filter({ hasText: 'INV-2026-006' })
      await ((await od.count()) ? od.first().getByTestId('banner-record') : p.getByTestId('banner-record').first()).click()
      await settle(p, 700)
      const d = dialog(p)
      await d.getByLabel('Amount paid (S$)').fill('20900'); await settle(p, 300)
      ok(/S\$115\.06 more than is owed — it becomes Benjamin’s credit, for a later invoice or a refund/.test(await d.innerText()), 'the dialog takes what arrived and says the extra becomes the client’s credit (never refused)')
      await d.getByLabel('Reference').fill('DBS 88112 — S$20,900'); await settle(p, 500)
      await shot(p, '01-record-overpayment-1440')
      const cn0 = Number(sql(`select count(*) from credit_notes`))
      await d.getByTestId('record-save').click(); await settle(p, 2600)
      const msg = await snackText(p)
      const pay = json(`select id, amount_minor, status, receipt_number from project_payments where invoice_id = '${INV6}' and status = 'confirmed' order by created_at desc limit 1`)[0]
      const cn = json(`select * from credit_notes where payment_id = '${pay?.id}'`)[0]
      ok(pay && pay.amount_minor === owed, 'the payment settles what the invoice owed — S$20,784.94')
      ok(cn && cn.kind === 'overpayment' && cn.amount_minor === 11506 && cn.gst_minor === 0 && cn.invoice_id === INV6 && cn.status === 'issued' && Number(sql(`select count(*) from credit_notes`)) === cn0 + 1, 'the extra S$115.06 is a credit note of its own kind: no GST, on the invoice it came with, naming the payment')
      ok(new RegExp(`Payment recorded — receipt ${esc(pay?.receipt_number ?? '?')}; INV-2026-006 is paid — the extra S\\$115\\.06 is Benjamin’s credit, ${esc(cn?.number ?? '?')}`).test(msg), `the snackbar says the receipt, the invoice paid and the credit (${msg.slice(0, 120)})`)
      ok(cn && sql(`select f.parent_id = '${sql(`select id from lead_files where lead_id = '${benLead}' and kind = 'folder' and name = 'Payments' and parent_id is null`)}' from lead_files f where f.id = '${cn.file_id}'`) === '1', 'filed in Files › Payments')
      ok(cn && sql(`select count(*) from lead_events where kind = 'project_credit_issued' and json_extract(detail, '$.id') = '${cn.id}' and json_extract(detail, '$.overpayment') = 1`) === '1', 'its Activity line (an overpayment’s)')
      const CN = cn?.id ?? '', CNN = cn?.number ?? ''
      await settle(p, 1000); await go(p, `/projects/${ben}/money`); await allNeeds(p)
      const held = p.getByTestId('money-credit-held')
      ok(await held.count() === 1 && /Benjamin’s credit, /.test(await text(held)) && /S\$115\.06/.test(await text(held)) && /Paid beyond what INV-2026-006 owed/.test(await text(held)), 'Needs you: “Benjamin’s credit, CN-… · S$115.06 — Paid beyond what INV-2026-006 owed”')
      ok(await held.getByTestId('money-credit-refund').count() === 1 && await held.getByTestId('money-credit-use').count() === 0 && /comes off the next invoice once one is sent/.test(await text(held)), 'no later invoice owes yet: its one step is Record the refund, and it says the next invoice takes it')
      await shot(p, '02-credit-held-1440')
      ok(/S\$115\.06 kept as credit/.test(await text(p.locator(`[data-testid="money-stages"] [data-invoice="${INV6}"]`).last())), 'the invoice’s Paid cell says the extra kept as credit')
      await billingView(p, 'Credit notes')
      const row = p.locator(`[data-credit="${CN}"]`).first()
      ok(/Credit held/i.test(await text(row)) && /S\$115\.06 held for Benjamin/.test(await text(row)), 'the Credit notes view: Credit held, “S$115.06 held for Benjamin”')
      await row.getByRole('button', { name: new RegExp(`More for ${esc(CNN)}`) }).click(); await settle(p, 400)
      const items = await menuItems(p)
      ok(items.includes('Record the refund') && !items.some((x) => /^Void/.test(x)), `its ⋮: Record the refund, never Void (${items.join(' · ')})`)
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* the receipt and the credit note's paper */
      await go(p, `/projects/${ben}/receipts/${pay.id}`)
      ok(/S\$20,784\.94/.test(await text(p.getByTestId('receipt-amount'))) && new RegExp(`Kept as your credit — credit note ${esc(CNN)}`).test(await text(p.getByTestId('receipt-extra'))) && /S\$115\.06/.test(await text(p.getByTestId('receipt-extra'))) && /received S\$20,900\.00/.test(await text(p.getByTestId('receipt-paper'))), 'the receipt: S$20,784.94 for the invoice, the extra kept as credit, “received S$20,900.00”')
      await shot(p, '03-receipt-extra-1440', true)
      await go(p, `/projects/${ben}/credit-notes/${CN}`)
      const paper = await text(p.getByTestId('credit-note-paper'))
      ok(/Overpayment — paid S\$20,900\.00 when INV-2026-006 owed S\$20,784\.94/.test(paper) && /S\$115\.06/.test(await text(p.getByTestId('credit-left'))) && !/Before GST/.test(paper), 'the credit note’s paper: the overpayment, no GST, S$115.06 left')
      await shot(p, '04-credit-paper-1440', true)
      /* no Void on the server either */
      ok(sql(`select status from credit_notes where id = '${CN}'`) === 'issued', 'still issued')

      console.log('1b · a later invoice is sent — Use on it, Undo, then use it')
      sql(`update project_invoices set status = 'sent', number = 'INV-2026-090', sent_at = strftime('%s','now'), sent_by = 'dane', due_at = strftime('%s','now') + 14 * 86400 where id = '${COMP}'`)
      await go(p, `/projects/${ben}/money`); await allNeeds(p)
      const held2 = p.getByTestId('money-credit-held')
      ok(await held2.getByTestId('money-credit-use').count() === 1 && /Use on INV-2026-090/.test(await text(held2.getByTestId('money-credit-use'))) && await held2.getByTestId('money-credit-refund').count() === 1, 'once INV-2026-090 owes: the filled step is “Use on INV-2026-090”, Record the refund beside it')
      await held2.getByTestId('money-credit-use').click(); await settle(p, 2400)
      let use = json(`select id, amount_minor, method, credit_note_id, receipt_number, status from project_payments where invoice_id = '${COMP}' and credit_note_id = '${CN}'`)[0]
      ok(use && use.amount_minor === 11506 && use.method === 'credit' && use.status === 'confirmed' && !!use.receipt_number, 'Use on: a payment of S$115.06 FROM the credit note (method credit), confirmed with its receipt')
      ok(new RegExp(`S\\$115\\.06 of ${esc(CNN)} taken off INV-2026-090; receipt`).test(await snackText(p)), 'the snackbar says it, with Undo')
      await undo(p)
      ok(Number(sql(`select count(*) from project_payments where credit_note_id = '${CN}'`)) === 0 && sql(`select count(*) from lead_events where kind = 'project_credit_used' and json_extract(detail, '$.id') = '${CN}'`) === '0', 'Undo takes the payment, its receipt and its line back')
      await go(p, `/projects/${ben}/money`); await allNeeds(p)
      await p.getByTestId('money-credit-use').click(); await settle(p, 2400)
      use = json(`select id, amount_minor, receipt_number from project_payments where invoice_id = '${COMP}' and credit_note_id = '${CN}' and status = 'confirmed'`)[0]
      ok(!!use && sql(`select count(*) from lead_events where kind = 'project_credit_used' and json_extract(detail, '$.payment') = '${use?.id}'`) === '1', 'used again — its Activity line')
      await settle(p, 800); await go(p, `/projects/${ben}/money`); await allNeeds(p)
      ok(await p.getByTestId('money-credit-held').count() === 0, 'nothing of the credit is left: the Needs you row is gone')
      await billingView(p, 'Credit notes')
      ok(/\bUsed\b/i.test(await text(p.locator(`[data-credit="${CN}"]`).first())) && /S\$115\.06 used/.test(await text(p.locator(`[data-credit="${CN}"]`).first())), 'the credit note reads Used — “S$115.06 used”')
      await go(p, `/projects/${ben}/receipts/${use.id}`)
      ok(new RegExp(`Taken from your credit — credit note ${esc(CNN)}`).test(await text(p.getByTestId('receipt-paper'))), 'the use’s receipt: “Taken from your credit — credit note CN-…”')
      await go(p, `/projects/${ben}/activity`)
      ok(new RegExp(`took S\\$115\\.06 of Benjamin Han’s credit ${esc(CNN)} off “INV-2026-090”`).test(await text(p.locator('main'))) && new RegExp(`the extra S\\$115\\.06 is their credit, ${esc(CNN)}`).test(await text(p.locator('main'))), 'Activity: the overpayment and the use, in words')

      console.log('1c · the original payment is not reversed while its credit is used; reversing the use gives it back; the refund')
      await go(p, `/projects/${ben}/money`); await billingView(p, 'Payments')
      await p.locator(`[data-payment="${pay.id}"]`).first().getByRole('button', { name: /More actions for the payment/ }).click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: 'Reverse' }).click(); await settle(p, 500)
      await dialog(p).getByLabel('Why is it reversed?').fill('Wrong invoice')
      await dialog(p).getByRole('button', { name: 'Reverse' }).click(); await settle(p, 1800)
      ok(sql(`select status from project_payments where id = '${pay.id}'`) === 'confirmed' && new RegExp(`Its extra is credit note ${esc(CNN)}, and some of it was used or refunded — take that back first`).test(await snackText(p)), 'Reverse refused while some of its credit is used — the snackbar says why')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, `/projects/${ben}/money`); await billingView(p, 'Payments')
      await p.locator(`[data-payment="${use.id}"]`).first().getByRole('button', { name: /More actions for the payment/ }).click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: 'Reverse' }).click(); await settle(p, 500)
      await dialog(p).getByLabel('Why is it reversed?').fill('Refunding instead')
      await dialog(p).getByRole('button', { name: 'Reverse' }).click(); await settle(p, 2000)
      ok(sql(`select status from project_payments where id = '${use.id}'`) === 'reversed', 'the credit’s use is reversed')
      await go(p, `/projects/${ben}/money`); await allNeeds(p)
      const held3 = p.getByTestId('money-credit-held')
      ok(await held3.count() === 1 && /S\$115\.06/.test(await text(held3)), 'the credit holds again')
      await held3.getByTestId('money-credit-refund').click(); await settle(p, 700)
      const rd = p.getByTestId('credit-refund-dialog')
      ok(/115\.06/.test(await rd.getByLabel('Amount refunded (S$)').inputValue()), 'Record the refund opens with what is held')
      await p.getByTestId('credit-refund-save').click(); await settle(p, 2200)
      ok(sql(`select refund_minor from credit_notes where id = '${CN}'`) === '11506' && new RegExp(`Refund of S\\$115\\.06 recorded on ${esc(CNN)}`).test(await snackText(p)), 'the refund recorded on the credit note')
      await go(p, `/projects/${ben}/money`); await allNeeds(p)
      ok(await p.getByTestId('money-credit-held').count() === 0, 'nothing held: the row is gone')
      await go(p, `/projects/${ben}/credit-notes/${CN}`)
      ok(/S\$0\.00/.test(await text(p.getByTestId('credit-left'))) && /S\$115\.06 was refunded/.test(await text(p.getByTestId('credit-note-paper'))), 'the paper: refunded, nothing left')

      console.log('1d · the client sees their credit on the portal')
      sql(`update credit_notes set refund_minor = NULL, refunded_on = NULL, refund_method = NULL, refund_reference = NULL, refunded_by = NULL where id = '${CN}'`)
      const C = await desk(); const c = await page(C, 'portal')
      await go(c, '/my/demo-studio/login'); await settle(c, 600)
      await c.locator('input[type="tel"]').fill('97731968')
      await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
      await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
      await c.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(c, 1200)
      await go(c, '/my/demo-studio/money')
      /* the Mid-project stage is paid: its row says the receipt and, after it, the client's credit — a link to its paper */
      const link = c.locator('[data-testid="portal-credit-link"]').filter({ hasText: CNN })
      ok(await link.count() >= 1 && new RegExp(`Your credit ${esc(CNN)} \\(S\\$115\\.06 left\\)`).test(await text(link)), 'the portal: the paid stage says “Your credit CN-… (S$115.06 left)”')
      await link.first().click(); await settle(c, 1500)
      ok(/Overpayment — paid S\$20,900\.00 when INV-2026-006 owed S\$20,784\.94/.test(await text(c.getByTestId('credit-note-paper'))), 'and opens its paper on the portal')
      await shot(c, '05-portal-credit-1440', true)
      await C.close()

      console.log('1e · the handover asks for the held credit')
      await go(p, `/projects/${ben}`)
      await p.locator('[data-testid="project-stage"] button').click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /^Completed/ }).first().click()
      await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 8000 }).catch(() => {}); await settle(p, 600)
      const chk = p.getByTestId('check-credit-held')
      ok(await chk.count() === 1 && /Nothing of Benjamin’s credit is left/.test(await text(chk)) && /S\$115\.06 of Benjamin’s money is held as credit — take it off an invoice, or refund it/.test(await text(chk)) && await chk.getAttribute('data-met') === 'no', 'the Hand over sheet: “Nothing of Benjamin’s credit is left” — open while S$115.06 is held, deferrable')
      ok(await p.getByTestId('check-credit-held-defer').count() === 1, 'deferrable, as every row')
      await shot(p, '05b-handover-credit-1440')
      await p.keyboard.press('Escape'); await settle(p, 500)
    }

    // ── 2 · A client's proof above what is owed now splits on Confirm ───────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Confirm a client’s proof above what is owed')
      as('dane')
      const pid = 'pm2s07-proof'
      const ryanHome = sql(`select id from homeowner_profiles where name = 'Ryan D’Souza' limit 1`)
      sql(`insert into project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, note, proof_file_id, source, status, trusted, recorded_by, submitted_by, created_at, updated_at) values ('${pid}', '${ryan}', '${XR}', 70000, strftime('%s', date('now','localtime')), 'bank_transfer', 'FAST 4412', NULL, NULL, 'client', 'to_confirm', 0, NULL, '${ryanHome}', strftime('%s','now'), strftime('%s','now'))`)
      await go(p, `/projects/${ryan}/money`); await allNeeds(p)
      const banner = p.locator(`[data-payment-banner="${pid}"]`)
      ok(await banner.count() === 1, 'the proof waits to be confirmed')
      await banner.getByTestId('payment-confirm').click(); await settle(p, 2400)
      const r = json(`select amount_minor, status, receipt_number from project_payments where id = '${pid}'`)[0]
      const cn = json(`select * from credit_notes where payment_id = '${pid}'`)[0]
      ok(r?.status === 'confirmed' && r.amount_minor === 64800 && cn?.kind === 'overpayment' && cn.amount_minor === 5200, 'Confirm settles the S$648.00 owed and the extra S$52.00 becomes the client’s credit note')
      ok(/Confirmed — S\$700\.00 from Ryan, receipt .*; the extra S\$52\.00 is their credit, CN-/.test(await snackText(p)), 'the snackbar says the credit')
      await undo(p)
      const back = json(`select amount_minor, status from project_payments where id = '${pid}'`)[0]
      ok(back?.status === 'to_confirm' && back.amount_minor === 70000 && Number(sql(`select count(*) from credit_notes where payment_id = '${pid}'`)) === 0, 'Undo: back to To confirm for S$700.00, as the client sent it — the credit note gone')
      sql(`delete from project_payments where id = '${pid}'`)   // the probe's own proof goes (the end puts every table back too)
    }

    // ── 3 · Files' Download on a money paper's entry ────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Download on an invoice, a receipt, a credit note, a selection receipt')
      as('dane')
      const payFolder = sql(`select id from lead_files where lead_id = '${benLead}' and kind = 'folder' and name = 'Payments' and parent_id is null`)
      const choices = sql(`select id from lead_files where lead_id = '${benLead}' and kind = 'folder' and name = 'Choices' and parent_id is null`)
      const cases = [
        ['an invoice', sql(`select file_id from project_invoices where number = 'INV-2026-003'`), payFolder, /\/invoices\//, 'invoice-page'],
        ['a receipt', sql(`select receipt_file_id from project_payments where project_id = '${ben}' and receipt_file_id is not null and status = 'confirmed' limit 1`), payFolder, /\/receipts\//, 'receipt-paper'],
        ['a credit note', sql(`select file_id from credit_notes where number = 'CN-2026-002'`), payFolder, /\/credit-notes\//, 'credit-note-paper'],
        ['a selection receipt', sql(`select receipt_file_id from project_selections where project_id = '${ben}' and receipt_file_id is not null limit 1`), choices, /\/selection-receipts\//, null],
      ]
      for (const [what, fileId, folder, re, testId] of cases) {
        await go(p, `/projects/${ben}/files?folder=${folder}`)
        const name = sql(`select name from lead_files where id = '${fileId}'`)
        const tile = p.locator(`[data-testid="file-tile"][data-kb-id="${fileId}"]`)
        await tile.getByRole('button', { name: `Actions for ${name}` }).click(); await settle(p, 400)
        await p.getByRole('menuitem', { name: 'Download', exact: true }).click()
        await p.waitForURL(re, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
        const url = p.url()
        ok(re.test(url) && /[?&]print=1/.test(url) && (await printed(p)) >= 1 && (!testId || await p.getByTestId(testId).count() > 0), `${what}: Download opens its paper and prints it (${name})`)
        if (what === 'an invoice') await shot(p, '06-download-invoice-1440')
        const backBtn = p.getByRole('button', { name: 'Back to Files' })
        ok(await backBtn.count() === 1, `${what}: Back names Files`)
        await backBtn.click(); await p.waitForURL(/\/files/, { timeout: 8000 }).catch(() => {}); await settle(p, 800)
        ok(new RegExp(`/projects/${ben}/files\\?folder=${folder}`).test(p.url()), `${what}: Back returns to the folder it came from`)
      }
      ok(sql(`select count(*) from lead_files f join credit_notes c on c.file_id = f.id where exists (select 1 from lead_file_images i where i.file_id = f.id)`) === '0', 'a credit note’s entry holds no stand-in page — its paper is its PDF (R109)')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_layout_linked' and json_extract(detail, '$.carried') = 1`)) >= 0, '(the R109 carry wrote nothing it should not)')
      /* Accounting downloads too, and a selection receipt opens for them */
      as('priya')
      await go(p, `/projects/${ben}/files?folder=${payFolder}`)
      const inv3 = sql(`select file_id from project_invoices where number = 'INV-2026-003'`)
      await p.locator(`[data-testid="file-tile"][data-kb-id="${inv3}"]`).getByRole('button', { name: /^Actions for / }).click(); await settle(p, 400)
      ok(JSON.stringify(await menuItems(p)) === JSON.stringify(['Open', 'Download']), 'Accounting’s ⋮ on a money paper: Open · Download')
      await p.getByRole('menuitem', { name: 'Download', exact: true }).click(); await p.waitForURL(/\/invoices\//, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
      ok(/[?&]print=1/.test(p.url()) && await p.getByTestId('access-gate').count() === 0 && (await printed(p)) >= 1, 'Accounting: Download opens the invoice printing — never the gate')
      const sel = sql(`select receipt_file_id from project_selections where project_id = '${ben}' and receipt_file_id is not null limit 1`)
      await go(p, `/projects/${ben}/files/${sel}`)
      ok(/\/selection-receipts\//.test(p.url()) && await p.getByTestId('access-gate').count() === 0, 'Accounting opens a selection receipt from Files — not the gate')
      as('dane')
    }

    // ── 4 · A lead's 3-D layout follows it to its project ───────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · A layout started on a lead, carried to its project at Won')
      as('dane')
      ok(sql(`select count(*) from projects where lead_id = '${VIVIEN}'`) === '0', 'Vivien Lee has no project yet')
      await go(p, `/leads/${VIVIEN}`)
      await p.locator('aside[aria-label="Create"]').getByRole('button', { name: '3D Space Planner' }).click(); await settle(p, 1200)   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
      const dlg = p.getByTestId('project-layouts-dialog')
      ok(await dlg.count() === 1 && /goes to the project once the lead is won/.test(await text(p.locator('[role="dialog"]').last())), 'the lead’s link opens Plan the space in 3D — the lead’s own, saying it goes to the project once won')
      await shot(p, '07-lead-layouts-1440')
      await p.getByTestId('project-layout-new').click(); await settle(p, 700)
      const nd = p.getByTestId('planner-new-dialog')
      ok(/For Vivien Lee — it is saved with the lead and goes to the project once it is won/.test(await text(p.locator('[role="dialog"]').last())), 'New layout: “For Vivien Lee — it is saved with the lead…”')
      await nd.locator('[data-key="hdb-3"]').click()
      await p.getByTestId('planner-start').click()
      await p.waitForURL(/\/planner\/[^/?]+/, { timeout: 15000 }); await settle(p, 2500)
      const made = p.url().split('/planner/')[1].split('?')[0]
      ok(sql(`select lead_id = '${VIVIEN}' and project_id is null and is_template = 0 from space_layouts where id = '${made}'`) === '1', 'the layout is saved with the lead (no project yet)')
      ok(/Vivien Lee · Lead/i.test(await text(p.getByTestId('planner-topbar'))) && /Back to Vivien Lee|Back to the lead/.test(await p.getByTestId('planner-back').getAttribute('aria-label')), 'the editor: “Vivien Lee · Lead”, and Back to the lead')
      ok(sql(`select count(*) from lead_events where lead_id = '${VIVIEN}' and project_id is null and kind = 'project_layout_created' and json_extract(detail, '$.id') = '${made}'`) === '1', 'its line on the lead’s Activity')
      await shot(p, '08-lead-layout-editor-1440')
      await p.getByTestId('planner-back').click(); await p.waitForURL(new RegExp(`/leads/${VIVIEN}`), { timeout: 10000 }).catch(() => {}); await settle(p, 1000)
      ok(new RegExp(`/leads/${VIVIEN}`).test(p.url()), 'Back returns to the lead')
      await p.locator('aside[aria-label="Create"]').getByRole('button', { name: '3D Space Planner' }).click(); await settle(p, 1500)   /* (pending modules S17, a deliberate change of this rule) one spelling: “3D”, the mock’s (Create links 732) and 1.0’s */
      ok(await p.getByTestId('project-layout').count() === 1 && /1 layout for Vivien Lee/.test(await text(p.locator('[role="dialog"]').last())), 'the link again: the lead’s layout listed — “1 layout for Vivien Lee”')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, '/planner')
      await p.getByRole('button', { name: /^Kind/ }).first().click(); await settle(p, 300)
      ok(await p.getByRole('menuitemradio', { name: /^Leads/ }).count() === 1, 'the gallery’s Kind offers Leads once a lead has a layout')
      await p.getByRole('menuitemradio', { name: /^Leads/ }).click(); await settle(p, 600)
      ok(/Vivien Lee/.test(await text(p.locator('main'))), 'Kind: Leads — Vivien Lee’s layout')
      await shot(p, '08b-planner-leads-1440')
      await go(p, `/leads/${VIVIEN}/activity`)
      ok(/started the 3D layout/.test(await text(p.locator('main'))), 'the lead’s Activity says it was started')
      /* Won — the same steps as pj-r1 */
      await go(p, `/leads/${VIVIEN}`)
      await p.locator('[data-testid="header-primary"] button').click(); await settle(p, 900)
      const wiz = p.locator('[role="dialog"][aria-label="Move stage"]')
      const tabs = wiz.getByRole('tab', { name: 'Upload' })
      await tabs.nth(0).click(); await settle(p, 200)
      await wiz.locator('input[type="file"]').nth(0).setInputFiles({ name: 'Vivien-signed-quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await settle(p, 1800)
      await wiz.getByLabel('Quote amount (S$)').fill('88500')
      await tabs.nth(1).click(); await settle(p, 200)
      await wiz.locator('input[type="file"]').last().setInputFiles({ name: 'Vivien-signed-contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await settle(p, 1800)
      await wiz.getByRole('button', { name: 'Reset to default' }).click(); await settle(p, 200)
      await wiz.getByRole('button', { name: 'Save & Convert to Project' }).click()
      await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await settle(p, 1500)
      const vp = sql(`select id from projects where lead_id = '${VIVIEN}'`)
      ok(!!vp && sql(`select project_id from space_layouts where id = '${made}'`) === vp, 'Won: the project takes the lead’s layout')
      ok(sql(`select count(*) from lead_events where project_id = '${vp}' and kind = 'project_layout_linked' and json_extract(detail, '$.id') = '${made}' and json_extract(detail, '$.carried') = 1`) === '1', 'its line on the project: carried from the lead')
      await go(p, `/projects/${vp}/designs`)
      ok(await p.getByTestId('designs-layout').filter({ hasText: 'HDB 3-Room' }).count() >= 1, 'Design › Designs lists it')
      await shot(p, '09-project-designs-1440', true)
      await go(p, `/projects/${vp}/activity`)
      ok(/started on the lead, is now the project’s/.test(await text(p.locator('main'))), 'Activity: “The 3D layout “…”, started on the lead, is now the project’s.”')
      await go(p, `/planner/${made}`)
      ok(/P-\d{4}-\d{3} · Vivien Lee/i.test(await text(p.getByTestId('planner-topbar'))), 'the editor now names the project')
    }

    // ── 5 · Accounting's crumb and Back ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Accounting: the project and its papers start at Finance')
      as('priya')
      await go(p, `/projects/${ben}/money`)
      const crumb = await text(p.locator('[data-testid="project-page"] header nav, [data-testid="project-page"] header [class*="crumb"]').first())
      const backAria = await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('aria-label')
      const backHref = await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('href')
      ok(/Finance/.test(crumb) && !/Projects/.test(crumb), `the crumb starts at Finance (${crumb})`)
      ok(/Back to Finance/.test(backAria ?? '') && backHref === '/company/finance', 'Back leads to Finance')
      await shot(p, '10-accounting-money-1440')
      await go(p, `/projects/${ben}/money?from=${encodeURIComponent('/company/finance/money-in')}`)
      ok((await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('href')) === '/company/finance/money-in', 'from Finance › Money in: Back returns there')
      await go(p, `/projects/${ben}/money?from=${encodeURIComponent('/projects')}`)
      ok((await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('href')) === '/company/finance', 'a from they can’t open (the Projects listing) falls back to Finance')
      await go(p, `/projects/${ben}/invoices/${INV6}`)
      ok(/^Finance/.test(await text(p.getByTestId('invoice-page').locator('nav').first())) || /Finance/.test(await text(p.locator('header').first())), 'the invoice paper’s crumb starts at Finance')
      await p.locator('header').first().getByRole('link', { name: 'Finance' }).first().click().catch(() => {}); await settle(p, 1200)
      ok(/\/company\/finance/.test(p.url()) && await p.getByTestId('access-gate').count() === 0, 'and leads to Finance — never the gate')
      as('dane')
      await go(p, `/projects/${ben}/money`)
      ok(/Projects/.test(await text(p.locator('[data-testid="project-page"] header').first())) && (await p.locator('[data-testid="project-page"] header a[data-kb="back"]').getAttribute('href')) === '/projects', 'an Owner’s crumb and Back stay Projects')
    }

    // ── 6 · the phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · 390 and 320')
      as('dane')
      /* a held credit to draw: record one more overpayment as the probe's own row, put back after */
      const cnId = 'pm2s07-cn', payId = 'pm2s07-pay'
      sql(`insert into project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, note, proof_file_id, source, status, trusted, recorded_by, submitted_by, confirmed_by, confirmed_at, created_at, updated_at) values ('${payId}', '${ryan}', '${XR}', 64800, strftime('%s', date('now','localtime')), 'bank_transfer', NULL, NULL, NULL, 'studio', 'confirmed', 0, 'dane', NULL, 'dane', strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))`)
      sql(`insert into credit_notes (id, project_id, invoice_id, number, reason, amount_minor, gst_minor, status, issued_by, issued_at, created_at, kind, payment_id) values ('${cnId}', '${ryan}', '${XR}', 'CN-2026-099', 'Paid S$700.00 when XR-1042 owed S$648.00', 5200, 0, 'issued', 'dane', strftime('%s','now'), strftime('%s','now'), 'overpayment', '${payId}')`)
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h); const m = await page(pc, `phone-${w}`)
        await go(m, `/projects/${ryan}/money`)
        ok(await sideways(m) <= 0, `${w}: Money with a held credit has no sideways scroll`)
        if (w === 390) { await allNeeds(m); const r = m.getByTestId('money-credit-held'); ok(await r.count() === 1, '390: the held credit is a Needs you row'); await r.scrollIntoViewIfNeeded(); await settle(m, 300); await shot(m, '11-credit-held-390') }
        await go(m, `/projects/${ryan}/credit-notes/${cnId}`)
        ok(await sideways(m) <= 0 && await m.getByTestId('credit-overpayment').count() === 1, `${w}: the overpayment’s paper, no sideways scroll`)
        if (w === 390) await shot(m, '12-credit-paper-390', true)
        await go(m, `/leads/${sql(`select id from leads where name = 'Serena Koh' and deleted_at is null`)}`)
        ok(await sideways(m) <= 0, `${w}: a lead page, no sideways scroll`)
        await go(m, '/planner')
        ok(await sideways(m) <= 0, `${w}: the planner’s gallery, no sideways scroll`)
        await pc.close()
      }
    }

    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
