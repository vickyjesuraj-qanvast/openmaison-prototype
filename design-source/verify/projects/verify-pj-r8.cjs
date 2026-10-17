// Projects round 8 — Choices (the client's selections). The studio's tab on the seeded state (R74: Paint colours waiting, the Kitchen countertop
// chosen by Benjamin and locked by carpentry); grouping by room and by milestone; a new choice with an option from each source (Materials · the
// Price book · a render · an upload), reorder, remove + Undo, share + Undo; See it as the client (the studio's preview card) and the portal's
// preview recording nothing; the client chooses on their phone with a note → the studio sees it, the bell row and the Activity card; refused
// on the server: a second choice from a stale page, a choice taken back, a paused portal; Choice overdue on the listing and the waiting line;
// choose with the client (the studio's pick) and change a pick; the price difference on the card; phone 390 and desktop 1440.
// Run against `next start -p 3023` on the repaired scratch DB — never local.db. Everything the probe changes is put back in `finally`.
// Usage: NODE_PATH=<repo>/node_modules node verify-pj-r8.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r8')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3023'
const REPO = path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const BEN = sql(`select id from leads where name='Benjamin Han' and deleted_at is null`)
const BEN_P = sql(`select id from projects where lead_id='${BEN}'`)
const AISHA_P = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name='Aisha Rahman'`)
const PAINT = sql(`select id from project_selections where project_id='${BEN_P}' and title='Paint colours'`)
const TOP = sql(`select id from project_selections where project_id='${BEN_P}' and title='Kitchen countertop'`)
const PAINT_WAS = sql(`select shared_at from project_selections where id='${PAINT}'`)
/* (S45C — the demo moves with the restore day, S42A) a day this probe asserts is read from its record and worded as the app words it —
   never a window around the day the probe was written. A stored stamp is seconds or milliseconds; the day is the local one. */
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const toMs = (v) => { const n = Number(v); return n > 1e12 ? n : n * 1000 }
const dayLabelOf = (v) => { const d = new Date(toMs(v)); return `${WD3[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}` }   // "Mon 19 Oct" (lib/projects/choices-model.ts neededDay)
const reOf = (s, f) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f)
const PAINT_NEEDED = dayLabelOf(sql(`select needed_by from project_selections where id='${PAINT}'`))   // (S45C) the day the choice is needed by
const LINK_WAS = sql(`select coalesce(last_opened_at,'null') from homeowner_lead_links where lead_id='${BEN}'`)
const START = Number(sql(`select strftime('%s','now')`)) - 2
const NEW = 'Bathroom tiles'
/* (REG-1068) What a pick moves the contract by, by the rule (lib/projects/choices-model.ts): an option's price is a quote line's, before GST;
   its variation order adds the studio's GST when Benjamin's quote charges it — so the card, the dialog, Activity and the portal say that. */
const STUDIO = (() => { try { return JSON.parse(sql(`select value from settings where key='studio'`) || '{}') } catch { return {} } })()
const QUOTE_GST = sql(`select coalesce(q.gst_enabled, '') from projects p left join quotes q on q.id = p.quote_id where p.id='${BEN_P}'`)
const GST = (QUOTE_GST === '' ? STUDIO.gstRegistered !== false : QUOTE_GST === '1') ? (typeof STUDIO.gstPct === 'number' ? STUDIO.gstPct : 9) : 0
const sgd0 = (m) => `S$${new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 }).format(Math.abs(m) / 100)}`
const sgd2 = (m) => `S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(m) / 100)}`
const withGst = (m) => (GST > 0 ? m + Math.round((m * GST) / 100) : m)
const contractLine = (m) => (GST > 0 ? `${m > 0 ? '+' : '−'}${sgd2(withGst(m))} ${m > 0 ? 'on' : 'off'} the contract (${sgd2(Math.abs(m))} + GST)` :   /* (fix-C, C-21) one money format in the sentence */ `${m > 0 ? '+' : '−'}${sgd0(m)} ${m > 0 ? 'on' : 'off'} the contract`)
const clientAdds = (m) => `${m > 0 ? 'Adds' : 'Saves'} ${GST > 0 ? sgd2(withGst(m)) : sgd0(m)}`
const clientNotice = (name, m) => `${name} ${m > 0 ? 'adds' : 'takes'} ${GST > 0 ? `${sgd2(withGst(m))} (${sgd2(Math.abs(m))} + GST)` : sgd0(m)} ${m > 0 ? 'to' : 'off'} your contract`
const newId = () => sql(`select id from project_selections where project_id='${BEN_P}' and title='${NEW}' and deleted_at is null`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`))
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phone = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const noOverflow = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  /* (REG-1050) the phone's bar: four tabs and More, as the studio's dock — a section is in the bar or in More's sheet */
  const sections = async (p) => {
    const bar = await p.locator('[data-testid="portal-dock"] > [data-key]').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
    let more = []
    if (bar.includes('more')) {
      await p.locator('[data-testid="portal-more"]').click(); await p.waitForTimeout(600)
      more = await p.locator('[data-testid="portal-more-sheet"] a').evaluateAll((as) => as.map((a) => a.getAttribute('data-key')))
      await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    }
    return { bar, more, all: [...bar.filter((k) => k !== 'more'), ...more] }
  }
  const card = (p, title) => p.locator('[data-testid="choice-card"]', { has: p.locator('h3', { hasText: title }) })
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const signIn = async (p) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill('97731968')
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
  }
  const pickBoard = async (p, title, option) => {
    const board = p.locator('[data-testid="portal-choice"]', { has: p.locator('h3', { hasText: title }) })
    await board.locator('[data-testid="portal-choice-option"]', { hasText: option }).click(); await settle(p, 300)
    return board
  }

  try {
    // ── The tab on the seeded state (desk) ─────────────────────────────────────────────────────────────────────────────────
    console.log('The Choices tab (1440)')
    const S = await desk(); const s = await S.newPage(); watch(s, 'studio')
    await go(s, `/projects/${BEN_P}/choices`)
    const tabs = (await s.locator('[role="tablist"] a, [role="tablist"] [role="tab"]').allInnerTexts()).map((t) => t.replace(/\s*\d+$/, '').trim())   // (gaps build, package A — REG-a.15) a tab may carry its count
    /* (parity P-06, a deliberate change of this rule) Tasks is second, as on a lead — (simplify S-03 · Q-01, a deliberate change of this rule) the
       seven groups: Choices is the Design tab's first view, after Client (Updates · Messages · Tickets · Questionnaire) */
    ok(tabs.join(' · ').replace(/\s*\d+/g, '').startsWith('Overview · Tasks · Schedule · Client · Design') && /^Design/.test(await s.locator('[role="tab"][aria-selected="true"]').innerText())
       && /^Choices/.test(await s.locator('[data-testid="project-view-chips"] [aria-checked="true"]').innerText()), 'the project’s tabs: Overview · Tasks · Schedule · Client · Design …; Choices is Design’s view')
    ok(await s.locator('[data-testid="choice-card"]').count() === 2, 'two choices on Benjamin’s project')
    const heads = await s.locator('[data-testid="choices-group-section"] h3').first().evaluateAll((h) => h)
    ok((await s.locator('[data-testid="choices-group-section"]').allInnerTexts()).map((t) => t.split('\n')[0]).join('|').startsWith('Kitchen'), 'grouped by room — Kitchen, then Living and bedrooms')
    void heads
    const paint = card(s, 'Paint colours'), top = card(s, 'Kitchen countertop')
    ok(/Waiting for Benjamin/.test(await paint.locator('[data-testid="choice-band"]').innerText()) && reOf(`Needed by ${PAINT_NEEDED}`, 'i').test(await paint.innerText()), `Paint colours waits for Benjamin — needed by ${PAINT_NEEDED}`)
    ok(await paint.locator('[data-testid="choice-option"]').count() === 3, 'three options, each the house square')
    ok(/\+S\$240/.test(await paint.locator('[data-testid="choice-option"]').first().innerText()), 'Sage Whisper adds S$240')
    ok(/Benjamin chose Calacatta quartz/.test(await top.locator('[data-testid="choice-pick"]').innerText()) && /waterfall edge/.test(await top.locator('[data-testid="choice-note"]').innerText()), 'the countertop shows the client’s pick, note and when')
    ok((await top.locator('[data-testid="choice-contract"]').innerText()).includes(contractLine(120_000)), `its price difference, as its variation order will carry it: "${contractLine(120_000)}" (REG-1068)`)
    ok(/Carpentry fabrication has started — the pick stays/.test(await top.locator('[data-testid="choice-locked"]').innerText()), 'carpentry has started: the pick stays (no Change the pick)')
    await shot(s, 'tab-1440')
    await s.getByRole('button', { name: 'More options', exact: true }).first().click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: /Invite to Portal/ }).click(); await settle(s, 1500)   // (one-home N-15, a deliberate change of this rule) the panel and the project ⋮ item are "Invite to Portal" now
    const accessRow = s.locator('[data-testid="access-section"][data-key="choices"]')
    ok(/1 waiting · 1 chosen/.test(await accessRow.innerText()) && (await accessRow.getAttribute('href')) === `/projects/${BEN_P}/choices`, 'Client access: "Choices — 1 waiting · 1 chosen", into the tab')
    await s.keyboard.press('Escape'); await settle(s, 500)
    await s.locator('[data-testid="choices-group"] [role="radio"]', { hasText: 'By milestone' }).click(); await settle(s, 400)
    const msHeads = (await s.locator('[data-testid="choices-group-section"] > h3').allInnerTexts()).map((t) => t.replace(/\s*·\s*\d+$/, '').trim())
    ok(msHeads.join('|') === 'Carpentry fabrication|Painting', `By milestone: the schedule’s order (${msHeads.join(' | ')})`)
    await s.locator('[data-testid="choices-group"] [role="radio"]', { hasText: 'By room' }).click(); await settle(s, 300)

    // ── A new choice with an option from each source ───────────────────────────────────────────────────────────────────────
    console.log('Add a choice and its options')
    await s.locator('[data-testid="choices-add"]').click(); await settle(s, 500)
    ok(await s.locator('[data-testid="choice-dialog"]').isVisible(), 'Add a choice opens its form dialog')
    await dialog(s).locator('input').nth(0).fill(NEW)
    await dialog(s).locator('input').nth(1).fill('Common bathroom')
    await s.locator('[data-testid="choice-save"]').click(); await settle(s, 1500)
    ok(!!newId() && sql(`select status from project_selections where id='${newId()}'`) === 'draft', 'it lands as a Draft')
    const nc = card(s, NEW)
    ok(/Draft/.test(await nc.locator('[data-testid="choice-band"]').innerText()) && await nc.locator('[data-testid="choice-share"]').isDisabled(), 'the Draft band — Share waits for an option')
    const addFrom = async (source) => { await nc.locator('[data-testid="choice-add-option"]').click(); await settle(s, 300); await s.locator(`[data-testid="choice-source-${source}"]`).click(); await settle(s, 1200) }
    // Materials
    await addFrom('material')
    ok(await s.locator('[data-testid="option-source-list"]').isVisible() && await s.locator('[data-testid="option-source-row"]').count() >= 4, 'From Materials lists Company › Materials')
    await s.locator('[data-testid="option-source-row"]', { hasText: 'Walnut vinyl plank' }).click(); await settle(s, 400)
    ok(await dialog(s).locator('input').first().inputValue() === 'Walnut vinyl plank', 'picking one fills the option’s name')
    await s.locator('[data-testid="option-sign"] [role="radio"]', { hasText: 'Adds' }).click(); await settle(s, 200)
    await dialog(s).locator('input[inputmode="decimal"], input[inputmode="numeric"]').last().fill('350')
    await shot(s, 'option-form-1440', false)
    await s.locator('[data-testid="option-save"]').click(); await settle(s, 1500)
    const mat = sql(`select o.source || '|' || coalesce(o.source_ref,'') || '|' || o.price_minor || '|' || f.thumb || '|' || (select name from lead_files where id = f.parent_id) from project_selection_options o join lead_files f on f.id = o.file_id where o.selection_id='${newId()}' and o.name='Walnut vinyl plank'`)
    ok(mat === 'material|sm-walnut-vinyl|35000|/visualizer/demo/swatch-walnut.jpg|Choices', 'a material’s option: its picture kept in Files › Choices, +S$350')
    // the Price book
    await addFrom('price_book')
    await s.locator('[data-testid="option-source-row"]', { hasText: 'Soon Bee Huat' }).click(); await settle(s, 400)
    ok(/per sqft in the Price book/.test(await dialog(s).innerText()), 'a Price book item shows its own price beside the field')
    await s.locator('[data-testid="option-save"]').click(); await settle(s, 1500)
    ok(sql(`select source || '|' || source_ref || '|' || coalesce(price_minor,'none') from project_selection_options where selection_id='${newId()}' and name like 'Homogeneous tiles%'`) === 'price_book|pb-tiles-sbh|none', 'a Price book item’s option, no change to the price')
    // a render
    await addFrom('render')
    const renders = await s.locator('[data-testid="option-source-row"]').count()
    ok(renders >= 1 && /Showroom/.test(await s.locator('[data-testid="option-source-list"]').innerText()), 'From a render lists the studio’s designs this member may see')
    await s.locator('[data-testid="option-source-row"]').first().click(); await settle(s, 400)
    await dialog(s).locator('input').first().fill('Matte black grout, as rendered')
    await s.locator('[data-testid="option-save"]').click(); await settle(s, 1500)
    ok(sql(`select o.source || '|' || (o.file_id is not null) from project_selection_options o where o.selection_id='${newId()}' and o.name like 'Matte black grout%'`) === 'render|1', 'a render’s option keeps the version’s picture as a file')
    // an upload
    await addFrom('upload')
    await s.locator('[data-testid="option-upload"] input[type="file"]').setInputFiles(path.join(REPO, 'public/uat-files/kitchen-moodboard.jpg')); await settle(s, 1500)
    await dialog(s).locator('input').first().fill('Terrazzo, grey')
    await s.locator('[data-testid="option-sign"] [role="radio"]', { hasText: 'Saves' }).click(); await settle(s, 200)
    await dialog(s).locator('input[inputmode="decimal"], input[inputmode="numeric"]').last().fill('120')
    await s.locator('[data-testid="option-save"]').click(); await settle(s, 2000)
    const up = sql(`select o.source || '|' || o.price_minor || '|' || f.thumb || '|' || (select count(*) from lead_file_images i where i.file_id = f.id) from project_selection_options o join lead_files f on f.id = o.file_id where o.selection_id='${newId()}' and o.name='Terrazzo, grey'`)
    ok(/^upload\|-12000\|\/files\/img\/[^|]+\|1$/.test(up), 'an upload’s picture is stored as the lead’s Files store pictures (its bytes beside it), −S$120')
    ok(await nc.locator('[data-testid="choice-option"]').count() === 4, 'four options, one from each source')
    // reorder, remove + Undo
    const order = () => sql(`select group_concat(name, '|') from (select name from project_selection_options where selection_id='${newId()}' and deleted_at is null order by position)`)
    const before = order()
    await nc.locator('[data-testid="choice-option"]').nth(1).locator('[data-testid="option-kebab"]').click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Move earlier' }).click(); await settle(s, 1200)
    const after = order()
    ok(after.split('|')[0] === before.split('|')[1] && after.split('|')[1] === before.split('|')[0], 'Move earlier swaps the first two')
    await nc.locator('[data-testid="choice-option"]').last().locator('[data-testid="option-kebab"]').click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Remove' }).click(); await settle(s, 1200)
    ok(await nc.locator('[data-testid="choice-option"]').count() === 3 && /removed/.test(await snack(s).innerText()), 'Remove takes it off, with Undo')
    /* (fix-C, C-12) the move answers with its own snackbar and Undo too — Remove's is the newest */
    await snack(s).getByRole('button', { name: 'Undo' }).last().click(); await settle(s, 1500)
    ok(await nc.locator('[data-testid="choice-option"]').count() === 4 && order() === after, 'Undo puts it back where it was')
    // share + Undo, share again
    await nc.locator('[data-testid="choice-share"]').click(); await settle(s, 1200)
    ok(sql(`select status from project_selections where id='${newId()}'`) === 'shared' && /Shared — Benjamin can choose on the portal/.test(await snack(s).innerText())   /* (fix-C, C-28) the client named, "the portal" */, 'Share with Benjamin: one press, it is on his portal')
    ok(sql(`select count(*) from notification_outbox where key like 'c:client_choice:${newId()}:%:email'`) !== '0', 'sharing tells him: “A choice to make”, by email (simplify S-21 · Q-13)')
    await snack(s).getByRole('button', { name: 'Undo' }).last().click(); await settle(s, 1500)
    ok(sql(`select status || '|' || coalesce(shared_at,'') from project_selections where id='${newId()}'`) === 'draft|' && sql(`select count(*) from lead_events where project_id='${BEN_P}' and kind='project_choice_shared' and json_extract(detail,'$.id')='${newId()}'`) === '0', 'Undo: a Draft again, and the share’s line goes with it')
    await nc.locator('[data-testid="choice-share"]').click(); await settle(s, 1500)
    ok(sql(`select status from project_selections where id='${newId()}'`) === 'shared', 'shared again')
    // See it as the client (the studio's own preview)
    await nc.locator('[data-testid="choice-kebab"]').click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'See it as the client' }).click(); await settle(s, 700)
    ok(await s.locator('[data-testid="choice-preview"] [data-testid="portal-choice-option"]').count() === 4 && (await s.locator('[data-testid="choice-preview"]').innerText()).includes(clientAdds(35_000)), `See it as the client: the portal’s card, the price in the client’s words ("${clientAdds(35_000)}")`)
    await shot(s, 'see-as-client-1440', false)
    await dialog(s).getByRole('button', { name: 'Close', exact: true }).last().click(); await settle(s, 400)

    // ── The portal's preview records nothing ───────────────────────────────────────────────────────────────────────────────
    console.log('See it as the client — the portal preview')
    const evBefore = sql(`select count(*) from lead_events where lead_id='${BEN}'`)
    const PV = await desk(); const pv = await PV.newPage(); watch(pv, 'preview')
    await go(pv, `/my/demo-studio/preview?client=${BEN}`)
    ok(await pv.locator('[data-testid="portal-preview-bar"]').isVisible(), 'the preview opens the real portal with its strip')
    ok(await pv.locator('[data-testid="portal-need"][data-kind="choice"]').count() === 2, 'What needs you lists the two choices waiting')
    const pvAt = (/\/my\/[^/?#]+/.exec(new URL(pv.url()).pathname) || ['/my/demo-studio'])[0]   // fix-G G-03: a preview rides in its own address, /my/<slug>~<id>
    await go(pv, `${pvAt}/choices`)
    await pickBoard(pv, 'Paint colours', 'Sage Whisper')
    ok(await pv.locator('[data-testid="portal-choice-confirm"]').first().isDisabled() && /A preview — your choice isn’t saved/.test(await pv.locator('main').innerText()), 'in a preview an option can be tapped, Confirm stays off')
    await shot(pv, 'portal-preview-1440')
    await PV.close()
    ok(sql(`select status from project_selections where id='${PAINT}'`) === 'shared' && sql(`select count(*) from lead_events where lead_id='${BEN}'`) === evBefore && sql(`select coalesce(last_opened_at,'null') from homeowner_lead_links where lead_id='${BEN}'`) === LINK_WAS, 'the preview recorded nothing as his')

    // ── The client chooses on his phone ───────────────────────────────────────────────────────────────────────────────────
    console.log('Benjamin chooses (390)')
    const C = await phone(); const c = await C.newPage(); watch(c, 'client')
    await signIn(c)
    const needs = await c.locator('[data-testid="portal-need"][data-kind="choice"]').allInnerTexts()
    ok(needs.some((t) => /Choose your paint colours/.test(t) && reOf(`3 options · needed by ${PAINT_NEEDED}`).test(t)), `What needs you: "Choose your paint colours · 3 options · needed by ${PAINT_NEEDED}" (the canvas’s row)`)
    ok((await sections(c)).more.includes('choices') && await c.locator('[data-testid="portal-more-dot"]').count() === 1, 'Choices in More, and More wears the dot while a choice waits on him (REG-1050)')
    await shot(c, 'portal-home-390')
    await c.locator('[data-testid="portal-need"][data-kind="choice"]', { hasText: 'paint colours' }).click(); await c.waitForURL(/\/choices/); await settle(c, 1600)
    ok(await c.locator('[data-testid="portal-choice"]').count() === 3 && await noOverflow(c), 'his Choices: two waiting, one chosen — no sideways scroll at 390')
    await shot(c, 'portal-choices-390')
    const stale = await C.newPage(); watch(stale, 'stale'); await go(stale, '/my/demo-studio/choices')
    const board = await pickBoard(c, 'Paint colours', 'Sage Whisper')
    ok((await board.locator('[data-testid="portal-choice-notice"]').innerText()).includes(clientNotice('Sage Whisper', 24_000)), `an option that adds says so before he confirms — "${clientNotice('Sage Whisper', 24_000)}"`)
    await board.locator('input').fill('Sage for every room, please')
    await shot(c, 'portal-picked-390', false)
    await board.locator('[data-testid="portal-choice-confirm"]').click(); await settle(c, 1800)
    ok(/Demo Studio has your choice: Sage Whisper/.test(await snack(c).innerText()), 'Confirm Sage Whisper — "Thank you — Demo Studio has your choice"')
    const row = sql(`select status || '|' || chosen_by || '|' || chosen_note || '|' || (select name from project_selection_options where id = chosen_option_id) from project_selections where id='${PAINT}'`)
    ok(row === 'chosen|client|Sage for every room, please|Sage Whisper', 'kept by the option’s id, as the client’s, with his note')
    ok(/You chose Sage Whisper/.test(await c.locator('[data-testid="portal-choice"]', { has: c.locator('h3', { hasText: 'Paint colours' }) }).innerText()), 'the card now says what he chose')
    /* (simplify S-21) his priced pick drafts its variation order by itself — a Draft, never on his page */
    ok(sql(`select status || '|' || kind from quotes where selection_id='${PAINT}' and deleted_at is null`) === 'Draft|variation', 'his priced pick drafts its variation order — a Draft the studio sends (simplify S-21)')
    /* (simplify round 2, R2-A, a deliberate change of this rule) the draft is the project's own — prepared by its first member, its Activity line
       no member's — whoever is signed in to the studio (View as) */
    ok(sql(`select prepared_by from quotes where selection_id='${PAINT}' and deleted_at is null`) === sql(`select a.member_id from lead_assignees a join members m on m.id = a.member_id where a.lead_id='${BEN}' and m.is_active = 1 order by a.assigned_at limit 1`)
       && sql(`select coalesce(e.actor_id, 'none') from lead_events e join quotes q on json_extract(e.detail, '$.id') = q.id where q.selection_id='${PAINT}' and q.deleted_at is null and e.kind='project_vo_created'`) === 'none', 'the pick’s order is drafted as the project’s first member, its Activity line no member’s (simplify round 2, R2-A)')
    await shot(c, 'portal-chosen-390')
    // a second choice from the stale page — refused on the server
    await pickBoard(stale, 'Paint colours', 'Warm White')
    await stale.locator('[data-testid="portal-choice"]', { has: stale.locator('h3', { hasText: 'Paint colours' }) }).locator('[data-testid="portal-choice-confirm"]').click(); await settle(stale, 1500)
    ok(/You chose Sage Whisper already/.test(await snack(stale).innerText()) && sql(`select (select name from project_selection_options where id = chosen_option_id) from project_selections where id='${PAINT}'`) === 'Sage Whisper', 'a second choice is refused on the server — the first stands')
    // taken back while he looks — refused
    await go(stale, '/my/demo-studio/choices')
    await go(s, `/projects/${BEN_P}/choices`)
    await card(s, NEW).locator('[data-testid="choice-kebab"]').click(); await settle(s, 300)
    await s.getByRole('menuitem', { name: 'Take back' }).click(); await settle(s, 1500)
    ok(sql(`select status from project_selections where id='${newId()}'`) === 'draft', 'Take back: a Draft again')
    await pickBoard(stale, NEW, 'Terrazzo')
    await stale.locator('[data-testid="portal-choice"]', { has: stale.locator('h3', { hasText: NEW }) }).locator('[data-testid="portal-choice-confirm"]').click(); await settle(stale, 1500)
    ok(/took this back/.test(await snack(stale).innerText()) && sql(`select status from project_selections where id='${newId()}'`) === 'draft', 'a choice taken back is refused on the server')
    const undo = snack(s).getByRole('button', { name: 'Undo' }).last()
    if (await undo.isVisible().catch(() => false)) await undo.click()
    else await card(s, NEW).locator('[data-testid="choice-share"]').click()
    await settle(s, 1500)
    ok(sql(`select status from project_selections where id='${newId()}'`) === 'shared', 'shared again (Take back’s Undo)')
    // a paused portal — refused
    await go(stale, '/my/demo-studio/choices')
    await pickBoard(stale, NEW, 'Terrazzo')
    sql(`update settings set value=json_set(value,'$.paused',json('true')) where key='portal'`)
    await stale.locator('[data-testid="portal-choice"]', { has: stale.locator('h3', { hasText: NEW }) }).locator('[data-testid="portal-choice-confirm"]').click(); await settle(stale, 1500)
    ok(/portal is paused/.test(await snack(stale).innerText()) && sql(`select status from project_selections where id='${newId()}'`) === 'shared', 'a paused portal refuses the pick on the server')
    sql(`update settings set value=json_set(value,'$.paused',json('false')) where key='portal'`)

    // ── The studio sees it: the card, the bell, Activity ─────────────────────────────────────────────────────────────────
    console.log('The studio sees it')
    await go(s, `/projects/${BEN_P}/choices`)
    const p2 = card(s, 'Paint colours')
    ok(/Benjamin chose Sage Whisper/.test(await p2.locator('[data-testid="choice-pick"]').innerText()) && /Sage for every room/.test(await p2.innerText()), 'the studio sees his pick and his note')
    ok((await p2.locator('[data-testid="choice-contract"]').innerText()).includes(contractLine(24_000)), 'the difference shows on the card, GST as its variation order adds it')
    ok(sql(`select count(*) from notifications where kind='choice_made' and member_id='dane' and created_at >= ${START} and title like 'Benjamin Han chose Sage Whisper for Paint colours'`) === '1', 'a bell row for the team (Dane)')
    await s.locator('[data-notifications-tile]').first().click(); await settle(s, 900)
    ok(/chose Sage Whisper for Paint colours/.test(await s.locator('[data-testid="notifications-panel"]').innerText()), 'the bell lists it')
    await shot(s, 'bell-1440', false)
    await s.keyboard.press('Escape'); await settle(s, 300)
    await go(s, `/projects/${BEN_P}/activity`)
    const act = s.locator('[data-testid="activity-row"]', { hasText: 'chose “Sage Whisper” for “Paint colours”' }).first()
    ok(await act.isVisible() && /Sage for every room/.test(await act.locator('[data-testid="activity-card"]').innerText()) && (await act.innerText()).includes(contractLine(24_000)), 'Activity files the pick as a small summary card — the same figure')
    await act.scrollIntoViewIfNeeded(); await shot(s, 'activity-1440', false)

    // ── Choice overdue and the waiting line ────────────────────────────────────────────────────────────────────────────────
    console.log('Choice overdue')
    const yday = Number(sql(`select strftime('%s', date('now','localtime','-1 day'), 'utc')`))
    sql(`update project_selections set needed_by=${yday} where id='${newId()}'`)
    await go(s, `/projects/${BEN_P}`)
    /* (simplify S-01 · S-05, a deliberate change of this rule) the client's lateness is With Benjamin's — neutral, his own words, with Remind; the
       listing's Needs attention still raises it (below) */
    const status = await s.locator('section[data-card="with-client"]').innerText()
    ok(/bathroom tiles/i.test(status) && await s.locator('section[data-card="with-client"] [data-testid="with-remind"]').count() >= 1, 'With Benjamin names it, with Remind')
    await s.locator('section[data-card="with-client"]').scrollIntoViewIfNeeded(); await shot(s, 'overview-attention-1440', false)
    await go(s, '/projects')
    ok(await s.locator('[data-attention]', { hasText: 'Benjamin' }).count() === 1, 'the listing raises Benjamin’s project')
    sql(`update project_selections set needed_by=null where id='${newId()}'`)

    // ── Choose with the client, change a pick ──────────────────────────────────────────────────────────────────────────────
    console.log('Choose with the client · change a pick')
    await go(s, `/projects/${BEN_P}/choices`)
    await card(s, NEW).locator('[data-testid="choice-choose"]').click(); await settle(s, 500)
    ok(await dialog(s).locator('input').last().inputValue() === 'Chosen with the client on a call', 'the note reads "Chosen with the client on a call"')
    await s.locator('[data-testid="choose-option"]', { hasText: 'Walnut vinyl plank' }).click(); await settle(s, 200)
    ok((await s.locator('[data-testid="choose-contract"]').innerText()).includes(contractLine(35_000)), 'the dialog says what the pick does to the contract')
    await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1500)
    ok(sql(`select chosen_by || '|' || chosen_member_id || '|' || chosen_note from project_selections where id='${newId()}'`) === 'studio|dane|Chosen with the client on a call', 'the studio’s pick: by Dane, with the client, its note')
    ok(/Chosen with Benjamin/.test(await card(s, NEW).locator('[data-testid="choice-pick"]').innerText()) && (await card(s, NEW).locator('[data-testid="choice-contract"]').innerText()).includes(contractLine(35_000)), `the card: "Chosen with Benjamin" and "${contractLine(35_000)}"`)
    await card(s, 'Paint colours').locator('[data-testid="choice-change"]').click(); await settle(s, 500)
    await s.locator('[data-testid="choose-option"]', { hasText: 'Warm White' }).click(); await settle(s, 200)
    await s.locator('[data-testid="choose-save"]').click(); await settle(s, 1500)
    ok(sql(`select (select name from project_selection_options where id = chosen_option_id) || '|' || chosen_by from project_selections where id='${PAINT}'`) === 'Warm White|studio', 'Change the pick (Painting has not started): Warm White')
    ok(sql(`select json_extract(detail,'$.from') from lead_events where project_id='${BEN_P}' and kind='project_choice_changed' and at >= ${START}`) === 'Sage Whisper', 'the change is a line in Activity, from Sage Whisper')
    ok(/No change to the price/.test(await card(s, 'Paint colours').locator('[data-testid="choice-contract"]').innerText()), 'Warm White changes nothing on the contract')
    await shot(s, 'after-1440')

    // ── Phone: the studio's tab, the client's desk view ────────────────────────────────────────────────────────────────────
    console.log('Phone and desk views')
    const SP = await phone(); const sp = await SP.newPage(); watch(sp, 'studio-phone')
    await go(sp, `/projects/${BEN_P}/choices`)
    ok(await sp.locator('[data-testid="choice-card"]').count() === 3 && await noOverflow(sp), 'the studio’s tab on a phone: three choices, no sideways scroll')
    await shot(sp, 'tab-390')
    await sp.locator('[data-testid="choice-card"]').first().locator('[data-testid="choice-kebab"]').click(); await settle(sp, 600)
    await shot(sp, 'menu-sheet-390', false)
    const CD = await desk(); const cd = await CD.newPage(); watch(cd, 'client-desk')
    await signIn(cd); await go(cd, '/my/demo-studio/choices')
    ok(await cd.locator('[data-testid="portal-nav"] a[data-key="choices"]').isVisible() && await noOverflow(cd), 'at a desk Choices sits in the portal’s bar')
    await shot(cd, 'portal-choices-1440')
    await go(s, `/projects/${AISHA_P}/choices`)
    ok(/Draft/.test(await s.locator('[data-testid="choice-band"]').first().innerText()) && await s.locator('[data-testid="choice-card"]').count() === 1, 'Aisha Rahman’s project: one Draft')
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 400))
  } finally {
    const id = newId()
    const sels = sql(`select group_concat(quote(id)) from project_selections where project_id='${BEN_P}' and title='${NEW}'`)
    if (sels) {
      sql(`delete from lead_file_images where file_id in (select file_id from project_selection_options where selection_id in (${sels}) and file_id is not null)`)
      sql(`delete from lead_files where id in (select file_id from project_selection_options where selection_id in (${sels}) and file_id is not null)`)
      sql(`delete from project_selection_options where selection_id in (${sels})`)
      sql(`delete from project_selections where id in (${sels})`)
    }
    void id
    sql(`update project_selections set status='shared', chosen_option_id=null, chosen_by=null, chosen_member_id=null, chosen_at=null, chosen_note=null, updated_at=shared_at where id='${PAINT}'`)
    sql(`delete from lead_events where project_id='${BEN_P}' and kind like 'project_choice_%' and at >= ${START}`)
    /* (simplify S-21) the variation order his pick drafted, its line and its record; the "A choice to make" messages */
    sql(`delete from quote_items where quote_id in (select id from quotes where project_id='${BEN_P}' and kind='variation' and created_at >= ${START})`)
    sql(`delete from lead_events where project_id='${BEN_P}' and kind='project_vo_created' and at >= ${START}`)
    sql(`delete from quotes where project_id='${BEN_P}' and kind='variation' and created_at >= ${START}`)
    sql(`delete from notification_outbox where key like 'c:client_choice:%' and created_at >= ${START}`)
    sql(`delete from lead_events where lead_id='${BEN}' and kind='portal_opened' and at >= ${START}`)
    sql(`delete from notifications where kind='choice_made' and created_at >= ${START}`)
    sql(`delete from portal_sessions where created_at >= ${START}`)
    sql(`update homeowner_lead_links set last_opened_at=${LINK_WAS} where lead_id='${BEN}'`)
    sql(`update settings set value=json_set(value,'$.paused',json('false')) where key='portal'`)
    ok(sql(`select status || '|' || coalesce(shared_at,'') from project_selections where id='${PAINT}'`) === `shared|${PAINT_WAS}`, 'put back: Paint colours waits again')
    await b.close()
    if (errors.length) { console.log('page errors:'); errors.forEach((x) => console.log('   ', x)) }
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail || errors.length ? 1 : 0)
  }
})()
