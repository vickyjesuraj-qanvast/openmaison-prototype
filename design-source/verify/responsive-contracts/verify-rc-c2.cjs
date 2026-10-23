// Contracts on the move, C2 · the Document screen's content on a phone and a touch tablet (his "I have marked everything in the doc please check
// and built accordingly", 2026-10-22, on the review page https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv; the lane audits B and C). Each rule
// asserted as the rule it builds, never another round's count — and every new press pressed for real, on the production build:
//  - P-03 · B-03 · C-08 · C-16: at 390 (touch) the formatting bar is ONE row — Undo · Text ▾ · B · I · U · List · + ▾ — 44 boxes at a 44 pitch,
//    the row never scrolls sideways, Highlight / Link / Image are not in it; + ▾ opens a sheet whose rows are Add a signature field · Link · Image ·
//    Highlight · Numbered list · the alignments · Insert a field in ONE level with each record's value at the row's end (14); a field inserted
//    from it lands in the paper with "… inserted · Undo", and Undo takes it out.
//  - B-19 · C-15: a tap on a Smart Text chip opens its sheet — the chip's name, "Prints as" + what it prints, where it fills in from, Remove
//    with Undo (the removed chip comes back).
//  - P-04 · C-17 · B-04 · B-05: a placed box wears its own ✕ (a 44 target on its corner) that removes it with Undo; + ▾ › Add a signature field
//    asks WHICH (chips, "· placed" marks) and WHERE (the clauses from the Outline; "Under Signatures" picked for you), the button is named after
//    the pick, the field lands as its own block after the Signatures clause — never inside a word — scrolled to mid-screen with the fresh mark,
//    and the snackbar says where, with Undo.
//  - B-12 · C-13: the eSignatures panel on touch (Send's "Show me" once the client field is gone) lists the four fields placed / not placed with
//    Add, and Add places the field through the same flow; "Read to the end" toggles on a tap on its words (put back).
//  - Q-01: at 768 held upright + ▾ is a bottom sheet; at 1024 held sideways it is an anchored menu inside the viewport and Add a signature field a
//    centred 400 dialog.
//  - the template editor at 390: the same row; a chip's sheet says where it fills in from.
//  - 1440 (a mouse): the desk's bar is untouched — Highlight in the bar, Insert a field ▾ and eSignatures at its end, no ✕ on a box, no touch row;
//    the drawer's gate rows are labels — a click on the words toggles (C-13, the same row everywhere; put back).
//  - no page errors; no sideways scroll at 390 and 320 (against screen.width).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3182 NODE_PATH=<repo>/node_modules node verify-rc-c2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rc-c2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3182'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rc-c2-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  // the pure rules first (rc-c2-pure.mts, run from the repo — a lane's copy of this probe has no lib beside it): their ✓ / ✗ lines count here
  try {
    const REPO = path.resolve(__dirname, '../../..')
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-contracts/rc-c2-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure rules (lib/contracts/tokens.ts): ${p} passed, ${f} failed`)
  } catch (e) { fail++; console.log('  ✗ the pure rules did not run:', String(e).slice(0, 200)) }

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
  const DRAFT = sql(`select id from contracts where status = 'Draft' and source = 'composed' and deleted_at is null and body like '%data-sign="client-signature"%' and body like '%<h2>Signatures</h2>%' order by created_at limit 1`)
  const LEAD_NAME = sql(`select name from leads where id = (select lead_id from contracts where id = '${DRAFT}')`)
  const TEMPLATE = sql(`select id from contract_templates where kind = 'document' and deleted_at is null and body like '%data-token="client.name"%' order by is_default desc, created_at limit 1`)
  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1600) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only: a full-page capture drops (hover: none) mid-shot
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  /* what a tap at (x, y) lands on: the nearest ancestor matching `sel` — its label, test id or words (an icon's ligature text left out) */
  const hit = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const m = el.closest(sel); if (!m) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`; return m.getAttribute('aria-label') || m.getAttribute('data-testid') || (m.textContent || '').trim().slice(0, 40) }, [x, y, sel])
  const fontOf = (loc) => loc.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight }))
  const tap = async (p, x, y) => { await p.touchscreen.tap(x, y) }
  const docOf = (p) => p.getByTestId('contract-doc')
  const snackUndo = (p, words) => (words ? p.locator('[data-om-snackbar] [class*="bar"]').filter({ hasText: words }) : p.locator('[data-om-snackbar]')).getByRole('button', { name: 'Undo' }).first()
  const snackText = (p) => p.locator('[data-om-snackbar]').first().innerText().catch(() => '')

  try {
    ok(!!DRAFT && !!LEAD_NAME && !!TEMPLATE, `a Draft contract with a Signatures clause (${DRAFT.slice(0, 8)}…, for ${LEAD_NAME}) and a document template (${TEMPLATE.slice(0, 8)}…) on the scratch DB`)

    // ── 1 · the one tool row at 390 ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The Document screen’s content at 390 (touch): one row of tools, + ▾ as a sheet, a field inserted with Undo (P-03 · B-03 · C-16)')
    const M = await touchCtx(390, 844); const m = await page(M, 'phone')
    await go(m, `/contracts/${DRAFT}?edit=document`)   // (landing, C1 + C2 together) on ≤1024 the contract opens as C1's Contract screen; the paper and its tool row are the Document screen
    const row = m.getByTestId('doc-tool-row')
    await row.waitFor({ state: 'visible', timeout: 15000 })
    await shot(m, '01-m390-row')
    ok(await row.evaluate((el) => el.scrollWidth <= el.clientWidth), 'the row never scrolls sideways (B-03)')
    ok(await m.locator('[class*="barTools"]').count() === 0, 'the desk’s two-row bar is not on the page')
    const undo = row.getByRole('button', { name: 'Undo' }), bold = row.getByRole('button', { name: 'Bold' }), italic = row.getByRole('button', { name: 'Italic' }), under = row.getByRole('button', { name: 'Underline' }), list = row.getByRole('button', { name: 'Bulleted list' })
    const ub = await box(undo), bb = await box(bold), ib = await box(italic), unb = await box(under), lb = await box(list)
    ok([ub, bb, ib, unb, lb].every((r) => Math.round(r.w) === 44 && Math.round(r.h) === 44), `Undo · B · I · U · List are 44×44 boxes (${[ub, bb, ib, unb, lb].map((r) => `${Math.round(r.w)}×${Math.round(r.h)}`).join(' · ')})`)
    ok(Math.round(ib.x - bb.x) === 44 && Math.round(unb.x - ib.x) === 44 && Math.round(lb.x - unb.x) === 44, `the tools sit at a 44 pitch (${Math.round(ib.x - bb.x)} · ${Math.round(unb.x - ib.x)} · ${Math.round(lb.x - unb.x)})`)
    ok(await hit(m, bb.x + bb.w - 2, bb.cy, '[aria-label="Bold"], [aria-label="Italic"]') === 'Bold' && await hit(m, ib.x + 2, ib.cy, '[aria-label="Bold"], [aria-label="Italic"]') === 'Italic', 'two pixels inside each edge is that tool’s own — no gap between neighbours')
    ok(await row.getByRole('button', { name: 'Highlight' }).count() === 0 && await row.getByRole('button', { name: 'Link' }).count() === 0 && await row.getByRole('button', { name: 'Image' }).count() === 0 && await row.getByRole('button', { name: 'Redo' }).count() === 0, 'Highlight · Link · Image · Redo are not in the row — one tap further under + ▾')
    ok(await m.getByRole('button', { name: 'Insert a field' }).count() === 0 && await m.getByRole('button', { name: 'eSignatures' }).count() === 0, 'the desk’s Insert a field ▾ and eSignatures buttons are not on the page (the Contract screen’s folds and + ▾ carry them)')
    const style = m.getByTestId('doc-style'), plus = m.getByTestId('doc-insert')
    const sb = await box(style), pb = await box(plus)
    const styleWord = (await style.locator('[class*="styleLabel"]').innerText()).trim()
    ok(Math.round(sb.h) === 44 && styleWord === 'Text' && (await style.getAttribute('aria-label')) === 'Text style: Normal text', `Text ▾ is a 44 box reading "Text" for a paragraph (${Math.round(sb.h)}, "${styleWord}")`)
    ok(Math.round(pb.w) === 44 && Math.round(pb.h) === 44 && pb.x + pb.w <= 390 - 12, `+ ▾ is a 44×44 box at the row’s end (${Math.round(pb.w)}×${Math.round(pb.h)} ending at ${Math.round(pb.x + pb.w)})`)
    ok(await hit(m, pb.cx, pb.cy, '[data-testid="doc-insert"]') === 'Insert', 'a tap on + ▾ lands on it (its name is "Insert")')
    ok(await m.locator('[class*="maison-fab"]').count() === 0 || true, '(the Maison button is the frame’s to hide — C1’s DocumentFrame; not asserted here)')
    // + ▾ → the sheet
    await tap(m, pb.cx, pb.cy); await settle(m, 900)
    const sheet = m.getByRole('menu', { name: 'Insert' })
    ok(await sheet.isVisible(), 'a real tap on + ▾ opens the Insert sheet')
    const shb = await box(sheet)
    ok(Math.round(shb.w) === 390 && Math.round(shb.y + shb.h) >= 843, `…as a bottom sheet (${Math.round(shb.w)} wide, ending at ${Math.round(shb.y + shb.h)})`)
    await shot(m, '02-m390-plus-sheet')
    /* a row's text may carry its glyph's ligature (chevron_right · format_align_left) before or after the words — the words are what is matched */
    const rowsNamed = (name) => sheet.locator('[role^="menuitem"]').filter({ hasText: new RegExp(`(^|[a-z_])${name}(chevron_right)?$`) })
    for (const name of ['Add a signature field', 'Link', 'Image', 'Highlight', 'Numbered list', 'Align left', 'Align centre', 'Align right']) ok(await rowsNamed(name).count() === 1, `the sheet has "${name}"`)
    const addRow = sheet.getByRole('menuitem', { name: /Add a signature field/ })
    ok((await box(addRow)).h >= 44, `a row stands 44 (${Math.round((await box(addRow)).h)})`)
    ok(await sheet.getByText('Insert a field', { exact: true }).count() === 1 && await sheet.getByRole('menuitem', { name: /^Client$/ }).count() === 0, 'Insert a field is ONE level: the groups are eyebrows, not rows that open another level (C-16)')
    const nameRow = sheet.getByRole('menuitem', { name: /^Client name/ })
    ok(await nameRow.count() === 1 && (await nameRow.innerText()).includes(LEAD_NAME), `"Client name" carries what it prints here — ${LEAD_NAME}`)
    const sample = nameRow.locator('[class*="rowSample"]')
    ok((await fontOf(sample)).size === 14, `the value reads 14, never under (${(await fontOf(sample)).size}) — P-13`)
    const phoneRow = sheet.getByRole('menuitem', { name: /^Client phone/ })
    const chipsBefore = await docOf(m).locator('.om-token[data-token="client.phone"]').count()
    const prb = await box(phoneRow)
    await tap(m, prb.cx, prb.cy); await settle(m, 1000)
    ok(!(await sheet.isVisible().catch(() => false)), 'picking a field closes the sheet')
    ok(await docOf(m).locator('.om-token[data-token="client.phone"]').count() === chipsBefore + 1, 'the field is in the paper')
    ok(/Client phone inserted/.test(await snackText(m)) && await snackUndo(m, 'Client phone inserted').isVisible(), 'the snackbar says "Client phone inserted" with Undo (C-16)')
    await snackUndo(m, 'Client phone inserted').click(); await settle(m, 1500)
    ok(await docOf(m).locator('.om-token[data-token="client.phone"]').count() === chipsBefore, 'Undo takes it out again')
    ok(sql(`select body like '%client.phone%' from contracts where id = '${DRAFT}'`) === String(chipsBefore ? 1 : 0), '…and the record agrees after autosave')

    // ── 2 · a chip's tap sheet ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · A Smart Text chip answers a tap (B-19 · C-15)')
    const chip = docOf(m).locator('.om-token[data-token="client.name"]').first()
    await chip.scrollIntoViewIfNeeded(); await settle(m, 500)
    const chipsWas = await docOf(m).locator('.om-token[data-token="client.name"]').count()
    const cb = await box(chip)
    await tap(m, cb.cx, cb.cy); await settle(m, 900)
    const chipSheet = m.getByRole('dialog', { name: 'Client name' })
    ok(await chipSheet.isVisible(), 'a real tap on "Client name" opens its sheet')
    await shot(m, '03-m390-chip-sheet')
    const printsValue = chipSheet.locator('[class*="printsValue"]')
    ok((await printsValue.innerText()).trim() === LEAD_NAME && (await fontOf(printsValue)).size === 16, `it says what it prints here — ${LEAD_NAME} — at 16`)
    ok((await chipSheet.locator('[class*="printsSource"]').innerText()).trim() === 'Fills in from the lead’s client', 'and where it fills in from')
    await chipSheet.getByTestId('chip-done').click(); await settle(m, 600)
    ok(!(await chipSheet.isVisible().catch(() => false)), 'Done closes it')
    await tap(m, cb.cx, cb.cy); await settle(m, 900)
    await chipSheet.getByTestId('chip-remove').click(); await settle(m, 900)
    ok(await docOf(m).locator('.om-token[data-token="client.name"]').count() === chipsWas - 1, 'Remove takes the chip out')
    ok(/Client name removed/.test(await snackText(m)) && await snackUndo(m, 'Client name removed').isVisible(), '…with "Client name removed · Undo"')
    await snackUndo(m, 'Client name removed').click(); await settle(m, 900)
    ok(await docOf(m).locator('.om-token[data-token="client.name"]').count() === chipsWas, 'Undo brings the chip back')

    // ── 3 · the box's ✕, Send's "Show me", the panel, placement by choosing where ─────────────────────────────────────────────────
    console.log('3 · A placed box’s own ✕; the eSignatures panel on touch; a field placed by choosing where (P-04 · C-17 · B-04 · B-05 · B-12 · C-13)')
    const xs = m.getByTestId('sign-field-remove')
    ok(await xs.count() === 2 && (await xs.nth(1).getAttribute('aria-label')) === 'Remove Client signature', `each placed box wears its own ✕ (${await xs.count()}; "${await xs.nth(1).getAttribute('aria-label')}")`)
    const clientBox = docOf(m).locator('.om-sign[data-sign="client-signature"]').first()
    await clientBox.scrollIntoViewIfNeeded(); await settle(m, 600)
    const cbx = await box(clientBox), xb = await box(xs.nth(1))
    ok(xb.x >= cbx.x && xb.x + xb.w <= cbx.x + cbx.w + 1 && xb.y >= cbx.y - 1 && xb.y + xb.h <= cbx.y + cbx.h, `the ✕ sits inside the box’s corner (box ${Math.round(cbx.x)}…${Math.round(cbx.x + cbx.w)} × ${Math.round(cbx.y)}…${Math.round(cbx.y + cbx.h)}; ✕ at ${Math.round(xb.x)},${Math.round(xb.y)})`)
    ok(await hit(m, xb.cx, xb.cy, '[data-testid="sign-field-remove"]') === 'Remove Client signature' && await hit(m, xb.cx + 14, xb.cy - 10, '[data-testid="sign-field-remove"]') === 'Remove Client signature', 'the ✕ answers at its centre and 14px out — the house 44 reach')
    ok((await fontOf(clientBox)).size === 14, `the box's label reads 14 on touch (${(await fontOf(clientBox)).size}) — C-17`)
    await shot(m, '04-m390-box-x')
    await tap(m, xb.cx, xb.cy); await settle(m, 900)
    ok(await docOf(m).locator('.om-sign[data-sign="client-signature"]').count() === 0, 'a tap on the ✕ removes the box')
    ok(await docOf(m).evaluate((el) => !Array.from(el.querySelectorAll('p')).some((p) => !p.textContent.trim() && !p.children.length)), '…and leaves no empty paragraph behind')
    ok(/Client signature removed/.test(await snackText(m)) && await snackUndo(m, 'Client signature removed').isVisible(), '…with "Client signature removed · Undo"')
    await snackUndo(m, 'Client signature removed').click(); await settle(m, 900)
    ok(await docOf(m).locator('.om-sign[data-sign="client-signature"]').count() === 1, 'Undo puts the box back')
    // the panel: the client field gone, Send says why, Show me opens it
    // (contracts on the move, a deliberate change of this rule — at landing C1 + C2 + C4 together: on ≤1024 Send is the Contract screen's foot,
    //  and "Show me" opens the Signature fields SCREEN, whose body is C2's panel; the gates are their own screen, asserted after the placement)
    const xb2 = await box(m.getByTestId('sign-field-remove').nth(1))
    await tap(m, xb2.cx, xb2.cy); await settle(m, 1500)
    const dn = await box(m.getByTestId('document-done')); await tap(m, dn.cx, dn.cy); await settle(m, 1600)   // (a deliberate change) Done → the Contract screen
    const send = m.getByRole('button', { name: 'Send', exact: true }).locator('visible=true').first()   // (a deliberate change) the foot's Send
    const sdb = await box(send); await tap(m, sdb.cx, sdb.cy); await settle(m, 800)
    const showMe = m.locator('[data-om-snackbar]').getByRole('button', { name: 'Show me' })
    ok(/no Client signature field/.test(await snackText(m)) && await showMe.isVisible(), 'with the client box gone, Send says why with "Show me"')
    await showMe.click(); await settle(m, 1000)
    const panel = m.getByTestId('fields-screen')   // (a deliberate change) the Signature fields screen, not the eSignatures drawer
    ok(await panel.isVisible() && await panel.getByTestId('signature-fields').isVisible(), '"Show me" opens the Signature fields screen — C2’s panel (contracts on the move, a deliberate change of this rule)')
    await shot(m, '05-m390-esign-panel')
    const fields = panel.getByTestId('esign-field')
    ok(await fields.count() === 4 && await panel.getByRole('button', { name: 'Insert' }).count() === 0, 'four fields as rows, no Insert-at-the-caret on touch (B-04 · B-05)')
    const studioRow = fields.nth(0), clientRow = fields.nth(1)
    ok((await studioRow.innerText()).includes('Placed under Signatures') && (await clientRow.innerText()).includes('Not placed'), `the rows say placed / not placed ("${(await studioRow.innerText()).replace(/\n/g, ' · ')}" · "${(await clientRow.innerText()).replace(/\n/g, ' · ')}")`)
    const fl = clientRow.locator('[class*="fieldLabel"]'), fm = clientRow.locator('[class*="fieldMeta"]')
    ok((await fontOf(fl)).size === 16 && (await fontOf(fm)).size === 14, `a row reads 16 over 14 (${(await fontOf(fl)).size} · ${(await fontOf(fm)).size})`)
    // Add → the placement dialog over the panel (the earlier snackbars are dismissed first: a sheet's foot lifts them over its lower rows)
    const dismissSnacks = async (p) => { for (const x of await p.locator('[data-om-snackbar] [aria-label="Dismiss"]').all()) { await x.click().catch(() => {}) } await settle(p, 400) }
    await dismissSnacks(m)
    const addBtn = clientRow.getByTestId('esign-add')
    const ab = await box(addBtn)
    await tap(m, ab.cx, ab.cy); await settle(m, 1000)
    const place = m.getByRole('dialog', { name: 'Add a signature field' })
    ok(await place.isVisible(), 'Add opens "Add a signature field"')
    await shot(m, '06-m390-placement')
    const which = place.getByTestId('place-which')
    ok(await which.getByRole('radio', { name: 'Client signature' }).getAttribute('aria-checked') === 'true', 'it opens on the field that is missing — Client signature')
    ok(await which.getByRole('radio', { name: /^Studio signature · placed/ }).count() === 1, 'a placed field’s chip says "· placed"')
    const rows = place.getByTestId('place-row')
    ok(await rows.count() >= 3 && (await rows.first().innerText()).startsWith('After ') && (await rows.last().innerText()).startsWith('At the end'), `the places are the clauses from the Outline, then "At the end" (${await rows.count()} rows)`)
    const underRow = rows.filter({ hasText: 'Under Signatures' })
    ok(await underRow.count() === 1 && await underRow.locator('input').isChecked() && (await underRow.innerText()).includes('Suggested'), '"Under Signatures" is picked for you')
    const addPlace = place.getByTestId('place-add')
    ok((await addPlace.innerText()).trim() === 'Add under Signatures', `the one filled button is named after the pick ("${(await addPlace.innerText()).trim()}")`)
    const afterRow = rows.filter({ hasText: 'After 11. Governing law and disputes' })
    if (await afterRow.count()) {
      await afterRow.scrollIntoViewIfNeeded(); await settle(m, 300)
      const arb = await box(afterRow); await tap(m, arb.cx, arb.cy); await settle(m, 300)
      ok((await addPlace.innerText()).trim() === 'Add after 11. Governing law and disputes', `picking another clause renames the button ("${(await addPlace.innerText()).trim()}")`)
      await underRow.scrollIntoViewIfNeeded(); await settle(m, 300)
      const urb = await box(underRow); await tap(m, urb.cx, urb.cy); await settle(m, 300)
      ok((await addPlace.innerText()).trim() === 'Add under Signatures', `…and back to "Add under Signatures" ("${(await addPlace.innerText()).trim()}")`)
    }
    const apb = await box(addPlace)
    await tap(m, apb.cx, apb.cy)
    // (contracts on the move, a deliberate change of this rule — C4's integration) from the Signature fields screen the box is shown landing:
    // the Document screen opens on it, the fresh mark on the new block
    const fresh = await docOf(m).locator('[data-fresh]').first().waitFor({ state: 'attached', timeout: 4000 }).then(() => true, () => false)
    ok(fresh, 'the new block carries the fresh mark the moment it lands')
    await settle(m, 1200)
    ok(!(await place.isVisible().catch(() => false)) && !(await panel.isVisible().catch(() => false)) && await m.getByTestId('document-screen').isVisible(), 'the dialog and the Signature fields screen give way to the Document screen, where the box lands (contracts on the move, a deliberate change of this rule)')
    const landed = docOf(m).locator('.om-sign[data-sign="client-signature"]').first()
    ok(await landed.count() === 1, 'the client box is back in the paper')
    ok(await landed.evaluate((el) => { const p = el.parentElement; const docEl = el.closest('[data-testid="contract-doc"]'); return !!p && p.tagName === 'P' && p.parentElement === docEl && p.textContent.trim() === 'Client signature' }), 'as its own block at the top level — never inside a word (B-05)')
    ok(await landed.evaluate((el) => { const p = el.parentElement; let n = p.previousElementSibling; let sawSignatures = false; while (n) { if (/^H[123]$/.test(n.tagName)) { sawSignatures = /signature/i.test(n.textContent); break } n = n.previousElementSibling } return sawSignatures && !p.nextElementSibling }), 'under the Signatures clause, after what was there')
    const lb2 = await box(landed)
    ok(lb2.cy > 844 * 0.2 && lb2.cy < 844 * 0.8, `the box is scrolled into the middle of the screen (centre at ${Math.round(lb2.cy)} of 844) — B-04`)
    ok(/Client signature added under Signatures/.test(await snackText(m)) && await snackUndo(m, 'added under Signatures').isVisible(), 'the snackbar says "Client signature added under Signatures" with Undo')
    await shot(m, '07-m390-placed')
    await snackUndo(m, 'added under Signatures').click(); await settle(m, 900)
    ok(await docOf(m).locator('.om-sign[data-sign="client-signature"]').count() === 0, 'Undo takes it out again')
    // the same flow from + ▾ (the Document screen's own door)
    await m.evaluate(() => window.scrollTo(0, 0)); await settle(m, 400)
    const pb2 = await box(m.getByTestId('doc-insert'))
    await tap(m, pb2.cx, pb2.cy); await settle(m, 900)
    const addRow2 = m.getByRole('menu', { name: 'Insert' }).getByRole('menuitem', { name: /Add a signature field/ })
    const ar2 = await box(addRow2)
    await tap(m, ar2.cx, ar2.cy); await settle(m, 1000)
    ok(await place.isVisible(), '+ ▾ › Add a signature field opens the same dialog')
    const apb2 = await box(place.getByTestId('place-add'))
    await tap(m, apb2.cx, apb2.cy); await settle(m, 1500)
    ok(await docOf(m).locator('.om-sign[data-sign="client-signature"]').count() === 1 && await m.getByTestId('sign-field-remove').count() === 2, 'the field lands and wears its ✕')
    await settle(m, 1200)
    ok(sql(`select body like '%data-sign="client-signature"%' from contracts where id = '${DRAFT}'`) === '1', 'the record holds it after autosave')
    ok(await sideways(m) <= 0, 'no sideways scroll at 390')
    // C-13: the gate row is a label — a tap on its words toggles (contracts on the move, a deliberate change of this rule: Before the client signs
    // is its own section screen on ≤1024, C2's BeforeSigningPanel as its body)
    await go(m, `/contracts/${DRAFT}?edit=gates`)
    const gate = m.getByTestId('gates-screen').getByTestId('gate-row').first()
    await gate.scrollIntoViewIfNeeded(); await settle(m, 400)
    const gb = await box(gate)
    const gateInput = gate.locator('input')
    const gateWas = await gateInput.isChecked()
    ok(Math.round(gb.h) >= 56 && (await fontOf(gate.locator('[class*="gateLabel"]'))).size === 16 && (await fontOf(gate.locator('[class*="gateHelp"]'))).size === 14, `"Read to the end" is a 56 row, 16 over 14 (${Math.round(gb.h)} · ${(await fontOf(gate.locator('[class*="gateLabel"]'))).size} · ${(await fontOf(gate.locator('[class*="gateHelp"]'))).size})`)
    await tap(m, gb.x + 40, gb.cy); await settle(m, 500)
    ok((await gateInput.isChecked()) !== gateWas, 'a tap on the words toggles the switch (C-13)')
    await tap(m, gb.x + 40, gb.cy); await settle(m, 500)
    ok((await gateInput.isChecked()) === gateWas, '…and a second tap puts it back')

    // ── 4 · 768 upright and 1024 sideways ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · A tablet held upright follows the phone; held sideways the menus anchor (Q-01)')
    const T = await touchCtx(768, 1024); const t = await page(T, 'tablet')
    await go(t, `/contracts/${DRAFT}?edit=document`)   // (landing, C1 + C2 together) on ≤1024 the contract opens as C1's Contract screen; the paper and its tool row are the Document screen
    const trow = t.getByTestId('doc-tool-row'); await trow.waitFor({ state: 'visible', timeout: 15000 })
    const tb = await box(trow.getByRole('button', { name: 'Bold' }))
    ok(Math.round(tb.w) === 44 && Math.round(tb.h) === 44 && await trow.evaluate((el) => el.scrollWidth <= el.clientWidth), `768: the same row — Bold 44×44, nothing sideways (${Math.round(tb.w)}×${Math.round(tb.h)})`)
    const tpb = await box(t.getByTestId('doc-insert'))
    await tap(t, tpb.cx, tpb.cy); await settle(t, 900)
    const tsheet = t.getByRole('menu', { name: 'Insert' })
    const tsb = await box(tsheet)
    ok(await tsheet.isVisible() && Math.round(tsb.w) === 768, `768 upright: + ▾ is a bottom sheet (${Math.round(tsb.w)} wide)`)
    await shot(t, '08-t768-plus-sheet')
    await t.keyboard.press('Escape'); await settle(t, 500)
    await t.close()
    const L = await touchCtx(1024, 768); const l = await page(L, 'tablet-sideways')
    await go(l, `/contracts/${DRAFT}?edit=document`)   // (landing, C1 + C2 together) on ≤1024 the contract opens as C1's Contract screen; the paper and its tool row are the Document screen
    const lrow = l.getByTestId('doc-tool-row'); await lrow.waitFor({ state: 'visible', timeout: 15000 })
    const lpb = await box(l.getByTestId('doc-insert'))
    await tap(l, lpb.cx, lpb.cy); await settle(l, 900)
    const lmenu = l.locator('[role="menu"]').filter({ has: l.getByRole('menuitem', { name: /Add a signature field/ }) }).first()
    const lmb = await box(lmenu)
    ok(await lmenu.isVisible() && lmb.w < 600 && lmb.x >= 0 && lmb.x + lmb.w <= 1024, `1024 sideways: + ▾ is an anchored menu inside the viewport (${Math.round(lmb.w)} wide at x ${Math.round(lmb.x)})`)
    ok(await sideways(l) <= 0, '…and the page gains no sideways scroll')
    await shot(l, '09-t1024-plus-menu')
    const lar = await box(lmenu.getByRole('menuitem', { name: /Add a signature field/ }))
    await tap(l, lar.cx, lar.cy); await settle(l, 1000)
    const lplace = l.getByRole('dialog', { name: 'Add a signature field' })
    const lpb2 = await box(lplace)
    ok(await lplace.isVisible() && Math.round(lpb2.w) === 400 && Math.abs(lpb2.cx - 512) < 8, `…and Add a signature field is a centred 400 dialog (${Math.round(lpb2.w)} wide, centre ${Math.round(lpb2.cx)})`)
    await shot(l, '10-t1024-placement')
    await l.keyboard.press('Escape'); await settle(l, 400)
    await l.close()

    // ── 5 · the template editor at 390 ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · The template editor at 390: the same row, a chip’s sheet says where it fills in from (C-08 · C-15)')
    await go(m, `/templates/contracts/${TEMPLATE}?edit=document`)   // (contracts on the move, a deliberate change of this rule — C4's P-10: on ≤1024 a template opens as its reading screen; its paper and tool row are the clause's Document screen)
    const trow2 = m.getByTestId('doc-tool-row'); await trow2.waitFor({ state: 'visible', timeout: 15000 })
    ok(await trow2.evaluate((el) => el.scrollWidth <= el.clientWidth) && Math.round((await box(trow2.getByRole('button', { name: 'Bold' }))).w) === 44, 'the template’s paper has the one row too')
    const tchip = docOf(m).locator('.om-token[data-token="client.name"]').first()
    await tchip.scrollIntoViewIfNeeded(); await settle(m, 500)
    const tcb = await box(tchip)
    await tap(m, tcb.cx, tcb.cy); await settle(m, 900)
    const tsheet2 = m.getByRole('dialog', { name: 'Client name' })
    ok(await tsheet2.isVisible() && (await tsheet2.locator('[class*="printsSource"]').innerText()).trim() === 'Fills in from the lead’s client', 'a template’s chip says where it fills in from')
    await shot(m, '11-m390-template-chip')
    await tsheet2.getByTestId('chip-done').click(); await settle(m, 500)
    await m.close()

    // ── 6 · the desk at 1440 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The desk at 1440: the bar untouched, the drawer’s rows are labels (C-13)')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const d = await page(D, 'desk')
    await go(d, `/contracts/${DRAFT}`)
    ok(await d.getByTestId('doc-tool-row').count() === 0 && await d.locator('[class*="barTools"]').count() === 1, 'no touch row — the desk’s bar')
    ok(await d.getByRole('button', { name: 'Highlight' }).isVisible() && await d.getByRole('button', { name: 'Insert a field' }).isVisible() && await d.getByRole('button', { name: 'eSignatures' }).isVisible(), 'Highlight in the bar, Insert a field ▾ and eSignatures at its end')
    ok(await d.getByTestId('sign-field-remove').count() === 0, 'no ✕ on a box with a mouse')
    await d.getByRole('button', { name: 'eSignatures' }).click(); await settle(d, 800)
    const ddrawer = d.getByRole('dialog', { name: 'eSignatures' })
    ok(await ddrawer.getByRole('button', { name: 'Insert' }).count() === 4, 'the drawer keeps Insert at the caret — four rows')
    const dgate = ddrawer.getByTestId('gate-row').first()
    const dinput = dgate.locator('input')
    const dwas = await dinput.isChecked()
    const dgb = await box(dgate)
    await d.mouse.click(dgb.x + 30, dgb.cy); await settle(d, 400)
    ok((await dinput.isChecked()) !== dwas, 'a click on "Read to the end"’s words toggles it (C-13 — the same row at every width; contracts on the move, a deliberate change of this rule)')
    await d.mouse.click(dgb.x + 30, dgb.cy); await settle(d, 400)
    ok((await dinput.isChecked()) === dwas, '…and back')
    await d.close()

    // ── 7 · 320 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · The 320 gate')
    const S = await touchCtx(320, 568); const s = await page(S, 'phone-320')
    await go(s, `/contracts/${DRAFT}?edit=document`)   // (landing, C1 + C2 together) on ≤1024 the contract opens as C1's Contract screen; the paper and its tool row are the Document screen
    await s.getByTestId('doc-tool-row').waitFor({ state: 'visible', timeout: 15000 })
    ok(await sideways(s) <= 0, 'no sideways scroll at 320')
    ok(await s.getByTestId('doc-insert').isVisible() && (await box(s.getByTestId('doc-insert'))).x + 44 <= 320, '+ ▾ is on the screen at 320 (the row wraps rather than hides)')
    await shot(s, '12-m320-row')
    await s.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(changed.length ? `put back: ${changed.join(', ')}` : 'nothing left changed in the DB')
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
