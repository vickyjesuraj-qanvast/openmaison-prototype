// fix-B — the Schedule's bug audit (design-source/context/parity/25-projects-bug-audit-2026-10-06/B-schedule.md), its fixes checked as rules:
// the row line carries every state (B-04), blocked is not under way (B-05), the panel's payment reads Money (B-08), field errors (B-10),
// the unsaved-edit guard and ?open= (B-35 · B-36), one Undo for a whole Save (B-02), Done early (B-09), the frozen columns over the bars (B-03),
// J / ↵ on the timeline (B-13), the sideways bar (B-31), Months remembered (B-30), Add after (B-15), a share's first done day (B-12) + Tell on
// WhatsApp (B-53) + nothing to share (B-18), a client with no portal (B-01 · B-17), a schedule set up mid-job (B-06) and its payment ties
// (B-07), the Start card's three ways (B-45), a completed project (B-27 · B-29), a template read-only for a Designer (B-11), the Overview's day
// count (B-21); on a phone the dock (B-44), the phone bar (B-41) and the panel's width (B-42).
// Run against `next start` on a FRESH copy of the repaired scratch DB — never local.db; it puts members.is_you back in `finally`.
// Usage: BASE=http://localhost:<port> NODE_PATH=$PWD/node_modules node verify-pj-fix-B.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'fix-B')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3121'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const P = (n) => sql(`select id from projects where number='${n}'`)
const dayNo = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5)
const TODAY = dayNo(new Date())
/** a stored day (local midnight) back to its day number, any zone (lib/projects/schedule-model.ts dayOfStored) */
const stored = (secs) => Math.round((Number(secs) * 1000) / 864e5)
const ms = (num, title, col = 'end_date') => sql(`select m.${col} from project_milestones m join projects p on p.id=m.project_id where p.number='${num}' and m.title='${title}' and m.deleted_at is null`)
const money2 = (minor) => `S$${(minor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dm = (n) => { const u = new Date(n * 864e5); return `${u.getUTCDate()} ${MON[u.getUTCMonth()]}` }

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
  const shot = (n, pg = p) => pg.screenshot({ path: path.join(dir, `${n}.png`) })
  const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
  const undo = () => snack().getByRole('button', { name: 'Undo' }).last()
  const rows = () => p.locator('[data-testid="schedule-timeline"] [data-kb-row]')
  const row = (title) => rows().filter({ has: p.locator('[data-testid="milestone-name"]', { hasText: title }) }).first()
  const panel = () => p.locator('[data-testid="milestone-panel"]')
  const ben = P('P-2026-002'), ryan = P('P-2026-001'), aisha = P('P-2026-003'), marcus = P('P-2026-004'), shalini = P('P-2025-001')
  const wasYou = sql(`select id from members where is_you = 1`)
  const aishaHold = sql(`select coalesce(on_hold_at,'') || '|' || coalesce(on_hold_until,'') || '|' || coalesce(on_hold_by,'') from projects where id='${aisha}'`)   // (gaps build, package A)
  const aishaWhy = sql(`select coalesce(on_hold_reason,'') from projects where id='${aisha}'`)

  try {
    // ── Ryan: the row line, the summary, the panel's payment, field errors, the guard ───────────────────────────────────────
    console.log('Ryan')
    await go(`/projects/${ryan}/schedule`)
    const eLine = await row('Electrical').locator('[class*="line"]').first().innerText()
    ok(/^Blocked · waiting on /.test(eLine) && /was due \w{3} \d+ \w{3}, \d+ days? late/.test(eLine), `B-04 the blocked, waiting, late row says all three: "${eLine}"`)
    ok(!/overdue|Ended/.test(eLine), 'B-22 the row says "late" and "was due", never "overdue" / "Ended"')
    const sum = await p.locator('[data-testid="schedule-summary"]').innerText()
    ok(/Electrical is blocked/.test(sum) && !/Electrical and carpentry are under way/i.test(sum), 'B-05 a blocked milestone has its own clause, not "under way"')
    /* B-20: Next payment reads the stage's invoice — Ryan's Commencement waits on the studio to confirm the client's proof (never red) */
    const rToConfirm = sql(`select count(*) from project_payments pp join project_invoices i on i.id=pp.invoice_id where i.project_id='${ryan}' and pp.status='to_confirm'`) !== '0'
    const rPay = p.locator('[data-testid="next-payment"]')
    ok(!rToConfirm || (/payment to confirm/.test(await rPay.innerText()) && (await rPay.getAttribute('data-alert')) === null), `B-20 Next payment in Money's words: "${await rPay.innerText()}"`)
    await shot('d-ryan-schedule')
    await row('Electrical').locator('[data-testid="milestone-name"]').click(); await p.waitForTimeout(700)
    const mid = Number(sql(`select amount_minor from project_invoices where project_id='${ryan}' and stage_name like 'Mid%' and status <> 'void'`))
    const vals = await panel().locator('input').evaluateAll((els) => els.map((e) => e.value).join(' | '))
    const ptext = (await panel().innerText()) + ' ' + vals
    ok(ptext.includes(money2(mid)), `B-08 the payment stage reads Money's amount, cents and all (${money2(mid)})`)
    await shot('d-ryan-panel-payment')
    await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    ok(!/[?&]open=/.test(p.url()), 'B-36 closing the panel drops ?open= from the address')
    await row('Carpentry').locator('[data-testid="milestone-name"]').click(); await p.waitForTimeout(700)
    const waitSwitch = panel().locator('label', { has: p.locator('input[aria-label="Waiting on someone"]') }).first()
    if (!(await p.locator('input[aria-label="Waiting on someone"]').isChecked())) await waitSwitch.click()
    await panel().getByRole('radio', { name: 'A member' }).click().catch(async () => { await panel().getByText('A member', { exact: true }).click() })
    await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(600)
    const invalid = await panel().locator('[aria-invalid="true"]').count()
    ok(invalid >= 1 && /Choose an option/.test(await panel().innerText()), 'B-10 the Member field turns red with the house words; the panel stays open')
    await shot('d-panel-err-member')
    await p.getByRole('button', { name: 'Cancel', exact: true }).last().click(); await p.waitForTimeout(500)
    ok(await p.getByRole('dialog', { name: /Discard your changes\?/ }).isVisible(), 'B-35 Cancel with unsaved edits asks "Discard your changes?"')
    await shot('d-panel-discard')
    await p.getByRole('button', { name: 'Discard' }).click(); await p.waitForTimeout(500)
    ok(!(await panel().isVisible().catch(() => false)), '…Discard closes the panel')

    // ── Ben: one Undo for a whole Save; Done early; frozen columns; keys; sideways bar; Months; Add after ─────────────────────
    console.log('Benjamin')
    await go(`/projects/${ben}/schedule`)
    const bPay = p.locator('[data-testid="next-payment"]')
    const bOver = sql(`select count(*) from project_invoices where project_id='${ben}' and status='sent' and due_at * 1000 + 86400000 <= ${Date.now()} and amount_minor > coalesce((select sum(amount_minor) from project_payments pp where pp.invoice_id=project_invoices.id and pp.status='confirmed'), 0)`) !== '0'
    ok(!bOver || (/overdue since/.test(await bPay.innerText()) && (await bPay.getAttribute('data-alert')) !== null), `B-20 a stage past its due day leads, in red: "${await bPay.innerText()}"`)
    const cEnd0 = ms('P-2026-002', 'Carpentry fabrication'), cStatus0 = sql(`select status from project_milestones where project_id='${ben}' and title='Carpentry fabrication'`)
    await row('Carpentry').locator('[data-testid="milestone-name"]').click(); await p.waitForTimeout(700)
    /* (simplify S-18, a deliberate change of this rule) the panel's Done opens the Mark done sheet — B-02's one-sentence save is checked with Blocked */
    await panel().getByRole('radio', { name: 'Blocked' }).click().catch(async () => { await panel().getByText('Blocked', { exact: true }).first().click() })
    await panel().getByRole('button', { name: '1 day' }).click()
    await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(1200)
    const saved = await snack().innerText()
    ok(/moved 1 day later/.test(saved) && /marked it blocked/.test(saved), `B-02 the sentence names every change: "${saved.split('\n')[0]}"`)
    ok(sql(`select status from project_milestones where project_id='${ben}' and title='Carpentry fabrication'`) === 'blocked', '…and the save landed (Blocked)')
    await undo().click(); await p.waitForTimeout(1500)
    ok(sql(`select status from project_milestones where project_id='${ben}' and title='Carpentry fabrication'`) === cStatus0 && ms('P-2026-002', 'Carpentry fabrication') === cEnd0, 'B-02 one Undo puts the status AND the dates back')

    await go(`/projects/${ben}/schedule`)
    const paintStart0 = ms('P-2026-002', 'Painting', 'start_date')
    /* (simplify S-18, a deliberate change of this rule) Mark done opens the Mark done sheet — the day, how early, Bring forward; its client and
       money ticks are unticked here so B-09's own rule is what is checked */
    await row('Carpentry').locator('[data-testid="mark-done"]').click(); await p.waitForTimeout(1500)
    const sheet = p.locator('[data-testid="done-sheet"]')
    ok(await sheet.isVisible() && /early — it was due to end/.test(await p.locator('[data-testid="done-sheet-when"]').innerText()), 'B-09 Mark done before its end asks: the day, how early, and what follows may come forward')
    await shot('d-ben-done-early')
    for (const t of ['done-sheet-share', 'done-sheet-confirm-ask', 'done-sheet-invoice']) { const c = sheet.locator(`[data-testid="${t}"] input`); if (await c.count() && await c.isChecked() && await c.isEnabled()) await sheet.locator(`[data-testid="${t}"]`).click() }
    await p.locator('[data-testid="done-sheet-confirm"]').click(); await p.waitForTimeout(1800)
    ok(stored(ms('P-2026-002', 'Carpentry fabrication')) === TODAY, 'B-09 Done early ends it today')
    ok(ms('P-2026-002', 'Painting', 'start_date') === paintStart0, '…and what follows keeps its dates (not brought forward)')
    ok(/ended today/.test(await snack().innerText()), '…in one sentence')
    await undo().click(); await p.waitForTimeout(1500)
    ok(ms('P-2026-002', 'Carpentry fabrication') === cEnd0 && sql(`select status from project_milestones where project_id='${ben}' and title='Carpentry fabrication'`) === cStatus0, '…Undo puts status and end back')

    await go(`/projects/${ben}/schedule`)
    ok(await p.locator('[data-testid="schedule-timeline"] [data-side-scroll]').count() === 1, 'B-31 the timeline has the house sideways bar')
    const box = await rows().first().boundingBox()
    ok(!!box && box.height >= 60 && box.width > 900, 'B-13 each row is a real box across the grid')
    await p.locator('body').click({ position: { x: 5, y: 5 } })
    await p.keyboard.press('j'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(700)
    ok(await panel().isVisible().catch(() => false), 'B-13 J then ↵ opens the first milestone')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    await p.getByRole('radio', { name: 'Months' }).click().catch(async () => { await p.getByText('Months', { exact: true }).click() })
    await p.waitForTimeout(500)
    ok(!/Shaded columns are weekends/.test(await p.locator('[class*="legend"]').innerText()), 'B-30 Months: the legend drops the weekends')
    await go(`/projects/${ben}/schedule`)
    ok(/true/.test(String(await p.getByRole('radio', { name: 'Months' }).isChecked().catch(() => false))) || (await p.locator('[aria-label="Scale"] [aria-checked="true"], [aria-label="Scale"] [data-selected="true"]').innerText().catch(() => '')).includes('Months'), 'B-30 Months is remembered on reload')
    await p.getByRole('radio', { name: 'Weeks' }).click().catch(async () => { await p.getByText('Weeks', { exact: true }).click() })
    await p.waitForTimeout(400)

    await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(400)
    const menu = p.locator('[role="menu"]').last()
    const mb = await menu.boundingBox()
    ok(!!mb && mb.y + mb.height <= 1024 && await menu.getByText('Delete').isVisible(), 'B-33 the row menu near the foot shows Delete inside the viewport')
    await menu.getByText('Add a milestone after').click(); await p.waitForTimeout(400)
    await p.getByLabel('Milestone name').fill('Touch-up walk'); await p.locator('[data-testid="name-dialog-save"]').click(); await p.waitForTimeout(1200)
    const paint = sql(`select id || '|' || position from project_milestones where project_id='${ben}' and title='Painting' and deleted_at is null`).split('|')
    const added = sql(`select follows_id || '|' || position from project_milestones where project_id='${ben}' and title='Touch-up walk' and deleted_at is null`).split('|')
    ok(added[0] === paint[0] && Number(added[1]) === Number(paint[1]) + 1, 'B-15 "Add a milestone after" lands right after it, following it')

    // B-12 · B-53 · B-18: a later share keeps the day the client was first shown a milestone done
    await go(`/projects/${ben}/schedule?share=1`)
    await p.locator('[data-testid="share-confirm"]').click(); await p.waitForTimeout(1500)
    ok(/Tell Benjamin on WhatsApp/.test(await snack().innerText()), 'B-53 after a share: Tell Benjamin on WhatsApp')
    await go(`/projects/${ben}/schedule`)
    const firstDone = (() => { const rowsS = sql(`select shared_at || '~' || snapshot from project_schedule_shares where project_id='${ben}' order by shared_at`).split('\n'); const mid_ = sql(`select id from project_milestones where project_id='${ben}' and title='Masonry & tiling'`); for (const r of rowsS) { const [at, snap] = [r.slice(0, r.indexOf('~')), r.slice(r.indexOf('~') + 1)]; try { const s = JSON.parse(snap); if (s.rows.some((x) => x.id === mid_ && x.state === 'done')) return dayNo(new Date(Number(at) * 1000)) } catch {} } return null })()
    const mLine = await row('Masonry').locator('[class*="line"]').first().innerText()
    ok(firstDone !== null && mLine.includes(`Shared ${dm(firstDone)}`) && firstDone !== TODAY, `B-12 Masonry keeps the day it was first shared done: "${mLine}"`)
    await go(`/projects/${ben}/schedule?share=1`)
    ok(await p.locator('[data-testid="share-nothing"]').isVisible(), 'B-18 with nothing to share: "Benjamin already sees this schedule"')
    await shot('d-ben-share-nothing')
    await p.locator('[data-testid="share-close"]').click(); await p.waitForTimeout(500)
    ok(!/[?&]share=/.test(p.url()), '…Close drops ?share=')

    // B-21: the Overview's day count is the Schedule's
    await go(`/projects/${ben}`)
    const endCap = await p.locator('[data-testid="status-end"]').innerText().catch(() => '')
    await go(`/projects/${ben}/schedule`)
    const toGo = (await p.locator('[data-testid="schedule-summary"]').innerText()).match(/To handover\s+(\d+) days?/)
    ok(!!toGo && endCap.includes(`${toGo[1]} day`), `B-21 Overview "${(endCap.match(/\d+ days? left/) || [''])[0]}" = Schedule "${toGo ? toGo[1] : '?'} days"`)

    // B-03: the frozen name column stays over the bars when the timeline scrolls sideways
    await p.setViewportSize({ width: 1025, height: 800 }); await go(`/projects/${ben}/schedule`)
    await p.evaluate(() => { const s = document.querySelector('[data-testid="schedule-timeline"] [class*="scroller"]'); if (s) s.scrollLeft = 400 })
    await p.waitForTimeout(300)
    const covered = await p.evaluate(() => {
      const out = []
      for (const r of Array.from(document.querySelectorAll('[data-testid="schedule-timeline"] [data-kb-row]')).slice(0, 4)) {
        const c = r.querySelector('[role="cell"]'); const b = c.getBoundingClientRect()
        const el = document.elementFromPoint(b.right - 12, b.top + b.height / 2)
        out.push(!!el && c.contains(el))
      }
      return out
    })
    ok(covered.every(Boolean), 'B-03 bars slide under the frozen name column')
    await shot('m-ben-scrolled')
    await p.setViewportSize({ width: 1440, height: 1024 })

    // ── Aisha: no portal yet (B-01 · B-17) — then a schedule set up mid-job (B-06) ───────────────────────────────────────────
    console.log('Aisha')
    /* (gaps build, package A — M-01) R78 put Aisha's project on hold, whose one action is then Resume (REG-a.2): these checks are about a
       running project's schedule and its first share, so she runs here, and her hold comes back in `finally` */
    sql(`update projects set on_hold_at = null, on_hold_reason = null, on_hold_until = null, on_hold_by = null where id='${aisha}'`)
    /* (gaps build B, REG-b.5) a stage's invoice ready to send now leads the header, before Share — Aisha's Commencement is; it is held for
       approval here so B-17's rule (the first share's words) is the one filled action, and put back after */
    sql(`update project_invoices set submitted_by='michelle', submitted_at=strftime('%s','now') where project_id='${aisha}' and stage_name='Commencement' and status='draft'`)
    await go(`/projects/${aisha}/schedule`)
    ok(/Aisha has no portal yet/.test(await p.locator('[data-testid="client-sees"]').innerText()), 'B-01 the line says Aisha has no portal yet')
    /* (simplify S-02 · Q-03, a deliberate change of this rule) the header is Needs you's top row — an approval leads; B-17's words are the share
       row's own ("Aisha hasn’t seen the schedule yet" · Share), and Share opens from its deep link */
    await go(`/projects/${aisha}`)
    /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
    { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
    ok(/hasn’t seen the schedule yet/.test(await p.locator('[data-testid="need-share"]').innerText().catch(() => '')), 'B-17 never shared: Needs you says "Aisha hasn’t seen the schedule yet"')
    await go(`/projects/${aisha}/schedule?share=1`); await p.waitForTimeout(900)
    ok(await p.locator('[data-testid="share-no-portal"]').isVisible() && await p.locator('[data-testid="share-invite"]').isVisible(), 'B-01 the share says she has no portal yet and offers Invite')
    await shot('d-aisha-share-first')
    await p.locator('[data-testid="share-confirm"]').click(); await p.waitForTimeout(1300)
    ok(/kept for Aisha/.test(await snack().innerText()), 'B-01 the snackbar is honest: kept until she is invited')
    sql(`update project_invoices set submitted_by=null, submitted_at=null where project_id='${aisha}' and stage_name='Commencement' and status='draft'`)

    sql(`update project_milestones set deleted_at = 1 where project_id='${aisha}'`)
    await go(`/projects/${aisha}/schedule`)
    ok(await p.locator('[data-testid="start-schedule"]').isVisible() && await p.locator('[data-testid="project-primary"]').count() === 0, 'B-16 on the Start card the header has no second filled button')
    const startDay = sql(`select start_date from projects where id='${aisha}'`)
    await p.locator('[data-testid="start-schedule"]').getByText('A quote', { exact: true }).click()   // (gaps build C) the card is "A quote" now — any of the lead's quotes, the signed one first
    ok(await p.locator('[data-testid="start-past"]').isVisible(), 'B-06 the Start card says what already happened starts as done')
    await p.locator('[data-testid="create-schedule"]').click(); await p.waitForTimeout(1500)
    const st = sql(`select title || ':' || status from project_milestones where project_id='${aisha}' and deleted_at is null order by position`).split('\n')
    const byDate = sql(`select count(*) from project_milestones where project_id='${aisha}' and deleted_at is null and ((end_date * 1000 / 86400000.0) < ${TODAY} - 0.5) and status <> 'done'`)
    ok(st.length > 3 && byDate === '0' && st.some((x) => /:done$/.test(x)), `B-06 milestones that ended before today start as done (${st.slice(0, 3).join(', ')}…)`)
    ok(!/is \d+ days late/.test(await p.locator('[data-testid="schedule-summary"]').innerText()), 'B-06 the page does not open late')
    ok(Number(sql(`select count(*) from project_milestones where project_id='${aisha}' and deleted_at is null and payment_ref is not null`)) > 0, 'B-07 payments are tied when the schedule is made')
    void startDay

    // ── Marcus (direct, no quote): the Start card's three ways (B-45), a template ties the split (B-07) ─────────────────────
    console.log('Marcus')
    await go(`/projects/${marcus}/schedule`)
    const quoteCard = p.locator('[data-testid="start-schedule"] [role="radio"], [data-testid="start-schedule"] button').filter({ hasText: /^A quote/ }).first()
    ok(await quoteCard.isVisible() && /No quote on this project yet/.test(await p.locator('[data-testid="start-schedule"]').innerText()), 'B-45 "A quote" shows, disabled, with why (gaps build C renamed the card)')
    await p.locator('[data-testid="start-schedule"]').getByText('A schedule template').click(); await p.waitForTimeout(300)
    await p.locator('[data-testid="create-schedule"]').click(); await p.waitForTimeout(1500)
    ok(Number(sql(`select count(*) from project_milestones where project_id='${marcus}' and deleted_at is null and payment_ref like 'split:%'`)) > 0, 'B-07 a template start ties the agreed split\'s stages')
    ok(Number(sql(`select count(*) from project_milestones where project_id='${marcus}' and deleted_at is null and payment_ref = 'split:0'`)) === 0, 'B-23 the deposit (on signing) ties to no milestone')

    // ── Shalini (completed): Save as a template (B-27) · the figures (B-29) ────────────────────────────────────────────────────
    console.log('Shalini')
    await go(`/projects/${shalini}/schedule`)
    const stats = await p.locator('[data-testid="schedule-summary"]').innerText()
    ok(/Handed over/.test(stats) && !/past/.test(stats), 'B-29 a finished job says "Handed over {day}", never "n days past"')
    await p.locator('[data-testid="schedule-kebab"]').click(); await p.waitForTimeout(400)
    ok(await p.locator('[role="menu"]').last().getByText('Save as a template').isVisible(), 'B-27 Save as a template is offered on a completed project')
    await p.keyboard.press('Escape')

    // ── Sarah (Designer): Dane's template reads only (B-11) ─────────────────────────────────────────────────────────────────
    console.log('Sarah')
    sql(`update members set is_you = case when id='sarah' then 1 else 0 end`)
    const tpl = sql(`select id from schedule_templates where created_by='dane' and deleted_at is null limit 1`)
    const before = sql(`select updated_at || updated_by from schedule_templates where id='${tpl}'`)
    await go(`/templates/schedules/${tpl}`)
    const ed = p.locator('[data-testid="schedule-template-editor"]')
    ok(/Only its author, an Owner or an Admin changes it/.test(await ed.innerText()), 'B-11 a Designer reads the house read-only note')
    ok(await ed.locator('[data-testid="schedule-item"] input').first().isDisabled(), '…and every field is read-only')
    await shot('d-tpl-editor-sarah')
    await p.waitForTimeout(800)
    ok(sql(`select updated_at || updated_by from schedule_templates where id='${tpl}'`) === before, '…nothing is written')
    sql(`update members set is_you = case when id='${wasYou}' then 1 else 0 end`)

    // ── The phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const q = await phone.newPage()
    await q.goto(`${BASE}/projects/${ben}/schedule`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1000)
    ok(await q.locator('[data-testid="client-sees"]').isVisible(), 'B-41 the phone shows who sees it, under the summary')
    await q.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await q.waitForTimeout(600)
    const dock = await q.locator('[class*="dock"]').filter({ has: q.locator('[data-testid="add-milestone"]') }).first().boundingBox()
    ok(!!dock && dock.y + dock.height >= 844 - 90, `B-44 the Add milestone dock sits at the screen's foot (bottom ${dock ? Math.round(dock.y + dock.height) : '?'} of 844)`)
    await shot('p-ben-bottom', q)
    await q.locator('[data-testid="phone-milestone"]').nth(3).click(); await q.waitForTimeout(900)
    const pp = q.locator('[data-testid="milestone-panel"]')
    ok(await pp.getByLabel('Name').isVisible().catch(() => false) && await q.locator('[data-testid="panel-kebab"]').isVisible(), 'B-41 the phone panel carries the name and a ⋮')
    const over = await pp.evaluate((el) => { let n = el; while (n && n.scrollWidth <= n.clientWidth + 1 && n.parentElement && !/sheet|drawer/i.test(n.className)) n = n.parentElement; return n ? n.scrollWidth - n.clientWidth : 0 })
    ok(over <= 1, `B-42 the panel has no sideways overflow (${over}px)`)
    await shot('p-ben-panel', q)
    await phone.close()

    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' / ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    sql(`update members set is_you = case when id='${wasYou}' then 1 else 0 end`)
    { const [at, until, by] = aishaHold.split('|'); if (at) sql(`update projects set on_hold_at = ${at}, on_hold_until = ${until || 'null'}, on_hold_by = '${by}', on_hold_reason = '${aishaWhy.replace(/'/g, "''")}' where id='${aisha}'`) }   // (gaps build, package A) her hold back
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
