// The Dashboard redesigned (2026-10-26) · lane D5 — P-13 "one fact, one number" and P-14's bugs, across the modules the Dashboard reads (his marks
// on the review page: every proposal Build; brief design-source/context/dashboard-redesign-2026-10-26/brief.md § 5 "D5"). Each item is asserted as
// the rule it keeps — never a count another round can change — by real presses on the production build:
//   1 · one overdue clock: a task due on an earlier day is "Overdue: …" in the bell and counted by the rail's Tasks badge; one due today (no time,
//       or its time gone) is "Due today: …", never late, never counted — the task lists' `isOverdue`
//   2 · the bell never rings the payer for a supplier bill still waiting for its OK (Owner · Accounting), and rings once it is approved; the
//       Company panel's "n to approve" is Finance › To do's own To approve (the C8 bills counted)
//   3 · an invoice settled by a credit note no longer rings "Overdue"
//   4 · a quote's due-date follow-up closes when the quote is confirmed or signed — marked Confirmed (Undo opens it again), confirmed by the
//       client on the link, signed through its contract (Mark as signed)
//   5 · one "not contacted": Response time's waiting count reads the listing's contact rule — a meeting held is contact
//   6 · one tickets count: the rail's Tickets counts what waits on you on the projects you work on (Needs you's own rows); one name, Tickets
//   7 · one overdue rule for leads: the scope's "Overdue follow-ups" = Maison AI's "with an overdue follow-up" — a lead handed over to its
//       project, parked or lost left out; "new leads in the last 7 days" is the listing's own week; a lost lead is no one's to assign
//   8 · the words: MY TASKS "n days overdue" / "1 task overdue" (never "(nd overdue)" / "needs attention"); Needs you's due days read the list's
//       planning day ("due Wed 14 Oct"); a quote's sum in Maison AI "S$ 88,705"; "Your next meeting" is the member's own
//   9 · reading a client's conversation reads its bell notice; no sideways scroll at 320 and on a phone held sideways
// Usage: BASE=http://localhost:3225 NODE_PATH=<repo>/node_modules node verify-dash-d5.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
// Never local.db. Puts back everything it writes (each step's own rows; the end checks the demo's counts against the start and, if anything is
// off, restores the start's backup).
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /(^|\/)local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(process.cwd(), 'design-source/verify/dashboard-2026-10-26/d5')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3225'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const o = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return o ? JSON.parse(o) : [] }
const num = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${typeof more === 'string' ? more : JSON.stringify(more)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
/** A row as it is now — and the UPDATE that puts every column back. */
const snap = (table, id) => json(`select * from ${table} where id = '${id}'`)[0] ?? null
const putBack = (table, row) => { if (!row) return; sql(`update ${table} set ${Object.entries(row).filter(([k]) => k !== 'id').map(([k, v]) => `${k} = ${lit(v)}`).join(', ')} where id = '${row.id}'`) }
/** The rows a step adds anywhere (every table's rowid high-water mark), and their removal — tables a press only upserts are left alone. */
const UPSERTED = new Set(['settings', 'chat_reads', 'members', 'studio_sessions', 'maison_questions', 'dashboard_snoozes', '__drizzle_migrations'])
const tables = () => sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`).split('\n').filter((t) => t && !UPSERTED.has(t))
const marks = () => Object.fromEntries(tables().map((t) => [t, num(`select coalesce(max(rowid), 0) from "${t}"`)]))
const dropSince = (m) => { for (const [t, n] of Object.entries(m)) { const extra = num(`select count(*) from "${t}" where rowid > ${n}`); if (extra) sql(`delete from "${t}" where rowid > ${n}`) } }

const startOfDay = (ms) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayLabelOf = (ms) => { const d = new Date(ms); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` }
const toMs = (v) => { const n = Number(v); return n > 1e12 ? n : n * 1000 }

const BEN_PROJECT = 'a3f655a3-c603-42b0-af12-2767a0500138'   // P-2026-002 · Benjamin Han (Dane · Germaine)
const RYAN_PROJECT = 'e920e218-7c5b-4ff9-a27b-e62d73c99367'  // P-2026-001 · Ryan D'Souza (Michelle)
const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'         // Kevin Ng — Met, an overdue call
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'         // Olivia Martinez — a Draft contract raised from OM-10001

;(async () => {
  const b = await chromium.launch()
  const start = { stages: sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`), logs: num('select count(*) from stage_logs'), tasks: num('select count(*) from lead_tasks'), open: num('select count(*) from lead_tasks where done = 0'),
    notes: num('select count(*) from notifications'), quotes: sql(`select group_concat(number || ':' || status, ',') from (select number, status from quotes order by number)`), contracts: sql(`select group_concat(id || ':' || status, ',') from (select id, status from contracts order by id)`),
    credits: num('select count(*) from credit_notes'), you: sql(`select id from members where is_you = 1`) }
  const backup = path.join(dir, 'd5-start.bak')
  sql(`.backup '${backup}'`)
  const desk = async (member, viewport = { width: 1440, height: 1024 }, extra = {}) => { as(member); const c = await b.newContext({ viewport, ...extra }); return { c, p: await c.newPage() } }
  const go = async (p, url, wait = 1600) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(wait) }
  const errors = []
  const watch = (p, name) => p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  const bellRows = async (p) => {
    await p.locator('[data-notifications-tile]').first().click()
    await p.locator('[data-testid="notifications-panel"]').waitFor({ timeout: 8000 }).catch(() => {})
    await p.waitForTimeout(900)
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-20) what is due folds under one line at the bell's end
       ("Due · n · Show"): it is opened before the rows are read */
    const fold = p.getByTestId('notifications-due-fold')
    if (await fold.count() && (await fold.getAttribute('aria-expanded')) !== 'true') { await fold.click(); await p.waitForTimeout(400) }
    const rows = await p.locator('[data-testid="notification-row"]').evaluateAll((els) => els.map((e) => ({
      title: e.querySelector('[class*="__title"]')?.textContent?.trim() ?? '', meta: e.querySelector('[class*="__meta"]')?.textContent?.trim() ?? '',
      kind: e.querySelector('[data-kind]')?.getAttribute('data-kind') ?? '', late: !!e.querySelector('[data-late]') })))
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    return rows
  }
  /* (the calm UI build 2026-10-27) (the audit's 1-04, T-07) no number on the glyph; the count is the item's accessible name ("Tasks (3 overdue)", "Issues (1 waiting)"),
     the same count as before — (Vicky 2026-10-29: brought back) every navigation count a red dot, Issues' too (it was grey) */
  const railBadge = async (p, href) => { const l = await p.locator(`nav a[href^="${href}"]`).first().getAttribute('aria-label', { timeout: 1500 }).catch(() => null); const m = /\((\d+) /.exec(l ?? ''); return m ? Number(m[1]) : 0 }
  const ask = async (p, question) => {
    const fab = p.getByRole('button', { name: 'Maison AI', exact: true }).first()
    if (!(await p.locator('[data-testid="maison-ask"]').count())) { await fab.click(); await p.waitForTimeout(700) }
    if (await p.locator('[data-testid="maison-back"]').count()) { await p.locator('[data-testid="maison-back"]').first().click(); await p.waitForTimeout(400) }
    const field = p.locator('[data-testid="maison-ask"] input, [data-testid="maison-ask"] textarea').first()
    await field.fill(question); await field.press('Enter')
    await p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"]'); return !!a && !/Looking through your records/.test(a.textContent ?? '') }, null, { timeout: 15000 }).catch(() => {})
    await p.waitForTimeout(400)
    return (await p.locator('[data-testid="maison-answer"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  }

  try {
    // ── 1 · One overdue clock: the bell and the task lists ─────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · One overdue clock — the bell reads the task lists’ isOverdue')
      const now = Date.now(), today = startOfDay(now)
      const seeded = [
        { id: 'd5-task-yesterday', title: 'D5 probe · due yesterday', due: today - 86_400_000 + 15 * 3_600_000 },
        { id: 'd5-task-today', title: 'D5 probe · due today', due: today },
        ...(now - 2 * 3_600_000 > today ? [{ id: 'd5-task-today-timed', title: 'D5 probe · due today, its time gone', due: now - 2 * 3_600_000 }] : []),
      ]
      const { c, p } = await desk('dane'); watch(p, 'dane-1')
      await go(p, '/quotes')
      const tasksBefore = await railBadge(p, '/tasks')
      for (const t of seeded) {
        sql(`insert into lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id) values ('${t.id}', NULL, '${t.title}', 'General', ${Math.floor(t.due / 1000)}, 0, ${Math.floor(now / 1000)}, 'dane')`)
        sql(`insert into task_assignees (task_id, member_id) values ('${t.id}', 'dane')`)
      }
      try {
        await go(p, '/quotes')
        const rows = await bellRows(p)
        const y = rows.find((r) => r.title.endsWith('D5 probe · due yesterday'))
        /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-20, W-073) one date a row: the title is the task's own words, its due day the meta line ("Due … · 1 day late") */
        ok(!!y && y.title === 'D5 probe · due yesterday' && y.kind === 'task_due' && y.late && /1 day late/.test(y.meta), 'a task due on an earlier day: its words · "1 day late", red', y)
        for (const t of seeded.slice(1)) {
          const r = rows.find((x) => x.title.endsWith(t.title))
          ok(!!r && r.title === t.title && r.kind === 'task_due_soon' && !r.late && /^Due today\b/.test(r.meta) && !/late/.test(r.meta), `"${t.title}": "Due today" in its meta, the due-soon glyph, never late — as My tasks says it`, r)   // (the calm UI build 2026-10-27, a deliberate change)
        }
        ok(!rows.some((r) => /D5 probe · due today/.test(r.title) && (r.kind === 'task_due' || r.late)), 'nothing due today reads overdue (it read so from its own midnight)')   // (the calm UI build 2026-10-27, a deliberate change)
        ok(await railBadge(p, '/tasks') === tasksBefore + 1, `the rail's Tasks counts the one overdue (${tasksBefore} → ${tasksBefore + 1}) — the same clock`, await railBadge(p, '/tasks'))
        await go(p, '/tasks?scope=mine')
        const late = await p.getByText('D5 probe · due yesterday', { exact: true }).count(), todayRows = await p.getByText('D5 probe · due today', { exact: true }).count()
        ok(late === 1 && todayRows === 1, 'Tasks lists both — the yesterday one late, the today one due today')
      } finally {
        sql(`delete from task_assignees where task_id like 'd5-task-%'`); sql(`delete from lead_tasks where id like 'd5-task-%'`)
        await c.close()
      }
    }

    // ── 2 · Bills waiting for their OK: the approver's, never the payer's bell; the rail counts them ─────────────────────────────────────
    if (want(2)) {
      console.log('2 · A supplier bill waiting for its OK rings the approver, not the payer')
      const bill = json(`select id, reference, due_on, approval_why, approved_at, approved_by from supplier_bills where approval_why is not null and approved_at is null and deleted_at is null and total_minor > 0 and not exists (select 1 from payments_out o where o.bill_id = supplier_bills.id and o.reversed_at is null) limit 1`)[0]
      ok(!!bill, 'the demo has a bill waiting for its OK (S44R C8)', bill)
      if (bill) {
        const before = snap('supplier_bills', bill.id)
        sql(`update supplier_bills set due_on = ${Math.floor((startOfDay(Date.now()) + 86_400_000) / 1000)} where id = '${bill.id}'`)   // due tomorrow: inside the bell's three days
        try {
          for (const m of ['dane', 'priya']) {
            const { c, p } = await desk(m); watch(p, `${m}-2`)
            await go(p, m === 'priya' ? '/company/finance' : '/quotes')
            const rows = await bellRows(p)
            ok(!rows.some((r) => r.kind === 'bill_due' && r.title.includes(bill.reference)), `${m === 'dane' ? 'the Owner' : 'Accounting (who pays)'}: no "bill ${bill.reference} is due" while it waits for its OK`, rows.filter((r) => r.title.includes(bill.reference)))
            if (m === 'dane') ok(rows.some((r) => r.kind === 'bill_review' && r.title.includes(bill.reference)), `the approver is rung instead: "…bill ${bill.reference} needs your OK…" (bill_review)`, rows.filter((r) => r.title.includes(bill.reference)))
            await c.close()
          }
          {
            const { c, p } = await desk('dane'); watch(p, 'dane-2b')
            await go(p, '/quotes')
            const label = await p.getByRole('button', { name: /^Company/ }).first().getAttribute('aria-label')
            await p.getByRole('button', { name: /^Company/ }).first().click(); await p.waitForTimeout(900)
            const panel = Number(((await p.locator('[data-testid="company-finance-badge"]').first().textContent().catch(() => '')) || '').replace(/\D/g, '') || 0)
            await p.keyboard.press('Escape')
            await go(p, '/company/finance', 2200)
            const toApprove = await p.locator('[data-testid="todo-approve"] [data-todo]').count()
            ok(panel === toApprove && toApprove > 0, `the Company panel's "${panel} to approve" = To do's To approve rows (${toApprove}) — the waiting bill counted`, { panel, toApprove })
            ok(await p.locator(`[data-testid="todo-approve"] [data-todo="billok-${bill.id}"]`).count() === 1, 'the waiting bill is one of To approve’s rows')
            const railN = Number((/^Company \((\d+) approvals?\)$/.exec(label ?? '') ?? [])[1] ?? 0)
            ok(railN >= toApprove && await p.getByRole('button', { name: /^Company/ }).first().locator('[class*="__badgeDot"][data-badge="dot"]').count() === 1, 'the rail’s Company counts them — a red dot, the number in its name (the panel says each section’s, grey)', label)   // (Vicky 2026-10-29: brought back)
            await c.close()
          }
          sql(`update supplier_bills set approved_at = ${Math.floor(Date.now() / 1000)}, approved_by = 'dane' where id = '${bill.id}'`)
          {
            const { c, p } = await desk('priya'); watch(p, 'priya-2c')
            await go(p, '/company/finance')
            const rows = await bellRows(p)
            ok(rows.some((r) => r.kind === 'bill_due' && r.title.includes(bill.reference) && /is due/.test(r.title)), 'approved, it rings the payer: "…bill … is due …"', rows.filter((r) => r.title.includes(bill.reference)))
            await c.close()
          }
        } finally { putBack('supplier_bills', before) }
      }
    }

    // ── 3 · A credited invoice ────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · An invoice settled by a credit note no longer rings "Overdue"')
      const inv = json(`select i.id, i.number, i.project_id, i.amount_minor - coalesce((select sum(amount_minor) from project_payments p where p.invoice_id = i.id and p.status in ('confirmed', 'to_confirm')), 0) - coalesce((select sum(amount_minor) from credit_notes n where n.invoice_id = i.id and n.status = 'issued' and n.kind = 'credit'), 0) as owed
        from project_invoices i join projects pr on pr.id = i.project_id where i.status = 'sent' and i.due_at is not null and i.due_at < ${Math.floor(startOfDay(Date.now()) / 1000)} and pr.deleted_at is null order by i.due_at limit 20`).find((x) => x.owed > 0)
      ok(!!inv, 'the demo has an overdue sent invoice', inv)
      if (inv) {
        const { c, p } = await desk('dane'); watch(p, 'dane-3')
        await go(p, '/quotes')
        ok((await bellRows(p)).some((r) => r.title.startsWith(`Overdue: ${inv.number}`)), `before: "Overdue: ${inv.number}" rings`)
        sql(`insert into credit_notes (id, project_id, invoice_id, number, reason, amount_minor, gst_minor, status, issued_by, issued_at, created_at, kind) values ('d5-cn', '${inv.project_id}', '${inv.id}', 'CN-D5-PROBE', 'D5 probe', ${inv.owed}, 0, 'issued', 'dane', ${Math.floor(Date.now() / 1000)}, ${Math.floor(Date.now() / 1000)}, 'credit')`)
        try {
          await go(p, '/quotes')
          ok(!(await bellRows(p)).some((r) => r.title.startsWith(`Overdue: ${inv.number}`)), `credited in full, ${inv.number} no longer rings "Overdue" (the Money tab's own overdueOf)`)
        } finally { sql(`delete from credit_notes where id = 'd5-cn'`); await c.close() }
      }
    }

    // ── 4 · A quote's due-date follow-up closes on confirm and sign — every path; Undo opens it again ──────────────────────────────────────
    if (want(4)) {
      console.log('4 · A quote’s follow-up closes when the client decides')
      const seedFollowUp = (quoteId, leadId, number) => {
        sql(`insert into lead_tasks (id, lead_id, quote_id, title, kind, due_at, done, created_at, creator_id) values ('d5-fu-${number}', '${leadId}', '${quoteId}', 'Follow up on quote ${number}', 'Follow-up', ${Math.floor((startOfDay(Date.now()) + 2 * 86_400_000) / 1000)}, 0, ${Math.floor(Date.now() / 1000)}, 'dane')`)
        sql(`insert into task_assignees (task_id, member_id) values ('d5-fu-${number}', 'dane')`)
        return `d5-fu-${number}`
      }
      const done = (id) => num(`select done from lead_tasks where id = '${id}'`)
      // 4a — marked Confirmed from the Quotes list, then Undo
      const q = json(`select id, number, lead_id, status from quotes where kind = 'quote' and status = 'Sent to Client' and deleted_at is null and archived_at is null limit 1`)[0]
      ok(!!q, 'a quote with the client (Sent to Client)', q)
      if (q) {
        const before = snap('quotes', q.id), items = json(`select id, client_choice, updated_at from quote_items where quote_id = '${q.id}'`), m = marks()
        const task = seedFollowUp(q.id, q.lead_id, q.number)
        /* (the calm UI build closing regression 2026-10-28) one put-back for 4a and 4b — a press that throws in 4a still leaves the records as found */
        const putBack4 = () => {
          putBack('quotes', before); dropSince(m)
          sql(`delete from task_assignees where task_id = '${task}'`); sql(`delete from lead_tasks where id = '${task}'`)
          for (const it of items) sql(`update quote_items set client_choice = ${lit(it.client_choice)}, updated_at = ${lit(it.updated_at)} where id = '${it.id}'`)
        }
        const { c, p } = await desk('dane'); watch(p, 'dane-4a')
        try {
          await go(p, '/quotes', 2000)
          const row = p.locator(`[role="row"][data-kb-id="${q.id}"]`).first()
          await row.locator('[data-col="status"] button[aria-haspopup="menu"]').first().click(); await p.waitForTimeout(500)
          await p.getByRole('menuitem', { name: /^Confirmed/ }).or(p.getByRole('menuitemradio', { name: /^Confirmed/ })).first().click(); await p.waitForTimeout(500)
          /* (the calm UI build 2026-10-27, a deliberate change — T-01) the status in its display word, quoted: "Mark “Confirmed”" */
          await p.getByRole('button', { name: 'Mark “Confirmed”' }).click(); await p.waitForTimeout(1800)
          ok(sql(`select status from quotes where id = '${q.id}'`) === 'Confirmed' && done(task) === 1, `${q.number} marked Confirmed: its follow-up is done`, { status: sql(`select status from quotes where id = '${q.id}'`), done: done(task) })
          await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first().click(); await p.waitForTimeout(1800)
          ok(sql(`select status from quotes where id = '${q.id}'`) === q.status && done(task) === 0, `Undo: ${q.number} is ${q.status} again and its follow-up is open again`, { status: sql(`select status from quotes where id = '${q.id}'`), done: done(task) })
          await p.screenshot({ path: path.join(dir, '4a-quotes-1440.png') })
        } catch (e) { putBack4(); throw e } finally { await c.close() }
        // 4b — the client confirms on the link
        const cl = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const cp = await cl.newPage(); watch(cp, 'client-4b')
        try {
          const key = sql(`select coalesce(confirm_token, id) from quotes where id = '${q.id}'`)
          await go(cp, `/confirm/${key}`, 2200)
          await cp.getByLabel('Your full name').fill('D5 Probe Client')
          await cp.getByRole('button', { name: 'Confirm quote' }).click(); await cp.waitForTimeout(2400)
          ok(sql(`select status from quotes where id = '${q.id}'`) === 'Confirmed' && done(task) === 1, `the client confirmed ${q.number} on the link: its follow-up is done`, { status: sql(`select status from quotes where id = '${q.id}'`), done: done(task) })
        } finally {
          await cl.close()
          putBack4()
        }
      }
      // 4c — signed through its contract (Mark as signed on the lead's Contracts)
      const k = json(`select c.id, c.from_quote_id as quoteId, q.number, q.status from contracts c join quotes q on q.id = c.from_quote_id where c.lead_id = '${OLIVIA}' and c.status = 'Draft' and c.deleted_at is null limit 1`)[0]
      ok(!!k, 'a Draft contract raised from a quote (Olivia Martinez)', k)
      if (k) {
        const cBefore = snap('contracts', k.id), qBefore = snap('quotes', k.quoteId), lBefore = snap('leads', OLIVIA), m = marks()
        sql(`update quotes set status = 'Sent to Client', client_sent_at = coalesce(client_sent_at, ${Math.floor(Date.now() / 1000)}) where id = '${k.quoteId}'`)   // with the client — signing it is allowed
        const task = seedFollowUp(k.quoteId, OLIVIA, k.number)
        const { c, p } = await desk('dane'); watch(p, 'dane-4c')
        try {
          await go(p, `/leads/${OLIVIA}/contracts`, 2200)
          await p.locator(`[role="row"]`).filter({ hasText: 'Interior Design Service Agreement' }).first().locator('[data-col="status"] button[aria-haspopup="menu"]').first().click(); await p.waitForTimeout(500)
          await p.getByRole('menuitem', { name: /^Signed/ }).or(p.getByRole('menuitemradio', { name: /^Signed/ })).first().click(); await p.waitForTimeout(900)
          const dlg = p.getByRole('dialog').filter({ hasText: 'Signed on' }).first()
          await dlg.getByRole('button', { name: 'Mark as signed' }).click(); await p.waitForTimeout(2400)
          ok(sql(`select status from contracts where id = '${k.id}'`) === 'Signed' && sql(`select status from quotes where id = '${k.quoteId}'`) === 'Signed' && done(task) === 1, `the contract marked signed signs ${k.number} through: its follow-up is done`, { contract: sql(`select status from contracts where id = '${k.id}'`), quote: sql(`select status from quotes where id = '${k.quoteId}'`), done: done(task) })
        } finally {
          await c.close()
          putBack('contracts', cBefore); putBack('quotes', qBefore); putBack('leads', lBefore); dropSince(m)
          sql(`delete from task_assignees where task_id = '${task}'`); sql(`delete from lead_tasks where id = '${task}'`)
        }
      }
    }

    // ── 5 · One "not contacted": Response time counts a meeting held ─────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Response time’s waiting count reads the listing’s contact rule')
      const since = Date.now() - 90 * 86_400_000
      const base = `from leads l where l.deleted_at is null and l.direct = 0 and l.created_at * 1000 >= ${since} and l.stage not in ('Won', 'Lost') and exists (select 1 from lead_assignees a where a.lead_id = l.id)
        and not exists (select 1 from lead_notes n where n.lead_id = l.id and n.kind = 'contact') and not exists (select 1 from stage_logs s where s.lead_id = l.id and s.to_stage = 'Contacted')`
      const withMeeting = num(`select count(*) ${base} and not exists (select 1 from meetings m where m.lead_id = l.id and m.status = 'held' and m.deleted_at is null)`)
      const met = json(`select l.name ${base} and exists (select 1 from meetings m where m.lead_id = l.id and m.status = 'held' and m.deleted_at is null)`).map((r) => r.name)
      const { c, p } = await desk('dane'); watch(p, 'dane-5')
      await go(p, '/company/reports/leads?range=90', 2400)
      const chip = (await p.locator('[data-testid="insights-awaiting"]').innerText().catch(() => '')).replace(/\s+/g, ' ')
      /* (the calm UI build 2026-10-27, a deliberate change — B5's Reports words) the chip reads "4 not contacted yet" (was "4 assigned, no outreach
         logged yet") — the same figure, `awaitingOutreach` */
      const shown = Number((/(\d+) not contacted yet/i.exec(chip) ?? [0, 0])[1])
      ok(shown === withMeeting, `"${shown} not contacted yet" = the open assigned leads with no contact by the listing's rule (${withMeeting}) — a meeting held counts`, { chip, withMeeting })
      ok(met.length === 0 || shown < withMeeting + met.length, `the leads met at a held meeting (${met.join(', ') || 'none in range'}) are not waiting for outreach`)
      await p.screenshot({ path: path.join(dir, '5-reports-leads-1440.png') })
      await c.close()
    }

    // ── 6 · One tickets count, one name ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · The rail’s Tickets counts what waits on you; the studio’s word is Tickets')
      const t = json(`select t.id, t.number, t.project_id, (select group_concat(member_id) from lead_assignees a where a.lead_id = p.lead_id) as team from project_tickets t join projects p on p.id = t.project_id where t.status in ('open', 'in_progress') and p.deleted_at is null and p.id = '${RYAN_PROJECT}' limit 1`)[0]
      ok(!!t, 'a live ticket on P-2026-001 (Michelle’s)', t)
      if (t) {
        const before = snap('project_tickets', t.id)
        sql(`update project_tickets set last_client_at = ${Date.now()} where id = '${t.id}'`)   // the client's word last: the studio's turn
        try {
          const counts = {}
          for (const m of ['germaine', 'michelle', 'dane']) {
            const { c, p } = await desk(m); watch(p, `${m}-6`)
            await go(p, '/quotes')
            counts[m] = await railBadge(p, '/tickets')
            if (m === 'michelle') {
              await go(p, `/projects/${RYAN_PROJECT}`, 2400)
              const more = p.locator('[data-card="needs"] [data-testid="needs-more"]')
              if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(400) }
              const row = await p.locator('[data-card="needs"] [data-testid="need-ticket"]').filter({ hasText: t.number }).first().innerText().catch(() => '')
              /* (the calm UI build 2026-10-27, a deliberate change — 3-37 · W-427) the issue's own words: "Your turn" (was "waiting on you") */
              ok(/your turn/i.test(row), `Michelle's Needs you lists ${t.number} "Your turn" — the row the rail now counts`, row.replace(/\s+/g, ' '))
            }
            await c.close()
          }
          ok(counts.germaine === 0, 'Germaine (Who sees leads: everyone — but not on the project): no Tickets count, as her Needs you has no row', counts)
          ok(counts.michelle >= 1 && counts.dane >= 1, 'Michelle (its team) and Dane (the Owner): the ticket counts — the rows their Needs you lists', counts)
        } finally { putBack('project_tickets', before) }
      }
      const { c, p } = await desk('dane'); watch(p, 'dane-6b')
      await go(p, '/company/reports/health', 2200)
      /* (the calm UI build 2026-10-27, a deliberate change — 5-22, T-14) four figures up front, the rest under "Show all figures": opened first */
      { const all = p.getByTestId('health-all'); if (await all.count() && !/fewer/i.test(await all.innerText())) { await all.click(); await p.waitForTimeout(600) } }
      const health = await p.locator('main').innerText()
      ok(/Issues raised/i.test(health) && !/Issues reported/i.test(health), 'Reports › Health: “Issues raised”')   // (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-10, T-01: Issues for the studio and the client)
      await go(p, '/qanvast-ops/studios', 2200)
      const ops = await p.locator('main').innerText()
      ok(/(Tickets|Issues) raised/i.test(ops) && !/Issues reported/i.test(ops), 'Qanvast Ops › Studios: one word for them (B2 lane words it)')   // (the calm UI build 2026-10-27, a deliberate change)
      await go(p, '/quotes')
      const a = await ask(p, 'What tickets were raised this week?')
      ok(/\bissues?\b/i.test(a) && !/\btickets?\b/i.test(a), 'Maison AI answers in the one word, issues', a.slice(0, 160))   // (the calm UI build 2026-10-27, a deliberate change)
      await c.close()
    }

    // ── 7 · Leads: one overdue rule, one week, one "no member yet" ─────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · The leads’ one overdue rule, one week and one unassigned rule')
      const sod = Math.floor(startOfDay(Date.now()) / 1000)
      const overdueRule = num(`select count(*) from leads l where l.deleted_at is null and l.direct = 0 and l.stage not in ('On Hold', 'Lost')
        and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null)
        and exists (select 1 from lead_tasks t where t.lead_id = l.id and t.done = 0 and t.due_at is not null and t.due_at < ${sod})`)
      const handed = json(`select l.name from leads l where l.deleted_at is null and l.direct = 0 and exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) and exists (select 1 from lead_tasks t where t.lead_id = l.id and t.done = 0 and t.due_at < ${sod})`).map((r) => r.name)
      const week = num(`select count(*) from leads where deleted_at is null and direct = 0 and created_at >= ${sod - 6 * 86_400} and created_at < ${sod + 86_400}`)
      const { c, p } = await desk('dane'); watch(p, 'dane-7')
      await go(p, '/leads?scope=overdue', 2200)
      const listing = await p.locator('main').innerText()
      ok(handed.length > 0 && handed.every((n) => !listing.includes(n)), `the Overdue follow-ups scope leaves out a lead handed over to its project (${handed.join(', ')})`)
      await go(p, '/quotes')
      const a = await ask(p, 'How is the studio doing?')
      /* (the Dashboard's closing pass, 2026-10-26 — a deliberate change of this check) the answer is figures since lane D4 (P-10: "NEW LEADS 4 ·
         Added in the last 7 days"); the sentence it was ("4 new leads in the last 7 days") still reads where the figures aren't drawn */
      const m = /(\d+) new leads? in the last 7 days/.exec(a) ?? /NEW LEADS\s+(\d+)\s+Added in the last 7 days/i.exec(a)
      const overdueSaid = Number((/(\d+) with an overdue follow-up/.exec(a) ?? [0, 0])[1])
      ok(!!m && Number(m[1]) === week, `Maison AI's "${m?.[1]} new leads in the last 7 days" is the listing's own week (${week}, by calendar day)`, a.slice(0, 200))
      ok(overdueSaid === overdueRule, `Maison AI's "${overdueSaid} with an overdue follow-up" = the listing's rule (${overdueRule})`, a.slice(0, 200))
      await go(p, '/quotes', 2000)
      const chipText = await p.getByRole('button', { name: /* (the calm UI build 2026-10-27, a deliberate change) T-01 · W-428: the to-do chip reads "With client · n" */ /^With client · \d+/ }).first().innerText().catch(() => '')
      const waitingChip = Number((/(\d+)/.exec(chipText) ?? [0, 0])[1])
      const w = await ask(p, 'Which quotes are waiting on the client?')
      const said = Number((/(\d+) quotes? waiting on the client/.exec(w) ?? [0, -1])[1])
      ok(said === waitingChip || (waitingChip === 0 && /No quote is waiting/.test(w)), `"${said} quotes waiting on the client" = Tools › Quotes' "Waiting on client" rule (${waitingChip})`, w.slice(0, 160))
      await c.close()
      // a lost lead with no member is no one's to assign
      const lost = json(`select l.id from leads l where l.stage = 'Lost' and l.deleted_at is null and l.direct = 0 and exists (select 1 from lead_assignees a where a.lead_id = l.id) limit 1`)[0]
      if (lost) {
        const links = json(`select * from lead_assignees where lead_id = '${lost.id}'`)
        const unassignedRule = () => num(`select count(*) from leads l where l.deleted_at is null and l.direct = 0 and l.stage <> 'Lost' and not exists (select 1 from lead_assignees a where a.lead_id = l.id)`)
        sql(`delete from lead_assignees where lead_id = '${lost.id}'`)
        try {
          const { c: c2, p: p2 } = await desk('dane'); watch(p2, 'dane-7b')
          await go(p2, '/leads', 2200)
          await p2.getByRole('button', { name: /All leads/i }).first().click(); await p2.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) B2 2-11: "All leads · n"
          const row = await p2.getByRole('menuitemradio', { name: /^Unassigned/ }).first().innerText().catch(() => '')
          ok(Number(row.replace(/\D/g, '')) === unassignedRule(), `the scope's "Unassigned" (${row.replace(/\s+/g, ' ')}) leaves out a lost lead with no member (${unassignedRule()})`)
          await c2.close()
        } finally { for (const r of links) sql(`insert into lead_assignees (${Object.keys(r).join(', ')}) values (${Object.values(r).map(lit).join(', ')})`) }
      }
    }

    // ── 8 · The words ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · "5 days overdue", the planning day, a record’s sum, your own meeting')
      const { c, p } = await desk('dane'); watch(p, 'dane-8')
      await go(p, `/leads/${KEVIN}`, 2200)
      /* (the calm UI build 2026-10-27, a deliberate change — 2-28 · W-269) the card reads "Open tasks" (was "MY TASKS"): read by its own mark */
      const card = await p.locator('[data-card="my-work"]').first().innerText().catch(() => '')
      ok(/\b1 task overdue\b|\b\d+ tasks overdue\b/.test(card) && !/needs? attention/.test(card), 'MY TASKS’ head names what it counts: “1 task overdue”', card.slice(0, 200))
      ok(/\b\d+ days? overdue\b/.test(card) && !/\(\d+d overdue\)/.test(card), 'its row says “1 day overdue”, never “(1d overdue)”', card.slice(0, 260))
      await p.screenshot({ path: path.join(dir, '8-lead-overview-1440.png') })
      await go(p, `/projects/${BEN_PROJECT}`, 2400)
      /* (the calm UI build 2026-10-27, a deliberate change — 3-07, T-14) Needs your attention shows three rows, then "Show n more": opened first */
      { const more = p.locator('[data-card="needs"] [data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(400) } }
      const inv = json(`select i.number, i.due_at from project_invoices i where i.project_id = '${BEN_PROJECT}' and i.status = 'sent' and i.due_at < ${Math.floor(startOfDay(Date.now()) / 1000)}
        and i.amount_minor > coalesce((select sum(amount_minor) from project_payments p where p.invoice_id = i.id and p.status in ('confirmed', 'to_confirm')), 0) order by i.due_at limit 1`)[0]
      const main = await p.locator('main').innerText()
      if (inv) ok(main.includes(`due ${dayLabelOf(toMs(inv.due_at))}`), `Needs you's money row: "due ${dayLabelOf(toMs(inv.due_at))}" — the list's planning day, as its milestones read`)
      ok(!/overdue · due \d{1,2} [A-Z][a-z]{2}\b/.test(main), 'no money row reads a due day without its weekday')
      await p.screenshot({ path: path.join(dir, '8-project-overview-1440.png'), fullPage: true })
      await go(p, '/quotes')
      const about = await ask(p, 'Tell me about Serena Koh')
      ok(/S\$ \d{1,3}(,\d{3})+\b/.test(about) && !/S\$\d[\d,]*\.\d{2}/.test(about), 'a lead’s record in Maison AI writes its quote’s sum “S$ 88,705” (moneyCard)', about.slice(0, 220))
      const mine = num(`select count(*) from meetings where status = 'planned' and deleted_at is null and starts_at >= ${Date.now() - 30 * 60_000} and (member_ids like '%"dane"%' or created_by = 'dane')`)
      const any = num(`select count(*) from meetings where status = 'planned' and deleted_at is null and starts_at >= ${Date.now() - 30 * 60_000}`)
      const next = await ask(p, 'Prepare me for my next meeting')
      if (!mine && any) ok(/No meeting planned for you/.test(next) && !/Your next meeting/.test(next), 'Dane has none of his own: “No meeting planned for you” — never someone else’s under “Your next meeting”', next.slice(0, 160))
      else ok(/Your next meeting|No meeting planned/.test(next), 'the next-meeting answer reads', next.slice(0, 160))
      await c.close()
      const owner = json(`select coalesce(json_extract(member_ids, '$[0]'), created_by) as m from meetings where status = 'planned' and deleted_at is null and starts_at >= ${Date.now() - 30 * 60_000} order by starts_at limit 1`)[0]
      if (owner?.m) {
        const { c: c2, p: p2 } = await desk(owner.m); watch(p2, `${owner.m}-8`)
        await go(p2, '/quotes')
        ok(/Your next meeting/.test(await ask(p2, 'Prepare me for my next meeting')), `${owner.m}, who runs it, is prepared for it`)
        await c2.close()
      }
    }

    // ── 9 · Reading a client's conversation reads its bell notice; widths ─────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · One message, one badge; no sideways scroll')
      const href = `/projects/${BEN_PROJECT}/messages`
      sql(`insert into notifications (id, member_id, kind, title, body, href, lead_id, channels, created_at) values ('d5-chat', 'dane', 'chat_message', 'Benjamin Han sent a message', 'D5 probe', '${href}', (select lead_id from projects where id = '${BEN_PROJECT}'), 'in_app', ${Math.floor(Date.now() / 1000)})`)
      try {
        const { c, p } = await desk('dane'); watch(p, 'dane-9')
        await go(p, href, 3200)
        ok(sql(`select read_at is not null from notifications where id = 'd5-chat'`) === '1', 'opening the conversation reads its “sent a message” notice in the bell too')
        await c.close()
      } finally { sql(`delete from notifications where id = 'd5-chat'`) }
      for (const [w, h, name] of [[320, 720, '320'], [844, 390, '844x390']]) {
        const { c, p } = await desk('dane', { width: w, height: h }, { isMobile: true, hasTouch: true }); watch(p, `dane-${name}`)
        for (const url of [`/leads/${KEVIN}`, `/projects/${BEN_PROJECT}`, '/company/reports/health']) {
          await go(p, url, 2000)
          const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
          ok(sw <= 0, `${url} at ${name}: no sideways scroll`, sw)
        }
        await p.screenshot({ path: path.join(dir, `9-health-${name}.png`) })
        await c.close()
      }
    }
    ok(!errors.length, 'no page errors', errors.slice(0, 5))
  } catch (e) {
    fail++; console.log('  ✗ the probe threw —', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)
  } finally {
    await b.close().catch(() => {})
    sql(`update members set is_you = (id = '${start.you}')`)
    const end = { stages: sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`), logs: num('select count(*) from stage_logs'), tasks: num('select count(*) from lead_tasks'), open: num('select count(*) from lead_tasks where done = 0'),
      notes: num('select count(*) from notifications'), quotes: sql(`select group_concat(number || ':' || status, ',') from (select number, status from quotes order by number)`), contracts: sql(`select group_concat(id || ':' || status, ',') from (select id, status from contracts order by id)`),
      credits: num('select count(*) from credit_notes'), you: sql(`select id from members where is_you = 1`) }
    const same = Object.keys(start).every((k) => start[k] === end[k])
    if (!same) sql(`.restore '${backup}'`)
    ok(same, 'put back as found — the leads’ stages, stage logs, tasks, notices, quotes, contracts, credit notes and the signed-in member', Object.keys(start).filter((k) => start[k] !== end[k]))
    try { fs.unlinkSync(backup) } catch { /* gone */ }
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
