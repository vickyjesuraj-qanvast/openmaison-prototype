// Pending modules, step S05 · Leads leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key held:leads).
// Each item asserted as the rule it builds, never another round's count:
//  - Manage Stages: the stage menu's row opens Settings › Lead management › Lead stages (#lead-stages, with the way back); the card lists the
//    seven stages, what each keeps, the live leads in each (a press opens the listing on it) and how leads move; the studio's two asks
//    (Contacted's next step · Won's signed contract) save, read back and are read-only for a Designer; the Contacted ask reaches the window
//  - testers' L-3 · L-4: a commercial lead asks for its company and UEN (no NRIC field), the info column shows them; a second client on the
//    lead (name · NRIC · mobile, checked) — the info column, a new quote starts with them, Client access offers them for the household
//  - Maison AI: "Add a lead for …" opens Create New Lead filled; "Move … to Met" opens the Move stage window there; "Put … on hold" the
//    dialog; "Change …'s budget" Edit Lead on its field; the listing's three suggestions answer from the rows; nothing is written by them
//  - the stage uploads keep their bytes: Quote Sent's uploaded quote under its own name, kept in Files › Quotes & BOQ; the steps' Attach rows
//    are the lead's own files (no 'Q-101'); Auto Fill takes the upload's day (testers' L-6) and attaches the picked screenshot
//  - export: Quote status · Project type · Company · UEN · Second client
//  - Return: Appeal (the banner, Return details' "here", the ⋮) — the wizard on the rejected return, Qanvast's reply, Send appeal, Undo; the
//    policy behind the info icon; Tips › View all; a file taken off a return still with Qanvast, Undo
//  - Coming soon presses: the FILES card's Create Folder / Upload Files work in place; From System › View opens the document; Imports has no
//    dead Filters; Files › New has no From Company Files
//  - head sort on Tasks (Due date · Status, one sort with Filters') and Files (Title · Updated · File size, folders first)
//  - the Attach files dialog: File Type · Sort · list view · a folder opens · its ⋮ ticks its files
//  - Notes › Refine tidies by rule, Undo puts it back; the On Hold day on its own line, whole; no page errors; no sideways scroll at 390 / 320
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s05.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s05')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s05-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
/* the demo's records (fixed ids) */
const OLIVIA = '2bc08444-0409-47c3-9675-0750977c5838'       // New · 13 files · OM-10001 · Dane
const MARCUS = '6418e858-13e3-416f-b7c1-2481d1e0ca6f'       // New · no files · Dane
const NUR = 'plead-hangout'                                 // New · a member, no contact yet
const GERALD = 'bed4ded0-1ac7-48fd-a7c4-639a7a00f02f'       // Met · next: Quote Sent
const JONATHAN = '7633b5fe-6d14-4d03-811b-83825ef185c6'     // Contacted · next: Met
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'   // Quote Sent · OM-10007 Sent to Client
const ARJUN = '3e25b972-1d28-4184-bdcc-e6655ef893a5'        // On Hold · Qanvast · a rejected return (7 days to appeal)
const MUTHU = '72d56067-21ce-47d1-aa5b-dbbe70d88e0b'        // Lost · Qanvast · a return still with Qanvast, one attachment
const BENJAMIN = '2b6d6bfc-5d25-48c8-904a-6f7a7c85cec3'     // Won · P-2026-002 · Mei Ling Han on the household (R107: his second client)
const RYAN = '5e8b9c29-54ef-4b56-96a4-2027804c4cd7'           // Won · P-2026-001 · his Won step corrected (a new signed-quote upload)
const MEILING = 'd925fe8f-276f-4d14-973b-6334e3acba37'      // On Hold · the day on its own line
/** A one-page PDF with a line of text. */
function makePdf(text) {
  const offs = []; let out = '%PDF-1.4\n'
  const add = (s) => { offs.push(Buffer.byteLength(out, 'latin1')); out += s }
  add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'); add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n')
  add('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n')
  const stream = `BT /F1 22 Tf 72 760 Td (${text}) Tj ET`
  add(`4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\n`); add('5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n')
  const xref = Buffer.byteLength(out, 'latin1')
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJgYGBAQAk8QL+tHSGfAAAAABJRU5ErkJggg==', 'base64')
const today = (() => { const d = new Date(); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` })()

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it: these tables whole (they are small) — the rest by what was made after T0 */
  const you0 = sql(`select id from members where is_you = 1`)
  const WHOLE = ['leads', 'lead_returns', 'return_attachments', 'lead_files', 'lead_notes', 'note_attachments', 'lead_tasks', 'task_assignees', 'stage_logs', 'lead_events', 'notifications', 'notification_outbox', 'settings', 'homeowner_household_links']
  const kept = WHOLE.map((t) => [t, json(`select * from ${t}`)])
  const quotes0 = new Set(sql(`select id from quotes`).split('\n').filter(Boolean))
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    const made = sql(`select id from quotes`).split('\n').filter((id) => id && !quotes0.has(id))
    if (made.length) {
      const ids = made.map(lit).join(',')
      for (const t of ['quote_items', 'quote_payments', 'quote_files', 'quote_versions', 'quote_item_comments']) text += `DELETE FROM ${t} WHERE quote_id IN (${ids});\n`
      text += `DELETE FROM quotes WHERE id IN (${ids});\n`
    }
    text += `DELETE FROM lead_file_images WHERE file_id NOT IN (SELECT id FROM lead_files);\nDELETE FROM lead_file_thumbs WHERE file_id NOT IN (SELECT id FROM lead_files);\n`
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const dialog = (p, name) => p.locator(`[role="dialog"][aria-label="${name}"]`).last()
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.getByRole('button', { name: 'Maison AI', exact: true }).last().click(); await settle(p, 500) }
  const ask = async (p, q) => {
    const box = sheet(p).locator('[data-testid="maison-ask"] input')
    await box.fill(q); await box.press('Enter')
    await p.waitForFunction(() => !!document.querySelector('[data-testid="maison-answer"]') && !/Looking through your records/.test(document.querySelector('[data-testid="maison-answer"]').textContent || ''), null, { timeout: 15000 }).catch(() => {})
    await settle(p, 300)
    return sheet(p).locator('[data-testid="maison-answer"]')
  }
  const pick = async (p, field, option) => { await field.click(); await settle(p, 300); await p.getByRole('option', { name: option, exact: true }).last().click(); await settle(p, 300) }
  const files = path.join(os.tmpdir(), `pm2-s05-files-${process.pid}`); fs.mkdirSync(files, { recursive: true })
  const pdfPath = path.join(files, 'probe-s05-quote.pdf'); fs.writeFileSync(pdfPath, makePdf('S05 uploaded quote'))
  const pngPath = path.join(files, 'probe-s05-chat.png'); fs.writeFileSync(pngPath, PNG)
  /* (S43B · F1-01, a deliberate change of this rule) Auto Fill reads the file's words by rule — call notes that name no moment of their own */
  const notesPath = path.join(files, 'probe-s05-call-notes.txt'); fs.writeFileSync(notesPath, 'Called Nur about the kitchen. She asked us to call back tomorrow 7pm.\n')
  const png2Path = path.join(files, 'probe-s05-site.png'); fs.writeFileSync(png2Path, PNG)
  const txtPath = path.join(files, 'probe-s05-notes.txt'); fs.writeFileSync(txtPath, 'not a pdf')

  try {
    as('dane')
    const ctx = await desk()
    await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }))
    const p = await page(ctx, 'desk')

    // ── 1 · Manage Stages ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Manage Stages: Settings › Lead management › Lead stages')
      await go(p, '/leads')
      await p.getByRole('button', { name: /^All Leads/ }).first().click(); await settle(p, 400)
      await p.getByRole('menuitem', { name: /Manage Stages/ }).click()
      await p.waitForURL(/\/settings\?section=leads/, { timeout: 15000 }).catch(() => {}); await settle(p, 1500)
      const u = new URL(p.url())
      ok(u.searchParams.get('section') === 'leads' && u.hash === '#lead-stages' && (u.searchParams.get('from') || '').startsWith('/leads'), 'Manage Stages opens Settings › Lead management at #lead-stages, with the way back to the listing')
      const card = p.locator('[data-testid="lead-stages"]')
      ok(await card.isVisible(), 'the Lead stages card is on the page')
      ok(await card.locator('[role="row"][data-testid^="lead-stage-"]').count() === 7, 'it lists the seven stages')
      ok(await card.getByRole('radiogroup', { name: 'Stage movement' }).count() === 1 && await card.getByText('How leads move', { exact: true }).count() === 1, 'how leads move (Linear · Flexible) sits in it')
      const live = Number(sql(`select count(*) from leads where stage = 'Contacted' and deleted_at is null and direct = 0`))
      ok(new RegExp(`${live} leads?`).test(await card.locator('[data-testid="lead-stage-contacted"]').innerText()), 'Contacted shows the live leads in it, as the listing counts them')
      await shot(p, '01-lead-stages-1440', true)
      /* the Won ask: off and back on, read back from the record */
      await card.locator('label').filter({ hasText: 'Ask for the client’s signed contract' }).click(); await settle(p, 1200)
      ok(/"wonContract":false/.test(sql(`select value from settings where key = 'lead_stage_rules'`)) && /no longer asks for a signed contract/.test(await snackText(p)), 'Won’s signed contract can be switched off — saved, said')
      await card.locator('label').filter({ hasText: 'Ask for the client’s signed contract' }).click(); await settle(p, 1200)
      await card.locator('label').filter({ hasText: 'Ask for the next call or meeting’s date' }).click(); await settle(p, 1200)
      ok(/"contactNextStep":true/.test(sql(`select value from settings where key = 'lead_stage_rules'`)) && /"wonContract":true/.test(sql(`select value from settings where key = 'lead_stage_rules'`)), 'Contacted’s next step can be asked for; Won’s contract is back on')
      await p.locator('[data-testid="lead-stage-contacted"] a').click(); await p.waitForURL(/\/leads\?scope=contacted/, { timeout: 15000 }).catch(() => {}); await settle(p, 1200)
      ok(/All Leads|Contacted/.test(await p.getByRole('button', { name: /^Contacted \(/ }).first().innerText().catch(() => '')), 'a stage’s count opens the listing on that stage')
      /* a Designer reads it, never changes it */
      as('germaine')
      await go(p, '/settings?section=leads')
      ok(await p.locator('[data-testid="lead-stages"] input[type="checkbox"][disabled], [data-testid="lead-stages"] [data-disabled] input').count() >= 2, 'a Designer reads the asks, the switches disabled')
      as('dane')
      /* the ask reaches the window: Nur Aisyah moving into Contacted, an outcome and no next step */
      await go(p, `/leads/${NUR}?move=contacted`); await settle(p, 1500)
      const w = dialog(p, 'Move stage')
      ok(await w.isVisible(), 'the Move stage window opens at Contacted')
      ok(await w.getByText('Schedule a call/meeting', { exact: true }).count() === 0, 'before an outcome, no schedule block')
      await w.getByRole('button', { name: 'WhatsApp', exact: true }).first().click().catch(() => {})
      await pick(p, w.getByLabel('Outcome'), 'Connected')
      ok(await w.getByText('Schedule a call/meeting', { exact: true }).count() === 1, 'with the studio’s ask, the schedule loses its “(optional)”')
      await w.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 600)
      ok(await w.locator('[aria-invalid="true"]').count() >= 2 && /required/i.test(await w.innerText()), 'Save asks for the next call or meeting (and the proof of contact)')
      await shot(p, '02-contacted-asks-next-step-1440')
      // ── Auto Fill: the upload's day (L-6) and the picked screenshot itself, attached
      await w.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(p, 400)
      const af = p.locator('[role="dialog"]').filter({ hasText: 'Drop in the conversation' }).last()
      await af.getByTestId('auto-fill-input').setInputFiles(pngPath); await settle(p, 2500)   // (S43B · F1-01) the dialog's own picker
      ok(await w.getByText('probe-s05-chat.png', { exact: true }).count() === 1, 'the picked screenshot is the log’s attachment — never the mock’s Q-101')   // (S43B) exact: Auto Fill's line names it too
      /* (S43B · F1-01, a deliberate change of this rule) a picture is attached and fills nothing; call notes fill what they say — no moment of
         their own, so the upload's (testers' L-6), and the next step "tomorrow 7pm" */
      ok(/We can’t read pictures yet/.test(await w.getByTestId('auto-fill-note').innerText().catch(() => '')), 'a picture fills nothing and says so (S43B)')
      await w.getByRole('button', { name: 'Auto Fill' }).first().click(); await settle(p, 400)
      await p.locator('[role="dialog"]').filter({ hasText: 'Drop in the conversation' }).last().getByTestId('auto-fill-input').setInputFiles(notesPath); await settle(p, 2500)
      ok(Number(sql(`select count(*) from lead_files where lead_id = '${NUR}' and name = 'probe-s05-chat.png' and deleted_at is null`)) === 1 && Number(sql(`select count(*) from lead_file_images i join lead_files f on f.id = i.file_id where f.lead_id = '${NUR}' and f.name = 'probe-s05-chat.png'`)) === 1, '…uploaded to the lead’s Files with its bytes')
      await w.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 900)
      const st = p.locator('[role="dialog"]').filter({ hasText: 'Suggested tasks' }).last()
      if (await st.count()) { await st.getByRole('button', { name: 'Move without tasks' }).click(); await settle(p, 2000) }
      const pay = sql(`select payload from stage_logs where lead_id = '${NUR}' and to_stage = 'Contacted' order by created_at desc limit 1`)
      ok(/"fileIds":\["[0-9a-f-]{36}"(,"[0-9a-f-]{36}")*\]/.test(pay) && /probe-s05-chat\.png/.test(pay) && !/Q-101/.test(pay), 'the stage keeps the log’s files by id beside their names')   // (S43B) the screenshot and the notes
      const when = (/"when":"([^"]*)"/.exec(pay) || [])[1] || ''
      ok(when.startsWith(today) && /"nextStepWhen":"[^"]*7:00 PM"/.test(pay), `Auto Fill took the upload’s day — ${when} — and its next step at 7:00 PM (testers’ L-6)`)
      await go(p, `/leads/${NUR}/notes`)
      await p.getByText('Contact log').first().click().catch(() => {}); await settle(p, 800)
      ok(await p.getByText('probe-s05-chat.png').count() >= 1, 'Notes & Logs lists the stage log with its file')
      sqlFile(`DELETE FROM settings WHERE key = 'lead_stage_rules';`)
    }

    // ── 2 · testers' L-3 · L-4 ────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · A commercial client’s company and UEN; a second client on the lead')
      await go(p, `/leads/${MARCUS}`)
      await p.getByRole('button', { name: 'Edit lead' }).first().click(); await settle(p, 600)
      let f = dialog(p, 'Edit Lead')
      ok(await f.locator('[data-testid="lead-company"]').count() === 0, 'a home’s lead asks for no company')
      await pick(p, f.getByLabel('Property type'), 'Commercial — Office')
      ok(await f.locator('[data-testid="lead-company"]').count() === 1 && await f.getByLabel('UEN').count() === 1, 'an office asks for the company and its UEN')
      ok(await f.getByLabel('NRIC / FIN', { exact: true }).count() === 0, '…and no NRIC / FIN')
      await f.getByLabel('Company name').fill('Probe Trading Pte Ltd'); await f.getByLabel('UEN').fill('201912345k')
      await f.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 1800)
      ok(sql(`select company_name || '|' || company_uen || '|' || property_type from leads where id = '${MARCUS}'`) === 'Probe Trading Pte Ltd|201912345K|Commercial — Office', 'saved: the company, its UEN in capitals, the property type')
      ok(/Probe Trading Pte Ltd/.test(await p.locator('[data-testid="lead-company"]').first().innerText().catch(() => '')), 'the info column’s Lead info shows the company')
      await shot(p, '03-commercial-lead-1440')
      /* L-4 */
      await go(p, `/leads/${OLIVIA}`)
      await p.getByRole('button', { name: 'Edit lead' }).first().click(); await settle(p, 600)
      f = dialog(p, 'Edit Lead')
      await f.getByRole('button', { name: 'Add a second client' }).click(); await settle(p, 300)
      await f.getByLabel('Mobile (second client)').fill('12345678')
      await f.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 500)
      ok(await f.locator('[data-testid="lead-second-client"] [aria-invalid="true"]').count() >= 2, 'a second client’s mobile without a name, or not a Singapore number, is refused under the fields')
      await f.getByLabel('Second client', { exact: true }).fill('daniel martinez'); await f.getByLabel('NRIC / FIN (second client)').fill('s1234567d'); await f.getByLabel('Mobile (second client)').fill('91110000')
      await shot(p, '04-second-client-form-1440')
      await f.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 1800)
      ok(sql(`select client2_name || '|' || client2_nric || '|' || client2_phone from leads where id = '${OLIVIA}'`) === 'Daniel Martinez|S1234567D|91110000', 'saved: the name as a name, the NRIC in capitals, the bare 8 digits')
      ok(/Daniel Martinez · 9111 0000/.test(await p.locator('[data-testid="lead-second-client"]').first().innerText().catch(() => '')), 'the info column names the second client and their mobile')
      /* a new quote starts with them */
      await go(p, `/leads/${OLIVIA}/quotes?new=1`); await settle(p, 1200)
      await p.locator('[data-testid="create-quote"]').getByRole('button', { name: /^Blank Quote/ }).first().click()
      await p.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {}); await settle(p, 1200)
      const qid = (/\/quotes\/([0-9a-f-]{36})/.exec(p.url()) || [])[1]
      ok(!!qid && sql(`select client2_name || '|' || client2_nric from quotes where id = '${qid}'`) === 'Daniel Martinez|S1234567D', 'a new quote starts with the lead’s second client (REG-588’s)')
      /* Client access offers them for the household */
      await go(p, `/leads/${OLIVIA}`)
      await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Invite to Portal' }).click(); await settle(p, 1500)
      const co = p.locator('[data-testid="household-co-owner"]')
      ok(await co.count() === 1 && /Second client on the lead · 9111 0000/.test(await co.innerText()), 'Client access offers the second client for the household')
      await co.getByRole('button', { name: /^Add Daniel/ }).click(); await settle(p, 500)
      const hd = p.locator('[data-testid="household-dialog"]')
      ok(await hd.getByLabel('Their name').inputValue() === 'Daniel Martinez' && await hd.getByLabel('Their mobile number').inputValue() === '9111 0000' && /Co-owner/.test(await hd.getByLabel('How they’re related (optional)').inputValue()), '…the add opens with them, “Co-owner”')
      await p.keyboard.press('Escape'); await settle(p, 300); await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, `/leads/${BENJAMIN}`)
      await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Invite to Portal' }).click().catch(() => {}); await settle(p, 1500)
      ok(await p.locator('[data-testid="household-co-owner"]').count() === 0, 'a second client already on the household (Benjamin’s Mei Ling) is not offered twice')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 3 · Maison AI acts on a lead ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Maison AI adds, moves and changes a lead — through the form or the window')
      const leads0 = sql(`select count(*) from leads`)
      await go(p, '/leads')
      await fab(p)
      let a = await ask(p, 'Add a lead for Mrs Chua, 9123 4567, HDB 4-Room, budget 80k, from Instagram')
      ok(await a.locator('[data-testid="maison-row"]').filter({ hasText: 'Add Mrs Chua as a lead' }).count() === 1, 'the answer offers the lead, filled from the question')
      ok(await a.locator('[data-testid="maison-row"]').filter({ hasText: /Open .* — |This number is already a lead/ }).count() >= 1, '…and the lead that number already belongs to, first')
      await a.locator('[data-testid="maison-row"]').filter({ hasText: 'Add Mrs Chua as a lead' }).click(); await settle(p, 2200)
      const cf = dialog(p, 'Create New Lead')
      ok(await cf.isVisible() && await cf.getByLabel('Lead name').inputValue() === 'Mrs Chua' && await cf.getByLabel('Lead phone number').inputValue() === '9123 4567', 'Create New Lead opens filled — the name and the mobile')
      ok(/HDB 4-Room/.test(await cf.innerText()) && /Instagram/.test(await cf.innerText()), '…the property type and the source')
      ok(!/new=1/.test(p.url()), 'the address keeps nothing of the landing')
      await shot(p, '05-maison-add-lead-1440')
      await cf.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      ok(sql(`select count(*) from leads`) === leads0, 'nothing is made without the form')
      await fab(p)
      a = await ask(p, 'Move Jonathan Teo to Met')
      await a.locator('[data-testid="maison-row"]').filter({ hasText: 'Move Jonathan Teo to Met' }).click(); await settle(p, 2500)
      ok(p.url().includes(`/leads/${JONATHAN}`) && await dialog(p, 'Move stage').isVisible(), '“Move … to Met” opens the lead’s Move stage window')
      ok((await dialog(p, 'Move stage').locator('[role="tablist"][aria-label="Stages"] [role="tab"][aria-selected="true"]').innerText()).trim().endsWith('Met'), '…at Met')   // the rail's tab carries its icon's ligature first
      await dialog(p, 'Move stage').getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      await fab(p)
      a = await ask(p, 'Put Jonathan Teo on hold')
      await a.locator('[data-testid="maison-row"]').filter({ hasText: /Move Jonathan Teo to On Hold/ }).click(); await settle(p, 2500)
      ok(await p.locator('[role="dialog"]').filter({ hasText: /On Hold|on hold/ }).count() >= 1 && sql(`select stage from leads where id = '${JONATHAN}'`) === 'Contacted', '“Put … on hold” opens the On Hold dialog — nothing moved yet')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await fab(p)
      a = await ask(p, 'Change Olivia Martinez’s budget')
      await a.locator('[data-testid="maison-row"]').filter({ hasText: /Edit Olivia Martinez’s budget/ }).click(); await settle(p, 2500)
      const ef = dialog(p, 'Edit Lead')
      ok(await ef.isVisible() && await p.evaluate(() => document.activeElement?.closest('[data-field]')?.getAttribute('data-field')) === 'budget', '“Change …’s budget” opens Edit Lead on the budget')
      await ef.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      /* the listing's three suggestions answer from its rows */
      await go(p, '/leads')
      await fab(p)
      await sheet(p).getByRole('button', { name: 'Which leads need follow-up today?' }).click(); await settle(p, 1200)
      ok(/to follow up today|Nobody needs a follow-up today/.test(await sheet(p).innerText()), 'Which leads need follow-up today? answers from the listing')
      await shot(p, '06-maison-follow-up-today-1440')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await fab(p)
      await sheet(p).getByRole('button', { name: 'Summarise this week’s new leads' }).click(); await settle(p, 1200)
      ok(/new leads? (this week|in the last 7 days)|No new leads (this week|in the last 7 days)/.test(await sheet(p).innerText()), 'Summarise this week’s new leads answers from the listing')   // (S42 D-14, a deliberate change of this rule) the window is said as the last 7 days
      await p.keyboard.press('Escape'); await settle(p, 300)
      await fab(p)
      await sheet(p).getByRole('button', { name: /^Draft intro WhatsApp for/ }).click(); await settle(p, 1000)
      ok(/thank you for your enquiry/.test(await sheet(p).innerText()) && await sheet(p).getByRole('button', { name: 'Open WhatsApp' }).count() === 1, 'the intro WhatsApp is drafted, to open on the press')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 4 · the stage uploads keep their bytes ────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · The Quote Sent upload and the steps’ Attach rows keep the files themselves')
      await go(p, `/leads/${GERALD}?move=quote-sent`); await settle(p, 1500)
      const w = dialog(p, 'Move stage')
      await w.getByRole('tab', { name: 'Upload' }).first().click(); await settle(p, 300)
      await w.locator('input[type="file"][accept=".pdf,application/pdf"]').first().setInputFiles(txtPath); await settle(p, 2200)
      ok(/Choose a PDF — the quote is kept as one/.test(await w.innerText()), 'a file that isn’t a PDF is refused under the box, in a quote’s words')
      await w.locator('input[type="file"][accept=".pdf,application/pdf"]').first().setInputFiles(pdfPath); await settle(p, 2600)
      ok(await w.getByText('probe-s05-quote.pdf').count() === 1, 'the uploaded quote’s row shows its own name (REG-149’s mock name retired)')
      await w.getByLabel('Quote amount (S$)').fill('68000')
      await w.getByRole('button', { name: 'Attach' }).first().click(); await settle(p, 600)
      const am = dialog(p, 'Attach files')
      await am.locator('input[type="file"]').first().setInputFiles(png2Path); await settle(p, 2500)
      await am.getByRole('button', { name: /^Attach 1 File/ }).click(); await settle(p, 600)
      ok(await w.getByText('probe-s05-site.png').count() === 1, 'Attach meeting documents takes the lead’s own file (uploaded in the modal)')
      await shot(p, '07-quote-sent-upload-1440')
      await w.getByRole('button', { name: 'Save', exact: true }).click(); await settle(p, 3000)
      const pay = sql(`select payload from stage_logs where lead_id = '${GERALD}' and to_stage = 'Quote Sent' order by created_at desc limit 1`)
      ok(/"quoteUploaded":"probe-s05-quote\.pdf"/.test(pay) && !/"quoteFile"/.test(pay) && !/base64/.test(pay), 'the stage log keeps the name, never the bytes')
      ok(/"quoteMeetingFiles":\["[0-9a-f-]{36}"\]/.test(pay), '…and the meeting document by id')
      const kept = sql(`select f.name || '|' || (select name from lead_files where id = f.parent_id) || '|' || (select count(*) from lead_file_images i where i.file_id = f.id) from lead_files f where f.lead_id = '${GERALD}' and f.name = 'probe-s05-quote.pdf' and f.deleted_at is null`)
      ok(kept === 'probe-s05-quote.pdf|Quotes & BOQ|1', 'the quote itself is kept in Files › Quotes & BOQ, with its bytes')
      /* Won's signed-quote upload reads the picked PDF the same way (no save — Won makes a project) */
      await go(p, `/leads/${SERENA}?move=won`); await settle(p, 1800)
      const ww = dialog(p, 'Move stage')
      await ww.getByRole('tab', { name: 'Upload' }).first().click(); await settle(p, 300)
      await ww.locator('input[type="file"][accept=".pdf,application/pdf"]').first().setInputFiles(pdfPath); await settle(p, 2600)
      ok(await ww.getByText('probe-s05-quote.pdf').count() >= 1, 'Won’s signed quote upload shows the picked file’s own name')
      /* From System › View opens the document */
      await ww.getByRole('tab', { name: 'From System' }).first().click(); await settle(p, 400)
      const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null), ww.getByRole('button', { name: /^View .* in a new tab/ }).first().click()])
      if (tab) await tab.waitForLoadState('domcontentloaded').catch(() => {})
      ok(!!tab && new RegExp(`/quotes/${Q7}/preview`).test(tab.url()), 'From System › View opens the quote’s Preview in a new tab — the step stays open')
      if (tab) await tab.close()
      ok(await ww.isVisible(), '…the window is still there with what was picked')
      await ww.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      /* A Won lead's corrected step: its new signed-quote upload is kept with its bytes; with the studio's "Contract required" off the contract
         reads (optional). Ryan is Won with his project — the edit makes no second project. */
      sql(`insert into settings (key, value, updated_at) values ('lead_stage_rules', '{"contactNextStep":false,"wonContract":false}', unixepoch()) on conflict(key) do update set value = excluded.value`)
      const projectsBefore = sql(`select count(*) from projects where lead_id = '${RYAN}'`)
      await go(p, `/leads/${RYAN}?move=won`); await settle(p, 1800)
      const rw = dialog(p, 'Move stage')
      await rw.getByRole('button', { name: 'Edit', exact: true }).first().click(); await settle(p, 600)
      ok(await rw.getByText('Attach client signed contract (optional)', { exact: true }).count() === 1, 'with Contract required off, Won’s contract reads (optional)')
      await rw.getByRole('tab', { name: 'Upload' }).first().click(); await settle(p, 300)
      await rw.locator('input[type="file"][accept=".pdf,application/pdf"]').first().setInputFiles(pdfPath); await settle(p, 2600)
      await rw.getByLabel('Quote amount (S$)').fill('77900')
      await rw.getByRole('button', { name: 'Reset to default' }).click().catch(() => {}); await settle(p, 300)
      await rw.getByRole('button', { name: 'Save changes' }).click(); await settle(p, 3000)
      const wonPay = sql(`select payload from stage_logs where lead_id = '${RYAN}' and to_stage = 'Won' order by created_at desc limit 1`)
      ok(/"wonQuoteUploaded":"probe-s05-quote\.pdf"/.test(wonPay) && !/wonQuoteFile|base64/.test(wonPay), 'the corrected Won step keeps the signed quote’s name in its log, never its bytes')
      const wonKept = sql(`select (select count(*) from lead_file_images i where i.file_id = f.id) || '|' || f.mime from lead_files f where f.lead_id = '${RYAN}' and f.name = 'Signed quote — probe-s05-quote.pdf' and f.deleted_at is null`)
      ok(wonKept === '1|application/pdf', 'the signed quote itself is in the lead’s Files with its bytes (the card’s Won upload)')
      ok(sql(`select count(*) from projects where lead_id = '${RYAN}'`) === projectsBefore, '…and no second project')
    }

    // ── 5 · export columns ───────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Export: Quote status · Project type · Company · UEN · Second client')
      await go(p, '/leads')
      await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Export all as…' }).click(); await settle(p, 600)
      const ed = p.locator('[role="dialog"]').filter({ hasText: 'Export Leads' }).last()
      await pick(p, ed.getByLabel('Columns'), 'Everything')
      await pick(p, ed.getByLabel('Choose file format'), 'CSV')
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), ed.getByRole('button', { name: 'Export', exact: true }).click()])
      const csv = fs.readFileSync(await dl.path(), 'utf8')
      const head = csv.split(/\r?\n/)[0]
      ok(['Quote status', 'Project type', 'Company', 'UEN', 'Second client'].every((h) => head.includes(h)), 'the file carries the five new columns')
      ok(csv.split(/\r?\n/).some((l) => l.startsWith('Serena Koh') && l.includes('OM-10007 · Sent to Client')), 'a lead’s latest quote with its status')
      ok(csv.split(/\r?\n/).some((l) => l.startsWith('Ryan D’Souza') && l.includes('Whole-home renovation')), 'a Won lead’s project type')
    }

    // ── 6 · Return: Appeal, the policy, Tips › View all, evidence ─────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · A rejected return is appealed; the policy; the tips; a file comes off a return still with Qanvast')
      const rejected = sql(`select id from lead_returns where lead_id = '${ARJUN}' and status = 'rejected'`)
      await go(p, `/leads/${ARJUN}`)
      await p.locator('section[data-card="lead-returned"]').getByRole('button', { name: /Submit an appeal|may still look at an appeal/ }).click(); await settle(p, 1500)
      const aw = dialog(p, 'Appeal the return')
      ok(await aw.isVisible(), 'the card’s banner opens the appeal — the Return Lead wizard on the rejected return')
      ok(/Homeowner did not shortlist ID to proceed/.test(await aw.locator('[data-testid="appeal-reply"]').innerText()), 'Qanvast’s reply heads it')
      ok(/(Qanvast gives 7 days from its reply to appeal|Qanvast’s 7 days ran to \d{1,2} \w{3} ’\d\d — it may still look at an appeal) · it is return 2 of 2/.test(await aw.locator('[data-testid="return-window"]').innerText()), 'the rules line speaks of the appeal, not the lead’s return window')   // (S42 B-10, a deliberate change of this rule) past Qanvast’s window it says the day
      ok((await aw.getByLabel('Select a reason').innerText()).includes('Lead not contactable') && await aw.locator('[data-testid="return-attachment"]').count() >= 1, 'the return as it was sent: its reason (an older one read as Lead not contactable), its files')
      await aw.getByText('View all', { exact: true }).click(); await settle(p, 300)
      ok(await aw.locator('[data-testid="return-tips"] li').count() === 10 && /Need help\?/.test(await aw.innerText()), 'Tips › View all shows 1.0’s other conversion tips, and the help line')
      await aw.getByRole('button', { name: 'Qanvast’s return policy' }).click(); await settle(p, 600)
      const pol = p.locator('[data-testid="return-policy"]')
      ok(await pol.isVisible() && /7 days after the lead arrived, until 30 days after/.test(await pol.innerText()) && /up to 2 times/.test(await pol.innerText()), 'the info control opens Qanvast’s return policy, from the rules the wizard reads')
      await shot(p, '08-return-policy-1440')
      await p.locator('[role="dialog"]').filter({ hasText: 'Qanvast’s return policy' }).last().getByRole('button', { name: 'Done' }).click(); await settle(p, 400)
      await shot(p, '09-appeal-wizard-1440')
      await aw.getByRole('button', { name: 'Next' }).click(); await settle(p, 600)
      await aw.getByRole('button', { name: 'Send appeal' }).click(); await settle(p, 2500)
      const appeal = sql(`select status || '|' || appeal_of from lead_returns where lead_id = '${ARJUN}' and appeal_of is not null`)
      ok(appeal === `processing|${rejected}`, 'Send appeal files a return that names the rejected one')
      ok(/Appeal sent to Qanvast/.test(await snackText(p)) && sql(`select stage from leads where id = '${ARJUN}'`) === 'Lost', '…said, and the lead parked as Lost as a return parks it')
      await settle(p, 600)
      ok(/Appeal of/.test(await p.locator('section[data-card="lead-returned"]').innerText().catch(() => '')), 'the LEAD RETURNED card says it is an appeal')
      await undo(p)
      ok(sql(`select count(*) from lead_returns where lead_id = '${ARJUN}' and appeal_of is not null`) === '0' && sql(`select stage from leads where id = '${ARJUN}'`) === 'On Hold', 'Undo takes the appeal back — the lead On Hold again')
      /* Return details' "here" and the ⋮ open the same appeal */
      await go(p, `/leads/${ARJUN}`)
      await p.locator('section[data-card="lead-returned"]').getByRole('button', { name: 'View Details' }).click(); await settle(p, 800)
      await p.locator('[data-testid="return-details"]').locator('[data-testid="appeal-here"]').click(); await settle(p, 1500)
      ok(await dialog(p, 'Appeal the return').isVisible(), 'Return details’ “here” opens the appeal')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
      ok(await p.getByRole('menuitem', { name: 'Appeal the return' }).count() === 1, 'the ⋮ names it: Appeal the return')
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* a file comes off a return still with Qanvast */
      const n0 = Number(sql(`select count(*) from return_attachments a join lead_returns r on r.id = a.return_id where r.lead_id = '${MUTHU}'`))
      await go(p, `/leads/${MUTHU}`)
      await p.locator('section[data-card="lead-returned"]').getByRole('button', { name: 'View Details' }).click(); await settle(p, 800)
      const rd = p.locator('[data-testid="return-details"]')
      await rd.getByRole('button', { name: /Take .* off the return/ }).first().click(); await settle(p, 1500)
      ok(Number(sql(`select count(*) from return_attachments a join lead_returns r on r.id = a.return_id where r.lead_id = '${MUTHU}'`)) === n0 - 1 && /off the return — it stays in the lead’s Files/.test(await snackText(p)), 'a file comes off a return still with Qanvast — it stays in Files')
      await undo(p)
      ok(Number(sql(`select count(*) from return_attachments a join lead_returns r on r.id = a.return_id where r.lead_id = '${MUTHU}'`)) === n0, 'Undo puts it back on the return')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, `/leads/${ARJUN}`)
      await p.locator('section[data-card="lead-returned"]').getByRole('button', { name: 'View Details' }).click(); await settle(p, 800)
      ok(await p.locator('[data-testid="return-details"]').getByRole('button', { name: /off the return/ }).count() === 0, 'once Qanvast has answered, the files it read stay — no remove')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 7 · the dead presses whose target exists ──────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · The FILES card’s Create Folder and Upload Files; Imports; Files › New')
      await go(p, `/leads/${MARCUS}`)
      const fc = p.locator('section[data-card="files"]')
      await fc.getByRole('button', { name: 'Create Folder' }).click(); await settle(p, 500)
      const nd = p.locator('[role="dialog"]').filter({ hasText: 'Create Folder' }).last()
      await nd.getByLabel('Name').fill('Probe site photos'); await nd.getByRole('button', { name: 'Save' }).click(); await settle(p, 1500)
      ok(sql(`select count(*) from lead_files where lead_id = '${MARCUS}' and kind = 'folder' and name = 'Probe site photos' and parent_id is null`) === '1' && /Folder created/.test(await snackText(p)), 'Create Folder makes the folder at the top of Files, in place')
      await p.locator('[data-testid="overview-files-picker"]').setInputFiles(pngPath); await settle(p, 2500)
      ok(sql(`select count(*) from lead_files f join lead_file_images i on i.file_id = f.id where f.lead_id = '${MARCUS}' and f.name = 'probe-s05-chat.png'`) === '1', 'Upload Files uploads the picked file with its bytes')
      ok(/File uploaded/.test(await snackText(p)), '…said, with the way to Files')
      await settle(p, 800)
      ok(await p.locator('section[data-card="files"]').getByRole('button', { name: 'probe-s05-chat.png' }).count() === 1, 'the card shows the new file')
      await shot(p, '10-files-card-1440')
      await go(p, '/leads/imports')
      ok(await p.getByRole('button', { name: 'Filter imports' }).count() === 0, 'Imports has no Filters that answered Coming soon')
      await go(p, `/leads/${OLIVIA}/files`)
      await p.getByRole('button', { name: 'New File' }).click(); await settle(p, 300)
      ok(await p.getByRole('menuitem', { name: 'From Local Files' }).count() === 1 && await p.getByRole('menuitem', { name: 'From Company Files' }).count() === 0, 'Files › New has no From Company Files (no such library)')
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 8 · head sort ────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · Tasks and Files heads sort')
      await go(p, `/leads/${OLIVIA}/tasks`)
      const due = p.locator('[role="columnheader"][data-col="due"]')
      await due.getByRole('button').click(); await settle(p, 500)
      ok(await due.getAttribute('aria-sort') === 'ascending', 'Due date sorts soonest first')
      const order = await p.locator('[data-kb-row][data-kb-id]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-kb-id')))
      const want0 = sql(`select id from lead_tasks where lead_id = '${OLIVIA}' and done = 0 order by due_at is null, due_at`).split('\n').filter(Boolean)
      ok(want0.every((id, i) => order.indexOf(id) <= order.indexOf(want0[Math.min(i + 1, want0.length - 1)])), '…the open tasks in due order, undated last')
      await due.getByRole('button').click(); await settle(p, 300)
      ok(await due.getAttribute('aria-sort') === 'descending', 'again: latest first')
      await p.getByRole('button', { name: /^Filters/ }).first().click(); await settle(p, 500)
      ok(/Sorted by the Due date column/.test(await p.locator('[data-testid="filters-head-sort"]').innerText().catch(() => '')), 'Filters says the head holds the sort')
      await p.getByRole('radio', { name: 'Newest' }).click({ force: true }).catch(() => {}); await settle(p, 400)
      await p.getByRole('button', { name: 'Done' }).last().click().catch(() => {}); await settle(p, 400)
      ok(await due.getAttribute('aria-sort') === null, 'an order picked in Filters lets the head go — one sort')
      await go(p, `/leads/${OLIVIA}/files`)
      await p.getByRole('radio', { name: 'List view' }).first().click({ force: true }).catch(async () => { await p.getByRole('button', { name: 'List view' }).first().click() }); await settle(p, 600)
      const title = p.locator('[role="columnheader"][data-col="title"]')
      await title.getByRole('button').click(); await settle(p, 500)
      ok(await title.getAttribute('aria-sort') === 'ascending', 'Files’ Title sorts A to Z')
      const kinds = await p.locator('[role="table"][aria-label="Files"] [data-kb-row]').evaluateAll((rs) => rs.map((r) => [r.getAttribute('data-kind'), r.querySelector('[data-kb-open]')?.textContent ?? '']))
      const firstFile = kinds.findIndex((k) => k[0] === 'file')
      const names = kinds.filter((k) => k[0] === 'file').map((k) => k[1])
      ok(kinds.slice(0, firstFile).every((k) => k[0] === 'folder') && names.every((n, i) => i === 0 || names[i - 1].localeCompare(n, undefined, { numeric: true, sensitivity: 'base' }) <= 0), '…folders first, then the files by name')
      await shot(p, '11-files-sorted-1440')
    }

    // ── 9 · the Attach files dialog ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · The Attach files dialog: type, sort, list, folders')
      const bproj = sql(`select id from projects where lead_id = '${BENJAMIN}'`)   // a Won lead's Notes are its project's (REG-1360…): PDFs, pictures and folders
      await go(p, `/projects/${bproj}/notes`)
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Note' }).first().click().catch(() => {}); await settle(p, 600)
      await p.getByRole('toolbar', { name: 'Note tools' }).getByRole('button', { name: 'Attach file' }).click(); await settle(p, 800)
      const am = dialog(p, 'Attach files')
      await am.locator('[data-testid="attach-type"]').click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: 'PDF' }).click(); await settle(p, 400)
      ok(/File Type: PDF/.test(await am.locator('[data-testid="attach-type"]').innerText()), 'File Type narrows to a kind and names it')
      const shown = await am.locator('[class*="tile"] [class*="tileName"]').allInnerTexts()
      ok(shown.length > 0 && shown.every((n) => /\.pdf$/i.test(n) || !/\.(png|jpe?g)$/i.test(n)), '…only PDFs are listed')
      await am.locator('[data-testid="attach-type"]').click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: 'All types' }).click(); await settle(p, 300)
      await am.locator('[data-testid="attach-sort"]').click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: 'Name (A–Z)' }).click(); await settle(p, 300)
      ok(await am.getByText('By name', { exact: true }).count() === 1, 'Sort by name puts the files in one group, by name')
      await am.getByRole('radio', { name: 'List view' }).click({ force: true }).catch(async () => { await am.getByRole('button', { name: 'List view' }).click() }); await settle(p, 400)
      ok(await am.locator('[data-view="list"]').count() === 1, 'List view lays the files out as a list')
      await shot(p, '12-attach-list-1440')
      /* Benjamin's Quotes & BOQ keeps PDFs; his Contract & VOs is empty (the ⋮'s tick then rests and says why) */
      const full = am.locator('[data-testid="attach-folder"][aria-label="Open folder Quotes & BOQ"]')
      const empty = am.locator('[data-testid="attach-folder"][aria-label="Open folder Contract & VOs"]')
      await empty.locator('button[aria-label$="actions"]').click(); await settle(p, 300)
      ok(await p.getByRole('menuitem', { name: /^Tick its files/ }).getAttribute('aria-disabled') === 'true' && /No files in it yet/.test(await p.getByRole('menu').last().innerText()), 'an empty folder’s ⋮ has nothing to tick — and says so')
      await p.getByRole('menuitem', { name: 'Open', exact: true }).click(); await settle(p, 400)
      ok((await am.locator('[data-testid="folder-crumbs"]').innerText()).includes('Contract & VOs'), '…Open opens it — the crumb says where')
      await am.locator('[data-testid="folder-crumbs"]').getByRole('button', { name: 'Your files', exact: true }).click(); await settle(p, 400)
      ok(await am.locator('[data-testid="folder-crumbs"]').count() === 0 && await full.count() === 1, 'the crumb goes back up to Your files')
      const n = Number(sql(`select count(*) from lead_files where lead_id = '${BENJAMIN}' and deleted_at is null and kind != 'folder' and parent_id = (select id from lead_files where lead_id = '${BENJAMIN}' and kind = 'folder' and name = 'Quotes & BOQ' and deleted_at is null and parent_id is null)`))
      await full.locator('button[aria-label$="actions"]').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Tick its/ }).click(); await settle(p, 300)
      ok(n > 0 && new RegExp(`Attach ${n} File`).test(await am.innerText()), `a folder’s ⋮ ticks every file inside it (${n})`)
      await full.click(); await settle(p, 400)
      ok((await am.locator('[data-testid="folder-crumbs"]').innerText()).includes('Quotes & BOQ') && await am.locator('[data-selected]').count() >= 1, 'a folder opens on a press — its files ticked')
      await am.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 300)
    }

    // ── 10 · Notes › Refine ──────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · Notes › Refine tidies by rule')
      await go(p, `/leads/${OLIVIA}/notes`)
      await p.getByRole('button', { name: /^New/ }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Note' }).first().click().catch(() => {}); await settle(p, 600)
      await p.getByLabel('Title').fill('site visit w/ client tmr')
      await p.getByRole('textbox', { name: 'Note' }).click(); await p.keyboard.type('client wants walk in wardrobe w/ glass doors , budget abt S$1,500 for carpentry!!!'); await settle(p, 1500)
      await p.getByRole('toolbar', { name: 'Note tools' }).getByRole('button', { name: 'Maison AI' }).click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Refine' }).click(); await settle(p, 800)
      ok((await p.getByRole('textbox', { name: 'Note' }).innerText()).trim() === 'Client wants walk in wardrobe with glass doors, budget about S$1,500 for carpentry!', 'Refine spells out the shorthand, opens on a capital and tidies the spacing — the figures as typed')
      ok(await p.getByLabel('Title').inputValue() === 'Site visit with client tomorrow', '…and the title')
      ok(/Note refined/.test(await snackText(p)), 'said, with Undo')
      await shot(p, '13-notes-refine-1440')
      await undo(p)
      ok(/w\/ glass doors , budget abt/.test(await p.getByRole('textbox', { name: 'Note' }).innerText()), 'Undo puts the note back as typed')
    }

    // ── 11 · the On Hold day on its own line ─────────────────────────────────────────────────────────────────────────────────────
    if (want(11)) {
      console.log('11 · The On Hold day reads whole')
      await go(p, '/leads?scope=on-hold')
      const line = p.locator('[class*="nameCell"]').filter({ hasText: 'Mei Ling Tan' }).locator('[data-testid="hold-line"]')
      ok(await line.count() === 1 && /^On hold Till \w{3}, \d{1,2} \w{3} ’\d{2}$/.test((await line.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()) || /^Till \w{3}, \d{1,2} \w{3} ’\d{2}$/.test((await line.innerText().catch(() => '')).trim()), 'Mei Ling Tan’s row says till when, with its day')
      ok(await line.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), '…whole, never cut (REG-891’s open call)')
      ok(await p.locator('[class*="nameCell"]').filter({ hasText: 'Mei Ling Tan' }).locator('[class*="phone"]').first().evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'the phone line fits again')
      await p.locator('[class*="nameCell"]').filter({ hasText: 'Mei Ling Tan' }).first().screenshot({ path: path.join(dir, '14-hold-line-1440.png') })
    }

    // ── 12 · phones, 390 and 320 ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(12)) {
      console.log('12 · 390 and 320: no sideways scroll')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h); const m = await page(pc, `phone-${w}`)
        for (const url of ['/settings?section=leads', `/leads/${OLIVIA}`, '/leads', `/leads/${ARJUN}`]) {
          await go(m, url)
          ok(await sideways(m) <= 0, `${w}: ${url} — no sideways scroll`)
        }
        if (w === 390) {
          await go(m, '/settings?section=leads'); await m.locator('[data-testid="lead-stages"]').scrollIntoViewIfNeeded().catch(() => {}); await shot(m, '15-lead-stages-390')
          await go(m, `/leads/${ARJUN}`); await m.locator('section[data-card="lead-returned"]').getByRole('button', { name: /Submit an appeal|may still look at an appeal/ }).click().catch(() => {}); await settle(m, 1500); await shot(m, '16-appeal-390')
          ok(await sideways(m) <= 0, '390: the appeal sheet — no sideways scroll')
        }
        await pc.close()
      }
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
  } finally {
    putBack()
    await b.close()
    fs.rmSync(files, { recursive: true, force: true })
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
