// The whole-app responsiveness audit, lane W6 — the closing lane: the five lanes' hand-offs, a load order that cannot flip the desk, and the
// sweep before → after (his "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your
// recommendations", 2026-10-23). Each fix asserted as the rule it keeps, by real taps (touch at ≤1024, a mouse at 1280 / 1440), never a count:
//  1 · the blockers: the definition list stacks its name over Required · Active at 320 and keeps three tracks at 390 (W4-17); Reports › Meetings'
//      coaching words keep their width at 320 (W4-15); the house Dropdown is a bottom sheet on a phone held sideways, every row on the screen
//      (W5-31); the Company popover fits a 390-tall screen and scrolls (W5-36); at a lead's / a project's end on a phone held sideways no
//      quick-link glyph is under the Maison AI button (W1 → W2 · W3)
//  2 · a phone held sideways: the hand-rolled overlays spend 8 above and below, as the house Dialog (W1's hand-off); the house Filters rail
//      scrolls (W2); the Tag picker's foot stays on the screen (W4-24)
//  3 · 44 under a finger, the drawn mark unchanged: Finance's and a project's Money names (W4-18), the Quotes / Contracts tablet tables' titles
//      and links (W5-37), the scope pill (W2 · W4-20 · W5-28), a project task's milestone (W3), the Visualizer's zoom figure (W3), a DS search
//      bar's input (W5-29), a DS Radio (W4-26), a render link's pin (W3), the library editors' name field (W4-29); the date picker's card on a
//      touch tablet: every press is its own to its drawn edge, the month switch 44 (W5-35)
//  4 · words that read: a member's name on a tablet whole or ellipsised, never broken (W3); a card head's meta inside its card at 1280 (W3);
//      the Costs table's bill link ends in an ellipsis at 768 (W3); a dialog foot's Cancel · Save stay together at 320 (W4)
//  5 · a notched phone held sideways (insets forced through CDP): the review banner, the quick add, the quote and contract screens' frames,
//      the template editor and the Visualizer's strip keep out of the sensor housing and off the home indicator (W1's hand-off)
//  6 · the house: no keyboard tip after taps on a touch screen, still one at a desk (W2 · W4-28); the ? panel's words carry no icon ligature
//      (W2); a sheet lifts the snackbar while it rises (W5-34); the reveal's ghost layer clips without scrolling (W5-32); the Quotes list's
//      ghost draws its to-do line and three-line cards at 390 (W5-33); a tall dialog on a tablet lifts the snackbar, a short one does not (W4-27)
//  7 · load order (W6's job 2): the overrides that flipped hold whatever order the build emits — the planner's three tabs, an activity card's
//      48 thumb, Commissions' tabular digits, a Money banner's 16 sides, W3-18's Money row words at 768
//  8 · the desk is the desk: at 1440 a mouse meets none of it; nothing scrolls sideways at 320 or 844 × 390 on a sample of every module
// Read-only: it opens menus, dialogs and pickers and never saves; it writes nothing to the DB. Run against `next start` on a scratch copy of
// the demo DB — never local.db. Usage: BASE=http://localhost:3206 NODE_PATH=<repo>/node_modules node verify-rwd-w6.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rwd-w6')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3206'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, what, more = '') => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}${more ? ` — ${more}` : ''}`) } }
const settle = (p, ms = 800) => p.waitForTimeout(ms)
const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1200) }
const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) }).catch(() => {})
const SIZES = { 320: [320, 640], 360: [360, 740], 390: [390, 844], 768: [768, 1024], 1024: [1024, 768], 844: [844, 390], 1280: [1280, 800], 1440: [1440, 1024] }
const ctxOf = (b, w, extra = {}) => { const [width, height] = SIZES[w]; const touch = w < 1280; return b.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce', ...extra }) }
const tap = async (p, loc) => { if (!loc) return false; const l = loc.first(); await l.scrollIntoViewIfNeeded(); if ((p.viewportSize()?.width ?? 1440) < 1280) await l.tap(); else await l.click(); await settle(p, 800); return true }
/* where a finger lands round a control: its centre ±21 up / down (or the four sides), own or not */
const reach = (loc, d = 21) => loc.evaluateAll((els, d) => {
  const e = els.find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden' })
  if (!e) return { none: true }
  e.scrollIntoView({ block: 'center' })
  const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const own = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) }
  return { up: own(cx, cy - d), down: own(cx, cy + d), left: own(cx - Math.min(d, r.width / 2 + 2), cy), right: own(cx + Math.min(d, r.width / 2 + 2), cy), h: Math.round(r.height), w: Math.round(r.width) }
}, d)
/* every element wearing exactly the class `cls` of the CSS module `mod` (`[class*="…__title"]` would also take `__titleData`) — marked */
const exact = async (p, mod, cls) => {
  await p.evaluate(([m, c]) => {
    document.querySelectorAll('[data-w6-exact]').forEach((e) => e.removeAttribute('data-w6-exact'))
    const re = new RegExp(`^${m}-module__[\\w-]{6}__${c}$`)
    for (const e of document.querySelectorAll(`[class*="${m}-module__"]`)) if ([...e.classList].some((x) => re.test(x))) e.setAttribute('data-w6-exact', '')
  }, [mod, cls])
  return p.locator('[data-w6-exact]')
}
/* the first VISIBLE element matching `sel` whose words or label match `re` — marked, so a locator can tap it */
const seen = async (p, sel, re) => {
  const found = await p.evaluate(([s, src, flags]) => {
    document.querySelectorAll('[data-w6-hit]').forEach((e) => e.removeAttribute('data-w6-hit'))
    const rx = src ? new RegExp(src, flags) : null
    const e = [...document.querySelectorAll(s)].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden' && (!rx || rx.test(`${x.getAttribute('aria-label') || ''} ${x.innerText || ''}`)) })
    if (e) e.setAttribute('data-w6-hit', '')
    return !!e
  }, [sel, re ? re.source : '', re ? re.flags : ''])
  return found ? p.locator('[data-w6-hit]').first() : null
}
const LEAD = sql(`select id from leads where name = 'Kevin Ng' and deleted_at is null limit 1`)
const PROJECT = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Benjamin Han' and p.deleted_at is null limit 1`)
const CONTRACT = sql(`select id from contracts where deleted_at is null and status = 'Draft' limit 1`)
const QUOTE = sql(`select id from quotes where deleted_at is null and kind = 'quote' and status = 'Approved' limit 1`) || sql(`select id from quotes where deleted_at is null and kind = 'quote' limit 1`)
const TASK_TPL = sql(`select id from task_templates where deleted_at is null order by name limit 1`)
const RENDER = sql(`select token from render_share_links where token is not null limit 1`)
const VIZ = sql(`select id from visualizer_designs where deleted_at is null and lead_id is not null limit 1`)
const LAYOUT = sql(`select id from space_layouts where deleted_at is null and coalesce(is_template, 0) = 0 limit 1`)

;(async () => {
  const errors = []
  const b = await chromium.launch()
  const page = async (w, url, extra) => { const c = await ctxOf(b, w, extra); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(`${w} ${url}: ${String(e).slice(0, 140)}`)); await go(p, url); return { c, p } }
  try {
    console.log('1 · the blockers')
    for (const w of [320, 390]) {
      const { c, p } = await page(w, '/company/questionnaire')
      const m = await p.evaluate(() => {
        const t = [...document.querySelectorAll('[role="table"]')].find((x) => [...x.querySelectorAll('[role="columnheader"]')].some((h) => /Required/i.test(h.innerText)))
        t.scrollIntoView({ block: 'start' })
        const hs = [...t.querySelectorAll('[role="columnheader"]')].slice(0, 3).map((h) => { const r = h.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(h); const tr = g.getBoundingClientRect(); return { l: r.left, t: r.top, textR: tr.right } })
        const name = t.querySelector('[role="row"]:not(:first-child) [class*="__name"]'); const nr = name.getBoundingClientRect()
        return { hs, name: { w: nr.width, h: nr.height } }
      })
      if (w === 320) {
        ok(m.hs[1].t > m.hs[0].t + 8, '320 · W4-17 the question bank head: Required · Active stand on their own line under QUESTION')
        ok(m.name.w >= 150 && m.name.h <= 24, `320 · W4-17 a question reads on one line (${Math.round(m.name.w)} × ${Math.round(m.name.h)})`)
      } else {
        ok(Math.abs(m.hs[1].t - m.hs[0].t) < 2 && m.hs[0].textR < m.hs[1].l, '390 · W4-17 the three tracks hold, as drawn (QUESTION · REQUIRED · ACTIVE on one line, apart)')
      }
      await shot(p, `1-question-bank-${w}`); await c.close()
    }
    for (const w of [320, 390]) {
      const { c, p } = await page(w, '/company/reports/meetings')
      const row = p.getByTestId('meeting-coaching-row').first()
      if (await row.count()) {
        const m = await row.evaluate((r) => { r.scrollIntoView({ block: 'center' }); const two = r.querySelector('[class*="__two"]'); return { two: two.getBoundingClientRect().width, h: r.getBoundingClientRect().height } })
        ok(m.two >= 150 && m.h < 160, `${w} · W4-15 a coaching row's words keep their width (${Math.round(m.two)} wide, the row ${Math.round(m.h)} tall)`)
        await shot(p, `1-coaching-${w}`)
      } else ok(false, `${w} · W4-15 a coaching row to measure`)
      await c.close()
    }
    {
      const { c, p } = await page(844, '/visualizer')
      await tap(p, await seen(p, 'button[aria-haspopup]', /\bNew\b/))
      const m = await p.evaluate(() => { const s = [...document.querySelectorAll('[role="menu"], [role="dialog"]')].find((e) => e.offsetParent || getComputedStyle(e).position === 'fixed'); if (!s) return null; const items = [...s.querySelectorAll('[role^="menuitem"]')].map((i) => i.getBoundingClientRect()); return { sheet: /sheet-module/.test(s.className), items: items.length, inside: items.every((r) => r.top >= 0 && r.bottom <= innerHeight + 0.5) } })
      ok(!!m && m.sheet && m.items > 0 && m.inside, `844 × 390 · W5-31 the Visualizer's New ▾ is a bottom sheet, every row on the screen`, JSON.stringify(m))
      await shot(p, '1-dropdown-sheet-844'); await c.close()
    }
    if (CONTRACT) {
      const { c, p } = await page(844, `/contracts/${CONTRACT}`)
      const opener = await seen(p, 'button[aria-haspopup]', /OM-\d+/)
      if (opener) {
        await tap(p, opener)
        const m = await p.evaluate(() => { const s = [...document.querySelectorAll('[role="menu"], [role="dialog"]')].find((e) => /sheet-module/.test(e.className)); if (!s) return null; const items = [...s.querySelectorAll('[role^="menuitem"]')]; return { n: items.length, inside: items.every((i) => i.getBoundingClientRect().bottom <= innerHeight + 0.5) } })
        ok(!!m && m.n > 0 && m.inside, '844 × 390 · W5-31 the Contract screen\'s quote row opens a sheet with "No quote" on the screen', JSON.stringify(m))
      } else ok(false, '844 × 390 · W5-31 the Contract screen\'s quote row to open')
      await c.close()
    }
    {
      const { c, p } = await page(844, '/dashboard')
      await tap(p, await seen(p, 'nav button', /^\s*Company/))
      const m = await p.evaluate(() => { const e = document.querySelector('[role="menu"][aria-label="Company"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, scrolls: e.scrollHeight > e.clientHeight && /(auto|scroll)/.test(getComputedStyle(e).overflowY) } })
      ok(!!m && m.top >= 0 && m.bottom <= 390 && m.scrolls, `844 × 390 · W5-36 the Company popover fits the screen and scrolls (${m && Math.round(m.top)}–${m && Math.round(m.bottom)})`)
      await p.locator('[role="menu"][aria-label="Company"] [role="menuitem"]').last().scrollIntoViewIfNeeded()
      const last = await p.locator('[role="menu"][aria-label="Company"] [role="menuitem"]').last().evaluate((e) => { const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h === e || e.contains(h) })
      ok(last, '844 × 390 · W5-36 its last row scrolls into reach and takes its own tap')
      await shot(p, '1-company-popover-844'); await c.close()
    }
    for (const url of [`/leads/${LEAD}`, `/projects/${PROJECT}`]) {
      const { c, p } = await page(844, url)
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(p, 900)
      const m = await p.evaluate(() => {
        const fab = [...document.querySelectorAll('button')].find((e) => /^Maison AI/.test(e.getAttribute('aria-label') || '') && e.getBoundingClientRect().width > 0)
        const aside = document.querySelector('[class*="quick-links-module__"][class*="__aside"]'); if (!fab || !aside) return null
        const f = fab.getBoundingClientRect()
        const list = aside.querySelector('[class*="__glyphs"]'); const lr = list.getBoundingClientRect()
        const under = [...aside.querySelectorAll('[class*="__glyph"]')].filter((g) => { const r = g.getBoundingClientRect(); const top = Math.max(r.top, lr.top), bottom = Math.min(r.bottom, lr.bottom); return bottom > top && r.right > f.left && r.left < f.right && bottom > f.top && top < f.bottom })
        return { under: under.map((g) => g.getAttribute('aria-label')), fabTop: f.top, listBottom: lr.bottom }
      })
      ok(!!m && m.under.length === 0, `844 × 390 · ${url.split('/')[1]} at its end: no quick-link glyph under the Maison AI button (the list ends ${m && Math.round(m.listBottom)}, the button at ${m && Math.round(m.fabTop)})`, JSON.stringify(m))
      await shot(p, `1-quick-links-${url.split('/')[1]}-844`); await c.close()
    }

    console.log('2 · a phone held sideways')
    {
      const { c, p } = await page(844, '/leads')
      /* (the calm UI build 2026-10-27, a deliberate change) B2 2-13 · 2-33: Add Lead ▾ › Create New Lead is New lead ▾ › Type in a lead (the form "New lead") */
      await tap(p, await seen(p, 'button', /New lead/))
      const create = await seen(p, '[role="menuitem"]', /Type in a lead/)
      if (create) await tap(p, create)
      const m = await p.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].find((e) => /lead-form-module/.test(e.className) || e.querySelector('[class*="lead-form-module"]')); const panel = d && (/__panel/.test(d.className) ? d : d.querySelector('[class*="__panel"]') || d); if (!panel) return null; const r = panel.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height } })
      /* (held calls 2026-10-24, a deliberate change of this rule) K-9: a phone held sideways is a phone — Create New Lead rises as the phone's bottom
         sheet there (on the screen's foot, its head on the screen), where W6 had spent 8 above and below a centred card */
      ok(!!m && m.top >= 0 && Math.abs(m.bottom - 390) <= 1, `844 × 390 · Create New Lead rises as the phone’s bottom sheet (${m && Math.round(m.top)}–${m && Math.round(m.bottom)})`, JSON.stringify(m))
      await shot(p, '2-lead-form-844'); await c.close()
    }
    {
      const { c, p } = await page(844, '/projects')
      await tap(p, await seen(p, 'main button', /Filters?/))
      const m = await p.evaluate(() => { const r = document.querySelector('[role="dialog"] [class*="__rail"]'); return r ? getComputedStyle(r).overflowY : null })
      ok(m === 'auto', `844 × 390 · the house Filters rail scrolls (Projects' Filters: overflow ${m})`)
      await c.close()
    }
    if (TASK_TPL) {
      const { c, p } = await page(844, `/templates/tasks/${TASK_TPL}`)
      const trigger = await seen(p, 'button', /^\s*Tags/)
      if (trigger) {
        await tap(p, trigger)
        const m = await p.evaluate(() => { const els = [...document.querySelectorAll('[class*="tag-picker-module__"]')].filter((e) => e.offsetParent); if (!els.length) return null; return { bottom: Math.max(...els.map((e) => e.getBoundingClientRect().bottom)), vh: innerHeight } })
        ok(!!m && m.bottom <= m.vh, `844 × 390 · W4-24 the Tags picker's foot stays on the screen (${m && Math.round(m.bottom)} of ${m && m.vh})`)
      } else ok(false, '844 × 390 · W4-24 the Tags trigger to open')
      await c.close()
    }

    console.log('3 · 44 under a finger, the drawn mark unchanged')
    for (const [w, url] of [[390, '/company/finance/money-out'], [768, '/company/finance/vendors'], [390, `/projects/${PROJECT}/money`]]) {
      const { c, p } = await page(w, url)
      /* (the calm UI build 2026-10-27, a deliberate change) B5 5-10 · T-15: on a phone Finance's Costs lists are cards (finance-cards.tsx) — a row's
         name is the card's name (the same record, the same press, its desk testid); the rule is read on it there */
      const n = /finance\/money-out/.test(url) && w < 768 ? await exact(p, 'finance-cards', 'name') : p.locator('[class*="money-module__"][class*="__nameLink"]')
      if (await n.count()) { const m = await reach(n); ok(m.up && m.down && m.h <= 48, `${w} · W4-18 ${url.split('/').pop()}: a row's name takes a press 21 above and below its 20 line`, JSON.stringify(m)) }
      else ok(false, `${w} · W4-18 a name link on ${url}`)
      await c.close()
    }
    for (const [url, mod, cls] of [['/quotes', 'quotes-table', 'clientLink'], ['/quotes', 'quotes-table', 'title'], ['/contracts', 'contracts-table', 'leadLink'], ['/contracts', 'contracts-table', 'title']]) {
      const { c, p } = await page(768, url)
      const m = await reach(await exact(p, mod, cls))
      ok(m.up && m.down, `768 · W5-37 ${url} ${cls}: 21 above and below are its own`, JSON.stringify(m))
      await c.close()
    }
    {
      const { c, p } = await page(390, '/tasks')
      const pill = p.locator('button[class*="scope-pill-module__"][class*="__pill"]').first()
      const m = await reach(pill)
      ok(m.up && m.down, `390 · the scope pill's overlay is 44 (21 above and below its 36) — W2 · W4-20 · W5-28`, JSON.stringify(m))
      await c.close()
    }
    {
      const { c, p } = await page(768, `/projects/${PROJECT}/tasks`)
      const ms = p.locator('[class*="tasks-table-module__"][class*="__milestoneBtn"]')
      if (await ms.count()) { const m = await reach(ms); ok(m.up && m.down && m.h <= 24, `768 · a project task's milestone takes a press 21 above and below its ${m.h} line (W3)`, JSON.stringify(m)) }
      else ok(false, '768 · a milestone button on a project task')
      await c.close()
    }
    if (VIZ) {
      const { c, p } = await page(768, `/visualizer/${VIZ}`)
      const z = p.locator('[class*="stage-module__"][class*="__zoomLabel"]')
      const h = await z.first().evaluate((e) => e.getBoundingClientRect().height).catch(() => 0)
      ok(h >= 44, `768 · the Visualizer's zoom figure stands ${Math.round(h)} under a finger (W3)`)
      await c.close()
    }
    {
      const { c, p } = await page(390, '/contracts')
      await tap(p, await seen(p, 'button', /New contract/i))
      const m = await p.evaluate(() => { const s = [...document.querySelectorAll('[class*="_searchBar_"][data-size="md"]')].find((e) => e.offsetParent); if (!s) return null; const r = s.getBoundingClientRect(); const i = s.querySelector('input'); const at = (y) => document.elementFromPoint(r.left + 40, y) === i; return { shell: r.height, up: at(r.top - 3), down: at(r.bottom + 3) } })
      ok(!!m && m.up && m.down, `390 · W5-29 New contract's search: 3 past the 36 shell above and below is the input (44)`, JSON.stringify(m))
      await c.close()
    }
    {
      const { c, p } = await page(768, '/company/finance/money-in')
      await tap(p, await seen(p, 'main button', /Export/))
      const r = p.locator('[role="dialog"] label:has(input[type="radio"])')
      if (await r.count()) { const m = await reach(r); ok(m.up && m.down, `768 · W4-26 a DS Radio row takes a press 21 above and below its 24 line`, JSON.stringify(m)) }
      else ok(false, '768 · W4-26 a radio in Export')
      await c.close()
    }
    if (RENDER) {
      const { c, p } = await page(390, `/renders/${RENDER}`)
      const pin = p.locator('[class*="render-share-page-module__"][class*="__pin"]')
      if (await pin.count()) { const s = await pin.first().evaluate((e) => { const a = getComputedStyle(e, '::before'); return { w: parseFloat(a.width), h: parseFloat(a.height) } }); ok(s.w >= 43.5 && s.h >= 43.5, `390 · a render link's pin takes a 44 press (${s.w} × ${s.h}) round its 26 (W3)`) }
      else console.log('  · no pin on the demo render link — skipped')
      await c.close()
    }
    if (TASK_TPL) {
      const { c, p } = await page(768, `/templates/tasks/${TASK_TPL}`)
      const h = await p.locator('input[class*="contract-editor-module__"][class*="__titleInput"]').first().evaluate((e) => e.getBoundingClientRect().height).catch(() => 0)
      ok(h >= 44, `768 · W4-29 the library editor's name field stands ${Math.round(h)} under a finger`)
      await c.close()
    }
    /* found by the closing sweep: a project's document links, a review's Read more, the Visualizer's Compare · mic · the client's notes badge */
    {
      const { c, p } = await page(768, `/projects/${PROJECT}`)
      const m = await reach(await exact(p, 'info-column', 'docLink'))
      ok(!m.none && m.up && m.down, `768 · a project's Signed quote link takes a press 21 above and below its ${m.h} line`, JSON.stringify(m))
      await c.close()
    }
    {
      const { c, p } = await page(768, '/qanvast-ops/reviews')
      const more = await exact(p, 'account', 'more')
      if (await more.count()) { const m = await reach(more); ok(m.up && m.down, `768 · a review's Read more takes a press 21 above and below its ${m.h} line`, JSON.stringify(m)) }
      else console.log('  · no Read more on the demo reviews — skipped')
      await c.close()
    }
    if (VIZ) {
      for (const [w, mod, cls] of [[1024, 'editor', 'compareBtn'], [1024, 'describe-box', 'mic'], [320, 'versions-strip', 'mark']]) {
        const { c, p } = await page(w, `/visualizer/${VIZ}`)
        const s = await (await exact(p, mod, cls)).evaluateAll((els) => els.filter((e) => e.tagName === 'BUTTON' && e.getBoundingClientRect().width > 0).slice(0, 1).map((e) => { const a = getComputedStyle(e, '::after'); return { w: parseFloat(a.width) || 0, h: parseFloat(a.height) || 0, drawn: Math.round(e.getBoundingClientRect().height) } }))
        if (s.length) ok(s[0].w >= 43.5 && s[0].h >= 43.5, `${w} · the Visualizer's ${cls} takes a 44 press round its drawn ${s[0].drawn} (${s[0].w} × ${s[0].h})`)
        else console.log(`  · no ${cls} on the demo design at ${w} — skipped`)
        await c.close()
      }
    }
    for (const w of [768, 1024]) {
      const { c, p } = await page(w, `/leads/${LEAD}/tasks`)
      await tap(p, await seen(p, '[class*="tasks-table-module__"][class*="__dueBtn"]'))
      const m = await p.evaluate(() => {
        const panel = document.querySelector('[class*="date-picker-module__"][class*="__panel"]'); if (!panel) return null
        const own = (e, x, y) => { const h = document.elementFromPoint(x, y); return h === e || e.contains(h) }
        const edges = [...panel.querySelectorAll('[class*="__pageBtn"], [class*="__day"]:not([data-muted]):not(:disabled)')].slice(0, 12).every((e) => { const r = e.getBoundingClientRect(), cy = r.top + r.height / 2; return own(e, r.left + 2, cy) && own(e, r.right - 2, cy) })
        const mb = panel.querySelector('[class*="__monthBtn"]').getBoundingClientRect().height
        return { edges, mb }
      })
      ok(!!m && m.edges, `${w} · W5-35 the date picker card: Today, ‹ ›, and each day are their own to their drawn edges (no neighbour's box over them)`)
      ok(!!m && m.mb >= 44, `${w} · W5-35 the month / year switch stands ${m && m.mb} under a finger`)
      await shot(p, `3-date-picker-${w}`); await c.close()
    }

    console.log('4 · words that read')
    for (const w of [768, 1024]) {
      const { c, p } = await page(w, `/projects/${PROJECT}`)
      const m = await p.evaluate(() => [...document.querySelectorAll('[class*="info-column-module__"][class*="__assigneeName"]')].map((e) => ({ h: e.getBoundingClientRect().height, fits: e.scrollWidth <= e.clientWidth || getComputedStyle(e).textOverflow === 'ellipsis' })))
      ok(m.length > 0 && m.every((x) => x.h <= 21 && x.fits), `${w} · a member's name keeps its line — whole or with an ellipsis, never broken (W3)`, JSON.stringify(m))
      await c.close()
    }
    {
      const { c, p } = await page(1280, `/projects/${PROJECT}`)
      const m = await p.evaluate(() => [...document.querySelectorAll('[class*="card-module__"][class*="__headText"]')].filter((e) => e.offsetParent).map((e) => ({ t: e.innerText.slice(0, 30), over: e.scrollWidth - e.clientWidth })))
      ok(m.length > 0 && m.every((x) => x.over <= 1), '1280 · W3 every card head\'s words stay inside its card (the Money card\'s "From the signed quote · n lines" wraps under its title)', JSON.stringify(m.filter((x) => x.over > 1)))
      await c.close()
    }
    {
      const { c, p } = await page(768, `/projects/${PROJECT}/money`)
      const bill = p.locator('[class*="money-module__"][class*="__sub"] [data-testid="bill-open"]')
      if (await bill.count()) { const m = await bill.first().evaluate((e) => { e.scrollIntoView({ block: 'center' }); const s = e.closest('[class*="__sub"]'); return { inside: e.getBoundingClientRect().right <= s.getBoundingClientRect().right + 0.5, ellipsis: getComputedStyle(e).textOverflow } }); ok(m.inside && m.ellipsis === 'ellipsis', '768 · W3 a PO\'s bill link ends in an ellipsis inside its cell', JSON.stringify(m)) }
      else ok(false, '768 · W3 a PO\'s bill link on the Money tab')
      await c.close()
    }
    {
      const { c, p } = await page(320, '/settings?section=notifications')
      await tap(p, p.getByTestId('wording-new_lead')); await p.waitForTimeout(500)   // (the calm UI build 2026-10-27, a deliberate change) B5 5-05: the event row's Edit wording first, then the message's Edit
      await tap(p, p.getByTestId('message-new_lead-whatsapp').getByRole('button', { name: 'Edit' }))
      const m = await p.evaluate(() => { const f = document.querySelector('[role="dialog"] [data-surface-foot]'); if (!f) return null; const bs = [...f.querySelectorAll('button')].filter((x) => /^(Cancel|Save)/.test(x.innerText.trim())).map((x) => x.getBoundingClientRect().top); return bs })
      ok(!!m && m.length === 2 && Math.abs(m[0] - m[1]) < 2, '320 · a dialog foot with a start action keeps Cancel · Save on one line (W4)', JSON.stringify(m))
      await shot(p, '4-message-foot-320'); await c.close()
    }

    console.log('5 · a notched phone held sideways (insets 47 · 0 · 47 · 21 forced through CDP)')
    {
      const c = await ctxOf(b, 844)
      const notched = async (url) => { const p = await c.newPage(); const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 47, bottom: 21, left: 47 } }); await go(p, url); return p }
      const unsafe = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => ({ l: Math.round(r.left), r: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom) })), sel)
      const safe = (rs) => rs.length > 0 && rs.every((x) => x.l >= 46 && x.r >= 46 && x.b >= 20)
      let p = await notched('/leads')
      /* (the calm UI build 2026-10-27, a deliberate change) B2 2-16: the docked "Review imported leads" bar is gone — the queue's way in is the scope
         pill's "Needs your attention › To review · n" row (`leads-review-open`), in the bottom sheet a phone held sideways takes; the same rule read
         there: the queue's door rests off the home indicator */
      await tap(p, await seen(p, 'button[aria-haspopup]', /All leads/))
      await p.locator('[data-testid="leads-review-open"]').first().scrollIntoViewIfNeeded().catch(() => {}); await settle(p, 300)
      let rs = await unsafe(p, '[data-testid="leads-review-open"]')
      ok(rs.length > 0 && rs.every((x) => x.b >= 20), `the review banner rests off the home indicator (${JSON.stringify(rs)})`)
      await p.close()
      p = await notched(`/leads/${LEAD}/tasks`)
      rs = await unsafe(p, '[class*="quick-add-module__"][class*="__input"]')
      ok(rs.length > 0 && rs.every((x) => x.b >= 20), `the quick add's field rests off the home indicator (${JSON.stringify(rs)})`)
      await p.close()
      p = await notched(`/quotes/${QUOTE}?edit=1`)
      rs = await unsafe(p, '[class*="section-list-module__"][class*="__row"]')
      const rows = await (await exact(p, 'section-list', 'rows')).evaluateAll((els) => els.map((e) => Math.round(innerHeight - e.getBoundingClientRect().bottom)))
      ok(rs.length > 0 && rs.every((x) => x.l >= 46) && rows.length > 0 && rows.every((b) => b >= 20), `the quote's section list keeps its rows out of the left housing and ends its scroll above the home indicator (rows from ${rs[0] && rs[0].l}, the list ends ${rows[0]} above the foot)`)
      await p.close()
      p = await notched(`/quotes/${QUOTE}?edit=items`)
      rs = await unsafe(p, '[class*="section-card-module__"][class*="__screen"] button[aria-label^="More options"]')
      ok(rs.length > 0 && rs.every((x) => x.r >= 46), `the Items screen's ⋮ keep out of the right housing (${JSON.stringify(rs.slice(0, 2))})`)
      await p.close()
      if (CONTRACT) {
        p = await notched(`/contracts/${CONTRACT}?edit=document`)
        rs = await unsafe(p, '[class*="section-screen-module__"][class*="__screen"] button')
        ok(rs.length > 0 && rs.every((x) => x.l >= 46 && x.r >= 46), `the contract's Document screen keeps ← · Done · its tools inside the safe area`, JSON.stringify(rs.filter((x) => x.l < 46 || x.r < 46).slice(0, 3)))
        await p.close()
      }
      p = await notched('/company/templates/quotes')
      const tpl = await p.evaluate(() => [...document.querySelectorAll('a[href^="/templates/"]')].map((a) => a.getAttribute('href')).find((h) => /^\/templates\/[0-9a-f-]{36}/.test(h)))
      await p.close()
      if (tpl) {
        p = await notched(tpl)
        rs = await unsafe(p, '[class*="template-editor-module__"][class*="__editor"] button')
        ok(rs.length > 0 && rs.every((x) => x.l >= 46 && x.r >= 46), 'the quote template editor keeps Back and its bar inside the safe area', JSON.stringify(rs.filter((x) => x.l < 46 || x.r < 46).slice(0, 3)))
        await p.close()
      }
      if (VIZ) {
        p = await notched(`/visualizer/${VIZ}`)
        rs = await unsafe(p, '[class*="versions-strip-module__"] button')
        ok(rs.length > 0 && rs.every((x) => x.b >= 20), `the Visualizer's versions strip rests off the home indicator (${JSON.stringify(rs.slice(0, 2))})`)
        await shot(p, '5-visualizer-notch'); await p.close()
      }
      p = await notched('/leads?view=kanban')
      const extra = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      ok(extra <= 0, `the kanban is bound to the screen less the indicator — no page scroll (${extra})`)
      await p.close()
      await c.close()
    }

    console.log('6 · the house')
    {
      const { c, p } = await page(390, '/leads')
      for (let i = 0; i < 4; i++) { const create = await seen(p, '[data-kb="create"]'); if (create) await create.tap().catch(() => {}); await settle(p, 500); await p.keyboard.press('Escape').catch(() => {}); await settle(p, 400) }
      const tip = await p.locator('text=/Next time, press/').count()
      ok(tip === 0, `390 · no keyboard tip after taps on a touch screen (W2 · W4-28)`)
      await c.close()
    }
    {
      const { c, p } = await page(1440, '/leads')
      for (let i = 0; i < 4; i++) { const create = await seen(p, '[data-kb="create"]'); if (create) await create.click().catch(() => {}); await settle(p, 500); await p.keyboard.press('Escape'); await settle(p, 400) }
      const tip = await p.locator('text=/Next time, press/').count()
      ok(tip > 0, '1440 · a mouse still earns its keyboard tip (the desk unchanged)')
      await p.keyboard.press('Shift+Slash'); await settle(p, 900)
      const words = await p.evaluate(() => (document.querySelector('[data-kb-panel]') || document.body).innerText)
      ok(!/keyboard_arrow|(^|\s)add[A-Z]/.test(words), 'the ? panel\'s rows read without an icon\'s ligature (W2)')
      await c.close()
    }
    {
      const { c, p } = await page(390, `/leads/${LEAD}`)
      await tap(p, await seen(p, 'button', /^More options/))
      await p.waitForTimeout(150)
      const early = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sheet-foot'))
      ok(parseFloat(early) > 0, `390 · W5-34 a sheet lifts the snackbar while it rises (--sheet-foot ${early.trim() || 'unset'} 150ms in)`)
      await c.close()
    }
    {
      const c = await ctxOf(b, 390)
      await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const p = await c.newPage(); await go(p, '/quotes'); await settle(p, 600)
      const m = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((x) => /__reveal$/.test(x)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((x) => /__ghost$/.test(x)))
        if (!ghost) return null
        const content = reveal.querySelector(':scope > [data-ready]')
        const gCard = ghost.querySelector('[class*="ghost-kit-module__"][class*="__pCard"]'), pCard = content.querySelector('[data-testid="quote-row"], [class*="quotes-table-module__"][class*="__row"]')
        return { clip: getComputedStyle(ghost).overflowX, todo: !!ghost.querySelector('[class*="quotes-toolbar-module__"][class*="__todos"]'), lines: gCard ? gCard.children.length : 0, dy: gCard && pCard ? Math.round(gCard.getBoundingClientRect().top - pCard.getBoundingClientRect().top) : null }
      })
      ok(!!m && m.clip === 'clip', `W5-32 the reveal's ghost layer clips without scrolling (overflow ${m && m.clip})`)
      ok(!!m && m.todo && m.lines === 3, `390 · W5-33 the Quotes list's ghost draws its to-do line and three-line cards (to-do ${m && m.todo}, ${m && m.lines} lines)`)
      ok(!!m && m.dy !== null && Math.abs(m.dy) <= 4, `390 · W5-33 its first card stands where the page's does (${m && m.dy}px)`)
      await shot(p, '6-quotes-ghost-390'); await c.close()
    }
    {
      /* the loader as it streams, before any script (REG-708's A): the server's seed draws the same to-do line the reveal does */
      const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, javaScriptEnabled: false })
      const p = await c.newPage(); await p.goto(BASE + '/quotes', { waitUntil: 'domcontentloaded' }); await settle(p, 600)
      /* only what shows: the page's own content streams in a hidden block until a script swaps it */
      const todo = await p.evaluate(() => [...document.querySelectorAll('[class*="quotes-toolbar-module__"][class*="__todos"]')].some((e) => e.getBoundingClientRect().height > 0 && !e.closest('[hidden]')))
      ok(todo, '390 · W5-33 the Quotes loader, streamed before its script, draws the to-do line from the server\'s seed')
      await c.close()
    }

    console.log('7 · load order: the overrides that flipped hold whatever order the build emits')
    if (LAYOUT) {
      const { c, p } = await page(1440, `/planner/${LAYOUT}`)
      const cols = await p.evaluate(() => { const t = document.querySelector('[role="tablist"][aria-label="Edit"]'); return t ? getComputedStyle(t).gridTemplateColumns.split(' ').length : 0 })
      ok(cols === 3, `1440 · the planner's rail draws its three tabs as three columns (${cols})`)
      await c.close()
    }
    {
      const { c, p } = await page(1440, `/projects/${PROJECT}/activity`)
      const w = await p.evaluate(() => { const e = document.querySelector('[class*="lead-activity-module__"][class*="__cardThumb"]'); return e ? e.getBoundingClientRect().width : null })
      ok(w === null || w === 48, `1440 · an activity card's picture is its 48 (${w})`)
      await c.close()
    }
    {
      const { c, p } = await page(1440, '/company/finance/commissions')
      const v = await p.evaluate(() => [...document.querySelectorAll('[class*="books-module__"][class*="__strong"][class*="books-module__"][class*="__num"], [class*="books-module__"][class*="__num"][class*="books-module__"][class*="__strong"]')].map((e) => getComputedStyle(e).fontVariantNumeric))
      ok(v.length > 0 && v.every((x) => /tabular-nums/.test(x)), `1440 · Commissions' totals keep their tabular digits (${v.length})`)
      await c.close()
    }
    {
      const { c, p } = await page(1440, `/projects/${PROJECT}/money`)
      const v = await (await exact(p, 'money', 'banner')).evaluateAll((els) => els.map((e) => getComputedStyle(e).paddingLeft))
      ok(v.length === 0 || v.every((x) => x === '16px'), `1440 · a Money banner keeps its 16 sides (${v.join(' · ') || 'none on the tab'})`)
      await c.close()
    }

    {
      /* this round's own override, which lost on one build: W3-18's Money row words keep a reading width at an upright tablet */
      const RYAN = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name like 'Ryan%' and p.deleted_at is null limit 1`)
      const { c, p } = await page(768, `/projects/${RYAN}/money`)
      /* (the calm UI build 2026-10-27, a deliberate change) B3 3-05 · 3-07: Money's rows are the Overview's house Row (two lines: the title, its
         caption) — the words are the row's two-line block; the rule (a reading width at an upright tablet, whatever the CSS order) read on it */
      const words = await p.evaluate(() => [...document.querySelectorAll('[data-testid="money-needs"] [data-need]')].map((e) => { const t = e.querySelector('[class*="project-overview-module__"][class*="__two"]'); return t ? Math.round(t.getBoundingClientRect().width) : 0 }))
      ok(words.length > 0 && words.every((w) => w >= 240), `768 · a Money Needs-you row's words hold their 260 basis whatever the order (W3-18) ${JSON.stringify(words)}`)
      await c.close()
    }

    console.log('8 · the desk is the desk')
    {
      const { c, p } = await page(1440, '/dashboard')
      await tap(p, await seen(p, 'nav button', /^\s*Company/))
      const m = await p.evaluate(() => { const e = document.querySelector('[role="menu"][aria-label="Company"]'); return e && { mh: getComputedStyle(e).maxHeight, ov: getComputedStyle(e).overflowY } })
      ok(!!m && m.mh === 'none' && m.ov === 'visible', `1440 · the Company popover is as drawn (max-height ${m && m.mh}, overflow ${m && m.ov})`)
      await c.close()
    }
    {
      const { c, p } = await page(1440, `/leads/${LEAD}`)
      const pb = await p.evaluate(() => { const a = document.querySelector('[class*="quick-links-module__"][class*="__aside"]'); return a && getComputedStyle(a).paddingBottom })
      ok(pb === '24px', `1440 · the quick-links strip keeps its 24 foot (${pb})`)
      const pill = await p.evaluate(() => { const e = document.querySelector('button[class*="scope-pill-module__"]'); return e ? getComputedStyle(e, '::after').content : 'none' })
      ok(pill === 'none' || pill === 'normal', '1440 · a mouse meets no touch overlay on the scope pill')
      await c.close()
    }
    {
      const { c, p } = await page(1440, '/settings?section=leads')
      const v = await p.evaluate(() => { const t = [...document.querySelectorAll('[role="table"]')].find((x) => [...x.querySelectorAll('[role="columnheader"]')].some((h) => /Required/i.test(h.innerText))); if (!t) return null; const hs = [...t.querySelectorAll('[role="columnheader"]')].slice(0, 3).map((h) => h.getBoundingClientRect().top); return hs })
      ok(!v || (Math.abs(v[0] - v[1]) < 1 && Math.abs(v[1] - v[2]) < 1), '1440 · the definition list keeps its one head line')
      await c.close()
    }
    for (const w of [320, 844]) {
      const c = await ctxOf(b, w); const p = await c.newPage()
      const wide = []
      for (const url of ['/dashboard', '/leads', `/leads/${LEAD}`, '/tasks', `/projects/${PROJECT}`, `/projects/${PROJECT}/money`, '/quotes', `/quotes/${QUOTE}`, '/contracts', '/company/questionnaire', '/company/reports/meetings', '/company/finance/money-out', '/settings?section=notifications', '/visualizer', '/my/demo-studio']) {
        await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await settle(p, 600)
        const s = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (s > 0) wide.push(`${url} +${s}`)
      }
      ok(wide.length === 0, `${w} · nothing scrolls sideways on a sample of every module (15 pages)`, wide.join(' · '))
      await c.close()
    }
  } catch (e) { fail++; console.log('  ✗ the probe stopped: ' + String(e).slice(0, 300)) }
  await b.close()
  if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 6).join('\n  '))
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
