// Dane's UAT fixes 2026-10-01 — package P1: the quote template editor and its renderer (b-newquotes · b-zebra · b-fab · b-approve ·
// g-watermark · g-sample-content · g-numbering · g-jump-canvas · g-trade · g-arrows · g-reset-field · k-previewwith · g-draftnote).
// Run against a production build on a scratch copy of the demo baseline. It writes template drafts: re-copy the scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3031
//   TESTDB=<scratch.db> BASE=http://localhost:3031 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P1/verify-p1.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3031', OUT = __dirname
const ROOT = path.resolve(__dirname, '../../../..')
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const tpl = (name) => sql(`select id from quote_templates where name = '${name}' and deleted_at is null`)
const DEFAULT = tpl('Default Quote PDF'), SHOWFLAT = tpl('Showflat Presentation')
const QUOTE = sql(`select id from quotes where number = 'OM-10008'`)

async function openEditor(page, id) {
  await page.goto(`${BASE}/templates/${id}`)
  await page.locator('[data-testid="canvas-area"] [data-page]').first().waitFor({ timeout: 20000 }); await ready(page)
  const gotIt = page.getByTestId('editor-hint').getByRole('button', { name: 'Got it' })
  if (await gotIt.isVisible().catch(() => false)) { await gotIt.click(); await page.waitForTimeout(200) }
}
const left = (page) => page.getByTestId('left-pane'), right = (page) => page.getByTestId('right-pane')
const canvas = (page) => page.getByTestId('canvas-area')
const canvasText = (page) => canvas(page).innerText()
/** A block's words across every page it runs over. */
const blockText = (page, label) => canvas(page).evaluate((root, l) => [...root.querySelectorAll(`[role="group"][aria-label="${l}"]`)].map((e) => e.innerText).join('\n'), label)
const norm = (t) => t.replace(/\s+/g, ' ').trim()
async function pick(page, label) { await left(page).getByRole('button', { name: new RegExp(`^${label}`) }).first().click(); await page.waitForTimeout(400) }
async function tab(page, name) { await left(page).getByRole('tab', { name }).click(); await page.waitForTimeout(300) }
async function choose(scope, label, option) { await scope.getByRole('combobox', { name: label }).click(); await scope.page().getByRole('option', { name: option, exact: true }).click(); await scope.page().waitForTimeout(500) }
async function more(page) { const b = right(page).getByRole('button', { name: 'More options' }); if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click(); await page.waitForTimeout(300) }
async function flip(scope, label) { await scope.locator('label', { hasText: label }).first().click(); await scope.page().waitForTimeout(500) }
/* (pending modules S44T, a deliberate change of this rule — call C4, UAT rows 302 · 306: with the # column first, a section band's mark stands in
   the # column's cell and its name in the next — the band reads across its cells, "A Hacking Works", as it read in one cell before) */
const cells = (page) => canvas(page).evaluate((root) => [...root.querySelectorAll('[data-page] tr[data-area], [data-page] tr[data-line], [data-page] tr[data-band]')].slice(0, 14).map((tr) => `${tr.hasAttribute('data-band') ? 'S' : tr.hasAttribute('data-area') ? 'R' : 'L'}:${(tr.hasAttribute('data-band') ? [...tr.children].map((c) => c.textContent ?? '').join(' ') : tr.querySelector('td')?.textContent ?? '').replace(/\s+/g, ' ').trim()}`))

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)

  /* ── b-newquotes · the Sample quote wears the New quotes choices ── */
  await step('b-newquotes', async () => {
    await openEditor(page, DEFAULT)
    const pay0 = await blockText(page, 'Payment schedule')
    ok('b-newquotes the sample starts on the template’s split — the studio default 10/30/30/30, not a fixed 10/40/40/10', /10%/.test(pay0) && (pay0.match(/30%/g) || []).length === 3 && !/40%/.test(pay0), pay0.replace(/\s+/g, ' ').slice(0, 120))
    ok('b-newquotes the sample’s Terms read the template’s validity (30 days)', /valid for 30 days/.test(await canvasText(page)))
    ok('b-newquotes GST prints while the switch is on', /gst/i.test(await blockText(page, 'Totals')))
    await tab(page, 'Quote settings')   // (the calm UI build 2026-10-27, a deliberate change) W-274: the New quotes tab reads Quote settings
    ok('b-newquotes the New quotes tab names the Page tab (REG-569)', /Items table on the Page tab/.test(await left(page).innerText()) && !/Structure tab/.test(await left(page).innerText()))
    await choose(left(page), 'Payment schedule', '50/50')
    const pay1 = await blockText(page, 'Payment schedule')
    ok('b-newquotes picking 50/50 redraws the schedule at once', (pay1.match(/50%/g) || []).length === 2 && !/30%/.test(pay1), pay1.replace(/\s+/g, ' ').slice(0, 120))
    await flip(left(page), 'GST on')
    ok('b-newquotes GST off: the Totals print no GST line', !/gst/i.test(await blockText(page, 'Totals')))
    const days = left(page).getByLabel('Valid for (days)'); await days.fill('14'); await days.press('Enter'); await page.waitForTimeout(500)
    ok('b-newquotes Valid for 14 days reaches the page (the sample’s date + 14)', /valid for 14 days/.test(await canvasText(page)))
    await choose(left(page), 'Terms and Conditions', 'Terms and Conditions for Renovation Works')
    ok('b-newquotes the chosen Terms print in place of the sample’s', /TERMS AND CONDITIONS FOR RENOVATION WORKS/i.test(await blockText(page, 'Terms and Conditions')))
    await choose(left(page), 'Additional Notes', 'Working Hours and Site Access')
    const notes = await canvasText(page)
    ok('b-newquotes the chosen Notes print, their tokens filled from the sample (“handed to Dane”)', /9am to 6pm/.test(notes) && /handed to Dane/.test(notes))
    await shot(page, 'b-newquotes-defaults-on-canvas')
    // a real quote keeps its own records
    await page.getByRole('button', { name: /^Preview with/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitemradio').nth(2).click(); await page.waitForTimeout(1500)
    const payQ = await blockText(page, 'Payment schedule')
    ok('b-newquotes a real quote in Preview with keeps its own schedule (not the 50/50 choice)', !/50%[\s\S]*50%/.test(payQ) || (payQ.match(/50%/g) || []).length !== 2, payQ.replace(/\s+/g, ' ').slice(0, 100))
    await page.getByRole('button', { name: /^Preview with/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitemradio', { name: /^Sample quote/ }).click(); await page.waitForTimeout(800)
    await tab(page, 'Page')
  })

  /* ── k-previewwith · the menu says why a real quote is here ── */
  await step('k-previewwith', async () => {
    await page.getByRole('button', { name: /^Preview with/ }).click(); await page.waitForTimeout(400)
    ok('k-previewwith the caption over the real quotes', (await page.getByTestId('source-note').innerText()) === 'Previews only — a quote’s lines are edited in the quote.')
    await shot(page, 'k-previewwith-caption')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── g-watermark · "Sample" across the sample, the design's own word wins, never off the editor ── */
  await step('g-watermark', async () => {
    const wm = canvas(page).locator('[class*="watermark"]')
    ok('g-watermark the Sample quote wears “Sample” on every page', (await wm.count()) >= 1 && (await wm.first().textContent()) === 'Sample' && (await wm.count()) === (await canvas(page).locator('[data-page]').count()))
    await shot(page, 'g-watermark-sample', { x: 300, y: 56, width: 820, height: 700 })
    await page.getByRole('button', { name: /^Preview with/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitemradio', { name: /^Empty quote/ }).click(); await page.waitForTimeout(800)
    ok('g-watermark the Empty quote has no Sample mark', (await wm.count()) === 0)
    await page.getByRole('button', { name: /^Preview with/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitemradio', { name: /^Sample quote/ }).click(); await page.waitForTimeout(800)
    await left(page).getByRole('button', { name: /^Page setup/ }).click(); await page.waitForTimeout(300)
    const w = left(page).getByLabel('Watermark', { exact: true }); await w.fill('DRAFT'); await page.waitForTimeout(800)
    ok('g-watermark a design with its own watermark keeps it', (await wm.first().textContent()) === 'DRAFT')
    await w.fill(''); await page.waitForTimeout(800)
    await left(page).getByRole('button', { name: /^Page setup/ }).click(); await page.waitForTimeout(200)
  })

  /* ── g-sample-content · photos, a hidden line and section notes on the sample ── */
  await step('g-sample-content', async () => {
    await pick(page, 'Items table'); await more(page)
    ok('g-sample-content section notes print under their trade', /All hacking is subject to HDB approval/.test(await canvasText(page)) && /18 mm plywood/.test(await canvasText(page)))
    await flip(right(page), 'Item photos')
    ok('g-sample-content Item photos on: the sample’s two photos print', (await canvas(page).locator('[data-page] img[src*="/uat-files/"]').count()) === 2)
    ok('g-sample-content the hint under “Items hidden from the client”', /Lines you hid from the client in the quote editor\./.test(await right(page).innerText()))
    ok('g-sample-content the hidden line is left out by default', !/Site coordination between trades/.test(await canvasText(page)))
    await choose(right(page), 'Items hidden from the client', 'Shown without a price')
    ok('g-sample-content “Shown without a price” prints the hidden line', /Site coordination between trades/.test(await canvasText(page)))
    const photo = canvas(page).locator('[data-page] img[src*="kitchen-moodboard"]').first(); await photo.scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
    await shot(page, 'g-sample-content-photos-notes-hidden')
    await choose(right(page), 'Items hidden from the client', 'Left out')
    await flip(right(page), 'Item photos')
  })

  /* ── b-zebra · every other line shaded in the shared renderer ── */
  await step('b-zebra', async () => {
    await flip(right(page), 'Shade every other row')
    const shaded = canvas(page).locator('tr[data-shade]')
    const n = await shaded.count()
    const bg = n ? await shaded.first().locator('td').first().evaluate((td) => getComputedStyle(td).backgroundColor) : ''
    const bandsNot = await canvas(page).locator('tr[data-band][data-shade], tr[data-area][data-shade]').count()
    ok('b-zebra on: every other line wears the band colour; headings never count', n > 4 && bg !== 'rgba(0, 0, 0, 0)' && bandsNot === 0, `${n} rows · ${bg}`)
    const firstOfSection = await canvas(page).evaluate(() => { const rows = [...document.querySelectorAll('[data-page] tr')]; const out = []; let after = false; for (const r of rows) { if (r.hasAttribute('data-band')) { after = true; continue } if (after && r.hasAttribute('data-line')) { out.push(r.hasAttribute('data-shade')); after = false } } return out })
    ok('b-zebra each section starts unshaded', firstOfSection.length > 2 && firstOfSection.every((s) => !s), JSON.stringify(firstOfSection.slice(0, 6)))
    await shot(page, 'b-zebra-on', { x: 300, y: 56, width: 820, height: 900 })
    await flip(right(page), 'Shade every other row')
    ok('b-zebra off: no shading', (await shaded.count()) === 0)
  })

  /* ── b-fab · the inspector's end scrolls clear of the Maison AI button ── */
  await step('b-fab', async () => {
    const body = page.getByTestId('inspector').locator(':scope > div').nth(1)
    ok('b-fab the inspector keeps 88 px under its last control', (await body.evaluate((el) => getComputedStyle(el).paddingBottom)) === '88px')
    await body.evaluate((el) => { el.scrollTop = el.scrollHeight }); await page.waitForTimeout(300)
    const reset = await right(page).getByRole('button', { name: 'Reset this block' }).boundingBox()
    const fab = await page.getByRole('button', { name: 'Maison AI' }).boundingBox()
    ok('b-fab “Reset this block” at the scroll end sits clear of the button', !!reset && !!fab && reset.y + reset.height <= fab.y - 8, `reset ${reset && Math.round(reset.y + reset.height)} · fab ${fab && Math.round(fab.y)}`)
    await shot(page, 'b-fab-clearance', { x: 1040, y: 560, width: 400, height: 464 })
  })

  /* ── g-numbering · numbered room rows; the presets' new default ── */
  await step('g-numbering', async () => {
    await page.getByTestId('inspector').locator(':scope > div').nth(1).evaluate((el) => { el.scrollTop = 0 })
    await choose(right(page), 'Item numbers', 'B · 1 Kitchen · 1.1')
    const rooms = await cells(page)
    ok('g-numbering “B · 1 Kitchen · 1.1”: rooms numbered in their section, lines room.line', rooms.slice(0, 6).join(' ') === 'S:A Hacking Works R:1 L:1.1 R:2 L:2.1 R:3', rooms.join(' '))
    const masonry = await canvas(page).evaluate(() => { const rows = [...document.querySelectorAll('[data-page] tr')]; const i = rows.findIndex((r) => r.hasAttribute('data-band') && /Masonry/.test(r.textContent || '')); return rows.slice(i, i + 6).map((r) => (r.hasAttribute('data-band') ? [...r.children].map((c) => c.textContent ?? '').join(' ') : r.querySelector('td')?.textContent ?? '').replace(/\s+/g, ' ').trim()) })   // (S44T, C4) the band across its cells
    ok('g-numbering a room’s lines count under it (B · 1 · 1.1 · 1.2 · 2)', masonry.join('|') === 'B Masonry Works|1|1.1|1.2|2|2.1', masonry.join('|'))
    await shot(page, 'g-numbering-rooms', { x: 300, y: 56, width: 820, height: 760 })
    await right(page).getByText('1 · 2 · 3', { exact: true }).click()
    await page.waitForTimeout(600)
    const deep = await cells(page)
    ok('g-numbering with sections marked 1 · 2 · 3: 1 · 1.1 Kitchen · 1.1.1', deep.slice(0, 3).join(' ') === 'S:1 Hacking Works R:1.1 L:1.1.1', deep.join(' '))
    await choose(right(page), 'Item numbers', '1 · a · i')
    const rom = await cells(page)
    ok('g-numbering “1 · a · i”: section number, room letter, line in roman', rom.slice(0, 3).join(' ') === 'S:1 Hacking Works R:a L:i', rom.join(' '))
    const romM = await canvas(page).evaluate(() => { const rows = [...document.querySelectorAll('[data-page] tr')]; const i = rows.findIndex((r) => r.hasAttribute('data-band') && /Masonry/.test(r.textContent || '')); return rows.slice(i, i + 4).map((r) => (r.hasAttribute('data-band') ? [...r.children].map((c) => c.textContent ?? '').join(' ') : r.querySelector('td')?.textContent ?? '').replace(/\s+/g, ' ').trim()) })   // (S44T, C4) the band across its cells
    ok('g-numbering roman lines run i · ii under a room', romM.join('|') === '2 Masonry Works|a|i|ii', romM.join('|'))
    await shot(page, 'g-numbering-roman', { x: 300, y: 56, width: 820, height: 760 })
    await right(page).getByText('A · B · C', { exact: true }).click(); await page.waitForTimeout(300)
    await choose(right(page), 'Item numbers', 'Start again in each room')
    const presets = execSync(`npx tsx -e "import('./lib/templates/presets.ts').then((m) => { const n = (k) => m.presetByKey(k).design().blocks.find((b) => b.kind === 'items').numbering; console.log(n('letter') + ' ' + n('scope') + ' ' + n('form')) })"`, { cwd: ROOT }).toString().trim()
    ok('g-numbering new Letter and Scope templates start on A1 · A2 · B1; Form keeps its own', presets === 'lettered lettered continuous', presets)
    ok('g-numbering the stored designs keep theirs', /"numbering":"area"/.test(sql(`select design_json from quote_templates where name = '4-Room BTO'`)))
  })

  /* ── g-trade · "Trade" in the studio's own words ── */
  await step('g-trade', async () => {
    const t = await right(page).innerText()
    ok('g-trade the helper names the studio’s works under “Group the items by”', /A trade is one of your works — [^\n]+ in Settings › Quotes & pricing\./.test(t), (t.match(/A trade is[^\n]+/) || [''])[0])
  })

  /* ── g-arrows · the column order buttons point across the page ── */
  await step('g-arrows', async () => {
    const card = right(page).getByTestId('column-card').nth(1)
    await card.getByTestId('column-card-open').click(); await page.waitForTimeout(200)   // (the calm UI build 2026-10-27, a deliberate change) 4-23: a column's controls are one press in, under its chevron
    const l = await card.getByRole('button', { name: /left$/ }).innerText(), r = await card.getByRole('button', { name: /right$/ }).innerText()
    ok('g-arrows left / right arrows on the column cards', l.includes('arrow_back') && r.includes('arrow_forward'), `${l} · ${r}`)
    await card.scrollIntoViewIfNeeded(); await shot(page, 'g-arrows-columns', { x: 1120, y: 56, width: 320, height: 968 })
  })

  /* ── g-jump-canvas · a Page row brings its part into view ── */
  await step('g-jump-canvas', async () => {
    await canvas(page).evaluate((el) => { el.scrollTop = 0 }); await page.waitForTimeout(300)
    await pick(page, 'Terms and Conditions'); await page.waitForTimeout(1200)
    const inView = await page.evaluate(() => { const a = document.querySelector('[data-testid="canvas-area"]'); const t = a.querySelector('[role="group"][aria-label="Terms and Conditions"]'); const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect(); return { top: a.scrollTop, ok: rt.top >= ra.top - 1 && rt.top <= ra.bottom - 48 } })
    ok('g-jump-canvas picking Terms in the Page list scrolls the canvas to it', inView.ok && inView.top > 300, `scrollTop ${Math.round(inView.top)}`)
    await shot(page, 'g-jump-canvas-terms')
  })

  /* ── g-reset-field · Reset under a box whose words differ from a new block's ── */
  await step('g-reset-field', async () => {
    await pick(page, 'Payment schedule')
    const title = right(page).getByLabel('Title', { exact: true })
    ok('g-reset-field the preset’s own title shows Reset (it differs from a new block’s)', (await title.inputValue()) === 'Terms & Mode of Payment' && (await right(page).getByTestId('txt-reset').count()) === 1)
    await title.fill(''); await page.waitForTimeout(1100)
    await shot(page, 'g-reset-field-cleared', { x: 1120, y: 56, width: 320, height: 420 })
    await right(page).getByTestId('txt-reset').first().click(); await page.waitForTimeout(400)
    ok('g-reset-field Reset puts back the words a new block starts with', (await title.inputValue()) === 'Payment schedule' && (await right(page).getByTestId('txt-reset').count()) === 0)
    await page.keyboard.press('Meta+z'); await page.waitForTimeout(400)
    ok('g-reset-field one ⌘Z takes the Reset back (one undo step)', (await title.inputValue()) === '')
    await page.keyboard.press('Meta+z'); await page.waitForTimeout(400)
    ok('g-reset-field a second ⌘Z returns the typed-over title', (await title.inputValue()) === 'Terms & Mode of Payment')
  })

  /* ── g-draftnote · Back from a published template edited since ── */
  await step('g-draftnote published', async () => {
    await page.getByRole('button', { name: 'Back to Quote templates' }).click()
    await page.waitForURL(/\/company\/templates\/quotes/, { timeout: 20000 })
    const t = await snack(page, /saved as a draft/i)
    ok('g-draftnote Back from an edited published template: the gallery says the changes wait as a draft', /Changes saved as a draft — publish them to use them on quotes/.test(t), t)
    await page.locator('[data-kb-row], [class*="card"]').first().waitFor({ timeout: 15000 }).catch(() => {}); await page.waitForTimeout(600)
    ok('g-draftnote the snackbar stays through the gallery’s reveal', /Changes saved as a draft/.test(await snackText(page)))
    await shot(page, 'g-draftnote-gallery')
  })

  /* ── b-approve · one place to decide ── */
  await step('b-approve', async () => {
    await openEditor(page, SHOWFLAT)
    const primary = page.locator('header').getByRole('button', { name: 'Waiting for approval' })   // (the calm UI build 2026-10-27, a deliberate change) T-01
    ok('b-approve the top bar’s primary steps back to a disabled “Awaiting approval”', (await primary.count()) === 1 && (await primary.isDisabled()))
    ok('b-approve “Approve and publish” appears once — in the review bar', (await page.getByRole('button', { name: 'Approve and publish' }).count()) === 1 && (await page.getByTestId('review-bar').getByRole('button', { name: 'Approve and publish' }).count()) === 1 && (await page.getByTestId('review-bar').getByRole('button', { name: 'Request changes' }).count()) === 1)
    await shot(page, 'b-approve-review-bar', { x: 0, y: 0, width: 1440, height: 200 })
    await page.getByTestId('review-bar').getByRole('button', { name: 'Approve and publish' }).click(); await page.waitForTimeout(600)
    ok('b-approve the review bar’s button opens the publish dialog', await page.getByRole('dialog').isVisible())
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  })

  /* ── g-draftnote · Back from a never-published draft ── */
  await step('g-draftnote draft', async () => {
    await page.getByRole('button', { name: 'Back to Quote templates' }).click()
    await page.waitForURL(/\/company\/templates\/quotes/, { timeout: 20000 })
    const t = await snack(page, /saved as a draft/i)
    ok('g-draftnote Back from a draft: “Saved as a draft — publish it to use it on quotes”', /Saved as a draft — publish it to use it on quotes/.test(t), t)
  })

  /* ── g-watermark · never on the quote's Preview ── */
  await step('g-watermark preview', async () => {
    await page.goto(`${BASE}/quotes/${QUOTE}/preview`); await page.locator('[data-page]').first().waitFor({ timeout: 20000 }); await ready(page)
    const marks = await page.locator('[class*="watermark"]').allTextContents()
    ok('g-watermark a quote’s Preview never wears “Sample”', !marks.includes('Sample'), JSON.stringify(marks.slice(0, 2)))
  })

  /* ── the phone's view-only editor: the sample's mark reads there too ── */
  await step('phone', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await phone.newPage(); p.setDefaultTimeout(15000)
    await p.goto(`${BASE}/templates/${DEFAULT}`); await p.locator('[data-page]').first().waitFor({ timeout: 20000 }); await ready(p)
    ok('phone the view-only editor shows the Sample mark', (await p.locator('[class*="watermark"]').first().textContent()) === 'Sample')
    await p.getByRole('button', { name: /^Back to/ }).click(); await p.waitForURL(/\/company\/templates\/quotes/, { timeout: 20000 }); await p.waitForTimeout(1200)
    ok('phone leaving the view-only editor says nothing about drafts (nothing was edited there)', !/saved as a draft/i.test(await snackText(p)))
    await p.goto(`${BASE}/templates/${DEFAULT}`); await p.locator('[data-page]').first().waitFor({ timeout: 20000 }); await ready(p)
    await p.screenshot({ path: path.join(OUT, 'phone-sample-watermark.png') })
    await phone.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} PASS`)
  process.exit(passed === results.length ? 0 : 1)
})()
