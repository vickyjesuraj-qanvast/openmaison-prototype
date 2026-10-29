// Quote templates parity rounds 1–3 (REG-617…619) — Playwright against :3011 on a test copy of the DB.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const OM1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340', OM6 = 'a13747cb-e058-46fc-a631-6a22ffa79823', TPL = '7ab7bfe7-3d8b-4e3c-a6ec-0285274c1de6'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
// (REG-665) The demo files the libraries' entries into folders (repair R59); this round's checks were written for — and read — each
// library flat, so the test copy is unfiled and its folders put away first. Folders have their own probes (design-source/verify/folders/).
sql(`UPDATE quote_templates SET folder_id = NULL; UPDATE contract_templates SET folder_id = NULL; UPDATE task_templates SET folder_id = NULL; UPDATE quote_text_templates SET folder_id = NULL; UPDATE payment_templates SET folder_id = NULL; UPDATE price_book_items SET folder_id = NULL; UPDATE price_book_sections SET folder_id = NULL; UPDATE library_folders SET deleted_at = strftime('%s', 'now') WHERE deleted_at IS NULL`)
// The entity's letterhead logo: the probe brings its own picture (it used to read one left in the scratch folder)
const LOGO = `${S}/entity-logo.png`
if (!require('fs').existsSync(LOGO)) require('fs').copyFileSync(require('path').join(__dirname, '../../../public/figma-assets/avatar-user.png'), LOGO)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n')[0]) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 6000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
async function pickSelect(page, scope, label, option) {
  await scope.getByRole('combobox', { name: new RegExp('^' + label) }).first().click()
  await page.getByRole('option', { name: option, exact: true }).first().click()
}
async function sw(scope, name) { const input = scope.getByRole('switch', { name }).first(); await input.locator('xpath=ancestor::label[1]').click().catch(async () => { await input.click({ force: true }) }) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-tpl/${n}.png` })

  /* ── round 2 data first: Company › Profile (socials, bank + SWIFT, a second entity with its letterhead) ── */
  await step('profile: socials, SWIFT, a second entity with its letterhead', async () => {
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('profile').waitFor(); await ready(page)
    const social = page.getByTestId('social-links')
    await social.getByLabel('Instagram').fill('@demostudio.sg'); await social.getByLabel('Facebook').fill('fb.com/demostudio')
    // (the calm UI build 2026-10-27, a deliberate change) Profile is four tabs (5-36): the socials are on Details, the entities on Bank & entities;
    // one Save per tab in the page header ("Save", 5-18) — the socials are saved before the tab changes, then the entities on their own tab
    await page.getByRole('button', { name: 'Save', exact: true }).click(); await snack(page, 'Company details saved')
    await page.goto(`${BASE}/company/profile?tab=entities`); await page.getByTestId('entities').waitFor(); await ready(page)
    const e0 = page.getByTestId('entity').first()
    await e0.getByLabel('Bank', { exact: true }).fill('DBS Bank'); await e0.getByLabel('Account name').fill('Demo Studio Pte Ltd'); await e0.getByLabel('Account number').fill('072-123456-7'); await e0.getByLabel('SWIFT / BIC').fill('DBSSSGSG')
    await page.getByRole('button', { name: 'Add an entity' }).click()
    const e1 = page.getByTestId('entity').nth(1)
    await e1.getByLabel('Entity name').fill('Demo Build Pte Ltd')
    const lh = e1.getByTestId('entity-letterhead')
    await lh.getByLabel('Registered address').fill('8 Ubi Road 2 #05-01, Singapore 408538'); await lh.getByLabel('UEN / Co. Reg. No.').fill('202400001K'); await lh.getByLabel('GST Reg. No.').fill('M91234567X')
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), e1.getByRole('button', { name: /logo/ }).click()])
    await fc.setFiles(LOGO); await snack(page, 'Logo added')
    await shot('01-profile-filled')
    await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(400); await snack(page, 'Company details saved')   // (the calm UI build 2026-10-27, a deliberate change) "Save" (5-18)
    const brand = sql("select value from settings where key='brand'")
    ok('profile saved: socials + SWIFT + entity letterhead', brand.includes('@demostudio.sg') && brand.includes('DBSSSGSG') && brand.includes('202400001K') && brand.includes('data:image'), brand.length + ' chars')
  })

  /* ── round 1: Settings › Quotes › Trades — a note per trade; round 2: Prepared by ── */
  await step('settings: a trade note', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('trades').waitFor(); await ready(page)
    const chip = page.getByTestId('trade').filter({ has: page.getByText('Masonry', { exact: true }) })
    await chip.getByRole('button').first().click()
    const dlg = page.getByRole('dialog', { name: 'Trade' })   // (REG-647) the trade's dialog: name, place, note
    await dlg.getByLabel('Note').fill('To supply labour and materials for the following works')
    await shot('02-trade-note-dialog')
    await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Note saved for Masonry')
    ok('trade note saved + chip marked', (await chip.getAttribute('data-noted')) !== null && sql("select value from settings where key='trade_notes'").includes('masonry'))
    await shot('03-trades-noted')
  })
  await step('settings: Prepared by = every member on the lead', async () => {
    const card = page.getByTestId('prepared-by'); await card.scrollIntoViewIfNeeded()
    await pickSelect(page, card, 'Prepared by prints', 'Every member on the lead'); await snack(page, 'Prepared by prints every member on the lead')
    ok('prepared by stored', sql("select value from settings where key='quote_rules'").includes('"preparedBy":"team"'))
    await shot('04-prepared-by')
  })

  /* ── the print: OM-10001's preview carries the Masonry note; OM-10006's footer prints both members ── */
  await step('preview: the trade note prints under its section', async () => {
    await page.goto(`${BASE}/quotes/${OM1}/preview`); await page.locator('[data-page]').first().waitFor(); await ready(page)
    const n = await page.locator('[data-page]').getByText('To supply labour and materials for the following works').count()
    ok('Masonry section prints the trade note', n >= 1, `${n} time(s)`)
    await page.locator('[data-page]').getByText('To supply labour and materials').first().scrollIntoViewIfNeeded(); await shot('05-preview-trade-note')
  })
  await step('preview: Prepared by prints every member on the lead', async () => {
    await page.goto(`${BASE}/quotes/${OM6}/preview`); await page.locator('[data-page]').first().waitFor(); await ready(page)
    const txt = await page.locator('[data-page]').first().innerText()
    const all = await page.locator('.' + 'x').count().catch(() => 0)
    const body = await page.locator('[data-page]').allInnerTexts()
    ok('prepared by = Alex · Sarah', body.join('\n').includes('Alex · Sarah'), txt.length + ' chars on page 1')
    await shot('06-preview-team')
  })
  await step('preview: a quote under the second entity prints its letterhead', async () => {
    sql(`update quotes set issuing_entity='Demo Build Pte Ltd' where id='${OM1}'`)
    await page.goto(`${BASE}/quotes/${OM1}/preview`); await page.locator('[data-page]').first().waitFor(); await ready(page)
    const body = (await page.locator('[data-page]').allInnerTexts()).join('\n')
    const logo = await page.locator('[data-page] img[src^="data:image/png"]').count()
    ok('letterhead: the entity name, its address and its GST number', body.includes('Demo Build Pte Ltd') && body.includes('8 Ubi Road 2') && body.includes('M91234567X'), `logo imgs ${logo}`)
    ok('letterhead: the entity logo replaces the brand logo', logo >= 1)
    await shot('07-preview-entity')
    sql(`update quotes set issuing_entity=NULL where id='${OM1}'`)
  })

  /* ── the template editor: rounds 1 and 2 on the Default Quote PDF (Letter) ── */
  const insp = page.getByTestId('inspector')
  const outlineRow = (label) => page.locator('[role=list][aria-label="On the page"]').getByText(label, { exact: true }).first()
  const moreOptions = async () => { const b = insp.getByRole('button', { name: /More options/ }).first(); if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click() }
  await step('editor: open', async () => { await page.goto(`${BASE}/templates/${TPL}`); await page.locator('[data-page]').first().waitFor(); await ready(page); const hint = page.getByRole('button', { name: 'Got it' }); if (await hint.count()) await hint.click() })
  await step('editor Q-10: A1 · A2 · B1', async () => {
    await outlineRow('Items table').click(); await insp.waitFor()
    await pickSelect(page, insp, 'Item numbers', 'A1 · A2 · B1'); await page.waitForTimeout(900)
    const a1 = await page.locator('[data-page] td').filter({ hasText: /^A1$/ }).count(), b1 = await page.locator('[data-page] td').filter({ hasText: /^B1$/ }).count()
    ok('numbers read A1 … B1', a1 >= 1 && b1 >= 1, `A1 ${a1} · B1 ${b1}`)
    await shot('08-editor-lettered')
  })
  /* (Vicky 2026-10-29: brought back) the top bar's chips beside the status: Default on the studio's default template, and "Edited since vN" once an edit isn't published yet
     (Q-10's numbering above is one) — the calm UI build had left the status pill alone */
  await step('editor: Default · Edited since', async () => {
    const chips = (await page.locator('header:has(input[aria-label="Template name"])').first().innerText()).replace(/\s+/g, ' ')
    const isDefault = sql(`select is_default from quote_templates where id='${TPL}'`) === '1', version = sql(`select version from quote_templates where id='${TPL}'`)
    ok('the top bar says Default on the default template', isDefault ? /\bDefault\b/i.test(chips) : !/\bDefault\b/i.test(chips), chips.slice(0, 120))   // (Vicky 2026-10-29: brought back)
    ok('…and "Edited since v" + the version while the edit waits to be published', new RegExp(`Edited since v${version}\\b`, 'i').test(chips), chips.slice(0, 120))   // (Vicky 2026-10-29: brought back)
  })
  await step('editor Q-21: sub-total in the heading', async () => {
    await moreOptions()
    const subSw = insp.getByRole('switch', { name: /Sub-total under each section/ }).first()
    if (!(await subSw.isChecked())) await sw(insp, /Sub-total under each section/)
    await insp.getByText('In the heading', { exact: true }).first().click(); await page.waitForTimeout(900)
    const n = await page.locator('[data-page] [data-band-amount]').count()
    ok('bands carry their sub-totals', n >= 1, `${n} band amounts`)
    await page.locator('[data-page] [data-band-amount]').first().scrollIntoViewIfNeeded(); await shot('09-editor-subtotal-band')
  })
  await step('editor Q-11: the Optional price column', async () => {
    const card = insp.getByTestId('column-card').filter({ hasText: 'Optional price' })
    await card.scrollIntoViewIfNeeded(); await sw(card, 'Print the Optional price column'); await page.waitForTimeout(900)
    const note = await insp.getByText('The Optional price column is on').count()
    const optHead = await page.locator('[data-page] tr[data-head] td').filter({ hasText: /^Optional$/ }).count()
    ok('column on, the Optional works switch gives way to the note', note === 1, `head cells ${optHead}`)
    await shot('10-editor-optional-column')
  })
  await step('editor Q-19: Reset this block, then Undo', async () => {
    await insp.getByRole('button', { name: 'Reset this block' }).first().click(); await snack(page, 'Items table reset'); await page.waitForTimeout(700)
    const a1 = await page.locator('[data-page] td').filter({ hasText: /^A1$/ }).count()
    await shot('11-editor-reset')
    await page.getByRole('button', { name: 'Undo' }).last().click(); await page.waitForTimeout(900)
    const back = await page.locator('[data-page] td').filter({ hasText: /^A1$/ }).count()
    ok('reset drops A1, Undo brings it back', a1 === 0 && back >= 1, `after reset ${a1} · after undo ${back}`)
  })
  await step('editor Q-16: ordinals + a footnote', async () => {
    await outlineRow('Payment schedule').click(); await insp.waitFor()
    /* (pending modules S44T, a deliberate change of this rule — UAT row 354: four marks, (a) · (b) · (c) joined them, so the choice is a select) */
    await page.waitForTimeout(800)   // the inspector settles on the block first — a select opens on press, and a press mid-swap is lost
    await insp.getByLabel('Milestones are marked').click(); await page.waitForTimeout(300)
    await page.getByRole('option', { name: '1st · 2nd · 3rd' }).click()
    await insp.getByLabel('Footnote under the schedule').fill('Cheques payable to Demo Studio Pte Ltd'); await page.waitForTimeout(1100)
    const body = (await page.locator('[data-page]').allInnerTexts()).join('\n')
    ok('schedule marked 1st and footnoted', body.includes('1st') && body.includes('Cheques payable to Demo Studio Pte Ltd'))
    await page.locator('[data-page]').getByText('Cheques payable').first().scrollIntoViewIfNeeded(); await shot('12-editor-payments')
  })
  await step('editor Q-24: bank row words + SWIFT', async () => {
    await page.getByRole('button', { name: 'Add to the page' }).click(); await page.getByRole('menuitem', { name: 'Bank details' }).click(); await insp.waitFor(); await page.waitForTimeout(600)
    await moreOptions()
    await insp.getByLabel('Account number', { exact: true }).fill('A/C No.'); await page.waitForTimeout(1100)
    const body = (await page.locator('[data-page]').allInnerTexts()).join('\n')
    ok('bank prints A/C No. and SWIFT', body.includes('A/C No.') && body.includes('DBSSSGSG'))
    await page.locator('[data-page]').getByText('DBSSSGSG').first().scrollIntoViewIfNeeded(); await shot('13-editor-bank')
  })
  await step('editor Q-18: watermark strength', async () => {
    const setup = page.getByRole('button', { name: /Page setup/ }).first(); if ((await setup.getAttribute('aria-expanded')) !== 'true') await setup.click()
    await page.getByLabel('Watermark', { exact: true }).fill('DRAFT'); await page.getByLabel(/Watermark strength/).first().fill('25'); await page.waitForTimeout(900)
    const color = await page.locator('[data-page] [class*="watermark"]').first().evaluate((n) => getComputedStyle(n).color)
    ok('watermark at 25 %', /0\.25\)/.test(color), color)
    await shot('14-editor-watermark')
  })
  await step('editor Q-20: a Social links element in the footer', async () => {
    await outlineRow('Footer').click(); await insp.waitFor()
    await insp.getByRole('button', { name: 'Add to the footer' }).click(); await page.getByRole('menuitem', { name: 'Social links' }).click(); await page.waitForTimeout(1000)
    const n = await page.locator('[data-page] [data-el-kind="social"]').first().innerText()
    ok('footer prints the handles with their marks', n.includes('@demostudio.sg') && n.includes('fb.com/demostudio') && n.includes('www.demostudio.sg'), JSON.stringify(n))
    await shot('15-editor-social')
  })

  /* ── round 3: My Sections — property type + tags; the Add Item popover's filter ── */
  await step('price book: property type + tags', async () => {
    await page.goto(`${BASE}/company/price-book/sections`); await ready(page); await page.getByText('Bathrooms — full works').first().click()
    const dlg = page.getByTestId('section-dialog'); await dlg.waitFor()
    await pickSelect(page, dlg, 'Property type', 'HDB 5-Room'); await dlg.getByLabel('Tags').fill('Bathroom, Premium')
    await shot('16-section-dialog')
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click(); await snack(page, 'Section saved'); await page.waitForTimeout(800)
    const row = sql("select property_type || '|' || tags from price_book_sections where id='pbs-bathrooms-full-works'")
    ok('section stores its type + tags', row === 'HDB 5-Room|["Bathroom","Premium"]', row)
    await shot('17-sections-gallery')
  })
  await step('quote editor: My Sections waits under Show all for another property type', async () => {
    await page.goto(`${BASE}/quotes/${OM1}`); await ready(page); const add = page.getByRole('combobox', { name: 'Add Item' }); await add.waitFor(); await add.scrollIntoViewIfNeeded()
    await add.click(); await add.type('bath'); await page.waitForTimeout(500)
    const before = await page.getByTestId('my-section').count()
    const toggle = page.getByTestId('sections-all-types'); const label = await toggle.innerText()
    await toggle.click(); await page.waitForTimeout(300)
    const after = await page.getByTestId('my-section').count(); const meta = after ? await page.getByTestId('my-section').first().innerText() : ''
    await add.fill(''); await add.type('premium'); await page.waitForTimeout(400)
    const byTag = await page.getByTestId('my-section').count()
    ok('hidden for HDB 4-Room, shown under Show all, found by tag', before === 0 && after === 1 && /HDB 5-Room · Bathroom, Premium/.test(meta) && byTag === 1, `${label} · ${meta.replace(/\n/g, ' ')}`)
    await shot('18-add-item-sections')
    await page.keyboard.press('Escape')
  })

  /* ── phone: the Section note dialog names the trade's note ── */
  await step('phone: the section note hint', async () => {
    sql(`update quote_items set name='Masonry', description=NULL, description_html=NULL where quote_id='${OM1}' and kind='group' and name='Bedrooms'`)   // a section with no note of its own
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/quotes/${OM1}?edit=items`); await ready(p)   // (quotes on the move, a deliberate change of this rule) a phone / touch tablet opens the Quote screen; the Items cards are the Items screen
    // (quotes on the move, a deliberate change of this rule) a section card folds on its tap (C-04); its note opens from the card's ⋮ › Section note…
    await p.getByRole('button', { name: 'More options for Masonry' }).first().tap(); await p.waitForTimeout(400)
    await p.getByRole('menuitem', { name: /Edit section/ }).first().tap(); await p.getByTestId('line-sheet').waitFor(); await p.waitForTimeout(400)
    await p.getByTestId('line-sheet').getByText('Section note').first().tap()
    const hint = p.getByTestId('trade-note-hint'); await hint.waitFor()
    ok('section note dialog quotes the trade note', (await hint.innerText()).includes('To supply labour and materials'))
    await p.screenshot({ path: `${S}/shots-tpl/19-phone-section-note.png` })
    await p.goto(`${BASE}/settings?section=quotes`); await p.getByTestId('trades').waitFor(); await ready(p)
    await p.getByTestId('trade').filter({ has: p.getByText('Masonry', { exact: true }) }).getByRole('button').first().tap(); await p.getByRole('dialog', { name: 'Trade' }).waitFor(); await p.waitForTimeout(500)
    await p.screenshot({ path: `${S}/shots-tpl/20-phone-trade-note.png` })
    await p.goto(`${BASE}/company/profile`); await ready(p); await p.getByTestId('social-links').scrollIntoViewIfNeeded(); await p.waitForTimeout(400)
    await p.screenshot({ path: `${S}/shots-tpl/21-phone-profile-social.png` })
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    ok('phone: Profile has no sideways scroll', !over)
    await phone.close()
  })

  /* ── tablet 768 (touch) and the 320 overflow gate ── */
  await step('responsive: 768 touch and 320', async () => {
    const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
    const t = await tab.newPage(); t.setDefaultTimeout(12000)
    for (const [url, name] of [[`${BASE}/settings?section=quotes`, '22-tablet-settings'], [`${BASE}/company/profile`, '23-tablet-profile'], [`${BASE}/company/price-book/sections`, '24-tablet-sections']]) {
      await t.goto(url); await ready(t); await t.screenshot({ path: `${S}/shots-tpl/${name}.png` })
    }
    await tab.close()
    const narrow = await browser.newContext({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true })
    const n = await narrow.newPage(); n.setDefaultTimeout(12000)
    const over = []
    for (const url of [`${BASE}/settings?section=quotes`, `${BASE}/company/profile`, `${BASE}/company/price-book/sections`, `${BASE}/quotes/${OM1}`]) {
      await n.goto(url); await ready(n)
      if (await n.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) over.push(url.replace(BASE, ''))
    }
    ok('320: no sideways scroll on the four pages', over.length === 0, over.join(', '))
    await narrow.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})().catch((e) => { console.error('FATAL', e); process.exit(2) })
