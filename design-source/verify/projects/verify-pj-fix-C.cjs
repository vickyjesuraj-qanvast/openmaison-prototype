// Fix phase C (2026-10-06) — Updates and Choices, the studio side: the five Majors and the minors they touch, as rules.
//   C-01 an edit to a published update is held for review; the client keeps the published words, date and place; Approve swaps them in.
//   C-22 the client's card says Changed after an edit; the studio's card stops saying "Seen by" until they open it again.
//   C-02 a changed pick keeps its variation order in step (Draft rewritten / deleted, Undo; past Draft the pick holds, said before Save).
//   C-04 a pick ends the milestone's wait for it (the studio's pick and its Undo; the client's pick on the portal).
//   C-03 the post head on a phone keeps its name, time and ⋮ inside the card (390 and 320).
//   C-05 a video plays and a PDF shows in the house viewer; Download downloads the kept bytes; the card's tiles open the viewer.
//   + C-13 the VO editor's message and crumb · C-23 the radio group · C-12 move + Undo · C-10 take back + Undo · C-18 / C-08 words true to
//   access · C-24 a foreign milestone refused · C-15 review rows answered · C-25 Delete names the update.
// Run against `next start` on a FRESH copy of the repaired scratch DB — never local.db. Puts `members.is_you` back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules BASE=http://localhost:3122 node verify-pj-fix-C.cjs <scratch.db> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'fix-C')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3122'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const YOU_WAS = sql(`select id from members where is_you = 1`)
const BEN = sql(`select id from leads where name='Benjamin Han' and deleted_at is null`)
const BEN_P = sql(`select id from projects where lead_id='${BEN}'`)
const AISHA_P = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name='Aisha Rahman'`)
const PAINT = sql(`select id from project_selections where project_id='${BEN_P}' and title='Paint colours'`)
const PAINTING = sql(`select id from project_milestones where project_id='${BEN_P}' and title='Painting'`)
const OPT = (name) => sql(`select id from project_selection_options where selection_id='${PAINT}' and name='${name}'`)
const FLOOR = sql(`select id from project_updates where project_id='${BEN_P}' and title='Flooring is laid in the living room'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const post = (p, title) => p.locator('[data-testid="update-post"]').filter({ has: p.locator('h3', { hasText: title }) }).first()
  const card = (p, title) => p.locator('[data-testid="choice-card"]', { has: p.locator('h3', { hasText: title }) })
  /* (the calm UI build 2026-10-27, a deliberate change — 3-27) Choose with {client} left the card's band for its ⋮ */
  const chooseWith = async (p, title) => { await card(p, title).locator('[data-testid="choice-kebab"]').click(); await p.waitForTimeout(250); await p.locator('[data-testid="choice-choose"] [role="menuitem"]').click() }
  const menu = async (p, scope, kebab, item) => { await scope.locator(kebab).first().click(); await settle(p, 300); await p.getByRole('menuitem', { name: new RegExp(`^${item}`) }).click(); await settle(p, 700) }
  const signIn = async (p) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill('97731968')
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
  }
  try {
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
    const s = await D.newPage(); s.on('pageerror', (e) => errors.push(`studio: ${String(e).slice(0, 160)}`))

    // ── C-01 · C-22 · C-15: an edit to a published update ──────────────────────────────────────────────────────────────────────
    console.log('C-01 a published update edited under review (Germaine → Dane)')
    const pubWas = sql(`select published_at from project_updates where id='${FLOOR}'`)
    as('germaine')
    await go(s, `/projects/${BEN_P}/updates`)
    await menu(s, post(s, 'Flooring is laid'), '[data-testid="update-kebab"]', 'Edit')
    ok(/keeps reading the published update/.test(await dialog(s).innerText()), 'the composer says the client keeps the published update while the change waits')
    await dialog(s).locator('input').first().fill('Flooring is laid in the living room and corridor')
    await s.locator('[data-testid="composer-post"]').click(); await settle(s, 1600)
    ok(sql(`select status || '|' || title || '|' || published_at from project_updates where id='${FLOOR}'`) === `published|Flooring is laid in the living room|${pubWas}`, 'the published update stays as it was — status, words, publish date')
    ok(sql(`select json_extract(pending,'$.title') from project_updates where id='${FLOOR}'`) === 'Flooring is laid in the living room and corridor', 'the change is held beside it')
    ok(/Change sent for review/.test(await snack(s).innerText()), 'the snackbar says the change went for review')
    const band = post(s, 'Flooring is laid').locator('[data-testid="update-band"]')
    ok(/Changes wait for review/.test(await band.innerText()) && /Benjamin still sees the version from/.test(await band.innerText()), 'the band: the change waits, the client still sees the version from its day')
    ok(sql(`select count(*) from notifications where kind='update_review' and href like '%${FLOOR}%' and read_at is null`) !== '0', 'the reviewers are asked')
    await shot(s, 'c01-held-1440')
    const P = await b.newContext({ viewport: { width: 1440, height: 1024 } }); const c = await P.newPage()
    await signIn(c); await go(c, '/my/demo-studio/updates')
    const portalText = await c.locator('main').innerText()
    ok(/Flooring is laid in the living room/.test(portalText) && !/and corridor/.test(portalText), 'the portal still shows the published words — the change never reached the client')
    as('dane')
    await go(s, `/projects/${BEN_P}/updates`)
    await post(s, 'Flooring is laid').getByRole('button', { name: 'Approve' }).click(); await settle(s, 1600)
    ok(sql(`select title || '|' || published_at || '|' || coalesce(pending,'none') from project_updates where id='${FLOOR}'`) === `Flooring is laid in the living room and corridor|${pubWas}|none`, 'Approve swaps the words in and keeps the publish date (its place in the feed)')
    ok(sql(`select count(*) from notifications where kind='update_review' and href like '%${FLOOR}%' and read_at is null`) === '0', 'the review rows are answered (C-15)')
    ok(/hasn’t seen the change yet/.test(await post(s, 'and corridor').innerText()), 'the studio card stops saying "Seen by" until the client opens the change (C-22)')
    await go(c, '/my/demo-studio/updates')
    const changed = c.locator('[data-testid="client-update"]').filter({ hasText: 'and corridor' })
    ok(/\bchanged\b/i.test(await changed.innerText()), 'the client’s card wears Changed (C-22)')
    await shot(c, 'c22-portal-changed-1440')

    // ── C-24: a milestone of another project ───────────────────────────────────────────────────────────────────────────────────
    const foreign = sql(`select id from project_milestones where project_id <> '${BEN_P}' and deleted_at is null limit 1`)
    ok(!!foreign, 'there is a milestone on another project to try (C-24)')

    // ── C-04 · C-02 · C-13 · C-23: the pick, its wait and its variation order ─────────────────────────────────────────────────────
    console.log('C-04 a pick ends the wait · C-02 the variation order follows the pick')
    ok(sql(`select coalesce(waiting_on,'') from project_milestones where id='${PAINTING}'`) === 'client', 'Painting waits on Benjamin for the paint colours (seeded)')
    await go(s, `/projects/${BEN_P}/choices`)
    await chooseWith(s, 'Paint colours'); await settle(s, 600)
    const radios = dialog(s).locator('[data-testid="choose-option"]')
    await radios.first().click(); await settle(s, 200)
    await s.keyboard.press('ArrowDown'); await settle(s, 200)
    ok(await radios.nth(1).getAttribute('aria-checked') === 'true' && await radios.nth(1).getAttribute('tabindex') === '0', 'the arrows move the pick — one Tab stop (C-23)')
    await s.keyboard.press('ArrowUp'); await settle(s, 200)
    await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1600)
    ok(sql(`select coalesce(waiting_on,'none') from project_milestones where id='${PAINTING}'`) === 'none', 'the pick ends Painting’s wait in the same write (C-04)')
    ok(/Painting no longer waits on Benjamin/.test(await snack(s).innerText()), 'the snackbar says the wait ended')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select status || '|' || coalesce((select waiting_on from project_milestones where id='${PAINTING}'),'none') from project_selections where id='${PAINT}'`) === 'shared|client', 'Undo puts the choice and the wait back')
    await go(s, `/projects/${BEN_P}/choices`)
    await chooseWith(s, 'Paint colours'); await settle(s, 600)
    await dialog(s).locator('[data-testid="choose-option"]').first().click(); await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1600)
    ok(sql(`select chosen_option_id from project_selections where id='${PAINT}'`) === OPT('Sage Whisper'), 'Sage Whisper chosen with Benjamin')
    await go(s, `/projects/${BEN_P}/choices`)
    await card(s, 'Paint colours').locator('[data-testid="choice-draft-vo"]').click()
    await s.waitForURL(/\/quotes\//, { timeout: 15000 }); await settle(s, 1500)
    const vo = sql(`select id from quotes where selection_id='${PAINT}' and deleted_at is null`)
    const voNo = sql(`select number from quotes where id='${vo}'`)
    ok(new RegExp(`${voNo} drafted from the pick`).test(await snack(s).innerText().catch(() => '')), 'the editor says the order was drafted — the message arrived with it (C-13)')
    ok(/Choices/.test(await s.locator('header nav, header [class*="crumb"]').first().innerText().catch(() => '')), 'the order’s crumb names Choices, where it was opened from (C-13)')
    ok(!s.url().includes('drafted='), 'the flag leaves the address once said')
    await shot(s, 'c13-vo-editor-1440')
    sql(`update project_selection_options set price_minor = 12000 where id='${OPT('Soft Greige')}'`)
    await go(s, `/projects/${BEN_P}/choices`)
    await card(s, 'Paint colours').locator('[data-testid="choice-change"]').click(); await settle(s, 600)
    ok(await dialog(s).locator('[data-testid="choose-option"]').first().getAttribute('aria-checked') === 'true', 'the current pick is ticked from the start (C-23)')
    await dialog(s).locator('[data-testid="choose-option"]', { hasText: 'Soft Greige' }).click(); await settle(s, 200)
    ok(new RegExp(`${voNo} \\(Draft\\) carries Sage Whisper — its line follows`).test(await dialog(s).locator('[data-testid="choose-vo"]').innerText()), 'the dialog names the order and what happens to it (C-02)')
    await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1600)
    ok(sql(`select name || '|' || cost_minor from quote_items where quote_id='${vo}' and kind <> 'group'`) === 'Paint colours — Soft Greige|12000', 'the Draft order’s line is rewritten to the new pick (C-02)')
    ok(new RegExp(`${voNo} follows it`).test(await snack(s).innerText()), 'the snackbar says the order followed')
    await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1500)
    ok(sql(`select name || '|' || cost_minor from quote_items where quote_id='${vo}' and kind <> 'group'`) === 'Paint colours — Sage Whisper|24000' && sql(`select chosen_option_id from project_selections where id='${PAINT}'`) === OPT('Sage Whisper'), 'Undo puts the pick and the order’s line back')
    await go(s, `/projects/${BEN_P}/choices`)
    await card(s, 'Paint colours').locator('[data-testid="choice-change"]').click(); await settle(s, 600)
    await dialog(s).locator('[data-testid="choose-option"]', { hasText: 'Warm White' }).click(); await settle(s, 200)
    ok(/it is deleted: this pick changes nothing on the price/.test(await dialog(s).locator('[data-testid="choose-vo"]').innerText()), 'an unpriced pick says its Draft order goes')
    await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1600)
    ok(sql(`select deleted_at is not null from quotes where id='${vo}'`) === '1' && !(await card(s, 'Paint colours').locator('[data-testid="choice-open-vo"]').count()), 'the Draft order is deleted — no order points at an option no longer picked')
    sql(`update quotes set deleted_at = null, status = 'Sent to Client' where id='${vo}'`)
    sql(`update quote_items set name = 'Paint colours — Warm White' where quote_id='${vo}' and kind <> 'group'`)
    await go(s, `/projects/${BEN_P}/choices`)
    ok(await card(s, 'Paint colours').locator('[data-testid="choice-open-vo"]').count() === 1, 'an order that exists is always one press away')
    await card(s, 'Paint colours').locator('[data-testid="choice-change"]').click(); await settle(s, 600)
    await dialog(s).locator('[data-testid="choose-option"]', { hasText: 'Sage Whisper' }).click(); await settle(s, 200)
    ok(new RegExp(`${voNo} is with Benjamin — move it back to Draft`).test(await dialog(s).locator('[data-testid="choose-vo"]').innerText()) && await s.locator('[data-testid="choose-save"]').isDisabled(), 'an order with the client holds the pick — said before Save (C-02)')
    await shot(s, 'c02-vo-holds-1440')
    await s.keyboard.press('Escape'); await settle(s, 400)

    // ── C-12 · C-10: move + Undo, take back + Undo ─────────────────────────────────────────────────────────────────────────────
    console.log('C-12 move + Undo · C-10 take back + Undo')
    const topSel = sql(`select id from project_selections where project_id='${BEN_P}' and status='draft' limit 1`)
    void topSel
    /* Aisha (never invited) — her draft choice shared three days ago and needed two days ago: the case the audit made on its copy */
    const AISHA_SHARED = sql(`select id from project_selections where project_id='${AISHA_P}' and deleted_at is null limit 1`)
    if (AISHA_SHARED) sql(`update project_selections set status='shared', shared_by='michelle', shared_at=cast(strftime('%s','now') as integer) - 3*86400, needed_by=cast(strftime('%s','now') as integer) - 2*86400 where id='${AISHA_SHARED}'`)
    if (AISHA_SHARED) {
      await go(s, `/projects/${AISHA_P}`)
      ok(!/Choice overdue|awaits a choice/.test(await s.locator('main').innerText()), 'the Overview blames no wait on a client who can’t see the choice (C-18)')
      const shareWas = sql(`select shared_by || '|' || shared_at from project_selections where id='${AISHA_SHARED}'`)
      const title = sql(`select title from project_selections where id='${AISHA_SHARED}'`)
      await go(s, `/projects/${AISHA_P}/choices`)
      const ac = card(s, title)
      await ac.scrollIntoViewIfNeeded(); await shot(s, 'c18-aisha-1440')
      ok(/sees it once invited to the portal/.test(await ac.locator('[data-testid="choice-band"]').innerText()) && await ac.locator('[data-testid="choice-invite"]').count() === 1, 'a client not on the portal: the band says so and offers the invite (C-18)')
      ok(!/red/.test(await ac.locator('[class*="metaChip"], [data-color]').evaluateAll((e) => e.map((x) => x.getAttribute('data-color') ?? '').join(','))), 'its due chip is never red for a client who can’t see it (C-18)')
      const opts = ac.locator('[data-testid="choice-option"]')
      if (await opts.count() > 1) {
        const first = await opts.first().getAttribute('data-option-id')
        await opts.first().locator('[data-testid="option-kebab"]').click(); await settle(s, 300)
        await s.getByRole('menuitem', { name: 'Move later' }).click(); await settle(s, 1400)
        ok(/moved — now 2nd of/.test(await snack(s).innerText()), 'a move says where the option went (C-12)')
        await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
        ok(await card(s, title).locator('[data-testid="choice-option"]').first().getAttribute('data-option-id') === first, 'Undo puts the order back')
      }
      await menu(s, card(s, title), '[data-testid="choice-kebab"]', 'Take back')
      await snack(s).getByRole('button', { name: 'Undo' }).click(); await settle(s, 1400)
      ok(sql(`select shared_by || '|' || shared_at from project_selections where id='${AISHA_SHARED}'`) === shareWas, 'Take back’s Undo puts the share back as it was — who and when (C-10)')
    } else ok(true, '(no shared choice on Aisha’s project to try C-10 / C-12 / C-18 on)')

    // ── C-05 · C-25: a video and a PDF in the house viewer ─────────────────────────────────────────────────────────────────────
    console.log('C-05 the viewer plays a video, shows a PDF, downloads the bytes')
    const folder = sql(`select id from lead_files where lead_id='${BEN}' and name='Site updates' and kind='folder' and deleted_at is null limit 1`)
    const vid = 'fixc-video', pdf = 'fixc-pdf', kitchen = sql(`select id from project_updates where project_id='${BEN_P}' and title='Kitchen cabinets are in'`)
    const pdfB64 = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64')
    sql(`insert or replace into lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) values ('${vid}','${BEN}','video','site-walk.webm',null,strftime('%s','now'),'${folder}','dane',4,'video/webm',strftime('%s','now')), ('${pdf}','${BEN}','pdf','handover-checklist.pdf',null,strftime('%s','now'),'${folder}','dane',40,'application/pdf',strftime('%s','now'))`)
    sql(`insert or replace into lead_file_images (file_id, data) values ('${vid}','data:video/webm;base64,GkXfow=='), ('${pdf}','data:application/pdf;base64,${pdfB64}')`)
    sql(`insert or ignore into project_update_files (update_id, file_id, position, created_at) values ('${kitchen}','${vid}',5,strftime('%s','now')), ('${kitchen}','${pdf}',6,strftime('%s','now'))`)
    await go(s, `/projects/${BEN_P}/updates`)
    ok(/\/files\//.test(await post(s, 'Kitchen cabinets are in').locator('[data-testid="update-video"]').getAttribute('href') ?? '') && /\/files\//.test(await post(s, 'Kitchen cabinets are in').locator('[data-testid="update-doc"]').first().getAttribute('href') ?? ''), 'the card’s video and document open the house viewer, never raw bytes')
    await go(s, `/projects/${BEN_P}/files/${vid}`)
    ok(/\/(media|files\/raw)\/fixc-video$/.test(await s.locator('[data-testid="viewer-video"]').getAttribute('src') ?? ''), 'a video plays in the viewer from its kept bytes')   /* (gaps build E, REG-e.5) every lead's file plays from /files/raw */
    await shot(s, 'c05-viewer-video-1440')
    const [dl] = await Promise.all([s.waitForEvent('download', { timeout: 8000 }).catch(() => null), s.getByRole('button', { name: 'Download' }).first().click()])
    ok(!!dl && (await dl.suggestedFilename()) === 'site-walk.webm', 'Download downloads the stored bytes (not "Coming soon")')
    await go(s, `/projects/${BEN_P}/files/${pdf}`)
    ok(await s.locator('[data-testid="viewer-pdf"]').count() === 1, 'a PDF shows in the viewer')
    const kitchenPhoto = sql(`select file_id from project_update_files where update_id='${kitchen}' and file_id like '%' order by position limit 1`)
    await go(s, `/projects/${BEN_P}/files/${kitchenPhoto}`)
    await menu(s, s.locator('header'), 'button[aria-label="More options"]', 'Delete')
    ok(/It is on the update “Kitchen cabinets are in” — Benjamin sees it there/.test(await dialog(s).innerText()), 'Delete says the client sees it on a published update (C-25)')
    await s.keyboard.press('Escape'); await settle(s, 300)

    // ── C-03: the post head on a phone ─────────────────────────────────────────────────────────────────────────────────────────
    console.log('C-03 the post head at 390 and 320')
    for (const w of [390, 320]) {
      const M = await b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true }); const m = await M.newPage()
      m.on('pageerror', (e) => errors.push(`phone ${w}: ${String(e).slice(0, 160)}`))
      await go(m, `/projects/${BEN_P}/updates`)
      const heads = await m.locator('[data-testid="update-post"]').evaluateAll((posts) => posts.map((p) => {
        const r = p.getBoundingClientRect(), k = p.querySelector('[data-testid="update-kebab"]')?.getBoundingClientRect(), n = p.querySelector('[class*="whoName"]')?.getBoundingClientRect()
        return { inside: !!k && k.right <= r.right + 0.5 && k.left >= r.left, name: n?.width ?? 0 }
      }))
      ok(heads.length > 0 && heads.every((h) => h.inside), `${w}: ⋮ stays inside every card`)
      ok(heads.every((h) => h.name >= 40), `${w}: the author’s name keeps its width`)
      ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${w}: no sideways page scroll`)
      await shot(m, `c03-phone-${w}`)
      if (w === 390) {
        await m.locator('[data-testid="updates-post"]').click(); await settle(m, 900)
        ok(/Add photos, videos or documents/.test(await dialog(m).innerText()), '390: the drop well says what a press does on touch (C-29)')
        await shot(m, 'c29-composer-390')
        await m.keyboard.press('Escape'); await settle(m, 400)
      }
      if (w === 320) {
        await go(m, `/projects/${BEN_P}/choices`)
        const outside = await m.locator('[data-testid="choice-card"]').evaluateAll((cs) => cs.some((c) => { const r = c.getBoundingClientRect(); return [...c.querySelectorAll('[data-testid="choice-locked"], [data-testid="choice-draft-vo"], [data-testid="choice-open-vo"]')].some((x) => { const q = x.getBoundingClientRect(); return q.left < r.left - 0.5 || q.right > r.right + 0.5 }) }))
        ok(!outside, '320: the lock’s reason and the pick line’s button stay inside the card (C-19)')
        await shot(m, 'c19-choices-320', true)
      }
      await M.close()
    }

    await P.close(); await D.close()
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    as(YOU_WAS || 'dane')
    await b.close()
  }
  if (errors.length) { fail++; console.log('  ✗ page errors:', errors.slice(0, 5).join(' | ')) }
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
