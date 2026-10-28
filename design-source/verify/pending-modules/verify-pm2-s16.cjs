// Pending modules, step S16 · Rail, Tools and the phone bar (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// held:shell + studio:studio-navigation — 1.0's frame: src/components/layout/{app-sidebar,topbar,bottom-nav}.tsx, src/lib/keyboard-shortcuts.ts).
// Each item asserted as the rule it builds, never another round's count:
//  - the dead ends stay signposts until their own steps build them (Dashboard S22, Meeting Copilot S23, Marketplace S24 and Market Insights S25 are live):
//    their names say "coming soon", their tiles and rows wear Soon, a press answers "Coming soon in OpenMaison 2.0"; the quote editor's Create
//    strip has no Brand Catalog tile (S04)
//  - 1.0's G then I (Inbox): G then M goes to Messages; the rail's Messages names its keys; the G hint and the ? panel list it
//  - the unsaved-edits guard (REG-791) now holds a move made in script: G then … and the AI credits card's "See usage" ask Save · Discard ·
//    Keep editing on an edited Your profile; Keep editing keeps the words, Discard goes on and saves nothing
//  - 1.0's badge cap: a count over 99 reads "99+" on the rail and on the phone's bar; the control's name keeps the whole number
//  - 1.0's top bar "Open / Closed to new leads": the studio block's menu (and the phone's You sheet) carries your own Open to new leads under
//    Your profile — the switch moves on the press, says so with Undo, writes only your own row, answers ↵ and Space; Members shows the same
//    record; a Designer changes theirs only; Accounting has no row
//  - Your profile's consent row keeps its place on a touch phone without S14's local override (the S15 house rule)
//  - the phone's avatar opens the You sheet (S01); 390 and 320 have no sideways scroll against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s16.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s16')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const accepting = (id) => Number(sql(`select accepting_leads from members where id='${id}'`))
const cls = (mod, name) => `[class*="${mod}-module__"][class*="__${name}"]`
const PROBE_KIND = 'new_lead'
const PROBE_PREFIX = 's16-probe-'

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (w = 1440, h = 1024) => b.newContext({ viewport: { width: w, height: h } })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const focusPage = (p) => p.mouse.click(1000, 16)
  const rail = (p) => p.locator('nav[aria-label="Workspace"]')
  const studioBlock = (p) => rail(p).locator('button[aria-haspopup="menu"][aria-label^="Demo Studio"]')
  const youRow = (p) => p.getByTestId('you-accepting')
  const openStudio = async (p) => { await studioBlock(p).click(); await settle(p, 500) }
  const closeMenus = async (p) => { await p.keyboard.press('Escape'); await settle(p, 300) }

  /* the record as it was — put back in `finally` */
  const you0 = sql(`select id from members where is_you = 1`)
  const acc0 = json(`select id, accepting_leads as a from members`)
  const name0 = sql(`select name from members where id='dane'`)

  try {
    /* open one page and wait before reading the record the probe compares against (the habit after S08) */
    as('dane')
    const ctx = await desk(); const p = await ctx.newPage(); watch(p, '1440')
    await go(p, '/leads', 2200)
    const unread0 = Number(sql(`select count(*) from notifications where member_id='dane' and read_at is null`))

    console.log('1 · the dead ends stay signposts (their own steps build them)')
    // (pending modules S24, a deliberate change of this rule) the Marketplace is built — the rail's item is a link
    // (pending modules S22, a deliberate change of this rule) the Dashboard is built — the rail's first item is a link, no Soon is left on the rail
    ok(await rail(p).locator('a[href="/dashboard"]').count() === 1 && await rail(p).locator('button[aria-label="Dashboard · coming soon"]').count() === 0, 'the rail’s Dashboard is live (S22)')
    ok(await rail(p).locator('button[aria-label$=" · coming soon"]').count() === 0, 'no rail item says "coming soon" any more')
    ok(await rail(p).locator('a[href="/marketplace"]').count() === 1 && await rail(p).locator('button[aria-label="Marketplace · coming soon"]').count() === 0, 'the rail’s Marketplace is live (S24)')
    await rail(p).locator('button[aria-label="Tools"], button[aria-label^="Tools ("]').first().click(); await settle(p, 500)
    const tools = p.locator('[role="menu"][aria-label="Tools"]')
    // (pending modules S23, a deliberate change of this rule) Meeting Copilot is built — its tile is live
    ok(await tools.locator('[aria-label="Meeting Copilot, coming soon"]').count() === 0, 'Tools › Meeting Copilot is live (S23)')
    // (pending modules S25, a deliberate change of this rule) Market Insights is built — its tile is live, and no tile is Soon any more
    ok(await tools.locator('[aria-label="Market Insights, coming soon"]').count() === 0 && await tools.locator('[aria-label="Market Insights"]').count() === 1, 'Tools › Market Insights is live (S25)')
    const soonTags = await tools.locator('[data-soon]').count()
    ok(soonTags === 0, 'no tile is Soon — every tool is live', `${soonTags} Soon tiles`)
    await shot(p, '01-tools-1440')
    await closeMenus(p)

    console.log('2 · G then M — Messages (1.0’s G then I, its Inbox)')
    const msgs = rail(p).locator('a[href="/chat"]')
    ok(await msgs.getAttribute('data-kb') === 'go.messages', 'the rail’s Messages is the G then M place (data-kb)')
    await msgs.hover(); await settle(p, 900)
    const tip = (await p.locator('[role="tooltip"]').allInnerTexts()).join(' ')
    ok(/Messages/.test(tip) && /G/.test(tip) && /M/.test(tip.replace('Messages', '')), 'its tooltip names its keys', tip.replace(/\s+/g, ' '))
    await p.mouse.move(900, 500); await focusPage(p)
    await p.keyboard.press('g'); await settle(p, 700)
    const hint = p.locator(cls('shortcuts', 'chord'))
    ok(await hint.isVisible() && /Messages/.test(await hint.innerText()), 'the G hint lists Messages')
    await shot(p, '02-g-hint-1440')
    await p.keyboard.press('m'); await p.waitForURL(/\/chat/, { timeout: 10000 }).catch(() => {})
    ok(new URL(p.url()).pathname === '/chat', 'G then M goes to Messages', p.url().replace(BASE, ''))
    await settle(p, 900)
    await focusPage(p); await p.keyboard.press('Shift+Slash'); await settle(p, 700)
    const panel = p.getByRole('dialog', { name: 'Keyboard shortcuts' })
    ok(await panel.isVisible() && /Go to Messages/.test(await panel.innerText()), 'the ? panel lists Go to Messages among the keys that work everywhere')
    await p.keyboard.press('Escape'); await settle(p, 400)

    console.log('3 · the unsaved-edits guard holds a move made in script')
    await go(p, '/profile', 1800)
    const nameField = p.locator('[data-testid="member-details"]').getByLabel('Name', { exact: false }).first()
    await nameField.fill('Dane S16 draft'); await settle(p, 200)
    await p.locator('h1').first().click(); await settle(p, 300)   // the field let go — the keys listen again
    await p.keyboard.press('g'); await settle(p, 250); await p.keyboard.press('l'); await settle(p, 700)
    const ask = p.getByRole('alertdialog', { name: 'Save your changes?' }).or(p.getByRole('dialog', { name: 'Save your changes?' }))
    ok(await ask.isVisible(), 'G then L on an edited Your profile asks Save your changes? first', p.url().replace(BASE, ''))
    await shot(p, '03-guard-g-keys-1440')
    await ask.getByRole('button', { name: 'Keep editing' }).click(); await settle(p, 500)
    ok(new URL(p.url()).pathname === '/profile' && (await nameField.inputValue()) === 'Dane S16 draft', 'Keep editing stays with the words as typed')
    /* the AI credits card's See usage, from the rail */
    const credits = p.getByTestId('rail-credits')
    if (await credits.count()) {
      await credits.click(); await settle(p, 600)
      const usage = p.getByRole('button', { name: /^See (my )?usage$/ }).first()
      if (await usage.count()) {
        await usage.click(); await settle(p, 600)
        ok(await ask.isVisible(), 'the AI credits card’s See usage asks first too')
        await ask.getByRole('button', { name: 'Keep editing' }).click(); await settle(p, 400)
      } else ok(false, 'the AI credits card offers See usage')
    }
    await p.locator('h1').first().click(); await settle(p, 300)
    await p.keyboard.press('g'); await settle(p, 250); await p.keyboard.press('l'); await settle(p, 700)
    await ask.getByRole('button', { name: 'Discard' }).click(); await p.waitForURL(/\/leads/, { timeout: 10000 }).catch(() => {}); await settle(p, 900)
    ok(new URL(p.url()).pathname === '/leads', 'Discard goes on to Leads')
    ok(sql(`select name from members where id='dane'`) === name0, 'and nothing was saved')

    console.log('4 · a count over 99 reads 99+')
    sql(`insert into notifications (id, member_id, kind, title, channels, created_at) select '${PROBE_PREFIX}' || value, 'dane', '${PROBE_KIND}', 'S16 probe', 'in_app', 1000 + value from generate_series(1, 120)`)
    await go(p, '/leads', 1500)
    const bell = rail(p).locator('button[data-notifications-tile]')
    const bellBadge = (await bell.locator(cls('app-rail', 'badge')).innerText()).trim()
    ok(bellBadge === '99+', 'the rail’s bell reads 99+', bellBadge)
    ok((await bell.getAttribute('aria-label')) === `Notifications (${unread0 + 120} unread)`, 'its name keeps the whole number', await bell.getAttribute('aria-label'))
    await shot(p, '04-badge-99-1440')

    console.log('5 · your own Take new leads, on Your profile')
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-39: one home for one switch) your own Open to new leads left the studio block's menu and the phone's You sheet: it is
       Your profile › New leads now — the switch itself, "Take new leads", with the same record, the same save, refusal and Undo (`you-accepting`
       is the switch's row there). The functional checks are the same ones, on that page. */
    sql(`delete from notifications where id like '${PROBE_PREFIX}%'`)
    await go(p, '/leads', 1500)
    await openStudio(p)
    const menu = p.locator('[role="menu"][aria-label="View as"]')
    ok(await menu.getByTestId('you-accepting').count() === 0 && await menu.getByTestId('open-profile').count() === 1, 'the studio block’s menu leads to Your profile, and carries no switch of its own any more')
    await closeMenus(p)
    await go(p, '/profile', 1800)
    const sw = (q) => youRow(q).locator('input[role="switch"]')
    ok(await youRow(p).count() === 1 && await sw(p).isChecked(), 'Dane is open: Your profile › New leads, its switch on')
    ok(/Take new leads/.test(await youRow(p).innerText()) && /New leads can be assigned to you/.test(await youRow(p).innerText()), 'it says what it does: “Take new leads — New leads can be assigned to you”')
    /* the words' own width (a range over them), against the line's box — an ellipsis hides the cut from scrollWidth at a pixel or two */
    const cut = () => youRow(p).locator('#you-accepting-help').evaluate((n) => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect().width > n.clientWidth + 0.5 })
    ok(!(await cut()), 'its line is whole at 1440 (not cut short)')
    await youRow(p).scrollIntoViewIfNeeded(); await shot(p, '05-you-menu-open-1440')
    const others0 = json(`select id, accepting_leads as a from members where id <> 'dane' order by id`)
    await youRow(p).click(); await settle(p, 1200)
    ok(accepting('dane') === 0, 'a press closes Dane to new leads (the record)')
    ok(JSON.stringify(json(`select id, accepting_leads as a from members where id <> 'dane' order by id`)) === JSON.stringify(others0), 'and nobody else’s row')
    ok(/You’re closed to new leads/.test(await snackText(p)) && /Undo/.test(await snackText(p)), 'it says so, with Undo', await snackText(p))
    ok(!(await sw(p).isChecked()), 'the switch turns off')
    ok(!(await cut()), 'closed, its line is whole too')
    await shot(p, '06-you-menu-closed-1440')
    await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1200)
    ok(accepting('dane') === 1, 'Undo opens him again')
    ok(/You’re open to new leads/.test(await snackText(p)), 'and says so', await snackText(p))
    /* the keyboard: the switch takes focus and Space presses it (the house DS Switch) */
    await go(p, '/profile', 1500)
    await sw(p).focus(); await p.keyboard.press(' '); await settle(p, 1200)
    ok(accepting('dane') === 0, 'Space presses it')
    await sw(p).focus(); await p.keyboard.press(' '); await settle(p, 1200)
    ok(accepting('dane') === 1, 'Space again presses it back')
    /* the same record on Company › Members */
    sql(`update members set accepting_leads = 0 where id='dane'`)
    await go(p, '/company/members', 1500)
    ok(/Closed to new leads/i.test(await p.locator('[data-testid="member-row"][data-member-id="dane"]').innerText()),   /* the chip is an uppercase caption */
       'Members shows the same record (Closed to new leads on Dane’s row)')
    await go(p, '/profile', 1500)
    ok(!(await sw(p).isChecked()), 'and Your profile reads it')
    sql(`update members set accepting_leads = 1 where id='dane'`)

    console.log('6 · a Designer changes theirs; an Admin closed reads closed; Accounting has no row')
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-39) on Your profile */
    as('germaine')
    await go(p, '/profile', 1800)
    ok(await youRow(p).count() === 1 && await sw(p).isChecked(), 'Germaine (Designer) sees her own, open')
    const before = json(`select id, accepting_leads as a from members where id <> 'germaine' order by id`)
    await youRow(p).click(); await settle(p, 1200)
    ok(accepting('germaine') === 0 && JSON.stringify(json(`select id, accepting_leads as a from members where id <> 'germaine' order by id`)) === JSON.stringify(before), 'her press writes her row only')
    await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).click(); await settle(p, 1200)
    ok(accepting('germaine') === 1, 'Undo puts hers back')
    as('huimin')
    await go(p, '/profile', 1800)
    ok(await youRow(p).count() === 1 && !(await sw(p).isChecked()), 'Hui Min (Admin, closed in the demo) reads closed')
    as('priya')
    await go(p, '/profile', 1800)
    ok(await p.getByTestId('profile-details').or(p.locator('h1')).first().count() === 1 && await youRow(p).count() === 0, 'Priya (Accounting) has Your profile and no Take new leads — she is on no lead')
    await shot(p, '07-you-menu-accounting-1440')
    as('dane')

    console.log('7 · the quote editor’s Create strip has no Brand Catalog (S04)')
    const quoteId = sql(`select id from quotes where kind='quote' and deleted_at is null and archived_at is null order by created_at desc limit 1`)
    if (quoteId) {
      await go(p, `/quotes/${quoteId}`, 2500)
      ok(!(/Brand Catalog/.test(await p.locator('body').innerText())), 'no Brand Catalog tile on the quote editor')
    }
    await ctx.close()

    console.log('8 · 1024 · 768 touch — the switch')
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-39) the switch on Your profile, at a tablet's widths */
    for (const [w, t] of [[1024, false], [768, true]]) {
      const c = t ? await touch(768, 1024) : await desk(1024, 768); const q = await c.newPage(); watch(q, `${w}`)
      await go(q, '/profile', 1800)
      await youRow(q).scrollIntoViewIfNeeded(); await settle(q, 300)
      ok(await youRow(q).isVisible(), `${w}${t ? ' touch' : ''}: Your profile shows Take new leads`)
      const box = await youRow(q).boundingBox()
      ok(!!box && box.x + box.width <= w && box.x >= 0, `${w}: the row keeps inside the window`, box ? `${Math.round(box.x)}+${Math.round(box.width)}` : 'none')
      await shot(q, `08-you-menu-${w}${t ? '-touch' : ''}`)
      await c.close()
    }

    console.log('9 · 390 · 320 — the You sheet, the dock, More')
    const ph = await touch(); const m = await ph.newPage(); watch(m, '390')
    await go(m, '/leads', 1800)
    await m.getByTestId('phone-avatar').click(); await settle(m, 800)
    /* (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-39) the You sheet leads to Your profile; the switch is there */
    ok(await youRow(m).count() === 0 && await m.getByTestId('open-profile').isVisible(), 'the avatar’s You sheet carries Your profile (Take new leads is on it)')
    ok(await sideways(m) <= 0, '390: no sideways scroll with the sheet open', `${await sideways(m)}px`)
    await shot(m, '09-you-sheet-390')
    await m.keyboard.press('Escape'); await settle(m, 400)
    await go(m, '/profile', 1800)
    await youRow(m).scrollIntoViewIfNeeded(); await settle(m, 300)
    await youRow(m).tap(); await settle(m, 1200)
    ok(accepting('dane') === 0, '390: a tap closes him to new leads')
    const undo = m.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' })
    if (await m.getByRole('button', { name: 'Close' }).first().isVisible().catch(() => false)) { /* the sheet stays; the snackbar sits over it */ }
    await undo.tap().catch(async () => { await undo.click({ force: true }) }); await settle(m, 1200)
    ok(accepting('dane') === 1, '390: Undo opens him again')
    await go(m, '/leads', 1500)
    // (pending modules S22, a deliberate change of this rule) the dock's Dashboard is a link now
    ok(await m.locator('nav[aria-label="Primary"] a[href="/dashboard"]').count() === 1 && await m.locator('nav[aria-label="Primary"] button[aria-label="Dashboard · coming soon"]').count() === 0, '390: the dock’s Dashboard is live (S22)')
    await m.locator('nav[aria-label="Primary"] button[aria-haspopup="dialog"]').click(); await settle(m, 700)
    const more = m.getByRole('dialog', { name: 'More' })
    // (pending modules S24, a deliberate change of this rule) More › Marketplace is a live row
    ok(await more.locator('a[href="/marketplace"]').count() === 1 && await more.locator('button[aria-label="Marketplace · coming soon"]').count() === 0, '390: More › Marketplace is live (S24)')
    await shot(m, '10-more-390')
    await m.keyboard.press('Escape'); await settle(m, 400)
    sql(`insert into notifications (id, member_id, kind, title, channels, created_at) select '${PROBE_PREFIX}' || value, 'dane', '${PROBE_KIND}', 'S16 probe', 'in_app', 1000 + value from generate_series(1, 120)`)
    await go(m, '/leads', 1500)
    const barBell = m.locator('header button[aria-label^="Notifications"]')
    const barBadge = (await barBell.locator(cls('mobile-nav', 'barBadge')).innerText()).trim()
    ok(barBadge === '99+' && /Notifications \(\d{3} unread\)/.test(await barBell.getAttribute('aria-label')), '390: the bar’s bell reads 99+, its name the whole number', `${barBadge} · ${await barBell.getAttribute('aria-label')}`)
    ok(await sideways(m) <= 0, '390: the badge keeps to the bar', `${await sideways(m)}px`)
    await shot(m, '11-badge-99-390')
    sql(`delete from notifications where id like '${PROBE_PREFIX}%'`)
    /* Your profile's consent row: its place on a touch phone without S14's local override (the S15 house rule) */
    await go(m, '/profile', 1800)
    const consent = m.getByTestId('signature-consent')
    if (await consent.count()) {
      await consent.scrollIntoViewIfNeeded(); await settle(m, 300)
      const geo = await consent.evaluate((row) => {
        const card = row.closest('section') ?? row.parentElement
        const r = row.getBoundingClientRect(), c = card.getBoundingClientRect(), cs = getComputedStyle(card)
        return { rowX: r.left, rowR: r.right, cardX: c.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), cardR: c.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth), margin: getComputedStyle(row).marginLeft }
      })
      ok(Math.abs(geo.rowX - geo.cardX) < 1.5 && geo.rowR <= geo.cardR + 1.5 && geo.margin === '0px', '390 touch: the consent row starts at its card’s edge, as on a desk (no -10 pull)', JSON.stringify(geo))
      await shot(m, '12-profile-consent-390')
    } else ok(false, 'Your profile shows the consent row')
    await ph.close()
    const narrow = await touch(320, 700); const n = await narrow.newPage(); watch(n, '320')
    await go(n, '/leads', 1800)
    await n.getByTestId('phone-avatar').click(); await settle(n, 800)
    ok(await n.getByTestId('open-profile').isVisible() && await sideways(n) <= 0, '320: the You sheet fits, no sideways scroll', `${await sideways(n)}px`)   // (the calm UI build 2026-10-27, a deliberate change) (1-39)
    await shot(n, '13-you-sheet-320')
    await narrow.close()

    ok(errors.length === 0, 'no page errors', errors.join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    sql(`delete from notifications where id like '${PROBE_PREFIX}%'`)
    for (const r of acc0) sql(`update members set accepting_leads = ${r.a} where id='${r.id}'`)
    sql(`update members set name = '${name0.replace(/'/g, "''")}' where id='dane'`)
    as(you0)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
