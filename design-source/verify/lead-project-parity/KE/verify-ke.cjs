// Lead ↔ Project parity — package K-E (2026-10-08): Activity names who moved a stage and who added a member, says "lead" before the Won stamp
// and "project" after (P-12 · P-13), one sentence shape with the reason in quotes and the date (P-14), its chips on the house ChipRail (P-15);
// the project's delete dialog with the lead's subtitle, Deleted Projects in the Deleted Leads look and the Deleted Leads' "Deleted" head (P-36 ·
// Q-11); a project's hold rings "A lead's or project's stage changes" and its Undo takes the notice back (P-37); Settings › Projects' head and
// Who may do what grouped by area in one grammar (P-38 · Q-23). Each check asserts a rule, not a count from another round.
// Usage: NODE_PATH=$PWD/node_modules node verify-ke.cjs <scratch.db> [shotDir]   (BASE in the environment, default :3011). Never local.db —
// everything it writes is taken back in `finally`. Needs the K-E migration (stage_logs.moved_by · lead_assignees.assigned_by).
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const openRoles = async (p) => { if (!(await p.getByTestId('studio-roles-list').count())) { await p.getByTestId('studio-roles-open').click(); await p.waitForTimeout(500) } await p.getByTestId('studio-roles-role').getByRole('radio', { name: 'All roles' }).click(); await p.waitForTimeout(250) }   // (the calm UI build 2026-10-27, a deliberate change) B5 5-04: Who may do what is Roles & access' drawer — open it, All roles = the old matrix
const [DB, dirArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'shots')
fs.mkdirSync(dir, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:3011'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()   // (pending modules S10, a probe fix) the JSON's double quotes escaped for the shell — it replaced " with " and broke before any page
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const P = (n) => sql(`select id from projects where number='${n}'`)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`   // lib/format displayDate

;(async () => {
  const b = await chromium.launch()
  const T0 = Math.floor(Date.now() / 1000) - 60
  const gerald = sql(`select id from leads where name='Gerald Tan' and deleted_at is null`)
  const ryan = P('P-2026-001'), tan = P('P-2026-005')
  const ryanLead = sql(`select lead_id from projects where id='${ryan}'`)
  const notOn = (lead) => sql(`select id from members where is_active=1 and is_you=0 and id not in (select member_id from lead_assignees where lead_id='${lead}') order by id limit 1`)
  const nameOf = (id) => sql(`select name from members where id='${id}'`)
  const addG = notOn(gerald), addR = notOn(ryanLead)
  const follow = new Date(Date.now() + 30 * 86400000); follow.setUTCHours(4, 0, 0, 0)
  /* a throwaway direct project on Germaine's team, for the hold's notice */
  const t = { lead: 'probe-ke-lead', pid: 'probe-ke-p', name: 'Study nook — Probe Ke', number: 'P-2026-961' }
  const clean = () => {
    sql(`delete from stage_logs where id in ('probe-ke-log0','probe-ke-log1')`)
    sql(`delete from lead_assignees where id in ('probe-ke-as1','probe-ke-as2')`)
    sql(`delete from notifications where lead_id='${t.lead}'`); sql(`delete from lead_events where lead_id='${t.lead}'`)
    sql(`delete from projects where id='${t.pid}'`); sql(`delete from lead_assignees where lead_id='${t.lead}'`); sql(`delete from leads where id='${t.lead}'`)
    sql(`update members set is_you = (id = 'dane')`)
  }
  clean()
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1024 } })
    const go = async (url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900) }
    const snack = () => p.locator('[role="status"][aria-live="polite"]').last()
    const feed = async () => p.locator('[data-testid="activity-feed"]').innerText()

    console.log('P-13 · P-14 · the lead’s Activity names who did it')
    sql(`insert into stage_logs (id, lead_id, from_stage, to_stage, payload, created_at, moved_by) values ('probe-ke-log0', '${gerald}', 'Contacted', 'Met', '{"quick":true}', ${T0 + 1}, NULL)`)
    sql(`insert into stage_logs (id, lead_id, from_stage, to_stage, payload, created_at, moved_by) values ('probe-ke-log1', '${gerald}', 'Met', 'On Hold', '{"reason":"Others: Budget review","duration":"1 month","followUpAt":"${follow.toISOString()}"}', ${T0 + 2}, 'sarah')`)
    if (addG) sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at, assigned_by) values ('probe-ke-as1', '${gerald}', '${addG}', ${T0 + 3}, 'dane')`)
    await go(`/leads/${gerald}/activity`)
    const g = await feed()
    ok(g.includes(`Sarah put the lead on hold — “Budget review”; follow up ${day(follow)}.`), 'a hold: who · what · the reason in quotes (the stored “Others: ” dropped) · the follow-up day (P-14)')
    ok(g.includes('The lead moved from Contacted to Met.'), 'a move with no stamp names nobody — “The lead moved from … to …” (P-13)')
    ok(!addG || g.includes(`You added ${nameOf(addG)} to the lead.`), 'a member added names who added them, and the lead before Won (P-12 · P-13)')
    ok(!/You assigned .* to this (lead|project)/.test(g), 'no “You assigned … to this lead” whoever did it')
    const unnamed = Number(sql(`select count(*) from lead_assignees where lead_id='${gerald}' and assigned_by is null`))
    ok(unnamed === 0 || / (was|were) added to the lead\./.test(g), 'a member added before the stamp reads “{name} was added to the lead”')   // (pending modules S10, a probe fix) the one unstamped is the viewer here: “You were added to the lead.” — activity.ts's own words
    await p.screenshot({ path: path.join(dir, 'ke-lead-activity-1440.png') })

    console.log('P-12 · the project’s Activity says “project” after the Won stamp')
    if (addR) sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at, assigned_by) values ('probe-ke-as2', '${ryanLead}', '${addR}', ${T0 + 3}, 'dane')`)
    await go(`/projects/${ryan}/activity`)
    const r = await feed()
    ok(!addR || r.includes(`You added ${nameOf(addR)} to the project.`), 'a member added after Won joins “the project”')
    ok(!/to this lead|from this lead/.test(r), 'no “this lead” on the project’s page')
    const rail = await p.locator('[data-testid="activity-chips"]').evaluate((el) => !!el.closest('[role="group"][aria-label="Show"]'))
    ok(rail, 'the chips sit in the house ChipRail (P-15)')

    console.log('P-15 · one chip row on a phone')
    const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const q = await ph.newPage()
    await q.goto(`${BASE}/projects/${ryan}/activity`, { waitUntil: 'networkidle' }); await q.waitForTimeout(1200)
    const ys = await q.locator('[data-testid="activity-chips"] [role="radio"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)))
    ok(ys.length > 5 && ys.every((y) => y === ys[0]), `the project’s ${ys.length} chips on one row at 390`)
    ok(await q.evaluate(() => document.scrollingElement.scrollWidth <= 390), 'no sideways page scroll at 390')
    await q.screenshot({ path: path.join(dir, 'ke-project-activity-390.png') })
    await ph.close()

    console.log('P-37 · a project’s hold is a stage change; its Undo takes the notice back')
    sql(`insert into leads (id, name, phone, source, property_type, stage, direct, created_at, updated_at, seen_at, budget_minor) values ('${t.lead}', 'Probe Ke', '93330961', 'Others', 'HDB 4-Room', 'Won', 1, ${T0 - 86400}, ${T0 - 86400}, ${T0 - 86400}, 900000)`)
    sql(`insert into lead_assignees (id, lead_id, member_id, assigned_at, assigned_by) values ('${t.lead}-as', '${t.lead}', 'germaine', ${T0 - 86400}, 'dane')`)
    sql(`insert into projects (id, lead_id, number, name, stage, project_type, agreed_value_minor, start_date, started_at, created_by, created_at, updated_at) values ('${t.pid}', '${t.lead}', '${t.number}', '${t.name}', 'in_progress', 'Partial renovation', 900000, ${T0 - 3600}, ${T0 - 3600}, 'dane', ${T0 - 86400}, ${T0 - 3600})`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail, project_id) values ('${t.pid}-ev', '${t.lead}', 'project_created', 'dane', ${T0 - 86400}, '{"name":"${t.name}","number":"${t.number}","direct":true}', '${t.pid}')`)
    await go(`/projects/${t.pid}`)
    const stagePill = p.locator('[data-testid="project-page"] [data-kb="move-stage"]')
    if (await stagePill.count()) { await stagePill.first().click(); await p.waitForTimeout(400); await p.getByRole('menuitem', { name: /On hold/i }).first().click() }
    else { await p.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(350); await p.getByRole('menuitem', { name: /Put on hold/ }).first().click() }
    await p.waitForTimeout(600)
    await p.locator('[role="dialog"]').last().getByLabel('Why is it on hold?').fill('The client is away until next month')
    await p.locator('[data-testid="hold-save"]').click(); await p.waitForTimeout(1500)
    const heard = sql(`select group_concat(member_id) from (select member_id from notifications where kind='stage_changed' and href='/projects/${t.pid}' order by member_id)`).split(',').filter(Boolean)
    ok(heard.includes('germaine') && heard.includes('huimin') && !heard.includes('dane'), `the project’s members, Owners and Admins hear it — never the one who moved it (${heard.join(' · ')})`)
    ok(sql(`select title from notifications where kind='stage_changed' and href='/projects/${t.pid}' limit 1`) === `${t.name}: In progress → On hold`, 'its title is the lead’s shape: “{project}: In progress → On hold”')
    const undo = snack().getByRole('button', { name: 'Undo' })
    if (await undo.count()) {
      await undo.click(); await p.waitForTimeout(1500)
      ok(sql(`select count(*) from notifications where kind='stage_changed' and href='/projects/${t.pid}'`) === '0', 'Undo takes the stage notice back, as an undone lead move does (REG-608)')
    } else ok(false, 'the hold’s snackbar offers Undo')

    console.log('P-36 · the project’s delete reads as the lead’s')
    await p.locator('[data-testid="project-page"] button[aria-label="More options"]').first().click(); await p.waitForTimeout(350)
    await p.getByRole('menuitem', { name: /^Delete/ }).first().click(); await p.waitForTimeout(1200)
    const dlg = p.locator('[role="dialog"]').last()
    ok((await dlg.getAttribute('aria-label')) === 'Delete this project?', 'the title: “Delete this project?”')
    const sub = await p.locator('[data-testid="delete-project-subtitle"]').innerText().catch(() => '')
    ok(sub.startsWith(t.name), `the lead’s subtitle under it — “${sub.replace(/\s+/g, ' ')}”`)
    await p.screenshot({ path: path.join(dir, 'ke-delete-project-1440.png') })
    await dlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(400)

    console.log('P-36 · Q-11 · Deleted Projects in the Deleted Leads look')
    await go(`/projects/${tan}`)
    await snack().getByRole('button', { name: 'Open' }).click(); await p.waitForTimeout(1500)
    ok(/stay here until they are deleted forever|Restore brings back/.test(await p.locator('[data-testid="deleted-projects-banner"]').innerText()) /* (the calm UI build 2026-10-27, a deliberate change) B3 3-47: the banner is one line under the title */, 'the retention banner on top, with the project’s own rule')
    const restore = p.locator('[data-testid="deleted-project"]').first().locator('[data-testid="deleted-project-restore"]')
    ok(/link/.test((await restore.getAttribute('class')) ?? ''), 'Restore is the Deleted Leads sheet’s text link')
    /* (the calm UI build 2026-10-27, a deliberate change) B3 3-47: "Deleted projects" says what it is in its one line — the note under the table went (T-04) */
    ok(await p.locator('[role="dialog"][aria-label="Deleted projects"]').count() === 1 && await p.locator('[role="dialog"][aria-label="Deleted projects"]').getByText(/^Note:/).count() === 0, 'the note under the table')
    await p.screenshot({ path: path.join(dir, 'ke-deleted-projects-1440.png') })
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    await go('/leads')
    await p.locator('button[aria-label="More options"]:visible').first().click(); await p.waitForTimeout(300)
    await p.getByRole('menuitem', { name: 'Deleted Leads' }).click(); await p.waitForTimeout(900)
    const heads = await p.locator('[role="dialog"][aria-label="Deleted leads"] [role="columnheader"]').allInnerTexts()   // (the calm UI build 2026-10-27, a deliberate change) sentence case
    ok(heads.some((h) => /^Deleted\b/i.test(h.trim())) && !heads.some((h) => /Archived/i.test(h)), 'Deleted Leads: the date’s head reads “Deleted”, never “Archived” (Q-11)')   /* a sort head's innerText carries its glyph's name */
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)

    console.log('P-37 · Notifications’ words')
    await go('/settings?section=notifications')
    ok(/A lead’s or project’s stage changes/.test(await p.locator('[data-testid="event-stage_changed"]').innerText()) && /lead’s or project’s members/.test(await p.locator('[data-testid="event-stage_changed"]').innerText()), '“A lead’s or project’s stage changes” — to the lead’s or project’s members')
    ok(/A lead or project is assigned to you/.test(await p.locator('[data-testid="event-assigned"]').innerText()), '“A lead or project is assigned to you”')
    ok(!/project’s team(?! chat)/.test(await p.locator('[data-testid="notification-channels"]').innerText()), 'the Who column says “members”, never “team” (Q-05)')   // (pending modules S10, a deliberate change of this rule — P-G's “A teammate writes in a project’s team chat” is a conversation's name, not the Who column)

    console.log('P-38 · Q-23 · Settings › Projects and Who may do what')
    await go('/settings?section=projects')
    const kept = await p.locator('[data-testid="settings-projects"] [data-testid="module-links"]').innerText()
    ok(/Templates/.test(kept) && /Client portal/.test(kept) && /Members/.test(kept), 'Kept in Company: Templates · Client portal · Members')
    // (pending modules S14, a deliberate change of this rule) Who sees leads' one home is Settings › Roles & access (?section=studio)
    ok(/section=studio.*#lead-visibility/.test((await p.locator('[data-testid="projects-visibility-link"]').getAttribute('href')) ?? ''), 'a link to Roles & access › Who sees leads (Q-23)')
    await p.screenshot({ path: path.join(dir, 'ke-settings-projects-1440.png') })
    await go('/settings?section=studio')
    await openRoles(p)   // (the calm UI build 2026-10-27, a deliberate change) — its rowgroups are the drawer's list
    const groups = await p.locator('[data-testid="studio-roles-list"] [role="rowgroup"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
    ok(groups[0] === 'Studio' && groups[1] === 'Leads' && groups[2] === 'Projects', `grouped by area in Settings’ order (${groups.join(' · ')})`)
    const inGroup = async (g, k) => (await p.locator(`[data-testid="may-group-${g}"] [data-testid="may-${k}"]`).count()) === 1
    ok(await inGroup('leads', 'see') && await inGroup('projects', 'project-see'), '“See a lead” under Leads, “See a project” under Projects')
    ok(/^See a lead/.test(await p.getByTestId('may-see').innerText()) && /^Change a lead’s members/.test(await p.getByTestId('may-assign').innerText()), 'one grammar: “See a lead” · “Change a lead’s members”')
    const reach = async (k) => JSON.stringify(await p.getByTestId(`may-${k}`).locator('[data-reach]').evaluateAll((els) => els.map((e) => e.getAttribute('data-reach'))))
    /* (S44O — call C6, a deliberate change of this rule: Marketing changes a lead’s members, never a project’s — its cell is left out of the comparison) */
    const noDesk = (j) => JSON.stringify(JSON.parse(j).filter((_, i) => i !== 4))
    ok(await inGroup('projects', 'project-members') && noDesk(await reach('project-members')) === noDesk(await reach('assign')), '“Change a project’s members” — the lead’s reach, one rule')
    ok(/a lead’s or project’s files/.test(await p.getByTestId('may-files-change').innerText()), 'the files row names both records')
    ok(/Company › Reports › Leads/.test(await p.getByTestId('may-insights').innerText()) && /Company › Reports › Projects/.test(await p.getByTestId('may-project-workload').innerText()), 'the report rows name Company › Reports')
    ok(/Owner · \d/i.test(await p.getByRole('table', { name: 'Who may do what' }).getByRole('row').first().innerText()), 'the column head is still the table’s first row')
    await p.getByTestId('may-group-projects').scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(dir, 'ke-who-may-1440.png') })
  } catch (e) {
    fail++; console.log('  ✗', String(e).split('\n')[0])
  } finally {
    clean()
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
