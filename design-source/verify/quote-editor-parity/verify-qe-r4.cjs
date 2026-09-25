// Quote editor parity round 4 (REG-626) — readiness on Send, the link only once sent, optional picks, shared files, a contract signs its quote.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const OM1 = sql(`select id from quotes where number='OM-10001'`), LEAD1 = sql(`select lead_id from quotes where number='OM-10001'`)
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 6000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const openQuote = async (page, id) => { await page.goto(`${BASE}/quotes/${id}`); await page.getByTestId('quote-editor').waitFor(); await ready(page) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-qe4/${n}.png` })
  as('dane')

  await step('Send runs Preview’s checks: a schedule that does not add up is named', async () => {
    const pay = sql(`select id || '|' || pct from quote_payments where quote_id='${OM1}' order by position limit 1`).split('|')
    sql(`update quote_payments set pct = ${Number(pay[1]) + 5} where id='${pay[0]}'`)
    await openQuote(page, OM1)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await page.getByRole('menuitem', { name: /Send for confirmation/ }).click()
    await snack(page, 'Before you send: Payment schedule doesn’t add up to 100%')
    ok('no dialog opened', (await page.getByRole('dialog', { name: 'Send for confirmation' }).count()) === 0)
    await shot('01-send-blocked')
    await page.getByRole('button', { name: 'Show me' }).click(); await page.waitForTimeout(900)
    ok('Show me opens the Payment Schedule', await page.locator('#section-payment').getByText('PAYMENT NAME', { exact: false }).first().isVisible().catch(() => false))
    sql(`update quote_payments set pct = ${pay[1]} where id='${pay[0]}'`)
  })
  await step('the link of a draft is not open yet', async () => {
    await openQuote(page, OM1)
    await page.getByRole('button', { name: /More options/ }).first().click()
    await page.getByRole('menuitem', { name: 'Copy confirmation link' }).click()
    await snack(page, 'it opens for the client once the quote is sent')
    const cp = await ctx.newPage(); await cp.goto(`${BASE}/confirm/${OM1}`); await ready(cp)
    ok('“Not ready yet”, no Confirm', (await cp.getByTestId('confirm-not-ready').count()) === 1 && (await cp.getByRole('button', { name: 'Confirm quote' }).count()) === 0)
    ok('and no files before it is sent', (await cp.getByTestId('confirm-files').count()) === 0)
    await cp.screenshot({ path: `${S}/shots-qe4/02-not-ready.png` }); await cp.close()
  })

  /* ── sent, with two optional works ── */
  let opt = []
  await step('the client picks optional works and confirms', async () => {
    opt = sql(`select id || '|' || name from quote_items where quote_id='${OM1}' and kind='item' and parent_id is null and cost_minor > 0 order by position limit 2`).split('\n').map((l) => l.split('|'))
    sql(`update quote_items set optional = 1 where id in ('${opt[0][0]}', '${opt[1][0]}')`)
    sql(`update quotes set status = 'Sent to Client', sent_at = strftime('%s','now','-1 day'), client_sent_at = strftime('%s','now','-1 day'), visibility = 'Shared' where id='${OM1}'`)
    const cp = await ctx.newPage(); await cp.goto(`${BASE}/confirm/${OM1}`); await ready(cp)
    const box = cp.getByTestId('confirm-optional')
    ok('the card lists the two optional works', (await box.getByRole('checkbox').count()) === 2 && (await box.innerText()).includes(opt[0][1]))
    ok('the shared file is listed', /Q-101/.test(await cp.getByTestId('confirm-files').innerText()))
    await box.getByRole('checkbox', { name: `Add ${opt[0][1]}` }).click({ force: true })
    ok('“With your picks” adds it', (await cp.getByTestId('confirm-with-picks').count()) === 1)
    await cp.screenshot({ path: `${S}/shots-qe4/03-confirm-picks.png` })
    await cp.getByLabel('Your full name').fill('Olivia Martinez'); await cp.getByRole('button', { name: 'Confirm quote' }).click()
    await cp.getByTestId('confirm-wanted').waitFor()
    ok('the confirmed card repeats the ask', (await cp.getByTestId('confirm-wanted').innerText()).includes(opt[0][1]))
    await cp.screenshot({ path: `${S}/shots-qe4/04-confirmed-wanted.png` }); await cp.close()
    ok('each optional line holds the answer', sql(`select client_choice from quote_items where id='${opt[0][0]}'`) === 'want' && sql(`select client_choice from quote_items where id='${opt[1][0]}'`) === 'skip')
    ok('the studio hears which', sql(`select count(*) from notifications where quote_id='${OM1}' and kind='quote_confirmed' and body like 'Wants 1 of 2 optional works%'`) !== '0')
  })
  await step('the editor shows each answer and the Activity says it', async () => {
    await openQuote(page, OM1)
    const tags = await page.getByTestId('client-choice').allInnerTexts()
    ok('Client wants it · Client said no', tags.some((t) => /Client wants it/i.test(t)) && tags.some((t) => /Client said no/i.test(t)), tags.join(' · '))
    await page.locator(`[data-item-id="${opt[0][0]}"]`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
    await shot('05-client-choice-tags')
    await page.getByRole('tab', { name: /^Activity/ }).first().click(); await page.waitForTimeout(700)
    ok('Activity: wants 1 of 2', /wants 1 of 2 optional works/.test(await page.locator('#section-activity').innerText()))
  })

  /* ── a contract raised from the quote signs it ── */
  await step('signing the contract signs the quote', async () => {
    sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, from_quote_id) values ('probe-contract-r4', '${LEAD1}', 'Renovation agreement — Olivia', 'Sent to Client', strftime('%s','now'), strftime('%s','now'), '${OM1}')`)
    await page.goto(`${BASE}/leads/${LEAD1}/contracts`); await ready(page)
    const row = page.getByRole('row').filter({ hasText: 'Renovation agreement — Olivia' }).first()
    await row.getByRole('button', { name: /Sent to Client/ }).first().click()
    await page.getByRole('menuitem', { name: /^Signed/ }).first().click()
    // (sweep S2 #3) a list's Signed goes through Mark as signed — its date and copy — and still signs the quote through
    const md = page.getByRole('dialog', { name: 'Mark as signed' }); await md.waitFor()
    await md.getByRole('button', { name: 'Mark as signed' }).click()
    await page.waitForTimeout(1500)
    ok('the quote is Signed, dated, Shared', sql(`select status || '|' || (signed_at is not null) || '|' || visibility from quotes where id='${OM1}'`) === 'Signed|1|Shared')
    await openQuote(page, OM1)
    ok('the editor says it is agreed', /Signed/.test(await page.getByTestId('sent-banner').innerText()))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300)
    await shot('06-signed-through-contract')
  })
  await browser.close()
  as('dane')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
