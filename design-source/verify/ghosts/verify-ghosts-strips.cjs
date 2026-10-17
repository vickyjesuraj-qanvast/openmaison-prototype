// (REG-708) Ghost strips: for every route, A = the loading.tsx ghost (the streamed HTML with its scripts taken out, so the Suspense fallback
// stays as first painted), B = PageReveal's ghost (its first paint faked days away, so the 650ms hold never ends), C = the page itself, and
// the ghost laid over the page at 55% — one strip per route, plus the overlay alone at 0.7 (`over-*.png`): every bone should sit on its word.
// Against a production build on :3011 on a scratch DB. Usage: OUT=<dir> node verify-ghosts-strips.cjs [filter] [width] [height] [touch]
const { chromium } = require('playwright')
const fs = require('fs')
const S = process.env.OUT || require('path').join(process.cwd(), 'ghost-shots')   // where the pictures go (outside the repo is best)
const OUT = `${S}/ghosts`
const BASE = 'http://localhost:3011'
const [filter = '', W = '1440', H = '1024', touch = ''] = process.argv.slice(2)
const w = Number(W), h = Number(H)
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', FLEAD = '2bc08444-0409-47c3-9675-0750977c5838', FILE = '15486e62-0c28-4802-894f-632fab54a81f'
const QUOTE = '1f598389-4008-4079-a956-5dff071fb708', CONTRACT = '81463786-769d-42aa-b226-192081cfd6e6', XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143'
const QTPL = '7ab7bfe7-3d8b-4e3c-a6ec-0285274c1de6', CTPL = '9d229e29-f161-4066-adae-57c6b90c25f5', TTPL = '53a859ef-9545-4228-8cc3-11f2183ddff9', TXTPL = '02a297a5-b5e6-4935-a665-d54e86f672fa'
const DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'
const ROUTES = [
  ['leads', '/leads'], ['insights', '/company/reports/leads'], ['imports', '/leads/imports'],
  ['lead-overview', `/leads/${LEAD}`], ['lead-tasks', `/leads/${LEAD}/tasks`], ['lead-quotes', `/leads/${LEAD}/quotes`], ['lead-contracts', `/leads/${LEAD}/contracts`],
  ['lead-files', `/leads/${LEAD}/files`], ['lead-notes', `/leads/${LEAD}/notes`], ['lead-questionnaire', `/leads/${LEAD}/questionnaire`], ['lead-activity', `/leads/${LEAD}/activity`],
  ['file-viewer', `/leads/${FLEAD}/files/${FILE}`],
  ['tasks', '/tasks'], ['quotes', '/quotes'], ['contracts', '/contracts'], ['xray', '/quote-x-ray'], ['xray-record', `/quote-x-ray/${XRAY}`], ['visualizer', '/visualizer'], ['qanvast', '/qanvast-ops'], ['qanvast-studios', '/qanvast-ops/studios'],   /* (parity map, CP-148 · CP-149) Qanvast Ops › Studios */
  ['settings-studio', '/settings'], ['settings-leads', '/settings?section=leads'], ['settings-quotes', '/settings?section=quotes'], ['settings-notifications', '/settings?section=notifications'],
  ['co-profile', '/company/profile'], ['co-members', '/company/members'], ['co-questionnaire', '/company/questionnaire'], ['co-integrations', '/company/integrations'], ['co-materials', '/company/materials'],
  ['co-plan', '/company/plan'], ['co-plan-billing', '/company/plan/billing'], ['co-pricebook', '/company/price-book'], ['co-pricebook-sections', '/company/price-book/sections'],
  ['co-tpl-quotes', '/company/templates/quotes'], ['co-tpl-brand', '/company/templates/brand'], ['co-tpl-contracts', '/company/templates/contracts'], ['co-tpl-tasks', '/company/templates/tasks'],
  ['co-tpl-terms', '/company/templates/terms'], ['co-tpl-payments', '/company/templates/payments'],
  ['ed-quote', `/quotes/${QUOTE}`], ['ed-quote-preview', `/quotes/${QUOTE}/preview`], ['ed-contract', `/contracts/${CONTRACT}`], ['ed-contract-preview', `/contracts/${CONTRACT}/preview`],
  ['ed-tpl-quote', `/templates/${QTPL}`], ['ed-tpl-contract', `/templates/contracts/${CTPL}`], ['ed-tpl-tasks', `/templates/tasks/${TTPL}`], ['ed-tpl-terms', `/templates/terms/${TXTPL}`],
  ['ed-tpl-payments', '/templates/payments/20-40-40'], ['ed-visualizer', `/visualizer/${DESIGN}`],
  ['renders', '/renders/17fe84ab2eca47'], ['sign', `/sign/${CONTRACT}`],
  /* (pending modules S41b-5) Qanvast Ops › Lead credits (Overview · Transactions · Contracts) and Reviews (Reviews · Ranking · Feedback) */
  ['qo-credits', '/qanvast-ops/credits'], ['qo-credits-tx', '/qanvast-ops/credits/transactions'], ['qo-credits-contracts', '/qanvast-ops/credits/contracts'],
  ['qo-reviews', '/qanvast-ops/reviews'], ['qo-reviews-ranking', '/qanvast-ops/reviews/ranking'], ['qo-reviews-feedback', '/qanvast-ops/reviews/feedback'],
].filter(([k]) => !filter || filter.split(',').some((f) => k.startsWith(f)))

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const tag = `${w}${touch ? 't' : ''}`
  for (const [key, path] of ROUTES) {
    const url = BASE + path
    const opts = { viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) }
    /* A — the loading.tsx ghost: the document as streamed, its scripts removed (no hydration, no Suspense swap) */
    const ca = await browser.newContext(opts)
    const pa = await ca.newPage()
    await pa.route((u) => u.href === url, async (route) => {
      const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, '')
      await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } })
    })
    await pa.goto(url, { waitUntil: 'load' }).catch(() => {})
    await pa.waitForTimeout(900)
    await pa.screenshot({ path: `${OUT}/${key}-${tag}-a.png` })
    await ca.close()
    /* B — PageReveal's ghost, held: it times its 650ms hold from the first paint, so a first paint days away holds it (nothing else changes) */
    const cb = await browser.newContext(opts)
    await cb.addInitScript(() => {
      const orig = performance.getEntriesByType.bind(performance)
      performance.getEntriesByType = function (t) { return t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : orig(t) }
    })
    const pb = await cb.newPage()
    await pb.goto(url, { waitUntil: 'load' }).catch(() => {})
    await pb.waitForTimeout(1600)
    await pb.screenshot({ path: `${OUT}/${key}-${tag}-b.png` })
    await cb.close()
    /* C — the page */
    const cc = await browser.newContext(opts)
    const pc = await cc.newPage()
    await pc.goto(url, { waitUntil: 'load' }).catch(() => {})
    await pc.waitForTimeout(2200)
    await pc.screenshot({ path: `${OUT}/${key}-${tag}-c.png` })
    await cc.close()
    /* the strip */
    const img = (s) => `data:image/png;base64,${fs.readFileSync(`${OUT}/${key}-${tag}-${s}.png`).toString('base64')}`
    const scale = w > 800 ? 0.42 : 0.55
    const tw = Math.round(w * scale)
    const fig = (cap, inner) => `<figure style="margin:0"><figcaption style="padding:0 0 4px">${key} · ${cap}</figcaption>${inner}</figure>`
    const overlay = `<div style="position:relative;width:${tw}px"><img src="${img('c')}" style="width:${tw}px;display:block"><img src="${img('b')}" style="position:absolute;inset:0;width:${tw}px;display:block;opacity:.55;mix-blend-mode:multiply"></div>`
    const html = `<body style="margin:0;background:#202020;display:flex;gap:10px;padding:10px;font:600 13px system-ui;color:#fff">${['a', 'b', 'c'].map((s, i) => fig(['loading.tsx', 'reveal ghost', 'page'][i], `<img src="${img(s)}" style="width:${tw}px;display:block">`)).join('')}${fig('ghost over page', overlay)}</body>`
    const ps = await browser.newPage({ viewport: { width: tw * 4 + 50, height: Math.round(h * scale) + 40 } })
    await ps.setContent(html); await ps.waitForTimeout(150)
    await ps.screenshot({ path: `${OUT}/strip-${key}-${tag}.png` }); await ps.close()
    /* the overlay alone, at 0.7 — ghost at 55% over the page: every bone should sit on its word */
    const ow = Math.round(w * 0.7), oh = Math.round(h * 0.7)
    const po = await browser.newPage({ viewport: { width: ow, height: oh } })
    await po.setContent(`<body style="margin:0"><div style="position:relative;width:${ow}px"><img src="${img('c')}" style="width:${ow}px;display:block"><img src="${img('b')}" style="position:absolute;inset:0;width:${ow}px;display:block;opacity:.55;mix-blend-mode:multiply"></div></body>`); await po.waitForTimeout(120)
    await po.screenshot({ path: `${OUT}/over-${key}-${tag}.png` }); await po.close()
    console.log('done', key)
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
