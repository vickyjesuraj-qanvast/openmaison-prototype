// Dane's UAT fixes 2026-10-01 — package P5a: the Leads listing, import and the lead's Overview (13 cards).
// Run against a production build on a FRESH copy of the demo baseline (it writes: a quote, a stage move, an answer, a Lost move).
//   DATABASE_URL=file:<scratch.db> npx next start -p 3036
//   TESTDB=<scratch.db> BASE=http://localhost:3036 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P5a/verify-p5a.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3036', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1000) }
const lead = (name) => sql(`select id from leads where name = '${name}'`)
const MEI = lead('Mei Ling Tan'), GERALD = lead('Gerald Tan'), FARAH = lead('Farah Ahmad'), JONATHAN = lead('Jonathan Teo'), OLIVIA = lead('Olivia Martinez'), BEN = lead('Benjamin Han')
const BEN_C = sql(`select id from contracts where lead_id = '${BEN}' and status = 'Signed' and deleted_at is null limit 1`)
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const snackBar = (page) => page.locator('[role="status"][aria-live="polite"] > div').last()
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackBar(page).innerText().catch(() => ''); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackBar(page).innerText().catch(() => '') }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)

  /* ── b-resume (UAT 7.13): the locked Convert's refusal names the stage; its action is only the verb ── */
  await step('b-resume', async () => {
    await page.goto(`${BASE}/leads/${MEI}`); await ready(page)
    await page.locator('[data-testid="convert-locked"] button').click()
    const t = await snack(page, /first/)
    const action = (await snackBar(page).locator('button').first().innerText()).trim()
    ok('b-resume the refusal names the stage', /^Resume at \w[\w ]* first/.test(t), t.split('\n')[0])
    ok('b-resume its action reads "Resume" — the words don’t repeat', action === 'Resume', action)
    await page.waitForTimeout(500); await shot(page, 'b-resume-snackbar', { x: 0, y: 760, width: 1440, height: 264 })
    await snackBar(page).locator('button').first().click(); await page.waitForTimeout(500)
    ok('b-resume the action opens the "Resume at X?" confirm', await page.getByRole('dialog').getByText(/^Resume at .+\?$/).isVisible())
    await page.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400)
  })

  /* ── g-resumerow (UAT 9.06): the parked row resumes through the confirm, as the header does; the head arrow still opens the window ── */
  await step('g-resumerow', async () => {
    await page.locator('[data-card="lead-stages"] [data-state="hold"]').click(); await page.waitForTimeout(500)
    const confirm = page.getByRole('dialog').filter({ hasText: /Resume at .+\?/ })
    ok('g-resumerow the On Hold row opens the "Resume at X?" confirm', await confirm.isVisible())
    ok('g-resumerow …not the Move stage window', !(await page.locator('[role="dialog"][aria-label="Move stage"]').isVisible()))
    await shot(page, 'g-resumerow-confirm')
    await page.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400)
    ok('g-resumerow Cancel leaves the lead On Hold', sql(`select stage from leads where id = '${MEI}'`) === 'On Hold')
  })

  /* ── b-insights (UAT 11.09): Insights from a lead — the crumb stays "Leads", Back names the lead ── */
  await step('b-insights', async () => {
    await page.locator('[data-testid="response-time"]').click()
    await page.waitForURL(/\/leads\/insights\?from=/); await ready(page)
    const back = page.locator('a[data-kb="back"]')
    ok('b-insights Back says where it goes — the lead', (await back.getAttribute('aria-label')) === 'Back to Mei Ling Tan', await back.getAttribute('aria-label'))
    const crumb = await back.evaluate((a) => a.closest('header')?.querySelector('[class*="crumb"]')?.textContent?.trim() ?? '')
    ok('b-insights the crumb stays "Leads" (Insights is studio-wide)', /^Leads\s*\/$/.test(crumb), crumb)
    await back.hover(); await page.waitForTimeout(700)
    ok('b-insights the tooltip says the same', (await page.locator('[role="tooltip"]').innerText().catch(() => '')).startsWith('Back to Mei Ling Tan'))
    await shot(page, 'b-insights-back', { x: 0, y: 0, width: 720, height: 160 })
    await back.click(); await page.waitForURL(new RegExp(`/leads/${MEI}$`))
    ok('b-insights Back lands on the lead', page.url().endsWith(`/leads/${MEI}`))
    await page.goto(`${BASE}/leads/insights?from=${encodeURIComponent('/leads')}`); await ready(page)
    ok('b-insights from the listing Back still reads "Back to Leads"', (await page.locator('a[data-kb="back"]').getAttribute('aria-label')) === 'Back to Leads')
  })

  /* ── b-doublequote: From Scratch pressed twice makes one quote ── */
  await step('b-doublequote', async () => {
    const before = Number(sql(`select count(*) from quotes where lead_id = '${GERALD}'`))
    await page.goto(`${BASE}/leads/${GERALD}`); await ready(page)
    const btn = page.locator('[data-card="quotes"]').getByRole('button', { name: 'From Scratch' })
    await btn.evaluate((b) => { b.click(); b.click() })
    await page.waitForURL(/\/quotes\/[0-9a-zA-Z-]+/, { timeout: 15000 }); await page.waitForTimeout(1500)
    const after = Number(sql(`select count(*) from quotes where lead_id = '${GERALD}'`))
    ok('b-doublequote a double press makes ONE quote', after === before + 1, `${before} → ${after}`)
  })

  /* ── g-taskback (UAT 5.05): a task on the Overview opens the Tasks tab's panel over the Overview ── */
  await step('g-taskback', async () => {
    await page.goto(`${BASE}/leads/${FARAH}`); await ready(page)
    /* Upcoming rests folded (858:24989) — open it so every task row shows */
    const fold = page.locator('[data-card="my-work"] button[aria-expanded="false"]')
    if (await fold.count()) { await fold.first().click(); await page.waitForTimeout(300) }
    await page.locator('[data-card="my-work"] button[aria-label^="Open \\""]').first().click(); await page.waitForTimeout(700)
    const panel = page.locator('aside[role="dialog"][aria-label="Task"]')
    ok('g-taskback MY TASKS opens the task panel', await panel.isVisible())
    ok('g-taskback …over the Overview (the address stays on the lead)', new URL(page.url()).pathname === `/leads/${FARAH}`)
    ok('g-taskback the panel offers Open in Tasks', await panel.getByRole('button', { name: 'Open in Tasks' }).isVisible())
    ok('g-taskback the panel is the tab’s own (Mark as Completed, Members, Tags, Attachments)', await panel.getByRole('button', { name: 'Mark as Completed' }).isVisible() && await panel.getByRole('region', { name: 'Members' }).isVisible().catch(() => true))
    await shot(page, 'g-taskback-panel-over-overview')
    await panel.getByRole('button', { name: /^Close/ }).click(); await page.waitForTimeout(600)
    ok('g-taskback closing returns to the Overview', !(await panel.isVisible()) && new URL(page.url()).pathname === `/leads/${FARAH}` && await page.locator('[data-card="lead-stages"]').first().isVisible())
    /* LEAD STAGES' next follow-up opens the same panel */
    const fu = page.locator('[data-testid="next-follow-up"]')
    if (!(await fu.getAttribute('data-empty'))) {
      await fu.click(); await page.waitForTimeout(700)
      ok('g-taskback LEAD STAGES’ next follow-up opens the panel too', await panel.isVisible() && new URL(page.url()).pathname === `/leads/${FARAH}`)
      await panel.getByRole('button', { name: /^Close/ }).click(); await page.waitForTimeout(500)
    }
    await page.locator('[data-card="my-work"] button[aria-label^="Open \\""]').first().click(); await page.waitForTimeout(600)
    const title = (await panel.locator('textarea').first().inputValue())
    await panel.getByRole('button', { name: 'Open in Tasks' }).click()
    await page.waitForURL(new RegExp(`/leads/${FARAH}/tasks\\?open=`)); await ready(page)
    ok('g-taskback Open in Tasks lands on the Tasks tab with the task open', await page.locator('aside[role="dialog"][aria-label="Task"]').isVisible() && (await page.locator('aside[role="dialog"][aria-label="Task"] textarea').first().inputValue()) === title)
  })

  /* ── g-afterstage (UAT 5.19): a move from another tab stays put; the snackbar's View → Overview, LEAD STAGES pulsing once ── */
  await step('g-afterstage', async () => {
    await page.goto(`${BASE}/leads/${FARAH}/questionnaire`); await ready(page)
    await page.locator('[data-testid="header-primary"] button').click(); await page.waitForTimeout(700)
    const wiz = page.locator('[role="dialog"][aria-label="Move stage"]')
    await wiz.getByRole('combobox', { name: /Where/ }).click(); await page.getByRole('option', { name: 'In person' }).click()
    await wiz.getByRole('button', { name: /Date & Time/ }).first().click().catch(async () => { await wiz.getByText('Date & Time', { exact: false }).first().click() })
    await page.getByRole('button', { name: 'Today' }).click(); await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
    await wiz.getByRole('button', { name: 'Save', exact: true }).click()
    const t = await snack(page, /Moved to Met/)
    ok('g-afterstage the move from the Questionnaire tab stays on the tab', /\/questionnaire/.test(page.url()) && /Moved to Met/.test(t), t.split('\n')[0])
    const view = snackBar(page).getByRole('button', { name: 'View' })
    ok('g-afterstage "Moved to Met" carries View', await view.isVisible())
    await page.waitForTimeout(400); await shot(page, 'g-afterstage-snackbar-view', { x: 0, y: 760, width: 1440, height: 264 })
    await view.click()
    await page.waitForURL(new RegExp(`/leads/${FARAH}(\\?|$)`))
    const fresh = await page.locator('[data-card="lead-stages"][data-fresh]').waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false)
    ok('g-afterstage View lands on the Overview with LEAD STAGES pulsing', fresh && new URL(page.url()).pathname === `/leads/${FARAH}`)
    await page.waitForTimeout(150); await shot(page, 'g-afterstage-stages-pulse')
    ok('g-afterstage the pulse parameter leaves the address', !page.url().includes('pulse='))
    await page.waitForTimeout(1800)
    ok('g-afterstage it pulses once', (await page.locator('[data-card="lead-stages"][data-fresh]').count()) === 0)
    /* on the Overview itself the snackbar keeps no View */
  })

  /* ── g-holdhint (UAT 9.08): the Lost dialog's nudge in the warning tone, with Put On Hold instead ── */
  await step('g-holdhint', async () => {
    await page.goto(`${BASE}/leads/${JONATHAN}`); await ready(page)
    const openLost = async () => {
      await page.getByRole('button', { name: /^Stage: / }).click()
      await page.locator('[role="menu"]').getByText('Lost', { exact: true }).click(); await page.waitForTimeout(500)
      const dlg = page.getByRole('dialog').filter({ hasText: 'Moving to Lost' })
      await dlg.getByRole('combobox', { name: /Reason/ }).click(); await page.getByRole('option', { name: 'Project postponed' }).click()
      await dlg.getByRole('button', { name: /Expected restart/ }).first().click().catch(async () => { await dlg.getByText('Expected restart (optional)').click() })
      for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: 'Next month' }).click(); await page.waitForTimeout(80) }
      await page.getByRole('button', { name: /^15 / }).first().click(); await page.waitForTimeout(400)
      return dlg
    }
    const dlg = await openLost()
    const nudge = dlg.locator('[data-testid="lost-hold-nudge"]')
    ok('g-holdhint the nudge shows for a restart 3 months out', await nudge.isVisible() && /Under 6 months away/.test(await nudge.innerText()))
    const colour = await nudge.evaluate((el) => getComputedStyle(el).color)
    const ink = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--om-color-on-tertiary-yellow-variant)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c })
    ok('g-holdhint …in the house warning tone, with its glyph', colour === ink && (await nudge.locator('.msr, .mso, [class*="icon"]').first().innerText().catch(() => '')).includes('warning'), `${colour} vs ${ink}`)
    ok('g-holdhint …and Save & Move stays live', await dlg.getByRole('button', { name: 'Save & Move' }).isEnabled())
    const restart = await dlg.getByRole('button', { name: /Expected restart/ }).first().innerText().catch(() => '')
    await shot(page, 'g-holdhint-nudge')
    await nudge.getByRole('button', { name: 'Put On Hold instead' }).click(); await page.waitForTimeout(600)
    const hold = page.getByRole('dialog').filter({ hasText: 'Moving to On Hold' })
    ok('g-holdhint Put On Hold instead switches to the On Hold dialog', await hold.isVisible() && !(await dlg.isVisible()))
    ok('g-holdhint …on its Custom date', (await hold.getByRole('radio', { name: 'Custom' }).getAttribute('aria-checked')) === 'true')
    const follow = (await hold.getByText(/Next follow up date will be/).innerText()).replace('Next follow up date will be ', '').trim()
    ok('g-holdhint …set to the expected restart (15th, three months on)', /^15 /.test(follow), `${follow} · restart field: ${restart.replace(/\s+/g, ' ')}`)
    await shot(page, 'g-holdhint-on-hold-custom')
    await hold.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(400)
    /* Save & Move with the nudge on screen still moves the lead to Lost, unchanged */
    const dlg2 = await openLost()
    await dlg2.getByRole('button', { name: 'Save & Move' }).click()
    const t = await snack(page, /Moved to Lost/)
    ok('g-holdhint Save & Move still moves the lead to Lost', /Moved to Lost/.test(t) && sql(`select stage from leads where id = '${JONATHAN}'`) === 'Lost')
  })

  /* ── g-answered (UAT 5.17): the answered card travels to its place, comes into view and pulses once ── */
  await step('g-answered', async () => {
    await page.goto(`${BASE}/leads/${OLIVIA}/questionnaire`); await ready(page)
    const ids = () => page.$$eval('[data-question-id]', (els) => els.map((e) => e.getAttribute('data-question-id')))
    const before = await ids()
    const first = before[0]
    const card = page.locator(`[data-question-id="${first}"]`)
    await card.getByText('Answer', { exact: true }).click(); await page.waitForTimeout(300)
    await card.locator('textarea').fill('Two cats')
    /* watch the card's transform while it moves */
    await page.evaluate((id) => { window.__moved = false; const t0 = performance.now(); const tick = () => { const el = document.querySelector(`[data-question-id="${id}"]`); if (el && getComputedStyle(el).transform !== 'none') window.__moved = true; if (performance.now() - t0 < 2500) requestAnimationFrame(tick) }; requestAnimationFrame(tick) }, first)
    await card.getByRole('button', { name: 'Save', exact: true }).click()
    const fresh = await page.locator(`[data-question-id="${first}"][data-fresh]`).waitFor({ state: 'attached', timeout: 5000 }).then(() => true).catch(() => false)
    const after = await ids()
    ok('g-answered the answered question moves below the open ones', after.indexOf(first) === 3, `index ${after.indexOf(first)}`)
    ok('g-answered …travelling there (a layout animation, not a jump)', await page.evaluate(() => window.__moved))
    ok('g-answered …then pulses once there', fresh)
    const box = await page.locator(`[data-question-id="${first}"]`).boundingBox()
    ok('g-answered …in view', !!box && box.y >= 0 && box.y + box.height <= 1024)
    await shot(page, 'g-answered-pulse')
  })

  /* ── k-signednotice (UAT 8.17): a Won link for a lead already Won lands on its Contracts tab, the contract pulsed ── */
  await step('k-signednotice', async () => {
    await page.goto(`${BASE}/leads/${BEN}?move=won&contract=${BEN_C}`)
    await page.waitForURL(new RegExp(`/leads/${BEN}/contracts`), { timeout: 10000 })
    ok('k-signednotice the link lands on the Contracts tab', new URL(page.url()).pathname === `/leads/${BEN}/contracts`)
    ok('k-signednotice …not the Move stage window', !(await page.locator('[role="dialog"][aria-label="Move stage"]').isVisible()))
    let pulsed = false
    const t0 = Date.now()
    while (Date.now() - t0 < 4000 && !pulsed) { pulsed = await page.evaluate((id) => { const r = document.querySelector(`[data-kb-list="contract"] [data-kb-row][data-kb-id="${id}"]`); return !!r && r.getAnimations().length > 0 }, BEN_C); if (!pulsed) await page.waitForTimeout(100) }
    ok('k-signednotice …with the signed contract’s row pulsed', pulsed)
    await page.waitForTimeout(200); await shot(page, 'k-signednotice-contracts-tab')
    ok('k-signednotice the open parameter leaves the address', !page.url().includes('open='))
    await page.goto(`${BASE}/leads/${MEI}?move=won&contract=${BEN_C}`); await ready(page)
    ok('k-signednotice a Won link on a lead not yet Won keeps REG-779 (no Contracts jump)', new URL(page.url()).pathname === `/leads/${MEI}`)
  })

  /* ── g-viewall (UAT 1.05): scoped to a stage → View all beside the pill (the dot stays); one press back; search kept ── */
  await step('g-viewall', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    const viewAll = page.locator('[data-testid="view-all-leads"]')
    ok('g-viewall hidden at All Leads', (await viewAll.count()) === 0)
    await page.getByRole('searchbox', { name: 'Search leads' }).fill('a').catch(async () => { await page.getByLabel('Search leads').fill('a') })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^All Leads/ }).click()
    await page.getByRole('menuitemradio', { name: /^Contacted/ }).click(); await page.waitForTimeout(400)
    const pill = page.getByRole('button', { name: /^Contacted \(/ })
    ok('g-viewall scoped: View all shows beside the pill', await viewAll.isVisible() && await viewAll.evaluate((el) => !el.closest('[data-folded]')))
    ok('g-viewall …and the applied dot is still on the pill (REG-295)', (await pill.locator('[class*="dot"]').count()) > 0)
    await shot(page, 'g-viewall-scoped-1440', { x: 0, y: 0, width: 1440, height: 260 })
    await viewAll.click(); await page.waitForTimeout(400)
    ok('g-viewall one press back to All Leads', await page.getByRole('button', { name: /^All Leads \(/ }).isVisible() && (await viewAll.count()) === 0)
    ok('g-viewall the search stays', (await page.getByLabel('Search leads').inputValue()) === 'a')
  })

  /* ── g-kanban (UAT 4.23): a card hovered underlines its name, as the table does ── */
  await step('g-kanban', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.getByLabel('Kanban view').click(); await page.waitForTimeout(800)
    const name = page.locator('[class*="__cardName"]').first()
    ok('g-kanban the name rests without an underline', (await name.evaluate((el) => getComputedStyle(el).textDecorationLine)) === 'none')
    const corner = await name.evaluate((el) => { let c = el.parentElement; while (c && !Array.from(c.classList).some((k) => /__card$/.test(k))) c = c.parentElement; const r = (c ?? el).getBoundingClientRect(); return { x: r.left + 12, y: r.bottom - 10 } })
    await page.mouse.move(corner.x, corner.y); await page.waitForTimeout(300)
    ok('g-kanban hovering the card underlines the name', (await name.evaluate((el) => getComputedStyle(el).textDecorationLine)) === 'underline')
    const box = await name.boundingBox()
    await shot(page, 'g-kanban-hover-underline', { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: 420, height: 220 })
  })

  /* ── b-quickfilters at 1440: the same two-line rows in the 600 modal ── */
  await step('b-quickfilters 1440', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.getByRole('button', { name: /^Filters/ }).click(); await page.waitForTimeout(500)
    await page.getByRole('tab', { name: 'Quick filters' }).click(); await page.waitForTimeout(300)
    const rows = await page.$$eval('[data-testid^="quick-"]', (els) => els.map((e) => ({ h: e.getBoundingClientRect().height, two: e.querySelectorAll('[class*="rowName"], [class*="rowRole"]').length === 2 })))
    ok('b-quickfilters 1440 the rows are the two-line row too', rows.length === 3 && rows.every((r) => r.two && r.h >= 64), JSON.stringify(rows.map((r) => Math.round(r.h))))
    await shot(page, 'b-quickfilters-1440', { x: 400, y: 180, width: 640, height: 660 })
    await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(300)
  })

  /* ── b-import3 (UAT 4.07): step 3's table frame ends at its last row ── */
  await step('b-import3', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.getByRole('button', { name: 'Add Lead' }).click()
    await page.getByRole('menuitem', { name: 'Import from File' }).click(); await page.waitForTimeout(600)
    await page.setInputFiles('input[type="file"][accept=".csv,.xlsx,.pdf"]', path.join(process.cwd(), 'public/uat-files/new-leads.xlsx'))
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.waitForTimeout(1000)
    const m = await page.evaluate(() => {
      const grid = document.querySelector('[aria-label="Import preview"]'); const wrap = grid?.parentElement
      if (!grid || !wrap) return null
      const rows = grid.querySelectorAll('[role="row"]'); const last = rows[rows.length - 1].lastElementChild.getBoundingClientRect()
      const w = wrap.getBoundingClientRect()
      return { wrapH: w.height, gridH: grid.getBoundingClientRect().height, gap: w.bottom - last.bottom, sideways: wrap.scrollWidth > wrap.clientWidth, rows: rows.length }
    })
    ok('b-import3 step 3 shows the preview', !!m && m.rows > 1, JSON.stringify(m))
    ok('b-import3 the frame ends at the last row (its sideways scrollbar right under the rows)', !!m && m.gap <= 20, m ? `frame foot ${m.gap.toFixed(1)}px below the last row` : '')
    await shot(page, 'b-import3-step3')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  await ctx.close()

  /* ── phone 390: Quick filters rows, View all on one row ── */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await phone.newPage()
  p.setDefaultTimeout(12000)
  await step('b-quickfilters 390', async () => {
    await p.goto(`${BASE}/leads`); await ready(p)
    await p.getByRole('button', { name: /^Filters/ }).click(); await p.waitForTimeout(600)
    await p.getByRole('tab', { name: 'Quick filters' }).click(); await p.waitForTimeout(300)
    const rows = await p.$$eval('[data-testid^="quick-"]', (els) => els.map((e) => { const r = e.getBoundingClientRect(); const lines = e.querySelectorAll('[class*="rowName"], [class*="rowRole"]'); return { top: r.top, bottom: r.bottom, h: r.height, two: lines.length === 2, overflow: e.scrollHeight > e.clientHeight + 1 } }))
    ok('b-quickfilters each row is two lines — the name, then its meaning', rows.length === 3 && rows.every((r) => r.two))
    ok('b-quickfilters the rows grow with their words — nothing runs over the next', rows.every((r, i) => !r.overflow && (i === 0 || r.top >= rows[i - 1].bottom - 0.5)), JSON.stringify(rows.map((r) => Math.round(r.h))))
    await shot(p, 'b-quickfilters-390')
    await p.getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(400)
  })
  await step('g-taskback 390', async () => {
    await p.goto(`${BASE}/leads/${FARAH}`); await ready(p)
    const fold = p.locator('[data-card="my-work"] button[aria-expanded="false"]')
    if (await fold.count()) { await fold.first().scrollIntoViewIfNeeded(); await fold.first().click(); await p.waitForTimeout(300) }
    const chev = p.locator('[data-card="my-work"] button[aria-label^="Open \\""]').first()
    await chev.scrollIntoViewIfNeeded(); await chev.click(); await p.waitForTimeout(700)
    const sheet = p.locator('aside[role="dialog"][aria-label="Task"]')
    ok('g-taskback 390 the task opens as the panel’s sheet over the Overview', await sheet.isVisible() && new URL(p.url()).pathname === `/leads/${FARAH}` && await sheet.getByRole('button', { name: 'Open in Tasks' }).isVisible())
    await shot(p, 'g-taskback-390-sheet')
    await sheet.getByRole('button', { name: /^Close/ }).click(); await p.waitForTimeout(600)
    ok('g-taskback 390 closing leaves the reader on the Overview', !(await sheet.isVisible()) && new URL(p.url()).pathname === `/leads/${FARAH}`)
  })
  await step('g-viewall 390', async () => {
    await p.goto(`${BASE}/leads`); await ready(p)
    const bar = async () => p.evaluate(() => { const pill = [...document.querySelectorAll('button[aria-haspopup="menu"]')].find((b) => /\(\d+\)/.test(b.textContent || '')); const filt = document.querySelector('button[aria-label^="Filters"]'); const va = document.querySelector('[data-testid="view-all-leads"]'); const r = (e) => e?.getBoundingClientRect(); return { pill: r(pill)?.top, pillBottom: r(pill)?.bottom, filter: r(filt)?.top, va: va ? { top: r(va).top, folded: !!va.closest('[data-folded]'), right: r(va).right } : null, w: innerWidth, sw: document.documentElement.scrollWidth } })
    await p.getByRole('button', { name: /^All Leads/ }).click(); await p.waitForTimeout(500)
    await p.getByRole('menuitemradio', { name: /^Won/ }).click(); await p.waitForTimeout(500)
    const a = await bar()
    ok('g-viewall 390 a short scope keeps View all on the pill’s row', !!a.va && !a.va.folded && Math.abs(a.va.top - a.pill) < 8 && a.va.right <= a.w, JSON.stringify(a))
    ok('g-viewall 390 the toolbar stays one row, nothing scrolls sideways', Math.abs(a.filter - a.pill) < 8 && a.sw <= a.w)
    await shot(p, 'g-viewall-390-short')
    await p.getByRole('button', { name: /^Won \(/ }).click(); await p.waitForTimeout(500)
    await p.getByRole('menuitemradio', { name: /^Overdue follow-ups/ }).click(); await p.waitForTimeout(500)
    const b = await bar()
    ok('g-viewall 390 a long scope keeps one row — View all beside the pill where it fits, folded where it doesn’t', !!b.va && (b.va.folded || b.va.right <= b.w) && Math.abs(b.filter - b.pill) < 8 && b.sw <= b.w, JSON.stringify(b))
    await shot(p, 'g-viewall-390-long')
    await p.getByRole('button', { name: /^Overdue follow-ups/ }).click(); await p.waitForTimeout(500)
    ok('g-viewall 390 folded, the pill’s sheet opens on All Leads — its first row', (await p.getByRole('menuitemradio').first().innerText()).startsWith('All Leads'))
    await p.getByRole('menuitemradio').first().click(); await p.waitForTimeout(300)
    /* at 320 (the overflow gate) the long scope leaves no room: View all folds away, the row stays one row */
    await p.getByRole('button', { name: /^All Leads/ }).click(); await p.waitForTimeout(500)
    await p.getByRole('menuitemradio', { name: /^Overdue follow-ups/ }).click(); await p.waitForTimeout(400)
    await p.setViewportSize({ width: 320, height: 700 }); await p.waitForTimeout(600)
    const c = await bar()
    ok('g-viewall 320 no room: View all folds into the pill’s sheet, one row, no sideways scroll', !!c.va && c.va.folded && Math.abs(c.filter - c.pill) < 8 && c.sw <= c.w, JSON.stringify(c))
    await shot(p, 'g-viewall-320-folded')
  })
  await phone.close()
  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} PASS`)
  process.exit(passed === results.length ? 0 : 1)
})()
