// Quote X-Ray parity round 3 (REG-640) — the record as a working copy: corrections (Not the same item · Same item as…) with Undo and
// everything following; a changed quote says so and Run again reads it as it is now (corrections carried); what went to the client is
// kept, shown and logged; the record names its quote and maker, its kebab runs again, opens the quote, deletes; the Lost dialog's
// competitor comes from the lead's latest comparison.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const VIV = sql(`select id from leads where name='Vivien Lee'`), Q8 = sql(`select id from quotes where number='OM-10008'`)
const ID = sql(`select id from quote_comparisons where quote_id='${Q8}' and other_studio='Flo Design' order by created_at limit 1`)
const res = (id = ID) => JSON.parse(sql(`select result_json from quote_comparisons where id='${id}'`))
const rowOf = (r, re) => r.rows.find((x) => re.test(x.name))

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-xr3/${n}.png` })
  const rowMenu = async (name) => { const row = page.getByTestId('xray-row').filter({ hasText: name }).first(); await row.scrollIntoViewIfNeeded(); await row.hover(); await row.getByRole('button', { name: /^More actions for/ }).click(); await page.waitForTimeout(400) }

  await step('Not the same item takes a pair apart, and everything follows — with Undo', async () => {
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    await rowMenu('Kitchen carpentry, top and bottom cabinets')
    await page.getByRole('menuitem', { name: 'Not the same item' }).click()
    await page.getByText('Marked as not the same item').waitFor(); await ready(page)
    const r = res(), k = rowOf(r, /^Kitchen carpentry/)
    ok('the row is yours alone, Flo’s two lines theirs alone', k.status === 'yours-only' && r.rows.filter((x) => x.status === 'theirs-only' && /kitchen (top-hung|bottom) cabinet/i.test(x.name)).length === 2)
    ok('the correction is kept, with who made it', JSON.parse(sql(`select overrides_json from quote_comparisons where id='${ID}'`)).split.length === 2 && sql(`select corrected_by from quote_comparisons where id='${ID}'`) === 'dane')
    ok('the points follow (the cabinets now read as missing)', /kitchen carpentry/i.test(await page.getByTestId('xray-points').innerText()))
    ok('the foot says who corrected it', /Corrected by Dane on/.test(await page.getByTestId('xray-foot').innerText()))
    await shot('01-not-the-same')
    await page.getByRole('button', { name: 'Undo' }).click().catch(() => {})
    await page.waitForTimeout(1500); await ready(page)
    ok('Undo puts the pair back', rowOf(res(), /^Kitchen carpentry/).status === 'matched' && sql(`select coalesce(overrides_json, 'none') from quote_comparisons where id='${ID}'`) === 'none')
  })

  await step('Same item as… pairs a lone line with one of theirs', async () => {
    await rowMenu('Kitchen backsplash, glass')
    await page.getByRole('menuitem', { name: 'Same item as…' }).click()
    const dlg = page.getByRole('dialog', { name: 'Same item as…' }); await dlg.waitFor()
    await dlg.getByRole('combobox').click(); await page.getByRole('option', { name: /^Lay R10 slip-resistant/ }).click()
    await dlg.getByRole('button', { name: 'Pair' }).click()
    await page.getByText('Paired as the same item').waitFor(); await ready(page)
    const b = rowOf(res(), /^Kitchen backsplash/)
    ok('the pair is made, and marked', b.status === 'matched' && b.by === 'you' && /paired by you/i.test(await page.getByTestId('xray-row').filter({ hasText: 'Kitchen backsplash' }).innerText()))
    await shot('02-paired')
  })

  await step('a changed quote says so; Run again reads it as it is now', async () => {
    const it = sql(`select id from quote_items where quote_id='${Q8}' and name='Kitchen countertop, quartz'`)
    sql(`update quote_items set qty = qty + 3, updated_at = strftime('%s','now') where id='${it}'`)
    await page.reload(); await ready(page)
    ok('the banner names the quote', /OM-10008 has changed since this comparison/.test(await page.getByTestId('xray-stale').innerText()))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); await shot('03-stale')
    await page.getByTestId('xray-stale').getByRole('button', { name: 'Run again' }).click()
    await page.waitForURL((u) => /\/quote-x-ray\/[0-9a-f-]{36}/.test(u.pathname) && !u.pathname.endsWith(ID), { timeout: 15000 }); await ready(page)
    const nid = page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    ok('a new reading, the old one kept', nid !== ID && sql(`select count(*) from quote_comparisons where id='${ID}'`) === '1')
    const k = rowOf(res(nid), /^Kitchen countertop/)
    ok('the new reading reads the changed line', k.qty ? k.qty.yours === 24 : false, JSON.stringify(k.qty))
    ok('the correction carried over', rowOf(res(nid), /^Kitchen backsplash/).by === 'you')
    ok('no banner on the new reading', (await page.getByTestId('xray-stale').count()) === 0)
  })

  await step('what went to the client is kept, shown and logged', async () => {
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null } })
    await page.getByTestId('xray-points').getByRole('button', { name: 'Send to client' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send to client' }); await dlg.waitFor(); await page.waitForTimeout(300)
    const tb = dlg.getByRole('textbox'); await tb.fill(`${await tb.inputValue()} Thanks!`)
    await dlg.getByRole('button', { name: 'Copy' }).click(); await page.waitForTimeout(900)
    ok('Copy keeps the text as it stood', sql(`select sent_via || '|' || (sent_text like '%Thanks!') from quote_comparisons where id='${ID}'`) === 'copy|1')
    await dlg.getByRole('button', { name: 'Open WhatsApp' }).click(); await page.waitForTimeout(900)
    const url = (await page.evaluate(() => window.__opened))[0] || ''
    ok('WhatsApp opens the lead’s own chat', url.startsWith('https://wa.me/6591008254?text='), url.slice(0, 40))
    ok('and the send is stamped', sql(`select sent_via from quote_comparisons where id='${ID}'`) === 'whatsapp')
    await ready(page)
    ok('the header shows Sent', await page.getByText(/^Sent \d/i).first().isVisible())
    await page.getByTestId('xray-points').getByRole('button', { name: 'Send to client' }).click(); await page.waitForTimeout(400)
    ok('the dialog opens on what went out', /Thanks!/.test(await page.getByRole('dialog', { name: 'Send to client' }).getByRole('textbox').inputValue()))
    await page.getByRole('dialog', { name: 'Send to client' }).getByRole('button', { name: 'Reset to draft' }).click()
    ok('Reset to draft brings the draft back', !/Thanks!/.test(await page.getByRole('dialog', { name: 'Send to client' }).getByRole('textbox').inputValue()))
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/leads/${VIV}/activity`); await ready(page)
    ok('the lead’s Activity logs it', /sent the comparison with Flo Design's quote to the client on WhatsApp/.test(await page.locator('main').innerText()))
    await page.goto(`${BASE}/quote-x-ray?lead=${VIV}`); await ready(page)
    ok('and Recent says Sent', /Sent \d/i.test(await page.getByTestId('xray-recent').filter({ hasText: 'Flo Design' }).last().innerText()))
  })

  await step('the record names its quote and maker; its kebab opens the quote and deletes', async () => {
    await page.goto(`${BASE}/quote-x-ray/${ID}`); await ready(page)
    const href = await page.getByTestId('xray-quote-link').getAttribute('href')
    ok('the quote is a link to its editor, with the way back', href.startsWith(`/quotes/${Q8}?from=`))
    ok('the foot names who ran it', /for Dane/.test(await page.getByTestId('xray-foot').innerText()))
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(300)
    const items = await page.getByRole('menuitem').allInnerTexts()
    ok('Run again · Open the quote · Delete', items.join('|') === 'Run again|Open the quote|Delete', items.join('|'))
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog', { name: 'Delete this comparison?' }).getByRole('button', { name: 'Delete' }).click()
    await page.waitForURL((u) => u.pathname === '/quote-x-ray', { timeout: 10000 }); await ready(page)
    ok('Delete removes it and lands on the lead’s X-Ray page', sql(`select count(*) from quote_comparisons where id='${ID}'`) === '0' && new URL(page.url()).searchParams.get('lead') === VIV)
  })

  await step('the Lost dialog’s competitor comes from the latest comparison', async () => {
    await page.goto(`${BASE}/leads/${VIV}`); await ready(page)
    await page.getByRole('button', { name: /^Stage: / }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Lost' }).click()
    const dlg = page.getByRole('dialog', { name: 'Move stage' }); await dlg.waitFor()
    await dlg.getByRole('combobox', { name: /Reason/ }).click(); await page.getByRole('option', { name: 'Went with another firm' }).click()
    const latest = sql(`select other_studio from quote_comparisons where lead_id='${VIV}' order by created_at desc limit 1`)
    ok('the competitor starts as the latest comparison’s studio', (await dlg.getByRole('textbox', { name: /Competitor/ }).inputValue()) === latest, latest)
    ok('and says where it came from', /From the Quote X-Ray of/.test(await dlg.innerText()))
    await page.waitForTimeout(800); await shot('04-lost-competitor')
    await dlg.getByRole('button', { name: 'Cancel' }).click()
    ok('nothing moved', sql(`select stage from leads where id='${VIV}'`) !== 'Lost')
  })

  await step('phone: the row menu on a card, the stale banner', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await m.newPage()
    const any = sql(`select id from quote_comparisons where quote_id='${Q8}' order by created_at desc limit 1`)
    await p.goto(`${BASE}/quote-x-ray/${any}`); await ready(p)
    const card = p.getByTestId('xray-row').filter({ hasText: 'Kitchen countertop' }).first(); await card.scrollIntoViewIfNeeded()
    ok('the card carries its kebab on touch', await card.getByRole('button', { name: /^More actions for/ }).isVisible())
    await p.screenshot({ path: `${S}/shots-xr3/05-phone.png` })
    const w = await m.newPage(); await w.setViewportSize({ width: 320, height: 800 }); await w.goto(`${BASE}/quote-x-ray/${any}`); await ready(w)
    ok('no sideways scroll at 320', (await w.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0)
    await m.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
