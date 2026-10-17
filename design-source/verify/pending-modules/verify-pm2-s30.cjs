// Pending modules, step S30 · Signing in (+ Sign out's place) (the owner's "build all of them but one after the other", 2026-10-11; survey key
// onboarding:studio-sign-in). Each item asserted as the rule it builds, never another round's count:
//  - the demo keeps working: a browser that never signed in or out is the demo's own session (the member View as picked — Dane): every page
//    opens, nothing is written, /sign-in and 1.0's /login go straight home
//  - Sign out: the last row of the studio block's You group (and the phone's You sheet); the session ends on the server, the browser forgets
//    what it kept for the member (this tab's om.* and ⌘K's recents — never the device's own preferences), sign-in says "You’ve signed out"
//  - signed out: every studio page goes to sign-in carrying the page it asked for; the studio's files and pictures answer 401; the client links
//    (the portal's own sign-in, an invitation, a quote link, a signing link) open as before and pull nothing that answers 401
//  - sign-in: one field for a mobile number (+65, grouped as typed) or an email; 1.0's refusals in plain words — none, a landline, no account
//    (with who to ask), a deactivated account, an invitation that ran out — and five tries a minute; the stand-in says no message is sent
//  - the code: 30 seconds before a new one, all six digits, a paste fills the boxes, Keep me signed in ticked (30 days, `.r`, renewed on a
//    visit) or not (24 hours, `.d`); the record (`studio_sessions`) — who, how, what it went to; the page asked for, else home (Accounting's is
//    Finance; never another site); already signed in, sign-in is never shown
//  - a session that ran out (its record, or its cookie) and an account deactivated say so on sign-in; deactivating a member signs them out
//    everywhere; View as keeps the browser's record naming who it is
//  - an open invitation joins on its first sign-in (accepted, the inviter's bell, the welcome); the invitation's page asks for the code before
//    Join, and a joined link signs in with a code, never the link alone (S09's caption replaced)
//  - Your profile: a new mobile number or email is confirmed by its code before it saves (S01's note); losing both is refused
//  - Reset prototype to base puts this browser back on the demo's own session
//  - the ghost sits on the page at 1440 and 390 touch; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s30.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s30')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s30-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY = 86_400_000, HOUR = 3_600_000
const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= tol
const P = 'pm2s30'   // the probe's own rows

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the credits' month roll on the first page), so the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
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
  const go = async (p, url, ms = 900) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitSnack = async (p, re) => { for (let i = 0; i < 30; i++) { const t = await snackText(p); if (re.test(t)) return t; await p.waitForTimeout(200) } return snackText(p) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const cookie = async (ctx, name) => (await ctx.cookies()).find((c) => c.name === name) ?? null
  const daysLeft = (c) => (c ? (c.expires * 1000 - Date.now()) / DAY : null)
  const pathOf = (p) => { const u = new URL(p.url()); return u.pathname + u.search }
  /* the sign-in page is live once its reveal has let go (the form is inert under the ghost's hold) */
  const ready = async (p, testId = 'sign-in') => { await p.waitForFunction((id) => { const e = document.querySelector(`[data-testid="${id}"]`); return !!e && !e.closest('[inert]') }, testId, { timeout: 15000 }).catch(() => {}); await settle(p, 300) }
  const field = (p) => p.getByLabel('Mobile number or email')
  const fieldError = (p) => text(p.locator('[data-testid="sign-in"] form [role="alert"], [data-testid="sign-in"] form [class*="error"]'))
  const askCode = async (p, contact) => { await ready(p); await field(p).fill(contact); await p.getByTestId('sign-in-send').click(); await settle(p, 1000) }
  const typeCode = async (p, testId, code = '123456') => { await p.getByTestId(testId).first().click(); await p.keyboard.type(code); await settle(p, 200) }
  const remember = (p) => p.getByTestId('sign-in-remember').locator('input[type="checkbox"]')
  const signIn = async (p, contact, o = {}) => {
    await askCode(p, contact)
    if (o.remember === false && await remember(p).isChecked()) { await p.getByTestId('sign-in-remember').getByText('Keep me signed in for 30 days').click(); await settle(p, 200) }
    await typeCode(p, 'sign-in-digit')
    const from = p.url()
    await p.getByTestId('sign-in-go').click()
    await p.waitForURL((u) => String(u) !== from && !/\/sign-in/.test(String(u)), { timeout: 15000 }).catch(() => {})
    await settle(p, 1200)
  }
  const studioBlock = (p) => p.locator('button[aria-haspopup="menu"][aria-label^="Demo Studio"]')
  const openMenu = async (p) => { await studioBlock(p).click(); await settle(p, 600); return p.locator('[role="menu"][aria-label="View as"]') }
  const signOutDesk = async (p) => { const m = await openMenu(p); await m.getByTestId('sign-out').click(); await p.waitForURL(/\/sign-in/, { timeout: 15000 }).catch(() => {}); await settle(p, 1200) }
  const notice = async (p) => (await text(p.getByTestId('sign-in-notice'))).replace(/^(logout|schedule|lock|link_off)\s*/, '')   // the glyph's ligature first
  const sessions0 = Number(sql(`select count(*) from studio_sessions`))
  // (pending modules S39, a deliberate change of this rule — R123 gives the demo's PAST the sign-ins its acts imply, `ss-trail-…`, all signed
  // out long ago: a member's sessions here are the ones this run's browsers made)
  const sessionsOf = (member) => json(`select * from studio_sessions where member_id = '${member}' and id not like 'ss-trail-%' order by started_at`)
  const anyFile = json(`select f.id from lead_files f join lead_file_images i on i.file_id = f.id join leads l on l.id = f.lead_id where f.deleted_at is null and l.deleted_at is null and i.data like 'data:image/%' limit 1`)[0]?.id
  const anyRoom = json(`select id from project_rooms limit 1`)[0]?.id
  const viewTok = json(`select view_token as t from quotes where view_token is not null and status in ('Approved','Sent','Confirmed','Signed') limit 1`)[0]?.t
  const signTok = json(`select sign_token as t from contracts where sign_token is not null and status = 'Sent' and deleted_at is null limit 1`)[0]?.t
  const inviteTok = (s) => (`${P}${s}`.padEnd(22, 'x')).slice(0, 22)
  const addInvitee = ({ id, name, phone = null, email = null, expires = Date.now() + 30 * DAY }) => {
    sql(`insert into members (id, name, role, color, is_you, email, phone, is_active, accepting_leads, welcome_due) values ('${id}', '${name}', 'Designer', '#5B7FD7', 0, ${lit(email)}, ${lit(phone)}, 1, 1, 1)`)
    sql(`insert into studio_invitations (id, member_id, invited_by, full_name, phone, email, role, token, status, expires_at, sent_at, send_count, channels, created_at) values ('${id}-inv', '${id}', 'dane', '${name}', ${lit(phone)}, ${lit(email)}, 'Designer', '${inviteTok(id)}', 'pending', ${expires}, ${Date.now() - DAY}, 1, '${phone ? 'whatsapp' : 'email'}', ${Date.now() - DAY})`)
    return inviteTok(id)
  }

  try {
    // ── 1 · The demo keeps working: a browser that never signed in or out is the demo's own session ────────────────────────────────────
    if (want(1)) {
      console.log('1 · The demo keeps working')
      as('dane')
      const C = await desk(); const c = await page(C, 'standing')
      await go(c, '/leads', 1400)
      ok(pathOf(c) === '/leads' && await studioBlock(c).count() === 1, 'a fresh browser opens /leads in the shell — signed in as the demo’s member, as before')
      ok(!(await cookie(C, 'om_session')) && !(await cookie(C, 'om_seen')), 'and the visit sets no sign-in cookie (nothing written)')
      ok(Number(sql(`select count(*) from studio_sessions`)) === sessions0, 'and no session record — the demo’s own session needs none')
      await go(c, '/sign-in')
      /* (pending modules, a deliberate change of this rule — S22 made the Dashboard the front door for every role but Accounting) */
      ok(pathOf(c) === '/dashboard', `already signed in: /sign-in goes straight home (${pathOf(c)})`)
      await go(c, '/login')
      ok(pathOf(c) === '/dashboard', `1.0’s /login lands the same way (${pathOf(c)})`)
      await go(c, '/sign-in?next=%2Ftasks')
      ok(pathOf(c) === '/tasks', `…or on the page it names (${pathOf(c)})`)
      if (anyFile) { const r = await c.request.get(`${BASE}/files/img/${anyFile}`); ok(r.status() === 200, `the studio’s pictures still load (${r.status()})`) }
      await C.close()
    }

    // ── 2 · Sign out — the studio block's You group; signed out, the studio is behind sign-in, the client links are not ───────────────────
    if (want(2)) {
      console.log('2 · Sign out, and signed out')
      as('dane')
      const C = await desk(); const c = await page(C, 'sign-out')
      await go(c, '/leads', 1400)
      await c.evaluate(() => { localStorage.setItem('om.search.recent', '["kenji"]'); localStorage.setItem('om.search.opened', '[]'); localStorage.setItem('om.columns.probe', '{"keep":1}'); sessionStorage.setItem('om.probe.tab', '1') })
      const menu = await openMenu(c)
      const order = await menu.getByTestId('you-group').locator('[data-testid]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')).filter((t) => ['open-profile', 'you-accepting', 'sign-out'].includes(t)))
      ok(order.join(',') === 'open-profile,you-accepting,sign-out', `Sign out is the You group’s last row — under Your profile and Open to new leads (${order.join(',')})`)
      ok(await text(menu.getByTestId('sign-out').locator('[class*="__label"]')) === 'Sign out' && await menu.getByTestId('sign-out').getAttribute('role') === 'menuitem', 'a menu row in the house words: “Sign out”')
      const glyph = await menu.getByTestId('sign-out').locator('.msr, .mso, [class*="icon"]').first().evaluate((e) => [e.textContent, Math.round(e.getBoundingClientRect().width)]).catch(() => ['', 0])
      ok(glyph[0] === 'logout' && glyph[1] <= 24, `its glyph is the font’s own (“logout” drawn ${glyph[1]} wide, not the word)`)
      const mb = await menu.boundingBox()
      ok(!!mb && mb.y >= 0 && mb.y + mb.height <= 1024, `the menu still fits the window (${mb ? Math.round(mb.y) + '…' + Math.round(mb.y + mb.height) : '?'})`)
      await shot(c, '01-menu-sign-out-1440')
      await menu.getByTestId('sign-out').click()
      await c.waitForURL(/\/sign-in/, { timeout: 15000 }).catch(() => {}); await ready(c)
      ok(pathOf(c) === '/sign-in?reason=out', `it opens sign-in (${pathOf(c)})`)
      ok(await notice(c) === 'You’ve signed out.', 'which says “You’ve signed out.”')
      ok((await cookie(C, 'om_seen'))?.value === 'out' && !(await cookie(C, 'om_session')), 'this browser now reads as signed out (om_seen=out, no session cookie)')
      const store = await c.evaluate(() => ({ recent: localStorage.getItem('om.search.recent'), opened: localStorage.getItem('om.search.opened'), cols: localStorage.getItem('om.columns.probe'), tab: sessionStorage.getItem('om.probe.tab') }))
      ok(store.recent === null && store.opened === null && store.tab === null, 'it forgot what it kept for the member — ⌘K’s recents and this tab’s om.* (1.0 cleared the chat history)')
      ok(store.cols === '{"keep":1}', '…and kept the device’s own preferences (a table’s columns)')
      await shot(c, '02-signed-out-1440')
      for (const [url, next] of [['/leads', '/leads'], ['/projects?view=board', '/projects?view=board'], ['/company/members', '/company/members'], [`/quotes`, '/quotes']]) {
        await go(c, url, 400)
        ok(pathOf(c) === `/sign-in?next=${encodeURIComponent(next)}`, `${url} goes to sign-in, carrying the page it asked for (${pathOf(c)})`)
      }
      const st = async (u) => (await c.request.get(BASE + u)).status()
      if (anyFile) ok(await st(`/files/img/${anyFile}`) === 401 && await st(`/files/raw/${anyFile}`) === 401 && await st(`/files/thumb/${anyFile}`) === 401, 'the studio’s files answer 401 (img · raw · thumb)')
      ok(await st('/company/picture/abc') === 401 && await st(`/visualizer/img/room/${anyRoom ?? 'x'}`) === 401 && await st('/finance/doc/x') === 401, 'its pictures and papers too (a member’s photo, a room, a cost paper)')
      ok(await st(`/visualizer/img/room/${anyRoom ?? 'x'}?t=nope`) !== 401 && await st('/files/font/x') !== 401, 'a client link’s picture (?t=) and the studio’s fonts stay the client’s (no 401 — a bad token is its own not found)')
      const r401 = []
      c.on('response', (r) => { if (r.status() === 401) r401.push(r.url()) })
      await go(c, '/my/demo-studio/login', 1400)
      ok(await c.getByTestId('portal-sign-in').count() === 1, 'the client portal’s own sign-in opens')
      await go(c, '/join/abcdefabcdefabcdefabcd', 900)
      ok(/no longer active/.test(await text(c.getByTestId('join-page'))), 'an invitation’s page opens (an unknown link says so in the studio’s name)')
      if (viewTok) { await go(c, `/quote/${viewTok}`, 1500); ok(!/\/sign-in/.test(c.url()), 'a quote’s view-only link opens') }
      if (signTok) { await go(c, `/sign/${signTok}`, 1500); ok(!/\/sign-in/.test(c.url()), 'a signing link opens') }
      ok(r401.length === 0, `and nothing those pages load answers 401 (${r401.slice(0, 3).join(' · ') || 'none'})`)
      await C.close()
    }

    // ── 3 · The sign-in page's rules ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Sign-in’s rules')
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'rules')
      await go(c, '/sign-in', 400); await ready(c)
      ok(await text(c.locator('h1')) === 'Sign in to OpenMaison' && /^Enter your mobile number or work email\. We’ll send you a 6-digit code\.$/.test(await text(c.getByTestId('sign-in-lede'))), 'OpenMaison’s sign-in: the title, then what it will do')
      ok(await c.locator('[data-testid="sign-in"] img[alt="OpenMaison"]').count() === 1, 'in OpenMaison’s frame — the rail’s mark and wordmark')
      ok(await text(c.getByTestId('sign-in-demo')) === 'Demo only — no text or email is sent: any six digits sign you in.' && /^Dane, the studio’s Owner, signs in with dane@demostudio\.sg\.$/.test(await text(c.getByTestId('sign-in-hint'))), 'the stand-in says so plainly, and who to try')
      await c.getByTestId('sign-in-send').click(); await settle(c, 400)
      ok(/Enter your mobile number or email/.test(await fieldError(c)), 'nothing typed: “Enter your mobile number or email”')
      await field(c).fill('98837542'); await settle(c, 200)
      ok(await field(c).inputValue() === '9883 7542' && /\+65/.test(await text(c.locator('[data-testid="sign-in"] form'))), 'a number is grouped as typed, after its +65')
      await field(c).fill('6222 0188'); await c.getByTestId('sign-in-send').click(); await settle(c, 800)
      ok(/A code goes to a mobile — enter a number that starts with 8 or 9/.test(await fieldError(c)), 'a landline: a code goes to a mobile')
      await field(c).fill('81234567'); await c.getByTestId('sign-in-send').click(); await settle(c, 900)
      ok(/No account found with this number/.test(await fieldError(c)) && /ask its Owner to add you on Company › Members/.test(await text(c.getByTestId('sign-in-no-account'))), 'nobody has the number: 1.0’s “No account found with this number”, and who to ask')
      await shot(c, '03-no-account-1440')
      await field(c).fill('nobody@probe.example'); await c.getByTestId('sign-in-send').click(); await settle(c, 900)
      ok(/No account found with this email/.test(await fieldError(c)), '…or this email')
      sql(`update members set is_active = 0 where id = 'alex'`)
      await field(c).fill('alex@demostudio.sg'); await c.getByTestId('sign-in-send').click(); await settle(c, 900)
      ok(/This account is deactivated — ask your studio’s Owner to reactivate it/.test(await fieldError(c)), 'a deactivated member: their account is deactivated, ask the Owner — never a code')
      sql(`update members set is_active = 1 where id = 'alex'`)
      const tries = []
      for (let i = 0; i < 6; i++) { await field(c).fill('82345678'); await c.getByTestId('sign-in-send').click(); await settle(c, 600); tries.push(await fieldError(c)) }
      ok(tries.slice(0, 5).every((t) => /No account found/.test(t)) && /Too many tries — wait a minute and try again/.test(tries[5]), 'five tries a minute (1.0’s), then “Too many tries — wait a minute and try again”')
      ok(Number(sql(`select count(*) from studio_sessions`)) === sessions0, 'no refusal starts a session')
      await C.close()
    }

    // ── 4 · Signing in by mobile — the code, Keep me signed in, the record, the way back ────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Signing in — Sarah, by her mobile, kept signed in')
      as('dane')
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'sarah')
      await go(c, '/tasks', 400); await ready(c)
      ok(pathOf(c) === '/sign-in?next=%2Ftasks', 'a signed-out visit to Tasks is at sign-in, carrying /tasks')
      await askCode(c, '9883 7542')
      ok(await c.getByTestId('sign-in').getAttribute('data-step') === 'code' && await text(c.getByTestId('sign-in-lede')) === 'We sent a 6-digit code to the number ending 7542. Enter it to sign in.', 'the code step: where it went (the number ending 7542)')
      ok(/No code yet\? You can ask for a new one in (29|30|28) seconds\./.test(await text(c.getByTestId('sign-in-resend'))), 'a new code after 30 seconds (1.0’s)')
      ok(await remember(c).isChecked(), 'Keep me signed in for 30 days — ticked, as 1.0 had it')
      ok(Number(sql(`select count(*) from studio_sessions`)) === sessions0, 'asking for a code starts nothing')
      await typeCode(c, 'sign-in-digit', '123'); await c.getByTestId('sign-in-go').click(); await settle(c, 600)
      ok(/Enter all 6 digits of the code/.test(await text(c.getByTestId('sign-in-code-error'))) && /\/sign-in/.test(c.url()), 'three digits: “Enter all 6 digits of the code”')
      await c.getByTestId('sign-in-digit').first().click()
      await c.evaluate(() => { const el = document.querySelector('[data-testid="sign-in-digit"]'); const dt = new DataTransfer(); dt.setData('text', '654 321'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })) })
      await settle(c, 300)
      const boxes = await c.getByTestId('sign-in-digit').evaluateAll((els) => els.map((e) => e.value).join(''))
      ok(boxes === '654321', `a pasted code fills the boxes (${boxes})`)
      await shot(c, '04-code-1440')
      const t0 = Date.now()
      await c.getByTestId('sign-in-go').click()
      await c.waitForURL((u) => !/\/sign-in/.test(String(u)), { timeout: 15000 }).catch(() => {}); await settle(c, 1400)
      ok(pathOf(c) === '/tasks', `any six digits sign her in — back on the page she asked for (${pathOf(c)})`)
      /* (pending modules S43A, a deliberate change of this rule — a code signs in THIS browser alone: the standing session's flag stays put) */
      ok(sql(`select id from members where is_you = 1`) === 'dane' && await studioBlock(c).getAttribute('aria-label') === 'Demo Studio, viewing as Sarah. View as', 'and the app is hers on this browser — the standing session’s flag stays on Dane (S43A)')
      const s = sessionsOf('sarah')[0]
      ok(!!s && s.remember === 1 && s.via === 'code' && s.channel === 'phone' && !s.ended_at && near(s.expires_at, t0 + 30 * DAY, HOUR) && /Chrome|Headless/.test(s.user_agent ?? ''), `the record: Sarah, by a code to her phone, kept for 30 days (${s ? new Date(s.expires_at).toISOString().slice(0, 10) : '?'})`)
      const ck = await cookie(C, 'om_session')
      ok(!!ck && ck.value === `${s?.id}.r` && ck.httpOnly && near(daysLeft(ck), 30, 0.1) && (await cookie(C, 'om_seen'))?.value === 'in', 'its cookie: httpOnly, `<id>.r`, 30 days; om_seen=in')
      const menu = await openMenu(c)
      ok(/Sarah/.test(await text(menu.getByTestId('open-profile'))), 'the studio block’s menu leads with her')
      await c.keyboard.press('Escape'); await settle(c, 300)
      await go(c, '/sign-in', 400)
      ok(pathOf(c) === '/dashboard', `signed in, sign-in is never shown — home (${pathOf(c)})`)   // (S22's front door, a deliberate change)
      /* renewed on each visit: a remembered session's record moves on when it is an hour old */
      sql(`update studio_sessions set last_seen_at = ${Date.now() - 2 * HOUR}, expires_at = ${Date.now() + DAY} where id = '${s.id}'`)
      const t1 = Date.now(); await go(c, '/leads', 800)
      const s2 = json(`select * from studio_sessions where id = '${s.id}'`)[0]
      ok(near(s2.last_seen_at, t1, 20_000) && near(s2.expires_at, t1 + 30 * DAY, 60_000), 'a visit renews a remembered session — 30 more days from now (1.0’s sliding refresh)')
      ok(near(daysLeft(await cookie(C, 'om_session')), 30, 0.1), '…and its cookie with it')
      /* View as keeps the browser's record naming who it is */
      const m2 = await openMenu(c)
      await m2.getByRole('menuitemradio').filter({ hasText: 'Hui Min' }).click(); await settle(c, 1500)
      ok(json(`select member_id from studio_sessions where id = '${s.id}'`)[0]?.member_id === 'huimin' && sql(`select id from members where is_you = 1`) === 'huimin', 'View as still becomes another member, no code — and the session’s record follows (it names Hui Min)')
      await signOutDesk(c)
      const s3 = json(`select * from studio_sessions where id = '${s.id}'`)[0]
      ok(!!s3.ended_at && s3.ended_reason === 'signed-out' && !(await cookie(C, 'om_session')), 'Sign out ends the record on the server (signed-out) and the cookie goes')
      await go(c, '/leads', 400)
      ok(/^\/sign-in\?next=%2Fleads$/.test(pathOf(c)), '…and the studio is behind sign-in again')
      await C.close()
    }

    // ── 5 · 24 hours; a session that ran out ───────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Not kept — 24 hours; a session that ran out')
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'michelle')
      await go(c, '/sign-in', 400)
      const t0 = Date.now()
      await signIn(c, 'Michelle@DemoStudio.sg', { remember: false })
      /* (S42 audit A-04, a deliberate change of this rule) a sign-in's home is the front door — the Dashboard (REG-2002), no longer the Leads listing */
      /* (pending modules S43A, a deliberate change of this rule) her browser is hers — the flag is the standing session's, not hers */
      ok(pathOf(c) === '/dashboard' && await studioBlock(c).getAttribute('aria-label') === 'Demo Studio, viewing as Michelle. View as', 'Michelle signs in with her email (any case) — home is the front door, as her')
      const s = sessionsOf('michelle').at(-1)
      ok(!!s && s.remember === 0 && s.channel === 'email' && near(s.expires_at, t0 + DAY, 10 * 60_000), 'not kept: the record lasts 24 hours')
      const ck = await cookie(C, 'om_session')
      ok(!!ck && ck.value === `${s?.id}.d` && near(daysLeft(ck), 1, 0.05), '…its cookie too (`.d`, a day)')
      sql(`update studio_sessions set expires_at = ${Date.now() - 2 * HOUR}, last_seen_at = ${Date.now() - 26 * HOUR} where id = '${s.id}'`)
      await go(c, '/leads', 600); await ready(c)
      ok(pathOf(c) === '/sign-in?next=%2Fleads&reason=ended' && await notice(c) === 'Your session ended. Sign in again to carry on.', `its record ran out: sign-in says the session ended, and keeps the page (${pathOf(c)})`)
      await shot(c, '05-ended-1440')
      await C.clearCookies({ name: 'om_session' }); await C.addCookies([{ name: 'om_seen', value: 'in', url: BASE }])
      await go(c, '/tasks', 400)
      ok(pathOf(c) === '/sign-in?next=%2Ftasks&reason=ended', `its cookie ran out (the browser dropped it): the same — never the demo’s own session again (${pathOf(c)})`)
      await C.close()
    }

    // ── 6 · Accounting's home; never another site ──────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Accounting lands on Finance; `next` stays inside the app')
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'priya')
      await go(c, '/sign-in?next=%2F%2Fevil.example%2Fx', 400)
      await signIn(c, '+65 9641 7305')   // (S42 B-18, a deliberate change of the demo's data) Priya's own number — 9182 7364 is Mei Ling Han's
      ok(new URL(c.url()).host === new URL(BASE).host && pathOf(c).startsWith('/company/finance'), `Priya (+65 typed) lands on Finance, her home — a next of //evil.example is ignored (${c.url()})`)
      await C.close()
    }

    // ── 7 · An open invitation joins on its first sign-in; an expired one says so ───────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Invitations and sign-in')
      as('dane')
      addInvitee({ id: `${P}-ivy`, name: 'Ivy Probe', phone: '91230091' })
      addInvitee({ id: `${P}-ed`, name: 'Ed Probe', phone: '91230092', expires: Date.now() - DAY })
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'ivy')
      await go(c, '/sign-in', 400)
      await askCode(c, '91230092')
      ok(/Your invitation has expired — ask your studio to send you a new one/.test(await fieldError(c)), 'an invitation that ran out: sign-in says so (1.0’s “You have a pending invitation…”, in 2.0’s case) — no code')
      await askCode(c, '9123 0091')
      ok(await text(c.getByTestId('sign-in-lede')) === 'We sent a 6-digit code to the number ending 0091. Enter it to join your studio’s team.', 'an open one: the code step says this sign-in joins the team')
      await typeCode(c, 'sign-in-digit'); await c.getByTestId('sign-in-go').click()
      await c.waitForURL(/\/leads/, { timeout: 15000 }).catch(() => {}); await settle(c, 1800)
      const inv = json(`select status, accepted_at from studio_invitations where id = '${P}-ivy-inv'`)[0]
      ok(inv?.status === 'accepted' && !!inv.accepted_at, 'the first sign-in accepts the invitation (1.0’s verify route did)')
      ok(sql(`select count(*) from notifications where kind = 'member_joined' and member_id = 'dane' and title = 'Ivy Probe joined the studio'`) === '1', 'and whoever invited her hears it — once')
      const w = c.getByRole('dialog').filter({ has: c.getByTestId('first-visit-welcome') })
      ok(/Welcome, Ivy Probe/.test(await text(w)), 'her first visit opens with her welcome (S08)')
      await shot(c, '06-joined-on-sign-in-1440')
      await C.close()
    }

    // ── 8 · The invitation's page asks for the code ────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · /join/<token> — a code before Join; a joined link signs in with a code')
      as('dane')
      const tok = addInvitee({ id: `${P}-omar`, name: 'Omar Probe', phone: '91230093' })
      const tokE = addInvitee({ id: `${P}-em`, name: 'Em Probe', email: 'em.probe@probe.example' })
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'join')
      await go(c, `/join/${tok}`, 900)
      ok(await text(c.locator('h1')) === 'Join Demo Studio' && await c.getByTestId('join-go').innerText() === 'Join Demo Studio', 'the invitation’s page: Join Demo Studio')
      ok(/^We’ll send a 6-digit code to the mobile number ending 0093 to make sure it’s you\. The link is open until \d+ \w+/.test(await text(c.getByTestId('join-demo'))), 'its line says Join sends a code to the number ending 0093 first — S09’s “until sign-in arrives” caption is gone')
      await c.getByTestId('join-go').click(); await settle(c, 1000)
      ok(await c.getByTestId('join-page').getAttribute('data-step') === 'code' && await text(c.getByTestId('join-sent')) === 'We sent a 6-digit code to the mobile number ending 0093. Enter it to join.', 'Join asks for the code (sent to the number ending 0093)')
      ok(sql(`select status from studio_invitations where id = '${P}-omar-inv'`) === 'pending', 'nothing is accepted before the code')
      ok(await text(c.getByTestId('join-demo')) === 'Demo only — no text or email is sent: any six digits work.', 'the stand-in says so here too')
      await shot(c, '07-join-code-1440')
      await typeCode(c, 'join-digit'); await c.getByTestId('join-go').click()
      await c.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {}); await settle(c, 1800)   // (S42 audit A-04, a deliberate change of this rule)
      const s = sessionsOf(`${P}-omar`)[0]
      ok(pathOf(c) === '/dashboard' && sql(`select status from studio_invitations where id = '${P}-omar-inv'`) === 'accepted' && s?.via === 'join' && s?.remember === 1, 'the code joins him: accepted, signed in on this browser (via join, kept 30 days), on the front door')
      await go(c, `/join/${tok}`, 900)
      ok(await c.getByTestId('join-page').getAttribute('data-state') === 'joined' && await c.getByTestId('join-go').innerText() === 'Open OpenMaison', 'his link again, on his browser: “Open OpenMaison”')
      const D = await desk(); await D.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const d = await page(D, 'join-again')
      as('dane')
      await go(d, `/join/${tok}`, 900)
      ok(await d.getByTestId('join-go').innerText() === 'Sign in' && /We’ll send a 6-digit code to the mobile number ending 0093 to sign you in\./.test(await text(d.getByTestId('join-demo'))), 'on another browser the joined link signs in — with a code, never the link alone')
      await d.getByTestId('join-go').click(); await settle(d, 900)
      ok(/Enter it to sign in\.$/.test(await text(d.getByTestId('join-sent'))), '…its code step')
      await typeCode(d, 'join-digit'); await d.getByTestId('join-go').click()
      await d.waitForURL(/\/leads/, { timeout: 15000 }).catch(() => {}); await settle(d, 1200)
      ok(await studioBlock(d).getAttribute('aria-label') === 'Demo Studio, viewing as Omar Probe. View as' && sessionsOf(`${P}-omar`).length === 2, 'and signs him in there too (a second record) — that browser is his (pending modules S43A, a deliberate change of this rule: never the flag)')
      await go(d, `/join/${tokE}`, 900)
      ok(/your email e•••@probe\.example/.test(await text(d.getByTestId('join-demo'))), 'a member invited by email only: the code goes to their email, shown masked')
      await D.close(); await C.close()
    }

    // ── 9 · Deactivated: signed out everywhere ─────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Deactivating a member signs them out')
      const G = await desk(); await G.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const g = await page(G, 'germaine')
      await go(g, '/sign-in', 400); await signIn(g, '96614208')
      ok(sessionsOf('germaine').some((s) => !s.ended_at), 'Germaine is signed in on her browser')
      as('dane')
      const D = await desk(); const d = await page(D, 'dane-members')
      await go(d, '/company/members', 1400)
      const row = d.getByTestId('member-row').filter({ has: d.locator('span[class*="__name"]').filter({ hasText: /^Germaine/ }) })
      await row.getByRole('button', { name: 'Deactivate' }).click(); await settle(d, 600)
      const dlg = d.getByRole('dialog').filter({ hasText: /Deactivate/ })
      if (await dlg.count()) { await dlg.getByRole('button', { name: /^Deactivate/ }).last().click(); await settle(d, 1200) }
      await waitSnack(d, /Germaine deactivated/)
      await d.locator('[data-om-snackbar]').first().hover().catch(() => {})   // the pointer holds its clock (REG-898) — its Undo waits for the end
      ok(sql(`select is_active from members where id = 'germaine'`) === '0' && sessionsOf('germaine').every((s) => !!s.ended_at && (s.ended_reason === 'deactivated' || s.ended_reason === 'replaced')) && sql(`select count(*) from studio_sessions where member_id = 'germaine' and ended_at is null`) === '0', 'Deactivate ends every session of hers (deactivated) — none of hers is live')
      await go(g, '/leads', 600); await ready(g)
      ok(pathOf(g) === '/sign-in?next=%2Fleads&reason=deactivated' && await notice(g) === 'Your account is deactivated. Ask your studio’s Owner to reactivate it.', `her next page: sign-in, saying her account is deactivated (${pathOf(g)})`)
      await shot(g, '08-deactivated-1440')
      await askCode(g, '96614208')
      ok(/This account is deactivated/.test(await fieldError(g)), 'and she can’t sign in again')
      await d.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click().catch(() => {}); await settle(d, 1200)
      ok(sql(`select is_active from members where id = 'germaine'`) === '1' && sessionsOf('germaine').every((s) => !!s.ended_at), 'Undo brings Germaine back — not her sessions: she signs in again')
      await D.close(); await G.close()
    }

    // ── 10 · Your profile confirms a new sign-in key ───────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · Your profile — a new number is confirmed by its code')
      as('dane')
      const C = await desk(); const c = await page(C, 'profile')
      const fieldP = (label) => c.locator('[data-testid="member-details"]').getByLabel(label, { exact: false }).first()
      await go(c, '/profile', 1400)
      await fieldP('Name').fill('Dane P'); await c.getByTestId('profile-save').click(); await settle(c, 1400)
      ok(/Your details are saved/.test(await snackText(c)) && await c.getByTestId('confirm-contact').count() === 0 && sql(`select name from members where id = 'dane'`) === 'Dane P', 'a name alone saves at once — nothing to confirm')
      await fieldP('Name').fill('Dane'); await c.getByTestId('profile-save').click(); await settle(c, 1400)
      await fieldP('Phone').fill('91112233'); await c.getByTestId('profile-save').click(); await settle(c, 1200)
      const dlg = c.getByRole('dialog', { name: 'Confirm your new number' })
      ok(await dlg.count() === 1 && await text(c.getByTestId('confirm-contact-sent')) === 'We sent a 6-digit code to the number ending 2233. Enter it to save — you’ll sign in with this number from now on.', 'a new mobile: “Confirm your new number” — the code went to the number ending 2233')
      ok(sql(`select coalesce(phone, '') from members where id = 'dane'`) === '' && await text(c.getByTestId('confirm-contact-demo')) === 'Demo only — no text or email is sent: any six digits work.', 'nothing saved yet; the stand-in says so')
      await shot(c, '09-profile-confirm-1440')
      await dlg.getByRole('button', { name: 'Confirm and save' }).click(); await settle(c, 500)
      ok(/Enter all 6 digits of the code/.test(await text(c.getByTestId('confirm-contact-error'))), 'Confirm with no code: all six digits')
      await typeCode(c, 'confirm-contact-digit'); await dlg.getByRole('button', { name: 'Confirm and save' }).click(); await settle(c, 1600)
      ok(await dlg.count() === 0 && /Your details are saved/.test(await snackText(c)) && sql(`select phone from members where id = 'dane'`) === '91112233', 'with it: saved, the dialog closes — “Your details are saved”')
      await fieldP('Email').fill('dane.probe@demostudio.sg'); await c.getByTestId('profile-save').click(); await settle(c, 1200)
      const dlgE = c.getByRole('dialog', { name: 'Confirm your new email' })
      ok(await dlgE.count() === 1 && /dane\.probe@demostudio\.sg/.test(await text(c.getByTestId('confirm-contact-sent'))), 'a new email: “Confirm your new email”')
      await dlgE.getByRole('button', { name: 'Cancel' }).click(); await settle(c, 500)
      ok(sql(`select email from members where id = 'dane'`) === 'dane@demostudio.sg', 'Cancel saves nothing')
      await fieldP('Email').fill(''); await fieldP('Phone').fill(''); await c.getByTestId('profile-save').click(); await settle(c, 1200)
      ok(/keep a mobile number or an email — you sign in with it/i.test(await snackText(c)) && sql(`select phone || '|' || email from members where id = 'dane'`) === '91112233|dane@demostudio.sg', 'taking both away is refused — “Keep a mobile number or an email — you sign in with it”')
      const S = await desk(); await S.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const s = await page(S, 'new-number')
      await go(s, '/sign-in', 400); await signIn(s, '91112233')
      ok(pathOf(s) === '/dashboard' && await studioBlock(s).getAttribute('aria-label') === 'Demo Studio. View as' && sessionsOf('dane').some((x) => !x.ended_at), 'the confirmed number signs Dane in')   // (S42 audit A-04, a deliberate change of this rule) · (pending modules S43A) his browser's session, never the flag
      await S.close(); await C.close()
    }

    // ── 11 · The phone ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · The phone — the You sheet’s Sign out; sign-in at 390 and 320')
      as('dane')
      const M = await phoneCtx(); const m = await page(M, 'phone')
      await go(m, '/leads', 1400)
      await m.getByTestId('phone-avatar').click(); await settle(m, 700)
      const sheet = m.locator('[role="menu"], [role="dialog"]').filter({ has: m.getByTestId('you-group') }).last()
      ok(await sheet.getByTestId('sign-out').count() === 1 && await sheet.getByTestId('sign-out').isVisible(), 'the phone’s avatar opens You — Sign out is in it')
      await shot(m, '10-you-sheet-390')
      await sheet.getByTestId('sign-out').click()
      await m.waitForURL(/\/sign-in/, { timeout: 15000 }).catch(() => {}); await ready(m)
      ok(pathOf(m) === '/sign-in?reason=out' && await sideways(m) <= 0, `it signs out to sign-in, which fits the phone (${await sideways(m)})`)
      await shot(m, '11-sign-in-390')
      await askCode(m, 'dane@demostudio.sg')
      const digits = await m.getByTestId('sign-in-digit').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
      ok(await sideways(m) <= 0 && digits.length === 6 && digits.every((h) => h >= 44), `the code step fits too, its boxes a finger’s size (${digits.join('/')})`)
      await shot(m, '12-code-390')
      await M.close()
      const N = await phoneCtx(320, 640); await N.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const n = await page(N, '320')
      await go(n, '/sign-in?reason=ended', 900); await ready(n)
      ok(await sideways(n) <= 0, `320: no sideways scroll (${await sideways(n)})`)
      await shot(n, '13-sign-in-320')
      await askCode(n, '9883 7542'); ok(await sideways(n) <= 0, `320, the code step: none either (${await sideways(n)})`)
      await N.close()
    }

    // ── 12 · The ghost sits on the page ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(12)) {
      console.log('12 · Sign-in’s ghost')
      const boxes = async (p, ghost) => p.evaluate((g) => {
        const root = g ? document.querySelector('[aria-label="Loading"]') : document.querySelector('[data-testid="sign-in"]')
        if (!root) return null
        const r = (sel) => { const e = root.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.left), Math.round(b.width), Math.round(b.height)] }
        return { head: r('[class*="__signinHead"]'), notice: r('[class*="__notice"]'), form: r('[class*="__form"]'), foot: r('[class*="__foot"]') }
      }, ghost)
      for (const [w, mk, reason] of [[1440, () => desk(), 'out'], [390, () => phoneCtx(), 'out'], [390, () => phoneCtx(), 'ended'], [320, () => phoneCtx(320, 640), 'qanvast']]) {
        const G = await mk(); await G.addCookies([{ name: 'om_seen', value: 'out', url: BASE }])
        await G.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
        const g = await page(G, `ghost-${w}`); await g.goto(BASE + `/sign-in?reason=${reason}`, { waitUntil: 'load' }); await settle(g, 1400)
        const gb = await boxes(g, true)
        await shot(g, `14-ghost-${w}-${reason}`)
        const R = await mk(); await R.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const r = await page(R, `page-${w}`)
        await go(r, `/sign-in?reason=${reason}`, 900); await ready(r)
        const pb = await boxes(r, false)
        await shot(r, `15-page-${w}-${reason}`)
        const same = (k, tol = 4) => !!gb?.[k] && !!pb?.[k] && gb[k].every((v, i) => Math.abs(v - pb[k][i]) <= tol)
        ok(same('head') && same('notice') && same('form', 6), `${w} (${reason}): the ghost’s head, notice and form sit where the page has them (ghost ${JSON.stringify(gb)} · page ${JSON.stringify(pb)})`)
        ok(same('foot', 6), `${w} (${reason}): …and its foot, the stand-in’s two lines wrapped as the page wraps them`)
        await G.close(); await R.close()
      }
    }

    // ── 13 · Reset prototype to base puts this browser back on the demo's own session ──────────────────────────────────────────────────
    if (want(13)) {
      console.log('13 · Reset prototype to base')
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const c = await page(C, 'reset')
      await go(c, '/sign-in', 400); await signIn(c, '98837542')
      ok(!!(await cookie(C, 'om_session')), 'signed in as Sarah (a session cookie)')
      await c.getByRole('button', { name: 'Maison AI' }).first().click(); await settle(c, 800)
      await c.getByRole('button', { name: /Reset prototype to base/ }).click(); await settle(c, 500)
      await c.getByRole('dialog', { name: 'Reset the prototype?' }).getByRole('button', { name: 'Reset' }).click()
      await c.waitForLoadState('networkidle').catch(() => {}); await settle(c, 4000)
      ok(!(await cookie(C, 'om_session')) && !(await cookie(C, 'om_seen')), 'the reset forgets this browser’s sign-in — the demo’s own session again')
      await go(c, '/leads', 1200)
      // (pending modules S39, a deliberate change of this rule — R123 gives the demo's PAST the sign-ins its acts imply, all signed out: the base
      // state now holds ended sign-ins, never a live one)
      ok(pathOf(c) === '/leads' && sql(`select id from members where is_you = 1`) === 'dane' && sql(`select count(*) from studio_sessions where ended_at is null`) === '0', 'and it opens as Dane, with no live session record (the base state — the reset ended this browser’s)')
      await C.close()
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(still.length ? `  ✗ not as found: ${still.join(', ')}` : '  ✓ the scratch DB is as it was found')
    if (still.length) fail++
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
