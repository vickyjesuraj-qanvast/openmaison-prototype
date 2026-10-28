// Leads on the move — the two blockers the audit found, fixed ahead of the proposal (REG-2655 · REG-2656, 2026-10-23).
//  0 · the pure owner gate (rl-stage-intent-pure.mts)
//  1 · B-01 at 390 and 1440: on a lead nobody owns, the header's "Move to Contacted" refuses with "Assign a member first" and its Assign
//      action (the stage menu's rule), and opens no Move stage window — so no log can be typed and lost; an owned lead still opens it.
//  2 · C-01 at 390: in the Notes tab's contact log (a phone sheet), Auto Fill and Attach open ABOVE the sheet (a real tap reaches them).
//  3 · 1440: Auto Fill from the Notes tab opens as before (no nested scrim on the desk).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back.
// Usage: BASE=http://localhost:3019 NODE_PATH=<repo>/node_modules node verify-rl-fixes.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rl-fixes')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3019'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify')) ? process.cwd() : path.resolve(__dirname, '../../..'))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (c, what) => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}`) } }
const settle = (p, ms = 800) => p.waitForTimeout(ms)
const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1400) }

;(async () => {
  console.log('0 · the owner gate, pure')
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-leads/rl-stage-intent-pure.mts')}"`, { cwd: REPO, encoding: 'utf8' })
    for (const l of out.split('\n')) if (/^\s+[✓✗]/.test(l)) { console.log(l); if (/✓/.test(l)) pass++; else fail++ }
  } catch (e) { ok(false, `the pure gate runs clean — ${String(e.stdout || e.message).slice(0, 200)}`) }

  // an unowned New lead of our own, and an owned one (put back at the end)
  const unowned = 'rl-fix-unowned', owned = 'rl-fix-owned'
  const now = Math.floor(Date.now() / 1000)
  const me = sql(`select id from members where is_you = 1 limit 1`)
  sql(`insert into leads (id, name, phone, source, property_type, budget_minor, stage, created_at, updated_at) values ('${unowned}', 'Probe Unowned', '91234001', 'Instagram', 'HDB 4-Room', 0, 'New', ${now}, ${now}), ('${owned}', 'Probe Owned', '91234002', 'Instagram', 'HDB 4-Room', 0, 'New', ${now}, ${now})`)
  sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at) values ('rl-fix-assign', '${owned}', '${me}', ${now})`)
  const errors = []
  const b = await chromium.launch()
  try {
    for (const [label, ctxOpts] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['1440', { viewport: { width: 1440, height: 1024 } }]]) {
      console.log(`1 · B-01 at ${label}: an unowned lead's "Move to Contacted"`)
      const C = await b.newContext(ctxOpts); const p = await C.newPage(); p.on('pageerror', (e) => errors.push(e.message))
      await go(p, `/leads/${unowned}`)
      /* (the calm UI build 2026-10-27, a deliberate change — audit 2-05) the filled button never offers a move the page refuses: an unowned lead's
         primary is "Assign a member" — the Assign window opens, and the move follows once a member is saved; B-01's guarantee (no log typed and
         lost) still holds */
      const primary = p.getByRole('button', { name: 'Assign a member' }).locator('visible=true').first()
      ok(await primary.count() === 1, `the header offers "Assign a member" (${label})`)
      if (label === '390') await primary.tap(); else await primary.click()
      await settle(p, 900)
      ok(await p.getByText('Assign members', { exact: true }).locator('visible=true').count() >= 1, 'the press opens Assign members — the way on')
      ok(await p.getByRole('dialog', { name: /Move stage/ }).count() === 0 && await p.getByText('Contact log', { exact: false }).locator('visible=true').count() === 0, 'no Move stage window opened — no log can be typed and lost')
      await p.screenshot({ path: path.join(dir, `b01-${label}-refused.png`) })
      await go(p, `/leads/${owned}`)
      const p2 = p.getByRole('button', { name: 'Move to Contacted' }).locator('visible=true').first()
      if (label === '390') await p2.tap(); else await p2.click()
      await settle(p, 1200)
      ok(await p.getByRole('dialog').locator('visible=true').count() >= 1, `an owned lead still opens the Move stage window (${label})`)
      await C.close()
    }

    console.log('2 · C-01 at 390: Auto Fill and Attach above the contact log’s sheet')
    const M = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const m = await M.newPage(); m.on('pageerror', (e) => errors.push(e.message))
    await go(m, `/leads/${owned}/notes`)
    await m.getByRole('button', { name: /^New/ }).locator('visible=true').first().tap(); await settle(m, 600)
    await m.getByRole('menuitem', { name: /Contact Log/i }).first().tap(); await settle(m, 1000)
    const top = async (dlgName) => m.evaluate((name) => {
      const d = [...document.querySelectorAll('[role="dialog"]')].find((el) => (el.getAttribute('aria-label') || el.querySelector('h2,h1')?.textContent || '').includes(name))
      if (!d) return 'no dialog'
      const r = d.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 120)
      const hit = document.elementFromPoint(x, y)
      return hit && d.contains(hit) ? 'on top' : `under ${hit ? hit.tagName + '.' + String(hit.className).slice(0, 30) : 'nothing'}`
    }, dlgName)
    await m.getByRole('button', { name: 'Auto Fill' }).locator('visible=true').first().tap(); await settle(m, 900)
    const af = await top('Auto fill')   // (the calm UI build 2026-10-27, a deliberate change) — sentence case
    ok(af === 'on top', `Auto Fill opens above the log's sheet (${af}) — C-01`)
    await m.screenshot({ path: path.join(dir, 'c01-390-autofill.png') })
    await m.getByRole('dialog', { name: 'Auto Fill' }).getByRole('button', { name: 'Cancel' }).tap(); await settle(m, 700)
    // the log's own Attach link (REG-324), inside the contact log's sheet — not the docked composer's attach glyph.
    // (leads on the move, a deliberate change of this rule) since L2 New › Contact Log on a phone is the log sheet: its "From {first}'s files"
    // opens the lead's files (the same Attach files modal), Take a photo · Choose a file above it
    const attach = m.getByTestId('log-from-files').locator('visible=true').first()
    if (await attach.count()) {
      await attach.tap(); await settle(m, 900)
      const at = await top('Attach files')
      ok(at === 'on top', `Attach files opens above the log's sheet (${at}) — C-01`)
      await m.screenshot({ path: path.join(dir, 'c01-390-attach.png') })
      const ad = m.getByRole('dialog', { name: 'Attach files' }); if (await ad.count()) { await ad.getByRole('button', { name: /Cancel|Close/ }).first().tap().catch(() => {}); await settle(m, 500) }
    } else ok(false, 'the contact log offers Attach')
    await M.close()

    console.log('3 · 1440: Auto Fill from the Notes tab as before')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const d = await D.newPage(); d.on('pageerror', (e) => errors.push(e.message))
    await go(d, `/leads/${owned}/notes`)
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 500)
    await d.getByRole('menuitem', { name: /Contact Log/i }).first().click(); await settle(d, 900)
    await d.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(d, 900)
    const scrim = await d.evaluate(() => { const o = [...document.querySelectorAll('[data-nested]')]; return o.length })
    ok(await d.getByRole('dialog', { name: 'Auto Fill' }).isVisible() && scrim === 0, `the desk's Auto Fill opens on the house layer, no nested scrim (${scrim})`)
    await D.close()
  } finally {
    await b.close()
    sql(`delete from lead_notes where lead_id in ('${unowned}', '${owned}')`)
    sql(`delete from lead_assignees where lead_id in ('${unowned}', '${owned}')`)
    sql(`delete from leads where id in ('${unowned}', '${owned}')`)
    console.log('put back: leads, lead_assignees, lead_notes')
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ').slice(0, 300)}` : ''}`)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
