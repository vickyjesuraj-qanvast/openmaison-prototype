// Projects round 9 — the client portal, part two: the client's bell (his rows, two unread since gaps build D, a press reads one for him alone), someone else from
// the household (Mei Ling's own sign-in and her own stamps, her answer recorded under her name; adding a son with the client's number refused,
// his own invite on WhatsApp, his sign-in, Withdraw + Undo, his session ended, Take off the list + Undo, See it as Mei Ling), Remind on WhatsApp
// recorded, the six section switches (Schedule off → its tab, its need and its bell rows gone, its page leads home, a stage answer refused on
// the server, Client access says it is off; Files off → its file refused; Designs lists the shared renders, off → gone), the welcome line on
// sign-in and the home (saved with Undo), the Clients tab's household rows, a Designer reading the set-up; phone 390 and desktop 1440.
// Run against `next start -p 3023` on a FRESH copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=<repo>/node_modules node verify-pj-r9.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r9')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3023'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const n = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const leadId = (name) => sql(`select id from leads where name='${name.replace(/'/g, "''")}' and deleted_at is null`)
const PHONE = { ben: '97731968', wife: '91827364', son: '98123456', kevin: '96882109' }
const BEN = leadId('Benjamin Han'), KEVIN = leadId('Kevin Ng')
const BEN_P = sql(`select id from projects where lead_id='${BEN}'`)
const BEN_H = sql(`select homeowner_id from homeowner_lead_links where lead_id='${BEN}'`)
const WIFE = sql(`select id from homeowner_household_links where lead_id='${BEN}'`)
const WIFE_H = sql(`select homeowner_id from homeowner_household_links where id='${WIFE}'`)
const EL = sql(`select id from project_milestones where project_id='${BEN_P}' and title like 'Electrical%'`)
const PLAN = sql(`select id from lead_files where lead_id='${BEN}' and name like 'Floor plan%' and kind <> 'folder'`)   /* (gaps build E, REG-e.10) the starter folder "Floor plans" shares the name's start */
const KEVIN_SHARE = sql(`select id || '|' || expires_at from render_share_links where lead_id='${KEVIN}' limit 1`)
const WELCOME_WAS = sql(`select value from settings where key='portal_welcome'`)
const BEN_LINK_WAS = sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_lead_links where lead_id='${BEN}'`)
const WIFE_WAS = sql(`select coalesce(last_opened_at,'null') from homeowner_household_links where lead_id='${BEN}'`)
const T0 = Math.floor(Date.now() / 1000)
/* (fix-G, G-06) the household's WhatsApp opens a blank tab on the press and points it at the message once the server says yes
   (components/portal/wa-window.ts) — the stub hands back a stand-in tab and records where it is pointed */
const STUB = `(() => { window.__wa = []; const o = window.open.bind(window); window.open = (u, ...a) => { const s = String(u ?? ''); if (s.startsWith('https://wa.me')) { window.__wa.push(s); return null } if (s === '' || s === 'about:blank') { const loc = {}; Object.defineProperty(loc, 'href', { set: (v) => { if (String(v).startsWith('https://wa.me')) window.__wa.push(String(v)) } }); return { closed: false, opener: null, location: loc, close() { this.closed = true } } } return o(u, ...a) } })()`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const desk = async () => { const c = await b.newContext({ viewport: { width: 1440, height: 1024 } }); await c.addInitScript(STUB); return c }
  const phone = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await c.addInitScript(STUB); return c }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  /* (REG-1050) the phone's bar: four tabs and More, as the studio's dock — a section is in the bar or in More's sheet */
  const sections = async (p) => {
    const bar = await p.locator('[data-testid="portal-dock"] > [data-key]').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
    let more = []
    if (bar.includes('more')) {
      await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(600)
      more = await p.locator('[data-testid="portal-more-sheet"] a').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
      await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    }
    return { bar, more, all: [...bar.filter((k) => k !== 'more'), ...more] }
  }
  /* every section the phone offers him — the bar's and More's (REG-1050) */
  const dockKeys = async (p) => (await sections(p)).all
  const openBell = async (p) => { await p.locator('[data-testid="portal-bell"]').click(); await settle(p, 1000) }
  const bellKinds = (p) => p.locator('[data-testid="portal-bell-row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
  const flip = async (s, key) => { await s.locator(`[data-testid="portal-section-${key}"] label`).first().click(); await settle(s, 1400) }
  const sectionOn = (key) => sql(`select json_extract(value, '$.${key}') from settings where key='portal_sections'`) !== '0'
  const openAccess = async (s) => {
    await go(s, `/projects/${BEN_P}`)
    await s.getByRole('button', { name: 'More options' }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /^(Client portal|Invite to Portal)$/ }).click(); await settle(s, 1600) /* (the calm UI build 2026-10-27, a deliberate change) the menu row reads "Client portal" (3-25 · W-218) */   // (one-home N-15, a deliberate change of this rule) the panel and the project ⋮ item are "Invite to Portal" now
  }
  /* Kevin Ng (Met, his designs shared from the Visualizer): invited, his link open a week more — the Designs tab's demo */
  if (KEVIN && KEVIN_SHARE) {
    sql(`insert or ignore into homeowner_profiles (id, phone, name, email, created_at, updated_at) values ('probe-r9-kevin', '${PHONE.kevin}', 'Kevin Ng', null, strftime('%s','now'), strftime('%s','now'))`)
    sql(`insert or ignore into homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, created_at, invited_by) values ('probe-r9-kevin-link', (select id from homeowner_profiles where phone='${PHONE.kevin}'), '${KEVIN}', 'probe-r9-token', 1, strftime('%s','now'), strftime('%s','now'), 'dane')`)
    sql(`update render_share_links set expires_at = strftime('%s','now') + 7*86400 where id='${KEVIN_SHARE.split('|')[0]}'`)
  }

  try {
    // ── The client's bell — Benjamin on his phone ──────────────────────────────────────────────────────────────────────
    console.log('The bell (390)')
    const C = await phone(); const p = await C.newPage(); watch(p, 'ben')
    await go(p, '/my/demo-studio/login')
    ok(/Welcome to your renovation/.test(await p.locator('[data-testid="portal-sign-in-welcome"]').innerText()), 'the sign-in page reads the studio’s welcome line')
    await shot(p, 'signin-welcome-390')
    await signIn(p, PHONE.ben)
    ok(/Welcome to your renovation/.test(await p.locator('[data-testid="portal-welcome"]').innerText()), 'the home carries it under the studio’s name')
    /* (fix-F, F-15) an update seen on his Home's Latest update card is read: whether the newest one counts depends on where the card falls on his
       screen (the number of things that need him moves it) — read the record, then hold the bell to it */
    const KITCHEN = sql(`select id from project_updates where project_id='${BEN_P}' and title like 'Kitchen cabinets%'`)
    const kitchenSeen = !!sql(`select client_opened_at from project_updates where id='${KITCHEN}'`)
    /* (gaps build F2) other packages ring his bell too (a credit note on his invoice) — the probe holds the rows it is about, not the total */
    const bellBefore = Number(await p.locator('[data-testid="portal-bell-count"]').innerText().catch(() => '0'))
    ok(bellBefore >= (kitchenSeen ? 1 : 2), `his bell: the floor plan shown to him an hour ago (gaps build D, item 3: a file newly shown rings it)${kitchenSeen ? ' — the newest update already read on his Home' : ', and the newest update'}`)
    await openBell(p)
    const kinds = await bellKinds(p)
    ok(['schedule_shared', 'update_published', 'stage_to_confirm', 'choice_to_make', 'invoice_sent', 'invoice_overdue'].every((k) => kinds.includes(k)), 'rows from what reached him: the schedule shared, updates, a stage to confirm, a choice, invoices sent and overdue')
    const unread = p.locator('[data-testid="portal-bell-row"][data-unread]')
    const unreadRow = p.locator('[data-testid="portal-bell-row"]').filter({ hasText: 'Kitchen cabinets' })
    ok(await unread.count() === bellBefore && (kitchenSeen || await unread.filter({ hasText: 'Kitchen cabinets' }).count() === 1) && await unread.filter({ hasText: 'Floor plan' }).count() === 1, 'the unread ones are the floor plan and — unless his Home showed it — “New update: Kitchen cabinets are in”')
    ok(await noOverflow(p), 'no sideways scroll at 390 with the bell')
    await shot(p, 'bell-390')
    await unreadRow.locator('button').click(); await p.waitForURL(/\/updates/, { timeout: 8000 }).catch(() => {}); await settle(p, 1400)
    ok(/\/updates/.test(p.url()), 'the row opens where it is — Updates')
    ok(n(`select count(*) from project_updates u where u.project_id='${BEN_P}' and u.status='published' and u.deleted_at is null and (u.client_opened_at is not null or exists (select 1 from portal_bell_reads r where r.homeowner_id='${BEN_H}' and r.row_key like 'update:' || u.id || ':%'))`) === n(`select count(*) from project_updates where project_id='${BEN_P}' and status='published' and deleted_at is null`), '…and is read for him (stored per person) — every published update’s row now')
    ok(Number(await p.locator('[data-testid="portal-bell-count"]').innerText().catch(() => '0')) === bellBefore - (kitchenSeen ? 0 : 1), 'his bell: the update read, the floor plan (and anything else) still unread on the next page')

    // ── Schedule switched off — gone and refused ─────────────────────────────────────────────────────────────────────
    console.log('A section switched off')
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio')
    await go(s, '/company/portal'); await settle(s, 1200)
    ok(/(\d+) of \1 on/.test(await s.locator('[data-card="portal-sections"]').innerText()), 'What clients can see: every section on')   /* (gaps build G, REG-g.12) the Floor plan is the seventh switch · (gaps build H) Messages, Issues and About us the eighth to tenth — the rule, not the count */
    ok(/Schedule[\s\S]*Updates[\s\S]*Payments[\s\S]*Choices[\s\S]*Designs[\s\S]*Files/.test(await s.locator('[data-card="portal-sections"]').innerText()), '…in the portal’s tab order (fix-G, G-25), with its lines (the calm UI build 2026-10-27, a deliberate change: Money reads Payments)')
    await shot(s, 'setup-1440', true)
    await go(p, '/my/demo-studio/schedule'); await settle(p, 800)
    ok(await p.locator('[data-testid="portal-confirm"]').count() === 1, 'his Schedule open, Electrical & plumbing waiting for his answer')
    await flip(s, 'schedule')
    ok(!sectionOn('schedule') && /Schedule is off/.test(await snack(s).innerText()), 'Schedule off — saved, and said with Undo')
    await p.locator('[data-testid="portal-confirm-yes"]').click(); await settle(p, 1400)
    ok(/schedule isn’t open on Demo Studio’s portal/i.test(await snack(p).innerText()) && !sql(`select confirm_answer from project_milestones where id='${EL}'`), 'his answer on the page left open is refused on the server — nothing written')
    await go(p, '/my/demo-studio')
    const keysOff = await dockKeys(p)
    ok(!keysOff.includes('schedule') && ['home', 'updates', 'choices', 'designs', 'files'].every((k) => keysOff.includes(k)), 'its tab is gone from his bar — the rest stay')
    ok(await p.locator('[data-testid="portal-need"][data-kind="stage"]').count() === 0 && await p.locator('[data-testid="portal-need"][data-kind="choice"]').count() === 1, 'its stage leaves What needs you; the choice stays')
    await openBell(p)
    const kindsOff = await bellKinds(p)
    ok(!kindsOff.includes('schedule_shared') && !kindsOff.includes('stage_to_confirm') && kindsOff.includes('update_published'), 'its bell rows are withheld — the others stay')
    await p.keyboard.press('Escape').catch(() => {}); await settle(p, 300)
    await go(p, '/my/demo-studio/schedule')
    ok(/\/my\/demo-studio$/.test(p.url()), 'its page leads home')
    await openAccess(s)
    const schedRow = s.locator('[data-testid="access-section"][data-key="schedule"]')
    ok(/Off for every client/.test(await schedRow.innerText()) && (await schedRow.getAttribute('href')) === '/company/portal', 'Client access says Schedule is off, and leads to the switch')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, '/company/portal'); await flip(s, 'schedule')
    ok(sectionOn('schedule'), 'Schedule back on')
    await go(p, '/my/demo-studio')
    ok((await dockKeys(p)).includes('schedule') && await p.locator('[data-testid="portal-need"][data-kind="stage"]').count() === 1, '…and back on his page with its stage')
    // Files off: its file is refused
    ok((await p.request.get(BASE + `/my/demo-studio/file/${PLAN}`, { maxRedirects: 0 })).status() === 200, 'his floor plan opens while Files is on (its pages since fix-F, R77b)')
    await flip(s, 'files')
    ok((await p.request.get(BASE + `/my/demo-studio/file/${PLAN}`, { maxRedirects: 0 })).status() === 404, 'Files off — the same file is refused on the server')
    await go(p, '/my/demo-studio'); ok(!(await dockKeys(p)).includes('files') && await p.locator('[data-testid="portal-need"][data-kind="file"]').count() === 0, '…its tab and its new-file need are gone')
    await flip(s, 'files')
    ok(sectionOn('files') && (await p.request.get(BASE + `/my/demo-studio/file/${PLAN}`, { maxRedirects: 0 })).status() === 200, 'Files on again')

    // ── Someone from the household — Mei Ling, her own sign-in ───────────────────────────────────────────────────────
    console.log('The household')
    const W = await phone(); const w = await W.newPage(); watch(w, 'wife')
    const wifeWas = sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_household_links where id='${WIFE}'`)
    await signIn(w, PHONE.wife)
    ok(/Hello Mei Ling/.test(await w.locator('main').innerText()), 'Mei Ling signs in with her own number — "Hello Mei Ling" (REG-1054)')
    const wifeNow = sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_household_links where id='${WIFE}'`)
    ok(wifeNow.split('|')[0] === wifeWas.split('|')[0] && wifeNow.split('|')[1] !== wifeWas.split('|')[1], 'her own stamps: first opened kept, last opened now')
    ok(sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_lead_links where lead_id='${BEN}'`).split('|')[0] === BEN_LINK_WAS.split('|')[0], 'Benjamin’s own stamps are his')
    ok(Number(await w.locator('[data-testid="portal-bell-count"]').innerText()) > 1, 'her bell keeps its own reads — his reading it read nothing for her')
    await go(w, '/my/demo-studio/schedule')
    await w.locator('[data-testid="portal-confirm-yes"]').click(); await settle(w, 1500)
    ok(sql(`select confirm_answer || '|' || confirm_answered_by from project_milestones where id='${EL}'`) === `confirmed|${WIFE_H}`, 'she confirms Electrical & plumbing — recorded as hers')
    ok(n(`select count(*) from lead_events where kind='project_stage_confirmed' and json_extract(detail,'$.id')='${EL}' and json_extract(detail,'$.name')='Mei Ling Han'`) === 1, '…under her own name in Activity')
    await shot(w, 'wife-home-390', true)

    // ── Client access: the household rows, add a son, Remind ─────────────────────────────────────────────────────────
    await openAccess(s)
    const wifeRow = s.locator(`[data-testid="household-row"][data-person="${WIFE}"]`)
    ok(/Mei Ling Han[\s\S]*Wife/.test(await wifeRow.innerText()) && /Opened/i.test(await wifeRow.locator('[data-testid="household-chip"]').innerText()), 'Client access lists Mei Ling under Benjamin — Wife, Opened')
    await shot(s, 'access-household-1440')
    await s.locator('[data-testid="household-open-add"]').click(); await settle(s, 500)
    await s.locator('[data-testid="household-add"]').click(); await settle(s, 400)
    const dlg = s.locator('[data-testid="household-dialog"]')
    ok((await dlg.innerText()).match(/This field is required/g)?.length === 2, 'Add with nothing typed: the name and the number each say they are required')
    await dlg.locator('input').nth(0).fill('Wei Jie Han')
    await dlg.locator('input').nth(1).fill(PHONE.ben)
    await s.locator('[data-testid="household-add"]').click(); await settle(s, 400)
    ok(/already opens this home — it’s Benjamin’s/.test(await dlg.innerText()) && (await s.evaluate(() => window.__wa)).length === 0, 'Benjamin’s own number is refused before anything opens')
    await dlg.locator('input').nth(1).fill(PHONE.son)
    await dlg.locator('input').nth(2).fill('Son')
    await shot(s, 'household-dialog-1440')
    await s.locator('[data-testid="household-add"]').click(); await settle(s, 1800)
    const wa = await s.evaluate(() => window.__wa)
    ok(wa.length === 1 && wa[0].includes(`wa.me/65${PHONE.son}`) && /Hi Wei/.test(decodeURIComponent(wa[0])) && decodeURIComponent(wa[0]).includes('/my/demo-studio'), 'one press adds him and opens WhatsApp with his own link')
    const SON = sql(`select x.id from homeowner_household_links x join homeowner_profiles h on h.id = x.homeowner_id where x.lead_id='${BEN}' and h.phone='${PHONE.son}'`)
    const sonRow = s.locator(`[data-testid="household-row"][data-person="${SON}"]`)
    ok(!!SON && /^invited$/i.test((await sonRow.locator('[data-testid="household-chip"]').innerText()).trim()) && /Son ·/.test(await sonRow.innerText()), 'his row: Son · Invited (the calm UI build 2026-10-27, a deliberate change: the chip says the state alone — 5-42)')
    ok(n(`select count(*) from lead_events where lead_id='${BEN}' and kind='household_added' and json_extract(detail,'$.id')='${SON}'`) === 1, '…and a line in Activity')
    // Remind on WhatsApp
    const remindRow = s.locator('[data-testid="access-waiting-row"]').first()
    const remindKey = await remindRow.getAttribute('data-key')
    await remindRow.locator('[data-testid="access-remind"]').click(); await settle(s, 1400)
    const wa2 = await s.evaluate(() => window.__wa)
    ok(wa2.length === 2 && wa2[1].includes(`wa.me/65${PHONE.ben}`) && /a reminder from Demo Studio/.test(decodeURIComponent(wa2[1])), 'Remind drafts his WhatsApp in one press')
    ok(/reminded just now/.test(await remindRow.innerText()) && n(`select count(*) from lead_events where lead_id='${BEN}' and kind='portal_reminded' and json_extract(detail,'$.id')='${remindKey}'`) === 1, '…recorded: "reminded just now" and a line in Activity')
    // the son signs in, then Withdraw + Undo
    const Y = await phone(); const y = await Y.newPage(); watch(y, 'son')
    await signIn(y, PHONE.son)
    ok(/Hello Wei/.test(await y.locator('main').innerText()) && !!sql(`select opened_at from homeowner_household_links where id='${SON}'`), 'he signs in on the same home — his own first open')
    ok(n(`select count(*) from lead_events where kind='household_opened' and json_extract(detail,'$.id')='${SON}'`) === 1, '…his own Activity line')
    await openAccess(s)
    await s.locator(`[data-testid="household-row"][data-person="${SON}"] [data-testid="household-menu"]`).click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /^Withdraw .*access$/ }).click(); await settle(s, 1400)
    ok(!!sql(`select withdrawn_at from homeowner_household_links where id='${SON}'`) && /Withdrawn/i.test(await s.locator(`[data-testid="household-row"][data-person="${SON}"]`).innerText()), 'Withdraw access — his row says Withdrawn')
    await snack(s).getByRole('button', { name: 'Undo' }).last().click(); await settle(s, 1500)
    ok(!sql(`select withdrawn_at from homeowner_household_links where id='${SON}'`) && n(`select count(*) from lead_events where kind='household_withdrawn' and json_extract(detail,'$.id')='${SON}'`) === 0, 'Undo gives it back and takes the line away')
    await s.locator(`[data-testid="household-row"][data-person="${SON}"] [data-testid="household-menu"]`).click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /^Withdraw .*access$/ }).click(); await settle(s, 1400)
    await go(y, '/my/demo-studio')
    ok(/\/login$/.test(y.url()), 'withdrawn, his session ends')
    await y.locator('input[type="tel"]').fill(PHONE.son); await y.getByRole('button', { name: 'Send me a code' }).click(); await settle(y, 900)
    ok(/has stopped this number’s access/.test(await y.locator('[data-testid="portal-sign-in"]').innerText()), '…and his number is refused — as withdrawn, not as never added (fix-F, F-21)')
    ok(/Hello Mei Ling/.test(await (await (async () => { await go(w, '/my/demo-studio'); return w.locator('main') })()).innerText()), 'Mei Ling’s own access is untouched')
    await s.locator(`[data-testid="household-row"][data-person="${SON}"] [data-testid="household-menu"]`).click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Take off the list' }).click(); await settle(s, 1400)
    ok(await s.locator(`[data-testid="household-row"][data-person="${SON}"]`).count() === 0 && !!sql(`select removed_at from homeowner_household_links where id='${SON}'`), 'Take off the list — gone from the panel, kept as a record')
    await snack(s).getByRole('button', { name: 'Undo' }).last().click(); await settle(s, 1500)
    ok(await s.locator(`[data-testid="household-row"][data-person="${SON}"]`).count() === 1, 'Undo puts him back')
    // See it as Mei Ling
    const evBefore = n(`select count(*) from lead_events where lead_id='${BEN}'`)
    await s.locator(`[data-testid="household-row"][data-person="${WIFE}"] [data-testid="household-menu"]`).click(); await settle(s, 300)
    const [pv] = await Promise.all([S.waitForEvent('page'), s.getByRole('menuitem', { name: 'See it as Mei Ling' }).click()])
    await pv.waitForLoadState('networkidle'); await settle(pv, 1500)
    ok(await pv.locator('[data-testid="portal-preview-bar"]').isVisible() && /Hello Mei Ling/.test(await pv.locator('main').innerText()), 'See it as Mei Ling: her page, as a preview')
    await pv.close()
    ok(n(`select count(*) from lead_events where lead_id='${BEN}'`) === evBefore, '…recording nothing as hers')
    await s.keyboard.press('Escape'); await settle(s, 400)

    // ── Designs (Kevin Ng's shared renders) ─────────────────────────────────────────────────────────────────────────
    console.log('Designs')
    const K = await phone(); const k = await K.newPage(); watch(k, 'kevin')
    await signIn(k, PHONE.kevin)
    await go(k, '/my/demo-studio/designs')
    const tiles = k.locator('[data-testid="portal-design"]')
    ok(await tiles.count() >= 1 && (await tiles.first().getAttribute('href') ?? '').startsWith('/renders/'), 'Designs lists his shared renders — each opens today’s designs link')
    ok(await k.locator('[data-testid="portal-design"] img').first().evaluate((i) => i.complete && i.naturalWidth > 0), '…its pictures served on the link’s own token')
    ok(await noOverflow(k), 'Designs: no sideways scroll at 390')
    await shot(k, 'designs-390', true)
    await go(s, '/company/portal'); await flip(s, 'designs')
    await go(k, '/my/demo-studio/designs')
    ok(/\/my\/demo-studio$/.test(k.url()) && !(await dockKeys(k)).includes('designs'), 'Designs off — the page leads home, the tab is gone')
    /* (simplify round 2, a new rule) the studio's own Design › Designs says the client can't see it — the Invite to Portal panel's words — with
       its door to Company › Client portal */
    await go(s, `/projects/${BEN_P}/designs`)
    const reach = s.locator('[data-testid="designs-reach"]')
    ok(await reach.count() === 1 && (await reach.getAttribute('data-why')) === 'off' && /Designs · Off for every client/.test(await reach.innerText()) && (await s.locator('[data-testid="designs-reach-portal"]').getAttribute('href') ?? '').startsWith('/company/portal'), 'the studio’s Designs view: “Designs · Off for every client”, its door Company › Client portal')
    await go(s, '/company/portal')
    await flip(s, 'designs')

    // ── The welcome line ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The welcome line')
    const field = s.locator('[data-card="portal-welcome"] input')
    ok(await field.inputValue() === 'Welcome to your renovation', 'Set-up shows the line clients read')
    await field.fill('Your home, step by step'); await settle(s, 200)
    await s.locator('[data-testid="portal-welcome-save"]').click(); await settle(s, 1400)
    ok(JSON.parse(sql(`select value from settings where key='portal_welcome'`)).line === 'Your home, step by step', 'Save lands it')
    const L = await phone(); const lp = await L.newPage(); watch(lp, 'login')
    await go(lp, '/my/demo-studio/login')
    ok(/Your home, step by step/.test(await lp.locator('[data-testid="portal-sign-in-welcome"]').innerText()), 'the sign-in page reads the new line')
    await snack(s).getByRole('button', { name: 'Undo' }).last().click(); await settle(s, 1500)
    ok(JSON.parse(sql(`select value from settings where key='portal_welcome'`)).line === 'Welcome to your renovation', 'Undo puts the old line back')

    // ── The Clients tab: the household under their client ───────────────────────────────────────────────────────────
    await go(s, '/company/portal/clients')
    const order = await s.locator('[data-testid="portal-clients-table"] [data-lead]').evaluateAll((rs) => rs.map((r) => `${r.getAttribute('data-lead')}:${r.getAttribute('data-household') ?? ''}`))
    const bi = order.findIndex((x) => x === `${BEN}:`)
    ok(bi >= 0 && order[bi + 1] === `${BEN}:${WIFE}`, 'Clients lists Mei Ling right under Benjamin')
    await s.locator('input[aria-label="Search clients"]').fill('mei ling'); await settle(s, 400)
    ok(await s.locator('[data-testid="portal-household-state"]').count() === 1 && /Opened/i.test(await s.locator('[data-testid="portal-household-state"]').innerText()), 'a search finds her — with her own access')
    await s.locator('input[aria-label="Search clients"]').fill(''); await settle(s, 300)
    await shot(s, 'clients-household-1440', true)

    // ── A Designer reads the set-up ──────────────────────────────────────────────────────────────────────────────────
    sql(`update members set is_you = case id when 'germaine' then 1 else 0 end`)
    await go(s, '/company/portal'); await settle(s, 1200)
    ok(await s.locator('[data-card="portal-sections"] input[type="checkbox"]').first().isDisabled() && await s.locator('[data-card="portal-welcome"] input').isDisabled() && await s.locator('[data-testid="portal-welcome-save"]').count() === 0, 'a Designer reads What clients can see and the welcome line — no switch, no Save')
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)

  /* (the calm UI build 2026-10-27, a deliberate change — 3-36) at a desk the bar is the phone's five: Home · Schedule · Updates · Payments and More ▾,
     the rest in its menu — a section is "in the bar" when it is either */
  const deskSections = async (pg) => {
    const bar = await pg.locator('[data-testid="portal-nav"]').innerText()
    if (!(await pg.locator('[data-testid="portal-nav-more"]').count())) return bar
    await pg.locator('[data-testid="portal-nav-more"]').click(); await pg.waitForTimeout(300)
    const rows = await pg.locator('[data-testid="portal-nav-more-row"]').allInnerTexts()
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(250)
    return `${bar}\n${rows.join('\n')}`
  }
  const deskHas = async (pg, key) => {
    if (await pg.locator(`[data-testid="portal-nav"] a[data-key="${key}"]`).isVisible()) return true
    if (!(await pg.locator('[data-testid="portal-nav-more"]').count())) return false
    await pg.locator('[data-testid="portal-nav-more"]').click(); await pg.waitForTimeout(300)
    const there = await pg.locator(`[data-testid="portal-nav-more-row"][data-key="${key}"] [role="menuitem"]`).isVisible()
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(250)
    return there
  }
    // ── Desk and phone looks ──────────────────────────────────────────────────────────────────────────────────────────
    const D = await desk(); const d = await D.newPage(); watch(d, 'ben-desk')
    await signIn(d, PHONE.ben)
    ok(await deskHas(d, 'designs') && await d.locator('[data-testid="portal-bell"]').isVisible(), 'at a desk: Designs in the bar (under More ▾ — the calm UI build 2026-10-27, a deliberate change), the bell beside his name')
    await openBell(d)
    ok(await d.locator('[data-testid="portal-bell-panel"]').isVisible() && await noOverflow(d), 'the bell opens under itself')
    await shot(d, 'bell-1440')
    const SP = await phone(); const sp = await SP.newPage(); watch(sp, 'studio-phone')
    await go(sp, '/company/portal'); await settle(sp, 1200)
    ok(await noOverflow(sp), 'Set-up with its two new cards: no sideways scroll at 390')
    await shot(sp, 'setup-390', true)
    await go(sp, '/company/portal/clients'); await settle(sp, 800)
    ok(await noOverflow(sp), 'Clients with the household: no sideways scroll at 390')
    await shot(sp, 'clients-390', true)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 300))
  } finally {
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
    sql(`update settings set value='{"schedule":true,"updates":true,"money":true,"files":true,"designs":true,"choices":true}' where key='portal_sections'`)
    if (WELCOME_WAS) sql(`update settings set value='${WELCOME_WAS.replace(/'/g, "''")}' where key='portal_welcome'`)
    sql(`update project_milestones set confirm_answer=null, confirm_note=null, confirm_answered_at=null, confirm_answered_by=null where id='${EL}'`)
    sql(`delete from lead_events where lead_id='${BEN}' and (kind in ('portal_reminded','household_invited','household_withdrawn','household_removed') or (kind in ('household_added','household_opened') and json_extract(detail,'$.id')<>'${WIFE}') or (kind='project_stage_confirmed' and json_extract(detail,'$.id')='${EL}'))`)
    sql(`delete from notifications where lead_id='${BEN}' and kind in ('stage_confirmed','portal_opened') and created_at >= ${T0}`)
    sql(`delete from portal_sessions where created_at >= ${T0}`)
    const [bo, bl] = BEN_LINK_WAS.split('|')
    sql(`update homeowner_lead_links set opened_at=${bo || 'null'}, last_opened_at=${bl || 'null'} where lead_id='${BEN}'`)
    sql(`update homeowner_household_links set last_opened_at=${WIFE_WAS} where id='${WIFE}'`)
    sql(`delete from homeowner_household_links where lead_id='${BEN}' and id<>'${WIFE}'`)
    sql(`delete from homeowner_profiles where phone='${PHONE.son}'`)
    sql(`delete from portal_bell_reads where read_at >= ${T0}`)
    if (KEVIN_SHARE) sql(`update render_share_links set expires_at=${KEVIN_SHARE.split('|')[1]} where id='${KEVIN_SHARE.split('|')[0]}'`)
    sql(`delete from homeowner_lead_links where id='probe-r9-kevin-link'`)
    sql(`delete from homeowner_profiles where id='probe-r9-kevin'`)
    await b.close()
    if (errors.length) { console.log('page errors:'); errors.forEach((x) => console.log('   ', x)) }
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail || errors.length ? 1 : 0)
  }
})()
