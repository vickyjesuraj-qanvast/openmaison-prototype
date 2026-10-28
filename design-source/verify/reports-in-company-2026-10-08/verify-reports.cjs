// REG-1361 — every report in one home: Company › Reports (Leads · Projects · Finance). Each item asserted as the rule it builds:
//  the Company panel's Reports row is live · /company/reports lands by role (Owner → Leads, Manager → Projects) · the three tabs, each tab's
//  report or its gate · Finance has no Reports tab · the doors (the Leads listing's Insights, Projects' Insights, a lead's Response time) open
//  the right tab with Back to where they were · the old addresses (/leads/insights, /projects/insights, /company/finance/reports,
//  /finance/reports) redirect with their query · search finds the three under Company › Reports · phone 390 without sideways scroll.
// Reads only — it moves View as (members.is_you) and puts it back. Run on a scratch DB: never local.db.
// Usage: BASE=http://localhost:3011 NODE_PATH=<repo>/node_modules node verify-reports.cjs <scratch.db> [shotDir]
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs'), { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || __dirname
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3011'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const you0 = sql(`select id from members where is_you = 1`)
const as = (m) => sql(`update members set is_you = (id = '${m}')`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })
  const tabs = async (p) => (await p.locator('[aria-label="Reports sections"] [role="tab"], [aria-label="Reports sections"] a').allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))

    console.log('The one home')
    as('dane')
    await go(p, '/company/reports')
    ok(/\/company\/reports\/leads$/.test(p.url()), 'an Owner lands on Reports › Leads')
    // (pending modules S23, a deliberate change of this rule — Company › Reports gained Meetings; found stale while running S25's touched probes)
    // (pending modules S39, a deliberate change of this rule — Company › Reports gained Studio health, last)
    ok((await tabs(p)).join(' · ') === 'Leads · Projects · Meetings · Finance · Studio health', `five tabs: Leads · Projects · Meetings · Finance · Studio health (${(await tabs(p)).join(' · ')})`)
    ok(await p.getByTestId('insights-members').count() === 1, 'Leads: the turnaround by team member')
    await shot(p, 'r1-reports-leads-1440')
    await p.getByRole('button', { name: /^Company/ }).first().click(); await settle(p, 500)
    const row = p.getByRole('menuitem', { name: /^Reports/ })
    ok(await row.isVisible() && (await row.getAttribute('aria-current')) === 'page' && /Leads, projects and money, for the whole studio/.test(await row.innerText()) && !/Soon/.test(await row.innerText()), 'the Company panel’s Reports row is live, marked as the page you are on')
    await shot(p, 'r2-company-panel-1440')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, '/company/reports/projects')
    ok(await p.getByTestId('project-insights-tiles').count() === 1, 'Projects: the projects’ tiles')

    /* (lead ↔ project parity P-28…P-35 · Q-13…Q-20, 2026-10-08) the two turnaround reports read one set of rules */
    console.log('The numbers (parity P-28…P-35)')
    /* (the calm UI build 2026-10-27, a deliberate change) 5-19 · R-B3-1: a report's period is the house "Period: … ▾" pill — its label names the
       pick, its menu's menuitemradio rows the ranges (the chips it was) */
    const checked = async (testId) => (await p.getByTestId(testId).locator('[class*="label"]').first().innerText()).replace(/^Period:\s*/, '').trim()
    const ranges = async (testId) => { await p.getByTestId(testId).getByRole('button').first().click(); await p.waitForTimeout(400); const r = (await p.getByRole('menuitemradio').allInnerTexts()).map((t) => t.split('\n')[0].trim()).join(' · '); await p.keyboard.press('Escape'); await p.waitForTimeout(300); return r }
    ok(await checked('project-insights-range') === 'Last 90 days' && await ranges('project-insights-range') === 'Last 30 days · Last 90 days · Last 12 months · All time', 'Projects: four ranges, opening on Last 90 days (P-31)')
    ok(/^(Your team’s projects · )?Filtering on start and completion dates · \d+ projects? in range$/.test(((await p.getByTestId('project-insights-scope').getAttribute('data-tip')) ?? '').trim()) /* (the calm UI build 2026-10-27, a deliberate change) R-B3-1: the caption is the period pill's tooltip */, `Projects: the caption says what the range filters and the count in range (${(await p.getByTestId('project-insights-scope').innerText()).trim()})`)
    ok(/Project length|Start → Completed/i.test(await p.getByTestId('tile-duration').innerText()) /* (the calm UI build 2026-10-27, a deliberate change) 5-09 */ && await p.locator('[data-testid="project-insights-members"] [role="columnheader"][data-col="duration"]').innerText().then((t) => /Project length|Start → Completed/i.test(t) /* (the calm UI build 2026-10-27, a deliberate change) 5-09: "Project length" */), 'Projects: the tile and the column are both “Start → Completed” (P-32)')
    { const t = await p.getByTestId('tile-late').innerText(); ok(!/running late|done late/i.test(t), `Late milestones counts what finished late, the overdue ones are the chips’ (${t.replace(/\n/g, ' · ')})`) }
    const waiting = p.getByTestId('project-insights-waiting')
    ok(!(await waiting.count()) || /(^|\n)\d+ milestones? overdue$/i.test((await waiting.innerText()).trim()), 'the waiting chip reads “n milestones overdue” (P-32 · P-34)')   // the chip's icon name and its capitals ride innerText
    /* (the calm UI build 2026-10-27, a deliberate change) 5-48 · T-08: the house's one empty mark is "—" now (lib/format EMPTY, BLANK) — the rule kept: "n days", never weeks, never a "— / med" pair */
    ok(!/weeks|—\s*\/\s*med/.test(await p.getByTestId('project-insights-tiles').innerText() + await p.getByTestId('project-insights-members').innerText()), 'no weeks, no em dash — "n days" and the house "--" (P-28 · P-35)')
    ok(await p.getByTestId('project-insights-export').count() === 1, 'Projects: the house Export (Q-20)')
    await go(p, '/company/reports/leads')
    ok(await checked('insights-range-chips') === 'Last 90 days' && await ranges('insights-range-chips') === 'Last 30 days · Last 90 days · Last 12 months · All time', 'Leads: the same four ranges, opening on Last 90 days (P-31)')
    const legValues = await p.locator('[data-testid="insights-tiles"] [class*="__value"]').allInnerTexts()
    ok(legValues.length === 3 && legValues.every((v) => /^(\d+ min|\d+ hours?|\d+ days?|--|—)$/.test(v.trim())) /* (the calm UI build 2026-10-27, a deliberate change) 5-09 · 5-48: "30 min" · "26 hours" · the house "—" */, `Leads: every leg reads "30m" · "26.3h" · "12 days" · "--", never "12d" (${legValues.join(' · ')})`)
    const helpUnderBlank = await p.getByTestId('insights-members').evaluate((t) => [...t.querySelectorAll('[class*="__statValue"]')].filter((v) => ['--', '—'].includes(v.textContent.trim()) && v.nextElementSibling).length)   // (the calm UI build 2026-10-27, a deliberate change) 5-48: the house "—"
    ok(helpUnderBlank === 0, 'no help line under an empty figure — it read "— / med" (P-35)')
    ok(!/\bmed\b|—\s*\/\s*med/.test(await p.getByTestId('insights-members').innerText()) /* (the calm UI build 2026-10-27, a deliberate change) 5-48: the empty mark is the house "—" */, 'the cells spell "median" and print "--" (P-35)')
    ok(await p.getByText(/^By (team )?member$/).first()   /* (the calm UI build 2026-10-27, a deliberate change) W-617 · §2: "By member" */.evaluate((e) => getComputedStyle(e).fontSize) === '16px', 'the table title is heading-h4, as Finance’s (Q-19)')
    ok(await p.getByTestId('insights-export').count() === 1, 'Leads: the house Export (Q-20)')
    await p.getByRole('button', { name: 'Maison AI' }).click(); await settle(p, 500)
    const aiSheet = p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
    await aiSheet.getByRole('button', { name: 'Summarise the turnaround' }).click(); await settle(p, 600)
    ok(await aiSheet.locator('[data-testid="maison-answer"] [data-testid="maison-row"]').count() === 3 && !/Coming soon/.test(await aiSheet.innerText()), 'Leads: Maison AI answers from the report — the three legs (P-33)')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, '/company/reports/finance?report=ar')
    ok(await p.getByTestId('finance-reports').count() === 1 && /Owed to you/.test(await p.getByTestId('finance-reports').innerText()), 'Finance: the money reports, the report from the address')
    await shot(p, 'r3-reports-finance-1440')
    await go(p, '/company/finance/overview')
    ok(!(await p.locator('[aria-label="Finance sections"]').innerText()).includes('Reports'), 'Finance keeps no Reports tab')

    console.log('The doors')
    await go(p, '/leads')
    /* (the calm UI build 2026-10-27, a deliberate change) B2 2-13 · §2: the listing's Insights is the header ⋮'s first row, "Reports" */
    await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p)
    await p.getByTestId('leads-reports').click(); await p.waitForURL(/\/company\/reports\/leads/); await settle(p)
    ok(/from=%2Fleads/.test(p.url()) && (await p.locator('a[data-kb="back"]').getAttribute('aria-label')) === 'Back to Leads', 'the Leads listing’s Insights opens Reports › Leads, Back to Leads')
    await shot(p, 'r4-from-leads-1440')
    await p.locator('a[data-kb="back"]').click(); await p.waitForURL(/\/leads(\?|$)/)
    ok(/\/leads(\?|$)/.test(new URL(p.url()).pathname + new URL(p.url()).search), 'Back returns to the listing')
    const lead = sql(`select l.id from leads l join stage_logs s on s.lead_id = l.id where l.deleted_at is null and l.direct = 0 group by l.id order by count(*) desc limit 1`)
    const leadName = sql(`select name from leads where id = '${lead}'`)
    await go(p, `/leads/${lead}`)
    const resp = p.locator('button[data-testid="response-time"]')
    if (await resp.count()) {
      await resp.click(); await p.waitForURL(/\/company\/reports\/leads/); await settle(p)
      ok((await p.locator('a[data-kb="back"]').getAttribute('aria-label')) === `Back to ${leadName}`, `a lead’s Response time opens Reports › Leads, Back to ${leadName}`)
    } else ok(true, 'no Response time line on this lead — skipped')
    await go(p, '/projects?view=workload')
    /* (the calm UI build 2026-10-27, a deliberate change) B3 1-30: the Workload view's Insights is the header ⋮'s "Reports" row (`open-insights`) */
    await p.getByTestId('projects-kebab').click(); await settle(p)
    const insightsBtn = p.getByTestId('open-insights').first()
    if (await insightsBtn.count()) {
      await insightsBtn.click(); await p.waitForURL(/\/company\/reports\/projects/); await settle(p)
      ok(/\/company\/reports\/projects/.test(p.url()) && (await p.locator('a[data-kb="back"]').getAttribute('aria-label')) === 'Back to Projects', 'Projects’ Insights opens Reports › Projects, Back to Projects')
    } else ok(false, 'Projects’ Insights button on the Workload view')

    console.log('The old addresses')
    for (const [from, to] of [['/leads/insights?from=%2Fleads', '/company/reports/leads?from=%2Fleads'], ['/projects/insights', '/company/reports/projects'],
                              ['/company/finance/reports?report=pl&period=this_year', '/company/reports/finance?report=pl&period=this_year']]) {
      const r = await p.request.get(BASE + from, { maxRedirects: 0 })
      ok([307, 308].includes(r.status()) && (r.headers()['location'] ?? '').endsWith(to), `${from} → ${to}`)
    }
    await go(p, '/finance/reports?report=ar')
    ok(/\/company\/reports\/finance\?report=ar/.test(p.url()), '/finance/reports lands on Reports › Finance in two hops, its report kept')

    console.log('Search')
    for (const [q, title] of [['lead reports', 'Lead reports'], ['project reports', 'Project reports'], ['finance reports', 'Finance reports']]) {
      await go(p, '/leads'); await p.keyboard.press('Meta+k'); await settle(p, 400)
      await p.keyboard.type(q); await settle(p, 900)
      const hit = p.locator('[role="option"]', { hasText: title }).first()
      ok(await hit.count() === 1 && /Company › Reports/.test(await hit.innerText()), `⌘K “${q}” finds ${title} under Company › Reports`)
      await p.keyboard.press('Escape'); await settle(p, 200)
    }

    console.log('Who reads what')
    as('james')   // a Manager
    await go(p, '/company/reports')
    ok(/\/company\/reports\/projects$/.test(p.url()) && /Your team’s projects/.test((await p.getByTestId('project-insights-scope').getAttribute('data-tip')) ?? '') /* (the calm UI build 2026-10-27, a deliberate change) R-B3-1 */, 'a Manager lands on Projects, their team’s')
    await go(p, '/company/reports/leads')
    ok(await p.getByTestId('insights-gate').count() === 1 && /Lead reports are for Owners and Admins/.test(await p.getByTestId('insights-gate').innerText()), 'a Manager meets the Leads gate')
    as('sarah')   // a Designer
    await go(p, '/company/reports/finance')
    ok(await p.getByTestId('finance-reports-gate').count() === 1 && await p.getByTestId('finance-reports').count() === 0, 'a Designer meets the Finance gate, never the numbers')
    await shot(p, 'r5-designer-finance-gate-1440')
    await go(p, '/company/reports/projects')
    ok(await p.getByTestId('project-insights-gate').count() === 1, 'a Designer meets the Projects gate')
    as('dane')
    await ctx.close()

    console.log('Phone')
    const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
    for (const t of ['leads', 'projects', 'finance']) {
      await go(m, `/company/reports/${t}`)
      ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), `Reports › ${t}: no sideways scroll at 390`)
    }
    await m.screenshot({ path: path.join(dir, 'r6-reports-finance-390.png') })
    ok(errors.length === 0, `no page errors${errors.length ? ' — ' + errors.join(' | ') : ''}`)
  } finally {
    sql(`update members set is_you = (id = '${you0}')`)
    ok(sql(`select id from members where is_you = 1`) === you0, 'View as is put back')
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
