// Pending modules, package S45A · Urban Home Design's Sales reports (H-UHD-1) + the Projects listing's three columns and the Dashboard's widgets
// (H-UHD-3) — his "build everything and complete it" 2026-10-17, built as features every studio gets (s42/sweep-newer-branches-2026-10-15.md
// §2.1; 1.0 urbanhomedemo 479480a5e · 4da810229). Each item asserted as the rule it builds, never a count another round can change:
//  - one home: Company › Reports › Leads holds two reports, Response time and Sales, picked by chips as Reports › Finance picks its own; the
//    pick and the range ride in the address; Owners and Admins read Sales, Marketing keeps Response time alone (no chips), anyone else the gate;
//    ⌘K offers the Sales report to Owners and Admins only
//  - every figure is the records' own on each range (30 · 90 · 12 months · All): Leads · Quote sent · Won · Won value (before GST, the signed
//    quote as signed or the value agreed) against SQL; the funnel, sources, members, pipeline, flow and going quiet add up to the tiles
//  - the chance of winning is read from the studio's own closed leads, and only from five or more
//  - Export holds every section; Maison AI answers from the report on screen
//  - the Dashboard's Sales and Response time tiles are the report's own figures on its opening range, each a door with ?from=/dashboard
//  - the Projects listing's Source · Signed on · Value before GST: off until Column settings turns them on, money for Owners and Admins only,
//    Value before GST = the Sales report's Won value for the same project (one rule)
//  - reading writes nothing; 390 · 320 · 768 touch with no sideways scroll against screen.width; the ghost draws the page; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. It writes only the View as flag, put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s45a.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s45a')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const num = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86_400_000
const ms = (col) => `(CASE WHEN ${col} < 100000000000 THEN ${col} * 1000 ELSE ${col} END)`
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const displayDate = (t) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}` }
const cents = (s) => Math.round(Number(String(s).replace(/[^0-9.-]/g, '')) * 100)
const n = (s) => Number(String(s).replace(/[^0-9.-]/g, '') || NaN)
const netOf = (minor, rate) => (rate ? Math.round((minor * 100) / (100 + rate)) : minor)

/* The ghost-vs-page measure (the S17 · S23 · S39 probes'): in the held reveal (PageReveal's ghost over the page, its first paint faked days away)
   every element carrying a page module's class in both, index by index after aligning the lists — the first screen only — and every Words
   sentence the ghost sets in a page class against that page's. */
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
  const tile = async (p, key, part = 'value') => (await p.getByTestId(key).locator(`[class*="__${part}"]`).first().innerText().catch(() => '')).trim()
  /* (the calm UI build 2026-10-27, a deliberate change) the report and the period are one house pill each (5-19 · 5-20): open it, pick its menuitemradio row; a folded table opens first (5-21) */
  const pickIn = async (p, id, label) => { await p.getByTestId(id).getByRole('button').first().click(); await settle(p, 450); await p.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).first().click(); await settle(p, 700) }
  const pickRange = async (p, label) => pickIn(p, 'insights-range-chips', label)
  const unfold = async (p) => { for (const id of ['sales-sources-more', 'sales-flow-more']) { const b = p.getByTestId(id); if (await b.count() && await b.first().getAttribute('aria-expanded') === 'false') { await b.first().click(); await settle(p, 400) } } }
  /** a section table's rows as { first cell, column → text } */
  const rowsOf = (p, id) => p.getByTestId(`sales-${id}-table`).locator('[role="row"]').evaluateAll((rs) => rs.slice(1).map((r) => Object.fromEntries([...r.querySelectorAll('[role="cell"]')].map((c) => [c.dataset.col, c.innerText.replace(/\s+/g, ' ').trim()]))))
  const writes = () => num(`select (select count(*) from lead_events) + (select count(*) from stage_logs) + (select count(*) from notifications) + (select count(*) from quotes) + (select count(*) from lead_tasks)`)
  const before = writes()
  const studio = JSON.parse(sql(`select value from settings where key = 'studio'`) || '{}')
  const GST = studio.gstRegistered === false ? 0 : (studio.gstPct ?? 9)

  try {
    const ctx = await b.newContext(opts())
    const p = await page(ctx, 'dane')
    as('dane')

    // ── 1 · the tab: two reports, chips, the address ─────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Company › Reports › Leads — Response time and Sales, picked by chips')
      await go(p, '/company/reports/leads', 1800)
      const chips = p.getByTestId('leads-report-chips')
      ok(await chips.isVisible(), 'an Owner’s Leads tab carries the report chips')
      await chips.getByRole('button').first().click(); await settle(p, 450)
      const reports = (await p.getByRole('menuitemradio').allInnerTexts()).map((t) => t.split('\n')[0].trim()); await p.keyboard.press('Escape'); await settle(p, 300)
      ok(reports.join(' · ') === 'Response time · Sales', 'Response time · Sales', reports.join(' · '))
      ok(/Report: Response time/.test(await chips.innerText()) && await p.getByTestId('insights-tiles').isVisible(), 'it lands on Response time — today’s page, as it was')
      await pickIn(p, 'leads-report-chips', 'Sales'); await settle(p, 500)
      ok(await p.getByTestId('sales-report').isVisible() && await p.getByTestId('insights-tiles').count() === 0, 'Sales replaces the body; the range bar stays')
      ok(/[?&]report=sales\b/.test(p.url()) && /[?&]range=90\b/.test(p.url()), 'the pick and the range ride in the address', p.url())
      const heads = await p.locator('[data-testid="sales-report"] h2').allInnerTexts()
      ok(/^By (team )?member · Where leads stop · By source · Open pipeline · Over time · Going quiet$/.test(heads.join(' · ')), '1.0’s six reports as sections, in its order — one Going quiet with its By member switch (5-21)', heads.join(' · '))
      ok(/Counts the leads added in this period · \d+ leads?/.test(await p.getByTestId('insights-range').getAttribute('data-tip') ?? ''), 'the period pill’s tooltip says what the range filters on')   // (the calm UI build 2026-10-27, a deliberate change) W-519
      await shot(p, 's45a-sales-1440', true)
      await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1400)
      ok(await p.getByTestId('sales-report').isVisible(), 'a reload keeps Sales (the address)')
      await pickRange(p, 'Last 30 days')
      ok(/[?&]range=30\b/.test(p.url()) && await p.getByTestId('sales-granularity').getByRole('radio', { name: 'By week' }).getAttribute('aria-checked').catch(() => null) === 'true', 'a range rides in the address; on 30 days the flow reads by week', p.url())
      await pickRange(p, 'Last 90 days')
      ok(await p.getByTestId('sales-granularity').getByRole('radio', { name: 'By month' }).getAttribute('aria-checked') === 'true', 'on 90 days the flow reads by month')
      await unfold(p)
      const months = (await rowsOf(p, 'flow')).length
      await p.getByTestId('sales-granularity').getByRole('radio', { name: 'By week' }).click(); await settle(p, 700)
      const weeks = (await rowsOf(p, 'flow')).length
      ok(weeks > months, `By week breaks the range into weeks (${months} months → ${weeks} weeks)`)
      ok(await p.getByTestId('sales-flow-chart').isVisible() && await p.getByTestId('sales-flow-chart').locator('[data-kind="line"]').count() === 1, 'Over time draws the house chart (one axis, two counts) above its table')
      await pickIn(p, 'leads-report-chips', 'Response time'); await settle(p, 300)
      ok(!/report=sales/.test(p.url()) && await p.getByTestId('insights-tiles').isVisible(), 'back to Response time: the address drops the report')
    }

    // ── 2 · every figure is the records' own, per range ──────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · each figure against the records, on each range')
      await go(p, '/company/reports/leads?report=sales', 1800)
      for (const [label, days] of [['Last 30 days', 30], ['Last 90 days', 90], ['Last 12 months', 365], ['All time', null]]) {
        await pickRange(p, label)
        const now = Date.now(), lo = days === null ? -1e15 : now - days * DAY
        const pop = `select * from leads where deleted_at is null and direct = 0 and ${ms('created_at')} >= ${lo}`
        const leads = num(`select count(*) from (${pop})`)
        const won = num(`select count(*) from (${pop}) where stage = 'Won'`)
        const quoted = num(`select count(*) from (${pop}) l where stage in ('Quote Sent', 'Won') or exists (select 1 from stage_logs s where s.lead_id = l.id and s.to_stage in ('Quote Sent', 'Won'))
          or exists (select 1 from quotes q where q.lead_id = l.id and q.kind = 'quote' and q.deleted_at is null and q.archived_at is null and (q.client_sent_at is not null or q.status in ('Sent to Client', 'Confirmed', 'Signed')))`)
        const open = num(`select count(*) from (${pop}) where stage not in ('Won', 'Lost')`)
        const working = num(`select count(*) from (${pop}) where stage not in ('Won', 'Lost', 'On Hold')`)
        const tag = days === null ? 'all' : String(days)
        ok(n(await tile(p, 'sales-tile-leads')) === leads, `${tag}: Leads = the leads added in the range (${leads})`)
        ok(n(await tile(p, 'sales-tile-won')) === won, `${tag}: Won = those that reached Won (${won})`)
        ok(n(await tile(p, 'sales-tile-quoted')) === quoted, `${tag}: Quote sent = those that got that far — the move, or a quote sent to the client (${quoted})`)
        /* Won value: each won lead's project as signed — the quote's signed total (else its total), else the value agreed — before GST at the
           studio's rate (every demo quote's lines carry it: no mixed rate to split); else the client's budget */
        const wonRows = json(`select l.id, l.budget_minor b, p.agreed_value_minor a, q.signed_amount_minor sa, q.amount_minor qa, q.gst_enabled g from (${pop}) l left join projects p on p.lead_id = l.id and p.deleted_at is null left join quotes q on q.id = p.quote_id where l.stage = 'Won'`)
        const mixed = num(`select count(*) from quote_items i join projects p on p.quote_id = i.quote_id where (i.gst_pct is not null and i.gst_pct <> ${GST}) or i.print_as = 'behalf'`)
        const expect = wonRows.reduce((s, r) => s + (r.qa != null ? netOf(r.sa ?? r.qa, r.g ? GST : 0) : r.a ? netOf(r.a, GST) : r.b > 0 ? r.b : 0), 0)
        if (!mixed) ok(cents(await tile(p, 'sales-tile-value')) === expect, `${tag}: Won value = the won projects as signed, before GST (${expect / 100})`, await tile(p, 'sales-tile-value'))
        else console.log(`  · ${tag}: a signed quote with mixed GST lines — the Won value's SQL check rests (${mixed})`)
        const funnel = await rowsOf(p, 'funnel')
        if (leads) {
          const counts = funnel.map((r) => n(r.leads))
          ok(funnel.map((r) => r.step).join(' · ') === 'Added · Assigned · Contacted · Met · Quote sent · Won', `${tag}: the funnel walks 2.0’s journey (Added · Assigned · Contacted · Met · Quote sent · Won)`)
          ok(counts[0] === leads && counts[4] === quoted && counts[5] === won && counts.every((c, i) => i === 0 || c <= counts[i - 1]), `${tag}: it never widens, from the leads added to the leads won`, counts.join(' › '))
          const big = funnel.filter((r) => /Biggest drop/i.test(r.dropped))
          const drops = funnel.map((r) => n(r.dropped) || 0)
          ok(big.length === (Math.max(...drops) > 0 ? 1 : 0) && (!big.length || n(big[0].dropped) === Math.max(...drops)), `${tag}: the biggest drop is named once, on the largest`)
          await unfold(p)
          const src = await rowsOf(p, 'sources')
          ok(src.reduce((s, r) => s + n(r.leads), 0) === leads && src.reduce((s, r) => s + n(r.won), 0) === won, `${tag}: by source adds up to the tiles`)
          ok(src.every((r) => n(r.leads) === num(`select count(*) from (${pop}) where ${r.source === 'No source' ? `trim(coalesce(source, '')) = ''` : `trim(source) = '${r.source.replace(/'/g, "''")}'`}`)), `${tag}: each source counts its own leads`)
          ok(src.reduce((s, r) => s + cents(r.value), 0) === cents(await tile(p, 'sales-tile-value')), `${tag}: the sources’ Won value adds up to the tile`)
          const mem = await rowsOf(p, 'members')
          const team = json(`select id, name from members`).sort((a, b) => b.name.length - a.name.length)
          const idOf = (cellText) => team.find((m) => cellText.includes(m.name))?.id
          ok(mem.length > 0 && mem.every((r) => n(r.leads) === num(`select count(*) from (${pop}) l join lead_assignees a on a.lead_id = l.id where a.member_id = '${idOf(r.member)}'`)), `${tag}: each member counts the leads they are on`)
          const flow = await rowsOf(p, 'flow')
          ok(flow.reduce((s, r) => s + n(r.added), 0) === leads && flow.reduce((s, r) => s + n(r.cohort), 0) === won, `${tag}: over time adds up — leads added, and won from them`)
        } else ok(await p.getByTestId('sales-funnel-empty').isVisible(), `${tag}: no leads — the funnel says so`)
        if (open) {
          const pipe = await rowsOf(p, 'pipeline')
          const total = pipe.find((r) => /^All open leads/.test(r.stage))
          ok(total && n(total.leads) === open && pipe.filter((r) => r !== total).reduce((s, r) => s + n(r.leads), 0) === open, `${tag}: the pipeline’s rows add up to the open leads (${open})`)
          ok(pipe.filter((r) => r !== total).every((r) => { const m = /(\d+) of (\d+) closed/.exec(r.chance); return /^\d/.test(r.chance) ? m && Number(m[2]) >= 5 : /Too few to tell|No closed lead yet/.test(r.chance) }), `${tag}: a chance of winning only from five closed leads or more — else “Too few to tell”`)
        } else ok(await p.getByTestId('sales-pipeline-empty').isVisible(), `${tag}: no open lead — the pipeline says so`)
        if (working) {
          const bands = await rowsOf(p, 'quiet')
          ok(bands.reduce((s, r) => s + n(r.leads), 0) === working, `${tag}: going quiet’s bands hold every open lead being worked — On hold left out (${working})`)
        }
      }
    }

    // ── 3 · Export · Maison AI · nothing written ─────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Export, Maison AI, and nothing written')
      await go(p, '/company/reports/leads?report=sales&range=90', 1600)
      await p.getByTestId('insights-export').click(); await settle(p, 500)
      const dlg = p.getByRole('dialog', { name: 'Export Sales report' })
      ok(await dlg.isVisible(), 'Export opens the house Export dialog, named for the report on screen')
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), dlg.getByRole('button', { name: /^(Export|Download)/ }).last().click()])
      if (dl) {
        const file = path.join(dir, 'export.csv'); await dl.saveAs(file).catch(() => {})
        const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
        ok(/Sales · Last 90 days/.test(body) && /By (team )?member/.test(body) && ['Where leads stop', 'By source', 'Open pipeline', 'Over time', 'Going quiet'].every((t) => body.includes(t)),   /* (the calm UI build 2026-10-27, a deliberate change) By member once B2's sales.ts lands (5-41) */ 'the sheet holds every section', dl.suggestedFilename())
      } else ok(false, 'a file downloads')
      await settle(p, 800)
      await p.getByRole('button', { name: 'Maison AI' }).first().click(); await settle(p, 800)
      for (const q of ['Which leads are going quiet?', 'Where do leads stop?', 'Which sources win the most?']) ok(await p.getByRole('button', { name: q }).first().isVisible(), `Maison AI offers “${q}”`)
      await p.getByRole('button', { name: 'Which leads are going quiet?' }).first().click(); await settle(p, 900)
      const sheet = p.locator('[role="dialog"]').last()
      const quiet = n((/(\d+) leads? with no contact/.exec(await p.getByTestId('sales-quiet-note').innerText().catch(() => '')) || [])[1]) || 0
      const ans = await sheet.innerText().catch(() => '')
      ok(quiet ? new RegExp(`${quiet} leads? with no contact for over 30 days`).test(ans) : /No open lead has gone 30 days/.test(ans), '…answered from the report on screen', ans.split('\n').slice(0, 2).join(' / '))
      await sheet.getByTestId('maison-row').filter({ hasText: /last contact|never contacted/ }).first().click().catch(() => {})
      await p.waitForURL(/\/leads\/[^/?]+/, { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
      const u = new URL(p.url())
      ok(/^\/leads\/[^/]+$/.test(u.pathname) && /report=sales/.test(u.searchParams.get('from') ?? ''), 'a lead in the answer opens with the way back to the Sales report', p.url())
      ok(writes() === before, 'reading the reports writes no record')
    }

    // ── 4 · who may, and ⌘K ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Owners and Admins read Sales; Marketing keeps Response time; anyone else the gate; ⌘K')
      for (const [who, sees] of [['huimin', 'sales'], ['nurul', 'response'], ['germaine', 'gate'], ['james', 'gate'], ['priya', 'none']]) {
        as(who)
        await go(p, '/company/reports/leads?report=sales', 1600)
        const chips = await p.getByTestId('leads-report-chips').count(), sales = await p.getByTestId('sales-report').count()
        if (sees === 'sales') ok(chips === 1 && sales === 1, `${who}: reads Sales`)
        if (sees === 'response') ok(chips === 0 && sales === 0 && await p.getByTestId('insights-tiles').isVisible(), `${who} (Marketing): Response time alone — no chips, ?report=sales opens nothing more`)
        if (sees === 'gate') ok(sales === 0 && /Lead reports are for Owners and Admins/.test(await p.getByTestId('insights-gate').innerText().catch(() => '')), `${who}: the tab’s gate, no figure`)
        if (sees === 'none') ok(sales === 0 && !/Won value/i.test(await p.locator('main').innerText().catch(() => '')), `${who} (Accounting): no figure reaches her`)
      }
      for (const [who, finds] of [['dane', true], ['germaine', false], ['nurul', false]]) {
        as(who)
        const c = await b.newContext(opts()); const q = await page(c, `k-${who}`)
        await go(q, '/leads', 1200)
        await q.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(q, 600)
        await q.keyboard.type('sales report'); await settle(q, 1400)
        const hit = await q.getByRole('option').filter({ hasText: 'wins by member, source and month' }).count()
        ok(finds ? hit > 0 : hit === 0, `${who}: ⌘K ${finds ? 'finds' : 'doesn’t offer'} the Sales report`)
        await c.close()
      }
      as('dane')
    }

    // ── 5 · the Dashboard's widgets ──────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · the Dashboard — Sales and Response time are the report’s own figures, each a door')
      await go(p, '/company/reports/leads?report=sales&range=90', 1600)
      const wonValue = await tile(p, 'sales-tile-value'), wonCount = n(await tile(p, 'sales-tile-won')), inRange = n(await tile(p, 'sales-tile-leads'))
      await go(p, '/company/reports/leads?range=90', 1400)
      const outreach = await tile(p, 'tile-outreach')
      await go(p, '/dashboard', 2000)
      /* (Dashboard redesign 2026-10-26, a deliberate change) Where it stands' tiles became Pulse's figures (his P-03): an Owner's strip opens
         Leads this week · Won · 90 days · First response, the Sales figure the report's Won value written short ("S$ 121.1K") with the report's
         own "n of N leads", First response the report's own median — the house compact money, never a second count */
      const short = (v) => { const m = cents(v) / 100; const t = (x) => x.toFixed(1).replace(/\.0$/, ''); return m >= 1e6 ? `S$ ${t(m / 1e6)}M` : m >= 1e3 ? `S$ ${t(m / 1e3)}K` : `S$ ${Math.round(m).toLocaleString('en-SG')}` }
      /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-17 · §2's vocabulary) Pulse's labels are sentences: "Won in the last 90
         days" · "To collect" (was Owed to you) · "Profit in October" · "First reply to new leads" (was First response) — the same four, in the same order */
      const OWNER_FIGURES = ['WON IN THE LAST 90 DAYS', 'TO COLLECT', `PROFIT IN ${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'Asia/Singapore' }).format(new Date()).toUpperCase()}`, 'FIRST REPLY TO NEW LEADS']
      const labels = (await p.locator('[data-testid="stands-tiles"] > *').evaluateAll((els) => els.map((e) => (e.querySelector('[class*="__label"]')?.textContent ?? '').trim().toUpperCase())))
      /* (the calm pass 2026-10-26, a deliberate change — the Claude Design option he took, lane C1) an Owner's four: Won first, First response last */
      ok(labels.join(' · ') === OWNER_FIGURES.join(' · '), 'an Owner’s figures: Won · To collect · Profit · First reply to new leads', labels.join(' · '))
      ok(await tile(p, 'tile-sales') === short(wonValue), `Won is the report’s Won value on its 90 days (${await tile(p, 'tile-sales')} ⇐ ${wonValue})`)
      ok(new RegExp(`${wonCount} of ${inRange} leads?`).test(await tile(p, 'tile-sales', 'help')), '…its line the report’s Won of Leads', await tile(p, 'tile-sales', 'help'))
      ok(await tile(p, 'tile-response') === outreach, `First response is the report’s Assignment → First outreach median (${outreach})`)
      ok(await p.locator('[data-testid="stands-tiles"] [data-grade]').count() === 0, 'no figure is coloured (red is for late and ours — the grade is its chip)')
      await p.getByTestId('tile-sales').click(); await p.waitForURL(/\/company\/reports\/leads/, { timeout: 10000 }).catch(() => {}); await settle(p, 1800)
      const u = new URL(p.url())
      ok(u.searchParams.get('report') === 'sales' && u.searchParams.get('range') === '90' && u.searchParams.get('from') === '/dashboard' && await p.getByTestId('sales-report').isVisible(), 'Sales opens the Sales report on 90 days, with the way back', p.url())
      ok(/Dashboard/.test((await p.locator('header:not([class*="mobile-nav"])').allInnerTexts()).join(' ')), 'Back names the Dashboard')
      await shot(p, 's45a-from-dashboard-1440')
      await go(p, '/dashboard', 1600)
      await p.getByTestId('tile-response').click(); await p.waitForURL(/\/company\/reports\/leads/, { timeout: 10000 }).catch(() => {}); await settle(p, 1600)
      ok(!/report=sales/.test(p.url()) && /range=90/.test(p.url()) && await p.getByTestId('insights-tiles').isVisible(), 'Response time opens its report on 90 days')
      /* (Dashboard redesign 2026-10-26, a deliberate change) each role's Pulse (his P-11): an Admin's is the Owner's, Marketing's the lead desk's
         two, a Designer's their own, a Manager's the leads' three over their team — Won a count, no money */
      /* (the calm pass 2026-10-26, a deliberate change) an Admin's are the Owner's four */
      /* (the calm UI build 2026-10-27, a deliberate change — 1-17) each role's same figures, in their sentence-case labels */
      for (const [who, expect] of [['huimin', OWNER_FIGURES], ['nurul', ['LEADS THIS WEEK', 'FIRST REPLY TO NEW LEADS']], ['germaine', ['MY LEADS', 'MY PROJECTS', 'YOUR COMMISSION TO BE PAID']], ['james', ['LEADS THIS WEEK', 'WON IN THE LAST 90 DAYS', 'FIRST REPLY TO NEW LEADS']]]) {
        as(who)
        await go(p, '/dashboard', 1800)
        const got = (await p.locator('[data-testid="stands-tiles"] > *').evaluateAll((els) => els.map((e) => (e.querySelector('[class*="__label"]')?.textContent ?? '').trim().toUpperCase())))
        ok(JSON.stringify(got) === JSON.stringify(expect), `${who}: ${expect.join(' · ')}`, got.join(' · '))
        if (who === 'nurul') ok(!got.includes('WON IN THE LAST 90 DAYS'), 'nurul (Marketing): no money on her Dashboard')   // (the calm UI build 2026-10-27, a deliberate change) Won's new label
        if (who === 'james') ok(!/S\$/.test(await tile(p, 'tile-sales')), 'james (Manager): Won as a count — no money on his page')
      }
      as('dane')
      await go(p, '/dashboard', 1800)
      await shot(p, 's45a-dashboard-1440', true)
    }

    // ── 6 · the Projects listing's three columns ─────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Projects — Source · Signed on · Value before GST, in Column settings')
      const c = await b.newContext(opts()); const q = await page(c, 'projects')
      await go(q, '/projects', 1800)
      const head = async () => (await q.locator('[role="columnheader"]').allInnerTexts()).map((t) => t.replace(/unfold_more|arrow_\w+/g, '').trim().toUpperCase())
      const h0 = await head()
      ok(!h0.some((t) => /^(SOURCE|SIGNED ON|VALUE BEFORE GST)$/.test(t)), 'none of the three is a column until it is turned on (the listing stays as drawn)')
      await q.getByRole('button', { name: /Column settings/ }).first().click(); await settle(q, 700)
      const dlg = q.getByRole('dialog').last()
      const offered = await dlg.innerText()
      ok(['Source', 'Signed on', 'Value before GST'].every((l) => offered.includes(l)), 'Column settings offers all three')
      for (const l of ['Source', 'Signed on', 'Value before GST']) {
        const sw = q.getByRole('switch', { name: `Show ${l} column`, includeHidden: true })
        await sw.waitFor({ state: 'attached' })
        if (!(await sw.isChecked())) await q.locator('label', { has: sw }).click()
        await settle(q, 300)
      }
      await q.getByRole('button', { name: 'Done' }).last().click().catch(() => {}); await settle(q, 900)
      const h1 = await head()
      ok(['SOURCE', 'SIGNED ON', 'VALUE BEFORE GST'].every((t) => h1.includes(t)), 'turned on, the three are columns (applied live)', h1.join(' · '))
      const rows = json(`select p.id, p.number, l.source, l.direct, p.quote_id qid, p.agreed_value_minor a, q.number qn, q.signed_at qs, q.signed_amount_minor sa, q.amount_minor qa, q.gst_enabled g,
        (select min(c.signed_at) from contracts c where c.lead_id = l.id and c.status = 'Signed' and c.deleted_at is null) cs,
        (select min(s.created_at) from stage_logs s where s.lead_id = l.id and s.to_stage = 'Won') w
        from projects p join leads l on l.id = p.lead_id left join quotes q on q.id = p.quote_id where p.deleted_at is null and l.deleted_at is null and p.stage <> 'completed'`)
      let checked = 0
      for (const r of rows) {
        const row = q.locator('[role="row"]').filter({ hasText: r.number }).first()
        if (!await row.count()) continue
        const cell = async (col) => (await row.locator(`[role="cell"][data-col="${col}"]`).innerText().catch(() => '')).trim()
        const t = (v) => (v == null ? null : v < 1e11 ? v * 1000 : v)
        const marks = [t(r.qs), t(r.cs)].filter(Boolean)
        const signed = marks.length ? Math.min(...marks) : t(r.w)
        const net = r.qa != null ? netOf(r.sa ?? r.qa, r.g ? GST : 0) : r.a ? netOf(r.a, GST) : null
        /* (the calm UI build 2026-10-27, a deliberate change — T-08 · 5-48) a cell with nothing to say shows the one empty mark "—" (was "--") */
        const NONE = '—'
        ok(await cell('source') === (r.source || NONE), `${r.number}: Source is its lead’s (${r.source})`)
        ok(await cell('signedOn') === (signed ? displayDate(signed) : NONE), `${r.number}: Signed on is the first signature, else the Won day${signed ? '' : ' — none: “—”'}`, await cell('signedOn'))
        ok(n(await cell('valueNet')) === (net === null ? NaN : Math.round(net / 100)) || (net === null && await cell('valueNet') === NONE), `${r.number}: Value before GST is the sale as signed, before GST`, await cell('valueNet'))
        checked++
      }
      ok(checked >= 3, `every open project checked (${checked})`)
      const ryan = rows.find((r) => r.qid)
      if (ryan) {
        await q.locator('[role="row"]').filter({ hasText: ryan.number }).first().locator('[role="cell"][data-col="valueNet"] span').first().hover(); await settle(q, 600)
        const tip = await q.locator('[role="tooltip"]').last().innerText().catch(() => '')
        ok(new RegExp(`Quote ${ryan.qn} as signed: S\\$[\\d,]+\\.\\d\\d with GST · variation orders not included`).test(tip), 'its tooltip says what it stands on — so it never reads as Contract value less GST', tip)
      }
      /* one rule: a won lead's Value before GST is its Won value in the Sales report (by source, all time) */
      await shot(q, 's45a-projects-columns-1440')
      await c.close()
      as('germaine')
      const c2 = await b.newContext(opts()); const g = await page(c2, 'projects-designer')
      await go(g, '/projects', 1800)
      await g.getByRole('button', { name: /Column settings/ }).first().click(); await settle(g, 700)
      const gd = await g.getByRole('dialog').last().innerText()
      ok(/Source/.test(gd) && /Signed on/.test(gd) && !/Value before GST/.test(gd) && !/Contract value/.test(gd), 'a Designer: Source and Signed on, no money column (Contract value’s rule)')
      await c2.close()
      as('dane')
    }

    // ── 7 · widths ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · 390 · 320 · 768 touch — no sideways scroll, Export inside the screen, the chips whole')
      for (const [w, h] of [[390, 844], [320, 640], [768, 1024]]) {
        const c = await b.newContext(phoneOpts(w, h)); const q = await page(c, `w${w}`)
        for (const url of ['/company/reports/leads?report=sales', '/company/reports/leads', '/dashboard', '/projects']) {
          await go(q, url, 1600)
          ok(await q.evaluate(() => document.documentElement.scrollWidth - screen.width) <= 0, `${w}: ${url} — no sideways scroll (against screen.width)`)
        }
        await go(q, '/company/reports/leads?report=sales', 1600)
        const r = await q.getByTestId('insights-export').evaluate((e) => { const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, sw: screen.width } }).catch(() => null)
        ok(r && r.l >= 0 && r.r <= r.sw, `${w}: Export inside the screen`, r ? `${Math.round(r.l)}–${Math.round(r.r)} of ${r.sw}` : 'missing')
        const chips = await q.getByTestId('leads-report-chips').evaluate((e) => { const x = e.getBoundingClientRect(); return x.right <= screen.width && x.left >= 0 }).catch(() => false)
        ok(chips, `${w}: the report chips inside the screen`)
        if (w === 390) {
          const labels = await q.getByTestId('sales-members-row').first().locator('[role="cell"]').evaluateAll((cs) => cs.map((c) => getComputedStyle(c, '::before').content))
          ok(labels.some((x) => /Leads/.test(x)) && labels.some((x) => /Won value/.test(x)), '390: a member is a card, every line naming itself with its head (“Leads · 14”)', labels.slice(0, 4).join(' '))
          await shot(q, 's45a-sales-390')
          await q.getByTestId('sales-pipeline').scrollIntoViewIfNeeded(); await shot(q, 's45a-sales-pipeline-390')
        }
        if (w === 320) await shot(q, 's45a-sales-320')
        await c.close()
      }
    }

    // ── 8 · the ghost draws the page ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · the ghost — the page’s own layout, first screen')
      for (const [label, o] of [['1440', opts()], ['390 touch', phoneOpts()]]) {
        for (const url of ['/company/reports/leads?report=sales', '/company/reports/leads']) {
          const m = await measure(b, o, url, ['sales-report.', 'stat-tile.', 'insights-view.', 'chips.'], 30, 1)
          if (m.none) { ok(false, `${label} ${url}: the held reveal shows the ghost over the page`); continue }
          const off = m.rows.filter((r) => Math.abs(r.dy) > 2 || Math.abs(r.dx) > 2)
          ok(off.length === 0, `${label} ${url}: every block of the first screen lands where its ghost stood (±2 px, ${m.rows.length} measured)`, off.slice(0, 6).map((r) => `${r.k}#${r.i} ${r.dx},${r.dy}`).join(' · '))
          ok(m.words.length === 0, `${label} ${url}: the ghost’s words are the page’s`, m.words.slice(0, 3).join(' · '))
        }
        /* the Dashboard: Where it stands' tiles against their own ghost, each measured from the first tile (the cards above them are S22's) —
           an Owner's seven and Marketing's two */
        for (const who of ['dane', 'nurul']) {
        as(who)
        const c = await b.newContext(o)
        await c.addInitScript(() => { const f = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : f(t)) })
        const q = await c.newPage()
        await q.goto(BASE + '/dashboard', { waitUntil: 'load' }).catch(() => {}); await q.waitForTimeout(2400)
        const t = await q.evaluate(() => {
          const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
          if (!reveal) return null
          const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
          const boxes = (root) => [...root.querySelectorAll('[class*="stat-tile-module__"]')].filter((e) => [...e.classList].some((c) => /__tile$/.test(c))).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, h: r.height, label: (e.querySelector('[class*="__label"]')?.textContent ?? '').trim() } })
          return ghost && content ? { g: boxes(ghost), p: boxes(content) } : null
        })
        await c.close()
        if (!t || !t.g.length) { ok(false, `${label} ${who} /dashboard: the held reveal shows the ghost`); continue }
        const rel = (list) => list.map((x) => ({ ...x, x: Math.round(x.x - list[0].x), y: Math.round(x.y - list[0].y), h: Math.round(x.h) }))
        const g = rel(t.g), pg = rel(t.p)
        const off = g.map((x, i) => ({ x, p: pg[i] })).filter(({ x, p }) => !p || Math.abs(x.x - p.x) > 2 || Math.abs(x.y - p.y) > 2 || Math.abs(x.h - p.h) > 2)
        ok(g.length === pg.length && g.every((x, i) => x.label === pg[i]?.label), `${label} ${who} /dashboard: the ghost draws the page’s tiles, in its order`, g.map((x) => x.label).join(' · '))
        ok(off.length === 0, `${label} ${who} /dashboard: each tile lands where its ghost stood, as tall (±2 px)`, off.slice(0, 4).map(({ x, p }) => `${x.label} ${p ? `${p.x - x.x},${p.y - x.y} h${p.h - x.h}` : 'missing'}`).join(' · '))
        }
        as('dane')
      }
    }

    ok(writes() === before, 'nothing on the record changed')
    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
    await ctx.close()
  } finally {
    as('dane')
    await b.close()
  }
  console.log(`\n${pass} / ${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
