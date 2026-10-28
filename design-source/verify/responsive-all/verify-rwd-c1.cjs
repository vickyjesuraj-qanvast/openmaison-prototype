// The held calls, lane C1 (his "fix all of it and commit and push", 2026-10-24 — the calls `design-source/context/responsive/
// whole-app-audit-2026-10-23/calls-2026-10-24.md` › Lane C1, each as the orchestrator decided; the ledger `outcome-c1.md`). Each call asserted as
// the rule it keeps, never a count, every press pressed for real (a tap under touch, a click with a mouse), on the production build:
//  A · B-06   the lead's QUOTES card ≤1024: on a card too narrow for the names, the current step's name alone — whole, one line, under its own mark
//             (or ending at the bar's end), every mark still at its name's left edge; a card with room (1024 sideways) and the desk draw all six.
//             (the calm UI build 2026-10-27, a deliberate change — audit 2-25 · T-04) the card says the quote's state ONCE, as a sentence ("Approved —
//             not sent to Vivien yet"); the track is unlabelled at every width (a segment a step). B-06's rule on the new card: that one sentence
//             whole — one line, no word broken, inside the card — and the track's marks still cut the studio's steps, the fill ending at the
//             current step's mark.
//  B · Won's split, one rule at every width: an uploaded signed quote starts at the studio's usual — its default payment schedule (the demo's
//      10 · 30 · 30 · 30, and 20 · 40 · 40 once the default template's schedule is that) — on the desk; From System keeps the quote's own.
//  C · K-9    a phone held sideways (844×390) is a phone: the Move stage window is the step screen, On Hold the sheet, the lead form / Edit Lead /
//             Return Lead the bottom sheet, Review imported leads the whole screen — each primary on screen and on top; a tablet held sideways
//             keeps the centred window.
//  D · K-10   a lead's page on a phone held sideways: the header scrolls away, the tab strip alone stays pinned at the top, the Create strip under
//             it; a tablet, the desk and a project's page keep the header pinned.
//  E · W2-06  /tasks on a phone: a task card's lead is a 44 press on its own line — over neither the name nor the due line; a tap opens the lead.
//  F · W2-13  the Notes composer: below 360 the three tools are one + (its sheet: Bulleted list · Numbered list · Attach file, each doing its
//             thing); from 360 each tool keeps its 44, clear of the others and of Save.
//  G · K-11   an L1 header's title keeps one line — Qanvast Ops › Reviews at 320 puts Request reviews under it; its ghost wraps the same.
//  H · K-12   a 1024 tablet held sideways: Name · Stage · Last contact · Next follow-up · Members stand beside the frozen Edit · ⋮, nothing under
//             it, the table not scrolling sideways; what read whole still reads whole.
//  I · W1-20  the website on a phone held sideways: the bottom bar waits, tucked, until the hero has scrolled past; the hero's buttons take the
//             tap at rest; an upright phone keeps the bar.
//  J · 320 and 844×390: no touched page scrolls sideways; 1440: the desk's values as drawn (the six step names, the pinned header).
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything written (the default template's schedule, a composer
// draft) is put back. Usage: BASE=http://localhost:3211 NODE_PATH=<repo>/node_modules node verify-rwd-c1.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/responsive-all/rwd-c1')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3211'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `rwd-c1-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, why) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, why ? `— ${why}` : '') } }

const SIZE = {
  320: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  359: { viewport: { width: 359, height: 740 }, isMobile: true, hasTouch: true },
  360: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  768: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  1024: { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true },
  sideways: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  small: { viewport: { width: 667, height: 375 }, isMobile: true, hasTouch: true },   // a small phone held sideways (≤767 wide)
  1280: { viewport: { width: 1280, height: 800 } },
  1440: { viewport: { width: 1440, height: 1024 } },
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }   // the app's own lazy writes first
  const TABLES = ['quote_templates', 'lead_notes', 'note_attachments']
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const projects0 = sql(`select count(*) from projects`)
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
  }

  /* ── the records this probe reads: the demo's own, by what they are ── */
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const KEVIN = leadId('Kevin Ng'), OLIVIA = leadId('Olivia Martinez'), VIVIEN = leadId('Vivien Lee'), PRIYA = leadId('Priya Nair')
  const CONTACTED = sql(`select id from leads where stage = 'Contacted' and deleted_at is null and direct = 0 order by name limit 1`)
  const RETURNABLE = sql(`select id from leads where source = 'Qanvast' and stage in ('Contacted', 'New', 'Met') and deleted_at is null and id not in (select lead_id from lead_returns) order by name limit 1`)
  const QUOTED = sql(`select l.id from leads l join quotes q on q.lead_id = l.id where l.deleted_at is null and l.direct = 0 and q.deleted_at is null and q.kind = 'quote' group by l.id order by l.name`).split('\n').filter(Boolean)
  const PROJECT = sql(`select id from projects where deleted_at is null and lead_id is not null order by number limit 1`)
  const PARKED = sql(`select id from leads where stage = 'On Hold' and deleted_at is null limit 1`)
  console.log(`records: Kevin ${KEVIN ? '✓' : '✗'} · Vivien ${VIVIEN ? '✓' : '✗'} · quoted ${QUOTED.length} · contacted ${CONTACTED ? '✓' : '✗'} · returnable ${RETURNABLE ? '✓' : '✗'} · project ${PROJECT ? '✓' : '✗'}`)

  const ctx = async (size) => b.newContext({ ...SIZE[size], reducedMotion: 'reduce' })
  const page = async (c) => { const p = await c.newPage(); p.setDefaultTimeout(10000); p.on('pageerror', (e) => errors.push(String(e).slice(0, 200))); return p }
  /* each call's checks on their own: a section that stops (an element that isn't there) fails itself and the next one runs */
  const section = async (name, fn) => { if (process.env.ONLY && !process.env.ONLY.split(',').includes(name[0])) return; try { await fn() } catch (e) { fail++; console.log('  ✗', name, '— stopped:', String(e).split('\n')[0].slice(0, 200)) } }
  const go = async (p, url, wait = 1600) => { await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(wait) }
  const tap = async (p, loc) => { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); await loc.tap({ timeout: 4000 }) }
  const shot = (p, n) => p.screenshot({ path: path.join(dir, `${n}.png`) })
  const box = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } })
  const onTop = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === el || el.contains(h) || h.contains(el)) })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const overlap = (a, c) => a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5
  /* (the calm UI build 2026-10-27, a deliberate change — audit 2-25) the QUOTES card as it is now: its one state sentence (the lines its words
     draw, its box against the track's), the track's step count from its own label ("… — step n of N"), the marks, the fill */
  const quoteCard = (p) => p.evaluate(() => {
    const card = document.querySelector('[data-card="quotes"]'); if (!card) return null
    const state = card.querySelector('[data-testid="quote-card-state"]'), track = card.querySelector('[class*="quote-card-module"][class*="__track"]')
    if (!state || !track) return null
    const tr = track.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(state)
    const rects = [...range.getClientRects()].filter((q) => q.width > 0), words = range.getBoundingClientRect()
    const m = /step (\d+) of (\d+)$/.exec(track.getAttribute('aria-label') || '')
    const fill = track.querySelector('[class*="__bar"]')?.getBoundingClientRect()
    /* a word broken across two lines: its own range draws on more than one line */
    let broken = 0
    for (const node of [...state.childNodes].filter((n) => n.nodeType === 3)) {
      for (const w of node.textContent.matchAll(/\S+/g)) {
        const r = document.createRange(); r.setStart(node, w.index); r.setEnd(node, w.index + w[0].length)
        if (new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size > 1) broken++
      }
    }
    return {
      broken,
      text: (state.textContent || '').trim(), lines: new Set(rects.map((q) => Math.round(q.top))).size, clipped: state.scrollWidth > state.clientWidth + 0.5,
      wl: words.left, wr: words.right, tl: tr.left, tr: tr.right, tw: tr.width,
      step: m ? +m[1] : 0, of: m ? +m[2] : 0, fillR: fill ? fill.right : NaN,
      marks: [...track.querySelectorAll('[class*="__mark"]')].map((x) => x.getBoundingClientRect().left + 1),
      names: card.querySelectorAll('[class*="quote-card-module"][class*="__stepLabel"]').length,
    }
  })
  /** The card's rule at one width: the sentence whole on one line inside the card, the marks at k/N of the track, the fill at the current step's.
   *  `wraps`: a card too narrow for the sentence (768 upright, two columns) wraps it between words — the house's T-12 ("never cut the fact
   *  that matters — wrap to a second line instead"); never a word broken, nothing clipped. A phone's full-width card (390) and the cards
   *  with room hold it on one line. */
  const cardRule = (s, label, { wraps = false } = {}) => {
    ok(!!s && s.text.length > 0 && s.names === 0, `${label}: the state is said once, as a sentence — no step names`, s ? `"${s.text}" · ${s.names} names` : 'no card')
    if (!s) return
    if (wraps) ok(s.broken === 0 && !s.clipped && s.lines <= 2, `${label} · "${s.text}" whole, wrapping only between words — no word broken (T-12)`, `${s.lines} lines · ${s.broken} broken${s.clipped ? ' · clipped' : ''}`)
    else ok(s.lines === 1 && s.broken === 0 && !s.clipped, `${label} · "${s.text}" stands on one line, no word broken`, `${s.lines} lines${s.clipped ? ' · clipped' : ''}`)
    ok(s.wl >= s.tl - 0.5 && s.wr <= s.tr + 0.5, `${label} · "${s.text}" whole inside the card's width`, `${Math.round(s.wl)}–${Math.round(s.wr)} in ${Math.round(s.tl)}–${Math.round(s.tr)}`)
    ok(s.of >= 2 && s.marks.length === s.of - 1 && s.marks.every((x, k) => Math.abs(x - (s.tl + ((k + 1) / s.of) * s.tw)) <= 1.5), `${label} · the track's ${s.of - 1} marks cut its ${s.of} steps evenly`, s.marks.map((x) => Math.round(x)).join(' '))
    ok(s.step >= 1 && Math.abs(s.fillR - (s.tl + (s.step / s.of) * s.tw)) <= 1.5, `${label} · the fill ends at the current step's mark (or the bar's end)`, `fill ${Math.round(s.fillR)} · step ${s.step} of ${s.of}`)
  }

  try {
    /* ── A · B-06 the QUOTES card's steps ── */
    await section("A · B-06 the QUOTES card's steps", async () => {
      console.log('A · B-06 the QUOTES card on a narrow card')
      for (const size of ['390', '768']) {
        const c = await ctx(size); const p = await page(c)
        let n = 0
        for (const id of QUOTED.slice(0, 6)) {
          await go(p, `/leads/${id}`, 1400)
          /* (the calm UI build 2026-10-27, a deliberate change — audit 2-25) the card's one sentence and its unlabelled track (`quoteCard`) */
          const s = await quoteCard(p); if (!s) continue
          n++
          cardRule(s, size, { wraps: size === '768' })
          if (n === 1 || /^Signed/.test(s.text)) await shot(p, `a-${size}-${s.text.replace(/[^\w]+/g, '').slice(0, 24)}`)
        }
        ok(n >= 3, `${size}: the demo's quoted leads were read (${n})`)
        await c.close()
      }
      for (const size of ['1024', '1440']) {
        const c = await ctx(size); const p = await page(c)
        await go(p, `/leads/${QUOTED[0]}`, 1400)
        cardRule(await quoteCard(p), `${size} (a card with room)`)   // (the calm UI build 2026-10-27, a deliberate change — audit 2-25) the same card at every width
        await c.close()
      }
    })
    /* ── B · Won's split at every width ── */
    await section("B · Won's split at every width", async () => {
      console.log('B · Won: an uploaded signed quote starts at the studio’s usual')
      const wonUpload = async (p) => {
        await go(p, `/leads/${VIVIEN}?move=won`, 2500)
        const wiz = p.locator('[role="dialog"][aria-label="Move stage"]')
        await wiz.getByRole('tab', { name: 'Upload' }).first().click(); await p.waitForTimeout(300)
        await wiz.locator('input[type="file"]').first().setInputFiles({ name: 'probe-c1-signed-quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') }); await p.waitForTimeout(2200)
        await wiz.getByLabel('Quote amount (S$)').fill('88500'); await p.waitForTimeout(300)
        const pcts = await wiz.locator('input[aria-label$=" percentage"]').evaluateAll((els) => els.map((e) => [e.getAttribute('aria-label').replace(/ percentage$/, ''), Number(e.value)]))
        return { wiz, pcts }
      }
      {
        const c = await ctx('1440'); const p = await page(c)
        const { wiz, pcts } = await wonUpload(p)
        ok(JSON.stringify(pcts) === JSON.stringify([['Deposit', 10], ['Commencement', 30], ['Mid-Project', 30], ['Completion', 30]]), '1440: the uploaded quote starts at the studio’s usual 10 · 30 · 30 · 30, not 0% (REG-149’s zeroing retired)', JSON.stringify(pcts))
        ok(/100%/.test(await wiz.getByText(/^\d+%$/).first().innerText().catch(() => '')), '…its total reads 100%')
        await shot(p, 'b-1440-won-upload')
        await wiz.getByRole('tab', { name: 'From System' }).first().click(); await p.waitForTimeout(400)
        ok(await wiz.getByTestId('won-split-line').isVisible() && await wiz.locator('input[aria-label$=" percentage"]').count() === 0, '1440: back to From System, the quote’s own schedule (the one line, no editor)')
        await c.close()
        /* the studio's usual is its default payment schedule: the default template set to 20/40/40, an upload starts there */
        sql(`update quote_templates set defaults_json = json_set(coalesce(defaults_json, '{}'), '$.paymentPreset', '20-40-40') where is_default = 1 and status = 'published' and deleted_at is null`)
        const c2 = await ctx('1440'); const p2 = await page(c2)
        const r2 = await wonUpload(p2)
        ok(JSON.stringify(r2.pcts) === JSON.stringify([['Deposit', 20], ['Commencement', 40], ['Completion', 40]]), '1440: with the studio’s default schedule at 20 · 40 · 40, the upload starts there', JSON.stringify(r2.pcts))
        await r2.wiz.locator('input[aria-label="Deposit percentage"]').fill('25'); await p2.waitForTimeout(200)
        await r2.wiz.getByRole('button', { name: 'Reset to default' }).click(); await p2.waitForTimeout(300)
        ok(Number(await r2.wiz.locator('input[aria-label="Deposit percentage"]').inputValue()) === 20, '…and Reset to default goes back to it')
        await c2.close()
        putBack()
      }
      ok(sql(`select count(*) from projects`) === projects0, 'B wrote no project (nothing was saved)')
    })
    /* ── C · K-9 a phone held sideways is a phone ── */
    await section('C · K-9 a phone held sideways is a phone', async () => {
      console.log('C · K-9 a phone held sideways')
      {
        const c = await ctx('sideways'); const p = await page(c)
        await go(p, `/leads/${CONTACTED}?move=met`, 2500)
        const scr = p.getByTestId('move-step-screen')
        const sb = await box(scr).catch(() => null)
        ok(!!sb && sb.l <= 0.5 && sb.t <= 0.5 && sb.w >= 843 && sb.h >= 389, 'the Move stage window is the phone’s step screen, the whole screen', sb ? `${Math.round(sb.w)}×${Math.round(sb.h)}` : 'no step screen')
        const prim = p.getByTestId('move-step-primary'), pb = await box(prim)
        ok(pb.b <= 390.5 && pb.h >= 44 && await onTop(prim), '…its Save & move on screen, 44+, on top', `${Math.round(pb.t)}–${Math.round(pb.b)}`)
        await shot(p, 'c1-move-step-sideways')
        await go(p, `/leads/${PRIYA}?move=on-hold`, 2500)
        const hold = p.getByTestId('hold-sheet'), hs = p.getByTestId('hold-sheet-save')
        ok(await hold.isVisible() && (await box(hs)).b <= 390.5 && await onTop(hs), 'On Hold rises as the phone’s sheet, Save & move on screen and on top')
        await go(p, '/leads?new=1', 2200)
        const form = p.getByRole('dialog', { name: /* (the calm UI build 2026-10-27, a deliberate change) B2 2-33 · W-475: the "New lead" form — "Name*", "Mobile number*" */ 'New lead' }), fb = await box(form)
        ok(fb.l <= 0.5 && fb.w >= 843 && Math.abs(fb.b - 390) <= 1, 'the lead form rises as the phone’s bottom sheet (full width, on the screen’s foot)', `${Math.round(fb.l)},${Math.round(fb.t)} ${Math.round(fb.w)}×${Math.round(fb.h)}`)
        ok(await form.getByTestId('paste-message').isVisible(), '…as the phone’s short new lead (the name, the mobile, the fill rows)')
        const addBtn = form.getByRole('button', { name: /^Add lead$/i }).last()
        ok((await box(addBtn)).b <= 390.5 && await onTop(addBtn), '…its Add lead on screen and on top')
        await shot(p, 'c2-lead-form-sideways')
        await go(p, `/leads/${KEVIN}`)
        await tap(p, p.getByRole('button', { name: 'More options' }).first()); await p.waitForTimeout(600)
        await tap(p, p.getByRole('menuitem', { name: /^Edit/ }).first()); await p.waitForTimeout(1200)
        const edit = p.getByRole('dialog', { name: 'Edit Lead' }), eb = await box(edit)
        ok(eb.l <= 0.5 && eb.w >= 843 && Math.abs(eb.b - 390) <= 1 && await edit.getByTestId('edit-short-list').isVisible(), 'Edit Lead rises as the phone’s sheet with its short list')
        const save = edit.getByRole('button', { name: 'Save', exact: true })
        ok((await box(save)).b <= 390.5 && await onTop(save), '…its Save on screen and on top')
        if (RETURNABLE) {
          await go(p, `/leads/${RETURNABLE}`)
          await tap(p, p.getByRole('button', { name: 'More options' }).first()); await p.waitForTimeout(600)
          await tap(p, p.getByRole('menuitem', { name: /Return Lead|Return to Qanvast|Appeal/ }).first()); await p.waitForTimeout(1400)   // (the calm UI build 2026-10-27, a deliberate change) B2: "Return to Qanvast"
          const ret = p.getByRole('dialog', { name: /Return Lead|Return to Qanvast|Appeal/ }), rb = await box(ret)
          ok(rb.l <= 0.5 && rb.w >= 843 && Math.abs(rb.b - 390) <= 1, 'Return Lead rises as the phone’s sheet', `${Math.round(rb.l)},${Math.round(rb.t)} ${Math.round(rb.w)}×${Math.round(rb.h)}`)
          const next = ret.locator('[data-surface-foot] button').last()
          ok((await box(next)).b <= 390.5 && await onTop(next), '…its foot’s primary on screen and on top')
          await shot(p, 'c3-return-sideways')
        } else ok(false, 'a Qanvast lead to return')
        await go(p, '/leads')
        /* (the calm UI build 2026-10-27, a deliberate change) B2 2-16: the docked review bar went — the queue is the scope pill's "To review · n" row */
        await tap(p, p.locator('button[class*="scope-pill"]').first()); await p.waitForTimeout(500)
        await tap(p, p.getByTestId('leads-review-open').first()); await p.waitForTimeout(1200)
        const rev = p.getByRole('dialog', { name: 'Review imported leads' }), vb = await box(rev)
        ok(vb.l <= 0.5 && vb.t <= 0.5 && vb.w >= 843 && vb.h >= 389, 'Review imported leads is the whole screen, as on a phone', `${Math.round(vb.w)}×${Math.round(vb.h)}`)
        const approveAll = rev.getByRole('button', { name: /^(Approve All Clean|Approve \d+ \(no duplicates\))/ })   // (the calm UI build 2026-10-27, a deliberate change) B2: "Approve n (no duplicates)"
        ok(await onTop(approveAll), '…Approve All Clean on top')
        await shot(p, 'c4-review-sideways')
        ok(!errors.length, 'no page errors on the sideways surfaces', errors.join(' | '))
        await c.close()
      }
      {
        const c = await ctx('1024'); const p = await page(c)
        await go(p, `/leads/${CONTACTED}?move=met`, 2500)
        ok(await p.getByTestId('move-step-screen').count() === 0 && await p.getByRole('tablist', { name: 'Stages' }).isVisible(), 'a tablet held sideways (1024×768) keeps the centred window with its rail (P-04)')
        await c.close()
      }
    })
    /* ── D · K-10 the lead's page on a phone held sideways ── */
    await section("D · K-10 the lead's page on a phone held sideways", async () => {
      console.log('D · K-10 the lead’s header scrolls away; the strip stays')
      {
        const c = await ctx('sideways'); const p = await page(c)
        await go(p, `/leads/${KEVIN}`)
        const head = p.locator('header').filter({ has: p.getByRole('heading', { level: 1, name: 'Kevin Ng' }) }).first()
        const strip = p.getByRole('tablist', { name: 'Lead sections' })
        const h0 = await box(head), s0 = await box(strip)
        ok(h0.t >= 0 && Math.abs(s0.t - h0.b) <= 1, 'at rest the header, then the strip under it')
        await p.mouse.move(420, 260); await p.mouse.wheel(0, 700); await p.waitForTimeout(700)
        const h1 = await box(head), s1 = await box(strip)
        const aside = await box(p.locator('aside[aria-label="Create"]').first()).catch(() => null)
        ok(h1.b <= 0.5, 'scrolled, the header has left the screen', `header ${Math.round(h1.t)}–${Math.round(h1.b)}`)
        ok(Math.abs(s1.t) <= 0.5 && s1.b <= 49, '…the tab strip alone is pinned, at the screen’s top', `strip ${Math.round(s1.t)}–${Math.round(s1.b)}`)
        ok(!aside || Math.abs(aside.t - s1.b) <= 1, '…and the Create strip docks under it', aside ? `aside from ${Math.round(aside.t)}` : '')
        await shot(p, 'd1-lead-scrolled-sideways')
        await tap(p, strip.getByRole('tab', { name: /^Tasks/ }))
        await p.waitForURL(/\/tasks/, { timeout: 8000 }).catch(() => {})
        ok(/\/leads\/[^/]+\/tasks/.test(p.url()), '…a tab in the pinned strip takes the tap')
        if (PROJECT) {
          await go(p, `/projects/${PROJECT}`)
          await p.mouse.move(420, 260); await p.mouse.wheel(0, 700); await p.waitForTimeout(700)
          const ph = await box(p.locator('h1').first().locator('xpath=ancestor::header[1]'))
          /* (held calls 2026-10-24, a deliberate change of this rule) lane C2 gave a project's page K-10 too (REG-2917): held sideways its header
             scrolls away and the tab strip stays — the two record pages read alike */
          ok(ph.b <= 1, 'a project’s page held sideways: its header scrolls away too (C2, K-10)', `${Math.round(ph.t)}–${Math.round(ph.b)}`)
        }
        await c.close()
      }
      for (const size of ['1024', '1440']) {
        const c = await ctx(size); const p = await page(c)
        await go(p, `/leads/${KEVIN}`)
        await p.mouse.move(600, 500); await p.mouse.wheel(0, 700); await p.waitForTimeout(700)
        const h = await box(p.locator('header').filter({ has: p.getByRole('heading', { level: 1, name: 'Kevin Ng' }) }).first())
        ok(Math.abs(h.t - 8) <= 1, `${size}: the header stays pinned at 8 (the desk's and the tablet's)`, `${Math.round(h.t)}`)
        await c.close()
      }
    })
    /* ── E · W2-06 a task card's lead ── */
    await section("E · W2-06 a task card's lead", async () => {
      console.log('E · W2-06 a task card’s lead link')
      for (const size of ['320', '390']) {
        const c = await ctx(size); const p = await page(c)
        await go(p, '/tasks')
        const cards = p.getByTestId('task-card')
        const n = Math.min(await cards.count(), 6)
        let checked = 0, bad = []
        for (let i = 0; i < n; i++) {
          const card = cards.nth(i), link = card.locator('[data-testid="task-card-for"] a')
          if (!(await link.count())) continue
          const lb = await box(link), nb = await box(card.getByTestId('task-card-name')), meta = card.locator('[class*="task-card-module"][class*="__meta"]')
          const mb = await box(meta)
          checked++
          if (!(lb.h >= 44 && lb.w >= 44 && !overlap(lb, nb) && !overlap(lb, mb))) bad.push(`${i}: ${Math.round(lb.w)}×${Math.round(lb.h)}`)
        }
        ok(checked >= 2 && !bad.length, `${size}: each card’s lead is a 44 press on its own line, over neither the name nor the due line`, `checked ${checked} · ${bad.join(' · ')}`)
        const first = cards.filter({ has: p.locator('[data-testid="task-card-for"] a') }).first()
        const href = await first.locator('[data-testid="task-card-for"] a').getAttribute('href')
        const lb = await box(first.locator('[data-testid="task-card-for"] a'))
        await p.touchscreen.tap(lb.l + 8, lb.t + lb.h / 2 - 19)   // 19 above the words' middle — the top of a 44 target (a 24 line's tap fell on the gap above)
        await p.waitForURL((u) => !/\/tasks(\?|$)/.test(new URL(u).pathname + '?'), { timeout: 8000 }).catch(() => {})
        ok(href && p.url().includes(href.split('?')[0]), `${size}: a tap 19 above the lead's words still opens the lead`, `${p.url().replace(BASE, '')} vs ${href}`)
        if (size === '390') { await go(p, '/tasks'); await shot(p, 'e-tasks-390') }
        await c.close()
      }
    })
    /* ── F · W2-13 the Notes composer ── */
    await section('F · W2-13 the Notes composer', async () => {
      console.log('F · W2-13 the composer’s tools')
      for (const size of ['320', '359', '360', '390']) {
        const c = await ctx(size); const p = await page(c)
        /* (the calm UI build 2026-10-27, a deliberate change — audit 2-46) a phone's note composer opens from New › Note (`?new=note`, the quick link's
           landing) — it no longer sits docked under the list on every visit */
        await go(p, `/leads/${OLIVIA}/notes?new=note`)
        const bar = p.locator('[class*="lead-notes-module"][class*="__composerBar"]')
        const tools = ['Bulleted list', 'Numbered list', 'Attach file'].map((n) => bar.getByRole('button', { name: n, exact: true }))
        const more = bar.getByTestId('composer-tools'), save = bar.getByRole('button', { name: 'Save', exact: true })
        const sb = await box(save)
        if (+size < 360) {
          const vis = await Promise.all(tools.map((t) => t.isVisible()))
          const mb = await box(more)
          ok(!vis.some(Boolean) && mb.w >= 44 && mb.h >= 44 && !overlap(mb, sb) && await onTop(more), `${size}: the three tools fold into one 44 +, clear of Save`, `+ ${Math.round(mb.w)}×${Math.round(mb.h)}`)
          if (size === '320') {
            const textbox = p.locator('[data-testid="note-editor"] [role="textbox"]').first()
            await tap(p, textbox); await p.waitForTimeout(300)
            await tap(p, more); await p.waitForTimeout(700)
            const sheet = p.getByRole('menu', { name: 'Lists and files' }).or(p.getByRole('dialog', { name: 'Lists and files' })).first()
            ok(await sheet.isVisible(), '320: the + opens its sheet "Lists and files"')
            ok(await sheet.getByRole('menuitem').count() === 3, '…with Bulleted list · Numbered list · Attach file')
            await shot(p, 'f-320-tools-sheet')
            await tap(p, sheet.getByRole('menuitem', { name: 'Bulleted list' })); await p.waitForTimeout(600)
            ok(await textbox.locator('ul').count() >= 1, '…Bulleted list puts a list in the note being written')
            await tap(p, more); await p.waitForTimeout(600)
            await tap(p, p.getByRole('menuitem', { name: 'Attach file' })); await p.waitForTimeout(900)
            ok(await p.getByRole('dialog').filter({ hasText: /Attach/ }).last().isVisible(), '…Attach file opens the attach window')
            await p.keyboard.press('Escape'); await p.waitForTimeout(400)
          }
        } else {
          const bs = await Promise.all(tools.map((t) => box(t)))
          const clear = bs.every((x, i) => x.w >= 43.5 && x.h >= 43.5 && !overlap(x, sb) && bs.every((y, j) => j === i || !overlap(x, y)))
          ok(clear && !(await more.isVisible()), `${size}: each of the three keeps its 44, clear of the others and of Save`, bs.map((x) => `${Math.round(x.l)}–${Math.round(x.r)}`).join(' · ') + ` · Save ${Math.round(sb.l)}`)
        }
        await c.close()
      }
      putBack()
    })
    /* ── G · K-11 an L1 header's title keeps one line ── */
    await section("G · K-11 an L1 header's title keeps one line", async () => {
      console.log('G · K-11 the L1 header')
      const titleLines = (p) => p.evaluate(() => { const h = document.querySelector('header[data-om-l1-header]'); const t = h.querySelector('h1'); const a = h.children[1]; const tr = t.getBoundingClientRect(); return { lines: Math.round(tr.height / (parseFloat(getComputedStyle(t).lineHeight) || 24)), tb: tr.bottom, tt: tr.top, a: a ? (() => { const r = a.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right } })() : null } })
      for (const size of ['320', '360', '390']) {
        const c = await ctx(size); const p = await page(c)
        await go(p, '/qanvast-ops/reviews')
        const t = await titleLines(p)
        const req = p.getByTestId('reviews-request').first()   // (the calm UI build 2026-10-27, a deliberate change) B2: the header's button reads "Ask for reviews" — pressed by its handle
        const rb = await box(req)
        ok(t.lines === 1, `${size}: "Qanvast Ops" on one line`, `${t.lines} lines`)
        ok(rb.l >= 0 && rb.r <= +size && await onTop(req) && (rb.t >= t.tb - 1 || (rb.t < t.tb && rb.b > t.tt)), `${size}: Request reviews on screen, on top — beside a one-line title or under it`)
        if (size === '320') { ok(rb.t >= t.tb - 1, '320: …under it'); await shot(p, 'g-320-reviews') }
        for (const r of ['/leads', '/tasks', '/projects', '/profile', '/company/members', '/meetings']) {
          await go(p, r, 1200)
          const x = await titleLines(p).catch(() => null)
          if (x) ok(x.lines === 1, `${size} · ${r}: the title on one line`, `${x.lines} lines`)
        }
        await c.close()
      }
      { /* the ghost wraps where the page does (the held reveal: its first paint faked far away) */
        const c = await ctx('320')
        await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
        const p = await page(c)
        await p.goto(BASE + '/qanvast-ops/reviews', { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2200)
        const m = await p.evaluate(() => {
          const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
          if (!reveal) return null
          const ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c))), content = reveal.querySelector(':scope > [data-ready]')
          const gh = ghost?.querySelector('[class*="ghost-kit-module"][class*="__head"]'), ph = content?.querySelector('header[data-om-l1-header]')
          return gh && ph ? { g: gh.getBoundingClientRect().height, p: ph.getBoundingClientRect().height } : null
        })
        ok(m && Math.abs(m.g - m.p) <= 4, '320: the Reviews ghost’s header wraps where the page’s does', m ? `ghost ${Math.round(m.g)} · page ${Math.round(m.p)}` : 'no held reveal')
        await c.close()
      }
    })
    /* ── H · K-12 the listing on a tablet held sideways ── */
    await section('H · K-12 the listing on a tablet held sideways', async () => {
      console.log('H · K-12 the tablet listing at 1024')
      {
        const c = await ctx('1024'); const p = await page(c)
        await go(p, '/leads?view=table', 2000)
        const m = await p.evaluate(() => {
          const box = document.querySelector('[data-scroll-box]'), t = box.querySelector('[role="table"]')
          const heads = [...t.querySelectorAll('[role="columnheader"]')].map((h) => ({ k: h.textContent.replace(/unfold_more|arrow_\w+/g, '').trim(), r: h.getBoundingClientRect().right }))
          const band = t.querySelector('[class*="__rowActions"]').getBoundingClientRect().left
          const cut = (sel) => [...t.querySelectorAll(sel)].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.slice(0, 30))
          const assign = [...t.querySelectorAll('[role="row"]')].slice(1).map((row) => { const cells = row.querySelectorAll('[role="cell"]'); const mem = cells[4]; if (!mem) return true; const cr = mem.getBoundingClientRect(); return [...mem.querySelectorAll('button, a, [class*="avatar"]')].every((el) => { const r = el.getBoundingClientRect(); return r.right <= cr.right + 0.5 }) })
          return { heads, band, sideways: box.scrollWidth - box.clientWidth, stage: cut('[class*="__stageBtn"]'), name: cut('[class*="__name"]'), hold: cut('[class*="__holdLine"]'), dates: [...t.querySelectorAll('[role="row"]')].slice(1).map((row) => row.querySelectorAll('[role="cell"]')[2]?.querySelector('[class*="__plain"]')).filter(Boolean).filter((el) => el.scrollWidth > el.clientWidth + 1).length, members: assign.every(Boolean) }
        })
        ok(m.heads.length === 5 && m.heads.every((h) => h.r <= m.band + 0.5), 'Name · Stage · Last contact · Next follow-up · Members all end beside the frozen Edit · ⋮', m.heads.map((h) => `${h.k} → ${Math.round(h.r)}`).join(' · ') + ` · band ${Math.round(m.band)}`)
        ok(m.sideways <= 1, '…the table has nothing to scroll to', `${m.sideways}`)
        const cut = await p.locator('[data-kb="assign"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 30)))
        ok(cut.length === 0, '…every Members cell holds its avatars, its +n and its Assign glyph', cut.join(' · '))
        ok(!m.stage.length && !m.name.length && !m.hold.length && m.dates === 0 && m.members, '…and what read whole still reads whole: the stage, the name and its hold line, the last contact’s day and time, every Members cell', JSON.stringify({ stage: m.stage, name: m.name, hold: m.hold, dates: m.dates, members: m.members }))
        await shot(p, 'h-1024-listing')
        await c.close()
        const c7 = await ctx('768'); const p7 = await page(c7)
        await go(p7, '/leads?view=table', 2000)
        const r7 = await p7.evaluate(() => { const t = document.querySelector('[data-scroll-box] [role="table"]'); const band = t.querySelector('[class*="__rowActions"]').getBoundingClientRect().left; return [...t.querySelectorAll('[role="columnheader"]')].slice(0, 3).every((h) => h.getBoundingClientRect().right <= band + 0.5) })
        ok(r7, '768 upright: Name · Stage · Last contact still on the first screen')
        const cut7 = await p7.locator('[data-kb="assign"]').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 30)))
        ok(cut7.length === 0, '768 upright: every Members cell holds its avatars, its +n and its Assign glyph (W2-03’s rule kept)', cut7.join(' · '))
        await c7.close()
      }
    })
    /* ── I · W1-20 the website's bar on a phone held sideways ── */
    await section("I · W1-20 the website's bar on a phone held sideways", async () => {
      console.log('I · W1-20 the website’s bottom bar')
      {
        const c = await ctx('sideways'); const p = await page(c)
        for (const r of ['/site/try', '/site/pricing', '/site/platform/leads']) {
          await go(p, r, 1800)
          const bar = p.getByTestId('site-phone-bar')
          const bb = await box(bar.locator('> div').first())
          ok(bb.t >= 389, `${r}: at rest the bar waits below the screen`, `bar top ${Math.round(bb.t)}`)
        }
        await go(p, '/site/try', 1800)
        /* the hero's second button runs past the fold at rest; what shows of it takes the tap — no bar over it */
        const photo = p.getByRole('button', { name: /Take a photo/ }).first()
        const visibleOnTop = await photo.evaluate((el) => { const r = el.getBoundingClientRect(); const y = (r.top + Math.min(r.bottom, innerHeight)) / 2; const h = document.elementFromPoint(r.left + r.width / 2, y); return r.top < innerHeight && !!h && (h === el || el.contains(h)) })
        ok(visibleOnTop, '/site/try: what shows of the hero’s "Take a photo" at rest is its own, no bar over it')
        await shot(p, 'i1-site-try-rest')
        const heroB = await p.evaluate(() => document.querySelector('#main-content > section').getBoundingClientRect().bottom)
        await p.mouse.move(420, 200); await p.mouse.wheel(0, Math.ceil(heroB)); await p.waitForTimeout(1400)
        const after = await box(p.getByTestId('site-phone-bar').locator('> div').first())
        ok(after.b <= 390.5 && after.t < 390, 'past the hero (and the scroll paused), the bar is back', `bar ${Math.round(after.t)}–${Math.round(after.b)}`)
        await shot(p, 'i2-site-try-past-hero')
        await c.close()
        const cs = await ctx('small'); const ps = await page(cs)
        await go(ps, '/site/try', 1800)
        const sm = await box(ps.getByTestId('site-phone-bar').locator('> div').first())
        ok(sm.t >= 374, 'a small phone held sideways (667×375): the bar waits too', `bar top ${Math.round(sm.t)}`)
        await cs.close()
        const c2 = await ctx('390'); const p2 = await page(c2)
        await go(p2, '/site/try', 1800)
        const ub = await box(p2.getByTestId('site-phone-bar').locator('> div').first())
        ok(ub.b <= 844.5 && ub.t < 844, 'an upright phone keeps the bar at rest (unchanged)')
        await c2.close()
      }
    })
    /* ── J · no sideways scroll; the desk ── */
    await section('J · no sideways scroll; the desk', async () => {
      console.log('J · 320 and 844×390: nothing scrolls sideways; the desk')
      for (const size of ['320', 'sideways']) {
        const c = await ctx(size); const p = await page(c)
        const bad = []
        for (const r of ['/leads', '/tasks', `/leads/${KEVIN}`, `/leads/${OLIVIA}/notes`, `/leads/${QUOTED[0]}`, '/qanvast-ops/reviews', '/site/try', '/profile']) {
          await go(p, r, 1200)
          const sw = await sideways(p); if (sw > 0) bad.push(`${r} ${sw}`)
        }
        ok(!bad.length, `${size}: no touched page scrolls sideways`, bad.join(' · '))
        await c.close()
      }
      {
        const c = await ctx('1280'); const p = await page(c)
        await go(p, `/leads/${QUOTED[0]}`)
        /* (the calm UI build 2026-10-27, a deliberate change — audit 2-25) the desk's card is the calm build's too: the six steps are the track's
           segments (no names at any width — this check read an empty list as a pass), the state one sentence on one line */
        const s = await quoteCard(p)
        ok(!!s && s.of === 6 && s.marks.length === 5 && s.lines === 1 && s.names === 0, '1280: the six step names drawn, each on one line (≥1025 unchanged)', s ? `"${s.text}" · ${s.lines} lines · ${s.of} steps · ${s.marks.length} marks` : 'no card')
        await c.close()
      }
    })
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 400))
  } finally {
    putBack()
    ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the leads’ stages and stage logs are as found')
    ok(TABLES.every((t) => hashOf(t) === before.get(t)), 'everything written is put back')
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
