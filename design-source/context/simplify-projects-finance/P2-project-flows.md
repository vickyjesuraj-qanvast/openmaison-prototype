# P2 — The project's life, end to end, as flows (simplify study, 2026-10-09)

**What this covers.** The whole journey a studio runs on a project, as a sequence of moments:

- Won, or New project.
- Setting up.
- Each week while it runs.
- Closing a stage.
- The client's choices and asks.
- Pausing.
- Handing over.
- Reopening or deleting.

It also covers what the client sees on the portal at each moment.

**How it relates to the other studies.**
- **P1** (`P1-project-page.md`) redraws the project page: 7 tab groups, and the Overview's *Needs you* list as the studio's twin of the portal's *What needs you*.
- **P3** (`P3-project-money.md`) redraws Money.
- **This file** is about the *moves between* those places: which steps always happen together, what the person has to remember, and what the system could do for them.

The flows below plug into P1's *Needs you* and P3's money rows. They do not redraw either page.

**How it was read.**
- **The app.** A production build on :3011 on a scratch copy, signed in as Dane (Owner), at 1440 and at 390 touch. Every tab of P-2026-002 Benjamin Han was walked, and of P-2026-004 Marcus Teo (Setting up). Also walked: the Overviews of Ryan, Aisha (On hold) and Shalini (Completed), and the Won step on Vivien Lee's lead. Menus and dialogs were opened and then cancelled.
- **The client's side.** The portal through the studio's read-only *See it as Benjamin* (`app/my/[slug]/preview/route.ts`), at 390 and 1440.
- **The code.** Four code traces: creation and set-up, the Schedule, the running project (updates, choices, VOs, floor plan, tickets, messages, compliance, client messages), and pause and end.
- **What changed in the scratch copy.** Nothing was saved. Opening Benjamin's Messages tab marks the client's message read (`unreadInChat`). The preview writes its own session row.
- **Screenshots** are in `scratchpad/simplify/shots/P2/` (list at the end).

**The short version.** Every feature here works and is well made, one at a time. The load comes from the *seams between them*:

- **Scattered steps.** One real-world moment, "the carpentry is done", takes **about 16 presses on 5 surfaces**, three WhatsApp drafts to the same client, and two traps that only the code knows about (§2, J4).
- **One step shown at a time.** The header's single action shows one step and hides the rest (§5, P2-2).
- **Steps nothing prompts.** Seven steps have to be remembered, because no screen prompts them (§5, P2-3).

The proposal keeps every record and rule, and changes three things:

1. **One sheet per moment.** *Start the project* and *Mark {stage} done* each gather the steps that always go together. They show them as ticks that are on by default, and each tick obeys its own rule.
2. **What studios always do next becomes automatic.** For example: the wait starts when a choice is shared, the variation order is drafted when the client picks something priced, and the client is told on every step they can see.
3. **The phone is designed for the site.** *Photos · Done · Note · Message*, one tap away.

Presses for the five most frequent flows fall from **about 63 to about 30**. Counting only what follows a client's pick, they fall to about 17.

---

## 1. Jobs to be done

Who: **D** Designer (runs 2–4 projects, often on a phone on site) · **O** Owner · **A** Admin · **M** Manager · **C** the client.

| # | The job, in a studio's words | Who | How often | Device |
|---|---|---|---|---|
| J1 | "We won Sophia — get the job ready to start: dates, plan, her page, the deposit" | D, O | once per project | laptop |
| J2 | "A friend of the boss came straight to us — open a job without a lead" | O, D | a few a month | laptop |
| J3 | "Post today's site photos so the client sees the progress" | D | 2–3× a week per project | **phone, on site** |
| J4 | "Carpentry is done — get the client to sign it off, bill the stage, tell them" | D | every 1–2 weeks per project | phone or laptop |
| J5 | "The dates moved — tell the client the new handover" | D | a few times per project | laptop |
| J6 | "Get the client to pick the paint and the quartz, and charge the difference" | D | 3–10 per project | laptop, then the client's phone |
| J7 | "The client asked for one more socket — price it as a variation order" | D → O | a few per project | phone or laptop |
| J8 | "Answer the client" (a message, an issue, a pin on the plan) | D | daily | **phone** |
| J9 | "Approve what my team sent" (updates, invoices, a Done, more time, a share, a handover) | O, A (+ named reviewers) | daily | laptop and phone |
| J10 | "What do I have to do on this job this week?" | D (daily), O (Monday) | daily / weekly | both |
| J11 | "The client went overseas — pause the job, and restart it later" | D, O | rare | laptop |
| J12 | "Hand over and close the job" | D → O | once | laptop, on site for the walk-through |
| J13 | "Reopen a job for a defect; delete a job made by mistake" | O, A | rare | laptop |
| J14 | "Keep the HDB / MCST checklist straight" | D | weekly | laptop |
| J15 | "Agree the layout with the client on the floor plan" | D ↔ C | early in the job | laptop, and the client's phone |

---

## 2. The cost of each job today

Presses are counted from the project's Overview unless the row says otherwise, and do not include typing.
"Must know" means something no screen says at the moment it matters.

| Job | Path today (presses) | Surfaces | What they must already know | Where it goes wrong |
|---|---|---|---|---|
| **J1** Won → ready to start (lead with signed quote and contract) | Convert to Project → Save & Convert → View (3) · Getting started *Set up* → *Create schedule* (2) · *Invite* → *Invite on WhatsApp* → send in WA → *Done* (4) · header *Start the project* → *Start* (2) · Money → *Send* → *Send via WhatsApp* → send in WA (4) = **≈15** | 8: lead page · Move stage window · Overview · Schedule tab · Invite drawer · Start dialog · Money · Send dialog, plus WhatsApp twice | The deposit must be sent by hand from Money. No Getting started row names it (`lib/projects/getting-started.ts:41-61`), and the header's invoice action exists only while In progress (`lib/projects/next-step.ts:64`). | **Start date asked 3 times**: the Getting started row, the Schedule's *Works start on*, and the Start dialog (shots `1440-marcus-overview` · `-schedule-start` · `-start-dialog`). *Create schedule* turns outlined because *Start the project* holds the filled slot. **The Won step's payment split is editable but ignored** for a system quote (`lib/projects/create.ts:35`: the split is only used when `uploaded`). Before a quote is picked, it shows amounts on the lead's budget (S$88,500 against the S$68,176 quote; `components/leads/move-stage/panels.tsx:496-500`, shot `1440-lead-won-step`). Save leaves you on the lead. |
| **J2** New project (direct) | New project → 15 fields (5 required) + 12 scope chips → Create project → View (≥3) + then all of J1's set-up, plus Contract → Upload, and Members if the creator is an Owner, Admin or Manager | Listing · dialog · Overview … | That the client "never joins your leads". That Members is empty unless the creator picks someone (`new-project-dialog.tsx:24`). | Lands on the listing, not the project (`projects-workspace.tsx:228`). |
| **J3** Post site photos (390) | Projects dock → card → *Updates* tab → **+** → Title → scroll to *Add photos…* → pick → *Send for review* = **8**, then the Owner opens the bell → *Approve* (2) | 3 screens + OS picker | That posts go to review by default (`updates-model.ts:22-26`). Where *Post an update* lives. On a phone the Create strip is hidden (`project-frame.tsx:246-249`), and the header shows *Post an update* only when nothing else applies, because it is last in the registry (`next-step.ts:45`). | **Photos come last in the form** (`update-composer.tsx:225-237`, shot `390-montage-a`, last panel). **Title is required** (120 characters). No camera-first path. |
| **J4** Close a stage: done → client confirms → bill → tell | Schedule → open the milestone → switch *Ask {client} to confirm it* → Save (4) · row *Mark done* → *Mark done* in the early dialog (2) · the band's *Send the {stage} invoice* → *Send via WhatsApp* → send (3) · header (now *Share changes*) → *Share 4 changes* → snackbar *Tell {client} on WhatsApp* → send (4) · Updates → **+** → title/photos → Post (3) = **≈16** | Schedule · panel · dialog · Money · Share dialog · Updates, plus WhatsApp 2–3 times | **The ask must be on before the share.** The portal asks only if the shared copy says Done *and* `confirm_asked_at` is set (`lib/portal/schedule-model.ts:70-72`; `milestone-panel.tsx:449`). **The ready invoice takes the header slot ahead of Share changes** (`next-step.ts:57-68`), so Share is hidden until the invoice is sent. | **The start / done prompts live in page memory only** (`project-schedule.tsx:117`): a reload loses them. **On a phone a row has no Mark done**: open → Done → Save (`schedule-phone.tsx:38`), and the panel's Done never brings later stages forward (`milestone-panel.tsx:311`). **With completion approval on, the Owner's approval triggers no prompt to share or bill** (`project-schedule.tsx:313-319`). |
| **J5** Tell the client new dates | header *Share changes* → *Share N changes* = **2**, *but only when the header shows it*; otherwise open a milestone → *Share this change* (3+) | Schedule · Share dialog | That the toolbar's "**4 changes to share.**" is not a button that shares: it toggles the *What Benjamin sees* pane (`project-schedule.tsx:406-413`, shot `1440-ben-schedule`). | Resume, Review the handover, Set up the schedule and a ready invoice all take the slot first (`next-step.ts:32-68`). |
| **J6** A choice with a price | Choices → *Add a choice* → fields → *Add choice* (3) · per option: *Add an option* → source → fields → *Add option* (≈3 × 3 options = 9) · *Share with {client}* (1) · to make Painting wait on it: open the milestone → *Waiting on someone* → who / what → Save (4) · after the client's pick: *Draft a variation order* → editor → *Send ▾* → *Send for confirmation* → WA (5) = **≈22** | Choices · 3 dialogs · Schedule panel · quote editor · Send dialog | **Sharing a choice tells the client nothing**: there is no client event (`lib/portal/client-messages.ts:10-20`), only a portal bell. **The client's priced pick never drafts the VO** (`app/portal/choices-actions.ts`, no `draftVariationFromPick`), while a pick made *with* them offers it in the snackbar (`project-choices.tsx:241-246`). | **The same wait is set twice**: Benjamin's Overview says "Waiting on Benjamin for **7 days** — Painting", while Choices says "Waiting for Benjamin — shared **5d** ago" (shots `1440-ben-overview`, `1440-ben-choices`). The pick *ends* the milestone's wait by itself (`app/portal/choices-actions.ts:62`), but sharing never *starts* it (`app/projects/choices-actions.ts:139-153`). |
| **J7** Price the client's ask | From the client's message: **no action on a message**. Create strip *Variation order* (desktop only) or Money *New ▾* → editor → lines → Send ▾ → *Send for confirmation* → WA = **≈6 + lines** | Messages · Money / strip · quote editor · Send dialog | That floor-plan marks can raise a VO or a task (`floor-plan/mark-card.tsx:121-144`), but messages and tickets cannot. | The client's words are retyped. |
| **J8** Answer the client (390) | Messages: tab (2nd swipe of 14) → type → Send = 3. A ticket: Tickets tab → open → reply → Send = 4 | Messages · Tickets · `/chat` · `/projects/tickets` · the bell | That a reply in Messages **reaches the client only when they open the portal**: `client_message` is off on both channels by default (`client-messages.ts:31`). So designers WhatsApp anyway, and the portal Home also says "Message Germaine on WhatsApp" (`portal-1440.json`). | The client has three channels (Messages, Issues, WhatsApp) and the studio has four doors. |
| **J9** The Owner's approvals | Each kind waits in its own place (table in §5, P2-5): Updates tab band → *Approve* (2) · Money band → *Approve and send* (2) · Schedule band → *Open it* → *Approve as done* (3) · panel band (more time) → *Approve* → confirm (3) · Schedule band → *Review and share* → *Share* (2) · HandoverBar → *Review* → *Approve* (2) | Up to 5 tabs + the bell | Where each kind waits. The listing's *Needs my review* finds only updates, invoices, payments to confirm and handovers (`components/projects/scopes.ts:26`), not schedule asks, POs or expenses. | 9 kinds, 6 different switches (§5). |
| **J10** "What do I do this week?" | Read 7 signals: header primary · Getting started · the Project stages alert and waiting rows · the AI brief · 6 red tab counts (28 on Benjamin) · the bell's Due / Updates · the listing row's reason | Overview, bell, listing | That each follows its own logic. Benjamin's header says *Share changes* while his worst reason is *Payment overdue*: the registry ignores attention weights (`next-step.ts` vs `attention.ts:59-83`). | The brief says "3 things need attention", while the card shows 4 rows (3 attention, 1 waiting). |
| **J11** Pause / resume | Stage ▾ → On hold → reason → *Put on hold* = **3**; *Resume* = **1** (Undo on both) | Overview · dialog | That the client is **not told**. No client event for a hold (`client-messages.ts:10-20`); they only see "Paused" on their portal. | **Escalated tickets drop out of attention while on hold** (`attention.ts:116-119`, `HOLD_KEEPS`), but come back after completion (`attention.ts:205-215`). |
| **J12** Hand over | header *Complete handover* → each open item's *Open X* leaves the dialog (4–5 trips) → return → *Complete* / *Ask for review* / *Complete anyway* + reason = **≈8–12** | Handover dialog · Schedule · Money · Updates | That the Completion invoice is a separate trip to Money. That **compliance's Handover phase and open tickets are not on the checklist** (`lib/projects/handover-model.ts:107-157`; Benjamin's Compliance shows "Handover · 2 to do", shot `1440-ben-compliance`). | No Undo on completion; only an Owner or Admin can Reopen (`app/projects/ending-actions.ts:126-158`, `components/projects/ending/use-project-ending.tsx:53-63`). The client is never messaged. |
| **J13** Reopen / delete / restore | Reopen: 3 · Delete: 3 + Undo · Restore: ⋮ Deleted Projects → Restore (3) | — | Fine as it is. | Delete forever skips projects with money recorded without saying so (`app/projects/ending-actions.ts:315`). |
| **J14** Compliance | 10th tab → *Mark done* (2–3) | Compliance | That the item and its starter task are one record (synced, `lib/compliance/sync.ts:17-37`). | It never blocks or appears in the handover. |
| **J15** Floor-plan mark-up | Floor plan → *Add a plan* → file → name → *Add* (4). The client sees it **at once with no share step**, and is not messaged. | Floor plan | That adding a plan publishes it (`lib/projects/floor-plan.ts:189-198`). That studio replies ring only the portal bell (`floor-plan-actions.ts` has no notify or tell). | — |

**Five most frequent flows, totals today:** J1 15 + J3 8 + J4 16 + J5 2–3 + J6 22 ≈ **63 presses**. J4 alone needs **≈16 presses and 3 WhatsApp drafts** for one real-world moment.

---

## 3. Load inventory per screen (the flow surfaces)

Measured at 1440 on Benjamin (In progress) or Marcus (Setting up). The counts are visible controls in the page body (rail excluded), from `walk1.json`. Shot names are under `shots/P2/`.

| Screen | Controls | Decisions at the decision point | Competing primaries | Repeated / jargon | Shot |
|---|---|---|---|---|---|
| Overview, Setting up (Marcus) | 58 buttons; 14 tabs (2 counts); brief + 9 cards; 7-icon Create strip | 7 Getting started rows + *Start the project* + the brief's 2 + Stage ▾ + ⋮ + 7 Create = **≈19 actions on first sight** | **2 filled**: *Start the project* and *Post an update* in the empty Latest updates card — offered before work starts and before the client is invited (`project-overview.tsx:340-342`) | "Deposit invoice ready for 7 days" sits in the Project stages card, outside Getting started | `1440-marcus-overview` |
| Overview, In progress (Benjamin) | 57 buttons; 14 tabs (**6 red counts totalling 28**); 12 money figures | 4 alert / waiting rows + brief 2 + 1 primary | Primary *Share changes* while *Payment overdue* tops the reasons | "3 things need attention" vs 4 rows | `1440-ben-overview` |
| Won step | 4 sections; 2 × *From System / Upload*; 4 % inputs; *Reset to default*; type | 5 (quote, contract, 4 shares, type) | 1 | The split is ignored for a system quote | `1440-lead-won-step` |
| New project | **15 fields** (5 required) + 12 chips | 15 | 1 | "Payment split · From Company › Templates › Payment schedules…" | `1440-listing-new-project` |
| Start the project | 1 date (prefilled) | 1 | 1 | The same date as Getting started and the Schedule's *Works start on* | `1440-marcus-start-dialog` |
| Set up the schedule card | 1 date + 5 sources + template select + *Create schedule* (outlined) + *Manage schedule templates* + preview | 2 | header *Start the project* is the filled one | — (preselect + preview: good) | `1440-marcus-schedule-start` |
| Invite to Portal drawer (running project) | 2 people + household + address/Copy + 2 main buttons + 8 "can see" rows + **4 Waiting rows with Remind** + Done | 6+ | *Send the link on WhatsApp* | **Named "Invite to Portal" for a client invited two months ago**. It is really the client hub, and the only home of *Remind* (`client-access-panel.tsx:191-196`). | `1440-ben-invite-panel` |
| Schedule (Benjamin) | 50 buttons, 18 chips; 7 rows with bar, chip and ⋮; legend in 2 lines | Add milestone · ⋮ · 1 *Mark done* | header *Share changes* | "**4 changes to share.**" looks like a link but opens the client pane | `1440-ben-schedule` |
| Milestone panel | **11 sections**: Status (4) · Description · When (2 dates, 3 push buttons, Moves with, also waits) · Bar colour (9) · Tasks (14 rows) · Invoices · Shown to client · share history · Waiting on someone (3 fields) · Payment falls due (2) · Ask to confirm | ≈30 | *Save* | — | `1440-ben-milestone-panel` |
| Mark done early | 2 sentences, 1 checkbox | 1 | *Mark done* | — (good, and the seed of §6.3) | `1440-ben-done-early-dialog` |
| Share changes | 4 ticked changes · note · client preview (7 rows) | 2 | *Share 4 changes* | — (good) | `1440-ben-share-dialog` |
| Update composer | Title* · rich text (10 format buttons) · Milestone · media well · Preview · Save draft · Post | 4 | *Post* | Photos below the fold on a phone | `1440-ben-update-composer`, `390-ben-composer` |
| Choices (Benjamin) | 25 buttons, 23 chips; 2 choice cards, 7 option tiles each with ⋮ | — | *Add a choice* | *Draft a variation order* as a link line, not a step | `1440-ben-choices` |
| Complete handover | 4 rows × (*Defer* + *Open X*) = 8 buttons · closing summary (4 rows) · 2 fields | 10 | *Complete anyway* | "Milestones finished late **0 of 3** · 4 not done" | `1440-ben-complete-handover` |
| Settings › Projects | **12 cards, 5,137 px**; **4 approval switches in 3 cards**, plus Finance's PO and expense rules elsewhere | — | — | — | `1440-settings-projects` |
| Phone: project Overview / Money / Activity | 3,900 / 7,222 / 15,687 px = **4.6 / 8.6 / 18.6 screens**; strip shows 4 of 14 tabs | — | header *Share changes* | — | `390-ben-overview`, `390-montage-a/b` |

---

## 4. Feature inventory — everything the flows touch, kept

**Today** is where each feature lives now. **After** is where it would live, using P1's tab groups (Overview · Tasks · Schedule · Client · Design · Money · Files & notes) and P1's *Needs you*. **= same** means it is unchanged.

### 4.1 Creation and setting up

| Feature | Today | After |
|---|---|---|
| Convert to Project / Won step (quote and contract from system or upload, project type) | Lead page → Move stage window | = same; Save lands on the project |
| Won step **payment split** | Editable for any quote, used only for an upload (`create.ts:35`) | Shown only for an upload; for a system quote it reads "From OM-10005's payment schedule" (read-only, P3 owns the words) |
| Lock reasons on Convert, *Open project*, *Make the project again* | Lead header | = same |
| New project (direct): 15 fields, duplicate check, split template, a Designer's self-assign | Listing dialog | = same fields; optional groups fold under *More details* (Property extras · Rooms · First note); Create lands on the project |
| Starter folders, draft invoices, compliance starter tasks, the bell to the team | Automatic at creation (`create.ts:72-91`) | = same |
| Getting started (7 items) | Overview card | **Before work starts** = P1's Needs you while Setting up; dates and schedule move into the Start sheet |
| Start date / target end (Project dates dialog) | Getting started · Project stages rows · Edit details | Start sheet (one date); the dates dialog stays for later edits |
| Members (Assign, suggestion) | Info column · Getting started | = same (a row while empty) |
| Contract value (dialog + rebalance with Undo) | Getting started | = same (a row while empty; direct projects) |
| Contract (link or upload) | Getting started dialog | = same (a row while empty) |
| Schedule start (quote · AI draft · template · uploaded quote · blank; preselect; preview) | Schedule tab Start card | **Inside the Start sheet** (same picker and preview); the Start card stays for *Not now* |
| Invite to Portal (invite, resend, household, withdraw + Undo, See it as, Copy address, what they see, Waiting on + Remind) | Drawer, from ⋮ / Getting started / listing | Invite: a tick in the Start sheet. The drawer is renamed **{client}'s page** once invited (Vicky's word); Remind also appears on P1's *With {client}* rows |
| Start the project | Header / Stage ▾ / Project stages row | Opens the **Start sheet** |
| Deposit invoice (send / submit) | Money only; a bell row; an attention row after 3 days | **A tick in the Start sheet**; Money = same |

### 4.2 While it runs

| Feature | Today | After |
|---|---|---|
| Milestone status, drag, Moves with, also waits, push buttons, colour, description, tasks inside (with outside people), invoices tied, shown to client, waiting on someone, payment falls due | Schedule rows + panel | = same |
| Mark done (row / ⋮ / panel) + bring forward | 3 paths | **One *Mark done* sheet** from every path (§6.3); a phone row gets its own *Done* |
| Completion approval (Done waits, approve, send back, take back) | Schedule band / panel | = same rule; the sheet's ticks ride with the ask and run on approval |
| Ask the client to confirm, resolved note, ask again, stop asking | Panel switch | A tick in the Mark done sheet (default on for the handover stage); the panel keeps the switch |
| The client's "Looks good" / "Something is not right" | Portal → bell, attention | = same |
| Start / done prompts (*Post an update*, *Add tasks*, *Send the invoice*) | Page memory only | Kept as Needs you rows (they survive a reload) |
| Share changes (diff, partial, note, client preview, Invite, Tell on WhatsApp) | Header primary / panel link | Header *or* a **Share N changes** button on the Schedule toolbar, always; also inside Mark done |
| Share approval (ask, review and share, send back, take back) | Schedule band | = same; an approvals row (§6.7) |
| More time (ask, approve with update draft, decline, Undo) | Panel | = same; an approvals row |
| Rebuild, Draft with Maison AI, Save as template, Manage templates | Schedule ⋮ | = same |
| Timeline (weeks / months, today, full screen, legend, client pane) | Schedule | = same |
| Updates: composer, review (approve, send back, resubmit, held changes), withdraw, delete, discard change, see as client, before / after, named reviewers | Updates tab | = same; phone composer starts with photos (§6.4) |
| Choices: add, 4 option sources, vendor, price, reorder, save to Materials / Price book, share, take back, delete, needed-by, choose with client, change pick, the client's pick / no / other options, receipts | Choices tab | = same (P1: Design › Choices); share also starts the milestone's wait and tells the client (§6.5) |
| The pick's VO draft | A link line, by hand | Drafted automatically for the client's pick too; a Needs you row *Send VO-n* |
| VO: create (Money / strip / mark / pick), variation mode, omit picker, send for confirmation, mark approved (O/A), rebalance with Undo, bill on its own | Money / editor | = same; also *Raise a variation order* from a message or ticket |
| Floor plan: add, main plan, 11 tools, studio-only layer, marks → task or VO, resolve, comments, the client's confirmation | Floor plan tab | = same; *Add a plan* gets *Show it to {client} now* (on) + tell |
| Tickets: new, reply / internal note, resolve, escalate, assignee, studio list | Tickets tab · `/projects/tickets` | = same (P1: Client › Tickets); ⋮ also *Make a task* · *Raise a VO* |
| Messages: conversation, remove own, `/chat` | Messages tab · `/chat` | = same (P1: Client › Messages); ⋮ *Make a task* · *Raise a VO* |
| Compliance: phases, mark done / not needed, task sync, Navigator | Compliance tab | P1: Tasks › Compliance; its Handover items join the handover checklist |
| Remind the client (each waiting item), Remind on WhatsApp (invoice) | Invite drawer · Money | Needs you / With {client} rows (P1) + the same drawer |
| Maison AI: draft an update, add a task, what needs attention, draft a schedule, tell the client the new dates, summarise | Brief + FAB | = same; *Draft this week's update* feeds the weekly row (§6.11) |

### 4.3 Pause and end

| Feature | Today | After |
|---|---|---|
| On hold (reason, 1/3/6 months / Custom / none, change hold, Undo), the resume-day bell, Resume + Undo | Stage ▾ · Overview row · header | = same + a **Tell {client}** tick |
| Complete handover: checklist from records, Defer with reason, Complete anyway (O/A), notes, closing summary | Dialog | **Hand over sheet** (§6.9): the same checklist + compliance and tickets rows, in-place fixes, Completion invoice and Tell ticks |
| Handover review: request, approve, send back, withdraw, HandoverBar | Bar + dialog | = same |
| Completion locks (schedule, choices, money; payments stay open) | Server (`handover-model.ts:76-81`) | = same |
| Reopen (O/A, reason) · Delete (O/A, money rule) · Deleted Projects (restore, forever, empty) · Make the project again · Q-27 | Bar / ⋮ / listing ⋮ / lead page | = same |

### 4.4 Rules that must survive (every one stays)

- Who may change a project: team, their Managers, Owners and Admins (`lib/projects/policy.ts:12-16`).
- Update review: on by default; Owners, Admins and named reviewers.
- Invoice approval: on.
- Completion approval: off.
- Share approval: off.
- Handover review: off, but always applies with items open.
- Mark a VO approved: Owners and Admins only.
- POs over S$5,000 and expenses: approved by Owners and Admins.
- Who confirms a client's payment: the assigned designer.
- Who sees money: F-17.
- The portal reads only the shared snapshot. Portal sections are switched per project.
- Everything a client sees needs a studio press. Undo stays on every remove.

---

## 5. Problems, ranked by load on a studio person

**P2-1. One moment, many trips.**
- **Closing a stage** (J4) is ≈16 presses across Schedule → panel → dialog → Money → Share → Updates. It sends three WhatsApp drafts to the same client within a minute: the invoice, the schedule share, and the update email that goes automatically.
- **Getting a won job ready** (J1) is ≈15 presses across 8 surfaces.
- Studios do these steps together every time, but the product treats them as unrelated.

**P2-2. The header shows one step and hides the next.**
- `PRIMARY_ACTIONS` (`lib/projects/next-step.ts:30-68`) picks the first matching entry. *Send the invoice* is spliced in ahead of *Share changes* (`:63`), *Post an update* is last (`:45`), and *Start the project* never mentions the deposit (`:32` vs `:64`).
- On top of that, the registry ignores the attention weights: Benjamin shows *Share changes* with a payment 7 days overdue.
- So the person sees one step, does it, and only then discovers the next.

**P2-3. Seven steps with no prompt.** Each must be remembered:
- **The deposit invoice.** Not a Getting started row; only a bell row and an attention row after 3 days ("Deposit invoice ready for 7 days" on Marcus).
- **Ask to confirm before sharing.** `waitsForClient` needs both (`lib/portal/schedule-model.ts:70-72`).
- **Set the milestone's wait when sharing a choice.** Ended automatically, never started (`app/portal/choices-actions.ts:62` vs `app/projects/choices-actions.ts:139-153`).
- **Draft the VO after the client's priced pick** (§2, J6).
- **Tell the client** after a choice is shared, a floor plan added, a hold, a resume or a handover. No client event exists for any of them (`lib/portal/client-messages.ts:10-20`).
- **The start / done prompts.** They vanish on reload (`project-schedule.tsx:117`), and never follow an Owner's approval of a Done (`:313-319`).
- **Remind the client.** Only inside the *Invite to Portal* drawer (`client-access-panel.tsx:191-196`).

**P2-4. The same fact asked or set in several places.**
- **The start date**, three times: Getting started, *Works start on*, the Start dialog.
- **The target end**, twice: Getting started, and the schedule sets it anyway (`schedule-actions.ts:189-191`).
- **The client's wait**, twice: the milestone's *Waiting on someone* (7 days) and the choice's share (5 days).
- **The Won step's split**, edited and then discarded.

**P2-5. Approvals: nine kinds, six switches, five places.**

| Kind | Rule (default) | Where the approver finds it | Listing *Needs my review* |
|---|---|---|---|
| Update | Settings › Projects › Updates (on) + named reviewers | Updates card band | ✓ |
| Invoice | Settings › Projects › Invoices (on) | Money band | ✓ |
| Client's payment proof | Settings › Projects › Client payments (assigned designer) | Money band | ✓ |
| Handover | Settings › Projects › Stages and handover (off; always when items are open) | HandoverBar | ✓ |
| Milestone Done | Settings › Projects › Schedule (off) | Schedule band → panel | ✗ |
| Share of changes | Settings › Projects › Schedule (off) | Schedule band → dialog | ✗ |
| More time | always (Designers and Managers) | Panel band | ✗ |
| PO > S$5,000 · expense | Settings › Finance | Money › Costs bands · Company › Finance | ✗ |
| VO approved off the link | Owners and Admins only | Money row ⋮ | — |

**P2-6. The phone on site is an afterthought for the most frequent job.**
- Posting photos takes 8 presses, with the photos at the bottom of the form.
- The title is required.
- The Create strip is hidden.
- *Post an update* is the header's last choice.
- Marking a stage done needs the sheet and Save.
- The Overview is 4.6 screens long before its *Latest updates* card.

**P2-7. The client loop is inconsistent** (full map in §6.10).
- **Who gets told.** Six studio acts email the client automatically. Eight reach them only on the portal, with at most a portal bell.
- **Messages.** Off on both channels by default, so the studio's replies wait for the client to open the portal.
- **Too many channels.** The client sees three (Messages, Issues, a WhatsApp line); the studio has four doors (two tabs, `/chat`, `/projects/tickets`).
- **Preview mismatch.** The studio's preview says *Under way* for a Blocked stage, where the portal says *Paused* (`client-schedule.tsx:45`, `schedule-model.ts:336`).

**P2-8. Wrong names and homes.**
- The client hub is called *Invite to Portal* after the client has been invited.
- *Ask for more time* restrains nothing, because a Designer can drag the dates (`schedule-actions.ts:366-382`, team rule only).
- The Contract dialog says "Files › Contract", but the folder is *Contract & VOs* (`app/projects/actions.ts:388`).
- *Create schedule* turns outlined while the header's *Start* holds the filled slot (`start-schedule.tsx:69-70`).

**P2-9. Handover is a scavenger hunt.**
- Every open item's button leaves the dialog.
- The Completion invoice is a separate trip.
- Compliance's Handover phase and open tickets are missing from the checklist.
- No Undo on completion.
- The client is never told.

**P2-10. Creation leaves you somewhere else.** Won keeps you on the lead, and New project keeps you on the listing. Each adds a press, and the next step (Start) is out of sight.

**P2-11. Hold hides problems.** Escalated tickets drop out of attention during a hold (`attention.ts:116-119`), and the client hears nothing.

**P2-12. Undo gaps in the middle of the flows.** *Create schedule*, *Add milestone*, *Ask again*, *Share*, *Start the project* and *Complete handover* have no Undo, although nearly everything around them does.

---

## 6. Proposal — the project's life as five moments

### 6.0 Rules the redesign follows

1. **One sheet per moment.** The steps that always happen together become ticks in one house `Dialog` (a bottom sheet ≤767).
   - Ticks are on by default for what studios do.
   - Each tick obeys its own rule today. A Designer under invoice approval sees *Submit the Deposit invoice*; under share approval, *Ask to share*.
   - Untick to skip; every step stays reachable on its own tab.
2. **One press reaches the client at the end.**
   - The automatic client messages go as today.
   - A sheet that sends things ends with *one* WhatsApp draft, listing what went out, instead of one draft per step.
3. **Needs you is the backbone** (P1 §6.3).
   - Every step a sheet leaves undone is a row there, with its button.
   - The header's filled action is that list's top row (P1 Q3).
   - Getting started *is* Needs you while Setting up.
4. **What studios always do next becomes automatic only where nothing reaches the client without a press.** Drafts, waits, rows and prompts are automatic. Sends are not.
5. **Every sheet answers with one sentence and one Undo** (the schedule panel's save sentence, `lib/projects/schedule-model.ts:536-540`).

### 6.1 The life on one line

```
Won step ─► Project · Setting up ──[Start sheet]──► In progress ──(weekly loop)──► [Hand over sheet] ──► Completed ──► (tickets, money)
New project ─┘          │                              │  ├ Post photos (phone)                        │            └─ Reopen (O/A)
                        └─ Before work starts           │  ├ Mark {stage} done (sheet)                   └─ Review (O/A, when on)
                           (Needs you)                  │  ├ Share N changes
                                                        │  ├ Choice → pick → VO draft → Send
                                                        │  └ Client asks → Reply · Task · VO
                                                        └─ On hold ⇄ Resume (Tell {client})
```

### 6.2 Moment 1 — Start the project (J1, J2)

**Won step.**
- Unchanged, except the payment split: it shows only for an uploaded quote. For a system quote it reads "Payments follow OM-10005's payment schedule", in the Start card's own sentence (`start-schedule.tsx:94-117`).
- *Save & Convert to Project* opens the new project.
- The lead's header keeps *Open project* for later.

**New project.** It keeps its 15 fields.
- Required, on top: Client · Phone · Property type · Project type · Agreed value · Payment split. Plus Members, shown when the creator is not a Designer.
- **More details ▾** holds: District · Address · Floor area · Style · Rooms · First note.
- *Create project* opens the new project.

**Overview, Setting up = Before work starts** (P1's Getting started as Needs you). The rows only:
- Members — while empty.
- Contract value and Contract — direct projects, while empty.
- **Start the project** — the header's filled action.

The date, schedule, invite and deposit rows leave the list, because the sheet does them. A row reappears if someone unticks it.

**The Start sheet.** House `Dialog` size *l* (800). The same as `StartProjectDialog`, grown.

| Region (top → bottom) | 1440 | 390 (bottom sheet) |
|---|---|---|
| Head | "Start the project" · subtitle *Condo 3-bedder — Marcus Teo* · close | same; grab handle |
| 1 · When | **Works start on** (one date; prefilled from the project or today) | same |
| 2 · The schedule | Left: *Milestones come from* — today's `SourcePicker` with its preselect and helper ("Picked for a Condo 3-bedder — the ready-made Condo schedule"). Right: today's *What you will get* preview, with "Handover around Thu 24 Dec" and the payments line. A *Not now* option keeps today's Start card on the Schedule tab. | Picker as a select; the preview folds into one line ("9 milestones · handover around Thu 24 Dec ▾") |
| 3 · Tell {client} | ☑ **Invite Marcus to his page** — "He signs in with 9651 3842" (shown while not invited; the mobile-number rule says why when it can't) | same |
| 4 · Money (who sees money) | ☑ **Send the Deposit invoice · S$4,860** — "10% · due on signing · due 7 days after it's sent". A Designer under invoice approval sees ☑ **Submit the Deposit invoice for approval**. | same |
| Foot | Cancel · **Start the project** | same, full width |

**After Start:**
1. One sentence + Undo: "Condo 3-bedder — Marcus Teo is in progress — 9 milestones to 24 Dec; Marcus is invited; INV-2026-0xx sent."
2. Then **one** WhatsApp draft, opened on the press: the invite's text plus the deposit's line and link.
3. Undo reverses the stage, the schedule, the invite stamp and the invoice's Draft → Sent. It is refused once the client opened the link or paid, and says so.

**Rules kept.** Each step calls today's action: `startProject` · `createSchedule` · `inviteClient` · `sendInvoice` / submit. Every refusal shows in its row (REG-728).

**Presses.**
- **J1:** Convert → Save & Convert → Start the project → Start → send in WhatsApp = **5** (today ≈15).
- **J2:** Create (1) + Start (2) + WA = **4**, plus Members / Contract rows when needed.

### 6.3 Moment 2 — Mark {stage} done (J4, J5)

**The Mark done sheet.** House `Dialog` size *m* (600), grown from today's *Mark Carpentry done today?* (`project-schedule.tsx:607-628`).

It opens from every Done path:
- the row's *Mark done*;
- the row ⋮;
- the panel's Status → Done;
- a new **Done** on each phone row (`schedule-phone.tsx`);
- the Overview's Coming up row.

| Region | Content (1440; 390 is the same stacked in a sheet) |
|---|---|
| Head | "Mark Carpentry fabrication done" · subtitle the project |
| 1 · When | "Done today, 3 weeks early" — the date (today, editable back to its start) · ☐ *Bring Painting and 2 more forward* (today's checkbox; also offered from the panel now) · "8 of 14 tasks inside are still open — they stay open" |
| 2 · Tell {client} (only while the client has a portal; else one row *Invite Benjamin*) | ☑ **Show it on his schedule as done.** Lists the other N changes waiting to be shared, each ticked; the full Share dialog stays one link away (*Choose what to share*). ☑ **Ask Benjamin to confirm it** — on by default for the handover stage and for template items that ask; else the milestone's own switch. ☐ **Add photos** — a compact photo well; filled, it posts an update titled "Carpentry fabrication is done" (the update review rule applies). |
| 3 · Money (who sees money; only when a stage is tied) | ☑ **Send the Mid-Project invoice · S$20,784.94** (or *Submit for approval*) |
| Foot | Cancel · **Mark done**. Under completion approval for a Designer: **Ask to approve**. The ticks ride with the ask, and run with the Owner's *Approve as done* (which today runs none of them). |

**After Mark done:**
- One sentence + Undo, extending today's: "Carpentry fabrication marked done — shown to Benjamin, who is asked to confirm it; INV-2026-007 sent. Painting and 2 more start sooner."
- Then one WhatsApp draft. The share and the invoice email go automatically today (`client_schedule_shared`, `client_invoice_sent`), so the WA draft is offered on the snackbar, not forced.

**Share changes on its own (J5).** The Schedule toolbar's client line gets a real button.
- Today's line "Benjamin still sees the schedule shared on 2 Oct…" stays as the pane toggle (P1 keeps it).
- **Share 4 changes** (outlined) sits beside it whenever there are changes, so it no longer depends on the header slot.
- Under share approval, the button reads *Ask to share 4 changes*.

**Presses.**
- **J4:** Schedule → Mark done → Mark done = **3** (+ WA optional), today ≈16.
- On a phone: Done → Mark done = **2** from the schedule.
- **J5:** **2**, always.

### 6.4 Moment 3 — Post from the site (J3, J8 on a phone)

**The phone site bar.** On a project page ≤767, while In progress, a fixed 4-button bar sits at the bottom, on the house dock frame (`.dockFrame`, the portal's and the Schedule's *Add milestone* dock):

| Button | What it opens |
|---|---|
| **Photos** | The OS picker / camera at once, then the composer |
| **Done** | The running milestone's Mark done sheet; with several running, a pick list first |
| **Note** | Notes & Logs' new note / contact log |
| **Message** | Client › Messages at the composer |

This sits alongside P1 §6.5's Create group in the ⋮ sheet; the bar is the on-site shortcut. Maison AI rides above it, as it does over the Schedule's dock (REG-1061).

**The composer on a phone, photos first.**
1. The media well opens **before** the title, already filled from the picker.
2. **Title prefilled** "{running milestone} — Fri 9 Oct", editable. Today a title must be typed (`update-composer.tsx:225`).
3. The milestone is preselected to the running one.
4. *Send for review* / *Post* as today; the subtitle still says where it goes.

Desktop keeps today's order.

**Presses (J3):** Projects → card → **Photos** → pick → **Post / Send for review** = **5** (today 8). The review rule is unchanged.

### 6.5 Moment 4 — The client's choices turn into money (J6)

- **Share a choice:**
  - If the choice names a milestone, sharing it **also starts that milestone's *Waiting on Benjamin for {choice}***, the wait the client's pick already ends (`endWaitForPick`). The panel shows "Set by sharing Paint colours".
  - Sharing **tells the client** through a new client event, *A choice to make*, email by default like the other six. It is a new row in Settings › Notifications › Messages to clients, and Vicky's call.
- **The client picks a priced option** → the VO is **drafted automatically**, the same draft `draftVariationFromPick` makes today (`app/projects/payment-actions.ts:268-300`). A Draft never reaches the client.
  - Needs you row: *Benjamin chose Calacatta quartz · +S$1,308.00 on the contract* · **Send VO-3**.
  - The press opens today's *Send for confirmation*.
- **The client says no** → today's row (*Benjamin said no to Paint colours*) with **Share again** · **Choose with Benjamin**.
- **Presses** after the pick: **2** (Send → WA), and nothing to remember. Today it is ≈5 plus remembering. Setting up the choice is unchanged; option entry is already good.

### 6.6 Moment 5 — The client asks (J7, J8)

- **Every client message, ticket and floor-plan mark carries the same three actions:** Reply · **Make a task** · **Raise a variation order**. These are the mark card's two actions (`mark-card.tsx:121-144`), now on messages and tickets as well.
  - The task's title and the VO's first line take the client's words.
  - The source links back: "From Benjamin's message, 7 Oct".
- **Studio replies reach the client.**
  - `client_message` comes on for email by default, with the one-an-hour guard kept (`MESSAGE_GAP_MINUTES`). This is Vicky's call; it changes H-Q18.
  - The portal's "Message Germaine on WhatsApp" line stays as the off-portal door.
- **Presses (J7):** message ⋮ → *Raise a variation order* → (editor, lines) → Send = **3 + lines**, with the words carried over.

### 6.7 The Owner's OK, in one place (J9)

**On the project.** P1's Needs you has a first group, **Needs your OK**, one row per waiting approval of every kind in the §5 table:
- each row has its approve control **in place**;
- *Send back* opens today's note dialog;
- the bands on Updates, Schedule and Money stay where they are, for whoever opens those tabs.

**On the listing.** *Needs my review* counts **every kind** in the table: it adds schedule asks, POs and expenses (`scopes.ts:26`).

**On the phone.** The bell's approval rows carry *Approve* · *Send back* in the row; today they open the record.

**After an approval, the work continues:**
- approving a Done runs the ticks that rode with it (§6.3);
- approving more time keeps today's *Draft an update with the new day* (on).

**Settings.** One card at the top of Settings › Projects, **What waits for an Owner or an Admin**. It lists the 6 switches together:
- update review + reviewers;
- invoice approval;
- Done approval;
- share approval;
- handover review;
- a link to Finance's PO and expense rules.

The cards they live in today keep their other fields. P3 §6.7 owns the money rules' home; this card only gathers the switches.

**Presses (J9, Benjamin as Dane):** 4 rows × 1–2 presses, **0 tabs to find**.

### 6.8 Pause and resume (J11)

- **The hold dialog** adds ☑ **Tell Aisha on WhatsApp**: a draft with the reason and the resume line ("We're pausing the works — {reason}. We'll pick up around 16 Nov.").
- **Resume** gets the same tick, in its snackbar: *Resume* → "… is running again" · **Tell Aisha**.
- **Escalated and waiting tickets stay in attention during a hold**: add them to `HOLD_KEEPS`. A defect is not paused. This is a rule change and Vicky's call.

Presses unchanged (3 / 1), plus 1 for the message.

### 6.9 Hand over (J12)

**The Hand over sheet** is today's *Complete handover* dialog, with every fix that is one press done **in place**:

| Checklist row | In-place action | Leaves the sheet only for |
|---|---|---|
| Every milestone is done | **Mark {last} done** (opens §6.3, nested) | real work |
| {client} has confirmed the handover stage | **Ask again** / **Remind** | — |
| Nothing is outstanding on money | **Send the Completion invoice** · **Remind** (overdue) | recording a payment |
| No update waits for review | **Approve** (approvers) / *Waiting for …* | — |
| *New:* compliance Handover items done | **Mark done** per item, or *Open Compliance* | — |
| *New:* no ticket waits on the studio | **Open T-…** | the reply |

**Also on the sheet:**
- **Defer** with a reason, as today.
- *Complete anyway* for Owners and Admins.
- The closing summary.
- *Ask for review* for a Designer.
- A new ☑ **Tell {client} it's handed over** (WhatsApp; their page already says "Your home has been handed over").
- **Undo for the snackbar's life.** Today completion has no Undo; Reopen needs an Owner or Admin. This is Vicky's call.

**Presses (J12):** header → in-place fixes (1 each) → Complete = **≈4–6** (today ≈8–12, with tab trips).

### 6.10 The client loop — every studio act, and what reaches the client

Today, as read in the code. ✉ = automatic email (default on) · WA = a WhatsApp draft on the studio's press · 🔔 = the portal bell only.

| Studio act | The client sees on the portal | Told today | Their answer → the studio sees | After |
|---|---|---|---|---|
| Invite | Sign-in page | WA (press) | Opened → "Opened {ago}" | Start sheet tick; one WA |
| Share the schedule | Schedule: the new copy, New / Changed marks, "Updated {d}" card | ✉ + WA offered | — | = same; inside Mark done |
| Ask to confirm a stage (after a done share) | Home need *Confirm that … is done*; Schedule card | 🔔 | Looks good / Something is not right → bell (WA + ✉ for "not right"), attention | = same; a Mark done tick |
| Blocked stage | **Paused** + note, live, no share | — | — | = same; fix the studio preview to say Paused (P2-7) |
| On hold | Paused notice, Home lede | — | — | + Tell tick |
| Update published | Home *Latest update*, Updates, 🔔 | ✉ | Opened → "Seen by" | = same; photos-first on a phone |
| Choice shared | Home need *Choose your …*, Choices | 🔔 | Pick / No / Other options → bell, attention, receipt | + ✉ (new event); auto wait; auto VO draft |
| VO sent | Home need *Approve a change*, `/confirm` link | WA (press) + ✉ | Approve / Ask / Decline → bell, contract moves | = same; *Send VO-n* row after a pick |
| Invoice sent | Home need *payment due*, Money + PayNow QR | WA dialog + ✉ | *I have paid* + proof → *To confirm* | = same; ticks in Start / Mark done / Hand over |
| Payment confirmed | Receipt | ✉ | — | = same |
| Floor plan added | Floor plan (at once) | 🔔 | Marks, comments, *Confirm this layout* → bell | + *Show it now* tick + Tell |
| File shown | Home need *A new file* (7 days) | — | Opened | = same |
| Ticket reply / resolved | Issues | ✉ | Reply / close → bell | = same; + Task / VO actions |
| Message | Messages | — (event off) | Message → bell | ✉ on (Vicky's call) |
| Handover completed / reopened | Home lede "handed over" | — | — | + Tell tick |
| Remind (any waiting item) | — | WA (press), from the *Invite to Portal* drawer | — | Also on Needs you / With {client} rows |

### 6.11 "This week on this project" (J10)

This is not a new page. It is P1's Needs you + Coming up, with two flow additions:

1. **The prompts become rows.** The start / done prompts, the deposit ready, *Send VO-n*, *Share N changes* and the weekly update are Needs you rows read from records. They are not page memory, so they survive a reload and reach a phone.
2. **The weekly update.** When the last published update is 6+ days old (before the 14-day attention reason), Needs you shows *Tell Benjamin about this week* · **Draft it**.
   - It runs today's Maison AI *Draft an update about this week* (deterministic, no credits; `use-project-maison.ts`).
   - The draft is built from the week's done milestones, tasks and Site updates photos.
   - It opens in the composer for review. Nothing is sent without *Post*.

For the Designer at 9am this is the guided checklist: Needs you (what's mine now) → Coming up (what's on site this week) → the site bar (§6.4) to act.

### 6.12 Jobs after the change

| Job | Today | After |
|---|---|---|
| J1 Won → ready to start | ≈15 presses · 8 surfaces · date asked 3× · deposit unprompted | **5** · 3 surfaces · date once · deposit a tick |
| J2 New project | 15 fields flat, lands on the listing, then J1's set-up | 6 + Members up front, More details folded; lands on the project; **4** to start |
| J3 Site photos (390) | 8, photos last, title typed | **5**, photos first, title prefilled |
| J4 Close a stage | ≈16 · 5 surfaces · 3 WA drafts · 2 traps | **3** (phone **2**) · 1 sheet · 1 optional WA · no traps |
| J5 Share changes | 2 *if* the header shows it, else 3+ | **2**, always |
| J6 Choice → VO | ≈22 + remember the wait, the VO, telling the client | ≈15 (set-up unchanged) · after the pick **2** · nothing to remember |
| J7 Price the client's ask | ≈6 + lines, words retyped | **3** + lines, words carried |
| J9 Owner's approvals | 9 kinds, 5 places, listing misses 5 | one *Needs your OK* group; listing counts all |
| J10 This week | 7 signals with different logic | Needs you + Coming up (P1) + the weekly update row |
| J11 Hold | 3, client not told, tickets hidden | 3 + 1 tell; tickets stay |
| J12 Hand over | ≈8–12 with tab trips; no compliance / tickets | **≈4–6** in one sheet; compliance and tickets on the list |
| J13–J15 | — | Unchanged, except J15's *Show it now* + Tell |

**Five most frequent (J1 + J3 + J4 + J5 + J6): ≈63 → ≈30 presses**, counting the set-up of a choice (5 + 5 + 3 + 2 + 15). Counting only what follows the pick: **≈17**.

### 6.13 What becomes automatic

- The milestone's wait **starts** when a choice tied to it is shared (it already ends on the pick).
- A client's priced pick **drafts** its VO. Sending it stays a press.
- The start / done prompts are **rows**, read from records.
- A Done approved by an Owner **runs** the ticks it was asked with.
- The weekly update is **offered** as a draft.
- **Telling the client** is either an automatic email or a tick on the sheet (new events: choice to make, hold / resume, handover — Vicky's call).
- The deposit is **in the Start sheet**, and every ready invoice is a row from its first day (P3 §6.8).
- The header's action is **the top Needs you row** (P1).

### 6.14 House pieces it is built from

- **Sheets:** `Dialog` / `SurfaceHead` / `SurfaceFoot` (sheets ≤767).
- **Inside the Start sheet:** today's `StartProjectDialog`, `SourcePicker` and the Start card's preview (`start-schedule.tsx`).
- **Inside Mark done:** the Done-early dialog's checkbox row, `ShareDialog`'s change list (compact), the composer's `Dropzone`, and the Money send's `RecipientFields` / `MessageField`.
- **Rows and actions:** `Card` + the LEAD STAGES `Row` with its action (Needs you, P1); `PortalMenu` + `DropdownItem` for the message, ticket and mark actions.
- **The phone bar:** the dock frame `.dockFrame` (`MobileChrome`).
- **Feedback and tells:** the snackbar's sentence + Undo; `tellClient` (`lib/portal/client-messages-send.ts`) for the new events.
- **Registries:** `NEED_PRODUCERS`' pattern for the studio rows; `useMaisonAi` for the weekly draft.

### 6.15 Keep exactly as it is

These are good:

- The Won step's auto-picked signed quote and contract.
- The Start card's preselect + "What you will get" preview.
- The Schedule's one-sentence head and its timeline.
- *A move carries what follows* + Undo.
- The Share dialog's diff, partial share and client preview.
- The update composer's subtitle that says where the post goes.
- In-card *Approve* / *Send back* on updates.
- The Choices card's bands (*Waiting for Benjamin*, *Benjamin chose …*).
- Selection receipts.
- The Complete handover checklist built from records, with Defer and the closing summary.
- The hold dialog's presets and its line "{client} reads this on their schedule".
- The HandoverBar.
- The lead handing over to its project (the lead keeps Overview · Quotes · Contracts; shot `1440-ben-lead-page`).
- **The client portal's Home, "4 things need you"** (`portal-390-montage`). It is the model this whole proposal copies for the studio.

### 6.16 Questions for Vicky

These are the rule and scope changes here. Everything else keeps today's rules.

| Q | Question | Changes |
|---|---|---|
| Q1 | **Start sheet** (§6.2): date + schedule + invite + deposit in one press, with one WhatsApp draft carrying the invite and the deposit? | REG-917's flow; the combined WA text is invented copy |
| Q2 | **Mark done sheet** (§6.3): share-as-done, ask to confirm, photos → update, and the stage's invoice as default-on ticks; the ticks ride with a Done that waits for approval? | Today: four separate flows |
| Q3 | A **Done** on each phone schedule row, and the **phone site bar** Photos · Done · Note · Message on project pages? | New phone chrome (on the dock frame) |
| Q4 | **Phone composer**: photos first; title prefilled from the running milestone and the day? | The title stays required, but is filled |
| Q5 | **Automatic**: a shared choice starts its milestone's wait; a client's priced pick drafts its VO? | Today: by hand |
| Q6 | **New client messages**: a choice to make; hold / resume; handover. Studio replies in Messages emailed by default (H-Q18 had them off)? | Settings › Notifications › Messages to clients rows |
| Q7 | Messages and tickets get *Make a task* · *Raise a variation order*, as floor-plan marks have? | — |
| Q8 | One **What waits for an Owner or an Admin** card in Settings › Projects, and *Needs my review* counting every kind? | Settings layout |
| Q9 | **Hand over sheet**: compliance Handover items and tickets on the checklist (deferrable); in-place fixes; a Tell tick; Undo on completion? | Q-24's checklist; completion Undo is new |
| Q10 | Escalated / waiting **tickets stay in attention during a hold**? | `HOLD_KEEPS` |
| Q11 | **Share N changes** as a button on the Schedule toolbar; the line beside it keeps toggling the client pane? | A second door to share |
| Q12 | **Words** (invented, candidates): *Before work starts* · *Mark {stage} done* · *Show it on his schedule as done* · *Tell {client}* · *Needs your OK* · *What waits for an Owner or an Admin* · *{client}'s page* (for the *Invite to Portal* drawer once invited) · *Ask to approve*. | Copy |
| Q13 | Won and New project **open the project** after saving (today: stay, with *View*)? | Landing |
| Q14 | The Won step's split shown **only for an uploaded quote** (it is ignored otherwise)? | Won step (mocked 780:92744 — the mock wins unless he says) |
| Q15 | Fix the studio's client preview to say **Paused** for a Blocked stage, as the portal does? | Bug fix, if he agrees it is one |

---

## Appendix — evidence

**Code traces (read-only), with file:line throughout this file:**
- creation and set-up: `lib/projects/create.ts`, `getting-started.ts`, `next-step.ts`, `components/projects/project-frame.tsx`, `new-project-dialog.tsx`, `client-access-panel.tsx`, `lib/projects/payments.ts:318-371`;
- the Schedule: `components/projects/schedule/*`, `app/projects/schedule-actions.ts`, `lib/projects/schedule*.ts`, `lib/portal/schedule-model.ts`;
- the running project: `components/projects/{updates,choices,floor-plan,tickets,messages,compliance}/*`, `app/projects/*-actions.ts`, `app/portal/*`, `lib/portal/{needs,client-tells,client-messages}.ts`;
- the end: `lib/projects/{hold,handover-model,attention}.ts`, `app/projects/ending-actions.ts`, `components/projects/ending/*`, `app/settings/projects-settings.tsx`, `lib/settings/permissions.ts:204-297`.

**Screenshots** in `scratchpad/simplify/shots/P2/`:

| Group | Shots |
|---|---|
| Every tab, Benjamin and Marcus, 1440 | `1440-ben-*`, `1440-marcus-*` |
| Overviews | `1440-{ryan,aisha,shalini}-overview` |
| Menus | `1440-*-stage-menu`, `1440-ben-project-kebab` |
| Dialogs | `1440-ben-complete-handover`, `-share-dialog`, `-done-early-dialog`, `-update-composer`, `-add-choice`, `-new-ticket`, `-money-new`, `-milestone-panel`, `-client-pane`, `-invite-panel`, `-schedule-kebab` |
| Setting up | `1440-marcus-{start-dialog,set-end,contract,invite,schedule-start,money-top}` |
| Creation | `1440-lead-won-step`, `1440-listing-new-project` |
| Listing, workload, bell, settings | `1440-00-listing`, `1440-listing-workload`, `1440-bell`, `1440-settings-projects` |
| Phone | `390-*` (full pages + `390-montage-a`: first screen · ⋮ sheet · Updates · composer; `390-montage-b`: Schedule · milestone sheet · Money · listing) |
| The portal | `portal-{390,1440}-*` + `portal-390-montage` (Home · Schedule · Updates · Money) |

**Measures:** `scratchpad/simplify/p2/walk1.json` (controls, tabs, chips, money figures, heights per page), and `txt-*.txt` (each dialog's and menu's words).
