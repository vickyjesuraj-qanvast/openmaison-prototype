// Pending modules, S43E · F3 — walk what nobody walked (s42/pending-ledger.md F3-01…F3-07; the walk: s42/walk-F3-2026-10-15.md). Each fix
// asserted as the rule it now holds, never another round's count:
//  1 · W1-01 a finger on a refused control says its reason (REG-273's second channel, the snackbar): Hui Min's Members at 390 touch — a tap on
//      the Owner's greyed Deactivate says "Only an Owner deactivates an Owner", a tap on the greyed Role its own, one keyed snackbar; a mouse still
//      reads the tooltip on hover at 1440
//  2 · W1-03 Members at 768 touch: no preferences summary cut ("No …"); 1440 keeps REG-614's one line
//  3 · W2-01 the Won step's signed contract: a drop that carries no file shows no contract; a real PDF still lands
//  4 · W2-02 the template editor's name says it is cut (an ellipsis)
//  5 · W3-01 a kept recording plays in Files (an audio player above Download, the mic glyph)
//  6 · W3-02 a project's Money › Billing head at 390: the help line keeps a readable width beside the view chips; 1440 keeps one row
//  7 · W3-03 Walk starts looking down the room, not into the nearer wall (WebGL on through SwiftShader)
//  8 · W3-04 a project's, a lead's and Qanvast Ops' ghost tab strips stand at the open tab at 390 touch (held reveal)
//  9 · W4-01 Rebuild the schedule from an uploaded quote: its worded sections find their stages; no Done stage is offered to go
// 10 · W5-01 the Marketplace's Add to Price book guesses a category only when the brand's categories agree
// 11 · no page errors; nothing sideways at 390 / 320 against screen.width
// 12 · W6-01 Marketing's own words on Your profile (never Accounting's "invoices, orders and payments") — the page and its ghost
// 13 · W6-02 the rail's Tasks offers Leads · Projects only to a role that opens projects (Marketing: none; Dane: both)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s43e.cjs <scratch.db> [shotDir] [base]   (ONLY=1,3 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 's43e')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const ROOT = path.resolve(__dirname, '..', '..', '..')
const UAT = path.join(ROOT, 'public', 'uat-files')
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

const PJ2 = sql(`select id from projects where number = 'P-2026-002'`)
const KEVIN = sql(`select id from leads where name = 'Kevin Ng'`)
const HARPREET = sql(`select id from leads where name = 'Harpreet Kaur'`)
const WHOLE = ['lead_files', 'lead_file_images', 'lead_events', 'notifications', 'notification_outbox', 'studio_credit_balances', 'credit_ledger', 'nudge_state', 'price_book_items', 'project_milestones']

/* the held reveal (S17's probe): PageReveal's ghost stays over the page when its first paint is faked days away — both are in the DOM to read */
async function held(b, opts, url, fn) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2600)
  const out = await p.evaluate((src) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    // eslint-disable-next-line no-new-func
    return new Function('ghost', 'content', src)(ghost, content)
  }, fn)
  await c.close()
  return out
}
/* the open tab in the page's strip and the ghost's bone at the same place in its strip */
const STRIP = `
  const t = content.querySelector('[role="tablist"]'); if (!t) return { page: null }
  const tabs = [...t.querySelectorAll('[role="tab"]')].length ? [...t.querySelectorAll('[role="tab"]')] : [...t.querySelectorAll('a, button')]
  const idx = tabs.findIndex((e) => e.getAttribute('aria-selected') === 'true' || e.getAttribute('aria-current') === 'page')
  const r = tabs[idx] ? tabs[idx].getBoundingClientRect() : null
  const g = ghost.querySelector('[class*="ghost-kit-module__"][class*="__tabs"]')
  let gb = null
  if (g) { const bones = g.querySelector('[class*="__tabsRow"]') ? [...g.querySelectorAll('[class*="__tabBone"]')] : [...g.children]; const q = bones[idx] ? bones[idx].getBoundingClientRect() : null; gb = q ? (q.left + q.right) / 2 : null }
  return { idx, page: r ? (r.left + r.right) / 2 : null, ghost: gb }`

;(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const errors = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.setDefaultTimeout(12000); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')

  const you0 = sql(`select id from members where is_you = 1`)
  const kept = WHOLE.map((t) => [t, snapshot(t)])
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let t = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [tb, rows] of kept) t += `DELETE FROM ${tb};\n${rows}\n`
    t += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    runSql(t)
  }

  try {
    ok(!!PJ2 && !!KEVIN && !!HARPREET, 'the demo holds P-2026-002, Kevin Ng and Harpreet Kaur (Quote Sent)')

    // ── 1 · W1-01 a finger on a refused control says why ─────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Members — a tap on a refused control shows its reason')
      as('huimin')
      const C = await b.newContext(phoneOpts()); const p = await page(C, 'hm-390')
      await go(p, '/company/members', 1800)
      const row = p.getByTestId('member-row').filter({ has: p.locator('[class*="__name"]').filter({ hasText: /^Dane/ }) })
      const btn = row.getByRole('button', { name: 'Deactivate' })
      ok(await btn.count() === 1 && await btn.isDisabled(), 'Hui Min (an Admin) sees the Owner’s Deactivate refused')
      const snack = async () => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
      await btn.scrollIntoViewIfNeeded(); const bb = await btn.boundingBox()
      await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await settle(p, 700)
      ok(/Only an Owner deactivates an Owner/.test(await snack()), `390 touch: a tap on it says the reason in the snackbar — REG-273's second channel (“${(await snack()).slice(0, 80)}”)`)
      await shot(p, '01-refused-tap-390')
      const role = row.getByTestId('member-role'); const rb = await role.boundingBox()
      await p.touchscreen.tap(rb.x + 40, rb.y + rb.height / 2); await settle(p, 700)
      ok(await p.locator('[data-om-snackbar]').count() === 1 && (await snack()).length > 0 && !/Only an Owner deactivates/.test(await snack()), `the refused Role says its own reason — one snackbar, replaced in place (“${(await snack()).slice(0, 80)}”)`)
      await C.close()
      /* a tooltip that only names its control ("Undo" on the Items table's greyed Undo) is no reason — a tap says nothing */
      as('dane')
      const T = await b.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const t = await page(T, 'undo-768')
      await go(t, `/quotes/${sql(`select id from quotes where number = 'OM-10001'`)}`, 2600)
      const undo = t.getByRole('button', { name: 'Undo', exact: true }).first()
      if (await undo.count() && await undo.isVisible()) {
        await undo.scrollIntoViewIfNeeded(); const ub = await undo.boundingBox()
        await t.touchscreen.tap(ub.x + ub.width / 2, ub.y + ub.height / 2); await settle(t, 700)
        const said = (await t.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).map((x) => x.replace(/\s+/g, ' ').replace(/\s*close\s*$/, '').trim())
        ok(!said.includes('Undo'), `a greyed control whose tooltip only names it says nothing on a tap (${said.join(' | ') || 'no snackbar'})`)
      }
      await T.close()
      as('huimin')
      const D = await b.newContext(opts()); const d = await page(D, 'hm-1440')
      await go(d, '/company/members', 1800)
      const dRow = d.getByTestId('member-row').filter({ has: d.locator('[class*="__name"]').filter({ hasText: /^Dane/ }) })
      await dRow.getByRole('button', { name: 'Deactivate' }).hover({ force: true }); await settle(d, 700)
      ok(/Only an Owner deactivates an Owner/.test(await text(d.locator('[role="tooltip"]'))), '1440 with a mouse: hovering it says the same, as before')
      await D.close()
      as('dane')
    }

    // ── 2 · W1-03 Members' summary at 768 ──────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Members — the preferences summary at 768 touch')
      as('dane')
      const C = await b.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const p = await page(C, 'm768')
      await go(p, '/company/members', 1800)
      const cut = await p.locator('[class*="__prefSummary"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent))
      ok(cut.length === 0, `768 touch: no summary is cut (${cut.length ? cut.join(' | ') : 'none'})`)
      ok(await sideways(p) <= 0, `768: nothing sideways (${await sideways(p)})`)
      await shot(p, '02-members-768')
      await C.close()
      const D = await b.newContext(opts()); const d = await page(D, 'm1440')
      await go(d, '/company/members', 1800)
      ok((await d.locator('[class*="__prefSummary"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).whiteSpace))).every((w) => w === 'nowrap'), '1440 keeps the one line (REG-614)')
      await D.close()
    }

    // ── 3 · W2-01 the Won step's signed contract ─────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Move stage › Won — a drop with no file is no contract')
      as('dane')
      const C = await b.newContext(opts()); const p = await page(C, 'won')
      await go(p, `/leads/${HARPREET}`, 1800)
      await p.locator('[data-testid="header-primary"] button').click(); await settle(p, 1000)
      const wiz = p.locator('[role="dialog"][aria-label="Move stage"]')
      const tabs = wiz.getByRole('tab', { name: 'Upload' })
      ok(await wiz.count() === 1 && await tabs.count() >= 2, 'Harpreet Kaur’s Won step opens with its two Upload tabs')
      await tabs.nth(1).click(); await settle(p, 400)
      const zone = wiz.locator('[role="button"]').filter({ hasText: /Drop your file/ }).last()
      await zone.evaluate((el) => { const dt = new DataTransfer(); dt.setData('text/plain', 'a link, not a file'); el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })) }); await settle(p, 2200)
      ok(!/_signed\.pdf/i.test(await text(wiz)) && await zone.count() === 1, 'a drop that carries no file shows no signed contract — the box waits for a file')
      await wiz.locator('input[type="file"]').last().setInputFiles(path.join(UAT, 'gerald-tan-signed-contract.pdf')); await settle(p, 2400)
      ok(/_signed\.pdf|signed/i.test(await text(wiz)) && await wiz.locator('[role="button"]').filter({ hasText: /Drop your file/ }).count() < 2, 'a real PDF still lands as the signed contract')
      await shot(p, '03-won-contract')
      await p.keyboard.press('Escape'); await settle(p, 600)
      const discard = p.getByRole('button', { name: /^Discard|^Leave without saving/ }); if (await discard.count()) { await discard.first().click(); await settle(p, 500) }
      ok(sql(`select stage from leads where id = '${HARPREET}'`) === 'Quote Sent', 'nothing saved — Harpreet stays in Quote Sent')
      await C.close()
    }

    // ── 4 · W2-02 the template editor's name ────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · the template editor — a cut name says so')
      as('dane')
      const C = await b.newContext(opts()); const p = await page(C, 'tpl')
      await go(p, `/templates/${sql(`select id from quote_templates where is_default = 1 and deleted_at is null`)}`, 2500)
      ok(await p.getByLabel('Template name').evaluate((e) => getComputedStyle(e).textOverflow) === 'ellipsis', 'the name’s box ends a cut name with an ellipsis')
      await C.close()
    }

    // ── 5 · W3-01 a kept recording plays ──────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Files — a kept recording plays')
      as('dane')
      const sr = 8000, n = sr, wav = Buffer.alloc(44 + n * 2); wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40)
      const C = await b.newContext(opts()); const p = await page(C, 'audio')
      await go(p, `/leads/${KEVIN}/files`, 1800)
      await p.locator('input[type="file"]').first().setInputFiles({ name: 'site-visit.wav', mimeType: 'audio/wav', buffer: wav }); await settle(p, 3500)
      const f = one(`select id, mime from lead_files where lead_id = '${KEVIN}' and name = 'site-visit.wav' order by created_at desc limit 1`)
      ok(!!f && /^audio\//.test(f.mime ?? ''), 'a WAV dropped in Files is kept as sound', JSON.stringify(f))
      if (f) {
        await go(p, `/leads/${KEVIN}/files/${f.id}`, 2000)
        ok(await p.getByTestId('viewer-audio').count() === 1 && await p.getByTestId('viewer-doc').getByRole('button', { name: 'Download' }).count() === 1, 'the viewer plays it — an audio player above Download')
        ok(/^mic/.test((await text(p.getByTestId('viewer-doc'))).trim()), 'its glyph is the microphone')
        await shot(p, '05-recording-1440')
      }
      await C.close()
    }

    // ── 6 · W3-02 Money › Billing's head at 390 ────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · a project’s Money — the Billing head at 390')
      as('dane')
      const C = await b.newContext(phoneOpts()); const p = await page(C, 'bill-390')
      await go(p, `/projects/${PJ2}/money`, 2400)
      const titles = p.locator('[data-testid="money-stages"] [class*="__sectionTitles"]').first()
      await titles.scrollIntoViewIfNeeded()
      const w = await titles.evaluate((e) => Math.round(e.getBoundingClientRect().width))
      ok(w >= 200, `390: the help line keeps a readable width beside the view chips (${w}px)`)
      ok(await sideways(p) <= 0, '390: nothing sideways')
      await shot(p, '06-billing-390')
      await C.close()
      const D = await b.newContext(opts()); const d = await page(D, 'bill-1440')
      await go(d, `/projects/${PJ2}/money`, 2400)
      const g = await d.locator('[data-testid="money-stages"] [class*="__sectionHead"]').first().evaluate((h) => { const t = h.children[0].getBoundingClientRect(), x = h.children[1].getBoundingClientRect(); return { sameRow: x.top < t.bottom, tw: Math.round(t.width) } })
      ok(g.sameRow, `1440: the titles and the tools share one row, as before (titles ${g.tw}px)`)
      await D.close()
    }

    // ── 7 · W3-03 Walk starts looking down the room ─────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · the Space Planner’s Walk — where it starts')
      as('dane')
      const LAY = sql(`select id from space_layouts where name like 'Showroom%' and deleted_at is null limit 1`)
      const C = await b.newContext(opts()); const p = await page(C, 'walk')
      await go(p, `/planner/${LAY}`, 3500)
      await p.locator('button, [role="radio"], [role="tab"]').filter({ hasText: /^\s*Walk\s*$/ }).first().click(); await settle(p, 2500)
      const shotBuf = await p.locator('canvas').first().screenshot()
      const tones = await p.evaluate(async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement('canvas'); c.width = 48; c.height = 48; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 48); const d = x.getImageData(0, 0, 48, 48).data; const s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`); return s.size }, shotBuf.toString('base64'))
      ok(tones >= 6, `Walk opens on the room, not one flat wall (${tones} tones in its first view)`)
      await shot(p, '07-walk-1440')
      await C.close()
    }

    // ── 8 · W3-04 the ghosts' tab strips at 390 ─────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · the ghosts’ tab strips stand at the open tab (390 touch)')
      as('dane')
      for (const url of [`/projects/${PJ2}/money`, `/projects/${PJ2}/files`, `/leads/${KEVIN}/meetings`, '/qanvast-ops/reviews', '/qanvast-ops/hangouts']) {
        const r = await held(b, phoneOpts(), url, STRIP)
        ok(!r.none && r.page !== null && r.ghost !== null && Math.abs(r.ghost - r.page) <= 40, `${url}: the ghost’s open tab sits where the page’s does (ghost ${r.ghost == null ? '—' : Math.round(r.ghost)} · page ${r.page == null ? '—' : Math.round(r.page)})`)
      }
    }

    // ── 9 · W4-01 Rebuild the schedule from an uploaded quote ────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Rebuild the schedule — an uploaded quote’s worded sections')
      as('dane')
      const C = await b.newContext(opts()); const p = await page(C, 'rebuild')
      await go(p, `/projects/${PJ2}/schedule`, 2400)
      await p.getByTestId('schedule-kebab').click(); await settle(p, 500)
      await p.getByRole('menuitem', { name: /Rebuild the schedule/ }).click(); await settle(p, 1000)
      const d = p.getByRole('dialog').last()
      await d.locator('input[type="file"]').first().setInputFiles(path.join(UAT, 'urban-nest-competitor-quote.pdf')); await settle(p, 4500)
      const up = d.getByText('An uploaded quote').first(); if (await up.count()) { await up.click(); await settle(p, 800) }
      const all = await text(d)
      const doneGone = json(`select title from project_milestones where project_id = '${PJ2}' and status = 'done' and deleted_at is null`).map((m) => m.title).filter((n) => new RegExp(`${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^·]*?TAKEN OFF`, 'i').test(all))
      ok(/uploaded quote/i.test(all) && /23 lines read/.test(all), 'the PDF reads: 23 lines, its sections')
      ok(doneGone.length === 0, `no Done stage is offered to go (${doneGone.join(', ') || 'none'})`)
      ok(/Carpentry fabrication/.test(all) && /Electrical & plumbing/.test(all) && /Painting/.test(all), 'its Carpentry · Wet & Plumbing · Painting works find their stages')
      await shot(p, '09-rebuild-upload')
      await d.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 600)
      await C.close()
    }

    // ── 10 · W5-01 Add to Price book's category ─────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · the Marketplace — Add to Price book’s category')
      as('dane')
      const C = await b.newContext(opts()); const p = await page(C, 'mk')
      const categoryOf = async (brandId) => {
        await go(p, `/marketplace/${brandId}`, 2000)
        await p.getByRole('button', { name: /Add to Price book/ }).first().click(); await settle(p, 900)
        const d = p.getByRole('dialog').last()
        const v = await d.getByLabel('Category').first().evaluate((e) => (e.value ?? e.textContent ?? '').trim()).catch(() => '')
        const t = await text(d)
        await d.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
        return v || t
      }
      const two = sql(`select id from marketplace_brands where name = 'Rattan Row'`)
      const single = sql(`select id from marketplace_brands where categories = '["Flooring"]' limit 1`)
      const c2 = await categoryOf(two)
      ok(/No category/.test(c2) && !/^Electrical$/.test(c2), `Rattan Row (Furniture · Lighting): no guess — the studio picks (${c2.slice(0, 40)})`)
      if (single) { const c1 = await categoryOf(single); ok(/Flooring/.test(c1), `a flooring brand still starts on Flooring (${c1.slice(0, 40)})`) }
      await C.close()
    }

    // ── 11 · widths ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · nothing sideways at 390 and 320')
      as('dane')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const C = await b.newContext(phoneOpts(w, h)); const p = await page(C, `w${w}`)
        for (const u of ['/company/members', `/projects/${PJ2}/money`, `/projects/${PJ2}/schedule`, '/marketplace']) { await go(p, u, 1400); ok(await sideways(p) <= 0, `${w}: ${u} — nothing sideways (${await sideways(p)})`) }
        await C.close()
      }
    }


    // ── 12 · W6-01 Marketing's words on Your profile ───────────────────────────────────────────────────────────────────────────
    if (want(12)) {
      console.log('12 · Your profile — Marketing’s own words')
      as('nurul')
      const C = await b.newContext(opts()); const p = await page(C, 'nurul-profile')
      await go(p, '/profile', 1800)
      const help = await text(p.locator('main p').filter({ hasText: /Your name and photo show/ }))
      ok(/the leads you add and the members you put on them/.test(help) && !/invoices, orders and payments/.test(help), `Nurul (Marketing): her name shows on the leads she adds (“${help.slice(0, 90)}”)`)
      const mail = await text(p.locator('main').getByText(/sign in with it|Shown on the papers|Printed as/).first())
      ok(/sign in with it/.test(mail), `…and her email is her way in, not a paper's (“${mail}”)`)
      await shot(p, '12-profile-marketing')
      await C.close()
      const g = await held(b, opts(), '/profile', `return { g: (ghost.textContent || '').includes('the leads you add and the members you put on them'), wrong: (ghost.textContent || '').includes('invoices, orders and payments') }`)
      ok(!g.none && g.g && !g.wrong, 'the ghost says the same words as the page', JSON.stringify(g))
      as('priya')
      const A = await b.newContext(opts()); const a = await page(A, 'priya-profile')
      await go(a, '/profile', 1800)
      ok(/invoices, orders and payments you handle/.test(await text(a.locator('main p').filter({ hasText: /Your name and photo show/ }))), 'Accounting keeps its own words')
      await A.close()
      as('dane')
    }

    // ── 13 · W6-02 Tasks' Leads · Projects ─────────────────────────────────────────────────────────────────────────────────────
    if (want(13)) {
      console.log('13 · Tasks — Leads · Projects only where projects open')
      for (const [who, expect] of [['nurul', 0], ['dane', 1]]) {
        as(who)
        const C = await b.newContext(opts()); const p = await page(C, `tasks-${who}`)
        await go(p, '/tasks', 1800)
        const n = await p.getByRole('radio', { name: /^Projects$/ }).count()
        ok(expect ? n >= 1 : n === 0, `${who}: ${expect ? 'Leads · Projects is offered' : 'no Projects choice — Marketing opens no project'} (${n})`)
        await C.close()
      }
      as('dane')
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 400))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    console.log(`  ${stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0 ? '✓ the leads’ stages and stage logs are as found' : '✗ the leads’ stages or stage logs changed'}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
