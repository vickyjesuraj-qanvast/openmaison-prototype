// Projects & Finance, simplified — package K-S (simplify S-15 · S-20, 2026-10-09): one Settings home for money rules and the Owner's OK in one
// place. Settings › Projects opens on *What waits for an Owner or an Admin* (six rows: updates + reviewers · invoices · Done · shares ·
// handover · Finance's PO and expense rules) and no longer holds the money cards; Settings › Finance holds Document numbers (INV · RCT · CN ·
// PO, one Save) then Money in (Invoices · Invoice paper · Client payments · Credit notes) · Money out (Costs) · Commission; an old address to a
// moved card lands on Finance; Who may do what names the new places; a Designer reads both in the read-only scope; the listing's Needs my
// review counts every kind (POs, expenses, the schedule's asks) for an Owner and not for a Designer; the phone has no sideways scroll.
// Run against `next start` on a scratch DB — never local.db. Every setting it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-ks.cjs <scratch.db> [shotDir] [base URL]   (BASE in the environment wins)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'ks')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3011'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const KEYS = ['project_invoices', 'invoice_numbering', 'receipt_numbering', 'credit_note_rules', 'cost_rules', 'invoice_numbering_entities']
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const setting = (k) => { const v = sql(`select value from settings where key='${k}'`); return v ? JSON.parse(v) : null }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const youBefore = sql(`select id from members where is_you = 1`) || 'dane'
  const before = json(`select key, value, updated_at from settings where key in (${KEYS.map((k) => `'${k}'`).join(',')})`)
  try {
    as('dane')
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const tops = (ids) => p.evaluate((list) => list.map((t) => { const el = document.querySelector(`[data-testid="${t}"]`); return el ? el.getBoundingClientRect().top + window.scrollY : -1 }), ids)
    const inOrder = (ys) => ys.every((y) => y >= 0) && ys.every((y, i) => i === 0 || y > ys[i - 1])

    console.log('S-20 · Settings › Projects opens on What waits for an Owner or an Admin')
    await go('/settings?section=projects')
    const card = p.locator('[data-testid="owner-approvals"]')
    ok(await card.count() === 1 && /What waits for an Owner or an Admin|Approvals/.test(await card.innerText()) /* (the calm UI build 2026-10-27, a deliberate change) 5-33: "Approvals" */, 'the card is there, by its name')
    ok(inOrder(await tops(['owner-approvals', 'project-numbering', 'handover-setting', 'schedule-settings'])), 'it is the module’s first card: approvals · Project numbers · Stages and handover · Schedule')
    const rows = ['update-review-row', 'invoice-approval-row', 'schedule-rule-completionApproval', 'schedule-rule-shareApproval', 'handover-review-row', 'cost-approvals-row']
    ok((await Promise.all(rows.map((r) => card.locator(`[data-testid="${r}"]`).count()))).every((n) => n === 1), 'six rows: updates (+ who reviews) · invoices · Done · shares · handover · POs and expenses')
    ok(inOrder(await tops(rows.slice(0, 1).concat(['invoice-approval-row']))), 'updates first, then invoices')
    ok(/Finance › Costs/.test(await card.locator('[data-testid="cost-approvals-row"]').innerText()) && /section=finance.*#cost-settings/.test(await card.getByTestId('cost-approvals-link').getAttribute('href')), 'the PO and expense rules: named, with the link to Finance › Costs')
    ok(await p.locator('[data-testid="invoice-settings"], [data-testid="invoice-paper-settings"], [data-testid="payment-settings"], [data-testid="credit-settings"], [data-testid="update-review-setting"]').count() === 0, 'the money cards and the Updates card are gone from Projects')
    ok(/section=finance/.test(await p.getByTestId('projects-money-link').getAttribute('href')), 'a line under the head points to Finance for how projects are invoiced and paid')
    await shot('01-projects-approvals-1440')
    /* the invoice switch writes the setting it always wrote */
    const was = setting('project_invoices')?.approval !== false
    await card.locator('[data-testid="invoice-approval-row"] label').first().click(); await p.waitForTimeout(1300)
    ok((setting('project_invoices')?.approval !== false) === !was, 'Invoices need approval: switched here, saved in project_invoices')
    await card.locator('[data-testid="invoice-approval-row"] label').first().click(); await p.waitForTimeout(1300)
    ok((setting('project_invoices')?.approval !== false) === was, '…and back')

    console.log('S-15 · Settings › Finance: one home for money rules')
    await go('/settings?section=finance')
    ok(inOrder(await tops(['document-numbers', 'finance-money-in', 'finance-money-out', 'finance-commission'])), 'Document numbers first, then Money in · Money out · Commission')
    const moneyIn = p.getByTestId('finance-money-in')
    ok(inOrder(await tops(['invoice-settings', 'invoice-paper-settings', 'payment-settings', 'credit-settings'])) && await moneyIn.locator('[data-testid="invoice-settings"], [data-testid="invoice-paper-settings"], [data-testid="payment-settings"], [data-testid="credit-settings"]').count() === 4, 'Money in: Invoices · Invoice paper · Client payments · Credit notes')
    ok(await p.getByTestId('finance-money-out').locator('[data-testid="cost-settings"]').count() === 1 && await p.getByTestId('finance-commission').locator('[data-testid="commission-settings"]').count() === 1, 'Money out: Costs · Commission: Commission')
    const links = await p.locator('[data-testid="module-related"] [data-testid="module-links"]').innerText()   // (the calm UI build 2026-10-27, a deliberate change) B5 5-17: the Related line
    ok(/Profile/.test(links) && /Payment schedules/.test(links) && /Vendors/.test(links) && /\bCommission\b/.test(links), 'Kept in Company: Profile · Payment schedules · Vendors · Commission')   // (simplify S-11) the tab's one name
    const docs = p.getByTestId('document-numbers')
    ok((await Promise.all(['invoice-number-example', 'receipt-number-example', 'cn-number-example', 'po-number-example'].map((t) => docs.getByTestId(t).innerText()))).every((t, i) => new RegExp(`^${['INV', 'RCT', 'CN', 'PO'][i]}-`).test(t)), 'Document numbers: INV · RCT · CN · PO, each with its next number')
    ok(await p.locator('[data-testid="invoice-settings"] [data-testid="invoice-number-example"], [data-testid="payment-settings"] [data-testid="receipt-number-example"], [data-testid="cost-settings"] [data-testid="po-number-example"]').count() === 0, 'the old numbering blocks are gone from their cards')
    ok(/section=projects.*#invoice-approval/.test(await p.getByTestId('invoice-approval-link').getAttribute('href')), 'Invoices says where its approval is switched')
    await shot('02-finance-1440', true)
    /* one Save writes the keys the four blocks wrote */
    const costBefore = setting('cost_rules')
    await docs.getByTestId('document-numbers-credit').getByLabel('Prefix').fill('CRN')
    await docs.getByTestId('document-numbers-po').getByLabel('Digits').fill('4')
    await docs.getByTestId('document-numbers-save').click(); await p.waitForTimeout(1500)
    const cn = setting('credit_note_rules'), cost = setting('cost_rules')
    ok(cn?.numbering?.prefix === 'CRN' && cost?.numbering?.digits === 4 && cost?.poLimitMinor === costBefore?.poLimitMinor && cost?.poApproval === costBefore?.poApproval, 'one Save: credit_note_rules.numbering and cost_rules.numbering written, the cost rules kept')
    ok(/^CRN-/.test(await docs.getByTestId('cn-number-example').innerText()) && /\d{4}$/.test(await docs.getByTestId('po-number-example').innerText()), 'the examples follow')
    /* a prefix two documents share is refused on the field */
    await docs.getByTestId('document-numbers-receipt').getByLabel('Prefix').fill('INV'); await p.waitForTimeout(300)
    ok(/Another document has this prefix/.test(await docs.innerText()) && await docs.getByTestId('document-numbers-save').isDisabled(), 'RCT as INV: the field says why, Save waits')
    await shot('03-document-numbers-clash-1440')
    await docs.getByRole('button', { name: 'Discard' }).click(); await p.waitForTimeout(300)

    console.log('An old address lands on the new place')
    await go('/settings?section=projects#invoice-paper'); await p.waitForTimeout(1200)
    ok(/section=finance/.test(p.url()) && /#invoice-paper/.test(p.url()), 'Settings › Projects #invoice-paper → Settings › Finance #invoice-paper')

    console.log('Who may do what names the new places')
    await go('/settings?section=studio')
    await openRoles(p)   // (the calm UI build 2026-10-27, a deliberate change)
    const href = (k) => p.getByTestId(`may-link-${k}`).getAttribute('href')
    ok(/section=projects.*#invoice-approval/.test(await href('invoice-send')) && /section=projects.*#done-approval/.test(await href('project-milestone-done')) && /section=projects.*#handover-review/.test(await href('project-handover')) && /#update-settings/.test(await href('project-update')), 'the project approvals: Projects › What waits for an Owner or an Admin, each on its row')
    ok(/section=finance.*#credit-settings/.test(await href('credit-issue')) && /section=finance.*#payment-settings/.test(await href('payment-confirm')), 'Credit notes · Client payments: Finance')

    console.log('A Designer reads both')
    as('germaine')
    await go('/settings?section=projects')
    ok(await p.locator('[data-testid="owner-approvals"] [data-testid="invoice-approval-row"] input').first().isDisabled(), 'Projects: the switches read, disabled')
    await go('/settings?section=finance')
    ok(await p.getByTestId('document-numbers-save').count() === 0 && await p.getByTestId('document-numbers-invoice').getByLabel('Prefix').isDisabled(), 'Finance: Document numbers read-only, no Save')

    console.log('S-20 · the listing’s Needs my review counts every kind')
    as('dane')
    await go('/projects?scope=review')
    const owner = (await p.locator('[data-kb-row]').allInnerTexts()).join('\n')
    ok(/purchase order.? to approve|expense.? to approve|to approve as done|More time asked|Schedule changes to share/.test(owner), 'the Owner’s rows name the POs, expenses or schedule asks waiting')
    await shot('04-needs-my-review-1440')
    as('germaine')
    await go('/projects?scope=review')
    const designer = (await p.locator('[data-kb-row]').allInnerTexts()).join('\n')
    ok(!/purchase order.? to approve|expense.? to approve|to approve as done|More time asked|Schedule changes to share/.test(designer), 'a Designer’s never counts what an Owner approves')
    as('dane')
    await ctx.close()

    console.log('The phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    for (const s of ['projects', 'finance']) {
      await q.goto(`${BASE}/settings?section=${s}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(900)
      ok(await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), `Settings › ${s}: no sideways scroll at 390`)
      await q.screenshot({ path: path.join(dir, `05-${s}-390.png`), fullPage: true })
    }
    await ph.close()
  } finally {
    for (const k of KEYS) sql(`delete from settings where key='${k}'`)
    for (const r of before) sql(`insert into settings (key, value, updated_at) values (${lit(r.key)}, ${lit(r.value)}, ${lit(r.updated_at)})`)
    as(youBefore)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
