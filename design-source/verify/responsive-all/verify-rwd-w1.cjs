// The whole-app responsiveness audit, lane W1 — the house pieces, the shell and the public / account pages (REG-2810…, 2026-10-23, his
// "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your recommendations").
//  1 · the phone bar's avatar is a real 44 under a finger and its avatar fills the frame (W1-01)
//  2 · the More sheet's counts sit in their rows; the bar's and the dock's counts sit where their rules put them (W1-02)
//  3 · touch 44s, by real hit tests: the rail's studio block on a tablet (W1-03), the crumbs (W1-04), the definition list's handle (W1-06), the DS
//      segmented control (W1-07), the website's wordmark · Sign in · back crumb (W1-11 · W1-12)
//  4 · a folder card's select box takes its own tap — it selects, it doesn't open the folder (W1-05)
//  5 · iOS input zoom, emulated (the @supports block unwrapped in place): every text input, textarea and select types at 16 at 390 (W1-08)
//  6 · touch: search's foot (which names keys) steps away with the keys; the ? panel's rows keep theirs (W1-09 · W1-14)
//  7 · a phone held sideways (844 × 390): the house dialog and Filters use the screen, 8 above and below (W1-10 · W1-15)
//  8 · a notched phone held sideways (safe-area insets 47 · 21, CDP): the rail, the page, the FAB and the website's bar stay out of the insets (W1-13)
//  9 · the ghost's L1 header wraps where the page's does at 320 (W1-16)
// 10 · nothing sideways at 320 and 844 on the W1 pages; the desk (1440) keeps every rule above off
// Read-only: it writes nothing to the DB (the folder it selects is UI state, cleared again). Run against `next start` on a scratch copy of the
// demo DB — never local.db.
// Usage: BASE=http://localhost:3201 NODE_PATH=<repo>/node_modules node verify-rwd-w1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rwd-w1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3201'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify')) ? process.cwd() : path.resolve(__dirname, '../../..'))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, what, more = '') => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}${more ? ` — ${more}` : ''}`) } }
const settle = (p, ms = 800) => p.waitForTimeout(ms)
const go = async (p, url, ms = 1200) => { await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }); await settle(p, ms) }
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
const NARROW = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
const TABLET = { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
const SIDEWAYS = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
const DESK = { viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }
const LEAD = sql(`select id from leads where deleted_at is null and name = 'Kevin Ng' limit 1`) || sql(`select l.id from leads l join lead_files f on f.lead_id = l.id where l.deleted_at is null and f.kind = 'folder' limit 1`)
const FOLDER_LEAD = sql(`select l.id from leads l join lead_files f on f.lead_id = l.id where l.deleted_at is null and f.kind = 'folder' and f.deleted_at is null group by l.id order by count(*) desc limit 1`)

/* a finger's 44: the element (or what it contains) answers at its centre and 21 above, below, left and right of it */
const hit44 = (p, handle) => p.evaluate((el0) => {
  const el = el0.tagName === 'INPUT' && /checkbox|radio/.test(el0.type) && el0.closest('label') ? el0.closest('label') : el0
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const miss = []
  for (const [dx, dy] of [[0, 0], [0, -21], [0, 21], [-21, 0], [21, 0]]) { const e = document.elementFromPoint(cx + dx, cy + dy); if (!e || !(e === el || el.contains(e))) miss.push(`${dx},${dy}`) }
  return { w: Math.round(r.width), h: Math.round(r.height), miss }
}, handle)
const tapAt = async (p, loc, dy = 0) => { await loc.evaluate((e) => e.scrollIntoView({ block: 'center' })); await settle(p, 200); const bb = await loc.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2 + dy) }
/* REG-306's iOS-only rule, run in Chromium: every @supports (-webkit-touch-callout: none) block unwrapped where it stands */
const unwrapIos = (p) => p.evaluate(async () => {
  let n = 0
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules } catch { continue }
    for (let i = rules.length - 1; i >= 0; i--) { const rule = rules[i]; if (rule instanceof CSSSupportsRule && /-webkit-touch-callout/.test(rule.conditionText)) { const inner = [...rule.cssRules].map((x) => x.cssText); sh.deleteRule(i); for (let j = inner.length - 1; j >= 0; j--) sh.insertRule(inner[j], i); n++ } }
  }
  await new Promise((r) => setTimeout(r, 500))   // the fields' own 80ms transition (reduced motion) settles
  return n
})
const holdReveal = (c) => c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })

;(async () => {
  const errors = []
  const b = await chromium.launch()
  const ctx = async (opts, { out = false } = {}) => { const c = await b.newContext(opts); if (out) await c.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); return c }
  const page = async (c, tag) => { const p = await c.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  try {
    console.log('1 · the phone bar’s avatar (390)')
    {
      const c = await ctx(PHONE); const p = await page(c, 'avatar')
      await go(p, '/dashboard')
      const av = p.getByTestId('phone-avatar')
      const h = await hit44(p, await av.elementHandle())
      ok(h.miss.length === 0, `a finger's 44 lands on the avatar button (${h.w}×${h.h} drawn)`, `missed at ${h.miss.join(' ')}`)
      const fit = await av.evaluate((btn) => { const s = btn.querySelector(':scope > span'); const r = btn.getBoundingClientRect(), q = s.getBoundingClientRect(); return { dl: q.left - r.left, dr: r.right - q.right, dt: q.top - r.top, db: r.bottom - q.bottom } })
      ok([fit.dl, fit.dr, fit.dt, fit.db].every((d) => Math.abs(d - 1) < 0.6), 'the avatar fills the frame inside its 1px stroke, centred (not a 36 cut in a 34)', JSON.stringify(fit))
      await p.screenshot({ path: path.join(dir, '01-avatar-390.png'), clip: { x: 250, y: 0, width: 140, height: 60 } })
      await c.close()
    }

    console.log('2 · the phone’s counts (390)')
    {
      const c = await ctx(PHONE); const p = await page(c, 'counts')
      await go(p, '/dashboard')
      const badges = await p.evaluate(() => [...document.querySelectorAll('[class*="mobile-nav-module__"][class*="__barBadge"], [class*="mobile-nav-module__"][class*="__dockBadge"]')].map((e) => { const cs = getComputedStyle(e); return { k: /barBadge/.test(e.className) ? 'bar' : 'dock', dot: e.getAttribute('data-badge') === 'dot', top: cs.top, right: cs.right } }))
      ok(badges.length > 0 && badges.filter((x) => x.k === 'bar').every((x) => x.top === '4px' && x.right === '4px'), 'the bar’s count sits 4 · 4 in its icon’s box, as its rule says', JSON.stringify(badges))
      /* (Vicky 2026-10-29: brought back) the dock's counts are red dots now (Projects · Leads · Tasks) — an 8 dot sits 5 · 5, where More's dot sits; a number keeps −2 · −2 */
      ok(badges.filter((x) => x.k === 'dock').every((x) => (x.dot ? x.top === '5px' && x.right === '5px' : x.top === '-2px' && x.right === '-2px')), 'the dock’s counts sit on their icon’s corner, as their rule says (a dot 5 · 5, a number −2 · −2)', JSON.stringify(badges.filter((x) => x.k === 'dock')))   // (Vicky 2026-10-29: brought back)
      await p.locator('nav[aria-label="Primary"]').getByRole('button', { name: /^More/ }).tap(); await settle(p, 800)
      const rows = await p.evaluate(() => [...document.querySelectorAll('[class*="mobile-nav-module__"][class*="__rowCount"]')].map((e) => { const row = e.parentElement.getBoundingClientRect(), r = e.getBoundingClientRect(); return { pos: getComputedStyle(e).position, inside: r.top >= row.top - 0.5 && r.bottom <= row.bottom + 0.5 && r.left >= row.left && r.right <= row.right + 0.5, top: Math.round(r.top) } }))
      ok(rows.length > 0, `the More sheet carries its counts (${rows.length})`)
      ok(rows.every((x) => x.pos === 'static' && x.inside), 'each count sits inside its own row — none stacked on the sheet’s corner', JSON.stringify(rows))
      ok(new Set(rows.map((x) => x.top)).size === rows.length, 'no two counts drawn on top of each other')
      await p.screenshot({ path: path.join(dir, '02-more-counts-390.png') })
      await c.close()
    }

    console.log('3 · touch 44s, by real hit tests')
    {
      const c = await ctx(TABLET); const p = await page(c, 't768')
      await go(p, '/dashboard')
      const sb = p.getByTestId('studio-block'); await sb.evaluate((e) => e.scrollIntoView({ block: 'center' })); await settle(p, 200)
      let h = await hit44(p, await sb.elementHandle())
      ok(h.miss.length === 0 && h.w >= 44, `768 touch: the rail’s studio block takes 44 across (${h.w}×${h.h})`, h.miss.join(' '))
      const av = await p.evaluate(() => { const a = document.querySelector('[data-testid="studio-block"] img, [data-testid="studio-block"] [class*="studioInitial"], [data-testid="studio-block"] [class*="__avatar"]'); const t = document.querySelector('[data-search-tile]'); return a && t ? Math.round((a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2) - (t.getBoundingClientRect().left + t.getBoundingClientRect().width / 2)) : null })
      ok(av !== null && Math.abs(av) <= 1, 'its avatar stays centred on the rail, under the tiles', String(av))
      await go(p, `/leads/${LEAD}`)
      const crumb = p.locator('[class*="crumbs-module__"][class*="__link"]').first()
      h = await hit44(p, await crumb.elementHandle())
      ok(h.miss.length === 0, `768 touch: the L2 header’s crumb takes a finger’s 44 (${h.w}×${h.h} drawn)`, h.miss.join(' '))
      await c.close()
    }
    {
      const c = await ctx(PHONE); const p = await page(c, 't390')
      await go(p, '/company/questionnaire')
      const handle = p.getByRole('button', { name: /^Drag / }).first()
      if (await handle.count()) { const h = await hit44(p, await handle.elementHandle()); ok(h.miss.length === 0, `390: the definition list’s drag handle takes 44 (${h.w}×${h.h} drawn)`, h.miss.join(' ')) } else ok(false, 'a drag handle on Company › Questionnaire')
      const site = await ctx(PHONE, { out: true }); const s = await page(site, 'site')
      await go(s, '/site/pricing')
      for (const [name, loc] of [['the wordmark', s.getByRole('link', { name: 'OpenMaison, home' }).first()], ['Sign in', s.getByRole('link', { name: 'Sign in' }).first()], ['Monthly', s.getByTestId('pricing-period').getByRole('radio').first()], ['Annual', s.getByTestId('pricing-period').getByRole('radio').nth(1)]]) {
        const h = await hit44(s, await loc.elementHandle()); ok(h.miss.length === 0, `390: the website’s ${name} takes 44 (${h.w}×${h.h} drawn)`, h.miss.join(' '))
      }
      const annual = s.getByTestId('pricing-period').getByRole('radio').nth(1)
      await tapAt(s, annual, 19); await settle(s, 400)
      ok(await annual.getAttribute('aria-checked') === 'true', 'a tap 19px under Annual’s centre (inside its 44, outside its drawn 36) picks it')
      await tapAt(s, s.getByTestId('pricing-period').getByRole('radio').first()); await settle(s, 300)
      await go(s, '/site/try/leads')
      const back = s.locator('[class*="pages-module__"][class*="__crumbBack"]').first()
      if (await back.count()) { const h = await hit44(s, await back.elementHandle()); ok(h.miss.length === 0, `390: the website’s back crumb takes 44 (${h.w}×${h.h})`, h.miss.join(' ')) }
      await s.screenshot({ path: path.join(dir, '03-site-bar-390.png'), clip: { x: 0, y: 0, width: 390, height: 160 } })
      await site.close(); await c.close()
    }

    console.log('4 · a folder card’s select box takes its own tap')
    for (const [label, opts] of [['390', PHONE], ['768', TABLET]]) {
      const c = await ctx(opts); const p = await page(c, `folder${label}`)
      await go(p, `/leads/${FOLDER_LEAD}/files`)
      const box = p.locator('[data-testid="folder-card"]').first().locator('label').first()
      if (!(await box.count())) { ok(false, `${label}: a folder card with its select box`); await c.close(); continue }
      const url = p.url()
      const h = await hit44(p, await box.elementHandle())
      ok(h.miss.length === 0, `${label}: the select box answers a finger’s 44 — the folder’s open band no longer lies over it`, h.miss.join(' '))
      await tapAt(p, box, 16); await settle(p, 700)
      const checked = await p.locator('[data-testid="folder-card"]').first().getAttribute('data-selected')
      ok(p.url() === url && checked !== null, `${label}: a tap on the box’s lower half selects the folder and stays on the page`, `url ${p.url() === url ? 'same' : 'changed'} · selected ${checked}`)
      if (checked !== null) { await tapAt(p, box); await settle(p, 400) }   // put the selection back
      await c.close()
    }

    console.log('5 · iOS input zoom, emulated at 390')
    {
      const c = await ctx(PHONE); const p = await page(c, 'ios')
      for (const route of ['/profile', '/settings?section=finance', '/settings?section=leads', `/leads/${LEAD}/notes`]) {
        await go(p, route)
        const n = await unwrapIos(p)
        const small = await p.evaluate(() => [...document.querySelectorAll('input, textarea, select')].filter((el) => !(el.tagName === 'INPUT' && /checkbox|radio|range|file|color|hidden|submit|button/.test(el.type))).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }).map((el) => ({ t: el.tagName, fs: parseFloat(getComputedStyle(el).fontSize) })).filter((x) => x.fs < 16))
        ok(n > 0 && small.length === 0, `${route}: every field types at 16 or more on iOS (none would zoom the page)`, JSON.stringify(small.slice(0, 4)))
      }
      await c.close()
      /* the one-time code's digits (24, above the floor) keep their face on iOS — sign-in's code step (sending a code writes nothing) */
      const before = sql(`select (select count(*) from studio_sessions) || '·' || (select count(*) from notification_outbox)`)
      const so = await ctx(PHONE, { out: true }); const s = await page(so, 'code')
      await go(s, '/sign-in')
      const f = s.locator('input').first(); await f.tap(); await f.fill('dane@demostudio.sg')
      await s.getByRole('button', { name: 'Send me a code' }).tap(); await settle(s, 1500)
      await unwrapIos(s)
      const digits = await s.evaluate(() => [...document.querySelectorAll('input[class*="code-boxes-module__"][class*="__digit"]')].map((e) => parseFloat(getComputedStyle(e).fontSize)))
      ok(digits.length === 6 && digits.every((x) => x === 24), `sign-in's six code boxes keep their 24 digits on iOS (${digits.join(',')})`)
      await so.close()
      ok(sql(`select (select count(*) from studio_sessions) || '·' || (select count(*) from notification_outbox)`) === before, 'asking for a code wrote nothing to the records')
    }

    console.log('6 · keys on a touch screen')
    {
      const c = await ctx(TABLET); const p = await page(c, 'keys')
      await go(p, '/dashboard')
      await p.locator('[data-search-tile]').tap(); await settle(p, 700)
      const footShown = await p.evaluate(() => [...document.querySelectorAll('[class*="global-search-module__"][class*="__foot"]')].some((e) => e.getBoundingClientRect().height > 0))
      ok(!footShown, '768 touch: search’s foot, which names keys, is not drawn without a keyboard')
      await p.evaluate(() => document.documentElement.setAttribute('data-hw-keyboard', ''))
      await settle(p, 100)
      ok(await p.evaluate(() => [...document.querySelectorAll('[class*="global-search-module__"][class*="__foot"]')].some((e) => e.getBoundingClientRect().height > 0)), '…and comes back once a real keyboard has pressed a key')
      /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-37) a touch screen lists Keyboard shortcuts only once a real keyboard
         has pressed a key (as the list's key foot) — it has here, so the row is tapped before the mark is taken away */
      const row = p.getByRole('option', { name: /Keyboard shortcuts/ }).first()
      await tapAt(p, row); await settle(p, 900)
      await p.evaluate(() => document.documentElement.removeAttribute('data-hw-keyboard'))
      const keys = await p.evaluate(() => [...document.querySelectorAll('[role="dialog"] kbd')].filter((e) => e.getBoundingClientRect().width > 0).length)
      ok(keys > 5, `the ? panel’s rows keep their keys on a touch screen (${keys} keys drawn)`)
      await p.screenshot({ path: path.join(dir, '06-shortcuts-768.png') })
      await c.close()
    }

    console.log('7 · a phone held sideways (844 × 390)')
    {
      const c = await ctx(SIDEWAYS); const p = await page(c, 'sideways')
      await go(p, '/profile')
      await tapAt(p, p.getByTestId('signature-change')); await settle(p, 900)
      let d = await p.evaluate(() => { const e = [...document.querySelectorAll('[role="dialog"]')].pop(); const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight } })
      ok(d.top <= 9 && d.bottom >= d.vh - 9, `a tall house dialog uses the screen: 8 above and below (${Math.round(d.top)} · ${Math.round(d.vh - d.bottom)})`)
      await p.screenshot({ path: path.join(dir, '07-dialog-844.png') })
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, '/leads')
      await tapAt(p, p.getByRole('button', { name: /^Filters/ }).first()); await settle(p, 900)
      d = await p.evaluate(() => { const e = [...document.querySelectorAll('[role="dialog"]')].pop(); const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight } })
      ok(d.top <= 9 && d.bottom >= d.vh - 9, `the house Filters modal uses the screen too (${Math.round(d.top)} · ${Math.round(d.vh - d.bottom)})`)
      await p.screenshot({ path: path.join(dir, '07-filters-844.png') })
      await c.close()
    }

    console.log('8 · a notched phone held sideways (insets 47 · 21, emulated)')
    {
      const c = await ctx(SIDEWAYS); const p = await page(c, 'notch')
      const cdp = await c.newCDPSession(p)
      let emulated = true
      try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 47, bottom: 21, left: 47 } }) } catch { emulated = false }
      if (!emulated) console.log('  · this Chromium cannot emulate safe areas — section skipped')
      else {
        await go(p, '/leads')
        const m = await p.evaluate(() => { const rail = document.querySelector('nav[aria-label="Workspace"]')?.getBoundingClientRect(); const main = document.querySelector('main')?.getBoundingClientRect(); return { railLeft: rail?.left, railBottom: rail?.bottom, mainRight: main?.right, vw: innerWidth, vh: innerHeight } })
        ok(m.railLeft >= 47, `the rail stands clear of the left inset (${Math.round(m.railLeft)} ≥ 47)`)
        ok(m.mainRight <= m.vw - 47, `the page ends clear of the right inset (${Math.round(m.vw - m.mainRight)} ≥ 47)`)
        ok(m.railBottom <= m.vh - 21, `the rail’s foot stands off the home indicator (${Math.round(m.vh - m.railBottom)} ≥ 21)`)
        await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(p, 900)
        const fab = await p.evaluate(() => { const e = document.querySelector('[class*="maison-fab-module__"][class*="__wrap"]'); const r = e.getBoundingClientRect(); return { right: innerWidth - r.right, bottom: innerHeight - r.bottom } })
        ok(fab.right >= 47 + 24 - 1 && fab.bottom >= 21 + 24 - 1, `the Maison AI button sits 24 in from the safe edges (${Math.round(fab.right)} · ${Math.round(fab.bottom)})`)
        await p.screenshot({ path: path.join(dir, '08-notch-844.png') })
        const site = await ctx(SIDEWAYS, { out: true }); const s = await page(site, 'notch-site')
        const cdp2 = await site.newCDPSession(s); await cdp2.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 47, bottom: 21, left: 47 } })
        await go(s, '/site')
        const logo = await s.getByRole('link', { name: 'OpenMaison, home' }).first().boundingBox()
        ok(logo && logo.x >= 47 + 16 - 1, `the website’s wordmark keeps 16 clear of the notch (${logo && Math.round(logo.x)})`)
        await site.close()
      }
      await c.close()
    }

    console.log('9 · the ghost’s header wraps where the page’s does (320)')
    {
      const c = await ctx(NARROW); await holdReveal(c); const p = await page(c, 'ghost')
      await p.goto(BASE + '/profile', { waitUntil: 'load' }).catch(() => {}); await settle(p, 2200)
      const g = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
        const content = reveal && reveal.querySelector(':scope > [data-ready]')
        if (!ghost || !content) return null
        const gh = [...ghost.querySelectorAll('[class*="ghost-kit-module__"]')].find((e) => [...e.classList].some((c) => /__head$/.test(c)))
        const ph = [...content.querySelectorAll('[class*="page-header-module__"]')].find((e) => [...e.classList].some((c) => /__header$/.test(c)))
        const bones = [...gh.querySelectorAll('[class*="skeleton-module__"]')].map((e) => e.getBoundingClientRect()).filter((x) => x.width > 0)
        let overlap = false
        for (let i = 0; i < bones.length; i++) for (let j = i + 1; j < bones.length; j++) { const a = bones[i], z = bones[j]; if (a.left < z.right - 1 && z.left < a.right - 1 && a.top < z.bottom - 1 && z.top < a.bottom - 1) overlap = true }
        return { gh: gh.getBoundingClientRect().height, ph: ph.getBoundingClientRect().height, overlap }
      })
      ok(g && !g.overlap, 'Your profile’s ghost: no bone drawn over another in its header', JSON.stringify(g))
      ok(g && Math.abs(g.gh - g.ph) <= 2, `…and the header stands as tall as the page’s (${g && Math.round(g.gh)} · ${g && Math.round(g.ph)})`)
      await c.close()
    }

    console.log('10 · nothing sideways; the desk keeps every rule off')
    for (const [label, opts] of [['320', NARROW], ['844', SIDEWAYS]]) {
      const c = await ctx(opts); const co = await ctx(opts, { out: true })
      for (const [route, cc] of [['/profile', c], ['/site', co], ['/site/pricing', co], ['/site/try', co], ['/sign-in', co], ['/sign-up', co], ['/join/not-a-token', co], ['/no-such-page', c]]) {
        const p = await page(cc, `side${label}`); await go(p, route, 900)
        const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        ok(over <= 0, `${label}: ${route} doesn’t scroll sideways`, `${over}px`)
        await p.close()
      }
      await c.close(); await co.close()
    }
    {
      const c = await ctx(DESK); const p = await page(c, 'desk')
      await go(p, `/leads/${LEAD}`)
      const d = await p.evaluate(() => {
        const crumb = document.querySelector('[class*="crumbs-module__"][class*="__link"]')
        const pg = document.querySelector('[class*="app-shell-module__"][class*="__page"]')
        const cs = pg && getComputedStyle(pg)
        return { crumbAfter: crumb ? getComputedStyle(crumb, '::after').content : 'none', pad: cs ? [cs.paddingLeft, cs.paddingRight, cs.paddingBottom] : null, fab: (() => { const e = document.querySelector('[class*="maison-fab-module__"][class*="__wrap"]'); const s = e && getComputedStyle(e); return s ? [s.right, s.bottom] : null })() }
      })
      ok(d.crumbAfter === 'none', '1440: a crumb draws no touch box under a mouse')
      ok(d.pad && d.pad.every((x) => x === '8px'), `1440: the frame keeps its 8 on every side (${d.pad})`)
      ok(d.fab && d.fab[0] === '24px' && d.fab[1] === '24px', `1440: the Maison AI button keeps its 24 · 24 (${d.fab})`)
      await c.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe ran to its end —', String(e).split('\n')[0].slice(0, 240))
  } finally {
    await b.close()
  }
  if (errors.length) { console.log('page errors:'); for (const e of errors.slice(0, 6)) console.log('  ', e) }
  ok(errors.length === 0, 'no page errors on the way')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
