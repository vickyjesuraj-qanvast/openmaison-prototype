// UI sweep round S1 (REG-657) — the quote editor and the quote lists: the phone's number boxes read what is typed; the confirmation
// link shows no draft; a hidden top-level line keeps its eye; the sub-total label can go; Find's empty row and its sums; the Status
// menu through the portal; Deleted / Archived Quotes (U-07) at 768; ?template= with none; the house chips and the DS radios; the NRIC
// check; the Preview's own ghost and Mark as sent; a refused save puts the value back; no page sideways at 390.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const Q1 = sql(`select id from quotes where number='OM-10001'`), LEAD1 = sql(`select lead_id from quotes where id='${Q1}'`)
const Q9 = sql(`select id from quotes where number='OM-10009'`)
const TOP = sql(`select id from quote_items where quote_id='${Q1}' and parent_id is null and kind='item' order by position limit 1`)
const TOPNAME = sql(`select name from quote_items where id='${TOP}'`)
const GROUP = sql(`select id from quote_items where quote_id='${Q1}' and kind='group' and name='Bedrooms'`)
const UNUSED_TPL = sql(`select id from quote_templates t where deleted_at is null and not exists (select 1 from quotes q where q.template_id=t.id) limit 1`)
const abortActions = (page) => page.route('**/*', (route) => { const r = route.request(); return r.method() === 'POST' && r.headers()['next-action'] ? route.abort() : route.continue() })

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-sw1/${n}.png` })

  await step('desktop editor', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    sql(`update quote_items set print_as_text='Probe label' where id='${GROUP}'`)
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page)
    // #3 a hidden top-level line keeps its eye, and the bulk hide has Undo
    const row = page.locator(`[data-item-id="${TOP}"]`).first()
    await row.scrollIntoViewIfNeeded(); await row.getByRole('checkbox').first().check({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Hide from client', exact: true }).click(); await page.waitForTimeout(900)
    ok('bulk hide answers with Undo', /Undo/.test(await snack(page)), (await snack(page)).slice(0, 60))
    ok('a hidden top-level line shows its eye', await row.getByRole('button', { name: /^Client visibility: hidden/i }).count() === 1)
    ok('the hide is kept', sql(`select visibility from quote_items where id='${TOP}'`) !== 'visible')
    await shot(page, '01-hidden-top-line')
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(1200)
    ok('Undo brings it back', sql(`select visibility from quote_items where id='${TOP}'`) === 'visible')
    // #6 the sub-total label can be removed
    const grp = page.locator(`[data-item-id="${GROUP}"]`).first(); await grp.scrollIntoViewIfNeeded(); await grp.hover()
    await grp.getByRole('button', { name: 'More options for Bedrooms' }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Remove the sub-total label' }).click(); await page.waitForTimeout(1200)
    ok('the sub-total label can be removed', sql(`select coalesce(print_as_text,'∅') from quote_items where id='${GROUP}'`) === '∅')
    // #13 Find: no match says so, the Sum row adds what shows
    await page.getByRole('button', { name: 'Find items' }).click(); await page.waitForTimeout(200)
    await page.getByRole('searchbox', { name: 'Find items' }).fill('zzqq-no-such-line'); await page.waitForTimeout(500)
    ok('Find with no match shows its empty row', await page.getByTestId('find-empty').isVisible())
    await page.getByRole('searchbox', { name: 'Find items' }).fill('Painting'); await page.waitForTimeout(500)
    const sum = await page.getByRole('row', { name: 'Sum' }).innerText().catch(() => '')
    ok('the Sum row counts what Find shows', /Sum · 1 priced item/.test(sum), sum.split('\n')[0])
    await shot(page, '02-find-sum')
    await page.keyboard.press('Escape')
    // #31 the Signature Settings' DS radios
    await page.locator('#section-signature').scrollIntoViewIfNeeded()
    const sigBtn = page.locator('#section-signature').getByRole('button', { name: /^(Type|Edit)$/ }).first()
    await sigBtn.click(); await page.waitForTimeout(500)
    const rg = page.getByRole('radiogroup', { name: 'Show signature as' })
    // REG-857 (Dane UAT 6.23) added Upload beside Draw and Type
    const radios = await rg.getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.closest('label')?.textContent?.trim() || ''))
    ok('Show signature as is the DS radio group — Draw · Type · Upload', radios.length === 3, radios.join(' · '))
    await shot(page, '03-signature-radios')
    await page.getByRole('dialog', { name: 'Signature Settings' }).getByRole('button', { name: 'Cancel' }).click().catch(() => page.keyboard.press('Escape'))
    await page.waitForTimeout(300)
    // #33 the NRIC check
    await page.locator('#section-general').scrollIntoViewIfNeeded()
    const nric = page.locator('#section-general').getByLabel('NRIC', { exact: true })
    const was = sql(`select coalesce(nric,'') from quotes where id='${Q1}'`)
    await nric.fill('12AB'); await nric.blur(); await page.waitForTimeout(300)
    ok('a wrong NRIC says so once the box is left', await page.getByText('Enter a valid NRIC / FIN, e.g. S1234567A').isVisible())
    await nric.fill('S1234567D'); await page.waitForTimeout(300)
    ok('the message clears as it is put right', await page.getByText('Enter a valid NRIC / FIN, e.g. S1234567A').count() === 0)
    await nric.fill(was); await nric.blur(); await page.waitForTimeout(1500)
    // #10 a refused save puts the payment's name back
    await page.locator('#section-payment').scrollIntoViewIfNeeded()
    const first = sql(`select name from quote_payments where quote_id='${Q1}' order by position limit 1`)
    await abortActions(page)
    await page.locator('#section-payment').getByRole('button', { name: first, exact: true }).click(); await page.waitForTimeout(200)
    await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('Probe name'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
    ok('a refused save says so', /Couldn’t save the payment/.test(await snack(page)))
    ok('and the name goes back', await page.locator('#section-payment').getByRole('button', { name: first, exact: true }).count() === 1 && await page.locator('#section-payment').getByText('Probe name').count() === 0)
    await page.unroute('**/*')
    // #29 the % box takes digits and one point
    await page.locator('#section-payment').getByRole('button', { name: /%$/ }).first().click(); await page.waitForTimeout(200)
    const pct = page.locator('#section-payment').getByRole('textbox', { name: /^Percentage of/ })
    await pct.fill(''); await pct.pressSequentially('S$1,0.5.5'); const typed = await pct.inputValue()
    ok('the % box keeps digits and one point', typed === '10.55' || typed === '10.5', typed)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await ctx.close()
  })

  await step('confirmation link and preview', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    // #2 a Draft's confirmation link shows no quote
    await page.goto(`${BASE}/confirm/${Q1}`); await ready(page)
    const txt = await page.getByTestId('confirm-page').innerText().catch(() => '')
    ok('a Draft’s confirmation link shows no prices', !/S\$\d/.test(txt), txt.slice(0, 80).replace(/\n/g, ' · '))
    // #27 Preview streams its own ghost
    await page.goto(`${BASE}/quotes/${Q1}/preview`, { waitUntil: 'commit' })
    const ghost = await page.locator('[aria-label="Loading preview"]').first().waitFor({ state: 'attached', timeout: 5000 }).then(() => true, () => false)
    ok('Preview shows its own ghost, not the editor’s', ghost && await page.locator('[aria-label="Loading quote"]').count() === 0)
    await ready(page)
    // #8 the press says what it does
    // REG-768 (UX audit Q2) superseded Mark as sent: Preview's main button is the quote's Send ▾, ending with "Sent it another way"
    ok('the preview’s press is the quote’s Send ▾', await page.getByTestId('quote-send').count() === 1 && await page.getByRole('button', { name: 'Mark as sent' }).count() === 0)
    await page.getByTestId('quote-send').click(); await page.waitForTimeout(400)
    ok('…its menu ends with Sent it another way', await page.getByRole('menuitem', { name: /Sent it another way/ }).count() === 1)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await shot(page, '04-preview')
    await ctx.close()
  })

  await step('quote lists', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/leads/${LEAD1}/quotes`); await ready(page)
    // #11 the Status menu opens through the portal
    await page.getByRole('button', { name: /^Status .* — change status$/ }).first().click(); await page.waitForTimeout(300)
    const inBody = await page.getByRole('menu').first().evaluate((m) => !m.closest('[role="table"], [class*="scroller"]')).catch(() => false)
    ok('the Status menu is not inside the table', inBody)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    // #31 the filters' Dates are the house chips
    await page.getByRole('button', { name: /^Filters?/ }).first().click(); await page.waitForTimeout(400)
    await page.getByRole('tab', { name: /^Date/ }).click(); await page.waitForTimeout(250)
    const dates = page.getByRole('radiogroup', { name: 'Dates' })
    ok('the Dates chips are the house chip group', await dates.getByRole('radio').count() >= 3)
    await dates.getByRole('radio').first().click(); await page.waitForTimeout(200)
    const on1 = await dates.getByRole('radio').first().getAttribute('aria-checked')
    await dates.getByRole('radio').first().click(); await page.waitForTimeout(200)
    const on2 = await dates.getByRole('radio').first().getAttribute('aria-checked')
    ok('pressing the chosen chip again clears it', on1 === 'true' && on2 === 'false', `${on1} → ${on2}`)
    await shot(page, '05-filters-chips')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // U-07 Archive → Archived Quotes → Unarchive
    const title = sql(`select title from quotes where id='${Q1}'`)
    await page.getByRole('button', { name: `More actions for ${title}` }).first().click({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Archive' }).click(); await page.waitForTimeout(1200)
    ok('archiving takes the quote off the tab', sql(`select archived_at is not null from quotes where id='${Q1}'`) === '1')
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.waitForTimeout(300)   // the tab's kebab (the lead header has one too)
    await page.getByRole('menuitem', { name: 'Archived Quotes' }).click(); await page.waitForTimeout(900)
    const sheet = page.getByTestId('archived-quotes')
    ok('Archived Quotes lists it', await sheet.getByTestId('archived-quote').filter({ hasText: 'OM-10001' }).count() === 1)
    await shot(page, '06-archived-quotes')
    await sheet.getByTestId('archived-quote').filter({ hasText: 'OM-10001' }).getByRole('button', { name: 'Unarchive' }).click(); await page.waitForTimeout(1500)
    ok('Unarchive puts it back', sql(`select archived_at is null from quotes where id='${Q1}'`) === '1' && /unarchived/.test(await snack(page)))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // Tools › Quotes: Archive leaves the list at once; ?template= with none
    await page.goto(`${BASE}/quotes`); await ready(page)
    const row9 = page.getByRole('row').filter({ hasText: 'OM-10009' })   // every demo quote is "Whole-home renovation" — the number tells them apart
    await row9.first().hover(); await row9.first().getByRole('button', { name: /^More actions for/ }).click({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Archive' }).click(); await page.waitForTimeout(1500)
    ok('Tools › Quotes: an archived row leaves the list', sql(`select archived_at is not null from quotes where id='${Q9}'`) === '1' && await row9.count() === 0, `${await row9.count()} rows`)
    sql(`update quotes set archived_at = null where id='${Q9}'`)
    if (UNUSED_TPL) {
      await page.goto(`${BASE}/quotes?template=${UNUSED_TPL}`); await ready(page)
      ok('?template= with no quote shows the empty state', await page.getByTestId('search-empty').isVisible())
      await shot(page, '07-template-empty')
    }
    await ctx.close()
  })

  await step('touch tablet', async () => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    sql(`update quotes set deleted_at = strftime('%s','now') where id='${Q9}'`)
    await page.goto(`${BASE}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Deleted Quotes' }).click(); await page.waitForTimeout(900)
    const table = page.getByTestId('deleted-quotes')
    const scrolls = await table.evaluate((t) => getComputedStyle(t).overflowX === 'auto' && t.scrollWidth > t.clientWidth)
    ok('768: Deleted Quotes scrolls sideways inside the dialog', scrolls)
    const del = table.getByRole('button', { name: 'Delete Forever' }).first()
    await del.scrollIntoViewIfNeeded(); const b = await del.boundingBox()
    ok('768: Delete Forever can be reached', !!b && b.x >= 0 && b.x + b.width <= 768, b ? `${Math.round(b.x)}` : 'none')
    await shot(page, '08-deleted-768')
    sql(`update quotes set deleted_at = null where id='${Q9}'`)
    await page.keyboard.press('Escape')
    // #15 By category never under the totals card; T-03 General Info one column
    await page.goto(`${BASE}/quotes/${Q1}?edit=general`); await ready(page)   // (quotes on the move, a deliberate change of this rule) a touch tablet opens the Quote screen; General info is its own screen
    const g = await page.locator('#section-general [class*="grid"]').first().evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)
    ok('768: General Info is one column', g === 1, `${g} columns`)
    await page.goto(`${BASE}/quotes/${Q1}?edit=items`); await ready(page)   // (quotes on the move, a deliberate change of this rule) …and Items its own
    /* (quotes on the move, a deliberate change of this rule) ≤1024 the totals card and By category are no longer a block under the lines: the
       totals are the section's pinned foot, the card opens under its Adjust, By category under its Breakdown — so neither can sit under the other */
    const foot = page.getByTestId('items-touch-foot')
    await foot.scrollIntoViewIfNeeded()
    ok('768: the totals are the pinned foot, the card behind Adjust', await foot.isVisible() && (await page.getByTestId('quote-totals').count()) === 0)
    await page.getByTestId('touch-adjust').click(); await page.waitForTimeout(600)
    ok('768: Adjust opens the totals card', await page.getByTestId('quote-totals').isVisible())
    await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
    await shot(page, '09-editor-768')
    await ctx.close()
  })

  await step('phone', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/quotes/${Q1}?edit=items`); await ready(page)   // (quotes on the move, a deliberate change of this rule) a phone / touch tablet opens the Quote screen; the Items cards are the Items screen
    // #1 the line sheet reads 1500 as S$1,500.00
    const card = page.getByTestId('item-card').filter({ hasText: TOPNAME }).first()
    await card.scrollIntoViewIfNeeded(); await card.getByRole('button', { name: `Edit ${TOPNAME}` }).click(); await page.waitForTimeout(500)
    const sheet = page.getByTestId('line-sheet')
    const was = sql(`select cost_minor || '|' || markup_minor || '|' || qty from quote_items where id='${TOP}'`)
    await sheet.getByTestId('line-more').click(); await page.waitForTimeout(300)   // (quotes on the move, a deliberate change of this rule) Cost sits under the sheet's More; the quantity box reads "Quantity"
    const cost = sheet.getByLabel('Cost (S$)'); await cost.fill(''); await cost.pressSequentially('1500'); await cost.blur(); await page.waitForTimeout(1200)
    ok('Cost 1500 on a phone saves S$1,500.00', sql(`select cost_minor from quote_items where id='${TOP}'`) === '150000', sql(`select cost_minor from quote_items where id='${TOP}'`))
    const qty = sheet.getByLabel('Quantity'); await qty.fill(''); await qty.pressSequentially('1.5'); await qty.blur(); await page.waitForTimeout(1200)
    ok('Qty 1.5 stays 1.5', sql(`select qty from quote_items where id='${TOP}'`) === '1.5', sql(`select qty from quote_items where id='${TOP}'`))
    await shot(page, '10-line-sheet-390')
    const [c, m, q] = was.split('|'); sql(`update quote_items set cost_minor=${c}, markup_minor=${m}, qty=${q} where id='${TOP}'`)
    await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(400)
    // T-01 the title keeps its words; #16 Find open never widens the page
    const tw = await page.locator('h1').first().evaluate((e) => e.getBoundingClientRect().width)
    ok('390: the header title keeps its width', tw >= 150, `${Math.round(tw)}px`)
    await page.getByRole('button', { name: 'Find items' }).click().catch(() => {}); await page.waitForTimeout(400)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: Find open, the page never scrolls sideways', over <= 0, `${over}px`)
    await shot(page, '11-find-390')
    // #7 the printed preview never cuts the page's left edge
    await page.goto(`${BASE}/quotes/${Q1}/preview`); await ready(page)
    const over2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: Preview never scrolls sideways', over2 <= 0, `${over2}px`)
    await ctx.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} passed`)
})()
