// Quotes on the move · K4 — the lists, Create Quote and the client's pages on a phone and a touch tablet (his "I have marked it please go ahead",
// 2026-10-22, on the review page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w: P-06 · P-10 · P-11 · P-12, the fixes A-04 · A-09 · A-12 ·
// A-13 · A-21 · A-23, Q-04 the status changes only on the quote). Every line asserts a rule the build keeps, never one round's counts:
//  - 0: the pure rules (rq-k4-pure.mts): the chip's tones, the "since" words, Remind's rule, the tablet default set
//  - 1: 390 · the card (P-06): the client leads at 16, the amount 20 on the first line, the number · title line, a READ-ONLY chip + its since
//    at 14, the chevron; no checkbox; the whole card opens; a hold selects and the bulk bar comes up; the ⋮'s seven rows; Change status opens the
//    status sheet (Q-04); Remind opens WhatsApp on the press; the FAB covers no amount (A-06); the chips keep their words; a typed search stays
//    on the screen (A-09); Filters is one sheet of chips that applies live (A-21); 320 too
//  - 2: 390 · the lead's tab: the title leads, the number alone under it
//  - 3: 768 portrait and 1024 landscape touch (P-11): the tablet set Title · Client · Status · Total · Due, the ⋮ frozen at the right, View dropped,
//    Open leads the row's menu, the amount on the first screen, the chips' words, Column settings remembered per breakpoint, the lead's Quotes
//    tab without the quick-links strip at 768 portrait (A-18) — and with it on the Overview
//  - 4: 390 · Create Quote (P-10): "Who is this quote for?" first (recent leads first, a search), then the four 56px rows; Change opens the
//    picker whose list row stacks name over meta (A-12); Upload opens the file chooser at once; the lead's tab skips the first step; Blank quote
//    makes the quote and opens it
//  - 5: 1024 landscape · Create Quote (A-13): four tiles on one row, More ways to start on the first screen
//  - 6: the client's confirmation page (P-12): 390 and 768 portrait read first — the total card (amount · lines · valid until · View as printed),
//    the cards, the sticky bar (Ask for a change · Confirm quote, 48) at every scroll; Confirm opens the short sheet with the name at 16;
//    "As printed" opens the viewer fitted to the width; 1024 landscape keeps the paper beside the card with 48 buttons (A-16); the view-only
//    link's total card and bar; the dead link's "Message {studio}" opens WhatsApp (A-23)
//  - 7: 1440 unchanged: the desk's row (View + ⋮ on hover, the status button), no card pieces, no total card or bar
//  - 8: the page error log stays empty
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes (a blank quote, the client's Viewed stamp) is put
// back in `finally`.
// Usage: BASE=http://localhost:3174 NODE_PATH=<repo>/node_modules node verify-rq-k4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rq-k4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3174'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rq-k4-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the credits' month roll on the first page), so the snapshot is what the app keeps */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
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
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const touchCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only: a full-page capture drops (hover: none) mid-shot (lane A's A-19)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom } })
  const fontPx = (loc) => loc.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  /* what a finger lands on at a box's centre — the control itself, or something inside it */
  const hits = (p, loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!at && (at === el || el.contains(at)) })
  /* WhatsApp opens on the press (REG-534): the window is stubbed and its address kept */
  const stubOpen = (ctx) => ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
  const opened = (p) => p.evaluate(() => window.__opened || [])
  /* a hold: the pointer down, still, past the 500 ms the card waits for, then up */
  const hold = async (p, loc) => {
    const r = await rect(loc)
    await loc.evaluate((el, [x, y]) => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' })) }, [r.x + 24, r.y + 40])
    await p.waitForTimeout(700)
    await loc.evaluate((el, [x, y]) => { el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' })) }, [r.x + 24, r.y + 40])
    await p.waitForTimeout(400)
  }

  const QUOTES = json(`select q.id, q.number, q.title, q.status, q.visibility, q.lead_id as leadId, l.name as lead, l.phone, q.client_sent_at as clientSentAt, q.sent_at as sentAt, q.valid_until as validUntil from quotes q join leads l on l.id = q.lead_id where q.kind = 'quote' and q.deleted_at is null and q.archived_at is null and l.deleted_at is null order by q.created_at desc`)
  const WAITING = QUOTES.find((q) => (q.status === 'Sent to Client' || q.status === 'Approved') && (q.clientSentAt || q.status === 'Sent to Client')) || null   // out with the client — Remind's quote
  const LEAD = (WAITING || QUOTES[0]).leadId
  const SENT = QUOTES.find((q) => q.status === 'Sent to Client') || null
  const CONFIRM = SENT ? sql(`select coalesce(confirm_token, id) from quotes where id = '${SENT.id}'`) : null
  const DEFAULT_TPL = sql(`select name from quote_templates where is_default = 1 and deleted_at is null and status = 'published' limit 1`)

  try {
    // ── 0 · the pure rules ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('0 · The pure rules (rq-k4-pure.mts)')
    {
      let out = ''
      try { out = execSync('npx tsx design-source/verify/responsive-quotes/rq-k4-pure.mts', { cwd: REPO, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
      const good = (out.match(/^ {2}✓ .*$/gm) ?? []), bad = (out.match(/^ {2}✗ .*$/gm) ?? [])
      for (const x of bad) ok(false, `pure · ${x.slice(4)}`)
      ok(good.length >= 20 && bad.length === 0, `the pure probe ran: ${good.length} rules of the chip, the since, Remind and the tablet set, none failing`)
    }

    // ── 1 · 390 · the card ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · 390 touch · Tools › Quotes as cards (P-06 · A-01 · A-05 … A-09 · A-20 · A-21)')
    as('dane')
    const P = await touchCtx(390, 844); await stubOpen(P); const p = await page(P, 'dane-390')
    await go(p, '/quotes', 1800)
    ok(await sideways(p) <= 0, `390: no sideways scroll (${await sideways(p)})`)
    const cards = p.locator('[data-kb-row]')
    const n = await cards.count()
    ok(n === QUOTES.length && n > 0, `every quote is a card (${n})`)
    const first = cards.first()
    const firstId = await first.getAttribute('data-kb-id')
    const firstQ = QUOTES.find((q) => q.id === firstId)
    const name = first.getByTestId('quote-card-name'), amount = first.locator('[data-col="total"]'), status = first.getByTestId('quote-card-status'), kebab = first.getByRole('button', { name: /^More actions for/ })
    ok(await name.innerText() === firstQ.lead, `the client's name leads the card (“${await name.innerText()}”)`)
    ok(await fontPx(name) === 16 && await fontPx(amount) === 20, `the name at 16, the amount at 20 (${await fontPx(name)} · ${await fontPx(amount)})`)
    { const rn = await rect(name), rk = await rect(kebab)
      const ra = await amount.evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { y: b.top, right: b.right } })   // the figure itself, not its cell
      ok(Math.abs(rn.y - ra.y) <= 6 && ra.right <= rk.x + 1, `the amount sits on the first line, right, clear of the ⋮ (name y ${Math.round(rn.y)} · amount y ${Math.round(ra.y)}, right ${Math.round(ra.right)} ≤ ⋮ ${Math.round(rk.x)})`) }
    ok(new RegExp(`^${firstQ.number}\\s*·\\s*${firstQ.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test((await first.locator('[class*="sub"]').first().innerText()).replace(/\s+/g, ' ')), `the second line reads number · title`)
    ok(await status.isVisible() && await status.locator('button').count() === 0, 'the status is a read-only chip, not a button (Q-04)')
    ok(await fontPx(status.locator('> span').first()) === 14 && (await first.getByTestId('quote-card-since').count() === 0 || await fontPx(first.getByTestId('quote-card-since')) === 14), 'the chip and its since read at 14')
    ok(await first.locator('input[type="checkbox"]').isVisible().catch(() => false) === false, 'no checkbox on the card (A-20)')
    { const r = await rect(kebab); ok(r.w >= 36 && r.h >= 36 && await hits(p, kebab), `the ⋮ lands under a finger (${Math.round(r.w)}×${Math.round(r.h)})`) }
    const privateCard = QUOTES.find((q) => q.visibility === 'Private')
    if (privateCard) ok(await p.locator(`[data-kb-row][data-kb-id="${privateCard.id}"] [data-testid="quote-card-status"] [data-icon]`).count() === 1, 'a private quote wears a lock on its chip')
    /* the FAB never covers an amount (A-06) */
    { const fab = p.getByRole('button', { name: /Maison AI/ }).first(); const fr = await rect(fab).catch(() => null)
      /* the figures themselves (a Range over each cell's words), at the top of the page and one card-height down, so a line that meets the button's band is tried */
      const figures = () => cards.locator('[data-col="total"]').evaluateAll((els) => els.map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] }))
      const clear = (list) => !fr || list.every(([l, t, r, bt]) => r <= fr.x || l >= fr.right || bt <= fr.y || t >= fr.bottom)
      const at0 = await figures()
      await p.evaluate(() => window.scrollTo(0, 60)); await settle(p, 600)
      const at60 = await figures()
      await p.evaluate(() => window.scrollTo(0, 0)); await settle(p, 400)
      ok(clear(at0) && clear(at60), `the Maison AI button covers no amount (A-06)${!clear(at0) || !clear(at60) ? ` — FAB ${JSON.stringify(fr)} vs ${JSON.stringify((clear(at0) ? at60 : at0).map((x) => x.map(Math.round)))}` : ''}`) }
    ok(/With client/.test(await p.getByTestId('quote-todos').innerText().catch(() => '')) || (await p.getByTestId('quote-todos').count()) === 0, 'the to-do chip keeps its words on a phone')   // (the calm UI build 2026-10-27, a deliberate change) W-428
    /* (K2's note) the toolbar's glyphs take the house IconButton's own centred 44 — no override displaces the box: the centre of each box lands on it */
    for (const label of ['Filters', 'More options', 'New quote']) { /* (the calm UI build 2026-10-27, a deliberate change) W-011 */ const btn = p.getByRole('button', { name: new RegExp(`^${label}`) }).first(); ok(await hits(p, btn), `the toolbar's ${label} lands under a finger at its own centre`) }
    await shot(p, '01-cards-390')
    /* the whole card opens */
    await first.locator('[class*="sub"]').first().tap(); await p.waitForURL(/\/quotes\/[^/?]+/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
    ok(new RegExp(`/quotes/${firstQ.id}`).test(p.url()), `a press on the card's words opens the quote (${p.url().replace(BASE, '')})`)
    await go(p, '/quotes', 1800)
    /* a hold selects; the bulk bar comes up; a press on another card selects it too; ✕ clears */
    await hold(p, cards.first())
    const bar = p.getByRole('toolbar', { name: /selected/ })
    ok(await bar.isVisible() && /^1$/.test((await bar.locator('span').first().innerText()).trim()) && await cards.first().getAttribute('data-selected') !== null, 'a hold selects the card and the bulk bar comes up with 1')
    ok(!/\/quotes\/[^/?]+/.test(p.url()), '…without opening the quote')
    await cards.nth(1).locator('[class*="sub"]').first().tap(); await settle(p, 500)
    ok(/^2$/.test((await bar.locator('span').first().innerText()).trim()), 'while picking, a press selects the next card (2)')
    await shot(p, '02-selected-390')
    await bar.getByRole('button', { name: 'Clear selection' }).tap(); await settle(p, 500)
    ok(await bar.count() === 0 && await cards.first().getAttribute('data-selected') === null, '✕ clears the selection')
    /* the ⋮ sheet: Open · Copy link · Remind · Preview · Change status · Archive · Delete */
    const wCard = WAITING ? p.locator(`[data-kb-row][data-kb-id="${WAITING.id}"]`) : cards.first()
    await wCard.getByRole('button', { name: /^More actions for/ }).tap(); await settle(p, 700)
    const sheet = p.getByRole('menu').last()
    const rows = (await sheet.getByRole('menuitem').allInnerTexts()).map((t) => t.split('\n')[0].trim())
    ok(rows[0] === 'Open' && rows.includes('Copy link') && rows.includes('Preview') && rows.includes('Change status') && rows.includes('Archive') && rows[rows.length - 1] === 'Delete' && !rows.includes('Download as PDF'), `the ⋮ sheet: ${rows.join(' · ')}`)
    ok(!WAITING || rows.includes('Remind'), 'Remind is offered on a quote the client holds')
    await shot(p, '03-row-menu-390')
    await sheet.getByRole('menuitem', { name: 'Change status' }).tap(); await settle(p, 700)
    const statusSheet = p.getByRole('menu', { name: 'Change status' })
    ok(await statusSheet.isVisible() && await statusSheet.getByRole('menuitem').count() >= 4, 'Change status opens the status sheet (the same menu, Q-04)')
    ok(/current/.test(await statusSheet.innerText()), '…with the current status marked')
    await shot(p, '04-status-sheet-390')
    await p.keyboard.press('Escape'); await settle(p, 500)
    if (WAITING) {
      await wCard.getByRole('button', { name: /^More actions for/ }).tap(); await settle(p, 600)
      await p.getByRole('menu').last().getByRole('menuitem', { name: 'Remind' }).tap(); await settle(p, 800)
      const urls = await opened(p)
      ok(urls.length === 1 && /wa\.me\/65\d{8}\?text=/.test(urls[0]) && decodeURIComponent(urls[0]).includes(WAITING.number), `Remind opens WhatsApp on the press with the quote's number (${(urls[0] || '').slice(0, 40)}…)`)
      ok(/Reminder drafted/.test(await p.locator('[role="status"], [class*="snackbar"]').allInnerTexts().then((t) => t.join(' '))), '…and the snackbar says so')
    }
    /* a typed search stays on the screen (A-09) */
    await p.getByRole('button', { name: 'Search quotes' }).tap(); await settle(p, 500)
    await p.locator('input[aria-label="Search quotes"]').fill('serena'); await settle(p, 700)
    { const more = p.getByRole('button', { name: 'More options' }); const r = await rect(more); ok(r.right <= 390 && await sideways(p) <= 0, `with text typed the ⋮ stays on the screen (right ${Math.round(r.right)})`) }
    await shot(p, '05-search-typed-390')
    await p.locator('input[aria-label="Search quotes"]').fill(''); await p.keyboard.press('Escape'); await settle(p, 500)
    /* Filters: one sheet of chips, applied live (A-21) */
    await p.getByRole('button', { name: /^Filters/ }).tap(); await settle(p, 800)
    const fs_ = p.getByTestId('quote-filters-sheet')
    ok(await fs_.isVisible() && await fs_.getByRole('radiogroup').count() >= 4 && await fs_.getByRole('group', { name: 'Status' }).count() === 1 && await fs_.getByRole('tab').count() === 0, 'Filters on a phone is one scrolling sheet of chip groups — no tabs')
    const drafts = QUOTES.filter((q) => q.status === 'Draft').length
    await fs_.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Draft' }).tap(); await settle(p, 800)
    ok(await cards.count() === drafts, `a chip narrows the list live (Draft → ${await cards.count()} of ${drafts})`)
    await shot(p, '06-filters-390')
    await p.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Clear All' }).tap(); await settle(p, 500)
    await p.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' }).tap(); await settle(p, 600)
    ok(await cards.count() === QUOTES.length, 'Clear All · Done brings every card back')
    await P.close()
    { const S = await touchCtx(320, 640); const s = await page(S, 'dane-320'); await go(s, '/quotes', 1600); ok(await sideways(s) <= 0 && await s.locator('[data-kb-row]').count() === QUOTES.length, `320: the cards, no sideways scroll (${await sideways(s)})`); await shot(s, '07-cards-320'); await S.close() }

    // ── 2 · 390 · the lead's tab ────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · 390 touch · the lead’s Quotes tab')
    { const L = await touchCtx(390, 844); const l = await page(L, 'lead-390')
      await go(l, `/leads/${LEAD}/quotes`, 1800)
      const c = l.locator('[data-kb-row]').first(); const q = QUOTES.find((x) => x.leadId === LEAD)
      ok(await c.getByTestId('quote-card-name').innerText() === q.title, 'on one lead’s tab the title leads the card')
      ok((await c.locator('[class*="sub"]').first().innerText()).trim() === q.number, 'and the number stands alone under it')
      ok(await sideways(l) <= 0, `no sideways scroll (${await sideways(l)})`)
      await shot(l, '08-lead-tab-390')
      await L.close() }

    // ── 3 · touch tablets ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · 768 portrait and 1024 landscape touch · the table (P-11 · A-02 · A-03 · A-04 · A-18)')
    for (const [w, h] of [[768, 1024], [1024, 768]]) {
      const T = await touchCtx(w, h); const t = await page(T, `tablet-${w}`)
      await t.addInitScript(() => { try { localStorage.removeItem('om.columns.studio-quotes'); localStorage.removeItem('om.columns.studio-quotes.tablet') } catch {} })
      await go(t, '/quotes', 1800)
      const heads = await t.locator('[role="columnheader"]').evaluateAll((hs) => hs.map((x) => x.getAttribute('data-col')))
      ok(heads.join(' ') === 'sel actions title client status total due', `${w}: the tablet set — Title · Client · Status · Total · Due, the ⋮ head frozen (${heads.join(' ')})`)
      const frame = t.locator('[data-cols="lead-quotes"]').locator('..')
      const fr = await rect(frame)
      const row = t.locator('[data-kb-row]').first()
      const total = await rect(row.locator('[data-col="total"]')), act = await rect(row.locator('[class*="actions"]').first()), head = await rect(t.getByTestId('quotes-actions-head'))
      ok(total.right <= act.x + 1 && total.x >= fr.x, `${w}: the amount stands on the first screen (${Math.round(total.x)}–${Math.round(total.right)} in a frame to ${Math.round(fr.right)})`)
      ok(Math.abs(act.right - fr.right) <= 2 && Math.abs(head.right - fr.right) <= 2 && act.w >= 44, `${w}: the ⋮ cell is frozen at the frame's right edge (${Math.round(act.right)} vs ${Math.round(fr.right)}, ${Math.round(act.w)} wide)`)
      ok(await row.getByRole('button', { name: 'View' }).isVisible().catch(() => false) === false, `${w}: View is dropped — the title opens`)
      /* no cell's painted content runs under the next column — a grid wider than its frame gives a max-content track no room to grow. Measured on the
         cell's child boxes (a box that clips its own words is as wide as it paints), never on the clipped text itself. */
      const overlaps = await t.locator('[data-kb-row]').evaluateAll((rows) => rows.flatMap((r) => { const cells = Array.from(r.querySelectorAll('[role="cell"]')).filter((c) => c.offsetParent !== null && c.getAttribute('data-col') !== 'sel'); return cells.flatMap((c, i) => { const nx = cells[i + 1]; if (!nx) return []; const right = Math.max(0, ...Array.from(c.children).map((el) => el.getBoundingClientRect().right)); const nr = nx.getBoundingClientRect(); return right > nr.left + 1 && nr.left > 0 ? [`${c.getAttribute('data-col')}→${nx.getAttribute('data-col')} by ${Math.round(right - nr.left)}`] : [] }) }))
      ok(overlaps.length === 0, `${w}: no cell runs under its neighbour${overlaps.length ? ` (${overlaps.slice(0, 3).join(', ')})` : ''}`)
      const kb = row.getByRole('button', { name: /^More actions for/ })
      ok(await hits(t, kb) && (await rect(kb)).w >= 36, `${w}: the ⋮ lands under a finger`)
      await kb.tap(); await settle(t, 600)
      const menu = t.getByRole('menu').last()
      ok((await menu.getByRole('menuitem').first().innerText()).trim() === 'Open', `${w}: Open leads the row's menu`)
      await t.keyboard.press('Escape'); await settle(t, 400)
      ok(/With client/.test(await t.getByTestId('quote-todos').innerText().catch(() => '')) || (await t.getByTestId('quote-todos').count()) === 0, `${w}: the to-do chip keeps its words (A-04)`)
      ok(await t.getByRole('button', { name: 'New quote' }).first().isVisible(), `${w}: Create Quote folds into its glyph so the chips keep their words`)   // (the calm UI build 2026-10-27, a deliberate change) 1-11: Tools › Quotes' New quote is the page header's
      ok(await sideways(t) <= 0, `${w}: no sideways page scroll (${await sideways(t)})`)
      await shot(t, `09-table-${w}`)
      /* Column settings: remembered per breakpoint */
      await t.getByRole('button', { name: 'Column settings' }).tap(); await settle(t, 700)
      const drawer = t.getByRole('dialog', { name: 'Column settings' })
      await drawer.getByRole('switch', { name: 'Show Creator column' }).locator('..').tap().catch(async () => { await drawer.getByLabel('Show Creator column').click({ force: true }) }); await settle(t, 700)
      const heads2 = await t.locator('[role="columnheader"]').evaluateAll((hs) => hs.map((x) => x.getAttribute('data-col')))
      ok(heads2.includes('creator'), `${w}: a column switched on in Column settings joins the table (${heads2.join(' ')})`)
      const keys = await t.evaluate(() => ({ desk: localStorage.getItem('om.columns.studio-quotes'), tablet: localStorage.getItem('om.columns.studio-quotes.tablet') }))
      ok(!!keys.tablet && !keys.desk, `${w}: …remembered under the tablet's own key, the desk's untouched`)
      await drawer.getByRole('button', { name: 'Reset to default' }).tap(); await settle(t, 500)
      await drawer.getByRole('button', { name: 'Done' }).tap(); await settle(t, 500)
      /* the lead's tab: no quick-links strip at 768 portrait (A-18); the Overview keeps it; landscape keeps it */
      await go(t, `/leads/${LEAD}/quotes`, 1800)
      const aside = t.locator('aside[aria-label="Create"]')
      if (w === 768) ok(await aside.isVisible() === false, '768 portrait: the lead’s Quotes tab hides the quick-links strip (A-18)')
      else ok(await aside.isVisible(), '1024 landscape: the strip stays beside the Quotes tab')
      const lf = await rect(t.locator('[data-cols="lead-quotes"]').locator('..'))
      ok(lf.w >= (w === 768 ? 620 : 800), `${w}: the tab's table has the room (${Math.round(lf.w)} wide)`)
      await shot(t, `10-lead-tab-${w}`)
      if (w === 768) { await go(t, `/leads/${LEAD}`, 1800); ok(await aside.isVisible(), '768 portrait: the Overview keeps the strip') }
      await T.close()
    }

    // ── 4 · 390 · Create Quote ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · 390 touch · Create Quote (P-10 · A-10 · A-11 · A-12)')
    { const C = await touchCtx(390, 844); const c = await page(C, 'create-390')
      await go(c, '/quotes', 1800)
      await c.getByRole('button', { name: 'New quote' }).first().tap(); await settle(c, 900)   // (the calm UI build 2026-10-27, a deliberate change)
      const m = c.getByTestId('create-quote')
      ok(await m.getAttribute('data-mode') === 'who' && /Who is this quote for\?/.test(await m.innerText()), 'studio-wide, the first step asks who the quote is for')
      const leads = m.getByTestId('create-quote-lead')
      ok(await leads.count() >= 2 && (await rect(leads.first())).h >= 56, `the leads are 56px rows (${await leads.count()})`)
      ok(/Recent/i.test(await m.innerText()), 'the leads with recent quote activity come first')
      const target = QUOTES[0].lead
      await m.locator('input[aria-label="Search leads"]').fill(target.split(' ')[0]); await settle(c, 500)
      ok((await leads.allInnerTexts()).every((x) => x.toLowerCase().includes(target.split(' ')[0].toLowerCase())), 'a search narrows the list')
      await shot(c, '11-create-who-390')
      await leads.filter({ hasText: target }).first().tap(); await settle(c, 700)
      ok(await m.getAttribute('data-mode') === 'rail' && new RegExp(`New quote for ${target}`).test(await m.innerText()), `a pick moves on, the head names them`)
      const rowsEl = m.getByTestId('create-quote-rows')
      ok(await rowsEl.isVisible() && await m.locator('[class*="well"]').count() === 0, 'the ways to start are rows, not thumbnails')
      for (const id of ['create-row-default', 'create-row-blank', 'upload-quote-row', 'draft-quote-row']) { const r = await rect(m.getByTestId(id)); ok(r.h >= 56 && r.right <= 390, `${id}: a 56px row on the screen (${Math.round(r.h)})`) }
      ok(DEFAULT_TPL ? (await m.getByTestId('create-row-default').innerText()).includes(DEFAULT_TPL) && /Starts with/.test(await m.getByTestId('create-row-default').innerText()) : true, `the default template's row names it in full with what it starts with (“${DEFAULT_TPL}”)`)
      ok(await fontPx(m.getByTestId('create-row-blank').locator('[class*="rowTitle"]')) === 16, 'the rows read at 16')
      await shot(c, '12-create-rows-390')
      /* Change → the picker, whose list row stacks name over meta (A-12) */
      await m.getByTestId('create-row-change').tap(); await settle(c, 900)
      ok(await m.getAttribute('data-mode') === 'all', 'Change opens the template picker')
      const listToggle = c.getByLabel('List view')
      await listToggle.tap({ force: true }); await settle(c, 600)
      const blankRow = c.getByRole('option', { name: 'Blank Quote' })
      const rn = await rect(blankRow.locator('[class*="rowName"]')), rm = await rect(blankRow.locator('[class*="rowMeta"]'))
      ok(rn.bottom <= rm.y + 1 && rm.right <= 390 && rn.h <= 24, `the picker's list row: the name over its meta, nothing painted over (name ${Math.round(rn.y)}–${Math.round(rn.bottom)}, meta from ${Math.round(rm.y)})`)
      await shot(c, '13-picker-list-390')
      await c.getByLabel('Grid view').tap({ force: true }); await settle(c, 400)
      await m.getByRole('button', { name: 'Back to the start' }).tap(); await settle(c, 600)
      ok(await m.getAttribute('data-mode') === 'rail', 'Back returns to the rows')
      /* Upload a quote opens the file chooser at once */
      const [chooser] = await Promise.all([c.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), m.getByTestId('upload-quote-row').tap()])
      ok(!!chooser, 'Upload a quote opens the file chooser at once')
      /* Back to who */
      await m.getByRole('button', { name: 'Back to who it is for' }).tap(); await settle(c, 600)
      ok(await m.getAttribute('data-mode') === 'who', 'the head’s Back returns to who it is for')
      await c.keyboard.press('Escape'); await settle(c, 500)
      /* the lead's tab skips the first step; Blank quote makes the quote */
      await go(c, `/leads/${LEAD}/quotes`, 1800)
      await c.getByRole('button', { name: 'New quote' }).first().tap(); await settle(c, 900)   // (the calm UI build 2026-10-27, a deliberate change)
      const m2 = c.getByTestId('create-quote')
      ok(await m2.getAttribute('data-mode') === 'rail' && await m2.getByTestId('create-quote-rows').isVisible(), 'on a lead’s tab the rows come first — the lead is known')
      const beforeN = Number(sql(`select count(*) from quotes where lead_id = '${LEAD}'`))
      await m2.getByTestId('create-row-blank').tap(); await c.waitForURL(/\/quotes\/[^/?]+/, { timeout: 15000 }).catch(() => {}); await settle(c, 1500)
      ok(Number(sql(`select count(*) from quotes where lead_id = '${LEAD}'`)) === beforeN + 1 && /\/quotes\/[^/?]+/.test(c.url()), 'Blank quote makes the quote and opens it')
      ok(await sideways(c) <= 0, `no sideways scroll on the sheet (${await sideways(c)})`)
      await C.close() }

    // ── 5 · 1024 landscape · Create Quote ───────────────────────────────────────────────────────────────────────────────
    console.log('5 · 1024 landscape touch · Create Quote (A-13)')
    { const L = await touchCtx(1024, 768); const l = await page(L, 'create-1024')
      await go(l, '/quotes', 1800)
      await l.getByRole('button', { name: 'New quote' }).first().tap(); await settle(l, 900)   // (the calm UI build 2026-10-27, a deliberate change)
      const tiles = l.getByTestId('create-quote').locator('[class*="tile"]')
      const tops = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      ok(tops.length >= 4 && new Set(tops.slice(0, 4)).size === 1, `four tiles stand on one row (${tops.join(', ')})`)
      const more = await rect(l.getByTestId('draft-quote-row'))
      ok(more.bottom <= 768, `More ways to start sits on the first screen (ends at ${Math.round(more.bottom)})`)
      await shot(l, '14-create-1024')
      await L.close() }

    // ── 6 · the client's pages ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · the client’s confirmation page and the view-only link (P-12 · A-14 … A-17 · A-23)')
    if (CONFIRM) {
      for (const [w, h] of [[390, 844], [768, 1024]]) {
        const K = await touchCtx(w, h); await stubOpen(K); const k = await page(K, `confirm-${w}`)
        await go(k, `/confirm/${CONFIRM}`, 2200)
        const totalCard = k.getByTestId('confirm-total-card'), cardsEl = k.getByTestId('reading-cards'), barEl = k.getByTestId('confirm-bar')
        ok(await totalCard.isVisible() && await cardsEl.isVisible() && await barEl.isVisible(), `${w}: the total card, the reading cards and the bar`)
        ok(await k.locator('aside[class*="card"]').isVisible().catch(() => false) === false, `${w}: the desk's card steps out`)
        const tc = await rect(totalCard), cc = await rect(cardsEl)
        ok(tc.bottom <= cc.y + 1, `${w}: the total card reads before the cards`)
        ok(/\d+ items/.test(await totalCard.innerText()) && /S\$[\d,]+\.\d\d/.test(await totalCard.innerText()), /* (the calm UI build 2026-10-27, a deliberate change) 4-28: items, not lines */ `${w}: the total card says the amount and the items (${(await totalCard.innerText()).replace(/\n/g, ' · ').slice(0, 70)})`)
        ok(await fontPx(totalCard.locator('strong')) >= 24, `${w}: the amount at ${await fontPx(totalCard.locator('strong'))}`)
        const confirmBtn = k.getByTestId('confirm-bar-primary'), askBtn = k.getByTestId('ask-change-bar'), viewBtn = k.getByTestId('view-as-printed')
        for (const [btn, label] of [[confirmBtn, 'Confirm quote'], [askBtn, 'Ask for a change'], [viewBtn, 'View as printed']]) { const r = await rect(btn); ok(r.h >= 48 && await hits(k, btn), `${w}: ${label} is ${Math.round(r.h)} tall under a finger`) }
        const b0 = await rect(barEl)
        ok(Math.abs(b0.bottom - h) <= 1, `${w}: the bar sits at the bottom at the top of the page (bottom ${Math.round(b0.bottom)})`)
        await k.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await settle(k, 500)
        const b1 = await rect(barEl)
        ok(Math.abs(b1.bottom - h) <= 1, `${w}: …and halfway down (bottom ${Math.round(b1.bottom)})`)
        await k.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await settle(k, 500)
        const b2 = await rect(barEl)
        ok(b2.bottom <= h + 1 && await confirmBtn.isVisible(), `${w}: …and at the end (bottom ${Math.round(b2.bottom)})`)
        ok(await sideways(k) <= 0, `${w}: no sideways scroll (${await sideways(k)})`)
        await shot(k, `15-confirm-end-${w}`)
        await k.evaluate(() => window.scrollTo(0, 0)); await settle(k, 400)
        await shot(k, `16-confirm-top-${w}`)
        /* Confirm → the short sheet */
        await confirmBtn.tap(); await settle(k, 800)
        const dlg = k.getByRole('dialog', { name: 'Confirm this quote' })
        const field = dlg.getByRole('textbox', { name: /Your full name/ })
        ok(await dlg.isVisible() && await field.isVisible() && /not a signature/.test(await dlg.innerText()), `${w}: Confirm opens the short sheet — the name and the fine print`)
        ok(await fontPx(field) >= 16, `${w}: the name types at ${await fontPx(field)}`)
        ok(await dlg.getByTestId('confirm-sheet-confirm').isEnabled(), `${w}: Confirm quote is live with the client's name`)
        await shot(k, `17-confirm-sheet-${w}`)
        await dlg.getByRole('button', { name: 'Cancel' }).tap(); await settle(k, 500)
        /* Ask → the Ask dialog, WhatsApp on the press */
        await askBtn.tap(); await settle(k, 700)
        const ask = k.getByRole('dialog', { name: 'Ask for a change' })
        ok(await ask.isVisible(), `${w}: Ask for a change opens its dialog from the bar`)
        await ask.getByRole('button', { name: 'Cancel' }).tap(); await settle(k, 400)
        /* As printed → the viewer */
        await viewBtn.tap(); await settle(k, 1800)
        const viewer = k.getByTestId('paper-viewer')
        ok(await viewer.isVisible() && await viewer.locator('[data-page="1"]').isVisible() && /As printed/.test(await viewer.innerText()), `${w}: View as printed opens the viewer with the A4`)
        const pg = await rect(viewer.locator('[data-page="1"]').first())
        ok(pg.w <= w - 24 && pg.w >= w * 0.8, `${w}: the page is fitted to the width (${Math.round(pg.w)} of ${w})`)
        { const back = viewer.getByTestId('paper-viewer-back'); const r = await rect(back); ok(r.w >= 44 && r.h >= 44 && await hits(k, back), `${w}: the viewer's back lands under a finger (${Math.round(r.w)}×${Math.round(r.h)})`) }
        await shot(k, `18-viewer-${w}`)
        await viewer.getByTestId('paper-viewer-back').tap(); await settle(k, 600)
        ok(await viewer.count() === 0 && await cardsEl.isVisible(), `${w}: back returns to the cards`)
        await K.close()
      }
      { const L = await touchCtx(1024, 768); const l = await page(L, 'confirm-1024')
        await go(l, `/confirm/${CONFIRM}`, 2200)
        ok(await l.locator('[data-page="1"]').first().isVisible() && await l.getByTestId('confirm-total-card').isVisible() === false, '1024 landscape: the paper, the desk’s card — no total card')
        const cb = l.getByRole('button', { name: 'Confirm quote' })
        ok((await rect(cb)).h >= 48 && await fontPx(l.getByRole('textbox', { name: /Your full name/ })) >= 16, `1024 landscape: Confirm is ${Math.round((await rect(cb)).h)} tall, the name types at 16 (A-16)`)
        await shot(l, '19-confirm-1024')
        await L.close() }
    } else ok(false, 'a Sent to Client quote with a confirmation link exists in the scratch DB')
    /* the view-only link: made for the probe, then put back */
    {
      const viewQ = SENT || QUOTES[0]
      const tok = 'rqk4viewtoken0000000001'
      sql(`update quotes set view_token = '${tok}', view_token_at = strftime('%s','now') where id = '${viewQ.id}'`)
      const V = await touchCtx(390, 844); await stubOpen(V); const v = await page(V, 'view-390')
      await go(v, `/quote/${tok}`, 2200)
      const tc = v.getByTestId('quote-view-total-card'), vb = v.getByTestId('quote-view-bar')
      ok(await tc.isVisible() && await v.getByTestId('reading-cards').isVisible() && await vb.isVisible(), '390: the view-only link reads first — the total card, the cards, the bar')
      const msg = v.getByTestId('quote-view-message-bar'), dl = v.getByTestId('quote-view-download-bar')
      ok((await rect(msg)).h >= 48 && (await rect(dl)).h >= 48, '390: Message and Download at 48')
      await msg.tap(); await settle(v, 500)
      ok((await opened(v)).some((u) => /wa\.me\/\d+\?text=/.test(u)), '390: Message opens WhatsApp on the press')
      await shot(v, '20-view-390')
      await V.close()
      sql(`update quotes set view_token = null, view_token_at = null where id = '${viewQ.id}'`)
    }
    /* the dead link: a way to ask (A-23) */
    /* 320: the client's page and Create Quote's sheet keep inside the screen too */
    if (CONFIRM) { const X = await touchCtx(320, 640); const x = await page(X, 'confirm-320'); await go(x, `/confirm/${CONFIRM}`, 2000)
      ok(await sideways(x) <= 0 && await x.getByTestId('confirm-bar-primary').isVisible(), `320: the confirmation page, no sideways scroll (${await sideways(x)})`)
      await go(x, '/quotes', 1600); await x.getByRole('button', { name: 'New quote' }).first().tap(); await settle(x, 800)   // (the calm UI build 2026-10-27, a deliberate change)
      ok(await sideways(x) <= 0 && await x.getByTestId('create-quote').getAttribute('data-mode') === 'who', `320: Create Quote's first step, no sideways scroll (${await sideways(x)})`)
      await X.close() }
    { const N = await touchCtx(390, 844); await stubOpen(N); const nn = await page(N, 'notice-390')
      await go(nn, '/quote/none', 1600)
      const msg = nn.getByTestId('link-notice-message')
      /* the demo studio has a phone on record (the brand setting, lib/templates/brand.ts) — the notice carries the way to ask */
      ok(await msg.isVisible() && (await rect(msg)).h >= 48, `390: the dead link offers "Message {studio}" (${await msg.count() ? Math.round((await rect(msg)).h) : 0} tall)`)
      if (await msg.count()) { await msg.tap(); await settle(nn, 500) }
      ok((await opened(nn)).some((u) => /wa\.me\/\d{8,12}\?text=/.test(u) && decodeURIComponent(u).includes('/quote/none')), '390: …which opens WhatsApp with the link’s address in the draft')
      await shot(nn, '21-notice-390')
      await N.close() }

    // ── 7 · 1440 unchanged ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · 1440 with a mouse: the desk as it was')
    { const D = await desk(); const d = await page(D, 'desk-1440')
      await go(d, '/quotes', 1800)
      const row = d.locator('[data-kb-row]').first()
      ok(await row.getByTestId('quote-card-name').isVisible() === false && await row.getByTestId('quote-card-status').isVisible() === false, 'no card pieces on the desk')
      ok(await row.getByRole('button', { name: /^Status .* — change status$/ }).isVisible(), 'the status button stays')
      await row.hover(); await settle(d, 300)
      ok(await row.getByRole('button', { name: 'View' }).count() === 0 && await row.getByRole('button', { name: /^More actions for/ }).isVisible(), 'the ⋮ on hover — the title opens')   // (the calm UI build 2026-10-27, a deliberate change) 4-46: the hover View left
      ok(await d.locator('[role="columnheader"]').evaluateAll((hs) => hs.map((x) => x.getAttribute('data-col')).includes('creator')), 'the desk opens with every column')
      ok(await d.getByRole('button', { name: 'New quote', exact: true }).first().evaluate((el) => el.tagName === 'BUTTON' && /New quote/.test(el.textContent || '')), 'Create Quote is the labelled button')   // (the calm UI build 2026-10-27, a deliberate change) 1-11 · W-011: New quote, in the page header
      if (CONFIRM) {
        await go(d, `/confirm/${CONFIRM}`, 2200)
        ok(await d.getByTestId('confirm-total-card').isVisible() === false && await d.getByTestId('confirm-bar').isVisible() === false && await d.getByTestId('ask-change').isVisible() && await d.locator('[data-page="1"]').first().isVisible(), 'the confirmation page keeps its card beside the paper')
      }
      await D.close() }

    console.log('8 · the page error log')
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
