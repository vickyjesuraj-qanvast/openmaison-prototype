// Pending modules, step S41b-1 · Cost and margin visibility per role (the S41b data sweep's M-03 — 1.0's Cost & Margin Visibility on the Qanvast
// line, `origin/deployment/qanvast` docs/features/cost-visibility/spec.md; the owner's "please make sure nothing left behind from 1.0 to 2.0",
// 2026-10-12). Each item asserted as the rule it builds, never another round's count:
//  - ONE home: Settings › Roles & access › **Who sees costs and margins** — Owners always (a switch on and fixed), then Admins · Managers ·
//    Designers · Accounting; 1.0's default (every role on) changes nothing; the Owner alone changes it (a switch answers one sentence + Undo;
//    the server refuses anyone else and the switch is put back); everyone else reads it with the rule's line; Who may do what's cost rows follow
//  - a hidden member's pages and server actions never carry a quote line's cost, mark-up or rebate, a book item's cost, or the books' profit —
//    read from the payload itself (the page's HTML / RSC data and every server action's response) for known values
//  - a hidden member's writes keep the stored cost: a price edit moves only the mark-up; a removed line brought back by Undo keeps its cost and rebate
//  - the screens leave out what they'd draw from cost: the Cost · Markup columns and their Column settings rows, Set a value's Cost and Markup (%),
//    the Items export's two columns, Maison AI's margin hints, Preview's Internal copy, the price book's Cost · Markup (one Unit price box; History
//    says a price), Order from the quote (a PO's lines from the quote come with no cost); for Admins and Accounting: the P&L and Profitability
//    reports, the Dashboard's Profit tile, a project's Profit tile, the listing's Margin column, Maison AI's margin answer
//  - ghosts draw the card / the columns as the page does; no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s41b1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41b1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s41b1-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, why = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, why ? `— ${why}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const costSetting = () => { const v = sql(`select value from settings where key = 'cost_visibility'`); return v ? JSON.parse(v) : null }

/* the demo's records this probe reads (by name, never a count from another round) */
const lead = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null`)
const QUOTE = sql(`select q.id from quotes q join leads l on l.id = q.lead_id where l.name = 'Olivia Martinez' and q.kind = 'quote' and q.deleted_at is null and q.status = 'Draft' order by q.created_at limit 1`)
const LINE = sql(`select id from quote_items where quote_id = '${QUOTE}' and name = 'TV console and feature wall' and kind = 'item' limit 1`)
const BELOW = sql(`select id from quote_items where quote_id = '${QUOTE}' and name = 'Bathroom tiles, supply and install' and kind = 'item' limit 1`)
const BEN = lead('Benjamin Han')
const BENP = sql(`select id from projects where lead_id = '${BEN}' and deleted_at is null`)
const BENQ = sql(`select quote_id from projects where id = '${BENP}'`)
const BENLINE = sql(`select id from quote_items where quote_id = '${BENQ}' and name = 'Glass shower screen' and kind = 'item' limit 1`)
const ITEM = sql(`select id from price_book_items where name = 'Plumbing works, kitchen and bathrooms' and deleted_at is null and status = 'live' limit 1`)
const TPL = sql(`select id from quote_templates where deleted_at is null and status = 'published' order by is_default desc limit 1`)
/* the known figures — none of them is anyone's price, so a payload that carries one carries a cost */
const COST = 777777, REBATE = 4321, BOOK_COST = 654321, BOOK_WAS = 612345, BEN_COST = 555555
/* a field with its value in a payload — plain JSON (an action's answer) or escaped inside the page's RSC data */
const carries = (t, key, val) => new RegExp(`${key}\\\\?":${val}\\b`).test(t)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = async (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = async (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1300) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800) }
  /* every server action's answer, for the payload checks */
  const actions = []
  const page = async (ctx, tag) => {
    const p = await ctx.newPage()
    p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
    p.on('response', async (r) => { try { const q = r.request(); if (q.method() === 'POST' && q.headers()['next-action']) actions.push({ tag, url: r.url(), body: await r.text() }) } catch { /* a closed page */ } })
    return p
  }
  const html = (p) => p.content()
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const heads = async (p) => (await p.getByRole('columnheader').allInnerTexts()).map((t) => t.replace(/unfold_more|arrow_upward|arrow_downward/g, '').replace(/\s+/g, ' ').trim().toLowerCase())   // heads print in capitals; a sort glyph's name left out
  const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) Who may do what is Roles & access' drawer now (5-04)
  const reach = async (p, row, role) => { await openRoles(p); const v = await p.locator(`[data-testid="may-${row}"] [role="cell"][data-label="${role}"]`).getAttribute('data-reach'); await p.keyboard.press('Escape'); await p.waitForTimeout(450); return v }   // (the calm UI build 2026-10-27, a deliberate change) read, then the drawer closes — the card's switches sit under it
  /* (the calm UI build 2026-10-27, a deliberate change) Reports › Finance's report is one pill (5-20): its menu's rows are the reports this viewer reads */
  const reportsIn = async (p) => { await p.getByTestId('report-chips').getByRole('button').first().click(); await p.waitForTimeout(450); const rows = (await p.getByRole('menuitemradio').allInnerTexts()).map((t) => t.split('\n')[0].trim()).join(' · '); await p.keyboard.press('Escape'); await p.waitForTimeout(300); return `${await text(p.getByTestId('report-chips'))} | ${rows}` }
  const roleSwitch = (p, plural) => p.getByRole('switch', { name: `${plural} see costs and margins` })
  const flip = async (p, plural) => { const sw = roleSwitch(p, plural); await sw.locator('xpath=ancestor::label[1]').click().catch(async () => { await sw.click({ force: true }) }); await settle(p, 1400) }
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 800) }
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const download = async (p, press) => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), press()]); const f = path.join(os.tmpdir(), `pm2-s41b1-${Date.now()}.csv`); await dl.saveAs(f); const t = fs.readFileSync(f, 'utf8'); fs.unlinkSync(f); return t }
  const csvHead = (t) => (t.replace(/^﻿/, '').split(/\r?\n/).find((l) => /Item/.test(l)) ?? '').split(',').map((c) => c.replace(/^"|"$/g, '').trim())
  /* (S17's measure) the reveal's ghost against the page it reveals: each block's place, and the ghost's sentences in the page's own */
  const measure = async (opts, url, blocks, max = 40, screens = 1.5) => {
    const c = await b.newContext(opts)
    await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
    await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
    const out = await p.evaluate(({ blocks, max, screens }) => {
      const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
      if (!reveal) return { none: true }
      const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
      if (!ghost || !content) return { none: true }
      const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
      const collect = (root) => {
        const map = new Map()
        for (const el of root.querySelectorAll('*')) {
          const ks = keyOf(el); if (!ks.length) continue
          const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
          for (const k of ks) { if (!blocks.includes(k)) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
        }
        return map
      }
      const g = collect(ghost), q = collect(content), rows = []
      for (const [k, gs] of g) {
        const ps = q.get(k); if (!ps) continue
        let best = 0, bestCost = Infinity
        for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
        for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight * screens) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
      }
      const words = []
      const pageText = new Map()
      for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
      for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
        const ks = keyOf(el); if (!ks.length) continue
        const t = el.textContent.replace(/\s+/g, ' ').trim()
        if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
      }
      const ghostText = ghost.textContent.replace(/\s+/g, ' ')
      return { rows, words, ghostText }
    }, { blocks, max, screens })
    await c.close()
    return { ...out, errs }
  }
  const SETTINGS = ['settings.setting', 'settings.eventRow', 'settings.sectionHead', 'settings.cardGroup']

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/settings', 1500); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let out = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      out += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) out += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    out += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(out)
    return changed
  }

  try {
    ok(!!QUOTE && !!LINE && !!BELOW && !!BENP && !!BENLINE && !!ITEM, 'the demo has the records this probe reads', [QUOTE, LINE, BELOW, BENP, BENLINE, ITEM].map((x) => (x ? 'ok' : 'missing')).join(' '))
    /* the known figures, set before any page loads */
    sql(`update quote_items set cost_minor = ${COST}, markup_minor = 22223, rebate_minor = ${REBATE} where id = '${LINE}'`)
    sql(`update quote_items set markup_minor = -100 where id = '${BELOW}'`)   // sells under its cost — Maison AI's hint for whoever sees costs
    sql(`update quote_items set cost_minor = ${BEN_COST} where id = '${BENLINE}'`)
    sql(`update price_book_items set cost_minor = ${BOOK_COST} where id = '${ITEM}'`)
    sql(`insert into price_book_changes (id, item_id, kind, changes, note, by, at) values ('probe-s41b1-change', '${ITEM}', 'edited', '{"costMinor":[${BOOK_WAS},${BOOK_COST}]}', null, 'dane', strftime('%s','now'))`)
    sql(`delete from settings where key = 'cost_visibility'`)
    ok(costSetting() === null, 'a studio that never opened it has no setting (every role on, 1.0’s default)')

    // ── 1 · the one home, at its defaults ────────────────────────────────────────────────────────────────────────────────────────
    console.log('1 · Roles & access › Who sees costs and margins — the defaults change nothing')
    as('dane')
    const D = await desk(); const d = await page(D, 'owner')
    await go(d, '/settings?section=studio')
    const card = d.getByTestId('cost-visibility')
    ok(await card.isVisible(), 'the card is on Roles & access')
    const order = await d.evaluate(() => [...document.querySelectorAll('[data-testid="settings-studio"] [data-testid]')].map((e) => e.getAttribute('data-testid')).filter((t) => ['lead-visibility', 'cost-visibility', 'studio-roles'].includes(t)))
    ok(order.join(',') === 'lead-visibility,cost-visibility,studio-roles', 'beside Who may do what — after Who sees leads, before the table', order.join(','))
    ok(/Who sees costs and margins/.test(await text(card)) && /Owners always see them/.test(await text(card)), 'its title and its words: Owners always see them')
    for (const r of ['Admin', 'Manager', 'Designer', 'Accounting']) ok(await card.getByTestId(`cost-role-${r}`).count() === 1, `a row for ${r}`)
    ok(await d.getByRole('switch', { name: 'Owners always see costs and margins' }).isDisabled(), 'the Owners’ switch is on and fixed')
    for (const pl of ['Admins', 'Managers', 'Designers', 'Accounting']) ok(await roleSwitch(d, pl).isChecked(), `${pl}: on by default`)
    for (const [r, want] of [['Owner', 'yes'], ['Admin', 'yes'], ['Manager', 'yes'], ['Designer', 'yes']]) ok(await reach(d, 'cost-line', r) === want, `Who may do what · See a quote line’s cost — ${r}: ${want}`)
    await openRoles(d)   // (the calm UI build 2026-10-27, a deliberate change) the row is in Roles & access' drawer (5-04)
    ok(/Who sees costs and margins, above/.test(await text(d.getByTestId('may-cost-line'))), 'the row says where its rule is set')
    await d.keyboard.press('Escape'); await d.waitForTimeout(450)
    ok(await d.getByTestId('read-only-line').count() === 0 || !(await text(card)).includes('Only the Owner changes'), 'the Owner reads no rule line on it')
    await shot(d, '01-card-owner-1440')
    /* defaults: a Designer still sees a line's cost — nothing changed for a studio that never opened it */
    as('germaine')
    { const C = await desk(); const g = await page(C, 'designer-default'); await go(g, `/quotes/${QUOTE}`, 1800)
      const h = await html(g)
      ok(h.includes(String(COST)), 'at the defaults a Designer’s quote carries the line’s cost (as before)')
      ok((await heads(g)).includes('cost'), 'and its Cost column')
      ok(!new RegExp(`rebateMinor\\\\?":${REBATE}`).test(h), 'but never the Owner’s rebate (REG-596 — on the server now)')
      await C.close() }
    as('dane')

    // ── 2 · the Owner switches Designers off ─────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · the Owner switches a role off — one sentence, Undo, the table follows')
    await go(d, '/settings?section=studio')
    await flip(d, 'Designers')
    ok(/Designers don’t see costs and margins now/.test(await snackText(d)), 'one sentence: Designers don’t see costs and margins now', await snackText(d))
    ok(costSetting()?.designer === false, 'kept: settings.cost_visibility { designer: false }', JSON.stringify(costSetting()))
    ok(await reach(d, 'cost-line', 'Designer') === 'no', 'Who may do what follows at once — Designer: No')
    await undo(d)
    ok(costSetting()?.designer === true && await roleSwitch(d, 'Designers').isChecked(), 'Undo puts it back on')
    await flip(d, 'Designers'); await flip(d, 'Managers')
    ok(costSetting()?.designer === false && costSetting()?.manager === false, 'Designers and Managers off')

    // ── 3 · a hidden Designer's quote ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · a Designer who doesn’t see costs — the quote editor')
    as('germaine')
    const G = await desk(); const g = await page(G, 'designer')
    await go(g, `/quotes/${QUOTE}`, 2000)
    let h = await html(g)
    ok(!h.includes(String(COST)), 'the page’s payload carries no cost of the line (777777)')
    ok(!new RegExp(`rebateMinor\\\\?":${REBATE}`).test(h), 'nor its rebate')
    ok(/\\?"markupMinor\\?":800000/.test(h), 'the line comes with its price whole (cost folded into it)')
    const hs = await heads(g)
    ok(!hs.includes('cost') && !hs.includes('markup') && !hs.includes('margin'), 'no Cost · Markup · Margin columns', hs.join(' | '))
    ok(hs.includes('unit price'), 'the Unit Price column stays')
    ok(await g.getByTestId('below-cost').count() === 0, 'no Below cost tag')
    await g.locator('#section-items').getByRole('button', { name: 'More options for Items' }).first().click(); await settle(g, 300); await g.getByRole('menuitem', { name: 'Column settings' }).click(); await settle(g, 600)   // (the calm UI build 2026-10-27, a deliberate change) 4-03: Column settings is the Items ⋮'s row
    ok(await g.getByRole('switch', { name: 'Show Cost column' }).count() === 0 && await g.getByRole('switch', { name: 'Show Markup column' }).count() === 0, 'Column settings offers neither')
    await g.getByRole('button', { name: 'Done' }).last().click(); await settle(g, 500)
    await g.getByLabel('Select TV console and feature wall').first().click({ force: true }); await settle(g, 500)
    await g.getByRole('button', { name: 'Set value' }).first().click(); await settle(g, 700)
    const sv = g.getByRole('dialog', { name: /Set a value/ })
    await sv.getByLabel('Field').first().click(); await settle(g, 400)
    const fields = await g.getByRole('option').allInnerTexts()
    ok(fields.length > 0 && !fields.some((x) => /Cost|Markup/.test(x)) && fields.some((x) => /Unit Price/.test(x)), 'Set a value offers no Cost or Markup (%) — Unit Price stays', fields.join(' | '))
    await g.keyboard.press('Escape'); await settle(g, 300); await g.keyboard.press('Escape'); await settle(g, 400)
    if (await sv.isVisible().catch(() => false)) await sv.getByRole('button', { name: 'Cancel' }).click()
    await g.getByLabel('Select TV console and feature wall').first().click({ force: true }); await settle(g, 400)
    await shot(g, '02-editor-designer-hidden-1440')
    /* the price, edited: the stored cost stays */
    const price = g.getByLabel('Unit price of TV console and feature wall').first()
    await price.click(); await price.fill('9000'); await price.press('Tab'); await settle(g, 2200)
    let line = json(`select cost_minor c, markup_minor m, rebate_minor r from quote_items where id = '${LINE}'`)[0]
    ok(line && line.c === COST && line.m === 900000 - COST && line.r === REBATE, 'a price edit keeps the stored cost and rebate — the mark-up takes the change', JSON.stringify(line))
    /* removed, then Undo: the line comes back with its cost */
    await g.getByRole('button', { name: 'More options for TV console and feature wall' }).first().click(); await settle(g, 500)
    await g.getByRole('menuitem', { name: 'Remove' }).click(); await settle(g, 600)
    await g.getByRole('dialog', { name: 'Remove this item?' }).getByRole('button', { name: 'Remove' }).click(); await settle(g, 1600)
    ok(sql(`select count(*) from quote_items where id = '${LINE}'`) === '0', 'Remove takes the line off')
    await g.locator('#section-items').getByRole('button', { name: 'More options for Items' }).first().click(); await settle(g, 300); await g.getByRole('menuitem', { name: 'Undo' }).click(); await settle(g, 2500)   // the Items table's own Undo (⌘Z) — (the calm UI build 2026-10-27, a deliberate change) 4-03: the Items ⋮'s row
    line = json(`select cost_minor c, markup_minor m, rebate_minor r from quote_items where id = '${LINE}'`)[0]
    ok(line && line.c === COST && line.m === 900000 - COST && line.r === REBATE, 'Undo brings it back with its cost and rebate (kept on the server, never sent)', JSON.stringify(line))
    /* Maison AI: no margin hints */
    await fab(g)
    const sh = await text(sheet(g))
    ok(!/below cost|margin|markup/i.test(sh), 'Maison AI offers no cost or margin hint', sh.slice(0, 160))
    await g.keyboard.press('Escape'); await settle(g, 500)
    /* the export: no Cost · Markup */
    await g.getByRole('button', { name: /^(Export As|Export…)$/ }).first().click(); await settle(g, 600)   // (the calm UI build 2026-10-27, a deliberate change) W-185: "Export…"
    const csv = await download(g, () => g.getByRole('dialog', { name: 'Export Items' }).getByRole('button', { name: 'Export' }).click())
    const head = csvHead(csv)
    ok(head.includes('Unit Price') && !head.includes('Cost') && !head.includes('Markup'), 'Export Items: no Cost or Markup column', head.join(' | '))
    ok(!csv.includes('7777.77'), 'and no cost in its rows')
    ok(!actions.filter((a) => a.tag === 'designer').some((a) => a.body.includes(String(COST)) || carries(a.body, 'rebateMinor', REBATE)), 'no server action answered this Designer with the line’s cost or rebate', `${actions.filter((a) => a.tag === 'designer').length} answers read`)
    /* Preview: no Internal copy, no cost */
    await go(g, `/quotes/${QUOTE}/preview`, 1800)
    h = await html(g)
    ok(!h.includes(String(COST)) && !carries(h, 'rebateMinor', REBATE), 'Preview’s payload carries no cost or rebate')
    ok(await g.getByText('Internal copy', { exact: true }).count() === 0, 'and no Internal copy switch')
    /* the template editor's Preview with */
    if (TPL) {
      await go(g, `/templates/${TPL}?quote=${QUOTE}`, 1800)
      ok(!(await html(g)).includes(String(COST)), 'the template editor’s Preview with carries no cost')
    }

    // ── 4 · the price book ───────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · a Designer who doesn’t see costs — Company › Price book')
    await g.evaluate(() => { try { localStorage.setItem('om.price-book-items.list', '1') } catch { /* a convenience */ } })
    await go(g, '/company/price-book', 1800)
    h = await html(g)
    ok(!h.includes(String(BOOK_COST)), 'My Items’ payload carries no item cost (654321)')
    const bh = await heads(g)
    ok(!bh.includes('cost') && !bh.includes('markup') && bh.includes('unit price'), 'the list: Unit price, no Cost · Markup', bh.join(' | '))
    await go(g, `/company/price-book?open=${ITEM}`, 1800)   // (REG-709) the record opens on arrival, wherever its folder is
    const dlg = g.getByTestId('item-dialog')
    const dt = await text(dlg)
    ok(/Unit price \(S\$\)/.test(dt) && !/Cost \(S\$\)|Markup \(S\$\)/.test(dt), 'the item opens with one Unit price box — no Cost, no Markup', dt.slice(0, 200))
    const hist = await text(g.getByTestId('item-history'))
    ok(/Unit price/.test(hist) && !/\bCost\b|Markup/.test(hist), 'History says the price moved — never the cost', hist.slice(0, 200))
    ok(!actions.filter((a) => a.tag === 'designer').some((a) => a.body.includes(String(BOOK_COST)) || a.body.includes(String(BOOK_WAS))), 'History’s answer carries neither cost (612345 → 654321)')
    await shot(g, '03-price-book-item-designer-1440')
    await g.keyboard.press('Escape'); await settle(g, 600)
    await g.getByRole('button', { name: 'More options' }).first().click(); await settle(g, 500)
    await g.getByRole('menuitem', { name: /Export My Items/ }).click(); await settle(g, 700)
    const bcsv = await download(g, () => g.getByRole('dialog', { name: 'Export My Items' }).getByRole('button', { name: 'Export' }).click())
    const bhd = csvHead(bcsv)
    ok(bhd.includes('Unit price') && !bhd.includes('Cost') && !bhd.includes('Markup'), 'Export My Items: no Cost or Markup column', bhd.join(' | '))

    // ── 5 · a project's Money ────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · a Designer who doesn’t see costs — a project’s Money')
    await go(g, `/projects/${BENP}/money`, 2000)
    h = await html(g)
    ok(!h.includes(String(BEN_COST)), 'the Money tab’s payload carries no quote line cost (555555)')
    await g.getByTestId('money-new').first().click(); await settle(g, 600)
    const menu = (await g.getByRole('menuitem').allInnerTexts()).join(' | ')
    ok(/Purchase order/.test(menu) && !/Order from the quote/.test(menu), 'New ▾: Purchase order, no Order from the quote', menu.slice(0, 200))
    await g.getByRole('menuitem', { name: /^Purchase order/ }).first().click(); await settle(g, 600)   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */
    if (await g.locator('[data-testid="money-new-level"]').count()) { ok(!/Order from the quote/.test((await g.getByRole('menuitem').allInnerTexts()).join(' | ')), 'Purchase order’s ways: no Order from the quote'); await g.getByRole('menuitem', { name: /^New purchase order/ }).first().click(); await settle(g, 1200) }
    await g.getByTestId('po-from-quote').click(); await settle(g, 900)
    const lines = g.getByTestId('po-quote-line')
    ok(await lines.count() > 0 && !/S\$/.test(await text(g.getByTestId('po-quote-lines'))), 'Add from the quote lists the lines and their quantities — no amounts')
    await lines.filter({ hasText: 'Glass shower screen' }).first().click(); await settle(g, 300)
    await g.getByTestId('po-quote-add').click(); await settle(g, 800)
    const po = await text(g.getByRole('dialog', { name: 'New purchase order' }))
    ok(/From the quote/.test(po) && !/at a cost of/.test(po) && !po.includes('5,555.55'), 'the PO line from the quote says no cost — its price is the vendor’s, to enter', po.slice(0, 220))
    await shot(g, '04-po-designer-hidden-1440')
    await g.keyboard.press('Escape'); await settle(g, 600)
    ok(!actions.filter((a) => a.tag === 'designer').some((a) => a.body.includes(String(BEN_COST))), 'no action answered with the quote line’s cost')
    await G.close()

    // ── 6 · Admins and Accounting off: the books' profit and margin ──────────────────────────────────────────────────────────────
    console.log('6 · Admins and Accounting off — the books keep their records, never the profit')
    as('dane')
    await go(d, '/settings?section=studio')
    await flip(d, 'Admins'); await flip(d, 'Accounting')
    ok(costSetting()?.admin === false && costSetting()?.accounting === false, 'Admins and Accounting off', JSON.stringify(costSetting()))
    ok(await reach(d, 'profit-see', 'Admin') === 'no' && await reach(d, 'profit-see', 'Accounting') === 'no' && await reach(d, 'profit-see', 'Owner') === 'yes', 'Who may do what · profit and margin: Owner yes · Admin no · Accounting no')
    ok(await reach(d, 'cost-figures', 'Admin') === 'yes' && await reach(d, 'cost-figures', 'Accounting') === 'yes', 'cost totals and vendors’ balances stay the books’ (1.0: POs keep their vendor amounts)')
    as('huimin')
    const A = await desk(); const a = await page(A, 'admin')
    await go(a, '/settings?section=studio')
    ok(/Only the Owner changes who sees costs and margins/.test(await text(a.getByTestId('cost-visibility'))), 'an Admin reads the card with the rule’s line')
    ok(await roleSwitch(a, 'Designers').isDisabled(), 'its switches are theirs to read only')
    await shot(a, '05-card-admin-1440')
    await go(a, '/company/reports/finance?report=pl', 2000)
    const chips = await reportsIn(a)
    ok(!/Profit and loss|Profitability/.test(chips) && /Report: To collect/.test(chips), 'Reports › Finance: no Profit and loss, no Profitability — To collect opens (was Owed to you, §2)', chips.slice(0, 200))
    h = await html(a)
    const profits = [...h.matchAll(/\\?"profitMinor\\?":(-?\d+)/g)].map((m) => Number(m[1]))
    ok(profits.length > 0 && profits.every((x) => x === 0), 'its payload carries no project’s profit', `${profits.length} profits, ${profits.filter((x) => x).length} non-zero`)
    await shot(a, '06-reports-admin-hidden-1440')
    await go(a, '/dashboard', 2000)
    const tiles = await text(a.getByTestId('stands-tiles'))
    ok(tiles.length > 0 && !/Profit this month/.test(tiles), 'the Dashboard: no Profit this month tile', tiles.slice(0, 160))
    await go(a, '/tasks', 1500); await fab(a)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field — the floating button steps aside there (Q-02)
    { const box = sheet(a).locator('[data-testid="maison-ask"] input'); await box.fill('Which projects have the thinnest margins?'); await box.press('Enter') }
    await a.waitForFunction(() => [...document.querySelectorAll('[role="dialog"][aria-label="Maison AI suggestions"] [data-testid="maison-answer"]')].some((e) => /hidden for your role|margins by project/i.test(e.textContent || '')), null, { timeout: 20000 }).catch(() => {})
    ok(/Profit and margin are hidden for your role/.test(await text(sheet(a).locator('[data-testid="maison-answer"]'))), 'Maison AI: “Profit and margin are hidden for your role”')
    await a.keyboard.press('Escape'); await settle(a, 500)
    await go(a, `/projects/${BENP}/money`, 2000)
    ok(await a.getByTestId('tile-collect').count() === 1 && await a.getByTestId('tile-pay').count() === 1 && await a.getByTestId('tile-profit').count() === 0, 'a project’s Money: To collect and To pay, no Profit tile')
    h = await html(a)
    ok(![...h.matchAll(/\\?"profitMinor\\?":(-?\d+)/g)].some((m) => Number(m[1]) !== 0), 'and no profit in its payload')
    await go(a, `/quotes/${QUOTE}`, 1800)
    ok(!(await heads(a)).includes('cost') && !(await html(a)).includes(String(COST)), 'an Admin switched off: no Cost column, no cost in the payload')
    await go(a, '/projects', 1800)
    await a.getByRole('button', { name: 'Column settings' }).first().click(); await settle(a, 700)
    ok(await a.getByRole('switch', { name: 'Show Margin column' }).count() === 0, 'the Projects listing: no Margin column to switch on')
    await a.keyboard.press('Escape'); await settle(a, 400)
    await A.close()
    as('priya')
    { const C = await desk(); const k = await page(C, 'accounting')
      await go(k, '/company/reports/finance', 2000)
      ok(!/Profit and loss|Profitability/.test(await reportsIn(k)), 'Accounting switched off: no Profit and loss, no Profitability')
      await go(k, '/dashboard', 2000)
      /* (the calm pass 2026-10-26, a deliberate change — lane C1) the figure names its month: "Profit · October" */
      ok(!/Profit this month|Profit · /i.test(await text(k.getByTestId('stands-tiles'))), 'and no Profit tile on the Dashboard')
      await C.close() }

    // ── 7 · the server refuses anyone but the Owner ──────────────────────────────────────────────────────────────────────────────
    console.log('7 · only the Owner changes it — the server says so, the switch is put back')
    as('dane')
    await go(d, '/settings?section=studio')
    as('huimin')   // the page is the Owner's; the member behind it is an Admin now
    const was = JSON.stringify(costSetting())
    await flip(d, 'Designers')
    ok(/Couldn’t change who sees costs — Only the Owner changes who sees costs and margins/.test(await snackText(d)), 'refused with the rule', await snackText(d))
    ok(JSON.stringify(costSetting()) === was && !(await roleSwitch(d, 'Designers').isChecked()), 'nothing kept; the switch is put back')
    as('dane')

    // ── 8 · back on: everything as it was ────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · back on — a Designer sees costs again')
    await go(d, '/settings?section=studio')
    for (const pl of ['Designers', 'Managers', 'Admins', 'Accounting']) await flip(d, pl)
    const back = costSetting()
    ok(back && back.admin && back.manager && back.designer && back.accounting, 'every role on again', JSON.stringify(back))
    as('germaine')
    { const C = await desk(); const p = await page(C, 'designer-back'); await go(p, `/quotes/${QUOTE}`, 1800)
      ok((await heads(p)).includes('cost') && (await html(p)).includes(String(COST)), 'a Designer’s Cost column and costs are back')
      await C.close() }
    as('dane')

    // ── 9 · the ghosts, every width ──────────────────────────────────────────────────────────────────────────────────────────────
    console.log('9 · the ghosts draw the page as it now looks; no sideways scroll')
    sql(`insert into settings (key, value, updated_at) values ('cost_visibility', '{"admin":true,"manager":false,"designer":false,"accounting":true}', strftime('%s','now')) on conflict(key) do update set value = excluded.value`)
    for (const [who, label] of [['dane', 'owner'], ['germaine', 'designer']]) {
      as(who)
      for (const [w, opts] of [['1440', { viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }]]) {
        const m = await measure(opts, '/settings?section=studio', SETTINGS, 40, 2)
        if (m.none) { ok(false, `${w} ${label}: a reveal ghost to compare`); continue }
        const off = m.rows.filter((x) => Math.abs(x.dy) > 4)
        ok(m.rows.length > 0 && off.length === 0, `${w} ${label}: Roles & access — the ghost’s ${m.rows.length} blocks stand where the page’s land`, off.slice(0, 3).map((x) => `${x.k}#${x.i} Δy ${x.dy}`).join(' · '))
        ok(m.words.length === 0, `${w} ${label}: every ghost sentence is the page’s`, m.words.slice(0, 2).join(' · '))
        ok(/Who sees costs and margins/.test(m.ghostText) && (label === 'owner' ? !/Only the Owner changes/.test(m.ghostText) : /Only the Owner changes/.test(m.ghostText)), `${w} ${label}: the ghost draws the card${label === 'owner' ? '' : ' with its rule line'}`)
        errors.push(...m.errs.map((e) => `${w} ${label} ghost: ${e}`))
      }
    }
    as('germaine')
    { const m = await measure({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }, '/company/price-book', ['library-gallery.bar', 'templates-table.hCell'], 14, 1)
      if (m.none) ok(false, 'price book: a reveal ghost to compare')
      else { const off = m.rows.filter((x) => Math.abs(x.dy) > 4 || Math.abs(x.dx) > 6); ok(m.rows.length > 0 && off.length === 0, 'a hidden Designer’s My Items ghost: its column heads stand where the page’s do (no Cost · Markup)', off.slice(0, 3).map((x) => `${x.k}#${x.i} Δx ${x.dx} Δy ${x.dy}`).join(' · ')) } }
    /* an Admin switched off: Reports opens on Owed to you, a project's Money has two tiles — their ghosts the same */
    sql(`update settings set value = '{"admin":false,"manager":false,"designer":false,"accounting":true}' where key = 'cost_visibility'`)
    as('huimin')
    for (const [w, opts] of [['1440', { viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }], ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }]]) {
      {
        const m = await measure(opts, '/company/reports/finance', ['books.block', 'books.head', 'stat-tile.tile', 'plan.sectionHead'], 8, 1)
        if (m.none) ok(false, `${w} admin reports: a reveal ghost to compare`)
        else {
          const off = m.rows.filter((x) => Math.abs(x.dy) > 4 || Math.abs(x.dx) > 6)
          ok(m.rows.length > 0 && off.length === 0, `${w} an Admin switched off · Reports: the ghost (Owed to you) stands where the page does`, off.slice(0, 3).map((x) => `${x.k}#${x.i} Δx ${x.dx} Δy ${x.dy}`).join(' · '))
          errors.push(...m.errs.map((e) => `${w} admin reports ghost: ${e}`))
        }
      }
      /* a project's Money: the ghost draws as many tiles as the page (where its Needs you band lands is the remembered shape's, REG-817) */
      {
        const c = await b.newContext(opts)
        await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
        const p = await c.newPage(); await p.goto(`${BASE}/projects/${BENP}/money`, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
        const n = await p.evaluate(() => {
          const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
          const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c))), content = reveal?.querySelector(':scope > [data-ready]')
          const tiles = (root) => (root ? [...root.querySelectorAll('[class*="stat-tile-module__"]')].filter((e) => [...e.classList].some((c) => /__tile$/.test(c))).length : -1)
          return { g: tiles(ghost), p: tiles(content) }
        })
        ok(n.g === 2 && n.p === 2, `${w} an Admin switched off · a project’s Money: the ghost draws the page’s two tiles`, JSON.stringify(n))
        await c.close()
      }
      /* the Dashboard's Where it stands: the ghost's tiles are the page's (no Profit this month) */
      {
        const c = await b.newContext(opts)
        await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
        const p = await c.newPage(); await p.goto(`${BASE}/dashboard`, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
        const n = await p.evaluate(() => {
          const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
          const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c))), content = reveal?.querySelector(':scope > [data-ready]')
          /* (Dashboard redesign 2026-10-26, a deliberate change) Where it stands became Pulse (his P-03): the figures in its strip, ghost and page */
          const tiles = (root) => (root ? root.querySelectorAll('[data-slot="pulse"] [class*="dashboard-module__"][class*="__figure"]').length : -1)
          return { g: tiles(ghost), p: tiles(content) }
        })
        /* (pending modules S45A, a deliberate change of this rule) an Admin's tiles are now six without Profit: Leads · Sales · Response time · Open
           projects · Messages · Owed to you (H-UHD-3 put Reports › Leads' two after Leads) */
        /* (pending modules S45B, a deliberate change of this rule) seven without Profit: S45B's Contractors after Open projects (H-UHD-2) */
        /* (pending modules S46B, a deliberate change of this rule) eight without Profit: Projects › Tickets' figure after Contractors (M1) */
        /* (Dashboard redesign 2026-10-26, a deliberate change) an Admin's Pulse without costs is five: Leads this week · Won · First response ·
           Owed to you · Coming in — no Profit this month */
        /* (the calm pass 2026-10-26, a deliberate change — lane C1, the Claude Design option's four) an Admin's Pulse without costs is three:
           Won · Owed to you · First response — no Profit */
        ok(n.p === 3 && n.g === n.p, `${w} an Admin switched off · the Dashboard: the ghost draws the page’s three figures (no Profit)`, JSON.stringify(n))
        await c.close()
      }
    }
    as('germaine')
    /* Preview's ghost: no Internal copy for whoever doesn't see costs — as the page */
    {
      const c = await b.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' })
      await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const p = await c.newPage(); await p.goto(`${BASE}/quotes/${QUOTE}/preview`, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
      const n = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = reveal && [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c))), content = reveal?.querySelector(':scope > [data-ready]')
        const internal = (root) => (root ? root.querySelectorAll('[class*="quote-preview-module__"][class*="__internal"]').length : -1)
        return { g: internal(ghost), p: internal(content), reveal: !!reveal }
      })
      ok(!n.reveal || (n.g === 0 && n.p === 0), 'a hidden Designer’s Preview and its ghost: no Internal copy', JSON.stringify(n))
      await c.close()
    }
    for (const [w, hgt] of [[390, 844], [320, 700]]) {
      const C = await phoneCtx(w, hgt); const p = await page(C, `phone-${w}`)
      for (const u of ['/settings?section=studio', `/quotes/${QUOTE}`, '/company/price-book']) {
        await go(p, u, 1600)
        ok(await sideways(p) <= 0, `${w}: ${u.replace(QUOTE, '<quote>')} — no sideways scroll`, `${await sideways(p)}px`)
        if (w === 390) await shot(p, `07-${u.replace(QUOTE, 'quote').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}-designer-390`)
      }
      await C.close()
    }
    /* a tablet held up (touch) and a small laptop: the card, the quote and the price book fit */
    for (const [w, hgt, touch] of [[768, 1024, true], [1024, 768, false]]) {
      const C = await b.newContext({ viewport: { width: w, height: hgt }, isMobile: touch, hasTouch: touch }); const p = await page(C, `w-${w}`)
      for (const u of ['/settings?section=studio', `/quotes/${QUOTE}`, '/company/price-book']) {
        await go(p, u, 1600)
        ok(await sideways(p) <= 0, `${w}${touch ? ' touch' : ''}: ${u.replace(QUOTE, '<quote>')} — no sideways scroll`, `${await sideways(p)}px`)
      }
      if (w === 768) { await go(p, '/settings?section=studio', 1600); await p.getByTestId('cost-visibility').scrollIntoViewIfNeeded(); await settle(p, 400); await shot(p, '09-card-designer-768-touch') }
      await C.close()
    }
    as('dane')
    { const C = await phoneCtx(390, 844); const p = await page(C, 'owner-390'); await go(p, '/settings?section=studio', 1600)
      await p.getByTestId('cost-visibility').scrollIntoViewIfNeeded(); await settle(p, 400)
      await shot(p, '08-card-owner-390')
      const cells = await p.evaluate(() => [...document.querySelectorAll('[data-testid="cost-visibility"] [data-label="Sees costs"]')].map((e) => { const r = e.getBoundingClientRect(); return Math.round(r.right) }))
      /* (S44O — call C6, a deliberate change of this rule: Marketing's fixed row joins the card — six rows) */
      ok(cells.length === 6 && cells.every((x) => x <= 390), '390: each role’s switch labelled in its row, inside the card')
      await C.close() }

    await D.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 4).join(' | ')}` : ''}`)
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e && e.stack || e).slice(0, 700))
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
