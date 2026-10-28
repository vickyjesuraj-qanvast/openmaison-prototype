// Pending modules, step S10 · The mAIson assistant (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// studio:maison-assistant · api:maison-bot-assistant · held:maison-ai). Each item asserted as the rule it builds, never another round's count:
//  - ONE Maison AI, everywhere: the shell's sheet and the editors' (quote, contract, contract template, quote template, T&Cs, payment, task,
//    schedule, the AI Visualizer, the Space Planner) are the same sheet — its Ask box, "Answers from your records", suggestions that act;
//    no suggestion anywhere answers "Coming soon" (the editors, the tool homes, Company › Client portal, Plan & AI credits, Qanvast Ops,
//    the lead brief's two that did)
//  - the Ask box answers by rule from the records: tasks, leads, quotes, the team, the studio, the books' reports (with bars in the answer),
//    set-up; a name alone reads its client; what it can't answer, it says so, with what it can
//  - a change is shown before it happens: a reminder, a task ticked done, a repeat stopped, a variation order, a WhatsApp draft — each a
//    proposal with Not now and one button; nothing is written until it is pressed; the house action does it, with its Undo
//  - money doors open the house form filled: "Benjamin paid 5,000" → Record a payment with S$5,000.00; "record an expense for …" → Log an
//    expense on the project
//  - Recent: the member's own questions, a record (there on another page, there after a reload), asked again with a press, Clear + Undo
//  - roles: a Designer is told the books are Owners', Admins' and Accounting's; Accounting gets the books' own answer and "Not for Accounting"
//    on the leads' work
//  - ⌘K's People open the member's row on Members; the editors' own Ask understands the page ("check the margins" → its hint)
//  - 390 and 320: the sheet inside the screen, no sideways scroll (against screen.width); no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s10.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s10')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s10-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
/* the demo's records */
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'       // New · OM-10001 · no member
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789'       // Quote Sent · the Close with confidence brief
const MUTHU = '72d56067-21ce-47d1-aa5b-dbbe70d88e0b'        // Lost · the Keep the door open brief
const BEN_PROJECT = sql(`select id from projects where number = 'P-2026-002'`)
const id = (q) => sql(q).split('\n')[0]
const Q1 = id(`select id from quotes where number = 'OM-10001'`)
const EDITORS = [
  ['quote editor', `/quotes/${Q1}`],
  ['contract editor', `/contracts/${id(`select id from contracts where deleted_at is null order by created_at limit 1`)}`],
  ['contract template editor', `/templates/contracts/${id(`select id from contract_templates where deleted_at is null and kind <> 'pdf' order by created_at limit 1`)}`],
  ['quote template editor', `/templates/${id(`select id from quote_templates where deleted_at is null and is_default = 1 limit 1`)}`],
  ['T&Cs template editor', `/templates/terms/${id(`select id from quote_text_templates where deleted_at is null order by created_at limit 1`)}`],
  ['payment template editor', '/templates/payments/20-40-40'],
  ['task template editor', `/templates/tasks/${id(`select id from task_templates order by created_at limit 1`)}`],
  ['schedule template editor', `/templates/schedules/${id(`select id from schedule_templates order by created_at limit 1`)}`],
  ['AI Visualizer editor', `/visualizer/${id(`select id from visualizer_designs where deleted_at is null and lead_id is not null limit 1`)}`],
  ['Space Planner editor', `/planner/${id(`select id from space_layouts where deleted_at is null order by created_at limit 1`)}`],
]
const PAGES = [
  ['the Leads listing', '/leads'], ['a Quote Sent lead', `/leads/${SERENA}`], ['a Lost lead', `/leads/${MUTHU}`], ['the AI Visualizer', '/visualizer'], ['the Space Planner', '/planner'],
  ['Company › Client portal', '/company/portal'], ['Plan & AI credits › Usage', '/company/plan'], ['Plan & billing', '/company/plan/billing'], ['Qanvast Ops › Leads', '/qanvast-ops'], ['Qanvast Ops › Studios', '/qanvast-ops/studios'],
]

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const WHOLE = ['lead_tasks', 'task_assignees', 'lead_events', 'notifications', 'notification_outbox', 'expenses', 'payment_templates', 'maison_questions', 'settings', 'portal_previews']   // portal_previews: Company › Client portal writes its test client's look on open
  const kept = WHOLE.map((t) => [t, json(`select * from ${t}`)])
  const quotes0 = new Set(sql(`select id from quotes`).split('\n').filter(Boolean))
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    const made = sql(`select id from quotes`).split('\n').filter((x) => x && !quotes0.has(x))
    if (made.length) {
      const ids = made.map(lit).join(',')
      for (const t of ['quote_items', 'quote_payments', 'quote_files', 'quote_versions', 'quote_item_comments']) text += `DELETE FROM ${t} WHERE quote_id IN (${ids});\n`
      text += `DELETE FROM quotes WHERE id IN (${ids});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1200) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }
  const panel = (p) => sheet(p).locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first()
  const waitPanel = (p) => p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"],[data-testid="maison-proposal"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
  const ask = async (p, q) => {
    const box = sheet(p).locator('[data-testid="maison-ask"] input')
    await box.fill(q); await box.press('Enter')
    await waitPanel(p); await settle(p, 300)
    return panel(p)
  }
  const back = async (p) => { await sheet(p).locator('[data-testid="maison-back"]').click().catch(() => {}); await settle(p, 250) }
  const suggestions = async (p) => (await sheet(p).locator('button[class*="suggestion"]').allInnerTexts()).filter((s) => !/Keyboard shortcuts/.test(s))
  const tasksOf = (lead) => Number(sql(`select count(*) from lead_tasks where lead_id = '${lead}'`))

  try {
    as('dane')
    const ctx = await desk()
    const popups = []
    await ctx.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) })
    const p = await page(ctx, 'desk')
    /* open one page and wait before any snapshot (the probe habit after S08) */
    await go(p, '/leads')

    // ── 1 · one Maison AI, everywhere ────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · One sheet everywhere — the Ask box and suggestions that act, never Coming soon')
      for (const [name, url] of [...EDITORS, ...PAGES]) {
        await go(p, url)
        const fabBtn = p.locator('button[aria-label="Maison AI"]').last()
        if (!(await fabBtn.isVisible().catch(() => false))) { ok(false, `${name}: the Maison AI button is there`); continue }
        await fab(p)
        const s = sheet(p)
        const words = await s.innerText().catch(() => '')
        const sug = await suggestions(p)
        ok(await s.locator('[data-testid="maison-ask"]').count() === 1 && /Ask Maison AI/.test(words) && sug.length >= 2, `${name}: the one sheet — the Ask box and ${sug.length} suggestions`)   // (the calm UI build 2026-10-27, a deliberate change) the box's helper "Answers from your records" went (W-113); the box is "Ask Maison AI"
        let soon = false
        for (const label of sug) {
          if (!(await s.isVisible().catch(() => false))) await fab(p)
          await s.getByRole('button', { name: label, exact: true }).click(); await settle(p, 900)
          if (/Coming soon/i.test(await snackText(p))) soon = true
          if (await panel(p).count()) await back(p)
          else { await p.keyboard.press('Escape'); await settle(p, 300); if (!p.url().startsWith(BASE + url.split('?')[0])) await go(p, url) }
        }
        ok(!soon, `${name}: no suggestion answers Coming soon`)
        if (name === 'contract editor') await shot(p, '01-contract-editor-sheet-1440')
        await p.keyboard.press('Escape'); await settle(p, 200)
      }
    }

    // ── 2 · the Ask box answers by rule ──────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · The Ask box answers from the records, by rule')
      await go(p, '/leads'); await fab(p)
      const mine = Number(sql(`select count(*) from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id = 'dane' and t.done = 0 and t.due_at is not null and t.due_at < strftime('%s', date('now', 'localtime', 'start of day', 'utc'))`))
      let a = await ask(p, 'my overdue tasks')
      ok(mine ? new RegExp(`${mine} tasks? overdue`).test(await a.innerText()) : /Nothing overdue/.test(await a.innerText()), `my overdue tasks: the member's own, by their due day (${mine})`)
      ok(await sheet(p).locator('[data-testid="maison-link"]').innerText().catch(() => '') === 'Open My Tasks', '…with the way to My Tasks')
      a = await ask(p, 'Which leads need attention?')
      ok(/need(s)? attention|No lead needs you/.test(await a.innerText()), 'which leads need attention: late follow-ups, today’s, New with no contact, no member')
      a = await ask(p, 'which quotes expire soon')
      ok(/run(s)? out soon|No quote runs out soon/.test(await a.innerText()), 'quotes running out: by their Valid until')
      a = await ask(p, 'who is on the team')
      const active = Number(sql(`select count(*) from members where is_active = 1`))
      ok(new RegExp(`${active} members`).test(await a.innerText()) && await a.locator('[data-testid="maison-row"]').count() === active, `the team: every active member with their leads, projects and tasks (${active})`)
      a = await ask(p, 'studio overview')
      /* (Dashboard redesign 2026-10-26, a deliberate change — his P-10) the studio today answers as figures, each a door that asks for its list */
      ok(/Your studio today/.test(await a.innerText()) && await a.locator('[data-testid^="maison-figure-"][data-press]').count() >= 3, 'the studio today: each figure asks for the list behind it')
      a = await ask(p, 'Cash flow')
      ok(/Cash flow/.test(await a.innerText()) && await a.locator('[data-testid="maison-row"] span[aria-hidden] > span').count() >= 1, 'cash flow from Reports › Finance — with bars drawn in the answer')
      await shot(p, '02-ask-cashflow-bars-1440')
      ok(/Open Cash flow/.test(await sheet(p).locator('[data-testid="maison-link"]').innerText()), '…and the way to its report')
      a = await ask(p, 'What’s left to set up?')
      ok(/set up/i.test(await a.innerText()), 'set-up: Settings › Studio’s own list')
      a = await ask(p, 'Olivia Martinez')
      ok(/Olivia Martinez/.test(await a.innerText()) && /New for/.test(await a.innerText()) && /Open Olivia’s lead/.test(await sheet(p).locator('[data-testid="maison-link"]').innerText()), 'a name alone: the client’s card — stage, days in it, next task, quote, the way to the lead')
      a = await ask(p, 'hello there')
      ok(/I can’t answer that yet/.test(await a.innerText()) && await sheet(p).locator('[data-testid="maison-chips"] button, [data-testid="maison-chips"] [role="radio"]').count() >= 5, 'what it can’t answer it says so — with the questions it can, as chips')
      await shot(p, '02-ask-honest-1440')
      a = await ask(p, 'What needs my approval?')
      ok(/Waiting for your OK|Nothing waits for your approval/.test(await a.innerText()), 'what waits for my OK: each opens where it is approved, nothing approved from here')
      a = await ask(p, 'Optimize the quote for Olivia')
      ok(/OM-10001 · Olivia Martinez/.test(await a.innerText()) && /Open OM-10001/.test(await sheet(p).locator('[data-testid="maison-link"]').innerText().catch(() => '')), '1.0’s Optimize Quote: the client’s latest quote, read as the editor’s hints')
      a = await ask(p, 'Write a site update for Benjamin')
      ok(await a.locator('[data-testid="maison-row"]').filter({ hasText: 'Write the update' }).count() === 1, '1.0’s Site Update: the project’s Updates composer, a press away')
      a = await ask(p, 'read a competitor quote')
      ok(/doesn’t take files in this box yet/.test(await a.innerText()) && await a.locator('[data-testid="maison-row"]').count() === 4, 'a file to read: the tools that read files, said honestly')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 3 · Recent: the member's own questions, a record ────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Recent — kept, asked again, cleared with Undo')
      await go(p, '/leads'); await fab(p)
      await ask(p, 'Quotes waiting for approval'); await back(p)
      const rows = sql(`select question from maison_questions where member_id = 'dane' and cleared_at is null order by asked_at desc limit 1`)
      ok(rows === 'Quotes waiting for approval', 'the question is kept for its member')
      ok(/Quotes waiting for approval/.test(await sheet(p).locator('[data-testid="maison-recent"]').innerText().catch(() => '')), 'Recent shows it, newest first')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, '/projects'); await fab(p)
      ok(/Quotes waiting for approval/.test(await sheet(p).locator('[data-testid="maison-recent-row"]').first().innerText().catch(() => '')), 'on another page, after a reload: still there (a record, not the tab’s memory)')
      await shot(p, '03-recent-1440')
      await sheet(p).locator('[data-testid="maison-recent-row"]').first().click(); await waitPanel(p); await settle(p, 300)
      ok(/approval|waiting/i.test(await panel(p).innerText()), 'a Recent row asks it again, read from the records now')
      await back(p)
      const live = Number(sql(`select count(*) from maison_questions where member_id = 'dane' and cleared_at is null`))
      const others = sql(`select count(*) || ':' || count(cleared_at) from maison_questions where member_id <> 'dane'`)
      await sheet(p).locator('[data-testid="maison-recent-clear"]').click(); await settle(p, 1200)
      ok(await sheet(p).locator('[data-testid="maison-recent"]').count() === 0 && /Recent questions cleared/.test(await snackText(p)), 'Clear: Recent goes, one sentence and Undo')
      ok(Number(sql(`select count(*) from maison_questions where member_id = 'dane' and cleared_at is null`)) === 0, '…cleared on the record')
      await undo(p)
      ok(Number(sql(`select count(*) from maison_questions where member_id = 'dane' and cleared_at is null`)) === live, 'Undo puts every question back')
      ok(sql(`select count(*) || ':' || count(cleared_at) from maison_questions where member_id <> 'dane'`) === others, 'another member’s Recent is untouched by the Clear')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 4 · a change shown before it happens ────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Changes by chat — shown first, one button, the house action, Undo')
      await go(p, '/leads'); await fab(p)
      const before = tasksOf(OLIVIA)
      let a = await ask(p, 'Remind me to call Olivia tomorrow at 3pm')
      const prop = sheet(p).locator('[data-testid="maison-proposal"]')
      const t = await prop.innerText().catch(() => '')
      ok(await prop.count() === 1 && /Call Olivia/.test(t) && /3:00 PM/.test(t) && /On Olivia Martinez’s lead/.test(t) && /Add the task/.test(t), 'a reminder: what it adds, for whom, when and where — and one button')
      await shot(p, '04-propose-reminder-1440')
      ok(tasksOf(OLIVIA) === before, 'nothing is written before the press')
      await prop.getByRole('button', { name: 'Not now' }).click(); await settle(p, 400)
      ok(tasksOf(OLIVIA) === before && await suggestions(p).then((x) => x.length > 0), 'Not now goes back, nothing written')
      a = await ask(p, 'Remind me to call Olivia tomorrow at 3pm')
      await sheet(p).locator('[data-testid="maison-confirm"]').click(); await settle(p, 1800)
      const made = json(`select id, title, due_at, description from lead_tasks where lead_id = '${OLIVIA}' order by created_at desc limit 1`)[0]
      const due = made ? new Date(made.due_at * 1000) : null
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      ok(tasksOf(OLIVIA) === before + 1 && made.title === 'Call Olivia' && due.getHours() === 15 && due.getDate() === tomorrow.getDate() && made.description === 'Added by Maison AI from your question.', 'the press adds it through the house action: Call Olivia, tomorrow 3:00 PM, said where it came from')
      ok(sql(`select group_concat(member_id) from task_assignees where task_id = '${made.id}'`) === 'dane', '…for the one who asked')
      ok(/Task added — Call Olivia/.test(await snackText(p)), 'the house sentence: “Task added — Call Olivia”')
      /* tick it done — the row asks, the proposal shows it, the press ticks it, Undo reopens it */
      await fab(p)
      a = await ask(p, 'Mark the task “Call Olivia” done')
      ok(/Mark “Call Olivia” done/.test(await panel(p).innerText()), 'a task ticked done: shown first')
      await sheet(p).locator('[data-testid="maison-confirm"]').click(); await settle(p, 1600)
      ok(sql(`select done from lead_tasks where id = '${made.id}'`) === '1' && /Task completed/.test(await snackText(p)), 'the press completes it — the Tasks tab’s own sentence and Undo')
      await undo(p)
      ok(sql(`select done from lead_tasks where id = '${made.id}'`) === '0', 'Undo reopens it')
      /* stop a repeat */
      const rep = json(`select id, description from expenses where repeat_of is null and repeat_every is not null and repeat_stopped_at is null and deleted_at is null limit 1`)[0]
      if (rep) {
        await fab(p)
        await ask(p, `Stop repeating ${rep.description}`)
        ok(/Stop repeating/.test(await panel(p).innerText()) && sql(`select coalesce(repeat_stopped_at, '') from expenses where id = '${rep.id}'`) === '', 'a repeat to stop: shown first, nothing stopped yet')
        await sheet(p).locator('[data-testid="maison-confirm"]').click(); await settle(p, 1600)
        ok(sql(`select coalesce(repeat_stopped_at, '') from expenses where id = '${rep.id}'`) !== '' && /won’t repeat any more/.test(await snackText(p)), 'the press stops it — the expense row’s own sentence')
        await undo(p)
        ok(sql(`select coalesce(repeat_stopped_at, '') from expenses where id = '${rep.id}'`) === '', 'Undo starts it again')
      } else ok(false, 'a repeating expense to stop (the demo has one, S06)')
      /* a WhatsApp drafted from the record — opened on the press */
      await fab(p)
      await ask(p, 'Draft a follow-up for Olivia')
      ok(/WhatsApp Olivia/.test(await panel(p).innerText()) && /Open WhatsApp/.test(await panel(p).innerText()), 'a WhatsApp draft: the words from the record, shown first')
      const pop = ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null)
      await sheet(p).locator('[data-testid="maison-confirm"]').click()
      const wa = await pop; await settle(p, 600)
      ok(!!wa && /wa\.me\/6591234567\?text=Hi%20Olivia/.test(wa.url()), 'the press opens WhatsApp with it — the studio sends it there')
      if (wa) await wa.close()
    }

    // ── 5 · money doors: the house form, filled ─────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Money by chat — the house form opens filled')
      await go(p, '/leads'); await fab(p)
      const pays = Number(sql(`select count(*) from project_payments`))
      let a = await ask(p, 'Benjamin paid 5,000')
      ok(/Record S\$5,000\.00 from Benjamin/.test(await a.innerText()), '“Benjamin paid 5,000”: which invoice, with the amount')
      await a.locator('[data-testid="maison-row"]').first().click()
      await p.waitForURL(/\/money/, { timeout: 15000 }).catch(() => {}); await settle(p, 2600)
      const dlg = p.locator('[data-testid="record-payment"]')
      ok(await dlg.isVisible().catch(() => false) && /5,?000\.00/.test(await dlg.getByRole('textbox').first().inputValue().catch(() => '')), 'Record a payment opens on the invoice with S$5,000.00 filled in, to check')
      await shot(p, '05-record-payment-filled-1440')
      ok(Number(sql(`select count(*) from project_payments`)) === pays, 'nothing is recorded until its own button')
      await p.keyboard.press('Escape'); await settle(p, 500)
      ok(!/[?&](new|amount|do|open)=/.test(new URL(p.url()).search), 'the address keeps nothing of the landing')
      await go(p, '/leads'); await fab(p)
      a = await ask(p, 'Record an expense for Benjamin')
      await a.locator('[data-testid="maison-row"]').filter({ hasText: 'An expense on' }).first().click()
      await p.waitForURL(/\/money/, { timeout: 15000 }).catch(() => {}); await settle(p, 2600)
      ok(await p.getByRole('dialog', { name: 'Log an expense' }).isVisible().catch(() => false), '“Record an expense for Benjamin”: Log an expense opens on his project')
      await p.keyboard.press('Escape'); await settle(p, 500)
      await go(p, '/leads'); await fab(p)
      const vos = Number(sql(`select count(*) from quotes where kind = 'variation' and project_id = '${BEN_PROJECT}'`))
      a = await ask(p, 'Raise a variation order for Benjamin')
      ok(/Start a variation order/.test(await panel(p).innerText()) && Number(sql(`select count(*) from quotes where kind = 'variation' and project_id = '${BEN_PROJECT}'`)) === vos, 'a variation order is made as a Draft at once — so it is proposed first, nothing made')
      await sheet(p).locator('[data-testid="maison-confirm"]').click()
      await p.waitForURL(/\/quotes\//, { timeout: 15000 }).catch(() => {}); await settle(p, 1500)
      ok(Number(sql(`select count(*) from quotes where kind = 'variation' and project_id = '${BEN_PROJECT}' and status = 'Draft'`)) >= 1 && /\/quotes\//.test(p.url()), 'the press starts the Draft through Money’s own action and opens it in the quote editor')
    }

    // ── 6 · the lead brief and the editors' own Ask ─────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · The lead brief’s two, the editors’ own words')
      const more = async () => { const b = p.locator('section[aria-label="Maison AI brief"]').getByRole('button', { name: 'Show more' }); if (await b.count()) { await b.click(); await settle(p, 700) } }
      /* (the calm UI build 2026-10-27, a deliberate change — the audit's 2-01, B2's ledger) the lead's Overview keeps ONE brief card with one action;
         every other brief action is a suggestion in the Maison AI sheet (the page registers them all). Same rule: each action is a press away and
         acts — the brief's card when it holds it, else the sheet; its answer or proposal shows where it was pressed. */
      const briefOrSheet = async (label) => {
        const own = p.locator('section[aria-label="Maison AI brief"]').getByRole('button', { name: label })
        if (await own.count()) { await own.first().click(); await settle(p, 1500); return p.locator('section[aria-label="Maison AI brief"]') }
        await fab(p)
        const inSheet = sheet(p).getByRole('button', { name: label, exact: true })
        if (!(await inSheet.count())) return null
        await inSheet.first().click(); await waitPanel(p); await settle(p, 600)
        return panel(p)
      }
      await go(p, `/leads/${SERENA}`); await more()
      const reviewSaid = await briefOrSheet('Attach a client review')
      if (reviewSaid) {
        ok(/OpenMaison keeps no client reviews yet|No client reviews on record/.test(await reviewSaid.innerText()), '“Attach a client review”: says 2.0 keeps none, and offers the studio’s own finished homes')
      } else ok(false, 'Serena’s brief has “Attach a client review” (its card, or the Maison AI sheet)')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, `/leads/${MUTHU}`); await more()
      const newsletter = await p.getByRole('button', { name: 'Add to newsletter list' }).count()
      const yearSaid = await briefOrSheet('Remind me in a year')
      ok(!!yearSaid && newsletter === 0 && await p.getByRole('button', { name: 'Add to newsletter list' }).count() === 0, 'the Lost brief: “Remind me in a year” where the newsletter button was')
      if (yearSaid) {
        const yearOn = new Date(); yearOn.setFullYear(yearOn.getFullYear() + 1)
        const said = await yearSaid.innerText()
        ok(/Check in with Muthu/.test(said) && new RegExp(`’${String(yearOn.getFullYear()).slice(2)}`).test(said), '…a task a year from now, shown first')
      }
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* the quote editor understands its own page */
      await go(p, `/quotes/${Q1}`); await fab(p)
      await ask(p, 'check the margins please')
      ok(/Check the margins|below cost|under a 10% margin|no price yet/.test(await panel(p).innerText()), 'the quote editor: “check the margins please” is its own hint, asked in other words')
      ok(sql(`select question from maison_questions where member_id = 'dane' order by asked_at desc limit 1`) === 'check the margins please', '…kept in Recent like any question')
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* the payment split that doesn't add up: the fix, shown first, Undo */
      await go(p, '/templates/payments/20-40-40')
      const share = p.locator('[data-testid="milestone-row"]').first().getByLabel('Share (%)')
      await share.fill('25'); await share.blur(); await settle(p, 1400)
      await fab(p)
      await sheet(p).getByRole('button', { name: 'Does the split add up?', exact: true }).click(); await settle(p, 900)
      ok(/It comes to 105%/.test(await panel(p).innerText()) && /Make it 35%/.test(await panel(p).innerText()), 'a split at 105%: the fix shown first — the last milestone takes the difference')
      await sheet(p).locator('[data-testid="maison-confirm"]').click(); await settle(p, 1600)
      ok(/Adds up to the quote/.test(await p.locator('[data-testid="payment-template-editor"]').innerText()) && /adds up to 100%/.test(await snackText(p)), 'the press fixes it; the editor says it adds up')
      await undo(p)
      ok(/over/.test(await p.locator('[data-testid="payment-template-editor"]').innerText()), 'Undo puts the shares back')
      await shot(p, '06-payment-split-1440')
    }

    // ── 7 · roles ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Roles — the books’ rule, Accounting’s side')
      as('germaine')
      await go(p, '/leads'); await fab(p)
      let a = await ask(p, 'GST this quarter')
      ok(/Owners, Admins and Accounting only/.test(await a.innerText()), 'a Designer is told the books are for Owners, Admins and Accounting')
      a = await ask(p, 'make Germaine an admin')
      ok(/Owners and Admins only/.test(await a.innerText()), '…and that roles are an Owner’s or an Admin’s')
      await p.keyboard.press('Escape'); await settle(p, 300)
      as('priya')
      await go(p, '/company/finance'); await fab(p)
      a = await ask(p, 'Who owes the studio money?')
      /* (the calm UI build 2026-10-27, a deliberate change — §2's vocabulary) Reports › Finance's figure reads "To collect" (was "Owed to you") */
      ok(/Who owes the studio/.test(await a.innerText()) && /To collect/.test(await a.innerText()), 'Accounting gets the books’ own answer (Reports › Finance’s figures)')
      a = await ask(p, 'What is overdue?')
      ok(/Not for Accounting/.test(await a.innerText()), 'and “Not for Accounting” on the projects’ schedules')
      ok(!/Which leads need attention/.test(await sheet(p).innerText()), 'Accounting’s chips are the books’ and their own tasks')
      await p.keyboard.press('Escape'); await settle(p, 300)
      as('dane')
    }

    // ── 8 · ⌘K People open the member's row ─────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · ⌘K People → the member on Members')
      await go(p, '/leads')
      await p.locator('[data-search-tile]').click(); await settle(p, 400)
      await p.getByRole('combobox', { name: 'Search the studio' }).fill('Germaine'); await settle(p, 1200)
      const people = p.getByRole('dialog', { name: 'Search' }).getByRole('group', { name: 'Members' })   // (the calm UI build 2026-10-27, a deliberate change) the studio's people are Members (T-01; was People)
      const landed = p.waitForURL(/\/company\/members\?(.*&)?open=germaine/, { timeout: 10000 }).then(() => true, () => false)
      await people.getByRole('option').first().click()
      const viaOpen = await landed; await settle(p, 1200)
      ok(viaOpen && new URL(p.url()).pathname === '/company/members', 'a person opens Company › Members with ?open=<their id>')
      ok(await p.locator('[data-member-id="germaine"]').isVisible().catch(() => false), '…on their row')
    }

    // ── 9 · phones ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · 390 and 320')
      const ph = await phoneCtx()
      const m = await page(ph, 'phone')
      await go(m, '/leads'); await fab(m)
      const box = await sheet(m).boundingBox()
      const sw = await m.evaluate(() => screen.width)
      ok(!!box && box.x >= 0 && box.x + box.width <= sw && box.y >= 0, `390: the sheet inside the screen (${box && Math.round(box.width)} wide)`)
      await ask(m, 'Which leads need attention?')
      ok(await m.locator('[data-testid="maison-answer"] [data-testid="maison-row"]').count() >= 1, '390: the Ask box answers')
      ok(await sideways(m) <= 0, '390: no sideways scroll')
      await shot(m, '09-ask-390')
      await m.keyboard.press('Escape'); await settle(m, 300)
      await go(m, `/quotes/${Q1}`)
      if (await m.locator('button[aria-label="Maison AI"]').last().isVisible().catch(() => false)) {
        await fab(m)
        const eb = await sheet(m).boundingBox()
        ok(!!eb && eb.x >= 0 && eb.x + eb.width <= sw, '390: an editor’s sheet inside the screen')
        await shot(m, '09-quote-editor-sheet-390')
      }
      await ph.close()
      for (const [w, h, touch] of [[1024, 768, false], [768, 1024, true]]) {
        const tab = await (touch ? phoneCtx(w, h) : desk({ viewport: { width: w, height: h } }))
        const tp = await page(tab, `${w}`)
        await go(tp, '/leads')
        /* (responsive audit 2026-10-23, a deliberate change of this rule) a touch tablet's Maison AI button rests out of sight while there is page
           below and shows at the page's end (maison-fab.module.css, Leads on the move's FAB rule, 2026-10-23) — the finger reaches it there */
        if (touch) { await tp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(tp, 900) }
        await fab(tp)
        await ask(tp, 'studio overview')
        const bb = await sheet(tp).boundingBox()
        ok(!!bb && bb.x >= 0 && bb.x + bb.width <= w && bb.y >= 0 && bb.y + bb.height <= h && await sideways(tp) <= 0, `${w}${touch ? ' touch' : ''}: the sheet and its answer inside the window, no sideways scroll`)
        await tab.close()
      }
      const tiny = await phoneCtx(320, 640)
      const t = await page(tiny, '320')
      await go(t, '/leads'); await fab(t)
      const tb = await sheet(t).boundingBox()
      ok(!!tb && tb.x >= 0 && tb.x + tb.width <= 320 && await sideways(t) <= 0, '320: the sheet fits, no sideways scroll')
      await tiny.close()
    }
    ok(!errors.length, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e.message)
  } finally {
    putBack()
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
