// Pending modules, step S41b-5 · Qanvast Ops › Lead credits and Reviews & Rankings (her "please make sure nothing left behind from 1.0 to 2.0",
// 2026-10-12; the S41b data sweep's M-04 — 1.0's `deployment/qanvast` qanvast-ops/credits · credits/{contracts,transactions,leads} ·
// reviews · reviews/feedback). Each item asserted as the rule it builds, every figure checked against the demo's records:
//  - the seam, in one process (pm2-s41b5-seam.mts on a copy of this DB): a stub answering 1.0's JSON through the loaders, the reply through it,
//    a Qanvast that fails, the Owner-only rule (nothing asked of Qanvast for anyone else), the stand-in back
//  - Lead credits › Overview: credits left = the contract's credits − 200 per Qanvast lead + refunds credited; this month's use; a refund
//    Qanvast approved and hasn't credited, from the studio's own return; Leads received · Credits used by month (two charts, Show the numbers);
//    Month by month; Closures; the stand-in's line
//  - Transactions: the month's statement (brought forward · a row per lead, its lead one press away with the way back · total · carried
//    forward); an empty month's one door; the month menu back to the first transaction
//  - Contracts: the one contract, its credits, budget band and entitlements
//  - Qanvast Ops › Leads' Credits column reads the same seam (a lead without Qanvast's id: "—")
//  - Reviews: every review backed by its record (a completed project's client, a designer's published work with its pictures) or a sample;
//    the overview's figures are the cards'; Show / rating / sort; Read more; the photo viewer; Reply · Edit · Discard; Request reviews
//    (finished projects ticked, leads by search, Qanvast's link, the message, WhatsApp on the press, Opened, Done) and its doors
//    (?request=1, Ranking's tip, Company › Profile › Reviews for the Owner)
//  - Ranking: rank, factors read from the reviews and the published work, page views, the 30-day feedback (dashes below two answers)
//  - Feedback: 30 · 60 · 90 days, each figure the rule's count from the studio's Qanvast leads
//  - roles: Admin · Manager · Designer meet the tabs' gate (no Request reviews, no ⌘K rows); Accounting the house gate; the Owner everything
//  - 1.0's addresses land; ⌘K; Maison AI; the ghosts sit where the page does (1440 · 390); no page errors; no sideways scroll at 390 / 320
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s41b5.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41b5')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const REPO = path.join(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s41b5-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const num = (s) => Number(String(s).replace(/[^0-9.\-−]/g, '').replace('−', '-'))
const fmt = (n) => n.toLocaleString('en-SG', { maximumFractionDigits: 2 })
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY = 86_400_000
/* the stand-in's samples the probe knows by name: the designers' published work it reviews (repair R144's titles), and its three older reviews */
const WORK_TITLES = ['A warm Scandinavian condo', 'A calm 5-room in Tampines', 'A penthouse kitchen that hides everything', 'A bright BTO for a young family']
const OLDER = 3

async function chain(url) {
  const hops = []
  let at = new URL(url, BASE).toString()
  for (let i = 0; i < 8; i++) {
    const r = await fetch(at, { redirect: 'manual', headers: { accept: 'text/html' } })
    const loc = r.headers.get('location')
    hops.push({ status: r.status, at })
    if (r.status >= 300 && r.status < 400 && loc) { at = new URL(loc, at).toString(); continue }
    return { hops, status: r.status, final: at, body: r.status === 200 || r.status === 404 ? await r.text() : '' }
  }
  return { hops, status: 0, final: at, body: '' }
}
const rel = (u) => { const x = new URL(u); return x.pathname + x.search + x.hash }

/* the ghost measure (S34's / S37's): the reveal's ghost against the page, block by block */
async function measure(b, opts, url, blocks, max = 6) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2600)
  const out = await p.evaluate(({ blocks, max }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (!blocks.includes(k)) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) { const ps = q.get(k); if (!ps) continue; for (let i = 0; i < Math.min(gs.length, ps.length, max); i++) { if (gs[i][1] > innerHeight) continue; rows.push({ k, i, dy: ps[i][1] - gs[i][1], dx: ps[i][0] - gs[i][0] }) } }
    return { rows }
  }, { blocks, max })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* open one page and wait first: the app's own lazy writes land before the snapshot (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/qanvast-ops/credits', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
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
  const tileValue = (p, id) => text(p.locator(`[data-testid="${id}"] [class*="__value"]`))
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }
  const waitPanel = (p) => p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"],[data-testid="maison-proposal"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
  const ask = async (p, q) => { const box = sheet(p).locator('[data-testid="maison-ask"] input'); await box.fill(q); await box.press('Enter'); await waitPanel(p); await settle(p, 300); return sheet(p).locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first() }
  const search = async (p, q) => {
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type(q, { delay: 20 }); await settle(p, 900)
    return p.getByRole('dialog', { name: /search/i }).or(p.locator('[data-global-search]')).first()
  }

  /* ── what the records say (the rules, read here, never the page's own numbers) ── */
  const now = Date.now()
  const nowD = new Date(now)
  const monthKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  const thisMonth = monthKey(now)
  const qleads = json(`select id, name, phone, budget_minor, created_at * 1000 as at, qanvast_lead_id as ref, stage, deleted_at from leads where source = 'Qanvast' and qanvast_lead_id is not null order by created_at`)
  const credited = json(`select r.credit_amount_minor as c from lead_returns r join leads l on l.id = r.lead_id where l.source = 'Qanvast' and r.status = 'approved' and r.refund_status = 'credited'`)
  const waitingBack = json(`select l.name, r.credit_amount_minor as c from lead_returns r join leads l on l.id = r.lead_id where l.source = 'Qanvast' and r.status = 'approved' and coalesce(r.refund_status, '') <> 'credited'`)
  const BALANCE = 3000 + 400 - 200 * qleads.length + credited.reduce((s, r) => s + (r.c ? r.c / 100 : 200), 0)
  const byMonth = (k) => qleads.filter((l) => monthKey(l.at) === k)
  const months6 = Array.from({ length: 6 }, (_, i) => monthKey(new Date(nowD.getFullYear(), nowD.getMonth() - 5 + i, 1).getTime()))
  const latestActive = [...months6].reverse().find((k) => k < thisMonth && byMonth(k).length)

  try {
    // ── 1 · The seam, in one process ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The seam (pm2-s41b5-seam.mts on a copy of this DB)')
    {
      const copy = path.join(os.tmpdir(), `pm2-s41b5-seam-${process.pid}.db`)
      try { fs.unlinkSync(copy) } catch { /* none */ }
      execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" ".backup '${copy}'"`)
      let out = ''
      try { out = execSync('npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s41b5-seam.mts', { cwd: REPO, env: { ...process.env, DATABASE_URL: `file:${copy}`, NODE_ENV: 'test' }, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }
      catch (e) { out = String(e.stdout ?? ''); if (!out) ok(false, 'the seam script ran', String(e.stderr ?? e).slice(0, 600)) }
      for (const line of out.split('\n')) {
        let d; try { d = JSON.parse(line) } catch { continue }
        if (d.done) { ok(d.fail === 0 && d.pass >= 45, `the seam script: ${d.pass} passed · ${d.fail} failed`); continue }
        ok(d.ok, `seam · ${d.label}`, d.extra)
      }
      for (const f of [copy, `${copy}-wal`, `${copy}-shm`]) { try { fs.unlinkSync(f) } catch { /* gone */ } }
    }

    as('dane')
    const ctx = await desk()
    await ctx.route(/wa\.me/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }))
    const d = await page(ctx, 'dane-1440')

    // ── 2 · Lead credits › Overview ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Lead credits › Overview')
    await go(d, '/qanvast-ops/credits', 1600)
    ok(await d.getByRole('tab', { name: 'Lead credits' }).getAttribute('aria-selected') === 'true' && (await d.getByRole('tab', { name: 'Reviews' }).getAttribute('href')) === '/qanvast-ops/reviews', 'Lead credits and Reviews are live tabs (no Coming soon)')
    ok(num(await tileValue(d, 'credits-left')) === BALANCE, `Credits left = 3,000 + 400 free from the contract − 200 × ${qleads.length} Qanvast leads + refunds credited = ${fmt(BALANCE)}`, await tileValue(d, 'credits-left'))
    ok(num(await tileValue(d, 'credits-used')) === 200 * byMonth(thisMonth).length && /this month/.test(await text(d.getByTestId('credits-used'))), `Used this month = 200 × this month’s Qanvast leads (${byMonth(thisMonth).length})`)
    const back = waitingBack.reduce((s, r) => s + (r.c ? r.c / 100 : 0), 0)
    const backText = await text(d.getByTestId('credits-on-the-way'))
    if (back) ok(num(await tileValue(d, 'credits-on-the-way')) === back && waitingBack.every((r) => backText.includes(r.name)), `On the way back = the returns Qanvast approved and hasn’t credited (${waitingBack.map((r) => r.name).join(', ')})`, backText)
    else ok(await d.getByTestId('credits-on-the-way').count() === 0, 'no On the way back tile when nothing waits')
    ok(await d.locator('[data-testid="credits-charts"] [data-testid="insight-chart"]').count() === 2, 'Leads received and Credits used — two charts on one axis each (1.0 drew one chart on two)')
    await d.locator('[data-testid="credits-charts"] [data-testid="insight-chart-numbers"]').first().click(); await settle(d, 400)
    const nums = await d.locator('[data-testid="credits-charts"] [data-testid="insight-chart-table"] tbody tr').allInnerTexts()
    ok(nums.length === 6 && months6.every((k, i) => num(nums[i].split('\t').pop()) === byMonth(k).length), 'Show the numbers: each of the last six months’ Qanvast leads', nums)
    const rowsM = d.locator('[data-testid="credits-months-table"] [role="row"]')
    ok(await rowsM.count() === 7 && (await text(rowsM.nth(1))).startsWith(`${MONTHS_FULL[nowD.getMonth()]} ${nowD.getFullYear()}`), 'Month by month: six months, newest first')
    const aug = latestActive ? (await text(d.locator('[data-testid="credits-months-table"] [role="row"]').filter({ hasText: `${MONTHS_FULL[Number(latestActive.slice(5)) - 1]} ${latestActive.slice(0, 4)}` }))) : ''
    if (latestActive) ok(aug.includes(fmt(byMonth(latestActive).reduce((s, l) => s + l.budget_minor / 100, 0))) && aug.includes(fmt(200 * byMonth(latestActive).length)), `${latestActive}: the leads’ budgets and the credits they took`, aug)
    const won = qleads.filter((l) => l.stage === 'Won').length
    ok(num(await tileValue(d, 'closures-contracts')) === won && (await tileValue(d, 'closures-rate')).endsWith('%'), `Closures: the Qanvast leads won (${won})`)
    ok(/Simulated on this prototype/.test(await text(d.getByTestId('qanvast-account-sample'))), 'the stand-in says it is one')
    await shot(d, '01-credits-overview-1440', true)
    /* Maison AI answers from the page */
    await fab(d)
    await sheet(d).getByText('How many lead credits are left?').click(); await settle(d, 700)
    ok((await text(sheet(d))).includes(`${fmt(BALANCE)} credits left`), 'Maison AI: “How many lead credits are left?” answers the balance')
    await d.keyboard.press('Escape'); await settle(d, 400)
    /* the Ask box, asked anywhere: lead credits are Qanvast's, never the AI credits */
    await go(d, '/dashboard', 1200); await fab(d)
    ok((await text(await ask(d, 'how many lead credits do we have left?'))).includes(`${fmt(BALANCE)} credits left`), 'the Ask box: “how many lead credits do we have left?” — Qanvast’s, not the AI credits')
    ok(/★ from \d+ reviews? on Qanvast/.test(await text(await ask(d, 'how are our reviews on qanvast?'))), 'the Ask box: “how are our reviews on Qanvast?”')
    await d.keyboard.press('Escape'); await settle(d, 400)
    await go(d, '/qanvast-ops/credits', 1400)
    await d.getByTestId('credits-used').click(); await settle(d, 1600)
    ok(new URL(d.url()).pathname === '/qanvast-ops/credits/transactions', 'Used this month opens this month’s statement')

    // ── 3 · Transactions ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Transactions')
    const rowKinds = async () => d.locator('[data-testid="statement-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
    if (!byMonth(thisMonth).length && latestActive) {
      const k = await rowKinds()
      ok(k.join(',') === 'brought,total,carried' && /Nothing was taken or added/.test(await text(d.getByTestId('credits-month-quiet'))), 'a quiet month: brought forward → total → carried forward, said in words', k)
      await d.getByTestId('credits-last-active').click(); await settle(d, 1600)
      ok(new URL(d.url()).searchParams.get('month') === latestActive, `its one door opens the latest month with credits (${latestActive})`, d.url())
    } else await go(d, `/qanvast-ops/credits/transactions?month=${latestActive ?? thisMonth}`)
    const m = latestActive ?? thisMonth
    const inM = byMonth(m)
    const kinds = await rowKinds()
    ok(kinds[0] === 'brought' && kinds.at(-2) === 'total' && kinds.at(-1) === 'carried' && kinds.filter((x) => x === 'entry').length >= inM.length, 'the statement runs brought forward · entries · total · carried forward', kinds)
    const leadLinks = d.locator('[data-testid="credits-statement"] a[href^="/leads/"]')
    ok(await leadLinks.count() === inM.length && (await leadLinks.allInnerTexts()).every((t, i) => t === inM[i].name), `a row per Qanvast lead that month (${inM.length}), each naming its client`)
    const before0 = BALANCE + 200 * qleads.filter((l) => monthKey(l.at) > m).length
    ok(num(await text(d.locator('[data-kind="carried"] [data-col="balance"]'))) === before0 && Math.abs(num(await text(d.locator('[data-kind="total"] [data-col="minus"]')))) === 200 * inM.length, `carried forward ${fmt(before0)} · taken ${fmt(200 * inM.length)}`)
    await shot(d, '02-credits-statement-1440')
    const href = await leadLinks.first().getAttribute('href')
    ok(href.startsWith(`/leads/${inM[0].id}?from=`), 'a lead opens with the way back', href)
    await leadLinks.first().click(); await settle(d, 1800)
    ok(new URL(d.url()).pathname === `/leads/${inM[0].id}` && await d.locator('a[href^="/qanvast-ops/credits/transactions"]').filter({ hasText: 'Lead credits' }).count() >= 1, 'the lead’s crumb names Lead credits, and goes back there')
    await go(d, `/qanvast-ops/credits/transactions?month=${m}`)
    await d.getByTestId('credits-month').click(); await settle(d, 400)
    const opts = await d.locator('[role="menuitemradio"]').allInnerTexts()
    const firstK = monthKey(qleads[0].at - 9 * DAY)
    ok(opts[0] === `${MONTHS_FULL[nowD.getMonth()]} ${nowD.getFullYear()}` && opts.at(-1) === `${MONTHS_FULL[Number(firstK.slice(5)) - 1]} ${firstK.slice(0, 4)}`, 'the month menu runs from this month back to the contract’s', opts)
    await d.locator('[role="menuitemradio"]').last().click(); await settle(d, 1600)
    const tFirst = await text(d.getByTestId('credits-statement'))
    ok(/Credits from contract #20714/.test(tFirst) && /\+3,000/.test(tFirst) && /Free credits with contract #20714/.test(tFirst) && /\+400/.test(tFirst), 'the first month: the contract’s 3,000 credits and 400 free')

    // ── 4 · Contracts ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Contracts')
    await go(d, '/qanvast-ops/credits/contracts')
    const crow = d.locator('[data-testid="credits-contracts"] [role="row"]').nth(1)
    const ctext = await text(crow)
    ok(await d.locator('[data-testid="credits-contracts"] [role="row"]').count() === 2 && ctext.includes('#20714') && ctext.includes('S$3,000') && ctext.includes('3,000') && ctext.includes('+ 400 free') && ctext.includes('S$50K and up') && ctext.includes('0 of 1 photoshoot done') && ctext.includes('1 of 2 social media posts done'), 'one contract: paid, credits (+ free), the leads’ budget, what it includes', ctext)
    const started = new Date(qleads[0].at - 9 * DAY)
    ok(ctext.includes(`${started.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][started.getMonth()]}`), 'it started before the first Qanvast lead (the day the studio’s listing is dated by)')
    await shot(d, '03-credits-contracts-1440')

    // ── 5 · Qanvast Ops › Leads reads the same credits ───────────────────────────────────────────────────────────────────────────
    console.log('5 · Qanvast Ops › Leads’ Credits column')
    const probeLead = json(`select id, qanvast_lead_id as ref from leads where source = 'Qanvast' and deleted_at is null and qanvast_lead_id is not null order by created_at desc limit 1`)[0]
    sql(`update leads set qanvast_lead_id = null where id = '${probeLead.id}'`)
    await go(d, '/qanvast-ops')
    const cells = await d.locator('[data-testid="qanvast-row"] [data-col="credits"]').allInnerTexts()
    ok(cells.filter((c) => c === '200').length === qleads.filter((l) => !l.deleted_at).length - 1 && cells.includes('—'), 'each Qanvast lead shows the credits Qanvast took for it; one Qanvast didn’t send (no Qanvast id) shows “—”', cells)
    sql(`update leads set qanvast_lead_id = '${probeLead.ref}' where id = '${probeLead.id}'`)

    // ── 6 · Reviews ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Reviews')
    const done = json(`select p.id, p.completed_at * 1000 as at, l.name, l.property_type as type, (select group_concat(m.name, ' and ') from lead_assignees a join members m on m.id = a.member_id where a.lead_id = l.id) as who from projects p join leads l on l.id = p.lead_id where p.completed_at is not null and p.deleted_at is null and l.deleted_at is null`)
      .filter((p) => p.at + 4 * DAY <= now)
    const works = json(`select w.id, w.title, m.name as who, (select count(*) from member_portfolio_pictures x where x.portfolio_id = w.id and x.deleted_at is null) as pics from member_portfolio_projects w join members m on m.id = w.member_id where w.deleted_at is null and w.project_id is null`)
      .filter((w) => WORK_TITLES.includes(w.title))
    const EXPECT = done.length + works.length + OLDER
    await go(d, '/qanvast-ops/reviews', 1600)
    const cards = d.getByTestId('review-card')
    ok(await cards.count() === Math.min(EXPECT, 12) && num(await text(d.getByTestId('reviews-total'))) === EXPECT, `every review: ${done.length} completed project(s)’ client · ${works.length} pieces of published work · ${OLDER} older samples`)
    const ratings = await cards.locator('[data-testid="review-stars"]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('aria-label').split(' ')[0])))
    const mean = Math.round((ratings.reduce((a, x) => a + x, 0) / ratings.length) * 10) / 10
    ok((await text(d.getByTestId('reviews-average'))).startsWith(mean.toFixed(1)), `the average is the reviews’ own (${mean.toFixed(1)})`)
    const spread = await Promise.all([5, 4, 3, 2, 1].map(async (s) => num(await text(d.getByTestId(`reviews-stars-${s}`))) === ratings.filter((r) => Math.floor(r) === s).length))
    ok(EXPECT <= 12 ? spread.every(Boolean) : true, 'the stars’ spread counts the reviews')
    for (const p of done) {
      const c = d.locator(`[data-review="rv-p-${p.id}"]`)
      const meta = await text(c.getByTestId('review-meta'))
      const fin = new Date(p.at)
      ok(meta.includes(`By ${p.name}`) && meta.includes(`Project finished ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][fin.getMonth()]} ${fin.getFullYear()}`) && (!p.who || meta.includes(`Designer ${p.who}`)) && (await text(c.locator('h3'))).includes(p.type), `${p.name}’s review: their project, finished when it was, by its own members`, meta)
    }
    for (const w of works) {
      const c = d.locator(`[data-review="rv-w-${w.id}"]`)
      ok(await c.count() === 1 && (await text(c.getByTestId('review-meta'))).includes(`Designer ${w.who}`) && await c.locator('[data-testid="review-photos"] img').count() === w.pics, `“${w.title}”: its designer and its ${w.pics} published pictures`)
    }
    const waitingN = await d.locator('[data-testid="review-card"][data-waiting]').count()
    /* (S42E, E-16 — a deliberate change of this rule) what waits is counted once, on the Show chip — the view chip names the view only */
    ok(!/Reviews · \d/.test(await text(d.getByTestId('qanvast-account-views'))) && (await text(d.getByTestId('reviews-show'))).includes(`Waiting for a reply · ${waitingN}`), `what waits on you is counted on the Show chip, not the view chip (${waitingN})`)
    await shot(d, '04-reviews-1440', true)
    /* show · rating · sort · Read more */
    await d.getByTestId('reviews-show').getByRole('radio', { name: /Waiting/ }).click(); await settle(d, 400)
    ok(await cards.count() === waitingN && await d.locator('[data-testid="review-card"]:not([data-waiting])').count() === 0, 'Waiting for a reply shows only those')
    await d.getByTestId('reviews-show').getByRole('radio', { name: 'All' }).click(); await settle(d, 300)
    await d.getByTestId('reviews-stars-filter').click(); await settle(d, 300)
    await d.getByRole('menuitemradio', { name: /^3 stars/ }).click(); await settle(d, 400)
    ok(await cards.count() === ratings.filter((r) => Math.floor(r) === 3).length, 'a star filter keeps that many stars')
    await d.getByTestId('reviews-stars-filter').click(); await settle(d, 300)
    await d.getByRole('menuitemradio', { name: 'All ratings' }).click(); await settle(d, 300)
    await d.getByTestId('reviews-sort').click(); await settle(d, 300)
    await d.getByRole('menuitemradio', { name: 'Lowest rating' }).click(); await settle(d, 400)
    ok(Number((await cards.first().getByTestId('review-stars').getAttribute('aria-label')).split(' ')[0]) === Math.min(...ratings), 'Lowest rating first')
    await d.getByTestId('reviews-sort').click(); await settle(d, 300)
    await d.getByRole('menuitemradio', { name: 'Newest first' }).click(); await settle(d, 400)
    const longId = await cards.filter({ has: d.getByRole('button', { name: 'Read more' }) }).first().getAttribute('data-review')
    const longCard = d.locator(`[data-review="${longId}"]`)
    await longCard.getByRole('button', { name: 'Read more' }).click(); await settle(d, 200)
    ok(await longCard.getByRole('button', { name: 'Show less' }).count() === 1, 'Read more opens the whole review, Show less folds it')
    /* the photo viewer */
    if (works.length) {
      const w = works.find((x) => x.pics > 1) ?? works[0]
      const c = d.locator(`[data-review="rv-w-${w.id}"]`)
      await c.locator('[data-testid="review-photos"] button').first().click(); await settle(d, 600)
      const v = d.getByTestId('review-photo-viewer')
      const src1 = await v.locator('img').getAttribute('src')
      ok(/^\/company\/work\//.test(src1) && (await d.locator('[role="dialog"]').last().innerText()).includes(`Photo 1 of ${w.pics}`), 'a photo opens in the viewer (the published picture), “Photo 1 of n”')
      if (w.pics > 1) { await d.getByTestId('viewer-next').click(); await settle(d, 300); ok((await v.locator('img').getAttribute('src')) !== src1, '→ the next photo') }
      await shot(d, '05-review-photo-1440')
      await d.keyboard.press('Escape'); await settle(d, 400)
    }
    /* Reply · Edit · Discard */
    const target = d.locator('[data-testid="review-card"][data-waiting]').first()
    const rid = await target.getAttribute('data-review')
    await target.getByTestId('review-reply').click(); await settle(d, 400)
    await target.locator('textarea').fill('Thank you so much — it was a joy to work on your home.')
    await shot(d, '06-review-reply-1440')
    await target.getByTestId('review-post').click(); await settle(d, 2000)
    const t1 = d.locator(`[data-review="${rid}"]`)
    ok(/Reply kept here — on this prototype it isn’t posted to Qanvast/.test(await snackText(d)) && (await text(t1.getByTestId('review-response'))).includes('Thank you so much'), 'Post reply: the reply under the review, and the stand-in says it wasn’t posted to Qanvast')
    ok(JSON.parse(sql(`select value from settings where key = 'qanvast_demo_replies'`) || '{}')[rid]?.text === 'Thank you so much — it was a joy to work on your home.', '…kept in the demo’s store')
    ok((await text(d.getByTestId('reviews-show'))).includes(waitingN - 1 > 0 ? `Waiting for a reply · ${waitingN - 1}` : 'Waiting for a reply'), 'one fewer waits')   // (S42E, E-16) the Show chip's count
    await t1.getByTestId('review-edit').click(); await settle(d, 300)
    await t1.locator('textarea').fill('Thank you — enjoy your new home!')
    await t1.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 500)
    ok(await d.getByRole('dialog', { name: 'Discard your reply?' }).count() === 1, 'Cancel with changes asks first')
    await d.getByRole('dialog', { name: 'Discard your reply?' }).getByRole('button', { name: 'Keep writing' }).click(); await settle(d, 400)
    await t1.locator('textarea').focus(); await d.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter'); await settle(d, 2000)
    ok((await text(t1.getByTestId('review-response'))).includes('enjoy your new home'), 'Edit → ⌘↵ saves the reply in place of the old one')

    /* Request reviews */
    console.log('6b · Request reviews')
    await d.getByTestId('reviews-request').click(); await settle(d, 600)
    const dlg = d.getByRole('dialog', { name: 'Request reviews' })
    const finishedN = done.length + json(`select p.id from projects p join leads l on l.id = p.lead_id where p.completed_at is not null and p.deleted_at is null and l.deleted_at is null`).length - done.length
    ok(await dlg.count() === 1 && (await text(dlg.getByTestId('request-mode'))).includes(`Finished projects · ${finishedN}`), 'Request reviews opens on the finished projects’ clients')
    /* (S42E, E-06 — a deliberate change of this rule) a client whose review is on record is listed, says so, and starts unticked */
    const unreviewed = finishedN - done.length
    ok(await dlg.getByTestId('request-person').count() === finishedN && await dlg.locator('[data-testid="request-person"] input[type="checkbox"]:checked').count() === unreviewed, `…every client who hasn’t reviewed yet ticked (${unreviewed} of ${finishedN})`)
    ok(/qanvast\.example\/sg\/reviews\/new/.test(await text(dlg.getByTestId('request-link'))), 'Qanvast’s review link with Copy (the demo’s on .example)')
    await shot(d, '07-request-pick-1440')
    const leadsN = Number(sql(`select count(*) from leads where deleted_at is null and direct = 0`))
    await dlg.getByTestId('request-mode').getByRole('radio', { name: /Leads/ }).click(); await settle(d, 300)
    ok((await text(dlg.getByTestId('request-mode'))).includes(`Leads · ${leadsN}`) && await dlg.getByTestId('request-person').count() === leadsN, `Leads: every lead (${leadsN})`)
    await dlg.getByLabel('Search leads by name or phone').fill('Jasmine'); await settle(d, 400)
    ok(await dlg.getByTestId('request-person').count() === 1, 'search by name')
    await dlg.locator('[data-testid="request-person"] label, [data-testid="request-person"] [role="checkbox"], [data-testid="request-person"] input[type="checkbox"]').first().click({ force: true }); await settle(d, 200)
    ok(new RegExp(`Next · ${unreviewed + 1}`).test(await text(dlg.getByTestId('request-next'))), 'Next counts the ticked people (both lists)')   // (S42E, E-06) the reviewed client starts unticked
    await dlg.getByTestId('request-next').click(); await settle(d, 500)
    const sendD = d.getByRole('dialog', { name: 'Send on WhatsApp' })
    const msgBox = sendD.locator('textarea').first()
    const msg = await msgBox.inputValue()
    const studio = (JSON.parse(sql(`select value from settings where key = 'studio'`) || '{}').name || 'our studio').replace(/[\s,]+(pte\.?\s*ltd\.?|private limited|llp|ltd\.?)$/i, '')
    ok(msg.includes(`choosing ${studio} for`) && /qanvast\.example\/sg\/reviews\/new/.test(msg), '1.0’s message: the studio’s name (without “Pte Ltd”) and Qanvast’s link', msg)
    await msgBox.fill('Hi! Would you leave us a review?'); await settle(d, 200)
    ok(await sendD.getByTestId('request-no-link').count() === 1, 'a message without the link says so')
    await sendD.getByRole('button', { name: 'Reset message' }).click(); await settle(d, 200)
    ok(await sendD.getByTestId('request-no-link').count() === 0 && (await msgBox.inputValue()) === msg, 'Reset message puts it back')
    const shalini = done[0]
    const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }), sendD.getByTestId('request-open-wa').first().click()])
    const wa = new URL(popup.url())
    ok(wa.hostname === 'wa.me' && /^\/65\d{8}$/.test(wa.pathname) && wa.searchParams.get('text') === msg, 'Open WhatsApp opens wa.me on the press, the number and the message', popup.url())
    await popup.close()
    await settle(d, 300)
    ok(await sendD.getByTestId('request-opened').count() === 1, '…and the row says Opened')
    await shot(d, '08-request-send-1440')
    await sendD.getByTestId('request-done').click(); await settle(d, 800)
    ok(/Asked .+ for a review on WhatsApp/.test(await snackText(d)) && await d.getByRole('dialog', { name: /Send on WhatsApp|Request reviews/ }).count() === 0, 'Done closes it and says who was asked', await snackText(d))
    /* the doors: ?request=1 and Ranking's tip */
    await go(d, '/qanvast-ops/reviews?request=1', 1600)
    ok(await d.getByRole('dialog', { name: 'Request reviews' }).count() === 1, '?request=1 opens Request reviews on arrival')
    await d.getByRole('dialog', { name: 'Request reviews' }).getByRole('button', { name: 'Cancel' }).click(); await settle(d, 900)
    ok(!new URL(d.url()).searchParams.has('request'), '…and closing it leaves the plain address')

    // ── 7 · Ranking ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Ranking')
    await go(d, '/qanvast-ops/reviews', 1400)
    const ats = await d.locator('[data-testid="review-card"]').evaluateAll((els) => els.map((e) => Date.parse(e.getAttribute('data-at'))))
    await go(d, '/qanvast-ops/reviews/ranking', 1600)
    ok((await text(d.getByTestId('ranking-number'))) === '#27' && /of 1,186 firms on Qanvast/.test(await text(d.getByTestId('ranking-rank'))), 'the rank among Qanvast’s firms (a sample — the stand-in says so)')
    ok(num(await tileValue(d, 'factor-reviews')) === ats.filter((t) => t >= now - 365 * DAY).length, 'Reviews over 12 months = the reviews written in the last 12 months')
    ok(num(await tileValue(d, 'factor-projects')) === Number(sql(`select count(*) from member_portfolio_projects where deleted_at is null`)), 'Projects = the designers’ published work')
    const told30 = qleads.filter((l) => !l.deleted_at && l.at >= now - 30 * DAY).length
    if (!told30) ok((await tileValue(d, 'told-contact')) === '–' && /No homeowner answered/.test(await text(d.getByTestId('ranking-told-note'))), 'no Qanvast lead in 30 days: dashes, and why')
    await shot(d, '09-ranking-1440', true)
    await d.getByTestId('ranking-ask').click(); await settle(d, 1600)
    ok(new URL(d.url()).pathname === '/qanvast-ops/reviews' && await d.getByRole('dialog', { name: 'Request reviews' }).count() === 1, 'Ask homeowners for a review opens Request reviews')
    await d.keyboard.press('Escape'); await settle(d, 600)
    await go(d, '/qanvast-ops/reviews/ranking')
    ok((await d.getByTestId('ranking-work').getAttribute('href')).startsWith('/profile?from=') || (await d.getByTestId('ranking-work').getAttribute('href')).startsWith('/profile#'), 'publish more work: Your public profile, with the way back', await d.getByTestId('ranking-work').getAttribute('href'))

    // ── 8 · Feedback by rule ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Feedback')
    const logs = json(`select lead_id, from_stage, to_stage, created_at * 1000 as at from stage_logs where lead_id in (select id from leads where source = 'Qanvast') order by created_at`)
    const rets = json(`select lead_id, status, reason from lead_returns order by returned_at`)
    const heldIds = new Set(json(`select lead_id from meetings where status = 'held'`).map((r) => r.lead_id))
    for (const days of [30, 60, 90]) {
      const inW = qleads.filter((l) => !l.deleted_at && l.at >= now - days * DAY)
      const unreachable = (id) => { const last = rets.filter((r) => r.lead_id === id).pop(); return !!last && last.status !== 'rejected' && /no response|not contactable|unreachable/i.test(last.reason) }
      const ans = inW.filter((l) => now - l.at >= 7 * DAY && !unreachable(l.id))
      const within = (l, max) => { const c = logs.find((g) => g.lead_id === l.id && g.from_stage === 'New'); return !!c && (c.at - l.at) / DAY <= max }
      const lt3 = ans.filter((l) => within(l, 2.999999)).length, week = ans.filter((l) => within(l, 7)).length
      const met = ans.filter((l) => heldIds.has(l.id) || logs.some((g) => g.lead_id === l.id && ['Met', 'Quote Sent', 'Won'].includes(g.to_stage))).length
      await go(d, days === 30 ? '/qanvast-ops/reviews/feedback' : `/qanvast-ops/reviews/feedback?days=${days}`)
      const sum = await text(d.getByTestId('feedback-summary'))
      if (ans.length >= 2) {
        ok(sum.includes(`${ans.length} of the ${inW.length} homeowners`) && num(await text(d.getByTestId('feedback-contact-value'))) === Math.round(week / ans.length * 100) && (await text(d.getByTestId('feedback-row-lt3'))).startsWith('In less than 3 days') && (await text(d.getByTestId('feedback-row-lt3'))).includes(`${lt3} (`) && num(await text(d.getByTestId('feedback-meeting-value'))) === Math.round(met / ans.length * 100),
          `${days} days: ${ans.length} of ${inW.length} answered (a week after the lead, unless returned as unreachable); contacted within a week ${week}, within 3 days ${lt3}; met ${met}`, sum)
      } else ok(/no leads|None of|Only/.test(sum) && (await text(d.getByTestId('feedback-contact-value'))) === '–', `${days} days: too few answers (${ans.length}) — dashes and why`, sum)
    }
    await d.getByTestId('feedback-days').getByRole('radio', { name: '60 days' }).click(); await settle(d, 1600)
    ok(new URL(d.url()).searchParams.get('days') === '60', 'the period rides the address')
    await shot(d, '10-feedback-1440', true)

    // ── 9 · Doors: ⌘K, Company › Profile, 1.0's addresses ───────────────────────────────────────────────────────────────────────
    console.log('9 · Doors')
    await go(d, '/dashboard', 1200)
    const sr = await search(d, 'lead credits')
    ok(/Qanvast Ops · credits left/.test(await text(sr)), '⌘K finds Lead credits (the Owner)')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, '/company/profile', 1400)
    ok(await d.getByTestId('review-qanvast-door').count() === 1, 'Company › Profile › Reviews: the door to Request reviews on Qanvast Ops (the Owner)')
    await d.getByTestId('review-qanvast-request').click(); await settle(d, 1800)
    ok(new URL(d.url()).pathname === '/qanvast-ops/reviews' && await d.getByRole('dialog', { name: 'Request reviews' }).count() === 1, '…it opens Request reviews')
    for (const [from, want] of [['/qanvast-ops/credits', '/qanvast-ops/credits'], ['/qanvast-ops/credits/transactions', '/qanvast-ops/credits/transactions'], ['/qanvast-ops/credits/contracts', '/qanvast-ops/credits/contracts'], ['/qanvast-ops/reviews', '/qanvast-ops/reviews'], ['/qanvast-ops/reviews/feedback', '/qanvast-ops/reviews/feedback'], ['/qanvast-ops/leads', '/qanvast-ops'], ['/qanvast-ops/credits/leads', '/qanvast-ops'], ['/qanvast-ops/credits/packages', '/qanvast-ops/credits/contracts']]) {
      const r = await chain(from)
      ok(r.status === 200 && rel(r.final) === want, `1.0’s ${from} → ${want}`, r.hops)
    }
    for (const u of ['/qanvast-ops/credits/nope', '/qanvast-ops/reviews/nope', '/qanvast-ops/credits/contracts/x']) {
      const nf = await chain(u)
      ok(nf.status === 404 && /<title>Page not found/.test(nf.body) && !/This page could not be found/.test(nf.body), `${u}: 404, the house’s page not found (refused above the loader)`)
    }
    await ctx.close()

    // ── 10 · Who sees it ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · Who sees it')
    for (const [who, label] of [['huimin', 'Admin'], ['james', 'Manager'], ['germaine', 'Designer']]) {
      as(who)
      const c = await desk(); const p = await page(c, who)
      await go(p, '/qanvast-ops/credits')
      ok(await p.getByTestId('qanvast-account-gate').count() === 1 && /Lead credits are for the studio’s Owner/.test(await text(p.getByTestId('qanvast-account-gate'))), `${label}: Lead credits shows the tab’s gate (1.0: the Owner only)`)
      await go(p, '/qanvast-ops/reviews')
      /* (S42E, call E·2 — a deliberate change of this rule) an Admin reads, replies and Requests reviews; a Manager and a Designer meet the gate */
      if (who === 'huimin') { ok(await p.getByTestId('qanvast-account-gate').count() === 0 && await p.getByTestId('reviews-request').count() === 1, `${label}: Reviews opens, with Request reviews (call E·2)`); await c.close(); continue }
      ok(await p.getByTestId('qanvast-account-gate').count() === 1 && await p.getByTestId('reviews-request').count() === 0, `${label}: Reviews too — no Request reviews`)
      if (who === 'germaine') await shot(p, '11-gate-designer-1440')
      const s2 = await search(p, 'lead credits')
      ok(!/Qanvast Ops · credits left/.test(await text(s2)), `${label}: ⌘K doesn’t offer it`)
      await p.keyboard.press('Escape')
      await go(p, '/company/profile')
      ok(await p.getByTestId('review-qanvast-door').count() === 0, `${label}: no door on Company › Profile`)
      await c.close()
    }
    as('priya')
    { const c = await desk(); const p = await page(c, 'priya'); await go(p, '/qanvast-ops/credits'); ok(await p.getByTestId('access-gate').count() === 1, 'Accounting: the house gate (Qanvast Ops isn’t theirs)'); await c.close() }
    as('dane')

    // ── 11 · Ghosts, phones and widths ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · Ghosts and widths')
    const VIEWS = [['credits', '/qanvast-ops/credits'], ['transactions', `/qanvast-ops/credits/transactions?month=${m}`], ['contracts', '/qanvast-ops/credits/contracts'], ['reviews', '/qanvast-ops/reviews'], ['ranking', '/qanvast-ops/reviews/ranking'], ['feedback', '/qanvast-ops/reviews/feedback?days=90']]
    const BLOCKS = ['account.bar', 'account.views', 'stat-tile.tiles', 'account.charts', 'plan.section', 'plan.sectionHead', 'account.columns', 'account.overview', 'account.rankCard', 'account.cards', 'account.filters', 'account.note']
    for (const [opts, tag] of [[{ viewport: { width: 1440, height: 1024 } }, '1440'], [{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '390']]) {
      for (const [k, u] of VIEWS) {
        const g = await measure(b, opts, u, BLOCKS)
        const worst = g.rows ? Math.max(0, ...g.rows.map((r) => Math.abs(r.dy))) : 999
        ok(!g.none && g.rows.length && worst <= 16, `${tag}: ${k}’s ghost sits where its page does (worst ${worst}px over ${g.rows?.length ?? 0} blocks)`, g.rows?.filter((r) => Math.abs(r.dy) > 16))
      }
    }
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const c = await phoneCtx(w, h); const p = await page(c, `phone-${w}`)
      for (const [k, u] of VIEWS) {
        await go(p, u, 1400)
        ok(await sideways(p) <= 0, `${w}: ${k} never scrolls sideways`)
        await shot(p, `12-${k}-${w}`, true)
      }
      if (w === 390) {
        await go(p, '/qanvast-ops/reviews', 1400)
        await p.getByTestId('reviews-request').tap(); await settle(p, 800)
        ok(await p.getByRole('dialog', { name: 'Request reviews' }).count() === 1 && await sideways(p) <= 0, '390: Request reviews rises as a sheet')
        await shot(p, '13-request-390')
        await p.getByRole('dialog', { name: 'Request reviews' }).getByRole('button', { name: 'Cancel' }).tap(); await settle(p, 500)
        await go(p, `/qanvast-ops/credits/transactions?month=${m}`, 1400)
        await p.getByTestId('credits-month').tap(); await settle(p, 600)
        ok(await p.locator('[role="menuitemradio"]').count() > 0 && await sideways(p) <= 0, '390: the month menu is a sheet')
        await shot(p, '14-month-sheet-390')
      }
      await c.close()
    }

    ok(!errors.length, 'no page errors', errors)
  } finally {
    const changed = putBack()
    console.log(`put back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const after = TABLES.filter((t) => hashOf(t) !== before.get(t))
    ok(!after.length, 'the scratch DB is as it was', after)
    await b.close()
  }
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
