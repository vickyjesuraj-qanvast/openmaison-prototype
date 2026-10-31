// Pending modules, step S24 · Marketplace (the owner's "build all of them but one after the other", 2026-10-11; survey key studio:marketplace —
// 1.0's /marketplace and /marketplace/[id], read from Qanvast's brand API through /api/qanvast/*). Each item asserted as the rule it builds,
// never another round's count:
//  - one home: the rail's and More's Marketplace are live (Accounting's rail leaves it out and its address is the house gate); a brand joins
//    the studio's vendors in Finance › Vendors (a vendor of the same name is linked, never doubled) and a product joins the Price book's
//    My Items with the brand as its vendor — from there a quote's Price book and a client's Choices (From the Price book) take it
//  - the directory: Brands · Deals with their counts from the records; the categories (1.0's, each with its count, empty ones left out); the
//    search; 1.0's three sorts (a featured brand first under Most popular); twelve at a time with Show more; the address keeps the view
//  - the deals: each opens its dialog (its picture, when it runs, terms, how to redeem) with one filled button — Get deal, which reaches the
//    brand its own way (its page, WhatsApp, email) on the press and is recorded so nobody asks twice; nothing pretends to buy
//  - the brand page: its pictures, About · Contact · Web links · Services · Deals · Products · Questions from the records, WhatsApp the brand
//  - the banners at the top in their window, each opening what it names
//  - Maison AI answers from the records here; ⌘K finds a brand and a deal; a brand the feed withdrew answers its own notice
//  - 390 · 320 · 768 touch with no sideways scroll against screen.width; the ghosts draw the pages they stand for; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s24.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s24')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

/* the demo's Marketplace (repair R141): the feed's copy, and the studio's own links and ask */
const OAK = 'mkb-4101', LUMEN = 'mkb-4103', FX = 'mkb-4104', NOOK = 'mkb-4113', KAYA = 'mkb-4109'
const SOFA_DEAL = 'mkd-4501', NOOK_DEAL = 'mkd-4509', PENDANT_DEAL = 'mkd-4503', KITCHEN_DEAL = 'mkd-4505'
const OSLO = 'mkp-4201', HAVEN = 'mkp-4203', VINYL = 'mkp-4231'
const WHOLE = ['vendors', 'price_book_items', 'price_book_changes', 'marketplace_deal_asks', 'marketplace_deals', 'marketplace_banners', 'marketplace_brands', 'notifications', 'notification_outbox', 'maison_questions']
const nowMs = () => Date.now()

/* The ghost-vs-page measure (the S17 / S23 probes'): in the held reveal every element carrying a page module's class in both, index by index after
   aligning the lists — the first screen only — and every Words sentence the ghost sets in a page class against that page's. */
async function measure(b, opts, url, blocks, max = 30) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2400)
  const out = await p.evaluate(({ blocks, max }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal|tab-ghosts)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (blocks && !blocks.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x))) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) {
      const ps = q.get(k); if (!ps) continue
      let best = 0, bestCost = Infinity
      for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
    }
    const words = []
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words }
  }, { blocks, max })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const popups = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  /* a press that leaves the app (WhatsApp, the brand's own pages on the reserved .example domain) is caught and answered here */
  const context = async (o) => {
    const c = await b.newContext(o)
    await c.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) })
    await c.route(/^https:\/\/[^/]*\.example\//, (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>brand</p>' }) })
    return c
  }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await snackText(p); if (re.test(s)) return s; await p.waitForTimeout(200) } return snackText(p) }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 250)) } return fn() }
  const popupAfter = async (n0, ms = 4000) => { await waitFor(() => popups.length > n0, ms); return popups.slice(n0) }
  const cards = (p) => p.getByTestId('market-brand')
  const names = async (p) => (await cards(p).locator('a[data-kb-open]').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || '').replace(/^Open /, ''))))

  /* the record as it was — put back in `finally` */
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
    as('dane')
    const ctx = await context(opts())
    const p = await page(ctx, '1440')
    await go(p, '/leads', 2000)   // open one page and wait before reading the record (the habit after S08)
    const live = (t, extra = '') => Number(sql(`select count(*) from ${t} where removed_at is null ${extra}`))
    const brandsN = live('marketplace_brands')
    const now = nowMs()
    const dealsN = Number(sql(`select count(*) from marketplace_deals d join marketplace_brands b on b.id = d.brand_id where d.removed_at is null and b.removed_at is null and (d.starts_at is null or d.starts_at <= ${now}) and (d.ends_at is null or d.ends_at >= ${now})`))
    ok(brandsN > 12 && dealsN > 0, 'the demo’s Marketplace is on record (repair R141): its brands and live deals', `${brandsN} brands · ${dealsN} deals`)

    // ── 1 · one home: the rail, the directory ───────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · The rail’s Marketplace, the directory, its categories, search, sorts and Show more')
      const rail = p.locator('nav[aria-label="Workspace"]')
      ok(await rail.locator('a[href="/marketplace"]').count() === 1 && await rail.locator('button[aria-label="Marketplace · coming soon"]').count() === 0, 'the rail’s Marketplace is a destination, no longer Soon')
      await rail.locator('a[href="/marketplace"]').click(); await settle(p, 2000)
      ok(new URL(p.url()).pathname === '/marketplace' && await p.getByTestId('marketplace').isVisible(), '…it opens the Marketplace')
      ok((await rail.locator('a[href="/marketplace"]').getAttribute('aria-current')) === 'page', '…and lights while you are on it')
      /* (the calm UI build 2026-10-27, a deliberate change) — 6-01 · 6-27: Brands | Deals are the house Tabs, no counts; the categories one scope pill, its rows without counts */
      const views = await p.getByTestId('market-views').locator('[role="tab"]').allInnerTexts()
      ok(views.map((v) => v.trim()).join('|') === 'Brands|Deals', 'Brands | Deals as the house tabs, no counts', views.join(' | '))
      const cats = json(`select c.name, (select count(*) from marketplace_brands b where b.removed_at is null and exists (select 1 from json_each(b.categories) j where j.value = c.name)) as n from marketplace_categories c order by c.position`).filter((c) => c.n > 0)
      await p.getByTestId('market-categories').getByRole('button', { name: /^Category: All/ }).click(); await settle(p, 400)
      const chips = (await p.locator('[role="menu"] [role="menuitemradio"]').allInnerTexts()).map((c) => c.trim())
      ok(chips.join('|') === ['All', ...cats.map((c) => c.name)].join('|'), '1.0’s categories, in the feed’s order (none empty) — the pill’s rows', chips.join(' | '))
      await p.keyboard.press('Escape'); await settle(p, 300)
      ok(await cards(p).count() === 12, 'twelve brands at a time (1.0’s page size)')
      ok((await p.getByTestId('market-shown').innerText()) === `Showing 12 of ${brandsN} brands`, '…said under them: “Showing 12 of n brands”')
      /* Most popular: a featured brand first, by its rank (1.0's order), then the feed's popularity */
      const featured = json(`select name from marketplace_brands where removed_at is null and featured_rank is not null order by featured_rank`).map((r) => r.name)
      const byPop = json(`select name from marketplace_brands where removed_at is null and featured_rank is null order by popularity desc, name`).map((r) => r.name)
      const shown12 = await names(p)
      ok(shown12.join('|') === [...featured, ...byPop].slice(0, 12).join('|'), 'Most popular: the featured brands first by their rank, then the most popular', shown12.slice(0, 5).join(', '))
      ok(await cards(p).first().getByTestId('brand-featured').count() === 0, '…a featured brand sorts first; Featured is said on its page, not its card')   // (the calm UI build 2026-10-27, a deliberate change) — 6-01 · W-186
      const firstDeal = one(`select d.title from marketplace_deals d where d.brand_id = (select id from marketplace_brands where removed_at is null order by featured_rank is null, featured_rank, popularity desc limit 1) and d.removed_at is null order by d.position limit 1`)
      const dealsOf = Number(sql(`select count(*) from marketplace_deals d where d.brand_id = (select id from marketplace_brands where removed_at is null order by featured_rank is null, featured_rank, popularity desc limit 1) and d.removed_at is null`))
      ok(firstDeal && (await cards(p).first().getByTestId('brand-deal').innerText()).trim() === `${dealsOf} ${dealsOf === 1 ? 'deal' : 'deals'}`, '…and its deals’ count over its photo (a press of its own)')   // (the calm UI build 2026-10-27, a deliberate change) — 6-01 · W-081: one badge, the count
      await shot(p, '01-home-1440')
      await p.getByTestId('market-more').click(); await settle(p, 600)
      ok(await cards(p).count() === brandsN && await p.getByTestId('market-more').count() === 0, 'Show more brings the rest; with nothing more to show the button goes')
      ok(/shown=24/.test(p.url()), '…and the address keeps it (Back from a brand returns to it)', p.url())
      /* the sorts */
      await p.getByRole('button', { name: /^Sort: / }).click(); await settle(p, 400)
      const sorts = await p.locator('[role="menu"] [role="menuitemradio"]').allInnerTexts()
      ok(sorts.map((s) => s.trim()).join('|') === 'Most popular|Most recent|Most reviews', '1.0’s three sorts', sorts.join(' | '))
      await p.locator('[role="menu"] [role="menuitemradio"]', { hasText: 'Most recent' }).click(); await settle(p, 500)
      const recent = json(`select name from marketplace_brands where removed_at is null order by published_at desc, name`).map((r) => r.name)
      ok((await names(p)).slice(0, 3).join('|') === recent.slice(0, 3).join('|'), 'Most recent: the newest on the Marketplace first', (await names(p)).slice(0, 3).join(', '))
      ok(/sort=recent/.test(p.url()) && (await p.getByRole('button', { name: /^Sort: / }).innerText()).includes('Most recent'), '…the pill names it and the address keeps it')
      await p.getByRole('button', { name: /^Sort: / }).click(); await settle(p, 300)
      await p.locator('[role="menu"] [role="menuitemradio"]', { hasText: 'Most reviews' }).click(); await settle(p, 500)
      const reviewed = json(`select name from marketplace_brands where removed_at is null order by reviews desc, name`).map((r) => r.name)
      ok((await names(p)).slice(0, 3).join('|') === reviewed.slice(0, 3).join('|'), 'Most reviews: the most reviewed first')
      /* a category */
      await p.getByTestId('market-categories').getByRole('button', { name: /^Category: / }).click(); await settle(p, 300)   // (the calm UI build 2026-10-27, a deliberate change) — the pill's row
      await p.locator('[role="menu"] [role="menuitemradio"]', { hasText: /^Kitchen$/ }).click(); await settle(p, 500)
      const kitchen = json(`select name from marketplace_brands b where removed_at is null and exists (select 1 from json_each(b.categories) j where j.value = 'Kitchen') order by name`).map((r) => r.name)
      ok((await names(p)).sort().join('|') === kitchen.join('|') && /category=Kitchen/.test(p.url()), 'a category shows its brands only, and the address keeps it', (await names(p)).join(', '))
      /* the search — over each view's own words; in the open category, as a library searches where you are */
      await p.getByTestId('market-categories').getByRole('button', { name: /^Category: / }).click(); await settle(p, 300)   // (the calm UI build 2026-10-27, a deliberate change)
      await p.locator('[role="menu"] [role="menuitemradio"]', { hasText: /^All$/ }).click(); await settle(p, 400)
      await p.getByRole('searchbox', { name: 'Search brands' }).fill('teak'); await settle(p, 500)
      const found = await names(p)
      ok(found.includes('Kampong Teak Works') && found.length < brandsN, 'Search brands finds a brand by its words (name, line, categories, deals)', found.join(', '))
      await p.getByRole('searchbox', { name: 'Search brands' }).fill('zzqx'); await settle(p, 500)
      ok(await p.getByTestId('search-empty').isVisible() && /Check your spelling/.test(await p.getByTestId('search-empty').innerText()), 'a search that finds nothing: the house “No results found”')
      await p.getByTestId('search-empty').getByRole('button', { name: 'Clear All' }).click(); await settle(p, 500)
      ok(await cards(p).count() >= 12, '…Clear All brings the brands back')
      /* "/" reaches the page's search */
      await p.locator('body').click({ position: { x: 700, y: 30 } }).catch(() => {}); await p.keyboard.press('/'); await settle(p, 300)
      ok(await p.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Search brands', '“/” focuses the page’s search')
      await p.keyboard.press('Escape')
      ok(await p.locator('[data-kb-list="brand"] [data-kb-row]').count() >= 12 && await p.locator('[data-kb-list="brand"] [data-kb-open]').count() >= 12, 'the cards are a walkable list (the house keys’ DOM contract)')
      /* the card's ⋮ */
      await go(p, '/marketplace', 1400)
      const oak = cards(p).filter({ has: p.locator(`[data-brand="${OAK}"]`) }).first()
      await p.locator(`[data-brand="${OAK}"]`).getByRole('button', { name: `More options for Oak & Linen` }).click(); await settle(p, 400)
      const rows = (await p.locator('[role="menu"] [role="menuitem"]').allInnerTexts()).map((t) => t.split('\n')[0].trim())
      ok(rows.join('|') === 'Open|WhatsApp Oak & Linen|Add to my vendors', 'a card’s ⋮: Open · WhatsApp · Add to my vendors', rows.join(' | '))
      const n0 = popups.length
      await p.locator('[role="menu"] [role="menuitem"]', { hasText: 'WhatsApp Oak & Linen' }).click()
      const wa = (await popupAfter(n0)).find((u) => u.startsWith('https://wa.me/'))
      ok(!!wa && wa.includes(`65${sql(`select whatsapp from marketplace_brands where id = '${OAK}'`)}`) && /Oak%20%26%20Linen/.test(wa), 'WhatsApp opens on the press, to the brand’s own number, the studio’s line drafted', wa)
      ok(/Your message to Oak & Linen is in WhatsApp/.test(await waitSnack(p, /WhatsApp/)), '…and says so')
      void oak
    }

    // ── 2 · deals: the view, the dialog, Get deal ───────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Deals — the view, the deal’s dialog, Get deal (WhatsApp · email · the brand’s page), the ask on record')
      await go(p, '/marketplace', 1200)
      await p.getByTestId('market-views').locator('[role="tab"]', { hasText: /^Deals/ }).click(); await settle(p, 600)   // (the calm UI build 2026-10-27, a deliberate change) — the house Tabs
      ok(/view=deals/.test(p.url()) && await p.getByTestId('market-deal').count() === dealsN, 'Deals lists every live deal, and the address says Deals')
      const flash = Number(sql(`select count(*) from marketplace_deals where removed_at is null and flash = 1 and (ends_at is null or ends_at >= ${now})`))
      const first = await p.getByTestId('market-deal').evaluateAll((els) => els.map((e) => !!e.querySelector('[data-testid="deal-flash"]')))
      ok(first.slice(0, flash).every(Boolean) && first.slice(flash).every((x) => !x), 'a flash deal first, wearing Flash deal')
      ok(await p.getByRole('button', { name: /^Sort: / }).count() === 0, 'the sort is the brands’ (1.0 sorted brands only)')
      await shot(p, '02-deals-1440')
      /* the seeded ask */
      const sofa = p.locator(`[data-deal="${SOFA_DEAL}"]`)
      ok(/You asked on /.test(await sofa.innerText()), 'Dane’s ask for Oak & Linen’s sofa deal shows on its card (R141)')
      await sofa.getByRole('button', { name: /^Open the deal/ }).click(); await settle(p, 700)
      const dlg = p.getByTestId('deal-dialog')
      ok(await dlg.isVisible() && new URL(p.url()).searchParams.get('deal') === SOFA_DEAL, 'a deal opens its dialog, and the address names it')
      const d = one(`select * from marketplace_deals where id = '${SOFA_DEAL}'`)
      const body = await dlg.innerText()
      ok(body.includes(d.terms) && body.includes(d.redemption) && body.includes(d.description), '…its words, Terms and conditions and How to redeem, from the record')
      ok(/You asked for this deal on WhatsApp on /.test(await p.getByTestId('deal-asked').innerText()), '…who asked before, and how')
      ok((await p.getByTestId('deal-get').innerText()).includes('Ask again on WhatsApp'), 'asked before: the button says it asks again, how it reaches the brand (outlined — W-204)')   // (the calm UI build 2026-10-27, a deliberate change)
      await shot(p, '03-deal-dialog-1440')
      const asks0 = Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${SOFA_DEAL}'`))
      const n0 = popups.length
      await p.getByTestId('deal-get').click()
      const wa = (await popupAfter(n0)).find((u) => u.startsWith('https://wa.me/'))
      ok(!!wa && decodeURIComponent(wa).includes(d.title), 'Get deal opens WhatsApp on the press, the deal named in the message', wa && decodeURIComponent(wa).slice(0, 140))
      await waitFor(() => Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${SOFA_DEAL}'`)) === asks0 + 1)
      const ask = one(`select member_id, how from marketplace_deal_asks where deal_id = '${SOFA_DEAL}' order by created_at desc limit 1`)
      ok(ask && ask.member_id === 'dane' && ask.how === 'whatsapp', '…and the ask is on record: who, how', JSON.stringify(ask))
      ok(/Your message to Oak & Linen is in WhatsApp/.test(await waitSnack(p, /WhatsApp/)), '…said in one line')
      await p.keyboard.press('Escape'); await settle(p, 600)
      ok(!new URL(p.url()).searchParams.get('deal') && /view=deals/.test(p.url()), 'closing the deal takes it out of the address, the view stays')
      /* email: a brand with no WhatsApp */
      await p.locator(`[data-deal="${NOOK_DEAL}"]`).getByRole('button', { name: /^Open the deal/ }).click(); await settle(p, 700)
      ok((await p.getByTestId('deal-get').innerText()).includes('Get deal by email'), 'a brand with email only: Get deal by email')
      const href0 = p.url()
      await p.getByTestId('deal-get').click(); await settle(p, 1200)
      await waitFor(() => Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${NOOK_DEAL}' and how = 'email'`)) === 1)
      ok(Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${NOOK_DEAL}' and how = 'email'`)) === 1 && p.url() === href0, '…the email opens in the mail app and the ask is on record; the page stays')
      await p.keyboard.press('Escape'); await settle(p, 500)
      /* the brand's own page for the deal (1.0's ctaUrl · ctaText) — the feed's field, set for a moment */
      sql(`update marketplace_deals set cta_url = 'https://www.lumenlane.example/offers/pendants', cta_text = 'See the offer' where id = '${PENDANT_DEAL}'`)
      await go(p, `/marketplace?view=deals&deal=${PENDANT_DEAL}`, 1400)
      ok(await p.getByTestId('deal-dialog').isVisible(), '`?deal=` opens a deal on arrival (a banner, ⌘K, a link)')
      ok((await p.getByTestId('deal-get').innerText()).includes('See the offer') && !(await p.getByTestId('deal-get').innerText()).includes('Get deal'), 'a deal with its own page: the brand’s words on the button (1.0’s ctaText)')
      const n1 = popups.length
      await p.getByTestId('deal-get').click()
      const opened = await popupAfter(n1)
      ok(opened.some((u) => u.startsWith('https://www.lumenlane.example/offers/pendants')), '…its page opens in a new tab on the press', opened.join(' '))
      await waitFor(() => Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${PENDANT_DEAL}' and how = 'link'`)) === 1)
      ok(Number(sql(`select count(*) from marketplace_deal_asks where deal_id = '${PENDANT_DEAL}' and how = 'link'`)) === 1, '…recorded as asked on their page')
      sql(`update marketplace_deals set cta_url = NULL, cta_text = NULL where id = '${PENDANT_DEAL}'`)
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* an ended deal leaves every list */
      const pendantEnds = sql(`select ends_at from marketplace_deals where id = '${PENDANT_DEAL}'`)
      sql(`update marketplace_deals set ends_at = ${now - 86_400_000} where id = '${PENDANT_DEAL}'`)
      await go(p, '/marketplace?view=deals', 1200)
      ok(await p.locator(`[data-deal="${PENDANT_DEAL}"]`).count() === 0 && await p.getByTestId('market-deal').count() === dealsN - 1, 'a deal past its last day leaves the Marketplace')
      sql(`update marketplace_deals set ends_at = ${pendantEnds} where id = '${PENDANT_DEAL}'`)
    }

    // ── 3 · the banners ───────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · The banners at the top — in their window, each opening what it names')
      await go(p, '/marketplace', 1400)
      const inWindow = Number(sql(`select count(*) from marketplace_banners where (starts_at is null or starts_at <= ${now}) and (ends_at is null or ends_at >= ${now})`))
      ok(await p.getByTestId('market-banner').count() === inWindow && inWindow > 1, 'the banners in their window are a strip at the top', `${inWindow}`)
      const firstB = one(`select * from marketplace_banners order by position limit 1`)
      ok((await p.getByTestId('market-banner').first().innerText()).includes(firstB.title), '…their words over the picture, from the feed')
      await p.getByTestId('market-banner').first().click(); await settle(p, 800)
      ok(await p.getByTestId('deal-dialog').isVisible() && /view=deals/.test(p.url()), 'a deal’s banner opens the deal over Deals')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, '/marketplace', 1200)
      const brandBanner = p.getByTestId('market-banner').filter({ hasText: 'Rattan Row' })
      ok((await brandBanner.getAttribute('href')).startsWith('/marketplace/mkb-4114?from='), 'a brand’s banner opens its page, carrying the way back')
      const ended = one(`select id, ends_at from marketplace_banners order by position limit 1`)
      sql(`update marketplace_banners set ends_at = ${now - 1000} where id = '${ended.id}'`)
      await go(p, '/marketplace', 1200)
      ok(await p.getByTestId('market-banner').count() === inWindow - 1, 'a banner past its window leaves the strip')
      sql(`update marketplace_banners set ends_at = ${ended.ends_at} where id = '${ended.id}'`)
    }

    // ── 4 · a brand's page ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · A brand’s page — pictures, About · Contact · Web links · Services · Deals · Products · Questions')
      await go(p, '/marketplace?category=Furniture', 1200)
      await p.locator(`[data-brand="${OAK}"] a[data-kb-open]`).click(); await settle(p, 2000)
      ok(new URL(p.url()).pathname === `/marketplace/${OAK}` && /from=%2Fmarketplace%3Fcategory%3DFurniture/.test(p.url()), 'a card opens the brand’s page, carrying where it was opened from', p.url())
      const back = p.locator('a[data-kb="back"]')
      ok((await back.getAttribute('href')) === '/marketplace?category=Furniture' && (await back.getAttribute('aria-label')) === 'Back to Marketplace', 'Back returns to the Marketplace as it was left (the category)')
      const brand = one(`select * from marketplace_brands where id = '${OAK}'`)
      const gallery = JSON.parse(brand.gallery)
      ok((await p.getByTestId('brand-picture-count').innerText()) === `1 / ${gallery.length + 1}`, 'its pictures: the cover and its gallery, “1 / n”')
      await p.getByTestId('brand-picture-next').click(); await settle(p, 300)
      ok((await p.getByTestId('brand-picture-count').innerText()) === `2 / ${gallery.length + 1}` && (await p.getByTestId('brand-picture').getAttribute('src')) === gallery[0], '…Next shows the next picture')
      const about = await p.locator('[data-card="brand-about"]').innerText()
      ok(about.includes(brand.tagline) && about.includes(`${brand.reviews} reviews on Qanvast`), 'About: its own line, its categories and reviews, from the record')
      const contact = await p.locator('[data-card="brand-contact"]').innerText()
      const addr = JSON.parse(brand.addresses)
      ok(contact.includes(brand.email) && addr.every((a) => contact.includes(a)) && contact.includes(`${brand.whatsapp.slice(0, 4)} ${brand.whatsapp.slice(4)}`), 'Contact: its WhatsApp, its email, its business addresses')
      const linkN = JSON.parse(brand.websites).length + ['instagram', 'facebook', 'youtube'].filter((k) => brand[k]).length
      const links = p.getByTestId('brand-link')
      /* (pending modules, a deliberate change of this rule — at the lanes' merge) the demo catalogue's addresses sit on the reserved `.example`
         domain: such a row says it is a demo address instead of opening a browser's error page; a real address still opens in a new tab */
      const demoRows = await links.evaluateAll((els) => els.map((e) => ({ demo: e.hasAttribute('data-demo-address'), tag: e.tagName, target: e.getAttribute('target'), text: e.textContent || '' })))
      /* (the calm UI build 2026-10-27, a deliberate change) — 6-11 · W-094: a demo address is said once, under the rows ("Links open on the live app") */
      const demoSaid = !demoRows.some((r) => r.demo) || (await p.getByTestId('brand-links-demo').count()) === 1
      ok(demoSaid && demoRows.length === linkN && demoRows.every((r) => r.demo ? r.tag !== 'A' : r.tag === 'A' && r.target === '_blank'), 'Web links: its sites and socials — a real address opens in a new tab, a demo address opens nothing and the card says so once', `${demoRows.length} of ${linkN} · ${demoRows.filter((r) => r.demo).length} demo`)

      ok((await p.locator('[data-card="brand-services"]').innerText()).includes(brand.services.slice(0, 60)), 'Services: what it does (1.0’s editor note)')
      const dealsHere = Number(sql(`select count(*) from marketplace_deals where brand_id = '${OAK}' and removed_at is null and (ends_at is null or ends_at >= ${now})`))
      ok(await p.locator('[data-card="brand-deals"]').getByTestId('market-deal').count() === dealsHere, 'Deals: its live deals, each opening its dialog')
      const prods = Number(sql(`select count(*) from marketplace_products where brand_id = '${OAK}' and removed_at is null`))
      ok(await p.getByTestId('brand-product').count() === prods, 'Products: the products 1.0’s API sent and its page never showed')
      ok(await p.locator('[data-card="brand-faqs"]').locator('h3').count() === JSON.parse(brand.faqs).length, 'Questions: its FAQs')
      ok(await p.getByTestId('brand-whatsapp').isVisible() && await p.getByTestId('brand-add-vendor').isVisible(), 'the header: Add to my vendors (outlined) and WhatsApp, the one filled button')
      await shot(p, '04-brand-1440', true)
      await p.locator('[data-card="brand-deals"]').getByTestId('market-deal').first().getByRole('button', { name: /^Open the deal/ }).click(); await settle(p, 600)
      ok(await p.getByTestId('deal-dialog').isVisible() && await p.getByTestId('deal-brand').count() === 0, 'a deal opens here too (no link to the page you are on)')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* a brand with no WhatsApp: its email is the filled button */
      await go(p, `/marketplace/${NOOK}`, 1400)
      ok(await p.getByTestId('brand-email').isVisible() && await p.getByTestId('brand-whatsapp').count() === 0, 'a brand with email only: Email is its one filled button')
    }

    // ── 5 · Add to my vendors — Finance › Vendors, one list ───────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Add to my vendors — Company › Finance › Vendors, linked both ways, never doubled')
      const fx = one(`select name from vendors where marketplace_brand_id = '${FX}'`)
      await go(p, `/marketplace/${FX}`, 1400)
      ok(fx && /In your vendors as Floor Xpert Pte Ltd/.test(await p.getByTestId('brand-vendor').innerText()) && await p.getByTestId('brand-add-vendor').count() === 0, 'Floor Xpert is one of the studio’s vendors already (R141): said in About, no Add')
      const v0 = Number(sql(`select count(*) from vendors`))
      await go(p, `/marketplace/${OAK}`, 1400)
      await p.getByTestId('brand-add-vendor').click()
      await waitFor(() => Number(sql(`select count(*) from vendors where marketplace_brand_id = '${OAK}'`)) === 1)
      const ov = one(`select * from vendors where marketplace_brand_id = '${OAK}'`)
      const ob = one(`select * from marketplace_brands where id = '${OAK}'`)
      ok(ov && ov.name === ob.name && ov.phone === ob.whatsapp && ov.email === ob.email && ov.trade === 'Furniture' && ov.created_by === 'dane' && Number(sql(`select count(*) from vendors`)) === v0 + 1, 'Add to my vendors makes one vendor from the brand: its name, mobile, email and trade, linked to it', JSON.stringify(ov && { name: ov.name, phone: ov.phone, trade: ov.trade }))
      ok(/Oak & Linen is in your vendors/.test(await waitSnack(p, /vendors/)), '…said in one line, with Open')
      await settle(p, 800)
      ok(/In your vendors/.test(await p.getByTestId('brand-vendor').innerText()) && await p.getByTestId('brand-add-vendor').count() === 0, '…the page says so, and Add goes')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Open' }).last().click().catch(() => {}); await settle(p, 2400)
      ok(new URL(p.url()).pathname === '/company/finance/vendors' && new URL(p.url()).searchParams.get('open') === ov.id, 'Open lands on Finance › Vendors with the vendor open', p.url())
      const panel = p.getByTestId('vendor-panel')
      ok(await panel.isVisible() && /9155 0201/.test(await panel.innerText()), '…its panel holds the brand’s mobile')
      ok(await panel.getByTestId('vendor-marketplace').isVisible(), '…and opens the brand’s page: See it on the Marketplace')
      await panel.getByTestId('vendor-marketplace').click(); await settle(p, 2000)
      ok(new URL(p.url()).pathname === `/marketplace/${OAK}` && (await p.locator('a[data-kb="back"]').getAttribute('aria-label')) === 'Back to Finance', '…which comes back to Finance')
      /* a vendor of the same name is linked, never doubled */
      sql(`insert into vendors (id, name, trade, is_active, charges_gst, created_at) values ('s24-probe-lumen', 'Lumen Lane Pte Ltd', 'Lighting', 1, 0, ${Math.floor(now / 1000)})`)
      const v1 = Number(sql(`select count(*) from vendors`))
      await go(p, `/marketplace/${LUMEN}`, 1400)
      await p.getByTestId('brand-add-vendor').click()
      await waitFor(() => sql(`select coalesce(marketplace_brand_id, '') from vendors where id = 's24-probe-lumen'`) === LUMEN)
      ok(sql(`select marketplace_brand_id from vendors where id = 's24-probe-lumen'`) === LUMEN && Number(sql(`select count(*) from vendors`)) === v1, 'a brand whose name is already a vendor’s is linked to it — no second vendor')
      ok(/Lumen Lane Pte Ltd was one of your vendors already — it’s linked to Lumen Lane now/.test(await waitSnack(p, /vendors/)), '…and says which')
      await go(p, '/marketplace', 1400)
      ok(/In your vendors/.test(await p.locator(`[data-brand="${OAK}"]`).innerText()), 'the card says In your vendors')
      await p.locator(`[data-brand="${OAK}"]`).getByRole('button', { name: 'More options for Oak & Linen' }).click(); await settle(p, 400)
      ok(await p.locator('[role="menu"] [role="menuitem"]', { hasText: 'Open in Vendors' }).count() === 1, '…and its ⋮ opens it in Vendors')
      await p.keyboard.press('Escape')
    }

    // ── 6 · Add to Price book — My Items, by the book's rule ──────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Add to Price book — My Items with the brand as its vendor; a Designer’s is a proposal; it reaches Choices')
      await go(p, `/marketplace/${FX}`, 1400)
      const vinyl = p.locator(`[data-product="${VINYL}"]`)
      ok(await vinyl.getByTestId('product-open').isVisible() && /In your Price book/.test(await vinyl.innerText()), 'Floor Xpert’s vinyl flooring is in My Items already (R141): Open in My Items')
      await go(p, `/marketplace/${OAK}`, 1400)
      const oslo = p.locator(`[data-product="${OSLO}"]`)
      await oslo.getByTestId('product-add').click(); await settle(p, 600)
      const dlg = p.getByTestId('product-dialog')
      const prod = one(`select * from marketplace_products where id = '${OSLO}'`)
      ok(await dlg.isVisible() && await dlg.locator('input').first().inputValue() === prod.name, 'Add to Price book opens its dialog with the product’s name')
      ok(await dlg.locator('input[inputmode="decimal"]').first().inputValue() === (prod.price_minor / 100).toFixed(2), '…its cost starts at the brand’s listed price', await dlg.locator('input[inputmode="decimal"]').first().inputValue())
      ok(/Oak & Linen becomes its vendor/.test(await p.getByRole('dialog', { name: 'Add to Price book' }).innerText()), '…and says the brand is its vendor')   // (the calm UI build 2026-10-27, a deliberate change) — 6-25 · W-220
      await shot(p, '05-add-product-1440')
      await p.getByTestId('product-save').click()
      await waitFor(() => Number(sql(`select count(*) from price_book_items where marketplace_product_id = '${OSLO}' and deleted_at is null`)) === 1)
      const item = one(`select * from price_book_items where marketplace_product_id = '${OSLO}' and deleted_at is null`)
      ok(item && item.status === 'live' && item.vendor === 'Oak & Linen' && item.link === prod.link && item.thumb === prod.picture && item.cost_minor === prod.price_minor && item.unit === 'Pieces', 'an Owner’s lands in My Items, live: the brand as vendor, the product’s page and picture, its cost', JSON.stringify(item && { status: item.status, vendor: item.vendor, unit: item.unit }))
      ok(Number(sql(`select count(*) from price_book_changes where item_id = '${item.id}' and kind = 'created'`)) === 1, '…with its History line, as any new item')
      ok(/Oslo 3-seater sofa is in the Price book/.test(await waitSnack(p, /Price book/)), '…said in one line, with Open')   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
      await settle(p, 800)
      ok(await p.locator(`[data-product="${OSLO}"]`).getByTestId('product-open').isVisible(), '…the product now opens it: Open in My Items')
      await p.locator(`[data-product="${OSLO}"]`).getByTestId('product-open').click(); await settle(p, 2400)
      ok(new URL(p.url()).pathname === '/company/price-book' && new URL(p.url()).searchParams.get('open') === item.id, 'Open in My Items lands on the Price book with the item open', p.url())
      ok(await p.locator('[role="dialog"] input').evaluateAll((els) => els.some((e) => e.value === 'Oslo 3-seater sofa')), '…its item dialog, on the item')
      /* a Designer's is a proposal, and the brand joins the vendors with it */
      as('germaine')
      const kv0 = Number(sql(`select count(*) from vendors where marketplace_brand_id = '${KAYA}'`))
      await go(p, `/marketplace/${KAYA}`, 1400)
      const em = p.getByTestId('brand-product').first()
      await em.getByTestId('product-add').click(); await settle(p, 600)
      const txt = await p.getByRole('dialog', { name: 'Add to Price book' }).innerText()
      ok(/Kaya Paints becomes its vendor and joins your vendors/.test(txt) &&   /* (the calm UI build 2026-10-27, a deliberate change) — 6-25 · W-220 */ /An Owner or an Admin approves it/.test(txt) && (await p.getByTestId('product-save').innerText()).trim() === 'Propose it', 'a Designer’s dialog says the brand joins the vendors and that an Owner or an Admin approves it: Propose it')
      await p.getByTestId('product-save').click()
      const pid = sql(`select id from marketplace_products where brand_id = '${KAYA}' and removed_at is null order by position limit 1`)
      await waitFor(() => Number(sql(`select count(*) from price_book_items where marketplace_product_id = '${pid}'`)) === 1)
      const prop = one(`select * from price_book_items where marketplace_product_id = '${pid}'`)
      ok(prop && prop.status === 'proposed' && prop.created_by === 'germaine' && Number(sql(`select count(*) from vendors where marketplace_brand_id = '${KAYA}'`)) === kv0 + 1, '…lands proposed (the book’s rule), and Kaya Paints is a vendor now')
      ok(/is proposed for the Price book, and Kaya Paints is in your vendors/.test(await waitSnack(p, /proposed/)), '…said in one line')   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
      as('michelle')
      await go(p, `/marketplace/${KAYA}`, 1400)
      ok(/Proposed for the Price book by Germaine/.test(await p.getByTestId('brand-product').first().innerText()) && await p.getByTestId('brand-product').first().getByTestId('product-add').count() === 0, 'another Designer sees it proposed by Germaine — no second Add')   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
      as('huimin')
      await go(p, `/marketplace/${KAYA}`, 1400)
      ok(await p.getByTestId('brand-product').first().getByTestId('product-open').isVisible(), 'an Admin opens the proposal (the book shows every proposal to Owners and Admins)')
      as('dane')
      /* it reaches a client's Choices — From the Price book */
      const AISHA_P = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Aisha Rahman' and p.deleted_at is null`)
      await go(p, `/projects/${AISHA_P}/choices`, 2200)
      const card = p.locator('[data-testid="choice-card"]').first()
      if (await card.locator('[data-testid="choice-add-option"]').count()) {
        await card.locator('[data-testid="choice-add-option"]').click(); await settle(p, 400)
        await p.locator('[data-testid="choice-source-price_book"]').click(); await settle(p, 1500)
        const row = p.locator('[data-testid="option-source-row"]', { hasText: 'Oslo 3-seater sofa' })
        ok(await row.count() === 1 && /Oak & Linen/.test(await row.innerText()), 'a client’s Choices › Add an option › From the Price book offers it, under its vendor')
        await p.keyboard.press('Escape'); await settle(p, 500)
      } else ok(false, 'Aisha Rahman’s Draft choice takes an option')
    }

    // ── 7 · Maison AI, ⌘K ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Maison AI answers from the records here; ⌘K finds a brand and a deal')
      await go(p, '/marketplace', 1400)
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      const sheet = p.locator('[role="dialog"]').filter({ hasText: 'Which deals end soonest?' }).last()
      ok(await sheet.count() === 1, 'the sheet offers the page’s suggestions')
      await sheet.getByRole('button', { name: 'Which deals end soonest?' }).first().click(); await settle(p, 800)
      const soonest = one(`select d.title from marketplace_deals d join marketplace_brands b on b.id = d.brand_id where d.removed_at is null and b.removed_at is null and d.ends_at >= ${now} order by d.ends_at limit 1`)
      const ans = p.locator('[role="dialog"]').last()
      ok((await ans.innerText()).includes(soonest.title), '“Which deals end soonest?” answers from the records', soonest.title)
      await p.getByTestId('maison-row').filter({ hasText: soonest.title }).first().click(); await settle(p, 1200)
      ok(await p.getByTestId('deal-dialog').isVisible() && new URL(p.url()).searchParams.get('deal') !== null, '…its row opens the deal')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* a brand's page: Maison AI proposes the page's own press, and the confirm runs it */
      const TESSERA = 'mkb-4105'
      await go(p, `/marketplace/${TESSERA}`, 1400)
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      await p.locator('[role="dialog"]').last().getByRole('button', { name: 'Add Tessera Tile House to my vendors' }).first().click(); await settle(p, 800)
      const plan = p.locator('[role="dialog"]').last()
      ok(/joins Company › Finance › Vendors/.test(await plan.innerText()), 'on a brand’s page Maison AI proposes Add to my vendors, saying what it will do')
      await plan.getByRole('button', { name: 'Add to my vendors' }).click()
      await waitFor(() => Number(sql(`select count(*) from vendors where marketplace_brand_id = '${TESSERA}'`)) === 1)
      ok(Number(sql(`select count(*) from vendors where marketplace_brand_id = '${TESSERA}'`)) === 1, '…its one button runs the page’s own press: Tessera Tile House is a vendor')
      await p.keyboard.press('Escape'); await settle(p, 400)
      await go(p, '/leads', 1200)
      const panel = p.getByRole('dialog', { name: 'Search' }), input = p.getByRole('combobox', { name: 'Search the studio' })
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await input.fill('oak & linen'); await settle(p, 1500)
      const group = panel.getByRole('group', { name: 'Marketplace' })
      ok(await group.isVisible() && /Oak & Linen/.test(await group.getByRole('option').first().innerText()), '⌘K finds the brand under Marketplace')
      await group.getByRole('option').first().click(); await settle(p, 2200)
      ok(new URL(p.url()).pathname === `/marketplace/${OAK}`, '…and opens its page')
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await input.fill('fourth free'); await settle(p, 1500)
      await panel.getByRole('group', { name: 'Marketplace' }).getByRole('option').first().click(); await settle(p, 1200)
      await p.getByTestId('deal-dialog').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {})
      ok(new URL(p.url()).pathname === '/marketplace' && await p.getByTestId('deal-dialog').isVisible() && await p.getByRole('dialog', { name: 'Buy three pendants, get the fourth free' }).count() === 1, '…a deal opens on the Marketplace, in its dialog', p.url())
      await p.keyboard.press('Escape'); await settle(p, 500)
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await input.fill('marketplace'); await settle(p, 1200)
      ok(await panel.getByRole('group', { name: 'Go to' }).getByRole('option', { name: /Marketplace/ }).count() >= 1, '…and Go to offers the Marketplace')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await p.keyboard.press('Escape'); await settle(p, 400)
    }

    // ── 8 · who, and what isn't there ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · Accounting has no Marketplace; a brand the feed withdrew answers its own notice')
      as('priya')
      await go(p, '/company/finance', 1600)
      ok(await p.locator('nav[aria-label="Workspace"] a[href="/marketplace"]').count() === 0, 'Accounting’s rail leaves the Marketplace out (1.0: owner · admin · id)')
      await go(p, '/marketplace', 1400)
      ok(await p.getByTestId('access-gate').isVisible(), '…and its address is the house gate')
      as('dane')
      sql(`update marketplace_brands set removed_at = ${now} where id = '${OAK}'`)
      await go(p, `/marketplace/${OAK}`, 1400)
      ok(await p.getByTestId('brand-not-found').isVisible() && /This brand isn’t on the Marketplace any more/.test(await p.getByTestId('brand-not-found').innerText()), 'a brand the feed withdrew: its own notice inside the shell, never a bare 404')
      ok(Number(sql(`select count(*) from vendors where marketplace_brand_id = '${OAK}'`)) <= 1 && Number(sql(`select count(*) from price_book_items where marketplace_product_id = '${OSLO}' and deleted_at is null`)) <= 1, '…what came from it stays (a vendor, a Price book item)')
      await p.getByTestId('brand-not-found-back').click(); await settle(p, 1600)
      ok(new URL(p.url()).pathname === '/marketplace' && await p.locator(`[data-brand="${OAK}"]`).count() === 0, '…Back to the Marketplace, where it no longer is')
      sql(`update marketplace_brands set removed_at = NULL where id = '${OAK}'`)
      await go(p, '/marketplace/mkb-nope', 1200)
      ok(await p.getByTestId('brand-not-found').isVisible(), 'an address that never was: the same notice')
    }

    // ── 9 · phones, tablets, ghosts ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · 390 · 320 · 768 touch — one-row bar, two cards a row, sheets, no sideways scroll; the ghosts')
      const mc = await context(phoneOpts())
      const m = await page(mc, '390')
      await go(m, '/marketplace', 1600)
      ok(await sideways(m) <= 0, '390: no sideways scroll on the Marketplace')
      const bar = await m.getByTestId('market-categories').evaluate((e) => e.closest('[class*="__bar"]').getBoundingClientRect().height)   // (the calm UI build 2026-10-27, a deliberate change) — the views are the tabs above the bar now
      ok(bar <= 52, '390: the category, the search glyph and the sort on one row', `${bar}px`)
      const xs = await m.getByTestId('market-brand').evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().left)))
      ok(new Set(xs).size === 2, '390: two cards a row', xs.join(','))
      await m.getByTestId('market-brand').first().getByRole('button', { name: /More options/ }).tap(); await settle(m, 600)
      const sheetMenu = await m.locator('[role="menu"]').filter({ hasText: 'WhatsApp Oak & Linen' }).evaluate((e) => Math.round(e.getBoundingClientRect().bottom) - innerHeight).catch(() => null)
      ok(sheetMenu !== null && Math.abs(sheetMenu) <= 2, '390: a card’s ⋮ is a bottom sheet', String(sheetMenu))
      await m.keyboard.press('Escape'); await settle(m, 400)
      await shot(m, '06-home-390', true)
      await go(m, `/marketplace?view=deals&deal=${SOFA_DEAL}`, 1600)
      const sheetBox = await m.getByTestId('deal-dialog').evaluate((e) => { const r = e.closest('[role="dialog"]').getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: innerHeight } })
      ok(Math.abs(sheetBox.bottom - sheetBox.h) <= 2, '390: the deal is a bottom sheet', JSON.stringify(sheetBox))
      await shot(m, '07-deal-390')
      await m.keyboard.press('Escape'); await settle(m, 400)
      ok(await sideways(m) <= 0, '390: Deals has no sideways scroll')
      await go(m, `/marketplace/${OAK}`, 1600)
      ok(await sideways(m) <= 0, '390: a brand’s page has no sideways scroll')
      await shot(m, '08-brand-390', true)
      /* the More sheet's row */
      await go(m, '/leads', 1400)
      await m.locator('nav[aria-label="Primary"] button[aria-haspopup="dialog"]').tap(); await settle(m, 700)
      ok(await m.getByRole('dialog', { name: 'More' }).locator('a[href="/marketplace"]').count() === 1, '390: More › Marketplace is a live row')
      await m.keyboard.press('Escape')
      await mc.close()
      for (const w of [320]) {
        const sc = await context(phoneOpts(w, 640)); const s = await page(sc, String(w))
        for (const u of ['/marketplace', '/marketplace?view=deals', `/marketplace/${OAK}`]) { await go(s, u, 1400); ok(await sideways(s) <= 0, `${w}: no sideways scroll on ${u}`) }
        await sc.close()
      }
      const tc = await context(phoneOpts(768, 1024)); const t = await page(tc, '768')
      for (const u of ['/marketplace', `/marketplace/${OAK}`]) { await go(t, u, 1500); ok(await sideways(t) <= 0, `768 touch: no sideways scroll on ${u}`) }
      await shot(t, '09-brand-768', true)
      await go(t, '/marketplace', 1400); await shot(t, '10-home-768')
      await tc.close()
      /* the ghosts draw the pages they stand for */
      for (const [url, o, tag] of [['/marketplace', opts(), '1440'], ['/marketplace', phoneOpts(), '390'], [`/marketplace/${OAK}`, opts(), '1440'], [`/marketplace/${OAK}`, phoneOpts(), '390'], ['/marketplace?view=deals', opts(), '1440']]) {
        const r = await measure(b, o, url, ['marketplace.', 'brand-page.', 'quote-templates-gallery.card', 'quote-templates-gallery.thumb', 'card.card', 'card.head'], 16)
        if (r.none) { ok(false, `ghost of ${url} at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 4, `the ghost of ${url} at ${tag} lands where the page does`, off.slice(0, 4).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
        ok(r.words.length === 0, `…its words are the page’s at ${tag}`, r.words.slice(0, 3).join(' · '))
      }
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    ok(stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'the leads’ stages and stage logs are as found')
    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
