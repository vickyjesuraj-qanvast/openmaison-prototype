// Tools › Floorplan to 3D Isometric — 1.0's module on its own page again (REG-2800…2804, 2026-10-23: his "this looks like a module in 1.0",
// then "Sample floor plans with ready-made renders"). Each item asserted as the rule it builds:
//  0 · the pure rules (fp3d-pure.mts): the samples and every render file, their rooms, the download's name, who opens it, 1.0's addresses,
//      the image model's seam, the Condo flats' bathroom wall
//  1 · the door: Tools › Floorplan to 3D Isometric (Beta, as in 1.0) opens /floorplan-3d and lights Tools; ⌘K finds it; 1.0's addresses land
//  2 · the landing: 1.0's words, How it works, the drop box, What you'll get (1.0's two looks), the sample plan with its views — nothing sideways
//  3 · the sample's way through (his "Ship HDB 4-Room only": a sample shows once it has views): read (the photo straightened by its 7°, on
//      the house progress card's three steps) → confirm (2026-10-27, a deliberate change — his "1.0 is simpler" and the testers' "I can't see
//      the button to generate top-down view": 1.0's Confirm — the plan alone, its own rooms, BOTH looks with the one it has no view for saying
//      so, Generate naming the look) → generate (the plan faded under the wait, 1.0) → the view (said to be made ahead), Switch style with both
//      looks, Regenerate's other take, Download named for it, Start a new plan
//  4 · a studio's own plan on the prototype: said on the landing before the upload; straightened, with S28's rescues (Turn a quarter, the four
//      corners — a sample has none now), then said plainly, the sample offered; an unreadable file says 1.0's words
//  5 · the planner's isometric line no longer names the tool; the ghost
//  6 · 390 and 768 (touch) and 320: one column, the plan before what to do, 48 foot buttons, nothing sideways
// The page writes nothing. Usage: BASE=http://localhost:3021 NODE_PATH=<repo>/node_modules node verify-fp3d.cjs [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const dir = process.argv[2] || path.join(__dirname, 'shots')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3021'
const REPO = process.env.REPO || (fs.existsSync(path.join(process.cwd(), 'design-source/verify')) ? process.cwd() : path.resolve(__dirname, '../../..'))
let pass = 0, fail = 0
const ok = (c, what, extra) => { if (c) { pass++; console.log(`  ✓ ${what}`) } else { fail++; console.log(`  ✗ ${what}${extra !== undefined ? ` — ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`) } }
const settle = (p, ms = 800) => p.waitForTimeout(ms)
const go = async (p, url, ms = 1400) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const loaded = (loc) => loc.evaluate((img) => img.complete && img.naturalWidth > 0)
const box = (loc) => loc.boundingBox()
/** a control's words without its icon (Material Symbols are ligatures — the icon's name is text) */
const words = (loc) => loc.evaluate((el) => { const c = el.cloneNode(true); c.querySelectorAll('.msr, .mso, [class*="material"], [aria-hidden="true"]').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim() })

const toConfirm = async (p) => { await p.waitForSelector('[data-testid="fp3d-confirm"]', { timeout: 30000 }); await settle(p, 400) }
const toDone = async (p) => { await p.waitForSelector('[data-testid="fp3d-render"]', { timeout: 20000 }); await settle(p, 400) }

;(async () => {
  console.log('0 · the pure rules')
  try {
    const out = execSync(`npx tsx "${path.join(REPO, 'design-source/verify/floorplan-3d/fp3d-pure.mts')}"`, { cwd: REPO, encoding: 'utf8' })
    for (const l of out.split('\n')) if (/^\s+[✓✗]/.test(l)) { console.log(l); if (/✓/.test(l)) pass++; else fail++ }
  } catch (e) { for (const l of String(e.stdout || '').split('\n')) if (/^\s+[✓✗]/.test(l)) { console.log(l); if (/✓/.test(l)) pass++; else fail++ } if (!e.stdout) ok(false, `the pure rules run — ${String(e.message).slice(0, 200)}`) }

  const errors = []
  const b = await chromium.launch()
  try {
    /* ── 1440 ── */
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
    const d = await D.newPage(); d.on('pageerror', (e) => errors.push(`desk: ${e.message}`))

    console.log('1 · the door')
    await go(d, '/leads')
    await d.locator('nav[aria-label="Workspace"] button[aria-label^="Tools"]').first().click(); await settle(d, 500)
    const tile = d.getByRole('menuitem', { name: 'Floorplan to 3D Isometric, beta', exact: true })
    ok(await tile.count() === 1 && await tile.getAttribute('data-soon') === null, 'the tile is live and says it is beta')
    ok((await tile.getByTestId('tool-beta').innerText()) === 'Beta', 'it wears 1.0’s Beta in the Soon tag’s place')
    await shot(d, '01-tools-1440')
    await tile.click(); await d.waitForURL(/\/floorplan-3d$/, { timeout: 15000 }).catch(() => {}); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/floorplan-3d', 'it opens Floorplan to 3D Isometric — its own page, not the 3D Space Planner', d.url())
    ok(await d.locator('nav[aria-label="Workspace"] button[aria-label^="Tools"]').first().getAttribute('data-active') !== null, 'the rail lights Tools')
    ok((await d.locator('h1').first().innerText()) === 'Floorplan to 3D Isometric' && /beta/i.test(await d.getByTestId('fp3d-beta').innerText()), 'the header: its name and Beta')
    for (const [from, to] of [['/tools/floorplan-3d-isometric', '/floorplan-3d'], ['/tools/floorplan-3d-sandbox', '/floorplan-3d']]) {
      const r = await d.request.get(BASE + from, { maxRedirects: 0 })
      ok([307, 308].includes(r.status()) && (r.headers().location || '').endsWith(to), `1.0’s ${from} lands on ${to}`, `${r.status()} ${r.headers().location}`)
    }
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 600)
    await d.keyboard.type('floorplan to 3d'); await settle(d, 900)
    const hit = d.getByRole('option', { name: /Floorplan to 3D Isometric/ }).first()
    ok(await hit.count() === 1, '⌘K finds it by its name')
    await d.keyboard.press('Escape'); await settle(d, 400)

    console.log('2 · the landing')
    await go(d, '/floorplan-3d')
    ok((await d.locator('#fp3d-title').innerText()) === 'Turn any floor plan photo into a marketing-ready 3D view', 'what it does, in 1.0’s words')
    ok(await d.locator('[data-testid="fp3d-idle"] ol li').count() === 3, 'How it works: three steps')
    ok(await d.getByRole('button', { name: 'Upload a floor plan' }).count() === 1, 'the drop box')
    const ex = d.locator('[data-testid="fp3d-get"] img')
    ok(await ex.count() === 2 && await loaded(ex.nth(0)) && await loaded(ex.nth(1)), 'What you’ll get: 1.0’s Dollhouse and Top-down pictures')
    const samples = d.getByTestId('fp3d-sample')
    /* (his "Ship HDB 4-Room only", 2026-10-23) a sample shows once it has views: the HDB 4-Room alone for now */
    ok(await samples.count() === 1 && /HDB 4-Room/.test(await samples.first().innerText()), 'the sample plan with its views: the HDB 4-Room')
    /* (2026-10-27) what the prototype does with a studio's own plan, said before the upload */
    /* (the calm UI build 2026-10-27, a deliberate change) — 6-22 · T-05: the note sits behind the header's info glyph beside Beta, not as a line on the landing: its words are its tooltip */
    { const tip = d.getByTestId('fp3d-prototype-hint'); await tip.hover().catch(() => {}); await settle(d, 900)
      ok(await tip.count() === 1 && /What happens to your own plan here/.test(await tip.getAttribute('aria-label') ?? '') && /your own plan is straightened but not drawn in 3D — the sample plans go all the way/.test(await d.locator('[role="tooltip"]').first().innerText().catch(() => '')), 'the header says before the upload what a studio’s own plan gets here (its info glyph)')
      await d.mouse.move(2, 2) }
    ok(await sideways(d) <= 0, 'nothing runs sideways')
    await shot(d, '02-landing-1440', true)

    console.log('3 · a sample’s way through')
    await samples.filter({ hasText: 'HDB 4-Room' }).click()
    const progress = d.getByTestId('fp3d-progress')
    await progress.waitFor({ timeout: 5000 }).catch(() => {})
    const steps = await progress.locator('li').evaluateAll((ls) => ls.map((l) => [...l.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim())).catch(() => [])
    ok(steps.join(' · ') === 'Read the plan · Confirm the rooms · 3D render', 'reading: the house progress card with 1.0’s three steps', steps)
    await toConfirm(d)
    const angle = Math.abs(Number(await d.getByTestId('fp3d-picture').getAttribute('data-angle')))
    ok(angle > 6 && angle < 8, `the photo is straightened by its 7° (${angle})`)
    ok(await loaded(d.getByTestId('fp3d-picture')), 'the straightened plan shows')
    /* (2026-10-27, a deliberate change) 1.0's Confirm: a sample's plan alone — no angle line, no rescues (it is straight already) */
    ok(await d.getByTestId('fp3d-line').count() === 0 && await d.getByTestId('fp3d-turn').count() === 0 && await d.getByTestId('fp3d-corners-open').count() === 0, 'a sample’s plan alone: no angle line, no Turn a quarter, no corners')
    const rooms = (await d.getByTestId('fp3d-rooms').innerText()).toLowerCase()
    ok(/3 bedrooms/.test(rooms) && /11 rooms in total/.test(rooms), 'We found: the sample’s own rooms, 1.0’s chips', rooms.replace(/\n/g, ' · '))
    ok(await d.getByTestId('fp3d-rooms-edit').count() === 0 && !/The sample’s own rooms/.test(await d.getByTestId('fp3d-confirm').innerText()), 'a sample’s rooms aren’t changed — its views were drawn from them — and nothing more is said')
    /* (2026-10-27, a deliberate change — the testers' "I can't see the button to generate top-down view") both looks, always, as 1.0 */
    const dh = d.getByTestId('fp3d-look-dollhouse'), td = d.getByTestId('fp3d-look-top')
    ok(await dh.count() === 1 && await td.count() === 1 && await dh.getAttribute('aria-checked') === 'true', 'Style: both looks, as 1.0 offers them — Dollhouse picked')
    ok(await td.isDisabled() && /This sample has no top-down view yet/.test(await td.innerText()), 'the look it has no view for stays in its place, not pressable, and says why')
    ok((await words(d.getByTestId('fp3d-generate'))) === 'Generate dollhouse view', 'the button names the look')
    await shot(d, '03-confirm-1440', true)
    await d.getByTestId('fp3d-generate').click()
    await progress.waitFor({ timeout: 4000 }).catch(() => {})
    ok(/HDB 4-Room’s dollhouse view/.test(await progress.innerText().catch(() => '')) && /ready-made/.test(await progress.innerText().catch(() => '')), 'the wait says what it waits for — the sample’s view, ready-made')   // (the calm UI build 2026-10-27, a deliberate change)
    ok(await d.getByTestId('fp3d-faded').count() === 1, 'the plan stays in view, faded, while it renders (1.0)')
    await toDone(d)
    const render = d.getByTestId('fp3d-render')
    ok((await render.getAttribute('src')).endsWith('/hdb-4-room-dollhouse-1.jpg') && await loaded(render), 'the Dollhouse view')
    ok(/^Sample plan — ready-made views$/.test(await d.getByTestId('fp3d-sample-note').innerText()), 'said under it: a sample plan, its views ready-made')   // (the calm UI build 2026-10-27, a deliberate change) — 6-22 · W-349
    /* (2026-10-27, a deliberate change) Switch style, always, as 1.0 — the look without a view says so */
    ok(/Switch style/i.test(await d.getByTestId('fp3d-done').innerText()) && await d.getByTestId('fp3d-switch-dollhouse').getAttribute('aria-checked') === 'true' && await d.getByTestId('fp3d-switch-top').isDisabled(), 'Switch style: both looks, the one shown picked, the one without a view not pressable')
    await shot(d, '05-done-1440', true)
    await d.getByTestId('fp3d-regenerate').click(); await toDone(d); await settle(d, 300)
    ok((await render.getAttribute('src')).endsWith('/hdb-4-room-dollhouse-2.jpg'), 'Regenerate: its other take')
    await d.getByTestId('fp3d-regenerate').click(); await toDone(d); await settle(d, 300)
    ok((await render.getAttribute('src')).endsWith('/hdb-4-room-dollhouse-1.jpg'), '…and back to the first')
    const [dl] = await Promise.all([d.waitForEvent('download', { timeout: 8000 }).catch(() => null), d.getByTestId('fp3d-download').click()])
    ok(dl && dl.suggestedFilename() === 'HDB 4-Room — Dollhouse.jpg', 'Download: named for the plan and the look', dl && dl.suggestedFilename())
    await settle(d, 400)
    ok(/Dollhouse view downloaded/.test(await d.locator('[data-om-snackbar]').first().innerText().catch(() => '')), '…and says so')
    await d.getByTestId('fp3d-new').click(); await settle(d, 600)
    ok(await d.getByTestId('fp3d-idle').count() === 1, 'Start a new plan: the landing again')


    console.log('4 · a studio’s own plan, on the prototype')
    await d.locator('input[type=file]').first().setInputFiles(path.join(REPO, 'public/projects/demo/floor-plan-ec.png'))
    await toConfirm(d)
    ok(await loaded(d.getByTestId('fp3d-picture')), 'its plan is read and straightened for real')
    /* S28's rescues stay for a studio's own plan (a sideways photo needs them — 1.0's own gap) */
    ok(/(Straightened by|Already straight)/.test(await d.getByTestId('fp3d-line').innerText()), 'its line says what was done', await d.getByTestId('fp3d-line').innerText())
    const src0 = await d.getByTestId('fp3d-picture').getAttribute('src')
    const dims0 = await d.getByTestId('fp3d-picture').evaluate((i) => [i.naturalWidth, i.naturalHeight])
    await d.getByTestId('fp3d-turn').click(); await settle(d, 1500)
    const dims1 = await d.getByTestId('fp3d-picture').evaluate((i) => [i.naturalWidth, i.naturalHeight])
    ok((await d.getByTestId('fp3d-picture').getAttribute('src')) !== src0 && dims1[0] === dims0[1] && dims1[1] === dims0[0], 'Turn a quarter turns it (its sides swap)', [dims0, dims1])
    for (let i = 0; i < 3; i++) { await d.getByTestId('fp3d-turn').click(); await settle(d, 1200) }
    await d.getByTestId('fp3d-corners-open').click(); await settle(d, 600)
    ok(await d.getByTestId('fp3d-corners-editor').count() === 1 && await d.locator('[data-testid^="fp3d-corner-"]').count() === 4, 'Square it by its corners: the four corners on the photo')
    await shot(d, '04-corners-1440')
    await d.getByRole('button', { name: 'Cancel' }).click(); await settle(d, 500)
    ok(await d.getByTestId('fp3d-picture').count() === 1, 'Cancel goes back to the plan')
    ok(/On the prototype, your own plan stops here — reading its rooms and drawing it in 3D need the image model/.test(await d.getByTestId('fp3d-held').innerText()), 'then said plainly: its rooms aren’t read and it isn’t drawn here')
    ok(await d.getByTestId('fp3d-generate').count() === 0 && await d.getByTestId('fp3d-look-dollhouse').count() === 0, 'no Generate that couldn’t answer')
    ok(await d.getByTestId('fp3d-held-sample').count() === 1, 'the sample offered in its place')
    await shot(d, '06-own-plan-1440', true)
    await d.getByTestId('fp3d-held-sample').first().click(); await toConfirm(d)
    ok(/11 rooms in total/i.test(await d.getByTestId('fp3d-rooms').innerText()) && await d.getByTestId('fp3d-generate').count() === 1, 'the sample from there goes the whole way')
    await d.getByTestId('fp3d-reset').click(); await settle(d, 500)
    const junk = path.join(dir, 'not-a-plan.png'); fs.writeFileSync(junk, 'this is not a picture')
    await d.locator('input[type=file]').first().setInputFiles(junk)
    await d.getByTestId('fp3d-error').waitFor({ timeout: 15000 }).catch(() => {})
    ok(/We couldn’t read that floor plan/.test(await d.getByTestId('fp3d-error').innerText().catch(() => '')), 'an unreadable file: 1.0’s words, and the way back')
    await shot(d, '07-unreadable-1440')
    await d.getByTestId('fp3d-reset').click(); await settle(d, 500)
    ok(await d.getByTestId('fp3d-idle').count() === 1, 'Upload a different plan: the landing again')

    console.log('5 · the planner’s line, and the ghost')
    await go(d, '/planner?view=iso')
    ok(/3D at an angle — /.test(await d.getByTestId('planner-iso-note').innerText()) && !/Floorplan to 3D/.test(await d.getByTestId('planner-iso-note').innerText()), 'the planner’s isometric line no longer names the tool')   // (the calm UI build 2026-10-27, a deliberate change) — W-532: "3D at an angle" for Isometric
    /* the loader: the streamed page with its scripts taken out (the house ghost probes' way) — the ghost stays, as a slow load shows it */
    const G = await b.newContext({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }); const g = await G.newPage()
    await g.route(/\/floorplan-3d$/, async (r) => { const res = await r.fetch(); const html = (await res.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await r.fulfill({ response: res, body: html }) })
    await g.goto(BASE + '/floorplan-3d', { waitUntil: 'load' }); await settle(g, 600)
    const ghost = g.getByRole('status', { name: 'Loading Floorplan to 3D Isometric' })
    ok(await ghost.count() === 1, 'its own ghost while it loads')
    await shot(g, '08-ghost-1440')
    const gTitle = await box(ghost.locator('h2').first()), gDrop = await box(ghost.locator('[class*="dropzone"]').first())
    await g.unroute(/\/floorplan-3d$/); await go(g, '/floorplan-3d')
    const pTitle = await box(g.locator('#fp3d-title')), pDrop = await box(g.getByRole('button', { name: 'Upload a floor plan' }))
    const near = (x, y) => x && y && Math.abs(x.x - y.x) <= 2 && Math.abs(x.y - y.y) <= 2 && Math.abs(x.height - y.height) <= 2
    ok(near(gTitle, pTitle) && near(gDrop, pDrop), 'the ghost’s title and drop box stand where the page’s do', { gTitle, pTitle, gDrop, pDrop })
    await G.close()
    await D.close()

    /* ── phone and tablet ── */
    for (const [label, opts] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }]]) {
      console.log(`6 · ${label} (touch)`)
      const C = await b.newContext(opts); const p = await C.newPage(); p.on('pageerror', (e) => errors.push(`${label}: ${e.message}`))
      await go(p, '/floorplan-3d')
      ok(await sideways(p) <= 0, `${label}: nothing runs sideways`)
      await shot(p, `10-landing-${label}`, true)
      await p.getByTestId('fp3d-sample').filter({ hasText: 'HDB 4-Room' }).tap(); await toConfirm(p)
      const plan = await box(p.getByTestId('fp3d-plan')), conf = await box(p.getByTestId('fp3d-confirm'))
      ok(plan && conf && plan.y + plan.height <= conf.y + 1, `${label}: one column — the plan, then what to do with it`)
      const gen = await box(p.getByTestId('fp3d-generate'))
      ok(gen && gen.height >= 48, `${label}: Generate is 48 under a thumb`, gen && gen.height)
      ok(await sideways(p) <= 0, `${label}: confirm — nothing sideways`)
      await shot(p, `11-confirm-${label}`, true)
      await p.getByTestId('fp3d-generate').tap(); await toDone(p)
      const regen = await box(p.getByTestId('fp3d-regenerate'))
      ok(regen && regen.height >= 48 && await loaded(p.getByTestId('fp3d-render')), `${label}: the view, Regenerate 48`)
      ok(await sideways(p) <= 0, `${label}: done — nothing sideways`)
      await shot(p, `12-done-${label}`, true)
      await C.close()
    }
    const N = await b.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }); const n = await N.newPage()
    await go(n, '/floorplan-3d')
    ok(await sideways(n) <= 0, '320: nothing runs sideways')
    await N.close()
    /* a phone held sideways: the plan fits the screen's height */
    const W = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const w = await W.newPage()
    await go(w, '/floorplan-3d')
    ok(await sideways(w) <= 0, '844×390: nothing runs sideways')
    await w.getByTestId('fp3d-sample').first().tap(); await toConfirm(w)
    const pic = await box(w.getByTestId('fp3d-picture'))
    ok(pic && pic.height <= 390 * 0.72, '844×390: the plan fits the screen’s height', pic && Math.round(pic.height))
    await shot(w, '13-confirm-sideways')
    await W.close()
  } finally { await b.close() }
  ok(errors.length === 0, 'no page errors', errors)
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
