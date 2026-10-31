// Dane's UAT 2026-10-01 — package P2a: the Price book, the library galleries, folders and creating templates (b-proposals · b-folder ·
// g-pbcard · g-sortfolders · g-markup · g-deletecopy · g-blank · g-dragorder's section half). Run against a production build on a scratch
// copy of the demo baseline. It writes records (new items, a section, templates, an edit): re-copy the scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3032
//   TESTDB=<scratch.db> BASE=http://localhost:3032 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P2a/verify-p2a.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3032', OUT = __dirname
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 'p2a-'))
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { as('dane') } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const listView = async (page) => { const r = page.getByRole('radio', { name: 'List view' }); if (await r.count()) await r.click(); else await page.getByRole('button', { name: 'List view' }).click(); await page.waitForTimeout(500) }
const gridView = async (page) => { const r = page.getByRole('radio', { name: 'Grid view' }); if (await r.count()) await r.click(); else await page.getByRole('button', { name: 'Grid view' }).click(); await page.waitForTimeout(500) }
const openNew = async (page, row) => { await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: row, exact: true }).click() }
const csvLines = (t) => t.trim().split(/\r?\n/)

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  as('dane')
  const PROPOSAL = 'Skirting, PVC 80 mm'
  const liveCount = Number(sql(`select count(*) from price_book_items where deleted_at is null and status = 'live'`))
  const itemCount = () => Number(sql(`select count(*) from price_book_items where deleted_at is null`))

  /* ── b-proposals (3.11): Export leaves proposals out unless ticked; ticked, a Status column says which is which ── */
  let withTick = null, plain = null
  await step('b-proposals export', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Export items…' }).click()   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const dlg = page.getByRole('dialog', { name: 'Export items' }); await dlg.waitFor()   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const tick = dlg.getByTestId('export-option')
    ok('3.11 the export offers "Include proposed items", off', (await tick.innerText()).includes('Include items waiting for approval') && !(await tick.locator('input[type=checkbox]').isChecked()))   // (the calm UI build 2026-10-27, a deliberate change) T-01: proposals read Waiting for approval
    ok('3.11 untick: All items counts the approved ones only', (await dlg.innerText()).includes(`All items (${liveCount})`), (await dlg.innerText()).split('\n').find((l) => /All items/.test(l)))
    await shot(page, 'b1-export-untick')
    let [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Export' }).click()])
    plain = fs.readFileSync(await dl.path(), 'utf8'); fs.writeFileSync(`${FILES}/my-items.csv`, plain)
    let lines = csvLines(plain)
    ok('3.11 the default export leaves the proposal out, no Status column', !plain.includes(PROPOSAL) && !/Status/.test(lines[0]) && lines.length === liveCount + 1, `${lines.length - 1} rows`)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Export items…' }).click()   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    await dlg.waitFor(); await dlg.getByText('Include items waiting for approval').click(); await page.waitForTimeout(200)   // (the calm UI build 2026-10-27, a deliberate change) T-01: proposals read Waiting for approval
    ok('3.11 ticked: All items counts the proposal too', (await dlg.innerText()).includes(`All items (${liveCount + 1})`))
    await shot(page, 'b1-export-tick')
    ;[dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Export' }).click()])
    withTick = fs.readFileSync(await dl.path(), 'utf8'); fs.writeFileSync(`${FILES}/my-items-all.csv`, withTick)
    lines = csvLines(withTick)
    const row = lines.find((l) => l.includes(PROPOSAL)) ?? ''
    ok('3.11 ticked: the proposal comes with a Status column — Proposed / Approved', /,Status$/.test(lines[0]) && /,Proposed$/.test(row) && lines.slice(1).filter((l) => !l.includes(PROPOSAL)).every((l) => /,Approved$/.test(l)), lines[0])
  })

  /* ── b-proposals (3.12): re-import — the caption counts items, a proposal is waiting (skipped), nothing new says so and Done closes ── */
  await step('b-proposals import', async () => {
    const before = itemCount()
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await openNew(page, 'Import from a spreadsheet…'); await page.getByTestId('import-dialog').waitFor()
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(`${FILES}/my-items.csv`)
    const map = page.getByRole('dialog', { name: 'Import into the Price book' }); await map.waitFor(); await page.waitForTimeout(500)   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const cap = await map.locator('p').first().innerText()
    ok('3.12 the caption counts items, not the header line', cap.startsWith(`${liveCount} items · 12 columns from “my-items.csv”`), cap)   // (pending modules S12, a deliberate change of this rule) the export's + Waste % column
    await page.getByTestId('import-match').getByText('Skip', { exact: true }).click(); await page.waitForTimeout(250)
    ok('3.12 nothing new: the summary says so', (await page.getByTestId('import-nothing-new').innerText()).includes('Nothing new to import — every row is already in the Price book or waiting for approval'))   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    ok('3.12 the primary is Done', await map.getByTestId('import-done').isVisible() && (await map.getByRole('button', { name: /^Import/ }).count()) === 0)
    await shot(page, 'b2-import-nothing-new')
    await map.getByTestId('import-done').click(); await page.waitForTimeout(500)
    ok('3.12 Done closes and writes nothing', (await map.count()) === 0 || !(await map.isVisible()), '')
    ok('3.12 nothing was written', itemCount() === before)
    /* the export with the proposal: its row is "Waiting for approval — skipped", even when matches are added as new */
    await openNew(page, 'Import from a spreadsheet…'); await page.getByTestId('import-dialog').waitFor()
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(`${FILES}/my-items-all.csv`)
    await map.waitFor(); await page.waitForTimeout(500)
    ok('3.12 the caption counts the file’s items (proposal too)', (await map.locator('p').first().innerText()).startsWith(`${liveCount + 1} items · 13 columns`))   // (pending modules S12, a deliberate change of this rule) + Waste %
    ok('3.12 the notes say a row waits for approval', /1 row matches an item waiting for approval — skipped/.test(await page.getByTestId('import-waiting').innerText()))
    await page.getByTestId('import-match').getByText('Add as new', { exact: true }).click(); await page.waitForTimeout(250)
    const btn = await map.getByRole('button', { name: /^Import \d+ rows?$/ }).innerText()
    ok('3.12 "Add as new" imports the approved rows only — the proposal never', btn === `Import ${liveCount} rows`, btn)
    await shot(page, 'b2-import-waiting')
    await map.getByRole('button', { name: /^Import \d+ rows?$/ }).click(); await snack(page, /added/)
    ok('3.12 the server skipped the proposal: no live copy of it', sql(`select count(*) from price_book_items where name = '${PROPOSAL}' and deleted_at is null`) === '1' && sql(`select status from price_book_items where name = '${PROPOSAL}'`) === 'proposed')
    ok('3.12 the approved rows came in as new', itemCount() === before + liveCount)
    /* put the book back as it was for the next checks: the import's Undo */
    const undo = page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' })
    if (await undo.count()) { await undo.first().click(); await snack(page, /Import undone/) }
    ok('3.12 the import’s Undo takes the copies back', itemCount() === before)
    /* the proposal's own row in the preview (a file that leads with it — the preview shows the first six) */
    const all = csvLines(withTick); fs.writeFileSync(`${FILES}/waiting.csv`, [all[0], all.find((l) => l.includes(PROPOSAL)), all.find((l) => !l.includes(PROPOSAL) && l !== all[0])].join('\n'))
    await openNew(page, 'Import from a spreadsheet…'); await page.getByTestId('import-dialog').waitFor()
    await page.getByTestId('import-dialog').locator('input[type=file]').setInputFiles(`${FILES}/waiting.csv`)
    await map.waitFor(); await page.waitForTimeout(500)
    const states = await map.locator('[data-testid="import-row"] [data-state]').evaluateAll((els) => els.map((e) => e.textContent))
    ok('3.12 the proposal’s row reads "Waiting for approval — skipped"', states[0] === 'Waiting for approval — skipped', states.join(' | '))
    await shot(page, 'b2-import-waiting-row')
    await map.getByRole('button', { name: 'Cancel' }).click()
  })

  /* ── b-folder (3.03): a new item, section and template made in a folder land there; the snackbar names it ── */
  await step('b-folder item', async () => {
    await page.goto(`${BASE}/company/price-book?folder=lf-items-wet`); await ready(page)
    await openNew(page, 'New item')
    const dlg = page.getByRole('dialog', { name: 'New item' }); await dlg.waitFor()
    await dlg.getByLabel('Item name').fill('Probe grout, epoxy')
    await dlg.getByRole('button', { name: 'Add to Price book' }).click()   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const t = await snack(page, /added to/)
    ok('3.03 the snackbar names the folder', t.includes('Probe grout, epoxy added to Wet works'), t)
    ok('3.03 the new item is in Wet works', sql(`select folder_id from price_book_items where name = 'Probe grout, epoxy'`) === 'lf-items-wet')
    await page.waitForTimeout(600)
    ok('3.03 it shows inside the folder', (await page.getByText('Probe grout, epoxy', { exact: true }).count()) > 0)
    await shot(page, 'b3-item-in-folder')
  })
  await step('b-folder item, top level', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await openNew(page, 'New item')
    const dlg = page.getByRole('dialog', { name: 'New item' }); await dlg.waitFor()
    await dlg.getByLabel('Item name').fill('Probe sealant')
    await dlg.getByRole('button', { name: 'Add to Price book' }).click()   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    const t = await snack(page, /added to/)
    ok('3.03 at the top, it lands at the top and says My Items', t.includes('Probe sealant added to Items') && sql(`select ifnull(folder_id, '-') from price_book_items where name = 'Probe sealant'`) === '-', t)   // (the calm UI build 2026-10-27, a deliberate change) the top of the library is the tab's own name, "Items" (4-39, LIBRARY_ROOT)
  })
  await step('b-folder section', async () => {
    await page.goto(`${BASE}/company/price-book/sections?folder=lf-sections-bathrooms`); await ready(page)
    await openNew(page, 'New section')
    const dlg = page.getByRole('dialog', { name: 'New section' }); await dlg.waitFor()
    await dlg.getByLabel('Section name').fill('Probe vanity')
    await dlg.getByRole('button', { name: 'Save' }).click()
    const t = await snack(page, /added to/)
    ok('3.03 a section made in a folder lands there, said', t.includes('Probe vanity added to Bathrooms') && sql(`select folder_id from price_book_sections where name = 'Probe vanity'`) === 'lf-sections-bathrooms', t)
  })
  const TPL = [
    { tab: 'quotes', folder: 'lf-quotes-hdb', row: 'Blank template', table: 'quote_templates', col: 'name', url: /\/templates\/[0-9a-f-]{36}/ },
    { tab: 'contracts', folder: 'lf-contracts-agreements', row: 'Blank template', table: 'contract_templates', col: 'title', url: /\/templates\/contracts\// },
    { tab: 'tasks', folder: 'lf-tasks-followup', row: 'Blank template', table: 'task_templates', col: 'name', url: /\/templates\/tasks\// },
    /* (the calm UI build 2026-10-27, a deliberate change) New ▾'s row in sentence case (T-13) */
    { tab: 'terms', folder: 'lf-texts-hdb', row: 'Terms and conditions', table: 'quote_text_templates', col: 'title', url: /\/templates\/terms\// },
    { tab: 'payments', folder: 'lf-payments-full', row: 'Blank split', table: 'payment_templates', col: 'name', url: /\/templates\/payments\// },
  ]
  let blankId = null
  for (const t of TPL) {
    await step(`b-folder template ${t.tab}`, async () => {
      await page.goto(`${BASE}/company/templates/${t.tab}?folder=${t.folder}`); await ready(page)
      await openNew(page, t.row)
      await page.waitForURL(t.url, { timeout: 15000 }); await page.waitForTimeout(400)
      const id = (page.url().match(/\/([0-9a-f-]{36})(?:\?|$)/) || [])[1]
      if (t.tab === 'quotes') blankId = id
      ok(`3.03 Templates › ${t.tab}: the new template is filed in the open folder`, !!id && sql(`select folder_id from ${t.table} where id = '${id}'`) === t.folder, id)
    })
  }

  /* ── g-blank (Figma 1546:28): a Blank quote template carries the Letter header and footer ── */
  await step('g-blank', async () => {
    const draft = JSON.parse(sql(`select draft_json from quote_templates where id = '${blankId}'`))
    const kinds = draft.design.blocks.map((b) => b.kind)
    ok('g-blank: header · items · totals · footer', JSON.stringify(kinds) === JSON.stringify(['header', 'items', 'totals', 'footer']), kinds.join(' · '))
    await page.goto(`${BASE}/templates/${blankId}`); await ready(page); await page.waitForTimeout(1200)
    await shot(page, 'g7-blank-template')
  })

  /* the refused case: a Designer's quote template (it keeps no author) lands at the top of Quotes, and the page says where */
  await step('b-folder refused', async () => {
    as('sarah')
    await page.goto(`${BASE}/company/templates/quotes?folder=lf-quotes-hdb`); await ready(page)
    const before = sql(`select count(*) from quote_templates`)
    await openNew(page, 'Blank template')
    const t = await snack(page, /The new template is in Quotes/)
    ok('3.03 a Designer’s new quote template: the snackbar says where it went and why', t.includes('The new template is in Quotes, not HDB — only an Owner or an Admin files quote templates in folders') && /Open/.test(t), t)
    ok('3.03 it is at the top of Quotes', Number(sql(`select count(*) from quote_templates`)) === Number(before) + 1 && sql(`select ifnull(folder_id, '-') from quote_templates order by created_at desc limit 1`) === '-')
    await shot(page, 'b3-template-refused-snackbar')
  })

  /* ── g-pbcard (3.04): the card's line says vendor · category; the price lives in the picture ── */
  await step('g-pbcard', async () => {
    await page.goto(`${BASE}/company/price-book?folder=lf-items-wet`); await ready(page); await gridView(page)
    const card = page.getByTestId('library-card').filter({ hasText: 'Homogeneous tiles' }).first()
    const text = await card.innerText()
    ok('3.04 the meta line is "by Hafary · Tiling" (or the other vendor), no price', /by (Hafary|Soon Bee Huat) · Tiling/.test(text) && !/S\$[\d,.]+ \/ sqft/.test(text), text.replace(/\n/g, ' ⏎ '))
    ok('3.04 the picture still shows the price and its unit', /per sqft/.test(text))
    await shot(page, 'g3-card-meta', await card.boundingBox().then((b) => ({ x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 })))
    await listView(page)
  })

  /* ── g-sortfolders (3.07): a sort at the top is one flat list across folders, each row with its place ── */
  await step('g-sortfolders', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    const folderRows = await page.getByTestId('library-folder-row').count()
    const loose = await page.getByTestId('library-row').count()
    ok('3.07 browsing: the folders lead, the loose items follow', folderRows === 2 && loose < itemCount(), `${folderRows} folders · ${loose} rows`)
    const head = page.getByRole('columnheader', { name: /Unit price/ })
    await head.getByRole('button').click(); await page.waitForTimeout(400)
    const rows = await page.getByTestId('library-row').count()
    ok('3.07 sorted: every item in one list, the folders step aside', (await page.getByTestId('library-folder-row').count()) === 0 && rows === itemCount(), `${rows} rows of ${itemCount()}`)
    const wet = await page.getByTestId('library-row').filter({ hasText: 'Cement screeding' }).innerText()
    ok('3.07 a row from a folder says where it lives', /Wet works/.test(wet))
    await shot(page, 'g4-sorted-flat')
    await head.getByRole('button').click(); await head.getByRole('button').click(); await page.waitForTimeout(400)
    ok('3.07 unsorted: back to the folder view', (await page.getByTestId('library-folder-row').count()) === 2)
  })

  /* ── g-markup (3.10): History beside the form (800), Bring back + Undo ── */
  const KITCHEN = sql(`select id from price_book_items where name = 'Kitchen carpentry, top and bottom cabinets'`)
  await step('g-markup', async () => {
    const was = sql(`select markup_minor from price_book_items where id = '${KITCHEN}'`)
    await page.goto(`${BASE}/company/price-book?open=${KITCHEN}`); await ready(page)
    let dlg = page.getByRole('dialog', { name: 'Edit item' }); await dlg.waitFor(); await page.waitForTimeout(400)
    const w = (await dlg.boundingBox()).width
    const form = await dlg.getByLabel('Item name').boundingBox(), hist = await dlg.getByTestId('item-history').boundingBox()
    ok('3.10 an item with History opens at the house l (800)', Math.round(w) === 800, `${Math.round(w)}px`)
    ok('3.10 History sits in its own column beside the form', hist.x > form.x + form.width && hist.y < form.y + 200, `form x${Math.round(form.x)} · history x${Math.round(hist.x)} y${Math.round(hist.y)}`)
    await dlg.getByLabel('Markup (S$)').fill('75.00')
    await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, /Item saved/)
    ok('3.10 the edit is saved', sql(`select markup_minor from price_book_items where id = '${KITCHEN}'`) === '7500')
    await page.waitForTimeout(400)
    await page.goto(`${BASE}/company/price-book?open=${KITCHEN}`); await ready(page)
    dlg = page.getByRole('dialog', { name: 'Edit item' }); await dlg.waitFor(); await page.waitForTimeout(600)
    const back = dlg.getByTestId('history-bring-back')
    ok('3.10 the change offers Bring back', (await back.count()) === 1)
    await shot(page, 'g5-history-column')
    await back.click()
    const t = await snack(page, /brought back/)
    ok('3.10 Bring back restores the entry’s earlier value, said', t.includes('Markup brought back') && sql(`select markup_minor from price_book_items where id = '${KITCHEN}'`) === was, t)
    await page.waitForTimeout(800)
    ok('3.10 the open dialog follows: Markup shows the value brought back', (await dlg.getByLabel('Markup (S$)').inputValue()) === (Number(was) / 100).toFixed(2), await dlg.getByLabel('Markup (S$)').inputValue())
    ok('3.10 History keeps the Bring back as its own change', /Brought back/.test(await dlg.getByTestId('item-history').innerText()))
    await shot(page, 'g5-brought-back')
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).first().click()
    await snack(page, /Change undone/)
    ok('3.10 Undo puts the edit back', sql(`select markup_minor from price_book_items where id = '${KITCHEN}'`) === '7500')
    await dlg.getByRole('button', { name: 'Cancel' }).click()
  })

  /* ── g-deletecopy (3.14): the delete confirm for 0 · 1 · n quotes, and the bulk one ── */
  await step('g-deletecopy', async () => {
    sql(`update quote_items set price_book_item_id = 'pb-tiles-hafary' where id = (select qi.id from quote_items qi join quotes q on q.id = qi.quote_id where q.deleted_at is null and qi.price_book_item_id is null limit 1)`)
    await page.goto(`${BASE}/company/price-book`); await ready(page); await listView(page)
    await page.locator('[role="columnheader"][data-col="name"] button[class*="hSort"]').click(); await page.waitForTimeout(400)   // sorted = flat, so items inside folders have a row too
    const confirmFor = async (name, vendor) => {
      const row = page.getByTestId('library-row').filter({ hasText: name }).filter({ hasText: vendor ?? '' }).first()
      await row.hover(); await row.getByRole('button', { name: /More options/ }).click(); await page.getByRole('menuitem', { name: 'Delete' }).click()
      const c = page.getByRole('dialog').filter({ hasText: 'Delete' }).last(); await c.waitFor(); const text = await c.innerText()
      await c.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
      return text
    }
    const many = await confirmFor('Painting, whole unit')
    ok('3.14 on n quotes', /It’s on \d+ quotes — they keep their lines\. New quotes can’t pick it until you restore it from Deleted items\./.test(many), many.split('\n').slice(-3).join(' '))   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const one = await confirmFor('Homogeneous tiles', 'Hafary')
    ok('3.14 on 1 quote', one.includes('It’s on 1 quote — it keeps its line. New quotes can’t pick it until you restore it from Deleted items.'), one.split('\n').slice(-3).join(' '))   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const none = await confirmFor('Probe sealant')
    ok('3.14 on no quote', none.includes('You can restore it from Deleted items.') && !/quote/.test(none.replace(/Delete .*\?/, '')))   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    /* bulk */
    const boxes = page.getByTestId('library-row').locator('[data-kb-select] input[type=checkbox]')
    await boxes.nth(0).check({ force: true }); await boxes.nth(1).check({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()
    const c = page.getByRole('dialog').filter({ hasText: 'Delete 2 items?' }); await c.waitFor()
    ok('3.14 bulk', (await c.innerText()).includes('Quotes already carrying them keep their lines. New quotes can’t pick them until you restore them from Deleted items.'))   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    await shot(page, 'g6-bulk-delete-confirm')
    await c.getByRole('button', { name: 'Cancel' }).click()
  })

  /* ── g-dragorder (3.38): a section's lines move by their handle; the arrows stay ── */
  await step('g-dragorder', async () => {
    await page.goto(`${BASE}/company/price-book/sections?open=pbs-bathrooms-full-works`); await ready(page)
    const dlg = page.getByRole('dialog', { name: 'Edit section' }); await dlg.waitFor(); await page.waitForTimeout(600)
    const names = () => dlg.getByTestId('section-line').evaluateAll((rows) => rows.map((r) => r.querySelector('input')?.value ?? ''))
    const before = await names()
    ok('3.38 every line leads with a drag handle; the arrows stay', (await dlg.getByTestId('section-line-handle').count()) === before.length && (await dlg.getByRole('button', { name: /up$/ }).count()) === before.length)
    const h = await dlg.getByTestId('section-line-handle').nth(1).boundingBox()
    const first = await dlg.getByTestId('section-line').nth(0).boundingBox()
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down()
    for (let i = 1; i <= 12; i++) { await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 - (h.y - first.y + 20) * i / 12); await page.waitForTimeout(30) }
    await shot(page, 'g8-section-drag')
    await page.mouse.up(); await page.waitForTimeout(500)
    const after = await names()
    ok('3.38 dragging the second line above the first swaps them', after[0] === before[1] && after[1] === before[0], `${before.slice(0, 2).join(' | ')} → ${after.slice(0, 2).join(' | ')}`)
    await dlg.getByRole('button', { name: `Move ${after[0]} down` }).click(); await page.waitForTimeout(300)
    ok('3.38 the arrows still move a line (keyboard, touch)', (await names())[0] === before[0])
    await dlg.getByRole('button', { name: 'Cancel' }).click()
  })

  /* ── phone 390: the item dialog keeps History under the form ── */
  await step('phone 390', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await m.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/company/price-book?folder=lf-items-kitchen`); await ready(p)
    await p.getByTestId('library-card').filter({ hasText: 'Kitchen carpentry' }).locator('button').first().click()
    const dlg = p.getByRole('dialog', { name: 'Edit item' }); await dlg.waitFor(); await p.waitForTimeout(900)
    const photo = await dlg.getByTestId('item-photo').boundingBox(), hist = await dlg.getByTestId('item-history').boundingBox()
    ok('390: History sits under the form', hist.y > photo.y && Math.abs(hist.x - photo.x) < 30, `photo y${Math.round(photo.y)} · history y${Math.round(hist.y)}`)
    await dlg.getByTestId('item-history').scrollIntoViewIfNeeded(); await p.waitForTimeout(300)
    await shot(p, 'p390-item-dialog-history')
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    ok('390: no sideways scroll', !overflow)
    /* the section's lines on a phone: the handle beside the line's boxes */
    await p.goto(`${BASE}/company/price-book/sections?folder=lf-sections-bathrooms`); await ready(p)
    await p.getByTestId('library-card').filter({ hasText: 'Bathrooms — full works' }).locator('button').first().click()
    const sec = p.getByRole('dialog', { name: 'Edit section' }); await sec.waitFor(); await p.waitForTimeout(900)
    await sec.getByTestId('section-line').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300)
    const hb = await sec.getByTestId('section-line-handle').first().boundingBox(), fb = await sec.getByTestId('section-line').first().locator('input').first().boundingBox()
    ok('390: a section line keeps its handle beside its boxes', hb.x + hb.width <= fb.x + 1 && hb.y <= fb.y + fb.height, `handle x${Math.round(hb.x)} · item x${Math.round(fb.x)}`)
    await shot(p, 'p390-section-lines')
    await m.close()
  })

  await browser.close()
  fs.rmSync(FILES, { recursive: true, force: true })
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} PASS`)
  process.exit(failed ? 1 : 0)
})()
