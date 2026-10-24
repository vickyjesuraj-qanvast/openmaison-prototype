// The held calls, lane C2 (2026-10-24, his "fix all of it and commit and push" — the calls after Leads on the move and the whole-app
// responsiveness audit, each as the orchestrator decided: design-source/context/responsive/whole-app-audit-2026-10-23/calls-2026-10-24.md) —
// Projects, the client portal, Company, Settings. Each check asserts a rule, by a real tap where a finger is the point:
//   1 · W3-04  the Schedule on a tablet held upright reads the phone's rows (whole names, a tap opens the milestone); sideways and at a desk the
//              timeline stays; the tab's ghost draws the rows upright
//   2 · W3-10  a report's photo is the drawn 64 at every width — the ticket's panel at 1440, 1280 and 390
//   3 · W3-13  the Floor plan's toolbar at ≤374: the views on the first line (the view you are on whole), the tools on the second at its end;
//              one row from 375
//   4 · W3-14  the portal's sections row says it scrolls on a tablet: the house edge fade where more waits, none at a desk
//   5 · W3-15  a project's floor-plan papers on a phone: fitted to the width (no sideways scroll); a tap opens the house paper viewer on that
//              page, ← comes back; the desk keeps the papers at their size
//   6 · W3-16  the house StatTiles stay two across at 320 (Projects, a project's Money, Reports) where the row holds two; a long figure is fitted to
//              its tile, a row too narrow for two (a card's insets at 320) reads one a row — no caption broken inside a word, no figure past a tile
//   7 · W4-12  "Used by n quotes" on a touch card is a 44 press (a real tap above its line opens the quotes) and beside it the card still opens
//   8 · W6-04  the two order-proof pairs hold the code's value: the Designs list's 8 · 20 · 20 and Settings' gate field at 200
//   9 · no page these touch scrolls sideways at 320 or on a phone held sideways (844 × 390)
//  10 · K-10 (the orchestrator's addition) a project's page on a phone held sideways: the header scrolls away, only the tab strip stays pinned
//       at the screen's top with the Create strip under it; a tab still takes its tap; 667 × 375 the same; the desk keeps its sticky header
// Run against `next start` on a scratch copy of the demo (DATABASE_URL on the same command) — never local.db. What a visit stamps is put back in
// `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-rwd-c2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/responsive-all/rwd-c2')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3212'
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rwd-c2-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra) } }

/* what a visit may stamp — kept, compared, and put back where it changed */
const TOUCHED = ['portal_sessions', 'portal_previews', 'homeowner_lead_links', 'homeowner_household_links', 'portal_bell_reads', 'notifications', 'chat_reads',
  'floor_plan_seen', 'lead_tasks', 'leads', 'project_updates', 'project_tickets', 'render_share_links', 'space_layout_shares', 'studio_sessions', 'lead_events', 'settings']
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
const BEN = P('P-2026-002'), RYAN = P('P-2026-001')
const PHONE = sql(`select phone from leads where id=(select lead_id from projects where id='${BEN}')`).replace(/\D/g, '').slice(-8)
const PLAN = sql(`select id from project_floor_plans where project_id='${BEN}' and put_away_at is null order by created_at limit 1`)
const TICKET = sql(`select id from project_tickets where project_id='${BEN}' and photos is not null and photos != '[]' and status != 'closed' limit 1`)
const PHONE_320 = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }
const PHONE_374 = { viewport: { width: 374, height: 740 }, isMobile: true, hasTouch: true }
const PHONE_375 = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
const PHONE_390 = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const SIDEWAYS = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
const UPRIGHT = { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }
const UPRIGHT_AIR = { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }
const TABLET_SIDE = { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true }
const MOUSE_1280 = { viewport: { width: 1280, height: 800 } }
const SIDEWAYS_SE = { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true }
const DESK = { viewport: { width: 1440, height: 1024 } }
const HOLD_GHOST = () => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ctxOf = (o) => b.newContext({ ...o, reducedMotion: 'reduce' })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1300) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const box = (p, sel) => p.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom } })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const signIn = async (c) => {
    const p = await c.newPage()
    await go(p, '/my/demo-studio/login')
    const touch = await p.evaluate(() => matchMedia('(hover: none)').matches)
    const press = (l) => (touch ? l.tap() : l.click())
    await press(p.locator('input[type="tel"]')); await p.keyboard.type(PHONE, { delay: 20 })
    await press(p.getByRole('button', { name: 'Send me a code' })); await settle(p, 1200)
    await press(p.locator('[data-testid="portal-digit"]').first()); await p.keyboard.type('482913', { delay: 20 })
    await press(p.getByRole('button', { name: 'Open my project' }))
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 15000 }).catch(() => {}); await settle(p)
    await p.close()
  }
  try {
    // ── 1 · the Schedule on a tablet held upright (W3-04) ─────────────────────────────────────────────────────────────────────────────────
    console.log('1 · W3-04 — a tablet held upright reads the schedule’s rows')
    for (const [tag, o] of [['768 upright', UPRIGHT], ['820 upright', UPRIGHT_AIR]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `sched-${tag}`)
      await go(p, `/projects/${BEN}/schedule`, 1600)
      ok(await p.getByTestId('schedule-phone').count() === 1, `${tag}: the phone's rows`)
      ok(await p.getByTestId('schedule-full').count() === 0 && await p.getByRole('radiogroup', { name: 'Scale' }).count() === 0 && await p.locator('[data-testid="project-schedule"] [data-rows]').count() === 1, `${tag}: no timeline — no scale, no full screen; the toolbar is the rows' (data-rows)`)
      ok(await p.getByTestId('add-milestone').count() === 1 && await p.getByTestId('schedule-kebab').count() === 1 && await p.getByTestId('client-sees').count() === 1, `${tag}: the toolbar keeps Add milestone, who sees it and ⋮`)
      const names = await p.locator('[data-testid="phone-milestone"] [class*="__name"]').evaluateAll((els) => els.map((e) => ({ t: e.textContent, cut: e.scrollWidth > e.clientWidth + 1 })))
      ok(names.length >= 5 && names.every((n) => !n.cut), `${tag}: every milestone's name is whole (${names.length} rows)`, JSON.stringify(names.filter((n) => n.cut)))
      ok(await sideways(p) <= 1, `${tag}: no sideways scroll`)
      if (tag === '768 upright') await shot(p, '01-schedule-768-upright')
      const first = p.locator('[data-testid="phone-milestone"] button[data-kb-open]').first()
      const title = (await first.locator('[class*="__name"]').textContent()).trim()
      await first.tap(); await settle(p, 1200)
      ok(await p.getByRole('dialog').filter({ hasText: title }).count() > 0, `${tag}: a tap on a row opens its milestone (${title})`)
      if (tag === '768 upright') await shot(p, '01-schedule-768-open')
      await c.close()
    }
    for (const [tag, o] of [['1024 sideways', TABLET_SIDE], ['1440', DESK]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `sched-${tag}`)
      await go(p, `/projects/${BEN}/schedule`, 1600)
      ok(await p.getByTestId('schedule-phone').count() === 0 && await p.getByTestId('schedule-full').count() === 1 && await p.locator('[data-testid="project-schedule"] [data-rows]').count() === 0, `${tag}: the timeline stays (its full screen there)`)
      await c.close()
    }
    {
      const c = await ctxOf(UPRIGHT); await c.addInitScript(HOLD_GHOST); const p = await c.newPage(); watch(p, 'sched-ghost')
      await go(p, `/projects/${BEN}/schedule`, 2000)
      const g = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
        if (!ghost) return null
        return { rows: !!ghost.querySelector('[class*="schedule-module__"][class*="__phoneList"]'), grid: !!ghost.querySelector('[class*="schedule-module__"][class*="__grid"]') }
      })
      ok(g && g.rows && !g.grid, '768 upright: the held ghost draws the rows, not the timeline', JSON.stringify(g))
      await c.close()
    }

    // ── 2 · a report's photo is the drawn 64 (W3-10) ───────────────────────────────────────────────────────────────────────────────────
    console.log('2 · W3-10 — a report’s photo is 64 at every width')
    for (const [tag, o] of [['1440', DESK], ['1280', MOUSE_1280], ['390', PHONE_390]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `photo-${tag}`)
      await go(p, `/projects/${BEN}/tickets?open=${TICKET}`, 1600)
      const ph = await box(p, '[role="dialog"] [aria-label^="Photo 1 of"]')
      ok(Math.round(ph.w) === 64 && Math.round(ph.h) === 64, `${tag}: the ticket's photo is 64 × 64 (${Math.round(ph.w)}×${Math.round(ph.h)})`)
      if (tag === '1440') await shot(p, '02-ticket-photo-1440')
      await c.close()
    }

    // ── 3 · the Floor plan's toolbar at ≤374 (W3-13) ──────────────────────────────────────────────────────────────────────────────────
    console.log('3 · W3-13 — the Floor plan’s views take their own line at 374 and below')
    const barShape = (p) => p.evaluate(() => {
      const v = document.querySelector('[data-testid="project-views"]'), a = document.querySelector('[data-testid="plan-kebab"]')?.closest('[class*="__actions"]')
      const bar = v?.parentElement
      if (!v || !a || !bar) return null
      const rv = v.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = bar.getBoundingClientRect()
      const rail = v.querySelector('[role="group"]').getBoundingClientRect(), chip = v.querySelector('[role="radio"][aria-checked="true"]').getBoundingClientRect()
      return { split: ra.top >= rv.bottom - 1, atEnd: Math.abs(ra.right - rb.right) <= 2, chipWhole: chip.left >= rail.left - 1 && chip.right <= rail.right + 1, railW: Math.round(rail.width) }
    })
    for (const [tag, o] of [['320', PHONE_320], ['374', PHONE_374]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `fp-${tag}`)
      await go(p, `/projects/${BEN}/floor-plan`, 1600)
      const s = await barShape(p)
      ok(s && s.split && s.atEnd, `${tag}: the views on the first line, the tools on the second at its end`, JSON.stringify(s))
      ok(s && s.chipWhole, `${tag}: Floor plan, the view you are on, is whole in its rail (${s && s.railW}px)`, JSON.stringify(s))
      ok(await sideways(p) <= 1, `${tag}: no sideways scroll`)
      if (tag === '320') {
        await shot(p, '03-floor-plan-320')
        await p.locator('[data-testid="project-views"] [role="radio"]', { hasText: 'Designs' }).tap()
        await p.waitForURL(/\/designs/, { timeout: 15000 }); await settle(p, 1300)
        ok(/\/designs/.test(p.url()), '320: a tap on Designs in the freed rail goes there')
      }
      await c.close()
    }
    {
      const c = await ctxOf(PHONE_375); const p = await c.newPage(); watch(p, 'fp-375')
      await go(p, `/projects/${BEN}/floor-plan`, 1600)
      const s = await barShape(p)
      ok(s && !s.split, '375: one row, as REG-353 keeps it', JSON.stringify(s))
      await c.close()
    }

    // ── 4 · the portal's sections row on a tablet (W3-14) ─────────────────────────────────────────────────────────────────────────────
    console.log('4 · W3-14 — the portal’s sections row says it scrolls')
    const fades = (p) => p.evaluate(() => {
      const nav = document.querySelector('[data-testid="portal-nav"]'), wrap = nav?.parentElement
      if (!nav || !wrap) return null
      const f = [...wrap.querySelectorAll('[class*="scroll-pagers-module__"][class*="__fade"]')]
      const on = (k) => f.some((e) => new RegExp(`__fade${k}`).test(e.className) && e.hasAttribute('data-on') && getComputedStyle(e).opacity === '1')
      return { left: on('Left'), right: on('Right'), overflow: nav.scrollWidth > nav.clientWidth + 1, scroll: nav.scrollLeft, max: nav.scrollWidth - nav.clientWidth }
    })
    {
      const c = await ctxOf(UPRIGHT); await signIn(c); const p = await c.newPage(); watch(p, 'portal-768')
      await go(p, '/my/demo-studio/messages')
      const f = await fades(p)
      ok(f && f.overflow && (f.left || f.right), '768 upright: the row scrolls and an edge fades where more waits', JSON.stringify(f))
      await shot(p, '04-portal-768-messages')
      await p.locator('[data-testid="portal-nav"]').evaluate((n) => { n.style.scrollBehavior = 'auto'; n.scrollLeft = 0 }); await settle(p, 500)
      const s = await fades(p)
      ok(s && !s.left && s.right, '768 upright: at the row’s start only the far end fades', JSON.stringify(s))
      await p.locator('[data-testid="portal-nav"]').evaluate((n) => { n.scrollLeft = n.scrollWidth }); await settle(p, 500)
      const e = await fades(p)
      ok(e && e.left && !e.right, '768 upright: at its end only the near end fades', JSON.stringify(e))
      /* the fade never takes a section's press: a tap on the last section still goes there */
      const last = p.locator('[data-testid="portal-nav"] a').last()
      const href = await last.getAttribute('href')
      await last.tap(); await p.waitForURL((u) => String(u).endsWith(href), { timeout: 15000 }).catch(() => {}); await settle(p)
      ok(p.url().endsWith(href), `768 upright: a tap on the last section (under the fade's edge) goes there (${href})`)
      await c.close()
    }
    {
      const c = await ctxOf(DESK); await signIn(c); const p = await c.newPage(); watch(p, 'portal-1440')
      await go(p, '/my/demo-studio/messages')
      const f = await fades(p)
      ok(f && !f.overflow && !f.left && !f.right, '1440: the row has room — no fade', JSON.stringify(f))
      await c.close()
    }

    // ── 5 · the floor-plan papers on a phone (W3-15) ──────────────────────────────────────────────────────────────────────────────────
    console.log('5 · W3-15 — a project’s floor-plan papers open in the house paper viewer on a phone')
    for (const [tag, o] of [['390', PHONE_390], ['320', PHONE_320]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `paper-${tag}`)
      await go(p, `/projects/${BEN}/floor-plan/${PLAN}`, 1800)
      ok(await sideways(p) <= 1, `${tag}: the page holds the screen's width`)
      const fit = await p.evaluate(() => {
        const stage = document.querySelector('[data-testid="plan-print"] [class*="__stage"]'), papers = [...document.querySelectorAll('[data-testid="plan-paper-open"]')]
        const s = stage.getBoundingClientRect()
        return { n: papers.length, inside: papers.every((e) => { const r = e.getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1 }), scrolls: stage.scrollWidth > stage.clientWidth + 1 }
      })
      ok(fit.n === 2 && fit.inside && !fit.scrolls, `${tag}: the plan and its legend are fitted to the stage — nothing scrolls sideways`, JSON.stringify(fit))
      if (tag === '390') {
        await shot(p, '05-papers-390')
        await p.getByTestId('plan-paper-open').nth(1).tap(); await settle(p, 1400)
        const v = p.getByTestId('paper-viewer')
        ok(await v.count() === 1, '390: a tap on the legend opens the house paper viewer')
        ok(await v.getAttribute('data-page-at') === '2', '390: …on the page that was tapped', await v.getAttribute('data-page-at'))
        ok(await v.getByTestId('page-dots').count() === 1 && await v.getByRole('button', { name: 'Page 1 of 2' }).count() === 1, '390: its dots say two pages')
        const pg = await v.locator('[data-page]').first().evaluate((e) => Math.round(e.getBoundingClientRect().width))
        ok(Math.abs(pg - (390 - 32)) <= 2, `390: a page is fitted to the width (${pg}px)`)
        await shot(p, '05-papers-viewer-390')
        await v.getByRole('button', { name: 'Page 1 of 2' }).tap(); await settle(p, 900)
        ok(await v.getAttribute('data-page-at') === '1', '390: a dot goes to the plan')
        const back = v.getByTestId('paper-viewer-back')
        ok(await back.getAttribute('aria-label') === 'Back to the marked plan', '390: ← says where it goes')
        await back.tap(); await settle(p, 700)
        ok(await p.getByTestId('paper-viewer').count() === 0 && await p.getByTestId('plan-print').count() === 1, '390: ← comes back to the papers’ page (the switch, Back to the plan and Download there)')
      }
      await c.close()
    }
    {
      const c = await ctxOf(DESK); const p = await c.newPage(); watch(p, 'paper-1440')
      await go(p, `/projects/${BEN}/floor-plan/${PLAN}`, 1800)
      const w = await p.locator('[data-testid="plan-print"] section[aria-label="The marked plan"]').evaluate((e) => Math.round(e.getBoundingClientRect().width))
      ok(await p.getByTestId('plan-paper-open').count() === 0 && Math.abs(w - 1123) <= 1, `1440: the papers at their size (${w}px), no viewer`)
      await c.close()
    }

    // ── 6 · StatTiles at 320 (W3-16) ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · W3-16 — the house tiles stay two across at 320; a long figure fits its tile, a row too narrow for two reads one a row')
    /* each house tile row: its width, whether its first two share a line, and every caption word / figure against its tile's inner width (a word
       broken inside itself or a figure past the tile is the defect) */
    const tileRows = (p) => p.evaluate(() => {
      const measure = (el, text) => { const s = document.createElement('span'), cs = getComputedStyle(el); s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font + ';letter-spacing:' + cs.letterSpacing + ';text-transform:' + cs.textTransform; s.textContent = text; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w }
      return [...document.querySelectorAll('[class*="stat-tile-module__"][class*="__tiles"]')].filter((g) => g.offsetParent && g.children.length >= 2).map((g) => {
        const kids = [...g.children], k = kids.map((e) => e.getBoundingClientRect())
        const bad = []
        for (const t of kids) {
          const ts = getComputedStyle(t), inner = t.clientWidth - parseFloat(ts.paddingLeft) - parseFloat(ts.paddingRight)
          for (const v of t.querySelectorAll('[class*="__value"], [class*="__label"]')) {
            const widest = Math.max(...v.textContent.trim().split(/\s+/).map((w) => measure(v, w)))
            if (widest > inner + 0.5) bad.push('"' + v.textContent.trim().slice(0, 24) + '" ' + Math.round(widest) + '>' + Math.round(inner))
          }
        }
        return { row: Math.round(g.getBoundingClientRect().width), pair: Math.abs(k[0].top - k[1].top) < 1, bad }
      })
    })
    for (const [tag, o] of [['320', PHONE_320], ['390', PHONE_390]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `tiles-${tag}`)
      for (const u of ['/projects', '/dashboard', `/projects/${RYAN}/money`, `/projects/${BEN}/money`, '/company/reports/projects', '/company/reports/leads', '/company/reports/leads?report=sales', '/company/reports/finance', '/company/finance/commissions', '/qanvast-ops/studios']) {
        await go(p, u, 1600)
        const t = await tileRows(p)
        const money = /\/money$/.test(u)   // the Money tab's first tile, To collect, takes the row by its own rule (R2-A)
        ok(t.length > 0 && t.every((g) => (g.row >= 264 ? (g.pair || money) : !g.pair)), `${tag} ${u}: two across where the row holds two (≥ 264), one a row where it doesn't`, JSON.stringify(t.map((g) => [g.row, g.pair])))
        ok(t.every((g) => g.bad.length === 0), `${tag} ${u}: no caption broken inside a word, no figure past its tile`, JSON.stringify(t.flatMap((g) => g.bad)))
        ok(await sideways(p) <= 1, `${tag} ${u}: no sideways scroll`)
        if (tag === '320' && u === '/projects') await shot(p, '06-tiles-projects-320')
        if (tag === '390' && u === '/dashboard') { await p.locator('[data-testid="stands-tiles"]').scrollIntoViewIfNeeded().catch(() => {}); await shot(p, '06-tiles-dashboard-390') }
      }
      await c.close()
    }
    {
      const c = await ctxOf(DESK); const p = await c.newPage(); watch(p, 'tiles-1440')
      await go(p, '/dashboard', 1600)
      const f = await p.locator('[data-testid="stands-tiles"] [class*="stat-tile-module__"][class*="__value"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).fontSize))
      ok(f.length > 0 && f.every((x) => x === '20px'), '1440: every figure at the house 20 (the fit is a phone’s)', JSON.stringify(f))
      await c.close()
    }

    // ── 7 · "Used by n quotes" on a touch card (W4-12) ────────────────────────────────────────────────────────────────────────────────
    console.log('7 · W4-12 — Used by n quotes is a 44 press on a touch card')
    for (const [tag, o] of [['390', PHONE_390], ['768 touch', UPRIGHT]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `used-${tag}`)
      await go(p, '/company/templates', 1800)
      const link = p.locator('[data-testid="library-card"] a[href^="/quotes?template="]').first()
      await link.scrollIntoViewIfNeeded()
      const m = await link.evaluate((a) => {
        const r = a.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(a); const t = range.getBoundingClientRect()
        const card = a.closest('[data-testid="library-card"]'), meta = card.querySelector('[class*="__meta"]').getBoundingClientRect(), open = card.querySelector('[data-kb-open]')
        const at = (x, y) => document.elementFromPoint(x, y)
        const cx = t.left + Math.min(20, t.width / 2), up = t.top - 13, down = t.bottom + 13
        const pastLink = Math.min(card.getBoundingClientRect().right - 8, r.right + 30)
        return { press: Math.round(r.height), textTop: t.top, metaBottom: meta.bottom, upHit: a.contains(at(cx, up)), downHit: a.contains(at(cx, down)),
          beside: (() => { const e = at(t.right + 12 > card.getBoundingClientRect().right - 4 ? cx : Math.min(pastLink, card.getBoundingClientRect().right - 8), t.top - 6); return !!e && (open === e || open.contains(e) || !a.contains(e)) })() }
      })
      ok(m.press >= 44, `${tag}: the link's press is ${m.press} tall`)
      ok(m.upHit && m.downHit, `${tag}: a press 13 above and below its words lands on it`, JSON.stringify(m))
      ok(m.textTop >= m.metaBottom - 0.5, `${tag}: its words are drawn where they were — under the card's second line`, JSON.stringify(m))
      /* a real tap above the words goes to the template's quotes */
      const href = await link.getAttribute('href')
      const t = await link.evaluate((a) => { const range = document.createRange(); range.selectNodeContents(a); const r = range.getBoundingClientRect(); return { x: r.left + Math.min(20, r.width / 2), y: r.top - 12 } })
      await p.touchscreen.tap(t.x, t.y)
      await p.waitForURL((u) => String(u).includes('/quotes?template='), { timeout: 15000 }).catch(() => {}); await settle(p)
      ok(p.url().includes(href), `${tag}: a tap 12 above "Used by" opens that template's quotes`, p.url())
      if (tag === '390') await shot(p, '07-used-by-tap-390')
      await c.close()
    }
    {
      /* beside the link the card's own press keeps the band the foot line now reaches into */
      const c = await ctxOf(PHONE_390); const p = await c.newPage(); watch(p, 'used-card')
      await go(p, '/company/templates', 1800)
      const card = p.locator('[data-testid="library-card"]').filter({ has: p.locator('a[href^="/quotes?template="]') }).first()
      await card.scrollIntoViewIfNeeded()
      const pt = await card.evaluate((el) => { const a = el.querySelector('a[href^="/quotes?template="]'), range = document.createRange(); range.selectNodeContents(a); const t = range.getBoundingClientRect(), c = el.getBoundingClientRect(); return { x: Math.min(c.right - 12, t.right + 24), y: t.top - 6, room: c.right - 12 - t.right } })
      const hit = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('[data-kb-open]') }, pt)
      ok(pt.room < 24 || hit, '390: beside the link, the band above the foot line still opens the card', JSON.stringify(pt))
      await c.close()
    }

    // ── 8 · the two order-proof pairs (W6-04) ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · W6-04 — the code’s value holds in production')
    {
      const c = await ctxOf(DESK); const p = await c.newPage(); watch(p, 'w604')
      await go(p, `/projects/${BEN}/designs`, 1600)
      const pad = await p.locator('ul[class*="designs-module__"][class*="__list"]').first().evaluate((e) => getComputedStyle(e).padding).catch(() => null)
      ok(pad === '8px 20px 20px', `1440: the Designs list's padding is 8 · 20 · 20 (${pad})`)
      await go(p, '/settings?section=leads', 1800)
      const gate = await p.locator('[class*="settings-module__"][class*="__gateField"]').first().evaluate((e) => ({ basis: getComputedStyle(e).flexBasis, grow: getComputedStyle(e).flexGrow, w: Math.round(e.getBoundingClientRect().width) })).catch(() => null)
      ok(gate && gate.basis === '200px' && gate.grow === '0' && gate.w === 200, `1440: the Lost reasons' gate field holds 200 (${JSON.stringify(gate)})`)
      await shot(p, '08-settings-gate-1440')
      await c.close()
    }

    // ── 9 · no sideways scroll ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · no page these touch scrolls sideways at 320 or 844 × 390')
    const PAGES = ['/projects', '/dashboard', `/projects/${BEN}/schedule`, `/projects/${BEN}/floor-plan`, `/projects/${BEN}/floor-plan/${PLAN}`, `/projects/${BEN}/tickets?open=${TICKET}`,
      `/projects/${BEN}/designs`, `/projects/${RYAN}/money`, '/company/reports/projects', '/company/templates', '/settings?section=leads']
    const PORTAL = ['', '/messages', '/issues', '/floor-plan'].map((s) => `/my/demo-studio${s}`)
    for (const [tag, o] of [['320', PHONE_320], ['844×390', SIDEWAYS]]) {
      const c = await ctxOf(o); await signIn(c); const p = await c.newPage(); watch(p, `sideways-${tag}`)
      const wide = []
      for (const u of [...PAGES, ...PORTAL]) { await go(p, u); const s = await sideways(p); if (s > 1) wide.push(`${u} +${s}`) }
      ok(wide.length === 0, `${tag}: every page holds the screen's width`, wide.join(' | '))
      await c.close()
    }

    // ── 10 · K-10 — a project's page on a phone held sideways ─────────────────────────────────────────────────────────────────────────
    console.log('10 · K-10 — a project’s page held sideways pins the tab strip alone')
    const pinned = (p) => p.evaluate(() => {
      const page = document.querySelector('[data-testid="project-page"]'), head = page.querySelector(':scope > header'), tabs = page.querySelector(':scope > [role="tablist"]'), aside = page.querySelector('aside[aria-label="Create"]')
      const r = (e) => (e ? e.getBoundingClientRect() : null)
      const h = r(head), t = r(tabs), a = r(aside)
      return { headBottom: h && Math.round(h.bottom), headTop: h && Math.round(h.top), tabsTop: t && Math.round(t.top), tabsBottom: t && Math.round(t.bottom), asideTop: a && a.width ? Math.round(a.top) : null, scrolled: Math.round(scrollY) }
    })
    for (const [tag, o] of [['844×390', SIDEWAYS], ['667×375', SIDEWAYS_SE]]) {
      const c = await ctxOf(o); const p = await c.newPage(); watch(p, `k10-${tag}`)
      await go(p, `/projects/${BEN}/schedule`, 1600)
      await p.evaluate(() => window.scrollTo(0, 400)); await settle(p, 600)
      const m = await pinned(p)
      const bar = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-mobile-bar-height')) || 0)
      ok(m.scrolled > 100 && m.headBottom <= 1, `${tag}: scrolled, the header has gone with the page`, JSON.stringify(m))
      ok(Math.abs(m.tabsTop - bar) <= 1, `${tag}: the tab strip alone stays pinned at the screen's top (${m.tabsTop})`, JSON.stringify(m))
      if (m.asideTop !== null) ok(Math.abs(m.asideTop - m.tabsBottom) <= 1, `${tag}: the Create strip docks under the tab strip (${m.asideTop})`, JSON.stringify(m))
      ok(await sideways(p) <= 1, `${tag}: no sideways scroll`)
      if (tag === '844×390') await shot(p, '10-project-sideways-844')
      await p.locator('[data-testid="project-page"] > [role="tablist"] [role="tab"]', { hasText: 'Money' }).tap()
      await p.waitForURL(/\/money/, { timeout: 15000 }).catch(() => {}); await settle(p, 1200)
      ok(/\/money/.test(p.url()), `${tag}: a tap on the pinned strip's Money goes there`)
      await c.close()
    }
    {
      const c = await ctxOf(DESK); const p = await c.newPage(); watch(p, 'k10-1440')
      await go(p, `/projects/${BEN}/schedule`, 1600)
      await p.evaluate(() => window.scrollTo(0, 400)); await settle(p, 600)
      const m = await pinned(p)
      ok(m.headTop === 8 && Math.abs(m.tabsTop - m.headBottom) <= 1, `1440: the desk keeps its sticky header (top ${m.headTop}) with the strip under it`, JSON.stringify(m))
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
