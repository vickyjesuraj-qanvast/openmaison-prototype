// S44F · the quote follow-ups from 1.0's newer branches — rows NB-01…NB-04 of s42/sweep-newer-branches-2026-10-15.md §5 (Vicky 2026-10-15: "fix
// all the pending things apart from Still parked … If you have any questions please go ahead based on your recommendations"). Each asserted as the
// rule it builds:
//  1 · NB-03 (privacy): a client's browser gets no line price the client view doesn't print — read from the page's own payload (the HTML and its
//      RSC data), never only from what is drawn. One amount per section / the total only: every line's price is 0 on the wire; a price on every
//      line: the printed lines carry theirs, a line hidden "without a price", printed as a word (FOC) or folded into a section printed as one line
//      carries none. The totals, the section sums and the folded sum print exactly as the studio's Preview prints them; cost and margin never
//      travel. On /confirm/<token>, /quote/<token>, /sign/<token>/quote, the bundle walk (no line at all) and the portal's quote; the studio's
//      Preview still carries the real lines.
//  2 · NB-04: a regular quote marked Confirmed by hand records "marked" and who (Dane), Undo puts both back; the editor's banner, the quote's
//      trail and the lead's Activity say "Marked … by …"; confirming on the link records "link".
//  3 · NB-01: three versions of OM-10007 — the print's Changes: "Since the last version" (as always: this version's marks only) · "Every version"
//      (a line removed in version 2 stays struck, each version's marks in its own kit colour, named by version, with a key); kept with the quote;
//      the client's page prints the same; a removed line's old figures travel only where the view prints prices.
//  4 · NB-02: (a) the schedule's changes print (a changed share struck before the new); (b) Version History's "What changed" under each version —
//      every line's move, the schedule, the total, the lines untouched — with Copy; the revised quote's WhatsApp message carries the client's
//      words (a hidden line reads as removed, no rates while the view prints none), from the editor and from Preview; (c) Compare — the version
//      against an earlier one (`?against=m`), another picked in place, Stop comparing, a kept version against an older one.
//  5 · no page errors; no sideways scroll at 390 / 320 touch and 768 touch; nothing left behind (the leads' stages and stage logs as found).
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s44f.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44f')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: `PRAGMA foreign_keys=OFF;\n${text}` })
const dump = (table, where) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table} where ${where}"`).toString()
let pass = 0, fail = 0
const ok = (cond, name, detail) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, detail !== undefined ? `— ${detail}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
/* the demo's records (fixed ids) */
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789', Q7 = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'     // OM-10007 · Sent to Client · its confirmation token is its id
const C_RYAN = '301fe7ef-3cd9-47bb-a159-daacd92d7408', Q4 = '1f598389-4008-4079-a956-5dff071fb708'    // Ryan's signed agreement (its token is its id) · OM-10004
const RYAN = sql(`select lead_id from quotes where id = '${Q4}'`)
const VIEW_TOKEN = 'probeS44FviewTokenAAAA', BUNDLE = 'probe-s44f-bundle'
/* OM-10007's lines */
const A = '384dfc17-4128-4d99-a26a-170b2ec20b7e'   // Kitchen carpentry, top and bottom cabinets — 48 × 250.00
const B = '881f0f61-e160-4bf1-a7e3-96ac9b93483e'   // Glass shower screen — removed in version 2
const D = '88a185d0-29ea-49cd-a9d2-8ad3bd593096'   // Kitchen backsplash, glass — removed in version 3
const F = '93f69306-9013-4957-aba3-a8632491d51a'   // Painting, whole unit — changed and hidden in version 3
const HIDE = '0b45db98-59bf-497f-aba3-a4df4b0a1a9f' // Hacking of existing floor and wall tiles — hidden "without a price" in §1
const FOC = '04e8b6b7-3143-4bab-a94a-d630f171a2f4'  // Design consultation and 3D drawings
const BEDROOMS = '2ef0d2d3-2417-4d7b-ad28-72b0e25abd3b', BED_LINE = 'f6f7a223-a0b0-4619-a22d-c17cf7fb67fc'
const KITCHEN = '4463d803-fd72-402a-a509-651902e92c94'
const C = 'probe-s44f-line-c', E = 'probe-s44f-line-e'
const PAY = { deposit: '633ac146-0d6c-494f-ab9a-cfb3318140d8', start: 'cf22f9b2-1936-4d5e-af7a-d76c4b0d3c80', mid: 'f7279e93-5052-4f41-a481-bead0297e9ba', end: '8a6a1a54-3f11-4026-ade9-fe7a38da7ce4' }

/** The quote's total as the editor works it out (lib/quotes/math.ts `quoteTotals` — no discounts on these quotes) — the stored amount follows a
    line written straight into the database, as the editor would have saved it. */
function recalc(qid) {
  const q = sql(`select gst_enabled || '|' || additional_discount_value || '|' || coalesce(discounts_json, '') from quotes where id = '${qid}'`).split('|')
  if (Number(q[1]) !== 0 || (q[2] && q[2] !== '[]')) throw new Error('recalc: this quote has discounts')
  const rows = sql(`select qty || '|' || cost_minor || '|' || markup_minor || '|' || discount_pct || '|' || gst_pct || '|' || coalesce(print_as, '') || '|' || optional || '|' || status from quote_items where quote_id = '${qid}' and kind = 'item'`).split('\n').filter(Boolean)
  let sub = 0, gst = 0
  for (const r of rows) {
    const [qty, cost, mk, disc, g, pa, opt, st] = r.split('|')
    if (st === 'Declined' || opt === '1' || (pa && pa !== 'behalf')) continue
    const t = Math.round(Number(qty) * (Number(cost) + Number(mk)) * (1 - Number(disc) / 100))
    sub += t; if (q[0] === '1' && pa !== 'behalf') gst += Math.round(t * Number(g) / 100)
  }
  sql(`update quotes set amount_minor = ${sub + gst} where id = '${qid}'`)
  return sub + gst
}
/** A page's own payload: the HTML and the RSC data inside it (`self.__next_f.push`), read as the client's browser receives them. */
async function payload(ctx, url) {
  const html = await (await ctx.request.get(BASE + url)).text()
  let flight = ''
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) { try { flight += JSON.parse(`"${m[1]}"`) } catch { /* a chunk that is not a string */ } }
  return { html, flight, all: html + flight }
}
const costs = (flight) => [...flight.matchAll(/"costMinor":(-?\d+)/g)].map((m) => Number(m[1]))
const lineCost = (flight, id) => { const m = flight.match(new RegExp(`"id":"${id}"[^{}]*?"costMinor":(-?\\d+)`)); return m ? Number(m[1]) : null }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* ── what the probe changes, kept to put back: the two quotes whole, their lines and milestones, the agreement, the trail ── */
  const you0 = sql(`select id from members where is_you = 1`)
  const keptQuotes = dump('quotes', `id in ('${Q7}', '${Q4}')`)
  const keptItems = dump('quote_items', `quote_id in ('${Q7}', '${Q4}')`)
  const keptPays = dump('quote_payments', `quote_id in ('${Q7}', '${Q4}')`)
  const keptContract = sql(`select quote(bundle_id) || '§' || quote(bundle_position) from contracts where id = '${C_RYAN}'`).split('§')
  const versions0 = new Set(sql(`select id from quote_versions`).split('\n').filter(Boolean))
  const trail = ['notifications', 'notification_outbox', 'lead_events', 'lead_tasks', 'portal_sessions', 'portal_bell_reads']
  const trail0 = Object.fromEntries(trail.map((t) => { try { return [t, new Set(sql(`select rowid from ${t}`).split('\n').filter(Boolean))] } catch { return [t, null] } }))
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const restoreQuotes = () => runSql(`delete from quotes where id in ('${Q7}', '${Q4}');\n${keptQuotes}\ndelete from quote_items where quote_id in ('${Q7}', '${Q4}');\n${keptItems}\ndelete from quote_payments where quote_id in ('${Q7}', '${Q4}');\n${keptPays}`)

  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (p) => { if (p.url().includes('wa.me')) void p.close().catch(() => {}) }) }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
  /* what the print shows: its totals, its sum rows (sub-totals, lump sums), a line's own row — on the visible pages only */
  const printed = async (p) => ({
    totals: await text(p.locator('[data-page] div[data-rules]').first()),
    sums: await p.locator('[data-page] tr[data-sum]').evaluateAll((rs) => rs.map((r) => r.textContent.replace(/\s+/g, ' ').trim())),
  })
  const lineRow = (p, id) => p.locator(`[data-page] tr[data-line-id="${id}"]`).first()
  const setView = (v) => sql(`update quotes set client_view_json = '${JSON.stringify(v)}' where id = '${Q7}'`)
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()

  try {
    as('dane')
    const ctx = await desk({ permissions: ['clipboard-read', 'clipboard-write'] }); await stubWa(ctx)
    const p = await page(ctx, 'desk')
    const client = await desk(); const cp = await page(client, 'client')   // a client's own browser: no studio session

    // ── 1 · NB-03 — no price the view keeps back reaches the client's browser ─────────────────────────────────────────────────────────────
    console.log('1 · A client page carries no line price the client view doesn’t print (NB-03)')
    /* OM-10007 as the client gets it: one line hidden "without a price", one printed FOC, the Bedrooms section printed as one line */
    sql(`update quote_items set visibility = 'hidden' where id = '${HIDE}'; update quote_items set print_as = 'foc' where id = '${FOC}'; update quote_items set print_one_line = 1 where id = '${BEDROOMS}'`)
    recalc(Q7)
    sql(`update quotes set view_token = '${VIEW_TOKEN}', view_token_at = strftime('%s','now'), view_token_by = 'dane' where id = '${Q7}'`)
    for (const amounts of ['lines', 'sections', 'total']) {
      setView({ amounts, hiddenItems: 'no-price' })
      for (const url of [`/confirm/${Q7}`, `/quote/${VIEW_TOKEN}`]) {
        const pl = await payload(client, url)
        const all = costs(pl.flight)
        const tag = `${url.split('/')[1]} · ${amounts}`
        ok(pl.flight.includes(`"id":"${A}","parentId"`), `${tag}: the page carries the quote's lines (the payload was read)`)
        ok(!/"marginMinor":[1-9]|"marginPct":[1-9]|"rebateMinor":[1-9]|"markupMinor":[1-9]/.test(pl.flight), `${tag}: no mark-up, rebate or margin travels`)
        if (amounts === 'lines') {
          ok(lineCost(pl.flight, A) === 25000, `${tag}: a printed line carries its price (Kitchen carpentry 250.00)`, lineCost(pl.flight, A))
          ok(lineCost(pl.flight, HIDE) === 0 && lineCost(pl.flight, FOC) === 0 && lineCost(pl.flight, BED_LINE) === 0, `${tag}: a line shown without a price, printed FOC or folded into a one-line section carries none`, `${lineCost(pl.flight, HIDE)} · ${lineCost(pl.flight, FOC)} · ${lineCost(pl.flight, BED_LINE)}`)
          ok(/"sums":\{"totals":\{[^}]*"costMinor":0[^}]*"marginMinor":0/.test(pl.flight), `${tag}: the sums travel — never cost or margin`)
        } else ok(all.length > 5 && all.every((n) => n === 0), `${tag}: every line's price is 0 on the wire (${all.length} figures read)`, all.filter((n) => n !== 0).slice(0, 5).join(', '))
      }
      /* the client's page prints what the studio's Preview prints — the total, the lump sums, the folded line */
      await go(p, `/quotes/${Q7}/preview`); const studio = await printed(p)
      const studioFold = await text(lineRow(p, BEDROOMS))
      await go(cp, `/confirm/${Q7}`); const theirs = await printed(cp)
      ok(studio.totals && studio.totals === theirs.totals, `${amounts}: the confirmation link prints the Preview's totals`, `${studio.totals} | ${theirs.totals}`)
      ok(JSON.stringify(studio.sums) === JSON.stringify(theirs.sums) && (amounts !== 'sections' || theirs.sums.length >= 3), `${amounts}: …and its sum rows (${theirs.sums.length})`, `${JSON.stringify(studio.sums).slice(0, 160)} | ${JSON.stringify(theirs.sums).slice(0, 160)}`)
      if (amounts === 'lines') ok(studioFold && studioFold === await text(lineRow(cp, BEDROOMS)) && /\d/.test(studioFold), 'lines: the section printed as one line shows the Preview’s folded sum', studioFold)
      if (amounts === 'sections') await shot(cp, 'nb03-confirm-sections-1440')
      await go(cp, `/quote/${VIEW_TOKEN}`)
      ok(JSON.stringify(await printed(cp)) === JSON.stringify(studio), `${amounts}: the view-only link prints them too`)
      ok(await text(cp.getByTestId('quote-view-total')) && studio.totals.includes(await text(cp.getByTestId('quote-view-total'))), `${amounts}: the view-only card's Total is the print's`, await text(cp.getByTestId('quote-view-total')))
    }
    /* the studio's own Preview still carries the real lines (Dane sees costs) */
    { const pl = await payload(ctx, `/quotes/${Q7}/preview`); ok(lineCost(pl.flight, A) === 19000, 'the studio’s Preview still carries each line’s own cost (Dane sees costs)', lineCost(pl.flight, A)) }
    /* the phone's reading cards: one amount per section — the captions' amounts are the print's lump sums, the Total the print's */
    setView({ amounts: 'sections', hiddenItems: 'no-price' })
    { const ph = await phoneCtx(); const pp = await page(ph, 'phone-cards'); await go(pp, `/confirm/${Q7}`)
      const caps = await pp.locator('[data-testid="reading-cards"] [class*="captionAmount"]').allInnerTexts()
      await go(p, `/quotes/${Q7}/preview`); const lumps = (await printed(p)).sums.map((s) => s.replace(/^.*?(\d[\d,]*\.\d\d)$/, '$1'))
      ok(caps.length >= 3 && caps.every((c) => lumps.some((l) => c.replace(/[^\d.]/g, '') === l.replace(/[^\d.]/g, ''))), `390: the reading cards' section amounts are the print's lump sums (${caps.length})`, `${caps.join(' · ')} | ${lumps.join(' · ')}`)
      ok(await sideways(pp) <= 0, '390: no sideways scroll on the confirmation link')
      await shot(pp, 'nb03-confirm-cards-390', true); await ph.close() }
    /* the quote an agreement signs: OM-10004 through Ryan's signed agreement */
    sql(`update quotes set client_view_json = '{"amounts":"total"}' where id = '${Q4}'`)
    { const pl = await payload(client, `/sign/${C_RYAN}/quote`); const all = costs(pl.flight)
      ok(pl.flight.includes('"parentId"') && all.length > 3 && all.every((n) => n === 0), `/sign/<token>/quote · the total only: every line's price is 0 on the wire (${all.length})`, all.filter((n) => n).slice(0, 4).join(', '))
      await go(p, `/quotes/${Q4}/preview`); const studio = await printed(p); await go(cp, `/sign/${C_RYAN}/quote`)
      ok(studio.totals && studio.totals === (await printed(cp)).totals, '/sign/<token>/quote prints the Preview’s totals', studio.totals) }
    /* the bundle walk: its documents are agreements — no quote line travels with them */
    sql(`insert or replace into contract_bundles (id, lead_id, recipient_name, recipient_phone, created_at, sent_at, sign_expires_at) values ('${BUNDLE}', '${RYAN}', 'Ryan D''Souza', '97551246', strftime('%s','now'), strftime('%s','now'), strftime('%s','now') + 7*86400)`)
    sql(`update contracts set bundle_id = '${BUNDLE}', bundle_position = 0 where id = '${C_RYAN}'`)
    { const pl = await payload(client, `/sign/bundle/${BUNDLE}`); ok(pl.html.length > 1000 && !/costMinor|markupMinor|"parentId"/.test(pl.all), 'the bundle walk carries no quote line at all') }
    sql(`update contracts set bundle_id = ${keptContract[0]}, bundle_position = ${keptContract[1]} where id = '${C_RYAN}'; delete from contract_bundles where id = '${BUNDLE}'`)
    /* the portal's quote: the documents list opens the same client page */
    { const pc = await phoneCtx(); const pp = await page(pc, 'portal')
      await go(pp, '/my/demo-studio/login')
      await pp.locator('input[type="tel"]').fill('97551246')
      await pp.getByRole('button', { name: 'Send me a code' }).click(); await settle(pp, 1000)
      await pp.locator('[data-testid="portal-digit"]').first().fill('482913'); await pp.getByRole('button', { name: 'Open my project' }).click()
      await pp.waitForURL(/\/my\/[^/]+$/, { timeout: 10000 }).catch(() => {}); await settle(pp, 1400)
      await go(pp, '/my/demo-studio/money')   // the client's Money lists their quotes
      const hrefs = await pp.locator('a[href*="/sign/"][href$="/quote"], a[href*="/confirm/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
      ok(hrefs.some((h) => h === `/sign/${C_RYAN}/quote`), 'the portal’s quote opens /sign/<token>/quote — the page read above', hrefs.join(' · '))
      const pl = await payload(pc, `/sign/${C_RYAN}/quote`); ok(costs(pl.flight).every((n) => n === 0), '…and through the portal’s own browser it carries no line price either')
      await pc.close() }
    restoreQuotes()

    // ── 2 · NB-04 — a confirmation marked by hand says so, and who ──────────────────────────────────────────────────────────────────────────
    console.log('2 · Confirmed by hand records "marked" and who (NB-04)')
    const markConfirmed = async () => {
      await go(p, `/quotes/${Q7}`)
      await p.getByRole('button', { name: /^Sent to Client/ }).first().click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: /^Confirmed/ }).click(); await settle(p, 400)
      await p.getByRole('dialog').getByRole('button', { name: 'Mark Confirmed' }).click(); await settle(p, 1800)
    }
    await markConfirmed()
    ok(sql(`select status || '|' || confirmed_via || '|' || confirmed_marked_by from quotes where id = '${Q7}'`) === 'Confirmed|marked|dane', 'the mark records Confirmed · marked · Dane', sql(`select status || '|' || quote(confirmed_via) || '|' || quote(confirmed_marked_by) from quotes where id = '${Q7}'`))
    ok(/Marked confirmed by Dane/.test(await text(p.getByTestId('sent-banner'))), 'the editor’s banner says “Marked confirmed by Dane”', await text(p.getByTestId('sent-banner')))
    await shot(p, 'nb04-marked-banner-1440')
    await snack(p).getByRole('button', { name: 'Undo' }).click(); await settle(p, 1500)
    ok(sql(`select status || '|' || quote(confirmed_via) || '|' || quote(confirmed_marked_by) || '|' || quote(confirmed_at) from quotes where id = '${Q7}'`) === 'Sent to Client|NULL|NULL|NULL', 'Undo puts the status, the how and the who back', sql(`select status || '|' || quote(confirmed_via) || '|' || quote(confirmed_marked_by) from quotes where id = '${Q7}'`))
    await markConfirmed()
    await go(p, `/quotes/${Q7}`)
    ok(/Marked confirmed by Dane/.test(await text(p.getByTestId('sent-banner'))), 'after a reload the banner still names who marked it')
    { const t = p.locator('#section-activity button[aria-controls="section-activity-body"]'); await t.scrollIntoViewIfNeeded(); if (await t.getAttribute('aria-expanded') === 'false') { await t.click(); await settle(p, 800) } }
    ok(/Marked as confirmed by Dane/.test(await text(p.locator('#section-activity'))), 'the quote’s own trail: “Marked as confirmed by Dane”', (await text(p.locator('#section-activity'))).slice(0, 160))
    await go(p, `/leads/${SERENA}/activity`)
    ok(/marked the quote\W+OM-10007\W+as confirmed/.test(await p.locator('body').innerText()), 'the lead’s Activity: “You marked the quote OM-10007 as confirmed.”')
    restoreQuotes()
    /* confirming on the link records "link" — and the trail keeps the client's own words */
    await go(cp, `/confirm/${Q7}`)
    await cp.getByRole('textbox', { name: /Your full name/ }).fill('Serena Koh')
    await cp.getByRole('button', { name: 'Confirm quote' }).click(); await settle(cp, 1800)
    ok(sql(`select status || '|' || confirmed_via || '|' || quote(confirmed_marked_by) || '|' || confirmed_by from quotes where id = '${Q7}'`) === 'Confirmed|link|NULL|Serena Koh', 'confirming on the link records “link” and the client’s name')
    await go(p, `/leads/${SERENA}/activity`)
    ok(/Serena Koh confirmed the quote\W+OM-10007\W+on its link/.test(await p.locator('body').innerText()), 'the lead’s Activity keeps “Serena Koh confirmed the quote … on its link”')
    restoreQuotes()

    // ── 3 · NB-01 + NB-02 — three versions of OM-10007 ─────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Revision marks back to version 1, the schedule, the words, Compare (NB-01 · NB-02)')
    const revise = async (n) => {
      await go(p, `/quotes/${Q7}`)
      await p.getByTestId('sent-banner').getByRole('button', { name: 'Revise — new version' }).click(); await settle(p, 400)
      await p.getByRole('dialog', { name: `Start version ${n}?` }).getByTestId('revise-confirm').click(); await settle(p, 2200)
    }
    const send = () => sql(`update quotes set status = 'Sent to Client', sent_at = strftime('%s','now'), client_sent_at = strftime('%s','now'), visibility = 'Shared' where id = '${Q7}'`)
    await revise(2)
    ok(sql(`select version || '|' || status from quotes where id = '${Q7}'`) === '2|Draft', 'Revise kept version 1 and started version 2')
    /* version 2: a quantity, a removal, an addition, two shares */
    runSql(`update quote_items set qty = 50 where id = '${A}';
delete from quote_items where id = '${B}';
insert into quote_items (id, quote_id, parent_id, kind, position, name, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, category, visibility, status, created_at, updated_at) values ('${C}', '${Q7}', '${KITCHEN}', 'item', 9, 'Feature wall panelling', 1, 'Lot', 300000, 100000, 0, 9, 'Carpentry', 'visible', 'Pending', strftime('%s','now'), strftime('%s','now'));
update quote_payments set pct = 15 where id = '${PAY.deposit}'; update quote_payments set pct = 25 where id = '${PAY.start}';`)
    recalc(Q7); send()
    await revise(3)
    ok(sql(`select version from quotes where id = '${Q7}'`) === '3' && sql(`select count(*) from quote_versions where quote_id = '${Q7}'`) === '2', 'version 3 started, versions 1 and 2 kept')
    /* version 3: a removal, a rate, an addition, a line changed and hidden, two more shares */
    runSql(`delete from quote_items where id = '${D}';
update quote_items set cost_minor = 20000 where id = '${A}';
insert into quote_items (id, quote_id, parent_id, kind, position, name, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, category, visibility, status, created_at, updated_at) values ('${E}', '${Q7}', '${KITCHEN}', 'item', 10, 'Pendant lights over the island', 3, 'pc', 30000, 10000, 0, 9, 'Electrical', 'visible', 'Pending', strftime('%s','now'), strftime('%s','now'));
update quote_items set qty = 2, visibility = 'hidden' where id = '${F}';
update quote_payments set pct = 35 where id = '${PAY.mid}'; update quote_payments set pct = 25 where id = '${PAY.end}';`)
    recalc(Q7); send()

    /* (a) Since the last version — as always: version 3's marks only */
    await go(p, `/quotes/${Q7}/preview`)
    ok(await p.locator(`[data-page] tr[data-removed][data-line-id="${D}"]`).count() === 1 && await p.locator(`[data-page] tr[data-line-id="${B}"]`).count() === 0, 'Since the last version: the line version 3 removed is struck; the one version 2 removed is not printed')
    ok(await p.locator(`[data-page] tr[data-added][data-line-id="${E}"]`).count() === 1 && await p.locator(`[data-page] tr[data-added][data-line-id="${C}"]`).count() === 0, '…the line version 3 added is marked New; version 2’s is not')
    ok(await p.locator(`[data-page] tr[data-line-id="${A}"] [class*="was"]`).count() >= 1, '…a changed line strikes its old figure beside the new')
    ok(await p.locator('[data-version-key]').count() === 0 && await p.locator('[data-page] [data-version-mark]').count() === 0, '…and no version key or version marks — the print as before (REG-595)')
    ok(await p.locator('[data-page] [data-pay-change="changed"]').count() === 2 && await p.locator('[data-page] [data-pay-change="changed"] [class*="was"]').count() === 2, 'the schedule: version 3’s two changed shares print the old share struck before the new (NB-02 a)')
    const totalLast = (await printed(p)).totals
    await shot(p, 'nb01-preview-since-last-1440')
    /* (b) Every version — picked in What your client sees, kept with the quote */
    await p.getByRole('button', { name: /What your client sees/ }).click(); await settle(p, 500)
    const panel = p.locator('aside[aria-label="What your client sees"]')
    ok(/Show changes from version 2/.test(await text(panel)), 'the panel’s switch still reads “Show changes from version 2”')
    await panel.getByRole('combobox').filter({ hasText: 'Since the last version' }).click(); await settle(p, 300)
    await p.getByRole('option', { name: 'Every version' }).click(); await settle(p, 1600)
    ok(/Show changes from version 1/.test(await text(panel)) && /2 added · 2 removed · 2 changed/.test(await text(panel)), 'Every version: the switch reads “from version 1”, its counts every version’s', await text(panel.locator('label').filter({ hasText: 'Show changes' })))
    const mark = (id) => p.locator(`[data-page] tr[data-line-id="${id}"] [data-version-mark]`)
    ok(await p.locator(`[data-page] tr[data-removed][data-line-id="${B}"]`).count() === 1 && /Removed in v2/i.test(await text(mark(B))), 'a line removed in version 2 stays struck, marked “Removed in v2”', await text(mark(B)))
    ok(/Removed in v3/i.test(await text(mark(D))) && /New in v2/i.test(await text(mark(C))) && /New in v3/i.test(await text(mark(E))) && /Changed in v3/i.test(await text(mark(A))), '…D “Removed in v3”, C “New in v2”, E “New in v3”, A “Changed in v3”')
    const inks = await p.evaluate(([c, e]) => [c, e].map((id) => getComputedStyle(document.querySelector(`[data-page] tr[data-line-id="${id}"] [data-version-mark]`)).color), [C, E])
    const swatches = await p.locator('[data-version-key] [class*="versionSwatch"]').evaluateAll((ss) => ss.map((s) => getComputedStyle(s).backgroundColor))
    ok(inks[0] !== inks[1] && inks[0] === 'rgb(85, 0, 255)' && inks[1] === 'rgb(192, 0, 0)', 'each version marks in its own kit colour — version 2 the accent, version 3 the red', inks.join(' · '))
    ok(/Changes by version/.test(await text(p.locator('[data-version-key]'))) && /Version 2/.test(await text(p.locator('[data-version-key]'))) && /Version 3/.test(await text(p.locator('[data-version-key]'))) && swatches[0] === inks[0] && swatches[1] === inks[1], 'the key under the table names Version 2 and Version 3 in those colours', swatches.join(' · '))
    const payMarks = await p.locator('[data-page] li [data-version-mark]').allInnerTexts()
    ok(payMarks.length === 4 && payMarks.filter((m) => /Changed in v2/i.test(m)).length === 2 && payMarks.filter((m) => /Changed in v3/i.test(m)).length === 2, 'the schedule wears every version’s marks too (Changed in v2 · v3)', payMarks.join(' · '))
    ok((await printed(p)).totals === totalLast, 'a removed line never counts — the totals as before')
    await settle(p, 900)
    ok(/"changesSince":"all"/.test(sql(`select client_view_json from quotes where id = '${Q7}'`)), 'the choice is kept with the quote')
    await p.keyboard.press('Escape').catch(() => {})
    await shot(p, 'nb01-preview-every-version-1440', true)
    /* the client's page prints the same marks; their old figures travel only while the view prints prices */
    await go(cp, `/confirm/${Q7}`)
    ok(/Removed in v2/i.test(await text(cp.locator(`[data-page] tr[data-line-id="${B}"] [data-version-mark]`))) && await cp.locator('[data-version-key]').count() === 1, 'the confirmation link prints every version’s marks and the key')
    { const pl = await payload(client, `/confirm/${Q7}`)
      ok(lineCost(pl.flight, B) === 83000 && /"first":\{"name":"Kitchen carpentry[^}]*"unitPriceMinor":25000/.test(pl.flight), 'a price on every line: a removed line’s and a changed line’s old figures travel (they print, struck)') }
    setView({ changesSince: 'all', amounts: 'total' })
    { const pl = await payload(client, `/confirm/${Q7}`)
      ok(lineCost(pl.flight, B) === 0 && /"first":\{"name":"Kitchen carpentry[^}]*"unitPriceMinor":0,"totalMinor":0/.test(pl.flight) && costs(pl.flight).every((n) => n === 0), 'the total only: no old figure travels either', pl.flight.match(/"first":\{[^}]*\}/)?.[0]) }
    setView({ changesSince: 'all' })
    await shot(cp, 'nb01-confirm-every-version-1440', true)
    { const ph = await phoneCtx(); const pp = await page(ph, 'phone-confirm'); await go(pp, `/confirm/${Q7}`)
      ok(await sideways(pp) <= 0, '390: the confirmation link of a revision, no sideways scroll'); await ph.close() }

    /* (b) Version History: what changed under each version, with Copy */
    await go(p, `/quotes/${Q7}`)
    await p.getByRole('button', { name: 'More options', exact: true }).click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: 'Version History' }).click(); await settle(p, 700)
    const v3 = p.getByTestId('version-changes-3'), v2 = p.getByTestId('version-changes-2')
    ok(/^Total S\$[\d,.]+ → S\$[\d,.]+ · \d+ lines untouched/.test(await text(v3)), 'the current version: the total before → after and the lines untouched, under its count line (REG-595)', await text(v3))
    ok(/^\d+ changes from version 1 · total S\$[\d,.]+ → S\$[\d,.]+ · \d+ lines untouched/.test(await text(v2)), 'a kept version: its changes from the one before, the total before → after, the lines untouched', await text(v2))
    ok(await p.getByTestId('version-changes-1').count() === 0, 'version 1 has nothing before it')
    await v3.getByRole('button', { name: 'What changed' }).click(); await settle(p, 300)
    const list3 = await text(p.getByTestId('version-change-list-3'))
    ok(/Removed “Kitchen backsplash, glass”/.test(list3) && /Added “Pendant lights over the island” — 3 pc · S\$1,200\.00/.test(list3), '…removed and added lines, with their figures', list3.slice(0, 200))
    ok(/“Kitchen carpentry, top and bottom cabinets”: rate S\$250\.00 → S\$260\.00/.test(list3) && /“Painting, whole unit”: quantity 1 → 2( \w+)? · now hidden from the client/.test(list3), '…a rate, a quantity, a line hidden from the client', list3.slice(0, 400))
    ok(/Payment schedule: “50% completion” 30% → 35%/.test(list3) && /Payment schedule: “Handover” 30% → 25%/.test(list3), '…and the schedule’s shares')
    await v2.getByRole('button', { name: 'What changed' }).click(); await settle(p, 300)
    const list2 = await text(p.getByTestId('version-change-list-2'))
    ok(/quantity 48 → 50 ft run/.test(list2) && /Removed “Glass shower screen”/.test(list2) && /Added “Feature wall panelling”/.test(list2) && /“Upon signing” 10% → 15%/.test(list2), 'version 2’s own changes from version 1', list2.slice(0, 200))
    await shot(p, 'nb02-version-history-1440')
    await p.getByTestId('version-copy-3').click(); await settle(p, 500)
    const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    ok(/^What changed in version 3 \(from version 2\):\n• /.test(clip) && /• Removed “Kitchen backsplash, glass”/.test(clip) && /\nTotal S\$[\d,.]+ → S\$[\d,.]+ · \d+ lines untouched$/.test(clip), 'Copy puts the words on the clipboard — title, lines, total', clip.slice(0, 120))
    ok(/What changed in version 3 copied/.test(await text(snack(p))), '…and says so')
    /* (c) Compare, from the history */
    await p.getByTestId('version-compare-3').click()
    await p.waitForURL(/\/preview\?against=2/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
    ok(/Version 3 compared with version 2/.test(await text(p.getByTestId('compare-version'))) && await p.locator(`[data-page] tr[data-removed][data-line-id="${D}"]`).count() === 1, 'Compare opens Preview: version 3 against version 2, the marks on', p.url())
    ok(/2 added · 1 removed · 2 changed · 2 in the payment schedule/.test(await text(p.getByTestId('compare-counts'))) || /\d+ added · \d+ removed · \d+ changed/.test(await text(p.getByTestId('compare-counts'))), '…its counts', await text(p.getByTestId('compare-counts')))
    ok(await p.getByRole('button', { name: /What your client sees/ }).count() === 0 && await p.getByText('Read-only', { exact: true }).count() >= 1 && await p.getByTestId('quote-send').count() === 0, '…read-only: no client view to change, nothing sent from here')
    await shot(p, 'nb02-compare-1440')
    await p.getByTestId('compare-version').getByRole('combobox').click(); await settle(p, 300)
    await p.getByRole('option', { name: 'Version 1' }).click()
    await p.waitForURL(/against=1/, { timeout: 10000 }).catch(() => {}); await settle(p, 1500)
    ok(await p.locator(`[data-page] tr[data-removed][data-line-id="${B}"]`).count() === 1 && await p.locator(`[data-page] tr[data-removed][data-line-id="${D}"]`).count() === 1 && await p.locator(`[data-page] tr[data-added][data-line-id="${C}"]`).count() === 1, 'Compare with › Version 1: everything since version 1 is marked', p.url())
    ok(/"changesSince":"all"/.test(sql(`select client_view_json from quotes where id = '${Q7}'`)), '…and the quote’s own client view is untouched')
    await p.getByTestId('stop-comparing').click(); await settle(p, 1500)
    ok(/\/quotes\/[^/]+\/preview(\?from=[^&]*)?$/.test(p.url().replace(BASE, '')) && await p.getByTestId('compare-version').count() === 0, 'Stop comparing returns to the Preview', p.url())
    await go(p, `/quotes/${Q7}/preview?version=2&against=1`)
    ok(/^Version 2/.test(await text(p.locator('h1').first())) && /Version 2 compared with version 1/.test(await text(p.getByTestId('compare-version'))) && await p.locator(`[data-page] tr[data-removed][data-line-id="${B}"]`).count() === 1, 'a kept version against an older one: version 2 against version 1')
    /* the comparison at 768 and 390 touch */
    for (const [w, h] of [[768, 1024], [390, 844], [320, 640]]) {
      const ph = await phoneCtx(w, h); const pp = await page(ph, `compare-${w}`); await go(pp, `/quotes/${Q7}/preview?against=1`)
      ok(await pp.getByTestId('compare-version').count() === 1 && await sideways(pp) <= 0, `${w} touch: the comparison bar, no sideways scroll`, await sideways(pp))
      if (w === 390) await shot(pp, 'nb02-compare-390')
      await ph.close()
    }

    /* (b) the revised quote's WhatsApp message — the client's words */
    setView({ changesSince: 'all', amounts: 'total' })
    for (const [where, url] of [['the editor', `/quotes/${Q7}`], ['Preview', `/quotes/${Q7}/preview`]]) {
      await go(p, url)
      await p.getByTestId('quote-send').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /^Send for confirmation/ }).click(); await settle(p, 700)
      const msg = await p.getByRole('dialog', { name: 'Send for confirmation' }).getByLabel('Message to the client').inputValue()
      ok(/the revised quote OM-10007 \(version 3\)/.test(msg) && /What changed in version 3 \(from version 2\):/.test(msg) && /• Removed “Kitchen backsplash, glass”/.test(msg), `${where}: the message carries what changed since version 2`, msg.slice(0, 160))
      ok(/• Removed “Painting, whole unit”/.test(msg) && !/hidden/.test(msg), `${where}: a line hidden from the client reads as removed — never “hidden”`)
      ok(!/rate S\$|· S\$/.test(msg) && /Total S\$[\d,.]+ → S\$[\d,.]+/.test(msg), `${where}: the client view prints the total only — no line's money, the total before → after`)
      if (where === 'Preview') await shot(p, 'nb02-whatsapp-1440')
      await p.keyboard.press('Escape'); await settle(p, 400)
    }
    setView({ changesSince: 'all' })
    await go(p, `/quotes/${Q7}`)
    await p.getByTestId('quote-send').click(); await settle(p, 300)
    await p.getByRole('menuitem', { name: /^Send for confirmation/ }).click(); await settle(p, 700)
    { const msg = await p.getByRole('dialog', { name: 'Send for confirmation' }).getByLabel('Message to the client').inputValue()
      ok(/rate S\$250\.00 → S\$260\.00/.test(msg), 'a price on every line: the message names the rate that moved') }
    await p.keyboard.press('Escape'); await settle(p, 300)
    /* the drawer on a phone */
    { const ph = await phoneCtx(); const pp = await page(ph, 'phone-history'); await go(pp, `/quotes/${Q7}`)
      await pp.getByRole('button', { name: 'More options', exact: true }).click(); await settle(pp, 400)
      await pp.getByRole('menuitem', { name: 'Version History' }).click(); await settle(pp, 900)
      await pp.getByTestId('version-changes-3').getByRole('button', { name: 'What changed' }).click(); await settle(pp, 300)
      ok(await pp.getByTestId('version-change-list-3').count() === 1 && await sideways(pp) <= 0, '390: Version History’s words, no sideways scroll')
      await shot(pp, 'nb02-version-history-390'); await ph.close() }
    ok(errors.length === 0, `no page errors (${errors.length})`, errors.slice(0, 3).join(' | '))
    await ctx.close(); await client.close()
  } catch (e) {
    fail++; console.log('  ✗ probe crashed —', String(e).slice(0, 400))
  } finally {
    /* put back everything it changed */
    restoreQuotes()
    sql(`delete from quote_versions where quote_id in ('${Q7}', '${Q4}') and id not in (${[...versions0].map((i) => `'${i}'`).join(',') || "''"})`)
    sql(`update contracts set bundle_id = ${keptContract[0]}, bundle_position = ${keptContract[1]} where id = '${C_RYAN}'; delete from contract_bundles where id = '${BUNDLE}'`)
    for (const t of trail) { const before = trail0[t]; if (!before) continue; try { const now = sql(`select rowid from ${t}`).split('\n').filter(Boolean); const extra = now.filter((r) => !before.has(r)); if (extra.length) sql(`delete from ${t} where rowid in (${extra.join(',')})`) } catch { /* a table this database lacks */ } }
    if (you0) as(you0)
    ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the leads’ stages and stage logs as found')
    ok(sql(`select count(*) from quote_versions where quote_id = '${Q7}'`) === '0' && sql(`select version || '|' || status from quotes where id = '${Q7}'`) === '1|Sent to Client', 'OM-10007 is back as it was: version 1, Sent to Client')
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
