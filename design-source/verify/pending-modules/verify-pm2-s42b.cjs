// S42B · the closing audit's fixes for leads and sales documents (audit-B.md B-01…B-24, calls B·1…B·5; audit E's E-05 and audit D's D-08 /
// D·2 — the one quote reader). Each fix asserted as the rule it builds, never another round's count:
//  - B-01 a signing link waits while the quote it signs is being revised: the page, the quote view, the set's page and the link card say "Not
//    ready yet"; a signature sent while it waits is refused and nothing is signed; Mark as signed says why; the Revise dialog says so first
//  - B-02 the studio's own browser never stamps "Viewed" on a client link; a client's browser does
//  - B-03 the signing code says no text goes while the stand-in answers (the page, the record, the studio's Send dialog)
//  - B-04 Settings › Lead management counts the viewer's own leads (Who sees leads)
//  - B-05 a home's lead prints no company; B-06 the UEN is checked; B-07 phones stay whole and grouped; B-08 an appeal taken back says so;
//    B-09 the terms name Send appeal; B-10 a passed appeal window says its day; B-11 Maison AI says why a move is refused, in the row;
//    B-12 the Lead stages card says it is read-only; B-13 ⌘K finds Lead stages; B-14 no match that changes nothing; B-15 the brief's quantity;
//    B-16 a new agreement names the quote the client has; B-17 a PDF contract is remembered for its loader; B-18 one mobile, one person;
//    B-19 no Write with AI on a signed contract; B-20 the section's own title; B-21 names wrap at 768 touch; B-22 a tidy template name;
//    B-23 a view-only link is said made once it is shared; B-24 a revision's confirmation link says it is being updated
//  - E-05 · B·4 · D-08 a PDF is read from its own words — never its name — in Create Quote, the trial, the VO upload and X-Ray
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s42b.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42b')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
const REPO = path.join(__dirname, '../../..')
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 's42b-'))

/* the demo's records (fixed ids) */
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838', C_OLIVIA = '81463786-769d-42aa-b226-192081cfd6e6', Q_OLIVIA = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'   // OM-10001
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q_SERENA = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'   // OM-10007, Sent to Client
const C_RYAN = '301fe7ef-3cd9-47bb-a159-daacd92d7408'          // a signed contract
const ARJUN = '3e25b972-1d28-4184-bdcc-e6655ef893a5', RET_ARJUN = 'f9cf21a5-7cfd-4d02-829b-6cbea7fe788f'   // a rejected return, 7 days to appeal
const P1 = 'e920e218-7c5b-4ff9-a27b-e62d73c99367'               // P-2026-001 (Ryan)
const BUNDLE = 'probe-s42b-bundle-0001'

/* every row this probe touches, whole — put back column by column (an UPDATE, so nothing cascades) */
const BK = []
const backup = (table, where) => { const t = `s42b_bk_${BK.length}`; sql(`drop table if exists ${t}; create table ${t} as select * from ${table} where ${where}`); BK.push({ t, table, where }) }
const restoreAll = () => {
  for (const { t, table } of BK.slice().reverse()) {
    const cols = sql(`select group_concat('"' || name || '"', ',') from pragma_table_info('${table}')`)
    sql(`update ${table} set (${cols}) = (select ${cols} from ${t} where ${t}.id = ${table}.id) where id in (select id from ${t}); insert or ignore into ${table} select * from ${t}; drop table ${t}`)
  }
}
/** A one-page PDF with lines of text (Helvetica) — what pdf.js reads; `lines` empty = a PDF with no words. */
function makePdf(lines) {
  const esc = (s) => s.replace(/([()\\])/g, '\\$1')
  const ops = lines.map((s, i) => `BT /F1 9 Tf 40 ${800 - i * 14} Td (${esc(s)}) Tj ET`).join('\n')
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(ops, 'latin1')} >>\nstream\n${ops}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
const file = (name, buf) => { const p = path.join(FILES, name); fs.writeFileSync(p, buf); return p }
const EMPTY_STANLEY = file('Stanley flat quote.pdf', Buffer.from('%PDF-1.4\n%probe: an empty file named like a reference\n'))
const EMPTY_DYEL = file('Dyel Sales Contract.pdf', makePdf([]))
const COVE_RENAMED = file('my old quote.pdf', fs.readFileSync(path.join(REPO, 'public/uat-files/cove-interior-quotation.pdf')))
const URBAN = path.join(REPO, 'public/uat-files/urban-nest-competitor-quote.pdf')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const vis0 = sql(`select value from settings where key = 'lead_visibility'`)
  const ledger0 = sql(`select count(*) from credit_ledger`)
  backup('quotes', `id in ('${Q_OLIVIA}', '${Q_SERENA}')`)
  backup('contracts', `id in ('${C_OLIVIA}', '${C_RYAN}')`)
  backup('leads', `id in ('${OLIVIA}', '${SERENA}', '${ARJUN}')`)
  backup('lead_returns', `id = '${RET_ARJUN}'`)
  backup('studio_credit_balances', '1 = 1')
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ')
  const menuItem = (p, name) => p.getByRole('menuitem', { name, exact: false }).first()
  const tick = async (pg) => { const g = pg.getByTestId('gate-accept'); if (await g.count()) await g.locator('label, [role="checkbox"], input').first().click({ force: true }) }
  const caseTrust = async (pg) => { const t = pg.getByTestId('gate-casetrust-tick'); if (await t.count()) { await t.first().scrollIntoViewIfNeeded().catch(() => {}); await t.first().click().catch(() => {}); await settle(pg, 300) } }
  const readToEnd = async (pg) => { await pg.getByTestId('paper-end').scrollIntoViewIfNeeded().catch(() => {}); await settle(pg, 600) }

  try {
    as('dane')
    const D = await desk({ permissions: ['clipboard-read', 'clipboard-write'] }); await D.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }))
    const d = await page(D, 'desk')
    await go(d, '/leads')   // the studio's browser: it has opened a studio page

    // ── B-01 · a signing link waits while its quote is being revised ─────────────────────────────────────────────────────────────
    console.log('B-01 · A signing link waits while the quote it signs is revised')
    const TOKEN = 'probeS42bSignToken0001'
    sql(`update quotes set status = 'Sent to Client', version = 1, client_sent_at = coalesce(client_sent_at, strftime('%s','now')), sent_at = coalesce(sent_at, strftime('%s','now')) where id = '${Q_OLIVIA}'`)
    sql(`update contracts set status = 'Sent to Client', sent_at = strftime('%s','now'), sign_token = '${TOKEN}', sign_expires_at = strftime('%s','now') + 7*86400, from_quote_id = '${Q_OLIVIA}', recipient_phone = '91234567', viewed_at = null, requires_scroll = 0, bundle_id = null where id = '${C_OLIVIA}'`)
    const C = await desk(); const cp = await page(C, 'client')   // the client's own browser
    await go(cp, `/sign/${TOKEN}`)
    ok(await cp.locator('[data-testid="signing-page"][data-state="open"]').count() === 1, 'while the quote is with the client, the agreement opens for signing')
    ok(sql(`select viewed_at is not null from contracts where id = '${C_OLIVIA}'`) === '1', 'B-02: the client’s own browser stamps Viewed')
    await readToEnd(cp); await tick(cp); await caseTrust(cp)
    await cp.getByRole('button', { name: 'Send code' }).first().click(); await settle(cp, 1200)
    /* B-03: the code step says no text goes, and never "Code sent" */
    ok(/Demo only — no text is sent: any six digits sign it\./.test(await text(cp.getByTestId('sign-code-demo'))), 'B-03: the code step says “Demo only — no text is sent: any six digits sign it.”')
    ok(!/Code sent/.test(await snackText(cp)) && await cp.getByRole('button', { name: 'Send again' }).count() === 0, 'B-03: no “Code sent” snackbar and no Send again while no text goes')
    ok(!/We sent a six-digit code/.test(await text(cp.locator('body'))), 'B-03: never “We sent a six-digit code”')
    await shot(cp, 'b03-code-demo-1440')
    await cp.getByLabel('One-time code').fill('123456'); await cp.getByRole('button', { name: 'Verify' }).click(); await settle(cp, 400)
    await cp.getByLabel('Your full name').fill('Olivia Martinez')
    /* the studio starts version 2 now — the quote goes back to Draft while the client is on the last step */
    sql(`update quotes set status = 'Draft', version = 2, client_sent_at = null, sent_at = null where id = '${Q_OLIVIA}'`)
    await cp.getByRole('button', { name: 'Sign contract' }).click(); await settle(cp, 2500)   // (the close-out 2026-10-28, a deliberate change) C-52: "contract" on the signing pages
    ok(sql(`select status from contracts where id = '${C_OLIVIA}'`) === 'Sent to Client' && sql(`select status from quotes where id = '${Q_OLIVIA}'`) === 'Draft', 'a signature sent while the quote is revised is refused — nothing is signed, the draft never becomes the signed quote')
    ok(await cp.locator('[data-testid="link-notice"][data-state="quote-updating"]').count() === 1 && /updating the quote this contract signs/.test(await text(cp.getByTestId('link-notice'))), 'the page now says “Not ready yet — … is updating the quote this contract signs”')   // (the close-out 2026-10-28, a deliberate change) C-52: "contract" on the signing pages
    await shot(cp, 'b01-sign-waits-1440')
    await go(cp, `/sign/${TOKEN}/quote`)
    ok(await cp.locator('[data-testid="link-notice"][data-state="quote-updating"]').count() === 1 && await cp.locator('[data-testid="sign-quote-view"] [class*="stage"]').count() === 0, '/sign/<token>/quote shows the notice, never the draft')
    const card = await (await C.request.get(`${BASE}/sign/${TOKEN}`, { headers: { 'user-agent': 'WhatsApp/2.23.20.0 A' } })).text()
    ok(/updating the quote this contract signs/.test(card), 'the link’s chat card says it too')   // (the close-out 2026-10-28, a deliberate change) C-52: "contract" on the signing pages
    /* a set's page waits the same */
    sql(`insert or replace into contract_bundles (id, lead_id, recipient_name, recipient_phone, created_at, sent_at, sign_expires_at) values ('${BUNDLE}', '${OLIVIA}', 'Olivia Martinez', '91234567', strftime('%s','now'), strftime('%s','now'), strftime('%s','now') + 7*86400)`)
    sql(`update contracts set bundle_id = '${BUNDLE}', bundle_position = 0 where id = '${C_OLIVIA}'`)
    await go(cp, `/sign/bundle/${BUNDLE}`)
    ok(await cp.locator('[data-testid="link-notice"][data-state="quote-updating"]').count() === 1 && /the quote these documents sign/.test(await text(cp.getByTestId('link-notice'))), 'a set of documents waits the same — “… the quote these documents sign”')
    sql(`update contracts set bundle_id = null, bundle_position = null where id = '${C_OLIVIA}'; delete from contract_bundles where id = '${BUNDLE}'`)
    /* the studio's own mark waits too */
    await go(d, `/contracts/${C_OLIVIA}`)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 300)
    await menuItem(d, 'Mark as signed').click(); await settle(d, 600)
    await d.getByRole('dialog').getByRole('button', { name: 'Mark as signed' }).click(); await settle(d, 1500)
    { const said = await snackText(d); ok(/its quote OM-10001 is being revised — send version 2 to the client first/.test(said) && sql(`select status from contracts where id = '${C_OLIVIA}'`) === 'Sent to Client', `Mark as signed says why it waits — “${said}”`) }
    await d.keyboard.press('Escape'); await settle(d, 300)
    /* back with the client: the link opens again */
    sql(`update quotes set status = 'Sent to Client', client_sent_at = strftime('%s','now'), sent_at = strftime('%s','now') where id = '${Q_OLIVIA}'`)
    await go(cp, `/sign/${TOKEN}`)
    ok(await cp.locator('[data-testid="signing-page"][data-state="open"]').count() === 1, 'version 2 sent: the same link opens for signing again')
    /* the Revise dialog says it before the press */
    await go(d, `/quotes/${Q_OLIVIA}`); await settle(d, 1200)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 300)
    await menuItem(d, 'Revise — new version').click(); await settle(d, 700)
    const rev = d.getByRole('dialog', { name: /Start version 3\?/ })
    ok(/Olivia’s signing link for Interior Design Service Agreement waits until version 3 is sent\./.test(await text(rev)), 'the Revise dialog says it first: “Olivia’s signing link for … waits until version 3 is sent.”')
    await shot(d, 'b01-revise-warns-1440')
    await rev.getByRole('button', { name: 'Not now' }).click(); await settle(d, 300)

    // ── B-02 · the studio's own browser never stamps Viewed ─────────────────────────────────────────────────────────────────────
    console.log('B-02 · A studio member checking a client link is not the client')
    sql(`update contracts set viewed_at = null where id = '${C_OLIVIA}'`)
    const dv = await page(D, 'desk-view'); await go(dv, `/sign/${TOKEN}`); await dv.close()
    ok(sql(`select quote(viewed_at) from contracts where id = '${C_OLIVIA}'`) === 'NULL', 'the studio’s browser opening the signing link leaves it unviewed')
    const ctoken = sql(`select confirm_token from quotes where id = '${Q_SERENA}'`)
    sql(`update quotes set client_viewed_at = null, client_last_viewed_at = null, client_view_count = 0 where id = '${Q_SERENA}'`)
    const dc = await page(D, 'desk-confirm'); await go(dc, `/confirm/${ctoken}`); await settle(dc, 800); await dc.close()
    ok(sql(`select client_view_count from quotes where id = '${Q_SERENA}'`) === '0', 'the studio’s browser opening the confirmation link counts nothing')
    await go(cp, `/confirm/${ctoken}`); await settle(cp, 800)
    ok(sql(`select client_view_count from quotes where id = '${Q_SERENA}'`) === '1', '…the client’s own browser counts the open')

    // ── B-03 · the studio's Send dialog and the signing record ──────────────────────────────────────────────────────────────────
    console.log('B-03 · The studio hears the code is a demo too')
    sql(`update contracts set status = 'Draft', sent_at = null, sign_expires_at = null where id = '${C_OLIVIA}'`)
    await go(d, `/contracts/${C_OLIVIA}`); await settle(d, 900)
    await d.getByRole('button', { name: /^Send$/ }).first().click(); await settle(d, 800)
    /* (the calm UI build 2026-10-27, a deliberate change) 4-20 · W-448: the dialog is "Send for signature" and its head says one line; how the
       client confirms (the demo's note among it) waits under "How signing works" — the house Tooltip on the desk */
    const sendDlg = d.getByRole('dialog', { name: 'Send for signature' })
    await sendDlg.getByTestId('send-how').getByRole('button', { name: /How signing works/ }).hover(); await settle(d, 500)
    ok(/demo only: no text is sent, any six digits sign it/.test(await d.locator('[role="tooltip"]').last().innerText().catch(() => '')), 'the Send dialog says how the client confirms — demo only, no text is sent')
    await shot(d, 'b03-send-dialog-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, `/contracts/${C_RYAN}`); await settle(d, 900)

    // ── B-19 · a signed contract has no Write with AI ──────────────────────────────────────────────────────────────────────────
    console.log('B-19 · A signed contract’s bar')
    ok(await d.getByTestId('contract-writing').count() === 0 && await d.getByRole('button', { name: /Write with AI/ }).count() === 0, 'no Write with AI on a signed contract')
    /* (the calm UI build 2026-10-27, a deliberate change) 4-18 · REG-B4.104: a signed contract's bar shows no formatting tools at all (they were
       greyed and did nothing) — only the Outline toggle, so a closed Outline still opens; the banner still says why */
    const lockedBar = d.locator('[role="toolbar"][aria-label="Document"][data-locked]')
    ok(await lockedBar.count() === 1 && await d.getByRole('button', { name: 'Bold' }).count() === 0 && await lockedBar.getByRole('button', { name: /Outline/ }).count() === 1 && /this copy is locked|kept as it was/.test(await d.getByTestId('contract-banner').first().innerText().catch(() => '')), 'the format tools rest greyed (disabled colour), the banner says why')
    await shot(d, 'b19-signed-bar-1440')

    // ── B-04 · Settings counts follow Who sees leads ───────────────────────────────────────────────────────────────────────────
    console.log('B-04 · Lead stages counts the viewer’s own leads')
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now'))`)
    as('germaine')
    await go(d, '/settings?section=leads#lead-stages'); await settle(d, 900)
    const mine = (stage) => sql(`select count(*) from leads l where l.deleted_at is null and coalesce(l.direct, 0) = 0 and l.stage = '${stage}' and exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = 'germaine')`)
    const shown = async (slug) => { const t = await text(d.getByTestId(`lead-stage-${slug}`)); const m = /(\d+) leads?/.exec(t); return m ? m[1] : /No leads/.test(t) ? '0' : '?' }
    ok(await shown('new') === mine('New') && await shown('contacted') === mine('Contacted'), `a Designer who sees only her leads is shown her own counts (New ${await shown('new')} = ${mine('New')} · Contacted ${await shown('contacted')} = ${mine('Contacted')})`)
    // ── B-12 · read-only, said in the card ──
    ok(/Only Owners and Admins change the lead settings/.test(await text(d.getByTestId('lead-stages').getByTestId('read-only-line'))), 'B-12: the Lead stages card says it is read-only for her, in the card')
    await shot(d, 'b04-b12-germaine-1440')
    sql(vis0 ? `update settings set value = '${vis0.replace(/'/g, "''")}' where key = 'lead_visibility'` : `delete from settings where key = 'lead_visibility'`)
    as('dane')

    // ── B-13 · ⌘K finds Lead stages ──
    await go(d, '/leads')
    await d.keyboard.press('Meta+k'); await settle(d, 400)
    await d.getByRole('combobox', { name: 'Search the studio' }).fill('manage stages'); await settle(d, 900)
    const opt = d.getByRole('dialog', { name: 'Search' }).getByRole('option', { name: /Lead stages/ })
    ok(await opt.count() >= 1, 'B-13: ⌘K “manage stages” finds Lead stages')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── B-05 · B-06 · the company prints only for a commercial lead; the UEN is checked ─────────────────────────────────────────
    console.log('B-05 · B-06 · Company and UEN')
    sql(`update leads set property_type = 'BTO 4-Room', company_name = 'Probe Trading', company_uen = 'ABC' where id = '${OLIVIA}'`)
    sql(`update contracts set status = 'Draft' where id = '${C_OLIVIA}'`)
    await go(d, `/contracts/${C_OLIVIA}`); await settle(d, 900)
    await d.getByRole('button', { name: 'Insert a field' }).first().click(); await settle(d, 400)
    await d.getByRole('menuitem', { name: /Client/ }).first().click(); await settle(d, 400)
    const companyRow = d.getByRole('menuitem', { name: /Company/ }).first()
    ok(/Empty/.test(await text(companyRow)) && !/Probe Trading/.test(await text(d.getByRole('menu').first())), 'B-05: a home’s lead prints no company — the record keeps it, the papers don’t')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, `/leads/${OLIVIA}`); await settle(d, 900)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 300)
    await menuItem(d, 'Edit').click(); await settle(d, 900)
    const form = d.getByRole('dialog').first()
    await form.getByRole('combobox', { name: /Property type/ }).first().click().catch(() => {}); await settle(d, 300)
    await d.getByRole('option', { name: /Commercial/ }).first().click().catch(async () => { await d.getByRole('menuitemradio', { name: /Commercial/ }).first().click().catch(() => {}) }); await settle(d, 400)
    const uen = form.getByLabel('UEN')
    await uen.fill('abc'); await form.getByRole('button', { name: 'Save' }).click(); await settle(d, 900)
    ok(/Enter a valid UEN, e\.g\. 201912345K/.test(await text(form)) && sql(`select company_uen from leads where id = '${OLIVIA}'`) === 'ABC', 'B-06: “abc” is refused under the field — “Enter a valid UEN, e.g. 201912345K” — and nothing saves')
    await shot(d, 'b06-uen-1440')
    await uen.fill('201912345K'); await form.getByRole('button', { name: 'Save' }).click(); await settle(d, 1800)
    ok(sql(`select company_uen from leads where id = '${OLIVIA}'`) === '201912345K', 'B-06: an ACRA-shaped UEN saves')

    // ── B-07 · B-08 · phones whole and grouped; an appeal taken back ──
    console.log('B-07 · B-08 · Activity and the info column')
    sql(`update leads set client2_name = 'Daniel Martinez', client2_phone = '91110000' where id = '${OLIVIA}'`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail) values ('probe-s42b-ev1', '${OLIVIA}', 'field_edited', 'dane', strftime('%s','now'), '{"fields":[{"key":"client2Phone","label":"Second client’s mobile","from":"—","to":"91110000"}]}')`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail) values ('probe-s42b-ev2', '${ARJUN}', 'return_undone', 'dane', strftime('%s','now'), '{"reason":"Not responding","kind":"appeal"}')`)
    await go(d, `/leads/${OLIVIA}/activity`)
    ok(/Second client’s mobile: — → 9111 0000/.test(await text(d.locator('main'))), 'B-07: Activity prints the mobile grouped — “9111 0000”')
    await go(d, `/leads/${ARJUN}/activity`)
    ok(/took back the appeal to Qanvast/.test(await text(d.locator('main'))), 'B-08: undoing an appeal reads “… took back the appeal to Qanvast.”')
    const M = await phoneCtx(320, 700)
    await go(d, `/leads/${OLIVIA}`); await settle(d, 900)
    const second = d.getByTestId('lead-second-client').first()
    if (await second.count()) { await second.scrollIntoViewIfNeeded().catch(() => {}) }
    const phoneSpan = second.locator('span').filter({ hasText: /^9111 0000$/ }).first()
    ok(await phoneSpan.count() === 1 && await phoneSpan.evaluate((el) => getComputedStyle(el).whiteSpace === 'nowrap' && el.getClientRects().length === 1), 'B-07: the second client’s number stays whole on one line (the info column at 1440)')
    await second.screenshot({ path: path.join(dir, 'b07-phone-1440.png') }).catch(() => {})

    // ── B-09 · B-10 · the appeal's words ──
    console.log('B-09 · B-10 · The appeal')
    sql(`update lead_returns set replied_at = strftime('%s','now') - 47*86400, appeal_days = 7 where id = '${RET_ARJUN}'`)
    await go(d, `/leads/${ARJUN}`)
    const banner = d.locator('section[data-card="lead-returned"] button').filter({ hasText: /appeal/ }).first()
    ok(/Qanvast’s 7 days ran to \d{1,2} \w{3} ’\d\d — it may still look at an appeal/.test(await text(banner)), 'B-10: a passed window says the day it ran to — “Qanvast’s 7 days ran to …”')
    await shot(d, 'b10-appeal-passed-1440')
    await banner.click(); await settle(d, 1500)
    const aw = d.getByRole('dialog', { name: 'Appeal the return' })
    ok(/Qanvast’s 7 days ran to/.test(await text(aw.getByTestId('return-window'))), 'B-10: the appeal’s rules line says it too')
    const next = aw.getByRole('button', { name: /^Next$/ })
    if (await next.count()) { await next.click(); await settle(d, 700) }
    ok(/By clicking “Send appeal”, you agree/.test(await text(aw)), 'B-09: the terms name the button they sit over — “Send appeal”')
    await d.keyboard.press('Escape'); await settle(d, 400)
    sql(`update lead_returns set replied_at = strftime('%s','now') - 86400 where id = '${RET_ARJUN}'`)
    await go(d, `/leads/${ARJUN}`)
    ok(/Submit an appeal within 7 days/.test(await text(d.locator('section[data-card="lead-returned"]'))), 'B-10: while the window is open the mock’s sentence stays')

    // ── B-11 · Maison AI says why a move is refused ──
    console.log('B-11 · Maison AI and the stage rules')
    await go(d, '/leads')
    await d.getByRole('button', { name: 'Maison AI', exact: true }).last().click(); await settle(d, 500)
    const sheet = d.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
    const askBox = sheet.locator('[data-testid="maison-ask"] input')
    await askBox.fill('Move Ryan D’Souza to Lost'); await askBox.press('Enter')
    await d.waitForFunction(() => !!document.querySelector('[data-testid="maison-answer"]') && !/Looking through your records/.test(document.querySelector('[data-testid="maison-answer"]').textContent || ''), null, { timeout: 15000 }).catch(() => {})
    await settle(d, 400)
    const ansRow = sheet.locator('[data-testid="maison-answer"] [data-testid="maison-row"]').first()
    ok(/can’t move to Lost yet/.test(await text(ansRow)) && /Has project P-2026-001 — it stays Won/.test(await text(ansRow)), 'a move the rules refuse is a row that says why — “Ryan D’Souza can’t move to Lost yet · Has project P-2026-001 — it stays Won”')
    await shot(d, 'b11-maison-refused-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── B-14 · no match that changes nothing ──
    console.log('B-14 · Match lines')
    const item = sql(`select name || '|' || cost_minor || '|' || coalesce(unit, '') || '|' || coalesce(category, '') from price_book_items where id = 'cfc440c4-5e54-4ee5-a0d1-2495c349a6b4'`).split('|')
    sql(`update quotes set status = 'Draft' where id = '${Q_OLIVIA}'`)
    sql(`insert into quote_items (id, quote_id, parent_id, kind, position, name, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, category, visibility, collapsed, created_at, updated_at) values ('probe-s42b-line', '${Q_OLIVIA}', null, 'item', 999, '${item[0]}', 'Pending', 1, '${item[2]}', ${item[1]}, 500, 0, 9, '${item[3]}', 'visible', 0, strftime('%s','now'), strftime('%s','now'))`)
    await go(d, `/quotes/${Q_OLIVIA}`); await settle(d, 1500)
    const matchLinks = async () => { const l = d.getByTestId('match-link'); return (await l.count()) ? await text(l.first()) : '' }
    ok(!/Match 1 line|Match \d+ lines/.test(await matchLinks()) && await d.getByTestId('items-table').count() + await d.locator('#section-items').count() >= 1, `B-14: a line at the item’s own cost is no match to offer (“${await matchLinks()}”)`)
    sql(`update quote_items set cost_minor = ${Number(item[1]) + 700} where id = 'probe-s42b-line'`)
    await go(d, `/quotes/${Q_OLIVIA}`); await settle(d, 1500)
    ok(/Match 1 line/.test(await matchLinks()), '…the same line at another cost is still offered — “Match 1 line”')
    sql(`delete from quote_items where id = 'probe-s42b-line'`)

    // ── B-20 · the writing help's words ──
    {
      const notes0 = sql(`select quote(notes_html) from quotes where id = '${Q_OLIVIA}'`)
      await go(d, `/quotes/${Q_OLIVIA}`); await settle(d, 1200)
      const sec = d.locator('#section-notes')
      if (!(await sec.locator('[contenteditable]').count())) { await sec.getByText('Additional notes', { exact: true }).first().click(); await settle(d, 600) }   // (the calm UI build 2026-10-27, a deliberate change) W-200 · T-13: the section's title is "Additional notes"
      await sec.scrollIntoViewIfNeeded()
      await sec.getByTestId('writing-help').click(); await settle(d, 400)
      await d.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Add what’s missing' }).click(); await settle(d, 700)
      await d.getByTestId('writing-use').click(); await settle(d, 1500)
      const said = await snackText(d)
      ok(/Added to Additional notes/.test(said), `B-20: the snackbar keeps the section’s own title — “${said.replace(/\s*Undo.*$/, '')}”`)   // (the calm UI build 2026-10-27, a deliberate change) the same rule on the title's new words, "Additional notes" (W-200)
      sql(`update quotes set notes_html = ${notes0} where id = '${Q_OLIVIA}'`)
    }

    // ── B-15 · B-21 · Draft with Maison AI ──
    console.log('B-15 · B-21 · Draft with Maison AI')
    await go(d, `/leads/${SERENA}/quotes`)
    await d.getByRole('button', { name: /* (the calm UI build 2026-10-27, a deliberate change) 1-11: "New quote" */ 'New quote' }).first().click(); await settle(d, 800)
    await d.getByTestId('draft-quote-row').click(); await settle(d, 500)
    await d.getByTestId('draft-brief').locator('textarea').fill('Install 6 downlights in the living room'); await settle(d, 2500)
    const rows = d.getByTestId('draft-row')
    const elec = rows.filter({ hasText: /Electrical point, new/ }).first()
    ok(await elec.count() === 1 && /\b6\b/.test(await text(elec.locator('[role="cell"]').nth(2))), 'B-15: “6 downlights” drafts the electrical point at a quantity of 6')
    ok(/at a quantity of 1 unless you gave one/.test(await text(d.getByTestId('draft-quote'))), '…and the help line says so')
    await shot(d, 'b15-draft-qty-1440')
    await d.keyboard.press('Escape'); await settle(d, 400)
    const T = await phoneCtx(768, 1024); const t = await page(T, 'tablet')
    await go(t, `/leads/${SERENA}/quotes`)
    await t.getByRole('button', { name: /* (the calm UI build 2026-10-27, a deliberate change) 1-11: "New quote" */ /New quote/ }).first().click(); await settle(t, 800)
    await t.getByTestId('draft-quote-row').click(); await settle(t, 500)
    await t.getByTestId('draft-brief').locator('textarea').fill('Hack and re-tile both bathrooms, paint the whole flat'); await settle(t, 2500)
    const cell = t.getByTestId('draft-row').first().locator('[role="cell"]').nth(1)
    ok(await cell.evaluate((el) => getComputedStyle(el).whiteSpace) === 'normal', 'B-21: at 768 touch the item’s name wraps, never “…”')
    await shot(t, 'b21-draft-768')
    await T.close()

    // ── E-05 · B·4 · a PDF read from its own words, never its name — Create Quote ──
    console.log('E-05 · B·4 · Upload a quote reads a PDF’s words, never its name')
    const upload = async (p, f) => {
      await go(p, `/leads/${SERENA}/quotes`)
      await p.getByRole('button', { name: /* (the calm UI build 2026-10-27, a deliberate change) 1-11: "New quote" */ 'New quote' }).first().click(); await settle(p, 800)
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByTestId('upload-quote-row').click()])
      await fc.setFiles(f); await settle(p, 3000)
      return p.getByTestId('upload-quote')
    }
    ok(/* (the calm UI build 2026-10-27, a deliberate change) W-016 · 1-11: "Spreadsheet or PDF · 5 credits", "New quote" */ /Spreadsheet or PDF · 5 credits/i.test(await text((await (async () => { await go(d, `/leads/${SERENA}/quotes`); await d.getByRole('button', { name: 'New quote' }).first().click(); await settle(d, 800); return d.getByTestId('upload-quote-row') })()))), 'the Upload row says what it reads: XLSX · CSV · PDF')
    await d.keyboard.press('Escape'); await settle(d, 300)
    let box = await upload(d, EMPTY_STANLEY)
    ok(/We couldn’t read Stanley flat quote\.pdf/.test(await text(box)) && !/Cove Interior/.test(await text(box)) && await d.getByRole('button', { name: 'Create the quote' }).isDisabled(), 'an empty PDF NAMED like a reference reads nothing — never the demo’s Cove quote')
    ok(/Your 5 AI credits are back/.test(await text(box)), '…and its 5 AI credits are back')
    await shot(d, 'e05-empty-named-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)
    box = await upload(d, URBAN)
    ok(/23 items\s*read from Urban Nest Design & Renovation’s quote · S\$40,210\.00/.test(await text(box)), 'a text PDF reads from its own words, by rule — 23 lines, S$40,210.00')   // (the calm UI build 2026-10-27, a deliberate change) §2 · 4-28: a quote's lines read as "items"
    await shot(d, 'e05-pdf-read-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)
    box = await upload(d, COVE_RENAMED)
    ok(/20 items\s*read from Cove Interior’s quote · S\$42,680\.00/.test(await text(box)), 'the sample Cove quote renamed “my old quote.pdf” is still Cove’s — recognised by what it says')   // (the calm UI build 2026-10-27, a deliberate change) §2 · 4-28: a quote's lines read as "items"
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── E-05 · the website's free trial ──
    const V = await desk(); const v = await page(V, 'visitor')
    await go(v, '/site/try/upload-a-quote')
    const vin = v.getByTestId('trial-quote-pick').locator('input[type="file"]')
    ok(await vin.getAttribute('accept') === '.xlsx,.csv,.pdf', 'the trial takes what it reads for real — XLSX, CSV, PDF (no photos accepted only to be refused)')
    await vin.setInputFiles(EMPTY_STANLEY); await settle(v, 3000)
    ok(await v.getByTestId('trial-quote-failed').count() === 1 && !/Cove Interior|42,680/.test(await text(v.locator('main'))), 'the trial: an empty PDF named like a reference reads nothing — never the demo’s quote to keep')
    await shot(v, 'e05-trial-empty-1440')
    await v.getByTestId('trial-quote-pick').locator('input[type="file"]').setInputFiles(URBAN); await settle(v, 3500)
    ok(/23 items\s*read from Urban Nest/.test(await text(v.locator('main'))), 'the trial: a text PDF reads from its own words')   // (the calm UI build 2026-10-27, a deliberate change) §2 · 4-28: a quote's lines read as "items"
    await V.close()

    // ── D-08 · the VO upload ──
    console.log('D-08 · D·2 · The VO upload')
    await go(d, `/projects/${P1}/money`); await settle(d, 1200)
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 400)
    /* (the calm UI build 2026-10-27, a deliberate change) 3-26 · T-05: New ▾ is five kinds with no helper lines; a kind made more than one way
       opens its ways in place — Variation order › From a contractor’s quote. The rule stays: the way promises nothing the dialog doesn't read
       (no photo), and the dialog says it reads a spreadsheet or a PDF */
    await d.getByRole('menuitem', { name: /^Variation order$/ }).first().click(); await settle(d, 400)
    const voRow = d.getByTestId('money-new-level').getByRole('menuitem', { name: /From a contractor’s quote/ }).first()
    const voRowWords = await text(voRow)
    await voRow.click(); await settle(d, 800)
    const vo = d.getByTestId('vo-upload-dialog')
    const voDlg = await text(d.getByRole('dialog', { name: 'Variation order from a contractor’s quote' }))
    ok(!/photo/i.test(voRowWords) && /a spreadsheet of its lines \(XLSX · CSV\) or a PDF/.test(voDlg) && !/photo/i.test(voDlg), 'the menu says what the dialog reads — “a spreadsheet or a PDF”')
    ok(/XLSX · CSV · PDF · 5 AI credits/.test(await text(vo)), 'the drop zone: XLSX · CSV · PDF · 5 AI credits')
    await vo.locator('input[type="file"]').setInputFiles(URBAN); await settle(d, 3500)
    ok(/* (the calm UI build 2026-10-27, a deliberate change) T-01: a quote's lines read as "items" */ /23 items\s*read from Urban Nest/.test(await text(d.getByTestId('vo-upload-read'))), 'a contractor’s PDF quote reads from its own words')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── E-05 · X-Ray ──
    await go(d, '/quote-x-ray'); await settle(d, 900)
    const otherIn = d.getByTestId('xray-setup').locator('input[type=file]').last()
    await otherIn.setInputFiles(EMPTY_DYEL); await settle(d, 2200)
    ok(!/read from Dyel’s quote/.test(await text(d.getByTestId('xray-setup'))) && /no words to read|couldn’t read/i.test(await text(d.getByTestId('xray-setup'))), 'X-Ray: a PDF named “Dyel Sales Contract.pdf” with nothing in it is not read as Dyel’s')

    // ── B-16 · a new agreement names the quote the client has ──
    console.log('B-16 · B-23 · B-24 · Serena’s quote')
    sql(`drop table if exists s42b_q; create table s42b_q as select * from quotes where id = '${Q_SERENA}'; update s42b_q set id = 'probe-s42b-draft', number = 'OM-PROBE', status = 'Draft', created_at = strftime('%s','now'), updated_at = strftime('%s','now'), confirm_token = 'probeS42bDraftConfirm01', view_token = null, view_token_at = null, sent_at = null, client_sent_at = null; insert into quotes select * from s42b_q; drop table s42b_q`)
    const before = sql(`select group_concat(id) from contracts where lead_id = '${SERENA}'`)
    await go(d, `/leads/${SERENA}/contracts`); await settle(d, 900)
    const fromStudio = d.getByRole('button', { name: /From the studio agreement/ }).first()
    if (await fromStudio.count()) await fromStudio.click()
    else { await d.getByRole('button', { name: /New Contract|Create Contract/ }).first().click(); await settle(d, 400); await menuItem(d, 'From the studio agreement').click() }
    await d.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {})
    const made = sql(`select id from contracts where lead_id = '${SERENA}' and created_at >= ${T0} order by created_at desc limit 1`)
    ok(!!made && sql(`select from_quote_id from contracts where id = '${made}'`) === Q_SERENA, 'B-16: with a fresh Draft on the lead, the new agreement names OM-10007 (Sent to Client), not the Draft')
    if (made && !(before || '').includes(made)) sql(`delete from lead_tasks where contract_id = '${made}'; delete from contracts where id = '${made}'`)
    sql(`delete from quotes where id = 'probe-s42b-draft'`)

    // ── B-23 · the view-only link is said made once it is shared ──
    sql(`update quotes set view_token = null, view_token_at = null, view_token_by = null where id = '${Q_SERENA}'`)
    const viewLines = () => sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_shared' and at >= ${T0} and json_extract(detail, '$.id') = '${Q_SERENA}'`)
    await go(d, `/quotes/${Q_SERENA}`); await settle(d, 1200)
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 300)
    await menuItem(d, 'Share a view-only link').click(); await settle(d, 1500)
    ok(viewLines() === '0', 'B-23: opening Share makes the link but writes no “made” line')
    await d.keyboard.press('Escape'); await settle(d, 1200)
    ok(sql(`select quote(view_token) from quotes where id = '${Q_SERENA}'`) === 'NULL' && viewLines() === '0', 'B-23: closed before Copy or Send — the link goes again, nothing said')
    await d.getByRole('button', { name: 'More options' }).first().click(); await settle(d, 300)
    await menuItem(d, 'Share a view-only link').click(); await settle(d, 1500)
    await d.getByRole('dialog', { name: 'Share a view-only link' }).getByRole('button', { name: 'Copy link' }).click(); await settle(d, 1200)
    await d.keyboard.press('Escape'); await settle(d, 800)
    ok(viewLines() === '1' && sql(`select quote(view_token) from quotes where id = '${Q_SERENA}'`) !== 'NULL', 'B-23: copied — the link stays and the line is on the lead, once')

    // ── B-24 · a revision's confirmation link ──
    sql(`update quotes set status = 'Draft', version = 2 where id = '${Q_SERENA}'`)
    await go(cp, `/confirm/${ctoken}`)
    ok(/is updating this quote\. It’ll be back here once it’s ready\./.test(await text(cp.getByTestId('confirm-not-ready-why'))) && !/still preparing/.test(await text(cp.locator('body'))), 'B-24: a client who had version 1 reads “… is updating this quote. It’ll be back here once it’s ready.”')
    await shot(cp, 'b24-confirm-updating-1440')

    // ── B-17 · a PDF contract is remembered for its loader ──
    console.log('B-17 · B-18 · B-22')
    const ls = async (p, k) => p.evaluate((key) => { try { return localStorage.getItem(key) } catch { return null } }, k)
    sql(`update contracts set source = 'uploaded' where id = '${C_OLIVIA}'`)
    await go(d, `/leads/${OLIVIA}/contracts`); await settle(d, 800)
    ok(await ls(d, `om.shape.contract-pdf.${C_OLIVIA}`) === '1', 'B-17: the Contracts list remembers a PDF contract — its loader draws the PDF, not a written page')

    // ── B-18 · one mobile, one person ──
    ok(sql(`select count(*) from members m where m.phone is not null and m.phone <> '' and (exists (select 1 from leads l where l.deleted_at is null and (l.phone = m.phone or l.client2_phone = m.phone)) or exists (select 1 from homeowner_profiles h where h.phone = m.phone))`) === '0', 'B-18: no member shares a mobile with a client')
    ok(sql(`select count(*) from leads where name = 'Kelvin Goh' and phone = '91827364'`) === '0' && sql(`select phone from homeowner_profiles where name = 'Mei Ling Han'`) === '91827364', 'B-18: Kelvin Goh has his own number; Mei Ling Han keeps hers')

    // ── B-22 · a tidy template name ──
    await go(d, '/company/templates/quotes'); await settle(d, 900)
    await d.getByTestId('new-template').first().click(); await settle(d, 300)
    await d.getByText('Upload my existing quote', { exact: true }).click(); await settle(d, 600)
    await d.getByTestId('recreate-file').setInputFiles(file('cove interior quotation.pdf', fs.readFileSync(path.join(REPO, 'public/uat-files/cove-interior-quotation.pdf'))))
    await d.waitForSelector('[data-testid="recreate-reasons"]', { timeout: 20000 }).catch(() => {}); await settle(d, 400)
    const nameBox = d.getByRole('dialog').getByLabel(/Template name/).first()
    ok(await nameBox.inputValue().catch(() => '') === 'Cove Interior Quotation', `B-22: the template name comes in title case — “${await nameBox.inputValue().catch(() => '')}”`)
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── every width: no sideways scroll on the pages this round changed ──
    const P = await phoneCtx(390, 844); const pp = await page(P, '390')
    const at390 = [[`/sign/${TOKEN}`, 'b01-sign-390'], [`/confirm/${ctoken}`, 'b24-confirm-390'], [`/leads/${ARJUN}`, 'b10-appeal-390'], ['/site/try/upload-a-quote', 'e05-trial-390'], ['/settings?section=leads#lead-stages', 'b12-stages-390']]
    for (const [u, n] of at390) { await go(pp, u); ok(await sideways(pp) <= 0, `390: no sideways scroll on ${u.replace(TOKEN, '<token>').replace(ctoken, '<token>')}`); await shot(pp, n) }
    await P.close()
    await M.close(); await C.close(); await D.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e)
  } finally {
    /* put back every row it changed, and the lines its presses wrote */
    try {
      restoreAll()
      sql(`delete from contract_bundles where id = '${BUNDLE}'; delete from quote_items where id = 'probe-s42b-line'; delete from quotes where id = 'probe-s42b-draft'`)
      sql(`delete from lead_events where at >= ${T0} and lead_id in ('${OLIVIA}', '${SERENA}', '${ARJUN}')`)
      sql(`delete from notifications where created_at >= ${T0}`)
      sql(`delete from maison_questions where asked_at >= ${T0 * 1000}`)
      sql(`delete from credit_ledger where rowid > (select rowid from credit_ledger order by rowid limit 1 offset ${Math.max(0, Number(ledger0) - 1)})`)
      sql(vis0 ? `update settings set value = '${vis0.replace(/'/g, "''")}' where key = 'lead_visibility'` : `delete from settings where key = 'lead_visibility'`)
      sql(`update members set is_you = (id = '${you0}')`)
    } catch (e) { fail++; console.log('  ✗ could not put the records back:', String(e).slice(0, 200)) }
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
