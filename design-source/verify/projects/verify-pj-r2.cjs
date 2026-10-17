// Projects round 2 — the Schedule (the Project Schedule Proposal: Main · Moved · Share · Phone · Start · Milestone · Depth). The list that is
// also the timeline; a drag with its dates, its one sentence and Undo; Escape; the keyboard; the panel; status; Add / delete with Undo; Share
// changes and the snapshot; What the client sees; templates (start from one); starting from the quote's sections; the Tasks tab's Milestone
// column and filter; the listing's Next milestone and Progress; attention; the bell's two reminders; the Overview's Schedule card; the phone.
// Run against `next start -p 3021` on a FRESH copy of the repaired scratch DB — never local.db: the probe shares, starts schedules and moves
// rows; what it can Undo it undoes, and it puts members.is_you back in `finally`.
// Usage: NODE_PATH=$PWD/node_modules node verify-pj-r2.cjs <probe.db path> [shotDir]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'r2')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3021'   // pass BASE when the server under test is elsewhere
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const P = (n) => sql(`select id from projects where number='${n}'`)
const day = (col, title, num) => sql(`select date(m.${col},'unixepoch','localtime') from project_milestones m join projects p on p.id=m.project_id where p.number='${num}' and m.title='${title}' and m.deleted_at is null`)
/* (REG-1077) Day counts are computed from the data and today, the way the app counts them (lib/projects/schedule-model.ts: a day is a local
   midnight; the next milestone is the open one that ends first; its count runs to its last day) — never the day the probe was written. */
const dayNo = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5)
const TODAY = dayNo(new Date())
const endOf = (num, title) => dayNo(new Date(Number(sql(`select m.end_date from project_milestones m join projects p on p.id=m.project_id where p.number='${num}' and m.title='${title}' and m.deleted_at is null`)) * 1000))
const nextOpenOf = (num) => { const [title, end] = sql(`select m.title || '|' || m.end_date from project_milestones m join projects p on p.id=m.project_id where p.number='${num}' and m.deleted_at is null and m.status <> 'done' order by m.end_date, m.start_date, m.position limit 1`).split('|'); return { title, end: dayNo(new Date(Number(end) * 1000)) } }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
/** `dueWords` — "in 18 days" · "ends today" · "3 days late". */
const dueWords = (end) => (end < TODAY ? `${plural(TODAY - end, 'day')} late` : end === TODAY ? 'ends today' : `in ${plural(end - TODAY, 'day')}`)
/* (S45C — the closing regression's note: every demo moment moves with the day of a restore, S42A) Every date this probe asserts is read from
   the records before it changes anything, and worded by the app's own rules (lib/projects/schedule-model.ts: a day number is a local
   midnight; "Fri 13 Nov" · "13 Nov" · "10 – 13 Nov"; the next weekday) — never the 14 Oct demo day's literals. */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const noOfIso = (s) => Math.round(Date.parse(`${s}T00:00:00Z`) / 864e5)
const isoOf = (n) => new Date(n * 864e5).toISOString().slice(0, 10)
const atDay = (sec) => dayNo(new Date(Number(sec) * 1000))
const ymd = (n) => { const u = new Date(n * 864e5); return { d: u.getUTCDate(), m: MON[u.getUTCMonth()], w: WD[u.getUTCDay()] } }
const dayLabel = (n) => { const p = ymd(n); return `${p.w} ${p.d} ${p.m}` }
const dayMonth = (n) => { const p = ymd(n); return `${p.d} ${p.m}` }
const nextWeekday = (n) => { let d = n + 1; while ([0, 6].includes(new Date(d * 864e5).getUTCDay())) d++; return d }
const msDay = (col, title, num) => noOfIso(day(col, title, num))

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1024 } })
  const p = await ctx.newPage()
  const errors = []
  let where = 'start'
  p.on('pageerror', (e) => errors.push(`${where}: ${String(e).slice(0, 200)}`))
  p.on('framenavigated', (f) => { if (f === p.mainFrame()) where = f.url().replace(BASE, '') })
  const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000) }
  const shot = (n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
  /** the newest snackbar's Undo (an earlier one may still be on screen above it) */
  const undo = () => snack().getByRole('button', { name: 'Undo' }).last()
  const rows = () => p.locator('[data-testid="schedule-timeline"] [data-kb-row]')
  const row = (title) => rows().filter({ has: p.locator('[data-testid="milestone-name"]', { hasText: title }) }).first()
  const bar = (title) => row(title).locator('[data-testid="milestone-bar"]')
  const benjamin = P('P-2026-002'), ryan = P('P-2026-001'), aisha = P('P-2026-003'), marcus = P('P-2026-004')
  const wasYou = sql(`select id from members where is_you = 1`)
  /* (S45C) Benjamin's schedule as the base holds it — the live dates and the copy he was last shown */
  const B2 = 'P-2026-002'
  const carpEnd = msDay('end_date', 'Carpentry fabrication', B2), paintStart = msDay('start_date', 'Painting', B2), paintEnd = msDay('end_date', 'Painting', B2)
  const cleanStart = msDay('start_date', 'Cleaning & touch-up', B2), handEnd = msDay('end_date', 'Handover & defect check', B2)
  const elecPay = noOfIso(sql(`select date(case when m.payment_due = 'start' then m.start_date else m.end_date end,'unixepoch','localtime') from project_milestones m where m.project_id='${benjamin}' and m.title='Electrical & plumbing' and m.deleted_at is null`))
  const [shareAt, shareHand] = sql(`select shared_at || '|' || json_extract(snapshot,'$.handover') from project_schedule_shares where project_id='${benjamin}' order by shared_at desc limit 1`).split('|')
  const shareDay = atDay(shareAt), sharedHandover = noOfIso(shareHand)

  try {
    // ── The listing: Next milestone · Progress · attention ────────────────────────────────────────────────────────────────
    console.log('Listing')
    await go('/projects')
    const heads = await p.locator('[role="columnheader"]').allInnerTexts()
    ok(heads.some((h) => /Next milestone/i.test(h)) && heads.some((h) => /Progress/i.test(h)), 'the listing has Next milestone and Progress columns')
    const bRow = p.locator('[data-kb-list="project"] [data-kb-row]').filter({ hasText: 'Benjamin' }).first()
    const bText = await bRow.innerText()
    const bNext = nextOpenOf('P-2026-002')
    ok(new RegExp(bNext.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(bText) && bText.includes(dueWords(bNext.end)), `Benjamin: next milestone ${bNext.title} · ${dueWords(bNext.end)}`)
    ok(/3 of 7/.test(bText), 'Benjamin: progress 3 of 7')
    const rText = await p.locator('[data-kb-list="project"] [data-kb-row]').filter({ hasText: 'Ryan' }).first().innerText()
    const rNext = nextOpenOf('P-2026-001')
    ok(/\d+ milestones? overdue/.test(rText) && rText.includes(dueWords(rNext.end)) && rNext.end < TODAY, `Ryan: "1 milestone overdue" and its next milestone ${dueWords(rNext.end)}`)
    await p.locator('[data-testid="tile-attention"]').click(); await p.waitForTimeout(500)
    const attn = await p.locator('[data-kb-list="project"] [data-kb-row]').allInnerTexts()
    ok(attn.some((t) => /Benjamin/.test(t)) && attn.some((t) => /Ryan/.test(t)), 'Needs attention holds Benjamin (a task, a wait) and Ryan (a milestone overdue)')
    await p.locator('[data-testid="tile-attention"]').click(); await p.waitForTimeout(400)
    await p.evaluate(() => document.querySelector('[data-kb-list="project"]')?.closest('[data-overflow]')?.scrollTo({ left: 4000 }))
    await p.waitForTimeout(300)
    await shot('listing-columns-1440')

    // ── Benjamin's schedule: the list that is also the timeline ───────────────────────────────────────────────────────────
    console.log('Schedule')
    await go(`/projects/${benjamin}/schedule`)
    ok(await rows().count() === 7, 'seven milestones, Hacking & demolition … Handover & defect check')
    ok(handEnd - sharedHandover === 7 && new RegExp(`Handover moves to ${dayLabel(handEnd)}, one week later\\.`).test(await p.locator('[data-testid="schedule-summary"]').innerText()), `the summary: "Handover moves to ${dayLabel(handEnd)}, one week later."`)
    ok(new RegExp(`Carpentry now ends ${dayLabel(carpEnd)}\\. Painting, cleaning and handover moved with it\\.`).test(await p.locator('[data-testid="schedule-summary"]').innerText()), '…and what moved with it')
    /* (fix-B, routed from C) while the live handover differs, the line names the handover the client still reads */
    ok(new RegExp(`Benjamin still sees the schedule shared on ${dayMonth(shareDay)}[.,]`).test(await p.locator('[data-testid="client-sees"]').innerText()) && /4 changes to share/.test(await p.locator('[data-testid="client-sees"]').innerText()), `"Benjamin still sees the schedule shared on ${dayMonth(shareDay)}." · 4 changes to share`)
    /* (simplify S-02 · Q-03, a deliberate change of this rule) the header's one filled button is Needs you's top row — Dane's approvals come before
       telling the client; the changes to share are a row of the list (and the Schedule's own Share, S-24) */
    ok((await p.locator('[data-testid="project-primary"]').innerText()).trim().length > 0, 'the one filled button: the top Needs you row')
    /* (simplify S-24) Share N changes is a real button on the toolbar, beside the line that opens what Benjamin sees */
    ok((await p.locator('[data-testid="schedule-share"]').innerText()).trim() === 'Share 4 changes', 'the toolbar\'s "Share 4 changes" button')
    ok(await row('Carpentry').locator('text=+1 week').count() === 1, 'a moved row says +1 week')
    ok(new RegExp(`30% · ${dayMonth(elecPay)}`, 'i').test(await row('Electrical').innerText()), `the mid-project payment (30% · ${dayMonth(elecPay)}) is tied to Electrical & plumbing`)
    ok(await row('Carpentry').locator('[class*="cap"]').count() === 1, 'carpentry decides the handover (the cap at its end)')
    await shot('schedule-moved-1440')

    // a drag: Painting a week later — the dates show while it moves; Cleaning and Handover follow; one sentence + Undo
    console.log('Drag')
    const box = await bar('Painting').boundingBox()
    // the timeline's day width: the Painting bar is as many days long as its dates (S45C — read, not assumed)
    const perDay = box.width / (paintEnd - paintStart + 1)
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await p.mouse.down()
    for (let i = 1; i <= 7; i++) await p.mouse.move(box.x + box.width / 2 + perDay * i, box.y + box.height / 2, { steps: 2 })
    await p.waitForTimeout(150)
    const tip = await p.locator('[data-testid="drag-tip"]').innerText().catch(() => '')
    ok(tip.includes(`${dayLabel(paintStart + 7)} – ${dayLabel(paintEnd + 7)}`), `the dates show while it moves (${tip})`)
    ok(await row('Cleaning').locator('[data-following]').count() === 1, 'what moves with it moves along while dragging')
    await shot('schedule-dragging-1440')
    await p.mouse.up(); await p.waitForTimeout(1200)
    ok(/Painting moved 1 week later\. 2 milestones followed\./.test(await snack().innerText()), 'one sentence: "Painting moved 1 week later. 2 milestones followed."')
    ok(day('start_date', 'Painting', 'P-2026-002') === isoOf(paintStart + 7) && day('end_date', 'Handover & defect check', 'P-2026-002') === isoOf(handEnd + 7), 'the server moved Painting and what follows it')
    ok(sql(`select date(target_end_date,'unixepoch','localtime') from projects where id='${benjamin}'`) === isoOf(handEnd + 7), 'the target end follows the handover')
    await shot('schedule-moved-snackbar-1440')
    await undo().click(); await p.waitForTimeout(1500)
    ok(day('start_date', 'Painting', 'P-2026-002') === isoOf(paintStart) && day('end_date', 'Handover & defect check', 'P-2026-002') === isoOf(handEnd), 'Undo puts every milestone back')
    ok(sql(`select count(*) from lead_events where project_id='${benjamin}' and kind='project_milestone_moved'`) === '1', 'Undo takes the move\'s line out of Activity')

    // Escape cancels a drag
    const box2 = await bar('Painting').boundingBox()
    await p.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2); await p.mouse.down()
    for (let i = 1; i <= 3; i++) await p.mouse.move(box2.x + box2.width / 2 + perDay * i, box2.y + box2.height / 2, { steps: 2 })
    await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(900)
    ok(day('start_date', 'Painting', 'P-2026-002') === isoOf(paintStart) && await p.locator('[data-testid="drag-tip"]').count() === 0, 'Escape puts a dragged bar back — nothing saved')

    // a dragged end: Carpentry's end two days later
    const box3 = await bar('Carpentry').boundingBox()
    await p.mouse.move(box3.x + box3.width - 3, box3.y + box3.height / 2); await p.mouse.down()
    for (let i = 1; i <= 2; i++) await p.mouse.move(box3.x + box3.width - 3 + perDay * i, box3.y + box3.height / 2, { steps: 2 })
    await p.mouse.up(); await p.waitForTimeout(1200)
    ok(new RegExp(`Carpentry now ends ${dayLabel(carpEnd + 2)}, 2 days later\\. 3 milestones followed\\.`).test(await snack().innerText()), `a dragged end: "Carpentry now ends ${dayLabel(carpEnd + 2)}, 2 days later. 3 milestones followed."`)
    await undo().click(); await p.waitForTimeout(1500)
    ok(day('end_date', 'Carpentry fabrication', 'P-2026-002') === isoOf(carpEnd), 'and Undo')

    // the keyboard on a focused bar
    await bar('Cleaning').focus(); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500)
    ok(day('start_date', 'Cleaning & touch-up', 'P-2026-002') === isoOf(cleanStart + 1), 'a focused bar moves a day with →')
    await undo().click(); await p.waitForTimeout(1500)
    ok(day('start_date', 'Cleaning & touch-up', 'P-2026-002') === isoOf(cleanStart), 'and Undo')

    // ── Status: Mark done, the row's menu, Undo ───────────────────────────────────────────────────────────────────────────
    console.log('Status')
    await row('Carpentry').locator('[data-testid="mark-done"]').click(); await p.waitForTimeout(1500)
    /* (simplify S-18, a deliberate change of this rule) every Done opens the Mark done sheet — its client and money ticks unticked here, so the
       Done alone is what is checked (B-09: done before its last day, it ends that day) */
    const doneSheet = p.locator('[data-testid="done-sheet"]')
    ok(await doneSheet.isVisible() && /Mark Carpentry fabrication done/.test(await p.locator('[role="dialog"][aria-label^="Mark Carpentry"]').innerText()), 'Mark done opens the Mark done sheet')
    for (const t of ['done-sheet-share', 'done-sheet-confirm-ask', 'done-sheet-invoice']) { const c = doneSheet.locator(`[data-testid="${t}"] input`); if (await c.count() && await c.isChecked() && await c.isEnabled()) await doneSheet.locator(`[data-testid="${t}"]`).click() }
    await p.locator('[data-testid="done-sheet-confirm"]').click()
    await p.waitForTimeout(1800)
    ok(sql(`select status from project_milestones where title='Carpentry fabrication' and project_id='${benjamin}'`) === 'done' && /Carpentry marked done/.test(await snack().innerText()), 'Mark done')
    await undo().click(); await p.waitForTimeout(1500)
    ok(sql(`select status || '|' || coalesce(done_at, 'none') from project_milestones where title='Carpentry fabrication' and project_id='${benjamin}'`) === 'in_progress|none', 'Undo — in progress again, no done day')

    // ── The panel ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Panel')
    await row('Painting').locator('[data-testid="milestone-name"]').click(); await p.waitForTimeout(800)
    const panel = p.locator('[data-testid="milestone-panel"]')
    ok(await panel.isVisible(), 'pressing a milestone opens its panel')
    const ptext = await panel.innerText()
    ok(/Moves with/.test(ptext) && /If carpentry moves, painting moves by the same number of days\./.test(ptext), 'Moves with Carpentry fabrication, said in a sentence')
    ok(/1 week later than first shared/.test(ptext), 'plan against actual: "1 week later than first shared"')
    ok(/0 of 3 done/.test(ptext) && /Confirm paint colours with Benjamin/.test(ptext), 'its tasks: 0 of 3 done')
    ok(/Shown to Benjamin/.test(ptext) && /Waiting on someone/.test(ptext) && /A payment falls due here/.test(ptext) && /Ask Benjamin to confirm it/.test(ptext), 'the switches: shown · waiting · payment · confirm')
    await shot('panel-1440')
    await panel.getByRole('radio', { name: 'In progress' }).click()
    await p.getByRole('button', { name: '1 day', exact: true }).click()
    await p.locator('[data-testid="panel-save"]').click(); await p.waitForTimeout(1500)
    ok(sql(`select status from project_milestones where title='Painting' and project_id='${benjamin}'`) === 'in_progress' && day('start_date', 'Painting', 'P-2026-002') === isoOf(paintStart + 1), 'Save: the status and the dates (pushed a day)')
    ok(/Painting moved 1 day later\. 2 milestones followed\./.test(await snack().innerText()), '…and the move is said, with Undo')
    await undo().click(); await p.waitForTimeout(1500)
    ok(day('start_date', 'Painting', 'P-2026-002') === isoOf(paintStart), 'the panel\'s move undone')
    await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitemradio', { name: 'Not started' }).click(); await p.waitForTimeout(1200)
    ok(sql(`select status from project_milestones where title='Painting' and project_id='${benjamin}'`) === 'not_started', 'the row\'s menu sets a status')
    /* (REG-1070) Move up answers like every change on the schedule: where it went, in one sentence, with Undo */
    const posOf = (title) => Number(sql(`select position from project_milestones where title='${title}' and project_id='${benjamin}' and deleted_at is null`))
    const paintAt = posOf('Painting')
    await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Move up' }).click(); await p.waitForTimeout(1300)
    ok(posOf('Painting') === paintAt - 1 && new RegExp(`Painting moved up — now ${paintAt}(st|nd|rd|th) of 7`).test(await snack().innerText()), `Move up: "Painting moved up — now ${paintAt}… of 7", with Undo`)
    await shot('move-up-1440')
    await undo().click(); await p.waitForTimeout(1500)
    ok(posOf('Painting') === paintAt && /Painting is back where it was/.test(await snack().innerText()), 'Undo puts it back in its place')
    await row('Painting').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Move down' }).click(); await p.waitForTimeout(1300)
    ok(posOf('Painting') === paintAt + 1 && /Painting moved down — now/.test(await snack().innerText()), 'Move down says so too')
    await undo().click(); await p.waitForTimeout(1500)
    ok(posOf('Painting') === paintAt, '…and Undo')

    // ── Add · delete with Undo ────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Add and delete')
    await p.locator('[data-testid="add-milestone"]').click(); await p.waitForTimeout(500)
    await p.getByLabel('Milestone name').fill('Snagging walk-through'); await p.locator('[data-testid="name-dialog-save"]').click(); await p.waitForTimeout(1500)
    ok(await rows().count() === 8 && day('start_date', 'Snagging walk-through', 'P-2026-002') === isoOf(nextWeekday(handEnd)), 'Add milestone: after the last, the next weekday after it ends')
    await row('Snagging').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Delete' }).click(); await p.waitForTimeout(400)
    await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(1500)
    ok(await rows().count() === 7 && /deleted/.test(await snack().innerText()), 'Delete asks first, then offers Undo')
    await undo().click(); await p.waitForTimeout(1500)
    ok(await rows().count() === 8, 'Undo brings it back')
    await row('Snagging').locator('[data-testid="milestone-kebab"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Delete' }).click(); await p.waitForTimeout(300)
    await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select date(target_end_date,'unixepoch','localtime') from projects where id='${benjamin}'`) === isoOf(handEnd), 'deleted again — the target end is the handover again')

    // ── What the client sees · Share changes ──────────────────────────────────────────────────────────────────────────────
    console.log('Share')
    await p.locator('[data-testid="client-sees"]').click(); await p.waitForTimeout(600)
    const pane = p.locator('[data-testid="client-pane"]')
    ok(await pane.isVisible() && /What Benjamin sees/.test(await pane.innerText()) && (await pane.innerText()).includes(dayMonth(sharedHandover)), `What Benjamin sees beside the list: the copy shared on ${dayMonth(shareDay)} (handover ${dayMonth(sharedHandover)})`)
    await shot('client-pane-1440')
    await p.locator('[data-testid="client-sees"]').click(); await p.waitForTimeout(300)
    await go(`/projects/${benjamin}/schedule?share=1`)   // (simplify S-02, a deliberate change of this rule) Share opens from its row / its deep link, not the header
    const dlg = p.locator('[data-testid="share-dialog"]')
    ok(await dlg.isVisible() && await dlg.locator('[data-testid="share-changes"] li').count() === 4, 'Share changes lists the four changes for Benjamin')
    ok(new RegExp(`Updated .* · Handover is now ${dayLabel(handEnd)}`).test(await dlg.innerText()), `what he will see: "Handover is now ${dayLabel(handEnd)}"`)
    await p.getByLabel('A note for Benjamin (optional)').fill(`The laminate for your wardrobes arrives a week late, so carpentry runs to ${dayMonth(carpEnd)}.`)
    await shot('share-1440')
    await p.locator('[data-testid="share-confirm"]').click(); await p.waitForTimeout(1600)
    ok(sql(`select count(*) from project_schedule_shares where project_id='${benjamin}'`) === '2' && sql(`select json_extract(snapshot,'$.handover') from project_schedule_shares where project_id='${benjamin}' order by shared_at desc limit 1`) === isoOf(handEnd), `the snapshot is stored — handover ${dayMonth(handEnd)}`)
    ok(sql(`select json_array_length(changes) from project_schedule_shares where project_id='${benjamin}' order by shared_at desc limit 1`) === '4', '…with its four changes')
    ok(/Shared 4 changes with Benjamin/.test(await snack().innerText()), 'the snackbar: "Shared 4 changes with Benjamin"')
    await go(`/projects/${benjamin}/schedule`)
    ok(/Benjamin sees this schedule\. Last shared/.test(await p.locator('[data-testid="client-sees"]').innerText()), 'nothing left to share — "Benjamin sees this schedule."')
    ok(!(await p.locator('[data-testid="project-primary"]').count()) || !(await p.locator('[data-testid="project-primary"]').innerText()).includes('Share changes'), 'the primary steps back once shared')
    ok(new RegExp(`On track for handover on ${dayLabel(handEnd)}\\.`).test(await p.locator('[data-testid="schedule-summary"]').innerText()), `the summary: "On track for handover on ${dayLabel(handEnd)}."`)
    await shot('schedule-shared-1440')
    await go(`/projects/${benjamin}/activity`)
    ok(/shared 4 changes to the schedule with Benjamin/.test(await p.locator('main').innerText()), 'Activity: the share\'s line, naming the client (fix-B, B-40)')

    // ── The Overview's Schedule card ──────────────────────────────────────────────────────────────────────────────────────
    await go(`/projects/${benjamin}`)
    /* (simplify S-01, a deliberate change of this rule) the Schedule card folded into Progress (the bar) and Coming up (what is next) */
    const card = p.locator('section[data-card="status"]').first()
    ok(await card.isVisible() && /3 of 7 milestones/.test(await card.innerText()) && await p.locator('section[data-card="coming-up"] [data-testid="coming-up-row"]').count() >= 1, 'Overview: Progress — "3 of 7 milestones" — and Coming up')
    const waitDays = TODAY - dayNo(new Date(Number(sql(`select m.waiting_since from project_milestones m where m.project_id='${benjamin}' and m.waiting_on='client' and m.deleted_at is null order by m.waiting_since limit 1`)) * 1000))
    /* (simplify S-05, a deliberate change of this rule) the client's lateness is neutral, in With Benjamin, with Remind — never a red row */
    ok(new RegExp(`waits on (Benjamin|it)[\\s\\S]*${waitDays} days so far`)   /* (simplify S-21, a deliberate change of this rule) a wait set by a shared choice folds into the choice's row: "… · Painting waits on it, n days so far" */.test(await p.locator('section[data-card="with-client"]').first().innerText()), `With Benjamin: "… waits on Benjamin · ${waitDays} days so far" (since the day he was asked)`)
    await shot('overview-1440', true)

    // ── Templates (Company › Templates › Schedules) · start Marcus's from one ────────────────────────────────────────────────
    console.log('Templates')
    await go('/company/templates/schedules')
    ok(/Whole-home renovation \(HDB\)/.test(await p.locator('main').innerText()) && /Kitchen and bathroom refresh/.test(await p.locator('main').innerText()), 'Company › Templates › Schedules: the two templates')
    await shot('templates-1440')
    await p.getByText('Kitchen and bathroom refresh').first().click(); await p.waitForTimeout(1500)
    ok(await p.locator('[data-testid="schedule-template-editor"]').isVisible() && await p.locator('[data-testid="schedule-item"]').count() === 5, 'its editor: five milestones')
    await shot('template-editor-1440')
    await go(`/projects/${marcus}`)
    /* (simplify S-17, a deliberate change of this rule) the schedule is the Start step's to ask — Before work starts leaves it out while set up */
    ok(await p.locator('[data-testid="need-start"]').count() === 1 && await p.locator('[data-testid="need-setup-schedule"]').count() === 0, 'Before work starts: Start the project; the schedule is the Start step’s')
    await go(`/projects/${marcus}/schedule`)
    ok(await p.locator('[data-testid="start-schedule"]').isVisible(), 'a project with no milestones starts here')
    await p.getByRole('combobox', { name: 'Template' }).click(); await p.waitForTimeout(300)
    await p.getByRole('option', { name: 'Kitchen and bathroom refresh' }).click(); await p.waitForTimeout(400)
    ok(/Handover around .*, 4 weeks after works start\./.test(await p.locator('[data-testid="start-schedule"]').innerText()), 'What you will get: the template laid from works start')
    await shot('start-template-1440')
    await p.locator('[data-testid="create-schedule"]').click(); await p.waitForTimeout(1800)
    ok(await rows().count() === 5 && sql(`select count(*) from lead_events where project_id='${marcus}' and kind='project_schedule_created' and detail like '%Kitchen and bathroom refresh%'`) === '1', 'Create schedule from the template — five milestones and the line')
    /* (REG-1071) the line records the template by id, and Company › Templates › Schedules counts the schedules started from it */
    const refreshId = sql(`select id from schedule_templates where name='Kitchen and bathroom refresh'`)
    ok(sql(`select json_extract(detail,'$.templateId') from lead_events where project_id='${marcus}' and kind='project_schedule_created'`) === refreshId, 'the schedule records the template it started from, by id')
    await go('/company/templates/schedules')
    const usedOf = async (name) => (await p.locator('[data-kb-row], article, [role="row"]').filter({ hasText: name }).first().innerText()).replace(/\s+/g, ' ')
    const usedRefresh = Number(sql(`select count(distinct e.project_id) from lead_events e join projects p on p.id=e.project_id where e.kind='project_schedule_created' and p.deleted_at is null and json_extract(e.detail,'$.templateId')='${refreshId}'`))
    ok(usedRefresh >= 1 && new RegExp(`${plural(usedRefresh, 'schedule')}`).test(await usedOf('Kitchen and bathroom refresh')), `Used by: "${plural(usedRefresh, 'schedule')}" for Kitchen and bathroom refresh — the schedules started from it`)
    const renoId = sql(`select id from schedule_templates where name='Whole-home renovation (HDB)'`)
    const usedReno = Number(sql(`select count(distinct e.project_id) from lead_events e join projects p on p.id=e.project_id where e.kind='project_schedule_created' and p.deleted_at is null and json_extract(e.detail,'$.templateId')='${renoId}'`))
    ok(usedReno === 0 ? !/\d+ schedules? started/.test(await usedOf('Whole-home renovation')) || /No schedule started/.test(await usedOf('Whole-home renovation')) : new RegExp(`${plural(usedReno, 'schedule')}`).test(await usedOf('Whole-home renovation')), `…and ${plural(usedReno, 'schedule')} for Whole-home renovation (HDB) (R76's Shalini Menon)`)
    await shot('templates-used-1440')

    // ── From the quote's sections (Aisha's, set up again on this copy) ──────────────────────────────────────────────────────
    console.log('From the quote')
    sql(`delete from project_milestones where project_id='${aisha}'`)
    await go(`/projects/${aisha}/schedule`)
    const st = await p.locator('[data-testid="start-schedule"]').innerText()
    ok(/One milestone for each stage of work in OM-10009/.test(st) && /Hacking & demolition/.test(st) && /Handover & defect check/.test(st), 'The signed quote: a milestone for each stage of work it has lines for')
    ok(/Payments follow the quote: 10% deposit, 30% commencement, 30% mid-project, 30% completion\./.test(st), 'how the quote\'s payments fall')
    await shot('start-quote-1440')
    await p.locator('[data-testid="create-schedule"]').click(); await p.waitForTimeout(1800)
    ok(await rows().count() === 7 && sql(`select count(*) from project_milestones where project_id='${aisha}' and payment_ref is not null`) === '3', 'seven milestones, the three estimated payments tied')

    // ── The Tasks tab: the Milestone column and filter ────────────────────────────────────────────────────────────────────
    console.log('Tasks')
    await go(`/projects/${benjamin}/tasks`)
    const theads = await p.locator('[role="columnheader"]').allInnerTexts()
    ok(theads.some((h) => /^Milestone$/i.test(h.trim())), 'a project\'s Tasks tab: a Milestone column')
    const tRow = p.locator('[data-kb-list="task"] [data-kb-row]').filter({ hasText: 'Order the kitchen cabinets' }).first()
    ok(/Carpentry fabrication/.test(await tRow.innerText()), 'the task names its milestone')
    await tRow.locator('[data-testid="task-milestone"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitemradio', { name: 'Painting' }).click(); await p.waitForTimeout(1500)
    ok(sql(`select m.title from lead_tasks t join project_milestones m on m.id=t.milestone_id where t.title='Order the kitchen cabinets'`) === 'Painting', 'put it in another milestone from the cell')
    await p.locator('[data-kb-list="task"] [data-kb-row]').filter({ hasText: 'Order the kitchen cabinets' }).first().locator('[data-testid="task-milestone"]').click(); await p.waitForTimeout(300)
    await p.getByRole('menuitemradio', { name: 'Carpentry fabrication' }).click(); await p.waitForTimeout(1500)
    await shot('tasks-milestone-1440')
    await p.locator('[data-kb="filters"]').first().click(); await p.waitForTimeout(500)
    await p.getByRole('tab', { name: 'Milestone' }).click(); await p.waitForTimeout(300)
    await p.getByRole('dialog').getByRole('button', { name: 'Painting' }).click(); await p.waitForTimeout(500)
    await p.getByRole('dialog').getByRole('button', { name: 'Done' }).click(); await p.waitForTimeout(500)
    ok(await p.locator('[data-kb-list="task"] [data-kb-row]').count() === 3, 'the Milestone filter: Painting\'s three tasks')
    const plainLead = sql(`select l.id from leads l where l.deleted_at is null and l.stage <> 'Won' and coalesce(l.direct,0)=0 and exists (select 1 from lead_tasks t where t.lead_id=l.id) limit 1`)
    await go(`/leads/${plainLead}/tasks`)
    ok(!(await p.locator('[role="columnheader"]').allInnerTexts()).some((h) => /^Milestone$/i.test(h.trim())), 'a lead with no project: the Tasks tab as it was')

    // ── The bell: reminders from dates (Michelle, Ryan's designer) ────────────────────────────────────────────────────────
    console.log('Bell')
    sql(`update members set is_you = case when id='michelle' then 1 else 0 end`)
    await go('/projects')
    await p.locator('[data-notifications-tile]').click(); await p.waitForTimeout(1200)
    const bell = await p.locator('[data-testid="notifications-panel"]').innerText()
    ok(/Overdue: Electrical & plumbing/.test(bell), 'the bell: "Overdue: Electrical & plumbing"')
    /* (REG-1072) one day count for the bell and the row: the bell's "N days late" is the row's "N days late" (fix-B, B-22), at any hour */
    const elec = TODAY - endOf('P-2026-001', 'Electrical & plumbing')
    const lateRow = p.locator('[data-testid="notification-row"]').filter({ hasText: 'Overdue: Electrical & plumbing' }).first()
    ok(new RegExp(`${plural(elec, 'day')} late`).test(await lateRow.innerText()), `the bell's day count is the row's: "${plural(elec, 'day')} late"`)
    await shot('bell-1440')
    await go(`/projects/${ryan}/schedule`)
    /* (fix-B, B-22) one word for late: the row says "was due …, N days late" */
    ok(new RegExp(`${plural(elec, 'day')} late`).test(await row('Electrical').innerText()), `…and the row says ${plural(elec, 'day')} late`)
    const carp = endOf('P-2026-001', 'Carpentry fabrication') - TODAY
    const ends = carp === 0 ? 'Ends today: Carpentry fabrication' : `Ends in ${plural(carp, 'day')}: Carpentry fabrication`
    ok(carp < 0 || carp > 3 ? !/: Carpentry fabrication/.test(bell.replace(/Overdue: Carpentry fabrication/, '')) : bell.includes(ends), carp < 0 || carp > 3 ? 'the bell: no due-soon row for Carpentry (outside three days)' : `the bell: "${ends}"`)
    sql(`update members set is_you = case when id='${wasYou}' then 1 else 0 end`)

    // ── A phone ──────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('Phone')
    const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const q = await phone.newPage()
    q.on('pageerror', (e) => errors.push(`phone: ${String(e).slice(0, 200)}`))
    await q.goto(`${BASE}/projects/${ryan}/schedule`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    ok(await q.locator('[data-testid="phone-milestone"]').count() === 7, 'a phone: the same seven rows')
    ok(/days to go · 2 of 7 done/.test(await q.locator('[data-testid="schedule-summary"]').innerText()), 'the summary\'s two lines')
    ok(await q.locator('[data-testid="add-milestone"]').isVisible(), 'Add milestone docked at the foot')
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390')
    await q.screenshot({ path: path.join(dir, 'phone-390.png') })
    /* (simplify S-25 (4)) a phone row not done carries its Done — the Mark done sheet, two presses from the schedule */
    ok(await q.locator('[data-testid="phone-done"]').count() >= 1, 'a phone row not done has its Done')
    await q.locator('[data-testid="phone-done"]').first().tap(); await q.waitForTimeout(1500)
    ok(await q.locator('[data-testid="done-sheet"]').isVisible(), '…which opens the Mark done sheet')
    await q.getByRole('button', { name: 'Cancel' }).last().tap(); await q.waitForTimeout(600)
    await q.locator('[data-testid="phone-milestone"]').nth(3).locator('[data-kb-row]').tap(); await q.waitForTimeout(900)
    ok(await q.locator('[data-testid="milestone-panel"]').isVisible(), 'a row opens its panel as a sheet')
    await q.screenshot({ path: path.join(dir, 'phone-panel-390.png') })
    await phone.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` (${errors.join(' | ')})` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ threw:', e.message.split('\n')[0])
    await shot('failure').catch(() => {})
  } finally {
    sql(`update members set is_you = case when id='${wasYou}' then 1 else 0 end`)
    await b.close()
    console.log(`\n${pass}/${pass + fail} passed`)
    process.exit(fail ? 1 : 0)
  }
})()
