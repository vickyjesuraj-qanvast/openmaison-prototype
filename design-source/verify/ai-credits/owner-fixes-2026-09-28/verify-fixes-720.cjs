// REG-720 · 721 · 722 — the owner's three catches on Company › Plan & AI credits (2026-09-28):
//  720 the Cancel confirm's red button wrapped and spilled below its 36 box → one line, "Cancel the plan", both buttons inside the alert;
//  721 Profile opened from Plan & billing read "Company / Company /" → "Plan & AI credits / Company /"; other origins unchanged;
//  722 the billing cards were a grid of rows, so the right column's gap was the left card's overhang → two stacks, 16 between cards in
//      each; one column at ≤1024 in the page's order; the loading ghost draws the same stacks. :3011 on a scratch DB.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S || '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/scratchpad/fix720'
const DB = `${S}/test.db`
const OUT = `${S}/shots`
const BASE = 'http://localhost:3011'
const q = (sql) => execSync(`sqlite3 "${DB}" "${sql.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FAIL', m) } }
const cancelFlag = () => q(`SELECT cancel_at_period_end FROM subscriptions WHERE cancelled_at IS NULL ORDER BY created_at DESC LIMIT 1`)

const cards = (page) => page.$$eval('[data-testid^="billing-"][data-card]', (els) => Object.fromEntries(els.map((e) => {
  const r = e.getBoundingClientRect(); return [e.dataset.card, { x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.bottom), w: Math.round(r.width) }]
})))

async function openCancel(page) {
  await page.getByRole('button', { name: 'Manage billing' }).first().click()
  const mb = page.getByTestId('manage-billing')
  await mb.waitFor()
  await mb.getByRole('button', { name: 'Cancel at the period’s end' }).click()
  const conf = page.getByRole('alertdialog').or(page.getByRole('dialog', { name: /Cancel Pro — Studio\?/ })).last()
  await conf.waitFor()
  if (!page.context()._options?.hasTouch) await page.mouse.move(8, 8)   // the ✕ opens under the pointer that pressed the row's button; off it, its tooltip rests
  await page.waitForTimeout(400)
  return conf
}
async function footCheck(page, conf, label) {
  const m = await conf.evaluate((d) => {
    const box = d.getBoundingClientRect()
    const btns = [...d.querySelectorAll('button')].filter((b) => /Keep Pro — Studio|Cancel the plan/.test(b.textContent || ''))
    return { box: { l: box.left, r: box.right }, btns: btns.map((b) => {
      const r = b.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(b)
      const rects = [...range.getClientRects()], lines = new Set(rects.map((c) => Math.round(c.top))).size
      // the text inside the button's own box (scrollHeight would count the 44px touch overlay, REG-347)
      const spill = rects.some((c) => c.top < r.top - 0.5 || c.bottom > r.bottom + 0.5 || c.left < r.left - 0.5 || c.right > r.right + 0.5)
      return { t: (b.textContent || '').trim(), l: r.left, r: r.right, top: r.top, h: Math.round(r.height), lines, spill }
    }) }
  })
  const danger = m.btns.find((b) => b.t === 'Cancel the plan'), keep = m.btns.find((b) => b.t === 'Keep Pro — Studio')
  ok(!!danger && !!keep, `${label}: the two answers — Keep Pro — Studio · Cancel the plan`)
  if (!danger || !keep) return
  ok(danger.h === 36 && danger.lines === 1 && !danger.spill, `${label}: the red button is one line in its 36 box (h ${danger.h}, lines ${danger.lines})`)
  ok(keep.lines === 1, `${label}: Keep is one line`)
  const inside = (b) => b.l >= m.box.l + 15 && b.r <= m.box.r - 15
  ok(inside(keep) && inside(danger), `${label}: both inside the alert (${Math.round(Math.min(keep.l, danger.l) - m.box.l)} · ${Math.round(m.box.r - Math.max(keep.r, danger.r))} from its edges)${keep.top !== danger.top ? ' — on two rows' : ''}`)
}

;(async () => {
  execSync(`mkdir -p ${OUT}`)
  q(`UPDATE members SET is_you = (id = 'dane')`)
  const before = cancelFlag()
  const browser = await chromium.launch()

  console.log('1440 — Plan & billing: two stacks')
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { fail++; console.log('  FAIL page error:', e.message) })
  await page.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' })
  await page.getByTestId('billing-details').waitFor({ timeout: 15000 }); await page.waitForTimeout(900)
  let c = await cards(page)
  ok(c.plan && c.card && c.topups && c.billing, 'four cards: plan · card · top-ups · billing details')
  ok(c.plan.x === c.card.x && c.topups.x === c.billing.x && c.topups.x > c.plan.x, `left stack plan + card (x ${c.plan.x}) · right stack top-ups + details (x ${c.topups.x})`)
  ok(c.plan.y === c.topups.y, 'both stacks start on one line')
  ok(c.card.y - c.plan.b === 16, `left: 16 between the cards (${c.card.y - c.plan.b})`)
  ok(c.billing.y - c.topups.b === 16, `right: 16 between the cards (${c.billing.y - c.topups.b}) — was the plan card's overhang`)
  ok(c.plan.w === c.topups.w, `equal columns (${c.plan.w} · ${c.topups.w})`)
  const region = await page.locator('[data-card="plan"]').evaluate((e) => { const r = e.parentElement.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
  await page.screenshot({ path: `${OUT}/f1-billing-cards-1440.png`, clip: { x: Math.max(0, region.x - 16), y: Math.max(0, region.y - 16), width: region.width + 32, height: region.height + 32 } })

  console.log('1440 — the Cancel confirm')
  let conf = await openCancel(page)
  ok(/Cancel Pro — Studio\?/.test(await conf.innerText()), 'the confirm asks "Cancel Pro — Studio?"')
  await footCheck(page, conf, '1440')
  const d = await conf.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
  await page.screenshot({ path: `${OUT}/f2-cancel-confirm-1440.png`, clip: { x: d.x - 24, y: d.y - 24, width: d.width + 48, height: d.height + 48 } })
  await conf.getByRole('button', { name: 'Keep Pro — Studio' }).click()
  await page.waitForTimeout(400)
  ok(cancelFlag() === before, 'Keep changes nothing on the record')
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)

  console.log('1440 — Edit in Profile: the crumb')
  await page.getByRole('link', { name: 'Edit in Profile' }).click()
  await page.waitForURL(/\/company\/profile\?from=/, { timeout: 10000 }); await page.waitForTimeout(900)
  const crumbText = (await page.locator('header nav[aria-label="Breadcrumb"]').first().innerText()).replace(/\s+/g, ' ').trim()
  ok(crumbText === 'Plan & AI credits / Company /', `the crumb reads "${crumbText}"`)
  ok((await page.locator('header h1').first().innerText()).trim() === 'Profile', 'the title is Profile')
  ok((await page.locator('[data-kb="back"]').first().getAttribute('aria-label')) === 'Back to Plan & AI credits / Company', 'Back names where it goes')
  const hb = await page.locator('header:has([data-kb="back"])').first().boundingBox()
  await page.screenshot({ path: `${OUT}/f3-profile-crumb.png`, clip: { x: hb.x, y: hb.y, width: Math.min(700, hb.width), height: hb.height } })
  await page.getByRole('link', { name: 'Plan & AI credits' }).first().click()
  await page.waitForURL(/\/company\/plan\/billing$/, { timeout: 10000 })
  ok(true, 'the crumb goes back to Plan & billing')
  for (const [path, want] of [['/company/templates/quotes?from=%2Fquotes', 'Quotes / Company /'], ['/company/members?from=%2Fsettings%3Fsection%3Dstudio', 'Settings / Company /'], ['/company/price-book?from=%2Fcompany%2Ftemplates%2Fquotes', 'Templates / Company /']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(700)
    const t = (await page.locator('header nav[aria-label="Breadcrumb"]').first().innerText()).replace(/\s+/g, ' ').trim()
    ok(t === want, `${decodeURIComponent(path)} → "${t}"`)
  }

  console.log('1440 — the ghost draws the same stacks (the reveal held, as verify-ghosts-measure.cjs)')
  const gctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  await gctx.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const gp = await gctx.newPage()
  await gp.goto(`${BASE}/company/plan/billing`, { waitUntil: 'load' }); await gp.waitForTimeout(1600)
  const ghost = await gp.$$eval('[aria-label="Loading the plan"] [data-card]', (els) => Object.fromEntries(els.map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.card, { x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.bottom) }] })))
  ok(ghost.plan && ghost.card && ghost.topups && ghost.billing, 'the ghost has the four cards')
  if (ghost.plan && ghost.card && ghost.topups && ghost.billing) {
    ok(ghost.plan.x === ghost.card.x && ghost.topups.x === ghost.billing.x && ghost.topups.x > ghost.plan.x, 'the ghost: plan + card left, top-ups + details right')
    ok(ghost.card.y - ghost.plan.b === 16 && ghost.billing.y - ghost.topups.b === 16, `the ghost: 16 in each stack (${ghost.card.y - ghost.plan.b} · ${ghost.billing.y - ghost.topups.b})`)
    ok(ghost.plan.x === c.plan.x && ghost.topups.x === c.topups.x && ghost.plan.y === c.plan.y && ghost.topups.y === c.topups.y, `the page lands where the ghost stood (x ${ghost.plan.x} · ${ghost.topups.x}, y ${ghost.plan.y})`)
  }
  await gp.screenshot({ path: `${OUT}/f4-billing-ghost-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 700 } })
  await gctx.close()
  await ctx.close()

  console.log('1024 (mouse) — one column in the page\'s order')
  const tab = await browser.newContext({ viewport: { width: 1024, height: 900 } })
  const tp = await tab.newPage()
  await tp.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' })
  await tp.getByTestId('billing-details').waitFor({ timeout: 15000 }); await tp.waitForTimeout(700)
  c = await cards(tp)
  ok(c.plan.y < c.topups.y && c.topups.y < c.card.y && c.card.y < c.billing.y, 'plan · top-ups · card · billing details')
  ok(c.plan.x === c.topups.x && c.topups.x === c.card.x && c.card.x === c.billing.x, 'one column')
  ok(c.topups.y - c.plan.b === 16 && c.card.y - c.topups.b === 16 && c.billing.y - c.card.b === 16, 'all 16 apart')
  await tab.close()

  console.log('390 (touch) — the cards and the confirm')
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const pp = await phone.newPage()
  pp.on('pageerror', (e) => { fail++; console.log('  FAIL page error:', e.message) })
  await pp.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' })
  await pp.getByTestId('billing-details').waitFor({ timeout: 15000 }); await pp.waitForTimeout(900)
  c = await cards(pp)
  ok(c.plan.y < c.topups.y && c.topups.y < c.card.y && c.card.y < c.billing.y, '390: plan · top-ups · card · billing details')
  ok(c.plan.x === c.billing.x && c.plan.w === c.billing.w, '390: one column')
  ok(await pp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '390: no sideways scroll')
  await pp.screenshot({ path: `${OUT}/f5-billing-390.png`, fullPage: false })
  conf = await openCancel(pp)
  await footCheck(pp, conf, '390')
  await pp.screenshot({ path: `${OUT}/f6-cancel-confirm-390.png` })
  await conf.getByRole('button', { name: 'Keep Pro — Studio' }).tap()
  await pp.waitForTimeout(300)
  ok(cancelFlag() === before, '390: Keep changes nothing')
  await phone.close()

  console.log('320 — the confirm still fits')
  const small = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })
  const sp = await small.newPage()
  await sp.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' })
  await sp.getByTestId('billing-details').waitFor({ timeout: 15000 }); await sp.waitForTimeout(700)
  conf = await openCancel(sp)
  await footCheck(sp, conf, '320')
  await sp.screenshot({ path: `${OUT}/f7-cancel-confirm-320.png` })
  await small.close()

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
