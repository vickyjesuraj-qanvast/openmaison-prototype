// The Dashboard redesigned (2026-10-26) · lane D1 — the frame, Since and Pulse (his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY:
// every proposal Build, every question as recommended, and his note "the CTAs are too much to the eyes because of primary color"). The
// contract: design-source/context/dashboard-redesign-2026-10-26/brief.md § 5 D1. **Restated for the calm pass (2026-10-26 — lane C1, his "data
// looks fine … visually it looks too busy", the Claude Design option he took and his six corrections, brief-calm.md):** every changed
// assertion is commented "(the calm pass 2026-10-26, a deliberate change)". Each item asserted as the rule it builds, by real presses:
//  - the front door: `/` lands every role on the Dashboard — Accounting's too (Q-08), the Finance door kept in their rail (Company)
//  - the greeting is the title by the studio's clock (Asia/Singapore), its ONE line the studio's date, what needs you in ink and what is new
//    since the mark as the line's one link (the calm pass: no row of chips)
//  - Since you were last here (P-02): the news is the records after the member's mark (R177: Dane's Friday 6 PM), each opening exactly that —
//    one piece its own sentence, several "n new since Friday" opening their list, a piece of several listing its records; an opened piece leaves
//    the line for this browser and stays gone on a reload, a fresh browser shows it again; the mark moves only once the page has drawn, a reload
//    keeps the sitting's mark, a gap past two hours starts a new sitting; a first visit counts this week
//  - Pulse (P-03 · Q-04 · the calm pass): each role's figures in order (P-11 — an Owner's four: Won · Owed to you · Profit · First response), white
//    cards with no border, one caption line and at most one quiet visual (a thin line, or Owed's age bar — its over-60 part amber, never red);
//    each press its report with ?from=/dashboard (and the report's own figure), First response red only when the report grades it Slow; a resting
//    mouse breaks a figure down (its rows add up to it), ↓ on a focused one too, a long press on a phone
//  - § 2 the quiet: at rest no element on the page wears the filled primary
//  - Studio / Mine (Q-07): an Owner's switch as a grey track, remembered on the record and in the address, Mine reading their own; no switch for
//    a Designer
//  - hide a card for yourself (Q-06): the page's ⋮ › Cards on your page, with Undo; kept on the record (a reload, the loader's seed); Show all cards
//  - every width (brief § 3): two stacks at a desk and a tablet held sideways, one column in reading order upright / on a phone / a phone held
//    sideways (a phone reads Needs you before Pulse); Pulse in one row at a desk and held sideways, two across upright and on a phone; 14px
//    lines on touch; no sideways scroll at 320 and 844 × 390
//  - the calm measure (brief-calm.md): the page is the grey surface, each region a white card with no border and no shadow, the cards 24 apart
//    and 24 inside at a desk (`--dash-gap` · `--dash-card-pad`); the greeting and Pulse at the target's measures (words, boxes, controls,
//    sizes, colours, tints, uppercase only on Pulse's labels)
//  - the ghost (REG-708): the held reveal's slots are the page's, its Pulse the page's figures, the greeting and Pulse as tall as the page's
//  - the speed (P-14): the shell and the ghost reach the browser before the page's reads end (the first answer)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3251 NODE_PATH=<repo>/node_modules node verify-dash-d1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/dashboard-2026-10-26/d1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3221'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const note = (s) => console.log('  ·', s)
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

/* the studio's clock (lib/dashboard/frame.ts STUDIO_TZ) */
const TZ = 'Asia/Singapore'
const sgt = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]))
const greetingNow = () => { const h = Number(sgt(Date.now()).hour) % 24; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const studioDate = () => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(new Date()).replace(',', '')
/* R177's moment: the Friday before the demo day at 6 PM in Singapore, as seconds */
const lastFriday = () => { const p = sgt(Date.now()); const w = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(p.weekday); const back = ((w - 5 + 7) % 7) || 7; return Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - back, 10, 0, 0) / 1000) }
const dayOfSgt = (sec) => { const p = sgt(sec * 1000); return Math.round(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86_400_000) }
const sinceWordsFor = (sec) => { const gap = dayOfSgt(Math.floor(Date.now() / 1000)) - dayOfSgt(sec); return gap <= 0 ? null : gap === 1 ? 'since yesterday' : gap < 7 ? `since ${sgt(sec * 1000).weekday}` : null }
/* the Leads listing's "Last 7 days" (lib/leads/filters.ts — the server's own calendar, this machine's) */
const weekFrom = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.floor((d.getTime() - 6 * 86_400_000) / 1000) }
const compactOf = (minor) => { const n = Math.abs(minor) / 100; const t = (x) => x.toFixed(1).replace(/\.0$/, ''); const s = n >= 1e6 ? `S$ ${t(n / 1e6)}M` : n >= 1e3 ? `S$ ${t(n / 1e3)}K` : `S$ ${Math.round(n).toLocaleString('en-SG')}`; return minor < 0 ? `−${s}` : s }
const minorOf = (s) => { const neg = /^[−-]/.test(String(s).trim()); const n = Number(String(s).replace(/[^0-9.]/g, '')); return (neg ? -1 : 1) * Math.round(n * 100) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ctxOf = (w = 1440, h = 1024, touch = false) => b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}), reducedMotion: 'reduce' })
  const watch = (p, tag) => { p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.locator('[data-testid="dashboard"]').first().waitFor({ timeout: 15000 }).catch(() => {}); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const text = async (l) => ((await l.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
  const snack = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const figures = (p) => p.locator('[data-testid="dashboard"] [data-testid^="figure-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('figure-', '')))
  const slots = (p, root = '[data-testid="dashboard"]') => p.evaluate((root) => {
    const el = document.querySelector(root); if (!el) return []
    return [...el.querySelectorAll('[data-slot]')].filter((s) => s.offsetParent !== null && s.getBoundingClientRect().height > 0).map((s) => { const r = s.getBoundingClientRect(); return { k: s.getAttribute('data-slot'), x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width) } })
  }, root)

  /* (the calm pass 2026-10-26, a deliberate change — his correction 4) Since you were last here is the greeting line's ONE link: one piece of news
     (`data-since-kind` = its kind) or several ('many', "n new since Friday", opening the list of all of it) */
  const linkKind = async (p) => ((await p.getByTestId('since').count()) ? p.getByTestId('since').getAttribute('data-since-kind') : null)
  const openNews = async (p) => { await p.getByTestId('since-link').click(); await settle(p, 500) }
  const closeNews = async (p) => { await p.keyboard.press('Escape'); await settle(p, 300) }
  const newsKinds = async (p) => {
    const k = await linkKind(p)
    if (!k) return []
    if (k !== 'many') return [k]
    await openNews(p)
    const kinds = await p.locator('[data-since-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('since-', '')))
    await closeNews(p)
    return kinds
  }
  const newsCount = async (p) => {
    await openNews(p)
    const n = (await p.locator('[data-since-key]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-count') || 1)))).reduce((s, x) => s + x, 0)
    await closeNews(p)
    return n
  }
  /* open one piece: the link itself when it is the only one with nothing to list; else its row (or its first record) in the list */
  const pressNews = async (p, kind) => {
    const k = await linkKind(p)
    await openNews(p)
    if (k === kind) {
      const first = p.getByTestId('since-item').first()
      if (await first.count()) await first.locator('[role="menuitem"]').click()
      return
    }
    const row = p.locator(`[data-testid="since-${kind}"]`).first()
    const item = row.getByTestId('since-item').first()
    if (await item.count()) await item.locator('[role="menuitem"]').click()
    else await row.locator('[role="menuitem"]').first().click()
  }

  /* the record as it was — put back in `finally` */
  const people0 = json(`select id, is_you, dashboard_seen_at as seen, dashboard_since_at as since, dashboard_prefs as prefs from members`)
  /* …and what the presses stamp on the way: a lead opened is seen (its band clears), a conversation opened is read */
  const seen0 = json(`select id, seen_at from leads`)
  const reads0 = json(`select reader_kind, reader_id, project_id, read_at from chat_reads`)
  const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
  const FRI = lastFriday()
  const putMark = (id, seen, since) => sql(`update members set dashboard_seen_at = ${seen ?? 'null'}, dashboard_since_at = ${since ?? 'null'} where id = '${id}'`)

  try {
    /* ── 1 · the front door, every role ── */
    console.log('1 · the front door — the Dashboard for every role (Q-08)')
    for (const who of ['dane', 'priya', 'nurul']) {
      as(who)
      const c = await ctxOf(); const p = await c.newPage(); watch(p, `door-${who}`)
      await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await settle(p, 1200)
      ok(new URL(p.url()).pathname === '/dashboard', `${who}: \`/\` lands on the Dashboard (${new URL(p.url()).pathname})`)
      if (who === 'priya') {
        const rail = p.locator('nav[aria-label="Workspace"]')
        ok(await rail.locator('a[href="/dashboard"]').count() === 1 && await rail.getByRole('button', { name: /^Company/ }).count() === 1, 'priya: her rail keeps the Dashboard and Company (Finance’s door)')
        ok(JSON.stringify(await figures(p)) === JSON.stringify(['owed', 'coming', 'owe', 'gst']), `priya: the page is the books’ (${(await figures(p)).join(' · ')})`)
        ok(await p.locator('[data-slot="pipeline"], [data-slot="projects"], [data-slot="team"], [data-slot="site"]').count() === 0, 'priya: no workspace cards')
        await shot(p, '01-accounting-1440')
      }
      await c.close()
    }

    /* ── 2 · the greeting and Since you were last here (Dane, his Friday evening) ── */
    console.log('2 · the greeting and Since you were last here (P-02 · R177 · the calm pass)')
    as('dane'); putMark('dane', FRI, FRI)
    const newLeads = json(`select id, name, source, seen_at from leads where deleted_at is null and direct = 0 and created_at > ${FRI} order by created_at desc`)
    const newArticles = json(`select id from market_insights where removed_at is null and published_at > ${FRI * 1000}`)
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'since')
      const t0 = Math.floor(Date.now() / 1000)
      await go(p, '/dashboard', 1800)
      const title = await text(p.getByTestId('greeting-title')), line = await text(p.getByTestId('greeting-line'))
      ok(title === `${greetingNow()}, Dane`, `the title greets by the studio’s clock (${title})`)
      ok(line.startsWith(studioDate()), `its line opens with the studio’s date (${line})`)
      /* (the calm UI build 2026-10-27, a deliberate change) the count is said once, in the card's head; the line keeps it for a screen reader — "n need your attention" */
      ok(/(\d+ need your attention|1 needs your attention|You’re all caught up)/.test(await p.getByTestId('greeting-needs').textContent()), 'and says what needs your attention — to a screen reader (the card\'s head shows the count)')
      /* (the calm pass 2026-10-26, a deliberate change — his correction 4) no row of chips: the news is the line's ONE link */
      ok(await p.locator('[data-slot="since"]').count() === 0 && await p.getByTestId('since-link').count() <= 1, 'no row of chips — the news is the line’s one link')
      const words = sinceWordsFor(FRI)
      if (newLeads.length + newArticles.length && words) {
        const kind = await linkKind(p), lt = await text(p.getByTestId('since-link'))
        ok(kind === 'many' ? lt === `${await newsCount(p)} new ${words}` : !!kind && lt.length > 0, `…what is new ${words}: “${lt}”`, `kind ${kind}`)
      }
      /* the mark moves once the page has drawn: a new sitting (Friday's view is past two hours) counts from Friday */
      await settle(p, 800)
      const m1 = json(`select dashboard_seen_at as seen, dashboard_since_at as since from members where id = 'dane'`)[0]
      ok(m1 && m1.seen >= t0 - 5 && m1.since === FRI, `the visit is marked after the page drew — latest view now, the sitting from Friday (${m1 && m1.seen - t0}s · ${m1 && m1.since === FRI})`)
      if (newLeads.length) {
        const kinds = await newsKinds(p)
        ok(kinds.includes('leads'), `the leads since Friday are news (${kinds.join(' · ')})`)
        const one = newLeads.length === 1
        if ((await linkKind(p)) === 'leads' && one) {
          ok(/New lead/.test(await text(p.getByTestId('since-link'))), 'one new lead is its own sentence')
          await p.getByTestId('since-link').click()
        } else {
          await openNews(p)
          const group = p.getByTestId('since-leads')
          const gt = await text(group)
          /* the list's title is the house menu label (small capitals): read without case */
          ok(one ? /New lead/i.test(gt) : gt.toLowerCase().includes(`${newLeads.length} new leads`), `the leads piece counts the leads since Friday (${newLeads.length}: “${gt.slice(0, 60)}”)`)
          if (!one) {
            const items = p.getByTestId('since-item')
            const names = await items.allInnerTexts()
            ok(names.length === Math.min(6, newLeads.length) && newLeads.slice(0, 6).every((l, i) => (names[i] ?? '').includes(l.name)), `pressed, it lists them, newest first (${names.map((n) => n.split('\n')[0]).join(' · ')})`)
            await shot(p, '02-since-list-1440')
            await items.first().locator('[role="menuitem"]').first().click()
          } else await group.locator('[role="menuitem"]').first().click()
        }
        await p.waitForURL(/\/leads\/[^/?]+/, { timeout: 10000 }).catch(() => {}); await settle(p, 900)
        ok(new RegExp(`/leads/${newLeads[0].id}`).test(p.url()) && /[?&]from=%2Fdashboard/.test(p.url()), 'a lead opens exactly that lead, with the way back', p.url())
        await go(p, '/dashboard', 1500)
        ok(!(await newsKinds(p)).includes('leads'), 'back on the page, the opened piece has left the line')
        await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1500)
        ok(!(await newsKinds(p)).includes('leads'), '…and stays gone on a reload (this browser)')
        const m2 = json(`select dashboard_since_at as since from members where id = 'dane'`)[0]
        ok(m2.since === FRI, 'a reload in the same sitting keeps the mark')
        const c2 = await ctxOf(); const p2 = await c2.newPage(); watch(p2, 'since-2')
        await go(p2, '/dashboard', 1500)
        ok((await newsKinds(p2)).includes('leads'), 'another browser still shows it (an opened piece is per browser, never the studio’s)')
        await c2.close()
      } else note('no lead arrived after Friday 6 PM on this copy — the leads have nothing to say')
      if (newArticles.length === 1) {
        /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-18) Since names the studio's own events only: a Market Insights article
           is Tools' (Market Insights keeps it) and never fills the greeting, so it is not news here */
        ok(!(await newsKinds(p)).includes('article'), 'a new Market Insights article is not the studio’s news (Tools › Market Insights keeps it)')
      }
      await c.close()
    }
    /* every kind of news (P-02): the demo's records moved into the window for a moment — a client's opens and a confirmation, a contract
       signed online (and one the viewer marked himself, which is never news to him), a client's payment, a teammate's site update, a client's
       message and ticket — each a piece of its own, in the list's order, each opening its record; all put back after */
    {
      const now = Math.floor(Date.now() / 1000)
      const Q7 = json(`select id, client_last_viewed_at a, client_view_count n from quotes where number = 'OM-10007' and kind = 'quote' limit 1`)[0]
      const VO = json(`select q.id, q.number, q.project_id p, q.confirmed_at c, q.confirmed_via v, l.name from quotes q join leads l on l.id = q.lead_id where q.kind = 'variation' and q.status = 'Sent to Client' and q.confirmed_at is null and q.deleted_at is null limit 1`)[0]
      const CT = json(`select c.id, c.signed_at s, c.signature_kind k, c.marked_by m, l.name from contracts c join leads l on l.id = c.lead_id where c.status = 'Signed' and c.deleted_at is null and c.marked_by = 'dane' and c.signature_kind is null limit 1`)[0]
      const PAY = json(`select p.id, p.created_at c, p.amount_minor a, l.name from project_payments p join projects j on j.id = p.project_id join leads l on l.id = j.lead_id where p.source = 'client' and p.status = 'to_confirm' limit 1`)[0]
      const UPD = json(`select u.id, u.published_at s, l.name from project_updates u join projects j on j.id = u.project_id join leads l on l.id = j.lead_id where u.status = 'published' and u.deleted_at is null and u.author_id <> 'dane' order by u.published_at desc limit 1`)[0]
      const PRJ = json(`select j.id, j.lead_id l, x.name from projects j join leads x on x.id = j.lead_id where j.deleted_at is null and j.stage = 'in_progress' limit 1`)[0]
      try {
        if (Q7) sql(`update quotes set client_last_viewed_at = ${now - 3600}, client_view_count = 3 where id = '${Q7.id}'`)
        if (VO) sql(`update quotes set confirmed_at = ${now - 5400}, confirmed_via = 'link' where id = '${VO.id}'`)
        if (CT) sql(`update contracts set signed_at = ${now - 7200} where id = '${CT.id}'`)
        if (PAY) sql(`update project_payments set created_at = ${now - 1800} where id = '${PAY.id}'`)
        if (UPD) sql(`update project_updates set published_at = ${now - 2400} where id = '${UPD.id}'`)
        if (PRJ) {
          sql(`insert into project_messages (id, project_id, lead_id, author_kind, author_name, body, created_at, channel) values ('d1probe-msg', '${PRJ.id}', '${PRJ.l}', 'client', '${PRJ.name.replace(/'/g, "''")}', 'Can we move the site visit to Thursday?', ${(now - 900) * 1000}, 'client')`)
          sql(`insert into project_tickets (id, project_id, lead_id, number, category, subject, raised_kind, raised_by_name, created_at, updated_at) values ('d1probe-tix', '${PRJ.id}', '${PRJ.l}', 'T-D1-PROBE', 'Quality of work', 'Grout cracking in the shower', 'client', '${PRJ.name.replace(/'/g, "''")}', ${(now - 600) * 1000}, ${(now - 600) * 1000})`)
        }
        putMark('dane', FRI, FRI)
        const c = await ctxOf(); const p = await c.newPage(); watch(p, 'news')
        await go(p, '/dashboard', 1800)
        /* (the calm pass 2026-10-26, a deliberate change) several pieces read "n new since Friday" — the records each piece stands for, counted once */
        ok((await linkKind(p)) === 'many' && new RegExp(`^${await newsCount(p)} new (since|this)`).test(await text(p.getByTestId('since-link'))), `several pieces: the line’s link counts them (“${await text(p.getByTestId('since-link'))}”)`)
        await openNews(p)
        const kinds = await p.locator('[data-since-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('since-', '')))
        const said = async (kind) => text(p.locator(`[data-testid="since-${kind}"]`).first())
        if (PAY) ok(kinds.includes('payment-said') && new RegExp(`${PAY.name.split(' ')[0]} says they paid S\\$ [\\d,]+ · to confirm`).test(await said('payment-said')), `a client’s “I paid” is news (${await said('payment-said')})`)
        if (VO) ok(kinds.includes('quote-confirmed') && (await said('quote-confirmed')).includes(`confirmed ${VO.number}`), `a client confirming ${VO.number} on its link is news`)
        if (CT) ok(!kinds.includes('contract-signed'), 'a contract Dane marked signed himself is never news to him')
        if (Q7) ok(kinds.includes('quote-opened') && /opened OM-10007 · 3 times/.test(await said('quote-opened')), `a client opening a quote is news (${await said('quote-opened')})`)
        if (UPD) ok(kinds.includes('site-update'), `a teammate’s site update is news (${await said('site-update')})`)
        if (PRJ) {
          ok(kinds.includes('client-message') && /A message from|messages/.test(await said('client-message')), 'a client’s message is news')
          ok(kinds.includes('ticket') && /raised T-D1-PROBE/.test(await said('ticket')), 'a client’s ticket is news')
        }
        const ORDER = ['payment-said', 'quote-confirmed', 'contract-signed', 'ticket', 'client-message', 'quote-opened', 'leads', 'site-update', 'article']
        ok(kinds.every((k, i) => i === 0 || ORDER.indexOf(kinds[i - 1]) <= ORDER.indexOf(k)), `what a client did first, then the team’s, the leads, the editors’ (${kinds.join(' · ')})`)
        await shot(p, '02-since-every-kind-1440')
        await p.keyboard.press('Escape'); await settle(p, 300)
        /* each opens exactly that — its record, or its Needs you row when that row is on the page */
        /* the address the press asked for (a page that reads `?open=` tidies its address once it has opened the record) */
        const asked = []
        p.on('request', (r) => { if (r.isNavigationRequest() || r.headers()['rsc'] === '1') asked.push(r.url()) })
        const opens = async (kind, re) => {
          await go(p, '/dashboard', 1400)
          const before = p.url(); asked.length = 0
          await pressNews(p, kind); await settle(p, 1500)
          const pulsed = await p.locator('[data-inbox-row][data-fresh]').count()
          const hit = asked.find((u) => re.test(u)) ?? (re.test(p.url()) ? p.url() : null)
          ok(!!hit || (p.url() === before && pulsed === 1), `${kind}: opens exactly that${pulsed ? ' (its Needs you row, pulsed)' : ''}`, hit ?? `${p.url()} · asked ${asked.slice(0, 3).join(' , ')}`)
        }
        if (Q7) await opens('quote-opened', new RegExp(`/quotes/${Q7.id}\\?from=%2Fdashboard`))
        if (PAY) await opens('payment-said', new RegExp(`/projects/[^/]+/money\\?open=${PAY.id}&from=%2Fdashboard`))
        if (PRJ) await opens('ticket', /\/projects\/[^/]+\/tickets\?open=d1probe-tix&from=%2Fdashboard/)
        if (PRJ) await opens('client-message', /\/chat\?open=project%3A[^&]+&from=%2Fdashboard/)
        if (CT) {
          sql(`update contracts set signature_kind = 'type' where id = '${CT.id}'`)
          await go(p, '/dashboard', 1500)
          await openNews(p)
          ok(new RegExp(`${CT.name.split(' ')[0]} signed the contract`).test(await text(p.getByTestId('since-contract-signed'))), 'a contract its client signed online is news')
          await p.keyboard.press('Escape')
        }
        await c.close()
      } finally {
        if (Q7) sql(`update quotes set client_last_viewed_at = ${Q7.a ?? 'null'}, client_view_count = ${Q7.n} where id = '${Q7.id}'`)
        if (VO) sql(`update quotes set confirmed_at = ${VO.c ?? 'null'}, confirmed_via = ${VO.v ? `'${VO.v}'` : 'null'} where id = '${VO.id}'`)
        if (CT) sql(`update contracts set signed_at = ${CT.s}, signature_kind = ${CT.k ? `'${CT.k}'` : 'null'} where id = '${CT.id}'`)
        if (PAY) sql(`update project_payments set created_at = ${PAY.c} where id = '${PAY.id}'`)
        if (UPD) sql(`update project_updates set published_at = ${UPD.s} where id = '${UPD.id}'`)
        sql(`delete from project_messages where id = 'd1probe-msg'`); sql(`delete from project_tickets where id = 'd1probe-tix'`)
      }
    }
    /* a gap past two hours starts a new sitting: the news counts from the latest view */
    {
      const threeH = Math.floor(Date.now() / 1000) - 3 * 3600
      putMark('dane', threeH, FRI)
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'sitting')
      await go(p, '/dashboard', 1800)
      const since3 = Number(sql(`select count(*) from leads where deleted_at is null and direct = 0 and created_at > ${threeH}`))
      ok((await newsKinds(p)).includes('leads') === since3 > 0, `three hours away: the news counts from the latest view (${since3} leads since)`)
      await settle(p, 600)
      ok(Number(sql(`select dashboard_since_at from members where id = 'dane'`)) === threeH, 'and the new sitting’s mark is that view')
      await c.close()
    }
    /* a first visit (Hui Min has no mark): what is new this week */
    {
      as('huimin'); putMark('huimin', null, null)
      const week = Number(sql(`select count(*) from leads where deleted_at is null and direct = 0 and created_at > strftime('%s','now') - 7 * 86400`))
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'first')
      await go(p, '/dashboard', 1800)
      /* (the calm pass 2026-10-26, a deliberate change) several pieces read "n new this week"; one piece its own sentence */
      const kind = await linkKind(p), lt = await text(p.getByTestId('since-link'))
      if (week) ok((kind === 'many' ? /^\d+ new this week$/.test(lt) : !!kind) && (await newsKinds(p)).includes('leads'), `a first visit says what is new this week (“${lt}”)`)
      await settle(p, 600)
      const m = json(`select dashboard_seen_at as seen, dashboard_since_at as since from members where id = 'huimin'`)[0]
      ok(m.seen && m.since && m.seen - m.since >= 7 * 86400 - 60, 'and its sitting counts from a week back')
      await c.close()
      as('dane')
    }
    /* ── 3 · Pulse (Dane, the Owner) ── */
    console.log('3 · Pulse — the cards, their doors, their one visual, their breakdown (P-03 · Q-04 · the calm pass)')
    putMark('dane', FRI, FRI)
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'pulse')
      await go(p, '/dashboard', 1800)
      const keys = await figures(p)
      /* (the calm pass 2026-10-26, a deliberate change — the Claude Design option he took) an Owner's four: Won · Owed to you · Profit · First response */
      ok(JSON.stringify(keys) === JSON.stringify(['sales', 'owed', 'profit', 'response']), `an Owner’s four, in order (${keys.join(' · ')})`)
      const tops = await p.locator('[data-testid^="figure-"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      ok(new Set(tops).size === 1, 'in one row at a desk')
      /* each a white card, no border, no shadow, 24 inside; 24 between them; small capitals only on its label */
      const look = await p.evaluate(() => [...document.querySelectorAll('[data-testid^="tile-"]')].map((e) => { const s = getComputedStyle(e); return { bg: s.backgroundColor, border: s.borderTopWidth, shadow: s.boxShadow, pad: s.paddingLeft, radius: s.borderTopLeftRadius } }))
      ok(look.every((x) => x.bg === 'rgb(255, 255, 255)' && (x.border === '0px') && x.shadow === 'none' && x.pad === '24px' && x.radius === '8px'), 'each figure a white card: no border, no shadow, 24 inside, the house 8 corner', JSON.stringify(look[0]))
      const gaps = await p.locator('[data-testid^="figure-"]').evaluateAll((els) => els.slice(1).map((e, i) => Math.round(e.getBoundingClientRect().left - els[i].getBoundingClientRect().right)))
      ok(gaps.every((g) => g === 24), `24 between them (${gaps.join(' · ')})`)
      /* (the calm pass) one caption line, at most one quiet visual: a thin line on Won and First response, Owed's age bar, Profit its words alone */
      const visuals = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-testid^="tile-"]')].map((e) => [e.getAttribute('data-testid').replace('tile-', ''), { spark: e.querySelectorAll('svg[class*="__spark"]').length, aging: e.querySelectorAll('[class*="__aging"][role="img"]').length, bars: e.querySelectorAll('[class*="__bar"]').length, chips: e.querySelectorAll('[class*="meta-chip"], [class*="__tileHead"]').length, lines: e.querySelectorAll('[class*="__help"]').length }])))
      const sales = await text(p.getByTestId('tile-sales'))
      ok(Object.values(visuals).every((v) => v.spark + v.aging <= 1 && v.bars === 0 && v.chips === 0 && v.lines === 1), 'every card: one caption line, at most one quiet visual, no chip, no bars', JSON.stringify(visuals))
      ok(visuals.sales.spark <= 1 && visuals.owed.spark === 0 && visuals.profit.spark + visuals.profit.aging === 0, 'Won a thin line, Owed its age bar, Profit its words alone')
      ok(/\d+ of \d+ leads? · \d+%\swin\srate|No leads added/.test(sales), `Won’s caption: of how many, the win rate (${sales.slice(0, 60)})`)
      const resp = p.getByTestId('tile-response'), respV = await text(resp.locator('[class*="__value"]'))
      const hours = /^(\d+(?:\.\d+)?)h$/.test(respV) ? Number(respV.slice(0, -1)) : /^(\d+) days?$/.test(respV) ? 48 : /^\d+m$/.test(respV) ? 0 : null
      const respRed = await resp.locator('[class*="__help"] span').evaluateAll((els) => els.some((e) => getComputedStyle(e).color === 'rgb(229, 72, 77)' || /red/.test(e.className)))
      const redInk = await p.evaluate(() => { const probe = document.createElement('span'); probe.style.color = 'var(--om-color-tertiary-red-default)'; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c })
      const amberInk = await p.evaluate(() => { const probe = document.createElement('span'); probe.style.color = 'var(--om-color-on-tertiary-yellow-variant)'; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c })
      const inkOf = (loc) => loc.evaluateAll((els) => els.map((e) => getComputedStyle(e).color))
      const respInks = await inkOf(resp.locator('[class*="__help"] span'))
      if (hours !== null) ok(respInks.includes(redInk) === hours > 24, `First response: its caption red only when the report grades it Slow — ours and late (${respV}, ${respInks.includes(redInk) ? 'red' : 'not red'})`)
      ok(/Usually .+ · aim for 8 hours|No first contact logged/.test(await text(resp)), 'First reply’s caption: the usual time and the report’s Fast mark')   // (the calm UI build 2026-10-27, a deliberate change) (was "Target 8h · median, 90 days")
      void respRed
      /* (his correction 2) Owed to you's over-60 part amber, never red — a client's lateness is theirs */
      const owedT = p.getByTestId('tile-owed')
      ok(await owedT.locator('[class*="__aging"][role="img"]').count() === 1 || /Every sent invoice is paid/.test(await text(owedT)), 'Owed to you by age')
      const owedInks = await inkOf(owedT.locator('[class*="__help"] span'))
      const bandTones = await owedT.locator('[class*="__agingBand"]').evaluateAll((els) => els.map((e) => ({ tone: e.getAttribute('data-tone'), bg: getComputedStyle(e).backgroundColor })))
      ok(!owedInks.includes(redInk) && bandTones.every((b) => b.tone !== 'late'), 'Owed to you is never red — a client’s lateness is theirs')
      const over60 = /over 60\sdays/.test(await text(owedT))
      ok(over60 === owedInks.includes(amberInk), `its over-60 words amber exactly when there are some (${over60 ? 'some' : 'none'} over 60 days)`)
      /* Profit names its month, and says when its costs are not in yet in its words (no chip) */
      const month = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: TZ }).format(new Date())
      ok((await text(p.getByTestId('tile-profit').locator('[class*="__label"]'))).toLowerCase() === `profit in ${month}`.toLowerCase(), `Profit names its month (Profit in ${month})`)   // (the calm UI build 2026-10-27, a deliberate change)
      /* § 2 — the quiet: nothing on the page at rest wears the filled primary */
      const loud = await p.evaluate(() => [...document.querySelectorAll('[data-testid="dashboard"] *')].filter((e) => getComputedStyle(e).backgroundColor === 'rgb(85, 0, 255)' && e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)}`))
      ok(loud.length === 0, `§ 2: no filled primary on the page at rest (${loud.length})`, loud.slice(0, 4).join(' · '))
      /* red in Pulse only for what is ours and late (First response Slow, what the studio owes past due) */
      const reds = await p.locator('[data-testid="pulse"] [data-testid^="tile-"]').evaluateAll((els, red) => els.filter((e) => [...e.querySelectorAll('*')].some((x) => x.childNodes.length && getComputedStyle(x).color === red)).map((e) => e.getAttribute('data-testid')), redInk)
      ok(reds.every((k) => k === 'tile-response' || k === 'tile-owe'), `red in Pulse only where ours and late (${reds.join(' · ') || 'none'})`)
      await shot(p, '03-pulse-1440')

      /* a resting mouse breaks a figure down: Owed to you by how late, the rows adding up to the figure */
      const owedVal = await text(owedT.locator('[class*="__value"]'))
      await owedT.hover(); await settle(p, 900)
      const bd = p.getByTestId('breakdown-owed')
      ok(await bd.isVisible().catch(() => false), 'a resting mouse opens the figure’s breakdown')
      const sum = (await bd.locator('[role="menuitem"]').evaluateAll((els) => els.map((e) => e.querySelector('[class*="itemMeta"]')?.textContent ?? ''))).reduce((s, v) => s + minorOf(v || '0'), 0)
      ok(compactOf(sum) === owedVal, `its rows add up to the figure (${compactOf(sum)} = ${owedVal})`)
      await shot(p, '03-pulse-breakdown-1440')
      await p.mouse.move(700, 900); await settle(p, 700)
      ok(!(await bd.isVisible().catch(() => false)), 'leaving it closes the breakdown')
      /* ↓ on a focused figure: the breakdown, the keyboard in it; Esc gives the figure back. (the calm pass) its title carries the comparison */
      await p.getByTestId('tile-sales').focus(); await p.keyboard.press('ArrowDown'); await settle(p, 500)
      ok(await p.getByTestId('breakdown-sales').isVisible().catch(() => false) && await p.evaluate(() => !!document.activeElement?.closest('[data-om-menu]')), '↓ on a focused figure opens it, the keys inside')
      ok(/^Won · last 90 days( · (▲|▼|Same).*)?$/i.test(await text(p.getByTestId('breakdown-sales').locator('[data-menu-label]').first())), `…its title says the comparison the card no longer wears (${await text(p.getByTestId('breakdown-sales').locator('[data-menu-label]').first())})`)
      await p.keyboard.press('Escape'); await settle(p, 300)

      /* each press its report, with the way back — the report's own figure */
      const door = async (key, re, label) => {
        await go(p, '/dashboard', 1200)
        const v = await text(p.getByTestId(`tile-${key}`).locator('[class*="__value"]'))
        await p.getByTestId(`tile-${key}`).click(); await p.waitForURL(re, { timeout: 15000 }).catch(() => {}); await settle(p, 1500)
        ok(re.test(p.url()) && /[?&]from=%2Fdashboard/.test(p.url()), `${label} opens its report with the way back`, p.url())
        return { v, main: await text(p.locator('main')) }
      }
      { const { v, main } = await door('sales', /\/company\/reports\/leads\?report=sales/, 'Won · 90 days')
        const won = /Won value\s*(−?S\$[\d,.]+)/i.exec(main)?.[1]
        ok(!!won && compactOf(minorOf(won)) === v, `…its figure is the report’s Won value (${v} ⇐ ${won})`) }
      { const { v, main } = await door('owed', /\/company\/reports\/finance\?report=ar/, 'Owed to you')
        const fig = /(?:Owed to you|To collect)\s*(−?S\$[\d,.]+)/i.exec(main)?.[1]   // (the calm UI build 2026-10-27, a deliberate change) the report's tile by its old or its new name (T-01)
        ok(!!fig && compactOf(minorOf(fig)) === v, `…its figure is the report’s (${v} ⇐ ${fig})`) }
      { const { v, main } = await door('profit', /\/company\/reports\/finance\?report=pl/, 'Profit')
        const fig = /\bProfit\s*(−?S\$[\d,.]+)/i.exec(main)?.[1]
        ok(!!fig && compactOf(minorOf(fig)) === v, `…its figure is the P&L’s (${v} ⇐ ${fig})`) }
      await door('response', /\/company\/reports\/leads\?range=90/, 'First response')
      await c.close()
    }
    /* ── 4 · Studio / Mine (Q-07) ── */
    console.log('4 · Studio / Mine (Q-07 · the calm pass: a grey track)')
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'mine')
      await go(p, '/dashboard', 1500)
      /* (the calm pass 2026-10-26, a deliberate change) a grey track, the chosen one white — no primary tint */
      const track = await p.evaluate(() => { const g = document.querySelector('[data-testid="scope-switch"]'); const on = g?.querySelector('[role="radio"][aria-checked="true"]'); const off = g?.querySelector('[role="radio"][aria-checked="false"]'); return g && on && off ? { g: getComputedStyle(g).backgroundColor, on: getComputedStyle(on).backgroundColor, off: getComputedStyle(off).backgroundColor, onInk: getComputedStyle(on).color, offInk: getComputedStyle(off).color } : null })
      ok(!!track && track.g === 'rgb(229, 229, 229)' && track.on === 'rgb(255, 255, 255)' && track.off === 'rgba(0, 0, 0, 0)' && track.onInk !== track.offInk, 'Studio / Mine is a grey track, the chosen one white', JSON.stringify(track))
      const ofN = async () => Number(/of (\d+) leads?/.exec(await text(p.getByTestId('tile-sales')))?.[1] ?? 0)
      const studioN = await ofN()
      await p.getByRole('radio', { name: 'Just me' }).click(); await p.waitForURL(/scope=mine/, { timeout: 10000 }).catch(() => {}); await settle(p, 1800)   // (the calm UI build 2026-10-27, a deliberate change) "Whole studio · Just me" (was "Studio · Mine")
      ok(/[?&]scope=mine/.test(p.url()) && JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`) || '{}').scope === 'mine', 'Mine: the address says it, the record remembers it')
      /* (the calm pass 2026-10-26, a deliberate change) Leads this week left an Owner's Pulse: Mine reads his own leads in Won's "of N leads" */
      const mineN = await ofN()
      const ownIn90 = Number(sql(`select count(*) from leads l where l.deleted_at is null and l.direct = 0 and l.created_at >= strftime('%s','now') - 90 * 86400 and exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = 'dane')`))
      ok(mineN <= studioN && Math.abs(mineN - ownIn90) <= 1, `…and Won reads his own leads (of ${mineN} — the studio’s ${studioN}, his own in 90 days ${ownIn90})`)
      await go(p, '/dashboard', 1500)
      ok((await p.getByRole('radio', { name: 'Just me' }).getAttribute('aria-checked')) === 'true', 'a plain /dashboard opens on Just me again (remembered)')
      await p.getByRole('radio', { name: 'Whole studio' }).click(); await settle(p, 1800)
      ok(!/scope=mine/.test(p.url()) && JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`) || '{}').scope === 'studio', 'Studio puts it back, address and record')
      await c.close()
      as('germaine')
      const c2 = await ctxOf(); const p2 = await c2.newPage(); watch(p2, 'mine-designer')
      await go(p2, '/dashboard', 1500)
      ok(await p2.getByRole('radio', { name: 'Just me' }).count() === 0, 'a Designer has no switch — their page is already their own')
      await c2.close(); as('dane')
    }
    /* ── 5 · hide a card for yourself (Q-06) ── */
    console.log('5 · hide a card for yourself (Q-06)')
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'hide')
      await go(p, '/dashboard', 1500)
      await p.getByTestId('page-menu').click(); await settle(p, 400)
      ok(await p.getByTestId('page-card-needs').count() === 0 && await p.getByTestId('page-card-pulse').count() === 1, 'Cards on your page lists what may hide — never Needs you')
      await shot(p, '05-cards-menu-1440')
      await p.getByTestId('page-card-pulse').locator('[role="menuitemcheckbox"]').click(); await settle(p, 900)
      ok(await p.locator('[data-slot="pulse"]').count() === 0 && /Key numbers hidden — only for you/.test(await snack(p)), 'Key numbers hide at once, the snackbar saying so', await snack(p))   // (the calm UI build 2026-10-27, a deliberate change) "Key numbers" (was "Pulse")
      ok(JSON.stringify(JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`)).hidden) === '["pulse"]', '…kept on his record')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1200)
      ok(await p.locator('[data-slot="pulse"]').count() === 1 && JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`)).hidden.length === 0, 'Undo brings it back, on the page and the record')
      await p.getByTestId('page-menu').click(); await settle(p, 300)
      await p.getByTestId('page-card-pulse').locator('[role="menuitemcheckbox"]').click(); await settle(p, 900)
      await p.reload({ waitUntil: 'networkidle' }); await settle(p, 1500)
      ok(await p.locator('[data-slot="pulse"]').count() === 0, 'a reload keeps it hidden (the record, not the browser)')
      /* each card's own ⋮ (the card frame's, one place for the five) › Hide this card — Needs you has none */
      const heads = await p.locator('[data-testid="dashboard"] [data-testid^="menu-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('menu-', '')))
      /* (the calm UI build 2026-10-27, a deliberate change) every card carries ONE ⋮ in its head — Needs your attention's holds Ask Maison AI about this alone (it never hides) */
      ok(heads.length >= 5 && heads.every((k) => ['needs', 'day', 'pipeline', 'projects', 'team', 'site'].includes(k)), `every card carries ⋮ in its head (${heads.join(' · ')})`)
      /* (the calm pass 2026-10-26) the card's ✦ Ask and ⋮ show on hover or focus at a desk (his correction 4, lane C3's head): the mouse rests on it first */
      await p.locator('[data-card="team"]').first().hover(); await settle(p, 400)
      /* (the calm UI build 2026-10-27, a deliberate change) the ✦ Ask button went into the ⋮ ("Ask Maison AI about this") — one door for Maison AI */
      const dotsX = await p.getByTestId('menu-team').boundingBox()
      ok(!!dotsX && await p.locator('[data-card="team"] button[data-testid="team-card-ask"]').count() === 0, '…its ⋮ alone on the head’s line — Ask is in it')
      await p.getByTestId('menu-team').click(); await settle(p, 300)
      await p.getByTestId('hide-team').locator('[role="menuitem"]').click(); await settle(p, 900)
      /* (the calm pass 2026-10-26, a deliberate change) the card is "Team load", the option's own head */
      ok(await p.locator('[data-slot="team"]').count() === 0 && /Team workload hidden — only for you/.test(await snack(p)), 'a card’s ⋮ › Hide this card hides it, the snackbar saying so (Team workload)', await snack(p))   // (the calm UI build 2026-10-27, a deliberate change)
      ok(JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`)).hidden.includes('team'), '…kept on his record')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1500)
      ok(await p.locator('[data-card="team"]').count() === 1 && !JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`)).hidden.includes('team'), 'Undo brings the card back')
      await p.getByTestId('page-menu').click(); await settle(p, 300)
      await p.getByTestId('page-show-all').locator('[role="menuitem"]').click(); await settle(p, 2200)
      ok(await p.locator('[data-slot="pulse"]').count() === 1 && JSON.parse(sql(`select dashboard_prefs from members where id = 'dane'`)).hidden.length === 0, 'Show all cards brings every card back, its figures read')
      await c.close()
    }

    /* ── 6 · every role's page (P-11) ── */
    console.log('6 · every role’s page (P-11)')
    /* (the calm pass 2026-10-26, a deliberate change) an Owner's and an Admin's four: Won · Owed to you · Profit · First response */
    const ROLE = { huimin: ['sales', 'owed', 'profit', 'response'], james: ['leads', 'sales', 'response'], germaine: ['leads', 'projects', 'commission'], priya: ['owed', 'coming', 'owe', 'gst'], nurul: ['leads', 'response'] }
    for (const [who, want] of Object.entries(ROLE)) {
      as(who)
      const c = await ctxOf(); const p = await c.newPage(); watch(p, `role-${who}`)
      await go(p, '/dashboard', 1600)
      const got = await figures(p)
      ok(JSON.stringify(got) === JSON.stringify(want), `${who}: the figures are theirs (${got.join(' · ')})`)
      ok((await p.getByRole('radio', { name: 'Just me' }).count() > 0) === (who === 'huimin'), `${who}: Whole studio / Just me ${who === 'huimin' ? 'is an Admin’s' : 'is not theirs'}`)
      const cols = await p.locator('[data-testid^="figure-"]').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size)
      ok(cols === 1, `${who}: the cards in one row at a desk`)
      if (who === 'james') ok(!/S\$/.test(await text(p.getByTestId('tile-sales'))), 'james: a Manager’s Won is a count — no money on their page')
      if (who === 'germaine') ok(/My leads/i.test(await text(p.getByTestId('tile-leads'))) && /Your commission to be paid/i.test(await text(p.getByTestId('tile-commission'))), 'germaine: My leads, and the commission owed to her')   // (the calm UI build 2026-10-27, a deliberate change) “Your commission to be paid” (1-17)
      if (who === 'nurul') {
        /* (the calm pass 2026-10-26, moved from the Owner's) Leads this week is the listing's own Last 7 days, its line where they came from */
        const weekN = Number(sql(`select count(*) from leads where deleted_at is null and direct = 0 and created_at >= ${weekFrom()}`))
        const leadsVal = await text(p.getByTestId('tile-leads').locator('[class*="__value"]'))
        ok(Number(leadsVal) === weekN, `nurul: Leads this week is the listing’s own Last 7 days (${leadsVal} = ${weekN})`)
        ok(/\d+ from |None added this week/.test(await text(p.getByTestId('tile-leads'))) && await p.getByTestId('tile-leads').locator('svg[class*="__spark"]').count() <= 1, 'nurul: …its caption where they came from, its weeks a thin line')
        await p.getByTestId('tile-leads').hover(); await settle(p, 900)
        const bsum = (await p.getByTestId('breakdown-leads').locator('[role="menuitem"]').evaluateAll((els) => els.map((e) => e.querySelector('[class*="itemMeta"]')?.textContent ?? ''))).reduce((s, v) => s + (Number(v) || 0), 0)
        ok(bsum === Number(leadsVal), `nurul: its breakdown by source adds up to it (${bsum} = ${leadsVal})`)
        await p.mouse.move(700, 900); await settle(p, 500)
        await p.getByTestId('tile-leads').click(); await p.waitForURL(/\/leads\?/, { timeout: 10000 }).catch(() => {})
        ok(/\/leads\?date=7d/.test(p.url()), 'nurul: Leads this week opens the listing on Last 7 days', p.url())
        await go(p, '/dashboard', 1200)
      }
      if (who === 'priya') {
        /* (the calm pass) what the studio owes past its day is ours and late — red; Coming in's next weeks a thin line */
        ok(await p.getByTestId('tile-coming').locator('svg[class*="__spark"][data-ahead]').count() <= 1, 'priya: Coming in’s weeks ahead a thin line')
        const oweBands = await p.getByTestId('tile-owe').locator('[class*="__agingBand"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tone')))
        ok(oweBands.every((t) => t === null || t === 'late'), 'priya: You owe’s oldest part is red (ours and late), never amber')
      }
      ok(await sideways(p) <= 0, `${who}: no sideways scroll`)
      await shot(p, `06-${who}-1440`)
      await c.close()
    }
    as('dane')
    /* ── 7 · every width (brief § 3) ── */
    console.log('7 · every width (brief § 3 · the calm pass)')
    const W = [['1440', 1440, 1024, false], ['1280', 1280, 800, false], ['1024t', 1024, 768, true], ['768t', 768, 1024, true], ['390t', 390, 844, true], ['320t', 320, 640, true], ['844t', 844, 390, true]]
    for (const [tag, w, h, touch] of W) {
      const c = await ctxOf(w, h, touch); const p = await c.newPage(); watch(p, `w${tag}`)
      await go(p, '/dashboard', 1600)
      const s = await slots(p)
      const at = (k) => s.find((x) => x.k === k)
      const needs = at('needs'), pulse = at('pulse'), glance = s.find((x) => ['pipeline', 'projects', 'team'].includes(x.k))
      const two = tag === '1440' || tag === '1280' || tag === '1024t'
      /* (the calm pass 2026-10-26, a deliberate change — the option's columns) On site joins Needs you and Your day on the left */
      if (two) ok(!!glance && glance.x > needs.x + needs.w - 2 && at('day').x === needs.x && (!at('site') || at('site').x === needs.x), `${tag}: two stacks — Needs you · Your day · On site left, the glance right${glance ? ` (${needs.w} : ${glance.w})` : ''}`)
      else {
        ok(s.filter((x) => x.k !== 'greeting').every((x) => x.x === needs.x), `${tag}: one column`)
        /* (brief § 3, D3's ask) the reading order: Your day, then Projects before Pipeline, then Team, On site */
        const order = [...s].sort((u, v) => u.y - v.y).map((x) => x.k).filter((k) => ['day', 'projects', 'pipeline', 'team', 'site'].includes(k))
        ok(JSON.stringify(order) === JSON.stringify(['day', 'projects', 'pipeline', 'team', 'site'].filter((k) => order.includes(k))) && order.indexOf('projects') < order.indexOf('pipeline'), `${tag}: the cards in reading order (${order.join(' · ')})`)
      }
      if (pulse && needs) ok(tag === '390t' || tag === '320t' ? needs.y < pulse.y : pulse.y < needs.y, `${tag}: ${tag === '390t' || tag === '320t' ? 'a phone reads Needs you before Pulse' : 'Pulse above Needs you'}`)
      const tops = await p.locator('[data-testid^="figure-"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      const perRow = tops.filter((t) => t === tops[0]).length
      /* (the calm pass 2026-10-26, a deliberate change) at most four figures: one row at a desk and held sideways (none a swipe away), two across
         upright and on a phone */
      if (['1440', '1280', '1024t', '844t'].includes(tag)) ok(perRow === tops.length, `${tag}: Pulse in one row (${perRow} of ${tops.length})`)
      if (['768t', '390t', '320t'].includes(tag)) ok(perRow === 2, `${tag}: Pulse two across (${perRow})`)
      /* the page's measures at each width: the grey page, white cards, the gaps and insets the cards read */
      const m = await p.evaluate(() => { const d = document.querySelector('[data-testid="dashboard"]'); const s = getComputedStyle(d); return { bg: s.backgroundColor, gap: s.getPropertyValue('--dash-gap').trim(), pad: s.getPropertyValue('--dash-card-pad').trim() } })
      const want = tag === '1440' || tag === '1280' ? ['24px', '24px'] : tag === '390t' || tag === '320t' ? ['16px', '16px'] : ['16px', '20px']
      ok(m.bg === 'rgb(242, 242, 242)' && m.gap === want[0] && m.pad === want[1], `${tag}: the grey page, cards ${m.gap} apart and ${m.pad} inside`, JSON.stringify(m))
      if (touch) {
        const fs14 = await p.evaluate(() => [...document.querySelectorAll('[data-testid="pulse"] [class*="__help"], [data-testid="greeting-line"]')].every((e) => parseFloat(getComputedStyle(e).fontSize) >= 14))
        ok(fs14, `${tag}: the greeting’s line and the figures’ captions at 14 or more`)
        const tgt = await p.evaluate(() => [...document.querySelectorAll('[data-testid="scope-switch"] [role="radio"]')].every((e) => e.getBoundingClientRect().height >= 44))
        ok(tgt, `${tag}: Studio / Mine at the house 44 on touch`)
      }
      ok(await sideways(p) <= 0, `${tag}: no sideways scroll`, `${await sideways(p)}px`)
      await shot(p, `07-${tag}`)
      if (tag === '390t') {
        /* a long press on a figure: its breakdown in the house sheet */
        const f = p.getByTestId('figure-owed'); await f.scrollIntoViewIfNeeded(); const box = await f.boundingBox()
        await f.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, clientX: box.x + 20, clientY: box.y + 20, bubbles: true })
        await settle(p, 900)
        await f.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true, bubbles: true })
        ok(await p.locator('[role="dialog"], [data-om-sheet]').filter({ hasText: 'Owed to you' }).count() > 0 || await p.getByTestId('breakdown-owed').isVisible().catch(() => false), '390: a long press on a figure opens its breakdown in the house sheet')
        await shot(p, '07-390t-breakdown')
        await p.keyboard.press('Escape')
      }
      await c.close()
    }

    /* ── 7b · the calm measure (brief-calm.md): the greeting and Pulse at the target's measures ── */
    console.log('7b · the calm measure — the greeting and Pulse (lane C1’s regions)')
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'busy')
      await go(p, '/dashboard', 1800)
      const busy = (sel) => p.evaluate((sel) => {
        const roots = [...document.querySelectorAll(sel)]
        /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-18) what the eye reads: words kept for a screen reader alone
           (`.visually-hidden`, the greeting's count) are not on the page's face */
        const els = roots.flatMap((r) => [r, ...r.querySelectorAll('*')]).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.visually-hidden') })
        const texts = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        const surfaces = els.filter((e) => { const s = getComputedStyle(e); return (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && e.getBoundingClientRect().width > 24) })
        return {
          words: texts.map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ').split(/\s+/).filter(Boolean).length,
          boxes: surfaces.length, bordered: surfaces.filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0).length,
          shadows: els.filter((e) => getComputedStyle(e).boxShadow !== 'none' && !/inset/.test(getComputedStyle(e).boxShadow)).length,
          controls: els.filter((e) => e.matches('button, a[href], [role="button"], [role="link"], [role="radio"]')).length,
          sizes: new Set(texts.map((e) => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight)).size,
          colours: new Set(texts.map((e) => getComputedStyle(e).color)).size,
          tints: new Set(surfaces.map((e) => getComputedStyle(e).backgroundColor).filter((x) => x !== 'rgba(0, 0, 0, 0)')).size,
          upper: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').map((e) => e.closest('[data-testid^="tile-"]') ? 'label' : e.textContent.trim()),
        }
      }, sel)
      const g = await busy('[data-slot="greeting"]'), pu = await busy('[data-slot="pulse"]')
      note(`greeting: ${JSON.stringify(g)}`); note(`pulse: ${JSON.stringify(pu)}`)
      const n = (await figures(p)).length
      ok(g.words <= 20 && pu.words <= 18 * n, `few words: the greeting ${g.words}, Pulse ${pu.words} (≤ 18 a card)`)
      ok(g.bordered === 0 && pu.bordered === 0 && pu.shadows === 0, 'no border and no shadow on the greeting or a figure')
      ok(g.boxes <= 2 && pu.boxes <= n * 2, `few boxes: the greeting ${g.boxes} (the track and its chosen one), Pulse ${pu.boxes} (a card, and Owed’s bar)`)
      ok(g.controls <= 5 && pu.controls === n, `few controls: the greeting ${g.controls} (the link, the track’s two, ⋮), Pulse ${pu.controls} (one press a card)`)
      ok(g.upper.length === 0 && pu.upper.length === 0, `no capitals on the greeting or the figures — sentence case labels (${pu.upper.length})`)   // (the calm UI build 2026-10-27, a deliberate change) T-06: capitals for a status only
      ok(g.colours <= 3 && pu.colours <= 4, `few inks: the greeting ${g.colours} (secondary, ink, the link), Pulse ${pu.colours} (+ red or amber where earned)`)
      ok(g.sizes + pu.sizes <= 9 && pu.tints <= 4, `few type sizes (${g.sizes} + ${pu.sizes}) and tints (${pu.tints})`)
      /* the whole page's first screen, for the record (the other lanes' regions land with theirs) */
      const page = await p.evaluate(() => { const vh = innerHeight; const els = [...document.querySelectorAll('[data-testid="dashboard"] *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0 }); const texts = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())); return { words: texts.map((e) => [...e.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join(' ')).join(' ').split(/\s+/).filter(Boolean).length, controls: els.filter((e) => e.matches('button, a[href], [role="button"], [role="tab"], [role="radio"], [role="link"]')).length, upper: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length } })
      note(`the first screen at 1440 (every lane's regions as they stand in this tree): ${JSON.stringify(page)}`)
      await c.close()
    }
    /* ── 8 · the ghost: the held reveal's slots are the page's (REG-708) ── */
    console.log('8 · the ghost (REG-708)')
    for (const [tag, o] of [['1440', { viewport: { width: 1440, height: 1024 } }], ['390t', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
      const c = await b.newContext({ ...o, reducedMotion: 'reduce' })
      /* a first visit, then away: the page leaves what it held (its rows, its news) for the next loader */
      const p0 = await c.newPage(); watch(p0, `ghost0-${tag}`)
      await go(p0, '/dashboard', 1200); await p0.goto(BASE + '/tasks', { waitUntil: 'networkidle' }); await settle(p0, 500)
      await c.addInitScript(() => { const g = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : g(t)) })
      const p = await c.newPage(); watch(p, `ghost-${tag}`)
      await p.goto(BASE + '/dashboard', { waitUntil: 'load' }); await settle(p, 2200)
      const m = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
        const page = reveal && reveal.querySelector(':scope > [data-ready] [data-testid="dashboard"]')
        if (!ghost || !page) return null
        /* the regions drawn (a region whose card has nothing to say is left out — `.slot:empty`) */
        const list = (root) => [...root.querySelectorAll('[data-slot]')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => ({ k: s.getAttribute('data-slot'), x: Math.round(s.getBoundingClientRect().left), y: Math.round(s.getBoundingClientRect().top), h: Math.round(s.getBoundingClientRect().height) }))
        /* a card the page holds but that had nothing to say this time (its slot empty) is one the loader can't know ahead */
        const empty = [...page.querySelectorAll('[data-slot]')].filter((s) => getComputedStyle(s).display === 'none').map((s) => s.getAttribute('data-slot'))
        return { g: list(ghost), p: list(page), empty, gf: ghost.querySelectorAll('[class*="__figure"]').length, pf: page.querySelectorAll('[data-testid^="figure-"]').length, gbg: getComputedStyle(ghost.querySelector('[data-om-l1-header]') ?? ghost).backgroundColor }
      })
      const gk = m ? m.g.map((x) => x.k).filter((k) => !m.empty.includes(k)) : []
      ok(!!m && JSON.stringify(gk) === JSON.stringify(m.p.map((x) => x.k)), `${tag}: the ghost draws the page’s regions in its order (${m && m.p.map((x) => x.k).join(' · ')}${m && m.empty.length ? ` — and ${m.empty.join(' · ')}, which had nothing to say` : ''})`, m ? gk.join(' · ') : 'no reveal')
      ok(!!m && m.gf === m.pf, `${tag}: …and its Pulse the page’s figures (${m && m.gf} = ${m && m.pf})`)
      /* (the calm pass 2026-10-26) the ghost stands on the grey page too */
      ok(!!m && m.gbg === 'rgb(242, 242, 242)', `${tag}: the ghost is the grey page (${m && m.gbg})`)
      const off = m ? m.p.filter((x) => { const g = m.g.find((y) => y.k === x.k); return !g || Math.abs(g.x - x.x) > 4 }) : []
      ok(!!m && off.length === 0, `${tag}: each region stands in the page’s column`, off.map((x) => x.k).join(' · '))
      /* (the calm pass 2026-10-26, a deliberate change) EVERY region — the greeting and Pulse (this lane's), Needs you (drawn here on lane C2's
         classes) and the five cards (lane C3's own ghosts) — stands where the page's does and is as tall, within 6 px, for Dane at both widths */
      const fit = m ? m.p.map((x) => { const g = m.g.find((y) => y.k === x.k); return { k: x.k, dy: (g?.y ?? 0) - x.y, dh: (g?.h ?? 0) - x.h } }) : []
      ok(!!m && fit.every((x) => Math.abs(x.dh) <= 6 && Math.abs(x.dy) <= 6), `${tag}: every region stands where the page’s does, as tall (${fit.map((x) => `${x.k} ${x.dy >= 0 ? '+' : ''}${x.dy}/${x.dh >= 0 ? '+' : ''}${x.dh}`).join(' · ')})`)
      await shot(p, `08-ghost-${tag}`)
      await c.close()
    }
    /* ── 9 · the first answer (P-14) ── */
    console.log('9 · the first answer (P-14)')
    {
      const c = await ctxOf(); const p = await c.newPage(); watch(p, 'speed')
      await p.goto(BASE + '/leads', { waitUntil: 'networkidle' })
      const runs = []
      /* each load once the one before has settled (its prefetches answered) — as a member opens the page, not a reload storm */
      for (let i = 0; i < 6; i++) {
        await p.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
        runs.push(await p.evaluate(() => { const e = performance.getEntriesByType('navigation')[0]; return { first: Math.round(e.responseStart - e.requestStart), end: Math.round(e.responseEnd - e.requestStart) } }))
        await settle(p, 600)
      }
      const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
      const first = med(runs.slice(1).map((r) => r.first)), end = med(runs.slice(1).map((r) => r.end))
      console.log(`  · first byte ${first} ms · the whole page ${end} ms (median of five warm loads: ${runs.slice(1).map((r) => r.first).join(' · ')})`)
      ok(first < 150, `the shell and the ghost answer first, under 0.15 s (${first} ms)`)
      ok(end - first > 40 || end < 150, 'the page streams in after its reads — never a blank wait for every card')
      await c.close()
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    /* put back what it wrote: who is signed in, every member's mark and page */
    for (const m of people0) sql(`update members set is_you = ${m.is_you}, dashboard_seen_at = ${m.seen ?? 'null'}, dashboard_since_at = ${m.since ?? 'null'}, dashboard_prefs = ${m.prefs === null || m.prefs === undefined ? 'null' : `'${String(m.prefs).replace(/'/g, "''")}'`} where id = '${m.id}'`)
    const seen1 = new Map(json(`select id, seen_at from leads`).map((r) => [r.id, r.seen_at]))
    const back = seen0.filter((r) => seen1.get(r.id) !== r.seen_at)
    if (back.length) sql(back.map((r) => `update leads set seen_at = ${q(r.seen_at)} where id = '${r.id}'`).join('; '))
    sql(['delete from chat_reads', ...reads0.map((r) => `insert into chat_reads (reader_kind, reader_id, project_id, read_at) values (${q(r.reader_kind)}, ${q(r.reader_id)}, ${q(r.project_id)}, ${r.read_at})`)].join('; '))
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
