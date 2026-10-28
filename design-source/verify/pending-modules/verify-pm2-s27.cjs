// Pending modules, step S27 · Hangouts (+ designer portfolio profiles) — the owner's "build all of them but one after the other", 2026-10-11;
// survey keys public:hangouts · api:designer-portfolio-profiles. 1.0: src/app/hangouts/[eventId] (the homeowner's page), the studio's removed
// qanvast-ops/hangouts page (Events · Plan · Dashboard · Your meetings) and its hooks (src/lib/queries/hangouts.ts), match-score.ts, the
// never-mounted id-profile ProfileEditor. Each item asserted as the rule it builds, never another round's count:
//  - one home: Qanvast Ops › Hangouts is a live tab; each Hangout its page (Plan · Chats · How it went); a member's card and work is their
//    Public profile (Company › Members, Your profile) — the old About page dialog is gone; the card reaches the portal's Our team, the studio's
//    Hangout page and the meeting room's Past projects
//  - Qanvast's events come through the feed (samples, said so); Apply (Owners and Admins) with Undo; Qanvast's confirmation arrives through the
//    feed; the plan (shifts as chips up to the studio's tables, refusals that say why, shares, who to meet + weights adding to 100, Send to Qanvast)
//  - the day: Start, End with 1.0's outcomes and reasons → the lead's meeting with its notes and brief, a follow-up task; change the outcome;
//    give a chat to someone on its shift (their bell); cancel with Undo; a walk-in through the capture path; a break; a homeowner's "I'm at the
//    table" shows on the studio's list
//  - the public page in the studio's name: the event, the booking (a lead, source Hangout, given to the rule's designer, the two bells, their
//    link through the outbox), the designers' public cards and work (pictures only of people on that plan), closed / ended / gone states,
//    1.0's old /hangouts/<id> link; a homeowner's own page; link cards
//  - who: a Designer reads the plan, runs their own chats; Accounting has no Hangouts; 390 · 320 · 768 touch with no sideways scroll against
//    screen.width; the ghosts draw the pages they stand for; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s27.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s27')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

const TODAY = 'hge-qh-2026-marina', PAST = 'hge-qh-2026-suntec', NEXT = 'hge-qh-2026-onenorth'
const WHOLE = ['hangout_events', 'hangout_shifts', 'hangout_participations', 'hangout_designers', 'hangout_registrations', 'hangout_meetings', 'member_portfolio_projects', 'member_portfolio_pictures',
  'members', 'studio_pictures', 'studio_invitations', 'leads', 'lead_assignees', 'lead_tasks', 'task_assignees', 'meetings', 'copilot_objection_log', 'notifications', 'notification_outbox',
  'imports', 'import_rows', 'lead_events', 'maison_questions', 'credit_ledger', 'studio_credit_balances', 'settings']
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAJklEQVQoz2P8z8DAwMDAwMDIwMDAwMDAwMjAwMDAwMDAyMDAAAAoGwT9b3U1rwAAAABJRU5ErkJggg=='

/* The ghost-vs-page measure (the S17 / S23 / S24 probes'): in the held reveal every element carrying a page module's class in both, index by index
   after aligning the lists — the first screen only — and every Words sentence the ghost sets in a page class against that page's. */
async function measure(b, opts, url, blocks, max = 30) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks, max }) => {
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
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
    }
    const words = []
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words }
  }, { blocks, max })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const popups = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const context = async (o) => {
    const c = await b.newContext(o)
    await c.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) })
    await c.route('https://www.google.com/maps/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>maps</p>' }) })
    await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {})
    return c
  }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await snackText(p); if (re.test(s)) return s; await p.waitForTimeout(200) } return snackText(p) }
  const undo = async (p) => { await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).last().click() }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 250)) } return fn() }
  const chat = (p, name) => p.locator('[data-card="hangout-chat"]').filter({ has: p.getByTestId('chat-name').filter({ hasText: name }) })
  const menuItem = (p, name) => p.locator('[role="menu"]').last().getByRole('menuitem', { name })

  const you0 = sql(`select id from members where is_you = 1`)
  const kept = WHOLE.map((t) => [t, snapshot(t)])
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) text += `DELETE FROM ${t};\n${rows}\n`
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    runSql(text)
  }

  try {
    as('dane')
    const ctx = await context(opts())
    const p = await page(ctx, '1440')
    await go(p, '/leads', 2000)   // open one page and wait before reading the record (the habit after S08)
    const tok = (ev) => sql(`select page_token from hangout_participations where event_id = '${ev}'`)
    const PAGE = tok(TODAY), PASTPAGE = tok(PAST)
    ok(!!PAGE && !!PASTPAGE && Number(sql(`select count(*) from hangout_events where sample = 1`)) === 3, 'the demo’s Hangouts are on record (repair R144): three sample events, the studio’s pages for the two it takes part in')
    const LIM = sql(`select lead_id from hangout_registrations where name = 'Lim Wei Ling'`), CHLOE = sql(`select lead_id from hangout_registrations where name = 'Chloe Tan'`), RAHUL = sql(`select lead_id from hangout_registrations where name = 'Rahul Menon'`)
    const meetingOf = (lead) => sql(`select id from hangout_meetings where lead_id = '${lead}' and event_id = '${TODAY}'`)

    // ── 1 · Qanvast Ops › Hangouts ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Qanvast Ops › Hangouts — a live tab; the events, where the studio stands, Apply with Undo')
      await go(p, '/qanvast-ops', 1600)
      const tab = p.getByRole('tab', { name: 'Hangouts' })
      ok((await tab.getAttribute('href')) === '/qanvast-ops/hangouts', 'Qanvast Ops’ Hangouts tab is a destination (S16’s note: live)')
      await tab.click(); await settle(p, 2000)
      ok(new URL(p.url()).pathname === '/qanvast-ops/hangouts' && await p.getByTestId('hangouts').isVisible(), '…it opens the Hangouts')
      const cards = p.getByTestId('hangouts-list').locator('[data-phase]')
      const phases = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-phase')))
      ok(phases.join(',') === 'today,ahead,ended', 'today’s first, then what is ahead, then what has ended', phases.join(','))
      const words = await p.getByTestId('hangouts-list').locator('h2').allInnerTexts()
      ok(/Marina Bay/.test(words[0]) && /One-North/.test(words[1]) && /Suntec/.test(words[2]), '…each by its name from the feed', words.join(' | '))
      const chips = await p.getByTestId('hangouts-scope').locator('[role="radio"]').allInnerTexts()
      ok(chips.join('|') === 'All · 3|Open to apply · 1|Taking part · 1|Ended · 1', '1.0’s scopes in plain words, with their counts', chips.join(' | '))
      const lines = await p.getByTestId('hangout-line').allInnerTexts()
      const places = one(`select total_tables / tables_per_studio - studios_taking as n from hangout_events where id = '${NEXT}'`).n
      ok(lines.some((l) => l === `${places} places left`), 'an open one says the places left (1.0’s SpotsRemaining from the feed’s count)', lines.join(' | '))
      ok(lines.some((l) => /^Tables 7 and 8 · 3 designers on the plan · 3 booked$/.test(l)), 'today’s says its tables, its plan and its bookings', lines.join(' | '))
      ok((await p.getByTestId('hangouts-list').innerText()).includes('S$ 15,000 · 2 tables at S$ 7,500'), 'what a place costs: the tables at Qanvast’s price per table')
      ok(await p.getByTestId('hangouts-sample').isVisible(), 'the sample events say they are samples')
      await shot(p, '01-hangouts-1440')
      /* Apply → Undo → Apply → Take back */
      await p.getByTestId('hangout-apply').click()
      const s1 = await waitSnack(p, /Applied for Qanvast Hangout · One-North/)
      ok(sql(`select status || '|' || applied_by from hangout_participations where event_id = '${NEXT}'`) === 'applied|dane', 'Apply records the application (who) — Qanvast confirms', s1)
      await settle(p, 800)
      ok(/Applied by Dane — Qanvast confirms your place/.test(await p.getByTestId('hangouts-list').innerText()), '…the card says it waits for Qanvast')
      await undo(p); await waitFor(() => sql(`select status from hangout_participations where event_id = '${NEXT}'`) === 'withdrawn')
      ok(sql(`select status from hangout_participations where event_id = '${NEXT}'`) === 'withdrawn', 'Undo takes the application back')
      await settle(p, 1000)
      await p.getByTestId('hangout-apply').click(); await waitFor(() => sql(`select status from hangout_participations where event_id = '${NEXT}'`) === 'applied'); await settle(p, 1400)
      await p.getByTestId('hangout-withdraw').click()
      ok(/taken back/.test(await waitSnack(p, /taken back/)) && sql(`select status from hangout_participations where event_id = '${NEXT}'`) === 'withdrawn', 'Take back on the card, with its own Undo')
      await p.getByTestId('hangouts-scope').getByRole('radio', { name: /^Ended/ }).click(); await settle(p, 400)
      ok(await cards.count() === 1 && /Suntec/.test(await p.getByTestId('hangouts-list').innerText()), 'Ended shows the one that ended')
      as('germaine'); await go(p, '/qanvast-ops/hangouts', 1400)
      ok(await p.getByTestId('hangout-apply').count() === 0 && /An Owner or an Admin applies/.test(await p.getByTestId('hangouts-list').innerText()), 'a Designer sees no Apply — and why')
      as('dane')
    }

    // ── 2 · the plan ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · A Hangout’s Plan — who goes (chips up to the tables), shares, who to meet, Send to Qanvast; invite someone new')
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=plan`, 1600)
      ok((await p.getByRole('tablist', { name: 'Hangout views' }).getByRole('tab').allInnerTexts()).map((t) => t.replace(/\d+$/, '').trim()).join('|') === 'Plan|Chats|How it went', 'its views: Plan · Chats · How it went')
      ok((await p.getByTestId('hangout-tables').innerText()) === 'Tables 7 and 8', 'the facts: the tables Qanvast gave')
      ok(/^Sent to Qanvast on .+ by Dane$/.test(await p.getByTestId('hangout-plan-sent').innerText()), 'the plan says when it went to Qanvast, and who sent it')
      const michelle = p.locator('[data-testid="hangout-person"][data-member="michelle"]')
      const alex = p.locator('[data-testid="hangout-person"][data-member="alex"]')
      const alexChips = alex.getByTestId('hangout-shifts').getByRole('button')
      ok(await alexChips.count() === 2 && await alexChips.nth(0).isDisabled() && await alexChips.nth(1).isDisabled(), 'a shift with a designer at each table offers no more (one for each table)')
      /* Michelle has a chat waiting on the morning: she stays */
      const mChip = michelle.getByTestId('hangout-shifts').getByRole('button', { name: /^Morning/ })
      await mChip.click()
      let ref = await waitSnack(p, /Couldn’t/, 5000)
      if (!ref) { await settle(p, 1500); await mChip.click(); ref = await waitSnack(p, /Couldn’t/) }   // a cold first load: the press before the page is live
      ok(/Michelle has a chat on this shift — give it to someone else first/.test(ref) && sql(`select shift_ids from hangout_designers where event_id = '${TODAY}' and member_id = 'michelle'`).includes('marina-am'), 'taking off someone with a chat waiting on the shift is refused, and says why — the tick goes back', ref)
      await shot(p, '02-plan-1440', true)
      /* Qanvast's confirmation for One-North arrives through its feed: then the plan opens */
      const t = Date.now()
      sql(`insert into hangout_participations (id, event_id, status, tables, applied_at, applied_by, confirmed_at, page_token, updated_at) values ('probe-part', '${NEXT}', 'confirmed', '[21,22]', ${t}, 'dane', ${t}, 'probePageTokenOneNorth00', ${t}) on conflict(event_id) do update set status = 'confirmed', tables = '[21,22]', confirmed_at = ${t}, page_token = coalesce(hangout_participations.page_token, 'probePageTokenOneNorth00')`)
      await go(p, `/qanvast-ops/hangouts/${NEXT}?view=plan`, 1600)
      ok(/Not sent to Qanvast yet/.test(await p.getByTestId('hangout-plan-sent').innerText()) && await p.getByTestId('hangout-send').isVisible(), 'confirmed through the feed: the plan, not sent yet, with Send the plan to Qanvast as the one filled button')
      await p.getByTestId('hangout-send').click()
      const nobody = await waitSnack(p, /Couldn’t/)
      ok(/put someone on a shift first/i.test(nobody), 'Send with nobody at the tables is refused, and says why', nobody)
      const alexN = p.locator('[data-testid="hangout-person"][data-member="alex"]')
      await alexN.getByTestId('hangout-shifts').getByRole('button').first().click()
      await waitFor(() => sql(`select coalesce(shift_ids, '[]') from hangout_designers where event_id = '${NEXT}' and member_id = 'alex'`).includes('d1-am'))
      ok(sql(`select shift_ids from hangout_designers where event_id = '${NEXT}' and member_id = 'alex'`).includes('d1-am'), 'a tick puts Alex on the shift at once')
      await settle(p, 900)
      await alexN.getByTestId('hangout-shifts').getByRole('button').nth(1).click(); await waitFor(() => sql(`select shift_ids from hangout_designers where event_id = '${NEXT}' and member_id = 'alex'`).includes('d1-pm')); await settle(p, 900)
      /* shares: two on the plan now — the card shows; who to meet; the weights add to 100 */
      const sarahN = p.locator('[data-testid="hangout-person"][data-member="sarah"]')
      await sarahN.getByTestId('hangout-shifts').getByRole('button').first().click(); await waitFor(() => sql(`select coalesce(shift_ids,'') from hangout_designers where event_id = '${NEXT}' and member_id = 'sarah'`).includes('d1-am')); await settle(p, 1200)
      ok(await p.locator('[data-card="hangout-shares"]').isVisible() && /An even share each/.test(await p.getByTestId('hangout-share-total').innerText()), 'two on the plan: Share of the chats, an even share each until set', sql(`select group_concat(member_id || '=' || shift_ids) from hangout_designers where event_id = '${NEXT}'`))
      if (!await p.locator('[data-card="hangout-shares"]').isVisible()) await shot(p, 'debug-shares', true)
      await p.getByTestId('pref-kind').getByRole('button', { name: 'BTO' }).click()
      await p.locator('[data-card="hangout-prefs"]').locator('input').nth(2).fill('30'); await settle(p, 300)
      ok(/Together 105% — they add up to 100%/.test(await p.getByTestId('hangout-weight-total').innerText()), 'the weights say their total, and that it adds to 100')
      await p.getByTestId('hangout-plan-save').click()
      ok(/the weights add up to 100%/i.test(await waitSnack(p, /Couldn’t/)), 'Save with weights off 100 is refused, and says why')
      await p.locator('[data-card="hangout-prefs"]').locator('input').nth(2).fill('25'); await settle(p, 300)
      await p.getByTestId('hangout-plan-save').click(); await waitSnack(p, /Plan saved/)
      ok(JSON.parse(sql(`select preferences_json from hangout_participations where event_id = '${NEXT}'`)).propertyType.includes('BTO'), 'Save keeps who the studio would like to meet')
      await settle(p, 800)
      await p.getByTestId('hangout-send').click(); await waitSnack(p, /Plan sent to Qanvast/)
      ok(sql(`select plan_sent_by from hangout_participations where event_id = '${NEXT}'`) === 'dane', 'Send the plan to Qanvast: sent, by whom')
      /* invite someone new for this Hangout (S09's invitation carries the event) */
      await settle(p, 800)
      await p.getByTestId('hangout-invite').click(); await settle(p, 500)
      const dlg = p.getByRole('dialog', { name: 'Invite someone new' })
      await dlg.getByLabel('Name').fill('Probe Designer'); await dlg.getByLabel('Mobile').fill('98761234')
      await p.getByTestId('hangout-invite-send').click(); await waitSnack(p, /Probe Designer is on the team/)
      const inv = one(`select m.id, m.role, i.hangout_event_id as ev, d.id as d from members m join studio_invitations i on i.member_id = m.id left join hangout_designers d on d.member_id = m.id and d.event_id = '${NEXT}' where m.name = 'Probe Designer'`)
      ok(inv && inv.role === 'Designer' && inv.ev === NEXT && !!inv.d, 'Invite someone new: a Designer on the team, the invitation carrying this Hangout (1.0’s hangout_event_id), on the plan ready for a shift', JSON.stringify(inv))
      await settle(p, 1200)
      ok(/Invited — hasn’t joined yet/.test(await p.locator('[data-testid="hangout-person"][data-member="' + (inv?.id ?? '') + '"]').innerText().catch(() => '')), '…the plan says they are invited')
      as('germaine'); await go(p, `/qanvast-ops/hangouts/${TODAY}?view=plan`, 1400)
      ok(await p.getByTestId('hangout-send').count() === 0 && await p.getByTestId('hangout-invite').count() === 0 && await p.getByTestId('pref-kind').getByRole('button').first().isDisabled(), 'a Designer reads the plan — nothing to change')
      as('dane')
    }

    // ── 3 · the day ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · The day — Start, End (the lead’s meeting, its task), change the outcome, give, cancel with Undo, a walk-in, a break')
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1600)
      ok(await p.locator('[data-card="hangout-chat"]').count() === 3, 'today’s chats, each a card')
      await shot(p, '03-chats-1440')
      const lim = chat(p, 'Lim Wei Ling')
      /* (the calm UI build 2026-10-27, a deliberate change — 2-26) a waiting chat's head is its shift ("BOOKED ON YOUR PAGE" went); the facts say who
         and which table */
      ok(/With Germaine · Table 7/.test(await lim.getByTestId('chat-facts').innerText()) && /Morning, 11:00 AM – 3:00 PM/.test(await lim.innerText()), 'a chat says who, when and which table', await lim.getByTestId('chat-facts').innerText())
      const fit = one(`select match_score from hangout_meetings where lead_id = '${LIM}'`).match_score
      const fitWords = fit >= 70 ? 'Good match' : fit >= 40 ? 'Fair match' : 'Weak match'   // (the calm UI build 2026-10-27, a deliberate change) — "Fits you 80%" in words (W-191)
      ok((await lim.getByTestId('chat-prefs').innerText()).startsWith(`${fitWords} · BTO 4-Room`), '…how well they fit (1.0’s 0–100 score, in words) and what they told the studio', await lim.getByTestId('chat-prefs').innerText())
      await lim.getByTestId('chat-start').click(); await waitSnack(p, /Chat with Lim Wei Ling started/)
      ok(sql(`select status || '|' || started_by from hangout_meetings where lead_id = '${LIM}'`) === 'in-progress|dane', 'Start: on now, who started it')
      await settle(p, 800)
      await chat(p, 'Lim Wei Ling').getByTestId('chat-end').click(); await settle(p, 500)
      const end = p.getByRole('dialog', { name: 'End the chat with Lim Wei Ling' })
      await p.getByTestId('end-save').click(); await settle(p, 300)
      ok(/Pick how it went/.test(await end.innerText()), 'End asks how it went first')
      await p.getByTestId('end-outcome').getByRole('radio', { name: 'Follow-up' }).click()
      await p.getByTestId('end-reason').getByRole('radio', { name: 'Site visit needed' }).click()
      await end.getByLabel('The work in a line').fill('A BTO 4-room in Punggol, carpentry and flooring first')
      await end.locator('textarea').fill('Client: We collect the keys in three months.\nClient: Our budget is about 50k.\nClient: We love Scandinavian, light wood.')
      /* (S42E, call E·3 — a deliberate change: End now offers the lead's next stage, ticked, and opens the lead's own window; verify-pm2-s42e.cjs
         walks that. Here it is unticked, so the chat ends where it is, as this step was written.) */
      const follow = end.getByTestId('end-follow')
      if (await follow.count()) { await follow.locator('label').first().click(); await settle(p, 200) }
      await p.getByTestId('end-save').click()
      const endSnack = await waitSnack(p, /ended/)
      const held = one(`select status, outcome, sub_status, meeting_id, task_id, duration_min from hangout_meetings where lead_id = '${LIM}'`)
      ok(held.status === 'completed' && held.outcome === 'follow-up' && held.sub_status === 'Site visit needed' && held.duration_min >= 1, 'End: held, its outcome and reason (1.0’s), how long it ran', JSON.stringify(held))
      const lm = one(`select status, source, place, brief_json is not null as brief, member_ids from meetings where id = '${held.meeting_id}'`)
      ok(lm && lm.status === 'held' && lm.source === 'notes' && lm.brief === 1 && /Marina Bay Sands Expo, Hall B · Table 7/.test(lm.place) && lm.member_ids.includes('germaine'), '…it is the lead’s meeting — the notes, a brief made by rule, the venue and table, the designer', JSON.stringify(lm))
      const task = one(`select t.title, t.kind, t.done, (select group_concat(member_id) from task_assignees a where a.task_id = t.id) as who from lead_tasks t where t.id = '${held.task_id}'`)
      ok(task && task.title === 'Arrange a site visit with Lim' && task.kind === 'Follow-up' && task.who === 'germaine', '…its next step a follow-up task for the designer', JSON.stringify(task))
      ok(/“Arrange a site visit with Lim” is on their lead/.test(endSnack), '…said, with Open the lead', endSnack)
      await settle(p, 1000)
      ok((await chat(p, 'Lim Wei Ling').getByTestId('chat-outcome').innerText()).startsWith('Site visit needed — A BTO 4-room in Punggol'), 'the card: its reason and its scope')
      /* change the outcome: the task follows */
      await chat(p, 'Lim Wei Ling').getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Change the outcome').click(); await settle(p, 500)
      await p.getByTestId('end-outcome').getByRole('radio', { name: 'Converted' }).click()
      await p.getByTestId('end-save').click(); await waitSnack(p, /is now converted/)
      ok(sql(`select outcome || '|' || sub_status from hangout_meetings where lead_id = '${LIM}'`) === 'converted|Signed' && sql(`select title from lead_tasks where id = '${held.task_id}'`) === 'Start Lim’s quote', 'Change the outcome: converted (its one reason), and the open task follows')
      /* the lead's Activity and its Meetings tab */
      await go(p, `/leads/${LIM}/activity`, 1600)
      const act = await p.locator('main').innerText()
      ok(/booked a chat at “Qanvast Hangout · Marina Bay” on the studio’s page/.test(act) && /met Lim Wei Ling at “Qanvast Hangout · Marina Bay”, table 7 — converted: signed/.test(act), 'the lead’s Activity: booked on the studio’s page, met at the table with its outcome')
      /* give a chat to someone on its shift; cancel with Undo */
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1500)
      await chat(p, 'Rahul Menon').getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Give to Germaine').click(); await waitSnack(p, /Rahul Menon’s chat is Germaine’s/)
      ok(sql(`select member_id from hangout_meetings where lead_id = '${RAHUL}'`) === 'germaine' && Number(sql(`select count(*) from notifications where kind = 'hangout_meeting_assigned' and member_id = 'germaine'`)) >= 1, 'Give to Germaine: hers, and she hears it on the bell')
      await settle(p, 900)
      await chat(p, 'Rahul Menon').getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      ok(await menuItem(p, 'Give to Sarah').count() === 1 && await menuItem(p, 'Give to Michelle').count() === 0, '…only someone on its shift is offered')
      await menuItem(p, 'Give to Sarah').click(); await waitSnack(p, /Sarah’s/)
      await settle(p, 900)
      await chat(p, 'Chloe Tan').getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Cancel the chat').click()
      await waitSnack(p, /Chloe Tan’s chat cancelled/)
      ok(sql(`select status from hangout_meetings where lead_id = '${CHLOE}'`) === 'cancelled', 'Cancel the chat — said, with Undo')
      await undo(p); await waitFor(() => sql(`select status from hangout_meetings where lead_id = '${CHLOE}'`) === 'scheduled')
      ok(sql(`select status from hangout_meetings where lead_id = '${CHLOE}'`) === 'scheduled', '…Undo puts it back')
      /* a walk-in, through the capture path */
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1500)
      await p.locator('body').click({ position: { x: 5, y: 600 } }).catch(() => {}); await p.keyboard.press('c'); await settle(p, 600)   // C presses the view's create (the keyboard contract)
      const wd = p.getByRole('dialog', { name: 'Add a walk-in' })
      ok(await wd.isVisible(), 'C opens Add a walk-in (the view’s create)')
      await p.getByTestId('walkin-save').click(); await settle(p, 300)
      ok((await wd.innerText()).split('This field is required').length - 1 >= 3, 'a walk-in asks for their name, mobile and home first')
      await wd.getByLabel('Name').fill('probe walkin'); await wd.getByLabel('Mobile').fill('81234567')
      await wd.getByLabel('Their home').click(); await settle(p, 300); await p.getByRole('option', { name: 'HDB 4-Room', exact: true }).click(); await settle(p, 200)
      await wd.getByRole('radio', { name: 'S$40k–60k' }).click()
      await p.getByTestId('walkin-save').click(); await waitSnack(p, /Probe Walkin is booked/)
      const wk = one(`select r.via, r.created_by, l.source, l.name, l.budget_minor, m.status, m.member_id from hangout_registrations r join leads l on l.id = r.lead_id join hangout_meetings m on m.registration_id = r.id where r.phone = '81234567'`)
      ok(wk && wk.via === 'desk' && wk.created_by === 'dane' && wk.source === 'Hangout' && wk.name === 'Probe Walkin' && wk.budget_minor === 5_000_000 && wk.status === 'scheduled' && !!wk.member_id, 'a walk-in: a lead (source Hangout, its budget), booked at the table by whoever booked it, a chat with the shift’s designer', JSON.stringify(wk))
      ok(Number(sql(`select count(*) from imports where file_name = 'Hangout · Qanvast Hangout · Marina Bay'`)) >= 1, '…through the house capture path (a one-row import into the listing)')
      ok(Number(sql(`select count(*) from notification_outbox where event = 'client_hangout' and to_address like '%81234567%'`)) >= 1, '…and their own link goes to them (the outbox, WhatsApp)')
      /* a Designer: their own chats, a break */
      as('sarah'); await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1500)
      ok((await p.getByTestId('hangout-chat-scope').getByRole('radio', { checked: true }).innerText()).startsWith('Mine'), 'a Designer on the plan lands on their own chats (Mine)')
      await p.getByTestId('hangout-break').click(); const br = await waitSnack(p, /On a break/)
      ok(/no new chat is given to you meanwhile/.test(br) && sql(`select on_break_at is not null from hangout_designers where event_id = '${TODAY}' and member_id = 'sarah'`) === '1', 'On a break: no new chat is given to them meanwhile', br)
      await settle(p, 1200)
      await p.getByTestId('hangout-break').click(); await waitSnack(p, /Back at the table/)
      as('dane')
    }

    // ── 4 · how it went ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · How it went — 1.0’s Dashboard from the records')
      await go(p, `/qanvast-ops/hangouts/${PAST}`, 1600)
      ok((await p.getByTestId('hangout-page').getAttribute('data-view')) === 'results', 'an ended Hangout opens on How it went')
      const r = one(`select count(*) as held, sum(outcome = 'converted') as conv, sum(outcome = 'follow-up') as fu, sum(outcome = 'dropped') as dr from hangout_meetings where event_id = '${PAST}' and status = 'completed'`)
      const promised = sql(`select promised_meetings from hangout_events where id = '${PAST}'`)
      ok((await p.getByTestId('tile-held').innerText()).includes(`${r.held} of ${promised}`) && (await p.getByTestId('tile-converted').innerText()).includes(`${Math.round(r.conv / r.held * 100)}% of the chats held`), 'the tiles: held of promised, converted and its rate', await p.getByTestId('hangout-tiles').innerText())
      ok(await p.getByTestId('by-designer-row').count() === Number(sql(`select count(*) from hangout_designers where event_id = '${PAST}'`)), 'each designer’s chats (1.0’s ID Performance)')
      ok(await p.getByTestId('hangout-page-menu').count() === 0, 'an ended Hangout has no booking page to share')
      await shot(p, '04-results-1440')
      /* a homeowner met at the table has had contact: the bell never says Nur Aisyah (Dane's, met at Suntec) "has had no contact yet" */
      await p.locator('[data-notifications-tile]').first().click(); await p.getByTestId('notifications-panel').waitFor(); await settle(p, 1400)
      ok(!/Nur Aisyah has had no contact yet/.test(await p.getByTestId('notifications-panel').innerText()) && sql(`select stage from leads where id = 'plead-hangout'`) === 'New', 'a lead met at the Hangout’s table is never “untouched” on the bell (a held meeting is contact)')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* …and Last contact says the same — one rule (`lastContactOf`): the Lead stages card names the meeting */
      await go(p, '/leads/plead-hangout', 1600)
      const lc = p.getByTestId('last-contact')
      ok(await lc.getAttribute('data-empty') === null && /Visit · Meeting held/.test(await lc.innerText()), 'the Lead stages card’s Last contact is the meeting held at the Hangout (one rule with the bell)', await lc.innerText().catch(() => ''))   // (the calm UI build 2026-10-27, a deliberate change) — the channel in the log's words, "Visit" (2-08)
    }

    // ── 5 · the public page ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · The studio’s booking page — in its name; a booking is a lead; the designers’ cards; closed, ended, gone; 1.0’s old link')
      const pc = await context(opts()); const h = await page(pc, 'public')
      await go(h, `/hangout/${PAGE}`, 1600)
      const studio = sql(`select json_extract(value, '$.details.name') from settings where key = 'brand'`) || 'Demo Studio'
      const body = await h.locator('body').innerText()
      ok(!/OpenMaison/.test(body) && (await h.getByTestId('hangout-public-event').innerText()).includes('Meet ') && /Find us at tables 7 and 8/.test(body), 'the page is the studio’s — its name, the event, its tables — never the platform’s')
      const title = await h.title()
      ok(!/OpenMaison/.test(title) && /Hangout/.test(title), 'its link card names the studio and the event, never the platform', title)
      const ogImg = await h.locator('meta[property="og:image"]').getAttribute('content')
      ok(!!ogImg && (await h.request.get(ogImg)).status() === 200, '…with the studio’s card picture')
      const designers = await h.getByTestId('hangout-designers').getByTestId('designer-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-member')))
      ok(designers.join(',') === 'germaine,michelle,sarah', 'Who you’ll meet: the people on the plan', designers.join(','))
      const g = h.getByTestId('hangout-designers').locator('[data-member="germaine"]')
      ok(/10 years in interior design/.test(await g.innerText()) && /LANDED & PENTHOUSE/i.test(await g.innerText()) && /Morning, 11:00 AM – 3:00 PM · Evening/.test(await g.innerText()), 'a designer’s card: years, known for, when they are at the tables')
      const work = await g.getByTestId('work-tile').first()
      const src = await work.locator('img').getAttribute('src')
      ok(src && src.startsWith(`/hangout/${PAGE}/work/`) && (await h.request.get(BASE + src)).status() === 200, 'their work’s pictures through the page’s own address')
      const danesPic = sql(`select p.id from member_portfolio_pictures p join member_portfolio_projects w on w.id = p.portfolio_id where w.member_id = 'dane' limit 1`)
      ok((await h.request.get(`${BASE}/hangout/${PAGE}/work/${danesPic}`)).status() === 404, '…and never the work of someone not on that plan')
      await work.click(); await settle(h, 600)
      ok(await h.getByTestId('work-viewer').isVisible() && /3 of|1 of 3/.test(await h.getByTestId('work-viewer').innerText()), 'a piece of work opens its pictures')
      await h.keyboard.press('Escape'); await settle(h, 400)
      await shot(h, '05-public-1440', true)
      /* the booking */
      await h.getByTestId('book-submit').click(); await settle(h, 400)
      ok(/Tell us your name/.test(await h.getByTestId('hangout-book').innerText()) && /Tick the box/.test(await h.getByTestId('hangout-book').innerText()), 'Book asks what it needs, in a homeowner’s words')
      await h.getByLabel('Your name').fill('probe homeowner'); await h.getByLabel('Mobile').fill('91112223')
      await h.getByTestId('book-shift').getByRole('radio').last().click()
      await h.getByLabel('Your home').click(); await settle(h, 300); await h.getByRole('option', { name: 'Condo 3-bedder', exact: true }).click(); await settle(h, 200)
      await h.getByTestId('book-budget').getByRole('radio', { name: 'S$60k–80k' }).click()
      await h.getByTestId('book-consent').click()
      await h.getByTestId('book-submit').click()
      await h.waitForURL((u) => new URL(String(u)).pathname.split('/').length === 4, { timeout: 10000 }).catch(() => {}); await settle(h, 1200)
      const bk = one(`select r.via, r.token, l.source, l.name, l.property_type, m.member_id, m.table_number, m.match_score, (select group_concat(member_id) from lead_assignees a where a.lead_id = l.id) as holders from hangout_registrations r join leads l on l.id = r.lead_id join hangout_meetings m on m.registration_id = r.id where r.phone = '91112223'`)
      ok(bk && bk.via === 'page' && bk.source === 'Hangout' && bk.name === 'Probe Homeowner' && bk.property_type === 'Condo 3-bedder' && bk.member_id && bk.holders === bk.member_id && bk.match_score !== null, 'a booking: a lead (source Hangout) held by the designer the rule picked, its chat on the shift, its fit kept', JSON.stringify(bk))
      ok(new URL(h.url()).pathname === `/hangout/${PAGE}/${bk?.token}` && /You’re booked, Probe/.test(await h.getByTestId('hangout-own').innerText()), '…and their own page opens')
      await shot(h, '05-own-page-1440', true)
      ok(Number(sql(`select count(*) from notifications where kind = 'hangout_registered' and body like 'With%'`)) >= 2 && sql(`select group_concat(distinct member_id) from notifications where kind = 'hangout_registered'`).includes(bk?.member_id ?? '?'), 'the designer who meets them and the Owners and Admins hear it on the bell')
      ok(Number(sql(`select count(*) from notification_outbox where event = 'client_hangout' and to_address like '%91112223%'`)) === 1, '…their link went to them on WhatsApp (no email given, none sent)')
      /* the same number again: their booking back */
      await go(h, `/hangout/${PAGE}`, 1200)
      await h.getByLabel('Your name').fill('Probe Homeowner'); await h.getByLabel('Mobile').fill('91112223')
      await h.getByTestId('book-shift').getByRole('radio').first().click()
      await h.getByLabel('Your home').click(); await settle(h, 300); await h.getByRole('option', { name: 'Condo 3-bedder', exact: true }).click(); await settle(h, 200)
      await h.getByTestId('book-consent').click(); await h.getByTestId('book-submit').click()
      await h.waitForURL(/again=1/, { timeout: 10000 }).catch(() => {}); await settle(h, 1000)
      ok(/You’re booked already/.test(await h.getByTestId('hangout-own').innerText()) && Number(sql(`select count(*) from hangout_registrations where phone = '91112223'`)) === 1, 'the same number again: their booking, never a second')
      /* the homeowner's "I'm at the table" — shows on the studio's list */
      const homeTok = sql(`select token from hangout_registrations where name = 'Rahul Menon'`)
      await go(h, `/hangout/${PAGE}/${homeTok}`, 1200)
      const ready = h.getByTestId('own-ready')
      if (await ready.count()) {
        await ready.click(); await waitFor(() => sql(`select status from hangout_meetings where lead_id = '${RAHUL}'`) === 'in-progress')
        ok(sql(`select status || '|' || started_by from hangout_meetings where lead_id = '${RAHUL}'`) === 'in-progress|client', '“I’m at the table” starts their chat (1.0’s I’m Ready)')
        await settle(h, 1200)
        ok(/You’re with Sarah now at table 8/.test(await h.getByTestId('own-status').innerText()), '…their page says who they are with')
        await go(p, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1500)
        const rc = chat(p, 'Rahul Menon')
        ok(/^On now · \d+ of 45 minutes/i.test(await rc.innerText()) && await rc.getByTestId('chat-end').isVisible(), 'the studio’s list shows the chat on, ready to End', (await rc.innerText()).slice(0, 80))
      } else ok(false, 'Rahul’s page offers “I’m at the table” on the day')
      /* a homeowner whose chat is held: thanks, and what comes next by rule from its outcome (1.0's post-meeting step) */
      const limDone = sql(`select status from hangout_meetings where lead_id = '${LIM}'`) === 'completed'
      await go(h, `/hangout/${PAGE}/${sql(`select token from hangout_registrations where name = 'Lim Wei Ling'`)}`, 1200)
      const limPage = await h.getByTestId('hangout-own').innerText()
      ok(limDone ? /Thank you, Lim/.test(limPage) && /in touch about your quote|preparing your quote|a visit to your home|second meeting|Thank you for meeting/.test(await h.getByTestId('own-status').innerText()) : /You’re booked, Lim/.test(limPage), limDone ? 'a homeowner whose chat is held reads thanks, and what comes next by rule from how it went' : 'a homeowner’s page before their chat: booked')
      /* the studio's review link (Company › Profile, S14) and its WhatsApp: under who they'll meet, when the studio has them */
      sql(`update settings set value = json_set(value, '$.details.reviewLink', 'https://g.page/r/demo-studio-probe/review', '$.details.socials', json_object('whatsapp', '91234567')) where key = 'brand'`)
      await go(h, `/hangout/${PAGE}`, 1200)
      const rv = h.getByTestId('hangout-designers').locator('a').filter({ hasText: /’s reviews/ })
      ok(await rv.count() === 1 && (await rv.getAttribute('href')) === 'https://g.page/r/demo-studio-probe/review', 'the studio’s review link shows under who they’ll meet (S14’s link)')
      await h.getByTestId('hangout-designers').getByRole('button', { name: /Message .+/ }).click(); await settle(h, 800)
      ok(popups.some((u) => u.startsWith('https://wa.me/6591234567')), '…and Message {studio} opens WhatsApp to the studio, a line about this Hangout ready')
      /* closed, ended, gone, the old link */
      await go(p, `/qanvast-ops/hangouts/${TODAY}?view=plan`, 1400)
      await p.getByTestId('hangout-page-menu').click(); await settle(p, 400)
      await menuItem(p, 'Stop taking bookings').click(); await waitSnack(p, /stopped taking bookings/)
      await go(h, `/hangout/${PAGE}`, 1000)
      ok(/Bookings have closed/.test(await h.getByTestId('hangout-closed').innerText()), 'Stop taking bookings: the page says bookings have closed')
      await shot(h, '05-closed-1440')
      await undo(p); await waitFor(() => sql(`select page_closed_at is null from hangout_participations where event_id = '${TODAY}'`) === '1')
      await go(h, `/hangout/${PASTPAGE}`, 1000)
      ok(/This Hangout has ended/.test(await h.getByTestId('hangout-closed').innerText()), 'an ended Hangout’s page says so')
      await go(h, '/hangout/NoSuchPageTokenAtAll1234', 800)
      ok(await h.getByTestId('signing-page').getAttribute('data-state') === 'inactive', 'a page that is not there: the house notice in the studio’s name, never a 404')
      const old = await h.request.get(`${BASE}/hangouts/qh-2026-marina`, { maxRedirects: 0 })
      ok([307, 308].includes(old.status()) && (old.headers().location || '').endsWith(`/hangout/${PAGE}`), '1.0’s /hangouts/<event id> lands on the studio’s page for it', `${old.status()} ${old.headers().location}`)
      await pc.close()
    }

    // ── 6 · the public profile ──────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Public profile — the card, the work (upload, from a project), order, Undo; who may')
      await go(p, '/company/members', 1500)
      /* (the calm UI build 2026-10-27, a deliberate change — audit 5-01) a member row's Public profile is a row of its ⋮ now (`member-about` rides on it) */
      await p.locator('[data-member-id="germaine"] [data-testid="member-more"]').click(); await settle(p, 400)
      await p.locator('[role="menu"] [data-testid="member-about"]').getByRole('menuitem').click(); await settle(p, 2000)
      ok(new URL(p.url()).pathname === '/company/members/germaine/profile' && /Germaine’s public profile/.test(await p.locator('h1').first().innerText()), 'Members › Public profile opens their page (the About page dialog’s place)')
      await p.getByLabel('Years in interior design').fill('11'); await p.getByLabel('Job title').fill('Lead designer')
      ok(/Lead designer · 11 years in interior design/.test(await p.getByTestId('card-preview').innerText()), 'How clients see it follows the draft')
      await p.getByTestId('card-save').click(); await waitSnack(p, /public card is saved/)
      ok(sql(`select portal_title || '|' || portal_years from members where id = 'germaine'`) === 'Lead designer|11', 'Save changes keeps the title and the years')
      await undo(p); await waitFor(() => sql(`select portal_years from members where id = 'germaine'`) === '10')
      ok(sql(`select portal_title || '|' || portal_years from members where id = 'germaine'`) === 'Senior designer|10', '…Undo puts them back')
      await settle(p, 1200)
      /* a new piece of work, uploaded — C presses Add work */
      await p.locator('h1').first().click(); await p.keyboard.press('c'); await settle(p, 600)
      ok(await p.getByTestId('work-editor').isVisible(), 'C opens Add work (the page’s create)')
      await p.getByTestId('work-editor').getByLabel('Name').fill('Probe — a corner kitchen')
      await p.getByTestId('work-file').setInputFiles({ name: 'kitchen.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') }); await settle(p, 900)
      await p.getByTestId('work-save').click(); await waitSnack(p, /is on the profile/)
      const w = one(`select w.id, (select count(*) from member_portfolio_pictures p where p.portfolio_id = w.id and p.data like 'data:image/jpeg%') as pics from member_portfolio_projects w where w.title = 'Probe — a corner kitchen' and w.member_id = 'germaine'`)
      ok(w && w.pics === 1, 'Add work: the piece and its picture (the browser shrank it)', JSON.stringify(w))
      await settle(p, 1200)
      /* from a project's files */
      const tile = p.getByTestId('work-card').filter({ hasText: 'Probe — a corner kitchen' })
      await tile.getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Edit').click(); await settle(p, 600)
      await p.getByTestId('work-editor').getByLabel('The studio project it shows').click(); await settle(p, 300)
      await p.getByRole('option', { name: /^P-2026-002/ }).click(); await settle(p, 500)
      await p.getByTestId('work-project-pictures').locator('button').first().click(); await settle(p, 300)
      await p.getByTestId('work-save').click(); await waitSnack(p, /saved/)
      const fromFile = one(`select count(*) as n, max(source_file_id) as f from member_portfolio_pictures where portfolio_id = '${w?.id}' and deleted_at is null`)
      const proj = sql(`select project_id from member_portfolio_projects where id = '${w?.id}'`)
      ok(fromFile.n === 2 && !!fromFile.f && !!proj, 'a picture picked from the project’s files is kept with its source, the work tied to the project', JSON.stringify(fromFile))
      await settle(p, 1200)
      await p.getByTestId('work-card').filter({ hasText: 'Probe — a corner kitchen' }).getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Move earlier').click(); await settle(p, 1500)
      ok((await p.getByTestId('work-card').first().innerText()).includes('Probe — a corner kitchen'), 'Move earlier: clients see it first')
      await p.getByTestId('work-card').first().getByRole('button', { name: /More actions/ }).click(); await settle(p, 300)
      await menuItem(p, 'Take it off').click(); await waitSnack(p, /is off Germaine’s profile/)
      ok(sql(`select deleted_at is not null from member_portfolio_projects where id = '${w?.id}'`) === '1', 'Take it off — said, with Undo')
      await undo(p); await waitFor(() => sql(`select deleted_at is null from member_portfolio_projects where id = '${w?.id}'`) === '1')
      ok(sql(`select deleted_at is null from member_portfolio_projects where id = '${w?.id}'`) === '1', '…Undo puts it back')
      await shot(p, '06-profile-1440', true)
      /* who may */
      as('germaine'); await go(p, '/profile', 1400)
      await p.getByTestId('profile-public-link').click(); await settle(p, 2000)
      ok(/Your public profile/.test(await p.locator('h1').first().innerText()) && await p.getByTestId('card-save').count() === 1 && await p.getByTestId('card-shown').count() === 0, 'a Designer edits their own card from Your profile — who is on the About page stays the studio’s call')
      await go(p, '/company/members/michelle/profile', 1400)
      ok(await p.getByTestId('card-save').count() === 0 && await p.getByTestId('work-add').count() === 0, '…and reads a teammate’s')
      as('priya'); await go(p, '/company/members/germaine/profile', 1400)
      ok(await p.getByTestId('access-gate').isVisible(), 'Accounting: the house gate')
      await go(p, '/qanvast-ops/hangouts', 1200)
      ok(await p.getByTestId('access-gate').isVisible(), '…and no Hangouts')
      as('dane')
      /* the portal's Our team carries it */
      const C = await context(opts()); const c = await page(C, 'portal')
      await go(c, '/my/demo-studio/login', 1000)
      await c.locator('input[type="tel"]').fill('97731968')
      await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
      await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
      await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1200)
      await go(c, '/my/demo-studio/about', 1400)
      const gm = c.locator('[data-testid="about-member"]').filter({ hasText: 'Germaine' })
      ok(/Senior designer · 10 years in interior design/.test(await gm.innerText()) && await gm.getByTestId('about-member-work').locator('button').count() >= 1, 'the portal’s Our team: their years, what they are known for, their work')
      const psrc = await gm.getByTestId('about-member-work').locator('img').first().getAttribute('src')
      ok(psrc && psrc.includes('/about/work/') && (await c.request.get(BASE + psrc)).status() === 200 && !(await c.content()).includes('/company/work/'), '…through the portal’s own picture address, never the studio’s')
      await C.close()
    }

    // ── 7 · the meeting room, Maison AI, ⌘K ─────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · The meeting room’s Past projects reads the team’s work; Maison AI; ⌘K')
      const lead = sql(`select lead_id from hangout_registrations where name = 'Chloe Tan'`)
      const mid = 'probe-s27-room', t = Date.now()
      sql(`insert into meetings (id, lead_id, aim, where_kind, starts_at, ends_at, status, member_ids, notes, file_ids, state_json, created_by, created_at, updated_at) values ('${mid}', '${lead}', 'first_consultation', 'In person', ${t}, ${t + 3600000}, 'planned', '["michelle"]', '', '[]', '{}', 'dane', ${t}, ${t})`)
      await go(p, `/meetings/${mid}`, 1800)
      await p.getByTestId('room-consent').click(); await settle(p, 300)
      await p.getByTestId('room-start').click(); await settle(p, 2200)
      await p.getByTestId('room-tools').getByRole('button', { name: /Past projects/ }).click(); await settle(p, 600)
      const list = await p.getByTestId('portfolio-list').innerText().catch(() => '')
      ok(/Germaine|Michelle|Sarah|Dane/.test(list) && /A warm Scandinavian condo|A calm 5-room|A penthouse kitchen|A bright BTO|A family terrace/.test(list), 'Past projects: the team’s own work joins the studio’s projects (S23’s portfolio tool)', list.slice(0, 160))
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, `/qanvast-ops/hangouts/${PAST}?view=results`, 1400)
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Which member converted most here?' }).first().click(); await settle(p, 800)
      ok(/Germaine/.test(await p.locator('[role="dialog"]').last().innerText()) && /1 converted of 1 chat/.test(await p.locator('[role="dialog"]').last().innerText()), 'Maison AI answers from the Hangout’s records (S10’s rule — each row opens what it names)')
      await p.keyboard.press('Escape'); await settle(p, 300); await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, '/leads', 1200)
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await p.getByRole('combobox', { name: 'Search the studio' }).fill('hangouts'); await settle(p, 1200)
      const panel = p.getByRole('dialog', { name: 'Search' })
      ok(await panel.getByRole('group', { name: 'Go to' }).getByRole('option', { name: /Hangouts/ }).count() >= 1, '⌘K’s Go to offers the Hangouts')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 8 · widths and ghosts ───────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · 390 · 320 · 768 touch — no sideways scroll, sheets; the ghosts')
      const homeTok = sql(`select token from hangout_registrations where name = 'Lim Wei Ling'`)
      const urls = ['/qanvast-ops/hangouts', `/qanvast-ops/hangouts/${TODAY}?view=plan`, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, `/qanvast-ops/hangouts/${PAST}?view=results`, `/hangout/${PAGE}`, `/hangout/${PAGE}/${homeTok}`, '/company/members/germaine/profile']
      const tags = ['hangouts', 'plan', 'chats', 'results', 'public', 'own', 'profile']
      const mc = await context(phoneOpts()); const m = await page(mc, '390')
      for (const [i, u] of urls.entries()) { await go(m, u, 1400); ok(await sideways(m) <= 0, `390: no sideways scroll on ${u}`); await shot(m, `08-${tags[i]}-390`, true) }
      await go(m, `/qanvast-ops/hangouts/${TODAY}?view=meetings`, 1400)
      const bar = await m.getByTestId('hangout-chat-scope').evaluate((e) => e.closest('[class*="__bar"]').getBoundingClientRect().height)
      ok(bar <= 100, '390: the scope chips ride one rail', `${bar}px`)
      await m.locator('[data-card="hangout-chat"]').first().getByRole('button', { name: /More actions/ }).tap(); await settle(m, 600)
      const sheet = await m.locator('[role="menu"]').last().evaluate((e) => Math.round(e.getBoundingClientRect().bottom) - innerHeight).catch(() => null)
      ok(sheet !== null && Math.abs(sheet) <= 2, '390: a chat’s ⋮ is a bottom sheet', String(sheet))
      await m.keyboard.press('Escape'); await settle(m, 300)
      await shot(m, '08-chats-menu-390')
      await mc.close()
      for (const w of [320]) {
        const sc = await context(phoneOpts(w, 640)); const s = await page(sc, String(w))
        for (const i of [0, 2, 4, 5]) { await go(s, urls[i], 1300); ok(await sideways(s) <= 0, `${w}: no sideways scroll on ${urls[i]}`); if (i >= 4) await shot(s, `08-${tags[i]}-${w}`, true) }
        await sc.close()
      }
      const tc = await context(phoneOpts(768, 1024)); const t = await page(tc, '768')
      for (const u of [urls[0], urls[1], urls[2], urls[4]]) { await go(t, u, 1300); ok(await sideways(t) <= 0, `768 touch: no sideways scroll on ${u}`) }
      await tc.close()
      putBack()   // the ghosts are measured on the demo as found — the sections above changed its records (they go back again in finally)
      for (const [url, o, tag, blocks] of [
        ['/qanvast-ops/hangouts', opts(), '1440', ['hangouts.', 'card.card', 'card.head']], ['/qanvast-ops/hangouts', phoneOpts(), '390', ['hangouts.', 'card.card', 'card.head']],
        [`/qanvast-ops/hangouts/${TODAY}?view=plan`, opts(), '1440', ['hangouts.', 'card.card']], [`/qanvast-ops/hangouts/${TODAY}?view=plan`, phoneOpts(), '390', ['hangouts.', 'card.card']],
        [`/qanvast-ops/hangouts/${TODAY}?view=meetings`, opts(), '1440', ['hangouts.', 'meetings-view.', 'card.card']], [`/qanvast-ops/hangouts/${TODAY}?view=meetings`, phoneOpts(), '390', ['hangouts.', 'meetings-view.', 'card.card']],
        [`/qanvast-ops/hangouts/${PAST}?view=results`, opts(), '1440', ['hangouts.', 'card.card', 'stat-tile.']], [`/qanvast-ops/hangouts/${PAST}?view=results`, phoneOpts(), '390', ['hangouts.', 'card.card', 'stat-tile.']],
        [`/qanvast-ops/hangouts/${NEXT}`, opts(), '1440', ['hangouts.', 'card.card']], [`/qanvast-ops/hangouts/${NEXT}`, phoneOpts(), '390', ['hangouts.', 'card.card']],
        [`/hangout/${PAGE}`, opts(), '1440', ['public.', 'signing-page.top']], [`/hangout/${PAGE}`, phoneOpts(), '390', ['public.', 'signing-page.top']],
        [`/hangout/${PAGE}/${homeTok}`, opts(), '1440', ['public.', 'signing-page.top', 'designer-card.']], [`/hangout/${PAGE}/${homeTok}`, phoneOpts(), '390', ['public.', 'signing-page.top', 'designer-card.']],
        ['/company/members/germaine/profile', opts(), '1440', ['profile-view.card', 'profile-view.cardHead', 'public-profile.', 'designer-card.']], ['/company/members/germaine/profile', phoneOpts(), '390', ['profile-view.card', 'profile-view.cardHead', 'public-profile.']],
      ]) {
        const r = await measure(b, o, url, blocks, 16)
        if (r.none) { ok(false, `ghost of ${url} at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 3, `the ghost of ${url} at ${tag} lands where the page does`, off.slice(0, 4).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
        ok(r.words.length === 0, `…its words are the page’s at ${tag}`, r.words.slice(0, 3).join(' · '))
      }
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    ok(stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the leads’ stages and stage logs are as found')
    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
