// Quotes on the move · K2 — the Items section on a phone and a tablet (his "I have marked it please go ahead", 2026-10-22, on the review page
// https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w: P-03 the cards grown up, P-04 the line sheet in two layers, P-07 the tablet's cards + pane and
// its working grid; the absorbed findings C-01 C-02 C-04…C-08 C-10…C-15 C-22 C-24 and the fixes C-03 · C-09; Q-03 no full grid on a tablet).
// Each rule asserted as built, never another round's count:
//  A · 390 (touch): the cards — 16 names that wrap, the kind on the line, the total bold; a section folds on a tap and holds; depth is a bar;
//      "Add to {section}" adds in one press and opens the sheet; the sheet's two layers (Quantity · Unit · Unit price · live Total · Kind, then
//      More), number keypads, Delete · Done at 48; the ⋮'s five rows + More…; the bulk bar's three; the Items ⋮ without Column settings · Row
//      density · Expand; the pinned foot (Subtotal · GST · Total · Adjust · Breakdown · Add section · Add item) sticky at the body's bottom; the
//      Adjust form types at 14 (C-09); every icon button's 44 box is centred (C-03, measured with elementFromPoint); the print note is one row.
//  B · 768×1024 (touch, upright): the cards, no grid; a tap opens the line pane (the house drawer when the cards would keep under 320, else
//      beside); Quantity first; the foot; no sideways scroll.
//  C · 1024×768 (touch, sideways): the working grid — Item · Qty · Unit · Unit Price · Total, no pan; 44 cells; the focused name box 44 (C-14);
//      the number in the Item cell; a tap on the Total opens the rest in the drawer; the ⋮ offers Column settings and Row density, never Expand;
//      Column settings edits the tablet's own set, remembered per browser; the internal caption (C-15).
//  D · 1440 (mouse): the mocked grid as before — the # column, the Add Item box, the summary block, nothing of the touch foot.
//  E · 320: no sideways scroll; no page errors anywhere.
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3172 NODE_PATH=<repo>/node_modules node verify-rq-k2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rq-k2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3172'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rq-k2-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

const Q = sql(`select id from quotes where number = 'OM-10001' and kind = 'quote' and deleted_at is null`)   // Olivia Martinez · Draft · 16 lines · 2 sections
const URL = `/quotes/${Q}`
const URL_TOUCH = `${URL}?edit=items`   // (quotes on the move, K1 landed after this probe was written) on ≤1024 the quote opens as the Quote screen; the Items section is its own screen at ?edit=items
const SECTION = sql(`select id from quote_items where quote_id = '${Q}' and kind = 'group' and parent_id is null order by position limit 1`)
const SECTION_NAME = sql(`select name from quote_items where id = '${SECTION}'`)
const LINE = sql(`select id from quote_items where quote_id = '${Q}' and kind = 'item' and parent_id is null order by position limit 1`)
const LINE_NAME = sql(`select name from quote_items where id = '${LINE}'`)
const lineCount = () => Number(sql(`select count(*) from quote_items where quote_id = '${Q}' and kind = 'item'`))
const sectionKids = (id) => Number(sql(`select count(*) from quote_items where parent_id = '${id}'`))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }   // the app's own lazy writes first
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
  const touch = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 800) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport only — a full-page capture drops (hover: none) mid-shot
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const fontOf = (loc) => loc.evaluate((el) => { const cs = getComputedStyle(el); return { size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) } })
  /* the element inside a card wearing a CSS-module class — `name`, not `nameRow` */
  const part = (loc, cls) => loc.locator(`xpath=.//*[contains(concat(' ', normalize-space(@class), ' '), '__${cls} ')]`).first()
  /* a menu row's words without its glyph ligatures (chevron_right · undo …) */
  const words = (texts) => texts.map((t) => t.split('\n').map((l) => l.trim()).filter((l) => l && !/^[a-z_]+$/.test(l))[0] ?? '').filter(Boolean)
  const boxOf = async (loc) => { const r = await loc.boundingBox(); return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null }
  /* the 44 box an icon button carries (REG-344): a press 3px outside its drawn 36, on every side, still lands on it — the C-03 bug put the box up-left */
  const centredBox = async (p, loc) => {
    await loc.evaluate((el) => el.scrollIntoView({ block: 'center' })); await settle(p, 300)   // clear of the sticky heads and the pinned foot
    const r = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)) ? '' : `${Math.round(x)},${Math.round(y)}→${t ? t.tagName + '.' + String(t.className).slice(0, 24) : 'none'}` }
      return [hit(r.right + 3, r.bottom + 3), hit(r.left - 3, r.top - 3), hit(r.right + 3, r.top - 3), hit(r.left - 3, r.bottom + 3)].filter(Boolean)
    })
    if (r.length) console.log('    (missed:', r.join(' · ') + ')')
    return r.length === 0
  }
  const card = (p, id) => p.locator(`[data-testid="item-card"][data-item-id="${id}"]`)

  try {
    // ── A · 390 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('A · 390 — the cards, the sheet, the menus, the foot')
    const P = await touch(390, 844); const p = await page(P, '390')
    await go(p, URL_TOUCH)
    const cards = p.getByTestId('items-cards')
    await cards.scrollIntoViewIfNeeded(); await settle(p, 400)
    ok(await cards.isVisible() && (await p.locator('[role="table"][aria-label="Quote items"]').count()) === 0, 'the lines are cards, never the grid')
    ok((await p.locator('[data-testid="items-cards"] [data-add-item]').count()) === 0, 'no Add Item box under the cards — the foot adds')
    ok((await sideways(p)) <= 0, 'no sideways scroll')
    await shot(p, 'a-01-cards-390')
    // the scale (P-08 · C-13)
    const lc = card(p, LINE)
    await lc.scrollIntoViewIfNeeded(); await settle(p, 200)
    const nameF = await fontOf(part(lc, 'name')), subF = await fontOf(part(lc, 'sub')), totF = await fontOf(part(lc, 'total'))
    ok(nameF.size === 16 && nameF.weight >= 600, `the name reads at 16 (${nameF.size}/${nameF.weight})`)
    ok(subF.size === 14 && totF.size === 16 && totF.weight >= 700, `the figures at 14, the total bold at 16 (${subF.size} · ${totF.size}/${totF.weight})`)
    ok(/×/.test(await part(lc, 'sub').innerText()) && /Labour|Purchase|Design|Fee|Delivery/.test(await lc.innerText()), 'the quantity line carries the kind: "681 sqft × S$4.00 · Labour"')
    ok(await part(lc, 'name').evaluate((el) => getComputedStyle(el).webkitLineClamp === 'none' || getComputedStyle(el).webkitLineClamp === ''), 'the name wraps — no two-line clamp')
    ok((await lc.locator('[class*="__desc"]').count()) === 0, 'no 12px description line on a card (it lives in the sheet)')
    // the kebab's centred 44 (C-03) and the checkbox
    const kebab = lc.locator('[aria-label^="More options for"]')
    ok(await centredBox(p, kebab), 'the card kebab’s 44 box is centred on its glyph — a press 3px past every edge lands (C-03)')
    const cb = await boxOf(lc.getByRole('checkbox').locator('xpath=ancestor::*[contains(@class,"check")][1]'))
    ok(!!cb && cb.w >= 44 && cb.h >= 44, `the checkbox keeps its 44 (${cb?.w}×${cb?.h})`)
    // a section: tinted, a tap folds, sticky, depth as a bar
    const sc = card(p, SECTION)
    await sc.scrollIntoViewIfNeeded(); await settle(p, 200)
    ok(await sc.evaluate((el) => getComputedStyle(el).position === 'sticky'), 'a section card holds (sticky) while its lines scroll')
    ok((await sc.locator('[aria-label^="Expand "], [aria-label^="Collapse "]').count()) === 1 && (await sc.locator('button[aria-label^="Expand "]').count()) + (await sc.locator('button[aria-label^="Collapse "]').count()) === 1, 'the fold is the card’s own press, not a 24px chevron button')
    const folded0 = sql(`select collapsed from quote_items where id = '${SECTION}'`) === '1'
    const n0 = await p.locator('[data-testid="item-card"]').count()
    await sc.getByRole('button', { name: folded0 ? `Expand ${SECTION_NAME}` : `Collapse ${SECTION_NAME}` }).tap(); await settle(p, 1500)
    const n1 = await p.locator('[data-testid="item-card"]').count()
    ok(folded0 ? n1 > n0 : n1 < n0, `a tap on the section ${folded0 ? 'unfolds' : 'folds'} it (${n0} → ${n1} cards)`)
    const kid = sql(`select id from quote_items where parent_id = '${SECTION}' and kind = 'item' order by position limit 1`)
    const kc = card(p, kid)
    ok(await kc.evaluate((el) => el.getAttribute('data-depth') === '1' && getComputedStyle(el).marginLeft === '0px' && /inset/.test(getComputedStyle(el).boxShadow) === false ? getComputedStyle(el).boxShadow !== 'none' : getComputedStyle(el).marginLeft === '0px' && getComputedStyle(el).boxShadow !== 'none'), 'a line in a section is full width with a bar on its left edge, not a margin (C-12)')
    await shot(p, 'a-02-section-open-390')
    // "+ Add to {section}": one press adds a line and opens its sheet
    const foot = p.locator(`[data-section-foot="${SECTION}"] [data-testid="section-add"]`)
    const kids0 = sectionKids(SECTION)
    await foot.scrollIntoViewIfNeeded(); await settle(p, 200)
    ok((await boxOf(foot))?.h >= 44, 'the section’s add row stands 44')
    await foot.tap(); await settle(p, 2000)
    ok(sectionKids(SECTION) === kids0 + 1, 'one press adds a line at the section’s end')
    const sheet = p.getByTestId('line-sheet')
    ok(await sheet.isVisible(), '…and its sheet opens to name it')
    ok(await p.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Item name' || (document.activeElement?.closest('[data-testid="line-sheet"]') !== null && document.activeElement?.tagName === 'INPUT')), 'the name box holds the caret')
    await shot(p, 'a-03-new-line-sheet-390')
    await p.getByRole('button', { name: 'Done' }).tap(); await settle(p, 500)
    // the line sheet in two layers (P-04 · C-05)
    await lc.scrollIntoViewIfNeeded(); await lc.getByRole('button', { name: `Edit ${LINE_NAME}` }).tap(); await settle(p, 700)
    ok(await sheet.isVisible(), 'a tap on a line opens its sheet')
    const first = ['Item name', 'Quantity', 'Unit', 'Unit price (S$)', 'Kind']
    for (const l of first) ok(await sheet.getByLabel(l, { exact: true }).first().isVisible(), `layer 1 shows ${l}`)
    ok(await sheet.getByTestId('line-total').isVisible(), 'layer 1 shows the live Total')
    ok((await sheet.getByLabel('Cost (S$)').count()) === 0 && (await sheet.getByLabel('Website Link').count()) === 0, 'cost, markup and the link wait under More')
    ok(await sheet.getByLabel('Quantity').evaluate((el) => el.getAttribute('inputmode') === 'decimal') && await sheet.getByLabel('Unit price (S$)').evaluate((el) => el.getAttribute('inputmode') === 'decimal'), 'the quantity and the price open the number keypad')
    const qF = await fontOf(sheet.getByLabel('Quantity'))
    ok(qF.size >= 14, `the boxes type at ${qF.size} (≥ 14; 16 on iOS)`)
    const del = await boxOf(p.getByTestId('line-delete')), done = await boxOf(p.getByRole('button', { name: 'Done' }))
    ok(!!del && !!done && del.h >= 48 && done.h >= 48 && del.y === done.y, `Delete and Done pinned side by side at 48 (${del?.h} · ${done?.h})`)
    const total0 = await sheet.getByTestId('line-total').innerText()
    const qty0 = sql(`select qty from quote_items where id = '${LINE}'`)
    const qty = sheet.getByLabel('Quantity'); await qty.fill(''); await qty.pressSequentially('5'); await qty.blur(); await settle(p, 1400)
    ok((await sheet.getByTestId('line-total').innerText()) !== total0, `the Total moves as the quantity changes (${total0} → ${await sheet.getByTestId('line-total').innerText()})`)
    ok(Number(sql(`select qty from quote_items where id = '${LINE}'`)) === 5, 'and the quantity is saved')
    await shot(p, 'a-04-sheet-layer1-390')
    await sheet.getByTestId('line-more').tap(); await settle(p, 400)
    ok(await sheet.getByLabel('Cost (S$)').isVisible() && await sheet.getByLabel('Website Link').isVisible() && (await sheet.getByRole('button', { name: /^Description/ }).count()) === 1, 'More opens the rest: description, cost and markup, …, the link')
    ok(/^Less/.test((await sheet.getByTestId('line-more').innerText()).trim()), 'the row reads Less once open')
    await shot(p, 'a-05-sheet-more-390')
    await p.getByRole('button', { name: 'Done' }).tap(); await settle(p, 500)
    sql(`update quote_items set qty = ${qty0} where id = '${LINE}'`)
    // the row ⋮: five rows + More… (C-06)
    await lc.scrollIntoViewIfNeeded(); await kebab.tap(); await settle(p, 500)
    const rows = words(await p.getByRole('menuitem').allInnerTexts())
    ok(rows.length === 6 && ['Edit…', 'Duplicate', 'Mark as optional', 'Move to section', 'Remove', 'More…'].every((r) => rows.includes(r)), `the row ⋮ is five rows and More… (${rows.join(' · ')})`)
    await p.getByRole('menuitem', { name: 'More…' }).tap(); await settle(p, 300)
    const all = words(await p.getByRole('menuitem').allInnerTexts())
    ok(all.includes('More') && all.some((t) => /Print as/.test(t)) && all.some((t) => /^Price book/.test(t)),   /* (the calm UI build 2026-10-27, a deliberate change) 4-07: the whole menu, its rest one level in under More · Price book › */ 'More… holds the whole menu — nothing lost')
    await shot(p, 'a-06-row-menu-390')
    await p.keyboard.press('Escape'); await settle(p, 300)
    // the bulk bar: Move to section · Delete · More… (C-07)
    await lc.getByRole('checkbox').tap({ force: true }); await settle(p, 600)
    const bar = p.getByRole('toolbar', { name: /selected/ })
    const barBtns = words(await bar.getByRole('button').allInnerTexts()).filter((t) => t !== 'close')
    ok(barBtns.length === 3 && barBtns[0] === 'Move to section' && barBtns[1] === 'Delete' && barBtns[2] === 'More…', `the bulk bar is Move to section · Delete · More… (${barBtns.join(' · ')})`)
    const bb = await boxOf(bar)
    ok(!!bb && bb.x >= 0 && bb.x + bb.w <= 390 && await bar.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'it fits the screen with nothing off the end')
    ok((await p.locator('[data-testid="touch-add-item"]').count()) === 0 || !(await p.getByTestId('touch-add-item').isVisible()), 'the foot’s adds step away while the bar is up')
    await bar.getByRole('button', { name: 'More…' }).tap(); await settle(p, 500)
    const more = words(await p.getByRole('menuitem').allInnerTexts())
    ok(['Set value…', 'Print as…', 'Highlight', 'Hide from client', 'Copy'].every((r) => more.some((m) => m.startsWith(r))) && more.some((m) => /Group into/.test(m)), `More… holds the rest (${more.join(' · ')})`)
    await shot(p, 'a-07-bulk-more-390')
    await p.keyboard.press('Escape'); await settle(p, 300)
    await p.getByRole('button', { name: 'Clear selection' }).tap(); await settle(p, 400)
    // the Items ⋮ (C-11)
    await p.getByRole('button', { name: 'More options for Items' }).tap(); await settle(p, 500)
    const items = words(await p.getByRole('menuitem').allInnerTexts())
    ok(['New section', 'From Price book', 'Paste lines…', 'Undo', 'Redo'].every((r) => items.includes(r)) && items.some((t) => /^View by/.test(t)) && items.some((t) => /all$/i.test(t)) /* (the calm UI build 2026-10-27, a deliberate change) sentence case: Collapse all */, `the Items ⋮: New section · From Price book · Paste lines · Undo · Redo · View by › · Collapse all (${items.join(' · ')})`)
    ok(!items.some((t) => /Column settings|Row density|Expand$|^Collapse$/.test(t)), 'no Column settings, Row density or Expand on a phone')
    const head = p.locator('#section-items')
    ok((await head.getByRole('button', { name: 'Maison AI' }).count()) === 0 && (await head.getByRole('button', { name: 'Create' }).count()) === 0 && (await head.getByRole('button', { name: 'Find items' }).count()) === 1, 'the toolbar is the search glyph and the ⋮ — the adds are the foot’s')
    await shot(p, 'a-08-items-menu-390')
    await p.keyboard.press('Escape'); await settle(p, 300)
    // the pinned foot (C-08)
    const tf = p.getByTestId('items-touch-foot')
    await lc.scrollIntoViewIfNeeded(); await settle(p, 300)
    const fb = await boxOf(tf)
    ok(!!fb && await tf.evaluate((el) => getComputedStyle(el).position === 'sticky') && fb.y + fb.h <= 844 + 1 && fb.y > 300, `the foot is pinned at the screen’s bottom while the cards scroll (y ${fb?.y}…${fb ? fb.y + fb.h : '?'})`)
    const stripTotal = await p.getByTestId('touch-total').innerText()
    ok(/^S\$[\d,]+\.\d\d$/.test(stripTotal) && /Subtotal S\$[\d,]+\.\d\d/.test(await p.getByTestId('touch-sums').innerText()), `Subtotal · GST on a line, the Total under it (${stripTotal})`)
    const totF2 = await fontOf(p.getByTestId('touch-total'))
    ok(totF2.size >= 18 && totF2.size <= 26, `the Total at ${totF2.size} (18–26)`)
    const addBtn = await boxOf(p.getByTestId('touch-add-item')), secBtn = await boxOf(p.getByTestId('touch-add-section'))
    ok(!!addBtn && !!secBtn && addBtn.h >= 48 && secBtn.h >= 48, `Add section · + Add item stand 48 (${secBtn?.h} · ${addBtn?.h})`)
    ok(await p.evaluate(() => { const f = document.querySelector('[data-testid="items-touch-foot"]'); return !!f && [...f.querySelectorAll('button')].filter((b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(b).backgroundColor !== 'transparent').length === 1 }), 'one filled button on the screen: + Add item')
    for (const id of ['touch-adjust', 'touch-breakdown']) { const bx = await boxOf(p.getByTestId(id)); ok(!!bx && bx.h >= 44, `${id === 'touch-adjust' ? 'Adjust' : 'Breakdown'} is a 44 press (${bx?.h})`) }
    await shot(p, 'a-09-foot-390')
    // Adjust: the totals card as a form, typing at 14 (C-09)
    await p.getByTestId('touch-adjust').tap(); await settle(p, 700)
    const adj = p.getByRole('dialog', { name: 'Totals' })
    ok(await adj.isVisible() && (await adj.getByTestId('quote-totals').count()) === 1 && (await adj.getByLabel('Issued by').count()) === 1, 'Adjust opens the entity and the totals card as a form')
    // (the calm UI build 2026-10-27, a deliberate change) no discount row until there is one (4-29): "+ Add a discount" makes the field the touch rule measures
    await adj.getByTestId('add-discount').tap(); await settle(p, 500)
    const discIn = adj.getByTestId('named-discount').getByLabel('Value', { exact: true })
    const discF = await fontOf(discIn)
    ok(discF.size >= 14, `the additional discount types at ${discF.size} (was 12 — C-09)`)
    const dBox = await boxOf(discIn.locator('xpath=ancestor::*[contains(@class,"__box")][1]'))
    ok(!!dBox && dBox.h >= 44, `in a 44 box (${dBox?.h})`)
    ok(await adj.getByRole('switch', { name: 'Apply GST' }).count() === 1 && (await adj.getByRole('button', { name: 'Round prices' }).count()) === 1, 'GST and Round Prices are there')
    await adj.getByTestId('named-discount').getByRole('button', { name: 'Remove this discount' }).tap(); await settle(p, 500)   // put the quote back as it was
    await shot(p, 'a-10-adjust-390')
    await adj.getByRole('button', { name: 'Done' }).tap(); await settle(p, 400)
    await p.getByTestId('touch-breakdown').tap(); await settle(p, 700)
    const bd = p.getByRole('dialog', { name: 'By trade' })   // (the calm UI build 2026-10-27, a deliberate change) Trade, not Category (4-01)
    ok(await bd.isVisible() && (await bd.getByTestId('items-share').count()) > 0, 'Breakdown opens By category')
    await shot(p, 'a-11-breakdown-390')
    await bd.getByRole('button', { name: 'Done' }).tap(); await settle(p, 400)
    // + Add item / Add section from the foot
    const n2 = lineCount()
    await p.getByTestId('touch-add-item').tap(); await settle(p, 2000)
    ok(lineCount() === n2 + 1 && await sheet.isVisible(), '+ Add item adds a line and opens its sheet')
    await p.getByRole('button', { name: 'Done' }).tap(); await settle(p, 500)
    const g0 = Number(sql(`select count(*) from quote_items where quote_id = '${Q}' and kind = 'group'`))
    await p.getByTestId('touch-add-section').tap(); await settle(p, 2000)
    ok(Number(sql(`select count(*) from quote_items where quote_id = '${Q}' and kind = 'group'`)) === g0 + 1 && await sheet.getByLabel('Section name').isVisible(), 'Add section adds one and opens its sheet on the name')
    await p.getByRole('button', { name: 'Done' }).tap(); await settle(p, 500)
    // the print note as one row (C-22)
    const note = p.getByTestId('print-note')
    if (await note.count()) { const nb = await boxOf(note); ok(!!nb && nb.h <= 52, `the print note is one row (${nb?.h})`) }
    // the toolbar's own icon buttons carry centred boxes too (C-03)
    ok(await centredBox(p, p.getByRole('button', { name: 'More options for Items' })), 'the Items ⋮’s 44 box is centred (C-03)')
    await P.close()

    // ── B · 768 upright ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('B · 768×1024 — the cards with the line pane')
    const T = await touch(768, 1024); const t = await page(T, '768')
    await go(t, URL_TOUCH)
    const tcards = t.getByTestId('items-cards')
    await tcards.scrollIntoViewIfNeeded(); await settle(t, 400)
    ok(await tcards.isVisible() && (await t.locator('[role="table"][aria-label="Quote items"]').count()) === 0, 'a tablet held upright shows the cards, never the grid (Q-01)')
    ok((await sideways(t)) <= 0, 'no sideways scroll')
    ok(await t.getByTestId('items-touch-foot').isVisible(), 'the pinned foot is there')
    ok((await t.locator('#section-items').getByRole('button', { name: 'Maison AI' }).count()) === 1 && (await t.locator('#section-items').getByRole('button', { name: 'Create' }).count()) === 1, 'the toolbar keeps Maison AI and Create ▾ on a tablet')
    const tl = card(t, LINE)
    await tl.scrollIntoViewIfNeeded(); await tl.getByRole('button', { name: `Edit ${LINE_NAME}` }).tap(); await settle(t, 800)
    const pane = t.getByTestId('line-pane')
    ok(await pane.isVisible(), 'a tap opens the line’s pane')
    const inline = await tcards.evaluate((el) => el.hasAttribute('data-pane'))
    const paneBox = inline ? pane : t.getByRole('dialog', { name: `Edit ${LINE_NAME}` })
    const pb = await boxOf(paneBox), cw = await tcards.evaluate((el) => el.getBoundingClientRect().width)
    ok(!!pb && pb.w === 400 && pb.x + pb.w <= 768, `the pane is 400 wide at the right (x ${pb?.x}, w ${pb?.w})`)
    ok(inline ? cw >= 736 : cw < 736, inline ? 'beside the cards (the cards keep ≥ 320)' : `the house drawer over the list’s right edge — the cards column is ${Math.round(cw)}, under the 736 that keeps 320 for them`)
    ok(await pane.getByLabel('Quantity').isVisible() && await pane.getByLabel('Unit price (S$)').isVisible(), 'Quantity and Unit price first')
    ok(await tl.evaluate((el) => el.hasAttribute('data-open')) || !inline, 'the open line wears the ring')
    ok((await t.locator('[data-testid="line-sheet"]').count()) === 0, 'no bottom sheet on a tablet')
    await shot(t, 'b-01-cards-pane-768')
    const other = sql(`select id from quote_items where quote_id = '${Q}' and kind = 'item' and parent_id is null and id != '${LINE}' order by position limit 1`)
    const otherName = sql(`select name from quote_items where id = '${other}'`)
    { const oc = card(t, other); await oc.scrollIntoViewIfNeeded(); await settle(t, 300); await oc.getByRole('button', { name: `Edit ${otherName}` }).tap(); await settle(t, 600) }   // (quotes on the move, K1 landed) the card is brought into view first — a forced tap under the pinned foot landed on the foot
    ok((await pane.getByLabel('Item name').inputValue()) === otherName, 'another card’s tap moves the pane to that line — the list stays live')
    await t.getByRole('button', { name: 'Done' }).last().tap(); await settle(t, 400)
    ok((await t.getByTestId('line-pane').count()) === 0, 'Done closes the pane')
    await t.getByRole('button', { name: 'More options for Items' }).tap(); await settle(t, 500)
    const titems = words(await t.getByRole('menuitem').allInnerTexts())
    ok(!titems.some((x) => /Column settings|Row density|Expand$/.test(x)), 'no Column settings, Row density or Expand on the cards')
    await t.keyboard.press('Escape'); await settle(t, 300)
    await T.close()

    // ── C · 1024 sideways ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('C · 1024×768 — the working grid')
    const G = await touch(1024, 768); const g = await page(G, '1024')
    await go(g, URL_TOUCH)
    const grid = g.locator('[role="table"][data-touch-grid]')
    await grid.scrollIntoViewIfNeeded(); await settle(g, 400)
    ok(await grid.isVisible(), 'a tablet held sideways shows the working grid')
    const heads = words(await grid.locator('[role="columnheader"]').allInnerTexts()).map((x) => x.toLowerCase())
    ok(heads.join('|') === 'item|qty|unit|unit price|total', `Item · Qty · Unit · Unit price · Total (${heads.join(' · ')})`)
    ok(await grid.locator('[role="columnheader"][class*="colAdd"]').evaluate((el) => getComputedStyle(el).display === 'none'), 'no "+" column head under a finger')
    const pan = await grid.evaluate((el) => { const s = el.querySelector('[class*="__scroller"]'); return s ? `${s.scrollWidth}/${s.clientWidth}` : 'no scroller' })
    ok(/^(\d+)\/\1$/.test(pan) || (() => { const [a, b] = pan.split('/').map(Number); return a <= b + 1 })(), `no pan — the five fit the card (${pan})`)
    ok((await sideways(g)) <= 0, 'no sideways page scroll')
    const row = g.locator(`[role="row"][data-item-id="${LINE}"]`)
    await row.scrollIntoViewIfNeeded(); await settle(g, 200)
    ok((await row.locator('[data-testid="num-inline"]').count()) === 1 && (await grid.locator('[class*="colNum"]').count()) === 0, 'the number rides in the Item cell; no # column')
    const qtyBox = await boxOf(row.locator('[data-col="qty"] input'))
    ok(!!qtyBox && qtyBox.h >= 44, `a number cell is 44 tall (${qtyBox?.h})`)
    await row.locator('input[data-name]').tap(); await settle(g, 300)
    const nameBox = await boxOf(row.locator('input[data-name]'))
    ok(!!nameBox && nameBox.h >= 44, `the focused name box renders 44 (${nameBox?.h}) — it rendered 24 (C-14)`)
    await g.keyboard.press('Escape'); await settle(g, 200)
    ok((await grid.locator('[role="columnheader"] [class*="resizer"], [role="columnheader"] [aria-label^="Resize"]').count()) === 0, 'no resize handles under a finger')
    await row.evaluate((el) => el.scrollIntoView({ block: 'center' })); await settle(g, 300)   // (quotes on the move, K1 landed) the row is measured clear of the screen's sticky bars — the focus scroll above had parked it under them
    ok(await centredBox(g, row.locator('[aria-label^="More options for"]')), 'the row kebab’s 44 box is centred (C-03)')
    await shot(g, 'c-01-grid-1024')
    await row.getByTestId('total-open').tap(); await settle(g, 800)
    const drawer = g.getByTestId('line-pane')
    ok(await drawer.isVisible() && (await drawer.getByLabel('Item name').count()) === 1 && (await drawer.getByRole('button', { name: /^Description/ }).count()) === 1 && (await drawer.getByLabel('Quantity').count()) === 0, 'a tap on the Total opens the rest of the line in the drawer (no Quantity — the grid edits it)')
    ok(await g.getByRole('dialog', { name: `Edit ${LINE_NAME}` }).isVisible(), 'on the house drawer, named for the line')
    await shot(g, 'c-02-drawer-1024')
    await g.getByRole('dialog', { name: `Edit ${LINE_NAME}` }).getByRole('button', { name: 'Done' }).tap(); await settle(g, 400)   // (quotes on the move, K1 landed) the drawer's own Done — the section list beside it has a Done of its own at 1024
    // the row ⋮ is the five + More… here too
    await row.locator('[aria-label^="More options for"]').tap(); await settle(g, 400)
    const grows = words(await g.getByRole('menuitem').allInnerTexts())
    ok(grows.includes('Edit…') && grows.includes('More…') && grows.length === 6, 'the row ⋮ is the five rows and More…')
    await g.keyboard.press('Escape'); await settle(g, 300)
    // the Items ⋮: Column settings and Row density, never Expand; the tablet's own set, remembered per browser
    await g.getByRole('button', { name: 'More options for Items' }).tap(); await settle(g, 500)
    const gitems = words(await g.getByRole('menuitem').allInnerTexts())
    ok(gitems.includes('Column settings') && gitems.some((x) => /^Row density/.test(x)) && !gitems.some((x) => /Expand$/.test(x)), `Column settings · Row density, no Expand (${gitems.join(' · ')})`)
    await g.getByRole('menuitem', { name: 'Column settings' }).tap(); await settle(g, 600)
    const costSwitch = g.getByRole('switch', { name: 'Show Cost column' })
    await costSwitch.locator('xpath=ancestor::label[1]').tap().catch(async () => costSwitch.tap({ force: true })); await settle(g, 600)   // the DS Switch's input is hidden — its label takes the press
    await g.getByRole('dialog').getByRole('button', { name: /^Done$|^Close$/ }).first().tap(); await settle(g, 500)
    const heads2 = (await grid.locator('[role="columnheader"]').allInnerTexts()).map((x) => x.trim().toLowerCase()).filter(Boolean)
    ok(heads2.includes('cost'), `Column settings adds Cost to the grid (${heads2.join(' · ')})`)
    ok(await g.evaluate(() => { try { return /"cost","on":true/.test(localStorage.getItem('om.items.tablet-columns') ?? '') } catch { return false } }), 'remembered per browser (om.items.tablet-columns), apart from the quote’s desktop set')
    ok(sql(`select items_columns from quotes where id = '${Q}'`) === kept.get('quotes').find((r) => r.id === Q).items_columns, 'the quote’s own columns are untouched')
    const gnote = g.getByTestId('internal-note')
    ok((await gnote.count()) === 1 && /Cost/.test(await gnote.innerText()) && /internal/i.test(await gnote.innerText()), `the caption names the internal columns on screen (C-15): ${await gnote.innerText().catch(() => '')}`)
    await shot(g, 'c-03-grid-cost-1024')
    await g.reload({ waitUntil: 'networkidle' }); await settle(g, 1200)
    await grid.scrollIntoViewIfNeeded(); await settle(g, 300)
    ok((await grid.locator('[role="columnheader"]').allInnerTexts()).some((x) => /^cost$/i.test(x.trim())), 'after a reload the tablet still shows Cost')
    await g.evaluate(() => { try { localStorage.removeItem('om.items.tablet-columns') } catch {} })
    await G.close()

    // ── D · 1440 mouse ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('D · 1440 — the mocked grid as before')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const d = await page(D, '1440')
    await go(d, URL)
    const dg = d.locator('[role="table"][aria-label="Quote items"]')
    await dg.scrollIntoViewIfNeeded(); await settle(d, 300)
    ok(await dg.isVisible() && !(await dg.evaluate((el) => el.hasAttribute('data-touch-grid'))), 'the desktop grid, not the touch one')
    ok((await dg.locator('[role="columnheader"][class*="colNum"]').count()) === 1 && (await dg.locator('[data-add-item]').count()) === 1, 'the # column and the Add Item box are there')
    ok((await d.getByTestId('items-touch-foot').count()) === 0 && (await d.getByTestId('quote-totals').count()) === 1 && (await d.getByTestId('items-by-category').count()) === 1, 'the totals block below the table, no touch foot')
    ok((await dg.locator('[data-testid="total-open"], [data-testid="num-inline"]').count()) === 0, 'nothing of the touch grid in the desktop rows')
    const dcols = (await dg.locator('[role="columnheader"]').allInnerTexts()).map((x) => x.trim().toLowerCase()).filter(Boolean)
    ok(dcols.includes('cost') && dcols.includes('markup'), `the quote’s own columns (${dcols.join(' · ')})`)
    await D.close()

    // ── E · 320 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('E · 320')
    const N = await touch(320, 700); const n = await page(N, '320')
    await go(n, URL_TOUCH)
    await n.getByTestId('items-cards').scrollIntoViewIfNeeded(); await settle(n, 300)
    ok((await sideways(n)) <= 0, 'no sideways scroll at 320')
    ok(await n.getByTestId('items-touch-foot').isVisible() && (await boxOf(n.getByTestId('touch-add-item')))?.w > 100, 'the foot fits 320')
    await shot(n, 'e-01-320')
    await N.close()

    ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e.message.split('\n')[0])
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
