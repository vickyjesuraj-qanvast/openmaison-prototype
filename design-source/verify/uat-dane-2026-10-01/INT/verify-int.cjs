// Dane's UAT build 2026-10-01 — the integration fixes (REG-905). Against a production build on :3011 on a scratch DB (baseline + db:repair).
//   TESTDB=<scratch.db> BASE=http://localhost:3011 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/INT/verify-int.cjs
const { chromium, devices } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3011', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').slice(0, 3).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }

;(async () => {
  const browser = await chromium.launch()

  /* (d) a touch tablet: every Quotes table head sits over its own column (the user's tracks + the band) */
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
  const t = await tablet.newPage(); t.setDefaultTimeout(12000)
  for (const [label, url] of [['the lead’s Quotes tab', `/leads/${sql("select lead_id from quotes where deleted_at is null and number = 'OM-10001'")}/quotes`], ['Tools › Quotes', '/quotes']]) {
    await step(`(d) ${label} at 768 touch`, async () => {
      await t.goto(BASE + url); await ready(t)
      const drift = await t.evaluate(() => {
        const card = document.querySelector('[role="table"][aria-label="Quotes"]'); if (!card) return 'no table'
        const heads = [...card.querySelectorAll('[role="columnheader"][data-col]')]
        const row = card.querySelector('[role="row"]:not(:first-child)') || [...card.querySelectorAll('[role="cell"]')][0]?.parentElement
        const cells = [...card.querySelectorAll('[role="cell"][data-col]')]
        let worst = 0, n = 0
        for (const h of heads) { const c = cells.find((x) => x.dataset.col === h.dataset.col); if (!c) continue; n++; worst = Math.max(worst, Math.abs(c.getBoundingClientRect().left - h.getBoundingClientRect().left)) }
        return { n, worst: Math.round(worst) }
      })
      ok(`(d) ${label}: heads over their cells at 768 touch`, typeof drift === 'object' && drift.n >= 5 && drift.worst <= 1, JSON.stringify(drift))
      await t.screenshot({ path: path.join(OUT, `d-quotes-touch-${label.startsWith('Tools') ? 'tools' : 'lead'}.png`) })
    })
  }
  await tablet.close()

  /* (c) a phone deep link: the Price book item opens visible, not stuck at opacity 0 */
  const phone = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
  const p = await phone.newPage(); p.setDefaultTimeout(12000)
  await step('(c) phone ?open= deep link', async () => {
    const item = sql("select id from price_book_items where deleted_at is null and status = 'live' limit 1")
    await p.goto(`${BASE}/company/price-book?open=${item}`); await ready(p); await p.waitForTimeout(800)
    const st = await p.evaluate(() => { const d = [...document.querySelectorAll('[role="dialog"]')].pop(); if (!d) return 'no dialog'; const cs = getComputedStyle(d); const r = d.getBoundingClientRect(); return { opacity: cs.opacity, transform: cs.transform, top: Math.round(r.top), h: Math.round(r.height) } })
    ok('(c) the item dialog opened by a link on a phone is visible', typeof st === 'object' && Number(st.opacity) > 0.99 && st.top < 844 && st.h > 100, JSON.stringify(st))
    await p.screenshot({ path: path.join(OUT, 'c-phone-deeplink-item.png') })
  })
  await phone.close()

  /* (b) Company › Templates › Contracts › New contract from this template reads "Creating…" until the editor opens */
  const desk = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const d = await desk.newPage(); d.setDefaultTimeout(15000)
  await step('(b) contract template → New contract', async () => {
    await d.goto(`${BASE}/company/templates/contracts?folder=lf-contracts-agreements`); await ready(d)   // the agreement lives in the demo's Agreements folder (R59)
    const card = d.locator('[data-testid="library-card"], [data-testid="library-row"]').first()   // the first contract template on the page, wherever folders put the rest
    await card.waitFor(); await card.hover(); await card.getByRole('button', { name: /More/ }).first().click(); await d.waitForTimeout(300)
    await d.getByRole('menuitem', { name: /New contract/ }).first().click(); await d.waitForTimeout(400)
    const ask = d.getByRole('dialog', { name: 'Which lead is this contract for?' })
    await ask.getByRole('combobox').click(); await d.getByRole('option', { name: 'Olivia Martinez' }).click(); await d.waitForTimeout(200)
    let sawCreating = false
    const watch = (async () => { for (let i = 0; i < 40; i++) { const t = await d.getByTestId('pick-lead-confirm').innerText().catch(() => ''); if (/Creating…/.test(t)) { sawCreating = true; return } await d.waitForTimeout(50) } })()
    await d.getByTestId('pick-lead-confirm').click(); await watch
    await d.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 })
    ok('(b) "Creating…" shows, then the contract editor opens', sawCreating, d.url().split('?')[0].slice(-40))
  })

  /* (e) the three dues: ⌘K's task line reads the house due form */
  await step('(e) ⌘K due form', async () => {
    await d.goto(`${BASE}/leads`); await ready(d)
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await d.waitForTimeout(400)
    const title = sql("select title from lead_tasks where due_at is not null and done = 0 limit 1")
    await d.keyboard.type(title.split(' ').slice(0, 2).join(' ')); await d.waitForTimeout(1200)
    const line = await d.locator('[role="dialog"], [role="listbox"]').filter({ hasText: /due / }).first().innerText().catch(() => '')
    ok('(e) ⌘K task lines read "due Sat, 3 Oct ’26…"', /due (Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} [A-Z][a-z]{2} ’\d{2}/.test(line), line.split('\n').find((l) => /due /.test(l)) || line.slice(0, 80))
  })
  /* the listing's On Hold row: the phone line ellipsises and its copy glyph stays inside the name cell */
  await step('On Hold phone line', async () => {
    await d.goto(`${BASE}/leads`); await ready(d)
    const r = await d.evaluate(() => {
      const row = [...document.querySelectorAll('[role="row"]')].find((x) => x.querySelector('[data-testid="hold-line"]')); if (!row) return 'no On Hold row'   // (pending modules, a deliberate change of this rule) S05: the day has its own line
      const pr = row.querySelector('[class*="phoneRow"]'); const cell = pr?.closest('[role="cell"]'); const btn = pr?.querySelector('button')
      if (!pr || !cell || !btn) return 'missing parts'
      const c = cell.getBoundingClientRect(), b = btn.getBoundingClientRect(), ph = pr.querySelector('[class*="phone"]')
      return { cellRight: Math.round(c.right), glyphRight: Math.round(b.right), cut: ph ? ph.scrollWidth > ph.clientWidth : null }
    })
    ok('the On Hold row’s copy glyph stays inside its cell (the line ellipsises)', typeof r === 'object' && r.glyphRight <= r.cellRight, JSON.stringify(r))
  })
  await desk.close()

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
})()
