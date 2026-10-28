// UI sweep round S3 (REG-656) — Quote X-Ray: the setup card fills its column when stacked; the row's corrections sit in the parked
// kebab (not the Status cell), in view on a touch tablet; a phone card stacks each side's name over its figure; the quantity is the
// caption size; the send shows in the foot; Same item as… names each line's room and picks by id; one verb and one noun (Run again,
// comparison); "No price given" everywhere; the house apostrophe in the drafted words; per-side file errors; the delete rule's words.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const Q8 = sql(`select id from quotes where number='OM-10008'`)
const ID = sql(`select id from quote_comparisons where quote_id='${Q8}' and other_studio='Flo Design' order by created_at limit 1`)
const FILES = `${S}/sw3-files`; fs.mkdirSync(FILES, { recursive: true })
const referenceBytes = require(require('path').resolve(__dirname, '../../..', 'design-source/verify/x-ray-parity/fixtures/reference-file.cjs'))   // (S42 E-05) a reference quote is read by its words, never its name
const file = (name, body = '%PDF-1.4 probe') => { const p = `${FILES}/${name}`; fs.writeFileSync(p, body === '%PDF-1.4 probe' ? referenceBytes(name) ?? body : body); return p }

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-sw3/${n}.png` })

  await step('desktop record', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    sql(`update quote_comparisons set sent_at = strftime('%s','now') - 3600, sent_text = 'Hi — probe', sent_via = 'copy', sent_by = 'dane' where id='${ID}'`)
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    const row = page.getByTestId('xray-row').filter({ hasText: 'Kitchen backsplash' }).first()
    await row.scrollIntoViewIfNeeded(); await row.hover()
    const kebab = row.getByRole('button', { name: /^More actions for/ })
    ok('the kebab is parked in the row, not in the Status cell', await kebab.count() === 1 && await row.locator('[data-col="status"]').getByRole('button').count() === 0)
    const qty = await page.locator('[class*="qty"]').first().evaluate((e) => getComputedStyle(e).fontSize).catch(() => 'none')
    ok('the quantity line is the caption size', qty === '12px', qty)
    ok('the foot says it went to the client', /Sent to the client on/.test(await page.getByTestId('xray-foot').innerText()))
    ok('one name for a line with no price', !/FOC \/ Inclusive/.test(await page.getByTestId('xray-items').innerText()) && /No price\b/.test(await page.getByTestId('xray-items').innerText()))   // (the calm UI build 2026-10-27, a deliberate change) — 6-05 · W-256
    ok('the drafted words take the house apostrophe', !/n't|it's|I've/.test(await page.getByTestId('xray-points').innerText()))
    await kebab.click(); await page.getByRole('menuitem', { name: 'Same item as…' }).click()
    const dlg = page.getByRole('dialog', { name: 'Same item as…' }); await dlg.waitFor(); await page.waitForTimeout(300)
    await dlg.getByRole('combobox').click(); await page.waitForTimeout(250)
    const prompt = await dlg.getByRole('combobox').evaluate((e) => e.textContent ?? '')   // the Material select shows its prompt once opened
    ok('the prompt reads as a sentence', /Choose one of Flo Design’s lines/.test(prompt), prompt.trim().slice(0, 80))
    const opts = await page.getByRole('option').allInnerTexts()
    ok('every option reads apart (room or an ordinal)', new Set(opts).size === opts.length, `${opts.length} options`)
    await shot(page, '01-same-item-as')
    await page.keyboard.press('Escape'); await page.waitForTimeout(250)
    await dlg.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(250)
    ok('the kebab: Run again · Open the quote · Delete', (await page.getByRole('menuitem').allInnerTexts()).join('|') === 'Run again|Open the quote|Delete')
    await page.keyboard.press('Escape')
    sql(`update quote_comparisons set sent_at = null, sent_text = null, sent_via = null, sent_by = null where id='${ID}'`)
    await ctx.close()
  })

  await step('touch tablet', async () => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    const setup = await page.getByTestId('xray-setup').boundingBox(), recent = await page.locator('aside[aria-label="Recent comparisons"]').boundingBox()
    ok('stacked, the setup card fills the column as Recent does', !!setup && !!recent && Math.abs(setup.width - recent.width) <= 2, `${setup?.width} vs ${recent?.width}`)
    await shot(page, '02-setup-768')
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    const kebab = page.getByTestId('xray-row').first().getByRole('button', { name: /^More actions for/ })
    const box = await kebab.boundingBox()
    ok('the row kebab is in view on a touch tablet', !!box && box.x + box.width <= 768 && box.x >= 0, box ? `${Math.round(box.x)}` : 'none')
    await shot(page, '03-record-768')
    await ctx.close()
  })

  await step('phone', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    const yours = page.getByTestId('xray-row').first().locator('[data-col="yours"]')
    ok('each side stacks its name over its figure', (await yours.evaluate((e) => getComputedStyle(e).flexDirection)) === 'column')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: the record fits', over <= 0, `${over}px`)
    await shot(page, '04-record-390')
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    await page.getByRole('radio', { name: 'Upload two quotes' }).click().catch(async () => { await page.getByText('Upload two quotes').click() })
    const inputs = page.getByTestId('xray-setup').locator('input[type=file]')
    await inputs.last().setInputFiles(file('supplier.doc', 'word'))   // the other studio's side
    await page.waitForTimeout(400)
    await inputs.first().setInputFiles(file('Dyel Sales Contract.pdf')); await page.waitForTimeout(1200)
    ok('each side keeps its own message', /We can read PDF, PNG, JPG, WebP, CSV and XLSX files\./.test(await page.getByTestId('xray-setup').innerText()))
    await shot(page, '05-setup-errors-390')
    await ctx.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})()
