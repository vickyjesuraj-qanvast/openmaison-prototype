/* Capture every Contracts surface at phone and tablet widths. node capture-contracts.cjs <port> <outDir>
   Tablet shots are viewport-only where a hover float could park (lane A's A-19 of the Quotes audit); overflow is measured against clientWidth. */
const { chromium } = require('playwright')
const fs = require('fs')
const PORT = process.argv[2] || '3014'
const OUT = process.argv[3]
const BASE = `http://localhost:${PORT}`
const C = {
  draft: '81463786-769d-42aa-b226-192081cfd6e6',    // Olivia Martinez · Draft · from OM-10001
  signed: '301fe7ef-3cd9-47bb-a159-daacd92d7408',   // Ryan D’Souza · Signed
}
const LEAD = { olivia: '2bc08444-0409-47c3-9675-0750977c5838', ryan: '5e8b9c29-54ef-4b56-96a4-2027804c4cd7' }
const TPL = '9d229e29-f161-4066-adae-57c6b90c25f5'   // Interior Design Service Agreement (default)
const QUOTE_APPROVED = 'a13747cb-e058-46fc-a631-6a22ffa79823'   // Harpreet Kaur · Approved → Send ▾ › Send for signature
const VIEWS = [
  { tag: 'm390', width: 390, height: 844, mobile: true },
  { tag: 't768', width: 768, height: 1024, mobile: true },
  { tag: 't1024', width: 1024, height: 768, mobile: true },
]
fs.mkdirSync(OUT, { recursive: true })
const log = []
async function shot(p, name, full = true) {
  await p.waitForTimeout(500)
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, screen: screen.width }))
  log.push({ name, scrollWidth: m.sw, clientWidth: m.cw, screenWidth: m.screen, height: m.h, overflow: m.sw > m.cw })
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
}
async function tryClick(p, loc, name) {
  try { await loc.first().click({ timeout: 2500 }); await p.waitForTimeout(700); return true } catch (e) { log.push({ name, skipped: String(e.message).split('\n')[0].slice(0, 120) }); return false }
}
async function settle(p) { try { await p.waitForLoadState('networkidle', { timeout: 8000 }) } catch {} await p.waitForTimeout(1400) }
async function esc(p) { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(300) }

;(async () => {
  const b = await chromium.launch()
  let sent = false
  for (const v of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    const T = (n) => `${v.tag}-${n}`
    const full = v.width < 768   // tablets: viewport-only (hover floats park on a full-page capture)

    // 1 · Tools › Contracts
    await p.goto(`${BASE}/contracts`); await settle(p); await shot(p, T('01-list-top'), false); if (full) await shot(p, T('01-list-full'))
    if (await tryClick(p, p.locator('main button[aria-label="More options"], main button[aria-label="More"], main button[aria-label*="ore actions"]'), T('01-kebab'))) await shot(p, T('01-list-kebab'), false)
    await esc(p)
    if (await tryClick(p, p.getByRole('button', { name: /import/i }), T('01-import'))) await shot(p, T('01-import-dialog'), false)
    await esc(p)
    // 2 · a lead's Contracts tab
    await p.goto(`${BASE}/leads/${LEAD.olivia}/contracts`); await settle(p); await shot(p, T('02-lead-tab'), false); if (full) await shot(p, T('02-lead-tab-full'))
    // 3 · Company › Templates › Contracts
    await p.goto(`${BASE}/company/templates/contracts`); await settle(p); await shot(p, T('03-templates-top'), false); if (full) await shot(p, T('03-templates-full'))
    // 4 · the template editor
    await p.goto(`${BASE}/templates/contracts/${TPL}`); await settle(p); await shot(p, T('04-template-editor-top'), false); if (full) await shot(p, T('04-template-editor-full'))
    // 5 · the contract editor (Draft)
    await p.goto(`${BASE}/contracts/${C.draft}`); await settle(p); await shot(p, T('05-editor-draft-top'), false); if (full) await shot(p, T('05-editor-draft-full'))
    if (await tryClick(p, p.getByRole('button', { name: /smart text/i }), T('05-smart-text'))) await shot(p, T('05b-smart-text-menu'), false)
    await esc(p)
    if (await tryClick(p, p.getByRole('button', { name: /esignatures/i }), T('05-esign'))) await shot(p, T('05c-esignatures'), false)
    await esc(p)
    if (await tryClick(p, p.locator('button[aria-label="Outline"]'), T('05-outline'))) await shot(p, T('05d-outline'), false)
    await esc(p)
    // 6 · the header's primary (Send …) → its dialog
    if (await tryClick(p, p.locator('header button, [class*="header"] button').filter({ hasText: /send/i }), T('06-send'))) await shot(p, T('06-send-dialog'), false)
    // send it once (the first width) so the signing page is live for every width after
    if (!sent) {
      const wa = p.getByRole('button', { name: /send via whatsapp/i })
      if (await wa.count()) {
        const popup = ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null)
        if (await tryClick(p, wa, T('06-send-whatsapp'))) { sent = true; const pop = await popup; if (pop) await pop.close().catch(() => {}) }
        await p.waitForTimeout(1200)
      }
    }
    await esc(p)
    // 7 · ⋮
    if (await tryClick(p, p.locator('header button[aria-label="More options"], [class*="header"] button[aria-label="More options"]'), T('07-more'))) await shot(p, T('07-more-menu'), false)
    await esc(p)
    // 8 · a Signed contract's editor
    await p.goto(`${BASE}/contracts/${C.signed}`); await settle(p); await shot(p, T('08-editor-signed-top'), false)
    // 9 · Preview
    await p.goto(`${BASE}/contracts/${C.draft}/preview`); await settle(p); await shot(p, T('09-preview-top'), false); if (full) await shot(p, T('09-preview-full'))
    // 10 · the client's signing page (live once sent)
    await p.goto(`${BASE}/sign/${C.draft}`); await settle(p); await shot(p, T('10-sign-top'), false); if (full) await shot(p, T('10-sign-full'))
    await p.goto(`${BASE}/sign/${C.draft}/quote`); await settle(p); await shot(p, T('10b-sign-quote-top'), false)
    // 11 · a signed contract's page and the dead link
    await p.goto(`${BASE}/sign/${C.signed}`); await settle(p); await shot(p, T('11-sign-signed-top'), false); if (full) await shot(p, T('11-sign-signed-full'))
    await p.goto(`${BASE}/sign/none`); await settle(p); await shot(p, T('12-sign-notice'), false)
    // 13 · the picker from a quote: Send ▾ › Send for signature
    await p.goto(`${BASE}/quotes/${QUOTE_APPROVED}`); await settle(p)
    if (await tryClick(p, p.locator('[data-testid="quote-send"]'), T('13-quote-send'))) {
      await shot(p, T('13-quote-send-menu'), false)
      if (await tryClick(p, p.getByRole('menuitem', { name: /send for signature/i }).or(p.getByRole('button', { name: /send for signature/i })), T('13-send-for-signature'))) await shot(p, T('13-contract-picker'), false)
    }
    await esc(p); await esc(p)
    await ctx.close()
  }
  await b.close()
  fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1))
  const over = log.filter((l) => l.overflow)
  console.log('shots', log.filter((l) => !l.skipped).length, 'skipped', log.filter((l) => l.skipped).length, 'overflow', over.map((o) => o.name).join(' ') || 'none')
  for (const l of log.filter((l) => l.skipped)) console.log('  skipped', l.name, l.skipped)
})()
