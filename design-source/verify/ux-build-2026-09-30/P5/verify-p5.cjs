// UX audit build 2026-09-30 — package P5: contracts, signing and Quote X-Ray (C1…C12, Q9). Run against a production build on a scratch DB
// that has had `db:repair` (R65 · R66). It creates records: re-copy the scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3025
//   TESTDB=<scratch.db> NODE_PATH=$PWD/node_modules node design-source/verify/ux-build-2026-09-30/P5/verify-p5.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3025', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
/* (pending modules S14, a deliberate change of this rule) the demo studio has CaseTrust on record (repair R116, as its brand kit and About page
   show): its signing pages carry the deposit-protection disclosure, ticked once the agreement is read — before the code. */
const caseTrust = async (pg) => {
  const box = pg.getByRole('checkbox', { name: 'I have read the CaseTrust deposit-protection disclosure' })
  if (!(await box.count()) || await box.first().isChecked().catch(() => false)) return
  await pg.getByTestId('gate-casetrust-tick').first().scrollIntoViewIfNeeded().catch(() => {})
  await pg.getByTestId('gate-casetrust-tick').first().click(); await pg.waitForTimeout(300)
}
const snackText = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(150) } return snackText(page) }
const lead = (name) => sql(`select id from leads where name = '${name}'`)
const HARPREET = lead('Harpreet Kaur'), OLIVIA = lead('Olivia Martinez'), VIVIEN = lead('Vivien Lee'), SERENA = lead('Serena Koh')
const OLIVIA_C = sql(`select id from contracts where lead_id = '${OLIVIA}' order by created_at limit 1`)
const XRAY_VIVIEN = sql(`select id from quote_comparisons where lead_id = '${VIVIEN}' order by created_at desc limit 1`)
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const idFromUrl = (u) => (u.match(/\/contracts\/([0-9a-f-]{36})/) || [])[1]

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'] })
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }))
  const popups = []
  ctx.on('page', (p) => { if (p.url().startsWith('https://wa.me') || p.url() === 'about:blank') popups.push(p) })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  let A = null, V = null

  /* ── C10 · R66: the seeded contracts are named as their paper, and a signed one's fingerprint follows its new name ── */
  await step('C10 repair', async () => {
    ok('C10 no contract named apart from its paper', sql(`select count(*) from contracts where title = 'General Contract Agreement'`) === '0')
    const crypto = require('crypto')
    const signed = sql(`select id || '¦' || title || '¦' || document_hash from contracts where status = 'Signed' and source = 'composed'`).split('\n').filter(Boolean)
    const good = signed.every((l) => { const [id, title, hash] = l.split('¦'); const body = sql(`select signed_body from contracts where id = '${id}'`); return crypto.createHash('sha256').update(`html\n${title}\n${body}`).digest('hex') === hash })
    ok('C10 each signed copy’s fingerprint is taken under its new name', signed.length > 0 && good)
    ok('C10 the Won logs name the renamed signed copies', sql(`select count(*) from stage_logs where to_stage = 'Won' and json_extract(payload, '$.wonContract') = 'General Contract Agreement.pdf'`) === '0')
    const RYAN_C = sql(`select c.id from contracts c join leads l on l.id = c.lead_id where l.name like 'Ryan%' limit 1`)
    await page.goto(`${BASE}/sign/${RYAN_C}`); await ready(page)
    const eyebrowAndPaper = await page.evaluate(() => [document.querySelector('[data-testid="signing-page"] h1')?.textContent?.trim() ?? '', document.querySelector('[data-testid="signing-page"] h2')?.textContent ?? ''])
    ok('C10 the client’s page names the document as its paper does', eyebrowAndPaper[0] === 'Interior Design Service Agreement', eyebrowAndPaper.join(' · '))
  })

  /* ── C6 · Q9 · C10: the empty state names the quote; the picker opens on the last-used agreement, templates before folders ── */
  await step('C6 empty state + picker', async () => {
    await page.goto(`${BASE}/leads/${HARPREET}/contracts`); await ready(page)
    ok('C6 the empty state names the quote a new contract will use', /Names OM-10006 · S\$67,393/.test(await page.getByTestId('contracts-empty-quote').innerText()))
    await shot(page, 'c6-empty-names-quote')
    await page.getByRole('button', { name: 'From Template' }).click(); await page.getByTestId('contract-template-option').first().waitFor(); await page.waitForTimeout(500)
    const picked = page.locator('[data-testid="contract-template-option"][aria-checked="true"]')
    ok('C6 · Q9 the picker opens with a template picked (the last-used agreement)', (await picked.count()) === 1 && /Interior Design Service Agreement/.test(await picked.innerText()) && /Last used/i.test(await picked.innerText()))
    const order = await page.evaluate(() => { const g = document.querySelector('[role="radiogroup"][aria-label="Contract templates"]'); const f = [...document.querySelectorAll('button')].find((b) => /Variations/.test(b.textContent || '')); return g && f ? !!(g.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) : false })
    ok('C6 templates come before the folders', order)
    ok('C6 Use template is live on open', !(await page.getByRole('button', { name: 'Use template' }).isDisabled()))
    await shot(page, 'c6-picker-preselected')
    await page.getByRole('button', { name: 'Use template' }).click()
    await page.waitForURL(/\/contracts\/[0-9a-f-]{36}/); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    A = idFromUrl(page.url())
    ok('C10 a lead’s first agreement is titled as its paper', sql(`select title from contracts where id = '${A}'`) === 'Interior Design Service Agreement')
  })

  /* ── C2 · C7 · C8 in the editor ── */
  await step('C2 C7 C8 editor', async () => {
    ok('C2 the meta row shows the named quote’s status', /Approved/i.test(await page.getByTestId('contract-quote-status').innerText()))
    await page.locator('.om-token[data-token="client.name"]').first().hover(); await page.waitForTimeout(700)
    const tip = await page.locator('[role="tooltip"]').innerText().catch(() => '')
    ok('C7 a Smart Text chip shows what it prints', tip === 'Prints as: Harpreet Kaur', tip)
    await shot(page, 'c7-chip-prints-as', { x: 440, y: 60, width: 1000, height: 420 })
    await page.mouse.move(10, 900); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Copy link — marks it Sent' }).hover(); await page.waitForTimeout(700)
    ok('C8 the copy-link icon on a Draft says it marks it Sent', (await page.locator('[role="tooltip"]').innerText().catch(() => '')) === 'Copy link — marks it Sent')
    await shot(page, 'c8-copy-link-tooltip', { x: 700, y: 0, width: 740, height: 140 })
    /* a failed copy leaves it a Draft */
    // REG-897 (Dane UAT 12.10): a refused Clipboard API still gets the browser's own Copy — a copy fails only when both refuse
    await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); document.execCommand = () => false })
    await page.getByRole('button', { name: 'Copy link — marks it Sent' }).click()
    const t1 = await snack(page, /stays a Draft/)
    await page.waitForTimeout(800)
    ok('C8 a failed copy says so and the contract stays a Draft', /Couldn’t copy the link — the contract stays a Draft/.test(t1) && sql(`select status from contracts where id = '${A}'`) === 'Draft', t1)
    await page.reload(); await ready(page)
    await page.getByRole('button', { name: 'Copy link — marks it Sent' }).click()
    const t2 = await snack(page, /Sent to Client now/)
    await page.waitForTimeout(800)
    ok('C8 a copy that worked marks it Sent to Client', /Signing link copied — the contract is Sent to Client now/.test(t2) && sql(`select status from contracts where id = '${A}'`) === 'Sent to Client', t2)
  })

  /* ── C5 on Tools › Contracts and the lead tab ── */
  await step('C5 awaiting signature', async () => {
    sql(`update contracts set sent_at = strftime('%s','now') - 3*86400, viewed_at = NULL where id = '${A}'`)
    await page.goto(`${BASE}/contracts`); await ready(page)
    const chip = page.getByTestId('contracts-awaiting')
    ok('C5 the to-do chip counts what is out for signature', /Awaiting signature \(1\)/.test(await chip.innerText()))
    const row = page.locator(`[data-kb-id="${A}"]`)
    ok('C5 the row says it is not opened and how long it has waited', (await row.getByTestId('contract-waiting').innerText()) === 'Not opened in 3d')
    const clear = await row.evaluate((r) => { const w = r.querySelector('[data-testid="contract-waiting"]').getBoundingClientRect(); const c = r.querySelector('[data-col="created"]'); const t = document.createRange(); t.selectNodeContents(c); return Math.round(t.getBoundingClientRect().left - w.right) })
    ok('C5 …inside its column, clear of the Created date', clear >= 8, `${clear}px clear`)
    await shot(page, 'c5-tools-awaiting')
    await chip.getByRole('button').click(); await page.waitForTimeout(500)
    ok('C5 a press narrows the list to it', (await page.locator('[data-kb-row]').count()) === 1 && (await chip.getByRole('button').getAttribute('aria-pressed')) === 'true')
    await shot(page, 'c5-tools-awaiting-on')
    await chip.getByRole('button').click(); await page.waitForTimeout(400)
    ok('C5 a second press lets go', (await page.locator('[data-kb-row]').count()) > 1)
    sql(`update contracts set viewed_at = strftime('%s','now') - 2*86400 where id = '${A}'`)
    await page.goto(`${BASE}/leads/${HARPREET}/contracts`); await ready(page)
    ok('C5 …and on the lead’s tab: Opened 2d ago', (await page.locator(`[data-kb-id="${A}"]`).getByTestId('contract-waiting').innerText()) === 'Opened 2d ago' && (await page.getByTestId('contracts-awaiting').count()) === 1)
    /* a phone's card has room for the whole line (and no Sent column) */
    const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const pp = await ph.newPage(); await pp.goto(`${BASE}/leads/${HARPREET}/contracts`); await ready(pp)
    ok('C5 on a phone the card says Sent 3d ago · opened 2d ago', (await pp.locator(`[data-kb-id="${A}"]`).getByTestId('contract-waiting-full').innerText()) === 'Sent 3d ago · opened 2d ago')
    await shot(pp, 'c5-lead-tab-phone')
    await ph.close()
    await page.locator(`[data-kb-id="${A}"]`).hover(); await page.getByRole('button', { name: /^More actions for/ }).first().click()
    await page.getByRole('menuitem', { name: 'Send a reminder' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send a reminder' })
    await dlg.waitFor(); await page.waitForTimeout(400)
    const msg = await dlg.getByLabel('Message to the client').inputValue()
    /* (pending modules S03, a deliberate change of this rule) the same link is the contract's token, never its id */
    ok('C5 Send a reminder reuses the Send dialog with a nudge and the same link', /gentle reminder/.test(msg) && msg.includes(`/sign/${sql(`select sign_token from contracts where id = '${A}'`)}`) && (await dlg.getByLabel('Client name').inputValue()) === 'Harpreet Kaur')
    await shot(page, 'c5-send-a-reminder')
    await dlg.getByRole('button', { name: 'Send via WhatsApp' }).click()
    const t = await snack(page, /Reminder sent to/)
    ok('C5 the reminder answers in words', /Reminder sent to Harpreet Kaur/.test(t), t)
  })

  /* ── C10 · C9 · C4: the Variation Order (repaired, R65) is titled on its own and has somewhere to sign ── */
  await step('C10 C9 Variation Order', async () => {
    await page.goto(`${BASE}/leads/${HARPREET}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'New Contract' }).click(); await page.getByRole('menuitem', { name: 'From Template' }).click()
    await page.getByTestId('contract-template-option').first().waitFor(); await page.waitForTimeout(400)
    await page.getByRole('button', { name: /Variations/ }).click(); await page.waitForTimeout(300)
    await page.getByTestId('contract-template-option').filter({ hasText: 'Variation Order' }).first().click()
    await page.getByRole('button', { name: 'Use template' }).click()
    await page.waitForURL(/\/contracts\/[0-9a-f-]{36}/); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    V = idFromUrl(page.url())
    ok('C10 the lead’s first Variation Order is not numbered after the agreement', sql(`select title from contracts where id = '${V}'`) === 'Variation Order')
    ok('C4 the repaired Variation Order carries a Client signature', sql(`select count(*) from contracts where id = '${V}' and body like '%data-sign="client-signature"%'`) === '1')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    const dlg = page.getByRole('dialog', { name: 'Send for digital signature' }); await dlg.waitFor(); await page.waitForTimeout(400)
    ok('C4 it can be sent (the Send dialog opens)', true)
    ok('C12 "Reset message" (not "Reset to draft")', (await dlg.getByRole('button', { name: 'Reset message' }).count()) === 1 && (await dlg.getByText('Reset to draft').count()) === 0)
    ok('C9 the Send dialog offers Signed in person? Mark as signed', /Signed in person\?/.test(await dlg.getByTestId('send-mark-signed').innerText()) && (await dlg.getByRole('button', { name: 'Mark as signed' }).isVisible()))
    await shot(page, 'c9-send-dialog-mark-signed')
    await dlg.getByRole('button', { name: 'Copy link' }).click()
    const tc = await snack(page, /Sent to Client now/)
    await page.waitForTimeout(600)
    ok('C8 the Send dialog’s Copy link on a Draft copies, then marks it Sent', /Signing link copied — the contract is Sent to Client now/.test(tc) && sql(`select status from contracts where id = '${V}'`) === 'Sent to Client' && (await dlg.getByRole('button', { name: 'Copied' }).count()) === 1, tc)
    await dlg.getByRole('button', { name: 'Mark as signed' }).first().click()
    await page.getByRole('dialog', { name: 'Mark as signed' }).waitFor()
    ok('C9 …which opens Mark as signed', true)
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'More options', exact: true }).first().click()
    ok('C9 the editor kebab offers Mark as signed…', await page.getByRole('menuitem', { name: 'Mark as signed…' }).isVisible())
    await page.waitForTimeout(500); await shot(page, 'c9-editor-kebab')
    await page.keyboard.press('Escape')
  })

  /* ── C4 (reason) · C3: Send together, then the client's bundle page on a phone ── */
  let BUNDLE = null
  await step('C3 Send together on a phone', async () => {
    await page.goto(`${BASE}/leads/${HARPREET}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click()   // the tab toolbar's ⋮ (the lead header's comes first)
    await page.getByRole('menuitem', { name: 'Send together for signature' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send together for signature' }); await dlg.waitFor(); await page.waitForTimeout(300)
    await dlg.getByRole('button', { name: 'Send via WhatsApp' }).click()
    await snack(page, /documents sent under one link/)
    await page.waitForTimeout(800)
    BUNDLE = sql(`select bundle_id from contracts where id = '${A}'`)
    ok('C3 the two documents went together', !!BUNDLE && sql(`select count(*) from contracts where bundle_id = '${BUNDLE}'`) === '2')
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/sign/bundle/${BUNDLE}`); await ready(p)
    const bar = p.getByTestId('sign-next')
    ok('C3 a next bar at the paper’s foot on a phone', await bar.isVisible())
    /* read to the end; where the document asks for a tick, it is in the card above */
    const readDoc = async () => {
      await p.getByTestId('paper-end').scrollIntoViewIfNeeded(); await p.waitForTimeout(600)
      if (await p.getByTestId('gate-accept').count()) { await p.getByTestId('gate-accept').evaluate((e) => e.scrollIntoView()); await p.getByTestId('gate-accept').click(); await p.getByTestId('paper-end').scrollIntoViewIfNeeded(); await p.waitForTimeout(500) }
      if (await p.getByTestId('gate-casetrust').count()) { await caseTrust(p); await p.getByTestId('paper-end').scrollIntoViewIfNeeded(); await p.waitForTimeout(500) }
    }
    await readDoc()
    ok('C3 "Document 1 of 2 read · Next document"', /Document 1 of 2 read/.test(await bar.innerText()) && (await bar.getByRole('button', { name: 'Next document' }).isVisible()), await bar.innerText())
    await shot(p, 'c3-bundle-phone-next-document')
    await bar.getByRole('button', { name: 'Next document' }).click(); await p.waitForTimeout(700)
    const top = await p.getByTestId('bundle-walk').evaluate((e) => Math.round(e.getBoundingClientRect().top))
    ok('C3 the next document opens at its own top, under the letterhead bar', top >= 64 && top < 140, `top ${top}`)
    await shot(p, 'c3-bundle-phone-doc2-top')
    await readDoc()
    ok('C3 then "Continue to sign"', /Document 2 of 2 read/.test(await bar.innerText()) && await bar.getByRole('button', { name: 'Continue to sign' }).isVisible())
    await shot(p, 'c3-bundle-phone-continue')
    await bar.getByRole('button', { name: 'Continue to sign' }).click(); await p.waitForTimeout(900)
    ok('C3 …which leads to the code, the card in view', (await p.getByText('Enter the code').isVisible()) && (await p.getByTestId('sign-next').count()) === 0)
    await p.getByLabel('One-time code').fill('123456'); await p.getByRole('button', { name: 'Verify' }).click()
    await p.getByRole('button', { name: /^Sign 2 documents$/ }).click(); await p.getByText('Signed', { exact: true }).first().waitFor(); await p.waitForTimeout(600)
    await phone.close()
    const n = sql(`select href || ' ¦ ' || body from notifications where kind = 'quote_signed' and lead_id = '${HARPREET}' order by created_at desc limit 1`)
    ok('C1 the “signed” notification leads on to Won with the contract picked', n.includes(`/leads/${HARPREET}?move=won&contract=${A}`) && /move it to Won/.test(n), n)
  })

  /* ── C1 in the editor ── */
  await step('C1 signed contract', async () => {
    await page.goto(`${BASE}/contracts/${A}`); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    ok('C1 the dead Send is now Download signed copy', await page.getByRole('button', { name: 'Download signed copy' }).isVisible())
    ok('C1 the signed banner offers Move to Won while the lead is in Quote Sent', await page.getByTestId('contract-move-won').isVisible() && /still in Quote Sent/.test(await page.getByTestId('contract-banner').innerText()))
    await shot(page, 'c1-signed-banner-move-to-won')
    await page.getByTestId('contract-move-won').click(); await page.waitForURL(/move=won/)
    ok('C1 Move to Won opens the lead at the Won step with this contract', page.url().includes(`/leads/${HARPREET}?move=won&contract=${A}`), page.url())
  })

  /* ── C9 · C1: Mark as signed from a row, the snackbar's next step ── */
  await step('C9 mark signed from a row', async () => {
    await page.goto(`${BASE}/leads/${VIVIEN}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'From Template' }).click(); await page.getByTestId('contract-template-option').first().waitFor(); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Use template' }).click(); await page.waitForURL(/\/contracts\/[0-9a-f-]{36}/); await ready(page)
    const C = idFromUrl(page.url())
    await page.goto(`${BASE}/leads/${VIVIEN}/contracts`); await ready(page)
    await page.locator(`[data-kb-id="${C}"]`).hover(); await page.getByRole('button', { name: /^More actions for/ }).first().click()
    const copyRow = page.getByRole('menuitem', { name: /Copy Link/ })
    ok('C8 a Draft row’s Copy Link says it marks it Sent', /Marks it Sent to Client/.test(await copyRow.innerText()))
    await page.waitForTimeout(500); await shot(page, 'c9-row-kebab')
    await page.getByRole('menuitem', { name: 'Mark as signed…' }).click()
    const dlg = page.getByRole('dialog', { name: 'Mark as signed' }); await dlg.waitFor()
    await dlg.getByRole('button', { name: 'Mark as signed' }).click()
    const t = await snack(page, /marked Signed/)
    const title = sql(`select title from contracts where id = '${C}'`)
    ok('C9 · C1 the row’s Mark as signed… answers with the next step', t.includes(`${title} marked Signed`) && /Move to Won/.test(t), t)
    await page.waitForTimeout(500); await shot(page, 'c1-marked-signed-snackbar')
    const n = sql(`select href from notifications where kind = 'quote_signed' and lead_id = '${VIVIEN}' order by created_at desc limit 1`)
    ok('C1 a studio-marked signature’s notification leads on to Won too', n.includes(`move=won&contract=${C}`), n)
  })

  /* ── C2: a contract naming a Draft quote doesn't go out ── */
  await step('C2 Draft quote', async () => {
    sql(`update members set is_you = case id when 'germaine' then 1 else 0 end`)   // (S44Q — row 334, a deliberate change of this rule) an approver's send approves the Draft quote it names now; the hold is a non-approver's — Germaine, a Designer
    await page.goto(`${BASE}/contracts/${OLIVIA_C}`); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    ok('C2 the meta row says the quote is a Draft', /Draft/i.test(await page.getByTestId('contract-quote-status').innerText()))
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    const t = await snack(page, /still a Draft/)
    ok('C2 Send says the quote is still a Draft, with the way to it', /Before you send: OM-10001 is still a Draft — approve and send it first/.test(t) && /Open the quote/.test(t), t)
    ok('C2 …and nothing opened', (await page.getByRole('dialog', { name: 'Send for digital signature' }).count()) === 0)
    await page.waitForTimeout(500); await shot(page, 'c2-draft-quote-blocks-send')
    await page.goto(`${BASE}/leads/${OLIVIA}/contracts`); await ready(page)
    await page.locator(`[data-kb-id="${OLIVIA_C}"]`).getByRole('button', { name: /^Status Draft/ }).click()
    await page.getByRole('menuitem', { name: 'Sent to Client' }).click()
    const t2 = await snack(page, /still a Draft/)
    ok('C2 the list’s status menu holds it too', /OM-10001 is still a Draft — approve and send it first/.test(t2) && sql(`select status from contracts where id = '${OLIVIA_C}'`) === 'Draft', t2)
    sql(`update members set is_you = case id when 'dane' then 1 else 0 end`)
  })

  /* ── C4: the template editor warns; Send together names the document that holds it back ── */
  await step('C4 nowhere to sign', async () => {
    const TPL = 'probe-p5-nosign'
    sql(`insert or replace into contract_templates (id, title, body, created_by, created_at, updated_at) values ('${TPL}', 'Probe no signature', '<h1>Probe</h1><p>Words only.</p><p><span class="om-sign" data-sign="client-initial" contenteditable="false">Client initial</span></p>', 'dane', strftime('%s','now'), strftime('%s','now'))`)
    await page.goto(`${BASE}/templates/contracts/${TPL}`); await page.getByTestId('contract-template-editor').waitFor(); await ready(page)
    ok('C4 the template editor warns there is nowhere for the client to sign', await page.getByTestId('template-no-client-sign').isVisible())
    await shot(page, 'c4-template-no-client-sign')
    sql(`delete from contract_templates where id = '${TPL}'`)
    const now = Math.floor(Date.now() / 1000)
    const body = sql(`select body from contracts where id = '${A}'`).replace(/'/g, "''")
    sql(`insert into contracts (id, lead_id, title, status, created_at, updated_at, body, recipient_name, recipient_phone, source, created_by) values ('probe-p5-a', '${SERENA}', 'Interior Design Service Agreement', 'Draft', ${now}, ${now}, '${body}', 'Serena Koh', '91234567', 'composed', 'dane')`)
    sql(`insert into contracts (id, lead_id, title, status, created_at, updated_at, body, recipient_name, recipient_phone, source, created_by) values ('probe-p5-v', '${SERENA}', 'Variation Order', 'Draft', ${now + 1}, ${now + 1}, '<h1>Variation Order</h1><p>Change.</p>', 'Serena Koh', '91234567', 'composed', 'dane')`)
    await page.goto(`${BASE}/leads/${SERENA}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click()
    const row = page.getByRole('menuitem', { name: /Send together for signature/ })
    ok('C4 Send together’s greyed row names the document that holds it back', (await row.getAttribute('aria-disabled')) === 'true' && /Variation Order has nowhere to sign/.test(await row.innerText()), await row.innerText())
    await page.waitForTimeout(500); await shot(page, 'c4-send-together-reason')
    await page.keyboard.press('Escape')
  })

  /* ── C11 · C12: Quote X-Ray ── */
  await step('C11 C12 X-Ray', async () => {
    await page.goto(`${BASE}/quote-x-ray/${XRAY_VIVIEN}`); await ready(page)
    ok('C11 the Yours tile says what it counts', /line totals, before GST/.test(await page.getByTestId('xray-tile-yours').innerText()))
    await shot(page, 'c11-xray-tiles', { x: 60, y: 60, width: 1380, height: 420 })
    await page.getByRole('button', { name: 'Send to client' }).click()
    const dlg = page.getByRole('dialog', { name: 'Send to client' }); await dlg.waitFor(); await page.waitForTimeout(400)
    ok('C12 X-Ray’s dialog takes the recipient: name and phone', (await dlg.getByLabel('Client name').inputValue()) === 'Vivien Lee' && /\d{4} \d{4}/.test(await dlg.getByLabel('Client phone').inputValue()))
    ok('C12 its subtitle says what the button does', /Send via WhatsApp opens your chat/.test(await dlg.innerText()) && await dlg.getByRole('button', { name: 'Send via WhatsApp' }).isVisible())
    ok('C12 Reset message', (await dlg.getByRole('button', { name: 'Reset message' }).count()) === 1)
    await shot(page, 'c12-xray-send-dialog')
    await dlg.getByRole('button', { name: 'Send via WhatsApp' }).click()
    const t = await snack(page, /on WhatsApp/)
    ok('C12 after sending, a snackbar offers Add a follow-up', /Sent to Vivien Lee on WhatsApp/.test(t) && /Add a follow-up/.test(t), t)
    await page.waitForTimeout(500); await shot(page, 'c12-xray-sent-snackbar')
    await page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name: 'Add a follow-up' }).click()
    await page.getByRole('dialog', { name: 'Set a follow-up' }).waitFor()
    ok('C12 …which opens Set a follow-up for the lead', true)
    await shot(page, 'c12-xray-follow-up')
    await page.keyboard.press('Escape')
  })

  /* ── Q9: the quote editor's Send ▾ › Send for signature opens the same picker, ready to use ── */
  await step('Q9 send for signature', async () => {
    const Q = sql(`select id from quotes where number = 'OM-10007'`)
    await page.goto(`${BASE}/quotes/${Q}`); await ready(page)
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await page.getByRole('menuitem', { name: /Send for signature/ }).click()
    await page.getByTestId('contract-template-option').first().waitFor(); await page.waitForTimeout(400)
    ok('Q9 Send for signature opens the picker with a template picked and Use template live', (await page.locator('[data-testid="contract-template-option"][aria-checked="true"]').count()) === 1 && !(await page.getByRole('button', { name: 'Use template' }).isDisabled()))
    await shot(page, 'q9-send-for-signature-picker')
    await page.keyboard.press('Escape')
  })

  /* ── Ghosts: the editor's ghost draws the meta row's quote field at its new width ── */
  await step('ghost', async () => {
    const opts = { viewport: { width: 1440, height: 1024 } }
    const cb = await browser.newContext(opts)
    await cb.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
    const g = await cb.newPage(); await g.goto(`${BASE}/contracts/${OLIVIA_C}`, { waitUntil: 'load' }); await g.waitForTimeout(1600)
    const gw = await g.evaluate(() => { const s = [...document.querySelectorAll('[class*="mQuote"]')][0]; return s ? Math.round(s.getBoundingClientRect().width) : 0 })
    await shot(g, 'ghost-contract-editor')
    await cb.close()
    await page.goto(`${BASE}/contracts/${OLIVIA_C}`); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    const pw = Math.round((await page.getByTestId('contract-quote').boundingBox()).width)
    ok('ghost: the editor ghost’s quote field matches the page’s (±8px)', Math.abs(gw - pw) <= 8, `ghost ${gw} · page ${pw}`)
  })

  for (const p of popups) await p.close().catch(() => {})
  await browser.close()
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
