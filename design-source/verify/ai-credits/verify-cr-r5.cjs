// REG-701 · 702 · 704 — AI credits R5: the phone and the tablet. More's first row (paid: the credits card; Free: Upgrade), the card as a
// sheet, Plans as a full-screen sheet, the Visualizer's go bar with its price, the tablet's collapsed rail, and the 320 overflow gate.
/* (pending modules S43C, a deliberate change of this rule) the AI Visualizer's living room is the owner's photo (1.0's 4a51f3522): its walls are
   'Cream Painted Side Wall' · 'Cream Painted Back Wall' · 'Cream Painted TV Wall', its sofa 'Cream Bouclé Sofa' (were 'White Painted Back Wall', 'Grey Fabric Sofa'). */
const { chromium } = require('playwright')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const S = process.env.S || '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/scratchpad/verify'
const DB = `${S}/test.db`
const OUT = `${S}/shots`
const BASE = 'http://localhost:3011'
const DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'
const q = (sql) => execSync(`sqlite3 "${DB}" "${sql.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FAIL', m) } }
const balance = () => Number(q(`SELECT plan_credits + topup_credits FROM studio_credit_balances WHERE id = 'studio'`))
const fmt = (n) => n.toLocaleString('en-SG')
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

;(async () => {
  execSync(`mkdir -p ${OUT}`)
  q(`UPDATE members SET is_you = (id = 'dane')`)
  const browser = await chromium.launch()

  console.log('Phone 390 · Pro')
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await phone.newPage()
  p.on('pageerror', (e) => { fail++; console.log('  FAIL page error:', e.message) })
  await p.goto(`${BASE}/leads`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /^More( \(|$)/ }).click()   // REG-805 (UX audit V3): the dock's More names its counts, "More (Tasks …)"
  const more = p.getByTestId('more-credits')
  await more.waitFor({ timeout: 5000 })
  ok((await more.innerText()).includes(`${fmt(balance())} AI credits`), `More's first row: ${fmt(balance())} AI credits`)
  ok(/Refreshes \d{1,2} \w{3}/.test(await more.innerText()), 'and when it refreshes')
  await p.screenshot({ path: `${OUT}/cr5-01-phone-more.png` })
  await more.click()
  const sheet = p.getByRole('dialog', { name: 'AI credits' })
  await sheet.waitFor({ timeout: 5000 })
  ok((await sheet.innerText()).includes(fmt(balance())), 'the card opens as a sheet')
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${OUT}/cr5-02-phone-card-sheet.png` })
  await sheet.getByRole('button', { name: 'Change plan' }).click()
  const plans = p.getByRole('dialog', { name: 'Plans' })
  await plans.waitFor({ timeout: 5000 })
  await p.waitForTimeout(500)
  const pb = await plans.boundingBox()
  ok(pb && pb.width >= 388, `Plans takes the phone's width (${pb && pb.width})`)
  ok(await overflow(p) <= 0, 'no sideways page scroll under Plans')
  await p.screenshot({ path: `${OUT}/cr5-03-phone-plans.png` })
  await p.keyboard.press('Escape').catch(() => {})
  await p.goto(`${BASE}/company/plan`, { waitUntil: 'networkidle' })
  await p.getByTestId('plan-usage').waitFor()
  ok(await overflow(p) <= 0, 'Plan & AI credits: no sideways page scroll at 390')
  await p.screenshot({ path: `${OUT}/cr5-04-phone-usage.png`, fullPage: true })

  console.log('Phone 390 · the Visualizer’s go bar')
  await p.goto(`${BASE}/visualizer/${DESIGN}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  if (await p.getByTestId('viz-hint').isVisible().catch(() => false)) await p.getByRole('button', { name: 'Got it' }).click()
  ok(await p.getByTestId('credits-chip').isVisible(), 'the balance chip rides the phone’s top bar')
  await p.getByTestId('viz-version').first().click(); await p.waitForTimeout(600)
  await p.getByRole('button', { name: 'Cream Painted Side Wall' }).click(); await p.waitForTimeout(1200)
  await p.getByTestId('viz-swatch').filter({ hasText: 'Cool Grey' }).first().click(); await p.waitForTimeout(400)
  const panelClose = p.getByRole('button', { name: 'Close the panel' })
  if (await panelClose.isVisible().catch(() => false)) { await panelClose.click(); await p.waitForTimeout(500) }
  ok((await p.getByTestId('viz-generate').getByTestId('viz-cost').innerText().catch(() => '')).trim() === '10', 'the go bar’s Generate keeps its cost chip')
  ok(await overflow(p) <= 0, 'the go bar fits (no sideways scroll)')
  await p.screenshot({ path: `${OUT}/cr5-05-phone-viz-go.png` })

  console.log('Phone 390 · Free')
  q(`UPDATE members SET is_you = (id = 'dane')`)
  await p.goto(`${BASE}/leads`, { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /^More( \(|$)/ }).click()
  await p.getByRole('button', { name: /^View as/ }).click()
  const va = p.getByRole('dialog', { name: 'View as' }).or(p.getByRole('menu', { name: 'View as' })).first()
  await va.waitFor()
  await openDemo(p)
  await va.getByRole('menuitemradio', { name: /^Free/ }).click()
  await p.getByText('Studio plan: Free (demo)').waitFor({ timeout: 10000 })
  await p.getByRole('button', { name: /^More( \(|$)/ }).click()
  const upg = p.getByTestId('more-upgrade')
  await upg.waitFor({ timeout: 5000 })
  ok((await upg.innerText()).includes('Upgrade') && (await upg.innerText()).includes('AI credits'), 'Free: More’s first row is Upgrade, with the balance')
  await p.screenshot({ path: `${OUT}/cr5-06-phone-more-free.png` })
  await upg.click()
  await p.getByRole('dialog', { name: 'Plans' }).waitFor({ timeout: 5000 })
  ok(true, 'Upgrade opens Plans on the phone')
  await p.keyboard.press('Escape').catch(() => {})
  await phone.close()

  console.log('Tablet 768 (touch) · Free → Pro back through View as, then the rail')
  const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
  const t = await tab.newPage()
  await t.goto(`${BASE}/leads`, { waitUntil: 'networkidle' })
  await t.getByRole('button', { name: /^Demo Studio/ }).click()
  const menu = t.getByRole('menu', { name: 'View as' }).or(t.getByRole('dialog', { name: 'View as' })).first()
  await menu.waitFor()
  await openDemo(t)
  await menu.getByRole('menuitemradio', { name: /^Pro — Studio The base plan/ }).click()
  await t.getByText('Studio plan: Pro — Studio (demo)').waitFor({ timeout: 10000 })
  const row = t.getByTestId('rail-credits')
  await row.waitFor({ timeout: 10000 })
  const rb = await row.boundingBox()
  ok(rb && rb.width <= 44, `tablet: the collapsed rail's token tile (${rb && rb.width})`)
  await row.click()
  await t.getByTestId('credits-card').waitFor({ timeout: 5000 })
  ok(true, 'a tap opens the card beside the rail')
  await t.screenshot({ path: `${OUT}/cr5-07-tablet-card.png` })
  await tab.close()

  console.log('The 320 gate')
  const narrow = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true })
  const n = await narrow.newPage()
  for (const path of ['/company/plan', '/company/plan/billing', '/leads']) {
    await n.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }); await n.waitForTimeout(500)
    ok(await overflow(n) <= 0, `320: ${path} — no sideways page scroll`)
  }
  await narrow.close()

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
