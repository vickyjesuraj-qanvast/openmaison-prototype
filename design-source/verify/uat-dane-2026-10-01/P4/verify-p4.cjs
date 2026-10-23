// Dane's UAT fixes 2026-10-01 — package P4: contracts, the signing pages and Quote X-Ray (b-smart · b-creating · g-tickwords · g-banner ·
// g-xray-rows · k-contracttime · g-pencil · 12.10 link row · g-merge-fields). Run against a production build on a scratch copy of the
// demo baseline. It writes (a chip, a link and a field into Olivia Martinez's Draft, three new contracts, the tick words): re-copy the
// scratch DB to re-run.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3035
//   TESTDB=<scratch.db> BASE=http://localhost:3035 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P4/verify-p4.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3035', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const lead = (name) => sql(`select id from leads where name = '${name}'`)
const OLIVIA = lead('Olivia Martinez'), VIVIEN = lead('Vivien Lee')
const OLIVIA_C = sql(`select id from contracts where lead_id = '${OLIVIA}' and deleted_at is null order by created_at limit 1`)
const OLIVIA_Q = sql(`select from_quote_id from contracts where id = '${OLIVIA_C}'`)
const RYAN_C = sql(`select c.id from contracts c join leads l on l.id = c.lead_id where l.name like 'Ryan%' and c.status = 'Signed' limit 1`)
const RYAN_Q = sql(`select q.id from quotes q join leads l on l.id = q.lead_id where l.name like 'Ryan%' and q.status = 'Signed' limit 1`)
const XRAY_VIVIEN = sql(`select id from quote_comparisons where lead_id = '${VIVIEN}' order by created_at desc limit 1`)
const TPL = { contracts: sql(`select id from contract_templates where deleted_at is null order by created_at limit 1`), tasks: sql(`select id from task_templates order by rowid limit 1`), terms: sql(`select id from quote_text_templates where deleted_at is null order by rowid limit 1`), payments: 'default' }
const DEFAULT_WORDS = 'I have read and agree to this document.'
const contracts = () => Number(sql(`select count(*) from contracts`))

/** The paragraph under the heading that starts with `head` (e.g. "2. Contract sum"). */
const paraUnder = (page, head) => page.locator('[data-testid="contract-doc"] h2', { hasText: head }).locator('xpath=following-sibling::p[1]')
/** A real click at the end of a paragraph's last line — the caret lands after its last word. */
async function clickEnd(page, para) {
  await para.scrollIntoViewIfNeeded()
  const r = await para.evaluate((p) => { const range = document.createRange(); range.selectNodeContents(p); const rects = [...range.getClientRects()]; const last = rects[rects.length - 1]; return { x: last.right - 1, y: last.top + last.height / 2 } })
  await page.mouse.click(r.x, r.y)
  await page.waitForTimeout(200)
}
/** The heading a node of the paper sits under: its block's, or — for a piece standing between blocks — the block's before it. */
const headOf = (loc) => loc.evaluate((el) => { let p = el.closest('p, li, h1, h2, h3') ?? el.previousElementSibling; while (p && !/^H[123]$/.test(p.tagName)) p = p.previousElementSibling; return p ? p.textContent.trim() : '' })
/** Whether a node sits inside a paragraph (not lifted out between blocks). */
const inPara = (loc) => loc.evaluate((el) => !!el.closest('p'))

/** Slows the next server action (a POST with Next-Action) so its busy state can be seen; returns a releaser. */
function slowNextAction(ctx, ms = 1600) {
  let armed = true
  const handler = async (route) => {
    const req = route.request()
    if (armed && req.method() === 'POST' && req.headers()['next-action']) { armed = false; await new Promise((r) => setTimeout(r, ms)) }
    await route.continue()
  }
  return ctx.route('**/*', handler).then(() => () => ctx.unroute('**/*', handler))
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }))
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  let FRESH = null   // the contract the lead tab makes (b-creating) — the phone's Send window opens on it

  /* ── b-smart (UAT 8.03) + g-merge-fields (UAT 3.19): Insert a field lands where the caret was; so do a Link and an eSignature field ── */
  await step('b-smart', async () => {
    await page.goto(`${BASE}/contracts/${OLIVIA_C}`); await page.getByTestId('contract-editor').waitFor(); await ready(page)
    const trigger = page.getByRole('button', { name: /^Insert a field/ })
    ok('g-merge-fields the toolbar names the menu “Insert a field”', (await trigger.count()) === 1)
    ok('g-merge-fields nothing on the editor says “Smart Text”', !/Smart Text/i.test(await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[data-placeholder]')].map((e) => e.getAttribute('data-placeholder')).join(' '))))
    const endBefore = sql(`select body from contracts where id = '${OLIVIA_C}'`).slice(-600)   // the Signatures block the old bug wrote after
    await clickEnd(page, paraUnder(page, '2. Contract sum'))
    await trigger.click()
    ok('b-smart the trigger keeps the caret in the paper', await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'contract-doc'))
    ok('g-merge-fields the menu’s line reads “Fields from”', await page.getByText('Fields from', { exact: true }).isVisible())
    await shot(page, 'b-smart-menu-open', { x: 760, y: 60, width: 680, height: 520 })
    await page.getByRole('menuitem', { name: /^Quote/ }).click()
    await page.getByRole('menuitem', { name: /Quote valid until/ }).click()
    await page.waitForTimeout(400)
    const chip = page.locator('[data-testid="contract-doc"] .om-token[data-token="quote.validUntil"]')
    ok('b-smart one Quote valid until chip was inserted', (await chip.count()) === 1)
    ok('b-smart the chip sits in clause 2’s paragraph, where the caret was', (await headOf(chip.first())) === '2. Contract sum' && (await inPara(chip.first())), await headOf(chip.first()))
    ok('b-smart the chip is inert, with no style copied onto it', await chip.first().evaluate((c) => c.getAttribute('contenteditable') === 'false' && !c.hasAttribute('style') && !c.hasAttribute('data-om-inert')))
    await chip.first().scrollIntoViewIfNeeded()
    const cb = await paraUnder(page, '2. Contract sum').boundingBox()
    await shot(page, 'b-smart-chip-in-clause-2', { x: 300, y: Math.max(0, cb.y - 80), width: 900, height: 220 })

    /* a Link on the word picked in clause 3 */
    const p3 = paraUnder(page, '3. Payment')
    await p3.scrollIntoViewIfNeeded()
    const word = await p3.evaluate((p) => { const t = [...p.childNodes].find((n) => n.nodeType === 3 && /schedule/.test(n.textContent)); const i = t.textContent.indexOf('schedule'); const r = document.createRange(); r.setStart(t, i + 2); r.setEnd(t, i + 3); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
    await page.mouse.dblclick(word.x, word.y); await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Link', exact: true }).click()
    await page.getByLabel('Link URL').fill('example.com/schedule')
    await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(400)
    const a = page.locator('[data-testid="contract-doc"] a[href="https://example.com/schedule"]')
    ok('b-smart a Link wraps the word picked in clause 3', (await a.count()) === 1 && (await a.innerText()) === 'schedule' && (await headOf(a)) === '3. Payment', `${await a.count()} · ${await a.innerText().catch(() => '')}`)

    /* an eSignature field at the end of clause 4 */
    const signsBefore = await page.locator('[data-testid="contract-doc"] .om-sign[data-sign="client-signature"]').count()
    await clickEnd(page, paraUnder(page, '4. Programme'))
    await page.getByRole('button', { name: 'eSignatures' }).click()
    const row = page.getByTestId('esign-field').filter({ hasText: 'Client signature' })
    await row.getByRole('button', { name: 'Insert' }).click(); await page.waitForTimeout(400)
    const signs = page.locator('[data-testid="contract-doc"] .om-sign[data-sign="client-signature"]')
    const heads = []; for (let i = 0; i < await signs.count(); i++) heads.push(await headOf(signs.nth(i)))
    /* at a paragraph's end a field takes its own line right under it (Chrome's placement for a box), anywhere else it sits in the text */
    ok('b-smart eSignatures › Insert puts the field at clause 4, where the caret was', (await signs.count()) === signsBefore + 1 && heads.includes('4. Programme'), heads.join(' | '))
    await page.waitForTimeout(1200)   // the autosave
    const body = sql(`select body from contracts where id = '${OLIVIA_C}'`)
    ok('b-smart the paper saved with the chip, the link and the field', body.includes('data-token="quote.validUntil"') && body.includes('https://example.com/schedule') && (body.match(/data-sign="client-signature"/g) || []).length === signsBefore + 1)
    ok('b-smart the document’s end (the Signatures block) is untouched', body.slice(-600) === endBefore)
  })

  /* ── g-tickwords (UAT 8.05): Tick to accept fills the words, a two-line box ── */
  await step('g-tickwords', async () => {
    const sw = page.getByTestId('esign-gates').locator('label').filter({ has: page.getByRole('switch', { name: 'Tick to accept' }) }).first()   // the whole row is a label now, round the DS switch's own (contracts on the move, a deliberate change of this rule — C-13)
    ok('g-tickwords starts off on Olivia’s draft', !(await page.getByRole('switch', { name: 'Tick to accept' }).isChecked()))
    await sw.click(); await page.waitForTimeout(300)
    const box = page.getByTestId('esign-accept-words').locator('textarea')
    ok('g-tickwords switching it on fills the words', (await box.inputValue()) === DEFAULT_WORDS, await box.inputValue())
    const m = await box.evaluate((t) => ({ tag: t.tagName, max: t.maxLength, h: t.getBoundingClientRect().height }))
    ok('g-tickwords the words are a two-line text box, 160 at most', m.tag === 'TEXTAREA' && m.max === 160 && m.h >= 70, JSON.stringify(m))
    await page.getByTestId('esign-gates').scrollIntoViewIfNeeded()
    await shot(page, 'g-tickwords-filled', { x: 1040, y: 0, width: 400, height: 1024 })
    await page.waitForTimeout(1200)
    ok('g-tickwords the words are saved with the switch', sql(`select requires_accept || '¦' || accept_label from contracts where id = '${OLIVIA_C}'`) === `1¦${DEFAULT_WORDS}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── g-pencil (UAT 3.18): the title's pencil at rest, gone while typing, in all five editors; none on a signed contract ── */
  await step('g-pencil', async () => {
    const check = async (label, url) => {
      await page.goto(url); await page.getByTestId('title-field').waitFor(); await ready(page)
      const field = page.getByTestId('title-field')
      const rest = await field.evaluate((f) => { const i = f.querySelector('input'); const p = f.lastElementChild; const s = getComputedStyle(p); const ir = i.getBoundingClientRect(); const pr = p.getBoundingClientRect(); return { shown: s.visibility === 'visible' && s.display !== 'none' && Number(s.opacity) > 0.9, glyph: p.textContent.trim(), gap: Math.round(pr.left - ir.right), w: Math.round(pr.width) } })
      await field.locator('input').focus(); await page.waitForTimeout(250)
      const typing = await field.evaluate((f) => getComputedStyle(f.lastElementChild).visibility)
      ok(`g-pencil ${label}: a pencil at rest after the title, hidden while typing`, rest.shown && rest.glyph === 'edit' && rest.gap >= 0 && rest.gap <= 8 && typing === 'hidden', JSON.stringify({ ...rest, typing }))
      await page.locator('body').click({ position: { x: 5, y: 1000 } }).catch(() => {})
      return rest
    }
    await check('contract', `${BASE}/contracts/${OLIVIA_C}`)
    await shot(page, 'g-pencil-contract', { x: 0, y: 60, width: 900, height: 140 })
    await check('contract template', `${BASE}/templates/contracts/${TPL.contracts}`)
    await check('tasks template', `${BASE}/templates/tasks/${TPL.tasks}`)
    await shot(page, 'g-pencil-tasks-template', { x: 0, y: 60, width: 900, height: 140 })
    await check('T&Cs template', `${BASE}/templates/terms/${TPL.terms}`)
    await check('payments template', `${BASE}/templates/payments/${TPL.payments}`)
    await page.goto(`${BASE}/contracts/${RYAN_C}`); await page.getByTestId('title-field').waitFor(); await ready(page)
    ok('g-pencil a signed contract’s title shows no pencil (it can’t change)', await page.getByTestId('title-field').evaluate((f) => getComputedStyle(f.lastElementChild).display === 'none'))
  })

  /* ── g-merge-fields: the template editor's help and placeholder ── */
  await step('g-merge-fields template', async () => {
    await page.goto(`${BASE}/templates/contracts/${TPL.contracts}`); await page.getByTestId('contract-template-editor').waitFor(); await ready(page)
    ok('g-merge-fields the template editor offers “How fields fill in”', (await page.getByRole('button', { name: 'How fields fill in' }).count()) === 1 && (await page.getByRole('button', { name: /^Insert a field/ }).count()) === 1)
    await page.getByRole('button', { name: 'How fields fill in' }).click()
    ok('g-merge-fields its help says fields', /^Fields fill in from the lead/.test(await page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')))
  })

  /* ── g-banner (UAT 8.11): full width, no corners, a rule under it — the contract's and the quote's ── */
  const bannerFacts = (loc) => loc.evaluate((b) => { const s = getComputedStyle(b); const r = b.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), vw: document.documentElement.clientWidth, radius: s.borderTopLeftRadius, margin: s.margin, shadow: s.boxShadow } })
  const fullBleed = (f) => f.x === 0 && f.w === f.vw && f.radius === '0px' && /^0px/.test(f.margin) && /inset/.test(f.shadow) && /0px -1px 0px|0px -1px/.test(f.shadow)
  await step('g-banner', async () => {
    await page.goto(`${BASE}/contracts/${RYAN_C}`); await page.getByTestId('contract-banner').waitFor(); await ready(page)
    const c = await bannerFacts(page.getByTestId('contract-banner'))
    ok('g-banner a signed contract’s banner is full width, square, ruled under', fullBleed(c), JSON.stringify(c))
    await shot(page, 'g-banner-contract-signed-1440', { x: 0, y: 0, width: 1440, height: 260 })
    await page.goto(`${BASE}/quotes/${RYAN_Q}`); await page.getByTestId('sent-banner').waitFor(); await ready(page)
    const q = await bannerFacts(page.getByTestId('sent-banner'))
    ok('g-banner the quote’s sent banner moves with it', fullBleed(q), JSON.stringify(q))
    await shot(page, 'g-banner-quote-sent-1440', { x: 0, y: 0, width: 1440, height: 260 })
  })

  /* ── g-xray-rows (UAT 7.04): the Status chip wears the legend's colour ── */
  await step('g-xray-rows', async () => {
    await page.goto(`${BASE}/quote-x-ray/${XRAY_VIVIEN}`); await page.getByTestId('xray-items').waitFor(); await ready(page)
    const colours = await page.evaluate(() => [...document.querySelectorAll('[data-testid="xray-row"]')].map((r) => [r.getAttribute('data-status'), r.querySelector('[data-col="status"] [data-color]')?.getAttribute('data-color') ?? 'default', r.querySelector('[data-col="status"]')?.textContent.trim()]))
    const want = { 'yours-only': 'green', 'theirs-only': 'red', matched: 'default', unpriced: 'default' }
    const kinds = [...new Set(colours.map((c) => c[0]))]
    ok('g-xray-rows every row’s Status chip wears its status colour', colours.length > 0 && colours.every(([s, c, t]) => (t === 'Paired by you' ? c === 'default' : c === want[s])), kinds.join(' · '))
    ok('g-xray-rows the reading has a coloured side to show', colours.some(([, c]) => c !== 'default'))
    ok('g-xray-rows the left status bar stays', await page.evaluate(() => { const r = document.querySelector('[data-testid="xray-row"][data-status="yours-only"], [data-testid="xray-row"][data-status="theirs-only"]'); return !!r && getComputedStyle(r, '::before').width === '3px' }))
    const box = await page.getByTestId('xray-items').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: Math.min(r.height, 1500) } })
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(OUT, 'g-xray-status-chips.png'), fullPage: true, clip: box })
  })

  /* ── k-contracttime (UAT 8.23): a date's time on hover, on the lead's tab and Tools › Contracts ── */
  await step('k-contracttime', async () => {
    const hoverTip = async () => {
      const d = page.getByTestId('contract-date').first()
      await d.hover(); await page.waitForTimeout(800)
      return { cell: await d.innerText(), tip: await page.locator('[role="tooltip"]').innerText().catch(() => '') }
    }
    await page.goto(`${BASE}/leads/${OLIVIA}/contracts`); await page.getByTestId('contract-date').first().waitFor(); await ready(page)
    const a = await hoverTip()
    ok('k-contracttime the tab keeps the date and says its time on hover', !/:/.test(a.cell) && a.tip.startsWith(a.cell) && /, \d{1,2}:\d{2} (AM|PM)$/.test(a.tip), JSON.stringify(a))
    await shot(page, 'k-contracttime-tab-tooltip', { x: 300, y: 150, width: 1140, height: 340 })
    await page.goto(`${BASE}/contracts`); await page.getByTestId('contract-date').first().waitFor(); await ready(page)
    const b = await hoverTip()
    ok('k-contracttime Tools › Contracts too', !/:/.test(b.cell) && b.tip.startsWith(b.cell) && /, \d{1,2}:\d{2} (AM|PM)$/.test(b.tip), JSON.stringify(b))
  })

  /* ── b-creating (UAT 8.02): "Creating…" until the contract exists, then the editor — the lead tab, a quote, Tools › Contracts ── */
  await step('b-creating', async () => {
    const watch = async (label, button, shotName) => {
      const before = contracts()
      const release = await slowNextAction(ctx)
      await button.click()
      await page.waitForTimeout(400)
      const state = { text: (await button.innerText().catch(() => '')).trim(), disabled: await button.isDisabled().catch(() => null), open: await button.isVisible().catch(() => false) }
      if (shotName) await shot(page, shotName)
      await page.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 }); await page.getByTestId('contract-editor').waitFor()
      await release()
      ok(`b-creating ${label}: the press reads “Creating…” and waits, then the editor opens`, state.text === 'Creating…' && state.disabled === true && state.open && contracts() === before + 1, JSON.stringify(state))
    }
    await page.goto(`${BASE}/leads/${OLIVIA}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'New Contract' }).first().click()
    await page.getByRole('menuitem', { name: 'From Template' }).click()
    await page.getByTestId('contract-template-option').first().waitFor()
    await watch('the lead’s Contracts tab', page.getByTestId('contract-template-use'), 'b-creating-lead-tab')
    FRESH = (page.url().match(/\/contracts\/([0-9a-f-]{36})/) || [])[1]

    await page.goto(`${BASE}/quotes/${OLIVIA_Q}`); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    await page.getByRole('button', { name: 'More options' }).first().click()
    await page.getByRole('menuitem', { name: 'Create contract from this quote' }).click()
    await page.getByTestId('contract-template-option').first().waitFor()
    await watch('a quote', page.getByTestId('contract-template-use'), 'b-creating-from-quote')

    await page.goto(`${BASE}/contracts`); await ready(page)
    await page.getByRole('button', { name: 'New Contract' }).first().click()
    await page.getByRole('menuitem', { name: 'From Template' }).click()
    await page.getByTestId('contract-template-option').first().waitFor()
    await page.getByTestId('contract-template-use').click()
    const ask = page.getByRole('dialog', { name: 'Which lead is this contract for?' })
    await ask.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Olivia Martinez' }).click()
    await watch('Tools › Contracts', page.getByTestId('pick-lead-confirm'), 'b-creating-tools')

    /* UAT 8.22: with no caret ever placed in the paper (straight from Use template), an inserted field still ends the document */
    await ready(page)
    await page.getByRole('button', { name: 'eSignatures' }).click()
    await page.getByTestId('esign-field').filter({ hasText: 'Client initial' }).getByRole('button', { name: 'Insert' }).click(); await page.waitForTimeout(400)
    ok('8.22 no caret yet: the inserted field ends the document, as before', await page.evaluate(() => { const d = document.querySelector('[data-testid="contract-doc"]'); const last = [...d.querySelectorAll('.om-sign')].pop(); return !!last && last.getAttribute('data-sign') === 'client-initial' && !d.lastElementChild.nextSibling?.textContent?.trim() && (d.lastElementChild === last || d.lastElementChild.contains(last)) }))
  })

  /* ── 12.10 (phone): the Send window's link wraps and selects whole ── */
  await step('12.10 link row', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await phone.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }))
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    /* Olivia's Draft names a Draft quote, which holds Send back (UX audit C2): the fresh contract, its quote unnamed, opens the window */
    sql(`update contracts set from_quote_id = null where id = '${FRESH}'`)
    await p.goto(`${BASE}/contracts/${FRESH}`); await p.getByTestId('contract-editor').waitFor(); await ready(p)
    const send = p.getByRole('button', { name: 'Send', exact: true })
    await send.first().click(); await p.waitForTimeout(600)
    /* (quotes on the move, a deliberate change of this rule — REG-K5.7, B-17) a phone's Send window has NO link row: the sheet fits without
       it, and Copy link in the foot is how a phone shares the link. The row — wrapped, select-all on a press (12.10) — stays on wider screens;
       it is still in the DOM, hidden, so visibility is what is tested. */
    const dlg = p.locator('[role="dialog"]').first(); await dlg.waitFor()
    const copy = dlg.getByRole('button', { name: /Copy link|Copied/ }); await copy.waitFor()
    const linkRowShown = await dlg.locator('code').first().isVisible().catch(() => false)
    const copyInFoot = await copy.isVisible() && !!(await copy.evaluate((b) => b.closest('[data-surface-foot]')))
    ok('12.10 (quotes on the move, a deliberate change of this rule) on a phone the Send window has no link row — Copy link in the foot shares it', !linkRowShown && copyInFoot, JSON.stringify({ linkRowShown, copyInFoot }))
    await p.screenshot({ path: path.join(OUT, '1210-phone-send-link.png') })
    /* the banners at 390 */
    /* (contracts on the move, a deliberate change of this rule — C1's P-01, met by C4's landing run) a phone opens the Contract screen: the signed
       banner's words are its Next line, a card on the 16 gutter, as the quote's */
    await p.goto(`${BASE}/contracts/${RYAN_C}`); await p.getByTestId('contract-next').waitFor(); await ready(p)
    const cn = await p.getByTestId('contract-next').boundingBox()
    ok('g-banner 390: the signed contract’s words are the Contract screen’s Next line', !!cn && Math.round(cn.x) === 16 && Math.round(cn.x + cn.width) === 390 - 16 && /signed/i.test(await p.getByTestId('contract-next').innerText()), JSON.stringify(cn))
    await p.getByTestId('contract-next').scrollIntoViewIfNeeded()
    await p.screenshot({ path: path.join(OUT, 'g-banner-contract-signed-390.png') })
    /* (quotes on the move, a deliberate change of this rule) a phone opens the Quote screen: the sent banner's words are its Next line, a card on the 16 gutter */
    await p.goto(`${BASE}/quotes/${RYAN_Q}`); await p.getByTestId('quote-next').waitFor(); await ready(p)
    const qn = await p.getByTestId('quote-next').boundingBox()
    ok('g-banner 390: the quote’s sent words are the Quote screen’s Next line', !!qn && Math.round(qn.x) === 16 && Math.round(qn.x + qn.width) === 390 - 16 && /signed/i.test(await p.getByTestId('quote-next').innerText()), JSON.stringify(qn))
    await p.getByTestId('quote-next').scrollIntoViewIfNeeded()
    await p.screenshot({ path: path.join(OUT, 'g-banner-quote-sent-390.png') })
    await phone.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} PASS`)
  process.exit(failed ? 1 : 0)
})()
