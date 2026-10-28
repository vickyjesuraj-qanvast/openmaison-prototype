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
  /* (the calm UI build 2026-10-27, a deliberate change) 4-12 · REG-B4.212: only the exception shows — the Status column rests in Column settings
     (off by default, still second when turned on, its words Approved / Waiting for approval), and the one item that waits wears a
     "Waiting for approval" chip in its name cell; an approved row carries none */
  const heads = () => p.evaluate(() => [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent.trim()))
  const restHead = await heads()
  await p.getByRole('button', { name: 'Column settings' }).first().click(); await p.waitForTimeout(600)
  const drawer = p.getByRole('dialog', { name: 'Column settings' })
  const stSw = drawer.getByRole('switch', { name: 'Show Status column' }).first()
  const offAtRest = (await stSw.count()) === 1 && !(await stSw.isChecked())
  const flip = async () => { await stSw.locator('xpath=ancestor::label[1]').click().catch(async () => { await stSw.click({ force: true }) }); await p.waitForTimeout(500) }
  await flip(); await p.keyboard.press('Escape'); await p.waitForTimeout(500)
  const st = await p.evaluate(() => ({ head: [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent.trim()), rows: [...document.querySelectorAll('[data-kb-row]')].filter((r) => r.querySelector('[data-col="status"]')).map((r) => ({ status: r.querySelector('[data-col="status"]').textContent.trim(), chip: r.querySelector('[data-col="name"] [class*="chip"]')?.textContent.trim() ?? null })) }))
  const waiting = st.rows.filter((r) => r.status.startsWith('Waiting for approval')), approved = st.rows.filter((r) => r.status === 'Approved')
  ok(!restHead.some((h) => h.startsWith('Status')) && offAtRest && st.head[1]?.startsWith('Status') && approved.length > 0 && waiting.length > 0 && waiting.every((r) => r.chip === 'Waiting for approval') && approved.every((r) => !r.chip),
    `Price book: Status column in Column settings, second when on (${[...new Set(st.rows.map((r) => r.status))].join(' · ')}); a chip in the name cell only on the item that waits`)
  await p.getByRole('button', { name: 'Column settings' }).first().click(); await p.waitForTimeout(600); await flip(); await p.keyboard.press('Escape'); await p.waitForTimeout(500)   // back to the list as it rests
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
  await ph.goto(`${BASE}/quotes/${Q}?edit=items`, { waitUntil: 'networkidle' }); await ph.waitForTimeout(1200)   // (quotes on the move, a deliberate change of this rule) a phone / touch tablet opens the Quote screen; the Items cards are the Items screen
  // (quotes on the move, a deliberate change of this rule — item-cards.module.css `.thumb`: only a line with a picture draws the house square at 40;
  // the kind is a word on the line, so a quote whose lines carry no picture draws none — the check reads the cards, then every square they draw)
  const pc = await ph.evaluate(() => ({
    cards: [...document.querySelectorAll('[class*="item-cards-module"]')].filter((e) => /(^|\s)[^\s]*item-cards-module__[\w-]+__card(\s|$)/.test(e.className)).length,
    squares: [...document.querySelectorAll('[class*="item-cards-module"][class*="thumb"]')].map((e) => { const r = e.getBoundingClientRect(), ic = e.querySelector('.msr, .mso'); return `${Math.round(r.width)} ${ic ? getComputedStyle(ic).fontSize : (e.querySelector('img') ? 'pic' : 'empty')}` }),
  }))
  ok(pc.cards > 0 && pc.squares.every((x) => x === '40 pic'), `phone item cards: ${pc.cards} cards, ${pc.squares.length} squares — 40, a picture's only (${[...new Set(pc.squares)].join(' · ') || 'no line with a picture'})`)
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
