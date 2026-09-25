// Settings parity round 1 (REG-645) — Settings in 1.0's shape: the modules Studio · Lead management · Quotes & pricing · Notifications
// on Company's frame (tab strip, ?section=, ?from=), Studio's team / entities / Who may do what (from the enforced rules), the studio's
// GST (registration + the rate a new line starts with), one read-only look, the real next quote number, the studio's name from its
// record, the copy slips.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`); sql(`delete from settings where key='lead_visibility'`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ timeout: 6000 }) }
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
const reach = async (page, key) => page.getByTestId(`may-${key}`).locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach')))
const STUDIO0 = sql(`select value from settings where key='studio'`)

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${S}/shots-st1/${n}.png` })

  await step('Settings opens on Studio, the modules as a tab strip', async () => {
    await page.goto(`${BASE}/settings`); await page.getByTestId('settings-studio').waitFor(); await ready(page)
    const tabs = await page.getByRole('tablist', { name: 'Settings sections' }).getByRole('tab').allInnerTexts()
    ok('six modules in 1.0’s order', tabs.join(' · ') === 'Studio · Lead management · Quotes & pricing · Notifications · Projects · Finance', tabs.join(' · '))
    ok('Studio is the open tab', (await page.getByRole('tab', { name: 'Studio' }).getAttribute('aria-selected')) === 'true')
    const owner = await page.getByTestId('team-owner').innerText()
    ok('the team by role: Dane is the Owner, marked You', /Dane/.test(owner) && /you/i.test(owner))
    ok('Manager and Designers listed with who they report to', /James/.test(await page.getByTestId('team-manager').innerText()) && /reports to James/.test(await page.getByTestId('team-designer').innerText()))
    const ents = page.getByTestId('studio-entity')
    ok('the issuing entities: the studio first', (await ents.count()) >= 1 && /The studio/.test(await ents.first().innerText()))
    ok('settings are the Owners’ and Admins’', JSON.stringify(await reach(page, 'settings')) === '["yes","yes","no","no"]')
    ok('a quote is deleted by an Owner, an Admin or its creator', JSON.stringify(await reach(page, 'delete-quote')) === '["yes","yes","own","own"]')
    ok('a Manager assigns within the team; a Designer does not', JSON.stringify(await reach(page, 'assign')) === '["yes","yes","team","no"]')
    ok('approval: Managers and Designers only as the backup', JSON.stringify(await reach(page, 'approve')) === '["yes","yes","backup","backup"]')
    ok('everyone sees every lead (the studio’s setting)', JSON.stringify(await reach(page, 'see')) === '["yes","yes","yes","yes"]')
    await shot('01-studio')
  })

  await step('Who may do what follows the studio’s settings', async () => {
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
    sql(`insert or replace into settings (key, value, updated_at) values ('quote_rules', '{"roundStep":0,"paymentLock":true,"backupApproverId":"sarah","preparedBy":"member"}', strftime('%s','now'))`)
    await page.goto(`${BASE}/settings?section=studio`); await page.getByTestId('studio-roles').waitFor(); await ready(page)
    ok('assigned only: a Manager sees the team’s, a Designer her own', JSON.stringify(await reach(page, 'see')) === '["yes","yes","team","own"]')
    ok('the payment lock: only Owners and Admins', JSON.stringify(await reach(page, 'payments')) === '["yes","yes","no","no"]')
    ok('the backup approver is named', /Sarah/.test(await page.getByTestId('backup-line').innerText()))
    await page.getByTestId('studio-roles').scrollIntoViewIfNeeded(); await shot('02-roles-following-settings')
    sql(`delete from settings where key='quote_rules'`)
  })

  await step('modules in the address; Projects is still to come; the studio’s own name', async () => {
    await page.goto(`${BASE}/settings`); await ready(page)
    await page.getByRole('tab', { name: 'Lead management' }).click(); await page.waitForURL(/section=leads/); await page.getByTestId('settings-leads').waitFor(); await ready(page)
    const help = await page.getByTestId('settings-leads').locator('p').first().innerText()
    ok('Lead management applies to Demo Studio (from the record, no Pte Ltd)', /every lead in Demo Studio —/.test(help), help)
    ok('Kept in Company: Integrations · Questionnaire · Members', /Integrations/.test(await page.getByTestId('module-links').innerText()) && /Questionnaire/.test(await page.getByTestId('module-links').innerText()))
    ok('the stage movement card names the fixed stages', /New, Contacted, Met, Quote Sent and Won/.test(await page.getByText('How leads move from one stage').innerText()))
    ok('the On Hold field reads well', (await page.getByLabel('Add an On Hold reason').count()) === 1)
    ok('the reasons, saved equal to the defaults, say so', /These are the defaults\./.test(await page.getByTestId('lead-reasons').innerText()))
    await shot('03-lead-management')
    await page.getByRole('tab', { name: 'Projects' }).click(); await snack(page, 'Coming soon in OpenMaison 2.0')
    ok('Projects stays put', /section=leads/.test(page.url()))
    sql(`update settings set value = json_set(value, '$.name', 'Acme Interiors Pte Ltd') where key='studio'`)
    await page.reload(); await page.getByTestId('settings-leads').waitFor(); await ready(page)
    ok('a renamed studio reads its new name', /every lead in Acme Interiors —/.test(await page.getByTestId('settings-leads').locator('p').first().innerText()))
    sql(`update settings set value = '${STUDIO0}' where key='studio'`)
  })

  await step('Quotes & pricing: the real next number, GST', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('settings-quotes').waitFor(); await ready(page)
    const next = `OM-${Number(sql(`select max(cast(substr(number, 4) as integer)) from quotes`)) + 1}`
    ok('the example is the next quote’s number', (await page.getByTestId('number-example').innerText()) === next, `${await page.getByTestId('number-example').innerText()} vs ${next}`)
    ok('Kept in Company: Templates · Price book', /Templates/.test(await page.getByTestId('module-links').innerText()) && /Price book/.test(await page.getByTestId('module-links').innerText()))
    const gst = page.getByTestId('gst'); await gst.scrollIntoViewIfNeeded()
    await gst.locator('label').first().click(); await snack(page, 'not registered for GST')
    ok('registration off is saved', sql(`select json_extract(value, '$.gstRegistered') from settings where key='studio'`) === '0')
    ok('the rate rests while off', await gst.getByLabel('GST rate (%)').isDisabled())
    await shot('04-gst-off')
    await gst.locator('label').first().click(); await snack(page, 'is registered for GST — new quotes carry it')
    await gst.getByLabel('GST rate (%)').fill('8.5')   // a rate takes one decimal (the amount filter kept whole numbers — reader E, price book audit)
    await gst.getByRole('button', { name: 'Save rate' }).click(); await snack(page, 'New lines start at 8.5% GST')
    ok('the rate is saved', sql(`select json_extract(value, '$.gstPct') from settings where key='studio'`) === '8.5')
    await gst.getByLabel('GST rate (%)').fill('45')
    ok('a rate past 30 is refused', /Between 0 and 30/.test(await gst.innerText()) && await gst.getByRole('button', { name: 'Save rate' }).isDisabled())
    await shot('05-gst-rate')
  })

  await step('a new line starts at the studio’s rate', async () => {
    const q = sql(`select q.id from quotes q where q.status='Draft' and q.deleted_at is null and exists (select 1 from quote_items i where i.quote_id=q.id and i.kind='item') limit 1`)
    const before = Number(sql(`select count(*) from quote_items where quote_id='${q}'`))
    await page.goto(`${BASE}/quotes/${q}`); await ready(page)
    const add = page.locator('button[class*="plus"][aria-label^="Add item below"]').first()
    await add.scrollIntoViewIfNeeded(); await add.click({ force: true }); await page.waitForTimeout(1500)
    const after = Number(sql(`select count(*) from quote_items where quote_id='${q}'`))
    ok('a line was added', after === before + 1, `${before} → ${after}`)
    ok('it carries 8.5 % GST', Number(sql(`select gst_pct from quote_items where quote_id='${q}' order by created_at desc limit 1`)) === 8.5)
  })

  await step('one read-only look for a Designer', async () => {
    as('sarah')
    await page.goto(`${BASE}/settings?section=leads`); await page.getByTestId('settings-leads').waitFor(); await ready(page)
    ok('the line under the title', /Only Owners and Admins change these\./.test(await page.getByTestId('read-only-line').innerText()))
    ok('the stage movement choices are shown, disabled', await page.getByRole('radio', { name: /^Linear/ }).isDisabled())
    ok('nothing to add or remove', (await page.getByLabel('Add a source').count()) === 0 && (await page.getByRole('button', { name: /^(Remove|Retire) / }).count()) === 0)
    ok('the demo’s simulate button is not offered', (await page.getByRole('button', { name: /Simulate an enquiry/ }).count()) === 0)
    await shot('06-read-only-leads')
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('settings-quotes').waitFor(); await ready(page)
    ok('the GST switch is disabled', await page.getByTestId('gst').locator('input[type="checkbox"]').isDisabled())
    ok('no Save rate or Save numbering', (await page.getByRole('button', { name: 'Save rate' }).count()) === 0 && (await page.getByRole('button', { name: 'Save numbering' }).count()) === 0)
    ok('the number pattern shows, disabled', await page.getByLabel('Prefix').isDisabled())
    ok('the trades show, nothing to press on them', (await page.getByTestId('trade').count()) > 0 && (await page.getByTestId('trade').getByRole('button').count()) === 0)
    await shot('07-read-only-quotes')
  })

  await step('Back from a Company page returns to the module, and on to where Settings was opened', async () => {
    await page.goto(`${BASE}/settings?section=leads&from=%2Fleads`); await page.getByTestId('settings-leads').waitFor(); await ready(page)
    ok('Settings opened from Leads says so', (await page.getByRole('link', { name: 'Leads' }).count()) >= 1)
    await page.getByTestId('module-links').getByRole('button', { name: 'Integrations' }).click()
    await page.waitForURL(/\/company\/integrations/); await ready(page)
    const crumb = page.locator('header').getByRole('link', { name: 'Settings', exact: true })
    ok('Company names Settings as the way back', (await crumb.count()) === 1)
    await shot('08-company-from-settings')
    await crumb.click()
    await page.waitForURL(/\/settings\?section=leads/); await ready(page)
    ok('back on Lead management, still from Leads', /from=%2Fleads/.test(page.url()), page.url())
  })

  await step('phone and tablet', async () => {
    for (const [w, h, name] of [[390, 844, '09-phone-studio'], [768, 1024, '10-tablet-roles'], [320, 700, null]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
      const p = await c.newPage(); p.setDefaultTimeout(12000)
      for (const sec of ['studio', 'leads', 'quotes', 'notifications']) {
        await p.goto(`${BASE}/settings?section=${sec}`); await ready(p)
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        ok(`${w}: ${sec} fits the width`, over <= 0, `${over}px over`)
      }
      await p.goto(`${BASE}/settings?section=studio`); await ready(p)
      for (const t of ['Who may do what', 'Issuing entities']) {
        const clip = await p.getByRole('table', { name: t }).evaluate((e) => e.scrollWidth - e.clientWidth)
        ok(`${w}: ${t} shows every column`, clip <= 0, `${clip}px clipped`)
      }
      if (name) {
        if (w === 768) await p.getByTestId('studio-roles').scrollIntoViewIfNeeded()
        await shot(name, p)
      }
      await c.close()
    }
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
})()
