// Pending modules, S46A · What a 1.0 user can't find, fixed — search, old addresses, keys and the Quote Digitizer's door (her "Please go ahead and
// fix everything and make sure every pixel, feature and functionality is fixed", 2026-10-19, after the findability audit
// design-source/context/parity/31-findability-audit-2026-10-19/). Each finding asserted as the rule it builds, never another round's count:
//  - S1: ⌘K knows 1.0's names — the pure run over every word the four raw reports name, per role (pm2-s46a-pure.mts, counted here), then in
//    the browser per member (Dane Owner · Germaine Designer · Priya Accounting · Nurul Marketing): the word → its row; a role's search never
//    offers what its role doesn't open; the Create rows open their targets (Upload a quote · New ticket · Start a meeting)
//  - M4: Create Quote opens on Upload a quote (⌘K, the empty Quotes list) — the drop box under the Client field, a press without a client asks
//    for one, a file is read; the empty list's three ways, one filled; the Tools tile names Upload in its help
//  - D1: every plg / UHD address lands (status + final URL), keeping each landing's own gate (Priya's refusal); plg's ?section= cards; the
//    Accounts tab; the card lands in view
//  - D3: plg's three open tools — a visitor (signed out) lands on the website's free try, a member on the tool, a lapsed session signs in
//  - H1: G then I → Messages (a quiet alias), G then E → Tickets (a listed key since REG-2524)
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s46a.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s46a')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s46a-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

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
  /* the app's own lazy writes first (the credits' month roll on the first page), so the snapshot is what the app keeps */
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
  const go = async (p, url, ms = 1200) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const box = (p) => p.getByRole('combobox', { name: 'Search the studio' })
  const search = async (p, text) => {
    if (!(await box(p).isVisible().catch(() => false))) { await p.keyboard.press('Meta+k'); await settle(p, 500) }
    await box(p).fill(text); await settle(p, 1300)
  }
  const closeSearch = async (p) => { for (let i = 0; i < 3 && await box(p).isVisible().catch(() => false); i++) { await p.keyboard.press('Escape'); await settle(p, 300) } }
  const group = (p, name) => p.getByRole('dialog', { name: 'Search' }).getByRole('group', { name })
  const row = (p, groupName, title) => group(p, groupName).getByRole('option').filter({ has: p.locator('[class*="title"]', { hasText: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) })
  const NO_QUOTES = json(`select l.id, l.name from leads l where l.deleted_at is null and l.direct = 0 and l.stage = 'Contacted' and not exists (select 1 from quotes q where q.lead_id = l.id and q.deleted_at is null) order by l.name limit 1`)[0]
  const TASK_TPL = sql(`select id from task_templates where deleted_at is null order by name limit 1`)

  try {
    // ── 0 · the pure rules — every 1.0 word, per role ──────────────────────────────────────────────────────────────────────────
    console.log('0 · The pure rules (pm2-s46a-pure.mts)')
    {
      let out = ''
      try { out = execSync('npx tsx design-source/verify/pending-modules/pm2-s46a-pure.mts', { cwd: REPO, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
      const good = (out.match(/^ {2}✓ .*$/gm) ?? []), bad = (out.match(/^ {2}✗ .*$/gm) ?? [])
      for (const x of bad) ok(false, `pure · ${x.slice(4)}`)
      ok(good.length >= 150 && bad.length === 0, `the pure probe ran: ${good.length} checks of 1.0’s words, the fillers, the old addresses and the keys, none failing`)
    }

    // ── 1 · ⌘K in the browser, per member ───────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · ⌘K finds 1.0’s words, per member (1440)')
    as('dane')
    const D = await desk(); const d = await page(D, 'dane-1440')
    await go(d, '/leads', 1800)
    const DANE = [
      ['escalations', 'Go to', 'Tickets'], ['quote digitizer', 'Create', 'Upload a quote'], ['usage & credits', 'Go to', 'Usage'], ['invoices', 'Go to', 'Money in'],
      ['accounts setup', 'Go to', 'Roles & access'], ['operations', 'Go to', 'Finance'], ['homeowner portal', 'Go to', 'Client portal'], ['3-d space planner', 'Go to', '3D Space Planner'],
      ['reviews & rankings', 'Go to', 'Reviews'], ['my settings', 'Go to', 'Your profile'], ['approvals', 'Go to', 'Dashboard'], ['ticket categories', 'Go to', 'Ticket categories'],
      ['messages to clients', 'Go to', 'Messages to clients'], ['close project', 'Go to', 'Complete handover'], ['selections', 'Go to', 'Choices'], ['deleted projects', 'Go to', 'Deleted Projects'],
      ['new ticket', 'Create', 'New ticket'], ['start a meeting', 'Create', 'Start a meeting'], ['xray', 'Go to', 'Quote X-Ray'], ['visualiser', 'Go to', 'AI Visualizer'],
    ]
    for (const [q, g, t] of DANE) { await search(d, q); ok(await row(d, g, t).count() === 1, `Dane: “${q}” → ${g} › ${t}`) }
    await search(d, 'upload a quote')
    const firstTitle = await d.getByRole('dialog', { name: 'Search' }).locator('[role="option"]').first().locator('[class*="title"]').first().innerText().catch(() => '')
    ok(firstTitle === 'Upload a quote', `“upload a quote” leads with Create › Upload a quote, not Your signature (“${firstTitle}”)`)
    ok(!(await d.getByRole('dialog', { name: 'Search' }).locator('mark').allInnerTexts()).some((m) => m.trim().toLowerCase() === 'a'), '…and the lone “a” is never marked')
    await search(d, 'escalations'); await shot(d, '01-search-escalations-1440')
    await search(d, 'quote digitizer'); await shot(d, '02-search-digitizer-1440')
    await search(d, 'invoices'); await shot(d, '03-search-invoices-1440')
    await closeSearch(d)

    as('germaine')
    await go(d, '/leads', 1800)
    for (const [q, g, t] of [['escalations', 'Go to', 'Tickets'], ['settings', 'Go to', 'Your profile'], ['upload a quote', 'Create', 'Upload a quote'], ['new meeting', 'Create', 'Start a meeting'], ['log ticket', 'Create', 'New ticket'], ['lead preferences', 'Go to', 'Open to new leads']]) {
      await search(d, q); ok(await row(d, g, t).count() === 1, `Germaine (Designer): “${q}” → ${g} › ${t}`)
    }
    await closeSearch(d)
    as('priya')
    await go(d, '/company/finance', 1800)
    for (const [q, g, t] of [['invoices', 'Go to', 'Money in'], ['receipts', 'Go to', 'Money in'], ['my settings', 'Go to', 'Your profile']]) { await search(d, q); ok(await row(d, g, t).count() === 1, `Priya (Accounting): “${q}” → ${g} › ${t}`) }
    for (const q of ['escalations', 'upload a quote', 'start a meeting', 'close project']) {
      await search(d, q)
      const titles = await d.getByRole('dialog', { name: 'Search' }).locator('[role="option"] [class*="title"]').allInnerTexts().catch(() => [])
      ok(!titles.some((t) => /^(Tickets|New ticket|Upload a quote|Start a meeting|Complete handover)$/.test(t.trim())), `Priya: “${q}” offers none of the studio’s project, quote or meeting rows (${titles.slice(0, 4).join(' · ') || 'nothing'})`)
    }
    await closeSearch(d)
    as('nurul')
    await go(d, '/leads', 1800)
    for (const [q, g, t] of [['archived leads', 'Go to', 'Lost leads'], ['approvals', 'Go to', 'Dashboard'], ['deleted leads', 'Go to', 'Deleted Leads']]) { await search(d, q); ok(await row(d, g, t).count() === 1, `Nurul (Marketing): “${q}” → ${g} › ${t}`) }
    for (const q of ['escalations', 'quote digitizer', 'usage']) {
      await search(d, q)
      const titles = await d.getByRole('dialog', { name: 'Search' }).locator('[role="option"] [class*="title"]').allInnerTexts().catch(() => [])
      ok(!titles.some((t) => /^(Tickets|New ticket|Upload a quote|Usage|Plan & AI credits)$/.test(t.trim())), `Nurul: “${q}” offers no page Marketing doesn’t open (${titles.slice(0, 4).join(' · ') || 'nothing'})`)
    }
    await closeSearch(d)
    as('dane')

    // ── 2 · the Create rows open their targets ─────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Create › Upload a quote · New ticket · Start a meeting')
    await go(d, '/leads', 1500)
    await search(d, 'quote digitizer'); await row(d, 'Create', 'Upload a quote').click()
    await d.waitForURL((u) => new URL(String(u)).pathname === '/quotes', { timeout: 10000 }).catch(() => {}); await settle(d, 2200)
    const cq = d.getByTestId('create-quote')
    ok(await cq.getAttribute('data-mode').catch(() => null) === 'choose', 'it lands on Tools › Quotes with Create Quote open on Upload a quote')
    ok(/Upload a quote/.test(await cq.getByRole('heading').first().innerText().catch(() => '') || await cq.innerText().catch(() => '')), '…titled Upload a quote')
    ok(!/[?&]upload=/.test(d.url()), 'the address drops the ask', d.url())
    ok(await cq.getByRole('button', { name: 'Upload a quote' }).isVisible() && /XLSX · CSV · PDF · 5 AI credits/i.test(await cq.getByTestId('upload-quote-choose').innerText()), '…the drop box, saying what it reads and its 5 AI credits, as the row’s chip does')
    await shot(d, '04-create-quote-upload-1440')
    await cq.getByRole('button', { name: 'Upload a quote' }).click(); await settle(d, 600)
    ok(/Choose a client first/.test(await cq.innerText()), 'a press with no client asks for the client first (no file chooser, no credits)')
    await cq.getByRole('button', { name: 'Back to the start' }).click(); await settle(d, 500)
    ok(await cq.getAttribute('data-mode') === 'rail' && await cq.getByTestId('upload-quote-row').isVisible(), 'Back leads to every way to start')
    await d.keyboard.press('Escape'); await settle(d, 600)
    /* a second ask on the same page opens it again */
    await search(d, 'upload a quote'); await row(d, 'Create', 'Upload a quote').click(); await settle(d, 1800)
    ok(await d.getByTestId('create-quote').getAttribute('data-mode').catch(() => null) === 'choose', '…and a second ask on the same page opens it again')
    await d.keyboard.press('Escape'); await settle(d, 600)

    await search(d, 'new ticket'); await row(d, 'Create', 'New ticket').click()
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — her ask 2026-10-19) */
    await d.waitForURL((u) => new URL(String(u)).pathname === '/tickets', { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/tickets' && await d.getByTestId('studio-tickets').isVisible(), `Create › New ticket lands on Tickets (its ?new=1 is S46B’s New ticket) — ${rel(d.url())}`)
    await go(d, '/leads', 1500)
    await search(d, 'start a meeting'); await row(d, 'Create', 'Start a meeting').click()
    await d.waitForURL((u) => new URL(String(u)).pathname === '/meetings', { timeout: 10000 }).catch(() => {}); await settle(d, 2600)
    ok(new URL(d.url()).pathname === '/meetings' && await d.getByRole('dialog', { name: /Which lead is this meeting with/ }).isVisible().catch(() => false), 'Create › Start a meeting lands on Meetings with New Meeting ▾ › Start a meeting now pressed — its lead picker open')
    await shot(d, '05-start-meeting-1440')
    await d.keyboard.press('Escape'); await settle(d, 500)
    await go(d, '/leads', 1500)
    await search(d, 'tickets'); await row(d, 'Go to', 'Tickets').click()
    await d.waitForURL(/\/tickets/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/tickets', 'Go to › Tickets opens Tickets')

    // ── 3 · the empty Quotes list names Upload a quote ─────────────────────────────────────────────────────────────────────────
    console.log('3 · The empty Quotes list (a lead with none)')
    if (NO_QUOTES) {
      await go(d, `/leads/${NO_QUOTES.id}/quotes`, 2200)
      const empty = d.getByTestId('quotes-empty')
      const btns = await empty.getByRole('button').allInnerTexts()
      ok(btns.map((t) => t.trim()).join(' · ') === 'From Scratch · From Template · Upload a quote', `three ways in: ${btns.join(' · ')}`)
      const filled = await empty.getByRole('button').evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(e).backgroundColor !== 'transparent' && !/outlined|text/i.test(e.className)).length)
      ok(filled <= 1, `one filled button on the card (${filled})`)
      await shot(d, '06-quotes-empty-1440')
      await empty.getByTestId('quotes-empty-upload').click(); await settle(d, 900)
      const m = d.getByTestId('create-quote')
      ok(await m.getAttribute('data-mode') === 'choose' && new RegExp(`Upload a quote for ${NO_QUOTES.name}`).test(await m.innerText()), `Upload a quote opens Create Quote on it, for ${NO_QUOTES.name}`)
      await m.getByTestId('upload-quote-file').setInputFiles(path.join(REPO, 'public/uat-files/gerald-tan-old-quote.xlsx'))
      await m.getByTestId('upload-quote').waitFor({ timeout: 15000 }).catch(() => {}); await settle(d, 2500)
      const read = await m.getByTestId('upload-quote').innerText().catch(() => '')
      ok(/line|item/i.test(read) && await m.getByRole('button', { name: 'Create the quote' }).isEnabled().catch(() => false), 'a file chosen is read into lines, Create the quote ready (the same read as the row’s)')
      await shot(d, '07-upload-read-1440')
      await m.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 400)
      await d.keyboard.press('Escape'); await settle(d, 600)
    } else ok(false, 'a Contacted lead with no quote in the demo')

    // ── 4 · Tools: the Quotes tile names Upload ────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Tools › Quotes names Upload a quote')
    await go(d, '/leads', 1500)
    await d.locator('nav[aria-label="Workspace"]').getByRole('button', { name: /^Tools/ }).first().click(); await settle(d, 700)
    const tile = d.getByRole('menu', { name: 'Tools' }).getByRole('menuitem', { name: /^Quotes/ })
    await tile.hover(); await settle(d, 700)
    ok(/create one, or upload an existing quote/.test(await d.getByRole('tooltip').innerText().catch(() => '')), 'the Quotes tile’s help: “Every quote in the studio — create one, or upload an existing quote”')
    await shot(d, '08-tools-quotes-help-1440')
    ok(await d.getByRole('menu', { name: 'Tools' }).getByRole('menuitem').count() === 9, 'still nine tiles — no second Quotes tile')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── 5 · Keys: G then I, G then E ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · G then I · G then E')
    await go(d, '/leads', 1500)
    await d.locator('main').first().click({ position: { x: 5, y: 5 } }).catch(() => {})
    await d.keyboard.press('g'); await settle(d, 650)
    const hint = d.locator('[class*="chord"][role="status"]')
    const hintText = await hint.innerText().catch(() => '')
    /* (S46 — REG-2524, a deliberate change of this rule: Tickets is a rail place of its own at /tickets, as Tasks is — her ask 2026-10-19): G then E is a listed key now; only G then I stays quiet */
    ok(/Messages/.test(hintText) && /Tickets/.test(hintText) && !/Inbox/.test(hintText), 'the G hint lists 2.0’s places, Tickets among them — not the quiet alias')
    await d.keyboard.press('i'); await d.waitForURL(/\/chat/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/chat', 'G then I (1.0’s Inbox) → Messages')
    await d.locator('main').first().click({ position: { x: 5, y: 5 } }).catch(() => {})
    await d.keyboard.press('g'); await settle(d, 150); await d.keyboard.press('e'); await d.waitForURL(/\/tickets/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/tickets', 'G then E (1.0’s Escalations) → Tickets')
    await d.keyboard.press('?'); await settle(d, 700)
    const panelText = await d.locator('[data-kb-panel]').first().innerText().catch(() => '')
    ok(/Go to Messages/.test(panelText) && /Go to Tickets/.test(panelText), 'the ? panel lists G then M and G then E (Tickets)')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── 6 · old addresses (D1) ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · plg’s and UHD’s addresses land (signed in)')
    as('dane')
    const CASES = [
      ['/settings/usage', '/company/plan'], ['/settings/usage?status=succeeded', '/company/plan?status=succeeded'], ['/tools/quotes', '/quotes'],
      ['/company/settings', '/settings?section=studio'], ['/company/settings/quotes', '/settings?section=quotes'], ['/leads/settings', '/settings?section=leads'],
      ['/company/profile/brand-kit', '/company/templates/brand'], [`/company/templates/tasks/${TASK_TPL}`, `/templates/tasks/${TASK_TPL}`], ['/visualizer/materials', '/company/materials'],
      ['/billing/return', '/company/plan/billing'], ['/contractors', '/projects?view=workload&of=contractors'], ['/escalations/new', '/tickets?new=1'],
      ['/settings?section=email', '/company/integrations#gmail'], ['/settings?section=profile', '/profile#details'], ['/settings?section=my-signature', '/profile#signature'],
      ['/settings?section=usage-credits', '/company/plan'], ['/settings?section=interface', '/profile'], ['/settings?section=lead-preferences', '/profile'],
      ['/accounts?tab=cost-visibility', '/settings?section=studio#cost-visibility'],
      ['/tools/quote-digitizer', '/quotes'], ['/tools/quote-xray', '/quote-x-ray'], ['/tools/ai-visualizer', '/visualizer'],   // a member: the tools themselves
    ]
    for (const [from, want] of CASES) {
      const r = await chain(from)
      const redirects = r.hops.slice(0, -1).every((h) => h.status === 307 || h.status === 308)
      ok(rel(r.final) === want && redirects && r.status === 200, `${from} → ${want} · ${r.hops.map((h) => h.status).join(' → ')}${rel(r.final) === want ? '' : ` — landed ${rel(r.final)}`}`)
    }
    for (const u of ['/settings?section=notifications', '/settings?section=leads', '/settings']) {
      const r = await chain(u); ok(r.hops.length === 1 && r.status === 200, `${u} is 2.0’s own address: answered as it is`)
    }
    { const r = await chain('/sign/document/1-0-file-token'); ok(r.status === 200 || r.status === 404, `/sign/document/<token> answers (${r.status}) — S46D’s notice once merged, never a 500`) }
    /* each landing keeps its own gate: Priya (Accounting) lands where the address goes, and its page refuses her as before */
    as('priya')
    for (const [from, want] of [['/contractors', '/projects?view=workload&of=contractors'], ['/settings/usage', '/company/plan'], ['/tools/quotes', '/quotes']]) {
      const r = await chain(from)
      ok(rel(r.final) === want && r.status === 200 && /Accounting keeps the studio’s books|Accounting keeps the studio&#x27;s books|Accounting keeps the studio’s books/.test(r.body), `Priya: ${from} → ${want}, its page’s own gate for Accounting`)
    }
    as('dane')
    /* in the browser: the card lands in view */
    for (const [from, card, pathname] of [['/settings?section=email', 'gmail', '/company/integrations'], ['/accounts?tab=cost-visibility', 'cost-visibility', '/settings']]) {
      await go(d, from, 2600)
      const el = d.locator(`#${card}`).first(); const r = await el.boundingBox().catch(() => null)
      ok(new URL(d.url()).pathname === pathname && !!r && r.y < 1024 && r.y + Math.min(r.height, 120) > 0, `${from}: the ${card} card in view (${rel(d.url())})`)
    }
    await shot(d, '09-cost-visibility-landed-1440')

    // ── 7 · D3: plg's open tools — a visitor's, a member's ─────────────────────────────────────────────────────────────────────
    console.log('7 · plg’s open tools: a visitor goes to the free try, a member to the tool')
    for (const [from, visitor, member] of [['/tools/ai-visualizer', '/site/try', '/visualizer'], ['/tools/quote-xray', '/site/try/quote-x-ray', '/quote-x-ray'], ['/tools/quote-digitizer?utm_source=ads', '/site/try/upload-a-quote?utm_source=ads', '/quotes?utm_source=ads']]) {
      const v = await chain(from, 'om_seen=out'), m = await chain(from), l = await chain(from, 'om_seen=in')
      ok(rel(v.final) === visitor && v.status === 200, `signed out: ${from} → ${visitor} (200)${rel(v.final) === visitor ? '' : ` — ${rel(v.final)}`}`)
      ok(rel(m.final) === member && m.status === 200, `a member: ${from} → ${member}`)
      const lu = new URL(l.final)
      ok(lu.pathname === '/sign-in' && lu.searchParams.get('reason') === 'ended' && (lu.searchParams.get('next') ?? '') === member, `a lapsed session: ${from} → sign-in, back to ${member}`)
    }
    for (const u of ['/leads', '/dashboard']) {
      const v = await chain(u, 'om_seen=out'); ok(new URL(v.final).pathname === '/sign-in', `signed out: plg’s open ${u} stays the studio’s own — sign-in (as the audit recommends)`)
    }
    {
      const C = await desk(); await C.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); const v = await page(C, 'visitor')
      await go(v, '/tools/ai-visualizer', 2200)
      ok(new URL(v.url()).pathname === '/site/try', `in a browser: a visitor at /tools/ai-visualizer sees the free try (${rel(v.url())})`)
      await shot(v, '10-visitor-ai-visualizer-1440')
      await C.close()
    }

    // ── 8 · the phone: ⌘K's sheet, the empty list, Create Quote's sheet, Tools ────────────────────────────────────────────────
    console.log('8 · 390 touch and 320')
    as('dane')
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const P = await phoneCtx(w, h); const p = await page(P, `phone-${w}`)
      await go(p, '/leads', 1800)
      await p.getByRole('button', { name: 'Search', exact: true }).first().tap(); await settle(p, 700)
      await box(p).fill('escalations'); await settle(p, 1300)
      ok(await row(p, 'Go to', 'Tickets').count() === 1, `${w}: the sheet finds Tickets by “escalations”`)
      if (w === 390) await shot(p, '11-search-escalations-390')
      await box(p).fill('quote digitizer'); await settle(p, 1300)
      ok(await row(p, 'Create', 'Upload a quote').count() === 1, `${w}: …and Create › Upload a quote by “quote digitizer”`)
      if (w === 390) await shot(p, '12-search-digitizer-390')
      await row(p, 'Create', 'Upload a quote').tap(); await p.waitForURL(/\/quotes/, { timeout: 10000 }).catch(() => {}); await settle(p, 2200)
      ok(await p.getByTestId('create-quote').getAttribute('data-mode').catch(() => null) === 'choose', `${w}: Create Quote opens on Upload a quote, as a sheet`)
      ok(await sideways(p) <= 0, `${w}: no sideways scroll with the sheet open (${await sideways(p)})`)
      if (w === 390) await shot(p, '13-create-quote-upload-390')
      await p.getByRole('button', { name: 'Close' }).first().tap().catch(async () => { await p.keyboard.press('Escape') }); await settle(p, 700)
      if (NO_QUOTES) {
        await go(p, `/leads/${NO_QUOTES.id}/quotes`, 2200)
        ok(await p.getByTestId('quotes-empty-upload').isVisible(), `${w}: the empty list’s Upload a quote, stacked with the other two`)
        ok(await sideways(p) <= 0, `${w}: no sideways scroll on the empty list (${await sideways(p)})`)
        if (w === 390) await shot(p, '14-quotes-empty-390')
      }
      await P.close()
    }

    console.log('9 · the page error log')
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await D.close()
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
