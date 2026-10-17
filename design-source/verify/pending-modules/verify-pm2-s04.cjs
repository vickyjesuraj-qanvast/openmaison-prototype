// Pending modules, step S04 · Quotes leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key held:quotes).
// Each item asserted as the rule it builds, never another round's count:
//  - the client's pages send the print's fields only: /confirm/<token>, /sign/<token>/quote and /quote/<token> carry no line's cost or
//    mark-up apart, rebate, vendor, website link, price-book id, the quote's or the lead's id, nor the studio's templates (S02 · S03's note)
//  - the confirmation link has a token: a quote made before the step keeps its id as its token (links already sent keep opening); a quote
//    with a token of its own opens by it and its id opens nothing; a new quote (Duplicate, Draft with Maison AI) gets its own 22-character
//    one; the editor's Copy / Send and the portal's links carry it; the page confirms through it; the chat card still draws
//  - Viewed: a person opening the confirmation or the view-only link stamps it (first · last · count) — never a chat app's fetch, never a
//    "Not ready yet" page; Tools › Quotes says "Viewed {date}", the editor's banner "opened …", Activity "{client} opened the quote"
//  - a sent quote keeps its preparer: a rename or a removed signature after the send never reaches its paper; a Draft reads them live; Revise
//    lets go, the next send keeps the new
//  - Draft with Maison AI: a brief becomes a first cut from My Sections and My Items by rule, the rest "To price" at S$0; nothing metered;
//    the quote carries its sections, its book links and the brief (Activity says so); a brief with no works says what to write
//  - the Upload chip names what reads: XLSX · CSV
//  - the editor's Maison AI sheet: lines below cost, under a 10% margin, with no price — each row takes the grid to its line; "Set a markup"
//    ticks the lines and opens Set a value on Markup (%), which lands
//  - the dead presses: Column settings lists only the columns the table draws, no Add New Column; the thumbnail menu has no Upload Logo; the
//    Create strip has no Brand Catalog; Upload Image keeps the picked picture (the lead's Files, its bytes) — never the canned thumbnail
//  - Quote Files › Download hands over any kind (a PDF)
//  - the Quotes heads sort (Status · Total · dates; A→Z, Z→A, off), one sort with Filters'; Title, Client and Creator stay names
//  - a line's status is dropped: every line Pending; the line the client passed on is an optional work they said no to; the phone card no
//    longer shows Approved / Declined
//  - Duplicate of a quote with a view-only link works (the copied token broke it); no page errors; no sideways scroll at 390 / 320
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s04.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s04')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
/* the demo's records (fixed ids) */
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'     // OM-10007 · Sent to Client · Germaine's
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838', Q1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'     // OM-10001 · Draft · Dane's
const Q5 = 'bc1e58ca-6d72-4119-aae3-b76cd0e031b5'                                                    // OM-10005 · Signed · Dane's (his typed signature)
const C_RYAN = '301fe7ef-3cd9-47bb-a159-daacd92d7408', Q4 = '1f598389-4008-4079-a956-5dff071fb708'    // Ryan's signed contract · its quote OM-10004
const Q8 = 'd751c689-287e-4e9c-aeb3-0db38219fda1'                                                    // OM-10008 · the cove lighting the client passed on
/** A one-page PDF with a line of text. */
function makePdf(text) {
  const offs = []; let out = '%PDF-1.4\n'
  const add = (s) => { offs.push(Buffer.byteLength(out, 'latin1')); out += s }
  add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'); add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n')
  add('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n')
  const stream = `BT /F1 22 Tf 72 760 Td (${text}) Tj ET`
  add(`4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\n`); add('5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n')
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
/* a 2×2 PNG */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJgYGBAQAk8QL+tHSGfAAAAABJRU5ErkJggg==', 'base64')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it */
  const you0 = sql(`select id from members where is_you = 1`)
  const qCols = 'prepared_by, status, sent_at, client_sent_at, confirmed_at, confirmed_by, visibility, updated_at, confirm_token, view_token, view_token_at, view_token_by, client_viewed_at, client_last_viewed_at, client_view_count, prepared_json, version, revised_at, amount_minor, approved_at, approved_by, signed_at, change_asked_at, change_asked_note'
  const keep = (id) => sql(`select ${qCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quotes where id = '${id}'`)
  const putBack = (id, row) => { const v = row.split('§'); sql(`update quotes set ${qCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const kept = Object.fromEntries([Q7, Q1, Q5, Q4, Q8].map((id) => [id, keep(id)]))
  const members0 = sql(`select id || '§' || quote(name) || '§' || quote(signature_kind) || '§' || quote(signature_name) || '§' || quote(signature_data) || '§' || quote(signature_consent) from members where id in ('dane', 'germaine')`).split('\n').filter(Boolean)
  const LINE_Q7 = sql(`select id from quote_items where quote_id = '${Q7}' and kind = 'item' and optional = 0 order by position limit 1`)
  const LINE_Q4 = sql(`select id from quote_items where quote_id = '${Q4}' and kind = 'item' and optional = 0 order by position limit 1`)
  const lineCols = 'cost_minor, markup_minor, qty, discount_pct, vendor, link, rebate_minor, thumb, thumb_count, icon, updated_at'
  const keepLine = (id) => sql(`select ${lineCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quote_items where id = '${id}'`)
  const putLine = (id, row) => { const v = row.split('§'); sql(`update quote_items set ${lineCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const Q1_LINES = sql(`select id from quote_items where quote_id = '${Q1}' and kind = 'item' order by position`).split('\n').filter(Boolean)
  const linesKept = Object.fromEntries([LINE_Q7, LINE_Q4, ...Q1_LINES].map((id) => [id, keepLine(id)]))
  /* the rows the app writes as the probe drives it — only the new ones go (the month's own credit roll may land mid-run and stays) */
  const trail = { notifications: 'created_at', notification_outbox: 'created_at', lead_events: 'at' }
  const trail0 = Object.fromEntries(Object.keys(trail).map((t) => [t, new Set(sql(`select id from ${t}`).split('\n').filter(Boolean))]))
  const spent = () => sql(`select count(*) from credit_ledger where reason <> 'refresh' and created_at >= ${T0}`)   // a spend since the probe began (the month's own roll is the app's lazy 'refresh')
  const section0 = sql(`select quote(last_used_at) from price_book_sections where id = 'pbs-bathrooms-full-works'`)
  const folds0 = sql(`select id || '§' || collapsed || '§' || quote(updated_at) from quote_items where quote_id = '${Q1}' and kind = 'group'`).split('\n').filter(Boolean)   // Maison AI's row opens a folded section
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const views = (id) => sql(`select client_view_count || '|' || quote(client_viewed_at) || '|' || quote(client_last_viewed_at) from quotes where id = '${id}'`)
  const preparedName = (html) => (/\\"preparedBy\\":\{\\"name\\":\\"([^\\"]*)\\"/.exec(html) || /"preparedBy":\{"name":"([^"]*)"/.exec(html) || [])[1] ?? null
  const fetchHtml = async (ctx, url, ua) => (await ctx.request.get(BASE + url, ua ? { headers: { 'user-agent': ua } } : undefined)).text()

  try {
    as('dane')
    const ctx = await desk(); await stubWa(ctx)
    const p = await page(ctx, 'desk')

    // ── 1 · the client's pages send the print's fields only ──────────────────────────────────────────────────────────────────────
    console.log('1 · The client’s pages send the print’s fields only')
    sql(`update quote_items set cost_minor = 987654, markup_minor = 12345, vendor = 'ProbeVendorS04', link = 'https://probe-s04.example/item', rebate_minor = 4321 where id = '${LINE_Q7}'`)
    sql(`update quote_items set cost_minor = 876543, markup_minor = 23456, vendor = 'ProbeVendorS04b', link = 'https://probe-s04.example/b' where id = '${LINE_Q4}'`)
    sql(`update quotes set confirm_token = 'probeS04confirmTokenAAA', view_token = 'probeS04viewTokenAAAAAA', view_token_at = strftime('%s','now'), view_token_by = 'dane' where id = '${Q7}'`)
    const conf = await fetchHtml(ctx, '/confirm/probeS04confirmTokenAAA')
    ok(conf.includes('999999'), '/confirm/<token>: a line arrives at its price (cost + mark-up as one figure)')
    ok(!conf.includes('987654') && !/markupMinor\\?":12345/.test(conf), '…never its cost or its mark-up apart')
    ok(!conf.includes('ProbeVendorS04') && !conf.includes('probe-s04.example') && !/rebateMinor\\?":4321/.test(conf), '…no vendor, website link or rebate')
    ok(!conf.includes(Q7) && !conf.includes(SERENA), '…neither the quote’s id nor the lead’s')
    ok(!/\\"picker\\"|"picker"|\\"readiness\\"|"readiness"|priceBookItemId/.test(conf), '…none of the studio’s templates, readiness or price-book ids')
    const signQ = await fetchHtml(ctx, `/sign/${C_RYAN}/quote`)
    ok(signQ.includes(String(876543 + 23456)) && !signQ.includes('876543') && !signQ.includes('ProbeVendorS04b') && !signQ.includes(Q4), '/sign/<token>/quote: the price, never the cost, the vendor or the quote’s id')
    const view = await fetchHtml(ctx, '/quote/probeS04viewTokenAAAAAA')
    ok(view.includes('999999') && !view.includes('987654') && !view.includes('ProbeVendorS04'), '/quote/<token> (the view-only link): the same projection')

    // ── 2 · the confirmation link's token ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The confirmation link has a token')
    ok(sql(`select count(*) from quotes where confirm_token is null or confirm_token = ''`) === '0', 'every quote has a confirmation key')
    ok(sql(`select confirm_token from quotes where id = '${Q1}'`) === Q1, 'a quote made before the step keeps its id as its token — the links already sent keep opening')
    await go(p, `/confirm/${Q7}`)
    ok(/no longer active/i.test(await p.locator('body').innerText()), 'a quote with a token of its own: its id opens nothing ("This link is no longer active")')
    await go(p, '/confirm/probeS04confirmTokenAAA')
    ok(await p.locator('[data-testid="confirm-page"]').count() === 1 && /Confirm this quote/.test(await p.locator('[data-testid="confirm-page"] aside').innerText()), '…its token opens the confirmation page')
    const card = await ctx.request.get(`${BASE}/card/confirm/probeS04confirmTokenAAA`)
    ok(card.status() === 200 && /image\/png/.test(card.headers()['content-type'] || ''), 'the chat card draws for the token')
    await shot(p, 'pm2-s04-confirm-1440')

    // ── 3 · Viewed ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Viewed on the quote link')
    sql(`update quotes set client_viewed_at = null, client_last_viewed_at = null, client_view_count = 0 where id = '${Q7}'`)
    await fetchHtml(ctx, '/confirm/probeS04confirmTokenAAA', 'WhatsApp/2.23.20.0 A')
    await fetchHtml(ctx, '/quote/probeS04viewTokenAAAAAA', 'facebookexternalhit/1.1')
    ok(views(Q7).startsWith('0|NULL'), 'a chat app drawing the link’s card stamps nothing')
    await go(p, '/confirm/probeS04confirmTokenAAA'); await settle(p, 800)
    ok(views(Q7).startsWith('1|') && !views(Q7).includes('NULL'), 'a person opening the confirmation link stamps the first open, the last and the count')
    await go(p, '/quote/probeS04viewTokenAAAAAA'); await settle(p, 800)
    ok(views(Q7).startsWith('2|'), '…and the view-only link counts too')
    const first = views(Q7).split('|')[1]
    await go(p, `/confirm/${Q1}`); await settle(p, 600)
    ok(views(Q1).startsWith('0|') && /Not ready yet/.test(await p.locator('body').innerText()), 'a Draft’s link ("Not ready yet") stamps nothing')
    await go(p, '/quotes')
    const viewed = p.locator('[data-kb-row]', { hasText: 'OM-10007' }).first().locator('[data-testid="quote-viewed"]')
    ok(/^Viewed \d+ \w+ ’\d\d$/.test((await viewed.innerText().catch(() => '')).trim()), `Tools › Quotes: the Sent to client cell says "Viewed {date}" (${await viewed.innerText().catch(() => '—')})`)
    await shot(p, 'pm2-s04-quotes-viewed-1440')
    await go(p, `/quotes/${Q7}`); await settle(p, 1200)
    ok(/opened just now \(2 times\)|opened \d+ \w+ ago \(2 times\)/.test(await p.locator('[data-testid="quote-opened"]').innerText().catch(() => '')), 'the editor’s banner: "…, opened just now (2 times)"')
    await go(p, `/leads/${SERENA}/activity`)
    ok(/Serena Koh opened the quote “?OM-10007”? \(2 times\)/i.test((await p.locator('main').innerText()).replace(/\s+/g, ' ')), 'Activity: "Serena Koh opened the quote OM-10007 (2 times)."')
    ok(sql(`select quote(client_viewed_at) from quotes where id = '${Q7}'`) === first, 'the first open stays the first')

    // ── 4 · a sent quote keeps its preparer ───────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · A sent quote keeps its preparer')
    ok(/"name":"Germaine"/.test(sql(`select prepared_json from quotes where id = '${Q7}'`)), 'the quote with its client kept what its paper prints of Germaine')
    ok(sql(`select quote(prepared_json) from quotes where id = '${Q1}'`) === 'NULL', 'a Draft keeps none — it reads its preparer live')
    sql(`update members set name = 'Germaine Probe-Renamed' where id = 'germaine'`)
    sql(`update members set name = 'Dane Probe-Renamed', signature_kind = null, signature_name = null, signature_data = null where id = 'dane'`)
    const conf2 = await fetchHtml(ctx, '/confirm/probeS04confirmTokenAAA', 'WhatsApp/2')
    ok(preparedName(conf2) === 'Germaine', `a rename after the send never reaches the sent quote’s paper (prints "${preparedName(conf2)}")`)
    sql(`update quotes set confirm_token = 'probeS04confirmTokenQ55' where id = '${Q5}'`)
    const conf5 = await fetchHtml(ctx, '/confirm/probeS04confirmTokenQ55', 'WhatsApp/2')
    ok(/memberSignature\\?":\{\\?"kind\\?":\\?"type/.test(conf5) && preparedName(conf5) === 'Dane', 'a removed signature never leaves a signed quote’s paper — it prints Dane’s typed mark as it went out')
    const pre1 = await (await page(ctx, 'preview')).goto(`${BASE}/quotes/${Q1}/preview`).then((r) => r.text())
    ok(preparedName(pre1) === 'Dane Probe-Renamed', 'a Draft reads its preparer live (Preview prints the new name)')
    for (const r of members0) { const [id, name, k, n, d, c] = r.split('§'); sql(`update members set name = ${name}, signature_kind = ${k}, signature_name = ${n}, signature_data = ${d}, signature_consent = ${c} where id = '${id}'`) }
    /* choosing another preparer on the sent quote is an edit of the quote: its paper takes the new one from now */
    await go(p, `/quotes/${Q7}`); await settle(p, 1200)
    await p.getByRole('combobox', { name: /Prepared by/ }).first().click(); await settle(p, 400)
    await p.getByRole('option', { name: 'Michelle', exact: true }).click(); await settle(p, 2200)
    ok(preparedName(await fetchHtml(ctx, '/confirm/probeS04confirmTokenAAA', 'WhatsApp/2')) === 'Michelle' && /"name":"Michelle"/.test(sql(`select prepared_json from quotes where id = '${Q7}'`)), 'choosing another preparer on the sent quote keeps the new one (an edit of the quote, as a line’s)')

    // ── 5 · Draft with Maison AI ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Draft with Maison AI')
    await go(p, `/leads/${SERENA}/quotes`)
    await p.getByRole('button', { name: 'Create Quote' }).first().click(); await settle(p, 700)
    const modal = p.getByTestId('create-quote')
    ok(/XLSX · CSV · PDF · 5 AI credits/i.test(await modal.getByTestId('upload-quote-row').innerText()), 'Upload a quote’s chip names what reads — XLSX · CSV · PDF · 5 AI credits')   // (S42 B·4 · E-05, a deliberate change of this rule) a PDF is read from its own words now
    await modal.getByTestId('draft-quote-row').click(); await settle(p, 500)
    ok(/Draft with Maison AI for Serena Koh/.test(await modal.innerText()), 'Draft with Maison AI opens in the window, for the lead')
    ok(await modal.getByTestId('draft-create').isDisabled(), 'Create the quote rests until the brief drafts lines')
    await modal.locator('textarea').fill('Please give me a good deal'); await settle(p, 1600)
    ok(await modal.getByTestId('draft-nothing').isVisible() && await modal.getByTestId('draft-create').isDisabled(), 'a brief with no works says to name the rooms or the works — Create still rests')
    await modal.locator('textarea').fill('Hack and re-tile both bathrooms, new kitchen cabinets, paint the whole flat'); await settle(p, 1800)
    const summary = await modal.getByTestId('draft-summary').innerText().catch(() => '')
    ok(/\d+ lines drafted · \d+ from your price book · \d+ to price/.test(summary), `the lines draft as you type: "${summary}"`)
    const rowsText = await modal.locator('[data-testid="draft-row"]').allInnerTexts()
    ok(rowsText.some((t) => /Bathrooms — full works/.test(t) && /From My Sections/.test(t)), 'a saved section for the room goes in whole (My Sections first)')
    ok(rowsText.some((t) => /Painting/.test(t) && /S\$/.test(t)), 'a trade’s My Items come at the book’s price')
    ok(rowsText.some((t) => /To price/i.test(t)), 'what the book can’t price comes in "To price"')
    await shot(p, 'pm2-s04-draft-1440')
    await modal.getByTestId('draft-create').click()
    await p.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 20000 }); await settle(p, 1800)
    const NEWQ = /\/quotes\/([0-9a-f-]{36})/.exec(p.url())[1]
    ok(sql(`select draft_brief from quotes where id = '${NEWQ}'`).startsWith('Hack and re-tile'), 'the quote is made and keeps its brief')
    const tok = sql(`select confirm_token from quotes where id = '${NEWQ}'`)
    ok(/^[A-Za-z0-9_-]{22}$/.test(tok) && tok !== NEWQ, `a new quote gets its own 22-character confirmation token (${tok})`)
    ok(sql(`select count(*) from quote_items where quote_id = '${NEWQ}' and kind = 'group' and name in ('Bathrooms — full works', 'Painting', 'Carpentry', 'Preliminaries')`) === '4', 'its sections: the saved one and one per trade')
    ok(Number(sql(`select count(*) from quote_items where quote_id = '${NEWQ}' and kind = 'item' and price_book_item_id is not null`)) >= 2, 'its My Items lines stay linked to the book')
    ok(Number(sql(`select count(*) from quote_items where quote_id = '${NEWQ}' and kind = 'item' and cost_minor = 0 and markup_minor = 0`)) >= 1, 'its lines to price come in at S$0')
    ok(spent() === '0', 'nothing is metered (1.0 charged nothing for its drafter)')
    /* the lines to price are Maison AI's next hint in the editor */
    const toPrice = sql(`select count(*) from quote_items where quote_id = '${NEWQ}' and kind = 'item' and cost_minor + markup_minor = 0`)
    await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700)
    ok(new RegExp(`${toPrice} lines have no price yet`).test(await p.getByRole('dialog', { name: 'Maison AI suggestions' }).innerText()), `the drafted quote’s Maison AI names its ${toPrice} lines with no price yet`)
    await p.keyboard.press('Escape'); await settle(p, 300)
    await go(p, `/leads/${SERENA}/activity`)
    ok(/drafted the quote .+ with Maison AI, from the brief “Hack and re-tile/i.test((await p.locator('main').innerText()).replace(/\s+/g, ' ')), 'Activity: "You drafted the quote … with Maison AI, from the brief “…”"')

    // ── 6 · the editor's Maison AI sheet ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The editor’s Maison AI: margins by rule')
    const [BELOW, THIN] = Q1_LINES.slice(2, 4)
    sql(`update quote_items set cost_minor = 10000, markup_minor = -2000, qty = 1, discount_pct = 0 where id = '${BELOW}'`)
    sql(`update quote_items set cost_minor = 10000, markup_minor = 500, qty = 1, discount_pct = 0 where id = '${THIN}'`)
    await go(p, `/quotes/${Q1}`); await settle(p, 1500)
    const fab = p.locator('button[aria-label="Maison AI"]').last()   // the FAB, last on the page (the Items toolbar has one too)
    await fab.click(); await settle(p, 700)
    const sheet = p.getByRole('dialog', { name: 'Maison AI suggestions' })
    const sug = (await sheet.innerText()).replace(/\s+/g, ' ')
    ok(/1 line sells below cost/.test(sug) && /1 line under a 10% margin/.test(sug), `the sheet names the lines below cost and under a 10% margin (${sug.slice(0, 160)})`)
    ok(/Set a markup on the 2 lines under 10%/.test(sug), '…and offers one markup on those lines')
    await shot(p, 'pm2-s04-ai-sheet-1440')
    await sheet.getByRole('button', { name: '1 line sells below cost' }).click(); await settle(p, 500)
    ok(/Sells S\$[\d,.]+ · costs S\$100\.00/.test(await sheet.innerText()), 'the answer lists the line with what it sells for and costs')
    await sheet.locator('[data-testid="maison-row"]').first().click(); await settle(p, 1400)
    ok(await sheet.count() === 0 || !(await sheet.isVisible().catch(() => false)), 'a row closes the sheet…')
    ok(await p.locator(`[data-item-id="${BELOW}"]`).first().isVisible(), '…and the grid opens the section folded over the line and shows it')
    await fab.click(); await settle(p, 600)
    await p.getByRole('dialog', { name: 'Maison AI suggestions' }).getByRole('button', { name: /Set a markup on the 2 lines/ }).click(); await settle(p, 800)
    const setDlg = p.getByRole('dialog').filter({ hasText: 'Set a value for 2 items' })
    ok(await setDlg.isVisible() && /Markup \(%\)/.test(await setDlg.innerText()), 'Set a value opens for the 2 lines, on Markup (%)')
    await setDlg.getByRole('textbox').last().fill('25'); await setDlg.getByRole('button', { name: 'Apply' }).click(); await settle(p, 2200)
    ok(sql(`select markup_minor from quote_items where id = '${BELOW}'`) === '2500' && sql(`select markup_minor from quote_items where id = '${THIN}'`) === '2500', 'the markup lands: 25% of each line’s cost')
    await fab.click(); await settle(p, 600)
    ok(!/below cost|under a 10% margin/.test(await p.getByRole('dialog', { name: 'Maison AI suggestions' }).innerText()), 'with the lines fixed, the sheet no longer names them')
    await p.keyboard.press('Escape'); await settle(p, 300)

    // ── 7 · the dead presses ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · The dead presses, defined or removed')
    await p.locator('#section-items').getByRole('button', { name: 'Column settings' }).first().click(); await settle(p, 700)
    const drawer = p.getByRole('dialog').filter({ hasText: 'Item details' })
    const drawerText = await drawer.innerText()
    ok(!/\bSKU\b|MSRP|Dimensions|Materials|Shipping|Taxable|\bColor\b/.test(drawerText), 'Column settings lists only the columns the table draws (no SKU, MSRP, Color, Dimensions, Materials, Shipping, Taxable)')
    ok(!/Add New Column/.test(drawerText) && /Unit Price/.test(drawerText), '…and no Add New Column')
    await shot(p, 'pm2-s04-column-settings-1440')
    await p.keyboard.press('Escape'); await settle(p, 400)
    ok(await p.locator('aside[aria-label="Create"] button').count() <= 4 && await p.locator('aside[aria-label="Create"]').getByRole('button', { name: 'Brand Catalog' }).count() === 0, 'the Create strip has no Brand Catalog')
    const TOP = sql(`select id from quote_items where quote_id = '${Q1}' and kind = 'item' and parent_id is null order by position limit 1`)
    const lineName = sql(`select name from quote_items where id = '${TOP}'`)
    await p.getByRole('button', { name: `Image for ${lineName}` }).first().click(); await settle(p, 500)
    const thumbMenu = await p.getByRole('menu').last().innerText()
    ok(/Upload Image/.test(thumbMenu) && /Use Icon/.test(thumbMenu) && !/Upload Logo/.test(thumbMenu), 'the thumbnail menu: Upload Image · Use Icon — no Upload Logo')
    await p.getByRole('menuitem', { name: /Upload Image/ }).click(); await settle(p, 700)
    const addImg = p.getByRole('dialog', { name: 'Add Image' })
    await addImg.locator('input[type="file"]').first().setInputFiles({ name: 'probe-s04-photo.png', mimeType: 'image/png', buffer: PNG }); await settle(p, 2500)
    const upId = sql(`select id from lead_files where lead_id = '${OLIVIA}' and name = 'probe-s04-photo.png' and created_at >= ${T0}`)
    ok(!!upId && sql(`select count(*) from lead_file_images where file_id = '${upId}'`) === '1', 'Upload Image keeps the picked picture in the lead’s Files, with its bytes')
    await addImg.getByRole('button', { name: 'Add' }).click(); await settle(p, 1600)
    const th = sql(`select thumb from quote_items where id = '${TOP}'`)
    ok(th && !th.includes('/figma-assets/file-thumb-1.png') && th === sql(`select thumb from lead_files where id = '${upId}'`), `the line shows that picture, never the canned thumbnail (${th})`)

    // ── 8 · Quote Files › Download ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Quote Files › Download of any kind')
    const filesCard = p.locator('#section-files')
    if (await filesCard.locator('input[type="file"]').count() === 0) { await filesCard.locator('button[aria-expanded="false"]').first().click(); await settle(p, 700) }
    await filesCard.locator('input[type="file"]').first().setInputFiles({ name: 'probe-s04-terms.pdf', mimeType: 'application/pdf', buffer: makePdf('Probe S04 terms') }); await settle(p, 2500)
    const tile = p.locator('#section-files [role="list"] >> text=probe-s04-terms.pdf').first()
    ok(await tile.isVisible(), 'a PDF dropped on the quote’s Files joins it')
    await p.getByRole('button', { name: 'More options for probe-s04-terms.pdf' }).click(); await settle(p, 400)
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }).catch(() => null), p.getByRole('menuitem', { name: 'Download' }).click()])
    ok(!!dl && dl.suggestedFilename() === 'probe-s04-terms.pdf', `Download hands over the PDF under its own name (${dl ? dl.suggestedFilename() : 'no download'})`)

    // ── 9 · Duplicate keeps its own links ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · Duplicate of a quote with a view-only link')
    await go(p, `/quotes/${Q7}`); await settle(p, 1200)
    await p.getByRole('button', { name: /More options|More actions/ }).first().click(); await settle(p, 400)
    await p.getByRole('menuitem', { name: /Duplicate/ }).click()
    await p.waitForURL((u) => /\/quotes\/[0-9a-f-]{36}/.test(String(u)) && !String(u).includes(Q7), { timeout: 20000 }).catch(() => {}); await settle(p, 1500)
    const COPY = (/\/quotes\/([0-9a-f-]{36})/.exec(p.url()) || [])[1]
    ok(!!COPY && COPY !== Q7, 'Duplicate works on a quote with a view-only link (the copied token broke the unique key)')
    if (COPY) {
      const c = sql(`select quote(view_token) || '|' || confirm_token || '|' || client_view_count || '|' || quote(prepared_json) from quotes where id = '${COPY}'`).split('|')
      ok(c[0] === 'NULL' && /^[A-Za-z0-9_-]{22}$/.test(c[1]) && c[1] !== 'probeS04confirmTokenAAA' && c[2] === '0' && c[3] === 'NULL', 'the copy has its own confirmation token, no view-only link, no opens, no kept preparer')
      /* the editor's Copy confirmation link carries the token */
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
      await p.getByRole('button', { name: /More options|More actions/ }).first().click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /Copy confirmation link/ }).click(); await settle(p, 600)
      const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')
      ok(clip.endsWith(`/confirm/${c[1]}`), `Copy confirmation link copies /confirm/<token> (${clip.slice(-40)})`)
    }

    // ── 10 · the Quotes heads sort ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · The Quotes heads sort')
    await go(p, '/quotes')
    /* studio-wide, Draft with Maison AI asks for the client first */
    await p.getByRole('button', { name: 'Create Quote' }).first().click(); await settle(p, 700)
    await p.getByTestId('draft-quote-row').click(); await settle(p, 500)
    ok(/Choose a client first/.test(await p.getByTestId('create-quote').innerText()) && await p.getByTestId('draft-quote').count() === 0, 'Tools › Quotes: Draft with Maison AI asks for the client first')
    await p.keyboard.press('Escape'); await settle(p, 400)
    const head = (k) => p.locator(`[role="columnheader"][data-col="${k}"]`)
    ok(await head('title').getByRole('button').count() === 0 && await head('creator').getByRole('button').count() === 0 && await head('client').getByRole('button').count() === 0, 'Title, Client and Creator stay names (no sort)')
    await head('total').getByRole('button').click(); await settle(p, 500)
    const totals = async () => (await p.locator('[data-kb-row] [data-col="total"]').allInnerTexts()).map((t) => Number(t.replace(/[^\d.]/g, '')))
    const asc = await totals()
    ok(await head('total').getAttribute('aria-sort') === 'ascending' && asc.every((v, i) => i === 0 || asc[i - 1] <= v), 'Total sorts lowest first (aria-sort ascending)')
    await head('total').getByRole('button').click(); await settle(p, 500)
    const desc = await totals()
    ok(await head('total').getAttribute('aria-sort') === 'descending' && desc.every((v, i) => i === 0 || desc[i - 1] >= v), '…a second press, highest first')
    await shot(p, 'pm2-s04-quotes-sorted-1440')
    await p.getByRole('button', { name: /^Filters/ }).click(); await settle(p, 500)
    ok(/Sorted by the Total column/.test(await p.getByTestId('filters-head-sort').innerText().catch(() => '')), 'Filters says the Total column sorts the list')
    await p.getByRole('radio', { name: 'Oldest at the top' }).check({ force: true }); await settle(p, 400)
    await p.getByRole('button', { name: 'Done' }).click(); await settle(p, 500)
    ok(await head('total').getAttribute('aria-sort') === null, 'an order picked in Filters takes the head’s sort off — one sort at a time')
    await head('status').getByRole('button').click(); await settle(p, 500)
    const st = await p.locator('[data-kb-row] [data-col="status"]').allInnerTexts()
    const order = ['Draft', 'Sent for Approval', 'Approved', 'Sent to Client', 'Confirmed', 'Signed']
    const rank = st.map((t) => order.findIndex((s) => t.trim().startsWith(s)))
    ok(rank.every((v, i) => i === 0 || rank[i - 1] <= v), `Status sorts in the journey’s order (${st.map((t) => t.trim().split('\n')[0]).join(' · ')})`)
    await head('status').getByRole('button').click(); await head('status').getByRole('button').click(); await settle(p, 400)
    ok(await head('status').getAttribute('aria-sort') === null, '…and a third press lets go')

    // ── 11 · a line's status, dropped ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · A line’s status, dropped')
    ok(sql(`select count(*) from quote_items where status <> 'Pending'`) === '0', 'every line is Pending — nothing records an answer no screen gave')
    ok(sql(`select optional || '|' || client_choice from quote_items where quote_id = '${Q8}' and name = 'False ceiling with cove lighting'`) === '1|skip', 'the line the client passed on is an optional work they said no to')
    ok(sql(`select amount_minor from quotes where id = '${Q8}'`) === kept[Q8].split('§')[18], '…and the quote’s total did not move')

    // ── 12 · the portal's link and the confirmation through the token ─────────────────────────────────────────────────────────────
    console.log('12 · The page confirms through its token')
    const cp = await page(ctx, 'client'); await go(cp, '/confirm/probeS04confirmTokenAAA')
    await cp.getByRole('textbox', { name: /Your full name/ }).fill('Serena Koh'); await cp.getByRole('button', { name: 'Confirm quote' }).click(); await settle(cp, 2000)
    ok(sql(`select status || '|' || confirmed_by from quotes where id = '${Q7}'`) === 'Confirmed|Serena Koh', 'Confirm on the token’s page confirms the quote')
    ok(/Confirmed/.test(await cp.locator('[data-testid="confirm-page"] aside').innerText()), 'the card says Confirmed')
    await ctx.close()

    // ── 13 · phones ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('13 · 390 and 320')
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const pc = await phoneCtx(w, h)
      const pp = await page(pc, `phone-${w}`)
      await go(pp, `/quotes/${Q8}`); await settle(pp, 1200)
      ok(await sideways(pp) <= 0, `${w}: the quote editor has no sideways scroll`)
      const cove = pp.locator('[data-testid="item-card"]', { hasText: 'False ceiling with cove lighting' }).first()
      if (w === 390) {
        const ct = await cove.innerText().catch(() => '')
        ok(/Client said no/i.test(ct) && !/Declined|Approved/i.test(ct), '390: the phone card says "Client said no" — no Approved / Declined tag')   // the tag's caption is uppercase
        await shot(pp, 'pm2-s04-editor-390')
      }
      await go(pp, `/leads/${SERENA}/quotes`)
      await pp.getByRole('button', { name: 'Create Quote' }).first().click(); await settle(pp, 800)
      await pp.getByTestId('draft-quote-row').click(); await settle(pp, 500)
      await pp.locator('[data-testid="draft-quote"] textarea').fill('New wardrobes in both bedrooms'); await settle(pp, 1800)
      ok(await sideways(pp) <= 0, `${w}: Draft with Maison AI (a bottom sheet) has no sideways scroll`)
      if (w === 390) await shot(pp, 'pm2-s04-draft-390')
      await go(pp, '/quotes')
      ok(await sideways(pp) <= 0, `${w}: Tools › Quotes has no sideways scroll`)
      if (w === 390) await shot(pp, 'pm2-s04-quotes-390')
      await pc.close()
    }
    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    /* put back what the probe changed */
    try {
      const made = sql(`select id from quotes where created_at >= ${T0}`).split('\n').filter(Boolean)
      if (made.length) {
        const ids = made.map((x) => `'${x}'`).join(',')
        for (const t of ['quote_items', 'quote_payments', 'quote_files', 'quote_versions']) sql(`delete from ${t} where quote_id in (${ids})`)
        sql(`delete from lead_tasks where quote_id in (${ids})`)
        sql(`delete from quotes where id in (${ids})`)
      }
      sql(`delete from quote_files where created_at >= ${T0}`)
      const files = sql(`select id from lead_files where created_at >= ${T0}`).split('\n').filter(Boolean)
      if (files.length) { const ids = files.map((x) => `'${x}'`).join(','); for (const t of ['lead_file_images', 'lead_file_thumbs']) sql(`delete from ${t} where file_id in (${ids})`); sql(`delete from lead_files where id in (${ids})`) }
      for (const [t, col] of Object.entries(trail)) {
        const own = t === 'notifications' ? " and kind not in ('credits_renewed', 'credits_low')" : ''   // the month's credit roll is the app's, not the probe's
        const fresh = sql(`select id from ${t} where ${col} >= ${T0}${own}`).split('\n').filter((id) => id && !trail0[t].has(id))
        if (fresh.length) sql(`delete from ${t} where id in (${fresh.map((x) => `'${x}'`).join(',')})`)
      }
      for (const [id, row] of Object.entries(linesKept)) putLine(id, row)
      sql(`update price_book_sections set last_used_at = ${section0} where id = 'pbs-bathrooms-full-works'`)   // the draft inserted it
      for (const r of folds0) { const [id, c, u] = r.split('§'); sql(`update quote_items set collapsed = ${c}, updated_at = ${u} where id = '${id}'`) }
      sql(`update quote_items set client_choice = null where quote_id = '${Q7}' and optional = 1`)
      for (const [id, row] of Object.entries(kept)) putBack(id, row)
      for (const r of members0) { const [id, name, k, n, d, c] = r.split('§'); sql(`update members set name = ${name}, signature_kind = ${k}, signature_name = ${n}, signature_data = ${d}, signature_consent = ${c} where id = '${id}'`) }
      sql(`update members set is_you = (id = '${you0}')`)
    } catch (e) { console.log('  ! putting back failed:', String(e).slice(0, 300)) }
    await b.close()
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
