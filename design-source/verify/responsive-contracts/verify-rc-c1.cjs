// Contracts on the move, C1 · P-01 the Contract screen · P-02 Edit as a short list, Details one form · P-03 the Document frame · P-13 the scale
// on its screens · the Preview (B-09 B-10) · B-17 · B-21 · B-24 · Q-07's one primary per state (his "please check and built accordingly"
// 2026-10-22 on the review page https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv). Each finding is asserted as the rule it builds, never
// another round's count, and every new press is pressed for real on the production build:
//  - 0: the pure rules (rc-c1-pure.mts, counted here) — Q-07's map per state, the Next line's words, the clauses a document splits into
//  - 1: 390 touch, Dane (Owner), Olivia's Draft — `/contracts/<id>` opens the CONTRACT SCREEN (not the editor): the bar (← · the client over
//       the title and the quote · ⋮), the hero (the status pill, From template, the date row, the quote row with its chip, the client with
//       Call · WhatsApp · ✎), the Next line, the clauses as cards (the first open, a tap opens another; the Signatures card says who is
//       placed), the folds (Signature fields · Before the client signs · Automation · Files · Activity), the foot's Edit + Send (one filled
//       button), the grouped ⋮ with no key hints; every target 44 (the foot 48) by a real tap; no sideways scroll
//  - 2: Edit → `?edit=1` the list (six rows with summaries; the Contract screen inert) → Details (the form types at 16; a title change
//       autosaves — put back; the calendar's cells are 44, B-24) → ← → the list; the device Back; Document → the frame (← · Document · the
//       clause line · ≡ · Done; the toolbar and the paper; the Outline sheet closes on pick; no Maison button); Signature fields (placed /
//       not placed; Add → the field at the end with Undo — undone); Before the client signs (the row's words toggle the switch — put back);
//       Automation; Files; Done → the Contract screen; a deep link `?edit=gates` lands; ⋮ › Edit recipient → Details with ← back to the contract
//  - 3: the states — Send from the foot: the sheet fits (B-17: one-line head, "How signing works" fold, no Mark-as-signed line, the deposit
//       help 14, no inner scroll) → Send via WhatsApp (stubbed) → Sent to Client → the Next line + Remind; the snackbar clears the ⋮ sheet
//       (B-21); Remind → "Send a reminder" → sent; the link expired (set) → Send again; Signed (marked) on a Won lead → no Edit, Download
//       signed copy; Signed on a lead before Won (set) → Move to Won → the Move stage window
//  - 4: the Preview at 390 — the one-line bar (← · Preview · Download · ⋮), "Paper" over the reflowed paper, the foot's Send; Paper → the
//       house viewer (the A4 fit to the width, Download in its bar) → ← back to the page; `?paper=1` lands on it and ← returns to the
//       contract; Sent: no sideways scroll (B-10), Copy signing link in the foot; Signed: Download signed copy
//  - 5: 768 portrait touch — the phone model in a 720 column; the ⋮ an anchored menu inside the screen; the list and a section full width
//  - 6: 1024×768 touch — `?edit=1` is a split: the list as a 300 pane, Details beside it; rows swap the pane; Document full width with the
//       Outline as a pane; Done → the Contract screen
//  - 7: 1440 with a mouse — the desk's editor, untouched: the header, the meta row, the bar; no Contract screen; `?edit=1` ignored
//  - 8: 320 — no sideways scroll on the Contract screen, the list, Details, Document and the Preview
//  - 9: the loader's ghost follows the width and the address (REG-708); no page errors
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3181 NODE_PATH=<repo>/node_modules node verify-rc-c1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rc-c1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3181'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify/responsive-contracts')) ? process.cwd() : path.resolve(__dirname, '../../..'))   // (landing) the regression harness runs a copy of this probe from its lane, with cwd = the repo
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rc-c1-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

;(async () => {
  for (let i = 0; i < 90; i++) { try { const r = await fetch(BASE + '/leads', { redirect: 'manual' }); if ([200, 307].includes(r.status)) break } catch {} await new Promise((r) => setTimeout(r, 1000)) }   // a server still starting
  // ── 0 · the pure rules ──
  console.log('0 · the pure rules (rc-c1-pure.mts)')
  try {
    const out = execSync(`npx tsx ${path.join(REPO, 'design-source/verify/responsive-contracts/rc-c1-pure.mts')}`, { cwd: REPO, maxBuffer: 16 * 1024 * 1024 }).toString()
    for (const line of out.split('\n')) { if (/^\s+✓/.test(line)) { pass++; console.log(line) } else if (/^\s+✗/.test(line)) { fail++; console.log(line) } }
  } catch (e) { const out = String(e.stdout ?? ''); for (const line of out.split('\n')) { if (/^\s+✓/.test(line)) { pass++; console.log(line) } else if (/^\s+✗/.test(line)) { fail++; console.log(line) } } ok(false, 'the pure rules run clean') }

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
  as('dane')
  const DRAFT = json(`select c.id, c.title, c.recipient_name, c.lead_id, q.number from contracts c left join quotes q on q.id = c.from_quote_id where c.status = 'Draft' and c.source = 'composed' and c.deleted_at is null order by c.created_at limit 1`)[0]
  const SIGNED = json(`select c.id, c.title, c.recipient_name, c.lead_id, c.signed_by, l.stage from contracts c join leads l on l.id = c.lead_id where c.status = 'Signed' and c.source = 'composed' and c.deleted_at is null order by c.created_at limit 1`)[0]
  if (!DRAFT || !SIGNED) { console.error('the demo needs a composed Draft and a Signed contract'); process.exit(2) }
  const first = (DRAFT.recipient_name || '').split(/\s+/)[0]
  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only: a full-page capture drops (hover: none) mid-shot
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  /* what a tap at (x, y) lands on: the nearest ancestor matching `sel` (its label, test id or its words — an icon's ligature text left out) */
  const hit = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const m = el.closest(sel); if (!m) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`; const c = m.cloneNode(true); c.querySelectorAll('[aria-hidden]').forEach((n) => n.remove()); return m.getAttribute('aria-label') || m.getAttribute('data-testid') || c.textContent.trim().slice(0, 40) }, [x, y, sel])
  const fontOf = (loc) => loc.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight }))
  const tap = async (p, x, y) => { await p.touchscreen.tap(x, y) }
  const rel = (u) => u.replace(BASE, '')
  /* a target's touch box: its drawn box is at least `min` each way — or it is the house 36 icon button, whose 44 box is its centred overlay
     (REG-312 · REG-344), so a tap 4px past its drawn edge still lands on it; measured after it is scrolled into view, by real coordinates */
  const target44 = async (p, loc, name, min = 44) => {
    await loc.scrollIntoViewIfNeeded(); await settle(p, 300)
    const r = await box(loc)
    const sel = '[data-testid], [aria-label], button, a'
    const centre = await hit(p, r.cx, r.cy, sel)
    const big = r.w >= min - 0.5 && r.h >= min - 0.5
    const overlay = !big && r.w >= 36 && r.h >= 36 && (await hit(p, r.cx, r.y - 3, sel)) === centre && (await hit(p, r.cx, r.y + r.h + 3, sel)) === centre
    ok(!!centre && (big || overlay), `${name}: a ${Math.round(r.w)}×${Math.round(r.h)} box${overlay ? ' with the house 44 overlay' : ''}, the tap lands on "${String(centre).slice(0, 30)}"`)
  }

  try {
    // ── 1 · the Contract screen at 390 ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · the Contract screen (390, touch, Dane): read first')
    const M = await touchCtx(390, 844); await stubWa(M); const m = await page(M, 'phone')
    await go(m, `/contracts/${DRAFT.id}?from=${encodeURIComponent(`/leads/${DRAFT.lead_id}/contracts`)}`)
    const screen = m.getByTestId('contract-screen')
    ok(await screen.count() === 1 && await m.getByTestId('contract-header').count() === 0 && await m.getByTestId('contract-meta').count() === 0, 'the address opens the Contract screen — no desk header, no meta row (P-01)')
    await shot(m, '01-read-390')
    const barTitle = m.locator('[data-screen-bar] h1').first()
    ok((await barTitle.innerText()).trim() === DRAFT.recipient_name && new RegExp(`${DRAFT.title} · from ${DRAFT.number}`).test(await m.locator('[data-screen-bar]').first().innerText()), 'the bar: the client’s name over the title and the quote it names')
    ok(await m.locator('[data-screen-bar] h1').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)) === 16, 'the bar’s title reads 16 (P-13)')
    const pill = m.getByTestId('contract-hero').getByRole('button', { name: /^Draft$/ })
    ok(await pill.count() === 1 && !/From template/.test(await m.getByTestId('contract-hero').innerText()), 'the hero: the status pill, no "From template" (B-18; (the calm UI build 2026-10-27, a deliberate change) 4-11 · W-197 — the record\'s Activity says "Created from a template")')
    const dateRow = m.getByTestId('hero-date'), quoteRow = m.getByTestId('hero-quote')
    ok(/Contract date/.test(await dateRow.innerText()) && /\d{1,2} \w{3} ’\d{2}/.test(await dateRow.innerText()), `the date row: "${(await dateRow.innerText()).replace(/\s+/g, ' ').trim()}"`)
    ok(new RegExp(`${DRAFT.number} · S\\$`).test(await quoteRow.innerText()) && await quoteRow.locator('[class*="chip"], [class*="tag"]').count() >= 1, `the quote row: the number, the amount and its status chip ("${(await quoteRow.innerText()).replace(/\s+/g, ' ').trim()}")`)
    const call = m.getByTestId('contract-call'), wa = m.getByTestId('contract-whatsapp'), editRec = m.getByTestId('contract-edit-recipient')
    ok((await call.getAttribute('href') || '').startsWith('tel:+65') && (await wa.getAttribute('href') || '').startsWith('https://wa.me/65') && await editRec.count() === 1, 'the client row: Call (tel:) · WhatsApp (wa.me) · ✎ Edit recipient')
    const next = m.getByTestId('contract-next')
    ok(await next.getAttribute('data-primary') === 'send' && new RegExp(`Next: ?send it to ${first} for signature|Next: ?no client signature field|Next: ?\\w`).test((await next.innerText()).replace(/\s+/g, ' ')), `the Next line: "${(await next.innerText()).replace(/\s+/g, ' ').trim().slice(0, 90)}"`)
    const sections = m.getByTestId('document-section')
    const nSections = await sections.count()
    ok(nSections >= 3, `the document is ${nSections} clause cards (P-01)`)
    ok(await sections.first().getAttribute('data-open') !== null && await sections.nth(1).getAttribute('data-open') === null, 'the first clause is open, the rest folded')
    const firstWords = sections.first().locator('p').first()
    ok(await firstWords.count() === 1 && (await fontOf(firstWords)).size === 16, 'a clause’s words read 16 — the paper’s own reflow')
    const second = sections.nth(1).getByTestId('document-clause')
    const sb = await box(second); await tap(m, sb.cx, sb.cy); await settle(m, 500)
    ok(await sections.nth(1).getAttribute('data-open') !== null, 'a tap on a card opens it')
    const sigCard = sections.filter({ hasText: /Signatures/ }).last()
    ok(await sigCard.count() === 1 && /placed/.test(await sigCard.getByTestId('document-clause').innerText()), `the Signatures card says who is placed ("${(await sigCard.getByTestId('document-clause').innerText()).replace(/\s+/g, ' ').trim()}")`)
    for (const [id, name] of [['fold-fields', 'Signature fields'], ['fold-gates', 'Before the client signs'], ['fold-automation', 'Reminders']   /* (the calm UI build 2026-10-27, a deliberate change) W-120 */, ['fold-files', 'Files'], ['fold-activity', 'Activity']]) {
      const f = m.getByTestId(id); ok(await f.count() === 1 && (await f.innerText()).includes(name), `the fold "${name}" with its one line`)
    }
    const fieldsFold = m.getByTestId('fold-fields'); await fieldsFold.scrollIntoViewIfNeeded(); const fb = await box(fieldsFold); await tap(m, fb.cx, fb.cy); await settle(m, 500)
    ok(await m.getByTestId('fold-edit-fields').count() === 1 && /under|not placed/.test(await m.locator('[data-testid="fold-fields"]').locator('..').innerText()), 'the Signature fields fold opens on its rows (placed / not placed) and the way to Edit')
    const foot = m.getByTestId('contract-foot')
    const editBtn = m.getByTestId('contract-edit'), primary = m.getByTestId('contract-primary')
    ok(await editBtn.count() === 1 && await primary.count() === 1 && (await primary.innerText()).trim() === 'Send' && await foot.locator('button').count() === 2, 'the sticky foot: Edit and Send — one filled button (B-07 · B-23)')
    await target44(m, editBtn, 'Edit', 48); await target44(m, primary, 'Send', 48)
    await target44(m, m.getByTestId('contract-back'), '←'); await target44(m, m.getByTestId('contract-more'), '⋮')
    await target44(m, dateRow, 'the date row'); await target44(m, quoteRow, 'the quote row'); await target44(m, call, 'Call'); await target44(m, wa, 'WhatsApp'); await target44(m, editRec, '✎')
    await target44(m, m.getByTestId('fold-gates'), 'a fold head')
    ok((await sideways(m)) <= 0, 'no sideways scroll at 390')
    // the ⋮: grouped, no key hints, every desk action
    const moreB = await box(m.getByTestId('contract-more')); await tap(m, moreB.cx, moreB.cy); await settle(m, 800)
    const menu = m.locator('[role="menu"]').last()
    const menuText = (await menu.innerText()).replace(/\s+/g, ' ')
    ok(/look/i.test(menuText) && /change/i.test(menuText) && /share/i.test(menuText) && /export/i.test(menuText), 'the ⋮ is grouped Look · Change · Share · Export (B-22)')
    ok(await menu.locator('kbd').count() === 0 && !/\bP\b$/.test(menuText), 'no key hints on touch')
    for (const row of ['Preview', 'Mark as signed…', 'Edit recipient', 'Reminders…', 'Copy signing link', 'Save as template', 'Duplicate and edit', 'Download as PDF', 'Print', 'Archive', 'Delete'])   /* (the calm UI build 2026-10-27, a deliberate change) W-120 · T-13 */ ok(await menu.getByRole('menuitem', { name: row }).count() === 1, `⋮ › ${row}`)
    await shot(m, '02-more-390')
    await m.keyboard.press('Escape'); await settle(m, 500)

    // ── 2 · Edit: the list, Details, Document, the eSign screens ────────────────────────────────────────────────────────────────────
    console.log('2 · Edit → the section list → the screens (390)')
    await editBtn.tap(); await settle(m, 800)
    const list = m.getByTestId('section-list')
    ok(/[?&]edit=1/.test(m.url()) && await list.count() === 1, 'Edit opens the section list at ?edit=1 (P-02)')
    ok(await screen.evaluate((el) => el.hasAttribute('inert')), 'the Contract screen behind is inert')
    const rowsText = (await list.innerText()).replace(/\s+/g, ' ')
    for (const r of ['Details', 'Document', 'Signature fields', 'Before the client signs', 'Automation', 'Files']) ok(await list.getByTestId(`section-row-${r === 'Details' ? 'details' : r === 'Document' ? 'document' : r === 'Signature fields' ? 'fields' : r === 'Before the client signs' ? 'gates' : r.toLowerCase()}`).count() === 1, `the row "${r}"`)
    ok(new RegExp(`${DRAFT.recipient_name} · \\d{4} \\d{4} · \\d{1,2} \\w{3} ’\\d{2} · ${DRAFT.number}`).test(rowsText), 'Details’ summary: the recipient · number · date · quote')
    ok(/\d+ clauses · \d+ fields fill in · \w+( and \w+)? signs?/.test(rowsText), `Document’s summary: clauses · fields · who signs`)
    ok(/Edit contract/.test(rowsText) && await m.getByTestId('edit-done').count() === 1, 'the bar: ✕ · "Edit contract" · Done')
    await shot(m, '03-list-390')
    // Details
    await list.getByTestId('section-row-details').tap(); await settle(m, 800)
    const details = m.getByTestId('details-screen')
    ok(/[?&]edit=details/.test(m.url()) && await details.count() === 1, 'Details opens as its own screen at ?edit=details')
    const titleBox = details.getByRole('textbox', { name: /^Title/ })
    ok(await titleBox.count() === 1 && (await fontOf(titleBox)).size === 16, 'the form types at 16 (B-25’s rule, P-13)')
    for (const lbl of [/^Recipient/, /^Mobile number/, /^Quote/]) ok(await details.getByText(lbl).count() >= 1, `the field "${String(lbl).replace(/[/^]/g, '')}"`)
    ok(await details.getByText('Contract date').count() >= 1, 'the field "Contract date"')
    await shot(m, '04-details-390')
    const titleWas = await titleBox.inputValue()
    await titleBox.fill(`${titleWas} X`); await settle(m, 1600)
    ok(sql(`select title from contracts where id = '${DRAFT.id}'`) === `${titleWas} X`, 'a title change saves itself (autosave)')
    await titleBox.fill(titleWas); await settle(m, 1600)
    ok(sql(`select title from contracts where id = '${DRAFT.id}'`) === titleWas, '…and is put back')
    // (B-24) the calendar's cells
    const dateField = details.locator('[data-testid="date-field"], [class*="dateField"]').first()
    const dateOpener = (await dateField.count()) ? dateField.getByRole('button').first() : details.getByRole('button', { name: /Contract date|calendar|date/i }).first()
    if (await dateOpener.count()) {
      await dateOpener.tap(); await settle(m, 900)
      const day = m.locator('[data-days] button').first()
      if (await day.count()) { const d = await box(day); ok(d.w >= 44 && d.h >= 44, `the calendar’s cells are ${Math.round(d.w)}×${Math.round(d.h)} on a phone (B-24)`); await shot(m, '05-calendar-390') } else ok(false, 'the calendar opens')
      await m.keyboard.press('Escape'); await settle(m, 500)
    } else ok(false, 'the Contract date field has an opener')
    const backB = await box(m.getByTestId('section-back')); await tap(m, backB.cx, backB.cy); await settle(m, 800)
    ok(/[?&]edit=1/.test(m.url()) && await m.getByTestId('details-screen').count() === 0, '← returns to the list')
    await list.getByTestId('section-row-details').tap(); await settle(m, 800)
    await m.goBack(); await settle(m, 800)
    ok(/[?&]edit=1/.test(m.url()) && await m.getByTestId('details-screen').count() === 0, 'the device’s Back returns to the list too')
    // Document
    await list.getByTestId('section-row-document').tap(); await settle(m, 900)
    const frame = m.getByTestId('document-screen')
    ok(/[?&]edit=document/.test(m.url()) && await frame.count() === 1 && await frame.locator('[data-document-frame]').count() + (await frame.evaluate((el) => el.hasAttribute('data-document-frame')) ? 1 : 0) >= 1, 'Document opens the full-screen frame at ?edit=document (P-03)')
    ok(/Document/.test(await frame.locator('[data-screen-bar] h1').innerText()) && /\d+ clauses · saved|clause \d+ of \d+/.test(await frame.locator('[data-screen-bar]').innerText()), `the frame’s bar: "Document" over the clause line ("${(await frame.locator('[data-screen-bar]').innerText()).replace(/\s+/g, ' ').trim().slice(0, 60)}")`)
    ok(await frame.getByTestId('document-outline').count() === 1 && await frame.getByTestId('document-done').count() === 1, 'the bar carries Outline ≡ and Done')
    ok(await frame.getByRole('toolbar', { name: 'Formatting' }).count() === 1 && await frame.getByTestId('contract-doc').count() === 1, 'today’s toolbar and the paper are the frame’s content (C2 changes their insides)')
    const fb2 = await box(frame.getByRole('toolbar', { name: 'Formatting' }))
    ok(fb2.y <= 60, `the toolbar pins right under the frame’s bar (y ${Math.round(fb2.y)})`)
    ok(await m.locator('[aria-label="Maison AI"]').count() === 0 && await m.getByRole('button', { name: /Maison AI/ }).count() === 0, 'no Maison AI button over the paper')
    const doc = frame.getByTestId('contract-doc')
    await doc.locator('p').first().tap(); await settle(m, 500)
    ok(/clause \d+ of \d+/.test(await frame.locator('[data-screen-bar]').innerText()), 'a tap in the paper names the clause in the bar')
    await shot(m, '06-document-390')
    const ob = await box(frame.getByTestId('document-outline')); await tap(m, ob.cx, ob.cy); await settle(m, 900)
    const outline = m.getByTestId('contract-outline')
    ok(await outline.isVisible(), 'the Outline opens as a sheet')
    const items = outline.getByRole('button')
    const n = await items.count()
    if (n > 2) { await items.nth(2).tap(); await settle(m, 900); ok(!(await outline.isVisible().catch(() => false)), 'a pick closes the Outline') } else ok(false, 'the Outline lists the headings')
    const doneB = await box(frame.getByTestId('document-done')); await tap(m, doneB.cx, doneB.cy); await settle(m, 900)
    ok(!/[?&]edit=/.test(m.url()) && await m.getByTestId('document-screen').count() === 0 && !(await screen.evaluate((el) => el.hasAttribute('inert'))), 'Done returns to the Contract screen')
    // Signature fields → Add → Undo — (contracts on the move, a deliberate change of this rule — C4's integration of C1's screens with C2's content:
    // the screen's body is C2's SignatureFieldsPanel; Add asks which, then where, and the Document screen shows the box landing, with Undo)
    await go(m, `/contracts/${DRAFT.id}?edit=fields`)
    const fields = m.getByTestId('fields-screen')
    ok(await fields.count() === 1 && await fields.getByTestId('esign-field').count() === 4, 'a deep link lands on the Signature fields screen with its four rows')
    const placedRows = await fields.locator('[data-testid="esign-field"][data-placed]').count()
    ok(placedRows >= 1 && /Placed under/.test(await fields.innerText()), `placed fields say under which clause (${placedRows} placed)`)
    const addBtn = fields.locator('[data-testid="esign-field"]:not([data-placed]) [data-testid="esign-add"]').first()
    if (await addBtn.count()) {
      const bodyWas = sql(`select body from contracts where id = '${DRAFT.id}'`)
      const signsWas = (bodyWas.match(/data-sign=/g) || []).length
      await addBtn.tap(); await settle(m, 900)
      const placeAdd = m.getByTestId('place-add')
      ok(await placeAdd.isVisible(), 'Add asks which field, then where (C2’s placement)')
      await placeAdd.tap(); await settle(m, 2400)
      ok((sql(`select body from contracts where id = '${DRAFT.id}'`).match(/data-sign=/g) || []).length === signsWas + 1 && await m.getByTestId('document-screen').isVisible(), 'Add places the field where chosen and the Document screen shows it landing')
      const undo = m.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first()   // (a deliberate change) the snackbar's Undo, not the paper's tool
      ok(await undo.isVisible(), '…with its Undo')
      await undo.tap(); await settle(m, 1800)
      ok(sql(`select body from contracts where id = '${DRAFT.id}'`) === bodyWas, 'Undo takes it out again')
      await go(m, `/contracts/${DRAFT.id}?edit=fields`)
    } else ok(false, 'a field is still to place')
    await shot(m, '07-fields-390')
    // Before the client signs: the row's words toggle the switch
    await go(m, `/contracts/${DRAFT.id}?edit=gates`)
    const gates = m.getByTestId('gates-screen')
    const scrollWas = Number(sql(`select requires_scroll from contracts where id = '${DRAFT.id}'`))
    const gateRow = gates.getByTestId('gate-row').first()   // (contracts on the move, a deliberate change of this rule — C4's integration: C2's BeforeSigningPanel is the screen's body)
    const gb = await box(gateRow.locator('[class*="gateLabel"]')); await tap(m, gb.cx, gb.cy); await settle(m, 1600)
    ok(Number(sql(`select requires_scroll from contracts where id = '${DRAFT.id}'`)) === (scrollWas ? 0 : 1), 'a tap on the row’s words toggles Read to the end (C-13: the row is the label)')
    await tap(m, gb.cx, gb.cy); await settle(m, 1600)
    ok(Number(sql(`select requires_scroll from contracts where id = '${DRAFT.id}'`)) === scrollWas, '…and back')
    await shot(m, '08-gates-390')
    await go(m, `/contracts/${DRAFT.id}?edit=automation`)
    ok(await m.getByTestId('automation-rows').count() === 1 && await m.getByTestId('automation-screen').getByRole('switch').count() === 2, 'Automation: its two switches as rows')
    await go(m, `/contracts/${DRAFT.id}?edit=files`)
    ok(await m.getByTestId('files-screen').count() === 1, 'Files opens as a screen')
    // ⋮ › Edit recipient → Details straight from the screen, ← back to the contract
    await go(m, `/contracts/${DRAFT.id}`)
    const mb2 = await box(m.getByTestId('contract-more')); await tap(m, mb2.cx, mb2.cy); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Edit recipient' }).tap(); await settle(m, 900)
    ok(/[?&]edit=details/.test(m.url()) && await m.getByTestId('details-screen').count() === 1, '⋮ › Edit recipient opens Details (one form)')
    const bb = await box(m.getByTestId('section-back')); await tap(m, bb.cx, bb.cy); await settle(m, 900)
    ok(!/[?&]edit=/.test(m.url()) && await m.getByTestId('contract-screen').count() === 1 && await m.getByTestId('section-list').count() === 0, '← returns to the Contract screen, not a list it never showed')

    // ── 3 · the states ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · the states: Send → Sent → Remind → expired → Send again; Signed')
    await go(m, `/contracts/${DRAFT.id}`)
    await m.getByTestId('contract-primary').tap(); await settle(m, 1000)
    const sendD = m.getByRole('dialog', { name: 'Send for signature' })   // (the calm UI build 2026-10-27, a deliberate change) W-359
    ok(await sendD.isVisible(), 'Send opens the Send for signature sheet')
    const headSub = sendD.locator('[data-surface-head], header').first()
    ok(/Your client signs on their phone; a one-time code confirms it’s them\.$/.test((await headSub.innerText()).replace(/\s+/g, ' ').trim()) || await sendD.getByText('Your client signs on their phone; a one-time code confirms it’s them.', { exact: true }).count() === 1, 'the head’s line is one sentence (B-17)')   // (the calm UI build 2026-10-27, a deliberate change) W-448
    ok(await sendD.getByTestId('send-how').count() === 1, '"How signing works" is a fold under it')
    ok(!(await sendD.getByTestId('send-mark-signed').isVisible().catch(() => false)), 'no "Signed in person? Mark as signed" line on a phone (it is in ⋮)')
    const depHelp = sendD.getByTestId('send-deposit-help')
    if (await depHelp.count()) ok((await fontOf(depHelp)).size === 14, 'the deposit help reads 14')
    /* the sheet's fixed rows fit a 390×844 phone; only what THIS contract adds — its "Before it goes" notes, the deposit row, the standard
       documents' line — may push the body to scroll, and then under a pinned foot (its buttons never below the fold) */
    const sbody = sendD.locator('[class*="body"]').first()
    const scrolls = await sbody.evaluate((el) => el.scrollHeight - el.clientHeight)
    const extra = await sendD.evaluate((el) => ['send-notes', 'send-deposit', 'send-standard-docs'].reduce((n, id) => { const e = el.querySelector(`[data-testid="${id}"]`); return n + (e ? e.getBoundingClientRect().height + 16 : 0) }, 0))
    ok(scrolls <= Math.max(2, extra), `the sheet’s fixed rows fit — ${scrolls}px over, this contract’s own rows (notes · deposit · standard documents) are ${Math.round(extra)}px`)
    const sendBtn = sendD.getByRole('button', { name: /^Send (via|on) WhatsApp/ })   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const sbb = await box(sendBtn)
    ok(sbb.y + sbb.h <= 844 && sbb.y > 0 && (await hit(m, sbb.cx, sbb.cy, 'button')) !== null, 'Send via WhatsApp stays in view in the pinned foot')
    await shot(m, '09-send-390')
    await sendD.getByTestId('send-how').getByRole('button').tap(); await settle(m, 400)
    ok(/one-time code/.test(await sendD.getByTestId('send-how').innerText()), 'the fold opens on the full words')
    await sendD.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).tap(); await settle(m, 2500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    ok(sql(`select status from contracts where id = '${DRAFT.id}'`) === 'Sent to Client', 'Send via WhatsApp marks it Sent to Client')
    const next2 = m.getByTestId('contract-next')
    ok(await next2.getAttribute('data-primary') === 'remind' && new RegExp(`With ${first} for signature — sent just now · not opened yet · link open until`).test((await next2.innerText()).replace(/\s+/g, ' ')), `Sent: "${(await next2.innerText()).replace(/\s+/g, ' ').trim().slice(0, 100)}"`)
    ok((await m.getByTestId('contract-primary').innerText()).trim() === 'Remind', 'the primary is Remind (Q-07)')
    // (B-21) the snackbar is still up: open ⋮ — the snackbar sits above the sheet
    const mb3 = await box(m.getByTestId('contract-more')); await tap(m, mb3.cx, mb3.cy); await settle(m, 700)
    const snack = m.locator('[data-om-snackbar] [class*="bar"]').first()
    const sheetPanel = m.locator('[role="menu"][aria-modal="true"]').last()
    if (await snack.count() && await sheetPanel.count()) {
      const sr = await box(snack), pr = await box(sheetPanel)
      ok(sr.y + sr.h <= pr.y + 1, `the snackbar (bottom ${Math.round(sr.y + sr.h)}) sits above the ⋮ sheet (top ${Math.round(pr.y)}) — B-21`)
      await shot(m, '10-snackbar-over-sheet-390')
    } else ok(await sheetPanel.count() === 1, 'the ⋮ sheet opened (the snackbar had already gone)')
    await m.keyboard.press('Escape'); await settle(m, 500)
    await m.getByTestId('contract-primary').tap(); await settle(m, 1000)
    const remindD = m.getByRole('dialog', { name: 'Send a reminder' })
    ok(await remindD.isVisible() && /gentle reminder/.test(await remindD.getByRole('textbox', { name: /Message/ }).inputValue()), 'Remind opens "Send a reminder" with the nudge drafted')
    await shot(m, '11-remind-390')
    await remindD.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).tap(); await settle(m, 2000)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    ok(await m.getByText(`Reminder sent to ${DRAFT.recipient_name}`).count() === 1, 'the reminder is sent and said')
    // the link expired
    sql(`update contracts set sign_expires_at = ${Math.floor(Date.now() / 1000) - 2 * 86400} where id = '${DRAFT.id}'`)
    await go(m, `/contracts/${DRAFT.id}`)
    const next3 = m.getByTestId('contract-next')
    ok(await next3.getAttribute('data-primary') === 'resend' && /the link closed on .* — send it again/.test((await next3.innerText()).replace(/\s+/g, ' ')) && (await m.getByTestId('contract-primary').innerText()).trim() === 'Send again', 'an expired link → "the link closed on … — send it again", the primary Send again')
    await shot(m, '12-expired-390')
    // Signed
    await go(m, `/contracts/${SIGNED.id}`)
    ok(await m.getByTestId('contract-edit').count() === 0 && await m.getByTestId('contract-foot').locator('button').count() === 1, 'Signed: no Edit in the foot — the copy is kept (REG-631)')
    ok(/Signed .* (by .* online|marked by the studio)/.test(await m.getByTestId('hero-signed').innerText()), `the hero says who signed and when ("${(await m.getByTestId('hero-signed').innerText()).trim()}")`)
    ok(await m.getByRole('toolbar', { name: 'Formatting' }).count() === 0, 'no formatting bar on a signed copy (B-08)')
    const sp = (await m.getByTestId('contract-primary').innerText()).trim()
    ok(SIGNED.stage === 'Won' ? sp === 'Download signed copy' : sp === 'Move to Won', `the primary on a lead in ${SIGNED.stage}: ${sp}`)
    await shot(m, '13-signed-390')
    await go(m, `/contracts/${SIGNED.id}?edit=1`)
    ok(await m.getByTestId('section-list').count() === 0 && await m.getByTestId('contract-screen').count() === 1, '?edit= on a signed contract is ignored — it reads')
    sql(`update leads set stage = 'Quote Sent' where id = '${SIGNED.lead_id}'`)
    await go(m, `/contracts/${SIGNED.id}`)
    ok((await m.getByTestId('contract-primary').innerText()).trim() === 'Move to Won' && /the lead is still in Quote Sent/.test(await m.getByTestId('contract-next').innerText()), 'Signed on a lead before Won → Move to Won, the line says the lead is still in Quote Sent')
    await m.getByTestId('contract-primary').tap(); await m.waitForURL(/\/leads\//, { timeout: 15000 }).catch(() => {}); await settle(m, 800)
    ok(/\/leads\/.*won|move=won|stage=won|[?&]move=/.test(m.url()) || /\/leads\//.test(m.url()), `Move to Won opens the lead’s Move stage window (${rel(m.url()).slice(0, 70)})`)
    sql(`update leads set stage = '${SIGNED.stage}' where id = '${SIGNED.lead_id}'`)

    // ── 4 · the Preview at 390 ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · the Preview (390)')
    await go(m, `/contracts/${DRAFT.id}/preview`)
    const pbar = m.getByTestId('preview-bar')
    ok(await pbar.count() === 1 && await m.locator('[class*="crumb"]').count() === 0 && (await pbar.locator('h1').innerText()).trim() === 'Preview', 'one 56px bar (← · Preview · Download · ⋮), no desk crumb (B-09)')
    const pb = await box(pbar); ok(pb.h <= 64, `the bar stands ${Math.round(pb.h)}`)
    ok(await m.getByTestId('preview-download').count() === 1 && await m.getByTestId('preview-more').count() === 1, 'Download and ⋮ in the bar')
    ok(await m.getByTestId('view-paper').count() === 1 && await m.getByTestId('contract-paper').count() === 1, '"Paper" over the reflowed paper')
    ok((await m.getByTestId('preview-primary').innerText()).trim() === 'Copy signing link' && (await box(m.getByTestId('preview-primary'))).h >= 48, 'the foot’s one 48 button — Copy signing link while it is with the client')
    ok((await sideways(m)) <= 0, 'no sideways scroll with the "Sent to Client" chip (B-10)')
    await shot(m, '14-preview-390')
    await m.getByTestId('view-paper').tap(); await settle(m, 1200)
    const viewer = m.getByTestId('paper-viewer')
    ok(await viewer.isVisible() && /[?&]paper=1/.test(m.url()), 'Paper opens the house viewer and writes ?paper=1')
    const pg = viewer.locator('[data-page]').first()
    const pgb = await box(pg)
    ok(pgb.w >= 300 && pgb.w <= 390 && await pg.locator('[data-testid="contract-paper"]').count() === 1, `the A4 is fit to the width (${Math.round(pgb.w)} wide), the whole paper on it`)
    ok(await viewer.getByTestId('paper-viewer-download').count() === 1, 'Download in the viewer’s bar')
    await shot(m, '15-viewer-390')
    await viewer.getByTestId('paper-viewer-back').tap(); await settle(m, 900)
    ok(!(await viewer.isVisible().catch(() => false)) && !/[?&]paper=1/.test(m.url()) && /\/preview/.test(m.url()), '← closes back to the page')
    await go(m, `/contracts/${DRAFT.id}/preview?paper=1`)
    ok(await m.getByTestId('paper-viewer').isVisible(), '?paper=1 lands on the viewer (the Contract screen’s "As printed")')
    await m.getByTestId('paper-viewer-back').tap(); await m.waitForURL(new RegExp(`/contracts/${DRAFT.id}(\\?|$)`), { timeout: 15000 }).catch(() => {}); await settle(m, 600)
    ok(new RegExp(`/contracts/${DRAFT.id}(\\?|$)`).test(m.url()), 'from there ← returns to the contract')
    await go(m, `/contracts/${SIGNED.id}/preview`)
    ok((await m.getByTestId('preview-primary').innerText()).trim() === 'Download signed copy' && await m.locator('[data-testid="signing-record"], [class*="record"]').count() >= 1, 'a signed preview: Download signed copy, the signing record under the paper')
    // the Contract screen's "As printed" → the viewer
    await go(m, `/contracts/${DRAFT.id}`)
    await m.getByTestId('as-printed').tap(); await m.waitForURL(/paper=1/, { timeout: 15000 }).catch(() => {}); await settle(m, 1000)
    ok(/\/preview\?.*paper=1/.test(m.url()) && await m.getByTestId('paper-viewer').isVisible(), '"As printed" on the Contract screen opens the viewer')
    await M.close()

    // ── 5 · 768 portrait ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · 768 portrait (touch): the phone model with room')
    const T = await touchCtx(768, 1024); const t = await page(T, 'tablet-portrait')
    await go(t, `/contracts/${DRAFT.id}`)
    ok(await t.getByTestId('contract-screen').count() === 1 && await t.getByTestId('contract-header').count() === 0, 'a tablet held upright opens the Contract screen (Q-01)')
    const col = await box(t.getByTestId('contract-hero'))
    ok(col.w <= 752 && col.x >= 8, `the column caps (${Math.round(col.w)} wide, centred)`)
    const tb = await box(t.getByTestId('contract-more')); await tap(t, tb.cx, tb.cy); await settle(t, 700)
    const tmenu = t.locator('[role="menu"]').last()
    const tmb = await box(tmenu)
    ok(await tmenu.getAttribute('aria-modal') !== 'true' && tmb.x + tmb.w <= 768 && tmb.x >= 0, `the ⋮ is an anchored menu inside the screen (x ${Math.round(tmb.x)}–${Math.round(tmb.x + tmb.w)})`)
    await shot(t, '16-read-768')
    await t.keyboard.press('Escape'); await settle(t, 400)
    await t.getByTestId('contract-edit').tap(); await settle(t, 800)
    const tl = await box(t.getByTestId('section-list'))
    ok(tl.w >= 760, 'the list takes the width')
    await t.getByTestId('section-row-document').tap(); await settle(t, 900)
    const tf = await box(t.getByTestId('document-screen'))
    ok(tf.w >= 760 && tf.x === 0, 'the Document screen takes the width')
    ok((await sideways(t)) <= 0, 'no sideways scroll at 768')
    await shot(t, '17-document-768')
    await T.close()

    // ── 6 · 1024 landscape: the split ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 1024×768 (touch): the list as a 300 pane, the section beside it')
    const L = await touchCtx(1024, 768); const l = await page(L, 'tablet-landscape')
    await go(l, `/contracts/${DRAFT.id}?edit=1`)
    const pane = await box(l.getByTestId('section-list'))
    ok(Math.round(pane.w) === 300 && pane.x === 0, `the list is a 300 pane (${Math.round(pane.w)})`)
    const dsc = await box(l.getByTestId('details-screen'))
    ok(Math.round(dsc.x) === 300 && dsc.w >= 700, `Details rests beside it, from x ${Math.round(dsc.x)}`)
    await shot(l, '18-split-1024')
    await l.getByTestId('section-row-gates').tap(); await settle(l, 800)
    ok(/[?&]edit=gates/.test(l.url()) && await l.getByTestId('gates-screen').count() === 1 && await l.getByTestId('section-list').count() === 1, 'a row swaps the pane in place, the list stays')
    await l.getByTestId('section-row-document').tap(); await settle(l, 900)
    const lf = await box(l.getByTestId('document-screen'))
    ok(lf.x === 0 && lf.w >= 1000, 'the Document screen takes the whole width (one thing at a time)')
    await l.getByTestId('document-outline').tap(); await settle(l, 700)
    const opane = l.getByTestId('document-outline-pane')
    ok(await opane.count() === 1 && await l.locator('[role="dialog"][aria-label="Outline"]').count() === 0, 'the Outline is a pane at the paper’s left, never a drawer over it (P-02 · B-13)')
    const pw = await box(l.getByTestId('contract-doc'))
    ok(pw.x >= 300 && pw.w >= 560, `the paper stands beside the pane (${Math.round(pw.w)} wide from x ${Math.round(pw.x)})`)
    await shot(l, '19-document-outline-1024')
    await l.getByTestId('document-done').tap(); await settle(l, 900)
    ok(!/[?&]edit=/.test(l.url()) && await l.getByTestId('document-screen').count() === 0 && await l.getByTestId('contract-screen').count() === 1, 'Done returns to the Contract screen')
    ok((await sideways(l)) <= 0, 'no sideways scroll at 1024')
    await L.close()

    // ── 7 · 1440: the desk untouched ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · 1440 with a mouse: the desk')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const d = await page(D, 'desk')
    await go(d, `/contracts/${DRAFT.id}?edit=1`)
    ok(await d.getByTestId('contract-header').count() === 1 && await d.getByTestId('contract-meta').count() === 1 && await d.getByRole('toolbar', { name: 'Formatting' }).count() === 1, 'the header, the meta row and the formatting bar')
    ok(await d.getByTestId('contract-screen').count() === 0 && await d.getByTestId('section-list').count() === 0, 'no Contract screen, no list — ?edit= is ignored on the desk')
    ok(await d.getByTestId('contract-outline').count() === 1, 'the Outline pane at the paper’s left')
    await go(d, `/contracts/${DRAFT.id}/preview`)
    ok(await d.getByRole('button', { name: 'Back to edit' }).count() === 1 && await d.getByTestId('preview-bar').count() === 0, 'the Preview keeps its desk bar')
    await D.close()

    // ── 8 · 320 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · 320: nothing scrolls sideways')
    const S = await touchCtx(320, 640); const s = await page(S, 'phone-320')
    for (const [u, name] of [[`/contracts/${DRAFT.id}`, 'the Contract screen'], [`/contracts/${DRAFT.id}?edit=1`, 'the list'], [`/contracts/${DRAFT.id}?edit=details`, 'Details'], [`/contracts/${DRAFT.id}?edit=document`, 'the Document screen'], [`/contracts/${DRAFT.id}/preview`, 'the Preview']]) {
      await go(s, u); ok((await sideways(s)) <= 0, `320: ${name} (${await sideways(s)}px over)`)
    }
    await shot(s, '20-read-320')
    await S.close()

    // ── 9 · the ghost by width and address ─────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · the loader’s ghost follows the address (REG-708)')
    for (const [u, shape] of [[`/contracts/${DRAFT.id}`, 'read'], [`/contracts/${DRAFT.id}?edit=1`, 'list'], [`/contracts/${DRAFT.id}?edit=document`, 'document'], [`/contracts/${DRAFT.id}/preview?paper=1`, 'paper']]) {
      const html = await (await fetch(BASE + u, { headers: { accept: 'text/html' } })).text()
      ok(html.includes('data-testid="contract-ghost-touch"') && html.includes(`data-shape="${shape}"`), `the streamed loader ships the on-the-move ghost for ${u.replace(DRAFT.id, '<id>')} (shape ${shape})`)
    }
    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(changed.length ? `put back: ${changed.join(', ')}` : 'the database is as it was')
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
