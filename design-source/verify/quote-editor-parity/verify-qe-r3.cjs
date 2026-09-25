// Quote editor parity round 3 (REG-625) — Deleted Quotes, who deletes, Bring back, passed validity, Who sees leads, Shared, live menu rows.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const Q = (n) => sql(`select id from quotes where number='${n}'`)
const leadOf = (n) => sql(`select lead_id from quotes where number='${n}'`)
const OM1 = Q('OM-10001'), OM4 = Q('OM-10004'), OM6 = Q('OM-10006'), OM8 = Q('OM-10008')
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|resolved/.test(l)).slice(0, 5).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 6000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const rowOf = (page, number) => page.getByRole('row').filter({ hasText: number }).first()
async function kebab(page, number) { const r = rowOf(page, number); await r.scrollIntoViewIfNeeded(); await r.hover(); await r.getByRole('button', { name: /More actions|More options/ }).first().click() }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-qe3/${n}.png` })
  as('dane')

  await step('the row kebab: Copy Link is the quote’s own address; Preview and Share opens the preview', async () => {
    await page.goto(`${BASE}/leads/${leadOf('OM-10004')}/quotes`); await ready(page)
    ok('a signed quote reads Shared', /OM-10004\s*·\s*Shared/.test(await rowOf(page, 'OM-10004').innerText()))
    /* A one-quote lead's row menu opens under the tab strip (sweep backlog U-01) — the rows are exercised on Tools › Quotes. */
    await page.goto(`${BASE}/quotes`); await ready(page)
    await kebab(page, 'OM-10004'); await page.getByRole('menuitem', { name: 'Copy Link' }).click(); await snack(page, 'Link copied')
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    ok('Copy Link = /quotes/{id}', clip.endsWith(`/quotes/${OM4}`), clip)
    await kebab(page, 'OM-10004'); await page.getByRole('menuitem', { name: 'Preview and Share' }).click()
    await page.waitForURL(new RegExp(`/quotes/${OM4}/preview`)); ok('Preview and Share opens the preview', true)
  })
  await step('the toolbar kebab: Quotes Settings opens Settings › Quotes', async () => {
    await page.goto(`${BASE}/leads/${leadOf('OM-10004')}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click()
    await page.getByRole('menuitem', { name: 'Quotes Settings' }).click()
    await page.waitForURL(/\/settings\?section=quotes/); ok('Settings › Quotes', true)
  })

  /* ── who deletes ── */
  await step('a designer: Delete waits on someone else’s quote', async () => {
    as('sarah')
    await page.goto(`${BASE}/quotes`); await ready(page)
    await kebab(page, 'OM-10001')
    const del = page.getByRole('menuitem', { name: /^Delete/ }).first()
    ok('disabled, “creator, Owner or Admin”', (await del.isDisabled()) && /creator, Owner or Admin/.test(await del.innerText()))   // (sweep S1 #22) Admins delete too
    await shot('01-delete-waits')
    await page.keyboard.press('Escape')
  })
  await step('a designer: a bulk Delete takes only her own', async () => {
    for (const n of ['OM-10001', 'OM-10008']) await rowOf(page, n).getByRole('checkbox').first().click({ force: true })
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await snack(page, 'Quote deleted — 1 left: only its creator, an Owner or an Admin deletes a quote')
    await page.waitForTimeout(600)
    ok('OM-10008 deleted, OM-10001 kept', sql(`select number from quotes where deleted_at is not null order by number`) === 'OM-10008', sql(`select group_concat(number) from quotes where deleted_at is not null`))
  })
  await step('a designer: Deleted Quotes, Restore', async () => {
    await page.getByRole('button', { name: 'More options' }).last().click()
    await page.getByRole('menuitem', { name: 'Deleted Quotes' }).click()
    const sheet = page.getByTestId('deleted-quotes'); await sheet.waitFor()
    await page.waitForTimeout(600)
    const rows = sheet.getByTestId('deleted-quote')
    ok('the sheet lists OM-10008 with its lead', (await rows.count()) === 1 && /OM-10008/.test(await rows.first().innerText()) && /Vivien Lee/.test(await rows.first().innerText()))
    await shot('02-deleted-quotes')
    await rows.first().getByRole('button', { name: 'Restore' }).click(); await snack(page, 'Quote restored')
    await page.waitForTimeout(600)
    ok('back on its lead', sql(`select deleted_at is null from quotes where id='${OM8}'`) === '1')
    await page.getByRole('button', { name: 'Close' }).last().click()
  })
  await step('the owner: Delete forever, and a quote a contract reads stays', async () => {
    as('dane')
    sql(`insert into contracts (id, lead_id, title, status, created_at, from_quote_id) values ('probe-contract', '${leadOf('OM-10004')}', 'Renovation agreement — Ryan', 'Draft', strftime('%s','now'), '${OM4}')`)
    sql(`update quotes set deleted_at = strftime('%s','now') where id in ('${OM4}', '${OM8}')`)
    await page.goto(`${BASE}/quotes`); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click()
    await page.getByRole('menuitem', { name: 'Deleted Quotes' }).click()
    const sheet = page.getByTestId('deleted-quotes'); await sheet.waitFor(); await page.waitForTimeout(600)
    const held = sheet.getByTestId('deleted-quote').filter({ hasText: 'OM-10004' })
    ok('OM-10004’s Delete Forever waits on its contract', await held.getByRole('button', { name: 'Delete Forever' }).isDisabled())
    await held.getByRole('button', { name: 'Delete Forever' }).hover({ force: true }); await page.waitForTimeout(500)
    await shot('03-held-by-contract')
    await page.mouse.move(5, 5); await page.waitForTimeout(400)   // the hovered tooltip leaves before the next press
    const gone = sheet.getByTestId('deleted-quote').filter({ hasText: 'OM-10008' })
    await gone.getByRole('button', { name: 'Delete Forever' }).click()
    await page.getByRole('dialog', { name: 'Delete forever?' }).getByRole('button', { name: 'Delete Forever' }).click()
    await snack(page, 'Quote deleted forever'); await page.waitForTimeout(600)
    ok('OM-10008 and its lines are gone', sql(`select count(*) from quotes where id='${OM8}'`) === '0' && sql(`select count(*) from quote_items where quote_id='${OM8}'`) === '0' && sql(`select count(*) from quote_payments where quote_id='${OM8}'`) === '0')
    ok('OM-10004 stays', sql(`select count(*) from quotes where id='${OM4}'`) === '1')
    await page.getByRole('button', { name: 'Close' }).last().click()
    sql(`update quotes set deleted_at = null where id='${OM4}'`); sql(`delete from contracts where id='probe-contract'`)
  })

  /* ── the passed validity ── */
  await step('a sent quote past its Valid until is marked, not blocked', async () => {
    sql(`update quotes set status = 'Sent to Client', client_sent_at = strftime('%s','now','-20 days'), visibility = 'Shared', valid_until = strftime('%s','now','-3 days') where id='${OM6}'`)
    await page.goto(`${BASE}/leads/${leadOf('OM-10006')}/quotes`); await ready(page)
    const mark = rowOf(page, 'OM-10006').getByTestId('validity-passed')
    ok('the list says it expired', (await mark.count()) === 1 && /Expired/.test(await mark.innerText()), await mark.innerText().catch(() => ''))
    const mb = await mark.boundingBox(), cb = await rowOf(page, 'OM-10006').locator('[data-col="title"]').boundingBox()
    ok('the mark fits its cell', mb.x + mb.width <= cb.x + cb.width, `${Math.round(mb.x + mb.width)} ≤ ${Math.round(cb.x + cb.width)}`)
    await shot('04-validity-row')
    await page.goto(`${BASE}/quotes/${OM6}`); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const b = page.getByTestId('sent-banner')
    ok('the banner says it and how to fix it', /Its validity ended on/.test(await b.innerText()) && /extend Quote Valid Until/.test(await b.innerText()))
    await shot('05-validity-banner')
  })

  /* ── bring a version back ── */
  await step('Bring back version 1 into the draft', async () => {
    const line = sql(`select id || '|' || qty from quote_items where quote_id='${OM6}' and kind='item' order by position limit 1`).split('|')
    await page.getByTestId('sent-banner').getByRole('button', { name: 'Revise — new version' }).click()
    await page.getByRole('button', { name: 'Start version 2' }).click(); await snack(page, 'Version 2 started'); await page.waitForTimeout(800)
    sql(`update quote_items set qty = 99 where id='${line[0]}'`)
    await page.reload(); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    await page.getByRole('button', { name: /More options/ }).first().click(); await page.getByRole('menuitem', { name: 'Version History' }).click()
    const drawer = page.getByTestId('version-history'); await drawer.waitFor()
    await page.waitForTimeout(700)
    await shot('06-version-history')
    await drawer.getByRole('button', { name: 'Bring back' }).first().click()
    await page.getByRole('button', { name: 'Bring back version 1' }).click()
    await page.waitForURL(/restored=1|\/quotes\/[0-9a-f-]+$/, { timeout: 15000 }).catch(() => {})
    await page.getByTestId('quote-editor').waitFor(); await snack(page, 'Version 1 is back')
    ok('the line is back as version 1 had it', sql(`select qty from quote_items where id='${line[0]}'`) === line[1], `${sql(`select qty from quote_items where id='${line[0]}'`)} (v1 ${line[1]})`)
    ok('still version 2, a Draft; version 1 kept', sql(`select version || '|' || status from quotes where id='${OM6}'`) === '2|Draft' && sql(`select count(*) from quote_versions where quote_id='${OM6}' and version=1`) === '1')
    ok('the flag left the address', !/restored=/.test(page.url()), page.url())
    await shot('07-brought-back')
  })

  /* ── Who sees leads ── */
  await step('Who sees leads reaches the quote pages and Tools › Quotes', async () => {
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
    as('sarah')
    /* Under a loading boundary Next streams: the answer is the not-found page, not the status line. */
    await page.goto(`${BASE}/quotes/${OM1}`); await ready(page)
    ok('another’s quote is not found', /could not be found/.test(await page.locator('body').innerText()) && (await page.getByTestId('quote-editor').count()) === 0)
    await page.goto(`${BASE}/quotes/${OM1}/preview`); await ready(page)
    ok('nor its preview', /could not be found/.test(await page.locator('body').innerText()))
    const c = await page.goto(`${BASE}/confirm/${OM1}`)
    ok('the client’s link still opens', c.status() === 200, String(c.status()))
    await page.goto(`${BASE}/quotes`); await ready(page)
    const text = await page.locator('body').innerText()
    ok('Tools › Quotes lists only her leads’ quotes', /OM-10006/.test(text) && !/OM-10001/.test(text) && !/OM-10004/.test(text))
    sql(`delete from settings where key='lead_visibility'`); as('dane')
  })
  await browser.close()
  as('dane')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
