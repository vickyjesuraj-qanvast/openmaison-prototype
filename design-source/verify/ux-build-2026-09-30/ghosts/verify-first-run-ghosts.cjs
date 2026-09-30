// (UX audit build · REG-817) A page that opens on its FIRST RUN (REG-735…737: an empty list's bare bar and start card, the AI Visualizer's
// welcome) draws that shape in its loader too (lib/ghost-shape.tsx). Run on a scratch DB whose libraries, lists and one lead's tabs are empty.
//   A · a cold load in a browser that has never seen the page: the loader the server streams (scripts stripped, as verify-ghosts-same.cjs
//       reads it) is the first-run shape — the app shell's seed (lib/ghost-shapes.server.ts).
//   B · an in-app hop through a link (the rail's Tasks, a lead's tab strip), its data held back: the loader on screen is the first-run shape.
// Usage: BASE=http://localhost:3011 LEAD=<a lead id with no quotes/files> OUT=<dir> NODE_PATH=$PWD/node_modules node verify-first-run-ghosts.cjs
const { chromium } = require('playwright')
const path = require('path')
const BASE = process.env.BASE || 'http://localhost:3011'
const LEAD = process.env.LEAD
const OUT = process.env.OUT || __dirname
let pass = 0, fail = 0
const ok = (c, n) => { if (c) { pass++; console.log('  ✓', n) } else { fail++; console.log('  ✗', n) } }
const MARK = '[data-tone="first"], [class*="welcome"], [class*="empty-card"]'

;(async () => {
  const b = await chromium.launch()
  /* A · cold loads, a fresh browser each (nothing remembered) */
  const pages = [
    ['/visualizer', 'visualizer'], ['/company/templates/tasks', 'templates-tasks'], ['/company/templates/quotes', 'templates-quotes'], ['/company/materials', 'materials'],
    ['/company/price-book', 'price-book'], ['/quotes', 'tools-quotes'], ['/contracts', 'tools-contracts'], ['/tasks', 'tasks-page'],
    [`/leads/${LEAD}/quotes`, 'lead-quotes'], [`/leads/${LEAD}/contracts`, 'lead-contracts'], [`/leads/${LEAD}/tasks`, 'lead-tasks'], [`/leads/${LEAD}/files`, 'lead-files'],
  ]
  for (const [url, name] of pages) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' })
    const p = await ctx.newPage()
    await p.route(BASE + url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body }) })
    await p.goto(BASE + url, { waitUntil: 'load' }); await p.waitForTimeout(300)
    const r = await p.evaluate((MARK) => { const g = document.querySelector('[aria-busy="true"]'); return { ghost: !!g, first: !!(g && g.querySelector(MARK)) } }, MARK)
    if (name === 'visualizer' || name === 'lead-quotes' || name === 'tools-quotes') await p.screenshot({ path: path.join(OUT, `first-run-cold-${name}.png`) })
    ok(r.ghost && r.first, `cold load · ${name}: the streamed loader is the first-run shape`)
    await ctx.close()
  }
  /* B · in-app hops through links, in a browser that has seen the pages */
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  for (const url of ['/tasks', `/leads/${LEAD}/quotes`, `/leads/${LEAD}/files`]) { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(500) }
  const hops = [['/tasks', 'tasks-page', '/leads', '/tasks'], [`/leads/${LEAD}/quotes`, 'lead-quotes', `/leads/${LEAD}`, `/leads/${LEAD}/quotes`], [`/leads/${LEAD}/files`, 'lead-files', `/leads/${LEAD}`, `/leads/${LEAD}/files`]]
  for (const [url, name, from, href] of hops) {
    await p.goto(BASE + from, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    let release; const held = new Promise((r) => { release = r })
    const match = (u) => u.pathname === url && u.search.includes('_rsc')
    await p.route(match, async (route) => { await held; await route.continue().catch(() => {}) })
    await p.locator(`a[href^="${href}"]`).first().click()
    await p.waitForTimeout(900)
    /* a prefetched tab arrives at once, no loader needed — then the page itself must be in its first-run shape */
    const r = await p.evaluate((MARK) => { const g = document.querySelector('[aria-busy="true"]'); return { ghost: !!g, first: !!(g && g.querySelector(MARK)), pageFirst: !g && !!document.querySelector('[data-testid$="-empty"], [data-testid="library-empty"]') } }, MARK)
    await p.screenshot({ path: path.join(OUT, `first-run-hop-${name}.png`) })
    ok((r.ghost && r.first) || r.pageFirst, `in-app hop · ${name}: ${r.ghost ? 'the loader on screen is the first-run shape' : 'arrived at once, on its empty card'}`)
    release(); await p.unroute(match); await p.waitForLoadState('networkidle'); await p.waitForTimeout(400)
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  await b.close(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
