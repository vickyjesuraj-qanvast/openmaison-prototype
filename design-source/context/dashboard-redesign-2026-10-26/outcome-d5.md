# D5 — one fact, one number, and the bugs: the outcome (2026-10-26)

Lane D5 of the Dashboard redesign (brief § 5 "D5"): P-13 "one fact, one number" across the modules the Dashboard reads, and P-14's bugs. The
lane owns no Dashboard file; every change is in a module the Dashboard reads, and every visible one is a staged row in `reg-d5.md`
(REG-D5.1…17). Built on the WIP base `701e101e`; nothing committed. Probe `design-source/verify/dashboard-2026-10-26/verify-dash-d5.cjs` (53/0),
banked shots `design-source/verify/dashboard-2026-10-26/d5/`.

## 1 · Each item of the brief

### P-13 — one fact, one number

| Item | State | Where · why |
|---|---|---|
| **One overdue clock** (the bell and the task lists) | **fixed** | The bell's task rows read `isOverdue` (`lib/notifications/queries.ts`): "Overdue" from the day after the due day, stamped at the due day's local midnight so "n days late" counts calendar days; a task due today whose time has gone is **"Due today: …"** (the due-soon glyph, never red, `due-line.ts`), riding the overdue notice's channels so nothing new is sent. The demo's two tasks due today ("Chase quote confirmation", "Draft initial concept boards") read "Overdue · Due today · 5 h late" before, "Due today" now. The other derived rows were already one clock (milestones by `dayOf`; payments, bills and POs "from the day after"). REG-D5.1 |
| **One Owed to you** | **holds; made usable** | "Owed to you" is written in one place only — Reports › Finance AR's tile — and read from it by Maison AI and the Dashboard. Other "owed" figures carry other names (To do's "S$… owed on n invoices", the Money tab's *To collect*). Each money tile now carries its own figure as `minor` (`lib/finance/reports.ts` `ReportTile.minor`, additive, not drawn) so D1 writes AR's own number as a card does, `moneyCard(tile.minor)`. Not a visible change |
| **One tickets count, one name** | **fixed** | `ticketTally().toAnswer` (the rail's Tickets, the S46B tile) counts the studio's turn on the projects the member works on — the projects' own Needs you `ticket` rows and who may reply (`mayChangeProject`); with Who sees leads at "everyone" a Designer's badge counted every project's tickets. The name: Reports › Health and Qanvast Ops › Studios say **"Tickets raised"** (was "Issues reported"), Maison AI's answer says tickets. "issue" stays the client's word on the portal (deliberate, REG-1425's). Escalated tickets on the client's turn stay a Needs you row worded "Escalated" (a different fact, not "waiting on you"). REG-D5.10 · 11 |
| **One "not contacted"** (`lastContactOf`) | **fixed** | Response time's first outreach counts a meeting held, and reads a log's date-only "when" as Last contact does (`lib/leads/insights.ts` `factsFrom` + `heldMeetingsOf`; the lead page's line too, `lib/leads/detail.ts`). Sales already read `lastContactOf`; the bell's untouched rule is now one shared predicate, `isUntouchedLead` (`lib/leads/filters.ts`), which the Dashboard's "not called" row should read (For other lanes). Demo: "6 assigned, no outreach logged yet" → 4 (Nur Aisyah, Kelvin Goh — met at a Hangout). REG-D5.9 |
| **"Needs attention" means one thing** | **fixed where it named another thing; one kept** | MY TASKS' head said "1 task needs attention" for overdue tasks — now **"1 task overdue"** (REG-D5.12). The listing's group was already "To do" (a stale comment fixed). "Needs attention" is now a project's health (REG-914: the listing's tile and scope, the rail's Projects, Maison AI's projects line) — and, per record kind, Maison AI's question "Which leads need attention?", whose rows are the listing's own rules (overdue = `isOverdueLead`, today = `isCallTodayLead`, no member = `isUnassignedLead`, plus New-not-contacted by `lastContactOf`). ▲1 |
| **Money on record cards as `moneyCard`** | **fixed where the module writes a record's sum** | Maison AI's "Tell me about {client}" (the lead's quote and budget) and its quotes answers write "S$ 88,705" (was "S$88,705.00"), as the lead page's own Maison AI does (REG-D5.15). Documents keep cents (Needs you's invoice and bill rows, Reports). The Dashboard's own figures are D1–D3's (`minor` above is the seam) |
| **Dates one way** | **fixed in the rows the Dashboard lifts** | Needs you's money rows (and Money's Needs you) wrote "due 2 Oct" beside the milestone rows' "was due Fri 2 Oct": every day money is due by, and the target end, now read the list's planning day (`dueDay` → `dayLabel`; REG-D5.13). Days that look back (spent, paid) keep theirs (Dane UAT 5.13's rule). The hold's "On hold since 14 Oct ’26" is one record family (the Status card, the listing's tooltip, the brief, the row) and was left as it is — ▲2. The Dashboard's own dates are D1–D3's |
| **"5 days overdue", never "(5d)"** | **fixed** | `overdueWords(due, now)` in `lib/format.ts` ("1 day overdue" · "5 days overdue", the task lists' calendar count); MY TASKS (the lead's and the project's Overview) uses it after a dot — the mock 858:24989's "(7d overdue)" reversed on his P-13 (REG-D5.12). The Dashboard's Your day should use it (For other lanes). Other "nd" abbreviations are relative ages ("3d ago" on the kanban, the templates gallery, the phone's contract card — the mocks' own), listed below |

The leads' counts the Dashboard and its Maison AI said differently (A §5) — **fixed**:
- **Overdue follow-ups, 3 vs 2**: `isOverdueLead` leaves out a lead handed over to its project (S42 D-11 extended to the listing, the Filters modal and the Dashboard — the scope reads 2 in the demo; `isCallTodayLead` too). REG-D5.7
- **New leads in 7 days, 4 vs 5**: Maison AI reads the listing's own Last 7 days, `addedInLast7Days` (calendar days). REG-D5.14
- **Unassigned**: one rule, `isUnassignedLead` — not Lost (B's ST-12). REG-D5.8
- **Quotes waiting for approval** (Maison AI's overview counted every quote, no Who sees leads — ST-10) → the rail's `countQuotesToApprove`, exported. REG-D5.14
- **Quotes waiting on the client, 1 vs 3** (ST-24) → Tools › Quotes' chip rule over `sentToClientDates`. REG-D5.14

### P-14 — the bugs

| Bug | State | Where |
|---|---|---|
| A quote's due-date follow-up never closes on confirm / sign | **fixed, every path, Undo reopens** | `lib/quotes/follow-up.ts` (`closeQuoteFollowUps` · `reopenQuoteFollowUps` · `openQuoteFollowUps` · `settlesFollowUp`), called from `setQuoteStatus` (any status mark), `markQuoteStatus` (captures the ids into `StatusUndo.followUps`) → `undoQuoteStatus` (reopens), `confirmQuoteOnline` (the client's link), `signQuoteThrough` (online, bundle, marked, list, the Won step's upload), `markVariationApproved` → `undoVariationApproval` (`VariationUndo.followUps`). A Confirmed quote's Due no longer reads overdue (`isQuoteOverdue`). Setting a due date stays REG-470's explicit act (its snackbar says a follow-up is added). REG-D5.5 · 6 |
| The bell rings for supplier bills still awaiting approval | **fixed** | `derivedBillRows` skips `billWaiting` bills (`lib/finance/bell.ts`); the approver keeps the stored `bill_review` ask. REG-D5.2 |
| The rail's Finance count omits C8 bills (ST-06) | **fixed** | `countFinanceToApprove` counts the fifth kind; the Company panel's "n to approve" = To do's To approve. REG-D5.4 |
| A credited invoice still rings "Overdue" (ST-23) | **fixed** | `derivedPaymentRows` takes off issued credit notes (not overpayments). REG-D5.3 |
| "Your next meeting" falls back to someone else's (B §9) | **fixed** | `nextMeetingFor` reads the member's own (on it, or planned it) and takes `{ lead }` for a named meeting; "No meeting planned for you". REG-D5.16 |
| One message, two badges (ST-16) | **fixed** | `markConversationRead` reads that conversation's `chat_message` notices for the member. REG-D5.17 |
| Coming up cut to six before the merge · the greeting's clock · the slow first answer · the FAB over Finance's Open at 1024 | D3 · D1 · D1 · D4 (brief § 5) | not this lane's files |

**R180 not needed.** No fix needs a demo state, and the demo is consistent with every new rule (checked on the lane DB): no quote has a due-date
follow-up, so nothing open belongs to a confirmed or signed quote; the one `chat_message` notice is already read; the waiting bill (EL-2207) is due
ten days out, so it was never in a bell; no credit note settles an overdue invoice. The probe makes each state it asserts and puts it back.

## 2 · ▲ For Vicky

1. **"Which leads need attention?"** keeps its words in Maison AI's chips. Per record kind "needs attention" is now one rule (a project's health;
   for leads, the listing's own To do rules plus New-not-contacted), and MY TASKS no longer says it about tasks. Renaming the leads' question
   ("Which leads need a follow-up?") would touch the Dashboard's and the FAB's chips (D4's) — kept as is; say if you want two names.
2. **The hold's dates** ("On hold since 14 Oct ’26" · "Resumes 16 Nov ’26") stay `displayDate` across the Status card, the listing's tooltip,
   the brief and the Needs you row — one family, so the Needs you list still carries one date in that form. Moving the family to the planning day
   is four surfaces' change; not made.
3. **The Leads table and kanban still tag a parked, lost or handed-over lead "Overdue"** (B's ST-15) — the phone card follows the rule (A-28),
   the desk keeps the mock's tag (`components/leads/table.tsx:372`). With REG-D5.7 the scope and the tag differ for Benjamin Han (a Won lead
   whose task is his project's). Recommend the desk follow `isOverdueLead` — a visible change on the listing at 1440, so not made without you.
4. **The client's lateness painted red** on a project's Money (*To collect*) and Money in (`INVOICE_STATE_TONE.overdue`) against S-05 (B's
   ST-47) — not on the Dashboard; recommend neutral as To do and Needs you have it. Not made.

## 3 · Listed — seen, not fixed here, and why

| Finding | Why not here |
|---|---|
| ST-02 four windows unlabelled · ST-30 two profits named apart · ST-46 graded there, plain here · ST-55 "Sample" | the Pulse's own labels and grades (D1) |
| ST-03 the weekly update's two clocks (Needs you calendar days; attention's elapsed `daysSinceUpdate`) | the Projects listing's attention words; D3's health should count calendar days. A visible change on the listing — for him |
| ST-04 a ready invoice: a project row from day 0, To do after 7 days · ST-09 "n more" | D2 (the inbox lists every project row and dedups To do's) |
| ST-05 credits "low": the bell's 75 / 90 % used vs the ring's < 10 % left | two facts (a share used; the level left); D2 reads the level (`toneOf`) |
| ST-07 the rail's Projects counts completed projects | his S42 call A·4 kept it |
| ST-08 attention vs Needs you on whose lateness counts · ST-20 late milestones' scopes · ST-28 capacity · ST-19 crew gaps | D3's health and Team card read their own rule; the rail's Projects badge ("n need attention") sits on the same page — D3 to reconcile (For other lanes) |
| ST-10 Maison AI's `approvals` answer (quotes + Finance) vs the Dashboard's Your OK rows | D4 / D2: the answer should list `fetchInbox`'s ok rows (one number) |
| ST-17 one meeting three times · "today" keeps meetings already over | Your day (D3) |
| ST-18 compliance: mandatory (D) vs all open (the view) | D2 names its row's count ("n mandatory items") or reads the view's |
| ST-21 · ST-22 owed and owe under other names (To collect, To pay with commission) | different facts with different names; "Owed to you" is one |
| ST-25 expiring: the chip's 7 days, the card's 14, Maison AI's 14 with past dates; D2's 3 days | each window is named ("Expiring this week" · "run out soon"); D2 names its own window |
| ST-26 awaiting signature counts letters to read · ST-36 · ST-37 · ST-39 · ST-40 · ST-41 · ST-42 · ST-43 · ST-44 words | each a word on another module's page, none the Dashboard's figure; for a words pass |
| ST-31 the portal's "opened" from two sources · ST-32 favourites · ST-33 two waiting-on-client lists | the portal's and Maison AI's; not on the Dashboard |
| ST-34 unseen: "new" on the rail, "Unseen" on the listing | D1 / D2 pick one for their chip and row |
| ST-35 viewed / opened: quotes stamp the last open, contracts the first; the words differ | D2's quote and contract rows pick one word |
| ST-47 · ST-48 · ST-49 · ST-50 · ST-51 colours | ▲4 for the money red; the rest are each card's palette, none on the Dashboard |
| ST-52 doors without `?from=` · ST-53 doors that can't land (Tickets has no "waiting on you" scope, `/contracts` reads no parameter) | the Dashboard's rows open each record directly (D2); a scope for Tickets / Contracts is a visible change on those pages |
| B §2 contract-automation and call-back tasks send no `task_assigned`; compliance starter tasks are undated; the Qanvast return's "Respond to Qanvast team" has no assignee | weak, not wrong; each a behaviour change in its own module |
| B §1 `countUnseenLeads` counts Won / Lost; "seen" is global | a design of S46C (H2) |
| B §4 `stampViewed` keeps the first open only | REG-633's rule |
| Relative ages "3d ago" (kanban `relativeTime`, the templates gallery, the phone's contract card) | the mocks' own, and not "overdue" |
| "26.3h" (`durationWords` under two days) | the house's turnaround words (REG-1381…) |
| The server's clock app-wide (`startOfDay`, `isOverdue` use the server's time zone; only the greeting is pinned to `STUDIO_TZ`) | an app-wide change for the developers (A §4's side note); every clock above is the same clock, so they agree with each other |

## 4 · Shared pieces changed

`lib/format.ts` (`overdueWords`, new) · `lib/leads/filters.ts` (`handedOver` · `isOverdueLead` · `isCallTodayLead` · `isUnassignedLead` ·
`isUntouchedLead` · `addedInLast7Days`) · `lib/leads/quote-filters.ts` (`isQuoteOverdue`) · `lib/leads/tasks.ts` (`countQuotesToApprove`
exported) · `lib/leads/insights.ts` (`factsFrom` takes held meetings, `heldMeetingsOf`) · `lib/quotes/follow-up.ts` (new) ·
`lib/finance/reports.ts` (`ReportTile.minor`) · `lib/projects/tickets.ts` (`ticketTally`) · `lib/meetings/queries.ts` (`nextMeetingFor` `{ lead }`) ·
`components/leads/detail/my-work-card.tsx` (the lead's and the project's Overview).

## 5 · For other lanes

- **D1 (Pulse):** Owed to you = `buildReport('ar').tiles[0]` — write `moneyCard(tile.minor)` (You owe, Net, P&L's Revenue · Costs · Profit carry
  `minor` too); by age from AR's `buckets` table. "Leads this week" = `addedInLast7Days(rows, now)` (the listing's week, Maison AI's too). First
  response = `insightsReport` — it now counts a meeting held, so the demo's waiting count is 4.
- **D2 (Needs you):** the leads rows read `isOverdueLead` (now without handed-over leads), `isUnassignedLead` (in place of `assignees.length === 0`
  in the WIP's `inbox-queries.ts`) and, for "a new lead not called", `isUntouchedLead({ stage, createdAt, contacted: !!r.lastContact }, now,
  (await fetchNotificationRules()).untouchedMinutes)` — the studio's delay (Settings › Notifications, 30 min by default), so the bell's "has had
  no contact yet" and the row agree (the brief said "within the hour"; the setting is the one number). Ticket rows = each project's `ticket`
  rows (the rail's count now). Quotes "waiting on the client" = `waitingOnClient` over `sentToClientDates` (`lib/quotes/sent-to-client.ts`).
  Money rows now say "due Fri 2 Oct". Maison AI's `approvals` answer should read your Your OK rows (ST-10).
- **D3 (Your day · Projects):** "5 days overdue" = `overdueWords(due, now)`; calls due = `isCallTodayLead`; the projects' health shares the page
  with the rail's Projects badge (`countProjectsNeedingAttention`, "n need attention") — reconcile the two or name them apart.
- **D4 (the dock):** in `lib/maison-ai/answers/work.ts` the overview's week is `addedInLast7Days`, its approvals `countQuotesToApprove`,
  `aboutAnswer` and `quotesAnswer` write `moneyCard`, the waiting list reads `sentToClientDates` — keep them if you rewrite those answers as
  cards. A named "Prepare me for my meeting with Kelvin" should pass `nextMeetingFor(viewer, now, { lead: 'Kelvin' })`. Maison AI's tickets
  answer (`clients.ts`) says tickets.
- **The landing:** every page's rail for an Owner and an Admin shows the Company count one higher in the demo (REG-D5.4) — expect it in every
  1440 diff. The probes updated for deliberate changes: `verify-pm2-s39.cjs` ("Tickets raised"), `verify-pj-r6.cjs` (the due day's weekday),
  `ux-build-2026-09-30/P2/verify-p2.cjs` (the Overdue quick filter's help), each commented `(Dashboard redesign 2026-10-26, a deliberate change)`.
  pm2-s45a's `/dashboard` tile-vs-ghost check is D1's to update with the new Pulse.

## 6 · Verification

- `npx tsc --noEmit` · `npx eslint` on every changed file · `npm run design:lint` (nothing new) — clean.
- **The 1440 pixel diff, before (the WIP base's build) vs after**, Dane, on the pages the lane's files reach: `/quotes`, `/leads`, `/tasks`,
  `/company/finance`, `/projects/<id>/money` — **only the rail's Company count** (44 px). The named changes: the lead's Overview (MY TASKS'
  head and line), the project's Overview (MY TASKS; Needs you's "Due Mon 12 Oct", "due Wed 14 Oct"), Ryan's project (a bill's due day), Reports ›
  Health and Qanvast Ops › Studios ("Tickets raised"), Reports › Leads (Response time's figures, REG-D5.9), the bell (the two tasks due today),
  the Company panel (its Finance count). Nothing else moved. Shots: `design-source/verify/dashboard-2026-10-26/d5/`.
- **The probe** `verify-dash-d5.cjs`: 53 passed · 0 failed (real presses: the bell, the Quotes status menu and its Undo, the client's Confirm on
  the link, Mark as signed on a lead's Contracts, the Company panel and To do, Reports › Leads, the rail as Germaine · Michelle · Dane, Maison AI
  by the FAB; 320 and 844×390 with no sideways scroll; it puts back what it writes and checks the demo's counts against its start).
- **The regression** (`design-source/verify/regression/run.cjs`, port 3225, a base copied from the lane's clean DB) — my probe and every probe
  the lane's files reach, 29 in all: **dash-d5 53/0 · pm2-s18 63/0 · pj-r2 87/0 · pj-r6 82/0 · pm2-s44r 82/0 · pm2-s46b 81/0 · pm2-s39 175/0 ·
  pm-f 60/0 · ux-p2 73/0 · dane-p5a 59/0 · ux-p4 56/0 · ct-r1 36/0 · ct-r4 29/0 · pj-r5 91/0 · pm2-s10 107/0 · pm2-s42d 85/0 · pm2-s23 148/0 ·
  insights-head 16/0 · ke 31/0 · pj-r1 98/0 · pm-a 46/0 · pj-gap-b 72/0 · pj-gap-f2 84/0 · pm2-s04 82/0 · rl-l3 102/0 · pm2-s26 107/0 · pm-g 59/0 ·
  pm2-s17 130/0**, and pm2-s45a 153/4. Notes: ux-p2's one failure was REG-D5.7's new help line — its assertion updated, commented, then
  73/0 on the final build (with dash-d5 and ux-p4 re-run there after the last edit: 53/0 · 56/0); pm2-s42d stopped inside the harness on a
  path its copy can't climb to (`path.join(__dirname, '..', '..', '..')`, the planner's photo) after its D-11 and Maison AI sections passed, and
  run directly it is 85/0; **pm2-s45a's four failures are the Dashboard's tiles against their ghost on `/dashboard`** (Dane and Nurul, 1440
  and 390) — the WIP base's placeholder Pulse, not a file of this lane; D1 rebuilds both and owns that probe's update.
- `design:anatomy` on the final build: 90 pages, 1,971 measures hold.
- My own look at 390 and 768 touch (shots `d5/*-390.png`): MY TASKS' "· 1 day overdue" wraps between its tokens; the phone's bell sheet reads
  "Due today: …" beside "Overdue: … · 1 day late"; Needs you's rows keep their lines.

## 7 · Tallies

Code files: 28 (27 changed, 1 new — `lib/quotes/follow-up.ts`) · probes updated for deliberate changes: 3 (pm2-s39, pj-r6, ux-p2) · new
probe: 1 (+ its line and 9 lines in `probes.cjs` for reached probes that had none) · register rows staged: 17 (REG-D5.1…17) · repair rules: none
(R180 unused) · icons: none new · regression: 29 probes, 2,347 checks passed, 4 failed (all pm2-s45a's Dashboard placeholder, above).

## 8 · Principles check

1. **The mock wins, and every exception is written down** — two mock strings on MY TASKS reversed on his P-13, both register rows; nothing else
   departs from a mock.
2. **One system, no one-offs** — every count now reads its module's one rule (`isOverdue`, `isOverdueLead`, `isUnassignedLead`, `isUntouchedLead`,
   `lastContactOf`, `waitingOnClient`, `billWaiting`, `overdueOf`); no copied piece, no new component.
3. **Plain words for studio people** — "Due today", "1 day overdue", "Tickets raised", "No meeting planned for you"; one name per thing.
4. **Nothing is lost** — the follow-up's close has its Undo; a completed follow-up stays as history; nothing is deleted.
5. **Say why** — every changed help line names its rule ("not On Hold or Lost, and not yet a project"); refusals unchanged.
6. **Back returns where you came from** — no door changed.
7. **Every screen is whole** — no page lost a part; the ghosts read the same words (Studio health's ghost draws `GROUPS`).
8. **Every width is designed** — the changed lines wrap as the card's did (MY TASKS' meta wraps between its tokens below 1440, REG-2831); 320 and
   844×390 checked.
9. **Tables follow the leads listing** — no table changed.
10. **Motion with purpose** — none added.
11. **Honest data** — the point of the lane: each figure is its page's own, and the bell no longer calls a task late, a bill payable or a
    credited invoice overdue when it isn't.
12. **Reach for everyone** — role reach kept: tickets count what a member may answer; Who sees leads on every count changed.
