// (REG-708) What a real load paints, frame by frame: a CDP screencast from the navigation until the page settles, sampled every 80ms into
// one contact sheet per trip — a full load (goto) or an in-app hop (a start page, then a click). A good film shows one ghost, then the page.
// Against :3011 on a scratch DB. Usage: OUT=<dir> node verify-ghosts-film.cjs <key,key…> [w] [h] [touch]   — keys below
const { chromium } = require('playwright')
const fs = require('fs')
const S = process.env.OUT || require('path').join(process.cwd(), 'ghost-shots')   // where the pictures go (outside the repo is best)
const OUT = `${S}/film`
const BASE = 'http://localhost:3011'
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', FLEAD = '2bc08444-0409-47c3-9675-0750977c5838', FILE = '15486e62-0c28-4802-894f-632fab54a81f'
const XRAY = '53f4f1a2-a5fa-42ba-aa6f-dde1a73af143', QUOTE = '1f598389-4008-4079-a956-5dff071fb708', CONTRACT = '81463786-769d-42aa-b226-192081cfd6e6'
const TTPL = '53a859ef-9545-4228-8cc3-11f2183ddff9'
const tab = (name) => async (p) => { await p.getByRole('tab', { name }).first().click() }
const railCompany = (item) => async (p) => { await p.getByRole('button', { name: /^Company/ }).first().click(); await p.waitForTimeout(400); await p.getByRole('link', { name: item }).or(p.getByRole('menuitem', { name: item })).first().click() }
const FILMS = {
  /* hard loads */
  'billing': { path: '/company/plan/billing' }, 'usage': { path: '/company/plan' }, 'members': { path: '/company/members' }, 'profile': { path: '/company/profile' },
  'integrations': { path: '/company/integrations' }, 'questionnaire': { path: '/company/questionnaire' }, 'materials': { path: '/company/materials' },
  'tpl-quotes': { path: '/company/templates/quotes' }, 'tpl-brand': { path: '/company/templates/brand' }, 'pb-items': { path: '/company/price-book' }, 'pb-sections': { path: '/company/price-book/sections' },
  'leads': { path: '/leads' }, 'lead': { path: `/leads/${LEAD}` }, 'lead-files': { path: `/leads/${LEAD}/files` }, 'lead-notes': { path: `/leads/${LEAD}/notes` },
  'lead-activity': { path: `/leads/${LEAD}/activity` }, 'lead-questionnaire': { path: `/leads/${LEAD}/questionnaire` }, 'lead-tasks': { path: `/leads/${LEAD}/tasks` },
  'viewer': { path: `/leads/${FLEAD}/files/${FILE}` }, 'insights': { path: '/company/reports/leads' }, 'imports': { path: '/leads/imports' },
  'tasks': { path: '/tasks' }, 'quotes': { path: '/quotes' }, 'contracts': { path: '/contracts' }, 'xray': { path: '/quote-x-ray' }, 'xray-record': { path: `/quote-x-ray/${XRAY}` },
  'visualizer': { path: '/visualizer' }, 'settings': { path: '/settings' }, 'settings-notifications': { path: '/settings?section=notifications' },
  'quote-preview': { path: `/quotes/${QUOTE}/preview` }, 'contract-preview': { path: `/contracts/${CONTRACT}/preview` }, 'contract': { path: `/contracts/${CONTRACT}` },
  'tpl-tasks-editor': { path: `/templates/tasks/${TTPL}` },
  /* soft trips */
  'nav-usage-billing': { start: '/company/plan', go: tab('Plan & billing') },
  'nav-billing-usage': { start: '/company/plan/billing', go: tab('Usage') },
  'nav-lead-files': { start: `/leads/${LEAD}`, go: tab(/^Files/) },
  'nav-lead-notes': { start: `/leads/${LEAD}/tasks`, go: tab(/^Notes/) },
  'nav-tplq-brand': { start: '/company/templates/quotes', go: tab('Brand kit') },
  'nav-brand-tplq': { start: '/company/templates/brand', go: tab('Quotes') },
  'nav-tplq-contracts': { start: '/company/templates/quotes', go: tab('Contracts') },
  'nav-profile-members': { start: '/company/profile', go: railCompany('Members') },
  'nav-leads-insights': { start: '/leads', go: async (p) => { await p.getByRole('button', { name: 'More options' }).first().click(); await p.waitForTimeout(300); await p.getByTestId('leads-reports').click() } },   // (the calm UI build 2026-10-27, a deliberate change) B2 2-13: the listing's Insights is the ⋮'s Reports row
  'nav-leads-lead': { start: '/leads', go: async (p) => { await p.getByText('Kevin Ng', { exact: true }).first().click() } },
}
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const [keys = '', W = '1440', H = '1024', touch = ''] = process.argv.slice(2)
  const w = Number(W), h = Number(H)
  const browser = await chromium.launch()
  for (const key of keys.split(',').filter(Boolean)) {
    const f = FILMS[key]; if (!f) { console.log('no film', key); continue }
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
    const page = await ctx.newPage()
    if (f.start) { await page.goto(BASE + f.start, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500) }
    const cdp = await ctx.newCDPSession(page)
    const frames = []
    cdp.on('Page.screencastFrame', async (fr) => {
      frames.push({ t: fr.metadata.timestamp * 1000, data: fr.data })
      await cdp.send('Page.screencastFrameAck', { sessionId: fr.sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: w, maxHeight: h, everyNthFrame: 1 })
    await page.waitForTimeout(150)
    const t0 = Date.now()
    if (f.start) await f.go(page).catch((e) => console.log('  (go)', e.message.split('\n')[0]))
    else await page.goto(BASE + f.path, { waitUntil: 'commit' }).catch(() => {})
    await page.waitForTimeout(2600)
    await cdp.send('Page.stopScreencast').catch(() => {})
    /* sample: the frame on screen at every 80ms step from the start (the last frame at or before it) */
    const start = t0
    const picks = []
    for (let s = 0; s <= 2400; s += 80) {
      const at = start + s
      let fr = null
      for (const x of frames) if (x.t <= at) fr = x
      if (fr && (!picks.length || picks[picks.length - 1].fr !== fr)) picks.push({ s, fr })
    }
    const scale = w > 800 ? 0.3 : 0.45
    const tw = Math.round(w * scale), th = Math.round(h * scale)
    const html = `<body style="margin:0;background:#202020;display:flex;flex-wrap:wrap;gap:8px;padding:8px;font:600 12px system-ui;color:#fff;width:${tw * 5 + 60}px">${picks.map((x) => `<figure style="margin:0"><figcaption>${x.s}ms</figcaption><img src="data:image/jpeg;base64,${x.fr.data}" style="width:${tw}px;height:${th}px;display:block;object-fit:cover;object-position:top"></figure>`).join('')}</body>`
    const rows = Math.ceil(picks.length / 5)
    const ps = await browser.newPage({ viewport: { width: tw * 5 + 60, height: rows * (th + 26) + 16 } })
    await ps.setContent(html); await ps.waitForTimeout(200)
    await ps.screenshot({ path: `${OUT}/${key}-${w}${touch ? 't' : ''}.png`, fullPage: true }); await ps.close()
    console.log('film', key, `${frames.length} frames, ${picks.length} distinct samples`, page.url().replace(BASE, ''))
    await ctx.close()
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
