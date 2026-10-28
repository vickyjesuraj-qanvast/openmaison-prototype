// Pending modules, step S22 · the Dashboard (the owner's "build all of them but one after the other", 2026-10-11; survey keys studio:dashboard ·
// held:dashboard · api:industry-news · public:industry-news-feed — 1.0's src/app/(main)/dashboard/page.tsx and src/components/dashboard/*).
// Each item asserted as the rule it builds, never another round's count:
//  - the front door: `/` lands every role on /dashboard (1.0's getDefaultRoute) — Accounting's too since the Dashboard redesign (2026-10-26, Q-08); the
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
  /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-01) "See all n" opens the whole list in the house Drawer (`needs-all`) instead of growing the card — while it is open
     the rows are read there; the card's own handles (its count, See all) are read on the card */
  const needs = (p) => p.locator('section[data-card="needs"], [data-testid="needs-all"]').last()
  const needsCard = (p) => p.locator('section[data-card="needs"]').first()
  const closeAll = async (p) => { if (await p.getByTestId('needs-all').count()) { await p.keyboard.press('Escape'); await settle(p, 400) } }
  const openAll = async (p) => { const m = needsCard(p).getByTestId('needs-more'); if (!(await p.getByTestId('needs-all').count()) && await m.count()) { await m.click(); await settle(p, 600) } }
  /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-01) a project's standing work folds into one row ("n things to do") that names each folded row in data-folded-keys */
  /* …counting only the folded rows of the same family as the unfolded ones (a project's own Needs you rows, `project:<id>:…`) — a compliance
     item folded beside them has its own key */
  const rowsCounted = (loc, prefix) => loc.evaluateAll((els, pre) => els.reduce((n, e) => n + (e.hasAttribute('data-folded') ? (e.getAttribute('data-folded-keys') ?? '').split(/\s+/).filter((k) => k && k.startsWith(pre)).length : 1), 0), prefix)
  /* (Dashboard redesign 2026-10-26, a deliberate change) Needs you is one inbox (lane D2): its rows carry `data-inbox-row` — the verbs inside a row carry `need-…` test ids of their own */
  const needRows = (p) => needs(p).locator('[data-inbox-row]')
  /* (Dashboard redesign 2026-10-26, a deliberate change — lane D3) MY TASKS and Coming up are Your day ('day'); Workload is Team ('team'); Site
     updates is On site ('site'); Pipeline and Projects are new. The frame's own keys (needs · stands · article) are lane D1's to restate. */
  const CARDS = ['needs', 'day', 'stands', 'pipeline', 'projects', 'team', 'site', 'article']
  /* a card's own section repeats its slot's name — each once, in the page's order */
  const cards = async (p) => [...new Set(await p.locator('[data-testid="dashboard"] [data-card]').evaluateAll((els, list) => els.map((e) => e.getAttribute('data-card')).filter((c) => list.includes(c)), CARDS))]
  /* (the calm pass 2026-10-26, a deliberate change — lane C1) an Owner's and an Admin's Pulse: four white cards, Profit naming its month */
  /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-17 · 3-03 · T-01) the figures' labels are sentences in sentence case — compared upper-cased as before */
  const OWNER_FIGURES = ['WON IN THE LAST 90 DAYS', 'TO COLLECT', `PROFIT IN ${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'Asia/Singapore' }).format(new Date()).toUpperCase()}`, 'FIRST REPLY TO NEW LEADS']
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

    console.log('2 · the greeting and the docked field')
    /* (the Dashboard redesigned 2026-10-26 — a deliberate change of this rule, his P-01 · P-02: the MAISON AI BRIEF card is gone; its greeting is
       the page's title and its sentence the greeting's line — the day, what needs you, what is new since the mark) */
    const title = await p.getByTestId('greeting-title').innerText()
    const line = await p.getByTestId('greeting-line').innerText()
    ok(/^Good (morning|afternoon|evening), Dane$/.test(title.trim()), 'the greeting is the page’s title, by name', title)
    /* (the calm pass 2026-10-26, a deliberate change — lane C1) the line's dots cling to the words before them (a no-break space), so a narrow
       line breaks after a dot: read any space */
    ok(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} \w+\s·\s/.test(line.trim()), 'its line names the day by the studio’s clock', line.slice(0, 60))
    /* (the calm pass 2026-10-26, a deliberate change — lane C3) the count sits beside the card's title in the frame's own head (`<card>-count`),
       no longer the house card's meta */
    const headMeta = Number((await needsCard(p).getByTestId('needs-count').first().innerText().catch(() => '0')).replace(/[^0-9]/g, '') || 0)
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-18 · T-01) the count is said once, in the card's head — the line keeps it for a screen reader ("n need your attention" ·
       "You’re all caught up") */
    const hidden = await p.getByTestId('greeting-needs').textContent().catch(() => '')
    const said = /(\d+) needs? your attention/.exec(hidden ?? '')?.[1]
    ok(said ? Number(said) === headMeta : headMeta === 0 && /You’re all caught up/.test(hidden ?? ''), `the line says Needs your attention’s own count, to a screen reader (${said ?? 'nothing'} = ${headMeta})`)
    await shot(p, '01-dane-1440')
    /* (Dashboard redesign 2026-10-26, a deliberate change — his P-01 · Q-02) the brief's Ask box became Maison AI docked at the page's foot: the
       question asked there is answered above the field and kept in Recent; "What did I miss?" is asked in it (the Since chips say what is new) */
    const dockField = p.getByTestId('dock-field-input')
    await dockField.click(); await dockField.fill('Which leads need attention?'); await dockField.press('Enter'); await settle(p, 2600)
    /* a short answer grows above the field, a long one opens beside the page (his Q-01) — either way, answered */
    const answered = async () => (await p.locator('[data-testid="dock-thread"], [data-testid="dock-pane"]').allInnerTexts().catch(() => [])).join(' ')
    const threadText = await answered()
    ok(/need(s)? attention|No lead needs you/.test(threadText), 'the docked field answers the question — above it, or beside the page', threadText.slice(0, 120).replace(/\n/g, ' '))
    await settle(p, 800)
    ok(Number(sql(`select count(*) from maison_questions where member_id='dane' and question='Which leads need attention?' and asked_at >= ${t0} and cleared_at is null`)) === 1, 'the question lands in Recent (maison_questions), Maison AI’s own record')
    await shot(p, '02-ask-answered')
    await p.keyboard.press('Escape'); await settle(p, 400)   // the pane, when the answer opened there
    await dockField.click(); await dockField.fill('What did I miss?'); await dockField.press('Enter'); await settle(p, 2600)
    ok(/notice|nothing new|missed/i.test(await answered()), '“What did I miss?” asked in the field is answered from the bell')
    await p.keyboard.press('Escape'); await settle(p, 500)

    console.log('3 · Needs you')
    const rows = needRows(p)
    const n = await rows.count()
    ok(n > 0 && n <= 6 && (headMeta <= 6 || await needsCard(p).getByTestId('needs-more').count() === 1), `six rows at most at a desk, the rest under "See all n" (${n} of ${headMeta})`)   // (the calm UI build 2026-10-27, a deliberate change)
    /* (Dashboard redesign 2026-10-26, a deliberate change) the approvals lead (Your OK first — the chip names them, no group label) */
    const okFlags = await rows.evaluateAll((els) => els.map((e) => e.hasAttribute('data-ok')))
    ok(okFlags.indexOf(false) < 0 || okFlags.slice(okFlags.indexOf(false)).every((f) => !f), `Your OK leads the card (${okFlags.filter(Boolean).length} approvals first)`)
    /* (Dashboard redesign 2026-10-26, a deliberate change) his note: a row's verbs are quiet — at most two (the house Row's text button since 2026-10-27), the rest in its ⋮ */
    const buttons = await rows.evaluateAll((els) => els.map((e) => e.querySelectorAll('[data-row-actions] button').length))
    ok(buttons.every((k) => k >= 1 && k <= 2), `every row carries its verb, two at most (${buttons.join(',')})`)
    /* (Dashboard redesign 2026-10-26, a deliberate change) red only on what is late and ours — the row's glyph (its square) carries it */
    const alerts = await rows.evaluateAll((els) => els.filter((e) => e.getAttribute('data-tone-row') === 'late').map((e) => e.getAttribute('data-testid')))
    ok(alerts.every((t) => /need-(need-milestone-done|need-milestone-start|need-target-passed|need-ticket|need-week-update|need-hold|need-cost-|todo-|leads-overdue|meeting-write)/.test(t)), `red only on what is late and ours (${alerts.join(', ') || 'none'})`)
    /* (Dashboard redesign 2026-10-26, a deliberate change) every project's rows, not only its first: Benjamin's home lists all of its Needs you here, and its words open the project */
    /* (the calm pass 2026-10-26, a deliberate change) a project row's caption names its client ("Benjamin Han · from Germaine · yesterday"),
       not the project's whole name — the row is found by its key */
    const benjamin = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Benjamin Han' and p.deleted_at is null`)
    const projectRow = needs(p).locator(`[data-inbox-row^="project:${benjamin}:"]`).first()
    if (await projectRow.count()) {
      const pid = (await projectRow.getAttribute('data-inbox-row')).split(':')[1]
      await openAll(p)
      const here = await rowsCounted(needs(p).locator(`[data-inbox-row^="project:${pid}:"]`), `project:${pid}:`)   // (the calm UI build 2026-10-27, a deliberate change) a folded row counts each row it holds
      await closeAll(p)
      await projectRow.locator('a').first().click(); await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
      ok(/[?&]from=%2Fdashboard/.test(p.url()), 'a row’s words open its project with the way back (?from=/dashboard)')
      const crumb = (await p.locator('header:not([class*="mobile-nav"])').allInnerTexts()).join(' ')
      ok(/Dashboard/.test(crumb), 'the project’s crumb names the Dashboard')
      await go(p, `/projects/${pid}`, 2200)   // its Overview's own Needs you count (the row's words opened the record it is about)
      const pCount = Number((await p.locator('section[data-card="needs"]').first().evaluate((el) => Array.from(el.querySelectorAll('span')).find((x) => Array.from(x.classList).some((c) => /__meta$/.test(c)))?.textContent ?? '').catch(() => '')).replace(/[^0-9]/g, '') || 0)
      ok(here === pCount, `every one of the project’s own Needs you rows is on the Dashboard (${here} = ${pCount})`)
      await go(p, '/dashboard', 1500)
    } else ok(false, 'a project row for Benjamin’s home')
    /* a run lands on the project's own step: Start opens the Start sheet; nothing is written until it is saved */
    await openAll(p)   // (the calm UI build 2026-10-27, a deliberate change) every row is listed — it may sit under See all n, in the drawer
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-01) the Start row may be folded into its project's "n things to do" row — then Start is a row of that row's ⋮ */
    let startRow = needs(p).locator('[data-inbox-row]').filter({ hasText: 'Start the project' }).filter({ has: p.getByRole('button', { name: 'Start', exact: true }) }).first()
    let startPress = async () => startRow.getByRole('button', { name: 'Start', exact: true }).click()
    if (!(await startRow.count())) {
      const holder = needs(p).locator('[data-inbox-row][data-folded][data-folded-keys*=":start"]').first()
      if (await holder.count()) { startRow = holder; startPress = async () => { await holder.getByTestId('need-more').first().click(); await settle(p, 400); await p.getByRole('menuitem', { name: /^Start the project/ }).first().click() } }
    }
    if (await startRow.count()) {
      const pid = sql(`select id from projects where number='P-2026-004'`)
      const stage0 = sql(`select stage from projects where id='${pid}'`)
      await startPress();   /* (Dashboard redesign 2026-10-26, a deliberate change) the row's ⋮ is "More for Start the project" */ await p.waitForURL(/\/projects\//, { timeout: 15000 }).catch(() => {}); await settle(p, 2600)
      const dlg = p.getByRole('dialog').filter({ hasText: 'Start the project' })
      ok(await dlg.count() === 1 && !/[?&]run=/.test(p.url()), 'Start lands on the project with its Start sheet open, the address keeping nothing', p.url())
      await shot(p, '03-start-landing', false)
      await p.keyboard.press('Escape'); await settle(p, 800)
      ok(sql(`select stage from projects where id='${pid}'`) === stage0, 'closing the sheet writes nothing (still Setting up)')
      await go(p, '/dashboard', 1500)
    } else ok(true, 'no project waits to start (nothing to land on)')
    const moreBtn = needsCard(p).getByTestId('needs-more')
    if (await moreBtn.count()) {
      await openAll(p)
      const all = await p.getByTestId('needs-all-list').locator('[data-inbox-row]').count()
      ok(all === headMeta, `See all n shows every row, in the drawer (${all} of ${headMeta})`)   // (the calm UI build 2026-10-27, a deliberate change)
      await closeAll(p)
    }
    /* (Dashboard redesign 2026-10-26, a deliberate change) Finance › To do's rows are rows of their own — where no project row says them already — each opening its record with the way back */
    await openAll(p)
    const todoDoors = await needs(p).locator('[data-inbox-row^="todo:"] a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    ok(todoDoors.every((h) => /^\/(company\/finance|projects\/[^/]+\/money)/.test(h) && /from=%2Fdashboard/.test(h)), `To do’s own rows open Finance or the project’s Money with the way back (${todoDoors.length})`)
    await go(p, '/dashboard', 1500)
    /* the Leads listing's own to-do scopes, with the same number */
    for (const [tid, scope, word] of [['need-leads-overdue', 'overdue', 'Overdue follow-ups'], ['need-leads-unassigned', 'unassigned', 'Unassigned']]) {
      await openAll(p)
      const r = needs(p).getByTestId(tid)
      if (!(await r.count())) continue
      const k = Number(/^(\d+)/.exec((await r.locator('[class*="__name"]').first().innerText()).trim())?.[1] ?? -1)
      await r.locator('a').first().click(); await p.waitForURL(new RegExp(`scope=${scope}`), { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      /* (the calm UI build 2026-10-27, a deliberate change — T-07, W-479) the scope pill reads "Overdue follow-ups · 2" (was "(2)") */
      const pill = Number(new RegExp(`${word} · (\\d+)`).exec(await p.locator('main').innerText())?.[1] ?? -2)
      ok(k === pill, `"${word}" lands on the listing’s scope with the same number (${k} = ${pill})`)
      await go(p, '/dashboard', 1500)
    }
    await openAll(p)   // (the calm UI build 2026-10-27, a deliberate change) every row is listed — it may sit under See all n, in the drawer
    ok(await needs(p).getByTestId('need-templates').count() === (Number(sql(`select count(*) from quote_templates where submitted_at is not null and deleted_at is null`)) > 0 ? 1 : 0), 'a template waiting for approval is an Owner’s row')

    /* (Dashboard redesign 2026-10-26, a deliberate change — lane D3) MY TASKS and Coming up merged into Your day (P-06): the week as seven days, a
       day's agenda in place, the member's own tasks (late on today, red), ticking one done says so with Undo; every row opens its record with the
       way back, and nothing past the seventh day is on it. The probe of record is design-source/verify/dashboard-2026-10-26/verify-dash-d3.cjs. */
    console.log('4 · Your day — the member’s tasks')
    const dayCard = p.locator('[data-card="day"]')
    const today0 = new Date(); const sod = Math.floor(new Date(today0.getFullYear(), today0.getMonth(), today0.getDate()).getTime() / 1000)
    const dueToday = Number(sql(`select count(*) from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id='dane' and t.done = 0 and t.due_at is not null and t.due_at < ${sod + 86400} and (t.meeting_id is null or t.meeting_id not in (select id from meetings where deleted_at is null and status <> 'cancelled'))`))
    const todayTasks = await dayCard.locator('[data-testid="day-row"][data-key^="task:"]').count()
    ok(todayTasks === dueToday, `today lists the viewer’s own tasks due by today, the late ones too — the rail badge’s rule (${todayTasks} = ${dueToday})`)
    const tickBtn = dayCard.locator('[data-testid="day-row"]:not([data-done]) [data-testid="day-tick"]').first()
    if (await tickBtn.count()) {
      const key = await tickBtn.locator('xpath=ancestor::*[@data-testid="day-row"]').getAttribute('data-key')
      doneTask = key.replace(/^task:/, '')
      /* (the calm pass 2026-10-26, a deliberate change — lane C3) the caption is where the task is; when it is due is the row's time column */
      ok((await dayCard.locator(`[data-key="${key}"] [class*="__caption"]`).innerText()).trim().length > 2, 'each task says where it is')
      await tickBtn.click(); await settle(p, 1400)
      ok(/Task completed/.test(await snackText(p)) && sql(`select done from lead_tasks where id='${doneTask}'`) === '1', 'ticking a task done says so, and it is done')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1600)
      ok(sql(`select done from lead_tasks where id='${doneTask}'`) === '0', 'Undo puts it back')
      doneTask = null
    }

    console.log('5 · Your day — the week')
    const cells = dayCard.getByTestId('day-cell')
    ok(await cells.count() === 7, 'the week is seven days from today')
    let all = []
    for (let i = 0; i < 7; i++) {
      await cells.nth(i).click(); await settle(p, 250)
      all = all.concat(await dayCard.locator('[data-testid="day-open"]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? '')))
    }
    ok(all.length > 0 && all.every((h) => /[?&]from=%2Fdashboard/.test(h)), `every row of the week opens its record with the way back (${all.length} rows)`)
    await cells.first().click(); await settle(p, 250)

    /* (Dashboard redesign 2026-10-26, a deliberate change) Where it stands became Pulse (his P-03 · P-11): one strip of the role's figures, each
       its report's own written short, each a door with the way back — Open projects moved to the Projects card, Contractors to Team, Tickets
       to Needs you, Messages to Since you were last here (lanes D2 · D3 assert theirs); lane D1's probe asserts the strip in full
       (design-source/verify/dashboard-2026-10-26/verify-dash-d1.cjs) */
    console.log('6 · Pulse (was Where it stands)')
    const tiles = await tileLabels(p)
    /* (the calm pass 2026-10-26, a deliberate change — the Claude Design option he took, lane C1) an Owner's four white cards: Won · Owed to you ·
       Profit · <month> · First response — Leads this week and Coming in left the Owner's strip (lane C1's probe asserts Leads this week on the
       roles that keep it) */
    ok(JSON.stringify(tiles.map((x) => x.toUpperCase())) === JSON.stringify(OWNER_FIGURES), `an Owner’s figures (${tiles.join(' · ')})`)
    ok(await p.locator('[data-testid="stands-tiles"] [data-grade]').count() === 0, 'no figure is red — red is only for what is late and ours (a grade is its chip)')
    const tileValue = async (key) => (await p.getByTestId(`tile-${key}`).locator('[class*="__value"]').innerText()).trim()
    const short = (v) => { const m = Math.abs(num(v)); const t = (x) => x.toFixed(1).replace(/\.0$/, ''); return `${/^−/.test(String(v).trim()) ? '−' : ''}${m >= 1e6 ? `S$ ${t(m / 1e6)}M` : m >= 1e3 ? `S$ ${t(m / 1e3)}K` : `S$ ${Math.round(m).toLocaleString('en-SG')}`}` }
    const weekFrom = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) - 6 * 86400 })()
    /* (the calm pass 2026-10-26, a deliberate change) Leads this week left an Owner's Pulse — the listing's own Last 7 days is asserted on
       Marketing's page in verify-dash-d1.cjs § 6 */
    ok(await p.getByTestId('tile-leads').count() === 0 && weekFrom > 0, 'Leads this week is not on an Owner’s Pulse any more (the Pipeline card and the greeting’s news say the new leads)')
    const owed = await tileValue('owed')
    await p.getByTestId('tile-owed').click(); await p.waitForURL(/\/company\/reports\/finance/, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
    const arFig = /(?:Owed to you|To collect)\s*(−?S\$[\d,.]+)/i.exec(await p.locator('main').innerText())?.[1]   // (the calm UI build 2026-10-27, a deliberate change) the report's tile by its old or its new name (T-01)
    ok(!!arFig && short(arFig) === owed && /[?&]from=%2Fdashboard/.test(p.url()), `Owed to you opens Reports › Finance on the same figure (${owed} ⇐ ${arFig})`)
    await go(p, '/dashboard', 1500)
    const profit = await tileValue('profit')
    await p.getByTestId('tile-profit').click(); await p.waitForURL(/report=pl/, { timeout: 15000 }).catch(() => {}); await settle(p, 2200)
    const plFig = /\bProfit\s*(−?S\$[\d,.]+)/i.exec(await p.locator('main').innerText())?.[1]
    ok(!!plFig && short(plFig) === profit, `Profit this month is the P&L’s own (${profit} ⇐ ${plFig})`)
    await go(p, '/dashboard', 1500)
    /* (Dashboard redesign 2026-10-26, a deliberate change — lane D3) Workload is the Team card (P-09): the same lines, a member's name in its row */
    const team = p.locator('[data-card="team"]')
    ok(await team.count() > 0, 'an Owner sees the team’s load')
    const firstPerson = (await team.getByTestId('team-row').first().locator('[class*="__teamName"]').innerText()).trim()
    await go(p, '/projects?view=workload', 2200)
    ok((await p.locator('main').innerText()).includes(firstPerson), `Workload is Projects › Workload’s lines (busiest first: ${firstPerson})`)
    await go(p, '/dashboard', 1500)
    /* (Dashboard redesign 2026-10-26, a deliberate change — lane D3) Site updates is On site (P-09): the week's photos, each opening its update */
    const upd = p.getByTestId('site-photo').first()
    if (await upd.count()) {
      const updTitle = (await upd.getAttribute('aria-label')).replace(/ — .*$/, '').trim()
      ok(/\/updates\?open=[^&]+&from=%2Fdashboard/.test(await upd.getAttribute('href')), 'a site photo opens its update on its project’s Updates, with the way back')
      await upd.click(); await p.waitForURL(/\/updates/, { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      ok(/\/projects\/[^/]+\/updates/.test(new URL(p.url()).pathname) && (await p.locator('main').innerText()).includes(updTitle), `…and lands there (“${updTitle}”)`)
      await go(p, '/dashboard', 1500)
    }
    /* (Dashboard redesign 2026-10-26, a deliberate change — his P-15) Market Insights left the page; a new article is a Since chip (lane D1's probe) */
    ok(await p.getByTestId('insights-row').count() === 0 && await p.locator('[data-card="article"]').count() === 0, 'Market Insights is off the page (P-15)')
    const order = await cards(p)
    /* (Dashboard redesign 2026-10-26, a deliberate change) Your day follows Needs you in the act stack — the frame's order is lane D1's to restate */
    ok(order.indexOf('needs') < order.indexOf('day'), `the reading order: needs me → my day (${order.join(' · ')})`)
    await ctx.close()

    console.log('7 · by role, at every width, its ghost')
    const ROLES = [
      /* (pending modules S45A, a deliberate change of this rule) Sales and Response time after Leads for Owners and Admins (H-UHD-3) */
      /* (pending modules S45B, a deliberate change of this rule) Contractors after Open projects for Owners, Admins and Managers (H-UHD-2) */
      /* (pending modules S46B, a deliberate change of this rule) Tickets after the projects' own for every role that opens projects (M1) */
      /* (Dashboard redesign 2026-10-26, a deliberate change) each role's Pulse (his P-11): the Owner's and an Admin's six, a Manager's the leads'
         three (Won a count), a Designer's own three, Accounting's the books' four */
      /* (the calm pass 2026-10-26, a deliberate change) an Owner's and an Admin's four (lane C1) */
      ['dane', OWNER_FIGURES, true],
      ['huimin', OWNER_FIGURES, true],
      /* (the calm UI build 2026-10-27, a deliberate change) the same figures in the one vocabulary (Won in the last 90 days · First reply to new leads · To collect · To pay · Coming in the next 30 days) */
      ['james', ['LEADS THIS WEEK', 'WON IN THE LAST 90 DAYS', 'FIRST REPLY TO NEW LEADS'], true],
      ['germaine', ['MY LEADS', 'MY PROJECTS', 'YOUR COMMISSION TO BE PAID'], false],
      ['priya', ['TO COLLECT', 'COMING IN THE NEXT 30 DAYS', 'TO PAY', 'GST THIS QUARTER'], false],
    ]
    const WIDTHS = [[1440, 1024, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 700, true]]
    for (const [who, labels, sees] of ROLES) {
      as(who)
      for (const [w, h, t] of WIDTHS) {
        const c = t ? await touch(w, h) : await desk(w, h); const q = await c.newPage(); watch(q, `${who}-${w}`)
        await go(q, '/dashboard', 1800)
        if (w === 1440) {
          const got = (await tileLabels(q)).map((x) => x.toUpperCase())
          ok(JSON.stringify(got) === JSON.stringify(labels), `${who}: the figures are theirs (${got.join(' · ')})`)
          ok((await q.locator('[data-card="team"]').count() > 0) === sees, `${who}: the team’s load ${sees ? 'shows' : 'is not theirs'}`)   // (Dashboard redesign 2026-10-26) the Team card
          if (who === 'germaine') ok(await needs(q).getByTestId('need-templates').count() === 0, 'germaine: a template approval is not a Designer’s')
          if (who === 'james') ok(await q.getByTestId('tile-owed').count() === 0 && await needs(q).locator('[data-inbox-row^="todo:"]').count() === 0, 'james: a Manager sees no studio money')   // (Dashboard redesign 2026-10-26, a deliberate change) To do's own rows
          if (who === 'priya') {
            /* (Dashboard redesign 2026-10-26, a deliberate change) Accounting's Needs you is Finance › To do's own rows, one each — no project row, no
               lead row (lane D2); the new cards' keys (lane D3) */
            const pk = await needs(q).locator('[data-inbox-row]').evaluateAll((els) => els.map((e) => e.getAttribute('data-inbox-row')))
            ok(pk.length > 0 && pk.every((k) => /^(todo:|xero)/.test(k)) && await q.locator('[data-card="article"], [data-card="site"], [data-card="team"], [data-card="projects"], [data-card="pipeline"]').count() === 0, 'priya: Accounting’s Needs you is Finance’s To do, row by row; no workspace cards')
            ok(await rail(q).locator('a[href="/dashboard"]').count() === 1 && await rail(q).locator('a[href^="/leads"]').count() === 0, 'priya: the Dashboard is on Accounting’s rail, the Leads pipeline is not')   // (S46C — H2) Leads may carry ?scope=unseen while it counts
            /* (Dashboard redesign 2026-10-26, a deliberate change — his Q-08) Accounting's front door is the Dashboard, its money layout; Finance ›
               To do stays one press away in their rail (Company) */
            await q.goto(BASE + '/', { waitUntil: 'networkidle' }); await settle(q, 1200)
            ok(new URL(q.url()).pathname === '/dashboard', 'priya: `/` lands Accounting on the Dashboard (Q-08)')
            await go(q, '/dashboard', 1500)
          }
          /* the ghost draws this viewer's page: the loader (no script) and the page hold the same cards */
          /* (the Dashboard redesigned 2026-10-26 — a deliberate change of this reading: the page and its ghost mark their regions with the frame's
             `data-slot`, the ghost drawing each card's shape on the card's own classes, not its `data-card`) */
          const slots = (pg) => pg.locator('[data-slot]').evaluateAll((els) => [...new Set(els.filter((e) => !e.closest('[hidden]') && e.getBoundingClientRect().height > 0).map((e) => e.getAttribute('data-slot')))])
          const page = await slots(q)
          const g = await desk(w, h, false); const gp = await g.newPage()
          await gp.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {}); await gp.waitForTimeout(600)
          const ghost = await slots(gp)
          ok(JSON.stringify(ghost) === JSON.stringify(page), `${who}: the ghost draws the page’s cards (${ghost.join(' · ')})`)
          await g.close()
        }
        if (w <= 390) {
          const order = [...new Set(await q.locator('[data-testid="dashboard"] [data-card]').evaluateAll((els, list) => els.filter((e) => list.includes(e.getAttribute('data-card'))).map((e) => [e.getAttribute('data-card'), e.getBoundingClientRect().top]).sort((a, b) => a[1] - b[1]).map((x) => x[0]), CARDS))]
          ok(order[0] === 'needs' || order[0] === 'stands', `${who} ${w}: a phone reads needs me first (${order.join(' · ')})`)   // (Dashboard redesign 2026-10-26, a deliberate change) the phone's order is lane D1's frame to restate
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
