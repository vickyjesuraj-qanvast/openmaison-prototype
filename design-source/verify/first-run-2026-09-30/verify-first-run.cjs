// (REG-735) First-run empty states — run against `next start -p 3011` on a scratch DB whose libraries, lists and lead tabs are empty.
// Usage: node verify-first-run.cjs <shotDir> <mode: empty|noleads|full> [leadId]
const { chromium } = require('playwright')
const path = require('path')
const [dir, mode, leadId] = process.argv.slice(2)
const BASE = 'http://localhost:3011'
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 1024 } })
  const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(600) }
  const shot = (n) => p.screenshot({ path: path.join(dir, `${n}.png`) })

  if (mode === 'empty') {
    // 1 · the Visualizer's welcome
    await go('/visualizer')
    ok(await p.locator('[data-testid="viz-welcome"]').isVisible(), 'visualizer: the welcome shows')
    ok(await p.locator('[aria-label="What the AI Visualizer does"]').count() === 0, 'visualizer: the intro card steps aside (said once)')
    ok(await p.locator('input[aria-label="Search designs"]').count() === 0, 'visualizer: no toolbar search')
    ok(await p.locator('[data-testid="new-template"]').count() === 0, 'visualizer: the toolbar New steps back')
    ok(await p.locator('header [aria-label="More options"]').count() === 1, 'visualizer: ⋮ sits in the page header')
    ok(await p.locator('[data-testid="viz-welcome-compare"]').isVisible(), 'visualizer: the before/after shows')
    ok(await p.locator('[data-testid="viz-welcome-sample"]').count() === 3, 'visualizer: three sample rooms')
    ok(await p.locator('[data-kb="create"]').count() === 1 && (await p.locator('[data-kb="create"]').innerText()).endsWith('Upload a room photo'), 'visualizer: C is Upload a room photo, the one filled button')
    await shot('viz-welcome-1440')
    // 2 · Upload a room photo → a design with the photo as its first room
    await p.locator('[data-testid="viz-welcome-file"]').setInputFiles(path.resolve('public/visualizer/samples/bedroom/original.jpg'))
    await p.waitForURL(/\/visualizer\/[0-9a-f-]{36}/, { timeout: 15000 })
    await p.waitForTimeout(3500)
    ok(/\/visualizer\/[0-9a-f-]{36}/.test(p.url()), 'upload: the editor opens on the new design')
    ok(await p.getByText('Add the first room').count() === 0, 'upload: the photo became the first room (no "Add the first room")')
    await shot('viz-upload-editor')
    // 3 · back: the gallery returns with its toolbar and the three-step card
    await go('/visualizer')
    ok(await p.locator('[data-testid="viz-welcome"]').count() === 0, 'after: the welcome gives way to the gallery')
    ok(await p.locator('[data-testid="new-template"]').count() === 1, 'after: New ▾ is back in the toolbar')
    ok(await p.locator('[aria-label="What the AI Visualizer does"]').count() === 1, 'after: the three-step card is back')
    await shot('viz-after-first')

    // 4 · every library's first run
    const libs = [
      ['/company/templates/quotes', 'templates-quotes', ['Upload my existing quote', 'Blank template']],
      ['/company/templates/contracts', 'templates-contracts', ['From the studio agreement', 'Blank template', 'From a contract…']],
      ['/company/templates/tasks', 'templates-tasks', ['Blank template', 'From a lead’s tasks…']],
      ['/company/templates/terms', 'templates-terms', ['Write Terms and Conditions', 'Write Additional Notes']],
      ['/company/templates/payments', 'templates-payments', ['Start from Default 10/30/30/30', 'Blank split']],
      ['/company/materials', 'materials', ['New material']],
      ['/company/price-book', 'price-book-items', ['Import from a spreadsheet', 'New item']],
      ['/company/price-book/sections', 'price-book-sections', ['New section']],
    ]
    for (const [url, name, labels] of libs) {
      await go(url)
      const e = p.locator('[data-testid="library-empty"]')
      ok(await e.isVisible(), `${name}: the first-run empty state shows`)
      const got = await e.locator('button').allInnerTexts()
      ok(labels.every((l) => got.some((g) => g.trim().endsWith(l))), `${name}: its buttons — ${labels.join(' · ')}`)
      ok(await p.locator('[data-testid="new-template"]').count() === 0, `${name}: the toolbar New steps back`)
      ok(await p.locator('[aria-label="More options"]').count() >= 1, `${name}: ⋮ stays`)
      ok(await p.locator('[data-kb="create"]').count() === 1, `${name}: one C target (the filled button)`)
      await shot(`lib-${name}`)
    }
    // 5 · the ready-made designs under Templates › Quotes; C on Materials opens New material
    await go('/company/templates/quotes')
    ok(await p.locator('[data-testid="ready-made"]').count() === 4, 'templates-quotes: four ready-made designs')
    await go('/company/materials')
    await p.keyboard.press('c'); await p.waitForTimeout(700)
    ok(await p.locator('[role="dialog"]').count() >= 1, 'materials: C opens New material')
    await p.keyboard.press('Escape')

    // 6 · lists and a lead's tabs: the toolbar's create twin steps back
    const lists = [
      ['/quotes', 'tools-quotes', 'quotes-empty', 'Create Quote'],
      ['/contracts', 'tools-contracts', 'contracts-empty', 'New Contract'],
      ['/tasks', 'tasks-rail', null, 'Add Task'],
      [`/leads/${leadId}/quotes`, 'lead-quotes', 'quotes-empty', 'Create Quote'],
      [`/leads/${leadId}/contracts`, 'lead-contracts', 'contracts-empty', 'New Contract'],
      [`/leads/${leadId}/tasks`, 'lead-tasks', null, 'Add Task'],
      [`/leads/${leadId}/files`, 'lead-files', null, 'New File'],
    ]
    for (const [url, name, testid, twin] of lists) {
      await go(url)
      if (testid) ok(await p.locator(`[data-testid="${testid}"]`).isVisible(), `${name}: the empty card shows`)
      ok(await p.getByRole('button', { name: twin, exact: true }).count() === 0, `${name}: no toolbar “${twin}”`)
      ok(await p.locator('input[aria-label^="Search"]').count() === 0, `${name}: no search on an empty list`)
      ok(await p.locator('[aria-label="More options"]').count() >= 1, `${name}: ⋮ stays`)
      ok(await p.locator('[data-kb="create"]').count() === 1, `${name}: one C target`)
      await shot(`list-${name}`)
    }
    await go('/contracts')
    ok(await p.getByRole('button', { name: 'Import from File', exact: true }).count() === 1, 'tools-contracts: Import from File stays on the card')

    // 7 · phone
    const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await m.goto(BASE + '/company/templates/tasks', { waitUntil: 'networkidle' }); await m.waitForTimeout(600)
    await m.screenshot({ path: path.join(dir, 'lib-templates-tasks-390.png'), fullPage: true })
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), 'phone: no sideways scroll on an empty library')
    await m.close()
  }

  if (mode === 'welcome-phone') {
    for (const [w, h, touch] of [[390, 844, true], [768, 1024, true]]) {
      const m = await b.newPage({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch })
      await m.goto(BASE + '/visualizer', { waitUntil: 'networkidle' }); await m.waitForTimeout(800)
      ok(await m.locator('[data-testid="viz-welcome"]').isVisible(), `welcome at ${w}`)
      ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `welcome at ${w}: no sideways scroll`)
      await m.screenshot({ path: path.join(dir, `viz-welcome-${w}.png`), fullPage: true })
      await m.close()
    }
  }

  if (mode === 'noleads') {
    await go('/leads')
    ok(await p.locator('text=Add your first lead').isVisible(), 'leads: the empty card shows')
    ok(await p.getByRole('button', { name: 'Add Lead', exact: true }).count() === 0, 'leads: the header’s Add Lead steps back')
    ok(await p.locator('input[aria-label="Search leads"]').count() === 0, 'leads: no search')
    ok(await p.getByRole('heading', { name: 'All Leads' }).count() === 1, 'leads: the row says All Leads')
    ok(await p.locator('[data-kb="create"]').count() === 1, 'leads: one C target (Create New Lead)')
    await shot('leads-no-leads')
  }

  if (mode === 'full') {
    // nothing changes where there are records
    await go('/visualizer')
    ok(await p.locator('[data-testid="viz-welcome"]').count() === 0, 'full: no welcome when designs exist')
    ok(await p.locator('[data-testid="new-template"]').count() === 1, 'full: visualizer toolbar New')
    await go('/company/templates/quotes')
    ok(await p.locator('[data-testid="new-template"]').count() === 1 && await p.locator('[data-testid="library-empty"]').count() === 0, 'full: templates toolbar as before')
    await go('/leads')
    ok(await p.getByRole('button', { name: 'Add Lead', exact: true }).count() === 1, 'full: Add Lead in the header')
    ok(await p.locator('input[aria-label="Search leads"]').count() === 1, 'full: the listing’s search')
    await go(`/leads/${leadId}/quotes`)
    ok(await p.getByRole('button', { name: 'Create Quote', exact: true }).count() === 1, 'full: the Quotes tab’s Create Quote')
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  await b.close()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
