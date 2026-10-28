// Projects gaps build 2026-10-07 — package D, updates, choices and the portal (the owner's "build everything"; M-06 · M-07 and the report's §6).
// Each check asserts a rule: designs stay on the portal past their link's 7 days (1); the client says no — None of these work on a choice, the
// studio's band and Share again with its Undo, a variation order declined on its link and on Money (2); the client's bell rings for documents,
// files and designs (3); a pause told honestly — the hold card, a paused stage with the client's words, payment points, "You are here" (4); a
// stage's resolved note (5); CaseTrust — done on Company › Profile's registrations (one-home N-07) and the signing page's tick, kept on the record (6); selection receipts — the studio page,
// the Files entry, the portal (7); documents grouped (8); the questionnaire's answer history and the 5-minute ask (9); updates — named
// reviewers, the team's bell, ?new=1&milestone=, the portal's search, the invoice chip, before and after (10); choices — the team's note, a
// vendor, Save to Materials (11); the phone (390). Run against `next start -p 3124` on a fresh copy of the repaired scratch DB — never local.db.
// Everything it changes is put back in `finally`. Usage: NODE_PATH=$PWD/node_modules node verify-pj-gap-d.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-d')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || baseArg || 'http://localhost:3124'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim()
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `gapd-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`) } finally { fs.unlinkSync(f) } }
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`).toString().trim(); return out ? JSON.parse(out) : [] }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PHONE = { ben: '97731968', ryan: '97551246', kevin: '96882109' }
const STUB = `(() => { window.__wa = []; const o = window.open.bind(window); window.open = (u, ...a) => { if (String(u).startsWith('https://wa.me')) { window.__wa.push(String(u)); return null } return o(u, ...a) } })()`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you = sql(`select id from members where is_you = 1`)
  const ryan = P('P-2026-001'), ben = P('P-2026-002'), aisha = P('P-2026-003')
  const leadOf = (pid) => sql(`select lead_id from projects where id='${pid}'`)
  const ryanLead = leadOf(ryan), benLead = leadOf(ben), aishaLead = leadOf(aisha)
  const olivia = sql(`select id from leads where name='Olivia Martinez'`), kevin = sql(`select id from leads where name='Kevin Ng'`)
  const leads = `'${ryanLead}','${benLead}','${aishaLead}','${olivia}','${kevin}'`, ids = `'${ryan}','${ben}','${aisha}'`
  const VO2 = sql(`select id from quotes where kind='variation' and number='VO-2' and project_id='${ryan}'`)
  const AVO = sql(`select id from quotes where kind='variation' and project_id='${aisha}' and number='VO-1'`)
  const TILES = sql(`select id from project_selections where project_id='${ryan}' and title='Bathroom tiles'`)
  const PAINT = sql(`select id from project_selections where project_id='${ben}' and title='Paint colours'`)
  const TOP = sql(`select id from project_selections where project_id='${ben}' and title='Kitchen countertop'`)
  const EL = sql(`select id from project_milestones where project_id='${ben}' and title='Electrical & plumbing' and deleted_at is null`)
  const OLIVIA_C = sql(`select id from contracts where lead_id='${olivia}' and deleted_at is null limit 1`)
  const KEPT_LINK = sql(`select id from render_share_links where lead_id='${kevin}' and expires_at < strftime('%s','now') and revoked_at is null limit 1`)
  /* what the run may change, kept to put back */
  const SNAP = [
    ['projects', `id in (${ids})`], ['project_milestones', `project_id in (${ids})`], ['project_selections', `project_id in (${ids})`], ['project_selection_options', `selection_id in (select id from project_selections where project_id in (${ids}))`],
    ['quotes', `lead_id in (${leads})`], ['quote_items', `quote_id in (select id from quotes where lead_id in (${leads}))`], ['project_invoices', `project_id in (${ids})`],
    ['project_updates', `project_id in (${ids})`], ['project_update_files', `update_id in (select id from project_updates where project_id in (${ids}))`],
    ['contracts', `lead_id in (${leads})`], ['lead_tasks', `lead_id in (${leads})`], ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`],
    ['lead_events', `lead_id in (${leads})`], ['notifications', '1'], ['settings', `key in ('casetrust','compliance_studio','project_update_review')`],
    ['questions', `lead_id in (${leads})`], ['question_answer_history', `lead_id in (${leads})`], ['homeowner_lead_links', `lead_id in (${leads})`],
    ['portal_bell_reads', '1'], ['studio_materials', '1'], ['price_book_items', '1'], ['price_book_changes', '1'], ['lead_files', `lead_id in (${leads})`],
    ['notification_outbox', '1'],   // (simplify S-21) Share again tells the client — "A choice to make"
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const profiles = json(`select * from homeowner_profiles`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `DELETE FROM homeowner_profiles WHERE id NOT IN (${profiles.map((r) => lit(r.id)).join(',') || "''"});\n`
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  const ctxOf = async (o) => { const c = await b.newContext(o); await c.addInitScript(STUB); await c.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>WhatsApp</p>' })); return c }
  const desk = () => ctxOf({ viewport: { width: 1440, height: 1024 } })
  const phone = () => ctxOf({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  as('dane')
  try {
    // ── 1 · Designs stay on the portal (M-06) ─────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Designs stay on the portal')
    const K = await desk(); const k = await K.newPage(); watch(k, 'kevin')
    await signIn(k, PHONE.kevin)
    await go(k, '/my/demo-studio/designs')
    const cards = k.locator('[data-testid="portal-design-link"]')
    ok(await cards.count() >= 2, 'Kevin’s Designs lists the link that still opens and the one whose 7 days ran out')
    const keptCard = cards.filter({ has: k.locator('[data-testid="portal-design-kept"]') }).first()
    ok(await keptCard.count() === 1 && await keptCard.locator('[data-testid="portal-design-open"]').count() === 0 && !/open until/.test(await keptCard.innerText()), 'the expired one stays — no "open until", no Open, the line that says its link closed')
    const src = await keptCard.locator('img').first().getAttribute('src')
    ok(!!src && src.startsWith('/my/demo-studio/design/'), 'its pictures come through the portal’s own route, never the link’s token')
    const loaded = await keptCard.locator('img').first().evaluate((i) => i.complete && i.naturalWidth > 0)
    ok(loaded, 'the expired link’s picture still opens for the signed-in client')
    await keptCard.locator('[data-testid="portal-design"]').first().click(); await settle(k, 700)
    ok(await dialog(k).isVisible(), 'a picture of it opens the portal’s viewer')
    await shot(k, 'designs-kept-1440')
    await k.keyboard.press('Escape'); await settle(k, 400)
    const anon = await b.newContext(); const a = await anon.newPage()
    const r = await a.request.get(BASE + src, { maxRedirects: 0 }).catch(() => null)
    ok(!!r && r.status() !== 200, 'the same address refuses anyone not signed in')
    const token = sql(`select token from render_share_links where id='${KEPT_LINK}'`)
    await go(a, `/renders/${token}`)
    ok(/This link has ended|It was open until/i.test(await a.locator('body').innerText()), 'the no-login link itself has ended (the 7 days stay on it)')
    await anon.close()
    // the bell: a design newly shared rings on Kevin's bell (3)
    await k.locator('[data-testid="portal-bell"]').click(); await settle(k, 900)
    ok(await k.locator('[data-testid="portal-bell-row"][data-kind="design_shared"]').count() >= 1, '3 · Kevin’s bell has the designs shared with him')
    await K.close()

    // ── 2 · The client can say no (M-07) ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · The client can say no')
    const R = await desk(); const rp = await R.newPage(); watch(rp, 'ryan')
    await signIn(rp, PHONE.ryan)
    await go(rp, '/my/demo-studio/choices')
    const tiles = rp.locator(`[data-choice-id="${TILES}"]`)
    ok(/With your designer/.test(await rp.locator('[data-testid="portal-choices"]').innerText()) && await tiles.getAttribute('data-status') === 'declined', 'Ryan’s Bathroom tiles sits under With your designer')
    ok(/You asked for other options on/.test(await tiles.locator('[data-testid="portal-choice-declined"]').innerText()), 'its foot says what he answered, and when')
    await shot(rp, 'portal-choice-declined-1440', true)
    // the bell: the variation order he declined rings as a document (3)
    await rp.locator('[data-testid="portal-bell"]').click(); await settle(rp, 900)
    ok(await rp.locator('[data-testid="portal-bell-row"][data-kind="variation_to_approve"]').count() >= 1, '3 · Ryan’s bell has the variation order sent to him')
    await rp.keyboard.press('Escape')
    // the studio's side: the band, Share again and its Undo
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio')
    await go(s, `/projects/${ryan}/choices`)
    const card = s.locator(`[data-choice-id="${TILES}"]`)
    ok(/Ryan asked for other options/.test(await card.locator('[data-testid="choice-answer"]').innerText()) && /Other options asked/i.test(await card.locator('[data-testid="choice-state"]').innerText()), 'the studio card: who said no, the answer, the chip')
    ok(/Hafary/.test(await card.locator('[data-testid="choice-option"]').first().innerText()), '11 · an option’s vendor on its tile')
    await shot(s, 'studio-choice-declined-1440')
    await card.locator('[data-testid="choice-share-again"]').click(); await settle(s, 1600)
    ok(sql(`select status || '|' || coalesce(client_answer,'') from project_selections where id='${TILES}'`) === 'shared|', 'Share again: shared, the answer cleared')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1600)
    ok(sql(`select status || '|' || client_answer from project_selections where id='${TILES}'`) === 'declined|other_options', 'its Undo puts Ryan’s no back')
    // Benjamin turns the paint colours down on his portal
    const B1 = await desk(); const bp = await B1.newPage(); watch(bp, 'ben')
    await signIn(bp, PHONE.ben)
    await go(bp, '/my/demo-studio/choices')
    const paint = bp.locator(`[data-choice-id="${PAINT}"]`)
    await paint.locator('[data-testid="portal-choice-none"]').click(); await settle(bp, 600)
    await dialog(bp).getByTestId('portal-choice-none-send').click(); await settle(bp, 400)
    ok(/Say what you’d like instead/.test(await dialog(bp).innerText()), 'Send with no reason is refused in the form')
    await dialog(bp).getByRole('radio', { name: 'Turn them down' }).click()
    await dialog(bp).getByTestId('portal-choice-none-note').locator('textarea').fill('None of the three suit the light in our flat')
    await dialog(bp).getByTestId('portal-choice-none-send').click(); await settle(bp, 1800)
    ok(sql(`select status || '|' || client_answer from project_selections where id='${PAINT}'`) === 'declined|reject', 'Benjamin’s Turn them down lands: declined, its answer')
    ok(Number(sql(`select count(*) from notifications where kind='choice_declined' and href like '%${PAINT}%'`)) >= 1 && Number(sql(`select count(*) from lead_events where kind='project_choice_declined' and json_extract(detail,'$.id')='${PAINT}'`)) === 1, 'his team is told (bell) and Activity files it')
    await go(s, `/projects/${ben}`)
    /* (simplify S-01, a deliberate change of this rule) a Needs you row — past the first six it rests under "Show n more" */
    { const more = s.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await s.waitForTimeout(300) } }
    ok(/said no to Paint colours/.test(await s.locator('body').innerText()), 'the project is raised: “… said no to Paint colours”')
    // a variation order declined on its link — Ryan's VO-2 reads Declined; Aisha declines hers
    await go(s, `/confirm/${VO2}`)
    ok(/Declined/.test(await s.locator('[data-testid="vo-declined-title"]').innerText()) && /keep the study lights/.test(await s.locator('body').innerText()), 'Ryan’s VO-2 link reads Declined with his reason')
    await go(s, `/confirm/${AVO}`)
    await s.locator('[data-testid="vo-decline"]').click(); await settle(s, 500)
    await dialog(s).getByRole('button', { name: 'Decline' }).click(); await settle(s, 400)
    ok(/Say why/.test(await dialog(s).innerText()), 'Decline with no reason is refused in the form')
    await dialog(s).getByTestId('vo-decline-note').locator('textarea').fill('We’d like to keep the study wardrobe after all')
    await dialog(s).getByRole('button', { name: 'Decline' }).click(); await settle(s, 1800)
    ok(sql(`select declined_note from quotes where id='${AVO}'`) === 'We’d like to keep the study wardrobe after all' && sql(`select status from quotes where id='${AVO}'`) === 'Sent to Client', 'the decline is on the order — reason kept, still Sent to Client')
    ok(await s.locator('[data-testid="vo-declined"]').isVisible(), 'the card says it was declined')
    await shot(s, 'vo-declined-1440')
    await go(s, `/projects/${aisha}/money`)
    ok(await s.locator('[data-testid="vo-declined"]').count() >= 1 && /Declined by the client/i.test(await s.locator('[data-testid="money-variations"]').innerText()), 'Money says “Declined by the client”')
    ok(await s.locator('[data-testid="money-story"]').count() === 0, 'the story sentence is gone — the VO’s row says it was declined (simplify S-07, a deliberate change of this rule)')
    ok(Number(sql(`select count(*) from notifications where kind='variation_declined' and quote_id='${AVO}'`)) >= 1, 'the studio is told (variation_declined)')

    // ── 4 · 5 · A pause told honestly; a stage's resolved note ──────────────────────────────────────────────────────────────────────
    console.log('4 · 5 · A pause, payments, you are here, a resolved note')
    const DAY = 86400
    sql(`update projects set on_hold_at = ${Date.now()}, on_hold_reason = 'Waiting for the management’s renovation permit', on_hold_until = ${new Date(2026, 10, 16).getTime()}, on_hold_by = 'dane' where id='${ryan}'`)
    const blocked = sql(`select m.id from project_milestones m where m.project_id='${ryan}' and m.deleted_at is null and m.status in ('in_progress','not_started') order by m.position limit 1`)
    sql(`update project_milestones set status='blocked', client_note='The carpenter’s shop is closed this week' where id='${blocked}'`)
    await go(rp, '/my/demo-studio')
    ok(/Paused — Waiting for the management’s renovation permit · resuming around 16 Nov/.test(await rp.locator('[data-testid="portal-hold"]').first().innerText()), 'Home leads with “Paused — {reason} · resuming around {day}”')
    await go(rp, '/my/demo-studio/schedule')
    ok(await rp.locator('[data-testid="portal-hold"]').count() >= 1, 'the Schedule says it too')
    const shared = sql(`select snapshot from project_schedule_shares where project_id='${ryan}' order by shared_at desc limit 1`)
    if (shared.includes(blocked)) {
      const row = rp.locator(`[data-testid="portal-stage"][data-stage-id="${blocked}"]`)
      ok(/Paused/.test(await row.innerText()) && /carpenter’s shop is closed/.test(await row.innerText()), 'a blocked stage reads Paused, with the words written for the client')
    } else ok(true, '(the blocked stage is not in Ryan’s last share — the pause rides on the hold card)')
    ok(await rp.locator('[data-testid="portal-stage-here"]').count() === 1, 'one row says “You are here”')
    ok(await rp.locator('[data-testid="portal-stage-payment"]').count() >= 1 && /Paid|Due|Not invoiced yet/.test(await rp.locator('[data-testid="portal-stage-payment"]').first().innerText()), 'payment points ride on their stages')
    await shot(rp, 'portal-schedule-paused-1440', true)
    await go(bp, '/my/demo-studio/schedule')
    ok(/Moved both kitchen sockets up/.test(await bp.locator(`[data-testid="portal-stage"][data-stage-id="${EL}"]`).innerText()), '5 · Benjamin’s Electrical & plumbing carries the studio’s resolved note')

    // ── 7 · 8 · Selection receipts; documents grouped ───────────────────────────────────────────────────────────────────────────────
    console.log('7 · 8 · Selection receipts, documents grouped')
    await go(s, `/projects/${ben}/choices`)
    const top = s.locator(`[data-choice-id="${TOP}"]`)
    ok(await top.locator('[data-testid="choice-receipt"]').isVisible(), 'the chosen countertop names its selection receipt')
    await top.locator('[data-testid="choice-open-receipt"]').click(); await s.waitForURL(/selection-receipts/).catch(() => {}); await settle(s, 1400)
    const paper = await s.locator('[data-testid="selection-receipt"]').innerText()
    ok(/Selection receipt/i.test(paper) && /Calacatta|Solid surface|Oak laminate/.test(paper) && /Fingerprint/i.test(paper), 'the receipt page: the options, the pick, the fingerprint')
    ok(sql(`select receipt_hash from project_selections where id='${TOP}'`).replace(/(.{4})/g, '$1 ').startsWith(paper.match(/[0-9a-f]{4}( [0-9a-f]{4}){3}/)?.[0] ?? 'x'), 'the fingerprint printed is the one kept on the choice')
    await shot(s, 'selection-receipt-1440', true)
    const fileId = sql(`select receipt_file_id from project_selections where id='${TOP}'`)
    await go(s, `/projects/${ben}/files/${fileId}`)
    ok(/selection-receipts/.test(s.url()), 'its Files › Choices entry opens the receipt')
    await go(bp, '/my/demo-studio/choices')
    ok(await bp.locator('[data-testid="portal-choice-receipt"]').count() >= 1, 'the client’s chosen countertop links its receipt')
    await go(bp, '/my/demo-studio/files')
    const groups = await bp.locator('[data-testid="portal-documents-group"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-group')))
    ok(groups.includes('selections') && groups.includes('agreements') && groups.indexOf('agreements') < groups.indexOf('selections'), `8 · Files › Documents grouped by kind, in order (${groups.join(', ')})`)
    await bp.locator('[data-testid="portal-documents-group"][data-group="selections"] a').first().click(); await bp.waitForURL(/choices\/receipt/).catch(() => {}); await settle(bp, 1200)
    ok(await bp.locator('[data-testid="selection-receipt"]').isVisible() && /Back to Files/.test(await bp.locator('[data-testid="portal-doc-back"]').innerText()), 'the portal’s receipt opens in its frame, back to Files')
    await shot(bp, 'portal-receipt-1440')

    // ── 9 · The questionnaire's history; the 5-minute ask ───────────────────────────────────────────────────────────────────────────
    console.log('9 · Answer history, the ask’s pace')
    await go(s, `/leads/${olivia}/questionnaire`)
    ok(await s.locator('[data-testid="question-history"]').count() === 1, 'one answer was changed — its card carries the clock')
    await s.locator('[data-testid="question-history"]').click(); await settle(s, 600)
    const hist = await dialog(s).innerText()
    ok(/60000/.test(hist) && /70500/.test(hist) && /Dane/.test(hist), 'the history: 60000 → 70500, by Dane, and the first answer')
    await shot(s, 'answer-history-1440')
    await s.keyboard.press('Escape'); await settle(s, 400)
    sql(`update homeowner_lead_links set last_asked_at = ${Math.floor(Date.now() / 1000) - 60} where lead_id='${olivia}'`)
    if (sql(`select count(*) from homeowner_lead_links where lead_id='${olivia}'`) === '0') sql(`insert into homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, created_at, last_asked_at) values ('probe-olivia-link', (select id from homeowner_profiles limit 1), '${olivia}', 'probe-olivia-token', 1, ${Math.floor(Date.now() / 1000)}, ${Math.floor(Date.now() / 1000) - 60})`)
    await s.locator('[data-testid="ask-client"]').first().click(); await settle(s, 1200)   // (the calm UI build 2026-10-27, a deliberate change) B2: "Ask {client}" — pressed by its handle
    /* (parity map, CP-110 — a deliberate change of this rule) the pace is read when Ask the client opens: Send rests and the dialog says when it
       may go, before the press (WhatsApp now opens on the press, so a send the server would refuse is never started); the server still refuses */
    ok(/ask again after/.test(await dialog(s).locator('[data-testid="ask-block"]').innerText()) && await dialog(s).locator('[data-testid="ask-send"]').isDisabled(), 'a second ask within five minutes is refused, saying when it may go')
    await s.keyboard.press('Escape'); await settle(s, 400)

    // ── 10 · Updates ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · Named reviewers, the team’s bell, a milestone’s composer, the portal’s search, the invoice chip, before and after')
    await go(s, '/settings?section=projects')
    ok(/Owners and Admins/.test(await s.locator('[data-testid="update-reviewers"]').innerText()), 'Who reviews: Owners and Admins')
    await s.locator('[data-testid="update-reviewers-change"]').click(); await settle(s, 600)
    await dialog(s).getByRole('checkbox', { name: 'Germaine' }).click({ force: true })
    await dialog(s).getByTestId('update-reviewers-save').click(); await settle(s, 1400)
    ok(/Germaine/.test(await s.locator('[data-testid="update-reviewers"]').innerText()) && /germaine/.test(sql(`select value from settings where key='project_update_review'`)), 'Germaine is named — and the rule keeps her')
    as('germaine')
    await go(s, `/projects/${ben}/updates?new=1&milestone=${EL}`); await settle(s, 900)
    ok(await dialog(s).isVisible() && /Electrical & plumbing/.test(await dialog(s).innerText()), '?new=1&milestone= opens the composer with that milestone picked')
    await dialog(s).getByLabel('Title').fill('Probe — sockets checked again')
    await dialog(s).getByTestId('composer-post').click(); await settle(s, 1800)
    const posted = sql(`select status from project_updates where project_id='${ben}' and title='Probe — sockets checked again'`)
    ok(posted === 'published', 'a named reviewer’s post goes out at once')
    ok(Number(sql(`select count(*) from notifications where kind='update_published' and title like '%Probe — sockets checked again%'`)) >= 1 && sql(`select count(*) from notifications where kind='update_published' and member_id='germaine' and title like '%Probe —%'`) === '0', 'the project’s team hears it went out — never who sent it')
    as('dane')
    await go(bp, '/my/demo-studio/updates')
    const total = await bp.locator('[data-testid="client-update"]').count()
    if (total > 3) {
      await bp.getByLabel('Search updates').fill('water test'); await settle(bp, 600)
      ok(await bp.locator('[data-testid="client-update"]').count() < total, 'past three updates a search narrows the feed')
      await bp.getByLabel('Search updates').fill(''); await settle(bp, 500)
    } else ok(true, '(three updates or fewer — no search, by the rule)')
    ok(await bp.locator('[data-testid="portal-update-invoice"]').count() >= 1, 'an update on an invoiced stage carries its invoice chip')
    const cmp = bp.locator('[data-testid="client-update-compare"]').first()
    if (await cmp.count()) { await cmp.click(); await settle(bp, 700); ok(await bp.locator('[data-testid="photo-compare-slider"]').isVisible(), 'Compare before and after opens the slider'); await shot(bp, 'compare-1440'); await bp.keyboard.press('Escape') }
    else ok(true, '(no update with two photos — no Compare, by the rule)')

    // ── 6 · CaseTrust ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · CaseTrust')
    /* (one-home N-07, a deliberate change of this rule) CaseTrust is recorded once, with the studio's other registrations, on Company › Profile
       (settings `compliance_studio`); the Settings › Quotes & pricing switch is gone. */
    const ctOn = () => sql(`select coalesce(json_extract(value,'$.CASETRUST_RENOVATION.done'),'') from settings where key='compliance_studio'`) === '1'
    await go(s, '/settings?section=quotes')
    ok(await s.locator('[data-testid="casetrust-setting"]').count() === 0, 'Settings › Quotes & pricing has no CaseTrust switch of its own')
    /* (the calm UI build 2026-10-27, a deliberate change — 5-36) Company › Profile is four tabs; the registrations are on its Registrations tab */
    await go(s, '/company/profile?tab=registrations')
    const ctRow = s.locator('[data-testid="registration"][data-id="CASETRUST_RENOVATION"]')
    await ctRow.scrollIntoViewIfNeeded()
    if (!ctOn()) { await ctRow.locator('label').first().click().catch(() => {}); await settle(s, 1200) }
    if (!ctOn()) { await ctRow.getByRole('switch').click({ force: true }).catch(() => {}); await settle(s, 1200) }
    ok(ctOn(), 'CaseTrust done on Company › Profile turns the disclosure on')
    sql(`update contracts set status='Sent to Client', sent_at=${Math.floor(Date.now() / 1000)} where id='${OLIVIA_C}'`)
    /* (S42 B-01) an agreement whose quote is still a Draft awaiting approval waits ("Not ready yet") — the studio sends the quote first */
    sql(`update quotes set status='Sent to Client', client_sent_at=coalesce(client_sent_at, ${Math.floor(Date.now() / 1000)}) where id=(select from_quote_id from contracts where id='${OLIVIA_C}')`)
    const G = await desk(); const g = await G.newPage(); watch(g, 'sign')
    await go(g, `/sign/${OLIVIA_C}`)
    await g.locator('[data-testid="paper-end"]').scrollIntoViewIfNeeded(); await settle(g, 600)
    ok(await g.locator('[data-testid="gate-casetrust"]').isVisible() && /CaseTrust deposit protection/.test(await g.locator('[data-testid="gate-casetrust"]').innerText()), 'the signing page carries the disclosure')
    const sendCode = g.getByRole('button', { name: 'Send code' }).first()
    ok(await sendCode.isDisabled(), 'Send code waits for the tick')
    await g.locator('[data-testid="gate-casetrust-tick"]').click(); await settle(g, 400)
    await shot(g, 'casetrust-1440')
    await sendCode.click(); await settle(g, 500)
    await g.getByLabel('One-time code').fill('123456'); await g.getByRole('button', { name: 'Verify' }).click(); await settle(g, 500)
    await g.getByRole('button', { name: 'Sign contract' }).click(); await settle(g, 2200)   // (the close-out 2026-10-28, a deliberate change) C-52: "contract" on the signing pages
    ok(sql(`select casetrust_at is not null and status='Signed' from contracts where id='${OLIVIA_C}'`) === '1', 'signed with the tick kept on the contract')
    ok(/CaseTrust disclosure/.test(await g.locator('[data-testid="signing-record"]').innerText()), 'the signing record shows it')
    await G.close()

    // ── 11 · Choices: the team's note, Save to Materials ────────────────────────────────────────────────────────────────────────────
    console.log('11 · The team’s note, Save to Materials')
    await go(s, `/projects/${ben}/choices`)
    const top2 = s.locator(`[data-choice-id="${TOP}"]`)
    await top2.locator('[data-testid="choice-kebab"]').click(); await settle(s, 400)
    await s.getByRole('menuitem', { name: 'Edit' }).click(); await settle(s, 700)
    await dialog(s).getByLabel('A note for the team').fill('Supplier quoted 3 weeks for the quartz')
    await dialog(s).getByTestId('choice-save').click(); await settle(s, 1500)
    ok(/Supplier quoted 3 weeks/.test(await top2.locator('[data-testid="choice-team-note"]').innerText()), 'the card shows the team’s note')
    await go(bp, '/my/demo-studio/choices')
    ok(!/Supplier quoted 3 weeks/.test(await bp.locator('body').innerText()), 'the client never reads it')
    await go(s, `/projects/${ben}/choices`)
    const up = s.locator(`[data-choice-id="${TOP}"] [data-testid="choice-option"]`).filter({ hasText: 'Solid surface' }).first()
    await up.hover(); await up.locator('[data-testid="option-kebab"]').click(); await settle(s, 400)
    await s.getByRole('menuitem', { name: /Save to Materials/ }).click(); await settle(s, 700)
    await dialog(s).getByTestId('save-option').click(); await settle(s, 1800)
    ok(Number(sql(`select count(*) from studio_materials where name='Solid surface, Arctic White' and deleted_at is null`)) === 1 && sql(`select source from project_selection_options where selection_id='${TOP}' and name='Solid surface, Arctic White'`) === 'material', 'Save to Materials makes the material and the option names its new source')

    // ── the phone (390) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The phone (390)')
    const RP = await phone(); const rq = await RP.newPage(); watch(rq, 'ryan-phone')
    await signIn(rq, PHONE.ryan)
    await go(rq, '/my/demo-studio/choices')
    ok(await rq.locator(`[data-choice-id="${TILES}"] [data-testid="portal-choice-declined"]`).isVisible() && await noOverflow(rq), '390: the declined choice reads in full, no sideways scroll')
    await shot(rq, 'portal-choice-declined-390', true)
    await go(rq, '/my/demo-studio/schedule')
    ok(await rq.locator('[data-testid="portal-hold"]').first().isVisible() && await noOverflow(rq), '390: the hold card on the schedule, no sideways scroll')
    await shot(rq, 'portal-schedule-paused-390', true)
    await RP.close()
    const KP = await phone(); const kq = await KP.newPage(); watch(kq, 'kevin-phone')
    await signIn(kq, PHONE.kevin)
    await go(kq, '/my/demo-studio/designs')
    ok(await kq.locator('[data-testid="portal-design-kept"]').isVisible() && await noOverflow(kq), '390: the kept design and its line, no sideways scroll')
    await shot(kq, 'designs-kept-390', true)
    await KP.close()
    const SP = await phone(); const sq = await SP.newPage(); watch(sq, 'studio-phone')
    await go(sq, `/projects/${ryan}/choices`)
    ok(await sq.locator(`[data-choice-id="${TILES}"] [data-testid="choice-answer"]`).isVisible() && await noOverflow(sq), '390: the studio’s band for a no, no sideways scroll')
    await shot(sq, 'studio-choice-declined-390', true)
    await go(sq, `/confirm/${VO2}`)
    /* (quotes on the move, a deliberate change of this rule) on a phone the declined state is the sticky bar's line, with the client's reason (K4, P-12) */
    ok(await sq.locator('[data-testid="vo-declined-bar"]').isVisible() && /keep the study lights/.test(await sq.locator('[data-testid="confirm-bar"]').innerText()) && await noOverflow(sq), '390: the declined variation order’s bar, with the reason')
    await shot(sq, 'vo-declined-390', true)
    await SP.close()
    await R.close(); await S.close(); await B1.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' · ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    sql(`update members set is_you = (id = '${you}')`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
