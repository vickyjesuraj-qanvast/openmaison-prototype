// S44P · the Price book and Trades — her UAT ask 2026-10-15 ("fix every UAT comment from row 246 … based on our 2.0 experience"), triage
// design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md §5 area P. Each row asserted as the rule it builds:
//  1. M8 (rows 346 · 347) — the item dialog takes Cost · Markup · Unit price in the quote grid's order: a unit price of S$0 is a price (the
//     markup goes below zero, "Below cost by …"), a markup never takes the price under S$0, a cost keeps the markup (the grid's rule)
//  2. row 319 — "New category…" at the foot of the item dialog's Category list: an Owner names it, it joins the trades and lands on the item;
//     a name already listed says which entry and Add waits; a Designer sees the row with the trades rule under it; bulk Set category has it too
//  3. row 264 — Settings › Trades' "Add a trade" names the entry a case variant matches and lights that entry (the sources' list too)
//  4. row 340 — renaming a trade onto another asks to merge, saying what moves; Merge moves the price book items and quote lines and the note,
//     Undo puts every record, the place and the notes back; Cancel changes nothing; a member who may not is told the rule
//  5. row 341 — the Price book's Category filter counts a case variant once and finds both spellings
//  6. 390 / 768 touch and 320: the dialogs inside the screen (against screen.width), no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s44p.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44p')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s44p-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const trades = () => { const v = sql(`select value from settings where key = 'trades'`); return v ? JSON.parse(v) : null }
const notes = () => { const v = sql(`select value from settings where key = 'trade_notes'`); return v ? JSON.parse(v) : {} }
const TABLES = ['price_book_items', 'price_book_changes', 'price_book_sections', 'quote_items', 'settings', 'notifications']

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const touch = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1200) }
  const shot = async (p, n, full = false) => { await p.waitForTimeout(700); return p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full }) }   // a fill just before may not be painted yet
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' / ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); let t = ''; while (Date.now() - t0 < ms) { t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(150) } return t }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const inside = async (loc, w) => { const bb = await loc.boundingBox(); return !!bb && bb.x >= -1 && bb.x + bb.width <= w + 1 }
  const box = (dlg, label) => dlg.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?$`))   // a required label carries its asterisk
  const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 200)) } return fn() }
  const listView = async (p) => { await p.getByRole('radio', { name: 'List view' }).click().catch(async () => { await p.getByRole('button', { name: 'List view' }).click() }); await p.waitForTimeout(500) }   // pb-r4's
  const tradeChip = (card, name) => card.getByTestId('trade').filter({ has: card.page().getByText(name, { exact: true }) })
  const itemDlg = (p) => p.getByRole('dialog', { name: /^(New item|Edit item|Propose an item|Item details)$/ })   // the dialog's foot sits outside its body's test id
  const openNew = async (p) => {
    await p.getByTestId('new-template').click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /^(New item|Propose an item)$/ }).click()
    const dlg = p.getByTestId('item-dialog'); await dlg.waitFor(); await settle(p, 400); return dlg
  }

  const you0 = sql(`select id from members where is_you = 1`)
  let kept = []
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }

  try {
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')
    await go(p, '/company/price-book')   // one page open and settled before the snapshot
    kept = TABLES.map((t) => [t, json(`select * from ${t}`)])

    // ── 1 · M8: selling at S$0 ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · M8 — the item dialog takes a unit price; the markup works it out, below zero when it must')
      const dlg = await openNew(p)
      const trio = dlg.getByTestId('item-prices')
      const labels = await trio.locator('label').allInnerTexts()
      ok(labels.join(' | ') === 'Cost (S$) | Markup (S$) | Unit price (S$)', `Cost · Markup · Unit price, the grid's order (${labels.join(' | ')})`)
      const rows = await trio.locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      ok(rows.length === 3 && new Set(rows).size === 1, '1440: the three boxes sit on one row')
      await box(dlg, 'Item name').fill('Probe S44P gifted handles')
      await box(dlg, 'Cost (S$)').fill('50')
      await box(dlg, 'Unit price (S$)').fill('0')
      ok(await box(dlg, 'Markup (S$)').inputValue() === '-50.00', `a unit price of 0 takes the markup to −S$50.00 (${await box(dlg, 'Markup (S$)').inputValue()})`)
      ok(/Below cost by S\$\s?50\.00/.test(await dlg.innerText()), 'the markup says "Below cost by S$50.00"')
      await shot(p, '01-item-sells-at-zero-1440')
      await itemDlg(p).getByRole('button', { name: 'Add to My Items' }).click()
      await until(() => sql(`select count(*) from price_book_items where name = 'Probe S44P gifted handles'`) === '1', 8000)
      const r = json(`select id, cost_minor, markup_minor from price_book_items where name = 'Probe S44P gifted handles'`)[0] ?? {}
      ok(r.cost_minor === 5000 && r.markup_minor === -5000, `saved: costs S$50, sells at S$0 (cost ${r.cost_minor}, markup ${r.markup_minor})`)
      await settle(p, 800)
      await go(p, `/company/price-book?open=${r.id}`)
      const ed = p.getByTestId('item-dialog'); await ed.waitFor(); await settle(p, 600)
      ok(await box(ed, 'Unit price (S$)').inputValue() === '0.00' && await box(ed, 'Markup (S$)').inputValue() === '-50.00', 'reopened: Unit price 0.00, Markup −50.00')
      await box(ed, 'Markup (S$)').fill('-80'); await box(ed, 'Markup (S$)').blur(); await settle(p, 200)
      ok(await box(ed, 'Markup (S$)').inputValue() === '-50.00' && await box(ed, 'Unit price (S$)').inputValue() === '0.00', 'a markup below minus the cost settles at it — the price never goes under S$0')
      await box(ed, 'Unit price (S$)').fill('65')
      ok(await box(ed, 'Markup (S$)').inputValue() === '15.00' && /30% of the cost/.test(await ed.innerText()), 'a unit price of 65 makes the markup 15.00 — "30% of the cost"')
      await box(ed, 'Cost (S$)').fill('60'); await box(ed, 'Cost (S$)').blur(); await settle(p, 200)
      ok(await box(ed, 'Markup (S$)').inputValue() === '15.00' && await box(ed, 'Unit price (S$)').inputValue() === '75.00', 'a cost keeps the markup and the price follows, as the grid does')
      await box(ed, 'Markup (S$)').fill('-')
      ok(await box(ed, 'Markup (S$)').inputValue() === '-', 'the markup box takes a minus as it is typed')
      await itemDlg(p).getByRole('button', { name: 'Cancel' }).click(); await settle(p, 500)
      ok(sql(`select cost_minor || '/' || markup_minor from price_book_items where id = '${r.id}'`) === '5000/-5000', 'Cancel keeps the item as saved')
    }

    // ── 2 · row 319: New category… ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · row 319 — "New category…" at the foot of the item dialog\'s Category list')
      await go(p, '/company/price-book')
      const dlg = await openNew(p)
      await dlg.getByRole('combobox', { name: 'Category' }).click(); await settle(p, 300)
      const opts = await p.getByRole('option').allInnerTexts()
      ok(/New category…/.test(opts[opts.length - 1] ?? '') && opts.includes('Carpentry'), `the list ends on "New category…" after the trades (${opts.slice(-2).join(' | ')})`)
      ok(await p.locator('[role="separator"]').count() >= 1, 'a rule sets it apart from the options')
      await p.keyboard.press('End'); await settle(p, 100)
      ok(/New category…/.test(await p.evaluate(() => document.activeElement?.textContent ?? '')), 'End walks to it — the arrows reach it as an option')
      await shot(p, '02-new-category-row-1440')
      await p.getByTestId('new-category-row').click(); await settle(p, 500)
      const nc = p.getByRole('dialog', { name: 'New category' })
      ok(await nc.isVisible(), 'it opens the New category dialog over the item')
      await box(nc, 'Name').fill('carpentry'); await settle(p, 200)
      ok(/Already in the list as “Carpentry”/.test(await nc.innerText()) && await nc.getByRole('button', { name: 'Add', exact: true }).isDisabled(), 'a case variant says which entry it is, and Add waits')
      await box(nc, 'Name').fill('Probe Joinery S44P')
      await shot(p, '03-new-category-dialog-1440')
      await nc.getByRole('button', { name: 'Add', exact: true }).click()
      ok(/Probe Joinery S44P added to the trades/.test(await waitSnack(p, /added to the trades/)), 'the snackbar: "Probe Joinery S44P added to the trades"')
      await settle(p, 400)
      ok(!(await nc.isVisible()), 'the dialog closes once the trade is saved')
      ok((await dlg.getByRole('combobox', { name: 'Category' }).innerText()).includes('Probe Joinery S44P'), 'the new trade is the item\'s Category')
      ok((trades() ?? []).includes('Probe Joinery S44P'), 'it joined the studio\'s trades (settings.trades)')
      await itemDlg(p).getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      // bulk Set category: the sibling list carries it too
      await go(p, '/company/price-book'); await listView(p)
      const tick = p.getByRole('checkbox', { name: 'Select Electrical point, new' })
      if (await tick.count()) {
        await tick.click({ force: true }); await settle(p, 300)
        await p.getByText('Set category', { exact: true }).click(); await settle(p, 400)
        const bd = p.getByRole('dialog', { name: 'Set category' })
        await bd.getByRole('combobox', { name: 'Category' }).click(); await settle(p, 300)
        ok(await p.getByTestId('new-category-row').isVisible(), 'bulk Set category ends on "New category…" too')
        await shot(p, '03b-bulk-new-category-1440')
        await p.keyboard.press('Escape'); await settle(p, 200)
        await bd.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 300)
      } else ok(false, 'the list has a selection box to tick')
      // a Designer: the row says why
      as('germaine')
      const g = await page(await desk(), 'designer')
      await go(g, '/company/price-book')
      const gd = await openNew(g)
      await gd.getByRole('combobox', { name: 'Category' }).click(); await settle(g, 300)
      const row = g.getByTestId('new-category-row')
      ok(await row.getAttribute('aria-disabled') === 'true' && /Only an Owner or an Admin changes the studio’s trades/.test(await row.innerText()), 'a Designer sees "New category…" with the trades rule under it')
      await row.click({ force: true }); await settle(g, 300)
      ok(await g.getByRole('dialog', { name: 'New category' }).count() === 0, 'and pressing it opens nothing')
      await shot(g, '04-new-category-designer-1440')
      await g.close()
      as('dane')
    }

    // ── 3 · row 264: the message names the match, the entry lights up ──────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · row 264 — "Already in the list as …" and the matched trade lights up')
      await go(p, '/settings?section=quotes')
      const card = p.getByTestId('trades'); await card.waitFor()
      const add = card.getByRole('textbox', { name: 'Add a trade' })
      await add.fill('carpentry'); await settle(p, 200)
      ok(/Already in the list as “Carpentry”/.test(await card.innerText()), 'typing "carpentry" says "Already in the list as “Carpentry”"')
      const lit = await card.locator('[data-testid="trade"][data-match]').allInnerTexts()
      ok(lit.length === 1 && lit[0].trim().startsWith('Carpentry'), `the Carpentry entry lights up, and only it (${lit.join(' | ')})`)
      ok(await card.getByRole('button', { name: 'Add', exact: true }).isDisabled(), 'Add waits')
      await card.locator('[data-testid="trade"][data-match]').scrollIntoViewIfNeeded(); await shot(p, '05-trade-matched-1440')
      await add.fill('Carpentry'); await settle(p, 150)
      ok(/Carpentry is already in the list/.test(await card.innerText()), 'typed as listed: the house words, "Carpentry is already in the list"')
      await add.fill(''); await settle(p, 150)
      ok(await card.locator('[data-testid="trade"][data-match]').count() === 0, 'an empty field lights nothing')
      await go(p, '/settings?section=leads')
      const src = p.getByTestId('lead-sources'); await src.waitFor()
      const first = (await src.getByTestId('lead-source').first().innerText()).split('\n')[0].trim()
      await src.getByRole('textbox', { name: /Add a source/ }).fill(first.toLowerCase()); await settle(p, 200)
      ok(first === first.toLowerCase() || (new RegExp(`Already in the list as “${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}”`).test(await src.innerText()) && await src.locator('[data-testid="lead-source"][data-match]').count() === 1), `the sources' list says the same and lights "${first}"`)
      await src.getByRole('textbox', { name: /Add a source/ }).fill('')
    }

    // ── 4 · row 340: merge on rename, with Undo ────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · row 340 — a rename onto another trade merges them; Undo puts it all back')
      const lines0 = sql(`select count(*) from quote_items where category = 'Electrical'`), items0 = sql(`select count(*) from price_book_items where category = 'Electrical'`)
      await go(p, '/settings?section=quotes')
      const card = p.getByTestId('trades'); await card.waitFor()
      // the studio has both: add Electrical Works through the card, give Electrical a note
      await card.getByRole('textbox', { name: 'Add a trade' }).fill('Electrical Works')
      await card.getByRole('button', { name: 'Add', exact: true }).click(); await waitSnack(p, /Electrical Works added/)
      const list0 = trades(), at0 = list0.indexOf('Electrical')
      const elBtn = tradeChip(card, 'Electrical').getByRole('button').first()
      await elBtn.click(); const tdlg = p.getByTestId('trade-dialog'); await tdlg.waitFor()
      await tdlg.getByRole('textbox', { name: 'Note' }).fill('Probe S44P: every point tested before handover')
      await p.getByRole('dialog', { name: 'Trade' }).getByRole('button', { name: 'Save' }).click(); await waitSnack(p, /Note saved for Electrical/)
      ok(notes().electrical === 'Probe S44P: every point tested before handover', 'Electrical carries a note')
      // rename onto Electrical Works (typed in another case) → the question
      await elBtn.click(); await tdlg.waitFor()
      await tdlg.getByRole('textbox').first().fill('electrical works')
      await p.getByRole('dialog', { name: 'Trade' }).getByRole('button', { name: 'Save' }).click(); await settle(p, 900)
      const q = p.getByRole('dialog', { name: 'Merge Electrical into Electrical Works?' })
      ok(await q.isVisible(), 'renaming Electrical to "electrical works" asks "Merge Electrical into Electrical Works?"')
      const qt = await q.innerText()
      ok(new RegExp(`${items0} price book items? and ${lines0} quote lines? move to Electrical Works, and Electrical leaves the trades`).test(qt) && /Electrical Works takes its note\./.test(qt), `it says what moves, from the records: ${qt.split('\n').slice(1).join(' ').slice(0, 160)}`)
      await shot(p, '06-merge-question-1440')
      await q.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 300)
      ok(await tdlg.isVisible() && await tdlg.getByRole('textbox').first().inputValue() === 'electrical works', 'Cancel goes back to the trade with what was typed')
      ok(sql(`select count(*) from quote_items where category = 'Electrical'`) === lines0 && trades().includes('Electrical'), 'and nothing moved')
      // a member who may not: the rule, on the field
      as('germaine')
      await p.getByRole('dialog', { name: 'Trade' }).getByRole('button', { name: 'Save' }).click(); await settle(p, 900)
      ok(/Only an Owner or an Admin changes the studio’s trades/.test(await tdlg.innerText()), 'a member who may not merge is told the rule on the Name field')
      as('dane')
      await p.getByRole('dialog', { name: 'Trade' }).getByRole('button', { name: 'Save' }).click(); await settle(p, 900)
      await p.getByRole('dialog', { name: 'Merge Electrical into Electrical Works?' }).getByRole('button', { name: 'Merge' }).click()
      const said = await waitSnack(p, /merged into/)
      ok(new RegExp(`Electrical merged into Electrical Works — ${items0} price book items? and ${lines0} quote lines? moved`).test(said), `the snackbar: "${said.slice(0, 120)}"`)
      ok(/Undo/.test(said), 'with Undo')
      ok(sql(`select count(*) from quote_items where lower(category) = 'electrical'`) === '0' && sql(`select count(*) from quote_items where category = 'Electrical Works'`) === lines0, 'every Electrical quote line is on Electrical Works')
      ok(sql(`select count(*) from price_book_items where lower(category) = 'electrical'`) === '0' && sql(`select count(*) from price_book_items where category = 'Electrical Works'`) === items0, 'the price book item moved too')
      const after = trades()
      ok(!after.includes('Electrical') && after.includes('Electrical Works'), 'Electrical left the trades')
      ok(notes()['electrical works'] === 'Probe S44P: every point tested before handover' && !notes().electrical, 'Electrical Works took the note it had none of')
      await settle(p, 500)   // the dialogs' exit
      const closed = await p.getByRole('dialog').count(), chips = await tradeChip(card, 'Electrical').count()
      ok(closed === 0 && chips === 0, `both dialogs closed; the card lists one trade (dialogs ${closed}, Electrical tokens ${chips})`)
      await shot(p, '07-merged-1440')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).last().click()
      ok(/Electrical is back/.test(await waitSnack(p, /is back/)), 'Undo: "Electrical is back"')
      await until(() => sql(`select count(*) from quote_items where category = 'Electrical'`) === lines0)
      ok(sql(`select count(*) from quote_items where category = 'Electrical'`) === lines0 && sql(`select count(*) from price_book_items where category = 'Electrical'`) === items0, 'every record is back on Electrical')
      ok(trades().indexOf('Electrical') === at0, `Electrical is back in its place (${trades().indexOf('Electrical')} = ${at0})`)
      ok(notes().electrical === 'Probe S44P: every point tested before handover' && !notes()['electrical works'], 'the notes are as they were')
      ok(await tradeChip(card, 'Electrical').count() === 1, 'the card lists Electrical again')
    }

    // ── 5 · row 341: the Category filter counts a case variant once ────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · row 341 — the Price book\'s Category filter collapses case variants')
      sql(`update price_book_items set category = 'tiling' where id = 'pb-tiles-sbh'`)
      await go(p, '/company/price-book'); await listView(p)
      await p.getByRole('button', { name: 'Filters', exact: true }).click()
      const f = p.getByTestId('library-facets'); await f.waitFor()
      await f.getByRole('combobox', { name: 'Category' }).click(); await settle(p, 300)
      const opts = (await p.getByRole('option').allInnerTexts()).map((x) => x.trim())
      ok(opts.filter((o) => o.toLowerCase() === 'tiling').length === 1 && opts.includes('Tiling'), `one Tiling entry, the trades' spelling (${opts.join(' | ')})`)
      await p.getByRole('option', { name: 'Tiling', exact: true }).click(); await settle(p, 500)
      await shot(p, '08-category-filter-1440')
      await p.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: 'Done' }).click(); await settle(p, 400)
      const shown = (await p.getByTestId('library-row').allInnerTexts()).filter((t) => /Homogeneous tiles 600×600/.test(t)).length
      ok(shown === 2, `it finds both spellings' items (${shown} rows)`)
      sql(`update price_book_items set category = 'Tiling' where id = 'pb-tiles-sbh'`)
    }

    // ── 6 · widths ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · 390 / 768 touch and 320 — inside the screen, no page errors')
      const item = sql(`select id from price_book_items where id = 'pb-tiles-hafary'`)
      for (const [w, h] of [[390, 844], [768, 1024]]) {
        const pc = await touch(w, h); const q = await page(pc, `touch-${w}`)
        await go(q, `/company/price-book?open=${item}`)
        const dlg = q.getByTestId('item-dialog'); await dlg.waitFor(); await settle(q, 700)
        const trio = dlg.getByTestId('item-prices'); await trio.scrollIntoViewIfNeeded()
        const tops = await trio.locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
        ok(w < 768 ? new Set(tops).size === 3 : new Set(tops).size === 1, `${w}: the three price boxes ${w < 768 ? 'stack' : 'share a row'}`)
        ok(await inside(trio, w), `${w}: the prices sit inside the screen`)
        await shot(q, `09-item-prices-${w}`)
        await dlg.getByRole('combobox', { name: 'Category' }).scrollIntoViewIfNeeded()
        await dlg.getByRole('combobox', { name: 'Category' }).click(); await settle(q, 500)
        await q.getByTestId('new-category-row').scrollIntoViewIfNeeded(); await q.getByTestId('new-category-row').click(); await settle(q, 700)
        const nc = q.getByRole('dialog', { name: 'New category' })
        ok(await nc.isVisible() && await inside(nc, w), `${w}: New category opens inside the screen, over the item`)
        await shot(q, `10-new-category-${w}`)
        await nc.getByRole('button', { name: 'Cancel' }).click(); await settle(q, 400)
        ok(await sideways(q) <= 0, `${w}: no sideways scroll (${await sideways(q)})`)
        await go(q, '/settings?section=quotes')
        const card = q.getByTestId('trades'); await card.waitFor()
        await card.getByRole('textbox', { name: 'Add a trade' }).fill('masonry'); await settle(q, 200)
        ok(/Already in the list as “Masonry”/.test(await card.innerText()) && await card.locator('[data-testid="trade"][data-match]').count() === 1, `${w}: the trades say the match and light it`)
        await card.locator('[data-testid="trade"][data-match]').scrollIntoViewIfNeeded(); await shot(q, `11-trades-match-${w}`)
        ok(await sideways(q) <= 0, `${w}: Settings › Trades has no sideways scroll`)
        await pc.close()
      }
      const pc = await touch(320, 640); const q = await page(pc, 'touch-320')
      await go(q, `/company/price-book?open=${item}`); await q.getByTestId('item-dialog').waitFor(); await settle(q, 600)
      ok(await sideways(q) <= 0 && await inside(q.getByTestId('item-prices'), 320), '320: the item dialog and its prices fit')
      await go(q, '/settings?section=quotes')
      ok(await sideways(q) <= 0, '320: Settings › Quotes & pricing fits')
      await pc.close()
    }

    ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' / ') : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    if (kept.length) putBack()
    await b.close()
    const back = sql(`select count(*) from price_book_items where name like 'Probe S44P%'`) === '0' && !(trades() ?? []).includes('Probe Joinery S44P') && sql(`select id from members where is_you = 1`) === you0
    console.log(back ? '  ✓ the scratch DB is as it was' : '  ✗ the scratch DB was not put back')
    if (back) pass++; else fail++
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
