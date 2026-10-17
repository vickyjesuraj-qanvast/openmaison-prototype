// Pending modules, step S11 · Quote templates leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:quote-templates). Each pending line asserted as the rule it builds, never another round's count:
//  1. the faces a template names print in their own files on every computer — the curated web faces self-hosted (+ Outfit, 1.0's sixth),
//     Inter the app's own; the font boxes list Outfit
//  2. a studio's own fonts: Brand kit › Fonts › Your own fonts — Upload a font (a font file only, up to 2 MB, a name that isn't a curated
//     face, the licence ticked; the dialog closes once it is kept), the family in every font list and printing through /files/font/<id>,
//     Remove with Undo (the file stops being served, Undo brings it back), where it is used; Designers read the list, never upload or remove
//  3. an issuing entity's own look on its quotes: its contacts, tagline and footer line wherever the template names the studio's
//     ({studio_footer} new), its accent where the template uses the kit's Accent; the studio's own quotes keep the kit's
//  4. 1.0's five cover looks under the cover's More options: a look replaces the cover in one step with an Undo snackbar (one line at a
//     time); an empty photo place says so and prints nothing
//  5. Upload my existing quote reads a PDF's own words by rule: its paper, its table's columns in its words, its grouping, its grand total's
//     words ride to the new template; a photo is not read and says so (S43B — never matched by its name); a PDF with nothing to match says so; a large file is kept
//     with the editor's Match (the server action takes it inside one object)
//  6. the invoice and PO paper's one home stays Settings › Finance; the Brand kit has the door, landing on the paper with Back
//  7. Maison AI in the quote template editor answers (S10's sheets, checked once)
//  8. 390 and 320: the fonts list, the upload sheet and Upload my existing quote inside the screen (against screen.width); no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s11.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s11')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const REPO = path.resolve(__dirname, '..', '..', '..')
const UAT = path.join(REPO, 'public', 'uat-files')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${q.replace(/"/g, '\\"')}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s11-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const id = (q) => sql(q).split('\n')[0]
/* the demo's records */
const DEFAULT_TPL = id(`select id from quote_templates where deleted_at is null and is_default = 1 limit 1`)
const COVER_TPL = id(`select id from quote_templates where deleted_at is null and coalesce(draft_json, design_json) like '%"kind":"cover"%' limit 1`)
const Q1 = id(`select id from quotes where number = 'OM-10001'`)
const ENTITY = { id: 'entity-commercial', name: 'Demo Studio Commercial Pte Ltd', bankName: 'OCBC', accountName: 'Demo Studio Commercial Pte Ltd', accountNo: '501-123456-001', payNow: '202012345K', payNowQr: null, gstRegistered: true, swift: 'OCBCSGSG', logo: null, address: '', uen: '202012345K', gstReg: '202012345K',
  tagline: 'Offices and shops, done right', phone: '+65 6111 2222', email: 'commercial@demostudio.sg', website: 'commercial.demostudio.sg', accent: '#00897B', footer: 'Demo Studio Commercial Pte Ltd · a member of Demo Studio' }
const FONT_FILE = fs.readFileSync(path.join(REPO, 'public', 'fonts', 'doc', 'lato-normal-700.woff2'))
/* a quote PDF past a server action's 1,000,000-character bare-string limit once it is a data URL: the Cove quote padded with a comment */
const bigPdf = () => { const pdf = fs.readFileSync(path.join(UAT, 'cove-interior-quotation.pdf')); return Buffer.concat([pdf, Buffer.from('\n%' + 'x'.repeat(1_200_000) + '\n')]) }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const fontReqs = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1200) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const page = async (ctx, tag) => {
    const p = await ctx.newPage()
    p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
    p.on('response', (r) => { if (/\/fonts\/doc\/|\/files\/font\//.test(r.url())) fontReqs.push(`${r.status()} ${r.url().replace(BASE, '')}`) })
    return p
  }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const loaded = (p, family) => p.evaluate(async (f) => { await document.fonts.ready; return [...document.fonts].some((x) => x.family.replace(/"/g, '') === f && x.status === 'loaded') }, family)
  const pickSelect = async (scope, label, option) => { await scope.getByRole('combobox', { name: label }).first().click(); await scope.page().getByRole('option', { name: option, exact: true }).click() }
  const selectOptions = async (scope, label) => { await scope.getByRole('combobox', { name: label }).first().click(); const all = await scope.page().getByRole('option').allInnerTexts(); await scope.page().keyboard.press('Escape'); return all.map((s) => s.trim()) }
  const draftOf = (tid) => JSON.parse(sql(`select coalesce(draft_json, '{}') from quote_templates where id = '${tid}'`)).design ?? null

  const you0 = sql(`select id from members where is_you = 1`)
  let kept = []
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
  }

  try {
    as('dane')
    const ctx = await desk()
    const p = await page(ctx, 'desk')
    /* open one page and wait before any snapshot (the probe habit after S08) */
    await go(p, '/company/templates/brand')
    kept = ['studio_fonts', 'settings', 'quote_templates', 'quote_template_versions', 'quotes'].map((t) => [t, json(`select * from ${t}`)])

    // ── 1 · the faces print as named ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · The faces a template names print in their own files — Outfit among them')
      const heading = p.locator('#type')
      const opts = await selectOptions(heading.locator('[class*="role"]').first(), 'Font')
      ok(['Inter', 'Montserrat', 'Lato', 'Outfit', 'Playfair Display', 'Fraunces', 'Arial', 'Times New Roman'].every((f) => opts.includes(f)), `the Heading font box lists the curated faces and Outfit (${opts.length})`)
      await pickSelect(heading.locator('[class*="role"]').first(), 'Font', 'Outfit'); await settle(p, 1200)
      ok(await loaded(p, 'Outfit'), 'picked, Outfit is drawn from its own file (loaded on this page)')
      ok(fontReqs.some((r) => /^200 \/fonts\/doc\/outfit-/.test(r)), 'the Outfit file is served from the app (public/fonts/doc)')
      await p.getByRole('button', { name: 'Discard' }).click(); await settle(p, 400)
      await go(p, `/templates/${COVER_TPL}`)
      ok(await loaded(p, 'Fraunces'), 'a template set in Fraunces draws it from its own file in the editor')
      const fam = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-page] [data-block-id] *')].find((n) => n.childNodes.length === 1 && n.firstChild?.nodeType === 3 && getComputedStyle(n).fontFamily.includes('Inter')); return el ? getComputedStyle(el).fontFamily : '' })
      const first = fam.split(',')[0]?.trim().replace(/['"]/g, '') ?? ''
      ok(!!first && await p.evaluate((f) => [...document.fonts].some((x) => x.family.replace(/['"]/g, '') === f && x.status === 'loaded'), first), `Inter in a template is the app's own loaded Inter (${first || 'none'})`)
    }

    // ── 2 · the studio's own fonts ───────────────────────────────────────────────────────────────────────────────────────────────
    let fontId = null
    if (want(2)) {
      console.log('2 · Your own fonts — upload, the lists, the file, remove with Undo, who may')
      await go(p, '/company/templates/brand')
      const own = p.getByTestId('own-fonts')
      await own.scrollIntoViewIfNeeded()
      ok(await own.getByTestId('own-fonts-none').count() === 1, 'none uploaded yet: the list says so')
      await p.getByTestId('font-upload-open').click(); await settle(p, 500)
      const dlg = p.getByTestId('font-upload-dialog')
      ok(await dlg.isVisible(), 'Upload a font opens its dialog')
      await shot(p, '01-upload-dialog-1440')
      await p.getByTestId('font-upload-submit').click(); await settle(p, 300)
      ok(/Choose the font file/.test(await dlg.innerText()), 'Upload with no file says to choose one')
      await p.getByTestId('font-upload-input').setInputFiles({ name: 'notes.woff2', mimeType: 'font/woff2', buffer: Buffer.from('this is not a font at all') }); await settle(p, 500)
      ok(/That file isn’t a font/.test(await dlg.innerText()), 'a file that isn’t a font is refused by its bytes, not its name')
      await p.getByTestId('font-upload-input').setInputFiles({ name: 'Brandon-Bold.woff2', mimeType: 'font/woff2', buffer: FONT_FILE }); await settle(p, 900)
      ok(await dlg.getByLabel('Font name').inputValue() === 'Brandon' && /Bold/.test(await dlg.getByRole('combobox', { name: 'Weight' }).innerText()), 'the file’s name suggests the font name and its weight (Brandon · Bold)')
      ok(await p.getByTestId('font-upload-sample').getAttribute('data-ready') === '', 'the sample is drawn in the picked file')
      await dlg.getByLabel('Font name').fill('Inter'); await p.getByTestId('font-upload-submit').click(); await settle(p, 300)
      ok(/one of the fonts already in the list/.test(await dlg.innerText()), 'a curated face’s name is refused for an upload')
      await dlg.getByLabel('Font name').fill('Brandon'); await p.getByTestId('font-upload-submit').click(); await settle(p, 600)
      ok(/Tick that the studio may use this font/.test(await dlg.innerText()) && Number(sql(`select count(*) from studio_fonts`)) === 0, 'without the licence ticked nothing is kept, and the dialog says why')
      await dlg.locator('label').filter({ hasText: 'The studio has the licence' }).click(); await settle(p, 200)
      await p.getByTestId('font-upload-submit').click(); await settle(p, 1800)
      const row = json(`select id, family, weight, italic, format, licensed_by, deleted_at from studio_fonts`)[0]
      fontId = row?.id ?? null
      ok(!!row && row.family === 'Brandon' && row.weight === 700 && row.format === 'woff2' && row.licensed_by === 'dane' && row.deleted_at === null, 'Upload keeps the face: Brandon · Bold · WOFF2, licensed by the member who ticked')
      ok(!(await dlg.isVisible().catch(() => false)) && /Brandon bold uploaded/.test(await snackText(p)), 'the dialog closes once it is kept, and the snackbar says so')
      ok(await own.getByTestId('own-font').count() === 1 && /Brandon/.test(await own.getByTestId('own-font').innerText()) && /Not used yet/.test(await own.getByTestId('own-font').innerText()), 'the list shows it, not used yet')
      const r1 = await p.request.get(`${BASE}/files/font/${fontId}`)
      ok(r1.status() === 200 && r1.headers()['content-type'] === 'font/woff2' && (await r1.body()).length === FONT_FILE.length, 'the file is served as font/woff2 from /files/font/<id>, byte for byte')
      const heading = p.locator('#type [class*="role"]').first()
      const opts = await selectOptions(heading, 'Font')
      ok(opts.includes('Brandon'), 'the brand kit’s font boxes list it')
      await pickSelect(heading, 'Font', 'Brandon'); await settle(p, 1200)
      ok(await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('700 22px Brandon') && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Brandon' && f.status === 'loaded') }), 'set on a role, it is drawn in the uploaded face')
      await p.getByRole('button', { name: 'Save changes' }).click(); await settle(p, 1500)
      ok(JSON.parse(sql(`select value from settings where key = 'brand'`)).kit.fonts.heading.family === 'Brandon', 'Save changes keeps the kit’s Heading in it (and never saves the file list with the kit)')
      ok(!('faces' in JSON.parse(sql(`select value from settings where key = 'brand'`)).kit), 'the kit record carries no file list')
      await go(p, '/company/templates/brand'); await own.scrollIntoViewIfNeeded()
      ok(/the kit’s Heading/i.test(await own.getByTestId('own-font').innerText()), 'the list says where it is used — the kit’s Heading')
      await shot(p, '02-own-fonts-1440')
      await go(p, `/templates/${DEFAULT_TPL}`)
      ok(await p.locator('style[data-href*="om-studio-fonts"]').count() >= 1, 'the template editor carries its @font-face rules')
      await p.getByRole('tab', { name: 'Brand' }).click(); await settle(p, 400)
      const bopts = await selectOptions(p.getByTestId('left-pane').locator('[class*="role"]').first(), 'Font')
      ok(bopts.includes('Brandon') && bopts.includes('Outfit'), 'the template editor’s Brand fonts list it with the curated faces')
      /* remove, with Undo */
      await go(p, '/company/templates/brand'); await own.scrollIntoViewIfNeeded()
      await own.getByRole('button', { name: 'Remove Brandon bold' }).click(); await settle(p, 1200)
      const said = await snackText(p)
      ok(await own.getByTestId('own-font').count() === 0 && /Brandon bold removed — the kit’s Heading prints in a standard font until it is back/.test(said), `Remove answers in one sentence with what it touches (“${said.slice(0, 90)}”)`)
      ok(sql(`select deleted_at is not null from studio_fonts where id = '${fontId}'`) === '1' && (await p.request.get(`${BASE}/files/font/${fontId}`)).status() === 404, 'removed softly: kept, no longer served')
      await undo(p)
      ok(sql(`select deleted_at is null from studio_fonts where id = '${fontId}'`) === '1' && (await p.request.get(`${BASE}/files/font/${fontId}`)).status() === 200 && await own.getByTestId('own-font').count() === 1, 'Undo brings it back, served again')
      /* a Designer reads the list */
      as('germaine')
      await go(p, '/company/templates/brand'); await own.scrollIntoViewIfNeeded()
      ok(await own.getByTestId('own-font').count() === 1 && await p.getByTestId('font-upload-open').count() === 0 && await own.getByRole('button', { name: /^Remove/ }).count() === 0, 'a Designer sees the fonts, with no Upload or Remove')
      as('dane')
    }

    // ── 3 · an issuing entity's own look on its quotes ───────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · A quote under another issuing entity prints its contacts, tagline, footer line and accent')
      const brand = JSON.parse(sql(`select value from settings where key = 'brand'`))
      brand.details.entities = [...brand.details.entities.filter((e) => e.id !== ENTITY.id), ENTITY]
      sqlFile(`UPDATE settings SET value = ${lit(JSON.stringify(brand))} WHERE key = 'brand';\nUPDATE quotes SET issuing_entity = ${lit(ENTITY.name)} WHERE id = '${Q1}';\n`)
      await go(p, `/quotes/${Q1}/preview`)
      const text = await p.locator('[data-page]').allInnerTexts().then((t) => t.join('\n'))
      ok(text.includes(ENTITY.phone) && text.includes(ENTITY.website) && !/Tel:\s*\+?65 6222 0188/.test(text), 'the Letter footer prints the entity’s phone and website, not the studio’s')
      await shot(p, '03-entity-preview-1440')
      await go(p, `/templates/${DEFAULT_TPL}`)
      await p.getByRole('button', { name: /^Preview with/ }).click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: /OM-10001/ }).click(); await settle(p, 1800)
      /* {studio_footer}: the Insert a field menu has it, and it prints the entity's footer line */
      await p.locator('[data-kind="footer"] [data-el-kind="text"]').first().click({ position: { x: 4, y: 4 } }); await settle(p, 400)
      const ins = p.getByTestId('inspector')
      await ins.getByRole('button', { name: 'Insert a field' }).first().click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: 'Footer line' }).click(); await settle(p, 800)
      ok(new RegExp(ENTITY.footer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(await ins.innerText()), 'Insert a field › Footer line prints as the entity’s footer line on its quote')
      ok((await p.locator('[data-kind="footer"]').first().innerText()).includes(ENTITY.footer), 'the footer on the page prints it')
      /* the accent: the kit's Accent band takes the entity's colour on its quote, the kit's on the sample */
      await p.locator('[data-page] [data-block-id]').filter({ hasText: 'Hacking' }).first().click({ position: { x: 6, y: 6 } }).catch(() => {}); await settle(p, 400)
      if (!/Items table/.test(await ins.innerText())) { await p.getByTestId('left-pane').getByText('Items table', { exact: true }).click(); await settle(p, 400) }
      await pickSelect(ins, 'Section headings', 'Accent band'); await settle(p, 1500)
      const bandColour = () => p.evaluate(() => { const els = [...document.querySelectorAll('[data-page] [data-block-id] *')]; const hit = els.find((n) => /rgb\((0, 137, 123|85, 0, 255)\)/.test(getComputedStyle(n).backgroundColor)); return hit ? getComputedStyle(hit).backgroundColor : '' })
      ok(await bandColour() === 'rgb(0, 137, 123)', 'on the entity’s quote the Accent band is the entity’s accent (#00897B)')
      await p.getByRole('button', { name: /^Preview with/ }).click(); await settle(p, 300)
      await p.getByRole('menuitemradio', { name: /Sample quote/ }).click(); await settle(p, 1500)
      ok(await bandColour() === 'rgb(85, 0, 255)', 'on the studio’s own quote it is the kit’s Accent (#5500FF)')
      /* Profile says so */
      await go(p, '/company/profile#entities')
      const ent = p.getByTestId('entity').nth(1)   // the second entity (its name sits in an input)
      if (!(await ent.getByTestId('entity-more-details').isVisible().catch(() => false))) { await ent.getByTestId('entity-more-toggle').click(); await settle(p, 400) }   // open already when the entity has details
      ok(/Its quotes, invoices, receipts and credit notes print in it/.test(await ent.innerText()) && /where its quotes print the footer line/.test(await ent.innerText()), 'Company › Profile’s More details say its quotes print them too')
    }

    // ── 4 · 1.0's five cover looks ───────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · The cover starts from one of 1.0’s five looks, with Undo')
      await go(p, `/templates/${COVER_TPL}`)
      const stage = p.getByTestId('canvas-area')   // the page itself — the inspector's small looks draw covers too
      await p.getByTestId('left-pane').getByText('Cover', { exact: true }).click(); await settle(p, 400)
      const ins = p.getByTestId('inspector')
      await ins.getByRole('button', { name: 'More options' }).click(); await settle(p, 900)
      const looks = await ins.locator('[data-testid="cover-look"] [class*="lookName"]').allInnerTexts()
      ok(looks.length === 5 && ['Editorial', 'Magazine split', 'Minimal', 'Bold statement', 'Studio letterhead'].every((n, i) => looks[i] === n), `the five looks, in 1.0’s order (${looks.join(' · ')})`)
      await ins.getByTestId('cover-looks').scrollIntoViewIfNeeded(); await shot(p, '04-cover-looks-1440')
      const before = await stage.locator('[data-kind="cover"] [data-el-kind]').count()
      await ins.locator('[data-look="minimal"]').click(); await settle(p, 1200)
      ok(/Cover changed to Minimal/.test(await snackText(p)) && await stage.locator('[data-kind="cover"] [data-el-kind="rule"]').count() === 1, 'Minimal: the cover takes its look (a short accent line under the logo), and the snackbar offers Undo')
      await ins.locator('[data-look="editorial"]').click(); await settle(p, 2200)
      ok(await p.locator('[role="status"]').filter({ hasText: /Cover changed to/ }).count() === 1 && /Cover changed to Editorial/.test(await snackText(p)), 'a second look replaces the line — one snackbar, its Undo the newest step')
      const cover = (draftOf(COVER_TPL)?.blocks ?? []).find((x) => x.kind === 'cover')
      ok(cover?.background === 'ink' && cover.elements.some((e) => e.kind === 'image' && e.src === '' && e.fit === 'cover'), 'Editorial is kept on the draft: the ink page with a photo place')
      ok(/no picture chosen yet/.test(await ins.innerText()), 'the cover’s list names the empty photo place')
      await undo(p)
      ok(await stage.locator('[data-kind="cover"] [data-el-kind="rule"]').count() === 1, 'Undo puts the cover back to the look before (Minimal)')
      await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); await settle(p, 900)
      ok(await stage.locator('[data-kind="cover"] [data-el-kind]').count() === before, 'and the editor’s own undo walks back to the cover it had')
      await ins.locator('[data-look="editorial"]').click(); await settle(p, 900)
      await p.getByRole('button', { name: 'Preview', exact: true }).click(); await settle(p, 900)
      ok(!/\bImage\b/.test(await stage.locator('[data-kind="cover"]').first().innerText()), 'in Preview the empty photo place prints nothing')
    }

    // ── 5 · Upload my existing quote reads a PDF by rule ─────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · Upload my existing quote — a PDF read for its words, a photo not read (S43B)')
      const open = async () => { await go(p, '/company/templates/quotes'); await p.getByTestId('new-template').first().click(); await settle(p, 300); await p.getByText('Upload my existing quote', { exact: true }).click(); await settle(p, 400) }
      const read = async (file) => { await p.getByTestId('recreate-file').setInputFiles(file); await p.waitForSelector('[data-testid="recreate-reasons"]', { timeout: 20000 }); await settle(p, 300); return { eyebrow: await p.getByTestId('recreate-confidence').innerText(), reasons: await p.getByTestId('recreate-reasons').innerText() } }
      await open()
      const cove = await read(path.join(UAT, 'cove-interior-quotation.pdf'))
      ok(/A4 paper/.test(cove.reasons) && /Item · Qty · Unit · Amount S\$/.test(cove.reasons) && /grouped by trade, then by room/.test(cove.reasons) && /grand total reads “Total”/.test(cove.reasons), 'a PDF is read for its words: its paper, its columns in its words, its grouping, its grand total')
      await shot(p, '05-recreate-cove-1440')
      const n0 = Number(sql(`select count(*) from quote_templates`))
      await p.getByRole('button', { name: 'Open in the editor' }).click(); await p.waitForURL(/\/templates\/[0-9a-f-]{36}/, { timeout: 20000 }); await settle(p, 2000)
      const newId = p.url().match(/\/templates\/([0-9a-f-]{36})/)?.[1]
      const d = draftOf(newId)
      const items = d?.blocks.find((x) => x.kind === 'items'); const totals = d?.blocks.find((x) => x.kind === 'totals')
      const on = (items?.columns ?? []).filter((c) => c.on).map((c) => `${c.key}:${c.label}`).join(',')
      ok(Number(sql(`select count(*) from quote_templates`)) === n0 + 1 && d?.page.paper === 'A4' && on === 'item:Item,qty:Qty,unit:Unit,total:Amount S$' && items.groupBy === 'category' && items.subGroupBy === 'room' && totals?.lines.find((l) => l.key === 'total')?.label === 'Total', `the new template takes what was read (${on})`)
      ok(JSON.parse(sql(`select source_file from quote_templates where id = '${newId}'`)).name === 'cove-interior-quotation.pdf' && await p.getByRole('tab', { name: 'Reference' }).count() === 1, 'the file is kept beside the canvas (Reference)')
      await open()
      const photo = await read(path.join(UAT, 'kitchen-moodboard.jpg'))
      /* (S43B · F1-02, a deliberate change of this rule) a photo is never matched by its name — "Not read", the studio picks the closest design */
      ok(/^not read$/i.test(photo.eyebrow) && /A photo has no words to read here — pick the design that looks closest/.test(photo.reasons), 'a photo says it can’t be read and asks for the closest design (S43B)')
      await p.getByRole('button', { name: 'Start over' }).click(); await settle(p, 400)
      const plain = await read(path.join(UAT, 'gerald-tan-signed-contract.pdf'))
      ok(/Closest match/i.test(plain.eyebrow) && /Nothing in its words points to one design/.test(plain.reasons), 'a PDF with nothing to match says so, closest by shape')
      await p.keyboard.press('Escape'); await settle(p, 400)
      /* the editor's Match with a file past a server action's bare-string limit */
      await go(p, `/templates/${newId}`)
      await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 300)
      await p.getByText(/^Upload (my|another) existing quote/).click(); await settle(p, 500)   // "another" once a file is kept
      await p.getByTestId('recreate-file').setInputFiles({ name: 'cove-big.pdf', mimeType: 'application/pdf', buffer: bigPdf() })
      await p.waitForSelector('[data-testid="recreate-reasons"]', { timeout: 30000 }); await settle(p, 300)
      await p.getByRole('button', { name: 'Apply to this template' }).click(); await settle(p, 3000)
      const said = await p.locator('[role="status"]').allInnerTexts().then((t) => t.join(' | '))
      ok(/Matched to the \w+ design/.test(said) && !/couldn’t be kept/.test(said), 'Match applies with its snackbar, and a 1.6 MB file is kept (no “couldn’t be kept”)')
      ok(Number(sql(`select length(source_file) from quote_templates where id = '${newId}'`)) > 1_000_000, 'the kept file is past 1,000,000 characters — carried inside one object')
      ok(await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).count() >= 1, 'replacing the design offers Undo')
    }

    // ── 6 · the paper's door ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Invoice and PO paper: one home in Settings › Finance, a door from the Brand kit')
      await go(p, '/company/templates/brand')
      const door = p.getByTestId('paper-door')
      ok(await door.count() === 1 && /Settings › Finance/.test(await door.innerText()), 'the Brand kit has the door, naming where the paper lives')
      await door.click(); await p.waitForURL(/\/settings\?section=finance/, { timeout: 15000 }); await settle(p, 1800)
      ok(/from=%2Fcompany%2Ftemplates%2Fbrand/.test(p.url()) && /#invoice-paper$/.test(p.url()), 'it opens Settings › Finance with ?from= and the paper’s anchor')
      const box = await p.getByTestId('invoice-paper-settings').boundingBox()
      const strip = await p.getByRole('tablist').first().boundingBox()
      ok(!!box && !!strip && box.y >= strip.y + strip.height - 1 && box.y < 400, `it lands on the Invoice paper card, its title in view under the tab strip (card at ${Math.round(box?.y ?? -1)}, strip ends ${Math.round((strip?.y ?? 0) + (strip?.height ?? 0))})`)
      await shot(p, '06-paper-door-landing-1440')
      await p.getByRole('link', { name: /^Back to/ }).first().click(); await p.waitForURL(/\/company\/templates\/brand/, { timeout: 15000 }); await settle(p, 600)
      ok(/\/company\/templates\/brand/.test(p.url()), 'Back returns to the Brand kit')
    }

    // ── 7 · Maison AI in the template editor ─────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Maison AI in the quote template editor answers (S10)')
      await go(p, `/templates/${DEFAULT_TPL}`)
      await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700)
      const s = p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
      const words = await s.innerText().catch(() => '')
      ok(/Can new quotes start from it\?/.test(words) && /Which quotes print with it\?/.test(words), 'its sheet carries the template’s own suggestions')
      await p.keyboard.press('Escape')
    }

    // ── 8 · phone ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · 390 and 320 — inside the screen')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h)
        const q = await page(pc, `phone-${w}`)
        await go(q, '/company/templates/brand')
        await q.getByTestId('own-fonts').scrollIntoViewIfNeeded()
        ok(await sideways(q) <= 0, `${w}: the brand kit with its own fonts has no sideways scroll`)
        if (w === 390) await shot(q, '07-own-fonts-390')
        if (await q.getByTestId('font-upload-open').count()) {
          await q.getByTestId('font-upload-open').click(); await settle(q, 700)
          await q.getByTestId('font-upload-input').setInputFiles({ name: 'Brandon-Bold.woff2', mimeType: 'font/woff2', buffer: FONT_FILE }); await settle(q, 900)
          const bb = await q.getByTestId('font-upload-dialog').boundingBox()
          ok(!!bb && bb.x >= 0 && bb.x + bb.width <= w + 1 && await sideways(q) <= 0, `${w}: the upload dialog sits inside the screen`)
          if (w === 390) await shot(q, '08-upload-sheet-390')
          await q.keyboard.press('Escape'); await settle(q, 400)
        }
        await go(q, '/company/templates/quotes')
        await q.getByTestId('new-template').first().click(); await settle(q, 500)
        await q.getByText('Upload my existing quote', { exact: true }).click(); await settle(q, 600)
        await q.getByTestId('recreate-file').setInputFiles(path.join(UAT, 'cove-interior-quotation.pdf'))
        await q.waitForSelector('[data-testid="recreate-reasons"]', { timeout: 20000 }); await settle(q, 400)
        ok(await sideways(q) <= 0, `${w}: Upload my existing quote’s result has no sideways scroll`)
        if (w === 390) await shot(q, '09-recreate-390')
        await pc.close()
      }
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await ctx.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    if (kept.length) putBack()
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
