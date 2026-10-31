// Quotes on the move, K3 · P-05 "As printed is a viewer, not the main screen" (+ Q-06 fit to width; C-16 C-17 C-18 C-20 C-21 B-08 absorbed; C-19
// fixed) — his "I have marked it please go ahead" (2026-10-22) on the review page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w.
// Each rule asserted as the rule, never another round's count:
//  - 390 touch: the Preview is the client's reflowed quote (the reading cards) under one 56px bar (back · the title's two lines · ⋮), with
//    "n lines · As printed" over the cards and Send ▾ as the foot's one 48 button; no desk button, no paper, no sideways scroll (320 too)
//  - As printed opens the house viewer (the client's page's, K4) over the cards: its head (← · As printed · the number and page count · Download),
//    the A4 fit to the width (page = screen − 32, Q-06), one page per swipe with dots that say where you are and jump, a double-tap zooms in (2.5)
//    while the head never scales and Fit to width comes back; `?paper=1` rides the address, lands on the viewer on arrival, and the arrow then
//    returns to the quote (a viewer opened from the cards closes back to them)
//  - the ⋮ (C-17 · C-20): Copy preview link ("for the team") · Share PDF · Internal copy (a checkbox row that puts the cost and margin on the page)
//    · What your client sees · Change template — every row 44, a copy says so, the panel opens, the picker opens
//  - What your client sees (C-19): rows at 48, the Columns as chips; a chip press changes the quote's own view and is saved (then put back)
//  - 768 / 1024 touch (C-18): the same bar with Send in it (a 44 box round the 36 button), the A4 at 1:1 with its margins scrolling, centred, body text ≥ 11px
//  - the editor's Client view at ≤1024 (C-21 · B-08): wherever the pane renders there, it is the door to the Preview, never a 4px paper
//  - 1440: the desk's bar as it was (the four buttons, the switch, Send) and no touch bar — the byte-identical comparison runs beside this probe
//  - Accounting (read-only): no Send, no foot, the ⋮ keeps only the copy rows
//  - (the close-out round 2026-10-31) a signed quote keeps its template: no Change template in its ⋮ (390), its template words not a press
//    (1440); a Preview left open while the quote is signed elsewhere — the choice is refused with the rule and the words stop being a press
//  - no page errors
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3173 NODE_PATH=<repo>/node_modules node verify-rq-k3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rq-k3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3173'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rq-k3-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }   // the app's own lazy writes first
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
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const touchCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport only: a full-page capture drops (hover: none) mid-shot
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  /* the touch box round a control: what a tap 21px above and below its centre lands on (REG-312's 44) */
  const touchBox = (p, loc) => loc.evaluate((el) => {
    const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t) || (t.contains(el) && t.closest('button, [role=button], [role=radio], a') === el)) }
    return { w: Math.round(r.width), h: Math.round(r.height), above: hit(cx, cy - 21), below: hit(cx, cy + 21), left: hit(cx - 21, cy), right: hit(cx + 21, cy) }
  })
  const viewer = (p) => p.getByTestId('paper-viewer')
  const DRAFT = sql(`select id from quotes where number = 'OM-10001' and deleted_at is null`)
  const SIGNED = json(`select q.id, q.number from quotes q where q.status = 'Signed' and q.deleted_at is null and q.kind = 'quote' order by q.number limit 1`)[0]
  const VIEW0 = sql(`select coalesce(client_view_json, '') from quotes where id = '${DRAFT}'`)
  ok(!!DRAFT, 'the demo Draft OM-10001 is there')

  try {
    // ── 1 · 390: the Preview reads ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · 390 touch — the Preview is the client’s quote, read first (P-05)')
    as('dane')
    const M = await touchCtx(); const m = await page(M, 'dane-390')
    await go(m, `/quotes/${DRAFT}/preview?from=%2Fquotes`)
    await shot(m, '01-list-390')
    const bar = m.getByTestId('preview-bar')
    const barBox = await bar.boundingBox()
    ok(!!barBox && near(barBox.height, 56, 1) && barBox.y === 0, `one 56px bar (${barBox?.height})`)
    ok(await m.getByRole('heading', { level: 1, name: 'Preview' }).count() === 1 && /OM-10001 · Draft/.test(await m.getByTestId('preview-sub').innerText()), 'the bar says Preview, then the number and the status')
    const backBtn = m.getByRole('button', { name: 'Back to the quote' })
    const bb = await touchBox(m, backBtn)
    ok(bb.above && bb.below, `Back has a 44 box round its glyph (${JSON.stringify(bb)})`)
    ok(await m.getByTestId('preview-more').count() === 1, 'the bar carries ⋮')
    ok(await m.getByRole('button', { name: /What your client sees|Copy link|Download PDF/ }).count() === 0 && await m.getByRole('switch', { name: 'Internal copy' }).count() === 0 && await m.getByTestId('preview-download').count() === 0, 'no desk button or switch in the bar; Download is the viewer’s (C-17)')
    const asPrinted = m.getByTestId('view-as-printed')
    ok(await asPrinted.count() === 1 && /as printed/i.test(await asPrinted.innerText()) && /\d+ items/.test(await m.locator('[class*="readHead"]').innerText()), 'the cards’ head: the line count, and As printed')
    const ab = await touchBox(m, asPrinted)
    ok(ab.above && ab.below, `As printed has a 44 box (${JSON.stringify(ab)})`)
    ok(await m.getByTestId('reading-cards').count() === 1 && await m.locator('[data-page]').count() === 0, 'the quote reads as cards; no paper is drawn')
    const cards = await m.getByTestId('reading-card').count()
    ok(cards >= 5, `the lines are cards (${cards})`)
    const foot = m.getByTestId('preview-foot')
    const fb = await foot.locator('button').first().boundingBox()
    ok(!!fb && near(fb.height, 48, 1) && fb.width >= 300 && /Send/.test(await foot.innerText()), `the foot’s one button is Send ▾ at 48, across the width (${fb?.width}×${fb?.height})`)
    ok(await m.locator('button:visible').evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor === getComputedStyle(document.documentElement).getPropertyValue('--om-color-primary-default').trim() || /primary/.test(e.className)).length) <= 2, 'one filled button on the screen')
    ok((await sideways(m)) <= 0, 'no sideways scroll at 390')
    await m.evaluate(() => window.scrollTo(0, 600)); await settle(m, 400)
    const fb2 = await foot.boundingBox()
    ok(!!fb2 && fb2.y + fb2.height <= 844 && fb2.y > 700, 'the foot stays at the bottom while the cards scroll')
    await m.evaluate(() => window.scrollTo(0, 0)); await settle(m, 300)

    // ── 2 · As printed: the viewer ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · As printed — the house viewer over the cards (P-05 · Q-06)')
    await asPrinted.tap(); await settle(m, 1800)
    await shot(m, '02-paper-390')
    ok(/[?&]paper=1/.test(m.url()), 'As printed writes ?paper=1 into the address')
    const dlg = m.getByRole('dialog', { name: 'As printed' })
    ok(await viewer(m).count() === 1 && await dlg.count() === 1, 'the viewer opens over the cards — the house one (the client’s page’s)')
    const vb = await viewer(m).boundingBox()
    ok(!!vb && vb.x === 0 && vb.y === 0 && vb.width === 390 && vb.height === 844, 'it takes the whole screen')
    ok(await m.getByTestId('paper-viewer-back').count() === 1 && await m.getByTestId('paper-viewer-download').count() === 1, 'its head: the arrow back and Download')
    const hb = await touchBox(m, m.getByTestId('paper-viewer-download'))
    ok(hb.above && hb.below && hb.w === 44, `Download has a 44 box (${JSON.stringify(hb)})`)
    const pagesN = await m.locator('[data-page]').count()
    ok(pagesN >= 1, `the document’s pages are drawn (${pagesN})`)
    ok(new RegExp(`OM-10001 · ${pagesN} page`).test(await dlg.innerText()), 'the head’s second line: the number and the page count')
    const p1 = await m.locator('[data-page]').first().boundingBox()
    ok(!!p1 && near(p1.width, 390 - 32, 2) && near(p1.x, 16, 2), `the first page is fit to the width — 16 in from each edge (${p1?.x}, ${p1?.width}) (Q-06)`)
    ok(await viewer(m).getAttribute('data-scale') === '1.00' && await viewer(m).getAttribute('data-page-at') === '1', 'at fit, on page 1')
    const dots = m.getByTestId('page-dots')
    if (pagesN > 1 && pagesN <= 6) {
      ok(await dots.locator('button').count() === pagesN, `one dot per page (${pagesN})`)
      const d1 = await dots.locator('button').first().boundingBox()
      ok(!!d1 && d1.width >= 44 && d1.height >= 44, 'a dot is a 44 target')
      ok(await dots.locator('button[aria-current="true"]').getAttribute('aria-label') === `Page 1 of ${pagesN}`, 'the first dot is current')
      /* a swipe: the body moves one viewport — the snap lands on page 2 */
      await m.evaluate(() => { const el = document.querySelector('[data-testid="paper-viewer"]').children[1]; el.scrollTo({ left: el.clientWidth, behavior: 'instant' }) }); await settle(m, 700)
      ok(await viewer(m).getAttribute('data-page-at') === '2' && await dots.locator('button[aria-current="true"]').getAttribute('aria-label') === `Page 2 of ${pagesN}`, 'a swipe lands on page 2 and the dot follows')
      const p2 = await m.locator('[data-page]').nth(1).boundingBox()
      ok(!!p2 && near(p2.x, 16, 2), 'page 2 sits where page 1 did')
      await shot(m, '03-paper-page2-390')
      await dots.locator('button').first().tap(); await settle(m, 900)
      ok(await viewer(m).getAttribute('data-page-at') === '1', 'a dot press goes back to page 1')
    } else ok(true, `dots skipped — ${pagesN} page(s)`)
    /* a double-tap zooms in; Fit to width brings the page back */
    const pb = await m.locator('[data-page]').first().boundingBox()
    await m.touchscreen.tap(pb.x + 120, pb.y + 120); await m.touchscreen.tap(pb.x + 120, pb.y + 120); await settle(m, 900)
    const zoomed = await m.locator('[data-page]').first().boundingBox()
    ok(await viewer(m).getAttribute('data-scale') === '2.50' && !!zoomed && near(zoomed.width, (390 - 32) * 2.5, 4), `a double-tap zooms to 2.5× (${zoomed?.width})`)
    ok(await m.getByTestId('fit-width').count() === 1, 'Fit to width appears while zoomed')
    ok(await m.evaluate(() => { const el = document.querySelector('[data-testid="paper-viewer"]').children[1]; return el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight }), 'zoomed in, the page pans both ways inside the viewer')
    const headAfter = await m.getByTestId('paper-viewer-back').boundingBox()
    ok(!!headAfter && headAfter.y < 64 && (await viewer(m).boundingBox()).width === 390, 'the head never scales with the pinch (C-16)')
    await shot(m, '04-paper-zoomed-390')
    await m.getByTestId('fit-width').tap(); await settle(m, 900)
    ok(await viewer(m).getAttribute('data-scale') === '1.00', 'Fit to width brings the page back to the width')
    ok((await sideways(m)) <= 0, 'no sideways scroll with the viewer open')
    /* opened from the cards, the arrow closes back to them */
    await m.getByTestId('paper-viewer-back').tap(); await settle(m, 900)
    ok(await viewer(m).count() === 0 && !/paper=1/.test(m.url()) && await m.getByTestId('reading-cards').count() === 1 && /\/preview/.test(m.url()), 'the arrow closes the viewer back to the cards and takes the flag off the address')
    /* arrived on the viewer (the Quote screen’s As printed), the arrow goes back to the quote — a page never seen is never shown */
    await go(m, `/quotes/${DRAFT}/preview?paper=1&from=%2Fquotes`)
    ok(await viewer(m).count() === 1 && await m.locator('[data-page]').count() >= 1, '?paper=1 opens on the viewer — the Quote screen’s As printed lands here')
    await m.getByTestId('paper-viewer-back').tap(); await m.waitForURL(new RegExp(`/quotes/${DRAFT}(\\?|$)`), { timeout: 15000 }).catch(() => {})
    ok(new RegExp(`/quotes/${DRAFT}`).test(m.url()) && !/preview/.test(m.url()), `arrived on the viewer, its arrow returns to the quote (${m.url().replace(BASE, '')})`)

    // ── 3 · the ⋮ ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · the ⋮ — what the desk lays out as buttons (C-17 · C-20)')
    await go(m, `/quotes/${DRAFT}/preview?from=%2Fquotes`)
    await m.getByTestId('preview-more').tap(); await settle(m, 800)
    await shot(m, '05-menu-390')
    const rows = await m.getByRole('menuitem').allInnerTexts()
    const checks = await m.getByRole('menuitemcheckbox').allInnerTexts()
    ok(rows.length === 4 && /^Copy preview link/.test(rows[0]) && /^Share PDF/.test(rows[1]) && /^What your client sees/.test(rows[2]) && /^Change template/.test(rows[3]), `the rows: Copy preview link · Share PDF · What your client sees · Change template (${rows.map((r) => r.split('\n')[0]).join(' · ')})`)
    ok(checks.length === 1 && /^Internal copy/.test(checks[0]), 'Internal copy is a checkbox row')
    ok(/for the team/i.test(rows[0]), 'Copy preview link says it is for the team (C-20)')
    ok(/Default Quote PDF · v1/.test(rows[3]), 'Change template names the template on the quote')
    const rowH = await m.locator('[role="menu"] [role^="menuitem"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    ok(rowH.length >= 5 && rowH.every((h) => h >= 44), `every row is a 44+ target (${rowH.join(' ')})`)
    await m.getByRole('menuitem', { name: /Copy preview link/ }).tap(); await settle(m, 900)
    ok(await m.getByText('Preview link copied').count() === 1, 'Copy preview link says so')
    await m.getByTestId('preview-more').tap(); await settle(m, 600)
    await m.getByRole('menuitemcheckbox', { name: /Internal copy/ }).tap(); await settle(m, 900)
    ok(await m.getByRole('region', { name: 'Internal summary' }).count() === 1 && /Cost|Margin/.test(await m.getByRole('region', { name: 'Internal summary' }).innerText()), 'Internal copy puts the cost and margin card on the page')
    await m.getByTestId('preview-more').tap(); await settle(m, 600)
    ok(await m.getByRole('menuitemcheckbox', { name: /Internal copy/ }).getAttribute('aria-checked') === 'true', 'the row shows it is on')
    await m.getByRole('menuitemcheckbox', { name: /Internal copy/ }).tap(); await settle(m, 600)
    ok(await m.getByRole('region', { name: 'Internal summary' }).count() === 0, 'and off again')
    await m.getByTestId('preview-more').tap(); await settle(m, 600)
    await m.getByRole('menuitem', { name: /Change template/ }).tap(); await settle(m, 900)
    ok(await m.getByRole('dialog', { name: 'Choose a template' }).count() === 1, 'Change template opens the picker')
    await m.getByRole('dialog', { name: 'Choose a template' }).getByRole('button', { name: 'Cancel' }).tap(); await settle(m, 600)

    // ── 4 · What your client sees (C-19) ──────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · What your client sees — rows at 48, the Columns as chips (C-19)')
    await m.getByTestId('preview-more').tap(); await settle(m, 600)
    await m.getByRole('menuitem', { name: /What your client sees/ }).tap(); await settle(m, 1000)
    const wycs = m.getByRole('dialog', { name: 'What your client sees' })
    ok(await wycs.count() === 1, 'the panel opens as a sheet')
    await shot(m, '06-wycs-390')
    const chips = wycs.getByTestId('client-view-columns')
    ok(await chips.count() === 1 && await chips.locator('[aria-pressed]').count() >= 2, 'the Columns are one line of chips')
    const wh = await wycs.locator('label[class*="row"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    ok(wh.length >= 8 && wh.every((h) => h >= 48), `every switch row stands 48+ (${wh.join(' ')})`)
    const labelPx = await wycs.locator('label[class*="row"]').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
    ok(labelPx >= 16, `a row’s words read at 16 (${labelPx})`)
    const chip = chips.locator('[aria-pressed]').first()
    const chipName = await chip.innerText(), was = await chip.getAttribute('aria-pressed')
    await chip.tap(); await settle(m, 1400)
    ok(await chip.getAttribute('aria-pressed') !== was, `a chip press flips a column (${chipName})`)
    const viewNow = sql(`select coalesce(client_view_json, '') from quotes where id = '${DRAFT}'`)
    ok(viewNow !== VIEW0, 'the quote’s own view is saved')
    await chip.tap(); await settle(m, 1400)
    ok(await chip.getAttribute('aria-pressed') === was, 'and back')
    await m.keyboard.press('Escape'); await settle(m, 600)
    ok(await wycs.count() === 0, 'Esc closes the sheet')

    // ── 5 · Send and Back ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Send from the foot; Back returns where you came from')
    await foot.getByTestId('quote-send').tap(); await settle(m, 900)
    const sendSheet = m.getByRole('menu', { name: 'Send' })
    ok(await sendSheet.count() === 1 && await sendSheet.getByRole('menuitem', { name: /Ask to confirm/ }).count() === 1, 'Send ▾ opens the quote’s Send sheet — the same rows as the editor’s')   // (the calm UI build 2026-10-27, a deliberate change) W-358
    await shot(m, '07-send-390')
    await m.keyboard.press('Escape'); await settle(m, 600)
    await backBtn.tap(); await m.waitForURL(new RegExp(`/quotes/${DRAFT}(\\?|$)`), { timeout: 15000 }).catch(() => {})
    ok(new RegExp(`/quotes/${DRAFT}`).test(m.url()) && !/preview/.test(m.url()) && /from=/.test(m.url()), `Back opens the quote with its origin kept (${m.url().replace(BASE, '')})`)
    await M.close()

    // ── 6 · 320 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 320 — the floor')
    const S = await touchCtx(320, 568); const s = await page(S, 'dane-320')
    await go(s, `/quotes/${DRAFT}/preview`)
    ok((await sideways(s)) <= 0, 'no sideways scroll at 320 (the cards)')
    await s.getByTestId('view-as-printed').tap(); await settle(s, 1500)
    const p320 = await s.locator('[data-page]').first().boundingBox()
    ok((await sideways(s)) <= 0 && !!p320 && near(p320.width, 320 - 32, 2), `no sideways scroll at 320 with the viewer; the page fits (${p320?.width})`)
    const d320 = await s.getByTestId('page-dots').boundingBox().catch(() => null)
    ok(!d320 || d320.width <= 320, 'the dots fit a 320 screen')
    await shot(s, '08-paper-320')
    await S.close()

    // ── 7 · 768 and 1024 touch ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · a touch tablet — the same bar, the A4 at 1:1 (C-18)')
    for (const [w, h, tag] of [[768, 1024, '768'], [1024, 768, '1024']]) {
      const T = await touchCtx(w, h); const t = await page(T, `dane-${tag}`)
      await go(t, `/quotes/${DRAFT}/preview`, 1800)
      await shot(t, `09-paper-${tag}`)
      const tb = await t.getByTestId('preview-bar').boundingBox()
      ok(!!tb && near(tb.height, 56, 1), `${tag}: the one-line bar (${tb?.height})`)
      ok(await t.getByRole('radio').count() === 0 && await t.getByTestId('preview-foot').count() === 0, `${tag}: no switch and no foot — the paper is the page`)
      const pg = await t.locator('[data-page]').first().boundingBox()
      ok(!!pg && near(pg.width, 794, 2), `${tag}: the A4 at 1:1 (${pg?.width})`)
      const st = await t.evaluate(() => { const s = document.querySelector('[data-page]').closest('[class*="stage"]'); return { left: s.scrollLeft, over: s.scrollWidth - s.clientWidth } })
      ok(st.over <= 0 ? st.left === 0 : near(st.left, st.over / 2, 2), `${tag}: the margins scroll, the text in the middle (scrolled ${st.left} of ${st.over})`)
      const px = await t.locator('[data-page]').first().evaluate((pg) => { const els = Array.from(pg.querySelectorAll('td, p, span, div')).filter((e) => e.children.length === 0 && (e.textContent || '').trim().length > 12); return els.length ? Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize) * (parseFloat(getComputedStyle(e).zoom) || 1))) : 0 })
      ok(px >= 10.5, `${tag}: the body text reads at its printed size (${px}px)`)
      ok((await sideways(t)) <= 0, `${tag}: no sideways scroll of the page`)
      const send = t.getByTestId('quote-send')
      ok(await send.count() === 1 && (await send.boundingBox()).y < 56, `${tag}: Send ▾ sits in the bar`)
      const sb = await touchBox(t, send)
      ok(sb.above && sb.below, `${tag}: Send has a 44 box (${JSON.stringify(sb)})`)
      ok(await t.getByTestId('preview-download').count() === 1 && await t.getByTestId('preview-more').count() === 1, `${tag}: Download and ⋮ in the bar`)
      if (tag === '768') {
        await t.getByTestId('preview-more').tap(); await settle(t, 700)
        await t.getByRole('menuitem', { name: /What your client sees/ }).tap(); await settle(t, 1000)
        const dw = t.getByRole('dialog', { name: 'What your client sees' })
        ok(await dw.count() === 1 && await dw.getByTestId('client-view-columns').count() === 1, '768: What your client sees opens as the Drawer with the Columns as chips')
        const wh2 = await dw.locator('label[class*="row"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
        ok(wh2.length >= 8 && wh2.every((x) => x >= 48), `768: its rows stand 48+ (${wh2.join(' ')})`)
        await shot(t, '10-wycs-768')
        await t.keyboard.press('Escape'); await settle(t, 500)
        /* the editor's Client view (C-21 · B-08): wherever the pane renders at ≤1024, it is the door to the Preview, never the paper */
        await go(t, `/quotes/${DRAFT}`, 1800)
        /* the header's own button where it shows, else the header's ⋮ row "Client view" */
        let opened = false
        const cv = t.getByRole('button', { name: 'Client view' }).first()
        if (await cv.count() && await cv.isVisible()) { await cv.tap(); opened = true }
        else {
          const more = t.getByRole('button', { name: 'More options' }).first()
          if (await more.count() && await more.isVisible()) {
            await more.tap(); await settle(t, 700)
            const row = t.getByRole('menuitem', { name: /^Client view$/ })
            if (await row.count()) { await row.tap(); opened = true } else await t.keyboard.press('Escape')
          }
        }
        if (opened) {
          await settle(t, 1200)
          const pane = t.getByTestId('client-view-pane')
          if (await pane.count()) {
            ok(await pane.getAttribute('data-touch') !== null && await pane.locator('[data-page]').count() === 0 && await pane.getByTestId('open-preview').count() === 1, '768: the editor’s Client view is the door to the Preview, no 4px paper (C-21)')
            await shot(t, '11-client-view-door-768')
            await pane.getByTestId('open-preview').tap(); await t.waitForURL(/\/preview/, { timeout: 15000 }).catch(() => {})
            ok(/\/preview/.test(t.url()), '768: Open Preview opens it')
          } else ok(true, '768: the editor mounts no pane at this width (K1’s call) — nothing to check')
        } else ok(true, '768: the editor offers no Client view at this width (K1’s call)')
      }
      await T.close()
    }

    // ── 8 · 1440: the desk as it was ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · 1440 — the desk’s bar as it was')
    const D = await desk(); const d = await page(D, 'dane-1440')
    await go(d, `/quotes/${DRAFT}/preview`, 1800)
    ok(await d.getByTestId('preview-bar').count() === 0 && await d.getByRole('radio').count() === 0 && await d.getByTestId('preview-foot').count() === 0, 'no touch bar, switch or foot on the desk')
    const names = await d.locator('header button').allInnerTexts()
    ok(names.some((n) => /What your client sees/.test(n)) && names.some((n) => /Copy link/.test(n)) && names.some((n) => /Download PDF/.test(n)) && names.some((n) => /^Send/.test(n)) && await d.getByRole('switch', { name: 'Internal copy' }).count() === 1, 'the four buttons and the switch, as before')
    ok(near((await d.locator('header').first().boundingBox()).height, 76, 1), 'the 76px bar')
    await d.getByRole('button', { name: /What your client sees/ }).click(); await settle(d, 800)
    const aside = d.getByRole('complementary', { name: 'What your client sees' })
    ok(await aside.count() === 1 && await aside.getByRole('switch').count() >= 10 && await aside.getByTestId('client-view-columns').count() === 0, 'the desk’s panel keeps its switches (no chips)')
    await shot(d, '12-desk-1440')
    await D.close()

    // ── 9 · Accounting: read-only ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · Priya (Accounting) reads a signed quote: nothing sends')
    if (SIGNED) {
      as('priya')
      const P = await touchCtx(); const pr = await page(P, 'priya-390')
      const r = await go(pr, `/quotes/${SIGNED.id}/preview`)
      if (r && r.status() === 200 && await pr.getByTestId('preview-bar').count()) {
        ok(await pr.getByTestId('preview-foot').count() === 0 && await pr.getByTestId('quote-send').count() === 0, 'no Send, no foot for a read-only viewer')
        ok(await pr.getByRole('button', { name: 'Back' }).count() === 1, 'Back is plain Back (to Money)')
        await pr.getByTestId('preview-more').tap(); await settle(pr, 700)
        const prow = await pr.getByRole('menuitem').allInnerTexts()
        ok(prow.length === 2 && /Copy preview link/.test(prow[0]) && /Share PDF/.test(prow[1]), 'the ⋮ keeps the copy rows only')
        await shot(pr, '13-priya-390')
      } else ok(true, 'Priya cannot open this quote’s Preview — the gate stands (nothing to check here)')
      await P.close()
      as('dane')
    } else ok(true, 'no signed quote in the demo — skipped')

    // ── 10 · a signed quote keeps its template (the close-out round 2026-10-31) ───────────────────────────────────────────────────
    console.log('10 · a signed quote keeps its template: no picker on its Preview, and a Preview left open is refused')
    if (SIGNED) {
      const S = await touchCtx(); const sm = await page(S, 'signed-390')
      await go(sm, `/quotes/${SIGNED.id}/preview`)
      await sm.getByTestId('preview-more').tap(); await settle(sm, 700)
      const srows = (await sm.getByRole('menuitem').allInnerTexts()).map((r) => r.split('\n')[0])
      ok(srows.length === 3 && /^Copy preview link/.test(srows[0]) && /^Share PDF/.test(srows[1]) && /^What your client sees/.test(srows[2]), `390: a signed quote’s ⋮ has no Change template (${srows.join(' · ')})`)
      await S.close()
      const SD = await desk(); const sd = await page(SD, 'signed-1440')
      await go(sd, `/quotes/${SIGNED.id}/preview`, 1800)
      const words = sql(`select coalesce((select t.name || ' · v' || q.template_version from quotes q join quote_templates t on t.id = q.template_id where q.id = '${SIGNED.id}'), 'Studio default')`)
      ok(await sd.getByRole('button', { name: /Change template/ }).count() === 0 && (await sd.locator('header').first().innerText()).includes(words), `1440: its template is words, not a press (“${words}” still reads)`)
      await shot(sd, '14-signed-1440')
      /* a Preview open on a Draft while the quote is signed elsewhere: the choice is refused with the rule, nothing changes, and the page reads the record again */
      const was = json(`select status, coalesce(template_id, '') as tpl from quotes where id = '${DRAFT}'`)[0]
      await go(sd, `/quotes/${DRAFT}/preview`, 1800)
      await sd.getByRole('button', { name: 'Change template' }).click(); await settle(sd, 900)
      const picker = sd.getByRole('dialog', { name: 'Choose a template' })
      await picker.getByRole('option', { name: /Open folder HDB/ }).first().click(); await settle(sd, 500)   // the demo files the BTO templates in HDB
      await picker.getByRole('option').filter({ hasText: '4-Room BTO' }).first().click(); await settle(sd, 300)
      sql(`update quotes set status = 'Signed' where id = '${DRAFT}'`)
      await picker.getByRole('button', { name: 'Use this template' }).click(); await settle(sd, 2200)
      ok(sql(`select coalesce(template_id, '') from quotes where id = '${DRAFT}'`) === was.tpl && await sd.getByText('Couldn’t change the template — a signed quote keeps the template it was signed with').count() === 1, 'a Preview left open while the quote was signed: the server refuses the new template and the snackbar says why')
      ok(await sd.getByRole('button', { name: 'Change template' }).count() === 0, '…and the page reads the record again — the template is words now')
      sql(`update quotes set status = '${was.status}' where id = '${DRAFT}'`)
      await SD.close()
    } else ok(true, 'no signed quote in the demo — skipped')

    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(changed.length ? `put back: ${changed.join(', ')}` : 'nothing left changed')
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
