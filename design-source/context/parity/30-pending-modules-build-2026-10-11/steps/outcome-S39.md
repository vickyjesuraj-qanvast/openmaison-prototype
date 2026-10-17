# S39 · Studio Health (+ S40 · designer portfolio profiles are whole) — outcome (2026-10-13, lane A)

Cards: `studio:studio-health` (1.0's Accounts › Studio › Studio Health, "How your team is using OpenMaison" — the survey's *skip*: her
Accounts Setup Q-16 answer was No, "it is the platform's telemetry, and the business numbers already sit in Reports") and
`api:designer-portfolio-profiles` (the survey's *skip*; S27 brought it back with Hangouts). Her "build all of them" 2026-10-11 asks for every
card in its right form. **The right form (the orchestrator's call, recorded — REG-S39.1):** Studio Health built from **the studio's own
records only**, as **the last tab of Company › Reports** — no page-view or event tracking, no nightly rollup (the telemetry her No declined is
kept out, each of its tiles named below). Every figure is the same count another page shows, read through that page's own rule.

1.0 read: `src/app/(main)/accounts/usage/page.tsx` (Owner-only), `src/app/(main)/accounts/page.tsx` (its menu row), `src/components/settings/
usage-dashboard.tsx` (7d · 30d · 90d), `src/components/analytics/studio-health-view.tsx` (the four KPI groups, the trend, feature usage, top pages,
team activity), `src/components/admin/analytics/trend-chart.tsx`, `src/app/api/usage/studio-health/route.ts` (every figure's source),
`src/app/api/cron/usage-rollup/route.ts`, `src/lib/usage/{rollup,funnels,types,client-event-names,client-events,track,phone-home}.ts`,
`src/app/api/usage/{event,page-view}/route.ts`, `src/lib/queries/usage.ts`, and each `track(...)` call site (`escalations`, `homeowner/projects/
[id]/issues`, `tasks/records/[id]`, `render`, `buddy/chat`, `quotes/parse`, `copilot/session`, `hangouts/meetings/[id]/end`,
`homeowner/auth/verify`). For S40: `src/lib/queries/id-profiles.ts`, `src/app/api/id-profiles/records/route.ts`, `src/components/id-profile/
profile-editor.tsx` (never mounted), `src/app/hangouts/[eventId]/page.tsx` (the only reader, two specialisations a card), `src/types/app.ts`
(`IDProfile`). 2.0 read first: S19's Usage (`lib/credits/queries.ts`), S22's Dashboard (`lib/dashboard/*`), S23's Reports › Meetings, S27's
profiles (`lib/portfolio/*`, `components/portfolio/*`), S30's sessions (`lib/auth/session.ts`), Qanvast Ops › Studios (`lib/platform-studios.ts`).

Register rows: `steps/reg-S39.md` (REG-S39.1…12, S40's is .12). Probe: `design-source/verify/pending-modules/verify-pm2-s39.cjs` — **174 / 174**.
Shots: `design-source/verify/pending-modules/pm2-s39/` (1440 · 1024 · 768 · 390 · 320, Last 30 days at 1440 and 390, the chart, the table,
the Designer's gate, S40's landing, the held ghost at 1440 and 390).

## Pending lines ledger

| Card · line (word for word) | Status | Where |
| --- | --- | --- |
| studio-health · "Engagement tiles: active members, sessions, AI runs, page views" | **built** — *Your team*: **Active members** "n of N" (members with an act in the range, by the 40 record stamps that name a doer — `ACT_SOURCES`; N = Company › Members' active members; help "n did nothing" / "Everyone took part"), **Sign-ins** (1.0's Sessions: `studio_sessions` started, S30's record; "by n members"), **AI runs** (Plan › Usage's "Times used", its credits net of refunds). **Page views — kept** (her Q-16 reason: the platform's telemetry; nothing in 2.0 records what a member opens, and the foot says so) | `lib/studio-health/{sources,model,queries}.ts`, `components/company/reports/studio-health-report.tsx` |
| studio-health · "Team and client-portal activity tiles" | **built** — *New work*: Leads added (Reports › Leads' own "leads in range"), Projects started · n completed (Reports › Projects' tiles), Quotes sent (to the client, never a VO), Invoices sent — each "Up from n / Down from n / Same as before" against the equal span before where 1.0 had a delta chip; *Work done*: Tasks done "of n added", Tickets resolved "of n raised" (1.0's escalations), Site updates (the Dashboard's published updates), Hangout chats (a Hangout's Chats held); *Your clients*: Portal sign-ins, Issues reported, Messages, Choices made — Qanvast Ops › Studios' four figures, one rule (`clientPortalActs`) | same |
| studio-health · "Top pages, feature funnels, a table per member" | **built** — the table per member: **By team member** on the listing's model (Last active · Days active · AI runs · Quotes sent · Tasks done · Site updates; Sign-ins in Column settings, off by default; Export; phone cards). **Top pages — kept**, **feature funnels — kept** (her Q-16 reason: both need page-view and event tracking; what each AI tool did is Plan › Usage's By tool, one press from the AI runs tile) | `components/company/reports/{studio-health-report,report-table}.tsx` |
| studio-health · "Page-view and event tracking with a nightly rollup" | **kept** — her Q-16 No (the platform's telemetry). The page reads what the studio's work already wrote; the probe checks no usage, page-view or rollup table exists and that reading the page writes no record. **Stand-in for the demo's history:** R123 gives the demo's past the sign-ins its acts imply (REG-343) — real sign-ins are S30's | `scripts/repair-demo-data.ts` R123 |
| designer-portfolio-profiles · "Years of experience and specialisations on a designer's public card" | **built by S27** (checked) — "{n} years in interior design" and **Known for** (the member's specialty from their lead preferences, up to three chips — 1.0's Hangout card showed two) on every reader: the Hangout pages, the portal's About › Our team, the profile's preview. **S40 adds** the door that was missing: a member could not change their own Known for from their profile (the link was the Owners' and Admins', to the list) — it now opens their Preferences dialog on Members, for themself too (REG-S39.12) | `components/portfolio/public-profile-view.tsx`, `components/company/members-view.tsx` (`?prefs=`) |
| designer-portfolio-profiles · "Portfolio projects with pictures per designer" | **built by S27** (checked) — Their work: up to twelve pieces, each with up to eight pictures, a cover, its place, kind of home and style (a superset of 1.0's title · property name · description · images), on the same three readers and the meeting room's Past projects | `lib/portfolio/*`, `components/portfolio/*` |
| designer-portfolio-profiles · "A screen to edit any of it (1.0 has none: its editor is dead code)" | **built by S27** — the member's **Public profile** (`/company/members/[id]/profile`: Their card · Their work · How clients see it); **S40** makes the one field it didn't edit reachable for its owner (Known for → their preferences) | same |

## Found in 1.0, not on a card
- **Platform analytics** — `/admin/analytics` (leaderboard, feature matrix, funnels, a studio's drill-in — the same `StudioHealthView` across
  studios), `/api/admin/analytics/{leaderboard,feature-matrix,funnels,studios,ingest}`, `/api/cron/fork-analytics-pull` and the forks' phone-home
  (`src/lib/usage/phone-home.ts`): **Platform admin — excluded by her**; the per-studio half is this tab, the cross-studio half is Qanvast Ops'
  (its Studios page already counts each studio's client usage, now through this tab's rule). **For S41b:** nothing to build.
- **The quote-entry funnel events** (`quote_entry_template_applied` … `quote_entry_view_all_clicked`, 1.0's 2026-07 Open Shelf measurement) and
  `bill_recorded` — client events for 1.0's own product decisions, the same telemetry her Q-16 declined; not carried.
- **`/tools/copilot-analytics`** — S23's Reports › Meetings.
Nothing else in `accounts/usage`, `lib/usage`, `api/usage` or the id-profile folders goes without a home.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **One home: a Reports tab, the last one** (business reports first, then how the app is used); **Owners and Admins** (the other tabs' rule —
  1.0's page was the Owner's alone); the gate for anyone else; ⌘K offers it to Owners and Admins only.
- **The house ranges** (30 · 90 · 12 months · All, opening on 90) for 1.0's 7 · 30 · 90 days — one set for every report (parity P-31); a
  week's view is the Dashboard's ("n added in the last 7 days").
- **No tile coloured; comparisons in words** ("Up from 3"), never red or green — a count going up is not good or bad by itself.
- **Sign-ins stay a tile and a column, not a line on the chart** (on one scale they dwarf the people; a 24-hour or 30-day sign-in says little
  week by week). **Days active** is the column that says who uses it.
- **Tasks done counts the day the task's own record says it was ticked** (its Activity line; a task ticked before that line existed, by its last
  change) and credits whoever ticked it — four of the demo's twelve done tasks predate the line, so they count in the tile and for no one.
- **The demo's past gets its sign-ins** (R123), never today's: the standing session stays the demo's way in.
- **S40: Known for stays the member's specialty** (S27's one record — the words the lead suggestion matches are the words clients read); its door
  opens the preferences rather than a second editor on the profile.

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner), 1440:** Company › Reports → **Studio health** (last tab). Last 90 days: Your team "7 of 8 · 1 did nothing", Sign-ins, AI runs
  "6 · 70 credits used"; New work "Leads added 30 · Up from 1" …; Work done; Your clients; Over time (two lines, Show the numbers); By team member
  (Dane first, Priya at 0 days). Press **Leads added** → Reports › Leads on the same range with the same number in its caption; Back → Studio
  health on that range. **Projects started** → Reports › Projects, the same two figures. **Active members** → Company › Members (8 rows). Switch to
  All time: the comparing tiles lose their line. Column settings → Sign-ins on. Export → the sheet. Maison AI → "Who hasn’t used OpenMaison
  lately?". ⌘K "studio health".
- **Hui Min (Admin):** the same. **James (Manager) · Germaine (Designer):** the tab's gate "Studio health is for Owners and Admins". **Priya
  (Accounting):** no figure reaches her.
- **Qanvast Ops › Studios** (Last 30 days) shows the same four client figures as Your clients on Last 30 days.
- **S40 — Germaine:** Your profile › Your public profile → "Known for … — your specialty, set with your lead preferences on **Company ›
  Members**" → Members opens with **Lead preferences · Germaine**; close it, Back → her profile. On Dane's profile (read only) there is no link.
- **390 / 320 touch:** tiles two-up (one a row at 320), Export inside the screen on every Reports tab, member cards with no rule across their top,
  no sideways scroll. **A cold load:** one ghost, the page's own (groups, tiles' words, the chart's card, the table).

## Probes run
On fresh copies of the repaired base (`pbuild/base.db` + migrate + repair, R123 in it) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (16 warnings, all older files') · `npm run design:lint` nothing new ·
`npx next build` (`DATABASE_URL=file:<scratch>`, under the lock) green · `npm run db:repair` twice on the same copy: the second run writes nothing.

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s39.cjs` (new — §1 the tab · §2 every figure against SQL on all four ranges · §3 the doors: Reports › Leads and › Projects on the same range and Back, Members, Plan › Usage, Qanvast Ops › Studios · §4 the chart, its AI runs adding up · §5 the table and Column settings · §6 Export, Maison AI, nothing tracked · §7 roles and ⌘K · §8 R123 · §9 S40 · §10 390 · 320 · 768 touch, Export on every Reports tab, phone cards · §11 the ghost against the page at 1440 and 390, ±2 px) | **174 / 174**, page error log empty |
| `reports-in-company-2026-10-08/verify-reports` (five tabs now — a deliberate change) · `parity-map-build/verify-pm-f` (Qanvast Ops › Studios, its usage through the shared rule) | 41 / 41 · 60 / 60 |
| `pending-modules/verify-pm2-s19` · `s22` · `s23` · `s25` · `s27` · `s30` (its sessions helper reads the run's own — a deliberate change) | 116 / 116 · 116 / 116 · 147 / 147 · 98 / 98 · 155 / 155 · 108 / 108 |
| through `regression/run.cjs` on :3160 (RUN_DIR from the same base): `insights-head` · `ghosts-same` (the new route on its list) · `ghosts-same-390` · `ghosts-measure` · `ghosts-strips` · `ghosts-film` · `search` | 16 / 16 · 67 / 67 · 67 / 67 · Δ 0 (7 rows) · shots, no tally (as before) · no keys given, nothing run (as before) · 27 / 27 |
| `npm run design:anatomy` (scratch `next start`, :3160; Studio health on its list) | 88 pages, 277 table heads, 26 dialogs, 41 page menus — **all 1752 measures hold** |
| `pending-modules/verify-pm2-s31` (reads studio sessions) · `verify-pm2-s17` (the Reports bar in its ghost measure) · `projects/verify-pj-gap-i` (Reports › Projects by role) | 104 / 104 · 130 / 130 · 81 / 81 |

## Migration and repair
- **No migration** — Studio health has no record of its own; every figure reads its home's.
- **Repair R123** (lane A; **R124 next**) — the demo's past sign-ins (`ss-trail-<member>-<day>` · `ps-trail-<client>-<day>`, written once, never
  today's), three checks in the closing list. After the merge, `npm run db:baseline` carries them into the base (S30's probe already expects that).

## Shared pieces changed
- `components/leads/insights/insights-view.module.css` — the two bug fixes (REG-S39.8 · .9) reach every Reports tab that composes it (Leads,
  Projects, Meetings, Studio health); `insights-view.tsx`, `project-insights-view.tsx`, `meetings-report.tsx` take an `initialRange` (REG-S39.7).
- `components/company/reports/report-table.tsx` (new, `ReportTable` moved out of `meetings-report.tsx` unchanged, the caller's sheet passed in);
  `reports-ghost.tsx` (`StudioHealthGhost`; Meetings' phone card heights 222 · 486); `project-insights-ghost.tsx` (210); `reports-workspace.tsx`;
  `app/company/reports/[tab]/page.tsx` (`?range=`, the health tab).
- `lib/leads/tat.ts` (`readRange` · `rangeParam`), `lib/company/sections.ts` (`REPORTS_TABS` + health), `lib/global-search/model.ts` (the page),
  `lib/dashboard/updates.ts` (`publishedSiteUpdateRows`, the Dashboard's query made the one rule — no change to the card), `lib/platform-studios.ts`
  (its four client figures counted from `clientPortalActs` — the same rows, the same numbers).
- S40: `components/portfolio/public-profile-view.tsx` (the Known for door), `components/company/members-view.tsx` (`?prefs=` landing).
- `scripts/design-anatomy.mjs` (the route), probes `verify-reports.cjs` · `verify-pm2-s30.cjs` · `ghosts/verify-ghosts-same.cjs` (each change
  commented "(pending modules S39, a deliberate change of this rule)").
- No `components/om/*`, shell frame or `app/globals.css` change.

## For the next steps
- **S41b:** Studio Health's card is answered (built, three lines kept with her reason); nothing in 1.0's usage folders is left without a home.
- **S42:** the demo's ageing moments — Studio health counts what happened *in the range*, so as the demo's history ages, Last 30 days thins
  (today 6 of 8 active); the restore's day-shift (S42's note) would move these too if it shifts the demo's recent acts. The Members page's crumb
  from a profile ("Public profile / Company / Members") is the house's L2 crumb, unchanged — worth a look in the UX audit.
- **S34 (developers):** none — nothing here calls a provider. A real product-analytics stack, if ever wanted, is the developers' and Qanvast
  Ops', never the studio's page.
- **For CLAUDE.md's Map (the orchestrator's):** *Studio health (pending modules S39)* — `/company/reports/health`; `lib/studio-health/{sources,
  model,queries}.ts` (`ACT_SOURCES` — the one list of records that name their doer; `clientPortalActs` shared with Qanvast Ops); `components/
  company/reports/{studio-health-report,report-table}.tsx`; `?range=` on every Reports tab; R123.

## Flags for Vicky
- **No mock** — every piece is a house piece (the Reports tabs' bar, `StatTiles`, Market Insights' chart, the Reports table) and every word is
  logged as invented copy (REG-S39.1…5).
- **Your Q-16 was No** — this tab is your "build all of them" read the right way: the studio's own records, no tracking. Page views, top pages
  and feature funnels are not on it, and the foot says why.
- **Two bug fixes reach every Reports tab** (Export cut off at 390; a stray rule on phone cards) — REG-S39.8 · .9.
- **The demo now has a sign-in history** (R123) — Studio health would otherwise show 0 sign-ins beside months of work.
- **Active members counts every role, Accounting too** — Priya shows at 0 days because the demo gives her no history; the payments, invoices,
  bills and expenses she records are on the list of acts and count from the day she makes them.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the tab; built on the Reports tabs' own pieces and grammar (range chips,
   caption "Filtering on …", Export, sections, the table); every invented word in REG-S39.1…5.
2. **One system, no one-offs** — `Chips` · `ChipRail` · `StatTiles` / `StatTile` (with `press`) · Market Insights' `ArticleChart` · the shared
   `ReportTable` on the table core · `ColumnSettingsDrawer` · `ExportDialog` · `useMaisonAi` · the ghost kit; the page's sheet composes Leads ›
   Insights' (`npm run design:lint` holds). The Meetings tab's table piece is now shared rather than copied.
3. **Plain words** — "Your team", "Who used OpenMaison — from what they did, not the pages they opened", "n did nothing", "Up from 3",
   "of 18 added", "Filtering on the day each thing was done"; 2.0's names over 1.0's (Tickets, Site updates, Portal sign-ins).
4. **Nothing is lost** — the page writes nothing (probed); S40's landing opens a dialog and saves nothing unless asked; Column settings keeps the
   house reset.
5. **Say why** — the foot says what is counted and that pages aren't tracked; the gate says whose the tab is; every tile's help says what its
   number is or what it compares with.
6. **Back returns where you came from** — every door carries `?from=` with the range; Reports › Leads / › Projects open on the same range;
   S40's Members landing returns to the profile.
7. **Every screen is whole** — the Reports frame (header, tabs), `loading.tsx` + `PageReveal` drawing `StudioHealthGhost` (the page's own
   classes and words, probed ±2 px at 1440 and 390), Company's `error.tsx`, the empty lines ("Nothing happened in this range"), the gate.
8. **Every width is designed** — one row of tiles a group at a desk, the house tile rule below (two-up, one at 320), the chart's narrow plot,
   the table's phone cards; no sideways scroll at 390 · 320 · 768 against `screen.width`; Export inside the screen (fixed for every tab).
9. **Tables follow the leads listing** — By team member on the table core: frozen Member, resizable and draggable heads, Column settings
   (up to 3 pinned), phone cards labelled by their heads.
10. **Motion with purpose** — none added (the chart's crosshair is the house chart's).
11. **Honest data** — every figure read through its home's rule and probed against SQL on every range and against its other page (Reports ›
    Leads, › Projects, Members, Plan › Usage, Qanvast Ops › Studios); the demo's sign-ins backed by its own acts (R123); no sample figure.
12. **Reach for everyone** — each group is a region named by its heading; tiles that go somewhere are links named with their figure and
    destination; the chart reads with ← → and as a table; the table's heads are column headers; focus is the house pieces'.
- **How to add a missing thing** — one home (Reports, where every report lives; no rail item, no Settings page); shown only when it applies
  (projects, Hangouts, the portal); no filled button (a report has none — Export is outlined, as on the other tabs); defaults need no set-up
  (the page reads what the studio already wrote).
