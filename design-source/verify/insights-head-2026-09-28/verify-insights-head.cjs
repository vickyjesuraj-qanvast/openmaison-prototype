// REG-723 — Leads › Insights › By team member: the head reads as the leads listing's. Each label starts where its column's values
// start and sits centred in the 56; the head cell has the listing's padding, grey and type; the frozen Member column draws the 1px
// rule at rest and the shadow only while the card is scrolled sideways. :3011 on a scratch DB.
const { chromium } = require('playwright')
const S = process.env.S || '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/scratchpad/fix720'
const OUT = `${S}/shots`
const BASE = 'http://localhost:3011'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FAIL', m) } }
const look = (el) => { const c = getComputedStyle(el); return { pl: c.paddingLeft, pr: c.paddingRight, color: c.color, ai: c.alignItems } }
const type = (el) => { const c = getComputedStyle(el); return { size: c.fontSize, weight: c.fontWeight, lh: c.lineHeight, ls: c.letterSpacing, tt: c.textTransform, family: c.fontFamily.split(',')[0] } }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { fail++; console.log('  FAIL page error:', e.message) })

  console.log('The leads listing\'s head — the reference')
  await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  const ref = await page.evaluate(({ l, t }) => {
    const cells = [...document.querySelectorAll('[class*="__headRow"] [class*="__hCell"]')].filter((e) => e.getBoundingClientRect().width > 0)
    const h = cells.filter((e) => e.querySelector('[class*="__hLabel"]'))[1]   // the second column: the first makes room for the selection box (52 in)
    const label = h.querySelector('[class*="__hLabel"]')
    return { cell: eval(`(${l})`)(h), label: eval(`(${t})`)(label), height: Math.round(h.getBoundingClientRect().height) }
  }, { l: look.toString(), t: type.toString() })
  console.log('  ', JSON.stringify(ref))

  console.log('1440 — Insights › By team member')
  await page.goto(`${BASE}/company/reports/leads`, { waitUntil: 'networkidle' })
  const table = page.getByTestId('insights-members')
  await table.waitFor({ timeout: 15000 }); await page.waitForTimeout(1000)
  const m = await table.evaluate((t, { l, tp }) => {
    const heads = [...t.querySelectorAll('[role="columnheader"]')]
    const row = t.querySelector('[role="row"][data-testid="insights-member-row"]')
    const hr = heads[0].parentElement.getBoundingClientRect()
    return heads.map((h) => {
      const label = h.querySelector('[class*="__hLabel"]'), lr = label.getBoundingClientRect()
      const cell = row.querySelector(`[role="cell"][data-col="${h.dataset.col}"]`)
      const first = cell.firstElementChild || cell, fr = first.getBoundingClientRect()
      return { col: h.dataset.col, text: label.textContent, labelX: Math.round(lr.left), valueX: Math.round(fr.left),
               mid: Math.round(lr.top + lr.height / 2 - (hr.top + hr.height / 2)), cell: eval(`(${l})`)(h), type: eval(`(${tp})`)(label),
               edge: h.dataset.pinEdge != null, border: getComputedStyle(h).borderRightWidth, headH: Math.round(hr.height) }
    })
  }, { l: look.toString(), tp: type.toString() })
  for (const h of m) {
    ok(Math.abs(h.labelX - h.valueX) <= 1, `${h.text}: the label starts over its values (label ${h.labelX} · value ${h.valueX})`)
  }
  ok(m.every((h) => Math.abs(h.mid) <= 1), `every label centred in the head (${m.map((h) => h.mid).join(' · ')})`)
  ok(m[0].headH === ref.height, `the head is the listing's height (${m[0].headH} · ${ref.height})`)
  ok(m.every((h) => h.cell.pl === ref.cell.pl && h.cell.pr === ref.cell.pr), `the listing's padding (${m[0].cell.pl} / ${m[0].cell.pr})`)
  ok(m.every((h) => h.cell.color === ref.cell.color), `the listing's grey (${m[0].cell.color})`)
  ok(m.every((h) => JSON.stringify(h.type) === JSON.stringify(ref.label)), `the listing's label type (${JSON.stringify(m[0].type)})`)
  ok(m[0].col === 'member' && m[0].edge && m[0].border === '1px', `Member is frozen with the 1px rule at rest (${m[0].border})`)
  const cardBox = await table.boundingBox()
  await page.screenshot({ path: `${OUT}/i1-insights-table-1440.png`, clip: { x: cardBox.x - 16, y: cardBox.y - 56, width: cardBox.width + 32, height: Math.min(cardBox.height + 72, 420) } })
  await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  const lh = await page.locator('[class*="__headRow"]').first().boundingBox()
  await page.screenshot({ path: `${OUT}/i2-leads-head-1440.png`, clip: { x: lh.x - 16, y: lh.y - 8, width: Math.min(lh.width + 32, 1300), height: 64 + 80 } })
  await ctx.close()

  console.log('1024 — scrolled sideways: the frozen edge\'s shadow')
  const tctx = await browser.newContext({ viewport: { width: 1024, height: 900 } })
  const tp = await tctx.newPage()
  await tp.goto(`${BASE}/company/reports/leads`, { waitUntil: 'networkidle' })
  const tt = tp.getByTestId('insights-members')
  await tt.waitFor({ timeout: 15000 }); await tp.waitForTimeout(900)
  const room = await tt.evaluate((t) => t.scrollWidth - t.clientWidth)
  ok(room > 0, `the card scrolls sideways at 1024 (${room}px)`)
  const cut = await tt.evaluate((t) => [...t.querySelectorAll('[role="columnheader"] [class*="__hLabel"]')].filter((l) => l.scrollWidth > l.clientWidth).map((l) => l.textContent))
  ok(cut.length === 0, `at the columns' floors every label reads in full${cut.length ? ` — cut: ${cut.join(', ')}` : ''}`)
  const rest = await tt.evaluate((t) => getComputedStyle(t.querySelector('[role="columnheader"][data-pin-edge]')).boxShadow)
  ok(rest === 'none', 'no shadow at rest')
  await tt.evaluate((t) => { t.scrollLeft = 120; t.dispatchEvent(new Event('scroll')) }); await tp.waitForTimeout(400)
  const moved = await tt.evaluate((t) => ({ shadow: getComputedStyle(t.querySelector('[role="columnheader"][data-pin-edge]')).boxShadow, left: Math.round(t.querySelector('[role="columnheader"][data-pin-edge]').getBoundingClientRect().left - t.getBoundingClientRect().left) }))
  ok(moved.shadow !== 'none' && moved.left <= 1, `scrolled: Member holds its place with the shadow (${moved.left}px in)`)
  const tb = await tt.boundingBox()
  await tp.screenshot({ path: `${OUT}/i3-insights-scrolled-1024.png`, clip: { x: tb.x - 8, y: tb.y - 8, width: tb.width + 16, height: Math.min(tb.height + 16, 380) } })
  await tctx.close()

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
