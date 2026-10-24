// Activity by date, lane A (his message 2026-10-24, from feedback across the Activity tabs: "group the activities by date and add type icons for
// the ones we have (Tasks · Files · Notes · Stage) to represent what type of activity it is"; the ledger `design-source/context/responsive/
// whole-app-audit-2026-10-23/outcome-a.md`). Each rule asserted as the rule it keeps, never a count, on the production build:
//  0 · the pure rules (rwd-a-pure.mts): a line's type glyph, the quote trail's glyphs, the day's words, every name inside the icon subset.
//  A · 1440, a lead's Activity: the house timeline by day — each day opened by its marker on the rail (REG-190's rule + centred chip, 12
//      secondary), the days newest first and each named once; each row its glyph on the rail (24 circle, centred on the rail's line and on the
//      time's line, the icon really drawn), its time only, its sentence; the rail one unbroken line from the first day's rule to the last glyph;
//      the chips keep their kind's icon (Tasks task_alt · Files folder · Notes the note or a contact log's call_log · Stage swap_horiz); the
//      sentence is still the link, underlined on hover; search narrows and its no-results card stays.
//  B · 1440, the Overview's Recent activity card: each row led by the feed's glyph for that line, the 36 row kept.
//  C · 1440, a project's Activity: the same timeline; the client's pick keeps its card under its line.
//  D · 1440, the quote editor's Activity: the same timeline — one "Quote activity" list, days, a glyph per line by what it is (signed: draw,
//      approved: verified), the time only; the first line keeps one `when` and one `text` (what rq-k5 reads).
//  E · 390 (touch), a lead's Activity: L4's day cards keep their runs and Show older, the day in the house long date, each row led by its glyph,
//      the time over the sentence, rows 44.
//  F · 768 · 1024 (touch) · 844×390: the cards with glyph · time · sentence on one line from 768; no sideways scroll.
//  G · 320: no sideways scroll on the lead's Activity or the Quote screen's Activity; the quote's trail at 390 reads 16 over 14 with its glyphs.
//  H · 1280 (a mouse): the desk's timeline. No page errors. The probe writes nothing (visits only).
// Run against `next start` on a scratch copy of the demo DB — never local.db.
// Usage: BASE=http://localhost:3213 NODE_PATH=<repo>/node_modules node verify-rwd-a.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
const dir = dirArg || path.join(REPO, 'design-source/verify/responsive-all/rwd-a')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3213'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name, why) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, why ? `— ${why}` : '') } }

const SIZE = {
  320: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  768: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  1024: { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true },
  sideways: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 } },
  1440: { viewport: { width: 1440, height: 1024 } },
}
const DAY_WORDS = /^(Today|Yesterday|(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ’\d{2})$/
const TIME = /^\d{1,2}:\d{2} [AP]M$/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** a day's words → its midnight (Today / Yesterday from the browser's clock) */
const dayOf = (label, now) => {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0)
  if (label === 'Today') return d0.getTime()
  if (label === 'Yesterday') return d0.getTime() - 86_400_000
  const m = /, (\d{1,2}) (\w{3}) ’(\d{2})$/.exec(label)
  return m ? new Date(2000 + +m[3], MONTHS.indexOf(m[2]), +m[1]).getTime() : NaN
}
const minutes = (t) => { const m = TIME.exec(t) ? /^(\d{1,2}):(\d{2}) ([AP])M$/.exec(t) : null; return m ? ((+m[1] % 12) + (m[3] === 'P' ? 12 : 0)) * 60 + +m[2] : NaN }

;(async () => {
  // 0 · the pure rules, run from the repo
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/responsive-all/rwd-a-pure.mts')}"`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const p = (out.match(/✓/g) || []).length, f = (out.match(/✗/g) || []).length
    pass += p; fail += f
    console.log(`0 · the pure rules: ${p} passed, ${f} failed`)
    if (f) console.log(out.split('\n').filter((l) => l.includes('✗')).join('\n'))
  } catch (e) { fail++; console.log('  ✗ the pure rules did not run:', String(e.stdout || e).slice(0, 400)) }

  const b = await chromium.launch()
  const errors = []
  const leadId = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null limit 1`)
  const OLIVIA = leadId('Olivia Martinez'), FARAH = leadId('Farah Ahmad'), KEVIN = leadId('Kevin Ng')
  const BEN_P = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Benjamin Han' and p.deleted_at is null limit 1`)
  const SIGNED = sql(`select id from quotes where kind = 'quote' and status = 'Signed' and signed_at is not null and approved_at is not null and deleted_at is null order by number limit 1`)
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`), logs0 = sql(`select count(*) from stage_logs`)
  const page = async (size, url) => {
    const ctx = await b.newContext({ ...SIZE[size], reducedMotion: 'reduce' })
    const p = await ctx.newPage(); p.setDefaultTimeout(10000)
    p.on('pageerror', (e) => errors.push(`${size} ${url}: ${e.message}`))
    await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(1200)
    return { ctx, p }
  }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full }).catch(() => {})
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  /** the desk timeline, read: each item's marker label, its row's glyph name and boxes, its time and sentence */
  const readDesk = (p, listSel) => p.evaluate((sel) => {
    const list = document.querySelector(sel)
    if (!list) return null
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }
    return [...list.children].map((li) => {
      const mark = li.querySelector('[data-testid="timeline-day"]')
      const row = li.lastElementChild
      const [rail, time, body] = [...row.children]
      const glyph = rail.querySelector('[data-glyph]')
      const before = getComputedStyle(rail, '::before')
      const icon = glyph?.querySelector('.msr')
      return {
        day: mark ? mark.textContent.trim() : null,
        markRail: mark ? (() => { const r = mark.firstElementChild; const bs = getComputedStyle(r, '::before'); return { box: box(r), top: parseFloat(bs.top), bottom: parseFloat(bs.bottom) } })() : null,
        markRule: mark ? (() => { const h = mark.lastElementChild; const bs = getComputedStyle(h, '::before'); const chip = h.firstElementChild; const cs = getComputedStyle(chip); return { box: box(h), left: parseFloat(bs.left), chip: box(chip), chipSize: parseFloat(cs.fontSize), chipColor: cs.color, chipBg: cs.backgroundColor } })() : null,
        glyphs: rail.querySelectorAll('[data-glyph]').length,
        glyph: glyph?.getAttribute('data-glyph') ?? null,
        glyphBox: glyph ? box(glyph) : null, iconW: icon ? icon.getBoundingClientRect().width : null, iconSize: icon ? parseFloat(getComputedStyle(icon).fontSize) : null,
        glyphBg: glyph ? getComputedStyle(glyph).backgroundColor : null, glyphInk: glyph ? getComputedStyle(glyph).color : null,
        rail: box(rail), railTop: parseFloat(before.top), railBottom: parseFloat(before.bottom), railLineX: rail.getBoundingClientRect().x + rail.getBoundingClientRect().width / 2,
        time: time.textContent.trim(), timeBox: box(time), timePadTop: parseFloat(getComputedStyle(time).paddingTop), timeLh: parseFloat(getComputedStyle(time).lineHeight), timeSize: parseFloat(getComputedStyle(time).fontSize),
        text: body.textContent.trim(), bodyBox: box(body), link: !!body.querySelector('a'), hasCard: !!body.querySelector('[data-testid="activity-card"]'),
        cls: { when: li.querySelectorAll('[class*="when"]').length, text: li.querySelectorAll('[class*="text"]').length },
      }
    })
  }, listSel)
  const tones = (p) => p.evaluate(() => { const t = document.createElement('span'); t.style.background = 'var(--om-color-surface-bg)'; t.style.color = 'var(--om-color-on-surface-secondary)'; document.body.append(t); const c = getComputedStyle(t); const r = { bg: c.backgroundColor, ink: c.color }; t.remove(); return r })
  /** the timeline's rules, one feed: days, glyphs, times, the rail */
  const timelineRules = (rows, label, now, tone) => {
    const days = rows.filter((r) => r.day !== null).map((r) => r.day)
    ok(rows.length > 0 && rows[0].day !== null, `${label}: the feed opens with its day (${rows[0]?.day})`)
    ok(days.length >= 2 && days.every((d) => DAY_WORDS.test(d)), `${label}: each day in the house words — Today · Yesterday · "Fri, 2 Oct ’26" (${days.slice(0, 4).join(' · ')})`)
    const ds = days.map((d) => dayOf(d, now))
    ok(ds.every((d, i) => !Number.isNaN(d) && (i === 0 || d < ds[i - 1])), `${label}: the days newest first, each named once (${days.length} days)`)
    ok(rows.every((r) => TIME.test(r.time)), `${label}: every row says its time only — the day says the rest`, rows.find((r) => !TIME.test(r.time))?.time)
    let inOrder = true, prev = Infinity
    for (const r of rows) { if (r.day !== null) prev = Infinity; const m = minutes(r.time); if (m > prev) inOrder = false; prev = m }
    ok(inOrder, `${label}: within a day, newest first`)
    ok(rows.every((r) => r.glyphs === 1 && r.glyph), `${label}: every row wears one glyph on the rail — no bare dot`)
    ok(rows.every((r) => Math.abs(r.iconW - r.iconSize) < 0.6 && r.iconSize === 16), `${label}: every glyph’s icon is drawn (16 wide at 16 — a name outside the subset would print its word)`, JSON.stringify(rows.find((r) => Math.abs(r.iconW - r.iconSize) >= 0.6)))
    ok(rows.every((r) => r.glyphBox.w === 24 && r.glyphBox.h === 24 && Math.abs(r.glyphBox.x + 12 - r.railLineX) < 0.6), `${label}: the glyph is the 24 circle centred on the rail’s line`)
    ok(rows.every((r) => Math.abs(r.glyphBox.y + 12 - (r.timeBox.y + r.timePadTop + r.timeLh / 2)) <= 2.5), `${label}: each glyph sits on its time’s line`, JSON.stringify(rows.map((r) => Math.round(r.glyphBox.y + 12 - (r.timeBox.y + r.timePadTop + r.timeLh / 2))).slice(0, 8)))
    if (tone) ok(rows.every((r) => r.glyphBg === tone.bg && r.glyphInk === tone.ink), `${label}: the glyph in the secondary ink on the soft ground (the bell’s event glyph)`)
    /* the rail: one unbroken line from the first day's rule to the last glyph */
    const segs = []
    for (const r of rows) {
      if (r.markRail) segs.push([r.markRail.box.y + r.markRail.top, r.markRail.box.y + r.markRail.box.h - r.markRail.bottom])
      segs.push([r.rail.y + r.railTop, r.rail.y + r.rail.h - r.railBottom])
    }
    const gaps = segs.slice(1).map((s, i) => Math.abs(s[0] - segs[i][1])).filter((g) => g > 1)
    const first = rows[0]?.markRail, last = rows[rows.length - 1]
    ok(gaps.length === 0, `${label}: the rail is one unbroken line`, `${gaps.length} breaks`)
    ok(!!first && Math.abs(first.top - first.box.h / 2) < 1 && Math.abs(last.rail.y + last.rail.h - last.railBottom - (last.glyphBox.y + 12)) <= 2.5, `${label}: it starts at the first day’s rule and stops at the last glyph`)
    /* the marker: the rule from the rail's line, the chip centred on it, 12 secondary, on the page's white */
    const marks = rows.filter((r) => r.markRule)
    ok(marks.every((r) => Math.abs(r.markRule.box.x + r.markRule.left - r.markRail.box.x - r.markRail.box.w / 2) < 1), `${label}: each day’s rule starts at the rail’s line`)
    ok(marks.every((r) => Math.abs(r.markRule.chip.x + r.markRule.chip.w / 2 - (r.markRule.box.x + r.markRule.box.w / 2)) < 1), `${label}: the date’s chip is centred on its rule (REG-190)`)
    if (tone) ok(marks.every((r) => r.markRule.chipSize === 12 && r.markRule.chipColor === tone.ink && r.markRule.chipBg === 'rgb(255, 255, 255)'), `${label}: the chip 12 in the secondary ink on white, as the mock drew it`)
  }

  /* ── A · 1440, a lead's Activity ── */
  console.log('A · 1440, a lead’s Activity')
  {
    const { ctx, p } = await page(1440, `/leads/${OLIVIA}/activity`)
    const now = await p.evaluate(() => Date.now())
    ok(await p.locator('[data-testid="activity-timeline"]').count() === 1 && await p.locator('[data-testid="activity-days"]').count() === 0, 'the desk draws the timeline (the day cards are a phone’s and a tablet’s)')
    const rows = await readDesk(p, '[data-testid="activity-timeline"] ol')
    timelineRules(rows, 'Olivia', now, await tones(p))
    ok(await p.locator('[data-testid="activity-timeline"] [data-testid="activity-row"]').count() === rows.length, 'each line is an activity row (the hook the other probes read)')
    ok(rows.every((r) => !r.text.includes('’26 ·')), 'no row repeats its date')
    /* the chips: each kind wears its own icon — on Olivia's feed and Kevin's (a lead in Met: its stage moves) */
    const kinds = { Tasks: /^task_alt$/, Files: /^folder$/, Notes: /^(sticky_note_2|call_log)$/, Stage: /^swap_horiz$/ }
    const seen = new Set()
    for (const q of [p, (await page(1440, `/leads/${KEVIN}/activity`)).p]) {
      for (const [chip, re] of Object.entries(kinds)) {
        await q.locator('[data-testid="activity-chips"] [role="radio"]', { hasText: chip }).click(); await q.waitForTimeout(400)
        const rs = (await readDesk(q, '[data-testid="activity-timeline"] ol')) ?? []
        if (!rs.length) { ok(await q.locator('[data-testid="search-empty"]').isVisible(), `${chip}: none on this feed — the No-results card`); continue }
        seen.add(chip)
        ok(rs.every((r) => re.test(r.glyph)) && rs[0].day !== null, `${chip}: ${rs.length} rows, every glyph ${re.source.replace(/[\^$()]/g, '')} — and still by day`, [...new Set(rs.map((r) => r.glyph))].join(','))
      }
      await q.locator('[data-testid="activity-chips"] [role="radio"]', { hasText: 'All' }).click(); await q.waitForTimeout(400)
      if (q !== p) await q.context().close()
    }
    ok(seen.size === 4, `each of the four kinds was read on a feed (${[...seen].join(' · ')})`)
    /* the sentence is the link — plain at rest, underlined on hover (REG-248) */
    const link = p.locator('[data-testid="activity-timeline"] [data-testid="activity-row"] a').first()
    const rest = await link.evaluate((e) => getComputedStyle(e).textDecorationLine)
    await link.hover(); await p.waitForTimeout(200)
    ok(rest === 'none' && await link.evaluate((e) => getComputedStyle(e).textDecorationLine) === 'underline', 'the sentence is the link: plain at rest, underlined on hover')
    await p.mouse.move(0, 0)
    await shot(p, 'a-1440-olivia')
    /* search narrows; every day left still opens with its marker; no match keeps the tabs' card */
    const box = p.getByRole('searchbox', { name: 'Search activities' })
    await box.fill('task'); await p.waitForTimeout(500)
    const found = (await readDesk(p, '[data-testid="activity-timeline"] ol')) ?? []
    ok(found.length > 0 && found.length < rows.length && found.every((r) => /task/i.test(r.text)) && found[0].day !== null, `search keeps the lines that say it, by day (${found.length} of ${rows.length})`)
    await box.fill('zzqq'); await p.waitForTimeout(500)
    ok(await p.locator('[data-testid="search-empty"]').isVisible() && await p.locator('[data-testid="activity-timeline"]').count() === 0, 'no match: the tabs’ No-results card')
    await box.fill(''); await p.waitForTimeout(300)
    await ctx.close()
  }

  /* ── B · 1440, the Overview's Recent activity card ── */
  console.log('B · 1440, the Overview’s card')
  for (const id of [FARAH, KEVIN]) {
    const { ctx, p } = await page(1440, `/leads/${id}`)
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-card="recent-activity"] [data-glyph]')].map((g) => { const row = g.parentElement; const r = row.getBoundingClientRect(); const icon = g.querySelector('.msr'); return { glyph: g.getAttribute('data-glyph'), text: row.textContent.trim(), h: r.height, iconW: icon.getBoundingClientRect().width, lines: Math.round(row.lastElementChild.lastElementChild.getBoundingClientRect().height / 20) } }))
    const all = await p.locator('[data-card="recent-activity"] [class*="__row"]').count()
    const want = (t) => (/^(Moved to|Put on hold|Marked as lost|Updated contact log|Project )/.test(t.replace(/^(Today|.*?’\d{2})/, '').trim()) ? 'swap_horiz' : /Lead created/.test(t) ? 'person' : /Quote created/.test(t) ? 'docs' : /Lead returned/.test(t) ? 'undo' : null)
    ok(rows.length > 0 && rows.length === all, `every row is led by its glyph (${rows.length})`)
    ok(rows.every((r) => want(r.text) === r.glyph), `each glyph is the feed’s for that line (${rows.map((r) => r.glyph).join(' · ')})`)
    ok(rows.every((r) => r.lines > 1 || Math.round(r.h) === 36) && rows.every((r) => Math.abs(r.iconW - 16) < 0.6), 'the 36 row is kept, the icon drawn')
    if (id === FARAH) await shot(p, 'b-1440-overview-card')
    await ctx.close()
  }

  /* ── C · 1440, a project's Activity ── */
  console.log('C · 1440, a project’s Activity')
  if (BEN_P) {
    const { ctx, p } = await page(1440, `/projects/${BEN_P}/activity`)
    const now = await p.evaluate(() => Date.now())
    const rows = await readDesk(p, '[data-testid="activity-timeline"] ol')
    timelineRules(rows ?? [], 'Benjamin’s project', now)
    const pick = (rows ?? []).find((r) => r.hasCard)
    const cardUnder = await p.evaluate(() => { const c = document.querySelector('[data-testid="activity-timeline"] [data-testid="activity-card"]'); if (!c) return null; const body = c.parentElement; const a = body.firstElementChild; const rc = c.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = body.getBoundingClientRect(); return { under: rc.top >= ra.bottom - 1, inBody: rc.left >= rb.left - 1 } })
    ok(!!pick && !!cardUnder && cardUnder.under && cardUnder.inBody, 'the client’s pick keeps its card under its line')
    await shot(p, 'c-1440-project')
    await ctx.close()
  } else ok(false, 'Benjamin’s project is in the demo')

  /* ── D · 1440, the quote editor's Activity ── */
  console.log('D · 1440, the quote’s Activity')
  {
    const { ctx, p } = await page(1440, `/quotes/${SIGNED}`)
    const now = await p.evaluate(() => Date.now())
    const sec = p.locator('#section-activity')
    await sec.evaluate((e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(400)
    const t = sec.locator('button[aria-expanded="false"]').first()
    if (await t.count()) { await t.evaluate((e) => e.click()); await p.waitForTimeout(700) }
    ok(await p.getByRole('list', { name: 'Quote activity' }).count() === 1, 'one list, "Quote activity"')
    const rows = await readDesk(p, 'ol[aria-label="Quote activity"]')
    timelineRules(rows ?? [], 'the quote', now, await tones(p))
    const g = (re) => (rows ?? []).find((r) => re.test(r.text))?.glyph
    ok(g(/^Quote signed/) === 'draw' && g(/^Quote approved/) === 'verified' && g(/^Quote created/) === 'docs' && g(/items added/) === 'list_alt', `each line by what it is — signed draw · approved verified · created docs · items list_alt (${(rows ?? []).map((r) => r.glyph).join(' · ')})`)
    ok(!!rows?.[0] && rows[0].cls.when === 1 && rows[0].cls.text === 1, 'the first line keeps one time (`when`) and one sentence (`text`)')
    await sec.evaluate((e) => e.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300)
    await shot(p, 'd-1440-quote')
    await ctx.close()
  }

  /* ── E · 390 (touch), a lead's Activity ── */
  console.log('E · 390, a lead’s Activity')
  {
    const { ctx, p } = await page(390, `/leads/${OLIVIA}/activity`)
    const now = await p.evaluate(() => Date.now())
    ok(await p.locator('[data-testid="activity-days"]').count() === 1 && await p.locator('[data-testid="activity-timeline"]').count() === 0, 'a phone reads L4’s day cards')
    const heads = await p.locator('[data-testid="activity-days"] h3').allInnerTexts()
    const ds = heads.map((h) => dayOf(h.trim(), now))
    ok(heads.length >= 2 && heads.every((h) => DAY_WORDS.test(h.trim())) && ds.every((d, i) => i === 0 || d < ds[i - 1]), `the days in the house words, newest first (${heads.slice(0, 3).join(' · ')})`)
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-testid="activity-days"] [data-testid="activity-row"] > *, [data-testid="activity-run-toggle"]')].map((row) => {
      const g = row.querySelector('[data-glyph]'), time = row.querySelector('[class*="dayTime"]'), text = row.querySelector('[class*="dayText"]')
      const rg = g?.getBoundingClientRect(), rt = time?.getBoundingClientRect(), rx = text?.getBoundingClientRect()
      return { glyph: g?.getAttribute('data-glyph') ?? null, h: row.getBoundingClientRect().height, time: time?.textContent.trim(), above: rt && rx ? rt.bottom <= rx.top + 1 : false, gy: rg ? rg.y + 12 : 0, ty: rt ? rt.y + parseFloat(getComputedStyle(time).paddingTop) + 10 : 0, iconW: g?.querySelector('.msr')?.getBoundingClientRect().width ?? 0 }
    }))
    ok(rows.length > 0 && rows.every((r) => !!r.glyph && Math.abs(r.iconW - 16) < 0.6), `every row (and every run) is led by its glyph (${rows.length})`)
    ok(rows.every((r) => r.h >= 44), 'rows 44')
    ok(rows.every((r) => r.above && Math.abs(r.gy - r.ty) <= 2.5), 'the time over the sentence, the glyph on the time’s line')
    ok(rows.every((r) => TIME.test(r.time)), 'the time only')
    const run = p.locator('[data-testid="activity-run-toggle"]').first()
    if (await run.count()) {
      await run.evaluate((e) => e.click()); await p.waitForTimeout(400)
      const inner = await p.locator('[data-testid="activity-run"] [data-testid="activity-row"] [data-glyph]').count()
      ok(await run.getAttribute('aria-expanded') === 'true' && inner > 1, `a run still opens, each of its lines with its glyph (${inner})`)
    } else ok(true, 'no run on this feed today')
    const older = p.locator('[data-testid="activity-older"]')
    if (await older.count()) { const n0 = await p.locator('[data-testid="activity-days"] [data-glyph]').count(); await older.evaluate((e) => e.click()); await p.waitForTimeout(500); ok(await p.locator('[data-testid="activity-days"] [data-glyph]').count() > n0, 'Show older adds the next page, by day') }
    else ok(true, 'the feed fits one page')
    ok(await sideways(p) <= 0, '390: no sideways scroll')
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200)
    await shot(p, 'e-390-olivia')
    await ctx.close()
  }

  /* ── F · 768 · 1024 (touch) · 844×390 ── */
  console.log('F · the tablets and a phone held sideways')
  for (const size of [768, 1024, 'sideways']) {
    const { ctx, p } = await page(size, `/leads/${OLIVIA}/activity`)
    const rows = await p.evaluate(() => [...document.querySelectorAll('[data-testid="activity-days"] [data-testid="activity-row"] > *, [data-testid="activity-run-toggle"]')].slice(0, 12).map((row) => {
      const g = row.querySelector('[data-glyph]').getBoundingClientRect(), t = row.querySelector('[class*="dayTime"]').getBoundingClientRect(), x = row.querySelector('[class*="dayText"]').getBoundingClientRect()
      return { line: g.right <= t.left && t.right <= x.left && Math.abs(t.top - x.top) <= 4, h: row.getBoundingClientRect().height }
    }))
    ok(rows.length > 0 && rows.every((r) => r.line && r.h >= 44), `${size}: glyph · time · sentence on one line, rows 44`)
    ok(await sideways(p) <= 0, `${size}: no sideways scroll`)
    if (size === 768) await shot(p, 'f-768-olivia')
    await ctx.close()
  }

  /* ── G · 320, and the Quote screen's trail ── */
  console.log('G · 320 and the Quote screen')
  {
    const { ctx, p } = await page(320, `/leads/${FARAH}/activity`)
    ok(await sideways(p) <= 0 && await p.locator('[data-testid="activity-days"] [data-glyph]').count() > 0, '320: the lead’s Activity, no sideways scroll')
    await ctx.close()
  }
  for (const size of [320, 390]) {
    const { ctx, p } = await page(size, `/quotes/${SIGNED}`)
    const fold = p.getByTestId('fold-activity')
    await fold.scrollIntoViewIfNeeded(); await fold.evaluate((e) => e.click()); await p.waitForTimeout(500)
    const list = p.getByRole('list', { name: 'Quote activity' })
    ok(await list.count() === 1, `${size}: the Quote screen’s Activity opens the trail`)
    const first = list.getByRole('listitem').first()
    const f = await first.evaluate((li) => { const w = li.querySelector('[class*="when"]'), t = li.querySelector('[class*="text"]'), g = li.querySelector('[data-glyph]'), c = li.querySelector('[data-testid="timeline-day"] span:last-child'); return { when: parseFloat(getComputedStyle(w).fontSize), text: parseFloat(getComputedStyle(t).fontSize), glyph: g?.getAttribute('data-glyph'), chip: c ? parseFloat(getComputedStyle(c).fontSize) : 0, above: w.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1 } })
    ok(f.text === 16 && f.when === 14 && f.chip === 14 && !!f.glyph && f.above, `${size}: the line 16 over its time 14, the day 14, its glyph (${f.glyph})`)
    ok(await sideways(p) <= 0, `${size}: no sideways scroll`)
    if (size === 390) { await list.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); await shot(p, 'g-390-quote-screen') }
    await ctx.close()
  }

  /* ── H · 1280 (a mouse) ── */
  console.log('H · 1280')
  {
    const { ctx, p } = await page(1280, `/leads/${FARAH}/activity`)
    const now = await p.evaluate(() => Date.now())
    ok(await p.locator('[data-testid="activity-timeline"]').count() === 1, '1280: the desk’s timeline')
    timelineRules((await readDesk(p, '[data-testid="activity-timeline"] ol')) ?? [], '1280 Farah', now)
    await ctx.close()
  }

  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '))
  ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the probe moved nothing (stages and stage logs as found)')
  await b.close()
  console.log(`\nverify-rwd-a: ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
