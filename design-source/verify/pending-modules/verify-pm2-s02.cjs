// Pending modules, step S02 · Client links (the owner's "build all of them but one after the other", 2026-10-11; survey keys
// public:client-links-no-login · api:link-previews · api:portal-loose-ends). Each item asserted as the rule it builds, never another round's count:
//  - every client link carries the studio's card in a chat: the tab and the preview name the studio, never "OpenMaison"; the picture is a
//    1200×630 PNG at an absolute address; a link that no longer opens draws the closed card; a chat app's fetch never stamps "Viewed"
//    (a contract, a bundle, a PO), and a shared file's link answers a fetcher with its card and a person with the file
//  - the quote's view-only link (1.0's /quote-preview): the editor's ⋮ › Share a view-only link (WhatsApp on the press, Copy link), one link
//    per quote, the client's page (the quote as Preview prints it, live, nothing to confirm), Stop with Undo, the notice once stopped, the
//    approver's rule in the row, a client sees only an approved quote (a revision reads Not ready yet), no row on a variation order, no cost
//    or the quote's id in the client's page, Activity lines
//  - 1.0's old links land on their 2.0 pages (D-11, as recommended)
//  - a render shown to the client from Files lands on their Designs too (1.0 H-82…H-84), idempotent, Stop showing takes it off, showing again
//    brings the same link (and what the client marked) back; no second Activity line
//  - the Money card says how many lines the signed quote has (MI-014); the dead chat-history code is gone
//  - the ghost sits on the page; no sideways scroll at 390 / 320 (against screen.width); no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s02.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s02')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const T0 = Math.floor(Date.now() / 1000) - 2
const WA = 'WhatsApp/2.23.20.0 A'
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
/* the demo's records (fixed ids) */
const Q_SENT = 'f529ab6d-5c59-4cb9-abf3-4e79385d20fb'      // OM-10007, Sent to Client — Serena Koh (Germaine's)
const Q_DRAFT = '39e4c832-bf4a-409e-bf41-bfc8d19b4340'     // OM-10001, Draft — Olivia Martinez
const VO = '06e186f7-cb3b-4518-ac6b-078c551a829d'          // a variation order, Sent to Client
const C_SIGNED = '301fe7ef-3cd9-47bb-a159-daacd92d7408', C_DRAFT = '81463786-769d-42aa-b226-192081cfd6e6'
const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', KEVIN_PHONE = '96882109'
const V2_FILE = '435c4ace-f7c7-4a12-a51d-5c3ef4cfd4c6', V3_FILE = '3d936457-5acb-4863-a78c-feb9ef786644'
const VIZ_SHARE = '0bf23174-9056-4b67-a2a3-a2dc55cbf510'
const P1 = 'e920e218-7c5b-4ff9-a27b-e62d73c99367'           // P-2026-001 (Michelle's), signed quote OM-10004
const P3 = '33c09261-bf04-4027-ad89-cae12a510f63'           // P-2026-003 (Michelle's), signed quote OM-10009, no variation orders
const SECRET = (() => { try { const m = /^AUTH_SECRET=(.*)$/m.exec(fs.readFileSync(path.join(REPO, '.env.local'), 'utf8')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : '' } catch { return '' } })()
const fileToken = (id) => `${id}.${crypto.createHmac('sha256', SECRET).update(`file:${id}`).digest('base64url').slice(0, 32)}`
const pngSize = (buf) => (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG' ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null)
const meta = (html, prop) => { const m = new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`).exec(html); return m ? m[1].replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"') : null }
const titleOf = (html) => { const m = /<title>([^<]*)<\/title>/.exec(html); return m ? m[1].replace(/&amp;/g, '&') : null }

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* what the probe changes, put back as it found it */
  const you0 = sql(`select id from members where is_you = 1`)
  const keptQuotes = sql(`select id || '|' || quote(view_token) || '|' || quote(view_token_at) || '|' || quote(view_token_by) || '|' || quote(title) || '|' || quote(updated_at) || '|' || quote(status) from quotes where id in ('${Q_SENT}','${Q_DRAFT}')`).split('\n')
  const keptContract = sql(`select quote(status) || '|' || quote(sent_at) || '|' || quote(viewed_at) || '|' || quote(updated_at) from contracts where id = '${C_DRAFT}'`)
  const po = sql(`select id || '|' || vendor_token || '|' || quote(vendor_viewed_at) from purchase_orders where vendor_token is not null and sent_at is not null and status = 'sent' and deleted_at is null and coalesce(external, 0) = 0 limit 1`)
  const [PO_ID, PO_TOKEN, PO_VIEWED] = po.split('|')
  const vizRevoked = sql(`select quote(revoked_at) from render_share_links where id = '${VIZ_SHARE}'`)
  const shownBefore = sql(`select id || '|' || quote(shown_to_client_at) from lead_files where id in ('${V2_FILE}','${V3_FILE}')`).split('\n')
  const shareIds0 = sql(`select group_concat(id) from render_share_links`)
  const kevinLink = sql(`select id || '|' || quote(opened_at) || '|' || quote(last_opened_at) || '|' || homeowner_id from homeowner_lead_links where lead_id = '${KEVIN}'`)
  const req = (ua) => b.newContext({ userAgent: ua })
  const desk = (o = {}) => b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const snackText = async (p) => (await snack(p).innerText().catch(() => '')).replace(/\s+/g, ' ')
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const kebab = async (p) => { await p.getByRole('button', { name: 'More options' }).first().click(); await settle(p, 400) }

  try {
    as('dane')
    const A = await req(WA), H = await req(CHROME)
    const get = async (ctx, url, o = {}) => ctx.request.get(BASE + url, { maxRedirects: 0, ...o })

    // ── 1 · the studio's card on every client link ────────────────────────────────────────────────────────────────────────────
    console.log('1 · The card on every client link')
    const invTok = sql(`select share_token from project_invoices where share_token is not null and status <> 'draft' limit 1`)
    const rctTok = sql(`select share_token from project_payments where share_token is not null and receipt_number is not null and status = 'confirmed' limit 1`)
    const spaceTok = sql(`select token from space_layout_shares where revoked_at is null limit 1`)
    const links = [
      ['sign', `/sign/${C_SIGNED}`], ['sign-quote', `/sign/${C_SIGNED}/quote`], ['confirm', `/confirm/${Q_SENT}`], ['invoice', `/invoice/${invTok}`],
      ['receipt', `/receipt/${rctTok}`], ['po', `/po/${PO_TOKEN}`], ['space', `/space/${spaceTok}`], ['portal', '/my/demo-studio/login'], ['portal-home', '/my/demo-studio'],
    ]
    const studios = new Set()
    for (const [k, u] of links) {
      const r = await A.request.get(BASE + u)
      const html = await r.text()
      const t = titleOf(html) ?? '', site = meta(html, 'og:site_name') ?? '', img = meta(html, 'og:image') ?? '', desc = meta(html, 'og:description') ?? '', head = meta(html, 'og:title') ?? ''
      studios.add(site)
      ok(r.status() === 200 && !!site && t.includes(site) && !/openmaison/i.test(`${t} ${site} ${desc} ${head}`), `${k}: the tab and the chat's preview name the studio — "${t}" · ${site}`)
      ok(/noindex/.test(meta(html, 'robots') ?? '') && !!desc && !!head, `${k}: never indexed; a bold line and a grey line ("${head}" — ${desc.slice(0, 60)}…)`)
      const ir = img.startsWith('http') ? await A.request.get(img) : null
      const size = ir ? pngSize(await ir.body()) : null
      ok(!!ir && ir.status() === 200 && /image\/png/.test(ir.headers()['content-type'] ?? '') && size?.[0] === 1200 && size?.[1] === 630, `${k}: the picture is a 1200×630 PNG at an absolute address (${img.replace(BASE, '')})`)
      if (k === 'confirm' || k === 'portal') fs.writeFileSync(path.join(dir, `s02-01-card-${k}.png`), await ir.body())
    }
    const closed = await get(A, '/card/sign/never-made')
    fs.writeFileSync(path.join(dir, 's02-01-card-closed.png'), await closed.body())
    ok(closed.status() === 200 && pngSize(await closed.body())?.[0] === 1200, 'a link that no longer opens draws the closed card (still a picture, in the studio’s name)')
    ok((await get(A, '/card/nothing/abc')).status() === 404, 'a kind that is no client link answers 404')
    const draftHtml = await (await A.request.get(`${BASE}/sign/${C_DRAFT}`)).text()
    ok(/still preparing this contract/.test(meta(draftHtml, 'og:description') ?? ''), 'a Draft contract’s card says it is not ready — never its words')   // (the close-out round 2026-10-31, a deliberate change) C-52: the card says "contract" (REG-3411) — this line had kept the old word
    const plain = await (await H.request.get(`${BASE}/confirm/${Q_SENT}`)).text()
    ok(!/·\s*OpenMaison/.test(titleOf(plain) ?? '') && /Demo Studio/.test(titleOf(plain) ?? ''), `a person's tab names the studio too — "${titleOf(plain)}"`)

    // ── 2 · a chat app's fetch is not the client ──────────────────────────────────────────────────────────────────────────────
    console.log('2 · A preview fetch never stamps Viewed')
    sql(`update purchase_orders set vendor_viewed_at = null where id = '${PO_ID}'`)
    await A.request.get(`${BASE}/po/${PO_TOKEN}`)
    ok(sql(`select quote(vendor_viewed_at) from purchase_orders where id = '${PO_ID}'`) === 'NULL', 'the PO: WhatsApp drawing the card on the studio’s phone leaves it unviewed')
    await H.request.get(`${BASE}/po/${PO_TOKEN}`)
    ok(sql(`select quote(vendor_viewed_at) from purchase_orders where id = '${PO_ID}'`) !== 'NULL', '…the vendor opening it stamps Viewed, as before')
    /* (S42 B-01, a deliberate change of this rule) a contract out for signature names a quote the client has — OM-10001, a Draft, would hold its link ("Not ready yet") — so the quote is approved for this check and put back after */
    const q1Status = sql(`select status from quotes where id = (select from_quote_id from contracts where id = '${C_DRAFT}')`)
    sql(`update quotes set status = 'Approved' where id = (select from_quote_id from contracts where id = '${C_DRAFT}')`)
    sql(`update contracts set status = 'Sent to Client', sent_at = ${T0}, viewed_at = null where id = '${C_DRAFT}'`)
    const openHtml = await (await A.request.get(`${BASE}/sign/${C_DRAFT}`)).text()
    ok(/Contract to sign/i.test(openHtml) || /read it and sign online/.test(meta(openHtml, 'og:description') ?? ''), 'a contract out for signature: “read it and sign online”')   // (the close-out 2026-10-28, a deliberate change) C-52: "Contract to sign"
    ok(sql(`select quote(viewed_at) from contracts where id = '${C_DRAFT}'`) === 'NULL', 'the contract: the chat’s fetch leaves it unviewed')
    await H.request.get(`${BASE}/sign/${C_DRAFT}`)
    ok(sql(`select quote(viewed_at) from contracts where id = '${C_DRAFT}'`) !== 'NULL', '…the client opening it stamps Viewed')
    sql(`update quotes set status = '${q1Status}' where id = (select from_quote_id from contracts where id = '${C_DRAFT}')`)
    if (SECRET) {
      const ft = fileToken(V2_FILE)
      const fb = await get(A, `/f/${ft}`)
      const fhtml = await fb.text()
      ok(fb.status() === 200 && /text\/html/.test(fb.headers()['content-type'] ?? '') && /Render - Living room - V2\.jpg/.test(meta(fhtml, 'og:title') ?? '') && /\/card\/file\//.test(meta(fhtml, 'og:image') ?? ''), 'a shared file’s link: a chat app gets the studio’s card with the file’s name')
      const fp = await get(H, `/f/${ft}`)
      ok(!/text\/html/.test(fp.headers()['content-type'] ?? '') && [200, 307].includes(fp.status()), `…a person gets the file itself (${fp.status()} ${fp.headers()['content-type']})`)
      const fr = await get(A, `/f/${ft}?raw=1`)
      ok(!/text\/html/.test(fr.headers()['content-type'] ?? ''), '…and the card’s refresh (?raw) hands even a fetcher the file')
    } else ok(false, 'the /f checks need AUTH_SECRET in .env.local')

    // ── 3 · the view-only link, from the quote editor ─────────────────────────────────────────────────────────────────────────
    console.log('3 · Share a view-only link')
    const D = await desk({ permissions: ['clipboard-read', 'clipboard-write'] })
    await D.route('https://wa.me/**', (r) => r.fulfill({ status: 200, body: 'whatsapp' }))
    const d = await page(D, 'dane')
    await go(d, `/quotes/${Q_SENT}`)
    await kebab(d)
    const row = d.getByRole('menuitem', { name: 'Share a view-only link' })
    ok(await row.count() === 1 && !(await row.isDisabled()), 'the editor’s ⋮ offers Share a view-only link, after Copy confirmation link')
    await shot(d, 's02-02-kebab-1440')
    await row.click(); await settle(d, 1500)
    const dlg = d.getByRole('dialog', { name: 'Share a view-only link' })
    ok(await dlg.count() === 1, 'the house WhatsApp dialog opens: Share a view-only link')
    const token = sql(`select view_token from quotes where id = '${Q_SENT}'`)
    ok(/^[A-Za-z0-9_-]{16,64}$/.test(token) && sql(`select view_token_by from quotes where id = '${Q_SENT}'`) === 'dane', 'the link is made, by whoever made it')
    ok(((await dlg.locator('code').count()) ? await dlg.locator('code').innerText() : await dlg.getByRole('textbox').last().inputValue()).includes(`/quote/${token}`), 'the dialog shows the link: /quote/<token>')   // (the calm UI build 2026-10-27, a deliberate change) 4-20: the link rides in the message; its own row shows only when the message lacks it
    ok(/first look at quote OM-10007 from/.test(await dlg.getByRole('textbox').last().inputValue().catch(() => '')) || /first look/.test(await dlg.innerText()), 'the drafted message: a first look, view only')
    /* (S42 B-23, a deliberate change of this rule) opening the dialog makes the link but says nothing yet — the line waits for a share */
    ok(sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_shared' and at >= ${T0} and json_extract(detail, '$.id') = '${Q_SENT}'`) === '0', 'S42 B-23: just opening the dialog writes no “made a view-only link” line')
    ok(sql(`select status from quotes where id = '${Q_SENT}'`) === 'Sent to Client', 'a look is not a send — the status stays')
    await shot(d, 's02-03-dialog-1440')
    await dlg.getByRole('button', { name: 'Copy link' }).click(); await settle(d, 600)
    const clip = await d.evaluate(() => navigator.clipboard.readText()).catch(() => '')
    ok(clip.endsWith(`/quote/${token}`) && /View-only link copied|Copied/.test(`${await snackText(d)} ${await dlg.innerText()}`), 'Copy link puts it on the clipboard — “View-only link copied”')
    await settle(d, 600)
    ok(sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_shared' and at >= ${T0} and json_extract(detail, '$.id') = '${Q_SENT}'`) === '1', 'Activity has “made a view-only link” once it is copied (S42 B-23)')
    { const AC = await desk(); const ac = await page(AC, 'activity'); await go(ac, `/leads/${sql(`select lead_id from quotes where id = '${Q_SENT}'`)}/activity`)
      ok(/made a view-only link to the quote “?OM-10007”? for Serena Koh/.test(await ac.locator('main').innerText()), 'the lead’s Activity reads “… made a view-only link to the quote OM-10007 for Serena Koh.”'); await AC.close() }
    const popP = D.waitForEvent('page', { timeout: 6000 }).catch(() => null)
    await dlg.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click()   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const pop = await popP
    ok(!!pop && /wa\.me\/65/.test(pop.url()) && decodeURIComponent(pop.url()).includes(`/quote/${token}`), 'Send via WhatsApp opens WhatsApp on the press, with the link')
    if (pop) await pop.close()
    await settle(d, 600)
    ok(/WhatsApp is open with the view-only link/.test(await snackText(d)), `…and says so (“${await snackText(d)}”)`)
    await kebab(d); await d.getByRole('menuitem', { name: 'Share a view-only link' }).click(); await settle(d, 1200)
    ok(sql(`select view_token from quotes where id = '${Q_SENT}'`) === token && sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_shared' and at >= ${T0}`) === '1', 'pressing it again answers the same link — one link per quote, one line')
    await d.keyboard.press('Escape'); await settle(d, 500)

    // ── 4 · the client's page ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · The client’s page')
    const C = await desk(); const c = await page(C, 'client')
    await go(c, `/quote/${token}`)
    ok(await c.getByTestId('quote-view-page').count() === 1 && /private link/i.test(await c.locator('[data-testid="quote-view-page"] header').first().innerText()), 'the client’s page opens: the studio’s bar, “View only”')
    ok(await c.locator('[data-testid="quote-view-card"] h2').innerText().then((t) => t.length > 0) && /It stays up to date on this page/.test(await c.getByTestId('quote-view-words').innerText()), 'its card says what this is — a page that stays up to date')   // (the calm UI build 2026-10-27, a deliberate change) 4-34 · W-209: the words by state
    ok(await c.getByRole('button', { name: /Confirm/ }).count() === 0 && await c.getByRole('button', { name: /Sign/ }).count() === 0, 'no Confirm, no Sign')
    ok(await c.getByTestId('quote-view-message').count() === 1 && await c.getByTestId('quote-view-download').count() === 1, 'Message the designer · Download a copy')
    ok(/Quote OM-10007 · Demo Studio/.test(await c.title()), `the tab: “${await c.title()}”`)
    const html = await c.content()
    ok(!html.includes(Q_SENT), 'the page never carries the quote’s id — the token is the only key')
    ok(!/"markupMinor":[1-9]/.test(html.replace(/\\"/g, '"')), 'no mark-up reaches the client’s browser (prices arrive as prices)')
    await c.waitForSelector('[data-testid="quote-view-page"] [class*="print"]', { timeout: 8000 }).catch(() => {})
    await settle(c, 800)
    await shot(c, 's02-04-view-1440')
    /* live: the studio's edit reaches the open page without a reload */
    const fresh = `Kitchen and living — probe ${Date.now() % 1000}`
    sql(`update quotes set title = '${fresh}', updated_at = ${Math.floor(Date.now() / 1000) + 5} where id = '${Q_SENT}'`)
    let seen = false
    for (let i = 0; i < 26 && !seen; i++) { await c.waitForTimeout(1000); seen = (await c.locator('[data-testid="quote-view-card"] h2').innerText().catch(() => '')) === fresh }
    ok(seen, 'the studio’s edit reaches the open page by itself (within the 10 s ask)')
    { const [, , , , title0] = keptQuotes.find((r) => r.startsWith(Q_SENT)).split('|'); sql(`update quotes set title = ${title0}, updated_at = ${Math.floor(Date.now() / 1000) + 6} where id = '${Q_SENT}'`) }
    const fx = await c.evaluate(() => [document.querySelector('[data-testid="quote-view-card"]')?.getBoundingClientRect().left ?? 0, document.querySelector('[data-testid="quote-view-card"]')?.getBoundingClientRect().width ?? 0])
    /* a revision back to Draft waits for the studio's approval: the page says Not ready yet and carries none of the quote */
    const line1 = sql(`select name from quote_items where quote_id = '${Q_SENT}' and kind = 'item' order by position limit 1`)
    sql(`update quotes set status = 'Draft', updated_at = ${Math.floor(Date.now() / 1000) + 7} where id = '${Q_SENT}'`)
    let waiting = false
    for (let i = 0; i < 26 && !waiting; i++) { await c.waitForTimeout(1000); waiting = await c.getByTestId('quote-view-not-ready').count() === 1 }
    const wHtml = await (await H.request.get(`${BASE}/quote/${token}`)).text()
    ok(waiting && !wHtml.includes(line1) && await c.getByTestId('quote-view-total').count() === 0 && /is updating this quote/.test(await c.getByTestId('quote-view-words').innerText()), `a revision waiting for approval: “Not ready yet”, none of its lines on the page (${line1})`)
    ok(/is updating this quote/.test(meta(await (await A.request.get(`${BASE}/quote/${token}`)).text(), 'og:description') ?? ''), '…and its card in a chat says it is being updated, as the page does')   // (S42 B-24, a deliberate change of this rule) one sentence for the page and its card
    await shot(c, 's02-04-view-not-ready-1440')
    sql(`update quotes set status = 'Sent to Client', updated_at = ${Math.floor(Date.now() / 1000) + 8} where id = '${Q_SENT}'`)
    let back = false
    for (let i = 0; i < 26 && !back; i++) { await c.waitForTimeout(1000); back = await c.getByTestId('quote-view-total').count() === 1 }
    ok(back, 'approved and sent again, the quote comes back on the open page')

    // ── 5 · Stop, Undo, the notice ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('5 · Stop the link')
    await kebab(d); await d.getByRole('menuitem', { name: 'Share a view-only link' }).click(); await settle(d, 1200)
    await d.getByTestId('view-link-stop').click(); await settle(d, 1200)
    ok(sql(`select quote(view_token) from quotes where id = '${Q_SENT}'`) === 'NULL' && /is stopped — it no longer opens/.test(await snackText(d)), `Stop: the link ends — one sentence (“${await snackText(d)}”)`)
    ok(sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_stopped' and at >= ${T0}`) === '1', 'Activity has “stopped the view-only link”')
    const C2 = await desk(); const c2 = await page(C2, 'client-2')
    await go(c2, `/quote/${token}`)
    ok(await c2.getByTestId('link-notice').count() === 1 && /no longer active/.test(await c2.getByTestId('link-notice').innerText()), 'a stopped link says so in the studio’s name — never a 404')
    await shot(c2, 's02-05-stopped-1440')
    await snack(d).getByRole('button', { name: 'Undo' }).click(); await settle(d, 1400)
    ok(sql(`select view_token from quotes where id = '${Q_SENT}'`) === token && sql(`select count(*) from lead_events where kind = 'parity_s02_quote_view_stopped' and at >= ${T0}`) === '0', 'Undo puts the same link back and takes its line away')
    await go(c2, `/quote/${token}`)
    ok(await c2.getByTestId('quote-view-page').count() === 1, '…and the address opens again')
    await C2.close()
    /* the open page turns into the notice on its next ask once the link is stopped */
    sql(`update quotes set view_token = null, view_token_at = null, view_token_by = null where id = '${Q_SENT}'`)
    let gone = false
    for (let i = 0; i < 26 && !gone; i++) { await c.waitForTimeout(1000); gone = await c.getByTestId('link-notice').count() === 1 }
    ok(gone, 'a page left open turns into the notice on its next ask')
    await C.close()
    sql(`update quotes set view_token = '${token}', view_token_at = ${T0}, view_token_by = 'dane' where id = '${Q_SENT}'`)
    /* the old 1.0 address lands here */
    const prev = await get(H, `/quote-preview/${token}`)
    ok(prev.status() === 307 && (prev.headers().location ?? '').endsWith(`/quote/${token}`), '1.0’s /quote-preview/<token> redirects to the view-only link')

    // ── 6 · the rules: an approver's quote, a variation order ─────────────────────────────────────────────────────────────────
    console.log('6 · Who may')
    as('germaine')
    const G = await desk(); const g = await page(G, 'germaine')
    await go(g, `/quotes/${Q_DRAFT}`)
    if (await g.getByRole('button', { name: 'More options' }).count()) {
      await kebab(g)
      const gr = g.getByRole('menuitem', { name: /Share a view-only link/ })
      ok(await gr.count() === 1 && (await gr.getAttribute('aria-disabled')) === 'true' && /approver’s OK first/.test(await gr.innerText()), 'a Designer’s Draft: the row rests and says why in the row — an approver’s OK first')
      await shot(g, 's02-06-designer-rule-1440')
      await g.keyboard.press('Escape')
    } else ok(false, 'Germaine opens the Draft quote')
    await G.close()
    as('dane')
    await go(d, `/quotes/${Q_DRAFT}`)
    await kebab(d)
    const dr = d.getByRole('menuitem', { name: /Share a view-only link/ })
    ok(await dr.count() === 1 && (await dr.getAttribute('aria-disabled')) === 'true' && /Approve it first/.test(await dr.innerText()), 'an approver’s Draft: the row says to approve it first — a client sees only an approved quote')
    await d.keyboard.press('Escape'); await settle(d, 300)
    await go(d, `/quotes/${VO}`)
    await kebab(d)
    ok(await d.getByRole('menuitem', { name: /Share a view-only link/ }).count() === 0 && await d.getByRole('menuitem', { name: /Copy confirmation link/ }).count() === 1, 'a variation order has no view-only link — it is approved on its confirmation link')
    await d.keyboard.press('Escape')
    await D.close()
    /* on a phone the ⋮ is a sheet and the dialog a bottom sheet — nothing runs past the screen */
    const MS = await phoneCtx(390, 844); const ms = await page(MS, 'dane-390')
    await go(ms, `/quotes/${Q_SENT}`)
    await kebab(ms)
    await ms.getByRole('menuitem', { name: 'Share a view-only link' }).click(); await settle(ms, 1400)
    const sheetDlg = ms.getByRole('dialog', { name: 'Share a view-only link' })
    const sb = await sheetDlg.boundingBox()
    ok(!!sb && sb.width <= 390 && Math.round(sb.y + sb.height) >= 830 && await sideways(ms) <= 0 && await ms.getByTestId('view-link-stop').isVisible(), `390: the dialog is a bottom sheet with Stop the link (${sb ? `${Math.round(sb.width)}×${Math.round(sb.height)} at ${Math.round(sb.y)}` : '?'})`)
    await shot(ms, 's02-03-dialog-390')
    await MS.close()

    // ── 7 · the client's page on a phone; the ghost ───────────────────────────────────────────────────────────────────────────
    console.log('7 · The phone and the ghost')
    for (const [w, h] of [[390, 844], [320, 700]]) {
      const M = await phoneCtx(w, h); const m = await page(M, `phone-${w}`)
      await go(m, `/quote/${token}`)
      ok(await m.getByTestId('view-as-printed').isVisible() && await sideways(m) <= 0, `${w}: the reading cards with View as printed; no sideways scroll (${await sideways(m)})`)
      if (w === 390) {
        await shot(m, 's02-07-view-390', true)
        await m.getByTestId('view-as-printed').click(); await settle(m, 1400)
        /* (quotes on the move, a deliberate change of this rule) "As printed" opens the A4 in a viewer over the cards (K4, P-12 · A-17) */
        ok(/As printed/.test(await m.getByTestId('paper-viewer').innerText()) && await m.getByTestId('paper-viewer').locator('[data-page="1"]').isVisible() && await sideways(m) <= 0, '390: View as printed opens the A4 in the viewer, still no sideways scroll')
      }
      await M.close()
    }
    /* (quotes on the move, a deliberate change of this rule) a tablet held upright is the phone model — the cards under the total card (K4, A-15);
       the print with the card stays for a tablet held sideways */
    { const T = await phoneCtx(768, 1024); const t = await page(T, 'tablet-768')
      await go(t, `/quote/${token}`)
      ok(await t.getByTestId('quote-view-total-card').isVisible() && await t.getByTestId('reading-cards').isVisible() && await sideways(t) <= 0, `768 portrait: the total card and the reading cards; no sideways scroll (${await sideways(t)})`)
      await T.close() }
    { const T = await phoneCtx(1024, 768); const t = await page(T, 'tablet-1024')
      await go(t, `/quote/${token}`)
      ok(await t.locator('[data-testid="quote-view-page"] [class*="print"]').first().isVisible() && await sideways(t) <= 0, `1024 landscape: the print with the card; no sideways scroll (${await sideways(t)})`)
      await T.close() }
    for (const [w, h, touch] of [[1440, 1024, false], [390, 844, true]]) {
      const url = `${BASE}/quote/${token}`
      const GC = await b.newContext({ viewport: { width: w, height: h }, ...(touch ? { isMobile: true, hasTouch: true } : {}) })
      const gp = await GC.newPage()
      await gp.route((u) => u.href === url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await gp.goto(url, { waitUntil: 'load' }).catch(() => {}); await gp.waitForTimeout(900)
      const gh = await gp.evaluate(() => { const s = document.querySelector('[role="status"][aria-label="Loading the quote"]'); const card = s?.querySelector('[class*="card"]:not([class*="cards"])'); const r = card?.getBoundingClientRect(); return { on: !!s, card: r ? [Math.round(r.left), Math.round(r.width)] : null } })
      await shot(gp, `s02-08-ghost-${w}`)
      await GC.close()
      if (w === 1440) ok(gh.on && !!gh.card && Math.abs(gh.card[0] - fx[0]) <= 4 && Math.abs(gh.card[1] - fx[1]) <= 4, `1440: the ghost’s card sits where the page’s does (ghost ${JSON.stringify(gh.card)} · page ${JSON.stringify(fx.map(Math.round))})`)
      else ok(gh.on, '390: the link streams its ghost (the reading cards, the card)')
    }

    // ── 8 · 1.0's old links ───────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('8 · 1.0’s old links')
    const linkTok = sql(`select portal_token from homeowner_lead_links where lead_id = '${KEVIN}'`)
    const old = [
      ['/pay/anything-at-all', '/my/demo-studio'], [`/pay/inv/${invTok}`, `/invoice/${invTok}`], ['/pay/inv/0123456789abcdef', '/my/demo-studio/money'],
      [`/pay/receipt/${rctTok}`, `/receipt/${rctTok}`], ['/pay/receipt/zzzzzzzzzzzzzzzz', '/my/demo-studio/money'], [`/my/demo-studio/p/${linkTok}`, '/my/demo-studio'],
      ['/my/login', '/my/demo-studio/login'], ['/my/projects/abc', '/my/demo-studio'], ['/my/engagement/abc', '/my/demo-studio'], ['/my/demo-studio/projects/abc', '/my/demo-studio'],
      ['/my/demo-studio/team', '/my/demo-studio/about'], [`/floor-plan/view/${spaceTok}`, `/space/${spaceTok}`],
    ]
    for (const [from, to] of old) {
      const r = await get(H, from)
      ok([307, 308].includes(r.status()) && new URL(r.headers().location ?? '', BASE).pathname === to, `${from} → ${to}`)
    }
    const xr = await H.request.get(`${BASE}/sign/quote-xray/abc`)
    const xrh = await xr.text()
    ok(xr.status() === 200 && /no longer active/.test(xrh) && !/openmaison/i.test(titleOf(xrh) ?? ''), '1.0’s X-Ray link: the studio’s notice (2.0 has no X-Ray link) — never a 404')

    // ── 9 · a render shown from Files lands on the client's Designs ───────────────────────────────────────────────────────────
    console.log('9 · Files › a render › Show to client')
    const F = await desk(); const f = await page(F, 'files')
    const showVia = async (fileId) => { await go(f, `/leads/${KEVIN}/files/${fileId}`); await kebab(f); await f.getByRole('menuitem', { name: /Show to client|Stop showing to client/ }).click(); await settle(f, 1600) }
    const fileLinks = (fileId) => sql(`select count(*) from render_share_links where file_id = '${fileId}'`)
    /* V2 is already on the Visualizer's live share — nothing new is made (1.0's idempotence), and the sentence says it is on Designs */
    await showVia(V2_FILE)
    ok(/is shown to the client — it’s on their Designs too/.test(await snackText(f)) && fileLinks(V2_FILE) === '0', `a version already on Designs adds nothing (“${await snackText(f)}”)`)
    await shot(f, 's02-09-shown-1440')
    await snack(f).getByRole('button', { name: 'Undo' }).click(); await settle(f, 1400)
    ok(sql(`select quote(revoked_at) from render_share_links where id = '${VIZ_SHARE}'`) === vizRevoked, '…and Stop showing never stops the Visualizer’s own link')
    /* with that share stopped, V3 gets a link of its own */
    sql(`update render_share_links set revoked_at = ${T0} where id = '${VIZ_SHARE}'`)
    const vizLines0 = sql(`select count(*) from lead_events where lead_id = '${KEVIN}' and kind like 'file_%'`)
    await showVia(V3_FILE)
    const own = sql(`select id || '|' || token || '|' || quote(revoked_at) || '|' || (snapshot like '%aba05950-54a9-406e-a6d5-3e7e97a114ea:1%') from render_share_links where file_id = '${V3_FILE}'`).split('|')
    ok(own.length === 4 && own[2] === 'NULL' && own[3] === '1' && /on their Designs too/.test(await snackText(f)), 'a render not yet shared gets its one version on a link of its own — live, on Designs')
    const rl = await H.request.get(`${BASE}/renders/${own[1]}`)
    ok(rl.status() === 200 && /data-testid="render-share"/.test(await rl.text()), '…which opens as any renders link does')
    const P = await desk(); const pp = await page(P, 'kevin')
    await pp.goto(`${BASE}/my/demo-studio/login`, { waitUntil: 'networkidle' }); await settle(pp)
    await pp.locator('input[type="tel"]').fill(KEVIN_PHONE)
    await pp.getByRole('button', { name: 'Send me a code' }).click(); await settle(pp, 1000)
    await pp.locator('[data-testid="portal-digit"]').first().fill('482913'); await pp.getByRole('button', { name: 'Open my project' }).click()
    await pp.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(pp, 1400)
    await go(pp, '/my/demo-studio/designs')
    const cards = await pp.getByTestId('portal-design-link').count()
    ok(cards >= 1 && (await pp.locator('main, body').first().innerText()).length > 0, `the client’s Designs lists it (${cards} shared ${cards === 1 ? 'card' : 'cards'})`)
    await shot(pp, 's02-10-portal-designs-1440')
    await go(f, `/leads/${KEVIN}/activity`)
    const actText = await f.locator('main').innerText()
    const evAdded = Number(sql(`select count(*) from lead_events where lead_id = '${KEVIN}' and kind like 'file_%'`)) - Number(vizLines0)
    ok(/showed .*Render - Living room - V3\.jpg.* to Kevin Ng/.test(actText) && !/shared 1 (render|version) with Kevin Ng/.test(actText) /* (the calm UI build 2026-10-27, a deliberate change) 6-07 */ && evAdded === 1, `Activity says it once — “showed … to Kevin Ng”, no second “shared 1 render” line (${evAdded} new event)`)
    await showVia(V3_FILE)   // Stop showing
    ok(sql(`select quote(revoked_at) from render_share_links where id = '${own[0]}'`) !== 'NULL' && /no longer shown to the client/.test(await snackText(f)), 'Stop showing takes it off Designs too (its link stops)')
    await go(pp, '/my/demo-studio/designs')
    ok(await pp.getByTestId('portal-design-link').count() === cards - 1, '…and the client’s Designs no longer lists it')
    await showVia(V3_FILE)   // shown again
    ok(fileLinks(V3_FILE) === '1' && sql(`select quote(revoked_at) from render_share_links where id = '${own[0]}'`) === 'NULL', 'showing it again reopens the same link — what the client marked comes back with it')
    await P.close(); await F.close()

    // ── 10 · Money says how many lines (MI-014); the dead code is gone ────────────────────────────────────────────────────────
    console.log('10 · Money’s line count · the clean-up')
    const lines = sql(`select count(*) from quote_items where quote_id = (select quote_id from projects where id = '${P1}') and kind = 'item' and status <> 'Declined'`)
    const O = await desk(); const o = await page(O, 'dane-p1')
    await go(o, `/projects/${P1}`)
    const head = await o.locator('[data-card="money"]').first().innerText().catch(() => '')
    ok(new RegExp(`From the signed quote · ${lines} lines`).test(head), `the Overview’s Money card: “From the signed quote · ${lines} lines”`)
    await o.locator('[data-card="money"]').first().screenshot({ path: path.join(dir, 's02-11-money-card-1440.png') }).catch(() => {})
    await O.close()
    as('michelle')
    const MI = await desk(); const mi = await page(MI, 'michelle')
    await go(mi, `/projects/${P3}/money`)
    const tile = mi.getByTestId('tile-contract')
    const lines3 = sql(`select count(*) from quote_items where quote_id = (select quote_id from projects where id = '${P3}') and kind = 'item' and status <> 'Declined'`)
    ok(await tile.count() === 1 && new RegExp(`From the signed quote OM-\\d+ · ${lines3} lines`).test(await tile.innerText()), `Money’s Contract value says it too, for a member who sees no costs (${await tile.count() ? (await tile.innerText()).replace(/\s+/g, ' ') : 'tile not shown to this viewer'})`)
    await MI.close()
    as('dane')
    ok(!fs.existsSync(path.join(REPO, 'components/leads/return/invite-portal-modal.tsx')) && !/export async function invitePortal|chatHistoryVisible/.test(fs.readFileSync(path.join(REPO, 'app/leads/portal-actions.ts'), 'utf8')) && !/chatHistoryVisible/.test(fs.readFileSync(path.join(REPO, 'lib/leads/portal.ts'), 'utf8')), 'the unmounted Invite to Portal modal, its Show chat history and their write are gone')

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    await A.close(); await H.close()
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e).slice(0, 400))
  } finally {
    /* put back what the probe changed */
    for (const r of keptQuotes) { const [id, tok, at, by, title, upd, st] = r.split('|'); sql(`update quotes set view_token = ${tok}, view_token_at = ${at}, view_token_by = ${by}, title = ${title}, updated_at = ${upd}, status = ${st} where id = '${id}'`) }
    { const [st, sent, viewed, upd] = keptContract.split('|'); sql(`update contracts set status = ${st}, sent_at = ${sent}, viewed_at = ${viewed}, updated_at = ${upd} where id = '${C_DRAFT}'`) }
    if (PO_ID) sql(`update purchase_orders set vendor_viewed_at = ${PO_VIEWED} where id = '${PO_ID}'`)
    sql(`update render_share_links set revoked_at = ${vizRevoked} where id = '${VIZ_SHARE}'`)
    const keep = (shareIds0 || '').split(',').filter(Boolean).map((x) => `'${x}'`).join(',')
    sql(`delete from render_share_links where file_id is not null${keep ? ` and id not in (${keep})` : ''}`)
    for (const r of shownBefore) { const [id, at] = r.split('|'); sql(`update lead_files set shown_to_client_at = ${at} where id = '${id}'`) }
    sql(`delete from lead_events where at >= ${T0} and (kind like 'parity_s02_%' or (lead_id = '${KEVIN}' and kind in ('file_shown','file_hidden','portal_opened')))`)
    sql(`delete from portal_sessions where created_at >= ${T0}`)
    sql(`delete from notifications where kind = 'portal_opened' and created_at >= ${T0}`)   // Kevin's first sign-in, told to his team
    if (kevinLink) { const [lid, op, lop, hid] = kevinLink.split('|'); sql(`update homeowner_lead_links set opened_at = ${op}, last_opened_at = ${lop} where id = '${lid}'`); sql(`delete from portal_bell_reads where homeowner_id = '${hid}' and read_at >= ${T0}`) }
    sql(`update members set is_you = (id = '${you0}')`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail} pass`)
    process.exit(fail ? 1 : 0)
  }
})()
