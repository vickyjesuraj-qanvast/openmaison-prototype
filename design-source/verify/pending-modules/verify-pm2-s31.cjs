// Pending modules, step S31 · A new studio joins (the owner's "build all of them but one after the other", 2026-10-11; survey key
// onboarding:studio-sign-up). Each item asserted as the rule it builds, never another round's count:
//  - the doors: sign-in's "New to OpenMaison? Start your studio" (its ghost draws it too), "No account found" hands the number over, 1.0's
//    /onboarding redirects, someone signed in never sees sign-up
//  - how you work (1.0's role choice, now deciding something): three house choice cards in 1.0's order, "I run a studio" picked, one filled
//    button; "I work in a studio" makes nothing and sends them to sign-in
//  - the details: the house refusals (names, a mobile not a landline, an email), a number or email that already has an account (here or in
//    another studio on this prototype) refused with the way in, the plan line, the stand-in's words — nothing written until the code
//  - the code: the studio and its Owner made in one go in a database of its own (`<scratch>.studios/<key>.db`), opened, signed in (`.r`):
//    the Owner owed the welcome, an EMPTY brand kit and details (S08), the studio's name, the record of its making, Free with 150 welcome AI
//    credits and 30 a month (S19 — the ledger sums to the balance), OpenMaison's feeds copied, nothing else (no leads, templates, Price book,
//    fonts, invitations); THE DEMO'S DATABASE IS NOT WRITTEN AT ALL
//  - the new studio wears its own name everywhere: the rail's block (its initial), Set up your studio every step open, the welcome; a sweep
//    of every studio page finds no error and nothing of the demo studio
//  - the Studios group (demo only) switches between the demo and the studios started here; signing in with a studio's number opens it
//  - a studio of one: Business name, no "Your team" step, the welcome without a team; the Settings ghost draws its six steps and its name
//  - the sign-up's ghost sits on the page at 1440 · 390 · 320; no sideways scroll at 390 / 320 (screen.width); no page errors
//  - Reset prototype to base opens the demo and clears the studios started here
//  - (PAUSED=1, a server started with OPENMAISON_SIGN_UPS_PAUSED=1) paused sign-ups: the first step's notice, sign-in says 1.0's words
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s31.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"], [role="menu"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }   // (calm-build regression fix F) + the phone's You sheet, a menu (the house Sheet, role="menu")
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s31')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const PAUSED = process.env.PAUSED === '1'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !PAUSED && (!ONLY.length || ONLY.includes(String(n)))
const HOME = `${path.resolve(DB)}.studios`   // where the server keeps the studios started on it
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sqlOn = (file, q) => execSync(`sqlite3 -cmd ".timeout 30000" "${file}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const jsonOn = (file, q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${file}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sql = (q) => sqlOn(DB, q)
const json = (q) => jsonOn(DB, q)
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s31-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const made = () => { try { return fs.readdirSync(HOME).filter((f) => /^[a-z0-9-]+-[a-f0-9]{8}\.db$/.test(f)).sort() } catch { return [] } }
const fileOf = (f) => path.join(HOME, f)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  if (fs.existsSync(HOME) && made().length) { console.log(`  ✗ ${HOME} already holds studios — start from a clean scratch copy`); process.exit(1) }
  /* the app's own lazy writes first (the credits' month roll on the first page), so the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
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
    sqlFile(text)
    return changed
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const out = (ctx) => ctx.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])   // a browser that signed out — sign-in and sign-up show
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 900) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re) => { for (let i = 0; i < 30; i++) { const t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(200) } return snackText(p) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const cookie = async (ctx, name) => (await ctx.cookies()).find((c) => c.name === name) ?? null
  const pathOf = (p) => { const u = new URL(p.url()); return u.pathname + u.search }
  const ready = async (p, testId) => { await p.waitForFunction((id) => { const e = document.querySelector(`[data-testid="${id}"]`); return !!e && !e.closest('[inert]') }, testId, { timeout: 15000 }).catch(() => {}); await settle(p, 300) }
  const step = (p) => p.getByTestId('sign-up').getAttribute('data-step')
  const kindCard = (p, k) => p.locator(`[data-testid="sign-up-kind"][data-kind="${k}"] button`)
  const fillDetails = async (p, d) => {
    for (const [label, v] of [[d.solo ? 'Business name' : 'Studio name', d.studio], ['Your name', d.name], ['Mobile number', d.phone], ['Work email (optional)', d.email ?? '']]) { const f = p.getByLabel(label, { exact: true }); await f.fill(''); if (v) await f.fill(v) }
    await settle(p, 200)
  }
  const fieldErrors = (p) => p.locator('[data-testid="sign-up-details"] [role="alert"]').allInnerTexts()
  const typeCode = async (p, testId, code = '123456') => { await p.getByTestId(testId).first().click(); await p.keyboard.type(code); await settle(p, 200) }
  /** the whole sign-up from a signed-out browser: how you work → the details → the code → the studio opens */
  const signUp = async (p, d) => {
    await go(p, '/sign-up', 400); await ready(p, 'sign-up')
    await kindCard(p, d.solo ? 'solo' : 'studio').click(); await p.getByTestId('sign-up-continue').click(); await settle(p, 500)
    await fillDetails(p, d); await p.getByTestId('sign-up-send').click(); await settle(p, 1200)
    await typeCode(p, 'sign-up-digit')
    await p.getByTestId('sign-up-go').click()
    await p.waitForURL((u) => !/\/sign-up/.test(String(u)), { timeout: 20000 }).catch(() => {})
    await p.waitForLoadState('networkidle').catch(() => {}); await settle(p, 1500)
  }
  const studioBlock = (p) => p.getByTestId('studio-block')
  const openMenu = async (p) => { await studioBlock(p).click(); await settle(p, 600); await openDemo(p); return p.locator('[role="menu"][aria-label="View as"]') }
  const closeWelcome = async (p) => { const d = p.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await d.count()) { await d.getByRole('button', { name: 'Not now' }).click().catch(() => {}); await settle(p, 500) } }
  const switchTo = async (p, label) => {
    const m = await openMenu(p)
    await m.getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: label }).click()
    await p.waitForLoadState('load').catch(() => {}); await settle(p, 2500)
  }
  const signOutDesk = async (p) => { const m = await openMenu(p); await m.getByTestId('sign-out').click(); await p.waitForURL(/\/sign-in/, { timeout: 15000 }).catch(() => {}); await ready(p, 'sign-in') }
  const signIn = async (p, contact) => {
    await ready(p, 'sign-in'); await p.getByLabel(/^Mobile number or (work )?email/).fill(contact); await p.getByTestId('sign-in-send').click(); await settle(p, 1000)
    await typeCode(p, 'sign-in-digit'); await p.getByTestId('sign-in-go').click()
    await p.waitForURL((u) => !/\/sign-in/.test(String(u)), { timeout: 20000 }).catch(() => {})
    await p.waitForLoadState('networkidle').catch(() => {}); await settle(p, 1500)
  }
  const LIM = { studio: 'Lim & Co Interiors', name: 'lim wei ming', phone: '91112233', email: 'weiming@limco.example' }
  const SOLO = { studio: 'Aisha Rahman Design', name: 'Aisha Rahman', phone: '82223344', solo: true }
  let limFile = null

  try {
    // ── 1 · The doors ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · The doors')
      const C = await desk(); await out(C); const c = await page(C, 'doors')
      await go(c, '/sign-in', 400); await ready(c, 'sign-in')
      ok(await text(c.getByTestId('sign-in-sign-up')) === 'New to OpenMaison? Start your studio', 'sign-in’s foot: “New to OpenMaison? Start your studio”')
      await c.getByLabel(/^Mobile number or (work )?email/).fill('91112233'); await c.getByTestId('sign-in-send').click(); await settle(c, 1000)
      ok(/ask its Owner to add you/.test(await text(c.getByTestId('sign-in-no-account'))) && await c.getByTestId('sign-in-sign-up').count() === 1, '“No account found” keeps who to ask, and the way to start a studio')
      await shot(c, '01-sign-in-door-1440')
      await c.getByRole('link', { name: 'Start your studio' }).click(); await c.waitForURL(/\/sign-up/); await ready(c, 'sign-up')
      await c.getByTestId('sign-up-continue').click(); await settle(c, 500)
      ok(await c.getByLabel('Mobile number', { exact: true }).inputValue() === '9111 2233', 'the number nobody had rides to sign-up — not typed twice')
      await go(c, '/onboarding', 400)
      ok(pathOf(c) === '/sign-up', `1.0’s /onboarding lands on sign-up (${pathOf(c)})`)
      const S = await desk(); const s = await page(S, 'signed-in')
      await go(s, '/sign-up', 600)
      /* (pending modules, a deliberate change — S22 made the Dashboard the front door) */
      ok(pathOf(s) === '/dashboard', `someone signed in never sees sign-up — they go home (${pathOf(s)})`)
      ok(made().length === 0, 'nothing is made by looking')
      await C.close(); await S.close()
    }

    // ── 2 · How you work ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · How you work')
      const C = await desk(); await out(C); const c = await page(C, 'who')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      ok(await text(c.getByTestId('sign-up-title')) === 'Start your studio' && await text(c.getByTestId('sign-up-lede')) === 'Leads, quotes and projects in one place. First, how do you work?', 'the title, then the one question')
      const kinds = await c.getByTestId('sign-up-kind').evaluateAll((els) => els.map((e) => [e.getAttribute('data-kind'), e.querySelector('button')?.getAttribute('aria-checked')]))
      ok(kinds.map((k) => k[0]).join(',') === 'studio,member,solo', `1.0’s three, in its order — I run a studio · I work in a studio · I work on my own (${kinds.map((k) => k[0]).join(',')})`)
      ok(kinds[0][1] === 'true' && kinds.slice(1).every((k) => k[1] === 'false'), '“I run a studio” is picked to begin with (the right default)')
      ok(await c.locator('[data-testid="sign-up"] [role="radiogroup"] button[role="radio"]').count() === 3, 'each a house choice card (role radio) in a radio group')
      ok(await c.locator('[data-testid="sign-up"] button[class*="__go"], [data-testid="sign-up"] a[class*="__go"]').count() === 1, 'one filled button — Continue')
      ok(/^Already on OpenMaison\? Sign in$/.test(await text(c.getByTestId('sign-up-have-account'))), 'the foot: “Already on OpenMaison? Sign in”')
      await shot(c, '02-who-1440')
      await kindCard(c, 'member').click(); await c.getByTestId('sign-up-continue').click(); await settle(c, 600)
      ok(await step(c) === 'member' && await text(c.getByTestId('sign-up-title')) === 'Ask your studio to add you', 'I work in a studio: “Ask your studio to add you”')
      ok(/adds you on Company › Members/.test(await text(c.getByTestId('sign-up-lede'))), '…where the Owner adds them (an invitation brings them in)')
      await shot(c, '03-member-1440')
      await c.getByTestId('sign-up-to-sign-in').click(); await c.waitForURL(/\/sign-in/); await settle(c, 400)
      ok(pathOf(c) === '/sign-in' && made().length === 0, 'Go to sign in — and nothing was made')
      await C.close()
    }

    // ── 3 · The details ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · The details')
      const C = await desk(); await out(C); const c = await page(C, 'details')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      await c.getByTestId('sign-up-continue').click(); await settle(c, 500)
      ok(await text(c.getByTestId('sign-up-title')) === 'About your studio' && /6-digit code to your mobile/.test(await text(c.getByTestId('sign-up-lede'))), 'About your studio — and why the mobile')
      const labels = await c.locator('[data-testid="sign-up-details"] label').allInnerTexts()
      ok(['Studio name', 'Your name', 'Mobile number', 'Work email (optional)'].every((l) => labels.some((x) => x.replace(/\*$/, '').trim() === l)), `four fields: Studio name · Your name · Mobile number · Work email (optional) (${labels.join(' · ')})`)
      ok(await text(c.getByTestId('sign-up-plan')) === 'You start on Free: 150 AI credits to try the tools, then 30 a month. Upgrade any time.', 'the plan, said before anyone commits (1.0’s Free: 150 welcome, 30 a month)')
      ok(/^Demo only — no text or email is sent/.test(await text(c.getByTestId('sign-up-demo'))) && /opens on its own here, and the demo studio stays as it is/.test(await text(c.getByTestId('sign-up-prototype'))), 'the stand-in says no text is sent, and that the demo stays as it is')
      await c.getByTestId('sign-up-send').click(); await settle(c, 400)
      let errs = await fieldErrors(c)
      ok(errs.includes('Enter your studio’s name') && errs.includes('Enter your name') && errs.includes('Enter your mobile number'), `nothing typed: each field says what it needs (${errs.join(' · ')})`)
      await shot(c, '04-details-errors-1440')
      await c.getByLabel('Studio name', { exact: true }).fill('L'); await settle(c, 200)
      errs = await fieldErrors(c)
      ok(!errs.includes('Enter your studio’s name'), 'an error clears as its field is typed in')
      await fillDetails(c, { studio: 'Probe Studio', name: 'Probe Person', phone: '62220188' }); await c.getByTestId('sign-up-send').click(); await settle(c, 600)
      ok((await fieldErrors(c)).some((e) => /A code goes to a mobile/.test(e)), 'a landline: a code goes to a mobile')
      await fillDetails(c, { studio: 'Probe Studio', name: 'Probe Person', phone: '91112244', email: 'not-an-email' }); await c.getByTestId('sign-up-send').click(); await settle(c, 600)
      ok((await fieldErrors(c)).includes('Enter a valid email address'), 'an email that isn’t one: the house words')
      await fillDetails(c, { studio: 'Probe Studio', name: 'Probe Person', phone: '98837542' }); await c.getByTestId('sign-up-send').click(); await settle(c, 1200)
      ok((await fieldErrors(c)).includes('This number already has an account — sign in with it instead') && /^Sign in with it instead\.$/.test(await text(c.getByTestId('sign-up-taken'))), 'a number someone in the demo studio has: already an account — with the way in (1.0’s admin refused a user who existed)')
      await fillDetails(c, { studio: 'Probe Studio', name: 'Probe Person', phone: '91112244', email: 'dane@demostudio.sg' }); await c.getByTestId('sign-up-send').click(); await settle(c, 1200)
      ok((await fieldErrors(c)).includes('This email already has an account — sign in with it instead'), '…and an email the same')
      ok(await step(c) === 'details' && made().length === 0, 'nothing made before the code')
      await c.getByTestId('sign-up-back').click(); await settle(c, 400)
      ok(await step(c) === 'who' && (await kindCard(c, 'studio').getAttribute('aria-checked')) === 'true', 'Back returns to how you work, the choice kept')
      await c.getByTestId('sign-up-continue').click(); await settle(c, 400)
      ok(await c.getByLabel('Studio name', { exact: true }).inputValue() === 'Probe Studio', '…and Continue finds the details as they were typed')
      await fillDetails(c, { studio: 'Probe Studio', name: 'Probe Person', phone: '98837542' }); await c.keyboard.press('Enter'); await settle(c, 1200)
      ok((await fieldErrors(c)).includes('This number already has an account — sign in with it instead'), '↵ sends the details as the button does')
      await c.getByTestId('sign-up-taken').getByRole('link', { name: 'Sign in' }).click(); await c.waitForURL(/\/sign-in/); await settle(c, 400)
      ok(pathOf(c) === '/sign-in', 'the way in goes to sign-in')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      await c.getByTestId('sign-up-have-account').getByRole('link', { name: 'Sign in' }).click(); await c.waitForURL(/\/sign-in/); await settle(c, 300)
      ok(pathOf(c) === '/sign-in', '“Already on OpenMaison? Sign in” goes there too')
      await C.close()
    }

    // ── 4 · The code — the studio and its Owner, made in one go, in a database of its own ─────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · The code, and the studio made')
      const demoBefore = hashes()
      const C = await desk(); await out(C); const c = await page(C, 'start')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      await c.getByTestId('sign-up-continue').click(); await settle(c, 400)
      await fillDetails(c, LIM); await c.getByTestId('sign-up-send').click(); await settle(c, 1200)
      ok(await step(c) === 'code' && await text(c.getByTestId('sign-up-lede')) === 'We sent a 6-digit code to the number ending 2233. Enter it to start Lim & Co Interiors.', 'the code step: where it went, and what it starts')
      ok(/You can ask for a new one in \d+ seconds?/.test(await text(c.getByTestId('sign-up-resend'))) && await c.getByTestId('sign-up-remember').locator('input[type="checkbox"]').isChecked(), 'a new code after 30 seconds; Keep me signed in ticked (sign-in’s)')
      await shot(c, '05-code-1440')
      await c.getByTestId('sign-up-back').click(); await settle(c, 400)
      ok(await step(c) === 'details' && await c.getByLabel('Your name', { exact: true }).inputValue() === 'lim wei ming', '“Use another number” goes back to the details, as typed')
      await c.getByTestId('sign-up-send').click(); await settle(c, 1200)
      await c.getByTestId('sign-up-resend').getByRole('button', { name: 'Send a new code' }).waitFor({ timeout: 40000 }).catch(() => {})
      await c.getByTestId('sign-up-resend').getByRole('button', { name: 'Send a new code' }).click().catch(() => {})
      ok(/A new code is on its way to the number ending 2233/.test(await waitSnack(c, /new code/)), 'after 30 seconds: Send a new code — “A new code is on its way to the number ending 2233”')
      await typeCode(c, 'sign-up-digit', '123'); await c.getByTestId('sign-up-go').click(); await settle(c, 500)
      ok(await text(c.getByTestId('sign-up-code-error')) === 'Enter all 6 digits of the code' && made().length === 0, 'three digits: “Enter all 6 digits of the code” — nothing made')
      await c.getByTestId('sign-up-digit').first().click(); for (let i = 0; i < 6; i++) await c.keyboard.press('Backspace')
      for (let i = 0; i < 6; i++) await c.getByTestId('sign-up-digit').nth(i).fill('')
      await typeCode(c, 'sign-up-digit')
      await c.getByTestId('sign-up-go').click()
      await c.waitForURL((u) => !/\/sign-up/.test(String(u)), { timeout: 20000 }).catch(() => {})
      await c.waitForLoadState('networkidle').catch(() => {}); await settle(c, 1500)
      ok(pathOf(c) === '/dashboard', `the studio opens on the app’s front door (${pathOf(c)})`)   // (S22's front door, a deliberate change)
      const files = made()
      ok(files.length === 1 && /^lim-co-interiors-[a-f0-9]{8}\.db$/.test(files[0] ?? ''), `in a database of its own beside the demo’s (${files.join(', ')})`)
      limFile = files[0] ? fileOf(files[0]) : null
      const ck = await cookie(C, 'om_session')
      ok(!!ck && /\.r$/.test(ck.value) && ck.httpOnly, 'signed in as its Owner — a remembered session (httpOnly, .r)')
      const after = hashes()
      const touched = TABLES.filter((t) => after.get(t) !== demoBefore.get(t))
      ok(touched.length === 0, `THE DEMO’S DATABASE WAS NOT WRITTEN — every table as it was (${touched.join(', ') || 'none touched'})`)
      if (limFile) {
        const L = (q) => sqlOn(limFile, q), LJ = (q) => jsonOn(limFile, q)
        const team = LJ(`select id, name, role, is_you, is_active, welcome_due, welcomed_at, phone, email from members`)
        ok(team.length === 1 && team[0].role === 'Owner' && team[0].is_you === 1 && team[0].is_active === 1 && team[0].name === 'Lim Wei Ming' && team[0].phone === '91112233' && team[0].email === 'weiming@limco.example', `its Owner, and nobody else — the name tidied as the house does (${JSON.stringify(team[0] ?? null)})`)
        ok(team[0]?.welcome_due === 1, 'the Owner is owed the first-visit welcome (S08)')
        const set = Object.fromEntries(LJ(`select key, value from settings`).map((r) => [r.key, JSON.parse(r.value)]))
        ok(set.studio?.name === 'Lim & Co Interiors' && set.studio?.gstPct === 9, 'the studio’s name on its record (GST at the house rate)')
        const br = set.brand
        ok(br && br.kit.logo === null && br.kit.stamp === null && br.kit.badges.length === 0 && ['address', 'phone', 'email', 'website', 'uen', 'gstReg', 'licence'].every((k) => br.details[k] === '') && br.details.entities.length === 1 && br.details.entities[0].name === 'Lim & Co Interiors' && !br.details.entities[0].bankName && !br.details.entities[0].payNow, 'its brand kit and details start EMPTY — no logo, no details, no bank (S08: never the demo’s fallbacks)')
        ok(set.studio_origin?.ownerId === team[0]?.id && set.studio_origin?.kind === 'studio' && set.studio_origin?.via === 'sign-up' && Math.abs(set.studio_origin.madeAt - Date.now()) < 120000, 'the record of its making: who, how, when (studio_origin)')
        ok(Object.keys(set).sort().join(',') === 'brand,studio,studio_origin' || Object.keys(set).every((k) => ['brand', 'studio', 'studio_origin', 'schedule_presets_seeded', 'project_numbers_given', 'studio_setup'].includes(k)), `nothing else set — the house defaults are its starter lists (${Object.keys(set).join(', ')})`)
        const sub = LJ(`select plan_id, status, seats, created_by from subscriptions`)
        const bal = LJ(`select plan_credits, topup_credits from studio_credit_balances`)[0]
        const led = LJ(`select action_key, credits, reason from credit_ledger order by created_at, credits desc`)
        ok(sub.length === 1 && sub[0].plan_id === 'free' && sub[0].status === 'active' && sub[0].seats === 1 && sub[0].created_by === team[0]?.id, 'Free from today, one seat (1.0’s new studio)')
        ok(bal && bal.plan_credits === 30 && bal.topup_credits === 150, `30 this month and 1.0’s 150 welcome AI credits with the top-ups (they never expire) (${JSON.stringify(bal)})`)
        ok(led.some((r) => r.action_key === 'welcome' && r.reason === 'grant' && r.credits === 150) && led.reduce((s, r) => s + r.credits, 0) === (bal?.plan_credits ?? 0) + (bal?.topup_credits ?? 0), 'the ledger sums to the balance (the welcome grant and the month’s allowance)')
        ok(Number(L(`select count(*) from plans`)) === Number(sql(`select count(*) from plans`)), 'the plans, 1.0’s rows')
        for (const t of ['marketplace_brands', 'marketplace_products', 'market_insights', 'hangout_events']) ok(Number(L(`select count(*) from ${t}`)) === Number(sql(`select count(*) from ${t}`)), `OpenMaison’s feed copied — ${t} (every studio reads it)`)
        const empty = ['leads', 'projects', 'quotes', 'quote_templates', 'price_book_items', 'contracts', 'contract_templates', 'studio_fonts', 'studio_invitations', 'notifications', 'lead_tasks', 'vendors', 'payment_templates', 'quote_text_templates', 'task_templates', 'library_folders', 'tags', 'studio_scope_questions', 'homeowner_profiles']
        const notEmpty = empty.filter((t) => Number(L(`select count(*) from ${t}`)) !== 0)
        ok(notEmpty.length === 0, `nothing of the demo’s and nothing else: no leads, projects, quotes, templates, Price book, fonts (S11), invitation for the Owner (S09)… (${notEmpty.join(', ') || 'all empty'})`)
        /* (pending modules, a deliberate change — S22's Dashboard is the first page to need the portal's address, which the app makes from the
           studio's own name the first time anything needs it, Q-44): at most one address, made from THIS studio's name, never the demo's */
        const addrs = LJ(`select slug from portal_addresses`)
        ok(addrs.length <= 1 && addrs.every((a) => a.slug !== 'demo-studio' && !String(a.slug).startsWith('demo-studio-')), `the portal's address, if made, is the new studio's own (${addrs.map((a) => a.slug).join(', ') || 'none yet'})`)
        const ses = LJ(`select member_id, via, channel, remember, ended_at from studio_sessions`)
        ok(ses.length === 1 && ses[0].member_id === team[0]?.id && ses[0].via === 'code' && ses[0].channel === 'phone' && ses[0].remember === 1 && ses[0].ended_at === null, 'its session record — a code to the mobile, remembered')
      }
      // the page
      const welcome = c.getByRole('dialog').filter({ hasText: /^Welcome,/ })
      ok(await welcome.count() === 1 && /Welcome, Lim Wei Ming/.test(await text(welcome)) && /Let’s get Lim & Co Interiors ready for its first quote/.test(await text(welcome)), 'the welcome waits — “Welcome, Lim Wei Ming”, getting Lim & Co Interiors ready (S08)')
      ok(await welcome.getByRole('button', { name: 'Set up your studio' }).count() === 1, '…with its one filled button, Set up your studio')
      await shot(c, '06-welcome-1440')
      ok(await text(c.getByTestId('studio-name')) === 'Lim & Co Interiors' && (await studioBlock(c).getAttribute('aria-label')) === 'Lim & Co Interiors. View as', 'the rail’s block wears the studio’s name')
      ok(await studioBlock(c).locator('img').count() === 0 && await text(studioBlock(c).locator('[class*="__studioInitial"]')) === 'L', '…and its initial, until it has a logo')
      await welcome.getByRole('button', { name: 'Set up your studio' }).click(); await c.waitForURL(/\/settings/); await settle(c, 1500)
      const card = c.locator('#studio-setup')
      /* (S42 audit A-01, a deliberate change of this rule — his call A·2) a new studio starts on Free, whose own templates are Pro's: the Quote
         template step is done by the default, so six of the seven are open */
      ok(/1 of 7 done/.test(await text(card)) && /Your quotes print with the studio’s default — your own templates come with Pro/.test(await text(card)), `Set up your studio — six of its seven steps open; the Quote template step done by the default on Free (${(await text(card)).slice(0, 80)})`)
      ok(/Who sees which leads in Lim & Co Interiors/.test(await text(c.locator('main'))), 'Settings speaks of Lim & Co Interiors')
      await shot(c, '07-setup-1440')
      await go(c, '/company/plan', 1200)
      ok(/180/.test(await text(c.locator('main'))) && /Welcome AI credits/.test(await text(c.locator('main'))), 'Company › Plan & AI credits: 180 left, the welcome credits in its activity')
      await C.close()
    }

    // ── 5 · Nothing of the demo in the new studio — a sweep of every studio page ──────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · The new studio, page by page')
      const C = await desk(); const c = await page(C, 'sweep')   // a fresh browser: the open studio's own session (its Owner)
      const ROUTES = ['/leads', '/projects', '/tasks', '/quotes', '/contracts', '/quote-x-ray', '/visualizer', '/planner', '/meetings', '/chat', '/marketplace', '/market-insights', '/compliance',
        '/company/profile', '/company/members', '/company/templates/quotes', '/company/templates/brand', '/company/templates/contracts', '/company/templates/tasks', '/company/templates/terms', '/company/templates/payments', '/company/templates/schedules',
        '/company/price-book', '/company/price-book/sections', '/company/materials', '/company/questionnaire', '/company/integrations', '/company/portal', '/company/portal/clients', '/company/plan', '/company/plan/billing',
        '/company/finance', '/company/finance/expenses', '/company/reports/leads', '/company/reports/projects', '/company/reports/finance',
        '/settings', '/settings?section=leads', '/settings?section=quotes', '/settings?section=projects', '/settings?section=finance', '/settings?section=notifications', '/settings?section=meetings',
        '/profile', '/qanvast-ops', '/qanvast-ops/hangouts', '/qanvast-ops/studios', '/projects/tickets', '/leads/imports']
      const broke = [], leaks = []
      for (const r of ROUTES) {
        const n = errors.length
        await go(c, r, 600); await closeWelcome(c)
        const all = await c.locator('body').innerText().catch(() => '')
        if (/Something went wrong|This page couldn’t load|Application error/i.test(all) || errors.length > n) broke.push(r)
        if (/Demo Studio|demostudio/i.test(all)) leaks.push(r)
      }
      ok(broke.length === 0, `every studio page opens in a brand-new studio — no error, no page error (${ROUTES.length} pages${broke.length ? `; broke: ${broke.join(', ')}` : ''})`)
      ok(leaks.length === 0, `nothing of the demo studio on any of them — its name, its addresses (${leaks.join(', ') || 'none'})`)
      await go(c, '/leads', 900)
      ok(/Add your first lead/.test(await text(c.locator('main'))), 'Leads opens on its first run (REG-735)')
      ok(sql(`select count(*) from members`) === String(kept.get('members').length), 'and the demo’s database still has only its own members')
      await C.close()
    }

    // ── 6 · The Studios group (demo only) ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Switching studios (demo only)')
      const demoBefore = hashes()
      const C = await desk(); const c = await page(C, 'switch')
      await go(c, '/leads', 900); await closeWelcome(c)
      const m = await openMenu(c)
      const rows = await m.getByTestId('demo-studios').getByRole('menuitemradio').evaluateAll((els) => els.map((e) => [e.querySelector('[class*="__label"]')?.textContent, e.querySelector('[class*="__help"]')?.textContent, e.getAttribute('aria-checked')]))
      ok(rows.length === 2 && rows[0][0] === 'Demo Studio' && rows[0][1] === 'The demo’s studio' && rows[1][0] === 'Lim & Co Interiors' && /^Started \d+ \w+ ’\d\d · Lim Wei Ming$/.test(rows[1][1] ?? ''), `“Studios · demo only”: the demo’s, then the one started here (${JSON.stringify(rows)})`)
      ok(rows[1][2] === 'true' && rows[0][2] === 'false', 'the open one is ticked')
      await shot(c, '08-studios-menu-1440')
      await c.keyboard.press('Escape'); await settle(c, 300)
      await switchTo(c, 'Demo Studio')
      ok(/Switched to Demo Studio/.test(await waitSnack(c, /Switched/)), '“Switched to Demo Studio”')
      ok(await text(c.getByTestId('studio-name')) === 'Demo Studio' && (await studioBlock(c).locator('img').getAttribute('src')) === '/figma-assets/avatar-studio.svg' && /Dane · Owner/.test(await text(studioBlock(c))), 'the demo’s block as the mock draws it — Demo Studio · Dane Bruce Lee')
      await go(c, '/leads', 900)
      ok(!/Add your first lead/.test(await text(c.locator('main'))) && Number(sql(`select count(*) from leads where deleted_at is null and direct = 0`)) > 0, 'the demo’s leads are back')
      const touched = TABLES.filter((t) => hashOf(t) !== demoBefore.get(t))
      /* (calm-build regression fix F) say which members' columns moved, so a failure names its write */
      const membersMoved = touched.includes('members') ? (() => { const now = json('select * from members'); const was = kept.get('members'); return now.flatMap((r) => { const w = was.find((x) => x.id === r.id); return Object.keys(r).filter((k) => !w || String(w[k]) !== String(r[k])).map((k) => `${r.id}.${k}`) }) })() : []
      /* (the calm UI build 2026-10-27: restated to the rule already in force) landing on the Dashboard stamps the member's visit
         (members.dashboard_seen_at · dashboard_since_at, the Dashboard redesign's migration 0115) — the switch itself still writes nothing */
      const VISIT = /\.dashboard_(seen|since)_at$/
      if (touched.includes('members') && membersMoved.length && membersMoved.every((k) => VISIT.test(k))) touched.splice(touched.indexOf('members'), 1)
      ok(touched.length === 0, `switching wrote nothing to the demo (${touched.join(', ') || 'none'})${membersMoved.length ? ` — ${membersMoved.join(', ')}` : ''}`)
      ok(made().length === 1, 'Lim & Co Interiors is kept, as it was left')
      await switchTo(c, 'Lim & Co Interiors')
      ok(await text(c.getByTestId('studio-name')) === 'Lim & Co Interiors' && /Lim Wei Ming/.test(await text(studioBlock(c))), 'and back — the studio’s own session, its Owner')
      await C.close()
    }

    // ── 7 · Signing in finds your studio ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Signing in finds your studio')
      const C = await desk(); const c = await page(C, 'find')
      await go(c, '/leads', 900); await closeWelcome(c)
      await signOutDesk(c)
      /* (the calm UI build 2026-10-27, a deliberate change) B1 1-46: the demo's two lines are one quiet box, "Demo: any 6 digits work — try {what to type}" —
         the who-to-try is still the open studio's own Owner (Lim Wei Ming's mobile, never the demo's Dane), now as the number to type */
      ok(/^9111\s2233$/.test(await text(c.getByTestId('sign-in-hint'))) && /^Demo: any 6 digits work — try 9111\s2233$/.test(await text(c.getByTestId('sign-in-demo'))), 'signed out of the new studio: the demo’s line names its Owner')
      await signIn(c, 'dane@demostudio.sg')
      ok(pathOf(c) === '/dashboard' && await text(c.getByTestId('studio-name')) === 'Demo Studio', `signing in as Dane opens the demo studio (${pathOf(c)})`)   // (S42 audit A-04, a deliberate change of this rule) the front door
      ok(json(`select member_id, ended_at from studio_sessions where member_id = 'dane' and ended_at is null`).length === 1, '…with a session of its own there')
      await signOutDesk(c)
      await signIn(c, '9111 2233')
      ok(await text(c.getByTestId('studio-name')) === 'Lim & Co Interiors', 'and signing in with Lim Wei Ming’s number opens Lim & Co Interiors')
      if (limFile) {
        const ses = jsonOn(limFile, `select channel, via, ended_at from studio_sessions order by started_at`)
        ok(ses.length === 2 && ses[1].ended_at === null && ses[1].channel === 'phone' && ses[1].via === 'code', `its records: the sign-up’s session, then this sign-in’s — by its number, with a code (${ses.map((s) => `${s.channel}/${s.ended_at ? 'ended' : 'live'}`).join(' · ')})`)
      }
      await C.close()
    }

    // ── 8 · A studio of one ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · A studio of one')
      const C = await desk(); await out(C); const c = await page(C, 'solo')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      await kindCard(c, 'solo').click(); await c.getByTestId('sign-up-continue').click(); await settle(c, 500)
      ok(await text(c.getByTestId('sign-up-title')) === 'About your business' && await c.getByLabel('Business name', { exact: true }).count() === 1, 'I work on my own: About your business · Business name')
      ok(/Your own name works too/.test(await text(c.getByTestId('sign-up-details'))), '…with its helper: your own name works too')
      await shot(c, '09-solo-details-1440')
      await signUp(c, SOLO)
      const files = made()
      const soloFile = files.find((f) => f.startsWith('aisha-rahman-design-'))
      ok(!!soloFile && files.length === 2, `a second studio, of its own (${files.join(', ')})`)
      if (soloFile) ok(JSON.parse(sqlOn(fileOf(soloFile), `select value from settings where key = 'studio_origin'`)).kind === 'solo', 'its record says a studio of one')
      const welcome = c.getByRole('dialog').filter({ hasText: /^Welcome,/ })
      ok(/then your price book\./.test(await text(welcome)) && !/team/.test(await text(welcome)), 'its welcome speaks of no team')
      await welcome.getByRole('button', { name: 'Set up your studio' }).click(); await c.waitForURL(/\/settings/); await settle(c, 1500)
      const card = c.locator('#studio-setup')
      ok(/1 of 6 done/.test(await text(card)) && !/Your team/.test(await text(card)), 'Set up your studio: six steps — no “Your team” (shown only when it applies); the template step done on Free (S42 A-01)')   // (S42 audit A-01, a deliberate change of this rule)
      await shot(c, '10-solo-setup-1440')
      /* the Settings ghost draws the same six and the studio’s name (the shell's seed) */
      const G = await desk(); await G.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const g = await page(G, 'solo-ghost'); await g.goto(BASE + '/settings?setup=1', { waitUntil: 'load' }); await settle(g, 1500)
      const ghost = await g.evaluate(() => { const r = document.querySelector('[aria-label="Loading settings"]'); return r ? { text: r.textContent ?? '', steps: r.querySelectorAll('[data-two][data-static]').length } : null })
      ok(!!ghost && /Aisha Rahman Design/.test(ghost.text) && !/Demo Studio/.test(ghost.text), 'the Settings ghost names the studio, never the demo')
      ok(!!ghost && ghost.steps === 6 && !/Your team/.test(ghost.text), `…and draws its six steps (${ghost?.steps})`)
      await G.close(); await C.close()
    }

    // ── 9 · The sign-up's ghost ───────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Sign-up’s ghost')
      const boxes = async (p, ghost) => p.evaluate((g) => {
        const root = g ? document.querySelector('[aria-label="Loading"]') : document.querySelector('[data-testid="sign-up"]')
        if (!root) return null
        const r = (sel) => { const e = root.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.left), Math.round(b.width), Math.round(b.height)] }
        return { head: r('[class*="__signinHead"]'), form: r('[class*="__form"]'), foot: r('[class*="__foot"]') }
      }, ghost)
      for (const [w, mk] of [[1440, () => desk()], [390, () => phoneCtx()], [320, () => phoneCtx(320, 640)]]) {
        const G = await mk(); await out(G)
        await G.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
        const g = await page(G, `ghost-${w}`); await g.goto(BASE + '/sign-up', { waitUntil: 'load' }); await settle(g, 1400)
        const gb = await boxes(g, true)
        await shot(g, `11-ghost-${w}`)
        const R = await mk(); await out(R); const r = await page(R, `page-${w}`)
        await go(r, '/sign-up', 900); await ready(r, 'sign-up')
        const pb = await boxes(r, false)
        await shot(r, `12-page-${w}`)
        const same = (k, tol = 4) => !!gb?.[k] && !!pb?.[k] && gb[k].every((v, i) => Math.abs(v - pb[k][i]) <= tol)
        ok(same('head') && same('form', 6) && same('foot', 6), `${w}: the ghost’s head, choices and foot sit where the page has them (ghost ${JSON.stringify(gb)} · page ${JSON.stringify(pb)})`)
        await G.close(); await R.close()
      }
      /* sign-in's ghost draws the door too */
      const G = await desk(); await out(G)
      await G.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const g = await page(G, 'sign-in-ghost'); await g.goto(BASE + '/sign-in', { waitUntil: 'load' }); await settle(g, 1400)
      ok(/New to OpenMaison\? Start your studio/.test(await g.evaluate(() => document.querySelector('[aria-label="Loading"]')?.textContent ?? '')), 'sign-in’s ghost draws the door in its foot')
      await G.close()
    }

    // ── 10 · Phones ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · Phones')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const C = await phoneCtx(w, h); await out(C); const c = await page(C, `phone-${w}`)
        await go(c, '/sign-up', 400); await ready(c, 'sign-up')
        const o1 = await sideways(c); await shot(c, `13-who-${w}`)
        await c.getByTestId('sign-up-continue').click(); await settle(c, 500)
        await fillDetails(c, { studio: 'A studio with a rather long name of its own Pte Ltd', name: 'Someone With A Long Name', phone: '91234560', email: 'someone.with.a.long.address@example.com' })
        const o2 = await sideways(c); await shot(c, `14-details-${w}`)
        await c.getByTestId('sign-up-send').click(); await settle(c, 1200)
        const o3 = await sideways(c); await shot(c, `15-code-${w}`)
        ok(o1 <= 0 && o2 <= 0 && o3 <= 0 && await step(c) === 'code', `${w}: no sideways scroll on any step (${o1} · ${o2} · ${o3})`)
        const boxes = await c.getByTestId('sign-up-digit').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
        ok(boxes.length === 6 && boxes.every((x) => x >= 48), `${w}: the code’s boxes take a finger (${boxes.join(', ')})`)
        await C.close()
      }
      /* the new studio on a phone: its own block in the You sheet, the Studios group, no sideways scroll */
      const P = await phoneCtx(); const p = await page(P, 'phone-studio')
      await go(p, '/leads', 1200); await closeWelcome(p)
      ok(await sideways(p) <= 0, 'the new studio’s Leads at 390: no sideways scroll')
      await p.getByTestId('phone-avatar').click(); await settle(p, 800)
      ok(/Studios · demo only/i.test(await text((await openDemo(p)).getByTestId('demo-studios'))) && /Aisha Rahman Design|Lim & Co Interiors/.test(await text((await openDemo(p)).getByTestId('demo-studios'))), 'the phone’s You sheet carries the Studios group')
      await shot(p, '16-you-sheet-390')
      await P.close()
    }

    // ── 11 · Reset prototype to base ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · Reset prototype to base')
      const C = await desk(); const c = await page(C, 'reset')
      await go(c, '/leads', 900); await closeWelcome(c)
      ok(made().length >= 1 && await text(c.getByTestId('studio-name')) !== 'Demo Studio', 'a studio started here is open')
      await c.getByRole('button', { name: 'Maison AI' }).first().click(); await settle(c, 800)
      await c.getByRole('button', { name: /Reset prototype to base/ }).click(); await settle(c, 500)
      await c.getByRole('dialog', { name: 'Reset the prototype?' }).getByRole('button', { name: 'Reset' }).click()
      await c.waitForLoadState('networkidle').catch(() => {}); await settle(c, 4000)
      await go(c, '/leads', 1200)
      ok(await text(c.getByTestId('studio-name')) === 'Demo Studio' && !/Add your first lead/.test(await text(c.locator('main'))), 'the demo studio opens again, with its leads')
      ok(!fs.existsSync(HOME), 'and the studios started here are gone with their folder (the base is the demo alone)')
      const m = await openMenu(c)
      ok(await m.getByTestId('demo-studios').count() === 0, 'the Studios group goes too — shown only while a studio was started here')
      await C.close()
    }

    // ── 12 · Paused sign-ups (a server started with OPENMAISON_SIGN_UPS_PAUSED=1) ───────────────────────────────────────────────────
    if (PAUSED) {
      console.log('12 · Sign-ups paused')
      const C = await desk(); await out(C); const c = await page(C, 'paused')
      await go(c, '/sign-in', 400); await ready(c, 'sign-in')
      ok(await c.getByTestId('sign-in-sign-up').count() === 0, 'sign-in shows no way to sign up')
      await c.getByLabel(/^Mobile number or (work )?email/).fill('91112233'); await c.getByTestId('sign-in-send').click(); await settle(c, 1000)
      ok(/ask its Owner to add you/.test(await text(c.getByTestId('sign-in-no-account'))) && await text(c.getByTestId('sign-in-sign-up-paused')) === 'New to OpenMaison? Contact support for account setup.', '“No account found”: who to ask, and 1.0’s “Contact support for account setup” for a new studio')
      await go(c, '/sign-up', 400); await ready(c, 'sign-up')
      ok(/^lock\s*Sign-ups are paused\. Contact support for account setup\.$/.test(await text(c.getByTestId('sign-up-blocked'))) && await c.getByTestId('sign-up-continue').count() === 0, 'sign-up’s first step: “Sign-ups are paused. Contact support for account setup.” — and no way on')
      await shot(c, '17-paused-1440')
      ok(made().length === 0, 'nothing made')
      await C.close()
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    /* the server back on the demo before the files go (a studio left open would answer every later probe) */
    if (made().length) {
      try {
        const C = await desk(); const c = await C.newPage(); await c.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await c.waitForTimeout(800)
        if ((await c.getByTestId('studio-name').innerText().catch(() => '')) !== 'Demo Studio') {
          const dlg = c.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await dlg.count()) await dlg.getByRole('button', { name: 'Not now' }).click().catch(() => {})
          await c.getByTestId('studio-block').click(); await c.waitForTimeout(500)
          await (await openDemo(c)).getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: 'Demo Studio' }).click(); await c.waitForTimeout(2500)
        }
        await C.close()
      } catch (e) { console.log('  ! could not switch the server back to the demo — restart it:', String(e).slice(0, 120)) }
    }
    fs.rmSync(HOME, { recursive: true, force: true })
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(still.length ? `  ✗ not as found: ${still.join(', ')}` : '  ✓ the scratch DB is as it was found (and no studio left beside it)')
    if (still.length) fail++
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
