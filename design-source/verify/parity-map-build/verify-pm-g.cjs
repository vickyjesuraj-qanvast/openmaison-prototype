// Parity-map build 2026-10-10 — package P-G: conversations, tickets, sending & search (the owner's "build everything that's in 1.0 to 2.0";
// map rows UC-047 · UC-058 · UC-064 · UC-066 · UC-067 · UC-068 · UC-069 · UC-070 · UC-082 · UC-083 · FR-084 · FR-115 · TD-122; outcome in
// design-source/context/parity/28-projects-finance-parity-map-2026-10-10/build/outcome-P-G.md). Each check asserts a rule:
//   1 · a project's Messages — Client · Team; the team's conversation never reaches the client; a teammate hears `team_message`, nobody else;
//   2 · suggested replies — under the client's newest unanswered message only, a tap fills the box and sends nothing;
//   3 · the composer's "+" — the site's place (the lead's address, a map link), a contact card (Call · WhatsApp), a file filed in Files › Messages;
//       the emoji button inserts at the caret; the client opens a file of the client's conversation, never a team one;
//   4 · search in a conversation (marks, n of m) and ⌘K › Messages landing on the line; ⌘K finds a member's projects by their name (FR-115);
//   5 · ⋮ Pin to top · Mute · Copy link — kept on the server; a muted member hears no bell for that conversation, the others still do;
//   6 · a lead's conversation before Won — the client writes from their page, /chat lists it with a Lead chip, the studio answers there, the
//       lead's Overview has the door; Won, it carries on in the project's;
//   7 · Tickets › Filters — Priority · Status · Assigned to (Dane's Tickets review, merged 2026-10-28: was Looks after), live; a Status pick widens the chips to All;
//   8 · the ticket number — Settings › Finance › Document numbers' Tickets row: T-{YYYY}-{nnn} by default, a new prefix numbers the next ticket;
//   9 · sending safeguards — OpenMaison's pause holds every message and lets it go when it lifts; a large send waits for the Owner (Drop);
//       a failed message is tried again on the sweep, and Try again now sends one whose tries ran out;
//  10 · Send to Messages from the AI Visualizer — only on a design whose lead is a live project; it lands as the render in the conversation;
//  11 · the phone (390) and 320 — the conversation head, the "+" sheet, no sideways scroll.
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pm-g.cjs <scratch.db> [shotDir]   (env BASE, default http://localhost:3011)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-g')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3011'
const q = (s) => s.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (s) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q(s)}"`).toString().trim()
const json = (s) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q(s)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pmg-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ben = P('P-2026-002')
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  const serena = sql(`select id from leads where name='Serena Koh' and deleted_at is null`)
  const serenaPhone = sql(`select phone from homeowner_profiles where id=(select homeowner_id from homeowner_lead_links where lead_id='${serena}' limit 1)`)
  const benPhone = sql(`select phone from homeowner_profiles where name='Benjamin Han' limit 1`)
  const design = sql(`select id from visualizer_designs where kind='lead' and deleted_at is null limit 1`)
  const leads = `'${benLead}','${serena}'`
  /* what the run may change, kept to put back */
  const SNAP = [
    ['project_messages', '1'], ['lead_messages', '1'], ['chat_reads', '1'], ['conversation_prefs', '1'], ['notifications', '1'], ['notification_outbox', '1'],
    ['settings', `key in ('ticket_numbering','platform')`], ['members', '1'], ['project_tickets', '1'], ['ticket_replies', '1'],
    ['lead_events', `lead_id in (${leads})`], ['lead_files', `lead_id in (${leads})`], ['lead_file_images', `file_id in (select id from lead_files where lead_id in (${leads}))`],
    ['lead_file_renders', '1'], ['lead_file_thumbs', `file_id in (select id from lead_files where lead_id in (${leads}))`], ['portal_sessions', '1'], ['portal_bell_reads', '1'],
    ['visualizer_designs', design ? `id = '${design}'` : '0'],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: /Open my/ }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  /* Sent messages, loaded afresh each time — a goto to the same address and #hash is only a scroll (a fragment navigation), never a reload */
  let visits = 0
  const sentPage = async (p) => { await go(p, `/settings?section=notifications&visit=${++visits}#sent-messages`); await settle(p, 600) }
  const composer = (p) => p.locator('[data-testid="conversation-composer"]')
  const send = async (p, words) => { await composer(p).locator('textarea').fill(words); await composer(p).getByTestId('thread-send').click(); await settle(p, 1500) }
  as('dane')
  try {
    // ── 1 · Client · Team ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · A project’s Messages: Client · Team')
    const D = await desk(); const d = await D.newPage(); watch(d, 'studio')
    await go(d, `/projects/${ben}/messages`)
    const chips = d.getByTestId('conversation-channel')
    /* (the calm UI build 2026-10-27, a deliberate change) the Client · Team chips went (3-13): the client's conversation is the view, the head's quiet "Team chat" opens the team's */
    ok(/Team chat/.test(await chips.innerText()) && await chips.getByTestId('conversation-channel-team').count() === 1, 'the conversation’s head offers Team chat')
    ok(await d.locator('[data-testid="project-conversation"]').getAttribute('data-conversation') === 'client', 'it opens on the client’s conversation')
    await chips.getByTestId('conversation-channel-team').click(); await settle(d, 900)
    ok(/channel=team/.test(d.url()) && await d.locator('[data-testid="project-conversation"]').getAttribute('data-conversation') === 'team', 'Team: its own conversation, the address says so')
    ok(/never sees/.test(await composer(d).innerText()), 'the composer says the client never sees it')
    await send(d, 'Probe team — the tall cabinet carcass came back chipped.')
    ok(sql(`select channel from project_messages where body like 'Probe team%'`) === 'team', 'a team message is kept in the team’s conversation (channel = team)')
    ok(sql(`select count(*) from notifications where kind='team_message' and member_id='germaine' and created_at > strftime('%s','now') - 300`) === '1', 'the project’s member hears it (team_message to Germaine)')
    ok(sql(`select count(*) from notifications where kind='team_message' and member_id in ('dane','huimin') and created_at > strftime('%s','now') - 300`) === '0', 'the writer and those off the project don’t')
    await shot(d, 'g01-team-1440')

    // ── 2 · Suggested replies ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Suggested replies')
    await go(d, `/projects/${ben}/messages`)
    const last = sql(`select author_kind from project_messages where project_id='${ben}' and channel='client' and deleted_at is null order by created_at desc limit 1`)
    const sug = d.getByTestId('suggested-replies')
    if (last === 'client') {
      ok(await sug.count() === 1 && (await d.getByTestId('suggested-reply').count()) >= 1 && (await d.getByTestId('suggested-reply').count()) <= 2, 'under the client’s newest unanswered message: one or two replies')
      const before = sql(`select count(*) from project_messages where project_id='${ben}'`)
      const words = await d.getByTestId('suggested-reply').first().innerText()
      await d.getByTestId('suggested-reply').first().click(); await settle(d, 500)
      ok(await composer(d).locator('textarea').inputValue() === words && sql(`select count(*) from project_messages where project_id='${ben}'`) === before, 'a tap fills the box and sends nothing')
      await composer(d).locator('textarea').fill('')
    } else ok(await sug.count() === 0, 'no suggestions when the newest line is the studio’s')
    await shot(d, 'g02-suggested-1440')

    // ── 3 · The composer's "+" ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Photo · File · Voice note · The site’s location · A contact · emoji')
    await composer(d).getByTestId('thread-add').click(); await settle(d, 400)
    for (const t of ['thread-add-photo-row', 'thread-add-file', 'thread-add-voice', 'thread-add-place', 'thread-add-contact']) ok(await d.getByTestId(t).count() === 1, `the "+" offers ${t.replace('thread-add-', '').replace('-row', '')}`)
    await shot(d, 'g03-plus-1440')
    await d.getByTestId('thread-add-place').click(); await settle(d, 300)
    await send(d, 'Probe place')
    const addr = sql(`select property_address from leads where id='${benLead}'`)
    ok(sql(`select json_extract(meta,'$.kind') || '|' || json_extract(meta,'$.label') from project_messages where body='Probe place'`) === `place|${addr}`, 'the place shared is the lead’s address, never the device’s')
    ok(/google\.com\/maps/.test(await d.locator('[data-testid="thread-place"]').last().getAttribute('href') ?? ''), 'it reads as a map link')
    await composer(d).getByTestId('thread-add').click(); await settle(d, 300)
    await d.getByTestId('thread-add-contact').click(); await settle(d, 300)
    await d.getByRole('menuitem', { name: /Germaine/ }).first().click(); await settle(d, 300)
    await send(d, 'Probe contact')
    const card = d.locator('[data-testid="thread-contact"]').last()
    ok(/Germaine/.test(await card.innerText()) && await card.getByRole('link', { name: 'Call' }).count() === 1 && await card.getByRole('link', { name: 'WhatsApp' }).count() === 1, 'a contact card: the name, Call and WhatsApp')
    await composer(d).getByTestId('thread-file-input').setInputFiles({ name: 'Probe drawing.pdf', mimeType: 'application/pdf', buffer: PDF }); await settle(d, 1500)
    ok(await composer(d).getByTestId('thread-picked-file').count() === 1, 'a picked file sends at once and waits as a chip')
    await send(d, 'Probe file')
    const fid = sql(`select json_extract(attachments,'$[0].fileId') from project_messages where body='Probe file'`)
    ok(!!fid && sql(`select f.name from lead_files f join lead_files p on p.id=f.parent_id where f.id='${fid}'`) === 'Probe drawing.pdf' && sql(`select p.name from lead_files f join lead_files p on p.id=f.parent_id where f.id='${fid}'`) === 'Messages', 'the file is kept in Files › Messages')
    ok(await d.locator('[data-testid="thread-file"]').filter({ hasText: 'Probe drawing.pdf' }).count() === 1, 'the line shows the file by its name')
    await composer(d).locator('textarea').fill('Thanks ')
    await composer(d).getByTestId('thread-emoji').click(); await settle(d, 300)
    await d.getByTestId('thread-emoji-grid').getByRole('menuitem').first().click(); await settle(d, 300)
    ok((await composer(d).locator('textarea').inputValue()).startsWith('Thanks 😀'), 'an emoji goes in where the caret is')
    await composer(d).locator('textarea').fill('')
    const teamFile = (await (async () => {
      await go(d, `/projects/${ben}/messages?channel=team`)
      await composer(d).getByTestId('thread-file-input').setInputFiles({ name: 'Probe team note.pdf', mimeType: 'application/pdf', buffer: PDF }); await settle(d, 1500)
      await send(d, 'Probe team file')
      return sql(`select json_extract(attachments,'$[0].fileId') from project_messages where body='Probe team file'`)
    })())

    // ── 4 · Search ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Search in a conversation, ⌘K › Messages, a member’s projects')
    await go(d, `/projects/${ben}/messages`)
    await d.getByTestId('conversation-search').click(); await settle(d, 300)
    await d.getByTestId('conversation-find').locator('input').fill('lift'); await settle(d, 500)
    ok(/\d+ of \d+/.test(await d.getByTestId('conversation-find-count').innerText()) && await d.locator('[data-testid="conversation-lines"] mark').count() >= 1, 'a search marks its matches and counts them (n of m)')
    await shot(d, 'g04-find-1440')
    await d.getByRole('button', { name: 'Close search' }).click(); await settle(d, 300)   // the find closed, ⌘K from the page
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 500)
    await d.keyboard.type('service lift'); await settle(d, 1500)
    const hit = d.locator('[data-kind="message"]').first()
    ok(await hit.count() === 1, '⌘K finds a message by its words (the Messages group)')
    await hit.click(); await d.waitForURL(/\/messages/, { timeout: 8000 }).catch(() => {}); await settle(d, 2200)
    ok(await d.locator('[data-testid="thread-line"][data-current]').count() === 1, '…and opens its conversation at it')
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 500)
    await d.keyboard.type('Germaine'); await settle(d, 1500)
    ok(await d.locator('[data-kind="project"]').filter({ hasText: /with Germaine/ }).count() >= 1, '⌘K finds a member’s projects by their name, and says so (FR-115)')
    await d.keyboard.press('Escape'); await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 5 · Pin · Mute · Copy link ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Pin to top · Mute · Copy link')
    await go(d, `/projects/${ben}/messages`)
    await d.getByTestId('conversation-menu').click(); await settle(d, 300)
    await d.getByTestId('conversation-pin').click(); await settle(d, 900)
    ok(sql(`select pinned_at is not null from conversation_prefs where member_id='dane' and conversation='project:${ben}'`) === '1', 'Pin to top is kept for this member, on the server')
    await d.getByTestId('conversation-menu').click(); await settle(d, 300)
    await d.getByTestId('conversation-mute').click(); await settle(d, 900)
    ok(sql(`select muted_at is not null from conversation_prefs where member_id='dane' and conversation='project:${ben}'`) === '1', 'Mute is kept for this member, on the server')
    await go(d, '/chat')
    const first = d.locator('[data-testid="chat-row"]').first()
    /* (the calm UI build 2026-10-27, a deliberate change) a client's conversation is titled by the client (1-21): "Benjamin Han · client" (was the project's name) */
    ok(/Benjamin Han · client/.test(await first.innerText()) && await first.getByTestId('chat-row-marks').count() === 1, '/chat: the pinned conversation first, marked pinned and muted')
    await shot(d, 'g05-chat-pinned-1440')

    // ── 6 · A lead's conversation ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · A lead’s conversation before Won')
    const C = await desk(); const c = await C.newPage(); watch(c, 'client')
    await signIn(c, serenaPhone)
    await go(c, '/my/demo-studio/messages')
    ok(await c.getByTestId('portal-conversation').count() === 1, 'a lead invited to the portal has a conversation before any project')
    await c.getByTestId('portal-composer').locator('textarea').fill('Probe from Serena — does the carpentry include the shoe cabinet?')
    await c.getByTestId('portal-composer').getByTestId('thread-send').click(); await settle(c, 1800)
    ok(sql(`select count(*) from lead_messages where lead_id='${serena}' and author_kind='client' and body like 'Probe from Serena%'`) === '1', 'the client writes from their page (lead_messages)')
    ok(sql(`select count(*) from notifications where kind='chat_message' and member_id='germaine' and href like '/chat?open=lead%' and created_at > strftime('%s','now') - 300`) === '1', 'the lead’s member hears it, the bell opening Messages at the lead')
    await shot(c, 'g06-portal-lead-1440')
    await go(d, '/chat')
    const leadRow = d.locator('[data-testid="chat-row"][data-kind="lead"]').filter({ hasText: 'Serena' })
    /* (S42 audit C-23, call C·5 — a deliberate change of this rule) the lead's conversation with its client wears "Client" (was "Lead") */
    ok(await leadRow.count() === 1 && /\bclient\b/i.test(await leadRow.innerText()), '/chat lists the lead’s conversation with a Client chip')   // the house MetaChip prints in capitals
    await leadRow.click(); await settle(d, 1500)
    await send(d, 'Probe reply to Serena — yes, line B4.')
    ok(sql(`select count(*) from lead_messages where lead_id='${serena}' and author_kind='studio' and body like 'Probe reply to Serena%'`) === '1', 'the studio answers in Messages')
    await go(c, '/my/demo-studio/messages')
    ok(/Probe reply to Serena/.test(await c.getByTestId('portal-conversation-lines').innerText()), 'the client reads the answer on their page')
    await go(d, `/leads/${serena}`)
    ok(/\/chat\?open=lead/.test(await d.getByTestId('lead-portal-messages').getAttribute('href') ?? ''), 'the lead’s Overview has the door (the Portal row’s Messages)')
    await shot(d, 'g06-chat-lead-1440')

    // the team's file never opens on the portal; the client's does
    console.log('   the portal’s file rule')
    await C.close()
    const C2 = await desk(); const c2 = await C2.newPage(); watch(c2, 'client2')   // Serena's session stays hers — Benjamin signs in on his own
    await signIn(c2, benPhone)
    const clientFile = sql(`select json_extract(attachments,'$[0].fileId') from project_messages where body='Probe file'`)
    const st = async (id) => (await c2.request.get(`${BASE}/my/demo-studio/file/${id}`)).status()
    ok(await st(clientFile) === 200, 'a file of the client’s conversation opens on the portal')
    ok(!teamFile || await st(teamFile) === 404, 'a team file never does')
    await go(c2, '/my/demo-studio/messages')
    ok(!/Probe team/.test(await c2.locator('body').innerText()), 'the team’s conversation never reaches the client')
    await C2.close()

    // ── 7 · Tickets › Filters ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · Tickets › Filters')
    await go(d, '/projects/tickets')
    const cards = () => d.getByTestId('ticket-list').locator('button').count()
    await d.getByTestId('ticket-scope').getByRole('radio', { name: /^All/ }).click(); await settle(d, 300)
    const all = await cards()
    await d.getByTestId('tickets-filter-open').click(); await settle(d, 400)
    await d.getByTestId('tickets-filter-tab-owners').click()
    await d.getByTestId('tickets-filter-owners').getByRole('button', { name: /Germaine/ }).first().click(); await settle(d, 500)
    const mine = Number(sql(`select count(*) from project_tickets where assignee_id='germaine'`))
    ok(await cards() === mine, 'Assigned to — applied live, as the modal stays open')   // (Dane's Tickets review, merged 2026-10-28) the group's name was "Looks after" (the same testid, the same rule)
    await d.getByTestId('tickets-filter-tab-status').click()
    await d.getByTestId('tickets-filter-status').getByRole('button', { name: 'Closed' }).click(); await settle(d, 400)
    await d.getByTestId('tickets-filters-done').click(); await settle(d, 400)
    ok(await d.getByTestId('ticket-scope').getByRole('radio', { name: /^All/ }).getAttribute('aria-checked') === 'true', 'a Status pick reads under All')
    ok(await cards() === Number(sql(`select count(*) from project_tickets where assignee_id='germaine' and status='closed'`)) && all >= await cards(), 'the groups combine')
    await shot(d, 'g07-ticket-filters-1440')

    // ── 8 · The ticket number ──────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · The ticket number')
    await go(d, '/settings?section=finance#document-numbers')
    const row = d.getByTestId('document-numbers-ticket')
    ok(new RegExp(`^T-${new Date().getFullYear()}-\\d{3}$`).test(await d.getByTestId('ticket-number-example').innerText()), 'Tickets: T-{YYYY}-{nnn} by default — today’s numbers')
    await row.getByLabel('Prefix').fill('TK'); await settle(d, 300)
    await d.getByTestId('document-numbers-save').click(); await settle(d, 1500)
    ok(sql(`select json_extract(value,'$.prefix') from settings where key='ticket_numbering'`) === 'TK', 'the Tickets row saves its own pattern')
    await go(d, `/projects/${ben}/tickets`)
    await d.getByTestId('new-ticket').click(); await settle(d, 400)
    const nd = d.locator('[role="dialog"]').filter({ hasText: 'New issue' })   // (the calm UI build 2026-10-27, a deliberate change) "Issues" on screen (3-37)
    await nd.getByLabel('Category').click(); await settle(d, 300)
    await d.getByRole('option', { name: 'Timeline', exact: true }).click(); await settle(d, 200)
    await nd.getByLabel('Subject').fill('Probe ticket number')
    await d.getByTestId('new-ticket-save').click(); await settle(d, 1500)
    ok(/^TK-\d{4}-\d{3}$/.test(sql(`select number from project_tickets where subject='Probe ticket number'`)), 'the next ticket takes the new pattern')

    // ── 9 · Sending safeguards ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · The pause, a large send, retries')
    const sec0 = Math.floor(Date.now() / 1000)
    sql(`insert into settings (key, value, updated_at) values ('platform', '{"messagesPaused":true}', strftime('%s','now')) on conflict(key) do update set value=json_set(value,'$.messagesPaused',json('true'))`)
    /* a client's message whose Undo window passed while paused — the sweep keeps it waiting */
    sql(`insert into notification_outbox (id, key, event, channel, member_id, to_name, to_address, subject, body, status, send_after, provider, created_at, attempts) values ('pmg-held','pmg:held','client_update','email',null,'Benjamin Han','b@x.sg','Probe paused','Probe paused body','held',${sec0 - 60},'outbox',${sec0},0)`)
    await sentPage(d); await settle(d, 1500)
    ok(sql(`select status from notification_outbox where id='pmg-held'`) === 'paused', 'paused: a message that came due waits, unsent')
    ok(await d.getByTestId('sent-paused').count() === 1 && /Paused by OpenMaison/.test(await d.getByTestId('sent-table').innerText()), 'Sent messages says OpenMaison has paused the studio’s messages, and the row says so')
    sql(`update settings set value=json_set(value,'$.messagesPaused',json('false')) where key='platform'`)
    await sentPage(d); await settle(d, 1500)
    ok(sql(`select status from notification_outbox where id='pmg-held'`) === 'sent', 'the pause lifted: what waited goes on the next sweep')
    const now = Date.now(), sec = Math.floor(now / 1000)
    sql(`insert into notification_outbox (id, key, event, channel, member_id, to_name, to_address, subject, body, status, error, provider, created_at, attempts) values
      ('pmg-batch-1','pmg:batch:1','task_due','email','germaine','Germaine','g@x.sg','Probe large send','Probe large send body','held_large','batch:00000000-0000-4000-8000-000000000001','outbox',${sec},0),
      ('pmg-batch-2','pmg:batch:2','task_due','email','michelle','Michelle','m@x.sg','Probe large send','Probe large send body','held_large','batch:00000000-0000-4000-8000-000000000001','outbox',${sec},0),
      ('pmg-retry','pmg:retry','client_message','email',null,'Benjamin Han','b@x.sg','Probe retry','Probe retry body','failed',null,'outbox',${sec},1),
      ('pmg-spent','pmg:spent','client_message','email',null,'Benjamin Han','b@x.sg','Probe spent','Probe spent body','failed','Mailbox full','outbox',${sec},3)`)
    sql(`update notification_outbox set next_try_at=${sec - 60} where id='pmg-retry'`)
    await sentPage(d); await settle(d, 1500)
    ok(await d.getByTestId('sent-held-row').count() >= 1 && /Waiting for your OK/.test(await d.getByTestId('sent-held').innerText()), 'a large send waits above the log for the Owner')
    ok(sql(`select status from notification_outbox where id='pmg-retry'`) === 'sent', 'a failed message whose next try came is tried again on the sweep')
    await d.getByTestId('sent-held-drop').first().click(); await settle(d, 1200)
    ok(sql(`select count(*) from notification_outbox where id like 'pmg-batch-%' and status='dropped'`) === '2', 'Drop — the batch never goes, the log keeps it as dropped')
    await d.getByTestId('sent-row').filter({ hasText: 'Probe spent' }).getByRole('button').first().click(); await settle(d, 500)
    ok(/tried 3 more times/.test(await d.getByTestId('sent-retry').innerText()), 'a message whose tries ran out says so')
    await d.getByTestId('sent-try-again').click(); await settle(d, 1200)
    ok(sql(`select status from notification_outbox where id='pmg-spent'`) === 'sent', 'Try again now sends it')
    await shot(d, 'g09-sent-1440')

    // ── 10 · Send to Messages from the AI Visualizer ──────────────────────────────────────────────────────────────────────────────
    console.log('10 · Send to Messages')
    if (design) {
      await go(d, `/visualizer/${design}`); await settle(d, 1500)
      await d.getByTestId('viz-version').nth(1).click(); await settle(d, 800)
      ok(await d.getByTestId('viz-send-messages').count() === 0, 'a design whose lead has no project: no Send to Messages')
      sql(`update visualizer_designs set lead_id='${benLead}' where id='${design}'`)
      await go(d, `/visualizer/${design}`); await settle(d, 1800)
      await d.getByTestId('viz-version').nth(1).click(); await settle(d, 800)
      ok(await d.getByTestId('viz-send-messages').count() === 1, 'a design on a live project: Send to Messages on the canvas bar')
      await d.getByTestId('viz-send-messages').click(); await settle(d, 500)
      await d.getByTestId('viz-send-messages-channel').getByRole('radio', { name: 'Team' }).click()
      await shot(d, 'g10-send-render-1440')
      await d.getByTestId('viz-send-messages-send').click(); await d.waitForURL(/\/messages/, { timeout: 10000 }).catch(() => {}); await settle(d, 2000)
      const m = json(`select photos, channel from project_messages where project_id='${ben}' order by created_at desc limit 1`)[0]
      ok(m && m.channel === 'team' && /\[".+"\]/.test(m.photos ?? ''), 'it lands in the team’s conversation with the render as its photo')
      ok(/\/projects\/.+\/messages/.test(d.url()), '…and the conversation opens after')
    } else ok(true, 'no lead design in the demo — skipped')

    // ── 11 · The phone ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · The phone')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/projects/${ben}/messages`)
    ok(await m.getByTestId('conversation-head').isVisible() && await noOverflow(m), 'the conversation head on a phone, no sideways scroll')
    await m.getByTestId('thread-add').click(); await settle(m, 500)
    await shot(m, 'g11-plus-390')
    await m.keyboard.press('Escape')
    await m.setViewportSize({ width: 320, height: 640 }); await settle(m, 400)
    ok(await noOverflow(m), '320: no sideways scroll')
    await M.close(); await D.close()
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 300))
  } finally {
    putBack()
    as('dane')
    await b.close()
  }
  ok(sql(`select count(*) from project_messages where body like 'Probe%'`) === '0' && sql(`select count(*) from lead_messages where body like 'Probe%'`) === '0' && sql(`select count(*) from project_tickets where subject like 'Probe%'`) === '0', 'the run leaves the DB as it found it')
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
