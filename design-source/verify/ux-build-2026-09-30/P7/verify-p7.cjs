/* UX audit build, package P7 — the shell, search and the AI Visualizer (V1…V10, V12, S3's and L11's search parts), against a production build
   on a scratch copy of the demo DB with the two designs restored (it writes: a reply, a link, a design, marks the bell read — run it on a copy).
   Usage: B=http://localhost:3027 DB=<scratch test.db> OUT=<dir> NODE_PATH=$PWD/node_modules node design-source/verify/ux-build-2026-09-30/P7/verify-p7.cjs */
/* (pending modules S43C, a deliberate change of this rule) the AI Visualizer's living room is the owner's photo (1.0's 4a51f3522): its walls are
   'Cream Painted Side Wall' · 'Cream Painted Back Wall' · 'Cream Painted TV Wall', its sofa 'Cream Bouclé Sofa' (were 'White Painted Back Wall', 'Grey Fabric Sofa'). */
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const B = process.env.B || 'http://localhost:3027'
const DB = process.env.DB
const OUT = process.env.OUT || __dirname
const q = (sql) => execSync(`sqlite3 "${DB}" "${sql.replace(/"/g, '\\"')}"`).toString().trim()
const KEVIN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744', SHOWROOM = 'f62bd5fa-fa62-4a87-a6dc-4ef770f57d3a', NOTE = '1cfcf6a4-d767-40b0-ab13-1701713d5afa', TOKEN = '17fe84ab2eca47'
let pass = 0, fail = 0
const check = (label, ok, extra = '') => { if (ok) { pass++; console.log('  ok  ', label) } else { fail++; console.log('  FAIL', label, extra) } }
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const step = async (name, fn) => { console.log(name); try { await fn() } catch (e) { fail++; console.log('  FAIL (threw)', e.message.split('\n')[0]) } }

;(async () => {
  q(`UPDATE members SET is_you = (id = 'dane')`)
  const browser = await chromium.launch()
  const desk = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await desk.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` })
  const snackText = (p) => p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')

  await step('V7 · the rail lights Tools on Tools pages', async () => {
    for (const url of ['/quotes', '/contracts', '/quote-x-ray', '/visualizer']) {
      await page.goto(`${B}${url}`); await page.waitForTimeout(900)
      const tools = page.locator('nav[aria-label="Workspace"] button[aria-label="Tools"]')
      check(`Tools is lit on ${url}`, (await tools.getAttribute('data-active')) === 'true' && (await tools.getAttribute('aria-current')) === 'page')
    }
    await shot(page, 'v7-visualizer-rail')
    await page.goto(`${B}/leads`); await page.waitForTimeout(900)
    check('…and not on /leads', (await page.locator('nav[aria-label="Workspace"] button[aria-label="Tools"]').getAttribute('data-active')) === null)
  })

  await step('V6 · dead ends say so', async () => {
    await page.goto(`${B}/quotes`); await page.waitForTimeout(900)
    await page.locator('nav[aria-label="Workspace"] button[aria-label="Tools"]').click(); await page.waitForTimeout(400)
    const menu = page.getByRole('menu', { name: 'Tools' })
    const soon = menu.locator('[data-soon]')
    /* (the gaps build, I-Q12 · J) the Compliance Navigator and the 3-D Space Planner went live: every tile still to come — and only those — wears Soon */
    const tiles = await menu.locator('[role="menuitem"]').evaluateAll((els) => els.map((e) => ({ soon: e.hasAttribute('data-soon') || !!e.querySelector('[data-soon]'), href: e.getAttribute('href') })))
    /* (pending modules S25, a deliberate change of this rule) Market Insights went live — the last tile still to come: no tile wears Soon any more,
       and a tile that did would still have to be one still to come */
    const names = await menu.locator('[role="menuitem"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))
    check('every Tools tile is live — none wears the Soon tag, and any that did would be one still to come', (await soon.count()) === 0 && tiles.filter((t) => t.soon).every((t) => !t.href))
    check('…and none says "coming soon" in its name', names.length > 0 && names.every((n) => !n.endsWith('coming soon')))
    check('the tool you are in is marked', (await menu.locator('[data-on]').innerText()).includes('Quotes'))
    await shot(page, 'v6-tools-soon')
    await page.keyboard.press('Escape'); await page.mouse.click(900, 600); await page.waitForTimeout(300)
    /* (pending modules S22, a deliberate change of this rule) the Dashboard is built — the rail's last dead end is a link; no rail item says
       "coming soon" now, and its tooltip names it */
    const dash = page.locator('nav[aria-label="Workspace"] a[href="/dashboard"]')
    check('the rail’s Dashboard is live (S22) — no rail item names itself coming soon', (await dash.count()) === 1 && (await page.locator('nav[aria-label="Workspace"] [aria-label$="coming soon"]').count()) === 0)
    await dash.hover(); await page.waitForTimeout(700)
    check('…its tooltip names it', (await page.getByRole('tooltip').innerText().catch(() => '')).includes('Dashboard'))
    await shot(page, 'v6-rail-tooltip')
  })

  await step('V8 · the bell: due rows apart, out of the count', async () => {
    /* (integration, UX audit T5) the Tasks badge is the viewer's OWN overdue count — the demo's Dane owns none, so give him one to count */
    q(`INSERT INTO task_assignees (task_id, member_id) SELECT t.id, 'dane' FROM lead_tasks t JOIN leads l ON l.id = t.lead_id WHERE t.done = 0 AND t.due_at < strftime('%s','now','-2 days') AND l.stage NOT IN ('On Hold','Lost') AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.member_id = 'dane') LIMIT 1`)
    const unread = Number(q(`SELECT count(*) FROM notifications WHERE member_id='dane' AND read_at IS NULL`))
    await page.goto(`${B}/leads`); await page.waitForTimeout(900)
    const bell = page.locator('[data-notifications-tile]')
    check(`the rail’s badge counts the unread notices only (${unread})`, ((await bell.getAttribute('aria-label')) ?? '') === `Notifications (${unread} unread)`, await bell.getAttribute('aria-label'))
    await bell.click(); await page.waitForTimeout(1200)
    const panel = page.getByTestId('notifications-panel')
    const due = page.getByTestId('notifications-due'), notices = page.getByTestId('notifications-notices')
    /* (REG-895, Dane UAT 11.06) while any Due row is late the Due group comes first; otherwise Updates lead — Dane was just given a late task */
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-20: the bell is for what happened) the notices lead with no group head;
       what is due folds into one line at the end — "Due · n", its late count beside it ("· 2 late") and Show — the same two groups, the due rows
       still apart and out of the count, one press away (was: two headed groups, Due first while a row was late) */
    const firstGroup = await panel.locator('section').first().getAttribute('data-testid')
    const fold = page.getByTestId('notifications-due-fold')
    const foldWords = (await fold.innerText().catch(() => '')).replace(/\s+/g, ' ')
    const closed = await due.locator('[data-testid="notification-row"]').count()
    await fold.click(); await page.waitForTimeout(500)
    const dueRows = await due.locator('[data-testid="notification-row"]').count(), late = await due.locator('[data-testid="notification-row"] [data-late]').count()
    check('the notices lead with no group head; what is due is one line at their end, “Due · n”, with its late count', firstGroup === 'notifications-notices' && await notices.locator('h3').count() === 0 && (await panel.locator('section').last().getAttribute('data-testid')) === 'notifications-due' && foldWords.startsWith(`Due · ${dueRows}`) && (late === 0 ? !/late/.test(foldWords) : foldWords.includes(` · ${late} late`)), `${firstGroup} · “${foldWords}” · ${dueRows} due, ${late} late`)
    check('…due rows sit in their own group, behind it', closed === 0 && (await fold.getAttribute('aria-expanded')) === 'true' && dueRows > 0)
    const meta = await due.locator('[data-testid="notification-row"]').first().locator('[class*="meta"]').innerText()
    /* (REG-891, Dane UAT 5.13) a date people plan by wears its day: "Due Mon, 5 Oct ’26 · 15 h late" */
    check('a due row says when and how late', /^Due (today|(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} [A-Z][a-z]{2} ’\d\d|in \d+ min)( · \d{1,2}:\d\d (AM|PM))?( · \d+ (day|days|h|min) late)?/.test(meta), meta)
    await shot(page, 'v8-bell-groups')
    await page.getByRole('button', { name: 'Mark all as read' }).click(); await page.waitForTimeout(1500)
    check('Mark all as read says the due ones stay', /All read — \d+ follow-ups? (is|are) due/.test(await snackText(page)), await snackText(page))
    await page.keyboard.press('Escape'); await page.goto(`${B}/leads`); await page.waitForTimeout(900)
    check('…and the badge clears', ((await page.locator('[data-notifications-tile]').getAttribute('aria-label')) ?? '') === 'Notifications')
    await page.locator('[data-notifications-tile]').click(); await page.waitForTimeout(1200)
    /* (the calm UI build 2026-10-27, a deliberate change — 1-20) the due rows behind their fold: opened before they are counted */
    { const f = page.getByTestId('notifications-due-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await page.waitForTimeout(500) } }
    check('…while the due rows stay listed', (await page.getByTestId('notifications-due').locator('[data-testid="notification-row"]').count()) > 0)
    await page.keyboard.press('Escape')
  })

  await step('V9 · search creates; titles before blurbs', async () => {
    await page.goto(`${B}/quotes`); await page.waitForTimeout(900)
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
    const panel = page.getByRole('dialog', { name: 'Search' })
    const create = panel.getByRole('group', { name: 'Create' })
    /* (REG-922, Projects round 1) Create gains "New project": five rows */
    check('empty, it offers Create under Go to', (await create.getByRole('option').count()) === 5 && (await create.getByRole('option').filter({ hasText: 'New project' }).count()) === 1 && (await panel.locator('[role="group"]').last().getAttribute('aria-label')) === 'Create', `${await create.getByRole('option').count()} rows`)
    await shot(page, 'v9-search-empty')
    const input = page.getByRole('combobox', { name: 'Search the studio' })
    await input.fill('add lead'); await page.waitForTimeout(900)
    const first = await panel.locator('[role="option"]').first().locator('[class*="title"]').first().innerText()
    check('"add lead" leads with New lead, not a page whose blurb holds the words', first.startsWith('New lead'), first.split('\n')[0])
    await shot(page, 'v9-search-add-lead')
    await input.fill('new lead'); await page.waitForTimeout(900)
    await page.keyboard.press('Enter'); await page.waitForURL(/\/leads$/, { timeout: 10000 }); await page.waitForTimeout(2500)
    check('New lead lands on Leads with the lead form open', await page.getByRole('dialog').filter({ hasText: /New Lead|Create New Lead|Add Lead|New lead/ /* (the calm UI build 2026-10-27, a deliberate change) B2: "New lead" */ }).first().isVisible().catch(() => false))
    await shot(page, 'v9-new-lead')
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
    await input.fill('create quote'); await page.waitForTimeout(900)
    await page.keyboard.press('Enter'); await page.waitForURL(/\/quotes$/, { timeout: 10000 }); await page.waitForTimeout(2500)
    check('Create quote lands on Tools › Quotes with Create Quote open', await page.getByRole('dialog').filter({ hasText: /* (the calm UI build 2026-10-27, a deliberate change) 4-32: the window's title is "New quote" */ 'New quote' }).first().isVisible().catch(() => false))
    await shot(page, 'v9-create-quote')
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
    await input.fill('new task'); await page.waitForTimeout(900)
    await page.keyboard.press('Enter'); await page.waitForURL(/\/tasks/, { timeout: 10000 }); await page.waitForTimeout(2500)
    const focused = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}|${a.getAttribute('aria-label') ?? a.getAttribute('placeholder') ?? ''}` : '' })
    check('New task lands on Tasks with a new task begun', /\/tasks/.test(page.url()) && /^(INPUT|TEXTAREA)/.test(focused), `${page.url().replace(B, '')} · ${focused}`)
    await shot(page, 'v9-new-task')
  })

  await step('S3 · every Settings and Company card is a page in search', async () => {
    const input = page.getByRole('combobox', { name: 'Search the studio' })
    const panel = page.getByRole('dialog', { name: 'Search' })
    const cases = [['gst', 'GST', /\/settings\?section=quotes#gst/, 'gst'], ['paynow', 'Issuing entities & bank details', /\/company\/profile\?tab=entities#entities/ /* (the calm UI build 2026-10-27, a deliberate change) B5 5-36: Profile is four tabs — #entities opens its tab, then lands on the card */, 'entities'], ['lost reason', 'Lost and On Hold reasons', /section=leads#lead-reasons/, 'lead-reasons'],
      ['who sees leads', 'Who sees leads', /section=studio#lead-visibility/, 'lead-visibility'],   // (pending modules S14, a deliberate change of this rule) its one home: Roles & access ['quote number', 'Quote numbers', /section=quotes#numbering/, 'numbering'], ['validity', 'Quote validity', /\/company\/templates\/quotes/, null],
      ['signature', 'Designers’ signatures', /\/company\/members#members/, 'members'], ['payment schedule', 'Payment schedule', /section=quotes#payment-lock/, 'payment-lock']]
    for (const [term, title, url, anchor] of cases) {
      await page.goto(`${B}/leads`); await page.waitForTimeout(700)
      await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
      await input.fill(term); await page.waitForTimeout(800)
      const row = panel.getByRole('group', { name: 'Go to' }).getByRole('option').filter({ hasText: title }).first()
      check(`"${term}" finds ${title}`, await row.isVisible().catch(() => false))
      if (!(await row.isVisible().catch(() => false))) continue
      await row.click(); await page.waitForURL(url, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(1500)
      if (term === 'gst' || term === 'paynow') await shot(page, `s3-${term}`)   // the card ringed as it lands
      check(`…and opens it (${page.url().replace(B, '')})`, url.test(page.url()))
      if (anchor) {
        const el = page.locator(`#${anchor}, [data-testid="${anchor}"]`).first()
        const r = await el.boundingBox()
        check(`…with the card in view`, !!r && r.y < 1024 && r.y + Math.min(r.height, 200) > 0, JSON.stringify(r))
      }
    }
  })

  await step('L11 · a caller-ID number finds the lead', async () => {
    await page.goto(`${B}/leads`); await page.waitForTimeout(700)
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
    const input = page.getByRole('combobox', { name: 'Search the studio' })
    for (const typed of ['65 98120443', '9812 0443', '+65 9812 0443']) {
      await input.fill(typed); await page.waitForTimeout(900)
      const leads = page.getByRole('dialog', { name: 'Search' }).getByRole('group', { name: 'Leads' })
      check(`"${typed}" finds Farah Ahmad`, (await leads.getByRole('option').first().innerText().catch(() => '')).includes('Farah Ahmad'))
    }
    check('…with the number marked as it is written', (await page.getByRole('dialog', { name: 'Search' }).getByRole('group', { name: 'Leads' }).locator('mark').first().innerText().catch(() => '')).replace(/\s/g, '') === '98120443')
    await shot(page, 'l11-plus65')
    await page.keyboard.press('Escape')
  })

  await step('V1 · the client’s notes in the editor, with a reply', async () => {
    await page.goto(`${B}/visualizer/${KEVIN}`); await page.waitForTimeout(2500)
    const badge = page.getByTestId('viz-notes-badge').first()
    check('the version tile’s notes badge is a button', (await badge.count()) === 1 && /Read 1 note from the client/.test((await badge.getAttribute('aria-label')) ?? ''))
    await badge.click(); await page.waitForTimeout(900)
    const card = page.getByTestId('viz-client-notes')
    check('it opens From the client', await card.isVisible())
    check('…with Kevin’s note', (await card.innerText()).includes('Love the walnut floor'))
    check('…on its version', ((await page.getByTestId('viz-stage-chip').textContent()) ?? '').startsWith('V2'))
    await shot(page, 'v1-from-the-client')
    await card.getByRole('textbox').fill('Warmer walls coming in V3 — I’ll send it tomorrow.')
    await card.getByTestId('viz-client-note-send').click(); await page.waitForTimeout(1800)
    check('the reply says where it went', /Kevin sees your reply on the link/.test(await snackText(page)), await snackText(page))
    check('…and sits under the note', (await page.getByTestId('viz-client-note-reply').count()) === 1)
    check('…kept as the note’s reply', q(`SELECT count(*) FROM render_consultation_requests WHERE kind='reply' AND task_id='${NOTE}'`) === '1')
    await shot(page, 'v1-replied')
    await page.goto(`${B}/visualizer/${KEVIN}?note=${NOTE}`); await page.waitForTimeout(2600)
    check('the bell’s ?note= link opens the notes on arrival', await page.getByTestId('viz-client-notes').isVisible())
    const bellHref = q(`SELECT href FROM notifications WHERE kind='render_feedback' ORDER BY created_at DESC LIMIT 1`)
    check('(the bell’s own links carry the version)', /\/visualizer\//.test(bellHref), bellHref)
  })

  await step('V10 · the client’s link names things as the studio does', async () => {
    /* the demo link's fixed expiry (1 Oct 2026) has passed — it would open as "expired": keep it open a month from now on the scratch DB */
    q(`UPDATE render_share_links SET expires_at = strftime('%s','now') + 30*86400 WHERE token = '${TOKEN}' AND expires_at < strftime('%s','now') + 86400`)
    const cp = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await cp.newPage()
    await p.goto(`${B}/renders/${TOKEN}?preview=1`); await p.waitForTimeout(2200)
    const title = await p.getByTestId('render-share-title').innerText()
    check('the title names the lead, not a room', /for Kevin Ng$/.test(title) && !/your /.test(title), title)
    const refs = p.getByTestId('render-share-ref')
    check('each design wears the studio’s V number', (await refs.count()) >= 1 && /V\d+$/.test((await refs.first().innerText()).trim()) && /^Design 2/.test(await p.getByTestId('render-share-version').first().locator('span').first().innerText()), await refs.first().innerText())
    check('the studio’s reply is under the client’s note', (await p.getByTestId('render-share-reply').count()) === 1)
    await shot(p, 'v10-client-top')
    const card = p.locator('[data-testid="render-share-version"]:not([data-favourite])').first()
    await card.getByRole('button', { name: 'Leave a note' }).click(); await p.waitForTimeout(400)
    const box = card.locator('textarea').first()
    await box.evaluate((el) => el.closest('[class*="write"]').scrollIntoView({ block: 'end' })); await p.waitForTimeout(500)
    await card.getByTestId('render-share-like').evaluate((el) => el.click()); await p.waitForTimeout(1400)
    const send = await p.getByTestId('render-share-send-note').first().boundingBox()
    const bar = await p.locator('[role="status"][aria-live="polite"] > *').last().boundingBox().catch(() => null)
    check('the favourite’s snackbar sits above the open note box', !!bar && !!send && !overlap(bar, send), JSON.stringify({ bar, send }))
    await shot(p, 'v10-snack-above-note')
    await cp.close()
  })

  await step('V4 · Share is a labelled, filled button on iPad and phone', async () => {
    const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
    const p = await tab.newPage()
    await p.goto(`${B}/visualizer/${KEVIN}`); await p.waitForTimeout(2600)
    const share = p.getByTestId('viz-share')
    check('≤1024 Share reads "Share"', /Share$/.test((await share.innerText()).trim()) && !/with client/.test(await share.innerText()), await share.innerText())
    const bg = await share.evaluate((el) => getComputedStyle(el).backgroundColor)
    check('…outlined — Generate is the editor’s one filled button', bg !== 'rgb(85, 0, 255)', bg)   // (the calm UI build 2026-10-27, a deliberate change) — 6-04 · T-03: Share was filled
    const sw = (await share.boundingBox()).width
    await shot(p, 'v4-ipad-share')

    /* V12 at the same size: the Maison AI button is clear of the versions */
    const fab = await p.locator('button[aria-label="Maison AI"]').boundingBox()
    const strip = await p.locator('[data-viz-strip]').boundingBox()
    const body = await p.locator('[data-viz-body]').boundingBox()
    check('V12 · Maison AI stays clear of the versions strip', !!fab && !!strip && !overlap(fab, strip), JSON.stringify({ fab, strip }))
    check('V12 · …riding the stage’s top corner', !!fab && !!body && Math.abs(fab.y - (body.y + 12)) <= 4, JSON.stringify({ fab, body }))
    await p.locator('button[aria-label="Maison AI"]').click(); await p.waitForTimeout(500)
    const sheet = await p.locator('[aria-label="Maison AI suggestions"]').boundingBox()
    check('V12 · its sheet opens under it, on screen', !!sheet && sheet.y > (fab?.y ?? 0) && sheet.y + sheet.height <= 1024, JSON.stringify(sheet))
    await shot(p, 'v12-ipad-maison')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)

    /* the ghost draws the same Share: the loading.tsx ghost as streamed (its scripts taken out, so the Suspense fallback stays) */
    const g = await tab.newPage()
    const url = `${B}/visualizer/${KEVIN}`
    await g.route((u) => u.href === url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
    await g.goto(url); await g.waitForTimeout(800)
    const ghostW = await g.evaluate(() => { const b = [...document.querySelectorAll('[class*="snugOrNarrow"]')].find((el) => el.getBoundingClientRect().width > 0); return b ? b.getBoundingClientRect().width : null })
    await g.screenshot({ path: `${OUT}/v4-ipad-ghost.png` })
    check('the editor’s ghost draws the Share button as wide', ghostW !== null && Math.abs(ghostW - sw) <= 14, `ghost ${ghostW} · page ${sw}`)
    await tab.close()
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const pp = await phone.newPage()
    await pp.goto(`${B}/visualizer/${KEVIN}`); await pp.waitForTimeout(2600)
    check('a phone’s Share reads "Share" too', /Share$/.test((await pp.getByTestId('viz-share').innerText()).trim()))
    await pp.getByTestId('viz-notes-badge').first().click(); await pp.waitForTimeout(1200)
    check('V1 · on a phone the client’s notes open as the house sheet', await pp.getByRole('dialog', { name: /From the client/ }).isVisible().catch(() => false) && (await pp.getByTestId('viz-client-note').count()) >= 1)
    await shot(pp, 'v1-phone-sheet')
    await pp.keyboard.press('Escape'); await pp.waitForTimeout(400)
    const title = await pp.locator('[data-testid="viz-topbar"] h1').boundingBox()
    check('…and the name keeps its room', !!title && title.width >= 60, JSON.stringify(title))
    await shot(pp, 'v4-phone-share')
    await phone.close()
  })

  await step('V4 · the fresh version: Share on its ⋯ and after Compare', async () => {
    await page.goto(`${B}/visualizer/${KEVIN}`); await page.waitForTimeout(2500)
    await page.getByTestId('viz-version').first().click(); await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Cream Painted Side Wall' }).click(); await page.waitForTimeout(1200)
    await page.getByTestId('viz-swatch').filter({ hasText: 'Cool Grey' }).first().click(); await page.waitForTimeout(300)
    await page.getByTestId('viz-generate').click(); await page.waitForTimeout(500)
    await page.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 30000 }); await page.waitForTimeout(1200)
    const ready = await snackText(page)
    /* (the calm UI build 2026-10-27, a deliberate change) — 6-18 · W-148: one name for it, "Before and after" (was Compare) */
    check('"V4 is ready" offers Before and after', /V\d+ is ready/.test(ready) && /Before and after/.test(ready), ready)
    await page.locator('[role="status"][aria-live="polite"]').last().getByRole('button', { name: 'Before and after' }).click(); await page.waitForTimeout(700)
    await page.getByTestId('viz-compare-toggle').click(); await page.waitForTimeout(700)
    const ask = await snackText(page)
    check('closing that Compare offers Share', /Share V\d+ with Kevin\?/.test(ask), ask)
    await shot(page, 'v4-share-after-compare')
    await page.locator('[role="status"][aria-live="polite"]').last().getByRole('button', { name: 'Share' }).click(); await page.waitForTimeout(800)
    check('…which opens Share with client', await page.getByRole('dialog').filter({ hasText: /Share/ }).first().isVisible())
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    const tiles = page.getByTestId('viz-version')
    await tiles.last().locator('xpath=ancestor::*[@role="listitem"]').getByRole('button', { name: /More options for V/ }).click(); await page.waitForTimeout(500)
    /* (the calm UI build 2026-10-27, a deliberate change) — 6-18 · W-367: the version on screen leaves Share (and Download) to the bars in view — the top bar's Share is its one door */
    const rows = await page.getByRole('menu').getByRole('menuitem').allInnerTexts()
    check('the fresh version’s ⋯ leaves Share to the top bar’s Share, in view', !rows.some((r) => /^Share with the client/.test(r)) && await page.getByTestId('viz-share').isVisible() && await page.getByTestId('viz-share').isEnabled(), rows.join(' | '))
    await shot(page, 'v4-fresh-menu')
    await page.keyboard.press('Escape')
  })

  await step('V5 · a rough reading says so inside each surface; waiting picks stay washed', async () => {
    const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
    const p = await tab.newPage()
    await p.goto(`${B}/visualizer/${SHOWROOM}`); await p.waitForTimeout(2600)
    await p.getByTestId('viz-add-room').first().click(); await p.waitForTimeout(600)
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('dialog').getByRole('button', { name: /Upload|photo/i }).first().click()])
    await chooser.setFiles(path.join(__dirname, '../../../../public/uat-files/sophia-living-room.jpg')); await p.waitForTimeout(4500)
    const marker = p.getByTestId('viz-marker').first()
    await marker.click(); await p.waitForTimeout(1200)
    const rough = p.getByTestId('viz-rough')
    check('a tap on the photo lands in the surface, and the rough note is there', await rough.isVisible())
    check('…with the way to trace it beside it', await rough.getByRole('button').first().isVisible())
    await shot(p, 'v5-ipad-rough-in-surface')
    await p.getByTestId('viz-swatch').first().click(); await p.waitForTimeout(500)
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    const markers = p.getByTestId('viz-marker')
    if ((await markers.count()) > 1) { await markers.nth(1).click(); await p.waitForTimeout(1500) }
    await p.waitForTimeout(1200)
    check('the first pick stays washed on the photo while the next is picked', await p.getByTestId('viz-wash').isVisible().catch(() => false))
    await shot(p, 'v5-ipad-wash')
    await tab.close()
  })

  await step('V2 · a personal design joins a lead', async () => {
    await page.goto(`${B}/visualizer/${SHOWROOM}`); await page.waitForTimeout(2500)
    await page.getByTestId('viz-design-menu').click(); await page.waitForTimeout(400)
    await page.getByRole('menuitem', { name: 'Link to a lead…' }).click(); await page.waitForTimeout(900)
    const dlg = page.getByRole('dialog', { name: 'Link to a lead' })
    check('Link to a lead… opens the lead picker', await dlg.isVisible())
    const field = dlg.getByRole('combobox').or(dlg.locator('input')).first()
    await field.click(); await page.waitForTimeout(400)
    const kevin = page.getByRole('option').filter({ hasText: 'Kevin Ng' }).first()
    check('a lead with a design says so in the list', /Has a design already/.test(await kevin.innerText()))
    await kevin.click(); await page.waitForTimeout(300)
    check('…and can’t be picked', await dlg.getByRole('button', { name: 'Link' }).isDisabled() && (await dlg.innerText()).includes('can’t be picked'))
    await shot(page, 'v2-picker-blocked')
    await field.click(); await page.waitForTimeout(300)
    await page.getByRole('option').filter({ hasText: 'Cheryl Lim' }).first().click(); await page.waitForTimeout(300)
    await dlg.getByRole('button', { name: 'Link' }).click(); await page.waitForTimeout(2000)
    check('the snackbar names the lead, with Undo', /Linked to Cheryl Lim/.test(await snackText(page)) && /Undo/.test(await snackText(page)), await snackText(page))
    check('the design is the lead’s now, named after it', (await page.locator('[data-testid="viz-topbar"] h1').innerText()).includes('Cheryl Lim') && q(`SELECT kind||'|'||name FROM visualizer_designs WHERE id='${SHOWROOM}'`) === 'lead|Cheryl Lim')
    await shot(page, 'v2-linked')
    await page.locator('[role="status"][aria-live="polite"]').last().getByRole('button', { name: 'Undo' }).click(); await page.waitForTimeout(2000)
    check('Undo puts it back as a personal design', q(`SELECT kind||'|'||name FROM visualizer_designs WHERE id='${SHOWROOM}'`) === 'personal|Showroom — kitchen concept')
    /* the demo files the showroom design in its "Showroom ideas" folder (R61), and Undo puts it back there (REG-804): open the folder it is in */
    const inFolder = q(`SELECT coalesce(folder_id, '') FROM visualizer_designs WHERE id='${SHOWROOM}'`)
    await page.goto(`${B}/visualizer${inFolder ? `?folder=${inFolder}` : ''}`); await page.waitForTimeout(1600)
    const card = page.getByTestId('library-card').filter({ hasText: 'Showroom' }).first()
    await card.hover(); await card.getByRole('button', { name: /More|options/i }).first().click(); await page.waitForTimeout(400)
    check('the landing’s card menu offers Link to a lead… too', await page.getByRole('menuitem', { name: 'Link to a lead…' }).isVisible())
    await page.keyboard.press('Escape')
  })

  await step('V2 · after the welcome’s upload: "For a lead? Link it"', async () => {
    q(`UPDATE visualizer_designs SET deleted_at = strftime('%s','now')`)
    /* a studio with no design opens on the welcome only when it has no folder either (REG-736/737 `firstRun`): the demo's "Showroom ideas"
       folder (R61) steps aside too, and comes back below */
    const folders = q(`SELECT group_concat(id) FROM library_folders WHERE library='visualizer' AND deleted_at IS NULL`)
    q(`UPDATE library_folders SET deleted_at = strftime('%s','now') WHERE library='visualizer' AND deleted_at IS NULL`)
    try {
      await page.goto(`${B}/visualizer`); await page.waitForTimeout(1800)
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByTestId('viz-welcome-upload').click()])
      await chooser.setFiles(path.join(__dirname, '../../../../public/uat-files/sophia-living-room.jpg'))
      await page.waitForURL(/\/visualizer\/[0-9a-f-]+/, { timeout: 15000 }); await page.waitForTimeout(4000)
      check('the editor asks, quietly, whether it is for a lead', await page.getByTestId('viz-link-ask').isVisible())
      await shot(page, 'v2-link-ask')
    } finally {
      q(`UPDATE visualizer_designs SET deleted_at = NULL WHERE id IN ('${KEVIN}', '${SHOWROOM}')`)
      if (folders) q(`UPDATE library_folders SET deleted_at = NULL WHERE id IN (${folders.split(',').map((f) => `'${f}'`).join(',')})`)
    }
  })

  await step('V9 · New design from search starts a blank design', async () => {
    await page.goto(`${B}/leads`); await page.waitForTimeout(700)
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
    await page.getByRole('combobox', { name: 'Search the studio' }).fill('new design'); await page.waitForTimeout(800)
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/visualizer\/[0-9a-f-]+/, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(2000)
    check('it lands in a new design’s editor', /\/visualizer\/[0-9a-f-]{36}/.test(page.url()) && await page.getByTestId('viz-empty').isVisible().catch(() => false), page.url())
  })

  await step('V3 · counts on a phone', async () => {
    const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await ph.newPage()
    q(`UPDATE notifications SET read_at = NULL WHERE member_id='dane' AND id IN (SELECT id FROM notifications WHERE member_id='dane' LIMIT 3)`)
    const unread = Number(q(`SELECT count(*) FROM notifications WHERE member_id='dane' AND read_at IS NULL`))
    await p.goto(`${B}/leads`); await p.waitForTimeout(1500)
    const bell = p.locator('header button[aria-label^="Notifications"]')
    check(`the top bar’s bell carries the unread count (${unread})`, (await bell.getAttribute('aria-label')) === `Notifications (${unread} unread)` && (await bell.innerText()).includes(String(unread)))
    const more = p.locator('nav[aria-label="Primary"]').getByRole('button', { name: /^More/ })
    const moreLabel = (await more.getAttribute('aria-label')) ?? ''
    check('More wears a dot when a row inside counts', /^More \(/.test(moreLabel) && (await more.locator('[class*="moreDot"]').count()) === 1, moreLabel)
    // (pending modules S22, a deliberate change of this rule) the dock's Dashboard is a link now
    const dash = p.locator('nav[aria-label="Primary"] a[href="/dashboard"]')
    check('the dock’s Dashboard is live (S22)', (await dash.count()) === 1 && (await p.locator('nav[aria-label="Primary"] button[aria-label="Dashboard · coming soon"]').count()) === 0)
    await shot(p, 'v3-phone-bar')
    await more.click(); await p.waitForTimeout(600)
    const tasks = p.getByRole('dialog', { name: 'More' }).getByRole('link', { name: /^Tasks \(\d+ overdue\)/ })
    check('the More sheet’s Tasks row shows its count', (await tasks.count()) === 1)
    // (pending modules S24, a deliberate change of this rule) the Marketplace is built — More's row is a live link, no Soon
    check('…and Marketplace is a live row', (await p.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Marketplace' }).count()) === 1)
    await shot(p, 'v3-phone-more')
    await p.goto(`${B}/quotes`); await p.waitForTimeout(1500)
    check('V7 · the dock lights Tools on Tools pages', (await p.locator('nav[aria-label="Primary"] button[aria-haspopup="menu"]').first().getAttribute('data-active')) === 'true')
    await ph.close()
  })

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  console.log(`\n${pass} passed, ${fail} failed`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})()
