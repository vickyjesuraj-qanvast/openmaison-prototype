/* The runtime CSS load-order scan (responsive audit 2026-10-23, W6 — the closing lane's job 2). The static `fragile-composes.cjs` reads the
   sheets; this reads what a built page actually loaded. On every route, for every element that wears classes from two different CSS modules
   (a `composes`, or two classes handed together), every longhand both classes set in a plain single-class rule — the same weight (0,1,0),
   unlayered, its @media / @supports active at this width — is decided only by the order the build emitted the two sheets. Turbopack groups CSS
   modules into chunks by size, so ANY added CSS can reorder them (W1-26: three desk pages flipped on one lane's build; W6: the planner's tabs,
   an activity picture, the Choices band, the invoice-paper preview). It records each pair's winner and the element's computed value, with
   the class hashes stripped, so two builds compare:
     node css-order-scan.cjs scan <base> <out.json> [width=1440] [routeFilter]      — one build (a `next start` on a scratch DB)
     node css-order-scan.cjs cmp <before.json> <after.json>                          — the pairs whose winner moved, and whether the value moved
   A pair whose winner moved but whose computed value did not is held by a stronger rule (a doubled class — fine); a pair only the after-build
   has is a new override, also decided by order — `cmp` lists it with its winner to read. Fix a real flip in the file
   that owns the override: `.x.x { … }` (or one more selector), keeping any narrower-width rule for the same property at the same new weight.
   The routes are the round's sweep's (the demo baseline's ids). NODE_PATH=<repo>/node_modules. Read-only. */
const fs = require('fs')
const [MODE, A1, A2, A3 = '1440', FILTER = ''] = process.argv.slice(2)
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', PROJECT = 'a3f655a3-c603-42b0-af12-2767a0500138', INVOICE = '471d130d-f65c-4b7f-aa53-70ee0f16eafa', PAYMENT = '901c42fb-3cb5-4664-adf1-79a32baf495d'
const QUOTE = '39e4c832-bf4a-409e-bf41-bfc8d19b4340', CONTRACT = '81463786-769d-42aa-b226-192081cfd6e6', TPL = '1e658ceb-1764-4f8f-ab5e-43523bab9dc3', VIZ = 'b46000d1-1638-4c7c-af20-bebbcc3b9744', LAYOUT = '4a0a2cd8-1a5b-4a8e-ab2d-27fcfac3556d', XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143', SIGN = '301fe7ef-3cd9-47bb-a159-daacd92d7408', CONFIRM = '06e186f7-cb3b-4518-ac6b-078c551a829d', MEETING = '19e14d1a-fae1-49b9-afe1-b0b42c4a0508'
const ROUTES = [
  '/dashboard', '/leads', '/leads?view=kanban', '/leads/imports', `/leads/${LEAD}`, ...['tasks', 'quotes', 'contracts', 'files', 'notes', 'meetings', 'questionnaire', 'activity'].map((t) => `/leads/${LEAD}/${t}`),
  '/tasks', '/tickets', '/chat', '/profile',
  '/projects', '/projects?view=workload', `/projects/${PROJECT}`, ...['tasks', 'compliance', 'schedule', 'updates', 'messages', 'tickets', 'questionnaire', 'choices', 'floor-plan', 'designs', 'money', 'files', 'notes', 'activity'].map((t) => `/projects/${PROJECT}/${t}`),
  `/projects/${PROJECT}/invoices/${INVOICE}`, `/projects/${PROJECT}/receipts/${PAYMENT}`, '/compliance',
  '/quotes', `/quotes/${QUOTE}`, `/quotes/${QUOTE}?edit=1`, `/quotes/${QUOTE}/preview`, '/contracts', `/contracts/${CONTRACT}`, `/contracts/${CONTRACT}/preview`,
  '/quote-x-ray', `/quote-x-ray/${XRAY}`, '/visualizer', `/visualizer/${VIZ}`, '/planner', `/planner/${LAYOUT}`, '/meetings', `/meetings/${MEETING}`,
  '/marketplace', '/marketplace?view=deals', '/marketplace/mkb-4101', '/market-insights', '/market-insights/mi-demo-budget-benchmark',
  '/company/profile', '/company/members', '/company/questionnaire', '/company/integrations', '/company/materials', '/company/portal', '/company/portal/clients',
  '/company/templates/brand', '/company/templates/quotes', '/company/templates/contracts', '/company/templates/tasks', '/company/templates/terms', '/company/templates/payments', '/company/templates/schedules',
  `/templates/${TPL}`, '/company/price-book', '/company/price-book/sections', '/company/plan', '/company/plan/billing',
  ...['todo', 'money-in', 'money-out', 'vendors', 'commissions', 'accounting'].map((t) => `/company/finance/${t}`),
  ...['leads', 'projects', 'finance', 'meetings', 'health'].map((t) => `/company/reports/${t}`), '/company/reports/leads?report=sales',
  '/settings', ...['leads', 'quotes', 'projects', 'finance', 'meetings', 'notifications', 'studio'].map((s) => `/settings?section=${s}`),
  '/qanvast-ops/leads', '/qanvast-ops/studios', '/qanvast-ops/hangouts', '/qanvast-ops/credits', '/qanvast-ops/reviews',
  `/sign/${SIGN}`, `/confirm/${CONFIRM}`, '/my/demo-studio', '/site', '/site/pricing', '/site/try',
].filter((r) => !FILTER || new RegExp(FILTER).test(r))

function scan() {
  const MOD = /^(.+?)-module__[\w-]{6}__(.+)$/
  const readable = (c) => { const m = c.match(MOD); return m ? `${m[1]}.${m[2]}` : null }
  const rules = new Map()   // class → [{ i, props: Map(prop → value) }], in cascade order, active now
  let i = 0
  const walk = (list, layered) => {
    for (const r of list) {
      i++
      if (r instanceof CSSLayerBlockRule) { walk(r.cssRules, true); continue }   // a layered rule always loses to an unlayered one (REG-727): never order-fragile here
      if (r instanceof CSSMediaRule) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, layered); continue }
      if (r instanceof CSSSupportsRule) { if (CSS.supports(r.conditionText)) walk(r.cssRules, layered); continue }
      if (!(r instanceof CSSStyleRule) || layered) continue
      for (const sel of r.selectorText.split(',').map((s) => s.trim())) {
        const m = sel.match(/^\.([\w-]+)$/); if (!m || !MOD.test(m[1])) continue
        /* a longhand set through a var() shorthand reads '' in the CSSOM — the rule's own text stands for its value then */
        const props = new Map(); for (let k = 0; k < r.style.length; k++) { const p = r.style[k]; if (p !== 'composes') props.set(p, r.style.getPropertyValue(p) || ('§' + r.selectorText + '{' + r.style.cssText + '}')) }
        if (!rules.has(m[1])) rules.set(m[1], [])
        rules.get(m[1]).push({ i, props })
      }
    }
  }
  for (const s of document.styleSheets) { try { walk(s.cssRules, false) } catch { /* cross-origin */ } }
  const out = {}
  for (const el of document.querySelectorAll('[class]')) {
    const cls = [...el.classList].filter((c) => rules.has(c))
    if (cls.length < 2) continue
    for (let a = 0; a < cls.length; a++) for (let b = a + 1; b < cls.length; b++) {
      const A = cls[a], B = cls[b]
      if (A.replace(/__[^_]+$/, '') === B.replace(/__[^_]+$/, '')) continue   // the same file: its own order is fixed
      const last = (C) => { const m = new Map(); for (const r of rules.get(C)) for (const [p, v] of r.props) m.set(p, { i: r.i, v }); return m }
      const la = last(A), lb = last(B)
      for (const [p, x] of la) {
        const y = lb.get(p); if (!y || x.v === y.v) continue
        const [k1, k2] = [readable(A), readable(B)].sort()
        out[`${k1} ⟂ ${k2} :: ${p}`] = { winner: x.i > y.i ? readable(A) : readable(B), computed: getComputedStyle(el).getPropertyValue(p) }
      }
    }
  }
  return out
}

;(async () => {
  if (MODE === 'scan') {
    const { chromium } = require('playwright')
    const b = await chromium.launch()
    const [w, hh] = String(A3).split('x').map(Number), touch = w < 1025   // a width, or WxH (844x390 — a phone held sideways)
    const ctx = await b.newContext({ viewport: { width: w, height: hh || (w < 768 ? 844 : w === 768 ? 1024 : w < 1025 ? 768 : w === 1280 ? 800 : 1024) }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' })
    const result = {}
    for (const route of ROUTES) {
      const p = await ctx.newPage()
      try { await p.goto(A1 + route, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(600); result[route] = await p.evaluate(scan) } catch (e) { result[route] = { error: String(e).slice(0, 100) } }
      await p.close()
    }
    fs.writeFileSync(A2, JSON.stringify(result, null, 1))
    console.log(`${Object.keys(result).length} routes · ${new Set(Object.values(result).flatMap((r) => Object.keys(r))).size} order-only pairs`)
    await b.close()
  } else if (MODE === 'cmp') {
    const [X, Y] = [A1, A2].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
    const moved = new Map()
    for (const route of Object.keys(X)) {
      const a = X[route], c = Y[route]; if (!a || !c || a.error || c.error) continue
      for (const key of Object.keys(a)) if (c[key] && a[key].winner !== c[key].winner) {
        if (!moved.has(key)) moved.set(key, { from: a[key].winner, to: c[key].winner, held: true, routes: [] })
        const m = moved.get(key); m.routes.push(route); if (a[key].computed !== c[key].computed) m.held = false
      }
    }
    const real = [...moved].filter(([, m]) => !m.held), held = [...moved].filter(([, m]) => m.held)
    console.log(`winners moved: ${moved.size} — the value moved too (a flip to fix): ${real.length} · held by a stronger rule: ${held.length}`)
    for (const [k, m] of real) console.log(`  FLIP  ${k} — ${m.from} → ${m.to} · ${m.routes.length} route(s), e.g. ${m.routes[0]}`)
    for (const [k, m] of held) console.log(`  held  ${k} — ${m.from} → ${m.to}`)
    /* a pair that only the after-build has is a new override (a fix added since) — order decides it too: read each winner, and double the
       class that should win (W6 found W3-18's words losing to the quote banner's `flex: 1` this way) */
    const before = new Set(Object.values(X).flatMap((r) => Object.keys(r)))
    const fresh = new Map(); for (const [route, r] of Object.entries(Y)) for (const [k, v] of Object.entries(r)) if (!before.has(k) && !fresh.has(k)) fresh.set(k, `${v.winner} wins (${v.computed}) · ${route}`)
    console.log(`new pairs to read: ${fresh.size}`); for (const [k, v] of fresh) console.log(`  new   ${k} — ${v}`)
    process.exit(real.length ? 1 : 0)
  } else { console.log('usage: css-order-scan.cjs scan <base> <out.json> [width] [filter] | cmp <before.json> <after.json>'); process.exit(2) }
})()
