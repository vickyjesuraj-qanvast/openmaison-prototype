// Dane's UAT fixes 2026-10-01 — package P5b: tasks, the bell and the dates people plan by (b-time · b-newtask · g-weekday · g-columns ·
// g-tasktitle · g-leadsearch · g-bell). Run against a production build on a scratch copy of the demo baseline. It writes records and moves
// dates on the scratch DB: re-copy the baseline to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3037
//   TESTDB=<scratch.db> BASE=http://localhost:3037 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P5b/verify-p5b.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3037', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { const m = e.message.split('\n'); ok(name, false, (m.filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ') || m[0])) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
async function until(fn, timeout = 8000) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > timeout) return v; await new Promise((r) => setTimeout(r, 150)) } }
const lead = (name) => sql(`select id from leads where name = '${name}'`)
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })

/* The house's forms, computed here the way lib/format.ts prints them (the browser, the server and this script share the machine's zone). */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const long = (d) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`
const time = (d) => { let h = d.getHours(); const am = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${am}` }
const due = (d) => (d.getHours() || d.getMinutes() ? `${long(d)} · ${time(d)}` : long(d))
const WD = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ’\d\d( · \d{1,2}:\d\d (AM|PM))?$/
const at = (base, days, h = 10, m = 0) => { const d = new Date(base); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d }
const dueOf = (title, leadId) => Number(sql(`select due_at from lead_tasks where title = '${title}'${leadId ? ` and lead_id = '${leadId}'` : ''} order by created_at desc limit 1`)) * 1000

const CHERYL = lead('Cheryl Lim'), OLIVIA = lead('Olivia Martinez'), SERENA = lead('Serena Koh'), FARAH = lead('Farah Ahmad'), HARPREET = lead('Harpreet Kaur')
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0)

/** Pick a day in the open date picker — next month first when it is not the month on show. */
async function pickDay(page, d) {
  const picker = page.locator('#om-date-picker')
  await picker.waitFor()
  for (let i = 0; i < 3; i++) {
    const head = await picker.locator('button[aria-label="Choose a year"]').innerText()
    if (head.includes(`${MONTH[d.getMonth()]} ${d.getFullYear()}`)) break
    await picker.getByRole('button', { name: 'Next month' }).click()
  }
  await picker.locator(`button[aria-label="${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}"]`).click()
}
async function pickTime(page, label, value) {
  await page.locator('#om-date-picker').getByRole('button', { name: label }).click()
  await page.locator('[data-om-menu] [role="option"]', { hasText: new RegExp(`^${value}$`) }).first().click()
  await page.waitForTimeout(400)
}
/** Every due cell of a tasks table: its words, and whether anything is cut. */
const dueCells = (page) => page.evaluate(() => [...document.querySelectorAll('[role="table"][aria-label="Tasks"] [data-kb-row] [data-col="due"]')].filter((c) => c.offsetParent).map((c) => {
  const b = c.querySelector('button'); const icon = !!b && /^Set due date/.test(b.getAttribute('aria-label') ?? ''); const t = icon ? '' : (b?.innerText ?? '').trim()
  /* cut = the words overflow their button, or run past the cell's own box (a touch button's negative margin is its target, not its words) */
  let cut = false
  if (b && !icon) { const r = document.createRange(); r.selectNodeContents(b); const tr = r.getBoundingClientRect(), cr = c.getBoundingClientRect(); cut = b.scrollWidth > b.clientWidth + 1 || tr.right > cr.right + 0.5 || tr.left < cr.left - 0.5 }
  return { text: t, cut, icon }
}))

;(async () => {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/tasks`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 500)) }   // the server is up
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }))
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)

  /* ── b-time (UAT 5.05): a follow-up set at 10:00 keeps its hour when its day moves — in the panel and in the table — and shows it ── */
  const D1 = at(TODAY, 2), D2 = at(TODAY, 4), D3 = at(TODAY, 5)
  const FU = 'Follow up with Cheryl Lim'
  await step('b-time set a follow-up', async () => {
    await page.goto(`${BASE}/leads/${CHERYL}`); await ready(page)
    await page.getByTestId('next-follow-up').click()
    await page.getByRole('button', { name: 'When*' }).click()
    await pickDay(page, D1)
    await page.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
    ok('b-time Set a follow-up saved the day at 10:00 AM', await until(() => dueOf(FU, CHERYL) === D1.getTime()), new Date(dueOf(FU, CHERYL)).toString())
    await page.waitForTimeout(800)
    const line = (await page.getByTestId('next-follow-up').innerText()).replace(/\s+/g, ' ')
    ok('b-time · g-weekday LEAD STAGES shows the day and the time', line.includes(due(D1)), line)
    const meta = await page.getByTestId('next-follow-up').evaluate((el) => { const m = el.querySelector('[class*="__meta"]'); return m ? m.scrollWidth <= m.clientWidth + 1 : false })
    ok('b-time the line’s date is not cut', meta)
    await page.locator('[data-card="lead-stages"]:visible').first().scrollIntoViewIfNeeded()
    await page.locator('[data-card="lead-stages"]:visible').first().screenshot({ path: path.join(OUT, 'b-time-lead-stages.png') })
  })
  await step('b-time panel keeps the time', async () => {
    await page.goto(`${BASE}/leads/${CHERYL}/tasks`); await ready(page)
    const cells = await dueCells(page)
    ok('b-time · g-weekday the Tasks tab shows the day and the time, uncut', cells.some((c) => c.text === due(D1)) && cells.every((c) => !c.cut), JSON.stringify(cells))
    await page.getByRole('button', { name: `Open ${FU}` }).click()
    const field = page.getByRole('dialog', { name: 'Task' }).getByRole('button', { name: 'Due date', exact: true })
    await field.waitFor()
    ok('b-time the panel’s Due is a date and a time', /, 10:00 AM$/.test(await field.innerText()), await field.innerText())
    const helper = await page.getByRole('dialog', { name: 'Task' }).getByText(due(D1), { exact: true }).count()
    ok('g-weekday the panel says the due with its day under the field', helper === 1)
    await shot(page, 'b-time-panel-before')
    await field.click()
    ok('b-time the panel’s picker has the time row', await page.locator('#om-date-picker').getByRole('group', { name: 'Time' }).count() === 1)
    await pickDay(page, D2)
    ok('b-time changing only the day in the panel keeps 10:00 AM', await until(() => dueOf(FU, CHERYL) === D2.getTime()), new Date(dueOf(FU, CHERYL)).toString())
    await pickTime(page, 'Hour', '2'); await pickTime(page, 'AM or PM', 'PM')
    const D2pm = at(TODAY, 4, 14)
    ok('b-time the panel changes the time', await until(() => dueOf(FU, CHERYL) === D2pm.getTime()), new Date(dueOf(FU, CHERYL)).toString())
    await page.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(600)
    ok('b-time the panel shows the moved due', await page.getByRole('dialog', { name: 'Task' }).getByText(due(D2pm), { exact: true }).count() === 1)
    await shot(page, 'b-time-panel-after')
    const ev = sql(`select detail from lead_events where lead_id = '${CHERYL}' and kind = 'task_edited' order by at desc limit 1`)
    const lines = sql(`select count(*) from lead_events where lead_id = '${CHERYL}' and kind = 'task_edited'`)
    ok('b-time Activity keeps one line for the run of picks, naming the time', lines === '1' && ev.includes('10:00 AM') && ev.includes('2:00 PM') && !ev.includes('2:00 AM'), `${lines} · ${ev}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  })
  await step('b-time table keeps the time', async () => {
    const D2pm = at(TODAY, 4, 14), D3pm = at(TODAY, 5, 14)
    const row = page.locator('[data-kb-row]', { hasText: FU })
    await until(async () => (await row.locator('[data-col="due"]').innerText()).trim() === due(D2pm))
    ok('b-time the row shows the moved due', (await row.locator('[data-col="due"]').innerText()).trim() === due(D2pm))
    await row.locator('[data-col="due"] button').click()
    ok('b-time the table’s due picker has the time row', await page.locator('#om-date-picker').getByRole('group', { name: 'Time' }).count() === 1)
    await shot(page, 'b-time-table-picker')
    await pickDay(page, D3)
    ok('b-time changing only the day in the table keeps 2:00 PM', await until(() => dueOf(FU, CHERYL) === D3pm.getTime()), new Date(dueOf(FU, CHERYL)).toString())
    await page.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
    await until(async () => (await row.locator('[data-col="due"]').innerText()).trim() === due(D3pm))
    ok('b-time the row shows the day and the kept time', (await row.locator('[data-col="due"]').innerText()).trim() === due(D3pm), await row.locator('[data-col="due"]').innerText())
    await shot(page, 'b-time-table-after')
  })

  /* ── b-newtask (UAT 11.02) · g-tasktitle (UAT 8.16): the task just added is the first row, pulses once; a cut title says itself ── */
  const NEW1 = 'Probe — a task with no date', NEW2 = 'Probe — confirm the kitchen carpentry measurements with the contractor before the site visit on Monday and share the photos with the client'
  await step('b-newtask lead tab', async () => {
    /* what the system writes meanwhile: unseen, dated tasks (a log's reminder, contract automation, a render's call back) */
    sql(`update lead_tasks set seen_at = null where lead_id = '${OLIVIA}' and due_at is not null and done = 0`)
    await page.goto(`${BASE}/leads/${OLIVIA}/tasks`); await ready(page)
    await page.locator('[role="table"][aria-label="Tasks"] [class*="__foot"]').getByText('Add Task').click()
    const input = page.getByRole('textbox', { name: 'Task title' })
    await input.fill(NEW1); await input.press('Enter')
    await snack(page, /Task added/)
    const first = () => page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').first()
    ok('b-newtask the task just added is the first row (over unseen dated tasks)', await until(async () => (await first().innerText()).includes(NEW1)), await first().innerText())
    ok('b-newtask it pulses once', await until(async () => (await first().getAttribute('data-fresh')) !== null, 3000))
    const cols = await page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').evaluateAll((rs) => rs.slice(0, 3).map((r) => [...r.querySelectorAll('[role="cell"]')].map((c) => Math.round(c.getBoundingClientRect().left)).join(',')))
    ok('b-newtask the pulsing row keeps its columns in line', cols.length === 3 && cols.every((c) => c === cols[2]), cols.join(' | '))
    await shot(page, 'b-newtask-lead-tab-pulse')
    ok('b-newtask the caret stays in the add row', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Task title'))
    await page.getByRole('textbox', { name: 'Task title' }).fill(NEW2); await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await snack(page, /Task added/)
    await until(async () => (await first().innerText()).includes('Probe — confirm'))
    const order = await page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').evaluateAll((rs) => rs.slice(0, 2).map((r) => r.querySelector('span[class$="__title"]')?.textContent ?? ''))
    ok('b-newtask a chain keeps the newest first, the one before it second', order[0] === NEW2 && order[1] === NEW1, order.join(' | '))
    await page.keyboard.press('Escape'); await page.waitForTimeout(600)
    ok('b-newtask they stay first once the add row closes', (await first().innerText()).includes('Probe — confirm'))
    const pulsed = await page.locator('[data-fresh]').count()
    await page.waitForTimeout(1800)
    ok('b-newtask the pulse is once — gone after it fades', (await page.locator('[data-fresh]').count()) === 0, `${pulsed} → 0`)
  })
  await step('g-tasktitle', async () => {
    const t = page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').first().locator('span[class$="__title"]')
    const cut = await t.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    await t.hover(); await page.waitForTimeout(900)
    const tip = await page.locator('[role="tooltip"]').innerText().catch(() => '')
    ok('g-tasktitle a cut title says itself in full on hover', cut && tip === NEW2, `cut=${cut} tip=${tip}`)
    await shot(page, 'g-tasktitle-tooltip', { x: 300, y: 150, width: 1140, height: 360 })
    await page.mouse.move(5, 1000); await page.waitForTimeout(400)
    const short = page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').nth(1).locator('span[class$="__title"]')
    await short.hover(); await page.waitForTimeout(900)
    ok('g-tasktitle a title that fits shows no tooltip', (await page.locator('[role="tooltip"]').count()) === 0)
    await page.mouse.move(5, 1000)
  })
  await step('g-weekday lead tab + search', async () => {
    const cells = (await dueCells(page)).filter((c) => !c.icon)
    ok('g-weekday every due on the lead’s Tasks tab wears its day, uncut', cells.length > 2 && cells.every((c) => WD.test(c.text) && !c.cut), JSON.stringify(cells.slice(0, 3)))
    const target = cells.find((c) => / · /.test(c.text))
    await page.getByRole('searchbox').first().fill(target.text.slice(0, 10)); await page.waitForTimeout(500)
    const left = await dueCells(page)
    ok('g-weekday searching the shown due (its day) finds the row (REG-274)', left.length > 0 && left.every((c) => c.text.startsWith(target.text.slice(0, 10))), `${target.text.slice(0, 10)} → ${left.length}`)
    await page.getByRole('searchbox').first().fill('')
    await shot(page, 'g-weekday-lead-tasks')
  })
  await step('b-newtask /tasks', async () => {
    await page.goto(`${BASE}/tasks`); await ready(page)
    await page.locator('[role="table"][aria-label="Tasks"] [class*="__foot"]').getByText('Add Task').click()
    const input = page.getByRole('textbox', { name: 'Task title' })
    await input.fill('Probe — studio task, no date'); await input.press('Enter')
    await snack(page, /Task added/)
    const first = page.locator('[role="table"][aria-label="Tasks"] [data-kb-row]').first()
    ok('b-newtask /tasks: the task just added is the first row', await until(async () => (await first.innerText()).includes('Probe — studio task, no date')))
    ok('b-newtask /tasks: it pulses once', await until(async () => (await first.getAttribute('data-fresh')) !== null, 3000))
    await shot(page, 'b-newtask-tasks-page')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    const cells = (await dueCells(page)).filter((c) => !c.icon)
    ok('g-weekday every due on /tasks wears its day, uncut at 1440', cells.length > 5 && cells.every((c) => WD.test(c.text) && !c.cut), JSON.stringify(cells.filter((c) => !WD.test(c.text) || c.cut).slice(0, 3)))
  })

  /* ── g-leadsearch (UAT 11.03): Tasks › Filters › Lead has the house search box ── */
  await step('g-leadsearch', async () => {
    await page.getByRole('button', { name: 'Filters' }).first().click()
    await page.getByRole('tab', { name: 'Lead' }).click()
    const box = page.getByRole('searchbox', { name: 'Search leads' }).or(page.getByLabel('Search leads'))
    await box.first().fill('oli'); await page.waitForTimeout(300)
    const names = await page.locator('[role="tabpanel"] [role="button"]').allInnerTexts()
    ok('g-leadsearch the Lead pane finds a lead by its name', names.length === 1 && names[0].includes('Olivia Martinez'), names.join(' | '))
    await shot(page, 'g-leadsearch-found')
    await box.first().fill('zzzz'); await page.waitForTimeout(300)
    ok('g-leadsearch nothing found says so', (await page.getByText('No leads match “zzzz”.').count()) === 1)
    await shot(page, 'g-leadsearch-none')
    await box.first().fill('')
    await page.getByRole('button', { name: 'Done' }).click()
  })

  /* ── g-weekday elsewhere: My tasks · the tasks popover · On hold till · Quotes Due + Valid until (the lead tab and Tools › Quotes) ── */
  await step('g-weekday My tasks', async () => {
    await page.goto(`${BASE}/leads/${SERENA}`); await ready(page)
    const card = page.locator('[data-card="my-work"]:visible').first()
    const text = (await card.innerText()).replace(/\s+/g, ' ')
    const want = due(new Date(dueOf('Revise quote per feedback', SERENA)))
    ok('g-weekday My tasks’ overdue line wears its day and time', text.includes(want), want)
    const clipped = await card.evaluate((el) => [...el.querySelectorAll('[class*="__meta"]')].some((m) => m.scrollWidth > m.clientWidth + 1))
    ok('g-weekday My tasks’ due lines are not cut at 1440', !clipped)
    await card.screenshot({ path: path.join(OUT, 'g-weekday-my-tasks.png') })
    /* an overdue follow-up's longer line ("overdue · Tue, 29 Sep ’26 · 10:00 AM") never runs over the name or crushes the task */
    const fits = await page.getByTestId('next-follow-up').evaluate((row) => {
      const q = (c) => row.querySelector(`[class*="__${c}"]`)?.getBoundingClientRect()
      const name = q('name'), till = q('till'), meta = q('meta'), r = row.getBoundingClientRect()
      const sameLine = meta.top < name.bottom - 2
      return { overlap: sameLine && meta.left < name.right, stub: sameLine && till.width < 60, inside: meta.right <= r.right + 0.5, text: row.innerText.replace(/\s+/g, ' ') }
    })
    ok('b-time an overdue Next follow-up keeps its name and task readable at 1440', !fits.overlap && !fits.stub && fits.inside, JSON.stringify(fits))
    await page.locator('[data-card="lead-stages"]:visible').first().screenshot({ path: path.join(OUT, 'b-time-lead-stages-overdue.png') })
    await page.goto(`${BASE}/leads/${FARAH}`); await ready(page)
    const up = page.locator('[data-card="my-work"]:visible').first().getByRole('button', { name: /Upcoming/ })
    if ((await up.getAttribute('aria-expanded')) === 'false') await up.click()
    const t2 = (await page.locator('[data-card="my-work"]:visible').first().innerText()).replace(/\s+/g, ' ')
    const want2 = due(new Date(dueOf('Follow up on WhatsApp', FARAH)))
    ok('g-weekday My tasks’ upcoming line wears its day and time', t2.includes(want2), want2)
  })
  await step('g-weekday listing', async () => {
    await page.goto(`${BASE}/leads?view=table`); await ready(page)
    const arjun = (await page.locator('[data-kb-row]', { hasText: 'Arjun Mehta' }).first().innerText()).replace(/\s+/g, ' ')
    ok('g-weekday the listing’s On hold till wears its day', /On hold till: (Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} \w{3} ’\d\d/.test(arjun), arjun.slice(0, 80))
    /* NOT a check — reported for Vicky: the Lead Name column's 240 floor never held an On Hold lead's phone line ("9800 4172 · On hold till:
       24 Oct ’26" + the copy glyph ran ~12 px + the glyph past the cell before this round); the day adds ~26 px. Fitting it is her call. */
    const over = await page.locator('[data-kb-row]', { hasText: 'Arjun Mehta' }).first().locator('span[class*="__phone"]').first().evaluate((s) => Math.round(s.getBoundingClientRect().right - s.closest('[role="cell"]').getBoundingClientRect().right))
    console.log(`INFO  the On Hold phone line runs ${over} px past the Lead Name column at 1440 (pre-existing; see the report)`)
    await page.locator('[data-kb-row]', { hasText: 'Arjun Mehta' }).first().screenshot({ path: path.join(OUT, 'g-weekday-listing-on-hold.png') })
    await page.locator('[data-kb-row]', { hasText: 'Farah Ahmad' }).first().locator('button[class*="__taskBox"]').click()
    await page.getByText('Open Tasks').waitFor()
    const pop = (await page.getByText('Open Tasks').locator('xpath=ancestor::*[3]').innerText()).replace(/\s+/g, ' ')
    const want = due(new Date(dueOf('Follow up on WhatsApp', FARAH)))
    ok('g-weekday the tasks popover’s due wears its day and time', pop.includes(want), want)
    await page.waitForTimeout(600)
    await shot(page, 'g-weekday-tasks-popover')
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/leads?view=kanban`); await ready(page)
    const kanEl = page.getByText(/On hold till: /).first()
    const kan = await kanEl.innerText().catch(() => '')
    ok('g-weekday the kanban card’s On hold till matches the table’s', /On hold till: (Sun|Mon|Tue|Wed|Thu|Fri|Sat), /.test(kan), kan)
    await kanEl.scrollIntoViewIfNeeded()
    const kanCut = await kanEl.evaluate((s) => { const line = s.parentElement; return line.scrollWidth > line.clientWidth + 1 })
    ok('g-weekday the kanban card’s line is not cut', !kanCut)
    await kanEl.locator('xpath=ancestor::*[4]').screenshot({ path: path.join(OUT, 'g-weekday-kanban-on-hold.png') }).catch(() => {})
  })
  await step('g-weekday quotes', async () => {
    const QD = at(TODAY, 3, 0)
    sql(`update quotes set due_at = ${QD.getTime() / 1000} where number = 'OM-10007'`)
    const valid = new Date(Number(sql(`select valid_until from quotes where number = 'OM-10007'`)) * 1000)
    for (const [where, url] of [['the lead’s Quotes tab', `${BASE}/leads/${SERENA}/quotes`], ['Tools › Quotes', `${BASE}/quotes`]]) {
      await page.goto(url); await ready(page)
      const row = page.locator('[data-kb-row]', { hasText: 'OM-10007' }).first()
      const cell = async (k) => row.locator(`[data-col="${k}"]`).evaluate((c) => ({ text: c.innerText.trim(), cut: [...c.querySelectorAll('*')].concat(c).some((e) => e.scrollWidth > e.clientWidth + 1) }))
      const d = await cell('due'), v = await cell('valid')
      ok(`g-weekday ${where}: Due and Valid until wear their day, uncut`, d.text === long(QD) && v.text === long(valid) && !d.cut && !v.cut, `${d.text} · ${v.text}`)
      if (where === 'the lead’s Quotes tab') {
        await page.getByRole('searchbox').first().fill(long(QD)); await page.waitForTimeout(500)
        ok('g-weekday searching a quote’s shown Due finds it (REG-274)', (await page.locator('[data-kb-row]', { hasText: 'OM-10007' }).count()) === 1)
        await page.getByRole('searchbox').first().fill('')
      }
      await shot(page, where === 'Tools › Quotes' ? 'g-weekday-tools-quotes' : 'g-weekday-lead-quotes')
    }
  })
  await step('g-weekday send snackbar', async () => {
    const qid = sql(`select id from quotes where number = 'OM-10006'`)
    await page.goto(`${BASE}/quotes/${qid}`); await ready(page)
    await page.getByTestId('quote-send').click()
    await page.getByText('Send for confirmation', { exact: true }).click()
    await page.getByRole('button', { name: 'Send via WhatsApp' }).click()
    const t = await snack(page, /follow-up on/, 10000)
    ok('g-weekday the send snackbar’s follow-up wears its day', /follow-up on (Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} \w{3} ’\d\d/.test(t), t)
    await shot(page, 'g-weekday-send-snackbar')
  })

  /* ── g-columns (UAT 4.22): Tasks names the task; Next follow-up says when, and how far off ── */
  await step('g-columns', async () => {
    await page.goto(`${BASE}/leads?view=table`); await ready(page)
    await page.getByRole('button', { name: 'Column settings' }).click()
    const sw = page.getByRole('switch', { name: 'Show Next follow-up column', includeHidden: true })
    await sw.waitFor({ state: 'attached' })
    if (!(await sw.isChecked())) await page.locator('label', { has: sw }).click()
    ok('g-columns Column settings switched Next follow-up on', await until(() => sw.isChecked(), 3000))
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape'); await page.waitForTimeout(500)
    const heads = await page.locator('[role="columnheader"]').evaluateAll((hs) => hs.map((h) => (h.textContent ?? '').trim()))
    const ti = heads.findIndex((h) => h.startsWith('Tasks')), ni = heads.findIndex((h) => h.startsWith('Next follow-up'))
    const row = page.locator('[data-kb-row]', { hasText: 'Farah Ahmad' }).first()
    const cells = await row.locator('[role="cell"]').evaluateAll((cs, [a, b]) => [cs[a], cs[b]].map((c) => ({ text: c?.innerText.trim() ?? '', lines: [...(c?.querySelectorAll('span[class*="__plain"], span[class*="__sub"]') ?? [])].map((s) => ({ t: s.textContent.trim(), cut: s.scrollWidth > s.clientWidth + 1 })) })), [ti, ni])
    const [tasks, next] = cells
    const want = due(new Date(Number(sql(`select min(due_at) from lead_tasks where lead_id = '${FARAH}' and done = 0 and due_at is not null`)) * 1000))
    ok('g-columns both columns are on', ti >= 0 && ni >= 0, `${ti} · ${ni}`)
    ok('g-columns Next follow-up line 1 is the day and time', next.lines[0]?.t === want, `${next.lines[0]?.t} vs ${want}`)
    ok('g-columns line 2 says how far off', /^(today|tomorrow|in \d+ days|\d+ days? late)$/.test(next.lines[1]?.t ?? ''), next.lines[1]?.t)
    ok('g-columns the two columns no longer say the same thing', !next.text.includes(tasks.lines[0]?.t ?? tasks.text.split('\n')[0]) && tasks.text !== next.text, `${tasks.text.split('\n')[0]} | ${next.text.replace(/\n/g, ' / ')}`)
    const all = await page.locator('[data-kb-row]').evaluateAll((rs, i) => rs.map((r) => r.querySelectorAll('[role="cell"]')[i]).filter(Boolean).flatMap((c) => [...c.querySelectorAll('span[class*="__plain"], span[class*="__sub"]')]).map((s) => ({ t: s.textContent.trim(), cut: s.scrollWidth > s.clientWidth + 1 })), ni)
    ok('g-columns no Next follow-up date is cut at 1440', all.length > 0 && all.every((s) => !s.cut), JSON.stringify(all.filter((s) => s.cut).slice(0, 3)))
    await shot(page, 'g-columns-listing-tasks')
    await page.locator('[role="columnheader"]').nth(ni).evaluate((h) => h.scrollIntoView({ inline: 'end', block: 'nearest' }))
    await page.mouse.move(5, 1000); await page.waitForTimeout(400)
    await shot(page, 'g-columns-listing-next-follow-up')
  })

  /* ── g-bell (UAT 11.06): Due comes first while anything in it is late; else Updates ── */
  await step('g-bell late first', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.locator('[data-notifications-tile]').first().click()
    await page.getByTestId('notifications-panel').waitFor(); await page.waitForTimeout(1200)
    const groups = await page.locator('[data-testid="notifications-panel"] section').evaluateAll((ss) => ss.map((s) => s.getAttribute('data-testid')))
    const lateRows = await page.locator('[data-testid="notifications-due"] [data-late]').count()
    ok('g-bell with a late Due row, Due comes first', lateRows > 0 && groups[0] === 'notifications-due' && groups.includes('notifications-notices'), `${groups.join(' · ')} (late ${lateRows})`)
    const lines = await page.locator('[data-testid="notifications-due"] [data-late]').allInnerTexts()
    ok('g-weekday the bell’s late rows wear their day', lines.length > 0 && lines.every((l) => /^Due (today|(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} \w{3} ’\d\d)/.test(l)), lines.slice(0, 3).join(' | '))
    await shot(page, 'g-bell-due-first')
    await page.keyboard.press('Escape')
  })

  /* ── phone 390: the tasks list's due line and the bell's sheet ── */
  await step('phone 390', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/tasks`); await ready(p)
    const cells = (await dueCells(p)).filter((c) => !c.icon)
    ok('phone 390 the tasks cards’ due lines wear their day, uncut', cells.length > 3 && cells.every((c) => WD.test(c.text) && !c.cut), JSON.stringify(cells.filter((c) => !WD.test(c.text) || c.cut).slice(0, 3)))
    ok('phone 390 the page never scrolls sideways', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await shot(p, 'phone-tasks')
    await p.locator('[data-notifications-tile]').first().click().catch(async () => { await p.getByRole('button', { name: /Notifications/ }).first().click() })
    await p.getByTestId('notifications-panel').waitFor(); await p.waitForTimeout(1200)
    const groups = await p.locator('[data-testid="notifications-panel"] section').evaluateAll((ss) => ss.map((s) => s.getAttribute('data-testid')))
    ok('phone 390 the bell’s sheet opens with Due first while late', groups[0] === 'notifications-due', groups.join(' · '))
    await shot(p, 'phone-bell')
    await p.goto(`${BASE}/leads/${SERENA}`); await ready(p)
    const row = p.getByTestId('next-follow-up')
    await row.scrollIntoViewIfNeeded()
    const fits = await row.evaluate((r) => {
      const q = (c) => r.querySelector(`[class*="__${c}"]`)?.getBoundingClientRect()
      const name = q('name'), meta = q('meta'), box = r.getBoundingClientRect()
      return { overlap: meta.top < name.bottom - 2 && meta.left < name.right, inside: meta.right <= box.right + 0.5 && meta.bottom <= box.bottom + 0.5 }
    })
    ok('phone 390 an overdue Next follow-up line never runs over its name', !fits.overlap && fits.inside, JSON.stringify(fits))
    await p.locator('[data-card="lead-stages"]:visible').first().screenshot({ path: path.join(OUT, 'phone-lead-stages-overdue.png') })
    await phone.close()
  })

  await step('g-bell nothing late', async () => {
    /* nothing late: every past due moves on, the New leads arrived just now, the holds end later — and one task is due in 15 minutes */
    const now = Math.floor(Date.now() / 1000)
    sql(`update lead_tasks set due_at = due_at + 60*86400 where done = 0 and due_at is not null and due_at < ${now + 3600}`)
    sql(`update leads set created_at = ${now} where stage = 'New'`)
    sql(`update stage_logs set payload = json_set(payload, '$.followUpAt', '2027-01-01T00:00:00.000Z') where to_stage = 'On Hold'`)
    sql(`insert into lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, seen_at, updated_at) values ('probe-soon', null, 'Probe — due in a quarter of an hour', 'General', ${now + 15 * 60}, 0, ${now}, null, ${now}, ${now})`)
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.locator('[data-notifications-tile]').first().click()
    await page.getByTestId('notifications-panel').waitFor(); await page.waitForTimeout(1200)
    const groups = await page.locator('[data-testid="notifications-panel"] section').evaluateAll((ss) => ss.map((s) => s.getAttribute('data-testid')))
    const lateRows = await page.locator('[data-testid="notifications-due"] [data-late]').count()
    ok('g-bell with nothing late, Updates come first', lateRows === 0 && groups[0] === 'notifications-notices' && groups.includes('notifications-due'), `${groups.join(' · ')} (late ${lateRows})`)
    await shot(page, 'g-bell-updates-first')
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
})()
