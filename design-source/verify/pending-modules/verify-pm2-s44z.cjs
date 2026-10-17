// S44Z · the follow-ups the day's packages left (Vicky 2026-10-15: "fix all the pending things … without any overlaps nor any issues without
// losing what we have already built … If you have any questions please go ahead based on your recommendations"). Each item asserted as its rule,
// both ways — the role it refuses, and a role it serves:
//  1 · S44O's note: every studio page a Marketing member can reach by address but doesn't open answers with the house gate BEFORE a record is
//      read — nothing of the page's records reaches the browser (the HTML and its flight payload), no record's name in the tab's title; Dane
//      gets the page with its records. Company › Price book · Templates (galleries + editors) · Materials · Members · Plan · Client portal ·
//      Questionnaire · Reports' other tabs, the AI Visualizer, the 3D Space Planner, Compliance, Qanvast Ops.
//  2 · S44O's note to the developers: the quote and contract editors' server actions, called by hand, refuse a Marketing member with
//      { error: ON_DESK } (writes) or answer nothing (the lists a picker loads) — and nothing changes in the database; Dane's calls work;
//      Accounting's reads are as they were; the member's own signature consent and the client's signing link ask no role.
//  3 · S44O's ghost note: a Marketing member's first visit to a lead past Met draws no filled button in the loader, as the page draws none;
//      a lead that is theirs to move (Contacted) draws it in both; Dane's lead at Met draws it; a lead on its project draws the short strip.
//  4 · S44P's note: every Settings list names the entry a typed name matches and lights it — Expense categories, Ticket categories (the add
//      field and the rename dialog), Lead sources' Enter, Meetings › Competitors.
//  5 · S44T's note: the phone's item cards mark a section priced after the contract as the grid does — the divider over it and its tag, the
//      tag's words said to a screen reader.
//  6 · no page errors; no sideways scroll at 390.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s44z.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44z')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const esc = (s) => s.replace(/'/g, "''")
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const ON_DESK = 'Quotes, projects and the books are the designers’, the approvers’ and Accounting’s — Marketing looks after the leads.'

/* the demo's records (fixed ids) */
const Q1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'          // OM-10001 · Draft · Olivia Martinez
const Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'          // OM-10007 · Sent to Client
const C1 = '81463786-769d-42aa-b226-192081cfd6e6'          // Olivia's agreement · Draft
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'      // New
const GERALD = 'bed4ded0-1ac7-48fd-a7c4-639a7a00f02f'      // Met
const FARAH = 'c9691890-3132-4902-9c2a-d251f6bfda9a'       // Contacted
const VIVIEN = 'bb054aa5-7284-492e-b232-607bd4cfb0f6'      // Quote Sent
const RYAN = '5e8b9c29-54ef-4b56-96a4-2027804c4cd7'        // Won, on P-2026-001
const one = (q) => sql(q).split('\n')[0] ?? ''

/* ── the server's action ids (the build's manifest) — a call made by hand, as a crafted request would be ── */
const MANIFEST = JSON.parse(fs.readFileSync(path.join(REPO, '.next/server/server-reference-manifest.json'), 'utf8')).node
const actionId = (file, name) => Object.keys(MANIFEST).find((k) => MANIFEST[k].filename === file && MANIFEST[k].exportedName === name)
async function call(file, name, url, args) {
  const id = actionId(file, name)
  if (!id) return { status: 0, text: `no action ${file}#${name}`, value: '', missing: true }
  const r = await fetch(BASE + url, { method: 'POST', headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8', Origin: BASE }, body: JSON.stringify(args) })
  const t = await r.text()
  /* the answer is row 1 of the flight reply — on its own line, or straight after a long text row (a T row carries no newline) */
  const rows = t.match(/(?:^|\n|[^\n])1:([[{"].*)/g) ?? []
  return { status: r.status, text: t, value: (t.split('\n').find((l) => /^1:/.test(l))?.slice(2)) ?? (rows.length ? rows[rows.length - 1].replace(/^[\s\S]?1:/, '') : '') }
}
const get = async (url) => { const r = await fetch(BASE + url, { redirect: 'manual' }); return { status: r.status, html: await r.text() } }
const titleOf = (html) => (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? ''

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* ── what the probe changes, kept to put back ── */
  const you0 = sql(`select id from members where is_you = 1`)
  const qCols = 'title, updated_at, amount_minor, terms_html, files_visible, client_signature_required, view_token, view_token_at, view_token_by'
  const keep = (table, id, cols) => sql(`select ${cols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from ${table} where id = '${id}'`)
  const put = (table, id, cols, row) => { const v = row.split('§'); sql(`update ${table} set ${cols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const q1Kept = keep('quotes', Q1, qCols), q7Kept = keep('quotes', Q7, qCols)
  const cCols = 'title, updated_at'
  const c1Kept = keep('contracts', C1, cCols)
  const nCols = 'signature_consent, signature_consent_at'
  const nurulKept = keep('members', 'nurul', nCols)
  const SECTION = one(`select id from quote_items where quote_id = '${Q1}' and kind = 'group' and parent_id is null order by position limit 1`)
  const itemCols = 'name, updated_at, priced_after, position'
  const secKept = keep('quote_items', SECTION, itemCols)
  const LINE = one(`select id from quote_items where quote_id = '${Q1}' and kind = 'item' order by position limit 1`)
  const lineKept = keep('quote_items', LINE, itemCols)
  const settings0 = sql(`select quote(key) || '§' || quote(value) || '§' || quote(updated_at) from settings`).split('\n').filter(Boolean)
  const trail = ['quotes', 'quote_items', 'quote_payments', 'quote_item_comments', 'quote_text_templates', 'contracts', 'lead_files', 'lead_events', 'notifications', 'studio_competitor_list', 'quote_files']
  const ids = (t) => new Set(sql(`select rowid from ${t}`).split('\n').filter(Boolean))
  const trail0 = Object.fromEntries(trail.map((t) => [t, ids(t)]))
  const count = (t, where = '1=1') => Number(one(`select count(*) from ${t} where ${where}`))

  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (p, sel = 'body') => (await p.locator(sel).first().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')

  try {
    // ── 1 · every page Marketing reaches by address answers the gate before a record is read ──────────────────────────────────────
    console.log('1 · Server gates — Marketing refused before a record is read, Dane served')
    const rec = (q) => one(q)
    const QTPL = rec(`select id || '§' || name from quote_templates where deleted_at is null order by created_at limit 1`).split('§')
    const CTPL = rec(`select id || '§' || title from contract_templates where deleted_at is null and kind != 'pdf' order by created_at limit 1`).split('§')
    const TTPL = rec(`select id || '§' || name from task_templates where deleted_at is null order by created_at limit 1`).split('§')
    const XTPL = rec(`select id || '§' || title from quote_text_templates where deleted_at is null order by created_at limit 1`).split('§')
    const PTPL = rec(`select id || '§' || name from payment_templates where deleted_at is null order by created_at limit 1`).split('§')
    const STPL = rec(`select id || '§' || name from schedule_templates where deleted_at is null order by created_at limit 1`).split('§')
    const DESIGN = rec(`select id from visualizer_designs where deleted_at is null order by created_at limit 1`)
    const ROOM = rec(`select name from project_rooms where design_id = '${DESIGN}' and deleted_at is null order by position limit 1`)
    const LAYOUT = rec(`select id || '§' || name from space_layouts where deleted_at is null order by created_at limit 1`).split('§')
    const ITEM = rec(`select name from price_book_items where deleted_at is null order by created_at limit 1`)
    const BSEC = rec(`select name from price_book_sections where deleted_at is null order by created_at limit 1`)
    const MAT = rec(`select name from studio_materials where deleted_at is null order by created_at limit 1`)
    const SLUG = rec(`select slug from portal_addresses order by rowid limit 1`)
    const ASK = rec(`select question from studio_scope_questions order by rowid limit 1`)
    const EVENT = rec(`select id || '§' || name from hangout_events order by starts_on limit 1`).split('§')
    const PROJECT = rec(`select name from projects where deleted_at is null and stage != 'completed' order by created_at limit 1`)
    const PAGES = [
      // [address, the gate's section, a record the page reads (absent for Marketing, present for Dane), a record name the tab's title would carry]
      ['/company/price-book', 'Price book', ITEM], ['/company/price-book/sections', 'Price book', BSEC],
      ['/company/templates/quotes', 'Templates', QTPL[1]], ['/company/templates/contracts', 'Templates', CTPL[1]], ['/company/templates/tasks', 'Templates', TTPL[1]],
      ['/company/templates/terms', 'Templates', XTPL[1]], ['/company/templates/payments', 'Templates', PTPL[1]], ['/company/templates/schedules', 'Templates', STPL[1]],
      ['/company/templates/brand', 'Templates', null],
      ['/company/materials', 'Materials', MAT], ['/company/members', 'Members', 'germaine@demostudio.sg'], ['/company/members/germaine/profile', 'Members', null],
      ['/company/plan', 'Plan & AI credits', null], ['/company/plan/billing', 'Plan & AI credits', null],
      ['/company/portal', 'Client portal', SLUG], ['/company/portal/clients', 'Client portal', null], ['/company/questionnaire', 'Questionnaire', ASK],
      ['/company/reports/projects', 'Reports', PROJECT],
      [`/templates/${QTPL[0]}`, 'Templates', QTPL[1], QTPL[1]], [`/templates/contracts/${CTPL[0]}`, 'Templates', CTPL[1], CTPL[1]], [`/templates/tasks/${TTPL[0]}`, 'Templates', TTPL[1], TTPL[1]],
      [`/templates/terms/${XTPL[0]}`, 'Templates', XTPL[1], XTPL[1]], [`/templates/payments/${PTPL[0]}`, 'Templates', PTPL[1], PTPL[1]], [`/templates/schedules/${STPL[0]}`, 'Templates', STPL[1], STPL[1]],
      ['/visualizer', 'AI Visualizer', null], [`/visualizer/${DESIGN}`, 'AI Visualizer', ROOM],
      ['/planner', '3D Space Planner', LAYOUT[1]], [`/planner/${LAYOUT[0]}`, '3D Space Planner', LAYOUT[1], LAYOUT[1]], [`/planner/${LAYOUT[0]}/print`, '3D Space Planner', LAYOUT[1], LAYOUT[1]],
      ['/compliance', 'Compliance', null],
      ['/qanvast-ops', 'Qanvast Ops', null], ['/qanvast-ops/hangouts', 'Qanvast Ops', EVENT[1]], [`/qanvast-ops/hangouts/${EVENT[0]}`, 'Qanvast Ops', EVENT[1], EVENT[1]], ['/qanvast-ops/studios', 'Qanvast Ops', null],
      ['/qanvast-ops/credits', 'Qanvast Ops', null], ['/qanvast-ops/reviews', 'Qanvast Ops', null],
    ]
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    for (const [url, section, marker, named] of PAGES) {
      as('nurul')
      const m = await get(url)
      const gate = /data-testid="access-gate"/.test(m.html) && new RegExp(`You don’t have access to ${escRe(section.replace(/&/g, '&amp;'))}`).test(m.html) && /Marketing looks after the studio’s leads/.test(m.html)
      const leak = marker ? m.html.includes(marker) || m.html.includes(JSON.stringify(marker).slice(1, -1)) : false
      const titled = named ? titleOf(m.html).includes(named) : false
      as('dane')
      const d = await get(url)
      const served = d.status === 200 && !/data-testid="access-gate"/.test(d.html) && (!marker || d.html.includes(marker) || d.html.includes(JSON.stringify(marker).slice(1, -1)))
      ok(gate && !leak && !titled && served, `${url}: Marketing gets "${section}"'s gate${marker ? ` and none of its records ("${marker.slice(0, 30)}")` : ''}${named ? ', no name in the tab' : ''}; Dane gets the page${marker ? ' with them' : ''}`)
    }
    /* a page Marketing does open is untouched — Reports › Leads, Integrations, a lead */
    as('nurul')
    for (const url of ['/company/reports/leads', '/company/integrations', `/leads/${OLIVIA}`, '/settings', '/dashboard']) {
      const m = await get(url)
      ok(m.status === 200 && !/data-testid="access-gate"/.test(m.html), `${url}: Marketing's own page opens as before`)
    }
    /* Accounting's gate keeps its own words on the same pages */
    as('priya')
    { const a = await get('/company/price-book'); ok(/data-testid="access-gate"/.test(a.html) && /Accounting keeps the studio’s books/.test(a.html) && !a.html.includes(ITEM), 'Accounting meets the same server gate on Company › Price book, in its own words') }
    as('dane')

    // ── 2 · the editors' actions, called by hand ─────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The quote and contract editors\' actions refuse Marketing — { error: ON_DESK }, nothing written')
    const deskSaid = (r) => r.status === 200 && r.value.includes(ON_DESK)
    as('nurul')
    const before = { items: count('quote_items'), pays: count('quote_payments'), comments: count('quote_item_comments'), texts: count('quote_text_templates'), contracts: count('contracts'), events: count('lead_events') }
    const WRITES = [
      ['app/quotes/actions.ts', 'saveQuoteGeneral', `/quotes/${Q1}`, [Q1, { title: 'Probe S44Z title' }]],
      ['app/quotes/actions.ts', 'saveQuoteSections', `/quotes/${Q1}`, [Q1, []]],
      ['app/quotes/actions.ts', 'sendQuote', `/quotes/${Q1}`, [Q1]],
      ['app/quotes/actions.ts', 'markQuoteStatus', `/quotes/${Q1}`, [Q1, 'Sent to Client']],
      ['app/quotes/actions.ts', 'reviseQuote', `/quotes/${Q7}`, [Q7, 'probe']],
      ['app/quotes/items-actions.ts', 'updateQuoteItem', `/quotes/${Q1}`, [LINE, { name: 'Probe S44Z line' }]],
      ['app/quotes/items-actions.ts', 'addQuoteItem', `/quotes/${Q1}`, [Q1, { name: 'Probe S44Z add' }]],
      ['app/quotes/items-actions.ts', 'deleteQuoteItems', `/quotes/${Q1}`, [[LINE]]],
      ['app/quotes/items-actions.ts', 'updateQuotePricing', `/quotes/${Q1}`, [Q1, { gstEnabled: false }]],
      ['app/quotes/items-actions.ts', 'setSectionPricedAfter', `/quotes/${Q1}`, [SECTION, true]],
      ['app/quotes/payments-actions.ts', 'createQuotePayment', `/quotes/${Q1}`, [Q1, { name: 'Probe', description: null, pct: 5, dueKind: 'estimate', dueAt: null }]],
      ['app/quotes/files-actions.ts', 'setQuoteFilesVisible', `/quotes/${Q1}`, [Q1, false]],
      ['app/quotes/comment-actions.ts', 'addLineComment', `/quotes/${Q1}`, [Q1, LINE, 'Probe S44Z comment']],
      ['app/quotes/text-actions.ts', 'saveQuoteText', `/quotes/${Q1}`, [Q1, 'terms', { html: '<p>Probe S44Z</p>' }]],
      ['app/quotes/text-actions.ts', 'createTextTemplate', `/quotes/${Q1}`, ['terms', { title: 'Probe S44Z', body: '<p>x</p>' }]],
      ['app/quotes/signature-actions.ts', 'setClientSignatureRequired', `/quotes/${Q1}`, [Q1, false]],
      ['app/quotes/view-link-actions.ts', 'shareQuoteView', `/quotes/${Q7}`, [Q7]],
      ['app/quotes/draft-actions.ts', 'draftQuote', '/quotes', [{ leadId: OLIVIA, brief: 'kitchen cabinets and paint the whole flat' }]],
      ['app/contracts/actions.ts', 'saveContractDoc', `/contracts/${C1}`, [C1, { title: 'Probe S44Z contract' }]],
      ['app/contracts/actions.ts', 'createContractDoc', '/contracts', [{ leadId: OLIVIA }]],
      ['app/contracts/actions.ts', 'setContractAutomation', `/contracts/${C1}`, [C1, { reminders: false }]],
      ['app/contracts/actions.ts', 'renewSigningLink', `/contracts/${C1}`, [C1, 'copy']],
    ]
    for (const [file, name, url, args] of WRITES) {
      const r = await call(file, name, url, args)
      ok(deskSaid(r), `${name}: refused with { error: ON_DESK }${deskSaid(r) ? '' : ` — got ${r.status} ${r.value.slice(0, 120) || r.text.slice(0, 120)}`}`)
    }
    const after = { items: count('quote_items'), pays: count('quote_payments'), comments: count('quote_item_comments'), texts: count('quote_text_templates'), contracts: count('contracts'), events: count('lead_events') }
    ok(JSON.stringify(after) === JSON.stringify(before) && keep('quotes', Q1, qCols) === q1Kept && keep('quotes', Q7, qCols) === q7Kept && keep('contracts', C1, cCols) === c1Kept && keep('quote_items', LINE, itemCols) === lineKept && keep('quote_items', SECTION, itemCols) === secKept,
      '…and nothing was read into a write: no row added, the quote, its line, its section and the contract as they were')
    /* the lists a picker or a reload loads answer nothing for Marketing — and the records for Dane */
    const READS = [
      ['app/quotes/items-actions.ts', 'listQuoteItems', `/quotes/${Q1}`, [Q1], '[]'],
      ['app/quotes/text-actions.ts', 'listTextTemplates', `/quotes/${Q1}`, ['terms'], '[]'],
      ['app/quotes/files-actions.ts', 'listQuoteFiles', `/quotes/${Q1}`, [Q1], '[]'],
      ['app/contracts/read-actions.ts', 'fetchContractTemplateOptionsAction', '/contracts', [], '{"templates":[],"folders":[]}'],
      ['app/contracts/read-actions.ts', 'fetchDeletedContractsAction', '/contracts', [null], '[]'],
    ]
    for (const [file, name, url, args, empty] of READS) {
      as('nurul'); const m = await call(file, name, url, args)
      as('dane'); const d = await call(file, name, url, args)
      if (m.missing) { ok(true, `${name}: no page imports it, so no browser can call it (the build lists no id) — it answers nothing for Marketing all the same`); continue }
      ok(m.value === empty && (name === 'listQuoteFiles' || name === 'fetchDeletedContractsAction' || (d.value !== empty && d.value.length > 4)), `${name}: Marketing gets nothing (${m.value.slice(0, 40)}), Dane the records${name === 'listQuoteFiles' || name === 'fetchDeletedContractsAction' ? ' (as stored)' : ''}`)
    }
    /* Dane's write goes through — and is put back */
    as('dane')
    { const d = await call('app/quotes/actions.ts', 'saveQuoteGeneral', `/quotes/${Q1}`, [Q1, { title: 'Probe S44Z title' }])
      ok(/updatedAt/.test(d.value) && one(`select title from quotes where id = '${Q1}'`) === 'Probe S44Z title', 'Dane\'s General Info save writes, as before')
      put('quotes', Q1, qCols, q1Kept) }
    /* Accounting's read of a quote's lines is as it was (Marketing alone keeps off the editors) */
    as('priya')
    { const a = await call('app/quotes/items-actions.ts', 'listQuoteItems', `/quotes/${Q1}/preview`, [Q1]); ok(a.value.length > 4 && a.value !== '[]', 'Accounting still reads a quote\'s lines (the Preview\'s read) — the rule is Marketing\'s') }
    /* the member's own signature consent (Your profile, Marketing's own page) and the client's signing link ask no role */
    as('nurul')
    { const s = await call('app/quotes/signature-actions.ts', 'setSignatureConsent', '/profile', [true]); ok(/"consent":"yes"/.test(s.value), 'Marketing\'s own signature consent (Your profile) is theirs — not refused'); put('members', 'nurul', nCols, nurulKept) }
    { const tok = one(`select sign_token from contracts where id = '${C1}'`)
      const s = await call('app/contracts/actions.ts', 'sendSigningCode', `/sign/${tok}`, [{ token: tok }])
      ok(s.status === 200 && !s.value.includes(ON_DESK), `the client's signing link asks no role (${s.value.slice(0, 60)})`) }
    as('dane')

    // ── 3 · the lead page's ghost on a first visit is the page ─────────────────────────────────────────────────────────────────────
    console.log('3 · A first visit\'s loader draws the lead header the page draws')
    /* the loader as first painted: the streamed HTML with its scripts removed, so the Suspense fallback stays (ghosts/verify-ghosts-same.cjs) */
    const loaderOf = async (ctxOpts, url) => {
      const c = await b.newContext(ctxOpts); const p = await page(c, 'loader')
      await p.route((u) => u.href === BASE + url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await settle(p, 600)
      const ghost = p.locator('[aria-label="Loading lead"]').first()
      const g = { present: await ghost.count() > 0, primary: await ghost.locator('[class*="convertAction"]').count(), tabs: await ghost.locator('[class*="ghost-kit-module"][class*="__tabs"] > *').count() }
      await c.close(); return g
    }
    const pageOf = async (ctxOpts, url, tag) => {
      const c = await b.newContext(ctxOpts); const p = await page(c, tag); await go(p, url)
      const g = { primary: await p.getByTestId('header-primary').count(), tabs: await p.locator('[role="tablist"]').first().locator('[role="tab"]').count() }
      await c.close(); return g
    }
    const D = { viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }
    const P = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    as('nurul')
    for (const [lead, label, want] of [[GERALD, 'a lead at Met', 0], [VIVIEN, 'a lead at Quote Sent', 0], [FARAH, 'a lead at Contacted (theirs to move)', 1]]) {
      const l = await loaderOf(D, `/leads/${lead}`), pg = await pageOf(D, `/leads/${lead}`, 'marketing-lead')
      ok(l.present && l.primary === want && pg.primary === want, `Marketing, ${label}: the loader draws ${want ? 'the' : 'no'} filled button, as the page (${l.primary} · ${pg.primary})`)
    }
    { const l = await loaderOf(P, `/leads/${GERALD}`), pg = await pageOf(P, `/leads/${GERALD}`, 'marketing-lead-390')
      ok(l.present && l.primary === 0 && pg.primary === 0, `390: Marketing's lead at Met — loader and page without the filled button (${l.primary} · ${pg.primary})`) }
    { const l = await loaderOf(D, `/leads/${RYAN}`), pg = await pageOf(D, `/leads/${RYAN}`, 'marketing-won')
      ok(l.present && l.primary === 0 && pg.primary === 0 && l.tabs === pg.tabs, `Marketing, a lead on its project: no filled button and the same strip (${l.tabs} · ${pg.tabs} tabs)`) }
    as('dane')
    { const l = await loaderOf(D, `/leads/${GERALD}`), pg = await pageOf(D, `/leads/${GERALD}`, 'dane-lead')
      ok(l.present && l.primary === 1 && pg.primary === 1, `Dane, a lead at Met: the loader draws the filled button, as the page (${l.primary} · ${pg.primary})`) }
    { const l = await loaderOf(D, `/leads/${RYAN}`), pg = await pageOf(D, `/leads/${RYAN}`, 'dane-won')
      ok(l.present && l.tabs === pg.tabs, `Dane, a lead on its project: a first visit's loader draws the short strip the page shows (${l.tabs} · ${pg.tabs})`) }
    { const c = await b.newContext(D); const p = await page(c, 'ghost-shot')
      as('nurul')
      await p.route((u) => u.href === `${BASE}/leads/${GERALD}`, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await p.goto(`${BASE}/leads/${GERALD}`, { waitUntil: 'load' }).catch(() => {}); await settle(p, 600); await shot(p, 'pm2-s44z-marketing-met-loader-1440')
      await c.close()
      const c2 = await b.newContext(D); const p2 = await page(c2, 'page-shot'); await go(p2, `/leads/${GERALD}`); await shot(p2, 'pm2-s44z-marketing-met-page-1440'); await c2.close(); as('dane') }

    // ── 4 · Settings lists say which entry a name matches ──────────────────────────────────────────────────────────────────────────
    console.log('4 · Every Settings list names the entry a typed name matches, and lights it')
    as('dane')
    const ctx = await desk(); const p = await page(ctx, 'settings')
    await go(p, '/settings?section=finance')
    const exp = p.getByTestId('expense-categories')
    await exp.scrollIntoViewIfNeeded()
    const expField = exp.getByRole('textbox', { name: 'Add a category' })
    await expField.fill('transport'); await settle(p, 300)
    ok(/Already in the list as “Transport”/.test(await text(p, '[data-testid="expense-categories"]')), 'Expense categories: "transport" — "Already in the list as “Transport”"')
    ok(await exp.locator('[data-testid="expense-category"][data-match]').count() === 1 && /Transport/.test(await exp.locator('[data-testid="expense-category"][data-match]').innerText()), '…and Transport lights up')
    ok(await exp.getByTestId('expense-category-add').isDisabled(), '…and Add waits')
    await shot(p, 'pm2-s44z-expense-match-1440')
    await expField.fill('Transport'); await settle(p, 300)
    ok(/Transport is already in the list/.test(await text(p, '[data-testid="expense-categories"]')), 'typed as listed: the house words — "Transport is already in the list"')
    await expField.fill(''); await settle(p, 200)
    ok(await exp.locator('[data-testid="expense-category"][data-match]').count() === 0, 'an empty field lights nothing')
    await exp.getByRole('button', { name: 'Meals', exact: true }).first().click(); await settle(p, 500)
    const dlg = p.getByRole('dialog')
    await dlg.getByRole('textbox', { name: 'Name' }).fill('office'); await dlg.getByRole('button', { name: 'Save' }).click(); await settle(p, 500)
    ok(/Already in the list as “Office”/.test(await text(p, '[role="dialog"]')), 'its rename: "office" — the Name field says "Already in the list as “Office”"')
    ok(one(`select value from settings where key = 'expense_categories'`) === '' || !/office/.test(one(`select value from settings where key = 'expense_categories'`)), '…and nothing was saved')
    await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
    await go(p, '/settings?section=projects')
    const tk = p.getByTestId('ticket-categories')
    await tk.scrollIntoViewIfNeeded()
    const tkField = tk.getByRole('textbox', { name: 'Add a category' })
    await tkField.fill('site  CLEANLINESS'); await settle(p, 300)
    ok(/Already in the list as “Site cleanliness”/.test(await text(p, '[data-testid="ticket-categories"]')), 'Ticket categories: "site  CLEANLINESS" — "Already in the list as “Site cleanliness”"')
    ok(await tk.locator('[data-testid="ticket-category"][data-match]').count() === 1 && /Site cleanliness/.test(await tk.locator('[data-testid="ticket-category"][data-match]').innerText()), '…and Site cleanliness lights up')
    await shot(p, 'pm2-s44z-ticket-match-1440')
    await tkField.fill(''); await settle(p, 200)
    await tk.getByRole('button', { name: 'Timeline', exact: true }).first().click(); await settle(p, 500)
    await p.getByRole('dialog').getByRole('textbox', { name: 'Name' }).fill('safety'); await p.getByRole('dialog').getByRole('button', { name: 'Save' }).click(); await settle(p, 600)
    ok(/Already in the list as “Safety”/.test(await text(p, '[role="dialog"]')) && !/safety/.test(one(`select value from settings where key = 'ticket_categories'`)), 'its rename: "safety" — said on the Name field, nothing saved')
    await p.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
    await go(p, '/settings?section=leads')
    const src = p.getByTestId('lead-sources')
    await src.scrollIntoViewIfNeeded()
    const srcName = (await src.locator('[data-testid="lead-source"]').allInnerTexts()).map((t) => t.split('\n')[0].trim()).find((n) => /[a-z]/.test(n) && n !== 'Others') ?? 'Website'
    await src.getByRole('textbox', { name: 'Add a source' }).fill(srcName.toUpperCase()); await settle(p, 300)
    await src.getByRole('textbox', { name: 'Add a source' }).press('Enter'); await settle(p, 500)
    ok(new RegExp(`Already in the list as “${escRe(srcName)}”`).test(await snackText(p)), `Lead sources' Enter: "${srcName.toUpperCase()}" — the snackbar names “${srcName}” as the field does`)
    await src.getByRole('textbox', { name: 'Add a source' }).fill('')
    /* Meetings › Competitors: a row put there for the probe */
    sql(`insert into studio_competitor_list (id, competitor_name, notes, created_by, created_at) values ('probe-s44z-rival', 'Studio Probe', null, 'dane', ${Date.now()})`)
    await go(p, '/settings?section=meetings')
    const rv = p.getByTestId('meetings-competitors')
    await rv.scrollIntoViewIfNeeded()
    await p.getByTestId('meetings-competitor-name').fill('studio PROBE'); await settle(p, 300)
    ok(/You have “Studio Probe” already/.test(await text(p, '[data-testid="meetings-competitors"]')), 'Meetings › Competitors: "studio PROBE" — "You have “Studio Probe” already", in the list\'s spelling')
    { const r = await call('app/settings/meetings-actions.ts', 'addCompetitor', '/settings', [{ name: 'STUDIO probe' }]); ok(r.value.includes('You have “Studio Probe” already') && count('studio_competitor_list', "competitor_name like 'studio probe'") === 1, '…and the server says the same, adding nothing') }
    await p.getByTestId('meetings-competitor-name').fill('')
    await ctx.close()
    /* 390: the lit entry and its words */
    { const ph = await phoneCtx(); const m = await page(ph, 'settings-390'); await go(m, '/settings?section=finance')
      const e = m.getByTestId('expense-categories'); await e.scrollIntoViewIfNeeded()
      await e.getByRole('textbox', { name: 'Add a category' }).fill('MEALS'); await settle(m, 300)
      ok(/Already in the list as “Meals”/.test(await text(m, '[data-testid="expense-categories"]')) && await e.locator('[data-testid="expense-category"][data-match]').count() === 1, '390: Expense categories names and lights “Meals”')
      ok((await sideways(m)) <= 0, `390: Settings › Finance never scrolls sideways (${await sideways(m)})`)
      await shot(m, 'pm2-s44z-expense-match-390'); await ph.close() }

    // ── 5 · the phone's item cards mark a section priced after the contract ─────────────────────────────────────────────────────────
    console.log('5 · Priced after the contract on the phone\'s cards')
    sql(`update quote_items set priced_after = 1 where id = '${SECTION}'`)
    { const ph = await phoneCtx(); const m = await page(ph, 'cards-390'); await go(m, `/quotes/${Q1}`)
      const cards = m.getByTestId('item-cards')
      await cards.scrollIntoViewIfNeeded().catch(() => {})
      const divider = cards.getByTestId('priced-after-divider')
      ok(await divider.count() === 1 && /Priced after the contract/i.test(await divider.innerText()), '390: the divider "Priced after the contract" over the gathered sections, as the grid\'s')
      const tag = cards.getByTestId('priced-after').first()
      ok(await tag.count() === 1 && /Priced after the contract — out of the quote’s total/.test(await tag.getAttribute('aria-label') ?? ''), '…and the section\'s "Priced after" tag says why to a screen reader, in the grid tooltip\'s words')
      const order = await cards.locator('[data-testid="priced-after-divider"], [data-testid="item-card"]').evaluateAll((els) => els.map((e) => (e.dataset.testid === 'priced-after-divider' ? 'D' : e.querySelector('[data-testid="priced-after"]') ? 'P' : 'x')).join(''))
      ok(/DP/.test(order) && !/P.*x.*D/.test(order), `…the marked section stands under the divider (${order.slice(0, 40)})`)
      await divider.scrollIntoViewIfNeeded(); await shot(m, 'pm2-s44z-priced-after-cards-390')
      ok((await sideways(m)) <= 0, `390: the quote editor never scrolls sideways (${await sideways(m)})`)
      await ph.close() }
    { const c = await desk(); const g = await page(c, 'grid-1440'); await go(g, `/quotes/${Q1}`)
      ok(await g.getByTestId('priced-after-divider').count() === 1, '1440: the grid draws the same divider'); await c.close() }
    put('quote_items', SECTION, itemCols, secKept)

    // ── 6 · widths and errors ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Widths, page errors')
    as('nurul')
    { const ph = await phoneCtx(); const m = await page(ph, 'gate-390')
      for (const url of ['/company/price-book', `/templates/${QTPL[0]}`, '/visualizer', '/qanvast-ops/hangouts']) {
        await go(m, url)
        ok(/You don’t have access to/.test(await text(m)) && (await sideways(m)) <= 0, `390: ${url} — the gate, no sideways scroll`)
      }
      await go(m, '/company/price-book'); await shot(m, 'pm2-s44z-gate-price-book-390'); await ph.close() }
    { const c = await desk(); const m = await page(c, 'gate-1440'); await go(m, '/company/price-book'); await shot(m, 'pm2-s44z-gate-price-book-1440'); await go(m, `/templates/${QTPL[0]}`); await shot(m, 'pm2-s44z-gate-template-editor-1440'); await c.close() }
    as('dane')
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    /* put back everything it changed */
    put('quotes', Q1, qCols, q1Kept); put('quotes', Q7, qCols, q7Kept); put('contracts', C1, cCols, c1Kept)
    put('members', 'nurul', nCols, nurulKept)
    put('quote_items', SECTION, itemCols, secKept); put('quote_items', LINE, itemCols, lineKept)
    sql(`delete from studio_competitor_list where id = 'probe-s44z-rival'`)
    sql(`delete from settings`)
    for (const r of settings0) sql(`insert into settings (key, value, updated_at) values (${r.split('§').join(', ')})`)
    for (const t of [...trail].reverse()) {
      const fresh = [...ids(t)].filter((id) => !trail0[t].has(id))
      if (fresh.length) sql(`delete from ${t} where rowid in (${fresh.join(',')})`)
    }
    sql(`update members set is_you = (id = '${you0}')`)
    const left = trail.filter((t) => ids(t).size !== trail0[t].size)
    console.log(left.length ? `  ✗ rows left behind in ${left.join(', ')}` : '  · the database is as it was (rows, quotes, contracts, settings, the signed-in member)')
    if (left.length) fail++
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
