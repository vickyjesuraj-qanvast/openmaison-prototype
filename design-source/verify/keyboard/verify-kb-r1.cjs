// (REG-710 · REG-711…716) Round 1: the credit ring, the ? panel, the listing's and the lead's keys, G then …, the search's row, tooltips,
// the "/" chip, tips and the single-key switch. Against a production build on :3011 on a scratch DB.
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3011'
const OUT = process.env.OUT
let pass = 0, fail = 0
const ok = (c, what, d = '') => { if (c) pass++; else fail++; console.log(`${c ? '✓' : '✗'} ${what}${d ? ` — ${d}` : ''}`) }
const cls = (mod, name) => `[class*="${mod}-module__"][class*="__${name}"]`

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  const settle = (ms = 700) => p.waitForTimeout(ms)
  const focusPage = () => p.mouse.click(1000, 16)
  await p.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await settle(900)

  /* 1 · the credit ring on the rail */
  const ring = p.locator('[data-testid="rail-credits"] svg circle')
  ok(await ring.count() >= 1, 'the rail’s AI credits token draws its ring', `${await ring.count()} circles`)
  const box = await p.locator('[data-testid="rail-credits"] svg').first().boundingBox()
  ok(!!box && Math.round(box.width) === 24, 'the ring fits the rail’s 24 icon box, as the other icons do (REG-718)', box && `${Math.round(box.width)}px`)
  const rail = await p.locator('[data-testid="rail-credits"]').boundingBox()
  await p.screenshot({ path: `${OUT}/kb1-01-rail-ring.png`, clip: { x: 0, y: Math.max(0, rail.y - 60), width: 260, height: 140 } })

  /* 2 · ? opens the panel beside the page; the page makes room; its controls wear their keys */
  await focusPage()
  await p.keyboard.press('Shift+Slash'); await settle(600)
  const panel = p.getByRole('dialog', { name: 'Keyboard shortcuts' })
  ok(await panel.isVisible(), '? opens the Keyboard shortcuts panel')
  const text = await panel.innerText()
  ok(/On this page · Leads/i.test(text), 'it opens on this page', text.split('\n').slice(0, 4).join(' | '))
  ok(/Create New Lead|New lead/.test(text) /* (the calm UI build 2026-10-27, a deliberate change) B2: C reads "New lead" */ && /Next lead/.test(text) && /Filters/.test(text) && /Switch the view/.test(text), 'the listing’s keys, in the page’s words')
  ok(/Everywhere/i.test(text) && /Go to Tasks/.test(text) && /Search the studio/.test(text), 'and the keys that work everywhere')
  const main = await p.locator('#om-main > *').first().boundingBox()
  const pbox = await panel.boundingBox()
  ok(!!main && !!pbox && main.x + main.width <= pbox.x + 2, 'the page makes room for the panel at 1440', main && pbox && `page ends ${Math.round(main.x + main.width)} · panel starts ${Math.round(pbox.x)}`)
  const lit = await p.locator(`${cls('shortcuts', 'tips')} > span`).evaluateAll((els) => els.filter((e) => e.offsetWidth > 0).map((e) => e.textContent))
  ok(lit.includes('F') && lit.includes('V') && lit.includes('G T') && lit.includes('⌘K') && lit.includes('C'), 'the page’s own controls wear their keys', lit.join(' '))
  await p.screenshot({ path: `${OUT}/kb1-02-panel-lit.png` })
  await p.keyboard.press('Escape'); await settle(400)
  ok(!(await panel.isVisible()), 'Esc closes the panel')

  /* 3 · J moves a cursor, X ticks, ⌫ asks first, Esc clears step by step */
  await focusPage()
  await p.keyboard.press('j'); await settle(200); await p.keyboard.press('j'); await settle(300)
  const cursor = p.locator(cls('shortcuts', 'cursor'))
  ok(await cursor.isVisible(), 'J draws the cursor on a lead')
  await p.keyboard.press('x'); await settle(400)
  ok(await p.locator('[data-kb-row][data-selected]').count() === 1, 'X ticks the lead under the cursor')
  await p.screenshot({ path: `${OUT}/kb1-03-cursor-x.png` })
  await p.keyboard.press('Backspace'); await settle(600)
  ok(await p.locator('[aria-modal="true"]').filter({ hasText: /Delete/ }).first().isVisible().catch(() => false), '⌫ opens the delete question — it asks first')
  await p.keyboard.press('Escape'); await settle(400)
  await p.keyboard.press('Escape'); await settle(200)   // the cursor
  await p.keyboard.press('Escape'); await settle(400)   // the selection
  ok(await p.locator('[data-kb-row][data-selected]').count() === 0 && !(await cursor.isVisible().catch(() => false)), 'Esc clears the cursor, then the selection')

  /* 4 · ↵ opens the lead; on it: numbers, J to the next lead of the list, E, A, M, Esc back */
  await p.keyboard.press('j'); await settle(200)
  await p.keyboard.press('Enter'); await p.waitForURL(/\/leads\/[^/?]+/, { timeout: 10000 }).catch(() => {})
  ok(/\/leads\/[^/?]+/.test(p.url()), '↵ opens the lead under the cursor', p.url().replace(BASE, ''))
  await settle(1200)
  await p.keyboard.press('2'); await p.waitForURL(/\/leads\/[^/]+\/tasks/, { timeout: 10000 }).catch(() => {})
  ok(/\/leads\/[^/]+\/tasks/.test(p.url()), '2 opens the lead’s Tasks tab')
  await settle(900)
  await p.keyboard.press('1'); await p.waitForURL((u) => !/\/tasks/.test(u.toString()), { timeout: 10000 }).catch(() => {}); await settle(1000)
  const first = new URL(p.url()).pathname
  await p.keyboard.press('j'); await p.waitForURL((u) => new URL(u.toString()).pathname !== first, { timeout: 10000 }).catch(() => {}); await settle(1000)
  ok(new URL(p.url()).pathname !== first && /\/leads\/[^/?]+$/.test(new URL(p.url()).pathname), 'J on a lead goes to the next lead of the list', `${first} → ${new URL(p.url()).pathname}`)
  ok(/from=%2Fleads/.test(p.url()), 'and keeps the way back to the list')
  await p.keyboard.press('e'); await settle(800)
  ok(await p.locator('[aria-modal="true"]').first().isVisible().catch(() => false), 'E opens Edit lead')
  await p.keyboard.press('Escape'); await settle(600)
  await p.keyboard.press('a'); await settle(600)
  ok(await p.getByRole('dialog', { name: 'Assign Member' }).isVisible().catch(() => false), 'A opens Assign')
  await p.keyboard.press('Escape'); await settle(400)
  await p.keyboard.press('m'); await settle(600)
  ok(await p.getByRole('menu').first().isVisible().catch(() => false), 'M opens the stage menu')
  await p.screenshot({ path: `${OUT}/kb1-04-lead-m.png` })
  await p.keyboard.press('Escape'); await settle(400)
  await p.keyboard.press('Escape'); await p.waitForURL((u) => new URL(u.toString()).pathname === '/leads', { timeout: 10000 }).catch(() => {})
  ok(new URL(p.url()).pathname === '/leads', 'Esc, with nothing open, goes back to the list', p.url().replace(BASE, ''))
  await settle(900)

  /* 5 · G then …: the places after a beat, then the place */
  await focusPage()
  await p.keyboard.press('g'); await settle(650)
  const hint = p.locator(cls('shortcuts', 'chord'))
  ok(await hint.isVisible(), 'G shows the places after a beat')
  await p.screenshot({ path: `${OUT}/kb1-05-g-hint.png` })
  await p.keyboard.press('t'); await p.waitForURL(/\/tasks$/, { timeout: 10000 }).catch(() => {})
  ok(new URL(p.url()).pathname === '/tasks', 'G then T goes to Tasks')
  await settle(900)

  /* 6 · ⌘K: Go to › Keyboard shortcuts, the footer's key */
  await p.keyboard.press('Meta+k'); await settle(600)
  const search = p.getByRole('dialog', { name: 'Search' })
  const goRow = search.getByRole('group', { name: 'Go to' }).getByText('Keyboard shortcuts')
  ok(await goRow.isVisible(), 'the search’s Go to offers Keyboard shortcuts')
  ok(/all shortcuts/.test(await search.innerText()), 'its footer names the key for all shortcuts')
  await goRow.click(); await settle(600)
  ok(await panel.isVisible(), 'picking it opens the panel over the page you are on')
  await p.keyboard.press('Escape'); await settle(400)

  /* 7 · C, tooltips with keys, "/" in the empty search box */
  await p.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await settle(900)
  await focusPage()
  await p.keyboard.press('c'); await settle(800)
  ok(await p.locator('[aria-modal="true"]').first().isVisible().catch(() => false), 'C opens Create New Lead')
  await p.keyboard.press('Escape'); await settle(600)
  await p.getByRole('button', { name: /^Filters/ }).hover(); await settle(700)
  const tipText = await p.getByRole('tooltip').innerText().catch(() => '')
  ok(/Filters/.test(tipText) && /\bF\b/.test(tipText), 'the Filters tooltip names its key', tipText.replace(/\n/g, ' '))
  const fb = await p.getByRole('button', { name: /^Filters/ }).boundingBox()
  await p.screenshot({ path: `${OUT}/kb1-06-tooltip-slash.png`, clip: { x: Math.max(0, fb.x - 360), y: fb.y - 12, width: 480, height: 90 } })
  ok(await p.locator(cls('slash-slot', 'hint')).first().isVisible(), 'the empty search box shows "/"')
  await p.mouse.move(700, 600); await settle(300)

  /* 8 · the third press with the mouse earns one tip */
  for (let i = 0; i < 3; i++) {
    await p.getByRole('button', { name: /^Filters/ }).click(); await settle(700)
    await p.keyboard.press('Escape'); await settle(600)
  }
  await settle(1600)
  const snack = await p.locator('[role="status"]').allInnerTexts().then((a) => a.join(' ')).catch(() => '')
  ok(/Next time, press/.test(snack) && /Filters/.test(snack), 'the third press with the mouse earns a tip', snack.replace(/\s+/g, ' ').slice(0, 90))
  await p.screenshot({ path: `${OUT}/kb1-07-tip.png`, clip: { x: 0, y: 824, width: 760, height: 200 } })

  /* 9 · the single-key switch: letters stop, arrows and ⌘ keys keep working */
  await p.keyboard.press('Meta+Slash'); await settle(500)
  ok(await panel.isVisible(), '⌘/ opens the panel too')
  await panel.getByRole('switch', { name: 'Use single keys' })   /* (the calm UI build 2026-10-27, a deliberate change) plain words for the switch */.click({ force: true }); await settle(300)
  ok(/· off/.test(await panel.innerText()), 'switched off, the single keys read “off”')
  await p.keyboard.press('Escape'); await settle(300)
  await focusPage()
  await p.keyboard.press('j'); await settle(300)
  ok(!(await cursor.isVisible().catch(() => false)), 'with single keys off, J does nothing')
  await p.keyboard.press('ArrowDown'); await settle(300)
  ok(await cursor.isVisible().catch(() => false), 'but ↓ still moves')
  await p.keyboard.press('Meta+Slash'); await settle(400)
  await panel.getByRole('switch', { name: 'Use single keys' })   /* (the calm UI build 2026-10-27, a deliberate change) plain words for the switch */.click({ force: true }); await settle(300)
  await p.keyboard.press('Escape'); await settle(200)

  ok(errs.length === 0, 'no page errors', errs.join(' | ').slice(0, 300))
  await b.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
