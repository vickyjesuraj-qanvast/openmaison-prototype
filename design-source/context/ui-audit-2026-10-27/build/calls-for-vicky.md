# Calls for Vicky: the calm UI build (2026-10-27 → 28)

Every ▲ the six lanes raised, in one place. They come from §8 of `outcome-b1.md` … `outcome-b6.md`; B4's forks A and B are inside its file,
and B5's parts are in `b5-parts/`.

How to read a call:
- Each one says what was built. You decide whether it stands.
- **↩** marks a call that reverses an earlier register decision; the reversed REG number follows it.
- The lane and its ▲ number are in brackets at the end.

The register rows are REG-3075…3333 (`reg-map.json`).

---

## Decisions — 2026-10-28 (every call closed)

**Every call below stands as built and is closed**, except the nine in *Next build* — those are the only open work, kept as one list.

**Closed by decision (kept as they are):** C-01 two named profit bases (moving one would change the Payments figure) · C-02 rolling
ranges for activity reports, calendar periods for Finance · C-03 stored units stay; Settings › Units owns how they read · C-05 the demo's
phone-photo names are how a client's photos arrive · C-06 a lead's On Hold keeps its required day (REG-453), a project may stall without
one · C-09 "Mid-Project" stays stored, shown "Mid-project" · C-10 an empty portal section shows its own empty state. C-50 was done in
the landing (REG-3336). The floor-plan sample renders are dropped on Vicky's word.

**Next build** (stopped 2026-10-28 for the week's usage limit — nothing half-done is in the tree; each is a small, separate job):
1. C-04 — a restore moves the date inside the demo's signed contracts (`lib/db/demo-day.ts` `EMBEDDED`).
2. C-07 — a repair brings the demo's Default Quote design to the Letter style's words ("Quotation", no "Fax:").
3. C-08 — X-Ray deletes softly: `quote_comparisons.deleted_at`, Undo, a Deleted comparisons sheet, restore / delete forever.
4. C-122 — "My Items" / "My Sections" → "Items" / "Sections" in every sentence (⌘K keeps the old words; ~114 probe lines).
5. ~~C-52~~ — **done 2026-10-28 (REG-3411).**
6. ~~C-88~~ — **done 2026-10-28 (REG-3410).**
7. C-43 — a lead's and a project's Activity: the type chips become one "Show: All ▾" pill.
8. C-123 — the contract header's editable title; the library editors' meta row; a `TextField hideLabel` for table cells (judge each).
9. dash-d1 — the Dashboard's Your day ghost after a meeting's time (seed whether a meeting still has its Directions line).
The brief for these is kept at `.claude/calm-build/close/brief.md` on Vicky's machine; after each, the probes of its area and `npm run design:lint`.

## Left unbuilt because it would change figures or data

- **C-01 · One basis for profit (5-07).** Profitability now reads "Expected profit · On signed contracts, with GST" and "Expected margin".
  That names it apart from Profit and loss's before-GST "Profit". Moving it before GST would change the project Payments tab's own figure.
  Pick the basis. [B5 ▲21]
- **C-02 · One period list (5-19).** Every report has the same pill now, but each keeps its own options. Leads, Meetings and Studio health
  count rolling ranges (30 days · 90 days · 12 months · All). Finance counts calendar periods. One shared list needs new maths in four
  reports. [B5 ▲20]
- **C-03 · The units' stored names (5-44).** Spelling the default units one way rewrites every line's stored unit. Settings › Units owns the
  list. [B4 5-44 · B5]
- **C-04 · The demo's signed contracts are dated 13 days off (4-05).** `lib/db/demo-day.ts` `EMBEDDED` doesn't move the date inside the signed
  body. A developer adds `date.contract`, or re-runs the snapshot after a restore. [B1 ▲11]
- **C-05 · Olivia's seeded file names and trail ("IMG_2041.jpg") (2-45).** This is seed, repair and baseline data, so it was left. [B2]
- **C-06 · On Hold's follow-up day (3-51 · W-328).** The lead's rule requires a day (REG-453); the project's set offers "No date yet". There
  are two options:
  - add "No date yet" to the lead's set (a rule change);
  - keep two sets.

  [B2 ▲ · B3 ▲3]
- **C-07 · The demo's Default Quote PDF still prints "Sales Contract", "Gst {gst_rate}:" and "Fax:" (4-33).** The Letter house style preset
  now says "Quotation". The stored design needs a repair to match. [B4 fork B]
- **C-08 · X-Ray's delete is still permanent (6-09).** A soft delete with Undo and a Deleted comparisons sheet needs all of these:
  - a migration (`quote_comparisons.deleted_at`);
  - restore and delete-forever actions;
  - a read filter;
  - an Activity rule.

  [B6 ▲1]
- **C-09 · "Mid-Project" stays stored (3-49).** It is written into stage logs. It shows as "Mid-project". [B2]
- **C-10 · The client portal hides no empty section (3-36).** What a client may open is the server's rule (`fetchPortalLook`), not a word.
  [B3 ▲6]

## Shell and Dashboard

- **C-11 · Approving from the bell takes one more step.** An approval row opens the Dashboard's Review pane on that record. Approve and Send
  back do exactly what they did. ↩ REG-1549 (simplify round 2's in-row Approve · Send back). [B1 ▲1]
- **C-12 · Two findability doors went.** The audit's 1-03 and 1-04 overrule them. Both counts still exist: the listing's Not opened scope, and
  the Dashboard's Approvals tab. [B1 ▲2]
  - The rail's Leads no longer wears "n new" or lands on Not opened. ↩ REG-2505 (S46C H2).
  - The "n approvals wait for you on the Dashboard" line left /tasks. ↩ REG-2504 · REG-2959 (S46C M3).
- **C-13 · The Maison AI button steps aside at a desk too.** It fades while words or a control sit under its corner. It comes back as the
  pointer nears, when it is focused, and at the page's end; ⌘J always opens it. To keep it always in sight, the change is one line (`fade` →
  nothing). [B1 ▲3]
- **C-14 · The AI credits glyph is unchanged.** 1-19 asked that the spark not also mean credits. The ring round the spark is your pick, so it
  stays (REG-706 · REG-710). [B1 ▲4]
- **C-15 · Tab counts turn grey across the app.** That is the house `Tabs`' default now. A count is red only with `countTone: 'late'`, for
  something overdue and the member's own. [B1 ▲5]
- **C-16 · Needs your attention rows keep their ⋮ on a phone.** The ⋮ holds Not today, Ask Maison AI and the second verb. The proposal's
  long-press has no house piece, and nobody would find it. [B1 ▲6]
- **C-17 · A project's standing to-dos fold into one "n things to do" row** on the Dashboard; its ⋮ runs each (up to six). The tabs show only
  from eight rows. Decisions and people waiting are never folded. [B1 ▲7]
- **C-18 · "Take new leads" (was Open to new leads) lives only on Your profile,** plus the Owner's per-member switch in Members.
  ↩ REG-1833 (S16's studio-block placement). [B1 ▲8]
- **C-19 · On site is titled "Site photos from the last 7 days"** (a rolling seven days, not "this week"). ↩ REG-3053's title. [B1 ▲9]
- **C-20 · Two word picks:** "To collect" on Pulse (§2's word, over "Owed to you"); "says they paid" kept, since no pronoun is on record
  (W-601 asked for "he"). [B1 ▲10]
- **C-21 · The date field shows "7 Oct 2026"** (was "7/10/2026", which many read as July 10). It still holds and hands on d/m/yyyy.
  [B1 ▲12]
- **C-22 · ⌘K's Go to and Create no longer always come last.** They rise above any record group whose best answer is no better. On touch,
  the Keyboard shortcuts row appears only once a real keyboard has been used. [B1 ▲13]
- **C-23 · Yesterday's calm-pass Dashboard words changed again.** Noted while numbering the rows, not raised by a lane. Each one below
  reverses a row from the day before:
  - The tabs read All · Approvals · Clients waiting · Overdue, and show only from eight rows. ↩ REG-3034 · REG-3069 ("To approve" — Finance's
    chip now says Approvals too).
  - "See all n" opens a drawer. ↩ REG-3038 (it unfolded in place).
  - ✦ Ask moved into the card's ⋮. ↩ REG-3043 (it showed on hover).
  - "Team workload". ↩ REG-3051's "Team load".
  - "Whole studio · Just me". ↩ REG-2932 · REG-3021's Studio · Mine.

## Leads

- **C-24 · An unowned lead's filled button reads "Assign a member".** It used to read "Move to Contacted" and refuse. The move follows the
  save; Stage ▾ still offers every move. [B2 ▲]
- **C-25 · The locked Convert to Project left the header.** Stage ▾'s Won row carries it and its refusal at every width. A lead that may reach
  Won still converts from the primary (relates to REG-168 · REG-469). [B2 ▲]
- **C-26 · The Overview's header has no meta chips.** The info column holds phone, email, budget, type and source. Other tabs say them as one
  grey line. [B2 ▲]
- **C-27 · The info column shows only filled rows.** The same component is the project's left column. [B2 ▲]
  - Each section's empties are one "Add district, area size…" link, which opens Edit details on the first empty field. ↩ REG-228 (the "--"
    rows and no per-row Add).
  - NRIC / FIN and Customer ID moved to Other info.
  - The Owner row is gone: Members marks "(you)" and "· in charge".
- **C-28 · The Maison AI card shows one action and no Show more.** Every brief action is in the Maison AI sheet. [B2 ▲]
  - The briefs are rewritten from the record.
  - Every "n× more often" figure is gone, because it had no source.
  - Two actions are renamed: "Book the first meeting" and "Remind me in 6 months". The old labels still resolve.
- **C-29 · The QUOTES card says the state once, as a sentence about the client** ("Approved — not sent to Vivien yet"). Its track is
  unlabelled. Its empty state is one outlined "Create a quote". [B2 ▲]
- **C-30 · LEAD STAGES:**
  - future rows show nothing;
  - the head reads "In New for 50 days" / "Took 13 days to win";
  - Response time is in words;
  - "Next follow-up · None — add one".

  [B2 ▲]
- **C-31 · Every detail card head is bold sentence case,** on every lead and project Overview card. It was the mock's 12/600 grey capitals
  (858-24094). [B2 ▲]
- **C-32 · The listing loses its docked "Review imported leads" bar.** The queue is a row in the scope pill: Needs your attention › To review ·
  n. The import's snackbar still offers Review. [B2 ▲]
- **C-33 · The listing's header and rows are quieter.** [B2 ▲]
  - Header: "Insights" is now the ⋮'s first row, "Reports". New lead ▾ has three rows; Get leads automatically… opens Company › Integrations
    (Email, Zapier and Meta Lead Ads were three rows).
  - Rows: no hover Edit pill; "No task" in grey; Assign is a grey person-plus; no purple at rest.
  - The table's Filters drop Sort, because the heads sort.
- **C-34 · Review cards lose their per-card verbs.** The pane's foot holds them once. "Approve All Clean (13)" is the house primary "Approve
  13 (no duplicates)", no longer green. Deleted leads' orange band is now a quiet line. [B2 ▲]
- **C-35 · "Unseen" is "Not opened yet",** and the phone card's NEW tag is gone. "Return Lead" is "Return to Qanvast". [B2 ▲]
- **C-36 · Every menu's group titles are sentence case at 12px,** app-wide. This changes REG-728's recipe (10px grey capitals). [B2 ▲]
- **C-37 · Words that reverse a mock:**
  - "Visit" for "In person" / "Site visit" (display only);
  - How · When · How it went chips on the desk contact log (the desk had a select);
  - "Contact log" and "Notes & logs";
  - a log's title is channel + outcome.

  [B2 ▲]
- **C-38 · The phone's note composer is closed at rest.** ↩ REG-381 · REG-402. [B2 ▲]
- **C-39 · Empty states on a record page are outlined** (the audit's T-03). ↩ page-checklist ② (REG-735). [B2 ▲]
- **C-40 · Tasks:** [B2 ▲]
  - "General tasks" for Studio tasks;
  - /tasks opens without Creator and Tags;
  - /tasks' ⋮ lost Delete all (select all, then use the bulk bar);
  - the row's mock-drawn Add Tags and Assign are now the ⋮ and a grey icon (mock, REG-170…173).
- **C-41 · Meetings:** [B2 ▲]
  - the tiers are Very likely · Likely · Maybe · Unlikely, but the measure keeps "Deal score" (W-040's "Chance" not used);
  - "Good / Fair / Weak match" splits at 70 / 40 (new copy);
  - "summary" for "brief";
  - "Won after" beside "Not going ahead".
- **C-42 · Qanvast Ops' header is title + ⋮** (New Qanvast lead · Request leads · Reports · Export). Its name and Studios tab are kept
  (REG-77). [B2 ▲]
- **C-43 · Activity's 14 type chips → one "Show: All ▾" pill (3-08) was left for you.** It changes the lead's and the project's Activity, and
  `ux-p3`. [B2 §7]

## Projects, the client portal, Issues, Messages

- **C-44 · "Tickets" reads "Issues" on every screen,** and Escalate reads "Flag to the Owner". The route `/tickets` and its keys stay.
  ↩ REG-2524's word. [B1 · B3]
- **C-45 · The Payments tab keeps its cents** (S$14,018.04) while the Overview, the listing and every card read "S$ 14,018". That is T-12 over
  T-11. Say the word and the tab follows the cards. [B3 ▲1]
- **C-46 · Issues keep the house Chips for Open · Closed · All,** rather than 3-08's "Open ▾" pill. [B3 ▲2]
- **C-47 · A project's Needs your attention unfolds in place ("Show n more")** rather than opening a review list. Only the Dashboard opens a
  drawer. [B3 ▲4]
- **C-48 · One milestone, one row.** Ryan's Needs count goes 12 → 10; the merged step sits in the row's ⋮. [B3 ▲5]
- **C-49 · "Payments" now names three things a step apart:** [B3 ▲7]
  - the tab;
  - Client payments' "Payments" view (receipts — "Receipts" may read better);
  - "Payments · 4" (the schedule's parts).

  Finance calls the same receipts list "Client payments" (REG-3283), so the two places disagree.
- **C-50 · The brief's yellow "This week" tag is still there** (`lib/projects/briefs.ts`). `AiBrief` now draws nothing for an empty tag, so it
  can go once the project's brief passes `tag: ''`. [B3 ▲8]
- **C-51 · New ▾ is two presses for a variant,** e.g. Purchase order › Order from the quote. The five kinds read at once; the variants are one
  level in. [B3 ▲9]
- **C-52 · "Contract" or "agreement" — pick one word.** Portal Files says "Contract"; the signing pages still say "agreement". [B3 ▲10]
- **C-53 · The B3 fork's other calls:** [B3 ▲10]
  - the client's /chat row drops the project name;
  - the Team tag stays a capitals chip, because it is 1-21's safety marker;
  - "Being fixed" shows on the portal's Issues too;
  - issue aria-labels and tasks made from an issue keep "ticket";
  - New message ▾ is outlined only at a desk;
  - the portal bell says "VO-1 approved";
  - "You are here" shows on no row when two milestones run;
  - floor-plan tools stay words;
  - Defer is a visible tick;
  - the margin strip shows only below plan;
  - new handover records store "n issues waiting on the studio".

## Quotes, contracts, templates, the Price book

- **C-54 · The quote's header ⋮ is 16 rows at a desk** (it was 13). Client view, Comments and Edit template came into it. T-14 says under
  ten. Folding it under "More ›" would move rows a dozen probes press. [B4 ▲1]
- **C-55 · The Create strip keeps only Templates.** Its Maison AI and Price book tiles left. The strip is the mock's (1260:31160); with one
  tile it might go altogether. [B4 ▲2]
- **C-56 · A new quote opens without Discount and GST (%)** (`DEFAULT_COLUMNS`, the one stored default this lane moved). They come back by
  themselves on a quote whose line uses them (REG-3222). That is the one rule the lane added rather than moved. [B4 ▲3 · ▲13]
- **C-57 · "Print group" is the free label's new name.** ↩ REG-574 ("Section label"). [B4 ▲4]
- **C-58 · Mark as sent's snackbar no longer offers "Move to Quote Sent".** Undo is always there; the move is the sent banner's button and the
  lead's stage pill. That is one more press. [B4 ▲5]
- **C-59 · The phone's reading cards still follow the print,** not the quote's sections (4-02 asked for sections). They are what the client
  reads. [B4 ▲6]
- **C-60 · "Items · 16"** (T-07's form) on tabs and card heads, not the house Tabs' badge, which means "what waits on you". [B4 ▲7]
- **C-61 · The deposit's due reads "On signing"** on the editor, the phone cards and the printed schedule. That includes a quote the client
  only confirms. [B4 ▲8]
- **C-62 · The upload tag says "5 credits",** not "5 AI credits". It sits next to Qanvast's Lead credits in the app's words. [B4 ▲9]
- **C-63 · The to-do chip "1 approval"** replaces "Waiting for my approval · 1". The template gallery does the same. [B4 ▲10]
- **C-64 · The view-only page's phone bar still says "Download".** "Download a copy" pushed Message {designer} 48px off a 390px screen. The
  two ways out both change the bar's design: wrap the bar to two rows, or drop the name from "Message". [B4 ▲11]
- **C-65 · A quote's status inside a sentence wears quotes:** `Mark OM-10007 “Confirmed”?`. The contract's one-word statuses stay bare.
  [B4 ▲12]
- **C-66 · The contract picker's Continue opens on the suggested template.** That keeps the UX audit's Q9 order (default → only → last used).
  The studio agreement is pre-picked only when nothing is suggested; W-616 asked for it always, which would reverse Q9. [B4 fork A]
- **C-67 · "Automation" is "Reminders" everywhere,** not only at the old bell. [B4 fork A]
- **C-68 · "From template" now lives only in the Activity fold** ("Created from a template") and on the template's gallery card.
  [B4 fork A]
- **C-69 · Three small contract changes:** [B4 fork A]
  - the contracts search also matches the quote number and the shown status;
  - the picker reads the studio's brand to draw real page thumbnails;
  - a signed contract keeps a near-empty bar with only the Outline toggle.
- **C-70 · The contract header's ⋮ is 10 rows** (11 while a link is out). That is just over T-14's "under ten". [B4 fork A]
- **C-71 · Price book proposals and submitted templates read "Waiting for approval",** and their chips "n approvals". §2 won over 4-12's
  "Proposed". The chip in a list's name cell is long. [B4 fork B ▲1]
- **C-72 · The template editor's "New quotes" tab is "Quote settings".** ↩ REG-569. [B4 fork B ▲2]
- **C-73 · Empty Vendor / Trade / Waste cells in the Price book are blank.** ↩ REG-228's "--" (here). [B4 fork B ▲3]
- **C-74 · The brand kit keeps Discard · Save changes.** Autosave would remove Discard and the leave guard. Its preview draws the default
  template without its own brand settings, so it follows the kit but isn't exactly how that template prints. [B4 fork B ▲4 · ▲5]
- **C-75 · The template editor's top bar keeps only the status pill.** Default and Edited since went. Library cards no longer say "edited …
  by …" (the list view does). [B4 fork B ▲6 · ▲8]
- **C-76 · Empty rows also leave the template editor's canvas** (e.g. a Ref row with no sample value). The inspector still lists them.
  [B4 fork B ▲7]
- **C-77 · The Letter house style now says "Quotation".** It was modelled on Dyel's "Sales Contract". [B4 fork B ▲9]
- **C-78 · Export file headers keep "Kind", "Category" and "Proposed / Approved",** because the import reads them back by name.
  [B4 fork B ▲10]

## Company, Settings, Finance, Reports, Plan

- **C-79 · Members (your example), as built:** [B5 ▲1]
  - the name opens the member's drawer;
  - the Role select is the row's only inline control;
  - the ⋮ holds Edit details · Public profile · Copy invitation link · Cancel invitation · Deactivate;
  - Reports to, Open to new leads, Lead preferences, Max projects, PayNow and a Manager's team live in the drawer;
  - a second line shows only for what is off the usual.

  The drawer is new UI.
- **C-80 · Company › Profile is four tabs:** Details · Bank & entities · Registrations · About page. Listed on Qanvast sits on Registrations;
  its "Add your UEN" opens Details, and the way back is the tab. [B5 ▲2]
- **C-81 · Stand-ins say "Demo" as a quiet chip,** with the old sentence as its tooltip. The house chip prints capitals, so the page's caps
  count rose 5 → 7. [B5 ▲3]
- **C-82 · Client portal › Set up keeps its Clients card** (5-37 proposed dropping it). Another probe reads its handles. [B5 ▲4]
- **C-83 · Questionnaire still has ~79 controls.** The rows' tools and the capitals type chip are the house DefinitionTable, shared with Custom
  fields. [B5 ▲5]
- **C-84 · The Company panel's help lines are tooltips** (and ⌘K's sub-lines). On a phone, with no hover, the panel is names only.
  [B5 ▲6]
- **C-85 · Settings › Notifications went 26,324 → 12,387 px.** Each event's "Edit wording" adds 57 controls. Folding the ~105 event rows by
  area is the next step. [B5 ▲7]
- **C-86 · The roles list opens on Designer** and keeps an All roles chip (the six side by side). The audit proposed one role at a time only.
  [B5 ▲8]
- **C-87 · Every Settings choice answers with Undo** (5-18's one rule). [B5 ▲9]
- **C-88 · Sources and reasons say "Stop offering" instead of "Retire".** Company › Profile's issuing entities still say "Retire".
  [B5 ▲10]
- **C-89 · The Related line is plain text links,** "Related:" first. The H2 that repeated the tab is visually hidden. [B5 ▲11]
- **C-90 · "Leads now" → "Leads".** Document numbers' Tickets row reads "Issues", and still prints T-2026-005. [B5 ▲12]
- **C-91 · Money on Finance's Needs your attention rows is whole dollars** ("S$ 5,530"). The registers (Client payments, Costs, Vendors,
  Commission) keep cents. Compare C-45. [B5 ▲13]
- **C-92 · "Approve" on Needs your attention, but "Approve and send" on the PO list and the PO's panel.** The `&do=approve` landing now keys on
  the testid, so one word everywhere is possible. [B5 ▲14]
- **C-93 · Client payments' Send / Confirm / Remind show only to whoever runs the books** (Owners, Admins, Accounting). A Designer would
  only meet a refusal. [B5 ▲15]
- **C-94 · Commission says "To pay" to whoever pays.** A member's own My commission keeps "Owed", because it is owed to them. [B5 ▲16]
- **C-95 · Commission on a phone keeps the CreditsTable cards.** Its grouped rows need a card design that wasn't drawn. [B5 ▲17]
- **C-96 · To do's per-group Column settings went with its tables.** Every fact a column held is on the row's line. [B5 ▲18]
- **C-97 · Vendors' "All" chip shows only while some vendor is inactive.** [B5 ▲19]
- **C-98 · The Finance Report menu has ten rows** (T-14 says under ten). Grouping them (Money · Costs · Statement) is possible. [B5 ▲22]
- **C-99 · Studio health opens on four tiles;** "Show all figures" isn't remembered between visits. [B5 ▲23]
- **C-100 · Sales › Over time folds its table** under the chart rather than dropping it, because the table has conversion and won value.
  [B5 ▲24]
- **C-101 · On a phone, Usage keeps its short "This month ▾",** and the Reports pills keep "Period:". [B5 ▲25]

## Tools

- **C-102 · Floorplan to 3D's prototype line moved behind the header's info glyph,** beside Beta. Its words are unchanged, and the line after
  a studio's own upload stays. The landing is otherwise kept as today's 1.0 audit left it. ↩ REG-3073, which put the line under the drop box
  on purpose. [B6 ▲2]
- **C-103 · We found reads as one sentence,** in Floorplan and the planner's photo dialog, not 1.0's chip row. `roomSummary` now names
  Corridor / Foyer, so the total adds up (relates to REG-3074). [B6 ▲3]
- **C-104 · The planner's photo start keeps its own path** ("Trace a floor-plan photo", its picture "3D floor plan") rather than becoming a
  door to Floorplan to 3D. [B6 ▲4]
- **C-105 · The New layout dialog gives My templates its own tab.** It opens on Flats. Say if templates should lead. [B6 ▲5]
- **C-106 · The planner's list gained a "Project no." column;** the number left the cards. [B6 ▲6]
- **C-107 · The material picker's categories are a scope pill in the AI Visualizer too.** It stays above the catalogue, not by the search.
  The "Your studio" head is kept (6-31 asked for a mark on each swatch, which is new UI). [B6 ▲7]
- **C-108 · Planner Finishes:** in 3D / Walk, the stage's room strip picks the room the panel paints. In a sheet, the panel keeps its chips.
  [B6 ▲8]
- **C-109 · Compliance:**
  - the agency tag is gone (the title names the agency);
  - a done step's ⋮ row reads "Open the record" (invented copy);
  - Designers get no ⋮;
  - the steps' titles are sentence case at their one source, so Profile's registrations follow.

  [B6 ▲9]
- **C-110 · Marketplace:** [B6 ▲10]
  - the "n deals" badge opens the brand page when there are several;
  - monogram logos are hidden;
  - demo links say "Links open on the live app" once;
  - Email names the brand;
  - the source lines are an info glyph.

  ↩ S24's chips with counts (REG-1898…1910) · S25's "· Sample" eyebrows (REG-1918…1927) · S42E's phone rule (REG-2217).
- **C-111 · AI Visualizer:** [B6 ▲11]
  - the on-screen version's ⋮ loses the "Share with the client…" first row (the top bar's Share is the door). ↩ REG-806 (UX audit V4);
  - the home intro has no Dismiss;
  - only the selected version's ⋮ shows on every touch screen;
  - "Before and after" replaces Compare;
  - the trial's editor says versions while its landing says renders.
- **C-112 · Quote X-Ray:** [B6 ▲12]
  - the row's left status bar went. ↩ REG-871 (Dane UAT 7.04);
  - an unpriced line only they have reads a red "Only in theirs";
  - the intro box shows while the studio has no comparison yet;
  - the status chips keep capitals;
  - "How we counted" prints whole dollars.

## The landing: the cross-lane pass (X · Y · the orchestrator)

- **C-113 · Projects › Payments:** Client payments' receipts view reads **"Collected"**. The region is already "Client payments", so the view takes §2's word for money received; Finance names the same list "Client payments". [X ▲]
- **C-114 · Everywhere:** **"Send on WhatsApp"** is the send button's words in the house send dialog, Send together, reminders and invoices (W-058). [X ▲ · REG-3340]
- **C-115 · Questionnaire, Custom fields (the definitions list):** each row's actions sit in one ⋮ (Edit · Move up · Move down · Delete); the name opens Edit. [X ▲ · REG-3338]
- **C-116 · Market Insights article:** the header is the crumb alone, so on a phone only the Back arrow shows. [X ▲]
- **C-117 · Company libraries (Templates, Price book), grid view:** no "☐ Folders" select-all head; folder cards keep their own ticks, and selecting every folder at once is in the list view. [X ▲ · REG-3339]
- **C-118 · Settings:** the tab reads **"Studio notifications"** (Your profile keeps *Your notifications*), and every pointer to it says so. [Y ▲]
- **C-119 · Stand-ins:** the house **Demo chip**, with a small info glyph, replaces B5's own copy and Qanvast Ops' "?". [Y ▲]
- **C-120 · Commission asks:** "Michelle asks for 5% commission", without the project, which the row's caption already names. [Y ▲]
- **C-121 · Words settled between lanes:** the Tasks ⋮ keeps W-636's words over W-607's (one shared component); "Meeting Copilot" stays over W-144's bare "Copilot" (§2); Reports' `MEDIANS_NOTE` keeps B2's neutral words because Projects' report shares it; the Qanvast source chip is sentence case; the coaching line drops "best". [Y ▲]
- **C-122 · "My Items" vs "Items"** (one page disagrees with itself: Price book › Items' tab says "Items", its empty state "Nothing in My Items yet", its menu "Export My Items…"; the quote editor's snackbars say "added to My Items" / "Section saved to My Sections"): the Price book's tabs read "Items · Sections", but about 30 sentences in B4's files still name the library "My Items" (and 114 probe lines read them). Left as is: one rename pass when you confirm "Items". [X left · Y ▲]
- **C-123 · Not done, each needs a look at the screen first:** the contract header's editable title; the four library editors dropping their meta row; a `TextField hideLabel` mode for table cells. [X left]
- **C-124 · Activity links:** a lead's and a project's Activity rows now say "See Payments" and "See Issue" (were "See Money", "See Ticket", the tabs' old names). The other "See {Place}" links keep their capitals. [orchestrator · REG-3352]

## The closing regression (2026-10-28)

60 of 156 probes went red on the first full run: 141 checks. Six triage agents settled every one (records in `build/regression/`):
mostly probes reading old words; **14 real defects, all fixed** (REG-3353…3372 — the Notes composer on a phone, ⌫ on Delete all, ⌘K's
New task, the Dashboard's readings of reworded sentences, seven loading ghosts, the timeline's phone time, two words); **nothing lost.**

- **C-125 · The rail's Tools no longer counts quotes waiting for approval** (B1's one home for approvals, 1-03 — not in B1's own list).
  The count is still on the Tools panel's Quotes tile and in the Dashboard's Needs your attention; ux-p4 now asserts both. ↩ UX audit P4.
- **C-126 · Finance › Vendors' chips carry no counts** — "Contractors" alone (B5); the list it opens still holds every contractor.
- **C-127 · Your profile:** "Your name and photo show wherever you appear… in the messages clients read" is back, behind the house info
  tip beside the role chip (B1 had dropped it entirely; nothing else on the page says clients see your photo). [REG-3367]
- **C-128 · ⌘K's `answers` rule:** a page can name a word it answers ("approvals" → the Dashboard), ranking it one above a row titled
  with that word. [REG-3364]
- **C-129 · Fixed, not a call:** on a phone the composer had autosaved at the first pause and vanished mid-sentence (2-46 + the desk's autosave);
  it now keeps the note until Save, as the docked one did (REG-3371). A desk's note still autosaves.
- **C-130 · The bell's due rows fold under "Due · n · Show"** with "· n late" on the fold's line (B1 1-20) — no longer first while late.
- **Noted:** `dane-p5b`'s follow-up chain fails before this build too — repair R179 (the Dashboard redesign) gives Cheryl Lim a call due
  today, so her Next follow-up opens that task instead of the Set a follow-up dialog; restated: the probe sets R179's call aside on its own copy for that chain and puts it back.
  `pm2-s31`'s "switching wrote nothing" is restated: landing on the Dashboard stamps the member's visit (migration 0115); the switch
  itself writes nothing.

## Dane's Tasks and Tickets reviews, merged (2026-10-28)

Merged on your word (REG-3373…3408; record `build/merge-dane-2026-10-28/`). His behaviour and layout kept, the calm build's words on his
strings, the calm build's structure where it had moved or removed what he changed. His own "For Vicky" notes are in his two review files.

- **C-131 · Issues say "Assigned to" / "Unassigned"** (Dane's pick of three) — replacing the calm build's "Handled by" / "Nobody yet",
  card tooltip and bell rows included; the assign snackbar reworded to match ("T-… is assigned to {name}") — invented copy.
- **C-132 · Issues' scope reads All · Open · Closed** (Dane's order, was Open · Closed · All); on a phone the scope is a pill over a
  sheet "Issue status" (the calm build had kept the chips at every width).
- **C-133 · One New issue form** — Project is its first field; projects the member can't raise on are left out rather than greyed.
  Only the project's team, their Managers, Owners and Admins can be assigned an issue (refused on the server too).
- **C-134 · Superseded by the calm build:** the Tasks approvals strip stays removed (his change 19 redesigned it for phones); the
  All · Leads · Projects switch rides in the scope menu, so his spacing and divider before it (changes 1, 11) went.
- **C-135 · Tasks' View all** resets the scope and the Leads / Projects choice together (Dane wrote scope only — a one-line change back).
- **C-136 · Tasks' to-do chips say their words on touch** (Dane's change 4) — the calm build's 1-27 asked for it but the house pill hid
  the words below 1025; reverses part of W2-04. **A phone's New task is a sheet** (change 14: invented title "New task"; it closes
  after Add, ending REG-257's Enter chain on a phone); **"Add a task…" docks edge to edge** (reverses L4's phone card); the house
  search is 44 tall typed at 16 on touch app-wide (change 3).
- **C-137 · Found in the merge and fixed:** arriving on Tasks with `?add=1` (the Dashboard's add, a log's Add tasks) opens the phone's
  New task sheet; Issues' open search on a phone no longer covers the scope pill.

---

## Noted, not decisions

- **Probe failures not caused by this build:**
  - `dash-d1` (390, the ghost's Your day 24px taller) and `dash-d4` (the meeting row's ⋮ › Prepare me) failed the same way before it
    [B1 ▲14];
  - `pm2-s09` (Accounting lands on `/dashboard`, `homeOfRole`) — restated at the landing to the rule in force since the Dashboard redesign (Q-08);
  - `pm2-s31` — one View as check was this build's (the borrowed `.help` style, fixed: REG-3343); "switching wrote nothing to the demo" is read in the closing regression [B5 §5 · X].
- **Two identical copies of each status map — resolved at the landing (REG-3350: the lead tabs re-export B4's maps):**
  - `QUOTE_STATUS_LABEL` / `quoteStatusLabel` in `lib/quotes/status-words.ts` and `lib/leads/quote-filters.ts`;
  - `CONTRACT_STATUS_LABEL` / `contractStatusLabel` in `lib/contracts/status-words.ts` and `lib/leads/contract-filters.ts`.

  The words agree today. The brief asked for one map beside its enum, so one should re-export the other.
- **Found and fixed on the way** (the Marketplace phone cards, the brand page's ghost, the vendor line held empty): see B6 ▲13.
- **The probe limiter (`heavy.sh`) starved a lane that waited 45 minutes.** Polling every 0.3s fixed it for B6, and is worth adopting for
  every lane. [B6 ▲14]
