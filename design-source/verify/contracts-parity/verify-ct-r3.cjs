// Contracts parity round 3 (REG-633) — signing: read and accept per document, the bundle walk in the ticked order, Viewed, draw or type,
// the signing record, the quote from the signing page.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 8000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const OLIVIA_LEAD = sql(`select id from leads where name='Olivia Martinez'`)
const tick = async (scope) => { await scope.getByTestId('gate-accept').locator('label, [role="checkbox"], input').first().click({ force: true }) }
/* (pending modules S14, a deliberate change of this rule) the demo studio has CaseTrust on record (repair R116, as its brand kit and About page
   show): its signing pages carry the deposit-protection disclosure, ticked once the agreement is read — before the code. */
const caseTrust = async (pg) => {
  const box = pg.getByRole('checkbox', { name: 'I have read the CaseTrust deposit-protection disclosure' })
  if (!(await box.count()) || await box.first().isChecked().catch(() => false)) return
  await pg.getByTestId('gate-casetrust-tick').first().scrollIntoViewIfNeeded().catch(() => {})
  await pg.getByTestId('gate-casetrust-tick').first().click(); await pg.waitForTimeout(300)
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-ct3/${n}.png` })
  sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
  let NEW = ''

  await step('a new contract asks to read to the end and tick to accept; the studio can change both', async () => {
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    await page.getByRole('button', { name: /^New Contract/ }).last().click(); await page.getByRole('menuitem', { name: 'From the studio agreement' }).click()
    await page.getByTestId('contract-editor').waitFor({ timeout: 15000 }); await ready(page)
    NEW = page.url().split('/contracts/')[1].split('?')[0]
    ok('both gates on for a new contract', sql(`select requires_scroll || requires_accept from contracts where id='${NEW}'`) === '11')
    await page.getByRole('button', { name: 'eSignatures' }).click()
    const g = page.getByTestId('esign-gates'); await g.waitFor()
    ok('eSignatures › Before the client signs shows them', (await g.getByRole('switch').count()) === 2 || (await g.locator('input[type=checkbox]').count()) === 2)
    await g.getByLabel('The words they tick').fill('I have read this agreement and I accept it.')
    await page.waitForTimeout(1600)
    ok('the tick’s words are kept', sql(`select accept_label from contracts where id='${NEW}'`) === 'I have read this agreement and I accept it.')
    await shot('01-esign-gates')
    await page.keyboard.press('Escape')
  })
  await step('the client reads to the end and ticks before the code; the first open is kept', async () => {
    // (REG-780, UX audit C2) the new contract names OM-10001, a Draft under required approval, which keeps it from going out — the quote is
    // approved first; (REG-786, UX audit C8) a Draft's copy icon reads "Copy link — marks it Sent"
    sql(`update quotes set status='Approved' where id=(select from_quote_id from contracts where id='${NEW}')`)
    await page.reload(); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    await page.getByRole('button', { name: 'Copy link — marks it Sent' }).click(); await snack(page, 'Sent to Client now'); await page.waitForTimeout(800)
    const client = await browser.newContext({ viewport: { width: 1440, height: 1024 } })   // (S42 B-02, a deliberate change of this rule) the client's own browser — the studio's never stamps Viewed
    const sp = await client.newPage(); await sp.goto(`${BASE}/sign/${sql(`select sign_token from contracts where id='${NEW}'`)}`); await ready(sp)   // (pending modules S03, a deliberate change of this rule) the link is the contract's token, never its id
    ok('the first open is stamped', sql(`select viewed_at is not null from contracts where id='${NEW}'`) === '1')
    const send = sp.getByRole('button', { name: 'Send code' })
    ok('Send code waits for the reading', await send.isDisabled() && /Read to the end/.test(await sp.getByTestId('gate-scroll').innerText()))
    await sp.screenshot({ path: `${S}/shots-ct3/02-gates-before.png` })
    await sp.getByTestId('paper-end').scrollIntoViewIfNeeded(); await sp.waitForTimeout(600)
    ok('read to the end', /read to the end/i.test(await sp.getByTestId('gate-scroll').innerText()) && !/Read to the end of the agreement/.test(await sp.getByTestId('gate-scroll').innerText()))
    ok('still waits for the tick', await send.isDisabled())
    await tick(sp); await sp.waitForTimeout(300); await caseTrust(sp)
    ok('the tick opens Send code', await send.isEnabled())
    ok('the quote it signs is linked', /OM-10001/.test(await sp.getByTestId('view-quote').innerText()))
    await sp.screenshot({ path: `${S}/shots-ct3/03-gates-met.png` })
    const qp = await ctx.newPage(); await qp.goto(`${BASE}/sign/${sql(`select sign_token from contracts where id='${NEW}'`)}/quote`); await ready(qp)   // (pending modules S03, a deliberate change of this rule)
    ok('the quote opens read-only', (await qp.getByTestId('sign-quote-view').count()) === 1 && /Olivia Martinez/.test(await qp.locator('body').innerText()) && /Masonry/.test(await qp.locator('body').innerText()) && (await qp.getByRole('button', { name: /Confirm|Sign/ }).count()) === 0)
    await qp.screenshot({ path: `${S}/shots-ct3/04-quote-view.png` }); await qp.close()
    await send.click(); await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    await sp.getByTestId('sign-how').getByRole('radio', { name: 'Draw' }).click()
    const pad = sp.getByTestId('signature-pad').locator('svg'); const b = await pad.boundingBox()
    await sp.mouse.move(b.x + 20, b.y + 60); await sp.mouse.down(); for (let i = 1; i <= 12; i++) await sp.mouse.move(b.x + 20 + i * 18, b.y + 60 + (i % 2 ? 20 : -20)); await sp.mouse.up()
    ok('the agreement sentence names the agreement and its quote', /agree to the .* and quotation OM-10001/.test(await sp.getByTestId('agreement-sentence').innerText()))
    await sp.screenshot({ path: `${S}/shots-ct3/05-draw.png` })
    await sp.getByRole('button', { name: 'Sign agreement' }).click()
    await sp.getByRole('heading', { name: 'Signed' }).waitFor(); await sp.waitForTimeout(1500)
    const r = sql(`select signature_kind || '|' || (length(signature_data) > 20) || '|' || (accepted_at is not null) || '|' || verification_method || '|' || ifnull(signer_phone,'-') || '|' || ifnull(signer_user_agent,'-') || '|' || (signer_timezone is not null) from contracts where id='${NEW}'`)
    ok('the record: drawn, accepted, code to the masked phone, the device', /^draw\|1\|1\|(phone_code|demo_code)\|\+65 •••• \d{4}\|\w+ on \w+\|1$/.test(r), r)   // (S42 B-03, a deliberate change of this rule) the stand-in's code is recorded as demo_code
    await ready(sp)
    const rec = sp.getByTestId('signing-record')
    ok('the page carries the signing record', /Drawn by hand/.test(await rec.innerText()) && /one-time code/.test(await rec.innerText()) && /Fingerprint/.test(await rec.innerText()))
    ok('the paper prints the drawing', (await sp.getByTestId('contract-paper').locator('[data-sign="client-signature"] svg').count()) >= 1)
    await sp.screenshot({ path: `${S}/shots-ct3/06-signed-record.png`, fullPage: true }); await sp.close(); await client.close()
  })
  await step('the studio sees Viewed and the record', async () => {
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    ok('the Sent cell says Viewed', (await page.getByTestId('contract-viewed').count()) >= 1)
    await page.goto(`${BASE}/contracts/${NEW}`); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    await page.getByRole('button', { name: 'Signing record' }).click()
    const d = page.getByRole('dialog', { name: 'Signing record' })
    ok('the editor opens the signing record', /Drawn by hand/.test(await d.innerText()))
    await page.waitForTimeout(500); await shot('07-editor-record')
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/activity`); await ready(page)
    ok('Activity says the client opened it', /opened the contract/.test(await page.locator('main').innerText()))
  })
  await step('a bundle is read one document at a time, in the order ticked, and signed once', async () => {
    const tpl = sql(`select id from contracts where id='${NEW}'`)
    for (const [id, t] of [['probe-ct3-a', 'Scope of Works'], ['probe-ct3-b', 'Payment Terms']]) sql(`insert into contracts (id, lead_id, title, status, created_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept) select '${id}', lead_id, '${t}', 'Draft', strftime('%s','now'), body, recipient_name, recipient_phone, 'composed', 'dane', 1, 1 from contracts where id='${tpl}'`)
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click(); await page.getByRole('menuitem', { name: 'Send together for signature' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send together for signature' }); await dlg.waitFor()
    // untick everything, then tick Payment Terms first, Scope of Works second
    for (const lab of await dlg.locator('label').allInnerTexts()) void lab
    const boxes = dlg.getByRole('checkbox')
    for (let i = 0; i < await boxes.count(); i++) { if (await boxes.nth(i).isChecked()) await boxes.nth(i).click({ force: true }) }
    await dlg.getByRole('checkbox', { name: 'Payment Terms' }).click({ force: true }); await dlg.getByRole('checkbox', { name: 'Scope of Works' }).click({ force: true })
    await page.waitForTimeout(300)
    await dlg.getByRole('button', { name: 'Copy link' }).click()
    await snack(page, 'the documents are Sent to Client now'); await page.waitForTimeout(800)
    const bid = sql(`select bundle_id from contracts where id='probe-ct3-a'`)
    ok('positions follow the ticks', sql(`select title from contracts where bundle_id='${bid}' order by bundle_position`) === 'Payment Terms\nScope of Works')
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/bundle/${bid}`); await ready(sp)
    ok('document 1 of 2 is Payment Terms', /Document 1 of 2 · Payment Terms/.test(await sp.getByTestId('bundle-walk').innerText()))
    await sp.screenshot({ path: `${S}/shots-ct3/08-walk-1.png` })
    const cont = sp.getByRole('button', { name: /^Continue/ })
    ok('Continue waits for its gates', await cont.isDisabled())
    await sp.getByTestId('paper-end').scrollIntoViewIfNeeded(); await sp.waitForTimeout(500); await tick(sp); await sp.waitForTimeout(300)
    await cont.click(); await sp.waitForTimeout(500)
    ok('then Scope of Works', /Document 2 of 2 · Scope of Works/.test(await sp.getByTestId('bundle-walk').innerText()))
    ok('its own gates, fresh', await sp.getByRole('button', { name: /^Continue to sign/ }).isDisabled())
    await sp.getByTestId('paper-end').scrollIntoViewIfNeeded(); await sp.waitForTimeout(500); await tick(sp); await sp.waitForTimeout(300); await caseTrust(sp)
    await sp.getByRole('button', { name: /^Continue to sign/ }).click()
    await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    ok('the sentence names both documents', /Payment Terms, Scope of Works/.test(await sp.getByTestId('agreement-sentence').innerText()))
    await sp.getByRole('button', { name: /^Sign 2 documents/ }).click()
    await sp.getByRole('heading', { name: 'Signed' }).waitFor(); await sp.waitForTimeout(1500)
    ok('both signed, each accepted, the set fingerprinted', sql(`select count(*) from contracts where bundle_id='${bid}' and status='Signed' and accepted_at is not null`) === '2' && sql(`select signing_hash is not null from contract_bundles where id='${bid}'`) === '1')
    await ready(sp)
    ok('the bundle’s record names the documents', /Payment Terms · Scope of Works/.test(await sp.getByTestId('signing-record').innerText()))
    await sp.screenshot({ path: `${S}/shots-ct3/09-bundle-signed.png` }); await sp.close()
  })
  await step('templates start with the gates on and edit them', async () => {
    await page.goto(`${BASE}/company/templates/contracts`); await ready(page)
    await page.getByTestId('new-template').first().click().catch(async () => page.getByRole('button', { name: /^New/ }).first().click()); await page.getByRole('menuitem', { name: 'Blank template' }).click()
    await page.waitForURL(/\/templates\/contracts\//); await ready(page)
    const tid = page.url().split('/templates/contracts/')[1].split('?')[0]
    ok('a new template’s gates are on', sql(`select requires_scroll || requires_accept from contract_templates where id='${tid}'`) === '11')
    await page.getByRole('button', { name: 'eSignatures' }).click()
    await page.getByTestId('esign-gates').waitFor()
    ok('and the template editor shows them', await page.getByTestId('esign-gates').isVisible())
    await page.keyboard.press('Escape')
  })
  await step('on a phone the gates and the pad fit', async () => {
    const id = 'probe-ct3-phone'
    sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token) select '${id}', lead_id, 'Phone probe', 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, recipient_name, recipient_phone, 'composed', 'dane', 1, 1, '${id}' from contracts where id='${NEW}'`)   // (pending modules S03, a deliberate change of this rule) a contract row carries its link's token
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const mp = await m.newPage()
    await mp.goto(`${BASE}/sign/${id}`); await ready(mp)
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('no sideways scroll at 390', over <= 0, `${over}px`)
    await mp.screenshot({ path: `${S}/shots-ct3/10-phone-gates.png` })
    await m.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
