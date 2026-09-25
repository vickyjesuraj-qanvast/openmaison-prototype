// REG-670 · the rail panels (View as 304 · Company 304 · Tools 318) keep their width whatever order the menu stylesheets load in — run against :3011
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1440, height: 1024 } })
  await page.goto('http://localhost:3011/leads', { waitUntil: 'networkidle' })
  const measure = async (name, open) => { await open(); const m = page.getByRole('menu', { name }); await m.waitFor(); await page.waitForTimeout(400); const w = Math.round((await m.boundingBox()).width); await page.keyboard.press('Escape'); await page.waitForTimeout(200); return w }
  const P = [['View as', () => page.getByRole('button', { name: /^Demo Studio/ }).click()], ['Company', () => page.locator('nav').getByRole('button', { name: /^Company/ }).first().click()], ['Tools', () => page.locator('nav').getByRole('button', { name: /^Tools/ }).first().click()]]
  for (const [n, o] of P) console.log('normal order ·', n, await measure(n, o))
  // The worst case: a second copy of the menus sheet lands LAST (what a later route chunk does after Back).
  const moved = await page.evaluate(() => {
    for (const s of [...document.styleSheets]) { let t = ''; try { t = [...s.cssRules].map((r) => r.cssText).join('\n') } catch { continue }
      if (/menus-module__[\w-]+__menu \{[^}]*width: 200px/.test(t)) { const el = document.createElement('style'); el.textContent = t; document.head.appendChild(el); return true } }
    return false
  })
  console.log('menus sheet copied to the end:', moved)
  for (const [n, o] of P) console.log('menus sheet last ·', n, await measure(n, o))
  // Control: a single-class panel rule (the old CSS) under the same order loses to .menu → 200.
  const control = await page.evaluate(() => {
    const d = document.createElement('div'); const cls = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules] } catch { return [] } }).map((r) => r.selectorText || '').find((sel) => /^\.menus-module__[\w-]+__menu$/.test(sel))
    const probe = document.createElement('style'); probe.textContent = '.old-panel-probe { width: 304px; }'; document.head.insertBefore(probe, document.head.firstChild)
    d.className = cls.slice(1) + ' old-panel-probe'; document.body.appendChild(d); const w = d.getBoundingClientRect().width; d.remove(); probe.remove(); return w
  })
  console.log('control — a single-class 304 rule loaded before .menu renders at', control)
  await b.close()
})()
