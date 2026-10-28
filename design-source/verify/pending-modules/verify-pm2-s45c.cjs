// S45C · the leftovers (Vicky 2026-10-17: "can you go ahead and build everything and complete it"; every call as recommended). Each item
// asserted as its rule:
//  1 · Drag-fill continues a series (S43D's NB-07 (c)): Shift+click (or Shift+↓) selects a run down a column; its last cell carries the
//      corner square; dragging it continues the run's step (1, 2 → 3, 4), above the run back the other way; one cell still copies; ⌘D fills
//      the run's first cell into the rest; any other key lets the run go; one ⌘Z takes a fill back; the ? panel lists the keys; the phone's
//      cards are untouched. The series and the port's rules on sample rows: pm2-s45c-pure.mts (run here, its checks counted).
//  2 · Marketing's role check inside every remaining action (S44Z's note): every studio action of the Company libraries, Plan & AI credits,
//      the AI Visualizer, the 3D Space Planner, Meetings, Quote X-Ray, the Marketplace, Finance › Vendors, Qanvast Ops, Projects and a lead's
//      Quotes / Contracts tabs, called by hand as Nurul Huda (Marketing), answers the rule's own words — or nothing, for a list — and nothing in the
//      database changes; Dane's calls are served; what Marketing keeps (the Move stage window's reads, Your profile, View as, the client
//      pages) still answers; a lead's Files offer Marketing no tool it can't open.
//  3 · sharp is a listed dependency at the version Next brought, the lockfile in step.
//  4 · pj-r2 · pj-r4b — and, on the coordinator's word, pj-gap-a · pj-gap-c · pj-r6 · pj-r8 — read their dates from the records (no literal
//      day, and no window of days or months, left in their assertions).
//  5 · the port's mapper is on map 14.
//  · no page errors; no sideways scroll at 390.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. What it changes it puts back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s45c.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s45c')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const REPO = process.env.REPO || path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const one = (q) => sql(q).split('\n')[0] ?? ''
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const GATE = 'Marketing looks after the studio’s leads — Leads, Reports › Leads, Settings › Lead management and Company › Integrations. An Owner or an Admin sets roles in Company › Members.'
const ON_DESK = 'Quotes, projects and the books are the designers’, the approvers’ and Accounting’s — Marketing looks after the leads.'

/* the demo's records (fixed ids) */
const Q1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'          // OM-10001 · Draft · Olivia Martinez
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'      // New
const GERALD = 'bed4ded0-1ac7-48fd-a7c4-639a7a00f02f'      // Met
const FARAH = 'c9691890-3132-4902-9c2a-d251f6bfda9a'       // Contacted
const VIVIEN = 'bb054aa5-7284-492e-b232-607bd4cfb0f6'      // Quote Sent

/* ── the server's action ids (the build's manifest) — a call made by hand, as a crafted request would be (S44Z's way) ── */
const MANIFEST = JSON.parse(fs.readFileSync(path.join(REPO, '.next/server/server-reference-manifest.json'), 'utf8')).node
const actionId = (file, name) => Object.keys(MANIFEST).find((k) => MANIFEST[k].filename === file && MANIFEST[k].exportedName === name)
async function call(file, name, url, args) {
  const id = actionId(file, name)
  if (!id) return { status: 0, text: `no action ${file}#${name}`, value: '', missing: true }
  const r = await fetch(BASE + url, { method: 'POST', headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8', Origin: BASE }, body: JSON.stringify(args) })
  const t = await r.text()
  const rows = t.match(/(?:^|\n|[^\n])1:([[{"n$].*)/g) ?? []
  return { status: r.status, text: t, value: (t.split('\n').find((l) => /^1:/.test(l))?.slice(2)) ?? (rows.length ? rows[rows.length - 1].replace(/^[\s\S]?1:/, '') : '') }
}
const errorOf = (v) => { try { const o = JSON.parse(v); return o && typeof o === 'object' && typeof o.error === 'string' ? o.error : null } catch { return null } }

/* every row of every table, hashed per table — "nothing written" means every hash is as it was (the sessions table keeps its last-seen stamps) */
const crypto = require('crypto')
function tableHashes() {
  const dump = sql('.dump')
  const by = new Map()
  for (const line of dump.split('\n')) {
    const m = /^INSERT INTO "?([A-Za-z0-9_]+)"?/.exec(line)
    if (!m) continue
    const h = by.get(m[1]) ?? crypto.createHash('sha1')
    h.update(line); by.set(m[1], h)
  }
  return new Map([...by].map(([t, h]) => [t, h.digest('hex')]))
}
const IGNORE_TABLES = new Set(['studio_sessions'])
const changedTables = (a, b) => [...new Set([...a.keys(), ...b.keys()])].filter((t) => !IGNORE_TABLES.has(t) && a.get(t) !== b.get(t))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = one(`select id from members where is_you = 1`)
  /* what the probe changes, kept to put back */
  const keepQty = new Map()
  let renamedFile = null
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')

  try {
    // ── 0 · the pure rules, on sample rows ──────────────────────────────────────────────────────────────────────────────────────
    console.log('0 · The pure rules (pm2-s45c-pure.mts)')
    {
      let out = ''
      try { out = execSync('npx tsx design-source/verify/pending-modules/pm2-s45c-pure.mts', { cwd: REPO, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() } catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? '') }
      const good = (out.match(/^ {2}✓ .*$/gm) ?? []), bad = (out.match(/^ {2}✗ .*$/gm) ?? [])
      for (const g of good) ok(true, `pure · ${g.slice(4)}`)
      for (const x of bad) ok(false, `pure · ${x.slice(4)}`)
      ok(good.length >= 30 && bad.length === 0, `the pure probe ran (${good.length} checks)`)
    }

    // ── 1 · Drag-fill continues a series ────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Drag-fill continues a series (Dane, 1440)')
    as('dane')
    const D = await desk(); const d = await page(D, 'dane-1440')
    await go(d, `/quotes/${Q1}`)
    await d.locator('[data-testid="items-cards"], [role="table"][aria-label="Quote items"]').first().waitFor({ timeout: 15000 })
    const rowIds = await d.locator('[role="table"][aria-label="Quote items"] [role="row"][data-item-id]:not([data-group])').evaluateAll((rs) => rs.filter((r) => r.querySelector('[data-col="qty"] input[data-edit]')).map((r) => r.getAttribute('data-item-id')))
    ok(rowIds.length >= 4, `the Items table shows lines with a Qty box (${rowIds.length})`)
    const [A, B, C, E] = rowIds
    for (const id of [A, B, C, E]) keepQty.set(id, one(`select qty from quote_items where id='${id}'`))
    const setQty = (vals) => { for (const [id, v] of Object.entries(vals)) sql(`update quote_items set qty=${v} where id='${id}'`) }
    const qty = (id) => Number(one(`select qty from quote_items where id='${id}'`))
    const cell = (id, col = 'qty') => d.locator(`[role="row"][data-item-id="${id}"] [data-col="${col}"]`).first()
    const input = (id) => cell(id).locator('input[data-edit]')
    const focused = () => d.evaluate(() => document.activeElement?.closest('[role="row"]')?.getAttribute('data-item-id') ?? null)
    const runIds = () => d.locator('[role="row"][data-item-id] [data-col="qty"][data-run]').evaluateAll((cs) => cs.map((c) => c.closest('[role="row"]').getAttribute('data-item-id')))
    const dragHandle = async (fromId, toId) => {
      const h = cell(fromId).locator('[data-fill-handle]')
      const hb = await h.boundingBox(), tb = await cell(toId).boundingBox()
      await d.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await d.mouse.down()
      await d.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 }); await settle(d, 250)
      const outlined = await d.locator('[role="row"][data-item-id] [data-col="qty"][data-fill]').count()
      await d.mouse.up(); await settle(d, 1600)
      return outlined
    }
    setQty({ [A]: 1, [B]: 2, [C]: 7, [E]: 9 })
    await go(d, `/quotes/${Q1}`)
    await input(A).click(); await settle(d, 300)
    await cell(B).click({ modifiers: ['Shift'] }); await settle(d, 300)
    ok(JSON.stringify(await runIds()) === JSON.stringify([A, B]), 'Shift+click a cell in the column the focus is in: the two cells are a run')
    ok(await focused() === A, '…the focus stays in the first box')
    ok(await cell(B).getAttribute('data-run-end') === 'true' && await cell(B).locator('[data-fill-handle]').isVisible() && !(await cell(A).locator('[data-fill-handle]').isVisible()), '…the corner square sits on the run’s last cell only')
    await shot(d, 'run-selected-1440')
    const outlined = await dragHandle(B, E)
    ok(outlined === 2, `dragging the run’s corner outlines the cells it will fill (${outlined})`)
    ok(qty(C) === 3 && qty(E) === 4 && qty(A) === 1 && qty(B) === 2, `1, 2 → 3, 4 — the series continues (${qty(C)}, ${qty(E)})`)
    ok(/2 cells filled — counting up by 1/.test(await snackText(d)), `the snackbar says the step: "${await snackText(d)}"`)
    ok((await runIds()).length === 0, 'the run lets go once filled')
    await shot(d, 'series-filled-1440')
    await d.keyboard.press('Meta+z'); await settle(d, 2200)
    ok(qty(C) === 7 && qty(E) === 9, 'one ⌘Z takes the whole fill back')

    // one cell still copies
    await input(A).click(); await settle(d, 300)
    await dragHandle(A, C)
    ok(qty(B) === 1 && qty(C) === 1, 'one cell still copies (1 → 1, 1)')
    ok(/^2 cells filled(\s+close)?$/i.test((await snackText(d)).trim()), `…and says it plainly, no step: "${await snackText(d)}"`)
    await d.keyboard.press('Meta+z'); await settle(d, 2200)
    ok(qty(B) === 2 && qty(C) === 7, '…⌘Z')

    // the keyboard: Shift+↓ grows the run, ⌘D fills its first cell into the rest, any other key lets it go
    await input(A).click(); await settle(d, 300)
    await d.keyboard.press('Shift+ArrowDown'); await settle(d, 200)
    ok(JSON.stringify(await runIds()) === JSON.stringify([A, B]) && await focused() === A, 'Shift+↓ from a box: a run of two, the focus where it was')
    await d.keyboard.press('Shift+ArrowDown'); await settle(d, 200)
    ok(JSON.stringify(await runIds()) === JSON.stringify([A, B, C]), 'Shift+↓ again: three')
    await d.keyboard.press('Shift+ArrowUp'); await settle(d, 200)
    ok(JSON.stringify(await runIds()) === JSON.stringify([A, B]), 'Shift+↑ takes one back')
    await d.keyboard.press('Shift+ArrowDown'); await settle(d, 200)
    await d.keyboard.press('Meta+d'); await settle(d, 1800)
    ok(qty(A) === 1 && qty(B) === 1 && qty(C) === 1 && (await runIds()).length === 0, '⌘D over a run fills its first cell into the rest (Excel’s Ctrl+D) — once, the first cell as it was')
    await d.keyboard.press('Meta+z'); await settle(d, 2200)
    ok(qty(B) === 2 && qty(C) === 7, '…⌘Z')
    await input(A).click(); await settle(d, 300)
    await d.keyboard.press('Shift+ArrowDown'); await settle(d, 200)
    await d.keyboard.press('ArrowDown'); await settle(d, 300)
    ok((await runIds()).length === 0 && await focused() === B, 'a plain ↓ lets the run go and walks the column as before')
    await input(A).click(); await settle(d, 300)
    await cell(B).click({ modifiers: ['Shift'] }); await settle(d, 200)
    await d.mouse.click(5, 5); await settle(d, 300)
    ok((await runIds()).length === 0, 'a press anywhere else lets it go')

    // above the run: back the other way
    setQty({ [A]: 5, [B]: 1, [C]: 2 })
    await go(d, `/quotes/${Q1}`)
    await input(B).click(); await settle(d, 300)
    await cell(C).click({ modifiers: ['Shift'] }); await settle(d, 300)
    await dragHandle(C, A)
    ok(qty(A) === 0 && qty(B) === 1 && qty(C) === 2, `dragged above the run, the series goes back: 1, 2 → 0 above (${qty(A)})`)
    ok(/1 cell filled — counting up by 1/.test(await snackText(d)), '…"1 cell filled — counting up by 1"')
    await d.keyboard.press('Meta+z'); await settle(d, 2200)
    ok(qty(A) === 5, '…⌘Z')

    // words repeat in turn — a picker column (Category): Shift+click never opens its menu
    const catOf = (id) => one(`select coalesce(category,'') from quote_items where id='${id}'`)
    const cats = { A: catOf(A), B: catOf(B), C: catOf(C), E: catOf(E) }
    await cell(A, 'category').locator('[data-edit]').focus(); await settle(d, 300)
    await cell(B, 'category').click({ modifiers: ['Shift'] }); await settle(d, 400)
    ok(await d.locator('[role="menu"]').count() === 0 && await cell(B, 'category').getAttribute('data-run') === 'true', 'Shift+click on a picker cell joins the run — its menu stays shut')
    { const h = cell(B, 'category').locator('[data-fill-handle]'); const hb = await h.boundingBox(), tb = await cell(E, 'category').boundingBox()
      await d.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await d.mouse.down(); await d.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 }); await settle(d, 250); await d.mouse.up(); await settle(d, 1600) }
    ok(catOf(C) === cats.A && catOf(E) === cats.B, `words repeat in turn: ${cats.A}, ${cats.B} → ${catOf(C)}, ${catOf(E)}`)
    ok(/^2 cells filled(\s+close)?$/i.test((await snackText(d)).trim()), '…said plainly — a repeat has no step')
    await d.keyboard.press('Meta+z'); await settle(d, 2200)
    ok(catOf(C) === cats.C && catOf(E) === cats.E, '…⌘Z')

    // the ? panel names the keys
    await d.mouse.click(5, 5); await settle(d, 200)
    await d.keyboard.press('?'); await settle(d, 900)
    const panelText = (await d.locator('[role="dialog"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(/Select cells down · up/.test(panelText) && /Fill down/.test(panelText), 'the ? panel lists the run’s keys beside Fill down')
    await shot(d, 'shortcuts-panel-1440')
    await d.keyboard.press('Escape'); await settle(d, 300)

    // the phone: cards, untouched
    const P = await phoneCtx(); const q = await page(P, 'dane-390')
    await go(q, `/quotes/${Q1}`)
    await q.locator('[data-testid="items-cards"]').first().waitFor({ timeout: 15000 }).catch(() => {})
    ok(await q.locator('[data-testid="items-cards"]').count() >= 1 && await q.locator('[data-fill-handle]').count() === 0 && await q.locator('[data-run]').count() === 0, 'a phone keeps its cards — no corner square, no run')
    ok(await sideways(q) <= 0, 'no sideways scroll at 390')
    await shot(q, 'phone-items-390')
    await P.close()

    // ── 2 · Marketing's role check inside every remaining action ────────────────────────────────────────────────────────────────
    console.log('2 · Marketing refused inside every remaining action — the rule’s words back, nothing written; Dane served')
    const TARGETS = ['app/company/templates-actions.ts', 'app/company/task-templates-actions.ts', 'app/company/payment-templates-actions.ts', 'app/company/contract-templates-actions.ts',
      'app/company/schedule-templates-actions.ts', 'app/company/price-book-actions.ts', 'app/company/folder-actions.ts', 'app/company/materials-actions.ts', 'app/company/members-actions.ts',
      'app/company/font-actions.ts', 'app/company/about-actions.ts', 'app/company/portfolio-actions.ts', 'app/company/listing-actions.ts', 'app/company/scope-questions-actions.ts',
      'app/credits/actions.ts', 'app/visualizer/actions.ts', 'app/planner/actions.ts', 'app/planner/photo-actions.ts', 'app/meetings/actions.ts', 'app/leads/quotes-actions.ts',
      'app/leads/contracts-actions.ts', 'app/quote-x-ray/actions.ts', 'app/marketplace/actions.ts', 'app/finance/vendor-actions.ts', 'app/qanvast-ops/hangouts/actions.ts',
      'app/qanvast-ops/studios/actions.ts', 'app/qanvast-ops/account-actions.ts',
      /* the Projects family: its writes already refused Marketing (worksOn · seesMoney), its reads only asked Who sees leads — which lets Marketing
         see every lead — so a project's chat, tickets or choices answered a call made by hand */
      ...['actions', 'choices-actions', 'compliance-actions', 'ending-actions', 'floor-plan-actions', 'maison-actions', 'messages-actions', 'money-actions', 'paper-actions',
        'payment-actions', 'schedule-actions', 'tell-actions', 'tickets-actions', 'updates-actions', 'workload-actions',
        'contractor-actions'].map((f) => `app/projects/${f}.ts`)]   /* (pending modules S45B) the contractors' actions take the same first line */
    /* what Marketing keeps — its own profile, View as's demo switch, the Move stage window's Met read, the client's pages */
    const KEEP = new Set(['app/company/members-actions.ts#saveMyDetails', 'app/company/members-actions.ts#sendMyContactCode', 'app/company/members-actions.ts#setMyAccepting', 'app/company/members-actions.ts#setMemberPayNow',
      'app/credits/actions.ts#readCredits', 'app/credits/actions.ts#setDemoPlan', 'app/planner/actions.ts#stampLayoutLinkView', 'app/planner/actions.ts#stampPortalLayoutView', 'app/meetings/actions.ts#fetchHeldMeetingForMet',
      'app/projects/tickets-actions.ts#ticketCategoryCounts'])   // Settings reads the categories' counts for every role
    /* a list or a lookup answers nothing */
    const EMPTY = { 'app/company/templates-actions.ts#loadQuoteDocData': 'null', 'app/company/price-book-actions.ts#listItemHistory': '[]', 'app/visualizer/actions.ts#leadsToLink': '[]',
      'app/planner/actions.ts#readLinkableProjects': '[]', 'app/planner/actions.ts#readLayoutTemplates': '[]', 'app/meetings/actions.ts#clashesFor': '[]', 'app/meetings/actions.ts#listDeletedMeetings': '[]',
      'app/leads/quotes-actions.ts#listArchivedQuotes': '[]', 'app/leads/quotes-actions.ts#listDeletedQuotes': '[]', 'app/leads/quotes-actions.ts#fetchStageDocuments': '{"quotes":[],"contracts":[]}',
      'app/leads/contracts-actions.ts#listArchivedContracts': '[]', 'app/qanvast-ops/hangouts/actions.ts#hangoutPulse': '""',
      'app/projects/ending-actions.ts#listDeletedProjects': '[]', 'app/projects/maison-actions.ts#teamNames': '[]', 'app/projects/messages-actions.ts#renderMessageTarget': 'null' }
    /* the quote / contract actions keep S44Z's words */
    const DESKED = (file, name) => file === 'app/leads/quotes-actions.ts' || file === 'app/leads/contracts-actions.ts' || ['app/company/templates-actions.ts#setQuoteTemplate', 'app/company/templates-actions.ts#updateQuoteTemplateVersion',
      'app/company/templates-actions.ts#saveQuoteClientView', 'app/company/templates-actions.ts#saveQuoteAsTemplate', 'app/company/templates-actions.ts#setItemOptional',
      'app/company/payment-templates-actions.ts#saveQuoteScheduleAsTemplate', 'app/company/contract-templates-actions.ts#contractFromTemplate'].includes(`${file}#${name}`)
    const entries = Object.values(MANIFEST).filter((e) => TARGETS.includes(e.filename)).map((e) => ({ file: e.filename, name: e.exportedName })).sort((x, y) => `${x.file}#${x.name}`.localeCompare(`${y.file}#${y.name}`))
    const sourceExports = TARGETS.flatMap((f) => [...fs.readFileSync(path.join(REPO, f), 'utf8').matchAll(/^export async function (\w+)/gm)].map((m) => `${f}#${m[1]}`))
    ok(entries.length >= 480, `the build serves ${entries.length} of the ${sourceExports.length} studio actions of those families (the rest no page calls — no id to craft a call with)`)
    as('nurul')
    const before = tableHashes()
    const bad = []
    let refused = 0, emptied = 0, kept = 0
    for (const { file, name } of entries) {
      const key = `${file}#${name}`
      if (KEEP.has(key)) { kept++; continue }
      const r = await call(file, name, '/leads', [{}, {}, {}, {}])
      if (key in EMPTY) { if (r.value === EMPTY[key]) emptied++; else bad.push(`${key} → ${r.status} ${r.value.slice(0, 80)}`); continue }
      const words = errorOf(r.value)
      if (words === (DESKED(file, name) ? ON_DESK : GATE)) refused++; else bad.push(`${key} → ${r.status} ${r.value.slice(0, 100)}`)
    }
    const after = tableHashes()
    ok(bad.length === 0, `every one answers the rule’s words (${refused} refused, ${emptied} lists answer nothing)${bad.length ? ` — ${bad.slice(0, 6).join(' | ')}` : ''}`)
    ok(refused >= 450 && emptied === Object.keys(EMPTY).filter((k) => entries.some((e) => `${e.file}#${e.name}` === k)).length, `…all of them: ${refused} writes and reads refused, ${emptied} lists empty, ${kept} kept for Marketing`)
    ok(changedTables(before, after).length === 0, `nothing in the database changed${changedTables(before, after).length ? ` (${changedTables(before, after).join(', ')})` : ''}`)

    /* the words by family — a sample of each, read out */
    { const r = await call('app/visualizer/actions.ts', 'createDesign', '/visualizer', [{ name: 'S45C probe' }]); ok(errorOf(r.value) === GATE, 'the AI Visualizer: the gate’s own sentence') }
    { const r = await call('app/leads/quotes-actions.ts', 'createQuote', `/leads/${OLIVIA}/quotes`, [OLIVIA, null]); ok(errorOf(r.value) === ON_DESK, 'a lead’s Quotes tab: S44Z’s words (ON_DESK)') }
    { const r = await call('app/leads/quotes-actions.ts', 'fetchStageDocuments', `/leads/${VIVIEN}`, [VIVIEN]); ok(r.value === '{"quotes":[],"contracts":[]}', 'the Move stage window’s documents answer nothing for Marketing (no quote’s money) — its Quote Sent and Won are the designer’s') }

    { const tk = one(`select id from project_tickets order by created_at limit 1`); const r = await call('app/projects/tickets-actions.ts', 'readTicket', '/projects/tickets', [tk]); ok(errorOf(r.value) === GATE, 'a project’s ticket thread, read by hand: refused (it answered before)') }
    { const pr = one(`select id from projects where deleted_at is null order by created_at limit 1`); const r = await call('app/projects/choices-actions.ts', 'loadChoiceSources', `/projects/${pr}`, [pr]); ok(errorOf(r.value) === GATE, 'a project’s choice sources, read by hand: refused') }

    /* what Marketing keeps */
    { const r = await call('app/meetings/actions.ts', 'fetchHeldMeetingForMet', `/leads/${GERALD}`, [GERALD]); ok(r.status === 200 && errorOf(r.value) === null, 'kept: the Met step’s read of a held meeting (the Move stage window, every role)') }
    { const r = await call('app/credits/actions.ts', 'readCredits', '/leads', []); ok(r.status === 200 && errorOf(r.value) === null && r.value.startsWith('{'), 'kept: the rail’s credits read') }
    { const r = await call('app/planner/actions.ts', 'stampLayoutLinkView', '/space/x', ['no-such-link']); ok(r.value === '{"ok":true}', 'kept: a client’s link stamps nothing and asks no role') }
    { const r = await call('app/company/members-actions.ts', 'setMyAccepting', '/profile', [true]); ok(errorOf(r.value) === 'Marketing takes no leads', `Open to new leads answers in Marketing’s own words: "${errorOf(r.value)}"`) }
    { const r = await call('app/chat/actions.ts', 'startDirectChat', '/chat', ['dane']); ok(errorOf(r.value) === 'Messages are for the studio’s members — Marketing looks after the leads', `Messages refuse Marketing in its own words: "${errorOf(r.value)}"`) }
    { const r = await call('app/settings/meetings-actions.ts', 'fetchCompetitorNames', '/leads', []); ok(r.value.startsWith('['), 'kept: the Lost dialog’s competitor names') }
    { const r = await call('app/projects/tickets-actions.ts', 'ticketCategoryCounts', '/settings', []); ok(r.value.startsWith('{') && errorOf(r.value) === null, 'kept: Settings’ ticket-category counts (the page reads them for every role)') }

    /* Dane is served */
    as('dane')
    { const r = await call('app/visualizer/actions.ts', 'leadsToLink', '/visualizer', []); ok(r.value.startsWith('[{'), 'Dane: the Visualizer’s leads to link') }
    { const r = await call('app/leads/quotes-actions.ts', 'fetchStageDocuments', `/leads/${VIVIEN}`, [VIVIEN]); ok(/"quotes":\[\{/.test(r.value), 'Dane: the Move stage window’s documents') }
    { const item = one(`select item_id from price_book_changes order by at desc limit 1`); const r = await call('app/company/price-book-actions.ts', 'listItemHistory', '/company/price-book', [item]); ok(r.value.startsWith('[{'), 'Dane: an item’s History') }
    { const r = await call('app/company/templates-actions.ts', 'loadQuoteDocData', `/quotes/${Q1}`, [Q1]); ok(r.value.startsWith('{') && errorOf(r.value) === null, 'Dane: a quote’s document data') }
    { const r = await call('app/planner/actions.ts', 'readLinkableProjects', '/planner', []); ok(r.value.startsWith('[{'), 'Dane: the Planner’s projects to link') }
    { const r = await call('app/planner/photo-actions.ts', 'readPhotoTargets', '/planner', []); ok(/"options"/.test(r.value), 'Dane: the floor-plan photo’s places') }
    { const tk = one(`select id from project_tickets order by created_at limit 1`); const r = await call('app/projects/tickets-actions.ts', 'readTicket', '/projects/tickets', [tk]); ok(/"ticket"/.test(r.value), 'Dane: a ticket’s thread') }
    { const r = await call('app/projects/ending-actions.ts', 'listDeletedProjects', '/projects', []); ok(r.value.startsWith('[') && errorOf(r.value) === null, 'Dane: Deleted Projects') }
    { const was = one(`select accepting_leads from members where id='dane'`); const r = await call('app/company/members-actions.ts', 'setMemberAccepting', '/company/members', ['dane', was === '1']); ok(r.status === 200 && errorOf(r.value) === null && one(`select accepting_leads from members where id='dane'`) === was, 'Dane: a member’s switch (written as it was)') }

    /* a lead's Files: Marketing is offered no tool it can't open */
    console.log('   · a lead’s Files offer Marketing no tool it can’t open')
    const FILE = one(`select f.id from lead_files f where f.lead_id='${OLIVIA}' and f.kind='image' and f.deleted_at is null order by f.created_at limit 1`)
    renamedFile = { id: FILE, name: one(`select name from lead_files where id='${FILE}'`) }
    sql(`update lead_files set name='Floor plan — S45C.png' where id='${FILE}'`)
    const menuOf = async (p, shotName) => { await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 500); const t = (await p.locator('[role="menu"]').last().innerText().catch(() => '')).replace(/\s+/g, ' '); if (shotName) await shot(p, shotName); await p.keyboard.press('Escape'); await settle(p, 300); return t }
    await go(d, `/leads/${OLIVIA}/files/${FILE}`)
    const daneMenu = await menuOf(d, 'dane-file-menu-1440')
    ok(/Open in AI Visualizer|Open this version in AI Visualizer/.test(daneMenu) && /Trace a floor-plan photo/.test(daneMenu) /* (the calm UI build 2026-10-27, a deliberate change) 6-06 */, 'Dane: a picture offers Open in AI Visualizer, a floor plan Make a 3D picture')
    await D.close()
    as('nurul')
    const M = await desk(); const m = await page(M, 'nurul-1440')
    await go(m, `/leads/${OLIVIA}/files/${FILE}`)
    const nurulMenu = await menuOf(m, 'marketing-file-menu-1440')
    ok(nurulMenu.length > 0 && !/AI Visualizer/.test(nurulMenu) && !/Trace a floor-plan photo/.test(nurulMenu) /* (the calm UI build 2026-10-27, a deliberate change) 6-06 */ && /Show to client|Stop showing/.test(nurulMenu), 'Nurul (Marketing): the same menu without the two tools — the rest as it was')
    await go(m, `/leads/${OLIVIA}/files`)
    ok(await m.locator('main').count() === 1 && !(await m.locator('main').innerText()).includes('You don’t have access'), 'Nurul: the lead’s Files open as before')
    /* the Move stage window still opens for Marketing (its reads are kept) */
    await go(m, `/leads/${FARAH}`)
    await m.locator('[data-testid="header-primary"] button').first().click(); await settle(m, 1500)
    ok(await m.locator('[role="dialog"]').count() >= 1 && /Met/.test(await m.locator('[role="dialog"]').last().innerText()) && !/Couldn’t/.test(await snackText(m)), 'Nurul: Move to Met opens the Move stage window, its reads answered')
    await shot(m, 'marketing-move-stage-1440')
    await m.keyboard.press('Escape'); await settle(m, 400)
    for (const url of ['/leads', `/leads/${FARAH}/tasks`, `/leads/${FARAH}/notes`, `/leads/${FARAH}/questionnaire`, '/tasks', '/settings', '/company/integrations', '/company/reports/leads', '/dashboard', '/profile']) {
      await go(m, url)
      ok(!(await m.locator('[data-testid="access-gate"]').count()), `Nurul: ${url} opens as before`)
    }
    await M.close()
    const MP = await phoneCtx(); const mp = await page(MP, 'nurul-390')
    await go(mp, `/leads/${OLIVIA}/files`)
    ok(await sideways(mp) <= 0, 'Nurul at 390: a lead’s Files — no sideways scroll')
    await shot(mp, 'marketing-files-390')
    await MP.close()

    // ── 3 · sharp listed ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · sharp is listed at the version Next brought')
    {
      const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
      const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'))
      const installed = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules/sharp/package.json'), 'utf8')).version
      ok(pkg.dependencies.sharp === installed, `package.json lists sharp ${pkg.dependencies.sharp} — exactly the version in node_modules (${installed})`)
      ok(lock.packages[''].dependencies.sharp === installed && lock.packages['node_modules/sharp'].version === installed && !lock.packages['node_modules/sharp'].optional, 'the lockfile in step: the root lists it, its entry is no longer optional')
      ok(Object.keys(lock.packages).filter((k) => k.startsWith('node_modules/@img/sharp-')).every((k) => lock.packages[k].optional), '…its per-platform binaries stay optional')
      let png = null
      try { png = execSync(`node -e "require('sharp')({create:{width:4,height:2,channels:4,background:'#fff'}}).png().toBuffer().then(b=>process.stdout.write(String(b.length)))"`, { cwd: REPO }).toString() } catch { png = null }
      ok(Number(png) > 0, 'sharp loads and makes a PNG (the email logo’s copy)')
    }

    // ── 4 · pj-r2 · pj-r4b read their dates from the records ─────────────────────────────────────────────────────────────────
    console.log('4 · pj-r2 · pj-r4b (and pj-gap-a · pj-gap-c · pj-r6 · pj-r8) read their dates from the records')
    for (const f of ['verify-pj-r2.cjs', 'verify-pj-r4b.cjs', 'verify-pj-gap-a.cjs', 'verify-pj-gap-c.cjs', 'verify-pj-r6.cjs', 'verify-pj-r8.cjs']) {
      const src = fs.readFileSync(path.join(REPO, 'design-source/verify/projects', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
      const literal = [
        ...(src.match(new RegExp(`\\b\\d{1,2} (${MONTHS})\\b`, 'g')) ?? []),                    // a day written in
        ...(src.match(/'20\d\d-\d\d-\d\d'/g) ?? []),                                              // an ISO day written in
        ...(src.match(/\d\[\d-\d\] [A-Z][a-z]{2}/g) ?? []),                                      // a window of days: 1[5-8] Nov
        ...(src.match(/\\d\{1,2\} \(?[A-Z][a-z]{2}(\|[A-Z][a-z]{2})*\)?/g) ?? []).filter((m) => (m.match(/[A-Z][a-z]{2}/g) ?? []).length < 12),   // a window of months
      ]
      ok(literal.length === 0, `${f}: no literal day or day window left in what it asserts${literal.length ? ` (${literal.join(', ')})` : ''}`)
    }

    // ── 5 · the port's mapper on map 14 ──────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · 1.0’s per-vendor prices on map 14')
    {
      const map = fs.readFileSync(path.join(REPO, 'design-source/context/parity/14-price-book-migration-map-2026-09-25.md'), 'utf8')
      ok(/price_book_vendor_prices/.test(map) && /lib\/port\/price-book-vendor-prices\.ts/.test(map), 'map 14 names 1.0’s price_book_vendor_prices and the mapper that ports it')
      ok(fs.existsSync(path.join(REPO, 'lib/port/price-book-vendor-prices.ts')), 'the mapper is in lib/port/')
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 4).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    for (const [id, v] of keepQty) if (v !== '') sql(`update quote_items set qty=${v} where id='${id}'`)
    if (renamedFile) sql(`update lead_files set name='${renamedFile.name.replace(/'/g, "''")}' where id='${renamedFile.id}'`)
    sql(`update members set is_you = (id = '${you0 || 'dane'}')`)
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
