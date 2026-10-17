// Settings parity round 3 (REG-647) — lists and records that hold: sources, reasons and trades rename (what carries the old name follows),
// move and come back with Undo; a Lost reason's gate changes; issuing entities keep an id — a rename follows into the quotes that name one,
// one in use is retired, not removed, and leaves the pickers; Lead capture (Company › Integrations, its one home since one-home N-03) lists
// every way in and a webhook's label joins the sources;
// the intake address keeps its slug; an inactive custom field keeps its value; the bank's Required reaches a lead's questions; Email and
// WhatsApp go out with the in-app notice; the test template waits in Deleted Templates.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 6000 }) }
const chip = (page, testid, name) => page.getByTestId(testid).filter({ has: page.locator('button, span').filter({ hasText: new RegExp(`^${name}`) }) }).first()

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-st3/${n}.png` })

  await step('a lead source renamed, moved and brought back', async () => {
    const referrals = sql(`select count(*) from leads where source='Referral'`)
    await page.goto(`${BASE}/settings?section=leads`); await page.getByTestId('lead-sources').waitFor(); await ready(page)
    await page.getByTestId('lead-sources').getByRole('button', { name: 'Referral', exact: true }).click()
    const dlg = page.getByRole('dialog', { name: 'Lead source' })
    await dlg.getByLabel('Name').fill('Friend referral')
    await shot('01-source-dialog')
    await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Referral is now Friend referral')
    ok('its leads follow the new name', sql(`select count(*) from leads where source='Referral'`) === '0' && sql(`select count(*) from leads where source='Friend referral'`) === referrals, referrals)
    await page.getByTestId('lead-sources').getByRole('button', { name: 'TikTok', exact: true }).click()
    const d2 = page.getByRole('dialog', { name: 'Lead source' })
    await d2.getByRole('combobox', { name: 'Place in the list' }).click(); await page.getByRole('option', { name: '1', exact: true }).click()
    await d2.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Lead sources saved')
    ok('TikTok moved to the front', sql(`select json_extract(value, '\\$[0].name') from settings where key='lead_sources'`) === 'TikTok')
    await page.getByTestId('lead-sources').getByRole('button', { name: 'Remove Houzz' }).click(); await snack(page, 'Houzz removed')
    ok('removed', !sql(`select value from settings where key='lead_sources'`).includes('Houzz'))
    await page.getByRole('button', { name: 'Undo' }).click(); await snack(page, 'Lead sources put back')
    ok('Undo puts it back', sql(`select value from settings where key='lead_sources'`).includes('Houzz'))
    await shot('02-sources')
  })

  await step('reasons: a rename carries the logs; a Lost reason’s gate changes', async () => {
    await page.goto(`${BASE}/settings?section=leads`); await page.getByTestId('lead-reasons').waitFor(); await ready(page)
    await page.getByTestId('reasons-lost').getByRole('button', { name: /^Budget mismatch/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Lost reason' })
    await dlg.getByLabel('Name').fill('Over budget'); await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Budget mismatch is now Over budget')
    ok('the Lost log carries the new name', sql(`select count(*) from stage_logs where to_stage='Lost' and json_extract(payload,'$.reason')='Over budget'`) === '1' && sql(`select count(*) from stage_logs where json_extract(payload,'$.reason')='Budget mismatch'`) === '0')
    await page.getByTestId('reasons-lost').getByRole('button', { name: /^Unresponsive/ }).click()
    const d2 = page.getByRole('dialog', { name: 'Lost reason' })
    // REG-849 (Dane UAT 2.21): the gate's label is "Contacts expected first"
    await d2.getByLabel('Contacts expected first').fill('5'); await d2.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Reasons saved')
    ok('the gate is now 5', /Unresponsive\s*·\s*after 5 contacts/.test(await page.getByTestId('reasons-lost').innerText()) && sql(`select value from settings where key='lead_reasons'`).includes('"minContacts":5'))
    await shot('03-reasons')
  })

  await step('trades: a rename carries the quote lines and the price book; Undo brings a note back', async () => {
    const lines = sql(`select count(*) from quote_items where category='Carpentry'`)
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('trades').waitFor(); await ready(page)
    await chip(page, 'trade', 'Carpentry').getByRole('button').first().click()
    const dlg = page.getByRole('dialog', { name: 'Trade' })
    await dlg.getByLabel('Name').fill('Joinery'); await shot('04-trade-dialog')
    await dlg.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Carpentry is now Joinery')
    ok('the quote lines follow', sql(`select count(*) from quote_items where category='Joinery'`) === lines && sql(`select count(*) from quote_items where category='Carpentry'`) === '0', lines)
    await chip(page, 'trade', 'Painting').getByRole('button').first().click()
    const d2 = page.getByRole('dialog', { name: 'Trade' })
    await d2.getByLabel('Note').fill('All paints low-VOC.'); await d2.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Note saved for Painting')
    await chip(page, 'trade', 'Painting').getByRole('button', { name: 'Remove Painting' }).click(); await snack(page, 'Painting removed')
    ok('the note goes with the trade', !sql(`select coalesce(value,'') from settings where key='trade_notes'`).includes('painting'))
    await page.getByRole('button', { name: 'Undo' }).click(); await snack(page, 'Painting is back')
    // the note is written right after the list; an earlier "Note saved" snackbar may still be up, so wait on the record itself
    for (let t = 0; t < 20 && !sql(`select coalesce(value, '') from settings where key='trade_notes'`).includes('low-VOC'); t++) await page.waitForTimeout(250)
    ok('Undo brings the trade and its note back', sql(`select value from settings where key='trades'`).includes('Painting') && sql(`select value from settings where key='trade_notes'`).includes('low-VOC'))
  })

  await step('issuing entities: a rename follows, one in use is retired and leaves the pickers', async () => {
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('entities').waitFor(); await ready(page)
    await page.getByRole('button', { name: 'Add an entity' }).click()
    await page.getByTestId('entity').nth(1).getByLabel('Entity name').fill('Acme Build Pte Ltd')
    await page.getByRole('button', { name: 'Save changes' }).click(); await snack(page, 'Company details saved')
    const eid = sql(`select json_extract(value, '$.details.entities[1].id') from settings where key='brand'`)
    ok('the new entity carries its own id', !!eid && eid !== 'null', eid)
    const q = sql(`select id from quotes where status='Draft' and deleted_at is null limit 1`)
    sql(`update quotes set issuing_entity='Acme Build Pte Ltd' where id='${q}'`)
    await page.reload(); await page.getByTestId('entities').waitFor(); await ready(page)
    const ent = page.getByTestId('entity').nth(1)
    ok('in use: Retire, not remove', (await ent.getByRole('button', { name: 'Retire' }).count()) === 1 && (await ent.getByRole('button', { name: 'Remove this entity' }).count()) === 0)
    await ent.getByLabel('Entity name').fill('Acme Builders Pte Ltd')
    await page.getByRole('button', { name: 'Save changes' }).click(); await snack(page, 'Company details saved')
    ok('the quote follows the rename', sql(`select issuing_entity from quotes where id='${q}'`) === 'Acme Builders Pte Ltd')
    await page.getByTestId('entity').nth(1).getByRole('button', { name: 'Retire' }).click()
    await page.getByRole('button', { name: 'Save changes' }).click(); await snack(page, 'Company details saved')
    ok('retired on the record', sql(`select json_extract(value, '$.details.entities[1].retired') from settings where key='brand'`) === '1')
    await shot('05-entity-retired')
    const other = sql(`select id from quotes where status='Draft' and deleted_at is null and id <> '${q}' limit 1`)
    await page.goto(`${BASE}/quotes/${other}`); await ready(page)
    const sel = page.getByRole('combobox', { name: 'Issuing Entity' })
    if (await sel.count()) {
      await sel.first().scrollIntoViewIfNeeded(); await sel.first().click(); await page.waitForTimeout(300)
      const opts = await page.getByRole('option').allInnerTexts(); await page.keyboard.press('Escape')
      ok('a new quote is not offered the retired entity', !opts.some((o) => /Acme/.test(o)), opts.join(', '))
    } else ok('a new quote is not offered the retired entity', true, 'one entity offered — no select')
    await page.goto(`${BASE}/quotes/${q}`); await ready(page)
    ok('the quote that names it keeps it', /Acme Builders Pte Ltd/.test(await page.locator('body').innerText()))
    // (one-home N-06, a deliberate change of this rule) Settings › Studio keeps no copy of the entities — Company › Profile shows it retired.
    await page.goto(`${BASE}/settings?section=studio`); await ready(page)
    ok('Settings › Studio keeps no copy of the entities', (await page.getByTestId('studio-entities').count()) === 0)
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('profile').waitFor(); await ready(page)
    ok('Company › Profile shows it retired', (await page.getByTestId('entity-retired').count()) >= 1)
  })

  await step('lead capture: every way in; a webhook’s label joins the sources; the address keeps its slug', async () => {
    await page.goto(`${BASE}/company/integrations`); await ready(page)
    const label = page.getByLabel('Source label (optional)')
    if (await label.count()) {
      await label.fill('Zapier leads')
      await page.getByRole('button', { name: 'Generate webhook URL' }).click(); await snack(page, 'Webhook created')
      ok('the label joins the lead sources', sql(`select value from settings where key='lead_sources'`).includes('Zapier leads'))
      await page.keyboard.press('Escape')
    } else ok('the label joins the lead sources', false, 'no webhook form')
    // (one-home N-03, a deliberate change of this rule) Lead capture lives on Company › Integrations alone: Settings › Lead management keeps
    // Lead sources and its Kept in Company: Integrations link, no copy of the address or the ways in.
    await page.goto(`${BASE}/settings?section=leads`); await page.getByTestId('settings-leads').waitFor(); await ready(page)
    ok('Lead management keeps no Lead capture copy', (await page.getByTestId('lead-capture').count()) === 0 && (await page.getByTestId('ways-in').count()) === 0 && (await page.getByTestId('intake-address').count()) === 0)
    ok('…and links to Integrations', /Integrations/.test(await page.getByTestId('settings-leads').getByTestId('module-links').innerText()))
    await page.goto(`${BASE}/company/integrations`); await page.getByTestId('integrations').waitFor(); await ready(page)
    const hooks = (await page.getByTestId('webhook-row').allInnerTexts()).join(' | ')
    ok('ways in: website, Meta, the webhooks, email', (await page.getByTestId('int-email').count()) === 1 && (await page.getByTestId('int-meta').count()) === 1 && /Google Ads/.test(hooks) && /Zapier leads/.test(hooks) && (await page.getByTestId('int-gmail').count()) === 1, hooks)
    const addr = await page.getByTestId('intake-address').innerText()
    await page.getByTestId('int-webhooks').scrollIntoViewIfNeeded(); await shot('06-ways-in')
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('profile').waitFor(); await ready(page)
    await page.getByLabel('Company name').fill('Acme Interiors Pte Ltd')
    await page.getByRole('button', { name: 'Save changes' }).click(); await snack(page, 'Company details saved')
    await page.goto(`${BASE}/company/integrations`); await page.getByTestId('intake-address').waitFor(); await ready(page)
    ok('a renamed studio keeps its intake address', (await page.getByTestId('intake-address').innerText()) === addr, addr)
  })

  await step('an inactive custom field keeps its value through an edit', async () => {
    const lead = sql(`select id from leads where deleted_at is null and stage='New' limit 1`)
    sql(`insert into lead_custom_fields (id, label, field_type, options, is_required, order_index, is_active, created_at) values ('probe-cf', 'Unit type', 'text', null, 0, 0, 0, strftime('%s','now'))`)
    sql(`insert into lead_custom_field_values (id, lead_id, field_id, value) values ('probe-cfv', '${lead}', 'probe-cf', '"Corner unit"')`)
    await page.goto(`${BASE}/leads/${lead}`); await ready(page)
    await page.getByRole('button', { name: 'Edit lead' }).first().click(); await page.waitForTimeout(600)
    await page.getByRole('button', { name: /^(Save|Save changes|Update lead)$/ }).last().click(); await page.waitForTimeout(1500)
    ok('the value is still there', sql(`select count(*) from lead_custom_field_values where field_id='probe-cf' and lead_id='${lead}'`) === '1')
  })

  await step('the bank’s Required reaches a lead’s questions', async () => {
    const lead = sql(`select l.id from leads l where l.deleted_at is null and exists (select 1 from questions q where q.lead_id=l.id and q.text='Do you have pets?') limit 1`)
    sql(`update studio_scope_questions set is_required=1 where question='Do you have pets?'`)
    sql(`delete from questions where lead_id='${lead}' and text='Do you have pets?' and answer is null`)
    await page.goto(`${BASE}/leads/${lead}/questionnaire`); await ready(page)
    const add = page.getByRole('button', { name: /Add the studio’s (\d+ new )?questions?/ })
    if (await add.count()) { await add.click(); await page.waitForTimeout(1200) }
    ok('the copied question is required', sql(`select required from questions where lead_id='${lead}' and text='Do you have pets?' order by created_at desc limit 1`) === '1')
    await page.reload(); await ready(page)
    ok('the tab marks it', (await page.getByTestId('question-required').count()) >= 1)
    ok('and counts the required still open', /Required still open: \d/.test(await page.getByTestId('required-open').innerText()))
    await shot('07-required-question')
  })

  await step('Email and WhatsApp go out with the in-app notice', async () => {
    await page.goto(`${BASE}/settings?section=notifications`); await page.getByTestId('notification-channels').waitFor(); await ready(page)
    const row = page.getByTestId('event-new_lead')
    const boxes = row.getByRole('switch'), labels = row.locator('label[data-react-aria-pressable]')
    await labels.nth(0).click()
    await snack(page, 'In app off')
    ok('Email and WhatsApp show off and rest', !(await boxes.nth(1).isChecked()) && await boxes.nth(1).isDisabled() && await boxes.nth(2).isDisabled())
    await row.scrollIntoViewIfNeeded(); await shot('08-channels-ride-in-app')
    await labels.nth(0).click(); await snack(page, 'In app on')
    ok('back with In app', !(await boxes.nth(1).isDisabled()))
  })

  await step('the test template waits in Deleted Templates', async () => {
    await page.goto(`${BASE}/company/templates/quotes`); await ready(page)
    ok('not in the gallery', !(await page.getByRole('list', { name: 'Quote templates' }).innerText()).split('\n').some((l) => l.trim() === 'Test'))
    ok('in Deleted Templates', sql(`select deleted_at is not null from quote_templates where name='Test'`) === '1')
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
})()
