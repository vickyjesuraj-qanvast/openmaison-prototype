// Price book parity round 4 (REG-654) — imports, exports and the list: a CSV or XLSX file (or pasted rows) with Kind as a mapping, every
// row matched to the book by name and vendor (Update the price · Add as new · Skip on the preview), repeats and new trades said, the
// 500-row limit said up front, the old .xls refused with the way out; Export in the page kebab, every item or what the list shows, Kind
// and Link coming back; sortable heads, Category and Vendor filters, selection with Set category · Set vendor · Set markup · Delete; the
// small truths (zero use said one way, the tab's title, one glyph per meaning, the card's words are its menu's).
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
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
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
const FILES = `${S}/pb4-files`; fs.mkdirSync(FILES, { recursive: true })
const CSV = `${FILES}/supplier-list.csv`
fs.writeFileSync(CSV, ['Item,Kind,Unit,Cost,Markup,Category,Vendor', '"Painting, whole unit",Labour,Lot,1600,450,Painting,', 'Tempered glass shelf,Purchase,Pieces,40,20,Glass works,Glassco', 'Tempered glass shelf,Purchase,Pieces,41,20,Glass works,Glassco', '"Vinyl flooring, supply and install",Purchase,sqft,5.5,1.5,Flooring,Floor Xpert'].join('\n'))
const XLS = `${FILES}/old.xls`; fs.writeFileSync(XLS, 'not really a sheet')
const PAINT = sql(`select id from price_book_items where name='Painting, whole unit'`)
const openImport = async (page) => { await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: 'Import from a spreadsheet…' }).click(); await page.getByTestId('import-dialog').waitFor() }
const listView = async (page) => { await page.getByRole('radio', { name: 'List view' }).click().catch(async () => { await page.getByRole('button', { name: 'List view' }).click() }); await page.waitForTimeout(500) }
const names = async (page) => (await page.getByTestId('library-row').evaluateAll((rows) => rows.map((r) => r.querySelector('[data-col="name"] button')?.textContent?.trim() ?? '')))

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  // REG-797 (UX audit S8): My Items opens as the list for a member who never picked a view; this round was written on the grid, so the
  // member's first pick is the grid (their own toggles still stick)
  await ctx.addInitScript(() => { try { if (localStorage.getItem('om.price-book-items.list') === null) localStorage.setItem('om.price-book-items.list', '0') } catch {} })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-pb4/${n}.png` })

  await step('a supplier’s CSV: Kind mapped, each row matched by name and vendor, repeats and new trades said', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await openImport(page)
    ok('the limit is said before anything is read', /up to 500 rows/.test(await page.getByRole('dialog').innerText()))   // (the calm UI build 2026-10-27, a deliberate change) W-470: “Excel or CSV, up to 500 rows.”
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(XLS); await snack(page, 'Save the sheet as XLSX or CSV first')
    ok('an old .xls is refused with the way out', true)
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(CSV)
    const map = page.getByRole('dialog', { name: 'Import into My Items' }); await map.waitFor(); await page.waitForTimeout(500)
    ok('it says where the rows came from', /from “supplier-list\.csv”/.test(await map.innerText()))
    // exact: REG-796 (UX audit S7) added the mapping's "Rows with no Kind" select
    ok('Kind is a mapping', (await map.getByRole('combobox', { name: 'Kind', exact: true }).innerText()).includes('Kind') || (await map.getByRole('combobox', { name: 'Kind', exact: true }).inputValue().catch(() => '')) === 'Kind')
    const notes = await page.getByTestId('import-notes').innerText()
    ok('the preview says what matches, what repeats, which trade is new', /2 rows match items already in My Items/.test(notes) && /1 row repeats an item earlier in the file/.test(notes) && /New trade for Settings › Quotes & pricing: Glass works/.test(notes), notes.replace(/\n/g, ' / '))
    const states = await page.getByTestId('import-row').evaluateAll((rows) => rows.map((r) => r.firstElementChild?.textContent ?? ''))   // (sweep S5 #8) In My Items leads the row
    ok('each row reads its state', states[0] === 'Updates its price' && states[1] === 'New' && states[2] === 'Repeats — skipped' && states[3] === 'Updates its price', states.join(' | '))
    await shot('01-import-preview')
    await page.getByTestId('import-match').getByText('Skip', { exact: true }).click(); await page.waitForTimeout(200)
    ok('Skip: only the new row imports', await map.getByRole('button', { name: 'Import 1 row' }).count() === 1)
    await page.getByTestId('import-match').getByText('Update the price', { exact: true }).click(); await page.waitForTimeout(200)
    await map.getByRole('button', { name: 'Import 3 rows' }).click(); await snack(page, '1 item added · 2 updated · 1 skipped'); await page.waitForTimeout(600)
    ok('Painting takes the new price, History says Imported', sql(`select cost_minor from price_book_items where id='${PAINT}'`) === '160000' && sql(`select note from price_book_changes where item_id='${PAINT}' and kind='edited' order by at desc limit 1`) === 'Imported')
    ok('the glass shelf came in once, as a Purchase from Glassco', sql(`select count(*) || '|' || max(kind) || '|' || max(vendor) from price_book_items where name='Tempered glass shelf'`) === '1|purchase|Glassco')
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('trades').waitFor(); await ready(page)
    ok('Glass works is among the trades', /Glass works/.test(await page.getByTestId('trades').innerText()))   // unset, the trades are what the quotes and My Items use (REG-651)
  })

  await step('Export sits in the page kebab: every item or what the list shows; Kind and Link come back', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('new-template').click(); await page.waitForTimeout(250)
    ok('no export in New ▾', await page.getByRole('menuitem', { name: /Export/ }).count() === 0)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const f = page.getByTestId('library-facets'); await f.waitFor()
    await f.getByRole('combobox', { name: 'Trade' }).click(); await page.getByRole('option', { name: 'Tiling', exact: true }).click(); await page.waitForTimeout(300)   // (the calm UI build 2026-10-27, a deliberate change) the filter is Trade
    await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Export My Items…' }).click()
    const dlg = page.getByRole('dialog', { name: 'Export My Items' }); await dlg.waitFor()
    ok('the two sets, counted', /All items \(\d+\)/.test(await dlg.innerText()) && /What the list shows \(2\)/.test(await dlg.innerText()))
    await dlg.getByText('What the list shows (2)').click()
    await shot('02-export-scope')
    const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Export' }).click()])
    const text = fs.readFileSync(await dl.path(), 'utf8'); const lines = text.trim().split(/\r?\n/)
    ok('what the list shows: the two tile items, with Kind and Link columns', lines.length === 3 && /Kind/.test(lines[0]) && /Website link/.test(lines[0]) && lines.slice(1).every((l) => /Homogeneous tiles/.test(l) && /Purchase/.test(l)), lines[0])
    fs.writeFileSync(`${FILES}/export.csv`, text)
    await openImport(page)
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(`${FILES}/export.csv`)
    const map = page.getByRole('dialog', { name: 'Import into My Items' }); await map.waitFor(); await page.waitForTimeout(500)
    ok('the export comes back: both rows match, Kind and Link mapped by name', /2 rows match items already in My Items/.test(await page.getByTestId('import-notes').innerText()) && /Website link/.test(await map.innerText()))
    await map.getByRole('button', { name: 'Cancel' }).click()
  })

  await step('sortable heads sort; Category and Vendor filter', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    const head = page.getByRole('columnheader', { name: /Unit price/ })
    await head.getByRole('button').click(); await page.waitForTimeout(300)
    let n = await names(page)
    ok('Unit price ↑: the cheapest first', (await head.getAttribute('aria-sort')) === 'ascending' && n[0] === 'Cement screeding and waterproofing', n[0])
    await head.getByRole('button').click(); await page.waitForTimeout(300)
    n = await names(page)
    ok('Unit price ↓: the dearest first', (await head.getAttribute('aria-sort')) === 'descending' && n[0] === 'Design consultation and 3D drawings', n[0])
    await shot('03-sorted')
    await head.getByRole('button').click(); await page.waitForTimeout(300)
    ok('a third press leaves it unsorted', (await head.getAttribute('aria-sort')) === null)
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const f = page.getByTestId('library-facets'); await f.waitFor()
    await f.getByRole('combobox', { name: 'Vendor' }).click(); await page.getByRole('option', { name: 'Hafary', exact: true }).click(); await page.waitForTimeout(300)
    ok('Vendor: Hafary — one row, applied as picked', (await names(page)).length === 1 && await page.getByRole('button', { name: 'Filters (1 active)' }).count() === 1)
    await shot('04-filters')
    await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Clear all' }).click(); await page.waitForTimeout(300)
    await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
    ok('Clear all brings every item back', (await names(page)).length === Number(sql(`select count(*) from price_book_items where deleted_at is null`)))
  })

  await step('selection with Set category · Set vendor · Set markup · Delete', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    await page.getByRole('checkbox', { name: 'Select Cement screeding and waterproofing' }).click({ force: true })
    await page.getByRole('checkbox', { name: 'Select Hacking of existing floor and wall tiles' }).click({ force: true }); await page.waitForTimeout(300)
    const bar = page.getByText('Set markup', { exact: true })
    ok('the bulk bar rises with the four changes', await bar.count() === 1 && await page.getByText('Set trade', { exact: true }).count() === 1 && await page.getByText('Set vendor', { exact: true }).count() === 1)   // (the calm UI build 2026-10-27, a deliberate change) Trade
    await shot('05-bulk-bar')
    await bar.click()
    const d = page.getByRole('dialog', { name: 'Set markup' }); await d.waitFor()
    await d.getByLabel('Markup (% of cost)').fill('50'); await d.getByRole('button', { name: 'Apply to 2 items' }).click(); await snack(page, '2 items changed'); await page.waitForTimeout(500)
    ok('Set markup re-prices each: half its cost', sql(`select markup_minor from price_book_items where name='Cement screeding and waterproofing'`) === '140' && sql(`select markup_minor from price_book_items where name like 'Hacking%'`) === '160')
    ok('History keeps the bulk change', sql(`select count(*) from price_book_changes c join price_book_items i on i.id = c.item_id where i.name='Cement screeding and waterproofing' and c.kind='edited' and c.note='Bulk change'`) === '1')
    await page.getByRole('checkbox', { name: 'Select Cement screeding and waterproofing' }).click({ force: true })
    await page.getByText('Set vendor', { exact: true }).click()
    const v = page.getByRole('dialog', { name: 'Set vendor' }); await v.waitFor(); await v.getByLabel('Vendor', { exact: true }).fill('Probe Supplies'); await v.getByRole('button', { name: 'Apply to 1 item' }).click(); await snack(page, '1 item changed')
    ok('Set vendor', sql(`select vendor from price_book_items where name='Cement screeding and waterproofing'`) === 'Probe Supplies')
    await page.getByRole('checkbox', { name: 'Select Cement screeding and waterproofing' }).click({ force: true })
    await page.getByText('Set trade', { exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) Set trade
    const c = page.getByRole('dialog', { name: 'Set trade' }); await c.waitFor()   // (the calm UI build 2026-10-27, a deliberate change)
    await c.getByRole('combobox', { name: 'Trade' }).click(); await page.getByRole('option', { name: 'Tiling', exact: true }).click(); await c.getByRole('button', { name: 'Apply to 1 item' }).click(); await snack(page, '1 item changed')   // (the calm UI build 2026-10-27, a deliberate change) Trade
    /* (S46 closing regression, 2026-10-19) Set vendor's "1 item changed" can still be on screen when this one's is awaited, so the read waits
       for the save to land instead of trusting the snackbar alone */
    let cat = ''; for (let i = 0; i < 20 && cat !== 'Tiling'; i++) { cat = sql(`select category from price_book_items where name='Cement screeding and waterproofing'`); if (cat !== 'Tiling') await page.waitForTimeout(250) }
    ok('Set category', cat === 'Tiling')
    await page.waitForTimeout(800)
    const glass = page.getByRole('checkbox', { name: 'Select Tempered glass shelf' }); await glass.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(400)   // the stacked snackbars cover the row's box
    await page.locator('button:visible', { hasText: /^Delete$/ }).last().click()   // the bar's Delete (the row menus' are closed)
    await page.getByRole('dialog', { name: 'Delete 1 item?' }).getByRole('button', { name: 'Delete' }).click(); await snack(page, '1 item deleted'); await page.waitForTimeout(400)
    ok('Delete from the bar', sql(`select deleted_at is not null from price_book_items where name='Tempered glass shelf'`) === '1')
    await page.getByRole('button', { name: 'Undo', exact: true }).last().click(); await page.waitForTimeout(1200)
    ok('and its Undo', sql(`select deleted_at is null from price_book_items where name='Tempered glass shelf'`) === '1')
    as('sarah')
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    ok('a Designer’s list has no selection', await page.getByRole('checkbox', { name: /^Select / }).count() === 0)
  })

  await step('the small truths', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    ok('zero use, said one way', /Not on a quote yet/.test(await page.getByTestId('library-row').filter({ hasText: 'Tempered glass shelf' }).innerText()))
    ok('the tab names itself: My Items', /My Items/.test(await page.title()), await page.title())
    await page.getByRole('radio', { name: 'Grid view' }).click().catch(async () => { await page.getByRole('button', { name: 'Grid view' }).click() }); await page.waitForTimeout(400)
    ok('an Owner’s card says Edit, as its menu does', await page.getByRole('button', { name: 'Edit Painting, whole unit', exact: true }).count() === 1)
    await page.getByRole('button', { name: /^Company/ }).first().click(); await page.waitForTimeout(400)
    ok('the Price book wears My Items’ glyph (list_alt), not Brand Catalog’s', /list_alt/.test(await page.getByRole('menuitem', { name: /Price book/ }).textContent()))
    await page.keyboard.press('Escape')
  })

  await step('phone', async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await c.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/company/price-book`); await ready(p)
    await p.getByRole('button', { name: 'New', exact: true }).first().click(); await p.getByRole('menuitem', { name: 'Import from a spreadsheet…' }).click(); await p.getByTestId('import-dialog').waitFor(); await p.waitForTimeout(400)
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: the import fits', over <= 0, `${over}px`)
    await shot('06-phone-import', p)
    await c.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})()
