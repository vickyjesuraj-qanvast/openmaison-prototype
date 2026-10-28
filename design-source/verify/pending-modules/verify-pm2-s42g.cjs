// S42G · a meeting held moves its lead the way the stage policy allows — the carried note from S42E's outcome (s42/carried-notes.md › "From
// S42E's outcome"): S23's meeting room offered "Move to Met" after a held meeting, which the default one-stage-at-a-time rule (Linear, REG-111…)
// refuses for a lead still in New ("Complete Contacted first"). Each item asserted as the rule it sets (never a count another step can change):
//  - G-01  every meeting door asks the studio's stage rule (`heldMeetingStep`, lib/meetings/next-step.ts): the meeting page's banner, its ghost,
//          the snackbar after a write-up (the Meetings tab's and the page's) — Contacted for a New lead under Linear (the meeting its first
//          contact), Met where the rule lets it go there; the press lands on that step with the meeting carried, never on a refusal
//  - G-02  Flexible unchanged: a New lead's meeting offers Met, the meeting as the Met log
//  - G-03  a lead on hold resumes at Met ("Resume at Met" → the house's "Resume at Met?" confirm → the Met step with the meeting); a lost lead is
//          offered nothing (Met lies past where it stopped)
//  - G-04  a meeting IS the Met log wherever Met is reached: after Contacted, the Overview's own "Move to Met" (no `?meeting=`) carries the held
//          meeting into the Met step, and saving it files the meeting there — the meeting page's offer goes
//  - G-05  a lead in Contacted that was met reads "Met already · log the meeting" (Met follows), never "book the meet"
//  - widths: the meeting page at 390 touch — the banner and its press, no sideways scroll against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s42g.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42g')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s42g-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const linear = () => sql(`update settings set value = '"linear"' where key = 'stage_movement'`)
const flexible = () => sql(`update settings set value = '"flexible"' where key = 'stage_movement'`)

/* the demo's records: a New lead with a held meeting (each of these is New with one member and one meeting written up), a lead on hold from
   Contacted, a lost one from Contacted — found by their state, never by a count */
const leadNamed = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null and direct = 0 limit 1`)
const heldOn = (leadId) => sql(`select id from meetings where lead_id = '${leadId}' and status = 'held' and deleted_at is null order by starts_at desc limit 1`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const move0 = sql(`select value from settings where key = 'stage_movement'`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await snackText(p); if (re.test(s)) return s; await p.waitForTimeout(200) } return snackText(p) }
  const snackAction = (p, name) => p.locator('[data-om-snackbar]').getByRole('button', { name }).last()
  const menuItem = (p, name) => p.locator('[role="menu"] [role="menuitem"], [role="menu"] button, [role="dialog"] [role="menuitem"]').filter({ hasText: name }).first()
  const win = (p) => p.getByRole('dialog', { name: 'Move stage' })
  /* (leads on the move, a deliberate change of this rule — Leads L2, P-04) on a phone the window is one step per screen with no rail: the step is
     the bar's title ("Move to Contacted") */
  const winStep = async (p) => ((await win(p).locator('[role="tablist"][aria-label="Stages"] [role="tab"][aria-selected="true"]').innerText().catch(() => ''))
    || (await p.getByTestId('move-step-bar').locator('h1').innerText().catch(() => ''))).replace(/\s+/g, ' ').trim()
  /** the meeting page's offer: its step, whether it resumes, its words and its press */
  const offerOf = async (p) => {
    const o = p.getByTestId('room-step-offer')
    if (!(await o.count())) return null
    return { step: await o.getAttribute('data-step'), resume: (await o.getAttribute('data-resume')) !== null, words: await text(o), press: await text(o.getByTestId('room-move-step')) }
  }
  /** write a meeting up from notes on the lead's Meetings tab (the house dialog); the snackbar it answers with */
  const writeUp = async (p, leadId, notes) => {
    await go(p, `/leads/${leadId}/meetings`, 1500)
    const d = p.getByTestId('writeup-dialog')
    if (await p.getByTestId('meetings-new').isVisible().catch(() => false)) {
      await p.getByTestId('meetings-new').click(); await settle(p, 400)
      await menuItem(p, 'Write up a meeting').click(); await settle(p, 700)
    } else {
      await p.getByTestId('meetings-empty').getByRole('button', { name: 'Write one up from notes' }).click(); await settle(p, 700)
    }
    await d.getByTestId('writeup-notes').locator('textarea').first().fill(notes).catch(async () => { await d.getByTestId('writeup-notes').fill(notes) })
    await p.getByTestId('writeup-save').click()
    return waitSnack(p, /Summary made/, 15000)   // (the calm UI build 2026-10-27, a deliberate change — W-127) "summary", not "brief"
  }
  const refused = async (p) => /Complete Contacted first|Complete .* first|Resume at .* first|Assign a member first/.test(await snackText(p))

  try {
    as('dane'); linear()
    const KELVIN = leadNamed('Kelvin Goh'), NUR = leadNamed('Nur Aisyah'), OLIVIA = leadNamed('Olivia Martinez'), MEILING = leadNamed('Mei Ling Tan'), DAVID = leadNamed('David Koh')
    const KM = heldOn(KELVIN), NM = heldOn(NUR)
    ok(sql(`select stage from leads where id = '${KELVIN}'`) === 'New' && !!KM && sql(`select stage from leads where id = '${MEILING}'`) === 'On Hold' && sql(`select stage from leads where id = '${DAVID}'`) === 'Lost',
      'the demo holds a New lead with a meeting held (Kelvin Goh), a lead on hold (Mei Ling Tan) and a lost one (David Koh)')

    // ── 1 · G-01 · the meeting page on a New lead under one stage at a time: Contacted, never a refused Met ────────────────────────────────
    console.log('1 · A New lead’s held meeting offers Contacted (Linear)')
    {
      const ctx = await desk(); const p = await page(ctx, 'kelvin')
      await go(p, `/meetings/${KM}`, 1800)
      const o = await offerOf(p)
      ok(o && o.step === 'contacted' && !o.resume && /Kelvin’s lead is still New/.test(o.words) && /first contact — Met comes next/.test(o.words) && o.press === 'Move to Contacted',
        'the banner: "Kelvin’s lead is still New" — Move to Contacted, the meeting its first contact (G-01)', o)
      ok(!/Move to Met/.test(await text(p.locator('main'))), '…no "Move to Met" anywhere on the page')
      await shot(p, '01-room-new-linear-1440')
      await p.getByTestId('room-move-step').click()
      await p.waitForURL(new RegExp(`/leads/${KELVIN}`), { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      const wt = await text(win(p))
      const picked = async (g) => (await win(p).getByRole('radiogroup', { name: g, exact: true }).getByRole('radio', { checked: true }).allInnerTexts()).join('|').trim()
      ok(await win(p).isVisible() && /Contacted$/.test(await winStep(p)) && (await picked('How')) === 'Visit' && (await picked('How it went')) === 'Connected', '…the press lands on the Move stage window at Contacted, the meeting as its first contact log (Visit — stored In person — Connected; the calm UI build 2026-10-27, a deliberate change)', { step: await winStep(p), wt: wt.slice(0, 200) })
      ok(!(await refused(p)), '…and never on a refusal ("Complete Contacted first")', await snackText(p))
      await shot(p, '02-window-contacted-1440')
      ok(!/[?&](move|meeting)=/.test(p.url()), '…the hand-off leaves the address', p.url())
      await ctx.close()
    }

    // ── 2 · G-01 · the Meetings tab's write-up on a New lead: the snackbar offers Contacted ─────────────────────────────────────────────────
    console.log('2 · A write-up on a New lead offers Contacted')
    {
      const ctx = await desk(); const p = await page(ctx, 'olivia')
      const s = await writeUp(p, OLIVIA, 'Client: We would like a Scandinavian look, budget around 45k.\nClient: The kitchen and the living room first.')
      ok(/Summary made from your notes/.test(s) && /Move to Contacted/.test(s) && !/Move to Met/.test(s), 'Brief made — the snackbar offers "Move to Contacted", not a Met the rule refuses (G-01)', s)
      await shot(p, '03-writeup-snackbar-1440')
      await snackAction(p, 'Move to Contacted').click()
      await p.waitForURL(new RegExp(`/leads/${OLIVIA}\\b`), { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      /* (REG-2655, a deliberate change of this rule — Leads on the move, B-01) every forward move asks the owner rule first: Olivia has no
         member yet, so the press lands on her lead with "Assign a member first" and its Assign — the window no longer opens to lose a typed log */
      ok(!(await win(p).isVisible()) && /Assign a member first/.test(await snackText(p)) && await snackAction(p, 'Assign').count() === 1, '…the press lands on Olivia with the owner rule first — "Assign a member first" with its Assign (she has no member yet)', await snackText(p))
      await p.keyboard.press('Escape'); await settle(p, 500)
      ok(sql(`select stage from leads where id = '${OLIVIA}'`) === 'New', '…nothing moves without the window’s Save')
      const om = heldOn(OLIVIA)
      await go(p, `/meetings/${om}`, 1600)
      const o = await offerOf(p)
      ok(o && o.step === 'contacted' && o.press === 'Move to Contacted', 'its meeting page says the same', o)
      await ctx.close()
    }

    // ── 3 · G-01 · G-04 · G-05 · the whole path: Contacted with the meeting, then Met carries it from the Overview's own press ───────────────
    console.log('3 · Contacted, then Met — the meeting is the Met log wherever Met is reached')
    {
      /* every contact log carries what proves it (REG-324 — a visit leaves photos): the meeting holds a photo from the visit, so its log does too */
      const PHOTO = 'pm2-s42g-visit-photo'
      sql(`insert into lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at, shown_to_client_at)
           select '${PHOTO}', '${KELVIN}', kind, 'Site visit.jpg', thumb, created_at, NULL, owner_id, size_bytes, mime, updated_at, NULL, NULL from lead_files where kind = 'image' and deleted_at is null limit 1`)
      sql(`update meetings set file_ids = '["${PHOTO}"]' where id = '${KM}'`)
      const ctx = await desk(); const p = await page(ctx, 'kelvin-path')
      await go(p, `/meetings/${KM}`, 1600)
      await p.getByTestId('room-move-step').click()
      await p.waitForURL(new RegExp(`/leads/${KELVIN}`), { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      await win(p).getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 1200)
      const sug = p.getByRole('dialog', { name: 'Suggested tasks' })
      if (await sug.isVisible().catch(() => false)) { await sug.getByRole('button', { name: 'Move without tasks' }).click(); await settle(p, 1500) }
      await waitSnack(p, /Contacted/, 6000)
      ok(sql(`select stage from leads where id = '${KELVIN}'`) === 'Contacted', 'Save moves Kelvin to Contacted — the meeting his first contact log')
      const contactLog = json(`select payload from stage_logs where lead_id = '${KELVIN}' and to_stage = 'Contacted' order by created_at desc limit 1`)[0]
      const logs = contactLog ? (JSON.parse(contactLog.payload).logs || []) : []
      ok(logs.some((l) => l.channel === 'In person' && l.outcome === 'Connected'), '…its Contacted log is the meeting: In person, Connected', logs.slice(0, 2))
      ok(Number(sql(`select count(*) from stage_logs where lead_id = '${KELVIN}' and to_stage = 'Met'`)) === 0, '…and no Met log yet — Met comes next')
      /* G-05: the brief — met already, Met follows; never "book the meet" */
      await go(p, `/leads/${KELVIN}`, 2000)
      const brief = p.locator('section[aria-label="Maison AI brief"]')
      const bt = await text(brief)
      /* (the calm UI build 2026-10-27, a deliberate change — 2-01) no CAPS tag on the brief: the record's fact and the move say it */
      ok(/Met in person on/.test(bt) && /Move the lead to Met/.test(bt) && /becomes its Met log/.test(bt) && !/book the meet|Propose two slots/i.test(bt), 'the Contacted brief: met already — "Move the lead to Met", not "book the meet" (G-05)', bt.slice(0, 260))
      await shot(p, '04-contacted-brief-1440')
      await brief.getByRole('button', { name: 'Log the meeting' }).first().click(); await settle(p, 1600)
      ok(await win(p).isVisible() && /Met$/.test(await winStep(p)) && /In person/.test(await text(win(p))), '…Log the meeting opens the window at Met with the meeting as its log', await winStep(p))
      await p.keyboard.press('Escape'); await settle(p, 600)
      /* the meeting page now offers Met */
      await go(p, `/meetings/${KM}`, 1600)
      const o = await offerOf(p)
      ok(o && o.step === 'met' && o.press === 'Move to Met' && /isn’t in Kelvin’s Met step yet/.test(o.words), 'the meeting page now offers Met — the next step the rule allows', o)
      /* G-04 from the listing: the stage menu's Met opens the same window, the held meeting carried */
      const summary0 = sql(`select json_extract(brief_json, '$.summary') from meetings where id = '${KM}'`)
      await go(p, '/leads?view=table', 2000)
      const cell = p.locator(`[data-kb-row][data-kb-id="${KELVIN}"] [data-kb="move-stage"]`).first()
      if (await cell.count()) {
        await cell.scrollIntoViewIfNeeded(); await cell.click(); await settle(p, 600)
        await p.locator('[role="menu"]').last().getByText('Met', { exact: true }).first().click(); await settle(p, 2000)
        const lr = await win(p).locator('textarea').first().inputValue().catch(() => '')
        ok(await win(p).isVisible() && /Met$/.test(await winStep(p)) && !!summary0 && lr.trim() === summary0.trim(), 'the listing’s stage menu › Met opens the Met step with the held meeting as its log (G-04)', { step: await winStep(p), lr: lr.slice(0, 60) })
        await p.keyboard.press('Escape'); await settle(p, 600)
      } else ok(false, 'Kelvin’s row is on the listing')
      ok(sql(`select stage from leads where id = '${KELVIN}'`) === 'Contacted', '…closing it leaves Kelvin in Contacted')
      /* G-04: the Overview's own "Move to Met" (no ?meeting=) carries the held meeting into the Met step */
      await go(p, `/leads/${KELVIN}`, 2000)
      await p.getByTestId('header-primary').getByRole('button', { name: 'Move to Met' }).click(); await settle(p, 2000)
      const when = sql(`select strftime('%d/%m/%Y', starts_at / 1000, 'unixepoch', 'localtime') from meetings where id = '${KM}'`)
      await settle(p, 800)   // the carry lands as the window's documents do
      const mt = await text(win(p))
      const summary = sql(`select json_extract(brief_json, '$.summary') from meetings where id = '${KM}'`)
      const remarks = await win(p).locator('textarea').first().inputValue().catch(() => '')
      ok(await win(p).isVisible() && /Met$/.test(await winStep(p)) && /In person/.test(mt) && !!summary && remarks.trim() === summary.trim() && /Site vi/.test(mt),
        'the header’s Move to Met opens the Met step with the held meeting already its log — where, the brief’s summary, its photo (G-04)', { remarks: remarks.slice(0, 80), summary: summary.slice(0, 80) })
      await shot(p, '05-met-carried-1440')
      await win(p).getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 1800)
      const sug2 = p.getByRole('dialog', { name: 'Suggested tasks' })
      if (await sug2.isVisible().catch(() => false)) { await sug2.getByRole('button', { name: 'Move without tasks' }).click(); await settle(p, 1500) }
      await settle(p, 1200)
      ok(sql(`select stage from leads where id = '${KELVIN}'`) === 'Met', '…Save moves Kelvin to Met')
      const metHeld = Number(sql(`select count(*) from stage_logs s, json_each(s.payload, '$.meetings') j where s.lead_id = '${KELVIN}' and s.to_stage = 'Met' and json_extract(j.value, '$.meetingId') = '${KM}'`))
      ok(metHeld === 1, '…and the meeting IS the Met log — its entry holds the meeting, once', { metHeld, when })
      await go(p, `/meetings/${KM}`, 1600)
      ok(!(await offerOf(p)), 'the meeting page offers nothing more — the Met step holds it')
      await ctx.close()
    }

    // ── 4 · G-02 · Flexible unchanged: Met, the meeting as the Met log ──────────────────────────────────────────────────────────────────────
    console.log('4 · Flexible: a New lead’s meeting offers Met')
    {
      flexible()
      const ctx = await desk(); const p = await page(ctx, 'nur-flex')
      await go(p, `/meetings/${NM}`, 1800)
      const o = await offerOf(p)
      ok(o && o.step === 'met' && !o.resume && o.press === 'Move to Met', 'under Flexible the New lead’s meeting offers Met, as before (G-02)', o)
      await p.getByTestId('room-move-step').click()
      await p.waitForURL(new RegExp(`/leads/${NUR}`), { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      ok(await win(p).isVisible() && /Met$/.test(await winStep(p)) && /In person/.test(await text(win(p))) && !(await refused(p)), '…the press opens the Met step with the meeting as its log')
      await p.keyboard.press('Escape'); await settle(p, 500)
      ok(sql(`select stage from leads where id = '${NUR}'`) === 'New', '…nothing moves without its Save')
      linear()
      await go(p, `/meetings/${NM}`, 1600)
      const o2 = await offerOf(p)
      ok(o2 && o2.step === 'contacted', 'back under one stage at a time, the same meeting offers Contacted', o2)
      await ctx.close()
    }

    // ── 5 · G-03 · a lead on hold resumes at Met; a lost lead is offered nothing ─────────────────────────────────────────────────────────────
    console.log('5 · On hold → Resume at Met; lost → nothing')
    {
      const ctx = await desk(); const p = await page(ctx, 'parked')
      const s = await writeUp(p, MEILING, 'Client: We are ready to start again — the budget is now around 70k.')
      ok(/Summary made from your notes/.test(s) && /Resume at Met/.test(s), 'a write-up on a lead on hold offers "Resume at Met" (G-03)', s)
      await snackAction(p, 'Resume at Met').click()
      await p.waitForURL(new RegExp(`/leads/${MEILING}`), { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      const conf = p.getByRole('alertdialog').or(p.getByRole('dialog')).filter({ hasText: 'Resume at Met?' })
      ok(await conf.isVisible().catch(() => false), '…the press lands on the house’s "Resume at Met?" confirm — never a refusal', await snackText(p))
      await shot(p, '06-resume-confirm-1440')
      await conf.getByRole('button', { name: 'Resume' }).click(); await settle(p, 1500)
      ok(await win(p).isVisible() && /Met$/.test(await winStep(p)) && /In person/.test(await text(win(p))), '…Resume opens the Met step with the meeting as its log')
      await p.keyboard.press('Escape'); await settle(p, 500)
      ok(sql(`select stage from leads where id = '${MEILING}'`) === 'On Hold', '…closing it leaves the lead on hold')
      const mm = heldOn(MEILING)
      await go(p, `/meetings/${mm}`, 1600)
      const o = await offerOf(p)
      ok(o && o.step === 'met' && o.resume && o.press === 'Resume at Met' && /on hold — resuming it at Met/.test(o.words), 'its meeting page: "Resume at Met", the line says the lead is on hold', o)
      await shot(p, '07-room-on-hold-1440')
      /* lost: Met lies past where it stopped — the rule refuses it, so nothing is offered */
      const s2 = await writeUp(p, DAVID, 'Client: Just checking in on prices, nothing planned.')
      ok(/Summary made from your notes/.test(s2) && !/Move to|Resume at/.test(s2), 'a write-up on a lost lead offers no stage (Open instead)', s2)
      const dm = heldOn(DAVID)
      await go(p, `/meetings/${dm}`, 1600)
      ok(!(await offerOf(p)), '…and its meeting page has no stage offer')
      await ctx.close()
    }

    // ── 6 · the ghost draws the page's own offer; 390 touch ────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The ghost and the phone')
    {
      /* the held reveal: PageReveal's ghost over the page (its first paint faked days away) — the ghost's banner says the page's words */
      const c = await desk()
      await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const p = await page(c, 'ghost')
      await p.goto(BASE + `/meetings/${NM}`, { waitUntil: 'load' }).catch(() => {}); await settle(p, 2600)
      const g = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((x) => /__reveal$/.test(x)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((x) => /__ghost$/.test(x)))
        const banner = ghost && ghost.querySelector('[class*="__bannerRow"]')
        const pageBanner = document.querySelector('[data-testid="room-step-offer"]')
        return { ghost: !!ghost, g: banner ? banner.textContent.replace(/\s+/g, ' ').trim() : null, page: pageBanner ? pageBanner.querySelector('[class*="__bannerText"]').textContent.replace(/\s+/g, ' ').trim() : null }
      })
      ok(g.ghost && !!g.g && !!g.page && g.g === g.page, 'the meeting page’s ghost draws the banner in the page’s own words (Contacted)', g)
      await c.close()
      const ctx = await phoneCtx(); const q = await page(ctx, 'phone')
      await go(q, `/meetings/${NM}`, 1800)
      const o = await offerOf(q)
      ok(o && o.step === 'contacted' && await q.getByTestId('room-move-step').isVisible(), '390 touch: the banner and its press', o)
      const lay = await q.evaluate(() => { const row = document.querySelector('[data-testid="room-step-offer"]'); const t = row.querySelector('[class*="__bannerText"]').getBoundingClientRect(), bt = row.querySelector('[data-testid="room-move-step"]').getBoundingClientRect(), r = row.getBoundingClientRect(); return { textW: Math.round(t.width), rowW: Math.round(r.width), below: bt.top >= t.bottom - 1 } })
      ok(lay.below && lay.textW >= lay.rowW - 40, '…the press wraps under the words — they keep the banner’s width, never a narrow column', lay)
      ok(await sideways(q) <= 0, '…no sideways scroll at 390', await sideways(q))
      await shot(q, '08-room-offer-390')
      await q.getByTestId('room-move-step').tap(); await q.waitForURL(new RegExp(`/leads/${NUR}`), { timeout: 10000 }).catch(() => {}); await settle(q, 2400)
      ok(await win(q).isVisible() && /Contacted/.test(await winStep(q)) && !(await refused(q)), '…the press opens the window at Contacted on the phone too', await winStep(q))
      await shot(q, '09-window-contacted-390')
      await ctx.close()
      const c320 = await phoneCtx(320, 700); const r = await page(c320, '320')
      await go(r, `/meetings/${NM}`, 1800)
      ok(await sideways(r) <= 0, '320: no sideways scroll', await sideways(r))
      await c320.close()
    }

    ok(errors.length === 0, 'no page errors', errors)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped —', String(e && e.stack || e).slice(0, 600))
  } finally {
    await b.close()
    sql(`update settings set value = '${move0.replace(/'/g, "''")}' where key = 'stage_movement'`)
    const changed = putBack()
    const left = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(`  (put back: ${changed.length} tables${left.length ? ` — still different: ${left.join(', ')}` : ''})`)
    console.log(`\n${pass} / ${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
