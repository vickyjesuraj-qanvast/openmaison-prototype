// (REG-820) The report's open items, built: one icon size and weight in every thumbnail, the Price book's Status column (no chip in the
// name cell), a cut name's full text on hover (tables and cards — nothing when it fits), T&Cs' kind said once, and every table's
// thumbnail at the same place in its row. Demo data; next start -p 3011 on a scratch DB. Usage: node verify-rest.cjs <out dir>
const { chromium } = require('playwright')
const BASE = 'http://localhost:3011', OUT = process.argv[2], L = '2bc08444-0409-47c3-9675-0750977c5838', Q = '1f598389-4008-4079-a956-5dff071fb708'
let pass = 0, fail = 0; const ok = (c, n) => { if (c) { pass++; console.log('  ✓', n) } else { fail++; console.log('  ✗', n) } }
;(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1024 } })).newPage()
  const list = async () => { const t = p.getByRole('radio', { name: 'List view' }).or(p.getByRole('button', { name: 'List view' })).first(); if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(600) } }
  const rows = () => p.evaluate(() => [...document.querySelectorAll('[data-kb-row], [role="row"]')].filter((r) => r.querySelector('[class*="thumb"]')).map((r) => {
    const th = r.querySelector('[class*="thumb"]'); const ic = th.querySelector('.msr, .mso'); const rr = r.getBoundingClientRect(), tr = th.getBoundingClientRect()
    return { name: (th.nextElementSibling?.textContent || '').trim(), x: Math.round(tr.left - rr.left), w: Math.round(tr.width), h: Math.round(tr.height), icon: ic ? `${getComputedStyle(ic).fontSize}/${getComputedStyle(ic).fontVariationSettings.match(/wght" (\d+)/)?.[1]}` : null, chips: r.querySelector('[class*="colName"] [class*="meta-chip"], [data-col="name"] [class*="chip"]')?.textContent ?? null }
  }))
  const pages = [['/company/price-book', 'Price book › My Items'], ['/company/price-book/sections', 'My Sections'], [`/leads/${L}/files`, 'Files'], ['/company/templates/terms', 'T&Cs & Notes'], ['/company/templates/quotes', 'Templates › Quotes'], ['/company/materials', 'Materials'], ['/visualizer', 'AI Visualizer']]
  const xs = new Set()
  for (const [url, name] of pages) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await list()
    const r = await rows(); r.forEach((x) => xs.add(x.x))
    const icons = [...new Set(r.map((x) => x.icon).filter(Boolean))]
    ok(r.length > 0 && r.every((x) => x.w === 36 && x.h === 36) && icons.every((i) => i === '20px/300'), `${name}: ${r.length} square 36 thumbs, icons ${icons.join(' ') || '(pictures)'}`)
    if (name === 'T&Cs & Notes') ok(r.every((x) => !x.chips), 'T&Cs & Notes: the kind is said once — in its column, not as a tag beside the name')
  }
  ok(xs.size === 1, `every table's thumbnail starts at the same place in its row (${[...xs].join(', ')}px)`)
  /* the Price book's Status column, and the name keeps its width */
  await p.goto(BASE + '/company/price-book', { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await list()
  const st = await p.evaluate(() => ({ head: [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent.trim()), cells: [...document.querySelectorAll('[data-kb-row] [data-col="status"]')].map((c) => c.textContent.trim()), nameChip: !!document.querySelector('[data-kb-row] [data-col="name"] [class*="chip"]') }))
  ok(st.head[1]?.startsWith('Status') && st.cells.includes('Approved') && st.cells.some((c) => c.startsWith('Proposed')) && !st.nameChip, `Price book: Status column second (${st.cells.join(' · ')}), no chip in the name cell`)
  /* a cut name's tooltip — and none for a name that fits */
  const bubble = () => p.evaluate(() => [...document.querySelectorAll('[role="tooltip"]')].map((t) => t.textContent).join('|'))
  await p.locator('[data-kb-row] [data-col="name"] button', { hasText: 'Design consultation' }).hover(); await p.waitForTimeout(900)
  const cut = await bubble(); ok(/Design consultation and 3D/.test(cut) && cut.length > 30, `a cut name shows itself whole on hover ("${cut}")`)
  await p.screenshot({ path: `${OUT}/price-book-status-tooltip.png`, clip: { x: 68, y: 130, width: 1372, height: 560 } })
  await p.mouse.move(700, 900); await p.waitForTimeout(400)
  await p.locator('[data-kb-row] [data-col="name"] button', { hasText: 'Electrical point, new' }).hover(); await p.waitForTimeout(900)
  ok((await bubble()) === '', 'a name that fits shows no tooltip')
  /* cards: the same, through the house bubble (no native title) */
  await p.goto(BASE + '/company/templates/terms', { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
  const g = p.getByRole('radio', { name: 'Grid view' }).or(p.getByRole('button', { name: 'Grid view' })).first(); if (await g.count()) { await g.click(); await p.waitForTimeout(600) }
  const titled = await p.evaluate(() => document.querySelectorAll('[data-testid="library-card"] [title]:not(input)').length)
  ok(titled === 0, 'cards: no native title on the name')
  /* the quote's Items: 48 squares, 24 icons; the phone's cards 40, 20 icons */
  await p.goto(`${BASE}/quotes/${Q}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000)
  const it = await p.evaluate(() => [...document.querySelectorAll('[class*="items-table-module"][class*="thumbBtn"] > span')].map((e) => { const r = e.getBoundingClientRect(), ic = e.querySelector('.msr, .mso'); return `${Math.round(r.width)}×${Math.round(r.height)} r${getComputedStyle(e).borderRadius} ${ic && !e.hasAttribute('data-empty') ? getComputedStyle(ic).fontSize : ''}` }))
  ok(it.length && it.every((x) => x.startsWith('48×48 r4px')), `quote Items: ${it.length} square 48 thumbs (${[...new Set(it)].join(' · ')})`)
  const ph = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
  await ph.goto(`${BASE}/quotes/${Q}`, { waitUntil: 'networkidle' }); await ph.waitForTimeout(1200)
  const pc = await ph.evaluate(() => [...document.querySelectorAll('[class*="item-cards-module"][class*="thumb"]')].map((e) => { const r = e.getBoundingClientRect(), ic = e.querySelector('.msr, .mso'); return `${Math.round(r.width)} ${ic ? getComputedStyle(ic).fontSize : 'pic'}` }))
  ok(pc.length && pc.every((x) => /^40 (20px|pic)$/.test(x)), `phone item cards: ${pc.length} squares 40, icons 20 (${[...new Set(pc)].join(' · ')})`)
  /* the Quotes tables' first column after the box starts where the listing's does */
  for (const u of ['/quotes', `/leads/${L}/quotes`]) {
    await p.goto(BASE + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
    const x = await p.evaluate(() => {
      const r = [...document.querySelectorAll('[data-kb-row]')].find((x) => x.querySelector('input[type="checkbox"]')); const rl = r.getBoundingClientRect().left
      const cell = r.querySelector('[data-col="sel"] + [role="cell"]'); const h = document.querySelector('[role="columnheader"][data-col="sel"] + [role="columnheader"]')
      const pad = (el) => el.getBoundingClientRect().left - rl + parseFloat(getComputedStyle(el).paddingLeft)
      return [Math.round(pad(cell)), h ? Math.round(pad(h)) : null]
    })
    ok(x[0] === 52 && (x[1] === null || x[1] === 52), `${u}: the first column after the box starts at ${x[0]}, its head at ${x[1]}`)
  }
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
