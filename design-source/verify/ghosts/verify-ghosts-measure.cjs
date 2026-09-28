// (REG-708) Ghost vs page, measured: boxes of `ghostSel` inside the held ghost (PageReveal's, first paint faked) and of `pageSel` on the settled
// page, with the differences — the few-pixel drifts an overlay hides. Usage: node verify-ghosts-measure.cjs <path> <w> <ghostSel> <pageSel> [n]
// e.g. node verify-ghosts-measure.cjs /company/members 1440 '[aria-label="Loading members"] li' '[data-testid="member-row"]' 7
const { chromium } = require('playwright')
const BASE = 'http://localhost:3011'
;(async () => {
  const [path, W = '1440', gs, ps, N = '6'] = process.argv.slice(2)
  const w = Number(W), n = Number(N)
  const browser = await chromium.launch()
  const opts = { viewport: { width: w, height: 1024 }, ...(w < 800 ? { isMobile: true, hasTouch: true } : {}) }
  const box = (sel) => (els) => els.slice(0, 50).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] })
  const cb = await browser.newContext(opts)
  await cb.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const pb = await cb.newPage(); await pb.goto(BASE + path, { waitUntil: 'load' }); await pb.waitForTimeout(1600)
  const g = await pb.$$eval(gs, box(gs))
  const cc = await browser.newContext(opts)
  const pc = await cc.newPage(); await pc.goto(BASE + path, { waitUntil: 'load' }); await pc.waitForTimeout(2200)
  const p = await pc.$$eval(ps, box(ps))
  for (let i = 0; i < Math.max(Math.min(g.length, n), Math.min(p.length, n)); i++) {
    const a = g[i], b = p[i]
    const d = a && b ? `Δy ${b[1] - a[1]} Δh ${b[3] - a[3]} Δx ${b[0] - a[0]} Δw ${b[2] - a[2]}` : ''
    console.log(String(i).padStart(2), 'ghost', (a || []).join(',').padEnd(22), 'page', (b || []).join(',').padEnd(22), d)
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
