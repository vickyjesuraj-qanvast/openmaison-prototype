// S44T · the template editor and the printed quote — the UAT comments, rows 246–364 (her UAT ask 2026-10-15; triage
// design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md, area T). Each build asserted as the rule it makes:
//  - M1 the table's spacing (rows 252 · 257 · 265 · 266 · 267 · 303) and the heading band's own height; unset = as before
//  - M2 the sub-totals' own style; the Totals and the payment schedule print money as their Currency says
//  - C4 (rows 302 · 306) with the # column first, a section's mark stands in it and its name where the lines' names start
//  - M5 (rows 248 · 322 · 321) a Details row's label / value in bold, boxed cells, General Info's Remarks through {remarks}
//  - M6 (rows 354 · 355 · 310 · 332) (a) marks, the share in its own column / not printed, a fixed row's own word, a Total row with a cell
//    under every column; C5 (row 294) the PayNow QR beside the schedule; the phone's reading cards end with the schedule
//  - 270 notes under the Item column · 329 a note in the heading's band · 309 a column's colour · 324 a dash for a zero quantity ·
//    331 {signed_date} · 363 lines between rows · 284 a trade's lines in the grid's order · 294 a kept version's own look ·
//    293 nothing clipped — a line taller than a page runs on, every line prints once
//  - C1 a section priced after the contract (the row's ⋮): out of the total and the split, printed after the items with its own total
//  - C2's print side: a name's emphasis and the kit's colours print; the allowlist drops what it must; an underline takes its run's colour
//  - M11 no repair writes a studio's own template (R37 only on the seeded three)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s44t.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44t')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol
const REPO = path.join(__dirname, '../../..')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 's44t-'))

/* the demo's records (fixed ids) */
const Q = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'            // OM-10001, Draft — two sections (Bathrooms · Bedrooms) and loose lines
const Q_SIGNED = '1f598389-4008-4079-a956-5dff071fb708'     // OM-10004, Signed
const Q_SENT = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'       // OM-10007, Sent to Client (its confirmation link)
const BATHROOMS = 'd4b8a8e5-0319-40ca-ad7f-2a00a32f1ea9', TILES = 'e4b890c5-b34c-4757-ad4d-8f5f1d5d9110', VANITY = 'f7e9ff9d-f715-4dfb-af6a-87da60c2ecf1'
const WARDROBE = '434b5f15-2d22-48c3-ac7e-dc19903f7cac', STUDY = 'a235e9c0-b451-4682-a69f-5940a31cd5e9', TV = '26c74ac4-04be-4e9e-a85e-143e9c90b7fd', PAINT = 'c89dbab0-dbe9-4979-af40-6a7ff349e0d1'
const PAY1 = 'a3032931-a2f2-4478-ba02-0d3f84bf1fe7'
const TPL = 'probe-s44t-template'
const DEFAULT_TPL = sql(`select id from quote_templates where is_default = 1 and deleted_at is null limit 1`)

/* every row this probe touches, whole — put back column by column */
const BK = []
const backup = (table, where, key = 'id') => { const t = `s44t_bk_${BK.length}`; sql(`drop table if exists ${t}; create table ${t} as select * from ${table} where ${where}`); BK.push({ t, table, where, key }) }
const restoreAll = () => {
  for (const { t, table, where, key } of BK.slice().reverse()) {
    const cols = sql(`select group_concat('"' || name || '"', ',') from pragma_table_info('${table}')`)
    sql(`delete from ${table} where (${where}) and ${key} not in (select ${key} from ${t})`)
    sql(`update ${table} set (${cols}) = (select ${cols} from ${t} where ${t}.${key} = ${table}.${key}) where ${key} in (select ${key} from ${t}); insert or ignore into ${table} select * from ${t}; drop table ${t}`)
  }
}
const writeJson = (name, v) => { const f = path.join(TMP, name); fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v)); return f }

/* The probe's own template: one of each block the rows touch, every new option unset — what a template saved before S44T holds. */
const col = (key, label, on, width, align, extra = {}) => ({ key, label, on, width, align, ...extra })
const baseDesign = () => ({
  page: { paper: 'A4', margins: { top: 18, right: 18, bottom: 18, left: 18 }, watermark: '', dateFormat: 'short' },
  brand: {},
  blocks: [
    { id: 'hd', kind: 'header', height: 24, repeat: 'every', elements: [
      { id: 'hkv', kind: 'kv', x: 100, y: 0, w: 74, rows: [{ id: 'hr1', label: 'Quote no.', value: '{quote_number}' }, { id: 'hr2', label: 'Remark', value: '{remarks}' }], labelWidth: 22, style: { role: 'body' }, labelStyle: { role: 'body' }, lines: 'none', gap: 1 },
    ] },
    { id: 'dt', kind: 'details', layout: 'columns', labelWidth: 22, style: { role: 'body' }, labelStyle: { role: 'small', color: 'grey' },
      left: [{ id: 'dl1', label: 'Attn', value: '{client_name}' }, { id: 'dl2', label: 'Remarks', value: '{remarks}' }], right: [{ id: 'dr1', label: 'Quote no.', value: '{quote_number}' }] },
    { id: 'it', kind: 'items', groupBy: 'none', subGroupBy: 'none', sectionLabel: 'letters', numbering: 'group', bandStyle: 'grey', groupNotes: true, groupNoteStyle: { role: 'small', italic: true, color: 'grey' }, areaStyle: { role: 'table', weight: 700 },
      columns: [col('no', '#', true, 10, 'center'), col('item', 'Item', true, 0, 'left'), col('qty', 'Qty', true, 14, 'right'), col('unit', 'Unit', false, 16, 'left'), col('qtyUnit', 'Qty · Unit', false, 20, 'right'), col('unitPrice', 'Rate', false, 22, 'right'), col('discount', 'Disc.', false, 14, 'right'), col('optional', 'Optional', false, 24, 'right'), col('total', 'Amount', true, 26, 'right')],
      headerRow: 'ruled', headerStyle: { role: 'small', weight: 700 }, descriptions: 'full', descriptionStyle: { role: 'small', color: 'grey' }, photos: false,
      subtotals: true, subtotalLabel: 'Sub-total for {section}', lumpSum: false, zeroAmount: 'FOC', currency: 'none', grid: false, fillPage: false, ruled: true, zebra: false, density: 'normal', pageTotals: false, pageTotalLabel: 'Total for page {n}',
      keepGroups: false, groupNewPage: false, hiddenItems: 'omit', optionalSection: true, optionalTitle: 'Optional works', style: { role: 'table' } },
    { id: 'tt', kind: 'totals', layout: 'right', width: 76, rules: 'top', style: { role: 'body' }, totalStyle: { role: 'body', weight: 700 }, lines: [{ key: 'subtotal', label: 'Subtotal', on: true }, { key: 'gst', label: 'GST {gst_rate}', on: true }, { key: 'total', label: 'Grand total', on: true }] },
    { id: 'py', kind: 'payments', title: 'Payment schedule', layout: 'table', showAmounts: true, showDue: false, letters: false, style: { role: 'body' }, titleStyle: { role: 'body', weight: 700 }, band: false, showTotal: true },
    { id: 'tx', kind: 'text', html: '<p>Probe words</p><img src=x onerror="window.__s44tText = 1"><script>window.__s44tText = 2</script>', style: { role: 'body' }, box: 'none' },
    { id: 'sg', kind: 'signature', lineWeight: 0.5, lineColor: 'ink', style: { role: 'body' }, headingStyle: { role: 'small', weight: 700 }, columns: [{ id: 'sc1', heading: 'Confirmed & agreed by', lines: ['{client_name}', 'Date: {signed_date}'], image: 'client' }] },
  ],
})
let design = baseDesign()
const block = (id) => design.blocks.find((b) => b.id === id)
const putDesign = () => { const f = writeJson('design.json', design); sql(`update quote_templates set design_json = cast(readfile('${f}') as text), updated_at = strftime('%s','now') where id = '${TPL}'; update quote_template_versions set design_json = cast(readfile('${f}') as text) where template_id = '${TPL}'`) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  backup('quotes', `id in ('${Q}', '${Q_SIGNED}', '${Q_SENT}')`)
  backup('quote_items', `quote_id = '${Q}'`)
  backup('quote_payments', `quote_id = '${Q}'`)
  backup('quote_versions', `quote_id = '${Q}'`)
  backup('settings', `key = 'brand'`, 'key')
  const amount0 = Number(sql(`select amount_minor from quotes where id = '${Q}'`))
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 600) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
  const preview = async (p, id = Q, q = '') => { await go(p, `/quotes/${id}/preview${q}`); await p.waitForSelector('[data-page]', { timeout: 30000 }); await settle(p, 1200) }
  /* the page's zoom: its drawn width against A4's 210 mm */
  const scale = (p) => p.locator('[data-page]').first().evaluate((el) => el.getBoundingClientRect().width / (210 * 96 / 25.4))
  const mmPx = (mm) => mm * 96 / 25.4
  const rect = (l) => l.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right } })
  const style = (l, prop) => l.evaluate((el, pr) => getComputedStyle(el)[pr], prop)

  try {
    sql(`update members set is_you = (id = 'dane')`)
    /* the probe's template, published v1, and OM-10001 printing through it */
    sql(`insert or replace into quote_templates (id, name, kind, is_default, created_at, status, version, paper, design_json, defaults_json, updated_at, updated_by, published_at) select '${TPL}', 'Probe S44T', kind, 0, created_at, 'published', 1, 'A4', design_json, defaults_json, strftime('%s','now'), 'dane', strftime('%s','now') from quote_templates where id = '${DEFAULT_TPL}'`)
    sql(`insert or replace into quote_template_versions (id, template_id, version, design_json, defaults_json, note, published_at, published_by) values ('probe-s44t-v1', '${TPL}', 1, '{}', '{}', 'probe', strftime('%s','now'), 'dane')`)
    putDesign()
    sql(`update quotes set template_id = '${TPL}', template_version = 1, client_view_json = null where id in ('${Q}', '${Q_SIGNED}')`)
    const D = await desk(); const d = await page(D, 'desk')
    const lineIds = sql(`select id from quote_items where quote_id = '${Q}' and kind = 'item'`).split('\n')

    // ── the starting look: nothing set — and C4 ──────────────────────────────────────────────────────────────────────────────────
    console.log('Nothing set prints as before · C4 the section\'s mark in the # column')
    await preview(d)
    const band = d.locator('tr[data-band]').first()
    const markCell = band.locator('td[data-band-mark]')
    ok(await markCell.count() === 1 && (await text(markCell)) === 'A' && (await style(markCell, 'textAlign')) === 'center', 'C4: the first section\'s mark “A” stands in the # column, in its alignment (centre)')
    const nameTd = band.locator('td').nth(1)
    const firstLineName = d.locator(`tr[data-line-id="${TILES}"] td`).nth(1)
    ok(near((await rect(nameTd)).left, (await rect(firstLineName)).left), 'C4: the section\'s name starts where the lines\' names start')
    /* (handed over by S44Q) a Text block's words keep only the allowlist's markup — on every read, so a design stored before is harmless too */
    ok(/Probe words/.test(await text(d.locator('[data-page]').first().locator('xpath=..'))) && await d.locator('[data-page] script').count() === 0 && await d.locator('[data-page] img[onerror]').count() === 0 && await d.evaluate(() => window.__s44tText === undefined), 'a Text block prints its words; a script or a handler stored in it never reaches the page')
    const printedIds = await d.$$eval('tr[data-line-id]', (rs) => rs.map((r) => r.getAttribute('data-line-id')))
    ok(lineIds.every((id) => printedIds.filter((x) => x === id).length === 1) && printedIds.length === lineIds.length, `row 293: every counted line prints once (${printedIds.length} of ${lineIds.length})`)
    const sum = d.locator('tr[data-sum]').first()
    ok((await style(sum.locator('td').first(), 'fontWeight')) === '700', 'M2: unset, a sub-total prints bold as it always did')
    const tilesRow = d.locator(`tr[data-line-id="${TILES}"]`)
    const gap0 = (await rect(tilesRow)).top - (await rect(d.locator('tr[data-note]').first())).bottom
    ok(near(gap0, 0, 1), 'M1: unset, no space between a section\'s note and its first line')
    ok((await style(tilesRow.locator('td').first(), 'borderBottomWidth')) === '1px', 'row 363: a stored template keeps its line under every row')
    ok(/Date:\s*$/.test(await text(d.locator('[class*="sigCol"]').first())) || (await text(d.locator('[class*="sigCol"]').first())).endsWith('Date:'), 'row 331: an unsigned quote prints “Date:” with nothing after it')
    await shot(d, 'c4-band-1440')

    // ── M1 the table's spacing + the band's own height ───────────────────────────────────────────────────────────────────────────
    console.log('M1 · spacing inside the table, the heading band\'s height')
    Object.assign(block('it'), { spacing: { beforeSection: 6, underHeading: 3, underNote: 2, beforeSub: 4, betweenLines: 1.5 }, headingHeight: 'relaxed' })
    putDesign(); await preview(d)
    const s = await scale(d)
    const bandA = d.locator('tr[data-band]').first(), noteA = d.locator('tr[data-note]').first()
    ok(near((await rect(noteA)).top - (await rect(bandA)).bottom, mmPx(3) * s, 1.5), 'M1: “Under a section heading” 3 mm between the band and its note')
    ok(near((await rect(d.locator(`tr[data-line-id="${TILES}"]`))).top - (await rect(noteA)).bottom, mmPx(2) * s, 1.5), 'M1: “Under a section note” 2 mm between the note and the first line')
    const l1 = await rect(d.locator(`tr[data-line-id="${TILES}"]`)), l2 = await rect(d.locator('tr[data-line-id]').nth(1))
    ok(near(l2.top - l1.bottom, mmPx(1.5) * s, 1.5), 'M1: “Between lines” 1.5 mm between two lines')
    const subA = await rect(d.locator('tr[data-sum]').first()), bandB = await rect(d.locator('tr[data-band]').nth(1))
    ok(near(bandB.top - subA.bottom, mmPx(6) * s, 1.5), 'M1: “Before a section” 6 mm between a section\'s sub-total and the next section')
    ok((await style(bandA.locator('td').first(), 'paddingTop')) === '7px', 'M1: “Section heading height · Roomy” gives the band its own padding')
    await shot(d, 'm1-spacing-1440')

    // ── 270 · 329 notes under the Item column, in the band; 309 a column's colour ─────────────────────────────────────────────────
    console.log('Rows 270 · 329 · 309 · 324 · 363')
    block('it').spacing = undefined; block('it').headingHeight = undefined
    Object.assign(block('it'), { noteWidth: 'item', noteInBand: true })
    block('it').columns[0].color = '#B8860B'
    block('it').zeroQty = 'dash'; block('it').rowLines = 'between'
    sql(`update quote_items set qty = 0 where id = '${PAINT}'`)
    putDesign(); await preview(d)
    const noteTds = d.locator('tr[data-note]').first().locator('td')
    ok(await noteTds.count() > 1 && near((await rect(noteTds.nth(1))).left, (await rect(d.locator(`tr[data-line-id="${TILES}"] td`).nth(1))).left), 'row 270: a section\'s note runs under the Item column only')
    ok((await style(noteTds.nth(1), 'backgroundColor')) === (await style(d.locator('tr[data-band]').first().locator('td').first(), 'backgroundColor')), 'row 329: the note sits in the heading\'s band — the band\'s fill')
    ok((await style(d.locator(`tr[data-line-id="${TILES}"] td`).first(), 'color')) === 'rgb(184, 134, 11)', 'row 309: the # column prints in its own colour')
    ok((await text(d.locator(`tr[data-line-id="${PAINT}"] td`).nth(2))) === '–', 'row 324: a zero quantity prints a dash')
    const lastRow = d.locator('[data-last-row] tr').first()
    ok(await lastRow.count() === 1 && (await style(lastRow.locator('td').first(), 'borderBottomWidth')) === '0px' && (await style(d.locator(`tr[data-line-id="${TILES}"] td`).first(), 'borderBottomWidth')) === '1px', 'row 363: “Between rows” — a line between rows, the table\'s last row bare')
    await shot(d, 'r270-329-309-324-1440')

    // ── M2 sub-totals' style, money as each block's Currency says ─────────────────────────────────────────────────────────────────
    console.log('M2 · money styling')
    block('it').subtotalStyle = { role: 'table', weight: 400 }
    block('tt').currency = '$ '
    block('py').currency = 'none'
    putDesign(); await preview(d)
    ok((await style(d.locator('tr[data-sum]').first().locator('td').first(), 'fontWeight')) === '400', 'M2: the “Sub-totals” style un-bolds the sub-total rows')
    const totRow = d.locator('[data-apart] > div').last()
    ok(await d.locator('[data-apart]').count() === 1 && /^\$/.test(await text(totRow.locator('span').nth(1))) && !/S\$/.test(await text(totRow)), 'M2: Totals in “$ with a space” print “$” apart from the figure')
    const payAmt = d.locator('table tr').filter({ hasText: 'Upon signing' }).first().locator('td').last()   // the Deposit milestone's row (its words)
    ok(/^[\d,]+\.\d\d$/.test(await text(payAmt)), `M2: the payment schedule in “Figures only” prints the figure alone (“${await text(payAmt)}”)`)

    // ── M6 the payment schedule · C5 the QR beside it ─────────────────────────────────────────────────────────────────────────────
    console.log('M6 · the payment schedule · C5')
    Object.assign(block('py'), { parens: true, pctAt: 'column', showAmounts: false, qr: true, qrWidth: 24 })
    sql(`update quote_payments set fixed_minor = 300000, fixed_label = 'Design Fee' where id = '${PAY1}'`)
    const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const brand0 = sql(`select value from settings where key = 'brand'`)
    const brand = JSON.parse(brand0); brand.details.entities[0].payNowQr = QR
    sql(`update settings set value = cast(readfile('${writeJson('brand.json', brand)}') as text) where key = 'brand'`)
    putDesign(); await preview(d)
    const payRows = d.locator('td[data-pay-share]')
    ok(await payRows.count() === 4, 'row 355: “In its own column” — the share in a cell of its own on every milestone')
    ok((await text(payRows.first())) === 'Design Fee', 'row 310: a fixed fee prints its own word where the share prints')
    const payTable = payRows.first().locator('xpath=ancestor::table[1]')
    ok((await text(payTable.locator('tr').first().locator('td').first())) === '(a)', 'row 354: milestones marked (a) · (b) · (c)')
    const cellsRow = await payTable.locator('tr').first().locator('td').count(), cellsTotal = await payTable.locator('tr[data-sum] td').count()
    ok(cellsRow === cellsTotal, `row 332: the Total row has a cell under every column (${cellsTotal} = ${cellsRow}) with the amounts off`)
    const qr = d.locator('img[data-pay-qr]')
    ok(await qr.count() === 1 && (await rect(qr)).left >= (await rect(payTable)).right - 1, 'C5: the PayNow QR prints beside the schedule')
    await qr.scrollIntoViewIfNeeded(); await shot(d, 'm6-c5-schedule-1440')

    // ── M5 Details rows · Remarks · {signed_date} ─────────────────────────────────────────────────────────────────────────────────
    console.log('M5 · Details rows · Remarks · row 331')
    block('dt').left[0].labelBold = true; block('dt').left[1].valueBold = true; block('dt').lines = 'boxed'
    block('hd').elements[0].rows[0].labelBold = true; block('hd').elements[0].lines = 'boxed'
    sql(`update quotes set remarks = 'Probe remarks · S44T' where id = '${Q}'`)
    putDesign(); await preview(d)
    const det = d.locator('table[data-lines="boxed"]').nth(1)
    ok((await style(det.locator('tr').first().locator('td').first(), 'fontWeight')) === '700' && (await style(det.locator('tr').nth(1).locator('td').first(), 'fontWeight')) !== '700', 'row 248: one row\'s label in bold, the next one\'s not')
    ok((await style(det.locator('tr').nth(1).locator('td').nth(1), 'fontWeight')) === '700', 'row 248: a value in bold')
    ok((await style(det.locator('td').first(), 'borderTopWidth')) === '1px' && (await style(det.locator('td').nth(1), 'borderLeftWidth')) === '1px', 'row 322: “Boxed” draws every cell\'s box')
    ok((await text(det.locator('tr').nth(1).locator('td').nth(1))) === 'Probe remarks · S44T', 'row 321: General Info\'s Remarks print through {remarks}')
    const hkv = d.locator('[data-el-kind="kv"]').first()
    ok((await style(hkv.locator('td').first(), 'fontWeight')) === '700' && (await style(hkv.locator('td').first(), 'borderTopWidth')) === '1px', 'rows 248 · 322: the header\'s Details element takes bold rows and boxed cells too')
    await shot(d, 'm5-details-1440')
    await preview(d, Q_SIGNED)
    const signed = await text(d.locator('[class*="sigCol"]').first())
    ok(/Date: \d{1,2} \w{3}/.test(signed), `row 331: a signed quote prints the day the client signed (“${signed.slice(-20)}”)`)

    // ── 284 a trade's lines in the grid's order ───────────────────────────────────────────────────────────────────────────────────
    console.log('Row 284 · grouped by trade, in the grid\'s order')
    design = baseDesign(); block('it').groupBy = 'category'
    putDesign(); await preview(d)
    const carp = await d.$$eval('tr[data-line-id]', (rs) => rs.map((r) => r.getAttribute('data-line-id')))
    const order = [VANITY, WARDROBE, STUDY, TV].map((id) => carp.indexOf(id))
    ok(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), 'row 284: the Carpentry lines print as the grid orders them — Bathrooms\' vanity, then Bedrooms\' wardrobe and desk, then the TV console')

    // ── 293 a line taller than a page runs on ─────────────────────────────────────────────────────────────────────────────────────
    console.log('Row 293 · nothing is clipped')
    design = baseDesign(); putDesign()
    const long = Array.from({ length: 140 }, (_, i) => `Line ${i + 1} of a very long scope note that the studio typed for this item`).join('\n')
    sql(`update quote_items set description = cast(readfile('${writeJson('long.txt', long)}') as text), description_html = null where id = '${TV}'`)
    await preview(d); await settle(d, 1500)
    const cont = d.locator(`tr[data-line-cont="${TV}"]`)
    ok(await cont.count() > 10, `row 293: the long description runs on in rows of its own (${await cont.count()})`)
    const clipped = await d.$$eval('[data-page]', (pages) => pages.flatMap((pg) => { const body = [...pg.children].find((c) => /body/.test(c.className)); if (!body) return []; const bb = body.getBoundingClientRect(); return [...body.querySelectorAll('tr')].filter((r) => r.getBoundingClientRect().bottom > bb.bottom + 1).map((r) => r.textContent.slice(0, 30)) }))
    ok(clipped.length === 0, `row 293: no row reaches past its page's body (${clipped.length})`)
    const pagesOf = await d.$$eval(`tr[data-line-cont="${'TVID'}"]`.replace('TVID', TV), (rs) => new Set(rs.map((r) => r.closest('[data-page]').getAttribute('data-page'))).size)
    ok(pagesOf >= 2, `row 293: the line breaks across pages (${pagesOf})`)
    const ids2 = await d.$$eval('tr[data-line-id]', (rs) => rs.map((r) => r.getAttribute('data-line-id')))
    ok(lineIds.every((id) => ids2.filter((x) => x === id).length === 1), 'row 293: every counted line still prints exactly once')
    await shot(d, 'r293-runs-on-1440')
    sql(`update quote_items set description = (select description from s44t_bk_1 where s44t_bk_1.id = quote_items.id) where id = '${TV}'`)

    // ── C2's print side: a name's emphasis, the kit's colours, the allowlist ──────────────────────────────────────────────────────
    console.log('C2 · a name\'s emphasis and the kit\'s colours print')
    sql(`update quote_items set name_html = '<b>Bold tiles</b><br><span data-kit="accent">in the accent</span><script>window.__s44t = 1</script><img src=x onerror="window.__s44t = 2">', description_html = '<p><u><span data-kit="red">red and underlined</span></u> plain</p>' where id = '${TILES}'`)
    await preview(d)
    const nm = d.locator(`tr[data-line-id="${TILES}"] [class*="nameRich"]`)
    ok(await nm.locator('b').count() === 1 && await nm.locator('br').count() === 1, 'C2: bold and a line break in a name print as set')
    const kit = (() => { try { return JSON.parse(sql(`select value from settings where key = 'brand'`)).kit.colors } catch { return {} } })()
    const rgb = (hex) => { const h = (hex || '').replace('#', ''); return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})` }
    const accent = await d.locator(`tr[data-line-id="${TILES}"] [data-kit="accent"]`).evaluate((el) => getComputedStyle(el).color)
    ok(accent === rgb(kit.accent || '#5500FF'), `C2: a kit colour prints as the kit's Accent (${accent})`)
    ok(await d.locator('[data-page] script').count() === 0 && await d.evaluate(() => window.__s44t === undefined), 'C2: a script or a handler in a name never reaches the page')
    const red = d.locator(`tr[data-line-id="${TILES}"] [data-kit="red"]`)
    ok(await red.locator('u').count() === 1 && (await red.locator('u').evaluate((el) => getComputedStyle(el).textDecorationColor)) === rgb(kit.red || '#C00000'), 'C2 · row 298: an underline drawn round a coloured run takes the run\'s colour')
    sql(`update quote_items set name_html = null, description_html = null where id = '${TILES}'`)

    // ── 294 a kept version prints with its own template ───────────────────────────────────────────────────────────────────────────
    console.log('Row 294 · a kept version\'s own look')
    design = baseDesign(); design.page.watermark = 'PROBE LIVE'; putDesign()
    const snapQuote = JSON.parse(sql(`select json_object('id', id, 'number', number, 'title', title, 'status', status, 'version', 1, 'leadId', lead_id, 'templateId', null, 'templateVersion', null, 'clientViewJson', null, 'termsVisible', json('true'), 'notesVisible', json('true'), 'amountMinor', amount_minor, 'gstEnabled', json(case gst_enabled when 1 then 'true' else 'false' end), 'additionalDiscountMode', additional_discount_mode, 'additionalDiscountValue', additional_discount_value, 'kind', kind, 'termsHtml', terms_html, 'notesHtml', notes_html, 'createdAt', strftime('%Y-%m-%dT%H:%M:%SZ', created_at, 'unixepoch')) from quotes where id = '${Q}'`))
    const snapItems = JSON.parse(sql(`select json_group_array(json_object('id', id, 'parentId', parent_id, 'kind', kind, 'position', position, 'name', name, 'description', description, 'qty', qty, 'unit', unit, 'costMinor', cost_minor, 'markupMinor', markup_minor, 'discountPct', discount_pct, 'gstPct', gst_pct, 'visibility', visibility, 'status', status, 'category', category, 'room', room, 'optional', json(case optional when 1 then 'true' else 'false' end))) from quote_items where quote_id = '${Q}'`))
    const snapPay = JSON.parse(sql(`select json_group_array(json_object('id', id, 'name', name, 'description', description, 'pct', pct, 'dueKind', due_kind, 'position', position)) from quote_payments where quote_id = '${Q}'`))
    sql(`insert or replace into quote_versions (id, quote_id, version, snapshot_json, note, created_by, created_at) values ('probe-s44t-kept', '${Q}', 1, cast(readfile('${writeJson('snap.json', { quote: snapQuote, items: snapItems, payments: snapPay })}') as text), 'probe', 'dane', strftime('%s','now'))`)
    sql(`update quotes set version = 2 where id = '${Q}'`)
    await preview(d)
    ok(/PROBE LIVE/.test(await text(d.locator('[class*="watermark"]').first())), 'row 294: the live quote prints through its template now')
    await preview(d, Q, '?version=1')
    ok(await d.locator('[class*="watermark"]').filter({ hasText: 'PROBE LIVE' }).count() === 0, 'row 294: the kept version prints through the template it went out with — not the live quote\'s')
    sql(`delete from quote_versions where id = 'probe-s44t-kept'; update quotes set version = 1 where id = '${Q}'`)
    design = baseDesign(); putDesign()

    // ── C1 priced after the contract, from the row's ⋮ ────────────────────────────────────────────────────────────────────────────
    console.log('C1 · a section priced after the contract')
    sql(`update quote_payments set fixed_minor = null, fixed_label = null where id = '${PAY1}'`)
    sql(`update quote_items set qty = (select qty from s44t_bk_1 where s44t_bk_1.id = quote_items.id) where id = '${PAINT}'`)   // the lines as stored, so the stored amount is theirs
    await go(d, `/quotes/${Q}`); await settle(d, 1500)
    const before = Number(sql(`select amount_minor from quotes where id = '${Q}'`))
    const bathRow = d.locator(`[data-item-id="${BATHROOMS}"]`).first()
    await bathRow.scrollIntoViewIfNeeded(); await bathRow.hover()
    await bathRow.getByRole('button', { name: /^More options for/ }).click(); await settle(d, 400)
    await d.getByRole('menuitem', { name: /Price after the contract/ }).click(); await settle(d, 2500)
    ok(sql(`select priced_after from quote_items where id = '${BATHROOMS}'`) === '1', 'C1: ⋮ › Price after the contract marks the section')
    ok(sql(`select id from quote_items where quote_id = '${Q}' and parent_id is null order by position desc limit 1`) === BATHROOMS, 'C1: a marked section gathers at the end of the table')
    const after = Number(sql(`select amount_minor from quotes where id = '${Q}'`))
    ok(after < before, `C1: the section leaves the quote's total (${before} → ${after})`)
    ok(await d.locator(`[data-item-id="${BATHROOMS}"] [data-testid="priced-after"]`).count() === 1, 'C1: the section row says “Priced after the contract”')
    await shot(d, 'c1-editor-1440')
    await preview(d)
    const laterBand = d.locator('tr[data-part]').filter({ hasText: 'Priced after the contract' })
    ok(await laterBand.count() === 1, 'C1: the print has its own part, headed “Priced after the contract”')
    const bandsText = await d.$$eval('tr[data-band], tr[data-part]', (rs) => rs.map((r) => r.textContent.replace(/\s+/g, ' ').trim()))
    const iLater = bandsText.findIndex((t) => /Priced after the contract/.test(t)), iBath = bandsText.findIndex((t) => /Bathrooms/.test(t))
    ok(iLater > 0 && iBath > iLater && /^B\s*Bathrooms/.test(bandsText[iBath]), `C1: its section comes after the main items, lettered on (“${bandsText[iBath]}”)`)
    ok(await d.locator('tr[data-sum]').filter({ hasText: 'Estimated total' }).count() === 1, 'C1: the part has its own total, “Estimated total”')
    const grand = (await text(d.locator('[class*="totRow"][data-strong]').first())).replace(/[^\d.]/g, '')
    ok(Math.round(Number(grand) * 100) === after, 'C1: the Grand total is the quote\'s total without the estimate')
    await laterBand.scrollIntoViewIfNeeded(); await shot(d, 'c1-print-1440')
    await go(d, `/quotes/${Q}`); await settle(d, 1500)
    const bathRow2 = d.locator(`[data-item-id="${BATHROOMS}"]`).first()
    await bathRow2.scrollIntoViewIfNeeded(); await bathRow2.hover()
    await bathRow2.getByRole('button', { name: /^More options for/ }).click(); await settle(d, 400)
    await d.getByRole('menuitem', { name: /Price with the contract/ }).click(); await settle(d, 2500)
    ok(sql(`select priced_after from quote_items where id = '${BATHROOMS}'`) === '0' && Number(sql(`select amount_minor from quotes where id = '${Q}'`)) === before, `C1: ⋮ › Price with the contract puts it back in the total (${sql(`select priced_after from quote_items where id = '${BATHROOMS}'`)} · ${sql(`select amount_minor from quotes where id = '${Q}'`)})`)

    // ── 310 a fixed fee's own word, typed in the % cell · 321 Remarks in General Info ─────────────────────────────────────────────
    console.log('Rows 310 · 321 · the quote editor')
    sql(`update quote_payments set fixed_minor = 300000, fixed_label = null where id = '${PAY1}'`)
    await go(d, `/quotes/${Q}`); await settle(d, 1500)
    const fee = d.getByTestId('payment-fixed-fee').first()
    await fee.scrollIntoViewIfNeeded()
    ok((await text(fee)) === 'Fixed fee', 'row 310: a fixed fee reads “Fixed fee” until the studio names it')
    await fee.click(); await settle(d, 300)
    const input = d.getByLabel(/The word printed for the fixed fee/)
    await input.fill('Design Fee'); await input.press('Enter'); await settle(d, 1800)
    ok(sql(`select fixed_label from quote_payments where id = '${PAY1}'`) === 'Design Fee' && (await text(d.getByTestId('payment-fixed-fee').first())) === 'Design Fee', 'row 310: the word typed in the % cell is kept and shown')
    await shot(d, 'r310-fee-word-1440')
    const remarks = d.getByLabel('Remarks').first()
    await remarks.scrollIntoViewIfNeeded(); await remarks.fill('Typed in General Info'); await remarks.blur(); await settle(d, 2200)
    ok(sql(`select remarks from quotes where id = '${Q}'`) === 'Typed in General Info', 'row 321: General Info\'s Remarks save with the quote')
    await shot(d, 'r321-remarks-1440')

    // ── the template editor's new choices ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('The template editor\'s new choices')
    await go(d, `/templates/${TPL}`); await d.waitForSelector('[data-page]', { timeout: 30000 }); await settle(d, 1200)
    await d.locator('[data-block-id]').filter({ has: d.locator('tr[data-band]') }).first().click({ force: true }); await settle(d, 500)
    const insp = d.getByTestId('inspector')
    await insp.getByRole('button', { name: /^More options/ }).click(); await settle(d, 300)
    const want = ['Lines between rows', 'Section heading height', 'A zero quantity prints', 'Section notes run', 'Section notes sit in the heading’s band', 'Before a section (mm)', 'Between lines (mm)', 'Work priced after the contract is headed']
    const have = []
    for (const w of want) have.push(await insp.getByText(w, { exact: false }).count() > 0 || await insp.getByLabel(w).count() > 0)
    ok(have.every(Boolean), `the Items table's new choices are in More options (${want.filter((_, i) => !have[i]).join(', ') || 'all'})`)
    ok(await insp.getByRole('button', { name: /^Sub-totals/ }).count() === 1, 'M2: Text styles hold a “Sub-totals” style')
    ok(await insp.getByRole('radiogroup', { name: 'Colour' }).count() >= 3, 'row 309: every printed column card has a Colour')
    await shot(d, 'tpl-items-more-1440')
    await d.locator('[data-block-id="py"]').first().click({ force: true }); await settle(d, 500)
    ok(await insp.getByLabel('The percentage').count() === 1 && await insp.getByText('PayNow QR beside the schedule').count() === 1, 'M6 · C5: the Payment schedule offers The percentage and the QR beside it')
    await settle(d, 500); await insp.getByLabel('Milestones are marked').click(); await settle(d, 300)
    await d.getByRole('option', { name: '(a) · (b) · (c)' }).click(); await settle(d, 2600)
    ok(/"parens":true/.test(sql(`select coalesce(draft_json, '') from quote_templates where id = '${TPL}'`)) && /\(a\)/.test(await text(d.locator('[data-block-id="py"]').first())), 'row 354: “Milestones are marked · (a) · (b) · (c)” — the canvas marks them so, and the draft keeps it')
    await shot(d, 'tpl-payments-1440')
    await d.locator('[data-block-id="dt"]').first().click({ force: true }); await settle(d, 500)
    ok(await insp.getByLabel('Lines').count() >= 1 && await insp.getByRole('button', { name: 'Label in bold' }).count() >= 2 && await insp.getByRole('button', { name: 'Value in bold' }).count() >= 2, 'M5: Details rows have Label in bold · Value in bold, and the block its Lines')
    await insp.getByRole('button', { name: 'Label in bold' }).first().click(); await settle(d, 2600)
    const draft = sql(`select coalesce(draft_json, '') from quote_templates where id = '${TPL}'`)
    ok(/"labelBold":true/.test(draft), 'M5: a press on Label in bold is kept in the template\'s draft')
    ok(!/onerror|<script/i.test(draft) && /Probe words/.test(draft), 'the draft is saved with its Text block through the allowlist')
    await insp.getByRole('button', { name: 'Insert a field' }).first().click(); await settle(d, 300)
    ok(await d.getByRole('menuitem', { name: 'Signed date' }).count() === 1 && await d.getByRole('menuitem', { name: 'Remarks' }).count() === 1, 'rows 331 · 321: Insert a field offers Signed date and Remarks')
    await d.keyboard.press('Escape')
    await shot(d, 'tpl-details-1440')

    // ── 332 the phone's reading cards end with the schedule ───────────────────────────────────────────────────────────────────────
    console.log('Row 332 · the client\'s phone')
    const token = sql(`select confirm_token from quotes where id = '${Q_SENT}'`)
    const P = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const ph = await page(P, 'phone')
    await go(ph, `/confirm/${token}`); await settle(ph, 1500)
    const sched = ph.getByTestId('reading-schedule')
    const payN = Number(sql(`select count(*) from quote_payments where quote_id = '${Q_SENT}'`))
    ok(await sched.count() === 1 && await sched.locator('[role="row"]').count() >= payN, `row 332: the reading cards end with the payment schedule (${payN} milestones)`)
    const shares = await sched.locator('[role="row"] > span:nth-child(3)').evaluateAll((els) => els.filter((e) => e.textContent.trim()).map((e) => Math.round(e.getBoundingClientRect().right)))
    ok(shares.length >= 2 && shares.every((x) => x === shares[0]), 'row 332: the shares stand in one column')
    ok(await ph.evaluate(() => document.documentElement.scrollWidth - screen.width) <= 0, 'row 332: no sideways scroll at 390')
    await sched.scrollIntoViewIfNeeded(); await shot(ph, 'r332-phone-schedule-390')

    // ── M11 no repair writes a studio's own template ──────────────────────────────────────────────────────────────────────────────
    console.log('M11 · templates keep the studio\'s changes')
    const repair = fs.readFileSync(path.join(REPO, 'scripts/repair-demo-data.ts'), 'utf8')
    const r37 = repair.slice(repair.indexOf('R37 · the Letter design'), repair.indexOf('R20 · prove it'))
    ok(/FROM quote_templates WHERE id IN \$\{inSeeded\}/.test(r37) && /FROM quote_template_versions WHERE template_id IN \$\{inSeeded\}/.test(r37), 'M11: R37 reads only the three templates R31 seeded')

    ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' · ')})`)
  } catch (e) {
    fail++; console.log('  ✗ probe stopped:', String(e).slice(0, 400))
  } finally {
    restoreAll()
    sql(`delete from quote_template_versions where template_id = '${TPL}'; delete from quote_templates where id = '${TPL}'`)
    sql(`update members set is_you = (id = '${you0}')`)
    const back = Number(sql(`select amount_minor from quotes where id = '${Q}'`))
    console.log(back === amount0 ? '  (put back: OM-10001 as it was)' : `  ! OM-10001's amount ${back} ≠ ${amount0}`)
    await b.close()
    console.log(`\n${pass}/${pass + fail} checks pass`)
    process.exit(fail ? 1 : 0)
  }
})()
