// Contracts parity round 2 (REG-632) — the contract names its quote and its issuer; the quote names its contract and prints its signer;
// the GST chip and Smart Text's empty records; the default template; the Won step's uploaded contract becomes a contract.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
// (REG-665) The demo files the libraries' entries into folders (repair R59); this round's checks were written for — and read — each
// library flat, so the test copy is unfiled and its folders put away first. Folders have their own probes (design-source/verify/folders/).
sql(`UPDATE quote_templates SET folder_id = NULL; UPDATE contract_templates SET folder_id = NULL; UPDATE task_templates SET folder_id = NULL; UPDATE quote_text_templates SET folder_id = NULL; UPDATE payment_templates SET folder_id = NULL; UPDATE price_book_items SET folder_id = NULL; UPDATE price_book_sections SET folder_id = NULL; UPDATE library_folders SET deleted_at = strftime('%s', 'now') WHERE deleted_at IS NULL`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 8000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const byLead = (name) => sql(`select c.id || '|' || l.id from contracts c join leads l on l.id = c.lead_id where l.name = '${name}' order by c.created_at limit 1`).split('|')
const [OLIVIA, OLIVIA_LEAD] = byLead('Olivia Martinez'), [RYAN, RYAN_LEAD] = byLead('Ryan D’Souza')
const OM1 = sql(`select id from quotes where number='OM-10001'`), OM4 = sql(`select id from quotes where number='OM-10004'`)
const openEditor = async (page, id) => { await page.goto(`${BASE}/contracts/${id}`); await page.getByTestId('contract-editor').waitFor(); await ready(page) }
const waitSaved = async (page) => { await page.waitForTimeout(1600) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-ct2/${n}.png` })
  sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)

  await step('a contract names its quote, and the Quote field changes it', async () => {
    ok('Olivia’s Draft names OM-10001 (R51)', sql(`select from_quote_id from contracts where id='${OLIVIA}'`) === OM1)
    await openEditor(page, OLIVIA)
    const field = page.getByTestId('contract-quote')
    ok('the field reads the quote and its total', /OM-10001/.test(await field.innerText()) && /S\$/.test(await field.innerText()))
    await shot('01-meta-row')
    await field.click()
    await page.getByRole('menuitemradio', { name: /^No quote/ }).click(); await waitSaved(page)
    ok('No quote is kept', sql(`select ifnull(from_quote_id,'-') from contracts where id='${OLIVIA}'`) === '-')
    await page.getByRole('button', { name: 'Insert a field' }).click()   // (REG-875) "Smart Text" is now "Insert a field ▾"
    const quoteRow = page.getByRole('menuitem', { name: /^Quote/ })
    /* (S44R — a deliberate change of this rule: UAT row 358, call C7 — the Quote group gained Deposit, the quote's first payment) */
    ok('Insert a field says the Quote records are empty', /4 empty/.test(await quoteRow.innerText()))
    await quoteRow.click()
    const num = page.getByRole('menuitem', { name: /^Quote number/ })
    ok('and each one prints nothing yet', /Empty/.test(await num.innerText()))
    await shot('02-smart-text-empty')
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
    await page.getByTestId('contract-quote').click()
    await page.getByRole('menuitemradio', { name: /^OM-10001/ }).click(); await waitSaved(page)
    ok('OM-10001 again', sql(`select from_quote_id from contracts where id='${OLIVIA}'`) === OM1)
  })
  await step('the quote it names is never swapped for another', async () => {
    sql(`update quotes set archived_at = strftime('%s','now') where id='${OM1}'`)
    await openEditor(page, OLIVIA)
    ok('the editor says the quote was archived', /OM-10001 was archived/.test(await page.getByTestId('contract-quote-gone').innerText()))
    await shot('03-quote-gone')
    await page.goto(`${BASE}/contracts/${OLIVIA}/preview`); await page.getByTestId('contract-preview').waitFor(); await ready(page)
    ok('Preview still quotes OM-10001', /OM-10001/.test(await page.getByTestId('contract-paper').innerText()))
    sql(`update quotes set archived_at = NULL where id='${OM1}'`)
  })
  await step('the issuing entity: from the quote, changeable, with its own letterhead', async () => {
    const e2 = JSON.stringify({ name: 'Loft Works Pte Ltd', bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null, gstRegistered: false, swift: '', logo: null, address: '8 Kallang Place #02-01, Singapore 339157', uen: '202100001K', gstReg: '' })
    sql(`update settings set value = json_insert(value, '$.details.entities[#]', json('${e2}')) where key='brand'`)
    await openEditor(page, OLIVIA)
    const btn = page.getByTestId('contract-issuer')
    ok('Issued by is offered with two entities', await btn.isVisible() && /Demo Studio/.test(await btn.innerText()))
    await btn.click(); await page.getByRole('menuitemradio', { name: /^Loft Works/ }).click(); await waitSaved(page)
    ok('the contract is issued by Loft Works', sql(`select issuing_entity from contracts where id='${OLIVIA}'`) === 'Loft Works Pte Ltd')
    await page.goto(`${BASE}/contracts/${OLIVIA}/preview`); await page.getByTestId('contract-preview').waitFor(); await ready(page)
    const t = await page.getByTestId('contract-paper').innerText()
    ok('the letterhead is Loft Works’ own', /Loft Works Pte Ltd/.test(t) && /8 Kallang Place/.test(t) && /UEN 202100001K/.test(t))
    ok('its UEN never inherits the studio’s', !/201234567M/.test(t))
    await shot('04-entity-letterhead')
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${OLIVIA}`); await ready(sp)
    ok('the signing page names it too', /Loft Works Pte Ltd/.test(await sp.locator('header').first().innerText()) || /Loft Works Pte Ltd/.test(await sp.getByTestId('signing-page').innerText()))
    await sp.close()
    await openEditor(page, OLIVIA)
    await page.getByTestId('contract-issuer').click(); await page.getByRole('menuitemradio', { name: /^Demo Studio/ }).click(); await waitSaved(page)
    ok('back to the studio (stored as none)', sql(`select ifnull(issuing_entity,'-') from contracts where id='${OLIVIA}'`) === '-')
  })
  await step('the GST chip prints the issuer’s GST number', async () => {
    await openEditor(page, OLIVIA)
    await page.getByRole('button', { name: 'Insert a field' }).click(); await page.getByRole('menuitem', { name: /^Studio/ }).click()   // (REG-875) was "Smart Text"
    ok('“GST reg. no.” reads the studio’s', /M90371234/.test(await page.getByRole('menuitem', { name: /^GST reg\. no\./ }).innerText()))
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  })
  await step('the quote names its contract, and prints its signer', async () => {
    await page.goto(`${BASE}/quotes/${OM4}`); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const chip = page.getByTestId('quote-contract-chip')
    ok('the header carries “Contract · Signed”', /Contract: Signed/i.test(await chip.innerText()))   // (the calm UI build 2026-10-27, a deliberate change) 4-11: the contract as one sentence-case link
    await shot('05-quote-chip')
    sql(`update contracts set signed_by = 'Ryan A. D’Souza' where id='${RYAN}'`)
    const tpl = sql(`select id || '|' || version from quote_templates where name='4-Room BTO'`).split('|')   // a design that draws the client's signature
    sql(`update quotes set template_id='${tpl[0]}', template_version=${tpl[1]} where id='${OM4}'`)
    await page.goto(`${BASE}/quotes/${OM4}/preview`); await ready(page)
    ok('the quote’s print names who signed the contract', (await page.locator('body').innerText()).includes('Ryan A. D’Souza'))
    sql(`update contracts set signed_by = NULL where id='${RYAN}'`)
    await page.goto(`${BASE}/quotes/${OM4}`); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    await page.getByTestId('quote-contract-chip').click()
    await page.getByTestId('contract-editor').waitFor()
    ok('the chip opens the contract', page.url().includes(`/contracts/${RYAN}`))
  })
  await step('the default template: set in the gallery, picked first, the landing starts from it', async () => {
    const vo = sql(`select id from contract_templates where title='Variation Order'`)
    await page.goto(`${BASE}/company/templates/contracts`); await ready(page)
    await page.getByRole('button', { name: /More actions for Variation Order|Variation Order.*more/i }).first().click().catch(async () => {
      const card = page.locator('article, [role="article"], [data-testid]').filter({ hasText: 'Variation Order' }).first(); await card.hover(); await card.getByRole('button', { name: /More/ }).first().click()
    })
    await page.getByRole('menuitem', { name: 'Set as default' }).click()
    await snack(page, 'is the default contract template')
    ok('Variation Order is the default', sql(`select is_default from contract_templates where id='${vo}'`) === '1' && sql(`select count(*) from contract_templates where is_default=1`) === '1')
    await ready(page); await shot('06-default-chip')
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts?new=1`); await page.getByTestId('contract-editor').waitFor({ timeout: 15000 }); await ready(page)
    const id = page.url().split('/contracts/')[1].split('?')[0]
    ok('the landing’s contract starts from it', sql(`select template_id from contracts where id='${id}'`) === vo)
    ok('and names the lead’s quote', sql(`select from_quote_id from contracts where id='${id}'`) === OM1)
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    await page.getByRole('button', { name: /New contract/i }).click(); await page.getByRole('menuitem', { name: /From a template/i }).click()   // (the calm UI build 2026-10-27, a deliberate change) W-562 · W-199
    const picked = page.getByTestId('contract-template-option').filter({ hasText: 'Variation Order' })
    await picked.waitFor()
    ok('the picker opens with the default picked', (await picked.getAttribute('aria-checked')) === 'true' && /Default/i.test(await picked.innerText()))
    await page.waitForTimeout(700); await shot('07-picker-default')
    await page.keyboard.press('Escape')
  })
  await step('the Won step’s uploaded contract becomes a Signed contract', async () => {
    const before = Number(sql(`select count(*) from contracts where lead_id='${RYAN_LEAD}'`))
    await page.goto(`${BASE}/leads/${RYAN_LEAD}`); await ready(page)
    await page.getByRole('region', { name: /LEAD STAGES/i }).getByRole('button', { name: /Won/ }).first().click()
    const dlg = page.getByRole('dialog', { name: 'Move stage' })
    await dlg.getByRole('button', { name: /Edit/ }).click(); await page.waitForTimeout(600)
    await dlg.getByRole('tab', { name: 'Upload' }).nth(1).click(); await page.waitForTimeout(400)
    await page.locator('input[type=file]').first().setInputFiles({ name: 'paper-contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%probe\n') })
    await page.waitForTimeout(2600)
    await dlg.getByRole('button', { name: 'Save changes' }).click(); await page.waitForTimeout(2000)
    const r = sql(`select count(*) || '|' || group_concat(status || ':' || source || ':' || ifnull(signed_copy,'-') || ':' || (document_hash is not null) || ':' || ifnull(from_quote_id,'-'), ';') from contracts where lead_id='${RYAN_LEAD}' and source='uploaded'`)
    ok('one Signed uploaded contract, named by its file, with its copy kept and the quote it names', Number(sql(`select count(*) from contracts where lead_id='${RYAN_LEAD}'`)) === before + 1 && /Signed:uploaded:Contract_\w+_signed\.pdf:1:/.test(r), r)
    await page.goto(`${BASE}/leads/${RYAN_LEAD}/contracts`); await ready(page)
    ok('the Contracts tab lists it', /Contract_\w+_signed/.test(await page.getByRole('table').first().innerText().catch(async () => page.locator('main').innerText())))
    await shot('08-won-upload-listed')
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
