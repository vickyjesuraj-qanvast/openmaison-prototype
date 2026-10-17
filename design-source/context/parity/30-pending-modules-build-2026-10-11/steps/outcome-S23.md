# S23 · Meetings and the Meeting Co-Pilot — outcome (2026-10-12, lane B)

Cards: `studio:meetings-copilot` (recommendation *needs her mocks / decision*, effort XL; its questions "The Meetings tab first … or both
together?", "A first cut on house pieces, as Projects was built, or wait for mocks?"), `held:meetings` (held by REG-552; "Draw Meetings first,
or build a first cut on house pieces?") and `api:copilot-objections-competitors` (effort S; "should the studio's competitor list also feed the
Lost dialog's competitor field?"). Her "build all of them" 2026-10-11 lifts REG-552 for this card; every question taken as recommended: **both
together, a first cut on house pieces, and yes — the competitor list feeds the Lost dialog**. Carried notes taken: **S02** (the old
`/copilot/share/<id>` lands on the new link with a link card — a new `kind` + its loader; the chat fetchers never stamp Viewed), **S14**
(Calendar and the Co-pilot settings — one home in Settings; Google Calendar "Notify me" waited for this step), **S16** (Tools › Meeting Copilot's
Soon flipped live — pm2-s16 §1 trimmed as a deliberate change), **S10** (the meeting's page registers its Maison AI suggestions; "prepare me for
my next meeting" answers from the records). 1.0 read in full: `src/components/copilot/**` (38 files), `src/lib/copilot/**`, `src/app/api/copilot/**`
(34 routes), `src/app/(main)/tools/copilot-analytics`, `src/app/copilot/share`, `src/components/projects/meeting-summary-card.tsx`,
`src/data/copilot-checklists.ts` · `copilot-objection-defaults.ts`, the settings components; the before/during inventory is banked as
`steps/read-S23-copilot-before-during.md`.

Register rows: `steps/reg-S23.md` (REG-S23.1…23). Probe: `design-source/verify/pending-modules/verify-pm2-s23.cjs` — **see Probes run** (it puts
back every table it touches, whole, and checks the leads' stages and stage logs are as found). Shots: `design-source/verify/pending-modules/pm2-s23/`.

## Pending lines ledger

| Card line | Result | Where |
| --- | --- | --- |
| **studio:meetings-copilot** — Start a meeting from a lead or project: aim, consent, prep card | **Built.** New Meeting ▾ (Plan · Start now · Write up · Upload a recording) on the lead's Meetings, the project's Client › Meetings, Tools › Meeting Copilot (lead picker), the Meeting quick link, the project's Create › Meeting; the meeting's Before view: prep card from the records, the aim (and the objective 1.0 never captured), where, the disclosure + the consent tick (refused without it, page and server), the price before Start | `components/meetings/**`, `app/meetings/**`, `lib/meetings/{model,prep,queries}.ts` |
| A live transcript, in person or on a video call | **Stand-in, said on the page.** Nothing records or transcribes: the studio types or pastes (Client: / Me:), the words save as typed and on leaving; In person · Video call · Showroom is the meeting's where. A real transcriber (Deepgram / Gemini) plugs into the notes box — the developers' | `room/meeting-room.tsx`, `app/meetings/[id]/state/route.ts` |
| AI nudges, a smart checklist and a deal score during the meeting | **Built by rule** (no model): 1.0's seven fast-path rules + the ten objection kinds, each tip with the studio's own answer; the checklist ticking from its words (and the studio's own items); the deal score at the studio's weights (1.0's ×100 bug fixed) | `lib/meetings/{engine,checklists,objections}.ts`, `room/room-parts.tsx` |
| An estimate built from the talk, turned into a draft quote | **Built.** The rough estimate (Singapore rates, a range, "never a quote") and add-ons; **Make a draft quote** through Create Quote's draft (Price book prices, else S$0 — never a guessed price) | `engine.ts` `estimateOf` · `addOnsFor`, `app/meetings/actions.ts` `draftQuoteFromMeeting` |
| Renders, mood boards, portfolio and a competitor's quote during the meeting | **Built on 2.0's own tools**: Mood board (the Visualizer's style boards, kept with the meeting), Render a room (the lead's design in the AI Visualizer), Past projects (1.0's portfolio match), Their quote (Quote X-Ray on the lead); what was made in the meeting's window is listed on its brief. Image generation itself is the Visualizer's own stand-in | `room-parts.tsx` `MoodBoardDialog` · `PortfolioDialog`, `lib/meetings/portfolio.ts` |
| The brief afterwards — profile, estimate, upsells, action items — saved to the lead | **Built.** End makes it; each part edits and stays edited; **Save to the lead** (each detail confirmed, a follow-up task, next steps as tasks) with Undo | `lib/meetings/brief.ts`, `room/save-dialog.tsx`, `saveBriefToLead` · `undoSaveBrief` |
| Upload a recording for a brief | **Built, transcription a stand-in.** The recording kept in the lead's Files with its bytes and its consent; its transcript or notes pasted; the brief made the same way; never charged | `components/meetings/write-up-dialog.tsx`, `writeUpMeeting` |
| Share a brief by link | **Built.** The client's link `/meeting/<token>`: the invitation before, the notes after (summary + next steps; boards; the estimate only when ticked; never the concerns, competitors or score), Stop sharing with Undo; the window runs 30 days from the meeting or the sharing; 1.0's 24-hour `/copilot/share/<id>` redirects or shows the studio's notice | `lib/meetings/client.ts`, `components/meetings/client/**`, `app/meeting/**`, `app/copilot/share/[shareId]` |
| History, Gallery, Analytics with coaching, Objections report | **Built.** History = Tools › Meeting Copilot (every meeting the viewer may see); Gallery = each brief's *From this meeting* + the AI Visualizer's own home (one home for pictures); **Company › Reports › Meetings** = Analytics (tiles, by member, coaching, deal-score check) + the Objections report, Owners and Admins | `components/meetings/meetings-workspace.tsx`, `components/company/reports/meetings-report.tsx`, `lib/meetings/{reports,report-model}.ts` |
| Project › Meeting Summary card | **Built as the With {client} card's *Last met* row** (its next step and deal score, a press from the brief); planned meetings in Coming up; the Client tab's count. No new card on the simplified Overview (S-01) — flag for her if she wants 1.0's card back | `lib/projects/queries.ts`, `components/projects/overview/with-client-card.tsx` |
| **held:meetings** — The Meetings tab and the Meeting quick link on a lead (held · her call · keep until mocks) | **Built — the hold is lifted by her "build all of them".** The tab restored where 858:24784 drew it, the quick link after Contact Log | `lib/leads/stage-policy.ts`, `components/leads/detail/quick-links.tsx` |
| Live co-pilot from a lead or project (consent, transcript, brief) and uploading a recording | **Built** (above; transcript a stand-in) | — |
| Save a brief's facts to the lead with a follow-up task; who sees briefs; filing to a project | **Built.** Save to the lead; Who sees leads decides who sees a lead's meetings (every page, list, ⌘K, action); a meeting on a project's lead files on the project (its `project_id`, Client › Meetings, its pictures on the lead's designs the project carries) | `lib/meetings/queries.ts`, `app/meetings/actions.ts` |
| Meeting Summary card on the project; weekly analytics; Co-Pilot renders and moodboards | **Built** — Last met row; Reports › Meetings' ranges (30 · 90 days · 12 months · All) stand for 1.0's weekly view; renders and boards above | — |
| What waits on it elsewhere: quote lines from a brief | **Built** (Make a draft quote) | — |
| … X-Ray's competitor analyser | **Built** — *Their quote* opens Quote X-Ray on the lead; its readings in the meeting's window are listed on the brief ("Compared with {studio}") | `fetchMeetingRoom` |
| … Co-Pilot metering (25 credits / 10 min) | **Built — her Q-45**: price before Start, block 1 at Start, a check-in at each block, the pause, the refund when not started, Free's three blocks once, the receipt; write-ups free. **Flag:** 1.0 published the price but never charged (its meter had no caller); the brief said "price only if 1.0 charged" — her own Q-45 decision is what's built | `takeBlock` · `startMeeting` · `takeMeetingBlock` · `stopEarly`, `components/credits/*` |
| … Google Calendar invites | **Built without an account**: the .ics file and Google Calendar's own filled-in page on the client's link; Company › Integrations says so. A two-way sync with the studio's Google Calendar (1.0's unmerged branch) is the developers' (S34) | `lib/meetings/calendar.ts`, `app/meeting/[token]/invite.ics`, `integrations-view.tsx` |
| … the AI & Copilot settings | **Built — Settings › Meetings** (its own module after Lead management) | `app/settings/meetings-settings.tsx` · `meetings-actions.ts` |
| … the client's meeting email | **Built** — *Send by email* through the client messages' outbox (event *A meeting is booked*, its words and switch in Settings › Notifications); a real provider is the developers' (`setDeliveryAdapter`) | `lib/portal/client-messages.ts`, `inviteClient` |
| **api:copilot-objections-competitors** — The Objection Responses library (ten kinds, platform defaults, edit, on / off) | **Built** — 1.0's 26 answers in ten kinds, edit · switch · reset to the platform's · the studio's own | `lib/meetings/objections.ts`, `meetings-settings.tsx` |
| The Competitor List | **Built** — names and notes; feeds the tips ("{name} is in play") and the Lost dialog's competitor chips (the card's question, yes) | `meetings-settings.tsx`, `components/leads/move-stage/dialogs.tsx` |
| The co-pilot's objection log and Objections report | **Built** — `copilot_objection_log` written with each brief; Reports › Meetings › Objections | `makeBrief`, `meetings-report.tsx` |
| Note: in 1.0 nothing reads either list | **Fixed** — both are read in the meeting: the studio's answer shows on the tip and on the brief's concerns; a named competitor raises its tip | `engine.ts` `readMeeting` |

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **The card's three questions**: the tab and the live co-pilot together; a first cut on house pieces (no mock); the competitor list feeds the Lost dialog.
- **One home**: a meeting lives on its lead — the lead's tab, the project's Client › Meetings (the lead's component given the base), Tools ›
  Meeting Copilot (the tab unpinned); 1.0's Analytics / Objections are Company › Reports (REG-1361), its settings are Settings › Meetings (S14),
  its Gallery is each brief + the AI Visualizer's home.
- **A meeting held is the Met log** (never a second record): logs list as rows and open as meetings; a held meeting joins Met past Met, else
  offers Move to Met carrying the meeting.
- **Planning is new** (1.0 started sessions on the spot): a planned meeting holds the invitation and a reminder task; an in-person next step on
  a contact log plans one.
- **By rule, never a model**: the co-pilot's tips, checklist, score, estimate, tags and the brief are rules over the words (the seam a model
  takes later, `readMeeting`); listening, transcription and image generation are stand-ins said on the page.
- **Credits**: her Q-45 (25 per 10 minutes, the check-in, Free's one 30-minute meeting) for the live co-pilot only; write-ups free — flagged
  above against the brief's "only if 1.0 charged".
- **The client's link**: the token is the permission; one projection reads only what the client may see; competitors and doubts never reach
  them; the link's 30 days run from the later of the meeting and the sharing.
- **Outcomes are derived** (Won / a project → went ahead; Lost → not going ahead), never set by hand (1.0 asked "converted · follow-up ·
  dropped" on End); a written-up meeting's score counts in Reports.
- **Who may**: Who sees leads; Accounting has none; delete = whoever planned it, Owner, Admin; Settings and Reports = Owners and Admins.

## What to check in the browser (production build, 1440 and 390; View as switches roles)
- **Dane (Owner)** — Kevin Ng › Meetings: one row "First consultation · Written up from notes · Held · Brief to save · 53 · Cool"; the tab's
  count and *Briefs to save (1)*. Open it: the brief (summary, next steps, message, heard, concerns with the studio's answers, score, estimate,
  the meeting); Save to the lead → the dialog → Saved … Undo; Share the notes → Copy link → open the link in a private window; Stop sharing.
  New Meeting ▾ › Start a meeting now → press Start without the tick (it asks) → tick → Start ("25 AI credits for the first 10 minutes") →
  type "Client: Our budget is around 150k …" → tips, ticks, score; End → the receipt. Tools › Meeting Copilot (no Soon) → /meetings with the
  Lead column. Settings › Meetings (switch → Undo). Company › Reports › Meetings. ⌘K "first consultation". The bell after a client answers.
- **Hui Min (Admin)** — changes Settings › Meetings, reads Reports › Meetings, deletes any meeting.
- **Alex (Designer)** — Jonathan Teo › Meetings: "First consultation · Upcoming" (his own, planned); its page's Before view; Send the
  invitation (WhatsApp opens); the client's page "I'll be there" → Alex's bell; Maison AI "prepare me for my next meeting" → Jonathan.
  New Meeting ▾ › Write up a meeting → "Brief made from the notes" with Move to Met (Jonathan is in Contacted).
- **Germaine / Michelle (Designers)** — see the studio's meetings (Who sees leads: everyone); Settings › Meetings reads (switches resting);
  Reports › Meetings says it isn't theirs.
- **Priya (Accounting)** — /meetings is the access gate.

## Probes run (lane B, `next start -p 3170` on a fresh repaired copy of base.db each)
| Probe | Tally | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s23.cjs` (new) | **147 / 147** | the final build; 12 sections — one home, plan / cancel / Undo, the quick link, the invitation + client page + .ics + bell, the co-pilot (consent, price, ledger, tips, checklist, score, estimate, check-in, End, receipt, the Met log), Save to the lead + Undo, Share / Stop sharing, the draft quote, write-up + Move to Met, a recording, the contact log's planned meeting, Settings / Reports by role (Dane · Hui Min · Germaine · Priya), ⌘K, 1.0's old link, 390 · 320 · 768 touch, the ghosts (lists, the meeting's Before and brief, the client's invitation and notes) |
| `pending-modules/verify-pm2-s16.cjs` | 56 / 56 | updated as a deliberate change: Meeting Copilot live, one Soon tile |
| `pending-modules/verify-pm2-s10.cjs` | 107 / 107 | Maison AI everywhere |
| `pending-modules/verify-pm2-s02.cjs` | 105 / 105 | link cards (the new `meeting` kind beside them) |
| `pending-modules/verify-pm2-s05.cjs` | 113 / 113 | lead records |
| `pending-modules/verify-pm2-s14.cjs` | 69 / 69 | Settings and Company leftovers |
| `pending-modules/verify-pm2-s17.cjs` | 130 / 130 | Settings' and Company's ghosts |
| `projects/verify-pj-r1.cjs` | 98 / 98 | updated as a deliberate change: the phone sheet's Create group has Meeting |
| `projects/verify-pj-gap-a.cjs` | 72 / 72 | the project record (Notes & Logs, Questionnaire) |
| regression `st-r1` | 57 / 57 | updated as a deliberate change: seven Settings modules |
| regression `dane-p2b` | 56 / 56 | updated as a deliberate change: the strip and its ghost, seven tabs |
| regression `search` · `kb-r1` · `kb-r2` | 27 · 35 · 29 | ⌘K and the keys |
| regression `ux-p1` | 81 / 81 | the lead journey (Met logs, Notes' contact logs) |
| regression `ghosts-same` · `ghosts-measure` | 51 / 51 · every Δ 0 | REG-708 |
| `npm run design:anatomy` (the meeting pages added to its list) | 1699 measures hold | 76 pages, 269 table heads, 24 dialogs, 41 page menus |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (16 old warnings) · nothing new | — |

Every run: a fresh copy of base.db, migrated and repaired, `DATABASE_URL` on the `next start` line, port 3170 stopped by port after. Not run
here: the probes named in the brief that are not in the repo (`verify-leads-*`, `verify-parity-r1…r3` live in an older scratchpad, not banked).

## Migration and repair
- **Migration 0097 (lane)** `drizzle/0097_meetings_s23.sql`, additive: `meetings` · `copilot_objection_log` · `studio_objection_responses` ·
  `studio_competitor_list` · `studio_checklist_items`, and `lead_tasks.meeting_id`. All five tables are in `BASELINE_TABLES` and the snapshot's
  `TABLES`; `restoreBaseline` shifts a planned meeting's time with the demo day. **Main already holds a 0097 (S18's notifications)** — the land
  script regenerates this one in main (it will be 0098); the lane's journal `when` was moved after S18's so the lane migrates on today's base.db.
- **Repair R140** (Kevin Ng's Met log written up as a meeting with its brief and objection log; Alex's planned first consultation with
  Jonathan Teo and its reminder; the Met-log pointer and reminder-hour keep-in-step rules; six closing checks). R15 now leaves a meeting's
  reminder on the meeting's hour. **R141 is the next free in lane B's range.** The baseline fixture is the orchestrator's (`db:baseline`).

## For the next steps
- **S34 (real services)**: a transcriber plugs into the notes box (`room/meeting-room.tsx` `write`), the recording's words into
  `writeUpMeeting`'s `notes`; a model into `readMeeting` / `briefOf` (both pure, one input each); Google Calendar two-way sync beside
  `lib/meetings/calendar.ts`; the client email rides `deliver()` already.
- **S26 (Team and group chats)**: a meeting could post its brief to the project's Team conversation (not built — no card line asked).
- **S32 (personal prefs)**: 1.0 kept the co-pilot's parts per browser; 2.0 keeps them per studio (Settings › Meetings) — a member's own
  override would sit there.
- **Any step adding a lead tab or a quick link**: `DETAIL_TABS` now has nine tabs, the lead's quick links nine, the project's eight;
  pm2-s23 asserts Meetings' place by name.
- **The land**: S18 (lane A) also touched `lib/notifications/model.ts` and the Settings modules — this step adds `meeting_answered` to the
  former and the *Meetings* module (after Lead management) to `lib/settings/modules.ts`; expect a merge there.

## Found in 1.0, not on a card
- **Ask Copilot** (a chat inside the meeting, which could not see the transcript) — answered by rule as the meeting page's Maison AI
  suggestions ("What should I ask next?", "How do I answer their … concern?", "What's missing from the scope?"); a free question box is
  Maison AI's own Ask.
- **Floor-plan notes** (a canvas held in memory, never saved) — the meeting keeps photos and the floor plan from the lead's Files; marking a
  plan up is the project's Floor plan (gaps build G). Not rebuilt as a second canvas.
- **The meeting outcome on End** (converted · follow-up · dropped) — derived from the lead instead (Reports).
- **Wake lock and the leave guard during a meeting** — the page saves as typed and on leaving (beacon); no wake lock.
- **Per-item share links** (a mood board, the estimate, the portfolio, each with a 24-hour token and a view count) — one link per meeting,
  the studio choosing what it carries; the first open is kept (1.0 counted every fetch, chat previews included).
- **"Powered by" on the share page**, the demo / dry-run mode, the debug engine — not carried (the platform's name never reaches a client;
  2.0's demo is its data).
- **Speaker assignment, the intelligent transcript clean-up, audio chunks in storage** — with the transcriber (S34).
- **1.0's bugs fixed on the way**: the saved weights broke the score (×100), the checklist's keywords and the studio's own items were never
  read, the studio's objection answers and competitors were never shown, the objective was never captured, the estimate's prices came from
  the model straight into the quote.

## Shared pieces changed
- `components/credits/credits-client.ts` (`CreditWork`, `openCreditBlock` takes a meeting) · `credit-dialogs.tsx` (the meeting's words).
- `lib/notifications/model.ts` (event `meeting_answered`), `lib/portal/client-messages.ts` (`client_meeting`, its fields and words).
- `components/leads/assignee-field.tsx` (an optional `label`), `components/leads/tasks/use-create-intent.ts` (`CREATE_EVENTS.meetings`).
- `components/leads/detail/quick-links.tsx` (Meeting back on both strips), `components/leads/detail/tab-ghosts.tsx` (the Meetings tab's
  ghost), `components/shell/tools-popover.tsx` (Meeting Copilot's href).
- `lib/leads/stage-policy.ts` (`DETAIL_TABS` · tab counts), `lib/leads/detail.ts`, `lib/projects/tabs.ts` · `needs-you.ts` · `queries.ts`,
  `components/projects/overview/with-client-card.tsx`, `components/projects/project-frame.tsx`.
- `lib/leads/move-link.ts` · `stage-data.ts` (`MeetingLog.meetingId`), `components/leads/move-stage/wizard.tsx`, `app/leads/[id]/overview.tsx`
  (the Met handoff), `app/leads/actions.ts` (`planFromContactLog`, also on Add Log), `app/leads/notes-actions.ts`, `app/leads/tasks-actions.ts`
  (a reminder at a planned meeting's time links to it), `components/leads/move-stage/dialogs.tsx` (the Lost dialog's competitor chips).
- `lib/leads/activity.ts` · `events.ts` (`meeting_deleted`), `lib/global-search/{model,queries}.ts`, `lib/maison-ai/{intents,answer}.ts`,
  `lib/link-cards/*`, `lib/links/old-links.ts`, `components/company/integrations-view.tsx`, `components/company/reports/reports-{workspace,ghost}.tsx`,
  `lib/company/sections.ts`, `lib/settings/{modules,copy}.ts`, `app/settings/{page,settings-view,settings-ghost}.tsx`.
- `components/leads/notes/lead-notes.tsx` and `app/leads/workspace.tsx` · `app/leads/[id]/overview.tsx` (the save's and the move's snackbar
  says "· a meeting is planned for …" when a contact log planned one; `moveStage` returns `planned`).
- `lib/db/schema.ts`, `lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R140; R15 leaves a meeting's
  reminder alone), `scripts/design-anatomy.mjs` (the three meeting pages on its list).
- Probes changed as deliberate changes: `verify-pm2-s16.cjs` (Meeting Copilot live; one Soon tile), `settings-parity/verify-st-r1.cjs` and
  `uat-dane-2026-10-01/P2b/verify-p2b.cjs` (seven Settings modules), `projects/verify-pj-r1.cjs` (the phone sheet's Create group has Meeting).
- No `components/om/*`, shell frame or `app/globals.css` change.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock draws Meetings beyond the tab and the quick link (858:24784); both restored where drawn;
   every other screen is on house pieces and logged with its invented words (REG-S23.1…23), REG-552's lift recorded.
2. **One system, no one-offs** — the table core and the listing's model, the lead Overview's cards and LEAD STAGES rows, the house dialogs,
   send dialog, chips, member picker, deleted sheet, snackbars with Undo, `couldnt` / `refusalOf`, PortalMenu; tokens only — design:lint holds.
3. **Plain words for studio people** — "Start the meeting", "Save to the lead", "Briefs to save", "their semi-D", "25 AI credits for each 10
   minutes"; no "session", "objective" or "shadow quote".
4. **Nothing is lost** — every remove (cancel, delete, stop sharing, a setting, a saved brief) answers with Undo; the words save as typed and on
   leaving; a meeting deleted for good lets its Met log stand alone; the edited parts of a brief stay when it is made again.
5. **Say why** — Start without the tick says what to do; a refused action answers `{ error }` and the snackbar names it; a disabled Delete
   says who may; out of credits opens the house dialog that says why and what to do.
6. **Back returns where you came from** — every door opens a meeting with `?from=` (the lists, ⌘K, Activity, the bell); the meeting's Back
   returns there, else to the lead's (or the project's) Meetings; Settings and Reports doors carry it too.
7. **Every screen is whole** — every page ships the shell, its `loading.tsx` and `PageReveal` ghost of its own layout (measured), its error
   page, the Maison AI suggestions; the probe's page-error log is empty.
8. **Every width is designed** — 1440, 768 touch, 390 and 320 checked against `screen.width`; the live meeting's views fold to chips on a
   phone; the client's page fills a desk window and fits a phone (a bug the probe caught and fixed).
9. **Tables follow the leads listing** — the meetings list and Reports' tables are the listing's model (frozen first column, Column settings,
   resizable heads, phone cards).
10. **Motion with purpose** — no new motion; the house snackbar's and the reveal's.
11. **Honest data** — every state is a record (R140, REG-343); the co-pilot works by rule and the stand-ins say so; credits charge real
    ledger rows and refund them; outcomes are derived, never typed.
12. **Reach for everyone** — real buttons, menus and dialogs with names; the checklist's ticks are checkboxes; `data-kb="create"` on New
    Meeting and Start; the client's page works with a keyboard and on a phone.
