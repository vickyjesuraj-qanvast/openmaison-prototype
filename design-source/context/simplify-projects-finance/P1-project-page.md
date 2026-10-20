# P1 — The project page: its tabs and its Overview (simplify study, 2026-10-09)

This is a read-only study of `/projects/<id>` and all 14 of its tabs. I measured it on the scratch build at :3011, signed in as Dane (Owner),
at 1440 × 1024, 768 × 1024 touch and 390 × 844 touch, on all five demo projects:

| Project | State |
| --- | --- |
| Marcus Teo P-2026-004 | Setting up, direct |
| Ryan D’Souza P-2026-001 | In progress, from a lead, 6 red rows |
| Benjamin Han P-2026-002 | In progress, the busiest |
| Aisha Rahman P-2026-003 | On hold |
| Shalini Menon P-2025-001 | Completed |

Screenshots are in the session scratchpad at `simplify/shots/P1/`; their names are listed in the appendix. The probes and their JSON are
`simplify/p1/{shoot,menus,load}.cjs`, `metrics-*.json` and `load.json`.

**The standard I held it to.** Since 2026-10-08 (lead ↔ project parity, picks P-01…P-38) the project page is built on the lead's
mocked frame:

- the L2 header with "Stage: X ▾", one filled action and ⋮;
- the info column on the left and the Create strip on the right;
- the MAISON AI BRIEF card;
- the lead's cards on the Overview.

I keep that frame. This study is about what sits *inside* it: how many places there are, what they say, and in what order.

**In short.** The page has 14 tabs, and up to 6 of them carry red counts that mean six different things. "What needs you" is spread over 7
places on the Overview, and the places disagree with each other. Some things that need someone are not on the Overview at all: approvals of
purchase orders and expenses, the client's unread message, a client's mark on the floor plan, a payment the client says they made. The same
fact is printed 3–5 times (Payment overdue ×5). The Overview has 9–10 cards in two equal stacks, about 77 controls and up to 72 numbers.

The proposal keeps every feature, grouped into **7 tabs**: Overview · Tasks · Schedule · Client · Design · Money · Files & notes. Every
current address keeps working. The Overview becomes **one list of what needs you**, then your tasks, the client, and what's coming up, with
progress and money as glances beside them.

---

## 1. Jobs to be done

| # | The job, in the studio's words | Who | How often | Device |
| --- | --- | --- | --- | --- |
| J1 | "Post today's site photos so Benjamin sees the progress" | Designer | 2–5× a week | Phone, on site |
| J2 | "What do I have to do on this project today?" | Designer | Daily, 9am | Phone |
| J3 | "Answer what the client asked" — a message, a reported problem, a mark on the plan | Designer | Daily | Phone |
| J4 | "Carpentry's done — tick it and tell the client" | Designer | Weekly | Phone or laptop |
| J5 | "Log the call I just had, jot a note, add a to-do" | Designer | Daily | Phone |
| J6 | "Get Benjamin to pick the paint colour, and chase him" | Designer | Weekly | Laptop |
| J7 | "Chase the late payment / send the next invoice" | Designer, Admin | Each payment stage | Laptop |
| J8 | "Ryan says he paid — confirm it" | Designer (Q-48) | Each payment stage | Phone or laptop |
| J9 | "Pull up the drawing on site" | Designer | Daily | Phone |
| J10 | "Is this job on time, are we getting paid, is it making money?" | Owner, Manager | Monday | Laptop |
| J11 | "Approve what's waiting for me" — updates, POs, expenses, more time, a Done, the handover | Owner, Admin | Daily | Laptop or phone |
| J12 | "Pause it / resume it / hand it over / reopen it" | Designer, Owner | Rare | Laptop |
| J13 | "Get the client onto the portal / see what they see" | Designer | Once | Laptop |
| J14 | "Tick off the HDB / condo rules" | Designer | Weekly while the works run | Laptop |
| J15 | "Set the project up" — dates, members, value, contract, schedule, invite | Designer | Once | Laptop |

## 2. What each job costs today

A press is a click or tap. On a phone, a swipe of the tab strip counts as one. Typing and the phone's file picker are not counted. The
"choices" column is how many controls are on screen when the person decides.

| Job | Path today at 1440 | Presses at 1440 | Path today at 390 | Presses at 390 | Choices on screen | What the person must already know · where they can go wrong |
| --- | --- | --- | --- | --- | --- | --- |
| **J1** site photos | Create strip's camera glyph "Update" (icon-only unless the strip is expanded) → composer (Title · Details · Milestone · Add photos) → Post or Send for review | 3 | No Create strip below 768 (`quick-links.module.css:106-107`) → Updates tab (4th, half visible) → **+** → Add photos → Post | 4 | 77 controls on the Overview (56–59 buttons + 16–21 links; 65 above the fold) | That the camera glyph means "Update". That *Send for review* means it waits for an Owner (Q-17). **A site photo has 5 homes:** the update composer; Files › *Site photos*, a starter folder (`lib/projects/create.ts:81`) that is empty on Benjamin; Files › *Site updates*, where updates file their photos (`updates-model.ts:112`, 8 items); the floor plan's *Photo* tool and *Site diary*; and a message's attach button. A photo put in Files never reaches the client. |
| **J2** what's mine today | 0 presses, but the answer is spread over 7 places: the header's primary, the brief, the Project stages rows, MY TASKS, 6 tab counts, Latest updates' "1 in review" and the Money card's "Payment to confirm" | 0 (7 places to read) | Same, further down: the first actionable row is at **y 912** (the fold is at 844), MY TASKS at **1,369**, Latest updates at **3,102**, the page is **3,900** tall | 2–4 swipes down | 62 controls, 65 numbers | **Not on the Overview at all:** the client's unread message (tab count only); a floor-plan mark to answer (tab count only); compliance (tab count only); a PO and an expense waiting for approval, and a vendor bill to pay (Money tab, about 2,400px down, `components/finance/project-costs.tsx:91-105`). |
| **J3** answer the client | Notice "Messages 1" among 6 red counts → Messages → type → Send | 2 | Messages starts at x 649 on a 1,293px strip → 1–2 swipes → tap → scroll to the composer → Send | 4–5 | 14 tabs | The Overview mentions the message only in Recent activity ("1 message with Benjamin Han — 1 from their side"). Tickets is the 9th tab (x 738 on a phone). It reaches the Overview only once escalated or waiting more than 2 days (`attention.ts` ticket reasons; `tickets-model.ts:29` `WAIT_DAYS`). |
| **J4** stage done + tell the client | Schedule → Mark done (+ a confirm if early) → header *Share changes* → Share | 4–5 | Schedule → the row → Mark done → Share changes → Share | 5 | 65 | That marking a stage done doesn't tell the client. The page says so well: "Benjamin still sees the schedule shared on 2 Oct … 4 changes to share". |
| **J5** contact log · task | Create strip Contact Log → the Notes & Logs editor → Save. Task: Create strip Task → the add row | 2 · 1 | Notes & Logs is at x 1,000 → 2–3 swipes → **New ▾ → Contact Log** → Save. Task: Tasks → Add Task | **6–7** · 2–3 | 14 tabs | The phone has no Create strip, and the ⋮ sheet carries only AI Visualizer and 3-D Space Planner (`project-menu.tsx:47-52`). |
| **J6** client's choice | Choices → Add a choice → dialog. Chasing it means finding the "Waiting for Benjamin" banner | 2+ | Choices (6th, 1 swipe) → … | 3+ | 43 | On the Overview, the client being 7 days late reads in **red with a warning glyph**, the same tone as the studio's own overdue work (`attention.ts` key `waiting`). |
| **J7** chase a late payment | The "Payment overdue" row → Money opens at the invoice → *Remind on WhatsApp* → Send | 3 | Scroll down → same | 4 | 77 | A good path. But the same fact is on the Overview 5 times (§5, P1-03). |
| **J8** confirm a client's payment | Money card row "Payment to confirm · Ryan says they paid" → Money → Confirm → dialog | 3 | Same, after about 1,600px of scrolling | 4 | 77 | **Nothing else names it:** no attention reason (no key in `lib/projects/attention.ts`), no brief, no tab count (Money counts unpaid invoices, `queries.ts:472`), no primary. |
| **J9** the drawing | Files (11th) → *Floor plans* folder → file. Or the Floor plan tab (7th) for the marked-up plan | 2–3 | Files is at x 936 → 2–3 swipes → folder → file | 4–5 | 59 | "The plan" has 2 homes. |
| **J10** owner's Monday glance | Read Project stages (dates, days left), Schedule (3 of 7) and Money (contract · invoiced · collected · outstanding · profit) | 0 (3 cards, about 30 figures) | 3 cards spread over about 1,700px | 2 swipes | 72 numbers, 12 S$ amounts | **Profit misleads:** "Profit S$ 67,883 · Early estimate" on a S$ 69,283 contract (Benjamin), and "Profit S$ 48,600 · No costs yet", the whole contract (Marcus). Money's own Margin tile says "-- graded once costs pass a tenth of the contract". |
| **J11** owner's approvals (Benjamin) | Updates → Approve; Money → scroll about 2,400px → *Approve and send* (PO) → *Approve* (expense) → *Pay* (bill) | **7–9**, 2 tabs, about 3 screens of scrolling | Money is 7,222px tall at 390 | 9–11 | Money: 82 controls, 5 filled buttons | The Overview says only "1 in review" in grey on Latest updates' head. The handover review, *More time asked* and *Waits to be approved as done* do reach the primary and the rows. Cost approvals and bills don't. |
| **J12** hold · resume · handover · reopen | Stage ▾ → row → dialog → Save | 3 | Same, as a sheet | 3 | 5 rows | Good. Mirrors the lead. **Keep.** |
| **J13** portal invite | ⋮ → Invite to Portal → panel → Invite. Also Getting started's row | 3 | Same | 3 | 7 menu rows | Good. **Keep.** |
| **J14** compliance item | Compliance (10th: no number key, since `tabs.tsx:68` gives keys to `i < 9`) → Mark done | 2 | x 808 → 2 swipes → Mark done | 3–4 | 79 controls, 12 red MANDATORY chips, 12 Mark done buttons | **The same item is often a task too** (up to 10 starter tasks, `lib/compliance/starter.ts:18-40`, kept in step both ways by `sync.ts` and `syncTask`). Marcus's Recent activity prints one tick twice: "completed the task …" and "marked … done on the compliance checklist". |
| **J15** set up | Getting started card, 7 rows, each with its own button | 1–2 per item | Same | 1–2 | 7 rows | Good. **Keep.** But it overlaps: Start date and Target end are also on Project stages and in Project info, so dates show 3 times on Marcus. |

## 3. Load inventory per screen

### The Overview in each state (1440 unless marked)

| Measure | Marcus (Setting up) | Ryan (In progress) | Benjamin (In progress) | Aisha (On hold) | Shalini (Completed) |
| --- | --- | --- | --- | --- | --- |
| Cards (+ brief) | 9 + 1 | 9 + 1 | 9 + 1 (Show more adds 2 more briefs) | 10 + 1 | 10 + 1, plus the HandoverBar |
| Controls in the page body | 73 | 77 | 77 | 77 | 65 |
| Filled buttons | **2** (Start the project · Post an update) | 1 | 1 (Share changes) | **2** (Resume · Post an update) | 1 (*Create New Task*, on a finished job) |
| Red tab counts (their sum) | 2 (Tasks 9 · Compliance 11) | 3 (1 · 2 · 4) | **6** (Tasks 12 · Updates 1 · Money 1 · Floor plan 1 · Messages 1 · Compliance 12 = **28**) | 2 (1 · 16) | 0 |
| Red rows (warning glyph) | 2 | **8** (6 reasons + 2 schedule rows that repeat "2 milestones overdue") + an orange tag | 6 + a red due date + a red sent-back update + an orange tag | 0 (+ orange "On hold") | 0 |
| Empty-state illustrations | 2 (Latest updates · Questionnaire) | 1 | 1 | 2 | 2 (MY TASKS · Questionnaire) |
| Numbers on screen | 45 | 66 | 72 | 56 | 57 |
| S$ figures | 10 | 13 | 12 | 10 | 14 |
| Page height, 1440 / 390 | 1,880 / 3,979 | 1,836 / 4,068 | 1,784 / 3,900 | 1,929 / 4,273 | 1,919 / 4,037 |

**Chrome on every tab.** The header has Back, the title, 2 chips, Stage ▾, the primary and ⋮. Then 14 tabs, the info column (Overview
only: identity + 4 sections), and the Create strip (7 glyphs + its toggle). That is about 27 controls before any content.

**The Questionnaire card is empty on all five demo projects.** It is about 330px of illustration with the line "Questions are set up by
your studio's admins and will appear here", which means nothing on a running job.

### The other tabs (Benjamin)

| Tab | Controls | Red text | Numbers | Height 1440 / 390 | Notes |
| --- | --- | --- | --- | --- | --- |
| Tasks | 210 | 1 | 28 | 1,307 / 2,758 | The tab count says **12**, which is open tasks; only 1 is overdue |
| Schedule | 65 | 1 | 46 | 1,028 / 1,089 | Fits on one screen; one-sentence head ("Handover moves to Fri 20 Nov, one week later.") — the best screen on the page |
| Updates | 53 | 0 | 25 | 2,412 / 2,995 | Approve and Send back sit in the card — good |
| Money | 82 | 13 | 108 | **3,273 / 7,222** | 47 S$ figures; 5 filled buttons + the header's; Costs, POs, bills and expenses start about 1,900px down (P2's area) |
| Choices | 43 | 0 | 16 | 1,325 / 1,774 | |
| Floor plan | 89 | 2 | 75 | 1,818 / 3,676 | Also holds a *Site diary* with photos |
| Messages | 32 | 0 | 16 | 1,028 / 1,132 | Simple, good |
| Tickets | 32 | 0 | 14 | 1,028 / 961 | 1 open ticket; its filled *New ticket* + the header's = 2 filled |
| Compliance | 79 | **12** | 18 | 2,188 / 3,527 | 12 red MANDATORY chips · 12 *Mark done* |
| Files | 59 | 2 | 19 | 1,232 / 1,651 | 9 folders. *Site photos* (0) sits next to *Site updates* (8); the *Payments*, *Tickets* and *Choices* folders echo other tabs |
| Notes & Logs | 36 | 0 | 12 | 1,028 / 1,053 | 2 logs, both from the lead |
| Questionnaire | 29 | 0 | 9 | 1,028 / 961 | Empty |
| Activity | 205 | 0 | 236 | 7,812 / **15,687** | 13 filter chips |

### The strip at each width

- **1440:** all 14 tabs fit, edge to edge. The tabs past the 9th (Compliance, Files, Notes & Logs, Questionnaire, Activity) have **no
  number key**.
- **768:** the strip is 1,293px in a 692px row, so everything from *Messages* on is off-screen.
- **390:** the same 1,293px in 390. **10 of 14 tabs are off-screen**: Messages at x 649, Notes & Logs at 1,000, Activity at 1,224.

### Repeated facts on one screen (Benjamin, 1440)

| Fact | Where it shows | Times |
| --- | --- | --- |
| Payment overdue | brief ("Payment overdue."), Project stages row, Money › Outstanding (red, "S$ 20,785 overdue"), Money › Mid-Project row (red), the Money tab count | **5** |
| The stage | header "Stage: In progress", Project info › Stage, Project stages' current row | 3 |
| Start / target end | Project info, Project stages (+ Getting started on Marcus) | 2–3 |
| The overdue task | Project stages "1 task overdue", MY TASKS "Overdue · 1", the Tasks count (says 12) | 3, with 2 different numbers |
| Number · project type | header chips, Project info | 2 each |
| Signed quote · contract | Key documents, ⋮ (*Open the signed quote · Open the contract*) | 2 |
| What needs attention | the brief's tag "3 THINGS NEED ATTENTION", the brief's *What needs attention?* answer (the same rows, re-listed, shot `d1440-brief-what-needs-attention`), the Project stages rows | 3 |
| Contract value · collected · VOs (Shalini) | brief, Closing summary, Money | 3 / 2 / 2 |
| The member Dane | Collaborators "Owner: You" and "Members: Dane" | 2, under 2 words |

## 4. Feature inventory — every capability on the page, and where it would live

✓ means it stays exactly where it is.

| Capability | Today | Proposed |
| --- | --- | --- |
| Back to origin, crumb, title, number + type chips | Header | ✓ |
| Stage ▾: Start · Complete handover / Review · Reopen · Put on hold / Change hold · Resume, with refusals in the row | Header | ✓ |
| One filled action (the `next-step.ts` registry: Start · Review the handover · Set up the schedule · Share the schedule / changes · Send / Submit the {stage} invoice · Complete handover · Post an update · Resume) | Header | ✓ place; its pick reads the top row of **Needs you** (§6.3) |
| ⋮: Edit details (E) · Open the lead's record · Open the signed quote · Open the contract · Invite to Portal · Copy Link · Delete; on a phone also AI Visualizer · 3-D Space Planner | Header | ✓; on a phone the sheet also carries the Create list (§6.5) |
| Keys E (edit) · A (assign) · M (stage) · 1–9 (tabs) | Page | ✓; 1–7 now reach every tab |
| HandoverBar: review waiting · sent back · completed + Reopen · Withdraw · Send back · Complete | Under the tabs | ✓ |
| Info column: identity (copy phone, WhatsApp, copy email, directions), pencil, strip fold, Collaborators (Owner · Members · Add · member ⋮), Project info, Property info, Other info, Custom fields; phone: View Client Info | Overview left | ✓; Project info gains **Signed quote ↗ · Contract ↗** rows (from Key documents) |
| Create strip: Task · Note · Contact Log · Update · Variation order · AI Visualizer · 3-D Space Planner | Right edge, every tab, hidden ≤767 | ✓ at ≥768; ≤767 the same list in the ⋮ sheet |
| Maison AI FAB, suggestions that act | Every tab | ✓ |
| AI brief: per-stage brief, 2 buttons that act, Show more | Overview top | ✓ card. No count tag, no talk about the page, Show more only when it adds something new (§6.3) |
| Getting started: 7 items, each with its button, "n of 7 done" | Overview, while Setting up or anything is open | **Setting up:** ✓ (it *is* the to-do list). **After Start:** open items become rows in **Needs you** |
| Project stages: stage rows that open their step · age head · ↗ step · hold row + Resume + Change the hold · Start date / Target end rows open the dates dialog | Overview | **Progress** card: the same rows, the schedule's bar folded in |
| Attention reasons (`attention.ts`), each opening where it is fixed | Project stages rows | **Needs you** rows (the studio's to fix) or **With {client}** (the client's) |
| Waiting-on-client rows (quote / contract / choice / VO / invoice / question / milestone confirm) | Project stages rows | **With {client}** › Waiting on {client}, each with *Remind* |
| Schedule card: progress + next 2 milestones | Overview | Progress (bar) + **Coming up** (the milestones) |
| Money card: contract value + source · VOs · invoiced · collected · outstanding / overdue · profit (Owners / Admins) · payment to confirm · payment stages with invoice state · split name | Overview | **Money** glance: 4 figures; profit only once graded; *Payment to confirm* moves to Needs you; stages behind "Payment stages ▾" |
| Closing summary (completed) | Overview | ✓, and it **replaces** the Money card on a completed project (no duplicate figures) |
| Key documents: signed quote / uploaded copy · contract / uploaded copy · a direct project's other quotes and contracts · latest renders | Overview | Quote + contract → info column › Project info. Other quotes and contracts → Files & notes › Files (*Contract & VOs*). Renders → Design › Designs |
| MY TASKS: Overdue · Due today · Upcoming, complete, open, create | Overview | ✓ (the lead's mocked card), second in the act column; shown on a completed project only when tasks are open |
| Latest updates: the 3 newest, count, in review, Post an update | Overview | **With {client}** › "Last told {client}: n days ago — {title}" + *Post an update*; a review waiting → Needs you |
| Files card (folder tiles) | Overview | Off the Overview: the Files & notes tab |
| Questionnaire card + Ask Client dialog | Overview | Client › Questionnaire; on the Overview only as a "Waiting on {client}: n questions" row |
| Recent activity (5) | Overview | ✓ (3 rows) |
| Start · dates · value · assign (+ suggestion) · Invite to Portal panel · hold · Edit details · contract link / upload · 3-D layouts · ending dialogs · Ask Client | Dialogs | ✓, all of them |
| **Tasks** tab (the lead's table, compliance starter tasks, milestones column) | Tab 2 | ✓ **Tasks**, view *All tasks* |
| **Compliance** tab (phases · Mark done · Not needed · Navigator link) | Tab 10 | **Tasks › Compliance** view (same component, same address) |
| **Schedule** tab (timeline, moves, Share changes, asks, AI draft, templates) | Tab 3 | ✓ **Schedule** |
| **Updates** (compose, review, before / after, search, filters) | Tab 4 | **Client › Updates** |
| **Messages** (chat, All conversations) | Tab 8 | **Client › Messages** |
| **Tickets** (open / resolved, New ticket) | Tab 9 | **Client › Tickets** |
| **Questionnaire** (ask, answers, history) | Tab 13 | **Client › Questionnaire** |
| **Choices** (by room / milestone, options, VO draft, receipts) | Tab 6 | **Design › Choices** |
| **Floor plan** (plans, mark-up tools, marks, points, site diary, the client's confirmation) | Tab 7 | **Design › Floor plan** |
| Renders + 3-D layouts the client sees (portal *Designs*) | No studio tab: Create strip, Files › Renders, Key documents' thumbs, the layouts dialog | **Design › Designs** (new view on existing records: `lead_file_renders`, `render_share_links`, `space_layouts`) |
| **Money** (invoices, payments, credit notes, VOs, costs, profit) | Tab 5 | ✓ **Money** (inside: P2's study) |
| **Files** (folders, viewer, share links, trash) | Tab 11 | **Files & notes › Files** |
| **Notes & Logs** | Tab 12 | **Files & notes › Notes & Logs** |
| **Activity** (13 chips) | Tab 14 | **Files & notes › Activity** |
| Tab counts | 6 meanings, all red | One rule (§6.2) |
| Every deep link (`?open=` · `?compose=1` · `?share=1` · `?new=` · `?edit=1` · bell hrefs) | Per slug | ✓ unchanged: each slug keeps its address and lights its group's tab |

## 5. Problems, ranked by the load on a studio person

| # | Problem | Evidence | Who it hurts |
| --- | --- | --- | --- |
| **P1-01** | **Nobody can say where "what needs you" is.** The header's one filled action, the brief, the Project stages rows, MY TASKS, 6 tab counts, Latest updates' head and the Money card each hold part of it, and they disagree. On Benjamin the primary is *Share changes* while the brief leads with *Payment overdue*. On Ryan the primary is *Post an update* while 2 milestones are overdue and a payment waits to be confirmed. Several things that need someone are **on no Overview surface**: the unread client message, a client's floor-plan mark, PO / expense approvals and bills to pay, *Payment to confirm*, compliance. The primary registry doesn't weigh approvals or money. | `next-step.ts:30-68`; `attention.ts` (no reason for chat, marks, cost approvals or payment-to-confirm); `queries.ts:470-478` (those live only as tab counts); `project-costs.tsx:91-105`; shots `d1440-overview-benjamin-fold`, `-ryan-full` | Everyone; most of all the owner (J11) and the designer at 9am (J2) |
| **P1-02** | **14 tabs, and the counts shout without saying.** The lead has 8 tabs; the project has 14. Up to 6 red counts, each meaning something different: Tasks = *open* (12, of which 1 is overdue) · Updates = in review · Money = unpaid invoices · Floor plan = marks unanswered · Messages = unread · Compliance = mandatory items this phase (11–16 on every running project). Five tabs have no number key. At 390, 10 of 14 tabs are off-screen. | `lib/projects/tabs.ts:14-29`; `queries.ts:470-478`; `tabs.tsx:68`; strip 1,293px at 390 and 768; shots `p390-overview-benjamin-fold`, `t768-overview-benjamin-fold` | Phone users most (J3, J5, J9, J14) |
| **P1-03** | **The same fact, 3–5 times** (§3 table): Payment overdue ×5, the stage ×3, dates ×2–3, the overdue task ×3 with two different numbers (1 and 12), Shalini's contract / collected / VOs in the brief, Closing summary and Money. | `project-overview.tsx:183-276`, `:353-368`; `info-column` Project info; shot `d1440-overview-shalini-full` | Owner reading numbers (J10) |
| **P1-04** | **A wall of 9–10 equal cards with no reading order.** Two equal stacks, about 77 controls and up to 72 numbers. Status, schedule, money and documents sit on the left; tasks, updates, files, questionnaire and activity on the right. Nothing is ranked by "do this first". At 390 the page is 3,900–4,273px tall (5 screens). | `project-overview.tsx:399-402`; `load.json` | Everyone |
| **P1-05** | **Cards that don't fit the moment, with second filled buttons.** Questionnaire "No questions yet" on all 5 projects. Latest updates' empty card with a filled *Post an update* next to the header's *Start the project* (Marcus) or *Resume* (Aisha). A completed project's *Add your first task* + filled *Create New Task*. A 7-row Getting started card on a running project for 1 open item (Aisha). The completed brief's *What compliance is still to do?* (`briefs.ts:119`). | `project-overview.tsx:112` (`showSetup`), `:341-343`, `:390`; `my-work-card.tsx:74-79`; shots `d1440-overview-{marcus,aisha,shalini}-full` | Designers new to the tool |
| **P1-06** | **The brief describes the page, not the project.** "Payment overdue. 2 more on the Project stages card, each opening where it is fixed." (`briefs.ts:168`) Its tag counts what the card counts. Its *What needs attention?* answer re-lists the card's rows. Show more adds 2 more gradient cards (about 540px) that repeat Schedule and Waiting. | `briefs.ts:160-170`; shots `d1440-brief-more`, `d1440-brief-what-needs-attention` | Everyone |
| **P1-07** | **Red means five things.** The studio's own lateness (an overdue task or milestone), **the client's** lateness ("Waiting on Benjamin for 7 days"), a vendor's answer ("asked for changes to PO"), a client's no ("Ryan said no to Bathroom tiles"), and stalls ("Setting up for 7 days", "No update for 21 days"). All share one red row with a warning glyph. Ryan shows 8 red rows, 3 red counts and an orange tag. | `project-overview.tsx:224` (every attention item `state="alert"`); `attention.ts` keys `waiting` · `choice_declined` · `vendor_answer` · `setup_stalled` · `update_gap`; shot `d1440-ryan-status-card` | Owner (false alarms); designer (can't tell whose move it is) |
| **P1-08** | **Talking with the client is split over 6 tabs and about 10 doors:** Updates · Messages · Tickets · Choices · the floor plan's comments · Questionnaire · Schedule's share / confirm · Money's Remind on WhatsApp · Invite to Portal · the identity's WhatsApp. A site photo has 5 homes (J1). | tabs.ts; `create.ts:81` vs `updates-model.ts:112`; Files and Floor plan shots | Designer (J1, J3) |
| **P1-09** | **The phone loses its create doors and its order.** No Create strip ≤767, so *Contact Log* costs 6–7 presses on site and *Task*, *Note*, *Update* and *Variation order* need a tab first. The first actionable row sits below the fold (912), MY TASKS at 1,369, Latest updates at 3,102. | `quick-links.module.css:106-107`; `project-menu.tsx:47-52`; `menus.cjs` positions | Designer on site (J1, J2, J5) |
| **P1-10** | **Compliance is two lists of one thing.** The checklist tab and up to 10 synced starter tasks. A tick logs twice. The tab is a red flood: 12 MANDATORY chips, 12 *Mark done* buttons, and a count of 11–16 on every running project. | `lib/compliance/starter.ts:18-40`, `sync.ts:14-37`, `compliance-actions.ts` `syncTask`; shots `d1440-benjamin-tab-compliance-full`, `d1440-overview-marcus-full` (activity) | Designer (J14), and everyone seeing the badge |
| **P1-11** | **The owner's money glance misleads.** Profit is shown before costs exist, so profit ≈ the contract. Money's own Margin tile waits for a tenth of the contract in costs. | `project-overview.tsx:257`; Money tab tiles; shots `d1440-overview-{benjamin,marcus}-full`, `d1440-benjamin-tab-money-full` | Owner (J10) |
| **P1-12** | **What the client sees under *Designs* has no studio home.** Renders and 3-D layouts are reached through Create strip glyphs, Files › Renders, Key documents' thumbnails and the layouts dialog. | `lib/portal/model.ts:121-137` (the portal's Designs); `project-frame.tsx:261-266` | Designer |
| **P1-13** | **Key documents and the Files card repeat other doors.** Key documents repeats the ⋮ links. The Files card mostly shows folder tiles that the Files tab shows better. | `project-overview.tsx:280-318`, `:383-389`; `project-menu.tsx:45-46` | Everyone (screen space) |
| **P1-14** | **Small defects.** At 768 the waiting row's text runs under its chevron ("…awaits confirmatio"), and "Germain / e" breaks mid-name in Collaborators at 300px. At 1440 captions are cut ("Waitin…", "Payment to confir…"). Shalini's head reads "Took 293 days" (since Won) beside "Days 50 — 2 more than the 48 planned". "Owner: You" + "Members: Dane" are the same person. | shots `t768-overview-benjamin-fold`, `d1440-overview-{benjamin,ryan,shalini}-full` | Polish |

## 6. Proposal

**The idea.** The page answers three questions in this order:

1. *What needs me?*
2. *What's next?*
3. *Where does it stand?*

Every tool keeps its own place, but places that are one job seen from two sides are grouped. Nothing is removed. Every current address keeps
working. The lead's mocked frame stays. Everything below is built from house pieces: `Card` + the LEAD STAGES `Row` with its `action` ·
`MyWorkCard` · `AiBrief` · `InfoColumn` · `QuickLinks` · `Tabs` · `Chips` (single) · `PortalMenu` / `DropdownItem` · `CardEmpty` ·
`ActivityCard` · `HandoverBar` · the Money tab's *Remind on WhatsApp* dialog.

### 6.1 Tabs: 14 → 7

| # | Tab | Its views (house `Chips`, single; each view keeps today's address) | The one job |
| --- | --- | --- | --- |
| 1 | **Overview** | — | What needs me, what's next, where it stands |
| 2 | **Tasks** | All tasks · Compliance | Who does what. Compliance items *are* tasks (synced), so the checklist is a view of the same work: one list, one tick, one activity line |
| 3 | **Schedule** | — (as today) | When |
| 4 | **Client** | Updates · Messages · Tickets · Questionnaire | Everything said with the client: what we tell them, what they ask, what they report, what we asked them |
| 5 | **Design** | Choices · Floor plan · Designs | What gets built, decided with the client: picks, the marked-up plan, the renders and 3-D layouts they see under *Designs* (a new view on existing records) |
| 6 | **Money** | — (P2 shapes its inside) | Money in and out |
| 7 | **Files & notes** | Files · Notes & Logs · Activity | The record |

How it works:

- `PROJECT_TABS` gains a `group`. The route `app/projects/[id]/[tab]` and every slug stay as they are.
- A slug lights its group's tab. Its body's title line, the place that today prints "All Updates" or "Messages with Benjamin Han", becomes
  the view switch: `Chips` with counts. The body's own filter chips stay on the row below, so no new row is added.
- **Keys 1–7 reach every tab** (P-06's Tasks second is kept).
- **At 390** the first screen of the strip shows Overview · Tasks · Schedule · Client and half of Design. One swipe shows the rest; today
  it is three.
- *Alternative for Vicky:* Notes & Logs could go under **Client** (contact logs are conversations with the client). That leaves Files ·
  Activity as the record.

### 6.2 Tab counts: one rule

**A tab's count is what waits on *you* there.** One number, the DS count badge, nothing when 0. It never counts the whole list.

| Tab | Count |
| --- | --- |
| Tasks | Overdue + due today (Benjamin **1**, not 12) |
| Schedule | Asks for an Owner or Admin + changes to share |
| Client | Unread messages + tickets waiting on the studio + updates to review (reviewers only) |
| Design | Marks to answer + choices the client said no to |
| Money | Invoices overdue or ready to send + approvals and payments for you |

Compliance stops counting on the strip. Its view shows "n to do this phase" in grey. A view's chip carries its own share of the count.

On Benjamin this means 4 counts totalling 7, instead of 6 counts totalling 28, and each one is a thing to do.

### 6.3 The Overview — the studio's "What needs you"

The client's portal already opens on *What needs you* (`lib/portal/needs.ts`, `NEED_PRODUCERS`). The studio's page should open on its twin:
one registry fed by facts the loader already computes. Those facts are `attentionItems`, `waitingItems`, the ending's request, the schedule's
asks, `updateFacts.inReview`, the payments' `toConfirm` / `ready`, `vendorAnswers`, the cost approvals and overdue bills (F1's banner facts),
`unreadInChat`, `ticketsToAnswer`, `floorPlanToAnswer`, open Getting started items and the hold.

**Order of the rows** (Vicky to confirm):

1. What only you can unblock: approvals, the handover review.
2. Client money: a payment to confirm, an overdue invoice, an invoice ready to send.
3. The client waiting on the studio: an unread message, a ticket, a mark, a declined choice, a concern.
4. Late work: milestones, the target end.
5. Telling the client: changes to share, no update for n days.
6. Set-up leftovers.

**The header's one filled action is the top row's action.** The list and the button can no longer disagree, and the stage moves (*Start*,
*Complete handover*, *Resume*) are rows in the same list when they are due.

**Red means past its day and ours to fix.** The client's lateness is neutral, with an hourglass and *Remind*. A client's "no" and a vendor's
answer are neutral rows with *Open*.

#### At 1440, In progress (Benjamin as Dane)

The frame stays: header, the 7 tabs, the info column (left, 360), the Create strip (right), the HandoverBar when there is one.

**The centre, top to bottom:**

1. **MAISON AI BRIEF.** One card. Its tag names the week, never a count ("This week"). Its sentence says what the lists below don't: the
   week's movement and the next decision. For example: "Carpentry fabrication runs to 30 Oct. **Painting starts 2 Nov once Benjamin picks
   the paint colour.**" Its two buttons act on the top Needs-you row. *Show more* appears only when another brief adds something not on the
   page; today's Schedule and Waiting briefs go.
2. **Two columns: "act" (about 530) and "glance" (about 330).**

**The act column:**

- **NEEDS YOU · 6.** LEAD STAGES rows, each with its one text button. The first is also the header's filled button. More than 6 fold under
  "Show 3 more".
  - *Feature wall panels — Germaine sent it for review 4 days ago* · **Review**
  - *PO-2026-008 to Stone & Tile Masonry · S$ 5,529.57* · **Review**
  - *Grab to site — Germaine's expense · S$ 38.50* · **Review**
  - *Mid-Project invoice 7 days overdue · S$ 20,785* · **Remind**
  - *AquaFlow Plumbing's bill overdue · S$ 1,400* · **Pay**
  - *Benjamin asked: "can we add a socket inside the tall cabinet?"* · **Reply**
  - *1 mark on the floor plan to answer* · **Open**
  - *4 schedule changes Benjamin hasn't seen* · **Share**

  Nothing here repeats a task row; tasks stay in MY TASKS.
- **MY TASKS.** The lead's mocked card, unchanged: Overdue · Due today · Upcoming ▾.
- **WITH BENJAMIN.** The relationship in one card:
  - *Waiting on Benjamin* rows with **Remind** (the WhatsApp draft): Paint colours (needed 19 Oct) · Electrical & plumbing to confirm.
  - *Last told Benjamin 4 days ago — "Feature wall panels…"* · **Post an update**.
  - *Portal: opened yesterday* (or *Not invited* · **Invite**).
  - *n questions unanswered* when there are any. This is the Questionnaire card's only Overview presence.
- **COMING UP** (this week and next), each row opening its record:
  - *Thu 15 Oct · Ah Seng Stone Works — install the quartz countertop* (a task with an outside person)
  - *Fri 30 Oct · Carpentry fabrication ends*
  - *Mon 2 Nov · Painting starts — needs the paint colour*
  - *Completion invoice — sent when Handover & defect check is done*

  ↗ goes to Schedule.

**The glance column:**

- **PROGRESS.** Today's Project stages card with the Schedule card folded in. Its head: "62 days since Won". Then the 3 stage rows (each
  opens its step) · a "3 of 7 milestones" bar · Start 21 Aug · Handover 20 Nov · 42 days left · the hold row when on hold. ↗ goes to
  Schedule.
- **MONEY.** Contract S$ 69,283 · Collected S$ 27,713 (40% · the work is 43% done) · Outstanding S$ 20,785, with the overdue part in red.
  Profit appears only once graded (Money's own rule); before that, nothing. "Payment stages ▾" folds the 4 stages. ↗ goes to Money.
- **RECENT ACTIVITY.** 3 rows. ↗ goes to Files & notes › Activity.

**What leaves the Overview, and nothing is lost:**

- Key documents: its quote and contract go to the info column's Project info; renders go to Design › Designs.
- The Files card: Files & notes.
- The Questionnaire card: Client › Questionnaire + With {client}.
- Latest updates: With {client} + Needs you.
- Getting started after Start: Needs you.
- The Schedule card: Progress + Coming up.

**Expected:** about 25–30 numbers instead of 72, 7 cards instead of 9 + 3 briefs, and about 1,300px tall instead of 1,784.

#### The other states

- **Setting up (Marcus).**
  - The act column opens with **GETTING STARTED · 3 of 7 · 7 days** (✓ today's card). It *is* Needs you in this stage. "Setting up for 7
    days" becomes its head meta, not a red row.
  - Other needs follow as rows (*Deposit invoice ready · Send*), then MY TASKS and With Marcus (*Not invited · Invite*).
  - Glance: Progress (the stage rows only — the dates live in Getting started) and Money (agreed value; stages folded; no profit).
  - **No Latest updates card and no Questionnaire card.** One filled button: *Start the project*.
- **On hold (Aisha).**
  - Needs you opens with the hold row: *On hold since 2 Oct · resumes 16 Nov — "Aisha is away until mid-November"* · **Resume** ·
    *Change*. This is the header's filled button.
  - Then the reasons the hold keeps (`HOLD_KEEPS`). Everything else sits under one quiet "Paused while on hold · n ▾".
  - Getting started's last open item becomes a row (*Invite Aisha to her portal*).
  - No empty Latest updates card. One filled button.
- **Completed (Shalini).**
  - The HandoverBar stays (✓).
  - Needs you lists after-handover items: tickets, a refund to record, money still owed. With none, one line: "Nothing waits on you".
  - Glance: **CLOSING SUMMARY replaces the Money card**, so contract, collected and VOs are said once, plus "Payment stages ▾".
  - MY TASKS shows only with open tasks: no *Create New Task* on a finished job.
  - The brief's buttons: *Summarise the project* + one that applies, never *compliance* when there is none.

### 6.4 At 390 (Benjamin, a designer at 9am on site)

1. The header as now: title line + ⋮, then Stage ▾ + the primary, which is now the top Needs-you row's action.
2. The strip: Overview · Tasks · Schedule · Client visible.
3. The identity block (✓ mocked, REG-366).
4. The brief: one card, no stack of briefs.
5. **NEEDS YOU** directly under it, so its first row lands at about y 650 (today 912).
6. MY TASKS.
7. WITH BENJAMIN.
8. COMING UP: what's on site today and this week, including outside people booked.
9. PROGRESS.
10. MONEY.
11. RECENT ACTIVITY.

The page is about 2,900px tall (today 3,900).

### 6.5 Create on a phone

At ≤767 the ⋮ sheet opens with a **Create** group: the strip's own seven, from the same `PROJECT_LINKS` list. Then the record rows as today.
The sheet already carries 2 of the 7 (`project-menu.tsx:47-52`). *Contact Log* goes from 6–7 presses to 3 (⋮ → Contact Log → Save), and
*Update* from 4 to 4 with no hunting for the tab.

The lead's phone ⋮ should match (his call; see Q5).

### 6.6 Jobs after the change

| Job | Today | Proposed |
| --- | --- | --- |
| J2 what's mine today (390) | 7 places; first row at 912 | 1 list at about 650, then MY TASKS |
| J3 answer the client's message (390) | 4–5 presses; 1–2 swipes | Needs you › **Reply** → Client › Messages at the composer → Send: **2** |
| J5 contact log (390) | 6–7 | **3** |
| J7 chase a late payment | 3 (fact shown 5 times) | Needs you › **Remind** → Send: **2** (fact shown once) |
| J8 confirm a client's payment | 3, and unsignposted | Needs you › **Confirm** → dialog: **2**, and visible |
| J11 owner's approvals (Benjamin) | 7–9 presses, 2 tabs, about 3 screens of scrolling | 4 rows, each **Review** → its own approve control: 8 presses, **0 tabs to find, no scrolling** |
| J14 compliance item | 10th tab, 2–4 presses; tick logged twice | Tasks › Compliance → Mark done: 3. Or tick the task anywhere; one line in Activity |
| J10 owner's Monday glance | 3 cards, about 30 figures, misleading profit | 2 glance cards, about 10 figures, profit when it means something |
| J1 · J4 · J12 · J13 · J15 | — | Unchanged presses. J1's photos have one home: Updates. Files' starter *Site photos* folds into *Site updates* (Vicky's call) |

### 6.7 What becomes automatic

- Getting started hands its leftovers to Needs you at Start.
- The header's primary follows the list.
- Tab counts follow one rule.
- The brief never repeats the page.
- Profit appears when it's graded.
- Empty cards that don't fit the stage aren't drawn.
- A compliance tick is one record with one line.

### 6.8 Keep exactly as it is

- The lead's frame: header, Stage ▾ with refusals in the rows, ⋮ in the lead's voice, the info column, the Create strip at ≥768, MY TASKS,
  Recent activity.
- One filled action that follows the state (REG-917).
- Every row opens where its fact is fixed (A-10).
- Every deep link.
- The Schedule tab's one-sentence head and its "Benjamin still sees the schedule shared on 2 Oct … 4 changes to share".
- Updates' in-card Approve / Send back.
- Money's red banner with *Remind on WhatsApp* + *Record a payment*.
- The hold row with its reason.
- Getting started while Setting up.
- The HandoverBar.
- Messages and Tickets as they are.

## Questions for Vicky

Several of these revise picks from 2026-10-08.

- **Q1.** 14 tabs → 7 groups with view chips (§6.1). Labels **Client**, **Design**, **Files & notes**? Notes & Logs under Files & notes or
  under Client?
- **Q2.** Key documents, Files and Questionnaire leave the Overview (P-04 brought the lead's Files and Questionnaire cards across). Keep MY
  TASKS (yes, as proposed)?
- **Q3.** The header's filled action = the top row of Needs you, ordered: approvals → client money → the client waiting on us → late work
  → tell the client → set-up (a change to REG-917's registry order).
- **Q4.** Red only for "past its day and ours". The client's lateness becomes neutral + Remind (a change to REG-914's red rows).
- **Q5.** On a phone the ⋮ sheet carries the Create list. The lead's too?
- **Q6.** Tab counts = "waits on you" with Tasks = overdue + due today (a change to REG-1182 / REG-1400's "open tasks"); Compliance off the
  strip.
- **Q7.** Compliance as a view of Tasks rather than its own tab.
- **Q8.** The brief: no count tag, no "on the Project stages card", Show more only when it adds something (P-02).
- **Q9.** Profit on the Overview only once Money grades the margin (F2's rule, shown consistently).
- **Q10.** Invented words to approve: *Needs you* · *With {client}* · *Coming up* · *Progress* · *Paused while on hold* · *Last told
  {client}* · *Nothing waits on you*.

## Appendix — screenshots (`simplify/shots/P1/`)

- **Overview, each project at each width:** `{d1440,t768,p390}-overview-{marcus,ryan,benjamin,aisha,shalini}-{fold,full}.png`
- **Every tab of Benjamin:** `d1440-benjamin-tab-*-{fold,full}.png` · `p390-benjamin-tab-*-fold.png`
- **Menus:** `d1440-menu-stage.png` · `d1440-menu-kebab.png` · `p390-menu-kebab-sheet.png` · `p390-menu-stage-sheet.png` ·
  `p390-view-client-info.png`
- **The brief:** `d1440-brief-more.png` · `d1440-brief-what-needs-attention.png`
- **Ryan's red list:** `d1440-ryan-status-card.png`
