// Pending modules, step S01 · Your own profile (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// onboarding:my-profile · api:my-account-profile · the profile lines of held:settings-company and held:shell). Each item asserted as the rule it
// builds, never another round's count:
//  - the rail's studio block leads with you → Your profile; the phone's top-bar avatar is the member you are and opens the same menu (You)
//  - Your profile: your own name, email, phone and photo; Discard · Save changes; the house messages; the leave guard; nobody else's name,
//    email or phone (1.0's checks, the phone's new); the photo saved, shown on every avatar, taken off; a file that is no picture refused
//  - Your signature as its own card: Change through Signature Settings, Remove with Undo
//  - Company › Members: a pencil beside each name — yours opens Your profile (Back to Members), an Owner's / Admin's opens Edit details
//    (refusals in the row, Undo after a save); an Admin can't change an Owner's; a Designer sees only their own
//  - Accounting opens Your profile (no signature card, no Members door); Who may do what has the row; ⌘K finds Your profile and Your signature
//  - one photo: the member's photo is their About portrait; a client's page never carries the studio's picture address
//  - the ghost sits on the page; no sideways scroll at 390 / 320 (against screen.width); no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s01.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s01')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Date.now() - 2000
/* a 4×4 PNG the browser can draw (the field shrinks every picture through a canvas) */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFklEQVR4nGP4z8DwHwyBBAMDA4QBADj+B/k4h1bxAAAAAElFTkSuQmCC', 'base64')

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it */
  const COLS = ['name', 'email', 'phone', 'color', 'portal_photo_id', 'portal_shown', 'portal_title', 'portal_bio', 'signature_kind', 'signature_name', 'signature_data']
  const kept = {}
  for (const id of ['dane', 'sarah', 'germaine', 'huimin', 'priya']) kept[id] = Object.fromEntries(COLS.map((c) => [c, sql(`select quote(${c}) from members where id = '${id}'`)]))
  const you0 = sql(`select id from members where is_you = 1`)
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const field = (p, label) => p.locator('[data-testid="member-details"]').getByLabel(label, { exact: false }).first()
  const undoPress = (p) => snack(p).getByRole('button', { name: 'Undo' }).click()
  /* (the calm UI build 2026-10-27, a deliberate change) B5 5-01: a Members row's pencil and Public profile moved into the row's ⋮ ("More for …"),
     each keeping its handle on its menu row (member-edit · member-your-profile · member-about) — open the row's ⋮, then the row; the menu is a
     portal, so the row is found on the page. A row with nothing in its ⋮ draws no ⋮. */
  const memberMenu = async (p, id) => { await p.keyboard.press('Escape').catch(() => {}); const more = p.locator(`[data-member-id="${id}"] [data-testid="member-more"]`).first(); if (await more.count()) { await more.click(); await settle(p, 500) } return p }
  const memberItem = async (p, id, testId) => { await memberMenu(p, id); return p.locator(`[role="menu"] [data-testid="${testId}"]`).first() }
  const menuItemOf = (row) => row.locator('[role^="menuitem"]').first()

  try {
    as('dane')
    // ── 1 · the way in: the rail's studio block ───────────────────────────────────────────────────────────────────────────────
    console.log('1 · The studio block')
    const D = await desk(); const d = await page(D, 'dane')
    await go(d, '/leads')
    await d.getByRole('button', { name: /^Demo Studio/ }).click(); await settle(d, 500)
    const menu = d.getByRole('menu', { name: 'View as' })
    /* (pending modules, a deliberate change of this rule — S30 put Sign out in the You group, a menu row of its own: the profile row by its id) */
    const you = menu.getByRole('group', { name: 'You' }).getByTestId('open-profile')
    ok(await you.count() === 1 && /Dane/.test(await you.innerText()) && /Your profile/.test(await you.innerText()), 'the menu leads with you — Dane · Your profile')
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-40) then the Demo fold — View as under it, one press */
    ok(await menu.getByTestId('demo-fold').count() === 1, '…then the Demo fold')
    await menu.getByTestId('demo-fold').click(); await settle(d, 300)
    ok(await menu.getByRole('group', { name: 'Members' }).getByRole('menuitemradio').count() >= 2, '…View as inside it, as before')
    const mb = await menu.boundingBox()
    ok(!!mb && mb.y >= 0 && mb.y + mb.height <= 1024, `the menu stays inside the window (${mb ? Math.round(mb.y) + '…' + Math.round(mb.y + mb.height) : '?'})`)
    await shot(d, 's01-01-menu-1440')
    await you.click(); await d.waitForURL(/\/profile$/, { timeout: 10000 }).catch(() => {}); await settle(d, 1200)
    ok(new URL(d.url()).pathname === '/profile', 'Your profile opens')
    ok(await d.getByRole('heading', { level: 1, name: 'Your profile' }).count() === 1 && await d.locator('a[data-kb="back"]').count() === 0, 'an L1 page — the rail reached it, so no Back')
    ok(/You’re an Owner at Demo Studio/.test(await d.getByTestId('profile-role').getAttribute('aria-label')) && /^Owner$/.test((await d.getByTestId('profile-role').innerText()).trim()), 'the role: an Owner chip by the title, the sentence its name and tooltip')   // (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-29)
    const save = d.getByTestId('profile-save')
    ok(await save.isDisabled() && await d.getByRole('button', { name: 'Discard' }).isDisabled(), 'Discard · Save changes rest until something changes')
    await shot(d, 's01-02-profile-1440', true)

    // ── 2 · your details: the house messages, Discard, the rules, a save ──────────────────────────────────────────────────────
    console.log('2 · Your details')
    await field(d, 'Name').fill('Dane Probe')
    ok(!(await save.isDisabled()), 'an edit wakes Save changes')
    await d.getByRole('button', { name: 'Discard' }).click(); await settle(d, 300)
    ok(await field(d, 'Name').inputValue() === 'Dane' && await save.isDisabled(), 'Discard puts the name back')
    await field(d, 'Name').fill('')
    await save.click(); await settle(d, 400)
    ok(await d.locator('[data-testid="member-details"]').getByText('Fill this in to continue.').count() + await d.locator('[data-testid="member-details"] [data-error]').count() > 0, 'a blank name is the house message, nothing saved')
    ok(sql(`select name from members where id='dane'`) === 'Dane', '…and the record is as it was')
    await field(d, 'Name').fill('Dane')
    await field(d, 'Email').fill('sarah@demostudio.sg')
    await save.click(); await settle(d, 1200)
    ok(/Couldn’t save your details — another member has that email/i.test(await snackText(d)), `another member’s email is refused in the rule’s words ("${await snackText(d)}")`)
    ok(sql(`select email from members where id='dane'`) === 'dane@demostudio.sg', '…and nothing changed')
    const sarahPhone = sql(`select phone from members where id='sarah'`)
    await field(d, 'Email').fill('dane@demostudio.sg')
    await field(d, 'Phone').fill(sarahPhone)
    await save.click(); await settle(d, 1200)
    ok(/another member has that phone number/i.test(await snackText(d)), 'another member’s phone is refused — 2.0 never checked it before')
    await field(d, 'Phone').fill('1234')
    await save.click(); await settle(d, 400)
    ok(await d.locator('[data-testid="member-details"] [data-error]').count() > 0 && sql(`select coalesce(phone,'') from members where id='dane'`) === '', 'a phone that is no Singapore number: the field says so, nothing saved')
    await field(d, 'Phone').fill('91112222')
    await field(d, 'Name').fill('dane probe')
    await save.click(); await settle(d, 1200)
    /* (pending modules, a deliberate change of this rule — S30: a new mobile is the number you sign in with, so its code confirms it first —
       S01's own note, "a phone change sends no confirmation code until sign-in exists") */
    const confirm = d.getByRole('dialog', { name: 'Confirm your new number' })
    ok(await confirm.count() === 1 && sql(`select coalesce(phone,'') from members where id='dane'`) === '', 'a new mobile asks for the code sent to it before it saves (S30)')
    await d.getByTestId('confirm-contact-digit').first().click(); await d.keyboard.type('123456')
    await confirm.getByRole('button', { name: 'Confirm and save' }).click(); await settle(d, 1600)
    ok(/Your details are saved/.test(await snackText(d)), 'Save changes: "Your details are saved"')
    ok(sql(`select name || '|' || phone from members where id='dane'`) === 'Dane Probe|91112222', 'the name is saved title-cased, the phone as its 8 digits')
    ok(await save.isDisabled(), 'the form rests again')
    await go(d, '/company/members')
    ok(/Dane Probe/.test(await d.locator('[data-member-id="dane"]').innerText()), 'the new name shows wherever the member does — Company › Members')

    // ── 3 · the photo: picked, saved, on every avatar, taken off; no picture refused ─────────────────────────────────────────
    console.log('3 · The photo')
    await go(d, '/profile')
    await d.getByTestId('member-photo-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') }); await settle(d, 500)
    ok(/That photo didn’t read — pick a JPG or PNG under 2 MB/.test(await d.locator('[role="alert"]').first().innerText().catch(() => '')) && await save.isDisabled(), 'a file that is no picture is refused under the row, the form unchanged')
    await d.getByTestId('member-photo-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG }); await settle(d, 800)
    ok(await d.getByTestId('member-photo-shown').count() === 1 && !(await save.isDisabled()), 'a picture shows in the row and wakes Save changes')
    await save.click(); await settle(d, 1800)
    const pic = sql(`select substr(color, 7, instr(color, '|') - 7) from members where id='dane' and color like 'photo:%|%'`)
    ok(!!pic && sql(`select color from members where id='dane'`) === `photo:${pic}|#5B7FD7` && sql(`select portal_photo_id from members where id='dane'`) === pic, 'saved: the look carries the photo over the tint, the About portrait is the same picture')
    ok(sql(`select kind || '|' || member_id from studio_pictures where id='${pic}'`) === 'member|dane', '…kept as a picture of Dane’s')
    const r = await d.request.get(`${BASE}/company/picture/${pic}`)
    ok(r.status() === 200 && /^image\//.test(r.headers()['content-type'] ?? ''), 'its address answers with the picture')
    await go(d, '/company/members')
    ok(await d.locator(`[data-member-id="dane"] img[src="/company/picture/${pic}"]`).count() === 1, 'Members: Dane’s avatar is his photo')
    await go(d, '/leads')
    ok(await d.locator(`img[src="/company/picture/${pic}"]`).count() >= 1, 'the listing’s avatars show it')
    await shot(d, 's01-03-photo-on-listing-1440')
    await go(d, '/profile')
    await d.getByRole('button', { name: 'Take it off' }).click(); await settle(d, 300)
    await save.click(); await settle(d, 1600)
    ok(sql(`select color || '|' || coalesce(portal_photo_id, '-') from members where id='dane'`) === '#5B7FD7|-', 'Take it off · Save: back to his tint, the About portrait gone with it')

    // ── 4 · the leave guard ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Unsaved edits ask first')
    await field(d, 'Email').fill('dane.probe@demostudio.sg')
    await d.locator('nav[aria-label="Workspace"] a[href^="/tasks"]').first().click(); await settle(d, 600)
    const guard = d.getByRole('alertdialog', { name: 'Save your changes?' }).or(d.getByRole('dialog', { name: 'Save your changes?' }))
    ok(await guard.count() === 1, 'leaving with an edit asks "Save your changes?"')
    await guard.getByRole('button', { name: 'Keep editing' }).click(); await settle(d, 400)
    ok(new URL(d.url()).pathname === '/profile' && await field(d, 'Email').inputValue() === 'dane.probe@demostudio.sg', 'Keep editing stays with the edit')
    await d.getByRole('button', { name: 'Discard' }).click(); await settle(d, 300)

    // ── 5 · Your signature: Change, Remove, Undo ─────────────────────────────────────────────────────────────────────────────
    console.log('5 · Your signature')
    const sigCard = d.getByTestId('profile-signature')
    ok(await sigCard.count() === 1 && sql(`select signature_kind from members where id='dane'`) === 'type', 'its own card, showing the typed signature Dane has')
    await d.getByTestId('signature-change').click(); await settle(d, 500)
    const dlg = d.getByRole('dialog', { name: 'Signature Settings' })
    ok(await dlg.count() === 1, 'Change opens Signature Settings — the quote editor’s own dialog')
    await dlg.getByLabel(/Designer Name/).fill('Dane P.')
    await dlg.getByRole('button', { name: 'Save' }).click(); await settle(d, 1400)
    ok(await dlg.count() === 0 && sql(`select signature_name from members where id='dane'`) === 'Dane P.', 'Save lands it and the dialog closes')
    await d.getByTestId('signature-remove').click(); await settle(d, 1200)
    ok(/Signature removed/.test(await snackText(d)) && sql(`select coalesce(signature_kind, '-') from members where id='dane'`) === '-', 'Remove: one sentence and Undo; the record has none')
    ok(await sigCard.getByRole('button', { name: 'Draw' }).count() === 1, '…and the card offers Draw · Type · Upload')
    await shot(d, 's01-04-signature-removed-1440')
    await undoPress(d); await settle(d, 1400)
    ok(sql(`select signature_kind || '|' || signature_name from members where id='dane'`) === 'type|Dane P.', 'Undo puts the signature back as it was')

    // ── 6 · Company › Members: the pencil — yours opens Your profile, anyone else's Edit details ──────────────────────────────
    console.log('6 · Company › Members')
    await go(d, '/company/members')
    await (await memberItem(d, 'dane', 'member-your-profile')).click()
    await d.waitForURL(/\/profile\?from=/, { timeout: 10000 }).catch(() => {}); await settle(d, 1200)
    const back = d.locator('a[data-kb="back"]')
    ok(await back.count() === 1 && /Back to Members/.test(await back.getAttribute('aria-label')), 'your own pencil opens Your profile, Back to Members')
    await shot(d, 's01-05-profile-from-members-1440')
    await back.click(); await d.waitForURL(/\/company\/members/, { timeout: 10000 }).catch(() => {}); await settle(d, 1000)
    ok(new URL(d.url()).pathname === '/company/members', 'Back returns to Members')
    await (await memberItem(d, 'sarah', 'member-edit')).click(); await settle(d, 600)
    const ed = d.getByTestId('member-edit-dialog')
    ok(await d.getByRole('dialog', { name: 'Edit Sarah’s details' }).count() === 1, 'Sarah’s pencil opens Edit Sarah’s details')
    const germainePhone = sql(`select phone from members where id='germaine'`)
    await ed.getByLabel('Phone').fill(germainePhone)
    await d.getByTestId('member-edit-save').click(); await settle(d, 1200)
    ok(/another member has that phone number/i.test(await snackText(d)) && await ed.count() === 1, 'Germaine’s phone is refused; the dialog stays with what was typed')
    await ed.getByLabel('Phone').fill('98837543')
    await ed.getByLabel('Name').fill('Sarah Ong')
    await ed.getByTestId('member-photo-input').setInputFiles({ name: 'sarah.png', mimeType: 'image/png', buffer: PNG }); await settle(d, 700)
    await shot(d, 's01-06-edit-dialog-1440')
    await d.getByTestId('member-edit-save').click(); await settle(d, 1800)
    ok(await ed.count() === 0 && /Sarah Ong’s details are saved/.test(await snackText(d)), 'Save: the dialog closes once it lands; "Sarah Ong’s details are saved"')
    const sarahPic = sql(`select substr(color, 7, instr(color, '|') - 7) from members where id='sarah' and color like 'photo:%|%'`)
    ok(sql(`select name || '|' || phone from members where id='sarah'`) === 'Sarah Ong|98837543' && !!sarahPic, '…the name, the phone and her photo saved')
    await undoPress(d); await settle(d, 1600)
    ok(sql(`select name || '|' || phone || '|' || color from members where id='sarah'`) === `Sarah|${sarahPhone}|#3E9B63`, 'Undo saves her details back — the photo off again')

    // ── 7 · one photo: the About portrait; a client's page never carries the studio's picture address ─────────────────────────
    console.log('7 · One photo, and the client’s pages')
    await (await memberItem(d, 'germaine', 'member-edit')).click(); await settle(d, 600)
    await d.getByTestId('member-edit-dialog').getByTestId('member-photo-input').setInputFiles({ name: 'germaine.png', mimeType: 'image/png', buffer: PNG }); await settle(d, 700)
    await d.getByTestId('member-edit-save').click(); await settle(d, 1800)
    const gPic = sql(`select portal_photo_id from members where id='germaine'`)
    ok(!!gPic && sql(`select color from members where id='germaine'`).startsWith(`photo:${gPic}|`), 'Germaine’s photo is her avatar and her About portrait')
    /* (pending modules S27, a deliberate change of this rule) the About page dialog became the member's Public profile — a page, opened from the row */
    await (await memberItem(d, 'germaine', 'member-about')).click(); await d.waitForURL(/\/company\/members\/germaine\/profile/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(await d.locator('[data-testid="public-profile"] img[src="/company/picture/' + gPic + '"]').count() >= 1, 'Members › Public profile shows the same photo')
    await go(d, '/company/members')
    const C = await desk(); const c = await page(C, 'portal')
    await go(c, '/my/demo-studio/login')
    await c.locator('input[type="tel"]').fill('97731968')
    await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
    await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
    await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1400)
    for (const at of ['/my/demo-studio/about', '/my/demo-studio/messages', '/my/demo-studio']) {
      await go(c, at)
      ok(!(await c.content()).includes('/company/picture/'), `${at}: no studio picture address on the client’s page`)
    }
    await go(c, '/my/demo-studio/about')
    const portrait = c.locator('[data-testid="about-member"]').filter({ hasText: 'Germaine' }).locator('img[class*="__portrait"]')   // (pending modules S27, a deliberate change of this rule) the card carries their work's pictures too
    const src = await portrait.getAttribute('src').catch(() => null)
    ok(!!src && src.includes(`/about/picture/${gPic}`), 'About › Our team: Germaine’s portrait is her photo, through the portal’s own address')
    if (src) { const pr = await c.request.get(BASE + src); ok(pr.status() === 200, '…which answers with it') }
    await shot(c, 's01-07-portal-about-1440', true)
    await C.close()

    // ── 8 · an Admin, a Designer, Accounting ──────────────────────────────────────────────────────────────────────────────────
    console.log('8 · Hui Min (Admin), Germaine (Designer), Priya (Accounting)')
    as('huimin')
    await go(d, '/company/members')
    /* (the calm UI build 2026-10-27, a deliberate change) B5 5-01: the refused pencil is the ⋮'s greyed "Edit details", its reason in the row (the house rule for a refused choice) */
    const owner = menuItemOf(await memberItem(d, 'dane', 'member-edit'))
    ok(await owner.getAttribute('aria-disabled') === 'true' && /Only an Owner changes an Owner’s details/.test(await owner.innerText().catch(() => '')), 'an Admin: the Owner’s pencil says why — only an Owner changes an Owner’s details')
    await owner.click({ force: true }); await settle(d, 400)
    ok(await d.getByTestId('member-edit-dialog').count() === 0, '…and opens nothing')
    ok(await menuItemOf(await memberItem(d, 'sarah', 'member-edit')).getAttribute('aria-disabled') === null, '…while a Designer’s opens')
    /* (pending modules S27, a deliberate change of this rule) the About page dialog is the member's Public profile page now */
    await (await memberItem(d, 'dane', 'member-about')).click(); await d.waitForURL(/\/company\/members\/dane\/profile/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    ok(/Only an Owner changes an Owner’s details/.test(await d.getByTestId('member-photo-locked').innerText().catch(() => '')) && await d.locator('[data-testid="public-profile"] [data-testid="card-photo"]').count() === 0, '…and the Public profile keeps the Owner’s photo the same way (it is his avatar too)')
    as('germaine')
    await go(d, '/company/members')
    /* (the calm UI build 2026-10-27, a deliberate change) B5 5-01: read in each row's ⋮ — no other member's carries Edit details; her own carries Your profile */
    const others = (await d.locator('[data-testid="member-row"]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-member-id')))).filter((x) => x && x !== 'germaine')
    let pencils = 0
    for (const id of others) { await memberMenu(d, id); pencils += await d.locator('[role="menu"] [data-testid="member-edit"]').count(); await d.keyboard.press('Escape'); await settle(d, 200) }
    ok(pencils === 0 && await (await memberItem(d, 'germaine', 'member-your-profile')).count() === 1, 'a Designer: no pencil on anyone else’s row, their own opens Your profile')
    await d.keyboard.press('Escape'); await settle(d, 200)
    ok(/change another member’s details/.test(await d.locator('main').innerText()), 'the read-only note names the details')
    await go(d, '/profile')
    ok(/Germaine/.test(await field(d, 'Name').inputValue()) && /a Designer at Demo Studio/.test(await d.getByTestId('profile-role').getAttribute('aria-label')), 'Germaine’s Your profile is hers — a Designer at Demo Studio')
    as('priya')
    await go(d, '/profile')
    ok(await d.getByTestId('your-profile').count() === 1 && await d.locator('[data-testid="route-error"], [data-testid="access-gate"]').count() === 0, 'Accounting opens Your profile')
    ok(await d.getByTestId('profile-signature').count() === 0 && await d.getByTestId('profile-members-link').count() === 0, '…with no signature card (no quotes to sign) and no door to Members (not theirs to open)')
    ok(/You’re in Accounting at Demo Studio/.test(await d.getByTestId('profile-role').getAttribute('aria-label')), '…"You’re in Accounting at Demo Studio"')   // (the calm UI build 2026-10-27, a deliberate change)
    await shot(d, 's01-08-priya-profile-1440', true)
    as('dane')

    // ── 9 · Who may do what · ⌘K ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · Who may do what, ⌘K')
    await go(d, '/settings')
    await openRoles(d)   // (the calm UI build 2026-10-27, a deliberate change)
    const reach = JSON.stringify(await d.getByTestId('may-member-details').locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach'))))
    /* (S44O — call C6, a deliberate change of this rule: a sixth role, Marketing — their own details too) */
    ok(reach === '["yes","yes","own","own","own","own"]', `Who may do what: Owners and Admins anyone's, everyone else their own (${reach})`)
    await go(d, '/leads')
    await d.keyboard.press('Meta+k'); await settle(d, 400)
    await d.getByRole('combobox', { name: 'Search the studio' }).fill('signature'); await settle(d, 900)
    const goto = d.getByRole('dialog', { name: 'Search' }).getByRole('group', { name: 'Go to' })
    ok(await goto.getByRole('option').filter({ hasText: 'Your signature' }).count() === 1 && await goto.getByRole('option').filter({ hasText: 'Designers’ signatures' }).count() === 1, '⌘K "signature": Your signature, and Designers’ signatures still')
    await goto.getByRole('option').filter({ hasText: 'Your signature' }).click()
    await d.waitForURL(/\/profile#signature/, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
    const sb = await d.getByTestId('profile-signature').boundingBox()
    ok(/\/profile#signature$/.test(d.url()) && !!sb && sb.y < 1024 && sb.y + sb.height > 0, '…lands on Your signature, in view')

    // ── 10 · the ghost sits on the page ───────────────────────────────────────────────────────────────────────────────────────
    console.log('10 · The ghost')
    for (const [w, h, touch] of [[1440, 1024, false], [390, 844, true]]) {
      const G = await b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
      await G.addInitScript(() => { const orig = performance.getEntriesByType.bind(performance); performance.getEntriesByType = function (t) { return t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : orig(t) } })
      const g = await page(G, `ghost-${w}`)
      await g.goto(BASE + '/profile', { waitUntil: 'load' }); await settle(g, 1600)
      const ghost = await g.locator('[role="status"][aria-label="Loading your profile"] section').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width)] }))
      await shot(g, `s01-09-ghost-${w}`)
      await G.close()
      const P = await b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
      const q = await page(P, `page-${w}`)
      await q.goto(BASE + '/profile', { waitUntil: 'networkidle' }); await settle(q, 1600)
      const real = await q.locator('[data-testid="your-profile"] section').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width)] }))
      await P.close()
      const close = ghost.length === real.length && ghost.every((g0, i) => Math.abs(g0[0] - real[i][0]) <= 8 && Math.abs(g0[1] - real[i][1]) <= 2 && Math.abs(g0[2] - real[i][2]) <= 2)
      ok(close, `${w}: the ghost’s cards sit where the page’s do (ghost ${JSON.stringify(ghost)} · page ${JSON.stringify(real)})`)
    }

    // ── 11 · the phone: the avatar, the You sheet, Your profile; no sideways scroll at 390 and 320 ─────────────────────────────
    console.log('11 · The phone')
    for (const [w, h] of [[390, 844], [320, 700]]) {
      const M = await phoneCtx(w, h); const m = await page(M, `phone-${w}`)
      await go(m, '/leads')
      const av = m.getByTestId('phone-avatar')
      ok(await av.count() === 1 && /You — Dane/.test(await av.getAttribute('aria-label')) && (await av.innerText()).trim() === 'D', `${w}: the top bar’s avatar is the member you are — Dane’s tinted initial, no stock photo`)
      await av.click(); await settle(m, 700)
      const sheet = m.getByRole('dialog', { name: 'You' }).or(m.getByRole('menu', { name: 'You' }))
      ok(await sheet.count() >= 1 && await m.getByTestId('open-profile').isVisible(), `${w}: it opens the You sheet — you first, then View as`)
      ok(await sideways(m) <= 0, `${w}: no sideways scroll with the sheet open`)
      if (w === 390) await shot(m, 's01-10-you-sheet-390')
      await m.getByTestId('open-profile').click(); await m.waitForURL(/\/profile$/, { timeout: 10000 }).catch(() => {}); await settle(m, 1400)
      ok(new URL(m.url()).pathname === '/profile', `${w}: Your profile opens from it`)
      ok(await sideways(m) <= 0, `${w}: Your profile has no sideways scroll`)
      if (w === 390) await shot(m, 's01-11-profile-390', true)
      await go(m, '/company/members')
      ok(await sideways(m) <= 0, `${w}: Members has no sideways scroll`)
      await (await memberItem(m, 'sarah', 'member-edit')).click(); await settle(m, 800)
      ok(await m.getByTestId('member-edit-dialog').isVisible() && await sideways(m) <= 0, `${w}: Edit details opens with no sideways scroll`)
      if (w === 390) await shot(m, 's01-12-edit-390')
      await M.close()
    }
    await D.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.join(' · ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe broke:', String(e).slice(0, 400))
  } finally {
    for (const [id, row] of Object.entries(kept)) for (const [c, v] of Object.entries(row)) sql(`update members set ${c} = ${v} where id = '${id}'`)
    as(you0 || 'dane')
    sql(`delete from studio_pictures where kind='member' and created_at >= ${T0}`)
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
