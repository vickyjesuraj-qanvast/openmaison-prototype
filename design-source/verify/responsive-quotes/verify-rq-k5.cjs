// Quotes on the move, K5 · the editor's sections on a phone and a touch tablet (his "I have marked it please go ahead", 2026-10-22, on the review
// page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w; the lane B audit `rwd-quotes/B/findings.md`). Each rule asserted as the rule it builds,
// never another round's count — and every new press pressed for real, on the production build:
//  - B-01 · B-22 · B-11 · P-08: at 390 and 768 (touch) a payment is a card — a real tap on its middle lands on the card, never the handle; the
//    handle keeps a 44 box of its own; the table never scrolls sideways inside its box; the card reads 16 / 14 with the amount at 20 tabular;
//    the tap opens the payment's sheet; Done writes the share (put back); Remove answers with Undo, and Undo brings the card back. At 1440 the
//    table is untouched: the heads, and a click on "10%" opens the inline box.
//  - B-12 · B-13 · B-16: at 390 the Terms body is one row (no contenteditable on the page); the row opens the full-screen editor whose tools are
//    44 boxes at a 44 pitch; a typed word autosaves (put back); Done's 44 box. At 768 (touch) the toolbar's boxes are 44 tall, unclipped.
//  - B-15: the Files tile's kebab answers at its centre and 10px around it; "Show in client view" reads 14 on the phone.
//  - B-17 · B-16: Send for confirmation at 390 — the code and the number on one line, the message box without an inner scroll, no link row,
//    the tools on one row (no character count on a phone), the whole sheet in view at 390×844 (the body does not scroll), and the foot's
//    buttons answer 3px past their 36 box — the house touch overlay on every DS md button (app/globals.css, REG-344).
//  - B-18: Send for signature at 390 — a radio list led by "Start from the studio agreement", one button in the foot named after the pick;
//    pressing it makes the contract (put back).
//  - B-19: Version History at 390 — the snackbar raised there clears the sheet's foot; Close answers at its centre.
//  - B-02: at 768 (touch) the Send ▾ menu stays inside the viewport and the page gains no sideways scroll.
//  - P-08 elsewhere: Activity 16 / 14, Signature's switch label and NRIC line at 14 on the phone.
//  - no page errors; no sideways scroll at 390 and 320 (against screen.width).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-rq-k5.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rq-k5')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rq-k5-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }   // the app's own lazy writes first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return changed
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const DRAFT = sql(`select id from quotes where status = 'Draft' and kind = 'quote' and deleted_at is null order by number limit 1`)
  const DEP = json(`select id, name, pct from quote_payments where quote_id = '${DRAFT}' order by position limit 1`)[0]
  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only: a full-page capture drops (hover: none) mid-shot (lane A, A-19)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  /* what a tap at (x, y) lands on: the nearest ancestor matching `sel` (its label, test id or its words — an icon's ligature text left out), or the element's own description */
  const hit = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const m = el.closest(sel); if (!m) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`; const c = m.cloneNode(true); c.querySelectorAll('[aria-hidden]').forEach((n) => n.remove()); return m.getAttribute('aria-label') || m.getAttribute('data-testid') || c.textContent.trim().slice(0, 40) }, [x, y, sel])
  /* Send ▾ › a row, by real taps: the menu's row is waited for, then the dialog it opens (an open step that never races the menu's rise; a tap
     leaves no mouse hover on the sheet behind) */
  const openSend = async (p, item, dialog) => {
    await p.getByTestId('quote-send').locator('visible=true').first().tap()   // (quotes on the move, K1 landed) the Quote screen keeps the desk header mounted but hidden — the visible Send ▾ is the foot's
    const row = p.getByRole('menuitem', { name: item }); await row.waitFor({ state: 'visible', timeout: 15000 }); await row.tap()
    const d = p.getByRole('dialog', { name: dialog }); await d.waitFor({ state: 'visible', timeout: 15000 }); await settle(p, 1000)
    return d
  }
  const fontOf = (loc) => loc.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight, tabular: getComputedStyle(el).fontVariantNumeric }))
  const tap = async (p, x, y) => { await p.touchscreen.tap(x, y) }
  const openSection = async (p, id) => {   // a collapsed card opens on its title; K1's section screen arrives open
    if (await p.getByTestId('section-screen').count()) return   // (quotes on the move, K1 landed) inside a section screen there is no fold — the first `aria-expanded=false` button would be a menu, not a title
    const card = p.locator(`#${id}`)
    if (await card.count() && !(await card.getAttribute('data-open'))) { await card.getByRole('button', { expanded: false }).first().click(); await settle(p, 600) }
  }

  try {
    // ── 1 · the payment cards at 390 ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Payment Schedule on a phone (390, touch): cards, the handle’s own box, the sheet')
    const M = await touchCtx(390, 844); const m = await page(M, 'phone')
    await go(m, `/quotes/${DRAFT}?edit=payment`)
    await openSection(m, 'section-payment')
    const card = m.getByTestId('payment-card').first()
    await card.scrollIntoViewIfNeeded(); await settle(m, 500)
    await shot(m, '01-m390-payments')
    ok(await m.getByRole('columnheader', { name: 'Percentage (%)' }).isVisible().catch(() => false) === false, 'no column heads on a phone — the rows are cards (B-11)')
    const cb = await box(card)
    ok(cb.h >= 72, `the card stands at least 72 tall (${Math.round(cb.h)})`)
    ok(await hit(m, cb.cx, cb.cy, '[data-testid="payment-card"], [aria-label^="Drag to reorder"]') === 'payment-card', 'a tap on the card’s middle lands on the card, not the handle (B-01)')
    ok(await hit(m, cb.x + 8, cb.cy, '[data-testid="payment-card"], [aria-label^="Drag to reorder"]') === 'payment-card', '…and 8px in from its left edge too')
    const handle = m.getByRole('button', { name: `Drag to reorder ${DEP.name}` })
    const hb = await box(handle)
    ok((await hit(m, hb.cx, hb.cy, '[aria-label^="Drag to reorder"]') || '').startsWith('Drag to reorder') && (await hit(m, hb.cx, hb.cy - 18, '[aria-label^="Drag to reorder"]') || '').startsWith('Drag to reorder'), 'the handle answers at its centre and 18px above it — a 44 box of its own')
    const table = m.getByRole('table', { name: 'Payment schedule' })
    ok(await table.evaluate((el) => el.scrollWidth === el.clientWidth), 'the schedule never scrolls sideways inside its box (B-22)')
    const name = card.locator('[class*="cardName"]'), amount = card.locator('[class*="cardAmount"]'), desc = card.locator('[class*="cardDesc"]'), share = card.locator('[class*="cardShare"]')
    const fn = await fontOf(name), fa = await fontOf(amount), fd = await fontOf(desc), fs2 = await fontOf(share)
    ok(fn.size === 16 && Number(fn.weight) >= 700, `the name reads 16 bold (${fn.size}/${fn.weight})`)
    ok(fa.size >= 18 && fa.tabular.includes('tabular'), `the amount reads ${fa.size} tabular — P-08’s 18–26`)
    ok(fd.size === 14 && fs2.size === 14, `the description and the share line read 14 (${fd.size} · ${fs2.size})`)
    ok(/^10% · On Approval$/.test((await share.innerText()).trim()), `the share line says "10% · On Approval" (${(await share.innerText()).trim()})`)
    // the sheet: a real tap, a changed share, Done
    await tap(m, cb.cx, cb.cy); await settle(m, 900)
    const sheet = m.getByRole('dialog', { name: DEP.name })
    ok(await sheet.isVisible(), 'a real tap opens the payment’s sheet, titled by the payment')
    await shot(m, '02-m390-payment-sheet')
    const pctBox = sheet.getByRole('textbox', { name: /Share \(%\)/ })
    ok(await pctBox.inputValue() === '10', `the sheet opens on the share as it stands (${await pctBox.inputValue()})`)
    const amountBox = sheet.getByRole('textbox', { name: /Amount \(S\$\)/ })
    await pctBox.fill('15'); await settle(m, 200)
    ok(/^7475\.7[01]$/.test(await amountBox.inputValue()), `typing 15% gives the amount of 15% at once (${await amountBox.inputValue()})`)
    const doneBtn = sheet.getByTestId('payment-sheet-done')
    const db = await box(doneBtn)
    ok(await hit(m, db.cx, db.y - 3, '[data-testid="payment-sheet-done"]') === 'payment-sheet-done', 'Done answers 3px above its 36 box — the foot’s 44 overlay (B-16)')
    await tap(m, db.cx, db.cy); await settle(m, 1200)
    ok(!(await sheet.isVisible().catch(() => false)), 'Done closes the sheet')
    ok((await share.innerText()).trim().startsWith('15%'), `the card reads the new share (${(await share.innerText()).trim()})`)
    ok(Number(sql(`select pct from quote_payments where id = '${DEP.id}'`)) === 15, 'the share is written (quote_payments.pct = 15)')
    // Remove → Undo
    await tap(m, cb.cx, cb.cy); await settle(m, 900)
    await sheet.getByTestId('payment-sheet-remove').click(); await settle(m, 1200)
    ok(await m.getByTestId('payment-card').filter({ hasText: DEP.name }).count() === 0, 'Remove takes the card away')
    const undo = m.getByRole('button', { name: 'Undo' })
    ok(await undo.isVisible(), `…with its Undo ("${DEP.name} removed")`)
    await undo.click(); await settle(m, 1500)
    ok(await m.getByTestId('payment-card').filter({ hasText: DEP.name }).count() === 1, 'Undo brings the payment back')
    // the share back to 10 through the sheet (a schedule at 105% is a blocking issue — Send would refuse), a second real round trip
    const card2 = m.getByTestId('payment-card').filter({ hasText: DEP.name }).first()
    const cb2 = await box(card2)
    await tap(m, cb2.cx, cb2.cy); await settle(m, 900)
    await sheet.getByRole('textbox', { name: /Share \(%\)/ }).fill(String(DEP.pct)); await settle(m, 200)
    const db2 = await box(sheet.getByTestId('payment-sheet-done'))
    await tap(m, db2.cx, db2.cy); await settle(m, 1200)
    ok(Number(sql(`select pct from quote_payments where quote_id = '${DRAFT}' and name = '${DEP.name.replace(/'/g, "''")}'`)) === DEP.pct, `…and the share is put back through the sheet (${DEP.name}: pct = ${DEP.pct}; Undo re-creates the row, so by name)`)
    ok(await sideways(m) <= 0, 'no sideways scroll at 390')

    // ── 2 · Terms on a phone: the row, the full-screen editor, the 44 tools ──────────────────────────────────────────────────────────
    console.log('2 · Terms and Conditions on a phone: one row, the full-screen editor (B-12 · B-16)')
    await go(m, `/quotes/${DRAFT}?edit=terms`)
    await openSection(m, 'section-terms')
    const row = m.getByTestId('text-row').first()
    await row.scrollIntoViewIfNeeded(); await settle(m, 400)
    await shot(m, '03-m390-terms-row')
    ok(await row.isVisible(), 'the Terms body is one row on a phone')
    ok(/clauses? · (shown|not shown) to the client/.test(await row.innerText()), `the row says what it holds and whether the client sees it ("${(await row.innerText()).split('\n')[0]}")`)
    ok(await m.locator('#section-terms [contenteditable="true"]').count() === 0, 'no open editor on the page (the 1,904px contenteditable is gone)')
    const rb = await box(row)
    await tap(m, rb.cx, rb.cy); await settle(m, 1000)
    const ed = m.getByRole('dialog', { name: 'Terms and Conditions' })
    ok(await ed.isVisible(), 'a real tap opens the editor')
    const edBox = await box(ed)
    ok(Math.round(edBox.w) === 390 && Math.round(edBox.h) >= 800, `…full-screen (${Math.round(edBox.w)}×${Math.round(edBox.h)})`)
    await shot(m, '04-m390-terms-editor')
    const bold = ed.getByRole('button', { name: 'Bold' }), italic = ed.getByRole('button', { name: 'Italic' })
    const bb = await box(bold), ib = await box(italic)
    ok(bb.w === 44 && bb.h === 44, `Bold is a 44×44 box (${bb.w}×${bb.h})`)
    ok(Math.round(ib.x - bb.x) === 44, `the tools sit at a 44 pitch (${Math.round(ib.x - bb.x)})`)
    ok(await hit(m, bb.x + bb.w - 2, bb.cy, '[aria-label="Bold"], [aria-label="Italic"]') === 'Bold' && await hit(m, ib.x + 2, ib.cy, '[aria-label="Bold"], [aria-label="Italic"]') === 'Italic', 'two pixels inside each edge is each tool’s own')
    const edBody = ed.getByRole('textbox', { name: 'Terms and Conditions' })
    await edBody.click(); await m.keyboard.press('End'); await m.keyboard.type(' rqk5probe'); await settle(m, 1400)
    ok(sql(`select terms_html like '%rqk5probe%' from quotes where id = '${DRAFT}'`) === '1', 'a word typed in the sheet autosaves')
    const edDone = ed.getByTestId('text-sheet-done')
    const edb = await box(edDone)
    ok(await hit(m, edb.cx, edb.y - 3, '[data-testid="text-sheet-done"]') === 'text-sheet-done', 'Done answers 3px above its box (B-16)')
    await tap(m, edb.cx, edb.cy); await settle(m, 800)
    ok(!(await ed.isVisible().catch(() => false)), 'Done closes the editor')
    ok(await m.getByTestId('text-row').first().isVisible(), '…back to the row')

    // ── 3 · Files, Signature, Activity on a phone ─────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Files · Signature · Activity on a phone (B-15 · P-08)')
    await go(m, `/quotes/${DRAFT}?edit=files`)
    await openSection(m, 'section-files')
    const kebab = m.locator('#section-files').getByRole('button', { name: /^More options for / }).first()   // the Files TILE's kebab (the Items rows carry the same label)
    await kebab.scrollIntoViewIfNeeded(); await settle(m, 400)
    await shot(m, '05-m390-files')
    const kb = await box(kebab)
    const kebabAt = async (dx, dy) => ((await hit(m, kb.cx + dx, kb.cy + dy, '[aria-label^="More options for"]')) || '').startsWith('More options for')
    ok(await kebabAt(0, 0) && await kebabAt(-10, 0) && await kebabAt(10, 0) && await kebabAt(0, -10) && await kebabAt(0, 10), 'the tile’s kebab answers at its centre and 10px either side — not the caption (B-15)')
    const filesLabel = m.locator('#section-files label').filter({ hasText: 'Show in client view' }).first()
    ok((await fontOf(filesLabel)).size === 14, `"Show in client view" reads 14 on the phone (${(await fontOf(filesLabel)).size})`)
    await go(m, `/quotes/${DRAFT}?edit=signature`)
    await openSection(m, 'section-signature')
    const sigLabel = m.locator('#section-signature label').filter({ hasText: 'Client signs online' }).first()
    await sigLabel.scrollIntoViewIfNeeded(); await settle(m, 300)
    await shot(m, '06-m390-signature')
    ok((await fontOf(sigLabel)).size === 14, `"Client signs online" reads 14 (${(await fontOf(sigLabel)).size})`)
    const nricLine = m.locator('#section-signature').getByText(/NRIC:/).first()
    ok((await fontOf(nricLine)).size === 14, `the NRIC line reads 14 (${(await fontOf(nricLine)).size})`)
    await go(m, `/quotes/${DRAFT}`)   // (quotes on the move, K1 landed) Activity is not a section screen — it is a folded row on the Quote screen
    { const fold = m.getByTestId('fold-activity'); await fold.scrollIntoViewIfNeeded(); const btn = (await fold.getByRole('button').count()) ? fold.getByRole('button').first() : fold; if ((await btn.getAttribute('aria-expanded')) !== 'true') { await btn.tap(); await settle(m, 500) } }
    const actRow = m.getByRole('list', { name: 'Quote activity' }).getByRole('listitem').first()
    await actRow.scrollIntoViewIfNeeded(); await settle(m, 300)
    await shot(m, '07-m390-activity')
    const when = actRow.locator('[class*="when"]'), text = actRow.locator('[class*="text"]')
    ok((await fontOf(text)).size === 16 && (await fontOf(when)).size === 14, `Activity reads 16 over 14 (${(await fontOf(text)).size} · ${(await fontOf(when)).size})`)

    // ── 4 · Send for confirmation · the contract picker · Version History at 390 ───────────────────────────────────────────────
    console.log('4 · Send ▾ on a phone: the confirmation sheet (B-17), the template list (B-18), the snackbar over a sheet (B-19)')
    await go(m, `/quotes/${DRAFT}`)
    const conf = await openSend(m, /Send for confirmation/, 'Send for confirmation')
    ok(await conf.isVisible(), 'Send ▾ › Send for confirmation opens its sheet')
    await conf.getByRole('textbox', { name: /Client phone/ }).waitFor({ state: 'visible' })
    await shot(m, '08-m390-confirm')
    const code = conf.getByText('+65').first()
    const phoneBox = conf.getByRole('textbox', { name: /Client phone/ })
    const codeB = await box(code), phoneB = await box(phoneBox)
    ok(Math.abs(codeB.cy - phoneB.cy) < 4, `"+65" and the number share one line (${Math.round(codeB.cy)} · ${Math.round(phoneB.cy)})`)
    const ta = conf.locator('textarea')
    ok(await ta.evaluate((el) => el.scrollHeight <= el.clientHeight + 2), 'the message box holds its whole message — no scroll inside the sheet')
    ok(await conf.locator('code').isVisible().catch(() => false) === false, 'no link row (Copy link is in the foot)')
    const under = conf.locator('[class*="sendUnder"]')
    ok((await box(under)).h <= 44 && await under.getByText(/characters/).count() === 0, `Reset message · Write with AI sit on one row — no character count on a phone (${Math.round((await box(under)).h)} tall)`)
    const over = await conf.locator('[data-surface-foot]').evaluate((el) => { const body = el.previousElementSibling; return body.scrollHeight - body.clientHeight })
    ok(over <= 0, `the whole sheet is in view at 390×844 — the body does not scroll (${over > 0 ? `${over}px over` : `${-over}px to spare`}); iOS types at 16 (REG-306) and scrolls a little under the pinned foot`)
    const sendBtn = conf.getByRole('button', { name: 'Send via WhatsApp' }), copyBtn = conf.getByRole('button', { name: /Copy link|Copied/ })
    const sb = await box(sendBtn), cpb = await box(copyBtn)
    ok(await hit(m, sb.cx, sb.y - 3, 'button') === 'Send via WhatsApp' && /^Copy link|^Copied/.test(await hit(m, cpb.cx, cpb.y + cpb.h + 3, 'button') || ''), 'Send via WhatsApp and Copy link answer 3px past their 36 boxes — the house touch overlay on every DS md button (B-16 · REG-344)')
    await m.keyboard.press('Escape'); await settle(m, 600)
    // the contract template list
    const picker = await openSend(m, /Send for signature/, 'Choose a contract template')
    ok(await picker.isVisible(), 'Send ▾ › Send for signature opens the picker')
    await picker.getByTestId('contract-starter-row').waitFor({ state: 'visible', timeout: 15000 }); await settle(m, 600)
    await shot(m, '09-m390-contract-picker')
    const rows = picker.locator('[data-testid="contract-starter-row"], [data-testid="contract-template-option"]')   // the DS radio's row = its label (the input inside is 13px)
    ok(await picker.getByRole('radio').count() === await rows.count() && await rows.count() >= 2, `the templates are a radio list (${await rows.count()} rows)`)
    ok(await rows.first().innerText().then((t) => t.includes('Start from the studio agreement')), 'the first row is "Start from the studio agreement"')
    ok(await picker.locator('[data-surface-foot] button').count() === 1, 'one button in the foot (B-18)')
    const useBtn = picker.getByTestId('contract-template-use')
    ok((await useBtn.innerText()).trim() === 'Use template', `the suggested template is picked: the button reads "Use template" (${(await useBtn.innerText()).trim()})`)
    const first = await box(rows.first())
    ok(first.h >= 56, `a row stands at least 56 tall (${Math.round(first.h)})`)
    const rowName = rows.first().locator('[class*="pickName"]'), rowMeta = rows.first().locator('[class*="pickMeta"]')
    ok((await fontOf(rowName)).size === 16 && (await fontOf(rowMeta)).size === 14, `a row reads 16 over 14 (${(await fontOf(rowName)).size} · ${(await fontOf(rowMeta)).size})`)
    await tap(m, first.cx, first.cy); await settle(m, 400)
    ok((await useBtn.innerText()).trim() === 'Start from the studio agreement', `picking the first row names the button after it (${(await useBtn.innerText()).trim()})`)
    const second = await box(rows.nth(1))
    await tap(m, second.cx, second.cy); await settle(m, 400)
    ok((await useBtn.innerText()).trim() === 'Use template', '…and a template puts "Use template" back')
    const contractsBefore = Number(sql(`select count(*) from contracts`))
    const ub = await box(useBtn)
    await tap(m, ub.cx, ub.cy); await m.waitForURL(/\/contracts\//, { timeout: 15000 }).catch(() => {}); await settle(m, 1200)
    ok(/\/contracts\//.test(m.url()) && Number(sql(`select count(*) from contracts`)) === contractsBefore + 1, 'pressing it makes the contract and opens its editor')
    // Version History under a live snackbar (the audit's own sequence: ⋮ › Revise on a never-sent Draft says its rule, then the sheet rises under it)
    await go(m, `/quotes/${DRAFT}`)
    await m.getByRole('button', { name: 'More options' }).first().click(); await settle(m, 600)
    await m.getByRole('menuitem', { name: /Revise — new version/ }).click(); await settle(m, 400)
    const snack = m.locator('[data-om-snackbar] [class*="bar"]').first()
    ok(await snack.isVisible(), 'Revise on a never-sent Draft answers with its rule in a snackbar')
    await m.getByRole('button', { name: 'More options' }).first().click(); await settle(m, 600)
    await m.getByRole('menuitem', { name: 'Version History' }).click()
    const hist = m.getByRole('dialog', { name: 'Version History' })
    await hist.waitFor({ state: 'visible', timeout: 15000 }); await settle(m, 1300)
    ok(await hist.isVisible(), '⋮ › Version History opens as a sheet')
    await shot(m, '10-m390-history-snackbar')
    const histFoot = hist.locator('[data-surface-foot]')
    if (await snack.isVisible().catch(() => false)) {
      const snb = await box(snack), fb = await box(histFoot)
      ok(snb.y + snb.h <= fb.y + 1, `the snackbar sits above the sheet’s foot (snackbar bottom ${Math.round(snb.y + snb.h)} ≤ foot top ${Math.round(fb.y)}) (B-19)`)
      const closeBtn = hist.getByRole('button', { name: 'Close' }).last()
      const clb = await box(closeBtn)
      ok(await hit(m, clb.cx, clb.cy, 'button') === 'Close', 'Close answers at its centre — nothing covers it')
    } else ok(false, 'the snackbar is still up when the sheet has risen (its lifetime covers the two presses)')
    await m.keyboard.press('Escape'); await settle(m, 400)
    ok(await sideways(m) <= 0, 'no sideways scroll at 390 after the sheets')
    await M.close()

    // ── 5 · the tablet (768, touch) ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · A touch tablet (768): the cards too, the toolbar unclipped, the Send ▾ menu inside the screen (B-11 · B-13 · B-02)')
    const T = await touchCtx(768, 1024); const t = await page(T, 'tablet')
    await go(t, `/quotes/${DRAFT}?edit=payment`)
    await openSection(t, 'section-payment')
    const tcard = t.getByTestId('payment-card').first()
    await tcard.scrollIntoViewIfNeeded(); await settle(t, 400)
    await shot(t, '11-t768-payments')
    ok(await t.getByRole('columnheader', { name: 'Percentage (%)' }).isVisible().catch(() => false) === false && await tcard.isVisible(), 'the payments are cards at 768 too — no cut "Upon sigr" (B-11)')
    const tb = await box(tcard)
    await tap(t, tb.cx, tb.cy); await settle(t, 900)
    const tsheet = t.getByRole('dialog', { name: DEP.name })
    ok(await tsheet.isVisible(), 'a tap opens the sheet on a tablet')
    const tsb = await box(tsheet)
    ok(Math.round(tsb.w) === 400, `…as a 400 dialog (${Math.round(tsb.w)})`)
    await shot(t, '12-t768-payment-sheet')
    await t.keyboard.press('Escape'); await settle(t, 500)
    await go(t, `/quotes/${DRAFT}?edit=terms`)
    await openSection(t, 'section-terms')
    const tbold = t.getByRole('button', { name: 'Bold' }).first()
    await tbold.scrollIntoViewIfNeeded(); await settle(t, 400)
    const tbb = await box(tbold)
    ok(await hit(t, tbb.cx, tbb.y - 8, '[aria-label="Bold"]') === 'Bold' && await hit(t, tbb.cx, tbb.y + tbb.h + 8, '[aria-label="Bold"]') === 'Bold', 'Bold answers 8px above and below its 24 mark — the 44 box is no longer clipped to 35 (B-13)')
    await shot(t, '13-t768-terms')
    await go(t, `/quotes/${DRAFT}`)   // (quotes on the move, K1 landed) on a tablet too the Send ▾ is the Quote screen's foot, not a section screen's
    await t.getByTestId('quote-send').locator('visible=true').first().click()
    const menu = t.getByRole('menu').filter({ hasText: 'Send for confirmation' }).first()
    await menu.waitFor({ state: 'visible', timeout: 15000 }); await settle(t, 700)
    ok(await menu.isVisible(), 'Send ▾ opens its menu')
    const mb = await box(menu)
    ok(mb.x + mb.w <= 768 - 8 + 0.5 && mb.x >= 0, `the menu ends inside the screen (right edge ${Math.round(mb.x + mb.w)} ≤ 760) (B-02)`)
    ok(await sideways(t) <= 0, `the page gained no sideways scroll (${await sideways(t)})`)
    ok(await menu.getByRole('menuitem', { name: /Send for confirmation/ }).evaluate((el) => el.getBoundingClientRect().right <= 760.5), 'the rows’ help lines end inside the screen too')
    await shot(t, '14-t768-send-menu')
    await t.keyboard.press('Escape'); await settle(t, 300)
    await T.close()
    // ── 5b · a touch tablet held sideways (1024×768): the cards and the clamp hold at the tablet range's top edge ──
    console.log('5b · 1024 landscape (touch): the cards, the Send ▾ menu inside the screen')
    const T2 = await touchCtx(1024, 768); const t2 = await page(T2, 'tablet-1024')
    await go(t2, `/quotes/${DRAFT}?edit=payment`)
    await openSection(t2, 'section-payment')
    ok(await t2.getByTestId('payment-card').count() >= 1 && await t2.getByRole('columnheader', { name: 'Percentage (%)' }).isVisible().catch(() => false) === false, 'at 1024 (touch) the payments are cards too (B-11)')
    await t2.getByTestId('payment-card').first().scrollIntoViewIfNeeded(); await settle(t2, 300)
    await shot(t2, '17-t1024-payments')
    await go(t2, `/quotes/${DRAFT}`)   // (quotes on the move, K1 landed) the Send ▾ is the Quote screen's foot at 1024 too
    await t2.getByTestId('quote-send').locator('visible=true').first().click()
    const menu2 = t2.getByRole('menu').filter({ hasText: 'Send for confirmation' }).first()
    await menu2.waitFor({ state: 'visible', timeout: 15000 }); await settle(t2, 600)
    const mb2 = await box(menu2)
    ok(mb2.x + mb2.w <= 1024 - 8 + 0.5 && await sideways(t2) <= 0, `the Send ▾ menu ends inside a 1024 screen (right edge ${Math.round(mb2.x + mb2.w)} ≤ 1016) with no sideways scroll (B-02)`)
    await shot(t2, '18-t1024-send-menu')
    await t2.keyboard.press('Escape'); await settle(t2, 300)
    await T2.close()

    // ── 6 · the desktop is untouched (1440, mouse) ─────────────────────────────────────────────────────────────────────────────
    console.log('6 · 1440 with a mouse: the table and its inline edit as they were')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const d = await page(D, 'desk')
    await go(d, `/quotes/${DRAFT}`)
    await openSection(d, 'section-payment')
    ok(await d.getByRole('columnheader', { name: 'Percentage (%)' }).isVisible() && await d.getByRole('columnheader', { name: 'Amount (S$)' }).isVisible(), 'the heads read "Percentage (%)" and "Amount (S$)"')
    ok(await d.getByTestId('payment-card').count() === 0, 'no cards at 1440')
    const pct = d.getByRole('button', { name: '10%' }).first()
    await pct.scrollIntoViewIfNeeded(); await pct.click(); await settle(d, 500)
    ok(await d.getByRole('textbox', { name: /Percentage of / }).isVisible(), 'a click on "10%" opens the inline box')
    await d.keyboard.press('Escape'); await settle(d, 300)
    ok(await d.locator('#section-terms [contenteditable="true"]').count() === 1 && await d.getByTestId('text-row').count() === 0, 'Terms is the open editor on the desktop, not a row')
    await D.close()

    // ── 7 · 320 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · 320: no sideways scroll')
    const S = await touchCtx(320, 568); const s = await page(S, '320')
    await go(s, `/quotes/${DRAFT}?edit=payment`)
    await openSection(s, 'section-payment')
    ok(await sideways(s) <= 0, 'no sideways scroll at 320 with the cards')
    const scard = s.getByTestId('payment-card').first()
    await scard.scrollIntoViewIfNeeded(); await settle(s, 300)
    await shot(s, '15-m320-payments')
    const sb2 = await box(scard)
    await tap(s, sb2.cx, sb2.cy); await settle(s, 900)
    ok(await s.getByRole('dialog', { name: DEP.name }).isVisible(), 'the sheet opens at 320')
    ok(await sideways(s) <= 0, '…without a sideways scroll')
    await shot(s, '16-m320-payment-sheet')
    await S.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  console.log(`\nerrors: ${errors.length}`); for (const e of errors) console.log('  !', e)
  ok(errors.length === 0, 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
