// Pending modules, S43D · F2 — ghosts, house notes and the 1.0 checks nobody ran (s42/pending-ledger.md F2-01…F2-06). Each item asserted as the
// rule it now holds, never another round's count:
//  1 · F2-01 Finance › Commission's ghost draws the *Asks for another rate* band whenever the page will: the shell seeds it for a fresh browser
//      (the studio's open asks for whoever sees the books; a member's own as *Your asks*), the page's reveal is told it, and the page remembers
//      it per browser — and no band once every ask is answered. Its place matches the page's at 1440 and 390 touch.
//  2 · F2-02 / F2-03 the house notes: the Chips type says '' is no pick; the lead form no longer calls Fill from a document "scripted".
//  3 · F2-04 (1.0's quotes/port, Phase 9 §B.7) Apply defaults never turns GST on under an issuing entity that is not GST-registered — and
//      still turns it on under a registered one.
//  4 · F2-04 (1.0's quotes/port, Phase 9 §B.6) a stage's bill splits out the GST the contract holds: with an "On behalf" line on the signed
//      quote a fresh stage Draft carries the contract's own share (less than 9/109 of it); with every line at the studio's rate exactly 9/109.
//  5 · 390 / 320 against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s43d.cjs <scratch.db> [shotDir] [base]   (ONLY=1,3 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s43d')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const ROOT = path.resolve(__dirname, '..', '..', '..')
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

const ASK_KEY = 'om.shape.finance.commissions.asks.first'
const MY_ASK_KEY = 'om.shape.finance.commissions.my-asks.first'
const P1 = sql(`select id from projects where number = 'P-2026-001'`)
const BASEQ = sql(`select quote_id from projects where number = 'P-2026-001'`)
const OM1 = sql(`select id from quotes where number = 'OM-10001'`)
const WHOLE = ['commission_requests', 'settings', 'quotes', 'quote_items', 'quote_payments', 'project_invoices', 'lead_events', 'notifications', 'notification_outbox', 'lead_tasks', 'task_assignees']

/* The held reveal (S17's probe): PageReveal's ghost stays over the page when its first paint is faked days away — both are in the DOM to read. */
async function held(b, opts, url, fn, arg, init) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  if (init) await c.addInitScript(init)
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2600)
  const out = await p.evaluate(({ src, arg }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    // eslint-disable-next-line no-new-func
    return new Function('ghost', 'content', 'arg', src)(ghost, content, arg)
  }, { src: fn, arg })
  await c.close()
  return out
}
/* what the held reveal reads of Commission: the ghost's band and the page's, and where the band and By member / Your projects sit in each */
const BAND = `
  const g = ghost.querySelector('[data-testid="ghost-commission-asks"]'), p = content.querySelector('[data-testid="commission-asks"]')
  const top = (el) => (el ? Math.round(el.getBoundingClientRect().top) : null)
  const gNext = [...ghost.querySelectorAll('h2')].find((h) => /^(By member|Your projects)$/.test(h.textContent.trim()))
  const pNext = [...content.querySelectorAll('h2, [class*="sectionTitle"]')].find((h) => /^(By member|Your projects)$/.test(h.textContent.trim()))
  return { g: !!g, p: !!p, gTitle: g ? (g.querySelector('h2') || {}).textContent : null, gTop: top(g), pTop: top(p), gNext: top(gNext), pNext: top(pNext) }`

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.setDefaultTimeout(12000); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const seedOf = (html, key) => { const m = new RegExp(`${key.replace(/\./g, '\\.')}\\\\?"\\s*:\\s*(true|false)`).exec(html); return m ? m[1] === 'true' : null }

  const you0 = sql(`select id from members where is_you = 1`)
  const kept = WHOLE.map((t) => [t, snapshot(t)])
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) text += `DELETE FROM ${t};\n${rows}\n`
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    runSql(text)
  }

  try {
    const openAsk = one(`select r.id, r.member_id from commission_requests r where r.status = 'open' limit 1`)
    ok(!!openAsk && !!P1 && !!BASEQ && !!OM1, 'the demo holds an open ask for another rate, P-2026-001 on its signed quote and the Draft OM-10001')
    const asker = openAsk ? openAsk.member_id : 'michelle'
    const quiet = sql(`select id from members where role = 'Designer' and is_active = 1 and id <> '${asker}' and id not in (select member_id from commission_requests where status = 'open') order by id limit 1`)

    // ── 1 · F2-01 Commission's ghost draws the asks band ─────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Finance › Commission — the ghost draws the asks band when the page will')
      as('dane')
      const C = await b.newContext(opts()); const d = await page(C, 'dane')
      await go(d, '/company/finance/commissions', 1800)
      ok(seedOf(await d.content(), 'finance.commissions.asks') === true, 'the shell seeds “asks open” for a fresh browser (an Owner reads every open ask)')
      ok(await d.getByTestId('commission-asks').count() === 1, 'the page draws Asks for another rate under its tiles')
      ok(await d.evaluate((k) => localStorage.getItem(k), ASK_KEY) === '1', '…and remembers it for its next ghost (this browser)')
      await shot(d, '01-commission-dane-1440')
      await C.close()
      const h = await held(b, opts(), '/company/finance/commissions', BAND)
      ok(!h.none && h.g && h.p && /Asks for another rate/.test(h.gTitle || ''), 'the reveal’s ghost draws the band the page draws — “Asks for another rate”', JSON.stringify(h))
      ok(!h.none && h.gTop !== null && h.pTop !== null && Math.abs(h.gTop - h.pTop) <= 24, `…in the page’s place (ghost ${h.gTop} · page ${h.pTop})`)
      ok(!h.none && h.gNext !== null && h.pNext !== null && Math.abs(h.gNext - h.pNext) <= 48, `…so By member starts where the page’s does (ghost ${h.gNext} · page ${h.pNext}) — no jump on reveal`)
      /* a fresh browser with no memory: the loader's answer is the seed (the reveal is told by the page; this asks the seed path alone) */
      const fresh = await held(b, opts(), '/company/finance/commissions', BAND, null, () => { try { localStorage.removeItem('om.shape.finance.commissions.asks.first') } catch {} })
      ok(!fresh.none && fresh.g, 'a browser that never saw the page still draws the band (the seed)', JSON.stringify(fresh))
      const ph = await held(b, phoneOpts(), '/company/finance/commissions', BAND)
      ok(!ph.none && ph.g && ph.p, 'at 390 touch the ghost draws the band too', JSON.stringify(ph))
      ok(!ph.none && ph.gNext !== null && ph.pNext !== null && Math.abs(ph.gNext - ph.pNext) <= 32, `…its card as tall as the page’s, so By member starts near the page’s (ghost ${ph.gNext} · page ${ph.pNext})`)

      /* a member who asked: *Your asks* */
      as(asker)
      const M = await b.newContext(opts()); const m = await page(M, 'asker')
      await go(m, '/company/finance/commissions', 1800)
      ok(seedOf(await m.content(), 'finance.commissions.my-asks') === true, `${asker}: the seed is the member’s own open ask (my-asks)`)
      ok(seedOf(await m.content(), 'finance.commissions.asks') === null, '…and says nothing of the studio’s asks, which a member never reads')
      ok(await m.getByTestId('commission-asks').count() === 1 && /Your asks/.test(await m.getByTestId('commission-asks').innerText()), '…whose page draws Your asks')
      await M.close()
      const hm = await held(b, opts(), '/company/finance/commissions', BAND)
      ok(!hm.none && hm.g && /Your asks/.test(hm.gTitle || ''), '…and whose ghost draws Your asks', JSON.stringify(hm))

      /* a member with no open ask: no band anywhere */
      if (quiet) {
        as(quiet)
        const Q = await b.newContext(opts()); const q = await page(Q, 'quiet')
        await go(q, '/company/finance/commissions', 1800)
        ok(seedOf(await q.content(), 'finance.commissions.my-asks') === false, `${quiet}: no open ask — the seed says none`)
        ok(await q.getByTestId('commission-asks').count() === 0, '…the page draws no band')
        await Q.close()
        const hq = await held(b, opts(), '/company/finance/commissions', BAND)
        ok(!hq.none && !hq.g && !hq.p, '…and neither does its ghost', JSON.stringify(hq))
      }

      /* every ask answered: the band leaves the seed, the page and the ghost — and a browser that saw it forgets it on its next visit */
      as('dane')
      sql(`update commission_requests set status = 'approved', answered_by = 'dane', answered_at = strftime('%s','now') where status = 'open'`)
      const A = await b.newContext(opts()); const a = await page(A, 'answered')
      await a.addInitScript((k) => { try { if (!sessionStorage.getItem('s43d')) { localStorage.setItem(k, '1'); sessionStorage.setItem('s43d', '1') } } catch {} }, ASK_KEY)
      await go(a, '/company/finance/commissions', 1800)
      ok(seedOf(await a.content(), 'finance.commissions.asks') === false, 'every ask answered: the seed says none')
      ok(await a.getByTestId('commission-asks').count() === 0, '…the page draws no band')
      ok(await a.evaluate((k) => localStorage.getItem(k), ASK_KEY) === '0', '…and a browser that saw the band remembers it is gone')
      await A.close()
      const ha = await held(b, opts(), '/company/finance/commissions', BAND)
      ok(!ha.none && !ha.g && !ha.p, '…and the ghost draws none', JSON.stringify(ha))
      putBack()
      void MY_ASK_KEY
    }

    // ── 2 · F2-02 / F2-03 the house notes ───────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · the house notes')
      const chips = fs.readFileSync(path.join(ROOT, 'components/om/chips.tsx'), 'utf8')
      ok(/null` and `''` both read as no pick/.test(chips) && /give an \*All\* chip a real value/.test(chips), 'F2-02: the Chips type says an empty value is no pick — give an All chip a real value')
      const form = fs.readFileSync(path.join(ROOT, 'components/leads/lead-form.tsx'), 'utf8')
      ok(!/scripted/i.test(form) && /document-fill\.ts/.test(form), 'F2-03: the lead form no longer calls Fill from a document “scripted” and names its reader')
    }

    // ── 3 · F2-04 Apply defaults never turns GST on under an unregistered entity ──────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Apply defaults and an issuing entity that is not GST-registered')
      as('dane')
      const tpl = sql(`select template_id from quotes where id = '${OM1}'`)
      ok(sql(`select json_extract(defaults_json, '$.gstEnabled') from quote_templates where id = '${tpl}'`) === '1', 'OM-10001’s template starts quotes with GST on')
      const brand = JSON.parse(sql(`select value from settings where key = 'brand'`))
      const ent = { ...(brand.details.entities[0] || {}), name: 'Demo Studio Design LLP', gstRegistered: false, id: 'e-s43d-llp', retired: false }
      brand.details.entities = [...brand.details.entities, ent]
      sql(`update settings set value = ${lit(JSON.stringify(brand))} where key = 'brand'`)
      const apply = async (tag) => {
        const C = await b.newContext(opts()); const p = await page(C, tag)
        await go(p, `/quotes/${OM1}?apply=${tpl}`, 2400)
        const dlg = p.getByRole('dialog').filter({ hasText: /defaults to this quote/ })
        const asked = await dlg.count()
        if (asked) { await dlg.getByRole('button', { name: 'Apply defaults' }).click(); await settle(p, 2200) }
        await shot(p, `03-apply-${tag}`)
        await C.close()
        return asked
      }
      sql(`update quotes set issuing_entity = 'Demo Studio Design LLP', gst_enabled = 0 where id = '${OM1}'`)
      ok(await apply('unregistered') === 1, 'the quote asks “Apply … defaults to this quote?”')
      ok(sql(`select gst_enabled from quotes where id = '${OM1}'`) === '0', 'under Demo Studio Design LLP (not GST-registered) GST stays off after Apply defaults')
      sql(`update quotes set issuing_entity = null, gst_enabled = 0 where id = '${OM1}'`)
      await apply('registered')
      ok(sql(`select gst_enabled from quotes where id = '${OM1}'`) === '1', 'under the studio (GST-registered) Apply defaults still turns the template’s GST on')
      putBack()
    }

    // ── 4 · F2-04 a stage's bill splits out the contract's own GST ───────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · a stage’s bill carries the GST the contract holds')
      as('dane')
      const line = one(`select id, qty, cost_minor, markup_minor, discount_pct, gst_pct from quote_items where quote_id = '${BASEQ}' and kind = 'item' and status <> 'Declined' and optional = 0 and coalesce(print_as, '') = '' order by qty * (cost_minor + markup_minor) desc limit 1`)
      const draft = one(`select id, stage_ref from project_invoices where project_id = '${P1}' and status = 'draft' and kind = 'stage' order by position desc limit 1`)
      ok(!!line && !!draft, 'the signed quote has a priced line and the project an unsent stage Draft')
      const expectRate = () => {
        const lines = json(`select qty, cost_minor, markup_minor, discount_pct, gst_pct, print_as from quote_items where quote_id = '${BASEQ}' and kind = 'item' and status <> 'Declined' and optional = 0 and (print_as is null or print_as = '' or print_as = 'behalf')`)
        const tot = (l) => Math.round(l.qty * (l.cost_minor + l.markup_minor) * (1 - Math.min(100, Math.max(0, l.discount_pct)) / 100))
        const net = lines.reduce((s, l) => s + tot(l), 0)
        const gst = lines.reduce((s, l) => s + (l.print_as === 'behalf' ? 0 : Math.round(tot(l) * l.gst_pct / 100)), 0)
        return net > 0 ? (100 * gst) / net : 0
      }
      const fresh = async (tag) => {
        sql(`delete from project_invoices where id = (select id from project_invoices where project_id = '${P1}' and stage_ref = '${draft.stage_ref}' and status = 'draft')`)
        const C = await b.newContext(opts()); const p = await page(C, tag)
        await go(p, `/projects/${P1}/money`, 2600)   // the Money tab's read makes the missing stage's Draft (idempotent)
        await shot(p, `04-money-${tag}`, true)
        const row = one(`select amount_minor, gst_minor from project_invoices where project_id = '${P1}' and stage_ref = '${draft.stage_ref}' and status = 'draft'`)
        const shown = row ? await p.getByText(new RegExp(`GST S\\$${(row.gst_minor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 }).replace(/[.]/g, '\\.')} inside`)).count() : 0
        await C.close()
        return { row, shown }
      }
      /* with an On behalf line on the signed quote */
      sql(`update quote_items set print_as = 'behalf' where id = '${line.id}'`)
      const r = expectRate()
      const a = await fresh('behalf')
      const nine = a.row ? Math.round(a.row.amount_minor * 9 / 109) : null
      const want_ = a.row ? Math.round(a.row.amount_minor * r / (100 + r)) : null
      ok(!!a.row && Math.abs(a.row.gst_minor - want_) <= 1 && a.row.gst_minor < nine, `with an On behalf line the fresh Draft carries the contract’s own GST share — ${a.row ? a.row.gst_minor : '?'} (≈ ${want_}), under 9/109 (${nine})`)
      ok(a.shown > 0, '…and its row reads that GST inside')
      /* every line at the studio's rate: exactly 9/109, as before */
      sql(`update quote_items set print_as = null where id = '${line.id}'`)
      const c = await fresh('plain')
      ok(!!c.row && c.row.gst_minor === Math.round(c.row.amount_minor * 9 / 109), `every line at 9%: the Draft carries exactly 9/109 of its amount (${c.row ? c.row.gst_minor : '?'})`)
      putBack()
    }

    // ── 5 · widths ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · 390 / 320 and 768 touch')
      as('dane')
      for (const [w, h] of [[390, 844], [320, 700], [768, 1024]]) {
        const C = await b.newContext(phoneOpts(w, h)); const p = await page(C, `w${w}`)
        await go(p, '/company/finance/commissions', 1800)
        ok(await sideways(p) <= 0, `Commission at ${w} touch: no sideways scroll`)
        if (w === 390) await shot(p, '05-commission-390', true)
        await C.close()
      }
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 400))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    console.log(`  ${stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0 ? '✓ the leads’ stages and stage logs are as found' : '✗ the leads’ stages or stage logs changed'}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
