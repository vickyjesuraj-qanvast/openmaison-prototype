// Pending modules, step S39 · Studio Health (+ S40 · designer portfolio profiles are whole) — the owner's "build all of them but one after the
// other", 2026-10-11; survey keys studio:studio-health (1.0's Accounts › Studio › Studio Health) and api:designer-portfolio-profiles. Each item
// asserted as the rule it builds, never another round's count:
//  - one home: Company › Reports gains Studio health, the last tab; Owners and Admins read it, anyone else meets the tab's gate; ⌘K finds it
//    for them only
//  - every figure is the studio's own records, per range (30 · 90 · 12 months · All), and the same count its own page shows: Reports › Leads'
//    "leads in range" and › Projects' tiles on the same range (the tile's door lands there, Back returns), Plan › Usage's "Times used",
//    Company › Members' active members, Qanvast Ops › Studios' four client figures, the records' own counts for the rest (SQL here)
//  - Over time: the house chart, two series, the AI runs adding up to the tile; By team member on the listing's model, Sign-ins a column
//    Column settings adds; Export; Maison AI answers who did nothing
//  - nothing new is tracked: no page-view or event table is written by opening the page
//  - R123: the demo's past has the sign-ins its acts imply — none live, each on a day its member did something; clients' 30 days each
//  - S40: a member's Public profile opens their own lead preferences (Known for) — the dialog lands open on Members; Back returns
//  - 390 · 320 · 768 touch with no sideways scroll against screen.width, Export inside the screen on every Reports tab (the bar's bug fix),
//    no rule across a phone card's top; the ghost draws the page; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. It writes only the View as flag, put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s39.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s39')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const REPO = path.resolve(__dirname, '../../..')
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const num = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86_400_000
/* the one list of acts the report reads (lib/studio-health/sources.ts), as the code states it — this probe counts it with SQL of its own */
const ACTS_SQL = execSync(`npx tsx -e "import('./lib/studio-health/sources.ts').then((m) => process.stdout.write(m.stampsSql(m.ACT_SOURCES)))"`, { cwd: REPO, maxBuffer: 1 << 24 }).toString().replace(/\n/g, ' ')
const ms = (col) => `(CASE WHEN ${col} < 100000000000 THEN ${col} * 1000 ELSE ${col} END)`

/* The ghost-vs-page measure (the S17 · S23 probes'): in the held reveal (PageReveal's ghost over the page, its first paint faked days away) every
   element carrying a page module's class in both, index by index after aligning the lists — the first screen only — and every Words sentence
   the ghost sets in a page class against that page's. */
async function measure(b, opts, url, blocks, max = 30, screens = 1) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks, max, screens }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal|tab-ghosts)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (blocks && !blocks.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x))) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) {
      const ps = q.get(k); if (!ps) continue
      let best = 0, bestCost = Infinity
      for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight * screens) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
    }
    const words = []
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words }
  }, { blocks, max, screens })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, t = 900) => p.waitForTimeout(t)
  const go = async (p, url, t = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, t) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const tileValue = async (p, key) => (await p.getByTestId(`health-tile-${key}`).locator('[class*="__value"]').innerText().catch(() => '')).trim()
  const tileHelp = async (p, key) => (await p.getByTestId(`health-tile-${key}`).locator('[class*="__help"]').innerText().catch(() => '')).trim()
  const n = (s) => Number(String(s).replace(/[^0-9.-]/g, '') || NaN)
  /** the first number in a line of words — "of 57 added" → 57, "1,234 credits used" → 1234 */
  const first = (s) => Number((String(s).match(/-?\d[\d,]*/) || ['NaN'])[0].replace(/,/g, ''))
  /** the tiles' comparison with the equal span before, in the page's words */
  const priorWords = (now, before) => (now > before ? `Up from ${before.toLocaleString('en-SG')}` : now < before ? `Down from ${before.toLocaleString('en-SG')}` : 'Same as before')
  /* (the calm UI build 2026-10-27, a deliberate change) the period is the house pill (5-19); Studio health opens on four tiles, the rest under Show all figures (5-22) */
  const showAll = async (p) => { const b = p.getByTestId('health-all'); if (await b.count() && await b.getAttribute('aria-expanded') === 'false') { await b.click(); await settle(p, 400) } }
  const pickIn = async (p, id, label) => { await p.getByTestId(id).getByRole('button').first().click(); await settle(p, 450); await p.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).first().click(); await settle(p, 700) }
  const pickRange = async (p, label) => { await pickIn(p, 'health-range', label); await showAll(p) }
  const usageTablesBefore = sql(`select group_concat(name) from sqlite_master where type = 'table' and (name like '%usage%' or name like '%page_view%' or name like '%rollup%')`)
  const rowsBefore = num(`select (select count(*) from studio_sessions) + (select count(*) from portal_sessions) + (select count(*) from lead_events)`)

  try {
    const ctx = await b.newContext(opts())
    const p = await page(ctx, 'dane')
    as('dane')

    // ── 1 · the tab and its place ────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Company › Reports › Studio health — the last tab, its groups')
      await go(p, '/company/reports/health', 2000)
      const tabs = (await p.locator('[aria-label="Reports sections"] [role="tab"], [aria-label="Reports sections"] a').allInnerTexts()).map((t) => t.trim()).filter(Boolean)
      ok(tabs.join(' · ') === 'Leads · Projects · Meetings · Finance · Studio health', 'Reports: Leads · Projects · Meetings · Finance · Studio health', tabs.join(' · '))
      ok(await p.getByTestId('studio-health').isVisible(), 'an Owner reads Studio health')
      ok((await p.getByTestId('studio-health').getAttribute('data-range')) === '90', 'it opens on the house reports’ 90 days')
      await showAll(p)
      const groups = await p.locator('[data-testid^="health-group-"] h2').allInnerTexts()
      ok(/^(Your team|Members) · New work · Work done · Your clients$/.test(groups.join(' · ')), 'four groups: Your team · New work · Work done · Your clients', groups.join(' · '))
      const labels = (await p.locator('[data-testid^="health-tile-"] [class*="__label"]').allInnerTexts()).map((t) => t.trim().toLowerCase())
      /* (the calm UI build 2026-10-27, a deliberate change) the model's new words (AI uses · Qanvast Hangout chats · Issues, 5-22 / §2) land with B1's lib/studio-health — either reads */
      ok([/^active members$/, /^sign-ins$/, /^ai (runs|uses)$/, /^leads added$/, /^projects started$/, /^quotes sent$/, /^invoices sent$/, /^tasks done$/, /^(tickets|issues) resolved$/, /^site updates$/, /^(qanvast )?hangout chats$/, /^portal sign-ins$/, /^(tickets|issues) raised$/, /^messages$/, /^choices made$/].every((l) => labels.some((x) => l.test(x))) || ['active members', 'sign-ins', 'ai runs', 'leads added', 'projects started', 'quotes sent', 'invoices sent', 'tasks done', 'tickets resolved', 'site updates', 'hangout chats', 'portal sign-ins', 'tickets raised', 'messages', 'choices made'].every((l) => labels.includes(l)), 'the tiles: 1.0’s, in 2.0’s words (no page views)', labels.join(', '))   // (Dashboard redesign 2026-10-26, a deliberate change) "Issues reported" → "Tickets raised": one name, the studio's
      ok(!labels.some((l) => /page view|top page|funnel/.test(l)), 'no page views, top pages or funnels — the telemetry she declined')
      ok((await p.getByTestId('health-caption').getAttribute('data-tip')) === 'Counts what was done in this period, by the day it was done', 'the period pill’s tooltip says what the range filters on (5-19)', await p.getByTestId('health-caption').getAttribute('data-tip'))   // (the calm UI build 2026-10-27, a deliberate change)
      await p.getByTestId('health-foot').getByRole('button').first().click(); await settle(p, 300)   // (the calm UI build 2026-10-27, a deliberate change) the foot is behind How these are counted (T-05)
      ok(/Up from” and “Down from” compare with the same span just before/.test(await p.getByTestId('health-foot').innerText()), 'the foot says what “Up from” compares with')
      ok(/doesn’t track the pages people open/.test(await p.getByTestId('health-foot').innerText()), 'the foot says why page views aren’t there')
      await shot(p, 's39-health-1440', true)
    }

    // ── 2 · every figure is the records' own, per range ──────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · each figure against the records, on each range')
      await go(p, '/company/reports/health', 1800)
      const team = json(`select id from members where is_active = 1`).map((r) => r.id)
      for (const [label, days] of [['Last 30 days', 30], ['Last 90 days', 90], ['Last 12 months', 365], ['All time', null]]) {
        await pickRange(p, label)
        const now = Date.now(), lo = days === null ? -1e15 : now - days * DAY, plo = days === null ? null : now - 2 * days * DAY
        const w = (col) => `${ms(col)} >= ${lo} AND ${ms(col)} <= ${now + 5000}`
        const tag = days === null ? 'all' : String(days)
        ok(new URL(p.url()).searchParams.get('range') === tag, `${label}: the address holds the range (?range=${tag})`)
        const active = num(`select count(distinct m) from (${ACTS_SQL}) where at >= ${lo} and at <= ${now + 5000} and m in (${team.map((t) => `'${t}'`).join(',')})`)
        ok(await tileValue(p, 'active') === `${active} of ${team.length}`, `${label}: Active members ${active} of ${team.length} — members with an act in the range, of the studio’s active members`, await tileValue(p, 'active'))
        ok(n(await tileValue(p, 'signIns')) === num(`select count(*) from studio_sessions where ${w('started_at')}`), `${label}: Sign-ins = sign-ins started in the range`)
        const runs = num(`select count(*) from credit_ledger where reason = 'spend' and ${w('created_at')}`)
        const credits = Math.max(0, -num(`select coalesce(sum(credits), 0) from credit_ledger where reason in ('spend','refund') and ${w('created_at')}`))
        ok(n(await tileValue(p, 'ai')) === runs, `${label}: AI runs = the ledger’s charges (${runs})`)
        if (runs || credits) ok(first(await tileHelp(p, 'ai')) === credits, `${label}: …and its AI credits net of refunds (${credits})`, await tileHelp(p, 'ai'))
        const idle = team.length - active
        ok(idle ? new RegExp(`^${idle} (did nothing|not active in this period)$`).test(await tileHelp(p, 'active')) : await tileHelp(p, 'active') === 'Everyone took part', `${label}: …and how many did nothing`, await tileHelp(p, 'active'))   // (the calm UI build 2026-10-27, a deliberate change) W-075 lands with B1's model
        const leads = num(`select count(*) from leads where deleted_at is null and direct = 0 and ${ms('created_at')} >= ${lo}`)
        ok(n(await tileValue(p, 'leads')) === leads, `${label}: Leads added = live leads created in the range (${leads})`)
        if (plo !== null) {
          const before = num(`select count(*) from leads where deleted_at is null and direct = 0 and ${ms('created_at')} >= ${plo} and ${ms('created_at')} < ${lo}`)
          ok(await tileHelp(p, 'leads') === priorWords(leads, before), `${label}: …against the equal span before, in words (“${priorWords(leads, before)}”)`, await tileHelp(p, 'leads'))
        } else ok(await p.getByTestId('health-tile-leads').locator('[class*="__help"]').count() === 0, `${label}: no span before to compare with — no line`)
        ok(n(await tileValue(p, 'quotes')) === num(`select count(*) from quotes q join leads l on l.id = q.lead_id where q.kind = 'quote' and q.deleted_at is null and l.deleted_at is null and q.client_sent_at is not null and ${w('q.client_sent_at')}`), `${label}: Quotes sent = quotes (not VOs) sent to the client in the range`)
        ok(n(await tileValue(p, 'invoices')) === num(`select count(*) from project_invoices i join projects j on j.id = i.project_id where i.sent_at is not null and j.deleted_at is null and ${w('i.sent_at')}`), `${label}: Invoices sent = invoices sent in the range`)
        const doneTasks = json(`select t.id, t.updated_at u, t.created_at c, (select max(e.at) from lead_events e where e.kind = 'task_completed' and json_extract(e.detail, '$.id') = t.id) e from lead_tasks t left join leads l on l.id = t.lead_id where t.done = 1 and (t.lead_id is null or l.deleted_at is null)`)
        const done = doneTasks.filter((t) => { const at = (t.e ?? t.u ?? t.c) * 1000; return at >= lo && at <= now + 5000 }).length
        ok(n(await tileValue(p, 'tasks')) === done, `${label}: Tasks done = done tasks ticked in the range (their Activity line, else their last change)`, `${await tileValue(p, 'tasks')} vs ${done}`)
        ok(first(await tileHelp(p, 'tasks')) === num(`select count(*) from lead_tasks t left join leads l on l.id = t.lead_id where (t.lead_id is null or l.deleted_at is null) and ${w('t.created_at')}`), `${label}: …of the tasks added in it`)
        ok(n(await tileValue(p, 'tickets')) === num(`select count(*) from project_tickets where coalesce(resolved_at, closed_at) is not null and ${w('coalesce(resolved_at, closed_at)')}`), `${label}: Tickets resolved = resolved or closed in the range`)
        ok(n(await tileValue(p, 'updates')) === num(`select count(*) from project_updates u join projects j on j.id = u.project_id join leads l on l.id = j.lead_id where u.status = 'published' and u.deleted_at is null and j.deleted_at is null and l.deleted_at is null and ${w('u.published_at')}`), `${label}: Site updates = the Dashboard’s published updates, in the range`)
        ok(n(await tileValue(p, 'chats')) === num(`select count(*) from hangout_meetings where status = 'completed' and ended_at is not null and ${w('ended_at')}`), `${label}: Hangout chats = chats held at a Hangout in the range`)
        ok(n(await tileValue(p, 'portalSignIns')) === num(`select count(*) from portal_sessions where kind = 'client' and ${w('created_at')}`), `${label}: Portal sign-ins = clients’ portal sessions started in the range`)
        ok(n(await tileValue(p, 'issues')) === num(`select count(*) from project_tickets where raised_kind = 'client' and ${w('created_at')}`), `${label}: Tickets raised = tickets clients raised in the range`)
        ok(n(await tileValue(p, 'messages')) === num(`select (select count(*) from project_messages where author_kind = 'client' and channel = 'client' and deleted_at is null and ${w('created_at')}) + (select count(*) from lead_messages where author_kind = 'client' and deleted_at is null and ${w('created_at')})`), `${label}: Messages = what clients wrote, in the range`)
        ok(n(await tileValue(p, 'choices')) === num(`select count(*) from project_selections where chosen_by = 'client' and chosen_at is not null and deleted_at is null and ${w('chosen_at')}`), `${label}: Choices made = choices clients made, in the range`)
        if (days === 30) await shot(p, 's39-health-30-1440')
      }
    }

    // ── 3 · the same count on its own page: the doors ────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · each figure is the one its own page shows — the doors')
      await go(p, '/company/reports/health?range=30', 1800)
      ok((await p.getByTestId('studio-health').getAttribute('data-range')) === '30', 'the address’s range opens the page on it')
      const leads = n(await tileValue(p, 'leads'))
      await p.getByTestId('health-tile-leads').click(); await p.waitForURL(/\/company\/reports\/leads/); await settle(p, 1600)
      ok(new URL(p.url()).searchParams.get('range') === '30', 'Leads added opens Reports › Leads on the same range')
      const cap = await p.getByTestId('insights-range').getAttribute('data-tip') ?? ''   // (the calm UI build 2026-10-27, a deliberate change) the count rides the period pill's tooltip (W-519)
      ok(n(cap.split('·')[1]) === leads, `Reports › Leads says the same: “${cap}”`)
      ok(/Period: Last 30 days/.test(await p.getByTestId('insights-range-chips').innerText()), '…its period pill on Last 30 days')
      /* (S42 audit C-21, call C·3 — a deliberate change of this rule) another Reports tab opens as the strip does: no L2 Back — the browser's Back */
      ok(await p.getByRole('link', { name: /^Back to/ }).count() === 0 && !/[?&]from=/.test(p.url()), 'Reports › Leads opens as a tab of the same page — no L2 Back, no ?from=')
      await p.goBack()
      await p.waitForURL(/\/company\/reports\/health/); await settle(p, 1400)
      ok(new URL(p.url()).searchParams.get('range') === '30' && (await p.getByTestId('studio-health').getAttribute('data-range')) === '30', 'Back returns to Studio health on the same range')
      for (const [label, days] of [['Last 90 days', 90], ['Last 12 months', 365]]) {
        await pickRange(p, label)
        const started = n(await tileValue(p, 'projects')), completed = first(await tileHelp(p, 'projects'))
        await p.getByTestId('health-tile-projects').click(); await p.waitForURL(/\/company\/reports\/projects/); await settle(p, 1600)
        ok(n(await p.getByTestId('tile-started').locator('[class*="__value"]').innerText()) === started && n(await p.getByTestId('tile-completed').locator('[class*="__value"]').innerText()) === completed,
          `${label}: Projects started ${started} · ${completed} completed = Reports › Projects’ tiles on the same range`)
        ok(new URL(p.url()).searchParams.get('range') === String(days), `…opened with ?range=${days}`)
        await p.goBack(); await settle(p, 1400)
      }
      await go(p, '/company/reports/health', 1600)
      const activeTotal = (await tileValue(p, 'active')).split(' of ')[1]
      await p.getByTestId('health-tile-active').click(); await p.waitForURL(/\/company\/members/); await settle(p, 1600)
      ok(String(await p.getByTestId('member-row').count()) === activeTotal, `Active members’ “of ${activeTotal}” = Company › Members’ active members`)
      /* AI runs: Plan › Usage's "Times used" — on all time against its last 6 months, when every charge falls inside them */
      await go(p, '/company/reports/health?range=all', 1600); await showAll(p)
      const runsAll = n(await tileValue(p, 'ai'))
      await go(p, '/company/plan?range=6m', 1800)
      const times = (await p.getByTestId('usage-tools').locator('[role="cell"][data-col="times"]').allInnerTexts()).reduce((s, t) => s + n(t), 0)
      const since = (await p.getByTestId('usage-window').innerText().catch(() => '')).trim()
      const oldest = num(`select min(${ms('created_at')}) from credit_ledger where reason = 'spend'`)
      const sixAgo = Date.now() - 150 * DAY
      if (oldest >= sixAgo) ok(times === runsAll, `AI runs (all time, ${runsAll}) = Plan › Usage’s Times used over its last 6 months (${since})`, `${times}`)
      else ok(times <= runsAll, `AI runs (all time) holds Plan › Usage’s last 6 months (${times})`)
      /* Qanvast Ops › Studios: what clients did on the portal in its last 30 days = Studio health's Your clients on 30 days */
      await go(p, '/qanvast-ops/studios', 1800)
      const ops = {}
      for (const k of ['signins', 'issues', 'messages', 'choices']) ops[k] = n(await p.getByTestId(`qanvast-usage-${k}`).locator('[class*="__value"]').innerText().catch(() => 'NaN'))
      await go(p, '/company/reports/health?range=30', 1600); await showAll(p)
      const mine = { signins: n(await tileValue(p, 'portalSignIns')), issues: n(await tileValue(p, 'issues')), messages: n(await tileValue(p, 'messages')), choices: n(await tileValue(p, 'choices')) }
      ok(JSON.stringify(ops) === JSON.stringify(mine), `Your clients (30 days) = Qanvast Ops › Studios’ usage — one rule`, `${JSON.stringify(ops)} vs ${JSON.stringify(mine)}`)
      /* plain tiles stay plain; the doors open with the way back */
      ok(await p.getByTestId('health-tile-signIns').evaluate((e) => e.tagName) === 'DIV' && await p.getByTestId('health-tile-tickets').evaluate((e) => e.tagName) === 'DIV', 'a figure with no list of its own is a plain tile')
      const href = await p.getByTestId('health-tile-quotes').getAttribute('href')
      ok(/^\/quotes\?from=%2Fcompany%2Freports%2Fhealth%3Frange%3D30/.test(href || ''), 'Quotes sent opens Tools › Quotes with the way back', href)
    }

    // ── 4 · Over time ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Over time — the house chart')
      for (const [range, every, kind] of [['30', /^Each day/, 'day'], ['90', /^Each week, from Monday/, 'week'], ['365', /^Each month/, 'month']]) {
        await go(p, `/company/reports/health?range=${range}`, 1600); await showAll(p)   // (the calm UI build 2026-10-27, a deliberate change) the AI tile is under Show all figures (5-22)
        const t = p.getByTestId('health-trend')
        ok(await t.getByTestId('insight-chart').isVisible(), `${range} days: the chart (the house ArticleChart)`)
        ok(every.test(await t.locator('figcaption').innerText().then((s) => s.split('\n')[1] ?? '')), `…one point a ${kind}`)
        ok((await t.locator('[aria-label="Series"] li').allInnerTexts()).join(' · ') === 'Active members · AI uses' /* (the calm UI build 2026-10-27, a deliberate change) 5-22 · T-01: "AI uses", as the tile */, '…two series: Active members · AI uses')
        await t.getByTestId('insight-chart-numbers').click(); await settle(p, 400)
        const rowsT = await t.getByTestId('insight-chart-table').locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => Number(td.textContent.replace(/[^0-9.-]/g, '')))))
        const aiSum = rowsT.reduce((s, r) => s + (r[1] || 0), 0)
        ok(aiSum === n(await tileValue(p, 'ai')), `…its AI runs add up to the tile (${aiSum})`)
        const staff = n((await tileValue(p, 'active')).split(' of ')[1])
        ok(rowsT.length > 1 && rowsT.every((r) => r[0] <= staff), '…and no point counts more people than the studio has')
      }
      await shot(p, 's39-trend-1440')
    }

    // ── 5 · By team member ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · By team member — the listing’s model')
      await go(p, '/company/reports/health', 1600)
      const table = p.getByTestId('health-members')
      const heads = (await table.locator('[role="columnheader"]').allInnerTexts()).map((h) => h.trim().toLowerCase())
      ok(/^member · last active · days active · ai (runs|uses) · quotes sent · tasks done · site updates$/.test(heads.join(' · ')), 'the columns, Sign-ins off until switched on', heads.join(' · '))   // (the calm UI build 2026-10-27, a deliberate change) AI uses once B1's model lands (5-22)
      ok(await table.locator('[role="row"][data-testid="health-member-row"]').count() === num(`select count(*) from members where is_active = 1`), 'a row for every active member — the idle too')
      const now = Date.now(), lo = now - 90 * DAY
      const daneDays = num(`select count(distinct date(at / 1000, 'unixepoch', 'localtime')) from (${ACTS_SQL}) where m = 'dane' and at >= ${lo} and at <= ${now + 5000}`)
      const dane = table.locator('[role="row"]').filter({ hasText: 'Dane' }).first()
      ok(n(await dane.locator('[data-col="days"]').innerText()) === daneDays, `Dane’s Days active = the days the records name him (${daneDays})`)
      ok(n(await dane.locator('[data-col="ai"]').innerText()) === num(`select count(*) from credit_ledger where reason = 'spend' and member_id = 'dane' and ${ms('created_at')} >= ${lo}`), 'Dane’s AI runs = his charges')
      ok(n(await dane.locator('[data-col="quotes"]').innerText()) === num(`select count(*) from quotes q join leads l on l.id = q.lead_id where q.kind = 'quote' and q.deleted_at is null and l.deleted_at is null and q.created_by = 'dane' and ${ms('q.client_sent_at')} >= ${lo}`), 'Dane’s Quotes sent = his quotes (as Creator) that went to the client')
      const idle = json(`select id, name from members m where is_active = 1 and not exists (select 1 from (${ACTS_SQL}) a where a.m = m.id and a.at >= ${lo})`)
      for (const i of idle) ok(n(await table.locator('[role="row"]').filter({ hasText: i.name }).first().locator('[data-col="days"]').innerText()) === 0, `${i.name} did nothing in the range — the row says 0 days`)
      /* Column settings: Sign-ins */
      await p.getByRole('button', { name: 'Column settings' }).first().click(); await settle(p, 600)
      const drawer = p.getByRole('dialog').last()
      ok(/Sign-ins/.test(await drawer.innerText()), 'Column settings offers Sign-ins')
      const sw = drawer.getByRole('switch', { name: /Sign-ins/ })
      await sw.locator('xpath=ancestor::label[1]').click().catch(async () => { await sw.click({ force: true }) }); await settle(p, 500)
      await drawer.getByRole('button', { name: 'Done' }).click().catch(() => {}); await settle(p, 500)
      const heads2 = (await table.locator('[role="columnheader"]').allInnerTexts()).map((h) => h.trim().toLowerCase())
      ok(heads2.includes('sign-ins'), 'switched on, the Sign-ins column shows (1.0’s sessions per member)', heads2.join(' · '))
      if (heads2.includes('sign-ins')) ok(n(await dane.locator('[data-col="signIns"]').innerText()) === num(`select count(*) from studio_sessions where member_id = 'dane' and ${ms('started_at')} >= ${lo}`), '…Dane’s sign-ins = his sign-ins in the range')
      await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (/studio-health-members/.test(k)) localStorage.removeItem(k) })
      await shot(p, 's39-members-1440')
    }

    // ── 6 · Export · Maison AI · nothing tracked ────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Export, Maison AI, and nothing new tracked')
      await go(p, '/company/reports/health', 1600)
      await p.getByTestId('health-export').click(); await settle(p, 500)
      const dlg = p.getByRole('dialog', { name: 'Export Studio health' })
      ok(await dlg.isVisible(), 'Export opens the house Export dialog')
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), dlg.getByRole('button', { name: /^(Export|Download)/ }).last().click()])
      if (dl) {
        const file = path.join(dir, 'export.csv'); await dl.saveAs(file).catch(() => {})
        const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
        ok(/Studio health/.test(body) && /By (team )?member/.test(body) && /Active members/.test(body),   /* (the calm UI build 2026-10-27, a deliberate change) 5-41 */ 'the sheet holds the page’s figures and the table', dl.suggestedFilename())
      } else ok(false, 'a file downloads')
      await settle(p, 800)
      await p.getByRole('button', { name: 'Maison AI' }).first().click(); await settle(p, 800)
      const ask = p.getByRole('button', { name: 'Who hasn’t used OpenMaison lately?' }).first()
      ok(await ask.isVisible(), 'Maison AI offers “Who hasn’t used OpenMaison lately?”')
      await ask.click(); await settle(p, 900)
      const ans = await p.locator('[role="dialog"]').last().innerText().catch(() => '')
      const idle = num(`select count(*) from members m where is_active = 1 and not exists (select 1 from (${ACTS_SQL}) a where a.m = m.id and a.at >= ${Date.now() - 90 * DAY})`)
      ok(idle ? new RegExp(`${idle} members? (did nothing|not active)`).test(ans) : /Everyone (did something|was active)/.test(ans), '…answered from the report on screen'   /* (the calm UI build 2026-10-27, a deliberate change) W-075 */, ans.split('\n').slice(0, 3).join(' / '))
      await p.keyboard.press('Escape'); await settle(p, 400)
      ok(sql(`select group_concat(name) from sqlite_master where type = 'table' and (name like '%usage%' or name like '%page_view%' or name like '%rollup%')`) === usageTablesBefore, 'no usage, page-view or rollup table exists or appears')
      ok(num(`select (select count(*) from studio_sessions) + (select count(*) from portal_sessions) + (select count(*) from lead_events)`) === rowsBefore, 'reading the page writes no record')
    }

    // ── 7 · who may, and ⌘K ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Owners and Admins — everyone else meets the gate; ⌘K')
      for (const [who, sees] of [['huimin', true], ['germaine', false], ['james', false], ['priya', false]]) {
        as(who)
        await go(p, '/company/reports/health', 1600)
        const has = await p.getByTestId('studio-health').count()
        ok(sees ? has === 1 : has === 0, `${who}: ${sees ? 'reads Studio health' : 'never sees the figures'}`)
        if (!sees && who !== 'priya') ok(/Studio health is for Owners and Admins/.test(await p.getByTestId('health-gate').innerText().catch(() => '')), `${who}: the tab’s gate says whose it is`)
        if (who === 'priya') ok(has === 0 && !/Active members/i.test(await p.locator('main').innerText().catch(() => '')), 'priya (Accounting): no figure reaches her')
        if (who === 'germaine') await shot(p, 's39-gate-designer-1440')
      }
      for (const [who, finds] of [['dane', true], ['germaine', false]]) {
        as(who)
        const c = await b.newContext(opts()); const q = await page(c, `k-${who}`)   // a browser of its own: ⌘K's recents are per browser
        await go(q, '/leads', 1200)
        await q.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(q, 600)
        await q.keyboard.type('studio health'); await settle(q, 1400)
        const hit = await q.getByRole('option').filter({ hasText: 'how the team and its clients use OpenMaison' }).count()
        ok(finds ? hit > 0 : hit === 0, `${who}: ⌘K ${finds ? 'finds' : 'doesn’t offer'} Studio health`)
        await c.close()
      }
      as('dane')
    }

    // ── 8 · R123 — the demo's past sign-ins ──────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · R123 — the sign-ins the demo’s history implies')
      const trail = num(`select count(*) from studio_sessions where id like 'ss-trail-%'`)
      ok(trail > 0, `the demo’s past has its members’ sign-ins (${trail})`)
      ok(num(`select count(*) from studio_sessions where id like 'ss-trail-%' and (ended_at is null or ended_reason <> 'signed-out')`) === 0, 'none is live — every one signed out')
      const days = json(`select member_id m, started_at s, last_seen_at l from studio_sessions where id like 'ss-trail-%'`)
      const acts = json(`select m, at from (${ACTS_SQL}) where m in (select id from members) and m not in ('')`).filter((a) => a.at)
      const actDays = new Set(acts.map((a) => { const d = new Date(Number(a.at)); return `${a.m}:${d.toDateString()}` }))
      ok(days.every((d) => actDays.has(`${d.m}:${new Date(Number(d.l)).toDateString()}`)), 'each on a day its member did something')
      ok(days.every((d) => Number(d.l) >= Number(d.s) && Number(d.l) - Number(d.s) <= DAY), '…and each within its 24 hours')
      const portal = json(`select homeowner_id c, created_at s, expires_at e from portal_sessions where id like 'ps-trail-%'`)
      ok(portal.length > 0 && portal.every((x) => Number(x.e) - Number(x.s) === 30 * 86400), `clients’ portal sign-ins, 30 days each (${portal.length})`)
    }

    // ── 9 · S40 — a Public profile's Known for opens its preferences ────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · S40 — the Public profile is whole: years, Known for, work — and Known for is editable by its owner')
      as('germaine')
      await go(p, '/company/members/germaine/profile', 1800)
      const card = p.getByTestId('card-preview-card')
      ok(/years in interior design/.test(await card.innerText()) && await card.getByTestId('known-for').count() === 1,   // (the calm UI build 2026-10-27, a deliberate change) Known for is a line of words now (5-24)
         'her card shows her years and what she is known for')
      ok(await card.getByTestId('work-tile').count() > 0, '…and her work, with pictures')
      const link = p.getByTestId('card-known-edit')
      ok(await link.count() === 1, 'her own profile links to her lead preferences (it was a link for Owners and Admins only)')
      await link.click(); await p.waitForURL(/\/company\/members/); await settle(p, 2200)
      ok(!new URL(p.url()).searchParams.has('prefs'), 'Members drops the ask from the address')
      const dlg = p.getByRole('dialog').last()
      ok(await dlg.isVisible() && /Specialty/.test(await dlg.innerText()), 'the Preferences dialog lands open on Members, with the specialty')
      ok(await dlg.getByLabel('Specialty').inputValue() === sql(`select specialty from members where id = 'germaine'`), '…her own specialty in it')
      await shot(p, 's40-prefs-landing-1440')
      await dlg.getByRole('button', { name: /Cancel|Close/ }).first().click(); await settle(p, 600)
      await p.getByRole('link', { name: /^Back/ }).first().click().catch(async () => { await p.goBack() })
      await p.waitForURL(/\/profile/); await settle(p, 1200)
      ok(/\/company\/members\/germaine\/profile/.test(p.url()), 'Back returns to her Public profile')
      await go(p, '/company/members/dane/profile', 1600)
      ok(await p.getByTestId('card-known-edit').count() === 0, 'a teammate’s profile she only reads offers no door')
      as('dane')
      await go(p, '/company/members/germaine/profile', 1600)
      ok(await p.getByTestId('card-known-edit').count() === 1, 'an Owner opens anyone’s preferences from their profile')
      await go(p, '/company/members?prefs=priya', 2200)
      ok(await p.getByRole('dialog').count() === 0, 'no preferences for Accounting (on no lead): the ask opens nothing')
    }

    // ── 10 · widths ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · 390 · 320 · 768 touch — no sideways scroll, Export inside the screen, phone cards')
      for (const [w, h] of [[390, 844], [320, 640], [768, 1024]]) {
        const c = await b.newContext(phoneOpts(w, h)); const q = await page(c, `w${w}`)
        await go(q, '/company/reports/health', 1800)
        ok(await q.evaluate(() => document.documentElement.scrollWidth - screen.width) <= 0, `${w}: no sideways scroll (against screen.width)`)
        for (const [url, id] of [['/company/reports/health', 'health-export'], ['/company/reports/leads', 'insights-export'], ['/company/reports/meetings', 'meeting-report-export'], ['/company/reports/projects', 'project-insights-export']]) {
          if (url !== '/company/reports/health') await go(q, url, 1400)
          const r = await q.getByTestId(id).evaluate((e) => { const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, sw: screen.width } }).catch(() => null)
          ok(r && r.l >= 0 && r.r <= r.sw, `${w}: ${url.split('/').pop()}’s Export inside the screen (the bar’s bug fix)`, r ? `${Math.round(r.l)}–${Math.round(r.r)} of ${r.sw}` : 'missing')
        }
        if (w === 390) {
          await go(q, '/company/reports/health', 1600)
          const row = q.getByTestId('health-member-row').first()
          const after = await row.evaluate((e) => getComputedStyle(e, '::after').content)
          ok(after === 'none' || after === 'normal', '390: a member card draws no rule across its top (the core’s row rule steps aside)', after)
          await shot(q, 's39-health-390', true)
          await go(q, '/company/reports/health?range=30', 1600)
          await shot(q, 's39-health-30-390')
        }
        if (w === 320) await shot(q, 's39-health-320', true)
        await c.close()
      }
    }

    // ── 11 · the ghost draws the page ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · the ghost — the page’s own layout, first screen')
      for (const [label, o] of [['1440', opts()], ['390 touch', phoneOpts()]]) {
        const m = await measure(b, o, '/company/reports/health', ['studio-health-report.', 'stat-tile.', 'chart.', 'insights-view.'], 30, 1)
        if (m.none) { ok(false, `${label}: the held reveal shows the ghost over the page`); continue }
        const off = m.rows.filter((r) => Math.abs(r.dy) > 2 || Math.abs(r.dx) > 2)
        ok(off.length === 0, `${label}: every block of the first screen lands where its ghost stood (±2 px, ${m.rows.length} measured)`, off.slice(0, 6).map((r) => `${r.k}#${r.i} ${r.dx},${r.dy}`).join(' · '))
        ok(m.words.length === 0, `${label}: the ghost’s words are the page’s`, m.words.slice(0, 3).join(' · '))
      }
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
    await ctx.close()
  } finally {
    as('dane')
    await b.close()
  }
  console.log(`\n${pass} / ${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
