// Pending modules, step S43A · One signed-in member per browser (the S42 audit's call A·1, built as recommended on his "fix all the pending
// things" 2026-10-15). Each item asserted as the rule it builds, never another round's count:
//  - the guard: no write stamp reads the standing session's flag (`sessionMemberSql` is gone; `members.is_you` is read for the app in
//    lib/db/session.ts alone and written by View as alone)
//  - two browsers: the Owner's standing window stays Dane while an invitee joins on a second browser — on every page (the studio block, the
//    Dashboard's greeting, Your profile, Members' "you", View as's tick, the bell) — and the flag never moves
//  - every write stamp follows its own browser, both pressed at once (a task's creator, a file comment's author), and the Activity names who
//  - Who sees leads per browser: a Designer signed in by a code sees only her leads (the listing's payload, a lead she isn't on refuses) while
//    the Owner's window sees them all; Who sees costs per browser: the price book's Cost · Markup for the Owner, never for a hidden Designer
//  - a browser whose session ended presses a write: it goes to sign-in and nothing is stamped as anyone else
//  - Sign out ends only its own browser; View as from the standing window still moves the prototype (another standing window follows, a
//    code-signed one doesn't); Reset puts the prototype back on Dane and ends every code-signed session
//  - S42A's fallback line ("one signed-in member at a time") is gone from both code steps, the demo's line about the code stays; 390 · 320
//    hold without sideways scroll; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s43a.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s43a')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = path.resolve(__dirname, '../../..')
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s43a-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, detail) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, detail !== undefined ? `— ${String(detail).slice(0, 300)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const flag = () => sql(`select id from members where is_you = 1`)
const DAY = 86_400_000
const P = 'pm2s43a'   // the probe's own rows

/* ── 0 · the guard, read from the source: no stamp can follow the flag ─────────────────────────────────────────────────────────────── */
function sourceGuard() {
  const files = []
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p) } }
  for (const d of ['app', 'components', 'lib']) walk(path.join(REPO, d))
  files.push(path.join(REPO, 'proxy.ts'))
  /* comments out (block and line), strings kept — a rule that reads the code, never its words */
  const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  const rel = (p) => path.relative(REPO, p)
  const stampUse = [], flagUse = [], rawFlag = []
  for (const f of files) {
    const t = code(fs.readFileSync(f, 'utf8'))
    if (/\bsessionMemberSql\b/.test(t)) stampUse.push(rel(f))
    if (/\.standingYou\b/.test(t)) flagUse.push(rel(f))
    if (/\bis_you\b/.test(t) && rel(f) !== 'lib/db/schema.ts') rawFlag.push(rel(f))   // the schema names the column — nothing else reads it by hand
  }
  return { stampUse, flagUse, rawFlag, count: files.length }
}

;(async () => {
  console.log('0 · The guard — no write stamp reads the standing session’s flag')
  {
    const g = sourceGuard()
    ok(g.stampUse.length === 0, `no file uses \`sessionMemberSql\` (the static subquery on the flag is gone) — ${g.count} files read`, g.stampUse.join(', '))
    const allowed = ['lib/db/session.ts', 'app/view-as-actions.ts']
    ok(g.flagUse.every((f) => allowed.includes(f)) && g.flagUse.includes('lib/db/session.ts'), 'the flag (`members.standingYou`) is read in lib/db/session.ts and written by View as — nowhere else', g.flagUse.join(', '))
    ok(g.rawFlag.length === 0, 'no query reads `is_you` by hand', g.rawFlag.join(', '))
    const schema = fs.readFileSync(path.join(REPO, 'lib/db/schema.ts'), 'utf8')
    ok(/standingYou: integer\('is_you'/.test(schema) && /export type Member = Omit<MemberRecord, 'standingYou'> & \{ isYou: boolean \}/.test(schema), 'the schema names the flag apart from the app’s `isYou` (a member row reaches the app through `withYou`)')
  }

  const b = await chromium.launch()
  const errors = []
  /* the app's own lazy writes first (the credits' month roll on the first page), so the snapshot is what the app keeps */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
  const you0 = flag()
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
  const go = async (p, url, ms = 1100) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const pathOf = (p) => { const u = new URL(p.url()); return u.pathname + u.search }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const block = (p) => p.locator('button[aria-haspopup="menu"][aria-label^="Demo Studio"]')
  const blockLabel = async (p) => (await block(p).count()) ? (await block(p).first().getAttribute('aria-label')) ?? '' : ''
  const openMenu = async (p) => { await block(p).first().click(); await settle(p, 600); return p.locator('[role="menu"][aria-label="View as"]') }
  /* the ticked members (the plans group below has its own tick): each radio reads its initial, name and role */
  const ticked = async (p) => { const m = await openMenu(p); const t = await m.locator('[role="menuitemradio"][aria-checked="true"]').allInnerTexts(); await p.keyboard.press('Escape'); await settle(p, 300); return t.map((x) => x.replace(/\s+/g, ' ').trim()) }
  const nameField = async (p) => (await p.locator('main input').evaluateAll((els) => els.map((e) => e.value))).filter(Boolean)
  const bellLabel = async (p) => (await p.locator('nav [data-notifications-tile]').first().getAttribute('aria-label').catch(() => '')) ?? ''
  const unread = (member) => Number(sql(`select count(*) from notifications where member_id = '${member}' and read_at is null`))
  const ready = async (p, testId = 'sign-in') => { await p.waitForFunction((id) => { const e = document.querySelector(`[data-testid="${id}"]`); return !!e && !e.closest('[inert]') }, testId, { timeout: 15000 }).catch(() => {}); await settle(p, 300) }
  const askCode = async (p, contact) => { await ready(p); await p.getByLabel('Mobile number or email').fill(contact); await p.getByTestId('sign-in-send').click(); await settle(p, 1000) }
  const signIn = async (p, contact) => {
    await go(p, '/sign-in', 400); await askCode(p, contact)
    await p.getByTestId('sign-in-digit').first().click(); await p.keyboard.type('123456'); await settle(p, 200)
    const from = p.url()
    await p.getByTestId('sign-in-go').click()
    await p.waitForURL((u) => String(u) !== from && !/\/sign-in/.test(String(u)), { timeout: 15000 }).catch(() => {})
    await settle(p, 1400)
  }
  const dismissWelcome = async (p) => { const later = p.getByTestId('welcome-later'); if (await later.count()) { await later.first().click().catch(() => {}); await settle(p, 900) } }
  const liveSessionOf = (member) => json(`select * from studio_sessions where member_id = '${member}' and ended_at is null and id not like 'ss-trail-%' order by started_at desc`)[0] ?? null
  const greeting = async (p) => { const t = (await p.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' '); return (/Good (morning|afternoon|evening), [^.]+\./.exec(t) ?? [''])[0] }

  /* the probe's own invitee: a Designer with a mobile, owed the first-visit welcome, invited by Dane */
  const INV = `${P}-nora`, INV_NAME = 'Nora Probe', INV_TOKEN = `${P}nora`.padEnd(22, 'x').slice(0, 22)
  const leadsOf = (m) => json(`select l.id, l.name from leads l join lead_assignees a on a.lead_id = l.id where a.member_id = '${m}' and l.deleted_at is null and l.direct = 0 order by l.created_at desc`)
  const sarahLead = leadsOf('sarah')[0]
  const otherLead = json(`select l.id, l.name from leads l where l.deleted_at is null and l.direct = 0 and l.id not in (select lead_id from lead_assignees where member_id = 'sarah') order by l.created_at desc limit 1`)[0]
  const ITEM = json(`select id from price_book_items where deleted_at is null and status = 'live' and cost_minor is not null order by name limit 1`)[0]?.id
  const BOOK_COST = 4321987

  try {
    // ── 1 · Two browsers: the Owner's standing window and an invitee who joins on another ──────────────────────────────────────────
    let A, a, B, bb
    if (want(1) || want(2) || want(5) || want(6)) {
      console.log('1 · Two browsers — the Owner’s window stays Dane while an invitee joins on another')
      as('dane')
      sql(`insert into members (id, name, role, color, is_you, email, phone, is_active, accepting_leads, welcome_due) values ('${INV}', '${INV_NAME}', 'Designer', '#5B7FD7', 0, '${P}@probe.example', '91230077', 1, 1, 1)`)
      sql(`insert into studio_invitations (id, member_id, invited_by, full_name, phone, email, role, token, status, expires_at, sent_at, send_count, channels, created_at) values ('${INV}-inv', '${INV}', 'dane', '${INV_NAME}', '91230077', '${P}@probe.example', 'Designer', '${INV_TOKEN}', 'pending', ${Date.now() + 30 * DAY}, ${Date.now() - DAY}, 1, 'whatsapp', ${Date.now() - DAY})`)
      A = await desk(); a = await page(A, 'owner')
      await go(a, '/dashboard', 1600)
      ok(/, Dane\.$/.test(await greeting(a)) && await blockLabel(a) === 'Demo Studio. View as', `the Owner’s window opens as Dane — “${await greeting(a)}”`)
      B = await desk(); bb = await page(B, 'invitee')
      await go(bb, `/join/${INV_TOKEN}`, 900)
      ok(await bb.getByTestId('join-page').getAttribute('data-state') === 'open', 'the invitee’s browser opens her invitation')
      await bb.getByTestId('join-go').click(); await settle(bb, 900)
      ok(await bb.getByTestId('join-one-at-a-time').count() === 0 && /Demo only — no text or email is sent: any six digits work\./.test(await text(bb.getByTestId('join-demo'))), 'the code step no longer says “one signed-in member at a time” — the demo’s line about the code stays')
      await shot(bb, '01-join-code-1440')
      await bb.getByTestId('join-digit').first().click(); await bb.keyboard.type('123456')
      await bb.getByTestId('join-go').click()
      await bb.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {}); await settle(bb, 1600)
      ok(/Welcome, Nora Probe/.test(await text(bb.getByRole('dialog').filter({ has: bb.getByTestId('first-visit-welcome') }))), 'Join lands her on the front door with her own welcome')
      await shot(bb, '02-invitee-welcome-1440')
      await dismissWelcome(bb)
      const sess = liveSessionOf(INV)
      ok(!!sess && sess.via === 'join' && flag() === 'dane', `her browser has a session of its own (via join) — and the standing session’s flag stays on Dane (${flag()})`)
      ok(/, Nora Probe\.$/.test(await greeting(bb)) && await blockLabel(bb) === `Demo Studio, viewing as ${INV_NAME}. View as`, `her browser is hers — “${await greeting(bb)}”`)
      await go(a, '/dashboard', 1600)
      ok(/, Dane\.$/.test(await greeting(a)) && await blockLabel(a) === 'Demo Studio. View as' && await a.getByTestId('first-visit-welcome').count() === 0, `the Owner’s open window is still Dane — no invitee greeting, no welcome (“${await greeting(a)}”)`)
      await shot(a, '03-owner-still-dane-1440')
      /* every page, both browsers */
      const pages = ['/leads', '/tasks', '/projects', '/profile', '/company/members', '/settings']
      const bad = []
      for (const u of pages) {
        await Promise.all([go(a, u, 900), go(bb, u, 900)])
        const [la, lb] = [await blockLabel(a), await blockLabel(bb)]
        if (la !== 'Demo Studio. View as') bad.push(`owner ${u}: ${la}`)
        if (lb !== `Demo Studio, viewing as ${INV_NAME}. View as`) bad.push(`invitee ${u}: ${lb}`)
        if (u === '/profile') {
          const [pa, pb] = [await nameField(a), await nameField(bb)]
          if (!pa.includes('Dane') || pa.includes(INV_NAME)) bad.push(`owner /profile is not Dane’s (${pa.join(', ')})`)
          if (!pb.includes(INV_NAME) || pb.includes('Dane')) bad.push(`invitee /profile is not hers (${pb.join(', ')})`)
        }
        if (u === '/company/members') {
          const you = async (p, id) => /\byou\b/i.test(await text(p.locator(`[data-member-id="${id}"] span[class*="__name"]`)))
          if (!(await you(a, 'dane')) || await you(a, INV)) bad.push('owner: Members marks someone else as you')
          if (!(await you(bb, INV)) || await you(bb, 'dane')) bad.push('invitee: Members marks someone else as you')
        }
      }
      ok(bad.length === 0, `on every page each browser stays who it is — ${pages.join(' · ')} (the studio block; Your profile; Members’ “you”)`, bad.join(' | '))
      ok(flag() === 'dane', 'and nothing moved the standing session’s flag')
      const [ta, tb] = [await ticked(a), await ticked(bb)]
      ok(ta.some((t) => /Dane/.test(t)) && !ta.some((t) => t.includes(INV_NAME)) && tb.some((t) => t.includes(INV_NAME)) && !tb.some((t) => /Dane/.test(t)), 'View as ticks Dane on the Owner’s window and Nora on hers', `${ta.join(' / ')} ‖ ${tb.join(' / ')}`)
      await go(a, '/dashboard', 900); await go(bb, '/dashboard', 900)
      const nd = unread('dane'), ni = unread(INV)
      const [ba, bi] = [await bellLabel(a), await bellLabel(bb)]
      ok(ba === (nd ? `Notifications (${nd} unread)` : 'Notifications') && bi === (ni ? `Notifications (${ni} unread)` : 'Notifications'), `the bell is each browser’s own — Dane ${nd} unread (“${ba}”), Nora ${ni} (“${bi}”)`)
    }

    // ── 2 · Every write stamp follows its own browser — pressed at the same moment ──────────────────────────────────────────────────
    if (want(2) && a && bb) {
      console.log('2 · Write stamps follow each browser, pressed at once')
      const lead = otherLead ?? sarahLead
      const tA = `${P} owner’s task`, tB = `${P} invitee’s task`
      await Promise.all([go(a, `/leads/${lead.id}/tasks?add=1`, 1200), go(bb, `/leads/${lead.id}/tasks?add=1`, 1200)])
      await Promise.all([a.keyboard.type(tA), bb.keyboard.type(tB)])
      await Promise.all([a.keyboard.press('Enter'), bb.keyboard.press('Enter')])
      await Promise.all([settle(a, 1800), settle(bb, 1800)])
      const ca = json(`select creator_id as c from lead_tasks where title = '${tA.replace(/'/g, "''")}'`), cb = json(`select creator_id as c from lead_tasks where title = '${tB.replace(/'/g, "''")}'`)
      ok(ca.length === 1 && ca[0].c === 'dane' && cb.length === 1 && cb[0].c === INV, `a task each, at once: Dane’s window stamps Dane, Nora’s stamps Nora (${ca[0]?.c} · ${cb[0]?.c})`)
      const fileLead = json(`select f.lead_id as l, f.id as f from lead_files f join leads l on l.id = f.lead_id where f.kind != 'folder' and f.deleted_at is null and l.deleted_at is null and l.direct = 0 and l.id not in (select lead_id from projects where deleted_at is null) order by f.created_at limit 1`)[0]
      const file = fileLead?.f
      if (file) {
        const cA = `${P} comment from the owner`, cB = `${P} comment from the invitee`
        await Promise.all([go(a, `/leads/${fileLead.l}/files/${file}?panel=comments`, 1400), go(bb, `/leads/${fileLead.l}/files/${file}?panel=comments`, 1400)])
        const boxA = a.locator('aside[aria-label="Comments"] textarea'), boxB = bb.locator('aside[aria-label="Comments"] textarea')
        await boxA.click(); await a.keyboard.type(cA); await boxB.click(); await bb.keyboard.type(cB)
        await Promise.all([a.keyboard.press('Enter'), bb.keyboard.press('Enter')])
        await Promise.all([settle(a, 1500), settle(bb, 1500)])
        const fa = json(`select author_id as c from file_comments where body like '%${cA}%'`), fb = json(`select author_id as c from file_comments where body like '%${cB}%'`)
        ok(fa[0]?.c === 'dane' && fb[0]?.c === INV, `a file comment each, at once: authors Dane and Nora (${fa[0]?.c} · ${fb[0]?.c})`)
      } else ok(false, 'a file on the lead to comment on')
      /* the Activity names who: "You" on her browser, her name on the Owner's */
      await Promise.all([go(a, `/leads/${lead.id}/activity`, 1400), go(bb, `/leads/${lead.id}/activity`, 1400)])
      const lineOf = async (p) => ((await p.locator('main').innerText()).split('\n').find((l) => l.includes(tB)) ?? '').trim()
      const [la, lb] = [await lineOf(a), await lineOf(bb)]
      ok(/\bYou\b/.test(lb) && !/Nora/.test(lb) && /Nora/.test(la) && !/\bYou\b/.test(la), `Activity: “${lb}” on her browser, “${la}” on the Owner’s`)
    }

    // ── 3 · Who sees leads and who sees costs — per browser ───────────────────────────────────────────────────────────────────────
    let C, c
    if (want(3) || want(5) || want(6)) {
      console.log('3 · A Designer’s browser sees only her leads and no costs; the Owner’s sees all')
      as('dane')
      sql(`insert into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now')) on conflict(key) do update set value = excluded.value`)
      sql(`insert into settings (key, value, updated_at) values ('cost_visibility', '{"admin":true,"manager":true,"designer":false,"accounting":true}', strftime('%s','now')) on conflict(key) do update set value = excluded.value`)
      if (ITEM) sql(`update price_book_items set cost_minor = ${BOOK_COST} where id = '${ITEM}'`)
      C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); c = await page(C, 'sarah')
      await signIn(c, '98837542')
      await dismissWelcome(c)
      ok(!!liveSessionOf('sarah') && flag() === 'dane' && await blockLabel(c) === 'Demo Studio, viewing as Sarah. View as', `Sarah signs in by a code on a third browser — hers alone; the flag stays on Dane (${flag()})`)
      if (!A) { A = await desk(); a = await page(A, 'owner') }
      await Promise.all([go(a, '/leads', 1600), go(c, '/leads', 1600)])
      const [ha, hc] = [await a.content(), await c.content()]
      if (sarahLead && otherLead) {
        ok(ha.includes(sarahLead.id) && ha.includes(otherLead.id), `the Owner’s listing carries every lead — hers (${sarahLead.name}) and one she isn’t on (${otherLead.name})`)
        ok(hc.includes(sarahLead.id) && !hc.includes(otherLead.id), `Sarah’s listing carries her lead and never the other (${otherLead.name}) — Who sees leads, on her browser`)
        await Promise.all([go(a, `/leads/${otherLead.id}`, 1400), go(c, `/leads/${otherLead.id}`, 1400)])
        const [ma, mc] = [await a.locator('main').innerText(), await c.locator('main').innerText()]
        ok(!/isn’t one you can open/.test(ma) && /isn’t one you can open/.test(mc), 'the lead she isn’t on: the Owner opens it, her browser says it isn’t one she can open')
      } else ok(false, 'a lead of Sarah’s and one she isn’t on')
      if (ITEM) {
        const listMode = (p) => p.evaluate(() => { try { localStorage.setItem('om.price-book-items.list', '1') } catch { /* a convenience */ } })
        await listMode(a); await listMode(c)
        await Promise.all([go(a, '/company/price-book', 1800), go(c, '/company/price-book', 1800)])
        const heads = async (p) => (await p.getByRole('columnheader').allInnerTexts()).map((t) => t.replace(/unfold_more|arrow_upward|arrow_downward/g, '').replace(/\s+/g, ' ').trim().toLowerCase())
        const [hA, hC] = [await heads(a), await heads(c)]
        ok((await a.content()).includes(String(BOOK_COST)) && hA.includes('cost'), `the Owner’s window: the price book carries the item’s cost and its Cost column (${hA.join(' | ')})`)
        ok(!(await c.content()).includes(String(BOOK_COST)) && !hC.includes('cost') && !hC.includes('markup'), `Sarah’s browser: no cost in the payload, no Cost · Markup (${hC.join(' | ')}) — Who sees costs, on her browser`)
        await shot(c, '04-designer-price-book-1440')
      } else ok(false, 'a price book item with a cost')
      /* the front door, ⌘K and Maison AI ask the same browser's member */
      await Promise.all([go(a, '/dashboard', 1600), go(c, '/dashboard', 1600)])
      ok(/, Dane\.$/.test(await greeting(a)) && /, Sarah\.$/.test(await greeting(c)) && !(await c.content()).includes(otherLead?.id ?? '—'), `the Dashboard greets each browser’s member, and Sarah’s Needs you · My tasks carry nothing of a lead she isn’t on (“${await greeting(a)}” · “${await greeting(c)}”)`)
      if (otherLead) {
        const find = async (p) => {
          await p.keyboard.press('ControlOrMeta+K'); await settle(p, 700)
          await p.locator('input[aria-label="Search the studio"]').fill(otherLead.name)
          await p.waitForFunction(() => { const l = document.querySelector('#gs-list'); return !!l && !l.hasAttribute('data-loading') }, null, { timeout: 10000 }).catch(() => {})
          await settle(p, 900)
          const t = (await p.locator('#gs-list').innerText().catch(() => '')).replace(/\s+/g, ' ')
          await p.keyboard.press('Escape'); await settle(p, 400)
          return t
        }
        const [ka, kc] = [await find(a), await find(c)]
        /* her search echoes the words typed ("Nothing matches “…”") — what counts is a Leads result */
        ok(/\bLeads\b/i.test(ka) && ka.toLowerCase().includes(otherLead.name.toLowerCase()) && !/\bLeads\b/i.test(kc) && /Nothing matches/.test(kc), `⌘K finds ${otherLead.name} on the Owner’s window, never on Sarah’s`, `${ka.slice(0, 120)} ‖ ${kc.slice(0, 120)}`)
      }
      const ask = async (p, q) => {
        await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 900)
        const sheet = p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
        const box = sheet.locator('[data-testid="maison-ask"] input'); await box.fill(q); await box.press('Enter')
        await p.waitForFunction(() => [...document.querySelectorAll('[role="dialog"][aria-label="Maison AI suggestions"] [data-testid="maison-answer"]')].some((e) => /What (Sarah is|you are) working on/.test(e.textContent || '')), null, { timeout: 20000 }).catch(() => {})
        const t = await text(sheet.locator('[data-testid="maison-answer"]').last())
        await p.keyboard.press('Escape'); await settle(p, 500)
        return t
      }
      const [qa, qc] = [await ask(a, 'What is Sarah working on?'), await ask(c, 'What is Sarah working on?')]
      ok(/What Sarah is working on/.test(qa) && /What you are working on/.test(qc), `Maison AI answers each browser as its member — the Owner reads “What Sarah is working on”, Sarah “What you are working on”`, `${qa.slice(0, 80)} ‖ ${qc.slice(0, 80)}`)
    }

    // ── 4 · A browser whose session ended presses a write: sign-in, nothing stamped as anyone else ─────────────────────────────────
    if (want(4)) {
      console.log('4 · A session that ended mid-page: the next write goes to sign-in, nothing lands')
      const D = await desk(); await D.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const d = await page(D, 'michelle')
      await signIn(d, 'michelle@demostudio.sg'); await dismissWelcome(d)
      const lead = leadsOf('michelle')[0] ?? sarahLead
      await go(d, `/leads/${lead.id}/tasks?add=1`, 1400)
      const s = liveSessionOf('michelle')
      sql(`update studio_sessions set ended_at = ${Date.now()}, ended_reason = 'replaced' where id = '${s?.id}'`)
      const tD = `${P} after her session ended`
      await d.keyboard.type(tD); await d.keyboard.press('Enter')
      await d.waitForURL(/\/sign-in/, { timeout: 12000 }).catch(() => {}); await settle(d, 1200)
      ok(/^\/sign-in\?next=.*reason=ended/.test(pathOf(d)), `the press goes to sign-in, saying the session ended (${pathOf(d)})`)
      ok(Number(sql(`select count(*) from lead_tasks where title = '${tD}'`)) === 0, 'and nothing was written — never stamped as the standing session’s member')
      await D.close()
    }

    // ── 5 · Sign out ends only its own browser ──────────────────────────────────────────────────────────────────────────────────────
    if (want(5) && bb && a && c) {
      console.log('5 · Sign out ends only the browser that pressed it')
      await go(bb, '/dashboard', 900)
      const m = await openMenu(bb); await m.getByTestId('sign-out').click()
      await bb.waitForURL(/\/sign-in/, { timeout: 15000 }).catch(() => {}); await settle(bb, 1200)
      const ended = json(`select ended_reason as r from studio_sessions where member_id = '${INV}' order by started_at desc limit 1`)[0]
      ok(/\/sign-in\?reason=out/.test(pathOf(bb)) && ended?.r === 'signed-out', `Nora’s browser signs out (${pathOf(bb)}, its record ${ended?.r})`)
      await Promise.all([go(a, '/dashboard', 1400), go(c, '/dashboard', 1400)])
      ok(/, Dane\.$/.test(await greeting(a)) && await blockLabel(a) === 'Demo Studio. View as', 'the Owner’s window is still in, as Dane')
      ok(await blockLabel(c) === 'Demo Studio, viewing as Sarah. View as' && !!liveSessionOf('sarah'), 'Sarah’s browser is still in, as Sarah')
    }

    // ── 6 · View as from the standing window still moves the prototype; Reset returns it to Dane ─────────────────────────────────────
    if (want(6) && a && c) {
      console.log('6 · View as moves the prototype — the standing windows and the browser that pressed it; Reset brings Dane back')
      await go(a, '/dashboard', 900)
      const m = await openMenu(a)
      await m.getByRole('menuitemradio').filter({ hasText: 'Hui Min' }).click(); await settle(a, 1800)
      ok(flag() === 'huimin' && await blockLabel(a) === 'Demo Studio, viewing as Hui Min. View as', `the Owner’s window becomes Hui Min, and the flag moves (${flag()})`)
      const A2 = await desk(); const a2 = await page(A2, 'standing-2')
      await go(a2, '/dashboard', 1400)
      ok(await blockLabel(a2) === 'Demo Studio, viewing as Hui Min. View as', 'another standing window follows the whole prototype — Hui Min')
      await A2.close()
      await go(c, '/dashboard', 1400)
      ok(await blockLabel(c) === 'Demo Studio, viewing as Sarah. View as', 'a browser signed in by a code stays its own member — Sarah')
      await a.getByRole('button', { name: 'Maison AI' }).first().click(); await settle(a, 800)
      await a.getByRole('button', { name: /Reset prototype to base/ }).click(); await settle(a, 500)
      await a.getByRole('dialog', { name: 'Reset the prototype?' }).getByRole('button', { name: 'Reset' }).click()
      await a.waitForLoadState('networkidle').catch(() => {}); await settle(a, 4500)
      await go(a, '/dashboard', 1400)
      ok(flag() === 'dane' && /, Dane\.$/.test(await greeting(a)) && await blockLabel(a) === 'Demo Studio. View as', 'Reset returns the prototype to Dane')
      await go(c, '/leads', 1000)
      ok(/^\/sign-in\?next=%2Fleads&reason=ended$/.test(pathOf(c)), `and Sarah’s code-signed session ended with it — her next page asks her to sign in again (${pathOf(c)})`)
    }

    // ── 7 · The sign-in code step at every width ──────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · The sign-in code step: the fallback line gone, every width whole')
      for (const [w, h] of [[1440, 1024], [390, 844], [320, 640]]) {
        const X = w === 1440 ? await desk() : await phoneCtx(w, h); await X.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const x = await page(X, `code-${w}`)
        await go(x, '/sign-in', 400); await askCode(x, 'sarah@demostudio.sg')
        const fine = await x.getByTestId('sign-in-demo').innerText().catch(() => '')
        ok(await x.getByTestId('sign-in').getAttribute('data-step') === 'code' && await x.getByTestId('sign-in-one-at-a-time').count() === 0 && /Demo only — no text or email is sent: any six digits sign you in\./.test(fine), `${w}: the code step says only the demo’s line about the code`)
        if (w !== 1440) ok(await sideways(x) <= 0, `${w}: no sideways scroll (${await sideways(x)})`)
        await shot(x, `05-sign-in-code-${w}`)
        await X.close()
      }
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
    if (A) await A.close(); if (B) await B.close(); if (C) await C.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
