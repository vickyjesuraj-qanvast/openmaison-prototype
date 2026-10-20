// Pending modules, package S43C · The owner's new sample rooms in the AI Visualizer (his "fix all the pending things", 2026-10-15; the pending
// ledger's F1-05). Each item asserted as the rule it builds, never another round's count:
//  - the three sample photos and the kitchen sketch are 1.0's 4a51f3522, byte for byte, on disk and as the server serves them
//  - every picture made from the old photos is made again from the new ones: the five looks a room, the bedroom's relit picture, the living
//    room's empty plate, the demo's edit + its golden hour + the two swatches, the welcome's after, the trial's two afters
//  - the demo's records say what the pictures show (repair R162): Kevin Ng's versions list the new rooms' surfaces and pieces, a look lists
//    its picks and is the room (not a whole-room picture), the sketch's render too; the client link's copy says the same; the two pins sit on
//    the walnut floor and the emerald sofa; the swatch materials carry their swatches' colours; the rooms' stored readings are the new ones
//  - in the editor (1440): the living room's pieces and its three walls are listed by their new names, a style card shows the room's own look,
//    a Japandi restyle is the engine's (its picks listed, its picture the engine's), the coffee table comes out over the rug, the bedroom's
//    golden hour is its relit picture, the sketch room opens on the owner's line drawing
//  - the client link, /site/try and the Visualizer at 1440 · 390 touch · 320: no sideways scroll, no page errors; shots to look at by eye
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3175 NODE_PATH=<repo>/node_modules node verify-pm2-s43c.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execSync } = require('child_process')
const sharp = require('sharp')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s43c')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3175'
const PUB = path.join(__dirname, '..', '..', '..', 'public')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const o = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return o ? JSON.parse(o) : [] }
const n = (q) => Number(sql(q) || 0)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex')

/* 1.0's 4a51f3522 — the owner's photos and sketch */
const OWNER = {
  'living-room/original.jpg': '02a0ca253760d49329859c63e0e4a42dd74016b1', 'bedroom/original.jpg': '984f66a1da017f3514640d4afa28fe85a8334c98',
  'kitchen/original.jpg': '7a642cedd56c3bb44006693a220d0a6b309435a5', 'kitchen/sketch.jpg': '05d9be36fe4644c92733469251127fc0a811622f',
}
/* the pictures as they stood before (made from 1.0's earlier photos) — none may still be there */
const BEFORE = {
  'visualizer/samples/living-room/scandinavian.jpg': 'b21a481868ef26397b80e0ebb1bc8b986a6c023a', 'visualizer/samples/living-room/industrial.jpg': '66a6569b2fc2f19c89d2f931b06aa90deceb2f63',
  'visualizer/samples/living-room/japandi.jpg': '5e3118b386949a8c28dacedccf0125de27bdd8c9', 'visualizer/samples/living-room/bohemian.jpg': 'a67eb8f7fe097eec477bc34b80fa91d10e0a50f0',
  'visualizer/samples/living-room/dubai-luxury.jpg': '367004d7cbf4a65573202383ce3341f60421703a', 'visualizer/samples/living-room/defurnished.jpg': 'b55db6a16a3efa500ceb4cee52f5515f25e1f238',
  'visualizer/samples/bedroom/scandinavian.jpg': '0bab47a0cea73eb4fd57d874408a1b4a65c2f2eb', 'visualizer/samples/bedroom/industrial.jpg': '19b73161e64811a639100689b9f76d6d05b1fe32',
  'visualizer/samples/bedroom/japandi.jpg': '0f18e9f38540d1c342c3a9c47e849a7160f9ef18', 'visualizer/samples/bedroom/bohemian.jpg': 'faee54d27c68f3bf7034bb09f195d22feb1b88a4',
  'visualizer/samples/bedroom/dubai-luxury.jpg': '1879720f6dbe4be2ddfe2c4e6c25d5b037feec5d', 'visualizer/samples/bedroom/relit-golden-hour.jpg': '71d2bc6976560fb1addd9f500456c425a2297b9c',
  'visualizer/samples/kitchen/scandinavian.jpg': '445826ede5586a29300250f9c17ce27077b1ea41', 'visualizer/samples/kitchen/industrial.jpg': '1bf7377f59b98cd0763ca6f978e1eda234b00af4',
  'visualizer/samples/kitchen/japandi.jpg': '628969880dcc35c67304e134b6008048b14fabd1', 'visualizer/samples/kitchen/bohemian.jpg': '208956f52a1187ae08fa6b7cf5037038ca8c1db1',
  'visualizer/samples/kitchen/dubai-luxury.jpg': 'c8d9d260d4e2d409b17fd7eedad51b9c863407a9',
  'visualizer/demo/living-room-edit.jpg': '045444fa59518f2831dbfd8c0caebdc65f264102', 'visualizer/demo/living-room-edit-golden-hour.jpg': '3fdeb554d8ba0f5d40e3b90e414d03aa35fa0e99',
  'visualizer/demo/swatch-oak.jpg': '1332ef567f412d63990073705391362799d13886', 'visualizer/demo/swatch-walnut.jpg': '56e31983d9b2844a9e03f399c3f0f5ba7cc86bbb',
  'visualizer/welcome/living-room-after.jpg': '9d67a11587287266d9cdf24f2011ab2640626afe',
  'site/try/materials-after.jpg': '712ac15b8d3b13012bde3df9117c60bedfcb29ed', 'site/try/furniture-after.jpg': '00889d050fec0d760b6c247ad4c654071193956d',
}
const OLD_LABELS = ['white painted back wall', 'white wall above the window', 'light oak floor', 'grey fabric sofa', 'oak coffee table', 'upholstered armchair', 'light grey painted back wall', 'oak timber floor', 'charcoal lower cabinets', 'oak upper cabinets', 'light grey tile floor']
const LEAD = sql(`select id from leads where name = 'Kevin Ng' order by created_at limit 1`)
const DESIGN = sql(`select id from visualizer_designs where lead_id = '${LEAD}' and kind = 'lead' and deleted_at is null limit 1`)
const SHOWROOM = sql(`select id from visualizer_designs where name = 'Showroom — kitchen concept' and deleted_at is null limit 1`)
const roomId = (design, name) => sql(`select id from project_rooms where design_id = '${design}' and name = '${name}' and deleted_at is null limit 1`)
const balance = () => n(`select plan_credits + topup_credits from studio_credit_balances where id = 'studio'`)
const ledgerSum = () => n(`select coalesce(sum(case when reason = 'shadow_spend' then 0 else credits end), 0) from credit_ledger`)
/** a picture's mean lightness (0…255) in a box (0…1) */
async function meanL(buf, [x0, y0, x1, y1]) {
  const m = await sharp(buf).metadata()
  const { data, info } = await sharp(buf).extract({ left: Math.round(x0 * m.width), top: Math.round(y0 * m.height), width: Math.round((x1 - x0) * m.width), height: Math.round((y1 - y0) * m.height) }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let s = 0; for (let i = 0; i < data.length; i += 3) s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  return s / (info.width * info.height)
}

;(async () => {
  console.log('1 · the owner’s photos, and every picture made from them')
  for (const [f, h] of Object.entries(OWNER)) ok(sha1(fs.readFileSync(path.join(PUB, 'visualizer/samples', f))) === h, `${f} is 1.0’s 4a51f3522 byte for byte`)
  for (const [f, h] of Object.entries(OWNER)) {
    const r = await fetch(`${BASE}/visualizer/samples/${f}`)
    ok(r.ok && sha1(Buffer.from(await r.arrayBuffer())) === h, `…and the server serves it (${f})`)
  }
  const stale = Object.entries(BEFORE).filter(([f, h]) => { try { return sha1(fs.readFileSync(path.join(PUB, f))) === h } catch { return true } }).map(([f]) => f)
  ok(!stale.length, `no picture made from the old photos is left (${stale.join(', ') || 'all made again'})`)
  for (const f of Object.keys(BEFORE)) { const m = await sharp(path.join(PUB, f)).metadata(); if (/samples\//.test(f) && (m.width !== 900 || m.height !== 603)) ok(false, `${f} is the photo’s size (${m.width}×${m.height})`) }
  ok(true, 'every sample picture is the photo’s 900 × 603')

  console.log('2 · the demo’s records say what the pictures show (R162)')
  const jobs = json(`select j.id, j.kind, j.variants_json as v, r.sample_key as k from render_jobs j join project_rooms r on r.id = j.room_id where r.design_id in ('${DESIGN}', '${SHOWROOM}')`)
  const labels = jobs.flatMap((j) => JSON.parse(j.v).flatMap((v) => [...(v.applied?.surfaces ?? []), ...(v.applied?.furniture ?? [])].map((x) => x.label)))
  ok(!labels.some((l) => OLD_LABELS.includes(l)), 'no version names a surface or piece of the old rooms')
  const edit = jobs.find((j) => j.kind === 'edit')
  const ev = edit ? JSON.parse(edit.v)[0] : null
  ok(!!ev && ['cream painted side wall', 'cream painted back wall', 'cream painted TV wall', 'beige stone floor'].every((l) => ev.applied.surfaces.some((s) => s.label === l)) && ev.applied.furniture.some((f) => f.label === 'cream bouclé sofa'), 'the edit: the three cream walls and the stone floor, the bouclé sofa in emerald velvet')
  const looks = jobs.filter((j) => j.kind === 'restyle' || j.kind === 'sketch').map((j) => ({ k: j.kind, v: JSON.parse(j.v)[0] }))
  ok(looks.length >= 3 && looks.every(({ v }) => !v.finishes.reshaped && v.applied.surfaces.length > 0 && Object.keys(v.finishes.surfaces).length === v.applied.surfaces.length), 'a look is the room restyled by the engine — its picks listed, never a whole-room picture')
  ok(looks.some(({ k, v }) => k === 'sketch' && v.finishes.fromSketch && v.imageUrl === '/visualizer/samples/kitchen/japandi.jpg'), 'the showroom sketch’s render: the kitchen in Japandi, from the sketch')
  const snaps = json(`select snapshot as s from render_share_links where design_id = '${DESIGN}'`).map((r) => r.s ?? '')
  ok(snaps.some((x) => /Cream Bouclé Sofa/.test(x)) && !snaps.some((x) => /Grey Fabric Sofa|White Wall above|Light Oak Floor/.test(x)), 'the client links’ copies name the owner’s room (the bouclé sofa), never the old one')
  const pins = json(`select author_role as r, x, y from render_annotations a join render_jobs j on j.id = a.job_id where j.id = '${edit?.id}'`)
  ok(pins.some((p) => p.r === 'studio' && p.x === 0.93 && p.y === 0.9) && pins.some((p) => p.r === 'client' && p.x === 0.4 && p.y === 0.62), 'the pins sit on the walnut floor and the emerald sofa')
  ok(sql(`select hex from studio_materials where id = 'sm-walnut-vinyl'`) === '#67483A' && sql(`select hex from studio_materials where id = 'sm-oak-veneer'`) === '#7D5D41', 'the swatch materials carry their swatches’ colours')
  const det = JSON.parse(sql(`select detection_json from project_rooms where id = '${roomId(DESIGN, 'Living room')}'`) || '{}')
  ok((det.surfaces ?? []).some((s) => s.label === 'cream painted side wall') && (det.furniture ?? []).length >= 14, 'Kevin Ng’s living room keeps the new reading')

  const b = await chromium.launch()
  const errors = []
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1400) }
  const shot = (p, nm) => p.screenshot({ path: path.join(dir, `${nm}.png`) })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const editor = async (p, design, room) => { await go(p, `/visualizer/${design}?room=${roomId(design, room)}`); if (await p.getByTestId('viz-hint').count()) { await p.getByRole('button', { name: 'Got it' }).click().catch(() => {}); await settle(p, 300) } }
  const original = async (p) => { await p.getByTestId('viz-version').first().click(); await settle(p, 600) }
  const runDone = async (p) => { await p.getByTestId('viz-running').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {}); await p.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 60000 }); await settle(p, 1200) }
  const newest = (design, room) => json(`select id, variants_json as v from render_jobs where room_id = '${roomId(design, room)}' order by created_at desc limit 1`)[0]

  /* what this probe writes, to put back */
  const jobsBefore = new Set(json(`select id from render_jobs`).map((r) => r.id))
  const ledgerBefore = new Set(json(`select id from credit_ledger`).map((r) => r.id))
  const balBefore = json(`select plan_credits as p, topup_credits as t, updated_at as u from studio_credit_balances where id = 'studio'`)[0]
  const statesBefore = json(`select id, state_json as s, detection_json as d, state_rev as r, assets_json as a, updated_at as u from project_rooms where design_id in ('${DESIGN}', '${SHOWROOM}')`)
  const designsBefore = json(`select id, custom_json as c, updated_at as u from visualizer_designs where id in ('${DESIGN}', '${SHOWROOM}')`)
  const notesBefore = new Set(json(`select id from notifications`).map((r) => r.id))
  const outboxBefore = new Set(json(`select id from notification_outbox`).map((r) => r.id))
  const viewsBefore = json(`select id, view_count as c, last_viewed_at as l from render_share_links where design_id = '${DESIGN}'`)
  const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)

  try {
    sql(`update members set is_you = (id = 'dane')`)
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await page(ctx, 'desk')
    await go(p, '/visualizer')

    console.log('3 · the editor on the owner’s living room (1440)')
    await editor(p, DESIGN, 'Living room'); await original(p)
    await shot(p, '01-living-room-original-1440')
    await p.getByTestId('viz-mode-furniture').click(); await settle(p, 500)
    const rows = (await p.getByTestId('viz-furniture-row').allInnerTexts()).join(' | ')
    ok(['Cream Bouclé Sofa', 'Olive Velvet Armchair', 'Travertine Coffee Table', 'Jute Area Rug', 'Wall-Mounted TV', 'Mushroom Table Lamp'].every((w) => rows.includes(w)), 'the furniture list names the owner’s room’s pieces')
    ok(!/Grey Fabric Sofa|Fiddle Leaf|Floor Lamp/.test(rows), '…and none of the old room’s')
    await shot(p, '02-living-room-furniture-1440')
    await p.getByTestId('viz-mode-surfaces').click(); await settle(p, 500)
    await p.getByRole('button', { name: 'Cream Painted Side Wall' }).click(); await settle(p, 1100)
    ok(((await p.getByTestId('viz-picker').locator('h2').textContent()) ?? '') === 'Walls' && (await p.getByTestId('viz-scope').getByRole('radio').count()) === 4, 'its square opens the walls: all three, or one at a time')
    ok(await p.getByTestId('viz-highlight').isVisible(), '…its region lit on the photo')
    await shot(p, '03-living-room-walls-1440')
    await p.keyboard.press('Escape'); await settle(p, 400)

    console.log('4 · a style card shows the room’s own look; a restyle is the engine’s')
    await p.getByTestId('viz-mode-style').click(); await settle(p, 500)
    const japandi = p.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).first()
    ok(/\/visualizer\/samples\/living-room\/japandi\.jpg$/.test((await japandi.locator('img').getAttribute('src').catch(() => '')) ?? ''), 'the Japandi card shows this room in Japandi')
    await shot(p, '04-living-room-styles-1440')
    await japandi.click(); await settle(p, 400)
    const bal0 = balance()
    await p.getByTestId('viz-generate').click(); await runDone(p)
    const rj = newest(DESIGN, 'Living room'), rv = rj ? JSON.parse(rj.v)[0] : null
    ok(!!rv && rv.applied.style === 'Japandi' && rv.applied.surfaces.length >= 5 && !rv.finishes.reshaped && !rv.applied.caveat, 'the restyle lists the picks it laid, on the room (no whole-room picture, nothing to say)')
    ok(bal0 - balance() === 10 && balance() === ledgerSum(), `…charged as a render, the balance the ledger’s sum (${bal0 - balance()})`)
    ok(/is ready/.test(await snackText(p)), '…and is ready')
    await shot(p, '05-living-room-japandi-1440')

    console.log('5 · the coffee table comes out over the rug')
    await original(p)
    await p.getByTestId('viz-mode-furniture').click(); await settle(p, 500)
    await p.getByTestId('viz-furniture-row').filter({ hasText: 'Travertine Coffee Table' }).click(); await settle(p, 700)
    await p.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Remove' }).click(); await settle(p, 300)
    await p.getByTestId('viz-generate').click(); await runDone(p)
    ok(/Coffee table taken out/.test(((await p.getByTestId('viz-stage-chip').textContent()) ?? '')), 'the version says “Coffee table taken out”')
    const tj = newest(DESIGN, 'Living room'), tv = tj ? JSON.parse(tj.v)[0] : null
    const pic = tv ? Buffer.from(await (await fetch(`${BASE}${tv.imageUrl}`, { headers: { cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ') } })).arrayBuffer()) : null
    const photo = fs.readFileSync(path.join(PUB, 'visualizer/samples/living-room/original.jpg'))
    const drumWas = await meanL(photo, [0.47, 0.72, 0.55, 0.78]), drumNow = pic ? await meanL(pic, [0.47, 0.72, 0.55, 0.78]).catch(() => 0) : 0
    const rugBeside = await meanL(photo, [0.6, 0.76, 0.7, 0.8])
    ok(drumNow > drumWas + 25 && Math.abs(drumNow - rugBeside) < 30, `where the walnut drum stood the rug is laid (lightness ${drumWas.toFixed(0)} → ${drumNow.toFixed(0)}, the rug beside ${rugBeside.toFixed(0)})`)
    await shot(p, '06-living-room-table-out-1440')

    console.log('6 · the bedroom’s golden hour is its relit picture; the kitchen sketch is the owner’s')
    await editor(p, DESIGN, 'Master bedroom'); await original(p)
    await shot(p, '07-bedroom-1440')
    await p.getByTestId('viz-mode-lighting').click(); await settle(p, 500)
    await p.getByRole('radio', { name: /Golden Hour/ }).first().click().catch(async () => { await p.getByText('Golden Hour', { exact: true }).first().click() }); await settle(p, 500)
    await p.getByTestId('viz-generate').click(); await runDone(p)
    const bj = newest(DESIGN, 'Master bedroom'), bv = bj ? JSON.parse(bj.v)[0] : null
    ok(!!bv && bv.imageUrl === '/visualizer/samples/bedroom/relit-golden-hour.jpg', `Golden Hour on the photo is the room’s relit picture (${bv?.imageUrl})`)
    await shot(p, '08-bedroom-golden-1440')
    await editor(p, SHOWROOM, 'Kitchen sketch'); await original(p)
    ok(await p.locator('[data-testid="viz-frame"] img[src*="/visualizer/samples/kitchen/sketch.jpg"]').count() >= 1, 'the sketch room opens on the owner’s line drawing')
    await shot(p, '09-kitchen-sketch-1440')
    await editor(p, DESIGN, 'Kitchen'); await original(p)
    await shot(p, '10-kitchen-1440')

    console.log('7 · Add room offers the owner’s photos')
    await editor(p, DESIGN, 'Living room')
    await p.getByTestId('viz-add-room').click(); await settle(p, 700)
    const srcs = await p.locator('[role="dialog"] img').evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''))
    ok(['living-room/original.jpg', 'bedroom/original.jpg', 'kitchen/original.jpg', 'kitchen/sketch.jpg'].every((f) => srcs.some((s) => s.endsWith(`/visualizer/samples/${f}`))), 'its sample tiles are the three photos and the sketch')
    await shot(p, '11-add-room-1440')
    await p.keyboard.press('Escape'); await settle(p, 400)

    console.log('8 · the client link, the trial and the Visualizer — 1440 · 390 touch · 320')
    /* R61's link to Kevin Ng: the edit, its golden hour and the bedroom */
    const token = sql(`select token from render_share_links where design_id = '${DESIGN}' and file_id is null and revoked_at is null and snapshot like '%living-room-edit.jpg%' order by created_at limit 1`)
    sql(`update render_share_links set expires_at = strftime('%s','now') + 5 * 86400 where token = '${token}' and expires_at < strftime('%s','now') + 86400`)
    const cctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const c = await page(cctx, 'client')
    await go(c, `/renders/${token}`)
    const ct = await c.locator('main').innerText().catch(() => '')
    ok(/Cream Bouclé Sofa/.test(ct) && /Walls/.test(ct), 'the client link lists what changed in the owner’s room')
    await shot(c, '12-client-link-1440')
    await go(c, '/site/try')
    const hero = await c.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''))
    ok(hero.some((s) => s.includes('/visualizer/samples/living-room/original.jpg')) && hero.some((s) => s.includes('/visualizer/welcome/living-room-after.jpg')), 'the trial’s live before / after is the owner’s living room, painted by the engine')
    ok(hero.some((s) => s.includes('/visualizer/samples/kitchen/sketch.jpg')) && hero.some((s) => s.includes('/visualizer/samples/living-room/defurnished.jpg')) && hero.some((s) => s.includes('/visualizer/samples/bedroom/relit-golden-hour.jpg')), '…its tool cards: the sketch, the empty plate, the golden hour')
    await shot(c, '13-site-try-1440')
    for (const [w, h, touch] of [[390, 844, true], [320, 640, true]]) {
      const m = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch })
      const q = await page(m, `phone-${w}`)
      await go(q, `/renders/${token}`)
      ok((await sideways(q)) <= 0, `the client link at ${w}: no sideways scroll`)
      if (w === 390) await shot(q, `14-client-link-${w}`)
      await go(q, '/site/try')
      ok((await sideways(q)) <= 0, `/site/try at ${w}: no sideways scroll`)
      if (w === 390) await shot(q, `15-site-try-${w}`)
      const sctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch })
      const s = await page(sctx, `studio-${w}`)
      await go(s, `/visualizer/${DESIGN}?room=${roomId(DESIGN, 'Living room')}`)
      if (await s.getByTestId('viz-hint').count()) { await s.getByRole('button', { name: 'Got it' }).click().catch(() => {}); await settle(s, 300) }
      ok((await sideways(s)) <= 0, `the editor at ${w}: no sideways scroll`)
      if (w === 390) await shot(s, `16-editor-${w}`)
      await go(s, '/visualizer')
      ok((await sideways(s)) <= 0, `the Visualizer at ${w}: no sideways scroll`)
      if (w === 390) await shot(s, `17-visualizer-${w}`)
      await m.close(); await sctx.close()
    }
    await cctx.close(); await ctx.close()
  } finally {
    /* put back what it wrote */
    const newJobs = json(`select id from render_jobs`).map((r) => r.id).filter((id) => !jobsBefore.has(id))
    if (newJobs.length) { const ids = newJobs.map((id) => `'${id}'`).join(','); sql(`delete from render_images where job_id in (${ids}); delete from render_jobs where id in (${ids})`) }
    for (const r of statesBefore) sql(`update project_rooms set state_json = ${lit(r.s)}, detection_json = ${lit(r.d)}, state_rev = ${r.r ?? 0}, assets_json = ${lit(r.a)}, updated_at = ${r.u} where id = '${r.id}'`)
    for (const d of designsBefore) sql(`update visualizer_designs set custom_json = ${lit(d.c)}, updated_at = ${d.u} where id = '${d.id}'`)
    const newLedger = json(`select id from credit_ledger`).map((r) => r.id).filter((id) => !ledgerBefore.has(id))
    if (newLedger.length) sql(`delete from credit_ledger where id in (${newLedger.map((id) => `'${id}'`).join(',')})`)
    if (balBefore) sql(`update studio_credit_balances set plan_credits = ${balBefore.p}, topup_credits = ${balBefore.t}, updated_at = ${balBefore.u} where id = 'studio'`)
    const newNotes = json(`select id from notifications`).map((r) => r.id).filter((id) => !notesBefore.has(id))
    if (newNotes.length) sql(`delete from notifications where id in (${newNotes.map((id) => `'${id}'`).join(',')})`)
    const newOutbox = json(`select id from notification_outbox`).map((r) => r.id).filter((id) => !outboxBefore.has(id))
    if (newOutbox.length) sql(`delete from notification_outbox where id in (${newOutbox.map((id) => `'${id}'`).join(',')})`)
    for (const v of viewsBefore) sql(`update render_share_links set view_count = ${v.c}, last_viewed_at = ${lit(v.l)} where id = '${v.id}'`)
    const backOk = balance() === ledgerSum() && json(`select id from render_jobs`).length === jobsBefore.size
    console.log(backOk ? '(put back: the jobs, rooms, ledger and balance as found)' : '(!) not everything went back')
    if (!backOk) fail++
    await b.close()
  }
  console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail || errors.length ? 1 : 0)
})()
