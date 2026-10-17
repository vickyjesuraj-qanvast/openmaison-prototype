// Parity-map build, package P-I · the Accounting role (the owner's "build everything that's in 1.0 to 2.0", 2026-10-10; map rows PR-022 ·
// MI-007 · MO-098 · FB-114 · FR-040). Each item asserted as the rule it builds, never another round's count:
//  FR-040  View as Priya Tan · Accounting lands on Company › Finance › To do (1.0's getDefaultRoute)
//  PR-022  the lean rail (Tasks · Company · the bell · Settings; no Leads, Projects, Tools, Messages, Qanvast Ops, no AI credits), the Company
//          panel with Finance and Reports alone, the phone's dock (Dashboard · Finance · Reports · Tasks · More — S22); the house gate on the Leads pipeline, the
//          Projects listing, a Tool and another Company section; a project opened on its Money, its strip Money · Files, its other views gated
//  MI-007  a project's Money opened from a To do row; a client payment recorded by Accounting (confirmed, theirs) and put back with Undo
//  MO-098  To do's Waiting for approval: PO-2026-008 is listed and says "An Owner or an Admin approves purchase orders" where the button would
//          be — no Approve and send anywhere it shows
//  FB-114  Reports lands on Finance and shows the numbers; Leads reports keep their gate; ⌘K's scopes are the books' (All · Projects · Tasks ·
//          Finance) and a project opens on its Money; Settings opens on Finance
//  and, back as Dane: the rail, the Finance tabs and To approve as before; Who may do what has a fifth column computed from the rules; Company ›
//  Members shows Priya "Keeps the books"; the Assign picker never offers her.
// Run against `next start` on a fresh copy of the repaired scratch DB (with the P-I repair block applied) — never local.db. Everything it writes
// is put back in `finally`.
// Usage: BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pm-i.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-i')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3123'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const undo = []
const later = (q) => undo.push(q)
const T0 = Math.floor(Date.now() / 1000) - 2
const reachOf = (p, key) => p.getByTestId(`may-${key}`).locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach'))).then((x) => JSON.stringify(x))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const ben = P('P-2026-002')
  const inv6 = sql(`select id from project_invoices where number='INV-2026-006'`)
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  const loose = sql(`select id from leads where deleted_at is null and direct = 0 and stage = 'New' and id not in (select lead_id from lead_assignees) limit 1`)
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const tabsOf = async (p, label) => (await p.locator(label ? `[role="tablist"][aria-label="${label}"] [role="tab"]` : '[role="tablist"] [role="tab"]').allInnerTexts()).map((t) => t.replace(/\s*\d+$/, '').trim())
  const railNames = (p) => p.locator('nav[aria-label="Workspace"]').locator('a, button').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim()))

  try {
    /* whatever a press writes from here is put back: the payment (and its receipt, its event, its bell rows and the client's message) */
    later(`delete from project_payments where invoice_id='${inv6}' and created_at >= ${T0}`)
    later(`delete from lead_files where lead_id='${benLead}' and created_at >= ${T0}`)
    later(`delete from lead_events where lead_id='${benLead}' and at >= ${T0}`)
    later(`delete from notifications where created_at >= ${T0}`)
    later(`delete from notification_outbox where created_at >= ${T0}`)
    later(`update members set is_you = (id = '${you0}')`)

    console.log('The member')
    ok(sql(`select role || '|' || is_active || '|' || accepting_leads from members where id='priya'`) === 'Accounting|1|0', 'Priya Tan is in Accounting, active, not open to leads (the P-I repair block)')
    ok(sql(`select count(*) from lead_assignees where member_id='priya'`) === '0', 'Accounting is on no lead and no project')

    // ── FR-040 — View as lands on Finance › To do ───────────────────────────────────────────────────────────────────────────────
    console.log('View as Priya')
    as('dane')
    const S = await desk()
    const s = await page(S, 'priya')
    await go(s, '/leads')
    await s.getByRole('button', { name: /View as/ }).first().click(); await settle(s, 400)
    await s.getByRole('menu', { name: 'View as' }).getByRole('menuitemradio').filter({ hasText: 'Priya Tan' }).click()
    await s.waitForURL(/\/company\/finance/, { timeout: 15000 }).catch(() => {}); await settle(s, 1200)
    ok(/\/company\/finance(\/todo)?(\?|$)/.test(new URL(s.url()).pathname + new URL(s.url()).search), `View as Priya Tan lands on Company › Finance › To do (${new URL(s.url()).pathname})`)
    ok(/Viewing as Priya Tan · Accounting/.test(await snack(s).innerText().catch(() => '')), 'the snackbar names her role')
    ok(sql(`select id from members where is_you = 1`) === 'priya', 'the prototype is Priya now')

    // ── PR-022 — the lean rail and the Company panel ────────────────────────────────────────────────────────────────────────────
    console.log('The rail')
    await go(s, '/company/finance/todo')
    const rail = await railNames(s)
    // (pending modules S22, a deliberate change of this rule) the Dashboard is built and Accounting's is the books — it joins their rail
    ok(['Dashboard', 'Tasks', 'Company', 'Notifications', 'Settings'].every((l) => rail.some((r) => r.startsWith(l))), `the rail keeps Dashboard · Tasks · Company · Notifications · Settings (${rail.join(' | ')})`)
    ok(!rail.some((r) => /^(Leads|Projects|Tools|Messages|Qanvast Ops|Marketplace|Upgrade)/.test(r)), 'no Leads, Projects, Tools, Messages, Qanvast Ops, dead ends or Upgrade')
    await s.locator('nav[aria-label="Workspace"]').getByRole('button', { name: /^Company/ }).click(); await settle(s, 400)
    const sections = await s.getByRole('menu', { name: 'Company' }).getByRole('menuitem').allInnerTexts()
    ok(sections.length === 2 && /\bFinance\b/.test(sections[0] ?? '') && /\bReports\b/.test(sections[1] ?? ''), `the Company panel lists Finance and Reports alone (${sections.length} sections)`)   // a row's text starts with its glyph's name
    await shot(s, 'i01-rail-company-1440', false)
    await s.keyboard.press('Escape'); await settle(s, 300)

    // ── MO-098 — To do: what waits for an Owner or an Admin says so ────────────────────────────────────────────────────────────
    console.log('Finance › To do')
    const ftabs = await tabsOf(s)
    ok(['To do', 'Money in', 'Money out', 'Vendors', 'Commission', 'Xero'].every((t, i) => ftabs[i] === t), `every Finance tab, Xero included (${ftabs.join(' · ')})`)
    ok(await s.getByTestId('todo-approve').count() === 0, 'no To approve — Accounting approves nothing')
    const waiting = s.getByTestId('todo-waiting')
    ok(await waiting.count() === 1, 'Waiting for approval is listed')
    const po8 = waiting.locator('[data-row], [role="row"]', { hasText: 'PO-2026-008' }).first()
    const po8Text = await po8.innerText().catch(() => '')
    ok(/PO-2026-008/.test(po8Text) && /An Owner or an Admin approves purchase orders/.test(po8Text), 'PO-2026-008 waits — the row says "An Owner or an Admin approves purchase orders"')
    ok(await po8.getByRole('button', { name: /Approve/ }).count() === 0, 'and offers no Approve')
    await shot(s, 'i02-todo-1440')

    // ── PR-022 — the house gate ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The gate')
    for (const [url, name] of [['/leads', 'Leads'], ['/projects', 'Projects'], ['/quote-x-ray', 'Quote X-Ray'], ['/company/members', 'Members']]) {
      await go(s, url)
      const g = s.getByTestId('access-gate')
      ok(await g.count() === 1 && new RegExp(`You don’t have access to ${name}`).test(await g.innerText()), `${url} lands on the house gate — "You don’t have access to ${name}"`)
    }
    ok(await s.getByTestId('access-gate-home').count() === 1, 'its one button goes to Finance')
    await shot(s, 'i03-gate-1440', false)
    await s.getByTestId('access-gate-home').click(); await s.waitForURL(/\/company\/finance/).catch(() => {})
    ok(/\/company\/finance/.test(s.url()), 'Go to Finance lands there')

    // ── MI-007 — a project's Money, from a row ─────────────────────────────────────────────────────────────────────────────────
    console.log('A project’s Money')
    await go(s, '/company/finance/todo')
    const toMoney = s.locator('[data-testid="todo-collect"] a[href*="/money"]').first()
    ok(await toMoney.count() === 1, 'To collect’s rows open the project’s Money')
    await toMoney.click(); await s.waitForURL(/\/projects\/[^/]+\/money/).catch(() => {}); await settle(s, 1200)
    ok(/\/projects\/[^/]+\/money/.test(s.url()), 'a row opens the project’s Money')
    const ptabs = await tabsOf(s, 'Project sections')
    ok(ptabs.length === 2 && ptabs[0] === 'Money' && ptabs[1] === 'Files', `the project’s strip is Money · Files (${ptabs.join(' · ')})`)
    ok(await s.getByTestId('project-primary').count() === 0, 'no team’s filled button in the header')
    await go(s, `/projects/${ben}`)
    ok(new URL(s.url()).pathname === `/projects/${ben}/money`, 'a project’s own address opens on its Money')
    await go(s, `/projects/${ben}/schedule`)
    ok(await s.getByTestId('project-view-gate').count() === 1, 'its Schedule is gated inside the frame')
    await go(s, `/projects/${ben}/files`)
    ok(await s.getByTestId('project-view-gate').count() === 0 && await s.getByTestId('access-gate').count() === 0, 'its Files open')
    await go(s, `/projects/${ben}/money`)
    await shot(s, 'i04-money-1440')

    // ── MI-007 — a payment recorded, then put back ─────────────────────────────────────────────────────────────────────────────
    console.log('A payment')
    await go(s, `/projects/${ben}/money?open=${inv6}&do=record`); await settle(s, 800)
    const rec = s.getByRole('dialog', { name: 'Record a payment' })
    ok(await rec.count() === 1, 'Record a payment opens for Accounting')
    await rec.getByLabel('Amount paid (S$)').fill('100')
    await rec.getByRole('button', { name: 'Record payment' }).click(); await settle(s, 1800)
    ok(sql(`select count(*) from project_payments where invoice_id='${inv6}' and recorded_by='priya' and status='confirmed' and created_at >= ${T0}`) === '1', 'the payment is recorded — confirmed, by Priya')
    const undoBtn = snack(s).getByRole('button', { name: 'Undo' })
    if (await undoBtn.count()) { await undoBtn.click(); await settle(s, 1500) }
    ok(sql(`select count(*) from project_payments where invoice_id='${inv6}' and created_at >= ${T0} and status <> 'reversed'`) === '0', 'Undo takes it back')

    // ── MO-098 — an approval refused where it shows ────────────────────────────────────────────────────────────────────────────
    console.log('An approval')
    await go(s, '/company/finance/money-out?kind=purchase-orders')
    const poRow = s.locator('[data-row], [role="row"]', { hasText: 'PO-2026-008' }).first()
    ok(/An Owner or an Admin approves it/.test(await poRow.innerText().catch(() => '')), 'Money out’s PO-2026-008 reads "An Owner or an Admin approves it"')
    ok(await poRow.getByRole('button', { name: /Approve/ }).count() === 0, 'with no Approve and send')

    // ── FB-114 — Reports, ⌘K, Settings ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Reports, search, Settings')
    await go(s, '/company/reports')
    ok(new URL(s.url()).pathname === '/company/reports/finance', 'Reports lands on Finance')
    ok(await s.getByTestId('finance-reports-gate').count() === 0, 'and shows its numbers')
    await go(s, '/company/reports/leads')
    ok(await s.getByTestId('insights-gate').count() === 1, 'Leads reports keep their gate')
    await go(s, '/company/finance/todo')
    await s.locator('[data-search-tile]').click(); await settle(s, 500)
    const scopes = (await s.getByRole('dialog', { name: 'Search' }).getByRole('radio').allInnerTexts()).map((x) => x.trim())
    ok(scopes.join(' · ') === 'All · Projects · Tasks · Finance', `⌘K’s scopes are the books’ (${scopes.join(' · ')})`)
    await s.getByLabel('Search the studio').fill('Benjamin'); await settle(s, 1500)
    const results = await s.getByRole('listbox', { name: 'Results' }).innerText()
    ok(!/\nLeads\n/.test(`\n${results}\n`) && !/Quote X-Ray|Contracts\n/.test(results), 'no lead, quote or contract is found')
    const hit = s.getByRole('option').filter({ hasText: 'P-2026-002' }).first()
    if (await hit.count()) { await hit.click(); await s.waitForURL(/\/money/).catch(() => {}); await settle(s, 800) }
    ok(/\/projects\/[^/]+\/money/.test(s.url()), 'a project found opens on its Money')
    await go(s, '/settings')
    /* (pending modules, a deliberate change of this rule) S06: Accounting's Settings is Finance alone — no module strip; the module is Finance */
    ok(await s.locator('[role="tablist"]').count() === 0 && await s.getByTestId('settings-finance').count() === 1, 'Settings opens on Finance')

    // ── PR-022 — the phone ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The phone')
    const Ph = await phoneCtx()
    const ph = await page(Ph, 'priya-phone')
    await go(ph, '/company/finance/todo')
    const dock = (await ph.locator('nav[aria-label="Primary"] [class*="dockLabel"]').allInnerTexts()).map((x) => x.trim())   // the labels — an icon's text is its glyph's name
    // (pending modules S22, a deliberate change of this rule) their Dashboard leads their dock, as the studio's dock has it
    ok(dock.join(' · ') === 'Dashboard · Finance · Reports · Tasks · More', `the dock is Dashboard · Finance · Reports · Tasks · More (${dock.join(' · ')})`)
    ok(await ph.getByRole('link', { name: /^Messages/ }).count() === 0, 'the top bar has no Messages')
    ok((await overflow(ph)) <= 0, '390: no sideways scroll')
    await shot(ph, 'i05-todo-390')
    await Ph.close()

    // ── back as Dane: nothing of his changed ───────────────────────────────────────────────────────────────────────────────────
    console.log('As Dane')
    as('dane')
    await go(s, '/company/finance/todo')
    const drail = await railNames(s)
    ok(['Leads', 'Projects', 'Tools', 'Messages'].every((l) => drail.some((r) => r.startsWith(l))), 'Dane’s rail is as it was')
    ok((await tabsOf(s)).join(' · ').startsWith('To do · Money in · Money out · Vendors · Commission · Xero'), 'Dane’s Finance tabs are as they were')
    ok(await s.getByTestId('todo-approve').count() === 1 && await s.getByTestId('todo-waiting').count() === 0, 'Dane’s To do keeps To approve and has no Waiting for approval')
    await go(s, '/settings?section=studio')
    const head = await s.getByRole('table', { name: 'Who may do what' }).getByRole('row').first().innerText()
    ok(/Accounting · 1/i.test(head), 'Who may do what has the Accounting column, counting one member')
    /* (S44O — call C6, a deliberate change of these rows: a sixth column, Marketing, before Accounting's) */
    ok(await reachOf(s, 'see') === '["yes","yes","yes","yes","yes","no"]', 'See a lead: Accounting no')
    ok(await reachOf(s, 'project-see') === '["yes","yes","yes","yes","no","money"]', 'See a project: Accounting its Money and Files')
    ok(await reachOf(s, 'pay-out') === '["yes","yes","no","no","no","yes"]', 'Pay a vendor: Accounting yes')
    ok(await reachOf(s, 'po-approve') === '["yes","yes","no","no","no","no"]', 'Approve a PO: Accounting no')
    ok(await reachOf(s, 'payment-record') === '["yes","yes","team","own","no","yes"]', 'Record a client’s payment: Accounting yes')
    ok(await reachOf(s, 'commission-run') === '["yes","yes","no","no","no","no"]' && await reachOf(s, 'commission-pay') === '["yes","yes","no","no","no","yes"]', 'commission: Accounting pays it, never sets it')
    await s.getByTestId('studio-roles').scrollIntoViewIfNeeded(); await shot(s, 'i06-who-may-1440', false)
    await go(s, '/company/members')
    const pr = s.locator('[data-testid="member-row"][data-member-id="priya"]')
    ok(await pr.count() === 1 && /Keeps the books/.test(await pr.innerText()) && await pr.getByText('Open to new leads').count() === 0, 'Members: Priya Tan keeps the books — no leads to take')
    if (loose) {
      await go(s, `/leads/${loose}`)
      await s.getByRole('button', { name: 'Assign Member' }).first().click(); await settle(s, 500)
      const listed = await s.getByRole('checkbox', { name: /^Assign / }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
      ok(listed.length > 0 && !listed.some((l) => /Priya/.test(l ?? '')), `the Assign picker never offers Priya (${listed.length} offered)`)
      await s.keyboard.press('Escape')
    } else ok(false, 'a New lead with no members to open the Assign picker on')

    ok(!errors.length, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    for (const q of undo.reverse()) {
      try { if (typeof q === 'function') q(); else sql(q) } catch { console.log('  (undo failed)', String(q).slice(0, 80)) }
    }
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
