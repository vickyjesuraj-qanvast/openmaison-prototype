// Gaps build B — money in, complete (the owner's "build everything", 2026-10-07; report rows 26-…/4-finance.md, M-04). Each item asserted as
// the rule it builds, never another round's count:
//  1 a VO billed on its own (band when no unsent stage is left, the row menu, Undo) · 2 one-off invoices · 3 description / note on the paper ·
//  4 its own due day · 5 the bell row and the primary action "Send the {stage} invoice" → Money with its Send open · 6 no-login invoice and
//  receipt links (a Draft's and a dead token answer the notice), sent invoices filed in Files › Payments · 7 Omit from the contract, the reason
//  field · 8 money warnings (ready for n days; collection trailing) · 9 a recorded invoice · 10 reminded n× and the age line · 11 remind the
//  approvers once an hour · 12/14 Settings › Projects › Invoice paper printed · 13 a project's own split (+ fee first) · 15 Original → adjusted ·
//  16 a VO from a contractor's quote · phone 390 (no sideways scroll, New ▾ as a sheet, the client's link).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3122 NODE_PATH=<repo>/node_modules node verify-pj-gap-b.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-b')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3122'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const undo = []   // SQL that puts back what the probe changed, run last-first in `finally`
const later = (q) => undo.push(q)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003'), marcus = P('P-2026-004'), shalini = P('P-2025-001')
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const menuItem = (p, re) => p.getByRole('menuitem', { name: re }).first()
  /* (simplify S-07) Needs you shows three rows, the rest behind "Show n more" */
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }

  try {
    as('dane')
    const S = await desk()
    await S.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const s = await page(S, 'studio')

    // ── 2 · 10 — Aisha Rahman's one-off; Benjamin Han's reminders, the age line ─────────────────────────────────────────────────
    console.log('2 · 10 one-off, chasing')
    await go(s, `/projects/${aisha}/money`)
    /* (simplify S-07, a deliberate change of this rule) Other invoices is Billing's "Outside the stages" group; the story and the Invoiced tile are
       the To collect tile's hover */
    const extras = s.locator('[data-testid="money-stages"] [data-kind="extra"]')
    ok(await s.locator('[data-testid="money-extras"]').count() === 1 && /Permit and lift padding fees/.test((await extras.allInnerTexts()).join(' ')) && /One-off · Reimbursement/.test((await extras.allInnerTexts()).join(' ')), '2 Billing’s Outside the stages lists the one-off with its kind and reason')
    /* (simplify round 2, R2-A, a deliberate change of this rule) the tile presses to Billing, so its value is no longer a focus stop of its own — its hover stays */
    await s.locator('[data-testid="tile-collect"] [class*="tileValue"]').first().hover(); await settle(s, 700)
    ok(/outside the contract/.test(await s.locator('[role="tooltip"]').last().innerText().catch(() => '')), '2 To collect’s hover counts it and says it sits outside the contract')
    await s.mouse.move(0, 0)
    await shot(s, 'b00-aisha-money-one-off')
    await go(s, `/projects/${ben}/money`)
    const mid = sql(`select id from project_invoices where project_id='${ben}' and stage_name='Mid-Project'`)
    /* (simplify S-07, a deliberate change of this rule) Invoices sent folded into the stage's row: its Invoice cell's line is "INV · sent · due · late · chased" */
    const midRow = s.locator(`[data-testid="money-stages"] [data-invoice="${mid}"]`)
    ok(/reminded 2×/i.test(await midRow.innerText()), '10 the overdue invoice says how often it was chased (reminded 2×), from its Activity lines')
    ok(/days overdue/.test(await midRow.locator('[data-testid="invoice-age"]').innerText()), '10 … and its age against its due day ("n days overdue")')
    ok(/sent \d+ \w+/.test(await midRow.locator('[data-testid="invoice-sent-age"]').innerText()), '10 … and when it went (how long ago on its hover)')
    await shot(s, 'b01-ben-money-chasing')

    // New ▾ › One-off invoice: made as a Draft, its lines and totals, then gone again
    await s.locator('[data-testid="money-new"]').click()
    await settle(s, 300)
    const rows = await s.getByRole('menuitem').allInnerTexts()
    ok(['Variation order', 'contractor', 'One-off invoice', 'Record an invoice made elsewhere'].every((w) => rows.some((r) => r.includes(w))), '2 · 9 · 16 New ▾ offers a variation order, one from a contractor’s quote, a one-off and a recorded invoice')
    await menuItem(s, /^One-off invoice/).click()
    await settle(s, 500)
    const od = dialog(s)
    ok(await od.locator('[data-testid="oneoff-dialog"]').count() === 1, '2 the one-off dialog opens')
    await od.getByRole('button', { name: /Save as Draft/ }).click()
    await settle(s, 300)
    ok(/Say what the invoice is for/.test(await od.innerText()), '2 a one-off asks what it is for before it saves')
    await od.getByLabel('What it’s for').fill('Extra power points')
    await od.getByRole('radio', { name: 'Upgrade' }).click()
    await od.getByLabel('Description').first().fill('Additional 13A power point')
    await od.getByLabel('Qty').first().fill('3')
    await od.getByLabel('Unit price (S$)').first().fill('80')
    await settle(s, 200)
    ok(/S\$240\.00/.test(await od.locator('[data-testid="oneoff-totals"]').innerText()), '2 its lines total as they are typed')
    await shot(s, 'b02-one-off-dialog', false)
    await od.locator('[data-testid="oneoff-save"]').click()
    await settle(s, 1500)
    const madeId = sql(`select id from project_invoices where project_id='${ben}' and stage_name='Extra power points'`)
    if (madeId) { later(`delete from project_invoices where id='${madeId}'`); later(`delete from lead_events where json_extract(detail,'$.id')='${madeId}'`) }
    ok(!!madeId && sql(`select kind||'|'||status||'|'||reason||'|'||stage_ref from project_invoices where id='${madeId}'`) === `one_off|draft|upgrade|extra:${madeId}`, '2 it is saved as a one-off Draft outside the contract (extra:)')
    const gst = Number(sql(`select gst_minor from project_invoices where id='${madeId}'`) || 0), amt = Number(sql(`select amount_minor from project_invoices where id='${madeId}'`) || 0)
    ok(amt === 24000 + gst && gst === 2160, '2 GST goes on top of the lines at the project’s rate (S$240.00 + S$21.60)')
    ok(await s.locator(`[data-testid="money-stages"] [data-kind="extra"][data-invoice="${madeId}"]`).count() === 1, '2 it shows in Billing’s Outside the stages at once')
    ok(sql(`select count(*) from lead_events where kind='project_invoice_created' and json_extract(detail,'$.id')='${madeId}'`) === '1', '2 it writes its Activity line')
    ok(sql(`select count(*) from project_invoices where project_id='${ben}' and status='draft' and stage_ref not like 'extra:%' and amount_minor <> (select amount_minor from project_invoices x where x.id=project_invoices.id)`) === '0', '2 the stage Drafts are untouched (a one-off is never in the allocation)')

    // ── 6 — the no-login links ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 links without sign-in')
    const oneOff = sql(`select id from project_invoices where project_id='${aisha}' and kind='one_off' and status='sent' limit 1`)
    const tok = sql(`select share_token from project_invoices where id='${oneOff}'`)
    const L = await desk()
    const pub = await page(L, 'public')
    await pub.context().clearCookies()
    await go(pub, `/invoice/${tok}`)
    ok(await pub.locator('[data-testid="public-invoice"]').count() === 1 && /Invoice INV-2026-0\d\d/.test(await pub.locator('h1').first().innerText()), '6 the invoice opens from its link without signing in')
    ok(await pub.locator('[data-testid="invoice-line"]').count() === 2 && /Paid to the town council/.test(await pub.locator('[data-testid="invoice-client-note"]').innerText()), '3 the paper prints the one-off’s lines and its note to the client')
    ok(await pub.locator('[data-testid="public-download"]').count() === 1, '6 … with Download PDF')
    await shot(pub, 'b03-public-invoice')
    const draftTok = sql(`select share_token from project_invoices where project_id='${ben}' and status='draft' and share_token is not null limit 1`)
    await go(pub, `/invoice/${draftTok}`)
    ok(await pub.locator('[data-testid="link-notice"]').count() === 1, '6 a Draft never answers its link — the notice says the link is not active')
    await go(pub, `/invoice/not-a-real-token-at-all`)
    ok(await pub.locator('[data-testid="link-notice"]').count() === 1, '6 a link nobody gave answers the same notice')
    const rtok = sql(`select share_token from project_payments where invoice_id='${oneOff}' limit 1`)
    await go(pub, `/receipt/${rtok}`)
    ok(await pub.locator('[data-testid="public-receipt"]').count() === 1 && /Permit and lift padding fees/.test(await pub.locator('[data-testid="receipt-paper"]').innerText()), '6 the receipt opens from its link, naming the invoice by its own name')
    await shot(pub, 'b04-public-receipt')
    const portalWas = sql(`select value from settings where key='portal'`)
    sql(`update settings set value = json_set(value, '$.paused', json('true')) where key='portal'`)
    later(`update settings set value = '${portalWas.replace(/'/g, "''")}' where key='portal'`)
    await go(pub, `/invoice/${tok}`)
    ok(await pub.locator('[data-testid="public-invoice"]').count() === 1, '6 (Q-40) the link keeps working while the portal is paused')
    await L.close()
    const filed = sql(`select count(*) from project_invoices i join lead_files f on f.id = i.file_id where i.project_id='${ben}' and i.status='sent' and f.name like i.number || ' · %'`)
    const sentN = sql(`select count(*) from project_invoices where project_id='${ben}' and status='sent' and kind <> 'external'`)
    ok(filed === sentN && Number(sentN) > 0, `6 every sent invoice is filed in Files › Payments as "{number} · {stage}.pdf" (${filed}/${sentN})`)
    const fileId = sql(`select file_id from project_invoices where id='${oneOff}'`)
    await s.goto(`${BASE}/projects/${aisha}/files/${fileId}`, { waitUntil: 'networkidle' })
    ok(new RegExp(`/projects/${aisha}/invoices/${oneOff}`).test(s.url()), '6 its Files entry opens the invoice itself')

    // ── 4 · 3 — a Draft's description, note and due day ─────────────────────────────────────────────────────────────────────────
    console.log('3 · 4 a Draft’s details')
    const comp = sql(`select id from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`)
    later(`update project_invoices set description=null, client_note=null, due_mode=null, due_on=null where id='${comp}'`)
    later(`delete from lead_events where kind='project_invoice_details' and json_extract(detail,'$.id')='${comp}'`)
    await go(s, `/projects/${ben}/money`)
    await s.locator(`[data-testid="money-stages"] [data-invoice="${comp}"] button[aria-haspopup="menu"]`).last().click()
    await settle(s, 300)
    await menuItem(s, /Description, note and due day/).click()
    await settle(s, 500)
    const dd = dialog(s)
    await dd.getByLabel('Description (optional)').fill('Handover clean and the defect list closed')
    await dd.getByLabel('Note to the client (optional)').fill('Thank you for having us.')
    await dd.locator('[data-testid="details-save"]').click()
    await settle(s, 1500)
    ok(sql(`select description||'|'||client_note from project_invoices where id='${comp}'`) === 'Handover clean and the defect list closed|Thank you for having us.', '3 the Draft keeps its description and its note to the client')
    await go(s, `/projects/${ben}/invoices/${comp}`)
    ok(/Handover clean/.test(await s.locator('[data-testid="invoice-description"]').innerText()) && /Thank you for having us/.test(await s.locator('[data-testid="invoice-client-note"]').innerText()), '3 … and the paper prints both')
    sql(`update project_invoices set due_mode='date', due_on=strftime('%s','now','+20 days') where id='${comp}'`)
    await go(s, `/projects/${ben}/invoices/${comp}`)
    const dueTxt = await s.locator('[data-testid="invoice-due"]').innerText()
    const want = new Date(Date.now() + 20 * 86_400_000)
    ok(new RegExp(`^${want.getDate()} `).test(dueTxt.trim()), `4 a Draft due on a day picked prints that day (${dueTxt.trim()})`)

    // ── 15 — Original → adjusted ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('15 original → adjusted')
    const ryanMid = sql(`select id from project_invoices where project_id='${ryan}' and stage_name='Mid-Project' and status='draft'`)
    await go(s, `/projects/${ryan}/invoices/${ryanMid}`)
    const adj = await s.locator('[data-testid="invoice-adjusted"]').innerText().catch(() => '')
    ok(/Original S\$23,370\.04 → adjusted S\$25,097\.69 after VO-1/.test(adj), `15 a Draft a VO re-sized prints "Original → adjusted after VO-1" (${adj})`)
    await shot(s, 'b05-original-adjusted')

    // ── 9 — Ryan: the recorded invoice; record one more and take it back ─────────────────────────────────────────────────────────
    console.log('9 recorded invoices')
    await go(s, `/projects/${ryan}/money`)
    { const out = (await s.locator('[data-testid="money-stages"] [data-kind="extra"]').allInnerTexts()).join(' ')
      ok(/XR-1042/.test(out) && /Recorded/.test(out), '9 the recorded invoice shows with its own number, marked Recorded (Billing › Outside the stages)') }
    await s.locator('[data-testid="money-new"]').click(); await settle(s, 300)
    await menuItem(s, /Record an invoice made elsewhere/).click(); await settle(s, 500)
    const ed = dialog(s)
    await ed.getByLabel('Its invoice number').fill('XR-2001')
    await ed.getByLabel('Amount, GST included (S$)').fill('500')
    await ed.locator('[data-testid="external-save"]').click()
    await settle(s, 1500)
    const ext = sql(`select id from project_invoices where external_ref='XR-2001'`)
    ok(!!ext && sql(`select kind||'|'||status||'|'||coalesce(number,'none')||'|'||stage_ref from project_invoices where id='${ext}'`) === `external|sent|none|extra:${ext}`, '9 it is recorded as sent, with no number of ours, outside the schedule')
    ok(/XR-2001 recorded/.test(await snack(s).innerText()), '9 the snackbar says so, with Undo')
    await snack(s).getByRole('button', { name: 'Undo' }).click()
    await settle(s, 1500)
    ok(sql(`select count(*) from project_invoices where external_ref='XR-2001'`) === '0', '9 Undo takes the record back')
    if (ext) later(`delete from project_invoices where id='${ext}'`)

    // ── 1 — a VO approved after every stage went: the band, Bill it, Undo ────────────────────────────────────────────────────────
    console.log('1 bill a VO on its own')
    const ryanDrafts = sql(`select id from project_invoices where project_id='${ryan}' and status='draft' and kind='stage'`).split('\n').filter(Boolean)
    await go(s, `/projects/${ryan}/money`)
    const vo1 = s.locator('[data-vo="VO-1"]')
    await vo1.locator('button[aria-haspopup="menu"]').click(); await settle(s, 300)
    ok(await menuItem(s, /Bill VO-1 on its own/).count() === 1 && /carry it now/.test(await menuItem(s, /Bill VO-1 on its own/).innerText()), '1 with unsent stages left, the VO’s menu offers Bill on its own — saying the stages carry it now')
    await s.keyboard.press('Escape')
    ryanDrafts.forEach((id, k) => { sql(`update project_invoices set status='sent', number='INV-2026-99${k}', sent_at=strftime('%s','now'), due_at=strftime('%s','now','+7 days') where id='${id}'`); later(`update project_invoices set status='draft', number=null, sent_at=null, due_at=null where id='${id}'`) })
    await go(s, `/projects/${ryan}/money`); await allNeeds(s)
    const band = s.locator('[data-testid="money-unbilled-vo"]')
    ok(await band.count() === 1 && /VO-1/.test(await band.innerText()), '1 every stage sent: a Needs you row says VO-1 has no unsent invoice left to carry it')
    ok(/bill it now, not with the next stage/.test(await band.innerText()), '1 … and says what to do (simplify S-07: the story sentence is gone)')
    await shot(s, 'b06-vo-unbilled-band')
    await band.getByRole('button', { name: /Bill VO-1/ }).click()
    await settle(s, 1500)
    const bill = sql(`select id from project_invoices where project_id='${ryan}' and kind='variation' and status='draft'`)
    if (bill) later(`delete from project_invoices where id='${bill}'`), later(`delete from lead_events where json_extract(detail,'$.id')='${bill}'`)
    ok(!!bill && sql(`select amount_minor from project_invoices where id='${bill}'`) === sql(`select amount_minor from quotes where project_id='${ryan}' and number='VO-1'`), '1 Bill makes a Draft for the order’s own total')
    ok(/Outside the stages/.test(await snack(s).innerText()), '1 the snackbar says where to send it from, with Undo')   // (simplify S-07) Billing's group
    await snack(s).getByRole('button', { name: 'Undo' }).click()
    await settle(s, 1500)
    ok(sql(`select count(*) from project_invoices where project_id='${ryan}' and kind='variation' and status <> 'void'`) === '0', '1 Undo takes the Draft back')
    while (undo.length && /status='draft', number=null/.test(undo[undo.length - 1])) sql(undo.pop())
    await go(s, `/projects/${shalini}/money`)
    ok(/Billed · INV-2026-0\d\d/.test(await s.locator('[data-vo="VO-1"]').innerText()), '1 Shalini’s VO-1 says it was billed on its own, and by which invoice')

    // ── 5 — the bell row and the primary action ──────────────────────────────────────────────────────────────────────────────────
    console.log('5 offered when its milestone is done')
    /* (gaps build A, M-01) R78 put Aisha's project on hold, and a held project's one action is Resume (A's rule, first); the invoice is offered
       on a running project — take the hold off for these checks and put it back last */
    {
      const h = sql(`select coalesce(on_hold_at,'') || '|' || coalesce(on_hold_reason,'') || '|' || coalesce(on_hold_until,'') || '|' || coalesce(on_hold_by,'') from projects where id='${aisha}'`).split('|')
      if (h[0]) {
        const q = (v) => (v === '' ? 'null' : `'${v.replace(/'/g, "''")}'`)
        later(`update projects set on_hold_at = ${q(h[0])}, on_hold_reason = ${q(h[1])}, on_hold_until = ${q(h[2])}, on_hold_by = ${q(h[3])} where id='${aisha}'`)
        sql(`update projects set on_hold_at = null, on_hold_reason = null, on_hold_until = null, on_hold_by = null where id='${aisha}'`)
      }
    }
    await go(s, `/projects/${aisha}`)
    const primary = await s.locator('[data-testid="project-primary"]').innerText().catch(() => '')
    ok(/Send the Commencement invoice/.test(primary), `5 a stage ready to bill is the project’s one filled action (${primary.trim()})`)
    await s.locator('[data-testid="project-primary"] button').click()
    await s.waitForURL(/\/money/, { timeout: 8000 }).catch(() => {})
    await settle(s, 2000)
    ok(/Send the Commencement invoice/.test(await dialog(s).innerText().catch(() => '')), '5 … and opens Money with that invoice’s Send')
    await shot(s, 'b07-primary-send-open', false)
    await s.keyboard.press('Escape')
    as('michelle')
    await go(s, `/projects/${aisha}`)
    await s.locator('[data-notifications-tile]').first().click().catch(() => {})
    await settle(s, 1500)
    await s.locator('[data-testid="notifications-panel"]').getByRole('tab', { name: /Due/ }).click().catch(() => {})
    await settle(s, 600)
    const feed = await s.locator('[data-testid="notifications-panel"]').innerText().catch(() => '')
    ok(/Commencement invoice is ready to send/.test(feed), '5 the team’s bell carries "Commencement invoice is ready to send"')
    await shot(s, 'b08-bell-ready', false)
    as('dane')

    // ── 8 — money warnings ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 warnings')
    await go(s, `/projects/${aisha}/money`); await allNeeds(s)
    /* (simplify S-07 · P3 §6.8, a deliberate change of this rule) one readiness rule: a ready invoice is a Needs you row from its first day */
    ok(/The Commencement invoice is ready to send/.test(await s.locator('[data-testid="money-ready-days"]').innerText().catch(() => '')) && /ready (\d+ days?|today)/.test(await s.locator('[data-testid="money-ready-days"]').innerText().catch(() => '')), '8 Money: "The Commencement invoice is ready to send · ready n days"')
    await go(s, `/projects`)
    ok(/Commencement invoice ready (for \d+ days?|to send)/.test(await s.locator('body').innerText()), '8 the listing raises it as a Needs attention reason')   // (simplify P3 §6.8, a deliberate change of this rule) from day one; dayWords
    const allMs = sql(`select id||':'||status from project_milestones where project_id='${ben}' and deleted_at is null`).split('\n').filter(Boolean)
    allMs.forEach((x) => { const [id, st] = x.split(':'); later(`update project_milestones set status='${st}' where id='${id}'`) })
    sql(`update project_milestones set status='done' where project_id='${ben}' and deleted_at is null`)
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    /* (simplify S-07) one fact once: with a stage ready, the trail rides on its row; with nothing to send, it is its own row (Remind) */
    ok(/trailing the work by \d+%/i.test(await s.locator('[data-testid="money-needs"]').innerText().catch(() => '')), '8 the schedule done far ahead of what is collected: "collection is trailing the work by n%"')
    await shot(s, 'b09-collection-trailing')
    while (undo.length && /project_milestones set status/.test(undo[undo.length - 1])) sql(undo.pop())

    // ── 11 — remind the approvers ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 remind the approvers')
    sql(`update project_invoices set submitted_by='germaine', submitted_at=strftime('%s','now','-2 hours') where id='${comp}'`)
    later(`update project_invoices set submitted_by=null, submitted_at=null where id='${comp}'`)
    later(`delete from lead_events where kind='project_invoice_approver_reminded'`)
    later(`delete from notifications where kind='invoice_review' and title like '%is waiting for your approval%'`)
    as('germaine')
    await go(s, `/projects/${ben}/money`)
    /* (simplify S-07 · S-04, a deliberate change of this rule) a submission waits on the approvers, so it is no Needs you row of the submitter's:
       Remind the approvers sits in the row's ⋮ (and the invoice's panel), once an hour per person */
    const compMenu = () => s.locator(`[data-testid="money-stages"] [data-invoice="${comp}"] button[aria-haspopup="menu"]`).last()
    await compMenu().click(); await settle(s, 300)
    const rb = menuItem(s, /Remind the approvers/)
    ok(await rb.count() === 1, '11 the submitter finds Remind the approvers in the waiting invoice’s ⋮')
    await rb.click(); await settle(s, 1500)
    ok(sql(`select count(*) from notifications where kind='invoice_review' and title like 'Germaine is waiting for your approval'`) !== '0', '11 Owners and Admins hear it again on their bell')
    await go(s, `/projects/${ben}/money`)
    await compMenu().click(); await settle(s, 300)
    ok(await menuItem(s, /Remind the approvers/).getAttribute('aria-disabled') === 'true', '11 once an hour per person: the row rests and says when again')
    await s.keyboard.press('Escape')
    as('dane')

    // ── 13 — Marcus: the project's own split, and fee first ──────────────────────────────────────────────────────────────────────
    console.log('13 a project’s own split')
    const splitBefore = sql(`select payment_template from projects where id='${marcus}'`)
    later(`update projects set payment_template='${splitBefore.replace(/'/g, "''")}' where id='${marcus}'`)
    await go(s, `/projects/${marcus}/money`)
    await s.locator('[data-testid="money-change-split"]').click(); await settle(s, 500)
    const sd = dialog(s)
    ok(await sd.locator('[data-testid="split-row"]').count() === 4, '13 Change the split opens the split agreed, stage by stage')
    /* (simplify round 2, R2-A — P3 §6.7, a deliberate change of this rule) fee first always shows — at rest while the studio's rule is off */
    ok(await sd.locator('[data-testid="split-fee-first"]').count() === 1 && await sd.getByLabel('The first stage is a fixed amount').isDisabled() && /Settings › Finance › Invoices/.test(await sd.locator('[data-testid="split-fee-first"]').innerText()), '13 with fee first off, its switch rests in the split, its help naming where it is switched on')
    await sd.locator('[data-testid="split-row"]').nth(0).getByLabel('Share (%)').fill('20')
    await sd.locator('[data-testid="split-save"]').click(); await settle(s, 500)
    ok(/add up to 110%/.test(await sd.locator('[data-testid="split-error"]').innerText().catch(() => '')), '13 shares that do not make 100% are refused, in the house words')
    await sd.locator('[data-testid="split-row"]').nth(1).getByLabel('Share (%)').fill('20')
    await shot(s, 'b10-split-dialog', false)
    await sd.locator('[data-testid="split-save"]').click(); await settle(s, 1800)
    ok(/"pct":20/.test(sql(`select payment_template from projects where id='${marcus}'`)), '13 the new split is saved')
    ok(sql(`select amount_minor from project_invoices where project_id='${marcus}' and stage_name='Deposit' and status='draft'`) === '972000', '13 … and the stage Drafts are made again from it (Deposit 20% of S$48,600)')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select amount_minor from project_invoices where project_id='${marcus}' and stage_name='Deposit' and status='draft'`) === '486000', '13 Undo puts the split and its Drafts back')
    sql(`insert into settings (key, value, updated_at) values ('project_invoices', '{"approval":true,"termsDays":7,"feeFirst":true}', strftime('%s','now')) on conflict(key) do update set value=excluded.value`)
    later(`delete from settings where key='project_invoices'`)
    await go(s, `/projects/${marcus}/money`)
    await s.locator('[data-testid="money-change-split"]').click(); await settle(s, 500)
    ok(await dialog(s).getByLabel('The first stage is a fixed amount').count() === 1 && await dialog(s).getByLabel('The first stage is a fixed amount').isEnabled(), '13 with fee first on, the split may open with a fixed amount')
    await s.keyboard.press('Escape')
    await go(s, `/projects/${ben}/money`)
    ok(await s.locator('[data-testid="money-change-split"]').count() === 0, '13 a project billed from a signed quote offers no split of its own (F-03)')

    // ── 14 — Settings › Projects › Invoice paper, printed ────────────────────────────────────────────────────────────────────────
    console.log('14 the studio’s invoice paper')
    later(`delete from settings where key='invoice_paper'`)
    /* (simplify S-15, a deliberate change of this rule) the money cards' one home is Settings › Finance (an old #invoice-paper link lands there) */
    await go(s, `/settings?section=finance`)
    const card = s.locator('[data-testid="invoice-paper-settings"]')
    ok(await card.count() === 1, '14 Settings › Finance has the Invoice paper card')
    await card.getByLabel('Header note').fill('Thank you for renovating with us.')
    await card.getByLabel('Terms', { exact: true }).fill('Payment by bank transfer or PayNow within the terms.')
    await card.locator('[data-testid="invoice-paper-save"]').click(); await settle(s, 1500)
    ok(/Thank you for renovating/.test(sql(`select value from settings where key='invoice_paper'`)), '14 it is saved')
    await go(s, `/projects/${ben}/invoices/${mid}`)
    ok(/Thank you for renovating/.test(await s.locator('[data-testid="invoice-header-note"]').innerText().catch(() => '')) && /within the terms/.test(await s.locator('[data-testid="invoice-terms"]').innerText().catch(() => '')), '14 the invoice prints its header note and terms block')
    await shot(s, 'b11-paper-printed')
    /* (simplify S-15) the per-entity prefixes ride under Invoices on Finance's Document numbers — still from the second entity on */
    await go(s, `/settings?section=finance`)
    ok(await s.locator('[data-testid="document-numbers"]').count() === 1 && await s.locator('[data-testid="invoice-entity-numbers"]').count() === 0, '12 one issuing entity: no per-entity prefixes on Document numbers (they show from the second)')

    // ── 7 — a VO's omissions and its reason ──────────────────────────────────────────────────────────────────────────────────────
    console.log('7 omit from the contract')
    const aVo = sql(`select id from quotes where project_id='${aisha}' and number='VO-1'`)
    const aVoAmt = sql(`select amount_minor from quotes where id='${aVo}'`)
    later(`update quotes set amount_minor=${aVoAmt}, change_reason=null where id='${aVo}'`)
    later(`delete from quote_items where quote_id='${aVo}' and (omits_id is not null or name='Omitted from the contract')`)
    await go(s, `/quotes/${aVo}`)
    await s.getByRole('button', { name: /^Create/ }).first().click(); await settle(s, 300)
    await menuItem(s, /Omit from the contract/).click(); await settle(s, 1500)
    const om = s.locator('[data-testid="omit-dialog"]')
    ok(await om.locator('[data-testid="omit-line"]').count() > 3, '7 the picker lists the signed quote’s lines')
    await shot(s, 'b12-omit-dialog', false)
    await om.locator('[data-testid="omit-line"]').nth(0).click()
    await s.locator('[data-testid="omit-add"]').click(); await settle(s, 2500)
    ok(sql(`select count(*) from quote_items where quote_id='${aVo}' and omits_id is not null and qty < 0`) === '1', '7 the ticked line lands as a credit (a minus quantity) on the order')
    ok(Number(sql(`select amount_minor from quotes where id='${aVo}'`)) < Number(aVoAmt), '7 … and the order’s change to the contract falls by it')
    const reason = s.getByLabel('Reason for the change')
    await reason.fill('Study wall kept as it is')
    await s.getByLabel(/^Title/).first().click(); await settle(s, 1200)
    ok(sql(`select change_reason from quotes where id='${aVo}'`) === 'Study wall kept as it is', '7 the reason for the change is saved as the field is left')
    await go(s, `/quotes/${aVo}/preview`)
    ok(/Study wall kept as it is/.test(await s.locator('body').innerText()), '7 … and prints on the variation order')

    // ── 16 — a VO from a contractor's quote ──────────────────────────────────────────────────────────────────────────────────────
    console.log('16 a VO from a contractor’s quote')
    const csv = path.join(os.tmpdir(), `vo-${Date.now()}.csv`)
    fs.writeFileSync(csv, 'Item,Qty,Unit,Rate\nAdditional power point,4,pcs,85\nCove light along the ceiling,12,m,45\n')
    await go(s, `/projects/${ben}/money`)
    await s.locator('[data-testid="money-new"]').click(); await settle(s, 300)
    await menuItem(s, /contractor/).click(); await settle(s, 500)
    await s.locator('[data-testid="vo-upload-dialog"] input[type="file"]').setInputFiles(csv)
    await settle(s, 1500)
    ok(/2 lines/.test(await s.locator('[data-testid="vo-upload-read"]').innerText().catch(() => '')), '16 the contractor’s sheet is read, its lines shown')
    await s.locator('[data-testid="vo-upload-make"]').click()
    await s.waitForURL(/\/quotes\//, { timeout: 10000 }).catch(() => {})
    const newVo = sql(`select id from quotes where project_id='${ben}' and kind='variation' order by created_at desc limit 1`)
    if (newVo) { later(`delete from quotes where id='${newVo}'`); later(`delete from quote_items where quote_id='${newVo}'`); later(`delete from lead_events where json_extract(detail,'$.id')='${newVo}'`) }
    ok(!!newVo && sql(`select count(*) from quote_items where quote_id='${newVo}' and kind='item'`) === '2' && /\/quotes\//.test(s.url()), '16 a variation order is made with the lines and opens in the editor')
    ok(Number(sql(`select amount_minor from quotes where id='${newVo}'`)) > 0, '16 … its total counted from them')
    await s.close(); await S.close()

    // ── phone 390 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('phone 390')
    const Ph = await phoneCtx()
    const ph = await page(Ph, 'phone')
    await go(ph, `/projects/${ben}/money`)
    ok(await overflow(ph) <= 0, '390 Money has no sideways scroll')
    await ph.locator('[data-testid="money-new"]').click(); await settle(ph, 600)
    ok(await ph.getByRole('menuitem', { name: /One-off invoice/ }).count() === 1, '390 New ▾ opens as a sheet with its rows')
    await shot(ph, 'b13-phone-new-sheet', false)
    await ph.getByRole('menuitem', { name: /One-off invoice/ }).click(); await settle(ph, 700)
    ok(await overflow(ph) <= 0 && await ph.locator('[data-testid="oneoff-dialog"]').count() === 1, '390 the one-off dialog fits the phone')
    await shot(ph, 'b14-phone-one-off', false)
    await ph.keyboard.press('Escape')
    await go(ph, `/invoice/${tok}`)
    ok(await overflow(ph) <= 0, '390 the client’s invoice link has no sideways scroll')
    await shot(ph, 'b15-phone-public-invoice')
    await Ph.close()

    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 300))
  } finally {
    for (const q of undo.reverse()) { try { sql(q) } catch (e) { console.log('  (undo failed)', q.slice(0, 80)) } }
    as('dane')
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
