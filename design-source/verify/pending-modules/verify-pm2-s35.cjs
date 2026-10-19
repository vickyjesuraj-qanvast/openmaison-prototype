// Pending modules, step S35 · The marketing website and Book a demo (the owner's "build all of them but one after the other", 2026-10-11; survey
// keys public:marketing-website · onboarding:book-a-demo). Each item asserted as the rule it builds, never another round's count:
//  - every page of OpenMaison's site opens SIGNED OUT under /site (the studio app's front door unchanged: `/` is sign-in signed out, the
//    Dashboard signed in), with its own title, canonical, link preview (/card/site/<page>, OpenMaison's card) and structured data
//  - 1.0's old addresses land on the new pages; (S46D) /pricing on the site's Pricing; an unknown site address is the site's own 404, in the site's frame
//  - the SEO layer: robots (the site only; AI training crawlers blocked everywhere), the sitemap (the site's pages only, each one opens),
//    llms.txt in 2.0's names; the card picture draws
//  - 2.0's names everywhere (no Quote Digitizer, mAIson, Co-Pilot, Visualiser as a module), none of the claims 2.0 doesn't make
//  - the bar: Platform ▾'s three pillars and eight modules, Esc closes it and gives focus back, Sign in → /sign-in; the phone's bottom bar,
//    its Platform sheet and the raised Demo
//  - Book a demo: the house refusals (nothing written), then the request kept as 1.0 kept it (beta_signups), the team's email in the
//    outbox (to hello@openmaison.ai, never a member) and Calendly — 1.0's real page — opening prefilled once the form has left, saying it is
//    opening until it loads; `?book` opens it on arrival
//  - the contact form and the footer's newsletter: refusals, then the record (+ the team's email for a message); signing up again is a no-op;
//    the sixth sign-up in a minute is refused (1.0's limit)
//  - robots lets a crawler draw the pages (scripts, styles, fonts, the logo); the Cookie Policy names every cookie the app's code sets
//  - Sent messages names the team's emails for the studio's Owner
//  - sign-in and sign-up: the wordmark opens the site, the Terms and Privacy line under the form (and in their ghosts)
//  - the Journal: categories in the address, Back to Journal returns to the pick, an article's contents
//  - ghosts: a slow hop between site pages shows the next page's ghost, its heading where the page's heading lands (1440 · 390 touch)
//  - the first visit's welcome plays once a session on the home page and clears
//  - no sideways scroll at 1440 · 1024 · 768 · 390 · 320 (against screen.width); no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. What it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s35.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s35')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 64 * 1024 * 1024 }).toString().trim()
const json = (q) => { const o = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 64 * 1024 * 1024 }).toString().trim(); return o ? JSON.parse(o) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

const PAGES = ['/site', '/site/platform', '/site/platform/visualizer', '/site/platform/space-planner', '/site/platform/upload-a-quote', '/site/platform/finance',
  '/site/platform/leads', '/site/platform/projects', '/site/platform/meeting-copilot', '/site/platform/maison-ai', '/site/story', '/site/trust', '/site/blog',
  '/site/blog/open-maison-vs-houzz-pro', '/site/blog/ai-meeting-copilot-design-sales', '/site/changelog', '/site/careers', '/site/contact', '/site/privacy', '/site/terms', '/site/cookies']
const WATCHED = ['beta_signups', 'contact_messages', 'newsletter_subscribers', 'notification_outbox']

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the credits' month roll on a studio page), so the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
  const kept = new Map(WATCHED.map((t) => [t, json(`select * from "${t}"`)]))
  const leads0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'BEGIN;\n'
    for (const t of WATCHED) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    const f = path.join(os.tmpdir(), `pm2-s35-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f)
  }
  /* a browser that signed out (the site is anyone's) — and the first visit's welcome already seen, unless a check wants it */
  const signedOut = async (o = {}, intro = false) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce', ...o })
    await ctx.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
    if (!intro) await ctx.addInitScript(() => { try { sessionStorage.setItem('om.site.intro', '1') } catch {} })
    return ctx
  }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 220)}`)); return p }
  const go = async (p, url, ms = 600) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(ms); return r }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitFor = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 150)) } }
  const fill = async (dlg, label, v) => { const f = dlg.getByLabel(label, { exact: false }).first(); await f.fill(''); if (v) await f.fill(v) }

  try {
    console.log('\n§1 every page opens signed out, with its tags and structured data')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§1')
      for (const url of PAGES) {
        const r = await go(p, url, 300)
        const here = new URL(p.url()).pathname
        const t = await p.evaluate(() => ({
          h1: document.querySelectorAll('h1').length, title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
          og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
          ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type'] } catch { return 'bad' } }),
          robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
        }))
        const good = r && r.status() === 200 && here === url && t.h1 === 1 && /openmaison/i.test(t.title) && !/· OpenMaison$/.test(t.title)
          && t.canonical.endsWith(url) && /\/card\/site\//.test(t.og) && ['Organization', 'WebSite', 'SoftwareApplication', 'BreadcrumbList'].every((k) => t.ld.includes(k) || (k === 'BreadcrumbList' && /\/(privacy|terms|cookies)$/.test(url)))
          && !/noindex/.test(t.robots)
        ok(good, `${url} — 200 signed out, one h1, "${t.title.slice(0, 60)}", canonical + card + ${t.ld.length} structured-data blocks`)
        if (url.startsWith('/site/blog/')) ok(t.ld.includes('Article'), `${url} carries its Article data`)
      }
      /* the studio app's front door is unchanged */
      const r = await p.goto(BASE + '/', { waitUntil: 'networkidle' })
      ok(/\/sign-in/.test(p.url()), `signed out, / is still sign-in (${new URL(p.url()).pathname})`)
      await ctx.close()
      const c2 = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const p2 = await page(c2, '§1 standing')
      await go(p2, '/')
      ok(!/sign-in|\/site/.test(p2.url()), `the demo's own session opens / on the studio app (${new URL(p2.url()).pathname})`)
      await go(p2, '/site')
      ok(new URL(p2.url()).pathname === '/site' && await p2.locator('[data-testid="site-bar"]').count() === 1, 'a signed-in member reads the site too — no studio chrome on it')
      ok(await p2.locator('nav[aria-label="Primary"] a[href="/leads"]').count() === 0 && await p2.getByRole('button', { name: /Maison AI/i }).count() === 0, 'the site wears its own frame: no rail, no Maison AI button')
      await c2.close()
    }

    console.log('\n§2 1.0\'s addresses, /pricing on Pricing, the site\'s own 404')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§2')
      for (const [from, to] of [['/story', '/site/story'], ['/about', '/site/story'], ['/products', '/site/platform'], ['/ai-agents', '/site/platform'], ['/platform', '/site/platform'],
        ['/platform/quote-digitizer', '/site/platform/upload-a-quote'], ['/platform/co-pilot', '/site/platform/meeting-copilot'], ['/platform/maison-bot', '/site/platform/maison-ai'],
        ['/platform/visualiser', '/site/platform/visualizer'], ['/blog/open-maison-vs-houzz-pro', '/site/blog/open-maison-vs-houzz-pro'], ['/changelog', '/site/changelog'],
        ['/careers', '/site/careers'], ['/contact', '/site/contact'], ['/privacy', '/site/privacy'], ['/terms', '/site/terms'], ['/cookies', '/site/cookies'], ['/trust', '/site/trust'],
        ['/pricing', '/site/pricing']]) {   // (S46D — D4, a deliberate change of this rule) 1.0's plg Pricing is public: /pricing lands on /site/pricing, now a page of its own
        await p.goto(BASE + from, { waitUntil: 'domcontentloaded' })
        ok(new URL(p.url()).pathname === to, `${from} → ${to}`)
      }
      const r = await p.goto(BASE + '/site/no-such-page', { waitUntil: 'networkidle' })
      ok(r?.status() === 404 && /This page doesn’t exist/.test(await p.locator('h1').innerText()) && await p.locator('[data-testid="site-footer"]').count() === 1, 'an unknown /site address: the site\'s 404 inside its own frame')
      const r2 = await p.goto(BASE + '/site/platform/quote-digitizer', { waitUntil: 'networkidle' })
      ok(r2?.status() === 404, '1.0\'s module slug under /site is not a page (its old root address redirects instead)')
      await ctx.close()
    }

    console.log('\n§3 robots, sitemap, llms.txt, the card picture')
    {
      const ctx = await signedOut(); const req = ctx.request
      const robots = await (await req.get(BASE + '/robots.txt')).text()
      const blocks = robots.split(/\n\s*\n/)
      const of = (ua) => blocks.find((x) => new RegExp(`User-Agent: ${ua}(\\s|$)`).test(x)) ?? ''
      ok(/Allow: \/site/.test(of('\\*')) && /Disallow: \/\s*$/m.test(of('\\*')), 'robots: crawlers read /site and nothing else of the app')
      ok(['GPTBot', 'Google-Extended', 'Bytespider', 'CCBot'].every((ua) => /Disallow: \/\s*$/m.test(of(ua)) && !/Allow:/.test(of(ua))), 'robots: the four AI training crawlers are blocked everywhere (1.0\'s)')
      ok(/Allow: \/site/.test(of('ChatGPT-User')) && /Allow: \/site/.test(of('PerplexityBot')), 'robots: AI search may read the site')
      ok(/Sitemap: .*\/sitemap\.xml/.test(robots), 'robots names the sitemap')
      ok(['/_next/static/', '/fonts/', '/figma-assets/logo.svg'].every((a) => of('\\*').includes(`Allow: ${a}`)), 'robots lets a crawler fetch what draws the pages — scripts, styles, fonts, the logo the structured data names')
      /* the Cookie Policy names every cookie the app sets (read from the app's own code: each 'om_…' cookie name, and the portal's preview om_pv_…) */
      const ROOT = path.resolve(__dirname, '../../..')
      const named = [...new Set(execSync(`grep -rhoE "'om_[a-z_]+'|\\bom_pv_" lib app components proxy.ts`, { cwd: ROOT }).toString().match(/om_[a-z_]+/g) ?? [])]
      const policy = await (await req.get(BASE + '/site/cookies')).text()
      const missing = named.filter((n) => !policy.includes(n))
      ok(named.length >= 5 && missing.length === 0, `the Cookie Policy names every cookie the app sets (${named.join(', ')}${missing.length ? ` — missing ${missing.join(', ')}` : ''})`)
      const sm = await (await req.get(BASE + '/sitemap.xml')).text()
      const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
      ok(locs.length >= PAGES.length - 1 && locs.every((l) => l.startsWith('/site')), `sitemap: ${locs.length} addresses, every one the site's`)
      ok(PAGES.filter((u) => !locs.includes(u)).length === 0, 'sitemap lists every page of the site')
      let bad = 0
      for (const l of locs) { const r = await req.get(BASE + l, { maxRedirects: 0 }); if (r.status() !== 200) bad++ }
      ok(bad === 0, 'every sitemap address opens (200)')
      const llms = await req.get(BASE + '/llms.txt'); const lt = await llms.text()
      ok(llms.status() === 200 && /Maison AI/.test(lt) && /Upload a quote/.test(lt) && !/mAIson|Quote Digitizer|Malaysia|UAE|Gemini/.test(lt), 'llms.txt in 2.0\'s names, Singapore\'s alone')
      const card = await req.get(BASE + '/card/site/home')
      const buf = await card.body()
      ok(card.status() === 200 && card.headers()['content-type'] === 'image/png' && buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630, 'the site\'s card draws: a 1200×630 picture')
      ok((await req.get(BASE + '/card/site/blog-open-maison-vs-houzz-pro')).status() === 200 && (await req.get(BASE + '/card/site/module-leads')).status() === 200, 'an article\'s and a module\'s card draw')
      ok((await req.get(BASE + '/card/site/no-such')).status() === 404, 'a key that is no page of the site has no card')
      await ctx.close()
    }

    console.log('\n§4 2.0\'s names, and none of the claims 2.0 doesn\'t make')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§4')
      const hits = []
      for (const url of PAGES) {
        await go(p, url, 200)
        const t = await p.locator('body').innerText()
        for (const [re, what] of [[/Quote Digiti[sz]er|quote digitiser/i, 'Quote Digitizer'], [/mAIson/, 'mAIson'], [/Co-Pilot\b|Co-pilot\b/, 'Co-Pilot'], [/AI Visualiser|Visualiser\b(?! and)/, 'Visualiser'],
          [/AI score|hot, warm|hot\/warm\/cold/i, 'lead scoring'], [/Twenty specialists|20\+ AI agents|twenty specialised agents/i, 'twenty agents'], [/SG · MY · AE · IN|SG\. MY\. AE\. IN|4\s*markets/i, 'four markets'],
          [/Gemini/, 'Gemini'], [/regional benchmarks/i, 'regional benchmarks']]) {
          if (re.test(t)) hits.push(`${url}: ${what}`)
        }
        if (!url.startsWith('/site/blog') && /Malaysia|the UAE|Dubai/.test(t)) hits.push(`${url}: a market beyond Singapore`)
        if (/upload-a-quote|\/site$/.test(url) && /upsell/i.test(t)) hits.push(`${url}: an upsell on a quote (2.0 points at margins only)`)
      }
      ok(hits.length === 0, `no 1.0 name or claim 2.0 doesn't make on any page${hits.length ? ` — ${hits.join(' · ')}` : ''}`)
      await go(p, '/site/platform')
      const cards = await p.locator('[data-testid^="hub-"] h3').allInnerTexts()
      ok(['Upload a quote', 'Finance & Margins', 'AI Visualizer', '3D Space Planner', 'Leads', 'Projects', 'Meeting Copilot', 'Maison AI'].every((n) => cards.includes(n)), `the hub's eight modules in 2.0's names (${cards.join(' · ')})`)
      await go(p, '/site/platform/leads')
      ok(await p.locator('[data-testid="module-capabilities"] img').count() === 0 && await p.locator('[data-testid="module-capabilities"] h3').count() === 3, 'Leads: three capabilities (no lead scoring), every card its icon (one look per grid)')
      await go(p, '/site/platform/finance')
      ok(await p.locator('[data-testid="module-capabilities"] img').count() === 4, 'Finance: every capability carries its picture')
      await go(p, '/site/platform/visualizer')
      ok(await p.locator('[data-testid="before-after"]').count() === 1 && await p.locator('[data-testid="before-after-slider"] [role="slider"]').count() === 1, 'the Visualizer\'s page: the house before/after slider')
      await ctx.close()
    }

    console.log('\n§5 the bar: Platform ▾, Sign in; the phone bar and its sheet')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§5')
      await go(p, '/site')
      await p.locator('[data-testid="site-platform"]').click()
      const mega = p.locator('[data-testid="site-mega"]')
      await mega.waitFor()
      const heads = await mega.locator('p').allInnerTexts()
      ok(await mega.locator('a[href^="/site/platform/"]').count() === 8 && /Clients & Projects/i.test(heads.join()) && /Design Meetings/i.test(heads.join()), 'Platform ▾: three pillars, eight modules')
      await shot(p, 's35-mega-1440')
      await p.keyboard.press('Escape')
      await p.waitForTimeout(300)
      ok(await mega.count() === 0 && await p.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'site-platform', 'Esc closes it and gives focus back to Platform')
      await p.locator('[data-testid="site-platform"]').click(); await mega.waitFor()
      await mega.locator('a[href="/site/platform/meeting-copilot"]').click()
      await p.waitForURL(/meeting-copilot/); await p.waitForTimeout(400)
      ok(await p.locator('h1').innerText() === 'Win more meetings with AI by your side.' && await p.locator('[data-testid="site-mega"]').count() === 0, 'a module opens its page, the panel closed')
      ok(await p.locator('[data-testid="site-sign-in"]').getAttribute('href') === '/sign-in', 'Sign in opens the studio app\'s sign-in')
      await ctx.close()
      const phone = await signedOut({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const q = await page(phone, '§5 phone')
      await go(q, '/site')
      ok(await q.locator('[data-testid="site-phone-bar"]').isVisible() && !(await q.locator('[data-testid="site-book-demo"]').isVisible()), 'phone: the bottom bar carries the site; the top keeps the wordmark and Sign in')
      await q.locator('[data-testid="site-phone-platform"]').tap()
      await q.locator('[data-testid="site-platform-sheet"]').waitFor(); await q.waitForTimeout(600)
      ok(await q.locator('[data-testid="site-platform-sheet"] a[href^="/site/platform/"]').count() === 8, 'phone: Platform opens the bottom sheet of the eight modules')
      await shot(q, 's35-platform-sheet-390')
      await q.keyboard.press('Escape'); await q.waitForTimeout(400)
      await q.locator('[data-testid="site-phone-demo"]').tap()
      await q.getByRole('dialog', { name: 'See OpenMaison in action' }).waitFor()
      ok(true, 'phone: the raised Demo opens Book a demo')
      await q.waitForTimeout(700)   // the sheet's rise settles before the picture
      const sheetCovers = await q.evaluate(() => { const d = document.querySelector('[role="dialog"]').getBoundingClientRect(); const b = document.querySelector('[data-testid="site-phone-bar"]').getBoundingClientRect(); const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return d.bottom >= b.bottom - 1 && !!at && !!at.closest('[role="dialog"]') })
      ok(sheetCovers, 'phone: the Book a demo sheet sits above the bottom bar (the bar never covers its buttons)')
      await shot(q, 's35-book-demo-390')
      await phone.close()
    }

    console.log('\n§6 Book a demo: refusals, the request, the team\'s email, Calendly')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§6')
      await go(p, '/site')
      const n0 = Number(sql(`select count(*) from beta_signups`))
      await p.locator('[data-testid="site-book-demo"]').click()
      const dlg = p.getByRole('dialog', { name: 'See OpenMaison in action' })
      await dlg.waitFor()
      await dlg.locator('[data-testid="demo-submit"]').click(); await p.waitForTimeout(300)
      const req = await dlg.getByText('This field is required').count()
      ok(req === 4, `an empty request: four "This field is required" (${req})`)
      await fill(dlg, 'Full name', 'Sarah Ang'); await fill(dlg, 'Studio name', 'Arthaus Studio'); await fill(dlg, 'Email', 'sarah@arthaus'); await fill(dlg, 'Phone', '1234')
      await dlg.locator('[data-testid="demo-submit"]').click(); await p.waitForTimeout(300)
      ok(await dlg.getByText('Enter a valid email address').count() === 1 && await dlg.getByText('Enter a valid 8-digit Singapore number').count() === 1, 'a bad email and a short number: the house messages')
      ok(Number(sql(`select count(*) from beta_signups`)) === n0, 'nothing written while it is refused')
      await shot(p, 's35-book-demo-refused-1440')
      await fill(dlg, 'Email', 'Sarah@Arthaus.sg'); await fill(dlg, 'Phone', '91234567')
      // Calendly stands in here: its page answers after 2.5 s (no request leaves the machine), so the wait before it can be seen
      await p.route('https://calendly.com/**', async (r) => { await new Promise((res) => setTimeout(res, 2500)); await r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Calendly</title><body style="margin:0;background:#fff">Calendly’s page</body>' }) })
      await p.evaluate(() => { window.__cross = null; const mo = new MutationObserver(() => { if (window.__cross !== null) return; const ds = [...document.querySelectorAll('[role="dialog"]')]; if (!ds.some((d) => d.textContent.includes('Pick a time'))) return; const form = ds.find((d) => d.textContent.includes('See OpenMaison in action')); window.__cross = form ? Number(getComputedStyle(form).opacity) : -1; mo.disconnect() }); mo.observe(document.body, { childList: true, subtree: true }) })
      await dlg.locator('[data-testid="demo-submit"]').click()
      const pick = p.getByRole('dialog', { name: 'Pick a time' })
      await pick.waitFor({ timeout: 8000 })
      const cross = await p.evaluate(() => window.__cross)
      ok(cross === -1 || (cross !== null && cross < 0.15), `the form has left before Calendly comes in — never two panels at once (the form's opacity then: ${cross})`)
      await p.waitForTimeout(350)
      ok(await pick.locator('[data-testid="demo-calendly-waiting"]').isVisible() && (await pick.locator('[data-testid="demo-calendly-waiting"]').innerText()) === 'Opening Calendly…', 'while Calendly loads, the body says so (never an empty white box)')
      await shot(p, 's35-pick-a-time-waiting-1440')
      ok(await waitFor(async () => (await pick.locator('[data-testid="demo-calendly"][data-loaded]').count()) === 1 && (await pick.locator('[data-testid="demo-calendly-waiting"]').count()) === 0, 6000), '…and the line goes once its page has loaded')
      const row = json(`select * from beta_signups order by created_at desc limit 1`)[0] ?? {}
      ok(row.name === 'Sarah Ang' && row.studio_name === 'Arthaus Studio' && row.email === 'sarah@arthaus.sg' && row.phone === '+65 9123 4567' && row.source_page === '/site', `the request kept as 1.0 kept it: ${row.name} · ${row.studio_name} · ${row.email} · ${row.phone} · ${row.source_page}`)
      const mail = json(`select * from notification_outbox where key = 'site:demo:${row.id}:email'`)[0] ?? {}
      ok(mail.event === 'site_demo_request' && mail.channel === 'email' && mail.to_address === 'hello@openmaison.ai' && mail.member_id === null && /Demo request — Sarah Ang, Arthaus Studio/.test(mail.subject ?? '') && mail.provider === 'outbox', `the team's email in the outbox: "${mail.subject}" → ${mail.to_address} (${mail.status})`)
      const src = await pick.locator('iframe').getAttribute('src')
      const u = new URL(src)
      ok(u.origin + u.pathname === 'https://calendly.com/hello-openmaison/30min' && u.searchParams.get('name') === 'Sarah Ang' && u.searchParams.get('email') === 'sarah@arthaus.sg' && !/\+/.test(src.split('?')[1] ?? ''), 'Calendly opens — 1.0\'s page, prefilled (spaces as %20)')
      const link = await pick.locator('[data-testid="demo-calendly-link"]').getAttribute('href')
      ok(/^https:\/\/calendly\.com\/hello-openmaison\/30min\?/.test(link) && await pick.locator('[data-testid="demo-calendly-link"]').getAttribute('target') === '_blank', 'its page a press away, in a new tab')
      ok(await waitFor(async () => (await dlg.count()) === 0, 2000), 'the form closed once the request landed')
      await shot(p, 's35-pick-a-time-1440')
      await pick.locator('[data-testid="demo-done"]').click(); await p.waitForTimeout(400)
      ok(await pick.count() === 0, 'Done closes Calendly')
      await p.unroute('https://calendly.com/**')
      await go(p, '/site/story?book')
      ok(await p.getByRole('dialog', { name: 'See OpenMaison in action' }).count() === 1, '`?book` on a site address opens Book a demo (1.0\'s QR codes)')
      await ctx.close()
    }

    console.log('\n§7 the contact form and the newsletter')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§7')
      await go(p, '/site/contact')
      const form = p.locator('[data-testid="contact-form"]')
      const c0 = Number(sql(`select count(*) from contact_messages`))
      await p.locator('[data-testid="contact-submit"]').click(); await p.waitForTimeout(300)
      ok(await form.getByText('This field is required').count() === 3 && Number(sql(`select count(*) from contact_messages`)) === c0, 'an empty message: three required fields, nothing written')
      await fill(form, 'Name', 'Marcus Lee'); await fill(form, 'Email', 'marcus@'); await fill(form, 'Message', 'We run four designers and want to see Finance.')
      await p.locator('[data-testid="contact-submit"]').click(); await p.waitForTimeout(300)
      ok(await form.getByText('Enter a valid email address').count() === 1, 'a bad email: the house message')
      await fill(form, 'Email', 'marcus@leestudio.sg'); await fill(form, 'Subject (optional)', 'Finance walkthrough')
      await p.locator('[data-testid="contact-submit"]').click()
      await p.locator('[data-testid="contact-sent"]').waitFor({ timeout: 8000 })
      const m = json(`select * from contact_messages order by created_at desc limit 1`)[0] ?? {}
      ok(m.name === 'Marcus Lee' && m.email === 'marcus@leestudio.sg' && m.subject === 'Finance walkthrough' && /four designers/.test(m.message) && m.source_page === '/site/contact', 'the message kept (contact_messages)')
      const mail = json(`select * from notification_outbox where key = 'site:contact:${m.id}:email'`)[0] ?? {}
      ok(mail.event === 'site_contact' && mail.to_address === 'hello@openmaison.ai' && mail.subject === 'Contact form: Finance walkthrough — Marcus Lee' && /Email: marcus@leestudio\.sg/.test(mail.body ?? ''), `…and emailed to the team: "${mail.subject}"`)
      ok(/Message sent!/.test(await p.locator('[data-testid="contact-sent"]').innerText()), '1.0\'s thank-you replaces the form')
      /* the footer's newsletter */
      const news = p.locator('[data-testid="newsletter-form"]')
      await news.scrollIntoViewIfNeeded()
      await news.getByLabel('Occasional studio notes').fill('not-an-email')
      await p.locator('[data-testid="newsletter-submit"]').click(); await p.waitForTimeout(300)
      ok(await news.getByText('Enter a valid email address').count() === 1, 'newsletter: a bad address is refused')
      await news.getByLabel('Occasional studio notes').fill('Hello@LeeStudio.sg')
      await p.locator('[data-testid="newsletter-submit"]').click()
      await p.locator('[data-testid="newsletter-done"]').waitFor({ timeout: 6000 })
      ok(sql(`select count(*) from newsletter_subscribers where email = 'hello@leestudio.sg'`) === '1', 'newsletter: the address kept, lower-cased')
      await go(p, '/site/trust')
      await p.locator('[data-testid="newsletter-form"]').getByLabel('Occasional studio notes').fill('hello@leestudio.sg')
      await p.locator('[data-testid="newsletter-submit"]').click()
      await p.locator('[data-testid="newsletter-done"]').waitFor({ timeout: 6000 })
      ok(sql(`select count(*) from newsletter_subscribers where email = 'hello@leestudio.sg'`) === '1', 'signing up again answers the same and keeps one row (no one learns who is on the list)')
      ok(sql(`select count(*) from notification_outbox where key like 'site:news%'`) === '0', 'a newsletter address sends nobody an email (1.0\'s)')
      /* 1.0's limit: five sign-ups a minute from one address — the next is refused in sign-in's words, and nothing is written for it */
      let refused = null
      for (let i = 1; i <= 6 && !refused; i++) {
        await go(p, '/site/careers')
        const addr = `limit${i}@leestudio.sg`
        await p.locator('[data-testid="newsletter-form"]').getByLabel('Occasional studio notes').fill(addr)
        await p.locator('[data-testid="newsletter-submit"]').click()
        const said = await waitFor(async () => ((await p.locator('[data-testid="newsletter-done"]').count()) ? 'done' : (await p.getByText('Too many tries — wait a minute and try again').count()) ? 'refused' : null), 6000)
        if (said === 'refused') refused = addr
      }
      ok(!!refused && sql(`select count(*) from newsletter_subscribers where email = '${refused}'`) === '0', `the sixth sign-up in a minute is refused — "Too many tries — wait a minute and try again" — and nothing kept for it (${refused})`)
      await ctx.close()
    }

    console.log('\n§8 Sent messages names the team\'s emails for the Owner')
    {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const p = await page(ctx, '§8')
      await go(p, '/settings?section=notifications', 1500)
      const sent = p.locator('[data-testid="notification-sent"]')
      await sent.scrollIntoViewIfNeeded(); await p.waitForTimeout(800)
      const text = await sent.innerText()
      ok(/Demo request — Sarah Ang/.test(text) && /Contact form: Finance walkthrough/.test(text), 'both emails listed in Settings › Notifications › Sent messages')
      ok(/OpenMaison team/.test(text), 'to the OpenMaison team')
      await ctx.close()
    }

    console.log('\n§9 sign-in and sign-up: the door to the site, the Terms line')
    {
      for (const [url, id] of [['/sign-in', 'sign-in'], ['/sign-up', 'sign-up']]) {
        const ctx = await signedOut(); const p = await page(ctx, `§9 ${id}`)
        await go(p, url, 900)
        ok(await p.locator(`[data-testid="${id}-site"]`).getAttribute('href') === '/site', `${url}: the wordmark opens OpenMaison's website`)
        const terms = p.locator(`[data-testid="${id}-terms"]`)
        ok(/By continuing you agree to OpenMaison’s Terms of Service and Privacy Policy\./.test(await terms.innerText()) && await terms.locator('a[href="/site/terms"]').count() === 1 && await terms.locator('a[href="/site/privacy"]').count() === 1, `${url}: the Terms and Privacy line under the form`)
        await ctx.close()
        /* the loader's ghost draws the same line */
        const c2 = await signedOut(); const g = await c2.newPage()
        await g.route((u) => u.href === BASE + url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
        await g.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await g.waitForTimeout(500)
        ok(/By continuing you agree to OpenMaison’s Terms of Service and Privacy Policy\./.test(await g.locator('body').textContent()), `${url}: its ghost reads the same words`)
        await c2.close()
      }
      const ctx = await signedOut(); const p = await page(ctx, '§9 terms')
      await go(p, '/sign-in'); await p.locator('[data-testid="sign-in-terms"] a[href="/site/terms"]').click()
      await p.waitForURL(/\/site\/terms/); await p.waitForTimeout(300)
      ok(await p.locator('h1').innerText() === 'Terms of Service', 'the Terms open signed out')
      await ctx.close()
    }

    console.log('\n§10 the Journal: categories in the address, Back to Journal, contents')
    {
      const ctx = await signedOut(); const p = await page(ctx, '§10')
      await go(p, '/site/blog')
      const all = await p.locator('[data-testid="blog-post"]').count()
      await p.locator('[data-testid="blog-categories"]').getByRole('radio', { name: 'Comparison' }).click(); await p.waitForTimeout(500)
      const one = await p.locator('[data-testid="blog-post"]').count()
      ok(/category=Comparison/.test(p.url()) && one >= 1 && one < all, `a category narrows the list and rides in the address (${all} → ${one})`)
      await p.locator('[data-testid="blog-post"]').first().click()
      await p.waitForURL(/open-maison-vs-houzz-pro/); await p.waitForTimeout(500)
      ok(await p.locator('h1').innerText() === 'OpenMaison vs Houzz Pro compared', 'the article opens')
      ok(await p.locator('nav[aria-label="Table of Contents"] a').count() === 7, 'its contents list each section')
      await p.locator('[data-testid="article-back"]').click()
      await p.waitForURL(/\/site\/blog\?category=Comparison/); await p.waitForTimeout(400)
      ok(await p.locator('[data-testid="blog-post"]').count() === one, 'Back to Journal returns to the pick')
      await go(p, '/site/blog/open-maison-vs-houzz-pro')
      const txt = await p.locator('main').innerText()
      ok(/Singapore GST \(9%\)/.test(txt) && !/Dubai VAT|Malaysia SST/.test(txt) && /Upload a quote/.test(txt), 'the comparison in 2.0\'s facts (Singapore\'s GST, Upload a quote)')
      await ctx.close()
    }

    console.log('\n§11 ghosts: on a slow network a hop shows the next page\'s ghost, its heading where the page\'s lands')
    {
      /* The site's pages are built ahead and a hop is normally instant from the prefetch; on a slow network the next page streams in and its
         loader shows first. The network is throttled after the first page, and the hop made by the router itself (window.next.router.push). */
      const HOPS = [['/site/story', '/site/platform', 'h2'], ['/site/platform', '/site/contact', 'h2'], ['/site/story', '/site/changelog', 'h2'], ['/site/platform', '/site/careers', 'h2'],
        ['/site/story', '/site/terms', 'h2'], ['/site/story', '/site/platform/projects', 'crumbs'], ['/site/story', '/site/blog/open-maison-vs-houzz-pro', 'back'], ['/site/platform', '/site', 'h2']]
      for (const [w, touch] of [[1440, false], [390, true]]) {
        for (const [from, to, mark] of HOPS) {
          const ctx = await signedOut({ viewport: { width: w, height: touch ? 844 : 1024 }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
          const p = await page(ctx, `§11 ${w}`)
          /* nothing prefetched (a link in view is otherwise fetched ahead and the hop is instant — no ghost to see) */
          await p.route('**/*', (r) => (r.request().headers()['next-router-prefetch'] ? r.abort() : r.continue()))
          await go(p, from, 300)
          const cdp = await ctx.newCDPSession(p)
          await cdp.send('Network.enable')
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 4000, uploadThroughput: 100000 })
          await p.evaluate((t) => { window.next?.router?.push(t) }, to)
          const ghost = p.locator('[aria-busy="true"][role="status"]').first()
          const seen = await waitFor(async () => (await ghost.count()) > 0, 9000)
          const gBox = async (sel) => (await ghost.locator(sel).first().boundingBox().catch(() => null))?.y ?? null
          const gTop = !seen ? null : mark === 'h2' ? await gBox('h2') : mark === 'crumbs' ? await gBox('[class*="crumbs"]') : await gBox('[class*="back"]')
          if (seen && (to === '/site/contact' || to === '/site/platform/projects' || to === '/site')) await shot(p, `s35-ghost-${to.split('/').pop() || 'home'}-${w}`)
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
          await waitFor(async () => (await ghost.count()) === 0, 12000)
          await p.waitForTimeout(500)
          const pSel = mark === 'h2' ? 'main h1' : mark === 'crumbs' ? 'nav[aria-label="Breadcrumb"]' : '[data-testid="article-back"]'
          const pTop = (await p.locator(pSel).first().boundingBox().catch(() => null))?.y ?? null
          ok(seen && gTop !== null && pTop !== null && Math.abs(gTop - pTop) <= 8, `${w}${touch ? ' touch' : ''}: ${from} → ${to}: its ghost's ${mark} at ${Math.round(gTop ?? -1)}, the page's at ${Math.round(pTop ?? -1)}`)
          await ctx.close()
        }
      }
    }

    console.log('\n§12 the first visit\'s welcome')
    {
      const ctx = await signedOut({ reducedMotion: 'no-preference' }, true); const p = await page(ctx, '§12')
      await p.goto(BASE + '/site', { waitUntil: 'domcontentloaded' })
      const played = await waitFor(() => p.evaluate(() => document.documentElement.getAttribute('data-intro') === 'play'), 1500)
      ok(played, 'the first visit to the home page plays the welcome')
      const cleared = await waitFor(() => p.evaluate(() => !document.documentElement.hasAttribute('data-intro')), 4500)
      ok(cleared, 'it clears by itself (under 4 s)')
      await p.goto(BASE + '/site', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(200)
      ok(!(await p.evaluate(() => document.documentElement.hasAttribute('data-intro'))), 'once a session only')
      await ctx.close()
      const c2 = await signedOut({}, true); const q = await page(c2, '§12 reduced')
      await q.goto(BASE + '/site', { waitUntil: 'domcontentloaded' }); await q.waitForTimeout(200)
      ok(!(await q.evaluate(() => document.documentElement.hasAttribute('data-intro'))), 'never with reduced motion')
      await c2.close()
    }

    console.log('\n§13 every width: no sideways scroll; the shots')
    {
      for (const [w, h, touch] of [[1440, 1024, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 640, true]]) {
        const ctx = await signedOut({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) }); const p = await page(ctx, `§13 ${w}`)
        const wide = []
        for (const url of PAGES) { await go(p, url, 150); const o = await p.evaluate(() => document.documentElement.scrollWidth - screen.width); if (o > 0) wide.push(`${url} +${o}`) }
        ok(wide.length === 0, `${w}${touch ? ' touch' : ''}: no page scrolls sideways${wide.length ? ` — ${wide.join(', ')}` : ''}`)
        if (w === 1440 || w === 390) {
          for (const [url, n] of [['/site', 'home'], ['/site/platform', 'platform'], ['/site/platform/upload-a-quote', 'module-upload-a-quote'], ['/site/story', 'story'], ['/site/blog/open-maison-vs-houzz-pro', 'article'], ['/site/contact', 'contact'], ['/site/changelog', 'changelog']]) {
            await go(p, url, 400)
            if (n === 'home') {   // the whole home page as a visitor sees it: scrolled through once, so what rises into view has risen
              const H = await p.evaluate(() => document.documentElement.scrollHeight)
              for (let y = 0; y < H; y += Math.round(h * 0.8)) { await p.evaluate((t) => window.scrollTo(0, t), y); await p.waitForTimeout(220) }
              await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500)
            }
            await shot(p, `s35-${n}-${w}`, n === 'home')
          }
        }
        await ctx.close()
      }
    }

    ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === leads0 && sql(`select count(*) from stage_logs`) === logs0, 'the leads\' stages and stage logs are as found')
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e.message)
  } finally {
    putBack()
    const same = WATCHED.every((t) => JSON.stringify(json(`select * from "${t}"`)) === JSON.stringify(kept.get(t)))
    console.log(same ? '\n  (the scratch DB is put back as found)' : '\n  ✗ the scratch DB is NOT as found')
    if (!same) fail++
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 5).join(' | ')}` : ''}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
