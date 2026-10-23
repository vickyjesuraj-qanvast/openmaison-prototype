// Contracts parity round 1 (REG-631) — the record holds: the signed copy kept, the lock at Signed, one move-back rule, the link's
// life by status, the changed-while-reading refusal, Preview = the signing page, the masked NRIC, the allowlist at print.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 8000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
/* (pending modules S14, a deliberate change of this rule) the demo studio has CaseTrust on record (repair R116, as its brand kit and About page
   show): its signing pages carry the deposit-protection disclosure, ticked once the agreement is read — before the code. */
const caseTrust = async (pg) => {
  const box = pg.getByRole('checkbox', { name: 'I have read the CaseTrust deposit-protection disclosure' })
  if (!(await box.count()) || await box.first().isChecked().catch(() => false)) return
  await pg.getByTestId('gate-casetrust-tick').first().scrollIntoViewIfNeeded().catch(() => {})
  await pg.getByTestId('gate-casetrust-tick').first().click(); await pg.waitForTimeout(300)
}
const byLead = (name) => sql(`select c.id || '|' || l.id from contracts c join leads l on l.id = c.lead_id where l.name = '${name}' order by c.created_at limit 1`).split('|')
const [RYAN, RYAN_LEAD] = byLead('Ryan D’Souza'), [OLIVIA, OLIVIA_LEAD] = byLead('Olivia Martinez'), [AISHA] = byLead('Aisha Rahman'), [BEN, BEN_LEAD] = byLead('Benjamin Han')
const RYAN_TITLE = sql(`select title from contracts where id='${RYAN}'`)   // read up front: a CLI read during a server write locks it out (SQLITE_BUSY)
const openEditor = async (page, id) => { await page.goto(`${BASE}/contracts/${id}`); await page.getByTestId('contract-editor').waitFor(); await ready(page) }
const pill = (page) => page.getByTestId('contract-editor').getByRole('button', { name: /^(Draft|Sent to Client|Signed)$/ }).first()

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-ct1/${n}.png` })
  sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)

  await step('a signed contract opens as its kept copy, locked', async () => {
    await openEditor(page, RYAN)
    ok('the kept copy shows where the paper was', await page.getByTestId('contract-signed-copy').isVisible() && (await page.getByTestId('contract-doc').count()) === 0)
    ok('the title is read-only', (await page.getByLabel('Contract title').getAttribute('readonly')) !== null)
    ok('the contract date is disabled', await page.getByTestId('contract-meta').getByRole('button', { name: /Contract date/ }).isDisabled().catch(async () => (await page.getByTestId('contract-meta').locator('[data-disabled]').count()) > 0))
    ok('the banner says it was marked signed', /Marked signed/.test(await page.getByTestId('contract-banner').innerText()))
    await shot('01-signed-copy')
  })
  await step('the kept copy does not follow today’s records', async () => {
    const was = sql(`select property_address from leads where id='${RYAN_LEAD}'`)
    sql(`update leads set property_address='99 Changed Road' where id='${RYAN_LEAD}'`)
    await page.goto(`${BASE}/contracts/${RYAN}/preview`); await page.getByTestId('contract-preview').waitFor(); await ready(page)
    const t = await page.getByTestId('contract-paper').innerText()
    ok('Preview keeps the address it was signed with', t.includes(was) && !t.includes('99 Changed Road'))
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${RYAN}`); await ready(sp)
    const t2 = await sp.getByTestId('contract-paper').innerText()
    ok('so does the client’s page', t2.includes(was) && !t2.includes('99 Changed Road'))
    await sp.close()
    const o = sql(`select property_address from leads where id='${OLIVIA_LEAD}'`)
    sql(`update leads set property_address='7 Draft Lane' where id='${OLIVIA_LEAD}'`)
    await page.goto(`${BASE}/contracts/${OLIVIA}/preview`); await page.getByTestId('contract-preview').waitFor(); await ready(page)
    ok('a Draft still reads today’s records', (await page.getByTestId('contract-paper').innerText()).includes('7 Draft Lane'))
    sql(`update leads set property_address='${was}' where id='${RYAN_LEAD}'`); sql(`update leads set property_address='${o}' where id='${OLIVIA_LEAD}'`)
  })
  await step('moving a studio-marked signature back asks first and clears every stamp', async () => {
    await openEditor(page, RYAN)
    await pill(page).click(); await page.getByRole('menuitemradio', { name: /^Draft/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Move back to Draft?' })
    await dlg.waitFor()
    ok('the confirm names what goes and what stays', /clears the signed date/.test(await dlg.innerText()) && /stays Signed/.test(await dlg.innerText()))
    await page.waitForTimeout(600); await shot('02-move-back-confirm')
    await dlg.getByRole('button', { name: 'Move back' }).click()
    await snack(page, 'Contract marked Draft')
    await page.waitForTimeout(800)
    const r = sql(`select status || '|' || ifnull(signed_at,'-') || '|' || ifnull(document_hash,'-') || '|' || ifnull(signed_body,'-') || '|' || ifnull(signed_copy,'-') from contracts where id='${RYAN}'`)
    ok('Draft, with no signing stamp left', r === 'Draft|-|-|-|-', r.slice(0, 80))
    ok('the quote it signed stays Signed', sql(`select q.status from quotes q join contracts c on c.from_quote_id = q.id where c.id='${RYAN}'`) === 'Signed')
    await ready(page)
    ok('the document edits again', (await page.getByTestId('contract-doc').count()) === 1 && (await page.getByLabel('Contract title').getAttribute('readonly')) === null)
  })
  await step('Mark as signed keeps a copy', async () => {
    await pill(page).click(); await page.getByRole('menuitemradio', { name: /^Signed/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Mark as signed' })
    await dlg.getByRole('button', { name: 'Mark as signed' }).click()
    // (REG-779, UX audit C1) the snackbar names the contract — "{title} marked Signed" (+ Move to Won while the lead isn't Won; Ryan's is)
    await snack(page, `${RYAN_TITLE} marked Signed`); await page.waitForTimeout(1200)
    ok('Signed with its kept copy', sql(`select status || '|' || (document_hash is not null) || '|' || (signed_body is not null) from contracts where id='${RYAN}'`) === 'Signed|1|1')
    await ready(page)
    ok('and the editor shows it', await page.getByTestId('contract-signed-copy').isVisible())
  })
  await step('a signature the client made online stays signed', async () => {
    sql(`update contracts set signed_by='Ryan D’Souza' where id='${RYAN}'`)
    await openEditor(page, RYAN)
    await pill(page).click()
    const item = page.getByRole('menuitemradio', { name: /^Draft/ })
    ok('Draft is out of reach in the editor', (await item.getAttribute('aria-disabled')) === 'true' && /stays signed/.test(`${await item.innerText()} ${await item.getAttribute('title') ?? ''}`))   // (REG-728) a disabled row's reason prints in the row
    await page.keyboard.press('Escape')
    ok('the banner says they signed online', /signed online/.test(await page.getByTestId('contract-banner').innerText()))
    await shot('03-client-signed')
    await page.goto(`${BASE}/leads/${RYAN_LEAD}/contracts`); await ready(page)
    await page.getByRole('button', { name: /^Status Signed/ }).first().click()
    const li = page.getByRole('menuitem', { name: /^Draft/ })
    ok('and in the lead’s Contracts tab', (await li.getAttribute('aria-disabled')) === 'true')
    await page.keyboard.press('Escape')
    sql(`update contracts set signed_by=NULL where id='${RYAN}'`)
  })
  await step('the lists’ delete says the contract can be restored', async () => {
    await page.goto(`${BASE}/leads/${RYAN_LEAD}/contracts`); await ready(page)
    await page.getByRole('row').nth(1).hover()   // the row's actions are parked until hover (the listing's model)
    await page.getByRole('button', { name: 'More actions' }).first().click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    const d = page.getByRole('dialog', { name: 'Delete Contract' })
    ok('“You can restore it from Deleted Contracts.”', /You can restore it from Deleted Contracts/.test(await d.innerText()))
    await d.getByRole('button', { name: 'Cancel' }).click()   // (REG-725) the confirm answers with its verb
  })
  await step('a Draft’s link is not ready, and shows no document', async () => {
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${OLIVIA}`); await ready(sp)
    ok('“Not ready yet”', (await sp.getByTestId('link-notice').getAttribute('data-state')) === 'not-sent' && (await sp.getByTestId('contract-paper').count()) === 0)
    await sp.screenshot({ path: `${S}/shots-ct1/04-not-ready.png` }); await sp.close()
  })
  await step('copying a Draft’s link sends it', async () => {
    sql(`update members set is_you = case id when 'germaine' then 1 else 0 end`)   // (S44Q — row 334, a deliberate change of this rule) an approver's send approves the Draft quote it names now; the hold is a non-approver's — Germaine, a Designer
    await openEditor(page, OLIVIA)
    // (REG-786, UX audit C8) on a Draft the copy icon says it sends: "Copy link — marks it Sent"
    const copyBtn = page.getByRole('button', { name: 'Copy link — marks it Sent' })
    // (REG-780, UX audit C2) the agreement names OM-10001, a Draft under required approval: copying (= sending) is refused and nothing moves
    await copyBtn.click()
    await snack(page, 'OM-10001 is still a Draft — approve and send it first'); await page.waitForTimeout(800)
    ok('a Draft quote holds the link back — still a Draft', sql(`select status || '|' || (sent_at is null) from contracts where id='${OLIVIA}'`) === 'Draft|1')
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
    sql(`update quotes set status='Approved' where id=(select from_quote_id from contracts where id='${OLIVIA}')`)   // the studio stands behind its quote now
    await openEditor(page, OLIVIA)
    await copyBtn.click()
    await snack(page, 'the contract is Sent to Client now'); await page.waitForTimeout(1000)
    ok('Sent to Client, with a sent date', sql(`select status || '|' || (sent_at is not null) from contracts where id='${OLIVIA}'`) === 'Sent to Client|1')
    ok('the banner says it is out for signature', /for signature/.test(await page.getByTestId('contract-banner').innerText()))
  })
  await step('Preview and the signing page print the same studio signature — the creator’s', async () => {
    /* (pending modules S03, a deliberate change of this rule) a member's signature prints only once they said yes to it on their documents */
    sql(`update members set signature_kind='type', signature_name='Sarah Tan', signature_consent='yes', signature_consent_at=strftime('%s','now') where id='sarah'`); sql(`update contracts set created_by='sarah' where id='${OLIVIA}'`)
    await page.goto(`${BASE}/contracts/${OLIVIA}/preview`); await page.getByTestId('contract-preview').waitFor(); await ready(page)
    const pv = await page.locator('[data-sign="studio-signature"]').first().innerText()
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${OLIVIA}`); await ready(sp)
    const sg = await sp.locator('[data-sign="studio-signature"]').first().innerText()
    ok('both print Sarah Tan', /Sarah Tan/.test(pv) && /Sarah Tan/.test(sg), `${pv.slice(0, 40)} / ${sg.slice(0, 40)}`)
    await sp.close()
    sql(`update contracts set created_by='dane' where id='${OLIVIA}'`); sql(`update members set signature_kind=NULL, signature_name=NULL, signature_consent=NULL, signature_consent_at=NULL where id='sarah'`)
  })
  await step('a document changed while the client reads is not signed', async () => {
    const posts = []
    const sp = await ctx.newPage(); sp.on('request', (r) => { if (r.method() === 'POST') posts.push(r.postData() ?? '') })
    await sp.goto(`${BASE}/sign/${OLIVIA}`); await ready(sp)
    await caseTrust(sp); await sp.getByRole('button', { name: 'Send code' }).click()
    await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    await sp.getByLabel('Your full name').fill('Olivia Martinez'); await sp.getByLabel('NRIC / FIN (optional)').fill('S1234567A')
    sql(`update contracts set body = body || '<p>Added while you read.</p>' where id='${OLIVIA}'`)
    await sp.getByRole('button', { name: 'Sign agreement' }).click()
    await snack(sp, 'updated while you were reading')
    ok('refused: still Sent to Client', sql(`select status from contracts where id='${OLIVIA}'`) === 'Sent to Client')
    await ready(sp)
    ok('the page now shows the new text', (await sp.getByTestId('contract-paper').innerText()).includes('Added while you read.'))
    await sp.screenshot({ path: `${S}/shots-ct1/05-changed-while-reading.png` })
    await caseTrust(sp); await sp.getByRole('button', { name: 'Send code' }).click()
    await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    await sp.getByLabel('Your full name').fill('Olivia Martinez'); await sp.getByLabel('NRIC / FIN (optional)').fill('S1234567A')
    await sp.getByRole('button', { name: 'Sign agreement' }).click()
    await sp.getByRole('heading', { name: 'Signed' }).waitFor(); await sp.waitForTimeout(800)
    const r = sql(`select status || '|' || signed_by || '|' || signed_nric || '|' || (document_hash is not null) || '|' || (signed_body like '%Added while you read.%') from contracts where id='${OLIVIA}'`)
    ok('signed, the NRIC masked, the text kept', r === 'Signed|Olivia Martinez|•••••567A|1|1', r)
    ok('the whole NRIC never left the page', !posts.some((b) => b.includes('S1234567A')) && posts.some((b) => b.includes('567A')))
    await sp.screenshot({ path: `${S}/shots-ct1/06-signed.png` }); await sp.close()
  })
  await step('an archived contract’s link, and a deleted lead’s, no longer work', async () => {
    sql(`update contracts set archived_at = strftime('%s','now') where id='${AISHA}'`)
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${AISHA}`); await ready(sp)
    ok('archived → “This link is no longer active”', (await sp.getByTestId('link-notice').getAttribute('data-state')) === 'inactive' && /no longer active/.test(await sp.getByTestId('link-notice').innerText()) && (await sp.getByTestId('contract-paper').count()) === 0)
    await sp.screenshot({ path: `${S}/shots-ct1/07-inactive.png` })
    sql(`update contracts set archived_at = NULL where id='${AISHA}'`)
    sql(`update leads set deleted_at = strftime('%s','now') where id='${BEN_LEAD}'`)
    await sp.goto(`${BASE}/sign/${BEN}`); await ready(sp)
    ok('deleted lead → the same', (await sp.getByTestId('link-notice').getAttribute('data-state')) === 'inactive')
    sql(`update leads set deleted_at = NULL where id='${BEN_LEAD}'`)
    await sp.close()
  })
  await step('the page prints only the editor’s own markup', async () => {
    const id = 'probe-ct1-markup'
    /* (pending modules S03, a deliberate change of this rule) a contract row carries its link's token — the page is found by it, never by the id */
    sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, sign_token) values ('${id}', '${OLIVIA_LEAD}', 'Markup probe', 'Sent to Client', strftime('%s','now'), strftime('%s','now'), '<p>Hello</p><iframe src=\\"https://example.com\\"></iframe><img src=x onerror=\\"window.__x=1\\"><p onclick=\\"window.__y=1\\">Tap</p>', 'Olivia Martinez', '91234567', 'composed', 'dane', '${id}')`)
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/${id}`); await ready(sp)
    const paper = sp.getByTestId('contract-paper')
    ok('no iframe, no handler', (await paper.locator('iframe').count()) === 0 && (await paper.locator('[onerror], [onclick]').count()) === 0 && (await sp.evaluate(() => window.__x === undefined)))
    ok('the text is kept', /Hello/.test(await paper.innerText()) && /Tap/.test(await paper.innerText()))
    await sp.close()
    sql(`delete from contracts where id='${id}'`)
  })
  await step('a bundle signs once, keeps each copy, and refuses a changed set', async () => {
    const b = 'probe-ct1-bundle', c1 = 'probe-ct1-b1', c2 = 'probe-ct1-b2'
    for (const [id, t] of [[c1, 'Bundle doc one'], [c2, 'Bundle doc two']]) sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, bundle_id) select '${id}', lead_id, '${t}', 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, recipient_name, recipient_phone, 'composed', 'dane', '${b}' from contracts where id='${OLIVIA}'`)
    sql(`insert into contract_bundles (id, lead_id, recipient_name, recipient_phone, created_at, sent_at, created_by) values ('${b}', '${OLIVIA_LEAD}', 'Olivia Martinez', '91234567', strftime('%s','now'), strftime('%s','now'), 'dane')`)
    const sp = await ctx.newPage(); await sp.goto(`${BASE}/sign/bundle/${b}`); await ready(sp)
    ok('open', (await sp.getByTestId('bundle-signing-page').getAttribute('data-state')) === 'open')
    // (REG-633) the bundle is walked document by document before the code
    const walk = async () => { for (let i = 0; i < 4 && !(await sp.getByLabel('One-time code').count()); i++) { await caseTrust(sp); await sp.getByRole('button', { name: /^Continue/ }).click(); await sp.waitForTimeout(300) } }   // (pending modules S14) the disclosure rides on the last document
    await walk(); await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    await sp.getByLabel('Your full name').fill('Olivia Martinez')
    sql(`update contracts set title = 'Bundle doc two (edited)' where id='${c2}'`)
    await sp.getByRole('button', { name: /^Sign 2 documents/ }).click()
    await snack(sp, 'updated while you were reading')
    ok('the changed set is refused', sql(`select count(*) from contracts where bundle_id='${b}' and status='Signed'`) === '0')
    await ready(sp)
    await walk(); await sp.getByLabel('One-time code').fill('123456'); await sp.getByRole('button', { name: 'Verify' }).click()
    await sp.getByLabel('Your full name').fill('Olivia Martinez')
    await sp.getByRole('button', { name: /^Sign 2 documents/ }).click()
    await sp.getByRole('heading', { name: 'Signed' }).waitFor(); await sp.waitForTimeout(800)
    ok('both signed with their kept copies', sql(`select count(*) from contracts where bundle_id='${b}' and status='Signed' and document_hash is not null and signed_body is not null`) === '2')
    await sp.close()
  })
  await step('on a phone: the banner and the notice fit', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const mp = await m.newPage()
    await mp.goto(`${BASE}/contracts/${RYAN}`); await mp.getByTestId('contract-editor').waitFor(); await ready(mp)
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('the editor at 390 has no sideways scroll', over <= 0, `${over}px`)
    /* (contracts on the move, a deliberate change of this rule) ≤1024 a signed contract is the Contract screen: the kept copy reads as clause
       cards (components/contracts/screen/contract-document.tsx) under the hero's signed line, not as the 816 paper */
    const fit = await mp.evaluate(() => { const p = document.querySelector('[data-testid="contract-document"]'); return p ? p.getBoundingClientRect().right <= window.innerWidth && !!document.querySelector('[data-testid="hero-signed"]') : false })
    ok('the kept copy fits the phone (as clause cards under the signed line)', fit)
    await mp.screenshot({ path: `${S}/shots-ct1/08-phone-editor.png` })
    await mp.goto(`${BASE}/sign/${AISHA}`); await ready(mp)
    await mp.screenshot({ path: `${S}/shots-ct1/09-phone-signed.png` })
    const n = await browser.newContext({ viewport: { width: 320, height: 700 } }); const np = await n.newPage()
    sql(`update contracts set archived_at = strftime('%s','now') where id='${AISHA}'`)
    await np.goto(`${BASE}/sign/${AISHA}`); await ready(np)
    const o320 = await np.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('the notice at 320 has no sideways scroll', o320 <= 0, `${o320}px`)
    await np.screenshot({ path: `${S}/shots-ct1/10-notice-320.png` })
    sql(`update contracts set archived_at = NULL where id='${AISHA}'`)
    await m.close(); await n.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
