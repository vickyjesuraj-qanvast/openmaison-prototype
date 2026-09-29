// UI sweep round S2 (REG-660) — Contracts: the row and Status menus through the portal; the status menu keeps Send's checks and Signed
// asks through Mark as signed; Copy Link shares before it copies; Archived Contracts (U-07); Deleted Contracts' selection (U-08); the
// Lead column on a touch tablet and on a phone's card; the formatting bar's menus show; Tab leaves the page; the signing page's bar at
// the paper's foot and its caption; the bundle dialog leaves out what can't go; the template editor's rename/delete rule and its Outline
// drawer; Automation from the folded kebab; a deleted link's notice; the ghosts; an uploaded PDF's eSignatures; the FAB toggles.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } finally { as('dane') } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const OLIVIA = sql(`select id from leads where name='Olivia Martinez'`)
const DRAFT = sql(`select id from contracts where lead_id='${OLIVIA}' and status='Draft' limit 1`)
const SIGNED = sql(`select id from contracts where status='Signed' limit 1`)
const TPL = sql(`select id from contract_templates where deleted_at is null limit 1`)
// an empty Draft and an uploaded PDF on Olivia's lead, for the checks
const EMPTY = 'sw2-empty-draft', PDF = 'sw2-uploaded'
sql(`insert or replace into contracts (id, lead_id, title, status, created_at, updated_at, body, source, reminders, thank_you, requires_scroll, requires_accept, created_by) values ('${EMPTY}', '${OLIVIA}', 'Empty draft', 'Draft', strftime('%s','now'), strftime('%s','now'), '', 'composed', 0, 0, 0, 0, 'dane')`)
sql(`insert or replace into contracts (id, lead_id, title, status, created_at, updated_at, body, source, file_name, reminders, thank_you, requires_scroll, requires_accept, created_by) values ('${PDF}', '${OLIVIA}', 'Signed PDF', 'Draft', strftime('%s','now'), strftime('%s','now'), null, 'uploaded', 'agreement.pdf', 0, 0, 0, 0, 'dane')`)

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-sw2/${n}.png` })
  const desk = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000); return { ctx, page } }
  const row = (page, title) => page.getByRole('row').filter({ hasText: title }).first()

  await step('the tab: menus, status, copy, archive', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/leads/${OLIVIA}/contracts`); await ready(page)
    const r = row(page, 'Empty draft'); await r.hover()
    await r.getByRole('button', { name: /^More actions for/ }).click({ force: true }); await page.waitForTimeout(300)
    ok('the row menu opens through the portal', await page.getByRole('menu').first().evaluate((m) => !m.closest('[role="table"]')))
    await page.getByRole('menuitem', { name: 'Copy Link' }).click(); await page.waitForTimeout(700)
    ok('Copy Link on an empty draft says why and shares nothing', /Add some content before it goes out/.test(await snack(page)) && sql(`select status from contracts where id='${EMPTY}'`) === 'Draft')
    await r.getByRole('button', { name: /^Status .* — change status$/ }).click(); await page.waitForTimeout(300)
    ok('the Status menu opens through the portal', await page.getByRole('menu').first().evaluate((m) => !m.closest('[role="table"]')))
    await page.getByRole('menuitem', { name: /^Sent to Client/ }).click(); await page.waitForTimeout(700)
    ok('the status menu keeps Send’s checks', /Add some content before it goes out/.test(await snack(page)) && sql(`select status from contracts where id='${EMPTY}'`) === 'Draft')
    await r.getByRole('button', { name: /^Status .* — change status$/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /^Signed/ }).click(); await page.waitForTimeout(500)
    ok('Signed asks through Mark as signed', await page.getByRole('dialog', { name: 'Mark as signed' }).isVisible())
    await shot(page, '01-mark-signed')
    await page.getByRole('dialog', { name: 'Mark as signed' }).getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
    ok('and nothing moved', sql(`select status from contracts where id='${EMPTY}'`) === 'Draft')
    // U-07
    await r.hover(); await r.getByRole('button', { name: /^More actions for/ }).click({ force: true }); await page.getByRole('menuitem', { name: 'Archive' }).click(); await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Archived Contracts' }).click(); await page.waitForTimeout(900)
    const sheet = page.getByTestId('archived-contracts')
    ok('Archived Contracts lists it', await sheet.getByTestId('archived-contract').filter({ hasText: 'Empty draft' }).count() === 1)
    await shot(page, '02-archived-contracts')
    await sheet.getByTestId('archived-contract').filter({ hasText: 'Empty draft' }).getByRole('button', { name: 'Unarchive' }).click(); await page.waitForTimeout(1500)
    ok('Unarchive puts it back', sql(`select archived_at is null from contracts where id='${EMPTY}'`) === '1')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    // U-08
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Deleted Contracts' }).click(); await page.waitForTimeout(700)
    ok('Deleted Contracts has its selection column', await page.getByTestId('deleted-contracts').getByRole('checkbox', { name: 'Select all deleted contracts' }).count() === 1)
    await page.keyboard.press('Escape')
    // #7 the bundle dialog
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /Send together for signature/ }).click(); await page.waitForTimeout(500)
    const bd = page.getByRole('dialog', { name: 'Send together for signature' })
    const emptyRow = bd.locator('label').filter({ hasText: 'Empty draft' })
    ok('the bundle leaves out what can’t go, saying why', await emptyRow.getByRole('checkbox').isDisabled() && /Add some content before it goes out/.test(await emptyRow.innerText()) && /2 of 2 documents/i.test(await bd.innerText()))
    await shot(page, '07-bundle')
    await bd.getByRole('button', { name: 'Close' }).click().catch(() => page.keyboard.press('Escape'))
    await ctx.close()
  })

  await step('the editor: bar menus, Tab, AI, uploaded, recipient', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/contracts/${DRAFT}`); await ready(page)
    await page.getByRole('button', { name: /^(Paragraph|Heading|Title|Normal)/ }).first().click(); await page.waitForTimeout(300)
    const menuH = await page.getByRole('menu').first().evaluate((m) => m.getBoundingClientRect().height).catch(() => 0)
    ok('Text style’s menu shows', menuH > 80, `${Math.round(menuH)}px`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.getByTestId('contract-doc').click({ position: { x: 40, y: 60 } }); await page.keyboard.press('Tab'); await page.waitForTimeout(200)
    ok('Tab leaves the page (outside a list)', await page.evaluate(() => document.activeElement?.getAttribute('data-testid') !== 'contract-doc'))
    await page.getByRole('button', { name: 'Maison AI' }).click(); await page.waitForTimeout(400)
    const opened = await page.locator('[role="dialog"], [class*="sheet"]').filter({ hasText: /Maison AI|Reset prototype/ }).count()
    await page.getByRole('button', { name: 'Maison AI' }).click(); await page.waitForTimeout(500)
    const closed = await page.locator('[role="dialog"], [class*="sheet"]').filter({ hasText: /Reset prototype/ }).count()
    ok('the FAB opens and closes its sheet', opened > 0 && closed === 0, `${opened} → ${closed}`)
    await page.goto(`${BASE}/contracts/${PDF}`); await ready(page)
    await page.getByRole('button', { name: 'Before the client signs' }).click(); await page.waitForTimeout(500)
    ok('an uploaded PDF reaches its eSignatures', /Before the client signs|Read and accept|read to the end/i.test(await page.locator('body').innerText()) && await page.getByRole('switch').count() + await page.getByRole('checkbox').count() > 0)
    await shot(page, '03-uploaded-esign')
    await ctx.close()
  })

  await step('tablet: tools table, automation, template outline', async () => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/contracts`); await ready(page)
    const lead = await page.getByRole('row').nth(1).locator('[data-col="lead"]').innerText().catch(() => '')
    ok('768 touch: Tools shows each row’s lead', lead.trim().length > 2, lead.trim())
    await shot(page, '04-tools-768')
    await page.goto(`${BASE}/contracts/${DRAFT}`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Automation' }).click(); await page.waitForTimeout(500)
    ok('768: Automation from the kebab opens', await page.getByTestId('automation-dialog').isVisible())
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.goto(`${BASE}/templates/contracts/${TPL}`); await ready(page)
    await page.getByRole('button', { name: 'Outline' }).click(); await page.waitForTimeout(500)
    ok('768: the template editor’s Outline opens as a drawer', await page.getByRole('dialog', { name: 'Outline' }).isVisible().catch(() => false) || await page.getByLabel('Outline').filter({ has: page.locator('li, button') }).count() > 1)
    await shot(page, '05-template-outline-768')
    await ctx.close()
  })

  await step('phone: tools card, signing page', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/contracts`); await ready(page)
    const txt = await page.getByRole('row').first().innerText().catch(() => '')
    ok('390: a Tools card names its lead', /Aisha|Benjamin|Olivia|Ryan/.test(txt), txt.replace(/\n/g, ' · ').slice(0, 80))
    sql(`update contracts set status='Sent to Client', sent_at=strftime('%s','now'), requires_scroll=1 where id='${DRAFT}'`)
    await page.goto(`${BASE}/sign/${DRAFT}`); await ready(page)
    ok('390: the bar at the foot says what is next', /Read to the end of the agreement/.test(await page.getByTestId('sign-next').innerText()))
    await page.getByTestId('paper-end').scrollIntoViewIfNeeded(); await page.waitForTimeout(600)
    ok('read to the end, the bar carries Send code', await page.getByTestId('sign-next').getByRole('button', { name: 'Send code' }).isVisible())
    await shot(page, '06-sign-390')
    sql(`update contracts set status='Draft', sent_at=null, requires_scroll=0, viewed_at=null where id='${DRAFT}'`)
    await page.goto(`${BASE}/sign/0f0e0d0c-0000-4000-8000-000000000000`); await ready(page)
    ok('a link to a contract deleted for good says so', /This link is no longer active/.test(await page.locator('body').innerText()))
    await page.goto(`${BASE}/sign/${SIGNED}`); await ready(page)
    const ws = await page.locator('[class*="caption"]').last().evaluate((e) => getComputedStyle(e).whiteSpace).catch(() => 'none')
    ok('the signature caption wraps', ws === 'normal', ws)
    await ctx.close()
  })

  await step('designer on a template; the ghosts', async () => {
    as('sarah')
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/templates/contracts/${TPL}`); await ready(page)
    ok('a Designer cannot rename someone else’s template', await page.getByRole('textbox', { name: 'Template name' }).evaluate((e) => e.readOnly))
    await page.getByRole('button', { name: 'More options', exact: true }).first().click(); await page.waitForTimeout(300)
    ok('and Delete waits with its reason', await page.getByRole('menuitem', { name: /^Delete/ }).getAttribute('aria-disabled') === 'true' && /author, (an )?Owner or (an )?Admin/.test(await page.getByRole('menuitem', { name: /^Delete/ }).innerText()))
    await page.keyboard.press('Escape')
    as('dane')
    await page.goto(`${BASE}/contracts/${DRAFT}`, { waitUntil: 'commit' })
    ok('the editor streams the contract’s ghost', await page.locator('[aria-label="Loading contract"]').first().waitFor({ state: 'attached', timeout: 5000 }).then(() => true, () => false))
    await ready(page)
    await page.getByTestId('contract-recipient').click(); await page.waitForTimeout(400)
    const rd = page.getByRole('dialog', { name: 'Edit recipient' })
    if (await rd.count()) {
      await rd.getByLabel('Full name').fill(''); await rd.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(200)
      ok('Edit recipient says what is missing', await rd.getByText('This field is required').isVisible())
    } else ok('Edit recipient says what is missing', false, 'no recipient button')
    await ctx.close()
  })

  sql(`delete from contracts where id in ('${EMPTY}', '${PDF}')`)
  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} passed`)
})()
