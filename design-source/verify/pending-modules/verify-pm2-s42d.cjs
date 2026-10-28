// Pending modules, step S42D · AI and design tools — the fixes for audit D (s42/audit-D.md, D-01…D-19) and its calls D·1 · D·3 · D·4 (fixed as
// recommended, listed in s42/calls-for-vicky.md). Each check asserts the rule the finding asked for, never another round's count:
//  1 · Maison AI's Ask box: a member's whole name outweighs a client's first name (D-01); Accounting's line names the role once (D-03);
//      Accounting naming a client is told why (D-04); a running project's lead is no lead "needing attention", and the overview's overdue count
//      is the attention list's (D-11); "AI credits" every time (D-13); a 7-day window says "in the last 7 days" (D-14)
//  2 · the sheet opened from the keyboard takes focus to its Ask box, and Escape gives it back to the button; a mouse press leaves it (D-06)
//  3 · the template editor's "Which quotes print with it?" counts what the gallery counts — the default's blank-template quotes too (D-02)
//  4 · Plans › Compare everything: one name per thing, only what each plan keeps (D-09)
//  5 · the 3D Space Planner: "Furnish" only a bare room, else "Re-arrange" (D-12); an open side's words (D-18); Maison AI is the ⋮'s first row
//      at ≤1024 and nowhere else (D-05 · D·3); the 3D picture's *Download a turning clip* records one whole turn and downloads it (D·1)
//  6 · Make a 3D picture: *Square it by its corners* — four named handles, a crossed quad refused, Square it, Undo (D·1); a slug file name read
//      as words, "Traced — Waterway sunrise" (D-15)
//  7 · the AI Visualizer's running card says Stop, as its result does (D-16)
//  8 · View as › Studio plan: Pro — Studio puts the base back exactly — seats without Accounting, the same months, the top-ups — with no new
//      invoice; with no base, a new month is billed; Almost out's adjustment is no use, so a spend raises no 90% alert (D-10 · D·4)
//  9 · on Free: one upgrade ask while it waits, said where it came from, and the lock / panel / Plans / billing say it with its day (D-07);
//      the locked template editor carries Maison AI (D-17)
// 10 · the developers' bench, shut: its 404's page data names nothing of it (D-19); "3D" without a hyphen in the app's source (REG-1841)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Every table it changes is put back in `finally` (a
// whole-table hash before and after says so).
// Usage: BASE=http://localhost:3170 NODE_PATH=<repo>/node_modules node verify-pm2-s42d.cjs <scratch.db> [shotDir] [base]   (ONLY=1,5 runs some)
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { execSync } = require('child_process')
/* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-40) the studio block's menu opens Your profile · Sign out; View as, the studio's
   plan and the studios sit under its Demo fold — opened here before they are pressed (the fold is remembered per browser once open) */
const openDemo = async (pg) => { const m = pg.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first(); await m.waitFor({ timeout: 8000 }).catch(() => {}); const f = m.getByTestId('demo-fold'); if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await pg.waitForTimeout(300) } return m }
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s42d')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3170'
const REPO = path.join(__dirname, '..', '..', '..')
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean).map(Number)
const want = (n) => !ONLY.length || ONLY.includes(n)
const shq = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const n = (q) => Number(sql(q) || 0)
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s42d-${process.pid}-${Date.now()}.sql`); fs.writeFileSync(f, text); try { execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }) } finally { fs.unlinkSync(f) } }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name, more) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more !== undefined ? `— ${typeof more === 'string' ? more : JSON.stringify(more)}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PHOTO = path.join(REPO, 'public', 'planner', 'demo', 'floor-plan-photo-waterway-sunrise.jpg')
const SHOW = sql(`select id from space_layouts where name='Showroom — HDB 4-Room' and deleted_at is null limit 1`)
const DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'   // Kevin Ng's design (R61)

;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => crypto.createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t) && t !== 'members')
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }
  const desk = () => b.newContext({ viewport: { width: 1440, height: 1024 }, acceptDownloads: true })
  const phoneCtx = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, acceptDownloads: true })
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1800) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const snackText = async (p) => (await p.locator('[role="status"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ')
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  /* Maison AI's sheet */
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }
  const panel = (p) => sheet(p).locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first()
  const waitPanel = (p) => p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"],[data-testid="maison-proposal"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
  const ask = async (p, q) => {
    if (!(await sheet(p).isVisible().catch(() => false))) await fab(p)
    else await sheet(p).locator('[data-testid="maison-back"]').click().catch(() => {})
    const box = sheet(p).locator('[data-testid="maison-ask"] input')
    await box.fill(q); await box.press('Enter')
    await waitPanel(p); await settle(p, 300)
    const pn = panel(p)
    return { title: (await pn.locator('span[class*="title"]').first().innerText().catch(() => '')).trim(), all: await text(pn), rows: await pn.locator('[data-testid="maison-row"]').allInnerTexts().catch(() => []) }
  }
  const closeSheet = async (p) => { await p.keyboard.press('Escape'); await settle(p, 400) }
  const demoPlan = async (p, name) => {
    if (!(await p.getByRole('button', { name: /^Demo Studio/ }).count())) await go(p, '/leads')
    await p.getByRole('button', { name: /^Demo Studio/ }).first().click(); await settle(p, 400)
    await (await openDemo(p)).getByTestId('demo-plan').getByRole('menuitemradio', { name }).click()
    await settle(p, 2600)
  }
  const bal = () => json(`select plan_credits as p, topup_credits as t, period_start as s, period_end as e from studio_credit_balances where id = 'studio'`)[0]
  const ledgerSum = () => n(`select coalesce(sum(case when reason = 'shadow_spend' then 0 else credits end), 0) from credit_ledger`)
  const sub = () => json(`select id, plan_id as plan, status, seats, current_period_start as s, current_period_end as e from subscriptions where cancelled_at is null order by created_at desc limit 1`)[0]
  const photoDialog = (p) => p.locator('[role="dialog"][aria-label="Make a 3D picture"]')
  const waitPicture = (p) => p.waitForFunction(() => !!document.querySelector('[data-testid="photo-picture"]'), null, { timeout: 30000 }).catch(() => {})
  const pictureFacts = (p) => p.getByTestId('photo-picture').evaluate((x) => ({ angle: Number(x.getAttribute('data-angle')), w: Number(x.getAttribute('data-width')), h: Number(x.getAttribute('data-height')) }))
  const lineOf = (p) => text(p.getByTestId('photo-line'))

  try {
    as('dane')
    const ctx = await desk()
    const d = await page(ctx, 'desk')
    await go(d, '/tasks', 2500)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button

    // ── 1 · Maison AI's answers ─────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(1)) {
      console.log('1 · Maison AI: who a name means, the books’ refusal, the handed-over leads, the words')
      const member = json(`select id, name from members where role = 'Accounting' and is_active = 1 limit 1`)[0]
      const first = member.name.split(' ')[0]
      const client = json(`select name from leads where deleted_at is null and lower(name) like '${first.toLowerCase()} %' and lower(name) <> '${member.name.toLowerCase()}' limit 1`)[0]
      ok(!!client, `the demo has a client who shares only ${first}’s first name (${client?.name})`)
      for (const who of ['germaine', 'dane']) {
        as(who); await go(d, '/tasks', 1500)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
        const a = await ask(d, member.name)
        ok(new RegExp(`What ${first} is working on`).test(a.title) && !(client && a.all.includes(client.name)), `D-01 · ${who}: “${member.name}” answers about the member, not ${client?.name} — “${a.title}”`, a.all.slice(0, 160))
        await closeSheet(d)
      }
      as('dane'); await go(d, '/tasks', 1500)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
      const c = await ask(d, client.name)
      ok(c.title === client.name, `D-01 · a client’s whole name still answers about the client — “${c.title}”`)
      const team = await ask(d, 'who is on the team')
      const row = team.rows.find((r) => r.includes(member.name)) ?? ''
      ok(/Accounting/.test(row) && !/Accounting · Accounting/.test(row), `D-03 · the team list names Accounting once — “${row.replace(/\s+/g, ' ')}”`)
      await closeSheet(d)
      as(member.id); await go(d, '/company/finance/todo', 2000)
      const self = await ask(d, member.name)
      ok(!/Accounting · Accounting/.test(self.all), `D-03 · ${first}’s own answer names the role once — “${self.all.slice(0, 90)}”`)
      const lead = json(`select l.name from leads l where l.deleted_at is null and l.direct = 0 and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) and l.name not like '${first} %' order by l.created_at limit 1`)[0]
      const acc = await ask(d, lead.name)
      ok(acc.title !== 'I can’t answer that yet' && (acc.title === 'Not for Accounting' || /^Statement/.test(acc.title)) && /Accounting keeps the books|Statement/.test(acc.all), `D-04 · Accounting naming a client (${lead.name}) is told why — “${acc.title}”`)
      await shot(d, '01-accounting-client-1440')
      await closeSheet(d)
      as('dane'); await go(d, '/tasks', 1500)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
      const handed = sql(`select l.name from leads l join projects p on p.lead_id = l.id and p.deleted_at is null where l.deleted_at is null and l.direct = 0`).split('\n').filter(Boolean)
      const att = await ask(d, 'Which leads need attention?')
      const named = att.rows.map((r) => r.split('\n')[0].trim())
      ok(handed.length > 0 && !named.some((x) => handed.some((h) => h.toLowerCase() === x.toLowerCase())), `D-11 · no lead with a live project “needs attention” (${handed.join(', ')} left out)`, named)
      const lateRows = att.rows.filter((r) => /Overdue follow-up/.test(r)).length
      const ov = await ask(d, 'How is the studio doing today?')
      const lateWord = /(\d+) with an overdue follow-up/.exec(ov.all)
      ok((lateWord ? Number(lateWord[1]) : 0) === lateRows, `D-11 · the overview’s overdue count is the attention list’s (${lateWord ? lateWord[1] : 0} = ${lateRows})`, ov.all.slice(0, 200))
      ok(/in the last 7 days/.test(ov.all) && !/new leads? this week/.test(ov.all), 'D-14 · the overview’s new leads say “in the last 7 days”')
      await closeSheet(d)
      await go(d, '/company/portal', 2000)
      const portal = await ask(d, 'Who has opened their portal this week?')
      ok(/in the last 7 days/.test(portal.title) && !/this week/.test(portal.title), `D-14 · the portal’s visits say “in the last 7 days” — “${portal.title}”`)
      await closeSheet(d)
      for (const who of ['germaine', 'dane']) {
        as(who); await go(d, '/tasks', 1500)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
        const cr = await ask(d, 'Who used the most AI credits this month?')
        const bare = cr.all.replace(/AI credits?/g, '').match(/\bcredits?\b/g)
        ok(!bare, `D-13 · ${who}: the credits answer says “AI credits” every time — “${cr.all.slice(0, 120)}”`, bare)
        await closeSheet(d)
      }
      const rf = await ask(d, 'When do our AI credits refresh?')
      ok(/refresh/i.test(rf.title) && !rf.all.replace(/AI credits?/g, '').match(/\b\d[\d,]* credits\b/), `D-13 · the refresh answer too — “${rf.all.slice(0, 120)}”`)
      await closeSheet(d)
    }

    // ── 2 · the sheet and the keyboard ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(2)) {
      console.log('2 · Maison AI from the keyboard')
      as('dane'); await go(d, '/tasks', 1800)   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
      const fabBtn = d.locator('button[aria-label="Maison AI"]').last()
      await fabBtn.focus(); await d.keyboard.press('Enter'); await settle(d, 900)
      const inAsk = await d.evaluate(() => !!document.activeElement?.closest('[data-testid="maison-ask"]') && document.activeElement?.tagName === 'INPUT')
      ok(await sheet(d).isVisible() && inAsk, 'D-06 · Enter on the button opens the sheet with focus in its Ask box')
      await d.keyboard.press('Tab'); await settle(d, 200)
      ok(await d.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="Maison AI suggestions"]')), 'D-06 · Tab walks on inside the sheet (never to “Skip to content”)')
      await d.keyboard.press('Escape'); await settle(d, 700)
      ok(!(await sheet(d).isVisible().catch(() => false)) && await d.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Maison AI'), 'D-06 · Escape closes it and gives focus back to the button')
      await go(d, '/tasks', 1500)   // a fresh page: the mouse is the last thing used   // (Dashboard redesign 2026-10-26, a deliberate change) the Dashboard's Maison AI is the docked field (Q-02) — the sheet is asked on a page that keeps the floating button
      await d.locator('button[aria-label="Maison AI"]').last().click(); await settle(d, 900)
      ok(await sheet(d).isVisible() && !(await d.evaluate(() => !!document.activeElement?.closest('[data-testid="maison-ask"]'))), 'D-06 · a mouse press leaves focus where it was (no keyboard pops up on a phone)')
      await closeSheet(d)
    }

    // ── 3 · the template editor's count ─────────────────────────────────────────────────────────────────────────────────────────────
    if (want(3)) {
      console.log('3 · Which quotes print with the default template')
      as('dane')
      const def = json(`select id, name from quote_templates where is_default = 1 and deleted_at is null limit 1`)[0]
      const expected = n(`select count(*) from quotes q join leads l on l.id = q.lead_id where (q.template_id = '${def.id}' or q.template_id is null) and q.deleted_at is null and q.archived_at is null and l.deleted_at is null and q.kind = 'quote'`)
      const blank = n(`select count(*) from quotes q join leads l on l.id = q.lead_id where q.template_id is null and q.deleted_at is null and q.archived_at is null and l.deleted_at is null and q.kind = 'quote'`)
      await go(d, `/templates/${def.id}`, 3000)
      await fab(d)
      await sheet(d).getByRole('button', { name: 'Which quotes print with it?', exact: true }).click(); await settle(d, 800)
      const t = (await panel(d).locator('span[class*="title"]').first().innerText().catch(() => '')).trim()
      /* (S44Q — row 312, a deliberate change of this rule) a Blank Quote is pinned to the default now (R173 pinned the older ones), so none print
         through it unpinned — the count still has to be the gallery's */
      ok(new RegExp(`^${expected} quotes? prints? with it$`).test(t), `D-02 · ${def.name}: “${t}” — the gallery’s ${expected} (${blank} with no template print through the default)`)
      await shot(d, '02-template-count-1440')
      await closeSheet(d)
      await go(d, '/company/templates/quotes', 2500)
      ok(new RegExp(`Used by ${expected} quotes?`).test(await text(d.locator('main'))), `D-02 · the gallery card says the same number (${expected})`)
    }

    // ── 4 · Plans › Compare everything ──────────────────────────────────────────────────────────────────────────────────────────────
    if (want(4)) {
      console.log('4 · Plans › Compare everything')
      as('dane'); await go(d, '/company/plan/billing', 2500)
      await d.getByTestId('billing-change-plan').click(); await settle(d, 900)
      const plans = d.getByRole('dialog', { name: 'Plans' })
      await plans.getByRole('button', { name: 'Compare everything' }).click(); await settle(d, 500)
      const t = await text(plans)
      ok(/Quotes print with the studio’s default/.test(t) && /Your own quote templates/.test(t) && !/Template editor/.test(t) && !/\bQuote templates\b/.test(t), 'D-09 · one name per thing: “Quotes print with the studio’s default” (Free keeps it) and “Your own quote templates” (the lock’s words)')
      const maisonRow = await plans.locator('tr', { hasText: 'Maison AI' }).first().innerText().catch(() => '')
      ok(!!maisonRow && !/AI credits/.test(maisonRow), `D-09 · Maison AI costs nothing on any plan — the row says no AI credits (“${maisonRow.replace(/\s+/g, ' ')}”)`)
      await shot(d, '03-plans-compare-1440')
      await d.keyboard.press('Escape'); await settle(d, 500)
    }

    // ── 5 · the 3D Space Planner ────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(5)) {
      console.log('5 · the planner: furnish or re-arrange, an open side, Maison AI ≤1024, the turning clip')
      as('dane')
      const inRoom = (q, r) => q.x >= r.x && q.x <= r.x + r.w && q.z >= r.z && q.z <= r.z + r.d
      const plan0 = JSON.parse(sql(`select plan from space_layouts where id = '${SHOW}'`))
      await go(d, `/planner/${SHOW}`, 3500)
      await fab(d)
      let sug = (await sheet(d).locator('button[class*="suggestion"]').allInnerTexts()).map((s) => s.trim())
      const master = plan0.rooms.find((r) => r.kind === 'master')
      ok(sug.includes(`Re-arrange the ${master.name.toLowerCase()}`) && !sug.some((s) => /^Furnish the /.test(s)), `D-12 · every bedroom furnished: “Re-arrange the ${master.name.toLowerCase()}”, never “Furnish” over its pieces`, sug)
      await closeSheet(d)
      /* the master bedroom emptied (put back at the end): now it is offered to furnish */
      const bare = { ...plan0, pieces: plan0.pieces.filter((q) => !inRoom(q, master)) }
      sqlFile(`UPDATE space_layouts SET plan = ${lit(JSON.stringify(bare))} WHERE id = '${SHOW}';`)
      await go(d, `/planner/${SHOW}`, 3500)
      await fab(d)
      sug = (await sheet(d).locator('button[class*="suggestion"]').allInnerTexts()).map((s) => s.trim())
      ok(sug.includes(`Furnish the ${master.name.toLowerCase()}`), `D-12 · a bare master bedroom: “Furnish the ${master.name.toLowerCase()}”`, sug)
      await closeSheet(d)
      sqlFile(`UPDATE space_layouts SET plan = ${lit(JSON.stringify(plan0))} WHERE id = '${SHOW}';`)
      await go(d, `/planner/${SHOW}`, 3500)
      /* an open side */
      const living = plan0.rooms.find((r) => Object.values(r.walls ?? {}).some((w) => w === false))
      await d.getByTestId('planner-tab-rooms').click(); await settle(d, 300)
      await d.getByTestId('planner-room-list').getByRole('button', { name: new RegExp(`^${living.name.replace(/[/]/g, '\\/')}`) }).first().click(); await settle(d, 400)
      await d.getByTestId('planner-room-menu').click(); await settle(d, 300)
      await d.getByRole('menuitem', { name: /^Wall elevations/ }).click(); await settle(d, 900)
      await d.getByTestId('planner-elevation').getByRole('radio', { name: /\(open\)/ }).first().click(); await settle(d, 500)
      const el = await text(d.getByTestId('planner-elevation'))
      ok(/Facing the open \w+ side from inside the room/.test(el) && !/Facing the \w+ wall/.test(el), `D-18 · an open side reads “Facing the open … side” (${living.name})`)
      ok(!/Nothing stands against this wall/.test(el), 'D-18 · and never “this wall” when there is none')
      await shot(d, '04-open-side-1440')
      await d.keyboard.press('Escape'); await settle(d, 500)
      /* desktop: no Maison AI row in the ⋮ (the button is there) */
      await d.getByTestId('planner-menu').click(); await settle(d, 400)
      ok(await d.getByRole('menuitem', { name: 'Maison AI' }).count() === 0, 'D-05 · at 1440 the ⋮ has no Maison AI row — the button is on the stage')
      /* the 3D picture's turning clip */
      await d.getByRole('menuitem', { name: /^3D picture/ }).click(); await settle(d, 2500)
      const pic = d.getByTestId('picture-dialog')
      ok(await pic.count() === 1 && await d.getByTestId('picture-clip-record').count() === 1 && /Download a turning clip/.test(await text(d.getByTestId('picture-clip-record'))), 'D·1 · the 3D picture’s Dollhouse offers “Download a turning clip”')
      const dl = d.waitForEvent('download', { timeout: 30000 }).catch(() => null)
      await d.getByTestId('picture-clip-record').click(); await settle(d, 1500)
      ok(/Recording… \d+ s/.test(await text(d.getByTestId('picture-clip-record'))) && await d.getByTestId('picture-download').isDisabled() && await d.getByTestId('picture-look').locator('[role="radio"]').first().isDisabled().catch(() => true), 'D·1 · while it records: the count-down, the look and the other ways out wait')
      await shot(d, '05-clip-recording-1440')
      const file = await dl
      const size = file ? fs.statSync(await file.path()).size : 0
      ok(!!file && /^Showroom — HDB 4-Room — Dollhouse turning\.(webm|mp4)$/.test(file.suggestedFilename()) && size > 20_000, `D·1 · one whole turn downloads as a video (${file?.suggestedFilename()}, ${Math.round(size / 1024)} KB)`)
      await settle(d, 800)
      ok(/Turning clip downloaded/.test(await snackText(d)) && /Download a turning clip/.test(await text(d.getByTestId('picture-clip-record'))), 'D·1 · it says so, and the press is ready again')
      await d.getByTestId('picture-look').getByRole('radio', { name: 'Top-down' }).click(); await settle(d, 600)
      ok(await d.getByTestId('picture-clip').count() === 0, 'D·1 · Top-down never turns — no clip offered there')
      await d.keyboard.press('Escape'); await settle(d, 600)
      /* a phone and a tablet: Maison AI is the ⋮'s first row */
      for (const [w, h] of [[390, 844], [768, 1024], [320, 640]]) {
        const pc = await phoneCtx(w, h); const q = await page(pc, `planner-${w}`)
        await go(q, `/planner/${SHOW}`, 3500)
        ok(await q.locator('button[aria-label="Maison AI"]').count() === 0, `D-05 · ${w} touch: no floating button over the dock`)
        await q.getByTestId('planner-menu').click(); await settle(q, 600)
        const row = q.getByRole('menuitem', { name: /^Maison AI/ })
        ok(await row.count() === 1, `D-05 · ${w} touch: Maison AI is a row in the ⋮`)
        await row.click(); await settle(q, 900)
        const s2 = (await sheet(q).locator('button[class*="suggestion"]').allInnerTexts().catch(() => [])).map((s) => s.trim())
        ok(await sheet(q).isVisible() && s2.includes('Which pieces overlap?') && s2.includes('How big is each room?'), `D-05 · ${w} touch: the row opens the editor’s own sheet (${s2.length} suggestions)`)
        ok(await sideways(q) <= 0, `${w} touch: no sideways scroll with the sheet open`)
        await shot(q, `06-planner-maison-${w}`)
        await q.keyboard.press('Escape'); await settle(q, 400)
        if (w !== 768) {
          await q.getByTestId('planner-menu').click(); await settle(q, 500)
          await q.getByRole('menuitem', { name: /^3D picture/ }).click(); await settle(q, 2500)
          await q.getByTestId('picture-clip-record').scrollIntoViewIfNeeded().catch(() => {})
          ok(await q.getByTestId('picture-clip-record').count() === 1 && await sideways(q) <= 0, `${w} touch: the picture sheet carries the clip press, nothing scrolls sideways`)
          await shot(q, `07-picture-clip-${w}`)
        }
        await pc.close()
      }
    }

    // ── 6 · Make a 3D picture: Square it by its corners, a slug's name ─────────────────────────────────────────────────────────────
    if (want(6)) {
      console.log('6 · Make a 3D picture: Square it by its corners · a file name read as words')
      as('dane')
      await go(d, '/planner?view=iso&photo=1', 2800)
      const dlg = photoDialog(d)
      await dlg.locator('input[type="file"]').setInputFiles(PHOTO); await waitPicture(d); await settle(d, 500)
      const straight = await pictureFacts(d), line0 = await lineOf(d)
      ok(/Straightened by/.test(line0) && await d.getByTestId('photo-corners-open').count() === 1, `D·1 · the straightened photo offers “Square it by its corners” (${line0})`)
      await d.getByTestId('photo-corners-open').click(); await settle(d, 800)
      const handles = d.locator('[data-testid^="photo-corner-"]')
      ok(await handles.count() === 4 && /Top-left corner/.test(await handles.first().getAttribute('aria-label')), 'D·1 · four named handles on the photo as it was taken')
      ok(/The corners start on the sheet it found/.test(await text(d.getByTestId('photo-corners-line'))) && await d.getByTestId('photo-next').isDisabled(), 'D·1 · they start on the sheet the paper finder reads; Next waits while they are placed')
      await shot(d, '08-corners-1440')
      const x0 = Number(await handles.nth(0).getAttribute('data-x'))
      await handles.nth(0).focus(); await d.keyboard.press('ArrowRight'); await d.keyboard.press('Shift+ArrowRight'); await settle(d, 200)
      ok(Number(await handles.nth(0).getAttribute('data-x')) > x0, 'D·1 · a corner moves with the arrow keys')
      /* crossed: the top-left dragged past the bottom-right */
      const h0 = await handles.nth(0).boundingBox(), h2 = await handles.nth(2).boundingBox()
      await d.mouse.move(h0.x + 22, h0.y + 22); await d.mouse.down(); await d.mouse.move(h2.x + 60, h2.y + 40, { steps: 8 }); await d.mouse.up(); await settle(d, 300)
      ok(await d.getByTestId('photo-corners-refused').count() === 1 && await d.getByTestId('photo-corners-square').isDisabled(), 'D·1 · four corners that cross are refused, and it says why')
      await d.getByRole('button', { name: 'Start the corners again' }).click(); await settle(d, 400)
      ok(!(await d.getByTestId('photo-corners-square').isDisabled()), 'D·1 · Start the corners again puts them back on the sheet')
      await d.getByTestId('photo-corners-square').click(); await waitPicture(d); await settle(d, 1200)
      const sq = await pictureFacts(d)
      ok(/Squared by its corners and cleaned/.test(await lineOf(d)) && sq.w > 0 && (sq.w !== straight.w || sq.h !== straight.h), `D·1 · Square it: “${await lineOf(d)}” (${straight.w}×${straight.h} → ${sq.w}×${sq.h})`)
      ok(/Squared by its four corners/.test(await snackText(d)) && /Move the corners/.test(await text(d.getByTestId('photo-corners-open'))), 'D·1 · it says so with Undo, and the press now moves the corners')
      await shot(d, '09-squared-1440')
      await d.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(d, 800)
      ok(/Straightened by/.test(await lineOf(d)) && (await pictureFacts(d)).w === straight.w, 'D·1 · Undo puts the straightened photo back')
      await d.getByTestId('photo-corners-open').click(); await settle(d, 600)
      await d.getByTestId('photo-corners-square').click(); await waitPicture(d); await settle(d, 1200)
      ok(/Squared by its corners/.test(await lineOf(d)), 'D·1 · squared again — this is the picture the layout keeps')
      await d.getByTestId('photo-next').click(); await settle(d, 700)
      await d.getByTestId('photo-start').click(); await d.waitForURL(/\/planner\/[^/?]+/, { timeout: 20000 }).catch(() => {}); await settle(d, 3000)
      const id = d.url().split('/planner/')[1]?.split(/[?/]/)[0] ?? ''
      const L = json(`select name, plan from space_layouts where id = '${id}'`)[0]
      const under = L ? JSON.parse(L.plan).underlay?.name : null
      ok(!!L && L.name === 'Traced — Waterway sunrise' && under === 'Floor plan photo waterway sunrise', `D-15 · a slug file name reads as words: “${L?.name}” on “${under}”`)
      ok(/Floor plan underneath/.test(await text(d.getByTestId('planner-underlay'))) && /Floor plan photo waterway sunrise/.test(await text(d.getByTestId('planner-underlay'))), 'D-15 · the floor-plan card says the same name')   // (the calm UI build 2026-10-27, a deliberate change) — 6-16 · W-417
      await shot(d, '10-traced-name-1440')
      for (const [w, h] of [[390, 844], [320, 640]]) {
        const pc = await phoneCtx(w, h); const q = await page(pc, `photo-${w}`)
        await go(q, '/planner?view=iso&photo=1', 2800)
        await photoDialog(q).locator('input[type="file"]').setInputFiles(PHOTO); await waitPicture(q); await settle(q, 500)
        await q.getByTestId('photo-corners-open').click(); await settle(q, 800)
        const box = await q.getByTestId('photo-corners-editor').boundingBox()
        ok(!!box && box.x >= 0 && box.x + box.width <= w + 1 && await sideways(q) <= 0 && await q.locator('[data-testid^="photo-corner-"]').count() === 4, `${w} touch: the corners fit the sheet, no sideways scroll`)
        await shot(q, `11-corners-${w}`)
        await pc.close()
      }
    }

    // ── 7 · the Visualizer's Stop ───────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(7)) {
      console.log('7 · the AI Visualizer’s running card')
      as('dane')
      const room = sql(`select id from project_rooms where design_id = '${DESIGN}' and name = 'Kitchen' and deleted_at is null limit 1`)
      await go(d, `/visualizer/${DESIGN}?room=${room}`, 3000)
      if (await d.getByTestId('viz-hint').count()) { await d.getByRole('button', { name: 'Got it' }).click().catch(() => {}); await settle(d, 300) }
      await d.getByTestId('viz-version').first().click(); await settle(d, 600)
      await d.getByTestId('viz-mode-style').click(); await settle(d, 400)
      await d.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).first().click(); await settle(d, 400)
      let b0 = bal()
      /* (S44 closing regression, 2026-10-15) since S43C a sample room's style is the engine's own restyle — fast enough that the run can reach
         "Keeping the version" (where Stop steps away: a run can't be stopped while it saves) during a screenshot. So Stop is pressed the moment
         it shows, the shot comes after, and a run that finished first is tried once more. */
      const stop = d.getByTestId('viz-running').getByRole('button', { name: 'Stop', exact: true })
      let named = false, pressed = false
      for (let tries = 0; tries < 2 && !pressed; tries++) {
        b0 = bal()   // the attempt that is stopped is the one whose charges must come back
        await d.getByTestId('viz-generate').click()
        await d.getByTestId('viz-running').waitFor({ timeout: 8000 }).catch(() => {})
        named = named || (await stop.count() === 1 && await d.getByTestId('viz-running').getByRole('button', { name: 'Cancel' }).count() === 0)
        pressed = await stop.click({ timeout: 3000 }).then(() => true, () => false)
        if (!pressed) {
          /* (S46 closing regression, 2026-10-19) a run that finished first used up its change, so Generate rests disabled: pick the style again
             from the original before the second try */
          await settle(d, 2500)
          await d.getByTestId('viz-version').first().click(); await settle(d, 600)
          await d.getByTestId('viz-mode-style').click(); await settle(d, 400)
          await d.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).first().click(); await settle(d, 400)
        }
      }
      ok(named, 'D-16 · the running card’s press is “Stop”')
      /* the result is read as it arrives — it stacks under the credits hint and leaves after a few seconds */
      const stoppedSaid = pressed && await d.getByText(/Stopped — nothing was kept/).first().waitFor({ timeout: 4000 }).then(() => true, () => false)
      await shot(d, '12-viz-stop-1440')
      await settle(d, 2500)
      const b1 = bal()
      ok(stoppedSaid && b1.p + b1.t === b0.p + b0.t, 'D-16 · …and its result says “Stopped”, every charge given back', `${pressed ? 'pressed' : 'never pressed'} · snack: ${await snackText(d)} · ${JSON.stringify(b0)} → ${JSON.stringify(b1)}`)
    }

    // ── 8 · the demo plan switch ────────────────────────────────────────────────────────────────────────────────────────────────────
    if (want(8)) {
      console.log('8 · View as › Studio plan puts the base back exactly')
      as('dane'); await go(d, '/leads', 2000)
      const s0 = sub(), b0 = bal(), inv0 = n(`select count(*) from invoices`)
      const takers = n(`select count(*) from members where is_active = 1 and role not in ('Accounting', 'Marketing')`)   // (S44O — call C6, a deliberate change of this rule) Marketing takes no seat either
      ok(s0.plan === 'pro_studio' && s0.seats === Math.max(3, takers), `the base: Pro — Studio, ${s0.seats} seats — the members who use the AI tools (Accounting takes none)`)
      await demoPlan(d, /^Free/)
      ok(sub().plan === 'free', 'Free')
      await demoPlan(d, /^Pro — Studio The base plan/)
      let s1 = sub(), b1 = bal()
      ok(s1.plan === 'pro_studio' && s1.status === 'active' && s1.seats === s0.seats && s1.s === s0.s && s1.e === s0.e, `D-10 · back on Pro — Studio: ${s1.seats} seats, the same billing month (${new Date(s1.e * 1000).toDateString()})`, { s0, s1 })
      ok(b1.p === b0.p && b1.t === b0.t && b1.s === b0.s && b1.e === b0.e && b1.p + b1.t === ledgerSum(), `D-10 · …the same credit month and the same AI credits (${b1.p} + ${b1.t} top-up), still the ledger’s sum`, { b0, b1 })
      ok(n(`select count(*) from invoices`) === inv0, 'D-10 · …and no invoice for a month already billed')
      await go(d, '/company/plan/billing', 2200)
      ok(new RegExp(`${takers} of ${s0.seats} seats in use`).test(await text(d.getByTestId('billing-seats'))), `D-10 · Plan & billing: “${await text(d.getByTestId('billing-seats'))}”`)
      /* Almost out, a spend, and back */
      await demoPlan(d, /^Almost out/)
      const b2 = bal()
      ok(b2.p + b2.t === 15 && b2.p + b2.t === ledgerSum(), 'Almost out: 15 AI credits, the ledger’s sum')
      const t0 = Math.floor(Date.now() / 1000) - 2
      const ben = sql(`select id from projects where number = 'P-2026-002'`)
      const csv = path.join(os.tmpdir(), `s42d-vo-${Date.now()}.csv`); fs.writeFileSync(csv, 'Item,Qty,Unit,Rate\nAdditional power point,4,pcs,85\n')
      await go(d, `/projects/${ben}/money`, 2200)
      await d.locator('[data-testid="money-new"]').click(); await settle(d, 400)
      await d.getByRole('menuitem', { name: /^Variation order/ }).first().click(); await settle(d, 300)   /* (the calm UI build 2026-10-27, a deliberate change) New ▾ is five kinds; a kind made more than one way opens its ways in place (3-26) */
      await d.getByRole('menuitem', { name: /contractor/ }).first().click(); await settle(d, 700)
      await d.getByTestId('vo-upload-dialog').locator('input[type="file"]').setInputFiles(csv); await settle(d, 2800)
      const spent = n(`select count(*) from credit_ledger where reason = 'spend' and created_at >= ${t0}`)
      ok(spent >= 1 && n(`select count(*) from notifications where kind = 'credits_low' and created_at >= ${t0} and (title like '90%' or title like '75%')`) === 0, 'D-10 · a spend after Almost out raises no “90% used” — the adjustment is no use (the ledger’s spends are)')
      await d.keyboard.press('Escape'); await settle(d, 500)
      const used = -n(`select coalesce(sum(credits), 0) from credit_ledger where reason in ('spend', 'refund') and created_at >= ${t0}`)
      await demoPlan(d, /^Pro — Studio The base plan/)
      const b3 = bal(), s3 = sub()
      ok(b3.t === b0.t && b3.p === b0.p - used && s3.s === s0.s && s3.e === s0.e && b3.p + b3.t === ledgerSum(), `D-10 · Pro — Studio gives back what Almost out took — the top-ups (${b3.t}) too; only the real spend (${used}) is gone`, { b0, b3 })
      /* no base kept (a studio that started on Free): a new month, billed */
      await demoPlan(d, /^Free/)
      sql(`delete from settings where key = 'demo_plan'`)
      await demoPlan(d, /^Pro — Studio The base plan/)
      const s4 = sub()
      ok(s4.plan === 'pro_studio' && s4.seats === Math.max(3, takers) && n(`select count(*) from invoices`) === inv0 + 1, `D-10 · with no base to put back: a new month on ${s4.seats} seats, with its invoice`)
    }

    // ── 9 · on Free: one ask while it waits; the locked editor's Maison AI ─────────────────────────────────────────────────────────
    if (want(9)) {
      console.log('9 · on Free: the upgrade ask, the locked template editor')
      as('dane'); await go(d, '/leads', 1500)
      await demoPlan(d, /^Free/)
      const hm = sql(`select id from members where name = 'Hui Min'`)
      as(hm)
      const asks = () => n(`select count(*) from notifications where kind = 'credit_request' and actor_id = '${hm}' and href = '/company/plan/billing'`)
      const a0 = asks()
      await go(d, '/quote-x-ray', 2200)
      await d.getByTestId('xray-locked-ask').click(); await settle(d, 1600)
      ok(asks() === a0 + 1 && /Quote X-Ray comes with Pro — asked from its lock/.test(sql(`select body from notifications where kind = 'credit_request' and actor_id = '${hm}' order by created_at desc limit 1`)), 'D-07 · the ask reaches Dane’s bell, saying where it came from')
      await go(d, '/quote-x-ray', 2200)
      ok(/You asked Dane on \d+ \w+/.test(await text(d.getByTestId('xray-locked'))) && await d.getByTestId('xray-locked-ask').count() === 0, 'D-07 · opened again: “You asked Dane on …”, no second ask')
      const kevin = sql(`select id from leads where name = 'Kevin Ng' and deleted_at is null`)
      await go(d, `/leads/${kevin}`, 2000)
      const ql = d.locator('aside[aria-label="Create"]')
      if (await ql.locator('button[aria-label="Expand create links"]').count()) { await ql.locator('button[aria-label="Expand create links"]').click(); await settle(d, 400) }
      await ql.getByRole('button', { name: /Quote X-Ray/ }).click(); await settle(d, 800)
      ok(/You asked Dane on \d+ \w+ — it’s in their bell/.test(await text(d.getByTestId('plan-lock-asked'))) && await d.getByTestId('plan-lock-ask').count() === 0, 'D-07 · the lock card says the earlier ask with its day — Close, no second ask')
      await shot(d, '13-lock-asked-1440')
      await d.keyboard.press('Escape'); await settle(d, 400)
      await go(d, '/company/plan/billing', 2200)
      ok(/You asked Dane to upgrade on/.test(await text(d.locator('main'))) && await d.getByRole('button', { name: 'Ask Dane to upgrade' }).count() === 0, 'D-07 · Plan & billing says it too, with no second ask')
      ok(asks() === a0 + 1, 'D-07 · one ask in Dane’s bell, however often the lock is opened')
      /* the locked template editor */
      const tpl = sql(`select id from quote_templates where deleted_at is null order by is_default desc limit 1`)
      await go(d, `/templates/${tpl}`, 2500)
      ok(await d.getByTestId('template-locked').count() === 1 && await d.locator('button[aria-label="Maison AI"]').count() === 1, 'D-17 · the locked template editor carries Maison AI')
      await fab(d)
      await sheet(d).getByRole('button', { name: 'What do our own quote templates add?' }).click(); await settle(d, 700)
      ok(/Your own quote templates come with Pro/.test(await text(panel(d))) && /Only Dane changes the plan/.test(await text(panel(d))), 'D-17 · …answered from the lock’s own words (an Admin is told who changes the plan)')
      await shot(d, '14-locked-editor-maison-1440')
      await closeSheet(d)
      as('dane'); await go(d, '/leads', 1500)
      await demoPlan(d, /^Pro — Studio The base plan/)
    }

    // ── 10 · the bench, shut; one spelling ──────────────────────────────────────────────────────────────────────────────────────────
    if (want(10)) {
      console.log('10 · the developers’ bench, shut · “3D”')
      as('dane'); await go(d, '/dashboard', 1200)
      const probe = async (url) => d.evaluate(async (u) => { const r = await fetch(u, { headers: { RSC: '1' } }); return { status: r.status, body: await r.text() } }, url)
      const shut = await probe('/dev/ai-bench'), none = await probe('/dev/nothing-here')
      ok(shut.status === 404 && !/ai-bench/.test(shut.body), `D-19 · /dev/ai-bench’s page data names nothing of the bench (${shut.status})`)
      ok(shut.status === none.status && /_not-found|not-found/.test(shut.body) === /_not-found|not-found/.test(none.body), 'D-19 · …it reads like an address that doesn’t exist')
      const html = await d.evaluate(async () => { const r = await fetch('/dev/ai-bench?view=corners'); return { status: r.status, body: await r.text() } })
      /* the HTML repeats the address the browser asked for (its own URL); the route tree it carries is the not-found's, never the bench's */
      ok(html.status === 404 && /_not-found/.test(html.body) && !/"ai-bench",\{/.test(html.body) && !/Plan corners|1\.0’s seven/.test(html.body), 'D-19 · the HTML of a view carries the not-found’s tree and none of the bench’s words')
      const SRC = []
      const walk = (dd) => { for (const f of fs.readdirSync(dd, { withFileTypes: true })) { const p = path.join(dd, f.name); if (f.isDirectory()) { if (f.name !== 'node_modules') walk(p) } else if (/\.tsx?$/.test(f.name)) SRC.push([path.relative(REPO, p), fs.readFileSync(p, 'utf8')]) } }
      for (const dd of ['app', 'components', 'lib']) walk(path.join(REPO, dd))
      const hy = SRC.filter(([, t]) => /3-D/.test(t)).map(([f]) => f)
      ok(!hy.length, 'REG-1841 · no “3-D” left in the app’s source', hy.join(', '))
    }
  } catch (e) {
    fail++; console.log('  ✗ the probe stopped:', String(e?.message ?? e).split('\n')[0])
  } finally {
    const changed = putBack()
    console.log(`  (put back: ${changed.join(', ') || 'nothing changed'})`)
    const still = TABLES.filter((t) => t !== 'members' && hashOf(t) !== before.get(t))
    ok(!still.length, 'every table is as it was found', still)
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
    console.log(`\n${pass} passed · ${fail} failed`)
    await b.close()
    process.exit(fail ? 1 : 0)
  }
})()
