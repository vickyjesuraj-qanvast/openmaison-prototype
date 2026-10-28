// Quote X-Ray parity round 2 (REG-639) — reading the files, finding the way: spreadsheets read for real and every file read on pick
// (names by whole words, types and size); the setup's picks (find as you type, one quote chosen, an empty quote refused, a lead with
// no quote, Upload stays with the lead); crumbs, Back and scope everywhere; the quote rows' menus; every comparison in Recent with a
// search; the house pieces (own ghosts, the FAB clearance, three pins, the file row, the phone card's label).
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const FILES = `${S}/xr-files`; fs.mkdirSync(FILES, { recursive: true })
const referenceBytes = require(require('path').resolve(__dirname, '../../..', 'design-source/verify/x-ray-parity/fixtures/reference-file.cjs'))   // (S42 E-05) a reference quote is read by its words, never its name
const file = (name, body = '%PDF-1.4 probe') => { const p = `${FILES}/${name}`; fs.writeFileSync(p, body === '%PDF-1.4 probe' ? referenceBytes(name) ?? body : body); return p }
const VIV = sql(`select id from leads where name='Vivien Lee'`), OLIVIA = sql(`select id from leads where name='Olivia Martinez'`), ARJUN = sql(`select id from leads where name='Arjun Mehta'`)
const Q8 = sql(`select id from quotes where number='OM-10008'`), Q1 = sql(`select id from quotes where number='OM-10001'`)
const CSV = 'Item,Qty,Unit,Unit price,Trade,Room\nKitchen top and bottom cabinets,30,ft run,220,Carpentry,Kitchen\nQuartz countertop,12,ft run,190,Carpentry,Kitchen\nVinyl flooring supply and lay,900,sqft,6.5,Flooring,Living Room\nPainting to the entire unit,1,Lot,1800,Painting,Whole unit\nLighting points,20,point,60,Electrical,Whole unit\n'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-xr2/${n}.png` })
  const setup = () => page.getByTestId('xray-setup')

  await step('a file is read the moment it is picked', async () => {
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    const input = () => setup().locator('input[type=file]').last()
    await input().setInputFiles(file('floor plan.pdf')); await page.waitForTimeout(900)
    ok('"floor plan.pdf" is not Flo Design — unreadable, said at once', /We couldn’t read this one — a spreadsheet of their quote reads best\./.test(await setup().innerText()) && (await setup().getByTestId('xray-file').count()) === 0)
    await input().setInputFiles(file('site notes.docx', 'x')); await page.waitForTimeout(400)
    ok('a Word file is refused by type', /We can read PDF, PNG, JPG, WebP, CSV and XLSX files\./.test(await setup().innerText()))
    const big = `${FILES}/huge scan.pdf`; fs.writeFileSync(big, Buffer.alloc(10.5 * 1024 * 1024))
    await input().setInputFiles(big); await page.waitForTimeout(400)
    ok('over 10 MB is refused by size', /huge scan\.pdf is over 10 MB\./.test(await setup().innerText()))
    await input().setInputFiles(file('Flo Design Sample Quotation.pdf')); await page.waitForTimeout(1200)
    const tile = setup().getByTestId('xray-file')
    ok('a reference reads as its studio, lines and total', /28 items\s*read from Flo Design’s quote · S\$31,140\.00/.test(await tile.innerText()), (await tile.innerText()).replace(/\n/g, ' '))
    ok('the file row has no stock thumbnail', (await setup().locator('img').count()) === 0)
    await shot('01-read-on-pick')
  })

  await step('a spreadsheet is read for real, named by the studio', async () => {
    await setup().getByRole('button', { name: /^Remove Flo Design/ }).click()
    await setup().locator('input[type=file]').last().setInputFiles(file('acme-quote.csv', CSV)); await page.waitForTimeout(1200)
    const t = await setup().getByTestId('xray-file').innerText()
    ok('five lines read, S$17,730.00', /5 items\s*read · S\$17,730\.00/.test(t), t.replace(/\n/g, ' '))   // (the calm UI build 2026-10-27, a deliberate change) — T-01: a quote's lines are items
    await setup().getByRole('textbox', { name: /Their studio’s name/ }).fill('Acme Interiors')
    await setup().getByRole('combobox', { name: 'Lead' }).click()
    await page.keyboard.type('viv'); await page.waitForTimeout(200)
    // REG-858 (Dane UAT 6.41): a long select is searchable — the typed letters go in its search box and narrow the list
    const opts = (await page.getByRole('option').allInnerTexts()).map((o) => o.trim()).filter(Boolean)
    ok('the lead list finds as you type', opts.some((o) => /Vivien Lee/.test(o)) && opts.every((o) => /viv/i.test(o)), opts.join(' | '))
    await page.keyboard.press('Enter'); await page.waitForTimeout(400)
    ok('a lead with one quote has it chosen', (await setup().getByRole('radio', { name: /OM-10008/ }).getAttribute('aria-checked')) === 'true')
    await setup().getByRole('button', { name: 'Compare' }).click()
    await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
    const id = page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    /* (the calm UI build 2026-10-27, a deliberate change) — W-425: the heading is "Yours vs Acme Interiors" where the crumb names the lead */
    ok('the record names the studio from the field', /^(Yours|Vivien Lee ·) vs Acme Interiors$/.test((await page.locator('h1').first().innerText()).trim()) && /Vivien Lee/.test(await page.locator('h1').first().locator('xpath=ancestor::header[1]').innerText()) && sql(`select other_studio from quote_comparisons where id='${id}'`) === 'Acme Interiors')
    const r = JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`))
    ok('the sheet’s lines are what the reading compared', r.theirsMinor === 1773000 && r.rows.some((x) => x.status === 'matched' && /Kitchen carpentry/.test(x.name) && /Kitchen top and bottom cabinets/.test(x.theirName)))
    await shot('02-sheet-record')
  })

  await step('the record keeps its lead: crumbs, Back and New comparison', async () => {
    const crumbs = await page.locator('nav[aria-label="Breadcrumb"], [class*="crumbs"]').first().innerText().catch(() => '')
    ok('the crumbs name the lead and its X-Ray page', /Vivien Lee/.test(crumbs) && /Quote X-Ray/.test(crumbs), crumbs.replace(/\n/g, ' '))
    await page.getByRole('link', { name: 'Quote X-Ray', exact: true }).filter({ hasText: 'Quote X-Ray' }).first().click(); await ready(page)   // the crumb, not the Back arrow
    ok('the X-Ray crumb opens the lead’s own X-Ray page', new URL(page.url()).searchParams.get('lead') === VIV)
    await page.goBack(); await ready(page)
    await page.getByRole('button', { name: 'New comparison' }).click(); await ready(page)
    ok('New comparison stays with the lead', new URL(page.url()).searchParams.get('lead') === VIV && (await page.getByTestId('xray-lead').count()) === 1)
  })

  await step('a run from the lead’s page comes back to it', async () => {
    await page.goto(`${BASE}/quote-x-ray?lead=${VIV}&from=${encodeURIComponent(`/leads/${VIV}`)}`); await ready(page)
    await setup().locator('input[type=file]').last().setInputFiles(file('Cove Interior Quotation.pdf')); await page.waitForTimeout(1200)
    await setup().getByRole('button', { name: 'Compare' }).click()
    await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
    await page.getByRole('link', { name: 'Back' }).first().click().catch(async () => { await page.getByRole('button', { name: 'Back' }).first().click() })
    await ready(page)
    ok('Back returns to the lead’s X-Ray page, scope and all', new URL(page.url()).searchParams.get('lead') === VIV, page.url())
    const row = page.getByTestId('xray-recent').first()
    const href = await row.getByRole('link').getAttribute('href')
    ok('a Recent row there carries that page as its way back', decodeURIComponent(href).includes(`/quote-x-ray?lead=${VIV}`))
  })

  await step('a lead with no quote: Create a quote, or upload yours and stay with the lead', async () => {
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    await setup().getByRole('combobox', { name: 'Lead' }).click(); await page.getByRole('option', { name: /^Arjun Mehta/ }).click()
    const none = setup().getByTestId('xray-no-quote')
    ok('says so, with the two ways on', /Arjun Mehta has no quote yet\./.test(await none.innerText()) && await none.getByRole('button', { name: 'Create a quote' }).isVisible())
    await page.waitForTimeout(700); if (await page.getByRole('option').count()) await page.keyboard.press('Escape')
    await shot('03-no-quote')
    await none.getByRole('button', { name: 'Upload your quote instead' }).click(); await page.waitForTimeout(400)
    ok('Upload two quotes, the lead kept', (await setup().getByTestId('xray-lead').innerText()).includes('Arjun Mehta'))
    await setup().locator('input[type=file]').first().setInputFiles(file('Dyel Sales Contract.pdf')); await page.waitForTimeout(1100)
    await setup().locator('input[type=file]').first().setInputFiles(file('Flo Design Sample Quotation.pdf')); await page.waitForTimeout(1100)
    await setup().getByRole('button', { name: 'Compare' }).click()
    await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
    const id = page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    ok('the upload run is stored on the lead', sql(`select lead_id from quote_comparisons where id='${id}'`) === ARJUN)
  })

  await step('a quote with nothing to compare can’t be chosen; a stray ?quote= isn’t', async () => {
    sql(`insert into quotes (id, lead_id, number, title, status, amount_minor, created_at, updated_at, visibility) values ('probe-empty-q', '${ARJUN}', 'OM-19999', 'Empty draft', 'Draft', 0, strftime('%s','now'), strftime('%s','now'), 'Private')`)
    await page.goto(`${BASE}/quote-x-ray?lead=${ARJUN}&quote=${Q8}`); await ready(page)
    ok('another lead’s quote from the address is not chosen', (await setup().getByRole('radio', { name: /OM-/, checked: true }).count()) === 0)
    ok('the empty quote says why', /Arjun Mehta’s quotes have no items to compare yet\./.test(await setup().innerText()))
    sql(`delete from quotes where id='probe-empty-q'`)
  })

  await step('the quote rows offer Compare with another quote', async () => {
    await page.goto(`${BASE}/leads/${VIV}/quotes`); await ready(page)
    await page.getByRole('row').nth(1).hover(); await page.getByRole('button', { name: /^More actions for/ }).first().click(); await page.waitForTimeout(500)
    await page.getByRole('menuitem', { name: 'Compare with another quote' }).click(); await ready(page)
    const u = new URL(page.url())
    ok('lands on the lead’s X-Ray with the quote chosen', u.pathname === '/quote-x-ray' && u.searchParams.get('quote') === Q8 && (await setup().getByRole('radio', { name: /OM-10008/ }).getAttribute('aria-checked')) === 'true')
    await page.getByRole('link', { name: 'Back' }).first().click().catch(async () => { await page.getByRole('button', { name: 'Back' }).first().click() }); await ready(page)
    ok('Back returns to the Quotes tab', new URL(page.url()).pathname === `/leads/${VIV}/quotes`)
    await page.goto(`${BASE}/quotes`); await ready(page)
    await page.getByRole('row').nth(1).hover(); await page.getByRole('button', { name: /^More actions for/ }).first().click()
    ok('Tools › Quotes too', await page.getByRole('menuitem', { name: 'Compare with another quote' }).isVisible())
    await page.keyboard.press('Escape')
  })

  await step('Activity’s comparison returns to Activity', async () => {
    await page.goto(`${BASE}/leads/${OLIVIA}/activity`); await ready(page)
    const link = page.getByRole('link', { name: /compared OM-10001/ }).first()
    const href = await link.getAttribute('href')
    ok('the link carries the Activity tab', decodeURIComponent(href).includes(`from=/leads/${OLIVIA}/activity`), href)
  })

  await step('every comparison in Recent, with a search', async () => {
    const src = sql(`select id from quote_comparisons where lead_id='${VIV}' limit 1`)
    for (let i = 0; i < 22; i += 1) sql(`insert into quote_comparisons (id, lead_id, quote_id, your_label, other_studio, other_file, result_json, created_by, created_at, inputs_json, engine) select 'probe-r-${i}', lead_id, quote_id, your_label, other_studio, other_file, result_json, created_by, strftime('%s','now') + ${i}, inputs_json, engine from quote_comparisons where id='${src}'`)
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    const all = Number(sql(`select count(*) from quote_comparisons`))
    ok('Recent lists every one, not 20', (await page.getByTestId('xray-recent').count()) === all, `${all}`)
    await page.getByRole('searchbox', { name: 'Search comparisons' }).fill('Cove'); await page.waitForTimeout(300)
    const n = await page.getByTestId('xray-recent').count()
    ok('the search narrows it', n > 0 && n < all && (await page.getByTestId('xray-recent').allInnerTexts()).every((t) => /Cove/.test(t)))
    await shot('04-recent-search')
    await page.goto(`${BASE}/quote-x-ray?lead=${OLIVIA}`); await ready(page)
    ok('Olivia’s own readings still show on her page (past the studio’s newest 20)', (await page.getByTestId('xray-recent').count()) === Number(sql(`select count(*) from quote_comparisons where lead_id='${OLIVIA}'`)))
    sql(`delete from quote_comparisons where id like 'probe-r-%'`)
  })

  await step('the house pieces', async () => {
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    const pad = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="xray-setup"]').parentElement.parentElement).paddingBottom)
    ok('the page ends clear of the FAB', pad === '88px', pad)
    const id = sql(`select id from quote_comparisons where quote_id='${Q8}' order by created_at limit 1`)
    await page.goto(`${BASE}/quote-x-ray/${id}`); await ready(page)
    await page.getByRole('button', { name: 'Column settings' }).click(); await page.waitForTimeout(500)
    ok('Column settings allows three pins', /3/.test(await page.getByRole('dialog').innerText()))
    await page.keyboard.press('Escape')
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await m.newPage(); await p.goto(`${BASE}/quote-x-ray/${id}`); await ready(p)
    const lbl = await p.locator('[data-testid="xray-row"] [data-col="theirs"]').first().evaluate((el) => getComputedStyle(el, '::before').content)
    ok('the phone card labels the other side’s figure', /^"?Flo Design"?$/.test(lbl.trim()), lbl)   // (sweep S3) the name sits over the figure
    await p.getByTestId('xray-items').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${S}/shots-xr2/05-phone-cards.png` })
    const w = await m.newPage(); await w.setViewportSize({ width: 320, height: 800 }); await w.goto(`${BASE}/quote-x-ray`); await ready(w)
    ok('no sideways scroll at 320 on the setup', (await w.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0)
    await m.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
