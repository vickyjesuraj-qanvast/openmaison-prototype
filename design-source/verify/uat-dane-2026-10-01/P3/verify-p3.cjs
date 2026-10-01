// Dane's UAT fixes 2026-10-01 — package P3: the quote editor (g-sections-trade · g-photowell · g-signature · g-createclient · g-expanded ·
// g-zero · g-categories · g-jumpto · t-6.03 · g-snackbar · g-merge-fields · x-phonetabs). Run against a production build on a scratch DB that
// has had `db:repair` (R67). It writes records: re-copy the scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3034
//   TESTDB=<scratch.db> BASE=http://localhost:3034 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P3/verify-p3.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3034', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected|locator/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
async function until(fn, timeout = 6000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)) } return false }
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })

const OLIVIA = sql(`select id from leads where name = 'Olivia Martinez'`)
const Q = sql(`select id from quotes where number = 'OM-10001'`)
const EDITOR = `${BASE}/quotes/${Q}`
const itemId = (name) => sql(`select id from quote_items where quote_id = '${Q}' and name = '${name}'`)
const BEDROOMS = itemId('Bedrooms')
const CONTRACT = sql(`select id from contracts where lead_id = '${OLIVIA}' and status <> 'Signed' and deleted_at is null and body like '%studio-signature%' limit 1`)
const TPL_4ROOM = sql(`select id from quote_templates where name = '4-Room BTO'`)

/* a pointer drag from one element's centre to a point, in steps (row-drag.ts listens to pointer moves on the document) */
async function drag(page, from, to) {
  const a = await from.boundingBox()
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  const steps = 14
  for (let i = 1; i <= steps; i++) { await page.mouse.move(a.x + a.width / 2 + ((to.x - a.x - a.width / 2) * i) / steps, a.y + a.height / 2 + ((to.y - a.y - a.height / 2) * i) / steps); await page.waitForTimeout(30) }
  await page.waitForTimeout(250)
  await page.mouse.up()
  await page.waitForTimeout(700)
}
/* the editor's heads are sticky: a row scrolled "into view" can sit under them — centre it instead */
const center = (loc) => loc.evaluate((el) => el.scrollIntoView({ block: 'center' })).then(() => new Promise((r) => setTimeout(r, 300)))
async function openEditor(page) { await page.goto(EDITOR); await page.getByTestId('quote-editor').waitFor(); await ready(page) }
async function viewBy(page, label) {
  await page.locator('#section-items').getByRole('button', { name: /^View by:/ }).click()
  await page.getByRole('menuitemradio', { name: label }).click(); await page.waitForTimeout(600)
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)

  /* ── g-sections-trade (a): the note above the table when the template prints by trade ── */
  await step('g-sections-trade note', async () => {
    await openEditor(page)
    const note = page.getByTestId('print-note')
    ok('g-sections-trade the Items card says the template prints by trade and the sections don’t print',
      (await note.innerText()).includes('Default Quote PDF prints lines by trade, so these sections don’t show on the printed quote.'), await note.innerText())
    await note.scrollIntoViewIfNeeded()
    await shot(page, 'g-sections-trade-note', { x: 0, y: Math.max(0, (await note.boundingBox()).y - 140), width: 1440, height: 420 })
    await note.getByRole('button', { name: 'Change template' }).click()
    ok('g-sections-trade Change template opens the template picker', await page.getByRole('dialog', { name: 'Choose a template' }).isVisible())
    await page.getByRole('dialog', { name: 'Choose a template' }).getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400)
  })

  /* ── g-sections-trade (b): a line dragged into a section that stands for a trade takes it, with Undo ── */
  await step('g-sections-trade drag', async () => {
    const top = Number(sql(`select max(position) from quote_items where quote_id = '${Q}' and parent_id is null`)) + 1
    sql(`insert into quote_items (id, quote_id, parent_id, kind, position, name, status, qty, cost_minor, markup_minor, discount_pct, gst_pct, visibility, collapsed, created_at, updated_at) values ('p3-carpentry', '${Q}', null, 'group', ${top}, 'Carpentry Works', 'Pending', 1, 0, 0, 0, 9, 'visible', 0, strftime('%s','now'), strftime('%s','now'))`)
    await openEditor(page)
    const line = page.locator(`[data-item-id="${itemId('Painting, whole unit')}"]`)
    const section = page.locator('[data-item-id="p3-carpentry"]')
    await center(line)
    const sb = await section.boundingBox()
    await drag(page, line.getByRole('button', { name: /^Drag to reorder/ }), { x: sb.x + 400, y: sb.y + sb.height * 0.8 })
    const t = await snack(page, /category is now/)
    ok('g-sections-trade the move says the trade it took, with Undo', /Moved into “Carpentry Works” — its category is now Carpentry/.test(t) && /Undo/.test(t), t)
    await until(() => sql(`select parent_id || '|' || category from quote_items where name = 'Painting, whole unit' and quote_id = '${Q}'`) === 'p3-carpentry|Carpentry')
    ok('g-sections-trade the line is in the section with the trade as its category', sql(`select parent_id || '|' || category from quote_items where name = 'Painting, whole unit' and quote_id = '${Q}'`) === 'p3-carpentry|Carpentry')
    await shot(page, 'g-sections-trade-adopted', { x: 0, y: Math.max(0, sb.y - 200), width: 1440, height: 420 })
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click()
    await until(() => sql(`select coalesce(parent_id, '-') || '|' || category from quote_items where name = 'Painting, whole unit' and quote_id = '${Q}'`) === '-|Painting')
    ok('g-sections-trade Undo puts the line and its category back', sql(`select coalesce(parent_id, '-') || '|' || category from quote_items where name = 'Painting, whole unit' and quote_id = '${Q}'`) === '-|Painting')
    ok('g-sections-trade a room section (Bathrooms) is no trade — nothing to adopt', sql(`select count(*) from quote_items where quote_id = '${Q}' and parent_id = '${itemId('Bathrooms')}' and category = 'Bathrooms'`) === '0')
  })

  /* ── g-photowell: no picture well on a section or sub-section row; a line keeps the mock's ── */
  await step('g-photowell', async () => {
    await openEditor(page)
    const groupWells = await page.locator('#section-items [role="row"][data-group] button[aria-label^="Image for"]').count()
    const lineWells = await page.locator('#section-items [role="row"][data-item-id]:not([data-group]) button[aria-label^="Image for"]').count()
    ok('g-photowell section rows carry no picture well', groupWells === 0, `${groupWells} on sections`)
    ok('g-photowell line rows keep theirs', lineWells > 5, `${lineWells} on lines`)
    const row = page.locator(`[data-item-id="${itemId('Bathrooms')}"]`)
    await center(row)
    const b = await row.boundingBox()
    await shot(page, 'g-photowell-section-rows', { x: 0, y: Math.max(0, b.y - 60), width: 1440, height: 380 })
  })

  /* ── g-zero: a click into a number cell selects its value ── */
  await step('g-zero', async () => {
    const cost = page.locator(`[data-item-id="${itemId('Haulage and debris disposal')}"] [data-col="cost"] input`)
    await center(cost)
    await cost.click(); await page.waitForTimeout(250)
    const sel = await cost.evaluate((el) => [el.selectionStart, el.selectionEnd, el.value.length, document.activeElement === el])
    ok('g-zero a click into a money cell selects its whole value', sel[3] && sel[0] === 0 && sel[1] === sel[2] && sel[2] > 0, JSON.stringify(sel))
    await page.keyboard.type('321')
    await page.keyboard.press('Escape')
    const qty = page.locator(`[data-item-id="${itemId('Haulage and debris disposal')}"] [data-col="qty"] input`)
    await qty.click(); await page.waitForTimeout(250)
    const q = await qty.evaluate((el) => [el.selectionStart, el.selectionEnd, el.value.length])
    ok('g-zero a click into a quantity selects it too', q[0] === 0 && q[1] === q[2] && q[2] > 0, JSON.stringify(q))
    await page.keyboard.press('Escape')
    await qty.click(); await page.waitForTimeout(150); await qty.click({ position: { x: 4, y: 8 } }); await page.waitForTimeout(150)
    const q2 = await qty.evaluate((el) => [el.selectionStart, el.selectionEnd])
    ok('g-zero a second press places the caret (a figure can still be edited in part)', q2[0] === q2[1], JSON.stringify(q2))
    await page.keyboard.press('Escape')
  })

  /* ── g-expanded: below-cost red figures; Preview in the expanded view; back returns expanded; P there ── */
  await step('g-expanded below cost', async () => {
    const id = itemId('TV console and feature wall')
    sql(`update quote_items set markup_minor = -(cost_minor / 4) where id = '${id}'`)
    await openEditor(page)
    const row = page.locator(`[data-item-id="${id}"]`)
    await center(row)
    const red = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--om-color-tertiary-red-default)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c })
    const unit = await row.locator('[data-col="unitPrice"] input').evaluate((el) => getComputedStyle(el).color)
    const total = await row.locator('[role="cell"] span').filter({ hasText: /^S\$/ }).last().evaluate((el) => getComputedStyle(el).color)
    ok('g-expanded a line under its cost: the Below cost tag stays', await row.getByTestId('below-cost').isVisible())
    ok('g-expanded …and its Unit Price and Total read in the error red', unit === red && total === red, `${unit} · ${total} vs ${red}`)
    const other = await page.locator(`[data-item-id="${itemId('Haulage and debris disposal')}"] [data-col="unitPrice"] input`).evaluate((el) => getComputedStyle(el).color)
    ok('g-expanded a line above its cost keeps the ink', other !== red, other)
    const b = await row.boundingBox()
    await shot(page, 'g-expanded-below-cost-red', { x: 0, y: Math.max(0, b.y - 80), width: 1440, height: 260 })
  })
  await step('g-expanded preview round trip', async () => {
    await page.locator('#section-items').getByRole('button', { name: 'Expand', exact: true }).click(); await page.waitForTimeout(500)
    const layer = page.locator('[data-items-expanded]')
    const preview = layer.getByRole('button', { name: 'Preview', exact: true })
    ok('g-expanded the expanded view carries Preview', await preview.isVisible())
    await shot(page, 'g-expanded-preview-button', { x: 0, y: 0, width: 1440, height: 200 })
    await preview.click()
    await page.waitForURL(/\/preview/); await ready(page)
    ok('g-expanded Preview opens the quote’s preview', /\/quotes\/[^/]+\/preview/.test(page.url()))
    await page.getByRole('button', { name: 'Back to the editor' }).click()
    await page.waitForURL(/\/quotes\/[^/]+(\?|$)/); await page.getByTestId('quote-editor').waitFor()
    ok('g-expanded back from Preview, the Items card is expanded again', await until(() => page.locator('[data-items-expanded]').isVisible()))
    await page.waitForTimeout(500)
    await shot(page, 'g-expanded-back-expanded')
    await page.locator('[data-items-expanded]').getByRole('button', { name: 'Collapse', exact: true }).focus()
    await page.keyboard.press('p')
    ok('g-expanded P works in the expanded view', await until(() => /\/preview/.test(page.url())))
  })

  /* ── g-jumpto: an empty Find lists the quote's sections; a pick scrolls there and pulses it ── */
  await step('g-jumpto', async () => {
    await page.goto(EDITOR); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    if (await page.locator('[data-items-expanded]').isVisible()) await page.locator('[data-items-expanded]').getByRole('button', { name: 'Collapse', exact: true }).click()
    await page.locator('#section-items').getByRole('button', { name: 'Find items' }).click(); await page.waitForTimeout(400)
    const list = page.getByTestId('jump-to')
    ok('g-jumpto an empty Find shows "Jump to" with the sections', await list.isVisible() && /Jump to/i.test(await list.innerText()) && /Bathrooms/.test(await list.innerText()) && /Bedrooms/.test(await list.innerText()))
    { const lb = await list.boundingBox(); await shot(page, 'g-jumpto-list', { x: Math.max(0, lb.x - 300), y: Math.max(0, lb.y - 90), width: 760, height: Math.min(1024 - Math.max(0, lb.y - 90), lb.height + 130) }) }
    await list.getByRole('menuitem', { name: 'Bedrooms' }).click()
    const row = page.locator(`[data-item-id="${BEDROOMS}"]`)
    ok('g-jumpto the pick pulses the section row', await until(() => row.evaluate((el) => el.hasAttribute('data-fresh'))))
    const inView = await row.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })
    ok('g-jumpto …in view', inView)
    await page.locator('#section-items').getByRole('button', { name: 'Find items' }).click(); await page.waitForTimeout(300)
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200)
    ok('g-jumpto ↓ from the box steps into the list', await page.evaluate(() => !!document.activeElement?.closest('[data-testid="jump-to"]')))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.locator('#section-items').getByRole('searchbox', { name: 'Find items' }).click(); await page.waitForTimeout(200)
    await page.keyboard.type('vinyl'); await page.waitForTimeout(300)
    ok('g-jumpto typing hides the list and Find filters as before', !(await page.getByTestId('jump-to').isVisible().catch(() => false)))
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── g-categories: View by › Category — + on a bucket, a line dropped on another bucket (+ Undo), a bucket dragged ── */
  await step('g-categories', async () => {
    await page.goto(EDITOR); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    await viewBy(page, 'Category')
    const flooring = page.locator('[data-bucket="Flooring"]')
    await center(flooring)
    ok('g-categories every category bucket carries a + (Add item to …)', await flooring.getByRole('button', { name: 'Add item to Flooring' }).isVisible())
    await shot(page, 'g-categories-buckets', { x: 0, y: Math.max(0, (await flooring.boundingBox()).y - 160), width: 1440, height: 420 })
    const before = Number(sql(`select count(*) from quote_items where quote_id = '${Q}' and category = 'Flooring'`))
    await flooring.getByRole('button', { name: 'Add item to Flooring' }).click()
    await page.waitForTimeout(400)
    ok('g-categories the + adds a line in that category', await until(() => Number(sql(`select count(*) from quote_items where quote_id = '${Q}' and category = 'Flooring'`)) === before + 1), `${before} → ${sql(`select count(*) from quote_items where quote_id = '${Q}' and category = 'Flooring'`)} · ${await snackText(page)}`)
    ok('g-categories …with its name ready to type', await until(() => page.evaluate(() => document.activeElement?.hasAttribute('data-name') ?? false)))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    /* a line onto another bucket */
    const vinyl = itemId('Vinyl flooring, supply and install')
    const masonry = page.locator('[data-bucket="Masonry"]')
    await center(page.locator(`[data-item-id="${vinyl}"]`))
    const mb = await masonry.boundingBox()
    await drag(page, page.locator(`[data-item-id="${vinyl}"]`).getByRole('button', { name: /^Drag to reorder/ }), { x: mb.x + 400, y: mb.y + mb.height / 2 })
    const t = await snack(page, /Moved to Masonry/)
    ok('g-categories a line dropped on another category says so, with Undo', /Moved to Masonry/.test(t) && /Undo/.test(t), t)
    ok('g-categories …and takes that category', await until(() => sql(`select category from quote_items where id = '${vinyl}'`) === 'Masonry'))
    await shot(page, 'g-categories-dropped', { x: 0, y: Math.max(0, mb.y - 160), width: 1440, height: 420 })
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click()
    ok('g-categories Undo gives it back its own', await until(() => sql(`select category from quote_items where id = '${vinyl}'`) === 'Flooring'))
    /* a bucket by its handle: Painting above Hacking */
    await page.waitForTimeout(800)
    const order0 = await page.evaluate(() => [...document.querySelectorAll('[data-bucket]')].map((b) => b.getAttribute('data-bucket')))
    await page.locator('#section-items').getByRole('button', { name: 'Collapse All', exact: true }).click(); await page.waitForTimeout(400)   // every bucket folded: the titles fit on one screen
    const hacking = page.locator('[data-bucket="Hacking"]')
    await center(hacking)
    const painting = page.locator('[data-bucket="Painting"]')
    const hb = await hacking.boundingBox()
    await drag(page, painting.getByRole('button', { name: 'Drag to reorder Painting' }), { x: hb.x + 400, y: hb.y + 4 })
    const order1 = await page.evaluate(() => [...document.querySelectorAll('[data-bucket]')].map((b) => b.getAttribute('data-bucket')))
    ok('g-categories a bucket dragged by its handle moves with its lines', order1.indexOf('Painting') < order1.indexOf('Hacking') && order0.indexOf('Painting') > order0.indexOf('Hacking'), order1.slice(0, 6).join(' · '))
    ok('g-categories …and the quote keeps the order', await until(() => { const j = sql(`select items_labels from quotes where id = '${Q}'`); try { const o = JSON.parse(j).categoryOrder || []; return o.indexOf('Painting') >= 0 && o.indexOf('Painting') < o.indexOf('Hacking') } catch { return false } }))
    await page.reload(); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const order2 = await page.evaluate(() => [...document.querySelectorAll('[data-bucket]')].map((b) => b.getAttribute('data-bucket')))
    ok('g-categories …after a reload too; Uncategorized stays last', order2.indexOf('Painting') < order2.indexOf('Hacking') && order2[order2.length - 1] === 'Uncategorized', order2.join(' · '))
    /* Jump to lists the categories in this view */
    await page.locator('#section-items').getByRole('button', { name: 'Find items' }).click(); await page.waitForTimeout(400)
    ok('g-jumpto in View by › Category the list is the categories', /Painting/.test(await page.getByTestId('jump-to').innerText()) && /Masonry/.test(await page.getByTestId('jump-to').innerText()))
    await page.getByTestId('jump-to').getByRole('menuitem', { name: 'Masonry' }).click()
    ok('g-jumpto …a pick pulses that bucket', await until(() => page.locator('[data-bucket="Masonry"]').evaluate((el) => el.hasAttribute('data-fresh'))))
    await viewBy(page, 'None')
  })
  await step('g-categories R67', async () => {
    ok('g-categories R67 Default Quote PDF’s new quotes open with Category (published + its version)', sql(`select count(*) from quote_templates t join quote_template_versions v on v.template_id = t.id and v.version = t.version where t.name = 'Default Quote PDF' and json_extract(t.defaults_json, '$.columns') like '%"category"%' and json_extract(v.defaults_json, '$.columns') like '%"category"%'`) === '1')
  })

  /* ── t-6.03: the ▾ list says whose quotes it lists ── */
  await step('t-6.03', async () => {
    await page.goto(EDITOR); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    await page.getByRole('button', { name: /switch quote$/ }).click(); await page.waitForTimeout(300)
    const label = await page.locator('[data-menu-label]').first().textContent()
    ok('t-6.03 the quote switcher is headed “Olivia Martinez’s quotes”', label === 'Olivia Martinez’s quotes', label)
    await shot(page, 't-6-03-switch-heading', { x: 0, y: 0, width: 760, height: 300 })
    await page.keyboard.press('Escape')
  })

  /* ── g-snackbar: Save as Template says where it went ── */
  await step('g-snackbar', async () => {
    await page.getByRole('button', { name: 'More options', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Save as Template' }).click()
    await page.getByRole('button', { name: 'Save template' }).click()
    const t = await snack(page, /Saved as a draft/)
    ok('g-snackbar “Saved as a draft in Company › Templates › Quotes” · Open', /Saved as a draft in Company › Templates › Quotes/.test(t) && /Open/.test(t), t)
    const box = await page.locator('[role="status"][aria-live="polite"]').boundingBox()
    ok('g-snackbar …on one line in the 48 snackbar', !!box && box.height <= 52, box ? String(Math.round(box.height)) : '')
    await shot(page, 'g-snackbar-save-as-template', box ? { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(1440, box.width + 40), height: box.height + 40 } : undefined)
  })

  /* ── g-merge-fields: My Templates' merge-field menu reads "Insert a field" ── */
  await step('g-merge-fields', async () => {
    await page.getByRole('tab', { name: 'Terms and Conditions' }).click(); await page.waitForTimeout(800)
    await page.locator('#section-terms').getByRole('button', { name: 'My Templates' }).first().click()
    await page.getByRole('button', { name: 'Create New' }).click(); await page.waitForTimeout(400)
    const trig = page.getByRole('button', { name: 'Insert a field' })
    ok('g-merge-fields the menu is “Insert a field”', await trig.isVisible())
    await trig.click(); await page.waitForTimeout(300)
    ok('g-merge-fields …its fields are as they were', await page.getByRole('menuitem', { name: 'Client Full Name' }).isVisible())
    await shot(page, 'g-merge-fields-insert-a-field')
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape')
  })

  /* ── g-signature: Upload — a 2 MB file refused, a PNG under 1 MB saved and drawn wherever a drawn one is ── */
  await step('g-signature', async () => {
    sql(`update members set signature_kind = null, signature_name = null, signature_data = null where is_you = 1`)
    sql(`update quotes set template_id = '${TPL_4ROOM}', template_version = 1 where id = '${Q}'`)
    const sigPage = await ctx.newPage()
    await sigPage.setContent('<div id="s" style="width:320px;height:90px;background:#fff;display:flex;align-items:center;justify-content:center;font:italic 44px Georgia">Dane Lim</div>')
    const png = await sigPage.locator('#s').screenshot({ type: 'png' })
    await sigPage.close()
    await page.goto(`${BASE}/company/members`); await ready(page)
    ok('g-signature Members says “Signature: not set” while it isn’t', /Signature: not set/.test(await page.locator('body').innerText()))
    await page.goto(`${EDITOR}/preview`); await ready(page)
    ok('g-signature Preview’s readiness asks for it (the template prints your signature)', /Your signature isn’t set up/.test(await page.locator('body').innerText()))
    await openEditor(page)
    await page.getByRole('tab', { name: 'Signature' }).click(); await page.waitForTimeout(900)
    const sec = page.locator('#section-signature')
    ok('g-signature the section offers Draw · Type · Upload', await sec.getByRole('button', { name: 'Upload' }).isVisible())
    await shot(page, 'g-signature-three-choices', { x: 0, y: Math.max(0, (await sec.boundingBox()).y - 10), width: 1440, height: 320 })
    await sec.getByRole('button', { name: 'Upload' }).click()
    const dlg = page.getByRole('dialog', { name: 'Signature Settings' })
    await dlg.waitFor()
    ok('g-signature Signature Settings opens on Upload', await dlg.getByRole('radio', { name: 'Upload' }).isChecked())
    ok('g-signature …with the rule under the box', /PNG is best, or a JPG on a white background · up to 1 MB/.test(await dlg.getByTestId('signature-upload-note').innerText()))
    await dlg.getByTestId('signature-file').setInputFiles({ name: 'scan.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024, 7) })
    await page.waitForTimeout(300)
    ok('g-signature a 2 MB picture is refused, said under the box', (await dlg.getByTestId('signature-upload-note').innerText()) === 'That picture is over 1 MB — choose a smaller one' && await dlg.getByRole('button', { name: 'Save' }).isDisabled())
    await shot(page, 'g-signature-2mb-refused')
    await dlg.getByTestId('signature-file').setInputFiles({ name: 'signature.png', mimeType: 'image/png', buffer: png })
    ok('g-signature a PNG under 1 MB shows in the box', await until(() => dlg.locator('img[alt="Your signature"]').isVisible()))
    await shot(page, 'g-signature-upload-picked')
    await dlg.getByRole('button', { name: 'Save' }).click()
    const t = await snack(page, /Signature saved/)
    ok('g-signature Save saves it', /Signature saved/.test(t), t)
    ok('g-signature …as an uploaded picture on the member', await until(() => sql(`select signature_kind || '|' || substr(signature_data, 1, 22) from members where is_you = 1`) === 'image|data:image/png;base64,'))
    ok('g-signature the section shows the picture', await sec.getByTestId('signature-picture').isVisible())
    await shot(page, 'g-signature-saved', { x: 0, y: Math.max(0, (await sec.boundingBox()).y - 10), width: 1440, height: 320 })
    /* the print / Preview */
    await page.goto(`${EDITOR}/preview`); await ready(page)
    const printed = await page.locator('img[src^="data:image/png"]').count()
    ok('g-signature the quote’s Preview prints the uploaded signature', printed > 0, `${printed}`)
    ok('g-signature …and its readiness counts the signature as set', !/Your signature isn’t set up/.test(await page.locator('body').innerText()))
    const img = page.locator('img[src^="data:image/png"]').first()
    await img.scrollIntoViewIfNeeded(); const ib = await img.boundingBox()
    await shot(page, 'g-signature-preview-print', { x: Math.max(0, ib.x - 300), y: Math.max(0, ib.y - 200), width: 900, height: 360 })
    /* the contract paper */
    await page.goto(`${BASE}/contracts/${CONTRACT}/preview`); await ready(page)
    const onPaper = await page.locator('[data-testid="contract-paper"] img[src^="data:image/png"]').count()
    ok('g-signature a contract’s paper draws it in the studio box', onPaper > 0, `${onPaper}`)
    if (onPaper) { const p = page.locator('[data-testid="contract-paper"] img[src^="data:image/png"]').first(); await p.scrollIntoViewIfNeeded(); const pb = await p.boundingBox(); await shot(page, 'g-signature-contract-paper', { x: Math.max(0, pb.x - 200), y: Math.max(0, pb.y - 160), width: 760, height: 300 }) }
    /* the copy kept at signing reads it the same way */
    const snap = execSync(`npx tsx -e "import { studioSignatureFor } from './lib/contracts/snapshot'; const s = studioSignatureFor('dane', [{ id: 'dane', name: 'Dane', signatureKind: 'image', signatureName: 'Dane', signatureData: 'data:image/png;base64,iVBORw0KGgo=' }], 'dane'); console.log(s ? s.kind : 'none')"`, { cwd: path.resolve(__dirname, '../../../..') }).toString().trim()
    ok('g-signature the signed copy keeps an uploaded signature (snapshot)', snap === 'image', snap)
    await page.goto(`${BASE}/company/members`); await ready(page)
    ok('g-signature Members no longer says “not set” for you', !(await page.locator('[data-testid="member-signature"]').filter({ hasText: 'Set it up' }).count()))
  })

  /* ── g-createclient: Tools › Quotes › Create Quote — the Client field first, searchable; Upload refused before a client, no charge ── */
  await step('g-createclient', async () => {
    await page.goto(`${BASE}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'Create Quote' }).first().click()
    const modal = page.getByTestId('create-quote'); await modal.waitFor(); await page.waitForTimeout(600)
    const focused = await page.evaluate(() => { const a = document.activeElement; return a?.getAttribute('role') === 'combobox' && (document.getElementById(a.getAttribute('aria-labelledby') || '')?.textContent || '').startsWith('Client') })
    ok('g-createclient the Client field has the focus as Create Quote opens', focused)
    await shot(page, 'g-createclient-focused')
    const ledger0 = sql(`select count(*) from credit_ledger`)
    let chooser = false
    page.once('filechooser', () => { chooser = true })
    await modal.getByTestId('upload-quote-row').click(); await page.waitForTimeout(700)
    ok('g-createclient Upload a quote asks for the client first — no file chooser', !chooser && /Choose a client first/.test(await modal.innerText()))
    ok('g-createclient …and no AI credits are taken', sql(`select count(*) from credit_ledger`) === ledger0)
    await shot(page, 'g-createclient-upload-needs-client')
    await page.keyboard.type('tan', { delay: 80 }); await page.waitForTimeout(400)
    const search = page.getByRole('searchbox', { name: 'Search Client' })
    ok('g-createclient typing opens the list with a search box holding the words', await search.isVisible() && (await search.inputValue()) === 'tan', await search.inputValue().catch(() => ''))
    const opts = await page.locator('[data-om-menu] [role="option"]').allInnerTexts()
    const all = Number(sql(`select count(*) from leads where deleted_at is null`))
    ok('g-createclient the list narrows to names holding “tan” anywhere — Gerald Tan among them', opts.includes('Gerald Tan') && opts.every((o) => /tan/i.test(o)) && opts.length < all, opts.join(' · '))
    await shot(page, 'g-createclient-search-tan')
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150)
    ok('g-createclient ↓ steps from the search box into the matches', (await page.evaluate(() => document.activeElement?.textContent)) === 'Gerald Tan')
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150)
    ok('g-createclient ↑ from the first match returns to the box', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Search Client'))
    await search.fill('zzqx'); await page.waitForTimeout(200)
    ok('g-createclient no match says “No matches”', /No matches/.test(await page.locator('[data-om-menu]').innerText()))
    await search.fill('gerald t'); await page.keyboard.press('Enter'); await page.waitForTimeout(400)
    ok('g-createclient Enter takes the first match', /Gerald Tan/.test(await modal.getByRole('combobox').innerText()))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── x-phonetabs: on a phone the line's sheet shows Cost and Markup only while the table does ── */
  await step('x-phonetabs', async () => {
    const cols = JSON.stringify({ details: { description: true, images: true, autonumber: true }, columns: ['qty', 'unit', 'unitPrice', 'discount', 'gst'].map((key) => ({ key, on: true })).concat(['cost', 'markup'].map((key) => ({ key, on: false }))) })
    sql(`update quotes set items_columns = '${cols}' where id = '${Q}'`)
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    await p.goto(EDITOR); await p.getByTestId('quote-editor').waitFor(); await ready(p)
    ok('g-sections-trade the note shows on a phone too', await p.getByTestId('print-note').isVisible())
    ok('the editor never scrolls sideways at 390', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await p.getByTestId('print-note').evaluate((el) => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300)
    await p.screenshot({ path: path.join(OUT, 'g-sections-trade-note-phone.png') })
    const card = p.locator(`[data-testid="item-card"][data-item-id="${itemId('Haulage and debris disposal')}"]`)
    await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name: /^Edit / }).click()
    const sheet = p.getByTestId('line-sheet'); await sheet.waitFor(); await p.waitForTimeout(500)
    const t = await sheet.innerText()
    ok('x-phonetabs with the Cost column off the sheet shows no Cost or Markup', !/Cost \(S\$\)/.test(t) && !/Markup \(S\$\)/.test(t) && /Unit price \(S\$\)/.test(t))
    await p.screenshot({ path: path.join(OUT, 'x-phonetabs-sheet-cost-off.png') })
    await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300)
    sql(`update quotes set items_columns = null where id = '${Q}'`)
    await p.reload(); await p.getByTestId('quote-editor').waitFor(); await ready(p)
    await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name: /^Edit / }).click(); await p.getByTestId('line-sheet').waitFor(); await p.waitForTimeout(400)
    const t2 = await p.getByTestId('line-sheet').innerText()
    ok('x-phonetabs with it on, they are back', /Cost \(S\$\)/.test(t2) && /Markup \(S\$\)/.test(t2))
    /* the quote switcher's heading on a phone is the sheet's */
    await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(300)
    await p.getByRole('button', { name: /switch quote$/ }).click(); await p.waitForTimeout(500)
    ok('t-6.03 on a phone the sheet is headed the same', await until(() => p.locator('body').innerText().then((t) => /Olivia Martinez’s quotes/.test(t))))
    await p.screenshot({ path: path.join(OUT, 't-6-03-phone-sheet.png') })
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    /* Signature Settings on a phone: three choices, nothing runs past the sheet */
    await p.getByRole('tab', { name: 'Signature' }).click(); await p.waitForTimeout(900)
    await p.locator('#section-signature').getByRole('button', { name: 'Edit' }).click()
    const dlg = p.getByRole('dialog', { name: 'Signature Settings' }); await dlg.waitFor(); await p.waitForTimeout(500)
    ok('g-signature on a phone the three choices fit the sheet', await dlg.getByRole('radio', { name: 'Upload' }).isVisible() && await dlg.evaluate((el) => [...el.querySelectorAll('*')].every((c) => c.getBoundingClientRect().right <= innerWidth + 1)))
    await p.screenshot({ path: path.join(OUT, 'g-signature-phone.png') })
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    /* Create Quote on a phone: the Client list searches the same way */
    await p.goto(`${BASE}/quotes`); await ready(p)
    await p.getByRole('button', { name: 'Create Quote' }).first().click()
    await p.getByTestId('create-quote').waitFor(); await p.waitForTimeout(700)
    await p.getByTestId('create-quote').getByRole('combobox').click(); await p.waitForTimeout(300)
    await p.keyboard.type('tan', { delay: 80 }); await p.waitForTimeout(300)
    const phoneOpts = await p.locator('[data-om-menu] [role="option"]').allInnerTexts()
    ok('g-createclient on a phone the Client list narrows as typed', phoneOpts.length > 0 && phoneOpts.every((o) => /tan/i.test(o)), phoneOpts.join(' · '))
    await p.screenshot({ path: path.join(OUT, 'g-createclient-phone.png') })
    await phone.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
})()
