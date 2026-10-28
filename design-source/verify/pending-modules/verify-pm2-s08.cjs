// Pending modules, step S08 · Setting up a new studio (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// onboarding:studio-setup-wizard · onboarding:welcome-and-tips). Each item asserted as the rule it builds, never another round's count:
//  - the demo studio is set up: Settings › Studio draws no set-up list for anyone, nobody gets a welcome (every demo member has visited, R110);
//    ⌘K's "Set up your studio" (Owners and Admins only) shows it as it stands — "Your studio is set up", every step done by its record
//  - a studio that is NOT set up (built inside this probe's scratch DB: no details, logo, bank, team, published template, Price book item or
//    way leads come in; the owner owed a welcome): the owner's first visit gets one welcome — one filled button, Not now — recorded per member;
//    its button opens Settings › Studio's list with Back to where they were
//  - the list: two groups, each step open with what it is for and what happens meanwhile, the next one current; each row's one button opens
//    the page that keeps it with the way back; a step ticks itself once its page has it (the Profile's own Save; the others by their records)
//    and the next step becomes current; Hide is the member's own, with Undo; an Admin still sees it; ⌘K brings it back with Show here again;
//    a Designer never sees it, nor finds it in ⌘K; the list notes when it was first seen
//  - every step done: "Your studio is set up" once (its one filled button the first lead while there is none), then never by itself
//  - the welcome by role: a Designer's "See my leads", Accounting's "Open Finance", an Admin's "See the leads" once the studio is set up; Not
//    now records it too; a member added on Company › Members is owed theirs
//  - the Settings ghost draws the list for the member it shows to; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s08.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s08')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s08-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const setting = (key) => { const v = sql(`select value from settings where key = '${key}'`); return v ? JSON.parse(v) : null }
const writeSetting = (key, v) => sqlFile(`INSERT INTO settings (key, value, updated_at) VALUES (${lit(key)}, ${lit(JSON.stringify(v))}, strftime('%s','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;\n`)
const record = () => setting('studio_setup') ?? {}
/* (debug) LOCKS=1 says, after each section, whether the server left the file locked */
const lockCheck = (tag) => { if (!process.env.LOCKS) return; try { execSync(`sqlite3 -cmd ".timeout 2000" "${DB}" "update members set welcome_due = welcome_due where id = 'dane'"`); console.log(`    [${tag}: free · ${execSync(`lsof "${DB}" | grep -c node || true`).toString().trim()} handle(s)]`) } catch { console.log(`    [${tag}: LOCKED]`) } }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the AI credits' month roll on the first page, a transaction): done before the snapshot, so the probe's
     sqlite3 never writes while it runs and the snapshot is what the app keeps */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
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
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  /* the list itself, with the page around it: from the module head to the list's foot */
  const shotCard = async (p, n) => { const c = card(p); await c.scrollIntoViewIfNeeded(); const box = await c.boundingBox(); const vw = p.viewportSize(); await p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: true, clip: { x: 0, y: 0, width: vw.width, height: Math.ceil((box?.y ?? 0) + (await p.evaluate(() => window.scrollY)) + (box?.height ?? 600) + 48) } }) }
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const card = (p) => p.getByTestId('studio-setup')
  const welcome = (p) => p.getByRole('dialog').filter({ has: p.getByTestId('first-visit-welcome') })
  const stateOf = async (p, key) => p.getByTestId(`studio-setup-step-${key}`).getAttribute('data-state')
  const search = async (p, q) => {
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type(q, { delay: 20 }); await settle(p, 900)
    return p.getByRole('dialog', { name: /search/i }).or(p.locator('[data-global-search]')).first()
  }

  /* what the steps read, as the demo has them — put back step by step to do a step "by its record" */
  const brand0 = setting('brand'), studio0 = setting('studio'), capture0 = setting('lead_capture')
  const active0 = sql(`select group_concat(quote(id)) from members where is_active = 1 and id <> 'dane'`)
  const published0 = sql(`select group_concat(quote(id)) from quote_templates where status = 'published' and deleted_at is null`)
  const book0 = sql(`select group_concat(quote(id)) from price_book_items where deleted_at is null`)
  const freshStudio = () => {
    const brand = JSON.parse(JSON.stringify(brand0))
    brand.kit.logo = null
    Object.assign(brand.details, { address: '', uen: '', phone: '', email: '' })
    brand.details.entities = brand.details.entities.map((e, i) => (i === 0 ? { ...e, bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null, swift: '' } : e))
    writeSetting('brand', brand)
    writeSetting('studio', { ...studio0, phone: '' })
    writeSetting('lead_capture', { ...capture0, webhooks: (capture0.webhooks ?? []).map((w) => ({ ...w, active: false })), email: { ...(capture0.email ?? {}), connected: false }, meta: { ...(capture0.meta ?? {}), connected: false } })
    sql(`update members set is_active = 0 where id in (${active0})`)
    sql(`update quote_templates set status = 'draft' where id in (${published0})`)
    sql(`update price_book_items set deleted_at = strftime('%s','now') where id in (${book0})`)
    sql(`delete from settings where key = 'studio_setup'`)
    sql(`update members set welcome_due = 1 where id = 'dane'`)
  }
  const doStep = {
    logo: () => { const v = setting('brand'); v.kit.logo = brand0.kit.logo; writeSetting('brand', v) },
    bank: () => { const v = setting('brand'); const e0 = brand0.details.entities[0]; v.details.entities[0] = { ...v.details.entities[0], bankName: e0.bankName, accountName: e0.accountName, accountNo: e0.accountNo, payNow: e0.payNow }; writeSetting('brand', v) },
    team: () => sql(`update members set is_active = 1 where id in (${active0})`),
    template: () => sql(`update quote_templates set status = 'published' where id in (${published0})`),
    book: () => sql(`update price_book_items set deleted_at = NULL where id in (${book0})`),
    capture: () => writeSetting('lead_capture', capture0),
  }

  try {
    const ctx = await desk()
    const p = await page(ctx, 'desk')

    // ── 1 · The demo studio is set up ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · the demo studio: set up, every member has visited')
      ok(sql(`select count(*) from members where welcome_due = 1`) === '0' && sql(`select count(*) from members where welcomed_at is null`) === '0', 'R110: no demo member is owed a welcome, and each has a first visit')
      ok(!!record().doneAt, 'R110: the demo studio’s set-up list is finished (every step done by its record)')
      for (const m of ['dane', 'huimin', 'sarah', 'priya']) {
        as(m); await go(p, '/leads')
        ok(await welcome(p).count() === 0, `${m}: no welcome on the demo`)
      }
      as('dane'); await go(p, '/settings')
      ok(await card(p).count() === 0 && await p.getByTestId('studio-roles').count() === 1, 'Settings › Studio opens on Who may do what — no set-up list for a studio that is set up')
      const s = await search(p, 'set up your studio')
      const hit = s.getByText('Set up your studio', { exact: true })
      ok(await hit.count() >= 1, '⌘K finds “Set up your studio” for an Owner')
      await hit.first().click(); await p.waitForURL(/\/settings\?section=studio&setup=1/); await settle(p, 1200)
      ok(await card(p).getAttribute('data-mode') === 'done' && /Your studio is set up/.test(await text(card(p))) && /7 of 7 done/.test(await text(card(p))), 'asked for, it shows as it stands: “Your studio is set up · 7 of 7 done”')
      ok((await card(p).locator('[data-state="done"]').count()) === 7 && await card(p).getByTestId('studio-setup-hide').count() === 0 && await card(p).getByTestId('studio-setup-first-lead').count() === 0, 'every row ticked by its record; no Hide on a finished list, no first-lead button while there are leads')
      ok(!/won’t show again/.test(await text(card(p))), 'a finished list shown on request says nothing about not showing again')
      await shot(p, '01-asked-finished-1440')
      as('sarah'); await go(p, '/leads')
      const s2 = await search(p, 'set up your studio')
      ok(await s2.getByText('Set up your studio', { exact: true }).count() === 0, 'a Designer’s ⌘K never offers it')
      await p.keyboard.press('Escape')
      await go(p, '/settings?section=studio&setup=1')
      ok(await card(p).count() === 0, 'a Designer never sees the list, even asked for')
      as('dane')
    }

    lockCheck('before 2')
    // ── 2 · A studio that is not set up: the owner's first visit ───────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · a new studio: the owner’s welcome')
      freshStudio(); as('dane')
      await go(p, '/leads')
      const w = welcome(p)
      ok(await w.count() === 1, 'the owner’s first visit gets one welcome')
      const wt = await text(w)
      ok(/Welcome, Dane/.test(wt) && /Let’s get Demo Studio ready for its first quote/.test(wt), `it greets by name and says what it is for (${wt.slice(0, 120)})`)
      const filled = await w.locator('[data-dialog-foot] button, footer button').evaluateAll((els) => els.map((e) => e.textContent?.trim()))
      ok(filled.includes('Set up your studio') && filled.includes('Not now') && filled.length === 2, `one filled button and Not now (${filled.join(' · ')})`)
      await shot(p, '02-welcome-owner-1440')
      await w.getByTestId('welcome-go').click(); await p.waitForURL(/\/settings\?section=studio/); await settle(p, 1500)
      ok(/from=%2Fleads/.test(p.url()) && /#studio-setup$/.test(p.url()), 'Set up your studio opens Settings › Studio’s list, with the way back')
      ok((await p.locator('a[data-kb="back"]').first().getAttribute('aria-label')) === 'Back to Leads' && (await p.locator('a[data-kb="back"]').first().getAttribute('href')) === '/leads', 'Back names Leads and returns there')
      ok(sql(`select welcome_due || '|' || (welcomed_at is not null) from members where id = 'dane'`) === '0|1', 'the first visit is recorded on the member')
      ok(await welcome(p).count() === 0, 'and the welcome is gone')
      await go(p, '/leads')
      ok(await welcome(p).count() === 0, 'a later visit: no welcome again')
    }

    lockCheck('before 3')
    // ── 3 · The list ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Set up your studio')
      if (!ONLY.length || !want(2)) { freshStudio(); sql(`update members set welcome_due = 0 where id = 'dane'`) }
      as('dane'); await go(p, '/settings')
      const c = card(p)
      ok(await c.count() === 1 && await c.getAttribute('data-mode') === 'open', 'Settings › Studio opens on the list while a step is open')
      const t = await text(c)
      ok(/Set up your studio/.test(t) && /0 of 7 done/.test(t), '“Set up your studio · 0 of 7 done”')
      ok(/what your documents print/i.test(await text(c.getByTestId('studio-setup-group-print'))) && /how your studio works/i.test(await text(c.getByTestId('studio-setup-group-work'))), 'two groups: what your documents print · how your studio works')
      ok(await stateOf(p, 'details') === 'current' && await stateOf(p, 'logo') === 'future' && await stateOf(p, 'capture') === 'future', 'the first open step is current (where you left off), the rest wait')
      ok(/Until then they print your studio’s name alone/.test(await text(p.getByTestId('studio-setup-step-details'))) && /Until then an invoice can’t say how to pay you/.test(await text(p.getByTestId('studio-setup-step-bank'))), 'each open step says what it is for and what happens meanwhile (1.0’s skip buttons)')
      ok(/Already set for you: invoices are numbered from INV-/.test(await text(c.getByTestId('studio-setup-set'))) && /one stage at a time/.test(await text(c.getByTestId('studio-setup-set'))), 'the foot says what is already set — the next invoice number, how leads move, the quote approval — and where to change it')
      ok(await c.getByTestId('studio-roles').count() === 0 && await p.getByTestId('studio-roles').count() === 1, 'Who may do what still follows it')
      await settle(p, 800)
      ok(!!record().seenOpenAt, 'the list notes when it was first seen with a step open')
      await shotCard(p, '03-list-open-1440')
      /* each row's one button opens the page that keeps it, with the way back */
      const homes = { details: /^\/company\/profile\?from=.*#details$/, logo: /^\/company\/templates\/brand\?from=.*#marks$/, bank: /^\/company\/profile\?from=.*#entities$/, team: /^\/company\/members\?from=/, template: /^\/company\/templates\/quotes\?from=/, book: /^\/company\/price-book\?from=/, capture: /^\/company\/integrations\?from=/ }
      for (const [key, re] of Object.entries(homes)) {
        await go(p, '/settings?section=studio')
        await p.getByTestId(`studio-setup-open-${key}`).click(); await p.waitForURL((u) => !/\/settings/.test(u.pathname)); await settle(p, 900)
        const u = new URL(p.url()); const at = `${u.pathname}${u.search}${u.hash}`
        ok(re.test(at) && /from=%2Fsettings%3Fsection%3Dstudio/.test(at), `${key}: opens ${u.pathname}${u.hash} with the way back`)
      }
      /* the Company details step done on its own page: Profile's Save */
      await go(p, '/settings?section=studio'); await p.getByTestId('studio-setup-open-details').click(); await p.waitForURL(/\/company\/profile/); await settle(p, 1200)
      const det = p.locator('#details')
      await det.getByLabel('Address').fill(brand0.details.address); await det.getByLabel('UEN / Co. Reg. No.').fill(brand0.details.uen); await det.getByLabel('Phone').fill('6222 0188')
      await p.getByRole('button', { name: 'Save changes' }).click(); await settle(p, 1800)
      await p.locator('header a[data-kb="back"], header a[aria-label^="Back"]').first().click(); await p.waitForURL(/\/settings/); await settle(p, 1400)
      ok(await stateOf(p, 'details') === 'done' && await stateOf(p, 'logo') === 'current' && /1 of 7 done/.test(await text(card(p))), 'Profile’s Save ticks Company details by its record; Back returns; Logo is now current')
      ok(/UEN /.test(await text(p.getByTestId('studio-setup-step-details'))), 'a done step says what its page has')
      /* the others by their records */
      doStep.logo(); doStep.bank(); await go(p, '/settings?section=studio')
      ok(await stateOf(p, 'logo') === 'done' && await stateOf(p, 'bank') === 'done' && await stateOf(p, 'team') === 'current' && /3 of 7 done/.test(await text(card(p))), 'a logo in the brand kit and the studio’s bank tick their steps; Your team is current')
      ok(/DBS Bank/.test(await text(p.getByTestId('studio-setup-step-bank'))), 'the bank step names the bank')
      await shotCard(p, '04-list-partway-1440')
      /* Hide — the member's own, with Undo */
      await card(p).getByTestId('studio-setup-hide').click(); await settle(p, 1500)
      ok(await card(p).count() === 0 && /Set up your studio is hidden for you/.test(await snackText(p)), 'Hide: the list goes, the snackbar says it is hidden for you')
      ok(!!record().hidden?.dane, 'hidden on the record, for Dane alone')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800)
      ok(await card(p).count() === 1 && !record().hidden?.dane, 'Undo brings it back')
      await card(p).getByTestId('studio-setup-hide').click(); await settle(p, 1500)
      await go(p, '/settings')
      ok(await card(p).count() === 0, 'hidden, it stays gone on a later visit')
      as('huimin'); await go(p, '/settings')
      ok(await card(p).count() === 1 && /3 of 7 done/.test(await text(card(p))), 'an Admin still sees it — hiding is each member’s own')
      as('sarah'); await go(p, '/settings')
      ok(await card(p).count() === 0, 'a Designer never sees it')
      as('dane'); await go(p, '/leads')
      const s = await search(p, 'set up')
      await s.getByText('Set up your studio', { exact: true }).first().click(); await p.waitForURL(/setup=1/); await settle(p, 1400)
      ok(await card(p).count() === 1 && await card(p).getByTestId('studio-setup-show').count() === 1, '⌘K shows the hidden list, with Show here again')
      await card(p).getByTestId('studio-setup-show').click(); await settle(p, 1500)
      ok(!record().hidden?.dane && /shows here again/.test(await snackText(p)), 'Show here again takes the hide away')
      await go(p, '/settings')
      ok(await card(p).count() === 1, 'and Settings › Studio opens on it again')
    }

    lockCheck('before 4')
    // ── 4 · Every step done: once, then never by itself ────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · every step done')
      as('dane')
      if (ONLY.length && !want(3)) { freshStudio(); sql(`update members set welcome_due = 0 where id = 'dane'`); writeSetting('brand', brand0); writeSetting('studio', studio0); writeSetting('studio_setup', { seenOpenAt: 1, hidden: {} }) }
      /* no lead yet: the done state's one filled button is the first lead (1.0's "Create your first lead") */
      const stamp = 1999999999
      sql(`update leads set deleted_at = ${stamp} where deleted_at is null and direct = 0`)
      doStep.team(); doStep.template(); doStep.book(); doStep.capture(); doStep.logo(); doStep.bank()
      if (!record().seenOpenAt) sql(`update settings set value = json_set(value, '$.seenOpenAt', 1) where key = 'studio_setup'`)
      await go(p, '/settings'); await settle(p, 800)
      const c = card(p)
      ok(await c.getAttribute('data-mode') === 'done' && /Your studio is set up/.test(await text(c)) && /7 of 7 done/.test(await text(c)) && /won’t show again/.test(await text(c)), '“Your studio is set up · 7 of 7 done” — once')
      ok(await c.getByTestId('studio-setup-first-lead').count() === 1 && await c.getByTestId('studio-setup-hide').count() === 0, 'its one filled button is the first lead while there is none')
      await shotCard(p, '05-list-done-1440')
      await settle(p, 800)
      ok(!!record().doneAt, 'the studio is set up on the record')
      await c.getByTestId('studio-setup-first-lead').click(); await p.waitForURL(/\/leads\?new=1/); await settle(p, 1500)
      ok(new URL(p.url()).pathname === '/leads' && await p.getByRole('dialog', { name: /lead/i }).count() >= 1, 'Add your first lead opens the lead form on the Leads listing')
      await p.keyboard.press('Escape'); await settle(p, 500)
      sql(`update leads set deleted_at = NULL where deleted_at = ${stamp}`)
      await go(p, '/settings')
      ok(await card(p).count() === 0, 'a later visit: the list never shows by itself again')
      doStep.book(); sql(`update price_book_items set deleted_at = strftime('%s','now') where id in (${book0})`)
      await go(p, '/settings')
      ok(await card(p).count() === 0, 'even when a step’s record goes later — the studio was set up (each page keeps its own part)')
      doStep.book()
    }

    lockCheck('before 5')
    // ── 5 · The welcome by role ────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · the welcome by role')
      sql(`update members set welcome_due = 1 where id in ('sarah', 'priya', 'huimin')`)
      as('sarah'); await go(p, '/leads')
      let w = welcome(p)
      ok(/You’re on Demo Studio’s team/.test(await text(w)) && await w.getByTestId('welcome-go').innerText() === 'See my leads', 'a Designer: “You’re on Demo Studio’s team” · See my leads')
      await shot(p, '06-welcome-designer-1440')
      await w.getByTestId('welcome-go').click(); await settle(p, 1200)
      ok(new URL(p.url()).pathname === '/leads' && await welcome(p).count() === 0 && sql(`select welcome_due from members where id = 'sarah'`) === '0', 'already on the leads: it only closes, and the visit is recorded')
      as('priya'); await go(p, '/company/finance')
      w = welcome(p)
      ok(/keep Demo Studio’s books/.test(await text(w)) && await w.getByTestId('welcome-go').innerText() === 'Open Finance', 'Accounting: “You keep Demo Studio’s books” · Open Finance')
      await w.getByTestId('welcome-later').click(); await settle(p, 1200)
      ok(await welcome(p).count() === 0 && sql(`select welcome_due || '|' || (welcomed_at is not null) from members where id = 'priya'`) === '0|1', 'Not now closes it and records the visit too')
      as('huimin'); await go(p, '/projects')
      w = welcome(p)
      ok(/as an Admin/.test(await text(w)) && await w.getByTestId('welcome-go').innerText() === 'See the leads', 'an Admin, the studio set up: “See the leads” (not the set-up list)')
      await p.keyboard.press('Escape'); await settle(p, 1200)
      ok(await welcome(p).count() === 0 && sql(`select welcome_due from members where id = 'huimin'`) === '0', 'Escape closes it and records it')
      /* a member added on Company › Members is owed theirs */
      as('dane'); await go(p, '/company/members')
      await p.getByRole('button', { name: 'Add member' }).click()
      const dlg = p.getByRole('dialog', { name: 'Add member' })
      await dlg.getByLabel('Name').fill('Wen Hui Tan'); await dlg.getByLabel('Phone').fill('91230088')
      await dlg.getByRole('button', { name: 'Add member' }).click(); await settle(p, 1800)
      const added = json(`select id, welcome_due, welcomed_at from members where name = 'Wen Hui Tan'`)[0]
      ok(added && added.welcome_due === 1 && added.welcomed_at === null, 'Add member: the new member is owed the welcome')
      as(added.id); await go(p, '/leads')
      ok(/Welcome, Wen Hui Tan/.test(await text(welcome(p))), 'their first visit (View as) gets it')
      await welcome(p).getByTestId('welcome-later').click(); await settle(p, 1000)
      as('dane')
    }

    lockCheck('before 6')
    // ── 6 · The ghost and the phone ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · the ghost, 390 and 320')
      freshStudio(); sql(`update members set welcome_due = 0 where id = 'dane'`); as('dane')
      /* the loader draws what the page draws: hold the page's own data and read the ghost under it */
      lockCheck('6a after fresh')
      const gp = await page(ctx, 'ghost')
      await go(gp, '/leads')
      lockCheck('6b after leads')
      /* hold the page's own answer (a GET for its RSC) — never the list's note, a POST: a held write landing later would race this probe's sqlite3 */
      await gp.route('**/settings**', async (route) => { if (route.request().method() === 'GET' && route.request().headers()['rsc']) { await new Promise((r) => setTimeout(r, 2500)) } await route.continue() })
      await gp.locator('a[href="/settings"]').first().click(); await settle(gp, 700)
      lockCheck('6c during held nav')
      const ghost = gp.locator('[aria-label="Loading settings"]').first()
      const ghostText = await ghost.innerHTML().catch(() => '')
      ok(/Set up your studio/.test(ghostText) && /What your documents print/.test(ghostText) && /Who may do what|What each role can do/.test(ghostText) /* (the calm UI build 2026-10-27, a deliberate change) B5 5-04: the card's words */, 'the Settings ghost draws the list (then Who may do what) for the member it shows to')
      if (ghostText) await shot(gp, '09-ghost-1440')
      /* let the held page arrive before the tab closes — a page closed mid-answer leaves the server's render behind */
      await card(gp).waitFor({ timeout: 15000 }).catch(() => {}); await gp.waitForLoadState('networkidle'); await settle(gp, 1200)
      ok(await card(gp).count() === 1, '…and the page it hands over to is the list')
      lockCheck('6d after arrival')
      await gp.unroute('**/settings**'); await gp.close(); await settle(p, 1500)
      lockCheck('6e after close')
      sql(`update members set welcome_due = 1 where id = 'dane'`)
      for (const [w, h] of [[390, 844], [320, 640]]) {
        sql(`update members set welcome_due = 1 where id = 'dane'`)
        const pc = await phoneCtx(w, h); const m = await page(pc, `phone-${w}`)
        await go(m, '/leads')
        ok(await welcome(m).count() === 1 && await sideways(m) <= 0, `${w}: the welcome, no sideways scroll`)
        if (w === 390) await shot(m, '07-welcome-390')
        await welcome(m).getByTestId('welcome-go').click(); await m.waitForURL(/\/settings/); await settle(m, 1500)
        ok(await card(m).count() === 1 && await sideways(m) <= 0, `${w}: Settings › Studio’s list, no sideways scroll`)
        if (w === 390) await shotCard(m, '08-list-390')
        await pc.close()
      }
    }

    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
