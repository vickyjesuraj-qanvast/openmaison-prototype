/* The app-wide responsiveness sweep (2026-10-23, his "run an overall responsiveness audit and fix all the issues across devices and breakpoints").
   Every route × 320 · 390 · 768 upright · 1024 sideways (touch) · 1280 (a mouse): what a rule can measure —
     sideways   the page scrolls sideways (documentElement.scrollWidth > clientWidth)
     offscreen  a visible control whose box runs past the viewport and no scroller of its own holds it
     covered    a visible control whose centre lands on something else (a fixed bar, the FAB, a sticky head, a sibling)
     target     (touch) a control whose box AND ::after box are under 44 on a side (REG-273 · REG-312)
     tiny       (touch) visible text under 12px
     zoom       (≤767) a text input under 16px (iOS zooms the page on focus)
     clipped    a text box cut without an ellipsis (scrollWidth > clientWidth on overflow hidden / clip)
   Viewport shots at the top and the end of each page. Read-only. Run against `next start` on a scratch copy of a fresh restore (never local.db).
   Usage: NODE_PATH=$PWD/node_modules node design-source/verify/responsive-all/sweep.cjs <base> <outDir> <workers> [route-filter] */
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
const [BASE, OUT, WORKERS = '3', FILTER = ''] = process.argv.slice(2)
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true })
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', PROJECT = 'a3f655a3-c603-42b0-af12-2767a0500138', INVOICE = '471d130d-f65c-4b7f-aa53-70ee0f16eafa', PAYMENT = '901c42fb-3cb5-4664-adf1-79a32baf495d'
const QUOTE = '39e4c832-bf4a-409e-bf41-bfc8d19b4340', CONTRACT = '81463786-769d-42aa-b226-192081cfd6e6', TPL = '1e658ceb-1764-4f8f-ab5e-43523bab9dc3', VIZ = 'b46000d1-1638-4c7c-af20-bebbcc3b9744', LAYOUT = '4a0a2cd8-1a5b-4a8e-ab2d-27fcfac3556d', XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143', SIGN = '301fe7ef-3cd9-47bb-a159-daacd92d7408', CONFIRM = '06e186f7-cb3b-4518-ac6b-078c551a829d', MEETING = '19e14d1a-fae1-49b9-afe1-b0b42c4a0508'
const ROUTES = [
  // Leads · work
  '/dashboard', '/leads', '/leads?view=kanban', '/leads/imports', `/leads/${LEAD}`, ...['tasks', 'quotes', 'contracts', 'files', 'notes', 'meetings', 'questionnaire', 'activity'].map((t) => `/leads/${LEAD}/${t}`),
  '/tasks', '/tickets', '/chat', '/profile',
  // Projects
  '/projects', '/projects?view=workload', `/projects/${PROJECT}`, ...['tasks', 'compliance', 'schedule', 'updates', 'messages', 'tickets', 'questionnaire', 'choices', 'floor-plan', 'designs', 'money', 'files', 'notes', 'activity'].map((t) => `/projects/${PROJECT}/${t}`),
  `/projects/${PROJECT}/invoices/${INVOICE}`, `/projects/${PROJECT}/receipts/${PAYMENT}`, '/compliance',
  // Tools
  '/quotes', `/quotes/${QUOTE}`, `/quotes/${QUOTE}?edit=1`, `/quotes/${QUOTE}/preview`, '/contracts', `/contracts/${CONTRACT}`, `/contracts/${CONTRACT}/preview`,
  '/quote-x-ray', `/quote-x-ray/${XRAY}`, '/visualizer', `/visualizer/${VIZ}`, '/planner', `/planner/${LAYOUT}`, '/meetings', `/meetings/${MEETING}`,
  '/marketplace', '/marketplace?view=deals', '/marketplace/mkb-4101', '/market-insights', '/market-insights/mi-demo-budget-benchmark',
  // Company · Settings
  '/company/profile', '/company/members', '/company/questionnaire', '/company/integrations', '/company/materials', '/company/portal', '/company/portal/clients',
  '/company/templates/brand', '/company/templates/quotes', '/company/templates/contracts', '/company/templates/tasks', '/company/templates/terms', '/company/templates/payments', '/company/templates/schedules',
  `/templates/${TPL}`, '/company/price-book', '/company/price-book/sections', '/company/plan', '/company/plan/billing',
  ...['todo', 'money-in', 'money-out', 'vendors', 'commissions', 'accounting'].map((t) => `/company/finance/${t}`),
  ...['leads', 'projects', 'finance', 'meetings', 'health'].map((t) => `/company/reports/${t}`), '/company/reports/leads?report=sales',
  '/settings', ...['leads', 'quotes', 'projects', 'finance', 'meetings', 'notifications', 'studio'].map((s) => `/settings?section=${s}`),
  // Qanvast Ops
  '/qanvast-ops/leads', '/qanvast-ops/studios', '/qanvast-ops/hangouts', '/qanvast-ops/credits', '/qanvast-ops/reviews',
  // the client's and the public pages
  `/sign/${SIGN}`, `/confirm/${CONFIRM}`, '/my/demo-studio', '/site', '/site/pricing', '/site/try', '/sign-in', '/sign-up',
].filter((r) => !FILTER || r.includes(FILTER))
const WIDTHS = [
  ['320', { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }, true],
  ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, true],
  ['768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }, true],
  ['1024', { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true }, true],
  ['1280', { viewport: { width: 1280, height: 800 } }, false],
]
const slug = (r) => r.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 80) || 'root'

function measure({ touch, w, atEnd }) {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight
  const out = { sideways: Math.max(0, document.documentElement.scrollWidth - vw), offscreen: [], covered: [], target: [], tiny: [], zoom: [], clipped: [] }
  const shown = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return null; return r }
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.getAttribute('title') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 50)
  const where = (el) => { const parts = []; let n = el; for (let i = 0; n && i < 3; i++, n = n.parentElement) { const c = [...n.classList].find((x) => /-module__/.test(x)); if (c) parts.push(c.replace(/-module__\w+__/, '.')) } return parts.join(' < ') }
  const scrollerHolds = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll|hidden)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) return true } return false }
  const CONTROLS = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"], [role="option"], input:not([type="hidden"]), select, textarea, summary'
  const ctrls = [...document.querySelectorAll(CONTROLS)].filter((el) => !el.closest('[aria-hidden="true"], [inert]'))
  for (const el of ctrls) {
    const r = shown(el); if (!r) continue
    const inView = r.bottom > 0 && r.top < vh
    if ((r.right > vw + 1 || r.left < -1) && !scrollerHolds(el)) out.offscreen.push(`${name(el)} [${Math.round(r.left)}–${Math.round(r.right)}] ${where(el)}`)
    if (inView && r.right <= vw && r.left >= 0) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const hit = document.elementFromPoint(cx, cy)
      if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].some((l) => l.contains(hit))) && !hit.closest('label')?.contains(el)) {
        let pinned = false, pinTop = 0; for (let n = hit; n && n !== document.body; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'fixed' || ps === 'sticky') { pinned = true; pinTop = n.getBoundingClientRect().top; break } }
        let selfPinned = false; for (let n = el; n && n !== document.body; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'fixed' || ps === 'sticky') { selfPinned = true; break } }
        const hc = hit.closest(CONTROLS + ', [class*="-module__"]')
        /* at the top, a control scrolled under a pinned bar is only below the fold; at the page's end it is a real cover (no clearance) */
        /* a sticky head or tab strip at the top covers what scrolls under it — that is scrolling; a bar pinned to the bottom half (the dock, the
           FAB, a foot) over a control at the page's end is a cover with no clearance */
        if (!pinned || selfPinned || (atEnd && pinTop >= vh * 0.5)) out.covered.push(`${atEnd ? '[end] ' : ''}${name(el)} under ${hc ? where(hc) || hc.tagName : hit.tagName} ${where(el)}`)
      }
    }
    if (touch && inView && r.width > 2 && r.height > 2) {
      const pa = getComputedStyle(el, '::after'), pb = getComputedStyle(el, '::before')
      const big = (cs) => (cs.content && cs.content !== 'none' && cs.position === 'absolute' ? [parseFloat(cs.width) || 0, parseFloat(cs.height) || 0] : [0, 0])
      const [a1, a2] = big(pa), [b1, b2] = big(pb); const aw = Math.max(a1, b1), ah = Math.max(a2, b2)
      const pw = el.parentElement ? el.parentElement.getBoundingClientRect() : r
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li')
      const box = el.tagName === 'INPUT' && /checkbox|radio/.test(el.type) ? (el.closest('label')?.getBoundingClientRect() || r) : r
      if (!inline && Math.max(box.width, aw) < 44 - 0.5 && Math.max(box.height, ah) < 44 - 0.5) out.target.push(`${name(el)} ${Math.round(box.width)}×${Math.round(box.height)} ${where(el)}`)
      else if (!inline && (Math.max(box.width, aw) < 43.5 || Math.max(box.height, ah) < 43.5) && !(box.width >= 120 && box.height >= 36)) out.target.push(`${name(el)} ${Math.round(box.width)}×${Math.round(box.height)}~ ${where(el)}`)
    }
    if (w <= 767 && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/checkbox|radio|range|file|color|hidden/.test(el.type || '') && inView) {
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 16) out.zoom.push(`${name(el)} ${fs}px ${where(el)}`)
    }
  }
  if (touch) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.trim(); if (t.length < 2) continue
      const el = n.parentElement; if (!el || seen.has(el) || el.closest('[aria-hidden="true"], svg, script, style, [class*="msr"], [class*="mso"], .material-symbols-rounded')) continue
      seen.add(el)
      const r = shown(el); if (!r || r.bottom < 0 || r.top > vh * 2) continue
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) out.tiny.push(`"${t.slice(0, 30)}" ${fs}px ${where(el)}`)
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (!/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis') continue
    if (el.scrollWidth <= el.clientWidth + 2 || el.clientWidth <= 2 || !el.innerText || el.children.length > 3) continue
    const r = shown(el); if (!r || r.top > vh * 2 || r.bottom < 0) continue
    if (/(auto|scroll)/.test(cs.overflowY) || el.matches('[role="tablist"], [class*="scroller"], [class*="scroll"], [class*="strip"], [class*="rail"], [class*="track"]')) continue
    out.clipped.push(`"${el.innerText.replace(/\s+/g, ' ').trim().slice(0, 40)}" ${el.clientWidth}<${el.scrollWidth} ${where(el)}`)
  }
  for (const k of ['offscreen', 'covered', 'target', 'tiny', 'zoom', 'clipped']) out[k] = [...new Set(out[k])].slice(0, 40)
  return out
}

;(async () => {
  const b = await chromium.launch()
  const jobs = []
  for (const [tag, opts, touch] of WIDTHS) for (const route of ROUTES) jobs.push({ tag, opts, touch, route })
  const results = []
  let i = 0
  const worker = async () => {
    const ctxs = new Map()
    while (i < jobs.length) {
      const job = jobs[i++]
      if (!ctxs.has(job.tag)) ctxs.set(job.tag, await b.newContext({ ...job.opts, reducedMotion: 'reduce' }))
      const p = await ctxs.get(job.tag).newPage(); const errors = []
      p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
      try {
        const res = await p.goto(BASE + job.route, { waitUntil: 'networkidle', timeout: 45000 })
        await p.waitForTimeout(1500)
        const m = await p.evaluate(measure, { touch: job.touch, w: job.opts.viewport.width, atEnd: false })
        await p.screenshot({ path: path.join(OUT, 'shots', `${job.tag}-${slug(job.route)}.png`) })
        /* the page's end: what a pinned bar still covers there has no clearance */
        const scrolls = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight > 40)
        if (scrolls) {
          await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(900)
          const e = await p.evaluate(measure, { touch: job.touch, w: job.opts.viewport.width, atEnd: true })
          m.covered = [...new Set([...m.covered, ...e.covered.filter((c) => c.startsWith('[end]'))])].slice(0, 40)
          await p.screenshot({ path: path.join(OUT, 'shots', `${job.tag}-${slug(job.route)}--end.png`) })
        }
        results.push({ route: job.route, width: job.tag, status: res ? res.status() : 0, final: new URL(p.url()).pathname + new URL(p.url()).search, errors, ...m })
      } catch (e) { results.push({ route: job.route, width: job.tag, failed: String(e).slice(0, 200) }) }
      await p.close()
      if (results.length % 25 === 0) console.log(`${results.length}/${jobs.length}`)
    }
  }
  await Promise.all(Array.from({ length: +WORKERS }, worker))
  fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify(results, null, 1))
  const tally = {}
  for (const r of results) for (const k of ['offscreen', 'covered', 'target', 'tiny', 'zoom', 'clipped']) tally[k] = (tally[k] || 0) + (r[k]?.length || 0)
  console.log('done', results.length, 'page-widths ·', JSON.stringify(tally), '· sideways pages', results.filter((r) => r.sideways > 0).length, '· failed', results.filter((r) => r.failed).length)
  await b.close()
})()
