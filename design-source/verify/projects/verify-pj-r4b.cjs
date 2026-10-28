// Projects round 4b — the client portal's project tabs: Schedule (the snapshot as last shared — a change not shared is absent; confirming a
// stage: Looks good · Something is not right with a note; the studio sees the answer on the Schedule's row, in the milestone panel, the bell,
// Activity, Needs attention; Ask again; an answered stage stays with its answer; refusals on the server — answered already, not asked, paused),
// Updates (published only, newest first, the stage each belongs to, the photo viewer with swipe and pinch, the opened stamp and the studio's
// "Seen by Benjamin"), the home (a stage to confirm in What needs you, Where the work stands, the Latest update), the Client access panel's
// Schedule · Updates rows and Waiting on him, and See it as the client recording nothing; phone 390 and desktop 1440.
// Run against `next start -p 3022` on a FRESH copy of the repaired scratch DB — never local.db. It puts members.is_you and the portal's
// Live / Paused back in `finally`; the answers it gives stay in the copy.
// Usage: NODE_PATH=<repo>/node_modules node verify-pj-r4b.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r4b')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3022'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const BEN = sql(`select id from leads where name='Benjamin Han' and deleted_at is null`)
const BEN_P = sql(`select id from projects where lead_id='${BEN}' and deleted_at is null`)
const HOME_ID = sql(`select homeowner_id from homeowner_lead_links where lead_id='${BEN}'`)
const MS = (prefix) => sql(`select id from project_milestones where project_id='${BEN_P}' and title like '${prefix}%' and deleted_at is null`)
const EL = MS('Electrical'), MA = MS('Masonry'), HA = MS('Hacking'), CA = MS('Carpentry')
const UP = (title) => sql(`select id from project_updates where project_id='${BEN_P}' and title='${title}' and deleted_at is null`)
const KITCHEN = UP('Kitchen cabinets are in'), FLOORING = UP('Flooring is laid in the living room'), WARDROBE = UP('Wardrobe carcass is up in the master bedroom')
const T0 = Math.floor(Date.now() / 1000) - 5
const count = (q) => Number(sql(q) || 0)
const evs = (kind, id) => count(`select count(*) from lead_events where project_id='${BEN_P}' and kind='${kind}' and json_extract(detail,'$.id')='${id}'`)
/* (S45C — the closing regression's note: every demo moment moves with the day of a restore, S42A) Every date this probe asserts is read from
   the records before anything changes, and worded by the app's own rules (lib/projects/schedule-model.ts: a day number is a local midnight;
   "Fri 13 Nov" · "13 Nov" · "28 Sep – 23 Oct"; lib/portal/schedule-model.ts: a stage's finishing day is the day it was marked done, else its
   last day as shared) — never the 14 Oct demo day's literals. */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const noOfIso = (s) => Math.round(Date.parse(`${s}T00:00:00Z`) / 864e5)
const atDay = (sec) => { const d = new Date(Number(sec) * 1000); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) }
const ymd = (n) => { const u = new Date(n * 864e5); return { d: u.getUTCDate(), m: MON[u.getUTCMonth()], y: u.getUTCFullYear(), w: WD[u.getUTCDay()] } }
const dayLabel = (n) => { const p = ymd(n); return `${p.w} ${p.d} ${p.m}` }
const dayMonth = (n) => { const p = ymd(n); return `${p.d} ${p.m}` }
const rangeLabel = (a, b) => { const p = ymd(a), q = ymd(b); return a === b ? `${p.d} ${p.m}` : p.y !== q.y ? `${p.d} ${p.m} ${p.y} – ${q.d} ${q.m} ${q.y}` : p.m === q.m ? `${p.d} – ${q.d} ${q.m}` : `${p.d} ${p.m} – ${q.d} ${q.m}` }
const msEnd = (id) => noOfIso(sql(`select date(end_date,'unixepoch','localtime') from project_milestones where id='${id}'`))
const [SHARE_AT, SNAP_JSON] = (() => { const r = sql(`select shared_at || '§' || snapshot from project_schedule_shares where project_id='${BEN_P}' order by shared_at desc limit 1`); const i = r.indexOf('§'); return [r.slice(0, i), r.slice(i + 1)] })()
const SNAP = JSON.parse(SNAP_JSON || '{"rows":[]}')
const SHARE_DAY = atDay(SHARE_AT), SNAP_HAND = noOfIso(SNAP.handover)
const SNAP_CARP = SNAP.rows.find((r) => r.id === CA) ?? { start: '', end: '' }
const LIVE_HAND = msEnd(MS('Handover')), LIVE_CARP_END = msEnd(CA)
const EL_DONE = (() => { const d = sql(`select done_at from project_milestones where id='${EL}'`); return d ? atDay(d) : noOfIso((SNAP.rows.find((r) => r.id === EL) ?? {}).end) })()
const MA_ANSWERED = atDay(sql(`select confirm_answered_at from project_milestones where id='${MA}'`))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  /* (REG-1050) the phone's bar: four tabs and More, as the studio's dock — a section is in the bar or in More's sheet */
  const portalSections = async (p) => {
    const bar = await p.locator('[data-testid="portal-dock"] > [data-key]').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
    let more = []
    if (bar.includes('more')) {
      await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(600)
      more = await p.locator('[data-testid="portal-more-sheet"] a').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
      await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    }
    return { bar, more, all: [...bar.filter((k) => k !== 'more'), ...more] }
  }
  const openFromMore = async (p, key) => { await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(600); await p.locator(`[data-testid="portal-more-sheet"] a[data-key="${key}"]`).click() }
  const signIn = async (p) => {
    await go(p, '/my/demo-studio/login'); await settle(p, 400)
    await p.locator('input[type="tel"]').fill('97731968')
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
  }
  const stage = (p, id) => p.locator(`[data-testid="portal-stage"][data-stage-id="${id}"]`)
  const card = (p) => p.locator('[data-testid="portal-confirm"]')
  const pointer = (loc, type, id, x, y) => loc.dispatchEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 })

  try {
    ok(!!EL && !!MA && !!HA && !!KITCHEN && !!HOME_ID, 'Benjamin Han’s project, its stages, updates and his portal record are there (R73)')
    ok(sql(`select confirm_answer from project_milestones where id='${MA}'`) === 'confirmed' && sql(`select coalesce(confirm_answer,'') || '|' || (confirm_asked_at is not null) from project_milestones where id='${EL}'`) === '|1', 'R73: Masonry & tiling confirmed earlier; Electrical & plumbing asked, not answered')
    ok(!sql(`select client_opened_at from project_updates where id='${KITCHEN}'`) && !!sql(`select client_opened_at from project_updates where id='${FLOORING}'`), 'R73: his updates opened — all but the newest')

    // ── The home on a phone ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The home (390)')
    const C = await phone(); const p = await C.newPage(); watch(p, 'client-390')
    await signIn(p)
    const needs = p.locator('[data-testid="portal-needs"]')
    ok(/\d+ things? needs? you/.test(await needs.innerText()) && await p.locator('[data-testid="portal-need"][data-kind="stage"]').count() === 1, 'What needs you gains a stage to confirm (other rounds add their own needs)')
    ok(new RegExp(`Confirm that electrical and plumbing is done[\\s\\S]*Finished ${dayMonth(EL_DONE)} · have a look and confirm`).test(await p.locator('[data-testid="portal-need"][data-kind="stage"]').innerText()), `board 1’s words: "Confirm that electrical and plumbing is done · Finished ${dayMonth(EL_DONE)} · have a look and confirm"`)
    { const sec = await portalSections(p); ok(sec.bar.slice(0, 3).join(',') === 'home,schedule,updates' && sec.bar[sec.bar.length - 1] === 'more' && sec.more[sec.more.length - 1] === 'files', 'the section bar: Home · Schedule · Updates first, More last with Files at its end (REG-1050)') }
    const stands = await p.locator('[data-testid="portal-stands"]').innerText()
    ok(/Carpentry is under way/.test(stands) && stands.includes(`3 of 7 milestones done. Handover is planned for ${dayLabel(SNAP_HAND)}.`), `Where the work stands, from the snapshot: "Carpentry is under way · 3 of 7 milestones done. Handover is planned for ${dayLabel(SNAP_HAND)}." (the calm UI build 2026-10-27, a deliberate change: the client says milestones)`)
    ok(LIVE_HAND !== SNAP_HAND && !(await p.locator('main').innerText()).includes(dayMonth(LIVE_HAND)), `…the handover not shared yet (${dayMonth(LIVE_HAND)}) is nowhere on the page`)
    const latest = p.locator('[data-testid="portal-latest-update"]')
    /* (S42 A-03, R125) the demo's newest updates stay recent — every demo date moves with the day of the reset — so the line is read by its
       shape (a weekday, a day and a month), never by a calendar date */
    ok(/Latest update · (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) · from Dane/.test(await latest.innerText()) && /Kitchen cabinets are in/.test(await latest.innerText()), 'the Latest update: the newest published update')
    ok(await latest.locator('[data-fresh-client]').count() === 1, '…marked New — he has not opened it')
    ok(await noOverflow(p), 'no sideways scroll at 390')
    await shot(p, 'home-390', true)
    await p.locator('[data-testid="portal-latest-update"]').scrollIntoViewIfNeeded(); await settle(p, 1600)
    ok(!!sql(`select client_opened_at from project_updates where id='${KITCHEN}'`), 'on his screen it counts as opened — client_opened_at is stamped')

    // ── The Schedule on a phone ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The Schedule (390)')
    const seenBefore = sql(`select schedule_seen_at from homeowner_lead_links where lead_id='${BEN}'`)
    await p.locator('[data-testid="portal-need"][data-kind="stage"]').click(); await p.waitForURL(/\/schedule/); await settle(p, 1500)
    ok((await p.locator('[data-testid="portal-schedule-lede"]').innerText()).includes(`Handover is planned for ${dayLabel(SNAP_HAND)}. Last updated ${dayMonth(SHARE_DAY)}.`), `board 2’s lede: "Handover is planned for ${dayLabel(SNAP_HAND)}. Last updated ${dayMonth(SHARE_DAY)}."`)
    ok(await p.locator('[data-testid="portal-stage"]').count() === 7, 'the seven stages as shared')
    { const shared = rangeLabel(noOfIso(SNAP_CARP.start), noOfIso(SNAP_CARP.end))
      ok((await stage(p, CA).innerText()).includes(shared) && /Under way/.test(await stage(p, CA).innerText()) && LIVE_CARP_END !== noOfIso(SNAP_CARP.end), `Carpentry as shared — ${shared}, Under way: the week it moved since is not shared, so it is absent`) }
    ok(/Confirmed/.test(await stage(p, MA).innerText()) && (await stage(p, MA).innerText()).includes(`You confirmed it ${dayMonth(MA_ANSWERED)}`), `the stage he confirmed earlier keeps its answer (Masonry & tiling, ${dayMonth(MA_ANSWERED)})`)
    ok(/Please confirm/.test(await stage(p, EL).innerText()), 'Electrical & plumbing: Please confirm')
    ok(/Electrical and plumbing is finished/.test(await card(p).innerText()) && (await card(p).innerText()).includes(`marked this milestone done on ${dayMonth(EL_DONE)}. Have a look when you are next at the flat, then tell us.`), 'the confirm card in board 2’s words (the calm UI build 2026-10-27, a deliberate change: the client says milestones)')
    ok(await noOverflow(p), 'no sideways scroll at 390')
    await shot(p, 'schedule-390', true)
    ok(sql(`select schedule_seen_at from homeowner_lead_links where lead_id='${BEN}'`) !== seenBefore, 'his look at the Schedule is noted (what changes after it will be marked)')
    /* a second page left open on the same stage — answered on the first, its press is refused */
    const p2 = await C.newPage(); watch(p2, 'client-390-b'); await go(p2, '/my/demo-studio/schedule'); await settle(p2, 600)
    await p.locator('[data-testid="portal-confirm-yes"]').click(); await settle(p, 1500)
    ok(await card(p).getAttribute('data-answered') === 'confirmed' && /Thank you/.test(await card(p).innerText()), 'Looks good: the card thanks him')
    ok(/Demo Studio knows electrical and plumbing looks good/.test(await snack(p).innerText()), '…and the snackbar says the studio knows')
    ok(sql(`select confirm_answer || '|' || confirm_answered_by from project_milestones where id='${EL}'`) === `confirmed|${HOME_ID}`, 'the answer is written back to the milestone, with who gave it')
    ok(evs('project_stage_confirmed', EL) === 1, 'an event for Activity')
    ok(count(`select count(*) from notifications where kind='stage_confirmed' and lead_id='${BEN}' and created_at >= ${T0}`) >= 1, 'a bell row for the team')
    ok(/Confirmed/.test(await stage(p, EL).innerText()), 'its row says Confirmed at once')
    await shot(p, 'confirmed-390', true)
    await p2.locator('[data-testid="portal-confirm-yes"]').click(); await settle(p2, 1200)
    ok(/already answered for this milestone/.test(await snack(p2).innerText()) && evs('project_stage_confirmed', EL) === 1, 'a second press (a page left open) is refused on the server — answered already')
    await p2.close()
    await go(p, '/my/demo-studio/schedule'); await settle(p, 800)
    ok(await card(p).count() === 0 && /Confirmed/.test(await stage(p, EL).innerText()) && /You confirmed it/.test(await stage(p, EL).innerText()), 'reloaded, the answered stage stays — with its answer (1.0 dropped it, I-263)')

    // not asked: the studio stops asking while his page is open
    sql(`update project_milestones set confirm_asked_at = strftime('%s','now') where id='${HA}'`)
    await go(p, '/my/demo-studio/schedule'); await settle(p, 600)
    ok(await card(p).count() === 1 && /Hacking and demolition is finished/.test(await card(p).innerText()), 'a stage the studio asks about gets its card')
    sql(`update project_milestones set confirm_asked_at = null where id='${HA}'`)
    await p.locator('[data-testid="portal-confirm-yes"]').click(); await settle(p, 1200)
    ok(/hasn’t asked you to confirm this milestone/.test(await snack(p).innerText()) && !sql(`select confirm_answer from project_milestones where id='${HA}'`), 'a confirm on a stage not asked is refused on the server — and nothing is written')

    // Something is not right
    sql(`update project_milestones set confirm_asked_at = strftime('%s','now') where id='${HA}'`)
    await go(p, '/my/demo-studio/schedule'); await settle(p, 600)
    await p.locator('[data-testid="portal-confirm-no"]').click(); await settle(p, 700)
    const dlg = p.locator('[role="dialog"]')
    ok(await dlg.isVisible() && /Something is not right/.test(await dlg.innerText()) && /what you noticed with hacking and demolition/.test(await dlg.innerText()), '"Something is not right" asks what he noticed — a form sheet on a phone')
    await p.locator('[data-testid="portal-not-right-send"]').click(); await settle(p, 500)
    ok(/Say what is not right/.test(await dlg.innerText()) && !sql(`select confirm_answer from project_milestones where id='${HA}'`), 'Send with nothing written says what it needs, and sends nothing')
    await shot(p, 'not-right-390')
    await dlg.locator('textarea').fill('There is still a crack in the kitchen wall near the window.')
    await p.locator('[data-testid="portal-not-right-send"]').click(); await settle(p, 1500)
    ok(!(await dlg.isVisible()) && await card(p).getAttribute('data-answered') === 'changes' && /look at it with you/.test(await card(p).innerText()), 'Sent: the sheet closes once it lands, the card thanks him')
    ok(sql(`select confirm_answer || '|' || confirm_note from project_milestones where id='${HA}'`) === 'changes|There is still a crack in the kitchen wall near the window.', 'the answer and his note are on the milestone')
    ok(evs('project_stage_changes', HA) === 1 && count(`select count(*) from notifications where kind='stage_changes' and lead_id='${BEN}' and created_at >= ${T0}`) >= 2, 'its event, and bell rows for the team and the Owners and Admins')
    ok(/With your designer/.test(await stage(p, HA).innerText()) && /You said something is not right: “There is still a crack/.test(await stage(p, HA).innerText()), 'its row keeps the answer: With your designer, and what he said')
    {   // (REG-1165, F-27) the studio's move reads grey, as a stage still to come — amber is only what waits on the client
      const colour = (sel) => p.locator(sel).first().evaluate((e) => getComputedStyle(e).color)
      ok(await colour(`[data-testid="portal-stage"][data-stage-id="${HA}"] [data-tone="changes"]:not([aria-hidden])`) === await colour('[data-testid="portal-stage"] span[data-tone="next"]:not([aria-hidden])'), '“With your designer” is grey, not the amber of “Please confirm”')
    }
    await shot(p, 'not-right-sent-390', true)

    // ── Updates on a phone ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Updates (390)')
    sql(`update project_updates set client_opened_at = null where id='${KITCHEN}'`)
    await p.locator('[data-testid="portal-dock"] a[data-key="updates"]').click(); await p.waitForURL(/\/updates$/)
    await p.locator('[data-testid="portal-updates"]').waitFor({ timeout: 10000 }); await settle(p, 400)   // the section bar fetches the page fresh: its ghost, then the page
    const ups = p.locator('[data-testid="client-update"]')
    /* the rule, not a count: every published update and nothing else (fix-F's R77b adds board 3's water test) */
    const published = Number(sql(`select count(*) from project_updates u join projects p on p.id = u.project_id where p.lead_id='${BEN}' and u.status='published' and u.deleted_at is null`))
    ok(await ups.count() === published && !/Wardrobe carcass|Feature wall panels/.test((await ups.allInnerTexts()).join(' ')), 'only the published updates — not the one sent back nor the one in review')
    ok(/Kitchen cabinets are in/.test(await ups.nth(0).innerText()) && /Hacking is done/.test(await ups.nth(published - 1).innerText()), 'newest first')
    ok(/CARPENTRY FABRICATION|Carpentry fabrication/.test(await ups.nth(0).innerText()), 'each with the stage it belongs to')
    ok(await ups.nth(0).getAttribute('data-fresh-client') !== null && /New/i.test(await ups.nth(0).innerText()), 'New on the one he has not opened')
    await settle(p, 1500)
    ok(!!sql(`select client_opened_at from project_updates where id='${KITCHEN}'`), 'opening it records client_opened_at')
    ok(await noOverflow(p), 'no sideways scroll at 390')
    await shot(p, 'updates-390', true)
    await ups.nth(0).locator('[data-testid="client-update-photo"]').first().click(); await settle(p, 900)
    const viewer = p.locator('[data-testid="photo-viewer"]')
    ok(await viewer.isVisible() && await viewer.getAttribute('data-index') === '0' && /1 of 2/.test(await p.locator('[data-testid="viewer-count"]').innerText()), 'a photo opens the viewer — the whole screen on a phone, "1 of 2"')
    await shot(p, 'viewer-390')
    await pointer(viewer, 'pointerdown', 1, 320, 420); await pointer(viewer, 'pointermove', 1, 200, 425); await pointer(viewer, 'pointermove', 1, 80, 430); await pointer(viewer, 'pointerup', 1, 80, 430); await settle(p, 500)
    ok(await viewer.getAttribute('data-index') === '1', 'a swipe walks to the next photo')
    await pointer(viewer, 'pointerdown', 1, 150, 420); await pointer(viewer, 'pointerdown', 2, 240, 420)
    await pointer(viewer, 'pointermove', 1, 100, 420); await pointer(viewer, 'pointermove', 2, 290, 420)
    await pointer(viewer, 'pointerup', 1, 100, 420); await pointer(viewer, 'pointerup', 2, 290, 420); await settle(p, 400)
    ok(Number(await viewer.getAttribute('data-zoom')) > 1.5, 'a pinch zooms in')
    await shot(p, 'viewer-pinched-390')
    await p.keyboard.press('Escape'); await settle(p, 500)
    ok(!(await viewer.isVisible()), 'Esc closes it')
    const photoId = sql(`select file_id from project_update_files where update_id='${KITCHEN}' order by position limit 1`)
    const wardrobePhoto = sql(`select file_id from project_update_files where update_id='${WARDROBE}' order by position limit 1`)
    const r1 = await p.request.get(BASE + `/my/demo-studio/file/${photoId}`, { maxRedirects: 0 })
    const r2 = await p.request.get(BASE + `/my/demo-studio/file/${wardrobePhoto}`, { maxRedirects: 0 })
    ok([200, 307].includes(r1.status()) && r2.status() === 404, 'the portal’s file route opens a published update’s photo and refuses one sent back (404)')

    // ── The studio's side at a desk ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('The studio (1440, Dane)')
    sql(`update members set is_you = (id = 'dane')`)
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio-1440')
    await go(s, '/projects')
    ok(/Benjamin says something is not right/.test(await s.locator('main').innerText()), 'Needs attention: "Benjamin says something is not right"')
    await go(s, `/projects/${BEN_P}/schedule`); await settle(s, 600)
    const row = (id) => s.locator(`[data-kb-id="${id}"]`).first()
    ok((await row(MA).innerText()).includes(`Shared ${dayMonth(SHARE_DAY)} · Benjamin confirmed it ${dayMonth(MA_ANSWERED)}`), `layer 6 on the row: "Shared ${dayMonth(SHARE_DAY)} · Benjamin confirmed it ${dayMonth(MA_ANSWERED)}"`)
    ok((await row(EL).innerText()).includes(`Shared ${dayMonth(SHARE_DAY)} · Benjamin confirmed it`), '…his answer of today on Electrical & plumbing')
    ok(/Benjamin says something is not right/.test(await row(HA).innerText()), '…and "Benjamin says something is not right" on Hacking & demolition')
    await go(s, `/projects/${BEN_P}/schedule?open=${HA}`); await settle(s, 900)
    const panel = s.locator('[data-testid="milestone-panel"]')
    ok((await panel.innerText()).includes(`Shared with Benjamin ${dayMonth(SHARE_DAY)} as done`), `the panel: Shared with Benjamin ${dayMonth(SHARE_DAY)} as done`)
    ok(await s.locator('[data-testid="panel-client-answer"]').getAttribute('data-answer') === 'changes' && /There is still a crack in the kitchen wall/.test(await s.locator('[data-testid="panel-client-answer"]').innerText()), '…Benjamin says something is not right, with his words')
    await shot(s, 'panel-changes-1440')
    await s.locator('[data-testid="panel-ask-again"]').click(); await settle(s, 1500)
    ok(!sql(`select confirm_answer from project_milestones where id='${HA}'`) && !!sql(`select confirm_asked_at from project_milestones where id='${HA}'`) && evs('project_stage_asked', HA) === 1, 'Ask Benjamin again: the answer is cleared, the ask stamped anew, with its event')
    ok(/Asked Benjamin again/.test(await snack(s).innerText()), '…and the snackbar says so')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, `/projects/${BEN_P}/activity`)
    const act = await s.locator('main').innerText()
    ok(/Benjamin Han confirmed that “Electrical & plumbing” is done/.test(act) && /Benjamin Han said something is not right with “Hacking & demolition”: “There is still a crack/.test(act) && /asked Benjamin Han again to confirm/.test(act), 'Activity: his two answers and the ask again')
    await go(s, `/projects/${BEN_P}/updates`)
    const post = (t) => s.locator('[data-testid="update-post"]').filter({ has: s.locator('h3', { hasText: t }) }).first()
    ok(/Seen by Benjamin/.test(await post('Kitchen cabinets are in').innerText()) && /Seen by Benjamin/.test(await post('Flooring is laid in the living room').innerText()), 'the Updates feed: "Seen by Benjamin {when}"')
    await post('Kitchen cabinets are in').locator('[data-testid="update-kebab"]').click(); await settle(s, 300)
    const wd = s.getByRole('menuitem', { name: /^Withdraw/ })
    ok(await wd.getAttribute('aria-disabled') === 'true', '…and Withdraw now refuses — he has seen it')
    await s.keyboard.press('Escape'); await settle(s, 300)
    await shot(s, 'studio-updates-1440')
    await go(s, `/projects/${BEN_P}`)
    await s.getByRole('button', { name: 'More options' }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /^(Client portal|Invite to Portal)$/ }).click(); await settle(s, 1500) /* (the calm UI build 2026-10-27, a deliberate change) the menu row reads "Client portal" (3-25 · W-218) */   // (one-home N-15, a deliberate change of this rule) the panel and the project ⋮ item are "Invite to Portal" now
    const sections = await s.locator('[data-testid="access-sections"]').innerText()
    { const pub = Number(sql(`select count(*) from project_updates u join projects p on p.id = u.project_id where p.lead_id='${BEN}' and u.status='published' and u.deleted_at is null`))
      ok(new RegExp(`Schedule[\\s\\S]*Shared ${dayMonth(SHARE_DAY)} · 1 milestone to confirm`).test(sections) && new RegExp(`Updates[\\s\\S]*${pub} published · 1 waiting for review`).test(sections), `Client access › What Benjamin can see: Schedule "Shared ${dayMonth(SHARE_DAY)} · 1 milestone to confirm" (the calm UI build 2026-10-27, a deliberate change: the client says milestones) · Updates "${pub} published · 1 waiting for review"`) }
    ok(/Confirm that hacking and demolition is done/.test(await s.locator('[data-testid="access-waiting"]').innerText()), '…Waiting on Benjamin: the stage asked again')
    await shot(s, 'access-1440')
    await s.keyboard.press('Escape'); await settle(s, 300)
    /* the studio shares the four changes he has not been shown — his next look marks them */
    await go(s, `/projects/${BEN_P}/schedule?share=1`); await settle(s, 900)   // (simplify S-02, a deliberate change of this rule) the header is Needs you's top row (Dane's approvals first) — Share opens from its row's deep link
    await s.locator('[data-testid="share-confirm"]').click(); await settle(s, 1800)
    ok(count(`select count(*) from project_schedule_shares where project_id='${BEN_P}'`) === 2, 'Share changes stores the next copy he will read')

    // ── See it as the client records nothing ─────────────────────────────────────────────────────────────────────────────
    console.log('See it as the client (1440)')
    sql(`update project_updates set client_opened_at = null where id='${KITCHEN}'`)
    const seenWas = sql(`select schedule_seen_at from homeowner_lead_links where lead_id='${BEN}'`)
    const evWas = count(`select count(*) from lead_events where project_id='${BEN_P}'`)
    await go(s, `/my/demo-studio/preview?client=${encodeURIComponent(BEN)}`); await settle(s, 1200)
    ok(await s.locator('[data-testid="portal-preview-bar"]').isVisible(), 'the studio’s preview of his page')
    const pv = (/\/my\/[^/?#]+/.exec(new URL(s.url()).pathname) || ['/my/demo-studio'])[0]   // fix-G G-03: a preview rides in its own address, /my/<slug>~<id>
    await s.locator('[data-testid="portal-latest-update"]').scrollIntoViewIfNeeded(); await settle(s, 1200)
    await go(s, `${pv}/schedule`); await settle(s, 1200)
    ok(await card(s).count() === 1 && await s.locator('[data-testid="portal-confirm-yes"]').isDisabled() && /A preview — answers aren’t saved/.test(await card(s).innerText()), 'the stage to confirm shows, its buttons off: "A preview — answers aren’t saved."')
    await shot(s, 'preview-schedule-1440', true)
    await go(s, `${pv}/updates`); await settle(s, 1800)
    ok(!sql(`select client_opened_at from project_updates where id='${KITCHEN}'`) && sql(`select schedule_seen_at from homeowner_lead_links where lead_id='${BEN}'`) === seenWas && count(`select count(*) from lead_events where project_id='${BEN_P}'`) === evWas, 'nothing is recorded as his — no update opened, no look at the Schedule, no event')
    await S.close()

    // ── At a desk: the pages, and Paused refusing ────────────────────────────────────────────────────────────────────────
    console.log('Benjamin at a desk (1440) · Paused')
    const D = await desk(); const d = await D.newPage(); watch(d, 'client-1440')
    await signIn(d)
    ok((await d.locator('main').innerText()).includes(`Carpentry is under way; handover is planned for ${dayLabel(LIVE_HAND)}.`) && /3 of 7 milestones done/.test(await d.locator('[data-testid="portal-stands"]').innerText()), `once shared, the home reads the new handover, ${dayLabel(LIVE_HAND)} (board 7’s line and its stage list)`)
    await shot(d, 'home-1440', true)
    await go(d, '/my/demo-studio/schedule'); await settle(d, 600)
    ok(await card(d).count() === 1 && await noOverflow(d), 'the Schedule at 1440: the stage asked again, beside the studio’s note')
    ok((await d.locator('[data-testid="portal-schedule-lede"]').innerText()).includes(`Handover is planned for ${dayLabel(LIVE_HAND)}.`), 'the lede reads the new share')
    /* (fix-F, F-26) a move is said once on its row: the old range struck, then the new */
    ok(await d.locator('[data-testid="portal-stage-mark"]').count() === 4 && (await stage(d, CA).locator('[data-testid="portal-stage-dates"] s').innerText()).includes(dayMonth(noOfIso(SNAP_CARP.end))) && (await stage(d, CA).locator('[data-testid="portal-stage-dates"]').innerText()).trim().endsWith(dayMonth(LIVE_CARP_END)), `what changed since he last looked is marked on its rows — Carpentry: its old dates struck, then ending ${dayMonth(LIVE_CARP_END)}`)
    ok(/Since you last looked on/.test(await d.locator('[data-testid="portal-schedule-changes"]').innerText()) && (await d.locator('[data-testid="portal-schedule-news"]').innerText()).includes(`Handover is now ${dayLabel(LIVE_HAND)}`), `…listed beside them, with the news: "Handover is now ${dayLabel(LIVE_HAND)}"`)
    await shot(d, 'schedule-1440', true)
    await go(d, '/my/demo-studio/schedule'); await settle(d, 600)
    ok(await d.locator('[data-testid="portal-stage-mark"]').count() === 0, 'looked at once, the marks are gone on his next look')
    await go(d, '/my/demo-studio/updates'); await settle(d, 900)
    await shot(d, 'updates-1440', true)
    await d.locator('[data-testid="client-update-photo"]').first().click(); await settle(d, 900)
    await d.keyboard.press('ArrowRight'); await settle(d, 400)
    ok(await d.locator('[data-testid="photo-viewer"]').getAttribute('data-index') === '1', 'at a desk the arrow keys walk the photos')
    await shot(d, 'viewer-1440')
    await d.keyboard.press('Escape'); await settle(d, 400)
    await go(d, '/my/demo-studio/schedule'); await settle(d, 600)
    sql(`update settings set value=json_set(value,'$.paused',json('true')) where key='portal'`)
    await d.locator('[data-testid="portal-confirm-yes"]').click(); await settle(d, 1200)
    ok(/Demo Studio’s portal is paused/.test(await snack(d).innerText()) && !sql(`select confirm_answer from project_milestones where id='${HA}'`), 'Paused: a confirm from a page left open is refused on the server, and nothing is written')
    await go(d, '/my/demo-studio/schedule')
    ok(await d.locator('[data-testid="portal-notice"]').getAttribute('data-kind') === 'paused', '…and the Schedule is the paused notice')
    await go(d, '/my/demo-studio/updates')
    ok(await d.locator('[data-testid="portal-notice"]').getAttribute('data-kind') === 'paused', '…and so is Updates')
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 300))
  } finally {
    sql(`update members set is_you = (id = 'dane')`)
    sql(`update settings set value=json_set(value,'$.paused',json('false')) where key='portal'`)
    await b.close()
    if (errors.length) { console.log('page errors:'); errors.forEach((x) => console.log('   ', x)) }
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail || errors.length ? 1 : 0)
  }
})()
