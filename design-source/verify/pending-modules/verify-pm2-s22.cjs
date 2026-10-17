// Pending modules, step S22 · the Dashboard (the owner's "build all of them but one after the other", 2026-10-11; survey keys studio:dashboard ·
// held:dashboard · api:industry-news · public:industry-news-feed — 1.0's src/app/(main)/dashboard/page.tsx and src/components/dashboard/*).
// Each item asserted as the rule it builds, never another round's count:
//  - the front door: `/` lands the studio's roles on /dashboard (1.0's getDefaultRoute) and Accounting on Company › Finance (FR-040, kept); the
//    rail's first item and the dock's are live links (no rail item says "coming soon"); G then D goes there; the logo still expands the rail
//    (the mock, 795:22541)
//  - What needs me → What's next → Where it stands, in that reading order at every width (the act stack first; a phone's card order)
//  - the brief greets the viewer by name and says Needs you's own count; its Ask box opens Maison AI's sheet with the question asked and
//    answered, the question kept in Recent (maison_questions); its two buttons ask theirs
//  - Needs you: Needs your OK first, every row one text button, a project's row is that project's own top Needs you row and "n more" its own
//    count (its Overview's), a row's words open its home with ?from=/dashboard (Back names the Dashboard), a run lands on the project's own
//    step (`?run=start` opens the Start sheet and writes nothing until it is saved), Show n more; Finance › To do's row says To do's own
//    count and groups; the Leads to-do rows land on the listing's scope with the same number; a template approval is only an approver's
//  - MY TASKS lists the viewer's own open tasks (the rail badge's rule) with where each is; ticking one done says so with Undo
//  - Coming up keeps to this week and next (or the next three) and every row opens its record
//  - Where it stands: the tiles say the listings' and Reports' own numbers (Leads · Open projects · Messages · Owed to you · Profit this month),
//    each a door; no tile is red (red is only for what is late and ours); Workload is Projects › Workload's lines; Site updates and the
//    Market Insights article open their homes
//  - by role (View as): an Admin's is the Owner's; a Manager's has Workload and no money; a Designer's is their own (My leads · My projects);
//    Accounting's is the books (Owed to you · You owe · Profit this month; Finance's row; no workspace cards)
//  - the ghost draws the page as it is for each role (the loader's cards = the page's cards); 1440 · 1024 · 768 touch · 390 touch · 320 touch
//    with no sideways scroll against screen.width; no page errors
//  - 1.0's Industry News reader (RSS) through Market Insights' one mapper: scripts/rss-check.mts reads a sample feed (invented, .example) by
//    1.0's rules, writes it to the scratch DB, the headline is an Industry News article that links out; then it is taken out again
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s22.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s22')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const num = (s) => Number(String(s ?? '').replace(/[^0-9.]/g, '') || NaN)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (w = 1440, h = 1024, js = true) => b.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = true) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const rail = (p) => p.locator('nav[aria-label="Workspace"]')
  const needs = (p) => p.locator('[data-card="needs"]').first()
  const needRows = (p) => needs(p).locator('[data-testid^="need-"]:not([data-testid="need-action"]):not([data-testid="needs-empty"]):not([data-testid="needs-ok"]):not([data-testid="needs-more"])')
  const CARDS = ['needs', 'my-work', 'coming-up', 'stands', 'team', 'updates', 'article']
  /* a card's own section repeats its slot's name — each once, in the page's order */
  const cards = async (p) => [...new Set(await p.locator('[data-testid="dashboard"] [data-card]').evaluateAll((els, list) => els.map((e) => e.getAttribute('data-card')).filter((c) => list.includes(c)), CARDS))]
  const tileLabels = (p) => p.locator('[data-testid="stands-tiles"] > *').evaluateAll((els) => els.map((e) => (e.querySelector('[class*="__label"]')?.textContent ?? '').trim()))

  /* the record as it was — put back in `finally` */
  const you0 = sql(`select id from members where is_you = 1`)
  const asked0 = json(`select id, asked_at as at, cleared_at as cl from maison_questions`)
  const t0 = Date.now()
  let doneTask = null
  let headlines = false

  try {
    as('dane')
    const ctx = await desk(); const p = await ctx.newPage(); watch(p, '1440')
    await go(p, '/leads', 1500)   // the habit after S08: one page first, then the record

    console.log('1 · the front door')
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await settle(p, 1500)
    ok(new URL(p.url()).pathname === '/dashboard', `the studio lands on the Dashboard (${new URL(p.url()).pathname})`)
    ok(await rail(p).locator('a[href="/dashboard"][aria-current="page"]').count() === 1, 'the rail’s first item is a live link, lit on its page')
    ok(await rail(p).locator('[aria-label$="coming soon"]').count() === 0, 'no rail item says "coming soon" any more')
    ok(await rail(p).getByRole('button', { name: 'Expand navigation' }).count() === 1, 'the logo tile still expands the rail (the mock, 795:22541)')
    await go(p, '/leads', 1200)
    await p.mouse.click(1000, 16); await p.keyboard.press('g'); await settle(p, 300); await p.keyboard.press('d')
    await p.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
    ok(new URL(p.url()).pathname === '/dashboard', 'G then D goes to the Dashboard')

    console.log('2 · the brief and its Ask box')
    const brief = p.locator('[aria-label="Maison AI brief"]')
    const briefText = await brief.innerText()
    ok(/Good (morning|afternoon|evening), Dane\./.test(briefText), 'the brief greets the viewer by name', briefText.slice(0, 80))
    ok(/TODAY · /i.test(briefText), 'its tag names the day')
    const headMeta = Number((await needs(p).locator('[class*="__meta"]').first().innerText().catch(() => '· 0')).replace(/[^0-9]/g, '') || 0)
    const said = /One thing needs you/.test(briefText) ? '1' : /(\d+) things need you/.exec(briefText)?.[1]
    ok(said ? Number(said) === headMeta : headMeta === 0 && /Nothing waits on you/.test(briefText), `the brief says Needs you’s own count (${said ?? 'nothing'} = ${headMeta})`)
    await shot(p, '01-dane-1440')
    await p.getByTestId('dashboard-ask').getByRole('textbox').fill('Which leads need attention?')
    await p.getByTestId('dashboard-ask-send').click(); await settle(p, 2600)
    const sheet = p.locator('[aria-label="Maison AI suggestions"]')
    const sheetText = await sheet.innerText().catch(() => '')
    ok(await sheet.isVisible().catch(() => false) && /arrow_back/.test(sheetText), 'the Ask box opens Maison AI’s sheet with the question answered', sheetText.slice(0, 120).replace(/\n/g, ' '))
    await settle(p, 800)
    ok(Number(sql(`select count(*) from maison_questions where member_id='dane' and question='Which leads need attention?' and asked_at >= ${t0} and cleared_at is null`)) === 1, 'the question lands in Recent (maison_questions), the sheet’s own record')
    await shot(p, '02-ask-answered')
    await p.keyboard.press('Escape'); await settle(p, 500)
    await brief.getByRole('button', { name: 'What did I miss?' }).click(); await settle(p, 2600)
    ok(await sheet.isVisible().catch(() => false) && /notice|nothing new|missed/i.test(await sheet.innerText().catch(() => '')), 'the brief’s "What did I miss?" asks Maison AI and the sheet answers from the bell')
    await p.keyboard.press('Escape'); await settle(p, 500)

    console.log('3 · Needs you')
    const rows = needRows(p)
    const n = await rows.count()
    ok(n > 0 && n <= 6 && (headMeta <= 6 || await needs(p).getByTestId('needs-more').count() === 1), `six rows at most at a desk, the rest under "Show n more" (${n} of ${headMeta})`)
    const okLabel = needs(p).getByTestId('needs-ok')
    if (await okLabel.count()) {
      /* the group's children in order: the label, its rows, the rule, then the rest — the label's count is the rows above the rule */
      const shape = await okLabel.evaluate((label) => [...label.parentElement.children].map((e) => (e === label ? 'L' : /__rule/.test(e.className) ? '|' : (e.getAttribute('data-testid') ?? '').startsWith('need-') ? 'r' : '?')).join(''))
      const k = Number(/(\d+)\s*$/.exec((await okLabel.innerText()).replace(/\s+/g, ' ').trim())?.[1] ?? -1)
      const above = /^L(r*)/.exec(shape)?.[1].length ?? -1
      ok(shape.startsWith('L') && (above === k || (!shape.includes('|') && above <= k)), `Needs your OK leads the card, its count its rows (${shape}, ${k})`)
    }
    const buttons = await rows.evaluateAll((els) => els.map((e) => e.querySelectorAll('button').length))
    ok(buttons.every((k) => k === 1), `every row carries one button (${buttons.join(',')})`)
    const alerts = await rows.evaluateAll((els) => els.filter((e) => e.hasAttribute('data-alert')).map((e) => e.getAttribute('data-testid')))
    ok(alerts.every((t) => /need-(need-milestone-done|need-milestone-start|need-target-passed|need-ticket|need-week-update|need-hold|need-cost-|finance|leads-overdue|meeting-write)/.test(t)), `red only on what is late and ours (${alerts.join(', ') || 'none'})`)
    /* a project's row is its own Needs you: the Overview's top row (money aside — the books keep theirs in Finance's To do) and its count */
    const projectRow = rows.filter({ hasText: 'HDB 5-Room — Benjamin Han' }).first()
    if (await projectRow.count()) {
      const title = (await projectRow.locator('[class*="__name"]').first().innerText()).trim()
      const more = Number(/· (\d+) more/.exec(await projectRow.innerText())?.[1] ?? 0)
      await projectRow.locator('a').first().click(); await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
      ok(/[?&]from=%2Fdashboard/.test(p.url()), 'a row’s words open its project with the way back (?from=/dashboard)')
      const crumb = (await p.locator('header:not([class*="mobile-nav"])').allInnerTexts()).join(' ')
      ok(/Dashboard/.test(crumb), 'the project’s crumb names the Dashboard')
      const pNeeds = p.locator('[data-card="needs"]').first()
      const pCount = Number((await pNeeds.locator('[class*="__meta"]').first().innerText().catch(() => '· 0')).replace(/[^0-9]/g, '') || 0)
      ok(pCount === more + 1, `"n more" is the project’s own Needs you count (${more} + 1 = ${pCount})`)
      const pTitles = await pNeeds.locator('[data-testid^="need-"] [class*="__name"]').allInnerTexts()
      ok(pTitles.map((t) => t.trim()).includes(title), `the row is one of the project’s own Needs you rows (“${title.slice(0, 40)}”)`)
      await go(p, '/dashboard', 1500)
    } else ok(false, 'a project row for Benjamin’s home')
    /* a run lands on the project's own step: Start opens the Start sheet; nothing is written until it is saved */
    const startRow = rows.filter({ hasText: 'Start the project' }).first()
    if (await startRow.count()) {
      const pid = sql(`select id from projects where number='P-2026-004'`)
      const stage0 = sql(`select stage from projects where id='${pid}'`)
      await startRow.getByRole('button', { name: 'Start' }).click(); await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await settle(p, 2600)
      const dlg = p.getByRole('dialog').filter({ hasText: 'Start the project' })
      ok(await dlg.count() === 1 && !/[?&]run=/.test(p.url()), 'Start lands on the project with its Start sheet open, the address keeping nothing', p.url())
      await shot(p, '03-start-landing', false)
      await p.keyboard.press('Escape'); await settle(p, 800)
      ok(sql(`select stage from projects where id='${pid}'`) === stage0, 'closing the sheet writes nothing (still Setting up)')
      await go(p, '/dashboard', 1500)
    } else ok(true, 'no project waits to start (nothing to land on)')
    const moreBtn = needs(p).getByTestId('needs-more')
    if (await moreBtn.count()) {
      await moreBtn.click(); await settle(p, 400)
      ok(await needRows(p).count() === headMeta, `Show n more shows every row (${await needRows(p).count()} of ${headMeta})`)
      await moreBtn.click(); await settle(p, 300)
    }
    /* Finance › To do's row: To do's own count and groups */
    const fin = needs(p).getByTestId('need-finance')
    if (await fin.count()) {
      const t = await fin.innerText()
      const total = Number(/(\d+) things? in Finance/.exec(t)?.[1] ?? -1)
      await fin.getByRole('button', { name: 'Open' }).click(); await p.waitForURL(/\/company\/finance/, { timeout: 15000 }).catch(() => {}); await settle(p, 2000)
      const todo = await p.locator('main').innerText()
      const all = Number(/All · (\d+)/.exec(todo)?.[1] ?? -2)
      ok(total === all, `Finance’s row says To do’s own count (${total} = ${all})`)
      const groups = [...t.matchAll(/(\d+) (to approve|to pay|to collect|stuck)/g)].map((m) => [m[2], Number(m[1])])
      ok(groups.length > 0 && groups.every(([g, k]) => new RegExp(`${g.replace(/^./, (c) => c.toUpperCase())} · ${k}\\b`).test(todo)), `…and its groups (${groups.map((g) => g.join(' ')).join(' · ')})`)
      ok(/^\/company\/finance(\/todo)?$/.test(new URL(p.url()).pathname), `Open lands on Company › Finance › To do (a page of its own — the rail is its way back: ${new URL(p.url()).pathname})`)
      await go(p, '/dashboard', 1500)
    }
    /* the Leads listing's own to-do scopes, with the same number */
    for (const [tid, scope, word] of [['need-leads-overdue', 'overdue', 'Overdue follow-ups'], ['need-leads-unassigned', 'unassigned', 'Unassigned']]) {
      if (await moreBtn.count()) { await moreBtn.click(); await settle(p, 300) }
      const r = needs(p).getByTestId(tid)
      if (!(await r.count())) continue
      const k = Number(/^(\d+)/.exec((await r.locator('[class*="__name"]').first().innerText()).trim())?.[1] ?? -1)
      await r.locator('a').first().click(); await p.waitForURL(new RegExp(`scope=${scope}`), { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      const pill = Number(new RegExp(`${word} \\((\\d+)\\)`).exec(await p.locator('main').innerText())?.[1] ?? -2)
      ok(k === pill, `"${word}" lands on the listing’s scope with the same number (${k} = ${pill})`)
      await go(p, '/dashboard', 1500)
    }
    ok(await needs(p).getByTestId('need-templates').count() === (Number(sql(`select count(*) from quote_templates where submitted_at is not null and deleted_at is null`)) > 0 ? 1 : 0), 'a template waiting for approval is an Owner’s row')

    console.log('4 · My tasks')
    const myOpen = json(`select t.id, t.lead_id as lead from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id='dane' and t.done = 0`)
    const work = p.locator('[data-card="my-work"]')
    const counted = (await work.locator('[class*="groupText"]').allInnerTexts()).map((x) => Number(/(\d+)\s*$/.exec(x.replace(/\s+/g, ' ').trim())?.[1] ?? 0)).reduce((a, x) => a + x, 0)
    ok(counted === myOpen.length, `MY TASKS lists the viewer’s own open tasks — the rail badge’s rule (${counted} = ${myOpen.length})`)
    const first = work.locator('button[aria-label^="Mark \\""]').first()
    if (await first.count()) {
      const title = /Mark "(.+)" done/.exec(await first.getAttribute('aria-label'))?.[1] ?? ''
      doneTask = sql(`select t.id from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id='dane' and t.done = 0 and t.title = '${title.replace(/'/g, "''")}' limit 1`)
      ok(/·/.test(await work.locator('[class*="__meta"]').first().innerText()), 'each task says where it is')
      await first.click(); await settle(p, 1400)
      ok(/Task completed/.test(await snackText(p)) && sql(`select done from lead_tasks where id='${doneTask}'`) === '1', 'ticking a task done says so, and it is done')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1600)
      ok(sql(`select done from lead_tasks where id='${doneTask}'`) === '0', 'Undo puts it back')
      doneTask = null
    }

    console.log('5 · Coming up')
    const comingRows = p.getByTestId('coming-up-row')
    const cn = await comingRows.count()
    ok(cn > 0 || await p.getByTestId('coming-up-empty').count() === 1, `Coming up lists what is next, or says it is quiet (${cn} rows)`)
    const hrefs = await comingRows.evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''))
    ok(hrefs.every((h) => /[?&]from=%2Fdashboard/.test(h)), 'every Coming up row opens its record with the way back')
    /* this week and next (to Sunday week), else the next three — the project card's own window */
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const days = await p.getByTestId('coming-up-row').locator('[class*="__meta"]').allInnerTexts()
    const t = new Date(); const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); const end = today + (((7 - t.getDay()) % 7) + 7) * 86400000
    const asDay = (w) => { const m = /(\d+) (\w{3})/.exec(w); if (!m) return NaN; const mo = MON.indexOf(m[2]); const y = t.getFullYear() + (mo < t.getMonth() - 6 ? 1 : 0); return Date.UTC(y, mo, Number(m[1])) }
    const inWindow = days.map(asDay).every((d) => d >= today && d <= end)
    ok(inWindow || days.length <= 3, `Coming up keeps to this week and next, else the next three (${days.join(' · ')})`)

    console.log('6 · Where it stands')
    const tiles = await tileLabels(p)
    /* (pending modules S45A, a deliberate change of this rule) Reports › Leads' Sales and Response time join the Owner's tiles after Leads (H-UHD-3) */
    /* (pending modules S45B, a deliberate change of this rule) the Workload view's Contractors after Open projects for Owners, Admins and Managers (H-UHD-2) */
    ok(JSON.stringify(tiles.map((x) => x.toUpperCase())) === JSON.stringify(['LEADS', 'SALES', 'RESPONSE TIME', 'OPEN PROJECTS', 'CONTRACTORS', 'MESSAGES', 'OWED TO YOU', 'PROFIT THIS MONTH']), `an Owner’s tiles (${tiles.join(' · ')})`)
    ok(await p.locator('[data-testid="stands-tiles"] [data-grade]').count() === 0, 'no tile is red — red is only for what is late and ours')
    const tileValue = async (key) => (await p.getByTestId(`tile-${key}`).locator('[class*="__value"]').innerText()).trim()
    ok(num(await tileValue('leads')) === Number(sql(`select count(*) from leads where deleted_at is null and direct = 0`)), 'Leads is the listing’s own count')
    ok(num(await tileValue('projects')) === Number(sql(`select count(*) from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed'`)), 'Open projects is the listing’s default view')
    const railChat = await rail(p).locator('a[href="/chat"]').getAttribute('aria-label')
    ok(num(await tileValue('messages')) === (Number(/\((\d+) unread\)/.exec(railChat ?? '')?.[1] ?? 0)), `Messages is the rail’s own count (${railChat})`)
    const owed = await tileValue('owed')
    await p.getByTestId('tile-owed').click(); await p.waitForURL(/\/company\/reports\/finance/, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
    ok((await p.locator('main').innerText()).includes(owed) && /[?&]from=%2Fdashboard/.test(p.url()), `Owed to you opens Reports › Finance on the same figure (${owed})`)
    await go(p, '/dashboard', 1500)
    const profit = await tileValue('profit')
    await p.getByTestId('tile-profit').click(); await p.waitForURL(/report=pl/, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
    ok((await p.locator('main').innerText()).includes(profit), `Profit this month is the P&L’s own (${profit})`)
    await go(p, '/dashboard', 1500)
    const team = p.locator('[data-card="team"]')
    ok(await team.count() > 0, 'an Owner sees Workload')
    const firstPerson = (await team.getByTestId('team-row').first().locator('[class*="__name"]').innerText()).trim()
    await go(p, '/projects?view=workload', 2200)
    ok((await p.locator('main').innerText()).includes(firstPerson), `Workload is Projects › Workload’s lines (busiest first: ${firstPerson})`)
    await go(p, '/dashboard', 1500)
    const upd = p.getByTestId('site-update-row').first()
    if (await upd.count()) {
      const updTitle = (await upd.locator('[class*="__name"]').first().innerText()).trim()
      ok(/\/updates\?open=[^&]+&from=%2Fdashboard/.test(await upd.getAttribute('href')), 'a site update’s row opens that update on its project’s Updates, with the way back')
      await upd.click(); await p.waitForURL(/\/updates/, { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      ok(/\/projects\/[^/]+\/updates/.test(new URL(p.url()).pathname) && (await p.locator('main').innerText()).includes(updTitle), `…and lands there (“${updTitle}”)`)
      await go(p, '/dashboard', 1500)
    }
    const art = p.getByTestId('insights-row')
    if (await art.count()) {
      await art.click(); await p.waitForURL(/\/market-insights\//, { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      ok(/[?&]from=%2Fdashboard/.test(p.url()), 'the article opens in Market Insights with the way back — one reader')
      await go(p, '/dashboard', 1500)
    }
    const order = await cards(p)
    ok(order.indexOf('needs') < order.indexOf('my-work') && order.indexOf('my-work') < order.indexOf('coming-up') && order.indexOf('coming-up') < order.indexOf('stands'), `the reading order: needs me → next → stands (${order.join(' · ')})`)
    await ctx.close()

    console.log('7 · by role, at every width, its ghost')
    const ROLES = [
      /* (pending modules S45A, a deliberate change of this rule) Sales and Response time after Leads for Owners and Admins (H-UHD-3) */
      /* (pending modules S45B, a deliberate change of this rule) Contractors after Open projects for Owners, Admins and Managers (H-UHD-2) */
      ['dane', ['LEADS', 'SALES', 'RESPONSE TIME', 'OPEN PROJECTS', 'CONTRACTORS', 'MESSAGES', 'OWED TO YOU', 'PROFIT THIS MONTH'], true],
      ['huimin', ['LEADS', 'SALES', 'RESPONSE TIME', 'OPEN PROJECTS', 'CONTRACTORS', 'MESSAGES', 'OWED TO YOU', 'PROFIT THIS MONTH'], true],
      ['james', ['LEADS', 'OPEN PROJECTS', 'CONTRACTORS', 'MESSAGES'], true],
      ['germaine', ['MY LEADS', 'MY PROJECTS', 'MESSAGES'], false],
      ['priya', ['OWED TO YOU', 'YOU OWE', 'PROFIT THIS MONTH'], false],
    ]
    const WIDTHS = [[1440, 1024, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 700, true]]
    for (const [who, labels, sees] of ROLES) {
      as(who)
      for (const [w, h, t] of WIDTHS) {
        const c = t ? await touch(w, h) : await desk(w, h); const q = await c.newPage(); watch(q, `${who}-${w}`)
        await go(q, '/dashboard', 1800)
        if (w === 1440) {
          const got = (await tileLabels(q)).map((x) => x.toUpperCase())
          ok(JSON.stringify(got) === JSON.stringify(labels), `${who}: the tiles are theirs (${got.join(' · ')})`)
          ok((await q.locator('[data-card="team"]').count() > 0) === sees, `${who}: Workload ${sees ? 'shows' : 'is not theirs'}`)
          if (who === 'germaine') ok(await needs(q).getByTestId('need-templates').count() === 0, 'germaine: a template approval is not a Designer’s')
          if (who === 'james') ok(await q.getByTestId('tile-owed').count() === 0 && await needs(q).getByTestId('need-finance').count() === 0, 'james: a Manager sees no studio money')
          if (who === 'priya') {
            ok(await needs(q).getByTestId('need-finance').count() === 1 && await q.locator('[data-card="article"], [data-card="updates"], [data-card="team"]').count() === 0, 'priya: Accounting’s Needs you is Finance’s To do; no workspace cards')
            ok(await rail(q).locator('a[href="/dashboard"]').count() === 1 && await rail(q).locator('a[href="/leads"]').count() === 0, 'priya: the Dashboard is on Accounting’s rail, the Leads pipeline is not')
            await q.goto(BASE + '/', { waitUntil: 'networkidle' }); await settle(q, 1200)
            ok(/\/company\/finance/.test(new URL(q.url()).pathname), 'priya: `/` still lands Accounting on Finance › To do (FR-040)')
            await go(q, '/dashboard', 1500)
          }
          /* the ghost draws this viewer's page: the loader (no script) and the page hold the same cards */
          const page = await cards(q)
          const g = await desk(w, h, false); const gp = await g.newPage()
          await gp.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {}); await gp.waitForTimeout(600)
          const ghost = [...new Set(await gp.locator('[data-card]').evaluateAll((els, list) => els.filter((e) => !e.closest('[hidden]')).map((e) => e.getAttribute('data-card')).filter((c) => list.includes(c)), CARDS))]
          ok(JSON.stringify(ghost) === JSON.stringify(page), `${who}: the ghost draws the page’s cards (${ghost.join(' · ')})`)
          await g.close()
        }
        if (w <= 390) {
          const order = [...new Set(await q.locator('[data-testid="dashboard"] [data-card]').evaluateAll((els, list) => els.filter((e) => list.includes(e.getAttribute('data-card'))).map((e) => [e.getAttribute('data-card'), e.getBoundingClientRect().top]).sort((a, b) => a[1] - b[1]).map((x) => x[0]), CARDS))]
          ok(order[0] === 'needs' && order.indexOf('stands') > order.indexOf('coming-up'), `${who} ${w}: a phone reads needs me → next → stands (${order.join(' · ')})`)
        }
        ok(await sideways(q) <= 0, `${who} ${w}${t ? ' touch' : ''}: no sideways scroll`, `${await sideways(q)}px`)
        await shot(q, `${who}-${w}`)
        await c.close()
      }
    }

    console.log('8 · Industry News — 1.0’s RSS reader through Market Insights (the honest stand-in: the developers’ fetcher, a sample feed here)')
    as('dane')
    const ROOT = path.resolve(__dirname, '../../..')
    const run = (extra) => { try { return execSync(`npx tsx scripts/rss-check.mts --db "${DB}"${extra}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { return String(e.stdout ?? e) } }
    headlines = true
    const out = run('')
    for (const line of out.split('\n').filter((l) => /^(ok|FAIL) /.test(l))) ok(line.startsWith('ok '), `reader: ${line.replace(/^(ok|FAIL) /, '')}`)
    const n1 = await desk(); const r1 = await n1.newPage(); watch(r1, 'news')
    await go(r1, '/market-insights?category=industry-news', 1800)
    const story = r1.getByText('BCA guideline on balcony works').first()
    ok(await story.count() === 1, 'a headline is an Industry News article in Market Insights — one reader')
    await story.click(); await r1.waitForURL(/\/market-insights\/mi-rss-/, { timeout: 15000 }).catch(() => {}); await settle(r1, 1500)
    const out2 = r1.getByRole('link', { name: 'Read it on Sample Desk' })
    ok(await out2.count() === 1 && /^https:\/\/news\.example\//.test(await out2.getAttribute('href') ?? ''), 'its page links out to the whole story, its source the byline')
    await n1.close()
    run(' --clean'); headlines = false

    ok(errors.length === 0, 'no page errors', errors.join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    if (doneTask) sql(`update lead_tasks set done = 0 where id='${doneTask}'`)
    if (headlines) sql(`delete from market_insights where id like 'mi-rss-%'`)
    sql(`delete from maison_questions where id not in (${asked0.map((r) => `'${r.id}'`).join(',') || "''"})`)
    for (const r of asked0) sql(`update maison_questions set asked_at = ${r.at}, cleared_at = ${r.cl ?? 'null'} where id='${r.id}'`)
    as(you0)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
