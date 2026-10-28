# The Dashboard, redesigned — lane D3's outcome (2026-10-26)

**Lane:** D3 — the grid's five cards: Your day (P-06), Pipeline (P-07), Projects with health by rule (P-08 · Q-10), Team with the contractors'
line and On site (P-09), and P-14's Coming up cut. **Built:** all of it, to the drawn page with his note on the buttons (§ 2) applied to every
verb. Nothing committed (the WIP base is the lane's only commit). Lane: port 3223, `…/scratchpad/dash-build/D3/lane.db` (repaired with R179;
`lane-clean.db` beside it is the clean copy the harness runs from); shots `…/dash-build/D3/shots/` (`v3-*` every width, `r1-*` every role,
`d3/` the probe's, `cmp-1440/` the before / after of the project pages).

## 1 · The ledger

| Brief item | State | Where |
| --- | --- | --- |
| **Your day** — the week as seven days with dots, the current day tinted | built | `components/dashboard/cards/your-day-card.tsx` · `cards.module.css`; seven days from today in the house chip rail (seven across at a desk and a tablet, five on a phone, four at ≤359 — each day a 44 target — the rest a swipe away under the rail's fade); dots = what the day holds, three at most; today's number in the primary, the day shown on the lavender tint with its hairline (never the drawing's solid block) |
| …a day pressed shows its agenda in place | built | the strip's buttons are `aria-pressed`; the agenda below is that day's, its empty words "Nothing planned today" · "Nothing planned on Wednesday", a quiet week "Nothing planned this week" with one outlined **Add a task** (→ `/tasks?add=1`, the way back) |
| …today's meetings (time · length · Prepare me → the dock asks it) | built | the member's meetings (theirs or made by them, Who sees leads) — time, "45 min" · "1 h" from its planned end; ahead: **Prepare me** (`askMaisonAi({ text: 'Prepare me for my meeting with Priya at 2:00 PM' })` — the dock answers it on the Dashboard, D4); a site visit or an in-person meeting with a place: **Directions**; past its end it greys and drops its verbs (its write-up is Needs you's) |
| …calls due (Call · WhatsApp) | built | a Call / Follow-up task on a lead with a number: **Call** (outlined, `tel:+65…`) and **WhatsApp** (text, `wa.me/65…`, opened on the press — REG-534); the press is remembered and, back on the page, the snackbar offers *Log the call with Cheryl?* · **Log the call** (*Log the WhatsApp …* · **Log it**), which opens Leads on the move's house `LogSheet` on that lead |
| …the member's tasks (late first, red; tick with Undo — `setTasksDone` / `undoTasksDone`) | built | the rail badge's rule (`ctx.read.tasks()`), late ones on today first with "5 days late" in red (`isOverdue` — the one clock); the tick is optimistic, the Tasks tab's words "Task completed" / "Task reopened" with Undo, a refusal puts it back with "Couldn’t complete the task — …"; a task ticked today stays on its day, ticked and struck through (`doneToday`, a read in my own file); a timed task sorts by its hour |
| …milestones starting · Hangouts | built | every running project's whole Coming up the member changes (Mine: their own) — milestones starting and ending, outside people, the client's meetings; the Hangouts the studio takes part in (a Designer's: the ones they're on the plan for), with the hours and **Directions** to the venue |
| …Accounting's money week | built | To do's own pay / collect rows due in the seven days (what is late is Needs you's), each opening where To do opens it |
| …the ring = today's done of today's | built | `day-ring.tsx` beside the title — today's tasks due by today and today's meetings; a ticked task and a held meeting count; "2 of 5 done" beside it, no ring on a day with neither |
| **P-14 Coming up's cut** | built | `lib/projects/queries.ts`: `ProjectDetail.comingAll` (additive) = the project's events, uncut; `comingUp` and the Overview card unchanged; `fetchDay` reads `comingAll`. The probe adds seven milestones starting this week on one project: all seven reach Your day, the project's own card keeps six. The project pages' 1440 diff: §5 |
| **Pipeline** | built | `pipeline-card.tsx`, pure `pipelineOf` · `pipelineLine` in `lib/dashboard/cards.ts`, reader `fetchPipeline` over `ctx.read.visibleLeads()` (Who sees leads): New → Won, bars to the largest (the Schedule's lavender, Won green), each count the listing's own (the probe opens Met and reads the listing's "Met (3)"); an amber mark at a bar's end where a lead has sat in the stage over 14 days (`daysInStage`'s rule, calendar days; never Won); "14 stuck over 14 days · 12 going quiet" — going quiet is Sales' `QUIET_DAYS` over the open leads being worked, and for an Owner or an Admin its words open Reports › Leads › Sales at All time, whose note says the same number; a stage opens `/leads?scope=<stage>` with the way back (Mine adds `member=<id>`) |
| **Projects** with health by rule + its pure probe | built | `projects-card.tsx`; the rule `lib/dashboard/health.ts` (`healthOf`, `byHealth`, `aheadWords` · `pastWords`), pure probe `design-source/verify/dashboard-2026-10-26/dash-d3-health-pure.mts` (39 checks); reader `fetchProjectsHealth`: the listing's rows (not completed), `milestonesOf` (the schedule's own reader), each project's own Money rows and invoices from its detail, the schedule's open asks, the books' profit grade. Late (ours) · At risk · On track · Setting up · On hold, worst first; the line leads with the health word; red only on Late; progress = done of all milestones (the listing's Progress); "Projects · 4 running" = the old Open projects tile (a door to the listing); six before Show n more (four on a phone) |
| **Team** with the contractors' line | built | `team-card.tsx`, reader `fetchTeam`: Workload's lines (`workloadOf` — a Manager's team), the bar against the capacity's tick on one scale for the card, "2 of 3", over in amber (never red), open leads, "closed to new leads" only when so (`members.accepting_leads`), Workload's "No one yet" row, five before Show n more, every row → Workload with the way back; the S45B tile's words as the card's last line → Workload › Contractors, or Finance › Vendors while the studio keeps none |
| **On site** | built | `on-site-card.tsx`, reader `fetchSite`: the photos of the updates published in the last seven days on the projects this member reaches, newest first, the house thumbnail at 4 : 3 (three across in a glance column, ~128 in a whole column), six at most, "2 photos" in the head; a photo opens `/projects/<id>/updates?open=<update>` with the way back; an update with no photo is its words; nothing this week → no card |
| ✦ Ask on every head | built | `card-frame.tsx` — the house Overview card with the DS secondary **text** button (the Maison AI mark, "Ask"), `askAbout('day' \| 'pipeline' \| 'projects' \| 'team' \| 'site')` |
| repair rule **R179** | built | `scripts/repair-demo-data.ts` after R176: Dane's day (a site visit at Benjamin Han's 10:00–10:45 planned by Germaine with its reminder for both; Priya Nair rung three days ago — Call · Meeting scheduled — and her first consultation at the showroom 2:00–3:00 PM with its reminder; a Call task to Cheryl Lim at 4:30 PM, which R15 now leaves out of its calendar); two checks at the end; idempotent (a second run: "already in step") |
| the probe + its line | built | `design-source/verify/dashboard-2026-10-26/verify-dash-d3.cjs` (132 checks, real presses; args `<scratch.db> [shotDir] [base]`, env `BASE`, refuses `local.db`, puts every table back) + `add('dash-d3', …)` and `pm2-s22` · `pm2-s45b` in `design-source/verify/regression/probes.cjs` |

## 2 · ▲ Decisions for Vicky

1. **His note on the buttons, applied to every verb** — a row's verb `secondary outlined`, a second one `secondary text`; on a phone both are the
   house outlined icon buttons (the drawn phone's squares — a bare spark alone didn't read as a press). Only channel verbs and Prepare me carry
   an icon. The ✦ Ask is neutral ink with the Maison AI mark (the drawing's purple "Ask" is a primary text the note asks to quiet).
2. **Bars are the Schedule's lavender** (`--om-color-primary-variant-hover`) and the load / progress fills `--om-color-on-inverse-surface-primary`
   (the DS's #CCB2FF): the drawing's solid-purple progress bars would fail his own § 2 check ("no element with a filled primary background").
3. **Stuck = over 14 days in an open stage** (invented threshold — the drawing's "3 stuck over 14 days"; study B found no stuck rule anywhere).
   The demo's leads are old, so the card says "14 stuck over 14 days" and every open bar wears the mark: true of the records, loud on the demo.
4. **Won on the Pipeline is the listing's Won (every won lead, 3)**, not Pulse's "Won · 90 days" — a stage row opens the listing scoped to it
   and must say its number.
5. **The health rule's edges** — a milestone past its end that *waits on someone* (the client, a supplier, a member) is At risk, not Late (not
   our lateness, S-05); "money of ours late" = a supplier's bill or a PO past its due day (Money's own red rows); "costs over the contract's
   share" = the books' own At risk grade (under a tenth of the contract left, or a loss), shown only to whoever sees profit; a project
   **Setting up** or **On hold** says so whatever else is true (the hold pauses its reasons, as Needs attention does). Progress is **done of
   all milestones** — the listing's Progress — the brief's "by days" read as "the same as the listing" (one fact, one number); say if you want
   it weighted by days instead.
6. **The day's words**: a day gone by is its date ("was due 20 Oct"), never a bare weekday (the lead card's rule, L3); one ahead within the week
   is its weekday ("ends Thu").
7. **"On site this week" = the last seven days**, today included (a Monday's calendar week would be empty every Monday morning).
8. **A Manager's Projects and Pipeline are what Who sees leads gives them** (the listings' own counts — the demo studio lets everyone see every
   lead); their Team and On site are their team's. The roles table's "(their team)" read as the Team card's. **Mine** (an Owner's or an
   Admin's) narrows Your day's milestones, Pipeline, Projects and On site to their own; Team stays the studio's (who has room is a studio
   question).
9. **A meeting's reminder folds into the meeting** (planMeeting writes one per member) — Your day shows the meeting once and counts it once.
10. **A ticked task stays on its day, ticked** (struck through, its tick reopens it) — the day reads as done rather than emptying.
11. **R179 is demo data the drawing implied** (a site visit, a consultation, a call on the morning's page), written as the app writes it, at
    the drawing's hours (10:00 and 2:00 PM). A demo opened after 10:45 / 3:00 PM finds them past their time: Your day greys them and Needs
    you raises their *Write up* (the meetings' own rule — red, ours and late). Say if you'd rather they sat later in the day.

12. **On site's picture is the file's own** (`lead_files.thumb`, what the project's Updates tab draws; `/files/img/<id>` when none) — the brief
    named `/files/thumb/<fileId>`, but that route serves the picture of a file that is *not* one (a PDF's first page) and answers 404 for a
    photo.

## 3 · Shared pieces changed

- `lib/projects/queries.ts` — `ProjectDetail.comingAll` (additive, optional; nothing else reads it). The project pages render exactly as before (§5).
- `scripts/repair-demo-data.ts` — R179 (new) and R15's query leaves R179's call out (one `AND id <> …`).
- No house piece (`components/om/*`, the house Card, Row, LogSheet, ChipRail) was edited; they are composed. No migration, no new icon (the
  contractors' line uses `handyman`, already in the subset; WhatsApp is `/figma-assets/whatsapp-grey.svg`, the lead card's).
- Probes moved to the new homes: `verify-pm2-s22.cjs` (MY TASKS + Coming up → Your day; Workload → Team; Site updates → On site; the CARDS
  keys), `verify-pm2-s42a.cjs` (Site updates → On site; MY TASKS quiet → Your day), `verify-pm2-s45b.cjs` (the Contractors tile → the Team
  card's line) — each marked "(Dashboard redesign 2026-10-26, a deliberate change)".

## 4 · For other lanes

- **D1 (frame, ghost):** each card is `<div data-card="day|pipeline|projects|team|site">` (the phone's / upright tablet's order hooks — brief
  § 3 wants Projects before Pipeline at ≤1023). Every head goes through one component, `components/dashboard/cards/card-frame.tsx` — if your
  dashboard head wrapper carries the ⋮ (Hide this card), swap it in there (its `legend` slot sits before the Ask). The ghost's anatomy: Your
  day = head 48 · the strip 56 (64 on touch) · rows 52; Pipeline = five 32 rows (44 on touch) · its line; Projects = two-line rows ~52;
  Team = 44 rows · the contractors' line 44; On site = 4 : 3 tiles three across. For the seed, `siteThisWeek(viewer, now)` in
  `lib/dashboard/cards-queries.ts` is On site's own rule read light (the old seed's `recentSiteUpdates` is a fortnight). Needs you's `next`:
  the first `data.day.items` entry with `day >= today && !done && !ended`. The S22 / S42A probes' frame assertions (the brief and its
  "Good evening, Hui Min." — S42A's one red on this lane —, Where it stands, the ghost's `span[data-card="my-work"]`, the phone's order) are
  yours to restate; S22 stops at its § 2 until the frame lands.
- **D2 (Needs you):** the member's own tasks live in Your day only. Your day keeps its own after-call snackbar + LogSheet (`your-day-card.tsx`
  `called` / `LogSheet`) and its own ring (`day-ring.tsx`) — the landing keeps one of each with yours. A meeting past its end shows greyed
  with no verb here; its Write up is your row.
- **D4 (dock):** the Ask keys are `day` · `pipeline` · `projects` · `team` · `site`. **Prepare me** sends "Prepare me for my meeting with
  {first} at {h:mm AM}" through `askMaisonAi` — today the `next_meeting` intent answers the *next* meeting whatever the name (pressed on
  Priya's 2 PM it answered Benjamin's 10:00): please answer the named one. R179 gives the demo's today a 10:00 site visit (Benjamin) and a
  2:00 PM consultation (Priya) for your "Prepare me for 2 PM with …" chip. The FAB still sits over Team's right edge at 1440 until yours lands.
- **D5:** Your day's lateness is `isOverdue` with "n days late" (`lateWords` in `lib/dashboard/cards.ts`).
- **Landing:** R179 sits after R176 in the repair script (D1's R177 / D2's R178 will likely land beside it); its two checks close the checks list.

## 5 · Verified

- **Probe** `verify-dash-d3.cjs`: **139 / 139** on the final production build at :3223 (0 · the pure rules 39 · 1 P-14 · 2 Your day · 3 Pipeline ·
  4 Projects · 5 Team · 6 On site · 7 six roles (Accounting's week is money) + Mine · 8 § 2 quiet + 1280 · 1024 touch · 768 touch · 390 touch ·
  320 touch · 844×390 touch, a day and a tick tapped at 390 and 1024 · 9 put back, no page errors).
- **§ 2 quiet:** no element with a filled primary background and no filled button in the five cards at 1440 at rest (the probe's check).
- **Every width, every role** looked at by eye (shots `v3-*`, `r1-*`): no sideways scroll at 320 or 844×390; 44 targets and 14px words on touch.
- **The 1440 pixel diff** of the other pages my files reach, the WIP base (built in a scratch copy, :3233) against this lane (:3234), both on
  copies of the clean lane DB, animations off: Benjamin's · Ryan's · Aisha's · Marcus's project Overviews, Benjamin's Schedule, `/projects`,
  `/tasks`, `/leads` — **0 differing pixels each** (`shots/cmp-1440/`). The Dashboard itself changes on purpose (`_dashboard-before/after.png`).
- `npx tsc --noEmit` clean · `npx eslint` clean on my files · `npm run design:lint` holds every baseline (no rise) · `design:anatomy` on my
  build: "all 1965 measures hold".
- R179 on the lane DB: three runs — first writes, then "already in step"; `all checks pass`.

## 6 · Tallies

Through the harness (`design-source/verify/regression/run.cjs`, RUN_DIR `…/dash-build/D3/reg`, `base.db` = the clean lane DB with R179):

| probe | result | note |
| --- | --- | --- |
| `dash-d3` | 93 / 93 ✓ lines (= 132 with the pure rules' 39; 139 on the final build, run directly) | green |
| `pm2-s45b` | 72 / 72 | green — the Contractors tile's checks now on the Team card's line |
| `pj-r1` | 98 / 98 | green — the project Overview (`lib/projects/queries.ts`) |
| `pj-r5` | 91 / 91 | green — the project's Money |
| `ke` | 31 / 31 | green — the lead ↔ project pieces |
| `pm2-s22` | stops at its § 2 | **D1's to restate**: it waits for the old Maison AI brief (the frame's). Its sections lane D3 moved — § 4 · § 5 and § 6's Team / On site / reading order — run alone from a scratch copy (`…/D3/tools/s22-d3-parts.cjs`): **16 / 16** |
| `pm2-s42a` | 87 / 88 (run from its own folder — its `REPO` is three levels up, so the harness's copy can't run it; not listed in `probes.cjs`) | the one red is the greeting ("the brief greets “Hui Min”.", D1's placeholder has no full stop); the two checks lane D3 moved (On site shows the week's update · Your day quiet) green |

Not run: the rest of the 138-probe regression (no file of theirs is mine).

## 7 · Principles check

1. *The mock wins, exceptions written down* — the drawn page is the mock; every departure is a ▲ above and a REG-D3 row.
2. *One system* — house Card, Row (Show n more), ChipRail, IconButton, Avatar, the thumb, LogSheet, the DS Button; no copied stylesheet.
3. *Plain words* — "5 days late", "was due 20 Oct", "closed to new leads", "Nothing planned today"; no "(5d)", no jargon.
4. *Nothing is lost* — the tick has Undo; closing the log sheet logs nothing; Coming up's cut is gone.
5. *Say why* — a project's line says why it is late or at risk; the stuck mark's tooltip and the row's label say how many.
6. *Back returns* — every door carries `?from=/dashboard` (To do's own address excepted, as To do is L1).
7. *Every screen is whole* — each card has its empty words or leaves the page (On site, Team, Pipeline, Projects); no dead press.
8. *Every width is designed* — desk, 1024 / 768 touch, 390, 320, a phone held sideways; five / four days on a phone.
9. *Tables follow the listing* — no table here; the counts are the listing's own.
10. *Motion with purpose* — the ring's arc and a photo's lift only; reduced motion drops both.
11. *Honest data* — every figure from its module's reader; R179 writes the trail its states need.
12. *Reach for everyone* — every press labelled (rows' labels name health and progress), focus rings on every press, colour never alone (the
    health word leads each line).
