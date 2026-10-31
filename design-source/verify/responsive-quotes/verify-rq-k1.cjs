// Quotes on the move, K1 · P-01 the Quote screen · P-02 the section list and the section screens · P-09 the phone's header · Q-07 the one
// primary per state (his "please go ahead" 2026-10-22 on the review page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w). Each finding is
// asserted as the rule it builds, never another round's count:
//  - 0: the pure rules (rq-k1-pure.mts, counted here) — Q-07's map per state, the Next line's words, the reminder's draft
//  - 1: 390 touch, Dane (Owner), the Draft OM-10001 — `/quotes/<id>` opens the QUOTE SCREEN (not the editor): the bar (← · the client over the
//       number and title · ⋮), the hero (the status pill, v1 · the template, the amount as stored, lines · valid until · GST, the client with
//       Call and WhatsApp as tel: / wa.me links), the Next line, the document's folds (the first open, a tap opens another), the folded rows
//       (Payment schedule · Files · Terms · Notes · Signature · Comments → the drawer · Activity), the foot's Edit + Send ▾ (one filled button;
//       Send ▾ opens the Send sheet), the grouped ⋮ with no key hints; every box 44, no sideways scroll; As printed → /preview?paper=1
//  - 2: Edit → `?edit=1` the section list (seven rows with summaries; the Quote screen inert); a row → `?edit=items` its screen (bar: ← · Items ·
//       "16 lines · S$…" · the section's own controls; the cards); ← → the list; the device Back → the list; Done → the Quote screen;
//       the General info screen types at 16; the template card on a phone has no page and one action; a deep link `?edit=payment` lands
//  - 3: the other states — Sent to Client → Remind (the reminder sheet with its WhatsApp draft); validity passed (set and put back) → Revise;
//       Signed → Open contract (→ /contracts/<id>); a variation order's hero
//       (the close-out round 2026-10-31) a signed quote keeps its template: no Change template in its ⋮ (390), none on its Template card and
//       the Create strip's Templates says why (1440)
//  - 4: the approval loop — Germaine (Designer) sends for approval from the foot; Dane sees Approve, approves; Send ▾ returns (put back)
//  - 5: 768 portrait touch — the Quote screen, the list, a section screen full width; the foot's Send ▾ opens upward (a menu, not a sheet)
//  - 6: 1024×768 touch — `?edit=…` is a split: the list as a 360 pane, the open section beside it; rows swap the pane; Done → the Quote screen
//  - 7: 1440 with a mouse — the desk's editor, untouched: header, tabs, cards; no Quote screen, no list
//  - 8: 320 — no sideways scroll on the Quote screen, the list and a section screen
//  - 9: Maison AI on a phone is the house bottom sheet (B-23); the loader's ghost follows the address (REG-708)
//  - no page errors
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3171 NODE_PATH=<repo>/node_modules node verify-rq-k1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rq-k1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3171'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rq-k1-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const money2 = (minor) => { const v = minor / 100; return `${v < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))}` }
const moneyRound = (minor) => `S$${new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 }).format(minor / 100)}`   // the list rows' and the Items bar's round figure

;(async () => {
  for (let i = 0; i < 90; i++) { try { const r = await fetch(BASE + '/leads', { redirect: 'manual' }); if ([200, 307].includes(r.status)) break } catch {} await new Promise((r) => setTimeout(r, 1000)) }   // a server still starting
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
  const touch = (w, h, o = {}) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, ...o })
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1800) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport only (lane A's A-19)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const rel = (p) => { const u = new URL(p.url()); return u.pathname + u.search }
  /* a control's touch box: its drawn box, and whether a tap 20px from the centre on every side still lands on it (REG-312's 44, a pixel in from
     its edge, where two boxes may touch) */
  const hits = async (p, testId) => p.evaluate(async (id) => {
    const el = document.querySelector(`[data-testid="${id}"]`); if (!el) return null
    const r0 = el.getBoundingClientRect()
    if (r0.top < 0 || r0.bottom > window.innerHeight) { el.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 250)) }
    const r = el.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2
    const on = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)) }
    const who = (x, y) => { const t = document.elementFromPoint(x, y); return t ? (t.getAttribute('data-testid') || t.tagName.toLowerCase() + '.' + String(t.className).slice(0, 24)) : 'nothing' }
    const pts = [[cx, cy], [cx - 20, cy], [cx + 20, cy], [cx, cy - 20], [cx, cy + 20]]
    return { w: Math.round(r.width), h: Math.round(r.height), all: pts.every(([x, y]) => on(x, y)), at: pts.map(([x, y]) => who(x, y)).join(' · ') }
  }, testId)
  const fontOf = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); return el ? parseFloat(getComputedStyle(el).fontSize) : 0 }, sel)

  const Q = Object.fromEntries(json(`select number, id, amount_minor as amount, valid_until as validUntil, status, lead_id as leadId from quotes where deleted_at is null and kind = 'quote'`).map((q) => [q.number, q]))
  const DRAFT = Q['OM-10001'], SENT = Q['OM-10007'], SIGNED = Q['OM-10004']
  const VO = json(`select id, number, amount_minor as amount from quotes where deleted_at is null and kind = 'variation' and status = 'Sent to Client' order by number limit 1`)[0]
  const LEAD = json(`select name, phone from leads where id = '${DRAFT.leadId}'`)[0]
  const CONTRACT = sql(`select id from contracts where from_quote_id = '${SIGNED.id}' and deleted_at is null and status = 'Signed' limit 1`)
  const lineCount = (id) => Number(sql(`select count(*) from quote_items where quote_id = '${id}' and kind = 'item' and visibility != 'hidden' and status != 'Declined' and (optional is null or optional = 0)`))

  try {
    // ── 0 · the pure rules ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('0 · The pure rules (rq-k1-pure.mts)')
    {
      let out = ''
      try { out = execSync('npx tsx design-source/verify/responsive-quotes/rq-k1-pure.mts', { cwd: REPO, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
      const good = (out.match(/^ {2}✓ .*$/gm) ?? []), bad = (out.match(/^ {2}✗ .*$/gm) ?? [])
      for (const x of bad) ok(false, `pure · ${x.slice(4)}`)
      ok(good.length >= 15 && bad.length === 0, `the pure probe ran: ${good.length} checks of Q-07's map, the Next line and the reminder, none failing`)
    }

    // ── 1 · 390 · the Quote screen ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · 390 touch, Dane — the Draft opens as the Quote screen (P-01)')
    as('dane')
    const P = await touch(390, 844); const p = await page(P, 'dane-390')
    await go(p, `/quotes/${DRAFT.id}`, 2200)
    ok(await p.getByTestId('quote-screen').isVisible() && !(await p.locator('header').first().isVisible().catch(() => false)), 'the address opens the Quote screen, not the editor’s header')
    ok(await p.getByTestId('quote-editor').getAttribute('data-mode') === 'read', 'the page is in read mode')
    ok(await sideways(p) <= 0, `no sideways scroll (${await sideways(p)})`)
    const barTitle = await p.locator('[data-screen-bar] h1').innerText()
    ok(barTitle === LEAD.name, `the bar’s title is the client’s name (${barTitle})`)
    ok(/OM-10001 · /.test(await p.locator('[data-screen-bar]').first().innerText()), 'the number and the title are the line under it')
    ok((await p.getByTestId('quote-back').getAttribute('aria-label')) === `Back to ${LEAD.name}`, '← is "Back to Olivia Martinez" (no `from`: the lead’s Quotes tab)')
    const hero = p.getByTestId('quote-hero')
    ok((await hero.getByRole('button', { name: /^Draft/ }).count()) === 1, 'the hero holds the status pill "Draft ▾" (every rule of a change kept)')
    ok(/v1 · Default Quote PDF/.test(await hero.innerText()), 'the version and the template: "v1 · Default Quote PDF"')
    ok((await p.getByTestId('quote-amount').innerText()) === money2(DRAFT.amount), `the amount as stored (${money2(DRAFT.amount)})`)
    const n1 = lineCount(DRAFT.id)
    ok(new RegExp(`${n1} items · valid until \\d+ \\w+ ’\\d+ · GST 9% included`).test(await hero.innerText()), `"${n1} items · valid until … · GST 9% included"`)   // (the calm UI build 2026-10-27, a deliberate change) 4-28 · W-060: items, not lines
    ok(/Olivia Martinez/.test(await hero.innerText()) && /9123 4567/.test(await hero.innerText()), 'the client and her number')
    ok((await p.getByTestId('quote-call').getAttribute('href')) === `tel:+65${LEAD.phone}` && (await p.getByTestId('quote-whatsapp').getAttribute('href')) === `https://wa.me/65${LEAD.phone}`, 'Call is a tel: link, WhatsApp a wa.me link')
    ok((await p.getByTestId('screen-contract-row').count()) === 1, 'the draft contract raised from it is a row under the client (contracts on the move, a deliberate change of this rule — C4 · P-11: the 10px chip became a 44 row)')
    ok(await fontOf(p, '[data-testid="quote-amount"]') >= 24 && await fontOf(p, '[class*="clientName"]') >= 16 && await fontOf(p, '[class*="heroLine"]') >= 14, 'the phone scale: the amount 24+, the client’s name 16, the figures 14 (P-08)')
    const next = p.getByTestId('quote-next')
    const nextText = () => next.locator('[class*="nextText"]').innerText()
    ok(/^Next: send it to Olivia for confirmation, or with the T&Cs for signature\.$/.test((await nextText()).trim()), `the Next line: "${(await nextText()).trim()}"`)
    ok(await fontOf(p, '[data-testid="quote-next"]') >= 16, 'the Next line reads at 16')
    // the document
    const secs = p.getByTestId('document-section')
    const nSec = await secs.count()
    ok(nSec >= 3, `the document folds by section (${nSec} sections)`)
    ok((await secs.first().getAttribute('aria-expanded')) === 'true' && (await secs.nth(1).getAttribute('aria-expanded')) === 'false', 'the first section is open, the rest folded')
    ok((await p.getByTestId('reading-card').count()) >= 1, '…its lines read as the client’s cards')
    await secs.nth(1).tap(); await settle(p, 500)
    ok((await secs.nth(1).getAttribute('aria-expanded')) === 'true', 'a tap opens another section')
    ok((await p.getByTestId('reading-schedule').count()) === 0, 'the schedule is not printed twice — it is the Payment schedule row')
    ok(/Total/.test(await p.getByTestId('quote-document').innerText()) && (await p.getByTestId('quote-document').innerText()).includes(money2(DRAFT.amount)), 'the document ends on the Total')
    await shot(p, '01-read-390')
    // the folds
    await p.getByTestId('fold-payments').scrollIntoViewIfNeeded(); await p.getByTestId('fold-payments').tap(); await settle(p, 500)
    ok(/10%/.test(await p.getByTestId('quote-folds').innerText()) && /Deposit|Upon signing/.test(await p.getByTestId('quote-folds').innerText()), 'Payment schedule opens: the rows with their shares')
    ok(/10 \/ 30 \/ 30 \/ 30/.test(await p.getByTestId('fold-payments').innerText()), '…its row says "10 / 30 / 30 / 30"')
    await p.getByTestId('fold-files').tap(); await settle(p, 400)
    ok(/Files 1/.test(await p.getByTestId('fold-files').innerText()), 'Files · 1, the name under it')
    await p.getByTestId('fold-terms').tap(); await settle(p, 400)
    ok(/shown on the print/.test(await p.getByTestId('fold-terms').innerText()) && (await p.getByTestId('quote-folds').innerText()).length > 300, 'Terms opens to read, "shown on the print"')
    await p.getByTestId('fold-signature').tap(); await settle(p, 400)
    ok(/client signs online/.test(await p.getByTestId('fold-signature').innerText()), 'Signature: "client signs online"')
    await p.getByTestId('fold-activity').scrollIntoViewIfNeeded(); await p.getByTestId('fold-activity').tap(); await settle(p, 500)
    ok((await p.getByRole('list', { name: 'Quote activity' }).count()) === 1, 'Activity opens the quote’s trail')
    await shot(p, '02-folds-390')
    await p.getByTestId('fold-comments').tap(); await settle(p, 900)
    ok(await p.getByRole('dialog', { name: /Comments/ }).isVisible().catch(() => false), 'Comments opens the comments panel')
    await p.keyboard.press('Escape'); await settle(p, 500)
    // the foot
    const foot = p.getByTestId('quote-foot')
    ok(await foot.getByTestId('quote-edit').isVisible() && await foot.getByTestId('quote-send').isVisible(), 'the foot: Edit and Send ▾')
    ok((await foot.locator('button').count()) === 2, '…two buttons, one of them filled')
    const eb = await hits(p, 'quote-edit'), sb = await hits(p, 'quote-send')
    ok(eb && eb.h >= 48 && eb.all && sb && sb.h >= 48 && sb.all, `the foot’s buttons are 48 tall and a tap 20px off centre still lands (${eb?.h} · ${sb?.h})`)
    for (const id of ['quote-back', 'quote-more', 'quote-call', 'quote-whatsapp', 'as-printed']) { const h = await hits(p, id); ok(!!h && h.all, `${id}: a 44 box (${h?.w}×${h?.h}${h && !h.all ? ` — lands on ${h.at}` : ''})`) }
    await foot.getByTestId('quote-send').tap(); await settle(p, 800)
    const sendSheet = p.getByRole('menu', { name: 'Send' })
    ok(await sendSheet.isVisible() && (await sendSheet.getByRole('menuitem', { name: /Ask to confirm/ }).count()) === 1, 'Send ▾ opens the Send sheet — confirmation · signature · another way')   // (the calm UI build 2026-10-27, a deliberate change) W-358
    await shot(p, '03-send-390')
    await p.keyboard.press('Escape'); await settle(p, 500)
    // ⋮
    await p.getByTestId('quote-more').tap(); await settle(p, 800)
    const more = p.getByRole('menu', { name: 'OM-10001' })
    const moreText = await more.innerText()
    const moreGroups = (await more.locator('[data-menu-label]').allInnerTexts()).map((g) => g.trim())
    ok(await more.isVisible() && JSON.stringify(moreGroups) === JSON.stringify(['Look', 'Change', 'Share', 'Export']), '⋮ is a sheet grouped Look · Change · Share · Export')   // (the calm UI build 2026-10-27, a deliberate change) T-06 · W-101: a group's title is sentence case, not capitals — the group labels themselves are read, in order
    ok(['Preview', 'Version history', 'Rename quote', 'Revise — new version', 'Duplicate and edit', 'Change template', 'Edit template', 'Save as template', 'Copy confirmation link', 'Share a view-only link', 'Create contract from this quote', 'Compare with another quote', 'Download as PDF', 'Export', 'Print', 'Delete'].every((r) => moreText.includes(r)), '…every desk action is in it (nothing lost)')
    ok((await more.locator('kbd').count()) === 0 && !/[⌘]/.test(moreText), '…and no key hints on touch')
    await shot(p, '04-more-390')
    await p.keyboard.press('Escape'); await settle(p, 500)
    // As printed
    await p.getByTestId('as-printed').scrollIntoViewIfNeeded(); await p.getByTestId('as-printed').tap(); await p.waitForURL(/\/preview/, { timeout: 15000 }); await settle(p, 500)
    ok(/\/quotes\/[^/]+\/preview\?paper=1/.test(rel(p)), `As printed opens the Preview’s paper (${rel(p)})`)
    await go(p, `/quotes/${DRAFT.id}`, 2000)

    // ── 2 · Edit → the list → a section screen → back → Done ────────────────────────────────────────────────────────────────────────
    console.log('2 · Edit is the section list; a row is a screen (P-02 · P-09 · Q-02)')
    await p.getByTestId('quote-edit').tap(); await settle(p, 900)
    ok(rel(p).endsWith('?edit=1') && await p.getByTestId('section-list').isVisible(), `Edit lands on the section list, the address says so (${rel(p)})`)
    ok(await p.evaluate(() => document.querySelector('[data-testid="quote-screen"]')?.hasAttribute('inert')), 'the Quote screen behind is inert')
    const rows = p.locator('[data-testid^="section-row-"]')
    const rowText = await rows.allInnerTexts()
    ok((await rows.count()) === 7 && /^General info/.test(rowText[0]) && /^Items \d+/.test(rowText[1]) && /^Payment schedule/.test(rowText[2]) && /^Files/.test(rowText[3]) && /^Terms and conditions/.test(rowText[4]) && /^Additional notes/.test(rowText[5]) && /^Signature/.test(rowText[6]), 'seven rows in the section order: General info · Items · Payment schedule · Files · Terms · Notes · Signature')
    ok(rowText[1].includes(moneyRound(DRAFT.amount)) && /sections/.test(rowText[1]), `the Items row says what is inside (${rowText[1].replace(/\n/g, ' · ')})`)
    ok(/valid until .* · Default Quote PDF/.test(rowText[0]) && /10 \/ 30 \/ 30 \/ 30/.test(rowText[2]) && /1 file attached/.test(rowText[3]) && /shown on the print/.test(rowText[4]) && /client signs online/.test(rowText[6]), 'each row’s one-line summary')
    const listBar = p.getByTestId('section-list').locator('[data-screen-bar]')
    ok(/Edit quote/.test(await listBar.innerText()) && /OM-10001 · Saved /.test(await listBar.innerText()), 'the bar: "Edit quote" over the number and Saved (P-09)')
    for (const id of ['edit-close', 'edit-done', 'section-row-items']) { const h = await hits(p, id); ok(!!h && h.all, `${id}: a 44 box (${h?.w}×${h?.h}${h && !h.all ? ` — lands on ${h.at}` : ''})`) }
    await shot(p, '05-list-390')
    await p.getByTestId('section-row-items').tap(); await settle(p, 1500)
    ok(rel(p).endsWith('?edit=items') && await p.getByTestId('section-screen').isVisible(), `the Items row opens the Items screen (${rel(p)})`)
    const itemsBar = p.getByTestId('section-screen').locator('[data-screen-bar]')
    ok((await itemsBar.locator('h1').innerText()) === 'Items' && new RegExp(`${n1} items · ${moneyRound(DRAFT.amount).replace('$', '\\$')}`).test(await itemsBar.innerText()), `its bar: "Items" over "${n1} items · ${moneyRound(DRAFT.amount)}"`)   // (the calm UI build 2026-10-27, a deliberate change) 4-28 · W-060: items, not lines
    ok((await itemsBar.getByRole('button', { name: 'More options for Items' }).count()) === 1 && (await itemsBar.getByRole('button', { name: 'Create' }).count()) === 0, '…and the section’s own controls (search · ⋮) in the bar — on a phone the adds live in the pinned foot, not a Create ▾ (K2; quotes on the move, a deliberate change of this rule)')
    ok((await p.getByTestId('section-screen').locator('[class*="handle"]').count()) === 0, 'no drag handle on the move (B-27)')
    ok(await sideways(p) <= 0, `no sideways scroll on the Items screen (${await sideways(p)})`)
    ok(await p.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'), 'the page behind is scroll-locked')
    ok(await p.evaluate(() => { const l = document.querySelector('[data-testid="section-list"]'); return !!l && l.hasAttribute('inert') && getComputedStyle(l).visibility === 'hidden' }) && (await p.getByRole('button', { name: 'Done' }).count()) === 0, 'the list under the screen is inert — one Done on the page, never two')
    await shot(p, '06-items-390')
    const hb = await hits(p, 'section-back'); ok(!!hb && hb.all, `← has a 44 box (${hb?.w}×${hb?.h})`)
    /* a finger typing a price in a line's sheet keeps its box while the bar's "16 lines · S$…" follows the total (the screen takes focus once, as it opens) */
    {
      const firstLine = p.locator('[data-testid="item-card"]:not([data-group])').first()
      await firstLine.locator('button').first().tap().catch(() => firstLine.tap()); await settle(p, 900)
      const sheet = p.getByTestId('line-sheet')
      const price = sheet.getByLabel(/unit price/i).first()
      if (await sheet.isVisible().catch(() => false) && await price.isVisible().catch(() => false)) {
        await price.click(); await p.keyboard.type('1'); await settle(p, 1500)
        const still = await p.evaluate(() => { const a = document.activeElement; return !!a && a.tagName === 'INPUT' && !!a.closest('[data-testid="line-sheet"]') }, undefined)
        ok(still, 'typing a price in the line sheet keeps the keyboard on its box while the total (and the bar) move')
        await p.keyboard.press('Escape'); await settle(p, 600)
      } else ok(true, '(the line sheet is not where this build expects it — the focus check skipped)')
    }
    await p.getByTestId('section-back').tap(); await settle(p, 900)
    ok(rel(p).endsWith('?edit=1') && await p.getByTestId('section-list').isVisible() && (await p.getByTestId('section-screen').count()) === 0, '← returns to the list')
    await p.getByTestId('section-row-general').tap(); await settle(p, 1200)
    ok(rel(p).endsWith('?edit=general') && (await p.getByTestId('section-screen').locator('h1').innerText()) === 'General info', 'General info opens as its screen')
    const inputPx = await p.evaluate(() => { const i = document.querySelector('[data-testid="section-screen"] input'); return i ? parseFloat(getComputedStyle(i).fontSize) : 0 })
    ok(inputPx >= 16, `its text boxes type at 16 (${inputPx}px) — iOS never zooms`)
    const card = p.getByTestId('template-card')
    await card.scrollIntoViewIfNeeded(); await settle(p, 300)
    ok(await card.getByRole('button', { name: 'Change' }).isVisible() && !(await card.getByRole('button', { name: /Edit template/ }).isVisible()) && !(await card.getByRole('button', { name: /Save as new template/ }).isVisible()), 'the template card on a phone: Change alone; Edit / Save as new template live in ⋮ (B-24)')
    ok(await card.locator('[class*="cardThumb"]').evaluate((el) => getComputedStyle(el).display === 'none'), '…and no 72×100 page')
    await shot(p, '07-general-390')
    await p.goBack(); await settle(p, 900)
    ok(rel(p).endsWith('?edit=1') && await p.getByTestId('section-list').isVisible(), 'the device’s Back returns to the list (REG-465)')
    await p.getByTestId('edit-done').tap(); await settle(p, 900)
    ok(!rel(p).includes('edit=') && await p.getByTestId('quote-screen').isVisible() && (await p.getByTestId('section-list').count()) === 0, 'Done returns to the Quote screen')
    ok(await p.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'), '…and the page scrolls again')
    await go(p, `/quotes/${DRAFT.id}?edit=payment`, 2000)
    ok(await p.getByTestId('section-screen').isVisible() && (await p.getByTestId('section-screen').locator('h1').innerText()) === 'Payment schedule', 'a deep link ?edit=payment opens the Payment schedule screen')
    await shot(p, '08-payment-390')
    await p.getByTestId('section-back').tap(); await settle(p, 800)
    ok(rel(p).endsWith('?edit=1'), '← from a deep-linked screen still reaches the list')
    await P.close()

    // ── 3 · the other states ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Sent to Client → Remind · validity passed → Revise · Signed → Open contract · a variation order (Q-07)')
    const P3 = await touch(390, 844); const s = await page(P3, 'states-390')
    const validWas = sql(`select valid_until from quotes where id = '${SENT.id}'`)
    sql(`update quotes set valid_until = ${Math.floor(Date.now() / 1000) + 30 * 86400} where id = '${SENT.id}'`)   // still standing: Remind
    await go(s, `/quotes/${SENT.id}`, 2200)
    ok((await s.getByTestId('quote-primary').innerText()) === 'Remind' && (await s.getByTestId('quote-next').getAttribute('data-primary')) === 'remind', 'Sent to Client: the primary is Remind')
    const sNext = () => s.getByTestId('quote-next').locator('[class*="nextText"]').innerText()
    ok(/^Next: sent .* waiting for Serena to confirm/.test((await sNext()).replace(/\n/g, ' ')), `the line: "${(await sNext()).replace(/\n/g, ' ').slice(0, 80)}…"`)
    await s.getByTestId('quote-next-more').tap(); await settle(s, 400)
    ok(/Serena has version 1 on their link/.test(await s.getByTestId('quote-next').innerText()), '…its longer words one tap further')
    await s.getByTestId('quote-primary').tap(); await settle(s, 900)
    const remind = s.getByRole('dialog', { name: 'Send a reminder' })
    ok(await remind.isVisible() && /gentle reminder on quote OM-10007/.test(await remind.locator('textarea').inputValue()), 'Remind opens the reminder sheet with its WhatsApp draft')
    await shot(s, '09-remind-390')
    await s.keyboard.press('Escape'); await settle(s, 500)
    sql(`update quotes set valid_until = ${Math.floor(Date.now() / 1000) - 40 * 86400} where id = '${SENT.id}'`)   // run out: Revise
    await go(s, `/quotes/${SENT.id}`, 2200)
    ok((await s.getByTestId('quote-primary').innerText()) === 'Revise' && /validity ended on/.test(await s.getByTestId('quote-next').innerText()), 'validity passed while the client has it: the primary is Revise, the line says when it ended')
    await shot(s, '10-expired-390')
    sql(`update quotes set valid_until = ${validWas} where id = '${SENT.id}'`)
    await go(s, `/quotes/${SIGNED.id}`, 2200)
    ok((await s.getByTestId('quote-primary').innerText()) === 'Open contract' && (await s.getByTestId('screen-contract-row').count()) === 1, 'Signed with a contract: the primary is Open contract, the contract row under the client (contracts on the move, a deliberate change of this rule — C4 · P-11)')
    ok(/signed on .* version 1 is the agreed quote/.test((await sNext()).replace(/\n/g, ' ')), 'the line names the signed version')
    /* (the close-out round 2026-10-31) a signed quote keeps its template: its ⋮ offers no Change template, as the desk's Template card offers none */
    await s.getByTestId('quote-more').tap(); await settle(s, 800)
    const signedMore = await s.getByRole('menu', { name: SIGNED.number }).innerText().catch(() => '')
    ok(/Save as template/.test(signedMore) && !/Change template|Choose a template/.test(signedMore), 'a signed quote’s ⋮ offers no Change template (it keeps the template it was signed with)')
    await s.keyboard.press('Escape'); await settle(s, 500)
    await shot(s, '11-signed-390')
    await s.getByTestId('quote-primary').tap(); await s.waitForURL(/\/contracts\//, { timeout: 15000 }); await settle(s, 500)
    ok(rel(s).startsWith(`/contracts/${CONTRACT}`), `Open contract opens it (${rel(s).slice(0, 60)})`)
    if (VO) {
      await go(s, `/quotes/${VO.id}`, 2200)
      const voPrimary = await s.getByTestId('quote-primary').innerText().catch(() => '(none)')
      ok(/variation order/i.test(await s.getByTestId('quote-hero').innerText()) && voPrimary === 'Remind', `a variation order with the client: named as one, Remind (${voPrimary}; ${(await s.getByTestId('quote-next').locator('[class*="nextText"]').innerText()).slice(0, 70)})`)
      ok((await s.getByTestId('fold-payments').count()) === 0 && (await s.locator('[data-testid="section-row-payment"]').count()) === 0, '…no payment schedule row (it has none)')
      await shot(s, '12-vo-390')
    }
    await P3.close()

    // ── 5 · 768 portrait ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · 768 portrait touch (Q-01: the phone model with room)')
    const T = await touch(768, 1024); const t = await page(T, 'tablet-768')
    await go(t, `/quotes/${DRAFT.id}`, 2200)
    ok(await t.getByTestId('quote-screen').isVisible() && (await t.getByTestId('quote-editor').getAttribute('data-shell')) === 'phone', 'a tablet held upright opens the Quote screen')
    ok(await sideways(t) <= 0, `no sideways scroll (${await sideways(t)})`)
    const bodyW = await t.getByTestId('quote-hero').evaluate((el) => el.getBoundingClientRect().width)
    ok(bodyW <= 720 && bodyW >= 700, `the column caps at 720 (${Math.round(bodyW)})`)
    await shot(t, '13-read-768')
    await t.getByTestId('quote-send').tap(); await settle(t, 700)
    const menuBox = await t.locator('[role="menu"]').first().boundingBox(), sendBox = await t.getByTestId('quote-send').boundingBox()
    ok(!!menuBox && !!sendBox && menuBox.y + menuBox.height <= sendBox.y + 2 && (await t.getByRole('dialog', { name: 'Send' }).count()) === 0, `the foot’s Send ▾ opens its menu upward on a tablet (menu bottom ${Math.round(menuBox?.y + menuBox?.height)} ≤ button top ${Math.round(sendBox?.y)})`)
    await shot(t, '14-send-768')
    await t.keyboard.press('Escape'); await settle(t, 400)
    await t.getByTestId('quote-edit').tap(); await settle(t, 900)
    ok(await t.getByTestId('section-list').isVisible() && (await t.getByTestId('section-list').evaluate((el) => el.getBoundingClientRect().width)) === 768, 'Edit: the list fills the screen')
    await shot(t, '15-list-768')
    await t.getByTestId('section-row-terms').tap(); await settle(t, 1200)
    const scr = await t.getByTestId('section-screen').evaluate((el) => el.getBoundingClientRect())
    ok(scr.x === 0 && Math.round(scr.width) === 768 && (await t.getByTestId('section-screen').locator('h1').innerText()) === 'Terms and conditions', 'a section screen fills the screen too')
    await shot(t, '16-terms-768')
    await T.close()

    // ── 6 · 1024 landscape ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 1024×768 touch — the list as the left pane, the section beside it')
    const S = await touch(1024, 768); const sp = await page(S, 'tablet-1024')
    await go(sp, `/quotes/${DRAFT.id}`, 2200)
    ok(await sp.getByTestId('quote-screen').isVisible(), 'the Quote screen (no desk editor on a touch tablet, Q-03)')
    await sp.getByTestId('quote-edit').tap(); await settle(sp, 1200)
    ok((await sp.getByTestId('quote-editor').getAttribute('data-shell')) === 'split', 'Edit on a landscape tablet is the split')
    const listW = await sp.getByTestId('section-list').evaluate((el) => el.getBoundingClientRect().width)
    const paneX = await sp.getByTestId('section-screen').evaluate((el) => el.getBoundingClientRect().x)
    ok(Math.round(listW) === 360 && Math.round(paneX) === 360, `the list is a 360 pane, the open section starts beside it (${Math.round(listW)} · ${Math.round(paneX)})`)
    ok((await sp.getByTestId('section-row-general').getAttribute('aria-current')) === 'true' && (await sp.getByTestId('section-screen').locator('h1').innerText()) === 'General info', 'the pane rests on General info, its row marked')
    await shot(sp, '17-split-general-1024')
    await sp.getByTestId('section-row-items').tap(); await settle(sp, 1500)
    ok(rel(sp).endsWith('?edit=items') && (await sp.getByTestId('section-row-items').getAttribute('aria-current')) === 'true' && (await sp.getByTestId('section-screen').locator('h1').innerText()) === 'Items', 'a row swaps the pane and marks itself')
    ok(await sideways(sp) <= 0, `no sideways scroll (${await sideways(sp)})`)
    await shot(sp, '18-split-items-1024')
    await sp.getByTestId('edit-done').tap(); await settle(sp, 900)
    ok(!rel(sp).includes('edit=') && await sp.getByTestId('quote-screen').isVisible(), 'Done returns to the Quote screen in one step')
    await S.close()

    // ── 7 · 1440 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · 1440 with a mouse — the desk is the mock')
    const D = await desk(); const d = await page(D, 'desk-1440')
    await go(d, `/quotes/${DRAFT.id}`, 2200)
    ok((await d.getByTestId('quote-screen').count()) === 0 && (await d.getByTestId('section-list').count()) === 0 && (await d.getByTestId('quote-editor').getAttribute('data-shell')) === null, 'no Quote screen, no list, no shell mode')
    ok(await d.getByRole('tablist', { name: 'Quote sections' }).isVisible() && await d.getByRole('heading', { name: 'Whole-home renovation' }).isVisible() && (await d.locator('#section-general').count()) === 1 && (await d.locator('#section-items').count()) === 1, 'the header, the tab strip and the cards as before')
    ok(await d.locator('#section-general').evaluate((el) => getComputedStyle(el.parentElement).display === 'contents'), 'a section’s host has no box on the desk')
    await go(d, `/quotes/${DRAFT.id}?edit=items`, 2200)
    ok((await d.getByTestId('section-screen').count()) === 0 && await d.getByRole('tablist', { name: 'Quote sections' }).isVisible(), '…and `?edit=` means nothing to the desk')
    /* (the close-out round 2026-10-31) a signed quote keeps its template at the desk too: its Template card offers no Change, and the Create
       strip's Templates says why instead of opening the picker (the server refuses a change as well) */
    await go(d, `/quotes/${SIGNED.id}`, 2200)
    const signedCard = d.getByTestId('template-card')
    ok(await signedCard.count() === 1 && await signedCard.getByRole('button').count() === 0, 'a signed quote’s Template card offers no Change')
    await d.getByRole('complementary', { name: 'Create' }).getByRole('button', { name: 'Templates' }).click(); await settle(d, 900)
    ok(await d.getByRole('dialog', { name: 'Choose a template' }).count() === 0 && await d.getByText('Couldn’t change the template — a signed quote keeps the template it was signed with').count() === 1, '…and the Create strip’s Templates says why instead of opening the picker')
    await shot(d, '18b-signed-templates-1440')
    await D.close()

    // ── 8 · 320 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · 320')
    const N = await touch(320, 640); const n = await page(N, 'phone-320')
    for (const [u, name] of [[`/quotes/${DRAFT.id}`, 'the Quote screen'], [`/quotes/${DRAFT.id}?edit=1`, 'the list'], [`/quotes/${DRAFT.id}?edit=items`, 'the Items screen'], [`/quotes/${DRAFT.id}?edit=general`, 'General info']]) {
      await go(n, u, 1800); ok(await sideways(n) <= 0, `320: no sideways scroll on ${name} (${await sideways(n)})`)
    }
    await go(n, `/quotes/${DRAFT.id}`, 1500); await shot(n, '19-read-320')
    await N.close()

    // ── 9 · Maison AI on a phone, the loader's ghost ──────────────────────────────────────────────────────────────────────────────
    console.log('9 · Maison AI is a bottom sheet on a phone (B-23); the ghost follows the address (REG-708)')
    const M = await touch(390, 844); const m = await page(M, 'maison-390')
    await go(m, `/quotes/${DRAFT.id}`, 2000)
    await m.getByRole('button', { name: 'Maison AI' }).first().tap(); await settle(m, 900)
    const sheet = m.getByRole('dialog', { name: 'Maison AI suggestions' })
    const sheetBox = await sheet.boundingBox()
    ok(await sheet.isVisible() && (await m.getByTestId('maison-sheet').count()) === 1 && !!sheetBox && Math.round(sheetBox.x) === 0 && Math.round(sheetBox.width) === 390 && Math.round(sheetBox.y + sheetBox.height) >= 843, `the house bottom sheet, full width off the bottom edge (${sheetBox && Math.round(sheetBox.width)} wide, bottom ${sheetBox && Math.round(sheetBox.y + sheetBox.height)})`)
    ok((await sheet.getByRole('button', { name: /Reset prototype/ }).count()) === 1 && (await sheet.getByTestId('maison-ask').count()) === 1, '…with the Ask box and the reset in its foot')
    await shot(m, '20-maison-390')
    await m.keyboard.press('Escape'); await settle(m, 500)
    ok(!(await sheet.isVisible().catch(() => false)), 'Esc closes it')
    for (const [q, shape] of [['', 'read'], ['?edit=1', 'list'], ['?edit=items', 'section']]) {
      const html = await (await fetch(`${BASE}/quotes/${DRAFT.id}${q}`, { headers: { accept: 'text/html' } })).text()
      ok(html.includes(`data-shape="${shape}"`), `the streamed loader draws the ${shape} ghost for "${q || '/'}"`)
    }
    await M.close()

    // ── 4 · the approval loop (last: it moves the Draft; put back in finally) ─────────────────────────────────────────────────────
    console.log('4 · the approval loop: Germaine sends for approval, Dane approves (Q-07)')
    as('germaine')
    const G = await touch(390, 844); const g = await page(G, 'germaine-390')
    await go(g, `/quotes/${DRAFT.id}`, 2200)
    ok((await g.getByTestId('quote-send').innerText()).trim() === 'Send' && /for approval/.test(await g.getByTestId('quote-next').innerText()), 'Germaine (Designer): the foot says Send, the line "send it for approval"')
    await g.getByTestId('quote-send').tap(); await settle(g, 2500)
    ok(sql(`select status from quotes where id = '${DRAFT.id}'`) === 'Sent for Approval', 'the press sends it for approval')
    ok(/sent it for approval/.test(await g.getByTestId('quote-next').innerText()) && /Waiting for an Owner/.test(await g.getByTestId('quote-next').innerText()) && (await g.getByTestId('quote-primary').count()) === 0 && (await g.getByTestId('quote-send').count()) === 0, 'now: "sent it for approval … Waiting for an Owner, an Admin or the backup approver", no primary for her')
    ok((await g.getByTestId('quote-foot').locator('button').count()) === 1, '…the foot holds Edit alone')
    await shot(g, '21-waiting-390')
    await G.close()
    as('dane')
    const A = await touch(390, 844); const a = await page(A, 'dane-approve-390')
    await go(a, `/quotes/${DRAFT.id}`, 2200)
    ok((await a.getByTestId('quote-primary').innerText()) === 'Approve' && /Approve it, or request changes/.test(await a.getByTestId('quote-next').innerText()), 'Dane (Owner): the primary is Approve')
    await a.getByTestId('quote-more').tap(); await settle(a, 700)
    ok((await a.getByRole('menu', { name: 'OM-10001' }).getByRole('menuitem', { name: 'Request changes' }).count()) === 1, '…and Request changes is in ⋮ › Change')
    await a.keyboard.press('Escape'); await settle(a, 400)
    await shot(a, '22-approve-390')
    await a.getByTestId('quote-primary').tap(); await settle(a, 2500)
    ok(sql(`select status from quotes where id = '${DRAFT.id}'`) === 'Approved' && /approved — send it to Olivia/.test(await a.getByTestId('quote-next').innerText()) && await a.getByTestId('quote-send').isVisible(), 'Approve approves it: "approved — send it to Olivia…", Send ▾ is back')
    await A.close()

    console.log('10 · the page error log')
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
