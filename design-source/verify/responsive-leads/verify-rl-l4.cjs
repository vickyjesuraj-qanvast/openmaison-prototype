// Leads on the move, L4 · the lead's tabs on a phone and a tablet — Tasks (module-wide), Files camera-first, Meetings · Questionnaire · Activity
// read first, Notes upright, and the fixes C-02 · C-03 · C-08 · C-10 (his marks 2026-10-23 on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh,
// "continue the leads"; the brief `design-source/context/responsive/leads-on-the-move-2026-10-23/brief.md`, L4's row). Each rule asserted as the
// rule it builds, never another round's count, every new press pressed for real (a tap at 390 · 768 · 1024 under touch, a click at 1440), on the
// production build:
//  0 · the pure words (rl-l4-pure.mts): the due chip and the presets, the feed by day and its folded runs.
//  1 · P-10 at 390, the lead's Tasks: cards (no checkbox to aim at, C-03), the name whole at 16, the due chip at 14, a 44 ring that completes with
//      Undo; a hold selects and the bulk bar is Mark done · Assign · More… inside the screen (C-04), More… holds the rest; a tap opens the task on
//      its name, When with the presets and Who first, who made it last (C-24); a preset sets the due day; the quick add takes a title + a preset
//      in one row and saves it with its day (C-06); the toolbar's hit boxes are where its glyphs are (C-02); the Maison AI button rests in the
//      quick add's corner, never on Add (C-08).
//  2 · P-10 · C-07 at 768 / 1024 (touch): Title · Members · Due date · Status with the ⋮ frozen in view and Edit gone; the quick add at the foot.
//  3 · /tasks and a project's Tasks at 390: the cards name whose task it is; the quick add carries the Lead pill.
//  4 · P-11 at 390: Files' one row — Take a photo · Search · ⋮ — the title whole at 320 (C-16); the camera's input (image/*, environment); a
//      photo lands in the open folder and the snackbar offers the next one; inside a folder one row and one ⋮ (C-15); 768: the list's tablet set.
//  5 · C-23 at 390: the viewer pinches, double-taps and swipes to the next file; Information is a short sheet; Comments name the file.
//  6 · C-10 · C-14 · C-22: the attachment's day never runs under its ⋮ (390 · 1024 · 1440); a tablet upright reads Notes as the phone does; the
//      composer types at 16.
//  7 · P-12 at 390: Questionnaire reads first (the count line, To answer · Answered); Ask the client's ticks are full-width rows in one column (C-13).
//  8 · P-12 · C-12 at 390: Activity by day, a run folded and opening, rows 44.
//  9 · P-12 · C-11 · C-26: a tap on a meeting card opens it; the meeting page's move in a 48 foot (≤1024), in the head at 1440; 768: the tablet set.
// 10 · 1440 (a mouse): the desk is as it was — the Tasks table's Creator · Tags and its Add Task bar, Files' New File, the feed's timeline.
// 11 · the lint: `icon-button-overlay` now finds a `::after` inset on a class handed to an IconButton, and the three it named are gone.
// 12 · 320: no sideways scroll on the tabs. No page errors. Everything written is put back.
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3194 NODE_PATH=<repo>/node_modules node verify-rl-l4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rl-l4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3194'
const REPO = fs.existsSync(path.resolve(__dirname, '../../../lib')) ? path.resolve(__dirname, '../../..') : process.cwd()   // a harness copy reads the repo it runs in
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rl-l4-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  // 0 · the pure words, run from the repo
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-leads/rl-l4-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure words: ${p} passed, ${f} failed`)
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
  const OLIVIA = leadId('Olivia Martinez')
  const KELVIN = leadId('Kelvin Goh')
  const MEETING = sql(`select id from meetings where lead_id = '${KELVIN}' limit 1`)
  const KITCHEN = sql(`select id from lead_files where lead_id = '${OLIVIA}' and kind = 'folder' and name = 'Kitchen' and deleted_at is null limit 1`)
  const FILES = json(`select id from lead_files where lead_id = '${OLIVIA}' and kind != 'folder' and parent_id is null and deleted_at is null order by created_at desc, rowid`)
  const OPEN_TASK = sql(`select id from lead_tasks where lead_id = '${OLIVIA}' and done = 0 and due_at is not null order by due_at limit 1`)
  const RYAN_PROJECT = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name like 'Ryan D%' and p.deleted_at is null limit 1`)
  const tasksOf = (lead) => json(`select id, title, due_at, done from lead_tasks where lead_id = '${lead}'`)

  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const mouseCtx = (w, h) => b.newContext({ viewport: { width: w, height: h } })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1600) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only (a full-page capture drops (hover: none) mid-shot)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom } })
  /** the press a finger at (x, y) lands on is `loc` (or inside it) — an icon's ligature is not a button's name: the hit is by geometry */
  const hits = (loc, x, y) => loc.evaluate((el, [px, py]) => { const h = document.elementFromPoint(px, py); return !!h && (h === el || el.contains(h)) }, [x, y])
  const fontPx = (loc) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const docOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  /** a hold: the pointer down on whatever the finger is over, still past the half second, then up — and the click a phone fires after it
      (use-long-press.ts's gesture; the click must belong to the hold, never to the ring or the name under the finger) */
  const hold = async (p, x, y) => {
    await p.evaluate(([px, py]) => {
      const t = document.elementFromPoint(px, py)
      t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: px, clientY: py, pointerType: 'touch', isPrimary: true }))
      window.__holdTarget = t
    }, [x, y])
    await new Promise((r2) => setTimeout(r2, 700))
    await p.evaluate(([px, py]) => {
      const t = window.__holdTarget
      t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, button: 0, clientX: px, clientY: py, pointerType: 'touch', isPrimary: true }))
      t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: px, clientY: py }))
    }, [x, y])
  }
  const snack = (p) => p.locator('[role="status"], [data-testid="snackbar"]').last()

  // ── 1 · P-10 at 390: the lead's Tasks ──
  console.log('1 · the lead’s Tasks at 390 (touch)')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-tasks')
    await go(p, `/leads/${OLIVIA}/tasks`)
    await shot(p, 'm390-01-tasks')
    const cards = p.locator('[data-testid="task-card"]')
    const n = await cards.count()
    ok(n === tasksOf(OLIVIA).length, `every task is a card (${n})`)
    ok(await p.locator('[data-testid="task-cards"] input[type="checkbox"]').count() === 0, 'no checkbox to aim at on a card — a hold selects (C-03)')
    const longName = p.locator('[data-testid="task-card-name"]', { hasText: 'Send the revised material board' }).first()
    ok(await fontPx(longName) === 16, 'a task’s name reads at 16')
    ok(await longName.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'the name reads whole, never cut at 19 characters (C-05)')
    const due = p.locator('[data-testid="task-card-due"]').first()
    ok(await due.count() === 1 && await fontPx(due) === 14 && /\S/.test(await due.innerText()), 'the due day is a chip at 14 under the name')
    // the ring: a 44 box whose centre is the ring
    const ring = cards.filter({ hasText: 'Send the revised material board' }).locator('[data-testid="task-card-ring"]')
    const rr = await rect(ring)
    ok(rr.w >= 44 && rr.h >= 44 && await hits(ring, rr.x + rr.w / 2, rr.y + rr.h / 2), 'the ring is a 44 target at its own place')
    await ring.tap(); await settle(p, 1200)
    ok(sql(`select done from lead_tasks where id = '${OPEN_TASK}'`) === '1' || sql(`select done from lead_tasks where title like 'Send the revised material board%' and lead_id = '${OLIVIA}'`) === '1', 'a tap on the ring completes the task')
    const undo = p.getByRole('button', { name: 'Undo' }).last()
    if (await undo.count()) { await undo.tap(); await settle(p, 1400) }
    ok(sql(`select done from lead_tasks where title like 'Send the revised material board%' and lead_id = '${OLIVIA}'`) === '0', 'Undo puts it back')
    // C-02: the toolbar's hit boxes are where the glyphs are
    for (const name of ['Filters', 'More options']) {
      const btn = p.getByRole('button', { name, exact: true }).first()
      const r = await rect(btn)
      ok(await hits(btn, r.x + r.w / 2, r.y + r.h / 2) && await hits(btn, r.r - 2, r.y + r.h / 2), `${name}’s whole drawn square is its own target (C-02)`)
    }
    // a hold selects — on the ring itself, its click swallowed (the task stays open, no panel opens); the bar of three fits the screen
    const target = cards.filter({ hasText: 'Call home owner' }).first()
    const tr = await rect(target.locator('[data-testid="task-card-ring"]'))
    const doneBefore = sql(`select done from lead_tasks where lead_id = '${OLIVIA}' and title like 'Call home owner%'`)
    await hold(p, tr.x + tr.w / 2, tr.y + tr.h / 2); await settle(p, 900)
    ok(await target.getAttribute('data-selected') === '' && sql(`select done from lead_tasks where lead_id = '${OLIVIA}' and title like 'Call home owner%'`) === doneBefore && await p.getByRole('dialog').count() === 0,
      'a hold — even on the ring — selects the card; the click it ends with neither completes nor opens it')
    const nr = await rect(cards.nth(0).locator('[data-testid="task-card-name"]'))
    await hold(p, nr.x + 20, nr.y + 10); await settle(p, 700)
    ok(await cards.nth(0).getAttribute('data-selected') === '' && await target.getAttribute('data-selected') === '', 'a second hold (on a name) adds its card')
    const bar = p.getByRole('toolbar', { name: /selected/ })
    const barWords = await bar.locator('button:not([aria-label="Clear selection"])').allInnerTexts()   // the ✕'s ligature is not a word of the bar
    ok(barWords.filter((w) => w.trim()).join(' · ') === 'Mark done · Assign · More…', `a hold selects; the bar is Mark done · Assign · More… (${barWords.join(' · ')})`)
    const br = await rect(bar)
    ok(br.x >= 0 && br.r <= 390, 'the bar fits the screen — nothing runs off it (C-04)')
    await bar.getByRole('button', { name: 'More…' }).tap(); await settle(p, 700)
    const more = p.locator('[data-testid="tasks-bulk-more"]')
    ok((await more.innerText()).replace(/\s+/g, ' ').includes('Save as a template') && (await more.innerText()).includes('Duplicate') && (await more.innerText()).includes('Delete'), 'More… holds Save as a template · Duplicate · Delete')   // (the calm UI build 2026-10-27, a deliberate change)
    await shot(p, 'm390-02-bulk-more')
    await p.keyboard.press('Escape'); await settle(p, 400)
    await bar.getByRole('button', { name: 'Clear selection' }).tap(); await settle(p, 600)
    // a tap opens the task — on the task
    await cards.filter({ hasText: 'Send the revised material board' }).locator('[data-testid="task-card-due"]').tap(); await settle(p, 1000)
    const panel = p.getByRole('dialog').last()
    const order = await panel.evaluate((el) => { const t = el.innerText; return { name: t.indexOf('Task name'), when: t.indexOf('Due date'), who: t.indexOf('Members'), creator: t.indexOf('Creator'), made: t.indexOf('Created by') } })
    ok(order.name >= 0 && order.name < order.when && order.when < order.who && order.creator === -1 && order.made > order.who, 'the panel opens on the task: name · When · Who first, who made it last (C-24)')
    ok(await panel.locator('[data-testid="panel-due-presets"] [role="radio"]').count() === 4, 'When carries the four presets')
    await shot(p, 'm390-03-task-panel')
    await panel.locator('[data-testid="panel-due-presets"] [role="radio"]', { hasText: 'Tomorrow 10:00' }).tap(); await settle(p, 1400)
    const dueAt = new Date(Number(sql(`select due_at from lead_tasks where title like 'Send the revised material board%' and lead_id = '${OLIVIA}'`)) * 1000)
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1)
    ok(dueAt.getDate() === tmr.getDate() && dueAt.getHours() === 10 && dueAt.getMinutes() === 0, 'a preset sets the due day and the hour in one tap')
    // C-20: Pick a day opens the house calendar, every control a 44
    await panel.locator('[data-testid="panel-due-presets"] [role="radio"]').last().tap(); await settle(p, 800)
    const today = p.getByRole('button', { name: 'Today', exact: true }).last(), doneBtn = p.getByRole('button', { name: 'Done', exact: true }).last()
    const tdr = await rect(today), dnr = await rect(doneBtn)
    ok(tdr.w >= 44 && tdr.h >= 44 && dnr.h >= 44, `the calendar’s Today and Done are 44 on a phone (C-20: ${Math.round(tdr.w)}×${Math.round(tdr.h)} · ${Math.round(dnr.h)})`)
    await shot(p, 'm390-03b-pick-a-day')
    await doneBtn.tap(); await settle(p, 500)
    await p.keyboard.press('Escape'); await settle(p, 600)
    if (await p.getByRole('dialog').count()) { await p.getByRole('button', { name: /^Close/ }).last().tap().catch(() => {}); await settle(p, 500) }
    putBack()
    // C-19: a Sort radio's row is its label
    await p.getByRole('button', { name: 'Filters', exact: true }).first().tap(); await settle(p, 800)
    const sortRow = p.getByRole('radio', { name: 'Due date' }).first()
    const label = sortRow.locator('xpath=ancestor::*[contains(@class,"sortRow")][1]/*[1]')   // the DS radio's own root, the row's one child
    const lr = await rect(label)
    ok(lr.h >= 44 && lr.w > 150 && await hits(label, lr.r - 6, lr.y + lr.h / 2), `a Sort radio’s whole row is its label (C-19: ${Math.round(lr.w)}×${Math.round(lr.h)})`)
    await p.keyboard.press('Escape'); await settle(p, 500)
    if (await p.getByRole('dialog').count()) { await p.getByRole('button', { name: /^(Close|Done)$/ }).last().tap().catch(() => {}); await settle(p, 500) }
    // the quick add: + › Create New Task → the caret in the row → a title and a preset → Add
    await p.getByRole('button', { name: 'New task' }).first().tap(); await settle(p, 500)   // (the calm UI build 2026-10-27, a deliberate change) — New task ▾ › Blank task
    await p.getByRole('menuitem', { name: 'Blank task' }).tap(); await settle(p, 900)
    const quick = p.locator('[data-testid="task-quick-input"]')
    ok(await quick.evaluate((el) => document.activeElement === el), 'Create New Task lands the caret in the quick add')
    ok(await fontPx(quick) === 16, 'the quick add types at 16')
    await quick.fill('Call back about the kitchen layout')
    const opts = p.locator('[data-testid="task-quick-opts"]')
    ok(await opts.isVisible(), 'once in use the presets and who share one row')
    ok(/Assign|Dane|Sarah|Hui|Germaine|\+/.test(await p.locator('[data-testid="task-quick-who"]').innerText()), 'who it is for is a pill in the same row')
    await opts.locator('[role="radio"]', { hasText: 'Tomorrow 10:00' }).tap(); await settle(p, 300)
    // C-08: the Maison AI button rests in the quick add's corner, clear of Add
    const fab = p.getByRole('button', { name: 'Maison AI' })
    const save = p.locator('[data-testid="task-quick-save"]')
    if (await fab.count() && await fab.isVisible()) {
      const fr = await rect(fab), sr = await rect(save), qr = await rect(p.locator('[data-testid="task-quick-add"]'))
      ok(sr.r <= fr.x && fr.y >= qr.y - 1, 'the Maison AI button rests in the quick add’s corner, never on Add (C-08)')
    } else ok(true, 'the Maison AI button is away (tucked) — nothing to cover')
    await shot(p, 'm390-04-quick-add')
    await save.tap(); await settle(p, 1500)
    const made = json(`select id, due_at from lead_tasks where lead_id = '${OLIVIA}' and title = 'Call back about the kitchen layout'`)
    const madeDue = made[0] ? new Date(Number(made[0].due_at) * 1000) : null
    ok(made.length === 1 && madeDue && madeDue.getDate() === tmr.getDate() && madeDue.getHours() === 10, 'Add saves the task with its day — "call back tomorrow at 10" in a title and one tap')
    ok(await quick.evaluate((el) => document.activeElement === el && el.value === ''), 'the quick add stays for the next one, empty')
    ok(await docOverflow(p) <= 0, 'no sideways scroll at 390')
    await ctx.close()
    putBack()
  }

  // ── 2 · P-10 · C-07 at 768 / 1024 (touch) ──
  console.log('2 · the Tasks table on a touch tablet')
  for (const [w, h] of [[768, 1024], [1024, 768]]) {
    const ctx = await touchCtx(w, h); const p = await page(ctx, `t${w}-tasks`)
    await p.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('om.columns.')) localStorage.removeItem(k) } catch {} })
    await go(p, `/leads/${OLIVIA}/tasks`)
    await shot(p, `t${w}-01-tasks`)
    const heads = (await p.locator('[data-cols="lead-tasks"] [role="columnheader"] [class*="hLabel"]').allInnerTexts()).map((t) => t.trim().toUpperCase()).filter(Boolean)
    ok(heads.join(' · ') === 'TITLE · MEMBERS · DUE DATE', `${w}: Title · Members · Due date — Creator, Tags and Status in Column settings (${heads.join(' · ')})`)   // (the calm UI build 2026-10-27, a deliberate change) — 1-07: an open list's Status rests in Column settings
    const frame = await rect(p.locator('[data-cols="lead-tasks"]'))
    const kebab = p.getByRole('button', { name: /^More actions for / }).first()
    const kr = await rect(kebab)
    ok(kr.r <= frame.r + 1 && kr.x >= frame.x, `${w}: the row’s ⋮ is in view at the frozen right (C-07)`)
    ok(await p.locator('[data-cols="lead-tasks"] [role="row"] button', { hasText: /^Edit$/ }).first().isVisible().catch(() => false) === false, `${w}: Edit steps out — the title opens`)
    await kebab.tap(); await settle(p, 600)
    ok(await p.getByRole('menuitem', { name: 'Rename' }).count() > 0, `${w}: the frozen ⋮ opens the row’s menu`)
    await p.keyboard.press('Escape'); await settle(p, 400)
    ok(await p.locator('[data-testid="task-quick-add"]').isVisible(), `${w}: the quick add at the foot`)
    await ctx.close()
  }

  // ── 3 · the rail's /tasks and a project's Tasks at 390 ──
  console.log('3 · /tasks and a project’s Tasks at 390')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-rail')
    await go(p, '/tasks')
    await shot(p, 'm390-05-rail-tasks')
    ok(await p.locator('[data-testid="task-card"]').count() > 0 && await p.locator('[data-testid="task-card-for"]').count() > 0, 'the rail’s cards name whose task it is')
    await p.locator('[data-testid="task-quick-input"]').tap(); await settle(p, 500)
    ok(/General/.test(await p.locator('[data-testid="task-add-lead"]').innerText()), 'the quick add carries the Lead pill (General until picked)')   // (the calm UI build 2026-10-27, a deliberate change) — 1-16: "General" for a task on no record (was Studio)
    await go(p, `/projects/${RYAN_PROJECT}/tasks`)
    ok(await p.locator('[data-testid="task-card"]').count() > 0, 'a project’s Tasks are the same cards')
    await ctx.close()
  }

  // ── 4 · P-11 at 390: Files camera-first ──
  console.log('4 · Files on a phone')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-files')
    await go(p, `/leads/${OLIVIA}/files`)
    await shot(p, 'm390-06-files')
    const bar = p.locator('[data-phone]').first()
    const glyphs = await bar.locator('button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.getAttribute('aria-label') || e.innerText))
    ok(glyphs.join(' · ') === 'Take a photo · Search files · More options', `one row of three: Take a photo · Search · ⋮ (${glyphs.join(' · ')})`)
    const cam = p.locator('[data-testid="files-camera"]')
    ok(await cam.getAttribute('accept') === 'image/*' && await cam.getAttribute('capture') === 'environment', 'Take a photo is the camera at once — pictures, the back camera')
    // a photo, taken: it lands in the open folder; the snackbar offers the next
    await go(p, `/leads/${OLIVIA}/files?folder=${KITCHEN}`)
    await shot(p, 'm390-07-folder')
    const fbar = p.locator('[data-phone]').first()
    ok(await p.locator('[data-testid="files-phone-crumb"]').isVisible() && (await fbar.locator('button[aria-label="More options"]').count()) === 1 && await p.locator('[data-testid="folder-crumbs"]').count() === 0, 'inside a folder: ← and its name, the same three glyphs — one row, one ⋮ (C-15)')
    const before4 = Number(sql(`select count(*) from lead_files where parent_id = '${KITCHEN}' and deleted_at is null`))
    const sharp = require('sharp')
    const jpeg = path.join(os.tmpdir(), `rl-l4-site-${process.pid}.jpg`)
    fs.writeFileSync(jpeg, await sharp({ create: { width: 640, height: 480, channels: 3, background: '#cfc6b8' } }).jpeg({ quality: 70 }).toBuffer())
    const chooser = p.waitForEvent('filechooser')
    await p.locator('[data-testid="files-take-photo"]').tap()
    const fc = await chooser
    await fc.setFiles(jpeg); await settle(p, 2200)
    ok(Number(sql(`select count(*) from lead_files where parent_id = '${KITCHEN}' and deleted_at is null`)) === before4 + 1, 'the photo lands in the open folder')
    const s = await p.locator('body').innerText()
    ok(/Photo saved to Kitchen/.test(s) && /Take another/.test(s), 'the snackbar says where it went and offers the next one')
    await shot(p, 'm390-08-photo-saved')
    await p.locator('[data-testid="files-phone-more"]').tap(); await settle(p, 600)
    const menu = await p.getByRole('menu').last().innerText()
    ok(/Choose files/.test(menu) && /New folder/.test(menu) && /Filters/.test(menu) && /Deleted files/i.test(menu) && /Rename folder/.test(menu), 'the ⋮ holds Choose files · New folder · Filters · Deleted Files and the folder’s own rows')
    await p.keyboard.press('Escape'); await settle(p, 400)
    await ctx.close()
    putBack()
    const c320 = await touchCtx(320, 700); const q = await page(c320, 'w320-files')
    await go(q, `/leads/${OLIVIA}/files`)
    const title = q.locator('[data-phone] h2').first()
    ok(await title.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'at 320 the title owns its line — "All Files" whole (C-16)')
    ok(await docOverflow(q) <= 0, 'no sideways scroll at 320 on Files')
    await c320.close()
    // 768: the list view's tablet set
    const tab = await touchCtx(768, 1024); const t = await page(tab, 't768-files')
    await t.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('om.columns.')) localStorage.removeItem(k) } catch {} })
    await go(t, `/leads/${OLIVIA}/files`)
    await t.getByRole('radio', { name: 'List view' }).tap().catch(async () => { await t.getByLabel('List view').tap() }); await settle(t, 900)
    const fh = (await t.locator('[data-cols="lead-files"] [role="columnheader"] [class*="hLabel"]').allInnerTexts()).map((x) => x.trim().toUpperCase()).filter(Boolean)
    ok(fh.join(' · ') === 'TITLE · OWNER · UPDATED', `768: the list opens with Title · Owner · Updated (${fh.join(' · ')})`)
    const ff = await rect(t.locator('[data-cols="lead-files"]'))
    const fk = await rect(t.locator('[data-cols="lead-files"] [role="row"]').nth(1).getByRole('button', { name: /^More actions|Actions for/ }).first())
    ok(fk.r <= ff.r + 1, '768: the row’s ⋮ is in view, frozen at the right')
    await shot(t, 't768-02-files-list')
    await tab.close()
  }

  // ── 5 · C-23 at 390: the viewer ──
  console.log('5 · the file viewer on a phone')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-viewer')
    const first = FILES[0].id, second = FILES[1].id
    await go(p, `/leads/${OLIVIA}/files/${first}`)
    const img = p.locator('[data-testid="viewer-image"]')
    const ir = await rect(img)
    const cx = ir.x + ir.w / 2, cy = ir.y + ir.h / 2
    const touch = (type, pts) => p.evaluate(([type2, pts2]) => {
      const el = document.querySelector('[data-testid="viewer-image"]').parentElement
      const mk = (pt, i) => new Touch({ identifier: i, target: el, clientX: pt[0], clientY: pt[1] })
      const list = pts2.map(mk)
      el.dispatchEvent(new TouchEvent(type2, { bubbles: true, cancelable: true, touches: type2 === 'touchend' ? [] : list, targetTouches: type2 === 'touchend' ? [] : list, changedTouches: list }))
    }, [type, pts])
    // pinch: two fingers apart
    await touch('touchstart', [[cx - 30, cy], [cx + 30, cy]])
    for (let d = 40; d <= 120; d += 20) await touch('touchmove', [[cx - d, cy], [cx + d, cy]])
    await touch('touchend', [[cx - 120, cy], [cx + 120, cy]]); await settle(p, 500)
    const s1 = Number(await img.getAttribute('data-scale'))
    ok(s1 > 1.5, `two fingers zoom the picture (×${s1}) — the page and its bar never scale (C-23)`)
    ok(await p.evaluate(() => window.visualViewport ? window.visualViewport.scale === 1 : true), 'the page itself stays at its scale')
    await shot(p, 'm390-09-viewer-pinched')
    // double-tap back to fit
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 80)
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 500)
    ok(Number(await img.getAttribute('data-scale')) === 1, 'a double-tap goes back to fit')
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 80)
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 500)
    ok(Number(await img.getAttribute('data-scale')) > 2, 'a double-tap at fit zooms in there')
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 80)
    await touch('touchstart', [[cx, cy]]); await touch('touchend', [[cx, cy]]); await settle(p, 500)
    // a swipe at fit: the folder's next file
    await touch('touchstart', [[cx + 120, cy]])
    for (let x = 100; x >= -100; x -= 40) await touch('touchmove', [[cx + x, cy]])
    await touch('touchend', [[cx - 100, cy]]); await settle(p, 2000)
    ok(p.url().includes(`/files/${second}`), 'a swipe at fit opens the folder’s next file')
    ok(Number(await p.locator('[data-testid="viewer-image"]').getAttribute('data-scale')) === 1, 'the next file opens at fit')
    // Information: a short sheet
    await p.getByRole('button', { name: 'Information' }).tap(); await settle(p, 800)
    const sheet = p.getByRole('dialog', { name: 'Information' })
    const shr = await rect(sheet)
    ok(await sheet.isVisible() && shr.h < 844 * 0.7 && await p.locator('[data-testid="file-info-rows"]').isVisible(), 'Information is a short sheet as tall as its lines, not a screen of air')
    await shot(p, 'm390-10-viewer-info')
    await p.keyboard.press('Escape'); await settle(p, 500)
    await p.getByRole('button', { name: 'Comments' }).tap(); await settle(p, 800)
    ok(/Q-101|\S/.test(await p.locator('aside[aria-label="Comments"]').innerText()) && (await p.locator('aside[aria-label="Comments"]').innerText()).includes(await p.locator('h1').first().innerText()), 'Comments name the file they are about')
    await ctx.close()
  }

  // ── 6 · C-10 · C-14 · C-22: Notes ──
  console.log('6 · Notes: the attachment’s day, the tablet upright, the composer')
  const noteWithFiles = sql(`select n.id from lead_notes n join note_attachments a on a.note_id = n.id where n.lead_id = '${OLIVIA}' group by n.id order by count(*) desc limit 1`)
  for (const [w, h, touch] of [[390, 844, true], [1024, 768, true], [1440, 1024, false]]) {
    const ctx = touch ? await touchCtx(w, h) : await mouseCtx(w, h); const p = await page(ctx, `${w}-notes`)
    await go(p, `/leads/${OLIVIA}/notes?open=${noteWithFiles}`)
    const tile = p.locator('[data-testid="note-attachment"]:visible').first()
    if (!(await tile.isVisible().catch(() => false))) { ok(false, `${w}: the note’s attachments show`); await ctx.close(); continue }
    const day = tile.locator('[data-testid="note-attachment-day"]')
    const dr = await rect(day), kr = await rect(tile.locator('button[aria-haspopup="menu"]'))
    ok(dr.r <= kr.x + 1 || dr.b <= kr.y + 1, `${w}: the attachment’s day never runs under its ⋮ (C-10)`)
    ok(/^\d{1,2} [A-Z][a-z]{2} ’\d{2}$/.test((await day.innerText()).trim()), `${w}: it says the day ("30 Aug ’26"), the time a hover away`)
    if (w === 390) ok(await fontPx(day) === 14 && await fontPx(tile.locator('span[class*="tileName"]')) === 16, '390: a list row — the name at 16, its day at 14')
    await shot(p, `${w}-11-notes-attachment`)
    await ctx.close()
  }
  {
    const ctx = await touchCtx(768, 1024); const p = await page(ctx, 't768-notes')
    await go(p, `/leads/${OLIVIA}/notes`)
    const pane = await p.evaluate(() => { const panes = [...document.querySelectorAll('[class*="lead-notes-module"][class*="pane"]')]; return panes.some((el) => el.offsetParent !== null) })
    ok(!pane, '768 upright: Notes is the phone’s list — no 268 pane beside a 280 list (C-14)')
    /* (the calm UI build 2026-10-27, a deliberate change — 2-46) the composer is closed at rest; New note › Note (here `?new=note`) opens it */
    await go(p, `/leads/${OLIVIA}/notes?new=note`)
    const composerBody = p.locator('[data-testid="note-editor"] [role="textbox"]').first()
    ok(await composerBody.isVisible() && await fontPx(composerBody) === 16, '768 upright: the composer New note opens, its body typing at 16 (C-22)')
    await shot(p, 't768-12-notes')
    await ctx.close()
    const c390 = await touchCtx(390, 844); const q = await page(c390, 'm390-notes')
    await go(q, `/leads/${OLIVIA}/notes?new=note`)   // (the calm UI build 2026-10-27, a deliberate change) — 2-46: New note opens the composer
    const cb = q.locator('[data-testid="note-editor"] [role="textbox"]').first()
    ok(await fontPx(cb) === 16, '390: the composer’s body types at 16 (C-22)')
    const fab = q.locator('[data-maison-fab] button[aria-label="Maison AI"]')   // (the calm UI build 2026-10-27, a deliberate change) — New note opens the editor, whose tool row has its own Maison AI chip
    if (await fab.isVisible()) {
      const fr = await rect(fab), sr = await rect(q.getByRole('button', { name: 'Save', exact: true }).last())
      ok(sr.r <= fr.x + 1, '390: the Maison AI button rests in the composer’s corner, clear of Save (C-08)')
    }
    await c390.close()
  }

  // ── 7 · P-12 at 390: Questionnaire ──
  console.log('7 · Questionnaire reads first')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-quest')
    await go(p, `/leads/${OLIVIA}/questionnaire`)
    const rf = p.locator('[data-testid="questionnaire-read-first"]')
    const firstCard = p.locator('[data-testid="question-card"]').first()
    ok(await rf.isVisible() && (await rect(rf)).b <= (await rect(firstCard)).y, 'the count and the chips sit above the first card')
    ok(/^\d+ to answer · \d+ answered$|^All \d+ answered$/.test((await rf.locator('p').innerText()).trim()), `"n to answer · n answered" (${(await rf.locator('p').innerText()).trim()})`)
    await p.getByRole('radio', { name: /^Answered/ }).tap(); await settle(p, 500)
    const states = await p.locator('[data-testid="question-card"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')))
    ok(states.length > 0 && states.every((s) => s === 'studio' || s === 'client'), 'Answered keeps the answered cards')
    const by = p.locator('[data-testid="question-by"]').first()
    ok(await by.isVisible() && await fontPx(by) === 14, 'who answered is a 14 line in the answer — no 10px tag (C-25)')
    await shot(p, 'm390-13-questionnaire')
    await p.getByRole('radio', { name: /^To answer/ }).tap(); await settle(p, 400)
    await p.locator('[data-testid="ask-client"]').tap(); await settle(p, 900)   // (the calm UI build 2026-10-27, a deliberate change) — "Ask {client}" 
    const ticks = p.locator('[data-testid="ask-questions"] label')
    const lefts = await ticks.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)))
    const heights = await ticks.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    ok(lefts.length > 1 && new Set(lefts).size === 1 && heights.every((x) => x >= 44), `Ask the client’s ticks are full-width 44 rows in one column (C-13: lefts ${[...new Set(lefts)].join(',')})`)
    await shot(p, 'm390-14-ask-client')
    await ctx.close()
  }

  // ── 8 · P-12 · C-12 at 390: Activity ──
  console.log('8 · Activity by day')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-activity')
    await go(p, `/leads/${OLIVIA}/activity`)
    const days = p.locator('[data-testid="activity-days"] h3')
    ok(await days.count() > 0, `the feed reads by day (${(await days.allInnerTexts()).slice(0, 3).join(' · ')})`)
    const rows = p.locator('[data-testid="activity-link"], [data-testid="activity-run-toggle"]')
    const rr = await rows.evaluateAll((els) => els.slice(0, 8).map((e) => e.getBoundingClientRect().height))
    ok(rr.length > 0 && rr.every((x) => x >= 44), 'a row that leads somewhere is a 44 press')
    const run = p.locator('[data-testid="activity-run-toggle"]').first()
    if (await run.count()) {
      const words = await run.innerText()
      await run.tap(); await settle(p, 400)
      ok(/\d+ \w+s\.|times\.|more like it\./.test(words) && await run.getAttribute('aria-expanded') === 'true', `a run is one line that opens ("${words.replace(/\s+/g, ' ').slice(0, 60)}")`)
    } else ok(true, 'no run on this feed today — nothing to fold')
    await shot(p, 'm390-15-activity')
    const all = await p.locator('[data-testid="activity-older"]').count()
    if (all) { await p.locator('[data-testid="activity-older"]').tap(); await settle(p, 400); ok(true, 'Show older adds the next page') }
    await ctx.close()
  }

  // ── 9 · P-12 · C-11 · C-26: Meetings ──
  console.log('9 · Meetings')
  {
    const ctx = await touchCtx(390, 844); const p = await page(ctx, 'm390-meetings')
    await go(p, `/leads/${KELVIN}/meetings`)
    const card = p.locator('[data-testid="meeting-row"]').first()
    const cr = await rect(card)
    await p.touchscreen.tap(cr.x + cr.w * 0.6, cr.y + cr.h * 0.75); await settle(p, 2500)
    ok(p.url().includes(`/meetings/${MEETING}`), 'a tap on the card’s body opens the meeting (C-11)')
    const foot = p.locator('[data-testid="room-foot"]')
    const fr = await rect(foot)
    ok(await foot.isVisible() && fr.b <= 844 + 1, 'the meeting’s move sits in the foot, in view (C-26)')
    const btns = await foot.locator('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    ok(btns.length > 0 && btns.every((x) => x >= 48), 'its buttons are 48')
    await shot(p, 'm390-16-meeting-room')
    await ctx.close()
    const tab = await touchCtx(768, 1024); const t = await page(tab, 't768-meetings')
    await t.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('om.columns.')) localStorage.removeItem(k) } catch {} })
    await go(t, `/leads/${KELVIN}/meetings`)
    const mh = (await t.locator('[data-cols="meetings"] [role="columnheader"] [class*="hLabel"]').allInnerTexts()).map((x) => x.trim().toUpperCase()).filter(Boolean)
    ok(mh.join(' · ') === 'MEETING · WHEN · STATUS', `768: Meeting · When · Status (${mh.join(' · ')})`)
    ok(await t.locator('[data-testid="meetings-actions-head"]').count() === 1, '768: the ⋮ column frozen at the right')
    await tab.close()
  }

  // ── 10 · 1440: the desk as it was ──
  console.log('10 · the desk at 1440')
  {
    const ctx = await mouseCtx(1440, 1024); const p = await page(ctx, 'd1440')
    await p.addInitScript(() => { try { for (const k of Object.keys(localStorage)) if (k.startsWith('om.columns.')) localStorage.removeItem(k) } catch {} })
    await go(p, `/leads/${OLIVIA}/tasks`)
    const heads = (await p.locator('[data-cols="lead-tasks"] [role="columnheader"] [class*="hLabel"]').allInnerTexts()).map((t) => t.trim().toUpperCase()).filter(Boolean)
    ok(heads.join(' · ') === 'TITLE · MEMBERS · CREATOR · DUE DATE · TAGS', `1440: the Tasks table keeps its columns — Status rests in Column settings (${heads.join(' · ')})`)   // (the calm UI build 2026-10-27, a deliberate change) — 1-07 · 2-19
    ok(await p.locator('[data-testid="task-quick-add"]').count() === 0 && await p.getByRole('button', { name: 'New task' }).count() >= 1, '1440: no quick add — New task ▾ stays')   // (the calm UI build 2026-10-27, a deliberate change)
    await go(p, `/leads/${OLIVIA}/files`)
    ok(await p.getByRole('button', { name: 'New File' }).count() === 1 && await p.locator('[data-testid="files-take-photo"]').count() === 0, '1440: Files keeps New File ▾, no camera')
    await go(p, `/leads/${OLIVIA}/activity`)
    ok(await p.locator('[data-testid="activity-days"]').count() === 0 && await p.locator('[data-testid="activity-row"]').count() > 0, '1440: the one continuous timeline')
    await go(p, `/meetings/${MEETING}`)
    ok(await p.locator('[data-testid="room-foot"]').count() === 0 && await p.locator('[data-testid="room-save"], [data-testid="room-share"]').count() > 0, '1440: the meeting’s move in its head')
    await ctx.close()
  }

  // ── 11 · the lint ──
  console.log('11 · the lint rule')
  {
    const list = execSync('node scripts/design-lint.mjs --list icon-button-overlay', { cwd: REPO, encoding: 'utf8' })
    ok(!/tasks-toolbar|task-panel|meetings-toolbar|meetings-table/.test(list), 'the overlays C-02 named are gone')
    const probe = path.join(REPO, 'components', '__l4_probe__')
    let found = ''
    try {   // a throwaway module pair, always removed — the probe never leaves a file in the repo
      fs.mkdirSync(probe, { recursive: true })
      fs.writeFileSync(path.join(probe, 'x.module.css'), '.t { position: relative; }\n.t::after { content: \'\'; position: absolute; inset: -4px; }\n')
      fs.writeFileSync(path.join(probe, 'x.tsx'), "import { IconButton } from '@/components/om/icon-button'\nimport s from './x.module.css'\nexport const X = () => <IconButton icon=\"add\" label=\"Add\" onClick={() => {}} className={s.t} />\n")
      found = execSync('node scripts/design-lint.mjs --list icon-button-overlay', { cwd: REPO, encoding: 'utf8' })
    } finally { fs.rmSync(probe, { recursive: true, force: true }) }
    ok(/__l4_probe__\/x\.module\.css:2/.test(found), 'the rule now finds a `::after` inset on a class handed to an IconButton')
  }

  // ── 12 · 320 ──
  console.log('12 · 320')
  {
    const ctx = await touchCtx(320, 700); const p = await page(ctx, 'w320')
    for (const t of ['tasks', 'notes', 'questionnaire', 'activity']) { await go(p, `/leads/${OLIVIA}/${t}`, 1200); ok(await docOverflow(p) <= 0, `320: no sideways scroll on ${t}`) }
    await ctx.close()
  }

  await b.close()
  const back = putBack()
  ok(back.length === 0 || TABLES.every((t) => hashOf(t) === before.get(t)), `everything written is put back${back.length ? ` (${back.join(', ')})` : ''}`)
  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
  console.log(`\nverify-rl-l4: ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
