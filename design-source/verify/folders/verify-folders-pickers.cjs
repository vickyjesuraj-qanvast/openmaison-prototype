// REG-664 — the pickers browse the libraries' folders (the owner: "galleries and pickers"): Choose a template (quotes), the contract
// picker, the Tasks tab's Choose Template, My Templates (T&Cs · Notes), the payment presets ▾ (grouped by folder) and the Price book
// modal (My Items · My Sections). Folders first, the crumb inside one, a search reaches every folder and says where; the studio
// default stays at the top; a folder with nothing to pick is not offered.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const Q1 = sql(`select id from quotes where number='OM-10001'`)
const LEAD = sql(`select lead_id from quotes where id='${Q1}'`)

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-folders/${n}.png` })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)

  await step('quote template picker', async () => {
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    await page.getByTestId('template-card').getByRole('button', { name: /^(Change|Choose a template)$/ }).click(); await page.waitForTimeout(600)
    const dlg = page.getByRole('dialog', { name: 'Choose a template' })
    const opts = await dlg.getByRole('option').evaluateAll((os) => os.map((o) => o.getAttribute('aria-label') || (o.querySelector('[class*="__name"]')?.textContent ?? '').trim()))
    ok('Choose a template opens on folders first, the default pinned at the top', /^Open folder HDB$/.test(opts[0] ?? '') && opts.some((o) => /Default Quote PDF/.test(o)), opts.join(' | '))
    ok('a folder with only drafts is not offered (Show flats)', !opts.some((o) => /Show flats/.test(o)))
    await dlg.getByRole('option', { name: 'Open folder HDB' }).click(); await page.waitForTimeout(300)
    ok('inside a folder: the crumb and its templates', /All templates\s*\/\s*HDB/.test((await dlg.getByTestId('folder-crumbs').innerText()).replace(/\n/g, ' ')) && await dlg.getByRole('option').count() === 2)
    await shot(page, 'pick-01-quote-templates-1440')
    await dlg.getByTestId('folder-crumbs').getByRole('button', { name: 'All templates', exact: true }).click(); await page.waitForTimeout(200)
    const sb = dlg.getByRole('searchbox', { name: 'Search templates' })
    if (!(await sb.isVisible().catch(() => false))) await dlg.getByRole('button', { name: /Search templates/ }).click()
    await dlg.getByRole('searchbox', { name: 'Search templates' }).fill('BTO'); await page.waitForTimeout(300)
    const metas = await dlg.getByRole('option').allInnerTexts()
    ok('a search reaches the folder and says where', metas.length === 2 && metas.every((m) => /HDB ·/.test(m)), metas.map((m) => m.replace(/\n/g, ' ').slice(0, 40)).join(' | '))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('price book modal', async () => {
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    await page.getByRole('complementary', { name: 'Create' }).getByRole('button', { name: 'My Items', exact: true }).click(); await page.waitForTimeout(600)
    const dlg = page.getByRole('dialog', { name: 'Price book' })
    const rows = await dlg.getByTestId('folder-pick-row').allInnerTexts()
    ok('My Items opens on its folders, then what sits at the top', rows.length === 2 && /Kitchen/.test(rows[0]) && /Wet works/.test(rows[1]), rows.map((r) => r.replace(/\n/g, ' ')).join(' | '))
    await dlg.getByRole('button', { name: 'Open folder Wet works' }).click(); await page.waitForTimeout(300)
    ok('inside Wet works: the crumb and its four items', /My Items\s*\/\s*Wet works/.test((await dlg.getByTestId('folder-crumbs').innerText()).replace(/\n/g, ' ')) && await dlg.getByTestId('book-item').count() === 4)
    await shot(page, 'pick-02-price-book-1440')
    await dlg.getByRole('searchbox').fill('tiles'); await page.waitForTimeout(300)
    const hits = await dlg.getByTestId('book-item').allInnerTexts()
    ok('a search reaches every folder and says where', hits.length >= 2 && hits.every((h) => /Wet works/.test(h)), hits.map((h) => h.replace(/\n/g, ' ').slice(0, 50)).join(' | '))
    await dlg.getByRole('searchbox').fill('')
    await dlg.getByRole('radio', { name: /^My Sections/ }).click(); await page.waitForTimeout(300)
    ok('My Sections has its own folders', await dlg.getByRole('button', { name: 'Open folder Bathrooms' }).isVisible())
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('my templates (T&Cs · Notes)', async () => {
    await page.goto(`${BASE}/quotes/${Q1}#terms`); await ready(page)
    await page.getByRole('button', { name: 'My Templates', exact: true }).first().click(); await page.waitForTimeout(500)   // Terms comes before Notes
    const dlg = page.getByRole('dialog', { name: 'Terms and Conditions Templates' })
    ok('My Templates opens on the library’s folders', await dlg.getByRole('button', { name: 'Open folder HDB' }).isVisible() && !(await dlg.getByRole('button', { name: 'Open folder Site rules' }).isVisible().catch(() => false)), 'Site rules holds notes only — not offered for Terms')
    await dlg.getByRole('button', { name: 'Open folder HDB' }).click(); await page.waitForTimeout(300)
    ok('inside HDB: its two terms', await dlg.getByRole('listitem').filter({ hasText: /Terms and Conditions for (HDB|BTO) Works/ }).count() === 2)
    await shot(page, 'pick-03-my-templates-1440')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('payment presets', async () => {
    await page.goto(`${BASE}/quotes/${Q1}#payment`); await ready(page)
    await page.locator('button[aria-haspopup="menu"]').filter({ hasText: /\d+\/\d+|Custom/ }).first().click(); await page.waitForTimeout(400)
    const groups = await page.getByTestId('split-group').evaluateAll((gs) => gs.map((g) => `${g.getAttribute('aria-label')}: ${g.querySelectorAll('[role="menuitemradio"]').length}`))
    ok('the presets ▾ lists each folder’s splits under its name', groups.join(', ') === 'Full renovation: 1, Small jobs: 2', groups.join(', '))
    await shot(page, 'pick-04-payment-presets-1440')
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  })

  await step('contract picker', async () => {
    await page.goto(`${BASE}/leads/${LEAD}/contracts`); await ready(page)
    await page.getByRole('button', { name: /^New Contract|^Create Contract/ }).first().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /From Template/i }).click(); await page.waitForTimeout(900)
    const dlg = page.getByRole('dialog', { name: 'Choose a contract template' })
    const cards = await dlg.getByTestId('folder-card').allInnerTexts()
    ok('the contract picker opens on its folders', cards.length === 2 && /Agreements/.test(cards[0]) && /Variations/.test(cards[1]), cards.map((c) => c.replace(/\n/g, ' ')).join(' | '))
    await dlg.getByRole('button', { name: 'Open Agreements' }).click(); await page.waitForTimeout(300)
    ok('inside Agreements: its template', await dlg.getByRole('radio').count() === 1 && /Interior Design Service Agreement/.test(await dlg.getByRole('radio').first().innerText()))
    await shot(page, 'pick-05-contracts-1440')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('choose template (tasks)', async () => {
    await page.goto(`${BASE}/leads/${LEAD}/tasks`); await ready(page)
    await page.getByRole('button', { name: /^Add Task/ }).first().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Use Template' }).click(); await page.waitForTimeout(500)
    const rows = await page.getByTestId('folder-pick-row').allInnerTexts()
    ok('Choose Template opens on the folders', rows.length === 2 && /Lead follow-up/.test(rows[0]) && /Meetings/.test(rows[1]), rows.map((r) => r.replace(/\n/g, ' ')).join(' | '))
    await page.getByRole('button', { name: 'Open folder Lead follow-up' }).click(); await page.waitForTimeout(300)
    ok('inside a folder: the crumb and its template', await page.getByTestId('folder-crumbs').isVisible() && await page.getByRole('radio').filter({ hasText: 'Leads Template' }).count() === 1)
    await shot(page, 'pick-06-tasks-1440')
  })

  await browser.close()
  console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
})()
