// UI sweep round S5 (REG-659) — the price book and the libraries: the kebab through the portal; the Proposed segment gone → All; All counts
// the facets; the Filters badge; the house empty state; a card's tick and a ticked row's fill; an Owner's edits kept by Approve; a refused
// save keeps the dialog; the bulk change asks and carries Undo; the import's Back keeps the file and its close closes; In My Items first;
// the section editor's names, Undo and words; Edit keeps the caret out; a read-only description keeps its shape; Export (0) waits; the
// Deleted sheet's idle rows, nested confirm and held head; New ▾ waits for a Designer; the Add Item box's walk and words; 768 in one row.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
// (REG-665) The demo files the libraries' entries into folders (repair R59); this round's checks were written for — and read — each
// library flat, so the test copy is unfiled and its folders put away first. Folders have their own probes (design-source/verify/folders/).
sql(`UPDATE quote_templates SET folder_id = NULL; UPDATE contract_templates SET folder_id = NULL; UPDATE task_templates SET folder_id = NULL; UPDATE quote_text_templates SET folder_id = NULL; UPDATE payment_templates SET folder_id = NULL; UPDATE price_book_items SET folder_id = NULL; UPDATE price_book_sections SET folder_id = NULL; UPDATE library_folders SET deleted_at = strftime('%s', 'now') WHERE deleted_at IS NULL`)
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { as('dane') } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const abortActions = (page) => page.route('**/*', (route) => { const r = route.request(); return r.method() === 'POST' && r.headers()['next-action'] ? route.abort() : route.continue() })
const FILES = `${S}/sw5-files`; fs.mkdirSync(FILES, { recursive: true })
const csv = `${FILES}/supplier.csv`; fs.writeFileSync(csv, 'Item,Unit,Cost,Vendor\nTempered glass panel,Pieces,120,Glassworks\nAluminium trim,Metres,8.5,Glassworks\n')
const Q1 = sql(`select id from quotes where number='OM-10001'`)

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-sw5/${n}.png` })
  const desk = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000); await page.addInitScript(() => { try { localStorage.setItem('om.price-book-items.list', '1') } catch {} }); return { ctx, page } }

  await step('list, menus and counts', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    const row = page.getByTestId('library-row').first(); await row.hover()
    await row.getByRole('button', { name: /^More options for/ }).click({ force: true }); await page.waitForTimeout(300)
    ok('the row menu opens through the portal', await page.getByRole('menu').first().evaluate((m) => !m.closest('[data-testid="library-table"]')))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    // #10 a ticked row keeps its fill
    await row.getByRole('checkbox').first().check({ force: true }); await page.mouse.move(5, 5); await page.waitForTimeout(300)
    const fill = await row.locator('[data-col="name"]').evaluate((e) => getComputedStyle(e).backgroundColor)
    ok('a ticked row keeps the primary-variant fill', fill !== 'rgb(255, 255, 255)' && fill !== 'rgba(0, 0, 0, 0)', fill)
    await page.getByRole('button', { name: /Clear|Deselect/ }).first().click().catch(() => {})
    // #15 · #5 a facet: the badge, All counts what is left
    await page.getByRole('button', { name: /^Filters/ }).click(); await page.waitForTimeout(300)
    await page.getByTestId('library-facets').getByRole('combobox').nth(1).click(); await page.waitForTimeout(200)
    await page.getByRole('option', { name: 'Hafary', exact: true }).click(); await page.waitForTimeout(200)
    await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(400)
    /* (REG-666) the segments became one pill: its menu's All counts what the filters leave */
    await page.getByRole('button', { name: /^Type: / }).click(); await page.waitForTimeout(250)   // (the calm UI build 2026-10-27, a deliberate change) W-536: the Price book's pill reads Type
    const all = await page.getByRole('menuitemradio', { name: /^All · / }).innerText()
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    const shown = await page.getByTestId('library-row').count()
    ok('All counts what the filters leave', new RegExp(`All · ${shown}$`).test(all.trim()), `${all.trim()} vs ${shown}`)
    ok('the Filters button wears its count', (await page.locator('[class*="filterBadge"]').innerText().catch(() => '')) === '1')
    // #16 a search with nothing: the house empty state
    await page.getByRole('button', { name: /^Search items/ }).click().catch(() => {}); await page.getByRole('searchbox').first().fill('zzqq none'); await page.waitForTimeout(400)
    ok('a search with nothing shows the house empty state', await page.getByTestId('search-empty').isVisible())
    // #26 Export (0) waits
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Export My Items…' }).click(); await page.waitForTimeout(400)
    ok('What the list shows (0) cannot be picked', await page.getByRole('radio', { name: /What the list shows \(0\)/ }).isDisabled())
    await shot(page, '01-export-zero')
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
    await page.getByTestId('search-empty').getByRole('button', { name: 'Clear All' }).click(); await page.waitForTimeout(300)
    ok('Clear All brings every item back', await page.getByTestId('library-row').count() === Number(sql(`select count(*) from price_book_items where deleted_at is null`)))
    await ctx.close()
  })

  await step('proposal, approve with edits, segment reset', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: '1 approval', exact: true }).click(); await page.waitForTimeout(300)   // (the calm UI build 2026-10-27, a deliberate change) T-01   // (REG-666) the Proposed to-do chip
    await page.getByTestId('library-row').first().getByRole('button', { name: /^Edit Skirting/ }).click(); await page.waitForTimeout(500)
    const dlg = page.getByTestId('item-dialog')
    const nameFocused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? '')
    ok('Edit keeps the caret out of the name', !/Item name/.test(nameFocused) && (await dlg.getByLabel('Item name').evaluate((e) => e !== document.activeElement)), nameFocused)
    await dlg.getByLabel('Cost (S$)').fill('4.20'); await page.waitForTimeout(200)
    await dlg.getByRole('button', { name: 'Approve' }).click(); await page.waitForTimeout(1500)
    ok('Approve keeps the Owner’s edit', sql(`select status || '|' || cost_minor from price_book_items where id='pb-proposal-skirting'`) === 'live|420')
    ok('the gone Proposed segment leaves the list on All', await page.getByTestId('library-row').count() === Number(sql(`select count(*) from price_book_items where deleted_at is null`)))
    await ctx.close()
  })

  await step('a refused save keeps the dialog', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: 'New', exact: true }).click(); await page.getByRole('menuitem', { name: 'New item' }).click(); await page.waitForTimeout(400)
    const dlg = page.getByTestId('item-dialog')
    await dlg.getByLabel('Item name').fill('Probe item'); await abortActions(page)
    await page.getByRole('button', { name: 'Add to My Items' }).click(); await page.waitForTimeout(1200)
    ok('a refused save says so and keeps the dialog', /Couldn’t add the item/.test(await snack(page)) && await dlg.isVisible() && (await dlg.getByLabel('Item name').inputValue()) === 'Probe item')
    await page.unroute('**/*'); await page.getByRole('button', { name: 'Cancel' }).click()
    await ctx.close()
  })

  await step('bulk edit', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('library-row').filter({ hasText: 'Painting' }).getByRole('checkbox').check({ force: true })
    await page.getByTestId('library-row').filter({ hasText: 'Electrical' }).getByRole('checkbox').check({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Set vendor' }).click(); await page.waitForTimeout(300)
    const apply = page.getByRole('dialog', { name: 'Set vendor' }).getByRole('button', { name: /^(Apply|Clear) / })
    ok('Set vendor waits for a choice', await apply.isDisabled())
    await page.getByRole('dialog', { name: 'Set vendor' }).getByText('Clear the vendor instead').click(); await page.waitForTimeout(150)
    ok('clearing is its own tick', !(await apply.isDisabled()) && /Clear on 2 items/.test(await apply.innerText()))
    await page.getByRole('dialog', { name: 'Set vendor' }).getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Set markup' }).click(); await page.waitForTimeout(300)
    await page.getByRole('dialog', { name: 'Set markup' }).getByRole('textbox').fill('1200'); await page.waitForTimeout(150)
    ok('a markup over 1,000% says so', await page.getByText('Up to 1,000% of the cost').isVisible())
    await page.getByRole('dialog', { name: 'Set markup' }).getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
    const before = sql(`select category from price_book_items where name like 'Painting%'`)
    await page.getByRole('button', { name: 'Set trade' }).click(); await page.waitForTimeout(300)   // (the calm UI build 2026-10-27, a deliberate change)
    const cat = page.getByRole('dialog', { name: 'Set trade' })   // (the calm UI build 2026-10-27, a deliberate change)
    ok('Set category starts unpicked', await cat.getByRole('button', { name: /^Apply/ }).isDisabled())
    await cat.getByRole('combobox').click(); await page.getByRole('option', { name: 'Carpentry', exact: true }).click(); await cat.getByRole('button', { name: /^Apply/ }).click(); await page.waitForTimeout(1500)
    ok('the change lands', sql(`select category from price_book_items where name like 'Painting%'`) === 'Carpentry')
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1800)
    ok('Undo puts each item’s category back', sql(`select category from price_book_items where name like 'Painting%'`) === before, before)
    await ctx.close()
  })

  await step('grid tick, import, section editor', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.addInitScript(() => { try { localStorage.setItem('om.price-book-items.list', '0') } catch {} })
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('library-card').first().getByRole('checkbox').check({ force: true }); await page.waitForTimeout(300)
    ok('a card takes a tick and the bulk bar follows', await page.getByTestId('library-card').first().getAttribute('data-selected') !== null && await page.getByRole('button', { name: 'Set trade' }).count() === 1)   // (the calm UI build 2026-10-27, a deliberate change)
    await shot(page, '02-card-tick')
    await page.getByRole('button', { name: 'New', exact: true }).click(); await page.getByRole('menuitem', { name: /Import from a spreadsheet/ }).click(); await page.waitForTimeout(400)
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(csv); await page.waitForTimeout(1200)
    const map = page.getByRole('dialog', { name: 'Import into My Items' })
    const heads = await map.getByRole('columnheader').allInnerTexts()
    ok('In My Items leads the mapping', /In My Items/.test(heads[0] ?? ''), (heads[0] ?? '').slice(0, 30))
    await shot(page, '03-import-mapping')
    await map.getByRole('button', { name: 'Back' }).click(); await page.waitForTimeout(400)
    // REG-835 (Dane UAT 3.11): the file row counts items, not the header line — "supplier.csv · 2 items"
    const fileRow = await page.getByTestId('import-file').innerText()
    ok('Back keeps the file', /supplier\.csv · 2 items/.test(fileRow), fileRow)
    await page.getByRole('dialog', { name: 'Import from a spreadsheet' }).getByRole('button', { name: 'Next' }).click(); await page.waitForTimeout(400)
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    ok('Esc on the mapping closes the import', await page.getByRole('dialog', { name: /Import/ }).count() === 0)
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page)
    // (the calm UI build 2026-10-27, a deliberate change) 4-37: Sections opens as the list, like Items — the first row's name opens its editor (the card did)
    await page.getByTestId('library-row').first().getByRole('button', { name: /^(Open|Edit) / }).first().click(); await page.waitForTimeout(500)
    const sd = page.getByTestId('section-dialog')
    ok('the editor counts in items', /^Items$/.test((await sd.locator('[class*="eyebrow"]').nth(1).innerText()).trim()) || await sd.getByText('Items', { exact: true }).count() >= 1)
    const firstLine = sd.getByTestId('section-line').first()
    const nm = await firstLine.getByRole('textbox').first().inputValue()
    await firstLine.getByRole('button', { name: /^Remove / }).click(); await page.waitForTimeout(300)
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(300)
    ok('a removed item comes back with Undo', (await sd.getByTestId('section-line').first().getByRole('textbox').first().inputValue()) === nm, nm)
    await sd.getByTestId('section-line').first().getByRole('textbox').first().fill(''); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(400)
    ok('a priced item with no name asks for one', await sd.getByText('Name the item or remove it').isVisible())
    await shot(page, '04-section-editor')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await ctx.close()
  })

  await step('designer: read-only shape, New waits, deleted rows', async () => {
    sql(`update price_book_items set description_html='<p>Supply and lay, <b>600×600</b>:</p><ul><li>levelling</li><li>grouting</li></ul>' where id='pb-tiles-hafary'`)
    sql(`update price_book_items set deleted_at = strftime('%s','now') where id in ('pb-tiles-sbh')`)
    as('sarah')
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('library-row').filter({ hasText: 'Hafary' }).getByRole('button', { name: /^Open Homogeneous/ }).click(); await page.waitForTimeout(500)
    ok('read-only, the description keeps its shape', await page.getByTestId('item-dialog').locator('[class*="richRead"] ul li').count() === 2)
    await page.getByRole('button', { name: 'Close' }).last().click(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /Deleted items/i }).click(); await page.waitForTimeout(500)   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    ok('a Designer cannot tick what they cannot act on', await page.getByTestId('deleted-library-row').first().getByRole('checkbox').isDisabled())
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page)
    ok('New ▾ waits for a Designer on My Sections', await page.getByTestId('new-template').isDisabled())
    await ctx.close()
  })

  await step('owner: deleted sheet', async () => {
    const { ctx, page } = await desk()
    sql(`update price_book_items set deleted_at = strftime('%s','now') where deleted_at is null and name not like 'Homogeneous%'`)
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /Deleted items/i }).click(); await page.waitForTimeout(500)   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const card = page.getByRole('dialog', { name: 'Deleted Items' }).getByRole('table')
    await card.evaluate((c) => { c.scrollTop = 200 }); await page.waitForTimeout(200)
    const headTop = await card.evaluate((c) => c.querySelector('[role="row"]').getBoundingClientRect().top - c.getBoundingClientRect().top)
    ok('the Deleted sheet’s head holds while its rows scroll', Math.abs(headTop) <= 2, `${Math.round(headTop)}px`)
    await page.getByTestId('deleted-library-row').filter({ hasText: 'Not on a quote yet' }).first().getByRole('button', { name: 'Delete Forever' }).click(); await page.waitForTimeout(400)
    const scrim = await page.evaluate(() => { const els = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).backgroundColor.startsWith('rgba(0, 0, 0')); return els.map((e) => getComputedStyle(e).backgroundColor) })
    ok('the confirm over the sheet is the nested scrim', scrim.some((b) => /0\.2\)/.test(b)), scrim.join(' | '))
    await shot(page, '05-deleted-confirm')
    await ctx.close()
  })

  await step('add item box', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    const top = sql(`select name from quote_items where quote_id='${Q1}' and parent_id is null and kind='item' order by position limit 1`)
    const row = page.locator(`[data-item-id="${sql(`select id from quote_items where quote_id='${Q1}' and name='${top.replace(/'/g, "''")}' and parent_id is null`)}"]`).first()
    await row.scrollIntoViewIfNeeded(); await row.hover(); await row.getByRole('button', { name: `More options for ${top}` }).click()
    // REG-773 (UX audit Q7) · (S44I, B6 — a deliberate change of this rule) the row's "From Price book…" opens the Price book modal with the row's place
    await page.getByRole('menuitem', { name: 'More', exact: true }).click(); await page.getByRole('menuitem', { name: /^Add item/i }).click(); await page.getByRole('menuitem', { name: /^Add from Price book/ }).click(); await page.waitForTimeout(600)   /* (the calm UI build 2026-10-27, a deliberate change) 4-07: Add item › sits under More › */   // (Dane's Items-sections round, REG-2534 — a deliberate change of this rule) the row reads "Add from Price book…"
    ok('the place says an item lands below', (await page.getByRole('radio', { name: 'Below' }).getAttribute('aria-checked')) === 'true' && /goes in below/.test(await page.getByRole('dialog', { name: 'Price book' }).innerText()))
    ok('the place offers Above beside it', await page.getByRole('radio', { name: 'Above' }).count() === 1)
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    ok('Escape lets the place go (the modal closes)', await page.getByTestId('price-book-dialog').count() === 0)
    await shot(page, '06-add-item-walk')
    await page.keyboard.press('Escape')
    await ctx.close()
  })

  await step('768', async () => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    const y = await page.evaluate(() => { const seg = [...document.querySelectorAll('button[aria-haspopup="menu"]')].find((b) => /^Type: /.test(b.getAttribute('aria-label') ?? b.textContent ?? '')); /* (REG-666) the Kind pill */ const nw = document.querySelector('[data-testid="new-template"]'); return seg && nw ? Math.abs(seg.getBoundingClientRect().top - nw.getBoundingClientRect().top) : 99 })   // (the calm UI build 2026-10-27, a deliberate change) the pill reads Type
    ok('768: the gallery toolbar is one row', y <= 8, `${Math.round(y)}px apart`)
    await shot(page, '07-toolbar-768')
    await ctx.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} passed`)
})()
