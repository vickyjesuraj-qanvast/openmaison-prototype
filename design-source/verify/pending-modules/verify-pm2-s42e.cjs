// S42E · outside the studio and Qanvast — the fixes for audit E (s42/audit-E.md E-01…E-21) and its calls E·1…E·5, each asserted as the rule it
// sets (never a count another step can change):
//  - E·1 · E-01…E-04  the website says what 2.0 does: no live listening / transcription, no "think", no "Ask anything", no "20+ AI", no
//                     "photorealistic", Upload a quote reads "a spreadsheet or a PDF"; the co-pilot's grid wears icons (its picture was a recording)
//  - E-18             Book a demo's four fields carry the house's required mark; the hub's footnote is the house sentence
//  - E-06             Request reviews: a client whose review is on record says so and starts unticked; one who hasn't is ticked
//  - E-16             the Reviews view chip names the view only — the waiting count is on Show
//  - E·2              an Admin reads Reviews, replies and Requests reviews; Lead credits stays the Owner's
//  - E-07 · E-08      Lead credits' closures footnote says the stand-in's rule; a chart showing its numbers grows alone
//  - E-09             the house gate names the Marketplace, Market Insights and Meetings (never "This page")
//  - E-10             a featured brand's deal steps aside on a phone; a deal on its own wraps (no "12…")
//  - E·3 · E-11 · E-12 · E-19 · E-20  a Hangout chat's End offers the lead's next stage by the studio's rule (Contacted under one-stage-at-a-time,
//                     Met under Flexible, Lost with its reason when dropped), the met-already brief, the why-line for who can't run the chats,
//                     the homeowner's initials on the card, the "Hangouts" crumb
//  - E-13             the sketch page's loader draws the sketch page (one sample, its own words)
//  - E-14             a trial photo's landing names the leads and quote that came too, with Open Leads
//  - E-15             1.0's /qanvast-ops/portfolio · complaints · promote land where their jobs live
//  - E-17             an article's byline in the house date; the sample articles' prose in curly quotes
//  - E-21             Listed on Qanvast's play half only for those who play; the trial's title ring off the line under it
//  - E·5              Demo Studio wears its own logo (R170) — the brand kit, the public Hangout page
//  - widths: 390 / 320 no sideways scroll on the pages touched; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3185 NODE_PATH=<repo>/node_modules node verify-pm2-s42e.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42e')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3185'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s42e-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const houseDate = (ms) => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` }
const TODAY = 'hge-qh-2026-marina'
/* one transparent pixel — a picture the Visualizer's welcome takes (E-14) */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

async function hop(url) {
  const r = await fetch(new URL(url, BASE).toString(), { redirect: 'manual', headers: { accept: 'text/html' } })
  return { status: r.status, location: r.headers.get('location') }
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1300) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const all = (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' '); if (re.test(all)) return all; await p.waitForTimeout(150) } return snackText(p) }
  const search = async (p, q) => {
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type(q, { delay: 20 }); await settle(p, 900)
    return p.getByRole('dialog', { name: /search/i }).or(p.locator('[data-global-search]')).first()
  }
  const chat = (p, name) => p.locator('[data-card="hangout-chat"]').filter({ has: p.getByTestId('chat-name').filter({ hasText: name }) })

  try {
    as('dane')

    // ── 1 · The website says what 2.0 does (E·1 · E-01 … E-04) ─────────────────────────────────────────────────────────────────────────
    console.log('1 · The website says what 2.0 does')
    {
      const ctx = await desk(); const p = await page(ctx, 'site')
      const PAGES = ['/site', '/site/platform', '/site/platform/meeting-copilot', '/site/platform/maison-ai', '/site/platform/upload-a-quote', '/site/platform/visualizer',
        '/site/platform/space-planner', '/site/changelog', '/site/blog/open-maison-vs-houzz-pro', '/site/blog/ai-meeting-copilot-design-sales',
        '/site/blog/interior-design-studio-tech-stack-2026', '/site/blog/ai-transforming-interior-design']
      const CLAIMS = [[/real[- ]time (streaming )?transcription|live transcript|live transcription|transcribes (client )?conversations|each speaker labell?ed/i, 'live transcription'],
        [/co-?pilot (that )?listens|listens to (your|the|client)|(?<!n’t |n't |not )listen to the conversation/i, 'a co-pilot that listens'], [/think and act|analyse, think/i, '"think"'],
        [/ask anything/i, '"Ask anything"'], [/20\+ (AI|tools)|over 20 AI|20\+ AI capabilities/i, '"20+ AI"'], [/AI photorealistic|generates photorealistic|photoreal renders in|Photorealistic renders/i, '"photorealistic" renders of ours'],
        [/contractor PDF parsing|parses contractor PDFs|Upload PDF quote|line-by-line AI review/i, 'a PDF-only quote read']]
      const hits = []
      for (const url of PAGES) {
        await go(p, url, 500)
        const t = await p.locator('body').innerText()
        for (const [re, what] of CLAIMS) if (re.test(t)) hits.push(`${url}: ${what}`)
        if (/meeting-copilot|visualizer/.test(url) && /in real time/i.test(t)) hits.push(`${url}: "in real time"`)
        if (!url.startsWith('/site/blog') && /photorealistic|photoreal\b/i.test(t)) hits.push(`${url}: "photorealistic"`)   // the Journal may speak of the trade's renders
      }
      ok(hits.length === 0, `no page claims what 2.0 doesn’t do${hits.length ? ` — ${hits.join(' · ')}` : ''}`)
      await go(p, '/site')
      const results = await text(p.locator('section[aria-label="Results"]'))
      ok(/30s quote read/.test(results) && /every line’s margin/.test(results) && /AI in every module/.test(results) && !/20\+/.test(results), 'Home › Results: figures 2.0 can back (a quote read, AI in every module — no "20+")', results.slice(0, 200))
      await shot(p, '01-home-results-1440')
      await go(p, '/site/platform/meeting-copilot')
      const caps = p.getByTestId('module-capabilities')
      ok(await caps.locator('img').count() === 0 && /Notes in, brief out/.test(await text(caps)) && !/Live transcript/.test(await text(caps)), 'Meeting Copilot: "Notes in, brief out" for "Live transcript", the grid wearing its icons (its picture showed a recording)')
      ok(/reads your notes as you type/.test(await p.locator('main').innerText()), '…its line: the co-pilot reads your notes as you type')
      await shot(p, '01-copilot-1440', true)
      await go(p, '/site/platform/upload-a-quote')
      ok(/a spreadsheet or a PDF/.test(await p.locator('main').innerText()), 'Upload a quote: "a spreadsheet or a PDF" (S42B reads PDFs by rule — B·4)')
      await go(p, '/site/platform/maison-ai')
      ok(/offers the next step for you to confirm/.test(await p.locator('main').innerText()), 'Maison AI: answers from your records, the next step for you to confirm')
      await go(p, '/site/platform')
      const hub = await p.locator('main').innerText()
      ok(/Answers your questions and does the next step when you say so/.test(hub) && /Turns your meeting notes into a brief/.test(hub), 'the hub’s matrix: AI and Meetings said as they are')
      const foot = await text(p.getByTestId('hub-closing-free'))
      ok(/^Free to start · No card needed\./.test(foot), `the hub’s footnote is the house sentence (E-18) — "${foot}"`)
      const llms = await (await fetch(BASE + '/llms.txt')).text()
      ok(!/transcription|photorealistic|Turns a PDF quote/.test(llms) && /a spreadsheet or a PDF/.test(llms), 'llms.txt says the same')
      /* Book a demo: four fields, each the house's required mark */
      await go(p, '/site/platform')
      await p.getByTestId('hub-book-demo').click(); await settle(p, 700)
      const form = p.getByTestId('demo-form')
      const req = await form.locator('input[required], textarea[required], [aria-required="true"]').count()
      ok(req === 4 && (await form.innerText()).split('*').length - 1 >= 4, 'Book a demo: its four fields wear the required mark (E-18)', req)
      await shot(p, '02-book-demo-1440')
      await ctx.close()
    }

    // ── 2 · Qanvast Ops › Reviews and Lead credits (E-06 · E-16 · E·2 · E-07 · E-08) ──────────────────────────────────────────────────
    console.log('2 · Reviews and Lead credits')
    {
      const ctx = await desk(); const p = await page(ctx, 'reviews')
      await go(p, '/qanvast-ops/reviews', 1600)
      ok(!/Reviews · \d/.test(await text(p.getByTestId('qanvast-account-views'))) && /Waiting for a reply · \d/.test(await text(p.getByTestId('reviews-show'))), 'the view chip names the view; what waits is counted on Show (E-16)')
      /* a finished project whose client has reviewed, and one that hasn't yet (a project handed over yesterday — its review comes four days after) */
      const done = json(`select p.id, l.name, p.completed_at * 1000 as at from projects p join leads l on l.id = p.lead_id where p.completed_at is not null and p.deleted_at is null and l.deleted_at is null`)
      const fresh = json(`select p.id, l.name from projects p join leads l on l.id = p.lead_id where p.completed_at is null and p.deleted_at is null and l.deleted_at is null and l.phone is not null limit 1`)[0]
      sql(`update projects set completed_at = ${Math.floor((Date.now() - 86_400_000) / 1000)} where id = '${fresh.id}'`)
      await go(p, '/qanvast-ops/reviews?request=1', 1600)
      const dlg = p.getByRole('dialog', { name: 'Request reviews' })
      const rows = dlg.getByTestId('request-person')
      const reviewed = done.filter((d) => d.at + 4 * 86_400_000 <= Date.now())
      for (const r of reviewed) {
        const row = rows.filter({ hasText: r.name })
        ok(/Reviewed \d{1,2} [A-Z][a-z]{2} ’\d\d/.test(await text(row)) && !(await row.locator('input[type="checkbox"]').isChecked()), `${r.name} reviewed already: the row says so, unticked (E-06)`, await text(row))
      }
      const freshRow = rows.filter({ hasText: fresh.name })
      ok(await freshRow.locator('input[type="checkbox"]').isChecked() && !/Reviewed/.test(await text(freshRow)), `${fresh.name} hasn’t reviewed: ticked`)
      ok(new RegExp(`Next · 1\\b`).test(await text(dlg.getByTestId('request-next'))), 'Next counts only who is asked by default')
      await shot(p, '03-request-reviews-1440')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      sql(`update projects set completed_at = NULL where id = '${fresh.id}'`)
      await go(p, '/qanvast-ops/reviews?request=1', 1600)
      ok(await p.getByTestId('request-all-reviewed').count() === 1 && /Every finished project’s client has reviewed you/.test(await text(p.getByTestId('request-all-reviewed'))), 'everyone reviewed: the list says so')
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* Lead credits: the stand-in's rule under Closures; a chart that shows its numbers grows alone */
      await go(p, '/qanvast-ops/credits', 1600)
      ok(/Counted from your Qanvast leads that reached Won/.test(await text(p.getByTestId('closures-foot'))), 'Closures: the stand-in says the rule it counts by (E-07)')
      const charts = p.getByTestId('credits-charts')
      const h0 = await charts.locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
      await charts.getByRole('button', { name: /show the numbers/i }).first().click(); await settle(p, 600)
      const h1 = await charts.locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
      ok(h1[0] > h0[0] && h1[1] === h0[1], `the chart showing its numbers grows; its partner keeps its height (E-08) ${JSON.stringify([h0, h1])}`)
      await shot(p, '04-credits-numbers-1440', true)
      await ctx.close()
      /* E·2: Hui Min (Admin) reads Reviews, replies, Requests reviews; Lead credits stays the Owner's */
      as('huimin')
      const c2 = await desk(); const a = await page(c2, 'admin')
      await go(a, '/qanvast-ops/reviews', 1600)
      ok(await a.getByTestId('qanvast-account-gate').count() === 0 && await a.getByTestId('reviews-request').count() === 1, 'Admin: Reviews opens, with Request reviews (call E·2)')
      const waiting = a.locator('[data-testid="review-card"][data-waiting]').first()
      if (await waiting.count()) {
        await waiting.getByTestId('review-reply').click(); await settle(a, 400)
        await waiting.locator('textarea').fill('Thank you — from the studio.')
        await waiting.getByTestId('review-post').click()
        ok(/Reply kept here/.test(await waitSnack(a, /Reply kept here/)), 'Admin: a reply posts (kept here on the prototype)')
      } else ok(false, 'a review waits for a reply')
      await go(a, '/qanvast-ops/credits', 1400)
      ok(await a.getByTestId('qanvast-account-gate').count() === 1 && /Lead credits are for the studio’s Owner/.test(await text(a.getByTestId('qanvast-account-gate'))), 'Admin: Lead credits is still the Owner’s')
      const s = await search(a, 'reviews')
      ok(/Qanvast Ops · your Qanvast reviews/.test(await text(s)), 'Admin: ⌘K finds Reviews')
      await a.keyboard.press('Escape')
      await go(a, '/company/profile', 1400)
      ok(await a.getByTestId('review-qanvast-door').count() === 1, 'Admin: Company › Profile’s door to Request reviews')
      await c2.close()
      as('dane')
    }

    // ── 3 · The house gate names the place (E-09) ────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · The house gate names the place')
    {
      as('priya')
      const ctx = await desk(); const p = await page(ctx, 'gate')
      for (const [url, name] of [['/marketplace', 'Marketplace'], ['/market-insights', 'Market Insights'], ['/meetings', 'Meetings']]) {
        await go(p, url, 1200)
        const g = await text(p.getByTestId('access-gate'))
        ok(g.includes(`You don’t have access to ${name}`) && !/This page/.test(g), `${url}: the gate names ${name} (E-09)`, g.slice(0, 120))
      }
      await shot(p, '05-gate-meetings-1440')
      await ctx.close()
      as('dane')
    }

    // ── 4 · The Marketplace's deal ribbons on a phone (E-10) ─────────────────────────────────────────────────────────────────────────
    console.log('4 · The Marketplace on a phone')
    {
      const ctx = await phoneCtx(); const p = await page(ctx, 'market-390')
      await go(p, '/marketplace', 1600)
      const cards = p.getByTestId('market-brand')
      const n = await cards.count()
      let featuredWithDeal = 0, dealShown = 0, cut = 0
      for (let i = 0; i < n; i++) {
        const c = cards.nth(i)
        const featured = await c.getByTestId('brand-featured').count()
        const deal = c.getByTestId('brand-deal')
        if (!(await deal.count())) continue
        const visible = await deal.isVisible()
        if (featured && visible) featuredWithDeal++
        if (!featured && visible) { dealShown++; if (await deal.evaluate((e) => getComputedStyle(e).whiteSpace === 'nowrap')) cut++ }
      }
      ok(featuredWithDeal === 0, 'a featured brand’s deal steps aside on a phone — never "12…" beside Featured (E-10)')
      ok(dealShown === 0 || cut === 0, `a deal on its own wraps rather than ending in "…" (${dealShown} shown)`)
      ok(await sideways(p) <= 0, 'no sideways scroll at 390')
      await shot(p, '06-marketplace-390')
      await ctx.close()
    }

    // ── 5 · A Hangout chat's End offers the lead's next stage (E·3 · E-11 · E-12 · E-19 · E-20) ──────────────────────────────────────────
    console.log('5 · Hangouts — End offers the next stage')
    {
      const LIM = sql(`select lead_id from hangout_registrations where name = 'Lim Wei Ling'`), CHLOE = sql(`select lead_id from hangout_registrations where name = 'Chloe Tan'`)
      const ctx = await desk(); const p = await page(ctx, 'hangout')
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1600)
      ok(await p.getByTestId('hangout-chats-why').count() === 0, 'an Owner runs the chats — no why-line')
      const lim = chat(p, 'Lim Wei Ling')
      ok((await text(lim.locator('[class*="meetings-view-module__"][class*="__client"]'))) === 'LW', 'the card’s square is the homeowner’s own initials (E-19)')
      await lim.getByTestId('chat-start').click(); await waitSnack(p, /started/); await settle(p, 800)
      await chat(p, 'Lim Wei Ling').getByTestId('chat-end').click(); await settle(p, 500)
      const end = p.getByRole('dialog', { name: 'End the chat with Lim Wei Ling' })
      ok(await end.getByTestId('end-follow').count() === 0, 'no offer before an outcome is picked')
      await end.getByTestId('end-outcome').getByRole('radio', { name: 'Follow-up' }).click()
      await end.getByTestId('end-reason').getByRole('radio', { name: 'Site visit needed' }).click()
      await end.locator('textarea').fill('Client: keys in three months, budget about 50k.')
      const follow = end.getByTestId('end-follow')
      ok(await follow.count() === 1 && (await follow.getAttribute('data-step')) === 'contacted' && /Move Lim to Contacted/.test(await text(follow)) && await follow.locator('input[type="checkbox"]').isChecked(),
        'a kept-going chat on a New lead under one stage at a time: "Move Lim to Contacted", ticked (call E·3)', await text(follow))
      ok(/first contact — Met comes next/.test(await text(follow)), '…saying the chat becomes the first contact')
      await shot(p, '07-end-offer-1440')
      await end.getByTestId('end-save').click()
      await p.waitForURL(new RegExp(`/leads/${LIM}`), { timeout: 10000 }).catch(() => {})
      await settle(p, 1800)
      const win = p.getByRole('dialog', { name: 'Move stage' })
      ok(p.url().includes(`/leads/${LIM}`) && /from=/.test(p.url()) && await win.isVisible(), 'End lands on the lead with its Move stage window open, the way back kept', p.url())
      const winText = await text(win)
      ok(/Contacted/.test(winText) && /In person/.test(winText) && /Connected/.test(winText), '…at Contacted, the chat as its first contact log: In person, Connected', winText.slice(0, 200))
      await shot(p, '08-end-to-contacted-1440')
      await p.keyboard.press('Escape'); await settle(p, 700)
      ok(sql(`select stage from leads where id = '${LIM}'`) === 'New', 'closing the window leaves the lead where it was')
      /* E-11: the met-already brief */
      const brief = p.locator('section[aria-label="Maison AI brief"]')
      const bt = await text(brief)
      ok(/Met already · log the meeting/i.test(bt) && /Met in person on/.test(bt) && !/Call or WhatsApp within 24h/.test(bt), 'the lead’s brief: met already, not "respond fast" (E-11)', bt.slice(0, 200))
      await shot(p, '09-met-brief-1440')
      await brief.getByRole('button', { name: 'Log the meeting' }).first().click(); await settle(p, 1500)
      ok(await p.getByRole('dialog', { name: 'Move stage' }).isVisible() && /In person/.test(await text(p.getByRole('dialog', { name: 'Move stage' }))), '…Log the meeting opens the window with the meeting as its log')
      await p.keyboard.press('Escape'); await settle(p, 600)
      /* E-20: the crumb names the section */
      const crumbs = await text(p.locator('nav[aria-label="Breadcrumb"]').first())
      ok(/^Hangouts \//.test(crumbs), 'the lead opened from a Hangout reads "Hangouts" in its crumb (E-20)', crumbs.slice(0, 120))
      /* a dropped chat: Lost, its reason carried */
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1600)
      await chat(p, 'Chloe Tan').getByTestId('chat-start').click(); await waitSnack(p, /started/); await settle(p, 800)
      await chat(p, 'Chloe Tan').getByTestId('chat-end').click(); await settle(p, 500)
      const end2 = p.getByRole('dialog', { name: 'End the chat with Chloe Tan' })
      await end2.getByTestId('end-outcome').getByRole('radio', { name: 'Dropped' }).click()
      await end2.getByTestId('end-reason').getByRole('radio', { name: 'Budget mismatch' }).click()
      const f2 = end2.getByTestId('end-follow')
      ok((await f2.getAttribute('data-step')) === 'lost' && /Mark Chloe’s lead as lost/.test(await text(f2)) && /“Budget mismatch” as the reason/.test(await text(f2)), 'a dropped chat: "Mark Chloe’s lead as lost", the reason carried', await text(f2))
      await end2.getByTestId('end-save').click()
      await p.waitForURL(new RegExp(`/leads/${CHLOE}`), { timeout: 10000 }).catch(() => {})
      await settle(p, 1800)
      const lost = p.getByRole('dialog').filter({ hasText: 'Moving to Lost' })
      ok(await lost.isVisible() && /Budget mismatch/.test(await lost.innerText()), 'End lands on the lead’s Lost window, “Budget mismatch” picked', await text(lost))
      await shot(p, '10-end-to-lost-1440')
      await lost.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 500)
      ok(sql(`select stage from leads where id = '${CHLOE}'`) === 'New', '…Cancel leaves the lead where it was')
      /* Flexible: Met is the step */
      sql(`update settings set value = '"flexible"' where key = 'stage_movement'`)
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1600)
      await chat(p, 'Rahul Menon').getByTestId('chat-start').click(); await waitSnack(p, /started/); await settle(p, 800)
      await chat(p, 'Rahul Menon').getByTestId('chat-end').click(); await settle(p, 500)
      const end3 = p.getByRole('dialog', { name: 'End the chat with Rahul Menon' })
      await end3.getByTestId('end-outcome').getByRole('radio', { name: 'Converted' }).click()
      ok((await end3.getByTestId('end-follow').getAttribute('data-step')) === 'met' && /Move Rahul to Met/.test(await text(end3.getByTestId('end-follow'))), 'under Flexible a kept-going chat offers Met, the chat as the Met log')
      await end3.getByTestId('end-follow').locator('label').first().click(); await settle(p, 200)
      ok(/The lead stays where it is/.test(await text(end3.getByTestId('end-follow'))), 'unticked, the line says the lead stays')
      await end3.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 300)
      sql(`update settings set value = '"linear"' where key = 'stage_movement'`)
      await ctx.close()
      /* E-12: a Manager not on the day's shifts is told why */
      as('james')
      const c2 = await desk(); const j = await page(c2, 'manager')
      await go(j, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1600)
      ok(/Only the designers on today’s shifts, an Owner or an Admin start and end the chats/.test(await text(j.getByTestId('hangout-chats-why'))), 'a Manager reads why there are no presses (E-12)')
      await shot(j, '11-why-manager-1440')
      await c2.close()
      as('dane')
    }

    // ── 6 · The trial's sketch ghost (E-13) and a trial photo's landing (E-14) ──────────────────────────────────────────────────────────
    console.log('6 · The trial — the sketch ghost, the landing line')
    {
      const ctx = await desk(); const p = await page(ctx, 'trial')
      /* the page's payload is held (its prefetch — the loader — let through), so the loader is what shows while it waits */
      let release
      const held = new Promise((r) => { release = r })
      await p.route(/\/site\/try\/sketch/, async (route) => {
        const h = route.request().headers()
        try { if (h['next-router-prefetch'] || route.request().resourceType() === 'document') await route.continue(); else { await held; await route.continue() } } catch { /* the navigation moved on */ }
      })
      await go(p, '/site/try', 1500)
      await p.locator('[data-testid="trial-tool-card"][data-tool="sketch"] [data-testid="trial-tool-link"]').hover(); await settle(p, 800)
      await p.locator('[data-testid="trial-tool-card"][data-tool="sketch"] [data-testid="trial-tool-link"]').click()
      await settle(p, 900)
      const ghost = p.locator('[aria-label="Loading the AI Visualizer"]')
      const gt = (await ghost.count()) ? (await ghost.textContent()) ?? '' : ''   // the ghost's words are bars — read as text, not as drawn
      const tiles = (await ghost.count()) ? await ghost.locator('[class*="__tile"]').count() : -1
      ok(/Sketch to Render/.test(gt) && /No sketch handy\? Try ours/.test(gt) && tiles === 1, `the sketch page’s loader draws the sketch page: its title, its sample head, one tile (E-13) — ${tiles} tile(s)`)
      await shot(p, '12-sketch-ghost-1440')
      release(); await p.unroute(/\/site\/try\/sketch/); await settle(p, 1500)
      const real = await p.locator('[data-testid="trial-sample"]').count()
      ok(real === 1, `…and the page shows one sample (${real})`)
      await ctx.close()
      /* a trial photo with a lead and a quote: the photo opens in the AI Visualizer, the one snackbar names the rest, with Open Leads */
      const c2 = await desk(); const v = await page(c2, 'landing')
      await go(v, '/leads', 800)
      await v.evaluate(({ px }) => {
        sessionStorage.setItem('om.trial.photo', px)
        sessionStorage.setItem('om.trial.room', JSON.stringify({ name: 'Probe living room', at: Date.now(), landed: { message: 'A lead and a quote from your free trial are in Leads', action: { label: 'Open Leads', href: '/leads' } } }))
      }, { px: PIXEL })
      await v.goto(BASE + '/visualizer?trial=1', { waitUntil: 'domcontentloaded' })
      await v.waitForURL(/\/visualizer\/[^/?]+/, { timeout: 15000 }).catch(() => {})
      const snack = await waitSnack(v, /from your free trial/, 10000)
      ok(/A lead and a quote from your free trial are in Leads/.test(snack) && /Open Leads/.test(snack), 'the photo’s design opens, and its snackbar names what else came, with Open Leads (E-14)', snack)
      await shot(v, '13-landing-snack-1440')
      const openLeads = v.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Open Leads' })
      if (await openLeads.count()) { await openLeads.first().click(); await v.waitForURL(/\/leads(\?|$)/, { timeout: 8000 }).catch(() => {}) }
      ok(/\/leads(\?|$)/.test(new URL(v.url()).pathname + new URL(v.url()).search) || new URL(v.url()).pathname === '/leads', '…Open Leads goes there', v.url())
      await c2.close()
    }

    // ── 7 · 1.0's Qanvast Ops addresses (E-15) ───────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · 1.0’s older Qanvast Ops addresses')
    for (const [from, to] of [['/qanvast-ops/portfolio', '/profile#public'], ['/qanvast-ops/complaints', '/qanvast-ops/reviews/feedback'], ['/qanvast-ops/promote', '/qanvast-ops/reviews/ranking']]) {
      const h = await hop(from)
      ok(h.status >= 300 && h.status < 400 && h.location && new URL(h.location, BASE).pathname + new URL(h.location, BASE).hash === to, `${from} → ${to} (E-15)`, h)
    }

    // ── 8 · Market Insights' words (E-17) ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Market Insights')
    {
      const art = json(`select id, published_at as at from market_insights where sample = 1 and removed_at is null and published_at <= ${Date.now()} order by published_at desc limit 1`)[0]
      const ctx = await desk(); const p = await page(ctx, 'insights')
      await go(p, `/market-insights/${art.id}`, 1500)
      const when = await text(p.getByTestId('insight-article-when'))
      ok(when.startsWith(`${houseDate(art.at)} · `), `the byline in the house date, as the list says it (E-17) — "${when}"`)
      const prose = await p.locator('article').evaluate((a) => [...a.querySelectorAll('p, li, h2, h3, blockquote, td')].map((e) => e.textContent || '').join('\n'))
      ok(!/['"]/.test(prose), 'the article’s words wear the house’s curly quotes and apostrophes')
      const bodies = json(`select id, content from market_insights where sample = 1 and removed_at is null`)
      const straight = bodies.filter((x) => /['"]/.test(x.content.replace(/```[\s\S]*?```/g, '').replace(/\]\([^)]*\)/g, ']'))).map((x) => x.id)
      ok(straight.length === 0, `every sample article’s prose on record is curly (R142 + R171)${straight.length ? ` — ${straight.join(', ')}` : ''}`)
      await shot(p, '14-insight-byline-1440')
      await ctx.close()
    }

    // ── 9 · Listed on Qanvast's line, the trial's title ring (E-21) and Demo Studio's own logo (E·5) ──────────────────────────────────
    console.log('9 · Listed on Qanvast, the trial’s ring, the studio’s logo')
    {
      as('germaine')
      const ctx = await desk(); const p = await page(ctx, 'designer')
      await go(p, '/company/profile', 1500)
      const sim = p.getByTestId('qanvast-simulated')
      ok(!(await sim.count()) || !/play/i.test(await text(sim)), 'a Designer’s Listed on Qanvast line has no play they can’t make (E-21)', await text(sim))
      await ctx.close()
      as('dane')
      const c2 = await desk(); const o = await page(c2, 'owner')
      await go(o, '/company/profile', 1500)
      const sim2 = o.getByTestId('qanvast-simulated')
      ok(!(await sim2.count()) || /play Qanvast’s answer/.test(await text(sim2)), '…an Owner’s still offers it')
      const kit = JSON.parse(sql(`select value from settings where key = 'brand'`)).kit
      ok(kit.logo === '/demo-studio/logo.svg', 'the brand kit’s logo is Demo Studio’s own (R170, call E·5)', kit.logo)
      const svg = await fetch(BASE + '/demo-studio/logo.svg')
      ok(svg.status === 200 && /svg/.test(svg.headers.get('content-type') || ''), '…its file is served')
      await go(o, '/company/templates/brand', 1500)
      ok(await o.locator('img[src="/demo-studio/logo.svg"]').count() >= 1, 'the brand kit shows it')
      await shot(o, '15-brand-logo-1440')
      const pageTok = sql(`select page_token from hangout_participations where event_id = '${TODAY}'`)
      const pub = await c2.newPage(); pub.on('pageerror', (e) => errors.push(`hangout-public: ${String(e).slice(0, 200)}`))
      await pub.goto(`${BASE}/hangout/${pageTok}`, { waitUntil: 'networkidle' }); await settle(pub, 1000)
      ok(await pub.locator('img[src="/demo-studio/logo.svg"]').count() >= 1 && await pub.locator('img[src="/figma-assets/logo.svg"]').count() === 0, 'the public Hangout page wears the studio’s logo, never OpenMaison’s mark')
      await shot(pub, '16-hangout-public-logo-1440')
      /* the trial's quote title: its focus ring off the line under it */
      await go(o, '/site/try/upload-a-quote', 1200)
      await o.getByTestId('trial-quote-sample').click()
      await o.getByTestId('trial-quote-read-title').waitFor({ timeout: 10000 }).catch(() => {})
      await settle(o, 800)
      const ring = await o.evaluate(() => {
        const t = document.querySelector('[data-testid="trial-quote-read-title"]')
        if (!t) return null
        /* the ring's own rule (it shows only on :focus-visible): its width and offset, read from the stylesheet */
        const cls = [...t.classList].find((c) => /__landing$/.test(c))
        let rule = null
        for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules } catch { continue } for (const x of rs) if (x.selectorText && cls && x.selectorText.includes(cls) && x.selectorText.includes(':focus-visible')) rule = x }
        if (!rule) return { none: true }
        const px = (v) => { const d = document.createElement('div'); d.style.width = v; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); return w }
        const r = t.getBoundingClientRect(), next = t.nextElementSibling?.getBoundingClientRect()
        return { offset: px(rule.style.outlineOffset || '0px'), width: px(rule.style.outlineWidth || getComputedStyle(t).getPropertyValue('--om-border-2') || '2px'), bottom: r.bottom, nextTop: next ? next.top : null }
      })
      ok(ring && !ring.none && (ring.nextTop === null || ring.bottom + ring.offset + ring.width <= ring.nextTop + 0.5), 'the trial’s title ring hugs it — the line under it stays clear (E-21)', ring)
      await shot(o, '17-trial-title-ring-1440')
      await c2.close()
    }

    // ── 10 · Widths and the page log ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · 390 / 320 and the page log')
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const ctx = await phoneCtx(w, h); const p = await page(ctx, `phone-${w}`)
      const over = []
      for (const url of ['/site', '/site/platform/meeting-copilot', '/site/platform/upload-a-quote', '/marketplace', '/qanvast-ops/reviews', `/qanvast-ops/hangouts/${TODAY}?view=meetings`, '/qanvast-ops/credits']) {
        await go(p, url, 900)
        const s = await sideways(p); if (s > 0) over.push(`${url} +${s}`)
      }
      ok(over.length === 0, `no sideways scroll at ${w}${over.length ? ` — ${over.join(' · ')}` : ''}`)
      if (w === 390) { await go(p, '/site/platform/meeting-copilot', 900); await shot(p, '18-copilot-390', true); await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1200); await shot(p, '19-chats-390') }
      await ctx.close()
    }
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
