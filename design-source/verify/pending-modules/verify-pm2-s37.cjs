// Pending modules, step S37 · Verify for a Qanvast listing (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// onboarding:qanvast-listing-verification · studio:verify-listing). Each item asserted as the rule it builds, never another round's count:
//  - the listing's one home is Company › Profile's card **Listed on Qanvast**, after Registrations & accreditations; 1.0's /verify lands there;
//    ⌘K finds it; Who may do what names it (Owners and Admins); Company › Integrations' Qanvast card follows it (Connected · Not listed) with
//    the door; Maison AI answers "are we listed on Qanvast?" from the record
//  - the demo is listed (repair R145: a listing made before OpenMaison, dated by the first Qanvast lead — no words made up)
//  - the application is a real record made from the studio's records — name, UEN, registrations, completed projects (counted), About photos,
//    year and awards, review link, website — and its own words (the description starts from the About story) and proof files (real bytes:
//    a picture and a PDF kept, served back, taken off with Undo; anything else refused)
//  - one waits at a time; Withdraw with Undo; Undo on Send takes it back; Qanvast's answer: the demo's labelled plays (listed · asks for changes
//    with a note by rule) and the real webhook (its secret, its envelope, once each); the bell tells Owners and Admins; Fix and send again;
//    Close the application / Keep my listing as it is with Undo; a listed studio's update waits while the listing stays
//  - required: a UEN (the door to Company details keeps the words, focuses the field) and a description; Cancel with changes asks first
//  - Designers, Accounting read it (no presses); an Admin applies
//  - the ghost lands where the card does (1440 · 390); no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 S37_SECRET=<QANVAST_WEBHOOK_SECRET the server was started with> NODE_PATH=<repo>/node_modules node verify-pm2-s37.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s37')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const SECRET = process.env.S37_SECRET || ''
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s37-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, extra) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 400)) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const apps = () => json(`select * from studio_verifications order by submitted_at`)
const pendingApp = () => json(`select * from studio_verifications where status = 'pending'`)[0] ?? null
const latest = () => json(`select * from studio_verifications order by submitted_at desc limit 1`)[0] ?? null
const bell = (title) => json(`select member_id, title, body, href from notifications where kind = 'listing_answered'${title ? ` and title = '${title.replace(/'/g, "''")}'` : ''}`)

/* the proof files the probe adds: a real 1×1 PNG and a small real PDF */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

/* the ghost measure (S34's): the reveal's ghost against the page, block by block, in a viewport tall enough to hold the card */
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
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1200) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const card = (p) => p.getByTestId('qanvast-listing')
  const state = (p) => card(p).getAttribute('data-state')
  const dialog = (p) => p.getByTestId('qanvast-dialog')
  const press = async (p, id, ms = 1800) => { await p.getByTestId(id).click(); await settle(p, ms) }
  const openProfile = async (p) => { await go(p, '/company/profile', 1400); await card(p).scrollIntoViewIfNeeded(); await settle(p, 300) }
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }
  const waitPanel = (p) => p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"],[data-testid="maison-proposal"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
  const ask = async (p, q) => { const box = sheet(p).locator('[data-testid="maison-ask"] input'); await box.fill(q); await box.press('Enter'); await waitPanel(p); await settle(p, 300); return sheet(p).locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first() }
  const search = async (p, q) => {
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type(q, { delay: 20 }); await settle(p, 900)
    return p.getByRole('dialog', { name: /search/i }).or(p.locator('[data-global-search]')).first()
  }
  const reach = (p, row, role) => p.locator(`[data-testid="may-${row}"] [role="cell"][data-label="${role}"]`).getAttribute('data-reach')
  const addProof = async (p, kind, files) => { await dialog(p).getByTestId(`qanvast-proof-${kind}`).locator('input[type="file"]').setInputFiles(files); await settle(p, 2600) }
  const hook = (p, body, auth = `Bearer ${SECRET}`) => p.request.post(`${BASE}/api/webhooks/qanvast-listing`, { data: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, failOnStatusCode: false })

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/company/profile', 2000); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`), logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let t = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const n of changed) {
      t += `DELETE FROM "${n}";\n`
      for (const r of kept.get(n)) t += `INSERT INTO "${n}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    t += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(t)
    return changed
  }

  const BRAND = () => JSON.parse(sql(`select value from settings where key = 'brand'`)).details
  const DELIVERED = Number(sql(`select count(*) from projects where stage = 'completed' and deleted_at is null`))
  const PHOTOS = Number(sql(`select count(*) from studio_pictures where kind = 'about' and deleted_at is null`))
  const REGS = Object.entries(JSON.parse(sql(`select value from settings where key = 'compliance_studio'`) || '{}')).filter(([, v]) => v.done).map(([k]) => k)

  try {
    as('dane')
    const D = await desk(); const d = await page(D, 'desk')
    const popups = []
    await D.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) })

    // ── 1 · the demo is listed, and the listing's one home ─────────────────────────────────────────────────────────────────────────
    console.log('1 · the demo is listed — one home on Company › Profile')
    const outside = json(`select * from studio_verifications`)
    const firstQ = Number(sql(`select min(created_at) from leads where source = 'Qanvast'`)) * 1000
    ok(outside.length === 1 && outside[0].kind === 'outside' && outside[0].status === 'verified' && outside[0].submitted_at === firstQ && outside[0].description === null && outside[0].answered_via === null,
      'R145: listed before OpenMaison, dated by the first Qanvast lead, no words made up, no answer claimed', outside)
    await openProfile(d)
    const order = await d.evaluate(() => { const r = document.querySelector('[data-testid="registrations"]'), q = document.querySelector('[data-testid="qanvast-listing"]'), e = document.querySelector('[data-testid="entities"]'); return !!r && !!q && !!e && !!(r.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(q.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) })
    ok(order, 'the card sits after Registrations & accreditations, before Issuing entities')
    const c1 = await text(card(d))
    ok(await state(d) === 'listed' && /listed on qanvast/i.test(c1) && /\bLISTED\b/i.test(c1) && /Listed before your studio used OpenMaison — what Qanvast shows isn’t on record here yet\./.test(c1), 'it reads Listed — before OpenMaison, said plainly', c1)
    ok(/^Simulated on this prototype — your application is kept here and isn’t sent to Qanvast/.test(await text(d.getByTestId('qanvast-simulated'))), 'the stand-in says so in its own line')
    ok(await d.getByTestId('qanvast-update').count() === 1 && await d.getByTestId('qanvast-apply').count() === 0 && await d.getByTestId('qanvast-what').count() === 0 && await d.getByTestId('qanvast-demo').count() === 0,
      'Listed: Update your listing is the press; no What Qanvast has (nothing on record) and no demo plays (nothing waits)')
    await shot(d, '01-listed-outside-1440'); await card(d).screenshot({ path: path.join(dir, '01b-card-listed-outside.png') })

    /* 1.0's /verify, ⌘K, Who may do what, Integrations, Maison AI */
    await d.goto(BASE + '/verify', { waitUntil: 'networkidle' }); await settle(d, 1500)
    const u = new URL(d.url())
    ok(u.pathname === '/company/profile' && u.hash === '#qanvast', '1.0’s /verify lands on the card', d.url())
    const sr = await search(d, 'qanvast listing')
    ok(/Listed on Qanvast/.test(await text(sr)), '⌘K finds Listed on Qanvast')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, '/settings')
    ok(await reach(d, 'qanvast-listing', 'Owner') === 'yes' && await reach(d, 'qanvast-listing', 'Admin') === 'yes' && await reach(d, 'qanvast-listing', 'Designer') === 'no' && await reach(d, 'qanvast-listing', 'Accounting') === 'no',
      'Who may do what: Owners and Admins apply to Qanvast')
    await go(d, '/company/integrations')
    const iq = await text(d.locator('section[aria-labelledby="int-qanvast"]'))
    const door = d.getByTestId('int-qanvast-listing')
    ok(/connected/i.test(iq) && /Your listing: Company › Profile\./.test(iq) && /^\/company\/profile\?from=%2Fcompany%2Fintegrations#qanvast$/.test(await door.getAttribute('href')), 'Integrations: Qanvast Connected, with the door to the listing (and the way back)', { iq, href: await door.getAttribute('href') })
    await door.click(); await d.waitForURL(/\/company\/profile/); await settle(d, 1400)
    ok(await card(d).evaluate((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 }), '…which lands on the card')
    await fab(d)
    const a1 = await ask(d, 'Are we listed on Qanvast?')
    ok(/Yes — the studio is listed on Qanvast/.test(await text(a1)) && /Listed before the studio used OpenMaison/.test(await text(a1)), 'Maison AI answers from the record', await text(a1))
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── 2 · Update your listing: the application made from the records, the proof kept ─────────────────────────────────────────────
    console.log('2 · Update your listing — the records, the words, the proof')
    await openProfile(d)
    await press(d, 'qanvast-update', 900)
    const dl = dialog(d)
    const facts = await text(dl.getByTestId('qanvast-facts'))
    const brand = BRAND()
    ok(facts.includes(brand.name) && facts.includes(`UEN ${brand.uen}`) && (!brand.website || facts.includes(brand.website)), 'the studio’s name, UEN and website from Company details', facts.slice(0, 200))
    ok(REGS.length > 0 && REGS.every((id) => facts.includes({ HDB_DRC: 'HDB Directory of Renovation Contractors', CASETRUST_RENOVATION: 'CaseTrust' }[id] ?? id)), 'the registrations recorded as done', REGS)
    ok(facts.includes(`${DELIVERED} completed with OpenMaison`), 'projects delivered: the completed projects, counted', DELIVERED)
    ok(await dl.locator('[data-fact="about"] img').count() === Math.min(PHOTOS, 6) && /Est\. 2014/.test(facts), 'the About photos, year and awards', { photos: PHOTOS })
    ok(/None yet/.test(await text(dl.locator('[data-fact="review"]'))) && await dl.getByTestId('qanvast-door-review').count() === 1, 'no review link yet — said, with the door to add it')
    const story = JSON.parse(sql(`select value from settings where key = 'studio_about'`)).story.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const desc0 = await dl.locator('textarea').nth(0).inputValue()
    ok(desc0.replace(/\s+/g, ' ').startsWith(story.slice(0, 60)) && /Started from your About story/.test(await text(dl)), 'the description starts from the About story, and says so', desc0.slice(0, 80))
    await shot(d, '02-update-dialog-1440')

    /* proof: a picture and a PDF kept as real files, anything else refused; take one off with Undo */
    await addProof(d, 'project', [{ name: 'finished-living-room.png', mimeType: 'image/png', buffer: PNG }])
    const f1 = json(`select id, kind, name, mime, size_bytes, substr(data, 1, 22) as head from studio_verification_files where removed_at is null`)
    ok(f1.length === 1 && f1[0].kind === 'project' && f1[0].mime === 'image/png' && f1[0].head === 'data:image/png;base64,' && f1[0].size_bytes === PNG.length, 'a picture lands in Proof of homes you finished — its bytes kept', f1)
    const r1 = await d.request.get(`${BASE}/company/listing-file/${f1[0]?.id}`)
    ok(r1.status() === 200 && /image\/png/.test(r1.headers()['content-type'] ?? '') && (await r1.body()).equals(PNG), '…and served back as it was')
    await addProof(d, 'testimonial', [{ name: 'client-review.pdf', mimeType: 'application/pdf', buffer: PDF }])
    const f2 = json(`select id, mime from studio_verification_files where removed_at is null and kind = 'testimonial'`)
    ok(f2.length === 1 && f2[0].mime === 'application/pdf' && await dl.getByTestId('qanvast-proof-testimonial').getByText('client-review.pdf').count() === 1, 'a PDF lands in What clients said — its tile shows it')
    await addProof(d, 'project', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }])
    ok(/notes\.txt isn’t a PDF, JPG or PNG/.test(await snackText(d)) && Number(sql(`select count(*) from studio_verification_files`)) === 2, 'a text file is refused, nothing kept', await snackText(d))
    await dl.getByTestId('qanvast-proof-testimonial').getByRole('button', { name: 'Remove client-review.pdf' }).click(); await settle(d, 1500)
    ok(/client-review\.pdf taken off/.test(await snackText(d)) && !!sql(`select removed_at from studio_verification_files where id = '${f2[0].id}'`), 'taking a file off: softly, with one sentence and Undo')
    await undo(d)
    ok(!sql(`select removed_at from studio_verification_files where id = '${f2[0].id}'`) && await dl.getByTestId('qanvast-proof-testimonial').getByText('client-review.pdf').count() === 1, 'Undo puts it back')

    /* required: the description */
    await dl.locator('textarea').nth(0).fill('')
    await press(d, 'qanvast-send', 900)
    ok(/This field is required/.test(await text(dl)) && !pendingApp(), 'an empty description is refused under its box — nothing sent')
    await dl.locator('textarea').nth(0).fill('Demo Studio designs and builds HDB and condo homes in Singapore — one designer from the first measure to the handover.')
    await dl.locator('textarea').nth(1).fill('Ten years of HDB resale renovations, a one-year warranty on our carpentry.')
    await press(d, 'qanvast-send', 2200)
    const a2 = pendingApp()
    ok(!!a2 && a2.kind === 'update' && a2.submitted_by === 'dane' && a2.description.startsWith('Demo Studio designs') && a2.differentiator.startsWith('Ten years') && a2.projects_delivered === DELIVERED && a2.uen === brand.uen && a2.studio_name === brand.name,
      'Send: one waiting application — an update (the studio is listed), its words and its records that day', a2)
    const docs = JSON.parse(a2?.submitted_documents ?? '{}')
    ok(docs.files?.length === 2 && docs.photos?.length === PHOTOS && REGS.every((id) => docs.registrations.includes(id)) && docs.founded === 2014 && docs.awards?.length >= 1, 'it keeps what it sent: the proof, the photos, the registrations, the year and awards', docs)
    ok(/Your changes are sent to Qanvast — your listing stays as it is until it answers/.test(await snackText(d)) && await dialog(d).count() === 0, 'the dialog closes once it lands, and says what happens next')
    await settle(d, 600)
    const c2 = await text(card(d))
    ok(await state(d) === 'listed' && /changes waiting/i.test(c2) && /wait for Qanvast’s review — your listing stays as it is meanwhile/.test(c2) && await d.getByTestId('qanvast-withdraw').innerText() === 'Withdraw your changes',
      'the listing stays Listed; its changes wait — Withdraw your changes', c2)
    ok(/Simulate Qanvast approving the changes \(demo\)/.test(await text(d.getByTestId('qanvast-demo'))) && /Simulate Qanvast asking for changes \(demo\)/.test(await text(d.getByTestId('qanvast-demo'))) && /Demo only/.test(await text(d.getByTestId('qanvast-demo'))), 'while it waits: the demo’s two plays, labelled')
    await card(d).screenshot({ path: path.join(dir, '03-card-changes-waiting.png') })
    await undo(d)
    ok(latest()?.status === 'withdrawn' && !pendingApp() && await d.getByTestId('qanvast-update').count() === 1, 'Undo on Send takes it back — the listing as it was')

    /* the words are kept for the next one; one waits at a time; Withdraw with Undo */
    await press(d, 'qanvast-update', 900)
    ok((await dialog(d).locator('textarea').nth(0).inputValue()).startsWith('Demo Studio designs'), 'the next application starts from the words just sent (nothing lost)')
    await press(d, 'qanvast-send', 2200)
    const a3 = pendingApp()
    ok(!!a3 && a3.id !== a2.id, 'sent again — a new waiting application')
    await press(d, 'qanvast-withdraw', 1800)
    ok(/Your changes are withdrawn — your listing stays as it is/.test(await snackText(d)) && json(`select status from studio_verifications where id = '${a3.id}'`)[0].status === 'withdrawn', 'Withdraw your changes: one sentence and Undo')
    await undo(d)
    ok(pendingApp()?.id === a3.id && /Your changes are waiting for Qanvast again/.test(await snackText(d)), 'Undo: it waits again')

    // ── 3 · the demo's plays of Qanvast's answer ─────────────────────────────────────────────────────────────────────────────────────
    console.log('3 · Qanvast’s answer, played in the demo — changes asked, fixed, approved')
    const bell0 = bell().length
    await press(d, 'qanvast-play-changes', 2200)
    const a4 = json(`select * from studio_verifications where id = '${a3.id}'`)[0]
    ok(a4.status === 'rejected' && a4.answered_via === 'demo' && /ACRA business profile/.test(a4.admin_notes) && !!a4.reviewed_at, 'played: changes asked, its note by rule (proof sent → the ACRA profile), recorded as played', a4)
    const c3 = await text(card(d))
    ok(/changes asked/i.test(c3) && /Qanvast asked for changes to your update on .+ — played in the demo:/.test(c3) && c3.includes(`“${a4.admin_notes}”`) && await d.getByTestId('qanvast-fix').count() === 1 && await d.getByTestId('qanvast-close-ask').innerText() === 'Keep my listing as it is',
      'the card: Listed, Changes asked, Qanvast’s note quoted — Fix and send again · Keep my listing as it is', c3)
    const b1 = bell('Qanvast asks for changes to your listing update')
    ok(b1.length >= 2 && b1.every((x) => x.href === '/company/profile#qanvast' && x.body.includes(a4.admin_notes) && /Simulated on this prototype/.test(x.body)) && new Set(b1.map((x) => x.member_id)).has('huimin') && b1.length + bell0 === bell().length, 'the bell tells Owners and Admins — said as played', b1)
    await card(d).screenshot({ path: path.join(dir, '04-card-changes-asked.png') })
    await press(d, 'qanvast-close-ask', 1600)
    ok(json(`select status from studio_verifications where id = '${a3.id}'`)[0].status === 'closed' && await d.getByTestId('qanvast-update').count() === 1 && /Your listing stays as it is/.test(await snackText(d)), 'Keep my listing as it is: the ask is let go, with Undo')
    await undo(d)
    ok(json(`select status from studio_verifications where id = '${a3.id}'`)[0].status === 'rejected' && await d.getByTestId('qanvast-fix').count() === 1, 'Undo: the ask is back')
    await press(d, 'qanvast-fix', 900)
    ok(/Fix your listing update/.test(await text(d.locator('[role="dialog"][aria-label="Fix your listing update"]'))) && (await text(d.getByTestId('qanvast-dialog-ask'))).includes(a4.admin_notes) && (await dialog(d).locator('textarea').nth(0).inputValue()).startsWith('Demo Studio designs'), 'Fix and send again: Qanvast’s note on top, the words as they were sent')
    await press(d, 'qanvast-send', 2200)
    const a5 = pendingApp()
    ok(!!a5 && a5.kind === 'update', 'sent again')
    await press(d, 'qanvast-play-listed', 2200)
    ok(json(`select status, answered_via from studio_verifications where id = '${a5.id}'`)[0].status === 'verified' && bell('Qanvast approved your listing changes').length >= 2, 'played: Qanvast approves the changes — the bell says so')
    const c4 = await text(card(d))
    ok(/Listed since .+ · last updated .+ — played in the demo\./.test(c4) && await d.getByTestId('qanvast-what').count() === 1, 'Listed since its first day, last updated now — and What Qanvast has', c4)
    await press(d, 'qanvast-what', 500)
    const sent = await text(d.getByTestId('qanvast-sent'))
    ok(sent.includes('Demo Studio designs') && sent.includes('Ten years') && sent.includes(`${DELIVERED} completed with OpenMaison`) && sent.includes('finished-living-room.png') && sent.includes('client-review.pdf') && /by Dane/.test(sent), 'What Qanvast has: what was sent, its proof as links', sent.slice(0, 300))
    const href = await d.getByTestId('qanvast-sent').getByRole('link', { name: 'client-review.pdf' }).getAttribute('href')
    const r2 = await d.request.get(BASE + href)
    ok(r2.status() === 200 && /application\/pdf/.test(r2.headers()['content-type'] ?? ''), '…each opening its file')
    await card(d).screenshot({ path: path.join(dir, '05-card-listed-updated.png') })

    // ── 4 · a studio not listed yet: Apply, the UEN's door, waiting, listed ──────────────────────────────────────────────────────────
    console.log('4 · Not applied — Apply, the required UEN, waiting, listed, needs changes')
    sql(`delete from studio_verifications`)
    sql(`update settings set value = json_set(value, '$.details.uen', '') where key = 'brand'`)
    await openProfile(d)
    const c5 = await text(card(d))
    ok(await state(d) === 'not_applied' && /not applied/i.test(c5) && /Homeowners look for interior designers on Qanvast\. Apply once/.test(c5) && await d.getByTestId('qanvast-apply').count() === 1, 'Not applied: the one filled press, Apply to be listed', c5)
    await card(d).screenshot({ path: path.join(dir, '06-card-not-applied.png') })
    await press(d, 'qanvast-apply', 900)
    ok(await d.locator('[role="dialog"][aria-label="Apply to be listed on Qanvast"]').count() === 1 && /Send to Qanvast/.test(await d.getByTestId('qanvast-send').innerText()), 'the dialog: Apply to be listed on Qanvast · Send to Qanvast')
    await dialog(d).locator('textarea').nth(1).fill('Kitchens that cook.')
    /* Cancel with changes asks first */
    await d.locator('[role="dialog"][aria-label="Apply to be listed on Qanvast"]').getByRole('button', { name: 'Cancel' }).click(); await settle(d, 600)
    ok(await d.getByRole('dialog', { name: 'Discard what you wrote?' }).count() === 1, 'Cancel with changes asks first')
    await d.getByRole('dialog', { name: 'Discard what you wrote?' }).getByRole('button', { name: 'Keep editing' }).click(); await settle(d, 500)
    ok(await dialog(d).count() === 1 && await dialog(d).locator('textarea').nth(1).inputValue() === 'Kitchens that cook.', 'Keep editing keeps the words')
    await press(d, 'qanvast-send', 1200)
    ok(/Qanvast checks your UEN — add it in Company details first/.test(await text(dialog(d).locator('[data-fact="studio"]'))) && apps().length === 0, 'no UEN: refused in its row — nothing sent')
    await press(d, 'qanvast-door-studio', 1500)
    const focus = await d.evaluate(() => { const a = document.activeElement; const l = a?.id ? document.querySelector(`label[for="${a.id}"]`) : null; return { label: l?.textContent ?? '', inDetails: !!a?.closest('#details') } })
    ok(await dialog(d).count() === 0 && focus.inDetails && /^UEN/.test(focus.label), 'Add your UEN: the dialog steps aside, Company details’ UEN field takes the focus', focus)
    await d.keyboard.type('201234567M'); await settle(d, 300)
    await d.getByRole('button', { name: 'Save changes' }).click(); await settle(d, 2200)
    ok(BRAND().uen === '201234567M', 'saved on Company details')
    await card(d).scrollIntoViewIfNeeded()
    await press(d, 'qanvast-apply', 900)
    ok(await dialog(d).locator('textarea').nth(1).inputValue() === 'Kitchens that cook.' && /UEN 201234567M/.test(await text(dialog(d).locator('[data-fact="studio"]'))), 'back in the application: the words kept, the UEN read from the record')
    await press(d, 'qanvast-send', 2400)
    const a6 = pendingApp()
    ok(!!a6 && a6.kind === 'apply' && a6.uen === '201234567M' && /Sent to Qanvast — it usually answers within 3–5 working days/.test(await snackText(d)), 'Send to Qanvast: the first application waits', a6)
    const c6 = await text(card(d))
    const DANE = sql(`select name from members where id = 'dane'`)
    ok(await state(d) === 'waiting' && /waiting for qanvast/i.test(c6) && c6.includes(`by ${DANE}. Qanvast usually answers within 3–5 working days — Owners and Admins hear it in the bell.`) && /Sent on \d+ \w+ ’\d\d by/.test(c6) && await d.getByTestId('qanvast-withdraw').innerText() === 'Withdraw the application' && /Simulate Qanvast listing you \(demo\)/.test(c6),
      'Waiting for Qanvast: who sent it and when; Withdraw the application; the demo’s plays', c6)
    await card(d).screenshot({ path: path.join(dir, '07-card-waiting.png') })
    await go(d, '/company/integrations')
    ok(/not listed/i.test(await text(d.locator('section[aria-labelledby="int-qanvast"]'))) && /Once Qanvast lists your studio/.test(await text(d.getByTestId('int-qanvast-help'))), 'Integrations: Qanvast Not listed — with the door to apply')
    await shot(d, '08-integrations-not-listed-1440')
    /* Maison AI while it waits */
    await fab(d)
    ok(/Waiting for Qanvast/.test(await text(await ask(d, 'Is our qanvast application approved?'))), 'Maison AI: waiting for Qanvast')
    await d.keyboard.press('Escape'); await settle(d, 300)
    /* the real webhook */
    await openProfile(d)
    if (SECRET) {
      const w0 = await hook(d, { application: a6.id, status: 'verified' }, '')
      const w1 = await hook(d, { application: a6.id, status: 'verified' }, 'Bearer wrong')
      const w2 = await hook(d, { hello: 'world' })
      const w3 = await hook(d, 'not json')
      ok(w0.status() === 401 && w1.status() === 401 && w2.status() === 400 && w3.status() === 400 && pendingApp()?.id === a6.id, 'the webhook: no or a wrong secret 401, a body that isn’t an answer 400 — nothing answered')
      const w4 = await hook(d, { application: a6.id, status: 'listed', note: 'Welcome to Qanvast.', reviewed_at: new Date().toISOString() })
      const j4 = await w4.json()
      const row4 = json(`select status, answered_via, admin_notes from studio_verifications where id = '${a6.id}'`)[0]
      ok(w4.status() === 200 && j4.results?.[0]?.status === 'answered' && row4.status === 'verified' && row4.answered_via === 'qanvast' && row4.admin_notes === 'Welcome to Qanvast.', 'Qanvast’s answer on its webhook lands: Listed, as Qanvast’s', { j4, row4 })
      const w5 = await hook(d, { application: a6.id, status: 'verified' })
      ok((await w5.json()).results?.[0]?.status === 'already' && bell('Qanvast listed Demo Studio').filter((x) => x.member_id === 'dane').length === 1, 'a second call lands nothing twice — one bell row each')
      ok((await (await hook(d, { application: 'not-ours', status: 'verified' })).json()).results?.[0]?.status === 'not_found', 'an application that isn’t the studio’s is not found')
      await openProfile(d)
      const c7 = await text(card(d))
      ok(await state(d) === 'listed' && /Listed since/.test(c7) && !/played in the demo/.test(c7), 'the card: Listed — Qanvast’s own answer, not a play', c7)
      ok(/not listed/i.test(await (async () => { await go(d, '/company/integrations'); return text(d.locator('section[aria-labelledby="int-qanvast"]')) })()) === false, 'Integrations: Connected again')
    } else {
      const w = await hook(d, { application: a6.id, status: 'verified' }, 'Bearer x')
      ok(w.status() === 503, 'with no QANVAST_WEBHOOK_SECRET on the server, the webhook is off (503)')
      await press(d, 'qanvast-play-listed', 2200)
    }
    /* a first application asked for changes, closed, Undo */
    sql(`delete from studio_verifications`)
    await openProfile(d)
    await press(d, 'qanvast-apply', 900)
    await press(d, 'qanvast-send', 2400)
    sql(`update studio_verification_files set removed_at = 1 where kind = 'project'`)   // the proof of finished homes taken off: the rule's first note
    sql(`update studio_verifications set submitted_documents = json_set(submitted_documents, '$.files', json('[]')) where status = 'pending'`)
    await press(d, 'qanvast-play-changes', 2400)
    const a7 = latest()
    const c8 = await text(card(d))
    ok(a7.status === 'rejected' && /Please add photos of a few homes you finished/.test(a7.admin_notes) && await state(d) === 'needs_changes' && /needs changes/i.test(c8) && await d.getByTestId('qanvast-close-ask').innerText() === 'Close the application',
      'a first application asked for changes: Needs changes, the note by rule (no proof of finished homes) — Fix and send again · Close the application', { a7, c8 })
    await card(d).screenshot({ path: path.join(dir, '09-card-needs-changes.png') })
    await press(d, 'qanvast-close-ask', 1600)
    ok(await state(d) === 'not_applied' && /apply again whenever you’re ready/.test(await snackText(d)), 'Close the application: Not applied again, with Undo')
    await undo(d)
    ok(await state(d) === 'needs_changes', 'Undo: Needs changes again')
    /* the Dashboard's Needs you holds it while it waits on the studio — a door, never a copy */
    await go(d, '/dashboard', 1800)
    if (await d.getByTestId('needs-more').count()) { await d.getByTestId('needs-more').click(); await settle(d, 500) }
    const nr = d.getByTestId('need-qanvast-listing')
    ok(await nr.count() === 1 && /Qanvast asks for changes to your listing application/.test(await text(nr)) && (await text(nr)).includes(a7.admin_notes), 'the Dashboard’s Needs you holds Qanvast’s ask, with its note', await text(nr))
    await nr.getByTestId('need-action').click(); await d.waitForURL(/\/company\/profile/).catch(() => {}); await settle(d, 1400)
    const nu = new URL(d.url())
    ok(nu.pathname === '/company/profile' && nu.searchParams.get('from') === '/dashboard' && nu.hash === '#qanvast', '…Fix opens the card, with Back to the Dashboard', d.url())
    await fab(d)
    ok(/Qanvast asks for changes/.test(await text(await ask(d, 'are we listed on qanvast')) ), 'Maison AI: Qanvast asks for changes')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await D.close()

    // ── 5 · who: an Admin applies; Designers and Accounting read ──────────────────────────────────────────────────────────────────────
    console.log('5 · who — an Admin presses, a Designer and Accounting read')
    as('huimin')
    { const c = await desk(); const p = await page(c, 'admin'); await openProfile(p)
      ok(await p.getByTestId('qanvast-fix').count() === 1 && await p.getByTestId('qanvast-actions').count() === 1, 'Hui Min (Admin) gets the presses'); await c.close() }
    as('germaine')
    { const c = await desk(); const p = await page(c, 'germaine'); await openProfile(p)
      ok(await card(p).count() === 1 && await state(p) === 'needs_changes' && await p.getByTestId('qanvast-actions').count() === 0 && await p.getByTestId('qanvast-demo').count() === 0 && /Needs changes/i.test(await text(card(p))), 'Germaine (Designer) reads the listing — no presses, no plays')
      await c.close() }
    /* a Designer reads what Qanvast has too (the card sits outside the page's read-only fieldset, so its disclosure still opens) */
    sqlFile(`INSERT INTO studio_verifications (id, kind, status, studio_name, uen, description, differentiator, projects_delivered, submitted_documents, submitted_by, submitted_at, reviewed_at, answered_via) VALUES ('s37-read', 'apply', 'verified', 'Demo Studio Pte Ltd', '201234567M', 'Words a Designer reads.', NULL, 1, '{}', 'dane', ${Date.now() - 60000}, ${Date.now()}, 'demo');`)
    { const c = await desk(); const p = await page(c, 'germaine-what'); await openProfile(p)
      await p.getByTestId('qanvast-what').click(); await settle(p, 500)
      ok(/Words a Designer reads\./.test(await text(p.getByTestId('qanvast-sent'))) && await p.getByTestId('qanvast-actions').count() === 0, 'Germaine opens What Qanvast has — and still has no presses')
      await c.close() }
    sql(`delete from studio_verifications where id = 's37-read'`)
    /* Accounting keeps the books: Company › Profile is not theirs (the house gate, lib/settings/roles.ts) — and Maison AI's answer sends them nowhere they can't open */
    as('priya')
    { const c = await desk(); const p = await page(c, 'priya'); await go(p, '/company/profile', 1400)
      ok(await card(p).count() === 0, 'Priya (Accounting): Company › Profile is behind the house gate, as before')
      await fab(p)
      const a = await ask(p, 'Are we listed on Qanvast?')
      ok(/Qanvast asks for changes/.test(await text(a)) && await a.locator('a[href*="/company/profile"]').count() === 0, '…Maison AI still answers, with no door she can’t open')
      await c.close() }
    as('dane')

    // ── 6 · every width; the ghost ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 390 · 320 touch, the ghost')
    /* back to the demo's own listing for the widths and the ghost */
    sql(`delete from studio_verifications`)
    sqlFile(`INSERT INTO studio_verifications (id, kind, status, studio_name, uen, submitted_at, reviewed_at) VALUES ('s37-outside', 'outside', 'verified', 'Demo Studio Pte Ltd', '201234567M', ${firstQ}, ${firstQ});`)
    for (const [w, h] of [[390, 844], [320, 640]]) {
      const c = await phoneCtx(w, h); const p = await page(c, `phone-${w}`)
      await openProfile(p)
      ok(await sideways(p) <= 0, `${w}: Profile has no sideways scroll (against screen.width)`, await sideways(p))
      if (w === 390) await card(p).screenshot({ path: path.join(dir, '10-card-390.png') })
      await press(p, 'qanvast-update', 1000)
      const box = await p.locator('[role="dialog"][aria-label="Update your listing on Qanvast"]').boundingBox()
      ok(!!box && box.width <= w + 1 && box.y > 0 && box.y + box.height >= h - 2, `${w}: the application rises as a bottom sheet`, box)
      ok(await sideways(p) <= 0, `${w}: no sideways scroll with the sheet open`)
      if (w === 390) await shot(p, '11-dialog-390')
      await p.getByTestId('qanvast-proof-project').scrollIntoViewIfNeeded()
      if (w === 390) await shot(p, '12-dialog-proof-390')
      await c.close()
    }
    /* the tablet and the small desk: a plain column, the dialog a centred panel at 1024 and a sheet on a touch tablet's narrow side */
    for (const [o, tag] of [[{ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }, '768 touch'], [{ viewport: { width: 1024, height: 768 } }, '1024']]) {
      const c = await b.newContext(o); const p = await page(c, `w-${tag}`)
      await openProfile(p)
      ok(await sideways(p) <= 0, `${tag}: Profile has no sideways scroll`, await sideways(p))
      await press(p, 'qanvast-update', 1000)
      ok(await dialog(p).count() === 1 && await sideways(p) <= 0, `${tag}: the application opens, no sideways scroll`)
      await c.close()
    }
    for (const [o, tag] of [[{ viewport: { width: 1440, height: 2600 } }, '1440'], [{ viewport: { width: 390, height: 4200 }, isMobile: true, hasTouch: true }, '390']]) {
      const r = await measure(b, o, '/company/profile', ['qanvast-listing.'], 12)
      if (r.none) { ok(false, `the ghost of Profile at ${tag} held`); continue }
      const off = r.rows.filter((x) => Math.abs(x.dy) > 3 || Math.abs(x.dx) > 3)
      ok(off.length === 0 && r.rows.length >= 4, `the ghost of Listed on Qanvast at ${tag} lands where the card does`, off.slice(0, 6).map((x) => `${x.k}#${x.i} dx${x.dx} dy${x.dy}`).join(' · ') || `${r.rows.length} measured`)
    }
    { const c = await desk(); const p = await page(c, 'final'); await openProfile(p); await shot(p, '13-profile-1440', false); await c.close() }
  } catch (e) {
    fail++; console.log('  ✗ the probe threw:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length} table(s) — ${changed.join(', ')}`)
    const same = TABLES.every((t) => hashOf(t) === before.get(t))
    ok(same, 'every table is as the probe found it')
    ok(sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`) === stages0 && sql(`select count(*) from stage_logs`) === logs0, 'leads’ stages and stage logs as found')
    ok(errors.length === 0, 'no page errors', errors)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
