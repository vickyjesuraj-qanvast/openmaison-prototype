// Contracts parity round 4 (REG-634) — who may delete; Deleted Contracts' rules; Who sees leads; Tools search by lead and Send together;
// the template guard and Updated by; send checks; notifications; Automation as tasks; Activity names the actor; the Outline drawer; the
// template editor's Undo.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 8000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
const byLead = (name) => sql(`select c.id || '|' || l.id from contracts c join leads l on l.id = c.lead_id where l.name = '${name}' order by c.created_at limit 1`).split('|')
const [OLIVIA, OLIVIA_LEAD] = byLead('Olivia Martinez'), [RYAN, RYAN_LEAD] = byLead('Ryan D’Souza'), [BEN, BEN_LEAD] = byLead('Benjamin Han')
const OLIVIA_TITLE = sql(`select title from contracts where id='${OLIVIA}'`)   // read up front: a CLI read during a server write locks it out (SQLITE_BUSY)
const openEditor = async (page, id) => { await page.goto(`${BASE}/contracts/${id}`); await page.getByTestId('contract-editor').waitFor(); await ready(page) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-ct4/${n}.png` })
  as('dane')

  await step('only its creator, an Owner or an Admin deletes a contract', async () => {
    as('sarah')
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    await page.getByRole('row').nth(1).hover(); await page.getByRole('button', { name: /^More actions for/ }).first().click()
    const del = page.getByRole('menuitem', { name: 'Delete' })
    ok('a Designer’s Delete is out of reach on Dane’s contract', (await del.getAttribute('aria-disabled')) === 'true' && /creator, Owner or Admin/.test(await del.innerText()))   // (sweep S2 #23) the reason in the row, not a native title
    await page.keyboard.press('Escape')
    await openEditor(page, OLIVIA)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click()
    ok('and in the editor', (await page.getByRole('menuitem', { name: 'Delete' }).getAttribute('aria-disabled')) === 'true')
    await page.keyboard.press('Escape')
    as('dane')
  })
  await step('Deleted Contracts: who deleted it, and the rule per row', async () => {
    const id = 'probe-ct4-del'
    sql(`insert into contracts (id, lead_id, title, status, created_at, body, recipient_name, recipient_phone, source, created_by) select '${id}', lead_id, 'To be deleted', 'Draft', strftime('%s','now'), body, recipient_name, recipient_phone, 'composed', 'dane' from contracts where id='${OLIVIA}'`)
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    const row = page.getByRole('row').filter({ hasText: 'To be deleted' })
    await row.hover(); await row.getByRole('button', { name: /^More actions for/ }).click(); await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog', { name: 'Delete Contract' }).getByRole('button', { name: 'Delete' }).click()
    await snack(page, 'Contract deleted'); await page.waitForTimeout(600)
    ok('deleted_by is kept', sql(`select deleted_by from contracts where id='${id}'`) === 'dane')
    await page.getByRole('button', { name: 'More options' }).last().click(); await page.getByRole('menuitem', { name: 'Deleted Contracts' }).click()
    const sheet = page.getByTestId('deleted-contracts'); await sheet.waitFor(); await page.waitForTimeout(800)
    ok('the sheet says who deleted it', /Dane/.test(await sheet.getByTestId('deleted-contract').filter({ hasText: 'To be deleted' }).innerText()))
    await shot('01-deleted-by')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    as('sarah')
    await page.reload(); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click(); await page.getByRole('menuitem', { name: 'Deleted Contracts' }).click()
    await page.getByTestId('deleted-contracts').waitFor(); await page.waitForTimeout(800)
    const r2 = page.getByTestId('deleted-contract').filter({ hasText: 'To be deleted' })
    ok('a Designer cannot restore or delete it for good', await r2.getByRole('button', { name: 'Restore' }).isDisabled())
    await page.keyboard.press('Escape')
    as('dane')
  })
  await step('Who sees leads reaches a contract’s pages and Tools › Contracts', async () => {
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
    as('sarah')
    await page.goto(`${BASE}/contracts/${OLIVIA}`); await ready(page)
    /* (pending modules, a deliberate change of this rule — S41b-2) the not-found is the house's app-wide page now ("This page isn’t here") */
    ok('Olivia’s contract is not Sarah’s to open', /could not be found|not found|This page isn’t here/i.test(await page.locator('body').innerText()))
    await page.goto(`${BASE}/contracts`); await ready(page)
    ok('Tools › Contracts lists none of the leads she doesn’t see', !/Olivia Martinez|Ryan D’Souza/.test(await page.locator('main, body').first().innerText()))
    as('dane')
    sql(`delete from settings where key='lead_visibility'`)
  })
  await step('Tools › Contracts: search by lead, Send together', async () => {
    await page.goto(`${BASE}/contracts`); await ready(page)
    await page.locator('input[type=search], [role=searchbox]').first().fill('Ryan')
    await page.waitForTimeout(600)
    const t = await page.getByRole('table').first().innerText()
    ok('“Ryan” finds Ryan’s contract by its lead', /Ryan/.test(t) && !/Olivia/.test(t))
    await page.locator('input[type=search], [role=searchbox]').first().fill('')
    sql(`insert into contracts (id, lead_id, title, status, created_at, body, recipient_name, recipient_phone, source, created_by, from_quote_id) select 'probe-ct4-b1', lead_id, 'Bundle A', 'Draft', strftime('%s','now'), body, recipient_name, recipient_phone, 'composed', 'dane', from_quote_id from contracts where id='${OLIVIA}'`)
    as('germaine')   // (S44Q — row 334, a deliberate change of this rule) an approver's send approves the Draft quote it names now; the hold is a non-approver's — Germaine, a Designer
    await page.reload(); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click()
    const item = page.getByRole('menuitem', { name: 'Send together for signature' })
    // (REG-780 · UX audit C2 + C4) both documents name OM-10001, a Draft under required approval: Send together is greyed and its row names it
    ok('Send together waits while the quote they name is a Draft, saying so', (await item.getAttribute('aria-disabled')) === 'true' && /OM-10001 is still a Draft/.test(await item.innerText()), (await item.innerText()).replace(/\n/g, ' · '))
    await page.keyboard.press('Escape')
    as('dane')
    sql(`update quotes set status='Approved' where id=(select from_quote_id from contracts where id='${OLIVIA}')`)   // the studio stands behind its quote now
    await page.reload(); await ready(page)
    await page.getByRole('button', { name: 'More options' }).last().click()
    ok('Send together is live on the studio list', (await item.getAttribute('aria-disabled')) !== 'true')
    await item.click()
    await page.getByRole('dialog', { name: /Send together — which lead/ }).waitFor()
    ok('it asks for the lead first', true)
    await shot('02-tools-bundle-lead')
    await page.keyboard.press('Escape')
  })
  await step('templates: Delete forever waits while contracts name it; Updated by', async () => {
    const agr = sql(`select id from contract_templates where title='Interior Design Service Agreement'`)
    as('sarah')
    await page.goto(`/templates/contracts/${agr}`.replace(/^/, BASE)); await ready(page)
    // (sweep S2 #16) the name is Rename's rule (its author, an Owner or an Admin); a Designer's edit to the text still names her as the last editor
    await page.getByTestId('contract-doc').click({ position: { x: 60, y: 80 } }); await page.keyboard.press('ControlOrMeta+End'); await page.keyboard.type(' Probe edit.')
    await page.waitForTimeout(1600)
    as('dane')
    ok('the last editor is kept', sql(`select updated_by from contract_templates where id='${agr}'`) === 'sarah')
    sql(`update contract_templates set deleted_at = strftime('%s','now') where id='${agr}'`)
    await page.goto(`${BASE}/company/templates/contracts`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: /Deleted templates/i }).click()   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    const sheet = page.getByRole('dialog', { name: 'Deleted Templates' }); await sheet.waitFor(); await page.waitForTimeout(600)
    const row = sheet.getByTestId('deleted-library-row').filter({ hasText: 'Interior Design Service Agreement' })
    ok('its Delete Forever waits while contracts name it', (await row.getByRole('button', { name: 'Delete Forever' }).getAttribute('aria-disabled')) === 'true')
    await shot('03-template-kept')
    await page.keyboard.press('Escape')
    sql(`update contract_templates set deleted_at = NULL where id='${agr}'`)
  })
  await step('send checks: nowhere to sign blocks; a missing quote is said', async () => {
    const id = 'probe-ct4-nosign'
    sql(`insert into contracts (id, lead_id, title, status, created_at, body, recipient_name, recipient_phone, source, created_by) values ('${id}', '${OLIVIA_LEAD}', 'No signature field', 'Draft', strftime('%s','now'), '<h1>Short agreement</h1><p>Terms for quote <span class=\"om-token\" data-token=\"quote.number\" contenteditable=\"false\">Quote number</span>.</p>', 'Olivia Martinez', '91234567', 'composed', 'dane')`)
    await openEditor(page, id)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await snack(page, 'no Client signature field')
    ok('Send names what is missing', (await page.getByRole('dialog', { name: 'Send for signature' }).count()) === 0)
    await page.getByRole('button', { name: 'Show me' }).click(); await page.waitForTimeout(500)
    ok('“Show me” opens eSignatures', await page.getByTestId('esign-gates').isVisible())
    await page.getByTestId('esign-field').filter({ hasText: 'Client signature' }).getByRole('button', { name: 'Insert' }).click(); await page.waitForTimeout(1500)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    const dlg = page.getByRole('dialog', { name: 'Send for signature' }); await dlg.waitFor()
    ok('the dialog says what is worth knowing', /names no quote/.test(await dlg.getByTestId('send-notes').innerText()))
    await shot('04-send-notes')
    await page.keyboard.press('Escape')
  })
  await step('Automation makes tasks; sending and marking signed notify the studio', async () => {
    sql(`insert or ignore into lead_assignees (id, lead_id, member_id, assigned_at) values ('probe-ct4-la', '${OLIVIA_LEAD}', 'germaine', strftime('%s','now'))`)   // someone to tell: the lead's member
    const before = Number(sql(`select count(*) from notifications where kind='contract_sent'`))
    // (REG-780, UX audit C2) the quote it names must not be a Draft under required approval — approved (idempotent with the step above)
    sql(`update quotes set status='Approved' where id=(select from_quote_id from contracts where id='${OLIVIA}')`)
    await openEditor(page, OLIVIA)
    await page.getByTestId('contract-header').getByRole('button', { name: 'More options' }).click(); await page.getByRole('menuitem', { name: 'Reminders…' }).click(); await page.waitForTimeout(400)   // (the calm UI build 2026-10-27, a deliberate change) 4-18 · W-120: the bell is the ⋮'s Reminders…
    await page.getByRole('switch', { name: 'Remind me to follow up' }).or(page.getByLabel('Remind me to follow up')).first().click({ force: true })
    await page.getByRole('switch', { name: 'Remind me to thank the client' }).or(page.getByLabel('Remind me to thank the client')).first().click({ force: true })
    await page.waitForTimeout(800); await page.keyboard.press('Escape')
    ok('both switches are on', sql(`select reminders || thank_you from contracts where id='${OLIVIA}'`) === '11')
    // (REG-786, UX audit C8) a Draft's copy icon says it sends: "Copy link — marks it Sent"
    await page.getByTestId('contract-header').getByRole('button', { name: 'More options' }).click(); await page.getByRole('menuitem', { name: 'Copy signing link' }).click(); await snack(page, 'waiting for signature now')   // (the calm UI build 2026-10-27, a deliberate change) 4-18 · W-156 · W-363; await page.waitForTimeout(1200)
    ok('a follow-up task, three days out, on the contract', sql(`select count(*) from lead_tasks where contract_id='${OLIVIA}' and kind='Follow-up' and done=0 and due_at between strftime('%s','now','+2 days') and strftime('%s','now','+4 days')`) === '1')
    ok('the studio heard it went out', Number(sql(`select count(*) from notifications where kind='contract_sent'`)) > before)
    await openEditor(page, OLIVIA)
    await page.getByTestId('contract-editor').getByRole('button', { name: /^(Draft|Sent to Client|Waiting for signature|Signed)$/ }).first().click()
    await page.getByRole('menuitemradio', { name: /^Signed/ }).click()
    await page.getByRole('dialog', { name: 'Mark as signed' }).getByRole('button', { name: 'Mark as signed' }).click()
    // (REG-779, UX audit C1) "{title} marked Signed", and while the lead isn't Won (Olivia's is New) the snackbar offers Move to Won
    await snack(page, `${OLIVIA_TITLE} marked Signed`)
    ok('the snackbar leads on to Won', await page.getByRole('status').filter({ hasText: 'marked Signed' }).getByRole('button', { name: 'Move to Won' }).first().isVisible())
    await page.waitForTimeout(1500)
    ok('the follow-up closed', sql(`select done from lead_tasks where contract_id='${OLIVIA}' and title like 'Follow up on%'`) === '1')
    ok('the thank-you task is there', sql(`select count(*) from lead_tasks where contract_id='${OLIVIA}' and title like 'Thank %' and done=0`) === '1')
    ok('the marking notified the studio', Number(sql(`select count(*) from notifications where kind='quote_signed' and title like '%was marked signed'`)) >= 1)
    ok('and names who marked it', sql(`select marked_by from contracts where id='${OLIVIA}'`) === 'dane')
  })
  await step('Activity names who acted, and keeps the move back and the archive', async () => {
    await openEditor(page, OLIVIA)
    await page.getByTestId('contract-editor').getByRole('button', { name: /^Signed$/ }).first().click()
    await page.getByRole('menuitemradio', { name: /^(Sent to Client|Waiting for signature)/ }).click()   // (the calm UI build 2026-10-27, a deliberate change) W-363
    await page.getByRole('dialog', { name: /Move back to/ }).getByRole('button', { name: 'Move back' }).click(); await snack(page, 'Contract marked Waiting for signature')   /* (the calm UI build 2026-10-27, a deliberate change) W-363 */; await page.waitForTimeout(800)
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/contracts`); await ready(page)
    const row = page.getByRole('row').filter({ hasText: OLIVIA_TITLE }).first()   // (REG-788, R66) the demo's agreement is named after its paper, "Interior Design Service Agreement"
    await row.hover(); await row.getByRole('button', { name: /^More actions for/ }).click(); await page.getByRole('menuitem', { name: 'Archive' }).click(); await snack(page, 'Contract archived'); await page.waitForTimeout(600)
    await page.goto(`${BASE}/leads/${OLIVIA_LEAD}/activity`); await ready(page)
    const t = await page.locator('main').innerText()
    ok('the move back is on the record', /moved the contract .* back to Sent to Client/.test(t))
    ok('the archive too', /archived the contract/.test(t))
    await shot('05-activity')
  })
  await step('the Outline is a pane at 1024', async () => {
    /* (contracts on the move, a deliberate change of this rule) ≤1024 opens the Contract screen; the paper is the Document screen
       (`?edit=document`) and its Outline, on a tablet held sideways, is a pane at the paper's left — never a drawer over it (P-02 · B-13) */
    const t = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const tp = await t.newPage()
    await tp.goto(`${BASE}/contracts/probe-ct4-nosign?edit=document`); await tp.getByTestId('document-screen').waitFor(); await ready(tp)
    await tp.getByTestId('document-outline').click(); await tp.waitForTimeout(600)
    ok('the Outline opens as a pane beside the paper', await tp.getByTestId('document-outline-pane').count() === 1 && await tp.getByTestId('contract-outline').isVisible() && (await tp.getByRole('dialog', { name: 'Outline' }).count()) === 0)
    await tp.screenshot({ path: `${S}/shots-ct4/06-outline-drawer.png` })
    await t.close()
  })
  await step('the template editor’s Delete has an Undo and goes back where it came from', async () => {
    const tid = 'probe-ct4-tpl'
    sql(`insert into contract_templates (id, title, body, created_by, created_at, updated_at) values ('${tid}', 'Probe template', '<p>x</p>', 'dane', strftime('%s','now'), strftime('%s','now'))`)
    await page.goto(`${BASE}/templates/contracts/${tid}?from=${encodeURIComponent('/company/templates/contracts')}`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await snack(page, 'Probe template deleted')
    await page.getByRole('button', { name: 'Undo' }).last().click(); await page.waitForTimeout(1500)
    ok('Undo brings it back', sql(`select deleted_at is null from contract_templates where id='${tid}'`) === '1')
    ok('and the editor went back to the gallery', page.url().includes('/company/templates/contracts'))
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
