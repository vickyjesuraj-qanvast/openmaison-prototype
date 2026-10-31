// The Dashboard redesigned (2026-10-26) — lane D4, Maison AI docked (his marks on the review page https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY:
// P-01 · P-10 · P-12 · Q-01 · Q-02 · Q-03 · Q-09 · Q-12, and his note "the CTAs are too much to the eyes because of primary color").
// Each item asserted as the rule it builds, never another round's count, by real presses and typing on the production build:
//  - the floating Maison AI button steps aside on the Dashboard (every width) and stays on every other page; the docked field is Maison AI there
//  - the field sits at the foot of the content (sticky, centred on the column, 640 at a desk and on a tablet held sideways — 760 at a desk
//    before the calm pass), the page's end
//    keeps its height (the last card ends above the band), and the house snackbar rests above the band (`--bottom-dock`)
//  - three suggestions at most, written by rule from the records: a quote that waits on its client → "Remind {first} about {number}" (sent and
//    unanswered, valid, not reminded in two days — lib/maison-ai/remind.ts); the books → "How is cash this month?"; a meeting today → "Prepare me"
//    — every suggestion and every card's question answered from the records (never "I can't answer that yet")
//  - his § 2, measured: at rest no filled primary background on the page; the send is a neutral circle that takes the primary only once there is
//    text; the one filled button is the decision surface's (the pane's confirm)
//  - a short answer grows above the field (the page stays where it was), Esc and a press elsewhere fold it, the field's focus brings it back;
//    a long answer and a proposal open in the house Drawer beside the cards, the field re-centring on what the pane leaves
//  - the answer cards (P-10): cash → figures + four weeks of bars that add up to "Coming in · 30 days" + doors (Money in opens with the way back,
//    the past-due reminders fold into "Remind · n ▾" and each opens its Money with Remind); how is the studio doing → pressable figures
//  - Remind → a proposal whose run opens WhatsApp with the quote's reminder and keeps it on the client's Activity; its receipt carries Undo, which
//    takes the Activity line back
//  - Stop while it reads (the answer held back), Retry brings it; ⌘J focuses the field (and the ? panel lists it); on another page ⌘J opens the
//    sheet's Ask box; the sheet everywhere else draws the cards too (figures there)
//  - a card's Ask (`DockAsk` / `askAbout`): the card joins the field as a removable chip and its questions replace the three
//  - the + : the tools that read a file (with the way back) and the prototype's reset (its confirm, cancelled)
//  - a tablet held upright: the field-shaped door opens the house Sheet, which holds the conversation; a phone: the accessory above the dock,
//    shrinking into the ✦ at the dock's end on the way down and back on the way up, the Sheet lifted by the keyboard (`visualViewport`); a phone held
//    sideways: the ✦ alone; 320 and 844 × 390 with no sideways scroll; each role's suggestions (Accounting · Marketing · a Designer)
// (the calm pass 2026-10-26, lane C4 — his "data looks fine … but visually it looks too busy", the Claude Design option and his yes to its layout
// with six corrections, brief-calm § 1 · § 2.1 · § 2.4) restated for the new presentation, each changed check commented as a deliberate change:
//  - at rest the dock is ONE white pill — the spark, the words, ⌘J, the send (neutral, disabled) — 640 at a desk centred on the content, 52 tall,
//    on the page's grey band; no suggestion, no +, no card chip — measured as the dock's busy figures (words · boxes · controls · type · ink · tints)
//  - the field in use brings the rest: its focus shows the three (or a card's questions) and the + (⌘J gives it the place); they fold away when
//    it lets go with nothing asked (a press elsewhere, Esc, Tab out); typed words stay with the send ready; a card's Ask puts its chip and
//    questions in and, asked nothing, takes them away again; the +'s menu keeps the field in use while it is open
//  - the cards' foot clears the pill at the page's end, at every width the band shows
// Run against `next start` on a scratch copy of the demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3224 NODE_PATH=<repo>/node_modules node verify-dash-d4.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'd4')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3224'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PRIMARY = 'rgb(85, 0, 255)'   // --om-color-primary-default (light)
const DAY = 86_400_000

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const t0 = Date.now()
  const you0 = sql(`select id from members where is_you = 1`) || 'dane'
  const asked0 = json(`select id from maison_questions`).map((r) => r.id)
  const events0 = json(`select id from lead_events where kind = 'portal_reminded'`).map((r) => r.id)
  const desk = (w = 1440, h = 1024) => b.newContext({ viewport: { width: w, height: h } })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 600) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const dock = (p) => p.locator('[data-testid="maison-dock"]')
  const field = (p) => p.locator('[data-testid="dock-field-input"]')
  const chips = (p) => p.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]')
  const chipWords = (loc) => loc.evaluateAll((els) => els.map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()))
  const lastEntry = (p) => p.locator('[data-testid="dock-thread"] [data-testid="dock-entry"]').last()
  const waitDone = (p, scope = '[data-testid="dock-thread"]') => p.waitForFunction((s) => { const e = [...document.querySelectorAll(`${s} [data-testid="dock-entry"]`)].pop(); return !!e && e.getAttribute('data-state') !== 'reading' }, scope, { timeout: 20000 }).catch(() => {})
  const askDock = async (p, q) => { await field(p).click(); await field(p).fill(q); await field(p).press('Enter'); await waitDone(p); await settle(p, 400) }
  const fabCount = (p) => p.locator('[data-maison-fab]').count()
  /* a press on the page that is nothing (the greeting's title) */
  const elsewhere = (p) => p.locator('[data-testid="dashboard"] h1, [data-testid="dashboard"] header').first().click({ position: { x: 5, y: 5 } })
  /* (the calm pass 2026-10-26, a deliberate change) the suggestions and the + come with the field in use — a check that reads them puts the
     caret in the field first (a tap on touch) */
  const inUse = async (p) => { const f = field(p); if (await f.evaluate((e) => document.activeElement !== e)) { if ((await p.evaluate(() => matchMedia('(hover: none)').matches))) await f.tap(); else await f.click() } await settle(p, 250) }
  const suggestions = async (p) => { await inUse(p); return chipWords(chips(p)) }
  const openPlus = async (p) => { await inUse(p); await p.locator('[data-testid="dock-plus"]').click(); await settle(p, 400) }
  /* the dock's own busy figures, at rest (brief-calm's measure, scoped to the band — the band's own grey is the page's surface, not a box) */
  const dockBusy = (p) => p.evaluate(() => {
    const dock = document.querySelector('[data-testid="maison-dock"]')
    const seen = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0 }
    const els = [...dock.querySelectorAll('*')].filter(seen)
    const clear = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'rgb(255, 255, 255)'
    const boxed = els.filter((e) => { const s = getComputedStyle(e); return (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0) || (!clear(s.backgroundColor) && e.getBoundingClientRect().width > 24) })
    const controls = els.filter((e) => e.matches('button, textarea, input, a[href], [role="button"], [role="tab"], [role="radio"]'))
    /* a glyph's ligature (`.msr` / `.mso`) is a picture, not words */
    const texts = els.filter((e) => !e.matches('.msr, .mso')).filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || (e.matches('textarea, input') && (e.value || e.placeholder)))
    const said = (e) => e.matches('textarea, input') ? (e.value || e.placeholder) : [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')
    const words = texts.map(said).join(' ').split(/\s+/).filter(Boolean).length
    const tints = new Set(els.map((e) => getComputedStyle(e).backgroundColor).filter((c) => !clear(c)))
    return { words, boxes: boxed.length, controls: controls.length, sizes: new Set(texts.map((e) => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight)).size,
      inks: new Set(texts.map((e) => getComputedStyle(e).color)).size, tints: tints.size, uppercase: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length,
      chips: dock.querySelectorAll('[data-testid="dock-chip"]').length, plus: dock.querySelectorAll('[data-testid="dock-plus"]').length, about: dock.querySelectorAll('[data-testid="dock-about"]').length }
  })
  /* his § 2: what on the page wears the primary as a filled background */
  const filledPrimary = (p) => p.evaluate((P) => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).backgroundColor === P }).map((e) => (e.getAttribute('data-testid') || e.getAttribute('aria-label') || e.className || e.tagName).toString().slice(0, 60)), PRIMARY)
  /* the rule's own reading of the records: the quotes that wait on their client for this member (lib/maison-ai/remind.ts) */
  const waitingFor = (member) => {
    const now = Date.now()
    const qs = json(`select q.id, q.number, l.name, q.lead_id as lead, coalesce(q.client_sent_at, q.sent_at) as sent, coalesce(q.client_view_count, 0) as views, q.valid_until as valid from quotes q join leads l on l.id = q.lead_id
      where q.status = 'Sent to Client' and q.kind in ('quote','variation') and q.deleted_at is null and q.archived_at is null and l.deleted_at is null`)
    const role = sql(`select role from members where id = '${member}'`)
    const team = (lead) => json(`select member_id as m from lead_assignees where lead_id = '${lead}'`).map((r) => r.m)
    const reminded = (id) => Number(sql(`select coalesce(max(at), 0) from lead_events where kind = 'portal_reminded' and json_extract(detail, '$.id') = 'quote:${id}'`)) * 1000
    return qs.filter((q) => (role === 'Owner' || role === 'Admin' || team(q.lead).includes(member))
      && !(q.valid && q.valid * 1000 < now) && !(reminded(q.id) && now - reminded(q.id) < 2 * DAY) && (q.views >= 2 || (q.sent && now - q.sent * 1000 >= 3 * DAY)))
  }
  let popup = null
  let seeded = null

  try {
    as('dane')
    /* ── the desk, 1440 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
    const c = await desk(); const d = await c.newPage(); watch(d, 'desk')
    c.on('page', (pg) => { popup = pg })
    await go(d, '/dashboard', 1800)
    ok(await dock(d).count() === 1 && await fabCount(d) === 0, 'Q-02 · on the Dashboard the floating button steps aside; the docked field is Maison AI')
    await shot(d, '01-rest-1440')
    const quiet = await filledPrimary(d)
    ok(quiet.length === 0, '§ 2 · at rest no element wears a filled primary background on the Dashboard', quiet.join(', '))
    const send = d.locator('[data-testid="dock-field-send"]')
    ok(await send.evaluate((e) => getComputedStyle(e).backgroundColor) !== PRIMARY && await send.isDisabled(), '§ 2 · the send is a neutral circle while the field is empty')
    /* (the calm pass 2026-10-26, a deliberate change) at rest: one white pill, nothing else */
    const rest = await dockBusy(d)
    console.log('    the dock at rest, 1440:', JSON.stringify(rest))
    ok(rest.chips === 0 && rest.plus === 0 && rest.about === 0, 'calm · at rest the dock is the pill alone — no suggestion, no +, no card chip', JSON.stringify(rest))
    ok(rest.controls <= 2 && rest.words <= 8 && rest.boxes <= 3 && rest.sizes <= 2 && rest.tints <= 2 && rest.uppercase === 0, 'calm · the dock’s busy figures at rest: ≤ 2 controls (the field, the send) · ≤ 8 words · ≤ 3 boxes (the send, ⌘J’s keys) · ≤ 2 type sizes · ≤ 2 tints · no uppercase', JSON.stringify(rest))
    const pill = await d.evaluate(() => {
      const f = document.querySelector('[data-testid="dock-field"]'); const r = f.getBoundingClientRect(); const s = getComputedStyle(f)
      const band = getComputedStyle(document.querySelector('[data-testid="maison-dock"]')).backgroundColor
      const page = getComputedStyle(document.documentElement).getPropertyValue('--om-color-surface-bg').trim()
      const probe = document.createElement('i'); probe.style.background = page; document.body.append(probe); const grey = getComputedStyle(probe).backgroundColor; probe.remove()
      return { w: r.width, h: r.height, radius: parseFloat(s.borderTopLeftRadius), bg: s.backgroundColor, shadow: s.boxShadow !== 'none', hint: !!f.querySelector('kbd'), band, grey }
    })
    ok(Math.round(pill.w) === 640 && Math.round(pill.h) === 52 && pill.radius >= 26 && pill.bg === 'rgb(255, 255, 255)' && pill.shadow && pill.hint, `calm · the pill: 640 × 52, round ends, white with a soft shadow, ⌘J in it (${Math.round(pill.w)} × ${Math.round(pill.h)})`, JSON.stringify(pill))
    ok(pill.band === pill.grey, 'calm · the band behind it is the page’s own grey (--om-color-surface-bg)', JSON.stringify(pill))
    /* the field in use brings the rest; letting go folds it away */
    await field(d).click(); await settle(d, 350)
    const busy = await dockBusy(d)
    ok(busy.chips >= 1 && busy.chips <= 3 && busy.plus === 1 && await d.locator('[data-testid="dock-field"] kbd').count() === 0, 'calm · § 2.4 the field’s focus shows the suggestions and the + (⌘J gives it the place)', JSON.stringify(busy))
    await shot(d, '01b-in-use-1440')
    await d.keyboard.press('Tab'); await settle(d, 250)
    ok(await d.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'dock-plus' && (await dockBusy(d)).chips >= 1, '…Tab reaches the + — still in use')
    await elsewhere(d); await settle(d, 350)
    ok((await dockBusy(d)).chips === 0 && (await dockBusy(d)).plus === 0, '…a press elsewhere with nothing asked folds them away — the pill at rest again')
    await field(d).click(); await settle(d, 250); await field(d).press('Escape'); await settle(d, 300)
    ok((await dockBusy(d)).chips === 0 && await d.evaluate(() => document.activeElement?.getAttribute('data-testid')) !== 'dock-field-input', '…Esc lets go of the field — the pill at rest')
    await field(d).click(); await field(d).type('Which leads'); await elsewhere(d); await settle(d, 350)
    const kept = await dockBusy(d)
    ok(await field(d).inputValue() === 'Which leads' && kept.chips === 0 && await send.evaluate((e) => getComputedStyle(e).backgroundColor) === PRIMARY, '…typed words stay when it lets go, the send ready (primary once there is text), the suggestions folded', JSON.stringify(kept))
    await field(d).fill('')
    /* the +'s menu keeps the field in use while it is open (its focus is in the menu's portal) */
    await openPlus(d)
    ok(await d.locator('[role="menu"] [role="menuitem"]').count() >= 1 && (await dockBusy(d)).plus === 1, 'calm · the +’s menu opens from the field in use and keeps it in use')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await elsewhere(d); await settle(d, 300)
    await field(d).click(); await field(d).type('cash'); await settle(d, 300)
    const sendNow = await send.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, ready: e.hasAttribute('data-ready') }))
    ok(sendNow.bg === PRIMARY && sendNow.ready, '§ 2 · …and takes the primary colour once there is text', JSON.stringify(sendNow))
    const typed = await chipWords(chips(d))
    ok(typed.some((t) => /cash/i.test(t)), 'as you type, the page’s questions that hold your words replace the three', typed.join(' · '))
    await field(d).fill('')
    /* where the field sits */
    const geo = await d.evaluate(() => {
      const main = document.querySelector('#om-main').getBoundingClientRect()
      const f = document.querySelector('[data-testid="dock-field"]').getBoundingClientRect()
      return { mainC: main.left + main.width / 2, fC: f.left + f.width / 2, w: f.width, bottom: innerHeight - f.bottom }
    })
    /* (the calm pass 2026-10-26, a deliberate change) 640 at a desk — the drawn option's pill — where the first pass docked at 760 */
    ok(Math.abs(geo.mainC - geo.fC) <= 2 && Math.round(geo.w) <= 640 && geo.bottom >= 8 && geo.bottom <= 24, `the field sits at the content’s foot, centred on it, at most 640 wide (${Math.round(geo.w)} · ${Math.round(geo.bottom)} from the foot)`)
    /* (the Dashboard's closing pass, 2026-10-26 — a deliberate change of this check) mid-scroll, not at the page's end: there the white panel's own
       8px inset shows under the band, as every page ends, and the field reads 24 from the foot — "docked" is what holds while the cards move */
    await d.mouse.wheel(0, 300); await settle(d, 500)
    const stuck = await d.evaluate(() => innerHeight - document.querySelector('[data-testid="dock-field"]').getBoundingClientRect().bottom)
    ok(stuck >= 8 && stuck <= 24, 'scrolled, it stays docked at the foot — the cards scroll under it')
    await d.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(d, 500)
    const end = await d.evaluate(() => { const band = document.querySelector('[data-testid="maison-dock"]').getBoundingClientRect(); const cards = [...document.querySelectorAll('[data-testid="dashboard"] [data-card]')].map((e) => e.getBoundingClientRect().bottom); return { band: band.top, last: Math.max(0, ...cards) } })
    ok(end.last <= end.band + 1, 'at the page’s end the last card ends above the band — nothing is left under the field', JSON.stringify(end))
    const offset = await d.evaluate(() => ({ v: parseFloat(document.documentElement.style.getPropertyValue('--bottom-dock')), band: document.querySelector('[data-testid="maison-dock"] > div:last-child')?.getBoundingClientRect().height ?? 0 }))
    ok(offset.v > 0 && Math.abs(offset.v - offset.band) <= 2, 'the house snackbar rests above the band (--bottom-dock = the band’s height)', JSON.stringify(offset))
    await d.evaluate(() => window.scrollTo(0, 0)); await settle(d, 300)

    /* the three, by rule — (the calm pass 2026-10-26, a deliberate change) read with the field in use */
    const three = await suggestions(d)
    ok(three.length >= 1 && three.length <= 3, `three suggestions at most (${three.join(' · ')})`)
    const waits = waitingFor('dane')
    const remind = three.find((t) => /^Remind /.test(t))
    ok(waits.length ? !!remind && waits.some((q) => remind.endsWith(`about ${q.number}`) && remind.includes(q.name.split(' ')[0])) : !remind, 'Q-03 · a quote that waits on its client is suggested as its reminder — by the rule over the records', `${remind} · ${waits.map((q) => q.number).join(', ')}`)
    ok(three.includes('How is cash this month?'), 'Q-03 · the books: “How is cash this month?” for an Owner')
    const meetToday = json(`select m.id, m.starts_at as at from meetings m join leads l on l.id = m.lead_id where l.deleted_at is null and m.status = 'planned' and m.deleted_at is null and m.starts_at >= (strftime('%s','now') - 1800) * 1000 and (m.member_ids like '%"dane"%' or m.created_by = 'dane')`)
      .filter((m) => new Date(m.at).toDateString() === new Date().toDateString())   // today on the clock the pages read (the probe runs beside its server)
    ok(meetToday.length ? three.some((t) => /^Prepare me for /.test(t)) : !three.some((t) => /^Prepare me for /.test(t)), 'Q-03 · a meeting today is suggested as “Prepare me for …” — and only when there is one')

    /* a short answer above the field: cash, with its cards */
    const y0 = await d.evaluate(() => window.scrollY)
    await d.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]', { hasText: 'How is cash this month?' }).click(); await waitDone(d); await settle(d, 500)
    const cash = lastEntry(d)
    ok(await cash.locator('[data-testid="dock-answer"]').count() === 1 && await d.evaluate(() => window.scrollY) === y0, 'Q-01 · a short answer grows above the field — the page stays where it was')
    await shot(d, '02-cash-1440')
    const figs = await cash.locator('[data-testid^="maison-figure-"]').count()
    const coming = await cash.locator('[data-testid="maison-figure-in30"] [class*="__value"]').innerText()
    const bars = await cash.locator('[data-testid="maison-chart"] li').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || '').split(': ').pop()))
    const money = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, '')) * 100)
    ok(figs >= 3 && bars.length === 4 && bars.reduce((s, x) => s + money(x), 0) === money(coming), `P-10 · cash: figures and four weeks of bars that add up to “Coming in · 30 days” (${bars.join(' + ')} = ${coming})`)
    const group = cash.locator('[data-testid="maison-door-group"]')
    if (await group.count()) {
      await group.click(); await settle(d, 400)
      const rows = d.locator('[role="menu"] [role="menuitem"]')
      const n = await rows.count()
      ok(n >= 2 && /Remind · \d+/.test(await group.innerText()) && Number(/· (\d+)/.exec(await group.innerText())[1]) === n, `P-10 · repeated doors fold into “Remind · n ▾” and list each (${n})`)
      await rows.first().click(); await d.waitForURL(/\/projects\/[^/]+\/money\?/, { timeout: 15000 }).catch(() => {})
      const u = new URL(d.url())
      ok(u.searchParams.get('do') === 'remind' && !!u.searchParams.get('open') && u.searchParams.get('from') === '/dashboard', '…each opens its project’s Money with Remind, and the way back', d.url())
      await go(d, '/dashboard', 1500)
    } else ok(true, 'P-10 · (no two past-due invoices to fold today)')
    await askDock(d, 'How is cash this month?')
    const moneyIn = lastEntry(d).locator('[data-testid="door-money-in"]')
    await moneyIn.click(); await d.waitForURL(/money-in/, { timeout: 15000 }).catch(() => {})
    ok(/\/company\/finance\/money-in/.test(d.url()) && new URL(d.url()).searchParams.get('from') === '/dashboard', 'a door opens its place with the way back to the Dashboard', d.url())
    await go(d, '/dashboard', 1500)

    /* a meeting later today: "Prepare me for {time} with {first}" leads the three, and its answer is the client's record card (P-10) */
    /* the clock every page reads a meeting by (the server's, as the meeting page and the agenda) — the probe runs beside its server */
    const at = (() => { const x = new Date(Date.now() + 2 * 3600e3); x.setMinutes(30, 0, 0); return x })()
    const kelvin = json(`select id, name, phone from leads where deleted_at is null and direct = 0 and phone <> '' order by created_at desc limit 1`)[0]
    if (at.toDateString() === new Date().toDateString() && kelvin) {
      seeded = 'd4-probe-meeting'
      sql(`insert into meetings (id, lead_id, aim, where_kind, starts_at, status, member_ids, created_by, created_at) values ('${seeded}', '${kelvin.id}', 'follow_up', 'In person', ${at.getTime()}, 'planned', '["dane"]', 'dane', ${Date.now()})`)
      await go(d, '/dashboard', 1600)
      const first3 = await suggestions(d)   // (the calm pass 2026-10-26, a deliberate change) with the field in use
      /* (2026-10-27, a deliberate change) the rule, read from the records: the NEXT planned meeting of Dane's later today leads — the seeded
         one, or the demo's own when it comes first (after noon the demo's 2 PM consultation does; the check failed in the afternoon) — (the close-out
         round 2026-10-31) "next" by the dock's own window: a meeting is still offered for half an hour after it starts (lib/dashboard/dock-queries.ts
         `fetchDock`), so between 2 and 2:30 PM the demo's consultation still leads (the check failed at 2:20 PM) */
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999)
      const next = json(`select m.starts_at as at, l.name as name, l.phone as phone from meetings m join leads l on l.id = m.lead_id where m.status = 'planned' and m.member_ids like '%"dane"%' and m.starts_at >= ${Date.now() - 30 * 60e3} and m.starts_at <= ${endOfDay.getTime()} order by m.starts_at limit 1`)[0] ?? { at: at.getTime(), name: kelvin.name, phone: kelvin.phone }
      const nx = new Date(next.at), hh = (nx.getHours() % 12) || 12, mm = nx.getMinutes()
      const prep = first3[0] ?? ''
      ok(new RegExp(`^Prepare me for ${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${nx.getHours() < 12 ? 'AM' : 'PM'} with ${next.name.split(' ')[0]}`).test(prep), `Q-03 · a meeting later today leads the three — the next one: “${prep}”`)
      await d.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]').first().click(); await waitDone(d); await settle(d, 500)
      const rec = lastEntry(d).locator('[data-testid="maison-record"]')
      const call = lastEntry(d).locator('[data-testid="door-call"]')
      ok(await rec.count() === 1 && (await rec.innerText()).includes(next.name.split(' ')[0]) && await call.count() === (next.phone ? 1 : 0), 'P-10 · prepare me: the client’s record card, with Call now and the lead')
      await shot(d, '02b-prepare-1440')
      await field(d).press('Escape').catch(() => {})
      /* Your day's own "Prepare me" (lane D3 — "Prepare me for my meeting with {first} at {time}") asks the dock about THAT meeting;
         (the calm pass 2026-10-26, a deliberate change) it sits in the meeting row's ⋮ now — the row's one action stays visible */
      const prepRow = d.locator(`[data-testid="day-row"][data-key="meeting:${seeded}"]`)
      ok(await prepRow.count() === 1, 'Your day lists the meeting later today')
      if (await prepRow.count()) {
        await prepRow.hover(); await prepRow.locator('[data-testid="day-row-menu"]').click(); await settle(d, 300)
      }
      const dayPrep = d.locator('[data-testid="day-prepare"]')
      if (await dayPrep.count()) {
        await dayPrep.first().click(); await waitDone(d); await settle(d, 500)
        const t = await lastEntry(d).innerText().catch(() => '')
        ok(/Your meeting: /.test(t) && t.includes(kelvin.name.split(' ')[0]) && await lastEntry(d).locator('[data-testid="maison-record"]').count() === 1, 'Your day’s Prepare me is answered in the dock — that meeting, its record card', t.slice(0, 120).replace(/\n/g, ' '))
        await field(d).press('Escape').catch(() => {})
      } else ok(false, 'the meeting row’s ⋮ holds “Prepare me for this meeting”')
      sql(`delete from meetings where id = '${seeded}'`); seeded = null
      await go(d, '/dashboard', 1400)
    } else ok(true, '(two hours from now is tomorrow — the meeting-today suggestion is not seeded)')

    /* folding */
    await askDock(d, 'How is the studio doing?')
    const studio = lastEntry(d)
    ok(await studio.locator('[data-testid^="maison-figure-"]').count() >= 3 && await studio.locator('[data-testid^="maison-figure-"][data-press]').count() >= 3, 'P-10 · how is the studio doing: figures, each a door')
    await field(d).press('Escape'); await settle(d, 300)
    ok(await d.locator('[data-testid="dock-thread"]').count() === 0, 'Esc folds the answers')
    await field(d).click(); await settle(d, 300)
    ok(await d.locator('[data-testid="dock-thread"]').count() === 1, '…the field’s focus brings them back')
    await d.locator('[data-testid="dashboard"] h1, [data-testid="dashboard"] header').first().click({ position: { x: 5, y: 5 } }).catch(() => {}); await settle(d, 300)
    ok(await d.locator('[data-testid="dock-thread"]').count() === 0, '…and a press elsewhere on the page folds them')
    /* a figure asks its own question */
    await field(d).click(); await settle(d, 200)
    const before = await d.locator('[data-testid="dock-thread"] [data-testid="dock-entry"]').count()
    await lastEntry(d).locator('[data-testid="maison-figure-tasks"]').click(); await waitDone(d); await settle(d, 400)
    /* (the calm pass 2026-10-26, a deliberate change) a long list of tasks — late in the day, or past midnight — opens in the pane like any
       long answer; the question is the same either way */
    if (await d.locator('[data-testid="dock-pane"]').count()) {
      const asked = await d.locator('[role="dialog"][aria-label="Maison AI"]').innerText().catch(() => '')
      ok(/task/i.test(asked) && before <= 3, 'a figure asks the question behind it (a long answer, in the pane)', asked.slice(0, 80).replace(/\n/g, ' '))
      await d.locator('[role="dialog"][aria-label="Maison AI"] button[aria-label="Close"]').click().catch(() => d.keyboard.press('Escape')); await settle(d, 400)
    } else ok(/task/i.test(await lastEntry(d).locator('[data-testid="dock-question"]').innerText()) && await d.locator('[data-testid="dock-thread"] [data-testid="dock-entry"]').count() <= 3 && before <= 3, 'a figure asks the question behind it; the thread keeps the last three')

    /* a long answer opens beside the page */
    await askDock(d, 'Who owes the studio money?')
    const pane = d.locator('[data-testid="dock-pane"]')
    ok(await pane.count() === 1 && await d.locator('[data-testid="dock-thread"]').count() === 0, 'Q-01 · a long answer opens in the pane beside the cards')
    const shifted = await d.evaluate(() => { const f = document.querySelector('[data-testid="dock-field"]').getBoundingClientRect(); const pane = document.querySelector('[data-testid="dock-pane"]').closest('[role="dialog"]').getBoundingClientRect(); return f.right <= pane.left + 1 })
    ok(shifted, '…and the field re-centres on what the pane leaves — never under it')
    await shot(d, '03-pane-1440')
    await d.locator('[role="dialog"][aria-label="Maison AI"] button[aria-label="Close"]').click().catch(() => d.keyboard.press('Escape')); await settle(d, 400)
    await field(d).click(); await settle(d, 300)
    ok(await lastEntry(d).locator('[data-testid="dock-compact"]').count() === 1, '…the thread keeps a line for it, with Open')
    await lastEntry(d).locator('[data-testid="dock-reopen"]').click(); await settle(d, 500)
    ok(await pane.count() === 1, '…which opens it again')
    await d.keyboard.press('Escape'); await settle(d, 400)

    /* Remind: a proposal, a receipt, its Undo */
    const target = waits[0]
    if (target) {
      const first = target.name.split(' ')[0]
      await askDock(d, `Remind ${first} about ${target.number}`)
      const confirm = d.locator('[data-testid="dock-pane-confirm"]')
      ok(await confirm.count() === 1 && /Open WhatsApp/.test(await confirm.innerText()), 'a reminder is proposed in the pane — one filled button, the decision')
      const filled = await filledPrimary(d)
      ok(filled.length === 1 && /dock-pane-confirm/.test(filled[0]), '§ 2 · the only filled primary on screen is the pane’s confirm', filled.join(', '))
      popup = null
      await confirm.click(); await settle(d, 2000)
      const wa = popup ? popup.url() : ''
      const said = decodeURIComponent(wa.replace(/\+/g, ' '))
      ok(/wa\.me\/65\d{8}|api\.whatsapp\.com\/send\/?\?phone=65\d{8}/.test(wa) && said.includes(target.number) && said.includes('/confirm/'), 'its run opens WhatsApp with the quote’s own reminder and its link', wa.slice(0, 120))
      if (popup) await popup.close().catch(() => {})
      const kept = json(`select id from lead_events where kind = 'portal_reminded' and json_extract(detail, '$.id') = 'quote:${target.id}' and actor_id = 'dane'`)
      await field(d).click(); await settle(d, 300)
      const receipt = d.locator('[data-testid="dock-receipt"]').last()
      ok(kept.length >= 1 && await receipt.count() === 1 && /Reminder opened in WhatsApp/.test(await receipt.innerText()), 'the reminder is kept on the client’s Activity, and the receipt says so with Undo')
      await shot(d, '04-receipt-1440')
      await receipt.locator('[data-testid="dock-undo"]').click(); await settle(d, 1500)
      const gone = json(`select id from lead_events where kind = 'portal_reminded' and json_extract(detail, '$.id') = 'quote:${target.id}' and actor_id = 'dane' and at * 1000 >= ${t0 - 1000}`)
      ok(gone.length === 0 && /off .*Activity/.test(await receipt.innerText()), 'Undo takes the Activity line back, and the receipt says so')
    } else ok(true, '(no quote waits on a client in this database — the reminder flow is skipped)')

    /* Stop · Retry */
    await d.route('**/dashboard', (r) => (r.request().method() === 'POST' && r.request().headers()['next-action'] ? setTimeout(() => r.continue().catch(() => {}), 2600) : r.continue()))
    await field(d).click(); await field(d).fill('What are my tasks today?'); await field(d).press('Enter'); await settle(d, 800)
    const stopBtn = d.locator('[data-testid="dock-field-stop"]')
    ok(await stopBtn.count() === 1 && await d.locator('[data-testid="dock-reading"]').count() === 1, 'while it reads: Stop in the send’s place, and the reading line past half a second')
    await stopBtn.click(); await settle(d, 3000)
    ok(/Stopped/.test(await lastEntry(d).innerText()) && await lastEntry(d).locator('[data-testid="dock-answer"]').count() === 0, 'Stop: the answer that comes back late is held back')
    await d.unroute('**/dashboard')
    await lastEntry(d).locator('[data-testid="dock-retry"]').click(); await waitDone(d); await settle(d, 400)
    ok(await lastEntry(d).locator('[data-testid="dock-answer"]').count() === 1, 'Retry asks it again')

    /* ⌘J and the ? panel */
    await field(d).press('Escape'); await d.locator('body').press('Tab').catch(() => {}); await d.evaluate(() => document.activeElement && document.activeElement.blur())
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j'); await settle(d, 300)
    ok(await d.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'dock-field-input', 'Q-09 · ⌘J / Ctrl J focuses the field')
    await field(d).press('Escape'); await d.evaluate(() => document.activeElement && document.activeElement.blur())
    await d.keyboard.press('Shift+?'); await settle(d, 600)
    ok(/Ask Maison AI/.test(await d.locator('[data-kb-panel]').innerText().catch(() => '')), '…and the ? panel lists it, under Everywhere')
    await d.keyboard.press('Shift+?'); await settle(d, 300)

    /* a card's Ask */
    /* the house DockAsk, or a card frame's own ✦ Ask (lane D3's `card-frame.tsx`, `<card>-ask`) — each calls `askAbout('<card>')` */
    const asks = d.locator('[data-testid^="dock-ask-"], [data-card] [data-testid$="-ask"]')
    if (await asks.count()) {
      const card = await asks.first().evaluate((e) => e.closest('[data-card]')?.getAttribute('data-card') || (e.getAttribute('data-testid') || '').replace('dock-ask-', ''))
      await asks.first().click(); await settle(d, 400)
      const chip = d.locator('[data-testid="dock-about"]')
      const ctxAsks = await chipWords(chips(d))
      ok(await chip.count() === 1 && await d.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'dock-field-input' && ctxAsks.length >= 1 && !ctxAsks.includes('How is cash this month?') || card === 'pulse', `a card’s Ask (${card}): the card joins the field as a chip, the field takes the caret, its questions replace the three`, ctxAsks.join(' · '))
      for (const q of ctxAsks) {
        await d.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]', { hasText: q }).first().click().catch(async () => { await field(d).click(); await d.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]', { hasText: q }).first().click() })
        await waitDone(d); await settle(d, 300)
        const t = await d.locator('[data-testid="dock-entry"]').last().innerText().catch(() => '')
        ok(!/I can’t answer that yet|Couldn’t look that up/.test(t), `the card’s question is answered from the records: “${q}”`)
        await d.keyboard.press('Escape'); await d.locator('[role="dialog"][aria-label="Maison AI"] button[aria-label="Close"]').click({ timeout: 1000 }).catch(() => {}); await field(d).click(); await settle(d, 200)
      }
      await d.locator('[data-testid="dock-about-clear"]').click(); await settle(d, 200)
      ok(await d.locator('[data-testid="dock-about"]').count() === 0, '…and ✕ takes the card out of the question')
    } else ok(true, '(no card head carries its Ask yet — the cards are lanes D1–D3’s)')

    /* every suggestion is answered from the records */
    await go(d, '/dashboard', 1500)
    for (const q of await suggestions(d)) {   // (the calm pass 2026-10-26, a deliberate change) with the field in use
      if (/^Remind /.test(q)) continue   // asked above, with its proposal
      await field(d).click(); await field(d).fill(q); await field(d).press('Enter'); await waitDone(d); await settle(d, 300)
      const t = await d.locator('[data-testid="dock-entry"]').last().innerText().catch(() => '') + await d.locator('[data-testid="dock-pane"]').innerText().catch(() => '')
      ok(!/I can’t answer that yet|Couldn’t look that up/.test(t), `the suggestion is answered from the records: “${q}”`)
      await d.keyboard.press('Escape'); await settle(d, 200)
    }

    /* the + */
    await field(d).press('Escape').catch(() => {})
    await openPlus(d)   // (the calm pass 2026-10-26, a deliberate change) the + comes with the field in use
    const plusRows = await d.locator('[role="menu"] [role="menuitem"]').allInnerTexts()
    ok(plusRows.some((t) => /competitor’s quote/.test(t)) && plusRows.some((t) => /Reset prototype to base/.test(t)), 'the + : the tools that read a file, and the prototype’s reset', plusRows.length)
    await d.locator('[role="menu"] [role="menuitem"]', { hasText: 'Reset prototype to base' }).click(); await settle(d, 400)
    ok(await d.getByRole('dialog', { name: 'Reset the prototype?' }).count() === 1 || await d.getByText('Reset the prototype?').count() >= 1, '…the reset asks first (the house confirm) — cancelled here')
    await d.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 300)
    await openPlus(d)
    await d.locator('[role="menu"] [role="menuitem"]', { hasText: 'competitor’s quote' }).click(); await d.waitForURL(/quote-x-ray/, { timeout: 15000 }).catch(() => {})
    ok(/\/quote-x-ray/.test(d.url()) && new URL(d.url()).searchParams.get('from') === '/dashboard', '…a tool opens with the way back', d.url())

    /* every other page keeps its floating button; ⌘J opens its Ask box; its answers draw the cards */
    await go(d, '/tasks', 1500)
    ok(await fabCount(d) === 1, 'Q-02 · every other page keeps the floating button')
    await d.evaluate(() => document.activeElement && document.activeElement.blur())
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j'); await settle(d, 900)
    ok(await d.evaluate(() => !!document.activeElement?.closest('[data-testid="maison-ask"]')), 'Q-09 · on another page ⌘J opens the sheet with the caret in its Ask box')
    const box = d.locator('[data-testid="maison-ask"] input')
    await box.fill('How is the studio doing?'); await box.press('Enter'); await d.waitForSelector('[data-testid="maison-answer"] [data-testid^="maison-figure-"]', { timeout: 15000 }).catch(() => {})
    ok(await d.locator('[data-testid="maison-answer"] [data-testid^="maison-figure-"]').count() >= 3, 'P-10 · the sheet everywhere else draws the answer cards too (the studio’s figures)')
    await shot(d, '05-sheet-cards-1440')
    await c.close()

    /* (the calm pass 2026-10-26) the cards' foot clears the pill at the page's end, wherever the band shows — and the pill alone at rest */
    const clears = (p) => p.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      const band = document.querySelector('[data-testid="maison-dock"]').getBoundingClientRect()
      const pill = document.querySelector('[data-testid="dock-field"], [data-testid="dock-door"]').getBoundingClientRect()
      const cards = [...document.querySelectorAll('[data-testid="dashboard"] [data-card], [data-testid="dashboard"] [data-slot]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.getBoundingClientRect().bottom)
      return { band: Math.round(band.top), pill: Math.round(pill.top), last: Math.round(Math.max(0, ...cards)) }
    })
    for (const [w, h, t] of [[1280, 800, false], [1024, 768, true], [768, 1024, true]]) {
      const cx = t ? await touch(w, h) : await desk(w, h); const q = await cx.newPage(); watch(q, `${w}`)
      await go(q, '/dashboard', 1500)
      const r0 = await dockBusy(q)
      const e = await clears(q); await settle(q, 300)
      const e2 = await clears(q)
      ok(r0.chips === 0 && r0.plus === 0 && e2.last <= e2.band + 1 && e2.last < e2.pill, `calm · ${w}${t ? ' touch' : ''}: the pill alone at rest, and the cards’ foot clears it at the page’s end`, JSON.stringify({ rest: r0, end: e2, first: e }))
      if (w === 1280) ok(Math.round((await q.locator('[data-testid="dock-field"]').boundingBox()).width) === 640, 'calm · 1280: the pill is 640 too')
      await cx.close()
    }

    /* ── 1024 held sideways (touch): docked at 640, short answers above the field ───────────────────────────────────────────────────── */
    const sw = await touch(1024, 768); const s = await sw.newPage(); watch(s, '1024')
    await go(s, '/dashboard', 1600)
    const w1024 = await s.evaluate(() => document.querySelector('[data-testid="dock-field"]')?.getBoundingClientRect().width ?? 0)
    ok(w1024 > 0 && w1024 <= 640, `1024 sideways: the field docks at 640 (${Math.round(w1024)})`)
    await inUse(s)   // (the calm pass 2026-10-26, a deliberate change) a tap in the field brings the suggestions
    await s.locator('[data-testid="dock-chips-dock"] [data-testid="dock-chip"]', { hasText: 'How is the studio doing?' }).first().tap().catch(() => {})
    await waitDone(s); await settle(s, 400)
    ok(await s.locator('[data-testid="dock-thread"] [data-testid="dock-answer"]').count() >= 1 || !(await chipWords(chips(s))).includes('How is the studio doing?'), '…a short answer above the field')
    ok(await fabCount(s) === 0 && await sideways(s) <= 0, '…no floating button, no sideways scroll')
    await shot(s, '06-1024-touch')
    await sw.close()

    /* ── 768 upright (touch): the door opens the house Sheet ──────────────────────────────────────────────────────────────────────── */
    const tw = await touch(768, 1024); const t = await tw.newPage(); watch(t, '768')
    await go(t, '/dashboard', 1600)
    const door = t.locator('[data-testid="dock-door"]')
    const doorFont = await door.locator('span').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0)
    ok(await door.count() === 1 && doorFont >= 16 && (await door.boundingBox()).height >= 44, '768 upright: the field at the foot, 16px, a 44 target')
    /* (the calm pass 2026-10-26, a deliberate change) the door is the same pill, alone at rest — its sheet holds the suggestions */
    const doorLook = await door.evaluate((e) => ({ r: parseFloat(getComputedStyle(e).borderTopLeftRadius), h: e.getBoundingClientRect().height, chips: document.querySelectorAll('[data-testid="dock-chips-dock"]').length }))
    ok(doorLook.r >= doorLook.h / 2 && doorLook.chips === 0, 'calm · 768 upright: the door is the pill, with no suggestion row at rest', JSON.stringify(doorLook))
    await door.tap(); await settle(t, 800)
    const sheetField = t.locator('[data-testid="dock-sheet-field-input"]')
    ok(await sheetField.count() === 1 && await t.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'dock-sheet-field-input', '…a tap opens the house Sheet with the caret in its field')
    await sheetField.fill('Which leads need attention?'); await sheetField.press('Enter'); await waitDone(t, '[data-testid="dock-sheet-thread"]'); await settle(t, 400)
    ok(await t.locator('[data-testid="dock-sheet-thread"] [data-testid="dock-answer"]').count() === 1, '…the answer is drawn in the sheet')
    const inputFont = await sheetField.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
    ok(inputFont >= 16, `…its field types at 16 (${inputFont})`)
    await shot(t, '07-768-sheet')
    await tw.close()

    /* ── a phone (390, touch): the accessory, its ✦, the sheet, the keyboard ──────────────────────────────────────────────────────── */
    const pw = await touch(390, 844); const p = await pw.newPage(); watch(p, '390')
    await go(p, '/dashboard', 1600)
    const acc = p.locator('[data-testid="dock-accessory"]')
    const navTop = await p.evaluate(() => document.querySelector('nav[aria-label="Primary"]')?.getBoundingClientRect().top ?? 0)
    const a0 = await acc.boundingBox()
    ok(a0 && a0.height >= 44 && a0.y + a0.height <= navTop && navTop - (a0.y + a0.height) <= 16 && a0.width > 300, `the phone: a field-shaped button just above the dock (${Math.round(a0?.width ?? 0)} × ${Math.round(a0?.height ?? 0)})`)
    await shot(p, '08-phone-rest')
    await p.mouse.wheel(0, 400); await settle(p, 200); await p.mouse.wheel(0, 400); await settle(p, 600)
    const a1 = await acc.boundingBox()
    const navRight = await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Primary"] > a, nav[aria-label="Primary"] > button')].map((e) => e.getBoundingClientRect().right).reduce((m, x) => Math.max(m, x), 0))
    ok(a1 && Math.round(a1.width) === 44 && a1.y >= navTop && a1.x >= navRight - 1, 'scrolled down, it shrinks into the ✦ at the dock’s end — the dock makes room', JSON.stringify({ a1, navTop, navRight }))
    await shot(p, '09-phone-shrunk')
    await p.mouse.wheel(0, -300); await settle(p, 600)
    ok(((await acc.boundingBox())?.width ?? 0) > 300, '…and comes back on the way up')
    await acc.tap(); await settle(p, 800)
    const pField = p.locator('[data-testid="dock-sheet-field-input"]')
    ok(await pField.count() === 1, '…a tap opens the house Sheet, the field at its foot')
    /* the keyboard: the visual viewport shrinks by 300 — the sheet rests above it */
    await p.evaluate(() => { const vv = window.visualViewport; Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - 300 }); vv.dispatchEvent(new Event('resize')) })
    await settle(p, 400)
    const kb = await p.evaluate(() => { const f = document.querySelector('[data-testid="dock-sheet-field"]').getBoundingClientRect(); return { bottom: f.bottom, limit: window.innerHeight - 300 } })
    ok(kb.bottom <= kb.limit + 1, 'the keyboard lifts the sheet: its field stays above the keys (visualViewport)', JSON.stringify(kb))
    await p.evaluate(() => { delete window.visualViewport.height; window.visualViewport.dispatchEvent(new Event('resize')) }).catch(() => {})
    await pField.fill('How is cash this month?'); await pField.press('Enter'); await waitDone(p, '[data-testid="dock-sheet-thread"]'); await settle(p, 500)
    ok(await p.locator('[data-testid="dock-sheet-thread"] [data-testid^="maison-figure-"]').count() >= 3, '…the answer and its cards in the sheet')
    await shot(p, '10-phone-sheet')
    ok(await sideways(p) <= 0, 'no sideways scroll at 390')
    await pw.close()

    /* 320 and a phone held sideways */
    const nw = await touch(320, 640); const n = await nw.newPage(); watch(n, '320')
    await go(n, '/dashboard', 1500)
    ok(await sideways(n) <= 0 && ((await n.locator('[data-testid="dock-accessory"]').boundingBox())?.width ?? 999) <= 320 - 24, '320: the accessory fits, no sideways scroll')
    await n.mouse.wheel(0, 500); await settle(n, 200); await n.mouse.wheel(0, 500); await settle(n, 700)
    const overlap = await n.evaluate(() => { const a = document.querySelector('[data-testid="dock-accessory"]').getBoundingClientRect(); return [...document.querySelectorAll('nav[aria-label="Primary"] > a, nav[aria-label="Primary"] > button')].some((e) => { const r = e.getBoundingClientRect(); return r.right > a.left + 1 && r.left < a.right - 1 }) })
    ok(!overlap, '320: the shrunk ✦ never sits on the More item')
    await shot(n, '11-phone-320-shrunk')
    await nw.close()
    const hw = await touch(844, 390); const h = await hw.newPage(); watch(h, '844')
    await go(h, '/dashboard', 1500)
    const lone = await h.locator('[data-testid="dock-accessory"]').boundingBox()
    ok(lone && Math.round(lone.width) === 44 && await h.locator('[data-testid="dock-field"]').count() === 0 && await sideways(h) <= 0, 'a phone held sideways: the ✦ alone, no band, no sideways scroll')
    await h.locator('[data-testid="dock-accessory"]').tap(); await settle(h, 700)
    ok(await h.locator('[data-testid="dock-sheet-field-input"]').count() === 1, '…its tap opens the sheet')
    await shot(h, '12-phone-sideways-sheet')
    await hw.close()

    /* ── roles: each one's suggestions are its own, and answered ─────────────────────────────────────────────────────────────────── */
    for (const [id, want, not] of [['priya', /How is cash this month\?/, /^Remind |Prepare me/], ['nurul', /leads need attention/, /cash|^Remind /], ['michelle', null, /cash/], ['huimin', /How is cash this month\?/, null], ['james', /team|attention/, /cash/]]) {
      as(id)
      const rc = await desk(); const r = await rc.newPage(); watch(r, id)
      await go(r, '/dashboard', 1600)
      const words = await suggestions(r)   // (the calm pass 2026-10-26, a deliberate change) with the field in use
      const w = waitingFor(id)
      ok((!want || words.some((x) => want.test(x))) && (!not || !words.some((x) => not.test(x))) && (id !== 'michelle' || (w.length ? words.some((x) => /^Remind /.test(x)) : true)) && await fabCount(r) === 0,
        `${id}: the role’s own suggestions (${words.join(' · ')})`)
      for (const q of words.filter((x) => !/^Remind /.test(x)).slice(0, 3)) {
        await field(r).click(); await field(r).fill(q); await field(r).press('Enter'); await waitDone(r); await settle(r, 300)
        const t = (await r.locator('[data-testid="dock-entry"]').last().innerText().catch(() => '')) + (await r.locator('[data-testid="dock-pane"]').innerText().catch(() => ''))
        ok(!/I can’t answer that yet|Couldn’t look that up|Not for /.test(t), `${id}: “${q}” is answered`)
        await r.keyboard.press('Escape'); await settle(r, 200)
      }
      const plus = await (async () => { await openPlus(r); return r.locator('[role="menu"] [role="menuitem"]').allInnerTexts() })()   // (the calm pass, a deliberate change)
      ok(id === 'priya' || id === 'nurul' ? plus.length === 1 : plus.length >= 5, `${id}: the + offers only what the role opens`)
      await rc.close()
    }
    as('dane')

    ok(errors.length === 0, 'no page errors', errors.join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    if (seeded) sql(`delete from meetings where id = '${seeded}'`)
    as(you0)
    sql(`delete from maison_questions where id not in (${asked0.map((id) => `'${id}'`).join(',') || "''"})`)
    sql(`delete from lead_events where kind = 'portal_reminded' and id not in (${events0.map((id) => `'${id}'`).join(',') || "''"})`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
