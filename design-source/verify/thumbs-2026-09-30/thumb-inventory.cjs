// (REG-820) Every small picture / glyph box inside a table row, per page: size, radius, class — the thumbnail inventory. After REG-820
// every table thumb reads `thumb.thumb 36×36 r4px` (lists switched to List view). Usage: next start -p 3011 on a scratch DB, then
//   NODE_PATH=$PWD/node_modules node thumb-inventory.cjs
const { chromium } = require('playwright')
const BASE = 'http://localhost:3011', L = '2bc08444-0409-47c3-9675-0750977c5838'
const pages = [
  ['/leads', 0], [`/leads/${L}/files`, 1], [`/leads/${L}/quotes`, 0], [`/leads/${L}/contracts`, 0], [`/leads/${L}/tasks`, 0],
  ['/quotes', 0], ['/contracts', 0], ['/tasks', 0],
  ['/company/templates/quotes', 1], ['/company/templates/contracts', 1], ['/company/templates/tasks', 1], ['/company/templates/terms', 1], ['/company/templates/payments', 1],
  ['/company/price-book', 1], ['/company/price-book/sections', 1], ['/company/materials', 1], ['/visualizer', 1],
  ['/company/members', 0], ['/company/plan', 0], ['/qanvast-ops', 0], ['/leads/insights', 0], ['/quote-x-ray', 0],
]
;(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const p = await ctx.newPage()
  for (const [url, list] of pages) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(700)
    if (list) { const t = p.getByRole('radio', { name: 'List view' }).or(p.getByRole('button', { name: 'List view' })).first(); if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(600) } }
    const found = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('[role="row"], tr, [data-kb-row]')]
      const out = {}
      for (const r of rows) for (const el of r.querySelectorAll('img, span, div, button, svg')) {
        const cs = getComputedStyle(el); const rc = el.getBoundingClientRect()
        if (rc.width < 16 || rc.width > 72 || rc.height < 16 || rc.height > 72) continue
        const named = /thumb|glyph|swatch|avatar|cover|well|icon|tile|pic/i.test((el.className?.baseVal ?? el.className ?? '').toString()) || el.tagName === 'IMG'
        if (!named) continue
        const hasFill = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || el.tagName === 'IMG' || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0
        if (!hasFill) continue
        if (el.closest('[role="checkbox"], label, input') || el.querySelector('input')) continue
        const cls = (el.className?.baseVal ?? el.className ?? '').toString().split(' ').map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.')).join(' ') || el.tagName
        const key = `${cls} ${Math.round(rc.width)}×${Math.round(rc.height)} r${cs.borderRadius}${cs.boxShadow !== 'none' ? ' shadow' : ''}`
        out[key] = (out[key] || 0) + 1
      }
      return out
    })
    console.log(`\n${url}`); for (const [k, n] of Object.entries(found)) console.log(`  ${n}× ${k}`)
  }
  await b.close()
})()
