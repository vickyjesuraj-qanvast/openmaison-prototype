// S44O · Money rules, sign-in phones, the email and a Marketing role — the UAT comments, rows 246–364 (Vicky 2026-10-15: "fix all the UAT
// comments based on our 2.0 experience … If you have any questions please go ahead based on your recommendations"; triage
// design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md, area O, §7 M15 · M18, §10 C3 · C6 · C10, §12.13). Each item
// asserted as the rule it builds:
//  1 · row 297: a fixed design fee first is carried — the Start sheet's "Payments follow …" names it at its amount, Duplicate project keeps it
//      on the copy's split, Apply defaults keeps it (and its own word) ahead of the template's shares.
//  2 · row 344 (+ §12.13): Company › Members › Add member refuses a landline when the phone is the member's only sign-in key, in the house
//      message; with an email beside it the landline is just their number.
//  3 · row 360: Settings › Finance › Money in › "Variation orders are billed: Spread over the stages · On their own, up front" — Spread by
//      default; On their own: an approval on the client's link drafts the order's own invoice at once.
//  4 · rows 314 · 337 (M15, C10): the email draws the studio's logo from a hosted PNG copy with width and height attributes inside 160 × 48;
//      the copy is served to anyone (a mail app is signed out).
//  5 · call C3: GST is rounded once per rate on a quote not yet sent; a quote stamped 'line' keeps per-line rounding; the first send stamps the
//      rule; net + GST = total.
//  6 · call C6: the Marketing role — the lead desk's pages, gates with their own words on every other, no quote money in what the browser gets,
//      Quote Sent / Won refused with the rule, Reports › Leads, Settings › Lead management alone and theirs to change, Integrations without Xero,
//      ⌘K's lead scopes, the phone dock; Members, Who may do what and the cost card name the role; Accounting's gate unchanged.
//  7 · no page errors; no sideways scroll at 390 / 320.
// Run against `next start` (with OPENMAISON_DEV_PREVIEWS=1 for §4) on a scratch copy of the repaired demo DB — never local.db. Everything it
// writes is put back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s44o.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44o')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const esc = (s) => s.replace(/'/g, "''")
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

/* the demo's records (fixed ids) */
const P4 = '9ede8f84-c88f-497e-a172-8f92679e5059'                                  // P-2026-004 · Marcus (direct) · Setting up, no schedule
const P1 = 'e920e218-7c5b-4ff9-a27b-e62d73c99367'                                  // P-2026-001 · Ryan · In progress
const VO2 = 'bb630242-020c-406b-a5cf-5004b10f2c6b'                                 // Ryan's VO-2 · Sent to Client (declined on record)
const Q1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'                                  // OM-10001 · Draft · Olivia Martinez
const Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'                                  // OM-10007 · Sent to Client (stamped 'line', R163)
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'
const DEFAULT_TPL = sql(`select id from quote_templates where is_default = 1 and status = 'published' and deleted_at is null`)
const PROBE_Q = 'probe-s44o-quote'
const FEE_SPLIT = '{"template":null,"rows":[{"name":"Design fee","pct":0,"fixedMinor":300000},{"name":"Deposit","pct":10},{"name":"Commencement","pct":40},{"name":"Completion","pct":50}]}'

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* ── what the probe changes, kept to put back ── */
  const you0 = sql(`select id from members where is_you = 1`)
  const split0 = sql(`select quote(payment_template) from projects where id = '${P4}'`)
  const pCols = 'id, quote_id, position, name, description, pct, due_kind, due_at, fixed_minor, fixed_label, created_at, updated_at'
  const q1Pays = sql(`select ${pCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quote_payments where quote_id = '${Q1}' order by position`).split('\n').filter(Boolean)
  const qCols = 'valid_until, gst_enabled, client_signature_required, terms_html, notes_html, items_columns, items_view, updated_at, amount_minor'
  const keepQ = (id) => sql(`select ${qCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quotes where id = '${id}'`)
  const putQ = (id, row) => { const v = row.split('§'); sql(`update quotes set ${qCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const q1Kept = keepQ(Q1)
  const voCols = 'status, confirmed_at, confirmed_by, confirmed_via, confirmed_marked_by, declined_at, declined_note, declined_by, client_sent_at, sent_at, updated_at, prepared_json, gst_rule, visibility'
  const voKept = sql(`select ${voCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quotes where id = '${VO2}'`)
  const putVo = () => { const v = voKept.split('§'); sql(`update quotes set ${voCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${VO2}'`) }
  const invKept = sql(`select id || '§' || amount_minor || '§' || gst_minor from project_invoices where project_id = '${P1}'`).split('\n').filter(Boolean)
  /* every studio setting as it was — the VO rule, the lead sources, the email logo's copy, the project numbers a duplicate takes */
  const settings0 = sql(`select quote(key) || '§' || quote(value) || '§' || quote(updated_at) from settings`).split('\n').filter(Boolean)
  const trail = ['projects', 'leads', 'lead_assignees', 'questions', 'lead_events', 'notifications', 'notification_outbox', 'project_invoices', 'project_milestones', 'lead_tasks', 'task_assignees', 'lead_notes', 'members', 'studio_invitations', 'studio_member_credit_caps', 'quotes', 'quote_items', 'quote_payments', 'quote_versions', 'maison_questions']
  const ids = (t) => new Set(sql(`select rowid from ${t}`).split('\n').filter(Boolean))   // rowid: every table has one, whatever its key
  const trail0 = Object.fromEntries(trail.map((t) => [t, ids(t)]))

  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (p, sel = 'body') => (await p.locator(sel).first().innerText().catch(() => '')).replace(/\s+/g, ' ')

  try {
    as('dane')
    const ctx = await desk(); await stubWa(ctx)
    const p = await page(ctx, 'desk')

    // ── 1 · a fixed design fee is carried (row 297) ─────────────────────────────────────────────────────────────────────────────────
    console.log('1 · A fixed design fee first is carried — the Start sheet, Duplicate project, Apply defaults (row 297)')
    sql(`update projects set payment_template = '${esc(FEE_SPLIT)}' where id = '${P4}'`)
    await go(p, `/projects/${P4}/schedule`); await settle(p, 800)
    const start = await text(p, '[data-testid="start-schedule"]')
    ok(/Payments follow the agreed split: S\$3,000 design fee, 10% deposit, 40% commencement, 50% completion\./.test(start), `the Start card names the fixed fee at its amount ("${(start.match(/Payments follow[^.]*\./) || [''])[0]}")`)
    await shot(p, 'pm2-s44o-start-fee-1440')
    /* Duplicate project keeps the fee on the copy's split */
    await go(p, `/projects/${P4}`)
    await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: 'Duplicate project' }).click(); await settle(p, 1200)
    await p.getByTestId('duplicate-save').click(); await settle(p, 3500)
    const copy = sql(`select payment_template from projects where rowid not in (${[...trail0.projects].join(',') || '0'}) order by created_at desc limit 1`)
    ok(/"fixedMinor":300000/.test(copy) && /"name":"Design fee","pct":0/.test(copy), `Duplicate project: the copy's split opens with the S$3,000 design fee (${copy.slice(0, 80)}…)`)
    /* Apply defaults keeps the quote's fixed fee — and its word — ahead of the template's shares */
    const firstPay = q1Pays[0].split('§')[0]
    sql(`update quote_payments set fixed_minor = 300000, fixed_label = 'Design Fee', pct = 0, name = 'Design fee' where id = ${firstPay}`)
    await go(p, `/quotes/${Q1}?apply=${DEFAULT_TPL}`); await settle(p, 1500)
    const applyBtn = p.getByRole('button', { name: 'Apply defaults', exact: true })
    ok(await applyBtn.count() > 0, 'the editor asks before taking the template’s defaults')
    await applyBtn.first().click(); await settle(p, 2500)
    const after = sql(`select name || '|' || pct || '|' || coalesce(fixed_minor, '') || '|' || coalesce(fixed_label, '') from quote_payments where quote_id = '${Q1}' order by position`).split('\n')
    ok(after[0] === 'Design fee|0.0|300000|Design Fee' && /^Deposit\|10/.test(after[1] || '') && after.length === 5, `Apply defaults: the fee stays first with its word, the template's 10/30/30/30 shares after it (${after.join(' · ')})`)
    sql(`delete from quote_payments where quote_id = '${Q1}'`)
    for (const r of q1Pays) sql(`insert into quote_payments (${pCols}) values (${r.split('§').join(', ')})`)
    putQ(Q1, q1Kept)

    // ── 2 · a mobile when the phone is the only sign-in key (row 344) ─────────────────────────────────────────────────────────────
    console.log('2 · Company › Members: a landline as the only sign-in key is refused (row 344)')
    await go(p, '/company/members')
    await p.getByRole('button', { name: 'Add member' }).first().click(); await settle(p, 500)
    const add = p.getByRole('dialog', { name: 'Add member' })
    await add.getByRole('textbox', { name: 'Name' }).fill('Probe Landline')
    await add.getByRole('textbox', { name: 'Phone' }).fill('6123 4567')
    await add.getByRole('button', { name: 'Add member' }).click(); await settle(p, 800)
    const addText = await text(p, '[role="dialog"]')
    ok(/Enter a mobile number \(8 or 9 first\) — the sign-in code goes there/.test(addText) && !sql(`select id from members where name = 'Probe Landline'`), 'a landline with no email: the house message under Phone, nobody added')
    await shot(p, 'pm2-s44o-landline-1440')
    await add.getByRole('textbox', { name: 'Email' }).fill('probe.landline@example.com'); await settle(p, 300)
    await add.getByRole('button', { name: 'Add member' }).click(); await settle(p, 1800)
    ok(!!sql(`select id from members where name = 'Probe Landline' and phone = '61234567'`), 'with an email beside it the landline is just their number — the member is added')

    // ── 3 · how a variation order is billed (row 360) ───────────────────────────────────────────────────────────────────────────
    console.log('3 · Settings › Finance › Money in: Variation orders are billed (row 360)')
    await go(p, '/settings?section=finance')
    const grp = p.getByTestId('invoice-vo-billing')
    ok(await grp.getByRole('radio', { name: 'Spread over the stages' }).getAttribute('aria-checked') === 'true', 'Spread over the stages by default — today’s rule')
    ok(/joins the stage invoices not sent yet/.test(await text(p, '[data-testid="invoice-vo-billing-help"]')), '…its line says what it does')
    await grp.getByRole('radio', { name: 'On their own, up front' }).click(); await settle(p, 1200)
    ok(/now get their own invoice, up front/.test(await snackText(p)) && /"voBilling":"own"/.test(sql(`select value from settings where key = 'project_invoices'`)), 'On their own, up front: saved as picked, said in one sentence')
    await shot(p, 'pm2-s44o-vo-billing-1440')
    sql(`update quotes set declined_at = NULL, declined_note = NULL, declined_by = NULL where id = '${VO2}'`)
    const token = sql(`select confirm_token from quotes where id = '${VO2}'`)
    const client = await desk(); const cp = await page(client, 'client')
    await go(cp, `/confirm/${token}`)
    await cp.getByRole('textbox', { name: 'Your full name' }).fill('Ryan D’Souza')
    await cp.getByRole('button', { name: 'Approve the changes' }).click(); await settle(cp, 2500)
    const own = sql(`select status || '|' || amount_minor || '|' || kind from project_invoices where project_id = '${P1}' and stage_ref = 'vo:${VO2}'`)
    ok(own === 'draft|113360|variation', `approved on the client's link: VO-2's own invoice is a Draft for its whole S$1,133.60 at once (${own || 'none'})`)
    await client.close()

    // ── 4 · the email's logo (rows 314 · 337, M15) ─────────────────────────────────────────────────────────────────────────────────
    console.log('4 · The notification email draws a hosted PNG logo with its own size (rows 314 · 337)')
    const row = sql(`select id from notification_outbox where channel = 'email' order by created_at desc limit 1`)
    const html = await (await p.request.get(`${BASE}/api/dev/email-preview?id=${row}`)).text()
    const img = (html.match(/<img [^>]*>/) || [''])[0]
    ok(/width="48" height="48"/.test(img) && /style="display:block;width:48px;height:48px/.test(img), `the logo carries width and height attributes from its ratio inside 160 × 48 (${img.slice(0, 160)})`)
    const src = (img.match(/src="([^"]+)"/) || [])[1] || ''
    ok(/\/files\/email-logo\?v=[0-9a-f]{16}$/.test(src), `…drawn from the hosted copy, its fingerprint in the address (${src})`)
    const anon = await b.newContext()
    const res = await anon.request.get(BASE + src.replace(/^https?:\/\/[^/]+/, ''))
    const png = await res.body()
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20)
    ok(res.status() === 200 && res.headers()['content-type'] === 'image/png' && w === 96 && h === 96, `a signed-out mail app fetches the PNG copy, at twice the drawn size (${res.status()} ${res.headers()['content-type']} ${w}×${h})`)
    await anon.close()

    // ── 5 · GST rounded once per rate; a sent quote keeps its rule (call C3) ────────────────────────────────────────────────────────
    console.log('5 · GST once per rate on a quote not yet sent; the rule stamped at its first send (call C3)')
    execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "create temp table t as select * from quotes where id = '${Q1}'; update t set id = '${PROBE_Q}', number = 'OM-PROBE44', title = 'Probe GST', status = 'Draft', amount_minor = 343, gst_rule = NULL, gst_enabled = 1, additional_discount_value = 0, discounts_json = NULL, confirm_token = 'probe-s44o-confirm', view_token = NULL, client_sent_at = NULL, sent_at = NULL, prepared_json = NULL, template_id = NULL, template_version = NULL; insert into quotes select * from t;"`)
    const now = Math.floor(Date.now() / 1000)
    for (let i = 0; i < 3; i++) sql(`insert into quote_items (id, quote_id, parent_id, kind, position, name, status, qty, cost_minor, markup_minor, discount_pct, gst_pct, visibility, collapsed, created_at, updated_at) values ('probe-s44o-line-${i}', '${PROBE_Q}', NULL, 'item', ${i}, 'Probe line ${i + 1}', 'Pending', 1, 105, 0, 0, 9, 'visible', 0, ${now}, ${now})`)
    for (const [i, r] of q1Pays.entries()) { const v = r.split('§'); v[0] = `'probe-s44o-pay-${i}'`; v[1] = `'${PROBE_Q}'`; sql(`insert into quote_payments (${pCols}) values (${v.join(', ')})`) }
    await go(p, `/quotes/${PROBE_Q}`); await settle(p, 1500)
    const totals = await text(p, '[data-testid="quote-totals"]')
    ok(/S\$0\.28/.test(totals) && /S\$3\.43/.test(totals) && !/S\$0\.27/.test(totals), `three S$1.05 lines at 9%: GST S$0.28 — 9% of S$3.15 once, not three roundings of S$0.0945 (S$0.27); total S$3.43 (${totals.slice(0, 160)})`)
    await shot(p, 'pm2-s44o-gst-rate-1440')
    sql(`update quotes set gst_rule = 'line' where id = '${PROBE_Q}'`)
    await go(p, `/quotes/${PROBE_Q}`); await settle(p, 1500)
    const lineTotals = await text(p, '[data-testid="quote-totals"]')
    ok(/S\$0\.27/.test(lineTotals) && /S\$3\.42/.test(lineTotals), `a quote stamped 'line' (sent before the rule) keeps its per-line GST S$0.27 and S$3.42 (${lineTotals.slice(0, 120)})`)
    await go(p, `/quotes/${PROBE_Q}/preview`); await settle(p, 1500)
    const prev = await text(p, '[data-testid="quote-preview"]')
    ok(/S\$0\.27/.test(prev) && /S\$3\.42/.test(prev), '…and its printed paper says the same figures')
    sql(`update quotes set gst_rule = NULL, amount_minor = 343 where id = '${PROBE_Q}'`)
    await go(p, `/quotes/${PROBE_Q}`); await settle(p, 1500)
    await p.getByTestId('quote-send').click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /Send for confirmation/ }).click(); await settle(p, 900)
    const dlg = p.getByRole('dialog', { name: 'Send for confirmation' })
    if (await dlg.count()) { await dlg.getByRole('button', { name: /Send|WhatsApp/ }).last().click(); await settle(p, 2000) }
    const stamped = sql(`select status || '|' || coalesce(gst_rule, '-') from quotes where id = '${PROBE_Q}'`)
    ok(stamped === 'Sent to Client|rate', `its first send stamps the rule it went out with (${stamped})`)
    ok(sql(`select count(*) from quotes where gst_rule is null and (client_sent_at is not null or status in ('Confirmed','Signed'))`) === '0', 'every quote with its client carries its rule (R163 stamped the ones sent before)')
    const q7 = await (await p.request.get(`${BASE}/quotes/${Q7}/preview`)).text()
    ok(/S\$88,704\.75/.test(q7.replace(/&nbsp;/g, ' ')), 'OM-10007 (sent before) still prints S$88,704.75 — the figure its client read')

    // ── 6 · the Marketing role (call C6) ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Marketing — the lead desk (call C6)')
    /* as Dane: the role named where roles are */
    await go(p, '/company/members')
    const nurul = p.locator('[data-member-id="nurul"]')
    ok(/Nurul Huda/.test(await nurul.innerText()) && /Looks after the leads/.test(await nurul.innerText()), 'Company › Members: Nurul Huda in Marketing — "Looks after the leads"')
    await go(p, '/settings?section=studio')
    const access = await text(p)
    ok(/^marketing/i.test(await text(p, '[role="columnheader"]:has-text("Marketing")')) && /Change Settings › Lead management and Company › Integrations’ lead capture/.test(access), 'Who may do what: a Marketing column and the lead set-up row')
    const costRow = p.getByTestId('cost-role-Marketing')
    ok(await costRow.count() === 1 && !(await costRow.getByRole('switch').isChecked()) && /Never/.test(await costRow.innerText()), 'Who sees costs and margins: Marketing’s row fixed off — "Never…"')
    await shot(p, 'pm2-s44o-roles-1440', true)

    as('nurul')
    const mk = await desk(); await stubWa(mk)
    const m = await page(mk, 'marketing')
    await go(m, '/')
    ok(/\/dashboard$/.test(m.url()), 'the front door is the Dashboard')
    const dash = await text(m)
    ok(/Leads/.test(dash) && !/Open projects|Owed to you|Profit this month/.test(dash), 'Where it stands: the Leads figure alone — no projects, no money')
    ok(await m.locator('a[href="/projects"]').count() === 0 && await m.locator('a[href="/marketplace"]').count() === 0 && await m.locator('a[href="/chat"]').count() === 0, 'the rail: no Projects, Marketplace or Messages')
    await shot(m, 'pm2-s44o-marketing-dashboard-1440')
    await go(m, '/leads')
    ok(/Olivia Martinez/.test(await text(m)), 'the Leads listing — every lead, whoever it is on')
    await go(m, `/leads/${OLIVIA}`)
    const strip = await text(m, '[role="tablist"]')
    ok(/Overview/.test(strip) && /Tasks/.test(strip) && !/Quotes|Contracts|Meetings/.test(strip), `the lead's strip: no Quotes, Contracts or Meetings (${strip})`)
    ok(await m.locator('[data-card="quotes"]').count() === 0, 'no QUOTES card on the Overview')
    const html1 = await m.content()
    ok(!/quoteAmount|wonQuoteAmount|amountMinor/.test(html1), 'no quote’s amount reaches the browser on a lead page (its number and status, as the listing’s Quote status column, do)')
    await m.getByRole('button', { name: /^Stage:/ }).first().click(); await settle(m, 400)
    const qs = m.getByRole('menuitem', { name: 'Quote Sent' })
    ok(await qs.getAttribute('aria-disabled') === 'true', 'the stage menu refuses Quote Sent')
    await qs.hover(); await settle(m, 700)
    ok(/Quote Sent and Won go with a quote — the lead’s designer moves it there/.test(await text(m, '[role="tooltip"]')), '…and says why')
    await m.keyboard.press('Escape')
    await shot(m, 'pm2-s44o-marketing-lead-1440')
    for (const [url, section] of [['/quotes', 'Quotes'], [`/quotes/${Q7}`, 'Quotes'], ['/projects', 'Projects'], [`/projects/${P1}/money`, 'Projects'], ['/company/finance', 'Finance'], [`/leads/${OLIVIA}/quotes`, 'Leads']]) {
      await go(m, url)
      const t = await text(m)
      const html = await m.content()
      ok(new RegExp(`You don’t have access to ${section}`).test(t) && /Marketing looks after the studio’s leads/.test(t) && await m.getByRole('button', { name: 'Go to Leads' }).count() > 0, `${url}: the gate in Marketing's words, one press to the Leads`)
      ok(!/88,704\.75|8870475/.test(html), `…and none of the quote's money reaches the browser`)
    }
    await go(m, '/company/reports')
    ok(/\/company\/reports\/leads/.test(m.url()) && !/Projects|Finance|Studio health/.test(await text(m, '[role="tablist"]')), 'Reports opens on Leads — the one tab theirs')
    ok(!/for Owners and Admins/.test(await text(m)), '…with its figures')
    await go(m, '/settings')
    const set = await text(m)
    ok(/Lead management/.test(set) && await m.getByRole('tab', { name: 'Roles & access' }).count() === 0 && !/Only Owners and Admins change/.test(set), 'Settings: Lead management alone, theirs to change')
    const srcCard = m.getByTestId('lead-sources')
    await srcCard.getByRole('textbox', { name: 'Add a source' }).fill('Probe Source'); await srcCard.getByRole('button', { name: 'Add', exact: true }).click(); await settle(m, 1200)
    ok(/Probe Source/.test(sql(`select value from settings where key = 'lead_sources'`)), '…a lead source added by Marketing is saved')
    await go(m, '/company/integrations')
    ok(await m.getByTestId('int-xero').count() === 0 && await m.getByRole('button', { name: /Simulate an enquiry arriving/ }).count() > 0, 'Company › Integrations: lead capture theirs to change, no Xero card')
    await go(m, '/leads')
    await m.keyboard.press('Meta+k'); await settle(m, 500)
    const chips = await text(m, '[role="dialog"] [role="radiogroup"]')
    ok(/Leads/.test(chips) && !/Quotes|Projects|Contracts|Finance/.test(chips), `⌘K's scopes are the leads' own (${chips})`)
    await m.keyboard.type('OM-10007'); await settle(m, 1400)
    const found = await text(m, '[role="dialog"]')
    ok(/Nothing matches/.test(found) && !/Quotes ·|OM-10004/.test(found), '…a quote is never found, and the empty line never offers one')
    await m.keyboard.press('Escape')
    const mph = await phoneCtx(); const mp = await page(mph, 'marketing-390')
    await go(mp, '/leads')
    const dock = await text(mp, 'nav[aria-label]:last-of-type')
    ok(/Leads/.test(await text(mp)) && (await mp.locator('a[href="/company/reports/leads"]').count()) > 0, `390: the dock is the lead desk's — Dashboard · Leads · Reports · Tasks (${dock.slice(0, 80)})`)
    ok((await sideways(mp)) <= 0, `390: no sideways scroll (${await sideways(mp)})`)
    await shot(mp, 'pm2-s44o-marketing-390')
    await go(mp, `/leads/${OLIVIA}`)
    ok((await sideways(mp)) <= 0, `390 lead page: no sideways scroll (${await sideways(mp)})`)
    await mph.close(); await mk.close()
    /* Accounting's gate keeps its own words */
    as('priya')
    const ac = await desk(); const a = await page(ac, 'accounting')
    await go(a, '/leads')
    ok(/Accounting keeps the studio’s books/.test(await text(a)) && await a.getByRole('button', { name: 'Go to Finance' }).count() > 0, 'Accounting’s gate is as it was — "Go to Finance"')
    await ac.close()
    as('dane')

    // ── 7 · widths and errors ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Widths, page errors')
    const ph320 = await phoneCtx(320, 700); const p320 = await page(ph320, '320')
    await go(p320, '/settings?section=finance')
    ok((await sideways(p320)) <= 0, `320: Settings › Finance never scrolls sideways (${await sideways(p320)})`)
    await ph320.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' · ')}` : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    /* put back everything it changed */
    sql(`update projects set payment_template = ${split0} where id = '${P4}'`)
    putQ(Q1, q1Kept)
    putVo()
    for (const r of invKept) { const [id, amt, gst] = r.split('§'); sql(`update project_invoices set amount_minor = ${amt}, gst_minor = ${gst} where id = '${id}'`) }
    sql(`delete from settings`)
    for (const r of settings0) sql(`insert into settings (key, value, updated_at) values (${r.split('§').join(', ')})`)
    for (const t of ['quote_items', 'quote_payments']) sql(`delete from ${t} where quote_id = '${PROBE_Q}'`)
    for (const t of [...trail].reverse()) {
      const fresh = [...ids(t)].filter((id) => !trail0[t].has(id))
      if (fresh.length) sql(`delete from ${t} where rowid in (${fresh.join(',')})`)
    }
    /* OM-10001's schedule, after the sweep (its rows came back with new rowids) */
    sql(`delete from quote_payments where quote_id = '${Q1}'`)
    for (const r of q1Pays) sql(`insert into quote_payments (${pCols}) values (${r.split('§').join(', ')})`)
    sql(`update members set is_you = (id = '${you0}')`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
