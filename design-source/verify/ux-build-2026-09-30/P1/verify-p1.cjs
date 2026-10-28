// UX audit build 2026-09-30 · package P1 — the lead journey (L1 · L2 · L6 · L7 · L8 · L9 · L10 · L11 · Q1 · C1 · T1 · T3).
// Run against `next start -p 3021` on a FRESH copy of the scratch DB seeded with two probe quotes (scratchpad serve.sh):
//   OM-19001 "Gerald kitchen" Approved on Gerald Tan (Met) · OM-19002 "Grace flat" Draft on Grace Lim (Met).
// Usage: NODE_PATH=$PWD/node_modules node verify-p1.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
const dir = dirArg || __dirname
const BASE = 'http://localhost:3021'
const L = {
  farah: 'c9691890-3132-4902-9c2a-d251f6bfda9a',   // Contacted · Dane + Sarah
  gerald: 'bed4ded0-1ac7-48fd-a7c4-639a7a00f02f',  // Met · Dane
  grace: 'f54404de-f6a6-44c3-a057-921483e14aa3',   // Met · James + Sarah
  marcus: '6418e858-13e3-416f-b7c1-2481d1e0ca6f',  // New · Dane
  aisyah: 'plead-hangout',                          // New · one member
  olivia: '2bc08444-0409-47c3-9675-0750977c5838',  // New · nobody
  cheryl: '9b9eb718-4be6-4cf2-9ab6-017bba61f57a',  // Contacted · budget 0
  meiling: 'd925fe8f-276f-4d14-973b-6334e3acba37', // On Hold (from Contacted)
  vivien: 'bb054aa5-7284-492e-b232-607bd4cfb0f6',  // Quote Sent · Won reachable
  jasmine: 'a2650d90-e0fa-4e64-be76-10cc588ab7b0', // Contacted
  kevin: '1f12cbd1-b09b-47f4-89e4-454a1a5e333b',   // Met · a meeting log
}
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  const p = await ctx.newPage()
  const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
  const shot = (n) => p.screenshot({ path: path.join(dir, `${n}.png`) })
  const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
  const wizard = () => p.locator('[role="dialog"][aria-label="Move stage"]')
  const primary = () => p.locator('[data-testid="header-primary"] button')
  /* (the calm UI build 2026-10-27, a deliberate change — audit 2-05) the locked Convert to Project left the header: its handle and its refusal are
     the Stage ▾ menu's Won row now */
  const locked = () => p.locator('[role="menu"] [data-testid="convert-locked"]')
  const openStages = async () => { await p.getByRole('button', { name: /^Stage: / }).click(); await p.waitForTimeout(400) }
  const pickStage = async (name) => {
    await p.getByRole('button', { name: /^Stage: / }).click()
    await p.locator('[role="menu"]').getByText(name, { exact: true }).click()
    await p.waitForTimeout(500)
  }

  // ── L6 · the header's one filled primary is the next step; Convert stays outlined with its lock ───────────────────────
  console.log('L6 · Q1 (Convert refusal)')
  await go(`/leads/${L.farah}`)
  ok((await primary().innerText()).trim() === 'Move to Met', 'L6: Contacted lead — the filled primary reads "Move to Met"')
  ok(await p.locator('[data-testid="header-primary"]').count() === 1 && !(await p.getByRole('button', { name: 'Convert to Project' }).count()), 'L6: no locked Convert beside the primary (the calm UI build 2026-10-27, a deliberate change)')
  await openStages()
  ok(await locked().isVisible() && (await locked().getAttribute('aria-disabled')) === 'true', 'L6: Won is locked in Stage ▾ — the Won row carries Convert\'s handle (the calm UI build 2026-10-27, a deliberate change)')
  await shot('l6-header-contacted-1440')
  await locked().click({ force: true })
  await p.waitForTimeout(400)
  ok(/Complete Met and Quote Sent first/.test(await snack().innerText()), 'L6: Convert\'s refusal names the whole path — "Complete Met and Quote Sent first"')
  ok(await snack().getByRole('button', { name: 'Move to Met' }).isVisible(), 'Q1: the refusal carries "Move to Met"')
  await shot('q1-convert-refusal-action')
  await snack().getByRole('button', { name: 'Move to Met' }).click()
  await p.waitForTimeout(700)
  ok(await wizard().isVisible() && /Moving to Met/.test(await wizard().innerText()), 'Q1: the action opens the Move stage window at Met')
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  await primary().click(); await p.waitForTimeout(700)
  ok(await wizard().isVisible() && /Moving to Met/.test(await wizard().innerText()), 'L6: "Move to Met" opens the window at Met')
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)

  await go(`/leads/${L.vivien}`)
  ok((await primary().innerText()).trim() === 'Convert to Project' && await locked().count() === 0, 'L6: once Won is reachable Convert to Project is the one primary')
  ok(await p.locator('header button[class*="primary"], [data-testid="header-primary"] button').count() >= 1, 'L6: one filled primary in the header')

  await go(`/leads/${L.gerald}`)
  await openStages(); await locked().click({ force: true }); await p.waitForTimeout(400)
  ok(/Complete Quote Sent first/.test(await snack().innerText()) && await snack().getByRole('button', { name: 'Move to Quote Sent' }).isVisible(), 'Q1: Met lead — "Complete Quote Sent first" with "Move to Quote Sent"')

  // ── L1 · a parked lead: Convert locked; a resume into Won / Quote Sent opens that step ───────────────────────────────
  console.log('L1')
  await go(`/leads/${L.meiling}`)
  ok((await primary().innerText()).trim() === 'Resume at Contacted', 'L1: On Hold lead — the primary is "Resume at Contacted"')
  /* (the calm UI build 2026-10-27, a deliberate change — 2-05) a parked lead's header has no locked Convert: its primary is the resume itself */
  ok(!(await p.getByRole('button', { name: 'Convert to Project' }).count()), 'L1: no locked Convert while parked — the primary "Resume at Contacted" is the way on')
  await pickStage('Won')
  const confirm = p.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: 'Resume at Won?' })
  ok(await confirm.isVisible(), 'L1: picking Won asks "Resume at Won?"')
  ok(/The Won step opens next/.test(await confirm.innerText()), 'L1: the confirm says the Won step opens next')
  await shot('l1-resume-won-confirm')
  await confirm.getByRole('button', { name: 'Resume' }).click(); await p.waitForTimeout(800)
  ok(await wizard().isVisible() && /Moving to Won/.test(await wizard().innerText()), 'L1: Resume opens the Move stage window at Won — its checks and fields')
  ok(sql(`select stage from leads where id='${L.meiling}'`) === 'On Hold', 'L1: nothing moved yet — the lead is still On Hold')
  await shot('l1-resume-won-step')
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  await pickStage('Quote Sent')
  await p.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: 'Resume at Quote Sent?' }).getByRole('button', { name: 'Resume' }).click(); await p.waitForTimeout(800)
  ok(await wizard().isVisible() && /Moving to Quote Sent/.test(await wizard().innerText()), 'L1: resuming at Quote Sent opens its step too')
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok(sql(`select stage from leads where id='${L.meiling}'`) === 'On Hold', 'L1: closing the step leaves the lead On Hold')

  // ── Q1 · the hand-off: ?move=quote-sent&quote= opens the step with the quote picked; the move stamps it Sent to Client ──
  console.log('Q1 (hand-off)')
  await go(`/leads/${L.gerald}?move=quote-sent&quote=probe-q-app`)
  await p.waitForTimeout(900)
  ok(await wizard().isVisible() && /Moving to Quote Sent/.test(await wizard().innerText()), 'Q1: ?move=quote-sent opens the window at Quote Sent')
  ok(!/move=/.test(p.url()), 'Q1: the parameters leave the address')
  const pickedRow = wizard().locator('button[data-selected]').filter({ hasText: 'Gerald kitchen' })
  ok(await pickedRow.count() === 1, 'Q1: the quote is already picked (OM-19001 · Gerald kitchen)')
  await shot('q1-handoff-quote-sent')
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(1500)
  ok(/Moved to Quote Sent · OM-19001 marked sent to the client/.test(await snack().innerText()), 'Q1: the snackbar names the move and the quote marked sent')
  ok(sql(`select stage from leads where id='${L.gerald}'`) === 'Quote Sent', 'Q1: the lead is in Quote Sent')
  ok(sql(`select status||'|'||(client_sent_at is not null) from quotes where id='probe-q-app'`) === 'Sent to Client|1', 'Q1: the quote is Sent to Client, client_sent_at stamped')
  await shot('q1-after-move')

  // approval respected: a Designer picking a Draft under required approval is told why, and Save refuses
  sql(`update members set is_you = (id = 'sarah')`)
  await go(`/leads/${L.grace}?move=quote-sent&quote=probe-q-draft`)
  await p.waitForTimeout(900)
  ok(await wizard().isVisible(), 'Q1: (as Sarah, Designer) the window opens at Quote Sent for the Draft')
  ok(/OM-19002 isn’t approved yet — a quote goes to the client once it’s approved/.test(await wizard().innerText()), 'Q1: the step says the Draft needs approval first')
  await shot('q1-approval-hold')
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(900)
  ok(sql(`select stage from leads where id='${L.grace}'`) === 'Met' && sql(`select status from quotes where id='probe-q-draft'`) === 'Draft', 'Q1: Save refuses — the lead stays in Met, the Draft stays a Draft')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  sql(`update members set is_you = (id = 'dane')`)

  // ── C1 · ?move=won&contract= opens Won with the contract and its signed quote as the source ────────────────────────────
  console.log('C1')
  const now = Math.floor(Date.now() / 1000)
  sql(`update quotes set status='Signed', signed_at=${now} where id='probe-q-app'`)
  sql(`insert into contracts (id, lead_id, title, status, created_at, signed_at, from_quote_id, signed_copy) values ('probe-c-signed', '${L.gerald}', 'Gerald contract', 'Signed', ${now}, ${now}, 'probe-q-app', 'Gerald contract.pdf')`)
  await go(`/leads/${L.gerald}?move=won&contract=probe-c-signed`)
  await p.waitForTimeout(900)
  ok(await wizard().isVisible() && /Moving to Won/.test(await wizard().innerText()), 'C1: ?move=won opens the window at Won')
  ok(await wizard().locator('button[data-selected]').filter({ hasText: 'Gerald kitchen' }).count() === 1, 'C1: the contract\'s signed quote is the source')
  ok(await wizard().locator('button[data-selected]').filter({ hasText: 'Gerald contract.pdf' }).count() === 1, 'C1: the signed contract is picked')
  await shot('c1-handoff-won')
  await wizard().getByRole('button', { name: 'Save & Convert to Project' }).click(); await p.waitForTimeout(1500)
  ok(/Project P-\d{4}-\d{3} created/.test(await snack().innerText()), 'C1: Save & Convert — "Project P-… created" (REG-1052)')
  ok(sql(`select stage from leads where id='${L.gerald}'`) === 'Won', 'C1: the lead is Won')

  // ── L2 · T1 · L9 · T3 · L10 — a contact log saved in Notes on a New lead, its photo, then the move ─────────────────────
  console.log('L2 · T1 · L9 · T3 · L10')
  const notesBefore = Number(sql(`select count(*) from lead_notes where lead_id='${L.marcus}'`))
  await go(`/leads/${L.marcus}/notes?new=contact`)
  await p.waitForTimeout(600)
  const editor = p.locator('[data-testid="contact-editor"]').first()
  /* (the calm UI build 2026-10-27, a deliberate change — 2-08 · W-486 · W-528) the log sheet's words at every width: the stored "In person" reads
     "Visit"; the attach row is the shorter "Add …", still naming what proves THIS contact */
  const howIt = (scope) => scope.getByRole('radiogroup', { name: 'How it went', exact: true })
  await editor.getByRole('radio', { name: 'Visit', exact: true }).click()
  ok(await editor.getByText('Add photos from the visit').isVisible(), 'T3: Visit — the attach row asks for photos from the visit')
  await editor.getByRole('radio', { name: 'Call', exact: true }).click()
  ok(await editor.getByText('Add a screenshot (optional)').isVisible(), 'T3: Call — a screenshot of the call')
  // L9 · pick a day, no time: the log takes the time it is now
  await editor.locator('button[aria-haspopup="dialog"]').first().click()
  await p.waitForTimeout(300)
  const today = new Date()
  const dayLabel = `${today.getDate()} ${['January','February','March','April','May','June','July','August','September','October','November','December'][today.getMonth()]} ${today.getFullYear()}`
  await p.locator('#om-date-picker').getByRole('button', { name: dayLabel, exact: true }).click()   // exact: on the 1st–9th, "6 October" also names the 16th and the 26th
  await p.waitForTimeout(200)
  const clock = new Date()
  const hm = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
  await p.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
  await p.waitForTimeout(200)
  const whenText = await editor.innerText()
  ok(whenText.includes(hm(clock)) || whenText.includes(hm(new Date(clock.getTime() - 60000))), `L9: the day picked with no time reads the time now (${hm(clock)}), not 10:00 AM`)
  await howIt(editor).getByRole('radio', { name: 'Connected', exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) — How it went is chips (was the Outcome select)
  await p.waitForTimeout(200)
  // T1 · Attach → upload a real file → it lands ticked → attached
  await editor.getByRole('button', { name: 'Attach' }).click()
  await p.waitForTimeout(500)
  const modal = p.locator('[role="dialog"][aria-label="Attach files"]')
  await modal.locator('input[type="file"]').setInputFiles(path.resolve(__dirname, '../../../../public/figma-assets/file-thumb-1.png'))
  await p.waitForTimeout(3500)
  ok(Number(sql(`select count(*) from lead_files where lead_id='${L.marcus}' and name='file-thumb-1.png'`)) === 1, 'T1: the picked photo reached Files (uploadFile)')
  ok(await modal.getByRole('button', { name: 'Attach 1 File' }).isEnabled(), 'T1: it lands ticked — "Attach 1 File"')
  await shot('t1-attach-ticked')
  await modal.getByRole('button', { name: 'Attach 1 File' }).click(); await p.waitForTimeout(800)
  ok(await p.getByText('file-thumb-1.png').first().isVisible(), 'T1: the attachment shows beside the draft')
  await p.getByRole('button', { name: 'Save log', exact: true }).last().click(); await p.waitForTimeout(1500)   // (the calm UI build 2026-10-27, a deliberate change) — W-606 "Save log"
  ok(/Contact log saved/.test(await snack().innerText()), 'L2: "Contact log saved"')
  ok(await snack().getByRole('button', { name: 'Move to Contacted' }).isVisible(), 'L2: on a New lead the snackbar offers "Move to Contacted"')
  const noteId = sql(`select id from lead_notes where lead_id='${L.marcus}' and kind='contact' order by created_at desc limit 1`)
  ok(Number(sql(`select count(*) from note_attachments where note_id='${noteId}'`)) === 1, 'T1: the contact log saved with its photo')
  await shot('l2-saved-snackbar')
  await snack().getByRole('button', { name: 'Move to Contacted' }).click()
  await p.waitForURL(new RegExp(`/leads/${L.marcus}`), { timeout: 10000 })
  await p.waitForTimeout(2500)
  ok(await wizard().isVisible() && /Moving to Contacted/.test(await wizard().innerText()), 'L2: the window opens at Contacted')
  ok(await wizard().getByRole('radio', { name: 'Call', exact: true }).getAttribute('aria-checked') === 'true', 'L2: the log comes filled in (How: Call)')   // (the calm UI build 2026-10-27, a deliberate change) — "Callback requested" is a chip too now
  /* (leads on the move, a deliberate change of this rule — Q-02, his pick 2026-10-23, at every width) the screenshot is optional: the row says so */
  ok(/Add a screenshot \(optional\)/.test(await wizard().innerText()) && !/Add a screenshot\*/.test(await wizard().innerText()), 'L2 · Q-02: the attach row says "(optional)", no required mark')   // (the calm UI build 2026-10-27, a deliberate change) — W-486
  ok(await wizard().getByText('file-thumb-1.png').count() >= 1, 'L2: the log\'s photo came with it')
  await shot('l2-move-contacted-filled')
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(700)
  const st = p.locator('[role="dialog"]').filter({ hasText: 'Suggested tasks' })
  ok(await st.isVisible(), 'L10: Suggested tasks opens')
  ok(await st.getByRole('button', { name: 'Move without tasks' }).isVisible(), 'L10: its secondary button reads "Move without tasks"')
  await shot('l10-suggested-tasks')
  await st.getByRole('button', { name: /close/i }).first().click(); await p.waitForTimeout(500)
  ok(await wizard().isVisible() && sql(`select stage from leads where id='${L.marcus}'`) === 'New', 'L10: ✕ goes back to the log — nothing moved')
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(700)
  await p.locator('[role="dialog"]').filter({ hasText: 'Suggested tasks' }).getByRole('button', { name: 'Move without tasks' }).click(); await p.waitForTimeout(1500)
  ok(sql(`select stage from leads where id='${L.marcus}'`) === 'Contacted', 'L10: "Move without tasks" completes the move')
  await go(`/leads/${L.marcus}/notes`)
  /* (the calm UI build 2026-10-27, a deliberate change — 2-46) a contact log's row is titled by channel + outcome ("Call — connected"), so the
     row is told by its call-log glyph, as the list draws it */
  const logs = await p.locator('[data-testid="note-item"]').filter({ has: p.locator('[class*="itemIcon"]', { hasText: 'call_log' }) }).count()
  ok(logs === Number(sql(`select count(*) from lead_notes where lead_id='${L.marcus}' and kind='contact'`)), 'L2: the carried log is listed once (no stage duplicate)')
  ok(Number(sql(`select count(*) from lead_notes where lead_id='${L.marcus}'`)) === notesBefore + 1, 'L2: one note written')

  // L2 · the Contacted step's attach error is in view after Save
  await go(`/leads/${L.aisyah}`)
  await pickStage('Contacted')
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(900)
  const err = wizard().locator('[role="alert"]').first()
  const box = await err.boundingBox(); const wbox = await wizard().boundingBox()
  ok(!!box && !!wbox && box.y >= wbox.y && box.y + box.height <= wbox.y + wbox.height, 'L2: Save scrolls the first error into view inside the window')
  /* (leads on the move, a deliberate change of this rule — Q-02) no screenshot error: the log's own fields are what it asks for */
  ok(await wizard().getByText('Attach at least one file').count() === 0 && await wizard().locator('[role="alert"]').count() >= 1, 'L2 · Q-02: the errors are the log’s own fields — no screenshot error')
  await shot('l2-contacted-errors')
  // the case the audit met: every field filled but the screenshot — the one error sits below the fold, and Save brings it into view
  await wizard().getByRole('radio', { name: 'Call', exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change)
  await wizard().locator('button[aria-haspopup="dialog"]').first().click(); await p.waitForTimeout(300)
  await p.locator('#om-date-picker').getByRole('button', { name: dayLabel, exact: true }).click()
  await p.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
  await howIt(wizard()).getByRole('radio', { name: 'Connected', exact: true }).click(); await p.waitForTimeout(300)   // (the calm UI build 2026-10-27, a deliberate change) — How it went is chips
  await wizard().locator('[class*="panel"]').evaluateAll((els) => els.forEach((el) => { el.scrollTop = 0 }))
  await wizard().getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForTimeout(1200)
  /* (leads on the move, a deliberate change of this rule — Q-02) a filled log with no screenshot is complete: Save goes on to Suggested tasks */
  const only = wizard().locator('[role="alert"]')
  ok(await only.count() === 0 && await p.locator('[role="dialog"]').filter({ hasText: 'Suggested tasks' }).isVisible(), 'L2 · Q-02: a filled log with no screenshot is complete — Save goes on to Suggested tasks')
  await shot('l2-attach-error-in-view')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)

  // T3 · Met's meeting logs in All Notes & Logs, read-only; saving a log on a non-New lead offers Add tasks
  await go(`/leads/${L.kevin}/notes`)
  const meeting = p.locator('[data-testid="note-item"]').filter({ hasText: 'Meeting log' }).first()
  ok(await meeting.isVisible(), 'T3: the Met stage\'s meeting log is listed under All Notes & Logs')
  await meeting.locator('button').first().click(); await p.waitForTimeout(500)
  ok(await p.getByText(/From the Met step — read only/).first().isVisible() && await p.locator('[data-testid="contact-editor"]').getByText('Where').first().isVisible(), 'T3: it opens read-only, naming the step it came from — Where · When')   // (the calm UI build 2026-10-27, a deliberate change) — W-106
  await shot('t3-meeting-log')
  await go(`/leads/${L.jasmine}/notes?new=contact`)
  const ed2 = p.locator('[data-testid="contact-editor"]').first()
  await ed2.getByRole('radio', { name: 'WhatsApp' }).click()
  ok(await ed2.getByText('Add screenshots of the messages').isVisible(), 'T3: WhatsApp — screenshots of the messages')   // (the calm UI build 2026-10-27, a deliberate change) — W-486
  await ed2.locator('button[aria-haspopup="dialog"]').first().click()
  await p.waitForTimeout(300)
  await p.locator('#om-date-picker').getByRole('button', { name: dayLabel, exact: true }).click()
  await p.locator('#om-date-picker').getByRole('button', { name: 'Done' }).click()
  await howIt(ed2).getByRole('radio', { name: 'Connected', exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) — chips, "Save log"
  await p.getByRole('button', { name: 'Save log', exact: true }).last().click(); await p.waitForTimeout(1500)
  ok(await snack().getByRole('button', { name: 'Add tasks' }).isVisible(), 'T3: a saved log on a Contacted lead offers "Add tasks"')
  await snack().getByRole('button', { name: 'Add tasks' }).click()
  await p.waitForURL(/\/tasks\?add=1/, { timeout: 10000 }).catch(() => {})
  ok(/\/leads\/[^/]+\/tasks\?add=1/.test(p.url()), 'T3: "Add tasks" opens the Tasks tab\'s add row (?add=1)')

  // ── L10 · Lost and On Hold open with no reason chosen ─────────────────────────────────────────────────────────────────
  console.log('L10 (reasons)')
  await go(`/leads/${L.jasmine}`)
  await pickStage('Lost')
  const lostDlg = p.locator('[role="dialog"]').filter({ hasText: 'Mark as lost' })   // (the calm UI build 2026-10-27, a deliberate change) — 2-29: titled by its verb, no subtitle
  ok(await lostDlg.isVisible(), 'L10: Lost dialog opens')
  const reasonVal = (await lostDlg.getByRole('combobox', { name: /Reason/ }).innerText()).trim()
  ok(reasonVal === '', 'L10: no Lost reason chosen on arrival')
  await lostDlg.getByRole('button', { name: 'Mark as lost', exact: true }).click(); await p.waitForTimeout(300)
  ok(/Required|required/.test(await lostDlg.innerText()), 'L10: Save asks for a reason')
  await shot('l10-lost-no-reason')
  await lostDlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300)
  await pickStage('On Hold')
  const holdDlg = p.locator('[role="dialog"]').filter({ hasText: 'Put on hold' })   // (the calm UI build 2026-10-27, a deliberate change)
  ok((await holdDlg.getByRole('combobox', { name: /Reason/ }).innerText()).trim() === '', 'L10: no On Hold reason chosen on arrival')
  await holdDlg.getByRole('button', { name: 'Put on hold', exact: true }).click(); await p.waitForTimeout(300)
  ok(/Required|required/.test(await holdDlg.innerText()) && sql(`select stage from leads where id='${L.jasmine}'`) === 'Contacted', 'L10: On Hold also asks for a reason — nothing moved')
  await holdDlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300)

  // ── L7 · Owner is the first assigned member ───────────────────────────────────────────────────────────────────────────
  console.log('L7 · L8')
  /* (the calm UI build 2026-10-27, a deliberate change — 2-14 · W-582 · W-583) no Owner row: the Members list names its first member — the one
     the New gate asks for — "in charge"; the rule (the first assigned member, never "You") is what L7 checks */
  const firstMember = async () => (await p.locator('aside[aria-label="Lead info"] [data-testid="info-members"] > *').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
  await go(`/leads/${L.grace}`)
  ok(/^James\b.*in charge/.test(await firstMember()), `L7: a lead assigned to James and Sarah — James is in charge, not "You" (${await firstMember()})`)
  await shot('l7-owner-first-assignee')
  await go(`/leads/${L.olivia}`)
  ok(await p.locator('aside[aria-label="Lead info"] [data-testid="info-members"]').count() === 0 && await p.locator('aside[aria-label="Lead info"]').getByRole('button', { name: 'Assign members' }).count() >= 1, 'L7: nobody assigned — the Members section offers "Assign members"')   // (the calm UI build 2026-10-27, a deliberate change)
  // ── L8 · an unknown budget ────────────────────────────────────────────────────────────────────────────────────────────
  await go(`/leads/${L.cheryl}`)
  const headerText = await p.locator('header').first().innerText()
  ok(!/S\$\s?0\b/.test(headerText), 'L8: the header chip never reads "S$ 0"')
  const info = await p.locator('aside[aria-label="Lead info"]').innerText()
  /* (the calm UI build 2026-10-27, a deliberate change — 2-03) the column shows only rows with a value: an unknown budget is no row at all, and
     the section's one "Add …" link offers it; never a number */
  ok(!/Budget[^\n]*\n?\s*S\$\s?0\b/.test(info) && !/Budget \(S\$\)\s*\n?\s*--/.test(info) && await p.locator('[data-testid="info-add-lead"]').count() === 1, 'L8: an unknown budget is no row — the section\'s "Add …" link offers it, never "S$ 0" or "--"')
  const brief = await p.locator('main, body').first().innerText()
  ok(!/S\$0\b/.test(brief), 'L8: the Maison AI brief never says "S$0"')
  await shot('l8-budget-unknown')

  // ── Ghost · the header's three controls (≥768), the pair on a phone ───────────────────────────────────────────────────
  console.log('Ghost · L11 · phone')
  // A cold load holds the ghost (PageReveal) for its beat: its header draws pill · locked Convert · primary · kebab, as the page does.
  const ghostBones = async (page) => {
    await page.waitForSelector('[aria-label="Loading lead"]', { timeout: 5000 })
    return page.evaluate(() => {
      const g = document.querySelector('[aria-label="Loading lead"]')
      const lockedBone = g && Array.from(g.querySelectorAll('span')).find((el) => /convertLocked/.test(el.className))
      return { locked: !!lockedBone && getComputedStyle(lockedBone).display !== 'none' }
    })
  }
  await p.goto(`${BASE}/leads/${L.farah}`, { waitUntil: 'commit' })
  const g1440 = await ghostBones(p)
  ok(!g1440.locked, 'Ghost (1440): the Overview ghost draws no locked Convert bone — the header is the pill and the primary (the calm UI build 2026-10-27, a deliberate change)')
  await shot('ghost-overview-1440')
  await p.waitForTimeout(1500)
  const pageLocked = await locked().isVisible()
  ok(pageLocked === g1440.locked, 'Ghost (1440): the page and its ghost agree')

  // ── L11 · a phone: tap-to-call; the header row is the pill and the primary ─────────────────────────────────────────────
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const m = await phone.newPage()
  await m.goto(`${BASE}/leads/${L.farah}`, { waitUntil: 'commit' })
  const g390 = await ghostBones(m)
  ok(!g390.locked, 'Ghost (390): the phone ghost keeps the pair — no locked Convert bone')
  await m.waitForLoadState('networkidle'); await m.waitForTimeout(1200)
  const tel = m.locator('a[href^="tel:+65"]').first()
  ok(await tel.isVisible() && (await tel.getAttribute('href')) === `tel:+65${sql(`select phone from leads where id='${L.farah}'`)}`, 'L11: on a phone the number is a tel: link')
  ok(!(await m.locator('[data-testid="convert-locked"]').isVisible()), 'L6: on a phone the row is the pill and the primary (locked Convert steps back)')
  ok((await m.locator('[data-testid="header-primary"] button').innerText()).trim() === 'Move to Met', 'L6: the phone\'s primary reads "Move to Met"')
  await m.screenshot({ path: path.join(dir, 'l11-phone-tel-390.png') })
  ok(await p.locator('a[href^="tel:"]').count() === 0 || !(await p.locator('aside a[href^="tel:"]').isVisible()), 'L11: at 1440 with a mouse the number stays plain text')

  // Tablet: the header's three controls fit beside the name (no sideways page scroll at 1024 or 768)
  for (const w of [1024, 768]) {
    const t = await b.newContext({ viewport: { width: w, height: 1024 } })
    const tp = await t.newPage()
    await tp.goto(`${BASE}/leads/${L.farah}`, { waitUntil: 'networkidle' }); await tp.waitForTimeout(1200)
    const over = await tp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(over <= 0, `L6: at ${w} no sideways scroll`)
    ok(!(await tp.locator('[data-testid="convert-locked"]').isVisible()) && (await tp.locator('[data-testid="header-primary"] button').innerText()).trim() === 'Move to Met', `L6: at ${w} the header keeps the pair — the pill and "Move to Met"`)
    const nameBox = await tp.locator('header h1, header [class*="title"]').first().boundingBox()
    ok(!!nameBox && nameBox.width >= 100, `L6: at ${w} the lead's name keeps its room`)
    await tp.screenshot({ path: path.join(dir, `l6-header-${w}.png`) })
    await t.close()
  }

  console.log(`\n${pass} passed · ${fail} failed`)
  await b.close()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(2) })
