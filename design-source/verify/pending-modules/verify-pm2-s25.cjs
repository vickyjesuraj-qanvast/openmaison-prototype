// Pending modules, step S25 · Market Insights (the owner's "build all of them but one after the other", 2026-10-11; survey key
// studio:market-insights — 1.0's /tools/market-insights and /tools/market-insights/[id], read from the platform's `market_insights` table that
// Platform admin's CMS writes). Each item asserted as the rule it builds, never another round's count:
//  - one home: Tools › Market Insights is live (no Soon), lights Tools, and is the house gate for Accounting (1.0: owner · admin · id)
//  - the list: 1.0's category chips with their counts from the records (a category with none left out), its search over the title, the first
//    lines and the tags, its featured article on All with no search, every article newest first; the address keeps the view and Back
//    returns to it; nothing found says so with Clear All; "/" reaches the search
//  - honest data: the demo's articles are samples and say so (the list's note, each card, each article); every chart's figures are marked
//    illustrative; a draft never reaches the studio; an article the editors take down answers its own notice; no articles = the empty card
//  - an article: its category, title, first lines, byline, cover and body read from the record (sections, a quote, a table, pictures, charts),
//    charts drawn on the house palette with Show the numbers, a line's readout by pointer and keys; links in the app open with the way back;
//    its tags open the list searched; More from Market Insights reads the same category first
//  - Maison AI answers from the records here and acts; ⌘K finds an article and offers the page; 390 · 320 · 768 touch with no sideways scroll
//    against screen.width; the ghosts draw the pages they stand for; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s25.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s25')
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

const WHOLE = ['market_insights', 'maison_questions', 'notifications']
const LABEL = { trends: 'Trends', reports: 'Reports', 'case-studies': 'Case Studies', 'industry-news': 'Industry News' }
const tagsOf = (r) => { try { return JSON.parse(r.tags) } catch { return [] } }

/* The ghost-vs-page measure (the S17 / S23 / S24 probes'): in the held reveal every element carrying a page module's class in both, index by
   index after aligning the lists — the first screen only — and every Words sentence the ghost sets in a page class against that page's. */
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
      if (!ks.some((k) => (pageText.get(k) || []).some((x) => x.includes(t)))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words }
  }, { blocks, max })
  await c.close()
  return out
}

/* The same measure for a press from the list: the article's answer is held at the server so its loading ghost stays up (opened from a card,
   it knows the article's words — components/market-insights/peek.ts), its positions are read, then the page's once it has landed. */
async function measureNav(b, opts, from, pick, blocks, max = 30) {
  const c = await b.newContext(opts)
  const p = await c.newPage()
  await p.goto(BASE + from, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  let release = () => {}
  const gate = new Promise((r) => { release = r })
  await p.route(/\/market-insights\/mi-[^/?]+/, async (route) => {
    const h = route.request().headers()
    if (route.request().resourceType() === 'document' || h['next-router-prefetch']) return route.continue()
    await gate; return route.continue()
  })
  const read = (root) => p.evaluate(({ root, blocks, max }) => {
    const el = document.querySelector(root); if (!el) return null
    const keyOf = (e) => [...e.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal|tab-ghosts)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const out = {}
    for (const e of el.querySelectorAll('*')) {
      const ks = keyOf(e); if (!ks.length) continue
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue
      for (const k of ks) { if (!blocks.some((x) => (x.endsWith('.') ? k.startsWith(x) : k === x))) continue; (out[k] ||= []).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
    }
    return out
  }, { root, blocks, max })
  await p.locator(pick).first().click()
  await p.waitForSelector('[role="status"][aria-label="Loading the article"]', { timeout: 6000 }).catch(() => {})
  await p.waitForTimeout(300)
  const g = await read('[role="status"][aria-label="Loading the article"]')
  release()
  await p.waitForSelector('[data-testid="insight-article"]', { timeout: 10000 }).catch(() => {})
  await p.waitForTimeout(1800)
  const q = await read('[data-testid="insight-article"]')
  await c.close()
  if (!g || !q) return { none: true }
  const rows = []
  for (const [k, gs] of Object.entries(g)) {
    const ps = q[k]; if (!ps) continue
    for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i]; if (!pp || a[1] > (opts.viewport?.height ?? 1024)) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0] }) }
  }
  return { rows }
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const order = (p) => p.getByTestId('insights-list').getByTestId('insight-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-article')))

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
    const ctx = await b.newContext(opts())
    const p = await page(ctx, '1440')
    await go(p, '/leads', 2000)   // open one page and wait before reading the record (the habit after S08)
    const live = () => json(`select id, title, excerpt, category, tags, featured, sample, read_minutes, published_at, content, cover from market_insights where removed_at is null order by published_at desc`)
    const arts = live()
    ok(arts.length >= 4 && arts.every((a) => a.sample === 1), 'the demo’s articles are on record (repair R142) — and every one is a sample', `${arts.length} articles`)
    const featured = arts.filter((a) => a.featured === 1).sort((x, y) => y.published_at - x.published_at)[0]
    ok(!!featured, 'one of them is featured')

    // ── 1 · one home: Tools › Market Insights ────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Tools › Market Insights is live; the list, its categories, its featured article, newest first')
      await p.locator('nav[aria-label="Workspace"] button[aria-label="Tools"], nav[aria-label="Workspace"] button[aria-label^="Tools ("]').first().click(); await settle(p, 500)
      const tools = p.locator('[role="menu"][aria-label="Tools"]')
      const tile = tools.locator('[aria-label="Market Insights"]')
      ok(await tile.count() === 1 && await tile.getAttribute('data-soon') === null && await tools.locator('[data-soon]').count() === 0, 'Tools › Market Insights is live — no Soon, and no tile is Soon any more')
      await tile.click(); await p.waitForURL(/\/market-insights/, { timeout: 8000 }).catch(() => {}); await settle(p, 1400)
      ok(new URL(p.url()).pathname === '/market-insights', '…and opens Market Insights')
      ok(await p.locator('nav[aria-label="Workspace"] button[aria-haspopup="menu"][aria-current="page"]').count() === 1, 'the rail lights Tools on it')
      /* the categories: All + each with an article, its count from the record; a category with none is left out */
      const chips = await p.getByTestId('insights-categories').getByRole('radio').allInnerTexts()
      const want1 = [`All · ${arts.length}`, ...Object.keys(LABEL).filter((k) => arts.some((a) => a.category === k)).map((k) => `${LABEL[k]} · ${arts.filter((a) => a.category === k).length}`)]
      ok(JSON.stringify(chips.map((c) => c.trim())) === JSON.stringify(want1), 'the category chips: All and each category with its count from the records (1.0’s four, in its order)', chips.join(' | '))
      ok(await p.getByTestId('insights-categories').getByRole('radio', { checked: true }).innerText().then((t) => t.startsWith('All')), '…All is picked')
      ok(await p.getByTestId('insights-sample-note').isVisible() && /sample articles written for the demo/i.test(await p.getByTestId('insights-sample-note').innerText()), 'the list says its articles are samples written for the demo, their figures illustrative')
      const feat = p.getByTestId('insight-featured')
      ok(await feat.count() === 1 && await feat.getAttribute('data-article') === featured.id && /Featured/.test(await feat.innerText()), '1.0’s featured article: one wide card on All with no search — the newest the editors marked featured', featured.title)
      const rest = arts.filter((a) => a.id !== featured.id).map((a) => a.id)
      ok(JSON.stringify(await order(p)) === JSON.stringify(rest), '…and every other article under it, newest first')
      const eyebrows = await p.getByTestId('insights-list').getByTestId('insight-eyebrow').allInnerTexts()
      ok(eyebrows.length === rest.length && eyebrows.every((e, i) => e.toLowerCase() === `${LABEL[arts.find((a) => a.id === rest[i]).category]} · sample`.toLowerCase()), 'each card names its category and that it is a sample', eyebrows.join(' | '))
      const card0 = arts.find((a) => a.id === rest[0])
      const cardText = await p.locator(`[data-article="${card0.id}"]`).first().innerText()
      ok(cardText.includes(card0.title) && /min read/.test(cardText), 'a card carries the article’s title, when it came out and how long it reads')
      ok(/Articles come from OpenMaison’s editors/.test(await p.getByTestId('market-insights').innerText()), 'the source line says where articles come from')
      await shot(p, '01-list-1440', true)
      /* a category: only its articles, the featured card steps aside, the address keeps it */
      await p.getByTestId('insights-categories').getByRole('radio', { name: /^Reports/ }).click(); await settle(p, 500)
      const reports = arts.filter((a) => a.category === 'reports').map((a) => a.id)
      ok(JSON.stringify(await order(p)) === JSON.stringify(reports) && await p.getByTestId('insight-featured').count() === 0, 'Reports lists only the reports, newest first — the featured card is All’s')
      ok(new URL(p.url()).searchParams.get('category') === 'reports', '…and the address says so')
      await p.locator(`[data-article="${reports[0]}"] a`).first().click(); await p.waitForURL(/\/market-insights\/mi-/, { timeout: 8000 }); await settle(p, 1400)
      await p.locator('a[data-kb="back"]').click(); await p.waitForURL(/\/market-insights\?/, { timeout: 8000 }).catch(() => {}); await settle(p, 1200)
      ok(new URL(p.url()).searchParams.get('category') === 'reports' && /^Reports/.test(await p.getByTestId('insights-categories').getByRole('radio', { checked: true }).innerText()), 'Back from an article returns to the same category', p.url().replace(BASE, ''))
      await p.getByTestId('insights-categories').getByRole('radio', { name: /^All/ }).click(); await settle(p, 500)
      ok(!new URL(p.url()).searchParams.get('category') && await p.getByTestId('insight-featured').count() === 1, 'All again: the featured card is back')
    }

    // ── 2 · the search ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · The search: 1.0’s words (title, first lines, tags), nothing found, "/", a tag’s search')
      await go(p, '/market-insights', 1200)
      await p.locator('body').click({ position: { x: 700, y: 30 } }).catch(() => {})
      await p.keyboard.press('/'); await settle(p, 400)
      ok(await p.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Search articles', '“/” focuses the page’s search')
      const term = 'resale'
      await p.keyboard.type(term); await settle(p, 700)
      const hits = arts.filter((a) => [a.title, a.excerpt ?? '', tagsOf(a).join(' ')].some((f) => f.toLowerCase().includes(term))).map((a) => a.id)
      ok(JSON.stringify(await order(p)) === JSON.stringify(hits) && await p.getByTestId('insight-featured').count() === 0, 'a search finds what its words name in the title, the first lines or the tags — every match a card, the featured one too', `${hits.length} hits`)
      ok(new URL(p.url()).searchParams.get('q') === term, '…and the address keeps it')
      await p.keyboard.type(' zzz'); await settle(p, 700)
      ok(await p.getByTestId('search-empty').isVisible(), 'a search that finds nothing: the house “No results found”')
      ok(await p.locator('[data-kb-list="article"] [data-kb-row]').count() === 0, '…and no card is left under it')
      await p.getByTestId('search-empty').getByRole('button', { name: 'Clear All' }).click(); await settle(p, 600)
      ok(await p.getByTestId('insight-featured').count() === 1 && (await order(p)).length === arts.length - 1 && !new URL(p.url()).searchParams.get('q'), '…Clear All brings every article back')
      /* a tag on an article opens the list searched by it */
      const tagged = arts.find((a) => tagsOf(a).length > 0)
      const tag = tagsOf(tagged)[0]
      await go(p, `/market-insights/${tagged.id}`, 1400)
      await p.getByTestId('insight-tags').getByRole('link', { name: `Articles about ${tag}` }).click(); await p.waitForURL(/\/market-insights\?q=/, { timeout: 8000 }); await settle(p, 1200)
      const tagHits = arts.filter((a) => [a.title, a.excerpt ?? '', tagsOf(a).join(' ')].some((f) => f.toLowerCase().includes(tag.toLowerCase()))).map((a) => a.id)
      ok(JSON.stringify(await order(p)) === JSON.stringify(tagHits) && await p.locator('input[aria-label="Search articles"]').first().inputValue() === tag, `a tag (“${tag}”) opens Market Insights searched by it`)
    }

    // ── 3 · an article ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · An article: header, byline, the sample note, the body from the record, charts, links, tags, read next')
      await go(p, '/market-insights', 1200)
      await p.getByTestId('insight-featured').click(); await p.waitForURL(/\/market-insights\/mi-/, { timeout: 8000 }); await settle(p, 1500)
      const u = new URL(p.url())
      ok(u.pathname === `/market-insights/${featured.id}` && u.searchParams.get('from') === '/market-insights', 'the featured card opens its article, carrying the way back')
      const head = p.locator('header').filter({ has: p.locator('a[data-kb="back"]') }).first()
      ok(/Market Insights/.test(await head.innerText()) && (await head.locator('h1').innerText()).trim() === featured.title && /FEATURED/i.test(await head.innerText()), 'the L2 header: Market Insights / its title, Featured')
      ok((await p.getByTestId('insight-article-eyebrow').innerText()).toLowerCase() === `${LABEL[featured.category]} · sample`.toLowerCase(), 'its category and that it is a sample')
      ok(/min read/.test(await p.getByTestId('insight-article-when').innerText()) && (await p.getByTestId('insight-article-when').innerText()).includes(String(featured.read_minutes)), 'the byline: when it came out and how long it reads (the record’s minutes)')
      ok(/sample article written for the demo/i.test(await p.getByTestId('insight-sample-note').innerText()) && /illustrative/.test(await p.getByTestId('insight-sample-note').innerText()), 'the sample note on the article: written for the demo, its figures illustrative — not market data')
      const heads = (featured.content.match(/^#{1,2}\s+.+$/gm) || []).map((l) => l.replace(/^#+\s+/, '').trim())
      const shown = await p.locator('[data-testid="insight-section"]').evaluateAll((els) => els.filter((e) => e.tagName === 'H2').map((e) => e.textContent.trim()))
      ok(JSON.stringify(shown) === JSON.stringify(heads), 'its sections are the record’s headings, in order', shown.join(' | '))
      const charts = (featured.content.match(/```chart/g) || []).length
      ok(await p.getByTestId('insight-chart').count() === charts && charts > 0, 'each chart block in the record is a chart on the page')
      ok((await p.getByTestId('insight-chart-source').allInnerTexts()).every((t) => /Illustrative figures for the demo/.test(t)), '…each chart’s source says its figures are illustrative')
      ok(await p.locator('blockquote').count() >= 1 && await p.getByTestId('insight-figure').count() >= 1, 'a quote and a picture with its words under it')
      const lis = await p.getByTestId('insight-body').locator('ul > li').first().evaluate((e) => getComputedStyle(e).listStyleType + '|' + getComputedStyle(e.parentElement).listStyleType)
      ok(/disc/.test(lis), 'a list keeps its markers', lis)
      /* the line's readout — by pointer and by keys */
      const plot = p.getByTestId('insight-chart').first().getByTestId('insight-chart-plot')
      await plot.scrollIntoViewIfNeeded(); const box = await plot.boundingBox()
      await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5); await settle(p, 300)
      ok(await p.getByTestId('insight-chart-readout').isVisible(), 'a line chart’s crosshair reads the point under the pointer')
      await p.mouse.move(10, 10); await settle(p, 200)
      await plot.focus(); await p.keyboard.press('ArrowLeft'); await settle(p, 200)
      const read = await p.getByTestId('insight-chart-readout').innerText().catch(() => '')
      ok(read.length > 0, '…and ← → read each point from the keyboard', read.replace(/\s+/g, ' '))
      await p.keyboard.press('Tab')
      /* Show the numbers */
      const chart = p.getByTestId('insight-chart').first()
      await chart.getByTestId('insight-chart-numbers').click(); await settle(p, 300)
      const tableRows = await chart.getByTestId('insight-chart-table').locator('tbody tr').count()
      const spec = JSON.parse(featured.content.split('```chart')[1].split('```')[0])
      ok(tableRows === spec.data.length && (await chart.getByTestId('insight-chart-numbers').getAttribute('aria-expanded')) === 'true', 'Show the numbers: the chart’s figures as a table, one row each', `${tableRows} rows`)
      await chart.getByTestId('insight-chart-numbers').click(); await settle(p, 200)
      ok(await chart.getByTestId('insight-chart-table').count() === 0, '…Hide the numbers puts it away')
      await shot(p, '02-article-1440', true)
      /* a link inside the app opens in place, with the way back */
      const link = p.getByTestId('insight-link').first()
      const href = await link.getAttribute('href')
      ok(/from=%2Fmarket-insights%2F/.test(href), 'a link inside the app carries the way back to the article', href)
      await link.click(); await settle(p, 2200)
      const bk = p.locator('a[data-kb="back"]').first()
      ok(/Back to Market Insights/.test(await bk.getAttribute('aria-label') ?? ''), '…and the page it opens names Market Insights as its way back', await bk.getAttribute('aria-label'))
      await bk.click(); await p.waitForURL(new RegExp(`/market-insights/${featured.id}`), { timeout: 8000 }).catch(() => {}); await settle(p, 1200)
      ok(new URL(p.url()).pathname === `/market-insights/${featured.id}`, '…which returns to the article')
      /* read next: the same category first */
      const more = await p.getByTestId('insight-more').getByTestId('insight-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-article')))
      const others = arts.filter((a) => a.id !== featured.id)
      const wantMore = [...others.filter((a) => a.category === featured.category), ...others.filter((a) => a.category !== featured.category)].slice(0, 3).map((a) => a.id)
      ok(JSON.stringify(more) === JSON.stringify(wantMore), 'More from Market Insights: the same category first, then the newest of the rest')
      /* a second article: bars, a table, and the part-to-whole bar */
      const bars = arts.find((a) => /"type":\s*"bar"/.test(a.content) && /\|---/.test(a.content))
      await go(p, `/market-insights/${bars.id}`, 1500)
      ok(await p.getByTestId('insight-table').count() >= 1 && await p.getByTestId('insight-table').locator('tbody tr').count() === bars.content.split('\n').filter((l) => /^\|/.test(l)).length - 2, 'a table in the record is a table on the page, every row')
      ok(await p.locator('[data-testid="insight-chart"][data-kind="bar"] [data-testid="insight-bar"]').count() > 0, 'bars drawn, each with its value')
      const donut = arts.find((a) => /"type":\s*"donut"/.test(a.content))
      if (donut) {
        await go(p, `/market-insights/${donut.id}`, 1500)
        const share = p.locator('[data-testid="insight-chart"][data-kind="donut"]')
        const legend = await share.locator('li').allInnerTexts()
        ok(await share.count() === 1 && legend.length >= 2 && legend.length <= 5 && legend.every((l) => /%/.test(l)), '1.0’s donut: the house part-to-whole bar — at most four named and Other, each with its share', legend.join(' | ').replace(/\s+/g, ' '))
        ok(await p.locator('[data-testid="insight-chart"][data-kind="stacked-bar"]').count() === (/"type":\s*"stacked-bar"/.test(donut.content) ? 1 : 0), 'a stacked bar per row, its total at the end')
        await shot(p, '03-charts-1440', true)
      }
    }

    // ── 4 · honest data: a draft, an article taken down, an empty feed ──────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · A draft never reaches the studio; an article taken down says so; no articles = the empty card')
      ok(Number(sql(`select count(*) from market_insights where feed_ref = 'demo-kitchen-draft'`)) === 0, 'the editors’ draft never reaches the studio’s copy (1.0 listed published articles only)')
      await go(p, '/market-insights/mi-demo-kitchen-draft', 1200)
      ok(await p.getByTestId('article-not-found').isVisible(), '…its address is the notice, not the draft')
      const gone = arts[arts.length - 1]
      sql(`update market_insights set removed_at = ${Date.now()} where id = '${gone.id}'`)
      await go(p, `/market-insights/${gone.id}`, 1300)
      ok(await p.getByTestId('article-not-found').isVisible() && /This article isn’t in Market Insights any more/.test(await p.getByTestId('article-not-found').innerText()), 'an article the editors took down: its own notice inside the shell')
      await shot(p, '04-not-found-1440')
      await p.getByTestId('article-not-found-back').click(); await p.waitForURL(/\/market-insights$/, { timeout: 8000 }).catch(() => {}); await settle(p, 1400)
      ok(new URL(p.url()).pathname === '/market-insights' && await p.locator(`[data-article="${gone.id}"]`).count() === 0, '…Back to Market Insights, where it no longer is')
      /* a category whose only article is taken down is left out of the chips */
      const lone = Object.keys(LABEL).find((k) => arts.filter((a) => a.category === k).length === 1)
      if (lone) {
        const loneId = arts.find((a) => a.category === lone).id
        sql(`update market_insights set removed_at = ${Date.now()} where id = '${loneId}'`)
        await go(p, '/market-insights', 1200)
        ok(await p.getByTestId('insights-categories').getByRole('radio', { name: new RegExp(`^${LABEL[lone]}`) }).count() === 0, `a category with no article is left out (${LABEL[lone]})`)
        sql(`update market_insights set removed_at = NULL where id = '${loneId}'`)
      }
      /* an article the editors wrote (not a demo sample) says nothing of the kind; with no sample left, the list's note goes too */
      sql(`update market_insights set sample = 0`)
      await go(p, '/market-insights', 1300)
      ok(await p.getByTestId('insights-sample-note').count() === 0 && (await p.getByTestId('insight-eyebrow').allInnerTexts()).every((e) => !/sample/i.test(e)), 'real articles: no sample note, no “Sample” on the cards — shown only when it applies')
      await go(p, `/market-insights/${featured.id}`, 1300)
      ok(await p.getByTestId('insight-sample-note').count() === 0 && !/sample/i.test(await p.getByTestId('insight-article-eyebrow').innerText()), '…nor on the article')
      sql(`update market_insights set sample = 1`)
      /* a long feed: twenty-four at a time, then Show more — the address keeps how many are shown */
      const t0 = Date.now() - 400 * 86400000
      let ins = 'BEGIN;\n'
      for (let i = 0; i < 30; i++) ins += `INSERT INTO market_insights (id, title, excerpt, content, category, cover, tags, author, read_minutes, featured, sample, published_at, feed_ref, updated_at) VALUES ('mi-probe-${i}', 'Probe article ${i}', 'Words', '## A section', 'trends', NULL, '[]', 'OpenMaison Editors', 3, 0, 1, ${t0 + i * 1000}, 'probe-${i}', ${t0});\n`
      runSql(ins + 'COMMIT;\n')
      await go(p, '/market-insights', 1400)
      const total = Number(sql(`select count(*) from market_insights where removed_at is null`)) - 1   // every live article but the featured one
      ok(/Showing 24 of/.test(await p.getByTestId('insights-shown').innerText()) && (await order(p)).length === 24, 'a long feed shows twenty-four, then “Showing 24 of n articles”', await p.getByTestId('insights-shown').innerText())
      await p.getByTestId('insights-more').click(); await settle(p, 600)
      ok((await order(p)).length === total && new URL(p.url()).searchParams.get('shown') === '48' && await p.getByTestId('insights-more').count() === 0, '…Show more shows the rest, and the address keeps it')
      ok(await p.locator('[data-kb-list="article"] [data-kb-row]').count() === total && await p.locator('[data-kb-list="article"] [data-kb-open]').count() === total, 'the cards are a walkable list (the house keys’ DOM contract)')
      const noCover = p.locator('[data-article="mi-probe-0"]')
      ok(await noCover.locator('img').count() === 0 && await noCover.locator('.msr, .mso, [class*="icon"]').count() >= 1, 'an article with no cover shows its category’s glyph in the well (1.0’s fallback)')
      runSql(`DELETE FROM market_insights WHERE id LIKE 'mi-probe-%';\n`)
      /* a cover that won't load: the category's glyph — on a card, and on the article (its picture drawn by the server, failed before the page woke) */
      const pic = one(`select id, cover from market_insights where id = '${featured.id}'`)
      sql(`update market_insights set cover = '/market-insights/no-such-picture.jpg' where id = '${featured.id}'`)
      await go(p, '/market-insights?q=' + encodeURIComponent(featured.title.split(' ')[0]), 1400)
      ok(await p.locator(`[data-article="${featured.id}"] [data-testid="insight-cover-empty"]`).count() === 1, 'a cover that won’t load shows its category’s glyph on the card')
      await go(p, `/market-insights/${featured.id}`, 1400)
      ok(await p.getByTestId('insight-article').locator('[data-testid="insight-cover-empty"]').count() >= 1 && await p.getByTestId('insight-article').locator('img[src="/market-insights/no-such-picture.jpg"]').count() === 0, '…and on the article, in the cover’s well')
      sql(`update market_insights set cover = '${pic.cover}' where id = '${featured.id}'`)
      sql(`update market_insights set removed_at = ${Date.now()} where removed_at is null`)
      await go(p, '/market-insights', 1300)
      ok(await p.getByTestId('insights-empty').isVisible() && await p.getByTestId('insights-categories').count() === 0 && await p.locator('input[aria-label="Search articles"]').count() === 0, 'no articles: the empty card, with nothing to press (no chips, no search)')
      await shot(p, '05-empty-1440')
      sql(`update market_insights set removed_at = NULL`)
    }

    // ── 5 · Maison AI, ⌘K ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Maison AI answers from the records and acts; ⌘K finds an article and offers the page')
      await go(p, '/market-insights', 1400)
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      const sheet = p.locator('[role="dialog"]').filter({ hasText: 'What’s new in Market Insights?' }).last()
      ok(await sheet.count() === 1, 'the sheet offers the page’s suggestions')
      await sheet.getByRole('button', { name: 'What’s new in Market Insights?' }).first().click(); await settle(p, 800)
      const rows = await p.getByTestId('maison-row').allInnerTexts()
      ok(rows.length === Math.min(3, arts.length) && rows[0].includes(arts[0].title), '“What’s new?” answers with the newest articles from the record', rows[0])
      await p.getByTestId('maison-row').first().click(); await p.waitForURL(/\/market-insights\/mi-/, { timeout: 8000 }).catch(() => {}); await settle(p, 1400)
      ok(new URL(p.url()).pathname === `/market-insights/${arts[0].id}`, '…its row opens the article')
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      await p.locator('[role="dialog"]').last().getByRole('button', { name: 'What does this article cover?' }).first().click(); await settle(p, 800)
      const secs = await p.getByTestId('maison-row').allInnerTexts()
      const heads = (arts[0].content.match(/^#{1,2}\s+.+$/gm) || []).map((l) => l.replace(/^#+\s+/, '').trim())
      ok(JSON.stringify(secs.map((s) => s.trim())) === JSON.stringify(heads), 'on an article, “What does this article cover?” lists its sections', secs.join(' | '))
      const last = heads[heads.length - 1]
      await p.getByTestId('maison-row').filter({ hasText: last }).first().click(); await settle(p, 1200)
      const top = await p.locator('[data-testid="insight-section"]').filter({ hasText: last }).first().evaluate((e) => Math.round(e.getBoundingClientRect().top))
      ok(top >= 0 && top < 400, '…a section’s row scrolls to it', `${top}px`)
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* acts: Show me the … picks the category */
      await go(p, '/market-insights', 1300)
      await p.locator('button[aria-label="Maison AI"]').first().click(); await settle(p, 700)
      const act = p.locator('[role="dialog"]').last().getByRole('button', { name: /^Show me the / }).first()
      const label = (await act.innerText()).trim()
      await act.click(); await settle(p, 900)
      const picked = (await p.getByTestId('insights-categories').getByRole('radio', { checked: true }).innerText()).toLowerCase()
      ok(picked.startsWith(label.replace(/^Show me the /, '').toLowerCase()), `“${label}” picks that category on the page`, picked)
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* ⌘K */
      await go(p, '/leads', 1200)
      const panel = p.getByRole('dialog', { name: 'Search' }), input = p.getByRole('combobox', { name: 'Search the studio' })
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await input.fill('benchmark'); await settle(p, 1500)
      const group = panel.getByRole('group', { name: 'Market Insights' })
      const bm = arts.find((a) => /benchmark/i.test(a.title))
      ok(await group.isVisible() && (await group.getByRole('option').first().innerText()).includes(bm.title), '⌘K finds an article under Market Insights')
      await group.getByRole('option').first().click(); await settle(p, 2200)
      ok(new URL(p.url()).pathname === `/market-insights/${bm.id}`, '…and opens it')
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await input.fill('market insights'); await settle(p, 1200)
      ok(await panel.getByRole('group', { name: 'Go to' }).getByRole('option', { name: /Market Insights/ }).count() >= 1, '…and Go to offers Market Insights')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await p.keyboard.press('Escape'); await settle(p, 300)
    }

    // ── 6 · who ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Designers read it; Accounting has the house gate; ⌘K leaves articles out for Accounting')
      as('germaine')
      await go(p, '/market-insights', 1400)
      ok(await p.getByTestId('market-insights').isVisible() && await p.getByTestId('insight-featured').count() === 1, 'a Designer reads Market Insights (1.0: owner · admin · id)')
      as('priya')
      await go(p, '/market-insights', 1400)
      ok(await p.getByTestId('access-gate').isVisible(), 'Accounting: the address is the house gate')
      await go(p, `/market-insights/${featured.id}`, 1400)
      ok(await p.getByTestId('access-gate').isVisible(), '…an article’s too')
      await go(p, '/company/finance', 1600)
      await p.locator('[data-search-tile]').click(); await settle(p, 500)
      await p.getByRole('combobox', { name: 'Search the studio' }).fill('benchmark'); await settle(p, 1500)
      ok(await p.getByRole('dialog', { name: 'Search' }).getByRole('group', { name: 'Market Insights' }).count() === 0, '…and ⌘K finds no article for Accounting')
      await p.keyboard.press('Escape'); await settle(p, 300)
      as('dane')
    }

    // ── 7 · phones, tablets, ghosts ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · 390 · 320 · 768 touch — a reading list, the featured card stacked, no sideways scroll; the ghosts')
      const mc = await b.newContext(phoneOpts())
      const m = await page(mc, '390')
      await go(m, '/market-insights', 1600)
      ok(await sideways(m) <= 0, '390: no sideways scroll on the list')
      const bar = await m.getByTestId('insights-categories').evaluate((e) => e.closest('[class*="__bar"]').getBoundingClientRect().height)
      ok(bar <= 52, '390: the categories and the search glyph on one row', `${bar}px`)
      const rowsBox = await m.getByTestId('insights-list').getByTestId('insight-card').evaluateAll((els) => els.slice(0, 2).map((e) => { const img = e.querySelector('img'); const r = img.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(e.getBoundingClientRect().left) } }))
      ok(rowsBox.length === 2 && rowsBox.every((r) => Math.abs(r.w - r.h) <= 1 && r.w <= 112) && rowsBox[0].left === rowsBox[1].left, '390: each article is a row — a square of its cover beside its words', JSON.stringify(rowsBox))
      const fb = await m.getByTestId('insight-featured').evaluate((e) => { const pic = e.firstElementChild.getBoundingClientRect(), txt = e.lastElementChild.getBoundingClientRect(); return { stacked: txt.top >= pic.bottom - 1 } })
      ok(fb.stacked, '390: the featured card stacks — its cover over its words')
      await shot(m, '06-list-390', true)
      await go(m, `/market-insights/${featured.id}`, 1600)
      ok(await sideways(m) <= 0, '390: no sideways scroll on an article')
      await shot(m, '07-article-390', true)
      const bars = arts.find((a) => /\|---/.test(a.content))
      await go(m, `/market-insights/${bars.id}`, 1600)
      ok(await sideways(m) <= 0, '390: an article with a table and bar charts has no sideways scroll (the table scrolls in its own box)')
      await shot(m, '08-article-table-390', true)
      await mc.close()
      for (const w of [320]) {
        const sc = await b.newContext(phoneOpts(w, 640)); const s = await page(sc, String(w))
        for (const u of ['/market-insights', `/market-insights/${featured.id}`, `/market-insights/${bars.id}`]) { await go(s, u, 1400); ok(await sideways(s) <= 0, `${w}: no sideways scroll on ${u}`) }
        await sc.close()
      }
      const tc = await b.newContext(phoneOpts(768, 1024)); const t = await page(tc, '768')
      for (const u of ['/market-insights', `/market-insights/${featured.id}`]) { await go(t, u, 1500); ok(await sideways(t) <= 0, `768 touch: no sideways scroll on ${u}`) }
      await shot(t, '09-list-768', true)
      await tc.close()
      /* the ghosts draw the pages they stand for */
      /* a hard load of an article draws the usual shape (a headline of two lines — three on a phone — and three lines of first words); the
         benchmark article is that shape. Opened from a card the ghost knows the article's own words: measured below for the featured one */
      const usual = arts.find((a) => /benchmark/i.test(a.title)) ?? arts[0]
      for (const [url, o, tag] of [['/market-insights', opts(), '1440'], ['/market-insights', phoneOpts(), '390'], ['/market-insights?category=reports', opts(), '1440'], [`/market-insights/${usual.id}`, opts(), '1440'], [`/market-insights/${usual.id}`, phoneOpts(), '390']]) {
        const r = await measure(b, o, url, ['market-insights.', 'article.', 'quote-templates-gallery.card', 'quote-templates-gallery.thumb'], 16)
        if (r.none) { ok(false, `ghost of ${url} at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 4, `the ghost of ${url} at ${tag} lands where the page does`, off.slice(0, 4).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
        ok(r.words.length === 0, `…its words are the page’s at ${tag}`, r.words.slice(0, 3).join(' · '))
      }
      for (const [o, tag] of [[opts(), '1440'], [phoneOpts(), '390']]) {
        const r = await measureNav(b, o, '/market-insights', '[data-testid="insight-featured"]', ['article.'], 16)
        if (r.none) { ok(false, `the loading ghost of an article opened from its card at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 6, `opened from its card, the article’s loading ghost sets its own words where the page lands them at ${tag}`, off.slice(0, 4).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
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
