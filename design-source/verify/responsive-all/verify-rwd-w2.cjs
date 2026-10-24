// The whole-app responsiveness audit, lane W2 — Leads and the day's work (his "run a overall responsiveness audit and fix all the issues across
// devices and breakpoints based on your recommendations", 2026-10-23; the contract `design-source/context/responsive/whole-app-audit-2026-10-23/
// brief.md`, the audit `audit-w2.md`, the ledger `outcome-w2.md`). Each fix asserted as the rule it keeps, never a count, every press pressed for
// real (a tap under touch, a click with a mouse), on the production build:
//  A · W2-12  a phone held sideways (844×390): the Assign card (the listing's, a task's) stays inside the screen and its Assign takes the tap; the
//             Filters dialogs' rail scrolls to its last group and opens it; /tasks' scope menu and the lead's stage menu end inside the screen,
//             their last row reachable; W2-17 the Deleted Leads / Deleted Files sheets stand inside the screen, their head in place.
//  B · W2-01  a meeting's phone foot (320 · 390): every move inside the screen, the Maison AI button above the foot (never over a move), a move
//             opens its dialog; a tablet keeps the corner; the desk keeps the moves in the head.
//  C · W2-04  /tasks on a phone (320 · 390): the to-do chips on a line of their own under the pill, each whole and on top, a tap selects one; the
//             loader's ghost draws them where the page does.
//  D · W2-02  1280: the lead's MY TASKS lines are never cut; 1440 draws them on one line as before.
//  E · W2-03  a touch tablet's listing: every Members cell holds its avatars, its +n and its Assign glyph.
//  F · W2-05  /leads/imports' search types at 16 on a phone and a touch tablet, 14 at the desk.
//  G · the presses under a finger (W2-07 · 08 · 09 · 10 · 11 · 14 · 15): each takes a 44 tap (its box, or REG-344's overlay, hit-tested); a strip
//      thumb and a meeting's lead open what they name.
//  H · W2-16  a Hangout's How it went on a phone: the By designer heads never overlap, the table scrolls in its own frame, the names whole.
//  I · 320 and 844×390: no lane page scrolls sideways.
//  J · 1440: the desk's values are as drawn (the Assign card 440, the Filters rail not a scroller, no meeting foot, Deleted Leads' 480 floor).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything written (two meeting links) is put back.
// Usage: BASE=http://localhost:3202 NODE_PATH=<repo>/node_modules node verify-rwd-w2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/responsive-all/rwd-w2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3202'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rwd-w2-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, why) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, why ? `— ${why}` : '') } }

const SIZE = {
  320: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  768: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  sideways: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 } },
  1440: { viewport: { width: 1440, height: 1024 } },
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }   // the app's own lazy writes first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = ['meetings']
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }

  /* ── the records this probe reads: the demo's own, by what they are ── */
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const KEVIN = leadId('Kevin Ng')
  const PLANNED = sql(`select id from meetings where status = 'planned' and lead_id is not null and deleted_at is null order by starts_at limit 1`)
  const HELD = sql(`select id from meetings where status = 'held' and brief_json is not null and brief_saved_at is null and lead_id is not null and deleted_at is null limit 1`)
  const FOLDER = sql(`select parent_id from lead_files where lead_id = '${KEVIN}' and kind != 'folder' and parent_id is not null and deleted_at is null group by parent_id having count(*) > 1 limit 1`)
  const FILES = sql(`select id from lead_files where lead_id = '${KEVIN}' and parent_id = '${FOLDER}' and kind != 'folder' and deleted_at is null order by name`).split('\n').filter(Boolean)
  const EVENT = sql(`select event_id from hangout_participations where status = 'confirmed' and page_token is not null order by event_id desc limit 1`)
  const PAGE = sql(`select page_token from hangout_participations where event_id = '${EVENT}'`)
  console.log(`records: Kevin ${KEVIN ? '✓' : '✗'} · planned ${PLANNED ? '✓' : '✗'} · held ${HELD ? '✓' : '✗'} · files ${FILES.length} · hangout ${EVENT || '✗'}`)

  const ctx = async (size) => { const c = await b.newContext({ ...SIZE[size], reducedMotion: 'reduce' }); return c }
  const page = async (c) => { const p = await c.newPage(); p.on('pageerror', (e) => errors.push(String(e).slice(0, 200))); return p }
  const go = async (p, url, wait = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(wait) }
  const tap = async (p, loc) => { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); await loc.tap({ timeout: 4000 }) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } })
  /* the element a finger at this control's centre lands on is the control (or inside it) */
  const onTop = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === el || el.contains(h) || h.contains(el)) })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const dialogNamed = (p, name) => p.getByRole('dialog', { name })
  /* a finger's swipe on the Filters rail (a wheel over it — never a programmatic scroll, which moves even a clipped box): is the tab then
     inside the rail's visible part, above the dialog's foot, with the dialog's head still where it was? */
  const railTo = async (p, dlg, tab) => {
    const rail = dlg.locator('[class*="filters-modal-module__"][class*="__rail"]').first()
    const head0 = await box(dlg.locator('[data-surface-head]').first())
    const rb = await box(rail)
    await p.mouse.move(rb.l + rb.w / 2, rb.t + 20); await p.mouse.wheel(0, 600); await p.waitForTimeout(400)
    const head = await box(dlg.locator('[data-surface-head]').first()), foot = await box(dlg.locator('[data-surface-foot]').first())
    const t = await box(tab)
    const reached = t.t >= head.b - 0.5 && t.b <= foot.t + 0.5 && Math.abs(head.t - head0.t) < 1 && await onTop(tab)
    return { reached, x: t.l + t.w / 2, y: t.t + t.h / 2, why: `tab ${Math.round(t.t)}–${Math.round(t.b)} · head ${Math.round(head.t)}–${Math.round(head.b)} (was ${Math.round(head0.t)}) · foot from ${Math.round(foot.t)}` }
  }

  try {
    /* ── A · W2-12 a phone held sideways ── */
    console.log('A · a phone held sideways (844×390)')
    {
      const c = await ctx('sideways'); const p = await page(c)
      await go(p, '/leads?view=table')
      const assignBtn = p.getByRole('button', { name: /^Assign members to / }).first()
      await tap(p, assignBtn); await p.waitForTimeout(700)
      const card = dialogNamed(p, 'Assign Member')
      const cb = await box(card)
      ok(cb.t >= 0 && cb.b <= 390, 'the listing’s Assign card stays inside the 390-tall screen', `${Math.round(cb.t)}–${Math.round(cb.b)}`)
      const doIt = card.getByRole('button', { name: 'Assign', exact: true })
      const db = await box(doIt)
      ok(db.b <= 390 && await onTop(doIt), '…and its Assign is on screen and takes the tap', `${Math.round(db.t)}–${Math.round(db.b)}`)
      await shot(p, 'a1-assign-sideways')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      await tap(p, p.getByRole('button', { name: /^Filters/ }).first()); await p.waitForTimeout(700)
      const filters = dialogNamed(p, 'Filters')
      const dateTab = filters.getByRole('button', { name: /^Date/ }).or(filters.getByRole('tab', { name: /^Date/ })).first()
      const dt = await railTo(p, filters, dateTab)
      ok(dt.reached, 'the listing’s Filters: a swipe on the rail brings Date above the foot, the head still in place', dt.why)
      if (dt.reached) { await p.touchscreen.tap(dt.x, dt.y); await p.waitForTimeout(400) }
      ok(await dateTab.evaluate((el) => el.hasAttribute('data-active') || el.getAttribute('aria-selected') === 'true'), '…and a tap on it opens its pane')
      await shot(p, 'a2-filters-sideways')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)

      await go(p, '/tasks')
      await tap(p, p.getByRole('button', { name: /^All Tasks|^My Tasks|^Unassigned|^Studio Tasks/ }).first()); await p.waitForTimeout(600)
      const menu = p.getByRole('menu').last()
      const mb = await box(menu)
      ok(mb.b <= 390, '/tasks: the scope menu ends inside the screen', `${Math.round(mb.t)}–${Math.round(mb.b)}`)
      const lastItem = menu.locator('[role^="menuitem"]').last()
      await lastItem.scrollIntoViewIfNeeded()
      ok(await onTop(lastItem), '…and its last row is reachable and on top')
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await tap(p, p.getByRole('button', { name: /^Filters/ }).first()); await p.waitForTimeout(700)
      const tf = dialogNamed(p, 'Filters')
      const lastTab = tf.locator('[class*="filters-modal-module__"][class*="__tab"]').last()
      const lt = await railTo(p, tf, lastTab)
      ok(lt.reached, '/tasks’ Filters: a swipe on the rail brings its last group above the foot', lt.why)
      if (lt.reached) { await p.touchscreen.tap(lt.x, lt.y); await p.waitForTimeout(400) }
      ok(await lastTab.evaluate((el) => el.hasAttribute('data-active')), '…and a tap on it opens its pane')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      const taskAssign = p.locator('[class*="tasks-table-module"][class*="assignLink"], [data-testid="task-assign"]').first()
      if (await taskAssign.count()) {
        await tap(p, taskAssign); await p.waitForTimeout(700)
        const tc = await box(dialogNamed(p, 'Assign Member'))
        ok(tc.t >= 0 && tc.b <= 390, 'a task’s Assign card stays inside the screen (its top never above it)', `${Math.round(tc.t)}–${Math.round(tc.b)}`)
        await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      } else ok(false, 'a task to assign on /tasks')

      /* W2-17 the Deleted sheets fit the screen: their head stays, the body scrolls inside */
      await go(p, '/leads?view=table')
      await tap(p, p.getByRole('button', { name: 'More options' }).first()); await p.waitForTimeout(500)
      await tap(p, p.getByRole('menuitem', { name: /Deleted Leads/ })); await p.waitForTimeout(900)
      const dl = p.getByRole('dialog').last(), dlb = await box(dl)
      ok(dlb.t >= 0 && dlb.b <= 390, 'Deleted Leads stands inside the 390-tall screen', `${Math.round(dlb.t)}–${Math.round(dlb.b)}`)
      ok(await onTop(dl.locator('[data-surface-head]').first()), '…its head in place, on top')
      await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      await go(p, `/leads/${KEVIN}/files`)
      await tap(p, p.getByRole('button', { name: 'More options' }).last()); await p.waitForTimeout(500)   // the Files toolbar's ⋮ (the header's comes first)
      const df = p.getByRole('menuitem', { name: /Deleted Files/ })
      if (await df.count()) {
        await tap(p, df); await p.waitForTimeout(900)
        const dfb = await box(p.getByRole('dialog').last())
        ok(dfb.t >= 0 && dfb.b <= 390, 'Deleted Files stands inside the screen', `${Math.round(dfb.t)}–${Math.round(dfb.b)}`)
        await p.keyboard.press('Escape'); await p.waitForTimeout(400)
      } else ok(false, 'the Files tab offers Deleted Files')

      await go(p, `/leads/${KEVIN}`)
      await tap(p, p.getByRole('button', { name: /^Stage: / }).first()); await p.waitForTimeout(600)
      const sm = p.getByRole('menu').last()
      const sb = await box(sm)
      ok(sb.b <= 390, 'the lead’s stage menu ends inside the screen', `${Math.round(sb.t)}–${Math.round(sb.b)}`)
      const lost = sm.locator('[role^="menuitem"]', { hasText: /^Lost/ }).last()
      await lost.scrollIntoViewIfNeeded()
      ok(await onTop(lost), '…and Lost, its last row, is reachable')
      await shot(p, 'a3-stage-menu-sideways')
      await c.close()
    }

    /* ── B · W2-01 a meeting's foot ── */
    console.log('B · a meeting’s foot')
    for (const size of ['320', '390']) {
      const c = await ctx(size); const p = await page(c)
      for (const [label, id] of [['planned', PLANNED], ['held', HELD]]) {
        if (!id) { ok(false, `a ${label} meeting to open`); continue }
        await go(p, `/meetings/${id}`, 1800)
        const foot = p.getByTestId('room-foot')
        const moves = foot.locator('button')
        const n = await moves.count()
        const vw = SIZE[size].viewport.width
        const boxes = []; for (let i = 0; i < n; i++) boxes.push(await box(moves.nth(i)))
        ok(n >= 1 && boxes.every((x) => x.l >= 0 && x.r <= vw), `${size} · ${label}: every move in the foot is inside the screen`, boxes.map((x) => `${Math.round(x.l)}–${Math.round(x.r)}`).join(' · '))
        const fab = p.getByRole('button', { name: 'Maison AI' })
        const fb = (await fab.count()) ? await box(fab) : null
        const hit = fb && boxes.some((x) => !(fb.r <= x.l || fb.l >= x.r || fb.b <= x.t || fb.t >= x.b))
        ok(!hit, `${size} · ${label}: the Maison AI button never sits on a move`, fb ? `fab ${Math.round(fb.l)},${Math.round(fb.t)}` : '')
        ok(await sideways(p) <= 0, `${size} · ${label}: no sideways scroll`)
        if (size === '390' && label === 'planned') await shot(p, 'b1-room-foot-390')
        if (size === '320' && label === 'planned') await shot(p, 'b2-room-foot-320')
      }
      /* a move answers its tap: the planned meeting's invitation opens its dialog (nothing is sent) */
      if (PLANNED && size === '390') {
        await go(p, `/meetings/${PLANNED}`, 1800)
        const invite = p.getByTestId('room-invite')
        if (await invite.count()) {
          await tap(p, invite); await p.waitForTimeout(800)
          ok(await p.getByRole('dialog').count() > 0, '390: a tap on the invitation opens its dialog')
          await p.keyboard.press('Escape'); await p.waitForTimeout(300)
        }
      }
      await c.close()
    }
    {
      const c = await ctx('768'); const p = await page(c)
      await go(p, `/meetings/${PLANNED}`, 1800)
      const pr = await p.getByTestId('room-foot').evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))
      ok(pr >= 48 + 24, '768: the tablet’s foot keeps the corner the Maison AI button rests in', `${pr}`)
      await c.close()
      const d = await ctx('1440'); const q = await page(d)
      await go(q, `/meetings/${PLANNED}`, 1800)
      ok(await q.getByTestId('room-foot').count() === 0 && await q.getByTestId('room-start').count() > 0, '1440: no foot — the head holds the moves, as drawn')
      await d.close()
    }

    /* ── C · W2-04 /tasks' to-do chips on a phone ── */
    console.log('C · /tasks’ to-do chips on a phone')
    for (const size of ['320', '390']) {
      const c = await ctx(size); const p = await page(c)
      await go(p, '/tasks', 1800)
      const pill = p.locator('[class*="tasks-toolbar-module"][class*="scopeWrap"] [class*="scope-pill-module"][class*="__pill"]').first()
      const chips = p.getByTestId('task-todos').locator('button')
      const n = await chips.count()
      const pb = await box(pill)
      const vw = SIZE[size].viewport.width
      let whole = n > 0, below = n > 0, top = n > 0
      for (let i = 0; i < n; i++) { const x = await box(chips.nth(i)); if (x.l < 0 || x.r > vw) whole = false; if (x.t < pb.b) below = false; if (!(await onTop(chips.nth(i)))) top = false }
      ok(whole, `${size}: every to-do chip is whole on the screen (${n})`)
      ok(below, `${size}: the chips stand on a line of their own under the pill`)
      ok(top, `${size}: each chip is on top where it is drawn (nothing over it)`)
      if (n) {
        await tap(p, chips.first()); await p.waitForTimeout(700)
        ok(await chips.first().getAttribute('aria-pressed') === 'true', `${size}: a tap selects the first chip`)
        await tap(p, chips.first()); await p.waitForTimeout(500)
      }
      if (size === '320') await shot(p, 'c1-tasks-chips-320')
      await c.close()
    }
    /* the loader's ghost draws the chips where the page does (REG-708) — the held reveal, as verify-pm2-s17 measures it */
    {
      const c = await b.newContext({ ...SIZE['390'] })
      await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const p = await c.newPage()
      await p.goto(BASE + '/tasks', { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2200)
      const m = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        if (!reveal) return null
        const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
        if (!ghost || !content) return null
        const at = (root, sel) => { const el = root.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)] }
        return { g: at(ghost, '[class*="tasks-toolbar-module__"][class*="__todos"]'), q: at(content, '[class*="tasks-toolbar-module__"][class*="__todos"]') }
      })
      ok(m && m.g && m.q && Math.abs(m.g[0] - m.q[0]) <= 4 && Math.abs(m.g[1] - m.q[1]) <= 4, '390: the ghost draws the chips’ line where the page does', m ? JSON.stringify(m) : 'no held reveal')
      await c.close()
    }

    /* ── D · W2-02 the lead's MY TASKS lines below 1440 ── */
    console.log('D · the lead’s MY TASKS lines')
    {
      const c = await ctx('1280'); const p = await page(c)
      await go(p, `/leads/${KEVIN}`)
      const cut = await p.locator('[class*="my-work-card-module"][class*="__meta"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.slice(0, 40)))
      ok(cut.length === 0, '1280: no MY TASKS line is cut', cut.join(' · '))
      await c.close()
      const d = await ctx('1440'); const q = await page(d)
      await go(q, `/leads/${KEVIN}`)
      const tall = await q.locator('[class*="my-work-card-module"][class*="__meta"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
      ok(tall.length > 0 && tall.every((h) => h <= 16), '1440: each line stands on one line, as drawn', tall.join(','))
      await d.close()
    }

    /* ── E · W2-03 a touch tablet's Members cells ── */
    console.log('E · a touch tablet’s Members cells')
    {
      const c = await ctx('768'); const p = await page(c)
      await go(p, '/leads?view=table')
      const cut = await p.locator('[data-kb="assign"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 30)))
      ok(cut.length === 0, '768: every Members cell holds its avatars, its +n and its Assign glyph', cut.join(' · '))
      await c.close()
    }

    /* ── F · W2-05 the imports' search ── */
    console.log('F · the imports’ search')
    for (const [size, px] of [['390', 16], ['768', 16], ['1440', 14]]) {
      const c = await ctx(size); const p = await page(c)
      await go(p, '/leads/imports')
      const fs2 = await p.getByPlaceholder(/Search imports|Search file name/i).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      ok(fs2 === px, `${size}: the search types at ${px}`, String(fs2))
      await c.close()
    }

    /* ── G · the presses under a finger ── */
    console.log('G · the presses under a finger')
    /* a finger's 44: the control's own box, or — where an invisible overlay carries the target (REG-344) — a tap 20 above and 20 below its line's
       middle still lands on it (the real hit test, never a measured pseudo box) */
    const tall44 = async (p, sel, label) => {
      const res = await p.locator(sel).evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => {
        const r0 = e.getBoundingClientRect(); if (r0.height >= 44) return Math.round(r0.height)
        e.scrollIntoView({ block: 'center', inline: 'nearest' })   // a finger taps what is on the screen
        const r = e.getBoundingClientRect()
        const x = r.left + Math.min(r.width / 2, 20), mid = r.top + r.height / 2
        const on = (y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) }
        return on(mid - 20) && on(mid + 20) ? 44 : Math.round(r.height)
      }))
      ok(res.length > 0 && res.every((h) => h >= 44), `${label} (${res.length})`, res.join(','))
    }
    {
      const c = await ctx('390'); const p = await page(c)
      await go(p, '/tasks', 1800)
      await tap(p, p.getByTestId('task-card-name').first()); await p.waitForTimeout(900)
      await tall44(p, '[data-testid="panel-for"] a', '390: the task panel’s lead is 44 tall')
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await go(p, '/meetings', 1800)
      await tall44(p, '[class*="meetings-table-module"][class*="__leadLink"]', '390 /meetings: a card’s lead is 44 tall')
      const ml = p.locator('[class*="meetings-table-module"][class*="__leadLink"]').first()
      const mh = (await ml.getAttribute('href')).split('?')[0]
      await tap(p, ml); await p.waitForURL((u) => u.pathname === mh, { timeout: 8000 }).catch(() => {})
      ok(new URL(p.url()).pathname === mh, '…and a tap on it opens the lead, not the meeting')
      await go(p, '/qanvast-ops')
      const copies = await p.locator('[class*="qanvast-leads-module"][class*="__copyBtn"]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return Math.min(Math.round(r.width), Math.round(r.height)) }))
      ok(copies.length > 0 && copies.every((s) => s >= 44), `390 Qanvast Ops: the copy glyph is a 44 square (${copies.length})`, copies.join(','))
      await go(p, '/qanvast-ops/hangouts')
      await tall44(p, '[class*="hangouts-module"][class*="__nameLink"]', '390 Hangouts: a Hangout’s name is 44 tall')
      await tall44(p, '[class*="hangouts-module"][class*="__factLink"]', '390 Hangouts: the venue is 44 tall')
      await go(p, '/qanvast-ops/reviews')
      const side = p.locator('[class*="account-module"][class*="__sideLinks"] > *')
      if (await side.count() >= 2) {
        const a = await box(side.nth(0)), b2 = await box(side.nth(1))
        const reach = await side.nth(0).evaluate((el) => { const r = el.getBoundingClientRect(); const on = (y) => { const h = document.elementFromPoint(r.left + 20, y); return !!h && (h === el || el.contains(h)) }; return [on(r.top + r.height / 2 - 20), on(r.top + r.height / 2 + 20), on(r.bottom - 2)] })
        ok(reach[0] && reach[1], '390 Reviews: “See every review on Qanvast” takes a tap 20 above and below its line')
        ok(reach[2] && a.b <= b2.t + 1, '…its own line to its foot, the press under it never over it')
      } else ok(false, 'the reviews’ two side presses')
      if (PAGE) {
        await go(p, `/hangout/${PAGE}`)
        await tall44(p, '[class*="public-module"][class*="__placeLink"], [class*="meeting-link-page-module"][class*="__placeLink"]', '390 the public Hangout page: the venue is 44 tall')
      }
      if (FILES.length >= 2) {
        await go(p, `/leads/${KEVIN}/files/${FILES[0]}`)
        const items = p.locator('[class*="file-viewer-module"][class*="__stripItem"]')
        const sizes = await items.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
        ok(sizes.length >= 2 && sizes.every((w) => w >= 44), `390 the viewer’s strip: each file a 48 square (${sizes.join(',')})`)
        const before = new URL(p.url()).pathname
        await tap(p, p.locator('[class*="file-viewer-module"][class*="__stripItem"]:not([aria-current="true"])').first()); await p.waitForTimeout(1200)
        const after = new URL(p.url()).pathname
        ok(after !== before && FILES.some((f) => after.endsWith(f)), '…and a tap on another file opens it', `${before} → ${after}`)
      }
      await c.close()
    }
    {
      /* the client's meeting link: set here, put back at the end */
      if (PLANNED) sql(`update meetings set client_token = 'rwd-w2-invite' where id = '${PLANNED}'`)
      const c = await ctx('390'); const p = await page(c)
      await go(p, '/meeting/rwd-w2-invite')
      await tall44(p, '[class*="meeting-link-page-module"][class*="__placeLink"]', '390 the client’s meeting link: the place is 44 tall')
      await c.close()
    }
    {
      const c = await ctx('768'); const p = await page(c)
      await go(p, '/meetings', 1800)
      await tall44(p, '[data-testid="meeting-title"]', '768 /meetings: a row’s meeting name is 44 tall')
      await tall44(p, '[class*="meetings-table-module"][class*="__leadLink"]', '768 /meetings: a row’s lead is 44 tall')
      await go(p, '/tasks', 1800)
      await tall44(p, '[class*="tasks-table-module"][class*="__leadLink"]', '768 /tasks: the For column’s lead is 44 tall')
      await go(p, '/qanvast-ops/credits')
      await tall44(p, '[class*="account-module"][class*="__leadLink"]', '768 Lead credits: a month is 44 tall')
      await go(p, `/leads/${KEVIN}`)
      const after = await p.locator('[class*="info-column-module"][class*="__headLink"]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => Math.round(parseFloat(getComputedStyle(e, '::after').height) || e.getBoundingClientRect().height + 28)))
      ok(after.length > 0 && after.every((h) => h >= 44), `768 the lead’s info column: its links’ boxes are 44 (${after.join(',')})`)
      if (FILES.length) {
        await go(p, `/leads/${KEVIN}/files/${FILES[0]}`)
        const sizes = await p.locator('[class*="file-viewer-module"][class*="__stripItem"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
        ok(sizes.length > 0 && sizes.every((w) => w >= 44), `768 the viewer’s strip: each file a 48 square (${sizes.join(',')})`)
      }
      await c.close()
    }

    /* ── H · W2-16 a Hangout's How it went on a phone ── */
    console.log('H · a Hangout’s How it went on a phone')
    for (const size of ['320', '390']) {
      if (!EVENT) { ok(false, 'a Hangout the studio took part in'); break }
      const c = await ctx(size); const p = await page(c)
      await go(p, `/qanvast-ops/hangouts/${encodeURIComponent(EVENT)}?view=results`)
      const heads = await p.locator('[class*="hangouts-module"][class*="__byHead"] > *').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, e.scrollWidth <= e.clientWidth + 1] }))
      const apart = heads.length >= 5 && heads.every((h, i) => i === 0 || heads[i - 1][1] <= h[0] + 0.5) && heads.every((h) => h[2])
      ok(apart, `${size}: the By designer heads stand apart, each whole`)
      const t = p.locator('[class*="hangouts-module"][class*="__byTable"]').first()
      const scrolls = await t.evaluate((el) => el.scrollWidth > el.clientWidth && /(auto|scroll)/.test(getComputedStyle(el).overflowX))
      ok(scrolls, `${size}: the table scrolls sideways in its own frame`)
      const names = await p.getByTestId('by-designer-row').evaluateAll((rows) => rows.map((r) => { const n = r.firstElementChild; const t = n && [...n.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim().length > 1); return t ? t.scrollWidth <= t.clientWidth + 1 : true }))
      ok(names.length > 0 && names.every(Boolean), `${size}: each designer’s name is whole`)
      ok(await sideways(p) <= 0, `${size}: the page never scrolls sideways`)
      if (size === '390') await shot(p, 'h1-hangout-results-390')
      await c.close()
    }

    /* ── I · 320 and 844×390: no lane page scrolls sideways ── */
    console.log('I · no sideways scroll at 320 and 844×390')
    const ROUTES = ['/leads', '/leads?view=kanban', '/leads/imports', `/leads/${KEVIN}`, ...['tasks', 'quotes', 'contracts', 'files', 'notes', 'meetings', 'questionnaire', 'activity'].map((t) => `/leads/${KEVIN}/${t}`),
      '/tasks', '/tickets', '/chat', '/dashboard', '/meetings', PLANNED && `/meetings/${PLANNED}`, HELD && `/meetings/${HELD}`, '/meeting/rwd-w2-invite',
      '/qanvast-ops', '/qanvast-ops/studios', '/qanvast-ops/hangouts', EVENT && `/qanvast-ops/hangouts/${encodeURIComponent(EVENT)}`, '/qanvast-ops/credits', '/qanvast-ops/reviews', PAGE && `/hangout/${PAGE}`].filter(Boolean)
    for (const size of ['320', 'sideways']) {
      const c = await ctx(size); const p = await page(c)
      const over = []
      for (const r of ROUTES) { await go(p, r, 1200); const s = await sideways(p); if (s > 0) over.push(`${r} ${s}`) }
      ok(over.length === 0, `${size === 'sideways' ? '844×390' : size}: none of the ${ROUTES.length} lane pages scrolls sideways`, over.join(' · '))
      await c.close()
    }

    /* ── J · 1440: the desk as drawn ── */
    console.log('J · 1440 — the desk as drawn')
    {
      const c = await ctx('1440'); const p = await page(c)
      await go(p, '/leads?view=table')
      await p.getByRole('button', { name: /^Assign members to / }).first().hover()
      await p.getByRole('button', { name: /^Assign members to / }).first().click(); await p.waitForTimeout(600)
      ok(await dialogNamed(p, 'Assign Member').evaluate((el) => getComputedStyle(el).maxHeight) === '440px', '1440: the Assign card keeps its 440')
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await p.getByRole('button', { name: /^Filters/ }).first().click(); await p.waitForTimeout(600)
      ok(await dialogNamed(p, 'Filters').locator('[class*="filters-modal-module__"][class*="__rail"]').first().evaluate((el) => getComputedStyle(el).overflowY) === 'visible', '1440: the Filters rail is drawn, not a scroller')
      await p.keyboard.press('Escape'); await p.waitForTimeout(300)
      await p.getByRole('button', { name: 'More options' }).first().click(); await p.waitForTimeout(400)
      await p.getByRole('menuitem', { name: /Deleted Leads/ }).click(); await p.waitForTimeout(800)
      ok(await p.getByRole('dialog').last().evaluate((el) => Math.round(el.getBoundingClientRect().height)) >= 480, '1440: Deleted Leads keeps its 480 floor')
      await c.close()
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 300))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    console.log(`  ${stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0 ? '✓ the leads’ stages and stage logs are as found' : '✗ the leads’ stages or stage logs changed'}`)
    console.log(`  ${hashOf('meetings') === before.get('meetings') ? '✓ the meetings are as found' : '✗ the meetings changed'}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
