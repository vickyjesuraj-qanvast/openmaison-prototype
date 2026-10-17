// Pending modules, step S12 · Price book leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:price-book). Each pending line asserted as the rule it builds, never another round's count:
//  1. matching quote lines to My Items, by 1.0's rule (no model): an uploaded quote's lines that surely match an item take its cost at once —
//     the client's price kept, its vendor filled — and the snackbar says how many; never one the item's cost would put below cost
//  2. the Items table's *Match N lines* (shown only while a line matches) opens the review: a close match starts ticked unless its price is
//     far off (then it says how far), lines no item matches can be added to My Items; Apply writes in one step; Undo puts every line back and
//     takes the new entries out again
//  3. a Designer reaches the same review from Maison AI; what they add is proposed (REG-652) and the reviewers hear once; Undo withdraws it
//  4. the waste factor on the item: Waste (%) on a Purchase item (none on Labour), 0–50, kept in History; the export carries it and an
//     import reads it back
//  5. Order from the quote and a PO's Add from the quote order the quoted quantity plus the item's waste, rounded up, and say so; the
//     client's share stays on the quoted quantity
//  6. bulk Set vendor and the import's vendor pick from Company › Finance › Vendors; a name typed in another case is spelt as the directory does
//  7. 390 and 320: the review, the item dialog and the order list inside the screen (against screen.width); no page errors
// The kept lines (market rates and drift, the old .xls, volume tiers) have nothing to press. Run against `next start` on a scratch copy of
// the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s12.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s12')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s12-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const id = (q) => sql(q).split('\n')[0]
/* the demo's records */
const SERENA = id(`select id from leads where name = 'Serena Koh' and deleted_at is null`)   // Germaine's lead (Quote Sent)
const VINYL = id(`select id from price_book_items where name = 'Vinyl flooring, supply and install' and deleted_at is null`)
const PAINT = id(`select id from price_book_items where name = 'Painting, whole unit' and deleted_at is null`)
const BEN = id(`select id from projects where number = 'P-2026-002'`)   // Benjamin Han — his signed quote's vinyl is on no PO yet
const BEN_VINYL = id(`select i.id from quote_items i join projects p on p.quote_id = i.quote_id where p.number = 'P-2026-002' and i.name like 'Vinyl flooring%'`)
const UPLOAD = ['Item,Category,Qty,Unit,Rate', '"Vinyl flooring, supply and install",Flooring,500,sqft,7.00', '"Painting to the entire unit, Dulux",Painting,1,Lot,1900', 'Lay homogeneous floor tiles,Wet Works,200,sqft,9.00', '"Wardrobe, master bedroom",Carpentry,12,ft run,380', '"Electrical point, new",Electrical,10,point,40.00'].join('\n')
const IMPORT = ['Item,Kind,Unit,Cost,Waste %', 'Probe tile S12,Purchase,sqft,4.20,12'].join('\n')
const TABLES = ['quotes', 'quote_items', 'quote_payments', 'quote_versions', 'quote_files', 'price_book_items', 'price_book_changes', 'notifications', 'notification_outbox', 'credit_ledger', 'studio_credit_balances', 'purchase_orders', 'purchase_order_lines', 'lead_events', 'lead_tasks', 'vendors', 'settings', 'leads', 'projects']

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1200) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' / ').replace(/\s+/g, ' ')   // the house host (an editor's "Saved" is a status too)
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); let t = ''; while (Date.now() - t0 < ms) { t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(150) } return t }
  const undo = async (p) => { await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800) }
  const cells = (line) => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, -1)
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const inside = async (p, loc, w) => { const bb = await loc.boundingBox(); return !!bb && bb.x >= -1 && bb.x + bb.width <= w + 1 }
  const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 200)) } return fn() }

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
  let Q = null   // the uploaded quote

  try {
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')
    /* open one page and wait before any snapshot (the probe habit after S08) */
    await go(p, '/company/price-book')
    kept = TABLES.map((t) => [t, json(`select * from ${t}`)])
    ok(sql(`select waste_pct from price_book_items where id = '${VINYL}'`) === '5.0' && sql(`select count(*) from price_book_items where waste_pct = 10 and id in ('pb-tiles-hafary','pb-tiles-sbh')`) === '2', 'R114: the vinyl orders 5% on top, the 600×600 tiles 10% (both vendors)')

    // ── 1 · an upload's sure matches take their cost ─────────────────────────────────────────────────────────────────────────────
    if (want(1) || want(2) || want(3)) {
      console.log('1 · Upload a quote: the lines My Items surely knows take its cost — the price kept')
      await go(p, `/leads/${SERENA}/quotes`)
      await p.getByRole('button', { name: 'Create Quote' }).first().click()
      await p.getByTestId('create-quote').waitFor()
      await p.getByTestId('upload-quote-file').setInputFiles({ name: 'serena-old-quote.csv', mimeType: 'text/csv', buffer: Buffer.from(UPLOAD) })
      await p.getByTestId('upload-quote').waitFor(); await settle(p, 1500)
      const box = await p.getByTestId('upload-quote').innerText()
      ok(/5 lines/.test(box) && /A line that is in My Items takes its cost from there/.test(box), 'the reading says what a match will do before the press')
      await shot(p, '01-upload-read-1440')
      await p.getByRole('button', { name: 'Create the quote' }).click()
      await p.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 20000 }); await p.getByTestId('quote-editor').waitFor(); await settle(p, 1500)
      Q = /\/quotes\/([0-9a-f-]{36})/.exec(p.url())[1]
      ok(/Quote created with 5 lines — 1 took its cost from My Items/.test(await waitSnack(p, /Quote created/)), 'the snackbar: "Quote created with 5 lines — 1 took its cost from My Items"')
      const v = json(`select price_book_item_id, cost_minor, markup_minor, vendor from quote_items where quote_id = '${Q}' and name like 'Vinyl flooring%'`)[0] ?? {}
      ok(v.price_book_item_id === VINYL && v.cost_minor === 550 && v.cost_minor + v.markup_minor === 700 && v.vendor === 'Floor Xpert Pte Ltd', `the vinyl line points at My Items' vinyl, costs its S$5.50, still sells at S$7.00, and names its vendor (${JSON.stringify(v)})`)
      ok(sql(`select count(*) from quote_items where quote_id = '${Q}' and kind = 'item' and name in ('Painting to the entire unit, Dulux', 'Lay homogeneous floor tiles', 'Wardrobe, master bedroom') and price_book_item_id is null and markup_minor = 0`) === '3', 'the three lines no item surely matches keep their price as their cost, untouched')
      ok(sql(`select price_book_item_id is null and cost_minor = 4000 and markup_minor = 0 from quote_items where quote_id = '${Q}' and name = 'Electrical point, new'`) === '1', 'a sure match whose cost (S$55) would sell the S$40 line below cost is never filled by itself')
    }

    // ── 2 · the review ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (Q && want(2)) {
      console.log('2 · Match lines: the review, its ticks, Apply in one step, Undo')
      const link = p.getByTestId('match-link')
      ok(await link.count() === 1 && /^Match 3 lines$/.test((await link.innerText()).trim()), `the Items table offers "Match 3 lines" beside Price book (${await link.innerText().catch(() => 'none')})`)
      await link.scrollIntoViewIfNeeded(); await shot(p, '02-match-link-1440')
      await link.click(); await settle(p, 700)
      const dlg = p.getByRole('dialog', { name: 'Match lines to the Price book' })
      ok(await dlg.isVisible(), 'the review opens over the editor')
      const rows = dlg.getByTestId('match-row')
      const paint = rows.filter({ hasText: 'Painting to the entire unit' }), tiles = rows.filter({ hasText: 'Lay homogeneous floor tiles' })
      const elec = rows.filter({ hasText: 'Electrical point, new' })
      ok(await elec.getAttribute('data-tier') === 'sure' && await elec.getAttribute('data-selected') === null && /Below cost/.test(await elec.innerText()), 'a sure match that would sell below cost says "Below cost" and waits unticked')
      ok(await rows.count() === 3 && await paint.getAttribute('data-tier') === 'close' && /close match/i.test(await paint.innerText()) && /My Items: Painting, whole unit/.test(await paint.innerText()), 'a close match says so and names the item it reads like')
      ok(await paint.getAttribute('data-selected') !== null && /Cost S\$1,500\.00 a Lot/.test(await paint.innerText()) && /21\.1% margin/.test(await paint.innerText()), 'its price within 15% of the item\'s: ticked, with the item\'s cost and the margin it leaves')
      ok(await tiles.getAttribute('data-selected') === null && /priced 18% below it/.test(await tiles.innerText()), 'a close match far off in price starts unticked and says how far')
      const fresh = dlg.getByTestId('fresh-row')
      ok(await fresh.count() === 1 && /Wardrobe, master bedroom/.test(await fresh.innerText()) && await fresh.getAttribute('data-selected') === null, 'the line no item matches waits under "Not in My Items yet", unticked')
      ok((await dlg.getByTestId('match-apply').innerText()).trim() === 'Match 1 line', 'the button says what it does: "Match 1 line"')
      await fresh.click(); await settle(p, 200)
      ok((await dlg.getByTestId('match-apply').innerText()).trim() === 'Match 1 · add 1', '…and with the wardrobe ticked: "Match 1 · add 1"')
      await shot(p, '03-match-review-1440')
      await dlg.getByTestId('match-apply').click()
      const said = await waitSnack(p, /1 line took its cost/)
      ok(/1 line took its cost from My Items · 1 added to My Items/.test(said), `the snackbar: "1 line took its cost from My Items · 1 added to My Items" (${said})`)
      await settle(p, 600)
      ok(await dlg.count() === 0 || !(await dlg.isVisible()), 'the review closes once the server has it')
      const pl = json(`select price_book_item_id, cost_minor, markup_minor from quote_items where quote_id = '${Q}' and name like 'Painting to the entire unit%'`)[0] ?? {}
      ok(pl.price_book_item_id === PAINT && pl.cost_minor === 150000 && pl.cost_minor + pl.markup_minor === 190000, `the painting line takes the item's S$1,500 cost and keeps its S$1,900 price (${JSON.stringify(pl)})`)
      const wardrobe = json(`select p.id, p.status, p.cost_minor, p.unit, p.created_by, (select note from price_book_changes c where c.item_id = p.id and c.kind = 'created') note from price_book_items p where p.name = 'Wardrobe, master bedroom'`)
      ok(wardrobe.length === 1 && wardrobe[0].status === 'live' && wardrobe[0].cost_minor === 38000 && wardrobe[0].unit === 'ft run' && wardrobe[0].created_by === 'dane' && /Saved from quote line/.test(wardrobe[0].note ?? ''), 'the wardrobe joins My Items as Dane\'s, live, with its History line')
      ok(sql(`select price_book_item_id from quote_items where quote_id = '${Q}' and name = 'Wardrobe, master bedroom'`) === (wardrobe[0]?.id ?? '-'), '…and its line points at it')
      ok(sql(`select price_book_item_id is null from quote_items where quote_id = '${Q}' and name = 'Lay homogeneous floor tiles'`) === '1', 'the unticked tiles line is left as it was')
      ok(/^Match 2 lines$/.test((await p.getByTestId('match-link').innerText().catch(() => '')).trim()), 'the link now counts the two matches left')
      await undo(p)
      ok(/Match undone/.test(await waitSnack(p, /Match undone/)), 'Undo: "Match undone"')
      ok(await until(() => sql(`select count(*) from price_book_items where name = 'Wardrobe, master bedroom'`) === '0'), 'Undo takes the new entry out of My Items again')
      const back = json(`select price_book_item_id, cost_minor, markup_minor from quote_items where quote_id = '${Q}' and name like 'Painting to the entire unit%'`)[0] ?? {}
      ok(back.price_book_item_id === null && back.cost_minor === 190000 && back.markup_minor === 0, `…and puts the painting line back as it was (${JSON.stringify(back)})`)
    }

    // ── 3 · a Designer, from Maison AI ───────────────────────────────────────────────────────────────────────────────────────────
    if (Q && want(3)) {
      console.log('3 · A Designer reaches the review from Maison AI; what she adds is proposed')
      as('germaine')
      const before = Number(sql(`select count(*) from notifications where kind = 'price_book_proposed'`))
      await go(p, `/quotes/${Q}`)
      await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700)
      const sheet = p.getByRole('dialog', { name: 'Maison AI suggestions' })
      const sug = sheet.getByRole('button', { name: /3 lines match items in My Items — take their cost/ })
      ok(await sug.count() === 1, 'Maison AI: "3 lines match items in My Items — take their cost"')
      ok(/Check the margins|under a 10% margin|below cost|no price yet/.test(await sheet.innerText()), '…beside the margin hints, never in their place')
      await shot(p, '04-maison-ai-1440')
      await sug.click(); await settle(p, 900)
      const dlg = p.getByRole('dialog', { name: 'Match lines to the Price book' })
      ok(await dlg.isVisible() && /proposed for it — an Owner or an Admin approves it/.test(await dlg.innerText()), 'the press opens the review, which says her additions are proposed')
      await dlg.getByTestId('match-row').filter({ hasText: 'Painting to the entire unit' }).click(); await settle(p, 150)   // untick the match
      await dlg.getByTestId('fresh-row').click(); await settle(p, 150)
      ok((await dlg.getByTestId('match-apply').innerText()).trim() === 'Propose 1 for My Items', 'only an addition ticked: "Propose 1 for My Items"')
      await dlg.getByTestId('match-apply').click()
      ok(/1 proposed for My Items/.test(await waitSnack(p, /proposed for My Items/)), 'the snackbar: "1 proposed for My Items"')
      const prop = json(`select id, status, created_by from price_book_items where name = 'Wardrobe, master bedroom'`)
      ok(prop.length === 1 && prop[0].status === 'proposed' && prop[0].created_by === 'germaine', 'the wardrobe waits as Germaine\'s proposal (REG-652)')
      const heard = json(`select member_id, title from notifications where kind = 'price_book_proposed' order by created_at desc limit ${Math.max(1, Number(sql(`select count(*) from notifications where kind = 'price_book_proposed'`)) - before)}`)
      ok(heard.length >= 1 && heard.every((n) => /Germaine proposed “Wardrobe, master bedroom” for My Items/.test(n.title)) && new Set(heard.map((n) => n.member_id)).size === heard.length && heard.every((n) => ['dane', 'huimin'].includes(n.member_id)), `the Owners and Admins hear once each, by name (${heard.map((n) => n.member_id).join(', ')})`)
      await undo(p)
      ok(await until(() => sql(`select count(*) from price_book_items where name = 'Wardrobe, master bedroom'`) === '0'), 'her Undo withdraws her proposal')
      as('dane')
    }

    // ── 5 · Order from the quote orders the waste ────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Order from the quote and Add from the quote order the waste on top')
      await go(p, `/projects/${BEN}/money`)
      await p.getByTestId('money-new').click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /^Order from the quote/ }).click(); await settle(p, 1200)
      const od = p.getByRole('dialog', { name: 'Order from the quote' })
      const line = od.getByTestId('order-line').filter({ hasText: 'Vinyl flooring' })
      ok(/1,037 sqft · 987 on the quote \+5% waste/.test(await line.innerText()), `the vinyl line orders 1,037 sqft: 987 on the quote +5% waste, rounded up (${(await line.innerText()).replace(/\s+/g, ' ')})`)
      ok(!/waste/.test(await od.getByTestId('order-line').filter({ hasText: 'Painting, whole unit' }).innerText()), 'a line whose item carries no waste orders the quote\'s quantity, nothing said')
      await line.scrollIntoViewIfNeeded(); await shot(p, '05-order-waste-1440')
      await line.click(); await settle(p, 200)
      await od.getByTestId('order-make').click()
      ok(/is a Draft/.test(await waitSnack(p, /Draft/)), 'one Draft PO is made')
      ok(await until(() => sql(`select l.qty from purchase_order_lines l join purchase_orders o on o.id = l.po_id where l.quote_item_id = '${BEN_VINYL}' and o.status = 'draft'`) === '1037.0'), 'its line orders 1,037 sqft')
      await undo(p)
      ok(await until(() => sql(`select count(*) from purchase_order_lines l join purchase_orders o on o.id = l.po_id where l.quote_item_id = '${BEN_VINYL}' and o.deleted_at is null`) === '0'), 'Undo takes the Draft back')
      await go(p, `/projects/${BEN}/money`)
      await p.getByTestId('money-new').click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /^Purchase order/ }).click(); await settle(p, 900)
      const po = p.locator('[role="dialog"][aria-label="New purchase order"]')
      await po.getByTestId('po-from-quote').click(); await settle(p, 700)
      const ql = p.getByTestId('po-quote-lines').getByTestId('po-quote-line').filter({ hasText: 'Vinyl flooring' })
      ok(/1,037 sqft · 987 on the quote \+5% waste/.test(await ql.innerText()), 'Add from the quote says the same')
      await ql.click(); await p.getByTestId('po-quote-add').click(); await settle(p, 500)
      const vals = await po.getByTestId('po-line').last().locator('input').evaluateAll((els) => els.map((e) => e.value))
      ok(vals.includes('1037'), `the PO line takes 1,037 (${vals.join(' | ')})`)
      const against = await po.getByTestId('po-against-quote').innerText().catch(() => '')
      const price = Number(sql(`select round((cost_minor + markup_minor) * (1 - discount_pct / 100.0)) from quote_items where id = '${BEN_VINYL}'`))
      const client = Math.round(987 * price)
      ok(against.replace(/\s+/g, ' ').includes(`S$${(client / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), `the client's share stays on the 987 quoted (${against.replace(/\s+/g, ' ').slice(0, 120)})`)
      await po.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 500)
    }

    // ── 4 · the waste on the item ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Waste (%) on the item: Purchase items only, 0–50, History, export and import')
      await go(p, '/company/price-book')
      await p.getByRole('button', { name: 'Edit Vinyl flooring, supply and install' }).first().click(); await settle(p, 700)
      let dlg = p.getByRole('dialog', { name: 'Edit item' })
      const field = dlg.getByLabel('Waste (%)')
      ok(await field.inputValue() === '5' && /A PO from the quote orders 105 sqft for every 100 quoted/.test(await dlg.innerText()), 'the vinyl shows its 5% and what it orders: "A PO from the quote orders 105 sqft for every 100 quoted"')
      await field.fill('8'); await settle(p, 200)
      await shot(p, '06-item-waste-1440')
      await dlg.getByRole('button', { name: 'Save', exact: true }).click()
      ok(/Item saved/.test(await waitSnack(p, /Item saved/)), 'saved')
      ok(await until(() => sql(`select waste_pct from price_book_items where id = '${VINYL}'`) === '8.0'), '8% kept on the item')
      ok(/"wastePct":\[5,8\]/.test(sql(`select changes from price_book_changes where item_id = '${VINYL}' and kind = 'edited' order by at desc limit 1`)), 'History keeps "Waste 5% → 8%"')
      await settle(p, 500)
      await p.getByRole('button', { name: 'Edit Vinyl flooring, supply and install' }).first().click(); await settle(p, 900)
      dlg = p.getByRole('dialog', { name: 'Edit item' })
      ok(/Waste 5% → 8%/.test(await dlg.getByTestId('item-history').innerText()), 'the item\'s History reads "Waste 5% → 8%"')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      await p.getByRole('button', { name: 'Edit Painting, whole unit' }).first().click(); await settle(p, 700)
      dlg = p.getByRole('dialog', { name: 'Edit item' })
      ok(await dlg.getByLabel('Waste (%)').count() === 0, 'a Labour item has no Waste (%) — nothing is ordered for it')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      await p.getByRole('button', { name: 'Edit Vinyl flooring, supply and install' }).first().click(); await settle(p, 700)
      dlg = p.getByRole('dialog', { name: 'Edit item' })
      await dlg.getByLabel('Waste (%)').fill('60'); await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 500)
      ok(/Up to 50%/.test(await dlg.innerText()) && await dlg.isVisible(), '60% is refused under the field — 1.0\'s 50% ceiling — and the dialog stays')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      /* a Waste column in Column settings, off until turned on */
      await p.getByRole('button', { name: 'Column settings' }).first().click(); await settle(p, 600)
      const drawer = p.getByRole('dialog', { name: 'Column settings' })
      const sw = drawer.getByRole('switch', { name: 'Show Waste column' }).or(drawer.getByLabel('Show Waste column'))
      ok(await sw.count() >= 1 && !(await sw.first().isChecked()), 'Column settings lists a Waste column, off until turned on')
      ok(await p.getByRole('columnheader', { name: /^Waste/ }).count() === 0, '…and the list doesn\'t show it by default')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* the export carries it */
      await p.getByRole('button', { name: 'More options', exact: true }).last().click()
      await p.getByRole('menuitem', { name: 'Export My Items…' }).click()
      const ex = p.getByRole('dialog', { name: 'Export My Items' }); await ex.waitFor()
      const [dl] = await Promise.all([p.waitForEvent('download'), ex.getByRole('button', { name: 'Export' }).click()])
      const csv = fs.readFileSync(await dl.path(), 'utf8').split(/\r?\n/)
      const head = cells(csv[0].replace(/^\uFEFF/, '')), wi = head.indexOf('Waste %'), vinylRow = csv.map(cells).find((r) => r[0] === 'Vinyl flooring, supply and install')
      ok(/^Item,Kind,Description,Unit,Cost,Markup,Unit price,Waste %,Category/.test(head.join(',')) && wi > 0 && vinylRow?.[wi] === '8', `the export has a Waste % column, the vinyl's 8 in it (${vinylRow?.[wi]})`)
      await settle(p, 600)
      /* the import reads it back; its vendor picks from the directory */
      await p.getByTestId('new-template').click(); await p.getByRole('menuitem', { name: 'Import from a spreadsheet…' }).click(); await p.getByTestId('import-dialog').waitFor()
      await p.getByTestId('import-dialog').getByLabel('Vendor (optional)').fill('haf'); await settle(p, 400)
      ok(/Hafary/.test(await p.getByTestId('import-vendor-list').innerText().catch(() => '')), '6 · the import\'s Vendor lists Company › Finance › Vendors as you type ("haf" → Hafary)')
      await p.getByTestId('import-dialog').getByLabel('Vendor (optional)').fill(''); await p.keyboard.press('Tab'); await settle(p, 300)   // focus leaves the field: its list shuts
      await p.getByTestId('import-dialog').locator('input[type=file]').setInputFiles({ name: 'probe-s12.csv', mimeType: 'text/csv', buffer: Buffer.from(IMPORT) }); await settle(p, 1200)
      const map = p.getByRole('dialog', { name: 'Import into My Items' }); await map.waitFor()
      ok(/Waste %/.test(await map.innerText()), 'the mapping reads the Waste % column by its name')
      await map.getByRole('button', { name: 'Import 1 row' }).click()
      ok(/1 item added/.test(await waitSnack(p, /item added/)), '"1 item added"')
      ok(await until(() => sql(`select waste_pct from price_book_items where name = 'Probe tile S12'`) === '12.0'), 'it lands with its 12% waste')
      await undo(p)
      ok(await until(() => sql(`select count(*) from price_book_items where name = 'Probe tile S12'`) === '0'), 'Undo takes the import back')
    }

    // ── 6 · bulk Set vendor from the directory ───────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Bulk Set vendor picks from Company › Finance › Vendors')
      const NAME = 'Painting, whole unit'   // at the top of My Items (the wet works sit in their folder, R59)
      const v0 = sql(`select coalesce(vendor, '') from price_book_items where name = '${NAME}'`)
      await go(p, '/company/price-book')
      await p.getByRole('checkbox', { name: `Select ${NAME}` }).click({ force: true }); await settle(p, 300)
      await p.getByText('Set vendor', { exact: true }).click()
      const d = p.getByRole('dialog', { name: 'Set vendor' }); await d.waitFor()
      await d.getByLabel('Vendor', { exact: true }).fill('floor x'); await settle(p, 400)
      const list = p.getByTestId('bulk-vendor-list')
      ok(await list.getByRole('menuitemradio', { name: /Floor Xpert Pte Ltd/ }).count() === 1, 'typing "floor x" offers Floor Xpert Pte Ltd from the directory')
      await shot(p, '07-bulk-vendor-1440')
      await list.getByRole('menuitemradio', { name: /Floor Xpert Pte Ltd/ }).click(); await settle(p, 200)
      await d.getByRole('button', { name: 'Apply to 1 item' }).click()
      ok(/1 item changed/.test(await waitSnack(p, /item changed/)), '"1 item changed"')
      ok(await until(() => sql(`select vendor from price_book_items where name = '${NAME}'`) === 'Floor Xpert Pte Ltd'), 'the item names Floor Xpert Pte Ltd')
      await undo(p)
      ok(await until(() => sql(`select coalesce(vendor, '') from price_book_items where name = '${NAME}'`) === v0), 'Undo puts its vendor back')
      await go(p, '/company/price-book')
      await p.getByRole('checkbox', { name: `Select ${NAME}` }).click({ force: true }); await settle(p, 300)
      await p.getByText('Set vendor', { exact: true }).click()
      const d2 = p.getByRole('dialog', { name: 'Set vendor' }); await d2.waitFor()
      await d2.getByLabel('Vendor', { exact: true }).fill('floor xpert'); await settle(p, 300)
      await d2.getByText('1 item', { exact: true }).click(); await settle(p, 200)   // away from the list, then Apply
      await d2.getByRole('button', { name: 'Apply to 1 item' }).click()
      ok(await until(() => sql(`select vendor from price_book_items where name = '${NAME}'`) === 'Floor Xpert Pte Ltd'), 'a name typed in another case lands as the directory spells it')
    }

    // ── 7 · phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · 390 and 320 — inside the screen')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h)
        const q = await page(pc, `phone-${w}`)
        if (Q) {
          await go(q, `/quotes/${Q}`)
          const link = q.getByTestId('match-link')
          ok(await link.count() >= 1, `${w}: the Items cards offer Match lines too`)
          if (await link.count()) {
            await link.first().scrollIntoViewIfNeeded(); await link.first().click(); await settle(q, 900)
            const dlg = q.getByRole('dialog', { name: 'Match lines to the Price book' })
            ok(await dlg.isVisible() && await inside(q, dlg, w) && await sideways(q) <= 0, `${w}: the review is a sheet inside the screen`)
            if (w === 390) await shot(q, '08-match-review-390')
            await q.keyboard.press('Escape'); await settle(q, 400)
          }
          ok(await sideways(q) <= 0, `${w}: the quote editor has no sideways scroll`)
        }
        await go(q, '/company/price-book')
        await q.getByRole('button', { name: 'Edit Vinyl flooring, supply and install' }).first().click(); await settle(q, 900)
        const idlg = q.getByRole('dialog', { name: 'Edit item' })
        await idlg.getByLabel('Waste (%)').scrollIntoViewIfNeeded()
        ok(await idlg.getByLabel('Waste (%)').isVisible() && await sideways(q) <= 0, `${w}: the item dialog with its Waste (%) fits`)
        if (w === 390) await shot(q, '09-item-waste-390')
        await q.keyboard.press('Escape'); await settle(q, 400)
        await go(q, `/projects/${BEN}/money`)
        await q.getByTestId('money-new').click(); await settle(q, 500)
        await q.getByRole('menuitem', { name: /^Order from the quote/ }).click(); await settle(q, 1400)
        const od = q.getByRole('dialog', { name: 'Order from the quote' })
        const vl = od.getByTestId('order-line').filter({ hasText: 'Vinyl flooring' })
        await vl.scrollIntoViewIfNeeded(); await settle(q, 600)   // the list's sticky heads settle before the shot
        ok(/987 on the quote \+\d+% waste/.test(await vl.innerText()) && await sideways(q) <= 0, `${w}: the order list says the waste, inside the screen`)
        if (w === 390) await shot(q, '10-order-waste-390')
        await pc.close()
      }
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    if (kept.length) putBack()
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
