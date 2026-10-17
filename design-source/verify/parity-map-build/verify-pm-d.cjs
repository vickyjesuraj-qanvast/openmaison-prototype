// The parity-map build, package P-D — documents, entities & paying (the owner's "build everything that's in 1.0 to 2.0", 2026-10-10; map rows
// MI-065 · FB-101 · FB-102 · FB-103 · FB-112 · CP-089). Each item asserted as the rule it builds, never another round's count:
//  MI-065 · FB-101 · FB-102  Settings › Finance › Invoice paper: an accent colour (the entity's / the brand's unless the paper has its own), an
//                            acceptance block (off by default), a live preview beside the form that follows every keystroke; a Preview sheet
//                            on a phone; the invoice prints them (data-accent, the block)
//  FB-103                    Company › Profile › an entity's More details (closed until asked for): branch code, footer text, accent — the
//                            invoice prints the branch code and the footer line; the receipt the footer line
//  FB-112                    Settings › Finance › Client payments › How clients pay: a switch per way, the last one on stays on, saved as pressed;
//                            PayNow off → no PayNow on the invoice's How to pay; Match bank transfers automatically = a recorded ask (stand-in)
//  CP-089                    the client's pay box: SWIFT and the branch code, each with Copy
//  Read-only (Germaine, a Designer): the preview stands in the card; the switches are off-limits. Phone 390: no sideways scroll.
// Run against `next start` on a fresh copy of the repaired scratch DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3122 NODE_PATH=<repo>/node_modules node verify-pm-d.cjs <scratch.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm-d')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3122'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const P = (n) => sql(`select id from projects where number='${n}'`)
const PHONE_BEN = '97731968'

/* What the probe changes, kept to put back: three settings rows (the brand record whole, through a file — it holds quotes and pictures). */
const KEYS = ['brand', 'invoice_paper', 'payment_collection']
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-d-'))
const kept = {}
for (const k of KEYS) {
  const has = sql(`select count(*) from settings where key='${k}'`) === '1'
  kept[k] = has
  if (has) execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select writefile('${path.join(tmp, k)}', value) from settings where key='${k}'"`)
}
const putBack = () => {
  for (const k of KEYS) {
    if (kept[k]) sql(`update settings set value = cast(readfile('${path.join(tmp, k)}') as text) where key='${k}'`)
    else sql(`delete from settings where key='${k}'`)
  }
  as('dane')
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const ben = P('P-2026-002')
  const mid = sql(`select id from project_invoices where project_id='${ben}' and stage_name='Mid-Project'`)
  const rct = sql(`select p.id from project_payments p join project_invoices i on i.id = p.invoice_id where i.project_id='${ben}' and p.receipt_number is not null and p.status='confirmed' limit 1`)
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 } })
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = (p) => p.locator('[role="status"][aria-live="polite"]').last()
  const dialog = (p) => p.locator('[role="dialog"]').last()
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 160)}`)); return p }
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const collection = () => JSON.parse(sql(`select value from settings where key='payment_collection'`) || '{}')
  const flip = async (p, method) => { await p.locator(`[data-testid="payment-method-row"][data-method="${method}"] label`).first().click(); await settle(p, 1400) }

  try {
    as('dane')
    const S = await desk()
    const s = await page(S, 'studio')

    // ── MI-065 · FB-101 · FB-102 — the invoice paper: accent, acceptance, the live preview ──────────────────────────────────────────
    console.log('MI-065 · FB-101 · FB-102 the invoice paper')
    await go(s, '/settings?section=finance')
    const card = s.locator('[data-testid="invoice-paper-settings"]')
    await card.scrollIntoViewIfNeeded(); await settle(s, 600)
    const preview = card.locator('[data-testid="invoice-paper-preview"]')
    const pBox = await preview.boundingBox(), fBox = await card.getByLabel('Header note').boundingBox()
    ok(!!pBox && !!fBox && pBox.width > 300 && pBox.x > fBox.x + fBox.width - 4, 'FB-102 at 1440 the preview stands beside the form')
    ok(await preview.locator('[data-testid="invoice-paper"]').count() === 1, 'FB-102 … the real invoice paper, on a sample invoice')
    ok(/Preview · a sample invoice/i.test(await preview.innerText())   /* (a caption: innerText reads it uppercase) */, 'FB-102 … labelled a sample, never taken for a real invoice')
    ok(await card.locator('[data-testid="invoice-paper-acceptance"]').count() === 1 && await preview.locator('[data-testid="invoice-acceptance"]').count() === 0, 'MI-065 the acceptance block is off by default')
    await card.getByLabel('Header note').fill('With thanks from the P-D probe.'); await settle(s, 400)
    ok(/With thanks from the P-D probe/.test(await preview.locator('[data-testid="invoice-header-note"]').innerText().catch(() => '')), 'FB-102 the preview follows what is typed, before Save')
    ok(await preview.locator('[data-testid="invoice-paper"][data-accent]').count() === 1, 'FB-101 by default the paper takes the brand’s accent')
    await card.getByRole('radio', { name: /A colour of its own/ }).click(); await settle(s, 300)
    await card.locator('[data-testid="invoice-paper-accent-field"]').getByLabel('Accent colour', { exact: true }).fill('#0B6E4F'); await settle(s, 400)
    ok(/#0B6E4F/i.test(await preview.locator('[data-testid="invoice-paper"]').getAttribute('style') ?? ''), 'FB-101 a colour of its own: the preview prints in it')
    await card.locator('[data-testid="invoice-paper-acceptance"]').click(); await settle(s, 400)
    ok(await card.getByLabel('Acceptance words').count() === 1 && await preview.locator('[data-testid="invoice-acceptance"]').count() === 1, 'MI-065 the acceptance block: its words, and it shows on the preview')
    await shot(s, 'd01-paper-settings-1440')
    await card.locator('[data-testid="invoice-paper-save"]').click(); await settle(s, 1500)
    const paper = JSON.parse(sql(`select value from settings where key='invoice_paper'`) || '{}')
    ok(paper.studio && paper.studio.accent === '#0B6E4F' && paper.studio.acceptance === true && /P-D probe/.test(paper.studio.header), 'MI-065 Save keeps the accent, the block and the note')
    await go(s, `/projects/${ben}/invoices/${mid}`)
    const inv = s.locator('[data-testid="invoice-paper"]')
    ok(/#0B6E4F/i.test(await inv.getAttribute('style') ?? '') && await inv.getAttribute('data-accent') !== null, 'FB-101 the invoice prints in the paper’s accent')
    ok(await inv.locator('[data-testid="invoice-acceptance"]').count() === 1 && /Name[\s\S]*Signature[\s\S]*Date/i.test(await inv.locator('[data-testid="invoice-acceptance"]').innerText()), 'MI-065 … and ends with the acceptance block: name, signature, date')
    await shot(s, 'd02-invoice-accent-acceptance', true)

    // ── FB-103 — an entity's More details, printed ───────────────────────────────────────────────────────────────────────────────
    console.log('FB-103 an entity’s More details')
    await go(s, '/company/profile')
    const e0 = s.getByTestId('entity').first()
    ok(await e0.locator('[data-testid="entity-more-details"]').count() === 0, 'FB-103 More details stays closed until asked for')
    await e0.locator('[data-testid="entity-more-toggle"]').click(); await settle(s, 300)
    const more = e0.locator('[data-testid="entity-more-details"]')
    ok(await more.getByLabel('Bank branch code').count() === 1 && await more.getByLabel('Footer text').count() === 1 && await more.locator('[data-testid="entity-accent"]').count() === 1, 'FB-103 … then branch code, accent and footer text (the studio’s contacts stay its Company details)')
    await more.getByLabel('Bank branch code').fill('081')
    await more.getByLabel('Footer text').fill('Demo Studio Pte Ltd · thank you for building with us')
    await shot(s, 'd03-profile-more-details')
    await s.getByRole('button', { name: 'Save changes' }).click(); await settle(s, 1500)
    const brand = sql(`select value from settings where key='brand'`)
    ok(/"branch":"081"/.test(brand) && /thank you for building with us/.test(brand), 'FB-103 saved on the entity')
    await go(s, `/projects/${ben}/invoices/${mid}`)
    ok((await s.locator('[data-testid="invoice-branch"]').innerText().catch(() => '')) === '081', 'FB-103 · CP-089 the invoice’s How to pay prints the branch code')
    ok(/thank you for building with us/.test(await s.locator('[data-testid="invoice-paper"] [data-testid="paper-footer-text"]').innerText().catch(() => '')), 'FB-103 the invoice prints the entity’s footer line at its foot')
    if (rct) {
      await go(s, `/projects/${ben}/receipts/${rct}`)
      ok(/thank you for building with us/.test(await s.locator('[data-testid="receipt-paper"] [data-testid="paper-footer-text"]').innerText().catch(() => '')), 'FB-103 the receipt prints it too (the letterhead carries the extras)')
    }

    // ── FB-112 — how clients pay ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('FB-112 how clients pay')
    await go(s, '/settings?section=finance')
    const methods = s.locator('[data-testid="payment-methods"]')
    await methods.scrollIntoViewIfNeeded(); await settle(s, 400)
    ok(await methods.locator('[data-testid="payment-method-row"]').count() === 4 && await methods.locator('[data-testid="payment-method-row"][data-on]').count() === 4, 'FB-112 four ways, every one on while nothing is set')
    await flip(s, 'paynow')
    ok((collection().off ?? []).includes('paynow'), 'FB-112 PayNow off — saved as pressed')
    ok(/no longer offered/.test(await snack(s).innerText().catch(() => '')), 'FB-112 … and the snackbar says where it leaves')
    await go(s, `/projects/${ben}/invoices/${mid}`)
    const howTo = await s.locator('[data-testid="invoice-pay"]').innerText().catch(() => '')
    ok(!/PayNow/.test(howTo) && /072-904418-3/.test(howTo), 'FB-112 PayNow off: the invoice’s How to pay leaves PayNow out and keeps the bank')
    await go(s, '/settings?section=finance')
    await flip(s, 'bank_transfer'); await flip(s, 'cheque')
    const cash = s.locator('[data-testid="payment-method-row"][data-method="cash"]')
    ok(await cash.locator('input').isDisabled() && /at least one way/i.test(await cash.innerText()), 'FB-112 the last way on stays on — its row says why')
    await shot(s, 'd04-client-payments-1440')
    for (const m of ['bank_transfer', 'cheque', 'paynow']) await flip(s, m)
    ok((collection().off ?? []).length === 0, 'FB-112 every way back on')
    const feed = s.locator('[data-testid="payment-bank-feed"]')
    await feed.locator('[data-testid="payment-bank-feed-ask"]').click(); await settle(s, 1400)
    ok(!!collection().bankFeed && /Asked on/.test(await feed.innerText()) && /in touch/.test(await feed.innerText()), 'FB-112 Match bank transfers: the ask is recorded and the row says so (a stand-in)')
    await feed.locator('[data-testid="payment-bank-feed-withdraw"]').click(); await settle(s, 1400)
    ok(!collection().bankFeed && await feed.locator('[data-testid="payment-bank-feed-ask"]').count() === 1, 'FB-112 … and Withdraw the ask takes it back')

    // ── Read-only: Germaine, a Designer ───────────────────────────────────────────────────────────────────────────────────────────
    console.log('read-only')
    as('germaine')
    await go(s, '/settings?section=finance')
    const roCard = s.locator('[data-testid="invoice-paper-settings"]')
    await roCard.scrollIntoViewIfNeeded(); await settle(s, 400)
    ok(await roCard.locator('[data-testid="invoice-paper-preview"] [data-testid="invoice-paper"]').isVisible(), 'a Designer sees the paper as it prints')
    ok(await s.locator('[data-testid="payment-method-row"][data-method="cash"] input').isDisabled() && await s.locator('[data-testid="payment-bank-feed-ask"]').isDisabled(), 'a Designer can’t change how clients pay or ask for the bank feed')
    as('dane')

    // ── Phone 390: the Preview sheet, Profile, the client's pay box ───────────────────────────────────────────────────────────────
    console.log('phone 390')
    const Ph = await phoneCtx()
    const ph = await page(Ph, 'phone')
    await go(ph, '/settings?section=finance')
    const pc = ph.locator('[data-testid="invoice-paper-settings"]')
    await pc.scrollIntoViewIfNeeded(); await settle(ph, 400)
    ok(!(await pc.locator('[data-testid="invoice-paper-preview"]').isVisible()) && await pc.locator('[data-testid="invoice-paper-preview-open"]').isVisible(), 'FB-102 on a phone the preview waits behind a Preview button')
    await pc.locator('[data-testid="invoice-paper-preview-open"]').click(); await settle(ph, 900)
    ok(await dialog(ph).locator('[data-testid="invoice-paper-preview-large"] [data-testid="invoice-paper"]').count() === 1, 'FB-102 … which opens the paper in a sheet')
    await shot(ph, 'd05-preview-sheet-390')
    await ph.keyboard.press('Escape'); await settle(ph, 500)
    ok(await overflow(ph) <= 1, 'Settings › Finance: no sideways scroll at 390')
    await go(ph, '/company/profile')
    await ph.getByTestId('entity').first().locator('[data-testid="entity-more-toggle"]').click(); await settle(ph, 400)
    ok(await overflow(ph) <= 1, 'Profile with More details open: no sideways scroll at 390')
    await shot(ph, 'd06-profile-390', true)
    const C = await phoneCtx()
    const c = await page(C, 'client')
    await go(c, '/my/demo-studio/login')
    await c.locator('input[type="tel"]').fill(PHONE_BEN)
    await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
    await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
    await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1400)
    await go(c, `/my/demo-studio/money?open=${mid}`)
    const pay = c.locator('[data-testid="portal-pay-box"]').first()
    ok(await pay.locator('[data-testid="portal-copy-swift"]').count() === 1, 'CP-089 the pay box carries the SWIFT with Copy')
    ok(await pay.locator('[data-testid="portal-copy-branch"]').count() === 1, 'CP-089 … and the branch code with Copy')
    await shot(c, 'd07-portal-paybox-390', true)
  } catch (e) {
    fail++; console.log('  ✗ threw:', String(e).slice(0, 300))
  } finally {
    putBack()
    fs.rmSync(tmp, { recursive: true, force: true })
    await b.close()
  }
  if (errors.length) { console.log('page errors:'); for (const e of errors) console.log('  ', e) }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
