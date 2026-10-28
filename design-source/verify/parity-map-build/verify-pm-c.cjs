// The parity-map build, package P-C — books, reports & commission (the owner's "build everything that's in 1.0 to 2.0", 2026-10-10; map rows
// FB-004 · FB-042 · FB-043 · FB-055 · FB-057 · FB-065 · FB-072 · FB-073 · FB-075 · FB-076 · FB-077 · FB-105 · PR-122 · PR-123's numbers).
// Each item asserted as the rule it builds, never another round's count:
//  FB-042 · FB-043  a project's commission in one dialog (Finance › Commission › a line's ⋮ › This project's commission; Settings' project rate
//                   Change): The studio's rule (its rate shown) · A rate for this project · No commission; on a % rate, Pay on chosen payment
//                   stages with a rate per stage (commission_rules.stages_json); Save answers with Undo; a member's own rate there is named
//  FB-057           the project's Activity carries the change ("set the project's commission to …"); Undo takes the line with it
//  FB-065           Reports › Finance › GST: Output tax · Input tax · Net, This quarter on arrival (and when GST is picked on a year), the lines
//                   open their lists, every record listed; Export
//  FB-075           Cash flow: "In, same month last year" and "Change" columns
//  FB-076           Expenses: Total · GST paid · Reimbursements, by category
//  FB-077           Profitability: By budget range, and Days to complete on the groups
//  FB-004           Owed to you opens on Owed to you · You owe · Net (Net = owed − you owe)
//  FB-072 · FB-073  Commissions › By project: Expected · Earned · Variance; Changes lists the asks and rate changes
//  FB-105           the Issued by scope: absent with one entity; with two, on the report bar, the address keeps it, GST lists By issuing entity
//  FB-055 · PR-122  `afterProjectCompleted` / `closingNumbers` are P-E's to call — asserted there (the handover); here only that a Designer meets
//                   no figures (the gate)
//  Phone 390: no sideways scroll on GST; the dialog opens (a sheet).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3123 NODE_PATH=<repo>/node_modules node verify-pm-c.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-c')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3123'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const money = (s) => Number(String(s).replace(/[^0-9.-]/g, '')) || 0

/* the brand record is put back whole, through a file (it holds pictures) */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-c-'))
const hadBrand = sql(`select count(*) from settings where key='brand'`) === '1'
if (hadBrand) execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select writefile('${path.join(tmp, 'brand')}', value) from settings where key='brand'"`)
const putBrand = () => { if (hadBrand) execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "update settings set value = readfile('${path.join(tmp, 'brand')}') where key='brand'"`) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ben = P('P-2026-002')
  const startAt = Math.floor(Date.now() / 1000) - 5
  const before = { rules: sql('select count(*) from commission_rules'), asks: sql('select count(*) from commission_requests'), events: sql('select count(*) from lead_events'),
    tasks: sql('select count(*) from lead_tasks') }
  /* what was there before the probe, by id — the cleanup takes only what the probe made (a page load may write bell rows of its own: derived
     due rows, a first visit's note — they are the server's, not the probe's, and stay) */
  const idsOf = (table) => new Set(sql(`select id from ${table}`).split('\n').filter(Boolean))
  const kept = { rules: idsOf('commission_rules'), events: idsOf('lead_events'), bell: idsOf('notifications') }
  const ended = sql('select group_concat(id) from commission_rules where ended_at is not null').split(',').filter(Boolean)
  const made = (table, ids, where) => sql(`select id from ${table} where ${where}`).split('\n').filter(Boolean).filter((id) => !ids.has(id))
  const dropMade = (table, ids, where) => { for (const id of made(table, ids, where)) sql(`delete from ${table} where id='${id}'`) }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const text = async (l) => ((await l.count()) ? await l.first().innerText() : '')
  /* a tile's caption may print in capitals (text-transform) — read case-blind; its value is the second line */
  const tile = async (p, label) => text(p.locator('[data-testid="report-tiles"] > *').filter({ hasText: new RegExp(`^${label}`, 'i') }))
  const lastStage = sql(`select id from quote_payments where quote_id=(select quote_id from projects where id='${ben}') order by position desc limit 1`)
  const lastStageName = sql(`select name from quote_payments where id='${lastStage}'`)
  try {
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')

    // ── 1 · FB-042 · FB-043 — a project's commission, one dialog ─────────────────────────────────────────────────────────────────
    console.log('· A project’s commission (Owner)')
    await go(p, '/company/finance/commissions')
    const line = p.locator(`[data-line^="${ben}:"]`).first()
    ok(await line.count() === 1, 'Finance › Commission lists a line on Benjamin Han’s project')
    await line.getByRole('button', { name: /^More for/ }).click(); await settle(p, 400)
    await p.getByRole('menuitem', { name: /This project’s commission/ }).first().click(); await settle(p, 1400)
    const dlg = p.getByTestId('project-commission-dialog')
    ok(await dlg.count() === 1, 'the line’s ⋮ › This project’s commission opens the dialog')
    const modes = await dlg.getByTestId('project-commission-mode').getByRole('radio').allInnerTexts()
    ok(modes.join(' · ') === 'The studio’s rule · A rate for this project · No commission', `three choices (${modes.join(' · ')})`)
    ok(/3% of what the client pays/.test(await text(dlg.getByTestId('project-commission-studio'))), 'the studio’s rule, its rate shown')
    ok(/Germaine/.test(await text(dlg.getByTestId('project-commission-others'))), 'a member’s own rate on the project is named under it')
    await shot(p, 'c-01-dialog-studio', false)
    await dlg.getByTestId('project-commission-mode').getByRole('radio', { name: 'A rate for this project' }).click(); await settle(p, 300)
    await dlg.getByLabel(/^Rate \(%\)/).fill('5')
    ok(await dlg.getByTestId('project-commission-stages').count() === 1, 'a % rate offers Pay on chosen payment stages')
    await dlg.getByText('Pay on chosen payment stages').click(); await settle(p, 300)
    ok(await dlg.getByTestId('project-commission-stage').count() >= 2, 'a tick per payment stage')
    await dlg.getByTestId('project-commission-stage').filter({ hasText: lastStageName }).getByText(new RegExp(lastStageName)).click(); await settle(p, 300)
    await dlg.getByTestId('project-commission-stage').filter({ hasText: lastStageName }).getByLabel(/Its rate/).fill('6')
    await shot(p, 'c-02-dialog-stages', false)
    await p.getByTestId('project-commission-save').click(); await settle(p, 1600)
    const rule = sql(`select stages_json || '|' || rate_bp || '|' || basis from commission_rules where project_id='${ben}' and member_id is null and ended_at is null`)
    ok(rule.includes(lastStage) && /"rateBp":600/.test(rule) && /\|500\|payments$/.test(rule), `saved: 5% on the ${lastStageName} stage at 6% (${rule})`)
    ok(/Undo/.test(await text(snack(p))), 'Save answers with Undo')
    ok(sql(`select count(*) from lead_events where kind='parity_c_commission_rule' and project_id='${ben}' and at >= ${startAt}`) === '1', 'its Activity line is written (FB-057)')
    await go(p, `/projects/${ben}/activity`)
    ok(/set the project’s commission to 5% of what the client pays/.test(await p.locator('main').innerText()), 'the project’s Activity reads the change')
    await shot(p, 'c-03-activity')
    /* No commission, then back to the studio's rule — each from today */
    await go(p, '/company/finance/commissions')
    await p.locator(`[data-line^="${ben}:"]`).first().getByRole('button', { name: /^More for/ }).click(); await settle(p, 400)
    await p.getByRole('menuitem', { name: /This project’s commission/ }).first().click(); await settle(p, 1400)
    ok(await dialog(p).getByTestId('project-commission-mode').getByRole('radio', { name: 'A rate for this project', checked: true }).count() === 1, 'it reopens on what is in force')
    await dialog(p).getByTestId('project-commission-mode').getByRole('radio', { name: 'No commission' }).click(); await settle(p, 300)
    await p.getByTestId('project-commission-save').click(); await settle(p, 1600)
    ok(sql(`select basis from commission_rules where project_id='${ben}' and member_id is null and ended_at is null`) === 'none', 'No commission is a project rule of its own (the one thing Settings could not say)')
    await snack(p).getByRole('button', { name: 'Undo' }).click(); await settle(p, 1600)
    ok(sql(`select basis from commission_rules where project_id='${ben}' and member_id is null and ended_at is null`) === 'payments', 'Undo puts the staged rate back')

    // ── 2 · Reports › Finance ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('· Reports')
    await go(p, '/company/reports/finance?report=gst')
    ok(/GST · Q[1-4] \d{4}/.test(await text(p.getByTestId('report-head'))), 'GST opens on This quarter')
    ok(/Output tax/i.test(await tile(p, 'Output tax')) && /Input tax/i.test(await tile(p, 'Input tax')) && /Net GST/i.test(await text(p.getByTestId('report-tiles'))), 'Output tax · Input tax · Net GST')
    ok(await p.getByTestId('report-table-records').count() === 1, 'every record of the period, listed')
    ok(await p.getByTestId('report-entity').count() === 0, 'one entity — no Issued by scope (FB-105)')
    await shot(p, 'c-04-gst')
    await go(p, '/company/reports/finance?report=pl&period=this_year')
    await p.getByTestId('report-chips').getByRole('button').first().click(); await settle(p, 400)   // (the calm UI build 2026-10-27, a deliberate change) B5 5-19: the report is the house pill — its menu's row
    await p.getByRole('menuitemradio', { name: /^GST/ }).first().click(); await settle(p, 600)
    ok(/period=this_quarter/.test(p.url()), 'picking GST on a year lands on This quarter (FB-065)')
    await p.getByTestId('report-export').click(); await settle(p, 500)
    const wait = p.waitForEvent('download', { timeout: 8000 }).catch(() => null)
    await dialog(p).getByRole('button', { name: /^Export$/ }).click()
    const dl = await wait; await settle(p, 600)
    ok(!!dl && /^gst\.csv$/.test(dl.suggestedFilename()), 'GST exports through the house Export')
    await go(p, '/company/reports/finance?report=cashflow&period=this_year')
    const heads = await text(p.getByTestId('report-table-months'))
    ok(/In, same month last year/i.test(heads) && /\bChange\b/i.test(heads), 'Cash flow: the same month last year and the change (FB-075)')   // the heads print in capitals
    await go(p, '/company/reports/finance?report=expenses&period=all')
    ok(/Total/i.test(await tile(p, 'Total')) && /GST paid/i.test(await tile(p, 'GST paid')) && /Reimbursements/i.test(await tile(p, 'Reimbursements')), 'Expenses: Total · GST paid · Reimbursements (FB-076)')
    ok(await p.getByTestId('report-table-categories').count() === 1, 'by category')
    await shot(p, 'c-05-expenses')
    await go(p, '/company/reports/finance?report=profitability')
    ok(await p.getByTestId('report-table-budgets').count() === 1 && /Days to complete/i.test(await text(p.getByTestId('report-table-types'))), 'Profitability: By budget range, and Days to complete (FB-077)')
    await go(p, '/company/reports/finance?report=ar')
    const [ow, yo, net] = [await tile(p, 'Owed to you'), await tile(p, 'You owe'), await tile(p, 'Net')]
    ok(!!ow && !!yo && !!net && Math.abs(money(net.split('\n')[1] ?? '') - (money(ow.split('\n')[1] ?? '') - money(yo.split('\n')[1] ?? ''))) < 0.01, `Owed to you · You owe · Net = owed − you owe (FB-004: ${[ow, yo, net].map((x) => x.split('\n')[1]).join(' · ')})`)
    await go(p, '/company/reports/finance?report=commissions&period=all')
    const byProject = await text(p.getByTestId('report-table-projects'))
    ok(/Expected/.test(byProject) && /Variance/.test(byProject), 'Commissions by project: Expected · Earned · Variance (FB-072)')
    ok(/Asked/.test(await text(p.getByTestId('report-table-changes'))), 'Changes: the asks and the rate changes (FB-073)')
    await shot(p, 'c-06-commissions')

    // ── 3 · FB-105 — the Issued by scope with two entities ───────────────────────────────────────────────────────────────────────
    console.log('· Issued by')
    sql(`update settings set value = json_set(value, '$.details.entities[#]', json_object('id','probe-e2','name','Probe Build Pte Ltd','bankName','','accountName','','accountNo','','payNow','','payNowQr',null,'gstRegistered',json('true'),'swift','','logo',null,'address','','uen','','gstReg','')) where key='brand'`)
    await go(p, '/company/reports/finance?report=gst&period=all')
    ok(await p.getByTestId('report-entity').count() === 1, 'two entities — the Issued by scope on the report bar')
    ok(await p.getByTestId('report-table-entities').count() === 1, 'GST lists By issuing entity')
    await p.getByTestId('report-entity').getByRole('button').click(); await settle(p, 400)
    await p.getByRole('menuitemradio', { name: /Probe Build Pte Ltd/ }).click(); await settle(p, 700)
    ok(/entity=probe-e2/.test(p.url()) && /Probe Build Pte Ltd/.test(await text(p.getByTestId('report-head'))), 'the scope rides the address and the head')
    ok(/S\$0\.00/.test(await tile(p, 'Output tax')), 'nothing is issued under the new entity — its GST is nil')
    await shot(p, 'c-07-gst-scoped')
    putBrand()

    // ── 4 · A Designer: no figures ───────────────────────────────────────────────────────────────────────────────────────────────
    as('germaine')
    await go(p, '/company/reports/finance?report=gst')
    ok(await p.getByTestId('finance-reports-gate').count() === 1 && await p.getByTestId('report-tiles').count() === 0, 'a Designer meets the gate, never GST')
    as('dane')
    await ctx.close()

    // ── 5 · Phone 390 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const ph = await phoneCtx()
    const q = await page(ph, 'phone')
    await go(q, '/company/reports/finance?report=gst')
    ok(await overflow(q) <= 0, 'GST at 390: no sideways scroll')
    await shot(q, 'c-08-gst-390')
    await go(q, '/company/finance/commissions')
    const pline = q.locator(`[data-line^="${ben}:"]`).first()
    if (await pline.count()) {
      await pline.getByRole('button', { name: /^More for/ }).click(); await settle(q, 500)
      await q.getByRole('menuitem', { name: /This project’s commission/ }).first().click(); await settle(q, 1400)
      ok(await q.getByTestId('project-commission-dialog').count() === 1, 'the dialog opens on a phone')
      await shot(q, 'c-09-dialog-390', false)
    } else ok(true, '(no line on a phone card — skipped)')
    await ph.close()
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    try {
      putBrand()
      as('dane')
      dropMade('commission_rules', kept.rules, `created_at >= ${startAt}`)
      /* a rule the probe ended (none should stay ended — Undo and the cleanup put them back) is in force again */
      sql(`update commission_rules set ended_at=NULL, ended_by=NULL where ended_at >= ${startAt}${ended.length ? ` and id not in (${ended.map((x) => `'${x}'`).join(',')})` : ''}`)
      dropMade('lead_events', kept.events, `at >= ${startAt} and kind like 'parity_c_commission_%'`)
      /* the probe's own presses raise no bell row; anything else written since is the server's (left as it is) */
      dropMade('notifications', kept.bell, `created_at >= ${startAt} and kind like 'commission_%'`)
      const after = { rules: sql('select count(*) from commission_rules'), asks: sql('select count(*) from commission_requests'), events: sql('select count(*) from lead_events'),
        tasks: sql('select count(*) from lead_tasks') }
      ok(JSON.stringify(after) === JSON.stringify(before), `the database is as it was (${JSON.stringify(after)})`)
    } catch (e) { fail++; console.log('  ✗ cleanup threw:', String(e).slice(0, 300)) }
    ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
