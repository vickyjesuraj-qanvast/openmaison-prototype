// Price book parity round 2 (REG-652) — who may change the book: Owners and Admins change it; anyone else reads it (items and
// sections open read-only, the changing rows say why) and proposes an item — on their own quotes at once, offered to no one else,
// marked Proposed; an Owner or an Admin approves it or sends it back with a note, the proposer hears it in the bell; every change is
// kept in the item's History (who, when, before → after); the list names who changed each item; Who may do what lists the book.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
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
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const card = (page, name) => page.getByTestId('library-card').filter({ has: page.getByRole('button', { name: new RegExp(`^(Open|Edit) ${esc(name)}$`) }) }).first()   // (REG-653) the card's words are its menu's: Edit for an Owner or an Admin
const Q = sql(`select id from quotes where number='OM-10001'`)
const HAUL = sql(`select id from quote_items where quote_id='${Q}' and name='Haulage and debris disposal'`)
const BATHS = sql(`select id from quote_items where quote_id='${Q}' and kind='group' and name='Bathrooms'`)
const PAINT = sql(`select id from price_book_items where name='Painting, whole unit'`)

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  // REG-797 (UX audit S8): My Items opens as the list for a member who never picked a view; this round was written on the grid, so the
  // member's first pick is the grid (their own toggles still stick)
  await ctx.addInitScript(() => { try { if (localStorage.getItem('om.price-book-items.list') === null) localStorage.setItem('om.price-book-items.list', '0') } catch {} })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-pb2/${n}.png` })

  await step('an Owner sees the proposal waiting, with its bell notice', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    ok('the proposal carries its chip', /waiting for approval/i.test(await card(page, 'Skirting, PVC 80 mm').innerText()))   // (the calm UI build 2026-10-27, a deliberate change) T-01: a proposal reads Waiting for approval
    ok('the Proposed to-do counts it', await page.getByRole('button', { name: '1 approval', exact: true }).count() === 1)   // (the calm UI build 2026-10-27, a deliberate change) T-01: the to-do chip counts Approvals   // (REG-666) the segment became a to-do chip
    ok('the bell told the Owner', sql(`select count(*) from notifications where member_id='dane' and kind='price_book_proposed' and title like 'Sarah proposed “Skirting, PVC 80 mm”%'`) === '1')
    await page.getByRole('button', { name: /^Company/ }).first().click(); await page.waitForTimeout(400)
    ok('the Company panel says one is proposed', /\b1 approval\b/.test(await page.getByRole('menuitem', { name: /Price book/ }).innerText()))   // (the calm UI build 2026-10-27, a deliberate change) §2 Approvals: the panel's badge reads "1 approval"
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.getByRole('button', { name: /^(Open|Edit) Skirting,\ PVC\ 80\ mm$/ }).click()
    const dlg = page.getByTestId('item-dialog'); await dlg.waitFor(); await page.waitForTimeout(700)
    const bar = page.getByTestId('proposal-bar')
    ok('the proposal bar: who proposed it, Send back… · Approve', /Sarah proposed this item/.test(await bar.innerText()) && await bar.getByRole('button', { name: 'Approve' }).count() === 1 && await bar.getByRole('button', { name: 'Send back…' }).count() === 1)
    ok('its History starts with Sarah adding it', /Added by Sarah/.test(await page.getByTestId('item-history').innerText()))
    await shot('01-owner-proposal')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('an Owner’s edit is kept in the item’s History, before → after', async () => {
    await page.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click()
    const dlg = page.getByTestId('item-dialog'); await dlg.waitFor()
    await dlg.getByLabel('Cost (S$)').fill('1600.00')
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click(); await snack(page, 'Item saved'); await page.waitForTimeout(600)
    ok('the change is stored with who and what', sql(`select by || '|' || json_extract(changes, '$.costMinor') from price_book_changes where item_id='${PAINT}' and kind='edited' order by at desc limit 1`) === 'dane|[150000,160000]')
    await page.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click(); await page.waitForTimeout(900)
    const first = await page.getByTestId('history-row').first().innerText()
    ok('History reads “Changed by Dane · just now — Cost S$1,500.00 → S$1,600.00”', /Changed by Dane · just now/.test(first) && /Cost S\$\s?1,500\.00 → S\$\s?1,600\.00/.test(first), first.replace(/\n/g, ' / '))
    await shot('02-history')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.getByRole('radio', { name: 'List view' }).click().catch(async () => { await page.getByRole('button', { name: 'List view' }).click() })
    await page.waitForTimeout(600)
    const table = page.getByTestId('library-table')
    ok('the list names who changed each item', await table.getByRole('columnheader', { name: 'Updated by' }).count() === 1 && /Dane/.test(await table.getByTestId('library-row').filter({ hasText: 'Painting, whole unit' }).innerText()))
    await shot('03-list-updated-by')
    await page.getByRole('radio', { name: 'Grid view' }).click().catch(async () => { await page.getByRole('button', { name: 'Grid view' }).click() })
  })

  await step('a Designer reads the book: items and sections open read-only, the changing rows say why', async () => {
    as('sarah')
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: /^Company/ }).first().click(); await page.waitForTimeout(400)
    ok('her Company panel has no queue to answer', !/proposed|\d+ approvals?\b/.test(await page.getByRole('menuitem', { name: /Price book/ }).innerText()))   // (the calm UI build 2026-10-27, a deliberate change) §2 Approvals: no "n approvals" badge
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.getByTestId('new-template').click(); await page.waitForTimeout(300)
    ok('New ▾ offers Propose an item', await page.getByRole('menuitem', { name: 'Propose an item' }).count() === 1)
    ok('Import is out of reach', (await page.getByRole('menuitem', { name: /Import from a spreadsheet/ }).getAttribute('aria-disabled')) === 'true')
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await card(page, 'Painting, whole unit').getByRole('button', { name: 'More options for Painting, whole unit' }).click(); await page.waitForTimeout(300)
    const menu = page.getByRole('menu').last()
    const dis = async (n) => (await menu.getByRole('menuitem', { name: new RegExp('^' + n) }).first().getAttribute('aria-disabled')) === 'true'
    ok('the kebab: Open, and Duplicate · Rename · Delete disabled', await menu.getByRole('menuitem', { name: 'Open', exact: true }).count() === 1 && await dis('Duplicate') && await dis('Rename') && await dis('Delete'))
    await shot('04-designer-kebab')
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.getByRole('button', { name: /^(Open|Edit) Painting,\ whole\ unit$/ }).click()
    const dlg = page.getByTestId('item-dialog'); await dlg.waitFor(); await page.waitForTimeout(500)
    ok('the item opens read-only, saying why', await page.getByRole('dialog', { name: 'Item details' }).count() === 1 && await dlg.getByLabel('Item name').isDisabled() && /Only an Owner or an Admin changes the price book/.test(await dlg.getByTestId('read-only-line').innerText()))
    ok('its footer is Close alone', await page.getByRole('dialog').getByRole('button', { name: 'Save' }).count() === 0 && await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).count() >= 1)
    ok('she reads its History too', /Changed by Dane/.test(await page.getByTestId('item-history').innerText()))
    await shot('05-designer-read-only')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page)
    ok('My Sections: New section is out of reach', await page.getByTestId('new-template').isDisabled())   // (sweep S5 #23) the button waits with its reason — no menu of one disabled row
    await page.getByRole('button', { name: /^(Open|Edit) Bathrooms/ }).first().click()
    const sd = page.getByTestId('section-dialog'); await sd.waitFor(); await page.waitForTimeout(400)
    ok('a section opens read-only', await page.getByRole('dialog', { name: 'Section details' }).count() === 1 && await sd.getByLabel('Section name').isDisabled() && await sd.getByRole('button', { name: 'Add an item' }).count() === 0)   // (sweep S5 #31) "items"
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /Deleted sections/i }).click()   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const sheet = page.getByRole('dialog', { name: 'Deleted Sections' }); await sheet.waitFor(); await page.waitForTimeout(500)
    ok('the Deleted sheet names sections and keeps Empty Trash from her', /No deleted sections\./.test(await sheet.innerText()) && await sheet.getByRole('button', { name: 'Delete all forever' }).isDisabled())   // (the calm UI build 2026-10-27, a deliberate change) W-006
    await page.keyboard.press('Escape')
  })

  let mine = null
  await step('a Designer proposes an item: on her quotes at once, offered to no one else', async () => {
    as('sarah')
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: 'Propose an item' }).click()
    const dlg = page.getByTestId('item-dialog'); await dlg.waitFor()
    ok('the dialog says what a proposal is', await page.getByRole('dialog', { name: 'Propose an item' }).count() === 1 && /an Owner or an Admin approves it before the rest of the studio uses it/.test(await page.getByRole('dialog').innerText()))
    await dlg.getByLabel('Item name').fill('Probe proposal, glass shelf'); await dlg.getByLabel('Cost (S$)').fill('40.00'); await dlg.getByLabel('Markup (S$)').fill('20.00')
    await shot('06-propose')
    await page.getByRole('dialog').getByRole('button', { name: 'Propose', exact: true }).click(); await snack(page, 'Probe proposal, glass shelf proposed'); await page.waitForTimeout(800)
    mine = sql(`select id from price_book_items where name='Probe proposal, glass shelf'`)
    ok('stored as her proposal', sql(`select status || '|' || created_by from price_book_items where id='${mine}'`) === 'proposed|sarah')
    ok('the Owner hears of it', sql(`select count(*) from notifications where member_id='dane' and kind='price_book_proposed' and actor_id='sarah' and title like '%Probe proposal, glass shelf%'`) === '1')
    ok('she sees it marked Proposed', /waiting for approval/i.test(await card(page, 'Probe proposal, glass shelf').innerText()))   // (the calm UI build 2026-10-27, a deliberate change)
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const add = page.getByRole('combobox', { name: 'Add Item' }).first()
    await add.scrollIntoViewIfNeeded(); await add.click(); await add.fill('Probe proposal'); await page.waitForTimeout(500)
    const opt = page.getByRole('option', { name: /Probe proposal, glass shelf/ })
    ok('her quote offers it, marked Proposed', await opt.count() === 1 && /· Waiting for approval/.test(await opt.innerText()), await opt.count() ? await opt.innerText() : 'none')   // (the calm UI build 2026-10-27, a deliberate change) T-01
    await page.keyboard.press('Escape')
    as('michelle')
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    ok('another Designer doesn’t see it in My Items', await page.getByRole('button', { name: /^(Open|Edit) Probe\ proposal,\ glass\ shelf$/ }).count() === 0 && await page.getByRole('button', { name: /^(Open|Edit) Skirting,\ PVC\ 80\ mm$/ }).count() === 0)
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const add2 = page.getByRole('combobox', { name: 'Add Item' }).first()
    await add2.scrollIntoViewIfNeeded(); await add2.click(); await add2.fill('Probe proposal'); await page.waitForTimeout(500)
    ok('nor on her quotes', await page.getByRole('option', { name: /Probe proposal, glass shelf/ }).count() === 0)
    await page.keyboard.press('Escape')
  })

  await step('a Designer’s “Propose to My Items” is a proposal; Save section waits for an Owner or an Admin', async () => {
    as('sarah')
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const r = page.locator(`[data-item-id="${HAUL}"]`).first(); await r.scrollIntoViewIfNeeded(); await r.hover()
    await r.getByRole('button', { name: 'More options for Haulage and debris disposal' }).click()
    await page.getByRole('menu').last().getByRole('menuitem', { name: 'Price book', exact: true }).click(); await page.waitForTimeout(200)   // (the calm UI build 2026-10-27, a deliberate change) 4-07: a line's saves to the book sit under Price book ›
    await page.getByRole('menu').last().getByRole('menuitem', { name: 'Propose to My Items' }).click()   // (REG-653, Q-18) the book's own name
    await snack(page, 'Proposed to My Items'); await page.waitForTimeout(500)
    ok('the line’s item is her proposal', sql(`select b.status || '|' || b.created_by from quote_items i join price_book_items b on b.id = i.price_book_item_id where i.id='${HAUL}'`) === 'proposed|sarah')
    await shot('07-save-line-proposed')
    const g = page.locator(`[data-item-id="${BATHS}"]`).first(); await g.scrollIntoViewIfNeeded(); await g.hover()
    await g.getByRole('button', { name: 'More options for Bathrooms' }).click()
    ok('Save section to My Sections is out of reach', (await page.getByRole('menu').last().getByRole('menuitem', { name: 'Save to Price book' }).getAttribute('aria-disabled')) === 'true')   // (the calm UI build 2026-10-27, a deliberate change) W-608
    await page.keyboard.press('Escape')
  })

  await step('an Owner approves one and sends one back with a note; the proposer hears both', async () => {
    as('dane')
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    ok('the Proposed to-do gathers all three', await page.getByRole('button', { name: '3 approvals', exact: true }).count() === 1)   // (the calm UI build 2026-10-27, a deliberate change)
    await page.getByRole('button', { name: /^(Open|Edit) Probe\ proposal,\ glass\ shelf$/ }).click(); await page.getByTestId('proposal-bar').waitFor()
    await page.getByTestId('proposal-bar').getByRole('button', { name: 'Approve' }).click(); await snack(page, 'approved — it’s in My Items for the studio'); await page.waitForTimeout(600)
    ok('approved: live, with who approved it', sql(`select status || '|' || reviewed_by from price_book_items where id='${mine}'`) === 'live|dane')
    ok('History keeps the approval', sql(`select count(*) from price_book_changes where item_id='${mine}' and kind='approved' and by='dane'`) === '1')
    ok('Sarah hears it', sql(`select count(*) from notifications where member_id='sarah' and kind='price_book_answered' and title like 'Dane approved “Probe proposal, glass shelf”%'`) === '1')
    await card(page, 'Skirting, PVC 80 mm').getByRole('button', { name: 'More options for Skirting, PVC 80 mm' }).click(); await page.waitForTimeout(300)
    await page.getByRole('menu').last().getByRole('menuitem', { name: 'Send back…' }).click()
    const nd = page.getByRole('dialog', { name: 'Send back' }); await nd.waitFor()
    ok('Send back waits for a note', await nd.getByRole('button', { name: 'Send back' }).isDisabled())
    await nd.getByLabel('What should change?').fill('We stock the 100 mm profile — propose that one')
    await shot('08-send-back')
    await nd.getByRole('button', { name: 'Send back' }).click(); await snack(page, 'sent back to Sarah'); await page.waitForTimeout(600)
    const skirt = sql(`select id from price_book_items where name='Skirting, PVC 80 mm'`)
    ok('it leaves My Items with the note kept', sql(`select (deleted_at is not null) || '|' || review_note from price_book_items where id='${skirt}'`) === '1|We stock the 100 mm profile — propose that one')
    ok('History keeps the send-back and its note', sql(`select note from price_book_changes where item_id='${skirt}' and kind='sent_back'`) === 'We stock the 100 mm profile — propose that one')
    ok('Sarah hears it with the note', sql(`select body from notifications where member_id='sarah' and kind='price_book_answered' and title like 'Dane sent “Skirting, PVC 80 mm” back%'`) === 'We stock the 100 mm profile — propose that one')
    as('michelle')
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    const add = page.getByRole('combobox', { name: 'Add Item' }).first()
    await add.scrollIntoViewIfNeeded(); await add.click(); await add.fill('Probe proposal'); await page.waitForTimeout(500)
    ok('the approved item is now on everyone’s quotes', await page.getByRole('option', { name: /Probe proposal, glass shelf/ }).count() === 1)
    await page.keyboard.press('Escape')
  })

  await step('Who may do what lists the book', async () => {
    await page.goto(`${BASE}/settings?section=studio`); await ready(page)
    await openRoles(page)   // (the calm UI build 2026-10-27, a deliberate change)
    const reach = async (k) => JSON.stringify(await page.getByTestId(`may-${k}`).locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach'))))
    ok('change the book: Owners and Admins; Managers and Designers submit', await reach('price-book') === '["yes","yes","submit","submit","no","no"]') /* (S44O — call C6, a deliberate change of this rule: a sixth column, Marketing) */ /* (parity map, FB-114 — a deliberate change of this rule: a fifth column, Accounting) */
    ok('approve a proposal: Owners and Admins', await reach('price-book-approve') === '["yes","yes","no","no","no","no"]') /* (S44O — call C6, a deliberate change of this rule: a sixth column, Marketing) */ /* (parity map, FB-114 — a deliberate change of this rule: a fifth column, Accounting) */
    ok('My Sections: Owners and Admins', await reach('price-book-sections') === '["yes","yes","no","no","no","no"]') /* (S44O — call C6, a deliberate change of this rule: a sixth column, Marketing) */ /* (parity map, FB-114 — a deliberate change of this rule: a fifth column, Accounting) */
    await page.getByTestId('may-price-book').scrollIntoViewIfNeeded(); await shot('09-who-may')
  })

  await step('phone', async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await c.newPage(); p.setDefaultTimeout(12000)
    sql(`update price_book_items set deleted_at = null, review_note = null, reviewed_by = null, reviewed_at = null where name='Skirting, PVC 80 mm'`)
    await p.goto(`${BASE}/company/price-book`); await ready(p)
    await p.getByRole('button', { name: /^(Open|Edit) Skirting,\ PVC\ 80\ mm$/ }).click(); await p.getByTestId('proposal-bar').waitFor(); await p.waitForTimeout(500)
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: the proposal bar and History fit', over <= 0, `${over}px`)
    await shot('10-phone-proposal', p)
    await c.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})()
