// Quote editor parity round 5 (REG-627) — comments on lines, Upload a quote, Export My Items.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const S =process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const OM6 = sql(`select id from quotes where number='OM-10006'`), LEAD6 = sql(`select lead_id from quotes where number='OM-10006'`)
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 8000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const openQuote = async (page, id) => { await page.goto(`${BASE}/quotes/${id}`); await page.getByTestId('quote-editor').waitFor(); await ready(page) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-qe5/${n}.png` })
  as('dane')
  const [l1, l2] = sql(`select id || '|' || name from quote_items where quote_id='${OM6}' and kind='item' and parent_id is not null order by position limit 2`).split('\n').map((x) => x.split('|'))
  const row = (id) => page.locator(`[data-item-id="${id}"]`).first()

  await step('a line’s ⋯ › Comment opens its thread; a comment lands and counts', async () => {
    await openQuote(page, OM6)
    const r = row(l1[0]); await r.scrollIntoViewIfNeeded(); await r.hover()
    await r.getByRole('button', { name: `More options for ${l1[1]}` }).click()
    await page.getByRole('menuitem', { name: 'Comment' }).click()
    const drawer = page.getByRole('dialog', { name: `Comments on ${l1[1]}` }).or(page.getByLabel(`Comments on ${l1[1]}`)).first(); await drawer.waitFor()
    await page.getByLabel('Write a comment').fill('Can we get the Hafary tiles instead?')   // (the calm UI build 2026-10-27, a deliberate change) W-135
    await page.getByRole('button', { name: 'Send', exact: true }).last().click(); await page.waitForTimeout(800)   // the drawer's Send — the quote header's Send ▾ shares the word
    ok('stored on the line', sql(`select count(*) from quote_item_comments where item_id='${l1[0]}' and body like 'Can we get the Hafary%'`) === '1')
    ok('shown in the thread', (await page.getByTestId('line-comment').count()) === 1)
    await shot('01-line-thread')
    await page.getByRole('button', { name: 'Close' }).last().click(); await page.waitForTimeout(400)
    const count = row(l1[0]).getByTestId('line-comment-count')
    ok('the line shows its count', (await count.innerText()).includes('1'))
  })
  await step('undo keeps the thread', async () => {
    const r = row(l2[0]); await r.scrollIntoViewIfNeeded()
    const qty = r.getByLabel(`Quantity of ${l2[1]}`); const was = await qty.inputValue()
    await qty.click(); await qty.fill(String(Number(was) + 1)); await qty.press('Tab'); await page.waitForTimeout(1500)
    await page.locator('#section-items').getByRole('button', { name: 'More options for Items' }).click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: 'Undo' }).click(); await page.waitForTimeout(2500)   // (the calm UI build 2026-10-27, a deliberate change) 4-03: Undo is the Items ⋮'s row
    ok('the comment is still there', sql(`select count(*) from quote_item_comments where item_id='${l1[0]}'`) === '1' && (await row(l1[0]).getByTestId('line-comment-count').count()) === 1)
  })
  await step('the header’s Comments: every thread, and a comment on another line', async () => {
    as('sarah')
    await openQuote(page, OM6)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: 'Comments', exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) Comments is the header ⋮'s row (4-03)
    const list = page.getByTestId('line-comments'); await list.waitFor()
    ok('one comment · one line', /1 comment · 1 item/.test(await list.innerText()))   // (the calm UI build 2026-10-27, a deliberate change) sentence case, items (4-28)
    await page.getByRole('combobox', { name: /^Comment on/ }).click(); await page.getByRole('option', { name: l2[1], exact: true }).click()
    await page.getByLabel('Write a comment').fill('Measured again on site — 2 more.')
    await page.getByRole('button', { name: 'Send', exact: true }).last().click(); await page.waitForTimeout(800)   // the drawer's Send — the quote header's Send ▾ shares the word
    ok('the second line has its thread', sql(`select author_id from quote_item_comments where item_id='${l2[0]}'`) === 'sarah')
    ok('two threads listed', /2 comments · 2 items/.test(await list.innerText()))   // (the calm UI build 2026-10-27, a deliberate change)
    await shot('02-all-threads')
    await page.getByRole('button', { name: 'Close' }).last().click()
  })
  await step('edit one’s own, delete any', async () => {
    as('dane')
    await openQuote(page, OM6)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: 'Comments', exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) Comments is the header ⋮'s row (4-03)
    const mine = page.getByTestId('line-comment').filter({ hasText: 'Can we get the Hafary' })
    await mine.getByRole('button', { name: 'Comment actions' }).click(); await page.getByRole('menuitem', { name: 'Edit' }).click()
    const box = page.getByTestId('line-comments').locator('input').last()   // the text moved into the box: find the box, not the words
    await box.fill('Can we get the Hafary 600×600 instead?'); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(800)
    ok('edited', sql(`select body from quote_item_comments where item_id='${l1[0]}'`) === 'Can we get the Hafary 600×600 instead?')
    const theirs = page.getByTestId('line-comment').filter({ hasText: 'Measured again' })
    await theirs.getByRole('button', { name: 'Comment actions' }).click()
    ok('no Edit on someone else’s', (await page.getByRole('menuitem', { name: 'Edit' }).count()) === 0)
    await page.getByRole('menuitem', { name: 'Delete' }).click(); await snack(page, 'Comment deleted')
    ok('deleted', sql(`select count(*) from quote_item_comments where item_id='${l2[0]}'`) === '0')
    await page.getByRole('button', { name: 'Close' }).last().click()
  })
  await step('the lead’s Activity reads the comment', async () => {
    await page.goto(`${BASE}/leads/${LEAD6}/activity`); await ready(page)
    ok('“commented on … in the quote OM-10006”', new RegExp(`commented on “${l1[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}” in the quote`).test(await page.locator('body').innerText()))
  })

  /* ── Upload a quote ── */
  /* the sample files live beside this probe (./uploads), not in the scratch dir: a fresh scratch dir has none */
  const UPLOADS = path.resolve(__dirname, '../../..', 'design-source/verify/quote-editor-parity/uploads')
  const upload = async (file) => {
    await page.goto(`${BASE}/leads/${LEAD6}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'New quote' }).first().click()   // (the calm UI build 2026-10-27, a deliberate change) W-011
    await page.getByTestId('create-quote').waitFor()
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByTestId('upload-quote-row').click()])
    await fc.setFiles(path.join(UPLOADS, file))
    await page.getByTestId('upload-quote').waitFor()
    await page.waitForTimeout(1200)
    return page.getByTestId('upload-quote')
  }
  await step('Upload a quote: a PDF we can read becomes a quote', async () => {
    const before = Number(sql(`select count(*) from quotes where lead_id='${LEAD6}'`))
    const box = await upload('flo-design-quotation.pdf')   // (S42 E-05) the fixture now SAYS Flo Design's lines — a reference is read by its words, never its name
    const t = await box.innerText()
    ok('the lines read, with their total', /* (the calm UI build 2026-10-27, a deliberate change) T-01 · 6-14: Upload a quote reads "items" */ /items read from Flo Design’s quote/.test(t), t.split('\n')[0])
    await shot('03-upload-read')
    await page.getByRole('button', { name: 'Create the quote' }).click()
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 15000 }); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const id = page.url().match(/\/quotes\/([0-9a-f-]{36})/)[1]
    ok('a new quote on the lead', Number(sql(`select count(*) from quotes where lead_id='${LEAD6}'`)) === before + 1)
    const n = Number(sql(`select count(*) from quote_items where quote_id='${id}' and kind='item'`))
    ok('with the lines in their trades', n >= 20 && sql(`select count(*) from quote_items where quote_id='${id}' and kind='group' and name='Carpentry'`) === '1', `${n} lines`)
    await shot('04-upload-quote-editor')
  })
  await step('Upload a quote: a spreadsheet is read for real', async () => {
    const box = await upload('our-old-quote.csv')
    ok('3 lines read', /* (the calm UI build 2026-10-27, a deliberate change) T-01 · 6-14: Upload a quote reads "items" */ /3 items/.test(await box.innerText()))
    await page.getByRole('button', { name: 'Create the quote' }).click()
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 15000 }); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const id = page.url().match(/\/quotes\/([0-9a-f-]{36})/)[1]
    const lines = sql(`select i.name || '|' || i.qty || '|' || i.cost_minor || '|' || coalesce(p.name,'') from quote_items i left join quote_items p on p.id = i.parent_id where i.quote_id='${id}' and i.kind='item' order by i.position`)
    ok('the rows as lines, under Carpentry / Ceiling', /Wardrobe, master bedroom\|1\.0\|320000\|Carpentry/.test(lines) && /False ceiling\|120\.0\|650\|Ceiling/.test(lines), lines.replace(/\n/g, ' ; '))
  })
  await step('Upload a quote: a file we cannot read says so', async () => {
    const box = await upload('random-scan.pdf')
    ok('“We couldn’t read random-scan.pdf.”', /We couldn’t read random-scan\.pdf/.test(await box.innerText()) && await page.getByRole('button', { name: 'Create the quote' }).isDisabled())
    await shot('05-upload-unreadable')
  })

  /* ── Export My Items ── */
  await step('Export My Items', async () => {
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click()   // (REG-653, price book parity Q-14) export sits in the page kebab
    await page.getByRole('menuitem', { name: 'Export My Items…' }).click()
    const dlg = page.getByRole('dialog', { name: 'Export My Items' }); await dlg.waitFor()
    await shot('06-export-my-items')
    const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Export' }).click()])
    const file = await dl.path(); const text = fs.readFileSync(file, 'utf8')
    const first = text.split(/\r?\n/)[0]
    ok('a CSV with the list’s columns', /Item,Kind,Description,Unit,Cost,Markup,Unit price,Waste %,Category,Vendor,Website link,Used by/.test(first.replace(/"/g, '')), first)   // (REG-653) + Link · (pending modules S12, a deliberate change of this rule) + Waste %, 1.0's column
    /* (REG-835, Dane UAT 3.11) the export leaves proposed items out unless "Include proposed items" is ticked: a row per live approved item */
    const rows = text.trim().split(/\r?\n/).length - 1, approved = Number(sql(`select count(*) from price_book_items where deleted_at is null and status != 'proposed'`))
    const proposed = sql(`select name from price_book_items where deleted_at is null and status = 'proposed'`).split('\n').filter(Boolean)
    ok('a row per live item (proposals left out)', rows === approved && proposed.every((n) => !text.includes(n)), `${rows} rows · ${approved} approved · ${proposed.length} proposed`)
  })

  /* ── phone ── */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pp = await phone.newPage(); pp.setDefaultTimeout(12000)
  await step('phone: the card says how many comments', async () => {
    await pp.goto(`${BASE}/quotes/${OM6}?edit=items`); await pp.getByTestId('item-cards').waitFor(); await ready(pp)   // (quotes on the move, a deliberate change of this rule) a phone / touch tablet opens the Quote screen; the Items cards are the Items screen
    const card = pp.locator(`[data-testid="item-card"][data-item-id="${l1[0]}"]`); await card.scrollIntoViewIfNeeded()
    ok('“1 comment” on the card', /1 comment/i.test(await card.getByTestId('line-comment-count').innerText()))
    await pp.screenshot({ path: `${S}/shots-qe5/07-phone-card.png` })
    const w = await pp.evaluate(() => document.documentElement.scrollWidth)
    ok('no sideways scroll', w <= 390, String(w))
  })
  await browser.close()
  as('dane')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
