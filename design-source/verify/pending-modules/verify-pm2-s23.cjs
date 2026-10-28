// Pending modules, step S23 · Meetings and the Meeting Co-Pilot (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// studio:meetings-copilot · held:meetings · api:copilot-objections-competitors — 1.0's /copilot launcher, live session and brief, its analytics,
// settings and objection library; REG-552's hold lifted for this card). Each item asserted as the rule it builds, never another round's count:
//  - one home: a meeting lives on its lead — the lead's Meetings tab (between Notes & Logs and Questionnaire), the project's Client › Meetings,
//    and Tools › Meeting Copilot (/meetings, the tab unpinned, with a Lead column); the tab's count is what waits on you
//  - a meeting held IS the Met log: a Met log no meeting holds lists as itself; one held on a lead past Met joins its Met step; one held before
//    Met offers "Move to Met" (the Move stage window at Met, carrying the meeting)
//  - Plan a meeting: the house form (dates are picked, never typed; the empty date says so), a reminder task due at the meeting for the people
//    going; Cancel takes the reminder with it and Undo puts both back
//  - the invitation: WhatsApp opens on the press with the client's link; the client's page answers "I'll be there" and the studio hears it on
//    the bell; the calendar invite (.ics) is real and never names the platform
//  - the co-pilot: never on without the client told (the consent tick); its price said before Start; 25 AI credits a 10 minutes on a paid plan,
//    each next 10 asked for (the check-in); the tips carry the studio's own answers, the checklist ticks itself, the deal score and the rough
//    estimate read what is said; End makes the brief by rule; the receipt says the minutes and the credits
//  - the brief: Save to the lead (each detail and the follow-up task, with Undo), Share the notes (the client reads the summary and the next
//    steps — never the concerns, the competitors or the score; the estimate only when ticked), Stop sharing, Make a draft quote (no price made up)
//  - Write it up from notes: no credits, the brief made the same way
//  - an in-person next step on a contact log is a planned meeting on the lead
//  - Settings › Meetings: the co-pilot's parts, each on or off with Undo, the deal score's weights at 100%; read-only for a Designer
//  - Reports › Meetings: Owners and Admins; a Designer is told it isn't theirs
//  - Maison AI prepares you for your next meeting from the records; ⌘K finds a meeting; 1.0's old share link answers, never a bare 404
//  - Accounting has no meetings; 390 and 320 with no sideways scroll against screen.width; the ghosts draw the page they stand for; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s23.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s23')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
/** a whole table as INSERT statements — what `finally` puts back exactly */
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

/* the demo's records (repair R140: Kevin's Met log written up; Jonathan's first consultation planned by Alex) */
const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'      // Met · Dane, James, Michelle
const JONATHAN = '7633b5fe-6d14-4d03-811b-83825ef185c6'   // Contacted · Alex
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'     // New · no member, no meeting
const KM = sql(`select id from meetings where lead_id = '${KEVIN}' and source = 'notes' and deleted_at is null limit 1`)
const JM = sql(`select id from meetings where lead_id = '${JONATHAN}' and status = 'planned' and deleted_at is null limit 1`)
const PROJECT = sql(`select id from projects where number = 'P-2026-001'`)
const WHOLE = ['meetings', 'copilot_objection_log', 'lead_tasks', 'task_assignees', 'lead_events', 'notifications', 'notification_outbox', 'credit_ledger', 'studio_credit_balances', 'settings', 'maison_questions', 'stage_logs', 'leads', 'lead_notes', 'note_attachments', 'lead_files']

/* The ghost-vs-page measure (the S17 probe's): in the held reveal (PageReveal's ghost over the page, its first paint faked days away) every element
   carrying a page module's class in both, index by index after aligning the lists — the first screen only — and every Words sentence the ghost
   sets in a page class against that page's. */
async function measure(b, opts, url, blocks, max = 30, screens = 1) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks, max, screens }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal|tab-ghosts)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (blocks && !blocks.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x))) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) {
      const ps = q.get(k); if (!ps) continue
      let best = 0, bestCost = Infinity
      for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight * screens) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
    }
    const words = []
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    /* (leads on the move, a deliberate change of this rule — L1 · L4) a page's ghost now holds one shape per width, the stylesheet showing one;
       what isn't drawn at this width is no ghost of this page — only drawn pieces count */
    const drawn = (el) => (el.checkVisibility ? el.checkVisibility() : el.getClientRects().length > 0)
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      if (!drawn(el)) continue
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    /* a list's table: the ghost kit draws it on its own classes — its head and first row against the page's table core */
    const top = (root, sel) => { const el = [...root.querySelectorAll(sel)].find(drawn); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY)] }
    for (const [k, gs, ps] of [['table.head', '[class*="ghost-kit-module__"][class*="__tHead"]', '[class*="table-core-module__"][class*="__head"]'], ['table.row', '[class*="ghost-kit-module__"][class*="__tRow"]', '[class*="table-core-module__"][class*="__row"]']]) {
      const a = top(ghost, gs), pp = top(content, ps)
      if (a && pp) rows.push({ k, i: 0, dy: pp[1] - a[1], dx: pp[0] - a[0] })
    }
    return { rows, words }
  }, { blocks, max, screens })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const popups = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'], ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const context = async (o) => { const c = await b.newContext(o); await c.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) }); await c.route('https://calendar.google.com/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>gc</p>' }) }); return c }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await snackText(p); if (re.test(s)) return s; await p.waitForTimeout(200) } return snackText(p) }
  const snackAction = (p, name) => p.locator('[data-om-snackbar]').getByRole('button', { name }).last()
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const dialog = (p, name) => p.getByRole('dialog', { name })
  const menuItem = (p, name) => p.locator('[role="menu"] [role="menuitem"], [role="menu"] button, [role="dialog"] [role="menuitem"]').filter({ hasText: name }).first()
  const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 250)) } return fn() }
  /** a date picked in the house picker: the trigger named `label` (the nth of that name), then the day `d` of the month after this one */
  const pickNextMonth = async (p, scope, label, d, nth = 0) => {
    await scope.getByRole('button', { name: new RegExp(`^${label.replace(/[&]/g, '\\$&')}`) }).nth(nth).click(); await settle(p, 400)
    const picker = p.locator('[role="dialog"][aria-label], [role="group"][aria-label]').filter({ has: p.locator('button[aria-label="Next month"]') }).last()
    await picker.locator('button[aria-label="Next month"]').click(); await settle(p, 250)
    const now = new Date(); const t = new Date(now.getFullYear(), now.getMonth() + 1, d)
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    await picker.locator(`button[aria-label="${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}"]`).click(); await settle(p, 300)
    await p.keyboard.press('Escape').catch(() => {}); await settle(p, 250)
    return t
  }

  /* the record as it was — put back in `finally` */
  const you0 = sql(`select id from members where is_you = 1`)
  const kept = WHOLE.map((t) => [t, snapshot(t)])
  const quotes0 = new Set(sql(`select id from quotes`).split('\n').filter(Boolean))
  const files0all = new Set(sql(`select id from lead_files`).split('\n').filter(Boolean))
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    const newFiles = sql(`select id from lead_files`).split('\n').filter((x) => x && !files0all.has(x))
    if (newFiles.length) { const ids = newFiles.map((x) => `'${x}'`).join(','); text += `DELETE FROM lead_file_images WHERE file_id IN (${ids});\nDELETE FROM lead_file_thumbs WHERE file_id IN (${ids});\n` }
    for (const [t, rows] of kept) text += `DELETE FROM ${t};\n${rows}\n`
    const made = sql(`select id from quotes`).split('\n').filter((x) => x && !quotes0.has(x))
    if (made.length) {
      const ids = made.map((x) => `'${x}'`).join(',')
      for (const t of ['quote_items', 'quote_payments', 'quote_files', 'quote_versions', 'quote_item_comments']) text += `DELETE FROM ${t} WHERE quote_id IN (${ids});\n`
      text += `DELETE FROM quotes WHERE id IN (${ids});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    runSql(text)
  }

  try {
    ok(!!KM && !!JM, 'the demo holds Kevin’s written-up meeting and Jonathan’s planned one (repair R140)')
    as('dane')
    const ctx = await context(opts())
    const p = await page(ctx, '1440')
    await go(p, '/leads', 2000)   // open one page and wait before reading the record the probe compares against (the habit after S08)

    // ── 1 · one home: the lead's Meetings tab, the studio list, the project's view ──────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · One home — the lead’s Meetings tab, Tools › Meeting Copilot, the project’s Client › Meetings')
      await go(p, `/leads/${KEVIN}/meetings`, 1800)
      const tabs = (await p.locator('[role="tablist"]').first().locator('[role="tab"]').allInnerTexts()).map((t) => t.replace(/\d+$/, '').trim())
      const at = tabs.indexOf('Meetings')
      ok(at > 0 && tabs[at - 1] === 'Notes & logs' && tabs[at + 1] === 'Questionnaire', 'the lead’s tabs: Meetings between Notes & logs and Questionnaire', tabs.join(' · '))   // (the calm UI build 2026-10-27, a deliberate change)
      const row = p.getByTestId('meeting-row').filter({ hasText: 'First consultation' }).first()
      ok(await row.isVisible(), 'Kevin’s Met log, written up, is one row — the meeting')
      /* (the calm UI build 2026-10-27, a deliberate change — 2-20) the studio's words: "From notes", "Summary not saved"; the deal score rests in
         Column settings (its card on the meeting page keeps it, in words — "Maybe · 53") */
      ok(/From notes/.test(await row.innerText()) && /Held/.test(await row.getByTestId('meeting-status').innerText()), '…held, written up from notes')
      ok(/Summary not saved/.test(await row.getByTestId('meeting-waits').innerText().catch(() => '')), '…its summary waits to be saved, said in the row')
      ok(!(await row.getByTestId('meeting-score').first().isVisible().catch(() => false)), '…the deal score off the row by default (Column settings keeps it)')   // a hidden column's cell is drawn with display: none
      const metRows = Number(sql(`select count(*) from stage_logs s, json_each(s.payload, '$.meetings') j where s.lead_id = '${KEVIN}' and s.to_stage = 'Met' and json_extract(j.value, '$.meetingId') = '${KM}'`))
      ok(metRows === 1, 'the meeting IS the Met log — the Met step’s entry holds it, no second record')
      const waits = Number(sql(`select count(*) from meetings where lead_id = '${KEVIN}' and deleted_at is null and status = 'held' and brief_at is not null and brief_saved_at is null`))
      const badge = (await p.locator('[role="tab"]').filter({ hasText: 'Meetings' }).first().innerText()).replace(/\D/g, '')
      ok(Number(badge || 0) === waits, 'the tab’s count is what waits on you (briefs to save)', `badge ${badge} · waits ${waits}`)
      ok(await p.getByRole('button', { name: /Summaries to save · \d+/ }).isVisible(), 'the to-do chip says it: Summaries to save · n')   // (the calm UI build 2026-10-27, a deliberate change)
      await shot(p, '01-kevin-tab-1440')

      await go(p, `/leads/${OLIVIA}/meetings`)
      ok(await p.getByTestId('meetings-empty').isVisible() && /No meetings yet/.test(await p.getByTestId('meetings-empty').innerText()), 'a lead with no meeting: the first-run card')   // (the calm UI build 2026-10-27, a deliberate change)
      ok(await p.getByTestId('meetings-empty').getByRole('button', { name: 'Plan a meeting' }).isVisible() && await p.getByTestId('meetings-empty').getByRole('button', { name: 'Start a meeting now' }).isVisible(), '…its buttons: Plan a meeting · Start a meeting now')

      await go(p, '/meetings', 1800)
      ok(await p.getByTestId('meetings-workspace').isVisible(), 'Tools › Meeting Copilot is /meetings')
      const heads = (await p.getByTestId('meetings-table').locator('[role="columnheader"]').allInnerTexts()).map((t) => t.trim().toUpperCase())
      ok(heads.includes('LEAD'), 'the studio list has a Lead column', heads.join(' · '))
      const all = Number(sql(`select count(*) from meetings m join leads l on l.id = m.lead_id where m.deleted_at is null and l.deleted_at is null`))
      ok(await p.getByTestId('meeting-row').filter({ hasText: 'Jonathan Teo' }).count() >= 1 && await p.getByTestId('meeting-row').count() >= all, 'every meeting the studio may see, and each Met log no meeting holds', `${await p.getByTestId('meeting-row').count()} rows · ${all} meetings`)
      await shot(p, '02-studio-1440')

      /* the rail's Tools: Meeting Copilot is live */
      await p.locator('nav[aria-label="Workspace"] button[aria-label="Tools"], nav[aria-label="Workspace"] button[aria-label^="Tools ("]').first().click(); await settle(p, 500)
      const tools = p.locator('[role="menu"][aria-label="Tools"]')
      ok(await tools.locator('[aria-label="Meeting Copilot, coming soon"]').count() === 0 && await tools.getByText('Meeting Copilot').count() >= 1, 'Tools › Meeting Copilot is live (no longer Soon)')
      await tools.getByText('Meeting Copilot').first().click(); await settle(p, 1500)
      ok(/\/meetings(\?|$)/.test(p.url()), '…and opens the meetings', p.url().replace(BASE, ''))
      await p.keyboard.press('Escape')

      await go(p, `/projects/${PROJECT}/meetings`, 1800)
      ok(await p.getByTestId('meetings-tab').isVisible(), 'the project’s Client › Meetings is the lead’s own list on the project')
      ok(await p.getByRole('radio', { name: 'Meetings', checked: true }).count() + await p.locator('[aria-pressed="true"], [aria-checked="true"]').filter({ hasText: 'Meetings' }).count() >= 1, '…Meetings chosen among the Client views')
      await shot(p, '03-project-meetings-1440')
    }

    // ── 2 · plan a meeting: the house form, its reminder; cancel and Undo ────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Plan a meeting — the reminder rides it; Cancel takes it, Undo puts it back')
      await go(p, `/leads/${OLIVIA}/meetings`)
      const before = new Set(sql(`select id from meetings`).split('\n').filter(Boolean))
      await p.getByTestId('meetings-empty').getByRole('button', { name: 'Plan a meeting' }).click(); await settle(p, 700)
      const d = dialog(p, 'Plan a meeting')
      ok(await d.isVisible(), 'Plan a meeting opens the house dialog')
      await d.getByTestId('plan-save').click(); await settle(p, 400)
      ok(await d.getByRole('alert').count() >= 1, 'saved with no date: the field says so (dates are picked, never typed)')
      const day = await pickNextMonth(p, d, 'Date and time', 16)   // (the calm UI build 2026-10-27, a deliberate change)
      await d.getByTestId('plan-save').click()
      const s = await waitSnack(p, /Meeting planned for/)
      ok(/Meeting planned for .* — a reminder task is on it/.test(s), 'planned — "a reminder task is on it"', s)
      ok(/Send the invitation/.test(s), '…with Send the invitation in the snackbar')
      await settle(p, 1200)
      const made = sql(`select id from meetings where lead_id = '${OLIVIA}'`).split('\n').filter((x) => x && !before.has(x))[0]
      const m = made ? one(`select status, starts_at, member_ids, place from meetings where id = '${made}'`) : null
      const startsDay = m ? new Date(m.starts_at) : null
      ok(m && m.status === 'planned' && startsDay && startsDay.getDate() === day.getDate() && startsDay.getMonth() === day.getMonth(), 'the meeting is planned on the day picked', m ? new Date(m.starts_at).toString() : 'none')
      const task = made ? one(`select t.id, t.due_at, t.done, t.kind, (select group_concat(member_id) from task_assignees a where a.task_id = t.id) as who from lead_tasks t where t.meeting_id = '${made}'`) : null
      ok(task && task.kind === 'Follow-up' && task.done === 0 && task.due_at === Math.floor(m.starts_at / 1000) && task.who === 'dane', 'its reminder: a Follow-up due at the meeting, for the people going', JSON.stringify(task))
      const prow = p.getByTestId('meeting-row').first()
      ok(/Upcoming/.test(await prow.getByTestId('meeting-status').innerText().catch(() => '')), 'the row: Upcoming')
      await prow.hover(); await prow.getByRole('button', { name: /More actions|Actions/ }).first().click(); await settle(p, 400)
      await menuItem(p, 'Cancel the meeting').click()
      const cs = await waitSnack(p, /cancelled/)
      ok(/cancelled — its reminder too/.test(cs), 'Cancel: "… cancelled — its reminder too"', cs)
      await settle(p, 900)
      ok(sql(`select status from meetings where id = '${made}'`) === 'cancelled' && Number(sql(`select count(*) from lead_tasks where meeting_id = '${made}'`)) === 0, '…the meeting cancelled and its reminder gone')
      await snackAction(p, 'Undo').click(); await settle(p, 1500)
      ok(sql(`select status from meetings where id = '${made}'`) === 'planned' && Number(sql(`select count(*) from lead_tasks where meeting_id = '${made}' and done = 0`)) === 1, 'Undo: the meeting and its reminder are back')
      /* the Meeting quick link (REG-552 lifted): Plan a meeting on the lead's Meetings */
      await go(p, `/leads/${KEVIN}`, 1500)
      await p.locator('aside[aria-label="Create"]').getByRole('button', { name: 'Meeting', exact: true }).click(); await settle(p, 1800)
      ok(/\/leads\/[^/]+\/meetings/.test(p.url()) && await dialog(p, 'Plan a meeting').isVisible(), 'the Meeting quick link opens Plan a meeting on the lead’s Meetings', p.url().replace(BASE, ''))
      await p.keyboard.press('Escape'); await settle(p, 400)
    }

    // ── 3 · the invitation: WhatsApp on the press, the client's page, the answer on the bell, the calendar file ─────────────────────────
    if (want(3)) {
      console.log('3 · The invitation — WhatsApp, the client’s page, “I’ll be there” on the bell, the .ics')
      as('alex')
      await go(p, `/meetings/${JM}`, 1800)
      ok(await p.getByTestId('meeting-room').getAttribute('data-status') === 'planned', 'Alex’s first consultation with Jonathan opens on its Before view')
      ok(await p.getByTestId('room-start').isVisible() && await p.getByTestId('room-invite').isVisible(), '…Start the meeting is the one filled button, Send the invitation beside it')
      ok(/25 AI credits per 10 minutes — it asks before going on/.test(await p.getByTestId('room-price').innerText()), 'Meeting Copilot’s price is said before Start (Q-45)')   // (the calm UI build 2026-10-27, a deliberate change)
      ok(/Before the meeting/i.test(await p.locator('[data-card="room-prep"]').innerText()) && /Still to find out/i.test(await p.locator('[data-card="room-prep"]').innerText()), 'the prep: what is known and what is still to find out')
      await shot(p, '04-room-before-1440')
      popups.length = 0
      await p.getByTestId('room-invite').click(); await settle(p, 800)
      const d = dialog(p, 'Send the invitation')
      const msg = await d.locator('textarea').first().inputValue()
      ok(/\/meeting\/[A-Za-z0-9_-]+/.test(msg) && /Jonathan/.test(msg) && !/OpenMaison/i.test(msg), 'the message: the client’s name and their link — never the platform’s name', msg.slice(0, 160))
      await d.getByRole('button', { name: 'Send on WhatsApp' }).click()
      await waitFor(() => popups.some((u) => /wa\.me\/65\d{8}\?text=/.test(u)), 6000)
      ok(popups.some((u) => /wa\.me\/65\d{8}\?text=/.test(u)), 'WhatsApp opens on the press, to the client’s number')
      await settle(p, 1500)
      const inv = one(`select client_token, invited_via, invited_at from meetings where id = '${JM}'`)
      ok(inv.client_token && inv.invited_via === 'whatsapp' && inv.invited_at, 'the meeting records the invitation (WhatsApp)')
      const bell0 = Number(sql(`select count(*) from notifications where kind = 'meeting_answered'`))
      const cctx = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
      const c = await page(cctx, 'client')
      await go(c, `/meeting/${inv.client_token}`, 1800)
      ok(await c.getByTestId('meeting-link').getAttribute('data-state') !== 'held' && await c.getByTestId('meeting-link-invite').isVisible(), 'the client’s page: the invitation')
      ok(/Wed|Thu|Fri|Sat|Sun|Mon|Tue/.test(await c.getByTestId('meeting-link-when').innerText()), '…the day and time')
      ok(!/OpenMaison/i.test(await c.locator('body').innerText()), '…and never the platform’s name')
      ok(await sideways(c) <= 0, 'the client’s page at 390 has no sideways scroll', String(await sideways(c)))
      await waitFor(() => !!sql(`select client_viewed_at from meetings where id = '${JM}'`), 5000)
      ok(!!sql(`select client_viewed_at from meetings where id = '${JM}'`), 'the studio sees it was opened')
      const ics = await c.request.get(`${BASE}/meeting/${inv.client_token}/invite.ics`)
      const icsText = await ics.text()
      ok(ics.status() === 200 && /text\/calendar/.test(ics.headers()['content-type'] || '') && /BEGIN:VCALENDAR/.test(icsText) && /DTSTART:\d{8}T\d{6}Z/.test(icsText) && !/OpenMaison/i.test(icsText), 'the calendar invite is a real .ics, with no platform name in it')
      await shot(c, '05-client-invite-390')
      await c.getByTestId('meeting-link-yes').click(); await settle(c, 1500)
      ok(await c.getByTestId('meeting-link-answer').getAttribute('data-answer') === 'yes', '“I’ll be there” — the page says what they told the studio')
      ok(sql(`select client_answer from meetings where id = '${JM}'`) === 'yes', '…recorded on the meeting')
      await waitFor(() => Number(sql(`select count(*) from notifications where kind = 'meeting_answered'`)) > bell0, 5000)
      ok(Number(sql(`select count(*) from notifications where kind = 'meeting_answered' and member_id = 'alex'`)) >= 1, '…and Alex hears it on the bell')
      await cctx.close()
      await go(p, `/meetings/${JM}`, 1500)
      ok(/Jonathan says they’ll be there/.test(await p.getByTestId('room-answer').innerText().catch(() => '')), 'the meeting page says the client is coming')
      /* Maison AI on this page, and the Ask box: "prepare me for my next meeting" */
      await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700)
      const sheet = p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
      ok(await sheet.getByText('Prepare me for Jonathan').count() >= 1, 'Maison AI on the meeting: "Prepare me for Jonathan"')
      const box = sheet.locator('[data-testid="maison-ask"] input')
      await box.fill('prepare me for my next meeting'); await box.press('Enter')
      await p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
      const ans = await sheet.locator('[data-testid="maison-answer"]').first().innerText().catch(() => '')
      ok(/Jonathan/.test(ans), 'the Ask box prepares you for your next meeting from the records', ans.slice(0, 160).replace(/\s+/g, ' '))
      await p.keyboard.press('Escape'); await settle(p, 300)
      as('dane')
    }

    // ── 4 · the co-pilot: consent, the price, the tips, the check-in, End and the brief, the Met log ────────────────────────────────────
    let LIVE = null
    if (want(4)) {
      console.log('4 · The co-pilot — told first, priced, read by rule, ten minutes at a time; End makes the brief and files the Met log')
      await go(p, `/leads/${KEVIN}/meetings`)
      const before = new Set(sql(`select id from meetings`).split('\n').filter(Boolean))
      const ledger0 = Number(sql(`select count(*) from credit_ledger`))
      const bal0 = Number(sql(`select plan_credits + topup_credits from studio_credit_balances`))
      await p.getByTestId('meetings-new').click(); await settle(p, 400)
      await menuItem(p, 'Start a meeting now').click()
      await p.waitForURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 10000 }).catch(() => {}); await settle(p, 1800)
      LIVE = sql(`select id from meetings where lead_id = '${KEVIN}'`).split('\n').filter((x) => x && !before.has(x))[0]
      ok(!!LIVE && p.url().includes(LIVE), 'Start a meeting now opens the meeting’s page')
      ok(Number(sql(`select count(*) from lead_tasks where meeting_id = '${LIVE}'`)) === 0, '…with no reminder (it is now)')
      await p.getByTestId('room-start').click(); await settle(p, 900)
      ok(await p.getByTestId('room-consent-error').isVisible(), 'Start before the client is told: it asks for the tick first')
      ok(sql(`select status from meetings where id = '${LIVE}'`) === 'planned' && Number(sql(`select count(*) from credit_ledger`)) === ledger0, '…nothing starts and nothing is charged')
      await p.getByTestId('room-consent').click(); await settle(p, 300)
      await p.getByTestId('room-start').click()
      const s = await waitSnack(p, /Meeting Copilot is on/)   // (the calm UI build 2026-10-27, a deliberate change) — one spelling
      ok(/Meeting Copilot is on · 25 AI credits for the first 10 minutes/.test(s), 'Start: "Meeting Copilot is on · 25 AI credits for the first 10 minutes"', s)
      await settle(p, 1800)
      const m = one(`select status, consent_at, consent_by, blocks, started_at from meetings where id = '${LIVE}'`)
      ok(m.status === 'live' && m.consent_at && m.consent_by === 'dane' && m.blocks === 1, 'live, with the consent on record (who, when)')
      ok(await p.getByTestId('room-check-in').count() === 0 && await p.getByTestId('room-paused').count() === 0, 'just started: no check-in and no pause — the first 10 minutes run')
      const spend = json(`select credits, ref_id, action_key from credit_ledger where ref_id like 'meeting:${LIVE}:%' and reason = 'spend'`)
      ok(spend.length === 1 && spend[0].credits === -25 && spend[0].ref_id === `meeting:${LIVE}:1` && spend[0].action_key === 'copilot_block', 'one 10-minute block on the ledger: −25 for block 1')
      ok(Number(sql(`select plan_credits + topup_credits from studio_credit_balances`)) === bal0 - 25, '…and the studio’s balance is 25 less')
      const notes = p.getByTestId('room-notes-box')
      await notes.click()
      await notes.fill('Client: We just got the keys to our HDB 4-room, about 1,000 sq ft.\nClient: Our budget is around 150k for the whole home.\nClient: We like a Japandi look with light oak.\nClient: Honestly your quote feels a bit high compared with what we expected.\nClient: We are also comparing with another studio.\nMe: We will send you the quote this week.')
      await settle(p, 2600)
      ok(/150k/.test(sql(`select notes from meetings where id = '${LIVE}'`)), 'what is said saves itself as it is typed')
      ok(await p.getByTestId('meeting-tip').count() >= 2, 'tips come up as the client talks', String(await p.getByTestId('meeting-tip').count()))
      const answers = await p.getByTestId('tip-answer').allInnerTexts()
      ok(answers.some((a) => /budget is a real concern|right approach/i.test(a)), 'a tip carries the studio’s own answer')
      ok(await p.getByTestId('checklist-auto').count() >= 2, 'the checklist ticks itself from what is said')
      ok(/^\d+$/.test((await p.getByTestId('score-number').innerText().catch(() => '')).trim()), 'the deal score reads what is said')
      ok(/S\$/.test(await p.getByTestId('room-tools').locator('xpath=ancestor::*[@data-phone-view]').innerText().catch(() => '')), 'the rough estimate prices what is heard')
      await shot(p, '06-room-live-1440', true)
      /* the phone's live view: one card at a time */
      const pctx = await context(phoneOpts())
      const ph = await page(pctx, '390-live')
      await go(ph, `/meetings/${LIVE}`, 1800)
      ok(await ph.getByTestId('room-phone-views').isVisible() && await sideways(ph) <= 0, 'the live meeting at 390: the views as chips, no sideways scroll', String(await sideways(ph)))
      await shot(ph, '07-room-live-390')
      await pctx.close()
      /* the check-in: nine and a half minutes in */
      sql(`update meetings set started_at = ${Date.now() - 9.5 * 60_000} where id = '${LIVE}'`)
      await go(p, `/meetings/${LIVE}`, 2200)
      ok(/10 minutes in — keep Meeting Copilot on\?/.test(await p.getByTestId('room-check-in').innerText().catch(() => '')) && /25 AI credits for the next 10 minutes/.test(await p.getByTestId('room-check-in').innerText().catch(() => '')), 'ten minutes in, it asks before the next 10 — with the price')
      await p.getByTestId('room-keep-going').click()
      const k = await waitSnack(p, /carries on/)
      ok(/Meeting Copilot carries on · 25 AI credits for the next 10 minutes/.test(k), 'Keep going: "Meeting Copilot carries on · 25 AI credits …"', k)   // (the calm UI build 2026-10-27, a deliberate change)
      await settle(p, 1000)
      ok(Number(sql(`select blocks from meetings where id = '${LIVE}'`)) === 2 && Number(sql(`select count(*) from credit_ledger where ref_id = 'meeting:${LIVE}:2' and reason = 'spend'`)) === 1, '…block 2 on the ledger')
      /* End */
      const metBefore = Number(sql(`select count(*) from stage_logs s, json_each(s.payload, '$.meetings') j where s.lead_id = '${KEVIN}' and s.to_stage = 'Met'`))
      await p.getByTestId('room-end').click(); await settle(p, 500)
      await dialog(p, 'End the meeting?').getByRole('button', { name: 'End the meeting' }).click()
      const e = await waitSnack(p, /Meeting held/, 12000)
      ok(/Meeting held — the summary is ready · Meeting Copilot \d+ min · 50 AI credits/.test(e), 'End: the receipt — the minutes and the credits', e)   // (the calm UI build 2026-10-27, a deliberate change)
      await settle(p, 2000)
      const h = one(`select status, ended_at, brief_json, source from meetings where id = '${LIVE}'`)
      const brief = h && h.brief_json ? JSON.parse(h.brief_json) : null
      ok(h.status === 'held' && h.ended_at && brief && brief.madeFrom === 'live' && /Met Kevin/.test(brief.summary), 'held; the brief made by rule from what was said')
      ok(Number(sql(`select count(*) from copilot_objection_log where meeting_id = '${LIVE}'`)) >= 2, 'the concerns raised are logged (1.0’s objection log)')
      ok(Number(sql(`select count(*) from stage_logs s, json_each(s.payload, '$.meetings') j where s.lead_id = '${KEVIN}' and s.to_stage = 'Met' and json_extract(j.value, '$.meetingId') = '${LIVE}'`)) === 1 && Number(sql(`select count(*) from stage_logs s, json_each(s.payload, '$.meetings') j where s.lead_id = '${KEVIN}' and s.to_stage = 'Met'`)) === metBefore + 1, 'Kevin is past Met: the meeting joins his Met step as its next log')
      ok(await p.getByTestId('brief-summary-text').isVisible() && await p.getByTestId('room-save').isVisible(), 'the page turns to the brief, Save to the lead the filled button')
      await shot(p, '08-room-brief-1440', true)
    }

    // ── 5 · Save to the lead, and Undo ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Save to the lead — each detail and the follow-up, with Undo')
      await go(p, `/meetings/${KM}`, 1800)
      const lead0 = one(`select area_sqft, style, budget_minor from leads where id = '${KEVIN}'`)
      const tasks0 = Number(sql(`select count(*) from lead_tasks where lead_id = '${KEVIN}'`))
      await p.getByTestId('room-save').click(); await settle(p, 700)
      const d = p.getByTestId('save-lead-dialog')
      ok(await d.isVisible() && await d.getByTestId('save-field').count() >= 1, 'the dialog lists each detail it will write')
      ok(/3,000/.test(await d.innerText()), '…the floor area heard (3,000 sq ft), the lead having none')
      await p.getByTestId('save-lead-confirm').click()
      const s = await waitSnack(p, /Saved to Kevin/)
      ok(/Saved to Kevin’s lead — .*(detail|task)/.test(s), 'Saved — the snackbar says what went', s)
      await settle(p, 1200)
      ok(!!sql(`select brief_saved_at from meetings where id = '${KM}'`) && Number(sql(`select area_sqft from leads where id = '${KEVIN}'`)) === 3000, 'the lead holds the floor area; the brief is marked saved')
      ok(Number(sql(`select count(*) from lead_tasks where lead_id = '${KEVIN}'`)) === tasks0 + 1, '…and the follow-up task is on the lead')
      await snackAction(p, 'Undo').click(); await settle(p, 1800)
      const lead1 = one(`select area_sqft, style, budget_minor from leads where id = '${KEVIN}'`)
      ok(!sql(`select brief_saved_at from meetings where id = '${KM}'`) && JSON.stringify(lead1) === JSON.stringify(lead0) && Number(sql(`select count(*) from lead_tasks where lead_id = '${KEVIN}'`)) === tasks0, 'Undo: the lead is back as it was, the task gone, the brief waiting again')
    }

    // ── 6 · Share the notes; Stop sharing ────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Share the notes — the summary and the next steps, never the concerns; Stop sharing')
      await go(p, `/meetings/${KM}`, 1500)
      await p.getByTestId('room-share').first().click(); await settle(p, 800)
      const d = dialog(p, 'Share the notes')
      ok(await d.getByTestId('share-options').isVisible(), 'the dialog asks what goes with the notes')
      ok(!(await d.getByTestId('share-estimate').locator('input').isChecked().catch(() => false)), '…the rough estimate is not ticked by default')
      await d.getByRole('button', { name: 'Copy link' }).click()
      const s = await waitSnack(p, /shared/)
      ok(/Notes link copied — they’re shared/.test(s), 'Copy link: "Notes link copied — they’re shared"', s)
      await p.keyboard.press('Escape'); await settle(p, 1200)
      const sh = one(`select client_token, shared_at, share_stopped_at from meetings where id = '${KM}'`)
      ok(sh.client_token && sh.shared_at && !sh.share_stopped_at, 'the meeting is shared')
      const cctx = await context(opts())
      const c = await page(cctx, 'client-notes')
      await go(c, `/meeting/${sh.client_token}`, 1800)
      const words = await c.getByTestId('meeting-link-notes').innerText().catch(() => '')
      /* (S42 audit C-05, call C·2 — a deliberate change of this rule) the summary is said to the client: "We met …", never "Met Kevin …" */
      ok(await c.getByTestId('meeting-link').getAttribute('data-state') === 'held' && /We met/.test(words) && !/Met Kevin/.test(words), 'the client reads the summary on their link, said to them')
      const span = await c.getByTestId('meeting-link').evaluate((el) => Math.round(el.getBoundingClientRect().width))
      ok(span === 1440, 'the client’s page fills the window at 1440 (its letterhead the whole width, the column centred)', `${span}`)
      ok(!/comparing studios|another studio|other quote|concern|deal score|\b\d+ · (Hot|Warm|Cool|Cold)\b|\b(Very likely|Likely|Maybe|Unlikely) · \d+/i.test(words), '…never the concerns, the competitors or the score', words.slice(0, 200).replace(/\s+/g, ' '))
      ok(await c.getByTestId('meeting-link-estimate').count() === 0, '…and no estimate unless it was ticked')
      await shot(c, '09-client-notes-1440', true)
      await p.getByRole('button', { name: 'More actions' }).first().click(); await settle(p, 400)
      await menuItem(p, 'Stop sharing the notes').click()
      const st = await waitSnack(p, /no longer shared/)
      ok(/The notes are no longer shared/.test(st), 'Stop sharing — said, with Undo', st)
      await settle(p, 1000)
      await go(c, `/meeting/${sh.client_token}`, 1500)
      ok(await c.getByTestId('meeting-link').count() + await c.getByTestId('signing-page').count() >= 1 && await c.getByTestId('meeting-link-notes').count() === 0, 'the client’s link no longer carries the notes (the meeting only — or, its 30 days long past, the closed notice)')
      await cctx.close()
    }

    // ── 7 · Make a draft quote — no price made up ────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Make a draft quote from the brief — the works heard, nothing priced by guess')
      await go(p, `/meetings/${KM}`, 1500)
      const q0 = new Set(sql(`select id from quotes`).split('\n').filter(Boolean))
      await p.getByRole('button', { name: 'More actions' }).first().click(); await settle(p, 400)
      await menuItem(p, 'Make a draft quote').click()
      const s = await waitSnack(p, /Draft quote made/, 12000)
      ok(/Draft quote made — \d+ lines?/.test(s), 'Make a draft quote: "Draft quote made — n lines …"', s)
      const toPrice = Number((/, (\d+) to price/.exec(s) || [])[1] || 0)
      await settle(p, 1200)
      const q = sql(`select id from quotes where lead_id = '${KEVIN}'`).split('\n').filter((x) => x && !q0.has(x))[0]
      ok(!!q && sql(`select quote_id from meetings where id = '${KM}'`) === q, 'the quote is the meeting’s — on Kevin’s lead')
      ok(q && Number(sql(`select count(*) from quote_items where quote_id = '${q}' and kind = 'item' and cost_minor = 0 and price_book_item_id is null`)) >= toPrice && Number(sql(`select count(*) from quote_items where quote_id = '${q}' and kind = 'item'`)) > 0, '…what the studio’s Price book doesn’t hold waits at S$0 to price (no price made up)', `${toPrice} to price`)
    }

    // ── 8 · write a meeting up; before Met it offers Move to Met ─────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · Write it up from notes — no credits; on a lead before Met, “Move to Met”')
      as('alex')
      await go(p, `/leads/${JONATHAN}/meetings`, 1500)
      const before = new Set(sql(`select id from meetings`).split('\n').filter(Boolean))
      const ledger0 = Number(sql(`select count(*) from credit_ledger`))
      const metLogs0 = Number(sql(`select count(*) from stage_logs where lead_id = '${JONATHAN}' and to_stage = 'Met'`))
      await p.getByTestId('meetings-new').click(); await settle(p, 400)
      await menuItem(p, 'Write up a meeting').click(); await settle(p, 700)
      const d = p.getByTestId('writeup-dialog')
      ok(await d.isVisible(), 'Write up a meeting opens the house dialog')
      await d.getByTestId('writeup-notes').locator('textarea').first().fill('Client: We would like a Japandi look, budget around 60k.\nClient: Only the kitchen and the bathroom for now.')
        .catch(async () => { await d.getByTestId('writeup-notes').fill('Client: We would like a Japandi look, budget around 60k.\nClient: Only the kitchen and the bathroom for now.') })
      await p.getByTestId('writeup-save').click()
      const s = await waitSnack(p, /Summary made/, 12000)   // (the calm UI build 2026-10-27, a deliberate change) — "summary", not "brief"
      ok(/Summary made from your notes/.test(s) && /Move to Met/.test(s), 'the summary is made — and, Jonathan not at Met yet, the snackbar offers Move to Met', s)
      await settle(p, 1200)
      const w = sql(`select id from meetings where lead_id = '${JONATHAN}'`).split('\n').filter((x) => x && !before.has(x))[0]
      ok(!!w && sql(`select status || ':' || source from meetings where id = '${w}'`) === 'held:notes' && Number(sql(`select count(*) from credit_ledger`)) === ledger0, 'held, written up from notes — nothing charged')
      ok(Number(sql(`select count(*) from stage_logs where lead_id = '${JONATHAN}' and to_stage = 'Met'`)) === metLogs0 && sql(`select stage from leads where id = '${JONATHAN}'`) === 'Contacted', '…no Met log written behind the studio’s back; the lead stays in Contacted')
      await snackAction(p, 'Move to Met').click(); await settle(p, 2200)
      const win = dialog(p, 'Move stage')
      ok(await win.isVisible().catch(() => false) && p.url().includes(`/leads/${JONATHAN}`), 'Move to Met opens the lead’s Move stage window')
      ok((await win.locator('[role="tablist"][aria-label="Stages"] [role="tab"][aria-selected="true"]').innerText().catch(() => '')).trim().endsWith('Met'), '…at Met')
      await p.keyboard.press('Escape'); await settle(p, 400)
      as('dane')
      /* a recording: kept in the lead's Files with its bytes and its consent; its transcript pasted (turning audio into words is a stand-in) */
      await go(p, `/leads/${OLIVIA}/meetings`, 1500)
      const files0 = new Set(sql(`select id from lead_files where lead_id = '${OLIVIA}'`).split('\n').filter(Boolean))
      const before2 = new Set(sql(`select id from meetings`).split('\n').filter(Boolean))
      const rd = p.getByTestId('writeup-dialog')
      if (await p.getByTestId('meetings-new').isVisible().catch(() => false)) {
        await p.getByTestId('meetings-new').click(); await settle(p, 400)
        await menuItem(p, 'Upload a recording').click(); await settle(p, 700)
        ok(await rd.getByRole('radio', { name: 'A recording', checked: true }).count() === 1, 'New Meeting ▾ › Upload a recording opens the write-up on “A recording”')
      } else {   // the lead's first meeting: the empty card's Write one up, then From › A recording
        await p.getByTestId('meetings-empty').getByRole('button', { name: 'Write one up from notes' }).click(); await settle(p, 700)
        await rd.getByRole('radio', { name: 'A recording' }).click(); await settle(p, 300)
      }
      ok(/isn’t connected|is not connected|stand-in|paste/i.test(await rd.getByTestId('writeup-stand-in').innerText().catch(() => '')), 'Upload a recording says turning it into words is a stand-in')
      const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.from([16, 0, 0, 0, 1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x80, 0x3e, 0, 0, 2, 0, 16, 0]), Buffer.from('data'), Buffer.alloc(4 + 3200)])
      await rd.locator('input[type="file"]').first().setInputFiles({ name: 'site-visit.wav', mimeType: 'audio/wav', buffer: wav }); await settle(p, 900)
      ok(await rd.getByTestId('writeup-recording').isVisible(), '…the recording is picked')
      await p.getByTestId('writeup-save').click(); await settle(p, 500)
      ok(await rd.getByRole('alert').count() >= 1, '…kept only once everyone’s agreement is ticked (and its transcript pasted)')
      await rd.getByTestId('writeup-consent').click(); await settle(p, 200)
      await rd.getByTestId('writeup-notes').locator('textarea').first().fill('Client: We want to redo the kitchen, budget around 40k.').catch(async () => { await rd.getByTestId('writeup-notes').fill('Client: We want to redo the kitchen, budget around 40k.') })
      await p.getByTestId('writeup-save').click()
      const rs = await waitSnack(p, /Summary made/, 15000)   // (the calm UI build 2026-10-27, a deliberate change)
      ok(/Summary made from the recording’s transcript/.test(rs), 'the summary is made from the transcript', rs)
      await settle(p, 1200)
      const rm = sql(`select id from meetings where lead_id = '${OLIVIA}'`).split('\n').filter((x) => x && !before2.has(x))[0]
      const rf = sql(`select id from lead_files where lead_id = '${OLIVIA}'`).split('\n').filter((x) => x && !files0.has(x))[0]
      const rec = rm ? one(`select source, recording_file_id, consent_kind, consent_by from meetings where id = '${rm}'`) : null
      ok(rec && rec.source === 'recording' && rec.recording_file_id === rf && rec.consent_kind === 'recording' && rec.consent_by === 'dane', 'the recording is in the lead’s Files, the meeting holds it with the consent on record', JSON.stringify(rec))
      ok(rf && Number(sql(`select count(*) from credit_ledger where ref_id like 'meeting:${rm}:%'`)) === 0, '…and nothing is charged for a write-up')
    }

    // ── 9 · an in-person next step on a contact log is a planned meeting ─────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · A contact log whose next step is to meet in person plans the meeting')
      as('alex')
      await go(p, `/leads/${JONATHAN}/notes`, 1500)
      const before = new Set(sql(`select id from meetings where lead_id = '${JONATHAN}'`).split('\n').filter(Boolean))
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 400)
      await menuItem(p, 'Contact Log').click(); await settle(p, 900)
      const ed = p.locator('main')
      await ed.getByRole('radio', { name: 'WhatsApp' }).first().click().catch(async () => { await ed.getByText('WhatsApp', { exact: true }).first().click() }); await settle(p, 200)
      /* (the calm UI build 2026-10-27, a deliberate change — 2-08) the desk's contact log speaks the log sheet's words: How · When · How it went
         (chips, was the Outcome select), the call back's "Date and time" and "Call back by" (was Preferred mode; "In person" reads "Visit"), "Save log" */
      await ed.getByRole('radiogroup', { name: 'How it went', exact: true }).getByRole('radio', { name: 'Meeting scheduled', exact: true }).click(); await settle(p, 400)
      await ed.getByRole('button', { name: /^When/ }).first().click(); await settle(p, 400)   // when they were contacted: today, from the picker
      await p.locator('button[aria-label="Today"]').last().click(); await settle(p, 300)
      await p.keyboard.press('Escape').catch(() => {}); await settle(p, 250)
      const day = await pickNextMonth(p, ed, 'Date and time', 20, 0)
      await ed.getByRole('combobox', { name: /Call back by/ }).click(); await settle(p, 300)
      await p.locator('[role="option"]').filter({ hasText: 'Visit' }).first().click(); await settle(p, 300)
      await shot(p, '11-contact-log-1440')
      await p.getByRole('button', { name: 'Save log', exact: true }).first().click()
      const saved = await waitSnack(p, /Contact log saved/)
      ok(/Contact log saved · a meeting is planned for /.test(saved), 'the save says the meeting is planned', saved)
      await settle(p, 1500)
      const made = sql(`select id from meetings where lead_id = '${JONATHAN}'`).split('\n').filter((x) => x && !before.has(x))
      const m = made[0] ? one(`select status, aim, where_kind, starts_at, created_by from meetings where id = '${made[0]}'`) : null
      ok(made.length === 1 && m && m.status === 'planned' && m.where_kind === 'In person' && new Date(m.starts_at).getDate() === day.getDate() && m.created_by === 'alex', 'the contact log’s in-person next step is a planned meeting on the lead, on its day', JSON.stringify(m))
      as('dane')
    }

    // ── 10 · Settings › Meetings; Reports › Meetings; who may ────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · Settings › Meetings and Reports › Meetings — who may, and the switches with Undo')
      await go(p, '/settings?section=meetings', 1800)
      const strip = (await p.locator('[role="tablist"]').first().locator('[role="tab"]').allInnerTexts()).map((t) => t.trim())
      ok(strip.indexOf('Meetings') === strip.indexOf('Lead management') + 1, 'Settings has a Meetings module, after Lead management', strip.join(' · '))
      const sw = p.getByTestId('meetings-features').getByRole('switch', { name: 'Tips as you talk' })
      await sw.locator('xpath=ancestor::label[1]').click().catch(async () => { await sw.click({ force: true }) })
      const s = await waitSnack(p, /Tips as you talk is off/)
      ok(/Tips as you talk is off in meetings/.test(s), 'a part switched off — said, with Undo', s)
      await settle(p, 1000)
      const feat = () => { const v = sql(`select value from settings where key = 'meeting_copilot'`); try { return JSON.parse(v).features?.coaching } catch { return undefined } }
      ok(feat() === false, '…the studio’s setting holds it')
      await snackAction(p, 'Undo').click(); await settle(p, 1400)
      ok(feat() !== false, 'Undo: it is on again')
      ok(/100%/.test(await p.getByTestId('meetings-weight-total').innerText().catch(() => '')), 'the deal score’s six weights make 100%')
      await shot(p, '10-settings-meetings-1440')
      await go(p, '/company/reports/meetings', 1800)
      ok(await p.getByTestId('meeting-report').isVisible(), 'Reports › Meetings for an Owner')
      as('huimin')
      await go(p, '/settings?section=meetings', 1500)
      ok(!(await p.getByTestId('meetings-features').getByRole('switch', { name: 'Tips as you talk' }).isDisabled()), 'an Admin changes Settings › Meetings')
      await go(p, '/company/reports/meetings', 1500)
      ok(await p.getByTestId('meeting-report').isVisible(), '…and reads Reports › Meetings')
      as('germaine')
      await go(p, '/settings?section=meetings', 1500)
      ok(await p.getByTestId('meetings-features').getByRole('switch', { name: 'Tips as you talk' }).isDisabled(), 'a Designer reads Settings › Meetings, its switches resting')
      await go(p, '/company/reports/meetings', 1500)
      ok(await p.getByTestId('meeting-report-gate').isVisible().catch(() => false) || await p.getByTestId('access-gate').isVisible().catch(() => false), 'a Designer is told Reports › Meetings isn’t theirs')
      await go(p, `/leads/${KEVIN}/meetings`, 1500)
      ok(await p.getByTestId('meeting-row').count() >= 1, 'a Designer who may see the lead sees its meetings (Who sees leads: everyone)')
      as('priya')
      await go(p, '/meetings', 1500)
      ok(await p.getByTestId('access-gate').isVisible(), 'Accounting has no meetings: the gate')
      as('dane')
    }

    // ── 11 · ⌘K; 1.0's old share link ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · ⌘K finds a meeting; 1.0’s old share link answers')
      await go(p, '/leads', 1500)
      await p.keyboard.press('Meta+k'); await settle(p, 500)
      const panel = p.getByRole('dialog', { name: 'Search' })
      await p.getByRole('combobox', { name: 'Search the studio' }).fill('first consultation'); await settle(p, 1400)
      const group = panel.getByRole('group', { name: 'Meetings' })
      ok(await group.isVisible() && /with Kevin Ng|with Jonathan Teo/.test(await group.innerText()), '⌘K: a Meetings group with the meetings')
      await group.locator('[role="option"]').first().click(); await settle(p, 1800)
      ok(/\/meetings\/[0-9a-f-]{36}\?from=/.test(p.url()), '…a result opens the meeting with ?from=', p.url().replace(BASE, ''))
      const r = await p.request.get(`${BASE}/copilot/share/1-0-share-that-ended`)
      ok(r.status() === 200 && /no longer|isn’t open|ended/i.test(await r.text()), '1.0’s old share link: the studio’s notice, never a bare 404')
    }

    // ── 12 · phones, ghosts, page errors ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(12)) {
      console.log('12 · 390 · 320 · 768 touch, and the ghosts draw the page')
      for (const [w, tag] of [[390, '390'], [320, '320']]) {
        const pc = await context(phoneOpts(w))
        const ph = await page(pc, tag)
        for (const [name, url] of [['studio', '/meetings'], ['kevin-tab', `/leads/${KEVIN}/meetings`], ['brief', `/meetings/${KM}`], ['before', `/meetings/${JM}`], ['settings', '/settings?section=meetings'], ['reports', '/company/reports/meetings']]) {
          await go(ph, url, 1500)
          const sw = await sideways(ph)
          ok(sw <= 0, `${name} at ${tag}: no sideways scroll`, String(sw))
          if (w === 390 && ['studio', 'brief', 'before'].includes(name)) await shot(ph, `12-${name}-390`)
        }
        await pc.close()
      }
      const tc = await context({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true })
      const tp = await page(tc, '768')
      await go(tp, `/meetings/${KM}`, 1500); await shot(tp, '13-brief-768-touch')
      ok(await sideways(tp) <= 0, 'the brief at 768 touch: no sideways scroll')
      await go(tp, '/meetings', 1500); await shot(tp, '13-studio-768-touch')
      await tc.close()
      /* what the ghost can know: the lists' toolbar, heads and rows (the lead's own header is the shared lead ghost, not this step's); the
         meeting's frame, its columns and cards, the Before view's Get ready and checklist (the page's copy) — the record's prose is a bar */
      const LIST = ['meetings-table.', 'meetings.', 'meetings-toolbar.', 'tab-toolbar.', 'table-core.']
      const ROOM = ['room.page', 'room.content', 'room.grid', 'room.column', 'room.act', 'room.glance', 'room.cardBody', 'room.group', 'room.groupLabel', 'room.checkGroup', 'room.checkRow', 'room.form', 'room.disclosure', 'room.price', 'room.standIn', 'room.prose', 'room.steps', 'room.tags', 'room.concern', 'room.scoreLine', 'card.card', 'card.head', 'card.title', 'project-overview.row', 'page-header-l2.titleBlock', 'page-header-l2.crumb']
      /* the client's link in its two open shapes — the invitation and the shared notes (tokens set here; `finally` puts the meetings back) */
      sql(`update meetings set client_token = 'probe-s23-invite' where id = '${JM}'`)
      sql(`update meetings set client_token = 'probe-s23-notes', shared_at = ${Date.now()}, share_stopped_at = null, share_json = '{\"boards\":true,\"estimate\":false}' where id = '${KM}'`)
      const LINK = ['meeting-link-page.', 'signing-page.']
      for (const [name, url, blocks] of [['studio', '/meetings', LIST], ['lead tab', `/leads/${KEVIN}/meetings`, LIST], ['brief', `/meetings/${KM}`, ROOM], ['before', `/meetings/${JM}`, ROOM], ['client invitation', '/meeting/probe-s23-invite', LINK], ['client notes', '/meeting/probe-s23-notes', LINK]]) {
        const m = await measure(b, opts(), url, blocks)
        if (m.none) { ok(false, `${name}: its reveal holds a ghost`); continue }
        const off = m.rows.filter((r) => Math.abs(r.dy) > 4 || Math.abs(r.dx) > 4)
        ok(m.rows.length >= 3 && off.length === 0, `${name}: the ghost draws the page (${m.rows.length} pieces matched)`, off.slice(0, 4).map((r) => `${r.k}#${r.i} dy ${r.dy} dx ${r.dx}`).join(' · '))
        ok(m.words.length === 0, `${name}: the ghost’s words are the page’s`, m.words.slice(0, 3).join(' · '))
      }
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 300))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    console.log(`  ${stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0 ? '✓ the leads’ stages and stage logs are as found' : '✗ the leads’ stages or stage logs changed'}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
