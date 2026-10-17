// S42F · the leftovers found while landing S42 (s42/carried-notes.md › "Found while landing S42F" · "From S42B's outcome"; s42/calls-for-vicky.md ›
// "Settled while fixing"). Each fix asserted as the rule it builds, never another round's count:
//  1 a project needs a member — New project asks for one when the creator isn't a Designer (the field's error, the focus, nothing saved), the
//    server refuses a team that left the creator's reach (said on the field), a member picked makes it; Duplicate project of a project with
//    nobody on it puts the one who duplicates it on the copy; a stage move past New on a lead with no member is refused by the server (a stale
//    page's quick move); repair R161 gives a project with no member its maker (or the Owner when the maker can't hold it), once
//  2 a studio member's own browser never stamps "Viewed" on the PO link, the meeting link, the renders link, the 3D layout link or a Hangout's
//    own page — a client's browser does
//  3 the portal's "Sign the agreement" step and What needs you wait while the quote the agreement signs is being revised (the signing link's
//    own words), and while its link has expired; the studio's Client access panel counts neither as waiting
//  4 Fill from a document reads the picked file's own words — a PDF, a CSV — fills only the empty fields, keeps what was typed, attaches the
//    file and says what filled and what wasn't found; a file with no client details, a picture, a sheet of several leads each say so and
//    change nothing; never the old sample lead
//  + no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Every table it changes is put back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s42f.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42f')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const REPO = path.join(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sqlOn = (db, q) => execSync(`sqlite3 -cmd ".timeout 30000" "${db}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const sql = (q) => sqlOn(DB, q)
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s42f-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const FILES = fs.mkdtempSync(path.join(os.tmpdir(), 's42f-'))

/* the demo's records */
const P_MARCUS = sql(`select id from projects where number = 'P-2026-004'`)   // a direct project
const PRIYA_NAIR = 'a7fa05e9-6c32-478f-9db9-c9a3e7deb47c'                       // Contacted, Dane on it
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q_SERENA = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb', SERENA_PHONE = '98230785'   // on the portal; OM-10007 Sent to Client
const C_PROBE = 'probe-s42f-contract', SIGN_TOKEN = 'probeS42fSignToken0001'
const PO = sql(`select id || '|' || vendor_token from purchase_orders where status = 'sent' and vendor_token is not null and deleted_at is null and coalesce(external, 0) = 0 order by number limit 1`).split('|')
const MEETING = sql(`select id from meetings where status = 'planned' and deleted_at is null and starts_at > ${Date.now()} order by starts_at limit 1`)
const MEET_TOKEN = 'probe-s42f-meeting-link'
const RENDER = sql(`select token from render_share_links where revoked_at is null and expires_at > ${Math.floor(Date.now() / 1000)} order by created_at desc limit 1`)
const SPACE = sql(`select token from space_layout_shares where revoked_at is null order by shared_at desc limit 1`)
const HANG = sql(`select p.page_token || '|' || r.token from hangout_participations p join hangout_registrations r on r.event_id = p.event_id where p.status = 'confirmed' order by r.created_at limit 1`).split('|')

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
const ENQUIRY = file('enquiry-aisyah.pdf', makePdf(['Website enquiry - 12 Oct 2026', 'Name: Aisyah Rahman', 'Mobile: +65 9876 5432', 'Email: aisyah.rahman@gmail.com', 'Property type: 4-room BTO', 'Address: Blk 123 Tampines St 11 #05-123', 'Message: Full renovation before we move in.']))
const EMAIL = file('Renovation enquiry.pdf', makePdf(['From: Marcus Lee <marcus.lee@yahoo.com>', 'To: dane@demostudio.sg', 'Subject: Renovation', '', 'Hi, I just got the keys to my 3-bedroom condo at Parc Esta.', 'Please call me at 9123 4567.', '', 'Regards,', 'Marcus Lee']))
const INVOICE = file('electricity-bill.pdf', makePdf(['SP Group - Utilities bill', 'Account 8812-001', 'Total due S$ 142.60', 'Thank you for your payment']))
const CSV = file('one-lead.csv', Buffer.from('Name,Phone,Email,Property Type,Budget\nOng Bee Lian,8123 4567,bee.lian@gmail.com,Executive Condo,S$90k\n'))
const PICTURE = file('whatsapp-screenshot.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAfElEQVR4nA3JIQ5EMQhAwX/OdxIEQaEaBKKpQm2QlRxwO3a+EcYYZxaTzGGK+fFd4RrXuYub3MMt7osW2minF530oYt+UUIZ5dSikjpUUS+2sI3t7MVO9mEX+0UIYYQTi0jiEEW8cMENd3zhiR+88BcqqKGOLjTRgxb64w9oYl/BRFVSYQAAAABJRU5ErkJggg==', 'base64'))
const SHEET = path.join(REPO, 'public/uat-files/homematch-lead-sheet.pdf')

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
  const valueOf = (l) => l.evaluate((el) => (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el.value : el.textContent || '').trim())   // a select is the house combobox button: its words

  /* every table, as it was — put back whole in `finally` (a probe never leaves a row behind) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/projects', 1500); await C0.close() }   // a first page's lazy writes land first
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
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

    // ── 1 · A project needs a member ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · New project needs a member')
    {
      const D = await desk(); const d = await page(D, 'new-project')
      await go(d, '/projects')
      await d.keyboard.press('c'); await settle(d, 700)
      const dlg = d.locator('[role="dialog"][aria-label="New project"]')
      await dlg.getByLabel('Client name').fill('Probe Siew Ling')
      await dlg.getByLabel('Client’s phone number').fill('96417790')
      await dlg.getByLabel('Property type').click(); await settle(d, 300)
      await d.getByRole('option', { name: 'HDB 4-Room', exact: true }).click(); await settle(d, 200)
      await dlg.getByLabel('Agreed value (S$)').fill('45000')
      await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(d, 900)
      const field = dlg.locator('[data-field="assignees"]')
      ok(/Assign at least one member/.test(await text(field)), 'an Owner who picks nobody: the Assign member field says “Assign at least one member”')
      ok(await d.evaluate(() => !!document.activeElement?.closest('[data-field="assignees"]')), '…and takes the focus (a hidden error never reads as a dead button)')
      ok(sql(`select count(*) from leads where name = 'Probe Siew Ling'`) === '0', '…and nothing was saved')
      await shot(d, 's42f-new-project-needs-member-1440')
      /* the server's own check: the member picked here left the creator's reach before Create (deactivated meanwhile) */
      await dlg.getByLabel('Assign member').click(); await settle(d, 500)
      await d.locator('[role="option"]').filter({ hasText: 'Alex' }).first().click(); await d.keyboard.press('Escape'); await settle(d, 300)
      sql(`update members set is_active = 0 where id = 'alex'`)
      await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(d, 2200)
      ok(await dlg.isVisible() && /Assign at least one member/.test(await text(field)) && sql(`select count(*) from leads where name = 'Probe Siew Ling'`) === '0', 'the server refuses a team nobody in it may hold — said on the same field, nothing saved')
      sql(`update members set is_active = 1 where id = 'alex'`)
      await dlg.getByLabel('Assign member').click(); await settle(d, 500)
      await d.locator('[role="option"]').filter({ hasText: 'Germaine' }).first().click(); await d.keyboard.press('Escape'); await settle(d, 300)
      ok(!/Assign at least one member/.test(await text(field)), 'the error clears as a member is picked')
      await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(d, 2600)
      const lead = sql(`select id from leads where name = 'Probe Siew Ling'`)
      ok(!!lead && sql(`select group_concat(member_id) from lead_assignees where lead_id = '${lead}'`) === 'germaine' && sql(`select count(*) from projects where lead_id = '${lead}'`) === '1', 'with a member it is made — Germaine on it')

      // ── Duplicate project of a project with nobody on it (the owner's own case) ──
      console.log('1 · Duplicate project · a stage move past New')
      sql(`delete from lead_assignees where lead_id = (select lead_id from projects where id = '${P_MARCUS}')`)
      await go(d, `/projects/${P_MARCUS}`)
      await d.locator('[data-testid="project-page"] header').getByRole('button', { name: 'More options' }).click(); await settle(d, 400)
      await d.getByRole('menuitem', { name: /^Duplicate project$/ }).click(); await settle(d, 1200)
      await d.locator('[data-testid="duplicate-dialog"]').waitFor({ timeout: 8000 })
      for (const id of ['duplicate-schedule', 'duplicate-quote']) if (await d.locator(`[data-testid="${id}"]`).count()) await d.locator(`[data-testid="${id}"]`).click()
      await d.locator('[data-testid="duplicate-save"]').click()
      await d.waitForURL((u) => !String(u).includes(P_MARCUS) || /from=/.test(String(u)), { timeout: 15000 }).catch(() => {}); await settle(d, 1500)
      const copy = sql(`select id from projects where name like '%(copy%' and lead_id in (select id from leads where direct = 1) order by created_at desc limit 1`)
      ok(!!copy && sql(`select group_concat(a.member_id) from lead_assignees a join projects p on p.lead_id = a.lead_id where p.id = '${copy}'`) === 'dane', 'Duplicate of a project with nobody on it: the one who duplicates it is on the copy — never a project with nobody')

      /* a stale page's quick move: the lead lost its member after the page loaded — the server says the rule, the lead stays */
      sql(`insert or replace into settings (key, value, updated_at) values ('stage_movement', '"flexible"', ${Math.floor(Date.now() / 1000)})`)
      await go(d, `/leads/${PRIYA_NAIR}`)
      sql(`delete from lead_assignees where lead_id = '${PRIYA_NAIR}'`)
      await d.getByRole('button', { name: /^Stage: Contacted/ }).click(); await settle(d, 400)
      await d.getByRole('menuitem', { name: /^Met/ }).first().click(); await settle(d, 1500)
      ok(/assign a member first/i.test(await snackText(d)) && sql(`select stage from leads where id = '${PRIYA_NAIR}'`) === 'Contacted', `the server refuses a move past New for a lead nobody holds — “${await snackText(d)}”; the lead stays Contacted`)
      await D.close()
    }
    // 390: the error is in view under a finger
    {
      const M = await phoneCtx(); const m = await page(M, 'new-project-390')
      await go(m, '/projects?new=1', 2000)
      const dlg = m.locator('[role="dialog"][aria-label="New project"]')
      await dlg.getByLabel('Client name').fill('Probe Phone')
      await dlg.getByLabel('Client’s phone number').fill('96417791')
      await dlg.getByLabel('Property type').click(); await settle(m, 400)
      await m.getByRole('option', { name: 'HDB 4-Room', exact: true }).click(); await settle(m, 300)
      await dlg.getByLabel('Agreed value (S$)').fill('30000')
      await dlg.getByRole('button', { name: 'Create project' }).click(); await settle(m, 900)
      const box = await dlg.locator('[data-field="assignees"]').boundingBox()
      ok(!!box && box.y >= 0 && box.y + box.height <= 844 && /Assign at least one member/.test(await text(dlg.locator('[data-field="assignees"]'))), '390: the sheet brings the Assign member error into view')
      ok(await sideways(m) <= 0, '390: no sideways scroll on the New project sheet')
      await shot(m, 's42f-new-project-needs-member-390')
      await M.close()
    }

    // ── R161 on its own copy ──
    console.log('1 · repair R161')
    {
      const copy = path.join(FILES, 'r161.db')
      fs.copyFileSync(DB, copy)
      sqlOn(copy, `delete from lead_assignees where lead_id = (select lead_id from projects where number = 'P-2026-004'); update projects set created_by = 'huimin' where number = 'P-2026-004'; delete from lead_assignees where lead_id = (select lead_id from projects where number = 'P-2026-005'); update projects set created_by = 'priya' where number = 'P-2026-005'`)
      const run = () => execSync(`npm run db:repair`, { cwd: REPO, env: { ...process.env, DATABASE_URL: `file:${copy}` }, maxBuffer: 64 * 1024 * 1024 }).toString()
      const first = run()
      const mine = (n) => sqlOn(copy, `select a.member_id || '|' || coalesce(a.assigned_by, '') || '|' || (a.assigned_at = p.created_at) from lead_assignees a join projects p on p.lead_id = a.lead_id where p.number = '${n}'`)
      ok(mine('P-2026-004') === 'huimin|huimin|1', 'R161: a direct project with nobody on it gets the member who made it, assigned when it was made and by them')
      ok(mine('P-2026-005') === 'dane|dane|1', 'R161: a maker who can’t hold a project (Accounting) hands it to the Owner')
      ok(/ok\s+project whose client record has no member/.test(first) && /all checks pass/.test(first), 'R161: its check passes with R68’s, all checks pass')
      ok(/R161 a project always has a member\n\s+nothing to mend/.test(run()), 'R161: a second run has nothing to mend')
      fs.unlinkSync(copy)
    }

    // ── 2 · Viewed is the client's, never the studio's own browser ───────────────────────────────────────────────────────────────────
    console.log('2 · the studio’s own browser never stamps Viewed')
    {
      sql(`update purchase_orders set vendor_viewed_at = null where id = '${PO[0]}'`)
      sql(`update meetings set client_token = '${MEET_TOKEN}', client_token_at = ${Date.now()}, client_viewed_at = null where id = '${MEETING}'`)
      sql(`update render_share_links set view_count = 0, last_viewed_at = null where token = '${RENDER}'`)
      sql(`update space_layout_shares set view_count = 0, last_viewed_at = null, first_viewed_at = null where token = '${SPACE}'`)
      sql(`update hangout_registrations set viewed_at = null where token = '${HANG[1]}'`)
      const stamps = () => ({
        po: sql(`select quote(vendor_viewed_at) from purchase_orders where id = '${PO[0]}'`) !== 'NULL',
        meeting: sql(`select quote(client_viewed_at) from meetings where id = '${MEETING}'`) !== 'NULL',
        renders: sql(`select view_count from render_share_links where token = '${RENDER}'`) !== '0',
        space: sql(`select view_count from space_layout_shares where token = '${SPACE}'`) !== '0',
        hangout: sql(`select quote(viewed_at) from hangout_registrations where token = '${HANG[1]}'`) !== 'NULL',
      })
      const links = [['po', `/po/${PO[1]}`], ['meeting', `/meeting/${MEET_TOKEN}`], ['renders', `/renders/${RENDER}`], ['space', `/space/${SPACE}`], ['hangout', `/hangout/${HANG[0]}/${HANG[1]}`]]
      const S = await desk(); const s = await page(S, 'studio-browser')
      await go(s, '/projects')   // a studio page first: this browser is the studio's
      for (const [, url] of links) await go(s, url, 1800)
      const st = stamps()
      for (const [k] of links) ok(!st[k], `the studio opening its own ${k} link leaves it unviewed`)
      await S.close()
      const K = await desk(); const c = await page(K, 'client-browser')
      for (const [, url] of links) await go(c, url, 2200)
      const ct = stamps()
      for (const [k] of links) ok(ct[k], `…the client opening the ${k} link stamps it, as before`)
      await K.close()
    }

    // ── 3 · The portal's agreement waits while its quote is revised ─────────────────────────────────────────────────────────────────
    console.log('3 · the portal’s Sign the agreement')
    {
      const now = Math.floor(Date.now() / 1000)
      sql(`drop table if exists s42f_c; create table s42f_c as select * from contracts where status = 'Signed' limit 1; update s42f_c set id = '${C_PROBE}', lead_id = '${SERENA}', title = 'Renovation agreement (probe)', status = 'Sent to Client', from_quote_id = '${Q_SERENA}', bundle_id = null, bundle_position = null, sign_token = '${SIGN_TOKEN}', sign_expires_at = ${now + 7 * 86400}, sent_at = ${now - 3600}, signed_at = null, signed_body = null, signed_letterhead = null, signed_studio_signature = null, document_hash = null, signed_copy = null, viewed_at = null, accepted_at = null, signature_kind = null, signature_data = null, signed_by = null, signed_file_id = null, file_id = null, source = 'system', archived_at = null, deleted_at = null; insert into contracts select * from s42f_c; drop table s42f_c`)
      const C = await desk(); const c = await page(C, 'portal')
      await go(c, '/my/demo-studio/login')
      await c.locator('input[type="tel"]').fill(SERENA_PHONE)
      await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
      await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
      await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1400)
      const step = c.locator('[data-testid="portal-step"][data-step="agreement"]')
      sql(`update quotes set status = 'Confirmed' where id = '${Q_SERENA}'`)   // the quote step done, so the agreement is the step now
      await go(c, '/my/demo-studio', 1400)
      const signNeed = c.locator('[data-testid="portal-need"]').filter({ hasText: 'Sign your agreement' })
      /* Serena's questions come first in Before work starts, so the agreement's step waits behind them — its line is the ready one */
      ok(/Read it through, then sign at the end/.test(await text(step)) && await signNeed.count() === 1, 'out for signature, its quote confirmed: the step reads “Read it through, then sign”, and What needs you asks the client to sign')
      sql(`update quotes set status = 'Draft', version = 2 where id = '${Q_SERENA}'`)
      await go(c, '/my/demo-studio', 1400)
      ok(await step.getAttribute('data-state') === 'later' && /Not ready yet — your designer is updating the quote this agreement signs/.test(await text(step)) && !(await step.locator('a[href*="/sign/"]').count()), 'its quote being revised: the step waits, in the signing link’s words, with no link')
      ok(await signNeed.count() === 0, '…and What needs you no longer asks the client to sign')
      await shot(c, 's42f-portal-agreement-waits-1440', true)
      sql(`update quotes set status = 'Confirmed', version = 1 where id = '${Q_SERENA}'; update contracts set sign_expires_at = ${now - 60} where id = '${C_PROBE}'`)
      await go(c, '/my/demo-studio', 1400)
      ok(await step.getAttribute('data-state') === 'later' && /The signing link has expired/.test(await text(step)) && await signNeed.count() === 0, 'its link expired: the step says so and asks for a new one, never a dead link')
      await C.close()
      /* the studio's Client access panel reads the same facts: an agreement waiting on the studio is not "waiting" on the client */
      const probe = path.join(FILES, 'access.mts')
      fs.writeFileSync(probe, `import { accessSectionsOf } from ${JSON.stringify(path.join(REPO, 'lib/portal/needs.ts'))}
const base = { homeId: 'h', slug: 's', quotes: [], questions: { asked: 0, open: 0, askedAt: null }, designs: [], files: [], lastOpenedAt: null, now: Date.now(), filesTotal: 0, leadId: 'l', base: '/leads/l' }
const c = (o) => ({ id: 'c', title: 'Agreement', status: 'Sent to Client', bundleId: null, fromQuoteId: 'q', sentAt: 1, signedAt: null, signToken: 't', expiresAt: null, ...o })
const doc = (cs) => accessSectionsOf({ ...base, contracts: cs }).find((s) => s.key === 'documents')?.state
console.log(JSON.stringify([doc([c({})]), doc([c({ held: true })]), doc([c({ expiresAt: 5 })])]))`)
      const [open, held, expired] = JSON.parse(execSync(`npx tsx ${JSON.stringify(probe)}`, { cwd: REPO }).toString().trim().split('\n').pop())
      ok(/1 waiting/.test(open) && !/waiting/.test(held) && !/waiting/.test(expired), `the Client access panel counts an agreement as waiting only while its link signs — “${open}” · “${held}” · “${expired}”`)
      const M = await phoneCtx(); const m = await page(M, 'portal-390')
      sql(`update quotes set status = 'Draft', version = 2 where id = '${Q_SERENA}'; update contracts set sign_expires_at = ${now + 7 * 86400} where id = '${C_PROBE}'`)
      await go(m, '/my/demo-studio/login')
      await m.locator('input[type="tel"]').fill(SERENA_PHONE)
      await m.getByRole('button', { name: 'Send me a code' }).click(); await settle(m, 1000)
      await m.locator('[data-testid="portal-digit"]').first().fill('482913'); await m.getByRole('button', { name: 'Open my project' }).click()
      await m.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(m, 1400)
      ok(/Not ready yet/.test(await text(m.locator('[data-testid="portal-step"][data-step="agreement"]'))) && await sideways(m) <= 0, '390: the waiting step reads whole, no sideways scroll')
      await m.locator('[data-testid="portal-step"][data-step="agreement"]').scrollIntoViewIfNeeded().catch(() => {})
      await shot(m, 's42f-portal-agreement-waits-390')
      await M.close()
    }

    // ── 4 · Fill from a document reads the file ─────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Fill from a document')
    {
      const leads0 = sql(`select count(*) from leads`)
      const D = await desk(); const d = await page(D, 'lead-form')
      const openForm = async () => {
        await go(d, '/leads'); await d.keyboard.press('c'); await settle(d, 800)
        return d.locator('[role="dialog"][aria-label="Create New Lead"]')
      }
      const fillDlg = d.locator('[role="dialog"][aria-label="Fill from a document"]')
      const pick = async (form, f) => {
        await form.getByRole('button', { name: 'Fill from a document' }).click(); await settle(d, 500)
        await d.locator('[data-testid="fill-document-input"]').setInputFiles(f); await settle(d, 2200)
      }
      let form = await openForm()
      await pick(form, ENQUIRY)
      ok(!(await fillDlg.isVisible()), 'a PDF with the client’s details: read, and the dialog closes')
      ok(await valueOf(form.getByLabel('Lead name')) === 'Aisyah Rahman' && (await valueOf(form.getByLabel('Lead phone number'))).replace(/\s/g, '') === '98765432', 'its name and mobile fill — the file’s own words')
      ok(await valueOf(form.getByLabel('Lead email')) === 'aisyah.rahman@gmail.com' && /BTO 4-Room/.test(await valueOf(form.getByLabel('Property type'))) && await valueOf(form.getByLabel('Property address')) === 'Blk 123 Tampines St 11 #05-123', '…its email (Additional info opens), property type (“4-room BTO” → BTO 4-Room) and address')
      ok(/Full renovation before we move in/.test(await valueOf(form.getByLabel('Remarks'))), '…its message lands in Remarks')
      const note = form.locator('[data-testid="fill-document-note"]')
      ok(/^Filled from enquiry-aisyah\.pdf: name, phone number, email, property type, property address and remarks\.$/.test(await text(note)), `one line says what filled — “${await text(note)}”`)
      ok(await form.getByText('enquiry-aisyah.pdf', { exact: true }).count() >= 1, 'the file is attached to the lead')
      ok(!/Nurul Hassan/.test(await form.innerText()), 'never the old sample lead')
      await shot(d, 's42f-fill-from-document-1440')
      await form.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 600)

      form = await openForm()
      await form.getByLabel('Lead name').fill('Typed By Hand')
      await pick(form, EMAIL)
      ok(await valueOf(form.getByLabel('Lead name')) === 'Typed By Hand' && (await valueOf(form.getByLabel('Lead phone number'))).replace(/\s/g, '') === '91234567' && /Condo 3-bedder/.test(await valueOf(form.getByLabel('Property type'))), 'an email saved as a PDF: its number and home fill; the name typed is kept')
      ok(/Kept what you typed for name\./.test(await text(note)) && /Not found: property address\./.test(await text(note)), `…the line says what it kept and what it didn’t find — “${await text(note)}”`)
      await form.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 600)

      form = await openForm()
      for (const [f, re, what] of [[INVOICE, /Nothing in electricity-bill\.pdf looks like a client’s details/, 'a PDF with no client details'], [PICTURE, /has no words to read — a photo or a scanned page/, 'a picture'], [SHEET, /holds \d+ leads — bring them in with Import leads/, 'a sheet of several leads']]) {
        await pick(form, f)
        const err = fillDlg.locator('[data-testid="fill-document-error"]')
        ok(await fillDlg.isVisible() && re.test(await text(err)), `${what}: the dialog stays open and says so — “${await text(err)}”`)
        if (what === 'a PDF with no client details') await shot(d, 's42f-fill-nothing-1440')
        await fillDlg.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 400)
      }
      ok(await valueOf(form.getByLabel('Lead name')) === '' && await form.locator('[data-testid="fill-document-note"]').count() === 0, '…and nothing changed in the form, nothing attached')
      await pick(form, CSV)
      ok(await valueOf(form.getByLabel('Lead name')) === 'Ong Bee Lian' && /Executive Condo/.test(await valueOf(form.getByLabel('Property type'))) && await valueOf(form.getByLabel('Estimated budget (S$)')) === '90,000', 'a one-lead CSV: its cells fill (the budget “S$90k” read as 90,000)')
      await form.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 600)
      ok(sql(`select count(*) from leads`) === leads0, 'nothing was saved — the form was only filled')
      await D.close()

      const M = await phoneCtx(); const m = await page(M, 'lead-form-390')
      await go(m, '/leads', 1200); await m.keyboard.press('c'); await settle(m, 900)
      const f390 = m.locator('[role="dialog"][aria-label="Create New Lead"]')
      await f390.getByRole('button', { name: 'Fill from a document' }).click(); await settle(m, 500)
      await m.locator('[data-testid="fill-document-input"]').setInputFiles(ENQUIRY); await settle(m, 2200)
      ok(/Filled from enquiry-aisyah\.pdf/.test(await text(f390.locator('[data-testid="fill-document-note"]'))) && await sideways(m) <= 0, '390: the line under Fill from a document reads whole, no sideways scroll')
      await shot(m, 's42f-fill-from-document-390')
      await M.close()
    }

    // ── 320 ──
    {
      const N = await phoneCtx(320, 640); const n = await page(N, 'w320')
      await go(n, '/projects?new=1', 1800)
      ok(await sideways(n) <= 0, '320: no sideways scroll on New project')
      await N.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).split('\n')[0])
  } finally {
    const changed = putBack()
    const left = TABLES.filter((t) => hashOf(t) !== before.get(t))
    ok(left.length === 0, `every table is as it was (${changed.length} put back${left.length ? `; still changed: ${left.join(', ')}` : ''})`)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await b.close()
    fs.rmSync(FILES, { recursive: true, force: true })
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
