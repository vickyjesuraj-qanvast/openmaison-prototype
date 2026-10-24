// The whole-app responsiveness audit, lane W3 (2026-10-23 → 24, his "run a overall responsiveness audit and fix all the issues across devices and
// breakpoints based on your recommendations") — Projects, the client portal and the client's money links. Each check asserts a rule, by a real
// tap where a finger is the point (ids W3-nn in design-source/context/responsive/whole-app-audit-2026-10-23/audit-w3.md):
//   1 · a grouped tab's view switch shows the view you are on, on a phone (W3-01) — and a desk's rail never moves
//   2 · a Needs you row with buttons keeps its words readable at 320 (W3-02); the desk's row keeps its one line; the Money tab's rows at an
//       upright tablet too (W3-18)
//   3 · a paper page's title row never pushes a phone sideways (W3-03)
//   4 · the Schedule under a finger: the grip and the who-sees line are 44, a press just above a bar opens its milestone (W3-05); the desk's grip is drawn as before
//   5 · the milestone sheet's four statuses are whole words and 44 tall on a phone (W3-09)
//   6 · Workload › Contractors at 320: the caption's tools stay on the screen, a contractor's name keeps its room (W3-06)
//   7 · the portal under a finger: sections ≥ 44 wide, Sign out 44 tall, a Receipt link takes a press above its line (W3-07); the section you
//       are on is in the row on a phone held sideways (W3-12); a stage's two answers fit their buttons at 320 (W3-19); the home's loader
//       holds a phone's width (W3-17)
//   8 · the floor plan's 100% is a 44 press (W3-08); a ticket's photo is a 44 press (W3-10)
//   9 · a completed project's Overview: at the page's end Maison AI's button is clear of the last card's ↗ (W3-11)
//  10 · no W3 page scrolls sideways at 320 or on a phone held sideways (844 × 390)
// Run against `next start` on a scratch copy of the demo (DATABASE_URL on the same command) — never local.db. What a visit stamps (portal
// sessions, opened / seen marks) is put back in `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-rwd-w3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/responsive-all/w3')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3203'
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rwd-w3-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra) } }

/* what a visit may stamp — kept, compared, and put back where it changed */
const TOUCHED = ['portal_sessions', 'portal_previews', 'homeowner_lead_links', 'homeowner_household_links', 'portal_bell_reads', 'notifications', 'chat_reads',
  'floor_plan_seen', 'lead_tasks', 'leads', 'project_updates', 'purchase_orders', 'render_share_links', 'space_layout_shares', 'studio_sessions', 'lead_events']
  .filter((t) => sql(`select count(*) from sqlite_master where type='table' and name='${t}'`) === '1')
const kept = TOUCHED.map((t) => [t, json(`select * from ${t}`)])
const putBack = () => {
  let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n', n = 0
  for (const [t, rows] of kept) {
    if (JSON.stringify(json(`select * from ${t}`)) === JSON.stringify(rows)) continue
    n++; text += `DELETE FROM ${t};\n`
    for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
  }
  text += 'COMMIT;\n'
  if (n) sqlFile(text)
  return n
}

const P = (n) => sql(`select id from projects where number='${n}'`)
const BEN = P('P-2026-002'), RYAN = P('P-2026-001'), SHALINI = P('P-2025-001')
const PHONE = sql(`select phone from leads where id=(select lead_id from projects where id='${BEN}')`).replace(/\D/g, '').slice(-8)
const RECEIPT_TOKEN = sql(`select share_token from project_payments where share_token is not null and receipt_file_id is not null limit 1`)
const SELECTION = sql(`select id from project_selections where project_id='${BEN}' and status='chosen' limit 1`)
const INVOICE = sql(`select id from project_invoices where project_id='${BEN}' and status!='draft' and share_token is not null limit 1`)
const PAYMENT = sql(`select id from project_payments where project_id='${BEN}' and receipt_file_id is not null limit 1`)
const PHONE_320 = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }
const PHONE_390 = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const SIDEWAYS = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
const TABLET = { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }
const DESK = { viewport: { width: 1440, height: 1024 } }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ctxOf = (o) => b.newContext({ ...o, reducedMotion: 'reduce' })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1300) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const box = (p, sel) => p.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom } })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const signIn = async (c) => {
    const p = await c.newPage()
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').tap(); await p.keyboard.type(PHONE, { delay: 20 })
    await p.getByRole('button', { name: 'Send me a code' }).tap(); await settle(p, 1200)
    await p.locator('[data-testid="portal-digit"]').first().tap(); await p.keyboard.type('482913', { delay: 20 })
    await p.getByRole('button', { name: 'Open my project' }).tap()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 15000 }).catch(() => {}); await settle(p)
    await p.close()
  }
  /* the open chip's centre inside its rail's box — what a person can read without scrolling the rail */
  const chipInRail = (p) => p.evaluate(() => {
    const v = document.querySelector('[data-testid="project-views"]'); if (!v) return null
    const rail = v.querySelector('[role="group"]').getBoundingClientRect(), c = v.querySelector('[role="radio"][aria-checked="true"]').getBoundingClientRect()
    const mid = c.left + c.width / 2, whole = c.left >= rail.left - 1 && c.right <= rail.right + 1
    return { inside: mid > rail.left && mid < rail.right && (whole || c.width > rail.width), scroll: v.querySelector('[role="group"]').scrollLeft }
  })
  try {
    // ── 1 · the view you are on is in its rail (W3-01) ─────────────────────────────────────────────────────────────────────────────────
    console.log('1 · a grouped tab’s view switch shows the view you are on')
    for (const [tag, o] of [['320', PHONE_320], ['390', PHONE_390]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `views-${tag}`)
      for (const t of ['tickets', 'messages', 'meetings', 'designs', 'activity', 'questionnaire']) {
        await go(p, `/projects/${BEN}/${t}`)
        const m = await chipInRail(p)
        ok(m && m.inside, `${tag}: on ${t} its own chip is inside the rail`, JSON.stringify(m))
      }
      /* a tap on a neighbour goes there, and lands with that one in view */
      await go(p, `/projects/${BEN}/updates`)
      await p.locator('[data-testid="project-views"] [role="radio"]', { hasText: 'Tickets' }).tap()
      await p.waitForURL(/\/tickets/, { timeout: 15000 }); await settle(p, 1300)
      const m = await chipInRail(p)
      ok(m && m.inside, `${tag}: a tap on Tickets lands on Tickets with its chip in view`)
      if (tag === '320') await shot(p, '01-views-tickets-320')
      await c.close()
    }
    {
      const c = await ctxOf(DESK); const p = await c.newPage()
      await go(p, `/projects/${BEN}/tickets`)
      const m = await chipInRail(p)
      ok(m && m.scroll === 0 && m.inside, '1440: the desk’s rail has room and never moves')
      await c.close()
    }

    // ── 2 · a Needs you row with buttons at 320 (W3-02) ───────────────────────────────────────────────────────────────────────────────
    console.log('2 · a Needs you row with buttons keeps its words readable')
    {
      const c = await ctxOf(PHONE_320); const p = await c.newPage(); watch(p, 'needs-320')
      await go(p, `/projects/${RYAN}`)
      const rows = await p.locator('[data-card="needs"] [data-testid^="need-"]').evaluateAll((els) => els.filter((e) => e.querySelector('button')).map((e) => {
        const label = e.querySelector('[class*="__label"]') || e.querySelector('[class*="__rowMain"]'), r = e.getBoundingClientRect()
        return { id: e.getAttribute('data-testid'), h: Math.round(r.height), words: Math.round(label ? label.getBoundingClientRect().width : 0), right: Math.max(...[...e.querySelectorAll('button')].map((x) => x.getBoundingClientRect().right)) }
      }))
      ok(rows.length > 0, '320: Ryan’s Needs you has rows with buttons')
      ok(rows.every((r) => r.words >= 120), '320: every row’s words keep at least 120px', JSON.stringify(rows.filter((r) => r.words < 120)))
      ok(rows.every((r) => r.h < 240), '320: no row grows into a column of letters (every row under 240px tall)', JSON.stringify(rows.filter((r) => r.h >= 240)))
      ok(rows.every((r) => r.right <= 320), '320: every row’s buttons are on the screen', JSON.stringify(rows.filter((r) => r.right > 320)))
      await p.locator('[data-testid="need-money-confirm"], [data-card="needs"] [data-testid^="need-money"]').first().scrollIntoViewIfNeeded().catch(() => {})
      await shot(p, '02-needs-row-320')
      await c.close()
      const d = await ctxOf(DESK); const q = await d.newPage()
      await go(q, `/projects/${RYAN}`)
      const wraps = await q.locator('[data-card="needs"] [data-two]:not([data-split])').evaluateAll((els) => els.filter((e) => e.querySelector('button')).map((e) => getComputedStyle(e).flexWrap))
      ok(wraps.every((w) => w === 'nowrap'), '1440: the desk’s rows keep their one line (the rule is ≤1439)')
      await d.close()
      /* (W3-18) the Money tab's Needs you at an upright tablet: a row's words keep a reading width, its buttons take the next line */
      const t = await ctxOf(TABLET); const m = await t.newPage(); watch(m, 'money-768')
      await go(m, `/projects/${RYAN}/money`)
      const words = await m.locator('[data-testid="money-needs"] [role="status"]').evaluateAll((els) => els.map((e) => Math.round(e.querySelector('[class*="__bannerText"]').getBoundingClientRect().width)))
      ok(words.length > 0 && words.every((w) => w >= 240), '768 touch: every Money Needs you row keeps its words at least 240 wide', JSON.stringify(words))
      await shot(m, '02-money-needs-768')
      await t.close()
    }

    // ── 3 · paper title rows on a phone (W3-03) ───────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · a paper page’s title row never pushes a phone sideways')
    {
      const c = await ctxOf(PHONE_320); const p = await c.newPage(); watch(p, 'papers-320')
      for (const [name, url] of [['the receipt link', `/receipt/${RECEIPT_TOKEN}`], ['the selection receipt', `/projects/${BEN}/selection-receipts/${SELECTION}`],
        ['the invoice page', `/projects/${BEN}/invoices/${INVOICE}`], ['the receipt page', `/projects/${BEN}/receipts/${PAYMENT}`]]) {
        await go(p, url)
        ok(await sideways(p) <= 1, `320: ${name} doesn’t scroll sideways`)
        const chips = await p.locator('header [class*="__chips"] > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right)))
        ok(chips.every((r) => r <= 320), `320: ${name}'s chips are on the screen`, JSON.stringify(chips))
      }
      await go(p, `/projects/${BEN}/selection-receipts/${SELECTION}`); await shot(p, '03-selection-receipt-320')
      await c.close()
    }

    // ── 4 · the Schedule under a finger (W3-05) ───────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · the Schedule under a finger')
    {
      const c = await ctxOf(TABLET); const p = await c.newPage(); watch(p, 'schedule-768')
      await go(p, `/projects/${BEN}/schedule`)
      const g = await box(p, '[data-testid="milestone-grip"]')
      ok(g.w >= 44 && g.h >= 44, `768 touch: the grip is a 44 press (${Math.round(g.w)}×${Math.round(g.h)})`)
      const s = await box(p, '[data-testid="client-sees"]')
      ok(s.h >= 44, `768 touch: the who-sees line is a 44 press (${Math.round(s.h)})`)
      /* a press 9px above a bar's drawn top, on a bar inside the timeline's window (between the frozen name and actions columns): the bar
         takes it and opens its milestone */
      await p.locator('[data-testid="milestone-bar"]').first().scrollIntoViewIfNeeded()
      const target = await p.evaluate(() => {
        const nameRight = document.querySelector('[data-testid="milestone-name"]').closest('[role="cell"]').getBoundingClientRect().right
        const actLeft = [...document.querySelectorAll('[role="row"] > [role="cell"]')].find((c) => c.querySelector('[aria-label^="More for"]'))?.getBoundingClientRect().left ?? innerWidth
        for (const bar of document.querySelectorAll('[data-testid="milestone-bar"]')) {
          const r = bar.getBoundingClientRect(), lo = Math.max(r.left, nameRight + 4), hi = Math.min(r.right, actLeft - 4)
          if (hi - lo >= 8 && r.top > 120 && r.bottom < innerHeight - 40) return { x: (lo + hi) / 2, y: r.top - 9, name: bar.closest('[role="row"]').querySelector('[data-testid="milestone-name"] span').textContent.trim() }
        }
        return null
      })
      ok(!!target, '768 touch: a bar shows inside the timeline’s window')
      if (target) {
        const hit = await p.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-testid="milestone-bar"]'), target)
        ok(hit, `768 touch: 9px above a bar is still the bar (${target.name})`)
        await p.touchscreen.tap(target.x, target.y); await settle(p, 1200)
        const sheet = await p.locator('[role="dialog"]').last().innerText().catch(() => '')
        ok(sheet.includes(target.name.slice(0, 12)), '768 touch: that press opens the bar’s milestone', target.name)
      }
      await shot(p, '04-schedule-bar-press-768')
      await c.close()
      const d = await ctxOf(DESK); const q = await d.newPage()
      await go(q, `/projects/${BEN}/schedule`)
      const dg = await box(q, '[data-testid="milestone-grip"]')
      ok(Math.round(dg.w) === 20 && Math.round(dg.h) === 32, `1440: the desk’s grip is drawn as before (${Math.round(dg.w)}×${Math.round(dg.h)})`)
      await d.close()
    }

    // ── 5 · the milestone sheet's statuses on a phone (W3-09) ────────────────────────────────────────────────────────────────────────
    console.log('5 · the milestone sheet’s statuses are whole words and 44 tall')
    {
      const c = await ctxOf(PHONE_320); const p = await c.newPage(); watch(p, 'sheet-320')
      await go(p, `/projects/${BEN}/schedule`)
      await p.locator('[data-testid="phone-milestone"]').first().tap(); await settle(p, 1200)
      const seg = await p.locator('[role="dialog"] [class*="statusSeg"] button').evaluateAll((els) => els.map((e) => ({ t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, h: Math.round(e.getBoundingClientRect().height) })))
      ok(seg.length === 4, '320: the sheet shows the four statuses')
      ok(seg.every((s) => !s.cut), '320: every status is a whole word, none cut', JSON.stringify(seg.filter((s) => s.cut)))
      ok(seg.every((s) => s.h >= 44), '320: every status is a 44 press', JSON.stringify(seg.map((s) => s.h)))
      await shot(p, '05-status-320')
      await c.close()
    }

    // ── 6 · Workload › Contractors at 320 (W3-06) ─────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Workload › Contractors at 320')
    {
      const c = await ctxOf(PHONE_320); const p = await c.newPage(); watch(p, 'crew-320')
      await go(p, '/projects?view=workload&of=contractors')
      ok(await sideways(p) <= 1, '320: the Contractors view doesn’t scroll sideways')
      const v = await box(p, '[data-testid="contractors-vendors"]')
      ok(v.r <= 320 && v.x >= 0, `320: Vendors is on the screen (${Math.round(v.x)}–${Math.round(v.r)})`)
      const names = await p.locator('[data-testid="contractor-open"]').evaluateAll((els) => els.map((e) => ({ t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, w: Math.round(e.getBoundingClientRect().width) })))
      ok(names.length > 0 && names.every((n) => !n.cut || n.w >= 140), '320: every contractor’s name reads whole, or keeps at least 140px (its state takes the next line)', JSON.stringify(names.filter((n) => n.cut && n.w < 140)))
      const lines = await p.locator('[data-testid="contractor-row"]').evaluateAll((els) => els.map((e) => { const s = e.querySelector('[class*="__state"]').getBoundingClientRect(), b = e.querySelector('[class*="__bar"]').getBoundingClientRect(); return s.bottom <= b.top + 1 && s.right <= e.getBoundingClientRect().right }))
      ok(lines.every(Boolean), '320: a card reads name · state · then its bar of slots, all inside the card')
      await p.locator('[data-testid="contractor-lines"]').scrollIntoViewIfNeeded(); await shot(p, '06-contractors-320')
      await c.close()
    }

    // ── 7 · the portal under a finger (W3-07 · W3-12) ─────────────────────────────────────────────────────────────────────────────────
    console.log('7 · the portal under a finger')
    {
      const c = await ctxOf(TABLET); await signIn(c); const p = await c.newPage(); watch(p, 'portal-768')
      await go(p, '/my/demo-studio')
      const links = await p.locator('[data-testid="portal-nav"] a').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
      ok(links.length > 3 && links.every((w) => w >= 44), '768 touch: every section in the bar is at least 44 wide', JSON.stringify(links))
      const so = await box(p, '[data-testid="portal-sign-out"]')
      ok(so.h >= 44, `768 touch: Sign out is 44 tall (${Math.round(so.h)})`)
      await c.close()
      const q = await ctxOf(PHONE_390); await signIn(q); const m = await q.newPage(); watch(m, 'portal-390')
      await go(m, '/my/demo-studio/money')
      const r = await box(m, '[data-testid="portal-receipt-link"]')
      ok(r.h >= 44, `390: a Receipt link is a 44 press (${Math.round(r.h)})`)
      const above = await m.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-testid="portal-receipt-link"]'), { x: r.x + r.w / 2, y: r.y + 4 })
      ok(above, '390: a press above the word still lands on Receipt')
      await shot(m, '07-portal-money-390')
      await q.close()
      const s = await ctxOf(SIDEWAYS); await signIn(s); const h = await s.newPage(); watch(h, 'portal-sideways')
      for (const sec of ['messages', 'about', 'files']) {
        await go(h, `/my/demo-studio/${sec}`)
        const inRow = await h.evaluate(() => { const n = document.querySelector('[data-testid="portal-nav"]'), a = n?.querySelector('[aria-current="page"]'); if (!a) return null; const nr = n.getBoundingClientRect(), ar = a.getBoundingClientRect(); return ar.left >= nr.left - 1 && ar.right <= nr.right + 1 })
        ok(inRow === true, `844×390: on ${sec} the section's own link is inside the bar's row`)
      }
      await shot(h, '07-portal-nav-sideways')
      await s.close()
      /* (W3-19) the stage to confirm at 320: both answers inside their buttons */
      const n = await ctxOf(PHONE_320); await signIn(n); const k = await n.newPage(); watch(k, 'portal-320')
      await go(k, '/my/demo-studio/schedule')
      const answers = await k.locator('[data-testid="portal-confirm"] button').evaluateAll((els) => els.map((e) => ({ t: e.textContent.trim(), over: e.scrollWidth > e.clientWidth + 1, h: Math.round(e.getBoundingClientRect().height) })))
      ok(answers.length >= 2 && answers.every((a) => !a.over && a.h >= 48), '320: Looks good and Something is not right sit inside their 48+ buttons', JSON.stringify(answers))
      await n.close()
      /* (W3-17) the portal home's loader at 390: its cards hold the phone's width (the desk's action bone ran them 96px past it) */
      const g = await ctxOf(PHONE_390); await signIn(g)
      await g.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const gp = await g.newPage(); await go(gp, '/my/demo-studio')
      const ghost = await gp.evaluate(() => { const gh = [...document.querySelectorAll('*')].find((e) => [...e.classList].some((c) => /page-reveal-module__\w+__ghost$/.test(c))); return gh ? Math.max(...[...gh.querySelectorAll('section')].map((s) => Math.round(s.getBoundingClientRect().right))) : null })
      ok(ghost !== null && ghost <= 390, `390: the portal home's ghost cards end inside the screen (${ghost})`)
      await g.close()
    }

    // ── 8 · the floor plan's 100% and a ticket's photo (W3-08 · W3-10) ────────────────────────────────────────────────────────────────
    console.log('8 · the floor plan’s 100% and a ticket’s photo')
    {
      const c = await ctxOf(TABLET); const p = await c.newPage(); watch(p, 'fp-768')
      await go(p, `/projects/${BEN}/floor-plan`)
      const z = await box(p, '[data-testid="plan-zoom"]')
      ok(z.h >= 44, `768 touch: the zoom bar's 100% is a 44 press (${Math.round(z.w)}×${Math.round(z.h)})`)
      await c.close()
      const q = await ctxOf(PHONE_390); const t = await q.newPage(); watch(t, 'ticket-390')
      await go(t, `/projects/${BEN}/tickets`)
      await t.locator('[data-testid="ticket-card"]').first().tap(); await settle(t, 1200)
      const ph = await box(t, '[role="dialog"] [aria-label^="Photo 1 of"]')
      ok(ph.w >= 44 && ph.h >= 44, `390: a ticket's photo is a 44 press (${Math.round(ph.w)}×${Math.round(ph.h)})`)
      await shot(t, '08-ticket-photo-390')
      await q.close()
    }

    // ── 9 · a completed project's Overview at the page's end (W3-11) ──────────────────────────────────────────────────────────────────
    console.log('9 · a completed project’s Overview keeps Maison AI clear of its last card')
    {
      const c = await ctxOf(PHONE_390); const p = await c.newPage(); watch(p, 'shalini-390')
      await go(p, `/projects/${SHALINI}`)
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(p, 900)
      const clear = await p.locator('[data-card="recent-activity"] button[aria-label="Open recent activity"]').evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && (el === hit || el.contains(hit)) })
      ok(clear, '390: at the end the Recent activity card’s ↗ is not under the Maison AI button')
      await shot(p, '09-completed-end-390')
      await c.close()
    }

    // ── 10 · no sideways scroll at 320 or a phone held sideways ───────────────────────────────────────────────────────────────────────
    console.log('10 · no W3 page scrolls sideways at 320 or 844 × 390')
    const PAGES = ['/projects', '/projects?view=workload', '/projects?view=workload&of=contractors', '/compliance', `/projects/${BEN}`,
      ...['tasks', 'compliance', 'schedule', 'updates', 'messages', 'tickets', 'meetings', 'questionnaire', 'choices', 'floor-plan', 'designs', 'money', 'files', 'notes', 'activity'].map((t) => `/projects/${BEN}/${t}`),
      `/projects/${RYAN}`, `/projects/${SHALINI}`, `/projects/${BEN}/invoices/${INVOICE}`, `/projects/${BEN}/receipts/${PAYMENT}`, `/projects/${BEN}/selection-receipts/${SELECTION}`, `/receipt/${RECEIPT_TOKEN}`]
    const PORTAL = ['', '/schedule', '/updates', '/money', '/files', '/choices', '/designs', '/floor-plan', '/messages', '/issues', '/about'].map((s) => `/my/demo-studio${s}`)
    for (const [tag, o] of [['320', PHONE_320], ['844×390', SIDEWAYS]]) {
      const c = await ctxOf(o); await signIn(c); const p = await c.newPage(); watch(p, `sideways-${tag}`)
      const wide = []
      for (const u of [...PAGES, ...PORTAL]) { await go(p, u); const s = await sideways(p); if (s > 1) wide.push(`${u} +${s}`) }
      ok(wide.length === 0, `${tag}: every page holds the screen's width`, wide.join(' | '))
      await c.close()
    }
    ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).split('\n')[0])
  } finally {
    const n = putBack()
    console.log(`  (put back: ${n} table${n === 1 ? '' : 's'} a visit had stamped)`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
