// Dane's UAT fixes 2026-10-01 — package P2b: Settings, the Company pages, the brand kit and the library editors' details. Run against a
// production build on a scratch copy of the demo baseline. It writes records (an order, two custom fields, a member, a tag): re-copy the
// scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3033
//   TESTDB=<scratch.db> BASE=http://localhost:3033 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P2b/verify-p2b.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3033', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1000) }
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
const shot = (page, n, opts = {}) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...opts })
const viewAs = (id) => sql(`update members set is_you = case when id = '${id}' then 1 else 0 end`)
const inView = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.bottom > 0 }, sel)
/** Drags a row by its handle to just below another row, in small steps (motion's Reorder follows the pointer). */
async function dragBelow(page, handle, target) {
  const h = await handle.boundingBox(), t = await target.boundingBox()
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  const toY = t.y + t.height * 0.85
  for (let i = 1; i <= 16; i++) { await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + ((toY - (h.y + h.height / 2)) * i) / 16); await page.waitForTimeout(30) }
  await page.waitForTimeout(200)
  await page.mouse.up()
}
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  viewAs('dane')

  /* ── g-tabs (UAT 2.14): Studio · Lead management · Projects (soon) · Quotes & pricing · Finance (soon) · Notifications — strip, ghost, ⌘K ── */
  await step('g-tabs', async () => {
    await page.goto(`${BASE}/settings`); await ready(page)
    const tabs = await page.locator('[role="tablist"] [role="tab"]').allInnerTexts()
    ok('g-tabs the strip reads in the new order', tabs.map((t) => t.trim()).join(' · ') === 'Studio · Lead management · Projects · Quotes & pricing · Finance · Notifications', tabs.join(' · '))
    await page.locator('[role="tablist"] [role="tab"]', { hasText: 'Projects' }).click()
    ok('g-tabs Projects still answers Coming soon', /Coming soon/.test(await snack(page, /Coming soon/)))
    /* the loader as streamed: its tab bones follow the same list (Projects and Finance narrower than their neighbours) */
    const html = (await (await page.request.get(`${BASE}/settings`)).text()).replace(/<script[\s\S]*?<\/script>/g, '')
    const probe = await ctx.newPage()
    await probe.route(`${BASE}/__ghost`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: html }))
    await probe.goto(`${BASE}/__ghost`); await probe.waitForTimeout(800)
    const widths = await probe.evaluate(() => { const row = [...document.querySelectorAll('[aria-label="Loading settings"] [aria-hidden]')].find((el) => el.children.length === 6); return row ? [...row.children].map((c) => c.getBoundingClientRect().width) : [] })
    await probe.close()
    ok('g-tabs the ghost draws six tabs in the same order', widths.length === 6 && widths[2] < widths[1] && widths[2] < widths[3] && widths[4] < widths[3], widths.map(Math.round).join(','))
    await page.bringToFront(); await page.keyboard.press('Meta+k')
    await page.getByRole('combobox', { name: 'Search the studio' }).fill('pricing'); await page.waitForTimeout(900)
    ok('g-tabs ⌘K still finds Quotes & pricing', /Quotes & pricing/.test(await page.locator('#gs-list').innerText()))
    await page.keyboard.press('Escape')
    await shot(page, 'g-tabs-studio-1440', { clip: { x: 0, y: 0, width: 1440, height: 260 } })
  })

  /* ── g-whomay (UAT 2.23 · 10.08): each row links to where its rule is set, and lands on it ── */
  await step('g-whomay', async () => {
    await page.goto(`${BASE}/settings`); await ready(page)
    ok('g-whomay See leads names Who sees leads', (await page.getByTestId('may-link-see').innerText()) === 'Lead management › Who sees leads')
    ok('g-whomay a fixed rule has no link', (await page.getByTestId('may-delete-lead').locator('a').count()) === 0)
    await page.getByTestId('studio-roles').scrollIntoViewIfNeeded()
    await shot(page, 'g-whomay-links-1440', { clip: { x: 60, y: 0, width: 1380, height: 1024 } })
    const land = async (key, hash, section) => {
      await page.goto(`${BASE}/settings`); await ready(page)
      await page.getByTestId(`may-link-${key}`).click()
      await page.waitForURL(new RegExp(`section=${section}.*#${hash}`)); await page.waitForTimeout(1600)
      ok(`g-whomay ${key} lands on #${hash}`, await inView(page, `#${hash}`))
    }
    await land('see', 'lead-visibility', 'leads')
    await shot(page, 'g-whomay-landed-visibility-1440')
    ok('g-whomay the landing page has Back to Settings › Studio (from=)', /from=%2Fsettings/.test(page.url()))
    await land('approve', 'quote-approval', 'quotes')
    await land('publish', 'template-approval', 'quotes')
    await land('payments', 'payment-lock', 'quotes')
    await page.goto(`${BASE}/settings`); await ready(page)
    ok('g-whomay Members rows open Company › Members with the way back', /^\/company\/members\?from=%2Fsettings/.test(await page.getByTestId('may-link-members').getAttribute('href')))
    ok('g-whomay AI rows open Plan & AI credits', /^\/company\/plan\?from=/.test(await page.getByTestId('may-link-ai-buy').getAttribute('href')))
    ok('g-whomay Price book rows open the Price book', /^\/company\/price-book\?from=/.test(await page.getByTestId('may-link-price-book').getAttribute('href')))
  })

  /* ── the read-only strip, as Sarah (a Designer) — one component, every read-only page ── */
  await step('g-whomay read-only strip', async () => {
    viewAs('sarah')
    await page.goto(`${BASE}/settings?section=leads`); await ready(page)
    const line = page.getByTestId('read-only-line').first()
    const look = await line.evaluate((el) => { const s = getComputedStyle(el); const icon = el.querySelector('span'); return { bg: s.backgroundColor, r: s.borderTopLeftRadius, fs: s.fontSize, icon: icon ? icon.getBoundingClientRect().width : 0, h: el.getBoundingClientRect().height, text: el.textContent } })
    ok('g-whomay the read-only line is a tinted strip (tint, r8, body-m, 20 lock, one line)', look.bg !== 'rgba(0, 0, 0, 0)' && look.r === '8px' && look.fs === '14px' && Math.round(look.icon) === 20 && look.h <= 44, JSON.stringify(look))
    await shot(page, 'g-readonly-strip-sarah-1440', { clip: { x: 60, y: 0, width: 1380, height: 420 } })
    await page.goto(`${BASE}/company/members`); await ready(page)
    ok('g-whomay Members says it in the same strip', (await page.getByTestId('read-only-line').evaluate((el) => getComputedStyle(el).borderTopLeftRadius)) === '8px')
    /* the brand kit's Preview stays pressable for a member who may only read */
    await page.goto(`${BASE}/company/templates/brand`); await ready(page)
    await page.getByTestId('brand-kit-preview-open').click()
    ok('b-brandkit a reader can open Preview', await page.getByRole('dialog', { name: 'Default Quote PDF' }).isVisible())
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    viewAs('dane')
  })

  /* ── g-reasons (UAT 2.21) ── */
  await step('g-reasons', async () => {
    await page.goto(`${BASE}/settings?section=leads`); await ready(page)
    const card = page.getByTestId('lead-reasons')
    ok('g-reasons the card is "Lost and On Hold reasons"', /^Lost and On Hold reasons/.test((await card.innerText()).trim()))
    const add = page.getByTestId('add-reason-lost')
    ok('g-reasons the add row reads "Contacts expected first" with its help line', /Contacts expected first/.test(await add.innerText()) && /Blank asks for none — the Lost dialog says how many are logged/.test(await add.innerText()))
    ok('g-reasons "Needs logged contacts" is gone', !/Needs logged contacts/.test(await page.locator('body').innerText()))
    await card.scrollIntoViewIfNeeded(); await shot(page, 'g-reasons-card-1440', { clip: await card.boundingBox() })
    await card.getByRole('button', { name: /^Unresponsive/ }).click()
    const dlg = page.getByTestId('list-entry')
    ok('g-reasons the reason dialog says it the same way', /Contacts expected first/.test(await dlg.innerText()) && /Blank asks for none/.test(await dlg.innerText()))
    await page.getByRole('dialog', { name: 'Lost reason' }).getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
  })

  /* ── g-quotenumbers (UAT 2.25) ── */
  await step('g-quotenumbers', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await ready(page)
    const card = page.getByTestId('numbering'); await card.scrollIntoViewIfNeeded()
    const g = page.getByTestId('numbering-switches')
    const geo = await g.evaluate((el) => {
      const rows = [...el.querySelectorAll(':scope > label')].map((l) => l.getBoundingClientRect())
      const digits = [...el.parentElement.querySelectorAll('label, input')].find((x) => x.closest('[class*="numGrid"]'))?.closest('[class*="numGrid"]')?.getBoundingClientRect()
      return { n: rows.length, xs: rows.map((r) => Math.round(r.left)), ys: rows.map((r) => Math.round(r.top)), top: el.getBoundingClientRect().top, w: el.getBoundingClientRect().width, gridBottom: digits ? digits.bottom : 0, caption: el.firstElementChild?.textContent }
    })
    ok('g-quotenumbers three switches in their own group, captioned', geo.n === 3 && /Also in the number/i.test(geo.caption), JSON.stringify(geo))
    ok('g-quotenumbers stacked, one under another', new Set(geo.xs).size === 1 && geo.ys[0] < geo.ys[1] && geo.ys[1] < geo.ys[2])
    ok('g-quotenumbers under the fields, the card’s full width', geo.top >= geo.gridBottom && geo.w > 900)
    await shot(page, 'g-quotenumbers-1440', { clip: await card.boundingBox() })
  })

  /* ── g-dragorder (UAT 3.38): the question bank and the custom fields reorder by drag ── */
  await step('g-dragorder questions', async () => {
    await page.goto(`${BASE}/company/questionnaire`); await ready(page)
    const rows = page.getByTestId('bank-question')
    const qText = (i) => rows.nth(i).locator('[class*="__question"]').first().innerText()
    const first = await qText(0)
    await dragBelow(page, rows.nth(0).getByTestId('bank-question-handle'), rows.nth(1))
    ok('g-dragorder a dropped question answers "Order saved"', /Order saved/.test(await snack(page, /Order saved/)))
    await page.waitForTimeout(600)
    ok('g-dragorder the bank keeps the dragged order', sql(`select sort_order from studio_scope_questions where question = '${first.replace(/'/g, "''")}'`) === '1', first)
    await page.reload(); await ready(page)
    ok('g-dragorder the order holds after a reload', (await qText(1)) === first)
    ok('g-dragorder the arrows stay for keyboard and touch', await rows.nth(0).getByRole('button', { name: /Move .* down/ }).isVisible())
    await shot(page, 'g-dragorder-questions-1440', { clip: { x: 60, y: 80, width: 1380, height: 520 } })
  })
  await step('g-dragorder custom fields', async () => {
    await page.goto(`${BASE}/settings?section=leads`); await ready(page)
    for (const label of ['Site access', 'Parking']) {
      await page.getByTestId('custom-fields').getByRole('button', { name: 'Add field' }).click()
      await page.getByRole('dialog', { name: 'Add field' }).getByLabel('Label').fill(label)
      await page.getByRole('dialog', { name: 'Add field' }).getByRole('button', { name: 'Add', exact: true }).click()
      await snack(page, new RegExp(`${label} added`)); await page.waitForTimeout(900)
    }
    const rows = page.getByTestId('custom-field')
    await rows.nth(0).scrollIntoViewIfNeeded()
    await dragBelow(page, rows.nth(0).getByTestId('custom-field-handle'), rows.nth(1))
    ok('g-dragorder a dropped field answers "Order saved"', /Order saved/.test(await snack(page, /Order saved/)))
    await page.waitForTimeout(800)
    ok('g-dragorder the fields keep the dragged order', sql(`select label from lead_custom_fields order by order_index`).split('\n').join(',') === 'Parking,Site access', sql(`select label from lead_custom_fields order by order_index`))
    await shot(page, 'g-dragorder-fields-1440', { clip: await page.getByTestId('custom-fields').boundingBox() })
  })

  /* ── g-nooptional + g-ownrole (UAT 2.07 · 2.11) ── */
  await step('g-nooptional', async () => {
    await page.goto(`${BASE}/company/members`); await ready(page)
    await page.getByRole('button', { name: 'Add member' }).click()
    const form = page.getByTestId('add-member')
    const txt = await form.innerText()
    ok('g-nooptional no field says "Optional"', !/Optional/.test(txt), txt.replace(/\n/g, ' · '))
    ok('g-nooptional Email says what it prints as', /Printed as their email on the quotes they prepare/.test(txt))
    await shot(page, 'g-nooptional-add-member-1440')
    await form.getByLabel('Name').fill('priya   rajan-lim')
    await page.getByRole('dialog', { name: 'Add member' }).getByRole('button', { name: 'Add member' }).click()
    const s = await snack(page, /Priya Rajan-Lim/)
    ok('g-nooptional the name is saved title-cased', sql(`select name from members where lower(name) like 'priya%'`) === 'Priya Rajan-Lim', s)
  })
  await step('g-ownrole', async () => {
    await page.goto(`${BASE}/company/members`); await ready(page)
    await page.locator('[data-member-id="dane"] [data-testid="member-role"] > span').hover(); await page.waitForTimeout(800)
    const tip = await page.locator('[role="tooltip"]').innerText().catch(() => '')
    ok('g-ownrole an Owner’s own row says how ownership passes', tip === 'You’re the studio’s Owner — make another member an Owner, then they can change your role.', tip)
    await shot(page, 'g-ownrole-tip-1440', { clip: { x: 60, y: 80, width: 1380, height: 320 } })
    viewAs('huimin')
    await page.goto(`${BASE}/company/members`); await ready(page)
    await page.locator('[data-member-id="huimin"] [data-testid="member-role"] > span').hover(); await page.waitForTimeout(800)
    ok('g-ownrole an Admin’s own row keeps the rule’s words', (await page.locator('[role="tooltip"]').innerText().catch(() => '')) === 'Nobody changes their own role')
    viewAs('dane')
  })

  /* ── k-instagram (UAT 2.02) ── */
  await step('k-instagram', async () => {
    await page.goto(`${BASE}/company/profile`); await ready(page)
    const body = await page.locator('#details').innerText()
    ok('k-instagram the Social links help shows a handle', /Handles or links, as you want them printed — e\.g\. @demostudio\.sg\./.test(body))
  })

  /* ── b-brandkit + g-preview-large (Figma 1517:11, UAT 2.01 · 3.34) ── */
  await step('b-brandkit', async () => {
    await page.goto(`${BASE}/company/templates/brand`); await ready(page)
    const note = await page.getByTestId('brand-kit-own-note').innerText()
    ok('b-brandkit the preview says what Default Quote PDF sets for itself', note === 'Default Quote PDF sets its own Brand ink, Brand grey and Band colours, and its own fonts, so changing those here doesn’t show on it. Templates that use the brand kit follow it.', note)
    ok('b-brandkit the hint says where the stamp prints', /The stamp prints only where a template places it\./.test(await page.getByTestId('brand-kit-preview').innerText()))
    await shot(page, 'b-brandkit-preview-column-1440', { clip: { x: 1060, y: 120, width: 380, height: 700 } })
  })
  await step('g-preview-large', async () => {
    await page.goto(`${BASE}/company/templates/brand`); await ready(page)
    await page.getByTestId('brand-kit-preview-open').click()
    const dlg = page.getByRole('dialog', { name: 'Default Quote PDF' })
    await dlg.waitFor(); await page.waitForTimeout(1800)
    const pages = await dlg.locator('[data-testid="template-preview-pages"] [data-page]').count()
    ok('g-preview-large Preview opens every page of the default template', pages >= 2, `${pages} pages`)
    ok('g-preview-large its subtitle counts them', new RegExp(`${pages} pages`).test(await dlg.innerText()))
    const w = (await dlg.boundingBox()).width
    ok('g-preview-large an xl dialog', Math.round(w) === 1200, String(w))
    await shot(page, 'g-preview-large-1440')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    /* an unsaved logo: the large preview draws the kit as it stands */
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1PX }); await page.waitForTimeout(800)
    await page.getByTestId('brand-kit-preview-open').click(); await dlg.waitFor(); await page.waitForTimeout(1200)
    ok('g-preview-large drawn with the unsaved kit (a new logo, not saved)', (await dlg.locator('img[src^="data:image/png"]').count()) > 0)
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Discard' }).click(); await page.waitForTimeout(300)
  })

  /* ── b-tags (UAT 3.20, Figma 1654:17) ── */
  await step('b-tags', async () => {
    const id = sql(`select id from task_templates where name = 'Leads Template'`)
    await page.goto(`${BASE}/templates/tasks/${id}`); await ready(page)
    const stepRow = page.getByTestId('template-step').first()
    await stepRow.getByRole('button', { name: /^Tags/ }).click()
    const picker = page.getByRole('dialog', { name: 'Add Tag' })
    await picker.waitFor(); await page.waitForTimeout(400)
    const geo = await picker.evaluate((el) => ({ w: el.getBoundingClientRect().width, pos: getComputedStyle(el).position }))
    ok('b-tags the picker opens at its own 352, fixed', Math.round(geo.w) === 352 && geo.pos === 'fixed', JSON.stringify(geo))
    await shot(page, 'b-tags-picker-1440')
    await picker.getByRole('textbox').fill('Kitchen')
    await page.keyboard.press('Enter')
    const t0 = Date.now(); let tagId = ''
    while (Date.now() - t0 < 8000 && !tagId) { tagId = sql(`select id from tags where name = 'Kitchen'`); if (!tagId) await page.waitForTimeout(200) }
    ok('b-tags Enter on a new name makes the tag', !!tagId)
    await page.waitForTimeout(1500)
    ok('b-tags …and ticks it on the step (saved)', sql(`select count(*) from template_tasks where template_id = '${id}' and tag_ids like '%${tagId}%'`) === '1')
    ok('b-tags the step shows it', /Kitchen/.test(await stepRow.getByRole('button', { name: /^Tags/ }).innerText()))
    if (!(await picker.isVisible())) await stepRow.getByRole('button', { name: /^Tags/ }).click()
    await picker.getByRole('button', { name: 'Manage Tags' }).click()
    const manage = page.getByRole('dialog', { name: 'Manage Tags' })
    await manage.waitFor(); await page.waitForTimeout(800)
    ok('b-tags the picker gives way to the dialog', !(await picker.isVisible()))
    ok('b-tags Manage Tags opens the tags manager', await manage.isVisible() && /Kitchen/.test(await manage.innerText()))
    await shot(page, 'b-tags-manage-1440')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── g-merge-fields, T&Cs part (UAT 3.19) ── */
  await step('g-merge-fields', async () => {
    const id = sql(`select id from quote_text_templates where title = 'Terms and Conditions for Renovation Works'`)
    await page.goto(`${BASE}/templates/terms/${id}`); await ready(page)
    const btn = page.getByRole('button', { name: 'Insert a field' })
    ok('g-merge-fields the menu is "Insert a field"', await btn.isVisible() && !/Insert Token/.test(await page.locator('body').innerText()))
    await btn.click(); await page.waitForTimeout(400)
    ok('g-merge-fields its fields are unchanged', (await page.getByRole('menuitem').count()) >= 4)
    await shot(page, 'g-merge-fields-1440', { clip: { x: 400, y: 120, width: 1040, height: 520 } })
    await page.keyboard.press('Escape')
  })

  /* ── 390 touch: the Settings pages, the brand kit's Preview ── */
  await step('phone 390', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    for (const [u, n] of [['/settings', 'studio'], ['/settings?section=leads', 'leads'], ['/settings?section=quotes', 'quotes']]) {
      await p.goto(`${BASE}${u}`); await ready(p)
      const sw = await p.evaluate(() => document.documentElement.scrollWidth)
      ok(`phone ${n}: no sideways scroll at 390`, sw <= 390, String(sw))
      if (n === 'studio') { await p.getByTestId('may-link-see').scrollIntoViewIfNeeded(); await shot(p, 'phone-settings-studio-whomay-390') }
      if (n === 'leads') { await p.getByTestId('lead-reasons').scrollIntoViewIfNeeded(); await shot(p, 'phone-settings-reasons-390') }
      if (n === 'quotes') { await p.getByTestId('numbering-switches').scrollIntoViewIfNeeded(); await shot(p, 'phone-settings-numbers-390') }
    }
    await p.goto(`${BASE}/company/templates/brand`); await ready(p)
    ok('g-preview-large Preview shows on a phone', await p.getByTestId('brand-kit-preview-open').isVisible())
    await shot(p, 'phone-brandkit-preview-row-390')
    await p.getByTestId('brand-kit-preview-open').click()
    const dlg = p.getByRole('dialog', { name: 'Default Quote PDF' }); await dlg.waitFor(); await p.waitForTimeout(1800)
    ok('g-preview-large the phone sheet shows the pages', (await dlg.locator('[data-page]').count()) >= 2)
    ok('phone brand kit: no sideways scroll at 390', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390)
    await shot(p, 'phone-preview-large-390')
    await phone.close()
  })

  await browser.close()
  viewAs('dane')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
})()
