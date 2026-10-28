// Parity-map build 2026-10-10 — package P-F: the client's portal & Qanvast Ops (the owner's "build everything that's in 1.0 to 2.0"; map rows
// CP-062 · CP-064 · CP-072 · CP-099 · CP-110 · CP-118 · CP-127 · CP-148 · CP-149 · SC-087 · FR-095 · UC-082's operator pause; outcome in
// design-source/context/parity/28-projects-finance-parity-map-2026-10-10/build/outcome-P-F.md). Each check asserts a rule:
//   1 · Qanvast Ops › Studios — the tab, the studio's row, the usage counted from the records, Portal Off closes every portal page ("closed for
//       now", the studio reads "Closed by OpenMaison", a portal request refuses) and its Undo, Pause the studio's messages and its Undo;
//   2 · Company › Client portal — the address card's Copy (the whole address) and Open (a new tab on the address);
//   3 · the client's Schedule — the chips past five stages with their counts (each chip shows what it counts), the rail's Project started and
//       invoices sent, a paused stage's "Resuming around …" and "Resume day passed";
//   4 · the client's Files — shared files under their kind's heading;
//   5 · the renders link — the client's own pin: Mark resolved · Reopen · Remove and its Undo;
//   6 · Ask the client — the real address, the invite it brings, WhatsApp opens on the press, the ask recorded and the client told (the outbox's
//       `client_questions`, the portal bell's row);
//   7 · a signature confirmed — `client_signed` after the client signs online;
//   8 · the phone (390) and 320 — the Studios card, the Schedule's chips, no sideways scroll.
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it changes is put back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pm-f.cjs <scratch.db> [shotDir]   (env BASE, default http://localhost:3011)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-f')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3011'
const q = (s) => s.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (s) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q(s)}"`).toString().trim()
const json = (s) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q(s)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pmf-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 1 << 28 }) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const platform = () => { const v = sql(`select value from settings where key='platform'`); try { return v ? JSON.parse(v) : {} } catch { return {} } }
const DAY = 86_400_000

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ben = sql(`select id from projects where number='P-2026-002'`)
  const benLead = sql(`select lead_id from projects where id='${ben}'`)
  const olivia = sql(`select id from leads where name='Olivia Martinez' and deleted_at is null limit 1`)
  const oliviaC = sql(`select id from contracts where lead_id='${olivia}' and deleted_at is null limit 1`)
  const carpentry = sql(`select id from project_milestones where project_id='${ben}' and title='Carpentry fabrication' and deleted_at is null limit 1`)
  const LINK = sql(`select token from render_share_links where revoked_at is null and expires_at > strftime('%s','now') and lead_id in (select lead_id from render_share_links) limit 1`)
  const leads = `'${benLead}','${olivia}'`
  /* what the run may change, kept to put back */
  const SNAP = [
    ['settings', `key in ('platform','portal','payment_collection')`], ['render_annotations', '1'], ['homeowner_profiles', '1'], ['homeowner_lead_links', '1'],
    ['lead_events', `lead_id in (${leads})`], ['notification_outbox', '1'], ['notifications', '1'], ['portal_sessions', '1'], ['portal_bell_reads', '1'],
    ['project_milestones', `project_id = '${ben}'`], ['contracts', `lead_id = '${olivia}'`], ['quotes', `lead_id = '${olivia}'`],
    ['task_assignees', `task_id in (select id from lead_tasks where lead_id in (${leads}))`], ['lead_tasks', `lead_id in (${leads})`],
    ['render_share_links', '1'], ['members', '1'],
  ]
  const kept = SNAP.map(([t, w]) => [t, w, json(`select * from ${t} where ${w}`)])
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, w, rows] of kept) {
      text += `DELETE FROM ${t} WHERE ${w};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  /* against the VISUAL viewport: with isMobile a page wider than the screen widens the layout viewport (innerWidth) to fit, so innerWidth alone
     never sees it — the chips' rail once made the Schedule 530 wide at 390 that way */
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= Math.min(window.innerWidth, window.visualViewport?.width ?? window.innerWidth) + 1)
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).first().click(); await settle(p, 1600) }
  const seen = async (p, text) => (await p.locator('[role="status"]').allInnerTexts()).some((t) => t.includes(text))
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1400)
  }
  as('dane')
  try {
    // ── 1 · Qanvast Ops › Studios ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Qanvast Ops › Studios (CP-148 · CP-149 · UC-082)')
    {
      const C = await desk(); const s = await C.newPage(); watch(s, 'studios')
      await go(s, '/qanvast-ops')
      const tabs = await s.locator('[role="tab"]').allInnerTexts()
      ok(tabs[0]?.trim() === 'Leads' && tabs[1]?.trim() === 'Studios', `the strip reads Leads · Studios first (${tabs.join(' · ')})`)
      await s.getByRole('tab', { name: 'Studios' }).click(); await s.waitForURL(/\/qanvast-ops\/studios/); await settle(s, 1200)
      ok(await s.locator('[data-card="qanvast-studio"]').count() === 1, 'one card: the studio OpenMaison runs')   // the house Card marks itself data-card
      /* the usage, counted from the records over the last 30 days */
      const sinceS = Math.floor((Date.now() - 30 * DAY) / 1000), sinceMs = Date.now() - 30 * DAY
      const want = {
        signins: Number(sql(`select count(*) from portal_sessions where kind='client' and created_at >= ${sinceS}`)),
        issues: Number(sql(`select count(*) from project_tickets where raised_kind='client' and created_at >= ${sinceMs}`)),
        messages: Number(sql(`select (select count(*) from project_messages where author_kind='client' and channel='client' and deleted_at is null and created_at >= ${sinceMs}) + (select count(*) from lead_messages where author_kind='client' and deleted_at is null and created_at >= ${sinceMs})`)),
        choices: Number(sql(`select count(*) from project_selections where chosen_by='client' and chosen_at is not null and chosen_at >= ${sinceS} and deleted_at is null`)),
      }
      for (const k of Object.keys(want)) {
        const t = (await s.locator(`[data-testid="qanvast-usage-${k}"]`).innerText()).replace(/\s+/g, ' ')
        ok(new RegExp(`\\b${want[k]}\\b`).test(t), `${k}: the tile counts the records (${want[k]})`)
      }
      ok(/Open — clients sign in at \/my\//.test(await s.locator('[data-testid="qanvast-studio-portal-line"]').innerText()), 'the portal row: Open, at its address')
      await shot(s, '01-studios-1440')
      /* Portal Off: asks first, then closes */
      await s.locator('[data-testid="qanvast-studio-portal"] label').first().click(); await settle(s, 500)
      ok(await s.getByRole('dialog').filter({ hasText: 'Close' }).isVisible(), 'turning the portal off asks first')
      await shot(s, '02-close-ask-1440')
      await s.getByRole('button', { name: 'Close the portal' }).click(); await settle(s, 1400)
      ok(platform().portalOff === true, 'settings platform.portalOff is on')
      ok(await seen(s, 'portal is closed'), 'the snackbar says the portal is closed (with Undo)')
      ok(/^Closed/.test(await s.locator('[data-testid="qanvast-studio-portal-line"]').innerText()), 'the row reads Closed …')
      /* every portal page closes, calmly */
      const P = await desk(); const p = await P.newPage(); watch(p, 'portal-closed')
      await go(p, '/my/demo-studio/login')
      ok((await p.locator('[data-testid="portal-notice"]').getAttribute('data-kind')) === 'closed', 'the sign-in page is the closed notice')
      ok(/This page is closed for now/.test(await p.locator('[data-testid="portal-notice"]').innerText()) && /Contact /.test(await p.locator('[data-testid="portal-notice"]').innerText()), '"This page is closed for now — contact {studio}"')
      await shot(p, '03-portal-closed-1440')
      await P.close()
      /* the studio's own page says so */
      await go(s, '/company/portal')
      ok(/closed by openmaison/i.test(await s.locator('[data-testid="portal-state"]').innerText()), 'Company › Client portal: the chip reads Closed by OpenMaison')   // the chip sets its words in capitals
      ok(await s.locator('[data-testid="portal-closed-note"]').isVisible(), '…and the note says whom to ask')
      await shot(s, '04-company-closed-1440')
      /* going back on is one press, no question */
      await go(s, '/qanvast-ops/studios')
      await s.locator('[data-testid="qanvast-studio-portal"] label').first().click(); await settle(s, 1400)
      ok(platform().portalOff === false && await s.getByRole('dialog').count() === 0, 'turning it back on: one press, no question')
      ok(await seen(s, 'portal is open again'), '…and the snackbar says it is open again')
      /* a close's Undo opens it again */
      await s.locator('[data-testid="qanvast-studio-portal"] label').first().click(); await settle(s, 500)
      await s.getByRole('button', { name: 'Close the portal' }).click(); await settle(s, 1200)
      ok(platform().portalOff === true, 'closed again')
      await undo(s)
      ok(platform().portalOff === false, 'Undo opens the portal again')
      /* Pause the studio's messages, and its Undo */
      await s.locator('[data-testid="qanvast-studio-messages"] label').first().click(); await settle(s, 500)
      await s.getByRole('button', { name: 'Pause messages' }).click(); await settle(s, 1400)
      ok(platform().messagesPaused === true, 'settings platform.messagesPaused is on (the delivery layer holds every message)')
      ok(/^Paused/.test(await s.locator('[data-testid="qanvast-studio-messages-line"]').innerText()), 'the row reads Paused …')
      await shot(s, '05-messages-paused-1440')
      await undo(s)
      ok(platform().messagesPaused === false, 'Undo sends again')
      await C.close()
    }

    // ── 2 · Company › Client portal: Copy and Open ───────────────────────────────────────────────────────────────────────────────
    console.log('2 · The address card: Copy · Open (CP-127)')
    {
      const C = await desk(); const s = await C.newPage(); watch(s, 'company-portal')
      await go(s, '/company/portal')
      await s.locator('[data-testid="portal-address-copy"]').click(); await settle(s, 500)
      const clip = await s.evaluate(() => navigator.clipboard.readText()).catch(() => '')
      ok(/^https?:\/\/[^/]+\/my\/[a-z0-9-]+$/.test(clip), `Copy gives the whole address (${clip})`)
      const [tab] = await Promise.all([C.waitForEvent('page'), s.locator('[data-testid="portal-address-open"]').click()])
      await tab.waitForLoadState().catch(() => {})
      ok(/\/my\/[a-z0-9-]+/.test(tab.url()), `Open opens the address in a new tab (${tab.url()})`)
      ok(await s.locator('[data-testid="portal-test"]').count() === 1, 'See it as {client} stays the test client’s view (no copy of it)')
      await shot(s, '06-company-address-1440')
      await C.close()
    }

    // ── 3 · The client's Schedule ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · The client’s Schedule: chips · the rail · a paused stage (CP-062 · SC-087 · CP-064)')
    {
      const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1)
      sql(`update project_milestones set status='blocked', client_note='Waiting for the cabinet doors from the factory', resume_on=${Math.floor(tomorrow.getTime() / 1000)} where id='${carpentry}'`)
      const C = await desk(); const p = await C.newPage(); watch(p, 'schedule')
      await signIn(p, '97731968')
      await go(p, '/my/demo-studio/schedule')
      const stages = await p.locator('[data-testid="portal-stage"]').count()
      const chips = p.locator('[data-testid="portal-stage-filters"] [role="radio"]')
      /* a moment's title alone — the row's innerText starts with its icon's ligature word */
      const railTitles = async () => (await p.locator('[data-testid="portal-rail-event"] [class*="momentName"]').allInnerTexts()).map((t) => t.trim())
      ok(stages > 5 ? await chips.count() === 5 : await chips.count() === 0, `chips only past five stages (${stages} stages, ${await chips.count()} chips)`)
      /* (the calm UI build 2026-10-27, a deliberate change — 3-39 · 3-52) counts read "Label · n" (none on an empty chip), and with the chips there an
         invoice sent sits under Payments alone: All reads the milestones and Project started */
      let payTitles = null
      if (await chips.count()) {
        ok((await chips.allInnerTexts()).map((t) => t.replace(/\s*·\s*\d+$/, '')).join(' · ') === 'All · Payments · Under way · Paused · Coming up', 'All · Payments · Under way · Paused · Coming up')
        for (let i = 1; i < 5; i++) {
          const c = chips.nth(i); const n = Number(/·\s*(\d+)$/.exec((await c.innerText()).trim())?.[1] ?? 0)
          await c.click(); await settle(p, 300)
          ok(await p.locator('[data-testid="portal-stage"]').count() === n, `${(await c.innerText()).trim()}: the list shows what the chip counts`)
          if (i === 1) { payTitles = await railTitles(); ok(payTitles.every((t) => /^Invoice /.test(t)), 'Payments keeps the invoices sent on the rail, nothing else') }
          if (i === 3) await shot(p, '07-schedule-paused-chip-1440')
        }
        await chips.nth(0).click(); await settle(p, 300)
      }
      const events = await railTitles()
      const sent = Number(sql(`select count(*) from project_invoices where project_id='${ben}' and status='sent' and sent_at is not null`))
      ok(events.some((t) => /Project started/.test(t)), 'the rail shows Project started')
      if (payTitles) {
        ok(payTitles.filter((t) => /^Invoice .* sent$/.test(t)).length === sent, `…each invoice sent under Payments (${sent})`)
        ok(!events.some((t) => /^Invoice /.test(t)), '…and All reads the milestones without them')
      } else ok(events.filter((t) => /^Invoice .* sent$/.test(t)).length === sent, `…and each invoice sent (${sent})`)
      const paused = await p.locator('[data-testid="portal-stage-paused"]').innerText()
      ok(/^Paused — Waiting for the cabinet doors from the factory · Resuming around \d{1,2} [A-Z][a-z]{2}/.test(paused), `a paused stage: the studio's words and the restart (${paused})`)
      await shot(p, '08-schedule-1440', true)
      const yesterday = new Date(); yesterday.setHours(0, 0, 0, 0); yesterday.setDate(yesterday.getDate() - 1)
      sql(`update project_milestones set resume_on=${Math.floor(yesterday.getTime() / 1000)} where id='${carpentry}'`)
      await go(p, '/my/demo-studio/schedule')
      ok(/Resume day passed$/.test(await p.locator('[data-testid="portal-stage-paused"]').innerText()), '"Resume day passed" once the day has gone by')
      // ── 4 · Files by kind ──
      console.log('4 · The client’s Files by kind (CP-099)')
      await go(p, '/my/demo-studio/files')
      const groups = await p.locator('[data-testid="portal-shared-group"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-group')))
      const shown = Number(sql(`select count(*) from lead_files where lead_id='${benLead}' and shown_to_client_at is not null and deleted_at is null and kind <> 'folder'`))
      ok(shown === 0 || groups.length > 0, `shared files sit under their kind (${groups.join(', ')})`)
      const plan = sql(`select name from lead_files where lead_id='${benLead}' and shown_to_client_at is not null and deleted_at is null and lower(name) like '%floor plan%' limit 1`)
      if (plan) ok(/FLOOR PLANS|Floor plans/.test(await p.locator('[data-testid="portal-shared-group"][data-group="floor-plans"]').innerText()), 'a floor plan under Floor plans')
      await shot(p, '09-files-1440', true)
      // ── 4b · How clients pay (P-D's FB-112, wired here) ──
      console.log('4b · I have paid offers the ways the studio takes (FB-112 wiring)')
      await go(p, '/my/demo-studio/money')
      if (await p.locator('[data-testid="portal-i-have-paid"]').count()) {
        sql(`insert into settings (key, value, updated_at) values ('payment_collection', '{"off":["paynow"],"bankFeed":null}', strftime('%s','now')) on conflict(key) do update set value=excluded.value`)
        await go(p, '/my/demo-studio/money')
        await p.locator('[data-testid="portal-i-have-paid"]').first().click(); await settle(p, 600)
        const ways = await p.locator('[data-testid="portal-paid-method"] [role="radio"]').allInnerTexts()
        ok(ways.length === 1 && /Bank transfer/i.test(ways[0] ?? ''), `PayNow off: I have paid offers Bank transfer only (${ways.join(' · ')})`)
        await p.keyboard.press('Escape'); await settle(p, 400)
        sql(`update settings set value='{"off":["paynow","bank_transfer"],"bankFeed":null}' where key='payment_collection'`)
        await go(p, '/my/demo-studio/money')
        ok(await p.locator('[data-testid="portal-i-have-paid"]').count() === 0, 'neither taken: the press steps aside…')
        ok(await p.locator('[data-testid="portal-pay-in-person"]').count() > 0, '…and says how to pay in person')
        await shot(p, '09b-money-in-person-1440')
        sql(`delete from settings where key='payment_collection'`)
      } else ok(true, '(nothing due on Benjamin’s Money — skipped)')
      await C.close()
      /* the phone: the chips on one rail, nothing sideways */
      const M = await phone(); const m = await M.newPage(); watch(m, 'schedule-390')
      await signIn(m, '97731968'); await go(m, '/my/demo-studio/schedule')
      ok(await noOverflow(m), 'the Schedule at 390: no sideways scroll')
      await shot(m, '10-schedule-390', true)
      await m.setViewportSize({ width: 320, height: 700 }); await settle(m, 400)
      ok(await noOverflow(m), '…and at 320')
      await M.close()
    }

    // ── 5 · The renders link: the client's own pins ──────────────────────────────────────────────────────────────────────────────
    console.log('5 · The client’s own pins (CP-072)')
    if (LINK) {
      const pin = sql(`select a.id from render_annotations a where a.author_role='client' and a.deleted_at is null limit 1`)
      const C = await desk(); const p = await C.newPage(); watch(p, 'renders')
      await go(p, `/renders/${LINK}`)
      const marker = p.locator('button[aria-label^="Pin "]').first()
      if (pin && await marker.count()) {
        await marker.click(); await settle(p, 500)
        await p.locator('[data-testid="pin-own-status"]').click(); await settle(p, 1200)
        ok(sql(`select status from render_annotations where id='${pin}'`) === 'resolved', 'Mark resolved: the pin is resolved')
        await shot(p, '11-pin-resolved-1440')
        await p.locator('[data-testid="pin-own-status"]').click(); await settle(p, 1200)
        ok(sql(`select status from render_annotations where id='${pin}'`) === 'open', 'Reopen: open again')
        await p.locator('[data-testid="pin-own-remove"]').click(); await settle(p, 1200)
        ok(sql(`select deleted_at is not null from render_annotations where id='${pin}'`) === '1', 'Remove: the pin is gone (softly)')
        ok(await seen(p, 'Pin removed'), '"Pin removed" with Undo')
        await undo(p)
        ok(sql(`select deleted_at is null from render_annotations where id='${pin}'`) === '1', 'Undo brings it back')
        const studioPin = sql(`select id from render_annotations where author_role='studio' and deleted_at is null limit 1`)
        if (studioPin) ok(await p.locator(`button[aria-label*="${sql(`select substr(body,1,12) from render_annotations where id='${studioPin}'`)}"]`).count() === 0, 'the studio’s own pins never reach the link')
      } else ok(true, '(no client pin on the open link — skipped)')
      await C.close()
    }

    // ── 6 · Ask the client ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · Ask the client (CP-110 · CP-118)')
    {
      const C = await desk(); const s = await C.newPage(); watch(s, 'ask')
      sql(`update homeowner_lead_links set last_asked_at = NULL where lead_id='${olivia}'`)
      const wasInvited = sql(`select count(*) from homeowner_lead_links where lead_id='${olivia}' and invited_at is not null and withdrawn_at is null`) === '1'
      await go(s, `/leads/${olivia}/questionnaire`)
      await s.locator('[data-testid="ask-client"]').first().click(); await settle(s, 1200)   // (the calm UI build 2026-10-27, a deliberate change) B2: "Ask {client}" — pressed by its handle
      const link = (await s.locator('[data-testid="ask-link"]').innerText()).trim()
      ok(/\/my\/[a-z0-9-]+/.test(link) && !/portalexample/.test(link), `the dialog shows the studio's real address (${link})`)
      if (!wasInvited) ok(await s.locator('[data-testid="ask-invites"]').isVisible(), 'a client never invited: "This also invites … to your portal"')
      await shot(s, '12-ask-dialog-1440')
      const [wa] = await Promise.all([C.waitForEvent('page', { timeout: 5000 }).catch(() => null), s.locator('[data-testid="ask-send"]').click()])
      await settle(s, 1600)
      /* wa.me answers with WhatsApp's own send page — either address, to the client's number, with the drafted words */
      ok(!!wa && (/wa\.me\/65\d{8}\?text=/.test(wa.url()) || /api\.whatsapp\.com\/send\/?\?phone=65\d{8}&text=/.test(wa.url())), `Send via WhatsApp opens wa.me on the press, to the client (${wa ? wa.url().slice(0, 60) : 'none'})`)
      ok(Number(sql(`select count(*) from lead_events where lead_id='${olivia}' and kind='questionnaire_asked'`)) > 0, 'the ask is recorded')
      ok(sql(`select count(*) from homeowner_lead_links where lead_id='${olivia}' and invited_at is not null and withdrawn_at is null`) === '1', 'the client can now sign in (invited)')
      ok(Number(sql(`select count(*) from notification_outbox where lead_id='${olivia}' and event='client_questions'`)) > 0, 'client_questions goes by the delivery layer')
      await C.close()
      /* the client's portal bell has the row */
      const P = await desk(); const p = await P.newPage(); watch(p, 'ask-bell')
      await signIn(p, sql(`select phone from leads where id='${olivia}'`))
      await p.locator('[data-testid="portal-bell"]').first().click().catch(() => {}); await settle(p, 1000)
      const row = p.locator('[data-testid="portal-bell-row"][data-kind="questions_asked"]').first()
      ok(await row.count() === 1 && /has a few questions about your home/.test(await row.innerText()), 'the portal’s bell: "{studio} has a few questions about your home"')
      await shot(p, '13-ask-bell-1440')
      await P.close()
    }

    // ── 7 · A signature confirmed ────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · client_signed (CP-118 · FR-095)')
    if (oliviaC) {
      sql(`update contracts set status='Sent to Client', sent_at=${Math.floor(Date.now() / 1000)}, requires_accept=0, requires_scroll=0 where id='${oliviaC}'`)
      /* (S42 B-01) an agreement whose quote is still a Draft awaiting approval waits ("Not ready yet") — the studio sends the quote first */
      sql(`update quotes set status='Sent to Client', client_sent_at=coalesce(client_sent_at, ${Math.floor(Date.now() / 1000)}) where id=(select from_quote_id from contracts where id='${oliviaC}')`)
      const C = await desk(); const g = await C.newPage(); watch(g, 'sign')
      await go(g, `/sign/${oliviaC}`)
      await g.locator('[data-testid="paper-end"]').scrollIntoViewIfNeeded().catch(() => {}); await settle(g, 600)
      if (await g.locator('[data-testid="gate-casetrust-tick"]').count()) await g.locator('[data-testid="gate-casetrust-tick"]').click()
      await g.getByRole('button', { name: 'Send code' }).first().click().catch(() => {}); await settle(g, 500)
      await g.getByLabel('One-time code').fill('123456').catch(() => {}); await g.getByRole('button', { name: 'Verify' }).click().catch(() => {}); await settle(g, 500)
      await g.getByRole('button', { name: 'Sign contract' }).click().catch(() => {}); await settle(g, 2400)   // (the close-out 2026-10-28, a deliberate change) C-52: "contract" on the signing pages
      const signed = sql(`select status from contracts where id='${oliviaC}'`) === 'Signed'
      ok(signed, 'the agreement is signed online')
      if (signed) ok(Number(sql(`select count(*) from notification_outbox where lead_id='${olivia}' and event='client_signed'`)) > 0, 'client_signed goes to the client')
      await C.close()
      const S = await desk(); const st = await S.newPage(); watch(st, 'settings')
      await go(st, '/settings?section=notifications')
      ok((await st.locator('body').innerText()).includes('A signature is confirmed'), 'Settings › Notifications › Messages to clients lists "A signature is confirmed"')
      await S.close()
    }

    // ── 8 · The phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Qanvast Ops › Studios on a phone')
    {
      const M = await phone(); const m = await M.newPage(); watch(m, 'studios-390')
      await go(m, '/qanvast-ops/studios')
      ok(await m.locator('[data-card="qanvast-studio"]').isVisible() && await noOverflow(m), 'the Studios card at 390, no sideways scroll')
      await shot(m, '14-studios-390', true)
      await M.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ the run stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    as('dane')
    await b.close()
  }
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail || errors.length ? 1 : 0)
})()
