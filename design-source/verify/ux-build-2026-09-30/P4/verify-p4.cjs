// UX-audit build, package P4 — Quotes (2026-09-30): S1 the bank block prints nothing outside the editor + Preview's readiness line ·
// Q1 Move to Quote Sent after a send and on the sent banner · Q2 Preview's Send ▾ with "Sent it another way" · Q3 the status menu (approval
// told, the client's statuses ask first, Undo, the approval rule) · Q4 "Waiting for my approval" + the rail's Tools count · Q5 Sent to client,
// Valid until (sort, filter), the to-do chips · Q6 the phone's reading cards, View as printed, Ask for a change · Q7 Price book picks in their
// trade's section + one name · Q8 "Starts with" on the tiles · Q10 the client's request, the tinted changes, "revised quote (version 2)" ·
// Q11 Follow up in ▾ · Q12 From Scratch · C6 the row's Create contract · the ghosts (loader vs page columns).
// Against a production build on a scratch DB (never local.db). Usage:
//   DB=<scratch>/run.db BASE=http://localhost:3024 NODE_PATH=$PWD/node_modules node verify-p4.cjs     (re-copy the DB to re-run: it writes records)
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.DB, BASE = process.env.BASE || 'http://localhost:3024'
const SHOTS = process.env.SHOTS || __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const asMember = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, String(e.message).split('\n').slice(0, 3).join(' | ')) } finally { asMember('dane') } }
async function ready(page, ms = 900) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const snackAction = (page, name) => page.locator('[role="status"][aria-live="polite"]').getByRole('button', { name })
const shot = (page, n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`) })
const id = (number) => sql(`select id from quotes where number='${number}'`)
const Q1 = id('OM-10001'), Q5 = id('OM-10005'), Q6 = id('OM-10006'), Q7 = id('OM-10007')
const LEAD1 = sql(`select lead_id from quotes where id='${Q1}'`), LEAD6 = sql(`select lead_id from quotes where id='${Q6}'`), LEAD7 = sql(`select lead_id from quotes where id='${Q7}'`)
const NOQUOTE = sql(`select l.id from leads l where l.deleted_at is null and not exists (select 1 from quotes q where q.lead_id=l.id) order by l.name limit 1`)
const DEFAULT_TPL = sql(`select id from quote_templates where is_default=1 limit 1`)
const toDraft = (q) => sql(`update quotes set status='Draft', sent_at=null, client_sent_at=null, submitted_at=null, submitted_by=null, approved_at=null, approved_by=null, visibility='Private' where id='${q}'`)
const stubOpen = (ctx) => ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
const row = (page, q) => page.locator(`[data-kb-id="${q}"]`).first()

;(async () => {
  const browser = await chromium.launch()
  const desk = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); await stubOpen(ctx); const p = await ctx.newPage(); p.setDefaultTimeout(12000); return { ctx, page: p } }

  /* ── S1: the Bank details block — nothing printed for the client without bank details; Preview names it with the way to Profile ── */
  await step('S1', async () => {
    /* (REG-969, Projects round 4a demo R71) the demo's studio entity now carries its bank (DBS) and PayNow: empty them on the scratch DB so
       the entity has no bank details to print, as this check needs */
    sql(`update settings set value = json_set(value, '$.details.entities[0].bankName', '', '$.details.entities[0].accountName', '', '$.details.entities[0].accountNo', '', '$.details.entities[0].payNow', '', '$.details.entities[0].swift', '', '$.details.entities[0].payNowQr', json('null')) where key = 'brand'`)
    sql(`update quote_templates set design_json = json_insert(design_json, '$.blocks[#]', json('{"id":"probe-bank","kind":"bank","title":"Payment details","titleStyle":{"role":"body","weight":700},"style":{"role":"body"},"layout":"row","qr":true,"qrWidth":22,"box":"tint"}')) where id='${DEFAULT_TPL}'`)
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes/${Q1}/preview`); await ready(page, 1500)
    const doc = await page.locator('[data-page]').allInnerTexts()
    ok('S1 the printed page carries no "No bank details" to-do', !doc.join(' ').includes('No bank details'))
    const line = page.getByText(/^No bank details for /).first()
    ok('S1 Preview’s readiness names the entity with no bank details', await line.isVisible(), await line.innerText().catch(() => ''))
    await shot(page, 's1-preview-readiness')
    await line.locator('xpath=ancestor::li').getByRole('button', { name: 'Open' }).click(); await page.waitForURL(/\/company\/profile/)
    ok('S1 its Open goes to Company › Profile with the way back', /\/company\/profile\?from=/.test(page.url()), page.url().replace(BASE, ''))
    await page.goto(`${BASE}/confirm/${Q7}`); await ready(page, 1500)
    ok('S1 the client’s confirmation page prints no bank to-do either', !(await page.locator('body').innerText()).includes('No bank details'))
    await ctx.close()
  })

  /* ── Q2 + Q1: Preview's Send ▾ — "Sent it another way" marks it, offers the lead's next stage; the sent banner offers it too ── */
  await step('Q2', async () => {
    toDraft(Q1)
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes/${Q1}/preview`); await ready(page, 1200)
    ok('Q2 Preview has no "Mark as sent" button', await page.getByRole('button', { name: 'Mark as sent' }).count() === 0)
    await page.getByTestId('quote-send').click(); await page.waitForTimeout(300)
    const rows = await page.getByRole('menuitem').allInnerTexts()
    ok('Q2 Preview’s Send ▾ is the editor’s menu, ending with "Sent it another way"', /Ask to confirm/.test(rows.join('|')) && /Send to sign/.test(rows.join('|')) && /Mark as sent/.test(rows.join('|')), rows.map((r) => r.split('\n')[0]).join(' · '))
    await shot(page, 'q2-preview-send-menu')
    await page.getByRole('menuitem', { name: /^Mark as sent/ }).click(); await page.waitForTimeout(500)   // (the calm UI build 2026-10-27, a deliberate change) W-362 · 4-22: Mark as sent asks first, then the mark keeps Undo; the lead's next stage is the sent banner's
    ok('Q2 "Mark as sent" asks first and nothing moves before the answer', await page.getByRole('dialog', { name: /as sent\?$/ }).isVisible() && sql(`select status from quotes where id='${Q1}'`) === 'Draft')
    await page.getByRole('dialog', { name: /as sent\?$/ }).getByRole('button', { name: 'Mark as sent' }).click(); await page.waitForTimeout(1500)
    const s = await snack(page)
    ok('Q2 "Sent it another way" marks it Sent to Client', sql(`select status from quotes where id='${Q1}'`) === 'Sent to Client' && /marked “With client”/.test(s), s.split('\n')[0])
    ok('Q1 the snackbar keeps Undo — the move to Quote Sent is the sent banner\'s', await snackAction(page, 'Undo').count() === 1)
    await shot(page, 'q1-snackbar-undo')
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page, 1200)
    const move = page.getByTestId('move-to-quote-sent')
    ok('Q1 the sent banner carries "Move to Quote Sent"', await move.isVisible())
    await shot(page, 'q1-sent-banner-move')
    await move.click(); await page.waitForURL(/move=quote-sent/)
    ok('Q1 the banner’s button goes to the same step', page.url().includes(`move=quote-sent&quote=${Q1}`))
    toDraft(Q1)
    await ctx.close()
  })

  /* ── Q3: the row's status menu ── */
  await step('Q3', async () => {
    toDraft(Q1)
    sql(`delete from notifications where quote_id='${Q1}'`)
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes`); await ready(page, 1200)
    const pickStatus = async (from, to) => { await row(page, Q1).getByRole('button', { name: `Status ${from} — change status` }).click(); await page.waitForTimeout(300); await page.getByRole('menuitem', { name: new RegExp(`^${to}`) }).click(); await page.waitForTimeout(1500) }
    await pickStatus('Draft', 'Waiting for approval')   // (the calm UI build 2026-10-27, a deliberate change) the status set on screen (4-04)
    let s = await snack(page)
    ok('Q3 Sent for Approval is the real submission (stamped, approvers told)', sql(`select status || '|' || coalesce(submitted_by,'') from quotes where id='${Q1}'`) === 'Sent for Approval|dane' && Number(sql(`select count(*) from notifications where quote_id='${Q1}' and kind='quote_approval'`)) >= 1 && /sent for approval — .*told/.test(s), s.split('\n')[0])
    await snackAction(page, 'Undo').click(); await page.waitForTimeout(1500)
    ok('Q3 its Undo puts it back to Draft and takes the bell lines back', sql(`select status from quotes where id='${Q1}'`) === 'Draft' && sql(`select count(*) from notifications where quote_id='${Q1}' and kind='quote_approval'`) === '0')
    await pickStatus('Draft', 'With client')
    const dlg = page.getByRole('dialog', { name: 'Mark OM-10001 “With client”?' })   // (the calm UI build 2026-10-27, a deliberate change)
    ok('Q3 Sent to Client asks first — "Nothing reaches the client"', await dlg.isVisible() && /Nothing reaches the client/.test(await dlg.innerText()))
    ok('Q3 … and nothing changed before the answer', sql(`select status from quotes where id='${Q1}'`) === 'Draft')
    await shot(page, 'q3-mark-confirm')
    await dlg.getByRole('button', { name: 'Mark “With client”' }).click(); await page.waitForTimeout(1500)
    s = await snack(page)
    ok('Q3 the mark lands with Undo', sql(`select status from quotes where id='${Q1}'`) === 'Sent to Client' && /marked “With client”/.test(s) && await snackAction(page, 'Undo').count() === 1, s.split('\n')[0])
    await snackAction(page, 'Undo').click(); await page.waitForTimeout(1500)
    ok('Q3 Undo restores the status and its stamps', sql(`select status || '|' || coalesce(client_sent_at,'-') || '|' || visibility from quotes where id='${Q1}'`) === 'Draft|-|Private')
    await ctx.close()
    /* a Designer can't mark past approval before an approver's OK */
    sql(`update quotes set status='Draft' where id='${Q6}'`)
    asMember('sarah')
    const d = await desk()
    await d.page.goto(`${BASE}/quotes`); await ready(d.page, 1200)
    await row(d.page, Q6).getByRole('button', { name: 'Status Draft — change status' }).click(); await d.page.waitForTimeout(300)
    const item = d.page.getByRole('menuitem', { name: /^With client/ })   // (the calm UI build 2026-10-27, a deliberate change)
    ok('Q3 for a Designer, Sent to Client waits for approval (greyed, says why)', await item.getAttribute('aria-disabled') === 'true' && /needs approval/.test(await item.innerText()), (await item.innerText()).replace(/\n/g, ' '))
    await shot(d.page, 'q3-designer-needs-approval')
    await d.ctx.close()
    sql(`update quotes set status='Approved' where id='${Q6}'`)
  })

  /* ── Q4: waiting for my approval — the chip, the rail's Tools count; a Designer sees neither ── */
  await step('Q4', async () => {
    sql(`update quotes set status='Sent for Approval', submitted_by='sarah', submitted_at=strftime('%s','now') where id='${Q1}'`)
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes`); await ready(page, 1200)
    const chip = page.getByRole('button', { name: '1 approval', exact: true })   // (the calm UI build 2026-10-27, a deliberate change) T-01: Approvals
    ok('Q4 Tools › Quotes shows "Waiting for my approval · 1"', await chip.isVisible())
    const tools = page.locator('button[aria-label^="Tools"]').first()
    /* (Vicky 2026-10-29: brought back) the rail's Tools counts it again — a red dot on the glyph, no number (his "just show the red dot instead of numbers"); the number is
       its name. The quote is also a row of the Dashboard's Needs your attention (below) */
    ok('Q4 the rail’s Tools item counts it — a red dot, the number in its name', /1 quote is waiting for your approval/.test(await tools.getAttribute('aria-label') || '') && await tools.locator('[class*="__badgeDot"][data-badge="dot"]').count() === 1 && (await tools.locator('[class*="__badge"]').innerText()).trim() === '', await tools.getAttribute('aria-label'))   // (Vicky 2026-10-29: brought back)
    await chip.click(); await page.waitForTimeout(500)
    ok('Q4 the chip narrows the list to it', await page.locator('[data-kb-row]').count() === 1 && await row(page, Q1).count() === 1)
    await shot(page, 'q4-waiting-for-approval')
    await tools.click(); await page.waitForTimeout(400)
    ok('Q4 the Tools panel’s Quotes tile carries the count', /1 waiting for your approval/.test(await page.getByRole('menuitem', { name: /^Quotes/ }).getAttribute('aria-label') || ''))
    await shot(page, 'q4-tools-panel-count')
    await page.keyboard.press('Escape')
    /* (the calm UI build 2026-10-27) 1-03: the quote is a row of the Dashboard too, with Approve */
    await page.goto(`${BASE}/dashboard`); await ready(page, 1500)
    const dashRow = () => page.locator(`[data-inbox-row="quote-approve:${Q1}"]`).first()
    if (await dashRow().count() === 0 && await page.getByTestId('needs-more').count()) { await page.getByTestId('needs-more').first().click(); await page.waitForTimeout(900) }
    const dashWords = await dashRow().count() ? (await dashRow().innerText()).replace(/\s+/g, ' ') : ''
    ok('Q4 the Dashboard’s Needs your attention counts it: “OM-10001 is waiting for your approval”, with Approve', /OM-10001 is waiting for your approval/.test(dashWords) && /Approve/.test(dashWords), dashWords.slice(0, 120))
    await shot(page, 'q4-dashboard-approval')
    await page.keyboard.press('Escape')
    await page.goto(`${BASE}/leads/${LEAD1}/quotes`); await ready(page, 1200)
    ok('Q4 the lead’s Quotes tab has the chip too', await page.getByRole('button', { name: '1 approval', exact: true }).isVisible())
    await ctx.close()
    asMember('sarah')
    const d = await desk()
    await d.page.goto(`${BASE}/quotes`); await ready(d.page, 1200)
    ok('Q4 a Designer sees no approval chip and no Tools count', await d.page.getByRole('button', { name: /^\d+ approvals?$/ }).count() === 0 && (await d.page.locator('button[aria-label^="Tools"]').first().getAttribute('aria-label')) === 'Tools')
    await d.ctx.close()
    toDraft(Q1)
  })

  /* ── Q5: Sent to client · Valid until (sort, filter) · Waiting on client · Expiring this week ── */
  await step('Q5', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes`); await ready(page, 1200)
    const heads = (await page.getByRole('columnheader').allInnerTexts()).map((t) => t.replace(/unfold_more|arrow_upward/g, '').trim().toLowerCase())
    ok('Q5 the columns read "Sent to client" and "Valid until"', heads.includes('sent to client') && heads.includes('valid until'), heads.filter(Boolean).join(' · '))
    const sentCell = await row(page, Q6).locator('[data-col="sent"]').innerText()
    ok('Q5 Sent to client reads the day it went to the client (the Quote Sent step for an approved quote)', sentCell.trim() !== '-', sentCell)
    const waiting = page.getByRole('button', { name: /^With client · \d+$/ })   // (the calm UI build 2026-10-27, a deliberate change) W-428
    const n = Number((await waiting.innerText()).replace(/\D+/g, ''))
    await waiting.click(); await page.waitForTimeout(500)
    ok('Q5 "Waiting on client" narrows to what the client holds', n >= 3 && await page.locator('[data-kb-row]').count() === n, `${n}`)
    await waiting.click(); await page.waitForTimeout(400)
    await page.getByRole('columnheader', { name: /Valid until/i }).getByRole('button').click(); await page.waitForTimeout(500)
    const first = await page.locator('[data-kb-row]').first().getAttribute('data-kb-id')
    const earliest = sql(`select id from quotes where deleted_at is null and archived_at is null and valid_until is not null order by valid_until asc limit 1`)
    ok('Q5 the Valid until head sorts soonest first', first === earliest)
    await shot(page, 'q5-columns-sorted')
    await page.getByRole('button', { name: /^Filters/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('tab', { name: 'Valid until' }).click(); await page.getByRole('radio', { name: 'Passed' }).check({ force: true }); await page.waitForTimeout(500)
    await shot(page, 'q5-filter-valid-until')
    await page.getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(400)
    const passed = Number(sql(`select count(*) from quotes where deleted_at is null and archived_at is null and kind = 'quote' and valid_until < strftime('%s', date('now','localtime'), 'utc')`))   /* (fix-G, G-10) every quote list holds quotes, not variation orders */
    ok('Q5 Filters › Valid until › Passed', await page.locator('[data-kb-row]').count() === passed, `${passed}`)
    sql(`update quotes set valid_until = strftime('%s','now','+2 days') where id='${Q6}'`)
    await page.goto(`${BASE}/quotes`); await ready(page, 1200)
    ok('Q5 "Expiring this week · 1" shows while one ends this week', await page.getByRole('button', { name: 'Expiring this week · 1' }).isVisible())
    await shot(page, 'q5-expiring-chip')
    sql(`update quotes set valid_until = strftime('%s','2026-09-09') where id='${Q6}'`)
    await ctx.close()
    /* a phone: the chips take their own line; nothing runs sideways */
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const ph = await pctx.newPage()
    await ph.goto(`${BASE}/quotes`); await ready(ph, 1500)
    ok('Q5 at 390 the chips wrap on their own line, no sideways page', await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await ph.getByTestId('quote-todos').isVisible())
    await shot(ph, 'q5-phone-todos')
    await pctx.close()
  })

  /* ── Q6: the confirmation page on a phone ── */
  await step('Q6', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await stubOpen(ctx)
    const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/confirm/${Q7}`); await ready(page, 1800)
    const cards = await page.getByTestId('reading-card').count()
    ok('Q6 at 390 the lines read as cards', cards >= 10 && await page.locator('[data-page]').count() === 0, `${cards} cards`)
    await page.getByTestId('reading-cards').scrollIntoViewIfNeeded(); await shot(page, 'q6-phone-cards')
    await page.getByTestId('view-as-printed').click(); await page.waitForTimeout(1500)
    /* (quotes on the move, a deliberate change of this rule) "View as printed" opens the A4 in a viewer over the cards — the cards stay behind it (K4, P-12 · A-17) */
    ok('Q6 "View as printed" shows the A4', await page.getByTestId('paper-viewer').locator('[data-page="1"]').isVisible())
    await page.getByTestId('paper-viewer-back').click(); await page.waitForTimeout(400)
    await page.evaluate(() => scrollTo(0, 0))
    /* (quotes on the move, a deliberate change of this rule) on a phone the ask sits in the sticky bar (K4, P-12 · A-14) */
    await page.getByTestId('ask-change-bar').click(); await page.waitForTimeout(400)
    const dlg = page.getByRole('dialog', { name: 'Ask for a change' })
    await dlg.getByLabel(/What would you like changed/).fill('Could the vanity be a floating one?')
    await shot(page, 'q6-ask-dialog')
    await dlg.getByTestId('ask-send').click(); await page.waitForTimeout(1500)
    const opened = await page.evaluate(() => window.__opened)
    ok('Q6 Ask for a change opens WhatsApp to the designer with the quote number', opened.length === 1 && /wa\.me\/\d+\?text=.*OM-10007/.test(decodeURIComponent(opened[0])), decodeURIComponent(opened[0] || '').slice(0, 90))
    ok('Q6 … and tells the studio (the bell)', Number(sql(`select count(*) from notifications where quote_id='${Q7}' and kind='quote_change_asked' and body like '%floating%'`)) >= 1 && /has your request/.test(await snack(page)))
    await shot(page, 'q6-asked')
    await ctx.close()
    const { ctx: c2, page: p2 } = await desk()
    await p2.goto(`${BASE}/confirm/${Q7}`); await ready(p2, 1500)
    ok('Q6 above 767 the page still shows the print, with Ask for a change', await p2.locator('[data-page="1"]').isVisible() && await p2.getByTestId('reading-cards').isHidden() && await p2.getByTestId('ask-change').isVisible())
    await shot(p2, 'q6-desktop')
    await c2.close()
  })

  /* ── Q7: a price book pick lands in its trade's section; one name for the book ── */
  await step('Q7', async () => {
    const G = sql(`select id from quote_items where quote_id='${Q1}' and kind='group' and name='Bedrooms'`)
    sql(`update quote_items set name='Carpentry Works' where id='${G}'`)
    const PB = sql(`select id from price_book_items where category='Carpentry' and deleted_at is null limit 1`)
    const folded = sql(`select collapsed from quote_items where id='${G}'`)
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes/${Q1}`); await ready(page, 1500)
    ok('Q7 the Create strip names it Price book — Maison AI · Price book · Templates (1260:31160); Create ▾ › From Price book too (below)', await page.locator('aside[aria-label="Create"]').getByRole('button', { name: 'Price book' }).count() >= 1 && await page.locator('aside[aria-label="Create"]').getByRole('button', { name: 'Maison AI' }).count() >= 1 && await page.locator('aside[aria-label="Create"]').getByRole('button', { name: 'Templates' }).count() >= 1)   // (Vicky 2026-10-29: brought back) the strip's Maison AI and Price book tiles
    await page.locator('#section-items').getByRole('button', { name: 'Create', exact: true }).click(); await page.waitForTimeout(300)
    ok('Q7 Create ▾ says "From Price book"', await page.getByRole('menuitem', { name: 'From Price book' }).isVisible())
    await page.getByRole('menuitem', { name: 'From Price book' }).click(); await page.waitForTimeout(800)
    const dlg = page.getByRole('dialog', { name: 'Price book' })
    ok('Q7 … and opens the Price book modal', await dlg.isVisible())
    const name = sql(`select name from price_book_items where id='${PB}'`)
    await dlg.getByRole('searchbox', { name: 'Search items' }).fill('Kitchen carpentry'); await page.waitForTimeout(400)   // (REG-664) the book keeps folders: search finds it wherever it is filed   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    await dlg.getByRole('checkbox', { name: `Add ${name}` }).check({ force: true }); await page.waitForTimeout(200)
    await dlg.getByRole('button', { name: /^Add 1 item$/ }).click(); await page.waitForTimeout(2200)
    const s = await snack(page)
    ok('Q7 the pick lands at the end of its trade’s section', sql(`select count(*) from quote_items where quote_id='${Q1}' and price_book_item_id='${PB}' and parent_id='${G}'`) === '1' && /into Carpentry Works/.test(s), s.split('\n')[0])
    ok('Q7 a folded section that took the pick opens', folded === '0' || sql(`select collapsed from quote_items where id='${G}'`) === '0', `was ${folded}`)
    await page.locator(`[data-item-id="${G}"]`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(300)
    await shot(page, 'q7-placed-in-section')
    await snackAction(page, 'Undo').click(); await page.waitForTimeout(2200)
    ok('Q7 one Undo takes it back out', sql(`select count(*) from quote_items where quote_id='${Q1}' and price_book_item_id='${PB}'`) === '0')
    sql(`update quote_items set name='Bedrooms' where id='${G}'`)
    await ctx.close()
  })

  /* ── Q8 + Q12: the Create Quote tiles say what the quote starts with; From Scratch makes the blank quote at once ── */
  await step('Q8', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/leads/${LEAD1}/quotes`); await ready(page, 1200)
    await page.getByRole('button', { name: 'New quote' }).first().click(); await page.waitForTimeout(800)   // (the calm UI build 2026-10-27, a deliberate change) W-011
    const starts = await page.getByTestId('template-starts').allInnerTexts()
    ok('Q8 each template tile says what the new quote starts with', starts.length >= 1 && starts.every((t) => /^(\d+ sections?|An empty list) · /.test(t)), starts.join(' | ').slice(0, 120))   // (the calm UI build 2026-10-27, a deliberate change) 4-32: what tells the tiles apart — the sections' count and the split
    const tile = page.locator('[data-starts]').first()
    const kb = await tile.getByRole('button', { name: /^More options for/ }).boundingBox(), nm = await tile.locator('[class*="nameRow"]').boundingBox()
    ok('Q8 the tile’s kebab stays on the name row', !!kb && !!nm && Math.abs((kb.y + kb.height / 2) - (nm.y + nm.height / 2)) <= 6)
    await shot(page, 'q8-create-quote-tiles')
    await ctx.close()
  })
  await step('Q12', async () => {
    const before = Number(sql(`select count(*) from quotes where lead_id='${NOQUOTE}'`))
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/leads/${NOQUOTE}/quotes`); await ready(page, 1200)
    await page.getByRole('button', { name: 'From Scratch' }).click()
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 15000 })
    ok('Q12 From Scratch makes a blank quote and opens it — no modal', Number(sql(`select count(*) from quotes where lead_id='${NOQUOTE}'`)) === before + 1 && await page.getByTestId('create-quote').count() === 0)
    await ctx.close()
  })

  /* ── Q10 + Q11: Revise asks the client's request; changed lines tinted; the resend says "revised"; Follow up in ▾ sets Due ── */
  await step('Q10', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes/${Q7}`); await ready(page, 1500)
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /^Revise — new version/ }).click(); await page.waitForTimeout(400)
    const dlg = page.getByRole('dialog', { name: 'Start version 2?' })
    await dlg.getByLabel(/Client’s request/).fill('Swap the vanity for a floating one')
    await shot(page, 'q10-revise-dialog')
    await dlg.getByTestId('revise-confirm').click(); await page.waitForTimeout(2500)
    ok('Q10 the client’s request is kept with the version it answers', sql(`select note from quote_versions where quote_id='${Q7}' and version=1`) === 'Swap the vanity for a floating one')
    const ITEM = sql(`select id from quote_items where quote_id='${Q7}' and kind='item' order by position limit 1`)
    sql(`update quote_items set qty = qty + 1 where id='${ITEM}'`)
    await page.goto(`${BASE}/quotes/${Q7}`); await ready(page, 1800)
    const changed = page.locator(`[data-item-id="${ITEM}"][data-change="changed"]`).first()
    ok('Q10 a line changed since version 1 is tinted and tagged', await changed.count() === 1 && /Changed since v1/i.test(await changed.innerText()))
    await changed.scrollIntoViewIfNeeded(); await shot(page, 'q10-changed-row')
    await page.getByRole('button', { name: 'More options', exact: true }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Version History' }).click(); await page.waitForTimeout(600)
    ok('Q10 Version History prints the client’s request', /Client’s request: Swap the vanity/.test(await page.getByTestId('version-request').innerText().catch(() => '')))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.getByTestId('quote-send').click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: /^Ask to confirm/ }).click(); await page.waitForTimeout(600)   // (the calm UI build 2026-10-27, a deliberate change) W-358
    const send = page.getByRole('dialog', { name: 'Send for confirmation' })
    const msg = await send.getByLabel('Message to the client').inputValue()
    ok('Q10 the resend’s message says "revised quote … (version 2)"', /the revised quote OM-10007 \(version 2\)/.test(msg), msg.slice(0, 70))
    /* Q11 */
    const chip = send.getByTestId('follow-up-chip')
    ok('Q11 the send dialog carries "Follow up in 3 days ▾"', /Follow up in 3 days/.test(await chip.innerText()))
    await chip.getByRole('button', { name: /Follow up in/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitemradio', { name: '1 week' }).click(); await page.waitForTimeout(200)
    await shot(page, 'q11-send-follow-up')
    await send.getByRole('button', { name: /^Send (via|on) WhatsApp/ }).click(); await page.waitForTimeout(2500)   // (the calm UI build 2026-10-27, a deliberate change) W-058: "Send on WhatsApp"
    const due = Number(sql(`select due_at from quotes where id='${Q7}'`))
    const days = Math.round((due * 1000 - new Date(new Date().toDateString()).getTime()) / 86400000)
    ok('Q11 the follow-up sets Due a week out and raises its task', days === 7 && sql(`select count(*) from lead_tasks where quote_id='${Q7}' and done=0`) === '1', `${days} days`)
    const s = await snack(page)
    ok('Q11 the snackbar names who and the follow-up', /Quote sent to .* for confirmation — follow-up on/.test(s), s.split('\n')[0])
    await ctx.close()
  })

  /* ── C6: the row's Create contract ── */
  await step('C6', async () => {
    const { ctx, page } = await desk()
    await page.goto(`${BASE}/quotes`); await ready(page, 1200)
    const r = row(page, Q5); await r.hover()
    await r.getByRole('button', { name: /^More actions for/ }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Create contract' }).click(); await page.waitForTimeout(1200)
    await shot(page, 'c6-row-create-contract')
    await page.getByTestId('contract-starter-row').click(); await page.getByTestId('contract-template-use').click()   // (the calm UI build 2026-10-27, a deliberate change) W-616: the studio agreement is a choice, Continue makes it
    await page.waitForURL(/\/contracts\/[0-9a-f-]{36}/, { timeout: 15000 })
    const cid = page.url().match(/contracts\/([0-9a-f-]{36})/)[1]
    ok('C6 the Quotes row makes a contract from its quote', sql(`select from_quote_id from contracts where id='${cid}'`) === Q5)
    await ctx.close()
  })

  /* ── The ghosts: each loader draws the page's columns where the page puts them ── */
  await step('ghosts', async () => {
    const cols = async (url, loader) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const p = await ctx.newPage()
      if (loader) await p.route((u) => u.href === url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
      await p.goto(url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(loader ? 900 : 2200)
      const xs = loader
        ? await p.evaluate(() => { const h = [...document.querySelectorAll('[class*="tHead"]')].find((e) => e.getBoundingClientRect().width > 0); return h ? [...h.children].map((c) => Math.round(c.getBoundingClientRect().left)) : [] })
        : await p.evaluate(() => [...document.querySelectorAll('[role="columnheader"]')].map((c) => Math.round(c.getBoundingClientRect().left)))
      await p.screenshot({ path: path.join(SHOTS, `ghost-${url.includes('/leads/') ? 'lead-quotes' : 'tools-quotes'}-${loader ? 'loader' : 'page'}.png`) })
      await ctx.close(); return xs
    }
    for (const url of [`${BASE}/quotes`, `${BASE}/leads/${LEAD6}/quotes`]) {
      const a = await cols(url, true), c = await cols(url, false)
      const same = a.length >= c.length && c.every((x, i) => Math.abs(x - a[i]) <= 3)
      ok(`ghost ${url.replace(BASE, '')}: the loader’s columns sit where the page’s do`, same, `loader ${a.slice(0, 12).join(',')} · page ${c.join(',')}`)
    }
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const p = await ctx.newPage()
    const url = `${BASE}/quotes/${Q6}/preview`
    await p.route((u) => u.href === url, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
    await p.goto(url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(900)
    const ghostLast = await p.evaluate(() => { const a = document.querySelector('header [class*="actions"]'); const l = a && a.lastElementChild; return l ? Math.round(l.getBoundingClientRect().width) : 0 })
    await p.screenshot({ path: path.join(SHOTS, 'ghost-preview-loader.png') })
    await ctx.close()
    const { ctx: rc, page: rp } = await desk()
    await rp.goto(url); await ready(rp, 1500)
    const realLast = Math.round((await rp.getByTestId('quote-send').boundingBox()).width)
    ok('ghost Preview: the loader’s last button is the Send ▾ it becomes', Math.abs(ghostLast - realLast) <= 3, `ghost ${ghostLast} · page ${realLast}`)
    await rc.close()
    const pc = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const pp = await pc.newPage()
    const curl = `${BASE}/confirm/${Q6}`
    await pp.route((u) => u.href === curl, async (route) => { const r = await route.fetch(); const body = (await r.text()).replace(/<script\b[\s\S]*?<\/script>/g, ''); await route.fulfill({ response: r, body, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } }) })
    await pp.goto(curl, { waitUntil: 'load' }).catch(() => {}); await pp.waitForTimeout(900)
    await pp.screenshot({ path: path.join(SHOTS, 'ghost-confirm-390-loader.png'), fullPage: true })
    await pc.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
