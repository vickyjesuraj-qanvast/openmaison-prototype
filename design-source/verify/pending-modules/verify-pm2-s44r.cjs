// S44R · agreements and bills — the UAT comments, rows 358 · 359 · 361 (Vicky 2026-10-15: "fix all the UAT comments based on our 2.0 experience
// … If you have any questions please go ahead based on your recommendations"; triage design-source/context/feedback/05-uat-comments-246-364-triage
// -2026-10-15.md, calls C7 · C8 · C9, each as recommended). Each item asserted as the rule it builds:
//  C8 (row 361) · a supplier bill over the PO approval limit with no PO, or more than its PO by over the tolerance, waits for an Owner's or an
//      Admin's OK before it is paid (REVERSES F1-Q10): To do › To approve for Dane (never To pay), Waiting for approval for Priya (Accounting)
//      with the rule where the button would be; Approve + Undo; the bell and Activity lines; Settings › Finance › Money out's third rule and its
//      tolerance; a Designer's bill over its PO says before it is recorded that it will wait, and does.
//  C7 (row 358) · Settings › Projects › When a project starts (the quote is signed = today's; the agreement is signed); the library's Letter of
//      Appointment; Send for digital signature's "Ask for the deposit" (said whole, saved as ticked); the client signs → the signing page ends on
//      "Pay the deposit" (the money papers' pay box, the PayNow QR with the deposit and its reference) and the lead moves to Won THROUGH the Won
//      step's rules — the project made, its deposit invoice drafted, the move's Activity line naming the signature; today's rule moves nothing;
//      an agreement the Won step can't take says why in the bell.
//  C9 (row 359) · Company › Templates › Contracts › Use at handover (one at a time, the chip); the Hand over sheet's "Send {client} the completion
//      letter" filled from the project (completed today, the defects period and its end) — to read and keep (the letter's link: nothing to sign)
//      or to sign; the completion's Undo takes it back to Deleted Contracts.
//  Width: 390 touch (and 320) with no sideways scroll; no page errors.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`
// (the touched tables are dumped first and written back whole).
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s44r.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44r')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
/* the tables these flows write — dumped before, written back whole after */
const TABLES = ['leads', 'lead_assignees', 'stage_logs', 'projects', 'project_invoices', 'project_milestones', 'lead_events', 'notifications', 'notification_outbox', 'lead_tasks', 'task_assignees',
  'lead_files', 'contracts', 'quotes', 'settings', 'supplier_bills', 'payments_out', 'cost_documents', 'contract_templates', 'contract_bundles', 'space_layouts', 'project_floor_plans', 'floor_plan_photos', 'project_compliance']
const dump = () => Object.fromEntries(TABLES.map((t) => [t, execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" ".mode insert ${t}" "select * from ${t}"`, { maxBuffer: 256 * 1024 * 1024 }).toString()]))
const restore = (d) => {
  const file = path.join(os.tmpdir(), `s44r-restore-${process.pid}.sql`)
  fs.writeFileSync(file, `PRAGMA foreign_keys=OFF;\nBEGIN;\n${TABLES.map((t) => `DELETE FROM ${t};\n${d[t]}`).join('\n')}\nCOMMIT;\n`)
  execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${file}"`)
  fs.unlinkSync(file)
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const saved = dump()
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  /* WhatsApp opens on the press — answered here so no page leaves the test machine */
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })) }
  const waSeen = []
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); ctx.on('page', (np) => { np.on('framenavigated', (f) => { if (f === np.mainFrame() && /wa\.me/.test(f.url())) waSeen.push(decodeURIComponent(f.url())) }) }); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const tick = async (scope) => { await scope.getByTestId('gate-accept').locator('label, [role="checkbox"], input').first().click({ force: true }) }
  const caseTrust = async (pg) => {
    const box = pg.getByRole('checkbox', { name: 'I have read the CaseTrust deposit-protection disclosure' })
    if (!(await box.count()) || await box.first().isChecked().catch(() => false)) return
    await pg.getByTestId('gate-casetrust-tick').first().scrollIntoViewIfNeeded().catch(() => {})
    await pg.getByTestId('gate-casetrust-tick').first().click(); await pg.waitForTimeout(300)
  }
  /* the demo's records */
  const BEN_PID = sql(`select id from projects where number = 'P-2026-002'`)
  const RYAN_PID = sql(`select id from projects where number = 'P-2026-001'`)
  const RYAN_LEAD = sql(`select lead_id from projects where id = '${RYAN_PID}'`)
  const EL = sql(`select id from supplier_bills where reference = 'EL-2207'`)
  const SERENA = sql(`select id from leads where name = 'Serena Koh'`)
  const Q7 = sql(`select id from quotes where number = 'OM-10007'`)
  const HARPREET = sql(`select id from leads where name = 'Harpreet Kaur'`)
  const VIVIEN = sql(`select id from leads where name = 'Vivien Lee'`)
  const LOA = sql(`select id from contract_templates where title = 'Letter of Appointment' and deleted_at is null`)
  const CWL = sql(`select id from contract_templates where title = 'Completion & Warranty Letter' and deleted_at is null`)
  const AGREEMENT_TPL = sql(`select id from contract_templates where title = 'Interior Design Service Agreement' and deleted_at is null`)

  let SIGN_TOKEN = ''
  try {
    as('dane')
    const ctx = await desk(); await stubWa(ctx)
    const p = await page(ctx, 'desk')

    // ── C8 · a supplier bill waits for its OK ─────────────────────────────────────────────────────────────────────────────────────
    console.log('C8 · Approving supplier bills (row 361)')
    ok(!!EL && sql(`select approval_why || '|' || ifnull(approved_at, '-') || '|' || created_by from supplier_bills where id = '${EL}'`) === 'limit|-|priya', 'R128: EL-2207 on record — over the limit on no PO, recorded by Priya, waiting')
    ok(sql(`select count(*) from notifications where kind = 'bill_review' and href like '%${EL}%' and member_id in ('dane','huimin')`) === '2', 'R128: Dane and Hui Min each have its bell row')
    await go(p, '/company/finance/todo')
    const approveRow = p.getByTestId('todo-approve').getByRole('row').filter({ hasText: 'EL-2207' })
    ok(await approveRow.count() === 1, 'Dane’s To do › To approve lists Bright Spark Electrical’s bill EL-2207')
    ok(/Over S\$5,000\.00, on no PO/.test(await approveRow.innerText().catch(() => '')), 'what to know: over the limit, on no PO')
    ok(await p.getByTestId('todo-pay').getByRole('row').filter({ hasText: 'EL-2207' }).count() === 0, 'and never under To pay while it waits')
    await approveRow.scrollIntoViewIfNeeded(); await shot(p, 'c8-todo-approve-1440')
    as('priya')
    await go(p, '/company/finance/todo')
    const waitRow = p.getByTestId('todo-waiting').getByRole('row').filter({ hasText: 'EL-2207' })
    ok(await waitRow.count() === 1 && /An Owner or an Admin approves this bill before it is paid/.test(await waitRow.innerText().catch(() => '')), 'Priya (Accounting): Waiting for approval, the rule where the button would be')
    ok(await waitRow.getByRole('button', { name: /^(Approve|Pay)$/ }).count() === 0 && await p.getByTestId('todo-pay').getByRole('row').filter({ hasText: 'EL-2207' }).count() === 0, 'no Approve and no Pay for her')
    await go(p, `/company/finance/money-out?kind=bills&open=${EL}`)
    const panel = p.getByTestId('bill-panel')
    await panel.waitFor({ timeout: 8000 }).catch(() => {})
    ok(/Waiting for approval/i.test(await panel.innerText().catch(() => '')) && /An Owner or an Admin approves this bill before it is paid/.test(await panel.innerText().catch(() => '')), 'the bill’s panel: Waiting for approval, and why')
    ok(await panel.getByRole('button', { name: /^Pay/ }).count() === 0, 'its panel offers no Pay')
    await shot(p, 'c8-bill-panel-priya-1440')
    as('dane')
    /* a bill on no PO that waits counts once approved (as a PO or a claim that waits): Benjamin's profit is still the early estimate */
    await go(p, `/projects/${BEN_PID}/money`)
    const profitTile = async () => p.getByTestId('tile-profit').innerText().catch(() => '')
    ok(/Early estimate/i.test(await profitTile()) && /--/.test(await profitTile()), 'while it waits it is not a cost yet: Benjamin’s Profit is still “--”, Early estimate')
    await go(p, '/company/finance/todo')
    await p.getByTestId('todo-approve').getByRole('row').filter({ hasText: 'EL-2207' }).getByRole('button', { name: 'Approve' }).click(); await settle(p, 1500)
    ok(/Bright Spark Electrical’s bill EL-2207 approved — it can be paid/.test(await snackText(p)), 'Approve: “… approved — it can be paid”, with Undo')
    ok(sql(`select approved_by || '|' || (approved_at is not null) from supplier_bills where id = '${EL}'`) === 'dane|1', 'the OK is on the record as Dane’s')
    ok(sql(`select count(*) from lead_events where kind = 'project_bill_approved' and detail like '%${EL}%'`) === '1', 'its Activity line')
    ok(sql(`select count(*) from notifications where kind = 'bill_approved' and member_id = 'priya'`) === '1' && sql(`select count(*) from notifications where kind = 'bill_review' and href like '%${EL}%'`) === '0', 'Priya hears it; the approvers’ rows are answered')
    await snack(p).getByRole('button', { name: 'Undo' }).click(); await settle(p, 1500)
    ok(sql(`select ifnull(approved_at, '-') from supplier_bills where id = '${EL}'`) === '-' && sql(`select count(*) from lead_events where kind = 'project_bill_approved'`) === '0', 'Undo: it waits again, its line gone')
    ok(sql(`select count(*) from notifications where kind = 'bill_review' and href like '%${EL}%'`) === '2', 'and its approvers’ rows are back')
    await go(p, '/company/finance/todo')
    await p.getByTestId('todo-approve').getByRole('row').filter({ hasText: 'EL-2207' }).getByRole('button', { name: 'Approve' }).click(); await settle(p, 1500)
    await go(p, '/company/finance/todo')
    ok(await p.getByTestId('todo-pay').getByRole('row').filter({ hasText: 'EL-2207' }).count() === 1, 'approved, it is To pay’s')
    await go(p, `/projects/${BEN_PID}/money`)
    ok(!/Early estimate/i.test(await profitTile()), 'approved, it is a cost: Benjamin’s costs pass a tenth of the contract and Profit shows its figure')
    await go(p, `/projects/${BEN_PID}`)
    ok(/approved Bright Spark Electrical’s bill “EL-2207”/.test(await p.locator('body').innerText()) || sql(`select count(*) from lead_events where kind = 'project_bill_approved' and project_id = '${BEN_PID}'`) === '1', 'the project’s Activity carries the approval')
    /* Settings › Finance › Money out: the third rule and its tolerance */
    await go(p, '/settings?section=finance')
    const cost = p.locator('#cost-settings')
    await cost.scrollIntoViewIfNeeded().catch(() => {})
    ok(await cost.getByTestId('cost-bill-approval').count() === 1 && /Supplier bills over the limit or off their PO need approval/.test(await cost.innerText()), 'Settings › Finance: the bills rule on the approvals table')
    ok(await cost.locator('input[name="bill-tolerance"]').inputValue().catch(() => '') === '10', 'its tolerance beside the limit: 10%')
    await cost.screenshot({ path: path.join(dir, 'c8-settings-1440.png') }).catch(() => {})
    /* a Designer's bill over its PO says it will wait — and does */
    as('michelle')
    await go(p, `/projects/${RYAN_PID}/money`)
    const poRow = p.locator('[data-po]').filter({ hasText: 'PO-2026-003' }).first()
    let recorded = false
    if (await poRow.count()) {
      await poRow.getByRole('button', { name: 'Record a bill', exact: true }).click(); await settle(p, 600)
      await p.getByTestId('bill-by-hand').or(p.getByTestId('bill-dialog')).first().waitFor({ timeout: 8000 })
      if (await p.getByTestId('bill-by-hand').count()) { await p.getByTestId('bill-by-hand').click(); await p.getByTestId('bill-dialog').waitFor({ timeout: 8000 }) }
      await p.getByLabel('Their invoice number').fill('WC-2440')
      await p.getByLabel('Subtotal (S$)', { exact: true }).fill('15000')
      await p.getByLabel(/^Total \(S\$\)/).fill('15000')
      await settle(p, 300)
      const line = await p.getByTestId('bill-total-line').innerText().catch(() => '')
      ok(/it waits for an Owner’s or an Admin’s OK before it is paid: its bills come to S\$[\d,.]+ more than PO-2026-003/.test(line), 'the dialog says before it is recorded that it will wait — and why')
      await shot(p, 'c8-bill-dialog-differs-1440')
      await p.getByTestId('bill-save').click(); await settle(p, 1800)
      recorded = sql(`select approval_why from supplier_bills where reference = 'WC-2440'`) === 'differs'
      ok(recorded, 'recorded, it waits: more than its PO by over 10%')
      ok(/waits for an Owner’s or an Admin’s OK before it is paid/.test(await snackText(p)), 'its snackbar says so')
      ok(sql(`select count(*) from notifications where kind = 'bill_review' and title like '%WC-2440%' and member_id in ('dane','huimin')`) === '2', 'the approvers hear it')
    }
    if (!recorded) ok(false, 'a Designer records a bill over its PO (the Money tab’s PO row ⋮ › Record a bill)')
    as('dane')

    // ── C7 · the agreement starts the project, with its deposit ───────────────────────────────────────────────────────────────────────
    console.log('C7 · A letter of appointment with the deposit (row 358)')
    const KEVIN = sql(`select id from leads where name = 'Kevin Ng'`)
    /* a contract from the studio agreement on a lead, marked signed by hand from its editor — the house path every studio-marked signature takes */
    /* New Contract › From the studio agreement — the first-run empty state carries the same row as a button */
    const newAgreement = async (leadId) => {
      await go(p, `/leads/${leadId}/contracts`)
      const direct = p.getByRole('button', { name: 'From the studio agreement' })
      if (await direct.count()) await direct.first().click()
      else { await p.getByRole('button', { name: /^New Contract/ }).last().click(); await p.getByRole('menuitem', { name: 'From the studio agreement' }).click() }
    }
    const markSigned = async (leadId, o = {}) => {
      await newAgreement(leadId)
      await p.getByTestId('contract-editor').waitFor({ timeout: 15000 }); await settle(p, 1200)
      const id = p.url().split('/contracts/')[1].split(/[?/]/)[0]
      if (o.noQuote) { sql(`update contracts set from_quote_id = NULL where id = '${id}'`); await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1000) }
      if (o.beforeSign) await o.beforeSign(id)
      await p.getByTestId('contract-editor').getByRole('button', { name: /^(Draft|Sent to Client|Signed)$/ }).first().click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: /^Signed/ }).click(); await settle(p, 500)
      await p.getByRole('dialog', { name: 'Mark as signed' }).getByRole('button', { name: 'Mark as signed' }).click(); await settle(p, 2200)
      return id
    }
    await go(p, '/settings?section=projects')
    const start = p.getByTestId('project-start-setting')
    await start.scrollIntoViewIfNeeded()
    ok(await start.count() === 1 && /When a project starts/.test(await start.innerText()), 'Settings › Projects: When a project starts')
    ok(await start.getByRole('radio', { name: /^The quote is signed/ }).getAttribute('aria-checked') === 'true', 'today’s answer by default: The quote is signed')
    /* today's rule: a signature moves nothing — the bell offers Move to Won, as before */
    await markSigned(VIVIEN, { noQuote: true })
    ok(sql(`select stage from leads where id = '${VIVIEN}'`) === 'Quote Sent', 'today’s rule: Vivien Lee’s agreement signed, the lead stays in Quote Sent')
    ok(/The lead is still in Quote Sent — move it to Won/.test(sql(`select group_concat(body, ' || ') from notifications where kind = 'quote_signed' and lead_id = '${VIVIEN}'`)), 'and the bell offers Move to Won, as before')
    await go(p, '/company/templates/contracts')
    ok(await p.locator('[data-testid="library-card"], [data-testid="library-row"]').filter({ hasText: 'Letter of Appointment' }).count() >= 1, 'R127: the library holds the Letter of Appointment')
    /* the agreement is signed: switch, with Undo */
    await go(p, '/settings?section=projects')
    await p.getByTestId('project-start').getByRole('radio', { name: /^The agreement is signed/ }).click(); await settle(p, 1200)
    ok(/A project now starts when the client signs the agreement/.test(await snackText(p)), 'switched, with its sentence and Undo')
    ok(JSON.parse(sql(`select value from settings where key = 'project_start'`) || '{}').startsWhen === 'agreement', 'kept: the agreement is signed')
    ok(/the lead moves to Won by itself/.test(await p.getByTestId('project-start').getByRole('radio', { name: /^The agreement is signed/ }).innerText()), 'what each answer does, said on its card')
    await p.getByTestId('project-start-setting').screenshot({ path: path.join(dir, 'c7-settings-1440.png') })
    /* the Letter of Appointment for Serena, from the gallery */
    await go(p, '/company/templates/contracts')
    const card = p.locator('[data-testid="library-card"], [data-testid="library-row"]').filter({ hasText: 'Letter of Appointment' }).first()
    await card.hover(); await card.getByRole('button', { name: /More/ }).first().click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /New contract/ }).first().click(); await settle(p, 400)
    const ask = p.getByRole('dialog', { name: 'Which lead is this contract for?' })
    await ask.getByRole('combobox').click(); await p.getByRole('option', { name: 'Serena Koh' }).click(); await settle(p, 200)
    await p.getByTestId('pick-lead-confirm').click()
    await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); await settle(p, 1500)
    const C = p.url().split('/contracts/')[1].split(/[?/]/)[0]
    ok(sql(`select from_quote_id || '|' || template_id from contracts where id = '${C}'`) === `${Q7}|${LOA}`, 'the letter names OM-10007 (the quote Serena has) and comes from the template')
    await go(p, `/contracts/${C}/preview`)
    ok(/a deposit of S\$8,870\.48 secures your project/.test(await p.locator('body').innerText()), 'its Deposit field prints the quote’s first payment: S$8,870.48')
    await go(p, `/contracts/${C}`)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 800)
    const sd = p.getByRole('dialog', { name: 'Send for digital signature' })
    const dep = sd.getByTestId('send-deposit')
    ok(await dep.count() === 1 && /Once Serena signs, the page asks for S\$8,870\.48 — Deposit of OM-10007 — by PayNow to Demo Studio Pte Ltd\./.test(await dep.innerText()), 'Send: “Ask for the deposit”, said whole — the amount, the stage, the quote, the payee')
    await dep.getByRole('checkbox').click({ force: true }); await settle(p, 1200)
    ok(sql(`select ask_deposit from contracts where id = '${C}'`) === '1', 'saved as it is ticked')
    await shot(p, 'c7-send-deposit-1440')
    await sd.getByRole('button', { name: 'Send via WhatsApp' }).click(); await settle(p, 2200)
    ok(sql(`select status from contracts where id = '${C}'`) === 'Sent to Client', 'the letter goes out')
    /* the client signs it */
    const client = await desk(); const sp = await page(client, 'client')
    const token = sql(`select sign_token from contracts where id = '${C}'`)
    SIGN_TOKEN = token
    await go(sp, `/sign/${token}`)
    ok(/Once you sign, you’ll pay the S\$8,870\.48 deposit by PayNow\./.test(await sp.getByTestId('deposit-ahead').innerText().catch(() => '')), 'the signing page says the deposit comes next, before the signature')
    await sp.getByTestId('paper-end').scrollIntoViewIfNeeded(); await settle(sp, 600)
    if (await sp.getByTestId('gate-accept').count()) await tick(sp)
    await settle(sp, 300); await caseTrust(sp)
    await sp.getByRole('button', { name: 'Send code' }).first().click(); await settle(sp, 600)
    await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click(); await settle(sp, 400)
    await sp.getByLabel('Your full name').fill('Serena Koh')
    await sp.getByRole('button', { name: 'Sign agreement' }).click()
    await sp.getByRole('heading', { name: 'Signed' }).waitFor({ timeout: 15000 }); await settle(sp, 2500)
    const pay = sp.getByTestId('deposit-pay')
    ok(await pay.count() === 1 && /Pay the deposit/.test(await pay.innerText()) && /Deposit of quotation OM-10007: S\$8,870\.48/.test(await pay.innerText()), 'signed: the page ends on “Pay the deposit” — the stage, the quote, the amount')
    const payload = await pay.locator('[data-testid="paynow-qr"]').getAttribute('data-payload').catch(() => '')
    ok(/8870\.48/.test(payload || '') && /201234567M/.test(payload || ''), 'the PayNow QR carries the deposit, to the entity’s PayNow ID')
    ok(/OM-10007 deposit/.test(payload || ''), 'with the reference the studio matches it by')
    await pay.scrollIntoViewIfNeeded(); await shot(sp, 'c7-signed-deposit-1440')
    /* through the Won step: the lead is Won, the project made, its deposit invoice drafted */
    ok(sql(`select stage from leads where id = '${SERENA}'`) === 'Won', 'the signature moved Serena Koh to Won')
    const log = sql(`select from_stage || '|' || ifnull(moved_by, '-') || '|' || json_extract(payload, '$.agreementSigned.by') || '|' || json_extract(payload, '$.wonQuote') from stage_logs where lead_id = '${SERENA}' and to_stage = 'Won'`)
    ok(/^Quote Sent\|-\|Serena Koh\|/.test(log), 'its stage log: from Quote Sent, no member pressed it, the signature named — the Won step filled from the agreement')
    const proj = sql(`select id || '|' || number || '|' || ifnull(quote_id, '-') || '|' || ifnull(created_by, '-') from projects where lead_id = '${SERENA}'`)
    ok(proj.split('|')[2] === Q7 && proj.split('|')[3] === 'dane', 'Won made the project on the signed quote, made by the agreement’s sender')
    const PID = proj.split('|')[0]
    ok(sql(`select count(*) from project_invoices where project_id = '${PID}' and status = 'draft' and stage_name = 'Deposit'`) === '1', 'its deposit invoice is drafted')
    ok(sql(`select status from quotes where id = '${Q7}'`) === 'Signed', 'OM-10007 is signed through the letter')
    ok(/is Won — project P-\d{4}-\d{3} is made, its deposit invoice drafted/.test(sql(`select group_concat(body, ' || ') from notifications where kind = 'quote_signed' and lead_id = '${SERENA}'`)), 'the bell: the lead is Won, the project made, its deposit invoice drafted')
    await go(p, `/projects/${PID}/activity`)
    ok(/moved from Quote Sent to Won when Serena Koh signed “Letter of Appointment”/.test(await p.locator('body').innerText()), 'Activity names the signature that moved it')
    await sp.reload({ waitUntil: 'networkidle' }); await settle(sp, 900)
    ok(await sp.getByTestId('deposit-pay').count() === 1, 'a later visit still ends on the deposit while it isn’t paid')
    await client.close()
    /* a studio-marked signature starts it too — Harpreet's agreement on OM-10006, marked signed in its editor */
    await markSigned(HARPREET, { beforeSign: async () => { sql(`update quotes set status = 'Sent to Client' where number = 'OM-10006'`) } })
    ok(sql(`select stage from leads where id = '${HARPREET}'`) === 'Won' && sql(`select count(*) from projects where lead_id = '${HARPREET}'`) === '1', 'a studio-marked signature moves Harpreet Kaur to Won too, and makes her project')
    ok(/marked Signed — Harpreet Kaur is Won — project P-\d{4}-\d{3} is made/.test(await snackText(p)) && await snack(p).getByRole('button', { name: 'Open project' }).count() === 1, 'the editor says so, with Open project')
    /* an agreement the Won step can't take stays, and the bell says why — Kevin Ng is in Met (Linear: Quote Sent first) */
    await markSigned(KEVIN, { noQuote: true })
    ok(sql(`select stage from leads where id = '${KEVIN}'`) === 'Met', 'Kevin Ng stays in Met — the stage movement rule holds')
    ok(/Couldn’t move it to Won by itself — complete Quote Sent first/.test(sql(`select group_concat(body, ' || ') from notifications where kind = 'quote_signed' and lead_id = '${KEVIN}'`)), 'the bell says why, in the rule’s own words')
    /* no quote named: the deposit says why it can't be asked for, in the row */
    await newAgreement(VIVIEN)
    await p.getByTestId('contract-editor').waitFor({ timeout: 15000 }); await settle(p, 1200)
    const CV = p.url().split('/contracts/')[1].split(/[?/]/)[0]
    sql(`update contracts set from_quote_id = NULL where id = '${CV}'`)
    await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1200)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 800)
    ok(/Name the quote it signs first — the deposit is its first payment/.test(await p.getByTestId('send-deposit').innerText().catch(() => '')), 'with no quote named, the deposit says why it can’t be asked for — in the row')
    await p.keyboard.press('Escape'); await settle(p, 300)
    /* back to today's rule */
    await go(p, '/settings?section=projects')
    await p.getByTestId('project-start').getByRole('radio', { name: /^The quote is signed/ }).click(); await settle(p, 1200)
    ok(JSON.parse(sql(`select value from settings where key = 'project_start'`) || '{}').startsWhen === 'quote', 'back to The quote is signed')

    // ── C9 · the completion letter at handover ────────────────────────────────────────────────────────────────────────────────────
    console.log('C9 · A completion & warranty letter at handover (row 359)')
    await go(p, '/company/templates/contracts')
    const cwl = p.locator('[data-testid="library-card"], [data-testid="library-row"]').filter({ hasText: 'Completion & Warranty Letter' }).first()
    ok(await cwl.count() === 1 && /At handover/i.test(await cwl.innerText()), 'R129: the Completion & Warranty Letter, chipped “At handover”')
    const loaCard = p.locator('[data-testid="library-card"], [data-testid="library-row"]').filter({ hasText: 'Letter of Appointment' }).first()
    await loaCard.hover(); await loaCard.getByRole('button', { name: /More/ }).first().click(); await settle(p, 300)
    ok(await p.getByRole('menuitem', { name: 'Use at handover' }).count() === 1, 'another template’s ⋮ offers Use at handover')
    await p.getByRole('menuitem', { name: 'Use at handover' }).click(); await settle(p, 1200)
    ok(sql(`select group_concat(title) from contract_templates where use_at_handover = 1`) === 'Letter of Appointment', 'one at a time: the pick moves')
    sql(`update contract_templates set use_at_handover = (id = '${CWL}')`)
    /* the Hand over sheet on Ryan's project: to read and keep */
    await go(p, `/projects/${RYAN_PID}`)
    await p.locator('[data-testid="project-stage"] button').click(); await settle(p, 350)
    await p.getByRole('menuitem', { name: /^Completed/ }).click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 10000 })
    const letter = p.getByTestId('handover-letter')
    ok(await letter.count() === 1 && /Send Ryan the completion letter/.test(await letter.innerText()) && /“Completion & Warranty Letter”, filled from the project: completed today, with its defects period/.test(await letter.innerText()), 'the Hand over sheet offers the completion letter, filled from the project')
    ok(await letter.locator('input[name="defects-months"]').inputValue() === '12', 'its defects period starts at 12 months')
    await letter.getByTestId('handover-letter-how').getByRole('radio', { name: /reads and keeps it$/ }).click(); await settle(p, 200)
    await letter.locator('input[name="defects-months"]').fill('18')
    await letter.scrollIntoViewIfNeeded(); await settle(p, 300); await shot(p, 'c9-handover-sheet-1440')
    await p.getByTestId('handover-primary').click(); await settle(p, 500)
    if (await p.locator('input[name="handover-reason"]').count()) { await p.locator('input[name="handover-reason"]').fill('Probe: handed over with fixes booked as defects.'); await p.getByTestId('handover-primary').click() }
    await settle(p, 2500)
    ok(sql(`select stage from projects where id = '${RYAN_PID}'`) === 'completed', 'completed')
    const L = sql(`select id || '|' || to_read || '|' || defects_months || '|' || status || '|' || ifnull(from_quote_id, '-') || '|' || (sign_expires_at is null) || '|' || sign_token from contracts where lead_id = '${RYAN_LEAD}' and purpose = 'handover' and deleted_at is null`).split('|')
    ok(L[1] === '1' && L[2] === '18' && L[3] === 'Sent to Client' && L[4] === '-' && L[5] === '1', 'the letter went to read and keep — 18 months, sent, naming no quote, its link never runs out')
    ok(/is completed — “Completion & Warranty Letter” went to the client to read and keep/.test(await snackText(p)), 'one sentence says the project is completed and the letter went, with Undo')
    const LID = L[0], LTOKEN = L[6]
    /* the client's link: the letter, nothing to sign */
    const c2 = await desk(); const lp = await page(c2, 'letter')
    await go(lp, `/sign/${LTOKEN}`)
    ok(/nothing to sign/.test(await lp.getByTestId('letter-to-read').innerText().catch(() => '')) && await lp.getByRole('button', { name: 'Send code' }).count() === 0, 'the letter’s link: “Your letter” — nothing to sign, no code')
    const body = await lp.locator('body').innerText()
    const done = sql(`select contract_date from contracts where id = '${LID}'`)
    const long = (s) => new Date(Number(s) * 1000).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })
    const end = new Date(Number(done) * 1000); end.setMonth(end.getMonth() + 18)
    ok(body.includes(`handed over to you on ${long(done)}`) && /within 18 months of completion/.test(body) && body.includes(end.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })), 'filled from the project: the completion day, 18 months and the day they end')
    await shot(lp, 'c9-letter-to-read-1440')
    await c2.close()
    ok(sql(`select count(*) from contracts where id = '${LID}' and status = 'Sent to Client'`) === '1' && sql(`select count(*) from lead_tasks where contract_id = '${LID}'`) === '0', 'no follow-up task chases a letter to read')
    /* the studio's side of a letter to read: its banner, the lead's Contracts (no reminder, no awaiting count) */
    const ep = await page(ctx, 'letter-editor')   /* its own tab — the completion's snackbar (and its Undo) stays on the project's */
    await go(ep, `/contracts/${LID}`)
    const banner = await ep.getByTestId('contract-banner').innerText().catch(() => '')
    ok(/Sent to Ryan D’Souza to read and keep/.test(banner) && /nothing for them to sign/.test(banner), 'its editor’s banner: sent to read and keep — nothing for them to sign')
    await ep.close()
    /* Undo takes it back */
    await snack(p).getByRole('button', { name: 'Undo' }).click(); await settle(p, 2000)
    ok(sql(`select stage from projects where id = '${RYAN_PID}'`) === 'in_progress' && sql(`select deleted_at is not null from contracts where id = '${LID}'`) === '1', 'Undo: in progress again, the letter in Deleted Contracts')
    ok(/Deleted Contracts and its link no longer opens/.test(await snackText(p)), 'and the sentence says so')
    const c3 = await desk(); const gp = await page(c3, 'gone')
    await go(gp, `/sign/${LTOKEN}`)
    ok(await gp.getByTestId('letter-to-read').count() === 0, 'its old link no longer opens')
    await c3.close()
    /* to sign: the house signing link, with its window */
    await go(p, `/projects/${RYAN_PID}`)
    await p.locator('[data-testid="project-stage"] button').click(); await settle(p, 350)
    await p.getByRole('menuitem', { name: /^Completed/ }).click()
    await p.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 10000 })
    ok(await p.getByTestId('handover-letter-how').getByRole('radio', { name: /signs it$/ }).getAttribute('aria-checked') === 'true', 'with a Client signature in the template, it goes to be signed by default')
    await p.getByTestId('handover-primary').click(); await settle(p, 500)
    if (await p.locator('input[name="handover-reason"]').count()) { await p.locator('input[name="handover-reason"]').fill('Probe: handed over with fixes booked as defects.'); await p.getByTestId('handover-primary').click() }
    await settle(p, 2500)
    const S = sql(`select to_read || '|' || (sign_expires_at is not null) || '|' || status from contracts where lead_id = '${RYAN_LEAD}' and purpose = 'handover' and deleted_at is null`)
    ok(S === '0|1|Sent to Client', 'to sign: sent with its signing window')
    ok(waSeen.some((u) => /completion & warranty letter/i.test(u) && /sign at the bottom/.test(u)), 'WhatsApp opens with the letter’s link to sign')

    // ── 390 touch · 320 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phones')
    const ph = await phoneCtx(); await stubWa(ph)
    const m = await page(ph, 'phone')
    await go(m, '/settings?section=projects')
    await m.getByTestId('project-start-setting').scrollIntoViewIfNeeded()
    ok(await sideways(m) <= 0, '390: Settings › Projects, no sideways scroll')
    await shot(m, 'c7-settings-390')
    await go(m, '/company/finance/todo')
    ok(await sideways(m) <= 0, '390: Finance › To do, no sideways scroll')
    await shot(m, 'c8-todo-390')
    /* the signed letter of appointment, its deposit on a phone */
    await go(m, `/sign/${SIGN_TOKEN}`)
    /* (contracts on the move, a deliberate change of this rule) on a phone the signed page lands on the Signed card, where the deposit is a row —
       "Pay the deposit" — that opens the pay box as a sheet; the desk still ends on it inline */
    const depRow = m.getByTestId('deposit-row')
    await depRow.scrollIntoViewIfNeeded().catch(() => {})
    ok(await depRow.count() === 1 && /Pay the deposit/.test(await depRow.innerText()) && await sideways(m) <= 0, '390: the Signed card carries "Pay the deposit", no sideways scroll')
    await depRow.tap(); await settle(m, 900)
    ok(await m.getByTestId('deposit-pay').count() === 1 && await m.getByRole('dialog', { name: 'Pay the deposit' }).isVisible(), '390: the row opens the pay box as a sheet')
    await shot(m, 'c7-signed-deposit-390')
    await m.keyboard.press('Escape'); await settle(m, 400)
    /* the Hand over sheet as a phone's sheet: the letter's tick, its period and who signs, in one column */
    as('dane')
    await go(m, `/projects/${BEN_PID}`)
    await m.locator('[data-testid="project-stage"] button').first().click().catch(() => {}); await settle(m, 400)
    const toDone = m.getByRole('menuitem', { name: /^Completed/ })
    if (await toDone.count()) {
      await toDone.first().click()
      await m.locator('[data-testid="handover-checklist"]').waitFor({ timeout: 10000 }).catch(() => {})
      const lt = m.getByTestId('handover-letter')
      await lt.scrollIntoViewIfNeeded().catch(() => {}); await settle(m, 400)
      ok(await lt.count() === 1 && await sideways(m) <= 0, '390: the Hand over sheet carries the letter, no sideways scroll')
      await shot(m, 'c9-handover-sheet-390')
    } else ok(false, '390: the project’s Stage menu offers Completed')
    const ph320 = await phoneCtx(320, 640); const m3 = await page(ph320, 'phone320')
    await go(m3, '/settings?section=projects'); ok(await sideways(m3) <= 0, '320: Settings › Projects, no sideways scroll')
    await ph320.close(); await ph.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    restore(saved)
    sql(`update members set is_you = (id = '${you0}')`)
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    ok(stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'put back: every lead’s stage and the stage logs as found')
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
