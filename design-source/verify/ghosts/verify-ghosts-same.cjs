// (REG-708) For every route, the loader and the reveal are the same ghost — pixel for pixel. A = the route's loading.tsx as first painted
// (the streamed HTML with its scripts removed, so the Suspense fallback stays), B = the page's PageReveal ghost, held (its first paint faked
// days away). Reduced motion stops the sweep, so the two are still pictures and can be compared: the probe fails when more than 0.5% of the
// viewport above the frame's bottom band differs. Run against a production build on :3011 on a scratch DB. Usage: node verify-ghosts-same.cjs [w] [h] [touch] [filter]
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3011'
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', FLEAD = '2bc08444-0409-47c3-9675-0750977c5838', FILE = '15486e62-0c28-4802-894f-632fab54a81f'
const QUOTE = '1f598389-4008-4079-a956-5dff071fb708', CONTRACT = '81463786-769d-42aa-b226-192081cfd6e6', XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143'
const QTPL = '7ab7bfe7-3d8b-4e3c-a6ec-0285274c1de6', CTPL = '9d229e29-f161-4066-adae-57c6b90c25f5', TTPL = '53a859ef-9545-4228-8cc3-11f2183ddff9', TXTPL = '02a297a5-b5e6-4935-a665-d54e86f672fa'
const DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'
const ROUTES = [
  ['leads', '/leads'], ['leads-kanban', '/leads?view=kanban'], ['insights', '/company/reports/leads'], ['reports-health', '/company/reports/health'],   /* (pending modules S39) */ ['reports-sales', '/company/reports/leads?report=sales'],   /* (pending modules S45A, a deliberate change of this rule: the Sales report on the list) */ ['imports', '/leads/imports'],
  ['lead-overview', `/leads/${LEAD}`], ...['tasks', 'quotes', 'contracts', 'files', 'notes', 'questionnaire', 'activity'].map((t) => [`lead-${t}`, `/leads/${FLEAD}/${t}`]),
  ['file-viewer', `/leads/${FLEAD}/files/${FILE}`],
  ['tasks', '/tasks'], ['quotes', '/quotes'], ['contracts', '/contracts'], ['xray', '/quote-x-ray'], ['xray-record', `/quote-x-ray/${XRAY}`], ['visualizer', '/visualizer'], ['qanvast', '/qanvast-ops'], ['qanvast-studios', '/qanvast-ops/studios'],   /* (parity map, CP-148 · CP-149) Qanvast Ops › Studios */
  ...['studio', 'leads', 'quotes', 'notifications'].map((m) => [`settings-${m}`, `/settings?section=${m}`]),
  ['co-profile', '/company/profile'], ['co-profile-from', '/company/profile?from=%2Fcompany%2Fplan%2Fbilling'], ['co-members', '/company/members'], ['co-questionnaire', '/company/questionnaire'],
  ['co-integrations', '/company/integrations'], ['co-materials', '/company/materials'], ['co-plan', '/company/plan'], ['co-plan-billing', '/company/plan/billing'],
  ['co-pricebook', '/company/price-book'], ['co-pricebook-sections', '/company/price-book/sections'],
  ...['quotes', 'brand', 'contracts', 'tasks', 'terms', 'payments'].map((k) => [`co-tpl-${k}`, `/company/templates/${k}`]),
  ['ed-quote', `/quotes/${QUOTE}`], ['ed-quote-preview', `/quotes/${QUOTE}/preview`], ['ed-contract', `/contracts/${CONTRACT}`], ['ed-contract-preview', `/contracts/${CONTRACT}/preview`],
  /* the quote template editor draws its loader and then the page — it has no PageReveal, so there is no reveal to compare */ ['ed-tpl-contract', `/templates/contracts/${CTPL}`], ['ed-tpl-tasks', `/templates/tasks/${TTPL}`], ['ed-tpl-terms', `/templates/terms/${TXTPL}`],
  ['ed-tpl-payments', '/templates/payments/20-40-40'], ['ed-visualizer', `/visualizer/${DESIGN}`], ['renders', '/renders/17fe84ab2eca47'],
  ['marketplace', '/marketplace'], ['marketplace-deals', '/marketplace?view=deals'], ['marketplace-brand', '/marketplace/mkb-4101'],   /* (pending modules S24) */
  ['market-insights', '/market-insights'], ['market-insights-reports', '/market-insights?category=reports'], ['market-insights-article', '/market-insights/mi-demo-budget-benchmark'],   /* (pending modules S25) */
  /* (pending modules S27) Qanvast Ops › Hangouts, a Hangout's Plan · Chats · How it went and one the studio doesn't take part in, the studio's booking
     page and a homeowner's own page (R144's fixed tokens), a member's Public profile */
  ['hangouts', '/qanvast-ops/hangouts'], ...['plan', 'meetings'].map((v) => [`hangout-${v}`, `/qanvast-ops/hangouts/hge-qh-2026-marina?view=${v}`]), ['hangout-results', '/qanvast-ops/hangouts/hge-qh-2026-suntec?view=results'],
  ['hangout-open', '/qanvast-ops/hangouts/hge-qh-2026-onenorth'], ['hangout-page', '/hangout/ETk9nlpkLinRS1JDm-_J9SK8'], ['hangout-own', '/hangout/ETk9nlpkLinRS1JDm-_J9SK8/CmIkVpC6P0ozfYuMPPm-hga4'], ['public-profile', '/company/members/germaine/profile'],
  ['dashboard', '/dashboard'],   /* (pending modules S22) the Dashboard — its loader and its reveal draw the viewer's one ghost */
  ['tickets', '/tickets'], ['meetings', '/meetings'],   /* (pending modules S46B) Projects › Tickets' New ticket, Meeting Copilot's Insights */
  /* (pending modules S41b-5) Qanvast Ops › Lead credits (Overview · Transactions · Contracts) and Reviews (Reviews · Ranking · Feedback) */
  ['qo-credits', '/qanvast-ops/credits'], ['qo-credits-tx', '/qanvast-ops/credits/transactions'], ['qo-credits-contracts', '/qanvast-ops/credits/contracts'],
  ['qo-reviews', '/qanvast-ops/reviews'], ['qo-reviews-ranking', '/qanvast-ops/reviews/ranking'], ['qo-reviews-feedback', '/qanvast-ops/reviews/feedback'],
]
;(async () => {
  const [W = '1440', H = '1024', touch = '', filter = ''] = process.argv.slice(2)
  const w = Number(W), h = Number(H)
  const opts = { viewport: { width: w, height: h }, reducedMotion: 'reduce', ...(touch ? { isMobile: true, hasTouch: true } : {}) }
  const browser = await chromium.launch()
  const cmp = await browser.newPage()
  let failed = 0
  for (const [key, path] of ROUTES.filter(([k]) => !filter || filter.split(',').some((f) => k.startsWith(f)))) {
    const url = BASE + path
    const ca = await browser.newContext(opts); const pa = await ca.newPage()
    await pa.route((u) => u.href === url, async (route) => {
      const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, '')
      await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } })
    })
    await pa.goto(url, { waitUntil: 'load' }).catch(() => {}); await pa.waitForTimeout(900)
    const a = (await pa.screenshot()).toString('base64'); await ca.close()
    const cb = await browser.newContext(opts)
    await cb.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
    const pb = await cb.newPage(); await pb.goto(url, { waitUntil: 'load' }).catch(() => {}); await pb.waitForTimeout(1600)
    const b = (await pb.screenshot()).toString('base64'); await cb.close()
    const diff = await cmp.evaluate(async ({ a, b }) => {
      const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${src}` })
      const [ia, ib] = await Promise.all([load(a), load(b)])
      const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const x = c.getContext('2d')
      x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data
      x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data
      let n = 0
      const out = x.createImageData(c.width, c.height)
      const edge = c.width * (c.height - 40) * 4   // the frame's bottom 40px: the loader's sheet stops at the viewport, the reveal's runs on with the page
      /* the floating buttons' corner (the Maison AI button and a banner's lifted button, placed by the shell's script) */
      const fab = (p) => { const px = (p / 4) % c.width, py = Math.floor(p / 4 / c.width); return px > c.width - 96 && py > c.height - 240 }
      for (let i = 0; i < da.length; i += 4) {
        const d = i < edge && !fab(i) && Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24
        if (d) n++
        out.data[i] = d ? 255 : da[i] * 0.3 + 170; out.data[i + 1] = d ? 0 : da[i + 1] * 0.3 + 170; out.data[i + 2] = d ? 0 : da[i + 2] * 0.3 + 170; out.data[i + 3] = 255
      }
      x.putImageData(out, 0, 0)
      return [n / (c.width * c.height), c.toDataURL('image/png')]
    }, { a, b }).then(([r, url]) => { if (process.env.DIFF_DIR && r > 0.005) require('fs').writeFileSync(`${process.env.DIFF_DIR}/diff-${key}-${w}.png`, Buffer.from(url.split(',')[1], 'base64')); return r })
    const ok = diff <= 0.005
    if (!ok) failed++
    console.log(`${ok ? '✓' : '✗'} ${key.padEnd(24)} ${(diff * 100).toFixed(2)}% of the screen differs between the loader and the reveal`)
  }
  await browser.close()
  console.log(failed ? `\n${failed} route(s) where the reveal is not the loader` : '\nEvery loader is its reveal')
  process.exit(failed ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
