// Pending modules, step S20 · AI Visualizer (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:ai-visualizer — HEIC photos, Replace as she answered, the drift guard, the Maison AI suggestions, every other line as the card
// recommended). Each item asserted as the rule it builds, never a count from another round:
//  - HEIC on every browser: a phone's HEIC photo becomes a room (stored as a JPEG), a HEIC swatch opens in the swatch dialog and in Company ›
//    Materials, and a file with no type that isn't a picture is refused in plain words — Chromium draws no HEIC itself, so this walks 1.0's
//    converter (heic-to), loaded only when a HEIC lands; a HEIC uploaded to the lead's Files keeps its bytes, wears a drawn picture and opens
//    in the AI Visualizer as a room
//  - Replace as she answered (Q-21): the picker stays; the panel says the prototype can't draw a new piece in; Generate waits with the same
//    words and one link; "Recolour it to match" turns the pick into a Customize in one step (Undo and ⌘Z take it back); no version ever says
//    "Swapped for"
//  - the drift guard: a whole-room look whose camera moved (1.0's own kitchen in Scandinavian) is checked ("Checking the room’s shape"), lined
//    up again and charged as its own Render repair (2 AI credits under repair:<job>:<n>), said in the ready line, in Present and in Usage; an
//    edit is checked and charged nothing more; with no credits left for the repair the look is kept as it came and says why; the price of a
//    repair is said beside Generate's prices; Stop gives back every charge
//  - Maison AI: "Suggest … finishes" shows what it will pick with one button; the press picks them all as one step, with Undo
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width); shots at 1440, 390 touch, 768 touch and a phone held sideways
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s20.cjs <scratch.db> [shotDir] [base]
/* (pending modules S43C, a deliberate change of this rule) the AI Visualizer's living room is the owner's photo (1.0's 4a51f3522): its walls are
   'Cream Painted Side Wall' · 'Cream Painted Back Wall' · 'Cream Painted TV Wall', its sofa 'Cream Bouclé Sofa' (were 'White Painted Back Wall', 'Grey Fabric Sofa'). */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s20')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const FIX = path.join(__dirname, 'pm2-s20', 'fixtures')
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const n = (q) => Number(sql(q) || 0)
const only = (process.env.ONLY || '').split(',').filter(Boolean).map(Number)
const want = (k) => !only.length || only.includes(k)

const DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'   // Kevin Ng's design (R61)
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'     // Kevin Ng
const roomId = (name) => sql(`select id from project_rooms where design_id = '${DESIGN}' and name = '${name}' and deleted_at is null limit 1`)
const balance = () => n(`select plan_credits + topup_credits from studio_credit_balances where id = 'studio'`)
const ledgerSum = () => n(`select coalesce(sum(case when reason = 'shadow_spend' then 0 else credits end), 0) from credit_ledger`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1400) }
  const shot = (p, nm) => p.screenshot({ path: path.join(dir, `${nm}.png`) })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 900) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const chip = async (p) => ((await p.getByTestId('viz-stage-chip').textContent().catch(() => '')) ?? '').trim()
  const editor = async (p, room) => { await go(p, `/visualizer/${DESIGN}?room=${roomId(room)}`); const hint = p.getByTestId('viz-hint'); if (await hint.count()) { await p.getByRole('button', { name: 'Got it' }).click().catch(() => {}); await settle(p, 300) } }
  const original = async (p) => { await p.getByTestId('viz-version').first().click(); await settle(p, 600) }
  const runDone = async (p) => { await p.getByTestId('viz-running').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {}); await p.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 60000 }); await settle(p, 1200) }
  const pick = async (p, testId, file) => { const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 8000 }), p.getByTestId(testId).first().click()]); await fc.setFiles(file) }
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }

  /* what this probe writes, to put back */
  const jobsBefore = new Set(json(`select id from render_jobs`).map((r) => r.id))
  const roomsBefore = new Set(json(`select id from project_rooms`).map((r) => r.id))
  const ledgerBefore = new Set(json(`select id from credit_ledger`).map((r) => r.id))
  const balBefore = json(`select plan_credits as p, topup_credits as t, updated_at as u from studio_credit_balances where id = 'studio'`)[0]
  const designBefore = json(`select custom_json as c, updated_at as u from visualizer_designs where id = '${DESIGN}'`)[0]
  const statesBefore = json(`select id, state_json as s, detection_json as d, state_rev as r, assets_json as a, updated_at as u from project_rooms where design_id = '${DESIGN}'`)
  const materialsBefore = new Set(json(`select id from studio_materials`).map((r) => r.id))
  const notesBefore = new Set(json(`select id from notifications`).map((r) => r.id))
  const settingsBefore = json(`select key, value, updated_at as u from settings where key in ('credit_alerts')`)
  const outboxBefore = new Set(json(`select id from notification_outbox`).map((r) => r.id))
  const filesBefore = new Set(json(`select id from lead_files`).map((r) => r.id))
  const eventsBefore = new Set(json(`select id from lead_events`).map((r) => r.id))
  const consistent = () => balance() === ledgerSum()
  console.log(`(the studio’s credits: ${balance()} · the ledger’s sum ${ledgerSum()})`)

  try {
    sql(`update members set is_you = (id = 'dane')`)
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const p = await page(ctx, 'desk')
    await go(p, '/visualizer')   // one page first, then the snapshot habit (S08)

    // ── 1 · HEIC on every browser ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · HEIC photos — the converter where the browser can’t draw them')
      await editor(p, 'Living room')
      const can = await p.evaluate(async () => { try { const r = await fetch('/visualizer/samples/bedroom/original.jpg'); const blob = await r.blob(); return !!blob } catch { return false } })
      ok(can, 'the editor is open')
      const native = await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); try { await createImageBitmap(new Blob([bin], { type: 'image/heic' })); return true } catch { return false } }, fs.readFileSync(path.join(FIX, 'bedroom.heic')).toString('base64'))
      ok(!native, 'this browser draws no HEIC itself (Chromium) — the converter is what runs')
      const rooms0 = n(`select count(*) from project_rooms where design_id = '${DESIGN}' and deleted_at is null`)
      await p.getByTestId('viz-add-room').click(); await settle(p, 500)
      const roomInput = () => p.locator('[role="dialog"] [aria-label="Upload a room photo"] input[type="file"]').first()
      await roomInput().setInputFiles(path.join(FIX, 'bedroom.heic'))
      await p.waitForFunction((n0) => document.querySelectorAll('[data-testid="viz-rooms"] [role="radio"]').length > n0, rooms0, { timeout: 30000 }).catch(() => {})
      await settle(p, 1500)
      const rooms1 = n(`select count(*) from project_rooms where design_id = '${DESIGN}' and deleted_at is null`)
      const made = json(`select id, name, original_image_url as u from project_rooms where design_id = '${DESIGN}' and deleted_at is null order by created_at desc limit 1`)[0]
      ok(rooms1 === rooms0 + 1 && made && !roomsBefore.has(made.id), `a HEIC room photo becomes a room (${made?.name})`)
      const stored = made ? (made.u ?? '') : ''
      const pic = stored.startsWith('data:') ? stored : stored ? await p.evaluate(async (u) => { const r = await fetch(u); return `${r.headers.get('content-type')}` }, stored) : ''
      ok(/image\/jpeg/.test(pic), `…its photo is kept as a JPEG (${pic.slice(0, 30)})`)
      const drawn = await p.evaluate(() => { const i = document.querySelector('[data-testid="viz-frame"] img, [data-viz-body] img'); return i ? i.naturalWidth : 0 })
      ok(drawn > 0, `…and drawn on the canvas (${drawn} px wide)`)
      ok(!/HEIC/.test(await snackText(p)) || /Opening the HEIC/.test(await snackText(p)), 'no refusal on the way')
      await shot(p, '01-heic-room-1440')
      /* a HEIC swatch: the swatch dialog opens with its picture */
      await p.getByTestId('viz-mode-surfaces').click(); await settle(p, 400)
      await p.getByTestId('viz-surface-group').first().click(); await settle(p, 800)
      await pick(p, 'viz-upload-swatch', path.join(FIX, 'swatch.heic'))
      const dlg = p.getByRole('dialog', { name: 'Add a material' })
      await dlg.waitFor({ timeout: 20000 }).catch(() => {})
      const sw = await dlg.locator('img').first().getAttribute('src').catch(() => null)
      ok(!!sw && /^data:image\/jpeg/.test(sw), 'a HEIC swatch opens in the swatch dialog as a JPEG')
      ok(/Renders as #[0-9A-F]{6}/i.test(await dlg.innerText().catch(() => '')), '…with the colour it renders as')
      await dlg.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      /* a file with no type that isn't a picture: refused in plain words */
      await p.getByTestId('viz-add-room').click(); await settle(p, 500)
      await roomInput().setInputFiles({ name: 'scan', mimeType: '', buffer: Buffer.from('not a picture at all') })
      await settle(p, 2500)
      ok(/Couldn’t read that photo/.test(await snackText(p)) && n(`select count(*) from project_rooms where design_id = '${DESIGN}' and deleted_at is null`) === rooms1, 'a file with no type that isn’t a picture: “Couldn’t read that photo”, no room made')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* Company › Materials: a HEIC swatch photo */
      await go(p, '/company/materials')
      await p.getByRole('button', { name: 'New material' }).first().click(); await settle(p, 700)
      const md = p.getByRole('dialog', { name: 'New material' })
      const [fc2] = await Promise.all([p.waitForEvent('filechooser'), md.getByRole('button', { name: 'Upload a photo' }).click()])
      await fc2.setFiles(path.join(FIX, 'swatch.heic')); await settle(p, 2500)
      const well = await md.locator('[class*="wellPic"]').first().evaluate((e) => e.style.background || e.style.backgroundImage).catch(() => '')
      ok(/url\("data:image\/jpeg/.test(well) && /Swatch photo/.test(await md.innerText()), 'Company › Materials: a HEIC swatch photo lands in the photo well')
      const hexes = (await md.locator('input').evaluateAll((els) => els.map((e) => e.value))).filter((v) => /^#[0-9a-f]{6}$/i.test(v))
      ok(hexes.length >= 1 && hexes.every((h) => !/^#BFBFBF$/i.test(h)), `…and its colour is read off it (${hexes.join(' ')})`)
      await shot(p, '01-heic-material-1440')
      await md.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      ok(n(`select count(*) from studio_materials`) === materialsBefore.size, '…nothing saved until Add material')
    }

    // ── 6 · a HEIC kept in a lead's Files shows, and opens in the AI Visualizer ───────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · A HEIC in the lead’s Files — its own bytes kept, its picture drawn, opened as a room')
      await go(p, `/leads/${LEAD}/files`)
      await p.getByTestId('files-picker').setInputFiles({ name: 'site-bedroom.heic', mimeType: 'image/heic', buffer: fs.readFileSync(path.join(FIX, 'bedroom.heic')) })
      await p.waitForFunction(() => [...document.querySelectorAll('body *')].some((e) => e.textContent === 'site-bedroom.heic'), null, { timeout: 30000 }).catch(() => {})
      await settle(p, 2500)
      const f = json(`select id, mime, thumb, size_bytes as size from lead_files where lead_id = '${LEAD}' and name = 'site-bedroom.heic' and deleted_at is null order by created_at desc limit 1`)[0]
      const raw = f ? json(`select substr(data, 1, 30) as d from lead_file_images where file_id = '${f.id}'`)[0] : null
      ok(!!f && f.mime === 'image/heic' && /^data:image\/heic/.test(raw?.d ?? ''), 'its own bytes are kept, as uploaded (image/heic)')
      ok(!!f && /^\/files\/thumb\//.test(f.thumb ?? ''), '…and it wears a picture drawn of it')
      const shown = f ? await p.evaluate(async (u) => { const i = new Image(); i.src = u; await i.decode().catch(() => {}); return i.naturalWidth }, f.thumb) : 0
      ok(shown >= 900, `…a JPEG the browser shows (${shown} px wide)`)
      await shot(p, '06-heic-in-files-1440')
      const rooms0 = n(`select count(*) from project_rooms where design_id = '${DESIGN}' and deleted_at is null`)
      await go(p, `/visualizer/${DESIGN}?file=${f?.id}`)
      await p.waitForFunction((n0) => document.querySelectorAll('[data-testid="viz-rooms"] [role="radio"]').length > n0, rooms0, { timeout: 30000 }).catch(() => {})
      await settle(p, 1500)
      const made = json(`select source_file_id as s from project_rooms where design_id = '${DESIGN}' and deleted_at is null order by created_at desc limit 1`)[0]
      ok(n(`select count(*) from project_rooms where design_id = '${DESIGN}' and deleted_at is null`) === rooms0 + 1 && made?.s === f?.id, 'Open in AI Visualizer: the HEIC becomes a room of the lead’s design')
      if (f) sql(`delete from lead_file_images where file_id = '${f.id}'; delete from lead_file_thumbs where file_id = '${f.id}'; delete from lead_files where id = '${f.id}'`)
    }

    // ── 2 · Replace as she answered ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Replace — the picker stays, the prototype says it can’t draw a new piece, one press recolours')
      await editor(p, 'Living room'); await original(p)
      await p.getByTestId('viz-mode-furniture').click(); await settle(p, 400)
      await p.getByTestId('viz-furniture-row').filter({ hasText: 'Cream Bouclé Sofa' }).click(); await settle(p, 600)
      await p.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Replace' }).click(); await settle(p, 400)
      const held = await p.getByTestId('viz-replace-held').innerText().catch(() => '')
      ok(/This is the prototype, so a new piece can’t be drawn into the photo/.test(held) && /image model/.test(held), 'the panel says it plainly, before anything is picked')
      ok(await p.getByTestId('viz-recolour').isDisabled(), '…Recolour it to match waits for a pick')
      await p.locator('[data-viz-opts]').first().getByRole('radio').first().click(); await settle(p, 400)
      const gen = p.getByTestId('viz-generate')
      ok(await gen.isDisabled(), 'with a Quick pick, Generate waits')
      const reason = await p.locator('[data-testid="viz-reason-link"]').locator('xpath=..').innerText().catch(() => '')
      ok(/This is the prototype, so a new sofa can’t be drawn into the photo/.test(reason) && (await p.getByTestId('viz-reason-link').innerText()) === 'recolour it to match', `…with the same words and one link (“${reason.slice(0, 90)}”)`)
      await shot(p, '02-replace-held-1440')
      await p.getByTestId('viz-recolour').click(); await settle(p, 700)
      ok((await p.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Customize' }).getAttribute('aria-checked')) === 'true', 'Recolour it to match: the sofa is a Customize now')
      ok(/The sofa takes the pick’s colour/.test(await snackText(p)), '…said once, with Undo')
      ok(await gen.isEnabled(), '…and Generate can run')
      const cap = await p.getByTestId('viz-furniture-row').filter({ hasText: 'Cream Bouclé Sofa' }).innerText()
      ok(/Customize ·/.test(cap), `…its row reads ${cap.replace(/\s+/g, ' ').slice(0, 60)}`)
      await p.keyboard.press('Meta+z'); await settle(p, 500)
      ok((await p.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Replace' }).getAttribute('aria-checked')) === 'true' && await gen.isDisabled(), '⌘Z puts the Replace back')
      await p.getByTestId('viz-reason-link').click(); await settle(p, 700)
      ok((await p.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Customize' }).getAttribute('aria-checked')) === 'true', 'the Generate bar’s link recolours too')
      await gen.click(); await runDone(p)
      const label = await chip(p)
      ok(/^V\d+/.test(label) && !/Swapped/i.test(label), `the version says what it is (${label})`)
      const newest = json(`select variants_json as v from render_jobs where room_id = '${roomId('Living room')}' order by created_at desc limit 1`)[0]
      const vs = newest ? JSON.parse(newest.v) : []
      ok(vs.length && vs.every((v) => (v.applied?.furniture ?? []).every((f) => !/Swapped/i.test(f.desc ?? '')) && (v.applied?.furniture ?? []).some((f) => f.action === 'customize')), '…on its record: a Customize, never “Swapped for”')
    }

    // ── 3 · the drift guard ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · The drift guard — checked; nothing to line up, nothing more charged')
      /* (pending modules S43C, a deliberate change of this rule) the sample rooms are the owner's photos and their looks the engine's own
         restyle, which never moves the camera — 1.0's Scandinavian kitchen that did is gone with 1.0's photos. The guard still checks every
         restyle, says what a repair would cost, and charges nothing when there is nothing to line up; its repair is checked on a look moved
         on purpose in scripts/viz/drift-test.mts §4. */
      await editor(p, 'Kitchen'); await original(p)
      await p.getByTestId('viz-mode-style').click(); await settle(p, 400)
      await p.getByTestId('viz-style-card').filter({ hasText: 'Scandinavian' }).click(); await settle(p, 400)
      await p.getByTestId('viz-options-toggle').click(); await settle(p, 300)
      const note = await p.getByTestId('viz-repair-note').innerText().catch(() => '')
      ok(/lined up with your photo again — 2 AI credits a version/.test(note), 'beside Generate’s prices: what a repair costs')
      await shot(p, '03-repair-price-1440')
      await p.getByTestId('viz-options-toggle').click(); await settle(p, 200)
      const bal0 = balance()
      const steps = new Set()
      await p.getByTestId('viz-generate').click()
      const t0 = Date.now()
      while (Date.now() - t0 < 40000) { const t = await p.getByTestId('viz-running').innerText({ timeout: 500 }).catch(() => null); if (t === null && steps.size) break; if (t) steps.add(t.replace(/\s+/g, ' ')); await p.waitForTimeout(150) }
      await p.waitForFunction(() => /is ready/.test(document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {})
      ok([...steps].some((s) => /Checking the room’s shape/.test(s)), 'the progress card checks the room’s shape before it keeps the version')
      const snack = await snackText(p)
      await shot(p, '03-ready-restyle-1440')
      await settle(p, 600)
      ok(/is ready/.test(snack) && !/lined up/.test(snack), `the ready line says nothing of a repair (“${snack.slice(0, 80)}”)`)
      const job = json(`select id, variants_json as v from render_jobs where room_id = '${roomId('Kitchen')}' order by created_at desc limit 1`)[0]
      const v1 = job ? JSON.parse(job.v)[0] : null
      ok(!!job && n(`select count(*) from credit_ledger where ref_id like 'repair:${job.id}:%'`) === 0 && bal0 - balance() === 10 && consistent(), `a restyle keeps its camera: the render charged (${bal0 - balance()} AI credits), no repair, the balance still the ledger’s sum`)
      ok(!!v1 && !v1.applied?.repair && (v1.applied?.surfaces ?? []).length > 0 && /^\/visualizer\/img\/v\//.test(v1.imageUrl), '…the version is the engine’s restyle of the photo, its picks listed')
      await p.getByTestId('viz-present-open').click(); await settle(p, 900)
      ok((await p.getByTestId('viz-present-repair').count()) === 0, 'Present lists what changed, no repair line')
      await p.keyboard.press('Escape'); await settle(p, 500)
      /* an edit is checked too, and charges nothing more */
      await editor(p, 'Living room'); await original(p)
      await p.getByTestId('viz-mode-surfaces').click(); await settle(p, 400)
      await p.getByTestId('viz-surface-group').first().click(); await settle(p, 900)
      await p.getByTestId('viz-swatch').nth(2).click(); await settle(p, 300)
      const bal1 = balance()
      await p.getByTestId('viz-generate').click(); await runDone(p)
      const ej = json(`select id from render_jobs where room_id = '${roomId('Living room')}' order by created_at desc limit 1`)[0]
      ok(!!ej && n(`select count(*) from credit_ledger where ref_id like 'repair:${ej.id}:%'`) === 0 && bal1 - balance() === 10, `an edit keeps its camera: no repair charged (${bal1 - balance()} AI credits, the render’s)`)
      ok(!/lined up/.test(await snackText(p)), '…and its ready line says nothing of one')
      /* (pending modules S43C, a deliberate change) exactly the render's price left: the restyle runs — a check that finds nothing to line up
         costs nothing, so it never needs credits it can't find */
      const [bal] = json(`select plan_credits as p, topup_credits as t from studio_credit_balances where id = 'studio'`)
      const left = 10, nowS = Math.floor(Date.now() / 1000)
      sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) values ('${crypto.randomUUID()}', null, 'adjust', ${left - (bal.p + bal.t)}, ${left}, 'adjust', 'demo', ${nowS}); update studio_credit_balances set plan_credits = ${left}, topup_credits = 0, updated_at = ${nowS} where id = 'studio'`)
      await editor(p, 'Kitchen'); await original(p)
      await p.getByTestId('viz-mode-style').click(); await settle(p, 400)
      await p.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).click(); await settle(p, 400)
      await p.getByTestId('viz-generate').click(); await runDone(p)
      const kj = json(`select id, variants_json as v from render_jobs where room_id = '${roomId('Kitchen')}' order by created_at desc limit 1`)[0]
      const kv = kj ? JSON.parse(kj.v)[0] : null
      ok(!!kv && !kv.applied?.repair && !kv.applied?.caveat && kv.applied?.style === 'Japandi', 'the last 10 AI credits: the restyle is made and kept, nothing said of a repair')
      ok(balance() === 0 && consistent() && n(`select count(*) from credit_ledger where ref_id like 'repair:${kj?.id}:%'`) === 0, '…the render charged, no repair taken')
      /* back to the studio's credits */
      sql(`insert into credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) values ('${crypto.randomUUID()}', null, 'adjust', ${bal.p + bal.t}, ${bal.p + bal.t}, 'adjust', 'demo', ${nowS}); update studio_credit_balances set plan_credits = ${bal.p}, topup_credits = ${bal.t}, updated_at = ${nowS} where id = 'studio'`)
      /* Stop gives back every charge taken */
      await editor(p, 'Kitchen'); await original(p)
      await p.getByTestId('viz-mode-style').click(); await settle(p, 400)
      await p.getByTestId('viz-style-card').filter({ hasText: 'Scandinavian' }).click(); await settle(p, 400)
      /* (S46 closing regression, 2026-10-19) the engine's restyle can finish before Stop is pressed (S42D's probe met the same): Stop is pressed
         the moment it shows, and a run that finished first is tried once more from the original with the style picked again */
      let bal2 = balance(), pressed = false
      for (let tries = 0; tries < 3 && !pressed; tries++) {
        bal2 = balance()
        await p.getByTestId('viz-generate').click()
        await p.getByTestId('viz-running').waitFor({ timeout: 6000 }).catch(() => {})
        pressed = await p.getByTestId('viz-running').getByRole('button', { name: /Cancel|Stop/ }).click({ timeout: 3000 }).then(() => true, () => false)
        if (!pressed) {
          await settle(p, 2500); await original(p)
          await p.getByTestId('viz-mode-style').click(); await settle(p, 400)
          await p.getByTestId('viz-style-card').filter({ hasText: 'Scandinavian' }).click(); await settle(p, 400)
        }
      }
      await settle(p, 2500)
      ok(pressed && balance() === bal2 && /Stopped — nothing was kept or charged/.test(await snackText(p)), 'Stop: nothing kept, every charge given back')
    }

    // ── 4 · Maison AI: Suggest finishes picks them, behind Undo ──────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Maison AI — Suggest finishes shows the picks, one button picks them all, Undo')
      await editor(p, 'Living room'); await original(p)
      await fab(p)
      const s = sheet(p)
      const label = (await s.locator('button[class*="suggestion"]').allInnerTexts()).find((t) => /^Suggest .*finishes for the living room/.test(t))
      ok(!!label, `the suggestion is there (${label})`)
      await s.getByRole('button', { name: label, exact: true }).click(); await settle(p, 900)
      const prop = s.locator('[data-testid="maison-proposal"]')
      const words = await prop.innerText().catch(() => '')
      ok(await prop.count() === 1 && /Walls ·/.test(words) && /nothing renders until you Generate/.test(words), 'it shows what it will pick before it picks')
      const confirm = await s.locator('[data-testid="maison-confirm"]').innerText().catch(() => '')
      ok(/^Pick (these \d+ finishes|this finish)$/.test(confirm), `…with one button (${confirm})`)
      await shot(p, '04-maison-finishes-1440')
      await s.locator('[data-testid="maison-confirm"]').click(); await settle(p, 1200)
      const changes = await p.getByTestId('viz-change').count()
      ok(changes >= 1 && /finish(es)? picked — .*’s/.test(await snackText(p)), `the finishes wait with the picks (${changes}), said with Undo`)
      ok(await p.getByTestId('viz-picker').count() === 1, '…Surfaces opens on the first so they show')
      await undo(p)
      ok(await p.getByTestId('viz-change').count() === 0, 'Undo takes them all back as one step')
    }

    // ── 5 · every width ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Every width — the phone, the tablet, a phone on its side, 320')
      for (const [w, h, tag] of [[390, 844, '390'], [768, 1024, '768'], [844, 390, 'sideways'], [320, 640, '320']]) {
        const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
        const q = await page(c, tag)
        await go(q, `/visualizer/${DESIGN}?room=${roomId('Living room')}`)
        if (await q.getByTestId('viz-hint').count()) { await q.getByRole('button', { name: 'Got it' }).click().catch(() => {}); await settle(q, 300) }
        await q.getByTestId('viz-version').first().click().catch(() => {}); await settle(q, 500)
        await q.getByTestId('viz-mode-furniture').click(); await settle(q, 900)
        await q.getByTestId('viz-furniture-row').filter({ hasText: 'Cream Bouclé Sofa' }).click(); await settle(q, 700)
        await q.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Replace' }).click(); await settle(q, 500)
        await q.getByTestId('viz-replace-held').scrollIntoViewIfNeeded().catch(() => {})
        ok(await q.getByTestId('viz-replace-held').isVisible(), `${tag}: the honest line shows in the panel`)
        const over = await sideways(q)
        ok(over <= 0, `${tag}: no sideways scroll (${over})`)
        await shot(q, `05-replace-${tag}`)
        await q.getByTestId('viz-furniture-actions').getByRole('radio', { name: 'Replace' }).click(); await settle(q, 300)
        await c.close()
      }
      const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
      const q2 = await page(c2, '390-materials')
      await go(q2, '/company/materials')
      ok(await sideways(q2) <= 0, '390: Company › Materials, no sideways scroll')
      await c2.close()
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    /* put back what it wrote */
    const newJobs = json(`select id from render_jobs`).map((r) => r.id).filter((id) => !jobsBefore.has(id))
    if (newJobs.length) { const ids = newJobs.map((id) => `'${id}'`).join(','); sql(`delete from render_images where job_id in (${ids}); delete from lead_file_renders where render_key like '%'  and substr(render_key, 1, 36) in (${ids}); delete from render_jobs where id in (${ids})`) }
    const newRooms = json(`select id from project_rooms`).map((r) => r.id).filter((id) => !roomsBefore.has(id))
    if (newRooms.length) sql(`delete from project_rooms where id in (${newRooms.map((id) => `'${id}'`).join(',')})`)
    for (const r of statesBefore) sql(`update project_rooms set state_json = ${r.s === null ? 'NULL' : `'${String(r.s).replace(/'/g, "''")}'`}, detection_json = ${r.d === null ? 'NULL' : `'${String(r.d).replace(/'/g, "''")}'`}, state_rev = ${r.r ?? 0}, assets_json = ${r.a === null ? 'NULL' : `'${String(r.a).replace(/'/g, "''")}'`}, updated_at = ${r.u ?? 'NULL'} where id = '${r.id}'`)
    if (designBefore) sql(`update visualizer_designs set custom_json = ${designBefore.c === null ? 'NULL' : `'${String(designBefore.c).replace(/'/g, "''")}'`}, updated_at = ${designBefore.u ?? 'NULL'} where id = '${DESIGN}'`)
    const newLedger = json(`select id from credit_ledger`).map((r) => r.id).filter((id) => !ledgerBefore.has(id))
    if (newLedger.length) sql(`delete from credit_ledger where id in (${newLedger.map((id) => `'${id}'`).join(',')})`)
    if (balBefore) sql(`update studio_credit_balances set plan_credits = ${balBefore.p}, topup_credits = ${balBefore.t}, updated_at = ${balBefore.u} where id = 'studio'`)
    const newMaterials = json(`select id from studio_materials`).map((r) => r.id).filter((id) => !materialsBefore.has(id))
    if (newMaterials.length) sql(`delete from studio_materials where id in (${newMaterials.map((id) => `'${id}'`).join(',')})`)
    const newNotes = json(`select id from notifications`).map((r) => r.id).filter((id) => !notesBefore.has(id))
    if (newNotes.length) sql(`delete from notifications where id in (${newNotes.map((id) => `'${id}'`).join(',')})`)
    for (const s of settingsBefore) sql(`update settings set value = '${String(s.value).replace(/'/g, "''")}', updated_at = ${s.u ?? 'NULL'} where key = '${s.key}'`)
    if (!settingsBefore.some((s) => s.key === 'credit_alerts')) sql(`delete from settings where key = 'credit_alerts'`)   // the out-of-credits heads-up the low balance raised
    const newOutbox = json(`select id from notification_outbox`).map((r) => r.id).filter((id) => !outboxBefore.has(id))
    if (newOutbox.length) sql(`delete from notification_outbox where id in (${newOutbox.map((id) => `'${id}'`).join(',')})`)
    const newFiles = json(`select id from lead_files`).map((r) => r.id).filter((id) => !filesBefore.has(id))
    if (newFiles.length) { const ids = newFiles.map((id) => `'${id}'`).join(','); sql(`delete from lead_file_images where file_id in (${ids}); delete from lead_file_thumbs where file_id in (${ids}); delete from lead_files where id in (${ids})`) }
    const newEvents = json(`select id from lead_events`).map((r) => r.id).filter((id) => !eventsBefore.has(id))
    if (newEvents.length) sql(`delete from lead_events where id in (${newEvents.map((id) => `'${id}'`).join(',')})`)
    const backOk = balance() === ledgerSum() && json(`select id from render_jobs`).length === jobsBefore.size
    console.log(backOk ? '(put back: the jobs, rooms, ledger and balance as found)' : '(!) not everything went back')
    if (!backOk) fail++
    await b.close()
  }
  console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail || errors.length ? 1 : 0)
})()
