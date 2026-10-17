// The portal's phone bar + More sheet, and who overflows at 320. Usage: node portal320.cjs <outDir>
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3051'
const pages = ['', '/schedule', '/updates', '/money', '/choices', '/designs', '/files', '/money/invoice/471d130d-f65c-4b7f-aa53-70ee0f16eafa', '/money/receipt/901c42fb-3cb5-4664-adf1-79a32baf495d']
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  await p.goto(BASE + '/my/demo-studio/login', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  await p.locator('input[type="tel"]').fill('97731968'); await p.getByRole('button', { name: 'Send me a code' }).click(); await p.waitForTimeout(1000)
  await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
  await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(1500)
  await p.screenshot({ path: path.join(OUT, 'p-home-390.png') })
  console.log('bar', await p.locator('[data-testid="portal-dock"] > [data-key]').evaluateAll((as) => as.map((a) => a.getAttribute('data-key'))), 'dot', await p.locator('[data-testid="portal-more-dot"]').count())
  await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(700)
  await p.screenshot({ path: path.join(OUT, 'p-more-390.png') })
  await p.locator('[data-testid="portal-more-sheet"] a[data-key="choices"]').click(); await p.waitForTimeout(1600)
  await p.screenshot({ path: path.join(OUT, 'p-choices-390.png') })
  for (const w of [390, 320]) {
    await p.setViewportSize({ width: w, height: 760 })
    for (const u of pages) {
      await p.goto(BASE + '/my/demo-studio' + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(900)
      const r = await p.evaluate((W) => {
        const sw = document.documentElement.scrollWidth
        if (sw <= W + 1) return null
        const bad = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > W + 1 && b.width > 0 }).slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${(e.className && e.className.baseVal === undefined ? e.className : '').toString().split(' ')[0]} r=${Math.round(e.getBoundingClientRect().right)} w=${Math.round(e.getBoundingClientRect().width)} "${(e.textContent || '').trim().slice(0, 40)}"`)
        return { sw, bad }
      }, w)
      if (r) console.log(w, u || '/', JSON.stringify(r))
      if (w === 320) await p.screenshot({ path: path.join(OUT, `p${u.replace(/\//g, '-').slice(0, 30) || '-home'}-320.png`) })
    }
  }
  /* the studio's own pages at 320 */
  const st = await (await b.newContext({ viewport: { width: 320, height: 760 }, isMobile: true, hasTouch: true })).newPage()
  for (const u of ['/projects', '/projects/a3f655a3-c603-42b0-af12-2767a0500138', '/projects/a3f655a3-c603-42b0-af12-2767a0500138/schedule', '/projects/a3f655a3-c603-42b0-af12-2767a0500138/money', '/projects/a3f655a3-c603-42b0-af12-2767a0500138/choices', '/projects/a3f655a3-c603-42b0-af12-2767a0500138/updates', '/company/portal', '/company/portal/clients', '/settings?section=projects', '/projects/a3f655a3-c603-42b0-af12-2767a0500138/invoices/471d130d-f65c-4b7f-aa53-70ee0f16eafa']) {
    await st.goto(BASE + u, { waitUntil: 'networkidle' }); await st.waitForTimeout(900)
    const sw = await st.evaluate(() => document.documentElement.scrollWidth)
    if (sw > 321) { const bad = await st.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 321 && e.getBoundingClientRect().width > 0 && getComputedStyle(e).position !== 'fixed').slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} r=${Math.round(e.getBoundingClientRect().right)}`)); console.log('studio 320', u, sw, bad.join(' | ')) }
  }
  console.log(errs.join('\n') || 'no page errors')
  await b.close()
})()
