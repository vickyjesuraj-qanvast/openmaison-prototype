/*
 * (pending modules S41 — card studio:ai-sandboxes) The probe for the developers' AI bench (/dev/ai-bench): 1.0's seven AI sandboxes accounted for
 * (each mapped to where 2.0 does its job, its doors carrying the way back), the four experiments that only lived there built by rule and every
 * press on them exercised — Depth (the map, What it read, Download, another room, a photo of your own), Look around (drag, keys, Back to the
 * photo, Trim edges, Fill the edges, the six camera moves against the photo, Download), Orbit clip (a 6-second clip of the photo's room, a 3D
 * layout's turn, Download), Extend (both ways, three sizes, the photo untouched in the middle, Download), Plan corners (keys, a drag, a crossed
 * quad refused, Square it, Clean it, Download) and the seams (each file named on disk) — plus: the bench is gated (a production build without
 * OPENMAISON_DEV_PREVIEWS=1 answers a real 404 that names nothing), no studio menu links it, the ghost lands where the page does at 1440 and 390,
 * no sideways scroll at 390 / 320, no page errors, and the database is left as found (the bench writes nothing).
 *
 * Run twice, once against each server:
 *   DATABASE_URL=file:<db> npx next start -p 3170                                   →  BENCH=off node verify-pm2-s41.cjs <db>
 *   OPENMAISON_DEV_PREVIEWS=1 DATABASE_URL=file:<db> npx next start -p 3170         →  BENCH=on  node verify-pm2-s41.cjs <db> [shotDir] [base]
 * (NODE_PATH=<repo>/node_modules; BASE overrides the address.)
 */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s41')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const MODE = process.env.BENCH === 'off' ? 'off' : 'on'
const REPO = path.resolve(__dirname, '../../..')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : `— ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 400)}`) } }

/* The ghost-vs-page measure (the S17 · S23 … S34 probes'): in the held reveal, every element carrying a page module's class in both, index by
   index after aligning the lists — the first screen only. */
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
    return { rows }
  }, { blocks, max })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, acceptDownloads: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const tid = (p, id) => p.locator(`[data-testid="${id}"]`)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const download = async (p, press) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), press()]); return d.suggestedFilename() }

  /* the app's own lazy writes first, so the snapshot is what the app keeps (S08's habit) */
  { const w = await b.newPage(); await w.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await w.waitForTimeout(2500); await w.close() }
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))

  console.log(`S41 · the developers’ AI bench — the server ${MODE === 'on' ? 'opens it (OPENMAISON_DEV_PREVIEWS=1)' : 'is a plain production build'}`)

  /* ── 1. no studio menu links it (both modes) ── */
  {
    const roots = ['components/shell', 'components/company', 'lib/global-search', 'lib/keys', 'lib/company/sections.ts', 'components/leads', 'components/projects', 'components/visualizer', 'components/planner', 'app/(editor)/layout.tsx']
    const files = []
    const walk = (p) => { const f = path.join(REPO, p); if (!fs.existsSync(f)) return; if (fs.statSync(f).isDirectory()) for (const n of fs.readdirSync(f)) walk(path.join(p, n)); else if (/\.(tsx?|css)$/.test(f)) files.push(f) }
    roots.forEach(walk)
    const linking = files.filter((f) => /\/dev\/ai-bench|ai-bench/.test(fs.readFileSync(f, 'utf8')))
    ok(linking.length === 0, 'no rail, Tools, Company, ⌘K, key or module source names the bench', linking.map((f) => path.relative(REPO, f)))
    const c = await desk(); const p = await page(c, 'menus')
    await p.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await settle(p, 1200)
    ok(!(await p.content()).includes('/dev/ai-bench'), 'the dashboard, its rail and the shell link nowhere near it')
    await c.close()
  }

  if (MODE === 'off') {
    /* ── 2. gated: a real 404 that names nothing ── */
    for (const url of ['/dev/ai-bench', '/dev/ai-bench?view=depth', '/dev/ai-bench?view=corners']) {
      const r = await fetch(BASE + url)
      const body = await r.text()
      ok(r.status === 404, `${url} answers 404 without OPENMAISON_DEV_PREVIEWS=1`, r.status)
      ok(!/AI benches|bench-note|1\.0’s seven/.test(body), `…and its 404 names nothing of the bench (${url})`)
    }
    const e = await fetch(BASE + '/api/dev/email-preview?id=x')
    ok(e.status === 404, 'the email preview stays shut the same way (one gate, lib/services/dev-previews.ts)', e.status)
  } else {
    const c = await desk(); const p = await page(c, 'bench')
    const go = async (url, ms = 1200) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }

    /* ── 3. the map: 1.0's seven, the four experiments, every door ── */
    await go('/dev/ai-bench')
    ok((await text(p.locator('h1'))) === 'AI benches', 'the bench opens with OPENMAISON_DEV_PREVIEWS=1 — its L1 header')
    ok(/For developers\./.test(await text(tid(p, 'bench-note'))) && /no model is called/i.test(await text(tid(p, 'bench-note'))) && /OPENMAISON_DEV_PREVIEWS=1/.test(await text(tid(p, 'bench-note'))), 'it says who it is for, that no model is called, and how it is opened')
    ok((await p.title()).startsWith('AI benches'), 'its title', await p.title())
    const sev = await p.locator('[data-testid^="bench-v1-"]').count()
    ok(sev === 7, 'all seven of 1.0’s sandboxes are accounted for', sev)
    for (const k of ['auto-furnish', 'detect', 'floorplan-3d', 'quote-template', 'relight', 'style-transfer', 'visualizer-v2']) {
      const card = tid(p, `bench-v1-${k}`)
      const t = await text(card)
      ok(/\/tools\/[a-z0-9-]+-sandbox/.test(t) && /What it tried/i.test(t) && /Where 2\.0 does it/i.test(t) && /Left behind/i.test(t) && /Its harness/i.test(t), `${k}: its 1.0 address, what it tried, where 2.0 does it, its harness, what was left behind`)
    }
    for (const k of ['outpaint', 'reangle', 'orbit-video', 'depth']) ok((await tid(p, `bench-experiment-${k}`).count()) === 1, `the experiment “${k}” has its card (built by rule, with its limit)`)
    const homes = await p.locator('[data-testid^="bench-home-"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    ok(homes.length >= 9 && homes.every((h) => /[?&]from=%2Fdev%2Fai-bench$/.test(h)), 'every door to a 2.0 page carries the way back (?from=)', homes)
    for (const h of [...new Set(homes)]) { const r = await p.request.get(BASE + h); ok(r.status() === 200, `the 2.0 home opens: ${h.split('?')[0]}${h.includes('view=') ? ' (' + h.split('?')[1].split('&')[0] + ')' : ''}`, r.status()) }
    await shot(p, 's41-map-1440', true)
    ok((await sideways(p)) <= 0, 'the map at 1440: no sideways scroll')
    await tid(p, 'bench-open-reangle').click(); await settle(p, 400)
    ok((await p.getAttribute('[data-testid="ai-bench"]', 'data-view')) === 'look' && p.url().endsWith('/dev/ai-bench?view=look'), 'an experiment’s Open it opens its view and the address says so', p.url())
    await go('/dev/ai-bench?view=seams', 800)
    ok((await p.getAttribute('[data-testid="ai-bench"]', 'data-view')) === 'seams', 'a link lands on its view (?view=)')

    /* ── 4. the seams: each named in the registry, each file on disk ── */
    const seams = await p.locator('[data-testid^="bench-seam-"]').evaluateAll((as) => as.map((a) => ({ id: a.getAttribute('data-testid'), t: a.innerText })))
    ok(seams.length === 9, 'nine seams where a model plugs in (REG-2800 added floorplan-3d)', seams.map((s) => s.id))
    for (const s of seams) {
      const m = /Swap\s+(.+?)\s+—\s+(\S+\.tsx?)/.exec(s.t)
      ok(!!m && fs.existsSync(path.join(REPO, m[2])), `${s.id.replace('bench-seam-', '')}: its swap names a file that exists`, m && m[2])
    }
    ok(/No model is called on this page/.test(await text(tid(p, 'bench-seams'))), 'the seams say no model is called')
    await shot(p, 's41-seams-1440', true)

    /* ── 5. Depth ── */
    await go('/dev/ai-bench?view=depth', 400)
    await tid(p, 'bench-depth-read').waitFor({ timeout: 30000 })
    ok(/read off its walls/.test(await text(tid(p, 'bench-depth-read'))), 'the living room is read, the camera off its walls', await text(tid(p, 'bench-depth-read')))
    const near = await text(tid(p, 'bench-depth-near')), far = await text(tid(p, 'bench-depth-far'))
    const nm = parseFloat(near.replace(/[^0-9.]/g, '')), fm = parseFloat(far.replace(/[^0-9.]/g, ''))
    ok(nm > 0.3 && fm > nm && fm <= 12, 'Nearest and Farthest are a home’s metres', `${near} · ${far}`)
    const layers = await tid(p, 'bench-depth-layers').locator('li').count()
    ok(layers >= 10, 'each surface and piece is a layer with its distance', layers)
    const grey = await p.evaluate(async () => {
      const imgs = [...document.querySelectorAll('[data-testid="bench-depth-compare"] img')]
      if (imgs.length !== 2) return { n: imgs.length }
      const im = imgs[1]; await im.decode?.().catch(() => {})
      const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 96, 64)
      const d = g.getImageData(0, 0, 96, 64).data; let lo = 255, hi = 0, colour = 0
      for (let i = 0; i < d.length; i += 4) { lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]); colour = Math.max(colour, Math.abs(d[i] - d[i + 1]), Math.abs(d[i] - d[i + 2])) }
      return { n: 2, lo, hi, colour, src: im.src.slice(0, 22) }
    })
    ok(grey.n === 2 && grey.src === 'data:image/png;base64,' && grey.colour <= 2 && grey.hi - grey.lo > 150, 'the photo and its grey map under the compare slider (near white, far black, a full range)', grey)
    await shot(p, 's41-depth-1440')
    ok(/^depth-living-room\.png$/.test(await download(p, () => tid(p, 'bench-depth-download').click())), 'Download saves the map as a PNG')
    await tid(p, 'bench-depth-show').getByRole('radio', { name: 'What it read' }).click(); await settle(p, 500)
    ok((await tid(p, 'bench-depth-reading').count()) === 1 && (await p.locator('ul[aria-label="What each colour is"] li').count()) === 5, 'What it read: the photo tinted by its reading, five groups named in the legend')
    await shot(p, 's41-depth-reading-1440')
    await tid(p, 'bench-depth-room').getByRole('radio', { name: 'Kitchen' }).click()
    await p.waitForFunction(() => /kitchen/i.test(document.querySelector('[data-testid="bench-depth-read"]')?.textContent ?? ''), null, { timeout: 30000 })
    ok(/sample kitchen/.test(await text(tid(p, 'bench-depth-read'))), 'another sample room is read in its turn')
    await tid(p, 'bench-depth-file').setInputFiles(path.join(REPO, 'public/uat-files/sophia-living-room.jpg'))
    await p.waitForFunction(() => /sophia-living-room/.test(document.querySelector('[data-testid="bench-depth-read"]')?.textContent ?? ''), null, { timeout: 30000 })
    ok(/default \(horizon at 45 %\)/.test(await text(tid(p, 'bench-depth-read'))) && (await tid(p, 'bench-depth-room').getByRole('radio', { name: 'Your photo' }).getAttribute('aria-checked')) === 'true', 'a photo of your own: read by rule, the default camera said', await text(tid(p, 'bench-depth-read')))
    await tid(p, 'bench-depth-file').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await settle(p, 300)
    ok(/Pick a JPG, PNG or WebP photo/.test(await text(p.locator('[data-testid="bench-depth"] [role="alert"]'))), 'a file that isn’t a photo is refused, said')
    await tid(p, 'bench-depth-room').getByRole('radio', { name: 'Living room' }).click(); await settle(p, 500)

    /* ── 6. Look around and the camera moves ── */
    await tid(p, 'bench-views').getByRole('radio', { name: 'Look around' }).click()
    const view = tid(p, 'bench-look-view')
    await p.waitForFunction(() => document.querySelector('[data-testid="bench-look-view"]')?.hasAttribute('data-ready'), null, { timeout: 30000 })
    await settle(p, 500)
    ok((await view.locator('canvas').count()) === 1 && Number(await view.getAttribute('data-triangles')) > 10000, 'the photo’s room is drawn in 3D', await view.getAttribute('data-triangles'))
    const frame = () => p.evaluate(() => document.querySelector('[data-testid="bench-look-view"] canvas').toDataURL('image/jpeg', 0.6))
    /* at rest the view IS the photo */
    const rest = await p.evaluate(async () => {
      const cv = document.querySelector('[data-testid="bench-look-view"] canvas')
      const ph = new Image(); ph.src = '/visualizer/samples/living-room/original.jpg'; await ph.decode()
      const sample = (src) => { const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d'); g.drawImage(src, 0, 0, 96, 64); return g.getImageData(0, 0, 96, 64).data }
      const a = sample(cv), b2 = sample(ph); let s = 0
      for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b2[i]) + Math.abs(a[i + 1] - b2[i + 1]) + Math.abs(a[i + 2] - b2[i + 2])
      return s / (a.length / 4) / 3
    })
    ok(rest < 10, 'at rest the 3D view is the photo itself (mean difference under 10 of 255)', rest.toFixed(2))
    await shot(p, 's41-look-1440')
    const f0 = await frame()
    ok((await tid(p, 'bench-look-reset').isDisabled()), 'Back to the photo waits until the camera has moved')
    const box = await view.boundingBox()
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2 + 30, { steps: 8 }); await p.mouse.up(); await settle(p, 300)
    const f1 = await frame()
    ok(f1 !== f0 && !(await tid(p, 'bench-look-reset').isDisabled()), 'a drag turns the camera; Back to the photo is there')
    await shot(p, 's41-look-turned-1440')
    ok(/^view-living-room\.jpg$/.test(await download(p, () => tid(p, 'bench-look-save').click())), 'Download this view keeps a move made by hand (1.0’s custom move)')
    await tid(p, 'bench-look-reset').click(); await settle(p, 300)
    ok((await tid(p, 'bench-look-reset').isDisabled()), 'Back to the photo puts the camera back')
    await view.focus(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await settle(p, 200)
    ok((await frame()) !== f0 && !(await tid(p, 'bench-look-reset').isDisabled()), 'the arrow keys turn it too (reach for everyone)')
    await p.keyboard.press('0'); await settle(p, 200)
    const tri0 = Number(await view.getAttribute('data-triangles'))
    await tid(p, 'bench-look-trim').click(); await settle(p, 600)
    ok(Number(await view.getAttribute('data-trimmed')) === 0 && Number(await view.getAttribute('data-triangles')) > tri0, 'Trim edges off: every silhouette stretched instead of cut', `${tri0} → ${await view.getAttribute('data-triangles')}`)
    await tid(p, 'bench-look-trim').click(); await settle(p, 600)
    await tid(p, 'bench-look-fill').click(); await settle(p, 800)
    ok(Number(await view.getAttribute('data-triangles')) < tri0, 'Fill the edges off: the room stands on the photo alone (fewer triangles)')
    await tid(p, 'bench-look-fill').click(); await settle(p, 800)
    await tid(p, 'bench-look-relief-input').fill('1.4'); await settle(p, 500)
    ok(/Deeper/.test(await text(p.locator('[data-testid="bench-look"] output'))), 'Room depth deepens the room, said')
    await tid(p, 'bench-look-relief-input').fill('1'); await settle(p, 500)
    await tid(p, 'bench-moves-draw').click(); await settle(p, 800)
    const tiles = await tid(p, 'bench-moves').locator('button').evaluateAll((bs) => bs.map((x) => ({ src: x.querySelector('img')?.getAttribute('src')?.slice(0, 40) ?? '', len: x.querySelector('img')?.getAttribute('src')?.length ?? 0, name: x.innerText.trim() })))
    ok(tiles.length === 6 && tiles.every((t) => t.src.startsWith('data:image/jpeg') && t.len > 2000), 'Draw the six moves: 1.0’s six, each a still', tiles.map((t) => t.name))
    const srcs = await tid(p, 'bench-moves').locator('img').evaluateAll((is) => is.map((i) => i.getAttribute('src')))
    ok(new Set(srcs).size === 6, 'every move shows the room from another camera (six different stills)')
    ok((await tid(p, 'bench-moves-compare').count()) === 1, 'the first move is set against the photo under the compare slider')
    await tid(p, 'bench-move-step-back').click(); await settle(p, 300)
    ok((await tid(p, 'bench-move-step-back').getAttribute('aria-pressed')) === 'true' && /Step back/.test(await text(tid(p, 'bench-moves-compare'))), 'picking a move sets it against the photo')
    await tid(p, 'bench-moves').scrollIntoViewIfNeeded(); await shot(p, 's41-moves-1440')
    ok(/^step-back-living-room\.jpg$/.test(await download(p, () => tid(p, 'bench-moves-download').click())), 'Download this move saves the still')

    /* ── 7. Orbit clip ── */
    await tid(p, 'bench-views').getByRole('radio', { name: 'Orbit clip' }).click()
    await p.waitForFunction(() => document.querySelector('[data-testid="bench-clip-view"]')?.hasAttribute('data-ready'), null, { timeout: 30000 })
    await tid(p, 'bench-clip-turn').click(); await settle(p, 700)
    const c1 = await p.evaluate(() => document.querySelector('[data-testid="bench-clip-view"] canvas').toDataURL('image/jpeg', 0.5))
    await settle(p, 900)
    const c2 = await p.evaluate(() => document.querySelector('[data-testid="bench-clip-view"] canvas').toDataURL('image/jpeg', 0.5))
    ok(c1 !== c2, 'Turn it swings the photo’s room side to side')
    await tid(p, 'bench-clip-turn').click(); await settle(p, 300)
    await tid(p, 'bench-clip-record').click(); await settle(p, 600)
    ok(/Recording… \d s/.test(await text(tid(p, 'bench-clip-record'))), 'Record says it is recording, counting down', await text(tid(p, 'bench-clip-record')))
    await tid(p, 'bench-clip-video').waitFor({ timeout: 20000 })
    const bytes = Number(await tid(p, 'bench-clip-video').getAttribute('data-bytes'))
    ok(bytes > 5000 && /orbit-living-room\.(webm|mp4) · (WEBM|MP4) · .* · 6 s/.test(await text(tid(p, 'bench-clip-facts'))), 'a 6-second clip of the photo’s room, a real file', await text(tid(p, 'bench-clip-facts')))
    const dur = await p.evaluate(async () => { const v = document.querySelector('[data-testid="bench-clip-video"]'); if (v.readyState < 1) await new Promise((r) => { v.onloadedmetadata = r; setTimeout(r, 3000) }); return { w: v.videoWidth, h: v.videoHeight } })
    ok(dur.w > 100 && dur.h > 60, 'the clip plays — the browser reads its frames', dur)
    ok(/^orbit-living-room\.(webm|mp4)$/.test(await download(p, () => tid(p, 'bench-clip-download').click())), 'Download saves the clip')
    await shot(p, 's41-clip-1440')
    await tid(p, 'bench-clip-source').getByRole('radio', { name: 'A 3D layout' }).click(); await settle(p, 2500)
    ok((await tid(p, 'bench-clip-example').getByRole('radio').count()) === 6 && (await tid(p, 'bench-clip-layout').locator('canvas').count()) === 1, 'a 3D layout: the planner’s six examples, drawn by the planner’s own view')
    const l1 = await p.evaluate(() => document.querySelector('[data-testid="bench-clip-layout"] canvas').toDataURL('image/jpeg', 0.5))
    await tid(p, 'bench-clip-turn').click(); await settle(p, 1500)
    const l2 = await p.evaluate(() => document.querySelector('[data-testid="bench-clip-layout"] canvas').toDataURL('image/jpeg', 0.5))
    ok(l1 !== l2, 'Turn it puts the layout on a turntable')
    await tid(p, 'bench-clip-look').getByRole('radio', { name: 'Isometric' }).click(); await settle(p, 1500)
    await shot(p, 's41-clip-layout-1440')
    await tid(p, 'bench-clip-record').click()
    await p.waitForFunction(() => /turntable-/.test(document.querySelector('[data-testid="bench-clip-facts"]')?.textContent ?? ''), null, { timeout: 30000 })
    ok(/turntable-ex-hdb-4-japandi\.(webm|mp4) · .* · 12 s/.test(await text(tid(p, 'bench-clip-facts'))), 'Record one turn: the layout’s 12-second clip', await text(tid(p, 'bench-clip-facts')))

    /* ── 8. Extend ── */
    await tid(p, 'bench-views').getByRole('radio', { name: 'Extend' }).click(); await settle(p, 1500)
    const stage = tid(p, 'bench-extend-stage')
    ok((await stage.getAttribute('data-width')) === '1260' && (await stage.getAttribute('data-height')) === '844', 'Extend: the living room on a canvas 1.4 times its size', `${await stage.getAttribute('data-width')}×${await stage.getAttribute('data-height')}`)
    const fr = await tid(p, 'bench-extend-frame').evaluate((e) => ({ l: e.style.left, w: e.style.width }))
    ok(/^14\.\d+%$/.test(fr.l) && /^71\.\d+%$/.test(fr.w), 'the dashed line marks the photo’s own edge', fr)
    await shot(p, 's41-extend-1440')
    const e1 = await tid(p, 'bench-extend-picture').getAttribute('src')
    await tid(p, 'bench-extend-mode').getByRole('radio', { name: '1.0’s padded canvas' }).click(); await settle(p, 1200)
    ok((await tid(p, 'bench-extend-picture').getAttribute('src')) !== e1, '1.0’s padded canvas is the other way to fill it')
    await tid(p, 'bench-extend-size').getByRole('radio', { name: '1.6×' }).click(); await settle(p, 1200)
    ok((await stage.getAttribute('data-width')) === '1440', '1.6× makes it bigger still')
    ok(/^extended-living-room\.jpg$/.test(await download(p, () => tid(p, 'bench-extend-download').click())), 'Download saves the extended picture')

    /* ── 9. Plan corners ── */
    await tid(p, 'bench-views').getByRole('radio', { name: 'Plan corners' }).click(); await settle(p, 1500)
    ok(/the sheet the rule found/.test(await text(tid(p, 'bench-corners-seed'))), 'the corners start on the sheet S28’s rule finds')
    ok((await p.locator('[data-testid^="bench-corner-"]').count()) === 4, 'four handles, each a named button', await p.locator('[data-testid^="bench-corner-"]').evaluateAll((b2) => b2.map((x) => x.getAttribute('aria-label'))))
    const x0 = Number(await tid(p, 'bench-corner-0').getAttribute('data-x'))
    await tid(p, 'bench-corner-0').focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Shift+ArrowRight'); await settle(p, 200)
    ok(Number(await tid(p, 'bench-corner-0').getAttribute('data-x')) > x0, 'a corner moves with the arrow keys', `${x0} → ${await tid(p, 'bench-corner-0').getAttribute('data-x')}`)
    const h1 = await tid(p, 'bench-corner-1').boundingBox(), y1 = Number(await tid(p, 'bench-corner-1').getAttribute('data-y'))
    await p.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2); await p.mouse.down(); await p.mouse.move(h1.x + h1.width / 2 - 10, h1.y + h1.height / 2 + 40, { steps: 6 }); await p.mouse.up(); await settle(p, 200)
    ok(Number(await tid(p, 'bench-corner-1').getAttribute('data-y')) > y1, 'a corner is dragged into place')
    const h0 = await tid(p, 'bench-corner-0').boundingBox(), h2 = await tid(p, 'bench-corner-2').boundingBox()
    await p.mouse.move(h0.x + h0.width / 2, h0.y + h0.height / 2); await p.mouse.down(); await p.mouse.move(h2.x + h2.width / 2 + 30, h2.y + h2.height / 2 + 10, { steps: 8 }); await p.mouse.up(); await settle(p, 200)
    ok((await tid(p, 'bench-corners-square').isDisabled()) && /don’t make a sheet/.test(await text(p.locator('[data-testid="bench-corners"] [role="alert"]'))), 'a crossed quad is refused, and says why')
    await tid(p, 'bench-corners-reset').click(); await settle(p, 300)
    ok(!(await tid(p, 'bench-corners-square').isDisabled()), 'Start the corners again puts them back on the sheet')
    await tid(p, 'bench-corners-square').click(); await settle(p, 1500)
    const res = tid(p, 'bench-corners-result')
    ok((await res.count()) === 1 && Number(await res.getAttribute('data-width')) > 800 && Number(await res.getAttribute('data-height')) > 800, 'Square it: the plan comes out flat', `${await res.getAttribute('data-width')}×${await res.getAttribute('data-height')}`)
    await res.scrollIntoViewIfNeeded(); await shot(p, 's41-corners-squared-1440')
    ok(/^plan-squared-demo\.png$/.test(await download(p, () => tid(p, 'bench-corners-download').click())), 'Download saves the squared plan')
    await tid(p, 'bench-corners-clean').click(); await settle(p, 300)
    ok((await res.count()) === 0, 'Clean it off clears the result, to square again')
    await tid(p, 'bench-corners-square').click(); await settle(p, 1200)
    ok((await res.count()) === 1 && !/cleaned/.test(await text(p.locator('[data-testid="bench-corners"] p').last())), 'squared again, as the photo was')
    await c.close()

    /* ── 10. the phone, the tablet and the narrowest screen ── */
    for (const [w, h] of [[390, 844], [320, 700], [768, 1024]]) {
      const pc = await phoneCtx(w, h); const pp = await page(pc, `phone-${w}`)
      for (const v of ['map', 'depth', 'look', 'clip', 'extend', 'corners', 'seams']) {
        await pp.goto(`${BASE}/dev/ai-bench${v === 'map' ? '' : `?view=${v}`}`, { waitUntil: 'networkidle' }); await settle(pp, ['depth', 'look', 'clip', 'extend'].includes(v) ? 4500 : 1200)
        const over = await sideways(pp)
        ok(over <= 0, `${v} at ${w}: no sideways scroll`, over)
        if (w === 390) await shot(pp, `s41-${v}-390`, v === 'map')
      }
      await pc.close()
    }

    /* ── 11. the ghost lands where the page does ── */
    for (const [o, tag] of [[{ viewport: { width: 1440, height: 1024 } }, '1440'], [{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '390']]) {
      for (const url of ['/dev/ai-bench', '/dev/ai-bench?view=depth', '/dev/ai-bench?view=look', '/dev/ai-bench?view=clip', '/dev/ai-bench?view=extend', '/dev/ai-bench?view=corners', '/dev/ai-bench?view=seams']) {
        const r = await measure(b, o, url, ['ai-bench.'], 14)
        if (r.none) { ok(false, `the ghost of ${url} at ${tag} held`); continue }
        const off = r.rows.filter((x) => Math.abs(x.dy) > 2 || Math.abs(x.dx) > 2)
        ok(off.length === 0 && r.rows.length > 5, `the ghost of ${url} at ${tag} lands where the page does`, off.slice(0, 6).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
      }
    }
  }

  /* ── the database as found; no page errors ── */
  const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
  ok(!changed.length, 'the bench writes nothing — every table as found', changed)
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  ok(errors.length === 0, 'no page errors')
  await b.close()
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
