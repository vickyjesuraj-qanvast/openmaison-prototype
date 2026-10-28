// (REG-820) The folder crumb in a column host sits right above its list — no stretched gap — in every dialog that browses folders.
// Demo data (Olivia Martinez's lead, her Draft quote, the R59 folders). Usage: next start -p 3011 on a scratch copy of local.db, then
//   NODE_PATH=$PWD/node_modules node verify-folder-crumbs.cjs <out dir>
const { chromium } = require('playwright')
const BASE = 'http://localhost:3011', OUT = process.argv[2], Q = '39e4c832-bf4a-409e-bf41-bfc8d19b4340', L = '2bc08444-0409-47c3-9675-0750977c5838'
let pass = 0, fail = 0; const ok = (c, n) => { if (c) { pass++; console.log('  ✓', n) } else { fail++; console.log('  ✗', n) } }
const measure = (p) => p.evaluate(() => {
  const c = document.querySelector('[role="dialog"] [data-testid="folder-crumbs"]'); if (!c) return null
  const r = c.getBoundingClientRect(); let n = c.parentElement?.matches('[class*="crumbs"]') ? c.parentElement.nextElementSibling : c.nextElementSibling
  const nr = n?.getBoundingClientRect(); const prev = (c.parentElement?.matches('[class*="crumbs"]') ? c.parentElement : c).previousElementSibling?.getBoundingClientRect()
  return { h: Math.round(r.height), below: nr ? Math.round(nr.top - r.bottom) : null, above: prev ? Math.round(r.top - prev.bottom) : null }
})
;(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const p = await ctx.newPage()
  const dlg = () => p.locator('[role="dialog"]').last()
  const check = async (name, open, folder) => {
    await open(); await p.waitForTimeout(700)
    const fb = dlg().getByRole('button', { name: new RegExp(folder) }); await ((await fb.count()) ? fb.first() : dlg().getByText(folder, { exact: true }).first()).click(); await p.waitForTimeout(500)
    const m = await measure(p); await dlg().screenshot({ path: `${OUT}/crumb-${name}.png` })
    ok(m && m.h <= 44 && m.below !== null && m.below <= 24 && (m.above === null || m.above <= 24), `${name}: crumb ${m?.h}px tall, ${m?.above}px above, ${m?.below}px to the list`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  }
  await p.goto(`${BASE}/quotes/${Q}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  /* (the calm UI build 2026-10-27, a deliberate change) one door each (4-03): the link under the table left; the Price book is Create ▾ › From Price book (and each section's foot) */
  const openBook = async () => { await p.locator('#section-items').getByRole('button', { name: 'Create', exact: true }).click(); await p.waitForTimeout(300); await p.getByRole('menuitem', { name: 'From Price book' }).click() }
  await check('price-book-wet-works', openBook, 'Wet works')
  await check('price-book-kitchen', openBook, 'Kitchen')
  await check('price-book-sections', async () => { await openBook(); await p.waitForTimeout(500); await dlg().getByRole('radio', { name: /My Sections/ }).or(dlg().getByRole('button', { name: /My Sections/ })).first().click() }, 'Bathrooms')
  /* (the calm UI build 2026-10-27, a deliberate change) W-270: the Terms card's "My Templates" reads "Templates" — the Create strip's tile shares the word, so the card's own */
  await check('terms-templates', async () => { await p.locator('button:not(aside[aria-label="Create"] button)', { hasText: /^Templates$/ }).first().click() }, 'HDB')
  /* (S46 closing regression, 2026-10-19) since S44Q a Draft quote is pinned to Blank Quote (R173), so the Template card's button reads "Change";
     "Choose a template" only on a quote with none — either opens the same picker */
  await check('quote-template-picker', async () => { await p.getByTestId('template-card').getByRole('button', { name: /^(Choose a template|Change)$/ }).first().click() }, 'HDB')
  await p.goto(`${BASE}/leads/${L}/tasks`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  await check('task-templates', async () => { await p.locator('[data-kb="create"]').first().click(); await p.getByRole('menuitem', { name: 'From a template' }).click() }, 'Lead follow-up')   // (the calm UI build 2026-10-27, a deliberate change) W-021: New task ▾ › From a template
  await p.goto(`${BASE}/leads/${L}/contracts`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  await check('contract-template-picker', async () => { await p.locator('[data-kb="create"]').first().click(); await p.getByRole('menuitem', { name: 'From a template' }).click() }, 'Agreements')   // (the calm UI build 2026-10-27, a deliberate change) W-199: New contract ▾ › From a template
  /* the row hosts keep their crumb on the bar's line */
  await p.goto(`${BASE}/company/price-book`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
  await p.getByRole('button', { name: /Open Wet works/ }).first().click(); await p.waitForTimeout(700)
  const bar = await p.evaluate(() => { const c = document.querySelector('[data-testid="folder-crumbs"]'); const r = c.getBoundingClientRect(); const s = document.querySelector('[placeholder^="Search"]')?.getBoundingClientRect(); return { h: r.height, mid: r.top + r.height / 2, smid: s ? s.top + s.height / 2 : null } })
  ok(bar.h <= 44 && Math.abs(bar.mid - bar.smid) < 3, `Price book page: the crumb on the toolbar's line (${bar.h}px, centres ${Math.round(bar.mid)} vs ${Math.round(bar.smid)})`)
  await p.screenshot({ path: `${OUT}/crumb-page-price-book.png`, clip: { x: 68, y: 130, width: 1372, height: 300 } })
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
