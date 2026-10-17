# S42A · Fixes for audit A — front door, people and settings — outcome (2026-10-14)

The fix package for `s42/audit-A.md` (19 findings: Major 3 · Minor 8 · Polish 8) and audit A's calls (`s42/calls-for-vicky.md` A·1…A·4), built
in lane A on the brief `s42/fix-brief.md`. Register rows: `steps/reg-S42A.md` (REG-S42A.1…19). Probe:
`design-source/verify/pending-modules/verify-pm2-s42a.cjs` (**90 / 90**); shots in `design-source/verify/pending-modules/pm2-s42a/`.
Repair **R125** (+ 3 checks). No migration.

## Ledger — every finding

| ID | Sev | Result | Where · how |
| --- | --- | --- | --- |
| A-01 | Major | **Fixed** (call A·2 as recommended) | `lib/studio-setup/model.ts` (`SetupFacts.templatesLocked`; the template step is done when the plan keeps own templates for Pro, its done line says so) · `lib/studio-setup/queries.ts` (`planAllowsNow('template_editor')`). A Free studio's list reaches 7 of 7 (6 for a studio of one), so the Dashboard's *Set up your studio* row and Maison AI's "steps left" clear |
| A-02 | Major | **Fixed** | `lib/company/invitations.ts` `channelsFor` → WhatsApp only to `isSgMobile` (S30's one rule); Add member's line follows by itself ("Add a mobile number or an email to send … an invitation"), the row reads "not sent", the server's `sendInvitation` / `inviteMember` read the same rule. Phone helpers: Add member (`members-view.tsx`), Edit details and Your profile (`lib/company/member-words.ts`, read by `member-details-fields.tsx` and the profile ghost) |
| A-03 | Major | **Fixed** | Restore: `lib/db/demo-day.ts` (new, pure — `shiftDemoRows` · `EMBEDDED` · `PLAIN_TIMES` · `shiftDateString` · `shiftDateWords` · `shiftJsonText` · `shiftRowKey`), `lib/db/time-columns.ts` (new — every timestamp column off the schema), `lib/db/baseline.ts` (`restoreBaseline` moves every moment by `shiftedDays`; the six special cases removed), `lib/credits/demo-month.ts` (`creditOwnership` — the credits story keeps its own move). Today's base: repair **R125** (+3 checks). Every recency rule listed below |
| A-04 | Minor | **Fixed** | `lib/company/invitations-server.ts` `homeOf` → `/dashboard` (Accounting: Finance) — covers sign-in, join, `/sign-in` and `/sign-up` while signed in; `components/leads/ai-sheet.tsx` Reset → `/` |
| A-05 | Minor | **Fixed** | `callName` in `lib/studio-setup/model.ts`, read by `welcomeFor` and `lib/dashboard/queries.ts` ("Good afternoon, Hui Min.") |
| A-06 | Minor | **Fixed** | `components/leads/detail/my-work-card.tsx` `quietEmpty` (the lead and project Overviews keep the mock's empty) · `components/dashboard/dashboard-view.tsx` passes one Row: "Nothing on your list · Tasks given to you land here" + text "Add a task" → `/tasks?add=1` |
| A-07 | Minor | **Fixed** | `dashboard-view.tsx`: `data.team?.length ? <TeamCard/> : null` (shown only when it applies); the ghost follows (A-16) |
| A-08 | Minor | **Fixed** | `lib/global-search/model.ts`: Create › Add a member (`runners` — `createHits` now honours it), Go to › Sign out (`#sign-out`, run in `components/shell/global-search.tsx` as the studio menu's `leave`), Go to › Open to new leads (`/company/members?open=me`). `members-view.tsx`: `?new=1` opens Add member empty, `?open=me` lands on your row |
| A-09 | Minor | **Fixed** | `lib/notifications/model.ts` (event "A task comes due" + help; templates "Due {when}: …"; field `{when}`; `FeedRow.fields`); the derived rows carry their fields (`lib/notifications/queries.ts` tasks + milestones, `lib/finance/bell.ts` bills + POs, `lib/projects/payments.ts` invoices ready + overdue); `lib/notifications/delivery.ts` `deliverDerived` fills the studio's wording with them. The siblings had the same fault ({milestone}, {invoice}, {vendor}, {amount}, {po} could not be filled) — fixed together |
| A-10 | Minor | **Fixed** | `components/shell/ghost-kit.tsx` `GhostTabs active` + `ghost-kit.module.css` (`.tabsScroll` · `.tabsRow` · `.tabBone`: the strip translated in CSS from the bones' geometry and the frame's `cqw` — no script, so the server's loader stands there too); `CompanyGhostFrame active`; wired in Settings, Finance (+ Money in), Reports and Templates' ghosts |
| A-11 | Minor | **Fixed** (not visible) | Record layouts above the loaders: `app/(editor)/quotes/[quoteId]/layout.tsx`, `app/(editor)/contracts/[id]/layout.tsx`, `app/projects/[id]/layout.tsx` (+ `app/projects/not-found.tsx`, the same record-not-found one level up). Missing or not-yours → 404; real → 200; a deleted project still reaches its listing redirect |
| A-12 | Polish | **Fixed** | `components/shell/maison-fab.tsx` `quietTop` (tucked at the top; back when scrolling up mid-way or at the end) · `components/shell/maison-ai.tsx` passes it on `/dashboard` |
| A-13 | Polish | **Not reproduced · made loud** | On this build the Messages badge is on every not-found page (full load and client navigation, `/not-a-page`, `/leads/x/y/z`, `/company/nope`, `/quotes/nope`, `/projects/nope` — probe §A-13). The rail's `soft()` (`lib/leads/tasks.ts`) now logs any count it cannot read (`[rail] a badge count could not be read — …`), so a missing badge is never silent again. Most likely the audit hit a passing lock on its copy (S08b's 5 s wait) — the log will say |
| A-14 | Polish | **Fixed** | `lib/nav.ts` `notFoundSection` (up to two levels under a section's own address keeps its name — `/company/finance/nope` stays "Finance" as S41b-2's tab layouts want —, one level under a record's address its record, deeper → "Page not found") · `app/not-found.tsx` |
| A-15 | Polish | **Fixed** | `lib/company/member-words.ts` (`detailsHelp` · `emailHelp` · `phoneHelp`) read by `your-profile-view.tsx`, `member-details-fields.tsx` and `your-profile-ghost.tsx` |
| A-16 | Polish | **Fixed** | `lib/ghost-shapes.server.ts` seeds `dashboard.mytasks` · `dashboard.team` (only with a line) · `dashboard.quiet`; `components/dashboard/dashboard-ghost.tsx` draws them (`myOpenTasks` exported from `lib/dashboard/queries.ts`) |
| A-17 | Polish | **Fixed** | `app/leads/actions.ts` `prototypeStudioCount` · `components/leads/ai-sheet.tsx` (asked when the confirmation opens) |
| A-18 | Polish | **Fixed** | `lib/visualizer/spatial/clip.ts` ("3D") — and its siblings S17's own rule (`verify-pm2-s17`: no "3-D" anywhere in source) found: the services list's orbit-clip line (`lib/services/registry.ts`, `GET /api/services`) and comments in `app/tools/floor-plan/page.tsx`, `components/dev/ai-bench/ai-bench.module.css`, `lib/visualizer/spatial/extend.ts` |
| A-19 | Polish | **Fixed** | `welcomeFor({ noLeads })` (`lib/studio-setup/model.ts`) · `fetchWelcome` counts the member's leads |

**Counts:** Major 3 / 3 fixed · Minor 8 / 8 fixed · Polish 8: 7 fixed, 1 not reproduced (A-13 — made loud so it can't hide).

### A-03 — every recency rule, and how each now holds
The demo no longer ages between snapshots: a restore (and pbuild's daily after-step, which restores the old fixture before re-snapshotting) moves
every moment by the same whole days, so each rule below reads on any day exactly as on the snapshot's day. The rules (window · what it reads):
- **Portal:** `NEW_FILE_DAYS` 7 (`lead_files.shown_to_client_at`) · `DUE_SOON_DAYS` 3 · `SESSION_DAYS` 30 (portal sessions) · the client's bell
  read keys (moved inside `portal_bell_reads.row_key`).
- **Dashboard:** `UPDATES_WINDOW_DAYS` 14 (site updates) · "added in the last 7 days" and the week before (`leads.created_at`) · Coming up's
  fortnight · Profit this month (a calendar month — see A·3) · Maison AI's 7- and 30-day answers (`lib/maison-ai/answers/*`, the listing's).
- **Projects:** `WEEK_UPDATE_DAYS` 6 · `UPDATE_GAP_DAYS` 14 · `NEAR_END_DAYS` 7 · `NEAR_DAYS` 7 (choices) · `SETUP_GRACE_DAYS` 7 ·
  `WAIT_GRACE_DAYS` 3 · `WAIT_DAYS` 2 (tickets) · schedules and milestones (now ride, with their shared snapshots).
- **Finance:** `STUCK_DAYS` 7 · `BILL_LEAD_DAYS` 3 · `READY_LONG_DAYS` 7 · the P&L's calendar month.
- **Bell / delivery:** derived reminders (30 minutes; the alerts' lead days) · the "ago" of every row · the daily summary.
- **Others:** Studio Health's ranges (`lib/studio-health`) · `USAGE_DAYS` 30 (platform) · `VALIDITY_DAYS` 30 (quotes) · `LINK_DAYS` 30
  (meetings) · `SHARE_DAYS` 7 (renders) · `INVITE_DAYS` 30 · `WORKSPACE_DAYS` 7 (trial) · `AUTO_FILL_DAYS` 3 · the AI credits month (its own
  move, S08b).
- **Leads (S42B's ask):** a Qanvast return's reply, `lead_returns.replied_at` — a typed timestamp column, so it rides with its return (and
  every other stamp) by itself; the probe checks it (each reply 40 days on, its gap to its return kept).
- **Calendar months** (Profit this month, a month's credits) can't be held by moving days — they read the records of the month the demo day is
  in, as a studio's would; the credits month keeps S08b's re-anchor.
- **Whole days, and never after now.** Whole days keep every hour (REG-341: a task due at 10:00 stays due at 10:00). A restore earlier in the
  day than the snapshot was taken would put the snapshot's last hours a few hours ahead of now, so (given the fixture's `takenAt`) what
  *happened* in the last day before the snapshot is eased into the last day before now — one straight squeeze (`moverFor`), so nothing changes
  order and nothing is after now — while what is *planned* (`PLANNED`: due dates, expiries, meetings, schedules, follow-ups …) keeps its whole
  days. A derived key names the moment it was made from, so it moves with it (a client's read row stays read). A same-day restore (0 days) is the
  snapshot exactly, as before.
- **Stays absolute (on purpose):** what people typed (messages, a quote's notes, an update's words, a client's answer text) and what was signed (a
  contract's frozen copy and its fingerprint) keep their words — a "Thursday" in a message may not be a Thursday after an odd shift. The app's own
  spelled dates (bell rows and their copies, Activity's from → to, a meeting brief) move with their records.

**R125** (today's base, once): Benjamin Han's floor plan "shown" moment (and its Activity line) back inside the portal's window, and his three
newest updates (kitchen · wardrobe · panels, R70's run-day dates) with everything that dates them (Activity, bell rows and their copies, the
Site updates photos and their pictures, read keys) by the whole days since R70 wrote them (read off the panels' "yesterday at 11:00"), never
past now. Guarded (only when aged), idempotent (run twice: "nothing to move"), three checks: the plan inside the window, the kitchen update
inside the fortnight, every update's Activity line on its update's moment. The money month is not moved (a calendar month; the tile's words
are A·3's).

## Calls (`s42/calls-for-vicky.md`)
- **A·1 — the standing session follows a sign-in elsewhere.** *Not built as recommended — its own fallback built.* The prototype has one
  signed-in member: `members.is_you`, read by `sessionMemberId()` and, inside writes, by `sessionMemberSql` (107 uses in 30 files) and by every
  `fetchViewer()`. Pinning a browser to its first member would need every read **and every write stamp** to resolve per request — or a flag
  that flips per request, which races when two browsers act at once (a write stamped with the other member). That is the production session
  (S30: "`sessionMemberId()` becomes the real session's member, and the flag goes"), not a fix. So the call's fallback: the sign-in and
  invitation code steps say *"This prototype has one signed-in member at a time — every open window follows whoever signs in last."*
  (REG-S42A.18). For Vicky: if she wants the pin, it is the developers' real session (`readStudioSession` already knows each browser's own).
- **A·2 — a Free studio's set-up list:** as recommended (A-01).
- **A·3 — the front door opening on a loss:** the words as recommended (REG-S42A.19: "Credit notes S$905.50 more than invoiced this month",
  never "Revenue −S$…"). The dates: A-03 holds every recency rule; October's P&L is a calendar month — its credit notes (2 and 3 Oct) and late-
  September invoices are R84's / R72's dated story, and moving the invoices would drag their payments, reminders, overdue rows, portal reads and
  client opens with them. Left honest, with the plain words; if she wants the demo's October in profit, that is a curation call (a new invoice
  in the month), listed for her.
- **A·4 — the rail's Projects badge vs a Designer's tile:** kept, as recommended (different scopes, each door lands on its list). No change.

## For other packages (lane B / the orchestrator)
- **Area B (quotes · contracts):** `app/(editor)/quotes/[quoteId]/layout.tsx` and `app/(editor)/contracts/[id]/layout.tsx` are new (A-11) — a
  quote / contract page change that adds a way in (e.g. a client's view) stays under the pages, not these layouts' rule; the layouts refuse only a
  missing or not-yours record, as the pages already did.
- **Areas with money and bell rows (finance · projects):** `FeedRow.fields` — a new derived reminder should pass the fields its event's wording
  names (A-09), else its WhatsApp / email falls back to the bell's words.
- **Whoever adds a table or a text column with dates:** timestamp columns ride by themselves; a moment written **inside text** needs a line in
  `lib/db/demo-day.ts` `EMBEDDED` (a JSON key `at` / `…At` / `when` / `…On` is found by itself).
- **The orchestrator:** after this lands, `after-step` repairs `pbuild/base.db` (R125 moves it once) and re-takes the fixture; `pj-r4a` and
  `pj-fix-F` then pass on base copies. CLAUDE.md's Map: the base-state line gains `lib/db/demo-day.ts` · `lib/db/time-columns.ts` · R125; the
  REG-341 rule now reads "every moment rides".
- **Vicky's local.db:** the next after-step repair runs R125 there too (her floor plan / Benjamin's newest updates move only if they have aged).
- **The AI credits story (S08b / S19's):** in today's base `studio_credit_balances.updated_at` sits about an hour and a half ahead of now (R111
  moved it with the story by whole days; `reanchorDays` caps the move by the ledger's newest stamp, not this one). No page reads it, so nothing
  shows; found by this probe's "nothing that happened is after now" check, which leaves the credits story to its own probe (pm2-s08b). If it
  matters, R111's `latest` should take the balance's `updated_at` too.

## Shared pieces changed
- `components/shell/ghost-kit.tsx` + `ghost-kit.module.css` — `GhostTabs active` (new optional prop, new classes; strips without it unchanged).
- `components/company/company-ghost-frame.tsx` — `active` passed through.
- `components/shell/maison-fab.tsx` (`quietTop`) · `components/shell/maison-ai.tsx` (passes it on `/dashboard`).
- `components/shell/global-search.tsx` (`#sign-out`; Create rows honour `runners` for members) · `lib/global-search/model.ts` (three rows).
- `components/leads/detail/my-work-card.tsx` — optional `quietEmpty` (the lead and project Overviews unchanged).
- `lib/leads/tasks.ts` — `railBadges`' `soft()` logs.
- `lib/notifications/model.ts` (`FeedRow.fields`, the event's label, the template, `{when}`) · `delivery.ts` · `queries.ts`.
- `lib/db/baseline.ts` (`restoreBaseline`) · `lib/credits/demo-month.ts` (`creditOwnership`) · new `lib/db/demo-day.ts` · `lib/db/time-columns.ts`.
- `app/not-found.tsx` + `lib/nav.ts` `notFoundSection`.
- `lib/auth/model.ts` (`SIGN_IN.oneAtATime`) · `components/auth/studio-sign-in.tsx` · `components/company/join/join-page.tsx`.

## Probes
- **New:** `verify-pm2-s42a.cjs` — 90 / 90 (production build, :3160, a fresh repaired copy of `pbuild/base.db`; its last section presses Reset).
- **Existing, updated for a deliberate change:** `verify-pm2-s08b.cjs` §6 — "every other render keeps its day" → every render rides (S42 A-03).
- **Existing, updated for a deliberate change** (each commented `S42 audit …, a deliberate change of this rule`): `verify-pm2-s09.cjs` (Join
  lands on the Dashboard), `verify-pm2-s30.cjs` (three sign-ins land on the Dashboard), `verify-pm2-s31.cjs` (a Free studio's list: 1 of 7 done
  — the template step by the default; a studio of one 1 of 6; Dane's sign-in to the Dashboard).
- **Existing, re-run on the final build** (each on a fresh copy of the repaired base, its own server on :3160; `CRON_SECRET` /
  `WHATSAPP_WEBHOOK_SECRET` set; the batches' logs in the scratchpad `s42A/reg1…reg4`):

| Probe | Result | Note |
| --- | --- | --- |
| pm2-s08b | 62 / 62 | restore + credits month; §6 updated |
| projects/pj-r4a | **73 / 73** | was 72/73 (the floor plan's "new" row) — A-03 |
| projects/pj-fix-F | **44 / 44** | was 43/44 (the same row) — A-03 |
| pm2-s22 | 116 / 116 | Dashboard |
| pm2-s08 | 70 / 70 | Set up your studio |
| pm2-s09 | 79 / 79 | after its update (Join → Dashboard) |
| pm2-s01 | 80 / 80 | Your profile |
| pm2-s18 | 63 / 63 | notifications |
| pm2-s30 | 108 / 108 | after its update (sign-ins → Dashboard) |
| pm2-s31 | 104 / 104 | after its update (Free's set-up list) |
| pm2-s41b2 | 206 / 206 | not-found (after A-14's rule kept Finance / Reports tab headers) |
| pm2-s16 | 56 / 56 | rail, Open to new leads |
| pm2-s17 | 130 / 130 | ghosts, "3D" (after A-18's siblings) |
| pm2-s14 | 69 / 69 | Settings › Roles & access |
| pm2-s19 | 116 / 116 | plan locks |
| pm2-s34 | 180 / 180 | with the secrets — derived reminders, outbox |
| pm2-s41b3 | 175 / 175 | with the secrets |
| pm2-s41b4 | 82 / 82 | the bell's offers |
| pm2-s41b5 | 177 / 177 | |
| projects/pj-gap-i | 81 / 81 | Workload |
| lead-project-parity/KE | 31 / 31 | MY TASKS on the lead and project Overviews |
| reports-in-company/verify-reports | 41 / 41 | Reports (its ghost strip) |
| regression `search` | 27 / 27 | ⌘K |
| regression `ghosts-same-390` | 73 / 73 | every ghost against its page at 390 touch |
| regression `ghosts-strips` | captures, no errors | the tab-strip ghosts, every route |
| regression `view-as` | 23 / 23 | |
| regression `sw-r2` | 27 / 27 | |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down.** The one mocked piece touched — MY TASKS' first-run empty (858:24171) — stays on the lead and
   project Overviews; the Dashboard (no mock) gets its own quiet row, registered (REG-S42A.6). Every new sentence is flagged *invented copy*.
2. **One system, no one-offs.** One rule for "a mobile" (S30's `isSgMobile`) in invitations; one place for a member's words
   (`member-words.ts`); one greeting rule (`callName`); one restore rule for every moment instead of six special cases; the Dashboard's empty is
   the Needs you row grammar (house `Row` + text action); the ghost strip is the kit's.
3. **Plain words.** "A task comes due"; "Nothing on your list"; "Credit notes S$905.50 more than invoiced this month"; "Page not found" where
   nothing is there.
4. **Nothing is lost.** A restore keeps every record and every gap; Reset now says the studios started here go; Sign out from ⌘K asks about
   unsaved edits first.
5. **Say why.** A landline's line says what is missing (a mobile or an email); Free's template step says where own templates come from; the
   sign-in code step says why other windows change.
6. **Back returns where you came from.** ⌘K's landings drop their asks (`?new=1`, `?open=me`); not-found's way back unchanged.
7. **Every screen is whole.** No empty Workload card; the Dashboard's ghost draws MY TASKS, Workload and Needs you as the page lands; the
   ghost strips stand where the pages do; record pages answer 404.
8. **Every width is designed.** The Dashboard's button no longer covers a Review at 390; the ghost strips at ≤1024; 390 / 320 have no
   sideways scroll on the pages touched (probe).
9. **Tables follow the leads listing.** Not applicable (no table changed).
10. **Motion with purpose.** The FAB's existing slide, started tucked where the page has its own Ask box; no new motion.
11. **Honest data.** The demo stays as curated on any day; R125's moves are guarded, idempotent and checked; no WhatsApp claimed for a
    landline; the P&L month told as it is.
12. **Reach for everyone.** ⌘K reaches the three people steps by keyboard; the quiet row's text button is a real button; the ghost strip is
    `aria-hidden` as before.

**How to add a missing thing:** one home (each ⌘K row opens the existing place; Reset's words in its own dialog) · shown only when it applies
(Workload, the studios line, the one-member line only while the stand-in answers, the template step's line only on a locked plan) · one filled
button (the Dashboard's MY TASKS no longer adds one) · defaults need no set-up (Free's set-up list completes on the default).
