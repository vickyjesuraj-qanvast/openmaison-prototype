// Step S46D · what a 1.0 user can't find, fixed — D2 (signing a file, 1.0's file-signing links) and D4 (Pricing on the website). His "Please go
// ahead and fix everything" (2026-10-19) after the findability audit (design-source/context/parity/31-findability-audit-2026-10-19/). Each item
// asserted as the rule it builds, never another round's count:
//  D2 · Files › ⋮ › Send for signature: a PDF's row opens Import a contract with the file already in it (no upload); Import makes the contract
//       (a copy kept in Files › Contract & VOs, the original left where it was — or the very file when it sits there already) and opens its editor,
//       whose Close comes back to Files; Send for digital signature goes out (WhatsApp, Sent to Client). A picture's row says why it can't
//       ("Save it as a PDF…"), a PDF a contract keeps says which contract; the file viewer's ⋮ has the same row. Who: Dane (Owner) and Germaine
//       (Designer, on her project's Files) get it; Priya (Accounting, Files read-only) and Nurul (Marketing) don't.
//  D2 · 1.0's /sign/document/<token>: a token a contract carries lands on /sign/<token> (the signing page); any other says the link no longer
//       works, in the studio's name — never "page not found".
//  D4 · /pricing → /site/pricing (signed out, its title, canonical, card, breadcrumb); every figure equals lib/credits/plans.ts and the price list
//       (read from the code here, never typed); Annual and Studio reprice; the bar, the footer, the phone's Platform sheet, Home, the hub and a
//       module page lead to it; the sitemap and llms.txt name it; 2.0's names only (no tokens, Co-Pilot, MYOB); its ghost lands where the page
//       does; no sideways scroll at 1440 · 390 · 320.
//  D4 · a plan's button carries ?plan= through sign-up into Plans (the new studio's first page opens Plans on Pro — Studio, the address tidied, the
//       welcome waiting until Plans closes); Freelance starts sign-up as a business of one; /upgrade?plan= opens Plans on its plan (Max: Talk to us
//       over it); Plans' Compare everything says what 2.0 does.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3185 NODE_PATH=<repo>/node_modules node verify-pm2-s46d.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s46d')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3185'
const REPO = path.resolve(__dirname, '../../..')
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const HOME = `${path.resolve(DB)}.studios`   // where the server keeps the studios started on it (S31)
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const o = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return o ? JSON.parse(o) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s46d-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const made = () => { try { return fs.readdirSync(HOME).filter((f) => /\.db$/.test(f)) } catch { return [] } }

/* the one source, read from the code itself — the page must say these */
const SRC = JSON.parse(execSync(`npx tsx -e "Promise.all([import('./lib/credits/plans.ts'), import('./lib/credits/schedule.ts')]).then(([p, s]) => console.log(JSON.stringify({ rows: p.PLAN_ROWS, schedule: s.CREDIT_SCHEDULE, topup: { min: p.TOPUP_MIN, max: p.TOPUP_MAX, cents: p.TOPUP_CENTS_PER_CREDIT, picks: p.TOPUP_PICKS } })))"`, { cwd: REPO }).toString().trim().split('\n').pop())
const ROW = Object.fromEntries(SRC.rows.map((r) => [r.id, r]))
const sgd = (cents) => `S$${(cents / 100).toLocaleString('en-SG', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
const n = (x) => x.toLocaleString('en-SG')

const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'   // a lead in Met, Dane's, no project, no contract
const BEN_PROJECT = 'a3f655a3-c603-42b0-af12-2767a0500138'   // Benjamin Han's project — Germaine is on it
const BEN_PDF = '045b7466-26e0-4a4f-a849-2cc1847dc388'   // its "Site measurements.pdf", bytes kept
const ORIG = 'ffffd46d-0000-4000-8000-000000000001'   // a PDF put on Kevin Ng's Files by this probe (taken away after)
const INPLACE = 'ffffd46d-0000-4000-8000-000000000002'   // one put straight into his Files › Contract & VOs

;(async () => {
  const b = await chromium.launch()
  const errors = []
  if (fs.existsSync(HOME) && made().length) { console.log(`  ✗ ${HOME} already holds studios — start from a clean scratch copy`); process.exit(1) }
  /* the app's own lazy writes first (the credits' month roll), so the snapshot is what the app keeps */
  { const w = await b.newPage(); await w.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await w.waitForTimeout(2000); await w.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid" | shasum`).toString().trim()
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    if (!changed.length) return changed
    let text = 'PRAGMA foreign_keys = OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phone = (w = 390) => b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })
  const out = async (ctx) => { await ctx.addCookies([{ name: 'om_seen', value: 'out', url: BASE }]); await ctx.addInitScript(() => { try { sessionStorage.setItem('om.site.intro', '1') } catch {} }) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 800) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 900) => { const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms); return r }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t0 > ms) return v; await new Promise((r) => setTimeout(r, 150)) } }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const pathOf = (p) => { const u = new URL(p.url()); return u.pathname + u.search }
  const stubWa = async (ctx) => { await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' })); ctx.on('page', (q) => { if (q.url().includes('wa.me')) void q.close().catch(() => {}) }) }
  const menuItem = (p, re) => p.locator('[role="menuitem"]').filter({ hasText: re }).first()
  const pdfBytes = sql(`select data from lead_file_images where file_id = '${BEN_PDF}'`)
  const now = Math.floor(Date.now() / 1000)
  const putPdf = (id, name, parent) => sqlFile(`INSERT INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES ('${id}', '${KEVIN}', 'pdf', ${lit(name)}, NULL, ${now}, ${lit(parent)}, 'dane', 1500, 'application/pdf', ${now});\nINSERT INTO lead_file_images (file_id, data) VALUES ('${id}', ${lit(pdfBytes)});\n`)

  try {
    // ── 1 · Files › ⋮ › Send for signature (Dane, Owner) ──────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Files › ⋮ › Send for signature')
      as('dane')
      putPdf(ORIG, 'Renovation agreement.pdf', null)
      const C = await desk(); await stubWa(C); const p = await page(C, 'files')
      await go(p, `/leads/${KEVIN}/files`, 1500)
      await p.getByRole('button', { name: 'Actions for Renovation agreement.pdf' }).first().click(); await settle(p, 500)
      const row = menuItem(p, /^Send for signature/)
      ok(await row.count() === 1 && (await row.getAttribute('aria-disabled')) !== 'true' && /It goes out as a contract/.test(await row.innerText()), 'a PDF’s ⋮: “Send for signature” — its line says where it goes')
      await shot(p, 'pm2-s46d-files-row-1440')
      await row.click(); await settle(p, 700)
      const dlg = p.getByRole('dialog', { name: 'Import a contract' })
      const dt = await text(dlg)
      ok(await dlg.count() === 1 && /Renovation agreement\.pdf/.test(dt) && await dlg.locator('input[type="file"]').count() === 0, 'it opens Import a contract with the file already in it — nothing to upload')
      ok(/A PDF from the lead’s Files\. It joins the lead’s contracts, a copy is kept in Files › Contract & VOs/.test(dt), 'the dialog says a copy is kept in Files › Contract & VOs (the file sits elsewhere)')
      await shot(p, 'pm2-s46d-import-prefilled-1440')
      const filesBefore = Number(sql(`select count(*) from lead_files where lead_id = '${KEVIN}' and deleted_at is null`))
      await dlg.getByTestId('import-contract-go').click()
      await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {}); await settle(p, 1800)
      const NEW = /\/contracts\/([0-9a-f-]{36})/.exec(p.url())?.[1] ?? ''
      const c = json(`select title, status, source, file_id, file_name from contracts where id = '${NEW}'`)[0] ?? {}
      const kf = json(`select f.id, f.name, f.parent_id, (select name from lead_files x where x.id = f.parent_id) folder, (select 1 from lead_file_images i where i.file_id = f.id) bytes from lead_files f where f.id = ${lit(c.file_id)}`)[0] ?? {}
      ok(!!NEW && c.source === 'uploaded' && c.status === 'Draft' && c.title === 'Renovation agreement', `Import makes the contract: “${c.title}”, a PDF, a Draft`)
      ok(kf.id && kf.id !== ORIG && kf.folder === 'Contract & VOs' && kf.bytes === 1 && kf.name === 'Renovation agreement.pdf', 'its PDF is a copy kept in Files › Contract & VOs, with its bytes')
      ok(sql(`select count(*) from lead_files where id = '${ORIG}' and deleted_at is null and parent_id is null`) === '1' && Number(sql(`select count(*) from lead_files where lead_id = '${KEVIN}' and deleted_at is null`)) >= filesBefore + 1, 'the original stays where the studio filed it')
      ok(/[?&]from=%2Fleads%2F/.test(p.url()) || /[?&]from=\/leads\//.test(p.url()), 'the editor opens with the way back to Files')
      await shot(p, 'pm2-s46d-editor-1440')
      /* the existing Send for digital signature */
      await p.getByRole('button', { name: 'Send', exact: true }).click(); await settle(p, 700)
      const send = p.getByRole('dialog').filter({ hasText: 'Send for signature' })   // (the calm UI build 2026-10-27, a deliberate change) W-359
      ok(await send.count() === 1, 'Send opens Send for signature')
      await send.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await settle(p, 1800)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
      ok(sql(`select status from contracts where id = '${NEW}'`) === 'Sent to Client' && /Sent to Kevin Ng for signature/.test(await snackText(p)), 'the file goes out for signature — Sent to Client, “Sent to Kevin Ng for signature”')
      await p.getByRole('button', { name: 'Close', exact: true }).first().click()
      await p.waitForURL(/\/leads\/[0-9a-f-]+\/files/, { timeout: 15000 }).catch(() => {}); await settle(p, 1200)
      ok(new URL(p.url()).pathname === `/leads/${KEVIN}/files`, `Close comes back to Files (${new URL(p.url()).pathname})`)
      /* the copy a contract keeps says so */
      const folderId = kf.parent_id
      await go(p, `/leads/${KEVIN}/files?folder=${folderId}`, 1200)
      await p.getByRole('button', { name: 'Actions for Renovation agreement.pdf' }).first().click(); await settle(p, 500)
      const keptRow = menuItem(p, /^Send for signature/)
      ok((await keptRow.getAttribute('aria-disabled')) === 'true' && /Already in Contracts as “Renovation agreement”/.test(await keptRow.innerText()), 'the PDF a contract keeps: the row says which contract (disabled, why in the row)')
      await p.keyboard.press('Escape'); await settle(p, 300)
      /* a PDF already in Files › Contract & VOs is the contract's PDF as it is — here signed already */
      putPdf(INPLACE, 'Signed letter of offer.pdf', folderId)
      await go(p, `/leads/${KEVIN}/files?folder=${folderId}`, 1200)
      await p.getByRole('button', { name: 'Actions for Signed letter of offer.pdf' }).first().click(); await settle(p, 500)
      await menuItem(p, /^Send for signature/).click(); await settle(p, 700)
      const dlg2 = p.getByRole('dialog', { name: 'Import a contract' })
      ok(/It joins the lead’s contracts as it is/.test(await text(dlg2)), 'from Files › Contract & VOs the dialog says the contract keeps the file as it is')
      await dlg2.locator('label').filter({ hasText: 'This copy is already signed' }).click(); await settle(p, 200)
      await dlg2.getByTestId('import-contract-go').click()
      await p.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 20000 }).catch(() => {}); await settle(p, 1500)
      const NEW2 = /\/contracts\/([0-9a-f-]{36})/.exec(p.url())?.[1] ?? ''
      const c2 = json(`select status, file_id from contracts where id = '${NEW2}'`)[0] ?? {}
      ok(c2.file_id === INPLACE && c2.status === 'Signed', 'that very file is the contract’s PDF (no copy), and “already signed” lands it Signed')
      /* a picture and the file viewer */
      await go(p, `/leads/${KEVIN}/files/be3a79be-964f-4c78-aa9d-8ba9388b851c`, 1200)
      await p.getByRole('button', { name: 'More options' }).click(); await settle(p, 500)
      const pic = menuItem(p, /^Send for signature/)
      ok((await pic.getAttribute('aria-disabled')) === 'true' && /Save it as a PDF first/.test(await pic.innerText()), 'a picture: the row says why — “Save it as a PDF first” (no PDF writer in the app)')
      await shot(p, 'pm2-s46d-viewer-picture-1440')
      await p.keyboard.press('Escape'); await settle(p, 300)
      await go(p, `/leads/${KEVIN}/files/${ORIG}`, 1500)
      await p.getByRole('button', { name: 'More options' }).click(); await settle(p, 500)
      await menuItem(p, /^Send for signature/).click(); await settle(p, 700)
      ok(/Renovation agreement\.pdf/.test(await text(p.getByRole('dialog', { name: 'Import a contract' }))), 'the file viewer’s ⋮ has the same row, the same dialog with the file in it')
      await p.getByRole('dialog', { name: 'Import a contract' }).getByRole('button', { name: 'Cancel' }).click(); await settle(p, 400)
      await C.close()
      /* 390 touch: the row in the bottom sheet, the dialog */
      const P = await phone(); const q = await page(P, 'files-phone')
      await go(q, `/leads/${KEVIN}/files`, 1500)
      await q.getByRole('button', { name: 'Actions for Renovation agreement.pdf' }).first().click(); await settle(q, 700)
      ok(await menuItem(q, /^Send for signature/).isVisible(), '390: the row is in the file’s sheet')
      await shot(q, 'pm2-s46d-files-row-390')
      await menuItem(q, /^Send for signature/).click(); await settle(q, 900)
      await shot(q, 'pm2-s46d-import-prefilled-390')
      ok(await sideways(q) <= 0, '390: no sideways scroll with the dialog open')
      await P.close()
    }

    // ── 2 · Who gets it ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Who gets Send for signature')
      const rowFor = async (member, url, file) => {
        as(member); const C = await desk(); const p = await page(C, `who-${member}`)
        await go(p, url, 1500)
        const btn = p.getByRole('button', { name: `Actions for ${file}` }).first()
        let has = false, gate = false
        if (await btn.count()) { await btn.click(); await settle(p, 500); has = (await menuItem(p, /^Send for signature/).count()) > 0 } else gate = true
        await C.close(); return { has, gate }
      }
      const g = await rowFor('germaine', `/projects/${BEN_PROJECT}/files`, 'Site measurements.pdf')
      ok(g.has, 'Germaine (Designer, on the project) gets it on the project’s Files')
      const a = await rowFor('priya', `/projects/${BEN_PROJECT}/files`, 'Site measurements.pdf')
      ok(!a.has, `Priya (Accounting, Files read-only) doesn’t${a.gate ? ' (no row menu at all)' : ' — her ⋮ keeps Open and Download'}`)
      const m = await rowFor('nurul', `/projects/${BEN_PROJECT}/files`, 'Site measurements.pdf')
      ok(!m.has, `Nurul (Marketing) doesn’t${m.gate ? ' — the page isn’t hers' : ''}`)
      as('dane')
    }

    // ── 3 · 1.0's /sign/document/<token> ────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · 1.0’s /sign/document/<token>')
      const sent = sql(`select id from contracts where status = 'Sent to Client' and deleted_at is null and archived_at is null and lead_id in (select id from leads where deleted_at is null) order by updated_at desc limit 1`)
      const OLD = '6b1f0c2e-4d5a-4e7b-9c3d-1a2b3c4d5e6f'   // 1.0's request token is a UUID — the port carries it into contracts.sign_token
      const token0 = sql(`select sign_token from contracts where id = '${sent}'`)
      sql(`update contracts set sign_token = '${OLD}' where id = '${sent}'`)
      for (const [w, ctxOf] of [[1440, () => desk()], [390, () => phone()]]) {
        const C = await ctxOf(); await out(C); const p = await page(C, `old-link-${w}`)
        await go(p, `/sign/document/${OLD}`, 1500)
        ok(new URL(p.url()).pathname === `/sign/${OLD}` && await p.locator('[data-testid="signing-page"]').count() === 1, `${w}: a token a contract carries lands on its signing page (${new URL(p.url()).pathname})`)
        await shot(p, `pm2-s46d-old-link-signing-${w}`)
        const r = await go(p, '/sign/document/0b6e1a9c-77aa-4f44-9a10-5d2c3e4f5a6b', 900)
        const notice = await text(p.locator('[data-testid="link-notice"]'))
        ok(r?.status() === 200 && new URL(p.url()).pathname.startsWith('/sign/document/') && /This link is no longer active/.test(notice) && /Please ask .+ for an updated link\./.test(notice), `${w}: any other token: “This link is no longer active” in the studio’s name — never page not found`)
        await shot(p, `pm2-s46d-old-link-notice-${w}`)
        ok(await sideways(p) <= 0, `${w}: no sideways scroll`)
        await C.close()
      }
      sql(`update contracts set sign_token = ${lit(token0)} where id = '${sent}'`)
    }

    // ── 4 · Pricing on the website ───────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Pricing on the website')
      const C = await desk(); await out(C); const p = await page(C, 'pricing')
      const r0 = await p.goto(BASE + '/pricing', { waitUntil: 'networkidle' }); await settle(p, 600)
      ok(new URL(p.url()).pathname === '/site/pricing' && r0?.status() === 200, '1.0’s /pricing lands on the site’s Pricing')
      const tags = await p.evaluate(() => ({ h1: [...document.querySelectorAll('h1')].map((h) => h.textContent), title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '', og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type'] } catch { return 'bad' } }) }))
      ok(tags.h1.length === 1 && /Everything your studio needs\. Starting free\./.test(tags.h1[0]) && /\| OpenMaison$/.test(tags.title) && tags.canonical.endsWith('/site/pricing') && /\/card\/site\/pricing/.test(tags.og) && tags.ld.includes('BreadcrumbList'), `one h1, “${tags.title}”, canonical, card and breadcrumb`)
      const t = await p.locator('main').innerText()
      /* the cards — every figure from the one source */
      const free = ROW.free, fl = ROW.pro_freelance, st = ROW.pro_studio, mx = ROW.max
      ok(await text(p.getByTestId('pricing-price-free')) === sgd(0) && new RegExp(`${n(free.signupCreditGrant)} AI credits to start, then ${n(free.creditAllowance)} a month`).test(await text(p.getByTestId('pricing-allowance-free'))), `Free: S$0, ${free.signupCreditGrant} AI credits to start then ${free.creditAllowance} a month (plans.ts)`)
      ok(await text(p.getByTestId('pricing-price-pro')) === sgd(fl.monthlyPrice) && new RegExp(`^${n(fl.creditAllowance)} AI credits a month`).test(await text(p.getByTestId('pricing-allowance-pro'))), `Pro — Freelance monthly: ${sgd(fl.monthlyPrice)}, ${n(fl.creditAllowance)} AI credits (plans.ts)`)
      ok(await text(p.getByTestId('pricing-price-max')) === 'Let’s talk' && new RegExp(`^${n(mx.creditAllowance)} AI credits a month, per seat`).test(await text(p.getByTestId('pricing-allowance-max'))), `Max: Let’s talk, ${n(mx.creditAllowance)} AI credits a seat (plans.ts)`)
      ok(await p.getByTestId('pricing-cta-free').getAttribute('href') === '/sign-up?plan=free' && await p.getByTestId('pricing-cta-pro').getAttribute('href') === '/sign-up?plan=pro_freelance&period=monthly' && /Start 14-day free trial/.test(await text(p.getByTestId('pricing-cta-pro'))), 'the buttons carry the pick: Free → /sign-up?plan=free, Pro → /sign-up?plan=pro_freelance&period=monthly (“Start 14-day free trial”)')
      await shot(p, 'pm2-s46d-pricing-1440')
      await p.getByTestId('pricing-kind').getByText('Studio', { exact: true }).click(); await settle(p, 300)
      ok(await text(p.getByTestId('pricing-price-pro')) === sgd(st.monthlyPrice) && new RegExp(`^${n(st.creditAllowance * st.minSeats)} AI credits a month, shared`).test(await text(p.getByTestId('pricing-allowance-pro'))) && await p.getByTestId('pricing-cta-pro').getAttribute('href') === '/sign-up?plan=pro_studio&period=monthly', `Studio: ${sgd(st.monthlyPrice)} for ${st.minSeats} seats, ${n(st.creditAllowance * st.minSeats)} AI credits shared; the button carries pro_studio`)
      await p.getByTestId('pricing-period').getByText(/^Annual/).click(); await settle(p, 300)
      const annual = await text(p.getByTestId('pricing-annual'))
      ok(await text(p.getByTestId('pricing-price-pro')) === sgd(st.yearlyPrice) && new RegExp(`${sgd(Math.round(st.yearlyPrice / 12)).replace('$', '\\$')} a month, saves ${sgd(st.monthlyPrice * 12 - st.yearlyPrice).replace('$', '\\$')}`).test(annual) && await p.getByTestId('pricing-cta-pro').getAttribute('href') === '/sign-up?plan=pro_studio&period=yearly', `Annual reprices from plans.ts: ${sgd(st.yearlyPrice)}/year (“${annual}”), the button carries period=yearly`)
      ok(/Annual · 1 month free/.test(t), 'the period says “Annual · 1 month free” (annual = 11 × monthly)')
      /* the price list */
      const S = SRC.schedule
      const acts = await p.getByTestId('pricing-actions').locator('li').evaluateAll((els) => els.map((e) => [e.getAttribute('data-action'), e.querySelector('[data-testid="pricing-action-credits"]')?.textContent]))
      ok(acts.length === 5 && acts.every(([k, v]) => S[k] && String(S[k].credits) === v), `AI credits per action are the price list’s (${acts.map((a) => a.join(' ')).join(' · ')})`)
      const months = await text(p.getByTestId('pricing-months'))
      ok(new RegExp(`Free ${n(free.creditAllowance)} ${Math.floor(free.creditAllowance / S.render_fast.credits)} renders`).test(months) && new RegExp(`Pro Studio, ${st.minSeats} seats ${n(st.creditAllowance * st.minSeats)} ${n(Math.floor(st.creditAllowance * st.minSeats / S.render_fast.credits))} renders`).test(months), 'what a month buys is worked from the plans and the price list')
      const top = await text(p.getByTestId('pricing-topup'))
      ok(new RegExp(`from ${n(SRC.topup.min)} to ${n(SRC.topup.max)} AI credits, at ${sgd(SRC.topup.cents * 100).replace('$', '\\$')} per 100`).test(top) && SRC.topup.picks.every((k) => top.includes(`${n(k)} ${sgd(k * SRC.topup.cents)}`)), `top-ups from plans.ts: ${top.slice(0, 90)}…`)
      /* the comparison says what 2.0 does */
      const cmp = await text(p.getByTestId('pricing-compare'))
      ok(/Quote X-Ray/.test(cmp) && /Purchase orders/.test(cmp) && !/MYOB|Zoho|Gantt|homeowner/i.test(cmp) && /Meeting Copilot/.test(cmp), 'the comparison: 2.0’s names, no MYOB / Zoho, the client portal')
      const poCells = await p.getByTestId('pricing-compare-row').filter({ hasText: 'Purchase orders' }).first().locator('[role="cell"]').allInnerTexts()
      ok(poCells.every((x) => /Included/.test(x)), 'purchase orders on every plan (2.0 locks only the seven Pro features)')
      const xr = await p.getByTestId('pricing-compare-row').filter({ hasText: 'Quote X-Ray' }).first().locator('[role="cell"]').allInnerTexts()
      ok(/Not included/.test(xr[0]) && /Included/.test(xr[1]) && /Included/.test(xr[2]), 'Quote X-Ray: Free —, Pro ✓, Max ✓ (the lock)')
      ok(!/\btokens?\b/i.test(t) && !/Co-Pilot|Co-pilot|Visualiser|mAIson|Quote Digiti/.test(t) && /AI credits/.test(t) && /Meeting Copilot/.test(t), '2.0’s names only — AI credits (never tokens), the Meeting Copilot')
      ok(await p.getByTestId('pricing-faq').locator('button[aria-expanded]').count() >= 9 && /A unit of AI\. A Fast render is 10/.test(await text(p.getByTestId('pricing-faq'))), 'the questions: Plans’ five and the visitor’s four, the first open')
      await shot(p, 'pm2-s46d-pricing-full-1440', true)
      /* Max talks to the team: Book a demo */
      await p.getByTestId('pricing-cta-max').click(); await settle(p, 700)
      ok(await p.getByRole('dialog').filter({ hasText: /Book a demo/i }).count() === 1, 'Max’s Talk to us opens Book a demo')
      await p.keyboard.press('Escape'); await settle(p, 500)
      /* the doors */
      ok(await p.locator('header nav[aria-label="Primary"] a[href="/site/pricing"]').first().innerText() === 'Pricing', 'the bar: Pricing')
      ok(await p.locator('[data-testid="site-footer"] a[href="/site/pricing"]').count() === 1, 'the footer: Pricing')
      await go(p, '/site', 500)
      ok(await p.locator('a[href="/site/pricing"]').filter({ hasText: 'See pricing' }).count() >= 1, 'Home: See pricing')
      await go(p, '/site/platform', 500)
      ok(await p.getByTestId('hub-closing-pricing').getAttribute('href') === '/site/pricing', 'the platform hub: See pricing')
      await go(p, '/site/platform/leads', 500)
      ok(await p.getByTestId('module-pricing').getAttribute('href') === '/site/pricing', 'a module page: See pricing beside its call')
      const sm = await (await p.request.get(BASE + '/sitemap.xml')).text()
      ok(/\/site\/pricing</.test(sm), 'the sitemap lists /site/pricing')
      const llms = await (await p.request.get(BASE + '/llms.txt')).text()
      ok(/\/site\/pricing/.test(llms) && !/Pricing is not public/.test(llms), 'llms.txt names the Pricing page')
      const card = await p.request.get(BASE + '/card/site/pricing')
      ok(card.status() === 200 && /image\/png/.test(card.headers()['content-type'] ?? ''), 'its link-preview card draws')
      await C.close()
      /* widths */
      for (const w of [390, 320]) {
        const P = await phone(w); await out(P); const q = await page(P, `pricing-${w}`)
        await go(q, '/site/pricing', 900)
        ok(await sideways(q) <= 0, `${w}: no sideways scroll`)
        if (w === 390) {
          await shot(q, 'pm2-s46d-pricing-390')
          const cell = q.getByTestId('pricing-compare-row').first().locator('[role="cell"]').first()
          await cell.scrollIntoViewIfNeeded(); await settle(q, 300)
          ok(/FREE/i.test(await cell.innerText()), '390: each comparison cell names its plan')
          await shot(q, 'pm2-s46d-pricing-compare-390')
          await q.getByTestId('site-phone-platform').click(); await settle(q, 700)
          ok(await q.getByTestId('site-sheet-pricing').getAttribute('href') === '/site/pricing', '390: the Platform sheet carries See pricing')
        } else await shot(q, 'pm2-s46d-pricing-320')
        await P.close()
      }
      /* the ghost lands where the page does */
      for (const [w, touch] of [[1440, false], [390, true]]) {
        const G = await b.newContext({ viewport: { width: w, height: touch ? 844 : 1024 }, ...(touch ? { isMobile: true, hasTouch: true } : {}), reducedMotion: 'reduce' }); await out(G)
        const g = await page(G, `ghost-${w}`)
        await g.route('**/*', (r) => (r.request().headers()['next-router-prefetch'] ? r.abort() : r.continue()))
        await go(g, '/site/story', 300)
        const cdp = await G.newCDPSession(g); await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 4000, uploadThroughput: 100000 })
        await g.evaluate(() => { window.next?.router?.push('/site/pricing') })
        const ghost = g.locator('[aria-busy="true"][role="status"]').first()
        const seen = await waitFor(async () => (await ghost.count()) > 0, 9000)
        const gTop = seen ? (await ghost.locator('h2').first().boundingBox().catch(() => null))?.y ?? null : null
        if (seen) await shot(g, `pm2-s46d-pricing-ghost-${w}`)
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
        await waitFor(async () => (await ghost.count()) === 0, 12000); await settle(g, 500)
        const pTop = (await g.locator('main h1').first().boundingBox().catch(() => null))?.y ?? null
        ok(seen && gTop !== null && pTop !== null && Math.abs(gTop - pTop) <= 8, `${w}${touch ? ' touch' : ''}: the ghost’s heading at ${Math.round(gTop ?? -1)}, the page’s at ${Math.round(pTop ?? -1)}`)
        await G.close()
      }
    }

    // ── 5 · A plan picked on the site rides through sign-up into Plans ───────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · The plan rides through sign-up into Plans')
      const C = await desk(); await out(C); const p = await page(C, 'sign-up')
      await go(p, '/site/pricing', 600)
      await p.getByTestId('pricing-kind').getByText('Studio', { exact: true }).click(); await settle(p, 200)
      await p.getByTestId('pricing-cta-pro').click()
      await p.waitForURL(/\/sign-up/, { timeout: 15000 }); await settle(p, 900)
      ok(pathOf(p) === '/sign-up?plan=pro_studio&period=monthly', `Pro — Studio’s button opens sign-up with the pick (${pathOf(p)})`)
      ok(await p.locator('[data-testid="sign-up-kind"][data-kind="studio"][data-checked]').count() === 1, '“I run a studio” is picked')
      await p.getByTestId('sign-up-continue').click(); await settle(p, 500)
      ok(/You start on Free, and Plans opens on Pro — Studio as soon as your studio is ready\./.test(await text(p.getByTestId('sign-up-plan'))), 'the details say where the plan went')
      await shot(p, 'pm2-s46d-sign-up-plan-1440')
      for (const [label, v] of [['Studio name', 'Tan & Ong Studio'], ['Your name', 'Tan Mei Ling'], ['Mobile number', '93334455']]) await p.getByLabel(label, { exact: true }).fill(v)
      await p.getByTestId('sign-up-send').click(); await settle(p, 1200)
      await p.getByTestId('sign-up-digit').first().click(); await p.keyboard.type('123456'); await settle(p, 200)
      await p.getByTestId('sign-up-go').click()
      await p.waitForURL((u) => !/\/sign-up/.test(String(u)), { timeout: 25000 }).catch(() => {})
      await p.waitForLoadState('networkidle').catch(() => {}); await settle(p, 2500)
      const plans = p.getByRole('dialog', { name: 'Plans' })
      ok(made().length === 1 && await plans.isVisible().catch(() => false), `the studio is made and its first page opens Plans (${pathOf(p)})`)
      ok(!/plan=/.test(p.url()) && new URL(p.url()).pathname === '/dashboard', `…at the front door, the address tidied (${pathOf(p)})`)
      ok(await plans.getByTestId('plan-price').innerText() === sgd(ROW.pro_studio.monthlyPrice) && (await plans.getByRole('radio', { name: 'Studio' }).getAttribute('aria-checked').catch(() => null)) !== 'false', `Plans opens on Pro — Studio, monthly (${await plans.getByTestId('plan-price').innerText()})`)
      ok(await p.getByRole('dialog').filter({ hasText: /^Welcome,/ }).count() === 0, 'the first-visit welcome waits while Plans is open')
      await shot(p, 'pm2-s46d-plans-on-arrival-1440')
      await p.keyboard.press('Escape'); await settle(p, 1200)
      ok(await waitFor(async () => (await p.getByRole('dialog').filter({ hasText: /Welcome/ }).count()) > 0, 5000), 'Plans closed: the welcome comes')
      await C.close()
      /* Freelance: a business of one */
      const F = await desk(); await out(F); const f = await page(F, 'sign-up-freelance')
      await go(f, '/sign-up?plan=pro_freelance&period=monthly', 600)
      ok(await f.locator('[data-testid="sign-up-kind"][data-kind="solo"][data-checked]').count() === 1, 'Freelance starts sign-up on “I work on my own”')
      await F.close()
      /* the server back on the demo before the files go (S31's way) */
      const D = await desk(); const d = await D.newPage(); await d.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await d.waitForTimeout(800)
      if ((await d.getByTestId('studio-name').innerText().catch(() => '')) !== 'Demo Studio') {
        const w = d.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await w.count()) await w.getByRole('button', { name: 'Not now' }).click().catch(() => {})
        await d.getByTestId('studio-block').click(); await d.waitForTimeout(500)
        await (await openDemo(d)).getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: 'Demo Studio' }).click(); await d.waitForTimeout(2500)
      }
      await D.close()
    }

    // ── 6 · 1.0's /upgrade?plan= and Plans' own table ───────────────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · /upgrade?plan= and Plans’ Compare everything')
      as('dane')
      const C = await desk(); const p = await page(C, 'upgrade')
      await go(p, '/upgrade?plan=pro_studio&period=yearly&seats=5', 2000)
      const plans = p.getByRole('dialog', { name: 'Plans' })
      ok(new URL(p.url()).pathname === '/company/plan/billing' && !/plan=/.test(p.url()), `/upgrade lands on Plan & billing, the address tidied (${pathOf(p)})`)
      const price = await plans.getByTestId('plan-price').innerText().catch(() => '')
      const extra = (5 - ROW.pro_studio.minSeats) * (ROW.pro_studio.extraSeatPriceCents ?? 0) * 11
      ok(await plans.isVisible() && price === sgd(ROW.pro_studio.yearlyPrice + extra), `Plans opens on Studio, annual, five seats (${price})`)
      await shot(p, 'pm2-s46d-upgrade-plans-1440')
      await plans.getByRole('button', { name: 'Compare everything' }).click(); await settle(p, 500)
      const tt = await text(plans)
      ok(/Purchase orders/.test(tt) && /Meeting Copilot/.test(tt) && !/Co-Pilot|MYOB|ZohoBooks/.test(tt) && /Any number of members/.test(tt), 'Plans says what 2.0 does: the Meeting Copilot, no MYOB, Free for any number of members')
      await p.keyboard.press('Escape'); await settle(p, 700)
      await go(p, '/upgrade?plan=max', 2000)
      ok(await p.getByRole('dialog', { name: 'Talk to us about Max' }).isVisible().catch(() => false), '/upgrade?plan=max: Plans with Talk to us about Max over it')
      await C.close()
    }

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.slice(0, 3).join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', e && e.message ? e.message.split('\n')[0] : e)
  } finally {
    if (made().length) {
      try {
        const C = await desk(); const c = await C.newPage(); await c.goto(BASE + '/leads', { waitUntil: 'networkidle' }); await c.waitForTimeout(800)
        if ((await c.getByTestId('studio-name').innerText().catch(() => '')) !== 'Demo Studio') {
          const dlg = c.getByRole('dialog').filter({ hasText: /^Welcome,/ }); if (await dlg.count()) await dlg.getByRole('button', { name: 'Not now' }).click().catch(() => {})
          await c.getByTestId('studio-block').click(); await c.waitForTimeout(500)
          await (await openDemo(c)).getByTestId('demo-studios').getByRole('menuitemradio').filter({ hasText: 'Demo Studio' }).click(); await c.waitForTimeout(2500)
        }
        await C.close()
      } catch (e) { console.log('  ! could not switch the server back to the demo — restart it:', String(e).slice(0, 120)) }
    }
    fs.rmSync(HOME, { recursive: true, force: true })
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    const still = TABLES.filter((t) => hashOf(t) !== before.get(t))
    console.log(still.length ? `  ✗ not as found: ${still.join(', ')}` : '  ✓ the scratch DB is as it was found (and no studio left beside it)')
    if (still.length) fail++
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
