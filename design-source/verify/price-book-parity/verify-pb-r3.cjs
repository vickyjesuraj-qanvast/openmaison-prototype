// Price book parity round 3 (REG-653) — items and sections that carry everything: an item keeps a product link, a photo (shown, replaced,
// removed) and a formatted description, and a pick copies them; a line from My Items says so and offers "Update the item from this line"
// or "Save as a new item" (a Designer proposes), each with Undo; a saved section keeps hidden, optional, one-line, sub-total word,
// highlight and rebate, and its lines land at the studio's GST rate; New section writes on Save, adds sub-sections, shows units; an entry
// a live quote came from waits in the trash; a stale pick is refused; counts leave the trash out; the Add Item popover lists every item,
// finds by category and kind, walks into My Sections, and lands a pick where the row asked.
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
const waitSave = (page) => page.waitForTimeout(1600)
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const card = (page, name) => page.getByTestId('library-card').filter({ has: page.getByRole('button', { name: new RegExp(`^(Open|Edit) ${esc(name)}$`) }) }).first()   // (REG-653) the card's words are its menu's: Edit for an Owner or an Admin
const FILES = `${S}/pb3-files`; fs.mkdirSync(FILES, { recursive: true })
const PNG = `${FILES}/paint.png`; fs.writeFileSync(PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
const Q = sql(`select id from quotes where number='OM-10001'`)
const LEAD = sql(`select lead_id from quotes where id='${Q}'`)
const HAUL = sql(`select id from quote_items where quote_id='${Q}' and name='Haulage and debris disposal'`)
const BATHS = sql(`select id from quote_items where quote_id='${Q}' and kind='group' and name='Bathrooms'`)
const PAINT = sql(`select id from price_book_items where name='Painting, whole unit'`)
const ELEC = sql(`select id from price_book_items where name='Electrical point, new'`)
const row = (page, id) => page.locator(`[data-item-id="${id}"]`).first()
const rowMenu = async (page, id, name) => { const r = row(page, id); await r.scrollIntoViewIfNeeded(); await r.hover(); await r.getByRole('button', { name: `More options for ${name}`, exact: true }).click(); await page.waitForTimeout(250); return page.getByRole('menu').last() }
/* (the calm UI build 2026-10-27, a deliberate change) 4-07: a line's saves to the book sit under the row ⋮ › Price book › */
const bookMenu = async (page, id, name) => { const m = await rowMenu(page, id, name); await m.getByRole('menuitem', { name: 'Price book', exact: true }).click(); await page.waitForTimeout(250); return page.getByRole('menu').last() }
const addBox = async (page, text) => { const a = page.getByRole('combobox', { name: 'Add Item' }).first(); await a.scrollIntoViewIfNeeded(); await a.click(); await a.fill(text); await page.waitForTimeout(500); return a }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  // REG-797 (UX audit S8): My Items opens as the list for a member who never picked a view; this round was written on the grid, so the
  // member's first pick is the grid (their own toggles still stick)
  await ctx.addInitScript(() => { try { if (localStorage.getItem('om.price-book-items.list') === null) localStorage.setItem('om.price-book-items.list', '0') } catch {} })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-pb3/${n}.png` })

  await step('an item keeps a product link, a photo and a formatted description', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click()
    const dlg = page.getByTestId('item-dialog'); await dlg.waitFor(); await page.waitForTimeout(400)
    const body = dlg.getByRole('textbox', { name: 'Description' })
    await body.click(); await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.keyboard.type('Two coats of washable emulsion')
    await dlg.getByRole('button', { name: 'Bulleted list' }).click()
    await dlg.getByLabel('Website link').fill('nipponpaint.com.sg/products/weatherbond')   // (sweep S5 #29) one name for the link
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), dlg.getByRole('button', { name: 'Add a photo' }).click()])
    await chooser.setFiles(PNG); await page.waitForTimeout(600)
    ok('the photo shows in its well, with Remove photo', await dlg.getByTestId('item-photo').locator('img').count() === 1 && await dlg.getByRole('button', { name: 'Remove photo' }).count() === 1)
    await shot('01-item-link-photo')
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click(); await snack(page, 'Item saved'); await page.waitForTimeout(600)
    const r = sql(`select link || '|' || (description_html like '%<li>%') || '|' || substr(thumb, 1, 22) from price_book_items where id='${PAINT}'`)
    ok('stored: the link (https added), the list, the photo', r === 'https://nipponpaint.com.sg/products/weatherbond|1|data:image/png;base64,', r)
    ok('the card shows the photo', await card(page, 'Painting, whole unit').locator('img').count() === 1)
    await page.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click(); await page.waitForTimeout(900)
    const h = await page.getByTestId('history-row').first().innerText()
    ok('History says the link and the photo', /Link — → https:\/\/nipponpaint\.com\.sg\/products\/weatherbond/.test(h) && /Photo added/.test(h), h.replace(/\n/g, ' / '))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await shot('02-card-photo')
  })

  let fromBook = null
  await step('a pick copies them; the line says where it came from and updates the item or saves a new one, with Undo', async () => {
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    await addBox(page, 'Painting')
    await page.getByRole('option', { name: /Painting, whole unit/ }).first().click(); await page.waitForTimeout(1500)
    fromBook = sql(`select id from quote_items where quote_id='${Q}' and price_book_item_id='${PAINT}' order by created_at desc limit 1`)
    ok('the picked line has the link and the formatted description', sql(`select link || '|' || (description_html like '%<li>%') from quote_items where id='${fromBook}'`) === 'https://nipponpaint.com.sg/products/weatherbond|1')
    let menu = await bookMenu(page, fromBook, 'Painting, whole unit')
    ok('its menu says “From My Items · Painting, whole unit”', /From the Price book · Painting, whole unit/.test(await menu.getByTestId('line-source').innerText()) && await menu.getByRole('menuitem', { name: 'Update the item from this line' }).count() === 1 && await menu.getByRole('menuitem', { name: 'Save as a new item' }).count() === 1)
    await shot('03-line-source-menu')
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    const name = row(page, fromBook).locator('input[data-name]')
    await name.click(); await name.fill('Painting, whole unit — two coats'); await name.press('Enter'); await waitSave(page)
    menu = await bookMenu(page, fromBook, 'Painting, whole unit — two coats')
    await menu.getByRole('menuitem', { name: 'Update the item from this line' }).click(); await snack(page, 'updated in the Price book'); await page.waitForTimeout(500)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    ok('the item takes the line’s name, History says from where', sql(`select name from price_book_items where id='${PAINT}'`) === 'Painting, whole unit — two coats' && sql(`select note from price_book_changes where item_id='${PAINT}' and kind='edited' order by at desc limit 1`) === 'Updated from OM-10001')
    await page.getByRole('button', { name: 'Undo', exact: true }).last().click(); await snack(page, 'is back as it was'); await page.waitForTimeout(500)
    ok('Undo puts the item back', sql(`select name from price_book_items where id='${PAINT}'`) === 'Painting, whole unit')
    menu = await bookMenu(page, fromBook, 'Painting, whole unit — two coats')
    await menu.getByRole('menuitem', { name: 'Save as a new item' }).click(); await snack(page, 'Saved to the Price book as a new item'); await page.waitForTimeout(500)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const made = sql(`select id from price_book_items where name='Painting, whole unit — two coats'`)
    ok('a new item, named for what it is, and the line points at it', !!made && sql(`select price_book_item_id from quote_items where id='${fromBook}'`) === made)
    await page.getByRole('button', { name: 'Undo', exact: true }).last().click(); await snack(page, 'Taken back out of the Price book'); await page.waitForTimeout(500)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    ok('Undo takes it out again; the line points at Painting once more', sql(`select count(*) from price_book_items where name='Painting, whole unit — two coats'`) === '0' && sql(`select price_book_item_id from quote_items where id='${fromBook}'`) === PAINT)
    as('sarah')
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    menu = await bookMenu(page, fromBook, 'Painting, whole unit — two coats')
    ok('a Designer: Update is the Owners’ and Admins’, the save proposes', (await menu.getByRole('menuitem', { name: 'Update the item from this line' }).getAttribute('aria-disabled')) === 'true' && await menu.getByRole('menuitem', { name: 'Propose as a new item' }).count() === 1)
    await page.keyboard.press('Escape')
  })

  let saved = null
  await step('a saved section keeps what makes it safe, and lands at the studio’s GST rate', async () => {
    const kids = sql(`select id from quote_items where parent_id='${BATHS}' order by position`).split('\n')
    sql(`update quote_items set visibility='hidden' where id='${kids[0]}'`)
    sql(`update quote_items set optional=1, rebate_minor=5000 where id='${kids[1]}'`)
    sql(`update quote_items set print_one_line=1, print_as_text='Approximate', highlight='light' where id='${BATHS}'`)
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const menu = await rowMenu(page, BATHS, 'Bathrooms')
    await menu.getByRole('menuitem', { name: 'Save to Price book' }).click(); await snack(page, 'Section saved to the Price book')   // (the calm UI build 2026-10-27, a deliberate change) W-608; await page.waitForTimeout(400)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    saved = sql(`select id from price_book_sections where name='Bathrooms' order by created_at desc limit 1`)
    const j = (p) => sql(`select json_extract(lines_json, '${p}') from price_book_sections where id='${saved}'`)
    ok('kept: one line, its sub-total word, its highlight', j('$.printOneLine') === '1' && j('$.printAsText') === 'Approximate' && j('$.highlight') === 'light')
    ok('kept: a hidden line, an optional line with its rebate', j('$.lines[0].visibility') === 'hidden' && j('$.lines[1].optional') === '1' && j('$.lines[1].rebateMinor') === '5000')
    sql(`update settings set value = json_set(value, '$.gstPct', 8) where key='studio'`)
    await addBox(page, 'Bathrooms')
    await page.getByTestId('my-section').filter({ hasText: 'Bathrooms' }).filter({ hasNotText: 'full works' }).first().click(); await snack(page, 'Section added from the Price book'); await page.waitForTimeout(800)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const g = sql(`select id from quote_items where quote_id='${Q}' and kind='group' and price_book_item_id='${saved}' order by created_at desc limit 1`)
    ok('the section lands one-line, worded, highlighted', sql(`select print_one_line || '|' || print_as_text || '|' || highlight from quote_items where id='${g}'`) === '1|Approximate|light')
    const lines = sql(`select visibility || ':' || optional || ':' || rebate_minor || ':' || gst_pct from quote_items where parent_id='${g}' order by position`).split('\n')
    ok('its lines: hidden stays hidden, optional stays out, the rebate rides, GST 8 %', lines[0]?.startsWith('hidden:0:0:8') && lines[1]?.startsWith('visible:1:5000:8') && lines.every((l) => l.endsWith(':8.0') || l.endsWith(':8')), lines.join(' '))
    sql(`update settings set value = json_remove(value, '$.gstPct') where key='studio'`)
    await shot('04-section-landed')
  })

  await step('New section writes on Save, adds a sub-section, shows each line’s unit', async () => {
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page)
    const before = sql(`select count(*) from price_book_sections`)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: 'New section' }).click()
    await page.getByRole('dialog', { name: 'New section' }).waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(600)
    ok('Cancel leaves nothing behind', sql(`select count(*) from price_book_sections`) === before)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: 'New section' }).click()
    const sd = page.getByTestId('section-dialog'); await sd.waitFor()
    await sd.getByLabel('Section name').fill('Probe section')
    await sd.getByRole('textbox', { name: 'Section note' }).click(); await page.keyboard.type('Supply and install')
    await sd.getByRole('button', { name: 'Add an item' }).first().click()   // (sweep S5 #31)
    const line = sd.getByTestId('section-line').first()
    await line.getByLabel('Item', { exact: true }).fill('Probe line')
    await line.getByRole('combobox', { name: 'Unit' }).click(); await page.getByRole('option', { name: 'sqft', exact: true }).click()
    await sd.getByRole('button', { name: 'Add a sub-section' }).click()
    await shot('05-new-section')
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click(); await snack(page, 'Probe section added to Sections'); await page.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) the tab's own name, "Sections" (4-39, LIBRARY_ROOT)
    const id = sql(`select id from price_book_sections where name='Probe section'`)
    ok('saved once, with the line’s unit, a sub-section and the note', sql(`select count(*) from price_book_sections`) === String(Number(before) + 1) && sql(`select json_extract(lines_json, '$.lines[0].unit') || '|' || json_array_length(lines_json, '$.subs') || '|' || description from price_book_sections where id='${id}'`) === 'sqft|1|Supply and install')
  })

  await step('an entry a live quote came from waits in the trash; a stale pick is refused; counts leave the trash out', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await card(page, 'Painting, whole unit').getByRole('button', { name: 'More options for Painting, whole unit' }).click(); await page.waitForTimeout(250)
    await page.getByRole('menu').last().getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog', { name: /^Delete Painting/ }).getByRole('button', { name: 'Delete' }).click(); await snack(page, 'Painting, whole unit deleted'); await page.waitForTimeout(600)
    sql(`insert into price_book_items (id, name, kind, unit, cost_minor, markup_minor, created_at, updated_at, deleted_at, status, created_by, updated_by) values ('probe-trash', 'Probe trash item', 'purchase', 'Pieces', 100, 0, strftime('%s','now'), strftime('%s','now'), strftime('%s','now'), 'live', 'dane', 'dane')`)
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /Deleted items/i }).click()   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const sheet = page.getByRole('dialog', { name: 'Deleted Items' }); await sheet.waitFor(); await page.waitForTimeout(500)
    const paintRow = sheet.getByTestId('deleted-library-row').filter({ hasText: 'Painting, whole unit' })
    ok('Painting can be restored, not deleted forever', (await paintRow.getByRole('button', { name: 'Delete Forever' }).getAttribute('aria-disabled')) === 'true')
    ok('its Made by names who added it', /Dane/.test(await paintRow.innerText()))
    await shot('06-deleted-in-use')
    await sheet.getByRole('button', { name: 'Delete all forever' }).click()   // (the calm UI build 2026-10-27, a deliberate change) W-006: Empty Trash reads Delete all forever
    await page.getByRole('dialog', { name: 'Delete all forever?' }).getByRole('button', { name: 'Delete all forever' }).click(); await page.waitForTimeout(1200)   // (the calm UI build 2026-10-27, a deliberate change)
    ok('Empty Trash takes the unused one and keeps Painting', sql(`select count(*) from price_book_items where id='probe-trash'`) === '0' && sql(`select count(*) from price_book_items where id='${PAINT}'`) === '1')
    await paintRow.getByRole('button', { name: 'Restore' }).click(); await page.waitForTimeout(1000)
    ok('Painting restored', sql(`select deleted_at is null from price_book_items where id='${PAINT}'`) === '1')
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const n = sql(`select count(*) from quote_items where quote_id='${Q}'`)
    sql(`update price_book_items set deleted_at = strftime('%s','now') where id='${ELEC}'`)
    await addBox(page, 'Electrical')
    await page.getByRole('option', { name: /Electrical point, new/ }).first().click(); await snack(page, 'Couldn’t add the item'); await page.waitForTimeout(400)
    ok('a pick from a page opened before the delete is refused', sql(`select count(*) from quote_items where quote_id='${Q}'`) === n)
    sql(`update price_book_items set deleted_at = null where id='${ELEC}'`)
    sql(`update price_book_items set deleted_at = strftime('%s','now') where name='Probe section'`)
    const live = sql(`select count(*) from price_book_items where deleted_at is null and status='live'`)
    sql(`update price_book_items set deleted_at = strftime('%s','now') where id='${ELEC}'`)
    await page.goto(`${BASE}/leads/${LEAD}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'New quote' }).first().click(); await page.waitForTimeout(800)   // (the calm UI build 2026-10-27, a deliberate change) W-011
    const expect = Number(live) - 1
    ok(`the New quote window's draft row names the Price book (the live count ${expect} is no longer printed)`, /drafts it from your Price book/.test(await page.getByRole('dialog').innerText()))   // (the calm UI build 2026-10-27, a deliberate change) 2-51 · 4-32: “Describe the work; Maison AI drafts it from your Price book.” — no “10-item”
    sql(`update price_book_items set deleted_at = null where id='${ELEC}'`)
    await page.keyboard.press('Escape')
  })

  await step('the Add Item popover lists every item, finds by category and kind, walks into My Sections, lands where the row asked', async () => {
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const all = Number(sql(`select count(*) from price_book_items where deleted_at is null and status='live'`))
    const a = await addBox(page, '')
    await a.press('ArrowDown'); await page.waitForTimeout(300)
    const list = page.getByTestId('add-item-list')
    ok(`every item, counted (${all})`, (await list.innerText()).includes(`Price book items (${all})`) && await list.getByRole('option').filter({ hasNot: page.locator('[data-testid="my-section"]') }).count() >= all)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    await a.fill('Tiling'); await page.waitForTimeout(400)
    ok('a category finds its items', await page.getByRole('option', { name: /Homogeneous tiles/ }).count() === 2)
    await a.fill('Labour'); await page.waitForTimeout(400)
    ok('a kind finds its items', await page.getByRole('option', { name: /Cement screeding and waterproofing/ }).count() === 1)
    await a.fill(''); await page.waitForTimeout(300); await a.press('ArrowUp'); await page.waitForTimeout(300)
    ok('↑ from the top walks into My Sections', (await page.getByTestId('my-section').last().getAttribute('aria-selected')) === 'true')
    await shot('07-popover-all')
    await a.press('Escape'); await page.waitForTimeout(300)
    const menu = await rowMenu(page, HAUL, 'Haulage and debris disposal')
    await menu.getByRole('menuitem', { name: 'More', exact: true }).click(); await page.waitForTimeout(200)   // (the calm UI build 2026-10-27, a deliberate change) 4-07: Add item › sits under More ›
    await page.getByRole('menu').last().getByRole('menuitem', { name: /^Add item/i }).click(); await page.waitForTimeout(200)
    // REG-773 (UX audit Q7) · (S44I, B6 — a deliberate change of this rule) the row menu's "From Price book…" opens the Price book modal with the row's place
    await page.getByRole('menu').last().getByRole('menuitem', { name: /^Add from Price book/ }).click(); await page.waitForTimeout(800)   // (Dane's Items-sections round, REG-2534 — a deliberate change of this rule) the row reads "Add from Price book…"
    ok('the popover says where the pick lands', /goes in below “Haulage and debris disposal”/.test(await page.getByRole('dialog', { name: 'Price book' }).innerText()))   // (sweep S5 #13)
    await shot('08-lands-below')
    await page.locator('[data-testid="book-item"]:has-text("Electrical point, new")').first().click(); await page.getByRole('button', { name: 'Add 1 item' }).click(); await page.waitForTimeout(1800)
    const haul = sql(`select ifnull(parent_id,'top') || '|' || position from quote_items where id='${HAUL}'`).split('|')
    const got = sql(`select ifnull(parent_id,'top') || '|' || position from quote_items where quote_id='${Q}' and price_book_item_id='${ELEC}' order by created_at desc limit 1`).split('|')
    ok('the pick landed right below Haulage', got[0] === haul[0] && Number(got[1]) === Number(haul[1]) + 1, `${got.join('/')} vs ${haul.join('/')}`)
  })

  await step('phone', async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await c.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/company/price-book`); await ready(p)
    await p.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click(); await p.getByTestId('item-dialog').waitFor(); await p.waitForTimeout(500)
    await p.getByTestId('item-photo').scrollIntoViewIfNeeded()
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: the item dialog with its photo and link fits', over <= 0, `${over}px`)
    await shot('09-phone-item', p)
    await c.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})()
