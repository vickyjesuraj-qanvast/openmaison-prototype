# Projects — 1.0 → 2.0 audit (2026-10-05)

**Written for:** the owner, to decide before anything is built. It is also the index the 1.0 developers will use once the calls are made.

**The brief** (owner, 2026-10-05): "Now that we have done most of the modules rebuild from 1.0 to 2.0. I want you to do the same for the project from 1.0 to 2.0. Go through the qanvast-id-tool repo in depth for the projects and create a detailed report of all the touchpoints, gaps, layout, interactions, user experience, layouts, animations, user interface, transitions, and any improvements you feel from the 2.0 updated experience." With two screenshots of 1.0 (the listing; a project's Overview) and: "this is the projects I'm talking about and go through all the sub modules it has".

**Nothing here is built.** The 33 questions in §4 wait for the owner's marks. A blank mark means the recommendation stands, as in the earlier audits.

**The report itself** is the Claude Doc **"Projects — 1.0 to 2.0 audit"**: https://claude.ai/code/artifact/8b0dca0c-5d28-4cff-8307-c9bb22d0869b — 23 sections, a module map, and the questions with a *Your call* dropdown and a *Your note* column per row. This file is the repo's record of it: sources, the index, the headline findings, the questions and the rounds. The evidence is in the inventories.

**Different from the earlier audits:** the owner asked for 1.0's layout, interactions, UX, UI, animations and transitions too, so the inventories record them (earlier audits recorded features, logic and data only). The ground rule still holds for the build: 2.0's design system and motion, not 1.0's screens.

---

## 1. Sources

- **1.0:** `qanvast-id-tool`, working tree, branch `integ/security-non-qanvast` @ `620190192` (2026-10-01) — the tree the owner's :3001 runs; it matches both screenshots. Read from code and docs. **Not run and not browsed**: the live walk needs a sign-in to the staging studio and waits for the owner's go-ahead (Q-32).
- **Other 1.0 branches** differ little for Projects (`origin/deployment/plg` 11 files, `origin/deployment/qanvast` 31 files, `origin/feat/om-ui-port` 7 files against this tree — mostly the Visualizer; `deployment/qanvast` adds a health strip, a Gantt minimap and a create-update dialog). One difference matters: **this branch charges no AI credits** (H-250, F-264), while audit 19 read a branch that does.
- **2.0:** `openmaison-prototype` `main` @ `8df73fd`.
- **Inventories:** `projects-1.0-inventory/A…L` (see its README). Cited by row id (A-121, E-243 …). Rows a reader worked out instead of reading are marked **[inferred]** there and "inferred" in the report.
- **Spot-checked against the code by the synthesis:** the listing's health call (empty invoice list; escalations carry no project id), the three role-checked routes (archive · unarchive · delete, of 64 route files under `api/projects*`), the tab-enter animation (`tabFadeIn` 0.25s, keyed by tab), the Draft → Active effect on page view.
- **Not settled by reading:** whether the client approves a variation order (the portal shows Approve / Reject on "Pending your approval", I-293; the Finance reader found an Owner's or Admin's approval final, G bottom line); the items marked inferred, among them *Preview as Homeowner fails without a real client session*, *a timeline with no payment milestones cannot be first-published*, the effective radii and dialog widths (K-64, K-296).

## 2. The report's sections

Summary · How this audit ran · Definitions (25 terms) · Module map and touchpoints (a diagram + 16 touchpoints) · Projects listing · How a project starts · Project detail: the header and Overview · Management: milestones, the Gantt and tasks · Finance tab · Files & Docs · Progress updates, meetings and activity · Design tools (Photo Renders, the 3D planner, selections, the floor plan) · The homeowner's side · Ending a project · Motion, loading and feedback · Phone and tablet · Roles and rules · Data model · Gaps (the matrix, 55 rows) · What 2.0 should not carry over (12 habits) · Recommendations for 2.0 · Questions for you (33) · Proposed build rounds.

Each surface section follows one shape: what 1.0 shows (layout and UI, copy verbatim) → interactions → motion → faults (with row ids) → *In 2.0* (what exists today, what is recommended).

## 3. Headline findings

**What 1.0's Projects is.** A listing (four owner-only tiles, stage chips, one table, a workload view, an archived list) and one 5,130-line detail page: a sticky header with four actions and five tabs — Overview · Management (Milestones · Tasks · Materials · Floor Plan) · Finance (Overview · Contract/VO · Invoices · POs · Expenses · Bills · Receipts) · Files & Docs · Activity — plus a client portal page and four tools opened from it.

**Worth keeping.** The lifecycle (signed lead → set up → running → handed over with a review); milestones that carry the schedule and the payment shares, published to the client as a snapshot; progress updates with a review step; the client's confirmations, selections and plan mark-up; the money model (contract value = signed quote + approved client VOs; one invoice per payment milestone; a rebalance that re-sizes unsent drafts and never moves agreed shares).

**What is wrong with it.**
- Rules live on the screen: only archive, unarchive and delete refuse by role on the server; the Designer filter, the handover lock, the frozen schedule, the publish gate and closure approval are browser-only (J-151…J-164, E-315, D-304).
- The listing contradicts itself: "Active" has three meanings (the owner's screenshot: "Active Projects 32" beside "Active 21"); stage and status are two vocabularies; list health can only range about 60–90 so "At Risk" stays 0; the Progress column is a stored number nothing updates (A-121…A-128).
- The detail header shows no state; the red banner is the newest critical issue, not the worst (screenshot: "overdue by 20 days" while another milestone is 108 days overdue) (C-85, C-212).
- Draft → Active dead-ends on screen and fires by itself on a page view; the create drawer's document boxes upload nothing; "Add quote" is a mock page (B-151, B-314, C-40, C-151).
- The timeline is one JSON array saved whole, last write wins; no zoom, no keyboard, no undo; regenerate replaces every milestone id behind a native confirm (E bottom line).
- Updates: videos and documents are never uploaded, a rejected or unpublished update is a dead end, no edit (D-101…D-109). Activity is derived, rewrites itself and names placeholder actors (D-217…D-229).
- Files & Docs is a flat list: custom folders are not saved, loading and failure read as empty, Approve / Reject is unreachable (H-113…H-121).
- The client's side: Invite is not a gate and cannot be withdrawn; switches are studio-wide and browser-only; security gaps on the old pay link and the single-invoice endpoint (I bottom line).
- Close · Archive · Delete overlap in words; no reopen; the closure's server route takes any member (D-304…D-348).
- Below 1024px it is a thinner product (no Gantt, no publish, hover-only menus). Motion is light and uneven; 362 toasts with no Undo, four loaders, six browser confirm boxes (K bottom line).

**Where 2.0 stands.** No Projects route, table or mock; the rail, dock and Settings items are inert. The Won step collects the signed quote, contract, payment split and project type and creates nothing (L-13…L-24). Tasks, Files, Notes, Questionnaire, Activity, the Visualizer and the client's render link are already ahead of 1.0's project versions. Earlier audits deferred 48 items to Projects / Finance / the portal / Dashboard / Meetings (L-38…L-85).

**Recommended.** One client record in two chapters — Won creates the project, which carries the lead's tasks, files and activity on. Stage words "Setting up · In progress · Completed". Milestones as records with rules on the server, drawn as a list first and a timeline second. Updates with real uploads and a visible Sent back state. One client link per project (no login), in the family of the signing link. One ending ("Complete handover", Reopen), soft delete. Finance, the portal, floor-plan mark-up, the 3D planner, Meetings and the Dashboard are separate modules.

## 4. Questions for the owner

The live marks are in the doc. Recommendation in brief:

| # | Question | Recommended |
|---|---|---|
| Q-01 | A project is its own page, with the lead's Tasks, Files and Activity carried on? | Yes — one client record in two chapters; links back to the lead's quotes, contracts, notes, questionnaire |
| Q-02 | Won creates the project at once, no second form? | Yes — a "Getting started" card replaces 1.0's create drawer and Draft wizard |
| Q-03 | Stage words | "Setting up" · "In progress" · "Completed" (1.0's Draft · Active · Closed); the separate status is dropped |
| Q-04 | A project with no lead ("+ New Project") | Hold — every project starts from a Won lead |
| Q-05 | Name and number | Name defaults to "{property type} — {client}", editable at any stage; number by a Settings pattern, as quotes |
| Q-06 | Listing tiles | In progress · Needs attention · Waiting on client · Completing this month; total contract value for Owner and Admin |
| Q-07 | Health score | Don't port; show reasons ("2 milestones overdue") |
| Q-08 | Workload view | Later, with Insights |
| Q-09 | List first, timeline second | Yes; the timeline needs the owner's mock |
| Q-10 | Timeline depth | Dependencies + cascade preview yes; critical path and baseline no |
| Q-11 | Working days | Calendar days, weekends shaded, no holiday calendar |
| Q-12 | Schedule templates | One library under Company › Templates; from the quote's sections yes; AI-written timelines hold |
| Q-13 | Payment shares | The quote's Payment Schedule stays the source; a milestone can be tied to a stage; no invoices until Finance |
| Q-14 | A client link per project, no login | Yes, now; the full portal later as its own module |
| Q-15 | Explicit publish with a list of what changes | Yes |
| Q-16 | The client confirms a completed milestone | Yes, on the link, only when the studio asks |
| Q-17 | Review of updates | As 1.0: on by default, an owner's post publishes at once; a switch in Settings › Projects |
| Q-18 | Selections | Build, after the schedule and updates |
| Q-19 | Floor-plan mark-up and the 3D planner | Later; own modules, own audits |
| Q-20 | Who sees money | Contract value: the project's team. Cost, profit, commission: Owner and Admin |
| Q-21 | Commission splits on the team | Hold for Finance |
| Q-22 | Finance in the first build | Contract value and the agreed schedule only; Finance is the next audit |
| Q-23 | Who sees a project | Whoever may see its lead, plus the project's team |
| Q-24 | Ending | One: "Complete handover" with a checklist, an owner's review as a setting, "Reopen" |
| Q-25 | Archive for projects | No — Completed is the resting state; the listing hides completed until asked |
| Q-26 | Delete | Owner and Admin; soft, with a Deleted projects sheet and Restore |
| Q-27 | Deleting a lead that has a project | Refuse: "This lead has a project. Delete the project first." |
| Q-28 | "G P" already opens the Price book | Projects takes "G P"; the Price book moves to "G B" |
| Q-29 | Task reminders stop once a lead is Won | Carry on for a project's tasks |
| Q-30 | AI credits | No metered press in the first build |
| Q-31 | Meeting Summary card, compliance tasks | Hold both |
| Q-32 | A live walk of 1.0 on :3001 (sign-in to staging) for screenshots | Yes, with the owner's go-ahead |
| Q-33 | Which mocks first | Listing · Overview · Schedule (list and timeline) · Updates · the client link |

## 5. Rounds (after the marks and the first mocks)

1. **The record** — the `projects` table, Won creates the project, the listing, the project page's frame and Overview with Tasks / Files / Activity carried on; search, the rail, ghosts; the three Won leads (Benjamin Han · Ryan D'Souza · Aisha Rahman) as demo projects.
2. **Schedule** — milestones as records (`project_milestones`, 1.0's field names): list, statuses, templates, then the timeline view; reminders from dates.
3. **Updates and the client link** — composer, review, publish with its list of changes, the client page, the client's confirmation.
4. **Ending and rules** — Complete handover, Reopen, Delete and Restore, Settings › Projects, the *Who may do what* rows, an event for every action.
5. **Selections.**
6. **The developers' map and the UAT chapter.**

Then separate audits: Finance (its money model is already read — G §7), the client portal, floor-plan mark-up, the 3D planner, Meetings, the Dashboard.

Next free numbers at the time of writing: REG-908, repair R68, migration 0058.

## 6. Answers

**The owner's marks, 2026-10-05** (doc rev 156; REG-908). Thirty of the 33 stand **As recommended** (Q-32 among them — the live walk reads as a yes; confirm before signing in). Three changed:

| # | Her call | Her note | What it changes |
|---|---|---|---|
| Q-04 | Build it | "No, it can exist on it's own. Because Studios might get direct projects as well." | "New project" on the listing creates a project with no lead: client · property · project type · agreed value. Its schedule, tasks, files and updates belong to the project. Round 1 grows by this form. For the developers: the client's details can sit in the same record a lead uses, kept out of the Leads pipeline (1.0's "parked lead"), so quotes and contracts work unchanged |
| Q-09 | Build it | "Can you please propose the best intuitive and zero cognitive load designs and show it to me?" | Proposal drawn — the design canvas **Project Schedule Proposal**, https://claude.ai/artifact/HWVxPf2YRU4MQvzvQe3eH9 (seven boards: Everyday · After a move · Sharing with the client · On a phone · Starting a schedule · One milestone · How deep it can go). One list that is also the timeline; a move carries what follows, says so in one sentence, offers Undo; one filled button that follows the moment. **Awaiting her mark-up** — nothing of the schedule is built before it |
| Q-10 | Build it | "It can go to any depth. Please need your ideation here." | Board 7: ten layers, each appearing only when used — 1 dates · 2 what it moves with · 3 work inside (tasks) · 4 money (from the quote) · 5 waiting on someone · 6 the client (shared, confirmed) · 7 plan against actual · 8 what decides handover · 9 who is on site · 10 every project together. Layers 1–8 proposed for the schedule round, 9–10 later |

**Finance** (owner, same message: "If you think we need finance also to be build while we are building this. Then let's plan for that as well. Give me what are the dependencies on projects."). Answer, written into the doc as *Finance alongside Projects*: **yes for "money in"** — contract value with variation orders, invoices from payment milestones, the rebalance, payments · receipts · verification, overdue, the client's invoice view — because a payment milestone, the handover checklist, "needs attention", the delete rule and the client link are all half-built without it; **"money out and the books"** (purchase orders, bills, expenses, vendors, cost · profit · margin, commission, reports, accounting links) is a module of its own afterwards. Finance needs the project record (round 1), payment milestones (round 2) and the client link (round 3) first. Three calls added, preset As recommended: **Q-34** build "money in" inside the Projects programme · **Q-35** "money out and the books" later · **Q-36** a short Finance audit (about twenty calls) run while rounds 1–3 are built.

**The joint order** (replaces §5): 1 the record (+ "New project" with no lead) · 2 schedule (as the proposal, once marked up; payment shares on milestones from the start) · 3 updates and the client link (a place kept for money) · 4 money in, part one (contract value + VOs, invoices from milestones, the rebalance) · 5 money in, part two (payments, receipts, verification, overdue, invoices on the client link) · 6 ending and rules (the checklist and the delete rule read money) · 7 selections (a price difference drafts a VO) · 8 the developers' map and the UAT chapter, for both. Then: Finance's second half, the portal, floor-plan mark-up, the 3D planner, Meetings, the Dashboard.

**Later the same day (doc rev 158; REG-909).** The owner: "I'm fine with your proposals and also, i feel we need homeowner portal related things to be built as well. Can you please take a loot at it and propose again." So: the schedule proposal is **accepted** (no mark-up), **Q-34 · Q-35 · Q-36 stand As recommended** (money in inside the programme; money out and the books later; a short Finance audit alongside rounds 1–3), and **Q-14 changes** — the single client link becomes **the client portal**.

**The portal proposal** — design canvas **Client Portal Proposal**, https://claude.ai/artifact/CjJ1PknxFKrk1deXrBAdbr (eight boards: 1 What needs you · 2 Schedule, and confirming a stage · 3 Updates · 4 Money · 5 Signing in · 6 Before work starts · 7 On a desktop · 8 The studio's side: client access), and the doc's section *The client portal*. In brief: one signed-in home (phone number + a one-time code; only numbers the studio added) that gathers today's four client links (confirm a quote · sign · renders · a shared file — they keep working without sign-in) and everything a project adds; the first thing the client reads is what needs them; it wears the studio's brand kit on 2.0's type and layout — one layout, no themes; nothing appears until the studio shares it. Studio side: a *Client access* panel (who can open it, invited / opened / last opened, add someone from the household, send the link on WhatsApp, *See it as the client*, what the client can see, what is waiting on them, withdraw access). **Taken from 1.0:** sign-in, home, lead-stage steps, timeline + confirm a stage, updates, money (invoices · PayNow · proof · receipts), VO approval, selections, documents, render feedback, family members, the bell. **Not taken:** the five layouts · six login layouts · twelve themes, the fifteen studio-wide switches, online card payment. **Later:** floor-plan mark-up, support tickets and chat, About / Team pages. **Fixes over 1.0:** invite is a real state and can be withdrawn (I-23, I-41), the preview needs no client login (I-73), the client is told outside the portal too (I-114), an answered stage stays visible (I-263), rules on the server (I-240, E-245). Eight calls added, preset As recommended: **Q-37** the portal replaces Q-14's link, in two parts · **Q-38** phone + one-time code (the prototype shows the step; any six digits pass) · **Q-39** the studio's brand kit, one layout · **Q-40** today's links keep working without sign-in · **Q-41** told by a WhatsApp message the studio sends in one press + the portal's bell; automatic SMS / email later · **Q-42** someone else from the household, part two · **Q-43** questions start with "Message your designer on WhatsApp"; tickets and chat later · **Q-44** settings under Company beside the brand kit: the address and a welcome line, no feature switches at first.

**The order now (ten rounds):** 1 the record · 2 schedule · 3 updates · 4 the portal, part one (sign-in, home, the steps before work starts, Schedule + confirming a stage, Updates, Files; Client access + See it as the client) · 5 money in, part one · 6 money in, part two (+ the portal's Money tab) · 7 ending and rules · 8 selections (+ the client's choices) · 9 the portal, part two (household, bell and reminders, settings) · 10 the developers' map and the UAT chapter for all three. Later modules: Finance's second half, floor-plan mark-up, the 3D planner, Meetings, the Dashboard, tickets and chat.

### The portal's set-up side (the owner's fourth message, 2026-10-05; REG-910; doc rev 177)

The owner: "Wait, did you go through the home ower portal setups flows and features and functionalities in admin side 1.0?" — **only partly.** Inventory I had opened the hub's Features · Branding · Layout · Voice and none of Profile · Scope · Team · About Us, the Accounts page's portal parts, the platform admin or first-time setup. A thirteenth reader covered all of it: `projects-1.0-inventory/M-portal-setup-admin-side.md` (M-001…310).

**What M found (the rows that changed the proposal):** a new studio has no portal address until its owner types one, and nothing in first-time setup asks for it (M-272…277); about 70 settings in the hub and a dozen more on five other screens, with three ways of saving (M-270); fifteen switches — four dead, none enforced on the server, three default tables; about a third of Branding (card style, corners, density, header / footer text, watermark) never reaches the project page; the live preview is truthful for Branding · Layout · Profile · About only (M-142, M-221); scope questions reach the client on the lead-stage page only, *Required* is not enforced, a question cannot be edited (M-165, M-183); *Portal Enabled* is half a pause; the hub has two doors (Tools = owners; Accounts = admins, designers, accounting) and the save route checks only the session (M-001, M-008); bank details live in three stores and the pay card reads one (M-267, M-268); the public pre-login route returns drafts, hidden team members and registration details (M-211, M-245); Project Links shows no state for anyone (M-233); the platform's per-studio switch hides the set-up, not the portal, and admin sees two counts (M-287, M-292, M-293); autosave can lose work four ways (M-067…071, inferred); white-label slips (M-118).

**The proposal, revised** (the doc's *The client portal* › *The studio's side in 1.0* and *What 2.0's set-up should be*; canvas **board 9 · The studio's side: setting up the portal**): one page, **Company › Client portal** — an address made from the studio's name when the studio is created (a change keeps the old address working); the look from the brand kit; bank and PayNow from the issuing entity in Company › Profile (one store, the one invoices print); **Live / Paused** enforced on every client page and request; a *Getting it live* checklist (address · logo and colour · how clients pay · try it yourself); **Open as a test client** — the real pages on a real project, read-only, nothing recorded as the client's; a **Clients** tab (everyone with access, invited or not, last opened; Invite · Resend · Withdraw — the same record as each project's *Client access* panel); six section switches enforced on the server (Schedule · Updates · Money · Files · Designs · Choices); one welcome line. Owners and Admins change it, checked on the server. Not taken: themes, layouts, login layouts, fine-tuning, greeting tone, tab renaming. Later, reading Company › Profile and Members: About and Team. Scope questions stay Company › Questionnaire. For the developers' map only: a platform switch that really closes a studio's portal, and usage counts.

**Calls:** **Q-44 rewritten** (the Company page as above, where it had said "the address and a welcome line, no feature switches at first"). Six added, preset As recommended: **Q-45** six section switches, all on, server-enforced, in part two (1.0's fifteen map onto them) · **Q-46** the Clients tab · **Q-47** About / Team later, from Company › Profile and Members · **Q-48** when a client says they have paid: 1.0's two rules and their defaults (the project's designer is told and confirms; proof never marks an invoice paid by itself), with money in part two · **Q-49** Owners and Admins change the set-up · **Q-50** a pause covers the signed-in home; today's four links keep working.

**Rounds:** still ten. *The portal, part one* now also carries the Company › Client portal page's basics (address, Live / Paused, the checklist, Open as a test client, the Clients tab); *part two* keeps the household, the bell and reminders, the section switches and the welcome line.

**Corrections to inventory I** (M §19): I-378 partly wrong (the "isn't enabled for your studio" message is never shown); I-419 partly wrong (the hub is in `/accounts` as well, and the Tools page is owner-guarded — the open door is the Accounts mount and the API); I-393 replaced by M §8…§11; I-395 and I-407 imprecise.
