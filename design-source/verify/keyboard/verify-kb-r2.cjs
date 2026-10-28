// (REG-710 · REG-711…717) Round 2: a lead's tabs (Files end to end with ⌘↵ and ⌘Z, Tasks, Quotes), the quote editor (the panel lists the
// Items table's keys, P, ⌘S, ⌘F, ⌘K, G then L), a Company gallery (J, ↵, P in the template editor), the credit ring's low state, the bell's
// note, Maison AI's door, a phone, and Windows keys. Against a production build on :3011 on a scratch DB.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const BASE = process.env.BASE || 'http://localhost:3011'
const OUT = process.env.OUT
const DB = process.env.DB
const q = (sql) => execSync(`sqlite3 "${DB}" "${sql.replace(/"/g, '\\"')}"`).toString().trim()
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
  const panel = p.getByRole('dialog', { name: 'Keyboard shortcuts' })
  const statusText = () => p.locator('[role="status"]').allInnerTexts().then((a) => a.join(' ')).catch(() => '')
  const LEAD = q(`SELECT l.id FROM lead_files f JOIN leads l ON l.id=f.lead_id WHERE f.kind <> 'folder' AND f.deleted_at IS NULL AND f.parent_id IS NULL AND l.deleted_at IS NULL GROUP BY l.id ORDER BY count(*) DESC LIMIT 1`)
  const QLEAD = q(`SELECT l.id FROM quotes qq JOIN leads l ON l.id=qq.lead_id WHERE qq.deleted_at IS NULL AND l.deleted_at IS NULL GROUP BY l.id ORDER BY count(*) DESC LIMIT 1`)
  const QUOTE = q(`SELECT id FROM quotes WHERE deleted_at IS NULL AND status='Draft' LIMIT 1`)
  const CONTRACT = q(`SELECT id FROM contracts WHERE deleted_at IS NULL LIMIT 1`)

  /* A · a lead's Files, end to end from the keyboard: J · X · ⌫ asks · ⌘↵ confirms · ⌘Z brings it back */
  const trashed = () => Number(q(`SELECT count(*) FROM lead_files WHERE lead_id='${LEAD}' AND deleted_at IS NOT NULL`))
  const before = trashed()
  await p.goto(`${BASE}/leads/${LEAD}/files`, { waitUntil: 'networkidle' }); await settle(1000)
  await focusPage()
  await p.keyboard.press('j'); await settle(300)
  ok(await p.locator(cls('shortcuts', 'cursor')).isVisible(), 'Files: J puts the cursor on the first file or folder')
  // walk to the first file (folders come first)
  for (let i = 0; i < 12; i++) {
    const onFile = await p.evaluate(() => { const r = document.querySelectorAll('[data-kb-list] [data-kb-row]'); const c = document.querySelector('[class*="shortcuts-module__"][class*="__cursor"]'); if (!c) return false; const cr = c.getBoundingClientRect(); return [...r].some((x) => { const b = x.getBoundingClientRect(); return Math.abs(b.top - cr.top) < 3 && Math.abs(b.left - cr.left) < 3 && x.dataset.testid === 'file-tile' }) })
    if (onFile) break
    await p.keyboard.press('j'); await settle(150)
  }
  await p.keyboard.press('x'); await settle(400)
  ok(await p.locator('[data-testid="file-tile"][data-selected]').count() === 1, 'X ticks the file')
  await p.keyboard.press('Backspace'); await settle(700)
  const dlg = p.locator('[aria-modal="true"]').first()
  ok(await dlg.isVisible().catch(() => false), '⌫ opens the trash question — it asks first', (await dlg.innerText().catch(() => '')).split('\n')[0])
  await p.keyboard.press('Meta+Enter'); await settle(1500)
  ok(trashed() === before + 1, '⌘↵ answers the dialog with its primary button', `trashed ${before} → ${trashed()}`)
  ok(/Moved to Trash Folder/.test(await statusText()), 'the snackbar offers Undo')
  await focusPage()
  await p.keyboard.press('Meta+z'); await settle(1800)
  ok(trashed() === before, '⌘Z presses the snackbar’s Undo — the file is back', `trashed ${trashed()}`)

  /* B · the lead's Tasks tab: ↵ opens the task's panel */
  await p.goto(`${BASE}/leads/${LEAD}/tasks`, { waitUntil: 'networkidle' }); await settle(1000)
  await focusPage()
  await p.keyboard.press('j'); await settle(250)
  await p.keyboard.press('Enter'); await settle(900)
  ok(await p.locator('[role="dialog"]').filter({ hasNot: p.locator('[data-kb-panel]') }).first().isVisible().catch(() => false), 'Tasks: ↵ opens the task’s panel')
  await p.keyboard.press('Escape'); await settle(500)
  await p.keyboard.press('c'); await settle(600)
  ok(await p.getByRole('menu').first().isVisible().catch(() => false), 'C opens Add Task')
  await p.keyboard.press('Escape'); await settle(400)

  /* C · Quotes tab: ↵ opens the quote */
  await p.goto(`${BASE}/leads/${QLEAD}/quotes`, { waitUntil: 'networkidle' }); await settle(1000)
  await focusPage()
  await p.keyboard.press('j'); await settle(250)
  await p.keyboard.press('Enter'); await p.waitForURL(/\/quotes\/[^/?]+/, { timeout: 12000 }).catch(() => {})
  ok(/\/quotes\/[^/?]+/.test(p.url()), 'Quotes: ↵ opens the quote', p.url().replace(BASE, ''))

  /* D · the quote editor: the panel lists the Items table's keys; P, ⌘S, ⌘F, ⌘K, G then L */
  await p.goto(`${BASE}/quotes/${QUOTE}`, { waitUntil: 'networkidle' }); await settle(1400)
  await focusPage()
  await p.keyboard.press('Shift+Slash'); await settle(700)
  const ptext = await panel.innerText().catch(() => '')
  ok(/Fill down/.test(ptext) && /Find in the quote/.test(ptext) && /Preview/.test(ptext) && /Switch tabs/.test(ptext), 'the editor’s panel lists its own keys: the Items table, Preview, its sections')
  ok(/Save — everything saves as you type/.test(ptext), '…and ⌘S')
  await p.screenshot({ path: `${OUT}/kb2-01-editor-panel.png` })
  await p.keyboard.press('Escape'); await settle(400)
  await p.keyboard.press('Meta+s'); await settle(500)
  ok(/Saved — everything saves as you type/.test(await statusText()), '⌘S says it is saved, not the browser’s Save page')
  await p.keyboard.press('Meta+f'); await settle(600)
  ok(await p.getByRole('searchbox', { name: 'Find items' }).isVisible().catch(async () => await p.getByLabel('Find items').first().isVisible().catch(() => false)), '⌘F opens the Items table’s Find')
  await p.keyboard.press('Escape'); await settle(400)
  await focusPage()
  await p.keyboard.press('Meta+k'); await settle(600)
  ok(await p.getByRole('dialog', { name: 'Search' }).isVisible(), '⌘K opens the search inside the editor too')
  await p.keyboard.press('Escape'); await settle(300); await p.keyboard.press('Escape'); await settle(300)
  await focusPage()
  await p.keyboard.press('p'); await p.waitForURL(/\/preview/, { timeout: 12000 }).catch(() => {})
  ok(/\/quotes\/[^/]+\/preview/.test(p.url()), 'P opens Preview', p.url().replace(BASE, ''))
  await settle(900)
  await focusPage()
  await p.keyboard.press('g'); await settle(200); await p.keyboard.press('l'); await p.waitForURL(/\/leads$/, { timeout: 12000 }).catch(() => {})
  ok(new URL(p.url()).pathname === '/leads', 'G then L leaves the editor for Leads')

  /* E · the contract editor's P */
  await p.goto(`${BASE}/contracts/${CONTRACT}`, { waitUntil: 'networkidle' }); await settle(1400)
  await focusPage()
  await p.keyboard.press('p'); await p.waitForURL(/\/contracts\/[^/]+\/preview/, { timeout: 12000 }).catch(() => {})
  ok(/\/contracts\/[^/]+\/preview/.test(p.url()), 'the contract editor’s P opens its Preview')

  /* F · a Company gallery: J · ↵ opens the template; P in the template editor */
  await p.goto(`${BASE}/company/templates/quotes`, { waitUntil: 'networkidle' }); await settle(1200)
  await focusPage()
  await p.keyboard.press('j'); await settle(250)
  ok(await p.locator(cls('shortcuts', 'cursor')).isVisible(), 'Templates: J walks the gallery')
  // step past folders to a template card
  for (let i = 0; i < 10; i++) {
    const onCard = await p.evaluate(() => { const c = document.querySelector('[class*="shortcuts-module__"][class*="__cursor"]'); if (!c) return false; const cr = c.getBoundingClientRect(); return [...document.querySelectorAll('[data-testid="library-card"], [data-testid="library-row"]')].some((x) => { const b = x.getBoundingClientRect(); return Math.abs(b.top - cr.top) < 3 && Math.abs(b.left - cr.left) < 3 }) })
    if (onCard) break
    await p.keyboard.press('j'); await settle(150)
  }
  await p.keyboard.press('Enter'); await p.waitForURL((u) => new URL(u.toString()).pathname.startsWith('/templates/'), { timeout: 15000 }).catch(() => {})
  ok(new URL(p.url()).pathname.startsWith('/templates/'), '↵ opens the template', p.url().replace(BASE, ''))
  await settle(1500)
  await focusPage()
  await p.keyboard.press('p'); await settle(900)
  ok(await p.getByRole('button', { name: 'Exit preview' }).isVisible().catch(() => false), 'P previews the template')

  /* G · the credit ring's low state (View as › Almost out), then the base plan again */
  await p.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await settle(900)
  const studio = p.getByRole('button', { name: /^Demo Studio/ })
  await studio.click(); await settle(500)
  await (await openDemo(p)).getByTestId('demo-plan').getByRole('menuitemradio', { name: /^Almost out/ }).click(); await settle(1600)
  ok(await p.locator('[data-testid="rail-credits"] [data-tone="low"] svg circle').count() >= 2, 'Almost out: the ring is a short amber arc, the spark unchanged')
  const rb = await p.locator('[data-testid="rail-credits"]').boundingBox()
  await p.screenshot({ path: `${OUT}/kb2-02-ring-low.png`, clip: { x: 0, y: Math.max(0, rb.y - 40), width: 260, height: 110 } })
  await studio.click(); await settle(500)
  await (await openDemo(p)).getByTestId('demo-plan').getByRole('menuitemradio', { name: /^Pro — Studio The base plan/ }).click(); await settle(1600)

  /* H · the bell's note opens the panel; Maison AI's door */
  await focusPage()
  await p.keyboard.press('g'); await settle(150); await p.keyboard.press('n'); await settle(900)
  const note = p.getByText('Keyboard shortcuts are here')
  ok(await note.first().isVisible().catch(() => false), 'G then N opens the bell, with the keyboard’s note')
  await p.screenshot({ path: `${OUT}/kb2-03-bell-note.png` })
  await note.first().click(); await settle(800)
  ok(await panel.isVisible(), 'the note opens the panel')
  await p.keyboard.press('Escape'); await settle(400)
  /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-19) the Maison AI sheet is Maison AI's alone: the panel's doors are ?, the bell's note above and ⌘K's Go to ›
     Keyboard shortcuts — checked here */
  await p.keyboard.press('Meta+k'); await settle(500)
  await p.keyboard.type('keyboard shortcuts'); await settle(900)
  const door = p.getByRole('option', { name: /Keyboard shortcuts/ }).or(p.locator('[role="dialog"] button, [role="dialog"] a').filter({ hasText: 'Keyboard shortcuts' })).first()
  ok(await door.isVisible().catch(() => false), '⌘K offers Go to › Keyboard shortcuts')
  await door.click(); await settle(700)
  ok(await panel.isVisible(), 'and opens the panel')
  await p.keyboard.press('Escape'); await settle(300)

  /* I · a phone: no keys at all */
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pp = await phone.newPage()
  await pp.goto(`${BASE}/leads/${LEAD}/tasks`, { waitUntil: 'networkidle' }); await pp.waitForTimeout(1000)
  const shownKeys = await pp.locator(`${cls('keys', 'keys')}`).evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length).length)
  ok(shownKeys === 0, 'a phone draws no key chips', `${shownKeys} shown`)
  await pp.screenshot({ path: `${OUT}/kb2-04-phone.png` })
  await phone.close()

  /* J · Windows: Ctrl, not ⌘ */
  const win = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  await win.addInitScript(() => { Object.defineProperty(navigator, 'platform', { get: () => 'Win32' }); Object.defineProperty(navigator, 'userAgentData', { get: () => ({ platform: 'Windows' }) }) })
  const wp = await win.newPage()
  await wp.goto(`${BASE}/leads`, { waitUntil: 'networkidle' }); await wp.waitForTimeout(900)
  const chip = await wp.locator(cls('app-rail', 'kbd')).first().innerText().catch(() => '')
  ok(chip === 'Ctrl+K', 'Windows: the rail’s chip reads Ctrl+K', chip)
  await wp.mouse.click(1000, 16)
  await wp.keyboard.press('Control+k'); await wp.waitForTimeout(600)
  const foot = await wp.getByRole('dialog', { name: 'Search' }).innerText().catch(() => '')
  ok(/Ctrl/.test(foot) && !/⌘/.test(foot), 'the search footer shows Ctrl, never ⌘', foot.split('\n').slice(-6).join(' '))
  await win.close()

  ok(errs.length === 0, 'no page errors', errs.join(' | ').slice(0, 300))
  await b.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
