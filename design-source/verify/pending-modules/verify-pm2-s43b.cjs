// S43B · Honest reads and true demo data (s42/pending-ledger.md › F1, every item but F1-05 — his "fix all the pending things" 2026-10-15).
// Each fix asserted as the rule it builds, never another round's count:
//  F1-01 Auto Fill reads the picked file by rule — the Move stage window (Contacted, Met) and Notes: a picture is attached and fills nothing
//        ("We can’t read pictures yet — type what was said"); a WhatsApp export, call notes or an email PDF fill only the empty fields with what
//        they plainly say, what was entered is kept and said so, the line says what filled; never the mock's scripted values
//  F1-02 Recreate from my quote never reads a file's name: a photo is "Not read" with the designs open to pick from; a PDF named like a
//        reference quote but holding none of its words is never a "Strong match"; a reference PDF still reads by its words
//  F1-03 the website's capability pictures are 2.0's own captures (none of 1.0's illustration files is served), the four unused co-pilot
//        pictures and 1.0's kitchen pair are gone, the home's before/after is the engine's living room, the lines beside the pictures say what
//        2.0 does
//  F1-04 the demo's month is never a loss: repair R147's invoice is sent and paid on the demo day with its trail; Profit this month is positive;
//        a second repair finds it on record
//  F1-06 a Hangout chat's End offers "Resume … at Met" to a lead on hold, as its meeting page does (S42G)
//  F1-07 the server checks a stage's fields: a bypassed client's Contacted move without its channel, and a correction without its outcome, are
//        refused with the window's own words; nothing moves
//  F1-08 a client's portal never carries the studio's own addresses (previewHref) — a studio preview does
//  F1-09 LEADS D-42 (and DEF-32 · G-15) settled by design (quote editor D-101), in the workbook too
//  F1-10 the credits story's bookkeeping stamps are never ahead of now — repair R111 and the restore hold them
//  + no page errors; no sideways scroll at 390 / 320 (against screen.width) where these changed
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Every table it changes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s43b.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s43b')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const REPO = path.join(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sqlOn = (db, q) => execSync(`sqlite3 -cmd ".timeout 30000" "${db}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const sql = (q) => sqlOn(DB, q)
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s43b-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra !== undefined ? `— ${String(extra).slice(0, 300)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 's43b-'))
const repair = () => execSync(`npx tsx scripts/repair-demo-data.ts`, { cwd: REPO, env: { ...process.env, DATABASE_URL: `file:${DB}` }, maxBuffer: 64 * 1024 * 1024 }).toString()

/* the demo's records */
const MARCUS_CHEN = '6418e858-13e3-416f-b7c1-2481d1e0ca6f'   // New, Dane on it
const GAVIN = '6f5cb2dd-b737-4d09-a178-90c0ce0609e0'         // Contacted, Dane on it
const LIM = sql(`select lead_id from hangout_registrations where name = 'Lim Wei Ling'`)
const TODAY_HANGOUT = 'hge-qh-2026-marina'
const AISHA_P = sql(`select id from projects where number = 'P-2026-003'`)
const BEN_LEAD = sql(`select id from leads where name = 'Benjamin Han' and deleted_at is null`)
const BEN_PHONE = '97731968'
/* 1.0's illustrations, by their bytes (sha1, first 12) — none may be served any more */
const OLD_PICTURES = new Set(['2b50f1253d36', 'c108a4ebb2f9', 'a41534f0347f', 'b5e75fbe133f', '6dc2dcd63dff', '3eb0a41a18b1', '4e2282c6edb4', 'ea4bd5718e40', '709b9bd64712', '6341428cefe9', 'f4e8480f7d78', '9c0252aed4b2', '8da3acf23d78', 'f99587544aba', 'e61323b843a2', 'e5cc8237bdd2', '99e033a1e097', 'abd0fa40a3f4'])

/** A one-page PDF of text lines (Helvetica) — what pdf.js reads. */
function makePdf(lines) {
  const esc = (s) => s.replace(/([()\\])/g, '\\$1')
  const ops = lines.map((s, i) => `BT /F1 10 Tf 40 ${800 - i * 16} Td (${esc(s)}) Tj ET`).join('\n')
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(ops, 'latin1')} >>\nstream\n${ops}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const x = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
const file = (name, buf) => { const p = path.join(FILES, name); fs.writeFileSync(p, buf); return p }
const PICTURE = file('chat-screenshot.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAfElEQVR4nA3JIQ5EMQhAwX/OdxIEQaEaBKKpQm2QlRxwO3a+EcYYZxaTzGGK+fFd4RrXuYub3MMt7osW2minF530oYt+UUIZ5dSikjpUUS+2sI3t7MVO9mEX+0UIYYQTi0jiEEW8cMENd3zhiR+88BcqqKGOLjTRgxb64w9oYl/BRFVSYQAAAABJRU5ErkJggg==', 'base64'))
const CHAT = file('chat.txt', Buffer.from([
  '12/10/2026, 7:45 pm - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.',
  '12/10/2026, 7:46 pm - Dane: Hi Marcus, this is Dane from Demo Studio — thanks for your enquiry on the 4-room at Punggol.',
  '12/10/2026, 8:02 pm - Marcus Chen: Hi Dane! Busy now, can you call me back tomorrow at 7pm?',
  '12/10/2026, 8:03 pm - Dane: Sure, will call you then',
].join('\n')))
const MEETING_NOTES = file('site-visit-notes.txt', Buffer.from(['Site visit at the unit', 'Date: 14/10/2026 2:00 PM', 'Measured the kitchen and both bathrooms.'].join('\n')))
const EMAIL = file('Re renovation.pdf', makePdf(['From: Gavin See <gavin.see@gmail.com>', 'Sent: Tuesday, 13 October 2026 9:12 PM', 'To: Dane <dane@demostudio.sg>', 'Subject: Re: Your renovation', '', 'Hi Dane, thanks for the quick reply.', 'Could you call me back on Thursday 2:30pm?', 'Gavin']))
const FLO_NAMED = file('flo.pdf', makePdf(['Payment advice', 'Reference 2026-118', 'Amount received 1,200.00', 'Thank you']))   // a reference quote's name, none of its words
const COVE = path.join(REPO, 'public/uat-files/cove-interior-quotation.pdf')
const PHOTO = path.join(REPO, 'public/uat-files/kitchen-moodboard.jpg')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 900) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const valueOf = (l) => l.first().evaluate((el) => (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el.value : el.textContent || '').trim())
  const autoFill = (p) => p.locator('[role="dialog"]').filter({ hasText: 'Drop in the conversation' }).last()
  const pickIn = async (p, scope, f) => { await scope.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(p, 500); await autoFill(p).getByTestId('auto-fill-input').setInputFiles(f); await settle(p, 2500) }
  const checkedChannel = async (scope) => (await scope.getByRole('radiogroup', { name: 'Contacted via' }).getByRole('radio', { checked: true }).allInnerTexts()).join('|')

  /* every table, as it was — put back whole in `finally` (a probe never leaves a row behind) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/projects', 1500); await C0.close() }   // a first page's lazy writes land first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => crypto.createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let body = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      body += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) body += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    body += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(body)
    return changed
  }

  try {
    as('dane')

    // ── F1-01 · Auto Fill reads the file by rule ─────────────────────────────────────────────────────────────────────────────────────
    console.log('F1-01 · Auto Fill — the Move stage window')
    {
      const D = await desk(); const p = await page(D, 'autofill')
      await go(p, `/leads/${MARCUS_CHEN}?move=contacted`, 1500)
      const w = p.getByRole('dialog', { name: 'Move stage' })
      ok(await w.isVisible(), 'the Move stage window opens at Contacted')
      await w.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(p, 500)
      const help = await text(autoFill(p))
      ok(/chat export/i.test(help) && /pictures can’t be read yet/.test(help) && !/we'll identify the channel, summarise/i.test(help), 'the dialog says what it reads — a chat export, an email PDF, call notes — and that pictures can’t be read yet', help)
      await shot(p, '01-autofill-dialog-1440')
      await autoFill(p).getByTestId('auto-fill-input').setInputFiles(PICTURE); await settle(p, 2500)
      ok(await autoFill(p).count() === 0 || !(await autoFill(p).isVisible()), 'a picked file closes the dialog')
      const note1 = await text(w.getByTestId('auto-fill-note'))
      ok(/chat-screenshot\.png is attached\. We can’t read pictures yet — type what was said\./.test(note1), 'a picture: attached, and the log says it can’t be read yet', note1)
      ok(await checkedChannel(w) === '' && (await valueOf(w.getByLabel('Outcome'))) !== 'Callback requested', 'a picture fills nothing — no channel, no scripted “Callback requested”')
      ok(await w.getByText('chat-screenshot.png').count() >= 1 && Number(sql(`select count(*) from lead_files where lead_id = '${MARCUS_CHEN}' and name = 'chat-screenshot.png' and deleted_at is null`)) === 1, '…the picture is the log’s attachment, uploaded to the lead’s Files')
      await shot(p, '02-autofill-picture-1440')
      /* what was entered stays: the outcome picked first, then the chat export */
      await w.getByLabel('Outcome').first().click(); await settle(p, 300); await p.getByRole('option', { name: 'Connected', exact: true }).click(); await settle(p, 300)
      await pickIn(p, w, CHAT)
      const note2 = await text(w.getByTestId('auto-fill-note'))
      ok(/Filled from chat\.txt: Contacted via, Date & Time and the next call or meeting\./.test(note2) && /Kept what you entered for Outcome\./.test(note2), 'the chat export: what filled is said, the outcome entered first is kept and said so', note2)
      ok(await checkedChannel(w) === 'WhatsApp', 'Contacted via: WhatsApp — the export’s own shape')
      const whens = await w.getByLabel('Date & Time').evaluateAll((els) => els.map((el) => (el.tagName === 'INPUT' ? el.value : el.textContent || '').trim()))
      ok(whens.includes('12/10/2026, 8:03 PM') && whens.includes('13/10/2026, 7:00 PM'), 'Date & Time is the last message’s; the next step is “tomorrow at 7pm” read against the client’s message', whens.join(' | '))
      ok((await valueOf(w.getByLabel('Outcome'))) === 'Connected' && (await valueOf(w.getByLabel('Preferred mode'))) === 'Call', 'the outcome entered is kept; the next step’s mode is the client’s “call me back”')
      await shot(p, '03-autofill-chat-1440')

      // ── F1-07 · the server checks the fields (a bypassed client) ──
      console.log('F1-07 · the server checks a stage’s fields')
      let bent = 0
      await p.route('**/*', async (route) => {
        const r = route.request()
        const body = r.method() === 'POST' && r.headers()['next-action'] ? r.postData() ?? '' : ''
        if (body.includes('"toStage":"Contacted"') && body.includes('"channel":"WhatsApp"')) { bent++; return route.continue({ postData: body.replace('"channel":"WhatsApp"', '"channel":null') }) }
        return route.continue()
      })
      await w.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 900)
      const st = p.locator('[role="dialog"]').filter({ hasText: 'Suggested tasks' }).last()
      if (await st.count()) { await st.getByRole('button', { name: 'Move without tasks' }).click(); await settle(p, 2000) }
      const said = await snackText(p)
      ok(bent === 1 && /The Contacted step isn’t complete — Log 1’s Contacted via: choose an option/.test(said), 'a move whose channel was taken out on the way is refused with the window’s own words', `${bent} · ${said}`)
      ok(sql(`select stage from leads where id = '${MARCUS_CHEN}'`) === 'New' && Number(sql(`select count(*) from stage_logs where lead_id = '${MARCUS_CHEN}' and to_stage = 'Contacted'`)) === 0, '…nothing moved, no stage log')
      await shot(p, '04-server-refuses-1440')
      await p.unroute('**/*')
      await D.close()
    }
    /* the Met step: meeting notes say where and when */
    {
      const D = await desk(); const p = await page(D, 'autofill-met')
      await go(p, `/leads/${GAVIN}?move=met`, 1500)
      const w = p.getByRole('dialog', { name: 'Move stage' })
      await pickIn(p, w, MEETING_NOTES)
      const note = await text(w.getByTestId('auto-fill-note'))
      ok(/Filled from site-visit-notes\.txt: Where and Date & Time\./.test(note), 'Met: meeting notes fill Where and Date & Time', note)
      ok((await valueOf(w.getByLabel('Where'))) === 'In person' && (await valueOf(w.getByLabel('Date & Time'))) === '14/10/2026, 2:00 PM', '…“Site visit at the unit” is In person; the labelled date is its moment')
      await shot(p, '05-autofill-met-1440')
      await D.close()
    }
    console.log('F1-01 · Auto Fill — Notes & Logs')
    {
      const D = await desk(); const p = await page(D, 'notes-autofill')
      await go(p, `/leads/${GAVIN}/notes`, 1500)
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 300)
      await p.getByText('Contact Log', { exact: true }).last().click(); await settle(p, 800)
      const pane = p.getByTestId('contact-editor').first()
      await pickIn(p, p.locator('main'), EMAIL)
      const note = await text(pane.getByTestId('auto-fill-note'))
      ok(/Filled from Re renovation\.pdf: Contacted via, Date & Time, Outcome and the next call or meeting\./.test(note), 'an email saved as a PDF: what filled is said', note)
      ok(await checkedChannel(pane) === 'Email' && (await valueOf(pane.getByLabel('Outcome'))) === 'Callback requested', '…Email, and the client’s “call me back” is Callback requested')
      const tasks = p.locator('[role="dialog"]').filter({ hasText: 'Add tasks' }).last()
      ok(await tasks.isVisible() && /Follow up with the client via Call on 15\/10\/2026, 2:30 PM/.test(await text(tasks)), 'Add tasks offers the reminder for the next step the email named (Thursday 2:30pm after Tue 13 Oct)', await text(tasks))
      await shot(p, '06-notes-autofill-email-1440')
      await tasks.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      ok(!/Client confirmed the renovation scope/.test(await text(p.locator('main'))), 'never the scripted sentence')
      await D.close()
    }
    {
      /* a picture on the Notes tab — at 390 under a finger: the sheet, no sideways scroll */
      const P = await phoneCtx(); const p = await page(P, 'notes-autofill-390')
      await go(p, `/leads/${GAVIN}/notes`, 1500)
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 400)
      await p.getByText('Contact Log', { exact: true }).last().click(); await settle(p, 900)
      const sheet = p.locator('[role="dialog"]').filter({ hasText: 'Contact log' }).last()
      await sheet.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(p, 600)
      ok(await sideways(p) <= 0, '390: the Auto Fill dialog — no sideways scroll')
      await shot(p, '07-autofill-dialog-390')
      await autoFill(p).getByTestId('auto-fill-input').setInputFiles(PICTURE); await settle(p, 2500)
      ok(/We can’t read pictures yet — type what was said/.test(await text(p.getByTestId('auto-fill-note'))), '390: a picture says so in the log')
      ok(await p.locator('[role="dialog"]').filter({ hasText: 'Add tasks' }).count() === 0, '…and offers no tasks (nothing was read)')
      await shot(p, '08-autofill-picture-390')
      await P.close()
    }

    // ── F1-02 · Recreate from my quote never reads a name ─────────────────────────────────────────────────────────────────────────────
    console.log('F1-02 · Upload my existing quote')
    {
      const D = await desk(); const p = await page(D, 'recreate')
      const open = async () => { await go(p, '/company/templates/quotes', 1200); await p.getByTestId('new-template').first().click(); await settle(p, 300); await p.getByText('Upload my existing quote', { exact: true }).click(); await settle(p, 500) }
      const read = async (f) => { await p.getByTestId('recreate-file').setInputFiles(f); await p.waitForSelector('[data-testid="recreate-reasons"]', { timeout: 20000 }); await settle(p, 300); return { eyebrow: await text(p.getByTestId('recreate-confidence')), reasons: await text(p.getByTestId('recreate-reasons')) } }
      await open()
      const photo = await read(PHOTO)
      ok(/^not read$/i.test(photo.eyebrow) && !/match|name/i.test(photo.eyebrow), 'a photo is “Not read” — never a match, never “by its name”', photo.eyebrow)
      ok(/A photo has no words to read here — pick the design that looks closest/.test(photo.reasons) && !/framed form|letter’s|boxed form/i.test(photo.reasons), '…its one reason says so — no reference quote’s lines', photo.reasons)
      ok(await p.getByRole('radiogroup', { name: 'Design' }).isVisible(), '…and the designs are open to pick from')
      await shot(p, '09-recreate-photo-1440')
      await p.getByRole('button', { name: 'Start over' }).click(); await settle(p, 400)
      const named = await read(FLO_NAMED)
      ok(!/Strong/.test(named.eyebrow) && !/framed form|Scope of work in lettered/.test(named.reasons) && /Nothing in its words points to one design/.test(named.reasons), 'a PDF named like a reference quote, without its words, is never a Strong match from its name', `${named.eyebrow} · ${named.reasons}`)
      await p.getByRole('button', { name: 'Start over' }).click(); await settle(p, 400)
      const cove = await read(COVE)
      ok(/A4 paper/.test(cove.reasons) && /grand total reads/.test(cove.reasons) && !/its name/i.test(cove.reasons), 'a reference quote still reads by its own words (paper, columns, totals)', cove.reasons.slice(0, 200))
      await p.keyboard.press('Escape'); await settle(p, 300)
      await D.close()
    }

    // ── F1-03 · the website's pictures show 2.0 ──────────────────────────────────────────────────────────────────────────────────────
    console.log('F1-03 · the website’s pictures')
    {
      const D = await desk(); const p = await page(D, 'site')
      const served = new Set()
      for (const slug of ['visualizer', 'space-planner', 'finance', 'projects', 'maison-ai']) {
        await go(p, `/site/platform/${slug}`, 1200)
        const grid = p.getByTestId('module-capabilities')
        await grid.scrollIntoViewIfNeeded(); await settle(p, 1200)
        const cards = await grid.locator('h3').count(), imgs = await grid.locator('img').evaluateAll((els) => els.map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth })))
        ok(imgs.length === cards && imgs.every((i) => i.w === 1200), `${slug}: every card wears its picture (one look per grid), each 1200 wide`, JSON.stringify(imgs))
        for (const i of imgs) {
          const r = await p.request.get(BASE + i.src)
          const sha = crypto.createHash('sha1').update(await r.body()).digest('hex').slice(0, 12)
          if (OLD_PICTURES.has(sha)) served.add(i.src)
        }
        await shot(p, `10-site-${slug}-1440`)
      }
      ok(served.size === 0, 'none of 1.0’s illustrations is served — every picture is a capture of 2.0', [...served].join(' · '))
      for (const gone of ['co-pilot/deal-score.jpg', 'co-pilot/estimate.jpg', 'co-pilot/transcript.jpg', 'co-pilot/whispers.jpg', 'ai-visualiser-room.jpg', 'ai-visualiser-room-before.jpg']) {
        ok((await p.request.get(`${BASE}/site/marketing/${gone}`)).status() === 404, `the unused ${gone} is gone`)
      }
      await go(p, '/site/platform/projects')
      const words = await text(p.locator('main'))
      ok(/Maison AI drafts a schedule with milestones from your signed quote — you check it before it lands/.test(words) && /Late milestones, overdue payments and what waits on you rise to the top early/.test(words) && !/AI detects delays/.test(words), 'Projects: the lines beside the pictures say what 2.0 does by rule')
      await go(p, '/site/platform/space-planner')
      const sp = await text(p.locator('main'))
      ok(/Top, 3D and Walk views/.test(sp) && /share it to your client’s portal/.test(sp) && !/Perspective|sign-off/.test(sp), 'Space Planner: 2.0’s three views, shared to the portal — no sign-off it doesn’t take')
      await go(p, '/site/platform/visualizer')
      ok(/they pick a favourite and pin a note/.test(await text(p.locator('main'))), 'Visualizer: sharing says what the client does on the link')
      const ba = await p.getByTestId('before-after').locator('img').evaluateAll((els) => els.map((i) => i.getAttribute('src')))
      ok(ba.includes('/visualizer/samples/living-room/original.jpg') && ba.includes('/visualizer/welcome/living-room-after.jpg') && /Mushroom · Walnut · Terracotta/i.test(await text(p.getByTestId('before-after'))), 'the before/after is 2.0’s own — the living room the engine painted, its three picks', ba.join(' · '))
      await go(p, '/site')
      ok(await p.getByTestId('before-after').count() === 0 || (await p.getByTestId('before-after').locator('img').evaluateAll((els) => els.map((i) => i.getAttribute('src')))).every((s) => !/ai-visualiser-room/.test(s)), 'the home page carries no 1.0 kitchen pair')
      await D.close()
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const P = await phoneCtx(w, h); const q = await page(P, `site-${w}`)
        for (const slug of ['projects', 'visualizer']) { await go(q, `/site/platform/${slug}`, 900); ok(await sideways(q) <= 0, `${w}: /site/platform/${slug} — no sideways scroll`) }
        if (w === 390) { await q.getByTestId('module-capabilities').scrollIntoViewIfNeeded(); await settle(q, 900); await shot(q, '11-site-visualizer-390') }
        await P.close()
      }
    }

    // ── F1-04 · the demo's month is never a loss ─────────────────────────────────────────────────────────────────────────────────────
    console.log('F1-04 · the demo’s month')
    {
      const inv = json(`select i.id, i.number, i.status, i.kind, i.reason, i.amount_minor, i.sent_by, i.file_id, i.share_token, strftime('%Y-%m', i.sent_at, 'unixepoch', 'localtime') = strftime('%Y-%m', 'now', 'localtime') AS today, i.sent_at <= strftime('%s','now') AS past FROM project_invoices i WHERE i.project_id = '${AISHA_P}' AND i.kind = 'one_off' AND i.reason = 'upgrade'`)
      ok(inv.length === 1 && inv[0].status === 'sent' && /^INV-\d{4}-\d{3}$/.test(inv[0].number) && inv[0].today === 1 && inv[0].past === 1 && inv[0].file_id && inv[0].share_token, 'R147: one upgrade invoice on Aisha’s project — sent this month (not after now; a morning restore can re-date it late yesterday — S44 closing regression), numbered, filed, with its link', JSON.stringify(inv))
      const id = inv[0]?.id ?? ''
      const pay = json(`select status, receipt_number, receipt_file_id, method, amount_minor from project_payments where invoice_id = '${id}'`)
      ok(pay.length === 1 && pay[0].status === 'confirmed' && /^RCT-/.test(pay[0].receipt_number) && pay[0].receipt_file_id && pay[0].amount_minor === inv[0]?.amount_minor, '…paid in full by PayNow with its receipt and file')
      ok(Number(sql(`select count(*) from lead_events where project_id = '${AISHA_P}' and json_extract(detail, '$.id') in ('${id}', (select id from project_payments where invoice_id = '${id}')) and kind in ('project_invoice_created','project_invoice_sent','project_payment_recorded')`)) === 3, '…Activity has its created · sent · payment lines')
      ok(sql(`select group_concat(member_id) from (select member_id from notifications where kind = 'invoice_sent' and href like '%${id}%' order by member_id)`) === 'huimin,priya', '…the money runners heard it (Hui Min, Priya) — never Dane, who sent it')
      const D = await desk(); const p = await page(D, 'dashboard')
      await go(p, '/dashboard', 1500)
      const tile = await text(p.getByTestId('tile-profit'))
      ok(/Profit this month/i.test(tile) && !/−S\$/.test(tile) && /Margin [\d.]+% on S\$[\d,.]+ invoiced/.test(tile), 'the front door: Profit this month is not a loss, its margin on what was invoiced', tile)
      await shot(p, '12-dashboard-profit-1440')
      await go(p, `/projects/${AISHA_P}/money`, 1500)
      ok(/Bedroom flooring upgrade/.test(await text(p.locator('main'))) && /PAID/i.test(await text(p.locator('[data-testid="money-stages"] [data-kind="extra"]').filter({ hasText: 'Bedroom flooring upgrade' }))), 'Aisha’s Money: the upgrade sits outside the stages, Paid')
      await D.close()
      const out = repair()
      ok(/R147[^\n]*\n\s+her flooring upgrade is on record — nothing to do/.test(out) && Number(sql(`select count(*) from project_invoices where project_id = '${AISHA_P}' and kind = 'one_off' and reason = 'upgrade'`)) === 1, 'a second repair finds it on record — idempotent')
      ok(/all checks pass/.test(out), 'the repair’s checks all pass')
    }

    // ── F1-10 · the credits story's own stamps never ahead of now ─────────────────────────────────────────────────────────────────────
    console.log('F1-10 · the credits balance’s stamp')
    {
      const now = Math.floor(Date.now() / 1000)
      ok(Number(sql(`select count(*) from studio_credit_balances where updated_at > ${now + 60}`)) === 0, 'the balance was last written at or before now')
      sql(`update studio_credit_balances set updated_at = ${now + 2 * 3600} where id = 'studio'`)
      const out = repair()
      ok(/R111[^\n]*\n[^\n]*bookkeeping stamp\(s\) held at now/.test(out) && Number(sql(`select updated_at from studio_credit_balances where id = 'studio'`)) <= Math.floor(Date.now() / 1000), 'R111 holds a balance stamped ahead of now at now', (/R111[^\n]*\n[^\n]*/.exec(out) || [''])[0])
      const unit = execSync(`npx tsx -e "import('./lib/credits/demo-month.ts').then((m) => console.log(JSON.stringify(m.clampCreditBookkeeping({ studio_credit_balances: [{ id: 'studio', updated_at: 500 }], subscriptions: [{ id: 's', updated_at: 90 }] }, 100))))"`, { cwd: REPO }).toString().trim()
      ok(unit === '{"studio_credit_balances":[{"id":"studio","updated_at":100}],"subscriptions":[{"id":"s","updated_at":90}]}', 'the restore’s clamp holds a later stamp at now and leaves an earlier one', unit)
    }

    // ── F1-06 · a Hangout chat's End offers the resume to a lead on hold ─────────────────────────────────────────────────────────────
    console.log('F1-06 · Hangouts — End on a lead on hold')
    {
      sqlFile(`UPDATE leads SET stage = 'On Hold' WHERE id = '${LIM}';\nINSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at, moved_by) VALUES ('probe-s43b-hold', '${LIM}', 'New', 'On Hold', '{"reason":"Budget"}', ${Math.floor(Date.now() / 1000) - 3600}, 'dane');\n`)
      const D = await desk(); const p = await page(D, 'hangout')
      await go(p, `/qanvast-ops/hangouts/${TODAY_HANGOUT}?view=meetings`, 1600)
      const chat = (name) => p.locator('[data-card="hangout-chat"]').filter({ has: p.getByTestId('chat-name').filter({ hasText: name }) })
      await chat('Lim Wei Ling').getByTestId('chat-start').click(); await settle(p, 1500)
      await chat('Lim Wei Ling').getByTestId('chat-end').click(); await settle(p, 500)
      const end = p.getByRole('dialog', { name: 'End the chat with Lim Wei Ling' })
      await end.getByTestId('end-outcome').getByRole('radio', { name: 'Follow-up' }).click()
      await end.getByTestId('end-reason').getByRole('radio', { name: 'Site visit needed' }).click().catch(() => {})
      const follow = end.getByTestId('end-follow')
      ok(await follow.count() === 1 && (await follow.getAttribute('data-step')) === 'met' && /Resume Lim’s lead at Met/.test(await text(follow)) && /on hold/.test(await text(follow)), 'a lead on hold: End offers “Resume Lim’s lead at Met” — the meeting page’s own offer', await text(follow))
      await shot(p, '13-hangout-end-resume-1440')
      await end.getByTestId('end-save').click()
      await p.waitForURL(new RegExp(`/leads/${LIM}`), { timeout: 10000 }).catch(() => {}); await settle(p, 2000)
      ok(/Resume at Met/.test(await text(p.locator('[role="dialog"]').last())), 'End lands on the lead, asking “Resume at Met?” first', await text(p.locator('[role="dialog"]').last()))
      await shot(p, '14-hangout-resume-confirm-1440')
      await D.close()
    }

    // ── F1-07 · a correction is checked too ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('F1-07 · a correction without its outcome')
    {
      const D = await desk(); const p = await page(D, 'correction')
      const payload0 = sql(`select payload from stage_logs where lead_id = '${GAVIN}' and to_stage = 'Contacted' order by created_at desc limit 1`)
      await go(p, `/leads/${GAVIN}?move=contacted`, 1500)
      const w = p.getByRole('dialog', { name: 'Move stage' })
      await w.getByRole('button', { name: 'Edit' }).first().click(); await settle(p, 400)
      let bent = 0
      await p.route('**/*', async (route) => {
        const r = route.request()
        const body = r.method() === 'POST' && r.headers()['next-action'] ? r.postData() ?? '' : ''
        if (body.includes('"stage":"Contacted"') && /"outcome":"[^"]+"/.test(body)) { bent++; return route.continue({ postData: body.replace(/"outcome":"[^"]+"/, '"outcome":""') }) }
        return route.continue()
      })
      await w.getByRole('button', { name: 'Save changes', exact: true }).click(); await settle(p, 2000)
      const said = await snackText(p)
      ok(bent >= 1 && /The Contacted step isn’t complete — Log 1’s Outcome: this field is required/.test(said) && !/details updated/.test(said), 'a correction whose outcome was emptied on the way is refused in the window’s words — never “details updated”', `${bent} · ${said}`)
      ok(sql(`select payload from stage_logs where lead_id = '${GAVIN}' and to_stage = 'Contacted' order by created_at desc limit 1`) === payload0, '…the stage’s details are as they were')
      await p.unroute('**/*')
      await D.close()
    }

    // ── F1-08 · a client's portal carries no studio address ──────────────────────────────────────────────────────────────────────────
    console.log('F1-08 · the portal’s studio addresses')
    {
      const C = await desk(); const c = await page(C, 'portal-client')
      const bodies = []
      c.on('response', async (r) => { try { if (r.request().method() === 'POST' && r.request().headers()['next-action']) bodies.push(await r.text()) } catch {} })
      await go(c, '/my/demo-studio/login')
      await c.locator('input[type="tel"]').fill(BEN_PHONE); await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
      await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
      await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 2500)
      const leaks = []
      for (const u of ['/my/demo-studio', '/my/demo-studio/files', '/my/demo-studio/money']) {
        await go(c, u, 1500)
        const html = await c.content()
        if (/previewHref\\?":\\?"\//.test(html) || /\/(quotes|contracts)\/[0-9a-f-]{36}\/preview/.test(html)) leaks.push(u)
      }
      await c.getByRole('button', { name: /Notifications|bell/i }).first().click().catch(() => {}); await settle(c, 1200)
      ok(leaks.length === 0, 'a client’s Home, Files and Money carry no studio address (no previewHref, no /preview)', leaks.join(' · '))
      ok(bodies.length > 0 && bodies.every((t) => !/previewHref\\?":\\?"\//.test(t)), '…nor does their bell’s answer', `${bodies.length} answers`)
      await C.close()
      as('dane')
      const D = await desk(); const d = await page(D, 'portal-preview')
      await go(d, `/my/demo-studio/preview?client=${BEN_LEAD}`, 2000)
      const slug = decodeURIComponent((/\/my\/([^/?#]+)/.exec(d.url()) || [])[1] || '')
      await go(d, `/my/${slug}/files`, 1500)
      ok(/previewHref\\?":\\?"\//.test(await d.content()), 'a studio preview keeps the studio’s own reads (its documents open as the studio’s preview)')
      await D.close()
    }

    // ── F1-09 · LEADS D-42 settled by design ────────────────────────────────────────────────────────────────────────────────────────
    console.log('F1-09 · LEADS D-42')
    {
      const rows = JSON.parse(fs.readFileSync(path.join(REPO, 'design-source/uat/story/checklist-LEADS.json'), 'utf8'))
      const pick = (id) => rows.find((r) => r.id === id) || {}
      ok(['D-42', 'DEF-32', 'G-15'].every((id) => pick(id).now === 'Not built — by design' && /quote editor D-101/.test(pick(id).why)), 'D-42 (and DEF-32 · G-15) read “Not built — by design”, each quote’s own entity (quote editor D-101)')
      ok(!rows.some((r) => r.now === 'Later' && /entit/i.test(`${r.feature} ${r.why}`)), 'no entity row is left “Later”')
      const strings = execSync(`unzip -p "${path.join(REPO, 'design-source/uat/OpenMaison-2.0-UAT.xlsx')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString()   // every part — the workbook keeps its strings inline
      ok(/Each quote is issued from its own entity — Issued by \(quote editor D-101\)/.test(strings), 'the workbook was rebuilt with it')
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' / ') : e)
  } finally {
    const changed = putBack()
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    ok(still.length === 0, `every table put back as it was (${changed.length} changed and restored)`, still.join(' · '))
    await b.close()
    fs.rmSync(FILES, { recursive: true, force: true })
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
