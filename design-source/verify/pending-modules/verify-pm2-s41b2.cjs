// Pending modules, S41b-2 · Old addresses and an app-wide not found (his "please make sure nothing left behind from 1.0 to 2.0", 2026-10-12; the
// S41b pages sweep's M1 · M2 and the ledger's open items). Each item asserted as the rule it builds, never another round's count:
//  - M1: every 1.0 studio-app address the sweep lists lands on its 2.0 home — the status of each hop and the final page (200) — signed in; the
//    landings that name a record carry it (a ticket open, an invoice's paper, a project's view, a milestone's row), and only for a member who
//    may see it: one who may not lands where that kind of thing lives, the same answer as for a record 2.0 doesn't hold (never its project id)
//  - signed out, an old address goes to sign-in carrying a 2.0 address (or itself), and signing in lands on the record
//  - 1.0's notification links land from where they were sent: a bell row pressed (the app's own navigation), an email's / a WhatsApp's link
//    opened in a fresh tab, a client's portal link with its tab
//  - 1.0's /settings#<section> bookmarks land on Your profile's card; 2.0's own Settings anchors are untouched
//  - 1.0's Accounts tabs land on their cards (the card is on screen)
//  - M2: an address no page answers is the house's "page not found" — 404, the shell when signed in (the rail, a header, one filled way on:
//    the page that linked here or ?from=, else the Dashboard), every role alike (never Accounting's gate), a client's address in the client's
//    calm notice (a portal address in its studio's look) with no studio shell; a session that ended goes to sign-in; Finance and Reports tabs
//    that don't exist answer 404 with the page's own title; no page errors; no sideways scroll at 390 / 320 (against screen.width)
//  - the web manifest and the house icon on the studio app and the website, readable signed out; none on a client's page
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s41b2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41b2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s41b2-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = 'pm2s41b2'   // the probe's own rows

/* one request's chain, hop by hop (no browser): each hop's status and the address it names; the last one's status */
async function chain(url, cookie = '') {
  const hops = []
  let at = new URL(url, BASE).toString()
  for (let i = 0; i < 8; i++) {
    const r = await fetch(at, { redirect: 'manual', headers: { accept: 'text/html', ...(cookie ? { cookie } : {}) } })
    const loc = r.headers.get('location')
    hops.push({ status: r.status, at })
    if (r.status >= 300 && r.status < 400 && loc) { at = new URL(loc, at).toString(); continue }
    return { hops, status: r.status, final: at, body: r.status === 200 || r.status === 404 ? await r.text() : '' }
  }
  return { hops, status: 0, final: at, body: '' }
}
const rel = (u) => { const x = new URL(u); return x.pathname + x.search + x.hash }

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
  const go = async (p, url, ms = 900) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const pathOf = (p) => { const u = new URL(p.url()); return u.pathname + u.search + u.hash }
  const heads = (p) => p.evaluate(() => ({ icon: [...document.querySelectorAll('link[rel~="icon"]')].map((l) => l.getAttribute('href')), manifest: [...document.querySelectorAll('link[rel="manifest"]')].map((l) => l.getAttribute('href')), apple: [...document.querySelectorAll('link[rel="apple-touch-icon"]')].map((l) => l.getAttribute('href')) }))

  /* the demo's records the landings name */
  const BEN = sql(`select id from projects where name like '%Benjamin Han%' and deleted_at is null limit 1`)
  const BEN_LEAD = sql(`select lead_id from projects where id = '${BEN}'`)
  const TICKET = json(`select id, number from project_tickets where project_id = '${BEN}' order by number limit 1`)[0]
  const INV = sql(`select id from project_invoices where project_id = '${BEN}' limit 1`)
  const PO = sql(`select id from purchase_orders where project_id = '${BEN}' limit 1`)
  const MS = sql(`select id from project_milestones where project_id = '${BEN}' and deleted_at is null limit 1`)
  const LAYOUT = sql(`select id from space_layouts where project_id = '${BEN}' and deleted_at is null limit 1`)
  const QUOTE = sql(`select id from quotes where lead_id = '${BEN_LEAD}' and kind = 'quote' and deleted_at is null limit 1`)
  const VENDOR = sql(`select id from vendors limit 1`)
  const ARTICLE = sql(`select id from market_insights limit 1`).replace(/^mi-/, '')
  const SLUG = sql(`select slug from portal_addresses where retired_at is null order by created_at desc limit 1`)
  /* a VO and a meeting on a lead Germaine is not on, Michelle is (the permission pair) */
  const VO = json(`select q.id, q.lead_id from quotes q where q.kind = 'variation' and q.deleted_at is null and exists (select 1 from lead_assignees a where a.lead_id = q.lead_id and a.member_id = 'michelle') and not exists (select 1 from lead_assignees a where a.lead_id = q.lead_id and a.member_id = 'germaine') limit 1`)[0]
  const MEET = json(`select m.id from meetings m where m.deleted_at is null and exists (select 1 from lead_assignees a where a.lead_id = m.lead_id and a.member_id = 'michelle') and not exists (select 1 from lead_assignees a where a.lead_id = m.lead_id and a.member_id = 'germaine') limit 1`)[0]
  const onBen = sql(`select group_concat(member_id) from lead_assignees where lead_id = '${BEN_LEAD}'`).split(',')
  ok(BEN && TICKET && INV && PO && MS && LAYOUT && QUOTE && VO && MEET && SLUG && onBen.includes('germaine') && !onBen.includes('michelle'),
    `the demo holds the records the landings name (Benjamin Han's project, ticket ${TICKET?.number}, an invoice, a PO, a milestone, a layout, a VO and a meeting on Michelle's lead) — Germaine on Benjamin's team, Michelle not`)

  try {
    /* ── 1 · every listed 1.0 address lands, signed in as the Owner (status of each hop + the final page) ─────────────────────────────── */
    console.log('\n1 · 1.0’s studio addresses → their 2.0 homes (Dane, the Owner)')
    as('dane')
    const CASES = [
      ['/inbox', '/chat'],
      ['/inbox?chat=8c1d2e3f-1.0-chat', '/chat'],
      ['/inbox/8c1d2e3f-1.0-chat', '/chat'],
      [`/inbox?newChat=91234567&name=Ben&leadId=${BEN_LEAD}`, `/chat?open=${encodeURIComponent(`lead:${BEN_LEAD}`)}`],
      /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — his ask 2026-10-19) */
      ['/escalations', '/tickets'],
      ['/escalations/new', '/tickets?new=1'],   // (S46A — the findability audit's M1, a deliberate change of this rule) 1.0's New Ticket page → Tickets' own New ticket
      [`/escalations/${TICKET.number}`, `/tickets?open=${TICKET.id}`],
      [`/escalations/${TICKET.number.toLowerCase()}`, `/tickets?open=${TICKET.id}`],
      [`/escalations/${TICKET.id}`, `/tickets?open=${TICKET.id}`],
      ['/escalations/T-1999-000404', '/tickets'],
      ['/finance/operations', '/company/finance/todo'],
      ['/finance/operations?tab=overview', '/company/finance/todo'],
      ['/finance/operations?tab=review', '/company/finance/todo'],
      ['/finance/operations?tab=invoices', '/company/finance/money-in'],
      ['/finance/operations?tab=receipts', '/company/finance/money-in?kind=payments'],
      ['/finance/operations?tab=contracts', '/company/finance/money-in?kind=variations'],
      ['/finance/operations?tab=vos', '/company/finance/money-in?kind=variations'],
      ['/finance/operations?tab=pos', '/company/finance/money-out?kind=purchase-orders'],
      ['/finance/operations?tab=bills', '/company/finance/money-out?kind=bills'],
      ['/finance/operations?tab=expenses', '/company/finance/money-out?kind=expenses'],
      [`/finance/operations?invoiceId=${INV}`, `/projects/${BEN}/money?open=${INV}`],
      [`/finance/operations?tab=invoices&project=${BEN}`, `/projects/${BEN}/money`],
      [`/finance/operations?tab=pos&project=${BEN}`, `/projects/${BEN}/money`],
      ['/finance/operations?invoiceId=not-an-invoice', '/company/finance/money-in'],
      [`/finance/invoices/${INV}/preview`, `/projects/${BEN}/invoices/${INV}`],
      [`/finance/pos/${PO}/preview`, `/projects/${BEN}/purchase-orders/${PO}`],
      [`/finance/vos/${VO.id}/preview`, `/quotes/${VO.id}/preview`],
      ['/finance/invoices/nope/preview', '/company/finance/money-in'],
      ['/finance/pos/nope/preview', '/company/finance/money-out?kind=purchase-orders'],
      ['/finance/vos/nope/preview', '/company/finance/money-in?kind=variations'],
      ['/finance/commissions', '/company/finance/commissions'],
      ['/finance/vendors', '/company/finance/vendors'],
      [`/finance/vendors?vendorId=${VENDOR}`, `/company/finance/vendors?open=${VENDOR}`],
      ['/finance/reports', '/company/reports/finance'],
      ['/finance/pipeline', '/company/reports/finance?report=profitability'],
      ['/accounts', '/company/members'],
      ['/accounts/roles', '/settings?section=studio#studio-roles'],
      ['/accounts/usage', '/company/reports/health'],
      ['/accounts/milestone-templates', '/company/templates/schedules'],
      ['/accounts?tab=workflow', '/settings?section=projects#owner-approvals'],
      ['/accounts?tab=assemblies', '/company/price-book/sections'],
      ['/accounts?tab=portal-branding&section=branding', '/company/portal'],
      ['/accounts?tab=catalogue&pb=drift', '/company/price-book'],
      ['/accounts?tab=accounting', '/company/finance/accounting'],
      ['/accounts?tab=not-a-tab', '/settings'],
      ['/settings/notifications', '/settings?section=notifications'],
      ['/upgrade', '/company/plan/billing'],
      ['/studio-setup', '/settings?section=studio'],
      ['/leads/new', '/leads?new=1'],
      ['/projects/new', '/projects?new=1'],
      [`/projects/${BEN}/quotes/new`, `/projects/${BEN}`],
      [`/leads?leadId=${BEN_LEAD}`, `/leads/${BEN_LEAD}`],
      [`/leads?openLead=${BEN_LEAD}`, `/leads/${BEN_LEAD}`],
      [`/leads?leadId=${BEN_LEAD}&openQuote=true`, `/leads/${BEN_LEAD}/quotes`],
      [`/leads?quoteId=${QUOTE}`, `/quotes/${QUOTE}`],
      [`/leads/${BEN_LEAD}/quote-preview-popout?quoteId=${QUOTE}`, `/quotes/${QUOTE}/preview`],
      [`/leads/${BEN_LEAD}/quote-preview-popout`, `/leads/${BEN_LEAD}/quotes`],
      [`/projects/${BEN}?tab=details`, `/projects/${BEN}`],
      [`/projects/${BEN}?tab=management`, `/projects/${BEN}/schedule`],
      [`/projects/${BEN}?tab=management&milestone=${MS}`, `/projects/${BEN}/schedule?open=${MS}`],
      [`/projects/${BEN}?tab=management&sub=tasks`, `/projects/${BEN}/tasks`],
      [`/projects/${BEN}?tab=management&sub=materials`, `/projects/${BEN}/choices`],
      [`/projects/${BEN}?tab=management&sub=floor-plan`, `/projects/${BEN}/floor-plan`],
      [`/projects/${BEN}?tab=timeline`, `/projects/${BEN}/schedule`],
      [`/projects/${BEN}?tab=finance`, `/projects/${BEN}/money`],
      [`/projects/${BEN}?tab=finance&sub=invoices&focus=${INV}`, `/projects/${BEN}/money?open=${INV}`],
      [`/projects/${BEN}?tab=finance&financeSubTab=contract`, `/projects/${BEN}/money`],
      [`/projects/${BEN}?tab=design&designSubTab=floor-plan`, `/projects/${BEN}/floor-plan`],
      [`/projects/${BEN}?tab=files-docs`, `/projects/${BEN}/files`],
      [`/projects/${BEN}?tab=activity`, `/projects/${BEN}/activity`],
      [`/projects/${BEN}?tab=render`, `/projects/${BEN}/designs`],
      ['/tools/quote-digitizer', '/quotes'],
      ['/tools/quote-xray', '/quote-x-ray'],
      ['/tools/ai-visualizer', '/visualizer'],
      ['/tools/floorplan-3d-isometric', '/floorplan-3d'],   // (REG-2800) its own page again
      ['/tools/market-insights', '/market-insights'],
      [`/tools/market-insights/${ARTICLE}`, `/market-insights/mi-${ARTICLE}`],
      ['/tools/compliance-navigator', '/compliance'],
      ['/tools/floor-plan', '/planner'],
      [`/tools/floor-plan?planId=${LAYOUT}`, `/planner/${LAYOUT}`],
      ['/tools/floor-plan?planId=not-a-layout', '/planner'],
      ['/tools/copilot-analytics', '/meetings'],
      ['/tools/copilot-analytics?view=insights', '/company/reports/meetings'],
      [`/tools/copilot-analytics?sessionId=${MEET.id}`, `/meetings/${MEET.id}`],
      ['/tools/homeowner-portal', '/company/portal'],
      ['/tools/auto-furnish-sandbox', '/visualizer'], ['/tools/detect-sandbox', '/visualizer'], ['/tools/relight-sandbox', '/visualizer'],
      ['/tools/style-transfer-sandbox', '/visualizer'], ['/tools/visualizer-sandbox', '/visualizer'],
      ['/tools/floorplan-3d-sandbox', '/floorplan-3d'], ['/tools/quote-template-sandbox', '/company/templates/quotes'],
      [`/my/${SLUG}/preview/project`, '/company/portal'],
      /* the client's portal links with 1.0's tab */
      [`/my/projects/${BEN}?tab=floor-plan`, `/my/${SLUG}/floor-plan`],
      [`/my/projects/${BEN}?tab=finance`, `/my/${SLUG}/money`],
      [`/my/${SLUG}/projects/${BEN}?tab=issues`, `/my/${SLUG}/issues`],
      [`/my/${SLUG}/projects/${BEN}?tab=selections`, `/my/${SLUG}/choices`],
      [`/my/projects/${BEN}?issue=some-issue`, `/my/${SLUG}/issues`],
      [`/my/projects/${BEN}`, `/my/${SLUG}`],
      /* already landing before this package: S30 · S31 · S37 · S35 (unchanged by moving the website's list) */
      ['/login', '/dashboard'],   // S30: signed in, sign-in is never shown — 1.0's /login goes straight home
      ['/verify', '/company/profile#qanvast'], ['/about', '/site/story'], ['/blog', '/site/blog'], ['/try-visualizer/style', '/site/try/style'],
    ]
    for (const [from, want] of CASES) {
      const r = await chain(from)
      const landed = rel(r.final)
      /* a portal page the demo's browser has no client session for asks the client to sign in — it landed on the portal's page all the same */
      const portalSignIn = want.startsWith(`/my/${SLUG}`) && landed.startsWith(`/my/${SLUG}/login`)
      const redirects = r.hops.slice(0, -1).every((h) => h.status === 307 || h.status === 308)
      ok((landed === want || portalSignIn) && redirects && r.status === 200,
        `${from} → ${want}${portalSignIn ? ' (the portal asks the client to sign in first)' : ''} · ${r.hops.map((h) => h.status).join(' → ')}${landed === want || portalSignIn ? '' : ` — landed ${landed}`}`)
    }
    /* every Accounts tab 1.0 had lands on a 2.0 page that answers (never the not-found) */
    const TABS = ['team', 'legal-entities', 'roles', 'usage', 'lead-experience', 'funnel', 'categories', 'lead-sources', 'fields', 'lead-webhooks', 'quote-categories', 'document-templates', 'signing-documents', 'quote-templates', 'quote-rules', 'catalogue', 'approval', 'quote-sharing', 'workflow-rules', 'feature-flags', 'proactive-alerts', 'ai-logic', 'project-types', 'timeline-templates', 'stages', 'material-catalog', 'escalation-categories', 'milestones', 'payment-schedules', 'expense-categories', 'commissions', 'po-settings', 'numbering', 'payment-methods', 'accounting', 'client-portal', 'accreditations', 'chat-identity', 'review-link', 'portal', 'copilot-tuning', 'objection-responses', 'meeting-checklists', 'competitor-list']
    const tabLand = []
    for (const t of TABS) { const r = await chain(`/accounts?tab=${t}`); tabLand.push({ t, at: rel(r.final), status: r.status }) }
    const badTabs = tabLand.filter((x) => x.status !== 200 || x.at === '/settings' || x.at.startsWith('/accounts'))
    ok(TABS.length === 44 && !badTabs.length, `all 44 of 1.0's Accounts Setup tabs land on their own 2.0 page (200)${badTabs.length ? ` — ${badTabs.map((x) => `${x.t}→${x.at} ${x.status}`).join(', ')}` : ''}`)
    /* what is no address at all answers the not-found, 404 */
    for (const u of ['/accounts/not-a-page', '/tools/not-a-tool', '/company/finance/operations', '/company/reports/not-a-report', '/escalations/x/y', '/nothing-here']) {
      const r = await chain(u)
      /* a tab that isn't one is refused by its segment's layout: Next answers 404 with its error shell and draws the house's page in the browser
         (section 6 looks at it there), as S41's /dev/ai-bench does; an address no route matches is drawn on the server */
      const tab = /^\/company\/(finance|reports)\//.test(u)
      ok(r.status === 404 && r.hops.length === 1 && (tab ? /__next_error__/.test(r.body) && /<title>Page not found<\/title>/.test(r.body) : /data-testid="page-not-found"/.test(r.body)) && !/This page could not be found/.test(r.body),
        `${u} → 404, the house's page not found (not Next's)${tab ? ', titled "Page not found"' : ''}`)
    }
    /* proxy's rules leave 2.0's own addresses alone */
    for (const u of ['/leads?view=kanban', `/projects/${BEN}?from=%2Fprojects`, '/tickets', `/projects/${BEN}/money`, '/settings?section=leads']) {
      const r = await chain(u)
      ok(r.hops.length === 1 && r.status === 200, `${u} is 2.0's own address: answered as it is (200, no redirect)`)
    }

    /* ── 2 · the visitor's permission — Who sees leads on "assigned" ──────────────────────────────────────────────────────────────────── */
    console.log('\n2 · a member who may see the record lands on it; one who may not lands where that kind lives (Who sees leads: assigned)')
    sql(`insert into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', strftime('%s','now')) on conflict(key) do update set value = excluded.value`)
    const PAIRS = [
      [`/escalations/${TICKET.number}`, `/tickets?open=${TICKET.id}`, '/tickets'],
      [`/finance/operations?invoiceId=${INV}`, `/projects/${BEN}/money?open=${INV}`, '/company/finance/money-in'],
      [`/finance/operations?tab=pos&project=${BEN}`, `/projects/${BEN}/money`, '/company/finance/money-out?kind=purchase-orders'],
      [`/finance/invoices/${INV}/preview`, `/projects/${BEN}/invoices/${INV}`, '/company/finance/money-in'],
      [`/finance/pos/${PO}/preview`, `/projects/${BEN}/purchase-orders/${PO}`, '/company/finance/money-out?kind=purchase-orders'],
      [`/tools/floor-plan?planId=${LAYOUT}`, `/planner/${LAYOUT}`, '/planner'],
    ]
    for (const [from, theirs, elsewhere] of PAIRS) {
      as('germaine'); const g = await chain(from)
      as('michelle'); const m = await chain(from)
      const leak = m.hops.some((h) => h.at.includes(BEN)) && !from.includes(BEN)
      ok(rel(g.final) === theirs && g.status === 200 && rel(m.final) === elsewhere && m.status === 200 && !leak,
        `${from}: Germaine (on the team) → ${theirs}; Michelle (not) → ${elsewhere}, no hop names the project${rel(g.final) === theirs ? '' : ` — Germaine ${rel(g.final)}`}${rel(m.final) === elsewhere ? '' : ` — Michelle ${rel(m.final)}`}`)
    }
    as('michelle'); const vm = await chain(`/finance/vos/${VO.id}/preview`), mm = await chain(`/tools/copilot-analytics?sessionId=${MEET.id}`)
    as('germaine'); const vg = await chain(`/finance/vos/${VO.id}/preview`), mg = await chain(`/tools/copilot-analytics?sessionId=${MEET.id}`)
    ok(rel(vm.final) === `/quotes/${VO.id}/preview` && rel(vg.final) === '/company/finance/money-in?kind=variations', 'a VO\'s preview: its lead\'s member lands on it, another Designer on Money in › Variation orders')
    ok(rel(mm.final) === `/meetings/${MEET.id}` && rel(mg.final) === '/meetings', 'a co-pilot session: its lead\'s member lands on the meeting, another Designer on Meetings')
    /* Accounting: the books' records — an invoice's paper — open; the workspace's (a ticket) answers with the gate's page, never the ticket */
    as('priya'); const ai = await chain(`/finance/invoices/${INV}/preview`), at = await chain(`/escalations/${TICKET.number}`)
    ok(rel(ai.final) === `/projects/${BEN}/invoices/${INV}` && rel(at.final) === '/tickets' && /access-gate/.test(at.body), 'Accounting (Priya): an invoice\'s paper opens (the books are theirs); a ticket\'s link lands on Tickets\' gate, never the ticket')
    as('dane')
    sql(`delete from settings where key = 'lead_visibility'`)

    /* ── 3 · signed out — sign-in first, carrying a 2.0 address; signing in lands on the record ───────────────────────────────────────── */
    console.log('\n3 · signed out')
    const OUT = 'om_seen=out'
    for (const [from, next] of [['/inbox', '/chat'], ['/upgrade', '/company/plan/billing'], [`/leads?leadId=${BEN_LEAD}`, `/leads/${BEN_LEAD}`], [`/escalations/${TICKET.number}`, `/escalations/${TICKET.number}`], ['/finance/operations?tab=pos', '/finance/operations?tab=pos'], ['/nothing-here', '/nothing-here']]) {
      const r = await chain(from, OUT)
      const u = new URL(r.final)
      ok(u.pathname === '/sign-in' && u.searchParams.get('next') === next && r.status === 200 && !r.hops.some((h) => h.at.includes(TICKET.id) || h.at.includes(BEN)),
        `${from} → sign-in, coming back to ${next} (nothing named before sign-in)${u.pathname === '/sign-in' ? '' : ` — landed ${rel(r.final)}`}`)
    }
    {
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const p = await page(C, 'signed-out')
      await go(p, `/escalations/${TICKET.number}`)
      await p.waitForFunction(() => { const e = document.querySelector('[data-testid="sign-in"]'); return !!e && !e.closest('[inert]') }, null, { timeout: 15000 }).catch(() => {})
      await settle(p, 300)
      await p.getByLabel(/^Mobile number or (work )?email/).fill('dane@demostudio.sg'); await p.getByTestId('sign-in-send').click(); await settle(p, 1000)
      await p.getByTestId('sign-in-digit').first().click(); await p.keyboard.type('123456'); await settle(p, 200)
      await p.getByTestId('sign-in-go').click()
      await p.waitForURL((u) => !/\/sign-in/.test(String(u)), { timeout: 15000 }).catch(() => {}); await settle(p, 1800)
      ok(pathOf(p) === '/tickets' && /T-\d{4}-\d+/.test(await text(p.getByRole('dialog'))), `signing in from 1.0's ticket link lands on Projects › Tickets with ${TICKET.number} open (landed ${pathOf(p)})`)
      const m = await chain('/manifest.json', OUT), f = await chain('/brand/favicon.svg', OUT)
      ok(m.status === 200 && f.status === 200 && m.hops.length === 1, 'signed out, the manifest and the icon still read (no session asked)')
      await C.close()
      as('dane')
    }

    /* ── 4 · 1.0's notification links: a bell row pressed, an email's / a WhatsApp's link in a fresh tab ─────────────────────────────── */
    console.log('\n4 · 1.0’s notification links land from where they were sent')
    const BELL = [
      [`/leads?leadId=${BEN_LEAD}`, `/leads/${BEN_LEAD}`],
      [`/escalations/${TICKET.number}`, `/tickets`],
      [`/finance/operations?invoiceId=${INV}`, `/projects/${BEN}/money`],
      [`/projects/${BEN}?tab=management&milestone=${MS}`, `/projects/${BEN}/schedule`],
      ['/accounts', '/company/members'],
      ['/finance/commissions', '/company/finance/commissions'],
      ['/finance/operations', '/company/finance/todo'],
    ]
    const now = Date.now()
    BELL.forEach(([href], i) => sql(`insert into notifications (id, member_id, kind, title, body, href, channels, created_at) values ('${P}-${i}', 'dane', 'assigned', '${P} 1.0 link ${i}', 'From 1.0', '${href}', 'in_app', ${Math.floor((now - i * 1000) / 1000)})`))
    {
      const C = await desk(); const p = await page(C, 'bell')
      for (let i = 0; i < BELL.length; i++) {
        await go(p, '/tasks', 600)
        await p.locator('[data-notifications-tile]').first().click(); await p.getByTestId('notifications-panel').waitFor(); await settle(p, 900)
        await p.locator('[data-testid="notification-row"]', { hasText: `${P} 1.0 link ${i}` }).first().locator('button').first().click()
        await p.waitForURL((u) => new URL(String(u)).pathname === BELL[i][1], { timeout: 15000 }).catch(() => {}); await settle(p, 900)
        ok(new URL(p.url()).pathname === BELL[i][1], `bell row "${BELL[i][0]}" pressed → ${BELL[i][1]} (landed ${pathOf(p)})`)
      }
      await C.close()
      /* an email's or a WhatsApp's link: the absolute address, opened in a fresh tab (no history, no referrer) */
      for (const [href, want] of [[`/finance/operations?invoiceId=${INV}`, `/projects/${BEN}/money`], [`/escalations/${TICKET.number}`, '/tickets'], [`/leads?leadId=${BEN_LEAD}`, `/leads/${BEN_LEAD}`], [`/my/projects/${BEN}?tab=floor-plan`, `/my/${SLUG}`]]) {
        const E = await desk(); const e = await page(E, 'email')
        const r = await e.goto(BASE + href, { waitUntil: 'networkidle' }); await settle(e, 900)
        ok(r.status() === 200 && new URL(e.url()).pathname.startsWith(want), `an email's / WhatsApp's link ${href} opened fresh → ${pathOf(e)}`)
        await E.close()
      }
    }

    /* ── 5 · 1.0's personal Settings anchors and its Accounts cards ─────────────────────────────────────────────────────────────────── */
    console.log('\n5 · bookmarks with an anchor, and the cards Accounts tabs land on')
    {
      const C = await desk(); const p = await page(C, 'anchors')
      for (const [from, want, card] of [['/settings#my-signature', '/profile#signature', 'signature'], ['/settings#notifications', '/profile#notifications', 'notifications'], ['/settings#profile', '/profile#details', 'details'], ['/settings#email', '/company/integrations#gmail', 'gmail'], ['/settings#appearance', '/profile', null]]) {
        await go(p, from, 2200)
        const inView = card ? await p.evaluate((id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 }, card) : true
        ok(pathOf(p) === want && inView, `1.0's ${from} → ${want}${card ? ' (its card on screen)' : ''} (landed ${pathOf(p)})`)
      }
      await go(p, '/settings?section=leads#lead-stages', 2200)
      ok(pathOf(p) === '/settings?section=leads#lead-stages', '2.0\'s own Settings anchor is left alone')
      for (const [tab, card] of [['funnel', 'lead-stages'], ['lead-sources', 'lead-sources'], ['fields', 'custom-fields'], ['quote-categories', 'trades'], ['roles', 'studio-roles'], ['numbering', 'document-numbers'], ['escalation-categories', 'ticket-categories'], ['competitor-list', 'meetings-competitors'], ['review-link', 'reviews'], ['lead-webhooks', 'webhooks']]) {
        await go(p, `/accounts?tab=${tab}`, 2400)
        const inView = await p.evaluate((id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 }, card)
        ok(inView, `/accounts?tab=${tab} lands with #${card} on screen (${pathOf(p)})`)
      }
      await C.close()
    }

    /* ── 6 · M2 — the app-wide page not found ───────────────────────────────────────────────────────────────────────────────────────── */
    console.log('\n6 · the app-wide page not found')
    {
      const C = await desk(); const p = await page(C, 'nf')
      let r = await go(p, '/a-page-1-0-never-had')
      ok(r.status() === 404 && (await p.title()) === 'Page not found', '404, titled "Page not found"')
      ok(await p.locator('[data-notifications-tile]').first().isVisible() && await p.getByTestId('page-not-found').isVisible(), 'inside the shell: the rail stays (its bell, its menu)')
      ok((await text(p.locator('header[data-om-l1-header]'))) === 'Page not found' && (await text(p.getByTestId('page-not-found-notice'))).includes('This page isn’t here') && (await text(p.getByTestId('page-not-found-notice'))).includes('The link may be old, or the page may have moved') && (await text(p.getByTestId('page-not-found-notice'))).includes('one you can’t open'), 'the header and the notice say plainly what happened (1.0\'s line, and that it may be one you can\'t open)')
      ok((await p.locator('[data-testid="page-not-found"] button[data-variant], [data-testid="page-not-found-way"]').count()) === 1 && (await text(p.getByTestId('page-not-found-way'))) === 'Go to the Dashboard', 'one way on: Go to the Dashboard (no page linked here)')
      ok(!(await p.content()).includes('This page could not be found'), 'never Next\'s bare page')
      await shot(p, '01-not-found-1440')
      await p.getByTestId('page-not-found-way').click(); await p.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => {})
      ok(new URL(p.url()).pathname === '/dashboard', 'Go to the Dashboard opens it')
      /* the page that linked here is the way back, named by its place */
      await go(p, '/tasks')
      await p.evaluate(() => { const a = document.createElement('a'); a.href = '/an-old-bookmark'; a.textContent = 'old'; document.body.append(a); a.click() })
      await p.waitForURL(/an-old-bookmark/, { timeout: 15000 }).catch(() => {}); await settle(p, 900)
      ok((await text(p.getByTestId('page-not-found-way'))) === 'Back to Tasks', `from Tasks: "Back to Tasks" (${await text(p.getByTestId('page-not-found-way'))})`)
      await p.getByTestId('page-not-found-way').click(); await p.waitForURL(/\/tasks/, { timeout: 15000 }).catch(() => {})
      ok(new URL(p.url()).pathname === '/tasks', 'Back to Tasks returns there')
      await go(p, '/company/finance/xyz?from=%2Fprojects')
      ok((await text(p.getByTestId('page-not-found-way'))) === 'Back to Projects' && (await text(p.locator('header[data-om-l1-header]'))) === 'Finance' && (await p.title()) === 'Page not found', 'a Finance tab that isn\'t one: the header names Finance, the title is the not-found\'s, ?from= is the way back')
      await shot(p, '08-finance-tab-not-found-1440')
      r = await go(p, '/company/reports/not-a-report')
      ok(r.status() === 404 && (await text(p.locator('header[data-om-l1-header]'))) === 'Reports' && (await p.title()) === 'Page not found' && (await text(p.getByTestId('page-not-found-way'))) === 'Go to the Dashboard', 'a Reports tab that isn\'t one: 404, the house\'s page under Reports')
      /* every role alike: Accounting meets the not-found, not their gate */
      as('priya'); await go(p, '/a-page-1-0-never-had')
      ok(await p.getByTestId('page-not-found').isVisible() && !(await p.getByTestId('access-gate').count()), 'Accounting (Priya) meets the same page, never the house gate')
      as('dane')
      /* the keyboard: one tab stop to the way on; C does not press it */
      await go(p, '/a-page-1-0-never-had')
      ok((await p.getByTestId('page-not-found-way').getAttribute('data-kb')) === null, 'its button is not the page\'s C (it creates nothing)')
      await C.close()
      /* a session that ended (its cookie, no record) goes to sign-in, saying so */
      const E = await desk(); await E.addCookies([{ name: 'om_session', value: `${'f'.repeat(32)}.d`, url: BASE }]); const e = await page(E, 'ended')
      await e.goto(BASE + '/a-page-1-0-never-had', { waitUntil: 'networkidle' }); await settle(e, 900)
      ok(new URL(e.url()).pathname === '/sign-in' && new URL(e.url()).searchParams.get('reason') === 'ended', `a session that ended: sign-in, "ended" (${pathOf(e)})`)
      await E.close()
    }
    /* a client's address: the client's notice, never the studio's shell or OpenMaison's mark */
    {
      const C = await desk(); const p = await page(C, 'client')
      let r = await go(p, '/quote/not-a-token/extra')
      ok(r.status() === 404 && await p.getByTestId('portal-notice').isVisible() && (await p.getByTestId('portal-notice').getAttribute('data-kind')) === 'not-found' && !(await p.locator('[data-notifications-tile]').count()), 'a client\'s address no page answers: 404, the calm notice, no studio shell')
      ok((await text(p.getByTestId('portal-notice'))).includes('Ask whoever sent it to you for a new one') && !/OpenMaison/.test(await text(p.locator('body'))), 'it says whom to ask, and never names OpenMaison')
      const h = await heads(p); ok(!h.icon.length && !h.manifest.length && !h.apple.length, 'no OpenMaison mark or manifest on it')
      await shot(p, '05-client-not-found-1440')
      r = await go(p, `/my/${SLUG}/not-a-section`)
      ok(r.status() === 404 && (await p.getByTestId('portal-notice').getAttribute('data-kind')) === 'gone' && (await text(p.getByTestId('portal-notice-back'))) === 'Back to your page', 'a portal address no page answers: 404, the portal\'s notice in its studio\'s look, Back to your page')
      await shot(p, '06-portal-not-found-1440')
      await p.getByTestId('portal-notice-back').click(); await settle(p, 1500)
      ok(new URL(p.url()).pathname.startsWith(`/my/${SLUG}`), 'Back to your page opens the portal')
      r = await go(p, '/my/no-such-studio-address/not-a-section')
      ok(r.status() === 404 && (await p.getByTestId('portal-notice').getAttribute('data-kind')) === 'missing', 'a portal address no studio holds: its own notice, 404')
      await C.close()
    }
    /* the website keeps its own 404, now checked above its pages' loaders (the app-wide page reads the address, so Next's static fallback is gone) */
    {
      const C = await desk(); const p = await page(C, 'site')
      for (const u of ['/site/platform/not-a-module', '/site/platform/quote-digitizer', '/site/blog/not-an-article', '/site/try/not-a-tool', '/site/no-such-page']) {
        const r = await go(p, u, 1200)
        ok(r.status() === 404 && /This page doesn’t exist/.test(await text(p.locator('main'))) && !(await p.getByTestId('page-not-found').count()), `${u}: 404, the site's own page in its frame`)
      }
      await C.close()
    }
    /* every width */
    for (const [w, h, n] of [[390, 844, '02-not-found-390'], [320, 640, '03-not-found-320']]) {
      const C = await phoneCtx(w, h); const p = await page(C, `nf-${w}`)
      const r = await go(p, '/a-page-1-0-never-had')
      ok(r.status() === 404 && await p.getByTestId('page-not-found-way').isVisible() && (await sideways(p)) <= 0, `${w} touch: the page and its way on, no sideways scroll`)
      await shot(p, n)
      await go(p, '/quote/not-a-token/extra'); ok((await sideways(p)) <= 0, `${w} touch: the client's notice, no sideways scroll`)
      if (w === 390) await shot(p, '07-client-not-found-390')
      await C.close()
    }
    { const C = await desk({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }); const p = await page(C, 'nf-768'); await go(p, '/a-page-1-0-never-had'); ok((await sideways(p)) <= 0 && await p.getByTestId('page-not-found-way').isVisible(), '768 touch: whole, no sideways scroll'); await shot(p, '04-not-found-768'); await C.close() }

    /* ── 7 · the web manifest and the house icon ───────────────────────────────────────────────────────────────────────────────────── */
    console.log('\n7 · the manifest and the icon')
    {
      const m = await (await fetch(BASE + '/manifest.json')).json()
      const icons = await Promise.all(m.icons.map(async (i) => (await fetch(BASE + i.src)).status))
      ok(m.name === 'OpenMaison' && m.display === 'standalone' && m.start_url === '/' && m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && icons.every((s) => s === 200), 'the manifest: OpenMaison, standalone, at the front door, 192 and 512 icons that load')
      const C = await desk(); const p = await page(C, 'heads')
      for (const u of ['/dashboard', '/site', '/sign-in?reason=qanvast']) {
        await go(p, u, 600); const h = await heads(p)
        ok(h.icon.includes('/brand/favicon.svg') && h.manifest.includes('/manifest.json') && h.apple.includes('/brand/apple-touch-icon.png'), `${u}: the house icon, the manifest and the home-screen icon`)
      }
      for (const u of [`/my/${SLUG}`, '/quote/not-a-token', '/sign/not-a-token', '/invoice/not-a-token']) {
        await go(p, u, 600); const h = await heads(p)
        ok(!h.icon.length && !h.manifest.length && !h.apple.length, `${u} (a client's page): no OpenMaison mark, no manifest`)
      }
      for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'app-icon.svg']) ok((await fetch(`${BASE}/brand/${f}`)).status === 200, `/brand/${f} is served`)
      await C.close()
    }

    ok(!errors.length, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' | ')}` : ''}`)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing to put back'}`)
    await b.close()
  }
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
