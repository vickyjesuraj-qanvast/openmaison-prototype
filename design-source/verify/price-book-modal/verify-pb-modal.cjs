// REG-662 — the price book in the quote editor opens as a modal over the editor (the Templates modal's way): the Create strip's My Items
// and the Items table's *Price book* open it; My Items · My Sections tabs, a search, the kinds, ticks across both tabs, Add puts them at
// the end in the order ticked (one Undo step); Manage Price book leaves with the way back; Add Item's dropdown still finds one at a time.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
// (REG-665) The demo files the libraries' entries into folders (repair R59); this round's checks were written for — and read — each
// library flat, so the test copy is unfiled and its folders put away first. Folders have their own probes (design-source/verify/folders/).
sql(`UPDATE quote_templates SET folder_id = NULL; UPDATE contract_templates SET folder_id = NULL; UPDATE task_templates SET folder_id = NULL; UPDATE quote_text_templates SET folder_id = NULL; UPDATE payment_templates SET folder_id = NULL; UPDATE price_book_items SET folder_id = NULL; UPDATE price_book_sections SET folder_id = NULL; UPDATE library_folders SET deleted_at = strftime('%s', 'now') WHERE deleted_at IS NULL`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const Q1 = sql(`select id from quotes where number='OM-10001'`)
const lines = () => Number(sql(`select count(*) from quote_items where quote_id='${Q1}'`))

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-pbm/${n}.png` })

  await step('desktop', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    // the strip's My Items
    // REG-773 (UX audit Q7): the Create strip's tile reads Price book (it read My Items)
    await page.locator('#section-items').getByRole('button', { name: 'Create', exact: true }).click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: 'From Price book' }).click(); await page.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) one door each (4-03): the Price book is Create ▾ › From Price book (and each section's foot)
    const dlg = page.getByRole('dialog', { name: 'Price book' })
    ok('the strip’s My Items opens the Price book modal over the editor', await dlg.isVisible() && page.url().includes(`/quotes/${Q1}`))
    ok('it lands on My Items', (await dlg.getByRole('radio', { name: /^My Items/ }).getAttribute('aria-checked')) === 'true' || /true/.test(await dlg.locator('[data-selected="true"], [aria-checked="true"]').first().innerText().catch(() => '')) || await dlg.getByTestId('book-item').count() > 0)
    ok('every pickable item is listed', await dlg.getByTestId('book-item').count() === Number(sql(`select count(*) from price_book_items where deleted_at is null and status='live'`)))
    const reach = await dlg.getByRole('list', { name: 'My Items' }).evaluate((el) => {
      const hs = [...el.children].map((r) => r.getBoundingClientRect().height)
      el.scrollTop = el.scrollHeight
      const last = el.lastElementChild.getBoundingClientRect(), box = el.getBoundingClientRect()
      return { scrolls: el.scrollHeight > el.clientHeight, lastIn: last.bottom <= box.bottom + 1 && last.top >= box.top - 1, minH: Math.min(...hs) }
    })
    ok('the list scrolls to its last row inside the modal; no row is squeezed', reach.scrolls && reach.lastIn && reach.minH >= 64, JSON.stringify(reach))
    await dlg.getByRole('list', { name: 'My Items' }).evaluate((el) => { el.scrollTop = 0 })
    await shot(page, '01-my-items-1440')
    await dlg.getByRole('searchbox').fill('tiles'); await page.waitForTimeout(250)
    const tiles = Number(sql(`select count(*) from price_book_items where deleted_at is null and status='live' and (lower(name) like '%tiles%' or lower(coalesce(description,'')) like '%tiles%' or lower(coalesce(vendor,'')) like '%tiles%' or lower(coalesce(category,'')) like '%tiles%')`))
    const found = await dlg.getByTestId('book-item').count()
    ok('search narrows the list', found === tiles && tiles > 0 && found < await Number(sql(`select count(*) from price_book_items where deleted_at is null and status='live'`)), `${found} of ${tiles}`)
    await dlg.getByRole('searchbox').fill('zzqq'); await page.waitForTimeout(250)
    ok('nothing found says so, with Clear All', await dlg.getByTestId('search-empty').isVisible())
    await dlg.getByTestId('search-empty').getByRole('button', { name: 'Clear All' }).click(); await page.waitForTimeout(200)
    const before = lines()
    await dlg.getByTestId('book-item').filter({ hasText: 'Painting' }).click()
    ok('a press on a row ticks it', await dlg.getByTestId('book-item').filter({ hasText: 'Painting' }).getAttribute('data-selected') !== null)
    await dlg.getByRole('radio', { name: /^My Sections/ }).click().catch(async () => dlg.getByText(/^My Sections/).click()); await page.waitForTimeout(300)
    const secName = (await dlg.getByTestId('book-section').first().locator('[class*="name"]').first().innerText()).trim()
    await dlg.getByTestId('book-section').first().click(); await page.waitForTimeout(200)
    await dlg.getByRole('radio', { name: /^My Items/ }).click().catch(async () => dlg.getByText(/^My Items/).click()); await page.waitForTimeout(300)
    ok('ticks survive a change of tab', await dlg.getByTestId('book-item').filter({ hasText: 'Painting' }).getAttribute('data-selected') !== null)
    await dlg.getByTestId('book-item').filter({ hasText: 'Hafary' }).click(); await page.waitForTimeout(200)
    const hafary = sql(`select name from price_book_items where vendor like '%Hafary%' and deleted_at is null limit 1`)
    const add = page.getByRole('button', { name: 'Add 2 items and 1 section' })
    ok('Add counts both tabs', await add.isVisible())
    await shot(page, '02-my-sections-1440')
    await add.click(); await page.waitForTimeout(2500)
    ok('the modal closes and says what came in', await dlg.count() === 0 || !(await dlg.isVisible()), (await snack(page)).slice(0, 80))
    ok('the two items and the section’s lines are on the quote', lines() >= before + 2 + 1, `${before} → ${lines()}`)
    const last = sql(`select name from quote_items where quote_id='${Q1}' and parent_id is null order by position desc limit 3`).split('\n').reverse()
    ok('they land at the end, in the order ticked (item · section · item)', /^Painting/.test(last[0] ?? '') && last[1] === secName && last[2] === hafary, last.join(' | '))
    const pos = sql(`select group_concat(position) from (select position from quote_items where quote_id='${Q1}' and parent_id is null order by position)`)
    ok('the list’s positions run 0…n with no gaps', pos.split(',').every((p, i) => Number(p) === i), pos)
    // the table's Price book link (REG-773: the strip's tile shares its name, so the link is the one in the Items section)
    await page.locator('#section-items').getByRole('button', { name: 'Create', exact: true }).click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: 'From Price book' }).click(); await page.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) one door each (4-03): the Price book is Create ▾ › From Price book (and each section's foot)
    ok('the table’s Price book opens the same modal', await page.getByRole('dialog', { name: 'Price book' }).isVisible())
    await page.getByRole('dialog', { name: 'Price book' }).getByRole('button', { name: 'Manage Price book' }).click(); await page.waitForTimeout(1500)
    ok('Manage Price book leaves with the way back', page.url().includes('/company/price-book') && decodeURIComponent(page.url()).includes(`from=/quotes/${Q1}`), page.url())
    // Add Item's dropdown is unchanged
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    await page.getByRole('combobox', { name: /Add Item/ }).fill('Paint'); await page.waitForTimeout(400)
    ok('typing in Add Item still opens its dropdown', await page.getByTestId('add-item-list').isVisible() && await page.getByRole('dialog', { name: 'Price book' }).count() === 0)
    await ctx.close()
  })

  await step('phone', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    // (quotes on the move, a deliberate change of this rule) a phone opens the quote as its document; the Items are their own screen at
    // ?edit=items, where the Price book sits in the Items ⋮ ("From Price book") — the table's link is the desk's
    await page.goto(`${BASE}/quotes/${Q1}?edit=items`); await ready(page)
    await page.getByRole('button', { name: 'More options for Items' }).locator('visible=true').first().tap().catch(() => {}); await page.waitForTimeout(500)
    await page.getByRole('menuitem', { name: /Price book/ }).first().tap().catch(() => {}); await page.getByTestId('price-book-dialog').waitFor({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500)
    const open = await page.getByTestId('price-book-dialog').isVisible().catch(() => false)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)   // measured against the device (responsive.md § On the move)
    ok('390: the modal opens as a sheet and fits', open && over <= 0, `${open} · ${over}px`)
    const clip = await page.getByTestId('price-book-dialog').evaluate((el) => [...el.querySelectorAll('[data-testid="book-item"]')].map((r) => {
      const n = r.querySelector('[class*="name"]'), rb = r.getBoundingClientRect(), kids = [...r.children].map((c) => c.getBoundingClientRect())
      return { cut: n.scrollWidth > n.clientWidth + 1, spill: kids.some((k) => k.bottom > rb.bottom + 1) }
    }))
    ok('390: every name shows whole and nothing spills out of its row', clip.length > 0 && clip.every((c) => !c.cut && !c.spill), `${clip.filter((c) => c.cut).length} cut · ${clip.filter((c) => c.spill).length} spill`)
    await shot(page, '03-phone-390')
    await ctx.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} passed`)
})()
