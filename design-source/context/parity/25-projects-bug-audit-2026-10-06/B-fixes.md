# B · The Schedule — fixes (package fix-B, 2026-10-06)

Outcome per finding of `B-schedule.md`. Status: **Fixed** (what changed, where) · **Not a bug** (the rule) · **Owned by another package**.
Worktree package `fix-B`, port 3121, register rows `projects-build/reg-fix-B.md`, probe `design-source/verify/projects/verify-pj-fix-B.cjs`.
No data fix was needed (R69b not written): every fix is a rule read at run time, and the demo data already holds what the rules read.

| ID | Sev | Outcome |
|---|---|---|
| B-01 | Major | **Fixed** — `fetchScheduleData` reads the client's portal access (`ScheduleData.portal`: live · withdrawn · phone · path); the toolbar line says "{client} has no portal yet — invite them to see the schedule" (or withdrawn); the share dialog says so and offers **Invite {client}** (the house Client access panel); `shareSchedule` answers `live`, the snackbar says "Schedule kept for {client} — they see it once you invite them" with Invite. (`lib/projects/schedule.ts`, `app/projects/schedule-actions.ts`, `share-dialog.tsx`, `project-schedule.tsx`) |
| B-02 | Major | **Fixed** — `saveMilestone` stores the row's every field as it was on its own Activity line (`before`, `lib/projects/events.ts`) and answers `SaveUndo`; `undoMilestoneSave` puts fields, dates and moved tasks back and removes its lines; `saveSentence` names every change ("Carpentry moved 1 day later. You also marked it done."); dates are checked before anything is written. |
| B-03 | Major | **Fixed** — `.track { isolation: isolate }`: bars, caps, diamonds and the drag tip stack inside the track, under the frozen columns. |
| B-04 | Major | **Fixed** — `rowLine` composes status word · wait · date clause: "Blocked · waiting on the plumber for … · was due Fri 18 Sep, 18 days late". |
| B-05 | Major | **Fixed** — `summaryOf` gives blocked milestones their own clause ("Electrical is blocked — waiting on …"); only In progress is "under way". |
| B-06 | Major | **Fixed** — `createSchedule` sets Done (ended before today) / In progress (running today) by date; the Start card says so before Create; `rowLine` "Should have started {day}" (amber, `warn`); the summary names it. |
| B-07 | Major | **Fixed** — `createSchedule` ties the payment stages for every source (the quote's rows or a direct project's split), first at start, last at the handover, the middle nearest; the deposit never. |
| B-08 | Major | **Fixed** — `paymentOptionsOf` reads `moneySummaryOf` (lib/projects/money.ts): the live invoice's amount, else the nominal share of today's contract value (VOs in); the panel prints it with cents (`money2`). |
| B-09 | Major | **Fixed** — Done before its end ends it today (`doneEarly`); the row's Mark done / the menu's Done ask first in a house Dialog (open tasks named, "Bring {next} and n more forward" checkbox); the panel's Done does the same with followers keeping their dates; one sentence + Undo restores status and dates. |
| B-10 | Major | **Fixed** — per-field errors on the house fields (`MSG.required` / `MSG.choose` / `MSG.date`), shown after the first Save and clearing live; the first wrong field scrolls into view. |
| B-11 | Major | **Fixed** — `saveScheduleTemplate` refuses unless author / Owner / Admin (`changeBlock`) and refuses a deleted template (`TEMPLATE_DELETED_LINE`); the editor renders read-only (`ReadOnlyScope` + `ReadOnlyNote` "Only its author, an Owner or an Admin changes it."). Flag for Vicky: the other library editors (tasks, payments, T&Cs) save the same way — not changed here. |
| B-12 | Major | **Fixed** — `ScheduleData.doneShared`: the first share that carried each milestone as done; layer 6's line and the panel's "Shared … as done" read it. |
| B-13 | Minor | **Fixed** — rows are a subgrid (`.row { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid }`), so J / K / ↵ find them and the cursor spans the row. |
| B-14 | Polish | **Fixed** — `sched.open` relabelled "Open the focused bar" (`lib/keys/registry.ts`). |
| B-15 | Minor | **Fixed** — the row's ⋮ and the phone panel's ⋮ have "Add a milestone after" (`afterId`; it follows that milestone); the dialog's help says where it lands. |
| B-16 | Minor | **Fixed** — the header hides its "Set up the schedule" primary on the Schedule tab (`project-frame.tsx`); with a Setting-up project's "Start the project" filled, Create schedule is outlined. |
| B-17 | Minor | **Fixed** — `PRIMARY_ACTIONS` gains "Share the schedule" until the first share (`NextFacts.shared`, filled in `lib/projects/queries.ts`). |
| B-18 | Minor | **Fixed** — with nothing to share the dialog is "{client} already sees this schedule" with Close; closing drops `?share`. |
| B-19 | Minor | **Fixed** — `changeWords` joins dates · "Renamed from …" · "Now done" (the portal's change lines read it too). |
| B-20 | Minor | **Fixed** — `nextPayment` reads each stage's invoice: the earliest unpaid stage leads, in Money's words (`nextPaymentWords`) — "30% overdue since 2 Oct" / "30% due 18 Sep" in red, "30% · payment to confirm" (a client's proof waiting, never red), "30% part paid · due …"; "Paid in full" when all tied stages are paid. |
| B-21 | Minor | **Fixed** — the Overview's `daysBetween` counts calendar days (`dayOf`), as the Schedule does. A past target end's wording is A-07's (area A). |
| B-22 | Minor | **Fixed** in the row ("was due …, n days late"). **Not a bug** for the attention reason "1 milestone overdue": Q-07's own recorded words (build record §1). |
| B-23 | Minor | **Fixed** — the deposit (due on signing) is not offered; the server refuses tying it (one tied before stays). |
| B-24 | Minor | **Fixed** — switching "Ask {client} to confirm it" off with an answer on record asks first (house ConfirmDialog, nested); the save's Undo brings the answer back. |
| B-25 | Minor | **Fixed** — `fetchLeadTasks` reads a deleted milestone's tasks as "In no milestone" (the link is kept for the delete's Undo). |
| B-26 | Minor | **Fixed** — `writeDates` moves the open tasks inside by the end's days; the sentence says so; every Undo puts their due back. (A milestone done early keeps its own tasks' due days.) |
| B-27 | Minor | **Fixed** — Save as a template gated by `mayTemplate` (the team, Owners, Admins), a completed project's too. Same as E-16 (area E). |
| B-28 | Minor | **Fixed** — `itemsFromMilestones` orders by start, clamps lengths and gaps as the editor does, keeps each milestone's ask. |
| B-29 | Minor | **Fixed** — a finished job reads "Handed over {day}" (or "Finished"), Next payment "Paid in full" / "--". |
| B-30 | Minor | **Fixed** — Months zooms out to whole quarters, the legend drops the weekends sentence, the scale is kept per browser (`om.schedule.months`). |
| B-31 | Minor | **Fixed** — arrival puts today a third in; the house sideways bar (`SideScrollbar`, moved from the Items table to `components/om/side-scrollbar.tsx`), the frame `overflow: clip`. |
| B-32 | Minor | **Fixed** — the range grows with a drag at the day width it started with, the timeline auto-scrolls at the edges, the tip turns inward at either end. |
| B-33 | Minor | **Fixed** — `PortalMenu` opens above when its own rows don't fit below (house piece). |
| B-34 | Minor | **Fixed** — `Tooltip whenCut` on the name and the line; each bar says "{title} · {dates}" on hover. |
| B-35 | Minor | **Fixed** — × · Escape · Cancel · another row ask "Discard your changes?" (ConfirmDialog nested) when the panel has unsaved edits. |
| B-36 | Minor | **Fixed** — closing the panel drops `?open=`. |
| B-37 | Minor | **Fixed** — "Nothing yet" writes nothing; the first Add makes the schedule on works start; the dialog's help is true to the state. |
| B-38 | Minor | **Fixed** — short names only for the seeded stage names (`shortTitle` / `midTitle`); snackbars use the full title. |
| B-39 | Minor | **Fixed** (house way, flagged) — the handover stays the milestone that ends last; the words say "handover" only when it is named so, else "the schedule ends / finish". |
| B-40 | Minor | **Fixed** — Activity's milestone edits read `fieldWords` ("showed it to Aisha, tied Deposit to it and asked Aisha to confirm it"); shares name the client. |
| B-41 | Minor | **Fixed** — on a phone: who-sees line + the schedule's ⋮ under the summary; the panel carries a Name field and a ⋮ (Move up · Move down · Add a milestone after). Weeks / Months has no timeline to act on there. |
| B-42 | Minor | **Fixed** — the cause was the house touch target (globals.css, REG-273: `label:has(input[type=checkbox])` gets `margin: -10px` on `(hover: none)`), which the DS Switch matches — at a row's end it hung 10px past the panel. A switch ending a row keeps no negative right margin; the four statuses share the panel's width; `.switchText` flexes with `min-width: 0`. |
| B-43 | Minor | **Fixed** — Add milestone and ⋮ wrap as one group. |
| B-44 | Minor | **Fixed** — the dock is fixed at the screen's foot above the app dock, the page padded. |
| B-45 | Minor | **Fixed** — "The signed quote" shows disabled with "No signed quote yet …". |
| B-46 | Minor | **Fixed** — the ghost draws the Start card for a project without a schedule (`useRememberShape`), and the phone's dock. |
| B-47 | Minor | **Fixed** — Managers named in the Start card's line and `CHANGE_RULE`. |
| B-48 | Minor | **Fixed** — no money read and no payment line for a viewer who may not see money. |
| B-49 | Minor | **Fixed** — `role="table"` on the grid, column heads for dates and actions, the status in words (visually hidden) on the glyph and the bar. |
| B-50 | Minor | **Fixed** — on touch a bar lifts after a still long press; before it a swipe scrolls (`touch-action: pan-x pan-y` on `(hover: none)`). |
| B-51 | Minor | **Fixed** — Moves with resolves by id; two milestones of one name read apart by their dates. |
| B-52 | Minor | **Fixed** — list columns widened (160 / 288). |
| B-53 | Minor | **Fixed** — after a share with the portal live: "Tell {client} on WhatsApp" opens the drafted message (`scheduleNewsMessage`, `waLink`). |
| B-54 | Minor | **Fixed** — "n changes to share" only for those who may share. |
| B-55 | Minor | **Fixed** without a migration — stored days are read by rounding (`dayOfStored`), right in any server zone within ±12 h. |
| B-56 | Polish | **Fixed** — month labels too close are dropped, week labels thin out and never run past the track, a label today's line crosses starts after it. |
| B-57 | Polish | **Fixed** — Delete milestone is the house danger text button (composes the access panel's Withdraw). |
| B-58 | Polish | **Fixed** — "The line marks today, Mon 5 Oct."; the diamond's source in the project's words. |
| B-59 | Polish | **Fixed** — `progressOf` fills done only, so the bar says what "3 of 7 done" says. |
| B-60 | Polish | **Fixed** — even rows (the overlap is said in the laid-out line), a row ⋮ with Move up · Move down · Remove and Undo. |
| B-61 | Polish | **Not a bug** — REG-1051: the pane and the share preview are the portal's own drawing, so Done wears the portal's brand. Left for Vicky's call, as the finding asks. |

**Routed from C** (portal "handover Fri 13 Nov" vs the studio's 20 Nov): the shared-snapshot rule working as designed — the portal shows the last shared plan. The studio side now says so plainly: "Benjamin still sees the schedule shared on 2 Oct, handover Fri 13 Nov." (the toolbar line and the pane's sub-line).

**For other packages:** D owns "Mid-Project are ready to send" and Shalini's Completion invoice "due 3 Oct". A owns A-07 (a past target end's words). E owns E-16, which is the same as B-27.

**Counts:** Fixed 60 (B-22 counted fixed, its attention word kept) · Not a bug 1 (B-61) · Owned elsewhere 0 of B's own.

**Verified** on a production build against fresh copies of the repaired scratch DB (:3121): `verify-pj-fix-B.cjs` 53/53 (1440, 1025, 390 touch);
r1 83/83 · r2 83/83 (four checks moved to the new rules: the handover in the who-sees line, Done early's ask, "late" in the row, the share's
Activity line naming the client) · r3 86/86 · r4a 72/72 · r4b 74/74 · r5 90/90 · r6 79/79 · r7 63/63 · r8 65/65 · r9 65/65. After shots: `shots/B-after/`
(also `design-source/verify/projects/fix-B/`).
