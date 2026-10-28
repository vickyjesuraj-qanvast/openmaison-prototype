// Leads on the move, L2 · the moments that move a lead — the log sheet (P-03), the Move stage window one step per screen (P-04), Q-02 · Q-03,
// one snackbar at a time (B-14 · B-15), reached from the lead's page as it is (Notes › New › Contact Log, the header's button, the LEAD
// STAGES card) — the Lead screen (L1) was reverted on his word, 2026-10-23
// (his marks 2026-10-23 on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh, "continue the leads"; the brief
// `design-source/context/responsive/leads-on-the-move-2026-10-23/brief.md`, L2's row). Each rule asserted as the rule it builds, never another
// round's count; every new press pressed for real (a tap under touch at 390 · 768 · 1024, a click at 1440), on the production build:
//  0 · the pure rules (rl-l2-pure.mts): what a press logs and whether its save moves the lead, the sheet's words, Q-02 in validateStage.
//  1 · P-03 at 390 — a call in the log sheet (Kelvin, New): How it went → Save log logs AND moves to Contacted
//      through the move's own path (a Contacted stage log holding the call, its call-back a dated Follow-up for the lead's members); the sheet's
//      scale (chips 44 at 14, Save 48, the title's question, Now set); the page then reads the new state (the header's Move to Met).
//  2 · P-03 at 390 — an unowned New lead (Olivia, REG-130 · REG-2655): the owner row first, the suggested member first; no pick keeps the lead in
//      New (the line says so); a pick + Save assigns them and moves the lead; no Move stage window is ever opened, nothing typed is lost.
//  3 · P-03 at 390 — a site visit on a Contacted lead (Farah): "Save & move to Met", Where In person, Take a photo (Q-02's camera first) → the
//      Met step's meeting log keeps the photo; a Note: refused empty in the foot, then saved as a note; a refusal from the server (the lead moved
//      on underneath) stays in the foot with what was typed.
//  4 · C-21 at 390: Notes › New › Contact Log is the log sheet; on a New lead its save moves the lead; Auto Fill and the lead's files open above it.
//  5 · P-04 at 390 — the window one step per screen: the bar "Move to Met" over "{lead} · step 3 of 5", no rail, one filled button at 48; a
//      refused Save stays in the foot (fields kept) — a client-side check and a server refusal alike; Q-02: Contacted moves with no screenshot;
//      B-02: a member row is its label; B-09: a completed log is a summary card with Edit, the foot Close.
//  6 · P-04 · Q-03 · B-11 · B-12 at 390 — Won as a checklist: the signed quote and contract as photos, the payments at the studio's usual
//      10 · 30 · 30 · 30, the project type as chips, Create project → the project, the quote's photo kept as a picture in Files.
//  7 · B-13 at 390 — On Hold and Lost as one sheet shape (the lead's name, reasons as chips, Save & move at 48), Undo after each.
//  8 · B-14 · B-15 at 390 — a sheet opening withdraws the refusal said before it; one snackbar at a time (Hold then Resume: one bar, the newest).
//  9 · 768 upright (touch): the log as a bottom sheet, the window one step per screen in a ≤672 column; 1024 sideways (touch): the window is the
//      centred modal with its rail, the log a centred dialog.
// 10 · 1440 (a mouse): the desk as it was — the window's rail and its Cancel · Save; Q-02's one desk change (the Attach row "(optional)", no
//      "*"); the Notes tab's contact log in its pane; no log sheet.
// 11 · 320: no sideways scroll in the log sheet and the step screen. No page errors. Everything written is put back.
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3192 NODE_PATH=<repo>/node_modules node verify-rl-l2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'rl-l2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3192'
const REPO = fs.existsSync(path.resolve(__dirname, '../../../lib')) ? path.resolve(__dirname, '../../..') : process.cwd()   // a harness copy reads the repo it runs in
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rl-l2-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  // 0 · the pure rules, run from the repo
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-leads/rl-l2-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure rules: ${p} passed, ${f} failed`)
    if (f) console.log(out.split('\n').filter((l) => l.includes('✗')).join('\n'))
  } catch (e) { fail++; console.log('  ✗ the pure rules did not run:', String(e.stdout || e).slice(0, 400)) }

  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }   // the app's own lazy writes first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return changed
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }

  // ── the records this probe reads: the demo's own, by what they are ──
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const L = {
    kelvin: leadId('Kelvin Goh'), olivia: leadId('Olivia Martinez'), farah: leadId('Farah Ahmad'), gerald: leadId('Gerald Tan'), rahul: leadId('Rahul Menon'),
    chloe: leadId('Chloe Tan'), jasmine: leadId('Jasmine Lee'), cheryl: leadId('Cheryl Lim'), wei: leadId('Lim Wei Ling'), vivien: leadId('Vivien Lee'),
    priya: leadId('Priya Nair'), gavin: leadId('Gavin See'), marcus: leadId('Marcus Chen'), jonathan: leadId('Jonathan Teo'),
  }
  const stageOf = (id) => sql(`select stage from leads where id = '${id}'`)
  const lastLog = (id, to) => { const r = json(`select payload from stage_logs where lead_id = '${id}' and to_stage = '${to}' order by created_at desc, rowid desc limit 1`)[0]; return r ? JSON.parse(r.payload) : null }
  const sharp = require('sharp')
  const jpegPath = path.join(os.tmpdir(), `rl-l2-photo-${process.pid}.jpg`)
  fs.writeFileSync(jpegPath, await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#f4f1ea' } }).composite([{ input: Buffer.from('<svg width="900" height="1200"><rect x="80" y="120" width="740" height="40" fill="#333"/><rect x="80" y="220" width="600" height="16" fill="#777"/><path d="M100 960 C 160 900, 220 1000, 300 940" stroke="#13246b" stroke-width="5" fill="none"/></svg>'), left: 0, top: 0 }]).jpeg({ quality: 80 }).toBuffer())

  const touchCtx = (w, h) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const mouseCtx = (w, h) => b.newContext({ viewport: { width: w, height: h } })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })   // viewport-only
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, r: r.right, bt: r.bottom } })
  const tapEl = async (p, loc) => { const l = loc.first(); await l.scrollIntoViewIfNeeded(); const r = await box(l); await p.touchscreen.tap(r.cx, r.cy) }
  /* what a finger at the middle of `loc` lands on — the control itself, not something over it */
  const hitsSelf = (loc) => loc.first().evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (hit === el || el.contains(hit)) })
  const fontOf = (loc) => loc.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  /* what a line says — its glyph's ligature (aria-hidden) left out */
  const said = (loc) => loc.first().evaluate((el) => { const parts = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.parentElement?.closest('[aria-hidden]')) parts.push(n.textContent) } return parts.join(' ').replace(/\s+/g, ' ').replace(/ ([.,·])/g, (m, p) => (p === '·' ? m : p)).trim() }).catch(() => '')
  const snackBars = (p) => p.locator('[data-om-snackbar] > *')
  const snackText = async (p) => (await snackBars(p).allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await snackText(p))) return true; await settle(p, 200) } return false }
  const sheet = (p) => p.getByTestId('log-sheet')
  const radio = (p, group, name) => p.getByTestId(group).getByRole('radio', { name, exact: true })
  /* (2026-10-23, his call: the lead's page stays the page with its tab strip — the Lead screen was reverted) the log sheet is reached as on the
     page: Notes › New › Contact Log, the channel then set in the sheet; the move is the header's one filled button; a stage, the LEAD STAGES card */
  const CHANNEL = { call: 'Call', whatsapp: 'WhatsApp', visit: 'Visit', note: 'Note' }   // (the calm UI build 2026-10-27, a deliberate change — 2-08: one word for the visit, the chip's)
  const openLog = async (p, lead, which) => {
    await go(p, `/leads/${lead}/notes`)
    await tapEl(p, p.getByRole('button', { name: /^New/ }).locator('visible=true')); await settle(p, 600)
    await tapEl(p, p.getByRole('menuitem', { name: /Contact Log/i })); await sheet(p).waitFor({ timeout: 8000 }); await settle(p, 800)
    if (which !== 'call') { await tapEl(p, radio(p, 'log-channel', CHANNEL[which])); await settle(p, 600) }
  }
  const primary = (p) => p.locator('[data-testid="header-primary"] button').locator('visible=true').first()
  const stageRow = (p, stage) => p.locator('[data-card="lead-stages"]').locator('visible=true').first().getByText(stage, { exact: true }).first()
  const step = (p) => p.getByTestId('move-step-screen')

  try {
    const M = await touchCtx(390, 844); const m = await page(M, '390')

    // ── 1 · a call in three taps ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · P-03 at 390 — a call in the log sheet (Kelvin, New)')
    const kelvinStageLogs = Number(sql(`select count(*) from stage_logs where lead_id = '${L.kelvin}'`))
    const kelvinNotes = Number(sql(`select count(*) from lead_notes where lead_id = '${L.kelvin}'`))
    await openLog(m, L.kelvin, 'call')
    const dlg = m.getByRole('dialog', { name: 'How did the call with Kelvin go?' })
    ok(await dlg.isVisible(), 'Notes › New › Contact Log opens the log sheet: "How did the call with Kelvin go?"')
    ok(await radio(m, 'log-channel', 'Call').getAttribute('aria-checked') === 'true', 'the channel is the press’s — Call set')
    ok(/^Now · \d{1,2}:\d{2} [AP]M$/.test((await m.getByTestId('log-when').locator('[class*="whenValue"]').innerText()).trim()), 'When is set to now ("Now · 3:00 PM"), Change beside it')
    const outcomes = await m.getByTestId('log-outcome').getByRole('radio').allInnerTexts()
    ok(JSON.stringify(outcomes) === JSON.stringify(['Connected', 'Callback requested', 'Meeting scheduled', 'No response', 'Not interested']), `the outcomes as chips: ${outcomes.join(' · ')}`)
    const chipBox = await box(radio(m, 'log-outcome', 'Connected')), chipFont = await fontOf(radio(m, 'log-outcome', 'Connected'))
    ok(chipBox.h >= 44 && chipFont >= 14, `a chip is 44 tall at 14 (${Math.round(chipBox.h)} · ${chipFont})`)
    const save = m.getByTestId('log-save'), saveBox = await box(save)
    ok(saveBox.h >= 48 && saveBox.w >= 300 && (await save.innerText()).trim() === 'Save log', `one filled Save log across the foot at 48 (${Math.round(saveBox.w)}×${Math.round(saveBox.h)})`)
    ok((await said(m.getByTestId('log-line'))) === 'Saving moves Kelvin to Contacted.', 'the line above it says what Save does: "Saving moves Kelvin to Contacted."')
    await shot(m, '01-m390-call-sheet')
    await tapEl(m, radio(m, 'log-outcome', 'Callback requested')); await settle(m, 500)
    ok(await m.getByTestId('log-next').isVisible() && /^Call back/.test((await m.getByTestId('log-next').innerText()).trim()), 'Callback requested opens "Call back" with its presets')
    await tapEl(m, m.getByTestId('log-next').getByRole('radio', { name: /^Tomorrow/ })); await settle(m, 400)
    ok(await m.getByTestId('log-next-mode').isVisible() && await m.getByTestId('log-next-mode').getByRole('radio', { name: 'Call', exact: true }).getAttribute('aria-checked') === 'true', 'a day picked → How, the call’s own way set')
    await shot(m, '02-m390-callback')
    await tapEl(m, save)
    ok(await waitSnack(m, /Call logged — Kelvin is in Contacted\. Call back tomorrow · 10:00 AM is in Tasks\./), `Save: "${await snackText(m)}"`)
    ok(stageOf(L.kelvin) === 'Contacted', 'the lead moved to Contacted — through the move’s own path')
    const kLog = lastLog(L.kelvin, 'Contacted')
    ok(!!kLog && kLog.logs?.length === 1 && kLog.logs[0].channel === 'Call' && kLog.logs[0].outcome === 'Callback requested' && !!kLog.logs[0].nextStepWhen, 'its Contacted stage log holds the call — Call · Callback requested · the call-back')
    ok(Number(sql(`select count(*) from stage_logs where lead_id = '${L.kelvin}'`)) === kelvinStageLogs + 1 && Number(sql(`select count(*) from lead_notes where lead_id = '${L.kelvin}'`)) === kelvinNotes, 'one stage log, no second record (the Notes tab lists it from the stage)')
    const fu = json(`select t.id, t.kind, t.due_at as due from lead_tasks t where t.lead_id = '${L.kelvin}' and t.kind = 'Follow-up' order by t.created_at desc limit 1`)[0]
    const fuMembers = fu ? Number(sql(`select count(*) from task_assignees where task_id = '${fu.id}'`)) : 0
    ok(!!fu && new Date(fu.due * 1000).getHours() === 10 && fuMembers >= 1, 'the call-back is a dated Follow-up at 10:00 for the lead’s members (REG-608)')
    await go(m, `/leads/${L.kelvin}`)
    ok((await primary(m).innerText()).trim() === 'Move to Met', 'the page reads the new state: the header’s button is Move to Met')
    await shot(m, '03-m390-after-call')

    // ── 2 · an unowned New lead ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · P-03 at 390 — nobody owns Olivia: the owner row first (REG-130 · REG-2655)')
    await openLog(m, L.olivia, 'call')
    const owner = m.getByTestId('log-owner')
    const firstGroup = await sheet(m).evaluate((el) => { const g = el.querySelector('[data-testid="log-owner"], [data-testid="log-channel"]'); return g?.getAttribute('data-testid') ?? g?.closest('[data-testid]')?.getAttribute('data-testid') })
    ok(await owner.isVisible() && /^Who owns Olivia\?/.test((await owner.innerText()).trim()) && firstGroup === 'log-owner', 'the owner row comes first: "Who owns Olivia?"')
    const ownerChips = await owner.getByRole('radio').allInnerTexts()
    ok(/ · suggested$/.test(ownerChips[0] ?? '') || /\(you\)$/.test(ownerChips[0] ?? ''), `the suggested member first: ${ownerChips.slice(0, 3).join(' · ')}`)
    ok((await said(m.getByTestId('log-line'))) === 'Olivia stays in New until someone owns the lead.', 'no pick: the line says the lead stays in New')
    await tapEl(m, owner.getByRole('radio').first()); await settle(m, 300)
    const chosen = (ownerChips[0] ?? '').replace(/ · suggested$| \(you\)$/, '')
    ok((await said(m.getByTestId('log-line'))) === `Saving puts ${chosen.split(' ')[0]} on Olivia and moves Olivia to Contacted.`, `a pick: "${(await said(m.getByTestId('log-line')))}"`)
    await shot(m, '04-m390-olivia-owner')
    await tapEl(m, save); await settle(m, 600)
    ok(await m.getByTestId('log-refusal').isVisible() && /Choose how it went/.test(await m.getByTestId('log-refusal').innerText()) && await sheet(m).isVisible(), 'Save without an outcome: the foot says so, the sheet stays')
    await tapEl(m, radio(m, 'log-outcome', 'Connected')); await settle(m, 300)
    await tapEl(m, save)
    ok(await waitSnack(m, /Call logged — Olivia is in Contacted\./), `Save: "${await snackText(m)}"`)
    const memberId = sql(`select id from members where name = '${chosen.replace(/'/g, "''")}' limit 1`)
    ok(stageOf(L.olivia) === 'Contacted' && Number(sql(`select count(*) from lead_assignees where lead_id = '${L.olivia}' and member_id = '${memberId}'`)) === 1, `${chosen} is on Olivia and she is in Contacted`)
    ok(await m.getByRole('dialog', { name: 'Move stage' }).count() === 0, 'no Move stage window opened on the way — nothing typed was lost')

    // ── 3 · a site visit, a note, a refusal from the server ──────────────────────────────────────────────────────────────────────
    console.log('3 · P-03 at 390 — a site visit on Farah (Contacted), a note on Gerald, a refusal that stays')
    await openLog(m, L.farah, 'visit')
    ok((await save.innerText()).trim() === 'Save & move to Met' && await radio(m, 'log-where', 'In person').getAttribute('aria-checked') === 'true', 'a site visit on a Contacted lead: "Save & move to Met", Where In person')
    const photoRow = m.getByTestId('log-take-photo')
    ok(await photoRow.isVisible() && (await m.getByTestId('log-take-photo-input').getAttribute('capture')) === 'environment', 'Take a photo first — the camera at once (Q-02)')
    await m.getByTestId('log-take-photo-input').setInputFiles(jpegPath); await settle(m, 3500)
    const fileRows = await sheet(m).locator('[aria-label="Kept with this log"] li').count()
    ok(fileRows === 1, `the photo is kept with the log (${fileRows} row)`)
    await shot(m, '05-m390-visit')
    await tapEl(m, save)
    ok(await waitSnack(m, /Visit logged — Farah is in Met\./), `Save: "${await snackText(m)}"`)
    const fMet = lastLog(L.farah, 'Met')
    ok(stageOf(L.farah) === 'Met' && fMet?.meetings?.length === 1 && fMet.meetings[0].where === 'In person' && fMet.meetings[0].fileIds?.length === 1, 'Farah is in Met; the Met step’s meeting log holds the visit and its photo')
    await openLog(m, L.gerald, 'note')
    ok(await m.getByRole('dialog', { name: 'A note on Gerald' }).isVisible() && (await save.innerText()).trim() === 'Save note', 'the sheet’s Note: "A note on Gerald", Save note')
    await tapEl(m, save); await settle(m, 500)
    ok(/Write a note or add a photo/.test(await m.getByTestId('log-refusal').innerText()), 'an empty note is refused in the foot')
    const geraldNotes = Number(sql(`select count(*) from lead_notes where lead_id = '${L.gerald}' and kind = 'note'`))
    await m.getByTestId('log-sheet').locator('textarea').fill('Client prefers oak flooring'); await settle(m, 200)
    await tapEl(m, save)
    ok(await waitSnack(m, /^Note saved\./) && Number(sql(`select count(*) from lead_notes where lead_id = '${L.gerald}' and kind = 'note'`)) === geraldNotes + 1, 'the note is saved on the Notes tab')
    // a refusal from the server: Rahul (New) moves on underneath while the sheet is open
    await openLog(m, L.rahul, 'call')
    await tapEl(m, radio(m, 'log-outcome', 'No response')); await m.getByTestId('log-sheet').locator('textarea').fill('Rang twice'); await settle(m, 200)
    sql(`update leads set stage = 'Contacted' where id = '${L.rahul}'`)
    await tapEl(m, save); await settle(m, 2500)
    const refused = await said(m.getByTestId('log-refusal'))
    ok(/Rahul Menon is in Contacted now — close this and log it again/.test(refused) && await sheet(m).isVisible(), `the server's refusal stays in the foot: "${refused}"`)
    ok(await m.getByTestId('log-sheet').locator('textarea').inputValue() === 'Rang twice' && await radio(m, 'log-outcome', 'No response').getAttribute('aria-checked') === 'true', '…and nothing typed is lost')
    sql(`update leads set stage = 'New' where id = '${L.rahul}'`)
    await m.keyboard.press('Escape'); await settle(m, 600)

    // ── 4 · Notes › New › Contact Log ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · C-21 at 390 — Notes › New › Contact Log is the log sheet')
    await go(m, `/leads/${L.chloe}/notes`)
    await tapEl(m, m.getByRole('button', { name: /^New/ }).locator('visible=true')); await settle(m, 600)
    await tapEl(m, m.getByRole('menuitem', { name: /Contact Log/i })); await sheet(m).waitFor({ timeout: 8000 }); await settle(m, 800)
    ok(await m.getByRole('dialog', { name: 'How did the call with Chloe go?' }).isVisible(), 'New › Contact Log opens the log sheet')
    const top = (name) => m.evaluate((n) => { const d = [...document.querySelectorAll('[role="dialog"]')].find((el) => (el.getAttribute('aria-label') || '').includes(n)); if (!d) return 'no dialog'; const r = d.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 120)); return hit && d.contains(hit) ? 'on top' : 'under' }, name)
    await tapEl(m, m.getByRole('button', { name: /Auto fill/i }).locator('visible=true')); await settle(m, 800)   // (the calm UI build 2026-10-27, a deliberate change) — sentence case
    ok(await top('Auto fill') === 'on top', 'Auto fill opens above the sheet (REG-2656’s layer)')   // (the calm UI build 2026-10-27, a deliberate change) — sentence case
    await tapEl(m, m.getByRole('dialog', { name: 'Auto Fill' }).getByRole('button', { name: 'Cancel' })); await settle(m, 600)
    await tapEl(m, m.getByTestId('log-from-files')); await settle(m, 1200)
    ok(await top('Attach files') === 'on top', '“From Chloe’s files” opens the lead’s files above the sheet')
    await m.keyboard.press('Escape'); await settle(m, 600)
    ok(await m.getByRole('dialog', { name: 'Attach files' }).count() === 0 && await sheet(m).isVisible(), 'Esc closes the files, the log sheet stays (the nested surfaces follow the sheet)')
    await tapEl(m, radio(m, 'log-outcome', 'Connected')); await settle(m, 200)
    await tapEl(m, save)
    ok(await waitSnack(m, /Call logged — Chloe is in Contacted\./) && stageOf(L.chloe) === 'Contacted', 'its save on a New lead moves Chloe to Contacted')

    // ── 5 · the window one step per screen ───────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · P-04 at 390 — the Move stage window, one step per screen')
    await go(m, `/leads/${L.jasmine}`)
    await tapEl(m, primary(m)); await step(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    const bar = m.getByTestId('move-step-bar')
    ok(await said(bar) === 'Move to Met Jasmine Lee · step 3 of 5', `the bar: "${await said(bar)}"`)
    ok(await step(m).getByRole('tablist').count() === 0, 'no rail — one step at a time')
    const prim = m.getByTestId('move-step-primary'), pbx = await box(prim)
    ok((await prim.innerText()).trim() === 'Save & move' && pbx.h >= 48 && pbx.w >= 300 && await step(m).locator('[data-surface-foot] button').count() === 1, `one filled Save & move at 48 (${Math.round(pbx.w)}×${Math.round(pbx.h)})`)
    ok(/^Now · /.test((await step(m).getByTestId('log-when').innerText()).replace(/^When\s*/, '').trim()), 'the meeting opens at now')
    await shot(m, '06-m390-step-met')
    await tapEl(m, prim); await settle(m, 700)
    ok(await m.getByTestId('move-step-refusal').isVisible() && await step(m).isVisible(), 'Save with no Where: the foot says so, the step stays')
    await tapEl(m, radio(m, 'log-where', 'Showroom')); await settle(m, 200)
    ok(!(await m.getByTestId('move-step-refusal').isVisible().catch(() => false)), '…and the message goes once it is fixed')
    // a server refusal: nobody owns the lead any more by the time it saves
    const jasmineMembers = json(`select * from lead_assignees where lead_id = '${L.jasmine}'`)
    sql(`delete from lead_assignees where lead_id = '${L.jasmine}'`)
    await tapEl(m, prim); await settle(m, 2500)
    const sref = await said(m.getByTestId('move-step-refusal'))
    ok(/assign a member first/i.test(sref) && await step(m).isVisible() && await radio(m, 'log-where', 'Showroom').getAttribute('aria-checked') === 'true', `the server's refusal stays in the foot, the step as typed ("${sref}")`)
    for (const r of jasmineMembers) sql(`insert into lead_assignees (${Object.keys(r).join(',')}) values (${Object.values(r).map(lit).join(',')})`)
    await tapEl(m, prim)
    ok(await waitSnack(m, /Moved to Met/) && stageOf(L.jasmine) === 'Met', 'Save & move once the rule is met: Jasmine is in Met')
    // Q-02: Contacted moves with no screenshot
    await go(m, `/leads/${L.wei}`)
    await tapEl(m, primary(m)); await step(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    ok((await m.getByTestId('move-step-bar').innerText()).includes('step 2 of 5') && await step(m).getByTestId('log-channel').getByRole('radio', { checked: true }).count() === 0, 'Contacted: nothing chosen for the reader (the window asks how)')
    await tapEl(m, radio(m, 'log-channel', 'WhatsApp')); await tapEl(m, radio(m, 'log-outcome', 'Connected')); await settle(m, 200)
    await tapEl(m, m.getByTestId('move-step-primary')); await settle(m, 1200)
    const skip = m.getByRole('dialog', { name: 'Suggested tasks' }).getByRole('button', { name: 'Move without tasks' })
    ok(await skip.isVisible() && (await box(skip)).h >= 48, 'the window’s journey: Suggested tasks, its foot at 48 (B-23)')
    await tapEl(m, skip)
    ok(await waitSnack(m, /Moved to Contacted/) && stageOf(L.wei) === 'Contacted' && (lastLog(L.wei, 'Contacted')?.logs?.[0]?.files?.length ?? -1) === 0, 'Q-02: the first contact moved with no screenshot')
    // B-02: a member row is its label; B-09: a completed log reads as a summary
    await go(m, `/leads/${L.marcus}`)
    await tapEl(m, stageRow(m, 'New')); await step(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    const rows = step(m).getByTestId('move-new-members').getByRole('checkbox')
    const row0 = rows.nth(1), on0 = await row0.getAttribute('aria-checked')
    const rb = await box(row0)
    await m.touchscreen.tap(rb.x + 90, rb.cy); await settle(m, 300)   // on the name, not the box
    ok(rb.h >= 64 && (await row0.getAttribute('aria-checked')) !== on0, `B-02: a tap on the member’s name ticks the row (${Math.round(rb.h)} tall)`)
    await m.keyboard.press('Escape'); await settle(m, 700)
    await go(m, `/leads/${L.priya}`)
    await tapEl(m, stageRow(m, 'Contacted')); await step(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    const summary = step(m).getByTestId('move-log-summary-0')
    ok(await summary.isVisible() && /·/.test(await summary.innerText()) && (await m.getByTestId('move-step-primary').innerText()).trim() === 'Close', `B-09: the completed log reads as a summary card ("${(await summary.innerText()).split('\n').slice(0, 3).join(' / ')}"), the foot Close`)
    await shot(m, '07-m390-summary')
    await tapEl(m, step(m).getByTestId('move-log-edit-0')); await settle(m, 500)
    ok(await step(m).getByTestId('move-log-0').isVisible() && (await m.getByTestId('move-step-primary').innerText()).trim() === 'Save changes', '…its Edit opens the fields, the foot Save changes')
    await m.keyboard.press('Escape'); await settle(m, 700)

    // ── 6 · Won as a checklist ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · P-04 · Q-03 · B-11 · B-12 at 390 — Won as a checklist (Vivien)')
    await go(m, `/leads/${L.vivien}`)
    await tapEl(m, primary(m)); await step(m).waitFor({ timeout: 8000 }); await settle(m, 1600)
    ok((await m.getByTestId('move-step-bar').innerText()).replace(/\s+/g, ' ').includes('Move to Won Vivien Lee · step 5 of 5') && await m.getByTestId('won-checklist').isVisible(), 'the bar "Move to Won · step 5 of 5" over the checklist')
    ok((await m.getByTestId('move-step-primary').innerText()).trim() === 'Create project', 'the foot: Create project')
    const qRow = m.getByTestId('won-row-quote')
    await tapEl(m, qRow.getByRole('tab', { name: 'Upload' })); await settle(m, 500)
    ok(await qRow.getByTestId('won-quote-photo').isVisible(), 'Q-03: the signed quote takes Take a photo · Choose a file')
    await qRow.getByTestId('won-quote-photo-input').setInputFiles(jpegPath); await settle(m, 3500)
    ok(await qRow.locator('img[data-testid="won-photo-thumb"]').count() === 1 && /Quote_VivienL_signed\.jpg/.test(await said(qRow)), 'the photo kept as the quote’s copy — its picture on the row, under the lead’s name')
    const amount = qRow.getByRole('textbox', { name: /Quote amount/ })
    await tapEl(m, amount); await m.keyboard.type('68176', { delay: 40 }); await settle(m, 400)
    ok(await amount.isVisible() && await amount.inputValue() === '68,176', `the amount typed digit by digit — the row stays open under the finger (${await amount.inputValue().catch(() => 'gone')})`)
    ok(/Quote_VivienL_signed\.jpg · S\$68,176/.test(await said(qRow)) && (await qRow.getAttribute('data-done')) !== null, 'the row reads done: the photo · the amount')
    const payRow = m.getByTestId('won-row-payments')
    ok(/10 · 30 · 30 · 30 — the studio’s usual/.test(await payRow.innerText()), `B-12: an uploaded quote starts at the studio’s usual split, not 0% ("${(await payRow.innerText()).split('\n')[1] ?? ''}")`)
    const cRow = m.getByTestId('won-row-contract')
    if (!(await cRow.getByTestId('won-take-photo').isVisible().catch(() => false))) { await tapEl(m, cRow.locator('button').first()); await settle(m, 400) }
    if (!(await cRow.getByTestId('won-take-photo').isVisible().catch(() => false))) { await tapEl(m, cRow.getByRole('tab', { name: 'Upload' })); await settle(m, 400) }
    await cRow.getByTestId('won-take-photo-input').setInputFiles(jpegPath); await settle(m, 3500)
    ok(await m.getByTestId('won-row-type').getByRole('radio', { name: 'Whole-home renovation' }).getAttribute('aria-checked') === 'true', 'the project type as chips, the default set')
    await shot(m, '08-m390-won-checklist')
    await tapEl(m, m.getByTestId('move-step-primary'))
    let projected = false
    try { await m.waitForURL(/\/projects\/[^/?]+\?created=1/, { timeout: 20000 }); projected = true } catch {}
    ok(projected && stageOf(L.vivien) === 'Won', 'Create project → the new project; Vivien is Won')
    const qFile = json(`select kind, name from lead_files where lead_id = '${L.vivien}' and name like 'Signed quote — %' and deleted_at is null`)[0]
    ok(!!qFile && qFile.kind === 'image' && /\.jpg$/.test(qFile.name), `Q-03: the signed quote’s photo kept as a picture in Files ("${qFile?.name}")`)
    const split = JSON.parse(sql(`select payment_template from projects where lead_id = '${L.vivien}'`) || 'null')
    ok(split && JSON.stringify(split.rows.map((r) => r.pct)) === '[10,30,30,30]', 'the project’s agreed split is the studio’s usual')

    // ── 7 · On Hold and Lost as one sheet ────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · B-13 at 390 — On Hold and Lost share one sheet')
    const pickStage = async (lead, stage) => { await go(m, `/leads/${lead}?move=${stage === 'On Hold' ? 'on-hold' : 'lost'}`, 1800) }
    await pickStage(L.priya, 'On Hold')
    const hold = m.getByRole('dialog', { name: /Put on hold/ })
    ok(await hold.isVisible() && /Priya Nair/.test(await hold.innerText()) && await m.getByTestId('park-reasons').getByRole('radio').count() >= 2, 'On Hold: a sheet naming Priya, the studio’s reasons as chips')
    const hsave = m.getByTestId('hold-sheet-save'), hb = await box(hsave)
    ok(hb.h >= 48 && hb.w >= 300 && await hitsSelf(hsave), `one Save & move across the foot at 48, nothing over it (${Math.round(hb.w)}×${Math.round(hb.h)})`)
    await tapEl(m, m.getByTestId('park-reasons').getByRole('radio').first()); await tapEl(m, radio(m, 'hold-durations', '3 months')); await settle(m, 200)
    await shot(m, '09-m390-hold')
    await tapEl(m, hsave)
    ok(await waitSnack(m, /Priya Nair is on hold/) && stageOf(L.priya) === 'On Hold', 'Save & move: Priya is On Hold, Undo offered')
    await tapEl(m, snackBars(m).first().getByRole('button', { name: 'Undo' })); await settle(m, 1500)
    ok(stageOf(L.priya) === 'Contacted', 'Undo puts her back in Contacted')
    await pickStage(L.gavin, 'Lost')
    const lost = m.getByRole('dialog', { name: /Mark as lost/ })
    ok(await lost.isVisible() && /Gavin See/.test(await lost.innerText()) && await m.getByTestId('lost-sheet-save').isVisible(), 'Lost: the same sheet — "Mark as lost", the lead’s name, Save & move')
    await tapEl(m, m.getByTestId('park-reasons').getByRole('radio').first()); await settle(m, 200)
    await tapEl(m, m.getByTestId('lost-sheet-save'))
    ok(await waitSnack(m, /Moved to Lost/) && stageOf(L.gavin) === 'Lost', 'Save & move: Gavin is Lost, Undo offered')
    await tapEl(m, snackBars(m).first().getByRole('button', { name: 'Undo' })); await settle(m, 1500)
    ok(stageOf(L.gavin) === 'Contacted', 'Undo puts him back')

    // ── 8 · one snackbar at a time ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · B-14 · B-15 at 390 — one snackbar at a time; a sheet withdraws the refusal')
    await go(m, `/leads/${L.cheryl}`)
    await tapEl(m, stageRow(m, 'Won')); await settle(m, 700)
    const refusalSaid = await snackText(m)
    ok(/first/.test(refusalSaid), `a refusal said: "${refusalSaid}"`)
    await tapEl(m, m.getByRole('tab', { name: /^Notes/ }).locator('visible=true')); await settle(m, 1200)   // the tab strip — the page, not a navigation away
    await tapEl(m, m.getByRole('button', { name: /^New/ }).locator('visible=true')); await settle(m, 600)
    await tapEl(m, m.getByRole('menuitem', { name: /Contact Log/i })); await sheet(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    ok(await snackBars(m).count() === 0, 'B-14: the sheet that opens next withdraws it — nothing rests on its rows')
    await m.keyboard.press('Escape'); await settle(m, 500)
    await pickStage(L.cheryl, 'On Hold')
    await tapEl(m, m.getByTestId('park-reasons').getByRole('radio').first()); await tapEl(m, m.getByTestId('hold-sheet-save'))
    ok(await waitSnack(m, /Cheryl Lim is on hold/), 'the hold’s snackbar, with its Undo')
    await settle(m, 1200)   // the page reads the hold (no reload — the snackbar stays)
    await tapEl(m, primary(m)); await settle(m, 900)   // Resume at Contacted
    const confirm = m.getByRole('dialog').filter({ hasText: /Resume at/ }).getByRole('button', { name: 'Resume' })
    await tapEl(m, confirm); await waitSnack(m, /Moved to Contacted/)
    ok(await snackBars(m).count() === 1 && /Moved to Contacted/.test(await snackText(m)), `B-15: one bar, the newest move’s ("${await snackText(m)}")`)
    await shot(m, '10-m390-one-snackbar')
    for (let i = 0; i < 3; i++) await m.evaluate(() => document.querySelector('[data-om-snackbar] button[aria-label="Dismiss"]')?.click()).catch(() => {})

    // ── 11 · 320 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · 320 — no sideways scroll')
    await m.setViewportSize({ width: 320, height: 640 }); await settle(m, 400)
    await openLog(m, L.marcus, 'whatsapp')
    ok(await sideways(m) <= 0 && (await box(sheet(m))).r <= 320, 'the log sheet fits 320')
    await m.keyboard.press('Escape'); await settle(m, 500)
    await go(m, `/leads/${L.jonathan}`); await tapEl(m, primary(m)); await step(m).waitFor({ timeout: 8000 }); await settle(m, 900)
    ok(await sideways(m) <= 0 && (await m.evaluate(() => [...document.querySelectorAll('[data-testid="move-step-screen"] *')].filter((el) => el.getBoundingClientRect().right > 321).length)) === 0, 'the step screen fits 320')
    await M.close()

    // ── 9 · tablets ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · 768 upright and 1024 sideways (touch)')
    const T = await touchCtx(768, 1024); const t = await page(T, '768')
    await openLog(t, L.marcus, 'call')
    const sb = await box(t.locator('[role="dialog"]').filter({ has: t.getByTestId('log-sheet') }))
    ok(Math.round(sb.bt) === 1024 && sb.w >= 760, `768 upright: the log is a bottom sheet (${Math.round(sb.w)} wide, to the bottom)`)
    await t.keyboard.press('Escape'); await settle(t, 600)
    await go(t, `/leads/${L.jonathan}`); await tapEl(t, primary(t)); await step(t).waitFor({ timeout: 8000 }); await settle(t, 900)
    const col = await box(step(t).locator('[class*="stepColumn"]').first())
    ok(col.w <= 672 && Math.abs(col.cx - 384) <= 2 && await step(t).getByRole('tablist').count() === 0, `768 upright: one step per screen, the column centred at ≤672 (${Math.round(col.w)})`)
    await shot(t, '11-t768-step')
    await T.close()
    const S = await touchCtx(1024, 768); const s = await page(S, '1024')
    await go(s, `/leads/${L.jonathan}`)
    await tapEl(s, primary(s)); await settle(s, 1200)
    const win = s.getByRole('dialog', { name: 'Move stage' })
    ok(await win.isVisible() && await win.getByRole('tablist').count() === 1 && await s.getByTestId('move-step-screen').count() === 0, '1024 sideways: the centred window with its rail, as it was')
    await s.keyboard.press('Escape'); await settle(s, 600)
    /* (2026-10-23, the Lead screen reverted — REG-2734) held sideways a tablet's Notes tab is the desk's: New › Contact Log opens the pane, not the sheet */
    await go(s, `/leads/${L.jonathan}/notes`)
    await tapEl(s, s.getByRole('button', { name: /^New/ }).locator('visible=true')); await settle(s, 600)
    await tapEl(s, s.getByRole('menuitem', { name: /Contact Log/i })); await settle(s, 1200)
    ok(await s.getByTestId('log-sheet').count() === 0 && await s.getByRole('button', { name: 'Auto Fill' }).locator('visible=true').count() >= 1, '…and Notes › New › Contact Log keeps the pane, as on the desk')
    await shot(s, '12-t1024-notes-pane')
    await S.close()

    // ── 10 · the desk ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · 1440 (a mouse) — the desk as it was, Q-02’s one change')
    const DK = await mouseCtx(1440, 1024); const d = await page(DK, '1440')
    await go(d, `/leads/${L.jonathan}`)
    await d.locator('[data-testid="header-primary"] button').click(); await settle(d, 1200)
    const dwin = d.getByRole('dialog', { name: 'Move stage' })
    ok(await dwin.getByRole('tablist').count() === 1 && await dwin.getByRole('button', { name: 'Cancel' }).isVisible() && await dwin.getByRole('button', { name: 'Save', exact: true }).isVisible() && await d.getByTestId('move-step-screen').count() === 0, 'the window keeps its rail and Cancel · Save')
    await d.keyboard.press('Escape'); await settle(d, 600)
    await go(d, `/leads/${L.marcus}`)
    await d.locator('[data-testid="header-primary"] button').click(); await settle(d, 1200)
    const attachLabel = await d.getByRole('dialog', { name: 'Move stage' }).getByText(/^Add a screenshot/).first().innerText()   // (the calm UI build 2026-10-27, a deliberate change) — W-486
    ok(attachLabel === 'Add a screenshot (optional)', `Q-02 at every width: "${attachLabel}" (no *)`)
    await d.keyboard.press('Escape'); await settle(d, 600)
    await go(d, `/leads/${L.marcus}/notes`)
    await d.getByRole('button', { name: /^New/ }).first().click(); await settle(d, 500)
    await d.getByRole('menuitem', { name: /Contact Log/i }).first().click(); await settle(d, 1000)
    ok(await d.getByTestId('log-sheet').count() === 0 && await d.getByRole('button', { name: 'Auto Fill' }).first().isVisible(), 'Notes › New › Contact Log keeps the pane on the desk — no log sheet')
    await DK.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    try { fs.unlinkSync(jpegPath) } catch {}
    await b.close()
  }
  console.log(`\nerrors: ${errors.length}`); for (const e of errors) console.log('  !', e)
  ok(errors.length === 0, 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
