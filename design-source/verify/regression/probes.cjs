// id → { file (under design-source/verify), env, args, db (a prepared base in R), prep (sql file run on the copy) }
const P = {}
const add = (id, file, o = {}) => { P[id] = { file, ...o } }
add('fixes720', 'ai-credits/owner-fixes-2026-09-28/verify-fixes-720.cjs')
for (const r of [1, 3, 4, 5]) add(`cr-r${r}`, `ai-credits/verify-cr-r${r}.cjs`)
add('rooms-menu', 'ai-visualizer/rooms-menu/verify-rooms-menu.cjs', { env: { DESIGN: 'b46000d1-1638-4c7c-af20-bebbcc3b9744' } })
for (const n of ['client', 'sheets', 'studio']) add(`viz-${n}`, `ai-visualizer/verify-viz-${n}.cjs`)
add('overlays', 'consistency/verify-overlays.cjs')
for (const r of [1, 2, 3, 4]) add(`ct-r${r}`, `contracts-parity/verify-ct-r${r}.cjs`)
for (const n of ['files', 'galleries', 'pickers']) add(`folders-${n}`, `folders/verify-folders-${n}.cjs`)
add('ghosts-same', 'ghosts/verify-ghosts-same.cjs')
add('ghosts-same-390', 'ghosts/verify-ghosts-same.cjs', { args: ['390', '844', 'touch'] })
add('ghosts-strips', 'ghosts/verify-ghosts-strips.cjs')
add('ghosts-film', 'ghosts/verify-ghosts-film.cjs')
add('ghosts-measure', 'ghosts/verify-ghosts-measure.cjs', { args: ['/company/members', '1440', '[aria-label="Loading members"] li', '[data-testid="member-row"]', '7'] })
add('search', 'global-search/verify-search.cjs')
add('insights-head', 'insights-head-2026-09-28/verify-insights-head.cjs')
add('kb-r1', 'keyboard/verify-kb-r1.cjs'); add('kb-r2', 'keyboard/verify-kb-r2.cjs')
add('pb-modal', 'price-book-modal/verify-pb-modal.cjs')
for (const r of [1, 2, 3, 4]) add(`pb-r${r}`, `price-book-parity/verify-pb-r${r}.cjs`)
for (const r of [1, 2, 3, 4, 5]) add(`qe-r${r}`, `quote-editor-parity/verify-qe-r${r}.cjs`)
add('tpl-parity', 'quote-templates-parity/verify-tpl-parity.cjs')
for (const r of [1, 2, 3]) add(`st-r${r}`, `settings-parity/verify-st-r${r}.cjs`)
add('folder-crumbs', 'thumbs-2026-09-30/verify-folder-crumbs.cjs', { args: ['$L/shots'] })
add('thumbs-rest', 'thumbs-2026-09-30/verify-thumbs-rest.cjs', { args: ['$L/shots'] })
add('dane-int', 'uat-dane-2026-10-01/INT/verify-int.cjs')
for (const p of ['P1', 'P2a', 'P2b', 'P3', 'P4', 'P5a', 'P5b', 'P6']) add(`dane-${p.toLowerCase()}`, `uat-dane-2026-10-01/${p}/verify-${p.toLowerCase()}.cjs`)
for (const r of [1, 2, 3, 4, 5]) add(`sw-r${r}`, `ui-sweep/verify-sw-r${r}.cjs`)
add('ux-p1', 'ux-build-2026-09-30/P1/verify-p1.cjs', { args: ['$DB', '$L/shots'], prep: 'seed-ux-p1.sql' })
add('ux-p2', 'ux-build-2026-09-30/P2/verify-p2.cjs', { args: ['$L/shots', '$BASE'] })
add('ux-p3', 'ux-build-2026-09-30/P3/verify-p3.cjs', { args: ['$L/shots'] })
for (const n of [4, 5, 6, 7]) add(`ux-p${n}`, `ux-build-2026-09-30/P${n}/verify-p${n}.cjs`)
add('first-run-ghosts', 'ux-build-2026-09-30/ghosts/verify-first-run-ghosts.cjs', { db: 'empty.db', env: { LEAD: '6418e858-13e3-416f-b7c1-2481d1e0ca6f' } })
add('first-run-empty', 'first-run-2026-09-30/verify-first-run.cjs', { db: 'empty.db', args: ['$L/shots', 'empty', '6418e858-13e3-416f-b7c1-2481d1e0ca6f'] })   // the lead whose files empty.sql clears
add('first-run-noleads', 'first-run-2026-09-30/verify-first-run.cjs', { db: 'noleads.db', args: ['$L/shots', 'noleads'] })
add('first-run-full', 'first-run-2026-09-30/verify-first-run.cjs', { args: ['$L/shots', 'full', 'bb054aa5-7284-492e-b232-607bd4cfb0f6'] })   // full mode wants a lead with quotes (Vivien Lee)
add('panel-order', 'view-as/verify-panel-order.cjs')
add('view-as', 'view-as/verify-view-as.cjs')
for (const r of [1, 2, 3, 4]) add(`xr-r${r}`, `x-ray-parity/verify-xr-r${r}.cjs`)
// Quotes on the move (2026-10-22): the five package probes and the pending-modules / projects probes the build touched — the pm2 shape
// (args <scratch.db> [shotDir] [base], env BASE), run on a copy of base.db like every other.
for (const k of [1, 2, 3, 4, 5]) add(`rq-k${k}`, `responsive-quotes/verify-rq-k${k}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s02', 's04', 's10', 's43e', 's44f', 's44i', 's44o', 's44q', 's44t', 's46a', 's46b', 's46c']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
add('pj-gap-d', 'projects/verify-pj-gap-d.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// Contracts on the move (2026-10-22, late): the four package probes (the rc-k5 shape) + the probes the build touched.
for (const c of [1, 2, 3, 4]) add(`rc-c${c}`, `responsive-contracts/verify-rc-c${c}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s03', 's11', 's29', 's42b', 's44g', 's44r', 's46d']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
add('pm-f', 'parity-map-build/verify-pm-f.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
add('pm2-s05', 'pending-modules/verify-pm2-s05.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Leads (S05) — the stage rule REG-2655 touches
add('rl-fixes', 'responsive-leads/verify-rl-fixes.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Leads on the move: the two blockers fixed ahead of the proposal
add('rl-l3', 'responsive-leads/verify-rl-l3.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Leads on the move, L3: the listing and the ways a lead arrives
for (const r of [1, 5, 6]) add(`pj-r${r}`, `projects/verify-pj-r${r}.cjs`, { args: ['$DB', '$L/shots'] })   // the project Overview / Money that C4's Documents card and To collect line touch
add('pj-gap-f2', 'projects/verify-pj-gap-f2.cjs', { args: ['$DB', '$L/shots'] })
// Leads on the move, L4 (2026-10-23): the lead's tabs on a phone and a tablet — Tasks module-wide, Files camera-first, the viewer, Notes upright,
// Meetings · Questionnaire · Activity read first, the C-02 lint rule.
add('rl-l4', 'responsive-leads/verify-rl-l4.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// Leads on the move, L2 (2026-10-23, wave 2): the log sheet, the Move stage window one step per screen, Q-02 · Q-03, one snackbar at a time.
add('rl-l2', 'responsive-leads/verify-rl-l2.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
add('ke', 'lead-project-parity/KE/verify-ke.cjs', { args: ['$DB', '$L/shots'] })   // the lead ↔ project parity (the lead page's pieces the project reuses; the project's Tasks are the lead's)
add('pm2-s23', 'pending-modules/verify-pm2-s23.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Meetings (the lead tab, the project, Meeting Copilot) — Leads on the move reaches its tab screens
add('pm2-s42e', 'pending-modules/verify-pm2-s42e.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // the S42 fixes: a held meeting's stage offer, a project's member
add('pm2-s42g', 'pending-modules/verify-pm2-s42g.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // the S42 fixes: the lead's stage moves and windows
add('pm2-s43b', 'pending-modules/verify-pm2-s43b.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // honest reads: Auto Fill from the file, the stage refusal
add('pm2-s17', 'pending-modules/verify-pm2-s17.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // the ghosts stand where the page lands at 390 touch and 1440 (Settings, Company, the libraries — the folder card's touch type, Leads on the move L4)
// Tools › Floorplan to 3D Isometric (REG-2800…2804, 2026-10-23): its own page again — the tool, its sample, its doors; writes nothing
add('fp3d', 'floorplan-3d/verify-fp3d.cjs', { args: ['$L/shots'] })
// The whole-app responsiveness audit (2026-10-23 → 24, overnight): each lane's probe.
add('rwd-w5', 'responsive-all/verify-rwd-w5.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The whole-app responsiveness audit, lane W1 (2026-10-23 → 24): the house pieces, the shell and the public / account pages — its probe, and the
// account and website probes its files reach (Your profile, Join, sign-in, sign-up, the website).
add('rwd-w1', 'responsive-all/verify-rwd-w1.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s01', 's09', 's30', 's31', 's35']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
// The whole-app responsiveness audit (2026-10-23), lane W4 — Company · Settings · Finance · Reports · the template editors; read-only
add('rwd-w4', 'responsive-all/verify-rwd-w4.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The whole-app responsiveness audit, lane W2 (2026-10-23, his "overall responsiveness audit … based on your recommendations"): Leads and the
// day's work on a phone held sideways, a meeting's phone foot, /tasks' chips, the presses under a finger, a Hangout's By designer table
add('rwd-w2', 'responsive-all/verify-rwd-w2.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
add('pm2-s27', 'pending-modules/verify-pm2-s27.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Hangouts + the public profiles (S27) — W2 reaches its pages (components/hangouts); it was not listed
// The whole-app responsiveness audit (2026-10-23), lane W3 — Projects · the client portal · the client's money links
add('rwd-w3', 'responsive-all/verify-rwd-w3.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The whole-app responsiveness audit (2026-10-23), lane W6 — the closing lane: the hand-offs, the load order, the desk
add('rwd-w6', 'responsive-all/verify-rwd-w6.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The held calls (2026-10-24, his "fix all of it"), lane C1 — Leads, the house pieces, the website, Qanvast Ops: B-06 · Won's split · K-9…K-12 ·
// W2-06 · W2-13 · W1-20, each as the rule it keeps (puts back the default template's schedule and any composer draft it writes)
add('rwd-c1', 'responsive-all/verify-rwd-c1.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The held calls (2026-10-24, his "fix all of it"), lane C2 — Projects, the client portal, Company, Settings: the Schedule upright, a report's
// photo, the Floor plan's toolbar at 374, the portal's row fades, the floor-plan papers in the paper viewer, StatTiles at 320, Used by, the two pairs, K-10 on a project's page
add('rwd-c2', 'responsive-all/verify-rwd-c2.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// Activity by date (2026-10-24, lane A — his "group the activities by date and add type icons for the ones we have (Tasks · Files · Notes · Stage)"):
// the house timeline by day with a type glyph on every row — a lead's and a project's Activity, the quote's trail, the Overview card; reads only
add('rwd-a', 'responsive-all/verify-rwd-a.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
add('pj-gap-c', 'projects/verify-pj-gap-c.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // the schedule's asks, outside people (their badge on a phone's task card — REG-2926)
// The Dashboard redesigned (2026-10-26), lane D3 — the grid's five cards (Your day · Pipeline · Projects · Team · On site) and P-14's Coming up; the
// pm2 probes whose Dashboard assertions it moved to the new cards (S22's MY TASKS / Coming up / Workload / Site updates, S45B's Contractors
// tile; S42A's two moved checks run from its own folder — its REPO is three levels up, so the harness's copy can't run it)
add('dash-d3', 'dashboard-2026-10-26/verify-dash-d3.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s22', 's45b']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
// The Dashboard redesigned (2026-10-26), lane D5 — P-13 "one fact, one number" and P-14's bugs across the modules the Dashboard reads: its probe, and
// the probes its files reach that had no line yet (the bell and Your notifications, Messages' reads, Studio health, Maison AI's D-11, Sales ·
// Response time, the schedule's bell, Money in's and money out's Needs you rows, the outbox).
add('dash-d5', 'dashboard-2026-10-26/verify-dash-d5.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s18', 's26', 's39', 's45a']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const id of ['pj-r2', 'pj-gap-b']) add(id, `projects/verify-${id}.cjs`, { args: ['$DB', '$L/shots'] })
for (const id of ['pm-a', 'pm-g']) add(id, `parity-map-build/verify-${id}.cjs`, { args: ['$DB', '$L/shots'] })
// The Dashboard redesigned (2026-10-26), lane D2 — Needs you as one ranked inbox: every project's rows, the new signals, the verbs in place with
// Undo, the Review pane, Not today, the chips, the ring from the records, You're all caught up, the keys, by role and at every width (puts back
// every table it touches by primary key)
add('dash-d2', 'dashboard-2026-10-26/verify-dash-d2.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The Dashboard redesigned (2026-10-26), lane D4 — Maison AI docked: the field at the page's foot, its suggestions by rule, short answers above it
// and long ones in the pane, the answer cards (the sheet everywhere else too), Remind with its receipt and Undo, Stop · Retry, ⌘J, the phone's
// accessory and its ✦, the sheet and the keyboard, each role's suggestions (puts back the reminders, the Recent questions and the meeting it seeds)
add('dash-d4', 'dashboard-2026-10-26/verify-dash-d4.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The Dashboard redesigned (2026-10-26), lane D1 — the frame, Since you were last here, Pulse, Studio / Mine, hiding a card, every role's page,
// every width, the ghost, the first answer
add('dash-d1', 'dashboard-2026-10-26/verify-dash-d1.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// The Dashboard redesigned (2026-10-26), the closing pass — probes the round reached that had no line yet (a probe not registered hides a
// regression — the 2026-10-24 lesson): Listed on Qanvast, Who sees costs, Qanvast Ops › Lead credits and Reviews, one signed-in member per
// browser (its greeting read from the page's title now), the money desk's and the client-loop parity rounds. S42A and S42D run directly only —
// their REPO resolves three levels up from the harness's copy (node design-source/verify/pending-modules/verify-pm2-s42a.cjs <db> <shots> <base>).
for (const s of ['s37', 's41b1', 's41b5', 's43a']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const id of ['pm-e', 'pm-h']) add(id, `parity-map-build/verify-${id}.cjs`, { args: ['$DB', '$L/shots'] })
module.exports = P
