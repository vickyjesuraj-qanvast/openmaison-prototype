// (REG-709) The global search: open (the rail's tile, ⌘K), the empty state, results and their marks, the keyboard, scopes, Esc, the deep
// links a result opens (a note, a task, a Price book item, a material), recents, the phone's sheet, and Who sees leads. Against a production
// build on :3011 on a scratch DB (it changes the session member and the visibility setting — run it on a copy).
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const S = process.env.S || process.cwd()   // the folder holding the scratch test.db
const DB = process.env.DB || path.join(S, 'test.db')
const BASE = process.env.BASE || 'http://localhost:3011'
const OUT = process.env.OUT || path.join(S, 'shots')
const q = (sql) => execSync(`sqlite3 "${DB}" "${sql.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const check = (ok, what, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? '✓' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`) }

;(async () => {
  q(`UPDATE members SET is_you = (id = 'dane')`)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } })
  const panel = page.getByRole('dialog', { name: 'Search' })
  const input = page.getByRole('combobox', { name: 'Search the studio' })
  await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600)

  /* 1 · the tile opens it beside the rail, the field takes the caret, Go to offers the pages */
  await page.locator('[data-search-tile]').click(); await page.waitForTimeout(400)
  check(await panel.isVisible(), 'the rail’s Search tile opens the search')
  const box = await panel.boundingBox(); const railRight = await page.locator('[data-search-tile]').evaluate((el) => el.closest('nav')?.getBoundingClientRect().right ?? -1)
  check(!!box && Math.abs(box.x - (railRight + 8)) <= 2 && box.width === 560, 'it opens beside the rail, 560 wide', box && `x ${box.x} (rail ends ${railRight}) w ${box.width}`)
  check(await input.evaluate((el) => el === document.activeElement), 'the field takes the caret')
  check(await panel.getByRole('group', { name: 'Go to' }).isVisible(), 'before anything is typed it offers Go to')
  check(await page.locator('[data-search-tile] + span, [class*="app-rail-module__"][class*="__kbd"]').first().innerText().catch(() => '') !== '/', 'the tile’s hint is no longer "/"')
  await page.screenshot({ path: `${OUT}/search-01-empty.png` })

  /* 2 · typing finds, groups, marks and ranks */
  await input.fill('kevin'); await page.waitForTimeout(900)
  const leads = panel.getByRole('group', { name: 'Leads' })
  check(await leads.getByRole('option').first().innerText().then((t) => t.includes('Kevin Ng')), '"kevin" finds Kevin Ng under Leads')
  check(await leads.locator('mark').first().innerText().then((t) => t.toLowerCase() === 'kevin'), 'the matched word is marked')
  check(await leads.getByRole('option').first().innerText().then((t) => /met/i.test(t)), 'the lead carries its stage')
  check(await panel.locator('[role="listbox"] [role="group"]').first().getAttribute('aria-label') === 'Leads', 'the group with the best answer leads')
  const files = panel.getByRole('group', { name: 'Files' })
  check(await files.getByText(/^Show all \d+ in Files$/).isVisible().catch(() => false), 'a long group ends in "Show all n"')
  await page.screenshot({ path: `${OUT}/search-02-kevin.png` })

  /* 3 · the keyboard: ↓ moves, ↵ opens with ?from= the page it was opened on */
  await input.fill('om-1000'); await page.waitForTimeout(900)
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  const active = await panel.locator('[role="option"][aria-selected="true"]').innerText()
  check(/OM-1000/.test(active), '↓ moves the highlight', active.split('\n')[0])
  await page.keyboard.press('Enter'); await page.waitForURL(/\/quotes\/[^/?]+\?from=%2Fleads/, { timeout: 8000 }).catch(() => {})
  check(/\/quotes\/[^/?]+\?from=%2Fleads/.test(page.url()), '↵ opens the quote with ?from=/leads', page.url().replace(BASE, ''))

  /* 4 · ⌘K from anywhere; Esc clears, then closes; a scope narrows */
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
  await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
  check(await panel.isVisible(), '⌘K opens it')
  check(await panel.getByRole('group', { name: 'Recent searches' }).isVisible(), 'what was searched comes back under Recent searches')
  check(await panel.getByRole('group', { name: 'Recently opened' }).getByText(/OM-1000/).first().isVisible(), 'what was opened comes back under Recently opened')
  await input.fill('site'); await page.waitForTimeout(900)
  await panel.getByRole('radio', { name: 'Tasks', exact: true }).click(); await page.waitForTimeout(900)
  const groups = await panel.getByRole('group').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).filter((l) => l && l !== 'Search in'))
  check(groups.length === 1 && groups[0] === 'Tasks', 'the Tasks scope shows tasks only', groups.join(', '))
  await input.focus(); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  check(await input.inputValue() === '' && await panel.isVisible(), 'Esc clears the field first')
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  check(!(await panel.isVisible()), 'a second Esc closes it')
  await page.keyboard.press('Meta+k'); await page.waitForTimeout(300); await page.keyboard.press('Meta+k'); await page.waitForTimeout(400)
  check(!(await panel.isVisible()), '⌘K again closes it')

  /* 5 · a task opens on its panel; a note on itself; a Price book item and a material on their dialogs */
  const open = async (text, scope) => {
    await page.keyboard.press('Meta+k'); await page.waitForTimeout(300)
    await input.fill(text); await page.waitForTimeout(900)
    if (scope) { await panel.getByRole('radio', { name: scope, exact: true }).click(); await page.waitForTimeout(900) }
    await page.keyboard.press('Enter'); await page.waitForTimeout(2600)
  }
  await open('site measurement', 'Tasks')
  check(/\/tasks\?open=|\/leads\/[^/]+\/tasks\?open=/.test(page.url()) && await page.getByRole('dialog').first().isVisible().catch(() => false), 'a task opens with its panel', page.url().replace(BASE, ''))
  const noteTitle = q(`SELECT n.title FROM lead_notes n JOIN leads l ON l.id = n.lead_id WHERE n.kind = 'note' AND n.title IS NOT NULL AND n.title != '' AND l.deleted_at IS NULL LIMIT 1`)
  if (noteTitle) {
    await open(noteTitle, 'Notes & Logs')
    const sel = await page.locator('[data-testid="note-item"][data-selected], [data-testid="note-item"] [aria-current="true"]').first().innerText().catch(() => '')
    check(/\/notes\?open=/.test(page.url()) && sel.includes(noteTitle.slice(0, 12)), 'a note opens on itself', noteTitle)
  }
  await open('vinyl', 'Templates & Price book')
  check(/\/company\/price-book\?open=/.test(page.url()) && await page.getByRole('dialog').first().isVisible().catch(() => false), 'a Price book item opens on its dialog', page.url().replace(BASE, ''))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  await open('oak', 'Templates & Price book')
  check(/\/company\/materials\?open=|\/company\/price-book\?open=/.test(page.url()) && await page.getByRole('dialog').first().isVisible().catch(() => false), 'a material opens on its dialog', page.url().replace(BASE, ''))

  /* 6 · the phone: the bar's glyph opens a sheet */
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await phone.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await phone.waitForTimeout(600)
  await phone.getByRole('button', { name: 'Search', exact: true }).first().tap(); await phone.waitForTimeout(600)
  const sheet = phone.getByRole('dialog', { name: 'Search' })
  check(await sheet.isVisible(), 'on a phone the bar’s search glyph opens the search as a sheet')
  await phone.getByRole('combobox', { name: 'Search the studio' }).fill('olivia'); await phone.waitForTimeout(1000)
  check(await sheet.getByRole('group', { name: 'Leads' }).getByText('Olivia Martinez').isVisible(), 'the sheet finds Olivia Martinez')
  await phone.screenshot({ path: `${OUT}/search-03-phone.png` })
  await phone.close()

  /* 7 · Who sees leads: a Designer who sees only their own leads finds only those */
  const sarahs = q(`SELECT l.name FROM leads l JOIN lead_assignees a ON a.lead_id = l.id WHERE a.member_id = 'sarah' AND l.deleted_at IS NULL LIMIT 1`)
  const before = q(`SELECT value FROM settings WHERE key = 'lead_visibility'`)
  q(`INSERT INTO settings (key, value, updated_at) VALUES ('lead_visibility', '"assigned"', strftime('%s','now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
  q(`UPDATE members SET is_you = (id = 'sarah')`)
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
  await page.keyboard.press('Meta+k'); await page.waitForTimeout(300)
  await input.fill('kevin'); await page.waitForTimeout(1000)
  check(!(await panel.getByText('Kevin Ng', { exact: false }).first().isVisible().catch(() => false)), 'Sarah does not find Kevin Ng, not one of Sarah’s leads')
  if (sarahs) { await input.fill(sarahs.split(' ')[0]); await page.waitForTimeout(1000); check(await panel.getByRole('group', { name: 'Leads' }).getByText(sarahs).isVisible().catch(() => false), `Sarah finds ${sarahs}, one of Sarah’s leads`) }
  q(`UPDATE members SET is_you = (id = 'dane')`)
  if (before) q(`UPDATE settings SET value = '${before.replace(/'/g, "''")}' WHERE key = 'lead_visibility'`); else q(`DELETE FROM settings WHERE key = 'lead_visibility'`)

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
