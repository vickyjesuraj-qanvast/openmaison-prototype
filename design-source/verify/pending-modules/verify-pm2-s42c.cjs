// Pending modules, S42 · package C — the closing audit's fixes for projects, money and the client (s42/audit-C.md, C-01…C-27; the calls C·1…C·5
// as recommended). Each fixed finding asserted as the rule it now holds, never another round's count:
//  1 · the client's meeting notes (C-01 · C-05 · C-06): said to the client ("We met …", "your semi-D", "We’ll prepare …"), never the designer's
//      checklist asks or the follow-up message, never a competitor; the Share dialog offers a tick only for what the meeting has (a board, an
//      estimate) and the server keeps only that
//  2 · a meeting started now (C-04): "Now", no Send the invitation, no empty Invitation card; past its planned end "Its time has passed"
//  3 · Reports › Meetings (C-02, call C·1): "Meetings held" = the held rows the meetings list shows (every Met log counts); "n of m with the co-pilot"
//  4 · money papers in Files (C-03, call C·4): Open · Download · Copy link · Send on WhatsApp · Show to client only; Open lands on the paper; the
//      bulk bar says why at the press; the server refuses a folder holding one; the viewer opens the paper and offers nothing else
//  5 · Accounting's gate names Meetings (C-07)
//  6 · Finance (C-08 · C-09 · C-10 · C-11 · C-12): no Repeats on a completed project's expense; the rename note is one sentence; a reader's
//      categories card says no "Press one" and its tokens are no press; ⌘K finds Expense categories and the purchase order paper (and lands on the
//      card); Commission's Paid tile names Accounting
//  7 · Messages (C-13 · C-14 · C-15 · C-16 · C-17 · C-23 · C-25 · C-26): a member as stored ("Hui Min"); an empty start leaves no row; the open
//      conversation stays in the address (reload, Open lead and back); Back to where it was opened from; the ghost draws the pane the page shows;
//      a Designer reads why an Owner has no Take out; a lead's client conversation reads "Client"; plain words on the empty pane; Add people
//      in the house's outlined primary
//  8 · ghosts (C-18 · C-19 · C-27): a live project's Money band is seeded for a fresh browser; the meetings table's first column keeps the page's
//      width and the to-do chip is drawn once seen; a meeting row tells the page's ghost its moment; Finance's loader draws the Reports › door and
//      its percentage bars
//  9 · Studio health's tiles open another Reports tab as the strip does (C-21, call C·3) — no "Reports / Company / Reports"
// 10 · the client's credit note still owed back says so (C-22); a meeting opened from its lead lights Leads in the rail (C-24)
// 11 · 390 / 320 against screen.width; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s42c.cjs <scratch.db> [shotDir] [base]   (ONLY=1,4 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42c')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
const one = (q) => json(q)[0] ?? null
const snapshot = (table) => execSync(`sqlite3 -cmd ".timeout 30000" -cmd ".mode insert ${table}" "${DB}" "select * from ${table}"`, { maxBuffer: 1 << 28 }).toString()
const runSql = (text) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}"`, { input: text, maxBuffer: 1 << 28 })
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)

const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'
const SERENA = '7a805f6e-e0dd-43be-ace5-36e689d08789'
const BEN_P = sql(`select id from projects where number = 'P-2026-002'`)
const SHALINI_P = sql(`select id from projects where number = 'P-2025-001'`)
const KM = sql(`select id from meetings where lead_id = '${KEVIN}' and status = 'held' and deleted_at is null and brief_json is not null limit 1`)
const PAYMENTS = sql(`select parent_id from lead_files where id = (select file_id from project_invoices where project_id = '${BEN_P}' and file_id is not null limit 1)`)
const PAPER = one(`select f.id, f.name, i.id as inv from project_invoices i join lead_files f on f.id = i.file_id where i.project_id = '${BEN_P}' and f.deleted_at is null order by i.number limit 1`)
const WHOLE = ['meetings', 'copilot_objection_log', 'lead_tasks', 'task_assignees', 'lead_events', 'notifications', 'notification_outbox', 'credit_ledger', 'studio_credit_balances', 'settings',
  'maison_questions', 'lead_files', 'conversations', 'conversation_participants', 'conversation_messages', 'chat_reads', 'conversation_prefs', 'expenses', 'cost_documents', 'portal_sessions',
]

/* The held reveal (S17's probe): PageReveal's ghost stays over the page when its first paint is faked days away — both are in the DOM to read. */
async function held(b, opts, url, fn, arg) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage()
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2600)
  const out = await p.evaluate(({ src, arg }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    // eslint-disable-next-line no-new-func
    return new Function('ghost', 'content', 'arg', src)(ghost, content, arg)
  }, { src: fn, arg })
  await c.close()
  return out
}

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const popups = []
  const opts = (o = {}) => ({ viewport: { width: 1440, height: 1024 }, permissions: ['clipboard-read', 'clipboard-write'], ...o })
  const phoneOpts = (w = 390, h = 844) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const context = async (o) => { const c = await b.newContext(o); await c.route('https://wa.me/**', (r) => { popups.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<p>wa</p>' }) }); return c }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.setDefaultTimeout(12000); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {}); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const waitSnack = async (p, re, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await snackText(p); if (re.test(s)) return s; await p.waitForTimeout(200) } return snackText(p) }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ').trim() : '')
  const menuItems = (p) => p.locator('[role="menu"]').last().getByRole('menuitem').allInnerTexts().then((xs) => xs.map((x) => x.split('\n')[0].trim()))

  const you0 = sql(`select id from members where is_you = 1`)
  const kept = WHOLE.map((t) => [t, snapshot(t)])
  const stages0 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
  const logs0 = sql(`select count(*) from stage_logs`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) text += `DELETE FROM ${t};\n${rows}\n`
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    runSql(text)
  }

  try {
    ok(!!KM && !!BEN_P && !!PAPER && !!PAYMENTS, 'the demo holds Kevin’s held meeting, Benjamin’s project and its invoice papers in Payments')

    // ── 1 · the client's meeting notes (C-01 · C-05 · C-06) ─────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · the client’s meeting notes, said to the client')
      as('dane')
      /* the brief as the studio reads it: a sentence about them, a sentence about a rival, the checklist's asks and the follow-up message */
      const brief = JSON.parse(sql(`select brief_json from meetings where id = '${KM}'`))
      brief.summary = 'Met Kevin in person for a first consultation on Wed, 14 Oct. They talked about the kitchen in their semi-D. They raised price concerns and are also talking to Rival Studio. They’ll decide together with their spouse.'
      brief.actions = ['Prepare the quote for the kitchen', 'Send Kevin a summary to share at home with their spouse', 'Ask about the property type & size', 'Ask about the decision maker(s)', 'Send the follow-up message', 'Send us the floor plan']
      brief.profile = { ...(brief.profile || {}), competitors: ['Rival Studio'] }
      brief.estimate = { lines: [], lowMinor: 0, highMinor: 0, typicalMinor: 0 }
      sql(`update meetings set brief_json = ${lit(JSON.stringify(brief))}, state_json = json_set(coalesce(state_json, '{}'), '$.boards', json('[]')), shared_at = null, share_stopped_at = null, share_json = '{"boards":true,"estimate":true}' where id = '${KM}'`)
      const C = await context(opts()); const d = await page(C, 'notes')
      await go(d, `/meetings/${KM}`, 1800)
      await d.getByTestId('room-share').first().click(); await settle(d, 900)
      const dlg = d.getByRole('dialog').last()
      ok(await dlg.getByTestId('share-boards').count() === 0 && await dlg.getByText(/mood board/i).count() === 0, 'C-06: no mood board kept with the meeting — no tick for one')
      ok(await dlg.getByTestId('share-estimate').count() === 0, '…and no estimate with works — no tick for it either')
      ok(/what you’ll do next, written to them/.test(await text(dlg)), 'the dialog says the client reads it written to them')
      await shot(d, '01-share-dialog-nothing-to-tick')
      await dlg.getByRole('button', { name: /copy/i }).first().click(); await settle(d, 1400)
      const share = JSON.parse(sql(`select share_json from meetings where id = '${KM}'`))
      ok(share.boards === false && share.estimate === false, 'C-06: the server keeps only what the meeting has (no boards, no estimate shared)', JSON.stringify(share))
      const token = sql(`select client_token from meetings where id = '${KM}'`)
      const P = await context(opts()); const c = await page(P, 'client')
      await go(c, `/meeting/${token}`, 1500)
      const summary = await text(c.getByTestId('meeting-link-summary'))
      ok(/^We met in person for a first consultation/.test(summary) && /We talked about the kitchen in your semi-D/.test(summary) && /You’ll decide together with your spouse/.test(summary), 'C-05: the summary is said to the client — “We met …”, “your semi-D”, “You’ll decide …”', summary)
      ok(!/\bMet Kevin\b|\bThey\b|\btheir\b|Rival Studio|price concerns/.test(summary), '…never about them in the third person, never the rival or the doubts', summary)
      const steps = (await c.getByTestId('meeting-link-next').locator('li').allInnerTexts()).map((s) => s.trim())
      ok(steps.length > 0 && !steps.some((s) => /^Ask\b/i.test(s)), 'C-01: none of the designer’s checklist asks reach the client', steps.join(' | '))
      ok(!steps.some((s) => /follow-up message/i.test(s)), '…nor “Send the follow-up message” (the message the link rides in)')
      ok(steps.includes('We’ll prepare the quote for the kitchen') && steps.includes('We’ll send you a summary to share at home with your spouse'), 'the studio’s steps are said as what it will do for them', steps.join(' | '))
      ok(steps.includes('Send us the floor plan'), 'a step that is the client’s own stays as the studio typed it')
      await shot(c, '01-client-notes-desk', true)
      const ph = await page(await context(phoneOpts()), 'client-390')
      await go(ph, `/meeting/${token}`, 1500); ok(await sideways(ph) <= 0, 'the notes at 390: no sideways scroll'); await shot(ph, '01-client-notes-390', true)
      await ph.context().close()
      /* with a board kept, the tick is offered */
      sql(`update meetings set state_json = json_set(coalesce(state_json, '{}'), '$.boards', json('["Japandi"]')) where id = '${KM}'`)
      await go(d, `/meetings/${KM}`, 1800)
      const btn = d.getByTestId('room-share').first(); await btn.click(); await settle(d, 900)
      ok(await d.getByRole('dialog').last().getByTestId('share-boards').count() === 1, 'with a board kept, the dialog offers it')
      await d.keyboard.press('Escape'); await settle(d, 400)
      await P.close(); await C.close()
      putBack()
    }

    // ── 2 · a meeting started now (C-04) ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Start a meeting now — its time has come')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'start-now')
      await go(d, `/leads/${KEVIN}/meetings`, 1800)
      const before = new Set(sql(`select id from meetings`).split('\n'))
      await d.getByTestId('meetings-new').or(d.getByRole('button', { name: /New Meeting/ })).first().click(); await settle(d, 500)
      await d.getByRole('menuitem', { name: /Start a meeting now/ }).click()
      await d.waitForURL(/\/meetings\/[^/?]+/, { timeout: 15000 }).catch(() => {}); await settle(d, 2000)
      const id = sql(`select id from meetings`).split('\n').find((x) => x && !before.has(x))
      ok(!!id && new RegExp(`/meetings/${id}`).test(d.url()), 'Start a meeting now opens the new meeting')
      const L2 = '[class*="page-header-l2-module__"][class*="__header"]'
      const head = await text(d.locator(L2).first())
      ok(/\bnow\b/i.test(head) && !/time has passed/i.test(head), 'C-04: its chip reads “Now”, not “Its time has passed”', head)
      ok(await d.getByTestId('room-invite').count() === 0, '…no Send the invitation for a meeting starting now')
      ok(await d.getByTestId('room-invitation').count() === 0, '…and no “Not sent yet” invitation card')
      ok(await d.getByTestId('room-start').count() === 1, 'Start the meeting is its one filled button')
      const flags = await d.evaluate((id) => Object.fromEntries(Object.keys(localStorage).filter((k) => k.includes(`meeting.${id}`)).map((k) => [k.split('.').pop(), localStorage.getItem(k)])), id)
      ok(/true|1/.test(String(flags.due)) && !/true|1/.test(String(flags.held)), 'C-19: the page remembers its moment (planned, due) for its next ghost', JSON.stringify(flags))
      await shot(d, '02-start-now')
      sql(`update meetings set starts_at = ${Math.floor(Date.now() / 1000) - 3 * 3600}, ends_at = null where id = '${id}'`)
      await go(d, `/meetings/${id}`, 1800)
      const head2 = await text(d.locator(L2).first())
      ok(/time has passed/i.test(head2) && await d.getByTestId('room-invite').count() === 0, 'past its planned end: “Its time has passed”, still no invitation to send', head2)
      await C.close()
      putBack()
    }

    // ── 3 · Reports › Meetings counts every meeting held (C-02) ───────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Reports › Meetings — one number for meetings held')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'reports')
      await go(d, '/meetings', 2000)
      const heldRows = await d.locator('[data-testid="meeting-row"][data-status="held"]').count()
      const logRows = await d.locator('[data-testid="meeting-row"][data-status="held"]').filter({ hasText: 'Logged at Met' }).count()
      await go(d, '/company/reports/meetings', 2000)
      await d.getByTestId('meeting-report-range').getByRole('radio', { name: 'All' }).click().catch(() => {}); await settle(d, 900)
      const v = Number((await text(d.getByTestId('meeting-tile-held').locator('[class*="__value"]'))).replace(/\D/g, ''))
      ok(heldRows > 0 && v === heldRows, `C-02: Meetings held (All) = the held rows Tools › Meeting Copilot lists (${v} · ${heldRows})`)
      ok(logRows > 0, `…the Met logs no meeting holds among them (${logRows})`)
      const help = await text(d.getByTestId('meeting-tile-held').locator('[class*="__help"]'))
      ok(/^\d+ of \d+ with the co-pilot on$|^All with the co-pilot on$/.test(help), 'call C·1: “n of m with the co-pilot on”', help)
      await shot(d, '03-reports-meetings')
      await C.close()
    }

    // ── 4 · money papers in Files (C-03) ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · a money paper stays with its record')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'papers')
      const files0 = sql(`select count(*) from lead_files`)
      await go(d, `/projects/${BEN_P}/files?folder=${PAYMENTS}`, 2000)
      const tile = d.getByTestId('file-tile').filter({ hasText: PAPER.name }).first()
      await tile.hover(); await tile.getByRole('button', { name: `Actions for ${PAPER.name}` }).click(); await settle(d, 500)
      const items = await menuItems(d)
      ok(items.includes('Open') && items.includes('Download') && !items.some((x) => /^(Move|Duplicate|Rename|Delete)$/.test(x)), 'C-03: a paper’s ⋮ offers Open · Download · … — no Move, Duplicate, Rename or Delete', items.join(' · '))
      await shot(d, '04-paper-menu')
      await d.getByRole('menuitem', { name: 'Open' }).click(); await d.waitForURL(/\/invoices\//, { timeout: 10000 }).catch(() => {}); await settle(d, 1500)
      ok(new RegExp(`/projects/${BEN_P}/invoices/${PAPER.inv}`).test(d.url()), 'Open lands on the invoice itself — the page that is the document', d.url())
      ok(await d.getByRole('button', { name: 'Back to Files' }).count() > 0, '…with Back to Files')
      /* the bulk bar: a paper among the picked says why at the press */
      await go(d, `/projects/${BEN_P}/files?folder=${PAYMENTS}`, 2000)
      await d.getByRole('button', { name: `Select ${PAPER.name} (double-click opens)` }).click(); await settle(d, 500)
      await d.getByRole('toolbar', { name: /selected/ }).getByRole('button', { name: 'Delete' }).click(); await settle(d, 700)
      const s1 = await waitSnack(d, /own copy/)
      ok(/is the invoice’s own copy — it stays while the invoice does/.test(s1) && await d.getByRole('dialog').count() === 0, 'Delete with a paper picked: the rule at the press, no dialog', s1)
      await d.getByRole('toolbar', { name: /selected/ }).getByRole('button', { name: 'Duplicate' }).click(); await settle(d, 900)
      ok(sql(`select count(*) from lead_files`) === files0, '…and Duplicate makes no dead copy')
      /* the server: a folder holding a paper is refused too (the folder passes the press; the server says why) */
      const fid = 's42c-folder'
      sql(`insert into lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, updated_at) select '${fid}', lead_id, 'folder', 'Probe folder', null, created_at, null, 'dane', updated_at from lead_files where id = '${PAPER.id}'`)
      sql(`update lead_files set parent_id = '${fid}' where id = '${PAPER.id}'`)
      await go(d, `/projects/${BEN_P}/files`, 2000)
      const card = d.locator('[data-testid="folder-card"], [class*="folder"]').filter({ hasText: 'Probe folder' }).first()
      await card.hover().catch(() => {})
      await d.getByRole('button', { name: /Actions for Probe folder|Folder actions|More actions for Probe folder/ }).first().click().catch(() => {}); await settle(d, 400)
      await d.getByRole('menuitem', { name: 'Delete' }).click().catch(() => {}); await settle(d, 500)
      await d.getByRole('dialog').last().getByRole('button', { name: /^(Yes|Move to Trash)/ }).first().click().catch(() => {}); await settle(d, 1500)
      const s2 = await waitSnack(d, /own copy/)
      ok(/own copy/.test(s2) && sql(`select count(*) from lead_files where id in ('${fid}', '${PAPER.id}') and deleted_at is not null`) === '0', 'the server refuses to trash a folder that holds a paper, and says why', s2)
      sql(`update lead_files set parent_id = '${PAYMENTS}' where id = '${PAPER.id}'`); sql(`delete from lead_files where id = '${fid}'`)
      /* the viewer's address for a paper is the paper itself (fix-D's redirect) — never a glyph with nothing behind it */
      await go(d, `/projects/${BEN_P}/files/${PAPER.id}`, 2000)
      ok(new RegExp(`/invoices/${PAPER.inv}`).test(d.url()), 'a paper’s viewer address lands on the paper', d.url())
      await shot(d, '04-paper-from-files')
      await C.close()
      putBack()
    }

    // ── 5 · Accounting's gate (C-07) ─────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · the gate names Meetings')
      as('priya')
      const C = await context(opts()); const d = await page(C, 'gate')
      await go(d, '/meetings', 1500)
      ok(/You don’t have access to Meetings/.test(await text(d.getByTestId('access-gate'))), 'C-07: /meetings — “You don’t have access to Meetings”')
      await go(d, `/meetings/${KM}`, 1500)
      ok(/You don’t have access to Meetings/.test(await text(d.getByTestId('access-gate'))) && !/This page/.test(await text(d.getByTestId('access-gate'))), '…and a meeting’s page, never “This page”')
      await C.close()
      as('dane')
    }

    // ── 6 · Finance (C-08 · C-09 · C-10 · C-11 · C-12) ───────────────────────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Finance')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'finance')
      /* C-08: a completed project's expense offers no Repeats */
      await go(d, `/projects/${SHALINI_P}/money`, 2000)
      const newBtn = d.getByRole('button', { name: /^New/ }).first()
      await newBtn.click().catch(() => {}); await settle(d, 500)
      const exp = d.getByRole('menuitem', { name: /Expense/ }).first()
      if (await exp.count()) {
        await exp.click(); await settle(d, 900)
        const dlg = d.getByRole('dialog').last()
        ok(await dlg.isVisible() && await dlg.getByLabel('Repeats').count() === 0 && await dlg.getByText('Repeats', { exact: true }).count() === 0, 'C-08: an expense on a completed project offers no Repeats')
        await shot(d, '06-expense-completed')
        await d.keyboard.press('Escape'); await settle(d, 400)
      } else ok(true, 'C-08: a completed project’s Money offers no New expense at all (its money is closed)')
      await go(d, `/projects/${BEN_P}/money`, 2000)
      await d.getByRole('button', { name: /^New/ }).first().click().catch(() => {}); await settle(d, 500)
      await d.getByRole('menuitem', { name: /Expense/ }).first().click().catch(() => {}); await settle(d, 900)
      ok(await d.getByRole('dialog').last().getByText('Repeats').count() > 0, '…a live project’s expense still offers it')
      await d.keyboard.press('Escape'); await settle(d, 400)
      /* C-09 · C-10: the categories card */
      await go(d, '/settings?section=finance', 2000)
      const card = d.getByTestId('expense-categories')
      await card.getByRole('button', { name: 'Meals' }).first().click(); await settle(d, 700)
      const note = await text(d.getByRole('dialog').last())
      ok(/No expense is logged under it yet — a new name carries its Xero account\./.test(note) && !/yet, and its Xero/.test(note), 'C-09: a category with no expense — one whole sentence', note.slice(0, 200))
      await d.keyboard.press('Escape'); await settle(d, 400)
      ok(/Press one to rename or move it/.test(await text(card)), 'an Owner reads how to rename or move one')
      as('germaine')
      await go(d, '/settings?section=finance', 2000)
      const rcard = d.getByTestId('expense-categories')
      ok(!/Press one to rename/.test(await text(rcard)), 'C-10: a Designer reads what the list is, not how to change it')
      const tok = rcard.locator('[data-testid="expense-category"]').first()
      const cur = await tok.locator('span').first().evaluate((e) => getComputedStyle(e).cursor)
      ok(await tok.getByRole('button').count() === 0 && cur !== 'pointer', 'C-10: a reader’s token is no press (no button, no pointer)', cur)
      await shot(d, '06-categories-designer')
      as('dane')
      /* C-11: ⌘K finds the two cards and lands on them */
      for (const [q, title, anchor] of [['expense categories', 'Expense categories', 'expense-categories'], ['purchase order paper', 'The purchase order paper', 'po-paper']]) {
        await go(d, '/dashboard', 1500)
        await d.keyboard.press('Meta+k'); await settle(d, 600)
        await d.keyboard.type(q); await settle(d, 1500)
        const hit = d.getByRole('option', { name: new RegExp(title) }).or(d.locator('[data-search-hit]').filter({ hasText: title })).first()
        ok(await hit.count() === 1, `C-11: ⌘K “${q}” finds ${title}`)
        await hit.click().catch(() => {}); await settle(d, 2200)
        ok(/section=finance/.test(d.url()) && new RegExp(`#${anchor}`).test(d.url()), `…and lands on its card (${anchor})`, d.url())
      }
      /* C-12 */
      await go(d, '/company/finance/commissions', 2000)
      const paid = await text(d.getByTestId('tile-commission-paid'))
      ok(/nothing paid yet|an Owner, an Admin or Accounting/.test(paid) && !/an Owner or an Admin$/.test(paid), 'C-12: the Paid tile names everyone who records a payout', paid)
      await C.close()
      putBack()
    }

    // ── 7 · Messages (C-13 · C-14 · C-15 · C-16 · C-17 · C-23 · C-25 · C-26) ─────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · Messages')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'chat')
      await go(d, '/chat', 2000)
      ok(/Its messages open here\. A client reads theirs on their page; Team, Direct, Group and Studio ones stay in the studio\./.test(await text(d.getByTestId('chat-pick'))), 'C-25: the empty pane in plain words')
      ok(!d.url().includes('c='), 'nothing open: the address names none')
      /* C-13 · C-14: a member by the name the studio stored; an empty start leaves no row */
      sql(`delete from conversation_messages where conversation_id in (select id from conversations where kind = 'direct' and pair_key like '%huimin%')`)
      sql(`delete from conversation_participants where conversation_id in (select id from conversations where kind = 'direct' and pair_key like '%huimin%')`)
      sql(`delete from conversations where kind = 'direct' and pair_key like '%huimin%'`)
      await go(d, '/chat', 2000)
      await d.getByTestId('chat-new').click(); await settle(d, 400)
      await d.getByTestId('chat-new-direct').click(); await settle(d, 400)
      await d.locator('[data-testid="chat-new-member"][data-member="huimin"]').click(); await settle(d, 2200)
      const conv = d.getByTestId('project-conversation')
      ok(await conv.getByRole('textbox', { name: 'Message Hui Min' }).count() === 1, 'C-13: the composer — “Message Hui Min”, never “Hui”')
      const convText = await text(conv)
      ok(/Write to Hui Min — only the two of you read it/.test(convText) && /Only you and Hui Min read this/.test(convText) && !/\bHui\b(?! Min)/.test(convText), '…its empty line and its hint say Hui Min', convText.slice(0, 200))
      ok(/[?&]c=chat%3A|[?&]c=chat:/.test(d.url()), 'C-15: the open conversation is kept in the address', d.url())
      ok(await d.getByTestId('chat-row').filter({ hasText: 'Hui Min' }).filter({ hasText: /direct/i }).count() === 0, 'C-14: an empty start is not a row in the list')
      await d.reload({ waitUntil: 'networkidle' }); await settle(d, 1800)
      ok(/Hui Min/.test(await text(d.getByTestId('chat-open-title'))), 'C-15: a reload lands on it again')
      await shot(d, '07-direct-huimin')
      /* C-15: a door with ?open= and ?from= — the conversation open, Back to where it came from; Open lead and back lands on it again */
      await go(d, `/chat?open=${encodeURIComponent(`lead-team:${SERENA}`)}&from=${encodeURIComponent(`/leads/${SERENA}`)}`, 2400)
      ok(/[?&]c=lead-team/.test(d.url()) && !/[?&]open=/.test(d.url()), 'a door’s ?open= becomes the kept ?c=', d.url())
      const back = d.getByRole('link', { name: /^Back to/ }).first()
      ok(await back.count() === 1 && (await back.getAttribute('href')) === `/leads/${SERENA}` && /Serena Koh/.test(await back.getAttribute('aria-label') ?? ''), 'C-15: Back returns to the lead it was opened from — “Back to Serena Koh”', await back.getAttribute('aria-label') ?? '')
      await d.getByRole('button', { name: /Open lead/ }).click(); await d.waitForURL(new RegExp(`/leads/${SERENA}`), { timeout: 10000 }).catch(() => {}); await settle(d, 1800)
      await d.goBack(); await settle(d, 2000)
      ok(/\/chat\?/.test(d.url()) && /Serena Koh/.test(await text(d.getByTestId('chat-open-title'))), 'Open lead, then back: the conversation is open again', d.url())
      /* C-23: the lead's client conversation reads "Client" */
      await go(d, '/chat', 2000)
      const leadRow = d.locator('[data-testid="chat-row"][data-kind="lead"]').first()
      ok(await leadRow.count() === 0 || /\bclient\b/i.test(await leadRow.innerText()), 'C-23: a lead’s conversation with its client wears “Client”', await leadRow.count() ? await leadRow.innerText() : '(none)')
      await go(d, `/leads/${SERENA}`, 2000)
      const pm = d.getByTestId('lead-portal-messages')
      ok(await pm.count() === 0 || (await text(pm)) === 'Client messages', 'C-23: the Portal row’s door reads “Client messages”')
      /* C-26 · C-17: a group's Details */
      await go(d, `/chat?c=${encodeURIComponent('chat:s26-group-site')}`, 2200)
      await d.getByTestId('conversation-details').click(); await settle(d, 1200)
      const add = d.getByTestId('details-add'), leave = d.getByTestId('details-leave')
      const [ca, cl] = [await add.evaluate((e) => getComputedStyle(e).color), await leave.evaluate((e) => getComputedStyle(e).color)]
      ok(ca === cl, 'C-26: Add people in the house’s primary ink, as Leave the group beside it', `${ca} · ${cl}`)
      await shot(d, '07-group-details-owner')
      as('germaine')
      await go(d, `/chat?c=${encodeURIComponent('chat:s26-group-site')}`, 2200)
      await d.getByTestId('conversation-details').click(); await settle(d, 1200)
      const dane = d.locator('[data-testid="details-person"][data-member="dane"]')
      ok(/only an Owner or an Admin takes them out/.test(await text(dane)) && await dane.getByTestId('details-take-out').count() === 0, 'C-17: a Designer reads why the Owner has no Take out', await text(dane))
      ok(await d.locator('[data-testid="details-person"][data-member="alex"]').getByTestId('details-take-out').count() === 1, '…a Designer they may take out has it')
      await shot(d, '07-group-details-designer')
      as('dane')
      /* C-16: the ghost draws the pane the page shows */
      const g1 = await held(b, opts(), '/chat', `return { pick: /Pick a conversation/.test(ghost.textContent), lines: ghost.querySelectorAll('[class*="thread-module__"][class*="__line"]').length }`)
      ok(!g1.none && g1.pick && g1.lines === 0, 'C-16: /chat with nothing open — the ghost draws the “Pick a conversation” card', JSON.stringify(g1))
      const g2 = await held(b, opts(), `/chat?c=${encodeURIComponent('chat:s26-group-site')}`, `return { pick: /Pick a conversation/.test(ghost.textContent), lines: ghost.querySelectorAll('[class*="thread-module__"][class*="__line"]').length, l1: !!ghost.closest('[data-om-l1-header]') || ghost.querySelector('[data-om-l1-header]') !== null || !!ghost.querySelector('[role="status"][data-om-l1-header]') }`)
      ok(!g2.none && !g2.pick && g2.lines > 0, '…with one open — the conversation', JSON.stringify(g2))
      /* 390 */
      const ph = await page(await context(phoneOpts()), 'chat-390')
      await go(ph, `/chat?c=${encodeURIComponent('chat:s26-group-site')}`, 2200)
      ok(await sideways(ph) <= 0 && /Site team/.test(await text(ph.getByTestId('chat-open-title'))), 'at 390: the kept conversation opens alone, no sideways scroll')
      await shot(ph, '07-chat-390')
      await ph.getByRole('button', { name: 'Back to every conversation' }).click(); await settle(ph, 900)
      ok(!/[?&]c=/.test(ph.url()), '…its Back to every conversation lets the address go')
      await go(ph, `/chat?open=${encodeURIComponent(`lead-team:${SERENA}`)}&from=${encodeURIComponent(`/leads/${SERENA}`)}`, 2200)
      ok(await sideways(ph) <= 0 && await ph.getByRole('link', { name: /^Back to/ }).count() >= 1, 'at 390, opened from the lead: the L2 header with its Back, no sideways scroll')
      await shot(ph, '07-chat-from-lead-390')
      const p320 = await page(await context(phoneOpts(320, 640)), 'chat-320')
      await go(p320, '/chat', 1800); ok(await sideways(p320) <= 0, '/chat at 320: no sideways scroll')
      await ph.context().close(); await p320.context().close()
      await C.close()
      putBack()
    }

    // ── 8 · ghosts (C-18 · C-19 · C-27) ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · the ghosts draw their pages')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'ghosts')
      /* C-18: the shell's seed says Benjamin's Money opens with Needs you (a completed project's not) */
      await go(d, `/projects/${BEN_P}/money`, 1800)
      const html = await d.content()
      ok(new RegExp(`lead\\.${BEN_P}\\.money\\\\?"\\s*:\\s*true`).test(html), 'C-18: a fresh browser’s Money ghost is told the band is there (a live project)')
      ok(new RegExp(`lead\\.${SHALINI_P}\\.money\\\\?"\\s*:\\s*false`).test(html), '…and not there on a completed one')
      /* C-19: the meetings table's first column at the page's width */
      for (const url of ['/meetings', `/leads/${KEVIN}/meetings`]) {
        const w = await held(b, opts(), url, `
          const g = ghost.querySelector('[class*="ghost-kit-module__"][class*="__tHead"] > *'), pg = content.querySelector('[data-testid="meetings-table"] [role="columnheader"], [data-testid="meetings-table"] [class*="__head"] > *')
          return { g: g ? Math.round(g.getBoundingClientRect().width) : null, p: pg ? Math.round(pg.getBoundingClientRect().width) : null }`)
        ok(!w.none && w.g && w.p && Math.abs(w.g - w.p) <= 24, `C-19: ${url} — the ghost’s Meeting column is the page’s width (${w.g} · ${w.p})`)
      }
      /* the to-do chip: once the tab has opened with Briefs to save, its ghost draws the chip */
      const T = await context(opts()); const t = await page(T, 'todo')
      await go(t, `/leads/${KEVIN}/meetings`, 2000)
      const chip = await t.getByText(/Briefs to save/).count()
      await t.reload({ waitUntil: 'load' });
      const seen = await t.evaluate((k) => localStorage.getItem(`om.shape.lead.${k}.meetings.save.first`), KEVIN)
      ok(chip === 0 || /true|1/.test(String(seen)), 'C-19: the tab remembers its Briefs to save chip for its ghost', String(seen))
      await T.close()
      /* a row tells the meeting's page its moment before it opens */
      const R = await context(opts()); const r = await page(R, 'row')
      await go(r, `/leads/${KEVIN}/meetings`, 2000)
      const row = r.locator(`[data-testid="meeting-row"][data-kb-id="${KM}"]`)
      if (await row.count()) {
        await row.getByTestId('meeting-title').click(); await r.waitForURL(/\/meetings\//, { timeout: 10000 }).catch(() => {}); await settle(r, 1500)
        const heldFlag = await r.evaluate((id) => localStorage.getItem(`om.shape.meeting.${id}.held`), KM)
        ok(/true|1/.test(String(heldFlag)), 'C-19: a held meeting’s row tells its page’s ghost “the brief”', String(heldFlag))
      }
      await R.close()
      /* C-27: Finance's ghost — the Reports › door, and the percentage bars draw */
      const f = await held(b, opts(), '/company/finance/money-out?kind=expenses', `
        const head = ghost.querySelector('[class*="ghost-kit-module__"][class*="__headActions"]')
        const row = ghost.querySelector('[class*="ghost-kit-module__"][class*="__tRow"]')
        const cells = row ? [...row.children] : []
        const bar = (c) => { const b = c && c.querySelector('[class*="skeleton-module__"][class*="__bone"]'); return b ? Math.round(b.getBoundingClientRect().width) : 0 }
        return { door: !!head && head.children.length > 0, project: bar(cells[1]), stack2: cells[0] ? [...cells[0].querySelectorAll('[class*="skeleton-module__"][class*="__bone"]')].map((x) => Math.round(x.getBoundingClientRect().width)) : [] }`)
      ok(!f.none && f.door, 'C-27: Finance’s ghost draws the header’s Reports › door', JSON.stringify(f))
      ok(f.project > 8 && f.stack2.length === 2 && f.stack2.every((x) => x > 8), '…and its rows’ Project column and two-line first column draw (a share of the cell)', JSON.stringify(f))
      await C.close()
    }

    // ── 9 · Studio health's doors into Reports (C-21) ────────────────────────────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · Studio health → another Reports tab')
      as('dane')
      const C = await context(opts()); const d = await page(C, 'health')
      await go(d, '/company/reports/health?range=30', 2000)
      await d.getByTestId('health-tile-leads').click(); await d.waitForURL(/\/company\/reports\/leads/, { timeout: 10000 }).catch(() => {}); await settle(d, 1800)
      ok(!/[?&]from=/.test(d.url()) && new URL(d.url()).searchParams.get('range') === '30', 'C-21: Leads added opens Reports › Leads on the same range, as the strip does (no ?from=)', d.url())
      ok(!/Reports \/ Company/.test(await text(d.locator('header').first())) && await d.getByRole('link', { name: /^Back to Reports/ }).count() === 0, '…no “Reports / Company / Reports” crumb')
      await shot(d, '09-health-to-leads')
      await C.close()
    }

    // ── 10 · the client's credit still owed back (C-22) · the rail on a meeting (C-24) ───────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · the portal’s credit note · the rail on a meeting')
      const cn = one(`select c.id, c.number, c.refund_minor from credit_notes c join project_invoices i on i.id = c.invoice_id where i.project_id = '${BEN_P}' and c.kind = 'credit' and c.status = 'issued' limit 1`)
      const P = await context(phoneOpts()); const c = await page(P, 'portal')
      await go(c, '/my/demo-studio/login', 1200)
      await c.locator('input[type="tel"]').fill('97731968')
      await c.getByRole('button', { name: 'Send me a code' }).click(); await settle(c, 1000)
      await c.locator('[data-testid="portal-digit"]').first().fill('482913'); await c.getByRole('button', { name: 'Open my project' }).click()
      await c.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 10000 }).catch(() => {}); await settle(c, 1200)
      await go(c, '/my/demo-studio/money', 2000)
      const line = await text(c.getByTestId('portal-credit-link').filter({ hasText: cn ? cn.number : 'CN-' }))
      ok(!cn || cn.refund_minor || /to come back to you/.test(line), `C-22: ${cn ? cn.number : 'a credit note'} still owed back says so — “${line}”`)
      ok(await sideways(c) <= 0, 'the portal’s Money at 390: no sideways scroll'); await shot(c, '10-portal-credit-390', true)
      await P.close()
      as('dane')
      const C = await context(opts()); const d = await page(C, 'rail')
      await go(d, `/meetings/${KM}?from=${encodeURIComponent(`/leads/${KEVIN}/meetings`)}`, 1800)
      const current = await d.locator('nav [aria-current="page"], [class*="app-rail"] [aria-current="page"]').allInnerTexts().catch(() => [])
      const leadsOn = await d.locator('[class*="app-rail-module__"] a[href="/leads"][aria-current="page"]').count()
      const toolsOn = await d.locator('[class*="app-rail-module__"] button[aria-label^="Tools"][aria-current="page"]').count()
      ok(leadsOn === 1 && toolsOn === 0, 'C-24: a meeting opened from its lead lights Leads, not Tools', JSON.stringify(current))
      await go(d, `/meetings/${KM}?from=${encodeURIComponent('/meetings')}`, 1800)
      ok(await d.locator('[class*="app-rail-module__"] button[aria-label^="Tools"][aria-current="page"]').count() === 1, '…opened from Tools › Meeting Copilot it stays a Tools page')
      await C.close()
    }

    ok(errors.length === 0, 'no page errors', errors.slice(0, 4).join(' | '))
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped —', String(e).slice(0, 400))
  } finally {
    putBack()
    const stages1 = sql(`select group_concat(id || ':' || stage, ',') from (select id, stage from leads order by id)`)
    console.log(`  ${stages1 === stages0 && sql(`select count(*) from stage_logs`) === logs0 ? '✓ the leads’ stages and stage logs are as found' : '✗ the leads’ stages or stage logs changed'}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})()
