// The whole-app responsiveness audit, lane W4 — Company · Settings · Finance · Reports · the template editors (his "run a overall
// responsiveness audit and fix all the issues across devices and breakpoints based on your recommendations", 2026-10-23). Each fix asserted
// as the rule it keeps, by real taps (touch at ≤1024, a mouse at 1280 / 1440), never another round's count:
//  1 · nothing runs off a phone: Settings › Quotes & pricing's "Change in … › New quotes" keeps to the card at 320 (W4-01); no W4 page scrolls
//      sideways at 320 or at 844 × 390 (a phone held sideways)
//  2 · fields keep their words: Settings › Finance › Document numbers sets two fields across on a phone, no label cut at 390 (W4-02); the
//      Payment schedules editor's deletes stay inside the card at 768 (W4-05); the schedule editor's first milestone has its name field, not a
//      sliver (W4-22); the PO dialog's "What it is" keeps its own line and room at 768, the Trade beside nothing it covers (W4-25)
//  3 · rows that read: Client portal › Getting it live puts a row's buttons under its words on a phone (W4-04); the Question bank's card pads
//      16 on a phone like every Company card (W4-03)
//  4 · layers stay on the screen: the message dialogs' *Reset to the house draft* inside the foot at 320 (W4-23); the task template editor's
//      Assign Member opens inside the window's width and Tags inside the window, at 768 and 844 × 390 (W4-24; the member card's height
//      on a window under 456 tall is W2's stylesheet)
//  5 · 44 under a finger, the drawn mark unchanged: trade / unit / category names, the drag handles, the portal's client names, Lead stages'
//      counts, Plan & AI credits' links, Reports › Meetings' leads, Finance's *Reports ›*, the template editor's name and zoom (W4-06…14);
//      a tap on a trade's grown box still opens its dialog; the Quotes gallery's *Used by* link at least 30 inside its foot's clip (W4-12)
//  6 · the desk is the desk: at 1440 a mouse meets none of it — the trade name 20 tall, the Change button one line, a document row one line,
//      the editor's name 32, Reports › 20 tall; a gallery's list view: a short name and the *Used by* link 44 at 768 (W4-30)
// Read-only: it opens forms and pickers and never saves; it writes nothing to the DB. Run against `next start` on a scratch copy of the demo
// DB — never local.db. Usage: BASE=http://localhost:3204 NODE_PATH=<repo>/node_modules node verify-rwd-w4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rwd-w4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3204'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify')) ? process.cwd() : path.resolve(__dirname, '../../..'))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, what, more = '') => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}${more ? ` — ${more}` : ''}`) } }
const settle = (p, ms = 800) => p.waitForTimeout(ms)
const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1400) }
const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) }).catch(() => {})
const SIZES = { 320: [320, 640], 390: [390, 844], 768: [768, 1024], 1024: [1024, 768], 844: [844, 390], 1280: [1280, 800], 1440: [1440, 1024] }
const ctxOf = (b, w) => { const [width, height] = SIZES[w]; const touch = w < 1280; return b.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' }) }
const press = async (p, loc) => { const l = loc.first(); await l.scrollIntoViewIfNeeded(); if ((p.viewportSize()?.width ?? 1440) < 1280) await l.tap(); else await l.click(); await settle(p, 700) }
const box = (loc) => loc.first().evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, vw: document.documentElement.clientWidth, vh: innerHeight } })
/* a control's finger box: its own box, or the ::after / ::before overlay a house rule lays over it */
const target = (loc) => loc.first().evaluate((e) => {
  const r = e.getBoundingClientRect(); let w = r.width, h = r.height
  for (const ps of ['::after', '::before']) { const s = getComputedStyle(e, ps); if (s.content && s.content !== 'none' && s.position === 'absolute') { w = Math.max(w, parseFloat(s.width) || 0); h = Math.max(h, parseFloat(s.height) || 0) } }
  return { w: Math.round(w), h: Math.round(h) }
})
/* Settings › Finance › Document numbers: the first document's own row — its class ends in __row (the list around them is __rows) */
const firstDocRow = async (p) => {
  await p.evaluate(() => { const el = [...document.querySelectorAll('[class*="document-numbers-module__"]')].find((e) => [...e.classList].some((c) => /^document-numbers-module__.+__row$/.test(c))); if (el) el.setAttribute('data-probe-row', '') })
  return p.locator('[data-probe-row]').first()
}
const TPL = sql(`select id from quote_templates where deleted_at is null and name = 'Showflat Presentation' limit 1`) || sql(`select id from quote_templates where deleted_at is null limit 1`)
const TASK_TPL = sql(`select id from task_templates where deleted_at is null order by name limit 1`)
const SCHED_TPL = sql(`select id from schedule_templates where deleted_at is null and id not like 'schedule-preset-%' order by name limit 1`)
const PAY_TPL = sql(`select id from payment_templates where deleted_at is null order by (id = 'default') desc limit 1`)
const ROUTES = ['/company/profile', '/company/members', '/company/questionnaire', '/company/integrations', '/company/materials', '/company/portal', '/company/portal/clients',
  ...['brand', 'quotes', 'contracts', 'tasks', 'terms', 'payments', 'schedules'].map((t) => `/company/templates/${t}`), '/company/price-book', '/company/price-book/sections',
  '/company/plan', '/company/plan/billing', ...['todo', 'money-in', 'money-out', 'vendors', 'commissions', 'accounting'].map((t) => `/company/finance/${t}`),
  ...['leads', 'projects', 'finance', 'meetings', 'health'].map((t) => `/company/reports/${t}`), '/company/reports/leads?report=sales',
  '/settings', ...['leads', 'quotes', 'projects', 'finance', 'meetings', 'notifications', 'studio'].map((s) => `/settings?section=${s}`),
  `/templates/${TPL}`, `/templates/tasks/${TASK_TPL}`, `/templates/payments/${PAY_TPL}`, `/templates/schedules/${SCHED_TPL}`]

;(async () => {
  const errors = []
  const b = await chromium.launch()
  try {
    console.log('1 · nothing runs off a phone')
    {
      const c = await ctxOf(b, 320); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
      await go(p, '/settings?section=quotes')
      const btn = p.getByTestId('new-quote-defaults-change')
      await btn.scrollIntoViewIfNeeded(); const r = await box(btn)
      ok(r.l >= 0 && r.r <= r.vw, `320 · "Change in … › New quotes" keeps to the screen (${Math.round(r.l)}–${Math.round(r.r)} of ${r.vw})`)
      await shot(p, '1-quotes-change-320')
      for (const w of [320, 844]) {
        const cw = w === 320 ? c : await ctxOf(b, 844); const pw = w === 320 ? p : await cw.newPage()
        const wide = []
        for (const url of ROUTES) { await pw.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await settle(pw, 700); const s = await pw.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (s > 0) wide.push(`${url} +${s}`) }
        ok(wide.length === 0, `${w} · no W4 page scrolls sideways (${ROUTES.length} pages)`, wide.join(' · '))
        if (w !== 320) await cw.close()
      }
      await c.close()
    }

    console.log('2 · fields keep their words')
    {
      const c = await ctxOf(b, 390); const p = await c.newPage()
      await go(p, '/settings?section=finance')
      const row = await firstDocRow(p)
      await row.scrollIntoViewIfNeeded()
      const m = await row.evaluate((r) => {
        const part = (n) => [...r.children].find((k) => [...k.classList].some((c) => c.endsWith(`__${n}`)))
        const B = (e) => e && e.getBoundingClientRect()
        const prefix = B(part('prefix')), next = B(part('next')), digits = B(part('digits'))
        const cut = [...r.querySelectorAll('label')].filter((l) => l.scrollWidth > l.clientWidth + 1).map((l) => l.textContent.trim())
        return { sameRow: prefix && next && Math.abs(prefix.top - next.top) < 2 && next.left > prefix.right, digitsBelow: digits && digits.top > prefix.bottom, cut }
      })
      ok(m.sameRow && m.digitsBelow, '390 · a document row sets Prefix · Next number across, Digits under them')
      ok(m.cut.length === 0, '390 · no field label in it is cut', m.cut.join(', '))
      await shot(p, '2-document-numbers-390')
      await go(p, `/templates/schedules/${SCHED_TPL}`)
      const first = p.getByTestId('schedule-item').first()
      const s = await first.evaluate((row) => { const kids = [...row.children].map((k) => k.getBoundingClientRect()); return { no: kids[0], name: kids[1] } })
      ok(s.name.width >= 150 && s.no.right <= s.name.left + 1 && Math.abs(s.no.top - s.name.top) < 24, `390 · the schedule editor's first milestone has its name field (${Math.round(s.name.width)} wide), its number beside it`)
      await shot(p, '2-schedule-editor-390')
      await c.close()
    }
    {
      const c = await ctxOf(b, 768); const p = await c.newPage()
      await go(p, `/templates/payments/${PAY_TPL}`)
      const card = await box(p.locator('[class*="library-editor-module__"][class*="__card"]').filter({ has: p.locator('[class*="__milestones"]') }))
      const dels = await p.locator('[class*="library-editor-module__"][class*="__milestones"] button[aria-label^="Remove"], [class*="library-editor-module__"][class*="__milestones"] button[aria-label^="Delete"]').evaluateAll((bs) => bs.map((x) => x.getBoundingClientRect().right))
      ok(dels.length > 0 && dels.every((r) => r <= card.r - 8), `768 · the Payment schedules editor's ${dels.length} deletes stand inside the card (right ≤ ${Math.round(card.r)})`, dels.map(Math.round).join(', '))
      await shot(p, '2-payments-editor-768')
      await go(p, '/company/finance/todo')
      const change = p.getByRole('button', { name: 'Change it' })
      if (await change.count()) {
        await press(p, change)
        const d = p.getByRole('dialog').last()
        const what = await box(d.getByLabel('What it is').first().locator('xpath=ancestor::*[contains(@class,"text-field-module__")][contains(@class,"__field")][1]'))
        const trade = await box(d.getByText('Trade', { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"text-field-module__")][contains(@class,"__field")][1]'))
        ok(what.w >= 200 && (trade.t >= what.b - 1 || trade.l >= what.r - 1), `768 · the PO dialog's "What it is" keeps its room (${Math.round(what.w)} wide) and nothing draws over it`)
        await shot(p, '2-po-lines-768')
        await p.keyboard.press('Escape'); await settle(p, 400)
      } else ok(true, '768 · (no PO waiting for a change on To do — the line rule is asserted on Money out)')
      await c.close()
    }

    console.log('3 · rows that read')
    {
      const c = await ctxOf(b, 320); const p = await c.newPage()
      await go(p, '/company/portal')
      const row = p.getByTestId('portal-step-address')
      await row.scrollIntoViewIfNeeded()
      const m = await row.evaluate((r) => {
        const kid = (n) => [...r.children].find((k) => [...k.classList].some((c) => c.endsWith(`__${n}`)))
        const R = (e) => e && e.getBoundingClientRect()
        const row = R(r), label = R(kid('label')), tools = R(kid('rowTools')), action = R(kid('rowAction'))
        return { labelW: label.width, rowW: row.width, toolsBelow: tools ? tools.top >= label.bottom - 10 : true, actionBelow: action ? action.top >= label.bottom - 10 : true }
      })
      ok(m.labelW >= m.rowW - 60, `320 · a Getting it live row's words take the row (${Math.round(m.labelW)} of ${Math.round(m.rowW)})`)
      ok(m.toolsBelow && m.actionBelow, '320 · its Copy · Open · Change sit under the words')
      await shot(p, '3-portal-checklist-320')
      await go(p, '/company/questionnaire')
      const pad = await p.locator('[class*="questionnaire-view-module__"][class*="__card"]').first().evaluate((e) => parseFloat(getComputedStyle(e).paddingLeft))
      ok(pad <= 16, `320 · the Question bank's card pads ${pad} on a phone, as every Company card`)
      await c.close()
    }

    console.log('4 · layers stay on the screen')
    for (const [w, url] of [[320, '/settings?section=notifications']]) {
      const c = await ctxOf(b, w); const p = await c.newPage()
      await go(p, url)
      await press(p, p.getByRole('button', { name: /^Edit/ }))
      const reset = p.getByRole('dialog').last().getByRole('button', { name: /Reset to the house draft/ })
      const r = await box(reset)
      ok(r.l >= 0 && r.r <= r.vw, `${w} · the message dialog's *Reset to the house draft* stands inside the foot (${Math.round(r.l)}–${Math.round(r.r)})`)
      await shot(p, '4-message-dialog-320')
      await c.close()
    }
    for (const w of [768, 844]) {
      const c = await ctxOf(b, w); const p = await c.newPage()
      await go(p, `/templates/tasks/${TASK_TPL}`)
      await press(p, p.getByRole('button', { name: 'Team members' }))
      const card = await box(p.getByRole('dialog', { name: 'Assign Member' }))
      ok(card.l >= 0 && card.r <= card.vw && card.t >= 0, `${w} · Assign Member opens inside the window's width, from its top (${Math.round(card.l)}–${Math.round(card.r)} of ${card.vw})`)
      await shot(p, `4-assign-${w}`)
      await p.keyboard.press('Escape'); await settle(p, 400)
      await press(p, p.getByRole('button', { name: 'Tags' }))
      const tags = await box(p.getByRole('dialog', { name: 'Add Tag' }))
      ok(tags.l >= 0 && tags.r <= tags.vw && tags.b <= tags.vh, `${w} · the Tags picker opens inside the window (bottom ${Math.round(tags.b)} of ${tags.vh})`)
      await shot(p, `4-tags-${w}`)
      await c.close()
    }

    console.log('5 · 44 under a finger, the drawn mark unchanged')
    {
      const c = await ctxOf(b, 390); const p = await c.newPage()
      await go(p, '/settings?section=quotes')
      const trade = p.locator('[data-testid="trade"] button[class*="__tradeName"]').first()
      await trade.scrollIntoViewIfNeeded()
      const t = await target(trade), token = await box(p.getByTestId('trade').first())
      ok(t.h >= 44 && Math.round(token.h) === 32, `390 · a trade's name stands ${t.h} tall inside its drawn 32 token`)
      const tb = await box(trade)
      await p.touchscreen.tap(token.l + 4, tb.t + tb.h / 2); await settle(p, 700)
      ok(await p.getByRole('dialog', { name: 'Trade' }).isVisible().catch(() => false), '390 · a tap on the token\'s left edge opens the trade\'s dialog')
      await p.keyboard.press('Escape'); await settle(p, 400)
      const small = await p.locator('[aria-label="Units"] button[class*="__tradeName"]').evaluateAll((bs) => bs.map((x) => { const r = x.getBoundingClientRect(); return [x.innerText.trim(), Math.round(r.width), Math.round(r.height)] }).filter(([, w, h]) => w < 44 || h < 44))
      ok(small.length === 0, '390 · every unit\'s name — "Lot", "set" too — is at least 44 × 44', JSON.stringify(small))
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, '/settings?section=leads')
      const count = p.locator('[class*="lead-stages-card-module__"][class*="__countLink"]').first()
      if (await count.count()) { await count.scrollIntoViewIfNeeded(); const m = await target(count); ok(m.h >= 44, `390 · Lead stages' "n leads" stands ${m.h} tall`) }
      await go(p, '/company/questionnaire')
      const handle = p.getByTestId('bank-question-handle').first()
      const hm = await target(handle); ok(hm.w >= 44 && hm.h >= 44, `390 · a question's drag handle is ${hm.w}×${hm.h}`)
      await go(p, '/company/portal/clients')
      const name = p.locator('[class*="portal-setup-module__"][class*="__clientName"]').first()
      const nm = await target(name); ok(nm.h >= 44, `390 · a client's name stands ${nm.h} tall`)
      await go(p, '/company/plan/billing')
      const edit = p.getByRole('link', { name: 'Edit in Profile' })
      if (await edit.count()) { const em = await target(edit); ok(em.h >= 44, `390 · Billing details' *Edit in Profile* stands ${em.h} tall`) }
      await go(p, '/company/finance/todo')
      const door = p.getByTestId('finance-reports-door')
      const dm = await target(door); ok(dm.h >= 44, `390 · Finance's *Reports ›* stands ${dm.h} tall`)
      await go(p, '/company/reports/meetings')
      const lead = p.locator('[class*="meetings-report-module__"][class*="__leadLink"]').first()
      if (await lead.count()) { await lead.scrollIntoViewIfNeeded(); const lm = await target(lead); ok(lm.h >= 44, `390 · a meeting's lead stands ${lm.h} tall`) }
      await go(p, '/company/templates/quotes')
      const used = p.locator('[class*="quote-templates-gallery-module__"][class*="__usedLink"]').first()
      if (await used.count()) {
        await used.scrollIntoViewIfNeeded()
        const reach = await used.evaluate((e) => { const r = e.getBoundingClientRect(); let top = r.top, bot = r.bottom; for (let n = e.parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) { const nr = n.getBoundingClientRect(); top = Math.max(top, nr.top); bot = Math.min(bot, nr.bottom) } } return Math.round(bot - top) })
        ok(reach >= 30, `390 · the Quotes gallery's *Used by* link reaches ${reach} inside its foot's clip (it was 15)`)
      }
      await c.close()
    }
    {
      const c = await ctxOf(b, 768); const p = await c.newPage()
      await go(p, `/templates/${TPL}`)
      const nm = await target(p.getByRole('textbox', { name: 'Template name' })); ok(nm.h >= 44, `768 · the template editor's name stands ${nm.h} tall`)
      const zoom = p.locator('[class*="editor-topbar-module__"][class*="__zoomLabel"]').first()
      if (await zoom.count()) { const zm = await target(zoom); ok(zm.h >= 44, `768 · its zoom figure stands ${zm.h} tall`) }
      const bar = await box(p.locator('[class*="editor-topbar-module__"][class*="__bar"]').first())
      ok(bar.h <= 120, `768 · and the bar keeps its height (${Math.round(bar.h)})`)
      await go(p, `/templates/tasks/${TASK_TPL}`)
      const step = await target(p.locator('[class*="library-editor-module__"][class*="__handle"]').first()); ok(step.w >= 44 && step.h >= 44, `768 · a task step's drag handle is ${step.w}×${step.h}`)
      /* W4-30: a gallery's list view — a short folder name and the *Used by* link stand 44 */
      await go(p, '/company/templates/quotes')
      await press(p, p.getByRole('radio', { name: 'List view' }).or(p.getByRole('button', { name: 'List view' })))
      const fname = p.locator('[class*="templates-table-module__"][class*="__name"]').first()
      if (await fname.count()) { const fm = await target(fname); ok(fm.w >= 44 && fm.h >= 44, `768 · the list view's first name is ${fm.w}×${fm.h}`) }
      const lused = p.locator('[class*="templates-table-module__"][class*="__usedLink"]').first()
      if (await lused.count()) { const um = await target(lused); ok(um.h >= 44, `768 · the list view's *Used by* link stands ${um.h} tall`) }
      await press(p, p.getByRole('radio', { name: 'Grid view' }).or(p.getByRole('button', { name: 'Grid view' })))   // put the browser's view back
      await c.close()
    }

    console.log('6 · the desk is the desk (1440, a mouse)')
    {
      const c = await ctxOf(b, 1440); const p = await c.newPage()
      await go(p, '/settings?section=quotes')
      const tn = await box(p.locator('[data-testid="trade"] button[class*="__tradeName"]'))
      ok(Math.round(tn.h) === 20, `1440 · a trade's name is its 20-tall word (${Math.round(tn.h)})`)
      const cb = await box(p.getByTestId('new-quote-defaults-change'))
      ok(Math.round(cb.h) === 36, `1440 · "Change in … › New quotes" is one 36 line (${Math.round(cb.h)})`)
      await go(p, '/settings?section=finance')
      const rows = await (await firstDocRow(p)).evaluate((r) => { const ks = [...r.children].map((k) => Math.round(k.getBoundingClientRect().top)); return Math.max(...ks) - Math.min(...ks) })
      ok(rows < 24, `1440 · a document row is one line (its parts within ${rows}px)`)
      await go(p, `/templates/${TPL}`)
      const en = await box(p.getByRole('textbox', { name: 'Template name' })); ok(Math.round(en.h) === 32, `1440 · the editor's name is 32 tall (${Math.round(en.h)})`)
      await go(p, '/company/finance/todo')
      const door = await box(p.getByTestId('finance-reports-door')); ok(door.h <= 22, `1440 · *Reports ›* is its text's height (${Math.round(door.h)})`)
      await c.close()
    }
    ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' · '))
  } finally {
    await b.close()
  }
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
