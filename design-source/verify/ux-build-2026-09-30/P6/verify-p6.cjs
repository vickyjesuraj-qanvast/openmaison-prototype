// UX audit build 2026-09-30 — package P6, Studio setup (Company and Settings): S2 unsaved edits ask before a move inside the app · S3 help
// lines link where they name · S4 Settings › Quotes & pricing "New quotes start with" + the lock card renamed · S5 the pace tile buys ·
// S6 adding a member (Reports to, the plain helper, the new row pulses, the snackbar's next step) · S7 a price-list import's Undo, the
// "just imported" chip, the default Kind at the mapping step · S8 My Items opens as the list · S9 the untouched-lead delay under Lead
// management · S10 chip names wrap at every width · S11 "Signature: not set" on Members · S12 Materials' plain New, Sync now clear of the
// snackbar · V11 the bell's proposal opens the item.
// Run against a production build on a scratch DB (the DB on the `next start` line):
//   TESTDB=<scratch.db> BASE=http://localhost:3026 NODE_PATH=$PWD/node_modules node design-source/verify/ux-build-2026-09-30/P6/verify-p6.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const OUT = __dirname
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3026'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected|locator/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snackbar = (page) => page.locator('[role="status"] > div')
async function snack(page, text) { await snackbar(page).filter({ hasText: text }).first().waitFor({ timeout: 8000 }); return snackbar(page).filter({ hasText: text }).first() }
const inView = async (loc, h = 1024) => { const b = await loc.boundingBox(); return !!b && b.y >= 0 && b.y + b.height <= h }
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
async function pick(page, combo, option) { await combo.click(); await page.getByRole('option', { name: option, exact: true }).first().click(); await page.waitForTimeout(250) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n, p = page) => p.screenshot({ path: `${OUT}/${n}.png` })
  const leave = (p = page) => p.getByRole('dialog', { name: 'Save your changes?' })

  /* ── S2 · unsaved edits ask before a move inside the app ── */
  await step('S2 Profile', async () => {
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('profile').waitFor(); await ready(page)
    /* (the calm UI build 2026-10-27, a deliberate change) Profile's tabs (5-36): the Brand kit's door is on Details, so the unsaved company detail is one of Details' own (the Tagline) */
    const bank = page.getByLabel('Tagline')
    await bank.fill('OCBC Probe Bank')
    await page.getByTestId('brand-kit-link').click()
    await leave().waitFor(); await page.waitForTimeout(400)
    ok('S2 the Brand kit card asks before leaving unsaved company details', page.url().endsWith('/company/profile') && /You changed the company details/.test(await leave().innerText()))
    ok('S2 the question offers Save · Discard · Keep editing', await leave().getByRole('button', { name: 'Save', exact: true }).count() === 1 && await leave().getByRole('button', { name: 'Discard' }).count() === 1 && await leave().getByRole('button', { name: 'Keep editing' }).count() === 1)
    await shot('s2-01-profile-leave-asks')
    await leave().getByRole('button', { name: 'Keep editing' }).click(); await leave().waitFor({ state: 'hidden' })
    ok('S2 Keep editing stays, the edit kept', page.url().endsWith('/company/profile') && (await bank.inputValue()) === 'OCBC Probe Bank')
    await page.getByRole('button', { name: /^Notifications/ }).first().click(); await page.getByTestId('notifications-panel').waitFor()
    await page.getByTestId('notification-row').filter({ hasText: 'Skirting' }).first().getByRole('button').click()
    await leave().waitFor()
    ok('S2 a bell notice asks too (a navigation in script)', page.url().endsWith('/company/profile'))
    await leave().getByRole('button', { name: 'Keep editing' }).click(); await leave().waitFor({ state: 'hidden' })
    /* (pending modules S46C · H2, a deliberate change of this rule) the rail's Leads counts the new leads nobody has opened — "Leads (2 new)",
       landing on the listing's Unseen scope while it does — so the item is found by its key, and the listing by its path */
    await page.locator('nav[aria-label="Workspace"] a[data-kb="go.leads"]').first().click()   // the rail
    await leave().waitFor()
    ok('S2 the rail asks too', page.url().endsWith('/company/profile'))
    await leave().getByRole('button', { name: 'Discard' }).click()
    await page.waitForURL(/\/leads(\?|$)/)
    ok('S2 Discard goes on without saving', !sql(`select value from settings where key='brand'`).includes('OCBC Probe Bank'))
    await page.goto(`${BASE}/company/profile`); await page.getByTestId('profile').waitFor(); await ready(page)
    await page.getByLabel('Tagline').fill('UOB Probe Bank')   // (the calm UI build 2026-10-27, a deliberate change) 5-36
    await page.getByTestId('brand-kit-link').click(); await leave().waitFor()
    await leave().getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(/\/company\/templates\/brand/); await snack(page, 'Company details saved')
    ok('S2 Save saves, then goes where it was pressed', sql(`select value from settings where key='brand'`).includes('UOB Probe Bank'))
  })
  await step('S2 Brand kit', async () => {
    await page.goto(`${BASE}/company/templates/brand`); await page.getByTestId('brand-kit').waitFor(); await ready(page)
    await page.getByLabel('Accent', { exact: true }).fill('#123456'); await page.waitForTimeout(200)
    await page.getByRole('tab', { name: 'Quotes' }).click(); await leave().waitFor()
    ok('S2 a tab asks before leaving the brand kit', /You changed the brand kit/.test(await leave().innerText()))
    await leave().getByRole('button', { name: 'Discard' }).click(); await page.waitForURL(/\/company\/templates\/quotes/)
    ok('S2 Discard: the kit is as it was', !sql(`select value from settings where key='brand'`).includes('#123456'))
  })
  await step('S2 Settings', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('settings-quotes').waitFor(); await ready(page)
    await page.getByTestId('numbering').getByLabel('Prefix').fill('PX')
    await page.getByRole('tab', { name: 'Lead management' }).click(); await leave().waitFor()
    ok('S2 a module tab asks before leaving unsaved quote numbers', /You changed the quote numbers/.test(await leave().innerText()))
    await leave().getByRole('button', { name: 'Keep editing' }).click(); await leave().waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: /^Company/ }).first().click()
    await page.getByRole('menuitem', { name: /Members/ }).first().click().catch(async () => { await page.getByText('Members', { exact: true }).last().click() })
    await leave().waitFor()
    ok('S2 the Company panel (a navigation in script) asks too', page.url().includes('/settings'))
    await shot('s2-02-settings-leave-from-company-panel')
    await leave().getByRole('button', { name: 'Discard' }).click(); await page.waitForURL(/\/company\/members/)
    ok('S2 …and goes on after Discard', page.url().includes('/company/members'))
  })

  /* ── S3 · help lines link where they name ── */
  await step('S3 links', async () => {
    await page.goto(`${BASE}/company/members`); await page.getByTestId('members').waitFor(); await ready(page)
    const link = page.getByTestId('members-visibility-link')
    const href = await link.getAttribute('href')
    // (pending modules S14, a deliberate change of this rule) Who sees leads' one home is Settings › Roles & access (?section=studio)
    ok('S3 Members links to Who sees leads, with the way back', !!href && href.startsWith('/settings?section=studio&from=%2Fcompany%2Fmembers') && href.endsWith('#lead-visibility'), href)
    await link.click(); await page.waitForURL(/section=studio/); await page.getByTestId('lead-visibility').waitFor(); await ready(page)
    ok('S3 …landing on the card', await inView(page.getByTestId('lead-visibility').locator('span').first()))
    ok('S3 …with Back to Members', ((await page.locator('a[aria-label^="Back to"]').first().getAttribute('href')) ?? '').startsWith('/company/members'))
    await shot('s3-01-who-sees-leads-from-members')
    await page.goto(`${BASE}/settings?section=studio`); await page.getByTestId('settings-studio').waitFor(); await ready(page)
    const n = await page.getByTestId('settings-studio').locator('a[href*="/company/"]').count()
    ok('S3 Settings › Studio: the three "set under Company ›" lines are links', n >= 3, `${n} links`)
    await page.goto(`${BASE}/company/integrations`); await ready(page)
    ok('S3 Integrations: Qanvast Ops › Leads is a link', (await page.getByRole('link', { name: 'Qanvast Ops › Leads' }).getAttribute('href') ?? '').startsWith('/qanvast-ops'))
  })

  /* ── S4 · New quotes start with ── */
  await step('S4 card', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('new-quote-defaults').waitFor(); await ready(page)
    const card = page.getByTestId('new-quote-defaults'); const t = await card.innerText()
    const d = JSON.parse(sql(`select defaults_json from quote_templates where is_default=1 and status='published' and deleted_at is null`))
    ok('S4 the card says what a new quote starts with, from the default template', /New quotes start with/.test(t) && t.includes(`${d.validityDays} days`) && /Deposit 10%/.test(t) && d.starterGroups.every((g) => t.includes(g)), t.replace(/\s+/g, ' ').slice(0, 160))
    ok('S4 the lock card reads "Who may change the payment schedule"', /Who may change the payment schedule/.test(await page.getByTestId('payment-lock').innerText()))
    await card.scrollIntoViewIfNeeded(); await shot('s4-01-new-quotes-start-with')
    await page.getByTestId('new-quote-defaults-change').click(); await page.waitForURL(/\/templates\/.+\?tab=new-quotes&from=/)
    await page.getByRole('tab', { name: 'Quote settings' }).waitFor(); await page.waitForTimeout(1200)   // (the calm UI build 2026-10-27, a deliberate change) W-274: the tab reads Quote settings
    ok('S4 "Change in … › New quotes" opens the template on its New quotes tab', (await page.getByRole('tab', { name: 'Quote settings' }).getAttribute('aria-selected')) === 'true')   // (the calm UI build 2026-10-27, a deliberate change) W-274: the tab reads Quote settings
    await shot('s4-02-template-new-quotes-tab')
  })

  /* ── S9 · the untouched-lead delay under Lead management ── */
  await step('S9', async () => {
    await page.goto(`${BASE}/settings?section=leads`); await page.getByTestId('untouched-leads').waitFor(); await ready(page)
    const y = async (id) => (await page.getByTestId(id).boundingBox()).y
    ok('S9 Untouched leads sits under Stage movement, before Lead sources', (await y('untouched-leads')) < (await y('lead-sources')))
    await pick(page, page.getByTestId('untouched-leads').getByRole('combobox'), '1 hour')
    await snack(page, 'New leads nobody has contacted are flagged after 1 hour')   // (the calm UI build 2026-10-27, a deliberate change) W-097 · W-335
    ok('S9 the delay writes the notification rule', sql(`select value from settings where key='notification_rules'`).includes('"untouchedMinutes":60'))
    await shot('s9-01-untouched-under-lead-management')
    await page.goto(`${BASE}/settings?section=notifications`); await page.getByTestId('untouched-pointer').waitFor(); await ready(page)
    const line = await page.getByTestId('untouched-pointer').innerText()
    ok('S9 Notifications says where it lives now, with the delay', /1 hour/.test(line) && (await page.getByTestId('untouched-link').getAttribute('href')).includes('section=leads'))
    ok('S9 …and no longer holds the select', await page.getByTestId('notification-followups').getByRole('combobox').count() === 0)
    await page.getByTestId('untouched-pointer').scrollIntoViewIfNeeded(); await shot('s9-02-notifications-points-there')
  })

  /* ── S5 · the pace tile buys, for the Owner, when low ── */
  await step('S5', async () => {
    await page.goto(`${BASE}/company/plan`); await page.getByTestId('tile-pace').waitFor(); await ready(page)
    ok('S5 a healthy month: no buy in the pace tile', await page.getByTestId('pace-buy').count() === 0)
    await page.getByRole('button', { name: /View as$/ }).first().click()
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; the studio's plan
       (demo only) sits under its Demo fold — opened before the plan's row is pressed (the fold is remembered per browser once open) */
    { const fold = page.getByTestId('demo-fold'); await fold.waitFor({ timeout: 8000 }).catch(() => {}); if (await fold.count() && (await fold.getAttribute('aria-expanded')) !== 'true') { await fold.click(); await page.waitForTimeout(300) } }
    await page.getByRole('menuitemradio', { name: /Almost out/ }).click(); await snack(page, 'almost out')
    await page.goto(`${BASE}/company/plan`); await page.getByTestId('tile-pace').waitFor(); await ready(page)
    const buy = page.getByTestId('pace-buy')
    ok('S5 low: "Buy 1,000 AI credits · S$20" and "See plans" in the pace tile', await buy.getByRole('button', { name: 'Buy 1,000 AI credits · S$20' }).count() === 1 && await buy.getByRole('button', { name: 'See plans' }).count() === 1)
    await shot('s5-01-pace-tile-buys')
    await buy.getByRole('button', { name: 'See plans' }).click(); await page.waitForTimeout(700)
    ok('S5 See plans opens Plans', await page.getByRole('dialog').count() >= 1)
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    await buy.getByRole('button', { name: 'Buy 1,000 AI credits · S$20' }).click(); await page.waitForTimeout(700)
    ok('S5 Buy opens the top-up', await page.getByRole('dialog').count() >= 1)
    await shot('s5-02-top-up-from-pace-tile')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  })

  /* ── S6 · adding a member ── */
  await step('S6', async () => {
    await page.goto(`${BASE}/company/members`); await page.getByTestId('members').waitFor(); await ready(page)
    await page.getByRole('button', { name: 'Add member' }).click()
    const dlg = page.getByRole('dialog', { name: 'Add member' })
    /* (REG-846, Dane UAT 2.07) the helper is Email's whole line now, a sentence: "Printed as their email on the quotes they prepare" */
    ok('S6 the email helper in plain words', /Printed as their email on the quotes they prepare/.test(await dlg.innerText()) && !/prepared_by_email/.test(await dlg.innerText()))
    ok('S6 a Designer is added with Reports to', await dlg.getByRole('combobox', { name: 'Reports to' }).count() === 1)
    await pick(page, dlg.getByRole('combobox', { name: 'Role' }), 'Manager')
    ok('S6 …a Manager without it', await dlg.getByRole('combobox', { name: 'Reports to' }).count() === 0)
    await pick(page, dlg.getByRole('combobox', { name: 'Role' }), 'Designer')
    await dlg.getByLabel('Name').fill('Priya Nair'); await dlg.getByLabel('Email').fill('priya@demostudio.sg')
    await shot('s6-01-add-member-dialog')
    await dlg.getByRole('button', { name: 'Add member' }).click()
    const s = await snack(page, 'Priya Nair added')
    ok('S6 the snackbar offers "Set who they report to"', await s.getByRole('button', { name: 'Set who they report to' }).count() === 1)
    const id = sql(`select id from members where name='Priya Nair'`)
    const row = page.locator(`[data-member-id="${id}"]`)
    await row.waitFor(); await page.waitForTimeout(500)
    ok('S6 the new row is brought into view and pulses', (await inView(row)) && (await row.getAttribute('data-fresh')) !== null)
    await shot('s6-02-new-row-pulse')
    await s.getByRole('button', { name: 'Set who they report to' }).click(); await page.waitForTimeout(900)   // (the calm UI build 2026-10-27, a deliberate change) Reports to is in the member's drawer (5-01): the step opens it, then the list
    await page.getByRole('option', { name: 'James', exact: true }).first().click()
    await snack(page, 'Priya Nair now reports to James')
    ok('S6 …and Reports to is one press away', sql(`select manager_id from members where id='${id}'`) === 'james')
    /* (the calm UI build 2026-10-27, a deliberate change) the member's drawer closes before the header's Add member — Esc, else its Close (a loaded
       run once kept it open after one Esc; on the lane's server one Esc closes it every time) */
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    if (await page.getByTestId('member-drawer').isVisible().catch(() => false)) await page.locator('[role="dialog"]').filter({ has: page.getByTestId('member-drawer') }).getByRole('button', { name: 'Close' }).first().click()
    await page.getByTestId('member-drawer').waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Add member' }).click()
    const dlg2 = page.getByRole('dialog', { name: 'Add member' })
    await dlg2.getByLabel('Name').fill('Ravi Kumar'); await pick(page, dlg2.getByRole('combobox', { name: 'Reports to' }), 'James')
    await dlg2.getByRole('button', { name: 'Add member' }).click()
    await snack(page, 'Ravi Kumar added as a Designer, reporting to James')
    ok('S6 Reports to picked in the dialog is saved', sql(`select manager_id from members where name='Ravi Kumar'`) === 'james')
  })

  /* ── S11 · Signature: not set ── */
  await step('S11', async () => {
    sql(`update members set signature_kind = null, signature_name = null where id = 'dane'`)
    await page.goto(`${BASE}/company/members`); await page.getByTestId('members').waitFor(); await ready(page)
    const rowOf = (name) => page.getByTestId('member-row').filter({ has: page.locator('span[class*="__name"]').filter({ hasText: new RegExp(`^${name}`) }) })
    /* (the calm UI build 2026-10-27, a deliberate change) a member's signature state is in their drawer (5-01); your own row offers Add your signature (W-374) */
    await rowOf('James').getByTestId('member-open').click(); await page.getByTestId('member-drawer').waitFor()
    ok('S11 a member without a signature says so', /Signature not set/.test(await page.getByTestId('member-drawer-signature').innerText()))
    await page.keyboard.press('Escape'); await page.getByTestId('member-drawer').waitFor({ state: 'hidden' })
    const mine = rowOf('Dane').getByTestId('member-signature')
    ok('S11 your own row offers the way to set it', await mine.getByRole('button', { name: 'Add your signature' }).count() === 1)
    await mine.scrollIntoViewIfNeeded(); await shot('s11-01-signature-not-set')
    await mine.getByRole('button', { name: 'Add your signature' }).click()
    const sig = page.getByRole('dialog', { name: 'Signature Settings' }); await sig.waitFor()
    await sig.getByRole('button', { name: 'Save' }).click(); await snack(page, 'Signature saved')
    ok('S11 set here, as in a quote', sql(`select signature_kind from members where id='dane'`) === 'type')
    await page.waitForTimeout(1200)
    ok('S11 …and the line goes', await rowOf('Dane').getByTestId('member-signature').count() === 0)
  })

  /* ── S7 · a price-list import can be undone and found; the default Kind ── */
  await step('S7', async () => {
    const paint = sql(`select id || '|' || cost_minor from price_book_items where name='Painting, whole unit' and deleted_at is null`).split('|')
    await page.goto(`${BASE}/company/price-book`); await ready(page)
    await page.getByTestId('new-template').click(); await page.getByRole('menuitem', { name: 'Import from a spreadsheet…' }).click(); await page.getByTestId('import-dialog').waitFor()
    await page.getByTestId('import-dialog').getByLabel('Or paste the rows here').fill('Item\tUnit\tCost\nProbe tile A\tsqft\t3.50\nProbe tile B\tsqft\t4.20\nPainting, whole unit\tLot\t1999')
    await page.getByRole('dialog', { name: 'Import from a spreadsheet' }).getByRole('button', { name: 'Next' }).click()
    const map = page.getByRole('dialog', { name: 'Import into My Items' }); await map.waitFor(); await page.waitForTimeout(400)
    ok('S7 the mapping step asks the Kind for rows without one', await page.getByTestId('import-kind').getByRole('combobox').count() === 1)
    await pick(page, page.getByTestId('import-kind').getByRole('combobox'), 'Labour')
    await shot('s7-01-mapping-default-kind')
    await map.getByRole('button', { name: 'Import 3 rows' }).click()
    const s = await snack(page, '2 items added · 1 updated')
    ok('S7 the new rows take the Kind picked', sql(`select group_concat(kind) from price_book_items where name like 'Probe tile%' and deleted_at is null`) === 'labour,labour')
    ok('S7 the snackbar carries Undo', await s.getByRole('button', { name: 'Undo' }).count() === 1)
    await page.waitForTimeout(1200)
    const chip = page.getByRole('button', { name: /3 just imported/ })
    ok('S7 "Show them": the list narrows to what came in, under a "just imported" chip', await chip.count() === 1 && await page.getByTestId('library-row').count() === 3, `${await page.getByTestId('library-row').count()} rows`)
    await shot('s7-02-just-imported')
    await s.getByRole('button', { name: 'Undo' }).click()
    await snack(page, 'Import undone — 2 items removed, 1 put back as it was')
    ok('S7 Undo: the added rows go', sql(`select count(*) from price_book_items where name like 'Probe tile%'`) === '0')
    ok('S7 Undo: the updated row takes back its price', sql(`select cost_minor from price_book_items where id='${paint[0]}'`) === paint[1], sql(`select cost_minor from price_book_items where id='${paint[0]}'`))
    await page.waitForTimeout(800); await shot('s7-03-import-undone')
  })

  /* ── S8 · My Items opens as the list; a member's own pick sticks ── */
  await step('S8', async () => {
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const p2 = await c2.newPage()
    await p2.goto(`${BASE}/company/price-book`); await ready(p2)
    ok('S8 a member who never picked sees the list', await p2.getByTestId('library-table').count() === 1)
    await shot('s8-01-my-items-list', p2)
    await p2.getByRole('radio', { name: 'Grid view' }).click().catch(async () => { await p2.getByLabel('Grid view').click() })
    await p2.reload(); await ready(p2)
    ok('S8 …and a member who picked the grid keeps it', await p2.getByTestId('library-table').count() === 0 && await p2.getByTestId('library-card').count() > 0)
    await c2.close()
  })

  /* ── S10 · names wrap beside a chip at every width ── */
  await step('S10', async () => {
    await page.goto(`${BASE}/company/templates/payments`); await ready(page)
    const card = page.getByTestId('library-card').filter({ hasText: 'STUDIO DEFAULT' }).first()
    /* (REG-820) a card's name lost its native title for the house Tooltip whenCut: find the name by its class */
    const NAME = '[class*="__cardName"]:not([class*="__cardNameRow"])'
    const name = card.locator(NAME).first()
    const m = await name.evaluate((el) => ({ text: el.textContent, ws: getComputedStyle(el).whiteSpace, cut: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 }))
    ok('S10 a split named by its percentages reads whole beside its chip at 1440', m.ws === 'normal' && !m.cut, JSON.stringify(m))
    await card.scrollIntoViewIfNeeded(); await shot('s10-01-payments-names-wrap')
    await page.goto(`${BASE}/company/templates/quotes`); await ready(page)
    const q = page.getByTestId('library-card').filter({ hasText: 'DEFAULT' }).first().locator(NAME).first()
    ok('S10 "Default Quote PDF" reads whole', !(await q.evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)))
    ok('S12 New ▾ stays outlined with its menu in a full library (REG-541)', (await page.getByTestId('new-template').getAttribute('aria-haspopup')) === 'menu')
    ok('S12 the to-do chip stays', await page.getByRole('button', { name: /^\d+ approvals?$/ }).count() >= 1)   // (the calm UI build 2026-10-27, a deliberate change) T-01: the chip counts Approvals ("1 approval"; was "1 awaiting approval")
    await shot('s12-01-quotes-library')
  })

  /* ── S12 · Materials' plain New; Sync now clear of the snackbar ── */
  await step('S12', async () => {
    await page.goto(`${BASE}/company/materials`); await ready(page)
    const nb = page.getByTestId('new-template')
    ok('S12 Materials: a plain "New material" button, no menu of one', (await nb.innerText()).trim() === 'New material' && (await nb.getAttribute('aria-haspopup')) === null)
    await shot('s12-02-materials-new-material')
    await nb.click(); await page.getByRole('dialog', { name: 'New material' }).waitFor()
    ok('S12 …which opens New material', true)
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    await page.goto(`${BASE}/company/integrations`); await ready(page)
    await page.getByRole('button', { name: 'Connect Gmail' }).click()
    const s = await snack(page, 'Gmail connected'); await page.waitForTimeout(1200)
    const sync = page.getByTestId('gmail-sync-row').getByRole('button', { name: 'Sync now' })
    ok('S12 after Connect Gmail the snackbar no longer covers Sync now', !overlap(await sync.boundingBox(), await s.boundingBox()) && await inView(sync))
    ok('S12 …and offers Sync now itself', await s.getByRole('button', { name: 'Sync now' }).count() === 1)
    await shot('s12-03-gmail-connected')
  })

  /* ── V11 · the bell's proposal opens the proposed item ── */
  await step('V11', async () => {
    await page.goto(`${BASE}/company/members`); await ready(page)
    await page.getByRole('button', { name: /^Notifications/ }).first().click()
    await page.getByTestId('notifications-panel').waitFor()
    await page.getByTestId('notification-row').filter({ hasText: 'Skirting' }).first().getByRole('button').click()
    await page.waitForURL(/\/company\/price-book\?open=/); await ready(page)
    const item = page.getByRole('dialog', { name: 'Edit item' })
    ok('V11 the proposal opens the item itself, not the grid', await item.count() === 1 && (await item.getByLabel('Item name').inputValue()) === 'Skirting, PVC 80 mm' && /proposed this item/.test(await item.innerText()))
    await shot('v11-01-bell-opens-the-item')
  })

  /* ── S2 on a phone: the question fits ── */
  await step('S2 phone', async () => {
    const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p3 = await c3.newPage()
    await p3.goto(`${BASE}/company/profile`); await p3.getByTestId('profile').waitFor(); await ready(p3)
    await p3.getByLabel('Tagline').fill('Phone Probe')   // (the calm UI build 2026-10-27, a deliberate change) 5-36
    await p3.getByTestId('brand-kit-link').click(); await leave(p3).waitFor(); await p3.waitForTimeout(400)
    const box = await leave(p3).boundingBox()
    const fits = await leave(p3).getByRole('button').evaluateAll((bs) => bs.every((b) => { const r = b.getBoundingClientRect(); return r.right <= window.innerWidth && r.left >= 0 }))
    ok('S2 390: the question fits the screen, three buttons in reach', !!box && box.width <= 390 && fits)
    await shot('s2-03-phone-leave-asks', p3)
    await c3.close()
  })

  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed} / ${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
