// Contracts on the move, C3 · the client's signing page on a phone and a tablet (his "I have marked everything in the doc please check and
// built accordingly", 2026-10-22, on the review page https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv; the lane A audit). Each rule asserted
// as the rule it builds, never another round's count — and every new press pressed for real, on the production build:
//  - P-05 · A-18 · A-21 · A-22: at 390 (touch) the paper comes first under a three-line hero (the agreement · "Signs quotation OM-10001 ·
//    S$… → As cards" · "Hi Olivia, read it, then sign with a one-time code"); the desk's card never mounts; the sticky bar says "Read to the
//    end to sign" with the progress from the headings, then one filled 48 button — Accept and sign — that a real tap lands on; the paper reads 16.
//  - P-06 · A-20 · A-19 · A-23: Accept and sign opens the sheet: (1) the words to tick at 16 and the CaseTrust box (44 rows), Continue;
//    (2) six code boxes, numeric, the first `one-time-code`, 56 tall, the sixth digit verifies; (3) Type first with the serif preview, the
//    consent sentence at 16 in the default ink, NRIC folded, Draw one tap away — a full-width 2:1 pad whose stroke is stored in the shape
//    drawn (a square stays square: the bbox ratio ≈ 1), Clear under it (44). Sign closes the sheet; the page lands on the signature box
//    (in view), the paper draws the square unwarped, the Signed card carries Save a copy · Signing record (a sheet with "Drawn by hand").
//  - A-24 · Q-06: Save a copy opens the share sheet with this page's address where `navigator.share` exists; without it the link is copied
//    and the page says it stays at this link with the record.
//  - A-16 · A-17: As cards opens the quote IN PLACE (a layer: the total card, the reading cards, never an A4 at 390; View as printed → the
//    viewer); the phone's Back closes it without a reload; /sign/<token>/quote reads as cards with "← Agreement".
//  - the bundle at 390: the hero lists the documents; "Document 1 of 2 · Read to the end" → Next document (the next at its own top) →
//    Accept and sign on the last → the sheet with each document's tick → the code → one signature covers both (both Signed).
//  - A-25: a dead link (expired, never made, the quote page of an expired) carries "Message {studio}", 48 tall on a phone.
//  - C-26: the chat card still answers 1200×630 PNG; the renderer draws the eyebrow at 40 and the line at 44 (the source rule).
//  - 768 portrait (touch): the phone model (hero + bar), the sheet a 400 dialog; 1024 landscape (touch): the phone model, the quote layer
//    showing the paper at 1:1. 1440: the desk's card beside the paper with Send code → the One-time code field (unchanged); no hero, no bar;
//    the signed page keeps its record under the paper and Download a copy. 320: no sideways scroll, the bar's button full width.
//  - no page errors; no sideways scroll at 390 · 768 · 1024 · 320 (against screen.width).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3183 NODE_PATH=<repo>/node_modules node verify-rc-c3.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rc-c3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3183'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify/responsive-contracts')) ? process.cwd() : path.resolve(__dirname, '..', '..', '..'))   // (landing) the harness runs a copy from its lane, cwd = the repo
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rc-c3-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

const DRAFT = '81463786-769d-42aa-b226-192081cfd6e6'   // Olivia Martinez's Draft agreement, naming OM-10001
const AISHA = '382ddfed-aa4a-4bb5-a745-fe0e035b85cf'   // signed online
const SENT = 'probec3sent0000000001', EXPIRED = 'probec3expired00000001', BUNDLE = 'probe-c3-bundle'

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
  /* the staging: a sent agreement (its quote with the client — S42 B-01), an expired one, a set of two — copies of the Draft under fixed ids */
  sql(`update quotes set status='Sent to Client', client_sent_at=coalesce(client_sent_at, strftime('%s','now')) where id=(select from_quote_id from contracts where id='${DRAFT}')`)
  sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token, sign_expires_at, from_quote_id, issuing_entity) select 'probe-c3-sent', lead_id, title, 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, recipient_name, coalesce(recipient_phone,'91234567'), 'composed', created_by, 1, 1, '${SENT}', strftime('%s','now') + 7*86400, from_quote_id, issuing_entity from contracts where id='${DRAFT}'`)
  sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token, sign_expires_at, from_quote_id, issuing_entity) select 'probe-c3-expired', lead_id, title, 'Sent to Client', strftime('%s','now') - 9*86400, strftime('%s','now') - 9*86400, body, recipient_name, coalesce(recipient_phone,'91234567'), 'composed', created_by, 1, 1, '${EXPIRED}', strftime('%s','now') - 2*86400, from_quote_id, issuing_entity from contracts where id='${DRAFT}'`)
  sql(`insert into contract_bundles (id, lead_id, recipient_name, recipient_phone, created_at, sent_at, created_by, sign_expires_at, sign_token) select '${BUNDLE}', lead_id, recipient_name, coalesce(recipient_phone,'91234567'), strftime('%s','now'), strftime('%s','now'), created_by, strftime('%s','now') + 7*86400, 'probec3bundle000000001' from contracts where id='${DRAFT}'`)
  sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token, sign_expires_at, from_quote_id, issuing_entity, bundle_id, bundle_position) select 'probe-c3-b1', lead_id, title, 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, recipient_name, coalesce(recipient_phone,'91234567'), 'composed', created_by, 1, 1, 'probec3b1000000000001', strftime('%s','now') + 7*86400, from_quote_id, issuing_entity, '${BUNDLE}', 0 from contracts where id='${DRAFT}'`)
  sql(`insert into contracts (id, lead_id, title, status, created_at, sent_at, body, recipient_name, recipient_phone, source, created_by, requires_scroll, requires_accept, sign_token, sign_expires_at, from_quote_id, issuing_entity, bundle_id, bundle_position) select 'probe-c3-b2', lead_id, 'Addendum — Site works', 'Sent to Client', strftime('%s','now'), strftime('%s','now'), body, recipient_name, coalesce(recipient_phone,'91234567'), 'composed', created_by, 1, 0, 'probec3b2000000000001', strftime('%s','now') + 7*86400, null, issuing_entity, '${BUNDLE}', 1 from contracts where id='${DRAFT}'`)
  const STUDIO = JSON.parse(sql(`select value from settings where key='brand'`)).details?.name ?? 'Demo Studio Pte Ltd'

  const touchCtx = (w, h, init) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }).then(async (c) => { if (init) await c.addInitScript(init); return c })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only: a full-page capture drops (hover: none) mid-shot
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, bottom: r.bottom } })
  /* what a tap at (x, y) lands on: the nearest ancestor matching `sel` (its label, test id or its words — an icon's ligature text left out) */
  const hit = (p, x, y, sel) => p.evaluate(([x, y, sel]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const m = el.closest(sel); if (!m) return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`; const c = m.cloneNode(true); c.querySelectorAll('[aria-hidden]').forEach((n) => n.remove()); return m.getAttribute('aria-label') || m.getAttribute('data-testid') || c.textContent.trim().slice(0, 40) }, [x, y, sel])
  const fontOf = (loc) => loc.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color }))
  const tap = async (p, x, y) => { await p.touchscreen.tap(x, y) }
  const toEnd = async (p) => { await p.getByTestId('paper-end').scrollIntoViewIfNeeded(); await settle(p, 700) }
  const vis = (p, id) => p.getByTestId(id).locator('visible=true')
  /* a square drawn on the pad by pointer; the stored path's bounding box ratio (width / height) */
  const drawSquare = async (p, pad, side = 100) => {
    const r = await box(pad)
    const x0 = r.x + 40, y0 = r.y + Math.max(10, (r.h - side) / 2)
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0 + side, y0, { steps: 6 }); await p.mouse.move(x0 + side, y0 + side, { steps: 6 }); await p.mouse.move(x0, y0 + side, { steps: 6 }); await p.mouse.move(x0, y0, { steps: 6 }); await p.mouse.up()
    await settle(p, 300)
  }
  const pathRatio = (d) => { const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]) } return (x1 - x0) / Math.max(1, y1 - y0) }
  const typeCode = async (p, code = '123456') => { await p.getByTestId('sign-digit').first().focus(); await p.keyboard.type(code, { delay: 40 }); await settle(p, 500) }

  try {
    // ── 1 · the signing page at 390: paper first, the hero, the bar, the quote in place ────────────────────────────────────────────────
    console.log('1 · /sign/<token> on a phone (390, touch): the hero, the paper first, the bar, the quote in place')
    const M = await touchCtx(390, 844, () => { Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__shared = d } }) })
    const m = await page(M, 'phone')
    await go(m, `/sign/${SENT}`)
    await shot(m, '01-m390-sign-top')
    ok((await sideways(m)) <= 0, `no sideways scroll at 390 (${await sideways(m)})`)
    ok(await m.locator('aside[aria-label="Sign this agreement"]').count() === 0, 'the desk’s card never mounts on a phone (A-18)')
    const hero = m.getByTestId('sign-hero')
    ok(await hero.isVisible(), 'a hero under the letterhead bar')
    const hb = await box(hero), topBar = await box(m.locator('header').first())
    ok(hb.y >= topBar.bottom && hb.y < 120, `the hero is the first thing under the 64 bar (y ${Math.round(hb.y)})`)
    ok(/Interior Design Service Agreement/.test(await hero.locator('h2').innerText()), 'line 1: the agreement')
    const qrow = m.getByTestId('sign-quote-row')
    ok(/Signs quotation OM-10001 · S\$[\d,]+\.\d\d/.test(await qrow.innerText()) && /As cards/.test(await qrow.innerText()), `line 2: "${(await qrow.innerText()).replace(/\s+/g, ' ')}"`)
    ok(/Hi Olivia, read it, then sign with a one-time code\./.test(await m.getByTestId('sign-hero-line').innerText()), 'line 3: "Hi Olivia, read it, then sign with a one-time code."')
    const fq = await fontOf(qrow.locator('[class*="heroRowText"]')), fl = await fontOf(m.getByTestId('sign-hero-line'))
    ok(fq.size === 16 && fl.size === 16, `the hero's lines read 16 (${fq.size} · ${fl.size}) — P-13`)
    const paper = m.getByTestId('contract-paper')
    const pb = await box(paper)
    ok(pb.y > hb.bottom && pb.y < hb.bottom + 40, `the paper comes straight after the hero (y ${Math.round(pb.y)}) — paper first (Q-05)`)
    const fp = await fontOf(paper.locator('p').first())
    ok(fp.size === 16, `the paper's body reads 16 (${fp.size})`)
    const bar = m.getByTestId('sign-next')
    ok(await bar.isVisible() && (await bar.getAttribute('data-kind')) === 'reading' && /Read to the end to sign/.test(await bar.innerText()), 'the sticky bar says "Read to the end to sign"')
    const bb = await box(bar)
    ok(Math.abs(bb.bottom - 844) < 2 && bb.x <= 0 && bb.w >= 388, `the bar sits on the screen's bottom edge, full width (${Math.round(bb.w)} wide, bottom ${Math.round(bb.bottom)})`)
    ok(await m.getByTestId('sign-bar-primary').count() === 0, 'no button while the reading is not done — the gate stays a rule (REG-633)')
    ok(/\d+ sections/.test(await m.getByTestId('sign-progress').innerText()), `the progress counts the sections (${await m.getByTestId('sign-progress').innerText()})`)
    await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45)); await settle(m, 600)
    const prog = await m.getByTestId('sign-progress').innerText()
    ok(/^\d+ of \d+ sections$/.test(prog) && Number(prog.split(' ')[0]) > 1, `half-way the bar says where they are ("${prog}")`)
    await shot(m, '02-m390-sign-reading')
    /* As cards: the quote in place */
    await m.evaluate(() => { window.__mark = 1; window.scrollTo(0, 0) }); await settle(m, 400)
    const qb = await box(qrow)
    ok(qb.h >= 44, `the quote row is a 44 target (${Math.round(qb.h)})`)
    await tap(m, qb.cx, qb.cy); await settle(m, 1600)
    const layer = m.getByTestId('sign-quote-layer')
    ok(await layer.isVisible() && /Quotation OM-10001/.test(await layer.innerText()), 'a tap opens the quote in place — a layer, not a new tab (A-17)')
    await layer.getByTestId('reading-cards').waitFor({ state: 'visible', timeout: 15000 })
    ok(await layer.getByTestId('sign-quote-total').isVisible() && (await layer.getByTestId('reading-card').count()) > 0, 'the total card and the reading cards (A-16)')
    ok(await layer.locator('[data-page]').locator('visible=true').count() === 0, 'never an A4 inline at 390')
    const fa = await fontOf(layer.getByTestId('reading-card').first().locator('span').first())
    ok(fa.size >= 14, `a card's line reads at least 14 (${fa.size})`)
    await shot(m, '03-m390-quote-layer')
    await layer.getByTestId('view-as-printed').tap(); await settle(m, 1200)
    ok(await m.getByTestId('paper-viewer').isVisible(), 'View as printed opens the house paper viewer')
    await m.getByTestId('paper-viewer-back').tap(); await settle(m, 700)
    ok(await m.getByTestId('paper-viewer').count() === 0 && await layer.isVisible(), 'back from the viewer lands on the cards')
    await m.goBack(); await settle(m, 900)
    ok(await m.getByTestId('sign-quote-layer').count() === 0 && (await m.evaluate(() => window.__mark)) === 1 && /\/sign\/probec3sent/.test(m.url()), 'the phone’s Back closes the layer — no reload, the agreement where it was')
    await tap(m, qb.cx, qb.cy); await settle(m, 1200)
    await m.getByTestId('sign-quote-layer-back').tap(); await settle(m, 900)
    ok(await m.getByTestId('sign-quote-layer').count() === 0 && (await m.evaluate(() => window.__mark)) === 1, '← closes it too, the history entry popped')

    // ── 2 · read to the end → Accept and sign → the sheet's three screens → Sign ─────────────────────────────────────────────────────
    console.log('2 · the walk to the signature: the bar, the sheet (ticks · code · type or draw), the landing')
    await toEnd(m)
    ok((await bar.getAttribute('data-kind')) === 'ready', 'read to the end, the bar turns to the one action')
    const primary = m.getByTestId('sign-bar-primary')
    const prb = await box(primary)
    ok(/^Accept and sign$/.test((await primary.innerText()).trim()) && prb.h >= 48 && prb.w >= 340, `"Accept and sign", 48 tall and full width (${Math.round(prb.w)}×${Math.round(prb.h)})`)
    ok((await hit(m, prb.cx, prb.cy, '[data-testid="sign-bar-primary"]')) === 'sign-bar-primary', 'a tap at its centre lands on it')
    await shot(m, '04-m390-sign-ready')
    await tap(m, prb.cx, prb.cy); await settle(m, 1100)
    const sheet = m.getByRole('dialog', { name: 'Accept the agreement' })
    ok(await sheet.isVisible(), 'Accept and sign opens the sheet at its first screen')
    const sb = await box(sheet)
    ok(Math.abs(sb.bottom - 844) < 2 && sb.w >= 388, `a bottom sheet (${Math.round(sb.w)} wide on the screen's bottom edge)`)
    const tick = sheet.getByTestId('sign-sheet-accept')
    const tb = await box(tick)
    const ft = await fontOf(tick.locator('span span').last())
    ok(tb.h >= 44 && ft.size === 16, `the words to tick: a 44 row at 16 (${Math.round(tb.h)} · ${ft.size})`)
    const cont = sheet.getByTestId('sign-sheet-continue')
    ok(await cont.isDisabled(), 'Continue waits for the ticks')
    await tap(m, tb.x + 12, tb.cy); await settle(m, 300)
    const ct = sheet.getByTestId('gate-casetrust-tick')
    ok(await ct.isVisible(), 'the CaseTrust box in the sheet (the studio is accredited)')
    const cb = await box(ct)
    const fcl = await fontOf(sheet.getByTestId('gate-casetrust').locator('li').first())
    ok(cb.h >= 44 && fcl.size === 14, `its tick a 44 row, its bullets at 14 (${Math.round(cb.h)} · ${fcl.size}) — A-21`)
    await tap(m, cb.x + 12, cb.cy); await settle(m, 300)
    ok(await cont.isEnabled(), 'both ticked, Continue is live')
    await shot(m, '05-m390-sheet-accept')
    const cob = await box(cont)
    ok(cob.h >= 48, `Continue is 48 tall (${Math.round(cob.h)})`)
    await tap(m, cob.cx, cob.cy); await settle(m, 1200)
    const code = m.getByRole('dialog', { name: 'Enter the code' })
    ok(await code.isVisible(), 'Continue sends the code and opens the second screen')
    ok(/Demo only — no text is sent: any six digits sign it\./.test(await code.getByTestId('sign-code-demo').innerText()), 'the stand-in says so, plainly (S42 B-03)')
    const digits = code.getByTestId('sign-digit')
    ok(await digits.count() === 6, 'six code boxes (A-20)')
    const d0 = await box(digits.first())
    ok(d0.h >= 56, `each box 56 tall (${Math.round(d0.h)})`)
    ok((await digits.first().getAttribute('autocomplete')) === 'one-time-code' && (await digits.first().getAttribute('inputmode')) === 'numeric', 'the first box offers the SMS code (autocomplete one-time-code, numeric)')
    ok(await code.locator('label:has-text("One-time code") input').count() === 0, 'no plain text field for the code')
    await shot(m, '06-m390-sheet-code')
    await typeCode(m)
    const signD = m.getByRole('dialog', { name: 'Sign as yourself' })
    ok(await signD.isVisible(), 'the sixth digit verifies — the third screen')
    ok(await signD.getByTestId('sign-how').getByRole('radio', { name: 'Type' }).isChecked(), 'Type first (Q-02)')
    const nameBox = signD.getByRole('textbox', { name: /Your full name/ })
    ok((await nameBox.inputValue()) === 'Olivia Martinez', 'the name prefilled')
    ok(await signD.getByTestId('sign-preview').isVisible(), 'the serif preview of the typed name')
    const fn = await fontOf(nameBox)
    ok(fn.size === 16, `the field types at 16 (${fn.size})`)
    const consent = signD.getByTestId('sign-sheet-consent')
    const fc = await fontOf(consent), fh = await fontOf(hero.locator('h2'))
    ok(fc.size === 16 && fc.color === fh.color && /I, Olivia Martinez, agree to the Interior Design Service Agreement and quotation OM-10001/.test(await consent.innerText()), `the consent sentence at 16 in the default ink (${fc.size}, ${fc.color})`)
    ok(await signD.getByTestId('sign-add-nric').isVisible() && await signD.getByRole('textbox', { name: /NRIC/ }).count() === 0, 'NRIC / FIN folded behind "Add NRIC / FIN (optional)" (A-23)')
    await shot(m, '07-m390-sheet-type')
    const draw = signD.getByTestId('sign-how').getByRole('radio', { name: 'Draw' })
    const drb = await box(draw)
    const fdr = await fontOf(draw)
    ok(drb.h >= 44 && fdr.size === 14, `the Draw chip a 44 target at 14 (${Math.round(drb.h)} · ${fdr.size})`)
    await tap(m, drb.cx, drb.cy); await settle(m, 500)
    const pad = signD.getByTestId('signature-pad')
    const padB = await box(pad)
    ok(padB.w >= 340 && Math.abs(padB.w / padB.h - 2) < 0.06, `Draw: a full-width pad at a fixed 2:1 (${Math.round(padB.w)}×${Math.round(padB.h)}) — A-19`)
    ok((await pad.locator('svg').getAttribute('preserveAspectRatio')) === 'xMidYMid meet', 'the svg keeps the ratio (meet)')
    const clear = signD.getByTestId('sign-clear')
    const clb = await box(clear)
    ok(clb.y >= padB.bottom && (await hit(m, clb.cx, clb.cy + 18, '[data-testid="sign-clear"]')) === 'sign-clear', 'Clear under the pad, answering 18px below its centre (a 44 box)')
    ok(await signD.getByTestId('sign-sheet-sign').isDisabled(), 'Sign waits for a stroke')
    await drawSquare(m, pad)
    const d = await pad.locator('path').getAttribute('d')
    const ratio = pathRatio(d || '')
    ok(!!d && Math.abs(ratio - 1) < 0.12, `a 100×100 square is stored square — the path's bbox ratio ${ratio.toFixed(2)} (A-19: it was 1.97 at 390)`)
    const nums = (d || '').match(/-?\d+(?:\.\d+)?/g).map(Number)
    ok(nums.every((n, i) => (i % 2 === 0 ? n >= 0 && n <= 752 : n >= 0 && n <= 140)), 'every point lies inside the 752×140 frame the record keeps')
    await shot(m, '08-m390-sheet-draw')
    const signBtn = signD.getByTestId('sign-sheet-sign')
    const sgb = await box(signBtn)
    ok(sgb.h >= 48 && await signBtn.isEnabled(), `Sign agreement, 48 tall (${Math.round(sgb.h)})`)
    await tap(m, sgb.cx, sgb.cy); await m.getByTestId('signed-card').waitFor({ state: 'visible', timeout: 20000 }); await settle(m, 1800)
    ok(sql(`select status || '|' || signature_kind from contracts where id='probe-c3-sent'`) === 'Signed|draw', 'the contract is Signed with the drawing on the record')
    ok(await m.getByRole('dialog', { name: 'Sign as yourself' }).count() === 0, 'the sheet closes on Sign')
    const boxEl = m.locator('[data-sign="client-signature"]')
    const bx = await box(boxEl)
    ok(bx.y >= 60 && bx.bottom <= 844 - 60, `the page lands on the signature box (y ${Math.round(bx.y)}–${Math.round(bx.bottom)} of 844)`)
    const printed = await boxEl.locator('svg path').getAttribute('d')
    ok(!!printed && Math.abs(pathRatio(printed) - 1) < 0.12 && (await boxEl.locator('svg').getAttribute('viewBox')) === '0 0 752 140', 'the paper draws the square unwarped, on the 752×140 frame')
    ok((await bar.getAttribute('data-kind')) === 'signed' && /Signed by Olivia · /.test(await bar.innerText()), `the bar now reads "${(await m.getByTestId('sign-bar-signed').innerText()).trim()}" with Save a copy`)
    await shot(m, '09-m390-signed-landing')
    const sc = m.getByTestId('signed-card')
    ok(/Signed by Olivia Martinez on/.test(await sc.innerText()), 'the Signed card says who and when')
    const rows = ['save-copy', 'signing-record-row']
    for (const id of rows) { const rb = await box(sc.getByTestId(id)); const h = await hit(m, rb.cx, rb.cy, `[data-testid="${id}"], [data-testid="sign-next"]`); ok(rb.h >= 56 && h === id, `${id}: a 56 row a tap lands on (${h}; y ${Math.round(rb.y)}–${Math.round(rb.bottom)})`) }
    ok(await sc.getByTestId('deposit-row').count() === 0, 'no deposit row — none was asked for')
    await sc.getByTestId('signing-record-row').tap(); await settle(m, 1000)
    const rec = m.getByRole('dialog', { name: 'Signing record' })
    ok(await rec.isVisible() && /Drawn by hand/.test(await rec.innerText()) && /Fingerprint/.test(await rec.innerText()), 'Signing record opens as a sheet — one tap away (A-26)')
    ok(await rec.locator('h2').count() === 1 && await rec.locator('[data-testid="signing-record"] h2').count() === 0, 'one title — the sheet’s head; none inside the record')
    await shot(m, '10-m390-record-sheet')
    await m.keyboard.press('Escape'); await settle(m, 600)
    /* Save a copy: the share sheet where it exists */
    await sc.getByTestId('save-copy').tap(); await settle(m, 600)
    const shared = await m.evaluate(() => window.__shared)
    ok(!!shared && shared.url === m.url() && /Interior Design Service Agreement/.test(shared.title) && /signing record/.test(shared.text), 'Save a copy opens the share sheet with this page’s address (A-24, Q-06)')
    await m.getByTestId('sign-bar-save').tap(); await settle(m, 400)
    ok((await m.evaluate(() => window.__shared))?.url === m.url(), 'the bar’s Save a copy does the same')
    /* reopened later: the signed page lands with the card and the record one tap away */
    await go(m, `/sign/${SENT}`)
    ok(await m.getByTestId('signed-card').isVisible() && await m.getByTestId('signing-record-row').isVisible() && await m.locator('[data-testid="signing-record"]').locator('visible=true').count() === 0, 'reopened: the Signed card with its rows; the record in its sheet, not 3,800px down')
    ok(/Signed by Olivia Martinez on/.test(await m.getByTestId('sign-hero-line').innerText()), 'the hero says it is signed')
    await m.close(); await M.close()
    /* without a share sheet: the link is copied and the page says it stays at this link */
    const M2 = await touchCtx(390, 844, () => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t } } }) })
    const m2 = await page(M2, 'phone-noshare')
    await go(m2, `/sign/${SENT}`)
    await m2.getByTestId('sign-bar-save').tap(); await settle(m2, 800)
    ok((await m2.evaluate(() => window.__copied)) === m2.url() && /Link copied — this signed page stays at it, with the signing record and fingerprint/.test(await m2.locator('body').innerText()), 'no share sheet: the link is copied and the page says it stays at this link, with the record and its fingerprint')
    await m2.close(); await M2.close()

    // ── 3 · the quote page, the bundle and the dead links at 390 ────────────────────────────────────────────────────────────────────
    console.log('3 · /sign/<token>/quote, the bundle’s walk, the dead links (390, touch)')
    const M3 = await touchCtx(390, 844); const m3 = await page(M3, 'phone-3')
    await go(m3, `/sign/${SENT}/quote`)
    ok(await m3.getByTestId('sign-quote-total').isVisible() && (await m3.getByTestId('reading-card').count()) > 0 && await m3.locator('[data-page]').locator('visible=true').count() === 0, '/sign/<token>/quote reads as the total card and the cards, never a zoomed A4 (A-16)')
    const back = m3.getByTestId('sign-quote-back')
    ok(await back.locator('[class*="backShort"]').isVisible() && await back.locator('[class*="backLong"]').isHidden() && (await back.getAttribute('href')) === `/sign/${SENT}`, 'the bar’s link reads "← Agreement" and goes to the agreement (A-17)')
    ok((await sideways(m3)) <= 0, 'no sideways scroll on the quote page')
    await shot(m3, '11-m390-quote-page')
    /* the bundle */
    await go(m3, `/sign/bundle/${BUNDLE}`)
    const bh = m3.getByTestId('sign-hero')
    ok(/2 documents to sign/.test(await bh.locator('h2').innerText()) && await bh.getByTestId('sign-hero-docs').locator('li').count() === 2, 'the set’s hero: "2 documents to sign" and its documents as rows')
    ok(await bh.locator('li[data-on]').count() === 1 && /Interior Design Service Agreement/.test(await bh.locator('li[data-on]').innerText()), 'the open document in bold')
    const bbar = m3.getByTestId('sign-next')
    ok(/Document 1 of 2 · Read to the end/.test(await bbar.innerText()), 'the bar walks: "Document 1 of 2 · Read to the end"')
    await shot(m3, '12-m390-bundle-top')
    await toEnd(m3)
    ok(/Document 1 of 2 read/.test(await bbar.innerText()) && /^Next document$/.test((await m3.getByTestId('sign-bar-primary').innerText()).trim()), '"Document 1 of 2 read · Next document"')
    const nb = await box(m3.getByTestId('sign-bar-primary')); await tap(m3, nb.cx, nb.cy); await settle(m3, 900)
    const wt = await m3.getByTestId('bundle-walk').evaluate((e) => Math.round(e.getBoundingClientRect().top))
    ok(wt >= 64 && wt < 160, `the next document opens at its own top, under the bar (top ${wt})`)
    ok(await bh.locator('li[data-read]').count() >= 1 && /Addendum/.test(await bh.locator('li[data-on]').innerText()), 'the hero ticks the one read and bolds the next')
    await shot(m3, '13-m390-bundle-doc2')
    await toEnd(m3)
    ok(/^Accept and sign$/.test((await m3.getByTestId('sign-bar-primary').innerText()).trim()), 'on the last document: Accept and sign')
    const ab = await box(m3.getByTestId('sign-bar-primary')); await tap(m3, ab.cx, ab.cy); await settle(m3, 1100)
    const bsheet = m3.getByRole('dialog', { name: 'Accept these documents' })
    ok(await bsheet.isVisible() && await bsheet.getByTestId('sign-sheet-accept').count() === 1 && /Interior Design Service Agreement/.test(await bsheet.getByTestId('sign-sheet-accept').innerText()), 'the sheet once, at the end: the document that asks for a tick, named')
    const t1 = await box(bsheet.getByTestId('sign-sheet-accept')); await tap(m3, t1.x + 12, t1.cy); await settle(m3, 300)
    const bct = await box(bsheet.getByTestId('gate-casetrust-tick')); await tap(m3, bct.x + 12, bct.cy); await settle(m3, 300)
    const bc = await box(bsheet.getByTestId('sign-sheet-continue')); await tap(m3, bc.cx, bc.cy); await settle(m3, 1200)
    await typeCode(m3)
    const bsign = m3.getByRole('dialog', { name: 'Sign as yourself' })
    ok(await bsign.isVisible() && /these 2 documents — Interior Design Service Agreement, Addendum — Site works —/.test(await bsign.getByTestId('sign-sheet-consent').innerText()), 'the consent names every document')
    const bsb = await box(bsign.getByTestId('sign-sheet-sign'))
    ok(/^Sign 2 documents$/.test((await bsign.getByTestId('sign-sheet-sign').innerText()).trim()), 'the one button: "Sign 2 documents"')
    await tap(m3, bsb.cx, bsb.cy); await m3.getByTestId('signed-card').waitFor({ state: 'visible', timeout: 20000 }); await settle(m3, 1500)
    ok(sql(`select count(*) from contracts where bundle_id='${BUNDLE}' and status='Signed' and document_hash is not null`) === '2', 'one signature covers both — both Signed with their kept copies')
    ok(/keep a copy of each/.test(await m3.getByTestId('signed-card').innerText()), 'the Signed card: "a copy of each"')
    await m3.getByTestId('signing-record-row').tap(); await settle(m3, 900)
    ok(/Documents/.test(await m3.getByRole('dialog', { name: 'Signing record' }).innerText()), 'the set’s record names its documents')
    await shot(m3, '14-m390-bundle-signed')
    await m3.keyboard.press('Escape'); await settle(m3, 400)
    /* the dead links */
    for (const [url, what] of [[`/sign/${EXPIRED}`, 'an expired link'], ['/sign/never-made-0000000000', 'a link never made'], [`/sign/${EXPIRED}/quote`, 'the quote page of an expired link']]) {
      await go(m3, url)
      const msg = m3.getByTestId('link-notice-message')
      const mb = await msg.count() ? await box(msg) : null
      ok(!!mb && mb.h >= 48 && new RegExp(`Message ${STUDIO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(await msg.innerText()), `${what} carries "Message ${STUDIO}", 48 tall (A-25)`)
    }
    await shot(m3, '15-m390-expired')
    await m3.close(); await M3.close()

    // ── 4 · a tablet held upright, a tablet held sideways ─────────────────────────────────────────────────────────────────────────────
    console.log('4 · 768 portrait and 1024 landscape (touch)')
    const T = await touchCtx(768, 1024); const t = await page(T, 'tablet')
    sql(`update contracts set status='Sent to Client', signed_at=null, signed_by=null, signed_body=null, document_hash=null, signature_kind=null, signature_data=null, casetrust_at=null, accepted_at=null where id='probe-c3-sent'`)
    await go(t, `/sign/${SENT}`)
    ok(await t.getByTestId('sign-hero').isVisible() && (await t.getByTestId('sign-next').getAttribute('data-kind')) === 'reading' && (await sideways(t)) <= 0, '768 upright, open: the hero and the reading bar, no sideways scroll')
    await shot(t, '19-t768-sign-top')
    await toEnd(t)
    const tp = await box(t.getByTestId('sign-bar-primary'))
    ok(tp.h >= 48 && tp.w >= 700, `768: Accept and sign spans the bar (${Math.round(tp.w)}×${Math.round(tp.h)})`)
    await tap(t, tp.cx, tp.cy); await settle(t, 1100)
    const ts = t.getByRole('dialog', { name: 'Accept the agreement' })
    const tsb = await box(ts)
    ok(await ts.isVisible() && Math.abs(tsb.w - 400) < 4, `768: the signing sheet is a centred 400 dialog (${Math.round(tsb.w)} wide)`)
    await shot(t, '20-t768-sheet-accept')
    await t.keyboard.press('Escape'); await settle(t, 500)
    await go(t, `/sign/${AISHA}`)
    ok(await t.getByTestId('sign-hero').isVisible() && await t.getByTestId('sign-next').isVisible() && await t.locator('aside[aria-label="Sign this agreement"]').count() === 0, '768 upright: the phone model — the hero and the bar, no desk card (Q-01)')
    ok((await sideways(t)) <= 0, 'no sideways scroll at 768')
    await t.getByTestId('signing-record-row').tap(); await settle(t, 900)
    const trec = t.getByRole('dialog', { name: 'Signing record' })
    const trb = await box(trec)
    ok(await trec.isVisible() && Math.abs(trb.w - 400) < 4 && trb.bottom < 1000, `768: the sheet is a centred 400 dialog (${Math.round(trb.w)} wide)`)
    await shot(t, '16-t768-signed-record')
    await t.keyboard.press('Escape'); await settle(t, 400)
    await t.close(); await T.close()
    const L = await touchCtx(1024, 768); const l = await page(L, 'tablet-landscape')
    await go(l, `/sign/${AISHA}`)
    ok(await l.getByTestId('sign-hero').isVisible() && await l.getByTestId('sign-next').isVisible(), '1024 sideways: still the phone model (the desk’s 1,176px never fit)')
    const lq = await box(l.getByTestId('sign-quote-row')); await tap(l, lq.cx, lq.cy); await settle(l, 1800)
    const ll = l.getByTestId('sign-quote-layer')
    await ll.locator('[data-page]').first().waitFor({ state: 'visible', timeout: 15000 })
    const pw = await box(ll.locator('[data-page]').first())
    ok(pw.w >= 780 && pw.w <= 800 && await ll.getByTestId('sign-quote-total').isVisible() === false, `1024 sideways: the quote layer shows the paper at 1:1 (${Math.round(pw.w)} wide)`)
    await shot(l, '17-t1024-quote-layer')
    await l.close(); await L.close()

    // ── 5 · the desk at 1440: nothing moved ───────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · 1440: the desk’s card beside the paper, the flow as it was')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const dp = await page(D, 'desk')
    sql(`update contracts set status='Sent to Client', signed_at=null, signed_by=null, signed_body=null, document_hash=null, signature_kind=null, signature_data=null where id='probe-c3-sent'`)
    await go(dp, `/sign/${SENT}`)
    const card = dp.locator('aside[aria-label="Sign this agreement"]')
    ok(await card.isVisible() && (await box(card)).w === 360 && await dp.getByTestId('sign-hero').isVisible() === false && await dp.getByTestId('sign-next').isVisible() === false, 'the 360 card beside the paper; no hero, no bar')
    ok(await dp.getByRole('button', { name: 'Send code' }).isDisabled() && /view the quote/.test(await dp.getByTestId('view-quote').innerText()), 'Send code waits for the gates; the quote link as it was')
    await toEnd(dp)
    await dp.getByTestId('gate-accept').locator('label, [role="checkbox"], input').first().click({ force: true })
    await dp.getByTestId('gate-casetrust-tick').locator('label, [role="checkbox"], input').first().click({ force: true })
    await dp.getByRole('button', { name: 'Send code' }).click(); await settle(dp, 900)
    ok(await dp.getByLabel('One-time code').isVisible() && await dp.getByRole('button', { name: 'Verify' }).isVisible(), 'the desk’s code step: the One-time code field and Verify, unchanged')
    await dp.getByLabel('One-time code').fill('123456'); await dp.getByRole('button', { name: 'Verify' }).click(); await settle(dp, 500)
    await dp.getByTestId('sign-how').getByRole('radio', { name: 'Draw' }).click(); await settle(dp, 400)
    const dpad = dp.getByTestId('signature-pad')
    await drawSquare(dp, dpad, 80)
    const dd = await dpad.locator('path').getAttribute('d')
    ok(!!dd && Math.abs(pathRatio(dd) - 1) < 0.12, `the desk’s pad stores a square as a square too (${pathRatio(dd || '').toFixed(2)}) — the shared pad`)
    await go(dp, `/sign/${AISHA}`)
    ok(await dp.locator('[data-testid="signing-record"]').isVisible() && await dp.getByRole('button', { name: 'Download a copy' }).isVisible() && await dp.getByTestId('signed-card').count() === 0, 'the desk’s signed page keeps its record under the paper and Download a copy')
    await go(dp, `/sign/${EXPIRED}`)
    ok(await dp.getByTestId('link-notice-message').isVisible(), 'the desk’s dead link carries Message {studio} too (A-25: all widths)')
    /* the chat card */
    const png = await D.request.get(`${BASE}/card/sign/${SENT}`)
    ok(png.status() === 200 && /image\/png/.test(png.headers()['content-type'] || ''), 'the chat card answers a PNG')
    fs.writeFileSync(path.join(dir, 'card-sign-sent.png'), await png.body())
    const src = fs.readFileSync(path.join(REPO, 'lib/link-cards/card-image.tsx'), 'utf8')
    ok(/fontSize: 40,[^\n]*textTransform: 'uppercase'/.test(src) && /fontSize: 44, color: grey/.test(src), 'the card draws its eyebrow at 40 and its line at 44 of 1200 — they survive a chat’s 300px preview (C-26)')
    await dp.close(); await D.close()

    // ── 6 · the floor: 320 ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 320')
    sql(`update contracts set status='Sent to Client', signed_at=null, signed_by=null, signed_body=null, document_hash=null, signature_kind=null, signature_data=null, requires_scroll=0 where id='probe-c3-sent'`)
    const N = await touchCtx(320, 700); const n = await page(N, 'phone-320')
    await go(n, `/sign/${SENT}`)
    ok((await sideways(n)) <= 0, `no sideways scroll at 320 (${await sideways(n)})`)
    const np = await box(n.getByTestId('sign-bar-primary'))
    ok(np.w >= 280 && np.h >= 48, `the bar’s one button full width at 320 (${Math.round(np.w)}×${Math.round(np.h)})`)
    await shot(n, '18-m320-sign')
    await n.close(); await N.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
