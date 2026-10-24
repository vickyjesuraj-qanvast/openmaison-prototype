// Leads on the move, L3 · the listing and the ways a lead arrives (his marks 2026-10-23 on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh —
// Build on every proposal and fix, every question as recommended; "continue the leads"; the brief
// `design-source/context/responsive/leads-on-the-move-2026-10-23/brief.md`, L3's row). Each rule asserted as the rule it builds, never another
// round's count; every new press pressed for real (a tap at 390 · 768 · 1024 under touch, a click at 1440), on the production build:
//  0 · the pure words and rules (rl-l3-pure.mts): Last · Next · Lost lines, the due presets, "to call today", the tablet set, a pasted message.
//  1 · P-05 at 390 — the card says who to call now: the new mark on an unseen lead (band + New) and on no other; three items on the info line,
//      WhatsApp beside the number (wa.me, a 44 box that answers); the name's box and the number's never share a pixel (A-05); Last on every
//      card, Next red once late; the foot leads with the stage pill and nothing that takes a press sits under the Maison AI button (A-02); "n to
//      call today" scopes the list and the address keeps it; Lost cards say why and when, with no Overdue tag (A-28).
//  2 · P-05 · Q-05 · A-06 · A-07 · A-08 at 390 — the stage sheet leads with the next move (Move to Contacted opens the Move stage window); on a
//      lead with nobody, its reason and the fix: Assign → the Assign sheet names the lead → Assign → the Move stage window at Contacted; a locked
//      row says why in the row; the Tasks sheet's due presets add a task due tomorrow at 10 (A-09). Everything written is put back.
//  3 · A-11 at 390 — Filters is one sheet of chip groups; Done says "Show n leads", n = the cards the list then shows; the search types at 16.
//  4 · P-08 · A-17…A-20 at 390 — a new lead is a name and a mobile (autocomplete, 16), Paste the WhatsApp message fills the rest by rule (the box
//      when the clipboard can't be read), More details folded, one Add lead; ✕ asks before typed words go; the duplicate dialog's filled answer
//      is Open existing lead; the new lead opens on its own page.
//  5 · P-08 · B-21 at 768 touch — Edit details is a short list (Contact · Property · Budget & source · People), a row opens its screen, ← returns,
//      a change saves; ✕ with a change asks.
//  6 · P-06 · A-12 · A-13 · A-14 · A-15 · A-30 at 768 / 1024 touch — the table's tablet set (Name · Stage · Last contact · Next follow-up ·
//      Members), Edit and ⋮ frozen in view, one 64 row; Column settings' handle and pin answer 44 and save to the tablet's own key; the kanban
//      card's stage pill opens the menu with the next move, its ⋮ leads with Move to {next} and Move stage…; numbers grouped.
//  7 · P-09 · A-21 · A-22 · A-23 · A-27 at 390 — the import: the tips fold, the upload is the column's row with the file's own badge, what
//      matched folds to one line, the preview is a list with a red line on the row with no name and on the second same phone, the routing
//      counts what lands, the end names what was skipped and why; Lead Import History reads "4 of 5 imported" with its space.
//  8 · P-09 · A-24 · A-16 at 390 — Review: the merge shows what differs (Show all brings the 15), both phones grouped, the queue's toolbar away.
//  9 · A-26 at 390 — Deleted Leads as cards with Restore (put back); Empty Trash under the head's ⋮.
// 10 · A-29 at 768 touch — Return Lead on a lead past its 30 days opens on the notice first; "Return it anyway" runs the form.
// 11 · 1440 (a mouse): the desk as it was — the stage menu has no next-move block, Filters keeps its rail, the form keeps Cancel · Create and no
//      paste row, the composer has no presets, the table has no tablet set.
// 12 · 320: no sideways scroll on the cards, the new-lead sheet and the import's list. No page errors. Every table put back.
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3193 NODE_PATH=<repo>/node_modules node verify-rl-l3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rl-l3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3193'
const REPO = fs.existsSync(path.resolve(__dirname, '../../../lib')) ? path.resolve(__dirname, '../../..') : process.cwd()   // a harness copy reads the repo it runs in
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rl-l3-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  // 0 · the pure words, run from the repo
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-leads/rl-l3-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure words and rules: ${p} passed, ${f} failed`)
    if (f) console.log(out.split('\n').filter((l) => l.includes('✗')).join('\n'))
  } catch (e) { fail++; console.log('  ✗ the pure words did not run:', String(e.stdout || e).slice(0, 400)) }

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

  // ── the records this probe reads: the demo's own, by what they are ──
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const UNSEEN = json(`select id, name from leads where seen_at is null and deleted_at is null and direct = 0`)
  const NOBODY = sql(`select l.name from leads l where l.stage = 'New' and l.deleted_at is null and l.direct = 0 and not exists (select 1 from lead_assignees a where a.lead_id = l.id) limit 1`)
  const OWNED_NEW = sql(`select l.name from leads l where l.stage = 'New' and l.deleted_at is null and l.direct = 0 and l.seen_at is not null and exists (select 1 from lead_assignees a where a.lead_id = l.id) order by l.created_at desc limit 1`)
  const LATE_RETURN = sql(`select l.name from leads l where l.source = 'Qanvast' and l.stage not in ('Lost','Won') and l.deleted_at is null and l.direct = 0 and l.created_at < strftime('%s','now') - 31 * 86400 and not exists (select 1 from lead_returns r where r.lead_id = l.id) and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) limit 1`)
  const EXISTING_PHONE = sql(`select phone from leads where deleted_at is null and direct = 0 and phone is not null and length(phone) = 8 limit 1`)
  const DUP_ROW = sql(`select r.id from import_rows r where r.status = 'duplicate' and r.duplicate_of_lead_id is not null limit 1`)
  const DELETED = json(`select id, name from leads where deleted_at is not null and direct = 0 order by deleted_at desc`)

  const touchCtx = (w, h, opts = {}) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, ...opts })
  const mouseCtx = (w, h) => b.newContext({ viewport: { width: w, height: h } })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r.right, bt: r.bottom } })
  const hitIn = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest(sel) }, [x, y, sel])
  const tap = (p, x, y) => p.touchscreen.tap(x, y)
  const tapEl = async (p, loc) => { await loc.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' })); await settle(p, 250); const r = await box(loc); await tap(p, r.cx, r.cy) }   // centred: never under the docked review banner
  const fontSize = (loc) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const card = (p, name) => p.locator('[data-lead-card]').filter({ has: p.locator('[class$="__name"]', { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first()
  const urlIs = async (p, re, ms = 15000) => { try { await p.waitForURL(re, { timeout: ms }); return true } catch { return false } }
  const sheet = (p) => p.locator('[role="dialog"], [role="menu"]').last()

  try {
    // ── 1 · the phone card ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · P-05 at 390 (touch): the card says who to call now')
    const M = await touchCtx(390, 844); const m = await page(M, '390')
    await go(m, '/leads')
    await shot(m, '01-m390-cards')
    const cards = m.locator('[data-lead-card]')
    const nCards = await cards.count()
    ok(nCards > 5, `the listing is cards (${nCards})`)
    const unseenNames = UNSEEN.map((u) => u.name)
    const marked = await cards.evaluateAll((els) => els.filter((e) => e.hasAttribute('data-unseen')).map((e) => e.querySelector('[class$="__name"]').textContent.trim()))
    ok(unseenNames.length > 0 && marked.length === unseenNames.length && marked.every((n) => unseenNames.includes(n)), `the new mark sits on the unseen lead(s) only (${marked.join(', ')}) — A-01`)
    const u0 = card(m, unseenNames[0])
    ok(await u0.locator('[class*="band"]').count() === 1 && /^New$/i.test((await u0.locator('[class*="nameRow"] > :not([class*="name"])').first().innerText()).trim()), `${unseenNames[0]} wears the band and a New tag`)
    const c0 = card(m, OWNED_NEW)
    const infoItems = await c0.locator('[class*="info"] > span:not([class*="dot"])').count()
    const infoText = (await c0.locator('[class*="info"]').innerText()).replace(/\s+/g, ' ')
    ok(infoItems === 3 && !/days? in /.test(infoText), `three items on the info line: "${infoText.trim()}" (A-04)`)
    const wa = c0.getByTestId('card-whatsapp')
    ok(/^https:\/\/wa\.me\/65\d{8}$/.test(await wa.getAttribute('href') || ''), 'WhatsApp sits beside the number and opens wa.me with the Singapore number (A-05)')
    await wa.evaluate((e) => e.scrollIntoView({ block: 'center' })); await m.waitForTimeout(300)   // (closing regression) the card can sit below the fold on a fresh restore — a hit test needs it on screen
    const wb = await box(wa)
    ok(wb.w >= 44 && wb.h >= 44 && await hitIn(m, wb.cx, wb.cy, '[data-testid="card-whatsapp"]'), `its box is ${Math.round(wb.w)}×${Math.round(wb.h)} and answers at its centre`)
    const hb = await box(c0.locator('button[class*="head"]')), tb = await box(c0.locator('a[class*="tel"]'))
    ok(hb.bt <= tb.y + 0.5 && tb.h >= 44 && hb.h >= 44, `the name's box (${Math.round(hb.y)}–${Math.round(hb.bt)}) and the number's (${Math.round(tb.y)}–${Math.round(tb.bt)}) never share a pixel, both 44 (A-05)`)
    const lastTexts = await cards.evaluateAll((els) => els.map((e) => e.querySelector('[data-line="last"], [data-line="lost"]')?.textContent?.trim() ?? ''))
    ok(lastTexts.every((t) => /^(Last|Lost)/.test(t)), 'every card says when we last spoke (or, Lost, why and when) — A-03')
    const lineSize = await fontSize(c0.locator('[data-line="last"] dd'))
    ok(lineSize === 14, `the Last line reads ${lineSize} (P-13)`)
    const lateLine = m.locator('[data-lead-card] [data-line="next"][data-late]').first()
    ok(await lateLine.count() === 1 && /\d+ days? late/.test((await lateLine.innerText()).replace(/\s+/g, ' ').trim()) && (await lateLine.locator('dd').evaluate((e) => getComputedStyle(e).color)) !== (await c0.locator('[data-line="last"] dd').evaluate((e) => getComputedStyle(e).color)), `a late Next reads by its day and how late, in red ("${(await lateLine.innerText()).replace(/\s+/g, ' ').trim()}")`)
    // the foot: the pill leads; nothing that takes a press under the Maison AI button
    const pillFirst = await c0.locator('[class*="foot"]').evaluate((f) => f.firstElementChild?.tagName === 'BUTTON' && /scope|pill/i.test(f.firstElementChild.className))
    ok(pillFirst, 'the foot leads with the stage pill, the members after it (A-02)')
    const fab = m.getByRole('button', { name: 'Maison AI' })
    let underFab = 0, pillsTried = 0
    for (let i = 0; i < Math.min(nCards, 8); i++) {
      const pill = cards.nth(i).locator('[class*="foot"] > button').first()
      let p2 = null, f2 = null
      for (let k = 0; k < 4; k++) {   // bring the card's foot to the button's height (the chrome and the button move with the scroll, so measure again)
        const pb = await box(pill), fb = await box(fab)
        const d = pb.cy - fb.cy
        if (Math.abs(d) <= 20 && fb.y < 844 && fb.y > 0) { p2 = pb; f2 = fb; break }
        await m.evaluate(([y]) => window.scrollBy(0, y + 24), [d]); await settle(m, 400)
        await m.evaluate(() => window.scrollBy(0, -24)); await settle(m, 800)   // the last move up: the chrome and the button come back out
      }
      if (!p2 || !f2) continue
      pillsTried++
      for (const [x, y] of [[p2.x + 8, p2.cy], [p2.cx, p2.cy], [p2.r - 8, p2.cy]]) if (!(await hitIn(m, x, y, '[class*="foot"] > button'))) underFab++
      /* no press of the card's foot lies under the button's 48 box */
      underFab += await cards.nth(i).locator('[class*="foot"] button, [class*="foot"] a').evaluateAll((els, f) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.right > f.x && r.left < f.x + f.w && r.bottom > f.y && r.top < f.y + f.h }).length, f2)
    }
    ok(pillsTried >= 1 && underFab === 0, `with a card's foot at the Maison AI button's height (${pillsTried} tried), the pill takes its own taps and no pill, avatar button or link lies under the button (A-02)`)
    await go(m, '/leads')
    // to call today
    const todo = m.getByTestId('call-today').locator('button')
    const todoText = ((await todo.textContent()) || '').replace(/^call/, '').replace(/close$/, '').trim()   // the glyph's ligature is not its words
    const n = Number(todoText.match(/^(\d+)/)?.[1] ?? -1)
    ok(n > 0 && /to call today$/.test(todoText), `"${todoText}" on its own line under the toolbar`)
    await tapEl(m, todo); await settle(m, 1200)
    const scoped = await cards.count()
    ok(scoped === n && /scope=today/.test(m.url()) && /^To call today \(\d+\)/.test(((await m.locator('[class*="left"] button[aria-haspopup="menu"]').first().textContent()) || '').trim()), `pressed, it scopes the list to the ${n} (the pill names it, the address keeps it)`)
    const todayOk = await cards.evaluateAll((els) => els.every((e) => !!e.querySelector('[data-line="next"]')))
    ok(todayOk, 'every card in it names its Next')
    await shot(m, '02-m390-to-call-today')
    await tapEl(m, m.getByTestId('call-today').locator('button')); await settle(m, 900)
    ok(!/scope=today/.test(m.url()) && await cards.count() === nCards, 'pressed again, the whole list is back')
    // Lost
    await go(m, '/leads?scope=lost')
    const lostCards = m.locator('[data-lead-card]')
    const lostLines = await lostCards.evaluateAll((els) => els.map((e) => e.querySelector('[data-line="lost"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''))
    ok(lostLines.length > 0 && lostLines.every((t) => /^Lost\s*(today|yesterday|\d+ days? ago)/.test(t)), `a Lost card says when, and why when it was said ("${lostLines[0]}") — A-28`)
    ok(await m.locator('[data-lead-card] [class*="taskBox"] >> text=Overdue').count() === 0, 'a Lost card wears no Overdue tag')
    await shot(m, '03-m390-lost')

    // ── 2 · the sheets from a card ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · P-05 · Q-05 · A-06 · A-07 · A-08 · A-09 at 390: the stage, Assign and Tasks sheets from a card')
    await go(m, '/leads')
    // a lead with a member: the next move first
    const own = card(m, OWNED_NEW)
    await tapEl(m, own.locator('[class*="foot"] > button').first()); await settle(m, 900)
    const next = m.getByTestId('stage-next-move')
    ok(await next.count() === 1 && (await next.innerText()).trim() === 'Move to Contacted', `the sheet leads with the next move: "${(await next.innerText().catch(() => '')).trim()}" (A-07)`)
    const metRow = m.locator('[role="menu"] button[role="menuitem"]').filter({ hasText: /^Met/ })
    ok(/Complete Contacted first/.test(await metRow.innerText()), 'a locked row says why in the row ("Complete Contacted first") — A-06')
    await shot(m, '04-m390-stage-next')
    await tapEl(m, next); await settle(m, 1500)
    const win = m.getByRole('dialog', { name: 'Move stage' })
    ok(await win.isVisible() && /Contacted/.test(await win.innerText()), 'Move to Contacted opens the Move stage window at Contacted')
    await m.keyboard.press('Escape'); await settle(m, 700)
    if (await win.isVisible().catch(() => false)) { await win.getByRole('button', { name: /Close|Cancel/ }).first().click().catch(() => {}); await settle(m, 500) }
    // the lead with nobody: why, and the fix
    const nob = card(m, NOBODY)
    await tapEl(m, nob.locator('[class*="foot"] > button').first()); await settle(m, 900)
    const blocked = m.getByTestId('stage-next')
    ok(await blocked.getAttribute('data-blocked') !== null && /assign a member first/i.test(await blocked.innerText()), `${NOBODY}: "${(await blocked.innerText()).split('\n')[0]}" — the reason before the tap (A-06)`)
    await tapEl(m, m.getByTestId('stage-next-fix')); await settle(m, 900)
    const assignSheet = m.getByRole('dialog').filter({ hasText: 'Assign Member' }).last()
    ok(await assignSheet.isVisible() && new RegExp(NOBODY).test(await assignSheet.innerText()), 'its fix, Assign, opens the Assign sheet naming the lead (A-08)')
    await shot(m, '05-m390-assign-fix')
    const firstRow = assignSheet.locator('button[class*="row"]').filter({ hasNot: m.locator('[data-locked]') }).first()
    await tapEl(m, firstRow); await settle(m, 300)
    await tapEl(m, assignSheet.getByRole('button', { name: 'Assign', exact: true })); await settle(m, 1800)
    const win2 = m.getByRole('dialog', { name: 'Move stage' })
    ok(await win2.isVisible() && /Contacted/.test(await win2.innerText()), 'Assign → the Move stage window at Contacted: the move asked for, once the owner rule is met (one trip, not six taps)')
    ok(Number(sql(`select count(*) from lead_assignees where lead_id = '${leadId(NOBODY)}'`)) === 1, '…and the member is on the lead')
    await m.keyboard.press('Escape'); await settle(m, 700)
    if (await win2.isVisible().catch(() => false)) { await win2.getByRole('button', { name: /Close|Cancel/ }).first().click().catch(() => {}); await settle(m, 500) }
    putBack()
    // the Tasks sheet: a task due tomorrow at ten in one press
    await go(m, '/leads')
    const tcard = card(m, OWNED_NEW)
    const addTask = tcard.getByRole('button', { name: /^Add a task for/ })
    const opener = await addTask.count() ? addTask : tcard.locator('[class*="taskBox"]')
    await tapEl(m, opener); await settle(m, 900)
    if (!(await m.getByLabel('Describe your task').count())) { await m.getByRole('button', { name: 'Add Task', exact: true }).last().tap(); await settle(m, 500) }
    await m.getByLabel('Describe your task').fill('Call back about the kitchen layout')
    await tapEl(m, m.getByTestId('task-due-presets').getByRole('radio', { name: 'Tomorrow 10:00 AM' })); await settle(m, 300)
    ok(/^Due \w{3}, \d+ \w{3} ’\d\d · 10:00 AM$/.test((await m.getByTestId('task-due-line').innerText()).trim()), `the chip says the day it means ("${(await m.getByTestId('task-due-line').innerText()).trim()}") — A-09`)
    ok(await fontSize(m.getByLabel('Describe your task')) === 16, 'the task field types at 16')
    await shot(m, '06-m390-task-presets')
    await m.getByRole('button', { name: 'Save', exact: true }).last().tap(); await settle(m, 1500)
    const due = Number(sql(`select due_at from lead_tasks where title = 'Call back about the kitchen layout' and lead_id = '${leadId(OWNED_NEW)}'`))
    const tom = new Date(); tom.setDate(tom.getDate() + 1); tom.setHours(10, 0, 0, 0)
    ok(due * 1000 === tom.getTime(), 'Save adds the task due tomorrow at 10:00')
    putBack()

    // ── 3 · Filters ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · A-11 at 390: Filters is one sheet of chips; Done says what it leaves')
    await go(m, '/leads')
    await tapEl(m, m.locator('[data-kb="filters"]').first()); await settle(m, 900)
    const fsheet = m.getByTestId('lead-filters-sheet')
    ok(await fsheet.isVisible() && await m.locator('[role="tablist"][aria-label="Filter groups"]').count() === 0, 'one scrolling sheet — no two-pane rail inside a phone')
    const groups = await fsheet.locator('section').evaluateAll((s) => s.map((x) => x.getAttribute('aria-label')))
    ok(JSON.stringify(groups) === JSON.stringify(['Sort by', 'Property type', 'Source', 'Members', 'Dates']), `its groups: ${groups.join(' · ')} (the To do scopes live on the pill)`)
    const done = m.getByTestId('filters-done')
    ok(/^Show \d+ leads?$/.test((await done.innerText()).trim()), `Done reads "${(await done.innerText()).trim()}"`)
    await tapEl(m, fsheet.locator('section[aria-label="Source"]').locator('[aria-pressed]').first()); await settle(m, 900)
    const shown = Number(((await done.innerText()).match(/\d+/) || [])[0])
    await shot(m, '07-m390-filters')
    await tapEl(m, done); await settle(m, 900)
    ok(await m.locator('[data-lead-card]').count() === shown, `a Source chip filters live: "Show ${shown}" = the ${shown} cards the list then shows`)
    await go(m, '/leads')
    await tapEl(m, m.getByRole('button', { name: 'Search leads' }).first()).catch(() => {})
    await settle(m, 500)
    const search = m.locator('input[placeholder^="Search name"]').first()
    if (await search.count()) ok(await fontSize(search) === 16, 'the search types at 16 (A-10)')

    // ── 4 · a new lead ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · P-08 · A-17…A-20 at 390: a new lead is a name and a mobile')
    await go(m, '/leads')
    await tapEl(m, m.getByRole('button', { name: 'Add Lead' }).first()); await settle(m, 500)
    await m.getByRole('menuitem', { name: 'Create New Lead' }).tap(); await settle(m, 900)
    const form = m.getByRole('dialog', { name: 'Create New Lead' })
    const nameIn = form.locator('[data-field="name"] input'), phoneIn = form.locator('[data-field="phone"] input')
    ok(await nameIn.getAttribute('autocomplete') === 'name' && await nameIn.getAttribute('autocapitalize') === 'words' && await phoneIn.getAttribute('autocomplete') === 'tel' && await phoneIn.getAttribute('inputmode') === 'tel', 'the name and the mobile carry their autofill hints and the phone pad (A-18)')
    ok(await fontSize(nameIn) === 16 && await fontSize(phoneIn) === 16, 'both type at 16')
    ok(await form.locator('[data-field="source"]').isVisible() === false && await form.getByRole('button', { name: 'More details' }).isVisible(), 'the source, the home and the rest wait under More details')
    ok(await form.getByTestId('add-lead').isVisible() && await form.getByRole('button', { name: 'Cancel' }).count() === 0, 'one Add lead in the foot')
    await shot(m, '08-m390-new-lead')
    await tapEl(m, form.getByTestId('paste-message')); await settle(m, 700)
    ok(await form.getByTestId('paste-message-box').isVisible(), 'the clipboard can\'t be read here: a box opens to paste into')
    await form.locator('[data-testid="paste-message-box"] textarea').fill("Hi, I'm Rachel Ong. Looking to renovate my 4-room HDB at Blk 123 Bedok North Ave 1 #08-12. Call me 9334 1209, rachel.ong@gmail.com")
    await tapEl(m, form.getByTestId('paste-message-fill')); await settle(m, 700)
    ok(await nameIn.inputValue() === 'Rachel Ong' && (await phoneIn.inputValue()).replace(/\s/g, '') === '93341209', 'Fill the form: the name and the mobile from the message (A-19)')
    ok(/^Filled from the message: /.test((await form.getByTestId('fill-document-note').innerText()).trim()), `the line says what filled ("${(await form.getByTestId('fill-document-note').innerText()).trim().slice(0, 70)}…")`)
    ok(await form.locator('[data-field="propertyAddress"] input').inputValue() === 'Blk 123 Bedok North Ave 1 #08-12', 'the address inside the sentence lands, More details opened on it')
    await shot(m, '09-m390-pasted')
    // the clipboard path
    const C = await touchCtx(390, 844, { permissions: ['clipboard-read', 'clipboard-write'] }); const c = await page(C, '390-clip')
    await go(c, '/leads?new=1')
    await settle(c, 1200)
    await c.evaluate(() => navigator.clipboard.writeText('[23/10/26, 10:15:12 AM] Kelvin Tan: Hello, saw your Instagram, want to do up my condo\n[23/10/26, 10:17:40 AM] Kelvin Tan: my number 8123 4567'))
    const cform = c.getByRole('dialog', { name: 'Create New Lead' })
    await tapEl(c, cform.getByTestId('paste-message')); await settle(c, 900)
    ok(await cform.locator('[data-field="name"] input').inputValue() === 'Kelvin Tan' && await cform.getByTestId('paste-message-box').count() === 0, 'with the clipboard readable, one press fills the form from a copied chat — no box')
    await C.close()
    // ✕ asks
    await tapEl(m, form.getByRole('button', { name: 'Close' }).first()); await settle(m, 700)
    const ask = m.getByRole('dialog', { name: 'Discard this lead?' })
    ok(await ask.isVisible() && /won’t be saved/.test(await ask.innerText()), '✕ with typed words asks "Discard this lead?" (A-17)')
    await shot(m, '10-m390-discard-ask')
    await tapEl(m, ask.getByRole('button', { name: 'Keep editing' })); await settle(m, 500)
    ok(await nameIn.inputValue() === 'Rachel Ong', 'Keep editing keeps every word')
    // the duplicate: Open existing lead is the filled answer
    await phoneIn.fill(EXISTING_PHONE); await settle(m, 200)
    await tapEl(m, form.getByTestId('add-lead')); await settle(m, 1500)
    const dupOpen = m.getByTestId('duplicate-open-existing'), dupCreate = m.getByTestId('duplicate-create-anyway')
    const bgOpen = await dupOpen.evaluate((e) => getComputedStyle(e).backgroundColor), bgCreate = await dupCreate.evaluate((e) => getComputedStyle(e).backgroundColor)
    ok(await dupOpen.isVisible() && bgOpen !== bgCreate && !/rgba?\(255, 255, 255|transparent|rgba\(0, 0, 0, 0\)/.test(bgOpen), 'the duplicate dialog\'s filled answer is Open existing lead; Create anyway the outlined one (A-20)')
    await shot(m, '11-m390-duplicate')
    await tapEl(m, dupCreate); await settle(m, 2500)
    ok(await urlIs(m, /\/leads\/[^/?]+(\?|$)/, 8000), 'Add lead opens the new lead on its own page, ready to call (P-08)')
    ok(Number(sql(`select count(*) from leads where name = 'Rachel Ong' and deleted_at is null`)) === 1, '…the lead is kept, with what the message filled')
    putBack()

    // ── 5 · Edit details at 768 ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · P-08 · B-21 at 768 (touch): Edit details is a short list')
    const T = await touchCtx(768, 1024); const t = await page(T, '768')
    await go(t, '/leads?view=table')
    const row0 = t.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').filter({ hasText: OWNED_NEW }).first()
    await tapEl(t, row0.getByRole('button', { name: 'Edit', exact: true })); await settle(t, 900)
    const list = t.getByTestId('edit-short-list')
    const secs = await list.locator('[data-section]').evaluateAll((els) => els.map((e) => e.getAttribute('data-section')))
    ok(JSON.stringify(secs.slice(0, 4)) === JSON.stringify(['contact', 'property', 'budget', 'people']), `the list: ${secs.join(' · ')}`)
    ok((await list.locator('[data-section="contact"]').innerText()).includes(OWNED_NEW), 'each row says what it holds (Contact names the lead)')
    await shot(t, '12-t768-edit-list')
    await tapEl(t, list.locator('[data-section="contact"]')); await settle(t, 600)
    ok(await t.getByTestId('edit-section-contact').isVisible() && await t.locator('[data-field="email"]').isVisible() && !(await t.locator('[data-field="budget"]').count()), 'a row opens its screen: Contact holds the contact fields, nothing else')
    await t.getByRole('textbox', { name: 'Customer ID' }).fill('CUST-L3-PROBE')
    await tapEl(t, t.getByTestId('edit-section-back')); await settle(t, 500)
    ok(await t.getByTestId('edit-short-list').isVisible(), '← returns to the list, the change held')
    await tapEl(t, t.getByRole('dialog', { name: 'Edit Lead' }).getByRole('button', { name: 'Close' }).first()); await settle(t, 600)
    ok(await t.getByRole('dialog', { name: 'Discard your changes?' }).isVisible(), '✕ with a change asks "Discard your changes?"')
    await tapEl(t, t.getByRole('button', { name: 'Keep editing' })); await settle(t, 400)
    await tapEl(t, t.getByRole('dialog', { name: 'Edit Lead' }).getByRole('button', { name: 'Save', exact: true })); await settle(t, 1500)
    ok(sql(`select customer_id from leads where id = '${leadId(OWNED_NEW)}'`) === 'CUST-L3-PROBE', 'one Save keeps the change')
    putBack()

    // ── 6 · tablets ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · P-06 at 768 / 1024 (touch): the tablet\'s table, Column settings, the kanban that moves')
    await t.evaluate(() => { localStorage.removeItem('om.columns.leads.tablet'); localStorage.removeItem('om.columns.leads') })
    await go(t, '/leads?view=table')
    const heads = await t.locator('[role="table"][aria-label="Leads"] [role="columnheader"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-col')))
    ok(JSON.stringify(heads) === JSON.stringify(['name', 'stage', 'lastContact', 'nextFollowUp', 'assignees']), `the tablet's set: ${heads.join(' · ')} (A-12)`)
    const r0 = t.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').first()
    const eb = await box(r0.getByRole('button', { name: 'Edit', exact: true })), kb = await box(r0.getByRole('button', { name: /^More actions for/ }))
    const vw = await t.evaluate(() => document.documentElement.clientWidth)
    ok(eb.r <= vw && kb.r <= vw && await hitIn(t, eb.cx, eb.cy, 'button') && await hitIn(t, kb.cx, kb.cy, 'button[aria-label^="More actions"]'), 'Edit and ⋮ stand in view at the row\'s right, unscrolled (A-13)')
    await t.locator('[role="table"][aria-label="Leads"]').evaluate((tb) => { tb.parentElement.scrollLeft = 400 }); await settle(t, 400)
    const kb2 = await box(r0.getByRole('button', { name: /^More actions for/ }))
    ok(Math.abs(kb2.x - kb.x) < 1, '…and stay frozen while the table pans')
    const rh = (await box(r0)).h
    ok(rh <= 72, `one ${Math.round(rh)} row — the name cell opens the lead, the phone reads under it (A-12)`)
    ok(await fontSize(r0.locator('[class*="phone"]').first()) === 14, 'the phone under the name reads 14 (A-14)')
    await shot(t, '13-t768-table')
    await tapEl(t, t.getByRole('button', { name: 'Column settings' })); await settle(t, 900)
    const drawer = t.getByRole('dialog', { name: 'Column settings' })
    const handle = drawer.locator('button[aria-label^="Drag to reorder"]').first(), pin = drawer.locator('button[aria-pressed]').first()
    const hbx = await box(handle), pbx = await box(pin)
    ok(hbx.w >= 44 && hbx.h >= 44 && pbx.w >= 44 && pbx.h >= 44, `Column settings' handle ${Math.round(hbx.w)}×${Math.round(hbx.h)} and pin ${Math.round(pbx.w)}×${Math.round(pbx.h)} (A-30, the house drawer)`)
    const sw = drawer.getByRole('switch', { name: 'Show Source column' }).locator('xpath=ancestor::label[1]')
    await tapEl(t, sw); await settle(t, 400)
    await t.keyboard.press('Escape'); await settle(t, 600)
    const prefs = await t.evaluate(() => ({ tab: localStorage.getItem('om.columns.leads.tablet'), desk: localStorage.getItem('om.columns.leads') }))
    ok(!!prefs.tab && !prefs.desk, 'a change on a tablet is kept for the tablet (om.columns.leads.tablet) — the desk\'s set untouched')
    await t.evaluate(() => localStorage.removeItem('om.columns.leads.tablet'))
    // the kanban moves on touch
    await go(t, '/leads?view=kanban')
    const kcard = t.locator('[data-kb-list="lead"] [data-kb-row]').filter({ hasText: OWNED_NEW }).first()
    ok(/\d{4} \d{4}/.test(await kcard.locator('[class$="__cardMeta"]').innerText()), 'the kanban card\'s number reads grouped (A-16)')
    await tapEl(t, kcard.getByTestId('kanban-stage-pill').locator('button')); await settle(t, 800)
    ok((await t.getByTestId('stage-next-move').innerText()).trim() === 'Move to Contacted', 'the card\'s stage pill opens the stage menu with the next move first (A-15)')
    await shot(t, '14-t768-kanban-stage')
    await t.keyboard.press('Escape'); await settle(t, 500)
    await tapEl(t, kcard.getByRole('button', { name: /^More actions for/ })); await settle(t, 800)
    const krows = await t.locator('[role="menu"]').last().evaluate((mm) => [...mm.querySelectorAll('[role^="menuitem"]')].map((r) => r.firstChild?.textContent?.trim() || r.textContent.trim()))
    ok(krows[0] === 'Move to Contacted' && krows[1] === 'Move stage…', `its ⋮ leads with the move: ${krows.join(' · ')}`)
    await t.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Move stage…' }).tap(); await settle(t, 800)
    ok(await t.getByTestId('stage-next-move').isVisible(), 'Move stage… opens the stage menu')
    await t.keyboard.press('Escape'); await settle(t, 400)
    // a new lead on a tablet: the desk's dialog with Paste a message beside Fill from a document, typing at 16
    await go(t, '/leads?view=table')
    await tapEl(t, t.locator('[data-kb="create"] button').first()); await settle(t, 500)
    await t.getByRole('menuitem', { name: 'Create New Lead' }).tap(); await settle(t, 900)
    const tform = t.getByRole('dialog', { name: 'Create New Lead' })
    ok(await tform.getByRole('button', { name: 'Paste a message' }).isVisible() && await tform.getByRole('button', { name: 'Fill from a document' }).isVisible() && await fontSize(tform.locator('[data-field="name"] input')) === 16, 'a tablet\'s new lead: Paste a message beside Fill from a document, typing at 16 (P-08 · A-18)')
    await tform.getByRole('button', { name: 'Close' }).first().tap(); await settle(t, 600)
    ok(await tform.count() === 0, 'nothing typed: ✕ closes at once, no question')
    const L = await touchCtx(1024, 768); const l = await page(L, '1024')
    await go(l, '/leads?view=table')
    const heads2 = await l.locator('[role="table"][aria-label="Leads"] [role="columnheader"]').count()
    const lvw = await l.evaluate(() => document.documentElement.clientWidth)
    const lrow = l.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').first()
    const actionsLeft = (await box(lrow.getByRole('button', { name: 'Edit', exact: true }))).x
    const membersRight = (await box(lrow.locator('[data-kb="assign"] button').last())).r
    ok(heads2 === 5 && membersRight <= actionsLeft - 8 && actionsLeft < lvw, `at 1024 all five columns (the Members' last control ends at ${Math.round(membersRight)}) and Edit · ⋮ (from ${Math.round(actionsLeft)}) stand on the first screen`)
    await shot(l, '15-t1024-table')
    await L.close()

    // ── 7 · the import ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · P-09 · A-21 · A-22 · A-23 · A-27 at 390: the import says what lands')
    const csv = path.join(os.tmpdir(), `rl-l3-five-${process.pid}.csv`)
    fs.writeFileSync(csv, 'Lead Name,Lead Phone Number,Lead Email,Lead Source,Property Type,Estimated Budget (S$)\nRachel Ong,91234501,rachel.ong@example.com,Instagram,HDB 4-Room,80000\nDaniel Koh,82345602,daniel.koh@example.com,Website,Condo 3-bedder,120000\n,93456703,,Facebook,HDB 5-Room,60000\nSandra Lee,84567804,sandra.lee@example.com,Referral,BTO 4-Room,S$75k\nRachel O.,91234501,,Instagram,HDB 4-Room,80000\n')
    await go(m, '/leads')
    await tapEl(m, m.getByRole('button', { name: 'Add Lead' }).first()); await settle(m, 500)
    await m.getByRole('menuitem', { name: 'Import from File' }).tap(); await settle(m, 900)
    const wiz = m.getByRole('dialog', { name: 'Import Leads' })
    ok(await wiz.getByTestId('import-tips-toggle').isVisible() && !(await wiz.locator('[class*="tipBlock"]').first().isVisible()), 'the tips fold under "How to prepare the file" — the first screen is the file (A-21)')
    await tapEl(m, wiz.getByTestId('import-tips-toggle')); await settle(m, 300)
    ok(await wiz.locator('[class*="tipBlock"]').first().isVisible(), '…and open on a press')
    await tapEl(m, wiz.getByTestId('import-tips-toggle')); await settle(m, 300)
    await wiz.locator('input[type="file"]').setInputFiles(csv); await settle(m, 250)
    ok(await wiz.getByTestId('import-upload-row').isVisible() && await m.locator('[class*="toast"][role="status"]').count() === 0, 'on a phone the upload is the column\'s own row, never a card over the success card')
    ok(await wiz.getByTestId('import-upload-row').locator('img[data-kind="csv"]').count() === 1, 'its badge is the file\'s own kind (A-21)')
    await settle(m, 1300)
    await tapEl(m, wiz.getByRole('button', { name: 'Next', exact: true })); await settle(m, 900)
    ok(/6 of 6 columns matched/.test(await wiz.getByTestId('import-matched-line').innerText()) && await wiz.locator('[data-map-row]').count() === 0, 'every column matched: one line, no 6 cards (A-22)')
    await tapEl(m, wiz.getByTestId('import-matched-review')); await settle(m, 500)
    ok(await wiz.locator('[data-map-row]').count() === 6, 'Review opens the matches')
    await tapEl(m, wiz.getByRole('button', { name: 'Next', exact: true })); await settle(m, 900)
    const items = wiz.getByTestId('import-preview-list').locator('li')
    ok(await items.count() === 5, 'the preview is a list of the five leads, not the 12-column sheet')
    ok(/No lead name — won’t import/.test(await items.nth(2).innerText()) && await items.nth(2).getAttribute('data-skip') !== null, 'the row with no name says it won\'t land, in red (A-23)')
    ok(/Same phone as row 1 — goes to Review/.test(await items.nth(4).innerText()), 'the second same phone says it goes to Review')
    ok(/1 row with no lead name won’t import \(row 3\)/.test(await wiz.getByTestId('import-skip-note').innerText()), 'said above the list before the press')
    await shot(m, '16-m390-import-preview')
    await tapEl(m, wiz.getByRole('button', { name: 'Import', exact: true })); await settle(m, 800)
    const route = m.getByRole('dialog', { name: 'Lead routing' })
    ok(/Where should these 4 leads go\?/.test(await route.innerText()) && /row 3/.test(await route.getByTestId('import-dest-skip').innerText()), 'the routing counts the four that land and names the one that won\'t')
    await route.locator('[role="radio"]').nth(1).tap().catch(async () => { await route.getByText('Review and approve manually').tap() }); await settle(m, 300)
    await tapEl(m, route.getByRole('button', { name: 'Import', exact: true })); await settle(m, 2500)
    ok(/1 row skipped — no lead name \(row 3\)/.test(await wiz.getByTestId('import-skipped').innerText()), `the end names what was skipped and why ("${(await wiz.getByTestId('import-skipped').innerText()).trim()}")`)
    await shot(m, '17-m390-import-done')
    putBack()
    fs.unlinkSync(csv)
    await go(m, '/leads/imports')
    const histAfter = await m.locator('[class*="cell"]:nth-child(3)').first().evaluate((e) => ({ ws: getComputedStyle(e, '::after').whiteSpace, c: getComputedStyle(e, '::after').content }))
    ok(histAfter.ws === 'pre' && /imported/.test(histAfter.c), 'Lead Import History: " imported" keeps its space ("4 of 5 imported") — A-27')

    // ── 8 · Review ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · P-09 · A-24 · A-16 at 390: Review shows what differs')
    await go(m, '/leads')
    await tapEl(m, m.getByRole('button', { name: /Review imported leads/ }).first()); await settle(m, 900)
    const rv = m.getByRole('dialog', { name: 'Review imported leads' })
    const metas = await rv.locator('[class*="cardMeta"]').evaluateAll((els) => els.map((e) => e.textContent))
    ok(metas.length > 0 && metas.every((x) => !/\b\d{8}\b/.test(x)), 'the queue\'s cards print every number grouped (A-16)')
    ok(await fontSize(rv.locator('[class*="cardMeta"]').first()) === 14, 'the queue card reads 14 (A-25)')
    if (DUP_ROW) {
      await tapEl(m, rv.getByRole('button', { name: 'View & Merge' }).first()); await settle(m, 900)
      const rows = rv.locator('[aria-label="Merge fields"] [role="row"]')
      const shownRows = (await rows.count()) - 1
      ok(shownRows > 0 && shownRows < 15, `the merge shows the ${shownRows} field(s) that differ, not 15 (A-24)`)
      ok(!(await rv.locator('[class*="toolbar"]').first().isVisible()), 'the queue\'s toolbar steps away while merging')
      ok(!/\b\d{8}\b/.test(await rows.filter({ hasText: 'Phone' }).first().innerText()), 'both phones read grouped in the merge')
      await shot(m, '18-m390-merge')
      await tapEl(m, rv.getByTestId('merge-show-all')); await settle(m, 500)
      ok((await rows.count()) - 1 === 15, 'Show all brings the fifteen')
    }
    await m.keyboard.press('Escape'); await settle(m, 500)

    // ── 9 · Deleted Leads ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · A-26 at 390: Deleted Leads as cards')
    await go(m, '/leads')
    await tapEl(m, m.getByRole('button', { name: 'More options' }).first()); await settle(m, 500)
    await m.getByRole('menuitem', { name: 'Deleted Leads' }).tap(); await settle(m, 900)
    const dcards = m.getByTestId('deleted-lead-card')
    ok(await dcards.count() === DELETED.length && await m.locator('[aria-label="Deleted leads"][role="table"]').count() === 0, `the trash is ${DELETED.length} cards — no 8-column table`)
    ok(await sideways(m) <= 0, 'nothing runs sideways')
    const d0 = dcards.first()
    const rb = await box(d0.getByTestId('deleted-lead-restore'))
    ok(rb.h >= 44 && rb.r <= 390, 'Restore is the card\'s own 44 button, in view')
    await shot(m, '19-m390-deleted')
    const d0name = (await d0.locator('[class*="dName"]').innerText()).trim()
    await tapEl(m, d0.getByTestId('deleted-lead-restore')); await settle(m, 1500)
    ok(sql(`select count(*) from leads where name = '${d0name.replace(/'/g, "''")}' and deleted_at is null`) !== '0', `Restore brings ${d0name} back`)
    putBack()
    await tapEl(m, m.getByTestId('deleted-head-menu')); await settle(m, 600)
    ok(await m.getByRole('menuitem', { name: 'Empty Trash' }).isVisible(), 'Empty Trash waits under the head\'s ⋮ — never an outlined button beside ✕')
    await m.keyboard.press('Escape'); await settle(m, 300)

    // ── 10 · Return Lead past its window ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · A-29 at 768 (touch): Return Lead past its window says so first')
    if (LATE_RETURN) {
      await go(t, '/leads?view=table')
      const rr = t.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').filter({ hasText: LATE_RETURN }).first()
      await tapEl(t, rr.getByRole('button', { name: /^More actions for/ })); await settle(t, 700)
      await t.getByRole('menuitem', { name: 'Return Lead' }).tap(); await settle(t, 1500)
      const late = t.getByTestId('return-late')
      ok(await late.isVisible() && /days to return this lead are over/.test(await late.innerText()) && await t.getByLabel('Select a reason').count() === 0, `${LATE_RETURN}: the notice first — the form waits (A-29)`)
      await shot(t, '20-t768-return-late')
      await tapEl(t, t.getByTestId('return-late-continue')); await settle(t, 900)
      ok(await t.getByTestId('return-window').isVisible(), '"Return it anyway" runs the form')
      await t.keyboard.press('Escape'); await settle(t, 500)
    } else ok(false, 'a Qanvast lead past its window exists in the demo')
    putBack()

    // ── 11 · 1440 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · 1440 (a mouse): the desk as it was')
    const D = await mouseCtx(1440, 1024); const d = await page(D, '1440')
    await go(d, '/leads?view=table')
    ok(await d.locator('[role="table"][aria-label="Leads"][data-tablet]').count() === 0 && await d.locator('[data-lead-card]').count() === 0, 'the desk\'s table — no tablet set, no cards')
    await d.locator('[role="table"][aria-label="Leads"] [data-kb="move-stage"]').first().click(); await settle(d, 600)
    ok(await d.getByTestId('stage-next').count() === 0, 'the stage menu keeps the mock\'s rows (no next-move block for a mouse)')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await d.locator('[data-kb="filters"]').first().click(); await settle(d, 600)
    ok(await d.locator('[role="tablist"][aria-label="Filter groups"]').count() === 1 && (await d.getByTestId('filters-done').innerText()).trim() === 'Done', 'Filters keeps its rail and its Done')
    await d.keyboard.press('Escape'); await settle(d, 400)
    await d.locator('[data-kb="create"] button').first().click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: 'Create New Lead' }).click(); await settle(d, 800)
    const dform = d.getByRole('dialog', { name: 'Create New Lead' })
    ok(await dform.getByTestId('paste-message').count() === 0 && await dform.getByRole('button', { name: 'Create', exact: true }).isVisible() && await dform.getByRole('button', { name: 'Cancel' }).isVisible(), 'the form keeps Cancel · Create and its one Fill from a document')
    await d.keyboard.press('Escape'); await settle(d, 400)
    const dtask = d.locator('[role="table"][aria-label="Leads"] button[aria-label^="Add a task for"]').first()
    await dtask.click(); await settle(d, 600)
    ok(await d.getByTestId('task-due-presets').count() === 0, 'the composer is the mock\'s one field')
    await D.close()

    // ── 12 · 320 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('12 · 320: nothing runs sideways')
    const S = await touchCtx(320, 700); const s = await page(S, '320')
    await go(s, '/leads')
    ok(await sideways(s) <= 0, `the cards at 320: ${await sideways(s)}px sideways`)
    await go(s, '/leads?new=1'); await settle(s, 1200)
    ok(await sideways(s) <= 0, 'the new-lead sheet at 320 fits')
    await S.close()
  } catch (e) { fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 600)) }

  const changed = putBack()
  ok(TABLES.every((tb) => hashOf(tb) === before.get(tb)), `every table is as it was${changed.length ? ` (put back: ${changed.join(', ')})` : ''}`)
  ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await b.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
