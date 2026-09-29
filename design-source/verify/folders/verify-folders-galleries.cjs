// REG-664 — folders in every library (the five template tabs, My Items, My Sections) on the shared gallery; Quotes moved onto it.
// New Folder · Move to Folder (menu and bulk) · folders inside folders with the crumb · browse vs find (search / segments reach every
// folder, each hit says where it lives) · delete moves the contents up, with Undo · the list view · a Designer's view · each library
// keeps its own folders · the phone.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case when id='dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const folderId = (lib, name) => sql(`select id from library_folders where library='${lib}' and name='${name}' and deleted_at is null limit 1`)
const tplFolder = (name) => sql(`select coalesce(folder_id,'') from quote_templates where name='${name}' and deleted_at is null`)
const card = (page, name) => page.getByTestId('library-card').filter({ has: page.getByRole('button', { name: new RegExp(`^(Edit|Open) ${name}$`) }) }).first()

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-folders/${n}.png` })

  await step('quotes', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/company/templates/quotes`); await ready(page)
    const atTop = Number(sql(`select count(*) from quote_templates where deleted_at is null and folder_id is null`))
    const seeded = sql(`select group_concat(name, '|') from (select name from library_folders where library='quotes' and parent_id is null and deleted_at is null order by name)`).split('|')
    ok('the Quotes gallery (on the shared gallery) opens on its folders, then what sits at the top', await page.getByRole('list', { name: 'Quote templates' }).isVisible() && await page.getByTestId('library-card').count() === atTop
      && (await page.getByTestId('folder-card').locator('[class*="folderName"]').allInnerTexts()).join('|') === seeded.join('|'), `${atTop} at the top · ${seeded.join(', ')}`)
    ok('the demo folders each hold something', (await page.getByTestId('folder-card').allInnerTexts()).every((t) => /[1-9]\d* template/.test(t)))
    // (REG-666) the status is one pill, its counts add up to All; the to-do shows as a chip while something waits
    ok('the status is one pill, “Status: All”, and the to-do shows as a chip', await page.getByRole('button', { name: /^Status: All/ }).isVisible() && await page.getByRole('button', { name: /1 awaiting approval/ }).isVisible())
    await page.getByRole('button', { name: /^Status: All/ }).click(); await page.waitForTimeout(300)
    const menu = (await page.getByRole('menuitemradio').allInnerTexts()).map((t) => t.trim())
    const n = (label) => Number((menu.find((m) => m.startsWith(label)) ?? '').split('·').pop())
    ok('each template counts once — the choices add up to All', n('All') === 4 && n('Awaiting approval') + n('Published') + n('Drafts') === 4, menu.join(' | '))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await shot(page, 'gal-00-quotes-seeded-1440')
    // New Folder
    await page.getByRole('button', { name: 'New Folder', exact: true }).click(); await page.waitForTimeout(300)
    const dlg = page.getByRole('dialog', { name: 'Create Folder' })
    await dlg.getByRole('textbox').fill('hdb'); await dlg.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(300)
    ok('a sibling’s name is refused, case aside', await dlg.getByText('A folder here already has this name').isVisible())
    await dlg.getByRole('textbox').fill('Condo'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
    const CONDO = folderId('quotes', 'Condo')
    ok('New Folder makes one in this library', !!CONDO, (await snack(page)).slice(0, 30))
    // Move to Folder from the menu
    await card(page, 'Default Quote PDF').getByRole('button', { name: /^More options for/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Move to Folder' }).click(); await page.waitForTimeout(400)
    const mv = page.getByRole('dialog').filter({ hasText: 'Current location' })
    ok('Move to Folder opens the Move dialog, the top named Quotes', /Current location:.*Quotes/.test((await mv.innerText()).replace(/\n/g, ' ')))
    await mv.getByRole('listitem').filter({ hasText: 'Condo' }).hover(); await mv.getByRole('listitem').filter({ hasText: 'Condo' }).getByRole('button', { name: 'Move' }).click(); await page.waitForTimeout(1200)
    ok('it moves, and says where', tplFolder('Default Quote PDF') === CONDO && /Moved to Condo/.test(await snack(page)))
    // inside HDB: a folder inside the folder, and a bulk move into it
    const HDB = folderId('quotes', 'HDB')
    await page.getByRole('button', { name: 'Open HDB' }).click(); await ready(page)
    ok('a folder opens in the URL, showing what it holds', page.url().includes(`folder=${HDB}`) && await page.getByTestId('library-card').count() === 2)
    await page.getByRole('button', { name: 'New Folder', exact: true }).click(); await page.getByRole('dialog', { name: 'Create Folder' }).getByRole('textbox').fill('BTO'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
    const BTO = folderId('quotes', 'BTO')
    ok('New Folder inside a folder nests it', !!BTO && sql(`select parent_id from library_folders where id='${BTO}'`) === HDB)
    await card(page, '4-Room BTO').getByRole('checkbox').check({ force: true }); await card(page, '5-Room BTO').getByRole('checkbox').check({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Move to Folder' }).click(); await page.waitForTimeout(400)
    const mv2 = page.getByRole('dialog').filter({ hasText: 'Move 2 items' })
    await mv2.getByRole('listitem').filter({ hasText: 'HDB' }).click(); await page.waitForTimeout(200)
    await mv2.getByRole('listitem').filter({ hasText: 'BTO' }).click(); await page.waitForTimeout(200)
    await mv2.getByRole('button', { name: 'Move', exact: true }).last().click(); await page.waitForTimeout(1300)
    ok('many at once from the bulk bar', tplFolder('4-Room BTO') === BTO && tplFolder('5-Room BTO') === BTO)
    ok('HDB now holds its folder', await page.getByTestId('library-card').count() === 0 && /2 templates/.test(await page.getByTestId('folder-card').filter({ hasText: 'BTO' }).innerText()))
    await page.getByRole('button', { name: 'Open BTO' }).click(); await ready(page)
    const crumbs = (await page.getByTestId('folder-crumbs').innerText()).replace(/\n/g, ' ')
    ok('the crumb spells the way', /Quotes\s*\/\s*HDB\s*\/\s*BTO/.test(crumbs), crumbs)
    await shot(page, 'gal-02-nested-1440')
    await page.getByRole('button', { name: 'Back to HDB' }).click(); await ready(page)
    ok('Back goes up one level', page.url().includes(`folder=${HDB}`))
    // find where you are: from the top, a search looks in every folder and says where
    await page.getByTestId('folder-crumbs').getByRole('button', { name: 'Quotes', exact: true }).click(); await ready(page)
    const sb = page.getByRole('searchbox', { name: 'Search templates' })
    if (!(await sb.isVisible().catch(() => false))) await page.getByRole('button', { name: /Search templates/ }).click()
    await page.getByRole('searchbox', { name: 'Search templates' }).fill('BTO'); await page.waitForTimeout(400)
    const hits = await page.getByTestId('library-card').evaluateAll((cs) => cs.map((c) => `${c.querySelector('[class*="nameRow"]')?.textContent ?? ''} ${c.querySelector('[class*="__meta"]')?.textContent ?? ''}`.replace(/\n/g, ' ')))
    ok('at the top, a search reaches every folder and says where each hit lives', hits.length === 2 && hits.every((h) => /HDB \/ BTO/.test(h)) && await page.getByTestId('folder-card').count() === 0, hits.map((h) => h.slice(0, 50)).join(' | '))
    await shot(page, 'gal-03-find-1440')
    await page.getByRole('searchbox', { name: 'Search templates' }).fill(''); await page.waitForTimeout(300)
    // the to-do chip narrows to what waits — here, at the top
    await page.getByRole('button', { name: /1 awaiting approval/ }).click(); await page.waitForTimeout(300)
    ok('the to-do chip narrows to what waits, saying where it lives', await page.getByTestId('library-card').count() === 1 && /Show flats/.test(await page.getByTestId('library-card').first().innerText()) && await page.getByRole('button', { name: /^Status: Awaiting approval/ }).isVisible())
    await page.getByRole('button', { name: /1 awaiting approval/ }).click(); await page.waitForTimeout(300)
    // inside a folder, the pill and the search stay inside it; the crumb stays; its counts are the folder's
    await page.getByRole('button', { name: 'Open HDB' }).click(); await ready(page)
    ok('inside HDB nothing waits, so no to-do chip; the crumb holds the bar’s left', await page.getByRole('button', { name: /^(approval )?\d+ awaiting approval$/ }).count() === 0 && await page.getByTestId('folder-crumbs').isVisible())   // (the rail's Company badge also says "awaiting approval")
    await page.getByRole('button', { name: /^Status: All/ }).click(); await page.waitForTimeout(300)
    const inHdb = (await page.getByRole('menuitemradio').allInnerTexts()).map((t) => t.trim())
    ok('the pill counts what is in HDB', /^All · 2$/.test(inHdb[0] ?? ''), inHdb.join(' | '))
    await page.getByRole('menuitemradio', { name: /^Published/ }).click(); await page.waitForTimeout(300)
    ok('a status inside a folder keeps you there: the crumb stays, the hits are HDB’s (with where inside)', await page.getByTestId('folder-crumbs').isVisible() && page.url().includes('folder=')
      && (await page.getByTestId('library-card').evaluateAll((cs) => cs.map((c) => c.querySelector('[class*="__meta"]')?.textContent ?? ''))).every((m) => /BTO/.test(m)) && await page.getByTestId('library-card').count() === 2)
    await shot(page, 'gal-07-status-in-folder-1440')
    await page.getByRole('button', { name: /^Status: Published/ }).click(); await page.getByRole('menuitemradio', { name: /^All/ }).click(); await page.waitForTimeout(300)
    // a search inside a folder that finds nothing offers the whole library
    await page.getByTestId('folder-crumbs').getByRole('button', { name: 'Quotes', exact: true }).click(); await ready(page)
    await page.getByRole('button', { name: 'Open Show flats' }).click(); await ready(page)
    const sb2 = page.getByRole('searchbox', { name: 'Search templates' })
    if (!(await sb2.isVisible().catch(() => false))) await page.getByRole('button', { name: /Search templates/ }).click()
    ok('the search names the folder it looks in', (await page.getByRole('searchbox', { name: 'Search templates' }).getAttribute('placeholder')) === 'Search Show flats')
    await page.getByRole('searchbox', { name: 'Search templates' }).fill('BTO'); await page.waitForTimeout(400)
    ok('nothing in Show flats: “Search all of Quotes” is offered', await page.getByTestId('search-empty').getByRole('button', { name: 'Search all of Quotes' }).isVisible())
    await page.getByTestId('search-empty').getByRole('button', { name: 'Search all of Quotes' }).click(); await ready(page)
    ok('…and finds them in the whole library, the search kept', !page.url().includes('folder=') && await page.getByTestId('library-card').count() === 2)
    await page.getByRole('searchbox', { name: 'Search templates' }).fill(''); await page.waitForTimeout(300)
    // list view: folder rows first
    await page.getByRole('radio', { name: 'List view' }).click().catch(() => page.getByRole('button', { name: 'List view' }).click()); await page.waitForTimeout(500)
    const order = await page.locator('[data-testid="library-folder-row"], [data-testid="library-row"]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-testid')))
    ok('the list shows the folders, first', order.length >= 3 && order.every((o) => o === 'library-folder-row'), order.join(','))
    await shot(page, 'gal-04-list-1440')
    await page.getByRole('radio', { name: 'Grid view' }).click().catch(() => page.getByRole('button', { name: 'Grid view' }).click()); await page.waitForTimeout(400)
    // rename, then delete with Undo
    await page.getByTestId('folder-card').filter({ hasText: 'Condo' }).getByRole('button', { name: 'Actions for Condo' }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Rename' }).click(); await page.waitForTimeout(300)
    await page.getByRole('dialog', { name: 'Rename Folder' }).getByRole('textbox').fill('Condos'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
    ok('Rename Folder', !!folderId('quotes', 'Condos'))
    await page.getByTestId('folder-card').filter({ hasText: 'HDB' }).getByRole('button', { name: 'Actions for HDB' }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Delete' }).click(); await page.waitForTimeout(300)
    const confirm = await page.getByRole('dialog').filter({ hasText: 'HDB' }).last().innerText()
    ok('Delete says what happens to what it holds', /The 1 folder inside moves? up to Quotes\. Nothing in it is deleted/.test(confirm.replace(/\n/g, ' ')), confirm.replace(/\n/g, ' ').slice(0, 120))
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click(); await page.waitForTimeout(1300)
    ok('the folder goes; what it held moves up', !folderId('quotes', 'HDB') && sql(`select coalesce(parent_id,'') from library_folders where id='${BTO}'`) === '')
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1300)
    ok('Undo puts it all back', !!folderId('quotes', 'HDB') && sql(`select parent_id from library_folders where id='${BTO}'`) === HDB)
    // the Deleted sheet keeps Quotes' heads
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /^Deleted Templates/ }).click(); await page.waitForTimeout(600)
    const heads = await page.getByRole('columnheader').allInnerTexts()
    ok('Deleted Templates keeps Version · Deleted by · On quotes', ['Version', 'Deleted by', 'On quotes'].every((h) => heads.some((x) => x.toLowerCase().includes(h.toLowerCase()))), heads.join(','))
    await ctx.close()
  })

  await step('designer', async () => {
    sql(`update members set is_you = case when id='sarah' then 1 else 0 end`)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/company/templates/quotes`); await ready(page)
    ok('a Designer cannot make a folder', await page.getByRole('button', { name: 'New Folder', exact: true }).isDisabled())
    ok('nor select quote templates — there is nothing they may do with them', await page.getByTestId('library-card').first().getByRole('checkbox').count() === 0)
    await page.getByTestId('folder-card').first().getByRole('button', { name: /^Actions for/ }).click(); await page.waitForTimeout(300)
    const dis = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => `${e.textContent}:${e.getAttribute('aria-disabled')}`))
    ok('a Designer opens folders but may not move, rename or delete them', dis.some((d) => /^Open:(null|false)/.test(d)) && ['Move', 'Rename', 'Delete'].every((l) => dis.some((d) => d.startsWith(l) && d.endsWith(':true')))   /* (REG-728) a disabled row's reason prints in the row */, dis.join(' '))
    await ctx.close()
  })

  await step('each library', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    const libs = [['contracts', '/company/templates/contracts', 'Residential'], ['tasks', '/company/templates/tasks', 'Handover'], ['texts', '/company/templates/terms', 'Carpentry'], ['payments', '/company/templates/payments', 'Big jobs'], ['book-items', '/company/price-book', 'Doors and windows'], ['book-sections', '/company/price-book/sections', 'Kitchens']]
    for (const [lib, path, name] of libs) {
      await page.goto(`${BASE}${path}`); await ready(page)
      const mine = sql(`select group_concat(name, '|') from (select name from library_folders where library='${lib}' and parent_id is null and deleted_at is null order by name)`)
      const shown = (await page.getByTestId('folder-card').locator('[class*="folderName"]').allInnerTexts()).join('|')
      ok(`${lib}: its own folders, each holding something`, shown === mine && (await page.getByTestId('folder-card').allInnerTexts()).every((t) => /[1-9]\d* (template|item|section)/.test(t)), shown.replace(/\|/g, ', '))
      await page.getByRole('button', { name: 'New Folder', exact: true }).click(); await page.getByRole('dialog', { name: 'Create Folder' }).getByRole('textbox').fill(name); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
      await page.getByRole('button', { name: `Open ${mine.split('|')[0]}`, exact: true }).click(); await ready(page)   // a demo folder, which holds something
      const first = page.getByTestId('library-card').first()
      await first.getByRole('button', { name: /^More options for/ }).click(); await page.waitForTimeout(250)
      await page.getByRole('menuitem', { name: 'Move to Folder' }).click(); await page.waitForTimeout(400)
      const mv = page.getByRole('dialog').filter({ hasText: 'Current location' })
      await mv.getByRole('listitem').filter({ hasText: name }).hover(); await mv.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Move' }).click(); await page.waitForTimeout(1200)
      const filed = Number(sql(`select (select count(*) from contract_templates where folder_id=f.id)+(select count(*) from task_templates where folder_id=f.id)+(select count(*) from quote_text_templates where folder_id=f.id)+(select count(*) from payment_templates where folder_id=f.id)+(select count(*) from price_book_items where folder_id=f.id)+(select count(*) from price_book_sections where folder_id=f.id) from library_folders f where f.library='${lib}' and f.name='${name}'`))
      ok(`${lib}: New Folder and Move to Folder`, filed === 1, (await snack(page)).slice(0, 40))
    }
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await shot(page, 'gal-05-my-items-1440')
    await ctx.close()
  })

  await step('phone', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/company/templates/quotes`); await ready(page)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: folders and cards fit', over <= 0 && await page.getByTestId('folder-card').count() > 0, `${over}px`)
    await shot(page, 'gal-06-phone-390')
    await ctx.close()
  })

  await browser.close()
  console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
})()
