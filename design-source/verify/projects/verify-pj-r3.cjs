// Projects round 3 (REG-948…) — Updates: the feed and its states, the composer with real uploads (photos · a PDF · a video), Preview as the
// client sees it, a Designer's post In review (View as), Approve, Send back + Resubmit, Edit (and an edit that goes back through review),
// Withdraw + Undo + Publish again, the "client has seen it" refusal, Delete + Undo, the Settings › Projects switch, Files › Site updates, the
// media route (bytes + ranges), the Overview's Latest updates card, the header's Post an update, the listing's Last update column, the
// "No update for n days" reason and the "Needs my review" scope, the bell rows, the Activity lines, and the phone (feed · composer sheet).
// Run against `next start -p 3022` on a FRESH copy of the repaired scratch DB — never local.db. It puts `members.is_you` and the review
// setting back in `finally`; the updates it writes stay in the scratch copy.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-r3.cjs <scratch.db> [shotDir] [base URL]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r3')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3022'
const ROOT = path.join(__dirname, '..', '..', '..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const U = (title) => sql(`select id from project_updates where title='${title.replace(/'/g, "''")}' and deleted_at is null order by created_at desc limit 1`)
const status = (title) => sql(`select status from project_updates where title='${title.replace(/'/g, "''")}' and deleted_at is null order by created_at desc limit 1`)
const MIME = { jpg: 'image/jpeg', pdf: 'application/pdf' }
/** A file of the repo's public folder as a pick (Playwright takes paths or buffers in one call, never both). */
const pub = (f) => ({ name: path.basename(f), mimeType: MIME[f.split('.').pop()] ?? 'application/octet-stream', buffer: fs.readFileSync(path.join(ROOT, 'public', f)) })

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const benjamin = P('P-2026-002'), ryan = P('P-2026-001')
  const benjaminLead = sql(`select lead_id from projects where id='${benjamin}'`)
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await ctx.newPage()
    let where = 'start'
    p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 160)}`))
    p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
    const posts = () => p.locator('[data-testid="update-post"]')
    const post = (title) => posts().filter({ has: p.locator('h3', { hasText: title }) }).first()
    const composer = () => p.locator('[role="dialog"]').filter({ has: p.locator('[data-testid="update-composer"], [data-testid="composer-preview-pane"]') })
    const waitUploads = () => p.waitForFunction(() => !document.querySelector('[data-testid="composer-upload"][data-state="uploading"]'), null, { timeout: 30000 })
    const menu = async (title, item) => { await post(title).locator('[data-testid="update-kebab"]').click(); await p.waitForTimeout(250); await p.getByRole('menuitem', { name: new RegExp(`^${item}`) }).click(); await p.waitForTimeout(700) }

    // ── The feed ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('The feed (Dane, Owner)')
    as('dane')
    await go(`/projects/${benjamin}/updates`)
    /* (simplify S-03 · Q-01, a deliberate change of this rule) Updates is the Client tab's first view */
    ok(await p.getByRole('tab', { name: /^Client/ }).count() === 1, 'the project has a Client tab (Updates is its first view)')
    ok(await posts().count() === Number(sql(`select count(*) from project_updates where project_id='${benjamin}' and deleted_at is null`)), 'Benjamin’s updates, every live one (fix-F’s R77b adds board 3’s water test), newest first')
    ok((await p.locator('h3').allInnerTexts()).some((t) => /, 4 Oct/.test(t) || /day,/.test(t)), 'grouped by day under the day’s head')
    ok(/sent this for review/.test(await post('Feature wall panels have arrived').innerText()) && await post('Feature wall panels have arrived').getByRole('button', { name: 'Approve' }).isVisible(), 'In review: who sent it, and the Owner’s Send back · Approve')
    ok(/Add a close-up of the laminate/.test(await post('Wardrobe carcass is up in the master bedroom').locator('[data-testid="update-reason"]').innerText()), 'Sent back: the reviewer’s reason on the post')
    ok(await post('Kitchen cabinets are in').locator('[data-testid="update-photo"]').count() === 2, 'a published post shows its photos as the house square')
    ok(await post('Kitchen cabinets are in').locator('[data-testid="update-state"]').innerText() === 'PUBLISHED' || /published/i.test(await post('Kitchen cabinets are in').locator('[data-testid="update-state"]').innerText()), 'a published post wears its tag; a band never repeats it as one')
    await shot('feed-1440', true)
    await p.locator('[data-testid="update-chips"]').getByText('In review', { exact: true }).click(); await p.waitForTimeout(300)
    ok(await posts().count() === 1, 'the In review chip keeps the one waiting')
    await p.locator('[data-testid="update-chips"]').getByText('All', { exact: true }).click(); await p.waitForTimeout(300)
    await p.locator('input[aria-label="Search updates"]').fill('laminate'); await p.waitForTimeout(400)
    ok(await posts().count() === 1, 'search reads the words of an update')
    await p.locator('input[aria-label="Search updates"]').fill(''); await p.waitForTimeout(300)

    // ── Compose with real uploads ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Compose with real uploads')
    /* a real one-second WebM made in the page (MediaRecorder), so the poster frame is drawn from a video that plays */
    const webm = await p.evaluate(async () => {
      try {
        const c = document.createElement('canvas'); c.width = 320; c.height = 180
        const g = c.getContext('2d'); let n = 0
        const draw = () => { g.fillStyle = `hsl(${(n++ * 12) % 360} 60% 50%)`; g.fillRect(0, 0, 320, 180) }
        draw(); const t = setInterval(draw, 40)
        const rec = new MediaRecorder(c.captureStream(25), { mimeType: 'video/webm' })
        const parts = []; rec.ondataavailable = (e) => parts.push(e.data)
        const done = new Promise((r) => { rec.onstop = r })
        rec.start(); await new Promise((r) => setTimeout(r, 1000)); rec.stop(); await done; clearInterval(t)
        const buf = new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer())
        let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]); return btoa(s)
      } catch { return null }
    })
    await p.locator('[data-testid="updates-post"]').click(); await p.waitForTimeout(700)
    ok(await composer().isVisible(), 'Post an update opens the composer')
    ok(await p.evaluate(() => !!document.activeElement?.closest('[data-testid="update-composer"]') && document.activeElement.tagName === 'INPUT'), 'the caret is in the title (REG-224)')
    ok(/Once it’s posted, Benjamin sees it/.test(await composer().innerText()), 'the head says where an Owner’s post goes')
    await composer().locator('input').first().fill('Bathroom waterproofing is done')
    await composer().locator('[contenteditable="true"]').click()
    await p.keyboard.type('Both bathrooms are sealed and the 24-hour ponding test passed. Tiling starts on Monday.')
    await composer().locator('input[type="file"]:not([data-testid="composer-camera-input"])')   /* (simplify S-23) the camera input is the phone's */.setInputFiles([
      pub('uat-files/sophia-living-room.jpg'), pub('uat-files/kitchen-moodboard.jpg'), pub('uat-files/sophia-floor-plan.pdf'),
      { name: 'site-walk.webm', mimeType: 'video/webm', buffer: webm ? Buffer.from(webm, 'base64') : Buffer.from('not a real video') },
    ])
    await p.waitForTimeout(150)
    ok(await p.locator('[data-testid="composer-upload"]').count() === 4, 'four picks, four rows (several at once)')
    await shot('composer-uploading-1440')
    await waitUploads()
    ok(await p.locator('[data-testid="composer-upload"][data-state="done"]').count() === 4, 'each one uploads for real and lands (✓)')
    const filed = sql(`select count(*) from lead_files f join lead_files d on d.id = f.parent_id join lead_file_images i on i.file_id = f.id where f.lead_id='${benjaminLead}' and d.name='Site updates' and f.name in ('sophia-living-room.jpg','kitchen-moodboard.jpg','sophia-floor-plan.pdf','site-walk.webm')`)
    ok(filed === '4', 'all four are files of the lead’s, in Files › Site updates, with their bytes kept beside them')
    ok(sql(`select kind || ':' || coalesce(mime,'') from lead_files where lead_id='${benjaminLead}' and name='site-walk.webm'`) === 'video:video/webm', 'the video is filed as a video, not a picture')
    if (webm) ok(sql(`select substr(thumb, 1, 15) from lead_files where lead_id='${benjaminLead}' and name='site-walk.webm'`) === 'data:image/jpeg', 'a video carries its first frame as its poster')
    await shot('composer-uploads-1440')
    await p.locator('[data-testid="composer-preview"]').click(); await p.waitForTimeout(400)
    const card = p.locator('[data-testid="client-update"]')
    ok(await card.isVisible() && /from Dane/.test(await card.innerText()) && await card.locator('img').count() === 2, 'Preview: the client’s card — "· from Dane", the title, the photos two across')
    ok(await card.locator('video').count() === 1 && await card.locator('a', { hasText: 'sophia-floor-plan.pdf' }).count() === 1, 'the video plays there and the document opens there')
    await shot('composer-preview-1440')
    await p.getByRole('button', { name: 'Back to edit' }).click(); await p.waitForTimeout(300)
    await p.locator('[data-testid="composer-post"]').click()
    const pulsed = await p.waitForSelector('[data-update-id][data-fresh]', { timeout: 4000 }).then(() => true, () => false)
    await p.waitForTimeout(1200)
    ok(!(await composer().isVisible()), 'Post closes the composer once it lands')
    ok(/Update posted — Benjamin can see it/.test(await snack().innerText()), 'the snackbar says the client can see it')
    ok(status('Bathroom waterproofing is done') === 'published', 'an Owner’s post publishes at once (Q-17)')
    ok(await posts().first().locator('h3').innerText() === 'Bathroom waterproofing is done', 'the new post leads the feed')
    ok(pulsed, 'it is brought into view and pulses once')
    const waterproof = U('Bathroom waterproofing is done')
    ok(sql(`select count(*) from lead_events where project_id='${benjamin}' and kind='project_update_posted' and json_extract(detail,'$.id')='${waterproof}'`) === '1', 'its event is written (project_update_posted)')
    ok(sql(`select count(*) from project_update_files where update_id='${waterproof}'`) === '4', 'it carries its four files, in order')
    await shot('posted-1440')
    /* the media route: a video's bytes with ranges, a document's own bytes */
    /* (fix-C, C-05) the card's video and document open the house viewer (as its photos do); the viewer plays and opens them from the media route */
    const media = await p.evaluate(async (pid) => {
      const v = document.querySelector('[data-update-id] a[aria-label^="Play"]')?.getAttribute('href')
      const d = document.querySelector('[data-testid="update-doc"]')?.getAttribute('href')
      const fid = (h) => (h ? (/\/files\/([^?/]+)/.exec(h)?.[1] ?? null) : null)
      const rv = fid(v) ? await fetch(`/projects/${pid}/media/${fid(v)}`, { headers: { Range: 'bytes=0-99' } }) : null
      const rd = fid(d) ? await fetch(`/projects/${pid}/media/${fid(d)}`) : null
      return { v: !!v && v.startsWith(`/projects/${pid}/files/`), vs: rv?.status, vr: rv?.headers.get('content-range'), ds: rd?.status, dt: rd?.headers.get('content-type') }
    }, benjamin)
    ok(media.v && media.vs === 206 && /^bytes 0-99\//.test(media.vr || ''), 'a video plays from its own bytes — the route answers a range (206)')
    ok(media.ds === 200 && media.dt === 'application/pdf', 'a document opens from its own bytes (application/pdf)')

    // ── Files shows the update's photos ───────────────────────────────────────────────────────────────────────────────────────
    console.log('Files › Site updates')
    const folder = sql(`select id from lead_files where lead_id='${benjaminLead}' and kind='folder' and name='Site updates' and deleted_at is null`)
    await go(`/projects/${benjamin}/files`)
    ok(/Site updates/.test(await p.locator('body').innerText()), 'the project’s Files tab has the Site updates folder')
    await go(`/projects/${benjamin}/files?folder=${folder}`)
    const filesText = await p.locator('body').innerText()
    ok(/sophia-living-room/.test(filesText) && /kitchen-moodboard/.test(filesText) && /living-room-flooring/.test(filesText), 'inside it, the photos every update carried — the new ones and the demo’s (named as a studio names them, fix-C R70b)')
    await shot('files-site-updates-1440')
    await go(`/projects/${benjamin}/updates`)
    await post('Bathroom waterproofing is done').locator('[data-testid="update-photo"]').first().click(); await p.waitForTimeout(1500)
    ok(p.url().includes(`/projects/${benjamin}/files/`) && await p.locator('[data-testid="file-viewer"]').isVisible(), 'a photo opens in the project’s file viewer')

    // ── A Designer's post goes In review (View as Germaine) ───────────────────────────────────────────────────────────────────
    console.log('A Designer’s post (View as Germaine)')
    as('germaine')
    await go(`/projects/${benjamin}/updates`)
    ok(/Waiting for an Owner or an Admin/.test(await post('Feature wall panels have arrived').innerText()) && !(await post('Feature wall panels have arrived').getByRole('button', { name: 'Approve' }).count()), 'a Designer reads that it waits — no Approve')
    ok(await post('Wardrobe carcass is up in the master bedroom').getByRole('button', { name: 'Resubmit' }).isVisible(), 'her sent-back update offers Resubmit')
    await p.locator('[data-testid="updates-post"]').click(); await p.waitForTimeout(700)
    ok(/An Owner or an Admin checks it before Benjamin sees it/.test(await composer().innerText()) && /Send for review/.test(await p.locator('[data-testid="composer-post"]').innerText()), 'her composer says it is checked first — Send for review')
    await composer().locator('input').first().fill('Skirting is fixed')
    await composer().locator('input[type="file"]:not([data-testid="composer-camera-input"])')   /* (simplify S-23) the camera input is the phone's */.setInputFiles([pub('uat-files/fluted-panel.jpg')])
    await waitUploads()
    await p.locator('[data-testid="composer-post"]').click(); await p.waitForTimeout(1600)
    ok(/Sent for review/.test(await snack().innerText()) && status('Skirting is fixed') === 'in_review', 'a Designer’s post goes In review')
    const skirting = U('Skirting is fixed')
    ok(sql(`select group_concat(member_id) from (select member_id from notifications where kind='update_review' and href like '%${skirting}%' order by member_id)`) === 'dane,huimin', 'the bell tells the approvers — the Owner and the Admin')
    await shot('designer-in-review-1440')

    // ── Approve (Dane) ────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Approve')
    as('dane')
    await go(`/projects/${benjamin}/updates?open=${skirting}`)
    await p.waitForTimeout(900)
    ok(!p.url().includes('open='), '?open= lands on the post, then leaves the address')
    await post('Skirting is fixed').getByRole('button', { name: 'Approve' }).click(); await p.waitForTimeout(1400)
    ok(status('Skirting is fixed') === 'published' && sql(`select reviewed_by || ':' || published_by from project_updates where id='${skirting}'`) === 'dane:dane', 'Approve publishes it, with who reviewed and when')
    ok(sql(`select count(*) from notifications where kind='update_approved' and member_id='germaine' and href like '%${skirting}%'`) === '1', 'the author hears it is published')
    ok(/Approved by Dane/.test(await post('Skirting is fixed').innerText()), 'the post says who approved it')

    // ── Send back + Resubmit ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Send back + Resubmit')
    await post('Feature wall panels have arrived').getByRole('button', { name: 'Send back' }).click(); await p.waitForTimeout(500)
    const dlg = p.locator('[role="dialog"][aria-label="Send back"]')
    ok(await dlg.isVisible(), 'Send back asks why')
    ok(await dlg.getByRole('button', { name: 'Send back' }).isDisabled(), 'the button waits for a reason')
    await dlg.locator('input').fill('Show the panels against the wall they go on')
    await shot('send-back-1440')
    await dlg.getByRole('button', { name: 'Send back' }).click(); await p.waitForTimeout(1400)
    ok(status('Feature wall panels have arrived') === 'sent_back' && /Show the panels against the wall/.test(await post('Feature wall panels have arrived').innerText()), 'it goes back with its reason on the post')
    ok(sql(`select count(*) from notifications where kind='update_sent_back' and member_id='germaine' and body like 'Show the panels%'`) === '1', 'the author hears why')
    as('germaine')
    await go(`/projects/${benjamin}/updates`)
    await post('Feature wall panels have arrived').getByRole('button', { name: 'Resubmit' }).click(); await p.waitForTimeout(1400)
    ok(status('Feature wall panels have arrived') === 'in_review' && sql(`select coalesce(review_note,'') from project_updates where id='${U('Feature wall panels have arrived')}'`) === '', 'Resubmit sends it again — the reason answered')
    ok(sql(`select count(*) from lead_events where kind='project_update_submitted' and json_extract(detail,'$.again') = 1 and json_extract(detail,'$.id')='${U('Feature wall panels have arrived')}'`) === '1', 'its event says it was sent again')

    // ── Edit ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Edit')
    await menu('Skirting is fixed', 'Edit')
    /* (fix-C, C-01 — REG-501's rule for a published thing) the change is reviewed, the client keeps the published words meanwhile */
    ok(/Your change waits for review — Benjamin keeps reading the published update/.test(await composer().innerText()) && /Save and send for review/.test(await p.locator('[data-testid="composer-post"]').innerText()), 'a Designer editing a published update is told the change waits for review — the client keeps the published one')
    await composer().locator('input').first().fill('Skirting is fixed in every room')
    await p.locator('[data-testid="composer-post"]').click(); await p.waitForTimeout(1500)
    ok(status('Skirting is fixed') === 'published' && sql(`select json_extract(pending,'$.title') from project_updates where id='${skirting}'`) === 'Skirting is fixed in every room', '…the change is held for review (Q-17) and the published update stays with the client (fix-C, C-01)')
    as('dane')
    await go(`/projects/${benjamin}/updates`)
    await menu('Kitchen cabinets are in', 'Edit')
    ok(/Benjamin sees the change at once/.test(await composer().innerText()), 'an Owner’s edit to a published update shows at once')
    await composer().locator('input').first().fill('Kitchen cabinets are in and levelled')
    await p.locator('[data-testid="composer-post"]').click(); await p.waitForTimeout(1500)
    ok(status('Kitchen cabinets are in and levelled') === 'published' && /Edited/.test(await post('Kitchen cabinets are in and levelled').innerText()), 'it stays published and says Edited')

    // ── Withdraw + Undo + Publish again; the client has seen it ──────────────────────────────────────────────────────────────
    console.log('Withdraw')
    const kitchen = U('Kitchen cabinets are in and levelled')
    await menu('Kitchen cabinets are in and levelled', 'Withdraw')
    ok(status('Kitchen cabinets are in and levelled') === 'withdrawn' && /Withdrawn — Benjamin no longer sees/.test(await snack().innerText()), 'Withdraw takes it off the client’s view, with an Undo')
    await shot('withdrawn-1440')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1400)
    ok(status('Kitchen cabinets are in and levelled') === 'published' && sql(`select count(*) from lead_events where kind='project_update_withdrawn' and json_extract(detail,'$.id')='${kitchen}'`) === '0', 'Undo puts it back as published — and its line goes')
    await menu('Kitchen cabinets are in and levelled', 'Withdraw')
    await p.waitForTimeout(400)
    await post('Kitchen cabinets are in and levelled').getByRole('button', { name: 'Publish again' }).click(); await p.waitForTimeout(1400)
    ok(status('Kitchen cabinets are in and levelled') === 'published', 'a withdrawn update publishes again (1.0 had no way back)')
    sql(`update project_updates set client_opened_at = cast(strftime('%s','now') as integer) + 5 where id='${kitchen}'`)
    await go(`/projects/${benjamin}/updates`)
    await post('Kitchen cabinets are in and levelled').locator('[data-testid="update-kebab"]').click(); await p.waitForTimeout(300)
    const wd = p.getByRole('menuitem', { name: /^Withdraw/ })
    ok(await wd.getAttribute('aria-disabled') === 'true' && /already seen it/.test(await wd.innerText()), 'once the client has opened it, Withdraw says why it can’t')
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    ok(/Seen by Benjamin/.test(await post('Kitchen cabinets are in and levelled').innerText()), 'the post says the client has seen it — "Seen by Benjamin {when}" since round 4b')

    // ── A draft, deleted and brought back ────────────────────────────────────────────────────────────────────────────────────
    console.log('Draft + Delete')
    await p.locator('[data-testid="updates-post"]').click(); await p.waitForTimeout(600)
    await composer().locator('input').first().fill('Electrical points marked')
    await p.locator('[data-testid="composer-draft"]').click(); await p.waitForTimeout(1400)
    ok(status('Electrical points marked') === 'draft' && /only the studio sees it/.test(await post('Electrical points marked').innerText()), 'Save draft keeps it to the studio')
    await menu('Electrical points marked', 'Delete')
    ok(sql(`select count(*) from project_updates where title='Electrical points marked' and deleted_at is not null`) === '1' && /Update deleted/.test(await snack().innerText()), 'Delete removes a draft, with an Undo')
    await snack().getByRole('button', { name: 'Undo' }).click(); await p.waitForTimeout(1400)
    ok(status('Electrical points marked') === 'draft', 'Undo brings it back')
    await post('Bathroom waterproofing is done').locator('[data-testid="update-kebab"]').click(); await p.waitForTimeout(300)
    const del = p.getByRole('menuitem', { name: /^Delete/ })
    ok(await del.getAttribute('aria-disabled') === 'true' && /Withdraw it first/.test(await del.innerText()), 'a published update is never deleted — its Delete says Withdraw it first')

    // ── The composer asks before it drops what was typed ─────────────────────────────────────────────────────────────────────
    await p.keyboard.press('Escape'); await p.waitForTimeout(200)
    await p.locator('[data-testid="updates-post"]').click(); await p.waitForTimeout(600)
    await composer().locator('input').first().fill('Half written')
    await composer().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(400)
    ok(await p.locator('[role="dialog"][aria-label="Discard this update?"]').isVisible(), 'Cancel with something typed asks first')
    await p.getByRole('button', { name: 'Discard' }).click(); await p.waitForTimeout(500)
    ok(!(await composer().isVisible()) && sql(`select count(*) from project_updates where title='Half written'`) === '0', 'Discard closes it and keeps nothing')

    // ── Settings › Projects › Updates ───────────────────────────────────────────────────────────────────────────────────────
    console.log('Settings › Projects')
    await go('/settings?section=projects')
    const row = p.locator('[data-testid="update-review-row"]')
    ok(await row.isVisible() && /Owners and Admins/.test(await row.innerText()), 'the rule on the event table, who reviews, its switch')
    await shot('settings-1440')
    await row.locator('label').first().click(); await p.waitForTimeout(1200)
    ok(sql(`select value from settings where key='project_update_review'`) === '{"on":false}', 'switched off, it saves at once')
    as('germaine')
    await go(`/projects/${benjamin}/updates`)
    await p.locator('[data-testid="updates-post"]').click(); await p.waitForTimeout(600)
    ok((await p.locator('[data-testid="composer-post"]').innerText()).trim() === 'Post', 'with review off, a Designer’s button says Post')
    await composer().locator('input').first().fill('Ceiling boards are up')
    await p.locator('[data-testid="composer-post"]').click(); await p.waitForTimeout(1500)
    ok(status('Ceiling boards are up') === 'published', '…and her post reaches the client at once')
    as('dane')
    await go('/settings?section=projects')
    await p.locator('[data-testid="update-review-row"] label').first().click(); await p.waitForTimeout(1200)
    ok(sql(`select value from settings where key='project_update_review'`) === '{"on":true}', 'switched back on')
    as('germaine')
    await go('/settings?section=projects')
    ok(await p.locator('[data-testid="update-review-row"] input').first().isDisabled(), 'a Designer reads the rule but can’t switch it')
    as('dane')

    // ── The Overview, the header's action, the listing, the bell, Activity ───────────────────────────────────────────────────
    console.log('Overview · listing · bell · Activity')
    await go(`/projects/${benjamin}`)
    /* (simplify S-01 · S-20, a deliberate change of this rule) Latest updates folded into With Benjamin ("Last told Benjamin … — “title”" · Post an
       update) and Needs you (an update In review is a Needs your OK row, approved in place) */
    const latest = p.locator('[data-testid="with-last-told"]')
    ok(await latest.isVisible() && /Last (told|update to) Benjamin/.test(await latest.innerText())   /* (the calm UI build 2026-10-27, a deliberate change) the hold's reason is said once — on its Needs your attention row (3-31); "Last update to …" (W-537) */, 'With Benjamin: when he was last told, and what')
    ok(await p.locator('[data-testid="need-review-update"]').count() >= 1 && /Approvals|Needs your OK/.test(await p.locator('section[data-card="needs"]').innerText())   /* (the calm UI build 2026-10-27, a deliberate change) the group is "Approvals" (3-07 · T-01) */, 'an update In review is a Needs your OK row')
    await shot('overview-1440')
    /* (simplify S-02 · Q-03, a deliberate change of this rule) the header's one action is the top row — approvals before telling the client; the
       unshared changes are a row of their own */
    { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }   // past six rows they rest under Show n more
    ok((await p.locator('[data-testid="project-primary"]').innerText()).trim() === 'Review the update' && await p.locator('[data-testid="need-share"]').count() === 1, 'Benjamin: the header reviews the update first; Share is a row')
    await go(`/projects/${ryan}`)
    await p.locator('[data-testid="with-post"]').click(); await p.waitForTimeout(2200)   // (simplify S-01) With Ryan's Post an update
    ok(p.url().includes('/updates') && await composer().isVisible(), '…which opens the Updates tab with its composer open')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    await go(`/projects/${benjamin}`)
    await latest.locator('a').first().click(); await p.waitForTimeout(1800)
    ok(p.url().includes(`/projects/${benjamin}/updates`), 'the Last told row lands on its update')
    await go('/projects')
    ok(await p.locator('[role="columnheader"][data-col="lastUpdate"]').count() === 1, 'the listing has a Last update column')
    const ryanRow = p.locator('[data-kb-row]').filter({ hasText: 'Ryan' }).first()
    await go(`/projects/${ryan}`)   // the row shows its weightiest reason (a late milestone); the Status card lists them all
    /* (simplify Q-09, a deliberate change of this rule) a running project quiet for 6+ days offers the week's update as a Needs you row — red at 14 */
    { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
    ok(/Send Ryan this week’s update|Tell Ryan about this week/.test(await p.locator('[data-testid="need-week-update"]').innerText())   /* (the calm UI build 2026-10-27, a deliberate change) plain words (1-08 · W-398 · W-426 · W-278 · 3-37) */ && /\d+ days ago/.test(await p.locator('[data-testid="need-week-update"]').innerText()), 'a running project quiet for two weeks: "Tell Ryan about this week · Last update n days ago"')
    await go('/projects')
    const benRow = p.locator('[data-kb-row]').filter({ hasText: 'Benjamin' }).first()
    ok(/ago|just now/.test(await benRow.locator('[data-col="lastUpdate"]').innerText()), 'Benjamin’s Last update reads its newest publish')
    await p.getByRole('button', { name: /^Open projects/ }).click(); await p.waitForTimeout(300)
    await p.getByRole('menuitemradio', { name: /Needs my review/ }).click(); await p.waitForTimeout(500)
    /* (simplify S-20, a deliberate change of this rule) Needs my review counts every kind an Owner approves — POs, expenses and the schedule's
       asks join the updates — so other projects may wait too; Benjamin's (the update in review) is among them */
    ok(await p.locator('[data-kb-list="project"] [data-kb-row]').count() >= 1 && (await p.locator('[data-kb-list="project"] [data-kb-row]').allInnerTexts()).some((t) => /Benjamin/.test(t) && /update.? to review/.test(t)) && p.url().includes('scope=review'), 'the "Needs my review" to-do scope keeps the project with an update waiting for me, and says so on its row')
    await shot('listing-review-1440')
    await p.locator('[data-notifications-tile]').first().click(); await p.waitForTimeout(800)
    ok(/sent an update for your review/.test(await p.locator('[data-testid="notifications-panel"]').innerText()), 'the bell lists the update waiting for review')
    await p.locator('[data-testid="notification-row"]', { hasText: 'sent an update for your review' }).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300)
    await shot('bell-1440')
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
    await go(`/projects/${benjamin}/activity`)
    const act = await p.locator('[data-testid="activity-feed"]').innerText()
    ok(/approved the update “Skirting is fixed/.test(act) && /sent the update “Feature wall panels have arrived” back/.test(act) && /withdrew the update/.test(act), 'Activity carries every step of an update, with its actor')
    ok(Number(sql(`select count(*) from lead_events where kind like 'project_update_%' and project_id='${benjamin}'`)) >= 12, 'every step wrote its event')
    await go(`/projects/${ryan}/updates`)
    ok(await posts().count() === 1 && /Approved by Hui Min/.test(await posts().first().innerText()), 'Ryan’s one update, approved by the Admin')
    /* (simplify round 2 — Q-09 · P2 §6.11, a deliberate change of this rule) Draft it lands IN the composer on the week's saved draft (it used to
       land on the draft's card) — the row and the header the same door (`updates?draft=week`) */
    await go(`/projects/${ryan}`)
    { const more = p.locator('[data-testid="needs-more"]'); if (await more.count() && /Show \d+ more/.test(await more.innerText())) { await more.click(); await p.waitForTimeout(300) } }
    await p.locator('[data-testid="need-week-update"] [data-testid="need-action"]').click(); await p.waitForTimeout(3000)
    ok(p.url().includes(`/projects/${ryan}/updates`) && !p.url().includes('draft=') && await composer().isVisible() && /^This week at your home/.test(await composer().locator('input').first().inputValue()), 'Draft it: the week’s draft opens in the composer as the page reveals')
    ok(sql(`select count(*) from project_updates where project_id='${ryan}' and status='draft' and title like 'This week at your home%' and deleted_at is null`) === '1', '…saved as a draft — nothing sent')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    /* (simplify round 2, S-20 · P2 §6.7) an update's Send back on the Overview opens the Updates tab's own note dialog in place (cancelled here) */
    await go(`/projects/${benjamin}`)
    const reviewRow = p.locator('[data-testid="need-review-update"]').first()
    if (await reviewRow.count()) {
      await reviewRow.locator('[data-testid="need-more"]').click(); await p.waitForTimeout(300)   /* (the calm UI build 2026-10-27, a deliberate change) one verb a row — Send back / Decline is the row's ⋮ (3-05 · 3-22) */
      await p.locator('[data-testid="need-send-back"] [role="menuitem"]').click(); await p.waitForTimeout(500)
      const sb = p.locator('[role="dialog"][aria-label="Send back"]')
      ok(await sb.isVisible() && /reads this on the update; Benjamin never sees it/.test(await sb.innerText()) && !p.url().includes('/updates'), 'the update’s Send back: the Updates tab’s note dialog, on the Overview')
      await sb.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300)
    }
    await ctx.close()

    // ── Phone ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone 390')
    const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const q = await m.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 160)}`))
    await q.goto(`${BASE}/projects/${benjamin}/updates`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= 390), 'no sideways scroll at 390')
    ok(await q.locator('[data-testid="update-post"]').count() >= 6, 'the feed on a phone')
    await q.screenshot({ path: path.join(dir, 'phone-feed-390.png') })
    await q.locator('[data-testid="updates-post"]').click(); await q.waitForTimeout(800)
    const box = await q.locator('[role="dialog"]').filter({ has: q.locator('[data-testid="update-composer"]') }).boundingBox()
    ok(!!box && Math.abs(box.y + box.height - 844) < 2, 'the composer is a bottom sheet on a phone (REG-353)')
    /* (simplify S-23) the phone's post: the photos first, the title filled from the running milestone and the day, that milestone picked */
    const order = await q.locator('[data-testid="update-composer"]').evaluate((f) => { const media = f.querySelector('[data-testid="composer-media"]'); const title = f.querySelector('input:not([type="file"])'); return !!media && !!title && !!(media.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING) })
    ok(order, 'on a phone the photos come before the title (simplify S-23)')
    const running = sql(`select title from project_milestones where project_id='${benjamin}' and status='in_progress' and deleted_at is null order by position limit 1`)
    const titleNow = await q.locator('[data-testid="update-composer"] input:not([type="file"])').first().inputValue()
    ok(!running || titleNow.startsWith(`${running} — `), `the title starts on the running milestone and the day (“${titleNow}”)`)
    await q.screenshot({ path: path.join(dir, 'phone-composer-390.png') })
    await q.goto(`${BASE}/projects/${benjamin}`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    await q.locator('section[data-card="with-client"]').scrollIntoViewIfNeeded()   // (simplify S-01, a deliberate change of this rule) With Benjamin holds the last update
    ok(await q.locator('section[data-card="with-client"]').isVisible(), 'With Benjamin on a phone')
    await q.locator('section[data-card="with-client"]').screenshot({ path: path.join(dir, 'phone-latest-390.png') })
    await m.close()
  } finally {
    as('dane')
    sql(`delete from settings where key='project_update_review'`)
    await b.close()
  }
  ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})()
