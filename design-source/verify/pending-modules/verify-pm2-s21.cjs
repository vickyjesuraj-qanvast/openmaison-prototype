// Pending modules, step S21 · Quote X-Ray (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:quote-x-ray — every pending line as the card recommended; the engine stays rule-based, nothing calls a model). Each item asserted as
// the rule it builds, never a count from another round:
//  - a PDF that is not one of the three reference quotes is read from its own words, by rule (lib/quotes/pdf-quote.ts): its sections as
//    trades, each priced line with its quantity, unit, rate and stated amount, FOC as no price, the sub-total / GST / grand total and the
//    payment rows left out, the letterhead's studio offered as their name — and the tile says the lines come to the quote's own total;
//    1.0's own demo competitor quote (public/uat-files/urban-nest-competitor-quote.pdf) reads whole
//  - 1.0's arithmetic check (its fact 4): a line of theirs whose stated amount isn't its own rate × quantity is a point ("Their numbers don’t
//    add up"), the row shows what their rate makes, the client's sentence and the draft never name the other studio; most lines disagreeing
//    is the quote's way of pricing, not a slip — nothing said
//  - the reading checks itself: lines that don't come to the stated total say so under the file
//  - refusals said at once: a photo or a scan (no words to read — the developers' reader), a quote in RM — a PDF's figures or a sheet's
//    column (1.0's hard stop, S$ only), a PDF
//    with no priced lines, a file that can't be opened; the three reference quotes still read by name
//  - spreadsheets: an Amount column prices a sheet with no rate (it read every line at S$0), a Total row is the sheet's figure, never a line —
//    in X-Ray and in Create Quote › Upload a quote (one reader)
//  - the run stays free: no AI credits move (1.0: X-Ray is a plan feature, never metered)
//  - the Meeting Co-Pilot's "Their quote" (the competitor analyser, S23) wears the Pro tag on Free and opens the lock where you are; on Pro it
//    opens X-Ray for the meeting's lead with the way back
//  - Maison AI's file answer says what X-Ray reads
//  - no page errors; no sideways scroll at 390 / 320 / 768 touch (against screen.width); the ghosts are the ghost probes' (and the strips')
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s21.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s21')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s21-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const n = (q) => Number(sql(q) || 0)
/* a table as it was: its rows as INSERTs, put back whole at the end */
const keepTable = (t) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${t}" "${DB}" "select * from ${t}"`, { maxBuffer: 256 * 1024 * 1024 }).toString()
const putTable = (t, dump) => sqlFile(`BEGIN; DELETE FROM ${t};\n${dump}\nCOMMIT;`)

/* ── sample files ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 'pm2-s21-files-'))
/** A one-page PDF: each item [x, y, text, size] a Helvetica text run where it is put (pdf.js reads a wide gap as a column break). */
function pdf(items, extra = '') {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const stream = items.map(([x, y, t, size]) => `BT /F1 ${size || 9} Tf ${x} ${y} Td (${esc(t)}) Tj ET`).join('\n') + extra
  const offs = []; let out = '%PDF-1.4\n'
  const add = (s) => { offs.push(Buffer.byteLength(out, 'latin1')); out += s }
  add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'); add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n')
  add('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n')
  add(`4 0 obj<</Length ${Buffer.byteLength(stream, 'latin1')}>>stream\n${stream}\nendstream endobj\n`); add('5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>endobj\n')
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
/** A quote laid out as a BOQ: S/N · Description · Qty · Unit · Rate · Amount, each row on its own baseline. */
function boq(rows, { cur = 'S$', title = 'URBAN NEST INTERIOR PTE LTD' } = {}) {
  const items = [[40, 800, title, 12], [40, 784, 'QUOTATION', 11], [40, 770, 'Prepared for: Vivien Lee'], [40, 756, 'Tel: 6123 4567   Email: hello@urbannest.example']]
  const X = { sn: 40, desc: 70, qty: 330, unit: 370, rate: 430, amt: 510 }
  let y = 730
  items.push([X.sn, y, 'S/N'], [X.desc, y, 'Description'], [X.qty, y, 'Qty'], [X.unit, y, 'Unit'], [X.rate, y, 'Rate'], [X.amt, y, 'Amount']); y -= 18
  for (const r of rows) {
    if (typeof r === 'string') { items.push([40, y, r]); y -= 16; continue }
    if (r.total) { items.push([X.rate - 60, y, r.total], [X.amt, y, r.amount]); y -= 14; continue }
    if (r.sn) items.push([X.sn, y, r.sn])
    items.push([X.desc, y, r.desc])
    if (r.qty) items.push([X.qty, y, r.qty])
    if (r.unit) items.push([X.unit, y, r.unit])
    if (r.rate) items.push([X.rate, y, r.rate])
    if (r.amt) items.push([X.amt, y, r.amt])
    y -= 14
  }
  return items
}
const QUOTE_ROWS = [
  'A  CARPENTRY WORKS',
  { sn: '1', desc: 'Kitchen top and bottom cabinets', qty: '22', unit: 'ft run', rate: '230.00', amt: '5,060.00' },
  { sn: '2', desc: 'Full-height wardrobe with swing doors', qty: '10', unit: 'ft run', rate: '180.00', amt: '18,000.00' },   // a decimal slip: 1,800.00 written 18,000.00
  { desc: 'with internal drawers and soft-closing hinges' },
  { sn: '3', desc: 'TV feature wall with console', qty: '1', unit: 'Lot', rate: '2,800.00', amt: '2,800.00' },
  'B  ELECTRICAL WORKS',
  { sn: '1', desc: 'Lighting points', qty: '16', unit: 'point', rate: '60.00', amt: '960.00' },
  { sn: '2', desc: 'Power points', qty: '12', unit: 'point', rate: '70.00', amt: '840.00' },
  'C  PAINTING WORKS',
  { sn: '1', desc: 'Painting to the entire unit, Nippon', qty: '1', unit: 'Lot', rate: '1,600.00', amt: '1,600.00' },
  { sn: '2', desc: 'Design and 3D drawings', qty: '1', unit: 'Lot', amt: 'FOC' },
  { total: 'Sub Total', amount: 'S$29,260.00' },
  { total: 'GST 9%', amount: 'S$2,633.40' },
  { total: 'Grand Total', amount: 'S$31,893.40' },
  '10% deposit upon confirmation   S$3,189.34',
]
const nm = (name) => path.join(FILES, name)
fs.writeFileSync(nm('urban-nest-quotation.pdf'), pdf(boq(QUOTE_ROWS)))
/* the same quote with a stated total the lines don't reach (a line left off the page) */
fs.writeFileSync(nm('urban-nest-short.pdf'), pdf(boq(QUOTE_ROWS.map((r) => (r && r.total === 'Sub Total' ? { total: 'Sub Total', amount: 'S$32,260.00' } : r)).filter((r) => !(r && r.total && r.total !== 'Sub Total')))))
fs.writeFileSync(nm('kuala-quote.pdf'), pdf(boq([{ sn: '1', desc: 'Hacking of kitchen floor tiles', qty: '1', unit: 'Lot', rate: 'RM 1,500.00', amt: 'RM 1,500.00' }, { total: 'Total', amount: 'RM 1,500.00' }], { title: 'KUALA INTERIOR SDN BHD' })))
fs.writeFileSync(nm('cover-letter.pdf'), pdf([[40, 800, 'Dear Vivien,'], [40, 780, 'Thank you for meeting us last week. Our quotation follows separately.'], [40, 760, 'Warm regards, the Urban Nest team']]))
fs.writeFileSync(nm('scanned-quote.pdf'), pdf([], '\n0.8 g 40 300 500 400 re f'))   // a picture of a page: shapes, no words
fs.writeFileSync(nm('their-quote-photo.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJgYGBAQAk8QL+tHSGfAAAAABJRU5ErkJggg==', 'base64'))
fs.writeFileSync(nm('broken.pdf'), '%PDF-1.4 probe')
fs.writeFileSync(nm('Flo Design Sample Quotation.pdf'), require(require('path').resolve(__dirname, '../../..', 'design-source/verify/x-ray-parity/fixtures/reference-file.cjs'))('Flo Design Sample Quotation.pdf'))   // (S42 E-05) a reference is read by its words, never its name
fs.writeFileSync(nm('Flo named but empty.pdf'), '%PDF-1.4 probe')   // (S42 E-05) the same name with nothing in it reads nothing
/* sheets: amounts only (+ a Total row); rates and amounts with one slip; every amount with GST in it (the quote's way, not a slip) */
fs.writeFileSync(nm('amounts-only.csv'), 'Item,Qty,Unit,Amount,Trade\nHack existing kitchen floor and wall tiles,1,Lot,1500,Hacking\nSupply and lay homogeneous floor tiles,140,sqft,2240,Masonry\nKitchen top and bottom cabinets,30,ft run,7200,Carpentry\nLighting points,20,point,1300,Electrical\nTotal,,,12240,\n')
fs.writeFileSync(nm('rival-with-slip.csv'), 'Item,Qty,Unit,Rate,Amount,Trade,Area\nKitchen top and bottom cabinets,22,ft run,230,5060,Carpentry,Kitchen\nFull-height wardrobe with swing doors,10,ft run,180,18000,Carpentry,Master Bedroom\nLighting points,16,point,60,960,Electrical,Whole unit\nPower points,12,point,70,840,Electrical,Whole unit\nPainting to the entire unit,1,Lot,1600,1600,Painting,Whole unit\n')
fs.writeFileSync(nm('ringgit-sheet.csv'), 'Item,Qty,Unit,Amount (RM)\nHacking of kitchen floor tiles,1,Lot,1500\nStore rm shelving,1,Lot,300\n')
fs.writeFileSync(nm('gst-in-every-line.csv'), 'Item,Qty,Unit,Rate,Amount,Trade\nKitchen top and bottom cabinets,22,ft run,230,5515.40,Carpentry\nFull-height wardrobe with swing doors,10,ft run,180,1962,Carpentry\nLighting points,16,point,60,1046.40,Electrical\nPower points,12,point,70,915.60,Electrical\n')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1100) }
  const shot = (p, nm2, full = false) => p.screenshot({ path: path.join(dir, `${nm2}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')

  /* what the probe changes, kept to put back */
  const you0 = sql(`select id from members where is_you = 1`)
  const KEEP = ['quote_comparisons', 'subscriptions', 'studio_credit_balances', 'credit_ledger', 'invoices', 'billing_checkout_sessions', 'meetings', 'maison_questions', 'notifications']
  const kept = Object.fromEntries(KEEP.map((t) => [t, keepTable(t)]))
  const VIV = sql(`select id from leads where name = 'Vivien Lee' and deleted_at is null limit 1`)
  const credits0 = n(`select plan_credits + topup_credits from studio_credit_balances where id = 'studio'`)
  const ledger0 = n(`select count(*) from credit_ledger`)
  const plan0 = sql(`select plan_id from subscriptions where cancelled_at is null`)

  try {
    sql(`update members set is_you = (id = 'dane')`)
    const ctx = await desk()
    const d = await page(ctx, '1440')
    const setup = () => d.getByTestId('xray-setup')
    const otherInput = () => setup().locator('input[type=file]').last()
    const pick = async (file, input = otherInput) => { await input().setInputFiles(nm(file)); await settle(d, 1800) }
    const removeOther = async () => { const rm = setup().getByRole('button', { name: /^Remove / }).last(); if (await rm.count()) { await rm.click(); await settle(d, 300) } }

    // ── 1 · a PDF read from its own words ───────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · a PDF that is not a reference quote is read from its own words')
    await go(d, `/quote-x-ray?lead=${VIV}&from=${encodeURIComponent(`/leads/${VIV}`)}`)
    ok(await setup().isVisible(), 'X-Ray’s setup opens for Vivien Lee (Pro)')
    await pick('urban-nest-quotation.pdf')
    const tile = await text(setup().getByTestId('xray-file'))
    ok(/7 lines\s*read from Urban Nest Interior’s quote · S\$29,260\.00/.test(tile), `the PDF reads as its studio, its lines and their sum — ${tile}`)
    ok(/the same as its own total/.test(tile) && (await setup().getByTestId('xray-file-check').count()) === 0, '…and the lines come to the quote’s own sub-total (GST, the payment row and the totals left out)')
    ok(await setup().getByRole('textbox', { name: /Their studio’s name/ }).inputValue() === 'Urban Nest Interior', 'the letterhead’s name is offered as their studio’s name, theirs to correct')
    await shot(d, '01-pdf-read-1440')
    const ledgerBefore = n(`select count(*) from credit_ledger`)
    await setup().getByRole('button', { name: 'Compare' }).click()
    await d.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 25000 }); await settle(d, 1500)
    const cmp = d.url().match(/quote-x-ray\/([0-9a-f-]{36})/)[1]
    ok(n(`select count(*) from credit_ledger`) === ledgerBefore, 'the run moves no AI credits — X-Ray is a plan feature, never metered (1.0)')
    const row = json(`select other_studio, engine, inputs_json from quote_comparisons where id = '${cmp}'`)[0]
    const theirs = JSON.parse(row.inputs_json).theirs
    ok(row.other_studio === 'Urban Nest Interior' && row.engine === 2, 'the reading is kept under their studio’s name, engine 2')
    const wardrobe = theirs.find((l) => /wardrobe/i.test(l.name))
    ok(theirs.length === 7 && wardrobe && wardrobe.rateMinor === 18000 && wardrobe.amountMinor === 1800000 && wardrobe.qty === 10 && /drawers/.test(wardrobe.name), 'each line keeps its quantity, rate and stated amount; a wrapped description joins its line')
    ok(theirs.some((l) => /Design and 3D/.test(l.name) && l.amountMinor === 0) && theirs.every((l) => !/total|gst|deposit/i.test(l.name)), 'FOC is a line with no price; the totals, GST and the deposit row are never lines')
    const trades = [...new Set(theirs.map((l) => l.trade))]
    ok(trades.join(' · ') === 'Carpentry Works · Electrical Works · Painting Works', `its lettered sections are the trades, the letter taken off — ${trades.join(' · ')}`)
    /* 1.0's own demo competitor quote (docs/demo/quote-xray-samples, shipped as a tester's file): a logo set as words, the first band in the
       header row, a band with a tail ("Carpentry Works — Package Pricing"), "GST … Included", a payment schedule and terms after the total */
    await go(d, `/quote-x-ray?lead=${VIV}`)
    await otherInput().setInputFiles(path.join(__dirname, '../../../public/uat-files/urban-nest-competitor-quote.pdf')); await settle(d, 2500)
    const v1 = await text(setup().getByTestId('xray-file'))
    ok(/23 lines\s*read from Urban Nest Design & Renovation’s quote · S\$40,210\.00 — the same as its own total/.test(v1), `1.0’s demo competitor quote reads whole — ${v1.replace(/^.*?delete /, '')}`)

    // ── 2 · their arithmetic ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · 1.0’s arithmetic check — their numbers that don’t add up')
    await go(d, `/quote-x-ray/${cmp}`)
    const points = d.getByTestId('xray-points')
    const ptText = await text(points)
    ok(/Their numbers don’t add up/.test(ptText) && /S\$180\.00 × 10 ft run is S\$1,800\.00/.test(ptText), `a point says their wardrobe states S$18,000.00 but S$180.00 × 10 ft run is S$1,800.00`)
    const pointLi = points.locator('li').filter({ hasText: 'Their numbers don’t add up' }).first()
    const said = await text(pointLi.locator('[class*="say"]'))
    ok(/In the other quote, the full-height wardrobe/i.test(said) && !/Urban Nest/.test(said), `the sentence to the client never names the other studio — ${said.slice(0, 90)}…`)
    const slip = d.getByTestId('xray-slip')
    ok(await slip.count() === 1 && /S\$1,800\.00 at their rate/.test(await text(slip)), 'the row shows what their own rate makes — “S$1,800.00 at their rate”')
    await shot(d, '02-arithmetic-1440', true)
    await pointLi.getByRole('button', { name: 'Say it as a question' }).click(); await settle(d, 300)
    await points.getByRole('button', { name: 'Send to client' }).click()
    const dlg = d.getByRole('dialog', { name: 'Send to client' }); await dlg.waitFor(); await settle(d, 500)
    const draft = await dlg.getByRole('textbox', { name: /Message/ }).inputValue()
    ok(/Could you confirm the price of “Full-height wardrobe with swing doors/.test(draft) && !/Urban Nest/.test(draft), 'the draft follows the screen — the question as switched — and never names the other studio')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── 3 · refusals said at once ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · what can’t be read says why, at once')
    await go(d, `/quote-x-ray?lead=${VIV}`)
    const say = async (file, re, name) => { await removeOther(); await pick(file); const t = await text(setup()); ok(re.test(t) && (await setup().getByTestId('xray-file').count()) === 0, `${name} — ${(t.match(re) || [''])[0] || t.slice(-140)}`) }
    await say('their-quote-photo.png', /their-quote-photo\.png is a photo or a scan — it has no words to read here\. A PDF the studio made, or a spreadsheet, reads best\./, 'a photo: no words to read here (the developers’ reader)')
    await say('scanned-quote.pdf', /scanned-quote\.pdf is a photo or a scan — it has no words to read here\./, 'a scan saved as a PDF: the same')
    await say('kuala-quote.pdf', /This quote is in RM — Quote X-Ray compares quotes in S\$\./, 'a quote in RM: 1.0’s hard stop')
    await say('cover-letter.pdf', /We couldn’t find any priced lines in this file\./, 'a letter with no priced lines')
    await say('broken.pdf', /We couldn’t read this one — a spreadsheet of their quote reads best\./, 'a file that can’t be opened')
    await say('Flo named but empty.pdf', /We couldn’t read this one — a spreadsheet of their quote reads best\./, 'S42 E-05: a file NAMED like a reference with nothing in it is not read as the reference')
    await shot(d, '03-refusal-1440')
    await removeOther(); await pick('Flo Design Sample Quotation.pdf')
    ok(/28 lines\s*read from Flo Design’s quote · S\$31,140\.00/.test(await text(setup().getByTestId('xray-file'))), 'a reference quote reads by its own words (the curated reading wins) — S42 E-05: never by its name')
    await removeOther(); await pick('urban-nest-short.pdf')
    const chk = setup().getByTestId('xray-file-check')
    ok(await chk.count() === 1 && /The quote’s own total is S\$32,260\.00 — a line may not have been read\./.test(await text(chk)), 'lines that don’t reach the stated total say so under the file')
    await shot(d, '04-total-check-1440')

    // ── 4 · spreadsheets ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · spreadsheets: an Amount column prices, a Total row is the sheet’s figure')
    await removeOther(); await pick('amounts-only.csv')
    const sheetTile = await text(setup().getByTestId('xray-file'))
    ok(/4 lines\s*read · S\$12,240\.00 — the same as its own total/.test(sheetTile), `a sheet of amounts reads its amounts and leaves its Total row out — ${sheetTile}`)
    await removeOther(); await pick('ringgit-sheet.csv')
    ok(/This quote is in RM — Quote X-Ray compares quotes in S\$\./.test(await text(setup())), 'a sheet whose amounts are in RM (its column says so) is refused too')
    await removeOther(); await pick('gst-in-every-line.csv')
    await setup().getByRole('button', { name: 'Compare' }).click()
    await d.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 25000 }); await settle(d, 1500)
    ok(!/Their numbers don’t add up/.test(await text(d.getByTestId('xray-points'))) && (await d.getByTestId('xray-slip').count()) === 0, 'every line with GST in it is the quote’s way of pricing — no slip said')
    await go(d, `/quote-x-ray?lead=${VIV}`)
    await pick('rival-with-slip.csv')
    await setup().getByRole('textbox', { name: /Their studio’s name/ }).fill('Rival Studio')
    await setup().getByRole('button', { name: 'Compare' }).click()
    await d.waitForURL(/\/quote-x-ray\/[0-9a-f-]{36}/, { timeout: 25000 }); await settle(d, 1500)
    ok(/Their numbers don’t add up/.test(await text(d.getByTestId('xray-points'))) && (await d.getByTestId('xray-slip').count()) === 1, 'a sheet’s Rate and Amount that disagree on one line: the same point and row')

    /* Create Quote › Upload a quote reads sheets through the same reader: an Amount column prices the lines (they were S$0) */
    await go(d, `/leads/${VIV}/quotes`)
    await d.getByRole('button', { name: /^New Quote|^Create Quote|^New quote/ }).first().click().catch(() => {}); await settle(d, 900)
    const cq = d.getByTestId('upload-quote')
    if (!(await cq.count())) { const row = d.getByRole('button', { name: /Upload a quote/ }).first(); if (await row.count()) { await row.click(); await settle(d, 600) } }
    const upInput = d.getByTestId('upload-quote-file')
    if (await upInput.count()) {
      await upInput.setInputFiles(nm('amounts-only.csv')); await settle(d, 2200)
      const box = await text(d.getByTestId('upload-quote'))
      ok(/4 lines?/.test(box) && /12,240/.test(box) && !/Total\b.*S\$12,240\.00.*Total/.test(box), `Upload a quote reads the same sheet: 4 lines, S$12,240.00 — ${box.slice(0, 120)}`)
      await d.keyboard.press('Escape'); await settle(d, 500); await d.keyboard.press('Escape'); await settle(d, 300)
    } else ok(false, 'Create Quote › Upload a quote reachable from the lead’s Quotes tab')

    // ── 5 · the Co-Pilot's "Their quote" on Free and Pro ──────────────────────────────────────────────────────────────────────────
    console.log('5 · the Meeting Co-Pilot’s Their quote: a Pro feature')
    const meeting = sql(`select id from meetings where status = 'planned' order by starts_at limit 1`)
    const mLead = sql(`select lead_id from meetings where id = '${meeting}'`)
    const nowMs = Date.now()   // the meetings table keeps milliseconds
    sql(`update meetings set status = 'live', started_at = ${nowMs}, started_by = 'dane', starts_at = ${nowMs - 60000}, blocks = 1, free_blocks = 1, paused_at = null, consent_kind = 'verbal', consent_at = ${nowMs}, consent_by = 'dane' where id = '${meeting}'`)
    const demoPlan = async (name) => {
      await go(d, '/leads')
      await d.getByRole('button', { name: /^Demo Studio/ }).first().click(); await settle(d, 400)
      await d.getByRole('menu', { name: 'View as' }).getByTestId('demo-plan').getByRole('menuitemradio', { name }).click(); await settle(d, 2600)
    }
    await demoPlan(/^Free\b/)
    await go(d, `/meetings/${meeting}`)
    const their = d.getByTestId('room-tools').getByRole('button', { name: /Their quote/ })
    ok(await their.count() === 1 && /Pro/.test(await text(their)) && (await their.getAttribute('aria-label')) === 'Their quote, a Pro feature', 'on Free, Their quote wears the Pro tag and says so to a screen reader')
    const pagesBefore = ctx.pages().length
    await their.click(); await settle(d, 900)
    ok(await d.getByTestId('plan-lock').count() > 0 && (await d.getByTestId('plan-lock').first().getAttribute('data-feature')) === 'quote_xray' && ctx.pages().length === pagesBefore, '…its press opens the lock card in the meeting — no new tab landing on a lock')
    await shot(d, '05-copilot-free-1440')
    await d.keyboard.press('Escape'); await settle(d, 400)
    /* the tip that names another studio offers Read their quote — Pro on Free too */
    await d.getByTestId('room-notes-box').fill('Client: We are also getting other quotes from another studio.'); await settle(d, 2500)
    const readTheirs = d.getByRole('button', { name: /Read their quote/ })
    ok(await readTheirs.count() > 0 && /Pro/.test(await text(readTheirs)), 'the “another studio” tip’s Read their quote wears the Pro tag on Free')
    if (await readTheirs.count()) { await readTheirs.first().click(); await settle(d, 800); ok((await d.getByTestId('plan-lock').first().getAttribute('data-feature').catch(() => null)) === 'quote_xray', '…and its press opens the lock card'); await d.keyboard.press('Escape'); await settle(d, 400) }
    await demoPlan(/^Pro — Studio The base plan/)
    await go(d, `/meetings/${meeting}`)
    const their2 = d.getByTestId('room-tools').getByRole('button', { name: /Their quote/ })
    ok(!/Pro/.test(await text(their2)), 'on Pro the tag is gone')
    const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null), their2.click()])
    if (tab) await tab.waitForLoadState('domcontentloaded').catch(() => {})
    const u = tab ? new URL(tab.url()) : null
    ok(!!u && u.pathname === '/quote-x-ray' && u.searchParams.get('lead') === mLead && u.searchParams.get('from') === `/meetings/${meeting}`, `…and opens X-Ray for the meeting’s lead with the way back (${u ? u.pathname + u.search : 'no tab'})`)
    if (tab) await tab.close()

    // ── 6 · Maison AI says what X-Ray reads ──────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Maison AI’s file answer')
    const src = fs.readFileSync(path.join(__dirname, '../../../lib/maison-ai/answers/work.ts'), 'utf8')
    ok(/Quote X-Ray reads their spreadsheet or PDF beside yours — no AI credits/.test(src) && !/reads their PDF or photo/.test(src), 'Maison AI no longer promises a photo read, and says X-Ray costs no AI credits')

    // ── 7 · phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · phone and tablet (touch)')
    for (const [w, h] of [[390, 844], [320, 640], [768, 1024]]) {
      const pc = await phoneCtx(w, h); const p = await page(pc, `${w}`)
      await go(p, `/quote-x-ray?lead=${VIV}`)
      await p.getByTestId('xray-setup').locator('input[type=file]').last().setInputFiles(nm('urban-nest-short.pdf')); await settle(p, 2000)
      ok(await p.getByTestId('xray-file-check').isVisible() && await sideways(p) <= 0, `${w}: the file’s check note fits, no sideways scroll`)
      if (w === 390) await shot(p, '06-check-390')
      await go(p, `/quote-x-ray/${cmp}`)
      await p.getByTestId('xray-slip').scrollIntoViewIfNeeded().catch(() => {}); await settle(p, 400)
      ok(await p.getByTestId('xray-slip').isVisible() && await sideways(p) <= 0, `${w}: the record’s slip shows on its card, no sideways scroll`)
      if (w === 390) await shot(p, '07-slip-390')
      await pc.close()
    }
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ probe stopped:', String(e).split('\n')[0])
  } finally {
    sql(`update members set is_you = (id = '${you0}')`)
    for (const t of KEEP) putTable(t, kept[t])
    console.log(`  (put back: ${KEEP.join(' · ')}; credits ${n(`select plan_credits + topup_credits from studio_credit_balances where id = 'studio'`) === credits0 ? 'as found' : 'CHANGED'}, ledger ${n(`select count(*) from credit_ledger`) === ledger0 ? 'as found' : 'CHANGED'}, plan ${sql(`select plan_id from subscriptions where cancelled_at is null`) === plan0 ? 'as found' : 'CHANGED'})`)
    await b.close()
    fs.rmSync(FILES, { recursive: true, force: true })
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
