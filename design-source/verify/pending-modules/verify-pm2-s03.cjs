// Pending modules, step S03 · Contracts leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key held:contracts).
// Each item asserted as the rule it builds, never another round's count:
//  - the signing link has a token (1.0's quote_signature_requests.token): a new contract's link is /sign/<token>, its id opens nothing; a
//    contract made before the step keeps its id as its token (old links still open); 1.0's token for a set lands on the set's page
//  - the window (1.0's 7 days): each send opens it (Settings › Quotes & pricing › Contracts sets the days); past it the client meets "This
//    link has expired", the lists say "Link expired" (red) and offer "Send the link again", the editor's banner offers Send again; a
//    reminder renews it (Activity says so); the client's portal no longer asks them to sign a dead link
//  - Stop the signing link (1.0's cancel): back to Draft, a new token, the old address dead, one sentence + Undo (the same link back);
//    the status menu's Sent → Draft is the same move
//  - the PDFs are kept: Import from File keeps the PDF (Files › Contract & VOs, its bytes), the editor and Preview show it, the client reads
//    it through the link's own address (and nothing while it is a Draft); Mark as signed keeps the signed copy and the Signed Copy cell
//    opens it; Files refuses to trash a contract's PDF and says why; a non-PDF is refused under the box
//  - the signing PDF library: Company › Templates › Contracts › Upload a PDF… makes a standard document (its own editor, Replace, no fields
//    to insert); Send together offers it under the lead's own; ticked, it joins the lead and goes out in the set, read on the set's link
//  - consent before a member's signature is stamped (1.0's auto-apply opt-in): Your profile's switch; off, the contract paper's studio box
//    prints blank and Send's check says why; Signature Settings says what Save does; the quote's Signature pane offers "Turn it on"
//  - the contract value frozen at signing: an edit to a signed quote leaves the project's contract value as signed; the quote's banner says
//    so; the value is stamped on signing
//  - the Coming soon presses: no Create with AI; Contracts Settings opens Settings › Quotes & pricing › Contracts; the heads sort
//    (A→Z, Z→A, off) and Filters says so
//  - no "Prepared with OpenMaison" on the client's paper; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s03.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s03')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
/* the demo's records (fixed ids) */
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789'          // Quote Sent, OM-10007 Sent to Client, no contracts
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838', C_OLIVIA = '81463786-769d-42aa-b226-192081cfd6e6'
const C_RYAN = '301fe7ef-3cd9-47bb-a159-daacd92d7408'          // Signed (marked), made before the step
const P1 = 'e920e218-7c5b-4ff9-a27b-e62d73c99367', Q_P1 = '1f598389-4008-4079-a956-5dff071fb708'   // P-2026-001 and its signed quote OM-10004
const RYAN = '5e8b9c29-54ef-4b56-96a4-2027804c4cd7'           // Won (P-2026-001): his Won step's details are edited, its log put back

/** A one-page PDF with a line of text (pdf.js draws its first page). */
function makePdf(text) {
  const offs = []
  let out = '%PDF-1.4\n'
  const add = (s) => { offs.push(Buffer.byteLength(out, 'latin1')); out += s }
  add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n')
  add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n')
  add('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n')
  const stream = `BT /F1 22 Tf 72 760 Td (${text}) Tj ET`
  add(`4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\n`)
  add('5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n')
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it */
  const you0 = sql(`select id from members where is_you = 1`)
  const consent0 = sql(`select id || '|' || quote(signature_consent) || '|' || quote(signature_consent_at) from members where signature_kind is not null`).split('\n').filter(Boolean)
  const rules0 = sql(`select value from settings where key = 'contract_rules'`)
  const quote0 = sql(`select amount_minor || '|' || quote(signed_amount_minor) || '|' || quote(updated_at) || '|' || quote(sections) from quotes where id = '${Q_P1}'`)
  /* Mark as signed signs the quote the contract names (REG-626) — Serena's OM-10007 — put back as it was */
  const Q_SERENA = sql(`select id from quotes where lead_id = '${SERENA}' and kind = 'quote' order by created_at desc limit 1`)
  const serenaQ0 = sql(`select quote(status) || '|' || quote(updated_at) || '|' || quote(signed_at) || '|' || quote(signed_amount_minor) || '|' || quote(visibility) || '|' || quote(client_sent_at) from quotes where id = '${Q_SERENA}'`)
  const wonLog = sql(`select id from stage_logs where lead_id = '${RYAN}' and to_stage = 'Won' order by created_at desc limit 1`)
  const wonPayload0 = sql(`select quote(payload) from stage_logs where id = '${wonLog}'`)
  const LINE = sql(`select id from quote_items where quote_id = '${Q_P1}' and kind = 'item' and coalesce(optional, 0) = 0 order by position limit 1`)
  const line0 = sql(`select qty from quote_items where id = '${LINE}'`)
  const olivia0 = sql(`select quote(status) || '|' || quote(sent_at) || '|' || quote(sign_token) || '|' || quote(sign_expires_at) || '|' || quote(bundle_id) || '|' || quote(bundle_position) || '|' || quote(recipient_name) || '|' || quote(recipient_phone) || '|' || quote(updated_at) || '|' || quote(sent_by) || '|' || quote(viewed_at) from contracts where id = '${C_OLIVIA}'`)
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const menuItem = (p, name) => p.getByRole('menuitem', { name, exact: false }).first()
  const pdfA = makePdf('Probe signed contract'), pdfB = makePdf('Probe terms and conditions')
  const pick = async (p, buf, name) => { await p.locator('[role="dialog"] input[type="file"]').first().setInputFiles({ name, mimeType: 'application/pdf', buffer: buf }); await settle(p, 2200) }
  const tokenOf = (id) => sql(`select sign_token from contracts where id = '${id}'`)
  /* the Contracts toolbar's own kebab (the lead's header has one too) */
  const listKebab = async (p) => { await p.locator('h2', { hasText: 'All Contracts' }).locator('xpath=..').getByRole('button', { name: 'More options' }).click(); await settle(p, 400) }
  /* a row's kebab rests until the row is hovered (the listing's parked actions) */
  const rowKebab = async (p, title) => { const row = title ? p.locator('[data-kb-row]', { hasText: title }).first() : p.locator('[data-kb-row]').first(); await row.hover(); await settle(p, 200); await row.getByRole('button', { name: /More actions for/ }).click({ force: true }); await settle(p, 400) }

  let NEW = null, IMPORTED = null, STD = null, BUNDLE = null
  try {
    as('dane')
    const ctx = await desk(); await stubWa(ctx)
    const p = await page(ctx, 'desk')

    // ── 1 · a token on the link ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The signing link has a token')
    await go(p, `/leads/${SERENA}/contracts`)
    await p.getByRole('button', { name: 'From the studio agreement' }).first().click()
    await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); await settle(p, 1500)
    NEW = /\/contracts\/([0-9a-f-]{36})/.exec(p.url())[1]
    const tok = tokenOf(NEW)
    ok(/^[A-Za-z0-9_-]{22}$/.test(tok) && tok !== NEW, `a new contract carries its own 22-character token, never its id (${tok})`)
    ok(sql(`select sign_token from contracts where id = '${C_RYAN}'`) === C_RYAN, 'a contract made before the step keeps its id as its token — links already in chats still open')
    const idPage = await page(ctx, 'id-link'); await go(idPage, `/sign/${NEW}`)
    ok(/no longer active/i.test(await idPage.locator('[data-testid="link-notice"]').innerText().catch(() => '')), 'the contract’s id opens nothing — "This link is no longer active"')
    await go(idPage, `/sign/${tok}`)
    ok(/Not ready yet/i.test(await idPage.locator('[data-testid="link-notice"]').innerText().catch(() => '')), 'its token, a Draft: "Not ready yet"')
    await go(idPage, `/sign/${C_RYAN}`)
    ok(await idPage.locator('[data-testid="signing-page"][data-state="signed"]').count() === 1, 'an older contract’s id-address still opens its signed copy')
    ok(!/OpenMaison/i.test(await idPage.locator('[data-testid="contract-paper"]').first().innerText().catch(() => 'x')), 'the client’s paper carries no "Prepared with OpenMaison" — the studio’s letterhead alone')
    /* send it */
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 700)
    const dlg = p.getByRole('dialog').filter({ hasText: 'Send for signature' })   // (the calm UI build 2026-10-27, a deliberate change) W-359
    /* (the calm UI build 2026-10-27, a deliberate change) 4-20: the link's window waits under "How signing works" (the house Tooltip), and the link rides in the message */
    await dlg.getByRole('button', { name: 'How signing works' }).hover(); await settle(p, 800)
    ok(/opens for 7 days from when you send it/.test(await p.locator('[role="tooltip"]').innerText().catch(() => '')), 'Send says the link opens for 7 days')
    ok((await dlg.locator('textarea').inputValue()).includes(`/sign/${tok}`), 'the link in the dialog is /sign/<token>')
    await shot(p, 'pm2-s03-send-dialog-1440')
    await dlg.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(p, 1500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const exp = Number(sql(`select sign_expires_at - strftime('%s','now') from contracts where id = '${NEW}'`))
    ok(sql(`select status from contracts where id = '${NEW}'`) === 'Sent to Client' && exp > 6.9 * 86400 && exp <= 7 * 86400 + 60, `sent: the window is 7 days from now (${Math.round(exp / 3600)} h)`)
    ok(/The link is open until/.test(await p.locator('[data-testid="contract-link-life"]').innerText().catch(() => '')), 'the editor’s banner says "The link is open until …"')
    await go(idPage, `/sign/${tok}`)
    ok(await idPage.locator('[data-testid="signing-page"][data-state="open"]').count() === 1, 'the token opens the signing page once it is out')
    /* 1.0's token for a set of documents (a port's bundle) lands on the set's page */
    sql(`insert into contract_bundles (id, lead_id, created_at, sign_token) values ('probe-s03-bundle', '${SERENA}', ${T0}, 'probe-s03-v1-token-0000')`)
    await go(idPage, '/sign/probe-s03-v1-token-0000')
    ok(/\/sign\/bundle\/probe-s03-bundle$/.test(idPage.url()), '1.0’s request token for a set lands on /sign/bundle/<id>')
    sql(`delete from contract_bundles where id = 'probe-s03-bundle'`)

    // ── 2 · the window ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The window: expired, renewed')
    sql(`update contracts set sign_expires_at = strftime('%s','now') - 3600 where id = '${NEW}'`)
    await go(idPage, `/sign/${tok}`)
    ok(/This link has expired/.test(await idPage.locator('[data-testid="link-notice"]').innerText().catch(() => '')), 'past its window the client meets "This link has expired"')
    await shot(idPage, 'pm2-s03-link-expired-1440')
    const card = await ctx.request.get(`${BASE}/sign/${tok}`, { headers: { 'user-agent': 'WhatsApp/2.23.20.0 A' } })
    ok(/no longer active/i.test(await card.text()), 'its chat card says the link no longer opens')
    await go(p, `/contracts/${NEW}`)
    ok(/expired/.test(await p.locator('[data-testid="contract-link-life"]').innerText().catch(() => '')) && await p.locator('[data-testid="contract-resend"]').count() === 1, 'the editor’s banner says it expired and offers Send again')
    /* a copy is a send: copying an expired link opens it again */
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
    await p.getByTestId('contract-header').getByRole('button', { name: 'More options' }).click(); await settle(p, 300); await p.getByRole('menuitem', { name: 'Copy signing link' }).click(); await settle(p, 1500)   // (the calm UI build 2026-10-27, a deliberate change) 4-18: the header's link icon is the ⋮'s row
    ok(/Signing link copied — it opens for 7 days from now/.test(await snackText(p)) && Number(sql(`select sign_expires_at - strftime('%s','now') from contracts where id = '${NEW}'`)) > 6.9 * 86400, 'copying an expired link opens it again for 7 days')
    sql(`update contracts set sign_expires_at = strftime('%s','now') - 3600 where id = '${NEW}'`)
    await go(p, `/leads/${SERENA}/contracts`)
    const wait = p.locator('[data-testid="contract-waiting"]').first()
    ok(/Link expired/.test(await wait.innerText()) && await wait.getAttribute('data-expired') !== null, 'the list says "Link expired" (in red)')
    const red = await wait.evaluate((el) => getComputedStyle(el).color)
    ok(/rgb\((1[5-9]\d|2\d\d), \d{1,2}, \d{1,2}\)|rgb\((1[5-9]\d|2\d\d), \d{1,3}, \d{1,3}\)/.test(red), `…red: ${red}`)
    await shot(p, 'pm2-s03-list-expired-1440')
    await rowKebab(p)
    ok(await menuItem(p, 'Send the link again').count() === 1, 'the row offers "Send the link again"')
    await menuItem(p, 'Send the link again').click(); await settle(p, 600)
    const rem = p.getByRole('dialog').filter({ hasText: 'Send the link again' })
    ok(/opens for 7 days from now/.test(await rem.innerText()), 'the reminder says it opens the link for 7 days from now')
    await rem.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(p, 1500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    ok(Number(sql(`select sign_expires_at - strftime('%s','now') from contracts where id = '${NEW}'`)) > 6.9 * 86400, 'the reminder renewed the window')
    ok(sql(`select count(*) from lead_events where lead_id = '${SERENA}' and kind = 'parity_s03_contract_reminded' and at >= ${T0}`) === '1', 'the reminder leaves a trail line')
    await go(p, `/leads/${SERENA}/activity`)
    ok(/sent Serena Koh a reminder to sign the contract/.test(await p.locator('main').innerText()), 'Activity: "… sent Serena Koh a reminder to sign the contract …"')

    // ── 3 · Stop and Undo ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Stop the signing link, Undo')
    await go(p, `/leads/${SERENA}/contracts`)
    await rowKebab(p)
    await menuItem(p, 'Stop the signing link').click(); await settle(p, 1500)
    ok(/The signing link is stopped/.test(await snackText(p)), `one sentence: "${(await snackText(p)).slice(0, 90)}"`)
    const tok2 = tokenOf(NEW)
    ok(sql(`select status from contracts where id = '${NEW}'`) === 'Draft' && tok2 !== tok, 'back to Draft with a new token')
    await go(idPage, `/sign/${tok}`)
    ok(/no longer active/i.test(await idPage.locator('[data-testid="link-notice"]').innerText().catch(() => '')), 'the old address stays dead')
    await snack(p).getByRole('button', { name: 'Undo' }).click().catch(() => {}); await settle(p, 1500)
    ok(sql(`select status from contracts where id = '${NEW}'`) === 'Sent to Client' && tokenOf(NEW) === tok, 'Undo puts the same link back')
    await go(p, `/contracts/${NEW}`)
    await p.getByRole('button', { name: 'Waiting for signature', exact: true }).click(); await settle(p, 400)   // (the calm UI build 2026-10-27, a deliberate change) W-363: the pill's words
    await p.getByRole('menuitemradio', { name: /Draft/ }).click(); await settle(p, 1500)
    ok(/The signing link is stopped/.test(await snackText(p)) && sql(`select status from contracts where id = '${NEW}'`) === 'Draft', 'the status pill’s Sent → Draft is the same Stop, said with Undo')

    // ── 4 · the PDFs kept ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · PDFs kept: Import, Mark as signed, Files')
    await go(p, `/leads/${SERENA}/contracts`)
    await p.getByRole('button', { name: 'New Contract' }).click(); await settle(p, 300)
    ok(await p.getByRole('menuitem', { name: 'Create with AI' }).count() === 0, 'New Contract has no "Create with AI"')
    await menuItem(p, 'Import a file').click();   /* (the calm UI build 2026-10-27, a deliberate change) W-199 */ await settle(p, 600)
    await p.locator('[role="dialog"] input[type="file"]').first().setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }); await settle(p, 2200)
    ok(/Choose a PDF/.test(await p.getByRole('dialog').innerText()), 'a file that isn’t a PDF is refused under the box')
    await pick(p, pdfA, 'Serena signed agreement.pdf')
    await p.getByRole('dialog').getByRole('button', { name: 'Import' }).click()
    await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); await settle(p, 1800)
    IMPORTED = /\/contracts\/([0-9a-f-]{36})/.exec(p.url())[1]
    const fileId = sql(`select file_id from contracts where id = '${IMPORTED}'`)
    ok(!!fileId && sql(`select f.name || '|' || folder.name from lead_files f join lead_files folder on folder.id = f.parent_id where f.id = '${fileId}'`) === 'Serena signed agreement.pdf|Contract & VOs', 'Import keeps the PDF in the lead’s Files › Contract & VOs')
    const raw = await ctx.request.get(`${BASE}/files/raw/${fileId}`)
    ok(raw.status() === 200 && (await raw.body()).toString('latin1', 0, 4) === '%PDF', 'its bytes are the PDF itself')
    ok(await p.locator('[data-testid="pdf-frame"]').getAttribute('data') === `/files/raw/${fileId}`, 'the editor shows the PDF itself in the paper’s place')
    await shot(p, 'pm2-s03-editor-pdf-1440')
    const itok = tokenOf(IMPORTED)
    ok((await ctx.request.get(`${BASE}/sign/${itok}/file`)).status() === 404, 'a Draft’s PDF is not on its link')
    sql(`update contracts set from_quote_id = null where id = '${IMPORTED}'`)
    await p.reload({ waitUntil: 'networkidle' }); await settle(p)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 700)
    await p.getByRole('dialog').getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(p, 1500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    await go(idPage, `/sign/${itok}`)
    ok(await idPage.locator('[data-testid="pdf-frame"]').getAttribute('data') === `/sign/${itok}/file`, 'the client reads the PDF through the link’s own address')
    const fileOnLink = await ctx.request.get(`${BASE}/sign/${itok}/file`)
    ok(fileOnLink.status() === 200 && (await fileOnLink.body()).toString('latin1', 0, 4) === '%PDF', '…and gets the very file')
    await shot(idPage, 'pm2-s03-sign-pdf-1440')
    /* Mark as signed with a copy (the composed one, a Draft again) */
    await go(p, `/contracts/${NEW}`)
    await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
    await menuItem(p, 'Mark as signed').click(); await settle(p, 600)
    await pick(p, pdfA, 'Scanned signed copy.pdf')
    await p.getByRole('dialog').getByRole('button', { name: 'Mark as signed' }).click(); await settle(p, 2000)
    const signedFile = sql(`select signed_file_id from contracts where id = '${NEW}'`)
    ok(!!signedFile && sql(`select signed_copy from contracts where id = '${NEW}'`) === 'Scanned signed copy.pdf', 'Mark as signed keeps the signed copy itself')
    ok(await p.locator('[data-testid="contract-open-signed-copy"]').count() === 1, 'the signed banner offers the signed copy')
    await go(p, `/leads/${SERENA}/contracts`)
    /* (the calm UI build 2026-10-27, a deliberate change) 4-26 · W-375: the Signed copy column is off by default — the row's ⋮ › Signed copy opens the kept file */
    await p.locator(`[role="row"][data-kb-id="${NEW}"]`).getByRole('button', { name: /^More actions for/ }).click({ force: true }); await settle(p, 300)
    await p.getByRole('menuitem', { name: /^Signed copy/ }).click(); await p.waitForURL(new RegExp(`/files/${signedFile}`), { timeout: 15000 }).catch(() => {}); await settle(p, 1200)
    ok(p.url().includes(`/files/${signedFile}`), 'the Signed Copy cell opens the kept file')
    /* Files refuses to trash it */
    await p.getByRole('button', { name: 'More options' }).first().click().catch(() => {}); await settle(p, 300)
    await menuItem(p, 'Delete').click().catch(() => {}); await settle(p, 500)
    await p.getByRole('dialog').getByRole('button', { name: /Yes|Move|Delete/ }).last().click().catch(() => {}); await settle(p, 1500)
    await shot(p, 'pm2-s03-files-refuses-1440')
    ok(/is the signed copy of .* — it stays while the contract does/.test(await snackText(p)) && sql(`select quote(deleted_at) from lead_files where id = '${signedFile}'`) === 'NULL', `Files refuses to trash a contract’s PDF and says why ("${(await snackText(p)).slice(0, 80)}")`)

    // ── 4b · the Won step's upload ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4b · The Won step’s upload keeps its PDF')
    await go(p, `/leads/${RYAN}?move=won`)
    await p.getByRole('button', { name: 'Edit', exact: true }).first().click(); await settle(p, 600)
    await p.getByRole('tab', { name: 'Upload' }).last().click(); await settle(p, 400)
    /* (pending modules, a deliberate change of this rule) S05: the Overview's FILES card has its own Upload Files picker now — the step's input is the window's */
    await p.getByRole('dialog', { name: 'Move stage' }).locator('input[type="file"]').last().setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: pdfA }); await settle(p, 2600)
    ok(/Contract_RyanD_signed\.pdf/.test(await p.getByRole('dialog').innerText().catch(() => '')), 'the step shows the picked file under the mock’s name')
    await p.getByRole('button', { name: 'Save changes' }).click(); await settle(p, 2500)
    const won = sql(`select id || '|' || quote(file_id) from contracts where lead_id = '${RYAN}' and source = 'uploaded' and file_name = 'Contract_RyanD_signed.pdf' and deleted_at is null`)
    const [WONC, wonFile] = won.split('|')
    ok(!!WONC && wonFile !== 'NULL' && sql(`select count(*) from lead_file_images where file_id = ${wonFile}`) === '1', 'the Won step’s upload is a Signed contract with its PDF kept')
    ok(!/wonContractFile|base64/.test(sql(`select payload from stage_logs where id = '${wonLog}'`)), 'the stage log keeps the file’s name, never its bytes')

    // ── 5 · the signing PDF library ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Standard PDFs: the library, Send together')
    await go(p, '/company/templates/contracts')
    await p.locator('[data-testid="new-template"]').first().click(); await settle(p, 400)
    await menuItem(p, 'Upload a PDF').click(); await settle(p, 600)
    await pick(p, pdfB, 'Terms and Conditions.pdf')
    await p.getByRole('dialog').getByRole('button', { name: 'Add to templates' }).click()
    await p.waitForURL(/\/templates\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); await settle(p, 1500)
    STD = /\/templates\/contracts\/([0-9a-f-]{36})/.exec(p.url())[1]
    ok(sql(`select kind || '|' || file_name || '|' || requires_accept || '|' || requires_scroll from contract_templates where id = '${STD}'`) === 'pdf|Terms and Conditions.pdf|1|0', 'Upload a PDF makes a standard document (PDF · tick to accept)')
    ok(((await p.locator('[data-testid="pdf-frame"]').getAttribute('data')) ?? '').startsWith(`/files/contract-template/${STD}`), 'its editor shows the PDF')
    await p.getByRole('button', { name: 'Before the client signs' }).click(); await settle(p, 500)
    ok(await p.locator('[data-testid="esign-field"]').count() === 0, 'its eSignatures drawer offers no fields to insert (a PDF has no document to place one in)')
    await shot(p, 'pm2-s03-template-pdf-1440')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, '/company/templates/contracts')
    ok(/PDF/.test(await p.locator('main').innerText()), 'the gallery marks it PDF')
    /* Send together offers it under Olivia's own — her agreement names no quote here, so it can go */
    sql(`update contracts set from_quote_id = null where id = '${C_OLIVIA}'`)
    await go(p, `/leads/${OLIVIA}/contracts`)
    await listKebab(p)
    await menuItem(p, 'Send together').click(); await settle(p, 1500)
    const bd = p.getByRole('dialog').filter({ hasText: 'Send together for signature' })
    ok(await bd.locator('[data-testid="bundle-standard-row"]').count() >= 1, 'Send together lists "Your standard documents"')
    await bd.locator('[data-testid="bundle-standard-row"]').filter({ hasText: 'Terms and Conditions' }).locator('input').first().check({ force: true }).catch(async () => { await bd.locator('[data-testid="bundle-standard-row"]').filter({ hasText: 'Terms and Conditions' }).click() })
    await settle(p, 300)
    await shot(p, 'pm2-s03-send-together-1440')
    await bd.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(p, 2500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const made = sql(`select id || '|' || quote(file_id) || '|' || status || '|' || quote(bundle_id) from contracts where lead_id = '${OLIVIA}' and template_id = '${STD}' and deleted_at is null`)
    const [STDC, stdFile, stdStatus, stdBundle] = made.split('|')
    BUNDLE = (stdBundle ?? '').replace(/'/g, '')
    ok(!!STDC && stdFile !== 'NULL' && stdStatus === 'Sent to Client' && BUNDLE && BUNDLE === sql(`select bundle_id from contracts where id = '${C_OLIVIA}'`), 'ticked, the PDF joins the lead as its own document and goes out in the set')
    ok(Number(sql(`select sign_expires_at - strftime('%s','now') from contract_bundles where id = '${BUNDLE}'`)) > 6.9 * 86400, 'the set’s link gets its window')
    sql(`update contracts set bundle_position = case when id = '${STDC}' then 0 else 1 end where bundle_id = '${BUNDLE}'`)   // the PDF first in the walk, so the page draws it at once
    await go(idPage, `/sign/bundle/${BUNDLE}`)
    ok(await idPage.locator(`[data-testid="pdf-frame"][data="/sign/bundle/${BUNDLE}/file/${STDC}"]`).count() === 1, 'the set’s page shows the PDF through the set’s link')
    await shot(idPage, 'pm2-s03-bundle-pdf-1440')
    const bf = await ctx.request.get(`${BASE}/sign/bundle/${BUNDLE}/file/${STDC}`)
    ok(bf.status() === 200 && (await bf.body()).toString('latin1', 0, 4) === '%PDF', '…the very file')

    // ── 6 · consent ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Consent before a signature is stamped')
    await go(p, '/profile')
    const sw = p.locator('[data-testid="signature-consent"]')
    ok(await sw.count() === 1 && /Put it on the quotes and contracts I prepare/.test(await sw.innerText()), 'Your profile › Your signature has the switch')
    ok(await sw.locator('input').isChecked(), '…on for Dane (his saved signature answered it, R105)')
    await sw.click(); await settle(p, 1200)
    ok(sql(`select signature_consent from members where id = 'dane'`) === 'no', 'off: recorded as his "no"')
    await p.getByRole('button', { name: 'Change', exact: true }).click(); await settle(p, 600)
    ok(/stays off the quotes and contracts you prepare/.test(await p.locator('[data-testid="signature-consent-note"]').innerText().catch(() => '')), 'Signature Settings says Save keeps it off')
    await p.keyboard.press('Escape'); await settle(p, 300)
    const draft = sql(`select id from contracts where lead_id = '${SERENA}' and status = 'Draft' and source = 'composed' and deleted_at is null limit 1`)
    const DRAFT2 = draft || null
    let previewC = DRAFT2
    if (!previewC) { await go(p, `/leads/${SERENA}/contracts`); await p.getByRole('button', { name: 'New Contract' }).click(); await settle(p, 300); await menuItem(p, 'From the studio agreement').click(); await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); previewC = /\/contracts\/([0-9a-f-]{36})/.exec(p.url())[1]; await settle(p, 1200) }
    await go(p, `/contracts/${previewC}/preview`)
    const studioBox = p.locator('[data-testid="contract-paper"] [data-sign="studio-signature"]').first()
    ok(await studioBox.count() === 0 || (await studioBox.locator('svg, img').count() === 0 && !(await studioBox.innerText()).includes('Dane')), 'off: the paper’s studio signature box prints blank')
    await go(p, `/contracts/${previewC}`)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 700)
    const notes = await p.locator('[data-testid="send-notes"]').innerText().catch(() => '')
    ok(/saved but not allowed on your documents/.test(notes), 'Send’s check says his signature is saved but not allowed')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, `/quotes/${Q_P1}`)
    const sigToggle = p.locator('#section-signature button[aria-expanded="false"]')
    if (await sigToggle.count()) { await sigToggle.first().click(); await settle(p, 600) }
    ok(await p.locator('[data-testid="signature-off"]').count() === 1, 'the quote’s Signature pane says it is off and offers "Turn it on"')
    await go(p, '/profile')
    await p.locator('[data-testid="signature-consent"]').click(); await settle(p, 1200)
    ok(sql(`select signature_consent from members where id = 'dane'`) === 'yes', 'on again')
    await go(p, `/contracts/${previewC}/preview`)
    ok(await p.locator('[data-testid="contract-paper"] [data-sign="studio-signature"]').count() === 0 || /Dane/.test(await p.locator('[data-testid="contract-paper"] [data-sign="studio-signature"]').first().innerText()), 'on: the studio box prints his signature again')

    // ── 7 · the contract value frozen at signing ─────────────────────────────────────────────────────────────────────────────────
    console.log('7 · The contract value frozen at signing')
    const signedTotal = Number(sql(`select signed_amount_minor from quotes where id = '${Q_P1}'`))
    ok(signedTotal > 0 && signedTotal === Number(sql(`select amount_minor from quotes where id = '${Q_P1}'`)), 'a signed quote carries its signed total')
    const contractLine = async () => { await go(p, `/projects/${P1}/money`); const m = /collected of (S\$[\d,.]+)/.exec(await p.locator('main').innerText()); return m ? m[1] : null }
    const before = await contractLine()
    /* an edit to the signed quote itself: one more of a line, its total moved (as the editor's own save would) */
    sql(`update quote_items set qty = qty + 10 where id = '${LINE}'`); sql(`update quotes set amount_minor = amount_minor + 123400 where id = '${Q_P1}'`)
    const after = await contractLine()
    ok(!!before && before === after, `an edit to the signed quote leaves the project’s contract value as signed (${before} → ${after})`)
    await go(p, `/quotes/${Q_P1}`)
    ok(/The client signed for S\$[\d,.]+/.test(await p.locator('[data-testid="signed-total"]').innerText().catch(() => '')), 'the signed quote’s banner says what the client signed for — the contract doesn’t move')
    await shot(p, 'pm2-s03-quote-signed-total-1440')
    sql(`update quote_items set qty = ${line0} where id = '${LINE}'`); sql(`update quotes set amount_minor = amount_minor - 123400 where id = '${Q_P1}'`)

    // ── 8 · Contracts Settings, the heads sort ───────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Contracts Settings and the heads')
    await go(p, `/leads/${SERENA}/contracts`)
    const head = p.locator('[role="columnheader"][data-col="created"] button')
    await head.click(); await settle(p, 400)
    ok(await p.locator('[role="columnheader"][data-col="created"]').getAttribute('aria-sort') === 'ascending', 'Created sorts oldest first')
    await head.click(); await settle(p, 400)
    ok(await p.locator('[role="columnheader"][data-col="created"]').getAttribute('aria-sort') === 'descending', '…then newest first')
    await p.getByRole('button', { name: /^Filters/ }).click(); await settle(p, 500)
    ok(/Sorted by the Created column/.test(await p.locator('[data-testid="filters-head-sort"]').innerText().catch(() => '')), 'Filters says the head sorts')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await head.click(); await settle(p, 400)
    ok(await p.locator('[role="columnheader"][data-col="created"]').getAttribute('aria-sort') === null, '…then off')
    await listKebab(p)
    await menuItem(p, 'Contract settings').click();   /* (the calm UI build 2026-10-27, a deliberate change) T-13 */ await p.waitForURL(/\/settings\?section=quotes/, { timeout: 15000 }); await settle(p, 1500)
    ok(p.url().includes('#contracts') && await p.locator('[data-testid="settings-contracts"]').isVisible(), 'Contracts Settings opens Settings › Quotes & pricing › Contracts')
    await shot(p, 'pm2-s03-settings-contracts-1440')
    await p.locator('[data-testid="contract-link-days"] [role="radio"]', { hasText: '14 days' }).click(); await settle(p, 1200)
    ok(JSON.parse(sql(`select value from settings where key = 'contract_rules'`) || '{}').linkDays === 14, 'choosing 14 days saves the rule')
    as('germaine')
    await go(p, '/settings?section=quotes')
    ok(await p.locator('[data-testid="contract-link-days"] [role="radio"]').first().isDisabled(), 'a Designer reads it, the choices rest')
    as('dane')

    // ── 9 · phone widths, ghosts and the page errors ─────────────────────────────────────────────────────────────────────────────
    console.log('9 · 390 and 320')
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const pc = await phoneCtx(w, h); await stubWa(pc)
      const pp = await page(pc, `phone-${w}`)
      await go(pp, `/sign/${itok}`)
      ok(await sideways(pp) <= 0, `${w}: the signing page with a PDF has no sideways scroll`)
      if (w === 390) { ok(await pp.locator('[data-testid="contract-pdf"] a', { hasText: 'Open the PDF' }).last().isVisible(), '390: the PDF reads as its first page and "Open the PDF"'); await shot(pp, 'pm2-s03-sign-pdf-390', true) }
      await go(pp, `/leads/${SERENA}/contracts`)
      ok(await sideways(pp) <= 0, `${w}: the Contracts tab has no sideways scroll`)
      if (w === 390) await shot(pp, 'pm2-s03-contracts-390')
      await go(pp, `/contracts/${IMPORTED}`)
      ok(await sideways(pp) <= 0, `${w}: the editor with a PDF has no sideways scroll`)
      if (w === 390) await shot(pp, 'pm2-s03-editor-pdf-390')
      await pc.close()
    }
    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    /* put back what the probe changed */
    try {
      const made = sql(`select id from contracts where created_at >= ${T0}`).split('\n').filter(Boolean)
      const files = sql(`select id from lead_files where created_at >= ${T0}`).split('\n').filter(Boolean)
      if (made.length) { sql(`delete from lead_tasks where contract_id in (${made.map((x) => `'${x}'`).join(',')})`); sql(`delete from contracts where id in (${made.map((x) => `'${x}'`).join(',')})`) }
      if (files.length) { const ids = files.map((x) => `'${x}'`).join(','); sql(`delete from lead_file_images where file_id in (${ids})`); sql(`delete from lead_file_thumbs where file_id in (${ids})`); sql(`delete from lead_files where id in (${ids})`) }
      sql(`delete from contract_template_files where template_id in (select id from contract_templates where created_at >= ${T0})`)
      sql(`delete from contract_templates where created_at >= ${T0}`)
      sql(`delete from contract_bundles where created_at >= ${T0} or id = 'probe-s03-bundle'`)
      sql(`delete from lead_events where at >= ${T0}`)
      sql(`delete from notifications where created_at >= ${T0}`)
      sql(`delete from notification_outbox where created_at >= ${T0}`)
      const [st, sa, tk, ex, bi, bp, rn, rp, ua, sb, va] = olivia0.split('|')
      sql(`update contracts set status = ${st}, sent_at = ${sa}, sign_token = ${tk}, sign_expires_at = ${ex}, bundle_id = ${bi}, bundle_position = ${bp}, recipient_name = ${rn}, recipient_phone = ${rp}, updated_at = ${ua}, sent_by = ${sb}, viewed_at = ${va}, from_quote_id = '39e4c832-bf4a-409e-bf41-bfc8d19b4340' where id = '${C_OLIVIA}'`)
      for (const r of consent0) { const [id, c, at] = r.split('|'); sql(`update members set signature_consent = ${c}, signature_consent_at = ${at} where id = '${id}'`) }
      if (rules0) sql(`update settings set value = '${rules0}' where key = 'contract_rules'`); else sql(`delete from settings where key = 'contract_rules'`)
      const [am, sam, qua, sec] = quote0.split('|'); sql(`update quotes set amount_minor = ${am}, signed_amount_minor = ${sam}, updated_at = ${qua}, sections = ${sec} where id = '${Q_P1}'`)
      const [qs1, qu1, qsa, qsm, qv, qcs] = serenaQ0.split('|'); sql(`update quotes set status = ${qs1}, updated_at = ${qu1}, signed_at = ${qsa}, signed_amount_minor = ${qsm}, visibility = ${qv}, client_sent_at = ${qcs} where id = '${Q_SERENA}'`)
      sql(`update quote_items set qty = ${line0} where id = '${LINE}'`)
      if (wonLog) sql(`update stage_logs set payload = ${wonPayload0} where id = '${wonLog}'`)
      sql(`update members set is_you = (id = '${you0}')`)
    } catch (e) { console.log('  ! putting back failed:', String(e).slice(0, 300)) }
    await b.close()
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
