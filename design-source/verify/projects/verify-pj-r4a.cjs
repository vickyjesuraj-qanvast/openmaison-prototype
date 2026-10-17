// Projects round 4a — the client portal, part one: sign-in (a known number passes, an unknown or uninvited one is refused), the home and What
// needs you, Before work starts into today's links, Files (only files shown to the client), sign out; the studio's Client access panel (invite
// on WhatsApp, See it as the client recording nothing, withdraw + Undo, the withdrawn number refused); the project's menu and Getting started;
// Files' Shown to client mark; Company › Client portal (the checklist, Open as a test client, the address change with the old one redirecting,
// Paused refusing a portal page and its server action while /confirm/… still works, a Designer reading it); phone 390 and desktop 1440.
// Run against `next start -p 3023` on a FRESH copy of the repaired scratch DB — never local.db.
// Usage: NODE_PATH=<repo>/node_modules node verify-pj-r4a.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r4a')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3023'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const leadId = (name) => sql(`select id from leads where name='${name.replace(/'/g, "''")}' and deleted_at is null`)
const PHONE = { ben: '97731968', ryan: '97551246', aisha: '98902411', vivien: '91008254' }
const BEN = leadId('Benjamin Han'), AISHA = leadId('Aisha Rahman'), VIVIEN = leadId('Vivien Lee')
const BEN_P = sql(`select id from projects where lead_id='${BEN}'`), AISHA_P = sql(`select id from projects where lead_id='${AISHA}'`)
const VQ = sql(`select id from quotes where lead_id='${VIVIEN}' and number='OM-10008'`)
const VQ_WAS = sql(`select status || '|' || coalesce(client_sent_at,'') from quotes where id='${VQ}'`)
const Q_ID = 'probe-r4a-question'
const STUB = `(() => { window.__wa = []; const o = window.open.bind(window); window.open = (u, ...a) => { if (String(u).startsWith('https://wa.me')) { window.__wa.push(String(u)); return null } return o(u, ...a) } })()`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const desk = async () => { const c = await b.newContext({ viewport: { width: 1440, height: 1024 } }); await c.addInitScript(STUB); return c }
  const phone = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await c.addInitScript(STUB); return c }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const until = async (fn, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)) } return false }   // a state that lands, not a fixed sleep
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const signIn = async (p, num, slug = 'demo-studio') => {
    await go(p, `/my/${slug}/login`)
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
  }
  const enterCode = async (p) => { await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click(); await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200) }
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
  const openFromMore = async (p, key) => { await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(600); await p.locator(`[data-testid="portal-more-sheet"] a[data-key="${key}"]`).click() }

  /* the states this probe needs on top of the demo: Vivien's quote sent for her confirmation, one question asked of her */
  sql(`update quotes set status='Sent to Client', client_sent_at=coalesce(client_sent_at, sent_at) where id='${VQ}'`)
  sql(`insert or ignore into questions (id, lead_id, text, type, options, answer, answered_by, answered_at, sort_order, created_at, required) values ('${Q_ID}', '${VIVIEN}', 'How many people live in the home?', 'number', null, null, null, null, 99, strftime('%s','now'), 0)`)
  sql(`insert or ignore into lead_events (id, lead_id, kind, actor_id, at, detail) values ('probe-r4a-ask', '${VIVIEN}', 'questionnaire_asked', 'sarah', strftime('%s','now'), '{"ids":["${Q_ID}"]}')`)

  try {
    // ── Sign-in, the home, Files, sign out — a phone ─────────────────────────────────────────────────────────────────────
    console.log('Sign-in on a phone (390)')
    const C = await phone(); const p = await C.newPage(); watch(p, 'client')
    await go(p, '/my/demo-studio')
    ok(/\/my\/demo-studio\/login$/.test(p.url()) && await p.locator('[data-testid="portal-sign-in"]').isVisible(), 'not signed in → the studio’s sign-in page')
    await shot(p, 'signin-390')
    await p.locator('input[type="tel"]').fill('91234567'); await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 900)
    ok(/hasn’t added this number/.test(await p.locator('[data-testid="portal-sign-in"]').innerText()), 'an unknown number is refused, plainly')
    await p.locator('input[type="tel"]').fill(PHONE.aisha); await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 900)
    ok(await p.locator('[data-testid="portal-sign-in"]').getAttribute('data-step') === 'phone', 'a number the studio has not invited (Aisha) gets no code')
    await p.locator('input[type="tel"]').fill(PHONE.ben); await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    const codeText = await p.locator('[data-testid="portal-sign-in"]').innerText()
    ok(/ending 1968/.test(codeText) && /Ask your designer at Demo Studio/.test(codeText) && !/Germaine/.test(codeText), 'the code step names the number’s ending — and no designer: anyone can type a number (REG-1164, F-37)')
    await shot(p, 'code-390')
    await enterCode(p)
    ok(/Hello Benjamin/.test(await p.locator('main').innerText()), 'any six digits open the home — "Hello Benjamin"')
    ok(/\d+ things? needs? you/.test(await p.locator('[data-testid="portal-needs"]').innerText()) && await p.locator('[data-testid="portal-need"][data-kind="file"]').count() === 1 && await p.locator('[data-testid="portal-need"][data-kind="stage"]').count() === 1, 'What needs you first: the floor plan shown an hour ago (and, since round 4b, the stage he is asked to confirm)')
    ok((await p.locator('[data-testid="portal-contact"] a').getAttribute('href') ?? '').startsWith('https://wa.me/65'), '"Message your designer on WhatsApp" drafts a WhatsApp')
    ok(await p.locator('[data-testid="portal-dock"] a[data-key="home"]').isVisible() && !(await p.locator('[data-testid="portal-nav"]').isVisible()), 'the phone’s section bar at the bottom')
    { const sec = await sections(p); ok(sec.bar.join(',') === 'home,schedule,updates,money,more' && sec.more.includes('files') && (await p.locator('[data-testid="portal-dock"] [aria-disabled="true"]').count()) === 0, 'the bar is the studio’s dock: Home · Schedule · Updates · Money · More, Files in More — each tab a built one, none inert (REG-1050)') }
    ok(await noOverflow(p), 'no sideways scroll at 390')
    await shot(p, 'home-390', true)
    ok(!!sql(`select opened_at from homeowner_lead_links where lead_id='${BEN}'`), 'the link keeps when he opened it')
    await openFromMore(p, 'files'); await p.waitForURL(/\/files$/); await settle(p, 1200)   // (REG-1050) Files lives in More
    const files = await p.locator('[data-testid="portal-file"]').allInnerTexts()
    ok(files.length === 1 && /Floor plan/.test(files[0]), 'Files lists only the file shown to the client (the site measurements stay the team’s)')
    { const docs = await p.locator('[data-testid="portal-documents"]').innerText(); ok(/Interior Design Service Agreement/.test(docs) && /Quote OM-10005/.test(docs), 'his signed agreement and quote are under Documents') }   // (gaps build D, item 8) grouped by kind — Quotes come before Agreements now, so no order
    const planId = sql(`select id from lead_files where lead_id='${BEN}' and name like 'Floor plan%' and kind <> 'folder'`)   /* (gaps build E, REG-e.10) the starter folder "Floor plans" shares the name's start */, measuresId = sql(`select id from lead_files where lead_id='${BEN}' and name='Site measurements.pdf'`)
    ok((await p.locator('[data-testid="portal-file"]').first().getAttribute('href')) === `/my/demo-studio/file/${planId}`, 'a shown file opens on the portal’s own session-checked address')
    ok([200, 307].includes((await p.request.get(BASE + `/my/demo-studio/file/${planId}`, { maxRedirects: 0 })).status()), '…which serves it to the signed-in client (its pages since fix-F, R77b)')
    ok((await p.request.get(BASE + `/my/demo-studio/file/${measuresId}`, { maxRedirects: 0 })).status() === 404, '…and answers not found for a file the team keeps')
    await shot(p, 'files-390', true)
    await p.locator('[data-testid="portal-dock"] a[data-key="home"]').click(); await settle(p, 900)
    /* (fix-F, F-46) on a phone Sign out lives in More — board 1's bar is the mark, the name and the bell */
    await p.locator('[data-testid="portal-more"]').click(); await settle(p, 700)
    await p.locator('[data-testid="portal-more-sign-out"]').click(); await p.waitForURL(/\/login$/); await settle(p)
    ok(/\/login$/.test(p.url()), 'Sign out lands on sign-in')
    await go(p, '/my/demo-studio')
    ok(/\/login$/.test(p.url()), 'signed out, the home asks to sign in again')
    ok((await p.request.get(BASE + `/my/demo-studio/file/${planId}`, { maxRedirects: 0 })).headers()['location']?.includes('/my/demo-studio/login'), 'signed out, a file’s address asks to sign in (and comes back to the file, fix-F F-20)')

    // ── The desk (board 7) ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The portal at a desk (1440)')
    const D = await desk(); const d = await D.newPage(); watch(d, 'desk')
    await signIn(d, PHONE.ben); await enterCode(d)
    ok(await d.locator('[data-testid="portal-nav"] a[data-key="files"]').isVisible() && !(await d.locator('[data-testid="portal-dock"]').isVisible()), 'at a desk the sections sit in the studio’s bar')
    /* (fix-F, F-14) the file he opened above is no longer a need — any need's button proves the rule */
    ok(/Look and confirm|See how to pay|Choose|Open|Answer/.test(await d.locator('[data-testid="portal-need"]').first().innerText()) && await d.locator('[data-testid="portal-need"]').first().isVisible(), 'at a desk each need has its button (board 7)')
    await shot(d, 'home-1440', true)
    await go(d, '/my/demo-studio/files'); await shot(d, 'files-1440', true)

    // ── Client access, from the lead page (Vivien Lee — her quote out for confirmation) ───────────────────────────────
    console.log('Client access on a lead')
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio')
    await go(s, `/leads/${VIVIEN}`)
    await s.getByRole('button', { name: 'More options' }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Invite to Portal' }).click(); await settle(s, 1500)
    const panel = s.locator('[data-testid="client-access"]')
    ok(await panel.getAttribute('data-state') === 'none' && /Not invited/i.test(await s.locator('[data-testid="access-chip"]').innerText()), 'Invite to Portal opens its panel — Not invited')
    await shot(s, 'access-lead-1440')
    await s.locator('[data-testid="access-invite"]').click(); await settle(s, 1800)
    const wa = await s.evaluate(() => window.__wa)
    ok(wa.length === 1 && wa[0].includes('wa.me/6591008254') && decodeURIComponent(wa[0]).includes('/my/demo-studio'), 'Invite opens WhatsApp on the press with the portal’s address')
    ok(!/openmaison/i.test(decodeURIComponent(wa[0]).replace(/https?:\/\/[^/ ]+/g, '')), 'the message carries the studio’s name, never OpenMaison’s')
    ok(/Invited, not opened/i.test(await s.locator('[data-testid="access-chip"]').innerText()), 'the chip says Invited, not opened')
    ok(!!sql(`select invited_at from homeowner_lead_links where lead_id='${VIVIEN}'`) && sql(`select count(*) from lead_events where lead_id='${VIVIEN}' and kind='invite_sent'`) !== '0', 'the invite is a record and an Activity line')
    ok(/Look through your quote/.test(await s.locator('[data-testid="access-waiting"]').innerText()), 'Waiting on Vivien lists her quote')
    // See it as the client
    const before = sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_lead_links where lead_id='${VIVIEN}'`)
    const evBefore = sql(`select count(*) from lead_events where lead_id='${VIVIEN}'`)
    const [pv] = await Promise.all([S.waitForEvent('page'), s.locator('[data-testid="access-see-as"]').click()])
    await pv.waitForLoadState('networkidle'); await settle(pv, 1500)
    ok(await pv.locator('[data-testid="portal-preview-bar"]').isVisible() && /Hello Vivien/.test(await pv.locator('main').innerText()), 'See it as Vivien opens her real page with the preview strip')
    ok((await pv.locator('[data-testid="portal-need"][data-kind="quote"]').getAttribute('href')) === `/quotes/${VQ}/preview`, 'in a preview the quote opens the studio’s own read, not her confirmation link')
    await shot(pv, 'preview-before-1440', true)
    await pv.close()
    ok(sql(`select coalesce(opened_at,'') || '|' || coalesce(last_opened_at,'') from homeowner_lead_links where lead_id='${VIVIEN}'`) === before && sql(`select count(*) from lead_events where lead_id='${VIVIEN}'`) === evBefore, 'the preview recorded nothing as hers')
    // Vivien signs in on her phone: Before work starts, into today's links
    const V = await phone(); const v = await V.newPage(); watch(v, 'vivien')
    await signIn(v, PHONE.vivien); await enterCode(v)
    const steps = await v.locator('[data-testid="portal-step"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-step')}:${e.getAttribute('data-state')}`))
    ok(steps.join(',') === 'questions:now,quote:later,agreement:later', 'Before work starts: her questions now, then the quote, then the agreement (board 6)')
    /* (fix-F, F-36) the current step carries its own ask — What needs you lists what the steps don't (board 6) */
    ok(await v.locator('[data-testid="portal-need"]').count() === 1 && await v.locator('[data-testid="portal-need"][data-kind="questions"]').count() === 0, 'What needs her: the quote — the questions are the step she is on')
    ok((await v.locator('[data-testid="portal-need"][data-kind="quote"]').getAttribute('href')) === `/confirm/${VQ}`, 'the quote opens today’s confirmation link')
    await shot(v, 'before-390', true)
    ok(!!sql(`select opened_at from homeowner_lead_links where lead_id='${VIVIEN}'`) && sql(`select count(*) from lead_events where lead_id='${VIVIEN}' and kind='portal_opened'`) === '1', 'her first sign-in: the stamp and its Activity line')
    ok(sql(`select count(*) from notifications where lead_id='${VIVIEN}' and kind='portal_opened'`) !== '0', '…and a bell row for her team')
    /* (fix-F, F-24) what leaves the portal opens in a new tab — the portal stays put */
    ok(await v.locator('[data-testid="portal-need"][data-kind="quote"]').getAttribute('target') === '_blank', 'the quote opens in a new tab')
    await v.goto(BASE + `/confirm/${VQ}`, { waitUntil: 'networkidle' }); await settle(v, 1500)
    ok(/OM-10008/.test(await v.title()) || /OM-10008/.test(await v.locator('body').innerText()), 'the quote’s button lands on its confirmation page')
    await v.goBack(); await settle(v, 1200)
    await v.locator('[data-testid="portal-step"][data-step="questions"] a').first().click(); await v.waitForURL(/\/questions\//); await settle(v, 1200)
    await v.locator('[data-testid="portal-question"] input').first().fill('4')
    await shot(v, 'questions-390', true)
    await v.locator('[data-testid="portal-send-answers"]').click(); await v.waitForURL(/\/my\/demo-studio$/, { timeout: 8000 }).catch(() => {}); await settle(v, 1200)
    ok(sql(`select answer || '|' || answered_by from questions where id='${Q_ID}'`) === '4|client', 'her answer reaches the lead’s questionnaire as the client’s')
    ok((await v.locator('[data-testid="portal-step"][data-step="quote"]').getAttribute('data-state')) === 'now', 'answered, the quote is the step now')
    // Withdraw + Undo, then the withdrawn number refused
    await go(s, `/leads/${VIVIEN}`)
    await s.getByRole('button', { name: 'More options' }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Invite to Portal' }).click(); await settle(s, 1500)
    ok(/Opened/i.test(await s.locator('[data-testid="access-chip"]').innerText()), 'the panel now says Opened')
    await s.locator('[data-testid="access-client-menu"]').click(); await settle(s, 300); await s.getByRole('menuitem', { name: /^Withdraw .*access$/ }).click()   // fix-G G-23: Withdraw lives in the client's row menu; await settle(s, 1200)
    ok(await until(async () => !!sql(`select withdrawn_at from homeowner_lead_links where lead_id='${VIVIEN}'`) && /Withdrawn/i.test(await s.locator('[data-testid="access-chip"]').innerText())), 'Withdraw access: the link is withdrawn')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(!sql(`select withdrawn_at from homeowner_lead_links where lead_id='${VIVIEN}'`) && sql(`select count(*) from lead_events where lead_id='${VIVIEN}' and kind='portal_withdrawn'`) === '0', 'Undo gives access back and takes the line away')
    await s.locator('[data-testid="access-client-menu"]').click(); await settle(s, 300); await s.getByRole('menuitem', { name: /^Withdraw .*access$/ }).click()   // fix-G G-23: Withdraw lives in the client's row menu; await settle(s, 1500)
    await until(async () => /Withdrawn/i.test(await s.locator('[data-testid="access-chip"]').innerText()))
    await shot(s, 'access-withdrawn-1440')
    await go(v, '/my/demo-studio')
    ok(/\/login$/.test(v.url()), 'withdrawn, her session ends — the page asks her to sign in')
    await v.locator('input[type="tel"]').fill(PHONE.vivien); await v.getByRole('button', { name: 'Send me a code' }).click(); await settle(v, 900)
    ok(/has stopped this number’s access/.test(await v.locator('[data-testid="portal-sign-in"]').innerText()), 'and her number is refused — as withdrawn, not as never added (fix-F, F-21)')
    await s.keyboard.press('Escape'); await settle(s, 400)

    // ── The project: its menu and Getting started ────────────────────────────────────────────────────────────────────
    console.log('The project')
    await go(s, `/projects/${AISHA_P}`)
    /* (simplify S-01, a deliberate change of this rule) after Start, Getting started's open item is a set-up row of Needs you */
    /* (simplify round 2) Needs you shows six rows, the others under "Show n more" — unfold it before reading a row that may sit past the sixth */
    { const more = s.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await s.waitForTimeout(300) } }
    ok(await s.locator('[data-testid="need-setup-portal"]').isVisible() && /Invite the client/.test(await s.locator('[data-testid="need-setup-portal"]').innerText()), 'Needs you gains “Invite the client” (Aisha, not invited)')
    await go(s, `/projects/${BEN_P}`)
    await s.getByRole('button', { name: 'More options' }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /Invite to Portal/ }).click(); await settle(s, 1500)   // (one-home N-15, a deliberate change of this rule) the panel and the project ⋮ item are "Invite to Portal" now
    ok(/Who can open this project/.test(await s.locator('[data-testid="client-access"]').innerText()) && /Opened/i.test(await s.locator('[data-testid="access-chip"]').innerText()), 'the project’s menu opens Invite to Portal — Benjamin opened it')
    await shot(s, 'access-project-1440')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await go(s, `/projects/${BEN_P}/activity`)
    ok(/Benjamin Han opened their portal for the first time/.test(await s.locator('main').innerText()), 'Activity: his first sign-in')

    // ── Files: Shown to client ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Files › Shown to client')
    await go(s, `/projects/${BEN_P}/files`)
    ok(await s.locator('[data-testid="file-shown-mark"]').count() === 1, 'the grid marks the one file shown to the client')
    const measures = sql(`select id from lead_files where lead_id='${BEN}' and name='Site measurements.pdf'`)
    await s.getByRole('button', { name: 'Actions for Site measurements.pdf' }).click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /Show to client/ }).click(); await settle(s, 1500)
    ok(!!sql(`select shown_to_client_at from lead_files where id='${measures}'`) && await s.locator('[data-testid="file-shown-mark"]').count() === 2, 'Show to client marks it — and the tile says so')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(!sql(`select shown_to_client_at from lead_files where id='${measures}'`), 'Undo takes it back off the client’s page')

    // ── Company › Client portal ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('Company › Client portal')
    /* Try it yourself starts not done — whoever used the demo may have pressed See it as already (it stamps `testedAt`); the probe's `finally` clears it the same way */
    sql(`update settings set value=json_set(value,'$.testedAt',json('null')) where key='portal'`)
    await go(s, '/company/portal'); await settle(s, 1500)
    /* (pending modules, a deliberate change of this rule) S13 adds a fifth check — the privacy notice (PDPA) — not done in the demo */
    ok(/3 of 5 done/.test(await s.locator('[data-card="portal-checklist"]').innerText()), 'Getting it live: three of five done (address, look, how clients pay)')
    const clients = await s.locator('[data-testid="portal-client-row"]').allInnerTexts()
    /* the rule, not the demo's names: the card shows the first four by state — opened, then invited, then not invited (fix-F's R77b invites
       two more clients, so Aisha, not invited, is under All clients) */
    const rank = (c) => (/Opened/i.test(c) ? 0 : /Invited, not opened/i.test(c) ? 1 : /Not invited/i.test(c) ? 2 : 3)
    ok(clients.length <= 4 && clients.some((c) => /Benjamin Han[\s\S]*Opened/i.test(c)) && clients.some((c) => /Ryan[\s\S]*(Invited, not opened|Opened)/i.test(c)) && clients.every((c, i) => i === 0 || rank(clients[i - 1]) <= rank(c)), 'the clients as board 9 lists them — the first four, by state')
    await shot(s, 'setup-1440', true)
    const [tp] = await Promise.all([S.waitForEvent('page'), s.locator('[data-testid="portal-test"]').click()])
    await tp.waitForLoadState('networkidle'); await settle(tp, 1000)
    ok(await tp.locator('[data-testid="portal-preview-bar"]').isVisible(), 'Open as a test client: the real page, as a preview')
    await tp.close(); await go(s, '/company/portal'); await settle(s, 1200)
    ok(/4 of 5 done/.test(await s.locator('[data-card="portal-checklist"]').innerText()), '…and Try it yourself is ticked')   // (pending modules, a deliberate change of this rule) five checks since S13
    // the address
    await s.locator('[data-testid="portal-step-address"]').getByRole('button', { name: 'Change' }).click(); await settle(s, 500)
    const field = s.locator('[role="dialog"] input').first()
    await field.fill('admin'); await s.locator('[data-testid="address-save"]').click(); await settle(s, 600)
    ok(/kept for OpenMaison/.test(await s.locator('[role="dialog"]').innerText()), 'a reserved word is refused')
    await field.fill('Demo Studio SG'); await settle(s, 200)
    ok(await field.inputValue() === 'demo-studio-sg', 'the address is cleaned as it is typed')
    await s.locator('[data-testid="address-save"]').click(); await settle(s, 1500)
    ok(/\/my\/demo-studio-sg/.test(await s.locator('[data-testid="portal-address"]').innerText()), 'the new address is the portal’s')
    await go(p, '/my/demo-studio/login')
    ok(/\/my\/demo-studio-sg\/login$/.test(p.url()), 'the old address keeps working — it redirects to the new one')
    await s.locator('[data-testid="portal-step-address"]').getByRole('button', { name: 'Change' }).click(); await settle(s, 500)
    await s.locator('[role="dialog"] input').first().fill('demo-studio'); await s.locator('[data-testid="address-save"]').click(); await settle(s, 1500)
    ok(sql(`select slug from portal_addresses where retired_at is null`) === 'demo-studio', 'the studio may take its own old address back')
    // Paused
    const L = await phone(); const lp = await L.newPage(); watch(lp, 'login-before-pause')
    await go(lp, '/my/demo-studio/login')   // a sign-in page opened while live
    await signIn(p, PHONE.ben); await enterCode(p)   // Benjamin signed in again
    await s.locator('[data-testid="portal-pause"]').click(); await settle(s, 400)
    await s.getByRole('button', { name: 'Pause', exact: true }).click(); await settle(s, 1500)
    ok(/Paused/i.test(await s.locator('[data-testid="portal-state"]').innerText()) && await s.locator('[data-testid="portal-paused-note"]').isVisible(), 'Pause: the chip and the note say so')
    await shot(s, 'setup-paused-1440', true)
    await go(p, '/my/demo-studio')
    ok((await p.locator('[data-testid="portal-notice"]').getAttribute('data-kind')) === 'paused' && /Demo Studio’s portal is paused/.test(await p.locator('body').innerText()), 'a signed-in client gets the paused notice under the studio’s name')
    await shot(p, 'paused-390', true)
    await go(p, '/my/demo-studio/files')
    ok((await p.locator('[data-testid="portal-notice"]').getAttribute('data-kind')) === 'paused', '…on every portal page')
    ok((await p.request.get(BASE + `/my/demo-studio/file/${sql(`select id from lead_files where lead_id='${BEN}' and name like 'Floor plan%' and kind <> 'folder'`)}`, { maxRedirects: 0 })).status() === 403, '…and its files are refused while paused')
    await lp.locator('input[type="tel"]').fill(PHONE.ben); await lp.getByRole('button', { name: 'Send me a code' }).click(); await settle(lp, 900)
    ok(/portal is paused/.test(await lp.locator('body').innerText()), 'a portal request is refused on the server while paused')
    const conf = await (await S.newPage()).goto(BASE + `/confirm/${VQ}`, { waitUntil: 'networkidle' })
    ok(conf.status() === 200 && /OM-10008/.test(await conf.text()), 'today’s confirmation link still works while paused')
    await s.locator('[data-testid="portal-go-live"]').click(); await settle(s, 1500)
    ok(/Live/i.test(await s.locator('[data-testid="portal-state"]').innerText()), 'Go live again')
    // Clients tab
    await go(s, '/company/portal/clients')
    ok(await s.locator('[data-testid="portal-client-state"]').count() >= 4, 'Clients: every project’s client and every invited lead')
    await s.locator('input[aria-label="Search clients"]').fill('ryan'); await settle(s, 400)
    ok(await s.locator('[data-testid="portal-client-state"]').count() === 1, 'the Clients search finds Ryan')
    await s.locator('input[aria-label="Search clients"]').fill(''); await settle(s, 300)
    await shot(s, 'clients-1440', true)
    // a Designer reads it
    sql(`update members set is_you = case id when 'germaine' then 1 else 0 end`)
    await go(s, '/company/portal'); await settle(s, 1200)
    ok(await s.locator('[data-testid="read-only-line"]').isVisible() && !(await s.locator('[data-testid="portal-pause"]').count()), 'a Designer reads the set-up — no Pause, the read-only line')
    await go(s, '/company/portal/clients')
    {   // (fix-G G-19) a client's team invites and withdraws — a Designer gets the ⋮ on her own clients' rows and on no one else's
      const rowsG = await s.locator('[data-lead]:not([data-household])').evaluateAll((els) => {
        const m = {}; for (const e of els) { const id = e.getAttribute('data-lead'); m[id] = m[id] || !!e.querySelector('[data-testid="portal-client-menu"]') }
        return Object.entries(m)
      })
      const hers = new Set(sql(`select lead_id from lead_assignees where member_id='germaine'`).split('\n').filter(Boolean))
      ok(rowsG.length > 0 && rowsG.every(([id, menu]) => menu === hers.has(id)) && rowsG.some(([id]) => !hers.has(id)), '…and the Clients have actions only on her own clients’ rows')
    }
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
    // the studio search
    await go(s, '/company/portal')
    await s.keyboard.press('Meta+k'); await settle(s, 500)
    await s.keyboard.type('client portal'); await settle(s, 1200)
    ok(/Client portal/.test(await s.locator('body').innerText()), 'the studio search finds the Client portal page')
    await s.keyboard.press('Escape')

    // ── Phone: Company and the panel ─────────────────────────────────────────────────────────────────────────────────
    console.log('Company on a phone (390)')
    const SP = await phone(); const sp = await SP.newPage(); watch(sp, 'studio-phone')
    await go(sp, '/company/portal'); await settle(sp, 1500)
    ok(await noOverflow(sp), 'Set-up has no sideways scroll at 390')
    await shot(sp, 'setup-390', true)
    await go(sp, '/company/portal/clients'); await settle(sp, 800)
    ok(await noOverflow(sp), 'Clients are cards at 390')
    await shot(sp, 'clients-390', true)
    await sp.locator('[data-testid="portal-client-open"]').first().click(); await settle(sp, 1500)
    await shot(sp, 'access-390')
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 300))
  } finally {
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
    const [st, cs] = VQ_WAS.split('|')
    sql(`update quotes set status='${st}', client_sent_at=${cs ? cs : 'null'} where id='${VQ}'`)
    sql(`delete from questions where id='${Q_ID}'`)
    sql(`delete from lead_events where id='probe-r4a-ask' or (lead_id='${VIVIEN}' and kind in ('invite_sent','portal_opened','portal_withdrawn'))`)
    sql(`delete from notifications where lead_id='${VIVIEN}' and kind in ('portal_opened','question_answered')`)
    sql(`delete from portal_sessions where homeowner_id in (select homeowner_id from homeowner_lead_links where lead_id='${VIVIEN}')`)
    sql(`delete from homeowner_lead_links where lead_id='${VIVIEN}'`)
    sql(`delete from homeowner_profiles where phone='${PHONE.vivien}'`)
    sql(`update settings set value=json_set(value,'$.paused',json('false'),'$.testedAt',json('null')) where key='portal'`)
    await b.close()
    if (errors.length) { console.log('page errors:'); errors.forEach((x) => console.log('   ', x)) }
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail || errors.length ? 1 : 0)
  }
})()
