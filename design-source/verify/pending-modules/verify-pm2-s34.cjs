// Pending modules, step S34 · Real services behind the stand-ins (the owner's "build all of them but one after the other", 2026-10-11; survey key
// api:message-delivery-providers — the adapters' seams and their admin, for the developers). Each item asserted as the rule it builds:
//  - the seams, in one Node process (pm2-s34-seams.mts on a copy of this DB): every slot swapped for a test adapter exactly as
//    lib/services/install.ts would — delivery (provider id, html(), receipts, retries, the final failure → the runners' / the inviter's bell,
//    NOTIFY_ALLOWLIST, WhatsApp's not_in_plan never handed over), the WhatsApp webhook's reader and the replies filed in Messages, sign-in,
//    the tenancy, payments (a paid checkout lands once, the browser can't complete one, the provider's billing page), file storage, PDF files,
//    the studio's calendar, transcription, the feeds (an empty answer never empties the copy), Xero, the sweep (every job, idempotent), the
//    cron guard, the lead webhook's reader; the registry names only seams that exist and the developers' document names every one
//  - over HTTP on the production build: the scheduler's door (401 without its secret — fails closed — every job once, a second run sends
//    nothing new), the ops report, the WhatsApp webhook (off without its secret; with it Delivered · Read on Sent messages and a client's reply
//    in their project's Messages), the payments webhook (404 on the demo checkout), the real lead webhook (a lead made, a known number waiting
//    in Review, the endpoint's counters and log, 404 · 401 · 400 · 413 · 429), /papers/pdf (501 on the stand-in, 400 for anything not a
//    paper), the developers' email preview (off in production)
//  - said plainly where a studio meets a stand-in: Sent messages' "Simulated on this prototype", Company › Integrations' five simulated lines
//    and Calendar invites' line (and their ghost), the client portal's code step ("Demo only — no text is sent…"), a paper's Download PDF
//    still the browser's print
//  - 1440 · 390 touch shots; no sideways scroll at 390 / 320 against screen.width; the ghost lands where the page does; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Start the server with the secrets to prove their open side too (else the probe proves the off side):
//   DATABASE_URL=file:<db> CRON_SECRET=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa npx next start -p 3170
//   S34_CRON=probe-cron S34_WA=probe-wa BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s34.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s34')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const REPO = path.resolve(__dirname, '../../..')
const CRON = process.env.S34_CRON || ''
const WA = process.env.S34_WA || ''
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s34-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : `— ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 400)}`) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = 'pm2s34'

/* The ghost-vs-page measure (the S17 · S23 … S26 probes'): in the held reveal, every element carrying a page module's class in both, index by
   index after aligning the lists — the first screen only. */
async function measure(b, opts, url, blocks, max = 30) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks, max }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal|tab-ghosts)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (blocks && !blocks.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x))) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) {
      const ps = q.get(k); if (!ps) continue
      let best = 0, bestCost = Infinity
      for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
    }
    return { rows }
  }, { blocks, max })
  await c.close()
  return out
}

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
  const stagesBefore = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logsBefore = sql(`select count(*) from stage_logs`)
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
  const go = async (p, url, ms = 900) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const http = async (method, url, o = {}) => {
    const r = await fetch(BASE + url, { method, headers: o.headers, body: o.body, redirect: 'manual' })
    const t = await r.text()
    let j = null; try { j = JSON.parse(t) } catch { /* not JSON */ }
    return { status: r.status, text: t, json: j, headers: r.headers }
  }
  const bearer = (s) => ({ authorization: `Bearer ${s}` })

  try {
    // ── 1 · The seams, in one process ───────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · The seams, swapped in one process (pm2-s34-seams.mts on a copy of this DB)')
      const copy = path.join(os.tmpdir(), `pm2-s34-seams-${process.pid}.db`)
      try { fs.unlinkSync(copy) } catch { /* none */ }
      execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" ".backup '${copy}'"`)
      let out = ''
      try { out = execSync('npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s34-seams.mts', { cwd: REPO, env: { ...process.env, DATABASE_URL: `file:${copy}`, NODE_ENV: 'test' }, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString() }
      catch (e) { out = String(e.stdout ?? '') ; if (!out) ok(false, 'the seam script ran', String(e.stderr ?? e).slice(0, 600)) }
      for (const line of out.split('\n')) {
        let d; try { d = JSON.parse(line) } catch { continue }
        if (d.done) { ok(d.fail === 0 && d.pass > 90, `the seam script: ${d.pass} passed · ${d.fail} failed`); continue }
        ok(d.ok, `seam · ${d.label}`, d.extra)
      }
      for (const f of [copy, `${copy}-wal`, `${copy}-shm`]) { try { fs.unlinkSync(f) } catch { /* gone */ } }
    }

    // ── 2 · The scheduler's door and the ops report ─────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · The scheduler and the ops report')
      const none = await http('GET', '/api/cron/run')
      ok(none.status === 401, 'GET /api/cron/run without the secret is refused (production fails closed)', none.status)
      ok((await http('GET', '/api/cron/run', { headers: bearer('wrong') })).status === 401, '…and with a wrong one')
      ok((await http('GET', '/api/services')).status === 401, 'GET /api/services asks the same secret')
      if (CRON) {
        const dRows = () => Number(sql(`select count(*) from notification_outbox where key like 'd:%'`))
        const r1 = await http('GET', '/api/cron/run', { headers: bearer(CRON) })
        ok(r1.status === 200 && r1.json?.ok && ['messages', 'summaries', 'repeats', 'credits', 'feeds', 'accounting'].every((k) => k in (r1.json.jobs ?? {})), 'with the secret, every timed job runs once and says what it did', r1.json)
        ok(/simulated/i.test(r1.json?.jobs?.accounting?.skipped ?? '') && /no feed source/i.test(r1.json?.jobs?.feeds?.skipped ?? ''), 'Xero and the feeds are skipped while they are stand-ins — said so', r1.json?.jobs)
        const d1 = dRows()
        const r2 = await http('POST', '/api/cron/notification-scheduled', { headers: bearer(CRON) })
        ok(r2.status === 200 && r2.json?.jobs?.messages?.ran === 0 && dRows() === d1, '1.0’s five-minute address runs the messages again and sends nothing new (idempotent)', { r2: r2.json, d1, d2: dRows() })
        ok((await http('GET', '/api/cron/notification-digest', { headers: bearer(CRON) })).json?.jobs?.summaries !== undefined, '1.0’s hourly digest address runs the daily summaries')
        const nope = await http('GET', '/api/cron/nope', { headers: bearer(CRON) })
        ok(nope.status === 404 && Array.isArray(nope.json?.jobs), 'an unknown job answers 404 with the jobs there are')
        const s = await http('GET', '/api/services', { headers: bearer(CRON) })
        /* (pending modules, a deliberate change of this rule) S37 added the `qanvast` slot and S36 the AI Visualizer trial's two (bot-check ·
           limit-store): ten became thirteen — joined at the lanes' merge; S41b-3 the no-account tools' workspace store (`trial`): fourteen;
           (pending modules, a deliberate change of this rule) S41b-5 Qanvast's account API (`qanvast-account` — Lead credits · Reviews): fifteen */
        ok(s.status === 200 && s.json.slots.length === 15 && s.json.slots.every((x) => !x.plugged && x.adapter === 'stand-in'), 'the ops report: every slot is the prototype’s stand-in', s.json?.slots)
        ok(s.json.seams.length >= 30 && s.json.seams.every((x) => x.swap && x.file) && !/probe-cron/.test(s.text), '…every seam with its one call and its file, and never a secret’s value')
        ok(Array.isArray(s.json.warnings) && s.json.warnings.length === 0, '…and no warning (no real key is set on this server)')
      } else console.log('  · (no S34_CRON — the open side of the scheduler is proved in the seam script)')
    }

    // ── 3 · The WhatsApp webhook: receipts and replies ──────────────────────────────────────────────────────────────────────────
    const ben = sql(`select id from projects where number = 'P-2026-002'`)
    const benLead = sql(`select lead_id from projects where id = '${ben}'`)
    const benPhone = sql(`select phone from leads where id = '${benLead}'`)
    if (want(3)) {
      console.log('3 · The WhatsApp webhook')
      const env = (statuses, messages) => JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'x', changes: [{ field: 'messages', value: { statuses, messages } }] }] })
      if (!WA) {
        const r = await http('POST', '/api/webhooks/whatsapp?token=x', { body: env([], []), headers: { 'content-type': 'application/json' } })
        ok(r.status === 503, 'without WHATSAPP_WEBHOOK_SECRET the webhook is off (503)', r.status)
      } else {
        ok((await http('POST', '/api/webhooks/whatsapp?token=wrong', { body: env([], []) })).status === 401, 'a wrong token is refused (401)')
        const v = await http('GET', `/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${WA}&hub.challenge=4242`)
        ok(v.status === 200 && v.text === '4242', 'Meta’s subscription check echoes its challenge')
        /* one of the studio's WhatsApp messages to Benjamin, as a real provider would have kept it (its wamid) */
        const now = Math.floor(Date.now() / 1000)
        sql(`insert into notification_outbox (id, key, event, channel, member_id, to_name, to_address, subject, body, href, lead_id, status, provider, created_at, attempts, provider_ref) values ('${P}-wa', '${P}:wa', 'client_message', 'whatsapp', null, 'Benjamin Han', '+65${benPhone}', null, 'Probe: your site update is ready', null, '${benLead}', 'sent', 'probe-provider', ${now}, 0, 'wamid.${P}')`)
        const r1 = await http('POST', `/api/webhooks/whatsapp?token=${WA}`, { body: env([{ id: `wamid.${P}`, status: 'delivered', timestamp: String(now + 2) }], []), headers: { 'content-type': 'application/json' } })
        ok(r1.status === 200 && r1.json?.receipts === 1 && Number(sql(`select delivered_at from notification_outbox where id = '${P}-wa'`)) >= now, 'a Delivered receipt marks the message by its wamid', r1.json)
        const r2 = await http('POST', `/api/webhooks/whatsapp?token=${WA}`, { body: env([{ id: `wamid.${P}`, status: 'read', timestamp: String(now + 9) }], [{ id: `wamid.${P}-in`, from: `65${benPhone}`, timestamp: String(now + 10), type: 'text', text: { body: 'Probe WhatsApp reply — Saturday works' }, context: { id: `wamid.${P}` } }, { id: `wamid.${P}-who`, from: '6580001234', timestamp: String(now + 11), type: 'text', text: { body: 'Probe unknown sender' } }]), headers: { 'content-type': 'application/json' } })
        ok(r2.status === 200 && r2.json?.receipts === 1 && r2.json?.filed === 1 && r2.json?.kept === 2, 'Read, and two replies kept — one filed', r2.json)
        ok(sql(`select status || ':' || coalesce(lead_id, '') from inbound_messages where provider_ref = 'wamid.${P}-in'`) === `filed:${benLead}` && sql(`select status from inbound_messages where provider_ref = 'wamid.${P}-who'`) === 'unmatched', 'the client’s reply is filed on their lead; a stranger’s is kept, filed nowhere')
        const line = json(`select channel, author_kind, author_name, body from project_messages where project_id = '${ben}' and body like 'Probe WhatsApp reply%'`)
        ok(line.length === 1 && line[0].channel === 'client' && line[0].author_kind === 'client', 'it is a line in the project’s Client conversation, as the client', line)
        const r3 = await http('POST', `/api/webhooks/whatsapp?token=${WA}`, { body: env([{ id: `wamid.${P}`, status: 'read', timestamp: String(now + 12) }], [{ id: `wamid.${P}-in`, from: `65${benPhone}`, type: 'text', text: { body: 'Probe WhatsApp reply — Saturday works' } }]), headers: { 'content-type': 'application/json' } })
        ok(r3.status === 200 && r3.json?.receipts === 0 && r3.json?.kept === 0 && sql(`select count(*) from project_messages where body like 'Probe WhatsApp reply%'`) === '1', 'a callback told twice changes nothing and files nothing twice', r3.json)
        ok(Number(sql(`select count(*) from notifications where kind = 'chat_message' and href like '/projects/${ben}/messages%' and body like 'Probe WhatsApp reply%'`)) >= 1, 'the team hears it on the bell, as a message from the portal')
        ok((await http('POST', `/api/webhooks/whatsapp?token=${WA}`, { body: 'not json' })).status === 200, 'a body that isn’t JSON answers 200 (the provider won’t retry it for a day)')
        /* the screens: Sent messages reads Read; the reply is in the project's Messages */
        const c = await desk(); const p = await page(c, 'sent')
        as('dane')
        await go(p, '/settings?section=notifications', 1500)
        await p.locator('[data-testid="notification-sent"]').scrollIntoViewIfNeeded().catch(() => {})
        await settle(p, 900)
        const row = p.locator('[data-testid="sent-row"]', { hasText: 'Probe: your site update is ready' })
        ok((await row.count()) === 1 && /\bRead\b/.test(await text(row.locator('[data-status]'))), 'Sent messages reads the message Read once WhatsApp says so', await text(row))
        await row.scrollIntoViewIfNeeded().catch(() => {})
        await shot(p, 's34-sent-read-1440')
        await go(p, `/projects/${ben}/messages`, 1800)
        const said = p.getByText('Probe WhatsApp reply — Saturday works')
        ok((await said.count()) >= 1, 'the reply is in Benjamin’s project Messages, where the studio answers it')
        if (await said.count()) { await said.first().scrollIntoViewIfNeeded(); await shot(p, 's34-reply-in-messages-1440') }
        await c.close()
      }
    }

    // ── 4 · The lead webhook, real ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · The lead webhook (POST /api/webhooks/leads/<token>)')
      /* the endpoint made as a studio makes one: Generate webhook URL on Company › Integrations (its label becomes one of the studio's sources) */
      as('dane')
      const label = 'Probe hooks'
      {
        const c = await desk(); const p = await page(c, 'integrations-generate')
        await go(p, '/company/integrations#webhooks', 1500)
        const form = p.locator('[data-testid="new-webhook"]')
        await form.getByLabel('Source label (optional)').fill(label)
        await form.getByLabel('Notes (optional)').fill('Probe endpoint')
        await form.getByRole('button', { name: 'Generate webhook URL' }).click()
        await p.locator('[data-testid="webhook-created"]').waitFor({ timeout: 8000 }).catch(() => {})
        ok(/\/api\/webhooks\/leads\/[0-9a-f]{48}$/.test(await text(p.locator('[data-testid="webhook-url"]'))), 'Generate webhook URL shows the endpoint’s address (the real route’s)')
        await c.close()
      }
      const cap = JSON.parse(sql(`select value from settings where key = 'lead_capture'`))
      const made = cap.webhooks.find((w) => w.notes === 'Probe endpoint' && w.active)
      const token = made?.token ?? `${P}${'0'.repeat(40)}`
      ok(!!made, 'the endpoint is on the studio’s record')
      const phone = '93339' + String(100 + Math.floor(Math.random() * 800))
      const post = (body, headers = { 'content-type': 'application/json' }) => http('POST', `/api/webhooks/leads/${token}`, { body, headers })
      const r1 = await post(JSON.stringify({ full_name: 'probe hook lead', mobile: `+65 ${phone.slice(0, 4)} ${phone.slice(4)}`, email: 'probe.hook@example.com', budget: '60000', property_type: 'HDB 4-Room', message: 'Kitchen and both bathrooms' }))
      const lead = json(`select id, name, phone, email, source, stage, seen_at from leads where phone = '${phone}' and deleted_at is null`)
      ok(r1.status === 200 && r1.json?.status === 'created' && lead.length === 1 && lead[0].stage === 'New' && lead[0].seen_at === null && lead[0].source === label, 'a POSTed lead lands New and unread, its source the endpoint’s label', { r1: r1.json, lead })
      const r2 = await post(JSON.stringify({ name: 'Probe Hook Lead', phone }))
      ok(r2.status === 200 && r2.json?.status === 'duplicate' && json(`select id from leads where phone = '${phone}' and deleted_at is null`).length === 1, 'the same number again waits in Review imported leads — never a second lead', r2.json)
      const hook = JSON.parse(sql(`select value from settings where key = 'lead_capture'`)).webhooks.find((w) => w.id === made?.id)
      ok(hook?.received === 2 && hook.created === 1 && hook.duplicates === 1 && hook.lastAt > 0, 'the endpoint’s counters move as the page shows them', hook)
      ok((await http('POST', `/api/webhooks/leads/${P}nope`, { body: '{}' })).status === 404, 'an unknown or revoked token answers 404')
      const google = cap.webhooks.find((w) => w.platform === 'google_ads' && w.active)
      if (google) ok((await http('POST', `/api/webhooks/leads/${google.token}`, { body: JSON.stringify({ google_key: 'wrong', is_test: true }), headers: { 'content-type': 'application/json' } })).status === 401, 'Google’s Lead Form must bring its endpoint’s key (401)')
      /* a ported 1.0 endpoint that kept its signing secret: X-Signature = hex HMAC-SHA256 of the raw body (1.0's verifyWebhookSignature) */
      {
        const cap2 = JSON.parse(sql(`select value from settings where key = 'lead_capture'`))
        const signed = `${P}${'5'.repeat(42)}`, key = 'probe-signing-secret'
        cap2.webhooks.push({ id: `${P}-signed`, platform: 'generic', label, notes: 'Probe signed', token: signed, key, received: 0, created: 0, duplicates: 0, lastAt: null, active: true, createdAt: Date.now() })
        sql(`update settings set value = ${lit(JSON.stringify(cap2))} where key = 'lead_capture'`)
        const body = JSON.stringify({ name: 'Probe Signed Lead', phone: '9' + String(3330000 + Math.floor(Math.random() * 9999)).padStart(7, '0') })
        const sig = require('crypto').createHmac('sha256', key).update(body, 'utf8').digest('hex')
        ok((await http('POST', `/api/webhooks/leads/${signed}`, { body, headers: { 'content-type': 'application/json' } })).status === 401, 'an endpoint with a signing key refuses a body without its X-Signature (1.0’s HMAC)')
        ok((await http('POST', `/api/webhooks/leads/${signed}`, { body, headers: { 'content-type': 'application/json', 'x-signature': '00'.repeat(32) } })).status === 401, '…or with a wrong one')
        const okSigned = await http('POST', `/api/webhooks/leads/${signed}`, { body, headers: { 'content-type': 'application/json', 'x-signature': sig } })
        ok(okSigned.status === 200 && okSigned.json?.status === 'created', '…and takes the body it signed', okSigned.json)
      }
      ok((await post(JSON.stringify({ phone: '91110000' }))).status === 400, 'no name answers 400')
      ok((await post(JSON.stringify({ name: 'Probe' }))).status === 400, 'no phone and no email answers 400')
      ok((await post('x'.repeat(70 * 1024))).status === 413, 'a body over 64 KB answers 413')
      let last = 0
      for (let i = 0; i < 7; i++) last = (await post('{"name":""}')).status
      ok(last === 429, 'past ten a minute an endpoint answers 429 (1.0’s limit)', last)
      /* the screen: the endpoint and its log on Company › Integrations */
      const c = await desk(); const p = await page(c, 'integrations-hook')
      as('dane')
      await go(p, '/company/integrations#webhooks', 1500)
      const row = p.locator('[data-testid="webhook-row"]', { hasText: 'Probe endpoint' })
      ok(/2 received/.test(await text(row)) && /1 created/.test(await text(row)) && /1 duplicate\b/.test(await text(row)), 'Integrations shows the endpoint’s two arrivals — one created, one duplicate', await text(row))
      await c.close()
    }

    // ── 5 · PDF files, payments, the developers' preview ────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · /papers/pdf, the payments webhook, the email preview')
      const inv = sql(`select project_id || '/invoices/' || id from project_invoices where status <> 'draft' limit 1`)
      const r = await http('GET', `/papers/pdf?path=${encodeURIComponent(`/projects/${inv}?print=1`)}`)
      ok(r.status === 501 && /Print/.test(r.json?.error ?? '') && r.json?.page === `/projects/${inv}`, 'a paper as a PDF: 501 on the stand-in — the browser prints it', r.json)
      ok((await http('GET', `/papers/pdf?path=${encodeURIComponent('/files/raw/x')}`)).status === 400 && (await http('GET', `/papers/pdf?path=${encodeURIComponent('//evil.example/x')}`)).status === 400, 'anything that isn’t a paper page answers 400')
      const pay = await http('POST', '/api/webhooks/payments', { body: '{}' })
      ok(pay.status === 404 && /demo checkout/.test(pay.json?.error ?? ''), 'the payments webhook: 404 while the demo checkout answers', pay.json)
      const id = sql(`select id from notification_outbox where channel = 'email' limit 1`)
      ok((await http('GET', `/api/dev/email-preview?id=${id}`)).status === 404, 'the developers’ email preview is off in a production build')
    }

    // ── 6 · Said plainly where a studio meets a stand-in ────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Said plainly')
      as('dane')
      for (const [tag, mk] of [['1440', () => desk()], ['390', () => phoneCtx(390, 844)], ['320', () => phoneCtx(320, 700)]]) {
        const c = await mk(); const p = await page(c, `integrations-${tag}`)
        await go(p, '/company/integrations', 1500)
        const lines = {}
        for (const k of ['qanvast', 'email', 'meta', 'gmail', 'xero']) lines[k] = await text(p.locator(`[data-testid="int-simulated-${k}"]`))
        if (tag === '1440') {
          ok(Object.values(lines).every((t) => t.startsWith('Simulated on this prototype')), 'Integrations: Qanvast, the email intake, Meta, Email lead sources and Xero each say “Simulated on this prototype”', lines)
          ok(/Xero/.test(lines.xero) && /Simulate an enquiry/.test(lines.email) && /Sync now/.test(lines.gmail) && /returned lead/.test(lines.qanvast), '…each in its own words', lines)
          ok(/comes later/.test(await text(p.locator('[data-testid="int-calendar-line"]'))), 'Calendar invites: the studio’s own calendar comes later (its slot is empty)')
          ok((await p.locator('[data-testid="webhook-row"]').count()) >= 1 && !(await p.locator('[data-testid="int-webhooks"] [data-testid^="int-simulated"]').count()), 'Webhooks carry no simulated line — their URLs are real')
          await shot(p, 's34-integrations-1440')
          await p.locator('[data-testid="int-xero"]').scrollIntoViewIfNeeded(); await shot(p, 's34-integrations-xero-1440')
        } else {
          ok(Object.values(lines).every((t) => t.startsWith('Simulated on this prototype')), `Integrations at ${tag}: every simulated line shows`)
          if (tag === '390') await shot(p, 's34-integrations-390')
        }
        const over = await sideways(p)
        ok(over <= 0, `Integrations at ${tag}: no sideways scroll`, over)
        await c.close()
      }
      as('huimin')
      { const c = await desk(); const p = await page(c, 'integrations-admin'); await go(p, '/company/integrations', 1500); ok((await p.locator('[data-testid^="int-simulated-"]').count()) === 5, 'an Admin reads the same five lines'); await c.close() }
      as('germaine')
      { const c = await desk(); const p = await page(c, 'integrations-designer'); await go(p, '/company/integrations', 1500); ok((await p.locator('[data-testid^="int-simulated-"]').count()) === 5, 'so does a Designer (read-only)'); await c.close() }
      as('dane')
      for (const [o, tag] of [[{ viewport: { width: 1440, height: 1024 } }, '1440'], [{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '390']]) {
        const r = await measure(b, o, '/company/integrations', ['integrations-view.'], 14)
        if (r.none) { ok(false, `the ghost of Integrations at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 6, `the ghost of Integrations at ${tag} lands where the page does (the simulated lines too)`, off.slice(0, 6).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
      }

      /* Sent messages */
      for (const [tag, mk] of [['1440', () => desk()], ['390', () => phoneCtx(390, 844)]]) {
        const c = await mk(); const p = await page(c, `sent-${tag}`)
        await go(p, '/settings?section=notifications', 1500)
        const s = p.locator('[data-testid="sent-simulated"]')
        await s.scrollIntoViewIfNeeded().catch(() => {})
        await settle(p, 600)
        ok(/^Simulated on this prototype — each message is recorded here, and none is really sent\.$/.test(await text(s)), `Sent messages at ${tag} says it is simulated`, await text(s))
        await shot(p, `s34-sent-simulated-${tag}`)
        ok((await sideways(p)) <= 0, `Sent messages at ${tag}: no sideways scroll`)
        await c.close()
      }
      as('germaine')
      { const c = await desk(); const p = await page(c, 'sent-designer'); await go(p, '/settings?section=notifications', 1500); const s = p.locator('[data-testid="sent-simulated"]'); ok((await s.count()) === 0 || /^Simulated/.test(await text(s)), 'a member who reads only their own messages is told the same when they see the log'); await c.close() }
      as('dane')

      /* the client portal's code step */
      const slug = sql(`select slug from portal_addresses limit 1`) || 'demo-studio'
      for (const [tag, mk] of [['1440', () => desk()], ['390', () => phoneCtx(390, 844)], ['320', () => phoneCtx(320, 700)]]) {
        const c = await mk(); const p = await page(c, `portal-${tag}`)
        await go(p, `/my/${slug}`, 1200)
        const field = p.getByLabel('Your mobile number')
        if (!(await field.count())) { ok(false, `the portal sign-in opened at ${tag}`); await c.close(); continue }
        await field.fill(benPhone)
        await p.locator('[data-testid="portal-send-code"]').click()
        await p.locator('[data-testid="portal-code-demo"]').waitFor({ timeout: 8000 }).catch(() => {})
        const demo = await text(p.locator('[data-testid="portal-code-demo"]'))
        ok(demo === 'Demo only — no text is sent: any six digits open your project.', `the portal’s code step says no text is sent (${tag})`, demo)
        ok((await sideways(p)) <= 0, `the portal’s code step at ${tag}: no sideways scroll`)
        if (tag !== '320') await shot(p, `s34-portal-code-${tag}`)
        if (tag === '1440') {
          const boxes = p.locator('[data-testid="portal-digit"]')
          for (let i = 0; i < 6; i++) await boxes.nth(i).fill(String((i * 7 + 3) % 10))
          await p.locator('[data-testid="portal-open"]').click()
          await p.waitForURL((u) => !/sign-in|\/login/.test(u.pathname) && u.pathname.startsWith(`/my/${slug}`), { timeout: 10_000 }).catch(() => {})
          await settle(p, 1200)
          ok(!(await p.locator('[data-testid="portal-sign-in"]').count()), 'any six digits still open the project (the stand-in, through the one sign-in provider)')
        }
        await c.close()
      }

      /* a paper's Download PDF is still the browser's print — through printPaper */
      const inv = sql(`select project_id || '/invoices/' || id from project_invoices where status <> 'draft' limit 1`)
      const c = await desk()
      await c.addInitScript(() => { window.__printed = 0; window.print = () => { window.__printed++ } })
      const p = await page(c, 'paper')
      await go(p, `/projects/${inv}?print=1`, 2200)
      ok((await p.evaluate(() => window.__printed)) >= 1, 'a money paper opened with ?print=1 prints (printPaper — the browser’s own PDF)')
      const dl = p.getByRole('button', { name: 'Download PDF' })
      if (await dl.count()) { const n0 = await p.evaluate(() => window.__printed); await dl.first().click(); await settle(p, 300); ok((await p.evaluate(() => window.__printed)) === n0 + 1, 'its Download PDF press prints once more') }
      await c.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e && e.stack || e).slice(0, 600))
  } finally {
    putBack()
    as(you0 || 'dane')
    await b.close()
  }
  const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
  ok(!changed.length, 'the run leaves every table as it found it', changed)
  ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stagesBefore && sql(`select count(*) from stage_logs`) === logsBefore, 'the leads’ stages and stage logs are as found')
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  ok(errors.length === 0, 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
