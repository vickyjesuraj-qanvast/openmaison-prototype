// S43B · F1-03 — the website's capability pictures (lib/site/platform.ts), captured from 2.0's own production build on a scratch copy of the
// demo DB, 1200 × 750 (16:10). Usage: NODE_PATH=<repo>/node_modules node capture-site-pictures-s43b.cjs <outDir> [base] [names…] — then copy
// <outDir>/<module>/<name>.jpg into public/site/marketing/. Never against local.db.
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs')
const OUT = process.argv[2], BASE = process.argv[3] || 'http://localhost:3170'
const only = process.argv.slice(4)
const VIZ = 'b46000d1-1638-4c7c-af20-bebbcc3b9744', RYAN = 'e920e218-7c5b-4ff9-a27b-e62d73c99367', BEN = 'a3f655a3-c603-42b0-af12-2767a0500138', MARCUS_LEAD = '6418e858-13e3-416f-b7c1-2481d1e0ca6f'
const PLAN = '5aa0c6b2-e11b-450d-a17d-3b9517955878'
const w2h = (w) => Math.round(w * 0.625 * 100) / 100
const SHOTS = [
  { file: 'visualiser/auto-detection.jpg', url: `/visualizer/${VIZ}`, act: async (p) => { await p.getByText('Got it').click().catch(() => {}); await p.getByText('Walls', { exact: true }).first().click(); await p.waitForTimeout(1500) }, clip: { x: 560, y: 118, w: 880 } },
  { file: 'visualiser/material-library.jpg', url: '/company/materials', clip: { x: 80, y: 92, w: 880 } },
  { file: 'visualiser/renders.jpg', url: `/visualizer/${VIZ}`, act: async (p) => { await p.getByText('Got it').click().catch(() => {}); await p.waitForTimeout(800) }, clip: { x: 0, y: 540, w: 760 } },
  { file: 'visualiser/sharing.jpg', url: '/renders/17fe84ab2eca47', clip: { x: 264, y: 72, w: 912 }, studio: false },
  { file: 'space-planner/templates.jpg', url: '/planner', act: async (p) => { await p.getByRole('button', { name: 'New' }).click(); await p.waitForTimeout(500); await p.getByText('From a template or a flat…').click(); await p.waitForTimeout(1500) }, clip: { x: 320, y: 24, w: 800 } },
  { file: 'space-planner/smart-placement.jpg', url: `/planner/${PLAN}`, act: async (p) => { await p.mouse.click(816, 470); await p.waitForTimeout(1200) }, clip: { x: 340, y: 230, w: 720 } },
  { file: 'space-planner/camera-views.jpg', url: `/planner/${PLAN}`, act: async (p) => { await p.locator('header, [class*="topbar"]').getByText('3D', { exact: true }).first().click(); await p.waitForTimeout(5000) }, clip: { x: 560, y: 0, w: 880 } },
  { file: 'space-planner/render-share.jpg', url: `/planner/${PLAN}`, act: async (p) => { await p.getByRole('button', { name: 'Share with client' }).click(); await p.waitForTimeout(1500) }, clip: { x: 380, y: 300, w: 680 } },
  { file: 'finance/live-pl.jpg', url: '/company/reports/finance?report=pl', vw: 1100, at: async (p) => { const b = await p.getByText('Profit and loss · 2026').first().boundingBox(); return { x: b.x - 14, y: b.y - 14 } }, clip: { w: 1000 } },
  { file: 'finance/project-margins.jpg', url: '/projects?scope=all', prefs: { projects: [{ key: 'project', visible: true, pinned: true }, { key: 'stage', visible: true }, { key: 'value', visible: true }, { key: 'margin', visible: true }, { key: 'number', visible: false }, { key: 'team', visible: false }, { key: 'collected', visible: false }, { key: 'started', visible: false }, { key: 'targetEnd', visible: false }, { key: 'activity', visible: false }, { key: 'nextMilestone', visible: false }, { key: 'progress', visible: false }, { key: 'projectType', visible: false }, { key: 'lastUpdate', visible: false }] }, vw: 1100, at: async (p) => { const b = await p.locator('[role="table"], table, [class*="table"]').first().boundingBox(); return { x: b.x - 12, y: b.y - 64 } }, clip: { w: 1000 } },
  { file: 'finance/modelling.jpg', url: '/company/finance/commissions', vw: 1100, clip: { x: 80, y: 140, w: 1000 } },
  { file: 'finance/reports.jpg', url: '/company/reports/finance?report=gst', vw: 1100, clip: { x: 80, y: 140, w: 1000 } },
  { file: 'projects/ai-plan.jpg', url: `/projects/${RYAN}/schedule`, act: async (p) => { await p.getByTestId('schedule-kebab').click(); await p.waitForTimeout(500); await p.getByText('Draft with Maison AI…').click(); await p.waitForTimeout(3000) }, clip: { x: 330, y: 96, w: 780 } },
  { file: 'projects/gantt.jpg', url: `/projects/${BEN}/schedule`, vh: 1300, act: async (p) => { await p.getByText('Masonry & tiling').first().waitFor({ timeout: 15000 }); await p.waitForTimeout(1500) }, at: async (p) => { const b = await p.getByText('Milestone', { exact: true }).first().boundingBox(); return { x: b.x - 60, y: b.y - 30 } }, clip: { w: 740 } },
  { file: 'projects/client-hub.jpg', url: '/my/demo-studio', portal: '97731968', clip: { x: 150, y: 70, w: 1140 } },
  { file: 'projects/health-alerts.jpg', url: `/projects/${RYAN}/schedule`, clip: { x: 92, y: 150, w: 820 } },
  { file: 'maison-bot/cross-intel.jpg', url: '/dashboard', act: async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await p.waitForTimeout(900); const box = p.locator('[role="dialog"][aria-label="Maison AI suggestions"] [data-testid="maison-ask"] input'); await box.fill('How is the studio doing?'); await box.press('Enter'); await p.waitForTimeout(2500) }, at: async (p) => { const b = await p.locator('[role="dialog"][aria-label="Maison AI suggestions"]').boundingBox(); return { x: b.x + b.width + 8 - 940, y: Math.max(0, b.y - 8) } }, clip: { w: 940 } },
  { file: 'maison-bot/actions.jpg', url: `/leads/${MARCUS_LEAD}`, act: async (p) => { await p.getByRole('button', { name: 'Draft intro WhatsApp' }).first().click(); await p.waitForTimeout(2500) }, clip: { x: 452, y: 140, w: 884 } },
]
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const errs = []
  for (const s of SHOTS) {
    if (only.length && !only.some((o) => s.file.includes(o))) continue
    const dpr = 1200 / s.clip.w
    const c = await b.newContext({ viewport: { width: s.vw ?? 1440, height: s.vh ?? 1024 }, deviceScaleFactor: dpr })
    if (s.prefs) await c.addInitScript((prefs) => { for (const [k, v] of Object.entries(prefs)) localStorage.setItem(`om.columns.${k}`, JSON.stringify(v)) }, s.prefs)
    await c.addInitScript(() => { try { localStorage.setItem('om.kb.tips', 'off') } catch {} })
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(`${s.file}: ${String(e).slice(0, 140)}`))
    if (s.portal) {
      await p.goto(BASE + '/my/demo-studio/login', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
      await p.locator('input[type="tel"]').fill(s.portal); await p.getByRole('button', { name: 'Send me a code' }).click(); await p.waitForTimeout(1000)
      await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click(); await p.waitForTimeout(3000)
    } else { await p.goto(BASE + s.url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200) }
    if (s.act) await s.act(p)
    await p.mouse.move(1, 1); await p.waitForTimeout(300)
    if (s.at) Object.assign(s.clip, await s.at(p))
    const out = path.join(OUT, s.file); fs.mkdirSync(path.dirname(out), { recursive: true })
    await p.screenshot({ path: out, type: 'jpeg', quality: 86, clip: { x: s.clip.x, y: s.clip.y, width: s.clip.w, height: w2h(s.clip.w) } })
    console.log('✓', s.file)
    await c.close()
  }
  console.log('errors', errs)
  await b.close()
})()
