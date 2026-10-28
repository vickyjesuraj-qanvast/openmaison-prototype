// Projects gaps build 2026-10-08 — package H: tickets, Messages, the messages clients get by themselves, the About page (the owner's "build
// everything"; Q-41 · Q-43 · Q-47's "later"; calls H-Q1…H-Q27 in design-source/context/parity/projects-gaps-build/h-read.md). Each check asserts a
// rule: the tabs and their counts (1); the rail's Chat and /chat — unread first, read on open (2); Messages — send, the client reads it, remove with
// Undo (3); a ticket — a reply goes to the client by email, an internal note never does, resolve with Undo, escalate (Owners and Admins hear it,
// Needs attention) and its Undo, a ticket the studio raises (4); Projects › Tickets and its search, ⌘K (5); Settings — ticket categories,
// Messages to clients (6); Company — the About card, a member on the About page (7); the portal — the tabs, the About page, Messages both ways,
// Issues: report with a photo (the team's bell, the photo through the portal's route), never an internal note, close with Undo (8); the section
// switches refuse the pages, an empty About is withheld (9); who may answer (10); Activity, Sent messages (11); the phone and 320 (12).
// Run against `next start -p 3129` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-h.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-h')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3129'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gaph-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 5000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PHONE = { ben: '97731968' }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ben = P('P-2026-002'), ryan = P('P-2026-001'), sha = P('P-2025-001')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const benLead = leadOf(ben), ryanLead = leadOf(ryan), shaLead = leadOf(sha)
  const leads = `'${benLead}','${ryanLead}','${shaLead}'`
  const T4 = sql(`select id from project_tickets where number='T-2026-004'`)
  const benHo = sql(`select homeowner_id from homeowner_lead_links where lead_id='${benLead}'`)
  /* what the run may change, kept to put back */
  const SNAP = [
    ['project_tickets', '1'], ['ticket_replies', '1'], ['project_messages', '1'], ['chat_reads', '1'], ['studio_pictures', '1'],
    ['settings', `key in ('portal_sections','ticket_categories','client_messages','studio_about')`], ['members', '1'], ['notifications', '1'], ['notification_outbox', '1'],
    /* (simplify S-22) Make a task from a client's message — the assignees before the tasks, so the new task's go too */
    ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`], ['lead_tasks', `lead_id in (${leads})`],
    ['lead_events', `lead_id in (${leads})`], ['lead_files', `lead_id in (${leads})`], ['lead_file_images', `file_id in (select id from lead_files where lead_id in (${leads}))`],
    ['lead_file_thumbs', `file_id in (select id from lead_files where lead_id in (${leads}))`], ['portal_bell_reads', '1'], ['portal_sessions', '1'], ['homeowner_lead_links', `lead_id in (${leads})`],
    /* (simplify round 2 — P3 §6.8) the due-day reminder moves one of Benjamin's invoices to today */
    ['project_invoices', `project_id = '${ben}'`],
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
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click(); await settle(p, 1600) }
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  as('dane')
  try {
    // ── 1 · The tabs ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · The Messages and Tickets tabs')
    const D = await desk(); const d = await D.newPage(); watch(d, 'studio')
    await go(d, `/projects/${ben}`)
    /* (simplify S-03 · S-04, a deliberate change of this rule) Messages and Tickets are views of the Client tab; each view's chip carries its own
       count — read on Tickets, so opening Messages doesn't read the message first */
    ok(/Client/.test(await d.locator('[aria-label="Project sections"]').innerText()), 'the project’s tabs list Client (Updates · Messages · Tickets · Questionnaire)')
    await go(d, `/projects/${ben}/tickets`)
    const views = await d.locator('[data-testid="project-view-chips"]').innerText()
    ok(/Messages/.test(views) && /Issues/.test(views), 'the Client view switch lists Messages and Issues')   // (the calm UI build 2026-10-27, a deliberate change) "Issues" on screen (3-37)
    ok(/Messages\s*·\s*1/.test(views), 'Messages counts the client’s unread message (1)')
    ok(!/Issues\s*·\s*\d/.test(views), 'Issues counts none — nothing waits on the studio in the demo')   // (the calm UI build 2026-10-27, a deliberate change)
    await go(d, `/projects/${ben}`)

    // ── 2 · The rail's Chat and /chat ───────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The rail’s Chat')
    const chatLink = d.locator('nav a[href="/chat"], a[href="/chat"]').first()
    ok(/^Messages \(1 unread\)/.test(await chatLink.getAttribute('aria-label') ?? ''), 'the rail’s Messages is a link with its unread count')   // (one-home N-08, a deliberate change of this rule) the rail's word is "Messages" now
    await go(d, '/chat')
    const rows = d.locator('[data-testid="chat-row"]')
    /* (the calm UI build 2026-10-27, a deliberate change) a client's conversation is titled by the client (1-21): "Benjamin Han · client"; the team's keeps the project's name */
    ok(await rows.count() >= 2 && /HDB 5-Room|Benjamin Han · client/.test(await rows.first().innerText()) && await rows.first().getAttribute('data-unread') !== null, '/chat lists the conversations, the unread one first')
    await rows.first().click(); await settle(d, 1800)
    ok(await d.locator('[data-testid="conversation-lines"] [data-testid="thread-new"]').count() === 1, 'the open conversation marks where the unread start (New)')
    await shot(d, 'h01-chat-desk')
    await go(d, '/chat')
    ok(!/unread/.test(await d.locator('a[href="/chat"]').first().getAttribute('aria-label') ?? ''), 'opened, it reads as read — the rail’s count is gone')

    // ── 3 · Messages ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Messages')
    await go(d, `/projects/${ben}/messages`)
    await d.locator('[data-testid="conversation-composer"] textarea').fill('Probe — the socket can go on the left inside the tall cabinet.')
    await d.locator('[data-testid="conversation-composer"] [data-testid="thread-send"]').click(); await settle(d, 1500)
    const mine = sql(`select id from project_messages where project_id='${ben}' and body like 'Probe — the socket%'`)
    ok(!!mine && await d.locator('[data-testid="thread-line"][data-mine]').filter({ hasText: 'Probe — the socket' }).count() === 1, 'a message sent lands in the thread as yours')
    /* (simplify Q-13, a deliberate change of this rule — H-Q18 had the team's messages off) emailed by default, at most one an hour */
    ok(sql(`select count(*) from notification_outbox where key = 'c:client_message:${ben}:${mine}:${benHo}:email' and status = 'sent'`) === '1', 'the team’s message is emailed to the client by default (simplify Q-13)')
    ok(sql(`select count(*) from notification_outbox where key like 'c:client_message:%${mine}%:whatsapp'`) === '0', '…never on WhatsApp by itself')
    /* (simplify S-22) a client's message carries Reply · Make a task · Raise a variation order — the task takes their words */
    const theirs = d.locator('[data-testid="thread-line"][data-kind="client"]').last()
    const theirWords = (await theirs.locator('p').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    await theirs.locator('[data-testid="ask-menu"]').click(); await settle(d, 400)
    ok(await d.locator('[data-testid="ask-reply"]').count() === 1 && await d.locator('[data-testid="ask-task"]').count() === 1 && await d.locator('[data-testid="ask-vo"]').count() === 1, 'a client’s message: ⋮ Reply · Make a task · Raise a variation order (simplify S-22)')
    await d.locator('[data-testid="ask-task"]').click(); await settle(d, 1600)
    const askTask = sql(`select id from lead_tasks where lead_id='${benLead}' and description like 'From %’s message,%' order by created_at desc limit 1`)
    const askTitle = askTask ? sql(`select title from lead_tasks where id='${askTask}'`) : ''
    ok(!!askTask && !!askTitle && theirWords.startsWith(askTitle.replace(/…$/, '')), `Make a task: the task’s title is the client’s words (“${askTitle}”), its description says where they came from`)
    await theirs.locator('[data-testid="ask-menu"]').click(); await settle(d, 400)
    ok(/Open the task/.test(await d.locator('[data-testid="ask-task"]').innerText()), '…and the message’s ⋮ now opens it')
    /* (simplify round 2, a deliberate change of this rule — round 1 kept the link as a line only) the message keeps its task on its own row */
    ok(!!askTask && sql(`select count(*) from project_messages where project_id='${ben}' and author_kind='client' and task_id='${askTask}'`) === '1', 'the client’s message carries its task (project_messages.task_id), the line stays for who and when')
    await d.keyboard.press('Escape'); await settle(d, 300)
    /* (simplify S-22 · contract C) `?compose=1` lands with the caret in the composer */
    await go(d, `/projects/${ben}/messages?compose=1`)
    /* the caret lands as the page reveals (after the ghost's minimum) — wait for it rather than a fixed time, which a loaded machine outruns */
    const focused = await d.waitForFunction(() => !!document.activeElement?.closest('[data-testid="conversation-composer"]'), null, { timeout: 6000 }).then(() => true, () => false)
    ok(focused, 'Messages ?compose=1: the composer is focused (simplify S-22)')
    await d.locator('[data-testid="thread-line"][data-mine]').filter({ hasText: 'Probe — the socket' }).getByRole('button', { name: 'Message actions' }).click(); await settle(d, 400)
    await d.getByRole('menuitem', { name: 'Remove' }).click(); await settle(d, 1400)
    ok(sql(`select deleted_at is not null from project_messages where id='${mine}'`) === '1', 'Remove takes it off (kept for Undo)')
    await undo(d)
    ok(sql(`select deleted_at is null from project_messages where id='${mine}'`) === '1', 'Undo puts it back')
    await shot(d, 'h02-messages-desk', true)

    // ── 4 · A ticket ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · A ticket')
    await go(d, `/projects/${ben}/tickets?open=${T4}`); await settle(d, 1200)
    const drawer = d.locator('[data-testid="ticket-drawer"]')
    ok(await drawer.count() === 1 && /Water stain/.test(await drawer.innerText()), '?open= lands on the ticket in the drawer')
    const thread = await d.locator('[data-testid="ticket-thread"]').innerText()
    ok(/Note · team only/.test(thread) && /Asked Ah Seng/.test(thread), 'the studio reads the internal note in the thread')   // (the calm UI build 2026-10-27, a deliberate change) the tag reads "Note · team only" (1-22)
    await d.locator('[data-testid="ticket-composer"] textarea').fill('Probe reply — the plumber will also check the dishwasher hose.')
    await d.locator('[data-testid="ticket-composer"] [data-testid="thread-send"]').click(); await settle(d, 1800)
    const replyId = sql(`select id from ticket_replies where ticket_id='${T4}' and body like 'Probe reply%'`)
    ok(!!replyId && sql(`select count(*) from notification_outbox where key = 'c:client_issue_answered:${replyId}:${benHo}:email' and to_address = 'benjamin.han@gmail.com' and status = 'sent'`) === '1', 'a reply to the client goes to them by email through the delivery layer (the outbox)')
    ok(sql(`select count(*) from notification_outbox where key like 'c:client_issue_answered:${replyId}:%:whatsapp'`) === '0', 'no WhatsApp — off by default')
    await d.locator('[data-testid="ticket-to"]').getByRole('radio', { name: 'Note · team only' }).click(); await settle(d, 300)   // (the calm UI build 2026-10-27, a deliberate change) (1-22)
    await d.locator('[data-testid="ticket-composer"] textarea').fill('Probe note — check the warranty on the tap.')
    await d.locator('[data-testid="ticket-composer"] [data-testid="thread-send"]').click(); await settle(d, 1800)
    const noteId = sql(`select id from ticket_replies where ticket_id='${T4}' and body like 'Probe note%' and internal = 1`)
    ok(!!noteId && sql(`select count(*) from notification_outbox where key like '%${noteId}%'`) === '0', 'an internal note is kept and sends nothing to the client')
    await d.locator('[data-testid="ticket-resolve"]').click(); await settle(d, 500)
    await d.getByRole('textbox', { name: /A closing line to the client/ }).fill('Probe — fixed; the connector was loose.')
    await d.locator('[data-testid="resolve-save"]').click(); await settle(d, 1800)
    ok(sql(`select status from project_tickets where id='${T4}'`) === 'resolved' && sql(`select resolved_at is not null from project_tickets where id='${T4}'`) === '1', 'Mark resolved, with a closing line')
    await undo(d)
    ok(sql(`select status from project_tickets where id='${T4}'`) === 'in_progress' && sql(`select resolved_at is null from project_tickets where id='${T4}'`) === '1', 'Undo reopens it (resolved_at cleared — 1.0’s rule)')
    await go(d, `/projects/${ben}/tickets?open=${T4}`); await settle(d, 1000)
    await d.locator('[data-testid="ticket-escalate"]').click(); await settle(d, 500)
    await d.getByLabel('Why it is urgent').fill('Water may be reaching the unit below')
    await d.locator('[data-testid="escalate-save"]').click(); await settle(d, 1800)
    ok(sql(`select priority from project_tickets where id='${T4}'`) === 'urgent', 'Escalate makes it Urgent')
    ok(sql(`select count(*) from notifications where kind='ticket_escalated' and member_id='huimin'`) === '1', 'Owners and Admins hear it (Hui Min; Dane did it)')
    await go(d, '/projects?scope=attention')
    ok(/Escalated ticket|Issue flagged to the Owner/.test(await d.locator('body').innerText())   /* (the calm UI build 2026-10-27, a deliberate change) plain words (1-08 · W-398 · W-426 · W-278 · 3-37) */, 'the project is in Needs attention — “Escalated ticket”')
    await go(d, `/projects/${ben}/tickets?open=${T4}`); await settle(d, 1000)
    await shot(d, 'h03-ticket-escalated-desk')
    sql(`update project_tickets set priority='normal', escalated_at=null, escalated_by=null, escalate_note=null where id='${T4}'`)
    await go(d, `/projects/${ben}/tickets`)
    await d.locator('[data-testid="new-ticket"]').click(); await settle(d, 500)
    const nd = d.locator('[role="dialog"]').filter({ hasText: 'New issue' })   // (the calm UI build 2026-10-27, a deliberate change) "Issues" on screen (3-37)
    await nd.getByLabel('Category').click(); await settle(d, 300)
    await d.getByRole('option', { name: 'Timeline', exact: true }).click(); await settle(d, 200)
    await nd.getByLabel('Subject').fill('Probe — the wardrobe doors arrive a week late')
    await d.locator('[data-testid="new-ticket-save"]').click(); await settle(d, 2000)
    const T5 = sql(`select id from project_tickets where subject like 'Probe — the wardrobe%'`)
    ok(!!T5 && /^T-\d{4}-\d{3}$/.test(sql(`select number from project_tickets where id='${T5}'`)) && sql(`select raised_kind from project_tickets where id='${T5}'`) === 'studio', 'New ticket: the studio raises one, numbered T-{YYYY}-{nnn}')
    ok(sql(`select count(*) from lead_events where kind='project_ticket_raised' and json_extract(detail,'$.id')='${T5}'`) === '1', 'its raising is on the record (Activity)')

    // ── 5 · Projects › Tickets, ⌘K ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Projects › Tickets and the search')
    await go(d, '/projects')
    /* (parity P-21 · Q-06, a deliberate change of this rule) Tickets left the header for ⋮, its count in the row; the header's outlined slot is Insights */
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — his ask 2026-10-19) */
    const railTickets = d.locator('[class*="app-rail-module__"] a[href^="/tickets"]')
    ok(await railTickets.count() === 1 && await d.locator('[data-testid="open-tickets"]').count() === 0, 'the rail offers Tickets (no longer a header button or a ⋮ row)')
    await railTickets.click(); await d.waitForURL(/\/tickets/); await settle(d, 1200)
    ok(await d.locator('[data-testid="ticket-card"]').count() >= 3 && /HDB 5-Room/.test(await d.locator('[data-testid="ticket-list"]').innerText()), 'Projects › Tickets lists every ticket the member sees, the project named')
    await d.getByRole('searchbox', { name: 'Search tickets' }).fill('grout').catch(async () => { await d.getByLabel('Search tickets').fill('grout') }); await settle(d, 600)
    ok(await d.locator('[data-testid="ticket-card"]').count() === 1, 'its search narrows to the grout ticket')
    await d.locator('[data-testid="ticket-card"]').first().click(); await settle(d, 1500)
    ok(/Grout in the shower/.test(await d.locator('[data-testid="ticket-drawer"]').innerText().catch(() => '')), 'a card opens the ticket in the drawer')
    await shot(d, 'h04-studio-tickets-desk')
    await go(d, `/projects/${ben}`)
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 600)
    await d.keyboard.type('T-2026-003'); await settle(d, 1500)
    ok(/Grout in the shower/.test(await d.locator('[role="dialog"], [data-testid="global-search"]').last().innerText().catch(() => '')), '⌘K finds a ticket by its number')
    await d.keyboard.press('Escape')

    // ── 6 · Settings ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Settings')
    await go(d, '/settings?section=projects')
    const cats = d.locator('[data-testid="ticket-categories"]')
    ok(await cats.locator('[data-testid="ticket-category"]').count() === 8, 'Ticket categories: 1.0’s eight words, each kept')
    await cats.getByLabel('Add a category').fill('Leaks'); await cats.getByRole('button', { name: 'Add' }).click(); await settle(d, 1500)
    ok(/Leaks/.test(sql(`select value from settings where key='ticket_categories'`)), 'a category added is saved')
    await cats.locator('[data-testid="ticket-category"]').filter({ hasText: 'Leaks' }).getByRole('button', { name: 'Remove Leaks' }).click(); await settle(d, 1500)
    ok(!/Leaks/.test(sql(`select value from settings where key='ticket_categories'`)), 'an unused one is removed (with Undo)')
    await go(d, '/settings?section=notifications')
    const cm = d.locator('[data-testid="client-messages"]')
    /* (simplify Q-13, a deliberate change of this rule) eleven: a choice to make, the work paused, running again, the home handed over —
       (simplify round 2, a deliberate change of this rule) twelve: + a payment due today (P3 §6.8), off by default
       (parity map, a deliberate change of this rule) sixteen: + a signature confirmed, questions to answer, a floor plan shared, the studio asking for it
       (pending modules S23, a deliberate change of this rule — found stale in S26) seventeen: + a meeting is booked (`client_meeting`)
       (pending modules S27, a deliberate change of this rule) eighteen: + a Hangout chat is booked (`client_hangout`) */
    ok(await cm.count() === 1 && await cm.locator('[data-testid^="client-event-"]').count() === 18, 'Notifications › Messages to clients: eighteen events')
    const dueRow = cm.locator('[data-testid="client-event-client_payment_due"]')
    ok(await dueRow.count() === 1 && !(await dueRow.getByRole('switch', { name: /Email to the client/ }).isChecked()) && !(await dueRow.getByRole('switch', { name: /WhatsApp to the client/ }).isChecked()), 'A payment is due today: its row, Email and WhatsApp off by default (simplify round 2)')
    await cm.locator('[data-testid="client-event-client_invoice_sent"]').getByRole('switch', { name: /WhatsApp to the client/ }).click({ force: true }).catch(async () => { await cm.locator('[data-testid="client-event-client_invoice_sent"] label').last().click() }); await settle(d, 1500)
    ok(sql(`select json_extract(value,'$.channels.client_invoice_sent.whatsapp') from settings where key='client_messages'`) === '1', 'a channel switched on is saved')
    await shot(d, 'h05-settings-client-messages-desk')
    /* (simplify round 2 — P3 §6.8) switched on, the client hears of an invoice on its due day — once, when the studio's bell is read (app/notifications/
       actions.ts fetchFeedAction → lib/portal/payment-due.ts); never for an invoice not yet due */
    await dueRow.getByRole('switch', { name: /Email to the client/ }).click({ force: true }).catch(async () => { await dueRow.locator('label').first().click() }); await settle(d, 1500)
    ok(sql(`select json_extract(value,'$.channels.client_payment_due.email') from settings where key='client_messages'`) === '1', 'A payment is due today: Email switched on is saved')
    const midInv = sql(`select id from project_invoices where project_id='${ben}' and number='INV-2026-006'`)
    const today = new Date(); const noon = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime() / 1000)
    sql(`update project_invoices set due_at = ${noon}, sent_at = ${noon - 7 * 86400} where id='${midInv}'`)
    const dueKeys = () => Number(sql(`select count(*) from notification_outbox where key like 'c:client_payment_due:${midInv}:%:email'`))
    const elsewhere = () => Number(sql(`select count(*) from notification_outbox where key like 'c:client_payment_due:%' and key not like 'c:client_payment_due:${midInv}:%'`))
    await go(d, `/projects/${ben}`)
    await d.locator('[data-notifications-tile]').first().click(); await settle(d, 1800)
    const told = dueKeys()
    ok(told >= 1 && sql(`select count(*) from notification_outbox where key = 'c:client_payment_due:${midInv}:${benHo}:email' and status = 'sent'`) === '1', `its due day: the client is emailed “… is due today” (${told})`)
    ok(elsewhere() === 0, '…and no invoice that isn’t due today')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await d.locator('[data-notifications-tile]').first().click(); await settle(d, 1500)
    ok(dueKeys() === told, '…once: the next look sends nothing more')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 7 · Company: the About card, a member on the About page ─────────────────────────────────────────────────────────────────
    console.log('7 · Company')
    await go(d, '/company/profile')
    const card = d.locator('[data-testid="profile-about"]')
    ok(await card.count() === 1 && await card.locator('[data-testid="about-photo"]').count() === 3, 'Profile › About the studio, for clients: the year, the story, the awards, three photos')
    await card.getByLabel('The year the studio began').fill('2015'); await settle(d, 200)
    await d.locator('[data-testid="about-save"]').click(); await settle(d, 1500)
    ok(sql(`select json_extract(value,'$.year') from settings where key='studio_about'`) === '2015', 'Save lands it')
    await undo(d)
    ok(sql(`select json_extract(value,'$.year') from settings where key='studio_about'`) === '2014', 'Undo puts the year back')
    await go(d, '/company/members')
    /* (pending modules S27, a deliberate change of this rule) the About page dialog became the member's Public profile — a page, opened from the row */
    await d.locator('[data-member-id="huimin"] [data-testid="member-about"]').click(); await d.waitForURL(/\/company\/members\/huimin\/profile/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    const mp = d.locator('[data-testid="public-profile"]')
    await mp.locator('[data-testid="card-shown"]').click(); await settle(d, 200)
    await mp.getByLabel('Job title').fill('Studio manager')
    await d.locator('[data-testid="card-save"]').click(); await settle(d, 1500)
    ok(sql(`select portal_shown || '|' || portal_title from members where id='huimin'`) === '1|Studio manager', 'Members › Public profile: Hui Min shown, with a title')

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
    // ── 8 · The portal ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · The portal')
    const C = await desk(); const c = await C.newPage(); watch(c, 'portal')
    await signIn(c, PHONE.ben)
    const nav = await deskSections(c)
    ok(/Messages/.test(nav) && /Issues/.test(nav) && /About/.test(nav), 'the portal lists Messages, Issues and About')
    await go(c, '/my/demo-studio/about')
    const about = await c.locator('body').innerText()
    ok(/Est\. 2014/.test(about) && /Our team/.test(about) && /Hui Min/.test(about) && /Studio manager/.test(about) && /Germaine/.test(about), 'About: the year, the story and Our team — Hui Min, just shown, with her title')
    await shot(c, 'h06-portal-about-desk', true)
    await go(c, '/my/demo-studio/messages')
    ok(/Probe — the socket/.test(await c.locator('[data-testid="portal-conversation-lines"]').innerText()), 'Messages: the client reads the team’s message')
    await c.locator('[data-testid="portal-composer"] textarea').fill('Probe from Benjamin — the left side works, thank you!')
    await c.locator('[data-testid="portal-composer"] [data-testid="thread-send"]').click(); await settle(c, 1800)
    ok(sql(`select count(*) from project_messages where project_id='${ben}' and author_kind='client' and body like 'Probe from Benjamin%'`) === '1', 'the client writes back')
    ok(sql(`select count(*) from notifications where kind='chat_message' and member_id='germaine' and created_at > strftime('%s','now') - 300`) === '1', 'the team hears it on the bell (Germaine)')
    await shot(c, 'h07-portal-messages-desk', true)
    await go(c, `/my/demo-studio/issues?open=${T4}`); await settle(c, 1200)
    const portalThread = await c.locator('[data-testid="portal-issue-thread"]').innerText().catch(() => '')
    ok(/Probe reply — the plumber/.test(portalThread), 'Issues: the client reads the studio’s reply')
    ok(!/Probe note/.test(portalThread) && !/Asked Ah Seng/.test(portalThread) && !/gave it to/.test(portalThread), 'never an internal note, nor who looks after it (H-Q6)')
    await c.keyboard.press('Escape'); await settle(c, 400)
    ok(await c.locator('[data-testid="portal-issue"]').filter({ hasText: 'wardrobe doors' }).count() === 1, 'the ticket the studio raised shows on the client’s Issues')
    await c.locator('[data-testid="portal-report"]').click(); await settle(c, 500)
    const rf = c.locator('[data-testid="portal-report-form"]')
    await rf.getByLabel('What it is about').click(); await settle(c, 300)
    await c.getByRole('option', { name: 'Site cleanliness', exact: true }).click(); await settle(c, 200)
    await rf.getByLabel('In a few words').fill('Probe — dust left on the balcony')
    await rf.locator('textarea').fill('Fine dust all over the balcony floor after the hacking.')
    await rf.locator('[data-testid="form-photo-input"]').setInputFiles({ name: 'dust.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') }); await settle(c, 900)
    await c.locator('[data-testid="portal-report-send"]').click(); await settle(c, 2200)
    const T6 = sql(`select id from project_tickets where subject like 'Probe — dust left%'`)
    ok(!!T6 && sql(`select raised_kind || '|' || status || '|' || category from project_tickets where id='${T6}'`) === 'client|open|Site cleanliness', 'Report an issue files a ticket — the client’s, Open, its category kept as a word')
    const photoId = sql(`select json_extract(photos,'$[0]') from project_tickets where id='${T6}'`)
    ok(!!photoId && sql(`select f.name from lead_files f join lead_files p on p.id = f.parent_id where f.id='${photoId}'`).length > 0 && sql(`select p.name from lead_files f join lead_files p on p.id = f.parent_id where f.id='${photoId}'`) === 'Tickets', 'its photo is a file of the project in Files › Tickets, with its bytes')
    const photoRes = await c.request.get(`${BASE}/my/demo-studio/file/${photoId}`)
    ok(photoRes.status() === 200 && /image/.test(photoRes.headers()['content-type'] ?? ''), 'the photo opens through the portal’s own file route')
    ok(sql(`select count(*) from notifications where kind='ticket_raised' and href like '%${T6}%'`) === '2', 'the project’s team hears it on the bell (Germaine and Dane)')
    await c.locator('[data-testid="portal-issue"]').filter({ hasText: 'dust left' }).click(); await settle(c, 900)
    await c.locator('[data-testid="portal-issue-close"]').click(); await settle(c, 500)
    await c.getByRole('button', { name: 'Close issue' }).last().click(); await settle(c, 1600)
    ok(sql(`select status from project_tickets where id='${T6}'`) === 'closed', 'whoever reported it closes it')
    await undo(c)
    ok(sql(`select status from project_tickets where id='${T6}'`) === 'open', 'Undo opens it again')
    await shot(c, 'h08-portal-issues-desk', true)

    // ── 9 · The switches ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · The section switches')
    const sectionsBefore = sql(`select value from settings where key='portal_sections'`)
    sql(`insert into settings (key, value, updated_at) values ('portal_sections', '{"issues":false,"messages":false}', strftime('%s','now')) on conflict(key) do update set value=excluded.value`)
    await go(c, '/my/demo-studio/issues')
    ok(!/\/issues/.test(c.url()), 'Issues switched off: its page leads home')
    await go(c, '/my/demo-studio/messages')
    ok(!/\/messages/.test(c.url()) && !/Messages/.test(await deskSections(c)), 'Messages switched off: gone from the bar and its page leads home')
    if (sectionsBefore) sql(`update settings set value='${sectionsBefore.replace(/'/g, "''")}' where key='portal_sections'`); else sql(`delete from settings where key='portal_sections'`)
    const aboutBefore = sql(`select value from settings where key='studio_about'`)
    sql(`update settings set value='{"year":null,"story":"","awards":[]}' where key='studio_about'`); sql(`update studio_pictures set deleted_at = 1 where kind='about'`); sql(`update members set portal_shown = 0`)
    await go(c, '/my/demo-studio/about')
    ok(!/\/about/.test(c.url()) && !/About/.test(await deskSections(c)), 'an empty About page is withheld — no tab, the page leads home')
    sql(`update settings set value='${aboutBefore.replace(/'/g, "''")}' where key='studio_about'`); sql(`update studio_pictures set deleted_at = null where kind='about'`)

    // ── 10 · Who may answer ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · Who may answer')
    as('alex')
    await go(d, `/projects/${ben}/tickets?open=${T4}`); await settle(d, 1000)
    const alexSees = await d.locator('[data-testid="ticket-drawer"]').count()
    ok(alexSees === 0 || await d.locator('[data-testid="ticket-composer"]').count() === 0, 'a member off the project’s team can’t answer its tickets')
    as('dane')

    // ── 11 · Activity, Sent messages ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('11 · Activity and Sent messages')
    await go(d, `/projects/${ben}/activity`)
    const act = await d.locator('body').innerText()
    ok(/reported an issue/.test(act) && /messages with Benjamin Han/.test(act), 'Activity: tickets raised, and the days of messages')
    /* (simplify round 2 — S-22) the ask made into a task has its own line, under Messages, opening the task */
    ok(/made a task from [^\n]*’s message — “/.test(act), 'Activity: “… made a task from {client}’s message — “…”” (simplify round 2)')
    /* (simplify round 3, REG-1559) under All the ask's line says it once — the task's own "created" line shows under the Tasks chip only */
    if (askTitle) {
      const created = `created the task “${askTitle}”`
      ok(!act.includes(created), 'Activity › All: the task made from the ask is said once, by the ask’s line (REG-1559)')
      await d.locator('[data-testid="activity-chips"] [role="radio"]', { hasText: /^Tasks/ }).first().click(); await settle(d, 500)
      ok((await d.locator('[data-testid="activity-feed"]').innerText()).includes(created), '…and its own “created the task” line is under the Tasks chip')
    }
    await go(d, '/settings?section=notifications')
    ok(/To the client · The studio answers an issue/.test(await d.locator('[data-testid="notification-sent"]').innerText().catch(() => '')), 'Sent messages lists the client’s messages')

    // ── 12 · The phone, 320 ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('12 · The phone')
    const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
    await go(m, `/projects/${ben}/tickets`); ok(await noOverflow(m), 'Tickets: no sideways scroll at 390'); await shot(m, 'h09-tickets-phone', true)
    await go(m, '/chat'); await m.locator('[data-testid="chat-row"]').first().click(); await settle(m, 1500)
    ok(await m.locator('[data-testid="chat-list"]').isVisible() === false && await m.locator('[data-testid="project-conversation"]').isVisible(), '/chat on a phone: one conversation at a time')
    await shot(m, 'h10-chat-phone', true)
    await signIn(m, PHONE.ben)
    await go(m, '/my/demo-studio/issues'); ok(await noOverflow(m), 'portal Issues: no sideways scroll at 390')
    await m.locator('[data-testid="portal-issue"]').first().click(); await settle(m, 900); await shot(m, 'h11-portal-issue-phone'); await m.keyboard.press('Escape')
    await go(m, '/my/demo-studio/about'); ok(await noOverflow(m), 'portal About: no sideways scroll at 390'); await shot(m, 'h12-portal-about-phone', true)
    await m.setViewportSize({ width: 320, height: 640 })
    for (const u of ['/my/demo-studio/messages', '/my/demo-studio/issues', '/my/demo-studio/about']) { await go(m, u); ok(await noOverflow(m), `${u.split('/').pop()}: no sideways scroll at 320`) }
    await M.close(); await C.close(); await D.close()
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    putBack(); as('dane')
    await b.close()
    ok(sql(`select count(*) from project_tickets where subject like 'Probe%'`) === '0' && sql(`select count(*) from project_messages where body like 'Probe%'`) === '0', 'the run leaves the DB as it found it')
    if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail || errors.length ? 1 : 0)
  }
})()
