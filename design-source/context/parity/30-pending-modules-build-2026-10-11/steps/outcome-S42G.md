# S42G · A meeting held moves its lead the way the stage policy allows — outcome (2026-10-14, lane A)

The fix package for one carried item — `s42/carried-notes.md` › "Found while landing S42C" › **From S42E's outcome**: S23's meeting room offered
"Move to Met" after a held meeting, which the default **Linear** stage policy (one stage at a time, REG-111…) refuses for a lead still in New
("Complete Contacted first"). Built in lane A on `s42/fix-brief.md`, on top of S42E's `heldMeetingStep` and `resolveMoveHandoff`. Register rows:
`steps/reg-S42G.md` (REG-S42G.1…5). Probe: `design-source/verify/pending-modules/verify-pm2-s42g.cjs` (**40 / 40**); shots in
`design-source/verify/pending-modules/pm2-s42g/`. **No migration. No repair** (R126…R139 unused — the demo already holds every state the fix
reads: Kelvin Goh and Nur Aisyah are New with a meeting held, Mei Ling Tan is on hold from Contacted, David Koh is lost from Contacted).

## Ledger — every finding

There is no audit file for this package: the carried note is one item, and reading every meeting door for the same assumption found four more
(G-03…G-05 and the width). Each is numbered here and in the probe.

| ID | Sev | Result | Where · how |
| --- | --- | --- | --- |
| G-01 | Major | **Fixed** | Every meeting door asks the studio's stage rule. `lib/meetings/next-step.ts` (new, pure: `MeetingStep`, `meetingStepLabel`, `meetingStepHref`, `meetingStepWords`); `lib/meetings/queries.ts` `meetingStepFor(leadId)` (stage, where a parked lead left, members, project, `fetchStageMovement` → `heldMeetingStep`) and `MeetingRoomData.lead.next`; `app/meetings/actions.ts` `fileHeld` → `{ filed: 'logged' \| 'offer' \| 'kept' \| 'project', next }` on `HeldResult` (End and every write-up); `components/meetings/room/meeting-room.tsx` (the banner `room-step-offer` with `data-step`, End's snackbar, the page's write-up snackbar), `room/meeting-room-ghost.tsx` (the ghost's banner in the page's words, its button's width), `components/meetings/lead-meetings.tsx` (the Meetings tab's and Tools › Meeting Copilot's write-up snackbar). A New lead under Linear → **Move to Contacted**, the press opening the window at Contacted with the meeting as the first contact log; a lead in Contacted, or any lead under Flexible → **Move to Met** as before. |
| G-02 | — | **Kept (asserted)** | Flexible unchanged: `heldMeetingStep` answers Met for a New lead (the `quick` intent), the press opens the Met step with the meeting (probe §4). |
| G-03 | Minor | **Fixed** | Parked leads. `lib/leads/stage-policy.ts` `heldMeetingStep`: a lead **on hold** the rule lets resume at Met (it has a member — `stageIntent` answers `confirm-resume`) answers Met, worded **Resume at Met** (`MeetingStep.resume`) with its own line; the press lands on the house's "Resume at Met?" confirm, then the Met step with the meeting (it read "Move to Met"). A **lost** lead answers null — Met lies past where it stopped and the rule refuses it — so its meeting offers nothing (it offered "Move to Met" and landed on "Resume at Contacted first"). On hold with no member → null ("Assign a member first"). |
| G-04 | Major | **Fixed** | "A meeting IS the Met log — keep that true where Met is reached": the Move stage window entering Met by any door without `?meeting=` (the pill, the header's next step, LEAD STAGES, the listing, the kanban, Maison AI's `move_lead`) started with an empty Met log, so a meeting held before Met stayed a second record — and G-01's own path (New → Contacted with the meeting, then the header's "Move to Met") would have hit it every time. `components/leads/move-stage/wizard.tsx` asks `fetchHeldMeetingForMet` (`app/meetings/actions.ts`, read-only, Who sees leads, not on a project) as it opens at Met and takes the lead's latest held meeting no Met log holds yet (`lib/meetings/queries.ts` `heldMeetingLog`) — blank first log replaced, else appended, never twice. `resolveMoveHandoff` (`app/leads/actions.ts`) now reads a meeting through the same `heldMeetingLog` (one reader, no copy). |
| G-05 | Minor | **Fixed** | The Contacted brief said "Keep momentum · book the meet — Propose two slots and lock one in today" for a lead whose meeting is already held (G-01's path makes that common). `lib/leads/detail.ts` `LeadDetail.heldMeeting` (a meeting held before Met, no project); `app/leads/[id]/overview.tsx` `met` for Contacted too, `logMeeting` reads that meeting first; `lib/leads/briefs.ts` `metAlready` shared by New and Contacted — S42E's words, "Move the lead to Met: the meeting becomes its Met log…". |
| G-06 | Polish | **Fixed** | At 390 the longer "Move to Contacted" squeezed the banner's words into a narrow column. `components/meetings/room/room.module.css` `.bannerText` `flex: 1 1 240px` — the press wraps under the words (the check-in and paused banners share it; unchanged ≥ 768). |

**Counts:** Major 2 → 2 fixed · Minor 2 → 2 fixed · Polish 1 → 1 fixed · 1 kept as asserted (Flexible). Nothing left unfixed.

### The meeting's other doors, read for the same assumption
- **The brief's "held before Met" offer (S23)** — the meeting page's banner on its brief: G-01 / G-03.
- **The Dashboard's meeting rows** (`lib/dashboard/queries.ts`: "Write up the meeting with …", "Save the brief of …", Coming up) open the meeting's
  page with `?from=/dashboard` — no stage offer of their own; the page asks the rule. Nothing to change.
- **The bell** (`meeting_answered`, the S27 Hangout notices) opens the meeting or the Hangout — no stage offer. Nothing to change.
- **Maison AI's `move_lead`** (`lib/maison-ai/answer.ts`) asks `stageIntent` before the press since S42B (B-11): "Move Kelvin to Met" on a New lead
  under Linear is a row that says "Complete Contacted first" and opens the lead — the user's own words asked for Met. With G-04 a Met move it does
  open carries the held meeting. Nothing else to change.
- **A Hangout chat's End** (S42E) already asks `heldMeetingStep`. G-03's on-hold answer does not reach it: its rows pass no members (a parked
  Hangout lead would need "Assign a member first"), so End offers a parked lead nothing, as S42E built.
- **The lead brief's Log the meeting** (S42E) — now also on a Contacted lead (G-05).
- **The project's Client › Meetings** — a lead on its project: `fileHeld` answers `project`, no offer (unchanged).

## Calls fixed as recommended
None in this package's area (`s42/calls-for-vicky.md` has none for it). One judgement taken and recorded for his review in REG-S42G.2: a meeting
held with a lead on hold offers **Resume at Met** (the rule allows a parked lead to resume anywhere, REG-132; the press keeps the "Resume at
Met?" confirm) rather than dropping the offer — S42E's `heldMeetingStep` answered null for every parked lead.

## For other packages
- **The orchestrator / CLAUDE.md's Map** — *S42G*: `lib/meetings/next-step.ts` (the offer and its words), `meetingStepFor` · `heldMeetingLog` in
  `lib/meetings/queries.ts`, `fetchHeldMeetingForMet` in `app/meetings/actions.ts`, `HeldResult.next`, `LeadDetail.heldMeeting`; "every meeting door
  asks `heldMeetingStep`; the Met step carries a held meeting from any door".
- **UAT (the orchestrator's)** — a step for the meetings chapter: "Kelvin Goh (New) › Meetings › his first consultation: the banner says his lead is
  still New — Move to Contacted opens the window with the meeting as his first contact; Save → Move without tasks; the page now offers Move to
  Met; the lead's header Move to Met opens Met with the meeting already its log."
- **Lane C (S42F)** — no overlap: S42F's meeting-link Viewed stamp is `app/meeting/[token]`; nothing here touches it.

## Shared pieces changed
- `lib/leads/stage-policy.ts` — `heldMeetingStep` answers Met for a lead on hold the rule lets resume there; a lost lead stays null (explicit).
  Callers: the meeting doors (new), a Hangout chat's End (no change in effect — it passes no members), the lead brief (New / Contacted only).
- `components/leads/move-stage/wizard.tsx` — entering Met asks `fetchHeldMeetingForMet` and carries the meeting (`isBlankMeeting`).
- `app/leads/actions.ts` — `resolveMoveHandoff`'s meeting block reads through `heldMeetingLog` (same result, one reader).
- `lib/leads/detail.ts` — `LeadDetail.heldMeeting` (optional). `app/leads/[id]/overview.tsx` — `met` for Contacted, `logMeeting`'s meeting id.
  `lib/leads/briefs.ts` — `metAlready` (S42E's brief, now one function for New and Contacted).
- `app/meetings/actions.ts` — `HeldResult.filed` values are now `'logged' | 'offer' | 'kept' | 'project'` (was `'offer-met'`) plus `next`; every
  reader of `filed` in the repo is updated (the room, the Meetings tab; the Hangouts' `afterHeld` reads only `id`).
- `components/meetings/room/room.module.css` — `.bannerText` flex-basis (the room's own stylesheet).
- No `components/om/*`, shell frame or `app/globals.css` change.

## Verification (lane A, port 3160, scratch DB = `pbuild/base.db` migrated + repaired, `DATABASE_URL` on every command; builds under the lock)

| Probe | Tally |
| --- | --- |
| **`verify-pm2-s42g.cjs`** (final build) — a New lead's meeting page under Linear: "Kelvin’s lead is still New" · Move to Contacted, no "Move to Met" anywhere, the press lands on Contacted with the meeting as the first contact log and never on a refusal; a write-up on a New lead (the Meetings tab) offers Move to Contacted, Esc moves nothing; the whole path — Save at Contacted (the meeting is the log: In person, Connected), the Contacted brief "Met already · log the meeting", Log the meeting → Met, the page now offers Met, the listing's stage menu › Met and the header's Move to Met each carry the meeting (where, the brief's summary, its photo), Save files it in the Met step once and the page's offer goes; Flexible offers Met as before; on hold → Resume at Met → "Resume at Met?" → Met with the meeting, Esc leaves it on hold; lost → no offer; the ghost's banner in the page's words; 390 touch (the press wraps under the words, the window at Contacted) and 320 with no sideways scroll; no page errors | **40 / 40** |
| Steps' probes (same build, same scratch DB): `verify-pm2-s23` · `s42e` · `s27` · `s05` | 147/147 · 65/65 · 155/155 · 113/113 — all green, no assertion changed |
| Regression (`regression/run.cjs`, port 3160, base = `pbuild/base.db` migrated + repaired): `ux-p1` (the lead journey, the Move stage window's hand-offs) · `ghosts-same` · `ghosts-same-390` · `dane-p1` | 81/81 · 73/73 · 73/73 · 47/47 |

The step and regression probes ran on the build before the last probe-only change (the listing check); no app code changed after it. Shots of
every visible fix: `design-source/verify/pending-modules/pm2-s42g/` (1440; 390 for the banner and the window).

`npx tsc --noEmit -p .` clean · `npx eslint` on every changed file 0 errors · `npm run design:lint` — nothing new breaks a house rule (baseline
unchanged).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock draws the meeting page; the offer stays S23's banner and snackbars on house pieces,
   every new sentence in `reg-S42G.md` as invented copy; S23's and S42E's words kept where they apply.
2. **One system, no one-offs** — one rule (`heldMeetingStep`) and one wording (`lib/meetings/next-step.ts`) for every meeting door and its ghost; one
   reader of a meeting as a Met log (`heldMeetingLog`) for the hand-off and the window's carry; the house window, confirm and snackbar; no new
   piece; design:lint unchanged.
3. **Plain words** — "Kelvin’s lead is still New", "Move to Contacted", "Resume at Met" (the header's own words for a parked lead), "Met comes next".
4. **Nothing is lost** — the meeting is carried into the Met step from any door instead of standing beside it; the press only opens the window
   (Cancel / Esc leave the lead as it was); the on-hold path that used to work is kept, now worded honestly.
5. **Say why** — the banner says what isn't on the record yet and what the press does; a lost lead isn't offered a move the rule would refuse.
6. **Back returns where you came from** — the presses land on the lead's own window through the hand-off link; the meeting page's Back is
   unchanged.
7. **Every screen is whole** — the meeting page's ghost draws the banner in the page's words (probe §6); the Overview's brief card is unchanged in
   shape.
8. **Every width is designed** — 390 touch and 320 checked against `screen.width`; the banner's press wraps under its words on a phone (G-06).
9. **Tables follow the leads listing** — not applicable (no table changed).
10. **Motion with purpose** — no new motion.
11. **Honest data** — the window shows the meeting's own where, when, summary and photo; nothing is written until the window's Save (probe: the
    lead stays New / On Hold after Esc); the Met step's entry holds the meeting's id once.
12. **Reach for everyone** — the banner's press is a house Button with its label; the window's focus and Esc are the house's.

How to add a missing thing: **one home** (the lead's own Move stage window; no new page); **shown only when it applies** (no offer once the lead
reached Met, is on its project, or the rule would refuse); **one filled button** (the banner's press stays outlined beside the header's filled
one); **defaults need no set-up** (the studio's own stage rule decides the step).
