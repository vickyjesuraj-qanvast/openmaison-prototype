// Quote X-Ray parity round 1 (REG-638) — the reading tells the truth: Yours as the quote counts it and the basis said; plurals, trade
// words and one line against several (the kitchen cabinets E-98 got wrong); rates on pairs; 1.0's kinds of point; the client never
// reads the other studio's name; the draft follows the screen; key points by 1.0's rules; one sign; the reading keeps its lines.
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
const file = (name) => { const p = `${FILES}/${name}`; fs.writeFileSync(p, referenceBytes(name) ?? '%PDF-1.4 probe'); return p }
const Q8 = sql(`select id || '|' || lead_id from quotes where number='OM-10008'`).split('|')

async function runForLead(page, leadLabel, quoteNumber, otherPath) {
  await page.goto(`${BASE}/quote-x-ray`); await ready(page)
  const setup = page.getByTestId('xray-setup')
  await setup.getByRole('combobox', { name: 'Lead' }).click()
  await page.getByRole('option', { name: leadLabel }).click()
  await setup.getByText(new RegExp(`^${quoteNumber} · `)).first().click()
  await setup.locator('input[type=file]').setInputFiles(otherPath)
  await setup.getByRole('button', { name: 'Compare' }).click()
  await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
  return page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-xr1/${n}.png`, fullPage: n.includes('full') })
  let id = null

  await step('a run reads OM-10008 as the quote counts it', async () => {
    id = await runForLead(page, 'Vivien Lee — Condo 2-bedder', 'OM-10008', file('Flo Design Sample Quotation.pdf'))
    const row = sql(`select engine || '|' || json_valid(inputs_json) || '|' || json_array_length(inputs_json, '$.yours') || '|' || json_array_length(inputs_json, '$.theirs') from quote_comparisons where id='${id}'`).split('|')
    ok('the reading keeps its engine and both sides’ lines', row[0] === '2' && row[1] === '1' && Number(row[2]) > 10 && row[3] === '28', row.join(' · '))
    const sub = Number(sql(`select sum(round(qty * (cost_minor + markup_minor) * (1 - discount_pct / 100.0))) from quote_items where quote_id='${Q8[0]}' and kind='item' and status <> 'Declined' and optional = 0 and (print_as is null or print_as = 'behalf')`))
    const yours = Number(sql(`select json_extract(result_json, '$.yoursMinor') from quote_comparisons where id='${id}'`))
    ok('Yours is the quote’s own subtotal', Math.abs(sub - yours) <= 1, `${yours} vs ${sub}`)
    const foot = await page.getByTestId('xray-summary').innerText()
    ok('the summary says the basis and the quote’s own total', /before discounts and GST/.test(foot) && /OM-10008 comes to S\$68,176\.23/.test(foot))
    await shot('01-summary')
  })

  await step('the kitchen cabinets E-98 called missing now pair with Flo’s two lines', async () => {
    const rows = JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`)).rows
    const k = rows.find((r) => /^Kitchen carpentry, top and bottom cabinets/.test(r.name))
    ok('matched against both of Flo’s kitchen cabinet lines', k && k.status === 'matched' && (k.theirIdx || []).length === 2, k ? `${k.status} · ${k.theirName}` : 'no row')
    ok('Flo’s cabinet lines are not “only in theirs”', !rows.some((r) => r.status === 'theirs-only' && /kitchen (top-hung|bottom) cabinet/i.test(r.name)))
    const pts = await page.getByTestId('xray-points').innerText()
    ok('no point says the kitchen cabinets are missing', !/include the kitchen carpentry/i.test(pts))
    const w = rows.find((r) => /^Wardrobe, master bedroom/.test(r.name)), tv = rows.find((r) => /^TV console/.test(r.name))
    ok('the wardrobe and the TV console pair too (plural, "TV", the room)', w?.status === 'matched' && tv?.status === 'matched')
  })

  await step('1.0’s kinds of point, weighed, never naming the other studio to the client', async () => {
    const r = JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`))
    ok('three points of 1.0’s kinds', r.points.length === 3 && r.points.every((p) => ['missing', 'cheaper', 'below', 'unpriced', 'material', 'brand'].includes(p.kind)), r.points.map((p) => p.kind).join(','))
    ok('the heaviest first: the vinyl flooring they leave out', /vinyl flooring/i.test(r.points[0].say))
    const says = await page.locator('[data-testid="xray-points"] li [class*="__say"]').allInnerTexts()
    ok('Say this never names Flo Design', says.length === 3 && says.every((t) => !/Flo Design/.test(t)), says.join(' / ').slice(0, 160))
    ok('the evidence, for the studio, does', /Flo Design/.test(await page.getByTestId('xray-points').innerText()))
    ok('“Priced well below ours”, not “below market”', !/below market/i.test(await page.getByTestId('xray-points').innerText()))
    await shot('02-points')
  })

  await step('the draft follows the screen', async () => {
    const pts = page.getByTestId('xray-points')
    await pts.getByRole('button', { name: 'Say it as a question' }).first().click()
    const q = await pts.locator('li').filter({ has: page.getByRole('button', { name: 'Say it as a point' }) }).first().locator('[class*="__say"]').innerText()
    await pts.getByRole('button', { name: 'Send to client' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send to client' }); await dlg.waitFor(); await page.waitForTimeout(400)
    // REG-790 (UX audit C12): Send to client is the contract Send dialog — recipient fields + "Message to the client", Send via WhatsApp, Reset message
    const text = await dlg.getByLabel('Message to the client').inputValue()
    ok('the point switched to its question goes out as the question', text.includes(q.replace(/^“|”$/g, '')), q.slice(0, 60))
    ok('the draft never names the other studio', !/Flo Design/.test(text))
    ok('1.0’s like-for-like line closes it', /So like-for-like, the real difference between the two quotes is S\$[\d,]+\.\d\d, not S\$[\d,]+\.\d\d\./.test(text))
    await shot('03-send')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await step('key points by 1.0’s rules', async () => {
    const card = await page.getByTestId('xray-brands').innerText()
    ok('no “both quotes name it” for a brand only theirs names', !/both quotes name/i.test(card))
    ok('Hafary: checked, nothing to flag', /We also checked Hafary in their quote — nothing to flag\./.test(card))
    ok('sources read as sources, no open-in-new glyph', /Sources · renotalk\.com/.test(card) && (await page.getByTestId('xray-brands').locator('text=open_in_new').count()) === 0)
    await shot('04-brands')
  })

  await step('one sign: the table’s Difference and the Real difference tile agree', async () => {
    const r = JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`))
    const plumbing = page.getByTestId('xray-row').filter({ hasText: 'Plumbing works, kitchen and bathrooms' })
    const d = await plumbing.locator('[data-col="diff"]').innerText()
    ok('ours less on a line reads “−” (green)', /^−S\$650\.00$/.test(d.trim()) && (await plumbing.locator('[data-col="diff"] [data-sign="less"]').count()) === 1, d)
    const tile = await page.getByTestId('xray-tile-real').innerText()
    ok('the tile reads ours more without a sign', r.realDiffMinor > 0 && /S\$\s?\d/.test(tile) && !/−/.test(tile), tile.replace(/\n/g, ' '))
    const counter = page.getByTestId('xray-row').filter({ hasText: 'Kitchen countertop, quartz' })
    ok('a pair with quantities in one unit shows both', /21 ft/.test(await counter.locator('[data-col="yours"]').innerText()) && /12 ft/.test(await counter.locator('[data-col="theirs"]').innerText()))
    ok('no signed zero anywhere', !/-0\.00|−S\$0\.00/.test(await page.locator('main, body').first().innerText()))
    await page.getByTestId('xray-items').scrollIntoViewIfNeeded(); await shot('05-table')
  })

  await step('a line that prints a word counts as covered, not priced', async () => {
    const hid = sql(`select id from quote_items where quote_id='${Q8[0]}' and name='Haulage and debris disposal'`)
    sql(`update quote_items set print_as='foc' where id='${hid}'`)
    const id2 = await runForLead(page, 'Vivien Lee — Condo 2-bedder', 'OM-10008', file('Flo Design Sample Quotation.pdf'))
    const r = JSON.parse(sql(`select result_json from quote_comparisons where id='${id2}'`))
    const first = JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`))
    ok('Yours drops the FOC line’s amount', first.yoursMinor - r.yoursMinor === 75000, `${first.yoursMinor} → ${r.yoursMinor}`)
    const row = page.getByTestId('xray-row').filter({ hasText: 'Haulage and debris disposal' })
    ok('its row shows the word, no difference', (await row.locator('[data-col="yours"]').innerText()).trim() === 'FOC' && (await row.locator('[data-col="diff"]').innerText()).trim() === '--')
    sql(`update quote_items set print_as=null where id='${hid}'`)
  })

  await step('Upload two quotes keeps your file’s brands', async () => {
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    const setup = page.getByTestId('xray-setup')
    await setup.getByRole('radio', { name: 'Upload two quotes' }).click().catch(async () => { await setup.getByText('Upload two quotes').click() })
    const inputs = setup.locator('input[type=file]')
    await inputs.nth(0).setInputFiles(file('Dyel Sales Contract.pdf'))
    await setup.locator('input[type=file]').first().setInputFiles(file('Flo Design Sample Quotation.pdf'))   // the first dropzone is a file tile now
    await setup.getByRole('button', { name: 'Compare' }).click()
    await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
    const card = await page.getByTestId('xray-brands').innerText()
    ok('Hafele, named in your file’s brand column, is your advantage', /Hafele[\s\S]*Your advantage/.test(card) || /Your quote names Hafele/.test(card), card.slice(0, 200))
    const idu = page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    ok('your file’s name is kept', sql(`select your_file from quote_comparisons where id='${idu}'`) === 'Dyel Sales Contract.pdf')
    await shot('06-upload-brands')
  })

  await step('phone and the overflow gate', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await m.newPage(); await p.goto(`${BASE}/quote-x-ray/${id}`); await ready(p)
    await p.screenshot({ path: `${S}/shots-xr1/07-phone.png` })
    const w = await m.newPage(); await w.setViewportSize({ width: 320, height: 800 }); await w.goto(`${BASE}/quote-x-ray/${id}`); await ready(w)
    const over = await w.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok('no sideways scroll at 320', over <= 0, `${over}px`)
    await m.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
