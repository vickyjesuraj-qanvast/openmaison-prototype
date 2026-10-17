// Projects round 6 — money in, part two: the seeded states (R75: Benjamin's Deposit and Commencement paid with their receipts and his
// Mid-project overdue; Ryan's proof waiting for Michelle; Aisha's reversed cheque); the overdue banner, Remind on WhatsApp (opened on the press,
// recorded) and the derived bell row; Record a payment — part, then Undo; the portal's Money tab (board 4: Paid so far, the PayNow QR with the
// amount and the invoice number, the bank, I have paid with the bank's confirmation) → "Received, waiting…" → the confirmer (Germaine) sees it
// (the banner, the proof, Needs my review, the bell) → Not received with a reason the client reads → sent again → Confirm → its receipt in the
// studio and in the portal; Reverse (an Owner's; a Designer's refused) → the receipt reads Reversed; Trust the client's proof on → paid at
// once; a pick → a variation order drafted from it and opened again; Who sees money; Settings › Projects › Payments; Activity; Files; the
// listing's Collected and "Payment overdue"; phone 390 (studio and portal) and desktop 1440.
// Run against `next start -p 3021` on the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: BASE=http://localhost:3021 NODE_PATH=<repo>/node_modules node verify-pj-r6.cjs <scratch.db path> [shotDir]
// (REG-1074) Receipt numbers are asserted by the rule, never a fixed string: the next number in the studio's pattern, read off the data
// (receipts number in the order payments are confirmed — R76's Shalini Menon takes one of her own), and the seeded ones are read by whose
// payment they are.
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r6')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3021'
const REPO = path.resolve(__dirname, '../../..')
const PROOF = path.join(REPO, 'public/projects/payments/ryan-bank-transfer.png')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/* (S45C — the demo moves with the restore day, S42A) a day this probe asserts is read from its record and worded as the app words it —
   never a window around the day the probe was written. A stored stamp is seconds or milliseconds; the day is the local one. */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toMs = (v) => { const n = Number(v); return n > 1e12 ? n : n * 1000 }
const dayMonthOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${d.getDate()} ${MON3[d.getMonth()]}` }   // "5 Oct"
const dayLabelOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${WD3[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}` }   // "Mon 19 Oct"
const displayDateOf = (v) => { const d = new Date(typeof v === 'string' && /T/.test(v) ? v : toMs(v)); return `${dayMonthOf(v)} ’${String(d.getFullYear()).slice(2)}` }   // "16 Nov ’26" (lib/format.ts displayDate)
const reOf = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
/* (S45C) Benjamin's mid-project invoice: its due day and how late it is, as the app counts them (lib/projects/payments-model.ts daysOverdue) */
const MID_DUE = sql(`select due_at from project_invoices where number='INV-2026-006'`)
const MID_LATE = Math.max(0, Math.floor((Date.now() - toMs(MID_DUE)) / 864e5))
/** (REG-1074) The studio's receipt pattern (`receipt_numbering`, else RCT-{YYYY}-{seq}) — lib/projects/payments-model.ts `parseReceiptNumbering`. */
const receiptPattern = () => {
  let r = {}
  try { r = JSON.parse(sql(`select value from settings where key='receipt_numbering'`) || '{}') } catch { r = {} }
  const prefix = (typeof r.prefix === 'string' && r.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()) || 'RCT'
  const year = r.year === undefined ? true : r.year === true
  const digits = typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : 3
  const next = typeof r.next === 'number' && Number.isFinite(r.next) && r.next > 0 ? Math.floor(r.next) : 0
  return { prefix, year, digits, next }
}
/** The number the next receipt takes, by the rule (`nextReceiptNumber`): one past the highest already given under the prefix, never below
    the pattern's next — verify-pj-r5.cjs's `nextInvoiceNo()` for receipts. */
const nextReceiptNo = () => {
  const r = receiptPattern()
  const highest = sql(`select receipt_number from project_payments where receipt_number is not null`).split('\n').filter((x) => x.startsWith(`${r.prefix}-`))
    .reduce((m, x) => Math.max(m, Number((/(\d+)$/.exec(x) || [])[1] || 0)), 0)
  const seq = Math.max(r.next || 1, highest + 1)
  return [r.prefix, ...(r.year ? [String(new Date().getFullYear())] : []), r.digits ? String(seq).padStart(r.digits, '0') : String(seq)].join('-')
}
/** A seeded receipt, by whose payment it is: the project, the stage, the payment's status. */
const receiptOf = (projectId, stage, status) => sql(`select x.receipt_number from project_payments x join project_invoices i on i.id = x.invoice_id where i.project_id='${projectId}' and i.stage_name='${stage}' and x.status='${status}' and x.receipt_number is not null order by x.confirmed_at desc limit 1`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003')
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  const mid = sql(`select id from project_invoices where number='INV-2026-006'`)
  const top = sql(`select id from project_selections where project_id='${ben}' and title='Kitchen countertop'`)
  /* what the probe puts back */
  const T0 = Number(sql(`select strftime('%s','now')`)) - 2
  const paysBefore = json(`select * from project_payments`)
  const filesBefore = json(`select id, name, updated_at from lead_files`)
  const settingsBefore = json(`select * from settings where key in ('project_payments','receipt_numbering')`)
  const vosBefore = sql(`select id from quotes where kind='variation'`).split('\n').filter(Boolean)
  const linkBefore = json(`select id, last_opened_at from homeowner_lead_links where lead_id='${benLead}'`)
  const updatesBefore = json(`select id, client_opened_at from project_updates where project_id='${ben}'`)   // the portal's home marks the newest update seen
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const signIn = async (p) => {
    await go(p, '/my/demo-studio/login'); await settle(p, 600)
    await p.locator('input[type="tel"]').fill('97731968')
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
  }
  const pays = (p) => p.locator('[data-testid="money-payments"] [data-payment]')
  /* (simplify S-07 · Q-05) Needs you shows three rows (two on a phone), the rest behind "Show n more"; the Payments list is the admin's view of
     Billing (its chips); a payment also lives in its invoice's panel */
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  const billingView = async (p, name) => { await p.locator('[data-testid="money-billing-view"]').getByRole('radio', { name }).click(); await settle(p, 500) }
  const openInvoice = async (p, stage) => { await p.locator('[data-testid="money-stages"] [role="row"]').filter({ hasText: new RegExp(`^${stage}`) }).first().getByTestId('invoice-row-open').click(); await settle(p, 900) }
  const midState = () => json(`select status, amount_minor from project_payments where invoice_id='${mid}' order by created_at desc`)

  try {
    // ── The seeded states (desk, Dane — Owner) ───────────────────────────────────────────────────────────────────────────────
    console.log('The seeded states (1440)')
    as('dane')
    const S = await desk()
    await S.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const s = await S.newPage(); watch(s, 'studio')
    await go(s, `/projects/${ben}/money`)
    /* (simplify S-07, a deliberate change of this rule) the four tiles and the story became To collect (its line: collected of the contract) */
    ok(/S\$27,713\.25 collected/.test(await s.locator('[data-testid="money-collected"]').innerText()), 'Benjamin: collected S$27,713.25 — the Deposit and Commencement paid (board 4’s figure)')
    ok(/S\$20,784\.94/.test(await s.locator('[data-testid="tile-collect"]').innerText()) && /S\$20,784\.94 overdue/.test(await s.locator('[data-testid="tile-collect"]').innerText()), 'To collect S$20,784.94 — overdue')
    await allNeeds(s)
    const over = s.locator('[data-testid="invoice-overdue"]')
    ok(await over.count() === 1 && /INV-2026-006 · Mid-Project/.test(await over.innerText()) && /S\$20,784\.94/.test(await over.innerText()) && reOf(`${MID_LATE <= 1 ? 'A day' : `${MID_LATE} days`} overdue · due ${dayMonthOf(MID_DUE)}`).test(await over.innerText()), `the overdue row (Needs you): the invoice, the stage, the amount, days and due day (${MID_LATE} days · ${dayMonthOf(MID_DUE)})`)
    const stages = await s.locator('[data-testid="money-stages"]').innerText()
    ok((stages.match(/PAID/gi) ?? []).length >= 2 && /OVERDUE/i.test(stages), 'Billing reads Paid · Paid · Overdue')
    const benCom = receiptOf(ben, 'Commencement', 'confirmed')
    ok(!!benCom && new RegExp(esc(benCom)).test(stages), `Billing folds the receipts into their invoice’s row (${benCom})`)
    await shot(s, 'money-ben-1440')
    /* (simplify round 2, R2-A — P3 §6.2) a tile goes to its list: To pay → Costs, To collect → Billing */
    await s.locator('[data-testid="tile-pay"]').click(); await settle(s, 1000)
    ok(await s.locator('#costs').evaluate((e) => { const r = e.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 }), 'pressing To pay brings Costs into view (R2-A)')
    await s.locator('[data-testid="tile-collect"]').click(); await settle(s, 1000)
    ok(await s.locator('#billing').evaluate((e) => { const r = e.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0 }), 'pressing To collect brings Billing into view (R2-A)')
    /* (simplify round 2, R2-A) `&do=sendback` — the Overview's Needs you rows' Send back: a PO waiting for approval opens its note */
    await go(s, `/projects/${ben}/money?open=${sql(`select id from purchase_orders where number='PO-2026-008'`)}&do=sendback`); await settle(s, 900)
    ok(/Send back/.test(await dialog(s).innerText().catch(() => '')), '&do=sendback opens PO-2026-008’s Send back note (R2-A)')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, `/projects/${ben}/money`)
    await billingView(s, 'Payments')
    ok(await pays(s).count() === 2 && !!benCom && new RegExp(esc(benCom)).test(await pays(s).first().innerText()) && /Germaine/.test(await pays(s).first().innerText()), `Payments (the admin’s view): two receipts, the newest Germaine’s PayNow (${benCom})`)
    await billingView(s, 'All')
    await allNeeds(s)   // (simplify round 2) the overdue row may rest under Needs you's "Show n more" once the approvals lead it
    // Remind on WhatsApp — opened on the press, recorded
    await s.evaluate(() => { window.__opened = [] })
    await over.locator('[data-testid="invoice-remind"]').click(); await settle(s, 1500)
    const wa = await s.evaluate(() => window.__opened[0] ?? '')
    ok(/wa\.me\/6597731968/.test(wa) && /INV-2026-006/.test(decodeURIComponent(wa)) && /S\$20,784\.94/.test(decodeURIComponent(wa)) && /\/my\/demo-studio/.test(decodeURIComponent(wa)), 'Remind on WhatsApp opens on the press: his number, the invoice, the amount, his portal')
    ok(/[Rr]eminder drafted/.test(await snack(s).innerText())   /* (parity map, a deliberate change of this rule) MI-068: the third reads "Third reminder drafted…" */ && sql(`select count(*) from lead_events where kind='project_invoice_reminded' and at >= ${T0}`) === '1', 'the reminder is recorded (a line in Activity)')
    // the bell: a derived overdue row for the team
    await s.getByRole('button', { name: /^Notifications/ }).first().click(); await settle(s, 1200)
    ok(/Overdue: INV-2026-006 · S\$20,784\.94/.test(await s.locator('[data-testid="notifications-panel"]').innerText()), 'the bell: "Overdue: INV-2026-006 · S$20,784.94" for the team (derived from the date)')
    await s.keyboard.press('Escape'); await settle(s, 400)
    // Ryan: a proof waiting for Michelle; Aisha: the reversed cheque
    await go(s, `/projects/${ryan}/money`)
    const wait = s.locator('[data-testid="payment-to-confirm"]')
    ok(await wait.count() === 1 && /Ryan says they paid for/.test(await wait.innerText()) && /S\$13,370\.04/.test(await wait.innerText()) /* (fix-D, D-44) one form of the name: the story's */ && await wait.locator('[data-testid="payment-proof-link"]').count() === 1, 'Ryan: his proof waits — "says they paid S$13,370.04", the bank’s confirmation one press away')
    ok(/PAYMENT TO CONFIRM/i.test(await s.locator('[data-testid="money-stages"] [data-invoice]').nth(1).innerText()), 'his Commencement reads Payment to confirm (never Overdue while it waits)')
    await go(s, `/projects/${aisha}/money`); await billingView(s, 'Payments')
    const rev = s.locator('[data-payment][data-status="reversed"]')
    ok(await rev.count() === 1 && /The cheque was returned unpaid by the bank/.test(await rev.innerText()), 'Aisha: the reversed cheque, with its reason')
    const aishaRev = receiptOf(aisha, 'Deposit', 'reversed')
    await rev.getByRole('link', { name: aishaRev }).click(); await s.waitForURL(/\/receipts\//); await settle(s, 1500)
    ok(/Reversed — The cheque was returned unpaid by the bank/i.test(await s.locator('[data-testid="receipt-reversed"]').innerText()) && new RegExp(esc(aishaRev)).test(await s.locator('[data-testid="receipt-number"]').innerText()), `its receipt page reads Reversed, with why (${aishaRev})`)
    await shot(s, 'receipt-reversed-1440')

    // ── Record a payment — a part, then Undo (F-10 · F-11) ─────────────────────────────────────────────────────────────────
    console.log('Record a payment')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    await s.locator('[data-testid="banner-record"]').click(); await settle(s, 700)
    ok(/Record a payment/.test(await dialog(s).innerText()) && /^20,?784\.94$/.test(await dialog(s).getByLabel('Amount paid (S$)').inputValue()), 'Record a payment opens with what is still owed')
    /* (pending modules, a deliberate change of this rule — S07, D-14 as recommended) more than is owed is no longer refused: the dialog says the
       extra becomes the client's credit note (the S07 probe records one) */
    await dialog(s).getByLabel('Amount paid (S$)').fill('30000'); await settle(s, 400)
    ok(/S\$9,215\.06 more than is owed — it becomes Benjamin’s credit, for a later invoice or a refund/.test(await dialog(s).innerText()), 'more than is owed: the form says the extra becomes the client’s credit')
    await dialog(s).getByLabel('Amount paid (S$)').fill('5000')
    await dialog(s).locator('[data-testid="record-method"]').getByText('Cash', { exact: true }).click()
    await dialog(s).getByLabel('Reference').fill('Cash at the site, paid to Dane')
    await shot(s, 'record-dialog-1440', false)
    const rct1 = nextReceiptNo()   // read before the press: the number it must take
    await dialog(s).getByRole('button', { name: 'Record payment' }).click(); await settle(s, 2000)
    const part = midState()[0]
    ok(part && part.status === 'confirmed' && part.amount_minor === 500000, 'a part payment is recorded, confirmed on entry')
    ok(new RegExp(`Payment recorded — receipt ${esc(rct1)}; S\\$15,784\\.94 still owed on INV-2026-006`).test(await snack(s).innerText()), `the snackbar names the receipt (${rct1}, the next in the studio’s pattern) and what is still owed`)
    await settle(s, 800)
    ok(/OVERDUE/i.test(await s.locator('[data-testid="money-stages"]').innerText()) && /S\$5,000\.00/.test(await s.locator('[data-testid="money-stages"]').innerText()), 'the Mid-Project invoice, part paid past its due day, reads Overdue with what is paid (fix-D, D-16 — the Paid cell, simplify S-07)')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 2000)
    ok(midState().length === 0 && sql(`select count(*) from lead_files where name like '${rct1}%'`) === '0', 'Undo takes the payment, its receipt and its file back')

    // ── The portal's Money tab (board 4) and I have paid (Q-48) ──────────────────────────────────────────────────────────────
    console.log('The portal: Money and I have paid')
    const C = await desk(); const c = await C.newPage(); watch(c, 'portal')
    await signIn(c)
    /* (fix-G, G-27) past its due day the line says so — "is overdue · was due 2 Oct"; before it, board 1's "is due · due 2 Oct" */
    ok(reOf(`Your mid-project payment is ${MID_LATE > 0 ? 'overdue' : 'due'}`).test(await c.locator('[data-testid="portal-needs"]').innerText()) && reOf(`S$20,784.94 · ${MID_LATE > 0 ? 'was due' : 'due'} ${dayMonthOf(MID_DUE)}`).test(await c.locator('[data-testid="portal-needs"]').innerText()), `What needs you: "Your mid-project payment is ${MID_LATE > 0 ? 'overdue' : 'due'} · S$20,784.94 · ${MID_LATE > 0 ? 'was due' : 'due'} ${dayMonthOf(MID_DUE)}" (board 1 — "was due" once that day has passed)`)
    ok(await c.locator('[data-testid="portal-nav"] a[data-key="money"]').count() === 1, 'the portal’s sections: Money after Updates')
    await go(c, '/my/demo-studio/money')
    ok(/S\$27,713\.25 of S\$69,283\.13/.test(await c.locator('[data-testid="portal-paid"]').innerText()), 'Paid so far: S$27,713.25 of S$69,283.13')
    const due = c.locator('[data-testid="portal-pay-due"]')
    ok(/Mid-project · 30%/.test(await due.innerText()) && /Due now/.test(await due.innerText()), 'the payment due: "Mid-project · 30% · Due now" (the client’s one case, fix-F F-32)')
    const payload = await due.locator('[data-testid="paynow-qr"]').getAttribute('data-payload')
    ok(!!payload && payload.includes('SG.PAYNOW') && payload.includes('5408' + '20784.94') && payload.includes('INV-2026-006') && /6304[0-9A-F]{4}$/.test(payload), 'the PayNow QR carries the amount and INV-2026-006 as its reference')
    ok(/Pay to\s*Demo Studio Pte Ltd/.test(await due.innerText()) && /DBS Bank · 072-904418-3/.test(await due.innerText()) && /PayNow 201234567M/.test(await due.innerText()), 'how to pay: the issuing entity’s account, bank and PayNow')
    ok(await c.locator('[data-testid="portal-receipt-link"]').count() === 2, 'the paid stages carry their receipts')
    await shot(c, 'portal-money-1440')
    await due.locator('[data-testid="portal-i-have-paid"]').click(); await settle(c, 700)
    await dialog(c).getByRole('button', { name: 'Send' }).click(); await settle(c, 400)
    ok(/Add your bank’s confirmation so the studio can match it/.test(await dialog(c).innerText()), 'the bank’s confirmation is needed')
    await dialog(c).locator('[data-testid="proof-field"] input[type="file"]').setInputFiles(PROOF); await settle(c, 1500)
    await dialog(c).getByLabel('Reference (optional)').fill('FT2610051133')
    await shot(c, 'portal-i-have-paid-1440', false)
    await dialog(c).getByRole('button', { name: 'Send' }).click(); await settle(c, 2500)
    ok(/Received — Demo Studio will confirm it/.test(await snack(c).innerText()), 'sent: "Received — Demo Studio will confirm it and send your receipt"')
    const sent1 = midState()[0]
    ok(sent1 && sent1.status === 'to_confirm', 'the payment waits as To confirm (proof never marks an invoice paid by itself)')
    ok(/Received, waiting for Demo Studio to confirm/.test(await c.locator('[data-testid="portal-pay-due"]').innerText()), 'the portal: "Received, waiting for Demo Studio to confirm"')
    await shot(c, 'portal-waiting-1440')
    ok(sql(`select count(*) from notifications where kind='payment_to_confirm' and member_id='germaine' and created_at >= ${T0}`) === '1' && sql(`select count(*) from notifications where kind='payment_to_confirm' and member_id='dane' and created_at >= ${T0}`) === '0', 'the bell: the confirmer (Germaine, the assigned designer) is told — not the Owner')
    await go(c, '/my/demo-studio')
    ok(!/mid-project payment is (due|overdue)/.test(await c.locator('[data-testid="portal-needs"]').innerText()), 'What needs you no longer asks for it')

    // ── The confirmer: Not received, then Confirm ───────────────────────────────────────────────────────────────────────────
    console.log('The confirmer answers (Germaine)')
    as('germaine')
    await go(s, '/projects?scope=review')
    ok((await s.locator('[data-kb-row]').allInnerTexts()).some((t) => /Benjamin/.test(t)), '“Needs my review” holds Benjamin’s project for its confirmer')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    const ask = s.locator('[data-testid="payment-to-confirm"]')
    ok(/Benjamin says they paid for INV-2026-006/.test(await ask.innerText()) /* (fix-D, D-44) */ && /S\$20,784\.94/.test(await ask.innerText()) && /FT2610051133/.test(await ask.innerText()), 'the Needs you row: who, how much, the reference')
    ok(!/overdue/i.test(await s.locator('[data-testid="money-stages"]').innerText()) && /PAYMENT TO CONFIRM/i.test(await s.locator('[data-testid="money-stages"]').innerText()), 'the invoice reads Payment to confirm, no longer Overdue')
    await shot(s, 'to-confirm-1440')
    /* (simplify S-07, a deliberate change of this rule) the proof is the Needs you row's own button — it opens the file in the project's Files */
    await ask.locator('[data-testid="payment-proof-link"]').click(); await s.waitForURL(/\/projects\/[^/]+\/files\//, { timeout: 15000 }).catch(() => {})
    ok(/\/projects\/[^/]+\/files\//.test(s.url()), 'the bank’s confirmation opens in the project’s Files')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    await ask.locator('[data-testid="payment-not-received"]').click(); await settle(s, 600)
    await dialog(s).getByLabel('Why — what didn’t match?').fill('Not in our account yet — please check the account number')
    await dialog(s).getByRole('button', { name: 'Mark not received' }).click(); await settle(s, 2000)
    ok(midState()[0].status === 'not_received' && /Marked not received/.test(await snack(s).innerText()), 'Not received, with the reason')
    await go(c, '/my/demo-studio/money')
    ok(/couldn’t find your payment of S\$20,784\.94 from \d+ \w+: Not in our account yet/.test(await c.locator('[data-testid="portal-pay-refused"]').innerText()) && await c.locator('[data-testid="portal-i-have-paid"]').isEnabled(), 'the client reads why, and can send it again')
    await shot(c, 'portal-refused-1440')
    await c.locator('[data-testid="portal-i-have-paid"]').click(); await settle(c, 700)
    await dialog(c).locator('[data-testid="proof-field"] input[type="file"]').setInputFiles(PROOF); await settle(c, 1500)
    await dialog(c).getByRole('button', { name: 'Send' }).click(); await settle(c, 2500)
    ok(midState()[0].status === 'to_confirm', 'sent again')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    const rct2 = nextReceiptNo()   // the Undo gave its number back: the confirmation takes the next one by the rule
    await s.locator('[data-testid="payment-confirm"]').click(); await settle(s, 2000)
    const conf = json(`select status, receipt_number, confirmed_by from project_payments where invoice_id='${mid}' and status='confirmed'`)[0]
    ok(conf && conf.receipt_number === rct2 && conf.confirmed_by === 'germaine' && new RegExp(`Confirmed — S\\$20,784\\.94 from Benjamin, receipt ${esc(rct2)}`).test(await snack(s).innerText()), `Confirm: ${rct2}, by Germaine`)
    await settle(s, 800)
    ok(/S\$48,498\.19 collected/.test(await s.locator('[data-testid="money-collected"]').innerText()) && await s.locator('[data-testid="invoice-overdue"]').count() === 0, 'collected S$48,498.19; nothing overdue')
    ok(sql(`select count(*) from notifications where kind='payment_confirmed' and member_id='dane' and created_at >= ${T0}`) === '1', 'the team hears it confirmed')
    ok(sql(`select count(*) from lead_files where lead_id='${benLead}' and name='${rct2} · Mid-Project.pdf'`) === '1', 'Files › Payments files the receipt')
    // a Designer may not reverse — (simplify S-08) her payments are in the invoice's panel (the Payments view is the admin's)
    await openInvoice(s, 'Mid-Project')
    const row = s.locator('[data-testid="invoice-panel"] [data-payment][data-status="confirmed"]').first()
    await row.getByRole('button', { name: /More actions for the payment/ }).click(); await settle(s, 400)
    ok(await s.getByRole('menuitem', { name: 'Reverse' }).getAttribute('aria-disabled') === 'true', 'Reverse is the Owners’ and Admins’ (off for a Designer)')
    await s.keyboard.press('Escape'); await s.keyboard.press('Escape')
    // the client's receipt
    await go(c, '/my/demo-studio/money')
    ok(await c.locator('[data-testid="portal-pay-due"]').count() === 0 && await c.locator('[data-testid="portal-receipt-link"]').count() === 3, 'the portal: Mid-Project paid, with its receipt')
    await c.locator('[data-testid="portal-receipt-link"]').last().click(); await c.waitForURL(/\/money\/receipt\//); await settle(c, 1500)
    ok(new RegExp(esc(rct2)).test(await c.locator('[data-testid="receipt-number"]').innerText()) && /S\$20,784\.94/.test(await c.locator('[data-testid="receipt-amount"]').innerText()), 'the client opens the receipt in the portal — the studio’s paper')
    await shot(c, 'portal-receipt-1440')

    // ── Reverse (an Owner's), the receipt reads Reversed (F-18) ─────────────────────────────────────────────────────────────
    console.log('Reverse')
    as('dane')
    await go(s, `/projects/${ben}/money`); await billingView(s, 'Payments')
    await s.locator('[data-payment][data-status="confirmed"]').first().getByRole('button', { name: /More actions for the payment/ }).click(); await settle(s, 400)
    await s.getByRole('menuitem', { name: 'Reverse' }).click(); await settle(s, 500)
    await dialog(s).getByLabel('Why is it reversed?').fill('Recorded against the wrong invoice')
    await dialog(s).getByRole('button', { name: 'Reverse' }).click(); await settle(s, 2000)
    ok(json(`select status, reverse_reason from project_payments where receipt_number='${rct2}'`)[0]?.status === 'reversed' && new RegExp(`${esc(rct2)} reversed`).test(await snack(s).innerText()), 'Reverse, with the reason')
    await settle(s, 600); await allNeeds(s)
    ok(await s.locator('[data-testid="invoice-overdue"]').count() === 1, 'the invoice is owed (and overdue) again')
    ok(sql(`select name from lead_files where name like '${rct2}%'`) === `${rct2} · Mid-Project (reversed).pdf`, 'its file in Files says so')
    const rid = sql(`select id from project_payments where receipt_number='${rct2}'`)
    await go(s, `/projects/${ben}/receipts/${rid}`)
    ok(/Reversed — Recorded against the wrong invoice/i.test(await s.locator('[data-testid="receipt-reversed"]').innerText()), 'the receipt reads Reversed')

    // ── Trust the client's proof → paid at once ─────────────────────────────────────────────────────────────────────────────
    console.log('Trust the client’s proof')
    /* (simplify S-15, a deliberate change of this rule) Client payments moved to Settings › Finance › Money in; the receipt numbers to Finance's
       one Document numbers card */
    await go(s, '/settings?section=finance')
    const card = s.locator('[data-testid="payment-settings"]')
    await card.scrollIntoViewIfNeeded()
    const nextNo = nextReceiptNo()   // a reversed receipt keeps its number: the next is one past it
    /* (one-home N-14, a deliberate change of this rule) the card is "Client payments" now */
    ok(/Client payments/.test(await card.innerText()) && /Who confirms a client’s payment/i.test(await card.innerText()) && /Trust the client’s proof/.test(await card.innerText()) && new RegExp(esc(nextNo)).test(await s.getByTestId('receipt-number-example').innerText()), `Settings › Finance › Client payments: who confirms, the trust switch; Document numbers: the receipt numbers (next ${nextNo})`)
    await card.locator('[data-testid="payment-trust-row"] label').first().click(); await settle(s, 1500)
    ok(JSON.parse(sql(`select value from settings where key='project_payments'`) || '{}').trust === true, 'Trust the client’s proof: on')
    await shot(s, 'settings-payments-1440', false)
    await go(c, '/my/demo-studio/money')
    await c.locator('[data-testid="portal-i-have-paid"]').click(); await settle(c, 700)
    await dialog(c).locator('[data-testid="proof-field"] input[type="file"]').setInputFiles(PROOF); await settle(c, 1500)
    await dialog(c).getByRole('button', { name: 'Send' }).click(); await settle(c, 2500)
    const trusted = json(`select status, trusted from project_payments where invoice_id='${mid}' order by created_at desc`)[0]
    ok(trusted && trusted.status === 'to_confirm' && trusted.trusted === 1, 'the proof counts at once (trusted) and still waits to be checked')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    ok(/PAID/.test(await s.locator('[data-testid="money-stages"] [data-invoice]').nth(2).innerText()) && /counts already/i.test(await s.locator('[data-testid="payment-to-confirm"]').innerText()), 'the invoice reads Paid at once; the banner says it still wants checking')
    await go(s, `/projects/${ben}`)
    ok(/S\$ 48,498(?!\.)/.test(await s.locator('[data-testid="money-collected"]').innerText()), 'the Overview’s Money card counts the trusted proof as collected')   // (parity Q-03, a deliberate change of this rule) the card's sum, whole dollars
    sql(`update settings set value = json_set(value, '$.trust', json('false')) where key='project_payments'`)
    sql(`delete from project_payments where invoice_id='${mid}' and trusted=1`)   // the rest of the run sees the Mid-Project owed again
    await c.close()

    // ── A pick's variation order (Q-18) ─────────────────────────────────────────────────────────────────────────────────────
    console.log('A pick → a variation order')
    await go(s, `/projects/${ben}/choices`)
    const counter = s.locator('[data-testid="choice-card"]', { has: s.locator('h3', { hasText: 'Kitchen countertop' }) })
    ok(await counter.locator('[data-testid="choice-draft-vo"]').count() === 1, 'the chosen countertop (+S$1,200) offers Draft a variation order')
    const cardLine = await counter.locator('[data-testid="choice-contract"]').innerText()
    await counter.locator('[data-testid="choice-draft-vo"]').click(); await s.waitForURL(/\/quotes\//, { timeout: 15000 }).catch(() => {}); await settle(s, 1800)
    const vo = json(`select id, number, title, amount_minor, kind, selection_id from quotes where selection_id='${top}' and deleted_at is null`)[0]
    ok(!!vo && vo.kind === 'variation' && vo.number === 'VO-1' && /Kitchen countertop — Calacatta quartz/.test(vo.title) && s.url().includes(`/quotes/${vo.id}`), 'a variation order, VO-1, drafted from the pick and opened in the editor')
    ok(!!vo && sql(`select count(*) from quote_items where quote_id='${vo.id}' and kind='item' and name like 'Kitchen countertop — Calacatta quartz%' and cost_minor=120000`) === '1' && vo.amount_minor > 120000, 'its line is the pick at its price against the quote (GST on top as the contract’s)')
    /* (REG-1068) the card said what the contract moves by — the variation order carries exactly that figure */
    const voFigure = `+S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((vo?.amount_minor ?? 0) / 100)} on the contract`
    ok(!!vo && cardLine.includes(voFigure), `the card’s "${cardLine.replace(/^\W+/, '').trim()}" is the variation order’s ${voFigure.replace(' on the contract', '')}`)
    await shot(s, 'vo-from-pick-1440')
    await go(s, `/projects/${ben}/choices`)
    ok(/Open VO-1/.test(await counter.locator('[data-testid="choice-open-vo"]').innerText()), 'the card now opens VO-1 instead of drafting another')
    ok(/started the variation order “VO-1” \(Kitchen countertop — Calacatta quartz\)/.test(await (async () => { await go(s, `/projects/${ben}/activity`); return s.locator('[data-testid="activity-feed"]').innerText() })()), 'Activity names the order after the choice')

    // ── Activity, Files, the Overview and the listing ───────────────────────────────────────────────────────────────────────
    console.log('Activity, Files, Overview, listing')
    const act = await s.locator('[data-testid="activity-feed"]').innerText()
    ok(/Benjamin Han said they paid S\$20,784\.94 by bank transfer for the Mid-Project invoice/.test(act) && /marked Benjamin Han’s payment of S\$20,784\.94 for the Mid-Project invoice “INV-2026-006” as not received/.test(act), 'Activity: the client’s payment and Not received')
    ok(new RegExp(`confirmed Benjamin Han’s payment of S\\$20,784\\.94 .* receipt “${esc(rct2)}”`).test(act) && /reversed the payment of S\$20,784\.94/.test(act) && /reminded Benjamin Han on WhatsApp/.test(act), 'Activity: confirmed, reversed, reminded')
    ok(/recorded Benjamin Han’s payment of S\$6,928\.31 by bank transfer for the Deposit invoice/.test(act), 'Activity: the seeded payments carry their trail')
    await go(s, `/projects/${ryan}`)
    /* (simplify S-01 · P3 §6.6, a deliberate change of this rule) Payment to confirm moved to Needs you — a row with its Confirm, the amount in whole dollars */
    /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
    { const more = s.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await s.waitForTimeout(300) } }
    ok(/S\$ ?13,370/.test(await s.locator('[data-testid="need-money-confirm"]').first().innerText()), 'Needs you: Ryan’s payment to confirm')
    await go(s, '/projects')
    ok(await s.getByRole('columnheader', { name: /Collected/ }).count() >= 1, 'the listing’s Collected column (Owner)')
    await go(s, `/projects/${ryan}/files`)
    ok(/Payments/.test(await s.locator('main').innerText()), 'Files: the Payments folder')
    await go(s, '/settings?section=studio')
    const rules = await s.locator('body').innerText()
    ok(/Record a client’s payment on a project/.test(rules) && /Confirm a payment a client says they made/.test(rules) && /Reverse a confirmed payment/.test(rules), 'Who may do what: record · confirm · reverse')
    await S.close()

    // ── Who sees money (F-17) ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Who sees money')
    as('sarah')
    const W = await desk(); const w = await W.newPage(); watch(w, 'outsider')
    const r1 = await w.goto(`${BASE}/projects/${ben}/money`, { waitUntil: 'networkidle' }); await settle(w)
    ok(r1.status() === 404 || await w.locator('[data-testid="money-hidden"]').count() === 1, 'a Designer off the team sees no money (hidden, or the project not found)')
    ok(!new RegExp(`${esc(receiptPattern().prefix)}-\\d`).test(await w.locator('body').innerText()), '…and no receipt')
    const rcpt = sql(`select x.id from project_payments x join project_invoices i on i.id = x.invoice_id where i.project_id='${ben}' and i.stage_name='Deposit' and x.status='confirmed' limit 1`)
    await w.goto(`${BASE}/projects/${ben}/receipts/${rcpt}`, { waitUntil: 'networkidle' }); await settle(w)
    ok(await w.locator('[data-testid="receipt-paper"]').count() === 0 && !/S\$6,928\.31/.test(await w.locator('body').innerText()), 'a receipt page answers not found to them')
    await go(w, '/projects')
    ok(await w.getByRole('columnheader', { name: /Collected/ }).count() === 0, 'the listing’s Collected column is the Owners’ and Admins’')
    await W.close()
    as('dane')

    // ── Phone 390 — the studio and the portal ───────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/projects/${ben}/money`); await settle(m, 800)
    ok(await noOverflow(m), 'no sideways scroll at 390 (studio)')
    /* (simplify S-07 · Q-06) Billing's rows are the listing's phone cards; Needs you shows two, the rest behind Show n more */
    ok(await m.locator('[data-testid="money-stages"] [data-invoice]').count() >= 3 && await m.locator('[data-testid="money-stages"] [role="columnheader"]').first().isHidden(), 'Billing’s rows are cards on a phone')
    await shot(m, 'money-ben-390')
    await allNeeds(m)
    await m.locator('[data-testid="banner-record"]').click(); await settle(m, 800)
    const sheet = await dialog(m).boundingBox()
    ok(!!sheet && sheet.y + sheet.height > 800 && sheet.width > 370, 'Record a payment is a bottom sheet (REG-353)')
    await shot(m, 'record-390', false)
    await m.keyboard.press('Escape')
    const MC = await phone(); const mc = await MC.newPage(); watch(mc, 'portal-phone')
    await signIn(mc)
    await go(mc, '/my/demo-studio/money')
    ok(await noOverflow(mc), 'no sideways scroll at 390 (portal)')
    const order = await mc.evaluate(() => [...document.querySelectorAll('[data-slot="paid"], [data-slot="payments"]')].map((e) => [e.getAttribute('data-slot'), e.getBoundingClientRect().top]))
    ok(order.length === 2 && order.find((x) => x[0] === 'paid')[1] < order.find((x) => x[0] === 'payments')[1], 'board 4’s order on a phone: Paid so far, then the payments')
    await shot(mc, 'portal-money-390')
    await mc.locator('[data-testid="portal-i-have-paid"]').click(); await settle(mc, 800)
    const psheet = await dialog(mc).boundingBox()
    ok(!!psheet && psheet.y + psheet.height > 800, 'I have paid is a bottom sheet on a phone')
    await shot(mc, 'portal-i-have-paid-390', false)
    await M.close(); await MC.close()
  } finally {
    as('dane')
    /* the payments exactly as they were */
    sql(`delete from project_payments`)
    for (const r of paysBefore) sql(`insert into project_payments (${Object.keys(r).join(',')}) values (${Object.values(r).map(lit).join(',')})`)
    /* the files: the ones it made go (with their pictures), the names it changed come back */
    const keep = new Set(filesBefore.map((f) => f.id))
    for (const id of sql(`select id from lead_files`).split('\n').filter(Boolean)) if (!keep.has(id)) { sql(`delete from lead_file_images where file_id='${id}'`); sql(`delete from lead_files where id='${id}'`) }
    for (const f of filesBefore) sql(`update lead_files set name=${lit(f.name)}, updated_at=${lit(f.updated_at)} where id='${f.id}' and name <> ${lit(f.name)}`)
    /* the settings */
    sql(`delete from settings where key in ('project_payments','receipt_numbering')`)
    for (const r of settingsBefore) sql(`insert into settings (${Object.keys(r).join(',')}) values (${Object.values(r).map(lit).join(',')})`)
    /* the variation order it drafted */
    const made = sql(`select id from quotes where kind='variation'`).split('\n').filter((id) => id && !vosBefore.includes(id))
    for (const id of made) { sql(`delete from quote_items where quote_id='${id}'`); sql(`delete from notifications where quote_id='${id}'`); sql(`delete from quotes where id='${id}'`) }
    sql(`update project_selections set updated_at = updated_at where id='${top}'`)
    /* its trail, its bell rows, the portal's sessions and stamps */
    sql(`delete from lead_events where at >= ${T0} and (kind like 'project_payment_%' or kind in ('project_invoice_reminded','project_vo_created'))`)
    sql(`delete from notifications where created_at >= ${T0} and (kind like 'payment_%' or kind in ('invoice_reminded','invoice_sent'))`)   // (parity map, a deliberate change of this rule) MI-068 · UC-098: the third reminder and a send tell Owners and Admins
    sql(`delete from portal_sessions where created_at >= ${T0}`)
    for (const l of linkBefore) sql(`update homeowner_lead_links set last_opened_at = ${lit(l.last_opened_at)} where id='${l.id}'`)
    for (const u of updatesBefore) sql(`update project_updates set client_opened_at = ${lit(u.client_opened_at)} where id='${u.id}'`)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
