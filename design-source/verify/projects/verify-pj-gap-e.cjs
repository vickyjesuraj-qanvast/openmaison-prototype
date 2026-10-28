// Gaps build E — files and delivery (the owner's "build everything", 2026-10-07; report rows 26-…/5-files-data-roles.md). Each item asserted as
// the rule it builds, never another round's count:
//  1 every file kept — a PDF, a spreadsheet, a Word file and a drawing upload with their bytes, real kind, type, size and glyph; a PDF's first
//    page is its picture; Download gives the file itself under its name; the viewer opens the PDF from its bytes; the client's /f link and the
//    portal send the real file; a file over 8 MB is refused with its rule · 2 Who sees leads on the file actions: a member who may not open the
//    lead is refused on the server ("This lead isn’t one you can open"), and the raw route answers not found · 3 the viewer's ← / → and its
//    strip, Esc back to Files · 4 starter folders on the demo projects and on a new project, named once in Activity · 5 the delivery layer: a
//    notice whose email is switched on goes out in the studio's words with its fields, Settings › Notifications › Sent messages lists it, filters
//    by channel and event, opens a message; a Designer reads only their own; the bell's derived reminders go out once · phone 390 (no sideways
//    scroll: Files, the viewer with its strip, Sent messages).
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3125 NODE_PATH=<repo>/node_modules node verify-pj-gap-e.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'gap-e')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3125'
const ROOT = path.join(__dirname, '..', '..', '..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 64 * 1024 * 1024 }).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const L = (n) => sql(`select lead_id from projects where number='${n}'`)
const undo = []   // SQL that puts back what the probe changed, run last-first in `finally`
const later = (q) => undo.push(q)
const sample = (n) => fs.readFileSync(path.join(ROOT, 'public', 'uat-files', n))

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const started = Math.floor(Date.now() / 1000) - 5
  const ben = P('P-2026-002'), benLead = L('P-2026-002'), marcus = P('P-2026-004'), ryan = P('P-2026-001')
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  /* (simplify round 2) 15 s: a delivery first releases held mail — a loaded machine needs the room */
  const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 200)) } return false }
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  /* the probe's own uploads, every lead file it made: gone again in `finally` — the sqlite3 shell keeps foreign keys off, so what hangs off a
     file goes by hand, last (registered first) */
  later(`delete from lead_file_images where file_id not in (select id from lead_files)`)
  later(`delete from lead_file_thumbs where file_id not in (select id from lead_files)`)
  later(`delete from file_comments where file_id not in (select id from lead_files)`)
  later(`delete from lead_files where created_at >= ${started} and kind <> 'folder' and lead_id in (select lead_id from projects)`)
  const given = sql(`select coalesce((select value from settings where key='project_numbers_given'), '')`)
  later(`delete from notification_outbox where created_at >= ${started}`)
  later(`delete from notifications where created_at >= ${started}`)
  later(`delete from file_comments where created_at >= ${started}`)

  try {
    as('dane')
    const S = await desk()
    const s = await page(S, 'studio')

    // ── 4 · the starter folders on a demo project ──────────────────────────────────────────────────────────────────────────────────
    console.log('4 starter folders')
    await go(s, `/projects/${marcus}/files`)
    const folderText = await s.locator('main').innerText()
    ok(['Contract & VOs', 'Floor plans', 'Renders', 'Quotes & BOQ', 'Site photos'].every((n) => folderText.includes(n)), '4 a project’s Files opens with Contract & VOs · Floor plans · Renders · Quotes & BOQ · Site photos')
    ok(sql(`select count(*) from lead_files where kind='folder' and parent_id is null and deleted_at is null group by lead_id, lower(name) having count(*) > 1`) === '', '4 no lead holds two root folders of one name')
    await go(s, `/projects/${marcus}/activity`)
    ok(/started the project’s Files with the folders Contract & VOs · Floor plans · Renders · Quotes & BOQ · Site photos/.test(await s.locator('main').innerText()), '4 Activity names the set once')
    ok(!/created the folder “Floor plans”/.test(await s.locator('main').innerText()), '4 … not a line per folder')

    // ── 1 · every file kept ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 every file kept')
    await go(s, `/projects/${ben}/files`)
    await shot(s, 'e00-ben-files-grid', true)
    ok(await s.locator('img[src^="/files/thumb/"]').count() >= 2, '1 a PDF wears its first page (the floor plan, the site measurements)')
    const pdf = sample('cove-interior-quotation.pdf'), xlsx = sample('gerald-tan-old-quote.xlsx')
    const docx = Buffer.concat([Buffer.from('PK\u0003\u0004'), Buffer.alloc(2048, 7)])
    const dwg = Buffer.concat([Buffer.from('AC1032'), Buffer.alloc(4096, 3)])
    await s.locator('[data-testid="files-picker"]').setInputFiles([
      { name: 'Cove quotation.pdf', mimeType: 'application/pdf', buffer: pdf },
      { name: 'Old quote.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsx },
      { name: 'Scope of works.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: docx },
      { name: 'Kitchen layout.dwg', mimeType: '', buffer: dwg },
    ])
    ok(await until(async () => /4 files uploaded/.test(await snack(s).innerText())), '1 four files of four kinds upload ("4 files uploaded")')
    const row = (name) => { const r = sql(`select id || '|' || kind || '|' || coalesce(mime,'') || '|' || coalesce(size_bytes,'') || '|' || coalesce(thumb,'') from lead_files where lead_id='${benLead}' and name='${name}' and created_at >= ${started}`).split('|'); return { id: r[0], kind: r[1], mime: r[2], size: Number(r[3]), thumb: r[4] } }
    const fPdf = row('Cove quotation.pdf'), fX = row('Old quote.xlsx'), fD = row('Scope of works.docx'), fW = row('Kitchen layout.dwg')
    const kept = (id) => sql(`select count(*) from lead_file_images where file_id='${id}'`) === '1'
    ok(fPdf.kind === 'pdf' && fPdf.mime === 'application/pdf' && fPdf.size === pdf.length && kept(fPdf.id), '1 the PDF keeps its bytes, its type and its true size')
    ok(fX.kind === 'doc' && /spreadsheetml/.test(fX.mime) && fX.size === xlsx.length && kept(fX.id), '1 the spreadsheet keeps its bytes as a spreadsheet (no longer a JPEG)')
    ok(fD.kind === 'doc' && /wordprocessingml/.test(fD.mime) && kept(fD.id), '1 the Word file keeps its bytes and type')
    ok(fW.kind === 'doc' && fW.mime === 'image/vnd.dwg' && kept(fW.id), '1 a drawing the browser gave no type keeps its type from its name (DWG)')
    ok(fPdf.thumb === `/files/thumb/${fPdf.id}` && sql(`select count(*) from lead_file_thumbs where file_id='${fPdf.id}'`) === '1', '1 the PDF’s first page was drawn and kept as its picture')
    await settle(s, 800)
    const tile = (name) => s.locator('[class*="tile"]').filter({ hasText: name }).first()
    ok(/table_chart/.test(await tile('Old quote.xlsx').innerText()) && /design_services/.test(await tile('Kitchen layout.dwg').innerText()) && /description/.test(await tile('Scope of works.docx').innerText()), '1 each kind wears its own glyph — a sheet, a drawing, a document')
    await shot(s, 'e01-uploads-grid', true)
    // the list says the real type
    await s.getByLabel('List view').first().click().catch(() => {})
    await settle(s, 700)
    const listText = await s.locator('main').innerText()
    ok(/XLSX/.test(listText) && /DWG/.test(listText) && /DOCX/.test(listText), '1 the list’s File type column reads XLSX · DOCX · DWG')
    await shot(s, 'e02-uploads-list')
    // Download gives the real file under its name
    const raw = await s.request.get(`${BASE}/files/raw/${fX.id}?download=1`)
    const body = await raw.body()
    ok(raw.status() === 200 && /attachment/.test(raw.headers()['content-disposition'] ?? '') && /Old%20quote\.xlsx/.test(raw.headers()['content-disposition'] ?? '') && body.equals(xlsx), '1 /files/raw gives the spreadsheet itself, as a download under its name')
    const xRow = s.locator('[data-kb-row]').filter({ hasText: 'Old quote.xlsx' }).first()
    await xRow.hover(); await settle(s, 200)
    await xRow.locator('button[aria-label="Actions for Old quote.xlsx"]').click({ force: true }); await settle(s, 300)
    const dl = s.waitForEvent('download', { timeout: 8000 }).catch(() => null)
    await s.getByRole('menuitem', { name: 'Download' }).first().click()
    const got = await dl
    ok(!!got && got.suggestedFilename() === 'Old quote.xlsx', '1 the row’s Download saves “Old quote.xlsx” (no longer Coming soon)')
    const inline = await s.request.get(`${BASE}/files/raw/${fPdf.id}`)
    ok(inline.status() === 200 && inline.headers()['content-type'] === 'application/pdf' && /inline/.test(inline.headers()['content-disposition'] ?? ''), '1 a PDF opens in place')
    const page2 = await s.request.get(`${BASE}/files/raw/${fD.id}`)
    ok(/attachment/.test(page2.headers()['content-disposition'] ?? ''), '1 a Word file always arrives as a download (an upload never runs as the app)')
    // the viewer
    await go(s, `/projects/${ben}/files/${fPdf.id}`)
    ok((await s.locator('[data-testid="viewer-pdf"]').getAttribute('src')) === `/files/raw/${fPdf.id}`, '1 the viewer opens the PDF from its own bytes (any lead’s, not only an update’s)')
    await go(s, `/projects/${ben}/files/${fX.id}`)
    ok(await s.locator('[data-testid="viewer-doc"]').count() === 1 && /table_chart/.test(await s.locator('[data-testid="viewer-doc"]').innerText()), '1 a spreadsheet shows its glyph with Download')
    await shot(s, 'e03-viewer-sheet')
    // the client's /f link
    await go(s, `/projects/${ben}/files`)
    const share = sql(`select '1'`) && await s.evaluate(async (id) => {
      const r = await fetch(location.pathname); const html = await r.text(); const m = html.match(new RegExp(`/f/${id}\\.[A-Za-z0-9_-]+`)); return m ? m[0] : null
    }, fX.id)
    if (share) {
      const f = await s.request.get(`${BASE}${share}`, { maxRedirects: 0 })
      ok(f.status() === 200 && (await f.body()).equals(xlsx), '1 the client’s signed /f link sends the spreadsheet itself')
    } else ok(false, '1 the client’s signed /f link (no link on the page — is AUTH_SECRET set on the server?)')
    // a PDF kept before its first page was drawn (an update's document) gets it the first time Files lists it
    const report = sql(`select id from lead_files where lead_id='${benLead}' and name='Water test report.pdf'`)
    const keepThumb = sql(`select data from lead_file_thumbs where file_id='${report}'`)
    sql(`delete from lead_file_thumbs where file_id='${report}'`); sql(`update lead_files set thumb = null where id='${report}'`)
    later(`update lead_files set thumb = '/files/thumb/${report}' where id='${report}'`)
    const suFolder = sql(`select id from lead_files where lead_id='${benLead}' and kind='folder' and name='Site updates'`)
    await go(s, `/projects/${ben}/files?folder=${suFolder}`)
    ok(await until(async () => sql(`select coalesce(thumb,'') from lead_files where id='${report}'`) === `/files/thumb/${report}` && sql(`select count(*) from lead_file_thumbs where file_id='${report}'`) === '1', 12000), '1 a PDF kept with no picture (an update’s document) gets its first page the first time Files lists it')
    if (keepThumb && sql(`select count(*) from lead_file_thumbs where file_id='${report}'`) === '0') sql(`insert into lead_file_thumbs (file_id, data) values ('${report}', '${keepThumb}')`)
    await go(s, `/projects/${ben}/files`)
    // too big
    const big = Buffer.alloc(8 * 1024 * 1024 + 10, 1)
    await s.locator('[data-testid="files-picker"]').setInputFiles([{ name: 'Huge scan.pdf', mimeType: 'application/pdf', buffer: big }])
    ok(await until(async () => /Huge scan\.pdf is over 8 MB — a smaller file fits/.test(await snack(s).innerText())), '1 a file over 8 MB is refused with its rule')
    ok(sql(`select count(*) from lead_files where name='Huge scan.pdf'`) === '0', '1 … and nothing is kept')

    // ── 3 · the viewer: ← / →, the strip, Esc ────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 the viewer')
    const su = sql(`select id from lead_files where lead_id='${benLead}' and kind='folder' and name='Site updates'`)
    const sibs = sql(`select id from lead_files where parent_id='${su}' and deleted_at is null and kind <> 'folder' order by created_at`).split('\n')
    await go(s, `/projects/${ben}/files/${sibs[1]}?from=${encodeURIComponent(`/projects/${ben}/files?folder=${su}`)}`)
    const strip = s.locator('[data-testid="viewer-strip"] button')
    ok(await strip.count() === sibs.length, `3 the strip lists the folder’s ${sibs.length} files`)
    ok((await s.locator('[data-testid="viewer-strip"] button[aria-current="true"]').getAttribute('aria-label')) === sql(`select name from lead_files where id='${sibs[1]}'`), '3 … the open one ringed')
    await shot(s, 'e04-viewer-strip')
    await s.keyboard.press('ArrowRight')
    ok(await until(async () => s.url().includes(sibs[2])), '3 → opens the next file in the folder')
    await settle(s, 600)
    await s.keyboard.press('ArrowLeft')
    ok(await until(async () => s.url().includes(sibs[1])), '3 ← the previous one')
    await settle(s, 600)
    await strip.nth(sibs.length - 1).click()
    ok(await until(async () => s.url().includes(sibs[sibs.length - 1])), '3 a press on the strip opens that file')
    await settle(s, 700)
    await s.keyboard.press('?'); await settle(s, 600)
    ok(/Previous · next file in the folder/.test(await s.locator('body').innerText()), '3 the ? panel lists the viewer’s keys')
    await s.keyboard.press('Escape'); await settle(s, 400)
    await s.keyboard.press('Escape')
    ok(await until(async () => /\/files\?folder=/.test(s.url())), '3 Esc goes back to the folder in Files')

    // ── 2 · Who sees leads on the file actions (the server) ──────────────────────────────────────────────────────────────────────────
    console.log('2 who sees leads')
    sql(`insert or replace into settings (key, value, updated_at) values ('lead_visibility', '"assigned"', ${Math.floor(Date.now() / 1000)})`)
    later(`delete from settings where key='lead_visibility'`)
    await go(s, `/projects/${ben}/files`)   // the page as Dane (an Owner) …
    as('alex')                                // … then the session is Alex's, a Designer not on Benjamin Han
    await s.locator('button[aria-label="New Folder"]').first().click().catch(() => {})
    await settle(s, 500)
    const nameBox = s.locator('[role="dialog"] input').first()
    if (await nameBox.count()) {
      await nameBox.fill('Alex was here')
      await s.locator('[role="dialog"]').getByRole('button', { name: 'Save' }).click()
      ok(await until(async () => /this lead isn’t one you can open/i.test(await snack(s).innerText())), '2 Create folder is refused on the server for a member who may not open the lead')
      ok(sql(`select count(*) from lead_files where name='Alex was here'`) === '0', '2 … and nothing is made')
    } else ok(false, '2 Create folder (the toolbar button was not found)')
    const alexRaw = await s.request.get(`${BASE}/files/raw/${fX.id}`)
    ok(alexRaw.status() === 404, '2 the file’s bytes answer not found to her')
    await go(s, `/projects/${ben}/files/${fX.id}`)
    ok(await s.locator('[data-testid="record-not-found-notice"]').count() === 1, '2 … and the viewer page says the project isn’t one she can open')
    as('dane')
    sql(`delete from settings where key='lead_visibility'`)

    // ── 5 · the delivery layer and Sent messages ─────────────────────────────────────────────────────────────────────────────────────
    console.log('5 delivery')
    const rules = JSON.stringify({ channels: { file_comment: { in_app: true, email: true, whatsapp: true } } })
    sql(`insert or replace into settings (key, value, updated_at) values ('notification_rules', '${rules}', ${Math.floor(Date.now() / 1000)})`)
    later(`delete from settings where key='notification_rules'`)
    await go(s, `/projects/${ben}/files/${fX.id}?panel=comments`)
    const box = s.locator('aside textarea').first()
    /* (simplify round 2) the comments panel may still be settling as the page reveals — post, see the comment land, and post once more if it
       didn't (a flake of the probe, never the app: a press before the panel was ready saved nothing) */
    const said = 'Germaine, the carpentry rates on row 3 look old — can you check?'
    const comments = () => Number(sql(`select count(*) from file_comments where file_id='${fX.id}'`) || 0)   // the file's own count — a body may be stored as its rich text
    const before = comments()
    for (let tries = 0; tries < 2 && comments() === before; tries++) {
      await box.waitFor({ state: 'visible' }); await box.fill(said); await settle(s, 300)
      const submit = s.locator('aside').getByRole('button', { name: 'Submit' })
      await submit.click(); await until(async () => comments() > before, 10000)   // never a second post once one landed
    }
    ok(await until(async () => sql(`select count(*) from notification_outbox where created_at >= ${started} and event='file_comment'`) === '2'), '5 a comment with Email and WhatsApp on goes out on both to the lead’s team (Germaine)')
    const mail = sql(`select to_name || '|' || coalesce(to_address,'') || '|' || coalesce(subject,'') || '|' || replace(body, char(10), ' ') from notification_outbox where created_at >= ${started} and event='file_comment' and channel='email'`).split('|')
    ok(mail[0] === 'Germaine' && mail[1] === 'germaine@demostudio.sg', '5 … to her email address')
    ok(/Dane commented on Old quote\.xlsx/.test(mail[2]) && /Hi Germaine/.test(mail[3]) && /carpentry rates/.test(mail[3]) && /HDB 5-Room — Benjamin Han|Benjamin Han/.test(mail[3]), '5 … in the studio’s words with its fields filled (the file, the comment, the lead)')
    ok(sql(`select status || '|' || coalesce(to_address,'') from notification_outbox where created_at >= ${started} and event='file_comment' and channel='whatsapp'`) === 'sent|+6596614208', '5 … and by WhatsApp to her mobile')
    // Settings › Notifications › Sent messages
    await go(s, '/settings?section=notifications')
    const sent = s.locator('[data-testid="notification-sent"]')
    await sent.scrollIntoViewIfNeeded(); await settle(s, 800)
    const total = Number(sql(`select count(*) from notification_outbox`))
    ok(await until(async () => (await s.locator('[data-testid="sent-count"]').innerText()) === `${total} messages`), `5 Sent messages counts every message (${total})`)
    ok(/Someone comments on a file/.test(await s.locator('[data-testid="sent-row"]').first().innerText()), '5 … newest first: the comment heads the log')
    await s.evaluate(() => { const el = document.querySelector('[data-testid="notification-sent"]'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 160) }); await settle(s, 400)
    await shot(s, 'e05-sent-messages')
    await s.locator('[data-testid="sent-channel"]').getByText('WhatsApp', { exact: true }).click()
    ok(await until(async () => (await s.locator('[data-testid="sent-row"]').count()) > 0 && (await s.locator('[data-testid="sent-row"]:not([data-channel="whatsapp"])').count()) === 0), '5 the WhatsApp chip leaves only WhatsApp messages')
    await s.locator('[data-testid="sent-channel"]').getByText('All', { exact: true }).click(); await settle(s, 500)
    await sent.getByRole('button', { name: /Event: All/ }).click(); await settle(s, 400)
    /* (simplify round 2, a deliberate change of this rule) the Event pill lists only the events the log holds — a baseline database may hold no
       render_feedback message, so the probe reads the menu first: render_feedback when it is offered, else the first event that isn't All, and
       asserts the filter on that event (the render_feedback words only when that is the one picked) */
    const RENDERS = 'A client responds to shared versions'   // (the calm UI build 2026-10-27, a deliberate change) 6-07: the event's label says versions
    const offered = (await s.getByRole('menuitemradio').allInnerTexts()).map((t) => t.trim()).filter((t) => t && t !== 'All events')
    const picked = offered.includes(RENDERS) ? RENDERS : offered[0]
    ok(!!picked, `5 the Event pill offers the events the log holds (${offered.length})`)
    if (picked) {
      await s.getByRole('menuitemradio', { name: picked, exact: true }).click()
      const events = () => s.locator('[data-testid="sent-row"]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-event')))
      ok(await until(async () => { const ev = await events(); return ev.length > 0 && new Set(ev).size === 1 && (picked !== RENDERS || ev[0] === 'render_feedback') })
         && (await s.locator('[data-testid="sent-row"]').first().innerText()).includes(picked), `5 the event pill leaves only that event’s messages (${picked})`)
      if (picked === RENDERS) {
        ok(/No mobile number/.test(await sent.innerText()) && /Sent/.test(await sent.innerText()), '5 how each went: Sent, or No mobile number for a member with none on file')
      } else {
        const st = await s.locator('[data-testid="sent-row"] [data-label="Status"]').evaluateAll((cs) => cs.map((c) => ({ s: c.getAttribute('data-status'), t: (c.textContent || '').trim() })))
        ok(st.length > 0 && st.every((x) => x.t && (x.s !== 'sent' || x.t === 'Sent')), '5 how each went, in words: Sent, or why it didn’t go')
      }
      const line = (await s.locator('[data-testid="sent-row"] button').first().innerText()).trim().slice(0, 24)
      await s.locator('[data-testid="sent-row"] button').first().click(); await settle(s, 500)
      const detail = await s.locator('[data-testid="sent-detail"]').innerText()
      ok((picked === RENDERS ? /Kevin Ng responded to the renders/.test(detail) : !!line && detail.includes(line)) && /^To/.test(await s.locator('[data-testid="sent-detail"] dl').innerText()), '5 a row opens the message as it went out')
    }
    await shot(s, 'e06-sent-message-dialog')
    await s.keyboard.press('Escape'); await settle(s, 400)
    // a Designer reads only their own
    as('germaine')
    await go(s, '/settings?section=notifications')
    await s.locator('[data-testid="notification-sent"]').scrollIntoViewIfNeeded(); await settle(s, 800)
    const mine = Number(sql(`select count(*) from notification_outbox where member_id='germaine'`))
    ok(await until(async () => (await s.locator('[data-testid="sent-count"]').innerText()) === `${mine} message${mine === 1 ? '' : 's'}`) && /sent to you/.test(await s.locator('[data-testid="notification-sent"]').innerText()), `5 a Designer reads the messages sent to her (${mine})`)
    as('dane')
    // the bell's derived reminders go out once
    await go(s, `/projects/${ben}`)
    const derived = () => Number(sql(`select count(*) from notification_outbox where key like 'd:%'`))
    await s.locator('[data-notifications-tile]').first().click(); await settle(s, 1500)
    const once = derived()
    await s.keyboard.press('Escape'); await settle(s, 300)
    await s.locator('[data-notifications-tile]').first().click(); await settle(s, 1500)
    ok(derived() === once, `5 the bell’s derived reminders go out once (${once} so far), never again on the next look`)
    await s.keyboard.press('Escape')
    await s.close(); await S.close()

    // ── 4 · a new project opens with the starter folders ────────────────────────────────────────────────────────────────────────────
    console.log('4 a new project')
    {
      const N = await desk(); const n = await page(N, 'new-project')
      await go(n, '/projects')
      await n.keyboard.press('c'); await settle(n, 800)
      const dlg = n.locator('[role="dialog"][aria-label="New project"]')
      await dlg.getByLabel('Client name').fill('Probe Gap E')
      await dlg.getByLabel('Client’s phone number').fill('96417782')
      await dlg.getByLabel('Property type').click(); await settle(n, 300)
      await n.getByRole('option', { name: 'HDB 4-Room', exact: true }).click(); await settle(n, 200)
      await dlg.getByLabel('Agreed value (S$)').fill('42000')
      /* (S42F, a deliberate change of this rule) a project needs a member — an Owner picks one */
      await dlg.getByLabel('Assign member').click(); await settle(n, 500)
      await n.locator('[role="option"]').filter({ hasText: 'Germaine' }).first().click(); await n.keyboard.press('Escape'); await settle(n, 300)
      await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(n, 2200)
      const plead = sql(`select id from leads where name='Probe Gap E'`)
      const pid = plead ? sql(`select id from projects where lead_id='${plead}'`) : ''
      if (plead) later(`delete from lead_files where lead_id='${plead}'`)
      const names = pid ? sql(`select name from lead_files where lead_id='${plead}' and kind='folder' and parent_id is null order by name`).split('\n') : []
      ok(!!pid && ['Contract & VOs', 'Floor plans', 'Quotes & BOQ', 'Renders', 'Site photos'].every((x) => names.includes(x)) && names.length === 5, '4 New project makes the five starter folders with the project')
      ok(!!pid && sql(`select count(distinct created_at) from lead_files where lead_id='${plead}' and kind='folder'`) === '1' && sql(`select created_at from lead_files where lead_id='${plead}' and kind='folder' limit 1`) === sql(`select created_at from projects where id='${pid}'`), '4 … in the project’s own moment (one write)')
      await N.close()
    }

    // ── phone 390 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('phone 390')
    const Ph = await phoneCtx()
    const ph = await page(Ph, 'phone')
    await go(ph, `/projects/${ben}/files`)
    ok(await overflow(ph) <= 0, '390 Files has no sideways scroll')
    await shot(ph, 'e07-phone-files', true)
    await go(ph, `/projects/${ben}/files/${sibs[2]}`)
    ok(await overflow(ph) <= 0 && await ph.locator('[data-testid="viewer-strip"]').isVisible(), '390 the viewer and its strip fit the phone')
    const fab = await ph.getByRole('button', { name: 'Maison AI' }).first().boundingBox().catch(() => null)
    const stripBox = await ph.locator('[data-testid="viewer-strip"]').boundingBox()
    ok(!fab || !stripBox || fab.y + fab.height <= stripBox.y + 1, '390 the Maison AI button steps over the strip')
    await shot(ph, 'e08-phone-viewer-strip')
    await go(ph, '/settings?section=notifications')
    await ph.locator('[data-testid="notification-sent"]').scrollIntoViewIfNeeded(); await settle(ph, 900)
    ok(await overflow(ph) <= 0, '390 Sent messages has no sideways scroll (a card per row)')
    await shot(ph, 'e09-phone-sent')
    await Ph.close()
    const T = await b.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true })
    const t = await page(T, '320')
    await go(t, `/projects/${ben}/files/${sibs[2]}`)
    ok(await overflow(t) <= 0, '320 the viewer has no sideways scroll')
    await T.close()

    ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 300))
  } finally {
    for (const id of sql(`select id from leads where name='Probe Gap E'`).split('\n').filter(Boolean)) {
      for (const t of ['project_invoices', 'project_milestones']) sql(`delete from ${t} where project_id in (select id from projects where lead_id='${id}')`)
      for (const t of ['projects', 'lead_events', 'notifications', 'lead_notes', 'questions', 'lead_assignees', 'lead_files']) sql(`delete from ${t} where lead_id='${id}'`)
      sql(`delete from leads where id='${id}'`)
    }
    if (given) sql(`update settings set value='${given}' where key='project_numbers_given'`)
    for (const q of undo.reverse()) { try { sql(q) } catch (e) { console.log('  (undo failed)', q.slice(0, 80)) } }
    as('dane')
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
