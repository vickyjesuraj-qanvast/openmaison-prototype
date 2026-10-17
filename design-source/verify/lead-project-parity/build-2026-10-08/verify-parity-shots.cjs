const { chromium } = require('playwright')
const B = 'http://localhost:3011', O = process.argv[2]
const BEN = '/projects/a3f655a3-c603-42b0-af12-2767a0500138', GERALD = '/leads/bed4ded0-1ac7-48fd-a7c4-639a7a00f02f', RYANLEAD = '/leads/5e8b9c29-54ef-4b56-96a4-2027804c4cd7'
;(async () => {
  const br = await chromium.launch()
  const errs = []
  const shotAt = async (vp, mobile, list) => {
    const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
    for (const [u, n, act] of list) {
      await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
      if (act) await act(p)
      const sw = await p.evaluate(() => document.documentElement.scrollWidth)
      await p.screenshot({ path: `${O}/${n}.png` }); console.log(n, 'scrollWidth', sw)
    }
    await ctx.close()
  }
  await shotAt({ width: 1440, height: 1024 }, false, [
    [BEN, '01-project-overview'], [GERALD, '02-lead-overview'], [RYANLEAD, '03-won-lead'],
    [BEN, '04-project-stage-menu', async (p) => { await p.locator('[data-kb="move-stage"]').first().click(); await p.waitForTimeout(500) }],
    [BEN, '05-project-kebab', async (p) => { await p.getByRole('button', { name: /More actions|More/ }).first().click(); await p.waitForTimeout(500) }],
    [BEN + '?edit=1', '06-project-edit'],
    [BEN + '/tasks', '07-project-tasks'],
    ['/projects', '08-projects-listing'], ['/leads', '09-leads-listing'],
    ['/company/reports/leads', '10-reports-leads'], ['/company/reports/projects', '11-reports-projects'],
    ['/settings?section=studio', '12-settings-studio'], ['/settings?section=projects', '13-settings-projects'],
    [BEN + '/activity', '14-project-activity'],
  ])
  await shotAt({ width: 768, height: 1024 }, true, [[BEN, 't1-project-overview'], ['/projects', 't2-projects-listing']])
  await shotAt({ width: 390, height: 844 }, true, [[BEN, 'p1-project-overview'], [GERALD, 'p2-lead-overview'], ['/projects', 'p3-projects-listing'], ['/leads', 'p4-leads-listing'], ['/company/reports/projects', 'p5-reports-projects'], [BEN + '/activity', 'p6-project-activity']])
  console.log('errors:', errs.length, errs.slice(0, 5).join(' | '))
  await br.close()
})()
