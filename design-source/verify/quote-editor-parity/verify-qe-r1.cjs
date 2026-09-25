// Quote editor parity round 1 (REG-623) — Playwright against :3011 on a test copy of the DB.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const OM1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'
const L = { vinyl: '6adba54e-bcc2-41e8-a700-b861d9166fe9', tv: '26c74ac4-04be-4e9e-a85e-143e9c90b7fd', elec: 'a1cd833b-2b4c-4ca3-a4ce-81fbef05883c', paint: 'c89dbab0-dbe9-4979-af40-6a7ff349e0d1', haul: '319b8bcb-75b3-4831-a462-630869a41c43', glass: '5d64a95b-c698-4631-a75c-e090d1bb5694', bath: 'd4b8a8e5-0319-40ca-ad7f-2a00a32f1ea9' }
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n')[0]) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 6000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const row = (page, id) => page.locator(`[data-item-id="${id}"]`).first()
async function drawerSwitch(page, label, on) {
  await page.getByRole('button', { name: 'Column settings' }).first().click()
  const sw = page.getByRole('switch', { name: `Show ${label} column` }).first()
  await sw.waitFor()
  if ((await sw.isChecked()) !== on) await sw.locator('xpath=ancestor::label[1]').click().catch(async () => { await sw.click({ force: true }) })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Done' }).last().click()
  await page.waitForTimeout(500)
}
const waitSave = (page) => page.waitForTimeout(1600)   // the 600 ms autosave + the write

;(async () => {
  // The rebate + one-line marks are set before the page loads, so the editor's own state carries them into its undo snapshots.
  sql(`update quote_items set rebate_minor = 500 where id = '${L.glass}'`)
  sql(`update quote_items set print_one_line = 1 where id = '${L.bath}'`)
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-qe/${n}.png` })

  await page.goto(`${BASE}/quotes/${OM1}`); await page.locator('#section-items').waitFor(); await ready(page)

  await step('columns: Vendor/Sub and Website Link switch on (no coming soon)', async () => {
    await drawerSwitch(page, 'Vendor/Sub', true)
    await drawerSwitch(page, 'Website Link', true)
    const heads = await page.getByRole('columnheader').allInnerTexts()
    ok('both heads drawn', heads.some((h) => /Vendor\/Sub/i.test(h)) && heads.some((h) => /Website Link/i.test(h)), heads.filter((h) => /vendor|website/i.test(h)).join(' · '))
    ok('the quote keeps them on', /"key":"vendor","on":true/.test(sql(`select items_columns from quotes where id='${OM1}'`)) && /"key":"website","on":true/.test(sql(`select items_columns from quotes where id='${OM1}'`)))
  })

  await step('vendor: a line from My Items shows its vendor (R46)', async () => {
    const t = await row(page, L.vinyl).locator('[data-col="vendor"]').innerText()
    ok('Vinyl flooring reads Floor Xpert', t.includes('Floor Xpert'), t)
  })

  await step('vendor: pick one from My Items’ vendors', async () => {
    const r = row(page, L.elec); await r.scrollIntoViewIfNeeded()
    await r.getByRole('button', { name: 'Add a vendor to Electrical point, new' }).click()
    const menu = page.getByRole('menu').last()
    const opts = await menu.getByRole('menuitemradio').allInnerTexts()
    ok('the menu lists the price book’s vendors', ['Floor Xpert', 'Hafary', 'Soon Bee Huat'].every((v) => opts.includes(v)), opts.join(' · '))
    await shot('01-vendor-menu')
    await menu.getByRole('menuitemradio', { name: 'Hafary', exact: true }).click()
    await waitSave(page)
    ok('stored on the line', sql(`select vendor from quote_items where id='${L.elec}'`) === 'Hafary')
  })

  await step('vendor: Add vendor names a new one', async () => {
    const r = row(page, L.tv); await r.scrollIntoViewIfNeeded()
    await r.getByRole('button', { name: 'Add a vendor to TV console and feature wall' }).click()
    await page.getByRole('menu').last().getByRole('menuitem', { name: /Add vendor/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Add vendor' }); await dlg.waitFor()
    await dlg.getByRole('textbox').first().fill('Woodcraft Carpentry')
    await dlg.getByRole('button', { name: /Save|Add|Done/ }).last().click()
    await waitSave(page)
    // (sweep S1 · U-04) the vendor added from a line lands on that line at once — no second pick
    ok('and lands on the line', sql(`select vendor from quote_items where id='${L.tv}'`) === 'Woodcraft Carpentry')
    await r.getByRole('button', { name: /^Vendor of TV console and feature wall/ }).click()
    const opts = await page.getByRole('menu').last().getByRole('menuitemradio').allInnerTexts()
    ok('the new vendor is offered', opts.includes('Woodcraft Carpentry'), opts.join(' · '))
    await page.keyboard.press('Escape')
  })

  await step('link: a bare address becomes https and opens', async () => {
    const r = row(page, L.haul); await r.scrollIntoViewIfNeeded()
    const input = r.getByLabel('Link for Haulage and debris disposal')
    await input.click(); await input.fill('hafary.com.sg/products/tiles'); await input.press('Tab')
    await waitSave(page)
    ok('stored with https://', sql(`select link from quote_items where id='${L.haul}'`) === 'https://hafary.com.sg/products/tiles')
    const shown = await input.inputValue()
    const open = r.getByRole('link', { name: /^Open hafary\.com\.sg/ })
    ok('the cell shows the short address and an Open link', shown === 'hafary.com.sg/products/…' && (await open.getAttribute('href')) === 'https://hafary.com.sg/products/tiles' && (await open.getAttribute('target')) === '_blank', shown)
  })

  await step('link: text that is not an address is refused, and says why', async () => {
    const r = row(page, L.paint); await r.scrollIntoViewIfNeeded()
    const input = r.getByLabel('Link for Painting, whole unit')
    await input.click(); await input.fill('see the brochure'); await input.press('Tab')
    await snack(page, 'Not a web address')
    await waitSave(page)
    ok('nothing stored', sql(`select ifnull(link,'') from quote_items where id='${L.paint}'`) === '')
    await shot('02-vendor-link-columns')
  })

  await step('Print as › By client', async () => {
    const before = await page.getByTestId('quote-totals').innerText()
    const r = row(page, L.paint); await r.scrollIntoViewIfNeeded(); await r.hover()
    await r.getByRole('button', { name: 'More options for Painting, whole unit' }).click()
    const menu = page.getByRole('menu').last()
    await menu.getByRole('menuitem', { name: /^Print as/ }).click()
    await shot('03-print-as-by-client')
    await menu.getByRole('menuitemradio', { name: /By client/ }).click()
    await snack(page, 'The line prints as By client — not counted')
    await waitSave(page)
    ok('stored as client', sql(`select print_as from quote_items where id='${L.paint}'`) === 'client')
    const total = await r.locator('[class*="colTotal"]').innerText()
    const struck = await r.locator('[data-struck]').first().evaluate((e) => getComputedStyle(e).textDecorationLine)
    ok('the Total cell reads By client over the struck figure', /By client/.test(total) && /S\$1,950\.00/.test(total) && struck === 'line-through', total.replace(/\n/g, ' '))
    const box = await r.locator('[data-struck]').first().boundingBox(), cell = await r.locator('[class*="colTotal"]').boundingBox()
    ok('the figure sits inside its cell (nothing clipped)', box.x >= cell.x + 4, `${Math.round(box.x)} ≥ ${Math.round(cell.x + 4)}`)
    const after = await page.getByTestId('quote-totals').innerText()
    const sub = (t) => Number((t.match(/Subtotal[\s\S]*?S\$([\d,]+\.\d\d)/) || [])[1]?.replace(/,/g, ''))
    ok('the subtotal drops by the line (S$1,950.00)', Math.abs(sub(before) - sub(after) - 1950) < 0.005, `${sub(before)} → ${sub(after)}`)
  })

  await step('below cost: the tag shows while the Cost column is on', async () => {
    const r = row(page, L.tv); await r.scrollIntoViewIfNeeded()
    const price = r.getByLabel('Unit price of TV console and feature wall')
    await price.click(); await price.fill('2000'); await price.press('Tab')
    await waitSave(page)
    const tag = r.getByTestId('below-cost')
    ok('Below cost on the TV console', await tag.isVisible())
    await tag.hover(); await page.waitForTimeout(500)
    await shot('04-below-cost')
    const tip = await page.getByRole('tooltip').last().innerText().catch(() => '')
    ok('its tooltip gives the figures', /Sells for S\$2,000\.00, costs S\$2,800\.00 — S\$800\.00 under its cost/.test(tip), tip)
    ok('no other line wears it', (await page.getByTestId('below-cost').count()) === 1)
    await drawerSwitch(page, 'Cost', false)
    ok('gone with the Cost column', (await r.getByTestId('below-cost').count()) === 0)
    await drawerSwitch(page, 'Cost', true)
    ok('back with it', (await r.getByTestId('below-cost').count()) === 1)
  })

  await step('By category: Share · Margin for the owner', async () => {
    const box = page.getByTestId('items-by-category'); await box.scrollIntoViewIfNeeded()
    const chips = box.getByTestId('bycat-mode')
    ok('the owner has the Share · Margin chips', await chips.isVisible())
    await chips.getByRole('radio', { name: 'Margin' }).click(); await page.waitForTimeout(300)
    const meta = await box.innerText()
    ok('the head says what the margin is', /margin before the quote’s discounts/.test(meta))
    // Carpentry by the lines as stored now (own category on every line): the maths' rule.
    const rows = sql(`select qty, cost_minor, markup_minor, discount_pct, rebate_minor, ifnull(print_as,''), optional, status from quote_items where quote_id='${OM1}' and kind='item' and category='Carpentry'`).split('\n').filter(Boolean).map((l) => l.split('|'))
    let rev = 0, cost = 0
    for (const [q, c, m, d, rb, pa, opt, st] of rows) {
      if (st === 'Declined' || opt === '1' || (pa && pa !== 'behalf')) continue
      const total = Math.round(Number(q) * (Number(c) + Number(m)) * (1 - Number(d) / 100)); const lc = Math.round(Number(q) * Number(c))
      rev += total; cost += lc - Math.min(lc, Math.round(Number(q) * Number(rb)))
    }
    const p = (rev - cost) / rev * 100
    const want = `${p < 10 ? p.toFixed(1) : Math.round(p)}%`
    const carp = box.getByTestId('items-share').filter({ has: page.getByText('Carpentry', { exact: true }) })
    const got = await carp.getByTestId('items-share-margin').innerText()
    ok('Carpentry’s margin matches the lines', got === want, `${got} (want ${want})`)
    await shot('05-by-category-margin')
    await chips.getByRole('radio', { name: 'Share' }).click()
  })

  await step('undo keeps one-line sections, rebates, vendors and links (§8.2 · E-32)', async () => {
    const r = row(page, L.elec); await r.scrollIntoViewIfNeeded()
    const qty = r.getByLabel('Quantity of Electrical point, new')
    await qty.click(); await qty.fill('47'); await qty.press('Tab')
    await waitSave(page)
    ok('the edit landed', sql(`select qty from quote_items where id='${L.elec}'`) === '47.0')
    await page.getByRole('button', { name: 'Undo', exact: true }).first().click()
    await page.waitForTimeout(2500)
    const q = sql(`select qty from quote_items where id='${L.elec}'`)
    const one = sql(`select print_one_line from quote_items where id='${L.bath}'`)
    const reb = sql(`select rebate_minor from quote_items where id='${L.glass}'`)
    const ven = sql(`select vendor from quote_items where id='${L.elec}'`)
    const link = sql(`select link from quote_items where id='${L.haul}'`)
    ok('undo wrote the lines back whole', q === '46.0' && one === '1' && reb === '500' && ven === 'Hafary' && link === 'https://hafary.com.sg/products/tiles', `qty ${q} · one line ${one} · rebate ${reb} · vendor ${ven} · link ${link}`)
  })

  await step('Preview prints By client and no vendor or link', async () => {
    await page.goto(`${BASE}/quotes/${OM1}/preview`); await ready(page)
    const txt = await page.locator('body').innerText()
    ok('By client prints in place of the amount', /By client/.test(txt))
    ok('the vendor and the link never print', !/Floor Xpert|Hafary|hafary\.com/.test(txt))
    await shot('06-preview-by-client')
  })

  await step('bulk Print as offers By client', async () => {
    await page.goto(`${BASE}/quotes/${OM1}`); await page.locator('#section-items').waitFor(); await ready(page)
    const r = row(page, L.haul); await r.scrollIntoViewIfNeeded()
    await r.getByRole('checkbox', { name: /Select Haulage/ }).click({ force: true })
    await page.getByRole('button', { name: 'Print as', exact: true }).click()
    const dlg = page.getByRole('dialog').last(); await dlg.waitFor()
    await dlg.getByRole('combobox', { name: /^In place of the amount/ }).click()
    const opts = await page.getByRole('option').allInnerTexts()
    ok('the dialog lists By client', opts.some((o) => /By client/.test(o)), opts.join(' · '))
    await page.keyboard.press('Escape')
    await dlg.getByRole('button', { name: 'Cancel' }).click().catch(async () => { await page.keyboard.press('Escape') })
  })

  /* ── the phone ── */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pp = await phone.newPage(); pp.setDefaultTimeout(12000)
  await step('phone: the card and the line sheet', async () => {
    await pp.goto(`${BASE}/quotes/${OM1}`); await pp.getByTestId('item-cards').waitFor(); await ready(pp)
    const card = pp.locator(`[data-testid="item-card"][data-item-id="${L.tv}"]`); await card.scrollIntoViewIfNeeded()
    ok('the TV console card says Below cost', (await card.getByTestId('below-cost').count()) === 1)
    await pp.screenshot({ path: `${S}/shots-qe/07-phone-card.png` })
    const el = pp.locator(`[data-testid="item-card"][data-item-id="${L.elec}"]`); await el.scrollIntoViewIfNeeded()
    await el.getByRole('button', { name: 'Edit Electrical point, new' }).click()
    const sheet = pp.getByTestId('line-sheet'); await sheet.waitFor(); await pp.waitForTimeout(400)
    await sheet.getByLabel('Website Link').scrollIntoViewIfNeeded()
    const vendorVal = await sheet.getByRole('combobox', { name: /^Vendor\/Sub/ }).innerText().catch(() => '')
    ok('the sheet has Vendor/Sub (Hafary) and Website Link', /Hafary/.test(vendorVal) && (await sheet.getByLabel('Website Link').count()) === 1, vendorVal)
    const d = await sheet.getByRole('button', { name: /^Description/ }).boundingBox()
    ok('the sheet keeps the 16px gutter', Math.round(d.x) === 16 && Math.round(d.x + d.width) === 390 - 16, `${Math.round(d.x)} … ${Math.round(d.x + d.width)}`)
    await pp.screenshot({ path: `${S}/shots-qe/08-phone-line-sheet.png` })
  })
  const narrow = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true })
  const np = await narrow.newPage()
  await step('320: no sideways scroll', async () => {
    await np.goto(`${BASE}/quotes/${OM1}`); await np.getByTestId('item-cards').waitFor(); await ready(np)
    const w = await np.evaluate(() => document.documentElement.scrollWidth)
    ok('page width ≤ 320', w <= 320, String(w))
  })
  const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
  const tp = await tab.newPage()
  await step('768 touch: the table with the new columns', async () => {
    await tp.goto(`${BASE}/quotes/${OM1}`); await tp.locator('#section-items').waitFor(); await ready(tp)
    await tp.locator(`[data-item-id="${L.haul}"]`).first().scrollIntoViewIfNeeded()
    await tp.screenshot({ path: `${S}/shots-qe/09-tablet.png` })
    ok('tablet renders the grid', (await tp.locator(`[data-item-id="${L.haul}"] [data-col="website"]`).count()) === 1)
  })
  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
