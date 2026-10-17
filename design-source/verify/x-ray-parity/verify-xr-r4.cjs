// Quote X-Ray parity round 4 (REG-641) — who may and what is kept: Who sees leads on every X-Ray read (the setup's leads, quotes and
// Recent, the record by URL), no phone numbers in the setup's payload; delete by its maker, an Owner or an Admin, logged on the lead;
// a deleted lead's comparisons leave Recent and come back with it, Delete forever takes them; the same file twice is one quote.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const fs = require('fs')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { sql(`update members set is_you = case id when 'dane' then 1 else 0 end`); sql(`delete from settings where key='lead_visibility'`) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
const assigned = () => sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
const FILES = `${S}/xr-files`; fs.mkdirSync(FILES, { recursive: true })
const referenceBytes = require(require('path').resolve(__dirname, '../../..', 'design-source/verify/x-ray-parity/fixtures/reference-file.cjs'))   // (S42 E-05) a reference quote is read by its words, never its name
const file = (name) => { const p = `${FILES}/${name}`; fs.writeFileSync(p, referenceBytes(name) ?? '%PDF-1.4 probe'); return p }
const VIV = sql(`select id from leads where name='Vivien Lee'`), OLIVIA = sql(`select id from leads where name='Olivia Martinez'`)
const OLI_PHONE = sql(`select phone from leads where id='${OLIVIA}'`).replace(/\D/g, '').slice(-8)
const OLI_X = sql(`select id from quote_comparisons where lead_id='${OLIVIA}' order by created_at limit 1`)
const VIV_X = sql(`select id from quote_comparisons where lead_id='${VIV}' order by created_at limit 1`)

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-xr4/${n}.png` })
  const setup = () => page.getByTestId('xray-setup')
  sql(`insert into quote_comparisons (id, lead_id, quote_id, your_label, other_studio, other_file, result_json, created_by, created_at, inputs_json, engine, your_file) select 'probe-x4-loose', null, null, 'Dyel Sales Contract', other_studio, other_file, result_json, 'dane', strftime('%s','now') - 60, inputs_json, engine, 'Dyel Sales Contract.pdf' from quote_comparisons where id='${VIV_X}'`)

  await step('a Designer who sees only her leads sees only their comparisons', async () => {
    assigned(); as('sarah')
    const html = await (await page.request.get(`${BASE}/quote-x-ray`)).text()
    ok('no lead’s phone number rides the setup page', !html.includes(OLI_PHONE))
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    await setup().getByRole('combobox', { name: 'Lead' }).click(); await page.waitForTimeout(300)
    const opts = await page.getByRole('option').allInnerTexts(); await page.keyboard.press('Escape')
    ok('the lead list holds her leads, not Olivia’s', opts.some((o) => /Vivien Lee/.test(o)) && !opts.some((o) => /Olivia Martinez/.test(o)), `${opts.length} leads`)
    const recent = await page.getByTestId('xray-recent').allInnerTexts()
    ok('Recent: no Olivia, her own and the studio’s lead-less reading', !recent.some((t) => /Olivia/.test(t)) && recent.some((t) => /Vivien Lee/.test(t)) && recent.some((t) => /Dyel Sales Contract/.test(t)))
    await page.goto(`${BASE}/quote-x-ray/${OLI_X}`); await ready(page)
    /* (pending modules, a deliberate change of this rule — S41b-2) the not-found is the house's app-wide page now ("This page isn’t here") */
    ok('Olivia’s record by its address: not found', /not found|could not be found|404|This page isn’t here/i.test(await page.locator('body').innerText()))
    await shot('01-designer-recent')
  })

  await step('delete: its maker, an Owner or an Admin — and the lead keeps the trail', async () => {
    assigned(); as('sarah')
    await page.goto(`${BASE}/quote-x-ray?lead=${VIV}`); await ready(page)
    const danes = page.getByTestId('xray-recent').filter({ hasText: 'Vivien Lee' }).first()
    ok('Dane’s reading: Delete out of her reach', await danes.getByRole('button', { name: /^Delete / }).isDisabled())
    await page.goto(`${BASE}/quote-x-ray/${VIV_X}`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(300)
    ok('and in the record’s kebab', (await page.getByRole('menuitem', { name: 'Delete' }).getAttribute('aria-disabled')) === 'true')
    await page.keyboard.press('Escape')
    // her own reading
    await page.goto(`${BASE}/quote-x-ray?lead=${VIV}`); await ready(page)
    await setup().locator('input[type=file]').last().setInputFiles(file('Cove Interior Quotation.pdf')); await page.waitForTimeout(1100)
    await setup().getByRole('button', { name: 'Compare' }).click()
    await page.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 20000 }); await ready(page)
    const mine = page.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    ok('her run is stamped with her', sql(`select created_by from quote_comparisons where id='${mine}'`) === 'sarah')
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog', { name: 'Delete this comparison?' }).getByRole('button', { name: 'Delete' }).click()
    await page.waitForURL((u) => u.pathname === '/quote-x-ray', { timeout: 10000 }); await ready(page)
    ok('she deletes her own', sql(`select count(*) from quote_comparisons where id='${mine}'`) === '0')
    ok('the lead’s event log keeps it', sql(`select count(*) from lead_events where lead_id='${VIV}' and kind='comparison_deleted' and actor_id='sarah'`) === '1')
    as('dane'); sql(`delete from settings where key='lead_visibility'`)
    await page.goto(`${BASE}/leads/${VIV}/activity`); await ready(page)
    ok('Activity says who deleted which reading', /Sarah deleted the Quote X-Ray comparison “OM-10008 · Whole-home renovation · vs Cove Interior”/.test(await page.locator('main').innerText()))
    await shot('02-activity-deleted')
    await page.goto(`${BASE}/quote-x-ray?lead=${VIV}`); await ready(page)
    ok('an Owner may delete anyone’s', !(await page.getByTestId('xray-recent').first().getByRole('button', { name: /^Delete / }).isDisabled()))
  })

  await step('a deleted lead’s readings leave Recent and come back with it; Delete forever takes them', async () => {
    const n = Number(sql(`select count(*) from quote_comparisons where lead_id='${OLIVIA}'`))
    sql(`update leads set deleted_at = strftime('%s','now'), delete_reason = 'Spam', stage_before_delete = stage where id='${OLIVIA}'`)
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    ok('gone from Recent', !(await page.getByTestId('xray-recent').allInnerTexts()).some((t) => /Olivia/.test(t)))
    await page.goto(`${BASE}/quote-x-ray/${OLI_X}`); await ready(page)
    ok('its record answers as the lead does (not found)', /not found|could not be found|404|This page isn’t here|isn’t one you can open/i.test(await page.locator('body').innerText()))   // (pending modules S41b-2, a deliberate change of this rule) the house's not-found words
    sql(`update leads set deleted_at = null, delete_reason = null, stage = coalesce(stage_before_delete, stage), stage_before_delete = null where id='${OLIVIA}'`)
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    ok('back with the lead', (await page.getByTestId('xray-recent').allInnerTexts()).filter((t) => /Olivia/.test(t)).length === n)
    sql(`update leads set deleted_at = strftime('%s','now'), delete_reason = 'Spam', stage_before_delete = stage where id='${OLIVIA}'`)
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.getByRole('button', { name: 'More options' }).first().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Deleted Leads' }).click(); await page.waitForTimeout(800)
    await page.getByRole('row').filter({ hasText: 'Olivia Martinez' }).getByRole('button', { name: 'Delete Forever' }).click()
    await page.getByRole('dialog', { name: 'Delete this lead forever?' }).getByRole('button', { name: 'Delete Forever' }).click()
    await page.waitForTimeout(2000)
    ok('Delete forever takes its readings', sql(`select count(*) from leads where id='${OLIVIA}'`) === '0' && sql(`select count(*) from quote_comparisons where lead_id='${OLIVIA}'`) === '0')
  })

  await step('the same reference on both sides is one quote', async () => {
    await page.goto(`${BASE}/quote-x-ray`); await ready(page)
    await setup().getByRole('radio', { name: 'Upload two quotes' }).click().catch(async () => { await setup().getByText('Upload two quotes').click() })
    await setup().locator('input[type=file]').first().setInputFiles(file('Flo Design Sample Quotation.pdf')); await page.waitForTimeout(1100)
    await setup().locator('input[type=file]').first().setInputFiles(file('flo-design-quotation.pdf')); await page.waitForTimeout(1100)
    const before = sql(`select count(*) from quote_comparisons`)
    await setup().getByRole('button', { name: 'Compare' }).click(); await page.waitForTimeout(4200)
    ok('refused, said under their dropzone', /That is the same quote as yours — add the other studio’s quote\./.test(await setup().innerText()) && sql(`select count(*) from quote_comparisons`) === before)
    await shot('03-same-quote')
  })

  sql(`delete from quote_comparisons where id='probe-x4-loose'`)
  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
