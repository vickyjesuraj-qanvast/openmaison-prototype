// (simplify round 3, REG-1557 · REG-1558) The owner's "you decide" calls of 2026-10-10, on a scratch copy of the baseline:
//   1. a payment due today that nobody reminds the client of is a Needs you row on Money (Remind on WhatsApp · Record a payment), and only then;
//   2. the phone Overview folds Progress's stage rows and Recent activity (Show / Hide), the desk keeps both; Setting up keeps its stage rows.
// (REG-1559, Activity › All saying an ask's task once, is asserted in verify-pj-gap-h.cjs § 11, where the ask is made.)
// Usage: BASE=http://localhost:3015 NODE_PATH=<repo>/node_modules node verify-r3.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r3')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3015'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const P = (number) => sql(`select id from projects where number='${number}'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const ben = P('P-2026-002'), marcus = P('P-2026-004')
  const mid = sql(`select id from project_invoices where number='INV-2026-006'`)
  /* what the probe puts back */
  const T0 = Number(sql(`select strftime('%s','now')`)) - 2
  const dueBefore = sql(`select due_at from project_invoices where id='${mid}'`)
  const rulesBefore = sql(`select value from settings where key='client_messages'`)
  const midnight = (() => { const d = new Date(); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) })()
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const allNeeds = async (p) => { const more = p.locator('[data-testid="money-needs-more"]'); if (await more.count() && /more/.test(await more.innerText())) { await more.click(); await settle(p, 400) } }
  try {
    // ── 1 · Due today ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · A payment due today')
    sql(`update project_invoices set due_at=${midnight} where id='${mid}'`)
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    await D.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
    const s = await D.newPage(); watch(s, 'desk')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    const row = s.locator('[data-testid="invoice-due-today"]')
    const words = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(await row.count() === 1 && /INV-2026-006 · Mid-Project/.test(words) && /Due today · the automatic reminder is off/.test(words), `Money › Needs you: "INV-2026-006 · Mid-Project" — "Due today · the automatic reminder is off" (the event is off by default) — "${words.slice(0, 140)}"`)
    ok(await row.getByRole('button', { name: 'Remind on WhatsApp' }).count() === 1 && await row.getByRole('button', { name: 'Record a payment' }).count() === 1, '…its step is Remind on WhatsApp, Record a payment beside it')
    ok(await s.locator('[data-testid="invoice-overdue"]').count() === 0, '…and it is not an overdue row (not past its day)')
    await shot(s, 'r3-01-due-today', false)
    /* the client hears by themselves: the event on (email), Benjamin on the portal — no row */
    sql(`insert into settings (key, value, updated_at) values ('client_messages', '{"channels":{"client_payment_due":{"email":true,"whatsapp":false}}}', ${T0}) on conflict(key) do update set value=excluded.value`)
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    ok(await s.locator('[data-testid="invoice-due-today"]').count() === 0, 'with the due-day email on and Benjamin on the portal, nothing to do — he hears by himself')
    sql(rulesBefore ? `update settings set value='${rulesBefore.replace(/'/g, "''")}' where key='client_messages'` : `delete from settings where key='client_messages'`)
    /* reminded today: the row has done its job */
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    await s.evaluate(() => { window.__opened = [] })
    await s.locator('[data-testid="invoice-remind-today"]').click(); await settle(s, 1500)
    const wa = await s.evaluate(() => window.__opened[0] ?? '')
    ok(/wa\.me\//.test(wa) && /INV-2026-006/.test(decodeURIComponent(wa)), 'Remind on WhatsApp opens on the press, the invoice in the draft')
    await go(s, `/projects/${ben}/money`); await allNeeds(s)
    ok(await s.locator('[data-testid="invoice-due-today"]').count() === 0, '…and once reminded today the row is gone')
    await D.close()

    // ── 2 · The phone Overview ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The phone Overview folds')
    const M = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/projects/${ben}`)
    const progress = m.locator('[data-card="status"]').first()
    ok(await progress.isVisible() && /milestones/.test(await progress.innerText()) && !(await m.locator('[data-testid="stage-in_progress"]').isVisible()), 'Progress at 390: the milestones, the dates — the stage rows fold (the header’s Stage ▾ names the stage)')
    ok(/In progress/.test(await m.getByRole('button', { name: /^Stage/ }).first().innerText().catch(() => '')), '…and the header’s Stage ▾ says In progress')
    const toggle = m.locator('[data-testid="recent-activity-toggle"]')
    const actRows = m.locator('section[data-card="recent-activity"]')
    ok(await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false' && (await actRows.boundingBox())?.height <= 64, 'Recent activity at 390: one row with Show (its head alone, 60 high)')
    await toggle.scrollIntoViewIfNeeded(); await toggle.click(); await settle(m, 400)
    ok(await toggle.getAttribute('aria-expanded') === 'true' && /Hide/.test(await toggle.innerText()) && (await actRows.boundingBox())?.height > 100, '…Show opens its lines, Hide folds them again')
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390')
    await shot(m, 'r3-02-overview-phone')
    await go(m, `/projects/${marcus}`)
    ok(await m.locator('[data-testid="stage-setting_up"]').isVisible(), 'Setting up at 390 keeps its stage rows — they are the card then')
    await M.close()
    const W = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const w = await W.newPage(); watch(w, 'desk2')
    await go(w, `/projects/${ben}`)
    ok(await w.locator('[data-testid="stage-in_progress"]').isVisible() && !(await w.locator('[data-testid="recent-activity-toggle"]').isVisible()) && (await w.locator('section[data-card="recent-activity"]').boundingBox())?.height > 100, 'at 1440 nothing folds: the stage rows and the activity lines, no toggle')
    await W.close()
  } catch (e) { fail++; console.log('  ✗ threw:', String(e).slice(0, 300)) } finally {
    sql(`update project_invoices set due_at=${dueBefore || 'NULL'} where id='${mid}'`)
    sql(rulesBefore ? `update settings set value='${rulesBefore.replace(/'/g, "''")}' where key='client_messages'` : `delete from settings where key='client_messages'`)
    sql(`delete from lead_events where kind='project_invoice_reminded' and at >= ${T0}`)
    await b.close()
  }
  if (errors.length) { fail++; console.log('  ✗ page errors:\n   ' + errors.join('\n   ')) }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
