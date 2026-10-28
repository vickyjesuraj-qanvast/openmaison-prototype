// Pending modules, package S46C · what a 1.0 user can't find, fixed — his "fix everything" 2026-10-19 after the findability audit
// (design-source/context/parity/31-findability-audit-2026-10-19/, findings M2 · M3 · H2 · H4 · R1). Each item asserted as the rule it builds,
// never a count another round can change:
//  - M2: every Settings module's head, for every role (Dane Owner · Germaine Designer · Priya Accounting · Nurul Marketing), says where a
//    member's own settings are — "Your own details, signature and notifications:" + Your profile, which opens /profile with Back to Settings
//  - M3: the rail's Tasks page says "n approvals wait for you on the Dashboard" with n = the Dashboard's own Needs your OK, its door opens the
//    Dashboard with ?from=/tasks; never at 0 (Germaine · Priya · Nurul: no line); the ghost draws the line where the page draws it
//  - H2: the Leads item counts the leads nobody has opened yet that the viewer sees (Who sees leads), "Leads (n new)", landing on the listing's
//    Unseen scope (the rail's badge-landing rule), the phone's dock alike; opening the lead — from the listing or from anywhere — clears it
//  - H4: the listing's search finds a lead by its District; the lead's email is a mail link beside Copy; the number keeps REG-746 (it dials on
//    a touch screen, a desk copies); Tasks' Upcoming chip (1.0's Due › Upcoming: open, due after today) on My Tasks, where Unassigned isn't
//  - R1: Deleted Leads keeps its "permanently removed after 30 days": the sweep's `deleted-leads` job and a read of the sheet remove a lead
//    deleted 31 days ago, keep one deleted 29 days ago and one a project keeps; a second run removes nothing; 1.0's archived leads port to Lost
//    (pm2-s46c-pure.mts, run here) and map 02 says so
//  - 390 · 320 · 768 touch with no sideways scroll against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db — started with CRON_SECRET (pass the same in CRON).
// It puts back what it changes (the View as flag, seen stamps, visibility, its probe leads) in `finally`.
// Usage: CRON=<secret> BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s46c.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s46c')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const CRON = process.env.CRON || ''
const REPO = path.resolve(__dirname, '../../..')
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const num = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${typeof more === 'string' ? more : JSON.stringify(more)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const DAY_S = 86_400
const nowS = () => Math.floor(Date.now() / 1000)
const CHLOE = 'ba7fc1c8-d356-49a8-a548-e8f2a9d00190', RAHUL = '2014d2ce-e89b-4876-a905-4478390e9ebe'
const KELVIN = '3c1b7221-d4ed-4d1c-aba8-d2549e58f9ff'   // Kelvin Goh — an email and a number
const WEILING = '4b13c35b-58f9-47ad-ab57-5aa0a7a8c32d'   // Lim Wei Ling — District North East
const BEN_LEAD = '2b6d6bfc-5d25-48c8-904a-6f7a7c85cec3'   // Benjamin Han — a live project, P-2026-002

/* The ghost-vs-page measure (the S17 · S45A probes'): the held reveal (its first paint faked days away), every element carrying a page module's
   class in both, index by index — and every Words sentence the ghost sets in a page class against that page's. */
async function measure(b, opts, url, blocks) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks }) => {
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
        for (const k of ks) { if (!blocks.some((x) => k === x)) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const k of blocks) { const gs = g.get(k) ?? [], ps = q.get(k) ?? []; rows.push({ k, ghost: gs.length, page: ps.length, first: gs[0] && ps[0] ? { dx: ps[0][0] - gs[0][0], dy: ps[0][1] - gs[0][1], dw: ps[0][2] - gs[0][2], dh: ps[0][3] - gs[0][3] } : null }) }
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    const words = []
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words }
  }, { blocks })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, t = 900) => p.waitForTimeout(t)
  const go = async (p, url, t = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, t) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const railLeads = (p) => p.locator('nav[aria-label="Workspace"] a[data-kb="go.leads"]').first()
  const dockLeads = (p) => p.locator('nav[aria-label="Primary"] a').filter({ hasText: 'Leads' }).first()
  const vis0 = sql(`select value from settings where key = 'lead_visibility'`)
  const seen0 = sql(`select id || '=' || coalesce(seen_at, 'null') from leads where seen_at is null and deleted_at is null`)
  const unseenFor = (memberSees) => num(`select count(*) from leads l where l.seen_at is null and l.deleted_at is null and l.direct = 0 ${memberSees ? `and ${memberSees}` : ''}`)

  try {
    // ── 0 · the port's pure rules ───────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(0)) {
      console.log('0 · 1.0’s archived leads → Lost (pm2-s46c-pure.mts)')
      let out = ''
      try { out = execSync('npx tsx design-source/verify/pending-modules/pm2-s46c-pure.mts', { cwd: REPO, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
      const good = (out.match(/^ {2}✓ .*$/gm) ?? []), bad = (out.match(/^ {2}✗ .*$/gm) ?? [])
      for (const g of good) ok(true, `pure · ${g.slice(4)}`)
      for (const x of bad) ok(false, `pure · ${x.slice(4)}`)
      ok(good.length >= 20 && bad.length === 0, `the pure probe ran (${good.length} checks)`)
      const map = fs.readFileSync(path.join(REPO, 'design-source/context/parity/02-leads-migration-map-2026-09-24.md'), 'utf8')
      const row = map.split('\n').find((l) => l.startsWith('| `archived_at`')) ?? ''
      ok(/never `deleted_at`/.test(row) && /Archived in 1\.0/.test(row) && /lib\/port\/archived-leads\.ts/.test(row) && !/a 30-day trash/.test(row), 'map 02’s archived_at row: Lost with “Archived in 1.0”, never deleted_at, the mapper named')
    }

    // ── 1 · M2: Settings says where your own settings are ──────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Settings › every module’s head: Your profile, for every role')
      for (const [who, role] of [['dane', 'Owner'], ['germaine', 'Designer'], ['priya', 'Accounting'], ['nurul', 'Marketing']]) {
        as(who)
        const ctx = await b.newContext(opts()); const p = await page(ctx, `m2-${who}`)
        await go(p, '/settings')
        const line = p.getByTestId('module-yours').first()
        ok(await line.isVisible() && /Your profile/.test(await line.innerText()) /* (the calm UI build 2026-10-27, a deliberate change) B5 5-17: the Related line's link; its sentence is the link's tooltip */, `${role}: the head says “Your own details, signature and notifications:”`)
        const from = new URL(p.url()).pathname + new URL(p.url()).search
        if (who === 'dane') await shot(p, '01-settings-your-profile-1440')
        await line.getByRole('link', { name: 'Your profile' }).click()   // (the calm UI build 2026-10-27, a deliberate change) a link on the Related line
        await p.waitForURL(/\/profile/, { timeout: 15000 }).catch(() => {}); await settle(p, 1400)
        const u = new URL(p.url())
        ok(u.pathname === '/profile' && decodeURIComponent(u.searchParams.get('from') ?? '') === from, `${role}: Your profile opens with the way back (${from})`, p.url())
        const back = p.locator('a[data-kb="back"]').first()
        ok((await back.getAttribute('aria-label')) === 'Back to Settings', `${role}: Back names Settings`, await back.getAttribute('aria-label'))
        await back.click(); await p.waitForURL(/\/settings/, { timeout: 15000 }).catch(() => {}); await settle(p, 900)
        ok(new URL(p.url()).pathname + new URL(p.url()).search === from, `${role}: Back returns to the module it came from`, p.url())
        await ctx.close()
      }
      as('dane')
      for (const section of ['leads', 'notifications']) {
        const ctx = await b.newContext(opts()); const p = await page(ctx, `m2-${section}`)
        await go(p, `/settings?section=${section}`)
        ok(await p.getByTestId('module-yours').count() === 1, `Settings › ${section}: the line is in its head too`)   // (the calm UI build 2026-10-27, a deliberate change) the module's last line (the Related line)
        await ctx.close()
      }
      /* (the calm UI build 2026-10-27, a deliberate change) B5 5-17: the doors are the module's Related line at its end (below the ghost's first cards) — the head draws no door rows now */
      { const cs = await b.newContext(opts()); const ps = await page(cs, 'm2-related'); await go(ps, '/settings?section=leads'); ok(await ps.getByTestId('module-related').count() === 1, 'the page draws its one Related line'); await cs.close() }
      const m = await measure(b, opts(), '/settings?section=leads', ['settings.moduleLinks'])
      ok(!m.none && !(m.words ?? []).some((w) => /Your own details/.test(w)), 'the ghost’s line is the page’s own words', m.words)
      const ph = await b.newContext(phoneOpts()); const q = await page(ph, 'm2-390')
      await go(q, '/settings?section=leads', 1800)
      await q.getByTestId('module-yours').first().scrollIntoViewIfNeeded()
      ok(await q.getByTestId('module-yours').first().isVisible() && await sideways(q) <= 0, '390: the line wraps inside the page, no sideways scroll', `${await sideways(q)}px`)
      await shot(q, '02-settings-your-profile-390')
      await ph.close()
    }

    // ── 2 · M3: Tasks points to the approvals on the Dashboard ─────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Tasks › the approvals line')
      as('dane')
      const ctx = await b.newContext(opts()); const p = await page(ctx, 'm3-dane')
      await go(p, '/dashboard', 1800)
      /* (Dashboard redesign 2026-10-26, a deliberate change) Needs you's approvals are its Your OK chip — the group label became a filter chip (lane D2) */
      /* (the calm UI build 2026-10-27, a deliberate change) 1-03: approvals have one home — the Dashboard's Approvals tab and its Review pane. The Tasks page's line pointing there went
         (its ghost too); the same rule read now: the Dashboard counts them, Tasks carries no line, at every width and for every role */
      const okLabel = (await p.getByTestId('needs-chips').innerText().catch(() => '')).replace(/\s+/g, ' ')
      const n = Number((okLabel.match(/(?:To approve|Approvals) (\d+)/) ?? [])[1] ?? 0)
      ok(n > 0, `Dane’s Dashboard: Approvals ${n}`)
      await go(p, '/tasks', 1800)
      ok(await p.getByTestId('tasks-approvals').count() === 0 && await p.getByTestId('tasks-approvals-door').count() === 0, 'Tasks carries no approvals line — the Dashboard is their one home')
      await shot(p, '03-tasks-approvals-1440')
      await ctx.close()
      const m = await measure(b, opts(), '/tasks', ['approvals-line.line', 'approvals-line.text', 'approvals-line.door'])
      const rows = m.rows ?? []
      ok(m.none || rows.every((r) => r.ghost === 0 && r.page === 0), 'the reveal’s ghost draws no line either', rows)
      for (const [who, role] of [['germaine', 'Designer'], ['priya', 'Accounting'], ['nurul', 'Marketing']]) {
        as(who)
        const c2 = await b.newContext(opts()); const q = await page(c2, `m3-${who}`)
        await go(q, '/dashboard', 1500)
        const has = await q.getByTestId('needs-ok').count()
        await go(q, '/tasks', 1500)
        ok(has === 0 && await q.getByTestId('tasks-approvals').count() === 0, `${role}: nothing waits for their OK — no line`)
        await c2.close()
      }
      as('dane')
      const ph = await b.newContext(phoneOpts()); const q = await page(ph, 'm3-390')
      await go(q, '/tasks', 1800)
      ok(await q.getByTestId('tasks-approvals').count() === 0 && await sideways(q) <= 0, '390: no line, and the page fits the phone', `${await sideways(q)}px`)
      await shot(q, '04-tasks-approvals-390')
      await ph.close()
    }

    // ── 3 · H2: the Leads item counts the new leads ───────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · The Leads item: the leads nobody has opened yet')
      as('dane')
      const n = unseenFor('')
      ok(n >= 2, `the demo has new leads nobody has opened (${n})`)
      const ctx = await b.newContext(opts()); const p = await page(ctx, 'h2-dane')
      await go(p, '/tasks', 1500)
      /* (the calm UI build 2026-10-27, a deliberate change) 1-04 · T-07: the rail's Leads wears no count — the leads nobody opened are the listing's own "Not opened yet" scope
         (and the Dashboard's rows) — so the same rule is read there: the scope holds the n, by Who sees leads, and opening one takes it out */
      const unseenShown = async (pg) => { await go(pg, '/leads?scope=unseen', 1500); return pg.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').count() }
      const link = railLeads(p)
      ok((await link.getAttribute('aria-label')) === 'Leads' && (await link.getAttribute('href')) === '/leads', 'the rail: Leads is a plain destination (no count)', [await link.getAttribute('aria-label'), await link.getAttribute('href')])
      ok(await link.locator('[class*="app-rail-module__"][class*="__badge"]').count() === 0, 'no badge on it')
      await p.locator('nav[aria-label="Workspace"]').screenshot({ path: path.join(dir, '05-rail-leads-count-1440.png') })
      const shown = await unseenShown(p)
      ok(shown === n, `the listing’s Not opened yet scope holds the ${n} nobody opened`, `${shown} rows`)
      await ctx.close()
      /* Germaine (Designer), Nurul (Marketing), Priya (Accounting) — and Who sees leads */
      for (const [who, role, expect] of [['germaine', 'Designer', n], ['nurul', 'Marketing', n]]) {
        as(who); const c2 = await b.newContext(opts()); const q = await page(c2, `h2-${who}`)
        await go(q, '/tasks', 1300)
        ok(await unseenShown(q) === expect, `${role} (everyone sees every lead): Not opened yet · ${expect}`)   // (the calm UI build 2026-10-27, a deliberate change) 1-04: the scope, not the rail
        await c2.close()
      }
      as('priya'); { const c2 = await b.newContext(opts()); const q = await page(c2, 'h2-priya'); await go(q, '/tasks', 1300); ok(await railLeads(q).count() === 0, 'Accounting: no Leads item, no count'); await c2.close() }
      sql(`insert into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now')) on conflict(key) do update set value = excluded.value`)
      for (const [who, role] of [['germaine', 'Designer'], ['michelle', 'Designer']]) {
        const sees = unseenFor(`exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = '${who}')`)
        as(who); const c2 = await b.newContext(opts()); const q = await page(c2, `h2-${who}-assigned`)
        await go(q, '/tasks', 1300)
        const label = String(await unseenShown(q))   // (the calm UI build 2026-10-27, a deliberate change) 1-04: the scope, not the rail
        ok(label === String(sees), `Only the leads assigned to them: ${role} ${who} counts the ${sees} they see`, label)
        await c2.close()
      }
      if (vis0) sql(`update settings set value = '${vis0}' where key = 'lead_visibility'`); else sql(`delete from settings where key = 'lead_visibility'`)
      /* the phone's dock */
      as('dane')
      const ph = await b.newContext(phoneOpts()); const q = await page(ph, 'h2-390')
      await go(q, '/tasks', 1500)
      const dock = dockLeads(q)
      /* (the calm UI build 2026-10-27, a deliberate change) 1-04: as the rail — no count, its name "Leads" (the dock's link names itself by its
         words, the rail's by its label: one accessible name), landing on the plain listing, no mark drawn */
      const dockName = await q.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Leads', exact: true }).count()
      ok(dockName === 1 && (await dock.getAttribute('href')) === '/leads' && await dock.locator('[class*="__dockBadge"], [class*="__dockDot"], [class*="__dockQuiet"]').count() === 0, 'the phone’s dock: the same count, words and landing', [dockName, await dock.getAttribute('aria-label'), await dock.getAttribute('href')])
      await q.locator('nav[aria-label="Primary"]').screenshot({ path: path.join(dir, '06-dock-leads-count-390.png') })
      await ph.close()
      /* opening clears it: from anywhere (the lead's own address), then from the listing */
      const c3 = await b.newContext(opts()); const r = await page(c3, 'h2-open')
      await go(r, `/leads/${CHLOE}`, 2500)
      ok(sql(`select seen_at is not null from leads where id = '${CHLOE}'`) === '1', 'opening a new lead from its address marks it opened')
      await go(r, '/tasks', 1300)
      ok(await unseenShown(r) === n - 1, `…and the count follows: Not opened yet · ${n - 1}`)   // (the calm UI build 2026-10-27, a deliberate change) 1-04: the scope, not the rail
      await go(r, '/leads?scope=unseen', 1500)
      await r.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').filter({ hasText: 'Rahul Menon' }).first().locator('[role="cell"]').nth(1).click()
      await r.waitForURL(new RegExp(`/leads/${RAHUL}`), { timeout: 15000 }).catch(() => {}); await settle(r, 2000)
      ok(sql(`select seen_at is not null from leads where id = '${RAHUL}'`) === '1', 'a press on the listing’s row marks it opened (the band’s own rule)')
      await go(r, '/tasks', 1300)
      const after = unseenFor('')
      ok(after === n - 2 && await unseenShown(r) === after && (await railLeads(r).getAttribute('aria-label')) === 'Leads' && (await railLeads(r).getAttribute('href')) === '/leads', `with none left the item is plain Leads again, landing on the listing (${after} left)`)   // (the calm UI build 2026-10-27, a deliberate change) 1-04: the scope counts, the rail stays plain
      await c3.close()
      sql(`update leads set seen_at = NULL where id in ('${CHLOE}', '${RAHUL}')`)
    }

    // ── 4 · H4: District, the mail link, the number, Upcoming ──────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Small habits back: District search, the mail link, Upcoming')
      as('dane')
      const ctx = await b.newContext(opts()); const p = await page(ctx, 'h4')
      await go(p, '/leads', 1600)
      /* Lim Wei Ling: District North East; nothing else on her row says "east" (her address is Punggol Northshore) — only the District finds her */
      const district = sql(`select area from leads where id = '${WEILING}'`)
      await p.fill('input[aria-label="Search leads"]', district); await settle(p, 900)
      const rows = await p.locator('[role="table"][aria-label="Leads"] [role="row"][data-kb-row]').allInnerTexts()
      const inDistrict = num(`select count(*) from leads where deleted_at is null and direct = 0 and area = '${district}'`)
      ok(district === 'North East' && rows.some((t) => t.includes('Lim Wei Ling')) && rows.length >= inDistrict, `the listing’s search finds a lead by its District “${district}” (${rows.length} row(s)) — the District column needn’t be on`)
      await p.fill('input[aria-label="Search leads"]', ''); await settle(p, 400)
      await go(p, `/leads/${KELVIN}`, 2000)
      const email = sql(`select email from leads where id = '${KELVIN}'`)
      const mail = p.getByTestId('lead-email-link')
      ok((await mail.getAttribute('href')) === `mailto:${email}` && (await mail.innerText()).trim() === email, 'the lead’s email is a mail link, at a desk too')
      ok(await p.getByRole('button', { name: 'Copy email' }).first().isVisible(), '…and Copy stays beside it')
      ok(await p.locator('aside[aria-label="Lead info"] a[href^="tel:"]').count() === 0 && await p.getByRole('button', { name: 'Copy phone number' }).first().isVisible(), 'a desk keeps REG-746’s number: plain text and Copy (a mouse can’t dial)')
      { const e = await mail.boundingBox(); if (e) await p.screenshot({ path: path.join(dir, '07-info-column-mail-1440.png'), clip: { x: Math.max(0, e.x - 24), y: Math.max(0, e.y - 76), width: 380, height: 124 } }) }
      /* Upcoming — 1.0's Due › Upcoming: open, due after today; My Tasks', where Unassigned isn't */
      const t = new Date(); t.setHours(0, 0, 0, 0); const tomorrow = Math.floor(t.getTime() / 1000) + DAY_S
      const mine = num(`select count(distinct t.id) from lead_tasks t join task_assignees a on a.task_id = t.id where a.member_id = 'dane' and t.done = 0 and t.due_at >= ${tomorrow}`)
      await go(p, '/tasks?scope=mine', 1800)
      const chip = p.getByTestId('task-todos').getByRole('button', { name: /^Upcoming · / })
      ok(await chip.count() === 1 && (await chip.getAttribute('aria-pressed')) === 'false', 'My Tasks: an Upcoming chip beside Overdue · Due today')
      const label = (await chip.innerText()).replace(/\s+/g, ' ').trim()
      ok(label.endsWith(`Upcoming · ${mine}`), `…counting Dane’s open tasks due after today (${mine})`, label)
      await chip.click(); await settle(p, 800)
      const listed = await p.locator('[data-kb-row]').count()
      ok((await chip.getAttribute('aria-pressed')) === 'true' && listed === mine, `a press narrows the list to them (${listed} rows)`)
      await p.getByTestId('task-todos').screenshot({ path: path.join(dir, '08-upcoming-chip-1440.png') })
      await go(p, '/tasks', 1500)
      const chipsAll = (await p.getByTestId('task-todos').innerText().catch(() => '')).replace(/\s+/g, ' ')
      ok(!/Upcoming/.test(chipsAll) && /Unassigned/.test(chipsAll), 'All Tasks keeps Overdue · Due today · Unassigned — never four in one row', chipsAll)
      await go(p, '/tasks?due=upcoming', 1800)
      ok(/My tasks/.test(await p.getByRole('button', { name: /^My tasks/ }).first().innerText().catch(() => '')) && (await p.getByTestId('task-todos').getByRole('button', { name: /^Upcoming · / }).getAttribute('aria-pressed')) === 'true', '?due=upcoming lands on My Tasks with Upcoming on')
      /* the row never overflows: four words don't fit beside an open rail — the chips say their glyph and count, as on a tablet */
      await ctx.close()
      const c2 = await b.newContext(opts()); await c2.addInitScript(() => { try { localStorage.setItem('om.rail.expanded', '1') } catch {} })
      const q = await page(c2, 'h4-rail-open')
      await go(q, '/tasks', 1800)
      const fits = await q.evaluate(() => { const bar = document.querySelector('[data-testid="task-todos"]')?.parentElement; return bar ? bar.scrollWidth - bar.clientWidth : -1 })
      const compact = await q.getByTestId('task-todos').locator('button[data-compact]').count()
      /* (the calm UI build 2026-10-27, a deliberate change — 1-06 · 1-26) the Leads · Projects switch left the row for the scope's menu, so beside
         an open rail the three chips fit WITH their words; they still fold to glyph-and-count only when they don't (the rule is measured, never
         guessed) — the row never runs under the search either way */
      ok(fits <= 1, `an open rail at 1440: the chips never run under the search (${compact} compact, ${fits}px over)`)
      if (compact >= 1) {
        await q.getByTestId('task-todos').locator('button').first().hover(); await settle(q, 700)
        ok(/Overdue · \d+/.test(await q.locator('[role="tooltip"]').first().innerText().catch(() => '')), '…each folded chip keeps its words in its tooltip')
      } else ok(/Overdue · \d+/.test(await q.getByTestId('task-todos').locator('button').first().innerText()), '…each chip says its words in the row')
      await c2.close()
      const ph = await b.newContext(phoneOpts()); const m = await page(ph, 'h4-390')
      await go(m, `/leads/${KELVIN}`, 2200)
      const phone = sql(`select phone from leads where id = '${KELVIN}'`)
      ok(await m.locator(`a[href="tel:+65${phone}"]`).count() >= 1 && await m.locator(`a[href="mailto:${email}"]`).count() >= 1, '390 touch: the number dials (REG-746), the email writes')
      ok(await sideways(m) <= 0, '390: the lead’s identity block fits', `${await sideways(m)}px`)
      await shot(m, '09-lead-contact-390')
      await go(m, '/tasks?scope=mine', 1800)
      ok(await m.getByTestId('task-todos').getByRole('button', { name: /^Upcoming · / }).count() === 1 && await sideways(m) <= 0, '390: My Tasks’ chips with Upcoming, no sideways scroll')
      await shot(m, '10-tasks-upcoming-390')
      await ph.close()
    }

    // ── 5 · R1: Deleted Leads' 30 days, kept ───────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Deleted Leads removes for good after 30 days — and never what a project keeps')
      const n0 = nowS()
      const lead = (id, daysAgo) => sql(`insert into leads (id, name, phone, source, property_type, stage, created_at, updated_at, deleted_at, delete_reason, stage_before_delete, budget_minor) values ('${id}', 'Probe ${id}', '9333${String(daysAgo).padStart(4, '0')}', 'Others', 'HDB 4-Room', 'New', ${n0 - 60 * DAY_S}, ${n0 - daysAgo * DAY_S}, ${n0 - daysAgo * DAY_S}, 'Spam', 'New', 0)`)
      lead('probe-s46c-31', 31); lead('probe-s46c-29', 29)
      sql(`insert into lead_tasks (id, lead_id, title, kind, done, created_at, updated_at) values ('probe-s46c-task', 'probe-s46c-31', 'Probe task', 'General', 0, ${n0 - 40 * DAY_S}, ${n0 - 40 * DAY_S})`)
      sql(`insert into stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) values ('probe-s46c-log', 'probe-s46c-31', 'New', 'Contacted', '{}', ${n0 - 45 * DAY_S})`)
      const ben0 = sql(`select coalesce(deleted_at, 'null') from leads where id = '${BEN_LEAD}'`)
      sql(`update leads set deleted_at = ${n0 - 40 * DAY_S}, delete_reason = 'Spam', stage_before_delete = stage where id = '${BEN_LEAD}'`)
      const projects0 = num(`select count(*) from projects`)
      if (CRON) {
        const api = await b.newContext()
        const H = { headers: { Authorization: `Bearer ${CRON}` } }
        ok((await api.request.get(BASE + '/api/cron/deleted-leads')).status() === 401, 'the job asks the scheduler’s secret')
        const r1 = await (await api.request.get(BASE + '/api/cron/deleted-leads', H)).json()
        ok(r1.ok && r1.jobs?.['deleted-leads']?.ran === 1, `/api/cron/deleted-leads removes the one past its 30 days (${r1.jobs?.['deleted-leads']?.ran})`, r1)
        ok(num(`select count(*) from leads where id = 'probe-s46c-31'`) === 0 && num(`select count(*) from lead_tasks where id = 'probe-s46c-task'`) === 0 && num(`select count(*) from stage_logs where id = 'probe-s46c-log'`) === 0, 'deleted 31 days ago: gone, with its task and stage log (Delete Forever’s removal)')
        ok(num(`select count(*) from leads where id = 'probe-s46c-29'`) === 1, 'deleted 29 days ago: stays')
        ok(num(`select count(*) from leads where id = '${BEN_LEAD}'`) === 1 && num(`select count(*) from projects`) === projects0, 'deleted 40 days ago but its project lives: stays, and the project with it')
        const r2 = await (await api.request.post(BASE + '/api/cron/deleted-leads', H)).json()
        ok(r2.jobs?.['deleted-leads']?.ran === 0, 'a second run removes nothing (idempotent)', r2)
        const all = await (await api.request.get(BASE + '/api/cron/run', H)).json()
        ok('deleted-leads' in (all.jobs ?? {}), 'the five-minute run includes it')
        await api.close()
      } else console.log('  (no CRON secret given — the sweep’s address is left; the read below still runs the purge)')
      /* the read: Deleted Leads purges before it lists */
      lead('probe-s46c-35', 35)
      if (!CRON) lead('probe-s46c-31b', 31)
      as('dane')
      const ctx = await b.newContext(opts()); const p = await page(ctx, 'r1')
      await go(p, '/leads', 1800)
      ok(num(`select count(*) from leads where id in ('probe-s46c-35', 'probe-s46c-31b')`) === 0, 'opening the listing (it reads Deleted Leads) removes a lead past its 30 days — no scheduler needed')
      ok(num(`select count(*) from leads where id = 'probe-s46c-29'`) === 1 && num(`select count(*) from leads where id = '${BEN_LEAD}'`) === 1, '…and keeps the one inside them and the one a project keeps')
      await p.locator('button[aria-label="More options"]:visible').first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Deleted Leads' }).first().click(); await settle(p, 900)
      const sheet = p.locator('[role="dialog"][aria-label="Deleted leads"]')   // (the calm UI build 2026-10-27, a deliberate change) sentence case
      ok(/Deleted leads are removed for good after 30 days\./.test(await sheet.innerText()), 'the sheet’s promise stands, now true')   // (the calm UI build 2026-10-27, a deliberate change — 2-31) plainer words
      ok(await sheet.locator('[role="row"]').filter({ hasText: 'Probe probe-s46c-29' }).count() === 1, 'the lead inside its 30 days is listed')
      const old = num(`select count(*) from leads where deleted_at is not null and direct = 0 and deleted_at < strftime('%s','now') - 30 * 86400 and id not in (select lead_id from projects)`)
      ok(old === 0, 'nothing the sheet lists is past its 30 days unless a project keeps it')
      await shot(p, '11-deleted-leads-1440')
      await ctx.close()
      sql(`delete from leads where id like 'probe-s46c-%'`)
      sql(`update leads set deleted_at = ${ben0 === 'null' ? 'NULL' : ben0}, delete_reason = NULL, stage = coalesce(stage_before_delete, stage), stage_before_delete = NULL where id = '${BEN_LEAD}'`)
      /* the demo's own deleted leads: inside the 30 days on any restore (R176) */
      const demoOld = num(`select count(*) from leads where deleted_at is not null and direct = 0 and deleted_at < strftime('%s','now') - 30 * 86400`)
      ok(demoOld === 0, 'the demo’s deleted leads all sit inside the 30 days (repair R176)')
    }

    // ── 6 · Widths ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · 320 and 768 touch')
      as('dane')
      for (const [w, h] of [[320, 640], [768, 1024]]) {
        const ph = await b.newContext(phoneOpts(w, h)); const m = await page(ph, `w${w}`)
        for (const url of ['/tasks', '/settings?section=leads', `/leads/${KELVIN}`]) {
          await go(m, url, 1500)
          ok(await sideways(m) <= 0, `${w} touch ${url}: no sideways scroll`, `${await sideways(m)}px`)
        }
        if (w === 768) await shot(m, '12-lead-contact-768-touch')
        await ph.close()
      }
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe threw —', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)
  } finally {
    as('dane')
    try {
      if (vis0) sql(`update settings set value = '${vis0}' where key = 'lead_visibility'`); else sql(`delete from settings where key = 'lead_visibility'`)
      for (const line of seen0.split('\n').filter(Boolean)) { const [id] = line.split('='); sql(`update leads set seen_at = NULL where id = '${id}'`) }
      sql(`delete from leads where id like 'probe-s46c-%'`)
    } catch (e) { console.log('  (cleanup)', String(e).slice(0, 200)) }
    ok(errors.length === 0, 'no page errors', errors.slice(0, 6))
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
