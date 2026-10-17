// Pending modules, step S13 · Client portal leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:client-portal). Each item asserted as the rule it builds, never another round's count:
//  - Privacy · Terms · Contact at the foot of the portal (1.0's Footer Links; the card's PDPA revisit, as recommended): Company › Client portal's
//    Getting it live has a fifth check — the privacy notice — not done until it is linked, its press lands on the Privacy and terms card with
//    the first box focused; a bad address is refused under its field and nothing is saved; Save lands with Undo; ⌘K's card lands on it; a
//    Designer reads it (boxes disabled, no Save, no press on the row). The client: the sign-in page's foot and every portal page's foot carry
//    the links set (only those, in order, each opening the studio's site in a new tab), the paused notice too; none while none is set; never
//    printed; 44 tall under a finger; the ghost draws the foot the page will have
//  - the client's own team's faces on the portal (S01's note): a member's photo shows beside their messages and their answers to an issue,
//    through the portal's own address (/my/<address>/face/<picture>) — only the photos of members on that client's homes (another team's
//    member, a made-up id, a visitor signed out: nothing); a studio's preview draws them through its own address; no /company/picture/ on a
//    client's page
//  - an address no studio here holds (S02's note): a 1.0 link naming it lands on that address's own notice, never on this studio's portal; the
//    notice's tab says so and carries no studio's card; this studio's own old links still land on it
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width); the portal never says OpenMaison
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s13.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s13')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s13-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAfElEQVR4nA3JIQ5EMQhAwX/OdxIEQaEaBKKpQm2QlRxwO3a+EcYYZxaTzGGK+fFd4RrXuYub3MMt7osW2minF530oYt+UUIZ5dSikjpUUS+2sI3t7MVO9mEX+0UIYYQTi0jiEEW8cMENd3zhiR+88BcqqKGOLjTRgxb64w9oYl/BRFVSYQAAAABJRU5ErkJggg=='   // an 8×8 warm tile — a whole PNG (S01's 4×4 has a bad checksum and draws one row)
const PHONE = { ben: '97731968', kevin: '96882109', meiling: '91827364' }
const BEN = sql(`select id from leads where name = 'Benjamin Han' and deleted_at is null`)
const BEN_T = sql(`select id from project_tickets where number = 'T-2026-004'`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const signIn = async (p, num) => {
    await go(p, '/my/demo-studio/login')
    await p.locator('input[type="tel"]').fill(num)
    await p.getByRole('button', { name: 'Send me a code' }).click(); await settle(p, 1000)
    await p.locator('[data-testid="portal-digit"]').first().fill('482913'); await p.getByRole('button', { name: 'Open my project' }).click()
    await p.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(p, 1200)
  }
  const footWords = (p) => p.locator('[data-testid="portal-foot"] a').evaluateAll((as) => as.map((a) => ({ word: a.textContent, href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })))

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/company/portal'); await settle(p0, 1500); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }

  try {
    as('dane')
    /* Try it yourself counted from its own record — the demo may or may not have it */
    sql(`update settings set value = json_set(value, '$.testedAt', json('null')) where key = 'portal'`)
    sql(`delete from settings where key = 'portal_links'`)

    // ── 1 · Company › Client portal: the fifth check and its card ────────────────────────────────────────────────────────────────
    console.log('1 · Company › Client portal — the privacy notice')
    const D = await desk(); const d = await page(D, 'studio')
    await go(d, '/company/portal'); await settle(d, 1200)
    const check = d.locator('[data-card="portal-checklist"]')
    ok(/3 of 5 done/.test(await text(check)), 'Getting it live counts five checks — the privacy notice is the fifth (3 of 5 done: address, look, how clients pay)')
    const row = d.getByTestId('portal-step-privacy')
    ok(await row.count() === 1 && !(await row.getAttribute('data-done')) && /Singapore’s PDPA/.test(await text(row)) && /Privacy notice/.test(await text(row)), 'the Privacy notice row: not done, and it says why (PDPA)')
    const order = await check.locator('[data-testid^="portal-step-"]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-testid').replace('portal-step-', '')))
    ok(order.join(',') === 'address,look,pay,privacy,test', 'in its place: after How clients pay, before Try it yourself')
    const card = d.locator('[data-card="portal-links"]')
    ok(await card.count() === 1 && /0 of 3 linked/.test(await text(card)) && /Singapore’s PDPA/.test(await text(card)), 'the Privacy and terms card: none linked yet, and why it matters')
    await row.getByRole('button', { name: 'Add the link' }).click(); await settle(d, 1200)
    ok(await d.evaluate(() => document.activeElement?.getAttribute('name')) === 'privacy', '“Add the link” lands on the card with the Privacy notice box ready to type in')
    const field = (k) => card.locator(`input[name="${k}"]`)
    await field('privacy').fill('not a web address'); await field('terms').fill('demostudio.sg/terms')
    await card.getByTestId('portal-links-save').click(); await settle(d, 900)
    ok(/Enter a web address, e\.g\. yourstudio\.sg\/privacy/.test(await text(card)) && sql(`select count(*) from settings where key = 'portal_links'`) === '0', 'a box that is not a web address is refused under it — nothing is saved')
    await field('privacy').fill('demostudio.sg/privacy'); await settle(d, 200)
    ok(!/Enter a web address/.test(await text(card)), 'the message clears as it is typed')
    await card.getByTestId('portal-links-save').click(); await settle(d, 1800)
    const saved = JSON.parse(sql(`select value from settings where key = 'portal_links'`) || '{}')
    ok(saved.privacy === 'https://demostudio.sg/privacy' && saved.terms === 'https://demostudio.sg/terms' && saved.contact === null, 'Save keeps each link as a web address (https:// in front of a bare one); the empty box keeps none')
    ok(/Links saved — clients see them at the foot of every page/.test(await snackText(d)), 'the snackbar says where they show, with Undo')
    await shot(d, '01-company-portal-links-1440', true)
    ok(!!(await d.getByTestId('portal-step-privacy').getAttribute('data-done')) && /Linked at the foot of every page — demostudio\.sg\/privacy/.test(await text(d.getByTestId('portal-step-privacy'))) && /4 of 5 done/.test(await text(check)), 'the row ticks: “Linked at the foot of every page — demostudio.sg/privacy” (4 of 5 done)')
    ok(/2 of 3 linked/.test(await text(card)) && await d.getByTestId('portal-step-privacy').getByRole('button', { name: 'Change' }).count() === 1, 'the card counts 2 of 3; the row’s press is Change now')
    await undo(d)
    ok(sql(`select value from settings where key = 'portal_links'`) === JSON.stringify({ privacy: null, terms: null, contact: null }), 'Undo puts the links back as they were — none')
    await go(d, '/company/portal'); await settle(d, 1000)
    ok(!(await d.getByTestId('portal-step-privacy').getAttribute('data-done')), '…and the row is not done again')
    /* the client's checks below need links: Privacy and Contact (Terms left empty — each shows only once set) */
    await field('privacy').fill('https://demostudio.sg/privacy'); await field('contact').fill('demostudio.sg/contact')
    ok(await card.getByRole('button', { name: 'Cancel' }).count() === 1, 'an edit not saved offers Cancel')
    await card.getByTestId('portal-links-save').click(); await settle(d, 1800)
    ok(JSON.parse(sql(`select value from settings where key = 'portal_links'`)).contact === 'https://demostudio.sg/contact', 'saved again: Privacy and Contact')
    /* ⌘K's card lands on it */
    await go(d, '/company/members'); await settle(d, 600)
    await d.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(d, 700)
    await d.keyboard.type('pdpa'); await settle(d, 1400)
    const hit = d.getByRole('option').filter({ hasText: 'Privacy and terms' })
    ok(await hit.count() >= 1, '⌘K finds “Privacy and terms” by its words (pdpa)')
    if (await hit.count()) { await hit.first().click(); await d.waitForURL(/\/company\/portal/, { timeout: 8000 }).catch(() => {}); await settle(d, 1800) }
    const inView = await card.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.bottom > 0 }).catch(() => false)
    ok(/\/company\/portal/.test(d.url()) && inView, '…and opens Company › Client portal on the card')
    /* a Designer reads it */
    as('germaine'); await go(d, '/company/portal'); await settle(d, 1000)
    ok(await field('privacy').isDisabled() && await card.getByTestId('portal-links-save').count() === 0 && await d.getByTestId('portal-step-privacy').getByRole('button').count() === 0, 'a Designer reads it: the boxes are disabled, no Save, no press on the row')
    as('dane')
    /* phone: the card and the page fit */
    const DP = await phoneCtx(); const dp = await page(DP, 'studio-390')
    await go(dp, '/company/portal#portal-links'); await settle(dp, 1600)
    ok(await sideways(dp) <= 0, 'Company › Client portal at 390: no sideways scroll')
    await shot(dp, '02-company-portal-links-390')
    await DP.close()

    // ── 2 · the client: the foot on the sign-in page and every page ─────────────────────────────────────────────────────────────
    console.log('2 · the client’s foot')
    const C = await desk(); const c = await page(C, 'portal')
    await go(c, '/my/demo-studio/login'); await settle(c, 800)
    let words = await footWords(c)
    ok(words.map((w) => w.word).join(',') === 'Privacy,Contact' && words[0].href === 'https://demostudio.sg/privacy' && words[1].href === 'https://demostudio.sg/contact', 'the sign-in page’s foot: Privacy and Contact — only the links set, in order (Terms is empty)')
    ok(words.every((w) => w.target === '_blank' && /noopener/.test(w.rel ?? '')), 'each opens the studio’s site in a new tab')
    ok(await c.locator('[data-testid="portal-sign-in"] [data-testid="portal-foot"]').count() === 1, '…inside the sign-in page’s foot, under “Only the numbers your studio has added”')
    ok(!/OpenMaison/i.test(await c.locator('body').innerText()), 'the sign-in page never says OpenMaison')
    await shot(c, '03-portal-sign-in-foot-1440')
    await signIn(c, PHONE.ben)
    for (const at of ['', 'messages', 'money', 'files', 'about']) {
      await go(c, `/my/demo-studio${at ? `/${at}` : ''}`)
      const foot = c.locator('main [data-testid="portal-foot"]')
      ok(await foot.count() === 1 && (await foot.locator('a').allInnerTexts()).join(',') === 'Privacy,Contact', `/my/demo-studio${at ? `/${at}` : ''}: the foot under the page`)
    }
    await go(c, '/my/demo-studio')
    ok(!/OpenMaison/i.test(await c.locator('body').innerText()), 'the home never says OpenMaison')
    ok(await c.evaluate(() => localStorage.getItem('om.ghost.portal.foot')) === '1', 'the page tells this browser’s ghosts the studio has a foot')
    await shot(c, '04-portal-home-foot-1440', true)
    await c.emulateMedia({ media: 'print' })
    ok(await c.locator('[data-testid="portal-foot"]').evaluate((el) => getComputedStyle(el).display) === 'none', 'Download PDF prints no foot')
    await c.emulateMedia({ media: 'screen' })
    /* paused: the notice keeps the studio's links */
    sql(`update settings set value = json_set(value, '$.paused', json('true')) where key = 'portal'`)
    await go(c, '/my/demo-studio')
    ok((await c.locator('[data-testid="portal-notice"]').getAttribute('data-kind')) === 'paused' && await c.locator('[data-testid="portal-notice"] [data-testid="portal-foot"]').count() === 1, 'the paused notice keeps the foot')
    sql(`update settings set value = json_set(value, '$.paused', json('false')) where key = 'portal'`)

    // ── 3 · the ghost draws the foot the page will have ───────────────────────────────────────────────────────────────────────────
    console.log('3 · the ghosts')
    {
      const G = await desk(); await G.addInitScript(() => { try { localStorage.setItem('om.ghost.portal.foot', '1') } catch {} ; const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const g = await page(G, 'ghost'); await g.goto(BASE + '/my/demo-studio/login', { waitUntil: 'load' }); await settle(g, 1600)
      const ghostFoot = await g.locator('[aria-label="Loading"] [class*="__foot"]').first().boundingBox().catch(() => null)
      const ghostLinks = await g.locator('[aria-label="Loading"] [class*="__legalInline"]').count()
      const P2 = await desk(); const p2 = await page(P2, 'ghost-page'); await go(p2, '/my/demo-studio/login'); await settle(p2, 800)
      const pageFoot = await p2.locator('[data-testid="portal-sign-in"] [class*="__foot"]').first().boundingBox().catch(() => null)
      ok(ghostLinks === 1 && !!ghostFoot && !!pageFoot && Math.abs(ghostFoot.y - pageFoot.y) <= 4 && Math.abs(ghostFoot.height - pageFoot.height) <= 4, `the sign-in ghost draws the foot's row where the page has it (ghost y ${ghostFoot?.y?.toFixed?.(0)} h ${ghostFoot?.height?.toFixed?.(0)} · page y ${pageFoot?.y?.toFixed?.(0)} h ${pageFoot?.height?.toFixed?.(0)})`)
      await G.close(); await P2.close()
    }

    // ── 4 · the phone ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · 390 and 320')
    for (const w of [390, 320]) {
      const P = await phoneCtx(w, 844); const p = await page(P, `phone-${w}`)
      await go(p, '/my/demo-studio/login'); await settle(p, 600)
      ok(await sideways(p) <= 0, `sign-in at ${w}: no sideways scroll`)
      const tall = await p.locator('[data-testid="portal-foot"] a').evaluateAll((as) => as.map((a) => Math.round(a.getBoundingClientRect().height)))
      ok(tall.length === 2 && tall.every((h) => h >= 44), `sign-in at ${w}: each foot link is 44 tall under a finger (${tall.join(', ')})`)
      if (w === 390) await shot(p, '05-portal-sign-in-foot-390')
      if (w === 320) await shot(p, '07-portal-sign-in-foot-320')
      await signIn(p, PHONE.ben)
      await go(p, '/my/demo-studio')
      ok(await sideways(p) <= 0, `the home at ${w}: no sideways scroll`)
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(p, 500)
      const foot = await p.locator('main [data-testid="portal-foot"]').boundingBox()
      const dock = await p.locator('[data-testid="portal-dock"]').boundingBox()
      ok(!!foot && !!dock && foot.y + foot.height <= dock.y + 1, `the home at ${w}: the foot sits above the phone’s bar, never under it`)
      if (w === 390) await shot(p, '06-portal-home-foot-390')
      await P.close()
    }

    // ── 5 · none set: no foot anywhere ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · none set')
    sql(`delete from settings where key = 'portal_links'`)
    await go(c, '/my/demo-studio')
    ok(await c.locator('[data-testid="portal-foot"]').count() === 0 && await c.evaluate(() => localStorage.getItem('om.ghost.portal.foot')) === '0', 'with no link set the portal has no foot — and its ghosts draw none')
    { const N = await desk(); const n = await page(N, 'signed-out'); await go(n, '/my/demo-studio/login')
      ok(await n.locator('[data-testid="portal-sign-in"]').count() === 1 && await n.locator('[data-testid="portal-foot"]').count() === 0, '…the sign-in page neither'); await N.close() }

    // ── 6 · the team's faces ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · the client’s own team’s faces')
    const now = Date.now()
    sql(`insert into studio_pictures (id, kind, member_id, data, caption, position, created_at) values ('probe-s13-germaine', 'member', 'germaine', '${PNG}', NULL, 0, ${now}), ('probe-s13-michelle', 'member', 'michelle', '${PNG}', NULL, 0, ${now})`)
    sql(`update members set color = 'photo:probe-s13-germaine|' || color, portal_photo_id = 'probe-s13-germaine' where id = 'germaine'`)
    sql(`update members set color = 'photo:probe-s13-michelle|' || color, portal_photo_id = 'probe-s13-michelle' where id = 'michelle'`)
    await go(c, '/my/demo-studio/messages'); await settle(c, 600)   // Benjamin, still signed in
    const lineImg = async (p, who) => p.locator('[data-testid="thread-line"][data-kind="studio"]').filter({ hasText: who }).first().locator(':scope > span img').first().getAttribute('src').catch(() => null)
    const gSrc = await lineImg(c, 'Germaine')
    ok(gSrc === '/my/demo-studio/face/probe-s13-germaine', 'Messages: Germaine’s lines carry her photo, through the portal’s own address')
    ok(await c.locator('[data-testid="thread-line"][data-kind="studio"]').filter({ hasText: 'Dane' }).first().locator(':scope > span img').count() === 0, 'Dane, with no photo, keeps his tinted initial')
    const r1 = await c.request.get(BASE + '/my/demo-studio/face/probe-s13-germaine')
    ok(r1.status() === 200 && /image\/png/.test(r1.headers()['content-type'] ?? ''), '…which answers with her photo')
    ok(!(await c.content()).includes('/company/picture/'), 'no studio picture address on the client’s page')
    await shot(c, '08-portal-messages-face-1440')
    await go(c, `/my/demo-studio/issues?open=${BEN_T}`); await settle(c, 1200)
    const tSrc = await c.locator('[data-testid="portal-issue-thread"] [data-testid="thread-line"][data-kind="studio"]').first().locator(':scope > span img').first().getAttribute('src').catch(() => null)
    ok(tSrc === '/my/demo-studio/face/probe-s13-germaine', 'Issues: Germaine’s answers carry her face too')
    ok(!(await c.content()).includes('/company/picture/'), '…and no studio picture address there either')
    const r2 = await c.request.get(BASE + '/my/demo-studio/face/probe-s13-michelle')
    const r3 = await c.request.get(BASE + '/my/demo-studio/face/not-a-picture')
    ok(r2.status() === 404 && r3.status() === 404, 'the face route opens nothing else — Michelle (not on Benjamin’s team), a made-up id')
    const O = await desk(); const r4 = await O.request.get(BASE + '/my/demo-studio/face/probe-s13-germaine'); await O.close()
    ok(r4.status() === 404, '…nor for anyone signed out')
    /* someone from Benjamin's household sees the same team */
    const M = await desk(); const mp = await page(M, 'meiling'); await signIn(mp, PHONE.meiling)
    ok((await mp.request.get(BASE + '/my/demo-studio/face/probe-s13-germaine')).status() === 200, 'Mei Ling, from Benjamin’s household, sees Germaine’s face too')
    await M.close()
    /* another client: their own team only */
    const K = await desk(); const kp = await page(K, 'kevin'); await signIn(kp, PHONE.kevin)
    ok((await kp.request.get(BASE + '/my/demo-studio/face/probe-s13-michelle')).status() === 200 && (await kp.request.get(BASE + '/my/demo-studio/face/probe-s13-germaine')).status() === 404, 'Kevin sees Michelle’s face (his team) and not Germaine’s')
    await K.close()
    /* a studio's preview draws the faces through its own address — See it as Benjamin (the Client access panel's press) */
    as('dane')
    const tp = await page(D, 'preview')
    await go(tp, `/my/demo-studio/preview?client=${BEN}`)
    const pslug = decodeURIComponent((/\/my\/([^/?#]+)/.exec(tp.url()) || [])[1] || '')
    ok(/^demo-studio~[a-z0-9]+$/.test(pslug) && await tp.locator('[data-testid="portal-preview-bar"]').count() === 1, 'See it as Benjamin opens his page as a preview, at its own address')
    await go(tp, `/my/${pslug}/messages`)
    const pSrc = await lineImg(tp, 'Germaine')
    ok(!!pSrc && decodeURIComponent(pSrc) === `/my/${pslug}/face/probe-s13-germaine` && (await tp.request.get(BASE + pSrc)).status() === 200, 'the preview draws Germaine’s face through the preview’s own address — and it opens')
    await shot(tp, '10-preview-messages-face-1440')
    await tp.close()

    // ── 7 · an address no studio here holds ───────────────────────────────────────────────────────────────────────────────────────
    console.log('7 · an address no studio holds')
    const U = await desk(); const u = await page(U, 'unknown')
    for (const [from, to] of [['/my/someone-else/p/zzzzzz', '/my/someone-else'], ['/my/someone-else/projects/abc', '/my/someone-else'], ['/my/someone-else/team', '/my/someone-else/about']]) {
      await go(u, from)
      const kind = await u.locator('[data-testid="portal-notice"]').getAttribute('data-kind').catch(() => null)
      ok(new URL(u.url()).pathname === to && kind === 'missing', `${from} → ${to}: that address’s own notice, not this studio’s portal`)
    }
    await go(u, '/my/someone-else')
    ok(await u.title() === 'This address doesn’t open a portal' && !/Demo Studio/.test(await u.locator('body').innerText()) && await u.locator('meta[property="og:image"]').count() === 0, 'its tab says so, it names no studio and carries no studio’s card')
    await go(u, '/my/someone-else/messages')
    ok(await u.title() === 'This address doesn’t open a portal', 'every portal page at that address: the same tab')
    await shot(u, '09-portal-unknown-address-1440')
    for (const [from, to] of [['/my/demo-studio/p/zzzzzz', /\/my\/demo-studio\/login/], ['/pay/anything-at-all', /\/my\/demo-studio\/login/], ['/my/Demo-Studio/projects/abc', /\/my\/demo-studio\/login/]]) {
      await go(u, from)
      ok(to.test(u.url()), `${from}: this studio’s old links still land on its portal (sign-in first)`)
    }
    ok(await u.title() === 'Sign in · Demo Studio', 'this studio’s own sign-in keeps its tab')
    await U.close()

    await C.close(); await D.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e && e.stack || e).slice(0, 600))
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
