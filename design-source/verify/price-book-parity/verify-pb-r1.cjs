// Price book parity round 1 (REG-651) — numbers you can trust: money boxes take cents (item dialog, section editor, GST rate); the
// rounding step leaves a rate per area or length as typed, never lands under cost, and the popover shows the price a pick lands at;
// an item's category is one of the trades (the list is what quotes and My Items use; an import's new category joins it; a rename
// carries items whatever the case and My Sections' lines); the demo's book tells the truth.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
// (REG-665) The demo files the libraries' entries into folders (repair R59); this round's checks were written for — and read — each
// library flat, so the test copy is unfiled and its folders put away first. Folders have their own probes (design-source/verify/folders/).
sql(`UPDATE quote_templates SET folder_id = NULL; UPDATE contract_templates SET folder_id = NULL; UPDATE task_templates SET folder_id = NULL; UPDATE quote_text_templates SET folder_id = NULL; UPDATE payment_templates SET folder_id = NULL; UPDATE price_book_items SET folder_id = NULL; UPDATE price_book_sections SET folder_id = NULL; UPDATE library_folders SET deleted_at = strftime('%s', 'now') WHERE deleted_at IS NULL`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 6000 }) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-pb1/${n}.png` })

  await step('the item dialog takes dollars and cents', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: /New item/ }).click()
    const dlg = page.getByTestId('item-dialog')
    await dlg.getByLabel('Item name').fill('Skirting, PVC')
    await dlg.getByLabel('Cost (S$)').fill('2.80'); await dlg.getByLabel('Markup (S$)').fill('0.70')
    // (S44P, M8 — pending modules, a deliberate change of this rule: the unit price is its own box beside Cost and Markup, no longer the markup's helper line)
    ok('the unit price reads S$3.50', (await dlg.getByLabel('Unit price (S$)').inputValue()) === '3.50')
    await dlg.getByRole('combobox', { name: 'Trade' }).click(); await page.waitForTimeout(250)   // (the calm UI build 2026-10-27, a deliberate change) the field is Trade
    const cats = await page.getByRole('option').allInnerTexts()
    ok('the category is one of the trades — Tiling from the book among them', cats.includes('Carpentry') && cats.includes('Tiling') && cats.includes('No trade'), cats.join(', '))
    await page.getByRole('option', { name: 'Carpentry', exact: true }).click()
    await shot('01-item-cents')
    await page.getByRole('dialog').getByRole('button', { name: 'Add to Price book' }).click(); await page.waitForTimeout(1200)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    ok('saved as S$2.80 + S$0.70', sql(`select cost_minor || '|' || markup_minor || '|' || category from price_book_items where name='Skirting, PVC'`) === '280|70|Carpentry')
    const design = sql(`select id from price_book_items where name like 'Design consultation%'`)
    await page.getByRole('button', { name: /^(Open|Edit) Design consultation/ }).first().click()
    await page.getByTestId('item-dialog').getByLabel('Cost (S$)').fill('1900.00')
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1200)
    ok('an edited S$1,800.00 saved as S$1,900.00', sql(`select cost_minor from price_book_items where id='${design}'`) === '190000')
  })

  await step('the section editor takes a price over S$10 and a decimal quantity', async () => {
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page)
    await page.getByRole('button', { name: /^(Open|Edit) Bathrooms/ }).first().click()
    const dlg = page.getByTestId('section-dialog'); await dlg.waitFor()
    const line = dlg.getByTestId('section-line').first()
    await line.getByLabel(/Unit price/).fill('12.50')
    ok('the box keeps what is typed', (await line.getByLabel(/Unit price/).inputValue()) === '12.50')
    await line.getByLabel('Qty').fill('12.5')
    await shot('02-section-cents')
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1200)
    const first = sql(`select json_extract(lines_json, '$.lines[0].qty') || '|' || (json_extract(lines_json, '$.lines[0].costMinor') + json_extract(lines_json, '$.lines[0].markupMinor')) from price_book_sections limit 1`)
    ok('saved 12.5 at S$12.50', first === '12.5|1250', first)
  })

  await step('the rounding step leaves rates as typed and shows landing prices', async () => {
    sql(`insert or replace into settings (key, value, updated_at) values ('quote_rules', '{"roundStep":10,"paymentLock":false,"backupApproverId":null,"preparedBy":"member"}', strftime('%s','now'))`)
    const q = sql(`select id from quotes where status='Draft' and deleted_at is null limit 1`)
    await page.goto(`${BASE}/quotes/${q}`); await ready(page)
    const add = page.getByRole('combobox', { name: 'Add Item' }).first()
    await add.scrollIntoViewIfNeeded(); await add.click(); await add.fill('Cement'); await page.waitForTimeout(500)
    const opt = page.getByRole('option', { name: /Cement screeding/ }).first()
    ok('a rate per sqft reads as typed (S$3.50 / sqft), not S$0', /S\$\s?3\.50 \/ sqft/.test(await opt.innerText()), await opt.innerText())
    await opt.click(); await page.waitForTimeout(1500)
    ok('a picked rate keeps its price', sql(`select cost_minor + markup_minor from quote_items where quote_id='${q}' and name like 'Cement screeding%' order by created_at desc limit 1`) === '350')
    await shot('03-rounding-rates')
    sql(`delete from settings where key='quote_rules'`)
  })

  await step('the trades: one list, a rename carries the book and My Sections', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('trades').waitFor(); await ready(page)
    // (the calm UI build 2026-10-27, a deliberate change) W-574 took the "Not set yet — these are the trades your quotes and My Items already use"
    // line off the card; the rule stays on screen in what the card lists: unset, its trades are exactly the categories the quotes and the book use
    const usedTrades = [...new Map(sql(`select category from quote_items where category is not null and trim(category) <> '' and kind='item' union all select category from price_book_items where category is not null and trim(category) <> '' and deleted_at is null`).split('\n').map((c) => c.trim()).filter(Boolean).map((c) => [c.toLowerCase(), c])).keys()].sort()
    const shownTrades = (await page.getByTestId('trade').evaluateAll((els) => els.map((li) => (li.querySelector('button > span:last-child, :scope > span:last-child')?.textContent ?? '').trim().toLowerCase()))).sort()
    ok('unset, the trades say they come from the quotes and My Items', sql(`select count(*) from settings where key='trades'`) === '0' && usedTrades.length > 0 && JSON.stringify(shownTrades) === JSON.stringify(usedTrades), `${shownTrades.length} shown · ${usedTrades.length} used`)
    sql(`update price_book_items set category='masonry' where name like 'Cement screeding%'`)
    const chip = page.getByTestId('trade').filter({ has: page.getByRole('button', { name: /^Masonry/ }) }).first()
    await chip.getByRole('button').first().click()
    const dlg = page.getByRole('dialog', { name: 'Trade' })
    await dlg.getByLabel('Name').fill('Masonry works'); await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Masonry is now Masonry works')
    ok('an item filed as "masonry" follows', sql(`select category from price_book_items where name like 'Cement screeding%'`) === 'Masonry works')
    ok('the saved section’s lines follow', sql(`select json_extract(lines_json, '$.lines[0].category') from price_book_sections limit 1`) === 'Masonry works')
  })

  await step('an import’s new category joins the trades', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: /Import from a spreadsheet/ }).click()
    await page.getByTestId('import-dialog').getByLabel('Paste the rows here').fill('Item\tCategory\tCost\nTempered glass panel\tGlass works\t120')
    await page.getByRole('button', { name: 'Next' }).click(); await page.waitForTimeout(600)
    const header = page.getByRole('checkbox', { name: 'First row is a header' })
    if (!(await header.isChecked())) await header.locator('xpath=ancestor::label[1]').click()
    await page.getByRole('button', { name: /^Import 1 row/ }).click(); await page.waitForTimeout(1500)
    ok('the item came in', sql(`select count(*) from price_book_items where name='Tempered glass panel'`) === '1')
    ok('Glass works is now a trade', sql(`select value from settings where key='trades'`).includes('Glass works'))
  })

  await step('the demo’s book tells the truth', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    const body = await page.locator('body').innerText()
    // REG-797 (UX audit S8): My Items opens as the list — the unit and the unit price sit in their own columns of the tiles' rows
    const tiles = await page.getByRole('row').filter({ hasText: 'Homogeneous tiles' }).allInnerTexts()
    ok('the tiles cost S$11.00 a square foot', tiles.length > 0 && tiles.every((t) => /\bsqft\b/.test(t) && /S\$\s?11\.00/.test(t)) && !/1,100\.00/.test(body), tiles.map((t) => t.replace(/\s+/g, ' ')).join(' | '))
    ok('Cement screeding is not "edited" on 23 Sep', sql(`select updated_at < 1790000000 from price_book_items where name like 'Cement screeding%'`) === '1')
    ok('OM-10001 has no blank "Item" lines or empty sections', sql(`select count(*) from quote_items i join quotes q on q.id=i.quote_id where q.number='OM-10001' and i.name in ('Item','New section')`) === '0')
    await shot('04-book')
  })

  await step('phone', async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await c.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/company/price-book`); await ready(p)
    await p.getByTestId('new-template').click(); await p.getByRole('menuitem', { name: /New item/ }).click(); await p.waitForTimeout(500)
    await p.getByTestId('item-dialog').getByLabel('Cost (S$)').fill('4.95')
    ok('390: the cost box keeps cents', (await p.getByTestId('item-dialog').getByLabel('Cost (S$)').inputValue()) === '4.95')
    await shot('05-phone-item', p)
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: fits the width', over <= 0, `${over}px`)
    await c.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
})()
