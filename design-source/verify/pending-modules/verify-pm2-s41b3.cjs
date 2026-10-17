// Pending modules, S41b-3 · Try the tools without an account, kept at sign-up (her "please make sure nothing left behind from 1.0 to 2.0",
// 2026-10-12; the S41b data sweep's M-01 — 1.0's deployment/plg anonymous workspace). Each item asserted as the rule it builds:
//  - the rules in one Node process (pm2-s41b3-pure.mts on a copy of this DB): the switch, the signed workspace name, what the server keeps of
//    a visitor's input, the store (made only by a workspace, compare-and-set, 1.0's one-update spend under a race, expiry, the sweep's list,
//    reclaim, Reset), the per-address counts over their own windows
//  - the three tools live on the website (/site/try/leads · upload-a-quote · quote-x-ray), open SIGNED OUT, each with its own search copy,
//    canonical and breadcrumb; the module pages' Try now open them; the trial's home and each tool list the others; the sitemap and the Cookie
//    Policy name them; a page view keeps nothing (no cookie, no workspace)
//  - Leads: the studio's own form in its trial mode (no team, no document fill, no files), the form's own rules, a lead kept in the visitor's
//    workspace — never the demo's database — under a signed httpOnly cookie that lives 7 days; Remove with Undo; three, then 1.0's gate; the
//    cap held BY THE SERVER when the page thinks there is room
//  - Upload a quote: read in the browser by Create Quote's own reader and shown in its table, nothing kept until Keep; a quote is always a
//    client's (one of their leads, or Add the client with the studio's form — kept in the same go); one kept quote, then the gate; a file that
//    can't be read says why and keeps nothing; a lead holding the kept quote can't be removed (said why)
//  - Quote X-Ray: the studio's two-quote setup, the quote they kept as their side, the studio's engine on the server; one comparison, in the
//    record page's own cards, focused and in view under the site's bar; the same quote twice refused and keeps nothing; Copy the message
//  - the allowance: 1.0's token grant spent at 1.0's price for a read and a comparison (the trial's own — never a studio's AI credits)
//  - five reads a minute and 25 new workspaces a day from one address (1.0's), each refused with its words
//  - Start your studio: sign-up says what comes along; the new studio opens on its Leads with everything in it — the leads with their details,
//    the quote on its client with its lines (no AI credits spent), the comparison on its lead — each with its Activity line; the workspace and
//    its cookie go; the demo's database is untouched (every table)
//  - signing in claims too (1.0's claim-on-login) — into a studio of the visitor's; never into the demo (the work stays in the trial)
//  - the sweeps: /api/cron/anon-sweep and anon-storage-gc ask the secret, delete the workspaces past their 7 days (dead at once, swept after),
//    give the room back, and do nothing the second time (idempotent)
//  - ghosts: a slow hop shows each page's ghost with its title where the page's lands (1440 · 390 touch)
//  - no sideways scroll at 1440 · 768 · 390 · 320 (against screen.width); no page errors
//  - OFF=1 (a server started with TRIAL_TOOLS_ENABLED=false): the three pages are the site's 404; the Visualizer's trial is its own switch
// Run against `next start` (started with CRON_SECRET=<secret>) on a scratch copy of the repaired demo DB — never local.db. What it writes is
// put back in `finally` (the demo's tables, the studios made beside it, the trial store's rows).
// Usage: BASE=http://localhost:3170 CRON=<secret> NODE_PATH=<repo>/node_modules node verify-pm2-s41b3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41b3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const CRON = process.env.CRON || ''
const OFF = process.env.OFF === '1'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !OFF && (!ONLY.length || ONLY.includes(String(n)))
const REPO = path.join(__dirname, '..', '..', '..')
const HOME = `${path.resolve(DB)}.studios`
const TRIAL = `${path.resolve(DB)}.trial.db`
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sqlOn = (file, q) => execSync(`sqlite3 -cmd ".timeout 30000" "${file}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const sql = (q) => sqlOn(DB, q)
const json = (q, file = DB) => { const o = execSync(`sqlite3 -cmd ".timeout 30000" -json "${file}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return o ? JSON.parse(o) : [] }
const trialRows = () => (fs.existsSync(TRIAL) ? json('select anon_id, payload, spent_tokens, created_at, expires_at from anon_workspaces', TRIAL) : [])
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : '') } }
const made = () => { try { return fs.readdirSync(HOME).filter((f) => /\.db$/.test(f)) } catch { return [] } }
const KITCHEN = path.join(REPO, 'public', 'site', 'try', 'samples', 'kitchen-quote.xlsx')
const URBAN = path.join(REPO, 'public', 'site', 'try', 'samples', 'urban-nest-quote.xlsx')
const PDF = path.join(REPO, 'public', 'uat-files', 'urban-nest-competitor-quote.pdf')
/** the workspace a browser's om_anon names (its signed body, read here without the key — the server checks the signature) */
const idOf = (c) => { try { return JSON.parse(Buffer.from(c.value.split('.')[0], 'base64url').toString('utf8')).id } catch { return null } }
const payloadOf = (id) => { const r = trialRows().find((x) => x.anon_id === id); return r ? { ...r, payload: JSON.parse(r.payload) } : null }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  if (!OFF && fs.existsSync(HOME) && made().length) { console.log(`  ✗ ${HOME} already holds studios — start from a clean scratch copy`); process.exit(1) }
  /* the trial store beside the scratch DB starts empty (the probe's own; its rows are cleared again at the end) */
  if (fs.existsSync(TRIAL)) sqlOn(TRIAL, 'delete from anon_workspaces')
  /* the app's own lazy writes first (the credits' month roll on a studio page), so the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const hashes = () => new Map(TABLES.map((t) => [t, hashOf(t)]))
  const before = hashes()
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return changed
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    const f = path.join(os.tmpdir(), `pm2-s41b3-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f)
    return changed
  }
  /* a browser that signed out (the site is anyone's); the site's first-visit welcome already seen */
  const signedOut = async (o = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
    await ctx.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
    await ctx.addInitScript(() => { try { sessionStorage.setItem('om.site.intro', '1') } catch {} })
    return ctx
  }
  const phone = (w = 390, h = 844, o = {}) => signedOut({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, ...o })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 220)}`)); return p }
  const go = async (p, url, ms = 500) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(ms); return r }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re) => { for (let i = 0; i < 40; i++) { const t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(200) } return snackText(p) }
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 150)) } }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const anon = async (ctx) => (await ctx.cookies(BASE + '/site/try')).find((c) => c.name === 'om_anon') ?? null
  const allowance = (p) => text(p.getByTestId('trial-allowance'))
  const gateText = (p) => text(p.getByTestId('trial-gate'))
  const closeGate = async (p) => { await p.getByTestId('trial-gate-later').click(); await p.waitForTimeout(400) }
  /** the studio's Create New Lead form, filled and saved; answers the form (still open on a refusal) */
  const addLead = async (p, o) => {
    await p.getByTestId('trial-lead-add').first().click()
    const dlg = p.getByRole('dialog').filter({ hasText: 'Create New Lead' })
    await dlg.waitFor({ timeout: 6000 })
    await dlg.getByLabel('Lead name', { exact: false }).first().fill(o.name)
    await dlg.getByLabel('Lead phone number', { exact: false }).first().fill(o.phone)
    if (o.source) { await dlg.getByLabel('Lead source').click(); await p.waitForTimeout(250); await p.getByRole('option', { name: o.source, exact: true }).or(p.getByRole('menuitemradio', { name: o.source, exact: true })).or(p.getByRole('menuitem', { name: o.source, exact: true })).first().click(); await p.waitForTimeout(200) }
    await dlg.getByRole('button', { name: 'Create', exact: true }).click()
    await p.waitForTimeout(1200)
    return dlg
  }
  const leadRow = (p, name) => p.locator(`[data-testid="trial-leads"] [data-lead="${name}"]`)
  let studioRan = false
  const OWNER = { studio: 'Trial Tools Studio', name: 'Mei Ling Tan', phone: '93336677' }

  try {
    /* ── §0 the rules, in one Node process ── */
    if (want(0)) {
      console.log('\n§0 the rules, in one process (pm2-s41b3-pure.mts on a copy of this DB)')
      const copy = path.join(os.tmpdir(), `pm2-s41b3-pure-${process.pid}.db`)
      fs.copyFileSync(DB, copy)
      let out = ''
      try { out = execSync('npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s41b3-pure.mts', { cwd: REPO, env: { ...process.env, DATABASE_URL: `file:${copy}`, NODE_ENV: 'test' }, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }
      catch (e) { out = String(e.stdout ?? ''); if (!out) ok(false, 'the rules script ran', String(e.stderr ?? e).slice(0, 600)) }
      for (const line of out.split('\n').filter((l) => l.startsWith('{'))) {
        const d = JSON.parse(line)
        if (d.done) { ok(d.fail === 0 && d.pass >= 30, `the rules script: ${d.pass} passed · ${d.fail} failed`); continue }
        ok(d.ok, `rule · ${d.label}`, d.extra)
      }
      for (const f of [copy, `${copy}-wal`, `${copy}-shm`, `${copy}.trial.db`, `${copy}.trial.db-wal`, `${copy}.trial.db-shm`]) { try { fs.unlinkSync(f) } catch { /* gone */ } }
    }

    if (OFF) {
      console.log('\n§off the tools switched off (TRIAL_TOOLS_ENABLED=false)')
      const ctx = await signedOut(); const p = await page(ctx, 'off')
      for (const u of ['/site/try/leads', '/site/try/upload-a-quote', '/site/try/quote-x-ray']) {
        const r = await p.goto(BASE + u, { waitUntil: 'networkidle' })
        ok(r.status() === 404 && /This page doesn’t exist/.test(await text(p.locator('main'))), `${u}: the site's own 404 (${r.status()})`)
      }
      const v = await p.goto(BASE + '/site/try', { waitUntil: 'networkidle' })
      ok(v.status() === 200 && (await p.getByTestId('trial-other').count()) === 0, 'the AI Visualizer’s trial keeps its own switch — open, and it lists no tool that is off')
      /* (the sitemap and the module pages' Try now are built with the site — they follow the switch as it was set for the build, S36's rule:
         set TRIAL_TOOLS_ENABLED for the build and the server alike; this server was started with it off on a build made with it on, so only
         what is answered at request time is checked here) */
      ok(!fs.existsSync(TRIAL) || trialRows().length === 0, 'nothing kept')
      await ctx.close()
    }

    /* ── §1 the pages ── */
    if (want(1)) {
      console.log('\n§1 the pages: open signed out, each with its own search copy, its doors and the other tools')
      const ctx = await signedOut(); const p = await page(ctx, '§1')
      const PAGES = [
        ['/site/try/leads', 'Try Leads — free, no sign-up', 'Add a lead, the way your studio will.', /Free · no sign-up · 3 of 3 free leads left/i, '/site/platform/leads'],
        ['/site/try/upload-a-quote', 'Try Upload a quote — free, no sign-up', 'See a quote read into lines.', /Free · no sign-up · 1 free quote to keep/i, '/site/platform/upload-a-quote'],
        ['/site/try/quote-x-ray', 'Try Quote X-Ray — free, no sign-up', 'See where your quote wins.', /Free · no sign-up · 1 free comparison/i, '/site/platform/upload-a-quote'],
      ]
      for (const [url, title, h1, eyebrow, back] of PAGES) {
        const r = await go(p, url, 200)
        const t = await p.evaluate(() => ({ h1: document.querySelectorAll('h1').length, h1Text: document.querySelector('h1')?.textContent ?? '', title: document.title,
          desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '', canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
          ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(' '), og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '' }))
        ok(r.status() === 200 && !/\/sign-in/.test(p.url()), `${url}: opens signed out (${r.status()})`)
        ok(t.title.startsWith(title) && /\| OpenMaison$/.test(t.title) && t.desc.length > 40 && t.canonical.endsWith(url), `…its own title, description and canonical (“${t.title}”)`)
        ok(t.h1 === 1 && t.h1Text === h1, `…one heading: “${t.h1Text}”`)
        ok(/BreadcrumbList/.test(t.ld) && /card\/site\/try-/.test(t.og), '…breadcrumb data and its own link-preview card')
        ok(eyebrow.test(await allowance(p)), `…the allowance: “${await allowance(p)}”`)
        ok((await p.getByTestId('trial-crumb').getAttribute('href')) === back, `…its crumb goes back to its site page (${back})`)
        const others = await p.getByTestId('trial-other').evaluateAll((els) => els.map((e) => e.getAttribute('data-tool')))
        ok(others.length === 3 && others.includes('visualizer'), `…and lists the three other tools to try (${others.join(', ')})`)
        ok(/Start your studio/.test(await text(p.getByTestId('trial-start-studio'))) && /Start your studio to keep what you make here/.test(await text(p.getByTestId('trial-keep-body'))), '…and says what keeps the work before any wall (run-up, not ambush)')
      }
      ok(!(await anon(ctx)) && trialRows().length === 0, 'looking keeps nothing — no cookie, no workspace (1.0: a page view mints none)')
      await go(p, '/site/try', 300)
      const home = await p.getByTestId('trial-other').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
      ok(['/site/try/leads', '/site/try/upload-a-quote', '/site/try/quote-x-ray'].every((h) => home.includes(h)), 'the trial’s home (the AI Visualizer) lists the three under it', home)
      for (const [mod, to] of [['leads', '/site/try/leads'], ['upload-a-quote', '/site/try/upload-a-quote']]) {
        await go(p, `/site/platform/${mod}`, 200)
        ok((await p.getByTestId('module-try').getAttribute('href')) === to && (await p.getByTestId('module-closing-try').getAttribute('href')) === to, `${mod}’s site page says Try now — top and close — and opens its tool (1.0’s TRY_NOW_DESTINATIONS)`)
      }
      const map = await (await p.request.get(BASE + '/sitemap.xml')).text()
      ok(['/site/try/leads', '/site/try/upload-a-quote', '/site/try/quote-x-ray'].every((u) => map.includes(u)), 'the sitemap lists the three')
      await go(p, '/site/cookies', 200)
      ok(/om_anon/.test(await text(p.locator('main'))), 'the Cookie Policy names the workspace’s cookie (om_anon)')
      await ctx.close()
    }

    /* ── §2…§4 one visitor's whole trial (context M), then §7 their studio ── */
    const M = await signedOut({ permissions: ['clipboard-read', 'clipboard-write'] })
    const m = await page(M, 'M')
    let leadIds = {}
    if (want(2)) {
      console.log('\n§2 Leads: the studio’s own form, kept in the visitor’s workspace')
      await go(m, '/site/try/leads', 300)
      ok(await m.getByTestId('trial-leads-empty').count() === 1, 'an empty start: “No leads yet” with Create New Lead')
      await m.getByTestId('trial-lead-add').first().click()
      const dlg = m.getByRole('dialog').filter({ hasText: 'Create New Lead' }); await dlg.waitFor()
      const formText = await dlg.innerText()
      ok(!/Assign member|Fill from a document|Attach files/.test(formText), 'the form in its trial mode: no members to assign, no document fill, no files (nothing to keep a file in)')
      await dlg.getByRole('button', { name: 'Create', exact: true }).click(); await m.waitForTimeout(500)
      ok(/required/i.test(await dlg.innerText()) && trialRows().length === 0, 'the form’s own rules: an empty save says what’s needed — and nothing is kept')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await m.waitForTimeout(400)
      await shot(m, 's41b3-leads-empty-1440')
      await addLead(m, { name: 'hana rahman', phone: '91110001', source: 'Instagram' })
      ok(await leadRow(m, 'Hana Rahman').count() === 1, 'a lead is added — its row on the listing’s table, the name as the studio writes it (“Hana Rahman”)')
      ok(/Hana Rahman added — it comes with you when you start your studio/.test(await waitSnack(m, /added/)), 'the snackbar says it comes along')
      const c = await anon(M)
      ok(!!c && c.httpOnly && c.sameSite === 'Lax' && c.path === '/' && Math.abs((c.expires * 1000 - Date.now()) / 86_400_000 - 7) < 0.1, `its workspace is named by a signed, httpOnly cookie for 7 days (om_anon · ${c ? ((c.expires * 1000 - Date.now()) / 86_400_000).toFixed(2) : '-'} days)`)
      const w = payloadOf(idOf(c))
      ok(!!w && w.payload.leads.leads.length === 1 && w.payload.leads.leads[0].data.source === 'Instagram' && w.spent_tokens === 0, 'the lead is in the visitor’s workspace (1.0’s anon_workspaces, beside the demo’s database), nothing spent')
      ok(Number(sql(`select count(*) from leads where name = 'Hana Rahman' or phone = '91110001'`)) === 0, '…and never in the demo’s')
      ok(/2 of 3 free leads left/i.test(await allowance(m)), 'the allowance: “2 of 3 free leads left”')
      await m.reload({ waitUntil: 'networkidle' }); await m.waitForTimeout(400)
      ok(await leadRow(m, 'Hana Rahman').count() === 1, 'a reload keeps it (read from the workspace)')
      await addLead(m, { name: 'Daniel Lim', phone: '91110002' })
      await leadRow(m, 'Daniel Lim').locator('[data-testid="trial-lead-remove"]').click(); await m.waitForTimeout(600)
      ok(await leadRow(m, 'Daniel Lim').count() === 0 && /Daniel Lim removed/.test(await waitSnack(m, /removed/)), 'Remove: gone at once, one sentence with Undo')
      ok(payloadOf(idOf(c)).payload.leads.leads.length === 1, '…gone from the workspace')
      await m.locator('[role="status"][aria-live="polite"]').last().getByRole('button', { name: 'Undo' }).click(); await m.waitForTimeout(900)
      ok(await leadRow(m, 'Daniel Lim').count() === 1 && payloadOf(idOf(c)).payload.leads.leads.map((l) => l.data.name).join() === 'Hana Rahman,Daniel Lim', 'Undo puts it back where it was')
      /* another tab adds the third lead while this page still thinks there is room */
      const row = trialRows().find((x) => x.anon_id === idOf(c))
      const pl = JSON.parse(row.payload)
      pl.leads.leads.push({ id: '00000000-0000-4000-8000-000000000003', at: Date.now(), data: { ...pl.leads.leads[0].data, name: 'Grace Wong', phone: '91110003', source: 'Referral' } })
      sqlOn(TRIAL, `update anon_workspaces set payload = '${JSON.stringify(pl).replace(/'/g, "''")}' where anon_id = '${row.anon_id}'`)
      ok(/1 of 3 free leads left/i.test(await allowance(m)), '(this page still says one is left — another tab has just added the third)')
      const dlg2 = await addLead(m, { name: 'Over The Limit', phone: '91110007' })
      ok(/You’ve added 3 leads — the free trial’s limit/.test(await gateText(m)) && (await dlg2.count()) === 0, 'the server holds the cap: the fourth is refused with 1.0’s gate, over the page (no redirect)')
      ok(payloadOf(idOf(c)).payload.leads.leads.length === 3 && !JSON.stringify(payloadOf(idOf(c)).payload).includes('Over The Limit'), '…and nothing past three is kept')
      await shot(m, 's41b3-leads-gate-1440', false)
      await closeGate(m)
      ok(/\/site\/try\/leads$/.test(m.url()), 'Not now leaves the visitor where they were')
      await m.reload({ waitUntil: 'networkidle' }); await m.waitForTimeout(400)
      ok(/No free leads left/i.test(await allowance(m)) && (await m.locator('[data-testid="trial-leads"] [data-lead]').count()) === 3, 'reloaded: “No free leads left”, three leads')
      await m.getByTestId('trial-lead-add').first().click(); await m.waitForTimeout(400)
      ok(/the free trial’s limit/.test(await gateText(m)) && (await m.getByRole('dialog').filter({ hasText: 'Create New Lead' }).count()) === 0, 'Create New Lead now opens the gate, not the form')
      await closeGate(m)
      await shot(m, 's41b3-leads-1440')
      leadIds = Object.fromEntries(payloadOf(idOf(c)).payload.leads.leads.map((l) => [l.data.name, l.id]))
    }

    if (want(3)) {
      console.log('\n§3 Upload a quote: read in the browser, kept on a client')
      await go(m, '/site/try/upload-a-quote', 300)
      const c = await anon(M)
      await m.getByTestId('trial-quote-sample').click()
      await m.getByTestId('trial-quote-preview').waitFor({ timeout: 8000 }); await m.waitForTimeout(400)
      ok(/8 lines read from Kitchen quote\.xlsx · S\$17,550\.00/.test(await text(m.getByTestId('trial-quote-read'))), 'the sample is read in this browser by Create Quote’s own reader: “8 lines read from Kitchen quote.xlsx · S$17,550.00”, the lines in its table')
      ok(/Read in your browser — nothing is kept until you keep it/.test(await text(m.getByTestId('trial-quote-preview'))) && !payloadOf(idOf(c)).payload['quote-digitizer'] && payloadOf(idOf(c)).spent_tokens === 0, '…nothing kept and nothing spent yet')
      ok(await m.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'trial-quote-read-title', 'the read takes the focus (its title), in view')
      await m.getByTestId('trial-quote-keep').click(); await m.waitForTimeout(500)
      ok(/Pick whose quote it is first/.test(await text(m.getByTestId('trial-quote-lead'))) && !payloadOf(idOf(c)).payload['quote-digitizer'], 'Keep with no client says to pick one first — a quote is always a client’s')
      await m.getByTestId('trial-quote-lead').getByRole('radio', { name: 'Daniel Lim' }).click()
      await m.getByTestId('trial-quote-keep').click(); await m.waitForTimeout(1200)
      const w = payloadOf(idOf(c))
      const doc = w.payload['quote-digitizer']?.documents?.[0]
      ok(!!doc && doc.leadId === leadIds['Daniel Lim'] && doc.count === 8 && doc.totalMinor === 1_755_000 && doc.file === 'Kitchen quote.xlsx', 'Keep: the lines (never the file) are kept as Daniel Lim’s quote in the workspace')
      ok(w.spent_tokens === 5, `…at 1.0’s price for a quote read, from the trial’s own allowance (${w.spent_tokens} of 50)`)
      ok(/Kept — it starts as Daniel Lim’s quote in your studio when you start it/.test(await text(m.getByTestId('trial-quote-kept'))) && /Kept as Daniel Lim’s quote/.test(await waitSnack(m, /Kept as/)), 'it says where it goes')
      ok(/Your free quote is kept/i.test(await allowance(m)), 'the allowance: “Your free quote is kept”')
      await m.getByTestId('trial-quote-lead').getByRole('radio', { name: 'Hana Rahman' }).click(); await m.waitForTimeout(900)
      ok(payloadOf(idOf(c)).payload['quote-digitizer'].documents[0].leadId === leadIds['Hana Rahman'], 'whose it is can change — to another of their leads')
      await m.getByTestId('trial-quote-lead').getByRole('radio', { name: 'Daniel Lim' }).click(); await m.waitForTimeout(900)
      await m.reload({ waitUntil: 'networkidle' }); await m.waitForTimeout(400)
      ok(/Daniel Lim’s quote/.test(await text(m.getByTestId('trial-quote-kept'))) && (await m.locator('[data-testid="trial-quote-read"] [role="row"]').count()) === 9, 'a reload keeps it, its eight lines listed')
      await m.getByTestId('trial-quote-another').click(); await m.waitForTimeout(400)
      ok(/You’ve kept your free quote/.test(await gateText(m)), 'Read another quote: 1.0’s gate — one kept quote')
      await closeGate(m)
      await shot(m, 's41b3-quote-kept-1440')
      /* the lead the quote is on stays */
      await go(m, '/site/try/leads', 300)
      await leadRow(m, 'Daniel Lim').locator('[data-testid="trial-lead-remove"]').click(); await m.waitForTimeout(700)
      ok(await leadRow(m, 'Daniel Lim').count() === 1 && /Daniel Lim stays — your kept quote is theirs/.test(await waitSnack(m, /stays/)) && payloadOf(idOf(c)).payload.leads.leads.length === 3, 'a lead holding the kept quote can’t be removed — said why, the row back')

      /* a second visitor with no leads: a file that can't be read, then Add the client (the lead and the quote in one go) */
      const Q = await signedOut(); const q = await page(Q, '§3b')
      await go(q, '/site/try/upload-a-quote', 300)
      await q.getByTestId('trial-quote-pick').locator('input[type="file"]').setInputFiles({ name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('') })
      await q.getByTestId('trial-quote-failed').waitFor({ timeout: 6000 }).catch(() => {})
      ok(/We couldn’t read notes\.csv/.test(await text(q.getByTestId('trial-quote-failed'))) && /The file has no lines we could use/.test(await text(q.getByTestId('trial-quote-pick'))) && !(await anon(Q)), 'a file with no quote lines says so — and keeps nothing (no workspace, no cookie)')
      await q.getByTestId('trial-quote-pick').locator('input[type="file"]').setInputFiles(KITCHEN)
      await q.getByTestId('trial-quote-preview').waitFor({ timeout: 8000 })
      ok(/Add the client it’s for/.test(await text(q.getByTestId('trial-quote-lead'))) && (await q.getByTestId('trial-quote-keep').count()) === 0, 'with no leads, the one filled press is Add the client')
      await q.getByTestId('trial-quote-add-client').click()
      const d = q.getByRole('dialog').filter({ hasText: 'Create New Lead' }); await d.waitFor()
      await d.getByLabel('Lead name', { exact: false }).first().fill('Siti Rahim'); await d.getByLabel('Lead phone number', { exact: false }).first().fill('91110005')
      await d.getByRole('button', { name: 'Create', exact: true }).click(); await q.waitForTimeout(1600)
      const qw = payloadOf(idOf(await anon(Q)))
      ok(qw && qw.payload.leads.leads.length === 1 && qw.payload['quote-digitizer']?.documents?.[0]?.leadId === qw.payload.leads.leads[0].id, 'the studio’s form adds the client, and the quote is kept on them in the same go')
      ok(/Siti Rahim’s quote/.test(await text(q.getByTestId('trial-quote-kept'))), '…“Kept — it starts as Siti Rahim’s quote …”')
      await Q.close()
    }

    if (want(4)) {
      console.log('\n§4 Quote X-Ray: the studio’s engine, one comparison')
      await go(m, '/site/try/quote-x-ray', 300)
      const c = await anon(M)
      ok(/Use the quote you read \(8 lines\)/.test(await text(m.getByTestId('trial-xray-use-read'))) && /Kitchen quote\.xlsx · 8 lines/.test(await text(m.getByTestId('trial-xray-read-note'))), 'their side to add; your side: the quote they kept (8 lines)')
      /* the same quote on both sides is refused, and keeps nothing */
      await m.getByTestId('trial-xray-use-read').getByRole('radio', { name: 'Upload a file' }).click(); await m.waitForTimeout(300)
      const inputs = m.getByTestId('trial-xray-setup').locator('input[type="file"]')
      await inputs.nth(0).setInputFiles(KITCHEN); await m.waitForTimeout(1200)
      await m.getByTestId('trial-xray-setup').locator('input[type="file"]').nth(0).setInputFiles(KITCHEN); await m.waitForTimeout(1200)
      await m.getByTestId('trial-xray-compare').click(); await m.waitForTimeout(1200)
      ok(/These are the same quote — add the other studio’s/.test(await text(m.getByTestId('trial-xray-setup'))) && !payloadOf(idOf(c)).payload['quote-xray'] && payloadOf(idOf(c)).spent_tokens === 5, 'one quote on both sides is refused — nothing kept, nothing spent')
      /* their quote, against the kept one */
      await m.getByTestId('trial-xray-use-read').getByRole('radio', { name: /Use the quote you read/ }).click(); await m.waitForTimeout(300)
      await m.getByTestId('trial-xray-setup').locator('[aria-label^="Remove"]').first().click().catch(() => {}); await m.waitForTimeout(300)
      await m.getByTestId('trial-xray-setup').locator('input[type="file"]').first().setInputFiles(URBAN); await m.waitForTimeout(1500)
      const studioField = m.getByLabel('Their studio’s name (optional)')
      if (await studioField.count()) await studioField.fill('Urban Nest')
      await m.getByTestId('trial-xray-lead').getByRole('radio', { name: 'Hana Rahman' }).click()
      await shot(m, 's41b3-xray-setup-1440')
      await m.getByTestId('trial-xray-compare').click()
      await m.getByTestId('trial-xray-reading').waitFor({ timeout: 10000 }); await m.waitForTimeout(800)
      for (const id of ['xray-summary', 'xray-points', 'xray-brands', 'xray-items']) ok(await m.getByTestId(id).count() === 1, `the reading in the record page’s own cards: ${id}`)
      ok(/Urban Nest/.test(await text(m.getByTestId('xray-summary'))) && Number((await text(m.getByTestId('xray-items'))).match(/(\d+) compared/)?.[1] ?? 0) >= 8, `…their studio named, every line compared (“${(await text(m.getByTestId('xray-items'))).match(/\d+ compared/)?.[0]}”)`)
      const focus = await m.evaluate(() => ({ id: document.activeElement?.getAttribute('data-testid'), top: document.activeElement?.getBoundingClientRect().top ?? -1 }))
      ok(focus.id === 'trial-xray-reading-title' && focus.top >= 60 && focus.top < 400, `the reading takes the focus, in view under the site’s bar (its title at ${Math.round(focus.top)})`)
      const w = payloadOf(idOf(c))
      const x = w.payload['quote-xray']?.xrays?.[0]
      ok(!!x && x.leadId === leadIds['Hana Rahman'] && x.otherStudio === 'Urban Nest' && x.yours.length === 8 && x.theirs.length >= 8, 'kept in the workspace: both sides’ lines, the reading, for Hana Rahman')
      ok(w.spent_tokens === 10, `…at the same price, from the trial’s own allowance (${w.spent_tokens} of 50)`)
      await m.getByTestId('trial-xray-copy').click(); await m.waitForTimeout(500)
      const clip = await m.evaluate(() => navigator.clipboard.readText()).catch(() => '')
      ok(/Copied — paste it into WhatsApp/.test(await waitSnack(m, /Copied/)) && /Hi Hana/.test(clip) && !/Urban Nest/.test(clip), 'Copy the message: the draft to the client by their name, never naming the other studio (1.0’s rule)')
      await m.getByTestId('trial-xray-another').click(); await m.waitForTimeout(400)
      ok(/You’ve had your free comparison/.test(await gateText(m)), 'Compare another: 1.0’s gate')
      await closeGate(m)
      await shot(m, 's41b3-xray-reading-1440')
      await m.reload({ waitUntil: 'networkidle' }); await m.waitForTimeout(400)
      ok(await m.getByTestId('xray-summary').count() === 1 && /Your free comparison is used/i.test(await allowance(m)), 'a reload keeps the reading; “Your free comparison is used”')
      await go(m, '/site/try/leads', 300)
      await leadRow(m, 'Hana Rahman').locator('[data-testid="trial-lead-remove"]').click(); await m.waitForTimeout(700)
      ok(await leadRow(m, 'Hana Rahman').count() === 1 && /Hana Rahman stays — your comparison is theirs/.test(await waitSnack(m, /stays/)), 'a lead a comparison was made for stays too — said why')
      /* another studio's PDF quote is read by S21's reader, in the visitor's browser */
      const X = await signedOut(); const xp = await page(X, '§4 pdf')
      await go(xp, '/site/try/quote-x-ray', 300)
      await xp.getByTestId('trial-xray-setup').locator('input[type="file"]').first().setInputFiles(PDF)
      await xp.getByTestId('xray-file').first().waitFor({ timeout: 10000 }); await xp.waitForTimeout(1800)
      const tile = await text(xp.getByTestId('xray-file').first())
      ok(/23 lines/.test(tile) && /40,210/.test(tile) && /Urban Nest/i.test(await xp.getByLabel('Their studio’s name (optional)').inputValue().catch(() => '')), `a PDF quote is read by the studio’s own PDF reader (S21) — its lines, its total and its studio’s name (“${tile.slice(0, 80)}”)`)
      ok(!(await anon(X)), '…in the browser: reading keeps nothing')
      await X.close()
    }

    if (want(5)) {
      console.log('\n§5 the per-address limits (each visitor here comes from its own address)')
      const F = await signedOut({ extraHTTPHeaders: { 'x-forwarded-for': `203.0.113.${60 + (process.pid % 30)}` } }); const f = await page(F, '§5 fast')
      await go(f, '/site/try/quote-x-ray', 300)
      const inp = () => f.getByTestId('trial-xray-setup').locator('input[type="file"]')
      await inp().nth(0).setInputFiles(KITCHEN); await f.waitForTimeout(1200); await inp().nth(0).setInputFiles(KITCHEN); await f.waitForTimeout(1200)
      const said = []
      for (let i = 0; i < 6; i++) { await f.getByTestId('trial-xray-compare').click(); await f.waitForTimeout(700); said.push((await text(f.getByTestId('trial-xray-setup'))).match(/These are the same quote|going a little fast/)?.[0] ?? '?') }
      ok(said.slice(0, 5).every((s) => s === 'These are the same quote') && said[5] === 'going a little fast', `five reads a minute from one address, the sixth “You’re going a little fast …” (1.0’s) — ${said.join(' · ')}`)
      ok(!(await anon(F)), '…and a refused comparison never starts a workspace')
      await F.close()

      const addr = `198.51.100.${10 + (process.pid % 200)}`
      const D = await signedOut({ extraHTTPHeaders: { 'x-forwarded-for': addr } }); const d = await page(D, '§5 day')
      let added = 0, refused = ''
      for (let i = 0; i < 26; i++) {
        await D.clearCookies(); await D.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
        await go(d, '/site/try/leads', 150)
        const dlg = await addLead(d, { name: `Visitor ${i + 1}`, phone: `9${String(1000000 + i).slice(-7)}` })
        if (await dlg.count()) { refused = await waitSnack(d, /Too many/); await dlg.getByRole('button', { name: 'Cancel' }).click().catch(() => {}) }
        else added++
      }
      ok(added === 25 && /Too many free trials from this address today — please try again tomorrow, or start your studio/.test(refused), `25 new workspaces a day from one address (1.0’s IP ceiling), the 26th refused with its words (${added} made)`)
      await D.close()
      /* those 25 workspaces are the sweep's to tidy in their time — gone now, so the later counts read this visitor alone */
      sqlOn(TRIAL, `delete from anon_workspaces where payload like '%Visitor %'`)
    }

    /* ── §6 widths and shots, on the full pages and an empty one ── */
    if (want(6)) {
      console.log('\n§6 every width: no sideways scroll (against screen.width); shots')
      const cookies = await M.cookies()
      for (const [w, h, touch] of [[1440, 1024, false], [768, 1024, false], [768, 1024, true], [390, 844, true], [320, 640, true]]) {
        const ctx = touch ? await phone(w, h) : await signedOut({ viewport: { width: w, height: h } })
        await ctx.addCookies(cookies.filter((c) => c.name === 'om_anon'))
        const p = await page(ctx, `§6 ${w}`)
        for (const u of ['leads', 'upload-a-quote', 'quote-x-ray']) {
          await go(p, `/site/try/${u}`, 400)
          const over = await sideways(p)
          ok(over <= 0, `${w}${touch ? ' touch' : ''} · /site/try/${u} (full): no sideways scroll (${over})`)
          if (w === 390 || w === 320) await shot(p, `s41b3-${u}-${w}`)
        }
        await ctx.close()
      }
      const E = await phone(320, 640); const e = await page(E, '§6 empty')
      for (const u of ['leads', 'upload-a-quote', 'quote-x-ray']) { await go(e, `/site/try/${u}`, 300); ok(await sideways(e) <= 0, `320 touch · /site/try/${u} (a first visit): no sideways scroll`) }
      await E.close()
      const P = await phone(390, 844); await P.addCookies(cookies.filter((c) => c.name === 'om_anon')); const pp = await page(P, '§6 390')
      await go(pp, '/site/try/leads', 300)
      const head = await pp.locator('[data-testid="trial-leads"] h2').first().boundingBox()
      const add = await pp.getByTestId('trial-lead-add').first().boundingBox()
      ok(head && add && add.y > head.y + 40 && add.width > 300, 'a phone: the leads’ title and line take the width; Create New Lead sits under the cards at full width')
      await P.close()
    }

    /* ── §7 Start your studio: everything comes along ── */
    if (want(7)) {
      console.log('\n§7 Start your studio: what was made moves into the new studio')
      const dbBefore = hashes()
      studioRan = true
      await go(m, '/site/try/leads', 300)
      const c0 = await anon(M)
      await m.getByTestId('trial-start-studio').click()
      await m.waitForURL(/\/sign-up/, { timeout: 15000 }); await m.waitForLoadState('networkidle'); await m.waitForTimeout(600)
      ok(/\/sign-up\?from=try$/.test(m.url()), 'Start your studio opens sign-up')
      ok(/3 leads, a quote and a Quote X-Ray reading from the free trial come with you — they move into your studio/.test(await text(m.getByTestId('sign-up-trial-work'))), 'sign-up says what comes along: “3 leads, a quote and a Quote X-Ray reading from the free trial come with you …”')
      await shot(m, 's41b3-sign-up-1440', false)
      await m.locator('[data-testid="sign-up-kind"][data-kind="studio"] button').click(); await m.getByTestId('sign-up-continue').click(); await m.waitForTimeout(500)
      for (const [label, v] of [['Studio name', OWNER.studio], ['Your name', OWNER.name], ['Mobile number', OWNER.phone]]) await m.getByLabel(label, { exact: true }).fill(v)
      await m.getByTestId('sign-up-send').click(); await m.waitForTimeout(1200)
      await m.getByTestId('sign-up-digit').first().click(); await m.keyboard.type('123456'); await m.waitForTimeout(200)
      await m.getByTestId('sign-up-go').click()
      await m.waitForURL(/\/leads$/, { timeout: 30000 }).catch(() => {})
      await m.waitForLoadState('networkidle').catch(() => {}); await m.waitForTimeout(2500)
      ok(/\/leads$/.test(new URL(m.url()).pathname), `the new studio opens on its Leads (${new URL(m.url()).pathname})`)
      ok(/3 leads, a quote and a Quote X-Ray reading from your free trial are in your studio/.test(await waitSnack(m, /free trial/)), 'and says it once: “3 leads, a quote and a Quote X-Ray reading from your free trial are in your studio”')
      ok(made().length === 1, 'the studio was made beside the demo (its own database)')
      const S = path.join(HOME, made()[0] ?? 'none.db')
      const leads = json(`select id, name, phone, source, stage from leads order by name`, S)
      ok(leads.map((l) => `${l.name}:${l.phone}:${l.source}:${l.stage}`).join(' | ') === 'Daniel Lim:91110002:Others:New | Grace Wong:91110003:Referral:New | Hana Rahman:91110001:Instagram:New', 'the three leads, with their numbers and sources, at New', leads)
      const dan = leads.find((l) => l.name === 'Daniel Lim')?.id, far = leads.find((l) => l.name === 'Hana Rahman')?.id
      const qs = json(`select id, lead_id, number from quotes`, S)
      const items = Number(sqlOn(S, `select count(*) from quote_items where quote_id = '${qs[0]?.id}' and kind <> 'group'`))
      ok(qs.length === 1 && qs[0].lead_id === dan && items === 8, `the kept quote is Daniel Lim’s quote, its eight lines (${qs[0]?.number})`, { qs, items })
      ok(Number(sqlOn(S, `select count(*) from credit_ledger where credits < 0`)) === 0, 'bringing it in spends none of the studio’s AI credits (the trial read was the trial’s)')
      const xr = json(`select lead_id, other_studio, engine from quote_comparisons`, S)
      ok(xr.length === 1 && xr[0].lead_id === far && xr[0].other_studio === 'Urban Nest', 'the comparison waits in Quote X-Ray, for Hana Rahman', xr)
      const ev = json(`select lead_id, json_extract(detail, '$.kind') kind from lead_events where kind = 'trial_claimed'`, S)
      ok(ev.length === 5 && ev.filter((e) => e.kind === 'lead').length === 3 && ev.some((e) => e.kind === 'quote' && e.lead_id === dan) && ev.some((e) => e.kind === 'reading' && e.lead_id === far), 'each piece with its Activity line (three leads, the quote, the reading)', ev)
      ok(!(await anon(M)) && !trialRows().some((r) => r.anon_id === idOf(c0)), 'the workspace and its cookie go once everything is in (1.0: only after a full claim)')
      const changed = TABLES.filter((t) => hashOf(t) !== dbBefore.get(t))
      ok(changed.length === 0, `the demo’s database is untouched — every table as it was (${changed.join(', ') || 'none changed'})`)
      await go(m, `/leads/${dan}/activity`, 800)
      const act = await text(m.locator('main'))
      ok(/brought in the quote read from “Kitchen quote\.xlsx” in the free trial — OM-\d+, 8 lines/.test(act) && /brought the lead in from the free trial, where it was added on/.test(act), 'Daniel Lim’s Activity says where the lead and the quote came from')
      await shot(m, 's41b3-studio-activity-1440', false)
      await go(m, `/quotes/${qs[0]?.id}`, 1500)
      const names = await m.getByLabel('Item name', { exact: true }).evaluateAll((els) => els.map((e) => e.value)).catch(() => [])
      ok(names.includes('Hacking of kitchen floor and wall tiles') && names.length === 8, `the quote opens in the editor with its eight lines (${names.length})`)
      await go(m, '/quote-x-ray', 800)
      ok(/Your 1 comparison is kept/.test(await text(m.locator('main'))), 'Quote X-Ray (Pro) keeps the comparison on Free: “Your 1 comparison is kept”')
      await go(m, '/leads', 600)
      await shot(m, 's41b3-studio-leads-1440', false)
    }

    /* ── §8 signing in claims too — never into the demo ── */
    if (want(8) && studioRan) {
      console.log('\n§8 signing in brings the trial in too — into their own studio, never the demo')
      const S = path.join(HOME, made()[0] ?? 'none.db')
      const C2 = await signedOut(); const c2 = await page(C2, '§8 in')
      await go(c2, '/site/try/leads', 300)
      await addLead(c2, { name: 'Ivan Koh', phone: '91110004' })
      await go(c2, '/sign-in', 400)
      await c2.getByLabel('Mobile number or email').fill(OWNER.phone); await c2.getByTestId('sign-in-send').click(); await c2.waitForTimeout(1000)
      await c2.getByTestId('sign-in-digit').first().click(); await c2.keyboard.type('123456'); await c2.getByTestId('sign-in-go').click()
      await c2.waitForURL((u) => !/\/sign-in/.test(u.pathname), { timeout: 20000 }).catch(() => {}); await c2.waitForTimeout(2000)
      ok(/A lead from your free trial is in your studio/.test(await waitSnack(c2, /free trial/)), 'signing in to their studio brings the trial in (1.0’s claim-on-login) and says so')
      ok(Number(sqlOn(S, `select count(*) from leads where name = 'Ivan Koh'`)) === 1 && !(await anon(C2)), '…the lead is in their studio; the workspace and its cookie gone')
      await C2.close()

      const C3 = await signedOut(); const c3 = await page(C3, '§8 demo')
      await go(c3, '/site/try/leads', 300)
      await addLead(c3, { name: 'Trial Visitor', phone: '91110006' })
      const id3 = idOf(await anon(C3))
      await go(c3, '/sign-in', 400)
      await c3.getByLabel('Mobile number or email').fill('dane@demostudio.sg'); await c3.getByTestId('sign-in-send').click(); await c3.waitForTimeout(1000)
      await c3.getByTestId('sign-in-digit').first().click(); await c3.keyboard.type('123456'); await c3.getByTestId('sign-in-go').click()
      await c3.waitForURL((u) => !/\/sign-in/.test(u.pathname), { timeout: 20000 }).catch(() => {}); await c3.waitForTimeout(2500)
      ok(Number(sql(`select count(*) from leads where name = 'Trial Visitor'`)) === 0 && Number(sql(`select count(*) from lead_events where kind = 'trial_claimed'`)) === 0, 'signing in to the demo brings nothing in — the demo is the demo')
      ok(payloadOf(id3)?.payload?.leads?.leads?.length === 1 && !!(await anon(C3)), '…the work stays in the trial, for a studio of their own')
      ok((await c3.getByTestId('studio-name').innerText().catch(() => '')) === 'Demo Studio', '(the server is back on the demo)')

      /* ── §9 the sweeps ── */
      console.log('\n§9 the sweeps: 1.0’s anon-sweep and anon-storage-gc')
      sqlOn(TRIAL, `update anon_workspaces set expires_at = ${Date.now() - 60_000} where anon_id = '${id3}'`)
      await go(c3, '/site/try/leads', 300)
      ok(await leadRow(c3, 'Trial Visitor').count() === 0 && /3 of 3 free leads left/i.test(await allowance(c3)), 'a workspace past its 7 days is gone at once — its page shows nothing, before any sweep')
      const api = c3.request
      ok((await api.get(BASE + '/api/cron/anon-sweep')).status() === 401 && (await api.get(BASE + '/api/cron/anon-storage-gc', { headers: { Authorization: 'Bearer wrong' } })).status() === 401, 'both jobs ask the scheduler’s secret')
      if (CRON) {
        const H = { headers: { Authorization: `Bearer ${CRON}` } }
        const r1 = await (await api.get(BASE + '/api/cron/anon-sweep', H)).json()
        ok(r1.ok && r1.jobs?.['trial-sweep']?.ran >= 1 && !trialRows().some((r) => r.anon_id === id3), `anon-sweep deletes the expired workspace (${JSON.stringify(r1.jobs?.['trial-sweep'])})`)
        const r2 = await (await api.post(BASE + '/api/cron/anon-sweep', H)).json()
        ok(r2.jobs?.['trial-sweep']?.ran === 0, '…a second run has nothing to do (idempotent)')
        const g1 = await (await api.get(BASE + '/api/cron/anon-storage-gc', H)).json()
        const g2 = await (await api.get(BASE + '/api/cron/anon-storage-gc', H)).json()
        ok(g1.ok && typeof g1.jobs?.['trial-files']?.ran === 'number' && g2.jobs?.['trial-files']?.ran === 0, `anon-storage-gc gives the room back, then has nothing to give (${g1.jobs?.['trial-files']?.ran} · ${g2.jobs?.['trial-files']?.ran})`)
        const all = await (await api.get(BASE + '/api/cron/run', H)).json()
        ok('trial-sweep' in (all.jobs ?? {}) && 'trial-files' in (all.jobs ?? {}), 'the five-minute run includes both')
      } else ok(false, 'start the server with CRON_SECRET and pass it as CRON=… to run the sweeps')
      await C3.close()
      /* the sign-ins above revalidated the whole app (revalidatePath('/', 'layout')) — the website's built pages stay up (S41b-3 found them 404) */
      for (const u of ['/site/platform/leads', '/site/platform/upload-a-quote', '/site/blog/open-maison-vs-houzz-pro', '/site/try/style']) {
        const st = (await (await b.newContext()).request.get(BASE + u, { headers: { cookie: 'om_seen=out' } })).status()
        ok(st === 200, `after a whole-app revalidation ${u} still opens (${st})`)
      }
      const st404 = (await (await b.newContext()).request.get(BASE + '/site/platform/nope', { headers: { cookie: 'om_seen=out' } })).status()
      ok(st404 === 404, `…and an unknown module page is still the site’s 404 (${st404})`)
    }

    /* ── §10 ghosts ── */
    if (want(10)) {
      console.log('\n§10 ghosts: on a slow network the hop shows the page’s ghost, its title where the page’s lands')
      for (const [w, touch] of [[1440, false], [390, true]]) {
        for (const [from, to] of [['/site/platform/leads', '/site/try/leads'], ['/site/try/leads', '/site/try/upload-a-quote'], ['/site/try/upload-a-quote', '/site/try/quote-x-ray']]) {
          const ctx = touch ? await phone(w) : await signedOut({ viewport: { width: w, height: 1024 } }); const p = await page(ctx, `§10 ${w}`)
          await p.route('**/*', (r) => (r.request().headers()['next-router-prefetch'] ? r.abort() : r.continue()))
          await go(p, from, 300)
          const cdp = await ctx.newCDPSession(p)
          await cdp.send('Network.enable')
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 4000, uploadThroughput: 100000 })
          await p.evaluate((t) => { window.next?.router?.push(t) }, to)
          const ghost = p.locator('[aria-busy="true"][role="status"]').first()
          const seen = await waitFor(async () => (await ghost.count()) > 0, 9000)
          const gTop = seen ? (await ghost.locator('h2').first().boundingBox().catch(() => null))?.y ?? null : null
          if (seen) await shot(p, `s41b3-ghost-${to.split('/').pop()}-${w}`, false)
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
          await waitFor(async () => (await ghost.count()) === 0, 12000)
          await p.waitForTimeout(500)
          const pTop = (await p.locator('main h1').first().boundingBox().catch(() => null))?.y ?? null
          ok(seen && gTop !== null && pTop !== null && Math.abs(gTop - pTop) <= 8, `${w}${touch ? ' touch' : ''}: ${from} → ${to}: the ghost's title at ${Math.round(gTop ?? -1)}, the page's at ${Math.round(pTop ?? -1)}`)
          await ctx.close()
        }
      }
    }

    await M.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    /* the server back on the demo before a studio's files go (a studio left open would answer every later probe) — S31's way */
    if (studioRan && made().length) {
      try {
        const C = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const c = await C.newPage()
        await c.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await c.waitForTimeout(800)
        if ((await c.getByTestId('studio-name').innerText().catch(() => '')) !== 'Demo Studio') {
          const dlg = c.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await dlg.count()) await dlg.getByRole('button', { name: 'Not now' }).click().catch(() => {})
          await c.getByTestId('studio-block').click(); await c.waitForTimeout(500)
          await c.getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: 'Demo Studio' }).click(); await c.waitForTimeout(2500)
        }
        await C.close()
      } catch (e) { console.log('  ! could not switch the server back to the demo — restart it:', String(e).slice(0, 120)) }
    }
    if (studioRan) fs.rmSync(HOME, { recursive: true, force: true })
    if (fs.existsSync(TRIAL)) sqlOn(TRIAL, 'delete from anon_workspaces')
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(still.length ? `  ✗ not as found: ${still.join(', ')}` : '  ✓ the scratch DB is as it was found (no studio beside it, no visitor’s workspace kept)')
    if (still.length) fail++
    await b.close()
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
