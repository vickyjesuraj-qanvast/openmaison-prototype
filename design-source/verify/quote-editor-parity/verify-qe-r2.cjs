// Quote editor parity round 2 (REG-624) — approval with a note, an approver's own Send, the sent banner, the gates. :3011, test DB.
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const OM1 = '39e4c832-bf4a-409e-bf41-bfc8d19b4340', OM4 = '1f598389-4008-4079-a956-5dff071fb708', OM6 = 'a13747cb-e058-46fc-a631-6a22ffa79823'
const LEAD1 = (() => execSync(`sqlite3 "${process.env.TESTDB}" "select lead_id from quotes where id='${OM1}'"`).toString().trim())()
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
const as = (id) => sql(`update members set is_you = case id when '${id}' then 1 else 0 end`)
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n')[0]) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
async function snack(page, text, timeout = 6000) { await page.getByText(text, { exact: false }).first().waitFor({ timeout }) }
/* The Activity section starts folded: its tab opens it (selectTab), then its rows are read. */
async function activityText(page) {
  await page.getByRole('tab', { name: /^Activity/ }).first().click().catch(async () => { await page.getByText('Activity', { exact: true }).first().click() })
  await page.waitForTimeout(700)
  return page.locator('#section-activity').innerText()
}
const openQuote = async (page, id) => { await page.goto(`${BASE}/quotes/${id}`); await page.getByTestId('quote-editor').waitFor(); await ready(page) }

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)
  const shot = (n) => page.screenshot({ path: `${S}/shots-qe2/${n}.png` })

  /* ── a designer sends for approval ── */
  await step('designer: Send puts the quote at Sent for Approval', async () => {
    as('sarah')
    await openQuote(page, OM1)
    const sendBtn = page.getByRole('button', { name: 'Send', exact: true })
    ok('a designer’s Send is one button (for approval)', (await sendBtn.getAttribute('aria-haspopup')) === null)
    await sendBtn.click(); await snack(page, /^Quote OM-\d+ sent for approval/)   // REG-769 (UX audit Q3): the snackbar names the quote and the approvers told
    await page.waitForTimeout(600)
    ok('stored with who sent it', sql(`select status || '|' || submitted_by from quotes where id='${OM1}'`) === 'Sent for Approval|sarah')
    ok('the approvers are told', sql(`select count(*) from notifications where quote_id='${OM1}' and kind='quote_approval' and member_id='dane' and actor_id='sarah'`) === '1')
    const bar = page.getByTestId('approval-bar')
    const t = await bar.innerText()
    ok('the bar says who sent it and that it waits', /Sarah sent this quote for approval/.test(t) && /Waiting for an Owner, an Admin or the backup approver/.test(t) && (await bar.getByRole('button').count()) === 0, t.replace(/\n/g, ' '))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await shot('01-designer-waiting')
  })
  await step('designer: Approved is approvers only in the tables too', async () => {
    await page.goto(`${BASE}/leads/${LEAD1}/quotes`); await ready(page)
    const row = page.getByRole('row').filter({ hasText: 'OM-10001' }).first()
    await row.getByRole('button', { name: /Sent for Approval/ }).first().click()
    const item = page.getByRole('menuitem', { name: /^Approved/ }).first()
    ok('Approved is disabled with “approvers only”', (await item.isDisabled()) && /approvers only/.test(await item.innerText()))
    await shot('02-table-approvers-only')
    await page.keyboard.press('Escape')
  })
  await step('designer: Settings › Quotes reads, does not change', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('settings-quotes').waitFor(); await ready(page)
    ok('the module says who changes it', /Only Owners and Admins change these\./.test(await page.getByTestId('settings-quotes').innerText()))
    // (REG-645, settings parity Q-08) one read-only look: the choice shows, disabled — no longer a press refused by a snackbar
    ok('the approval choice is disabled', await page.getByRole('radiogroup', { name: 'Quote approval' }).getByRole('radio', { name: /Not required/ }).isDisabled())
    ok('the approval setting did not move', sql(`select count(*) from settings where key='quote_approval' and value like '%not%'`) === '0')
    ok('no trade can be removed or added', (await page.getByRole('button', { name: /^Remove / }).count()) === 0 && (await page.getByLabel('Add a trade').count()) === 0)
    await shot('03-settings-read-only')
  })

  /* ── the owner asks for changes ── */
  await step('owner: Request changes with a note', async () => {
    as('dane')
    await openQuote(page, OM1)
    const bar = page.getByTestId('approval-bar')
    await bar.getByRole('button', { name: 'Request changes' }).click()
    const dlg = page.getByRole('dialog', { name: 'Request changes' }); await dlg.waitFor()
    ok('Send back waits for a note', await dlg.getByRole('button', { name: 'Send back' }).isDisabled())
    await dlg.getByLabel(/What should change/).fill('Split the carpentry into living and bedrooms')
    await shot('04-request-changes-dialog')
    await dlg.getByRole('button', { name: 'Send back' }).click()
    await snack(page, 'Sent back to Sarah with your note')
    await page.waitForTimeout(500)
    ok('back to Draft with the note on the record', sql(`select status || '|' || review_note || '|' || reviewed_by from quotes where id='${OM1}'`) === 'Draft|Split the carpentry into living and bedrooms|dane')
    ok('Sarah is told, with the note', sql(`select count(*) from notifications where quote_id='${OM1}' and kind='quote_changes' and member_id='sarah' and body like 'Split the carpentry%'`) === '1')
  })
  await step('designer: the note waits at the top until the next send', async () => {
    as('sarah')
    await openQuote(page, OM1)
    const t = await page.getByTestId('approval-bar').innerText()
    ok('Changes requested by Dane — the note', /Changes requested by Dane/.test(t) && /Split the carpentry into living and bedrooms/.test(t), t.replace(/\n/g, ' '))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await shot('05-changes-bar')
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await snack(page, /^Quote OM-\d+ sent for approval/)   // REG-769 (UX audit Q3): the snackbar names the quote and the approvers told
    await page.waitForTimeout(500)
    ok('sent again: the bar now waits', /sent this quote for approval/.test(await page.getByTestId('approval-bar').innerText()))
    ok('the note stays on the record', sql(`select review_note from quotes where id='${OM1}'`) === 'Split the carpentry into living and bedrooms')
  })
  await step('owner: Approve', async () => {
    as('dane')
    await openQuote(page, OM1)
    await page.getByTestId('approval-bar').getByRole('button', { name: 'Approve' }).click()
    await snack(page, 'Quote approved — Sarah can send it to the client')
    await page.waitForTimeout(500)
    ok('Approved, by Dane', sql(`select status || '|' || approved_by from quotes where id='${OM1}'`) === 'Approved|dane')
    ok('Sarah hears it', sql(`select count(*) from notifications where quote_id='${OM1}' and kind='quote_approved' and member_id='sarah'`) === '1')
    ok('the bar is gone', (await page.getByTestId('approval-bar').count()) === 0)
    await page.reload(); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    const act = await activityText(page)
    ok('Activity tells the story', /Quote approved by Dane/.test(act) && /Changes asked by Dane — “Split the carpentry/.test(act) && /Quote sent for approval by Sarah/.test(act), act.split('\n').slice(0, 8).join(' · '))
    await shot('06-activity')
  })

  /* ── an approver's own send, the client's confirmation, Revise ── */
  let copy = null
  await step('owner: Duplicate starts clean', async () => {
    await openQuote(page, OM6)
    await page.getByRole('button', { name: /More options/ }).first().click()
    await page.getByRole('menuitem', { name: 'Duplicate and Edit' }).click()
    await snack(page, 'Quote duplicated — this is the copy')
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}/); await page.getByTestId('quote-editor').waitFor(); await ready(page)
    copy = page.url().match(/\/quotes\/([0-9a-f-]{36})/)[1]
    const r = sql(`select status || '|' || version || '|' || ifnull(approved_by,'') || '|' || ifnull(submitted_by,'') || '|' || ifnull(confirmed_at,'') || '|' || ifnull(client_sent_at,'') from quotes where id='${copy}'`)
    ok('a Draft at version 1 with no approval or confirmation', r === 'Draft|1||||', r)
  })
  await step('owner: Send offers the client’s two ways and approves on the way', async () => {
    const sendBtn = page.getByRole('button', { name: 'Send', exact: true })
    ok('an approver’s Send is a menu at Draft', (await sendBtn.getAttribute('aria-haspopup')) === 'menu')
    await sendBtn.click()
    await page.getByRole('menuitem', { name: /Send for confirmation/ }).click()
    const dlg = page.getByRole('dialog', { name: 'Send for confirmation' }); await dlg.waitFor()
    const phone = dlg.getByLabel(/Client phone/); if (!(await phone.inputValue())) await phone.fill('91234567')
    const [pop] = await Promise.all([ctx.waitForEvent('page').catch(() => null), dlg.getByRole('button', { name: 'Send via WhatsApp' }).click()])
    if (pop) await pop.close()
    await snack(page, /^Quote sent to .+ for confirmation/)   // REG-776 (UX audit Q11): it names the client and the follow-up
    await page.waitForTimeout(600)
    const r = sql(`select status || '|' || ifnull(approved_by,'') || '|' || (client_sent_at is not null) || '|' || ifnull(submitted_by,'') from quotes where id='${copy}'`)
    ok('Sent to Client, approved by Dane, no approval step', r === 'Sent to Client|dane|1|', r)
    const b = await page.getByTestId('sent-banner').innerText()
    ok('the banner says what the client has and offers Revise', /Sent to the client just now — they have version 1/.test(b) && /Revise — new version/.test(b), b.replace(/\n/g, ' '))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await shot('07-sent-banner')
  })
  await step('client confirms; the banner follows', async () => {
    const cp = await ctx.newPage()
    /* (pending modules S04, a deliberate change of this rule) the confirmation link carries the quote's own token — a copy's is never its id */
    await cp.goto(`${BASE}/confirm/${sql(`select confirm_token from quotes where id='${copy}'`)}`); await ready(cp)
    await cp.getByLabel('Your full name').fill('Olivia Martinez'); await cp.getByRole('button', { name: 'Confirm quote' }).click()
    await cp.waitForTimeout(1200); await cp.close()
    await openQuote(page, copy)
    const b = await page.getByTestId('sent-banner').innerText()
    ok('Olivia Martinez confirmed version 1', /Olivia Martinez confirmed version 1/.test(b), b.replace(/\n/g, ' '))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await shot('08-confirmed-banner')
  })
  await step('Revise from the banner: the new version starts clean', async () => {
    await page.getByTestId('sent-banner').getByRole('button', { name: 'Revise — new version' }).click()
    await page.getByRole('button', { name: 'Start version 2' }).click()
    await snack(page, 'Version 2 started')
    await page.waitForTimeout(800)
    const r = sql(`select status || '|' || version || '|' || ifnull(confirmed_at,'') || '|' || ifnull(confirmed_by,'') || '|' || ifnull(approved_by,'') || '|' || ifnull(client_sent_at,'') from quotes where id='${copy}'`)
    ok('Draft v2 without the old confirmation or approval', r === 'Draft|2||||', r)
    ok('no banner on the new draft', (await page.getByTestId('sent-banner').count()) === 0)
    ok('version 1 keeps its confirmation', sql(`select json_extract(snapshot_json, '$.quote.confirmedBy') from quote_versions where quote_id='${copy}' and version=1`) === 'Olivia Martinez')
  })
  await step('a signed quote says it is agreed', async () => {
    await openQuote(page, OM4)
    const b = await page.getByTestId('sent-banner').innerText()
    ok('Signed — version 1 is the agreed quote', /Signed — version 1 is the agreed quote/.test(b), b.replace(/\n/g, ' '))
    const act = await activityText(page)
    ok('its Activity reads each send by its stamp', /Quote sent for approval by Michelle/.test(act) && /Quote approved by Dane/.test(act) && /Quote sent to the client/.test(act))
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400)
    await shot('09-signed-banner')
  })
  await step('owner: Settings › Quotes changes', async () => {
    await page.goto(`${BASE}/settings?section=quotes`); await page.getByTestId('settings-quotes').waitFor(); await ready(page)
    ok('no read-only line for the owner', !/Only Owners and Admins change these\./.test(await page.getByTestId('settings-quotes').innerText()))
    ok('trades can be removed and added', (await page.getByRole('button', { name: /^Remove / }).count()) > 0 && (await page.getByLabel('Add a trade').count()) === 1)
  })

  /* ── the phone ── */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pp = await phone.newPage(); pp.setDefaultTimeout(12000)
  await step('phone: the sent banner is the Quote screen’s Next line', async () => {
    /* (quotes on the move, a deliberate change of this rule) a phone opens the Quote screen: the banner's words are its Next line (REG-870's full-width band is the desk's) */
    await pp.goto(`${BASE}/quotes/${OM4}`); await pp.getByTestId('quote-next').waitFor(); await ready(pp)
    const nextText = await pp.getByTestId('quote-next').locator('[class*="nextText"]').innerText()
    ok('the signed words are the Next line', /signed/i.test(nextText) && /version 1/.test(nextText), nextText.slice(0, 80))
    await pp.screenshot({ path: `${S}/shots-qe2/10-phone-banner.png` })
    const w = await pp.evaluate(() => document.documentElement.scrollWidth)
    ok('no sideways scroll at 390', w <= 390, String(w))
  })
  await browser.close()
  as('dane')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
