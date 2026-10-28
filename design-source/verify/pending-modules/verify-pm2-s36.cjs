// Pending modules, step S36 · Try the AI Visualizer without an account (the owner's "build all of them but one after the other", 2026-10-11;
// survey keys public:try-it-visualizer · onboarding:try-visualizer-public). Each item asserted as the rule it builds, never another round's count:
//  - the trial lives on the website (/site/try + six tool pages), open SIGNED OUT, each page with its own search copy (1.0's, 2.0's names),
//    canonical, link-preview card, breadcrumb and (tool pages) FAQ data; an unknown tool is a real 404; 1.0's addresses land on it; the
//    sitemap lists it; the Cookie Policy names its cookie; the Visualizer's site page says Try now
//  - the start: the allowance (3 of 3), the samples, the live before / after the engine made, six tool cards each opening its own page;
//    sample-only tools say so; the Sketch page offers the sample sketch
//  - the editor is the studio's own (the rail's five modes, the canvas, the versions, Generate) over the whole screen, the site behind it inert
//  - a render: asked of the server, drawn in the browser, stamped, then counted — "V1 is ready · 2 of 3 free renders left"; the count in a
//    signed, httpOnly cookie scoped to the trial; the shown picture and the downloaded file both carry the mark in 1.0's place
//  - three renders, then 1.0's gate (Start your studio · Book a demo) where Generate was; a reload keeps it; a forged count adds nothing;
//    a second tab that spent the last render is refused BY THE SERVER; ten renders a minute from one address, the eleventh refused with
//    1.0's words
//  - an uploaded photo (a HEIC, through lib/heic.ts) opens with its surfaces marked roughly; the sample-only tools say what they can do
//  - nothing the visitor makes is a studio's record (every table as found)
//  - Start your studio carries the visitor's own photo into the studio they make (sign-up says so; the studio's AI Visualizer opens on it)
//  - ghosts: a slow hop shows the trial's ghost with its heading where the page's lands (1440 · 390 touch)
//  - no sideways scroll at 1440 · 768 · 390 · 320 (against screen.width) on the start, a tool page and the editor; no page errors
//  - OFF=1 (a server started with TRIAL_VISUALIZER_ENABLED=false): every trial address is the site's 404
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. What it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s36.cjs <scratch.db> [shotDir] [base]
/* (pending modules S43C, a deliberate change of this rule) the AI Visualizer's living room is the owner's photo (1.0's 4a51f3522): its walls are
   'Cream Painted Side Wall' · 'Cream Painted Back Wall' · 'Cream Painted TV Wall', its sofa 'Cream Bouclé Sofa' (were 'White Painted Back Wall', 'Grey Fabric Sofa'). */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const sharp = require('sharp')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s36')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const OFF = process.env.OFF === '1'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !OFF && (!ONLY.length || ONLY.includes(String(n)))
const HOME = `${path.resolve(DB)}.studios`
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const o = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return o ? JSON.parse(o) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const made = () => { try { return fs.readdirSync(HOME).filter((f) => /\.db$/.test(f)) } catch { return [] } }

/* 1.0's watermark geometry (src/lib/render/trial-gate.ts) — the box the mark must be drawn in */
const markBox = (W, H) => { const w = Math.min(Math.round(W * 0.4), Math.max(110, Math.min(260, Math.round(W * 0.13)))); const h = Math.round(w * 173 / 885); const pad = Math.max(12, Math.round(W * 0.018)); return { x: W - w - pad, y: H - h - pad, w, h } }
/** the share of the mark's own solid pixels (the logo's glyphs, from the app's watermark.png) that are near-white in a box of a picture */
const MARK_PNG = path.join(__dirname, '..', '..', '..', 'public', 'site', 'try', 'watermark.png')
async function glyphsWhite(buf, box) {
  const shape = await sharp(MARK_PNG).resize(box.w, box.h, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pic = await sharp(buf).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let solid = 0, white = 0
  for (let k = 0; k < box.w * box.h; k++) {
    if (shape.data[k * 4 + 3] < 230) continue
    solid++
    const r = pic.data[k * 3], g = pic.data[k * 3 + 1], bl = pic.data[k * 3 + 2]
    if (r >= 205 && g >= 205 && bl >= 205) white++
  }
  return solid ? white / solid : 0
}
/** whether a JPEG carries the mark: where the logo's glyphs fall in 1.0's box the picture is white, and in the same box on the opposite
    corner it isn't (so it is the mark, not a pale floor) */
async function stamped(buf) {
  const m = await sharp(buf).metadata()
  const box = markBox(m.width, m.height)
  const mark = await glyphsWhite(buf, box), control = await glyphsWhite(buf, { ...box, x: m.width - box.x - box.w })
  return { W: m.width, H: m.height, mark, control, yes: mark > 0.6 && control < 0.3 }
}

const SEO = {
  home: ['Try the AI Visualizer', /free for 3 renders/],
  style: ['Style AI — Restyle Any Room', /restyle the whole room in one pass/],
  materials: ['Materials AI — Change Room Finishes', /tap any surface, and swap the finish/],
  lighting: ['Lighting AI — Relight Any Room', /daylight to cozy evening/],
  furniture: ['Furniture AI — Change Furniture in Any Room', /Remove or recolour individual pieces/],
  defurnish: ['Defurnish AI — Empty Any Room', /Clear a room to a blank canvas/],
  sketch: ['Sketch to Render', /Render a hand sketch into a lifelike photo/],
}
const TOOLS = ['style', 'materials', 'lighting', 'furniture', 'defurnish', 'sketch']
/** a photo of a room that is no sample (the demo design's own edit) — an upload */
const PHOTO = path.join(__dirname, '..', '..', '..', 'public', 'visualizer', 'demo', 'living-room-edit.jpg')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  if (!OFF && fs.existsSync(HOME) && made().length) { console.log(`  ✗ ${HOME} already holds studios — start from a clean scratch copy`); process.exit(1) }
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
    const f = path.join(os.tmpdir(), `pm2-s36-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f)
    return changed
  }
  /* a browser that signed out (the site is anyone's); the site's first-visit welcome already seen */
  const signedOut = async (o = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
    await ctx.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
    await ctx.addInitScript(() => { try { sessionStorage.setItem('om.site.intro', '1') } catch {} })
    return ctx
  }
  const phone = (w = 390, h = 844, o = {}) => signedOut({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, ...o })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 220)}`)); return p }
  const go = async (p, url, ms = 500) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(ms); return r }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re) => { for (let i = 0; i < 40; i++) { const t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(200) } return snackText(p) }
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 150)) } }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const cookie = async (ctx, name) => (await ctx.cookies(BASE + '/site/try')).find((c) => c.name === name) ?? null
  const openSample = async (p, key = 'living-room') => { await p.locator(`[data-testid="trial-sample"][data-sample="${key}"]`).click(); await p.getByTestId('trial-editor').waitFor({ timeout: 15000 }); await p.waitForTimeout(900) }
  const gotIt = async (p) => { const h = p.getByTestId('viz-hint'); if (await h.count()) { await h.getByRole('button', { name: 'Got it' }).click(); await p.waitForTimeout(200) } }
  const waitRun = async (p) => { await p.getByTestId('viz-running').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {}); await p.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 40000 }); await p.waitForTimeout(700) }
  const pickWall = async (p, swatch = 'Cool Grey') => {
    await p.getByTestId('viz-mode-surfaces').click(); await p.waitForTimeout(300)
    await p.getByRole('button', { name: 'Cream Painted Side Wall' }).first().click(); await p.waitForTimeout(900)
    await p.getByTestId('viz-swatch').filter({ hasText: swatch }).first().click(); await p.waitForTimeout(300)
  }
  const pickLight = async (p, i = 0) => { await p.getByTestId('viz-mode-lighting').click(); await p.waitForTimeout(300); await p.getByTestId('viz-light-card').nth(i).click(); await p.waitForTimeout(400) }
  const generate = async (p) => { await p.getByTestId('viz-generate').click(); await waitRun(p) }
  const allowance = (p) => text(p.getByTestId('viz-allowance'))
  let carryRan = false

  try {
    if (OFF) {
      console.log('\n§off the trial switched off (TRIAL_VISUALIZER_ENABLED=false)')
      const ctx = await signedOut(); const p = await page(ctx, 'off')
      for (const u of ['/site/try', ...TOOLS.map((t) => `/site/try/${t}`)]) {
        const r = await p.goto(BASE + u, { waitUntil: 'networkidle' })
        ok(r.status() === 404 && /This page doesn’t exist/.test(await text(p.locator('main'))), `${u}: the site's own 404 (${r.status()})`)
      }
      const r = await p.goto(BASE + '/try-visualizer/materials', { waitUntil: 'networkidle' })
      ok(r.status() === 404, `1.0's /try-visualizer/materials lands on the same 404 (${r.status()})`)
      /* (the sitemap and the Visualizer page's Try now are built with the site — they follow the switch as it was set for the build; this
         server was started with it off on a build made with it on, so only the pages answered at request time are checked here) */
      await ctx.close()
    }

    if (want(1)) {
      console.log('\n§1 the pages: open signed out, each with its own search copy and data')
      const ctx = await signedOut(); const p = await page(ctx, '§1')
      for (const key of ['home', ...TOOLS]) {
        const url = key === 'home' ? '/site/try' : `/site/try/${key}`
        const r = await go(p, url, 200)
        const t = await p.evaluate(() => ({
          h1: document.querySelectorAll('h1').length, h1Text: document.querySelector('h1')?.textContent ?? '', title: document.title,
          desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
          og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
          ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type'] } catch { return 'bad' } }),
        }))
        const [title, desc] = SEO[key]
        ok(r.status() === 200 && new URL(p.url()).pathname === url && t.h1 === 1 && t.title === `${title} | OpenMaison` && desc.test(t.desc) && t.canonical.endsWith(url) && /\/card\/site\/try/.test(t.og)
          && t.ld.includes('BreadcrumbList') && (key === 'home' || t.ld.includes('FAQPage')),
          `${url} — 200 signed out, "${t.title}", its description, canonical, its own card${key === 'home' ? '' : ', FAQ data'}`)
        if (key !== 'home') {
          const card = await ctx.request.get(BASE + `/card/site/try-${key}`)
          ok(card.status() === 200 && /image\/png/.test(card.headers()['content-type'] ?? ''), `/card/site/try-${key} draws the page's link preview`)
        }
      }
      const r404 = await p.goto(BASE + '/site/try/bogus', { waitUntil: 'networkidle' })
      ok(r404.status() === 404 && /This page doesn’t exist/.test(await text(p.locator('main'))), `an unknown tool is a real 404 in the site's frame (${r404.status()})`)
      for (const [from, to] of [['/try', '/site/try'], ['/try-visualizer', '/site/try'], ['/try-visualizer/materials', '/site/try/materials'], ['/try-visualizer/defurnish', '/site/try/defurnish']]) {
        await p.goto(BASE + from, { waitUntil: 'networkidle' })
        ok(new URL(p.url()).pathname === to, `1.0's ${from} lands on ${to}`)
      }
      const sm = await (await ctx.request.get(BASE + '/sitemap.xml')).text()
      const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
      ok(['/site/try', ...TOOLS.map((t) => `/site/try/${t}`)].every((u) => locs.includes(u)), 'the sitemap lists the trial and its six pages')
      const policy = await (await ctx.request.get(BASE + '/site/cookies')).text()
      ok(/om_trial/.test(policy) && /Counts the free renders you have made in the AI Visualizer trial/.test(policy) && /24 hours after your last render/.test(policy), 'the Cookie Policy names the trial’s cookie, why and for how long')
      await go(p, '/site/platform/visualizer', 300)
      const tryNow = p.getByTestId('module-try')
      ok(await tryNow.count() === 1 && await p.getByTestId('module-closing-try').count() === 1 && await p.getByTestId('module-book-demo').count() === 0 && (await tryNow.getAttribute('href')) === '/site/try',
        'the Visualizer’s site page says Try now (1.0’s) where the others say Book a demo — at its top and its close')
      await go(p, '/site/platform/projects', 200)
      ok(await p.getByTestId('module-book-demo').count() === 1 && await p.getByTestId('module-try').count() === 0, '…and only that page (Projects keeps Book a demo)')
      await ctx.close()
    }

    if (want(2)) {
      console.log('\n§2 the start: the allowance, the samples, the before / after, the six tools')
      const ctx = await signedOut(); const p = await page(ctx, '§2')
      await go(p, '/site/try', 600)
      ok(await text(p.getByTestId('trial-allowance')) === 'FREE · NO SIGN-UP · 3 OF 3 FREE VERSIONS LEFT' || /^free · no sign-up · 3 of 3 free versions left$/i.test(await text(p.getByTestId('trial-allowance'))), 'the eyebrow: “Free · no sign-up · 3 of 3 free versions left”')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      ok(/^See your room, redesigned, in seconds\.$/.test(await text(p.locator('h1'))), 'the title (1.0’s, its fifteen seconds now the engine’s few)')
      ok(await p.locator('[data-testid="trial-sample"]').count() === 3, 'three sample rooms to start from')
      const hero = await p.getByTestId('trial-hero-compare').boundingBox()
      ok(!!hero && hero.width > 400 && Math.abs(hero.width / hero.height - 1.5) < 0.03, `the live before / after draws at the photos’ 3:2 (${hero ? `${Math.round(hero.width)}×${Math.round(hero.height)}` : 'none'})`)
      const cards = await p.locator('[data-testid="trial-tool-card"]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-tool'), e.querySelector('a')?.getAttribute('href'), e.querySelector('[data-testid]')?.getBoundingClientRect().height ?? 0]))
      ok(cards.length === 6 && cards.every(([t, href]) => href === `/site/try/${t}`), `six tool cards, each opening its own page (${cards.map(([t]) => t).join(', ')})`)
      ok(await p.locator('[data-testid="trial-tool-card"] [role="slider"]').count() === 6, 'each card is a before / after you can drag')
      await shot(p, 's36-start-1440', true)
      await p.locator('[data-testid="trial-tool-card"][data-tool="materials"] a').click(); await p.waitForURL(/\/site\/try\/materials$/); await p.waitForTimeout(600)
      ok(/^Materials$/.test(await text(p.locator('h1'))) && await p.getByTestId('trial-steps').locator('li').count() === 4 && await p.getByTestId('trial-faqs').locator('details').count() >= 3, 'Materials’ page leads with its tool, then how it works (4 steps), its features and questions')
      await p.getByTestId('trial-crumb').click(); await p.waitForURL(/\/site\/try$/, { timeout: 8000 }).catch(() => {})
      ok(new URL(p.url()).pathname === '/site/try', 'its crumb returns to the trial’s start')
      await go(p, '/site/try/defurnish', 300)
      ok(/Empty the room works on the sample rooms here/.test(await text(p.getByTestId('trial-sample-only-line'))), 'Defurnish says plainly it works on the sample rooms here')
      await go(p, '/site/try/sketch', 300)
      ok(await p.locator('[data-testid="trial-sample"]').count() === 1 && (await p.locator('[data-testid="trial-sample"]').getAttribute('data-sample')) === 'kitchen:sketch' && /Render from sketch works on the sample sketch here/.test(await text(p.getByTestId('trial-sample-only-line'))), 'Sketch offers the sample sketch, and says your own picture opens as a photo')
      await p.getByTestId('trial-faqs').locator('summary').first().click()
      ok(await p.getByTestId('trial-faqs').locator('details[open]').count() === 1, 'a question opens in place')
      await shot(p, 's36-tool-sketch-1440', true)
      await ctx.close()
    }

    let dbBefore = null
    if (want(3)) {
      dbBefore = hashes()
      console.log('\n§3 a sample room → the studio’s own editor → a render, asked, drawn, stamped, counted')
      const ctx = await signedOut(); const p = await page(ctx, '§3')
      await go(p, '/site/try', 400)
      await openSample(p)
      ok(await p.locator('[data-testid="trial-editor"] [role="tablist"][aria-label="Edit"] [role="tab"]').count() === 5 && await p.getByTestId('viz-generate').count() === 1 && await p.getByTestId('viz-version').count() === 1,
        'the editor is the studio’s: five modes, the canvas, the versions (the Original), one Generate')
      const frame = await p.getByTestId('trial-editor').boundingBox()
      ok(!!frame && frame.x === 0 && frame.y === 0 && frame.width === 1440 && frame.height === 1024, 'it owns the whole screen')
      ok(await p.evaluate(() => !!document.querySelector('#main-content')?.closest('[inert]') && !document.querySelector('[data-testid="trial-editor"]')?.closest('[inert]')), 'the site behind it is out of reach (inert); the editor is not')
      ok(/3 of 3 free versions left · no sign-up needed/.test(await allowance(p)) && await p.getByTestId('viz-options-toggle').count() === 0, 'under Generate: “3 of 3 free versions left · no sign-up needed” — Fast, one version, nothing to set (1.0’s)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      ok(await p.getByTestId('viz-hint').count() === 1, 'the first-visit tip')
      await gotIt(p)
      await shot(p, 's36-editor-1440')
      await pickWall(p)
      ok(/Walls → Cool Grey/.test(await text(p.getByTestId('viz-changes'))), 'a square on the photo opens the walls; a finish waits as a change')
      await p.keyboard.press('Meta+z'); await p.waitForTimeout(300)
      ok(await p.getByTestId('viz-changes').count() === 0, '⌘Z takes it back (the editor’s own history)')
      await p.keyboard.press('Meta+Shift+z'); await p.waitForTimeout(300)
      await generate(p)
      ok(/^V1/.test(await text(p.getByTestId('viz-stage-chip'))) && await p.getByTestId('viz-version').count() === 2, 'V1 is on the canvas and in the strip')
      ok(/V1 is ready .*· 2 of 3 free versions left/.test(await waitSnack(p, /is ready/)), `the ready line says what is left (“${await snackText(p)}”)`)   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      ok(/2 of 3 free versions left/.test(await allowance(p)), 'the allowance follows the server: 2 of 3')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      const c = await cookie(ctx, 'om_trial')
      ok(!!c && c.httpOnly && c.path === '/site/try' && /^[A-Za-z0-9_-]+\.[0-9a-f]{64}$/.test(c.value) && c.expires > Date.now() / 1000 + 86000, `the count is a signed, httpOnly cookie scoped to the trial for a day (${c ? `${c.path}, ${c.value.slice(0, 18)}…` : 'none'})`)
      ok(JSON.parse(Buffer.from(c.value.split('.')[0], 'base64url').toString()).n === 1, '…holding one render used')
      ok(/That’s one of your 3 free versions/.test(await text(p.getByTestId('trial-soft'))) && await p.getByTestId('trial-soft-start').count() === 1, 'after the first render: the soft ask — Start your studio (1.0’s moment)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      /* the picture shown carries the mark */
      const shownSrc = await p.locator('[data-testid="viz-frame"] img[alt="Living room · V1"]').first().getAttribute('src').catch(() => null)
      const shown = shownSrc && shownSrc.startsWith('data:image/jpeg') ? await stamped(Buffer.from(shownSrc.split(',')[1], 'base64')) : null
      ok(!!shown && shown.yes, `the version on screen carries OpenMaison’s mark in 1.0’s place (${shown ? `${shown.W}×${shown.H}: ${Math.round(shown.mark * 100)}% of the logo’s glyphs white in 1.0’s box, ${Math.round(shown.control * 100)}% opposite` : 'no picture'})`)
      console.log('\n§4 download: the mark is in the file’s pixels')
      const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('trial-download').click()])
      const file = path.join(dir, 's36-download.jpg'); await dl.saveAs(file)
      const st = await stamped(fs.readFileSync(file))
      ok(dl.suggestedFilename() === 'Render - Living room - V1.jpg', `the file is named as a studio’s render is (${dl.suggestedFilename()})`)
      ok(st.yes && st.W >= 800, `the downloaded picture carries the mark (${st.W}×${st.H}: ${Math.round(st.mark * 100)}% of the logo’s glyphs white in 1.0’s box, ${Math.round(st.control * 100)}% in the same box opposite)`)
      ok(/free versions carry a small watermark/.test(await waitSnack(p, /watermark/)), 'the download says free versions carry a small watermark')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      console.log('\n§5 compare, the second and third renders, the gate')
      await p.getByTestId('viz-compare-toggle').click(); await p.waitForTimeout(600)
      ok(await p.getByTestId('viz-compare').isVisible(), 'Compare lays the Original under the slider')
      await p.getByTestId('viz-compare-toggle').click(); await p.waitForTimeout(300)
      await pickLight(p, 0); await p.waitForTimeout(1200)
      const pv = await p.getByTestId('viz-preview').getAttribute('src').catch(() => null)
      const pvMark = pv && pv.startsWith('data:image/jpeg') ? await stamped(Buffer.from(pv.split(',')[1], 'base64')) : null
      ok(!!pvMark && pvMark.yes, 'the light previews live on the photo — and a live light wears the mark too (it is a picture of its own)')
      await generate(p)
      ok(/1 of 3 free versions left/.test(await allowance(p)), 'a relight: 1 of 3 left')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      await p.getByTestId('viz-mode-style').click(); await p.waitForTimeout(300)
      await p.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).click(); await p.waitForTimeout(300)
      await generate(p)
      const gate = p.getByTestId('trial-gate')
      ok(await gate.count() === 1 && /You’ve used all 3 free versions/.test(await text(gate)) && await p.getByTestId('viz-generate').count() === 0, 'after the third: 1.0’s gate where Generate was — “You’ve used all 3 free versions”')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      ok(await p.getByTestId('trial-gate-start').count() === 1 && await p.getByTestId('trial-gate-demo').count() === 1, 'its two ways on: Start your studio and Book a demo')
      ok(await p.getByTestId('viz-version').count() === 4, 'the three versions stay to look at, compare and download')
      await shot(p, 's36-gate-1440')
      await p.getByTestId('trial-gate-demo').click(); await p.waitForTimeout(700)
      const demo = p.getByRole('dialog').filter({ hasText: /Book a demo|demo/i })
      ok(await demo.count() >= 1 && await demo.first().isVisible(), 'Book a demo opens the site’s own form over the editor')
      await demo.first().getByLabel('Full name', { exact: false }).first().fill('Probe Visitor').catch(() => {})
      ok(await demo.first().evaluate((d) => !d.closest('[inert]')) && (await demo.first().getByLabel('Full name', { exact: false }).first().inputValue().catch(() => '')) === 'Probe Visitor', '…and it can be typed in (the site behind the editor is inert, the form over it is not)')
      await p.keyboard.press('Escape'); await p.waitForTimeout(500)
      console.log('\n§6 the limit holds: a reload, a forged count, a second tab')
      await p.getByTestId('trial-back').click(); await p.waitForTimeout(400)
      const leave = p.getByRole('dialog').filter({ hasText: 'Leave this room?' })
      ok(/Your versions aren’t saved in the free trial\. Download the ones you want to keep first\./.test(await text(leave)), 'Start over with renders asks first (1.0’s words, Stay · Leave)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      await leave.getByRole('button', { name: 'Leave' }).click(); await p.waitForTimeout(500)
      ok(await p.getByTestId('trial-editor').count() === 0 && await p.evaluate(() => !document.querySelector('#main-content')?.closest('[inert]')), 'Leave returns to the start, the site in reach again')
      await go(p, '/site/try', 400)
      ok(/no free versions left/i.test(await text(p.getByTestId('trial-allowance'))), 'after a reload: “No free versions left” (the cookie, not the page, keeps the count)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      await openSample(p)
      ok(await p.getByTestId('trial-gate').count() === 1 && await p.getByTestId('viz-generate').count() === 0, 'a room opened then goes straight to the gate')
      /* a forged count — never believed */
      const forged = `${Buffer.from(JSON.stringify({ n: -10 })).toString('base64url')}.${'0'.repeat(64)}`
      await ctx.clearCookies({ name: 'om_trial' }); await ctx.addCookies([{ name: 'om_trial', value: forged, url: BASE + '/site/try' }])
      await go(p, '/site/try', 300)
      ok(/3 of 3 free versions left/i.test(await text(p.getByTestId('trial-allowance'))), 'a cookie the app didn’t sign counts nothing — a forged “-10 used” gives 3, never 13')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      /* two tabs, one render left: the one that waited is refused by the server, not the page */
      const one = (await (async () => { const pp = await ctx.newPage(); return pp })())
      await ctx.clearCookies({ name: 'om_trial' })
      await go(p, '/site/try', 200); await openSample(p); await gotIt(p); await pickLight(p, 1); await generate(p); await pickLight(p, 2); await generate(p)
      ok(/1 of 3 free versions left/.test(await allowance(p)), 'tab A: two renders made, 1 left')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      one.on('pageerror', (e) => errors.push(`§6 tab B: ${String(e).slice(0, 200)}`))
      await one.goto(BASE + '/site/try', { waitUntil: 'networkidle' }); await one.waitForTimeout(300)
      await openSample(one); await gotIt(one); await pickLight(one, 3); await generate(one)
      ok(await one.getByTestId('trial-gate').count() === 1, 'tab B spends the last render')
      await pickLight(p, 4)
      await p.getByTestId('viz-generate').click(); await p.waitForTimeout(1500)
      ok(await p.getByTestId('trial-gate').count() === 1 && await p.getByTestId('viz-version').count() === 3, 'tab A, still showing 1 left, asks — the server says none are left: the gate, and no version made')
      await one.close()
      await ctx.close()
    }

    if (want(7)) {
      console.log('\n§7 ten renders a minute from one address — the eleventh refused (1.0’s per-address limit)')
      const ctx = await signedOut({ extraHTTPHeaders: { 'X-Forwarded-For': '198.51.100.36' } }); const p = await page(ctx, '§7')
      let made = 0, refused = null
      for (let round = 0; round < 4 && !refused; round++) {
        await ctx.clearCookies({ name: 'om_trial' })
        await go(p, '/site/try', 200); await openSample(p, 'bedroom'); await gotIt(p)
        for (let i = 0; i < 3 && !refused; i++) {
          await pickLight(p, (round * 3 + i) % 6)
          await p.getByTestId('viz-generate').click(); await p.waitForTimeout(500)
          await p.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 40000 }).catch(() => {}); await p.waitForTimeout(400)
          const err = await text(p.getByTestId('viz-error'))
          if (err) refused = err.replace(/^error\s*/, ''); else made++
        }
      }
      ok(made === 10 && refused === 'You’re going a little fast — give it a moment and try again.', `ten renders made, the eleventh refused with 1.0’s words (${made} made · “${refused}”)`)
      ok(/[23] of 3 free versions left|1 of 3/.test(await allowance(p)), 'and nothing was counted for it (the browser’s allowance unchanged)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
      await shot(p, 's36-too-fast-1440')
      await ctx.close()
    }

    if (want(8)) {
      console.log('\n§8 your own photo (a HEIC) and the sample-only tools')
      const ctx = await signedOut(); const p = await page(ctx, '§8')
      await go(p, '/site/try', 300)
      await p.getByTestId('trial-file').setInputFiles(path.join(__dirname, 'pm2-s20', 'fixtures', 'bedroom.heic'))
      await p.getByTestId('trial-editor').waitFor({ timeout: 30000 }); await p.waitForTimeout(1200)
      ok(/^bedroom$|^Bedroom$|Your room/.test(await text(p.locator('[data-testid="trial-topbar"] h1'))), `an iPhone’s HEIC opens as a room, named from its file (“${await text(p.locator('[data-testid="trial-topbar"] h1'))}”)`)
      await p.getByTestId('viz-mode-surfaces').click(); await p.waitForTimeout(400)
      ok(await p.getByTestId('viz-rough').count() >= 1, 'its surfaces are marked roughly — and it says so, with Draw a surface (the studio editor’s own note)')
      await p.getByTestId('viz-mode-furniture').click(); await p.waitForTimeout(300)
      ok(await p.getByRole('button', { name: 'Add furniture' }).count() >= 1, 'no furniture read on a photo of your own — mark a piece with a tap (Add furniture)')
      await shot(p, 's36-upload-1440')
      await go(p, '/site/try/defurnish', 300)
      await p.getByTestId('trial-file').setInputFiles(PHOTO)
      await p.getByTestId('trial-editor').waitFor({ timeout: 20000 }); await p.waitForTimeout(900)
      ok(/Empty the room works on the sample rooms here/.test(await text(p.getByTestId('trial-sample-only'))), 'Defurnish on your own photo: the line says what this preview can empty')
      await go(p, '/site/try/defurnish', 300); await openSample(p)
      ok(/Empty the room/.test(await text(p.getByTestId('viz-generate'))) && await p.getByTestId('viz-generate').isEnabled(), 'Defurnish on a sample room opens with Empty the room ready')
      await go(p, '/site/try/sketch', 300)
      await p.getByTestId('trial-file').setInputFiles(PHOTO)
      await p.getByTestId('trial-editor').waitFor({ timeout: 20000 }); await p.waitForTimeout(900)
      const note = p.getByTestId('trial-sample-only')
      ok(/your picture opens as a photo/.test(await text(note)) && await note.getByRole('button', { name: 'Open the sample sketch' }).count() === 1, 'Sketch with your own picture: it opens as a photo, and offers the sample sketch')
      await note.getByRole('button', { name: 'Open the sample sketch' }).click(); await p.waitForTimeout(1500)
      ok(/Render from sketch/.test(await text(p.getByTestId('viz-generate'))) && /Kitchen sketch/.test(await text(p.locator('[data-testid="trial-topbar"] h1'))), 'the sample sketch opens, Render from sketch ready')
      await ctx.close()
    }

    if (want(9)) {
      console.log('\n§9 every width; the phone’s camera model')
      for (const [w, h, touch] of [[1440, 1024, false], [768, 1024, true], [768, 1024, false], [390, 844, true], [320, 640, true]]) {
        const ctx = touch ? await phone(w, h) : await signedOut({ viewport: { width: w, height: h } }); const p = await page(ctx, `§9 ${w}`)
        for (const u of ['/site/try', '/site/try/lighting']) {
          await go(p, u, 300)
          ok(await sideways(p) <= 0, `${u} at ${w}${touch ? ' touch' : ''}: no sideways scroll`)
        }
        await go(p, '/site/try', 200); await openSample(p)
        ok(await sideways(p) <= 0, `the editor at ${w}${touch ? ' touch' : ''}: no sideways scroll`)
        if (w === 390 && touch) {
          ok(await p.locator('[data-variant="dock"] [role="tab"]').count() === 5, 'the phone: the camera model — the dock’s five modes')
          await shot(p, 's36-editor-390')
          await p.getByTestId('viz-mode-lighting').click(); await p.waitForTimeout(700)
          ok(await p.getByTestId('viz-tray').isVisible(), 'a mode opens its tray above the dock')
          await shot(p, 's36-tray-390')
          await p.getByTestId('viz-light-card').first().click(); await p.waitForTimeout(400)
          await p.getByRole('button', { name: 'Close the panel' }).click(); await p.waitForTimeout(500)
          await generate(p)
          ok(/2 of 3 free versions left/.test(await allowance(p)), 'a render on the phone: 2 of 3 left on the go line')   // (the calm UI build 2026-10-27, a deliberate change) — 6-07 · W-463: the trial says "versions"
          await shot(p, 's36-rendered-390')
          for (const i of [2, 3]) { await p.getByTestId('viz-mode-lighting').click(); await p.waitForTimeout(600); await p.getByTestId('viz-light-card').nth(i).click(); await p.waitForTimeout(300); await p.getByRole('button', { name: 'Close the panel' }).click(); await p.waitForTimeout(500); await generate(p) }
          ok(await p.getByTestId('trial-gate').isVisible() && await p.getByTestId('trial-gate-start').isVisible(), 'the phone’s gate sits on the go line: Start your studio · Book a demo')
          ok(await sideways(p) <= 0, 'the phone’s gate: no sideways scroll')
          await shot(p, 's36-gate-390')
          await p.getByTestId('trial-menu').click(); await p.waitForTimeout(500)
          ok(await p.getByRole('menuitem', { name: 'Start your studio' }).count() === 1 && await p.getByRole('menuitem', { name: 'Book a demo' }).count() === 1, 'the phone’s ⋯: Start your studio, Book a demo, Use another photo')
          await shot(p, 's36-menu-390')
          await p.keyboard.press('Escape'); await p.waitForTimeout(300)
          await go(p, '/site/try', 300)
          await shot(p, 's36-start-390', true)
          await go(p, '/site/try/materials', 300)
          await shot(p, 's36-tool-materials-390', true)
        }
        await ctx.close()
      }
    }

    if (want(10)) {
      console.log('\n§10 ghosts: on a slow network the hop shows the trial’s ghost, its heading where the page’s lands')
      for (const [w, touch] of [[1440, false], [390, true]]) {
        for (const [from, to] of [['/site/platform/visualizer', '/site/try'], ['/site/try', '/site/try/furniture']]) {
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
          if (seen) await shot(p, `s36-ghost-${to.split('/').pop()}-${w}`)
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
          await waitFor(async () => (await ghost.count()) === 0, 12000)
          await p.waitForTimeout(500)
          const pTop = (await p.locator('main h1').first().boundingBox().catch(() => null))?.y ?? null
          ok(seen && gTop !== null && pTop !== null && Math.abs(gTop - pTop) <= 8, `${w}${touch ? ' touch' : ''}: ${from} → ${to}: the ghost's title at ${Math.round(gTop ?? -1)}, the page's at ${Math.round(pTop ?? -1)}`)
          await ctx.close()
        }
      }
    }

    if (want(3) && dbBefore) {
      const changed = TABLES.filter((t) => hashOf(t) !== dbBefore.get(t))
      ok(changed.length === 0, `nothing a visitor made is a studio’s record — every table as it was (${changed.join(', ') || 'none changed'})`)
    }

    if (want(11)) {
      console.log('\n§11 Start your studio: the visitor’s own photo comes with them')
      carryRan = true
      const ctx = await signedOut(); const p = await page(ctx, '§11')
      await go(p, '/site/try', 300)
      await p.getByTestId('trial-file').setInputFiles({ name: 'Our living room.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(PHOTO) })
      await p.getByTestId('trial-editor').waitFor({ timeout: 20000 }); await p.waitForTimeout(800)
      await p.getByTestId('trial-menu').click(); await p.waitForTimeout(400)
      await p.getByRole('menuitem', { name: 'Start your studio' }).click()
      await p.waitForURL(/\/sign-up/, { timeout: 15000 }); await p.waitForLoadState('networkidle'); await p.waitForTimeout(600)
      ok(/\/sign-up\?from=try$/.test(p.url()), 'Start your studio opens sign-up')
      ok(/Your room photo from the free trial comes with you/.test(await text(p.getByTestId('sign-up-carried'))), 'sign-up says the photo comes along')
      const carried = await p.evaluate(() => ({ note: sessionStorage.getItem('om.trial.room'), photo: (sessionStorage.getItem('om.trial.photo') ?? '').slice(0, 23) }))
      ok(!!carried.note && carried.photo.startsWith('data:image/jpeg'), 'it waits in this tab alone (sessionStorage), the visitor’s own photo — not a render')
      await shot(p, 's36-sign-up-carried-1440')
      await p.locator('[data-testid="sign-up-kind"][data-kind="studio"] button').click(); await p.getByTestId('sign-up-continue').click(); await p.waitForTimeout(500)
      for (const [label, v] of [['Studio name', 'Trial Room Studio'], ['Your name', 'Mei Ling Tan'], ['Mobile number', '93334455']]) await p.getByLabel(label, { exact: true }).fill(v)
      await p.getByTestId('sign-up-send').click(); await p.waitForTimeout(1200)
      await p.getByTestId('sign-up-digit').first().click(); await p.keyboard.type('123456'); await p.waitForTimeout(200)
      await p.getByTestId('sign-up-go').click()
      await p.waitForURL(/\/visualizer\//, { timeout: 30000 }).catch(() => {})
      await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(3000)
      ok(/\/visualizer\/[0-9a-f-]{36}/.test(p.url()), `the new studio opens on its AI Visualizer, in a design of its own (${new URL(p.url()).pathname})`)
      ok(await p.getByTestId('viz-version').count() >= 1 && /^Living room/.test(await text(p.locator('[data-testid="viz-topbar"] h1'))), 'the trial’s photo is its first room — the design named after it')
      ok(await p.evaluate(() => !sessionStorage.getItem('om.trial.room') && !sessionStorage.getItem('om.trial.photo')), 'and the tab holds it no more (taken once)')
      ok(made().length === 1, 'the studio was made beside the demo (its own database)')
      await shot(p, 's36-carried-into-studio-1440')
      await ctx.close()
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    /* the server back on the demo before a studio's files go (a studio left open would answer every later probe) — S31's way */
    if (carryRan && made().length) {
      try {
        const C = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const c = await C.newPage()
        const dlg = async () => { const d = c.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await d.count()) await d.getByRole('button', { name: 'Not now' }).click().catch(() => {}) }
        await c.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await c.waitForTimeout(800)
        if (/\/sign-in/.test(c.url())) {
          await c.getByLabel(/^Mobile number or (work )?email/).fill('93334455'); await c.getByTestId('sign-in-send').click(); await c.waitForTimeout(1000)
          await c.getByTestId('sign-in-digit').first().click(); await c.keyboard.type('123456'); await c.getByTestId('sign-in-go').click(); await c.waitForTimeout(3000)
          await c.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await c.waitForTimeout(800)
        }
        if ((await c.getByTestId('studio-name').innerText().catch(() => '')) !== 'Demo Studio') {
          await dlg()
          await c.getByTestId('studio-block').click(); await c.waitForTimeout(500)
          await (await openDemo(c)).getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: 'Demo Studio' }).click(); await c.waitForTimeout(2500)
        }
        await C.close()
      } catch (e) { console.log('  ! could not switch the server back to the demo — restart it:', String(e).slice(0, 120)) }
    }
    if (carryRan) fs.rmSync(HOME, { recursive: true, force: true })
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(still.length ? `  ✗ not as found: ${still.join(', ')}` : '  ✓ the scratch DB is as it was found (and no studio left beside it)')
    if (still.length) fail++
    await b.close()
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
