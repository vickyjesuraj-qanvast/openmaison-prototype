// The consistency walk: every Projects surface at 1440 and 390 (touch), beside the house pattern it borrows. Read-only presses only.
// Usage: NODE_PATH=<repo>/node_modules node walk.cjs <db> <outDir> [only-regex]
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs')
const { execSync } = require('child_process')
const [DB, OUT, ONLY] = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3051'
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const pid = (name) => sql(`select p.id from projects p join leads l on l.id=p.lead_id where l.name='${name}' and p.deleted_at is null`)
const BEN = pid('Benjamin Han'), RYAN = sql(`select p.id from projects p join leads l on l.id=p.lead_id where l.name like 'Ryan D%' and p.deleted_at is null`), AISHA = pid('Aisha Rahman'), SHAL = pid('Shalini Menon')
const SOPHIA = sql(`select id from leads where name='Sophia Wong' and deleted_at is null limit 1`)
const INV = sql(`select pi.id from project_invoices pi where pi.project_id='${BEN}' and pi.number='INV-2026-003'`)
const INV_OVER = sql(`select pi.id from project_invoices pi where pi.project_id='${BEN}' and pi.status='sent' order by pi.position desc limit 1`)
const PAY = sql(`select pp.id from project_payments pp join project_invoices pi on pi.id=pp.invoice_id where pi.project_id='${BEN}' limit 1`)
const VO = sql(`select id from quotes where kind='variation' limit 1`)
const QUOTE = sql(`select id from quotes where kind='quote' and deleted_at is null and lead_id='${SOPHIA}' limit 1`) || sql(`select id from quotes where kind='quote' and deleted_at is null limit 1`)
const TPL = sql(`select id from schedule_templates limit 1`)
const errors = []
const desk = [
  ['house-leads', '/leads'], ['projects', '/projects'],
  ['house-lead-overview', `/leads/${SOPHIA}`], ['ben-overview', `/projects/${BEN}`], ['ryan-overview', `/projects/${RYAN}`], ['shalini-overview', `/projects/${SHAL}`],
  ['ben-schedule', `/projects/${BEN}/schedule`], ['ben-updates', `/projects/${BEN}/updates`], ['ben-money', `/projects/${BEN}/money`], ['ryan-money', `/projects/${RYAN}/money`],
  ['ben-choices', `/projects/${BEN}/choices`], ['ben-tasks', `/projects/${BEN}/tasks`], ['house-lead-tasks', `/leads/${SOPHIA}/tasks`], ['ben-files', `/projects/${BEN}/files`], ['ben-activity', `/projects/${BEN}/activity`],
  ['invoice', `/projects/${BEN}/invoices/${INV}`], ['invoice-overdue', `/projects/${BEN}/invoices/${INV_OVER}`], ['receipt', `/projects/${BEN}/receipts/${PAY}`], ['house-quote-preview', `/quotes/${QUOTE}/preview`],
  ['vo-editor', `/quotes/${VO}`], ['company-portal', '/company/portal'], ['company-portal-clients', '/company/portal/clients'], ['company-schedules', '/company/templates/schedules'], ['schedule-template', `/templates/schedules/${TPL}`],
  ['house-company-tasks', '/company/templates/tasks'], ['settings-projects', '/settings?section=projects'], ['house-settings-notifications', '/settings?section=notifications'],
]
const portal = [['p-home', '/my/demo-studio'], ['p-schedule', '/my/demo-studio/schedule'], ['p-updates', '/my/demo-studio/updates'], ['p-money', '/my/demo-studio/money'],
  ['p-choices', '/my/demo-studio/choices'], ['p-designs', '/my/demo-studio/designs'], ['p-files', '/my/demo-studio/files']]
;(async () => {
  const b = await chromium.launch()
  const ctxs = { d: await b.newContext({ viewport: { width: 1440, height: 1024 } }), m: await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }) }
  for (const [tag, ctx] of Object.entries(ctxs)) {
    const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
    const shot = async (n, full = true) => { await p.screenshot({ path: path.join(OUT, `${n}-${tag === 'd' ? 1440 : 390}.png`), fullPage: full }) }
    const go = async (u) => { await p.goto(BASE + u, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1400) }
    const over = async (n) => { const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > (tag === 'd' ? 1441 : 391)) errors.push(`${tag} ${n}: page overflow ${w}`) }
    for (const [n, u] of desk) { if (ONLY && !new RegExp(ONLY).test(n)) continue; await go(u); await over(n); await shot(n) }
    // presses
    const tryPress = async (n, u, act) => { if (ONLY && !new RegExp(ONLY).test(n)) return; try { await go(u); await act(); await p.waitForTimeout(900); await shot(n, false) } catch (e) { errors.push(`${tag} ${n}: ${String(e).slice(0, 140)}`) } }
    await tryPress('projects-new', '/projects', async () => { await p.locator('[data-kb="create"]').first().click() })
    await tryPress('projects-rowmenu', '/projects', async () => { await p.getByRole('button', { name: /More actions/ }).first().click() })
    await tryPress('projects-kebab', '/projects', async () => { await p.locator('header button[aria-label*="More"], [aria-label="More"]').first().click() })
    await tryPress('ben-kebab', `/projects/${BEN}`, async () => { await p.getByRole('button', { name: /More actions|More/ }).first().click() })
    await tryPress('ben-access', `/projects/${BEN}`, async () => { await p.getByRole('button', { name: /More actions|More/ }).first().click(); await p.waitForTimeout(400); await p.getByRole('menuitem', { name: /Client access|portal/i }).first().click() })
    await tryPress('ben-milestone', `/projects/${BEN}/schedule`, async () => { await p.locator('[data-testid="milestone-name"]').first().click() })
    await tryPress('ben-share', `/projects/${BEN}/schedule`, async () => { await p.locator('[data-testid="share-changes"]').first().click() })
    await tryPress('ben-composer', `/projects/${BEN}/updates`, async () => { await p.locator('[data-testid="updates-post"]').first().click() })
    await tryPress('ben-record', `/projects/${BEN}/money`, async () => { await p.locator('[data-testid="record-payment"]').first().click() })
    await tryPress('ben-choice-add', `/projects/${BEN}/choices`, async () => { await p.locator('[data-testid="choices-add"]').first().click() })
    await tryPress('ben-handover', `/projects/${BEN}`, async () => { await p.getByRole('button', { name: /More actions|More/ }).first().click(); await p.waitForTimeout(400); await p.getByRole('menuitem', { name: /handover/i }).first().click() })
    await tryPress('projects-deleted', '/projects', async () => { await p.getByRole('button', { name: /More/ }).first().click(); await p.waitForTimeout(400); await p.getByRole('menuitem', { name: /Deleted/ }).first().click() })
  }
  // the portal, signed in as Benjamin
  for (const [tag, ctx] of Object.entries({ d: await b.newContext({ viewport: { width: 1440, height: 1024 } }), m: await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }) })) {
    const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`portal ${tag}: ${String(e).slice(0, 200)}`))
    const shot = async (n, full = true) => { await p.screenshot({ path: path.join(OUT, `${n}-${tag === 'd' ? 1440 : 390}.png`), fullPage: full }) }
    const go = async (u) => { await p.goto(BASE + u, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1400) }
    await go('/my/demo-studio/login'); await shot('p-login')
    await p.locator('input[type="tel"]').fill('97731968'); await p.getByRole('button', { name: 'Send me a code' }).click(); await p.waitForTimeout(1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(1500)
    for (const [n, u] of portal) { if (ONLY && !new RegExp(ONLY).test(n)) continue; await go(u); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > (tag === 'd' ? 1441 : 391)) errors.push(`portal ${tag} ${n}: overflow ${w}`); await shot(n); if (tag === 'm') { await p.setViewportSize({ width: 320, height: 700 }); await p.waitForTimeout(500); const w2 = await p.evaluate(() => document.documentElement.scrollWidth); if (w2 > 321) errors.push(`portal 320 ${n}: overflow ${w2}`); await p.setViewportSize({ width: 390, height: 844 }) } }
    await go(`/my/demo-studio/money/invoice/${INV}`); await shot('p-invoice')
    await go(`/my/demo-studio/money/receipt/${PAY}`); await shot('p-receipt')
    await go('/my/demo-studio'); try { await p.locator('[data-testid="portal-bell"]').first().click(); await p.waitForTimeout(800); await shot('p-bell', false) } catch (e) { errors.push('bell ' + e) }
  }
  await b.close()
  console.log(errors.join('\n') || 'no errors')
})()
