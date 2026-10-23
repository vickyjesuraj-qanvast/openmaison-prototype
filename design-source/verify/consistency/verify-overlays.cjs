// REG-725 — every overlay wears the one head and foot. Opens the overlays the anatomy check can't reach from C / F (the Deleted
// sheets, Import, Move stage, the listing's popovers, Use Template, Move to folder, the task drawer, the file viewer's panel, the
// confirms), measures each head and foot against the standard and screenshots it — 1440, then the sheets and alerts at 390.
// :3011 on a scratch DB. Usage: node verify-overlays.cjs
const { chromium } = require('playwright')
const S = process.env.S || '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/24a43f16-101f-4145-ad44-d6551add8f54/scratchpad/fix720'
const OUT = `${S}/shots/overlays`
const BASE = 'http://localhost:3011'
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', FLEAD = '2bc08444-0409-47c3-9675-0750977c5838', FILE = '15486e62-0c28-4802-894f-632fab54a81f'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FAIL', m) } }
require('child_process').execSync(`mkdir -p ${OUT}`)

/* The topmost overlay holding a house head (a modal, a drawer, a popover), measured. */
async function measure(page) {
  return page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const heads = [...document.querySelectorAll('[data-surface-head]')].filter(vis)
    const modals = [...document.querySelectorAll('[aria-modal="true"]')].filter(vis)
    const handRolled = modals.filter((m) => !m.querySelector('[data-surface-head]')).map((m) => m.getAttribute('aria-label'))
    const head = heads.pop()
    if (!head) return { head: null, handRolled }
    const root = head.closest('[role="dialog"]') || head.parentElement
    const foot = [...root.querySelectorAll('[data-surface-foot]')].filter(vis).pop()
    const hs = getComputedStyle(head), t = head.querySelector('h2'), ts = getComputedStyle(t), fs = foot && getComputedStyle(foot)
    const close = head.querySelector('button[aria-label="Close"]')
    const box = root.getBoundingClientRect()
    return {
      label: root.getAttribute('aria-label') || t.textContent, handRolled, modal: root.getAttribute('aria-modal') === 'true',
      head: { h: Math.round(head.getBoundingClientRect().height), pad: `${hs.paddingTop} ${hs.paddingRight} ${hs.paddingBottom} ${hs.paddingLeft}`, rule: /inset/.test(hs.boxShadow) },
      title: `${ts.fontSize}/${ts.lineHeight}/${ts.fontWeight}`, close: close ? Math.round(close.getBoundingClientRect().width) : 0,
      foot: foot ? { pad: `${fs.paddingTop} ${fs.paddingRight} ${fs.paddingBottom} ${fs.paddingLeft}`, rule: fs.borderTopWidth } : null,
      panel: { radius: getComputedStyle(root).borderRadius, shadow: getComputedStyle(root).boxShadow !== 'none' },
      clip: { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 16), width: Math.min(innerWidth, box.width + 32), height: Math.min(innerHeight, box.height + 32) },
    }
  })
}
async function check(page, name, { phone = false, popover = false, shot } = {}) {
  await page.waitForTimeout(700)
  const m = await measure(page)
  if (!m.head) { ok(false, `${name}: no house head found${m.handRolled.length ? ` — hand-rolled: ${m.handRolled.join(', ')}` : ''}`); return }
  ok(m.handRolled.length === 0, `${name}: every open modal wears the house head${m.handRolled.length ? ` (not: ${m.handRolled.join(', ')})` : ''}`)
  const h = m.head, want = phone ? true : h.pad === '20px 24px 20px 24px'
  ok(h.h >= (phone ? 56 : 64) && h.rule && want && m.title === '20px/24px/700' && m.close === 24,
     `${name}: head ${h.h} · pad ${h.pad} · rule ${h.rule} · title ${m.title} · close ${m.close}`)
  if (m.foot) ok(m.foot.rule === '1px' && (phone || /^16px 24px /.test(m.foot.pad)), `${name}: foot pad ${m.foot.pad} · rule ${m.foot.rule}`)
  if (!popover && m.modal && !phone) ok(m.panel.radius === '12px' && m.panel.shadow, `${name}: panel radius ${m.panel.radius} · elevation ${m.panel.shadow}`)
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, clip: m.clip }).catch(() => page.screenshot({ path: `${OUT}/${shot}.png` }))
}
const tryFlow = async (name, fn) => { try { await fn() } catch (e) { ok(false, `${name}: ${e.message.split('\n')[0]}`) } }
const esc = async (page, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) } }
const vis = (page, sel) => page.locator(sel).filter({ visible: true }).first()
const menuPick = async (page, button, item) => {
  await button.click(); await page.waitForTimeout(400)
  await page.getByRole('menuitem', { name: item }).or(page.getByRole('button', { name: item })).first().click()
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { fail++; console.log('  FAIL page error:', e.message) })

  console.log('1440 — the listing')
  await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Create New Lead', async () => { await page.keyboard.press('c'); await check(page, 'Create New Lead', { shot: 'o01-lead-form' }); await page.getByRole('button', { name: 'Close' }).last().click(); await page.waitForTimeout(400) })
  await tryFlow('Filters', async () => { await page.keyboard.press('f'); await check(page, 'Filters', { shot: 'o02-filters' }); await esc(page) })
  await tryFlow('Deleted Leads', async () => { await menuPick(page, page.getByRole('button', { name: 'More options' }).first(), 'Deleted Leads'); await check(page, 'Deleted Leads', { shot: 'o03-deleted-leads' }); await esc(page) })
  await tryFlow('Import from File', async () => { await menuPick(page, page.locator('[data-kb="create"] button').first(), 'Import from File'); await check(page, 'Import Leads', { shot: 'o04-import' }); await esc(page) })
  await tryFlow('Assign popover', async () => { await vis(page, '[data-kb-row] [data-kb="assign"] button').click(); await check(page, 'Assign popover', { popover: true, shot: 'o05-assign' }); await esc(page) })

  console.log('1440 — a lead')
  await page.goto(`${BASE}/leads/${LEAD}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Move stage', async () => {
    await vis(page, '[data-kb="move-stage"]').click(); await page.waitForTimeout(700)
    if (!(await page.locator('[aria-modal="true"]').count())) {   // the pill opened its stage menu: pick the next stage
      await page.locator('[role="menu"] [role="menuitem"]:not([aria-disabled="true"]), [role="menu"] button:not([disabled])').filter({ visible: true }).first().click()
    }
    await check(page, 'Move stage', { shot: 'o06-move-stage' }); await esc(page, 2)
  })
  await page.goto(`${BASE}/leads/${LEAD}/tasks`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Use Template', async () => { await menuPick(page, vis(page, '[data-kb="create"]'), 'Use Template'); await check(page, 'Use Template', { shot: 'o07-use-template' }); await esc(page) })
  await tryFlow('Task drawer', async () => { const row = page.locator('[data-kb-row]').first(); await row.hover(); await row.locator('[data-kb-open]').click(); await check(page, 'Task drawer', { shot: 'o08-task-drawer' }); await esc(page) })
  await tryFlow('Delete Task confirm', async () => {
    await page.locator('[data-kb-row] [data-kb-select] input, [data-kb-row] [data-kb-select]').first().click({ force: true }); await page.waitForTimeout(400)
    await page.locator('[data-kb="delete"]').first().click(); await check(page, 'Delete Task', { shot: 'o09-delete-task' }); await esc(page, 2)
  })
  await page.goto(`${BASE}/leads/${FLEAD}/files`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Deleted Files', async () => { await menuPick(page, page.getByRole('button', { name: 'More options' }).filter({ visible: true }).last(), 'Deleted Files'); await check(page, 'Deleted Files', { shot: 'o10-deleted-files' }); await esc(page) })
  await tryFlow('Move to folder', async () => {
    const row = page.locator('[data-kb-row]').filter({ visible: true }).first(); await row.hover(); await page.waitForTimeout(200)
    await row.locator('[data-kb-select] input, [data-kb-select] [role="checkbox"], [data-kb-select]').first().click({ force: true }); await page.waitForTimeout(400)
    // (landing 2026-10-23) the bulk bar's own Move to Folder — /^Move/ alone found the lead header's "Move to Contacted" first, which opened the
    // Move stage window (and passed for it); since REG-2655 an unowned lead's move refuses, so the press must be the bar's
    await page.getByRole('toolbar', { name: /selected/ }).getByRole('button', { name: 'Move to Folder' }).click(); await check(page, 'Move to folder', { shot: 'o11-move-to-folder' }); await esc(page, 2)
  })
  await tryFlow('File viewer panel', async () => {
    await page.goto(`${BASE}/leads/${FLEAD}/files/${FILE}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
    await page.getByRole('button', { name: 'Information' }).first().click()
    await check(page, 'File viewer · Information', { popover: true, shot: 'o12-file-info' })
    await page.getByRole('button', { name: 'Comments' }).first().click()
    await check(page, 'File viewer · Comments', { popover: true, shot: 'o12b-file-comments' })
  })
  await page.goto(`${BASE}/leads/${LEAD}/quotes`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Create Quote', async () => { await page.keyboard.press('c'); await check(page, 'Create Quote', { shot: 'o13-create-quote' }); await esc(page) })

  console.log('1440 — Company')
  await page.goto(`${BASE}/company/templates/quotes`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Deleted templates', async () => { await menuPick(page, page.getByRole('button', { name: 'More options' }).first(), /^Deleted/); await check(page, 'Deleted templates', { shot: 'o14-deleted-templates' }); await esc(page) })
  await page.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await tryFlow('Manage billing + confirm', async () => {
    await page.getByRole('button', { name: 'Manage billing' }).first().click(); await check(page, 'Manage billing', { shot: 'o15-manage-billing' })
    await page.getByTestId('manage-billing').getByRole('button', { name: 'Cancel at the period’s end' }).click(); await page.mouse.move(8, 8)
    await check(page, 'Cancel the plan confirm', { shot: 'o16-cancel-confirm' }); await esc(page, 2)
  })
  await ctx.close()

  console.log('390 — sheets and alerts')
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const pp = await phone.newPage()
  await pp.goto(`${BASE}/leads/${LEAD}/tasks`, { waitUntil: 'networkidle' }); await pp.waitForTimeout(1200)
  await tryFlow('390 Add Task menu (sheet)', async () => { await vis(pp, '[data-kb="create"]').tap(); await check(pp, '390 Add Task menu', { phone: true, shot: 'p01-add-task-sheet' }); await pp.getByRole('button', { name: 'Close' }).last().tap(); await pp.waitForTimeout(400) })
  await pp.goto(`${BASE}/company/plan/billing`, { waitUntil: 'networkidle' }); await pp.waitForTimeout(1200)
  await tryFlow('390 Manage billing + confirm', async () => {
    await pp.getByRole('button', { name: 'Manage billing' }).first().tap(); await check(pp, '390 Manage billing (sheet)', { phone: true, shot: 'p02-manage-billing-sheet' })
    await pp.getByTestId('manage-billing').getByRole('button', { name: 'Cancel at the period’s end' }).tap()
    await check(pp, '390 Cancel the plan (card)', { phone: true, shot: 'p03-cancel-card' })
  })
  await phone.close()
  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
