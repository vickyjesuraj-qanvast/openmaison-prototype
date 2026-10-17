// The changed surfaces, after: 1440 and 390 touch. Usage: node after.cjs <outDir>
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs')
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3051'
const BEN = '/projects/a3f655a3-c603-42b0-af12-2767a0500138'
;(async () => {
  const b = await chromium.launch(); const errs = []
  const d = await (await b.newContext({ viewport: { width: 1440, height: 1024 } })).newPage(); d.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  const go = async (p, u) => { await p.goto(BASE + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(1300) }
  await go(d, BEN + '/schedule'); await d.screenshot({ path: path.join(OUT, 'schedule-1440.png') })
  await d.locator('[data-testid="client-sees"]').click(); await d.waitForTimeout(900); await d.screenshot({ path: path.join(OUT, 'schedule-pane-1440.png') })
  await d.locator('[data-testid="payment-diamond"]').first().hover(); await d.waitForTimeout(900); await d.screenshot({ path: path.join(OUT, 'schedule-diamond-tip-1440.png'), clip: { x: 300, y: 300, width: 900, height: 300 } })
  await go(d, BEN + '/schedule'); await d.locator('[data-testid="share-changes"]').first().click().catch(async () => { await d.getByRole('button', { name: 'Share changes' }).first().click() }); await d.waitForTimeout(1000); await d.screenshot({ path: path.join(OUT, 'share-dialog-1440.png') })
  await go(d, BEN + '/choices'); await d.screenshot({ path: path.join(OUT, 'choices-1440.png') })
  await go(d, BEN + '/updates'); await d.screenshot({ path: path.join(OUT, 'updates-1440.png') })
  await go(d, BEN); await d.getByRole('button', { name: /More actions|More/ }).first().click(); await d.waitForTimeout(500); await d.getByRole('menuitem', { name: /Client access|portal/i }).first().click(); await d.waitForTimeout(1200); await d.screenshot({ path: path.join(OUT, 'client-access-1440.png') })
  await go(d, BEN + '/invoices/471d130d-f65c-4b7f-aa53-70ee0f16eafa'); await d.screenshot({ path: path.join(OUT, 'invoice-1440.png') })
  await go(d, '/projects'); await d.getByRole('button', { name: /^More/ }).last().click().catch(() => {}); await d.waitForTimeout(500); await d.screenshot({ path: path.join(OUT, 'projects-kebab-1440.png'), clip: { x: 900, y: 0, width: 540, height: 300 } })
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); m.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  await go(m, BEN + '/schedule'); await m.screenshot({ path: path.join(OUT, 'schedule-390.png') })
  await m.evaluate(() => window.scrollTo(0, 400)); await m.waitForTimeout(500); await m.screenshot({ path: path.join(OUT, 'schedule-dock-390.png') })
  console.log(errs.join('\n') || 'no page errors')
  await b.close()
})()
