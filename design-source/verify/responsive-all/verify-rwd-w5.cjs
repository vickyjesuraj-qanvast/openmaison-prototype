// The whole-app responsiveness audit, lane W5 — the tools: Quotes, Contracts, the client's signing / confirm / view links, Quote X-Ray, the AI
// Visualizer, the 3D Space Planner, the Marketplace and Market Insights (his "run a overall responsiveness audit and fix all the issues across
// devices and breakpoints based on your recommendations", 2026-10-23; the record design-source/context/responsive/whole-app-audit-2026-10-23/
// audit-w5.md · outcome-w5.md). Each fix asserted as the rule it builds, by a real tap (touch) or click (mouse) on the production build:
//  - W5-01 /confirm/<token> on a phone: no sideways scroll at 320 · 360 · 390 · 430; the open bar's two presses share a line while they fit and
//    put the primary on its own line above Ask when they don't — every button inside the screen; a tap on the primary opens the sheet with
//    its foot on screen. 768 upright keeps the two side by side.
//  - W5-02 Tools › Quotes and Tools › Contracts on a phone: at the page's end the last card clears the dock, and its ⋮ is the ⋮ (not the FAB).
//  - W5-03 · W5-04 the Items screen: a phone held sideways (844×390) does not pin the foot (the lines get the screen) and its Add item is
//    pressable at the section's end; wherever the foot pins (1024×768) it is above the table's sideways bar.
//  - W5-06 the phone's Items screen (390 · 320): the Maison AI button rests clear of the foot — a tap at Add item's right end is Add item;
//    while lines are ticked the button steps out.
//  - W5-05 · W5-11 the Visualizer: a marker under a finger is a 44 target (a press 21px off its centre is that marker); a mouse keeps 1.0's
//    36; on a short phone (320×640, the stage's `low` fit) the Maison AI button steps out of the photo's corner, and at 390×844 it is there.
//  - W5-07 · W5-08 the X-Ray reading: on a touch tablet (768 · 1024) the row's ⋮ is a frozen trail cell — it never lies over the Theirs
//    figure or the Status chip, and a tap opens its menu; on a phone the card has no stray rule across it and its ⋮ is a bare glyph.
//  - W5-09 · W5-10 the client's two small links (← Agreement on /sign/<token>/quote, a file on /confirm) take a 44 target under a finger.
//  - W5-12 the Preview's Send ▾ at 1280 and 1440 (a mouse): the menu opens inside the screen, no sideways scroll.
//  - the floor: no sideways scroll at 320 and at 844×390 on every W5 route; no page errors.
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3205 NODE_PATH=<repo>/node_modules node verify-rwd-w5.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rwd-w5')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3205'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify')) ? process.cwd() : path.resolve(__dirname, '..', '..', '..'))
void REPO
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rwd-w5-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra !== undefined ? `— ${extra}` : '') } }

const QUOTE = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'       // Olivia Martinez's Draft OM-10001
const DRAFT = '81463786-769d-42aa-b226-192081cfd6e6'       // her Draft agreement (its body is copied for the sent one)
const XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143', VIZ = 'b46000d1-1638-4c7c-af20-bebbcc3b9744', LAYOUT = '4a0a2cd8-1a5b-4a8e-ab2d-27fcfac3556d'
const SENT = 'rwdw5sent000000000001'

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }   // the app's own lazy writes first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
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
  /* the staging: the client's links read from the records — a variation order out for approval and a quote out for confirmation (the
     demo's own), a signed quote with a file for the client, and an agreement out for signature on a sent quote (a copy of the Draft's body) */
  const VO = sql(`select id from quotes where kind = 'variation' and status = 'Sent to Client' and deleted_at is null and archived_at is null order by created_at limit 1`)
  const SENTQ = json(`select id, lead_id from quotes where kind = 'quote' and status = 'Sent to Client' and deleted_at is null and archived_at is null order by created_at limit 1`)[0]
  const SIGNEDQ = sql(`select q.id from quotes q where q.kind = 'quote' and q.status = 'Signed' and exists (select 1 from quote_files f where f.quote_id = q.id) order by q.created_at limit 1`)
  const lead = SENTQ ? json(`select name, phone from leads where id = '${SENTQ.lead_id}'`)[0] : null
  if (SENTQ) sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token, sign_expires_at, from_quote_id, issuing_entity) select 'rwd-w5-sent', '${SENTQ.lead_id}', title, 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, ${lit(lead?.name ?? 'Client')}, ${lit(lead?.phone ?? '91234567')}, 'composed', created_by, 0, 0, '${SENT}', strftime('%s','now') + 7*86400, '${SENTQ.id}', issuing_entity from contracts where id = '${DRAFT}'`)

  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const deskCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  /* does a press at (x, y) land inside the element `loc` points at? */
  const lands = (p, loc, x, y) => loc.evaluate((el, [x, y]) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)) }, [x, y])
  const toEnd = (p) => p.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); for (const el of document.querySelectorAll('*')) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight } })

  try {
    // ── 1 · W5-01 the client's confirm page on a phone ──────────────────────────────────────────────────────────────────────────────
    console.log('1 · /confirm/<token> on a phone: the bar inside the screen at every phone width (W5-01)')
    ok(!!VO && !!SENTQ, 'the demo holds a variation order and a quote out with the client', `${VO} · ${SENTQ?.id}`)
    for (const [w, h] of [[320, 640], [360, 740], [390, 844], [430, 932]]) {
      const C = await touchCtx(w, h); const p = await page(C, `confirm-${w}`)
      await go(p, `/confirm/${VO}`)
      ok((await sideways(p)) === 0, `${w}: the variation order's page never scrolls sideways (${await sideways(p)})`)
      const btns = p.getByTestId('confirm-bar').locator('button')
      const n = await btns.count()
      const boxes = []; for (let i = 0; i < n; i++) boxes.push(await box(btns.nth(i)))
      ok(n === 2 && boxes.every((r) => r.x >= 0 && r.right <= w + 0.5), `${w}: Ask for a change and Approve the changes both inside the screen`, JSON.stringify(boxes.map((r) => [Math.round(r.x), Math.round(r.right)])))
      const prim = await box(p.getByTestId('confirm-bar-primary')), ask = await box(p.getByTestId('ask-change-bar'))
      ok(prim.y < ask.y - 1 && Math.abs(prim.w - ask.w) < 2, `${w}: the long label puts the primary on its own line above Ask, each full width`, `${Math.round(prim.y)} / ${Math.round(ask.y)} · ${Math.round(prim.w)} / ${Math.round(ask.w)}`)
      ok(prim.h >= 48 && ask.h >= 48, `${w}: both 48 tall (${Math.round(prim.h)} · ${Math.round(ask.h)})`)
      if (w === 390) {
        await shot(p, '01-confirm-vo-390')
        await p.touchscreen.tap(prim.cx, prim.cy); await settle(p, 900)
        const sheetBtn = p.getByTestId('confirm-sheet-confirm')
        const sb = await box(sheetBtn)
        ok(await sheetBtn.isVisible() && sb.bottom <= h + 0.5 && sb.right <= w + 0.5, `390: the Approve sheet's own Approve the changes is on screen (bottom ${Math.round(sb.bottom)})`)
        await shot(p, '02-confirm-vo-sheet-390')
      }
      /* a quote's shorter pair still shares one line at 390 and up (unchanged) */
      if (w >= 390) {
        await go(p, `/confirm/${SENTQ.id}`)
        const a = await box(p.getByTestId('ask-change-bar')), c = await box(p.getByTestId('confirm-bar-primary'))
        ok(Math.abs(a.y - c.y) < 1 && c.x > a.right && c.right <= w + 0.5, `${w}: a quote's Ask for a change · Confirm quote stay side by side, the primary at the right`)
      }
      await C.close()
    }
    {
      const C = await touchCtx(768, 1024); const p = await page(C, 'confirm-768')
      await go(p, `/confirm/${VO}`)
      const a = await box(p.getByTestId('ask-change-bar')), c = await box(p.getByTestId('confirm-bar-primary'))
      ok(Math.abs(a.y - c.y) < 1 && c.x > a.right, '768 upright: the variation order\'s two presses share one line, as before')
      await C.close()
    }

    // ── 2 · W5-02 the lists' last card on a phone ──────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Tools › Quotes and Contracts at 390: the last card clears the dock and the FAB (W5-02)')
    {
      const C = await touchCtx(390, 844); const p = await page(C, 'lists')
      for (const [route, sel] of [['/quotes', '[data-testid="quote-card-name"]'], ['/contracts', '[class*="contracts-table-module__"][class*="__cardName"]']]) {
        await go(p, route)
        await toEnd(p); await settle(p, 1200)
        const names = p.locator(sel)
        const last = names.last()
        const card = last.locator('xpath=ancestor::*[@role="row"][1]')
        const cb = await box(card)
        const dock = await box(p.locator('[class*="mobile-nav-module__"][class*="__dock"]').first())
        ok(cb.bottom <= dock.y + 0.5, `${route}: at the page's end the last card ends above the dock (${Math.round(cb.bottom)} ≤ ${Math.round(dock.y)})`)
        const kb = card.locator('button[aria-label^="More actions"]')
        const kr = await box(kb)
        ok(await lands(p, kb, kr.cx, kr.cy), `${route}: its ⋮ takes its own tap (never the Maison AI button's)`)
        await shot(p, `03-list-end${route.replace('/', '-')}-390`)
      }
      await C.close()
    }

    // ── 3 · W5-03 · W5-04 · W5-06 the Items screen ─────────────────────────────────────────────────────────────────────────────────
    console.log('3 · the Items screen — the foot on a short screen, over the sideways bar, and clear of the FAB (W5-03 · W5-04 · W5-06)')
    {
      const C = await touchCtx(844, 390); const p = await page(C, 'items-844')
      await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
      const foot = p.getByTestId('items-touch-foot')
      ok(await foot.evaluate((el) => getComputedStyle(el).position) === 'static', '844×390: the foot does not pin (a phone held sideways)')
      const rows = await p.locator('[data-testid="items-touch-foot"]').evaluate((el) => { const body = el.parentElement; const top = body.getBoundingClientRect().top; return [...body.querySelectorAll('[role="row"]')].filter((r) => { const q = r.getBoundingClientRect(); return q.top >= top - 1 && q.bottom <= innerHeight && q.height > 20 }).length })
      ok(rows >= 2, `844×390: the lines get the screen — ${rows} rows in view at the top`)
      await shot(p, '04-items-844-top')
      await toEnd(p); await settle(p, 800)
      const add = p.getByTestId('touch-add-item'), ab = await box(add)
      ok(ab.bottom <= 390 + 0.5 && await lands(p, add, ab.cx, ab.cy) && await lands(p, add, ab.cx, ab.bottom - 4), '844×390: at the section\'s end Add item is on screen and takes its own tap, its bottom edge too')
      await shot(p, '05-items-844-end')
      /* W5-15 the touch grid's narrow Item cell: a section's name has the cell's room (the SECTION tag steps aside, as the count did) */
      await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
      const sec = await p.evaluate(() => { const row = document.querySelector('[class*="items-table-module__"][class*="__row"][data-group]'); const name = row?.querySelector('input[aria-label="Section name"]'); const tag = row?.querySelector('[class*="__groupTag"]'); return { name: name ? Math.round(name.getBoundingClientRect().width) : 0, value: name ? name.value : '', tag: tag ? getComputedStyle(tag).display : 'none' } })
      ok(sec.tag === 'none' && sec.name >= 60, `844×390: a section's name has its room in the narrow Item cell (${sec.name} wide for "${sec.value}"; the SECTION tag ${sec.tag})`)
      await C.close()
    }
    {
      const C = await touchCtx(1024, 768); const p = await page(C, 'items-1024')
      await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
      const foot = p.getByTestId('items-touch-foot')
      ok(await foot.evaluate((el) => getComputedStyle(el).position) === 'sticky', '1024×768: the foot pins as before')
      const z = await foot.evaluate((el) => +getComputedStyle(el).zIndex)
      ok(z > 10, `the pinned foot rides above the table's sideways bar (z ${z} over its 10)`)
      const add = p.getByTestId('touch-add-item'), ab = await box(add)
      ok(await lands(p, add, ab.cx, ab.bottom - 4), '1024: Add item\'s lower edge is Add item\'s')
      await C.close()
    }
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const C = await touchCtx(w, h); const p = await page(C, `items-${w}`)
      await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
      const foot = await box(p.getByTestId('items-touch-foot'))
      const fab = p.locator('button[aria-label="Maison AI"]')
      ok(await fab.isVisible(), `${w}: the phone keeps its Maison AI button on the Items screen (REG-2602)`)
      const fb = await box(fab)
      ok(fb.bottom <= foot.y + 0.5, `${w}: it rests above the foot (${Math.round(fb.bottom)} ≤ ${Math.round(foot.y)})`)
      const add = p.getByTestId('touch-add-item'), ab = await box(add)
      ok(await lands(p, add, ab.right - 12, ab.cy), `${w}: a tap at Add item's right end is Add item's`)
      await shot(p, `06-items-${w}`)
      /* at the section's end the last line's ⋮ scrolls clear of the button */
      await toEnd(p); await settle(p, 800)
      const lastKebab = p.locator('[data-testid="item-card"] button[aria-label^="More options"]').last()
      const lk = await box(lastKebab)
      ok(await lands(p, lastKebab, lk.cx, lk.cy), `${w}: at the section's end the last line's ⋮ takes its own tap`)
      await shot(p, `06-items-${w}-end`)
      if (w === 390) {
        await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
        await p.touchscreen.tap(ab.right - 12, ab.cy); await settle(p, 900)
        ok(await p.locator('[role="dialog"]').filter({ has: p.getByTestId('line-sheet') }).count() > 0, '390: that tap opens the new line\'s sheet')
        await p.keyboard.press('Escape'); await settle(p, 500)
        await go(p, `/quotes/${QUOTE}?edit=items`, 1800)
        const check = p.locator('[data-testid="item-card"] [role="checkbox"], [data-testid="item-card"] input[type="checkbox"]').first()
        const cr = await box(check)
        await p.touchscreen.tap(cr.cx, cr.cy); await settle(p, 900)
        ok(await p.evaluate(() => document.body.hasAttribute('data-om-bulk-bar')), '390: ticking a line raises the bulk bar')
        ok(await fab.count() === 0, '390: while lines are ticked the Maison AI button steps out (the bar and the lifted totals own the bottom)')
        await shot(p, '07-items-390-ticked')
      }
      await C.close()
    }

    // ── 4 · W5-05 · W5-11 the Visualizer ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · the Visualizer — markers under a finger, and the Maison AI button on a short phone (W5-05 · W5-11)')
    {
      const C = await touchCtx(390, 844); const p = await page(C, 'viz-390')
      await go(p, `/visualizer/${VIZ}`, 2200)
      const dots = p.locator('[data-testid="viz-frame"] button[class*="__dot"]')
      const n = await dots.count()
      /* each marker's own centre is its own (a neighbour's grown box never lies over it); one with room around it takes a press 21px off */
      let own = 0, roomy = 0, reached = 0
      const frame = await box(p.getByTestId('viz-frame'))
      for (let i = 0; i < n; i++) {
        const d = dots.nth(i), r = await box(d)
        if (await lands(p, d, r.cx, r.cy)) own++
        const size = await d.evaluate((el) => parseFloat(getComputedStyle(el, '::before').width))
        /* a press past the photo's own edge is not a press on the photo: only the points inside the frame count */
        const pts = [[r.cx, r.cy - 21], [r.cx, r.cy + 21], [r.cx - 21, r.cy], [r.cx + 21, r.cy]].filter(([x, y]) => x > frame.x && x < frame.right && y > frame.y && y < frame.bottom)
        if (size >= 44) { roomy++; let all = true; for (const [x, y] of pts) if (!(await lands(p, d, x, y))) all = false; if (all) reached++ }
      }
      ok(n > 0 && own === n, `390: every marker's own centre takes its own tap (${own} of ${n})`)
      ok(roomy > 0 && reached === roomy, `390: a marker with room round it is a 44 target — a press 21px off its centre on every side lands (${reached} of ${roomy}; ${n - roomy} crowded keep at least 32)`)
      ok(await p.locator('button[aria-label="Maison AI"]').isVisible(), '390×844: the Maison AI button rides the stage\'s corner (the stage has its chip row)')
      const r0 = await box(dots.first())
      await p.touchscreen.tap(r0.cx + 18, r0.cy); await settle(p, 900)
      ok(await dots.first().evaluate((el) => el.hasAttribute('data-selected')) || await p.locator('[data-testid="viz-editor"][data-tray]').count() > 0, '390: a tap 18px off a marker picks that marker')
      await shot(p, '08-viz-390')
      await C.close()
    }
    {
      const C = await touchCtx(320, 640); const p = await page(C, 'viz-320')
      await go(p, `/visualizer/${VIZ}`, 2200)
      const fit = await p.locator('[data-fit]').first().getAttribute('data-fit')
      const fab = p.locator('button[aria-label="Maison AI"]')
      if (fit === 'low' || fit === 'over') ok(!(await fab.isVisible()), `320×640 (${fit}): the Maison AI button steps out of the photo's corner`)
      else ok(true, `320×640 fits ${fit}: the button keeps its seat`)
      const covered = await p.evaluate(() => [...document.querySelectorAll('[data-testid="viz-frame"] button[class*="__dot"]')].filter((d) => { const r = d.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && h !== d && !d.contains(h) }).map((d) => d.getAttribute('aria-label')))
      ok(covered.length === 0, '320×640: no marker lies under another control', covered.join(', '))
      await shot(p, '09-viz-320')
      await C.close()
    }
    {
      const C = await deskCtx(1440, 1024); const p = await page(C, 'viz-1440')
      await go(p, `/visualizer/${VIZ}`, 2200)
      const before = await p.locator('[data-testid="viz-frame"] button[class*="__dot"]').first().evaluate((el) => getComputedStyle(el, '::before').width)
      ok(before === '32px', `1440 (a mouse): the marker keeps the hit area it had (${before})`)
      await C.close()
    }

    // ── 5 · W5-07 · W5-08 the X-Ray reading ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · the X-Ray reading — the ⋮ on a touch tablet and on a phone card (W5-07 · W5-08)')
    for (const [w, h] of [[768, 1024], [1024, 768]]) {
      const C = await touchCtx(w, h); const p = await page(C, `xray-${w}`)
      await go(p, `/quote-x-ray/${XRAY}`, 1800)
      const rows = p.getByTestId('xray-row')
      const n = await rows.count()
      /* the ⋮ is a frozen cell with the surface behind it (the columns pass under it, as under the frozen Item column), never a glyph over a figure */
      const cell = await rows.first().locator('[class*="xray-table-module__"][class$="__actions"], [class*="xray-table-module__"][class*="__actions "]').first().evaluate((el) => { const cs = getComputedStyle(el); return { pos: cs.position, bg: cs.backgroundColor, w: el.getBoundingClientRect().width } })
      ok(cell.pos === 'sticky' && !/rgba\(0, 0, 0, 0\)|transparent/.test(cell.bg) && cell.w >= 44, `${w}: the ⋮ is a frozen trail cell on the surface (${cell.pos} · ${cell.bg} · ${Math.round(cell.w)} wide)`)
      ok(await p.locator('[data-cols="xray-items"] [role="row"]').first().evaluate((el) => getComputedStyle(el, '::after').position) === 'sticky', `${w}: the head draws its frozen cell over the trail`)
      /* scrolled to its end, every Status chip stands clear left of its row's ⋮ */
      await p.locator('[data-cols="xray-items"]').evaluate((el) => { el.scrollLeft = el.scrollWidth })
      await settle(p, 400)
      let clear = 0
      for (let i = 0; i < n; i++) {
        const r = rows.nth(i)
        const k = await box(r.locator('button[aria-haspopup="menu"]'))
        const chip = await box(r.locator('[data-col="status"] > *').first())
        if (chip.right <= k.x + 0.5) clear++
      }
      ok(n > 0 && clear === n, `${w}: at the table's end no ⋮ touches its Status chip (${clear} of ${n})`)
      await p.locator('[data-cols="xray-items"]').evaluate((el) => { el.scrollLeft = 0 })
      await settle(p, 300)
      const kb = p.getByTestId('xray-row').nth(1).locator('button[aria-haspopup="menu"]')
      await kb.scrollIntoViewIfNeeded(); await settle(p, 400)
      const kr = await box(kb)
      await p.touchscreen.tap(kr.cx, kr.cy); await settle(p, 700)
      ok(await p.getByRole('menu').count() > 0, `${w}: a tap on it opens the row's menu`)
      await shot(p, `10-xray-${w}`)
      await C.close()
    }
    {
      const C = await touchCtx(390, 844); const p = await page(C, 'xray-390')
      await go(p, `/quote-x-ray/${XRAY}`, 1800)
      const row = p.getByTestId('xray-row').first()
      ok(await row.evaluate((el) => getComputedStyle(el, '::after').content) === 'none', '390: the card has no trailing row rule drawn across it')
      const bc = await row.locator('button[aria-haspopup="menu"]').evaluate((el) => getComputedStyle(el).borderTopColor)
      ok(/rgba\(0, 0, 0, 0\)|transparent/.test(bc), `390: the card's ⋮ is the bare glyph (border ${bc})`)
      await shot(p, '11-xray-390')
      await C.close()
    }
    {
      const C = await deskCtx(1440, 1024); const p = await page(C, 'xray-1440')
      await go(p, `/quote-x-ray/${XRAY}`, 1800)
      const op = await p.getByTestId('xray-row').first().locator('[class*="xray-table-module__"][class*="__actions "]').first().evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).position])
      ok(op[0] === '0' && op[1] === 'sticky', `1440 (a mouse): the ⋮ stays the parked float, shown on hover (${op.join(' · ')})`)
      await C.close()
    }

    // ── 6 · W5-09 · W5-10 the client's two small links ──────────────────────────────────────────────────────────────────────────────
    console.log('6 · the client\'s small links under a finger (W5-09 · W5-10)')
    {
      const C = await touchCtx(390, 844); const p = await page(C, 'links')
      await go(p, `/sign/${SENT}/quote`, 1600)
      const back = p.locator('a, button').filter({ hasText: /Agreement/ }).first()
      const bb = await box(back)
      ok(bb.h >= 44 && await lands(p, back, bb.cx, bb.cy - 20) && await lands(p, back, bb.cx, bb.cy + 20), `/sign/<token>/quote: "← Agreement" is a 44 target (${Math.round(bb.h)})`)
      if (SIGNEDQ) {
        await go(p, `/confirm/${SIGNEDQ}`, 1600)
        await toEnd(p); await settle(p, 600)
        const link = p.locator('[class*="confirm-page-module__"][class*="__fileLink"]').locator('visible=true').first()
        if (await link.count()) { const lb = await box(link); ok(lb.h >= 44 && await lands(p, link, lb.cx, lb.cy - 20), `/confirm (signed): a file's link is a 44 target (${Math.round(lb.h)})`) }
        else ok(false, 'the signed confirm page lists a file')
      }
      await C.close()
    }

    // ── 7 · W5-12 the Preview's Send ▾ on a desk ────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · the Preview\'s Send ▾ at 1280 and 1440 (W5-12)')
    for (const [w, h] of [[1280, 800], [1440, 1024]]) {
      const C = await deskCtx(w, h); const p = await page(C, `preview-${w}`)
      await go(p, `/quotes/${QUOTE}/preview`, 1600)
      await p.getByRole('button', { name: /^Send/ }).first().click(); await settle(p, 600)
      const m = await box(p.getByRole('menu').first())
      ok(m.x >= 0 && m.right <= w + 0.5, `${w}: the Send menu opens inside the screen (${Math.round(m.x)}–${Math.round(m.right)})`)
      ok((await sideways(p)) === 0, `${w}: no sideways scroll with it open`)
      if (w === 1280) await shot(p, '12-preview-send-1280')
      await C.close()
    }

    // ── 7b · W5-13 · W5-14 the editors' ghosts ──────────────────────────────────────────────────────────────────────────────────────
    console.log('7b · the editors\' ghosts: the landscape split, the screen\'s foot on the first screen (W5-13 · W5-14)')
    {
      const held = async (w, h) => { const c = await touchCtx(w, h); await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) }); return c }
      const ghostOf = (p) => p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
        if (!ghost) return null
        const vis = (sel) => [...ghost.querySelectorAll(sel)].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), bottom: Math.round(r.bottom) } })
        return { pane: vis('[class*="__splitPane"]'), main: vis('[class*="__splitMain"]'), foot: vis('[class*="editor-skeleton-module__"][class*="__foot"]') }
      })
      for (const [route, paneW, label] of [[`/quotes/${QUOTE}?edit=1`, 360, 'the quote'], [`/contracts/${DRAFT}?edit=1`, 300, 'the contract']]) {
        const C = await held(1024, 768); const p = await page(C, 'ghost-split')
        await go(p, route, 1600)
        const g = await ghostOf(p)
        ok(!!g && g.pane.length === 1 && g.main.length === 1 && Math.abs(g.pane[0].w - paneW) <= 1 && g.main[0].x >= g.pane[0].x + g.pane[0].w - 1, `1024↔: ${label}'s ghost draws the ${paneW} list pane and the section beside it`, JSON.stringify(g))
        await shot(p, `13-ghost-split-${label.split(' ')[1]}`)
        await C.close()
      }
      {
        const C = await held(390, 844); const p = await page(C, 'ghost-390')
        await go(p, `/quotes/${QUOTE}?edit=1`, 1600)
        const g = await ghostOf(p)
        ok(!!g && g.pane.length === 1 && g.main.length === 0, '390: the section list\'s ghost is the list alone', JSON.stringify(g))
        await go(p, `/quotes/${QUOTE}`, 1600)
        const r = await ghostOf(p)
        ok(!!r && r.foot.length === 1 && r.foot[0].bottom <= 844 + 0.5, `390: the Quote screen's ghost draws its foot on the first screen (bottom ${r?.foot[0]?.bottom})`)
        await shot(p, '14-ghost-quote-screen-390')
        await C.close()
      }
    }

    // ── 8 · the floor: 320 and a phone held sideways ────────────────────────────────────────────────────────────────────────────────
    console.log('8 · no sideways scroll at 320 and at 844×390 on every W5 route')
    const ROUTES = ['/quotes', `/quotes/${QUOTE}`, `/quotes/${QUOTE}?edit=1`, `/quotes/${QUOTE}?edit=items`, `/quotes/${QUOTE}?edit=payment`, `/quotes/${QUOTE}/preview`, '/contracts', `/contracts/${DRAFT}`, `/contracts/${DRAFT}?edit=document`, `/contracts/${DRAFT}/preview`,
      `/sign/${SENT}`, `/sign/${SENT}/quote`, `/confirm/${VO}`, `/confirm/${SENTQ.id}`, '/quote-x-ray', `/quote-x-ray/${XRAY}`, '/visualizer', `/visualizer/${VIZ}`, '/planner', `/planner/${LAYOUT}`, '/marketplace', '/marketplace?view=deals', '/market-insights']
    for (const [w, h] of [[320, 640], [844, 390]]) {
      const C = await touchCtx(w, h); const p = await page(C, `floor-${w}`)
      const bad = []
      for (const r of ROUTES) { await go(p, r, 1100); const s = await sideways(p); if (s > 0) bad.push(`${r} ${s}`) }
      ok(bad.length === 0, `${w}×${h}: none of the ${ROUTES.length} routes scrolls sideways`, bad.join(' · '))
      await C.close()
    }
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
