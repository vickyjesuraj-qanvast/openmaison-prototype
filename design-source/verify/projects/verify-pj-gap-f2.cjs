// Gaps build F2 — money out: the books (the owner's "build everything", 2026-10-07 — M-08; calls F2-Q1…Q16 in projects-gaps-build/f2-read.md).
// Each item asserted as the rule it builds, never another round's count:
//  Finance lands on the Overview for an Owner (Purchase orders for a Designer) · Overview's money to verify and stuck (one-home N-01: its working
//  capital and insights went to Reports) · the old Pipeline address opens Reports › Finance › Profitability (one-home N-01) · the Money tab's
//  profit half (Owners and Admins only — Q-20) and what the numbers say · a credit note
//  issued from an invoice's ⋮ (GST at the invoice's rate, numbered, Undo), voided with a reason · the paper, its Files entry, the client's portal
//  line and page · Commissions: an ask approved at another rate, a payment and its Undo, a member's own view and their ask · Settings › Finance's
//  two cards · Reports with the house Export, the client statement · Xero connected (on Company › Integrations — one-home N-09), synced in
//  Accounting, disconnected on Integrations · the listing's Margin column (off at
//  first), the Overview's Profit row · Activity, the bell, the search · phone 390 (no sideways scroll, the issue dialog as a sheet).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3127 NODE_PATH=<repo>/node_modules node verify-pj-gap-f2.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-f2')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3127'
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const INV = (n) => sql(`select id from project_invoices where number='${n}'`)
const CN = (n) => sql(`select id from credit_notes where number='${n}'`)
const PHONE = { ben: '97731968' }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), shalini = P('P-2025-001'), aisha = P('P-2026-003')
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
  const text = async (l) => ((await l.count()) ? await l.first().innerText() : '')
  /* (simplify S-07 · S-08 · Q-05) Needs you shows three rows; the Credit notes list is the admin's view of Billing (its chips); every invoice opens
     its panel, its payments and credit notes in it */
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  const billingView = async (p, name) => { await p.locator('[data-testid="money-billing-view"]').getByRole('radio', { name }).click(); await settle(p, 500) }
  const startAt = Math.floor(Date.now() / 1000) - 5
  const before = { cn: sql('select count(*) from credit_notes'), payouts: sql('select count(*) from commission_payouts'), asks: sql('select count(*) from commission_requests'), rules: sql('select count(*) from commission_rules'),
    files: sql('select count(*) from lead_files'), events: sql('select count(*) from lead_events'), bell: sql("select count(*) from notifications where kind not like 'credit%'")   /* (parity map, a deliberate change of this rule) the server's own monthly credits rows (a demo month rolling on the real clock) are not the probe's */ }
  const michelleAsk = sql(`select id from commission_requests where member_id='michelle' and status='open'`)

  try {
    as('dane')
    const S = await desk()
    const s = await page(S, 'studio')

    // ── 1 · Finance lands on To do for an Owner ───────────────────────────────────────────────────────────────────────────────────────────
    /* (simplify S-10, a deliberate change of this rule) the Overview became To do — To approve · To pay · To collect · Stuck, each action on its row */
    console.log('1 · Finance › To do (Owner)')
    await go(s, '/company/finance')
    ok(/\/company\/finance\/todo$/.test(s.url()), 'Company › Finance lands on To do for an Owner')
    /* (one-home N-01, a deliberate change of this rule) Finance is the work only: the Overview keeps Money to verify and Stuck — its working capital
       and "what the numbers say" are Company › Reports' (Owed to you · You owe · Cash flow · Profitability) and each project's Money tab's */
    ok((await s.getByTestId('books-working-capital').count()) === 0 && (await s.getByTestId('books-insights').count()) === 0, 'the Overview has no working capital and no “what the numbers say” (Reports keep those figures)')
    /* (simplify S-10 · Q-07, a deliberate change of this rule) money to verify and stuck are To do's groups: the payment to confirm is To collect's
       (owned by the project's Money), the PO and the ask To approve's, the overdue bill To pay's */
    ok(/INV-2026-002 · Ryan says they paid/.test(await text(s.getByTestId('todo-collect'))) && /PO-2026-008/.test(await text(s.getByTestId('todo-approve'))), 'To collect: a client payment to confirm · To approve: a PO waiting for approval')
    ok(/Michelle asks for 5% of what the client pays/.test(await text(s.getByTestId('todo-approve'))) && /AF-7781/.test(await text(s.getByTestId('todo-pay'))), 'To approve: the open commission ask · To pay: the overdue bill')
    ok(/Leaves [\d.]+% against the quote|over what the client pays/.test(await text(s.getByTestId('todo-approve'))), 'the approver reads what the PO leaves against the quote (F1 P5)')
    await shot(s, 'f2-01-overview')

    // ── 2 · Pipeline → Reports › Finance › Profitability (one-home N-01, a deliberate change of this rule) ─────────────────────────────────
    console.log('2 · The Pipeline’s old address')
    ok(!/Pipeline/.test(await text(s.locator('[aria-label="Finance sections"]'))), 'Finance has no Pipeline tab')
    for (const from of ['/company/finance/pipeline', '/finance/pipeline']) {
      const r = await s.request.get(BASE + from, { maxRedirects: 0 })
      ok([307, 308].includes(r.status()) && /\/company\/(finance\/pipeline|reports\/finance\?report=profitability)$/.test(r.headers()['location'] ?? ''), `${from} redirects (${r.status()} → ${r.headers()['location'] ?? ''})`)
    }
    await go(s, '/company/finance/pipeline')
    ok(/\/company\/reports\/finance\?report=profitability$/.test(s.url()) && /Profitability/.test(await text(s.getByTestId('report-head'))), 'it lands on Company › Reports › Finance › Profitability')
    const pipe = await text(s.getByTestId('report-table-projects'))
    ok(/P-2026-001/.test(pipe) && /Healthy|Tight|At risk|Early estimate/.test(pipe), 'every project with a contract, with its margin in words — the old Pipeline’s figures')
    await shot(s, 'f2-02-profitability', false)

    // ── 3 · The Money tab's profit half and the credit notes (Owner) ─────────────────────────────────────────────────────────────────────
    console.log('3 · Money tab — profit and credit notes')
    await go(s, `/projects/${ben}/money`)
    /* (simplify S-09 · Q-08, a deliberate change of this rule) the figure waits too: "--" with Early estimate until costs pass a tenth of the
       contract; the Margin tile folded into it; What the numbers say left the tab (its overdue fact is the Needs you row) */
    ok(/Profit/i.test(await text(s.getByTestId('tile-profit'))) && /Early estimate/i.test(await text(s.getByTestId('tile-profit')))   /* the chip is set in capitals */ && /--/.test(await text(s.getByTestId('tile-profit'))), 'Profit tile: "--" with Early estimate (costs under a tenth of the contract)')
    await allNeeds(s)
    ok((await s.getByTestId('profit-insights').count()) === 0 && /INV-2026-006 · Mid-Project/.test(await text(s.getByTestId('invoice-overdue'))), 'no What the numbers say on the tab — the overdue invoice is its Needs you row')
    ok(/S\$1,090\.00 credited/.test(await text(s.locator(`[data-testid="money-stages"] [data-invoice="${INV('INV-2026-004')}"]`).last())), 'the invoice row says what is credited')
    ok(/S\$1,090\.00 to refund/.test(await text(s.getByTestId('money-to-refund'))) && (await s.getByTestId('money-record-refund').count()) === 1, 'paid in full before the credit: the to-refund row — with its button now')
    await billingView(s, 'Credit notes')
    ok(/CN-2026-002/.test(await text(s.getByTestId('money-credits'))) && /S\$90\.00/.test(await text(s.getByTestId('money-credits'))), 'the Credit notes view: CN-2026-002 with its GST at the invoice’s rate')
    await billingView(s, 'All')
    await s.getByTestId('tile-profit').scrollIntoViewIfNeeded(); await settle(s, 300)
    await shot(s, 'f2-03-ben-money')

    // ── 4 · Issue a credit note from an invoice's ⋮ (Ryan's INV-2026-002), Undo; issue again and void it ─────────────────────────────────
    console.log('4 · Issue, undo, void a credit note')
    await go(s, `/projects/${ryan}/money`)
    const inv2 = INV('INV-2026-002')
    const issue = async (amount, reason) => {
      const row = s.locator(`[data-testid="money-stages"] [data-invoice="${inv2}"]`).first()   // (simplify S-07) the invoice is its stage's Billing row
      await row.scrollIntoViewIfNeeded(); await row.getByRole('button', { name: /More actions/ }).click(); await settle(s, 400)
      await menuItem(s, /^Issue a credit note/).click(); await settle(s, 600)
      const d = dialog(s)
      await d.getByLabel(/^Amount to credit/).fill(amount); await settle(s, 200)
      await d.getByTestId('credit-reasons').getByText(reason, { exact: true }).click(); await settle(s, 200)
      await d.getByTestId('credit-issue-save').click(); await settle(s, 1600)
    }
    await issue('100', 'Overcharged')
    ok(/CN-2026-003 issued/.test(await text(snack(s))), 'issued at once, numbered CN-2026-003 (the next of the studio’s numbering)')
    ok(sql(`select gst_minor from credit_notes where number='CN-2026-003'`) === String(Math.round(10000 * 192964 / 2337004)), 'its GST split out at the invoice’s own rate')
    ok(sql(`select count(*) from lead_files f join credit_notes c on c.file_id=f.id where c.number='CN-2026-003'`) === '1', 'filed in Files › Payments')
    ok(sql(`select count(*) from lead_events where kind='project_credit_issued' and json_extract(detail,'$.number')='CN-2026-003'`) === '1', 'an Activity line')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select count(*) from credit_notes where number='CN-2026-003'`) === '0' && sql(`select count(*) from lead_events where kind='project_credit_issued' and json_extract(detail,'$.number')='CN-2026-003'`) === '0', 'Undo takes the note, its file and its line back')
    await go(s, `/projects/${ryan}/money`)
    await issue('2000', 'Goodwill')
    const cn3 = CN('CN-2026-003')
    ok(!!cn3, 'issued again')
    await billingView(s, 'Credit notes')
    await s.locator(`[data-credit="${cn3}"]`).first().scrollIntoViewIfNeeded()
    await s.locator(`[data-credit="${cn3}"]`).first().getByRole('button', { name: /More for CN-2026-003/ }).click(); await settle(s, 400)
    await menuItem(s, /^Void the credit note/).click(); await settle(s, 600)
    await dialog(s).locator('textarea, input[type="text"]').first().fill('Issued on the wrong invoice'); await dialog(s).getByRole('button', { name: /^Void$/ }).click(); await settle(s, 1500)
    ok(sql(`select status || '|' || void_reason from credit_notes where id='${cn3}'`) === 'void|Issued on the wrong invoice', 'voided with its reason — it stays on the record')
    ok(/Void/.test(await text(s.locator(`[data-credit="${cn3}"]`))), 'the row reads Void')
    await shot(s, 'f2-04-ryan-credit-void')

    // ── 5 · The paper, its Files entry, the client's portal ──────────────────────────────────────────────────────────────────────────────
    console.log('5 · The paper, Files, the portal')
    const cn1 = CN('CN-2026-001'), cn2 = CN('CN-2026-002')
    await go(s, `/projects/${shalini}/credit-notes/${cn1}`)
    const paper = await text(s.getByTestId('credit-note-paper'))
    ok(/Credit note/.test(paper) && /CN-2026-001/.test(paper) && /INV-2026-007/.test(paper) && /S\$45\.00/.test(paper), 'the paper: number, invoice, GST at its rate')
    ok(/Refunded/.test(paper) && /by PayNow/.test(paper), 'the refund recorded on it (PayNow keeps its capitals)')
    await shot(s, 'f2-05-paper', false)
    const cn2File = sql(`select file_id from credit_notes where id='${cn2}'`)
    await go(s, `/projects/${ben}/files/${cn2File}`)
    ok(/\/credit-notes\//.test(s.url()), 'its entry in Files › Payments opens the paper')
    const C = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const c = await page(C, 'client')
    await go(c, '/my/demo-studio/login')
    await c.locator('input[type="tel"]').fill(PHONE.ben)
    await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
    await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
    await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1400)
    await go(c, '/my/demo-studio/money')
    ok(/Credit note CN-2026-002/.test(await text(c.locator('[data-testid="portal-credit-line"], [data-testid="portal-credit-link"]'))) || /CN-2026-002/.test(await c.locator('body').innerText()), 'the client sees the credit note under its invoice')
    await c.locator('[data-testid="portal-credit-link"]').first().click(); await settle(c, 1600)
    ok(/CN-2026-002/.test(await text(c.getByTestId('credit-note-paper'))), 'and opens its paper on the portal')
    ok(await overflow(c) <= 1, 'the portal paper: no sideways scroll at 390')
    await shot(c, 'f2-06-portal-credit-390', false)
    await C.close()

    // ── 6 · Commissions (Owner): approve an ask at another rate; pay, Undo ────────────────────────────────────────────────────────────────
    console.log('6 · Commissions — Owner')
    await go(s, '/company/finance/commissions')
    ok(/Michelle/.test(await text(s.getByTestId('commission-asks'))) && /5% of what the client pays/.test(await text(s.getByTestId('commission-asks'))), 'the open ask, with its rate and reason')
    ok(/Germaine/.test(await text(s.getByTestId('commission-lines'))) && /Their rate on this project/.test(await text(s.getByTestId('commission-lines'))), 'Germaine’s approved rate on Benjamin Han applies to her there')
    ok(/70%/.test(await text(s.getByTestId('commission-lines'))), 'the project’s own shares (70 / 30)')
    await s.locator(`[data-ask="${michelleAsk}"]`).getByTestId('commission-approve').click(); await settle(s, 600)
    await dialog(s).getByLabel(/^Rate \(%\)/).fill('4.5'); await dialog(s).getByTestId('commission-rule-save').click(); await settle(s, 1600)
    ok(sql(`select status from commission_requests where id='${michelleAsk}'`) === 'approved' && sql(`select rate_bp from commission_rules where request_id='${michelleAsk}' and ended_at is null`) === '450', 'approved at 4.5% — a rule for her on that project from today')
    ok(sql(`select count(*) from notifications where kind='commission_answered' and member_id='michelle' and created_at >= ${startAt}`) === '1', 'Michelle hears the answer on her bell')
    await go(s, '/company/finance/commissions')
    /* (simplify S-12, a deliberate change of this rule) one table grouped by member — Michelle's row (Pay Michelle S$x), then her projects */
    ok(await s.locator('[data-testid="commission-member"][data-member="michelle"]').count() === 1 && /Pay Michelle/.test(await text(s.locator('[data-member="michelle"]'))), 'Commission: one table grouped by member, with Pay Michelle')
    ok(/All time/.test(await text(s.getByTestId('tile-commission-earned'))), 'the tiles say their period (S-13)')
    const line = s.locator(`[data-line="${P('P-2026-001')}:michelle"]`).first()
    await line.getByTestId('commission-pay').click(); await settle(s, 600)
    const owedNow = await dialog(s).getByLabel(/^Amount paid/).inputValue()
    ok(Number(owedNow.replace(/,/g, '')) > 0, `Pay opens with what is owed (${owedNow})`)
    await dialog(s).getByTestId('commission-pay-save').click(); await settle(s, 1600)
    ok(sql(`select count(*) from commission_payouts where created_at >= ${startAt}`) === '1' && sql(`select count(*) from lead_events where kind='project_commission_paid' and at >= ${startAt}`) === '1', 'the payment recorded with its Activity line')
    ok(sql(`select count(*) from notifications where kind='commission_paid' and member_id='michelle' and created_at >= ${startAt}`) === '1', 'Michelle is told')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select count(*) from commission_payouts where created_at >= ${startAt}`) === '0', 'Undo takes the payment back')
    await shot(s, 'f2-07-commissions')

    // ── 7 · Settings › Finance, Reports and the Export, Xero ─────────────────────────────────────────────────────────────────────────────
    console.log('7 · Settings, Reports, Accounting')
    await go(s, '/settings?section=finance')
    ok(/3% of what the client pays/.test(await text(s.getByTestId('commission-studio-rule'))), 'Settings › Finance › Commission: the studio’s rule')
    // (one-home N-12) Credit notes' numbering had moved to Settings › Projects, beside Invoices — (simplify S-15, a deliberate change of this
    // rule) every money rule's one home is Settings › Finance: Credit notes under Money in, their numbers on Document numbers
    ok((await s.getByTestId('credit-settings').count()) === 1, 'Settings › Finance holds Credit notes, under Money in')
    ok(/CN-2026-004/.test(await text(s.getByTestId('cn-number-example'))), 'Settings › Finance › Document numbers: the next credit note follows the highest given (CN-2026-003 was void, still given)')
    await go(s, '/settings?section=projects')
    ok((await s.getByTestId('credit-settings').count()) === 0, 'Settings › Projects no longer holds Credit notes')
    await go(s, '/company/reports/finance?report=ar')
    ok(/Owed to you/.test(await text(s.getByTestId('report-head'))) && (await s.getByTestId('report-table-buckets').count()) === 1, 'Owed to you: the aging buckets')
    await s.getByTestId('report-export').click(); await settle(s, 600)
    const dl = s.waitForEvent('download', { timeout: 8000 }).catch(() => null)
    await dialog(s).getByRole('button', { name: /^Export$/ }).click()
    const file = await dl; await settle(s, 800)
    ok(!!file && /owed-to-you\.csv$/.test(file.suggestedFilename()), 'the house Export downloads the report')
    await go(s, `/company/reports/finance?report=statement&project=${ben}`)
    ok(/CN-2026-002/.test(await s.locator('body').innerText()) && /INV-2026-006/.test(await s.locator('body').innerText()), 'the client statement carries the invoices and the credit note')
    await go(s, '/company/reports/finance?report=pl&period=this_year')
    ok(/Credit notes/.test(await text(s.getByTestId('report-table-revenue'))), 'P&L takes the credit notes off the revenue')
    await shot(s, 'f2-08-reports-pl')
    /* (one-home N-09, a deliberate change of this rule) Xero's connection lives on Company › Integrations — Accounting's button is a door there,
       with the way back; Accounting keeps the organisations, the mapping, the pushes and the sync log
       (simplify S-11, a deliberate change of this rule) the tab is named Xero (its address kept) and, before Xero is connected, it connects in place
       — the Integrations card's own Connect Xero; Disconnect stays on Integrations, the connection's home */
    await go(s, '/company/finance/accounting')
    ok(/Xero/.test(await text(s.locator('[aria-label="Finance sections"]'))) && !/Accounting/.test(await text(s.locator('[aria-label="Finance sections"]'))), 'the tab is named Xero')
    ok(/Not connected/i.test(await text(s.getByTestId('xero-card'))) && !/^Disconnect$/m.test(await text(s.getByTestId('xero-card'))), 'Xero: not connected, no Disconnect of its own')
    await s.getByTestId('xero-connect').click(); await settle(s, 1800)
    ok(/Connected/.test(await text(s.getByTestId('xero-card'))) && (await s.getByTestId('xero-map').count()) === 1, 'Connect Xero acts in place: connected, accounts and taxes mapped')
    await go(s, '/company/integrations')
    ok(!/Xero/.test(await text(s.locator('section[aria-labelledby="int-soon"]'))), 'Xero left Integrations’ Coming card')
    ok(/Connected/.test(await text(s.getByTestId('int-xero'))) && /by Dane/.test(await text(s.getByTestId('int-xero-line'))), 'Integrations’ live Xero card reads it — connected, by whom')
    await go(s, '/company/finance/accounting')
    await s.getByTestId('xero-sync').click(); await settle(s, 2500)
    ok(Number(sql(`select count(*) from xero_sync_log`)) > 0 && sql(`select count(*) from xero_links where record_kind='credit_note' and status='synced'`) !== '0', 'Sync now pushes the books (credit notes among them) and logs each push')
    ok(sql(`select count(*) from xero_links l join credit_notes c on c.id = l.record_id where c.number='CN-2026-003' and l.record_kind='credit_note'`) === '0' && sql(`select count(*) from xero_links l join credit_notes c on c.id = l.record_id where c.number='CN-2026-002'`) === '1', 'an issued credit note goes; one made void before Xero ever had it does not')
    await shot(s, 'f2-09-xero')
    await go(s, '/company/integrations')
    await s.getByTestId('int-xero-disconnect').click(); await settle(s, 1200)
    ok(/Not connected/i.test(await text(s.getByTestId('int-xero'))) && Number(sql(`select count(*) from xero_sync_log`)) > 0, 'Disconnect (on Integrations) keeps the log')
    await go(s, '/company/finance/accounting')
    ok(/Not connected/i.test(await text(s.getByTestId('xero-card'))) && (await s.getByTestId('xero-log').count()) === 1, 'Accounting still shows the sync log')

    // ── 8 · The listing's Margin, the Overview's Profit, Activity, the bell, the search ─────────────────────────────────────────────────
    console.log('8 · Listing, Overview, Activity, bell, search')
    await go(s, '/projects')
    ok(!/MARGIN|Margin/.test(await text(s.locator('[role="columnheader"]').filter({ hasText: /^Margin$/i }))), 'the listing’s Margin column is off at first (Column settings)')
    await go(s, `/projects/${ben}`)
    ok((await s.getByTestId('money-profit').count()) === 1, 'the Overview’s Money card has a Profit row (Owner)')
    await go(s, `/projects/${shalini}/activity`)
    const act = await s.locator('body').innerText()
    ok(/issued the credit note CN-2026-001/.test(act) && /refund of S\$545\.00 on CN-2026-001 by PayNow/.test(act), 'Activity: the credit note issued and refunded')
    ok(/paid Sarah S\$[\d,.]+ commission/.test(act), 'Activity: Sarah’s commission paid (an Owner reads it)')
    ok(sql(`select count(*) from notifications where kind='credit_issued' and member_id='germaine'`) !== '0', 'the team heard of CN-2026-002 on the bell')
    await s.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(s, 600)
    await s.keyboard.type('CN-2026-002'); await settle(s, 1500)
    ok(/CN-2026-002/.test(await s.locator('body').innerText()) && /Credit note/.test(await s.locator('body').innerText()), 'the search finds a credit note by its number')
    await s.keyboard.press('Escape'); await settle(s, 300)
    await S.close()

    // ── 9 · A Designer: no books, their own commission, their ask; a team member reads credit notes but issues none ───────────────────────
    console.log('9 · Members')
    as('germaine')
    const G = await desk()
    const g = await page(G, 'germaine')
    await go(g, '/company/finance')
    /* (simplify S-10, a deliberate change of this rule) a Designer's Finance lands on To do too — their own drafts, what was sent back, their claims */
    ok(/\/company\/finance\/todo$/.test(g.url()) && /My commission/.test(await text(g.locator('[aria-label="Finance sections"]'))), 'a Designer’s Finance lands on To do; her tab reads My commission')
    await go(g, '/company/finance/overview')
    ok(!/\/company\/finance\/overview$/.test(g.url()), 'the Overview is the Owners’ and Admins’ — a Designer is sent to their first tab')
    await go(g, '/company/finance/commissions')
    const mine = await text(g.getByTestId('commission-lines'))
    ok(/Benjamin Han/.test(mine) && !/Sarah/.test(await g.locator('body').innerText()) && !/Michelle/.test(mine), 'Commissions: her own lines only — never another member’s')
    ok(/You earned/i.test(await text(g.getByTestId('tile-commission-earned'))), 'her own tiles')
    await g.locator('[data-testid="commission-lines"] [role="row"]').filter({ hasText: 'Marcus Teo' }).getByTestId('commission-ask').click(); await settle(g, 600)
    await dialog(g).getByLabel(/^Rate \(%\)/).fill('5'); await dialog(g).getByLabel(/^Why/).fill('I run the site alone'); await dialog(g).getByTestId('commission-rule-save').click(); await settle(g, 1500)
    ok(sql(`select count(*) from commission_requests where member_id='germaine' and status='open'`) === '1', 'she asks for another rate on a project she works on')
    ok(sql(`select count(*) from notifications where kind='commission_asked' and member_id='dane' and created_at >= ${startAt}`) === '1', 'the Owner hears the ask')
    await go(g, `/projects/${ben}/money`)
    ok((await g.getByTestId('tile-profit').count()) === 0 && (await g.getByTestId('project-profit').count()) === 0, 'no profit, margin or insights for a Designer (Q-20)')
    /* (simplify S-08) a Designer reads them in the invoice's panel (the Credit notes view is the admin's) */
    await g.locator(`[data-testid="money-stages"] [data-invoice="${INV('INV-2026-004')}"]`).first().getByTestId('invoice-row-open').click(); await settle(g, 900)
    ok(/CN-2026-002/.test(await text(g.getByTestId('invoice-panel-credits'))), 'the team reads the credit notes')
    await g.keyboard.press('Escape'); await settle(g, 400)
    const row6 = g.locator(`[data-testid="money-stages"] [data-invoice="${INV('INV-2026-006')}"]`).first()
    await row6.scrollIntoViewIfNeeded(); await row6.getByRole('button', { name: /More actions/ }).click(); await settle(g, 400)
    ok((await menuItem(g, /^Issue a credit note/).count()) === 0, 'a Designer is not offered Issue a credit note')
    await g.keyboard.press('Escape')
    await go(g, `/projects/${ben}`)
    ok((await g.getByTestId('money-profit').count()) === 0, 'no Profit row on the Overview for a Designer')
    await G.close()

    // ── 10 · Phone 390 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · Phone 390')
    as('dane')
    const F = await phoneCtx()
    const f = await page(F, 'phone')
    /* (one-home N-01) the Pipeline is gone — Reports' Profitability stands in its place · (one-home N-09) Integrations carries Xero's card */
    for (const [url, name] of [['/company/finance/todo', 'todo'], ['/company/finance/money-out', 'money-out'], ['/company/reports/finance?report=profitability', 'profitability'], ['/company/finance/commissions', 'commissions'], ['/company/reports/finance?report=pl', 'reports'], ['/company/finance/accounting', 'accounting'], ['/company/integrations', 'integrations'], [`/projects/${ben}/money`, 'money']]) {
      await go(f, url)
      ok(await overflow(f) <= 1, `${name}: no sideways scroll at 390`)
      await shot(f, `f2-10-${name}-390`, false)
    }
    const row = f.locator(`[data-invoice="${INV('INV-2026-006')}"]`).first()
    await row.scrollIntoViewIfNeeded(); await row.getByRole('button', { name: /More actions/ }).click(); await settle(f, 500)
    await menuItem(f, /^Issue a credit note/).click(); await settle(f, 900)
    const box = await dialog(f).boundingBox()
    ok(!!box && box.y + box.height >= 844 - 2 && box.width >= 380, 'Issue a credit note rises as a bottom sheet on a phone')
    await shot(f, 'f2-11-issue-sheet-390', false)
    await F.close()
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    /* put back everything the probe wrote */
    try {
      as('dane')
      const made = sql(`select group_concat(quote(id)) from credit_notes where created_at >= ${startAt}`)
      if (made) {
        sql(`delete from lead_files where id in (select file_id from credit_notes where id in (${made}))`)
        sql(`delete from credit_notes where id in (${made})`)
      }
      /* (parity map, a deliberate change of this rule — FB-057) an ask and its answer now write the project's Activity lines (parity_c_commission_…) */
      sql(`delete from lead_events where at >= ${startAt} and (kind like 'project_credit_%' or kind like 'project_commission_%' or kind like 'parity_c_commission_%')`)
      sql(`delete from notifications where created_at >= ${startAt}`)
      sql(`delete from commission_payouts where created_at >= ${startAt}`)
      sql(`delete from commission_requests where created_at >= ${startAt}`)
      sql(`delete from commission_rules where request_id = '${michelleAsk}'`)
      sql(`update commission_requests set status='open', answered_by=NULL, answered_at=NULL, answer_note=NULL, approved_rate_bp=NULL, approved_fixed_minor=NULL where id='${michelleAsk}'`)
      sql(`delete from xero_links`); sql(`delete from xero_sync_log`); sql(`delete from settings where key='xero'`)
      const after = { cn: sql('select count(*) from credit_notes'), payouts: sql('select count(*) from commission_payouts'), asks: sql('select count(*) from commission_requests'), rules: sql('select count(*) from commission_rules'),
        files: sql('select count(*) from lead_files'), events: sql('select count(*) from lead_events'), bell: sql("select count(*) from notifications where kind not like 'credit%'")   /* (parity map, a deliberate change of this rule) the server's own monthly credits rows (a demo month rolling on the real clock) are not the probe's */ }
      ok(JSON.stringify(after) === JSON.stringify(before), `the database is as it was (${JSON.stringify(after)})`)
    } catch (e) { fail++; console.log('  ✗ cleanup threw:', String(e).slice(0, 300)) }
    ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
