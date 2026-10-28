// Pending modules, step S09 · Inviting your team (the owner's "build all of them but one after the other", 2026-10-11; survey key
// onboarding:team-invitations). Each item asserted as the rule it builds, never another round's count:
//  - Add member invites: the dialog says what it will send (live from what is typed) and, when every seat on the plan is in use, the seats —
//    never a refusal; the member is made at once, with an invitation of their own (a token, 30 days open, by whom) and its WhatsApp and email
//    in the house outbox (Sent messages lists them as "To a new member · An invitation to join"); the row says Invited — who, when, how it
//    went, until when — with Send again · Copy link · Cancel the invitation, and no Deactivate; the card says when more members use the AI
//    tools than the plan has seats, with Change seats for the Owner on Pro — Studio (S19; it was See plans)
//  - Send again: the same link, the window re-opened, a "Reminder" message; Copy link copies /join/<token>
//  - Cancel the invitation: the member leaves the team (deactivated, their seat free) and the link stops opening; Undo brings both back; a
//    cancelled invitee who never came in is invited again from Deactivated with a new link (the old one stays dead)
//  - the invitation's page (/join/<token>, no sign-in): the studio, who invited them, as what, one Join — (S30) which sends a code to their
//    mobile first; the code brings them in and signs them in, lands them on their first page with a welcome naming who invited them, and
//    whoever invited them hears it (the bell, opening Members on their row); expired / cancelled / unknown links say so in the studio's name;
//    the chat card is the studio's
//  - the first visit by any way in (View as + the welcome) joins too; nothing to send without a mobile or an email (the row and the refusal
//    say so); an expired link reads so and Send again re-opens it
//  - roles: an Admin manages a Designer's invitation, never an Owner's; a Designer reads the line, no buttons; Who may do what says it
//  - Accounting: no seat, invited "to keep the books", Join lands on Finance with their welcome
//  - the ghost of the invitation's page sits on the page; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s09.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s09')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s09-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dm = (ms) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the AI credits' month roll on the first page): done before the snapshot, so the probe's sqlite3 never
     writes while it runs and the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => sql(`select count(*) || ':' || coalesce(sum(length(quote(t.rowid)) + length(cast(t.rowid as text))), 0) from "${t}" t`) + '|' + execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
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
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re) => { for (let i = 0; i < 30; i++) { const t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(200) } return snackText(p) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const row = (p, name) => p.getByTestId('member-row').filter({ has: p.locator('span[class*="__name"]').filter({ hasText: new RegExp(`^${name}`) }) })
  /* (the calm UI build 2026-10-27, a deliberate change) a member row's Copy link, Cancel invitation and Deactivate are in its ⋮ (5-01): open it, count / press there, close it */
  const openMore = async (p, r) => { await r.getByTestId('member-more').click(); await settle(p, 350) }
  const inMenu = async (p, r, ids) => { if (!(await r.getByTestId('member-more').count())) return 0; await openMore(p, r); let n = 0; for (const id of ids) n += await p.locator(`[role="menu"] [data-testid="${id}"]`).count(); await p.keyboard.press('Escape'); await settle(p, 250); return n }
  const inMenuName = async (p, r, name) => { if (!(await r.getByTestId('member-more').count())) return 0; await openMore(p, r); const n = await p.getByRole('menuitem', { name: new RegExp(`^${name}`) }).count(); await p.keyboard.press('Escape'); await settle(p, 250); return n }
  const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) Who may do what is Roles & access' drawer now (5-04)
  const inviteOf = (name) => json(`select i.* from studio_invitations i join members m on m.id = i.member_id where m.name = '${name}' order by i.created_at desc limit 1`)[0]
  const outbox = (invId) => json(`select key, channel, to_address, subject, body, status, member_id, event from notification_outbox where key like 'i:${invId}:%' order by key`)
  const addMember = async (p, o) => {
    await p.getByRole('button', { name: 'Add member' }).first().click()
    const dlg = p.getByRole('dialog', { name: 'Add member' })
    await dlg.getByLabel('Name').fill(o.name)
    if (o.role) { await dlg.getByLabel('Role').click(); await p.getByRole('option', { name: o.role, exact: true }).click() }
    if (o.phone) await dlg.getByLabel('Phone').fill(o.phone)
    if (o.email) await dlg.getByLabel('Email').fill(o.email)
    return dlg
  }

  try {
    // ── 1 · Add member invites ───────────────────────────────────────────────────────────────────────────────────────────────────
    const D = await desk({ permissions: ['clipboard-read', 'clipboard-write'] })
    const d = await page(D, 'desk')
    as('dane')
    let nadia = null, token = null, seatLimit = null
    if (want(1) || want(2) || want(3) || want(4) || want(5)) {
      console.log('1 · Add member invites')
      ok(sql(`select count(*) from studio_invitations`) === '0', 'R112: the demo has no invitation — its members all came in before them')
      /* the plan's seats and the members who take one (Accounting takes none), read from the records — the rule, not the demo's numbers */
      const sub = json(`select plan_id, seats from subscriptions where cancelled_at is null order by created_at desc limit 1`)[0]
      seatLimit = sub?.plan_id === 'pro_freelance' ? 1 : sub?.plan_id === 'pro_studio' || sub?.plan_id === 'max' ? Number(sub.seats) : null
      const takers = Number(sql(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`))   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
      await go(d, '/company/members')
      ok(await d.getByTestId('members-seats').count() === (seatLimit != null && takers > seatLimit ? 1 : 0), 'the seats note shows only while more members use the AI tools than the plan has seats')
      await d.getByRole('button', { name: 'Add member' }).first().click()
      const dlg = d.getByRole('dialog', { name: 'Add member' })
      ok(/Add a mobile number or an email to send them an invitation/.test(await text(dlg.getByTestId('add-member-invite'))), 'with nothing typed: it asks for a mobile or an email to send an invitation')
      await dlg.getByLabel('Name').fill('Nadia Lim')
      await dlg.getByLabel('Phone').fill('91230077')
      ok(/We’ll send Nadia an invitation by WhatsApp — a link to join, open for 30 days/.test(await text(dlg.getByTestId('add-member-invite'))), 'a mobile typed: “We’ll send Nadia an invitation by WhatsApp …, open for 30 days”')
      await dlg.getByLabel('Email').fill('nadia@demostudio.sg')
      ok(/by WhatsApp and email/.test(await text(dlg.getByTestId('add-member-invite'))), '…and an email: “by WhatsApp and email”')
      const seats = await text(dlg.getByTestId('add-member-seats'))
      const takers0 = Number(sql(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`))   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
      if (seatLimit != null && takers0 + 1 > seatLimit) ok(seats === `info Your plan has ${seatLimit} ${seatLimit === 1 ? 'seat' : 'seats'} and ${takers0} ${takers0 === 1 ? 'member uses' : 'members use'} the AI tools — Nadia makes ${takers0 + 1}. A seat more is S$35 a month. Change seats`, `every seat in use: the dialog says so, and where seats change — never a refusal (${seats})`)   // (pending modules, a deliberate change of this rule — S19: the Owner on Pro — Studio changes the seats from here)
      else ok(seats === '', 'seats to spare: no seats line')
      await dlg.getByLabel('Role').click(); await d.getByRole('option', { name: 'Accounting', exact: true }).click(); await settle(d, 300)
      ok(await dlg.getByTestId('add-member-seats').count() === 0, 'Accounting takes no seat: the seats line goes (REG-1669)')
      await dlg.getByLabel('Role').click(); await d.getByRole('option', { name: 'Designer', exact: true }).click(); await settle(d, 300)
      await shot(d, '01-add-member-1440')
      await dlg.getByRole('button', { name: 'Add member' }).click()
      const sn = await waitSnack(d, /Nadia Lim added/)
      ok(/Nadia Lim added and invited/.test(sn), `the snackbar: “Nadia Lim added and invited” (${sn})`)
      await settle(d, 1200)
      nadia = sql(`select id from members where name = 'Nadia Lim'`)
      const inv = inviteOf('Nadia Lim')
      token = inv?.token
      ok(!!nadia && sql(`select is_active || '|' || welcome_due || '|' || coalesce(welcomed_at, 'null') from members where id = '${nadia}'`) === '1|1|null', 'the member is made at once — active, owed the welcome, never come in')
      ok(inv && inv.status === 'pending' && inv.invited_by === 'dane' && inv.role === 'Designer' && /^[A-Za-z0-9_-]{22}$/.test(inv.token) && inv.send_count === 1 && inv.channels === 'whatsapp,email', 'an invitation of her own: pending, by Dane, as a Designer, a 22-character token, sent once by WhatsApp and email')
      ok(inv && Math.abs(inv.expires_at - (inv.created_at + 30 * DAY)) < 5000, 'open for 30 days from the send (1.0’s)')
      const out = outbox(inv.id)
      ok(out.length === 2 && out.every((m) => m.event === 'member_invite' && m.status === 'sent' && m.member_id === nadia), 'two messages through the house outbox — the event member_invite, recorded as sent, to her')
      const wa = out.find((m) => m.channel === 'whatsapp'), em = out.find((m) => m.channel === 'email')
      ok(wa && wa.to_address === '+6591230077' && /^Hi Nadia, Dane invited you to join Demo Studio on OpenMaison as a Designer\. Join here: \S+\/join\/[A-Za-z0-9_-]{22} \(open until/.test(wa.body) && wa.body.includes(`/join/${inv.token}`), 'the WhatsApp: to +65 9123 0077, who invited her, the studio, as what, the link to her page')
      ok(em && em.to_address === 'nadia@demostudio.sg' && em.subject === 'Dane invited you to join Demo Studio' && em.body.includes(`/join/${inv.token}`) && /The link stays open until/.test(em.body), 'the email: its subject and the link, with how long it stays open')
      const r = row(d, 'Nadia Lim')
      ok(/invited/i.test(await text(r.locator('span[class*="__name"]'))), 'her row wears Invited beside her name')
      const line = await text(r.getByTestId('member-invite'))
      ok(line.includes(`Invited by Dane on ${dm(inv.created_at)} · sent by WhatsApp and email · the link is open until ${dm(inv.expires_at)}`), `the row says who invited her and when, how it went, until when (${line})`)
      ok(await r.getByTestId('member-invite-send').innerText() === 'Send again' && await inMenu(d, r, ['member-invite-copy', 'member-invite-cancel']) === 2, 'Send again · Copy link · Cancel invitation (the last two in the row’s ⋮)')
      ok(await inMenuName(d, r, 'Deactivate') === 0, 'no Deactivate while she is invited — Cancel the invitation is her remove')
      const takers1 = Number(sql(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`))   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
      if (seatLimit != null && takers1 > seatLimit) {
        const note = await text(d.getByTestId('members-seats'))
        /* (pending modules, a deliberate change of this rule — S19 built 1.0's seat change: on Pro — Studio the Owner changes the seats here,
           Change seats, where it was See plans) */
        ok(note.includes(`${takers1} members use the AI tools and your plan has ${seatLimit} ${seatLimit === 1 ? 'seat' : 'seats'}.`) && await d.getByTestId('members-seats-change').count() === 1, `the card says more members use the AI tools than the plan has seats, with Change seats for the Owner (${note})`)
        await d.getByTestId('members-seats-change').click(); await settle(d, 900)
        ok(await d.getByTestId('seats-dialog').count() >= 1, 'Change seats opens the seats dialog')
        await d.keyboard.press('Escape'); await settle(d, 500)
      }
      await shot(d, '02-members-invited-1440', true)
    }

    // ── 2 · Send again and Copy link ───────────────────────────────────────────────────────────────────────────────────────────────
    if (nadia && (want(2) || want(3) || want(4) || want(5))) {
      console.log('2 · Send again · Copy link')
      const inv0 = inviteOf('Nadia Lim')
      sql(`update studio_invitations set expires_at = expires_at - ${5 * DAY}, created_at = created_at - ${5 * DAY}, sent_at = sent_at - ${5 * DAY} where id = '${inv0.id}'`)   // five days ago
      await go(d, '/company/members')
      await row(d, 'Nadia Lim').getByTestId('member-invite-send').click()
      const sn = await waitSnack(d, /Invitation sent again/)
      ok(/Invitation sent again to Nadia Lim — by WhatsApp and email/.test(sn), `“Invitation sent again to Nadia Lim — by WhatsApp and email” (${sn})`)
      await settle(d, 1000)
      const inv = inviteOf('Nadia Lim')
      ok(inv.token === inv0.token && inv.send_count === 2 && inv.expires_at > inv0.expires_at && Math.abs(inv.expires_at - (inv.sent_at + 30 * DAY)) < 5000, 'the same link, sent a second time, open for 30 days from now')
      const out = outbox(inv.id).filter((m) => m.key.startsWith(`i:${inv.id}:2:`))
      ok(out.length === 2 && out.find((m) => m.channel === 'email')?.subject === 'Reminder: Dane invited you to join Demo Studio' && /^A reminder: Hi Nadia/.test(out.find((m) => m.channel === 'whatsapp')?.body ?? ''), 'a second pair of messages — 1.0’s “Reminder”')
      ok(/sent again on/.test(await text(row(d, 'Nadia Lim').getByTestId('member-invite'))), 'the row says it was sent again, and when')
      await openMore(d, row(d, 'Nadia Lim')); await d.getByTestId('member-invite-copy').click()
      const sc = await waitSnack(d, /copied/)
      const clip = await d.evaluate(() => navigator.clipboard.readText()).catch(() => '')
      ok(/Invitation link copied/.test(sc) && clip === `${BASE}/join/${inv.token}`, `Copy link copies her page’s address (${clip})`)
    }

    // ── 3 · Sent messages ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (nadia && (want(3))) {
      console.log('3 · Sent messages')
      await go(d, '/settings?section=notifications')
      const sent = d.getByTestId('notification-sent')
      await sent.scrollIntoViewIfNeeded(); await settle(d, 800)
      const rows = await text(sent.getByTestId('sent-table'))
      ok(/To a new member · An invitation to join/.test(rows) && /Nadia Lim/.test(rows), 'Settings › Notifications › Sent messages lists the invitation — “To a new member · An invitation to join”, to Nadia Lim')
      await shot(d, '03-sent-messages-1440')
    }

    // ── 4 · Cancel the invitation, and Undo ──────────────────────────────────────────────────────────────────────────────────────────
    if (nadia && (want(4) || want(5))) {
      console.log('4 · Cancel the invitation · Undo')
      as('dane'); await go(d, '/company/members')
      const inv0 = inviteOf('Nadia Lim')
      await openMore(d, row(d, 'Nadia Lim')); await d.getByTestId('member-invite-cancel').click()
      const sn = await waitSnack(d, /cancelled/)
      ok(/Invitation to Nadia Lim cancelled/.test(sn) && await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).count() >= 1, `“Invitation to Nadia Lim cancelled” with Undo (${sn})`)
      await settle(d, 900)
      const inv = inviteOf('Nadia Lim')
      ok(inv.status === 'cancelled' && inv.cancelled_by === 'dane' && !!inv.cancelled_at && sql(`select is_active from members where id = '${nadia}'`) === '0', 'the invitation is cancelled, by Dane, and she leaves the team (deactivated — her seat free)')
      const gone = d.getByTestId('members-inactive').locator(`[data-member-id="${nadia}"]`)
      ok(new RegExp(`Designer · invitation cancelled ${new Date(inv.cancelled_at).getDate()} `).test(await text(gone)) && await gone.getByTestId('member-invite-again').count() === 1, 'Deactivated says “invitation cancelled …” and offers Invite again (not Reactivate)')
      ok(await d.getByTestId('members-seats').count() === 0, 'the seats note goes with her seat')
      const X = await desk(); const x = await page(X, 'join-cancelled')
      await go(x, `/join/${inv0.token}`)
      ok(/This invitation is no longer active/.test(await text(x.getByTestId('join-page'))) && await x.getByTestId('join-go').count() === 0, 'her link now says it is no longer active — no Join')
      await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click()
      const un = await waitSnack(d, /is back/)
      await settle(d, 1000)
      const back = inviteOf('Nadia Lim')
      ok(/Nadia Lim’s invitation is back/.test(un) && back.status === 'pending' && back.token === inv0.token && back.expires_at === inv0.expires_at && sql(`select is_active from members where id = '${nadia}'`) === '1', 'Undo: she is back with the same invitation — the same link, the same window')
      await go(x, `/join/${inv0.token}`)
      ok(await x.getByTestId('join-go').count() === 1, 'and her link opens again')
      await X.close()
    }

    // ── 5 · The invitation's page and Join ─────────────────────────────────────────────────────────────────────────────────────────
    if (nadia && want(5)) {
      console.log('5 · /join/<token> and Join')
      as('dane')
      const inv = inviteOf('Nadia Lim')
      const J = await desk(); const j = await page(J, 'join')
      await go(j, `/join/${inv.token}`)
      const pg = j.getByTestId('join-page')
      ok(await pg.getAttribute('data-state') === 'open' && await text(j.locator('h1')) === 'Join Demo Studio', 'the page names the studio: “Join Demo Studio”')
      ok(await text(j.getByTestId('join-line')) === 'Dane invited you to Demo Studio’s team as a Designer.', '…who invited her and as what')
      const demo = await text(j.getByTestId('join-demo'))
      /* (pending modules, a deliberate change of this rule — S30 brought sign-in: Join sends a code to the mobile first; the "until sign-in
         arrives" caption is gone) */
      ok(new RegExp(`^We’ll send a 6-digit code to the mobile number ending 0077 to make sure it’s you\\. The link is open until ${new Date(inv.expires_at).getDate()} `).test(demo), `the line says Join sends a code to the mobile ending 0077 first (${demo})`)
      const meta = await j.evaluate(() => ({ title: document.title, og: document.querySelector('meta[property="og:title"]')?.getAttribute('content'), img: document.querySelector('meta[property="og:image"]')?.getAttribute('content'), robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') }))
      ok(meta.title === 'Join Demo Studio' && meta.og === 'Join Demo Studio’s team' && (meta.img ?? '').includes(`/card/join/${inv.token}`) && /noindex/.test(meta.robots ?? ''), `in a chat it shows the studio’s card, never indexed (${JSON.stringify(meta)})`)
      const card = await j.request.get(`${BASE}/card/join/${inv.token}`)
      ok(card.status() === 200 && /image\/png/.test(card.headers()['content-type'] ?? ''), 'its card picture draws')
      await shot(j, '05-join-1440')
      await j.getByTestId('join-go').click(); await settle(j, 900)
      /* (pending modules, a deliberate change of this rule — S30) the code step, then Join */
      await j.getByTestId('join-digit').first().click(); await j.keyboard.type('123456')
      await j.getByTestId('join-go').click()
      /* (S42 audit A-04, a deliberate change of this rule) Join lands on the front door — the Dashboard (REG-2002), no longer the Leads listing */
      await j.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {})
      await settle(j, 1500)
      const w = j.getByRole('dialog').filter({ has: j.getByTestId('first-visit-welcome') })
      ok(new URL(j.url()).pathname === '/dashboard' && /Welcome, Nadia Lim/.test(await text(w)) && /Dane invited you to Demo Studio’s team\./.test(await text(w)), 'Join lands her on the front door (the Dashboard), with a welcome that names who invited her')
      await shot(j, '06-joined-welcome-1440')
      const acc = inviteOf('Nadia Lim')
      /* (pending modules S43A, a deliberate change of this rule) her session is her browser's alone — the Owner's standing window stays Dane */
      ok(acc.status === 'accepted' && !!acc.accepted_at && json(`select member_id from studio_sessions where member_id = '${nadia}' and ended_at is null`).length === 1 && sql(`select id from members where is_you = 1`) === 'dane', 'the invitation is accepted, and she is signed in on her browser (a session of her own) — the standing session stays Dane’s (S43A)')
      const bell = json(`select member_id, title, href, body from notifications where kind = 'member_joined'`)
      ok(bell.length === 1 && bell[0].member_id === 'dane' && bell[0].title === 'Nadia Lim joined the studio' && bell[0].href === `/company/members?open=${nadia}` && /^As a Designer · invited on /.test(bell[0].body), `whoever invited her hears it — “Nadia Lim joined the studio”, opening Members on her row (${JSON.stringify(bell[0] ?? {})})`)
      await w.getByTestId('welcome-later').click(); await settle(j, 1200)
      ok(!!sql(`select welcomed_at from members where id = '${nadia}'`) && sql(`select count(*) from notifications where kind = 'member_joined'`) === '1', 'Not now records her first visit; nobody hears it twice')
      await go(j, `/join/${inv.token}`)
      ok(await j.getByTestId('join-page').getAttribute('data-state') === 'joined' && await text(j.locator('h1')) === 'You’re on Demo Studio’s team' && await j.getByTestId('join-go').innerText() === 'Open OpenMaison', 'her link again: “You’re on Demo Studio’s team” · Open OpenMaison')
      await J.close()
      as('dane')
      await d.goto(`${BASE}/company/members?open=${nadia}`, { waitUntil: 'domcontentloaded' })
      const fresh = await d.waitForSelector(`[data-member-id="${nadia}"][data-fresh]`, { timeout: 4000 }).then(() => true, () => false)
      await settle(d, 1200)
      ok(fresh && !/open=/.test(d.url()), 'the bell’s link lands on her row (it pulses once) and the address drops it')
      const r = row(d, 'Nadia Lim')
      ok(await r.getByTestId('member-invite').count() === 0 && !/invited/i.test(await text(r.locator('span[class*="__name"]'))) && await inMenuName(d, r, 'Deactivate') === 1, 'joined: no Invited, no invitation line — Deactivate is back')
    }

    // ── 6 · Expired, unsent, never sent, invited again; the first visit through View as ─────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Expired · nowhere to send · invited again · View as’s first visit')
      as('dane'); await go(d, '/company/members')
      let dlg = await addMember(d, { name: 'Omar Teo', phone: '91230078' })
      await dlg.getByRole('button', { name: 'Add member' }).click(); await waitSnack(d, /Omar Teo added/); await settle(d, 1200)
      const omar = sql(`select id from members where name = 'Omar Teo'`)
      let inv = inviteOf('Omar Teo')
      ok(inv.channels === 'whatsapp' && outbox(inv.id).length === 1, 'a mobile only: the invitation goes by WhatsApp alone')
      sql(`update studio_invitations set expires_at = ${Date.now() - DAY} where id = '${inv.id}'`)
      await go(d, '/company/members')
      let r = row(d, 'Omar Teo')
      ok(/invitation expired/i.test(await text(r.locator('span[class*="__name"]'))) && new RegExp(`the link expired on ${dm(Date.now() - DAY)} — send it again to open it for 30 more days`).test(await text(r.getByTestId('member-invite'))) && await inMenu(d, r, ['member-invite-copy']) === 0, 'an expired link: “Invitation expired”, when, and the way — Send again (no Copy link)')
      const E = await desk(); const e = await page(E, 'join-expired')
      await go(e, `/join/${inv.token}`)
      ok(/This invitation has expired/.test(await text(e.getByTestId('join-page'))) && await text(e.getByTestId('join-line')) === 'Invitations stay open for 30 days. Ask Dane to send you a new one.', 'its page: “This invitation has expired” — ask Dane for a new one')
      const og = await e.evaluate(() => document.querySelector('meta[property="og:description"]')?.getAttribute('content'))
      ok(/no longer active/.test(og ?? ''), 'and its chat card is the closed one')
      await shot(e, '07-join-expired-1440')
      await r.getByTestId('member-invite-send').click(); await waitSnack(d, /sent again/); await settle(d, 1000)
      inv = inviteOf('Omar Teo')
      ok(inv.expires_at > Date.now() + 29 * DAY && /invited/i.test(await text(row(d, 'Omar Teo').locator('span[class*="__name"]'))), 'Send again re-opens it for 30 days — Invited again')
      await go(e, `/join/${inv.token}`)
      ok(await e.getByTestId('join-go').count() === 1, 'and its page opens')
      /* cancelled, then invited again from Deactivated — a new link; the old one stays dead */
      await openMore(d, row(d, 'Omar Teo')); await d.getByTestId('member-invite-cancel').click(); await waitSnack(d, /cancelled/); await settle(d, 1200)
      await go(d, '/company/members')
      await d.getByTestId('members-inactive').locator(`[data-member-id="${omar}"]`).getByTestId('member-invite-again').click()
      const ag = await waitSnack(d, /invited again/)
      await settle(d, 1200)
      const inv2 = inviteOf('Omar Teo')
      ok(/Omar Teo is invited again — by WhatsApp/.test(ag) && inv2.id !== inv.id && inv2.token !== inv.token && inv2.status === 'pending' && sql(`select is_active || welcome_due from members where id = '${omar}'`) === '11', 'Invite again: back in the team with a new invitation and a new link')
      await go(e, `/join/${inv.token}`)
      ok(/no longer active/.test(await text(e.getByTestId('join-page'))), 'the cancelled link stays dead')
      await E.close()
      /* the first visit by any way in — View as, the welcome — joins too */
      as(omar)
      const V = await desk(); const v = await page(V, 'view-as')
      await go(v, '/leads')
      const w = v.getByRole('dialog').filter({ has: v.getByTestId('first-visit-welcome') })
      ok(/Welcome, Omar Teo/.test(await text(w)) && /Dane invited you to Demo Studio’s team\./.test(await text(w)), 'his first visit (View as) gets the welcome, naming who invited him')
      await w.getByTestId('welcome-later').click(); await settle(v, 1200)
      ok(inviteOf('Omar Teo').status === 'accepted' && sql(`select count(*) from notifications where kind = 'member_joined' and member_id = 'dane' and title = 'Omar Teo joined the studio'`) === '1', 'closing it is his first visit: the invitation is accepted and Dane hears it')
      await V.close()
      as('dane')
      /* nowhere to send it */
      await go(d, '/company/members')
      dlg = await addMember(d, { name: 'Lee Ann' })
      await dlg.getByRole('button', { name: 'Add member' }).click(); await waitSnack(d, /Lee Ann added/); await settle(d, 1200)
      inv = inviteOf('Lee Ann')
      ok(inv && inv.status === 'pending' && inv.channels === '' && inv.send_count === 0 && outbox(inv.id).length === 0, 'no mobile, no email: the invitation is kept, and nothing is sent')
      r = row(d, 'Lee Ann')
      ok(/not sent — add a mobile number or an email, then send it/.test(await text(r.getByTestId('member-invite'))) && await r.getByTestId('member-invite-send').innerText() === 'Send invitation' && await inMenu(d, r, ['member-invite-copy']) === 1, 'the row says it isn’t sent and why — Send invitation, and Copy link to share it by hand')
      await r.getByTestId('member-invite-send').click()
      const no = await waitSnack(d, /Couldn’t send/)
      ok(/Couldn’t send the invitation — add a mobile number or an email for Lee Ann first/.test(no), `Send invitation says why it can’t (${no})`)
      /* never sent one: a member added before invitations existed */
      sqlFile(`INSERT INTO members (id, name, role, color, is_you, accepting_leads, is_active, portal_shown, welcome_due) VALUES ('probe-ravi', 'Ravi Kumar', 'Designer', '#2B8A8A', 0, 1, 1, 0, 1);\nUPDATE members SET phone = '91230079' WHERE id = 'probe-ravi';\n`)
      await go(d, '/company/members')
      r = row(d, 'Ravi Kumar')
      ok(/Hasn’t come in yet — no invitation was sent/.test(await text(r.getByTestId('member-invite'))) && await r.getByTestId('member-invite-send').innerText() === 'Send invitation' && await inMenuName(d, r, 'Deactivate') === 1, 'a member never invited: “Hasn’t come in yet — no invitation was sent” · Send invitation (Deactivate stays)')
      await r.getByTestId('member-invite-send').click()
      const rv = await waitSnack(d, /Invitation sent/)
      await settle(d, 1000)
      ok(/Invitation sent to Ravi Kumar — by WhatsApp/.test(rv) && inviteOf('Ravi Kumar')?.status === 'pending' && inviteOf('Ravi Kumar')?.invited_by === 'dane', 'Send invitation writes his first one, by Dane')
      await shot(d, '08-members-states-1440', true)
    }

    // ── 7 · Roles ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Who may')
      as('dane'); await go(d, '/company/members')
      let dlg = await addMember(d, { name: 'Kelvin Ong', role: 'Owner', phone: '91230080' })
      await dlg.getByRole('button', { name: 'Add member' }).click(); await waitSnack(d, /Kelvin Ong added/); await settle(d, 1200)
      dlg = await addMember(d, { name: 'Mei Ling', phone: '91230081' })
      await dlg.getByRole('button', { name: 'Add member' }).click(); await waitSnack(d, /Mei Ling added/); await settle(d, 1200)
      as('huimin'); await go(d, '/company/members')
      ok(await row(d, 'Kelvin Ong').getByTestId('member-invite').count() === 1 && await row(d, 'Kelvin Ong').getByTestId('member-invite-send').count() === 0 && await inMenu(d, row(d, 'Kelvin Ong'), ['member-invite-cancel']) === 0, 'an Admin reads an Owner’s invitation but never sends or cancels it (the Owner rules)')
      ok(await row(d, 'Mei Ling').getByTestId('member-invite-send').count() === 1 && await inMenu(d, row(d, 'Mei Ling'), ['member-invite-cancel']) === 1, '…and manages a Designer’s')
      if (seatLimit != null && Number(sql(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`)) > seatLimit) ok(/Dane changes the plan’s seats\./.test(await text(d.getByTestId('members-seats'))) && await d.getByTestId('members-seats-plans').count() === 0, 'an Admin is told the seats, and who changes them — no See plans')   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
      as('germaine'); await go(d, '/company/members')
      ok(await row(d, 'Mei Ling').getByTestId('member-invite').count() === 1 && await row(d, 'Mei Ling').locator('[data-testid^="member-invite-"]').count() === 0 && await d.getByTestId('members-seats').count() === 0, 'a Designer reads who is invited — no buttons, no seats note')
      await shot(d, '09-members-designer-1440')
      as('dane'); await go(d, '/settings?section=studio'); await openRoles(d)
      ok(/Add and invite members, deactivate and reactivate them; set roles/.test(await text(d.getByTestId('studio-roles-list'))), 'Who may do what: “Add and invite members, deactivate and reactivate them; set roles”')
    }

    // ── 9 · Accounting: no seat, "to keep the books", Join lands on Finance ─────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Accounting')
      as('dane'); await go(d, '/company/members')
      const dlg = await addMember(d, { name: 'Tan Hui Ling', role: 'Accounting', phone: '91230083' })
      ok(await dlg.getByTestId('add-member-seats').count() === 0, 'Accounting takes no seat — no seats line')
      await dlg.getByRole('button', { name: 'Add member' }).click()
      const sn = await waitSnack(d, /Tan Hui Ling added/)
      ok(/^Tan Hui Ling added in Accounting — invitation sent by WhatsApp/.test(sn), `the snackbar: “Tan Hui Ling added in Accounting — invitation sent by WhatsApp” (${sn})`)
      await settle(d, 1200)
      const inv = inviteOf('Tan Hui Ling')
      ok(outbox(inv.id).some((m) => m.channel === 'whatsapp' && /invited you to join Demo Studio on OpenMaison to keep the books\./.test(m.body)), 'her WhatsApp: “… invited you to join Demo Studio on OpenMaison to keep the books.”')
      const A = await desk(); const a = await page(A, 'join-accounting')
      await go(a, `/join/${inv.token}`)
      ok(await text(a.getByTestId('join-line')) === 'Dane invited you to Demo Studio’s team to keep the books.', 'her page: “… to Demo Studio’s team to keep the books.”')
      await a.getByTestId('join-go').click(); await settle(a, 900)
      await a.getByTestId('join-digit').first().click(); await a.keyboard.type('123456')   // (pending modules, a deliberate change of this rule — S30) the code step
      await a.getByTestId('join-go').click()
      await a.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {})   // (the calm UI build 2026-10-27: restated to the rule already in force) homeOfRole sends every role to the Dashboard (his Q-08)
      await settle(a, 1500)
      const w = a.getByRole('dialog').filter({ has: a.getByTestId('first-visit-welcome') })
      ok(new URL(a.url()).pathname.startsWith('/dashboard') /* (the calm UI build 2026-10-27: restated to the rule already in force) the Dashboard is Accounting's front door too; the welcome's Open Finance is the way on */ && /Dane invited you to keep Demo Studio’s books\./.test(await text(w)) && await w.getByTestId('welcome-go').innerText() === 'Open Finance', 'Join lands her on Finance (her home), the welcome naming who invited her')
      await w.getByTestId('welcome-later').click(); await settle(a, 800)
      await A.close()
      as('dane')
    }

    // ── 8 · The phone, and the invitation page's ghost ───────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · 390 · 320 · the ghost')
      as('dane')
      if (!sql(`select id from members where name = 'Nadia Lim'`)) {
        await go(d, '/company/members')
        const dlg = await addMember(d, { name: 'Nadia Lim', phone: '91230077', email: 'nadia@demostudio.sg' })
        await dlg.getByRole('button', { name: 'Add member' }).click(); await waitSnack(d, /Nadia Lim added/); await settle(d, 1200)
      }
      const tok = inviteOf('Nadia Lim').token
      for (const [w, h] of [[390, 844], [320, 700]]) {
        const M = await phoneCtx(w, h); const m = await page(M, `phone-${w}`)
        await go(m, '/company/members')
        const r = row(m, 'Nadia Lim'); await r.scrollIntoViewIfNeeded(); await settle(m, 400)
        ok(await sideways(m) <= 0, `${w}: Members with an invited row — no sideways scroll`)
        if (w === 390) await shot(m, '10-members-invited-390')
        await m.getByRole('button', { name: 'Add member' }).first().click(); await settle(m, 700)
        await m.getByRole('dialog', { name: 'Add member' }).getByLabel('Name').fill('Zara Ho')
        await m.getByRole('dialog', { name: 'Add member' }).getByLabel('Phone').fill('91230082')
        ok(/We’ll send Zara an invitation by WhatsApp/.test(await text(m.getByTestId('add-member-invite'))) && await sideways(m) <= 0, `${w}: the Add member sheet says what it sends, no sideways scroll`)
        if (w === 390) await shot(m, '11-add-member-390')
        await m.keyboard.press('Escape'); await settle(m, 400)
        await go(m, `/join/${tok}`)
        ok(await sideways(m) <= 0 && await m.getByTestId('join-go').isVisible(), `${w}: the invitation page fits, Join in reach`)
        await shot(m, `12-join-${w}`)
        await M.close()
      }
      /* the loader draws what the page draws: soft-navigate between two links with the page's own answer held, and read the ghost's card */
      for (const [w, h, touch] of [[1440, 1024, false], [390, 844, true]]) {
        const G = await b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
        const g = await page(G, `ghost-${w}`)
        await go(g, `/join/${tok}`)
        const real = await g.locator('[data-testid="join-page"] [class$="__notice"]').evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width)] })
        /* the link's loading state comes with a prefetch (as a server streams it first); the page's own answer is then held */
        const other = '/join/abcdefabcdefabcdefabcd'
        await g.route('**/join/**', async (route) => { const hd = route.request().headers(); if (route.request().method() === 'GET' && hd['rsc'] && !hd['next-router-prefetch']) await new Promise((res) => setTimeout(res, 2500)); await route.continue() })
        await g.evaluate((u) => window.next.router.prefetch(u), other); await settle(g, 1200)
        await g.evaluate((u) => window.next.router.push(u), other); await settle(g, 700)
        const ghost = await g.locator('[aria-label="Loading the invitation"] [class$="__notice"]').evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width)] }).catch(() => null)
        await shot(g, `13-join-ghost-${w}`)
        await settle(g, 2600)
        ok(!!ghost && Math.abs(ghost[0] - real[0]) <= 2 && Math.abs(ghost[1] - real[1]) <= 2 && Math.abs(ghost[2] - real[2]) <= 2, `${w}: the ghost’s card sits where the page’s does (ghost ${JSON.stringify(ghost)} · page ${JSON.stringify(real)})`)
        await G.close()
      }
    }
  } catch (e) {
    ok(false, `the probe ran to its end — it threw: ${String(e && e.message || e).split('\n').slice(0, 3).join(' | ')}`)
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
