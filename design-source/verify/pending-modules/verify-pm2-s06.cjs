// Pending modules, step S06 · Finance leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key held:finance).
// Each item asserted as the rule it builds, never another round's count:
//  - a repeating expense (1.0's "Recurring expense", made to work): the demo's design software repeats every month — October's was logged by
//    its repeat (the row says so, the panel lists the series and the next day); a new expense set to repeat every week says when the next one
//    is logged and keeps its rhythm on the record; when its days come (time made to pass in the record) each one is logged once — by the rule,
//    for its maker, with its Activity line — and a second and a third read (two at once) log nothing more; a Designer's repeat waits for an
//    Owner or an Admin and they hear it on the bell; Stop repeating ends it with Undo; a change of rhythm moves the next day; removing the first
//    one stops the repeat (said, Undo); a handed-over project's repeat stops itself, said on its Activity
//  - the studio's own expense categories (Settings › Finance › Money out): add (the dialog offers it; Xero maps it at once), rename (its expenses
//    and its Xero account follow), remove with Undo (the expenses keep it), read-only for a Designer; Reports › Expenses groups by them
//  - the PO paper's acceptance block is on by default (1.0's), on the PO's paper
//  - the category palette: Where costs go gives each named category its own validated hue, never red
//  - the Accounting role's open questions (as recommended): Settings is Finance alone (no module strip, only the links they open); Accounting
//    raises purchase orders (New ▾ on Money out and on a project's Money; Who may do what says so — theirs over the limit wait); a project's
//    Files are read-only (no upload, folder, rename, move, delete, selection or comment box; Open and Download stay); a quote's Preview is
//    read-only (Back to Money, no Send, no template change); To do's send step names what it does for them
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s06.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s06')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s06-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86400
const midnight = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000)
const TODAY = midnight()
const plusDays = (sec, n) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime() / 1000) }
const plusMonths = (sec, k) => { const d = new Date(sec * 1000); const t = new Date(d.getFullYear(), d.getMonth() + k, 1); return Math.floor(new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())).getTime() / 1000) }
const ROOT_SOFTWARE = '864bccd2-fe15-4b0a-abf2-9a63cf3c67b0'   // R83's design software subscription — R108 made it repeat every month

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it: these tables whole */
  const you0 = sql(`select id from members where is_you = 1`)
  const WHOLE = ['expenses', 'cost_documents', 'payments_out', 'purchase_orders', 'purchase_order_lines', 'lead_events', 'notifications', 'notification_outbox', 'settings', 'xero_links', 'xero_sync_log']
  const kept = WHOLE.map((t) => [t, json(`select * from ${t}`)])
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const dialog = (p, name) => p.locator(`[role="dialog"][aria-label="${name}"]`).last()
  const pick = async (p, field, option) => { await field.click(); await settle(p, 300); await p.getByRole('option', { name: option, exact: true }).last().click(); await settle(p, 300) }
  const reach = (p, key) => p.getByTestId(`may-${key}`).locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach')))
  const menuItems = async (p) => (await p.getByRole('menuitem').allInnerTexts()).map((x) => x.split('\n')[0].trim())

  const ryan = sql(`select id from projects where number = 'P-2026-001'`)
  const ben = sql(`select id from projects where number = 'P-2026-002'`)
  const shalini = sql(`select id from projects where number = 'P-2025-001'`)

  try {
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')

    // ── 1 · the demo's repeat ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · the demo’s repeating expense')
      const root = json(`select repeat_every, repeat_next, description from expenses where id = '${ROOT_SOFTWARE}'`)[0]
      ok(root?.repeat_every === 'month' && root.description === 'Design software subscription', 'the design software subscription repeats every month (its words carry no month)')
      const logged = json(`select spent_on, status, reviewed_by, created_by from expenses where repeat_of = '${ROOT_SOFTWARE}' order by spent_on`)
      ok(logged.length >= 1 && logged.every((e) => e.status === 'approved' && e.created_by === 'dane' && e.reviewed_by === 'dane'), 'each month its repeat logged is a full record — Dane’s, counted at once as his own are')
      ok(root?.repeat_next > logged[logged.length - 1]?.spent_on && root.repeat_next > TODAY, 'the next day is after the last one logged, and still to come')
      await go(p, '/company/finance/money-out?kind=expenses')
      const rows = p.locator('[data-expense]').filter({ hasText: 'Design software subscription' })
      ok(await rows.count() === logged.length + 1, 'Money out lists the first one and every one its repeat logged')
      ok((await rows.first().innerText()).includes('Every month'), 'each row says how often it repeats')
      ok(/Logged by its repeat/.test(await rows.last().innerText()), 'the one its repeat logged says so')
      await rows.last().getByTestId('expense-open').click(); await settle(p, 800)
      const panel = p.getByTestId('expense-panel')
      const text = (await panel.innerText()).replace(/\s+/g, ' ')
      ok(/by its repeat, for Dane/.test(text), 'the panel: logged by its repeat, for its maker')
      ok(/Repeats Every month · next on \d+ \w{3}/.test(text), 'the panel: every month, and the next day')
      ok(await panel.getByTestId('expense-series-row').count() === logged.length + 1, 'the panel lists this repeat — every expense of it')
      await shot(p, '01-demo-repeat-panel-1440')
      await p.keyboard.press('Escape'); await settle(p, 400)
    }

    // ── 2 · a new repeat on a project ─────────────────────────────────────────────────────────────────────────────────────────────
    let cleanRoot = null
    if (want(2) || want(3) || want(5)) {
      console.log('2 · a new expense that repeats every week')
      await go(p, `/projects/${ryan}/money`)
      await p.getByTestId('money-new').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Expense/ }).click(); await settle(p, 700)
      const d = dialog(p, 'Log an expense')
      await d.getByLabel('Amount paid (S$)').fill('120')
      await pick(p, d.getByLabel('Category'), 'Labour')
      await d.getByLabel('What it was for').fill('Weekly site cleaning (probe S06)')
      ok(/pick how often/.test(await d.innerText()), 'Repeats starts on Doesn’t repeat, its helper saying what it does')
      await pick(p, d.getByLabel('Repeats'), 'Every week')
      const help = (await d.innerText()).replace(/\s+/g, ' ')
      ok(/Next on \d+ \w{3} ’\d\d, then every week — the same amount, category and vendor/.test(help), 'the helper says when the next one is logged')
      await shot(p, '02-repeats-field-1440')
      await d.getByTestId('expense-save').click(); await settle(p, 1800)
      ok(/repeats every week, next on/.test(await snackText(p)), 'the save says it repeats and when next')
      const r = json(`select id, repeat_every, repeat_next, spent_on from expenses where description = 'Weekly site cleaning (probe S06)' and repeat_of is null`)[0]
      cleanRoot = r?.id ?? null
      ok(r?.repeat_every === 'week' && r.repeat_next === plusDays(r.spent_on, 7), 'the record keeps its rhythm and the next day (a week on)')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_expense_logged' and json_extract(detail, '$.id') = '${cleanRoot}' and json_extract(detail, '$.repeat') = 'every week'`)) === 1, 'its Activity line says it repeats every week')
      ok((await p.locator('[data-testid="project-costs"]').innerText()).includes('Every week'), 'the project’s Costs say so on its row')
    }

    // ── 3 · its days come ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3) && cleanRoot) {
      console.log('3 · the days come: each logged once, by the rule')
      /* time passes: the series was set two weeks ago and nobody has opened money out since */
      const s0 = plusDays(TODAY, -14)
      sql(`update expenses set spent_on = ${s0}, created_at = ${s0 + 9 * 3600}, repeat_next = ${plusDays(s0, 7)} where id = '${cleanRoot}'`)
      await go(p, `/projects/${ryan}/money`)
      const made = json(`select spent_on, status, created_by, reviewed_by, amount_minor, category, project_id from expenses where repeat_of = '${cleanRoot}' order by spent_on`)
      ok(made.length === 2 && made[0].spent_on === plusDays(s0, 7) && made[1].spent_on === TODAY, 'the two days that came are logged — a week on and today')
      ok(made.every((e) => e.status === 'approved' && e.created_by === 'dane' && e.reviewed_by === 'dane' && e.amount_minor === 12000 && e.category === 'Labour' && e.project_id === ryan), 'each one copies the series (amount, category, project), Dane’s own')
      ok(Number(sql(`select repeat_next from expenses where id = '${cleanRoot}'`)) === plusDays(TODAY, 7), 'the next day moves on to a week from today')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_expense_logged' and json_extract(detail, '$.day') is not null and actor_id is null and project_id = '${ryan}' and json_extract(detail, '$.title') = 'Weekly site cleaning (probe S06)'`)) === 2, 'each one logged writes its own Activity line, the system’s')
      /* again, and two reads at once — nothing more */
      const p2 = await page(ctx, 'desk-2')
      await Promise.all([go(p, '/company/finance/money-out?kind=expenses'), go(p2, `/projects/${ryan}/money`)])
      await p2.close()
      ok(Number(sql(`select count(*) from expenses where repeat_of = '${cleanRoot}'`)) === 2, 'more reads, two at once, log no day twice')
      await go(p, `/projects/${ryan}/activity`)
      ok(/The repeating expense “Weekly site cleaning \(probe S06\)” was logged for/.test(await p.locator('main').innerText()), 'the project’s Activity reads the logged ones')
      await shot(p, '03-activity-1440')
    }

    // ── 4 · a Designer's repeat waits ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · a Designer’s repeat waits for an Owner or an Admin')
      as('michelle')
      await go(p, `/projects/${ryan}/money`)
      await p.getByTestId('money-new').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Expense/ }).click(); await settle(p, 700)
      const d = dialog(p, 'Log an expense')
      await d.getByLabel('Amount paid (S$)').fill('45')
      await pick(p, d.getByLabel('Category'), 'Transport')
      await d.getByLabel('What it was for').fill('Site parking (probe S06)')
      await pick(p, d.getByLabel('Repeats'), 'Every week')
      await d.getByTestId('expense-save').click(); await settle(p, 1800)
      const r = json(`select id, spent_on from expenses where description = 'Site parking (probe S06)' and repeat_of is null`)[0]
      ok(!!r, 'Michelle logs it (it waits, as hers do)')
      if (r) {
        const s0 = plusDays(TODAY, -7)
        sql(`update expenses set spent_on = ${s0}, created_at = ${s0 + 9 * 3600}, repeat_next = ${TODAY} where id = '${r.id}'`)
        const t0 = Math.floor(Date.now() / 1000) - 2
        as('dane')
        await go(p, '/company/finance/todo')
        const made = json(`select id, status from expenses where repeat_of = '${r.id}'`)
        ok(made.length === 1 && made[0].status === 'pending', 'today’s is logged and waits for approval, as Michelle’s own do')
        ok(Number(sql(`select count(*) from notifications where kind = 'expense_review' and member_id in ('dane','huimin') and title like '%repeating expense%' and created_at >= ${t0}`)) === 2, 'the Owners and Admins hear it on the bell')
        ok(made.length === 1 && await p.locator('[data-todo]').filter({ hasText: 'Site parking (probe S06)' }).count() >= 1, 'it is on To do, to approve')
      }
      as('dane')
    }

    // ── 5 · stop, change, remove ──────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5) && cleanRoot) {
      console.log('5 · Stop repeating · a change of rhythm · remove the first one')
      await go(p, `/company/finance/money-out?kind=expenses`)
      const row = p.locator(`[data-expense="${cleanRoot}"]`)
      await row.getByRole('button', { name: /More actions for/ }).click(); await settle(p, 300)
      ok((await menuItems(p)).includes('Stop repeating'), 'the ⋮ offers Stop repeating')
      const next0 = Number(sql(`select repeat_next from expenses where id = '${cleanRoot}'`))
      await p.getByRole('menuitem', { name: /^Stop repeating/ }).click(); await settle(p, 1400)
      ok(/won’t repeat any more — what was logged stays/.test(await snackText(p)), 'it says the repeat stops and what was logged stays')
      const st = json(`select repeat_stopped_at, repeat_stopped_by, repeat_next from expenses where id = '${cleanRoot}'`)[0]
      ok(!!st?.repeat_stopped_at && st.repeat_stopped_by === 'dane' && st.repeat_next === null, 'the record says when and who stopped it')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_expense_repeat' and json_extract(detail, '$.stopped') = 1 and json_extract(detail, '$.id') = '${cleanRoot}'`)) === 1, 'the project’s Activity says the repeat stopped')
      await undo(p)
      ok(sql(`select coalesce(repeat_stopped_at, 'x') || '|' || repeat_next from expenses where id = '${cleanRoot}'`) === `x|${next0}`, 'Undo starts it again, its next day as it was')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_expense_repeat' and json_extract(detail, '$.id') = '${cleanRoot}'`)) === 0, '…and takes its Activity line back')
      /* a change of rhythm from the first one's Edit */
      await row.getByRole('button', { name: /More actions for/ }).click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Edit/ }).click(); await settle(p, 700)
      const d = dialog(p, 'Edit expense')
      await pick(p, d.getByLabel('Repeats'), 'Every month')
      ok(/For the whole repeat — next on/.test((await d.innerText()).replace(/\s+/g, ' ')), 'on a repeat, the field says it changes the whole repeat')
      await d.getByTestId('expense-save').click(); await settle(p, 1600)
      const anchor = Number(sql(`select spent_on from expenses where id = '${cleanRoot}'`))
      const latest = Math.max(anchor, ...sql(`select spent_on from expenses where repeat_of = '${cleanRoot}'`).split('\n').filter(Boolean).map(Number), TODAY)
      let k = 1; while (plusMonths(anchor, k) <= latest) k++
      ok(sql(`select repeat_every || '|' || repeat_next from expenses where id = '${cleanRoot}'`) === `month|${plusMonths(anchor, k)}`, 'every month now — the next day from the first one’s, after what is already logged')
      ok(/it repeats every month, next on/.test(await snackText(p)), 'the save says so')
      /* removing the first one stops it — said, Undo */
      await row.getByRole('button', { name: /More actions for/ }).click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Remove the expense/ }).click(); await settle(p, 1400)
      ok(/removed — it won’t repeat any more/.test(await snackText(p)), 'removing the first one says its repeat stops too')
      await undo(p)
      ok(sql(`select coalesce(deleted_at, 'live') from expenses where id = '${cleanRoot}'`) === 'live', 'Undo brings it back, repeating again')
    }

    // ── 6 · a handed-over project's repeat stops ──────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · a project handed over stops its repeats')
      const id = 'probe-s06-handover-root'
      sql(`insert into expenses (id, project_id, category, description, amount_minor, gst_minor, spent_on, paid_by, status, reviewed_by, reviewed_at, created_by, created_at, repeat_every, repeat_next) values ('${id}', '${shalini}', 'Labour', 'Defects visit (probe S06)', 5000, 0, ${plusDays(TODAY, -14)}, 'studio', 'approved', 'dane', ${plusDays(TODAY, -14)}, 'dane', ${plusDays(TODAY, -14)}, 'week', ${plusDays(TODAY, -7)})`)
      await go(p, '/company/finance/money-out?kind=expenses')
      const r = json(`select repeat_stopped_at, repeat_stopped_by, repeat_next from expenses where id = '${id}'`)[0]
      ok(!!r?.repeat_stopped_at && r.repeat_stopped_by === null && r.repeat_next === null, 'its repeat stopped — by the system, no next day')
      ok(Number(sql(`select count(*) from expenses where repeat_of = '${id}'`)) === 0, 'nothing is logged on a completed project')
      ok(Number(sql(`select count(*) from lead_events where kind = 'project_expense_repeat' and json_extract(detail, '$.why') = 'completed' and json_extract(detail, '$.id') = '${id}'`)) === 1, 'its Activity says the handover ended it')
    }

    // ── 7 · the studio's expense categories ───────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · the studio’s own expense categories')
      /* Xero connected first, so a new category's account can be seen being mapped */
      await go(p, '/company/finance/accounting')
      if (await p.getByTestId('xero-connect').count()) { await p.getByTestId('xero-connect').click(); await settle(p, 2000) }
      const xero = () => JSON.parse(sql(`select value from settings where key = 'xero'`) || '{}')
      ok(xero().connected === true, 'Xero is connected (simulated) for the run')
      await go(p, '/settings?section=finance')
      const card = p.getByTestId('expense-categories')
      ok(await card.getByTestId('expense-category').count() === 11 && /Not set yet/.test(await card.innerText()), 'the card lists the eleven every studio starts with')
      await card.getByLabel('Add a category').fill('Rent')
      await card.getByTestId('expense-category-add').click(); await settle(p, 1400)
      ok(JSON.parse(sql(`select value from settings where key = 'expense_categories'`) || '[]').includes('Rent'), 'Add saves the studio’s list with Rent')
      ok(xero().accounts?.['exp:Rent'] === '429', 'Xero gives the new category its account at once (General Expenses)')
      await card.getByLabel('Add a category').fill('rent')
      /* (S44Z — pending modules, a deliberate change of this rule: a name typed in another case names the entry it matches, S44P's M14 words) */
      ok(/Already in the list as “Rent”/.test(await card.innerText()), 'a name already on the list is refused under the field, any case — naming the entry it matches')
      await card.getByLabel('Add a category').fill('')
      /* an expense under Rent, then a rename: the expense and the Xero account follow */
      sql(`insert into expenses (id, project_id, category, description, amount_minor, gst_minor, spent_on, paid_by, status, reviewed_by, reviewed_at, created_by, created_at) values ('probe-s06-rent', NULL, 'Rent', 'Studio rent — probe S06', 350000, 0, ${TODAY}, 'studio', 'approved', 'dane', ${TODAY}, 'dane', ${TODAY})`)
      await go(p, '/settings?section=finance')
      await card.getByRole('button', { name: 'Rent', exact: true }).click(); await settle(p, 500)
      const ed = dialog(p, 'Expense category')
      ok(/A new name carries the expense logged under it, and its Xero account/.test(await ed.innerText()), 'its dialog says what a new name carries')
      await ed.getByLabel('Name').fill('Studio rent')
      await ed.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 1600)
      ok(/Rent is now Studio rent — its expense follows/.test(await snackText(p)), 'the rename says its expense follows')
      ok(sql(`select category from expenses where id = 'probe-s06-rent'`) === 'Studio rent', 'the expense logged under it follows the name')
      ok(xero().accounts?.['exp:Studio rent'] === '429' && xero().accounts?.['exp:Rent'] === undefined, 'its Xero account follows too')
      /* remove, with Undo: the expenses keep it */
      const before = sql(`select value from settings where key = 'expense_categories'`)
      await card.getByRole('button', { name: 'Remove Meals' }).click(); await settle(p, 1400)
      ok(/Meals removed — no expense was logged under it/.test(await snackText(p)) && !JSON.parse(sql(`select value from settings where key = 'expense_categories'`)).includes('Meals'), 'Remove takes Meals off the list, said')
      await undo(p)
      ok(sql(`select value from settings where key = 'expense_categories'`) === before, 'Undo puts it back where it was')
      await shot(p, '04-expense-categories-1440')
      /* the dialog offers the studio's list */
      await go(p, '/company/finance/money-out?kind=expenses')
      await p.getByTestId('finance-new').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Expense/ }).click(); await settle(p, 700)
      await dialog(p, 'Log an expense').getByLabel('Category').click(); await settle(p, 400)
      const opts = (await p.getByRole('option').allInnerTexts()).map((x) => x.trim())
      ok(opts.includes('Studio rent') && opts.includes('Meals'), 'Log an expense offers the studio’s own categories')
      await p.keyboard.press('Escape'); await settle(p, 200); await p.keyboard.press('Escape'); await settle(p, 400)
      /* Reports group by them */
      await go(p, '/company/reports/finance?report=expenses&period=all')
      ok(/Studio rent/.test(await p.locator('main').innerText()), 'Reports › Expenses groups by the studio’s category')
      /* Xero's mapping lists it */
      await go(p, '/company/finance/accounting')
      ok(/Expenses — Studio rent/.test(await p.locator('main').innerText()), 'Xero’s mapping has a row for it')
      /* a Designer reads the list */
      as('germaine')
      await go(p, '/settings?section=finance')
      ok(await p.getByTestId('expense-categories').getByLabel('Add a category').count() === 0 && await p.getByTestId('expense-categories').getByRole('button', { name: /^Remove / }).count() === 0, 'a Designer reads the categories — nothing to add or remove')
      as('dane')
    }

    // ── 8 · the PO paper's acceptance block ───────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · the PO acceptance block is on by default')
      sql(`update settings set value = json_remove(value, '$.paper') where key = 'cost_rules'`)
      await go(p, '/settings?section=finance')
      ok(await p.getByTestId('po-paper-settings').getByLabel('An acceptance block for the vendor').isChecked(), 'the acceptance block starts on, as 1.0 printed it')
      const po = json(`select id, project_id from purchase_orders where number = 'PO-2026-003'`)[0]
      if (po) {
        await go(p, `/projects/${po.project_id}/purchase-orders/${po.id}`)
        ok(await p.getByTestId('po-paper-acceptance').count() === 1, 'a PO’s paper prints it with no setting saved')
        await shot(p, '05-po-acceptance-1440')
      }
    }

    // ── 9 · the category palette ──────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Where costs go wears the house categorical palette')
      await go(p, `/projects/${ryan}/money`)
      const segs = p.getByTestId('where-costs-go').getByTestId('where-costs-seg')
      const n = await segs.count()
      const tones = await segs.evaluateAll((els) => els.map((e) => ({ tone: e.getAttribute('data-tone'), bg: getComputedStyle(e).backgroundColor })))
      const named = tones.filter((t) => t.tone !== 'other')   // a lone fifth keeps its name in Other's grey — the rest is Other
      ok(n >= 1 && named.every((t, i) => t.tone === `c${i + 1}`), `each named category takes the next slot, in order (${tones.map((t) => t.tone).join(' · ')})`)
      ok(new Set(named.map((t) => t.bg)).size === named.length, 'every named category has its own hue')
      ok(tones.every((t) => t.bg !== 'rgb(219, 56, 42)'), 'never the house red')
      ok(named.length <= 4, 'four named at most — the rest fold into Other')
      await p.getByTestId('where-costs-go').scrollIntoViewIfNeeded(); await settle(p, 300)
      await p.getByTestId('where-costs-go').screenshot({ path: path.join(dir, '06-where-costs-go-1440.png') })
    }

    // ── 10 · Accounting ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · Accounting (Priya Tan)')
      as('priya')
      await go(p, '/settings?section=studio')
      ok(await p.locator('[role="tablist"]').count() === 0 && await p.getByTestId('settings-finance').count() === 1, 'Settings is Finance alone — no module strip, whatever the address asks')
      /* a link's text carries its icon's name (the icon font's ligature) — read the words at its end */
      const links = (await p.getByTestId('settings-finance').getByTestId('module-links').getByRole('button').allInnerTexts()).map((x) => x.trim().split(/\s+/).pop()).filter(Boolean)
      ok(links.includes('Vendors') && links.includes('Commission') && !links.includes('Profile') && !links.includes('schedules') && await p.getByTestId('invoice-approval-link').count() === 0, `only the links they open (Vendors · Commission), no door into another module (${links.join(' · ')})`)
      await shot(p, '07-accounting-settings-1440')
      /* raising POs */
      await go(p, '/company/finance/money-out')
      await p.getByTestId('finance-new').click(); await settle(p, 300)
      ok((await menuItems(p)).some((x) => /^Purchase order/.test(x)), 'Money out’s New ▾ offers a purchase order')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, `/projects/${ben}/money`)
      await p.getByTestId('money-new').click(); await settle(p, 300)
      ok((await menuItems(p)).some((x) => /^Purchase order/.test(x)), 'a project’s Money offers one too')
      await p.getByRole('menuitem', { name: /^Purchase order/ }).click(); await settle(p, 900)
      ok(await p.locator('[role="dialog"]').filter({ hasText: /purchase order/i }).count() >= 1, 'the PO dialog opens for them')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* Files, read-only */
      await go(p, `/projects/${ben}/files`)
      const tab = p.locator('main')
      ok(await tab.getByRole('button', { name: 'New File' }).count() === 0 && await tab.getByRole('button', { name: 'New Folder' }).count() === 0 && await tab.getByRole('button', { name: 'More options' }).count() === 0, 'Files: no New File, no New Folder, no Deleted Files')
      ok(await p.locator('[data-kb-list="file"] input[type="checkbox"]').count() === 0, 'nothing to select — a press opens')
      const tile = p.getByTestId('file-tile').first()
      await tile.getByRole('button', { name: /^Actions for/ }).click(); await settle(p, 300)
      ok(JSON.stringify(await menuItems(p)) === '["Open","Download"]', 'a file’s ⋮ is Open and Download')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await p.getByRole('radio', { name: 'List view' }).click().catch(async () => { await p.getByLabel('List view').click() }); await settle(p, 600)
      ok(await p.locator('[role="table"][aria-label="Files"] [data-col="sel"]').count() === 0, 'the list has no selection column')
      await shot(p, '08-accounting-files-1440')
      const fileId = sql(`select f.id from lead_files f join projects pr on pr.lead_id = f.lead_id where pr.id = '${ben}' and f.kind <> 'folder' and f.deleted_at is null and f.parent_id is null limit 1`)
      await go(p, `/projects/${ben}/files/${fileId}`)
      ok(await p.getByRole('button', { name: 'More options' }).count() === 0 && await p.getByRole('button', { name: 'Download' }).count() >= 1, 'the viewer keeps Download, no ⋮')
      await p.getByRole('button', { name: 'Comments' }).click(); await settle(p, 500)
      ok(await p.locator('aside[aria-label="Comments"] textarea').count() === 0, 'its comments are to read — no box to write in')
      /* the quote's Preview, read-only */
      const q = sql(`select quote_id from projects where id = '${ben}'`)
      await go(p, `/quotes/${q}/preview?from=${encodeURIComponent(`/projects/${ben}/money`)}`)
      ok(await p.getByRole('button', { name: /^Send/ }).count() === 0 && await p.getByRole('button', { name: 'Change template' }).count() === 0 && await p.getByRole('button', { name: /What your client sees/ }).count() === 0, 'Preview: no Send, no template change, nothing to set')
      await p.getByRole('button', { name: 'Back', exact: true }).click(); await p.waitForURL(/\/money/, { timeout: 10000 }).catch(() => {}); await settle(p, 600)
      ok(new URL(p.url()).pathname === `/projects/${ben}/money`, 'Back returns to the project’s Money')
      /* To do's send step, in its words */
      await go(p, '/company/finance/todo')
      const sends = await p.getByTestId('todo-send').allInnerTexts()
      const approval = (JSON.parse(sql(`select coalesce((select value from settings where key = 'project_invoices'), '{}')`)).approval ?? true) !== false
      ok(sends.every((t) => (approval ? /Submit for approval/ : /^Send/).test(t)), `To do’s ready invoices read ${approval ? 'Submit for approval' : 'Send'} for Accounting (${sends.length} row(s))`)
      as('dane')
      await go(p, '/settings?section=studio')
      const po = await reach(p, 'po-prepare'), ps = await reach(p, 'po-send'), fc = await reach(p, 'files-change')
      /* (S44O — call C6, the sixth role: Marketing's column stands before Accounting's, so Accounting reads one place on — a deliberate change of
         the table, found and updated by S44Z) */
      const acc = 5
      ok(po[acc] === 'yes' && ps[acc] === 'submit', 'Who may do what: Accounting raises POs; theirs over the limit wait')
      ok(fc[acc] === 'no', 'Who may do what: Accounting changes no project file')
    }

    // ── 11 · the phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · 390 and 320')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h); const m = await page(pc, `phone-${w}`)
        await go(m, '/company/finance/money-out?kind=expenses')
        ok(await sideways(m) <= 0, `${w}: Money out › Expenses has no sideways scroll`)
        if (w === 390) await shot(m, '09-expenses-390', true)
        await m.getByTestId('finance-new').click(); await settle(m, 400)
        await m.getByRole('menuitem', { name: /^Expense/ }).click(); await settle(m, 900)
        ok(await m.getByLabel('Repeats').count() >= 1 && await sideways(m) <= 0, `${w}: Log an expense has Repeats, no sideways scroll`)
        if (w === 390) { await m.getByLabel('Repeats').scrollIntoViewIfNeeded(); await settle(m, 300); await shot(m, '10-expense-sheet-390') }
        await go(m, '/settings?section=finance')
        await m.getByTestId('expense-categories').scrollIntoViewIfNeeded(); await settle(m, 300)
        ok(await sideways(m) <= 0, `${w}: Settings › Finance has no sideways scroll`)
        if (w === 390) await shot(m, '11-categories-390')
        await pc.close()
      }
    }

    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
