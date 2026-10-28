// Contracts on the move, C4 · the lists, New contract, the templates, the contract inside the quote and the project, the Won step's photo
// (his "I have marked everything in the doc please check and built accordingly", 2026-10-22, on https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv;
// the brief `design-source/context/responsive/contracts-on-the-move-2026-10-22/brief.md`, C4's row). Each rule asserted as the rule it builds,
// never another round's count, every new press pressed for real (a tap at 390 · 768 · 1024 under touch, a click at 1440), on the production build:
//  0 · the pure words (rc-c4-pure.mts): the card's chip / since / signs line, a template's facts / standing / status / clauses, the photo's checks.
//  1 · P-07 at 390, Tools › Contracts: the card (the client 16/700, the amount 20 tabular, "Signs OM-… · {title}" 14, a READ-ONLY chip + its since
//      14, a chevron); a tap on the card's empty part opens it; the ⋮'s 44 box and its rows in his order (Open · Send a reminder | Send the link
//      again · Copy link · Mark as signed… · Stop the signing link · Change status › · Share PDF · Archive · Delete); Change status › opens the status
//      sheet; Share PDF goes to the Preview's print; a hold selects, a tap then toggles, the bulk bar's Delete asks and deletes (put back); the
//      to-do chip keeps its words on a line of its own; the Archived and Deleted sheets' rows read as the card (labelled facts at 14).
//  2 · P-09 at 390: + → "Who is it for?" (Recent first, a search, 56 rows) → the kind as rows → From the studio agreement makes the contract;
//      From a template → the picker's list → Use; Tools ⋮ › Send together → the who list → the sheet (A-15: two-line rows, the tools row in view,
//      Show all); the lead's tab: the title leads the card; Import from File on touch: Take a photo → the switch held on → a Signed contract whose
//      signed copy is the photo (P-12 · C-25, Q-04).
//  3 · P-11: the quote's 44 "Contract · {status} ›" row opens the contract; the project Overview's Documents card (48 rows, ↗, `?from=`); the To
//      collect tile's contract line at 14; none of it at 1440.
//  4 · P-12 at 390: the Won step on a lead with no contract opens on Upload with Take a photo · Choose a file (48, `capture="environment"`);
//      a photo → its thumbnail → Save & Convert → the contract Signed with the photo as its signed copy, the lead Won (put back).
//  5 · P-08 at 768 / 1024 (touch): Title · Lead · Status · Sent with the ⋮ frozen in view, no View, the title opens, the ⋮ starts with Open and
//      carries one Share PDF (A-13); no quick-links strip on the lead's Contracts tab at 768 portrait (A-06); the picker is the list at ≤1024 in a
//      600 frame (C-20); the templates gallery's list view opens with Template · Used by · Updated and its ⋮ frozen (C-05).
//  6 · P-10 at 390 / 768: the templates gallery as rows (Default and At handover pinned, 16/600 · words 14 · facts 14 · chevron, no checkbox, a
//      44 ⋮); the + leaves no key hint (C-06); the reading screen (status row, clauses as rows that open the Document frame on their heading with
//      the one tool row, Outline named, Done back; Signature fields → C2's placement, put back with Undo; Before the client signs → a label row
//      toggles; ⋮'s rows); New contract from this template asks who first; a standard PDF keeps one Open the PDF (48).
//  7 · the integration of C1's screens with C2's content: the contract's Signature fields screen is C2's panel (which, then where, Undo), its
//      Before the client signs screen is C2's label rows with no eyebrow; the Document frame's ≡ is named "Outline" at 1024; C2's tool row pins
//      to the top of the frame's scroller at 768.
//  8 · 1440 (a mouse): the desk is as it was — the table's View and its Download as PDF · Print, the gallery's cards and chips, the Won step's
//      drop box, Import's box, no Documents card, no contract line.
//  9 · 320: no sideways scroll on the list, the gallery and the reading screen. No page errors. Everything written is put back.
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3184 NODE_PATH=<repo>/node_modules node verify-rc-c4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rc-c4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3184'
const REPO = fs.existsSync(path.resolve(__dirname, '../../../lib')) ? path.resolve(__dirname, '../../..') : process.cwd()   // a harness copy reads the repo it runs in
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rc-c4-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  // 0 · the pure words, run from the repo
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-contracts/rc-c4-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure words: ${p} passed, ${f} failed`)
    if (f) console.log(out.split('\n').filter((l) => l.includes('✗')).join('\n'))
  } catch (e) { fail++; console.log('  ✗ the pure words did not run:', String(e.stdout || e).slice(0, 400)) }

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

  // ── the records this probe reads: the demo's own, by what they are ──
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const OLIVIA = { lead: leadId('Olivia Martinez') }
  OLIVIA.contract = sql(`select id from contracts where lead_id = '${OLIVIA.lead}' and status = 'Draft' and deleted_at is null order by created_at limit 1`)
  OLIVIA.quote = sql(`select from_quote_id from contracts where id = '${OLIVIA.contract}'`)
  const VIVIEN = { lead: leadId('Vivien Lee') }; VIVIEN.quote = sql(`select id from quotes where lead_id = '${VIVIEN.lead}' and kind = 'quote' and deleted_at is null order by created_at limit 1`)
  VIVIEN.number = sql(`select number from quotes where id = '${VIVIEN.quote}'`); VIVIEN.amount = Number(sql(`select coalesce(signed_amount_minor, amount_minor) from quotes where id = '${VIVIEN.quote}'`))
  const SERENA = { lead: leadId('Serena Koh') }; SERENA.quote = sql(`select id from quotes where lead_id = '${SERENA.lead}' and kind = 'quote' and deleted_at is null order by created_at limit 1`)
  const HARPREET = { lead: leadId('Harpreet Kaur') }
  const RYAN_PROJECT = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name like 'Ryan D%' and p.deleted_at is null limit 1`)
  const RYAN_CONTRACT = sql(`select c.id from contracts c join leads l on l.id = c.lead_id where l.name like 'Ryan D%' and c.status = 'Signed' and c.deleted_at is null limit 1`)
  const AGREEMENT = sql(`select id from contract_templates where title = 'Interior Design Service Agreement' and deleted_at is null limit 1`)
  const HANDOVER = sql(`select id from contract_templates where use_at_handover = 1 and deleted_at is null limit 1`)
  const DANE = sql(`select id from members where name like 'Dane%' limit 1`)
  const now = Math.floor(Date.now() / 1000), D = 86400
  const ids = { sent: 'c4-sent-vivien', expired: 'c4-expired-serena', b1: 'c4-serena-b1', b2: 'c4-serena-b2', b3: 'c4-serena-b3', arch: 'c4-archived-serena', del: 'c4-deleted-serena', pdfTpl: 'c4-pdf-template' }
  // a Sent contract (2 days, not opened) · an expired link · three Drafts beside it (Send together's four) · one archived · one deleted
  const copy = (id, set) => `CREATE TEMP TABLE t AS SELECT * FROM contracts WHERE id = '${OLIVIA.contract}'; UPDATE t SET id = '${id}', sign_token = '${id}-token', ${set}; INSERT INTO contracts SELECT * FROM t; DROP TABLE t;\n`
  const MIN_PDF = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64')
  sqlFile(`BEGIN;\n${copy(ids.sent, `lead_id = '${VIVIEN.lead}', from_quote_id = '${VIVIEN.quote}', status = 'Sent to Client', sent_at = ${now - 2 * D}, updated_at = ${now - 2 * D}, viewed_at = NULL, sign_expires_at = ${now + 5 * D}, recipient_name = 'Vivien Lee'`)}`
    + copy(ids.expired, `lead_id = '${SERENA.lead}', from_quote_id = '${SERENA.quote}', status = 'Sent to Client', sent_at = ${now - 10 * D}, updated_at = ${now - 10 * D}, viewed_at = NULL, sign_expires_at = ${now - D}, recipient_name = 'Serena Koh'`)
    + [ids.b1, ids.b2, ids.b3].map((id, i) => copy(id, `lead_id = '${SERENA.lead}', from_quote_id = '${SERENA.quote}', title = 'Serena document ${i + 1}', status = 'Draft', updated_at = ${now - (i + 1) * 3600}, recipient_name = 'Serena Koh'`)).join('')
    + copy(ids.arch, `lead_id = '${SERENA.lead}', from_quote_id = '${SERENA.quote}', title = 'Serena archived agreement', archived_at = ${now - D}`)
    + copy(ids.del, `lead_id = '${SERENA.lead}', from_quote_id = '${SERENA.quote}', title = 'Serena deleted agreement', deleted_at = ${now - D}, deleted_by = '${DANE}'`)
    + `CREATE TEMP TABLE tt AS SELECT * FROM contract_templates WHERE id = '${AGREEMENT}'; UPDATE tt SET id = '${ids.pdfTpl}', title = 'Standard PDF terms', kind = 'pdf', body = '', is_default = 0, use_at_handover = 0, folder_id = NULL, file_name = 'Standard terms.pdf'; INSERT INTO contract_templates SELECT * FROM tt; DROP TABLE tt;\n`
    + `INSERT INTO contract_template_files (template_id, data, thumb) VALUES ('${ids.pdfTpl}', '${MIN_PDF}', NULL);\nCOMMIT;\n`)
  // a real JPEG of a signed page (the photo the probe "takes")
  const sharp = require('sharp')
  const jpegPath = path.join(os.tmpdir(), `rc-c4-signed-page-${process.pid}.jpg`)
  fs.writeFileSync(jpegPath, await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#f4f1ea' } }).composite([{ input: Buffer.from('<svg width="900" height="1200"><rect x="80" y="120" width="740" height="40" fill="#333"/><rect x="80" y="220" width="600" height="16" fill="#777"/><rect x="80" y="980" width="300" height="3" fill="#111"/><path d="M100 960 C 160 900, 220 1000, 300 940" stroke="#13246b" stroke-width="5" fill="none"/></svg>'), left: 0, top: 0 }]).jpeg({ quality: 80 }).toBuffer())

  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const mouseCtx = (w, h) => b.newContext({ viewport: { width: w, height: h } })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only (a full-page capture drops (hover: none) mid-shot)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); await p.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1 } }); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r.right, bt: r.bottom } })
  const hit = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const m = el.closest(sel); if (!m) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`; const c = m.cloneNode(true); c.querySelectorAll('[aria-hidden]').forEach((n) => n.remove()); return m.getAttribute('aria-label') || m.getAttribute('data-testid') || c.textContent.trim().slice(0, 40) }, [x, y, sel])
  const tap = (p, x, y) => p.touchscreen.tap(x, y)
  const tapEl = async (p, loc) => { await loc.scrollIntoViewIfNeeded(); const r = await box(loc); await tap(p, r.cx, r.cy) }
  const fontOf = (loc) => loc.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: Number(getComputedStyle(el).fontWeight), tabular: getComputedStyle(el).fontVariantNumeric }))
  /* a finger held on an element: the pointer events a touch makes, 650 ms apart (the hold is 500) */
  const hold = async (p, loc) => { const r = await box(loc); const o = { pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: r.cx, clientY: r.y + 14, bubbles: true }; await loc.dispatchEvent('pointerdown', o); await settle(p, 650); await loc.dispatchEvent('pointerup', { ...o, buttons: 0 }); await settle(p, 300) }
  const menuRows = (p) => p.locator('[role="menu"]').last().evaluate((m) => [...m.querySelectorAll('[role^="menuitem"]')].map((r) => { const c = r.cloneNode(true); c.querySelectorAll('[aria-hidden], [class*="itemHelp"], [class*="itemMeta"], [class*="itemKeys"]').forEach((n) => n.remove()); return c.textContent.trim() }))   // a row's label alone: its help, meta and keys left out
  const card = (p, id) => p.locator(`[role="row"][data-kb-id="${id}"]`)
  const urlIs = async (p, re, ms = 15000) => { try { await p.waitForURL(re, { timeout: ms }); return true } catch { return false } }
  const newestContract = (lead) => sql(`select id from contracts where lead_id = '${lead}' and deleted_at is null order by created_at desc, rowid desc limit 1`)

  try {
    // ── 1 · Tools › Contracts on a phone ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · P-07 · Tools › Contracts at 390 (touch): the card, its press, its ⋮, the hold, the to-do chip, the sheets')
    const M = await touchCtx(390, 844); const m = await page(M, '390')
    await go(m, '/contracts')
    await shot(m, '01-m390-list')
    const sentCard = card(m, ids.sent)
    ok(await sentCard.isVisible(), 'Vivien’s Sent contract is a card')
    const nm = sentCard.getByTestId('contract-card-name'), amt = sentCard.getByTestId('contract-card-amount'), signs = sentCard.getByTestId('contract-card-signs'), since = sentCard.getByTestId('contract-card-since')
    const fN = await fontOf(nm), fA = await fontOf(amt), fS = await fontOf(signs), fSi = await fontOf(since)
    ok((await nm.innerText()).trim() === 'Vivien Lee' && fN.size === 16 && fN.weight >= 700, `the client’s name leads, 16/${fN.weight} (A-01)`)
    const amountText = `S$${new Intl.NumberFormat('en-SG').format(Math.round(VIVIEN.amount / 100))}`
    ok((await amt.innerText()).trim().replace(/\.\d\d$/, '') === amountText && fA.size >= 18 && fA.tabular.includes('tabular'), `the amount it signs at the right, ${fA.size} tabular ("${(await amt.innerText()).trim()}")`)
    ok((await signs.innerText()).trim() === `Signs ${VIVIEN.number} · Interior Design Service Agreement` && fS.size === 14, `"Signs ${VIVIEN.number} · Interior Design Service Agreement" at 14`)
    ok(/^Waiting for signature$/.test((await sentCard.locator('[class*="cardChip"]').innerText()).trim()) && /sent 2d ago\s*·\s*not opened/.test((await since.innerText()).replace(/\n/g, ' ')) && fSi.size === 14, `(the calm UI build 2026-10-27, a deliberate change — W-363) the chip and its since: "Waiting for signature · ${(await since.innerText()).replace(/\s+/g, ' ').trim()}" at 14`)
    ok(!(await sentCard.locator('button[aria-label^="Status "]').isVisible().catch(() => false)), 'the status is a READ-ONLY chip on the card — no live status button (A-03, Q-03)')
    const expCard = card(m, ids.expired)
    ok(/^Link expired \d+ \w+ ’\d\d$/.test((await expCard.locator('[class*="cardChip"]').innerText()).trim()) && /sent \d+d ago\s*·\s*not opened/.test((await expCard.getByTestId('contract-card-since').innerText()).replace(/\n/g, ' ')), `an expired link’s chip says "${(await expCard.locator('[class*="cardChip"]').innerText()).trim()}", its since when it went`)
    const sc = await box(sentCard)
    ok(sc.h >= 88 && sc.h <= 144, `the card stands ${Math.round(sc.h)} tall — three lines`)   // (the calm UI build 2026-10-27, a deliberate change) W-363: “Waiting for signature · sent … · not opened” is longer than “Sent to Client” — its line wraps rather than cuts (T-12), one more line at most
    { /* (REG-708) the loader's ghost draws the card as it now is: the streamed page with its scripts left out, its first card's box beside the page's */
      const G = await touchCtx(390, 844); const g = await G.newPage(); const url = BASE + '/contracts'
      await g.route((u) => u.href === url, async (route) => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''), headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await g.goto(url, { waitUntil: 'load' }).catch(() => {}); await settle(g, 900)
      const gb = await g.locator('[class*="pCard"]').first().evaluate((el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height) } }).catch(() => null)
      const pb = await m.locator('[aria-label="Contracts"] [role="row"][data-kb-row]').first().evaluate((el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.y + scrollY), h: Math.round(r.height) } })
      /* the to-do chip's own line comes and goes with what waits — no ghost draws it (REG-666's), so the card starts that line lower on the page */
      const chipLine = await m.getByTestId('contracts-awaiting').count() ? (await box(m.getByTestId('contracts-awaiting'))).h + 12 : 0
      ok(!!gb && gb.h === pb.h && Math.abs(gb.y + chipLine - pb.y) <= 1, `the phone ghost’s card is the card: ${gb ? `${gb.h} at ${gb.y}` : 'none'} vs ${pb.h} at ${pb.y}${chipLine ? ` (under the to-do chip’s ${chipLine}px line, which no ghost draws)` : ''} (REG-708)`)
      await G.close()
    }
    // a tap on the card's empty part opens it (A-02)
    await tap(m, sc.x + sc.w * 0.62, sc.bt - 16)
    ok(await urlIs(m, new RegExp(`/contracts/${ids.sent}`)), 'a tap on the card’s empty part opens the contract (A-02: the whole card is the press)')
    await go(m, '/contracts')
    // the ⋮: its 44 box, his rows
    const kebab = card(m, ids.sent).getByRole('button', { name: /^More actions for/ })
    const kb = await box(kebab)
    const kHits = await Promise.all([[0, 0], [-18, 0], [18, 0], [0, -18], [0, 18]].map(([dx, dy]) => hit(m, kb.cx + dx, kb.cy + dy, 'button')))
    ok(kHits.every((h) => /^More actions for/.test(h || '')), `the card’s ⋮ answers at its centre and 18px on every side (A-09: the house 44 box, no module ring) — ${kHits.filter((h) => !/^More actions/.test(h || '')).join(' | ') || 'all hit'}`)
    await tap(m, kb.cx, kb.cy); await settle(m, 900)
    const rowsSent = await menuRows(m)
    ok(JSON.stringify(rowsSent) === JSON.stringify(['Open', 'Send a reminder', 'Copy link', 'Mark as signed…', 'Stop the signing link', 'Change status', 'Share PDF', 'Archive', 'Delete']), `the ⋮ rows in his order: ${rowsSent.join(' · ')}`)
    ok(!rowsSent.includes('Print') && !rowsSent.includes('Download as PDF'), 'one Share PDF — no Download as PDF · Print on touch (A-13)')
    await shot(m, '02-m390-card-menu')
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: /^Change status/ }).tap(); await settle(m, 900)
    const statusSheet = m.locator('[role="menu"]').last()
    ok(JSON.stringify((await menuRows(m)).slice(0, 3)) === JSON.stringify(['Draft', 'Waiting for signature', 'Signed'])   /* (the calm UI build 2026-10-27, a deliberate change) W-363's words */ && await m.getByRole('dialog', { name: 'Change status' }).count() + await m.getByText('Change status', { exact: true }).count() >= 1, 'Change status › opens the status sheet (Draft · Sent to Client · Signed)')
    await m.keyboard.press('Escape'); await settle(m, 600)
    ok(sql(`select status from contracts where id = '${ids.sent}'`) === 'Sent to Client', '…and closing it changes nothing')
    void statusSheet
    // expired: Send the link again
    const ek = card(m, ids.expired).getByRole('button', { name: /^More actions for/ }); await tapEl(m, ek); await settle(m, 900)
    ok((await menuRows(m))[1] === 'Send the link again', 'an expired link’s ⋮ says "Send the link again"')
    await m.keyboard.press('Escape'); await settle(m, 500)
    // Share PDF → the Preview's print
    await tapEl(m, card(m, ids.sent).getByRole('button', { name: /^More actions for/ })); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: /^Share PDF/ }).tap()
    ok(await urlIs(m, new RegExp(`/contracts/${ids.sent}/preview\\?.*print=1`)), 'Share PDF goes to the Preview’s print — the print sheet stand-in, as the quote’s (A-13)')
    await settle(m, 1500)
    ok(await m.evaluate(() => window.__printed || 0) >= 1, '…which asks the print sheet')
    // Open
    await go(m, '/contracts')
    await tapEl(m, card(m, ids.sent).getByRole('button', { name: /^More actions for/ })); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Open', exact: true }).tap()
    ok(await urlIs(m, new RegExp(`/contracts/${ids.sent}`)), '⋮ › Open opens the contract')
    // the hold selects; a tap toggles; the bulk bar's Delete
    await go(m, '/contracts')
    await hold(m, card(m, ids.b3))
    ok(await card(m, ids.b3).getAttribute('data-selected') !== null, 'a hold on a card selects it (P-07, the Quotes card’s)')
    ok(await m.getByRole('toolbar', { name: '1 selected' }).isVisible() && await m.getByRole('toolbar', { name: '1 selected' }).getByRole('button', { name: 'Delete' }).isVisible(), 'the bulk bar comes up with Delete')
    await shot(m, '03-m390-selected')
    await card(m, ids.b2).evaluate((el) => el.scrollIntoView({ block: 'center' })); await settle(m, 400)
    const b2b = await box(card(m, ids.b2)); await tap(m, b2b.x + b2b.w * 0.6, b2b.bt - 16); await settle(m, 600)   // the card's empty part, clear of the ⋮'s 44 box (a touch lands on a control within reach)
    ok(/\/contracts$/.test(new URL(m.url()).pathname) && await card(m, ids.b2).getAttribute('data-selected') !== null, 'while selecting, a tap toggles a card instead of opening it')
    await tap(m, b2b.x + b2b.w * 0.6, b2b.bt - 16); await settle(m, 600)
    ok(await card(m, ids.b2).getAttribute('data-selected') === null, '…and a second tap lets it go')
    await m.getByRole('toolbar', { name: '1 selected' }).getByRole('button', { name: 'Delete' }).tap(); await settle(m, 800)
    const confirm = m.getByRole('dialog').filter({ hasText: /Delete/ }).last()
    ok(await confirm.isVisible(), 'Delete asks first (the house confirm)')
    await confirm.getByRole('button', { name: /^Delete/ }).last().tap(); await settle(m, 1800)
    ok(sql(`select deleted_at is not null from contracts where id = '${ids.b3}'`) === '1' && await card(m, ids.b3).count() === 0, 'the bulk Delete deletes the held card (put back at the end)')
    sql(`update contracts set deleted_at = NULL, deleted_by = NULL where id = '${ids.b3}'`)
    // the to-do chip keeps its words, on a line of its own (A-07)
    await go(m, '/contracts')
    const todo = m.getByTestId('contracts-awaiting')
    const tb = await box(todo), titleB = await box(m.getByRole('heading', { name: 'All Contracts' }))
    ok(/Waiting for signature · \d+/.test(await todo.innerText())   /* (the calm UI build 2026-10-27, a deliberate change) W-363 · T-07 */ && tb.y > titleB.y + titleB.h - 2, `the to-do chip keeps its words ("${(await todo.innerText()).replace(/^draw\s*/, '').trim()}") on its own line under the row`)
    ok(await m.getByRole('heading', { name: 'All Contracts' }).evaluate((el) => el.scrollWidth <= el.clientWidth), 'the section title reads whole ("All Contracts", never "All Contr…")')
    ok(await sideways(m) <= 0, 'no sideways scroll at 390')
    // Filters: one sheet of chips (A-12 · P-13, the Quotes Filters' K4)
    await tapEl(m, m.getByTestId('contracts-workspace').getByRole('button', { name: /^Filters/ })); await settle(m, 900)
    const fsheet = m.getByTestId('contract-filters-sheet')
    ok(await fsheet.isVisible() && await fsheet.locator('section').count() === 3 && await m.getByRole('tablist', { name: 'Filter groups' }).count() === 0, 'Filters is one sheet — Sort by · Dates · Status as chips, no rail beside a pane (A-12)')
    const signedChip = fsheet.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Signed' }).or(fsheet.getByRole('checkbox', { name: 'Signed' })).first()
    const chipH = (await box(signedChip)).h
    await tapEl(m, signedChip); await settle(m, 900)
    const shownStatus = await m.locator('[aria-label="Contracts"] [role="row"][data-kb-row] [class*="cardChip"]').allInnerTexts()
    ok(chipH >= 32 && shownStatus.length > 0 && shownStatus.every((t) => /Signed/.test(t)), `a status chip narrows the list at once (${shownStatus.length} Signed) — live`)
    await shot(m, '05b-m390-filters')
    await tapEl(m, fsheet.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Signed' }).or(fsheet.getByRole('checkbox', { name: 'Signed' })).first()); await settle(m, 600)
    await tapEl(m, m.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' })); await settle(m, 800)
    // Archived and Deleted sheets: the rows read as the card (A-14)
    const tools = m.getByTestId('contracts-workspace').getByRole('button', { name: 'More options', exact: true })
    await tapEl(m, tools); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Archived Contracts' }).tap(); await settle(m, 1800)
    const arow = m.getByTestId('archived-contract').filter({ hasText: 'Serena archived agreement' })
    ok(await arow.isVisible(), 'the archived contract is in Archived Contracts')
    const aTitle = await fontOf(arow.locator('[class*="title"]').first())
    const aFacts = await arow.locator('[data-fact]').evaluateAll((els) => els.map((e) => ({ label: getComputedStyle(e, '::before').content, size: parseFloat(getComputedStyle(e).fontSize), text: e.textContent.trim(), y: e.getBoundingClientRect().y })))
    ok(aTitle.size === 16 && aFacts.length >= 3 && aFacts.every((f) => f.size === 14) && aFacts.every((f) => /Lead|Status|Archived/.test(f.label)), `an archived row: the title 16, the facts labelled at 14 (${aFacts.map((f) => `${f.label.replace(/"/g, '')}${f.text}`).join(' ')})`)
    ok(new Set(aFacts.map((f) => Math.round(f.y))).size <= 2, '…the facts read as words that wrap, not a stack of bare values')
    ok((await fontOf(m.getByRole('dialog', { name: 'Archived Contracts' }).locator('[class*="noteMove"]').first())).size === 14, 'the sheet’s note reads 14 (A-08)')
    await shot(m, '04-m390-archived')
    await m.keyboard.press('Escape'); await settle(m, 800)
    await tapEl(m, tools); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Deleted Contracts' }).tap(); await settle(m, 1800)
    const drow = m.getByTestId('deleted-contract').filter({ hasText: 'Serena deleted agreement' })
    const dFacts = await drow.locator('[data-fact]').evaluateAll((els) => els.map((e) => getComputedStyle(e, '::before').content))
    ok(await drow.isVisible() && dFacts.some((l) => /Deleted by/.test(l)), 'a deleted row says "Deleted by" with its name, not a bare word')
    await shot(m, '05-m390-deleted')
    await m.keyboard.press('Escape'); await settle(m, 800)

    // ── 2 · New contract, Send together, the lead's tab, Import's photo ─────────────────────────────────────────────────────────
    console.log('2 · P-09 · A-15 · P-12 at 390: who first, the kinds, Send together, the lead’s tab, Import’s photo')
    await go(m, '/contracts')
    await tapEl(m, m.getByRole('button', { name: 'New Contract' }).locator('visible=true').first()); await settle(m, 900)
    const who = m.getByRole('dialog', { name: 'Who is it for?' })
    ok(await who.isVisible() && await who.getByTestId('new-contract-who').isVisible(), '+ asks "Who is it for?" first (P-09, the Create Quote phone step)')
    ok(await who.getByText('Recent', { exact: true }).isVisible(), 'recent leads lead the list')
    const leadRows = who.getByTestId('new-contract-lead')
    const lr = await box(leadRows.first())
    ok(lr.h >= 56 && (await fontOf(leadRows.first().locator('span').first())).size === 16, `a lead is a ${Math.round(lr.h)} row with its name at 16`)
    await shot(m, '06-m390-who')
    const search = who.locator('input').first()
    await tapEl(m, who.locator('[class*="search"]').first()); await search.fill('Harp'); await settle(m, 500)
    ok(await leadRows.count() === 1 && /Harpreet Kaur/.test(await leadRows.first().innerText()), 'the search narrows to Harpreet Kaur')
    await tapEl(m, leadRows.first()); await settle(m, 700)
    ok(await m.getByRole('dialog', { name: /Start a contract for Harpreet Kaur/ }).isVisible() && await m.getByTestId('new-contract-kinds').getByRole('button').count() === 3, 'then the kind as three rows')
    await shot(m, '07-m390-kinds')
    await tapEl(m, m.getByTestId('new-contract-blank'))
    ok(await urlIs(m, /\/contracts\/[0-9a-f-]{36}/), 'From the studio agreement makes the contract and opens it')
    ok(sql(`select count(*) from contracts where lead_id = '${HARPREET.lead}' and deleted_at is null`) === '1', '…for Harpreet Kaur, asked once')
    await go(m, '/contracts')
    await tapEl(m, m.getByRole('button', { name: 'New Contract' }).locator('visible=true').first()); await settle(m, 900)
    await tapEl(m, m.getByRole('dialog', { name: 'Who is it for?' }).getByTestId('new-contract-lead').filter({ hasText: 'Vivien Lee' }).first()); await settle(m, 600)
    await tapEl(m, m.getByTestId('new-contract-template')); await settle(m, 1500)
    const picker = m.getByRole('dialog', { name: 'Which agreement should they sign?' })
    ok(await picker.isVisible() && await picker.getByRole('radio').count() >= 2, 'From a template opens the picker as its list')
    const before4 = Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`))
    await tapEl(m, picker.getByTestId('contract-template-use'))
    ok(await urlIs(m, /\/contracts\/[0-9a-f-]{36}/) && Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`)) === before4 + 1, '…and its one button makes the contract for Vivien Lee')
    // Send together from Tools: who first, then the sheet (A-15)
    await go(m, '/contracts')
    await tapEl(m, m.getByTestId('contracts-workspace').getByRole('button', { name: 'More options', exact: true })); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: /^Send together/ }).tap(); await settle(m, 900)
    const bw = m.getByRole('dialog', { name: 'Send together — which lead?' })
    ok(await bw.isVisible() && await bw.getByTestId('new-contract-who').isVisible(), 'Send together asks which lead as the who list (A-10)')
    await tapEl(m, bw.getByTestId('new-contract-lead').filter({ hasText: 'Serena Koh' }).first()); await settle(m, 1500)
    const bundle = m.getByRole('dialog', { name: 'Send together for signature' })
    ok(await bundle.isVisible(), 'the Send together sheet opens for Serena Koh')
    const docRows = bundle.getByRole('group', { name: 'Documents to send' }).locator('label:has([class*="rowTitle"])')
    const nDocs = await docRows.count()
    const rowFacts = await docRows.evaluateAll((els) => els.map((l) => { const t = l.querySelector('[class*="rowTitle"]'), mt = l.querySelector('[class*="rowMeta"]'); return { whole: t.scrollWidth <= t.clientWidth + 1, below: mt.getBoundingClientRect().top >= t.getBoundingClientRect().bottom - 2, meta: parseFloat(getComputedStyle(mt).fontSize) } }))
    ok(nDocs >= 4 && rowFacts.every((r) => r.whole && r.below && r.meta === 14), `the ${nDocs} documents: titles whole, the status under each at 14 (A-15)`)
    const reset = bundle.getByRole('button', { name: 'Reset message' })
    const foot = bundle.locator('[data-surface-foot]').first()
    const showAll = bundle.getByTestId('message-show-all')
    ok(await showAll.isVisible(), 'the message shows its first three lines and "Show all" (A-15)')
    /* the rule: once the message is in view, so is its tools row — never a long message's height below it (four documents push the message
       itself under the first screen of a 390×844 sheet; the scroll brings message and tools in together) */
    const msgLabel = bundle.locator('textarea').first()
    await msgLabel.evaluate((el) => el.scrollIntoView({ block: 'start' })); await settle(m, 400)
    const rb = await box(reset), fb = await box(foot), mb = await box(msgLabel)
    ok(rb.bt <= fb.y + 1 && mb.y >= 0, `with the message in view its tools row is in view too (tools end ${Math.round(rb.bt)} ≤ the foot ${Math.round(fb.y)}, the message from ${Math.round(mb.y)})`)
    await shot(m, '08-m390-send-together')
    const ta = bundle.locator('textarea').first(); const h0 = (await box(ta)).h
    ok(await ta.evaluate((el) => el.offsetHeight <= parseFloat(getComputedStyle(el).maxHeight) + 0.5 && parseFloat(el.style.height) <= parseFloat(getComputedStyle(el).maxHeight) + 0.5), 'the folded box is held at its three lines by its own height (no text laid out past its edge)')
    await tapEl(m, showAll); await settle(m, 500)
    ok((await box(ta)).h > h0 && !(await showAll.isVisible().catch(() => false)), `Show all opens the whole message (${Math.round(h0)} → ${Math.round((await box(ta)).h)})`)
    await m.keyboard.press('Escape'); await settle(m, 800)
    // the lead's tab: the title leads the card
    await go(m, `/leads/${VIVIEN.lead}/contracts`)
    const tabCard = card(m, ids.sent)
    ok((await tabCard.getByTestId('contract-card-name').innerText()).trim() === 'Interior Design Service Agreement' && (await tabCard.getByTestId('contract-card-signs').innerText()).trim() === `Signs ${VIVIEN.number}`, 'the lead’s tab: the title first, "Signs OM-…" under it')
    await shot(m, '09-m390-lead-tab')
    // Import from File on touch: Take a photo (P-12 · C-25)
    await tapEl(m, m.getByRole('button', { name: 'New Contract' }).locator('visible=true').first()); await settle(m, 800)
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Import a file' }).tap(); await settle(m, 1000)
    const imp = m.getByTestId('import-contract')
    ok(await imp.isVisible() && (await fontOf(imp.getByTestId('import-contract-lead'))).size === 14, 'Import’s sentence reads 14 in the body (C-25 · C-14)')
    const ph = imp.getByTestId('import-take-photo'), cf = imp.getByTestId('import-choose-file')
    ok((await box(ph)).h >= 48 && (await box(cf)).h >= 48, 'Take a photo · Choose a file: two rows of 48+')
    ok(await imp.getByTestId('import-take-photo-input').getAttribute('capture') === 'environment' && /image/.test(await imp.getByTestId('import-take-photo-input').getAttribute('accept')), 'Take a photo opens the camera (capture="environment", images)')
    ok(/application\/pdf/.test(await imp.getByTestId('import-choose-file-input').getAttribute('accept')) && /image/.test(await imp.getByTestId('import-choose-file-input').getAttribute('accept')), 'Choose a file takes a PDF or a picture')
    await shot(m, '10-m390-import')
    const [chooser] = await Promise.all([m.waitForEvent('filechooser'), tapEl(m, ph)])
    await chooser.setFiles(jpegPath); await settle(m, 2500)
    const sw = imp.getByRole('switch')
    ok(await sw.isChecked() && await sw.isDisabled() && /signed copy/.test(await imp.getByTestId('import-signed-help').innerText()), 'a photo turns "already signed" on and holds it, saying why (Q-04)')
    await shot(m, '11-m390-import-photo')
    const beforeImp = Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`))
    await tapEl(m, m.getByTestId('import-contract-go')); await settle(m, 3500)
    const imported = json(`select c.id, c.status, c.file_id, c.signed_file_id, f.kind, f.mime from contracts c left join lead_files f on f.id = c.file_id where c.lead_id = '${VIVIEN.lead}' and c.deleted_at is null order by c.created_at desc, c.rowid desc limit 1`)[0]
    ok(Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`)) === beforeImp + 1 && imported?.status === 'Signed' && imported.file_id && imported.file_id === imported.signed_file_id && imported.kind === 'image' && imported.mime === 'image/jpeg',
      `the photo makes a Signed contract whose signed copy is the photo (${imported ? `${imported.status} · ${imported.kind} · ${imported.mime} · file = signed copy: ${imported.file_id === imported.signed_file_id}` : 'none'})`)
    if (imported) {
      await go(m, `/contracts/${imported.id}`, 2000)
      ok(await m.locator('[data-testid="contract-pdf"][data-picture]').count() >= 1 && await m.locator('object[type="application/pdf"]').count() === 0, 'the contract shows the photo itself, never a PDF viewer over a picture')
      await shot(m, '12-m390-photo-contract')
    }

    // ── 3 · the contract inside the quote and the project ─────────────────────────────────────────────────────────────────────
    console.log('3 · P-11 at 390: the quote’s Contract row, the project’s Documents, the To collect line')
    await go(m, `/quotes/${OLIVIA.quote}`, 2000)
    const crow = m.getByTestId('screen-contract-row')
    const crb = await box(crow)
    ok(crb.h >= 44 && /Contract/.test(await crow.innerText()) && /Draft/.test(await crow.innerText()), `the quote’s hero carries "Contract · Draft ›" as a ${Math.round(crb.h)} row (C-21)`)
    ok(await hit(m, crb.cx, crb.cy, 'a') === `Open Interior Design Service Agreement — Draft`, 'the whole row is the press')
    await shot(m, '13-m390-quote-contract-row')
    await tap(m, crb.cx, crb.cy)
    ok(await urlIs(m, new RegExp(`/contracts/${OLIVIA.contract}`)), '…and opens the contract')
    if (RYAN_PROJECT) {
      await go(m, `/projects/${RYAN_PROJECT}`, 2200)
      const docs = m.getByTestId('project-documents')
      await docs.scrollIntoViewIfNeeded(); await settle(m, 400)
      ok(await docs.isVisible(), 'the project Overview has its Documents (C-23)')
      const dq = docs.getByTestId('project-doc-quote'), dc = docs.getByTestId('project-doc-contract')
      ok((await box(dq)).h >= 48 && (await box(dc)).h >= 48, 'the signed quote and the contract are 48 rows')
      ok(/Signed \d+ \w+ ’\d\d/.test(await dq.innerText()) && /Signed \d+ \w+ ’\d\d/.test(await dc.innerText()), 'each says its date')
      const href = await dc.evaluate((el) => (el.closest('a') || el.querySelector('a') || el).getAttribute('href'))
      ok(href && href.includes(`/contracts/${RYAN_CONTRACT}`) && href.includes('from='), `the contract’s row opens it with the way back (${href})`)
      await shot(m, '14-m390-project-documents')
      await tapEl(m, dc)
      ok(await urlIs(m, new RegExp(`/contracts/${RYAN_CONTRACT}`)), 'a tap opens the contract')
      await go(m, `/projects/${RYAN_PROJECT}/money`, 2200)
      const line = m.getByTestId('money-contract-line')
      await line.scrollIntoViewIfNeeded(); await settle(m, 300)
      ok(await line.isVisible() && (await fontOf(line)).size === 14 && /^Contract S\$[\d,]+\.\d\d · /.test((await line.innerText()).trim()), `the To collect tile says the contract total and its source at 14 ("${(await line.innerText()).trim()}") (C-24)`)
      ok((await fontOf(m.getByTestId('money-collected'))).size === 14, 'the tile’s help lines read 14 on touch')
      await shot(m, '15-m390-money-line')
    } else ok(false, 'a project with a signed quote and a contract is in the demo')

    // ── 4 · the Won step's photo ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · P-12 at 390: the Won step takes a photo of the signed paper')
    sql(`delete from contracts where lead_id = '${HARPREET.lead}'`)   // the one made in 2 — Harpreet has no contract in the system again
    sql(`update quotes set status = 'Signed', signed_at = ${now - 3600} where lead_id = '${HARPREET.lead}' and kind = 'quote' and deleted_at is null`)   // the quote the client signed (put back) — Won asks for a signed quote
    await go(m, `/leads/${HARPREET.lead}?move=won`, 2500)
    const takePhoto = m.getByTestId('won-take-photo'), chooseFile = m.getByTestId('won-choose-file')
    ok(await takePhoto.isVisible(), 'with no contract in the system, the contract opens on Upload on touch (the right default)')
    ok((await box(takePhoto)).h >= 48 && (await box(chooseFile)).h >= 48 && (await m.getByTestId('won-take-photo-input').getAttribute('capture')) === 'environment', 'Take a photo (the camera) · Choose a file, 48+ each (C-27)')
    ok(await m.getByText('Drop your file or', { exact: false }).count() === 0, 'no desk drop box on a phone')
    await takePhoto.scrollIntoViewIfNeeded(); await settle(m, 300)
    await shot(m, '16-m390-won-rows')
    const [ch2] = await Promise.all([m.waitForEvent('filechooser'), tapEl(m, takePhoto)])
    await ch2.setFiles(jpegPath); await settle(m, 3000)
    ok(await m.getByTestId('won-photo-thumb').isVisible() && !(await takePhoto.isVisible().catch(() => false)), 'the photo shows as the kept file, its picture beside its name')
    ok(/Contract_\w+_signed\.jpg/.test((await m.locator('[data-file-row]').last().innerText()).replace(/\s+/g, '')), 'named "Contract_…_signed.jpg"')
    await shot(m, '17-m390-won-photo')
    /* (leads on the move, a deliberate change of this rule — Leads L2, P-04) on a phone Won is a checklist: the signed quote from the system is
       already picked (its row settled), the project type a chip with the default set, and the one filled button is "Create project" */
    ok(await m.getByTestId('won-row-quote').getAttribute('data-done') !== null, 'the signed quote from the system is picked — its row settled')
    await tapEl(m, m.getByTestId('move-step-primary')); await settle(m, 5000)
    const won = json(`select c.status, c.file_name, c.file_id, c.signed_file_id, f.kind, l.stage from contracts c join leads l on l.id = c.lead_id left join lead_files f on f.id = c.file_id where c.lead_id = '${HARPREET.lead}' and c.deleted_at is null order by c.created_at desc limit 1`)[0]
    ok(won && won.status === 'Signed' && /_signed\.jpg$/.test(won.file_name) && won.file_id === won.signed_file_id && won.kind === 'image' && won.stage === 'Won', `Save & Convert: the contract Signed with the photo as its signed copy, the lead Won (${won ? `${won.status} · ${won.file_name} · ${won.kind} · ${won.stage}` : 'no contract — ' + (await m.locator('[role="dialog"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)})`)
    await shot(m, '18-m390-won-saved')

    // ── 7 · the integration: C1's screens with C2's content ────────────────────────────────────────────────────────────────────
    console.log('7 · the contract’s Signature fields and Before the client signs screens are C2’s panels (390)')
    await go(m, `/contracts/${OLIVIA.contract}?edit=fields`, 2000)
    const fscreen = m.getByTestId('fields-screen')
    ok(await fscreen.getByTestId('signature-fields').isVisible() && await fscreen.getByTestId('esign-field').count() === 4, 'Signature fields shows C2’s panel with the four fields')
    const bodyWas = sql(`select body from contracts where id = '${OLIVIA.contract}'`)
    const unplaced = fscreen.locator('[data-testid="esign-field"]:not([data-placed])').first()
    if (await unplaced.count()) {
      await tapEl(m, unplaced.getByTestId('esign-add')); await settle(m, 900)
      const place = m.getByTestId('place-add')
      ok(await place.isVisible() && /^Add (under|after|at)/.test(await place.innerText()), `Add asks which, then where — "${(await place.innerText()).trim()}" (P-04)`)
      await shot(m, '19-m390-fields-place')
      await tapEl(m, place); await settle(m, 1600)
      ok(sql(`select body from contracts where id = '${OLIVIA.contract}'`) !== bodyWas, 'the field is placed in the document (saved)')
      const undo = m.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first()
      ok(await undo.isVisible() && /added (under|after|at)/.test(await m.getByText(/ added (under|after|at) /).first().innerText().catch(() => '')), 'the snackbar says where it went, with Undo')
      await undo.tap(); await settle(m, 1600)
      ok(sql(`select body from contracts where id = '${OLIVIA.contract}'`) === bodyWas, 'Undo takes it out again')
    } else ok(false, 'a field is still to place on Olivia’s draft')
    await go(m, `/contracts/${OLIVIA.contract}?edit=gates`, 1800)
    const gscreen = m.getByTestId('gates-screen')
    ok(await gscreen.getByTestId('esign-gates').isVisible() && !/before the client signs/i.test(await gscreen.getByTestId('esign-gates').innerText()), 'Before the client signs is C2’s label rows, no eyebrow (the bar names it)')
    const scrollWas = Number(sql(`select requires_scroll from contracts where id = '${OLIVIA.contract}'`))
    const grow = gscreen.getByTestId('gate-row').first()
    const gb = await box(grow.locator('span').first()); await tap(m, gb.x + 20, gb.cy); await settle(m, 1500)
    ok(Number(sql(`select requires_scroll from contracts where id = '${OLIVIA.contract}'`)) === (scrollWas ? 0 : 1), 'a tap on the row’s words toggles Read to the end (C-13)')
    await tap(m, gb.x + 20, gb.cy); await settle(m, 1500)
    ok(Number(sql(`select requires_scroll from contracts where id = '${OLIVIA.contract}'`)) === scrollWas, '…and back')
    await shot(m, '20-m390-gates')

    // ── 6 · the templates at 390 ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · P-10 at 390: the gallery as rows, the reading screen, New contract from a template, a standard PDF')
    sql(`update contract_templates set is_default = 1 where id = '${AGREEMENT}'`)
    await go(m, '/company/templates/contracts', 2000)
    const trows = m.getByTestId('contract-template-row')
    const order = await trows.evaluateAll((els) => els.map((e) => e.getAttribute('data-template-id')))
    ok(order[0] === AGREEMENT && order[1] === HANDOVER, 'Default and At handover pinned on top (the default lifted out of its folder)')
    const first = trows.first()
    const fName = await fontOf(first.locator('[class*="moveName"]')), fState = await fontOf(first.getByTestId('library-move-state')), fFacts = await fontOf(first.locator('[class*="moveFactsText"]'))
    ok(fName.size === 16 && fName.weight >= 600 && fState.size === 14 && fFacts.size === 14, `a row: the name 16/${fName.weight}, the standing ${fState.size}, the facts ${fFacts.size}`)
    ok((await first.getByTestId('library-move-state').innerText()).trim() === 'Default' && /* (the calm UI build 2026-10-27, a deliberate change) 4-36: the row counts clauses, as the desk card */ /\d+ clauses · (used by \d+|not used yet) · edited /.test(await first.locator('[class*="moveFactsText"]').innerText()), `"${(await first.getByTestId('library-move-state').innerText()).trim()}" and "${(await first.locator('[class*="moveFactsText"]').innerText()).replace(/\s+/g, ' ').trim()}" (C-04: words, not a 10px chip)`)
    ok(await first.locator('input[type="checkbox"]').count() === 0, 'no checkbox on a row (C-03)')
    const tk = await box(first.getByTestId('contract-template-row-menu'))
    const tkHits = await Promise.all([[0, 0], [-18, 0], [18, 0], [0, 18]].map(([dx, dy]) => hit(m, tk.cx + dx, tk.cy + dy, 'button')))
    ok(tkHits.every((h) => /More options for/.test(h || '')), 'the row’s ⋮ answers 18px round its centre')
    ok(await m.getByTestId('library-move-folder').count() >= 1 && (await box(m.getByTestId('library-move-folder').first())).y > (await box(trows.last())).y, 'the folders are rows under the templates (C-07)')
    await shot(m, '21-m390-templates')
    // C-06: the + leaves no key hint behind
    await tapEl(m, m.getByTestId('new-template').locator('visible=true').first()); await settle(m, 900)
    await tap(m, 195, 60); await settle(m, 900)   // the sheet's scrim
    const tips = await m.locator('[role="tooltip"]').allInnerTexts()
    ok(!tips.some((t) => /\bC\b|⌘|Ctrl/.test(t)), `no key hint under the + after a finger’s press (C-06) — ${tips.length ? tips.join(' | ') : 'no bubble'}`)
    // ⋮ › New contract from this template → who first
    await tapEl(m, first.getByTestId('contract-template-row-menu')); await settle(m, 800)
    ok((await menuRows(m))[0] === 'New contract from this template', 'the row’s ⋮ starts with New contract from this template')
    await m.locator('[role="menu"]').last().getByRole('menuitem', { name: 'New contract from this template' }).tap(); await settle(m, 900)
    const who2 = m.getByRole('dialog', { name: 'Who is it for?' })
    ok(await who2.isVisible(), '…which asks who it is for first')
    const vBefore = Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`))
    await tapEl(m, who2.getByTestId('new-contract-lead').filter({ hasText: 'Vivien Lee' }).first())
    ok(await urlIs(m, /\/contracts\/[0-9a-f-]{36}/) && Number(sql(`select count(*) from contracts where lead_id = '${VIVIEN.lead}' and deleted_at is null`)) === vBefore + 1, 'a tap on the lead makes the contract from the template and opens it')
    // the reading screen
    await go(m, '/company/templates/contracts', 1600)
    await tapEl(m, m.getByTestId('contract-template-row').first())
    ok(await urlIs(m, new RegExp(`/templates/contracts/${AGREEMENT}`)), 'the row opens the template')
    await settle(m, 1500)
    const read = m.getByTestId('template-reading-screen')
    const statusLine = (await read.getByTestId('template-status-row').locator('[class*="statusText"]').innerText()).trim()
    ok(await read.isVisible() && /^Default · used by \d+ · fills \d+ fields · client signs ✓$/.test(statusLine), `the reading screen: "${statusLine}"`)
    const crows = read.getByTestId('template-clause-row')
    const cH = await crows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    ok(cH.length >= 10 && cH.every((h) => h >= 56), `the clauses as ${cH.length} rows, each 56+`)
    ok(await read.getByTestId('template-signatures-row').isVisible() && await read.getByTestId('template-gates-row').isVisible(), 'Signature fields and Before the client signs are rows')
    await shot(m, '22-m390-template-reading')
    const pay = crows.filter({ hasText: /Payment/ }).first()
    const payTitle = (await pay.locator('[class*="title"]').first().innerText()).split('·')[0].trim()
    await tapEl(m, pay); await settle(m, 1800)
    const tdoc = m.getByTestId('template-document-screen')
    ok(/[?&]edit=document/.test(m.url()) && await tdoc.isVisible() && await tdoc.getByTestId('doc-tool-row').isVisible(), 'a clause opens the paper full-screen in the Document frame with the one tool row (C-12)')
    const headIn = await tdoc.locator('h1, h2, h3').filter({ hasText: payTitle }).first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }).catch(() => false)
    ok(headIn, `…landed on "${payTitle}"`)
    ok(await m.getByRole('button', { name: 'Outline' }).isVisible(), 'the frame’s ≡ is named "Outline"')
    ok(await m.locator('[aria-label="Maison AI"]').count() === 0 || !(await m.locator('[aria-label="Maison AI"]').first().isVisible()), 'no Maison AI button over the paper (C-10)')
    await shot(m, '23-m390-template-clause')
    await tapEl(m, tdoc.getByTestId('document-done')); await settle(m, 1000)
    ok(!/[?&]edit=/.test(m.url()) && await m.getByTestId('template-reading-screen').isVisible(), 'Done returns to the reading screen')
    // Signature fields: C2's placement, put back by Undo
    const tBody = sql(`select body from contract_templates where id = '${AGREEMENT}'`)
    await tapEl(m, m.getByTestId('template-signatures-row')); await settle(m, 1200)
    const tf = m.getByTestId('template-fields-screen')
    ok(await tf.getByTestId('signature-fields').isVisible(), 'Signature fields opens C2’s panel')
    await tapEl(m, tf.getByTestId('esign-add').first()); await settle(m, 900)
    await tapEl(m, m.getByTestId('place-add'))
    const tLanded = await m.getByTestId('template-document-screen').locator('[data-fresh]').first().waitFor({ state: 'attached', timeout: 4000 }).then(() => true, () => false)
    ok(tLanded, 'the field lands on the clause’s Document screen with the fresh mark (the contract’s rule)')
    await settle(m, 1800)
    ok(sql(`select body from contract_templates where id = '${AGREEMENT}'`) !== tBody, 'a field placed by which-then-where is saved on the template')
    await m.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).first().tap(); await settle(m, 1800)
    ok(sql(`select body from contract_templates where id = '${AGREEMENT}'`) === tBody, '…and Undo takes it out')
    await go(m, `/templates/contracts/${AGREEMENT}`, 1500)
    // Before the client signs
    await tapEl(m, m.getByTestId('template-gates-row')); await settle(m, 1200)
    const tg = m.getByTestId('template-gates-screen')
    const tScroll = Number(sql(`select requires_scroll from contract_templates where id = '${AGREEMENT}'`))
    const tgr = await box(tg.getByTestId('gate-row').first().locator('span').first()); await tap(m, tgr.x + 20, tgr.cy); await settle(m, 1500)
    ok(Number(sql(`select requires_scroll from contract_templates where id = '${AGREEMENT}'`)) === (tScroll ? 0 : 1), 'Before the client signs: a tap on the words toggles the template’s rule')
    await tap(m, tgr.x + 20, tgr.cy); await settle(m, 1500)
    await m.goBack(); await settle(m, 1000)
    // ⋮
    await tapEl(m, m.getByTestId('template-more')); await settle(m, 800)
    ok(JSON.stringify(await menuRows(m)) === JSON.stringify(['Rename', 'Set as default', 'Use at handover', 'Duplicate', 'Delete']), `the reading screen’s ⋮: ${(await menuRows(m)).join(' · ')}`)
    await m.keyboard.press('Escape'); await settle(m, 500)
    // a standard PDF template: its picture and ONE Open the PDF (C-18)
    await go(m, `/templates/contracts/${ids.pdfTpl}`, 1800)
    const tpdf = m.getByTestId('template-pdf')
    ok(await tpdf.isVisible() && (await box(m.getByTestId('template-open-pdf'))).h >= 48, 'a standard PDF keeps its picture with one Open the PDF (48)')
    ok(await m.getByTestId('template-reading-screen').getByRole('button', { name: /^Open/ }).count() + await m.getByTestId('template-reading-screen').getByRole('link', { name: /^Open/ }).count() === 1, '…and only one Open')
    await shot(m, '24-m390-template-pdf')
    sql(`update contract_templates set is_default = 0 where id = '${AGREEMENT}'`)

    // ── 9 · 320 ──
    console.log('9 · 320: no sideways scroll')
    const S = await touchCtx(320, 568); const s = await page(S, '320')
    for (const u of ['/contracts', `/leads/${VIVIEN.lead}/contracts`, '/company/templates/contracts', `/templates/contracts/${AGREEMENT}`]) { await go(s, u); ok(await sideways(s) <= 0, `no sideways scroll at 320 on ${u}`) }
    await shot(s, '25-m320-list')
    await S.close()
    await M.close()

    // ── 5 · touch tablets ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · P-08 · A-05 · A-06 · A-13 · C-05 · C-20 at 768 portrait and 1024 landscape (touch)')
    for (const [w, h] of [[768, 1024], [1024, 768]]) {
      const T = await touchCtx(w, h); const t = await page(T, String(w))
      await t.evaluate(() => { try { Object.keys(localStorage).filter((k) => k.startsWith('om.columns.')).forEach((k) => localStorage.removeItem(k)) } catch {} }).catch(() => {})
      await go(t, '/contracts')
      const heads = await t.locator('[aria-label="Contracts"] [role="columnheader"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim()).map((e) => e.textContent.trim().replace(/(unfold_more|arrow_upward|arrow_downward)$/, '')))   // the label, not its sort glyph's ligature
      ok(JSON.stringify(heads) === JSON.stringify(['Title', 'Client', 'Status', 'Sent']), `${w}: ((the calm UI build 2026-10-27, a deliberate change) W-230) the table opens with Title · Client · Status · Sent (${heads.join(' · ')})`)
      const frameR = (await box(t.locator('[aria-label="Contracts"]'))).r
      const kebabs = await t.locator('[aria-label="Contracts"] [role="row"][data-kb-row] button[aria-label^="More actions for"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))
      ok(kebabs.length > 0 && kebabs.every((r) => r <= frameR + 1), `${w}: every row’s ⋮ is in view, frozen at the right (A-05)`)
      const waitF = await t.locator('[data-testid^="contract-waiting"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => parseFloat(getComputedStyle(e).fontSize)))
      ok(waitF.length > 0 && waitF.every((f) => f >= 14), `${w}: the since under a status reads 14 (${waitF.join(' · ')}) (A-08)`)
      ok(await t.locator('[aria-label="Contracts"] [role="row"][data-kb-row] button').filter({ hasText: /^View$/ }).evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length) === 0, `${w}: no View — the title opens`)
      await shot(t, `26-t${w}-list`)
      await tapEl(t, card(t, ids.sent).getByRole('button', { name: /^More actions for/ })); await settle(t, 800)
      const rowsT = await menuRows(t)
      ok(rowsT[0] === 'Open' && rowsT.includes('Share PDF') && !rowsT.includes('Print') && !rowsT.includes('Download as PDF'), `${w}: the ⋮ starts with Open and carries one Share PDF (${rowsT.join(' · ')})`)
      await t.keyboard.press('Escape'); await settle(t, 500)
      await tapEl(t, card(t, ids.sent).locator('[data-kb-open]'))
      ok(await urlIs(t, new RegExp(`/contracts/${ids.sent}`)), `${w}: a tap on the title opens it`)
      if (w === 768) {
        await go(t, `/leads/${VIVIEN.lead}/contracts`)
        const aside = await t.evaluate(() => { const a = document.querySelector('[data-tab="contracts"] + *'); return a ? getComputedStyle(a).display : 'none' })
        ok(aside === 'none', '768 portrait: no quick-links strip on the lead’s Contracts tab (A-06)')
        await shot(t, '27-t768-lead-tab')
        await tapEl(t, t.getByRole('button', { name: 'New Contract' }).locator('visible=true').first()); await settle(t, 800)
        await t.locator('[role="menu"]').last().getByRole('menuitem', { name: 'From a template' }).tap(); await settle(t, 1500)
        const pk = t.getByRole('dialog', { name: 'Which agreement should they sign?' })
        ok(await pk.getByRole('radio').count() >= 2 && await pk.locator('[class*="thumb"]').count() === 0 && (await box(pk)).w <= 601, `768: the picker is the list in a ${Math.round((await box(pk)).w)} frame — no 300px paper cards (C-20)`)
        await shot(t, '28-t768-picker')
        await t.keyboard.press('Escape'); await settle(t, 600)
        await go(t, '/company/templates/contracts')
        ok(await t.getByTestId('library-rows').isVisible(), '768 portrait: the templates gallery is the rows (Q-01)')
        await shot(t, '29-t768-templates')
        await go(t, `/templates/contracts/${AGREEMENT}`)
        ok(await t.getByTestId('template-reading-screen').isVisible(), '768 portrait: a template opens as its reading screen')
        // C2's tool row pins under the frame's bar inside the Document screen
        await go(t, `/contracts/${OLIVIA.contract}?edit=document`, 2000)
        await t.getByTestId('document-screen').locator('[class*="body"]').first().evaluate((el) => { el.scrollTop = 900 }); await settle(t, 600)
        const rowY = (await box(t.getByTestId('doc-tool-row'))).y, barB = (await box(t.getByTestId('document-screen').locator('[data-screen-bar]'))).bt
        ok(Math.abs(rowY - barB) <= 2, `768: C2’s tool row pins right under the Document frame’s bar (${Math.round(rowY)} vs ${Math.round(barB)})`)
      } else {
        await go(t, '/company/templates/contracts')
        ok(await t.getByTestId('library-card').count() >= 1 && await t.getByTestId('library-rows').count() === 0, '1024 landscape: the gallery keeps its grid')
        const listBtn = t.getByRole('radio', { name: 'List view' }).or(t.getByRole('button', { name: 'List view' })).first()
        await tapEl(t, listBtn); await settle(t, 1200)
        const lh = await t.getByTestId('library-table').locator('[role="columnheader"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim()).map((e) => e.textContent.trim().replace(/\s+/g, ' ')))
        ok(lh.length === 3 && /^Template/.test(lh[0]) && /^Used by/.test(lh[1]) && /^Updated/.test(lh[2]) && await t.getByTestId('library-actions-head').count() === 1, `1024: the list view opens with Template · Used by · Updated, its ⋮ frozen (C-05) — ${lh.join(' · ')}`)
        await shot(t, '30-t1024-template-list')
        await go(t, `/contracts/${OLIVIA.contract}?edit=document`, 2000)
        ok(await t.getByRole('button', { name: 'Outline' }).isVisible(), '1024: the Document frame’s ≡ is the "Outline" button (ct-r4 · sw-r2 find it)')
      }
      await T.close()
    }

    // ── 8 · 1440, a mouse ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · 1440 (a mouse): the desk as it was')
    const DK = await mouseCtx(1440, 1024); const d = await page(DK, '1440')
    await go(d, '/contracts')
    ok(await d.getByTestId('contract-card-name').first().isVisible() === false && await d.locator('[aria-label="Contracts"] [role="columnheader"]').filter({ hasText: 'Created' }).count() === 1, 'the table as the mock: every column, no card lines')
    const row = card(d, ids.sent); await row.hover(); await settle(d, 400)
    ok(await row.getByRole('button', { name: 'View' }).count() === 0 && await row.getByRole('button', { name: /^More actions for/ }).isVisible(), 'the row’s ⋮ on hover — the title opens')   // (the calm UI build 2026-10-27, a deliberate change) 4-46 as Quotes
    await row.getByRole('button', { name: /^More actions for/ }).click(); await settle(d, 600)
    const deskRows = await menuRows(d)
    ok(deskRows.some((r) => /^Preview and share$/i.test(r)) && deskRows.includes('Download as PDF') && deskRows.includes('Print') && !deskRows.includes('Open') && !deskRows.includes('Share PDF'), `the desk’s ⋮ unchanged (${deskRows.join(' · ')})`)
    await d.keyboard.press('Escape')
    await go(d, '/company/templates/contracts')
    ok(await d.getByTestId('library-card').count() >= 1 && await d.getByTestId('library-rows').count() === 0 && !(await d.getByTestId('template-state-words').first().isVisible().catch(() => false)), 'the gallery’s cards and chips, no rows, no words for the chips')
    await go(d, `/templates/contracts/${AGREEMENT}`)
    ok(await d.getByTestId('template-reading-screen').count() === 0, 'a template opens in the desk editor')
    await go(d, `/leads/${VIVIEN.lead}?move=won`, 2500)
    const up = d.getByRole('tab', { name: 'Upload' }); if (await up.count() > 1) { await up.nth(1).click(); await settle(d, 600) }
    ok(await d.getByText('Drop your file or', { exact: false }).count() >= 1 && await d.getByTestId('won-take-photo').count() === 0, 'the Won step keeps "Drop your file or browse · Supports: PDF"')
    await go(d, `/leads/${VIVIEN.lead}/contracts`)
    await d.getByRole('button', { name: 'New Contract' }).first().click(); await settle(d, 500)
    await d.locator('[role="menu"]').last().getByRole('menuitem', { name: 'Import a file' }).click(); await settle(d, 900)
    ok(await d.getByText('Upload the contract PDF').count() >= 1 && await d.getByTestId('import-take-photo').count() === 0, 'Import keeps "Upload the contract PDF"')
    await d.keyboard.press('Escape')
    if (RYAN_PROJECT) {
      await go(d, `/projects/${RYAN_PROJECT}`, 2000)
      ok(!(await d.getByTestId('project-documents').isVisible().catch(() => false)), 'no Documents card on the desk (the info column keeps its rows)')
      await go(d, `/projects/${RYAN_PROJECT}/money`, 2000)
      ok(!(await d.getByTestId('money-contract-line').isVisible().catch(() => false)) && (await fontOf(d.getByTestId('money-collected'))).size === 12, 'no contract line and the help at 12 on the desk')
    }
    await DK.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    try { fs.unlinkSync(jpegPath) } catch {}
    await b.close()
  }
  console.log(`\nerrors: ${errors.length}`); for (const e of errors) console.log('  !', e)
  ok(errors.length === 0, 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
