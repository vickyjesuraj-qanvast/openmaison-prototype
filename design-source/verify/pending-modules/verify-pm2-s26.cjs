// Pending modules, step S26 · Team and group chats (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// studio:team-chats and api:messages-free-chats — 1.0's /inbox: New Chat · New Group · a group's members by hand · All · Unread · the context
// panel's Docs · Media · Links · keyword reply suggestions; src/app/(main)/inbox, src/components/inbox/*, src/app/api/chats/records/**).
// Each item asserted as the rule it builds, never another round's count:
//  - one home: the studio's own conversations join Messages' one list and one composer — the studio's room (every member who opens Messages,
//    never Accounting), two members' (one pair, one conversation), a named group, a lead's Team conversation before Won (its members hear it)
//  - New message ▾ (C): A member › opens the two of you (the same one again), A new group asks for a name and people, A client opens any
//    lead's or project's conversation — invited or not (the composer offers Invite to Portal)
//  - a group's people by hand: Add people · Take out (a Designer never takes an Owner or an Admin out) · Leave the group · Rename — each
//    remove with its Undo, each change a line in the group in the reader's words
//  - the list's filters All · Unread · Clients · Team; Details' Docs · Media · Links read from the lines; links in words open; Seen by from
//    each reader's own read mark; reply suggestions between members only where one is owed
//  - the bells: member_message to the people in it (never the writer, never who muted it, never Accounting); team_message to a lead's
//    members; ⌘K finds the words of a conversation you are in, never two others'
//  - PRIVACY (the P-G rule): a team, group, room or lead-team line never reaches a client — not their page, not their bell, not their files
//  - once Won the project's Team conversation reads the lead's Team lines first; the meeting room's Share with the team posts its brief
//  - 390 · 320 · 768 touch with no sideways scroll against screen.width; the ghost draws the page; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s26.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s26')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2s26-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

/* The ghost-vs-page measure (the S17 · S23 · S24 · S25 probes'): in the held reveal every element carrying a page module's class in both, index
   by index after aligning the lists — the first screen only — and every Words sentence the ghost sets in a page class against that page's. */
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
    return { rows }
  }, { blocks, max })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const serena = sql(`select id from leads where name='Serena Koh' and deleted_at is null`)
  const serenaPhone = sql(`select phone from homeowner_profiles where id=(select homeowner_id from homeowner_lead_links where lead_id='${serena}' limit 1)`)
  const benPhone = sql(`select phone from homeowner_profiles where name='Benjamin Han' limit 1`)
  const ben = sql(`select id from projects where number='P-2026-002'`)
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  /* a lead nobody invited to their page and with no project — New message › A client opens its conversation all the same */
  const uninvited = json(`select l.id, l.name from leads l where l.deleted_at is null and l.direct = 0 and not exists (select 1 from homeowner_lead_links h where h.lead_id = l.id) and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) and exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = 'dane') order by l.name limit 1`)[0]
    ?? json(`select l.id, l.name from leads l where l.deleted_at is null and l.direct = 0 and not exists (select 1 from homeowner_lead_links h where h.lead_id = l.id) and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) order by l.name limit 1`)[0]
  const kevinMeeting = sql(`select m.id from meetings m join leads l on l.id = m.lead_id where l.name = 'Kevin Ng' and m.status = 'held' and m.deleted_at is null limit 1`)
  /* what the run may change, kept to put back — whole tables, and the new files' bytes by id */
  const WHOLE = ['conversations', 'conversation_participants', 'conversation_messages', 'conversation_files', 'chat_reads', 'conversation_prefs', 'notifications', 'notification_outbox', 'lead_messages', 'project_messages', 'members', 'portal_sessions', 'portal_bell_reads', 'maison_questions']
  const kept = WHOLE.map((t) => [t, json(`select * from ${t}`)])
  const filesBefore = new Set(json(`select id from lead_files`).map((r) => r.id))
  const imagesBefore = new Set(json(`select file_id from lead_file_images`).map((r) => r.file_id))
  const stagesBefore = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logsBefore = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    const newFiles = json(`select id from lead_files`).map((r) => r.id).filter((id) => !filesBefore.has(id))
    for (const id of newFiles) text += `DELETE FROM lead_files WHERE id = ${lit(id)};\nDELETE FROM lead_file_thumbs WHERE file_id = ${lit(id)};\n`
    for (const id of json(`select file_id from lead_file_images`).map((r) => r.file_id).filter((id) => !imagesBefore.has(id))) text += `DELETE FROM lead_file_images WHERE file_id = ${lit(id)};\n`
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const rowsOf = (p) => p.locator('[data-testid="chat-row"]')
  const row = (p, title, kind) => rowsOf(p).filter({ hasText: title }).and(p.locator(kind ? `[data-kind="${kind}"]` : '*'))
  const composer = (p) => p.locator('[data-testid="conversation-composer"]')
  const send = async (p, words) => { await composer(p).locator('textarea').fill(words); await composer(p).getByTestId('thread-send').click(); await settle(p, 1400) }
  const lines = (p) => p.getByTestId('conversation-lines')
  const openRow = async (p, title, kind) => { await row(p, title, kind).first().click(); await settle(p, 1200) }
  const newMenu = async (p) => { await p.getByTestId('chat-new').click(); await settle(p, 400) }
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: /Open my/ }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  const railCount = async (p) => { const l = await p.locator('nav a[href="/chat"], a[href="/chat"]').first().getAttribute('aria-label').catch(() => ''); const m = /\((\d+) unread\)/.exec(l ?? ''); return m ? Number(m[1]) : 0 }
  const notes = (kind, member, since) => Number(sql(`select count(*) from notifications where kind='${kind}' and member_id='${member}' and created_at >= ${since}`))
  const nowS = () => Number(sql(`select cast(strftime('%s','now') as integer)`)) - 1   // notifications and the outbox keep seconds
  as('dane')
  let D, d
  try {
    D = await desk(); d = await D.newPage(); watch(d, 'dane')

    // ── 1 · One list: the studio's own conversations beside the clients' ─────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · One list, one home')
      await go(d, '/chat')
      ok(await d.getByRole('heading', { name: 'Messages', level: 1 }).count() === 1 && await d.getByTestId('chat-new').getAttribute('data-kb') === 'create', 'Messages: one page, its header’s New message is the page’s create (C)')
      const studioName = sql(`select json_extract(value,'$.name') from settings where key='studio'`).replace(/[\s,]+(pte\.?\s*ltd\.?|private limited|llp|ltd\.?)$/i, '').trim()
      ok(await row(d, `Everyone at ${studioName}`, 'chat').count() === 1 && /studio/i.test(await row(d, 'Everyone at', 'chat').first().innerText()), 'the studio’s room is in the list, a Studio chip on it')
      ok(await d.locator('[data-testid="chat-row"][data-chat="direct"]').filter({ hasText: 'Germaine' }).count() === 1, 'two members’ conversation (Germaine) — a Direct chip')
      ok(await d.locator('[data-testid="chat-row"][data-chat="group"]').filter({ hasText: 'Site team' }).count() === 1, 'a named group (Site team) — a Group chip')
      ok(await row(d, 'Serena Koh', 'lead-team').count() === 1 && await row(d, 'Serena Koh', 'lead').count() === 1, 'Serena Koh twice: her Team conversation (the studio’s) and her own (Lead)')
      /* the rail's count is the rows with unread lines, minus the muted */
      const rows = await rowsOf(d).evaluateAll((els) => els.map((e) => ({ unread: e.hasAttribute('data-unread'), muted: e.hasAttribute('data-muted') })))
      ok(await railCount(d) === rows.filter((r) => r.unread && !r.muted).length, 'the rail’s count = the conversations with an unread line, none muted', `rail ${await railCount(d)}`)
      ok(await rowsOf(d).first().getAttribute('data-unread') !== null, 'unread first (none pinned)')
      /* the filters */
      const chips = d.getByTestId('chat-filters')
      ok(/All/.test(await chips.innerText()) && /Unread/.test(await chips.innerText()) && /Clients/.test(await chips.innerText()) && /Team/.test(await chips.innerText()), 'the filters: All · Unread · Clients · Team')
      await chips.getByRole('radio', { name: 'Unread' }).click(); await settle(d, 300)
      ok((await rowsOf(d).evaluateAll((els) => els.every((e) => e.hasAttribute('data-unread')))) && await rowsOf(d).count() >= 1, 'Unread: only the conversations with an unread line')
      await chips.getByRole('radio', { name: 'Clients' }).click(); await settle(d, 300)
      ok(await rowsOf(d).evaluateAll((els) => els.every((e) => ['client', 'lead'].includes(e.getAttribute('data-kind')))), 'Clients: a client’s conversations only')
      await chips.getByRole('radio', { name: 'Team' }).click(); await settle(d, 300)
      ok(await rowsOf(d).evaluateAll((els) => els.length > 0 && els.every((e) => ['team', 'lead-team', 'chat'].includes(e.getAttribute('data-kind')))), 'Team: the studio’s own only (Team, Direct, Group, Studio)')
      await shot(d, 's26-01-team-filter-1440')
      await chips.getByRole('radio', { name: 'All' }).click(); await settle(d, 300)
      /* C opens New message */
      await d.locator('body').click({ position: { x: 700, y: 60 } }).catch(() => {})
      await d.keyboard.press('c'); await settle(d, 500)
      ok(await d.getByTestId('chat-new').getAttribute('aria-expanded') === 'true', 'C opens New message ▾')
      ok(await d.getByTestId('chat-new-direct').count() === 1 && await d.getByTestId('chat-new-group').count() === 1 && await d.getByTestId('chat-new-client').count() === 1, 'New message ▾: A member › · A new group · A client')
      await shot(d, 's26-01-new-menu-1440')
      await d.keyboard.press('Escape'); await settle(d, 300)
      /* the room's link opens; a line's address is a link */
      await openRow(d, 'Everyone at', 'chat')
      const link = lines(d).locator('a[href="https://www.hdb.gov.sg"]')
      ok(await link.count() === 1 && await link.getAttribute('target') === '_blank', 'a web address in a line opens, in a new tab')
      ok(/Every member of the studio reads this/.test(await composer(d).innerText()), 'the room’s composer says who reads it')
      await shot(d, 's26-01-room-1440')
      /* Maison AI here acts: Start a group opens New group */
      await go(d, '/chat')
      await d.locator('button[aria-label="Maison AI"]').first().click(); await settle(d, 700)
      const sheet = d.locator('[role="dialog"]').filter({ hasText: 'Start a group' }).last()
      ok(await sheet.count() === 1, 'Maison AI offers the page’s own: Start a group')
      await sheet.getByRole('button', { name: 'Start a group' }).first().click(); await settle(d, 900)
      ok(await d.getByTestId('new-group').isVisible().catch(() => false), '…and its press opens New group')
      await d.keyboard.press('Escape'); await settle(d, 500)
      /* ⌘K's Create: New message — Messages with New message ▾ open */
      await go(d, '/tasks')
      await d.keyboard.press('Meta+k'); await settle(d, 500)
      await d.keyboard.type('new message'); await settle(d, 1200)
      const create = d.getByRole('option').filter({ hasText: 'New message' }).first()
      ok(await create.count() === 1, '⌘K: Create › New message')
      await create.click(); await d.waitForURL(/\/chat/, { timeout: 10000 }).catch(() => {}); await settle(d, 2200)
      ok(new URL(d.url()).pathname === '/chat' && await d.getByTestId('chat-new').getAttribute('aria-expanded') === 'true', '…it lands on Messages with New message ▾ open')
      await d.keyboard.press('Escape'); await settle(d, 300)
    }

    // ── 2 · Two members: one press, one conversation; the bell; Seen; replies by rule ────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · A member › — the two of you')
      const t0 = nowS()
      await go(d, '/chat')
      await newMenu(d)
      await d.getByTestId('chat-new-direct').click(); await settle(d, 300)
      const listed = await d.locator('[data-testid="chat-new-member"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-member')))
      ok(listed.includes('huimin') && !listed.includes('priya') && !listed.includes('dane'), 'A member › lists the studio’s members who open Messages — never Accounting, never you', listed.join(','))
      await d.locator('[data-testid="chat-new-member"][data-member="huimin"]').click(); await settle(d, 1500)
      ok((await d.getByTestId('chat-open-title').innerText()).trim() === 'Hui Min' && /Just the two of you/.test(await d.getByTestId('conversation-who').innerText()), 'it opens the two of you — titled by the other')
      const pair = json(`select c.id, (select count(*) from conversation_participants p where p.conversation_id = c.id) n from conversations c where c.pair_key = 'dane|huimin'`)
      ok(pair.length === 1 && pair[0].n === 2, 'one conversation for the pair, with its two people')
      await send(d, 'Hui Min, can you check the PO for Ryan’s carpentry before Friday?')
      const sent = json(`select id, body from conversation_messages where conversation_id = '${pair[0]?.id}' order by created_at desc limit 1`)[0]
      ok(sent && /PO for Ryan/.test(sent.body), 'the line is kept with the conversation')
      ok(notes('member_message', 'huimin', t0) === 1 && notes('member_message', 'dane', t0) === 0, 'the bell: Hui Min hears it (member_message), the writer doesn’t')
      ok(sql(`select count(*) from notification_outbox where created_at >= ${t0} and event in ('client_message')`) === '0', 'nothing goes to a client')
      /* the same press again — the same conversation */
      await newMenu(d); await d.getByTestId('chat-new-direct').click(); await settle(d, 300)
      await d.locator('[data-testid="chat-new-member"][data-member="huimin"]').click(); await settle(d, 1200)
      ok(sql(`select count(*) from conversations where pair_key = 'dane|huimin'`) === '1' && /PO for Ryan/.test(await lines(d).innerText()), 'A member › again opens the same one — never a second')
      /* a second message inside the quiet window rings no second bell */
      await send(d, 'And the delivery date too, please.')
      ok(notes('member_message', 'huimin', t0) === 1, 'a second line within 15 minutes, while the first bell waits unread: no second bell')
      ok(await d.getByTestId('conversation-seen').count() === 0, 'nothing says Seen before Hui Min opened it')
      /* Hui Min reads it */
      as('huimin')
      const H = await desk(); const h = await H.newPage(); watch(h, 'huimin')
      await go(h, '/chat')
      const hr = h.locator('[data-testid="chat-row"][data-chat="direct"]').filter({ hasText: 'Dane' })
      ok(await hr.count() === 1 && await hr.getAttribute('data-unread') !== null, 'Hui Min: the conversation with Dane, unread')
      ok(await railCount(h) >= 1, 'her rail counts it')
      await hr.click(); await settle(h, 1500)
      const sug = h.getByTestId('suggested-replies')
      ok(await sug.count() === 1 && /Let me check|Sure|I’ll chase/.test(await sug.innerText()), 'a teammate’s ask offers replies by rule', await sug.innerText().catch(() => ''))
      await sug.getByTestId('suggested-reply').first().click(); await settle(h, 300)
      ok((await composer(h).locator('textarea').inputValue()).length > 5, 'a tap fills the box — never sends')
      await shot(h, 's26-02-direct-huimin-1440')
      as('dane')
      await go(d, '/chat'); await d.locator('[data-testid="chat-row"][data-chat="direct"]').filter({ hasText: 'Hui Min' }).click(); await settle(d, 1500)
      ok((await d.getByTestId('conversation-seen').innerText().catch(() => '')).trim() === 'Seen', 'once she has opened it: Seen, under your newest line (two people)')
      as('huimin')
      await h.reload({ waitUntil: 'networkidle' }); await settle(h, 1200)
      if (!(await h.getByTestId('project-conversation').count())) { await h.locator('[data-testid="chat-row"][data-chat="direct"]').filter({ hasText: 'Dane' }).click(); await settle(h, 1200) }
      await send(h, 'Checked — the PO is fine, delivery is 28 Oct.')
      ok(notes('member_message', 'dane', t0) === 1, 'Dane hears her answer')
      await H.close()
      as('dane')
    }

    // ── 3 · A new group: a name and people; its people by hand; the 1.0 rule for taking someone out; every remove with Undo ───────────
    if (want(3)) {
      console.log('3 · A new group')
      const t0 = nowS()
      await go(d, '/chat')
      await newMenu(d); await d.getByTestId('chat-new-group').click(); await settle(d, 600)
      await d.getByTestId('new-group-create').click(); await settle(d, 400)
      const dlg = d.getByTestId('new-group')
      ok(/Name the group/.test(await dlg.innerText()) && /Pick at least one person/.test(await dlg.innerText()), 'Create with nothing says what’s missing — a name, a person')
      await dlg.getByLabel('Group name').fill('Probe crew')
      await dlg.locator('[data-field="assignees"] input').click(); await settle(d, 300)
      const opts = d.locator('[role="option"]')
      ok(!(await opts.allInnerTexts()).some((t) => /Priya/.test(t)), 'the people to pick never include Accounting')
      await opts.filter({ hasText: 'Germaine' }).click(); await opts.filter({ hasText: 'Sarah' }).click()
      await d.keyboard.press('Escape'); await settle(d, 200)
      await shot(d, 's26-03-new-group-1440')
      await d.getByTestId('new-group-create').click(); await settle(d, 1800)
      const g = json(`select id from conversations where kind='group' and name='Probe crew'`)[0]
      ok(!!g && sql(`select group_concat(member_id) from (select member_id from conversation_participants where conversation_id='${g?.id}' and removed_at is null order by member_id)`) === 'dane,germaine,sarah', 'the group is made with you in it')
      ok((await d.getByTestId('chat-open-title').innerText()).trim() === 'Probe crew' && /You started the group with Germaine and Sarah/.test(await lines(d).innerText()), 'it opens, its first line saying who started it with whom')
      ok(notes('member_message', 'germaine', t0) === 1 && notes('member_message', 'sarah', t0) === 1 && /added you to “Probe crew”/.test(sql(`select title from notifications where member_id='sarah' and kind='member_message' and created_at >= ${t0}`)), 'each person added hears it — “Dane added you to …”')
      /* Details: people (you first), Rename with Undo, Add people, Take out with Undo */
      await d.getByTestId('conversation-details').click(); await settle(d, 1000)
      const people = await d.locator('[data-testid="details-person"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-member')))
      ok(people[0] === 'dane' && people.length === 3, 'Details: the people, you first')
      await shot(d, 's26-03-details-1440')
      await d.getByTestId('details-rename').click(); await settle(d, 400)
      await d.getByLabel('Group name').fill('Probe crew 2'); await d.getByTestId('rename-save').click(); await settle(d, 1500)
      ok(sql(`select name from conversations where id='${g?.id}'`) === 'Probe crew 2' && sql(`select count(*) from conversation_messages where conversation_id='${g?.id}' and event='renamed'`) === '1', 'Rename: the name, and a line saying so')
      await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1500)
      ok(sql(`select name from conversations where id='${g?.id}'`) === 'Probe crew' && sql(`select count(*) from conversation_messages where conversation_id='${g?.id}' and event='renamed'`) === '0', 'Undo: the old name back, the line gone')
      if (!(await d.getByTestId('details-people').isVisible().catch(() => false))) { await d.getByTestId('conversation-details').click(); await settle(d, 900) }
      await d.getByTestId('details-add').click(); await settle(d, 500)
      await d.locator('[role="dialog"] [data-field="assignees"] input').last().click(); await settle(d, 300)
      await d.locator('[role="option"]').filter({ hasText: 'Alex' }).click(); await d.keyboard.press('Escape'); await settle(d, 200)
      await d.getByTestId('add-people-save').click(); await settle(d, 1600)
      ok(sql(`select count(*) from conversation_participants where conversation_id='${g?.id}' and member_id='alex' and removed_at is null`) === '1' && /You added Alex/.test(await lines(d).innerText()), 'Add people: Alex is in, the line says so')
      if (!(await d.getByTestId('details-people').isVisible().catch(() => false))) { await d.getByTestId('conversation-details').click(); await settle(d, 900) }
      await d.locator('[data-testid="details-person"][data-member="sarah"]').getByTestId('details-take-out').click(); await settle(d, 1500)
      ok(sql(`select removed_by from conversation_participants where conversation_id='${g?.id}' and member_id='sarah'`) === 'dane', 'Take out: Sarah is out (who took her out is kept)')
      await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1500)
      ok(sql(`select quote(removed_at) from conversation_participants where conversation_id='${g?.id}' and member_id='sarah'`) === 'NULL' && sql(`select count(*) from conversation_messages where conversation_id='${g?.id}' and event='removed'`) === '0', 'Undo: Sarah is back, the line gone')
      await d.keyboard.press('Escape'); await settle(d, 300)
      /* as a Designer in it: Take out is never offered on the Owner; it is on another Designer */
      as('germaine')
      const G = await desk(); const gp = await G.newPage(); watch(gp, 'germaine')
      await go(gp, `/chat?open=${encodeURIComponent(`chat:${g?.id}`)}`); await settle(gp, 900)
      await gp.getByTestId('conversation-details').click(); await settle(gp, 1000)
      ok(await gp.locator('[data-testid="details-person"][data-member="dane"]').getByTestId('details-take-out').count() === 0 && await gp.locator('[data-testid="details-person"][data-member="alex"]').getByTestId('details-take-out').count() === 1, '1.0’s rule: a Designer never takes an Owner or an Admin out — a Designer they can')
      /* Leave the group, with Undo */
      await gp.getByTestId('details-leave').click(); await settle(gp, 1500)
      ok(sql(`select removed_by from conversation_participants where conversation_id='${g?.id}' and member_id='germaine'`) === 'germaine' && await gp.getByTestId('chat-pick').count() === 1, 'Leave the group: she is out, the conversation closes')
      ok(await gp.locator('[data-testid="chat-row"]').filter({ hasText: 'Probe crew' }).count() === 0, '…and it leaves her list')
      await gp.getByRole('button', { name: 'Undo' }).last().click(); await settle(gp, 1800)
      ok(sql(`select quote(removed_at) from conversation_participants where conversation_id='${g?.id}' and member_id='germaine'`) === 'NULL' && sql(`select count(*) from conversation_messages where conversation_id='${g?.id}' and event='left'`) === '0', 'Undo: back in, the line gone')
      /* someone not in it reads none of it — the conversation, its lines, its search */
      await G.close()
      as('michelle')
      const Mi = await desk(); const mi = await Mi.newPage(); watch(mi, 'michelle')
      await go(mi, `/chat?open=${encodeURIComponent(`chat:${g?.id}`)}`); await settle(mi, 1200)
      ok(await mi.getByTestId('chat-open-title').count() === 0 && !/Probe crew/.test(await mi.locator('body').innerText()), 'a member not in it can’t open it — nor see it listed')
      await Mi.close()
      as('dane')
    }

    // ── 4 · The studio's room: everyone who opens Messages; a mute holds; Accounting is in none ─────────────────────────────────────
    if (want(4)) {
      console.log('4 · The studio’s room')
      const t0 = nowS()
      /* Dane mutes the room first — then Michelle writes */
      await go(d, `/chat?open=${encodeURIComponent('chat:studio')}`); await settle(d, 900)
      await d.getByTestId('conversation-menu').click(); await settle(d, 300)
      await d.getByTestId('conversation-mute').click(); await settle(d, 1000)
      ok(sql(`select count(*) from conversation_prefs where member_id='dane' and conversation='chat:studio' and muted_at is not null`) === '1', 'Mute: kept for Dane, on the server')
      as('michelle')
      const Mi = await desk(); const mi = await Mi.newPage(); watch(mi, 'michelle')
      await go(mi, `/chat?open=${encodeURIComponent('chat:studio')}`); await settle(mi, 900)
      await send(mi, 'Anyone free to pick up the Niro samples tomorrow morning?')
      const workspace = json(`select id from members where is_active = 1 and role not in ('Accounting', 'Marketing') and id <> 'michelle'`).map((r) => r.id)   // (S44O — call C6) Marketing is in no members' room either
      const heard = json(`select member_id from notifications where kind='member_message' and created_at >= ${t0}`).map((r) => r.member_id)
      ok(heard.includes('huimin') && heard.includes('germaine') && !heard.includes('dane') && !heard.includes('michelle') && !heard.includes('priya'), 'the room’s line rings everyone in it — never the writer, never who muted it, never Accounting', heard.join(','))
      ok(heard.every((m) => workspace.includes(m)), '…and nobody outside the studio’s members')
      await Mi.close()
      as('dane')
      await go(d, '/chat')
      ok(await row(d, 'Everyone at', 'chat').first().getAttribute('data-muted') !== null, 'Dane’s list marks it muted (and it leaves his rail’s count)')
      await go(d, `/chat?open=${encodeURIComponent('chat:studio')}`); await settle(d, 900)
      await d.getByTestId('conversation-menu').click(); await settle(d, 300)
      await d.getByTestId('conversation-mute').click(); await settle(d, 800)
      /* Accounting: the house gate, before a record is read */
      as('priya')
      const P = await desk(); const pp = await P.newPage(); watch(pp, 'priya')
      await go(pp, '/chat')
      ok(await pp.getByTestId('access-gate').count() === 1 && !/Niro samples/.test(await pp.locator('body').innerText()), 'Accounting: Messages is the house gate — no line of the room')
      const st = (await pp.request.get(`${BASE}/chat/file/s26-file-board`)).status()
      ok(st === 404, 'Accounting never opens a members’ conversation’s file')
      await P.close()
      as('dane')
      await go(d, `/chat?open=${encodeURIComponent('chat:studio')}`); await settle(d, 900)
      await d.getByTestId('conversation-details').click(); await settle(d, 1000)
      const inRoom = await d.locator('[data-testid="details-person"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-member')))
      ok(inRoom.includes('dane') && inRoom.includes('huimin') && !inRoom.includes('priya'), 'the room’s people: everyone who opens Messages — Accounting is not in it')
      ok(await d.locator('[data-testid="details-shared-tabs"]').count() === 1, 'Details: Shared in this conversation')
      await d.getByTestId('details-shared-tabs').getByRole('radio', { name: /^Links/ }).click(); await settle(d, 300)
      const lk = d.locator('[data-testid="details-shared-row"][data-kind="link"]')
      ok(await lk.count() >= 1 && await lk.first().getAttribute('href') === 'https://www.hdb.gov.sg', 'Links: the address a line holds')
      await shot(d, 's26-04-room-links-1440')
      await d.keyboard.press('Escape'); await settle(d, 300)
    }

    // ── 5 · Docs · Media · Links; a file in a members' conversation is for its people alone ──────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Docs · Media · Links, and the file rule')
      await go(d, '/chat')
      await d.locator('[data-testid="chat-row"][data-chat="group"]').filter({ hasText: 'Site team' }).click(); await settle(d, 1200)
      ok(await lines(d).locator('img').count() >= 1, 'a picture sent in the group shows in its line')
      await d.getByTestId('conversation-details').click(); await settle(d, 1200)
      const media = d.locator('[data-testid="details-shared-row"][data-kind="photo"]')
      ok(await media.count() >= 1 && /\/chat\/file\//.test(await media.first().getAttribute('href') ?? ''), 'Media: the picture, from the conversation’s own store')
      const fileHref = await media.first().getAttribute('href')
      ok((await d.request.get(BASE + fileHref)).status() === 200, '…it opens for someone in it')
      await d.keyboard.press('Escape'); await settle(d, 300)
      /* a document, sent through the + in the two of you with Germaine */
      await go(d, '/chat'); await d.locator('[data-testid="chat-row"][data-chat="direct"]').filter({ hasText: 'Germaine' }).click(); await settle(d, 1200)
      await composer(d).getByTestId('thread-file-input').setInputFiles({ name: 'Probe drawing.pdf', mimeType: 'application/pdf', buffer: PDF }); await settle(d, 2000)
      await send(d, 'Probe — the revised drawing')
      const doc = json(`select f.id from conversation_files f join conversations c on c.id = f.conversation_id where c.pair_key = 'dane|germaine' and f.name = 'Probe drawing.pdf'`)[0]
      ok(!!doc && await lines(d).getByTestId('thread-file').filter({ hasText: 'Probe drawing.pdf' }).count() === 1, 'a PDF goes in the line, kept with the conversation (not a lead’s Files)')
      await d.getByTestId('conversation-details').click(); await settle(d, 1200)
      await d.getByTestId('details-shared-tabs').getByRole('radio', { name: /^Docs/ }).click(); await settle(d, 300)
      ok(await d.locator('[data-testid="details-shared-row"][data-kind="doc"]').filter({ hasText: 'Probe drawing.pdf' }).count() === 1, 'Docs: the document')
      await shot(d, 's26-05-docs-1440')
      await d.keyboard.press('Escape'); await settle(d, 300)
      /* Sarah is in neither — the file never opens for her */
      as('sarah')
      const Sa = await desk(); const sa = await Sa.newPage(); watch(sa, 'sarah')
      await go(sa, '/tasks')
      ok((await sa.request.get(`${BASE}/chat/file/${doc?.id}`)).status() === 404 && (await sa.request.get(BASE + fileHref)).status() === 404, 'a members’ conversation’s file never opens for someone not in it')
      await Sa.close()
      as('dane')
    }

    // ── 6 · A lead's Team conversation before Won: the door, the bell, Activity, ⌘K, and Won carries it on ────────────────────────
    if (want(6)) {
      console.log('6 · A lead’s Team conversation')
      const t0 = nowS()
      await go(d, `/leads/${serena}`)
      const door = d.getByTestId('info-team-chat')
      ok(await door.count() === 1 && /lead-team/.test(decodeURIComponent(await door.getAttribute('href') ?? '')), 'the lead’s Collaborators: Team chat · Messages')
      await shot(d, 's26-06-lead-door-1440')
      await door.click(); await d.waitForURL(/\/chat/, { timeout: 10000 }).catch(() => {}); await settle(d, 1800)
      ok((await d.getByTestId('chat-open-title').innerText().catch(() => '')).trim() === 'Serena Koh' && await d.locator('[data-testid="project-conversation"]').getAttribute('data-conversation') === 'lead-team', 'it opens her Team conversation')
      ok(/never sees/.test(await composer(d).innerText()), 'the composer says Serena never sees it')
      await send(d, 'Probe team — Serena asked about the shoe cabinet bench again.')
      const team = json(`select member_id from lead_assignees where lead_id='${serena}'`).map((r) => r.member_id)
      ok(team.every((m) => m === 'dane' || notes('team_message', m, t0) === 1) && notes('team_message', 'huimin', t0) === (team.includes('huimin') ? 1 : 0), 'its members hear it (team_message) — not the rest of the studio')
      ok(sql(`select count(*) from lead_messages where body like 'Probe team%'`) === '0' && sql(`select count(*) from conversation_messages m join conversations c on c.id = m.conversation_id where c.kind = 'lead' and c.lead_id = '${serena}' and m.body like 'Probe team%'`) === '1', 'kept as the studio’s own (never in the client’s conversation)')
      await go(d, `/leads/${serena}/activity`)
      ok(/in the team chat/.test(await d.locator('body').innerText()), 'the lead’s Activity: a day’s line for its team chat')
      /* Won: the project's Team conversation reads the lead's Team lines first — Benjamin's lead given a line from before his project */
      const pStart = Number(sql(`select created_at from projects where id='${ben}'`)) * 1000   // projects keep seconds; conversation lines ms
      sqlFile(`INSERT INTO conversations (id, kind, name, lead_id, pair_key, created_by, created_at, last_message_at) VALUES ('probe-lt-ben', 'lead', NULL, '${benLead}', NULL, 'germaine', ${pStart - 86400000 * 2}, ${pStart - 86400000 * 2});
INSERT INTO conversation_messages (id, conversation_id, author_id, author_name, body, attachments, event, meta, created_at, deleted_at) VALUES ('probe-lt-ben-1', 'probe-lt-ben', 'germaine', 'Germaine', 'Probe before Won — Benjamin wants the study turned into a nursery.', NULL, NULL, NULL, ${pStart - 86400000 * 2}, NULL);`)
      await go(d, `/projects/${ben}/messages?channel=team`)
      const tl = await lines(d).innerText()
      ok(/Probe before Won/.test(tl) && await d.getByTestId('thread-project-began').count() === 1, 'once Won: the project’s Team conversation reads the lead’s Team lines first, under “The project began”')
      await go(d, `/chat?open=${encodeURIComponent(`lead-team:${benLead}`)}`); await settle(d, 900)
      ok(/HDB 5-Room/.test(await d.getByTestId('chat-open-title').innerText().catch(() => '')), 'a lead’s Team key opens the project’s Team conversation once Won')
      /* ⌘K: the words of a Team conversation the viewer sees; never two others' */
      await d.keyboard.press('Meta+k'); await settle(d, 500)
      await d.keyboard.type('shoe cabinet bench'); await settle(d, 1500)
      ok(/Probe team/.test(await d.locator('[role="dialog"], [data-testid="global-search"]').first().innerText().catch(() => '')), '⌘K finds a line of the lead’s Team conversation')
      await d.keyboard.press('Escape'); await settle(d, 300)
      as('germaine')
      const G = await desk(); const gp = await G.newPage(); watch(gp, 'germaine')
      await go(gp, '/tasks')
      await gp.keyboard.press('Meta+k'); await settle(gp, 500)
      await gp.keyboard.type('PO for Ryan'); await settle(gp, 1500)
      ok(!/PO for Ryan’s carpentry/.test(await gp.locator('body').innerText()), '⌘K never finds two others’ words (Dane and Hui Min’s)')
      await gp.keyboard.press('Escape')
      await G.close()
      as('dane')
      await go(d, '/tasks')
      await d.keyboard.press('Meta+k'); await settle(d, 500)
      await d.keyboard.type('Site team'); await settle(d, 1500)
      const grp = d.getByRole('option').filter({ hasText: 'Site team' }).first()
      ok(await grp.count() === 1 && /group/i.test(await grp.innerText()), '⌘K finds a group you are in by its name')
      await grp.click(); await d.waitForURL(/\/chat/, { timeout: 10000 }).catch(() => {}); await settle(d, 2000)
      ok((await d.getByTestId('chat-open-title').innerText().catch(() => '')).trim() === 'Site team', '…and opens it')
      /* someone who left the studio: their conversation stays, nobody writes into it */
      sql(`update members set is_active = 0 where id = 'germaine'`)
      await go(d, `/chat?open=${encodeURIComponent('chat:s26-direct-dg')}`); await settle(d, 1200)
      ok(/no longer in the studio/.test(await d.getByTestId('conversation-cant-write').innerText().catch(() => '')) && await composer(d).count() === 0, 'two people’s conversation with someone who left: the messages stay, no composer — the line says why')
      sql(`update members set is_active = 1 where id = 'germaine'`)
    }

    // ── 7 · PRIVACY: none of it ever reaches a client ───────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Privacy — a client never sees the studio’s own')
      const C = await desk(); const c = await C.newPage(); watch(c, 'serena')
      await signIn(c, serenaPhone)
      await go(c, '/my/demo-studio/messages')
      const page = await c.locator('body').innerText()
      ok(!/laminate|Probe team|Site team|Niro samples|timesheets|PO for Ryan/.test(page), 'Serena’s page: none of her Team conversation, the group, the room or two members’ words')
      await go(c, '/my/demo-studio')
      ok(!/laminate|Probe team|in the team chat/i.test(await c.locator('body').innerText()), '…nor her home page and its bell')
      /* the portal's file route is the client's way to a file — a members' file is never one of theirs (the studio's own /chat/file asks the
         studio's session, which the prototype stands in for: PRODUCTION authenticates it before the conversation's people are asked) */
      ok((await c.request.get(`${BASE}/my/demo-studio/file/s26-file-board`)).status() === 404, 'a members’ file never opens on a client’s portal')
      await C.close()
      const C2 = await desk(); const c2 = await C2.newPage(); watch(c2, 'benjamin')
      await signIn(c2, benPhone)
      await go(c2, '/my/demo-studio/messages')
      ok(!/Probe before Won|nursery|chipped edge/.test(await c2.locator('body').innerText()), 'Benjamin’s page: never his project’s Team lines, from before Won or after')
      await C2.close()
      ok(sql(`select count(*) from notification_outbox where event = 'client_message' and (body like '%Probe team%' or body like '%PO for Ryan%' or body like '%Niro samples%')`) === '0', 'no client message was queued for a team, a group or a room line')
    }

    // ── 8 · A client never invited: New message › A client ────────────────────────────────────────────────────────────────────────
    if (want(8) && uninvited) {
      console.log('8 · A client — invited or not')
      await go(d, '/chat')
      await newMenu(d); await d.getByTestId('chat-new-client').click(); await settle(d, 600)
      const ask = d.getByRole('dialog', { name: 'Who do you want to write to?' })
      ok(await ask.count() === 1, 'A client asks who, on the house lead picker')
      await ask.getByRole('combobox').click(); await settle(d, 400)
      await d.getByRole('option').filter({ hasText: new RegExp(`^${uninvited.name.split(' ')[0]}`, 'i') }).first().click(); await settle(d, 300)
      await d.getByTestId('pick-lead-confirm').click(); await settle(d, 1800)
      ok(await d.locator('[data-testid="project-conversation"]').getAttribute('data-conversation') === 'lead', `it opens ${uninvited.name}’s own conversation (a lead, no project)`)
      ok(/isn’t on their page yet/.test(await composer(d).innerText()) && await d.getByTestId('conversation-invite').isVisible() && await d.getByTestId('conversation-invite').evaluate((e) => { const r = e.getBoundingClientRect(), p = e.closest('[data-testid="conversation-composer"]').getBoundingClientRect(); return r.width > 40 && r.right <= p.right + 1 }), 'not on their page yet: the composer says so and offers Invite to Portal, in full')
      await d.getByTestId('conversation-invite').click(); await settle(d, 1500)
      ok(await d.getByTestId('client-access').count() === 1, 'Invite to Portal opens the Client access panel')
      await shot(d, 's26-08-invite-1440')
      await d.keyboard.press('Escape'); await settle(d, 600)
    }

    // ── 9 · The meeting room: Share with the team ────────────────────────────────────────────────────────────────────────────────
    if (want(9) && kevinMeeting) {
      console.log('9 · A meeting’s brief, shared with the team')
      await go(d, `/meetings/${kevinMeeting}`)
      await d.getByRole('button', { name: 'More actions' }).click(); await settle(d, 400)
      await d.getByTestId('room-share-team').click(); await settle(d, 1600)
      const kevin = sql(`select lead_id from meetings where id='${kevinMeeting}'`)
      const posted = json(`select m.id, m.body, m.deleted_at from conversation_messages m join conversations c on c.id = m.conversation_id where c.kind = 'lead' and c.lead_id = '${kevin}' order by m.created_at desc limit 1`)[0]
      ok(posted && /with Kevin/.test(posted.body) && /Next steps/.test(posted.body), 'Share with the team: the brief’s summary and steps in Kevin’s Team conversation')
      await d.getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 1400)
      ok(sql(`select quote(deleted_at) from conversation_messages where id='${posted?.id}'`) !== 'NULL', 'Undo takes the line back')
    }

    // ── 10 · The phone, the tablet, 320 ────────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · 390 · 768 touch · 320')
      const M = await phone(); const m = await M.newPage(); watch(m, 'phone')
      await go(m, '/chat')
      ok(await sideways(m) <= 0 && await m.getByTestId('chat-filters').isVisible(), '390: the list and its filters, no sideways scroll')
      await shot(m, 's26-10-list-390')
      await m.getByTestId('chat-new').click(); await settle(m, 500)
      ok(await m.getByTestId('chat-new-group').isVisible(), '390: New message rises as a sheet')
      await shot(m, 's26-10-new-390')
      await m.keyboard.press('Escape'); await settle(m, 400)
      await m.locator('[data-testid="chat-row"][data-chat="group"]').filter({ hasText: 'Site team' }).click(); await settle(m, 1400)
      ok(await m.getByTestId('chat-list').isVisible() === false && await m.getByTestId('project-conversation').isVisible() && await sideways(m) <= 0, '390: one conversation at a time')
      await shot(m, 's26-10-group-390')
      await m.getByTestId('conversation-details').click(); await settle(m, 1200)
      ok(await m.getByTestId('details-people').isVisible() && await sideways(m) <= 0, '390: Details as a bottom sheet')
      await shot(m, 's26-10-details-390')
      await m.keyboard.press('Escape'); await settle(m, 400)
      await m.setViewportSize({ width: 320, height: 640 }); await settle(m, 500)
      ok(await sideways(m) <= 0, '320: no sideways scroll')
      await M.close()
      const T = await phone(768, 1024); const t = await T.newPage(); watch(t, 'tablet')
      await go(t, '/chat'); await t.locator('[data-testid="chat-row"][data-chat="studio"]').first().click(); await settle(t, 1200)
      ok(await sideways(t) <= 0 && await t.getByTestId('project-conversation').isVisible(), '768 touch: the open conversation, no sideways scroll')
      await shot(t, 's26-10-room-768')
      await T.close()
    }

    // ── 12 · Where it reads elsewhere: the project's door, Settings › Notifications, Your notifications, the phone's Client Info ───────
    if (want(12)) {
      console.log('12 · The doors and the notices’ lists')
      await go(d, `/projects/${ben}`)
      const pdoor = d.getByTestId('info-team-chat')
      ok(await pdoor.count() === 1 && /\/projects\/.+\/messages\?channel=team/.test(await pdoor.getAttribute('href') ?? ''), 'a project’s Collaborators: Team chat · Messages (its Team conversation)')
      await go(d, `/projects/${ben}/messages?channel=team`)
      ok(await d.getByTestId('conversation-details').count() === 1 && await d.getByTestId('conversation-channel').count() === 1, 'the project’s Messages: Client · Team, and Details beside its search')
      await d.getByTestId('conversation-details').click(); await settle(d, 1200)
      ok(/never sees it/.test(await d.getByTestId('details-people').innerText()) && await d.getByTestId('details-team-door').count() === 1, 'a Team conversation’s Details: who reads it, and the way to change its team (the project)')
      await shot(d, 's26-12-project-team-details-1440')
      await d.keyboard.press('Escape'); await settle(d, 300)
      await go(d, '/settings?section=notifications')
      ok(await d.getByTestId('event-member_message').count() === 1 && /A teammate messages you/.test(await d.getByTestId('event-member_message').innerText()), 'Settings › Notifications: “A teammate messages you” (member_message)')
      ok(/A teammate writes in a team chat/.test(await d.getByTestId('event-team_message').innerText()), '…and the team chat’s notice names a lead’s or a project’s')
      await go(d, '/profile#notifications')
      await d.getByTestId('notices-choose').click(); await d.getByTestId('notices-list').waitFor().catch(() => {}); await settle(d, 400)
      const area = await d.getByTestId('notice-member_message').evaluate((e) => { let n = e; while (n && n.previousElementSibling === null) n = n.parentElement; let h = null; for (let x = e.closest('section, div'); x && !h; x = x.parentElement) h = x.querySelector('h3'); return h ? h.textContent : '' }).catch(() => '')
      ok(await d.getByTestId('notice-member_message').count() === 1 && /studio/i.test(area), 'Your notifications: it can be muted, under The studio', area)
      await d.getByTestId('notices-done').click().catch(() => {}); await settle(d, 300)
      const M = await phone(); const m = await M.newPage(); watch(m, 'phone-lead')
      await go(m, `/leads/${serena}`)
      await m.getByRole('button', { name: 'View Client Info' }).click(); await settle(m, 900)
      ok(await m.getByTestId('info-team-chat').isVisible(), '390: the Client Info sheet carries the Team chat door too')
      await shot(m, 's26-12-client-info-390')
      await M.close()
    }

    // ── 11 · The ghost draws the page ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · The ghost')
      for (const [o, tag] of [[{ viewport: { width: 1440, height: 1024 } }, '1440'], [{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '390']]) {
        const r = await measure(b, o, '/chat', ['messages.', 'leads.'], 12)
        if (r.none) { ok(false, `the ghost of /chat at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 4, `the ghost of /chat at ${tag} lands where the page does`, off.slice(0, 5).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
      }
    }
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    if (D) await D.close().catch(() => {})
    putBack()
    as('dane')
    await b.close()
  }
  ok(sql(`select count(*) from conversation_messages where body like 'Probe%' or id like 'probe-%'`) === '0' && sql(`select count(*) from conversations where name like 'Probe%' or id like 'probe-%'`) === '0', 'the run leaves the conversations as it found them')
  ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stagesBefore && sql(`select count(*) from stage_logs`) === logsBefore, 'the leads’ stages and stage logs are as found')
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  ok(errors.length === 0, 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
