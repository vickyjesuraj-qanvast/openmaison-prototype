// S44Q · The quote editor, sending and the client's pages — the UAT comments, rows 246–364 (Vicky 2026-10-15: "fix all the UAT comments based
// on our 2.0 experience … If you have any questions please go ahead based on your recommendations"; triage
// design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md, area Q and §12). Each item asserted as the rule it builds:
//  1 · SECURITY (§12.1): rich text a studio or a crafted request stored — a script, a picture's error handler, a script link, an iframe, a
//      paragraph's click handler — never runs or survives on any page: the client's /confirm/<token>, /quote/<token>, /sign/<token>/quote,
//      the studio's Preview, the editor (its description dialog and the T&Cs editor), a lead's note, the Price book's item; a client's name
//      resolved into the T&Cs ({client_name}) goes in as words. The editors' saves store the allowlist's markup only.
//  2 · §12.2 · row 357: confirming with "Optional works" off stores no answer; Settings › Quotes & pricing › "Clients may pick optional items on
//      the confirmation link" off → the link lists them read-only with "Ask {designer} to add it" (the ask names the work) and stores no answer;
//      on → the client ticks and the answer is stored.
//  3 · §12.10 · row 312: a quote started blank is pinned to the default template's version (R173 pinned the older ones).
//  4 · row 334: an approver's Send on an agreement naming their Draft quote (approval required) goes, saying so first, and approves the quote
//      on the record as theirs; a Designer is still held, with the rule.
//  5 · row 256: {gst_rate} prints the quote's rate, never its first line's 0%.
//  6 · §12.15 · row 321: the printed T&Cs keep their lists (bullets, numbers that count on), alignment and blank lines; numbered paragraphs
//      count paragraphs only.
//  7 · row 311: a T&Cs template's [Studio Name] lands on a quote as {studio_name} and prints the quote's issuing entity.
//  8 · row 352: a client-view switch changed just before leaving Preview is kept; re-picking the template keeps it where it applies; only the
//      quote's own choices are stored.
//  9 · the editor's client view pane names a second client as it is typed (§12.8); the Settings card and its ⌘K entry; no page errors; no
//      sideways scroll at 390 / 320.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3185 NODE_PATH=<repo>/node_modules node verify-pm2-s44q.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44q')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3185'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const esc = (s) => s.replace(/'/g, "''")
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
/* the demo's records (fixed ids) */
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'     // OM-10007 · Sent to Client · its confirmation token is its id
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838', Q1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'     // OM-10001 · Draft · Dane's
const C_OLIVIA = '81463786-769d-42aa-b226-192081cfd6e6'                                              // the Draft agreement naming OM-10001
const C_RYAN = '301fe7ef-3cd9-47bb-a159-daacd92d7408', Q4 = '1f598389-4008-4079-a956-5dff071fb708'    // Ryan's signed agreement · OM-10004
const FARAH = 'c9691890-3132-4902-9c2a-d251f6bfda9a'                                                 // a lead with no quote (From Scratch)
const DEFAULT_TPL = sql(`select id || '|' || version from quote_templates where is_default = 1 and status = 'published' and deleted_at is null`).split('|')
const BTO4 = '9f3a6a9b-5309-4d36-a27a-cee983e91028'
const PB_ITEM = 'd962133c-b692-415d-ad0a-ee93b40e2127'
const VIEW_TOKEN = 'probeS44QviewTokenAAAA'
/* what a stored body tries: a script, a picture's error handler, a script link, an iframe, a paragraph's click handler */
const PAYLOAD = '<p>Probe safe words</p><script>window.__pwned=(window.__pwned||0)+1</script><img src="x" onerror="window.__pwned=(window.__pwned||0)+1"><a href="javascript:window.__pwned=1">probe link</a><iframe srcdoc="x"></iframe><p onclick="window.__pwned=1" style="text-align: center">Probe centred</p>'
/* what a member's browser might send from the editor (a crafted body) — its own marker, so the studio's page running it never counts as a leak */
const INJECT = 'PROBEMARK</b><script>window.__typed=1</script><img src=x onerror=window.__typed=1><a href=javascript:window.__typed=1>typed link</a><b>'
const NOTE_ID = 'probe-s44q-note'

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* ── what the probe changes, kept to put back ── */
  const you0 = sql(`select id from members where is_you = 1`)
  const qCols = 'sections, client2_name, client2_nric, status, sent_at, client_sent_at, confirmed_at, confirmed_by, visibility, updated_at, terms_html, notes_html, client_view_json, template_id, template_version, view_token, view_token_at, view_token_by, client_viewed_at, client_last_viewed_at, client_view_count, prepared_json, approved_at, approved_by, change_asked_at, change_asked_note, issuing_entity, terms_visible, notes_visible'
  const keep = (id) => sql(`select ${qCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quotes where id = '${id}'`)
  const putBack = (id, row) => { const v = row.split('§'); sql(`update quotes set ${qCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const kept = Object.fromEntries([Q7, Q1, Q4].map((id) => [id, keep(id)]))
  const iCols = 'description_html, optional, client_choice, gst_pct, updated_at'
  const items = [Q7, Q1, Q4].flatMap((q) => sql(`select id from quote_items where quote_id = '${q}'`).split('\n').filter(Boolean))
  const itemsKept = Object.fromEntries(items.map((id) => [id, sql(`select ${iCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from quote_items where id = '${id}'`)]))
  const putItem = (id, row) => { const v = row.split('§'); sql(`update quote_items set ${iCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${id}'`) }
  const cCols = 'status, sent_at, sent_by, sign_expires_at, sign_token, recipient_name, recipient_phone, updated_at, bundle_id, bundle_position'
  const cKept = sql(`select ${cCols.split(', ').map((c) => `quote(${c})`).join(" || '§' || ")} from contracts where id = '${C_OLIVIA}'`)
  const putContract = () => { const v = cKept.split('§'); sql(`update contracts set ${cCols.split(', ').map((c, i) => `${c} = ${v[i]}`).join(', ')} where id = '${C_OLIVIA}'`) }
  const serena0 = sql(`select quote(name) from leads where id = '${SERENA}'`)
  const rules0 = sql(`select quote(value) from settings where key = 'quote_rules'`)
  const brand0 = sql(`select quote(value) from settings where key = 'brand'`)
  const pb0 = sql(`select quote(description_html) from price_book_items where id = '${PB_ITEM}'`)
  const Q7_LINE = '9e3e1fce-640b-49e8-a0cf-b188df4da1a6', Q7_GROUP = '4463d803-fd72-402a-a509-651902e92c94', Q7_OPT = '083da0eb-b33f-4ab2-a376-c568fb7b6c43'
  const Q1_LINE = '99c85854-edbd-4f74-a56f-c43183aa4bc6'   // OM-10001's "Design consultation and 3D drawings" — its description is formatted
  const Q4_LINE = sql(`select id from quote_items where quote_id = '${Q4}' and kind = 'item' order by position limit 1`)
  const quotes0 = new Set(sql(`select id from quotes`).split('\n').filter(Boolean))
  const trail = ['notifications', 'notification_outbox', 'lead_events', 'lead_tasks']
  const trail0 = Object.fromEntries(trail.map((t) => [t, new Set(sql(`select id from ${t}`).split('\n').filter(Boolean))]))

  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  /** nothing of a payload survives in the page: no handler ran, no handler / script link / iframe / payload script is in the DOM */
  const clean = (p) => p.evaluate(() => ({
    ran: typeof window.__pwned !== 'undefined',
    handlers: document.querySelectorAll('[onerror],[onclick],[onload]').length,
    jsLinks: document.querySelectorAll('a[href^="javascript:" i]').length,
    frames: document.querySelectorAll('iframe[srcdoc]').length,
    /* a payload's own <script> element (the page's data scripts carry the stored words as JSON strings — data, never run) */
    scripts: [...document.querySelectorAll('script')].filter((s) => /^\s*window\.__(pwned|typed)/.test(s.textContent || '')).length,
  }))
  const allClean = (c) => !c.ran && !c.handlers && !c.jsLinks && !c.frames && !c.scripts
  const show = (c) => `ran ${c.ran} · handlers ${c.handlers} · js links ${c.jsLinks} · iframes ${c.frames} · scripts ${c.scripts}`
  /** markup that would run: a script or an iframe, a tag carrying a handler, a script link (an escaped "&lt;img … onerror" is words, never markup) */
  const dirty = (v) => /<script|<iframe|<[a-z][^>]*\son\w+\s*=|<a\b[^>]*href\s*=\s*["']?\s*javascript:/i.test(v)

  try {
    as('dane')
    const ctx = await desk(); await stubWa(ctx)
    /* the save path's crafted request: the editor's own save, its words swapped for a payload on the way (a member's browser can send anything) */
    await ctx.route('**/quotes/**', async (route) => {
      const r = route.request()
      if (r.method() === 'POST' && (r.postData() || '').includes('PROBEMARK')) return route.continue({ postData: r.postData().replace(/PROBEMARK/g, INJECT) })
      return route.continue()
    })
    const p = await page(ctx, 'desk')
    const openTerms = async () => { const t = p.locator('#section-terms button[aria-controls="section-terms-body"]'); await t.scrollIntoViewIfNeeded(); if (await t.getAttribute('aria-expanded') === 'false') { await t.click(); await settle(p, 800) } }
    const boldAll = async (box) => { await p.keyboard.press('Meta+a'); for (let i = 0; i < 2 && !/<(b|strong)\b/.test(await box.innerHTML()); i++) { await p.keyboard.press('Meta+b'); await settle(p, 150) } }

    // ── 1 · SECURITY: stored rich text never runs, anywhere ─────────────────────────────────────────────────────────────────────────
    console.log('1 · Stored rich text never runs — the client’s pages, Preview, the editors (triage §12.1)')
    sql(`update quote_items set description_html = '${esc(PAYLOAD)}' where id in ('${Q7_LINE}', '${Q7_GROUP}', '${Q4_LINE}', '${Q1_LINE}')`)
    sql(`update quotes set terms_html = '${esc('<p>Agreed with {client_name}.</p>' + PAYLOAD)}', terms_visible = 1, view_token = '${VIEW_TOKEN}', view_token_at = strftime('%s','now'), view_token_by = 'dane' where id = '${Q7}'`)
    sql(`update quotes set terms_html = '${esc(PAYLOAD)}' where id = '${Q1}'`)
    sql(`update leads set name = 'Serena Koh<img src=x onerror=window.__pwned=7>' where id = '${SERENA}'`)
    for (const [url, what] of [[`/confirm/${Q7}`, 'the confirmation link /confirm/<token>'], [`/quote/${VIEW_TOKEN}`, 'the view-only link /quote/<token>'], [`/sign/${C_RYAN}/quote`, 'the quote an agreement signs /sign/<token>/quote'], [`/quotes/${Q7}/preview`, 'the studio’s Preview']]) {
      await go(p, url); await settle(p, 900)
      const c = await clean(p)
      ok(allClean(c), `${what}: nothing of the stored payload runs or stays (${show(c)})`)
      if (!/sign/.test(url)) ok(/Probe safe words/.test(await p.locator('body').innerText()), `…its words still read ("Probe safe words")`)
    }
    await go(p, `/quotes/${Q7}/preview`)
    const centred = p.locator('text=Probe centred').first()
    ok(await centred.evaluate((n) => getComputedStyle(n.closest('p') || n).textAlign).catch(() => '') === 'center', 'the allowlist keeps the shape — the paragraph stays centred, its click handler gone')
    const terms = (await p.locator('[data-testid="quote-preview"]').innerText()).replace(/\s+/g, ' ')
    ok(/Agreed with Serena Koh<img src=x onerror=window\.__pwned=7>\./.test(terms), 'a client’s name resolved into the T&Cs ({client_name}) prints as words, never markup')
    await shot(p, 'pm2-s44q-preview-payload-1440')
    sql(`update leads set name = ${serena0} where id = '${SERENA}'`)
    /* the editor: the description dialog and the T&Cs editor draw the stored body through the allowlist */
    await go(p, `/quotes/${Q1}`); await settle(p, 1500)
    await p.getByRole('button', { name: 'Client view', exact: true }).first().click(); await settle(p, 1200)   // the editor's live client view pane draws the stored words too
    await openTerms()
    let c = await clean(p)
    ok(allClean(c) && /Probe safe words/.test(await p.getByRole('textbox', { name: 'Terms and Conditions', exact: true }).innerText()) && /Probe safe words/.test(await p.getByTestId('client-view-pane').innerText().catch(() => '')), `the quote editor — its client view pane and its T&Cs editor load the words, nothing runs (${show(c)})`)
    await p.locator('button[data-rich]').first().click(); await settle(p, 700)
    const dlg = p.getByRole('dialog', { name: 'Words on this line' })   // (S44I — call C2, a deliberate change of this rule: a line's Description dialog is Words on this line)
    c = await clean(p)
    ok(allClean(c) && /Probe safe words/.test(await dlg.innerText()), `the line’s description dialog loads the words, never the payload (${show(c)})`)
    /* the save path: the editor's save, carrying a crafted body, is stored as the allowlist's markup */
    const dbox = dlg.getByRole('textbox', { name: 'Description' })
    await dbox.click(); await p.keyboard.press('Meta+a'); await p.keyboard.type('PROBEMARK typed words'); await boldAll(dbox)
    await dlg.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 2200)
    const saved = sql(`select coalesce(description_html, '') from quote_items where id = '${Q1_LINE}'`)
    ok(/PROBEMARK/.test(saved) && !dirty(saved), `a description saved with a script, a handler and a script link keeps its words, drops the rest (${saved.slice(0, 90)})`)
    const terms1 = p.getByRole('textbox', { name: 'Terms and Conditions', exact: true })
    await terms1.click(); await p.keyboard.press('Meta+a'); await p.keyboard.type('PROBEMARK terms'); await boldAll(terms1)
    await settle(p, 2200)
    const savedT = sql(`select terms_html from quotes where id = '${Q1}'`)
    ok(/PROBEMARK/.test(savedT) && !dirty(savedT), `the T&Cs saved the same way: the allowlist's markup only (${savedT.slice(0, 90)})`)
    /* a lead's formatted note, and the Price book's saved words */
    sql(`insert into lead_notes (id, lead_id, kind, title, body, author_id, created_at, updated_at) values ('${NOTE_ID}', '${OLIVIA}', 'note', 'Probe S44Q note', '${esc(PAYLOAD)}', 'dane', strftime('%s','now'), strftime('%s','now'))`)
    await go(p, `/leads/${OLIVIA}/notes?open=${NOTE_ID}`); await settle(p, 1200)
    c = await clean(p)
    ok(allClean(c) && /Probe safe words/.test(await p.locator('main').innerText()), `a lead’s formatted note opens with its words, nothing runs (${show(c)})`)
    sql(`update price_book_items set description_html = '${esc(PAYLOAD)}' where id = '${PB_ITEM}'`)
    await go(p, `/company/price-book?open=${PB_ITEM}`); await settle(p, 1200)
    c = await clean(p)
    ok(allClean(c) && /Probe safe words/.test(await p.locator('body').innerText()), `the Price book item opens with its words, nothing runs (${show(c)})`)
    as('germaine')   // a Designer reads the item read-only — the same words, drawn as HTML
    await go(p, `/company/price-book?open=${PB_ITEM}`); await settle(p, 1200)
    c = await clean(p)
    ok(allClean(c), `…and read-only, as a Designer reads it (${show(c)})`)
    as('dane')
    sql(`update price_book_items set description_html = ${pb0} where id = '${PB_ITEM}'`)
    sql(`delete from lead_notes where id = '${NOTE_ID}'`)
    for (const id of [Q7_LINE, Q7_GROUP, Q4_LINE, Q1_LINE]) putItem(id, itemsKept[id])
    putBack(Q7, kept[Q7]); putBack(Q1, kept[Q1])

    // ── 2 · optional works: no answer when nothing was offered; Settings decides whether the client picks ───────────────────────────────
    console.log('2 · Optional works on the confirmation link (row 357, §12.2)')
    const resetQ7 = () => { putBack(Q7, kept[Q7]); sql(`update quote_items set client_choice = null where id = '${Q7_OPT}'`) }
    sql(`update quote_items set optional = 1, client_choice = null where id = '${Q7_OPT}'`)
    const confirmAs = async (pg) => {
      await pg.getByRole('textbox', { name: /Your full name/ }).fill('Serena Koh')
      await pg.getByRole('button', { name: 'Confirm quote' }).click(); await settle(pg, 1800)
    }
    sql(`update quotes set client_view_json = '{"optionalWorks":false}' where id = '${Q7}'`)
    await go(p, `/confirm/${Q7}`)
    ok(await p.getByTestId('confirm-optional').count() === 0, 'with the client view’s Optional works off, the link lists none')
    await confirmAs(p)
    ok(sql(`select status from quotes where id = '${Q7}'`) === 'Confirmed' && sql(`select quote(client_choice) from quote_items where id = '${Q7_OPT}'`) === 'NULL', 'confirming then stores no answer — the line never reads “Client said no”')
    resetQ7()
    /* Settings › Quotes & pricing: the card, its switch, its snackbar */
    await go(p, '/settings?section=quotes')
    const card = p.getByTestId('optional-picks')
    await card.scrollIntoViewIfNeeded()
    ok(/Optional works on the confirmation link/.test(await card.innerText()) && await card.getByRole('switch').isChecked(), 'Settings › Quotes & pricing: “Optional works on the confirmation link”, on by default (as it always was)')
    await card.locator('label').first().click(); await settle(p, 1200)
    ok(/"clientPicksOptional":false/.test(sql(`select value from settings where key = 'quote_rules'`)) && /Clients see optional works and ask to add them/.test(await snackText(p)), 'switched off: the rule is stored, the snackbar says what changes')
    await shot(p, 'pm2-s44q-settings-card-1440')
    await go(p, `/confirm/${Q7}`)
    const ro = p.locator('[data-testid="confirm-optional"][data-readonly]')
    ok(await ro.count() === 1 && await ro.getByRole('checkbox').count() === 0 && /Study desk and shelving/.test(await ro.innerText()), 'the link lists the optional work with its price, read-only — no tick box')
    const askBtn = ro.getByTestId('confirm-optional-ask').first()
    ok(/^Ask \S+ to add it$/.test((await askBtn.innerText()).trim()), `each work offers “${(await askBtn.innerText()).trim()}”`)
    await shot(p, 'pm2-s44q-confirm-readonly-1440')
    await askBtn.click(); await settle(p, 600)
    const ask = p.getByRole('dialog', { name: 'Ask for a change' })
    ok(/Study desk and shelving/.test(await ask.getByRole('textbox').inputValue()), 'the ask opens with the work named — the designer reads which one')
    await ask.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
    await confirmAs(p)
    ok(sql(`select status from quotes where id = '${Q7}'`) === 'Confirmed' && sql(`select quote(client_choice) from quote_items where id = '${Q7_OPT}'`) === 'NULL', 'confirming stores no answer while the studio keeps the picking')
    resetQ7()
    const ph = await phoneCtx(); const pp = await page(ph, 'phone')
    await go(pp, `/confirm/${Q7}`)
    const roPhone = pp.locator('[data-testid="confirm-optional"][data-readonly]')
    await roPhone.scrollIntoViewIfNeeded().catch(() => {})
    ok(await roPhone.count() === 1 && (await sideways(pp)) <= 0, `390 touch: the read-only list fits (sideways ${await sideways(pp)})`)
    await shot(pp, 'pm2-s44q-confirm-readonly-390')
    await ph.close()
    await go(p, '/settings?section=quotes')
    await p.getByTestId('optional-picks').locator('label').first().click(); await settle(p, 1200)
    ok(/"clientPicksOptional":true/.test(sql(`select value from settings where key = 'quote_rules'`)), 'switched back on')
    await go(p, `/confirm/${Q7}`)
    const pick = p.locator('[data-testid="confirm-optional"]:not([data-readonly])')
    ok(await pick.getByRole('checkbox').count() === 1, 'on: the client ticks the work, as before')
    await pick.getByRole('checkbox').first().check({ force: true }); await settle(p, 300)
    await confirmAs(p)
    ok(sql(`select client_choice from quote_items where id = '${Q7_OPT}'`) === 'want', 'their pick is stored')
    resetQ7()
    putItem(Q7_OPT, itemsKept[Q7_OPT])

    // ── 3 · a Blank Quote is pinned ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · A quote started blank is pinned to the default template’s version (row 312)')
    ok(sql(`select count(*) from quotes where template_id is null`) === '0', 'no quote prints through an unpinned default (R173)')
    await go(p, `/leads/${FARAH}/quotes`)
    await p.getByRole('button', { name: 'From Scratch' }).click()
    await p.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 20000 }); await settle(p, 1200)
    const BLANK = /\/quotes\/([0-9a-f-]{36})/.exec(p.url())[1]
    ok(sql(`select template_id || '|' || template_version from quotes where id = '${BLANK}'`) === `${DEFAULT_TPL[0]}|${DEFAULT_TPL[1]}`, `From Scratch: the new quote is pinned to the default, v${DEFAULT_TPL[1]}`)

    // ── 4 · an approver's send approves the Draft quote it names ──────────────────────────────────────────────────────────────────
    console.log('4 · An approver’s Send on an agreement naming their Draft quote (row 334)')
    ok(sql(`select status from quotes where id = '${Q1}'`) === 'Draft' && sql(`select status from contracts where id = '${C_OLIVIA}'`) === 'Draft', 'OM-10001 is a Draft; its agreement too (approval required)')
    as('germaine')
    await go(p, `/contracts/${C_OLIVIA}`); await settle(p, 1000)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 700)
    ok(/OM-10001 is still a Draft — approve and send it first/.test(await snackText(p)) && await p.getByRole('dialog', { name: 'Send for digital signature' }).count() === 0, 'a Designer is still held, with the rule')
    as('dane')
    await go(p, `/contracts/${C_OLIVIA}`); await settle(p, 1000)
    await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 800)
    const sd = p.getByRole('dialog', { name: 'Send for digital signature' })
    ok(await sd.count() === 1, 'Dane (an Owner, an approver): Send opens — no dead end')
    ok(/OM-10001 is still a Draft — sending this approves it/.test(await sd.getByTestId('send-notes').innerText().catch(() => '')), 'the dialog says so first: “OM-10001 is still a Draft — sending this approves it”')
    await shot(p, 'pm2-s44q-approver-send-1440')
    await sd.getByRole('button', { name: 'Send via WhatsApp' }).click(); await settle(p, 2200)
    ok(sql(`select status from contracts where id = '${C_OLIVIA}'`) === 'Sent to Client', 'the agreement goes out')
    ok(sql(`select status || '|' || approved_by || '|' || (approved_at is not null) from quotes where id = '${Q1}'`) === 'Approved|dane|1', 'and OM-10001 is Approved, on the record as Dane’s')
    putContract(); putBack(Q1, kept[Q1])

    // ── 5 · {gst_rate} ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · {gst_rate} prints the quote’s rate (row 256)')
    sql(`update quote_items set gst_pct = 0 where id = '${Q7_LINE}'`)
    await go(p, `/quotes/${Q7}/preview`)
    const paper = (await p.locator('[data-testid="quote-preview"]').innerText()).replace(/\s+/g, ' ')
    ok(/Gst 9%/i.test(paper) && !/Gst 0%/i.test(paper), 'a 0% first line: the totals still say “Gst 9%”, the rate the quote’s lines carry')
    putItem(Q7_LINE, itemsKept[Q7_LINE])

    // ── 6 · the printed T&Cs keep their shape ────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · The printed T&Cs keep their lists, numbers, alignment and blank lines (row 321)')
    sql(`update quotes set terms_html = '${esc('<p>Probe intro</p><ol><li>Probe first</li><li>Probe second</li></ol><ul><li>Probe bullet</li></ul><p style="text-align: right">Probe right</p><p><br></p><p>Probe after</p>')}', terms_visible = 1 where id = '${Q7}'`)
    await go(p, `/quotes/${Q7}/preview`)
    const doc = p.locator('[data-testid="quote-preview"]')
    const li2 = doc.locator('ol li', { hasText: 'Probe second' }).first()
    ok(await doc.locator('ol li', { hasText: 'Probe first' }).count() === 1 && await li2.evaluate((n) => n.parentElement.getAttribute('start')) === '2', 'a numbered list prints its numbers — counting on across its lines (1 · 2)')
    ok(await doc.locator('ul li', { hasText: 'Probe bullet' }).count() === 1, 'a bulleted list prints its bullets')
    ok(await doc.locator('p', { hasText: 'Probe right' }).first().evaluate((n) => getComputedStyle(n).textAlign) === 'right', 'an aligned paragraph keeps its alignment')
    ok(await doc.locator('[data-blank]').count() >= 1, 'a blank line prints as a line of space')
    const nos = await doc.locator('[data-numbered]').evaluateAll((els) => els.filter((e) => /Probe (intro|right|after)/.test(e.textContent || '')).map((e) => e.querySelector('[class*="paraNo"]')?.textContent ?? '-'))
    ok(nos.join(',') === '1,2,3', `“Number the paragraphs” numbers the paragraphs only — lists keep their own marks (${nos.join(',')})`)
    await doc.locator('ol li', { hasText: 'Probe first' }).first().scrollIntoViewIfNeeded()
    await shot(p, 'pm2-s44q-terms-shape-1440')
    putBack(Q7, kept[Q7])

    // ── 7 · a template's [Studio Name] lands as the live field ─────────────────────────────────────────────────────────────────────
    console.log('7 · T&Cs follow the quote’s issuing entity (row 311)')
    sql(`update quotes set terms_html = '', terms_visible = 1 where id = '${Q1}'`)
    await go(p, `/quotes/${Q1}`); await settle(p, 1500)
    await openTerms()
    await p.locator('#section-terms').getByRole('button', { name: 'My Templates' }).click(); await settle(p, 700)
    const tm = p.getByRole('dialog', { name: /Terms and Conditions Templates/ })
    await tm.locator('[class*="card"], li, article').filter({ hasText: 'Terms and Conditions for Renovation Works' }).first().getByRole('button', { name: 'Add', exact: true }).click(); await settle(p, 1800)
    const tcText = await p.getByRole('textbox', { name: 'Terms and Conditions', exact: true }).innerText()
    ok(/\{studio_name\}/.test(tcText) && !/\[Studio Name\]/.test(tcText) && !/Demo Studio Pte Ltd/.test(tcText), 'the template’s [Studio Name] lands as {studio_name} — never the studio’s name as fixed words')
    ok(/\{studio_name\}/.test(sql(`select terms_html from quotes where id = '${Q1}'`)), '…and is saved so')
    const brandWithRo = JSON.parse(sql(`select value from settings where key = 'brand'`)); brandWithRo.details.entities.push({ ...brandWithRo.details.entities[0], id: 'probe-ro-well', name: 'RO-Well Pte Ltd' })
    sql(`update settings set value = '${esc(JSON.stringify(brandWithRo))}' where key = 'brand'`)
    sql(`update quotes set issuing_entity = 'RO-Well Pte Ltd' where id = '${Q1}'`)
    await go(p, `/quotes/${Q1}/preview`)
    const t1 = (await p.locator('[data-testid="quote-preview"]').innerText()).replace(/\s+/g, ' ')
    ok(/Contractor\/Company, RO-Well Pte Ltd, for the renovation works/.test(t1) && !/\{studio_name\}/.test(t1), 'Preview prints the quote’s issuing entity (RO-Well Pte Ltd) where the template said [Studio Name]')
    sql(`update settings set value = ${brand0} where key = 'brand'`)
    putBack(Q1, kept[Q1])

    // ── 8 · one quote's view is kept ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · One quote’s client view is kept (row 352)')
    await go(p, `/quotes/${Q1}/preview`)
    await p.getByRole('button', { name: /What your client sees/ }).first().click(); await settle(p, 500)
    const panel = p.locator('aside[aria-label="What your client sees"]')
    await panel.locator('label').filter({ hasText: /^#$/ }).first().click()   // Spaces Studio took a column off one quote (Unit price there; # here)
    await p.getByRole('button', { name: 'Back to the editor' }).click()   // within the 600 ms the autosave waits
    await p.waitForURL(new RegExp(`/quotes/${Q1}(\\?|$)`), { timeout: 15000 }); await settle(p, 1500)
    ok(sql(`select client_view_json from quotes where id = '${Q1}'`) === '{"columns":{"no":false}}', 'a switch changed just before leaving is kept — and only the quote’s own choice is stored')
    await go(p, `/quotes/${Q1}/preview`)
    await p.getByRole('button', { name: 'Change template' }).click(); await settle(p, 800)
    const picker = p.getByRole('dialog', { name: 'Choose a template' })
    await picker.getByRole('option', { name: /Open folder HDB/ }).first().click(); await settle(p, 500)   // the demo files the BTO templates in HDB
    await picker.getByRole('option').filter({ hasText: '4-Room BTO' }).first().click(); await settle(p, 300)
    await p.getByRole('button', { name: 'Use this template' }).click(); await settle(p, 2200)
    ok(sql(`select template_id from quotes where id = '${Q1}'`) === BTO4 && sql(`select client_view_json from quotes where id = '${Q1}'`) === '{"columns":{"no":false}}', 're-picking the template keeps the quote’s choice where it applies (# off on 4-Room BTO)')
    await p.getByRole('button', { name: /What your client sees/ }).first().click().catch(() => {}); await settle(p, 400)
    ok(await p.locator('aside[aria-label="What your client sees"] label').filter({ hasText: /^#$/ }).first().locator('input').isChecked().catch(() => true) === false, 'the panel shows the carried choice after the change (# off)')
    putBack(Q1, kept[Q1])

    // ── 9a · the client view pane follows General Info's second client as it is typed (triage §12.8) ─────────────────────────────────
    console.log('9a · The client view pane names a second client as typed (§12.8)')
    await go(p, `/quotes/${Q1}`); await settle(p, 1500)
    await p.getByRole('button', { name: 'Client view', exact: true }).first().click(); await settle(p, 1000)
    await p.getByRole('button', { name: 'Add a second client' }).click(); await settle(p, 300)
    await p.getByRole('textbox', { name: 'Second client', exact: true }).fill('Probe Second'); await settle(p, 1200)
    ok(/Olivia Martinez & Probe Second/.test(await p.getByTestId('client-view-pane').innerText()), 'the pane prints “Olivia Martinez & Probe Second” at once — no save and reload')
    await settle(p, 1500)   // the General Info autosave lands before the record is put back
    putBack(Q1, kept[Q1])

    // ── 9 · ⌘K finds the card; no page errors; widths ─────────────────────────────────────────────────────────────────────────────
    console.log('9 · The card in ⌘K, page errors, widths')
    await go(p, '/leads')
    await p.keyboard.press('Meta+k'); await settle(p, 500)
    await p.keyboard.type('optional works'); await settle(p, 1200)
    ok(/Optional works on the confirmation link/.test(await p.getByRole('dialog').last().innerText().catch(() => '')), '⌘K “optional works” finds the Settings card')
    await p.keyboard.press('Escape')
    const ph320 = await phoneCtx(320, 700); const p320 = await page(ph320, '320')
    await go(p320, `/confirm/${Q7}`)
    ok((await sideways(p320)) <= 0, `320: the confirmation page never scrolls sideways (${await sideways(p320)})`)
    await ph320.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' · ')}` : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).split('\n')[0])
  } finally {
    /* put back everything it changed */
    for (const [id, row] of Object.entries(kept)) putBack(id, row)
    for (const [id, row] of Object.entries(itemsKept)) putItem(id, row)
    putContract()
    sql(`update leads set name = ${serena0} where id = '${SERENA}'`)
    if (rules0) sql(`update settings set value = ${rules0} where key = 'quote_rules'`); else sql(`delete from settings where key = 'quote_rules'`)
    sql(`update settings set value = ${brand0} where key = 'brand'`)
    sql(`update price_book_items set description_html = ${pb0} where id = '${PB_ITEM}'`)
    sql(`delete from lead_notes where id = '${NOTE_ID}'`)
    const madeQuotes = sql(`select id from quotes`).split('\n').filter((id) => id && !quotes0.has(id))
    for (const id of madeQuotes) { for (const t of ['quote_items', 'quote_payments']) sql(`delete from ${t} where quote_id = '${id}'`); sql(`delete from quotes where id = '${id}'`) }
    for (const t of trail) { const now = sql(`select id from ${t}`).split('\n').filter(Boolean); const fresh = now.filter((id) => !trail0[t].has(id)); for (const id of fresh) sql(`delete from ${t} where id = '${id}'`) }
    sql(`update members set is_you = (id = '${you0}')`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
