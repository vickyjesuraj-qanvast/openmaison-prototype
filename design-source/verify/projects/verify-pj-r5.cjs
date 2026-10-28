// Projects round 5 — money in, part one: the contract value with variation orders (Money tab, Overview card, listing), Who sees money
// (F-17), a new variation order → the quote editor in variation mode (crumb, chip, bar, no payment schedule, an omission typed as a minus
// quantity, "Change to the contract") → Send for confirmation (WhatsApp on the press) → the client's /confirm page names it a variation order
// → approved → the contract moves and the unsent invoice is re-sized (+ its Activity lines and bell row); Mark as approved by the client for
// one given elsewhere → the rebalance sentence + Undo; the invoice Drafts and Ready to send; a Designer's send waits for approval (Needs my
// review, the bell); an Owner's goes (number, due day, WhatsApp to the portal); the invoice page; Void + Undo; the variance reason; the
// Settings › Projects › Invoices rules and the Who may do what rows; the phone.
// Run against `next start -p 3021` on the repaired scratch DB — never local.db. Everything it changes is put back in `finally` (the
// invoices as they were, the variation orders it made, Aisha's VO-1, the settings, `members.is_you`, its events and bell rows).
// Usage: [BASE=http://localhost:3021] NODE_PATH=$PWD/node_modules node verify-pj-r5.cjs <scratch.db> [shotDir] [base URL]
// Invoice numbers are asserted by the rule, never a fixed string: the next number in the studio's pattern, read off the data (other
// rounds' demo projects — R76's Shalini Menon — take numbers of their own).
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r5')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3021'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** (REG-1056 · REG-1076) Whether a project's client holds the portal — invited, not withdrawn: the messages and the send dialog give its address
    only then. */
const holdsPortal = (projectId) => sql(`select count(*) from homeowner_lead_links h join projects p on p.lead_id = h.lead_id where p.id='${projectId}' and h.invited_at is not null and h.withdrawn_at is null`) !== '0'
/** The number the next invoice takes, by the rule (lib/projects/invoices-model.ts `nextInvoiceNumber`): the studio's pattern
    (`invoice_numbering`, else INV-{YYYY}-{seq}), one past the highest number already given under its prefix, never below its next. */
const nextInvoiceNo = () => {
  let r = {}
  try { r = JSON.parse(sql(`select value from settings where key='invoice_numbering'`) || '{}') } catch { r = {} }
  const prefix = (typeof r.prefix === 'string' && r.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()) || 'INV'
  const year = r.year === undefined ? true : r.year === true
  const digits = typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : 3
  const next = typeof r.next === 'number' && Number.isFinite(r.next) && r.next > 0 ? Math.floor(r.next) : 0
  const highest = sql(`select number from project_invoices where number is not null`).split('\n').filter((x) => x.startsWith(`${prefix}-`))
    .reduce((m, x) => Math.max(m, Number((/(\d+)$/.exec(x) || [])[1] || 0)), 0)
  const seq = Math.max(next || 1, highest + 1)
  return [prefix, ...(year ? [String(new Date().getFullYear())] : []), digits ? String(seq).padStart(digits, '0') : String(seq)].join('-')
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003')
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  /* what the probe puts back */
  const T0 = Math.floor(Date.now() / 1000) - 2
  const invoicesBefore = json(`select * from project_invoices`)
  const vosBefore = sql(`select id from quotes where kind='variation'`).split('\n').filter(Boolean)
  const aishaVo = json(`select * from quotes where kind='variation' and project_id='${aisha}'`)[0]
  const settingsBefore = json(`select * from settings where key in ('project_invoices','invoice_numbering')`)
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    /* WhatsApp opens on the press (window.open before the round trip): the probe records the address instead of leaving the app */
    await ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
    const stageRow = (name) => p.locator('[data-testid="money-stages"] [role="row"]').filter({ hasText: new RegExp(`^${name}`) }).first()   // "Mid-Project" reads "50% completion" too
    const dialog = () => p.locator('[role="dialog"]').last()
    /** (simplify S-07) Needs you shows three rows, the rest behind "Show n more" — a probe reaching a later row opens them first */
    const allNeeds = async () => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(400) } }
    /** WhatsApp opens on the press: the address it was opened with. */
    const whatsapp = async (press) => { await p.evaluate(() => { window.__opened = [] }); await press(); await p.waitForTimeout(300); return p.evaluate(() => window.__opened[window.__opened.length - 1] ?? '') }

    // ── The contract value, with variation orders (F-02) ────────────────────────────────────────────────────────────────────────
    console.log('Contract value (Dane, Owner)')
    as('dane')
    await go(`/projects/${ryan}/money`)
    ok(await p.locator('[role="tab"], a').filter({ hasText: /^(Payments|Money)(\s*\d+)?$/ }) /* (the calm UI build 2026-10-27, a deliberate change) 3-02 */.count() > 0, 'the project has a Money tab, after Updates')   // (gaps build, package A — REG-a.15) a tab may carry its count
    /* (simplify S-07, a deliberate change of this rule) the four tiles and the story sentence became To collect · To pay · Profit: the contract is
       the To collect tile's "collected of" line, its make-up and what was invoiced are the tile's hover */
    ok(/of S\$81,355\.42/.test(await p.locator('[data-testid="money-collected"]').innerText()), 'Ryan’s contract value (collected of S$81,355.42) = the signed quote + his approved VO-1')
    /* (simplify round 2, R2-A, a deliberate change of this rule) the tile presses to Billing, so its value is no longer a focus stop of its own — its hover stays */
    await p.locator('[data-testid="tile-collect"] [class*="tileValue"]').first().hover(); await p.waitForTimeout(700)
    const collectHow = await p.locator('[role="tooltip"]').last().innerText().catch(() => '')
    ok(/S\$77,900\.12 \+ variation orders S\$3,455\.30/.test(collectHow) && /invoiced S\$31,160\.05/.test(collectHow), 'the tile’s hover: the signed quote + VO-1, and what was invoiced — real figures only')
    await p.mouse.move(0, 0)
    ok(/S\$25,097\.69/.test(await stageRow('Mid-Project').innerText()) && /S\$25,097\.68/.test(await stageRow('Completion').innerText()), 'his two unsent invoices carry the rebalance')
    ok(/Approved by the client/i.test(await p.locator('[data-testid="money-variations"]').innerText()), 'VO-1 reads Approved by the client, with who and how')
    await shot('money-ryan-1440', true)
    await go(`/projects/${ryan}`)
    /* (simplify S-01, a deliberate change of this rule) the Money glance says four figures — the VOs are inside the contract value (their rows live on Money) */
    ok(/S\$ 81,355(?!\.)/.test(await p.locator('[data-testid="contract-value"]').innerText()), 'the Overview’s Money card reads the module — contract after VOs')   // (parity Q-03, a deliberate change of this rule) a card's sums in whole dollars, "S$ 81,355"; the Money tab keeps the cents
    await go('/projects')
    ok(/S\$ ?81,355/.test(await p.locator('[data-kb-row]').filter({ hasText: 'Ryan' }).first().innerText()), 'the listing’s Contract value includes the approved VO')   /* (the calm UI build 2026-10-27, a deliberate change) T-01 words; the reports' door is the ⋮'s "Reports" row (1-30); rows say money as cards do, "S$ 81,355" (T-11) */
    const act = await (async () => { await go(`/projects/${ryan}/activity`); return p.locator('[data-testid="activity-feed"]').innerText() })()
    ok(/approved the variation order “VO-1” on its confirmation link — the contract went from S\$77,900\.12 to S\$81,355\.42/.test(act) && /re-sized to the S\$81,355\.42 contract/.test(act), 'Activity: the approval and the rebalance')
    ok(/sent the Deposit invoice “INV-2026-001”/.test(act) && /submitted the Deposit invoice/.test(act), 'Activity: a Designer’s invoice submitted, then sent by the Owner')

    // ── Who sees money (F-17) ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Who sees money (Sarah, a Designer not on Benjamin’s team)')
    as('sarah')
    await go(`/projects/${ben}`)
    ok(await p.locator('a').filter({ hasText: /^(Payments|Money)$/ }) /* (the calm UI build 2026-10-27, a deliberate change) 3-02 */.count() === 0 && await p.locator('[data-card="money"]').count() === 0, 'she sees the project, but no Money tab and no Money card')
    await go(`/projects/${ben}/money`)
    ok(await p.locator('[data-testid="money-hidden"]').isVisible() && await p.locator('[data-testid="money-tiles"]').count() === 0, 'the Money address answers with the rule, and no figures')
    await shot('money-hidden-1440')
    as('dane')

    // ── A new variation order, in the quote editor's variation mode (F-06) ───────────────────────────────────────────────────
    console.log('New variation order (Benjamin)')
    await go(`/projects/${ben}/money`)
    /* (gaps build B, REG-b.18) New ▾ on Money: the variation order is its first row */
    await p.locator('[data-testid="money-new"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: /^Variation order/ }).first().click(); await p.waitForTimeout(300)   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */
    await Promise.all([p.waitForURL(/\/quotes\//, { timeout: 15000 }), p.getByRole('menuitem', { name: /^New variation order/ }).first().click()])
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(1200)
    const vo = sql(`select id from quotes where kind='variation' and project_id='${ben}' order by created_at desc limit 1`)
    ok(!!vo && sql(`select number from quotes where id='${vo}'`) === 'VO-1', 'VO-1 made on Benjamin’s project, numbered per project')
    ok(/Projects/.test(await p.locator('header').first().innerText()) && /Payments|Money/.test(await p.locator('header').first().innerText()) /* (the calm UI build 2026-10-27, a deliberate change) the tab reads "Payments" — its slug stays money (3-02) */, 'the crumb is the project’s Money tab')
    ok(/Variation order/i.test(await p.locator('header').first().innerText()), 'the header says it is a variation order')
    /* (the calm UI build 2026-10-27, a deliberate change) 4-52: the bar is one line — the change and the contract once approved; the contract today
       rides its info tooltip (variation-how) */
    await p.getByTestId('variation-how').hover(); await p.waitForTimeout(500)
    ok(await p.locator('[data-testid="variation-bar"]').isVisible() && /once approved/.test(await p.locator('[data-testid="variation-bar"]').innerText()) && /S\$69,283\.13 today/.test(await p.locator('[role="tooltip"]').last().innerText().catch(() => '')), 'the bar: the contract with this change, and (its tooltip) the contract today')
    await p.mouse.move(0, 0); await p.waitForTimeout(200)
    ok(await p.getByRole('tab', { name: 'Payment Schedule' }).count() === 0 && await p.locator('#section-payment').count() === 0, 'no payment schedule of its own')
    /* two lines (the probe's setup), then the omission typed as a minus quantity through the grid */
    const now = Math.floor(Date.now() / 1000)
    sql(`insert into quote_items (id, quote_id, parent_id, kind, position, name, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, visibility, collapsed, created_at, updated_at) values ('r5-line-1','${vo}',NULL,'item',0,'Built-in shoe cabinet','Pending',1,'Lot',100000,50000,0,9,'visible',0,${now},${now}), ('r5-line-2','${vo}',NULL,'item',1,'Feature wall paint','Pending',1,'Lot',30000,10000,0,9,'visible',0,${now},${now})`)
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
    const qty = p.getByLabel('Quantity of Feature wall paint')
    await qty.scrollIntoViewIfNeeded(); await qty.click(); await qty.fill('-1'); await qty.press('Tab'); await p.waitForTimeout(1500)
    ok(sql(`select qty from quote_items where id='r5-line-2'`) === '-1.0' || sql(`select qty from quote_items where id='r5-line-2'`) === '-1', 'an omission is a line with a minus quantity — the cell keeps its sign')
    ok(sql(`select amount_minor from quotes where id='${vo}'`) === '119900', 'its total is the change: (S$1,500 − S$400) + GST = S$1,199.00')
    const summary = p.locator('text=Change to the contract').first()
    ok(await summary.isVisible(), 'the totals read “Change to the contract”')
    await p.locator('[data-testid="variation-bar"]').scrollIntoViewIfNeeded()
    await shot('vo-editor-1440')
    await p.locator('[data-testid="quote-send"]').click(); await p.waitForTimeout(400)
    /* (the calm UI build 2026-10-27, a deliberate change) 4-21: Send ▾'s rows say what the client does — a variation order's is "Ask to approve" */
    ok(await p.getByRole('menuitem', { name: /Ask to approve/ }).count() === 1 && await p.getByRole('menuitem', { name: /Send to sign|Send for signature/ }).count() === 0, 'Send ▾: confirmation only — no agreement to sign')
    await p.getByRole('menuitem', { name: /Ask to approve/ }).click(); await p.waitForTimeout(700)
    ok(/variation order VO-1/.test(await dialog().locator('textarea').inputValue()) && /changes your contract by \+S\$1,199\.00/.test(await dialog().locator('textarea').inputValue()), 'the WhatsApp draft names the variation order and its change')
    const wa1 = await whatsapp(() => dialog().getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click())   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    await p.waitForTimeout(1500)
    ok(/wa\.me\/65/.test(wa1) && /confirm/.test(decodeURIComponent(wa1)), 'WhatsApp opens on the press, with the confirmation link')
    ok(sql(`select status from quotes where id='${vo}'`) === 'Sent to Client', 'VO-1 is with Benjamin')
    await go(`/projects/${ben}`)
    /* (simplify S-01 · S-05, a deliberate change of this rule) what waits on the client is With Benjamin's — his own words on his page, with Remind */
    ok(/VO-1/.test(await p.locator('section[data-card="with-client"]').innerText()), 'With Benjamin counts the variation order')
    await go('/projects?scope=waiting')
    ok((await p.locator('[data-kb-row]').allInnerTexts()).some((t) => /Benjamin/.test(t)), 'the listing’s Waiting on client keeps Benjamin')

    // ── The client approves it on its link (F-07 · F-08) ─────────────────────────────────────────────────────────────────────
    console.log('The client’s confirmation link')
    const c = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const cp = await c.newPage()
    cp.on('pageerror', (e) => errors.push(`confirm: ${String(e).slice(0, 160)}`))
    /* (pending modules S04, a deliberate change of this rule) the approval link carries the order's own token — a new order's is never its id */
    await cp.goto(`${BASE}/confirm/${sql(`select confirm_token from quotes where id='${vo}'`)}`, { waitUntil: 'networkidle' }); await cp.waitForTimeout(1500)
    ok(/Approve this variation order/.test(await cp.locator('aside').innerText()) && /goes from S\$69,283\.13 to S\$70,482\.13/.test(await cp.locator('[data-testid="vo-confirm"]').innerText()), 'the page names it a variation order and what it does to the contract')
    await cp.screenshot({ path: path.join(dir, 'vo-confirm-1440.png') })
    await cp.getByRole('button', { name: 'Approve the changes' }).click(); await cp.waitForTimeout(2000)
    ok(/is now S\$70,482\.13/.test(await cp.locator('[data-testid="vo-approved"]').innerText()), 'approved — the page says the contract is now S$70,482.13')
    await c.close()
    ok(sql(`select status from quotes where id='${vo}'`) === 'Confirmed' && sql(`select confirmed_via from quotes where id='${vo}'`) === 'link', 'Confirmed on its link')
    const comp = sql(`select amount_minor from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`)
    ok(comp === '2198394', 'the rebalance: Benjamin’s unsent Completion invoice took the change (S$20,784.94 → S$21,983.94); sent ones stayed')
    ok(sql(`select count(*) from project_invoices where project_id='${ben}' and status='sent' and amount_minor=2078494`) === '2', 'Commencement and Mid-project, sent, never change')
    ok(Number(sql(`select count(*) from lead_events where project_id='${ben}' and kind in ('project_vo_approved','project_money_rebalanced') and at >= ${T0}`)) === 2, 'the approval and the rebalance wrote their events')
    ok(Number(sql(`select count(*) from notifications where kind='variation_approved' and member_id='germaine' and created_at >= ${T0}`)) === 1, 'the project’s team hears it (the bell)')
    await go(`/projects/${ben}/money`)
    ok(/of S\$70,482\.13/.test(await p.locator('[data-testid="money-collected"]').innerText()) && /S\$21,983\.94/.test(await stageRow('Completion').innerText()), 'the Money tab reads the moved contract')   // (simplify S-07) the To collect tile's line

    // ── Mark as approved by the client, given elsewhere (F-07): the sentence + Undo ───────────────────────────────────────────
    console.log('Mark as approved (Aisha’s VO-1)')
    as('michelle')
    await go(`/projects/${aisha}/money`)
    await p.getByRole('button', { name: 'More actions for VO-1' }).click(); await p.waitForTimeout(300)
    ok(await p.getByRole('menuitem', { name: /Mark as approved by the client/ }).isDisabled() || /Only an Owner or an Admin/.test(await p.getByRole('menuitem', { name: /Mark as approved/ }).innerText()), 'a Designer can’t record it — the row says why')
    await p.keyboard.press('Escape')
    as('dane')
    await go(`/projects/${aisha}/money`)
    const draftsBefore = sql(`select group_concat(amount_minor) from (select amount_minor from project_invoices where project_id='${aisha}' and status='draft' order by position)`)
    await p.getByRole('button', { name: 'More actions for VO-1' }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: /Mark as approved by the client/ }).click(); await p.waitForTimeout(600)
    ok(/the contract becomes S\$62,157\.25/.test(await dialog().innerText()), 'the dialog: when, how, and what the contract becomes')
    await shot('mark-approved-1440')
    await dialog().getByRole('radio', { name: 'In person' }).click()
    await dialog().getByRole('button', { name: 'Mark as approved' }).click(); await p.waitForTimeout(1800)
    ok(/VO-1 approved — the contract is now S\$62,157\.25 — Commencement, Mid-Project and Completion were re-sized/.test(await snack().innerText()), 'one sentence says what moved')
    ok(sql(`select status || '·' || confirmed_via from quotes where id='${aishaVo.id}'`) === 'Confirmed·in_person', 'recorded with how')
    ok(sql(`select group_concat(amount_minor) from (select amount_minor from project_invoices where project_id='${aisha}' and status='draft' order by position)`) === '1862901,1862901,1862900', 'the three unsent invoices re-sized by their shares')
    await shot('mark-approved-snack-1440')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1800)
    ok(sql(`select status from quotes where id='${aishaVo.id}'`) === 'Sent to Client' && sql(`select group_concat(amount_minor) from (select amount_minor from project_invoices where project_id='${aisha}' and status='draft' order by position)`) === draftsBefore, 'Undo: VO-1 is with Aisha again, the invoices as they were')
    ok(sql(`select count(*) from lead_events where project_id='${aisha}' and kind='project_vo_approved'`) === '0', 'Undo takes its trail away')

    // ── (REG-1066) The quote editor's status pill keeps the same rule: Confirmed is an Owner's or an Admin's, as Mark as approved ──
    console.log('The VO status pill (REG-1066)')
    /* (fix-D, D-24) a variation order's pill and its list read the Money tab's words: "With the client", "Approved by the client" */
    const pill = () => p.locator('header button[aria-haspopup="menu"]').filter({ hasText: /With (the )?client/ }) /* (the calm UI build 2026-10-27, a deliberate change) W-441 */.first()
    as('michelle')
    await go(`/quotes/${aishaVo.id}`)
    await pill().click(); await p.waitForTimeout(400)
    const confirmedRow = p.getByRole('menuitemradio', { name: /^Approved by the client/ })
    ok(await confirmedRow.getAttribute('aria-disabled') === 'true' && /Only an Owner or an Admin records a client’s approval given outside the link/.test(await confirmedRow.innerText()), 'a Designer: Confirmed is off in the pill, the row says the rule')
    ok(await p.getByRole('menuitemradio', { name: /^Signed/ }).count() === 0, 'a variation order is never Signed — the pill has no Signed')
    await shot('vo-pill-designer-1440')
    await p.keyboard.press('Escape')
    ok(sql(`select status from quotes where id='${aishaVo.id}'`) === 'Sent to Client', '…and nothing moved')
    as('dane')
    await go(`/quotes/${aishaVo.id}`)
    await pill().click(); await p.waitForTimeout(400)
    ok(/Mark as approved by the client/.test(await p.getByRole('menuitemradio', { name: /^Approved by the client/ }).innerText()), 'an Owner: Confirmed says it records the client’s approval')
    await p.getByRole('menuitemradio', { name: /^Approved by the client/ }).click(); await p.waitForTimeout(600)
    ok(/Mark as approved by the client/.test(await dialog().innerText()) && /the contract becomes S\$62,157\.25/.test(await dialog().innerText()), '…it opens Mark as approved by the client — when and how, and what the contract becomes')
    await dialog().getByRole('radio', { name: 'On WhatsApp' }).click()
    await dialog().getByRole('button', { name: 'Mark as approved' }).click(); await p.waitForTimeout(1800)
    ok(sql(`select status || '·' || confirmed_via || '·' || confirmed_marked_by from quotes where id='${aishaVo.id}'`) === 'Confirmed·whatsapp·dane' && /VO-1 approved — the contract is now S\$62,157\.25/.test(await snack().innerText()), 'recorded with how and by whom; the sentence says the contract moved')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1800)
    ok(sql(`select status from quotes where id='${aishaVo.id}'`) === 'Sent to Client' && sql(`select group_concat(amount_minor) from (select amount_minor from project_invoices where project_id='${aisha}' and status='draft' order by position)`) === draftsBefore, 'Undo from the editor too: with Aisha again, the invoices as they were')

    // ── (REG-1075) Approved by the studio and not sent is not with the client ─────────────────────────────────────────────────
    sql(`update quotes set status='Approved' where id='${aishaVo.id}'`)
    await go(`/projects/${aisha}/money`)
    ok(/Approved — not sent/i.test(await p.locator('[data-testid="money-variations"]').innerText()), 'Approved by the studio: "Approved — not sent"')   // (simplify S-07) the story sentence is gone
    await go(`/projects/${aisha}`)
    ok(!/Variation order VO-1 awaits approval|Approve a change to your contract/.test(await p.locator('section[data-card="with-client"]').innerText()), 'With Aisha does not count it')   // (simplify S-01, a deliberate change of this rule)
    sql(`update quotes set status='Sent to Client' where id='${aishaVo.id}'`)

    // ── Drafts, Ready to send, a Designer's send waits (F-04 · F-05) ─────────────────────────────────────────────────────────
    console.log('A Designer’s send waits (Michelle on Aisha’s)')
    await go(`/projects/${aisha}/money`)
    ok(/Ready to send/i.test(await stageRow('Commencement').innerText()) && /Draft/i.test(await stageRow('Mid-Project').innerText()), 'Commencement is Ready to send (Hacking & demolition began); Mid-project a Draft')
    as('michelle')
    await go(`/projects/${aisha}/money`)
    ok(await stageRow('Commencement').locator('[data-testid="invoice-submit"]').isVisible(), 'her next step is Submit for approval')
    await stageRow('Commencement').locator('[data-testid="invoice-submit"]').click(); await p.waitForTimeout(1600)
    const com = sql(`select id from project_invoices where project_id='${aisha}' and stage_name='Commencement' and status='draft'`)
    ok(sql(`select submitted_by from project_invoices where id='${com}'`) === 'michelle' && sql(`select status from project_invoices where id='${com}'`) === 'draft', 'it waits — submitted, still a Draft')
    /* (simplify S-07 · S-04, a deliberate change of this rule) Needs you lists only what waits on the viewer: her submission waits on an Owner or an
       Admin, so it is no row of hers — the Billing row says it waits, and its ⋮ keeps Remind the approvers */
    ok(/Waiting for approval/i.test(await stageRow('Commencement').innerText()) && await p.locator('[data-testid="invoice-approval-bar"]').count() === 0, 'the row says it waits; no Needs you row for the submitter')
    ok(Number(sql(`select count(*) from notifications where kind='invoice_review' and member_id in ('dane','huimin') and created_at >= ${T0}`)) === 2, 'the Owner and the Admin hear it')
    await shot('designer-waits-1440')
    as('dane')
    await go('/projects?scope=review')
    ok((await p.locator('[data-kb-row]').allInnerTexts()).some((t) => /Aisha/.test(t)), '“Needs my review” keeps Aisha’s project for the Owner')

    // ── An Owner's send goes: number, due day, WhatsApp to the portal (F-05 · F-13 · F-14) ──────────────────────────────────
    console.log('The Owner approves and sends')
    await go(`/projects/${aisha}/money`); await allNeeds()
    await p.locator('[data-testid="banner-approve"]').click(); await p.waitForTimeout(700)
    const aishaPortal = holdsPortal(aisha)
    ok(/Send the Commencement invoice/.test(await dialog().innerText()) && /\/my\/demo-studio/.test(await dialog().locator('textarea').inputValue()) === aishaPortal,
       aishaPortal ? 'the send dialog: the client’s message points at her portal' : 'the send dialog: she was never invited, so the message leaves the portal out (REG-1056)')
    /* (the calm UI build 2026-10-27, a deliberate change) 4-20: the address shows once — in the message, or on the link row when the message lacks it */
    ok((await dialog().getByRole('button', { name: /Copy link|Copied/ }).count() === 1) === aishaPortal && (await dialog().locator('code').count() === 1) === (aishaPortal && !/\/my\/demo-studio/.test(await dialog().locator('textarea').inputValue())),
       aishaPortal ? 'Copy link gives her portal address' : 'no Copy link and no portal address for a client without the portal (REG-1076)')
    await shot('send-invoice-1440')
    const expectNo = nextInvoiceNo()   // read before the send: the number it must take
    const wa2 = await whatsapp(() => dialog().getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click())   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    await p.waitForTimeout(1800)
    ok(/wa\.me\/65/.test(wa2) && /commencement payment/.test(decodeURIComponent(wa2)), 'WhatsApp opens on the press with the invoice’s message')
    const num = sql(`select number from project_invoices where id='${com}'`)
    const due = Number(sql(`select due_at from project_invoices where id='${com}'`))
    const d0 = new Date(); const expectDue = Math.floor(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 7).getTime() / 1000)
    ok(num === expectNo && sql(`select status from project_invoices where id='${com}'`) === 'sent' && due === expectDue, `Sent: ${expectNo} — the next number in the studio’s pattern — due today + 7 days${num === expectNo ? '' : ` (got ${num || 'none'})`}`)
    ok(new RegExp(`${esc(expectNo)} sent to Aisha`).test(await snack().innerText()), 'the snackbar names the number and the due day')
    ok(sql(`select count(*) from notifications where kind='invoice_review' and href like '%${com}%'`) === '0', 'the approvers’ bell rows go once it is sent')

    // ── The invoice page (F-12 · F-15) ────────────────────────────────────────────────────────────────────────────────────────
    console.log('The invoice page')
    await go(`/projects/${aisha}/invoices/${com}`)
    const paper = await p.locator('[data-testid="invoice-paper"]').innerText()
    ok(/Tax invoice/.test(paper) && new RegExp(esc(expectNo)).test(paper) && /S\$18,810\.67/.test(paper) && /GST \(9%\)/.test(paper), 'the paper: number, the stage’s amount, GST split out')
    ok(/DBS Bank/.test(paper) && /PayNow/.test(paper) && new RegExp(`Reference\\s*${esc(expectNo)}`).test(paper), 'how to pay: the issuing entity’s bank and PayNow, the number as the reference')
    await shot('invoice-page-1440', true)

    // ── Void + Undo (F-18) ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Void')
    as('michelle')
    await go(`/projects/${aisha}/money`)
    await stageRow('Commencement').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)   // (simplify S-07) the sent invoice is its stage's row in Billing
    ok(/Only an Owner, an Admin or Accounting voids an invoice/.test(await p.getByRole('menuitem', { name: /Void/ }).innerText()), 'a Designer can’t void — the row says why') /* (parity map, FB-114 — a deliberate change of this rule) */
    await p.keyboard.press('Escape')
    as('dane')
    await go(`/projects/${aisha}/money`)
    await stageRow('Commencement').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: /^Void/ }).click(); await p.waitForTimeout(500)
    await dialog().getByLabel('Why is it void?').fill('Sent before the site meeting — resending next week')
    await dialog().getByRole('button', { name: 'Void' }).click(); await p.waitForTimeout(1800)
    ok(sql(`select status from project_invoices where id='${com}'`) === 'void' && sql(`select count(*) from project_invoices where replaces_id='${com}' and status='draft'`) === '1', 'void keeps its row; a fresh Draft takes its share')
    ok(/is void — a fresh Commencement Draft takes its share/.test(await snack().innerText()), 'the snackbar says so, with Undo')
    await shot('void-1440', true)
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1800)
    ok(sql(`select status from project_invoices where id='${com}'`) === 'sent' && sql(`select count(*) from project_invoices where replaces_id='${com}'`) === '0', 'Undo: sent again, the fresh Draft gone')

    // ── The variance reason (F-09) ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The variance reason (Benjamin’s Completion)')
    await go(`/projects/${ben}/money`)
    await stageRow('Completion').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Change the amount' }).click(); await p.waitForTimeout(500)
    await dialog().getByLabel('Amount, GST included (S$)').fill('21000.00'); await p.waitForTimeout(300)
    ok(/Differs from the schedule by S\$983\.94 less/.test(await dialog().locator('[data-testid="differs"]').innerText()), 'more than S$1 off: “Differs from the schedule by S$983.94”')
    await dialog().getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(500)
    ok(/Say why it differs/.test(await dialog().innerText()), 'a reason is asked for')
    await dialog().getByLabel('Why it differs').fill('Agreed with Benjamin — the handover cleaning is his own')
    await dialog().getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(1600)
    ok(sql(`select amount_minor || '·' || (variance_reason is not null) from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`) === '2100000·1', 'saved with its reason')
    ok(/Completion invoice is S\$21,000\.00 — no other unsent invoice is left to take the difference/.test(await snack().innerText()), 'the sentence says what moved — no other unsent invoice to take the difference (REG-1067)')
    /* (fix-D, D-34) the amount cell keeps its GST line; an edit with its reason wears a "Differs" chip whose hover says how far and why */
    const chip = stageRow('Completion').locator('[data-testid="invoice-differs"]')
    await chip.hover(); await p.waitForTimeout(700)
    ok(await chip.count() === 1 && /GST S\$[\d,.]+ inside/.test(await stageRow('Completion').innerText()) && /Differs from the schedule by S\$983\.94/.test(await p.locator('[role="tooltip"]').last().innerText().catch(() => '')), 'the row shows how far it is off the schedule (its chip\'s hover), its GST line kept')
    await shot('variance-1440')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1600)
    ok(sql(`select amount_minor || '·' || (variance_reason is null) from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`) === '2198394·1' && sql(`select count(*) from lead_events where project_id='${ben}' and kind='project_invoice_edited' and at >= ${T0}`) === '0', 'Undo: back on the schedule, its line gone (REG-1067)')
    await stageRow('Completion').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Change the amount' }).click(); await p.waitForTimeout(500)
    await dialog().getByLabel('Amount, GST included (S$)').fill('21000.00'); await p.waitForTimeout(300)
    await dialog().getByLabel('Why it differs').fill('Agreed with Benjamin — the handover cleaning is his own')
    await dialog().getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(1600)
    await stageRow('Completion').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Change the amount' }).click(); await p.waitForTimeout(500)
    await dialog().getByRole('button', { name: 'Use the schedule’s amount' }).click(); await dialog().getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(1600)
    ok(sql(`select amount_minor || '·' || (variance_reason is null) from project_invoices where project_id='${ben}' and stage_name='Completion' and status='draft'`) === '2198394·1', 'back on the schedule')

    // ── (REG-1067) A change takes the others with it in the same press; the band's Re-size names the invoices, never the contract ──
    console.log('The rebalance in the same press (Aisha)')
    await go(`/projects/${aisha}/money`)
    const drafts = () => json(`select stage_name, amount_minor from project_invoices where project_id='${aisha}' and status='draft' order by position`)
    const before2 = drafts()
    const mid2 = before2.find((x) => x.stage_name === 'Mid-Project'), comp2 = before2.find((x) => x.stage_name === 'Completion')
    await stageRow('Mid-Project').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Change the amount' }).click(); await p.waitForTimeout(500)
    await dialog().getByLabel('Amount, GST included (S$)').fill(((mid2.amount_minor - 100000) / 100).toFixed(2)); await p.waitForTimeout(300)
    ok(/Saving re-sizes Completion to take the difference/.test(await dialog().locator('[data-testid="differs"]').innerText()), 'the dialog says which invoice takes the difference')
    await dialog().getByLabel('Why it differs').fill('A smaller second payment, agreed with Aisha')
    await dialog().getByRole('button', { name: 'Save' }).click(); await p.waitForTimeout(1600)
    const after2 = drafts()
    ok(after2.find((x) => x.stage_name === 'Mid-Project').amount_minor === mid2.amount_minor - 100000 && after2.find((x) => x.stage_name === 'Completion').amount_minor === comp2.amount_minor + 100000, 'the same press re-sized Completion by the difference')
    ok(/Mid-Project invoice is S\$[\d,.]+ — Completion was re-sized to take the difference/.test(await snack().innerText()) && await p.locator('[data-testid="money-out-of-step"]').count() === 0, 'one sentence names what moved — and nothing is left out of step')
    await shot('amount-resizes-1440')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1600)
    ok(JSON.stringify(drafts()) === JSON.stringify(before2), 'Undo puts both back')
    sql(`update project_invoices set amount_minor = amount_minor + 50000 where project_id='${aisha}' and status='draft' and stage_name='Completion'`)   // out of step, as a value changed elsewhere leaves it
    await go(`/projects/${aisha}/money`); await allNeeds()
    await p.locator('[data-testid="money-rebalance"]').click(); await p.waitForTimeout(1600)   // (simplify S-07) the band is a Needs you row: "Even them out"
    ok(/re-sized to add up to the S\$[\d,.]+ contract/.test(await snack().innerText()) && !/The contract is now/.test(await snack().innerText()), 'the band’s Re-size names the invoices it moved — never "the contract is now" when the contract stayed')
    await go(`/projects/${aisha}/money`)
    ok(await p.locator('[data-testid="money-out-of-step"]').count() === 0, '…and they add up again (no band)')

    // ── Settings › Projects › Invoices; Who may do what ──────────────────────────────────────────────────────────────────────
    console.log('Settings')
    /* (simplify S-15 · S-20, a deliberate change of this rule) the Invoices card is on Settings › Finance, its numbers on Finance's Document
       numbers card; its approval switch on Settings › Projects' What waits for an Owner or an Admin */
    await go('/settings?section=finance')
    const nextNo = nextInvoiceNo()
    ok(await p.locator('[data-testid="invoice-settings"]').isVisible() && new RegExp(esc(nextNo)).test(await p.locator('[data-testid="invoice-number-example"]').innerText()), `Invoices on Finance: the payment terms; Document numbers: the pattern and the next number (${nextNo})`)
    await p.locator('[data-testid="invoice-settings"]').scrollIntoViewIfNeeded()
    await shot('settings-invoices-1440')
    await go('/settings?section=projects')
    ok(await p.locator('[data-testid="owner-approvals"] [data-testid="invoice-approval-row"]').count() === 1, 'the invoice approval sits with the studio’s other approvals')
    await p.locator('[data-testid="invoice-approval-row"] label').first().click(); await p.waitForTimeout(1200)
    ok(JSON.parse(sql(`select value from settings where key='project_invoices'`) || '{}').approval === false, 'switched off, it saves at once')
    as('michelle')
    await go(`/projects/${aisha}/money`)
    ok(await stageRow('Mid-Project').getByRole('button', { name: /More actions/ }).count() === 1 && await (async () => { await stageRow('Mid-Project').getByRole('button', { name: /More actions/ }).click(); await p.waitForTimeout(300); const t = await p.getByRole('menu').innerText(); await p.keyboard.press('Escape'); return /Send now/.test(t) })(), 'with approval off, the team sends its own (Send now)')
    as('dane')
    await go('/settings?section=projects')
    await p.locator('[data-testid="invoice-approval-row"] label').first().click(); await p.waitForTimeout(1200)
    ok(JSON.parse(sql(`select value from settings where key='project_invoices'`) || '{}').approval === true, 'switched back on')
    await go('/settings?section=studio')
    await openRoles(p)   // (the calm UI build 2026-10-27, a deliberate change)
    const rules = await p.locator('body').innerText()
    ok(/Send a project’s invoice/.test(rules) && /Void a sent invoice/.test(rules) && /variation order given outside its link/.test(rules), 'Who may do what: sending, voiding, recording a VO’s approval')
    await ctx.close()

    // ── Phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390')
    as('dane')
    const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const q = await m.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 160)}`))
    await q.goto(`${BASE}/projects/${ryan}/money`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1500)
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= 390), 'no sideways scroll at 390')
    ok(await q.locator('[data-testid="money-stages"] [role="row"]').count() >= 4 && await q.locator('[data-testid="money-stages"] [role="columnheader"]').first().isHidden(), 'the tables are cards on a phone')
    await q.screenshot({ path: path.join(dir, 'phone-money-390.png'), fullPage: true })
    await q.getByRole('button', { name: 'More actions for the Mid-Project invoice' }).click(); await q.waitForTimeout(600)
    const sheet = await q.getByRole('menu').boundingBox()
    ok(!!sheet && sheet.y + sheet.height > 780 && sheet.width > 340, 'a row’s menu is a bottom sheet (REG-353)')
    await q.keyboard.press('Escape')
    await q.goto(`${BASE}/projects/${ben}/invoices/${sql(`select id from project_invoices where number='INV-2026-006'`)}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1500)
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= 390) && /S\$20,784\.94/.test(await q.locator('[data-testid="invoice-total"]').innerText()), 'the invoice page on a phone')
    await q.screenshot({ path: path.join(dir, 'phone-invoice-390.png'), fullPage: true })
    await m.close()
  } finally {
    as('dane')
    /* the invoices exactly as they were */
    sql(`delete from project_invoices`)
    for (const r of invoicesBefore) sql(`insert into project_invoices (${Object.keys(r).join(',')}) values (${Object.values(r).map(lit).join(',')})`)
    /* the variation orders it made, and Aisha's VO-1 as it was */
    const made = sql(`select id from quotes where kind='variation'`).split('\n').filter((id) => id && !vosBefore.includes(id))
    for (const id of made) { sql(`delete from quote_items where quote_id='${id}'`); sql(`delete from notifications where quote_id='${id}'`); sql(`delete from quotes where id='${id}'`) }
    if (aishaVo) sql(`update quotes set ${['status', 'visibility', 'sent_at', 'client_sent_at', 'confirmed_at', 'confirmed_by', 'confirmed_via', 'confirmed_marked_by', 'updated_at'].map((k) => `${k} = ${lit(aishaVo[k])}`).join(', ')} where id='${aishaVo.id}'`)
    /* the settings, its trail and its bell rows */
    sql(`delete from settings where key in ('project_invoices','invoice_numbering')`)
    for (const r of settingsBefore) sql(`insert into settings (${Object.keys(r).join(',')}) values (${Object.values(r).map(lit).join(',')})`)
    sql(`delete from lead_events where at >= ${T0} and (kind like 'project_vo_%' or kind like 'project_invoice_%' or kind = 'project_money_rebalanced')`)
    sql(`delete from notifications where created_at >= ${T0} and kind in ('invoice_review','invoice_sent_back','variation_approved','quote_confirmed','invoice_sent','invoice_approved')`)   // (parity map, a deliberate change of this rule) UC-098: a send tells Owners and Admins (`invoice_sent`)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
