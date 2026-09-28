// (REG-719) Each room's ⋯ inside its own chip: desktop bar and the narrow rooms row; another room's ⋯ picks it and opens its menu under it.
const { chromium } = require('playwright')
const BASE = 'http://localhost:3011', OUT = process.env.OUT, DESIGN = process.env.DESIGN
let pass = 0, fail = 0
const ok = (c, what, d = '') => { if (c) pass++; else fail++; console.log(`${c ? '✓' : '✗'} ${what}${d ? ` — ${d}` : ''}`) }
;(async () => {
  const b = await chromium.launch()
  const errs = []
  for (const [w, h, touch] of [[1440, 1024, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 })
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto(`${BASE}/visualizer/${DESIGN}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1600)
    const group = p.getByTestId('viz-rooms').first()
    const radios = await group.getByRole('radio').count()
    const mores = await group.locator('[data-chip-box] button[aria-haspopup="menu"]').count()
    ok(radios >= 2 && mores === radios, `${w}: every room chip holds its own ⋯`, `${radios} rooms · ${mores} ⋯`)
    ok(await p.getByRole('button', { name: 'Room options', exact: true }).count() === 0, `${w}: no ⋯ outside the chips`)
    const gb = await group.boundingBox()
    await p.screenshot({ path: `${OUT}/rooms-${w}.png`, clip: { x: Math.max(0, gb.x - 16), y: Math.max(0, gb.y - 12), width: Math.min(w, gb.width + 120), height: gb.height + 24 } })
    // the second room's ⋯: picks it, opens its menu under that ⋯
    const second = group.locator('[data-chip-box]').nth(1)
    const name = (await second.getByRole('radio').innerText()).trim()
    const more = second.locator('button[aria-haspopup="menu"]')
    const mb = await more.boundingBox()
    await more.click(); await p.waitForTimeout(700)
    ok(await second.getByRole('radio').getAttribute('aria-checked') === 'true', `${w}: another room's ⋯ picks that room`, name)
    const menu = p.getByRole('menu').filter({ hasText: 'Rename' }).first()
    ok(await menu.isVisible().catch(() => false), `${w}: its menu opens`)
    if (!touch) {
      const nb = await menu.boundingBox()
      ok(!!nb && nb.y >= mb.y + mb.height - 2 && Math.abs((nb.x + nb.width) - (mb.x + mb.width)) < 40, 'the menu hangs under the ⋯ it came from', nb && `menu ${Math.round(nb.x)}–${Math.round(nb.x + nb.width)} · ⋯ ${Math.round(mb.x)}–${Math.round(mb.x + mb.width)}`)
    }
    await p.screenshot({ path: `${OUT}/rooms-${w}-menu.png` })
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await ctx.close()
  }
  ok(errs.length === 0, 'no page errors', errs.join(' | ').slice(0, 200))
  await b.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
