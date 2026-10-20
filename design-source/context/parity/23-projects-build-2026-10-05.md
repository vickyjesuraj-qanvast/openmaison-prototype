# Projects, money in and the client portal — the build (2026-10-05)

**The instruction** (owner, 2026-10-05, after REG-910): "okay build all of it with your recommendations."

So every open call in the audit (`22-projects-1.0-to-2.0-audit-2026-10-05.md`, the report doc
https://claude.ai/code/artifact/8b0dca0c-5d28-4cff-8307-c9bb22d0869b) is built **As recommended — set on the owner's
instruction of 2026-10-05**, with his three marks (Q-04 a project may exist with no lead · Q-09 / Q-10 the schedule
proposal) and his later acceptances (the schedule proposal as drawn, Q-34…Q-36, the client portal, the set-up side).
The owner can override any row. Every round is logged in `design-source/REGISTER.md` as user-directed; copy that no mock
carries is flagged *invented copy* there.

**What stands in for the mocks:** no Projects mock exists in Figma. The two design canvases are the drawing:
- **Project Schedule Proposal** https://claude.ai/artifact/HWVxPf2YRU4MQvzvQe3eH9 — source in the session scratchpad
  `schedule-canvas/project/*.dc.html` (Main = everyday · Moved = after a move · Share = sharing with the client ·
  Phone · Start = starting a schedule · Milestone = one milestone · Depth = the ten layers).
- **Client Portal Proposal** https://claude.ai/artifact/CjJ1PknxFKrk1deXrBAdbr — source `portal-canvas/project/*.dc.html`
  (Main = what needs you · Schedule · Updates · Money · SignIn · Before = before work starts · Desktop · Access = the
  studio's client-access panel · Setup = Company › Client portal).
- Everything else (listing, project page, Overview, Updates tab, Money tab, Selections, ending) is built **on the house
  pieces**, as the owner's rule for unmocked surfaces says ([[house-pieces-for-new-surfaces]]): the Leads listing's table
  model, the lead page's L2 header + tabs + cards + info column, `Chips`, `StatTile`, the event table, `LibraryGallery`,
  `Dialog` / `ConfirmDialog` / `Drawer` with `SurfaceHead` / `SurfaceFoot`, `PortalMenu` + `DropdownItem`, `EmptyState`,
  the ghost kit. 2.0's design system and motion — never 1.0's screens.

The report's full text (all 23 sections + answers + Finance + portal) is extracted to the session scratchpad as
`projects-report.md`. The 1.0 evidence is `projects-1.0-inventory/A…M`.

---

## 1. The calls, as built

| # | Built as |
|---|---|
| Q-01 | A project is its own page; the lead's Tasks, Files and Activity carry on (the same records); the page links back to the lead's quotes, contracts, notes, questionnaire |
| Q-02 | Won creates the project in the same press; a *Getting started* card names what is missing, each with its own button |
| Q-03 | Stages **Setting up · In progress · Completed** (1.0 Draft · Active · Closed); no second status |
| Q-04 | **New project** on the listing makes a project with no lead: client · phone · property · project type · agreed value (+ payment split). The client's details sit in a lead row marked `direct` and kept out of the Leads pipeline, so quotes, contracts, tasks and files work unchanged |
| Q-05 | Name defaults to "{property type} — {client}", editable at any stage; number by a Settings › Projects pattern (default `P-{YYYY}-{seq}`) |
| Q-06 | Tiles: In progress · Needs attention · Waiting on client · Completing this month; total contract value for Owner and Admin |
| Q-07 | No health score; the reasons ("2 milestones overdue", "Client has not answered for 5 days", "No update for 14 days", "Payment overdue") |
| Q-08 | Workload view later, with Insights |
| Q-09 · Q-10 | The schedule as the proposal draws it: one list that is also the timeline; a move carries what follows, says so in one sentence, offers Undo; Share changes; layers 1–8 of the depth ladder (dates · moves with · tasks inside · money · waiting on someone · the client · plan vs actual · what decides handover) |
| Q-11 | Calendar days, weekends shaded, no holiday calendar |
| Q-12 | Schedules library under Company › Templates › Schedules; start from the quote's sections; AI-written timelines held |
| Q-13 | The quote's Payment Schedule is the source of the shares; a payment stage is tied to a milestone |
| Q-14 · Q-37 | The client portal replaces the single client link, in two parts |
| Q-15 | Share changes with the list of what changes; nothing reaches the client without it |
| Q-16 | The client confirms a completed milestone in the portal, only when the studio asks |
| Q-17 | Update review on by default; an Owner's or Admin's post publishes at once; a switch in Settings › Projects |
| Q-18 | Selections built (round 8); a price difference drafts a variation order |
| Q-19 | Floor-plan mark-up and the 3D planner later, own modules |
| Q-20 | Contract value and invoices: the project's team. Cost, profit, commission: none in this build (Owner and Admin when they come) |
| Q-21 | Commission held for money out |
| Q-22 | Superseded by Q-34: money in is built |
| Q-23 | Who sees a project = whoever may see its lead (Who sees leads) + the lead's members |
| Q-24 | One ending, **Complete handover** with a checklist; an owner's review as a setting; **Reopen** |
| Q-25 | No Archive; the listing hides Completed until asked |
| Q-26 | Delete: Owner and Admin, soft, Deleted projects sheet with Restore |
| Q-27 | Deleting a lead with a project refuses: "This lead has a project. Delete the project first." |
| Q-28 | **G P** = Projects; the Price book moves to **G B** |
| Q-29 | Task reminders carry on for a project's tasks |
| Q-30 | No metered press in Projects |
| Q-31 | Meeting Summary and compliance held |
| Q-32 | Not needed for the build (built from the code reading); still ask before signing in to 1.0 |
| Q-33 | Superseded by the instruction: built on the canvases and the house pieces |
| Q-34 · Q-35 · Q-36 | Money in built (rounds 5–6); money out and the books later; the short Finance audit's calls are F-01…F-20 below |
| Q-38 | Phone number + a one-time code; only numbers the studio added; in the prototype the code step shows and any six digits pass |
| Q-39 | The studio's brand kit (logo, colour) on 2.0's type and one layout |
| Q-40 · Q-50 | Today's four links (confirm a quote · sign · renders · a shared file) keep working without sign-in, and a pause does not stop them |
| Q-41 | A WhatsApp message the studio sends in one press + the portal's bell; automatic SMS / email later |
| Q-42 | Someone else from the household (part two) |
| Q-43 | "Message your designer on WhatsApp"; tickets and chat later |
| Q-44 | **Company › Client portal**: an address made from the studio's name (an old address keeps working after a change), Live / Paused enforced on every client page and request, a *Getting it live* checklist, *Open as a test client*, a Clients tab, a welcome line; the look from the brand kit; bank and PayNow from the issuing entity |
| Q-45 | Six section switches (Schedule · Updates · Money · Files · Designs · Choices), all on, enforced on the server (part two) |
| Q-46 | The Clients tab: everyone with access, invited or not, last opened; Invite · Resend · Withdraw |
| Q-47 | About / Team later, from Company › Profile and Members |
| Q-48 | When a client says they have paid: the project's designer is told and confirms (setting: Assigned designer · Studio owner · a member); proof never marks an invoice paid by itself (setting off) |
| Q-49 | Owners and Admins change the portal's set-up; checked on the server |

**Motion** (the report's *Motion, proposed*): ghost then reveal; tabs do not animate; a dragged milestone bar follows the
pointer and settles on the house spring; progress eases to its value once on arrival; a new update / milestone / file
is brought into view and pulses once. All yes.

### The short Finance audit's calls (Q-36), as recommended

| # | Call | Built as |
|---|---|---|
| F-01 | Where money lives | The project's **Money** tab. No Finance rail item until money out |
| F-02 | Contract value | The signed quote's total (else the Won quote's total, else a direct project's agreed value) + approved variation orders. Totals include GST as quotes do |
| F-03 | The payment schedule | The signed quote's Payment Schedule rows (a direct project: a payment-split template picked at New project). Each stage bills its share of the contract value; GST split out of the slice, never added on top |
| F-04 | Invoices | One per payment stage, made as **Draft** with the project. Statuses Draft · Sent · Part paid · Paid · Void; Overdue is worked out (Sent and past due). A stage tied to a milestone is *Ready to send* when that milestone is Done |
| F-05 | Who sends an invoice | The project's team prepares; when Settings › Projects › *Invoices need approval* is on (default on) a Designer submits and an Owner or Admin sends; theirs goes at once — the quotes' approval pattern |
| F-06 | Variation orders | A quote in variation mode on the project (the 2.0 quote editor, `kind = 'variation'`), numbered VO-1, VO-2… per project; additions and omissions (negative lines) |
| F-07 | Does the client approve a VO | **Yes** — sent through the existing confirmation link (Send for confirmation → `/confirm/[quoteId]`), or *Mark as approved by the client* for an approval given offline. Approval moves the contract value and rebalances the drafts. (Settles the readers' disagreement on the side of the client's consent) |
| F-08 | Rebalance | Re-sizes unsent drafts by their shares; Sent and Paid never change; agreed shares never move; shown as one sentence with Undo |
| F-09 | Over-bill and variance | An invoice edited more than S$1 off its expected amount says "Differs from the schedule by S$x" and needs a reason. No credit notes in this build: an omission bigger than the drafts can absorb shows as "S$x to credit" on Money |
| F-10 | Recording a payment | The studio records amount · date · method (bank transfer · PayNow · cheque · cash) · reference · proof; the client can send proof from the portal → *Payment to confirm* |
| F-11 | Verification | A payment the studio records is confirmed on entry; a client's proof waits for the confirmer of Q-48 |
| F-12 | Receipts | Every confirmed payment gets a numbered receipt, a printable page on the issuing entity's letterhead (the quote preview's frame); the client sees it in the portal |
| F-13 | Numbering | Invoices `INV-{YYYY}-{seq}`, receipts `RCT-{YYYY}-{seq}`, patterns in Settings › Projects (the quotes' `Numbering` model) |
| F-14 | Due dates and reminders | Due = sent + payment terms (Settings, default 7 days); overdue raises a bell row for the team and *Remind on WhatsApp* drafts the client's message in one press |
| F-15 | How the client pays | The issuing entity's bank details and PayNow (QR with the amount when a PayNow ID exists); no card payments |
| F-16 | An Accounting role | Held; Owners and Admins run money |
| F-17 | Who sees money | Contract value, invoices, payments: the project's team + Owner / Admin |
| F-18 | Void and reverse | Owner or Admin voids a sent invoice (reason; a fresh draft takes its share) and reverses a payment (reason; its receipt reads Reversed) |
| F-19 | A studio-wide money list | Not yet (with money out). The listing shows Contract value and Collected for Owner / Admin, and "Payment overdue" as a needs-attention reason |
| F-20 | Direct projects | Contract value = the agreed value; schedule from the payment-split template chosen at New project |

---

## 2. The shape every round builds on (the shared contract)

**Routes.** `/projects` (listing, in the shell) · `/projects/[id]` (Overview) · `/projects/[id]/[tab]` for the other tabs
· the client portal under `/my/[slug]` (part one decides its inner routes). Route groups and ghosts as REG-708: each page's
`loading.tsx` and its `PageReveal` draw the same ghost.

**Tabs on a project** (one list, `lib/projects/tabs.ts`, each round adds its own entry when it lands): Overview ·
Schedule · Updates · Money · Choices (selections) · Tasks · Files · Activity. A tab not yet built is not shown.

**One record, two chapters.** A project row always points at a lead (`projects.lead_id`, not null, unique). A Won lead's
project points at that lead; **New project** makes a lead row with `leads.direct = 1` — kept out of the Leads listing,
kanban, counts, insights, Leads search and the Tasks hub's Lead filter, and `/leads/[id]` for it redirects to its project.
Tasks, Files and Activity on the project are the lead's own components, given the lead id and a base path for their
links. The project's team = the lead's members (`lead_assignees`).

**Who sees** = `canOpenLead` / `visibleLeadIds` of the project's lead. Every project read and action checks it on the
server. A refusal answers `{ error: <the rule> }`.

**Events.** Every project action writes a `lead_events` row (kinds prefixed `project_`, plus `project_id`), so the lead's
Activity carries the project on; add the Activity branch with each new record type (`lib/leads/activity.ts`).

**Numbers.** Migration files are generated per round; the next free migration is **0058**. Repair rules from **R68**.
Register rows from **REG-911**. The demo's projects: the three Won leads (Benjamin Han · Ryan D'Souza · Aisha Rahman)
and one direct project, each with the records its state needs (REG-343: no state without its trail).

**Rules for every builder** (CLAUDE.md › How we work applies — the owner's own rules):
- Never write to `local.db`. Every build and probe runs on a scratch copy: `DATABASE_URL=file:<scratch>/test.db` **on the
  same command** as `next start` and every script. The orchestrator applies migrations and repairs to `local.db` at
  integration, after a backup.
- Never touch :3000 (the owner's dev server) or :3001 (1.0). Stop your own server by its port only.
- Do not commit. Do not edit `CLAUDE.md`, the memory directory or the report doc; the orchestrator does.
- Reuse `components/om/*` and the house pieces; never hand-roll a dialog head / foot / close, table head or menu row;
  `--om-*` tokens only; every icon name must be in `public/fonts/ICONS.txt` (else re-subset as CLAUDE.md says).
- Every press answers; every removal offers Undo; an optimistic write puts the value back when the server refuses and
  the snackbar names what failed; a dialog closes only once its save lands; long strings (pictures, rich text) go to a
  server action inside one object argument.
- Phone and tablet: the same product at ≤767 (menus / panels / form dialogs as bottom sheets, cards for tables).
- Before handing back: `npx tsc --noEmit -p .`, `npx eslint app components lib`, `npm run design:lint` (never raise its
  baseline), a probe `design-source/verify/projects/verify-pj-<round>.cjs` against a production build at 1440×1024 and
  390×844, the meaningful shots banked under `design-source/verify/projects/<round>/`, REG rows written, this file's §4
  progress line updated.

---

## 3. Rounds and packages

| Round | Package | Wave | Repair | Port | Owns |
|---|---|---|---|---|---|
| 1 | The record (+ New project) | 1 | R68 | 3011 | `projects` table, Won → project, `/projects` listing, the project page frame + Overview + Getting started, Tasks / Files / Activity on the project, rail + dock + search + keys + ghosts, Settings › Projects (live tab: numbering), demo projects |
| 2 | Schedule | 2 | R69 | 3021 | `project_milestones` (+ dependencies), the Schedule tab as the canvas draws it, templates (Company › Templates › Schedules), payment stages tied to milestones, reminders from dates, Share changes (what the client will see) |
| 3 | Updates | 2 | R70 | 3022 | `project_updates` (+ media), the Updates tab: composer with real uploads, Draft · In review · Published · Sent back, Resubmit, edit, withdraw; review rule |
| 4a | The portal, part one: the frame | 2 | R71 | 3023 | sign-in (phone + code), the portal home and its frame (brand kit, desktop + phone), Before work starts (today's links gathered), Files, the studio's Client access panel + See it as the client, Company › Client portal (address, Live / Paused, checklist, Open as a test client, Clients tab) |
| 4b | The portal, part one: the project | 3 | R73 | 3022 | the portal's Schedule (+ confirming a stage) and Updates, what needs you from them |
| 5 | Money in, part one | 3 | R72 | 3021 | contract value, variation orders (quote variation mode + client approval), invoices from payment stages, the rebalance, the Money tab |
| 8 | Selections | 3 | R74 | 3023 | selections + options, the Choices tab, the client's picks in the portal, the price difference |
| 6 | Money in, part two | 4 | R75 | 3021 | payments, verification, receipts, overdue + reminders, the portal's Money tab, a pick's VO draft |
| 7 | Ending and rules | 4 | R76 | 3022 | Complete handover + checklist + owner's review, Reopen, Delete / Restore + Deleted projects, Settings › Projects in full, *Who may do what* rows, the lead-delete refusal, events for every action |
| 9 | The portal, part two | 4 | R77 | 3023 | household, the client's bell and reminders, the six section switches, the welcome line |
| 10 | The developers' map + UAT | 5 | — | — | `24-projects-migration-map-2026-10-05.md`, UAT chapters, the consistency walk, full regression, baseline |

Wave 1 runs in the main tree. Waves 2–4 run as parallel worktree packages that start from the integrated state; each
writes its register rows to `design-source/context/parity/projects-build/reg-<round>.md` (numbered at integration) and
leaves migrations to be regenerated once per wave.

---

## 4. Progress

- 2026-10-05 — the build record written; wave 1 (round 1) started.
- 2026-10-05 — **round 1 built** (REG-911…932): migration `0058_projects.sql`, repair R68, the listing, the project page and its
  Overview, Tasks / Files / Activity carried on, New project, Won → project, rail · dock · search · keys · ghosts · Settings › Projects.
  Probe `design-source/verify/projects/verify-pj-r1.cjs` 83/83 (1440 + 390 touch + the loaders), shots `design-source/verify/projects/r1/`.
  `local.db` still needs R68 (the owner's `npm run dev` applied 0058 by its predev); see §5 for what waves 2–4 plug into.
- 2026-10-05 — **round 1 integrated:** R68 run on `local.db` (backup in the session scratchpad `backups/`); `projects` added to
  both baseline lists (`lib/db/baseline.ts` · `scripts/snapshot-baseline.ts` — round 1 had left it out, so a reset would have
  dropped the projects); the baseline rebuilt from a scratch restore → migrate → repair → snapshot, never from `local.db`.
- 2026-10-05 — **wave 2 built in three worktrees and merged** (no commits): round 2 Schedule (74/74), round 3 Updates (85/85),
  round 4a the portal's frame (72/72). Merged file by file with `git merge-file` against each package's synced base (the main
  tree carries unstaged work, so `git apply --3way` refuses); 27 conflicts, all at append points, resolved keeping both.
  Migrations regenerated as `0059_updates_and_portal.sql` and `0060_schedule.sql`; repairs R69 · R70 · R71 run on `local.db`
  (backups in `backups/`); Updates' milestone picker rewired to round 2's columns (`title`, `position`, `deleted_at`). Register
  rows numbered REG-933…947 (round 2) · REG-948…959 (round 3) · REG-960…969 (round 4a); their citations in code rewritten from
  the staging numbers. The staging files stay in `projects-build/`.
- 2026-10-05 — **wave 3 built and merged:** round 8 Selections (65/65; `0061_choices.sql`, R74, REG-970…979), round 4b the
  portal's project tabs (74/74; `0062_portal_project.sql`, R73, REG-980…992), round 5 money in part one (72/72;
  `0063_money_in.sql`, R72, REG-993…1008). Two packages stalled on a stream watchdog near their end and were resumed with their
  context. One package's re-run of earlier probes hit the others' live servers (hard-coded ports) — every probe now honours
  `BASE`, and the protocol says to aim earlier probes only at your own server. Earlier probes' fixed counts (needs, tabs,
  attention) became rules.
- 2026-10-05 — wave 3 regression on one build: r1 83 · r2 74 · r3 86 · r4a 72 · r4b 74 · r5 72 · r8 65 (all green after round 8's
  tab-order check became a rule); the baseline rebuilt (81 tables, restore tested).
- 2026-10-05 — **round 9 the portal, part two built and merged** (65/65; `0064_portal_household.sql`, R77, REG-1009…1018):
  household members with their own sign-in and state, the client's bell (derived rows, per-person reads), Remind on WhatsApp
  recorded, the six section switches enforced on the server + the Designs tab, the welcome line. Open for the owner (its register
  rows): the phone bar shows every portal tab; a newly shared file or design rings no bell; Files off also hides Documents.
- 2026-10-05 — **round 7 ending and rules built and merged** (55/55; `0065_project_ending.sql`, R76, REG-1019…1033): Complete
  handover with its checklist and Complete anyway, the owner's review setting, Completed read-only on the server (payments still
  open), Reopen, soft delete with the Deleted projects sheet and Make the project again, Q-27 on every lead delete path, Settings ›
  Projects in the house order with Schedule defaults, 13 *Who may do what* rows, `project_milestone_task`, the Notifications
  follow-up line made true for Q-29. It also fixed a live crash: round 2's `milestone_due` / `milestone_late` had no email or
  WhatsApp messages, so Settings › Notifications threw on render. **Integration catch:** rounds 7 and 9 invented the same phone
  (91827364) for Shalini Menon and Mei Ling Han; `homeowner_profiles.phone` is unique, so R76 stopped half-way on `local.db` —
  Shalini now has 96284417, the half-written project was cleared (backup `local.db.bak-pre-r76-fix`) and R76 re-ran clean.
- 2026-10-05 — **round 6 money in part two built and merged** (78/78; `0066_payments.sql`, R75, REG-1034…1049): payments
  recorded / sent as proof / confirmed / not received / reversed, receipts RCT-{YYYY}-{seq} on the invoice paper, overdue with Remind on
  WhatsApp, the portal's Money tab with a generated PayNow QR carrying the amount, a pick's variation order (`quotes.selection_id`).
  **Joins made at the merge** (the parallel rounds could not see each other): the client's *I have paid* sits behind the Money section
  switch (`portalActor(…, { section: 'money' })`), the proof file rule is `inSection('money', …)`, the client's bell reads
  `project_payments` (`paymentsFor` in `lib/portal/notifications.ts`), the delete rule counts money received only (a waiting proof is not
  a payment yet). Left to a fixer: Shalini Menon's two payments (R76 wrote them before round 6's receipts existed).
- 2026-10-05 — **wave 5 started:** the developers' map `24-projects-migration-map-2026-10-05.md` written (round 6's rows being
  confirmed), the UAT chapters 17–21 being written, the consistency walk under way (with the portal's phone bar as Home · Schedule ·
  Updates · Money · More, and one word per state across studio and client).
- 2026-10-06 — **the consistency walk done** (REG-1050…1065): every Projects surface shot at 1440 and 390 beside its house pattern
  (`design-source/verify/projects/consistency/` — before / after, and the walk's scripts). Built: the portal's phone bar is the studio's
  dock (Home · Schedule · Updates · Money · More; `MoreSheet` extracted from `MobileChrome`, `.dockFrame` composed; More's dot and row
  counts from the client's needs); one word per state (the client's stage words in one list — Under way · Please confirm · With your
  designer — read by the portal and by the studio's *What {client} sees* pane and Share preview, which now draw the portal's own rows with
  the live answers; "Something is not right" one spelling); one chip piece per state (`MetaChip` + blue; the timeline's payment / moved
  chips, Updates' New, the portal's New / Changed, Chosen, the update state; Blocked yellow everywhere); "Project P-… created" on Won;
  Deleted Projects; the split label; "Uploading…"; the household dialog's title; household given names ("Mei Ling"); "variation order"
  in every send message; the invoice / reminder drafts name the portal only when the client holds it; the timeline's hints on the house
  Tooltip; the scope help lines; Managers named in Settings › Projects; Maison AI raised over the Schedule's phone dock; the client's
  square mark in Client access; cut names on `Tooltip whenCut`; the portal bar at 320. `scripts/design-anatomy.mjs` now covers the
  project pages (51 pages, 1005 measures, all hold; the Schedule head moved to 52 and the check reads a `display: contents` row's cell).
  Probes on fresh copies of `local.db`: r1 83/83 · r2 70/74 (the four failures are day counts written for 5 Oct — the run crossed
  midnight; on 5 Oct only its chip-case check failed, since fixed) · r3 86/86 · r4a 72/72 · r4b 74/74 · r6 78/78 · r7 55/55 · r8 65/65 ·
  r9 65/65 · r5 71/72 (r5:201 expects the portal link in Aisha Rahman's invoice message — she was never invited, so REG-1056 leaves it
  out; r5 belongs to the fixer editing it). Left with reasons in the walk's report.
- 2026-10-06 — **the UAT's twelve bug fixes** (REG-1066…1077, each `bug fix`; server first, then the screen): a variation order's
  approval keeps *Mark as approved by the client*'s rule in the quote editor's pill (Designers refused on the server, the row says why; Owners
  and Admins get the dialog; never Signed); a Draft's amount change re-sizes the other unsent invoices in the same press with one sentence and
  Undo, and the band's *Re-size them* names the invoices, never the contract (F-08 · F-09 by the code's model); a pick states the GST-inclusive
  figure its variation order carries (an option's price is a quote line's, before GST — `pickGstPct`); a completed project offers nothing the
  server refuses (every choice write now refuses; Money's sends, VOs and re-size hidden; payments stay open; the bar names Reopen); Move up /
  down answer with Undo; *Used by* counts by the template's id (`project_schedule_created.templateId`, no migration); the bell's late
  milestone counts days as its row does; Shalini Menon's completion follows her last payment by construction (R76 + a mend after R75 + two
  checks; read in the app: every checklist item met); "Approved — not sent" is not with the client; the send dialog's Copy link only with
  portal access; r2 · r5 · r6 probes assert rules. Probes on fresh copies of the repaired `local.db` (one build, :3071): r1 83/83 · r2 83/83 ·
  r3 86/86 · r4a 72/72 · r4b 74/74 · r5 90/90 · r6 79/79 · r7 63/63 · r8 65/65 · r9 65/65 (the new checks in r2 · r5 · r6 · r7 · r8). Repair: all checks pass on a scratch copy, on
  a fresh baseline rebuild and on `local.db` (backup in the session scratchpad `fix/`).
- 2026-10-06 — **the full regression after Projects**: every banked `design-source/verify/**/verify-*.cjs` (80 files, 83 runs — ghosts-same
  at 1440 and 390 touch, first-run on an emptied copy · no leads · the full demo, ux P1 with its two seeded probe quotes), each on its own
  fresh copy of `local.db` and its own `next start` (one build, lanes :3081…:3084): **all green** — Projects r1 83 · r2 83 · r3 86 · r4a 72
  · r4b 74 · r5 90 · r6 79 · r7 63 · r8 65 · r9 65, and the earlier modules' 73 runs n/n (the capture tools — ghost strips, film, measure,
  panel order — run clean, Δ 0). 36 of the 73 earlier runs passed first time; 36 probe files failed on their first run and were changed
  (first-run full's one red was the runner's missing lead id). **No (a) found by a probe**: no Projects change broke a check an earlier
  row makes (one gap found by reading, below, is open). **(b), the probe now asserts the later rule**: REG-911 (direct clients off
  the listing — view-as) · REG-921 (Settings › Projects live, Finance the soon tab — st-r1, Dane P2b) · REG-966 (Invite to Portal → Client
  access — Dane P6) · REG-969 (R71's bank details — ux P4) · REG-943 · REG-1040 (late milestones / invoices in the bell's Due — Dane P5b) ·
  REG-922 (Create's New project — ux P7) and, from before Projects, the UX audit's and Dane's UAT rows the probes never followed: REG-737 ·
  REG-768 · REG-769 · REG-773 · REG-776 · REG-779 · REG-780 · REG-786 · REG-788 · REG-790 · REG-795 · REG-796 · REG-797 · REG-801 · REG-805
  · REG-820 · REG-835 · REG-846 · REG-848 · REG-849 · REG-857 · REG-858 · REG-870 · REG-875 · REG-891 · REG-895 · REG-897 (each cited
  beside its check; three new checks where the later rule is the point — a contract held by its Draft quote says so, Send together's
  greyed row names it, Mark as signed offers Move to Won). **(c), made robust**: files a probe expected in an old scratch folder (the
  entity logo — tpl-parity; the upload samples — qe-r5), the demo share link R61 sent with a week's life that expired 1 Oct (viz-client,
  ux P7 move it on their scratch copy), a Generate wait that could pass before the run showed (viz-studio), "6 October 2026" also naming
  the 16th and 26th (ux P1, exact), the Showroom design's demo folder (ux P7). Checks: `tsc` clean · `eslint` 0 errors (9 warnings) ·
  `design:lint` nothing new · `design:anatomy` 1,005 measures hold (51 pages, on a scratch copy). `local.db` untouched (same checksum).
  **Open, not applied (app edit refused in the session):** a new contract names "the lead's Signed quote, else its latest"
  (`createContractDoc`, `app/contracts/actions.ts`) and the Contracts tab's "next quote" line (`lib/leads/contracts.ts`) read every quote
  of the lead, so on a Won lead with no Signed system quote a later **variation order** would be named — against REG-1000 ("never list or
  pick a variation order"); the fix is `eq(quotes.kind, 'quote')` in those two reads. Also for the owner: the demo's own share link to
  Kevin Ng (R61) shows expired in `local.db` since 1 Oct.

---

## 5. What round 1 leaves for the others

Every extension point, so the parallel packages of waves 2–4 add their part without editing each other's files. Each is a list or a
function a round appends to; the comment at the top of each file says the same.

| Extension point | File | How a round plugs in |
|---|---|---|
| **The tabs** | `lib/projects/tabs.ts` `PROJECT_TABS` | Insert `{ slug, label }` in the order Overview · Schedule · Updates · Money · Choices · Tasks · Files · Activity; add the slug's branch in `app/projects/[id]/[tab]/page.tsx` (its loader + body inside `ProjectFrame`) and its ghost in `components/projects/project-ghost.tsx` (`tabGhost` covers only the lead's tabs). A tab not built is not listed. `lead: 'tasks' \| 'files' \| 'activity'` marks a tab that carries a lead tab on (`projectTabHref` maps the lead's links onto it). |
| **The listing's columns** | `components/projects/project-columns.tsx` `PROJECT_COLUMNS` | Append `{ key, label, track, cell(row, ctx), sort?, text(row), money? }` — Next milestone (r2), Progress (r2), Last update (r3), Collected (r6, `money: true`). Add the field it reads to `ProjectRow` (`lib/projects/model.ts`) and fill it in `fetchProjectRows` (`lib/projects/queries.ts`). Column settings, sorting, export and the ghost's `cols` read the registry (keep the ghost's widths in step). |
| **Needs attention** | `lib/projects/attention.ts` `ATTENTION_REASONS` + `AttentionFacts` | Add a fact (e.g. `milestonesOverdue`, `daysSinceUpdate`, `paymentsOverdue`, `clientSilentDays`), fill it in both loaders (`fetchProjectRows`, `fetchProjectDetail`), add `{ key, weight, reason(f, now) }`. The tile, the row, the card, the Status card and the rail's / dock's count follow. |
| **Waiting on client** | `waitingOf` in `lib/projects/queries.ts` | Round 1 reads quotes `Sent to Client` and contracts `Sent to Client`; the portal rounds add the client's open asks (a stage to confirm, a choice to make, an invoice to pay). |
| **Getting started** | `lib/projects/getting-started.ts` `GETTING_STARTED` + `SetupFacts` + `SetupAction` | Add an item `{ key, label, help, done(f), action(f) }` (r2 "The schedule", r4a "Invite the client"), its fact, and the `SetupAction` the Overview maps in `ProjectFrame.onSetup` (`components/projects/project-frame.tsx`). |
| **The one primary action** | `lib/projects/next-step.ts` `PRIMARY_ACTIONS` + `PrimaryRun` | Append `{ when(f), action: { key, label, run } }` in priority order (r2 Set up the schedule, r3 Post an update, r7 Complete handover); add the `run` to `PrimaryRun` and its dialog / page in `ProjectFrame.pressPrimary`. `NextFacts` grows with what `when` needs. |
| **The project's menu** | `components/projects/project-menu.tsx` `ProjectMenuItems` + `ProjectMenuAction` | One list for the row, the phone card and the page's kebab; r7 adds Complete handover / Reopen / Delete. Both hosts' `onMenu` switch on the action (`projects-workspace.tsx`, `project-frame.tsx`). |
| **The Overview's cards** | `components/projects/project-overview.tsx` | Two stacks: left `gettingStarted · status · money · docs`, right `client · team · activity`. A round adds its card as a constant and places it in a stack (r2 Next milestones under Status, r3 Latest updates above Activity, r5/r6 replace the Money card's body), with its `data-card` and its phone `order` in `project-overview.module.css`, and a `CardGhost` in `project-ghost.tsx`. Cards use the lead Overview's `Card` and the LEAD STAGES row (`Row`). |
| **Events** | `lib/projects/events.ts` `logProjectEvent` + `ProjectEventKind`; `lib/leads/events.ts` `LeadEventKind`; `lib/leads/activity.ts` (the `project_` branch) | Every project action writes `logProjectEvent(tx, leadId, projectId, kind, detail)`. A new kind goes into both kind unions, the repair's unknown-kind check (`scripts/repair-demo-data.ts`) and the Activity branch's sentence. |
| **Rules** | `lib/projects/policy.ts` | `worksOn` · `mayChangeProject` · `seesMoney` · `seesStudioMoney` · `mayCreateProject` and `CHANGE_RULE`; r7 adds Delete / Restore / Complete rules and their *Who may do what* rows in `lib/settings/permissions.ts`. Every action checks `canOpenLead` first (`forChange` in `app/projects/actions.ts`). |
| **Actions** | `app/projects/actions.ts` | `openLeadProject` · `createDirectProject` · `renameProject` · `startProject` · `setProjectDates` · `setProjectValue`; each refusal answers `{ error }`; `touch()` revalidates the project and its lead. A round with many actions keeps its own file (`app/projects/<area>-actions.ts`). |
| **Creating a project** | `lib/projects/create.ts` `ensureProjectForLead` · `insertProject` | The one writer: number, `project_created` event, the bell row. r5 hangs the invoices' drafts off a new project here (after `insertProject` returns `created`). |
| **Numbers** | `lib/projects/model.ts` `ProjectNumbering` · `formatProjectNumber` · `nextProjectSeq`; `app/settings/projects-settings.tsx` | r5/r6 (invoices, receipts — F-13) reuse the model under their own settings keys; r7 adds cards to the Projects module (`ProjectsSettings`). |
| **Base paths for the lead's tabs** | `LeadTasks base` · `LeadFiles base` · `FileViewer base` · `fetchLeadActivity(leadId, { projectId })` | Any lead component a project carries on takes `base` (default `/leads/<id>`) for the links it builds; activity links are mapped by `projectTabHref`. |
| **Direct leads** | `leads.direct` | Kept out by `eq(leads.direct, false)` in `fetchLeadRows` / `fetchDeletedLeads` (`lib/leads/queries.ts`), `lib/leads/insights.ts`, `lib/ghost-shapes.server.ts`, `lib/company/members.ts`, `app/settings/page.tsx`, the search's lead kind (`lib/global-search/queries.ts`), the Tasks hub's `leads` list (`lib/leads/tasks.ts`); redirected by `directProjectOf` in `app/leads/[id]/(overview)/page.tsx`, `[tab]/page.tsx` and `files/[fileId]/page.tsx`; the repair's early lead rules skip them. A new surface that lists leads adds the same filter. |
| **The listing's scopes and filters** | `components/projects/scopes.ts` `SCOPES` · `components/projects/filters.ts` | A to-do scope is `{ key, label, group: 'todo', help, test(row, now) }`; a Filters group adds to `ProjectFilters`, `applyProjectFilters` and the modal's rail. |
| **Rail / dock count** | `countProjectsNeedingAttention` in `lib/projects/queries.ts`, read by `railBadges` | Follows `ATTENTION_REASONS` by itself. |
| **Demo data** | `scripts/repair-demo-data.ts` R68 | Waves 2–4 take R69…R77 after it; R68 owns `sid(<lead>, 'project')` ids and the projects' first tasks (`sid(<project>, 'task:first')`). |

**Left as it was, for the owner or a later round:** the lead page keeps *Convert to Project* as the Won step's door (it now opens the project
once Won); editing a Won step's details does not re-point the project's quote (round 5 owns the contract value); deleting a lead with a project
is not yet refused (round 7, Q-27); Settings › Notifications' "No follow-ups once a lead is Won…" line is unchanged though a project's tasks
carry on (REG-920).

---

## 6. What wave 2 leaves for waves 3 and 4

**Schedule (round 2)** — tables `project_milestones` (`title` · `position` · `start_date` / `end_date` · `status` not_started ·
in_progress · blocked · done · `follows_id` + `gap_days` · `payment_ref` (a `quote_payments.id` or `split:<n>`) + `payment_due`
(start · end) · `client_visible` · `confirm_asked_at` / `confirm_answer` / `confirm_note` / `confirm_answered_at` · `waiting_*` ·
`plan_start_date` / `plan_end_date` · `done_at` · soft `deleted_at`), `project_schedule_shares` (`snapshot` + `changes` JSON),
`schedule_templates` + `schedule_template_items`, `lead_tasks.milestone_id`. Server helpers `lib/projects/schedule.ts`
(`scheduleFactsFor` · `milestonesOf` · `latestShares` · `paymentOptionsOf` · `milestoneOptionsOfLead`), the pure model
`schedule-model.ts` (`ScheduleSnapshot` · `ClientRow` · `parseSnapshot`) + `schedule-phases.ts`, actions
`app/projects/schedule-actions.ts`. **The portal reads the newest share's snapshot, never live rows**; `ClientSchedule`
(`components/projects/schedule/client-schedule.tsx`) already draws it. Round 4b writes `confirm_answer` / `confirm_answered_at` /
`confirm_note` and adds its own event kind for the client's answer. Money ties invoices to milestones through `payment_ref` /
`payment_due`, so *Ready to send* reads the milestone's `status`. Keys: area `schedule`, `SCHEDULE_KEYS`.

**Updates (round 3)** — `project_updates` (status draft · in_review · published · sent_back · withdrawn; `client_opened_at` for
round 4b; soft delete) + `project_update_files` (an update ↔ a lead file in Files › Site updates). The client sees
`status = 'published' AND deleted_at IS NULL`; reuse `ClientUpdateCard` (`components/projects/updates/client-card.tsx`). The
studio's media route `app/projects/[id]/media/[fileId]/route.ts` checks Who sees leads — the portal serves update media through its
own file route by appending a rule to `PORTAL_FILE_RULES`. The review switch lives in Settings › Projects
(`app/settings/projects-settings.tsx`).

**The portal's frame (round 4a)** — registries to append to: `PORTAL_TABS` (`lib/portal/model.ts`), `NEED_PRODUCERS` ·
`BEFORE_STEPS` · `ACCESS_SECTIONS` (`lib/portal/needs.ts`), `PORTAL_FILE_RULES` (`lib/portal/files.ts`), the waiting lines
(`lib/portal/waiting.ts`). Gates: `portalGate(slug, sub)` for pages, `portalActor(slug, { write })` for actions (refuses writes in a
studio preview — See it as the client and Open as a test client record nothing), `stampOpened` (`lib/portal/session.ts`); data
`fetchPortalData` (`lib/portal/home.ts`); the page frame `PortalFrame tab=…`; the session-checked file route
`app/my/[slug]/file/[fileId]/route.ts` (`portalFileFor` · `serveLeadFile`). Tables `portal_addresses` · `portal_sessions`;
`homeowner_lead_links` + `invited_by · opened_at · last_opened_at · withdrawn_at · withdrawn_by`; `lead_files.shown_to_client_at`
(any code building a `LeadFile` literal needs it); settings key `portal`. R71 fills the studio entity's bank and PayNow where empty —
money reads the same record. The Client access panel (`components/portal/client-access-panel.tsx`) opens from the lead page's
"Invite to Portal", the project kebab, Getting started and the listing's row menu.

**Shared lists, in their order now:** `PROJECT_TABS` Overview · Schedule · Updates · Tasks · Files · Activity (Money · Choices go
after Updates); `PRIMARY_ACTIONS` start → Set up the schedule → Share changes → Post an update (last); the listing's columns end
Next milestone · Progress · Last update. In `lib/leads/activity.ts` the update and schedule branches sit **before** round 1's
`project_` branch (it matches every `project_…` kind) — put new `project_…` branches there too.

**Lessons for every package:** `next build` prerenders pages that read the database — `DATABASE_URL` on the build command; the
sync is `scratchpad/sync-from-main.py` (git -C MAIN is refused in a worktree); every new table goes into both baseline lists.

---

## 7. What wave 3 leaves for wave 4

**Money in, part one (round 5)** — **one set of numbers** in `lib/projects/money.ts`: `moneyOf` already takes
`payments: { invoiceId, amountMinor }[]` (Part paid · Paid · Collected) — round 6 fills it in `moneyInputOf`
(`lib/projects/money-queries.ts`, which passes `[]` today). Also there: `moneySummaryOf` · `approvedVariationsBy` ·
`variationsWithClientBy` · `invoicesAwaitingBy` · `fetchProjectMoney` · `fetchInvoiceDoc`; `lib/projects/invoices.ts`
(`draftInvoicesFor` · `applyRebalance` · `onVariationApproved` · `onVariationReverted`); `lib/projects/invoices-model.ts` (rules,
numbering, the WhatsApp message). Table `project_invoices` (stage ref and name, share, position, number, status draft · sent ·
void, amount + GST, issuing entity, variance reason, submitted / reviewed / sent / voided by + at, due date, `replaces_id`);
`quotes.kind` (quote · variation) · `project_id` · `confirmed_via` · `confirmed_marked_by`; settings `project_invoices` (approval
on, 7 days) and `invoice_numbering`. **Every sent invoice reads Overdue until round 6 records payments.** Void refuses a paid
invoice. The invoice paper `components/projects/money/invoice-paper.tsx` is the one for the portal and the receipt. The Money tab
is hidden for a viewer who may not see money (`project-frame.tsx`). Variation orders are kept out of every quote list by
`kind = 'quote'`. Bell events `invoice_review` · `invoice_sent_back` · `variation_approved`; four *Who may do what* rows +
`StudioRules.invoiceApproval`. Not built: a generated PayNow QR (the entity's uploaded QR shows), credit notes ("S$x to credit").

**The portal's project tabs (round 4b)** — portal actions **revalidate no path** (a revalidation re-renders the portal page and
wipes "Since you last looked"); the portal bar's links don't prefetch; the portal sets `--app-mobile-dock-height` so the snackbar
clears its bar; `serveLeadFile` serves any bytes with Range. Records: `project_milestones.confirm_answered_by` (the homeowner),
`homeowner_lead_links.schedule_seen_at`; events `project_stage_confirmed` · `project_stage_changes` · `project_stage_asked`; bell
`stage_confirmed` · `stage_changes`; attention `client_concern`. The portal's own lines still say "quote" for a variation order
waiting on the client — round 6's to fix.

**Choices (round 8)** — the seam for round 6: `pickPriceDifference(selectionId)` in `lib/projects/choices.ts` (the chosen option,
its price against the quote, who chose and when); call it where a pick lands — `chooseOption` (`app/portal/choices-actions.ts`)
and `chooseForClient` (`app/projects/choices-actions.ts`), both marked with a comment. Tables `project_selections` ·
`project_selection_options`; pictures in Files › Choices; bell `choice_made`; attention "Choice overdue".

**Shared lists now:** `PROJECT_TABS` Overview · Schedule · Updates · Money · Choices · Tasks · Files · Activity; `PORTAL_TABS`
Home · Schedule · Updates · (Money goes here) · Choices · Files; the repair script's code runs R68…R74 then R72, with one
`checks` list. **Probes:** assert the rule, not another round's count; aim an earlier round's probe only at your own server with
`BASE`.
- 2026-10-06 — **the programme closes.** All ten rounds built, merged and verified; the full regression green (83 probe runs across
  every module on one build — the stale checks of earlier modules now assert their newer rules, citing the REG rows that changed them);
  `npm run design:anatomy` 1,005 / 1,005; the baseline rebuilt from a scratch restore → migrate → repair (84 tables, 1,000 rows,
  demoDay 2026-10-06; a reset restores every project, payment, the household and the portal's set-up); register rows REG-911…1078;
  the CLAUDE.md Map entry rewritten. **Left for the owner:** two queries still read variation orders where only quotes belong — the
  quote a new contract names (`createContractDoc` in `app/contracts/actions.ts`) and the Contracts tab's "next quote" line
  (`lib/leads/contracts.ts`); the fix is `eq(quotes.kind, 'quote')` in both, not applied because the regression runner's edit was refused
  by the session's permission check — it waits for his go-ahead. Kevin Ng's demo share link (R61) has read expired since 1 Oct.
  Nothing is committed.
- 2026-10-06 → 07 — **the owner's "go through in depth and fix everything".** Seven read-only auditors walked the live build
  (`25-projects-bug-audit-2026-10-06/A…G-*.md`, 305 findings: 1 Blocker · 63 Major), then seven fix packages in worktrees fixed them
  (outcome per finding in `<area>-fixes.md`): C REG-1080…1092 (0067) · E REG-1093…1105 · D REG-1106…1120 (0068) · B REG-1121…1134 ·
  F REG-1135…1143 (0069) · A REG-1144…1152 · G REG-1153…1161 (0070); plus REG-1079 (a contract never names a variation order). The machine
  ran out of memory mid-phase (swap 22 / 23.5 GB) and agents stalled on a 10-minute watchdog; a stale build lock left by one of them
  blocked the others — the protocol gained a Stall rule, and the last two packages (A, G) were finished and merged by the orchestrator.
  Integration catches: rounds C and F both stamped who opened an update (merged into one rule); round F's demo photo carried a sample's
  name (renamed in R77b with a mend); A's and G's redirect helpers both kept (`withQuery` used); a lost brace in `lib/nav.ts`.
- 2026-10-07 — **the fix phase's final regression.** One build of the merged tree (type check in the build, lint 0 errors), then all fifteen
  Projects probes in sequence, each on a fresh copy of local.db: r1 83 · r2 83 · r3 86 · r4a 73 · r4b 74 · r5 90 · r6 79 · r7 62 · r8 65 ·
  r9 65 · fix-B 53 · fix-C 49 · fix-D 35 · fix-E 50 · fix-F 44 — all green after one correction round. Every first-pass failure was a probe
  written before fix-G changed the rule it asserts (the preview's own address `/my/<slug>~<id>`, Withdraw in the row menu, a Designer acting on
  her own clients' rows, "is overdue · was due", the household's pending WhatsApp tab, the portal tab order, the empty number's "required"),
  plus one merge catch in the app: the completed bar had lost "agreed" when E-24's sentence replaced D-11's (REG-1162). The Status card's head
  keeps A-14's "Completed on {date}" over E-19's "Took n days". `npm run db:repair` all checks pass (nothing to write); baseline rebuilt
  (85 tables, 1,024 rows, demoDay 2026-10-07). Shots of the re-run probes banked over each round's folder. Nothing committed.
- 2026-10-07 — **the owner's calls on the fix phase's open items, and the full regression.** His "go" on my recommendations: built
  REG-1163 (a completed project's Status head "Took n days"), REG-1164 (the sign-in code step says "your designer"; `requestCode` returns
  no name — F-37), REG-1165 ("With your designer" grey — F-27); kept as they are: D-14 (overpayment = owed amount + a note, until credit
  notes), B-61 (the client pane wears the portal's brand), F-32 (the studio's own stage names), D-23 (C = New variation order), the
  flagged invented copy. The full regression — 73 probes across every earlier module, two lanes, each on a fresh copy of local.db, the
  runner rebuilt from the 6 Oct agent's transcript (`lsof … -sTCP:LISTEN` only; three-level `__dirname` paths; the first-run probes' lead
  ids) — all green; the one app bug it found: G-38's not-found page shrank to its notice's width (REG-1166). `npm run design:lint` holds;
  `npm run design:anatomy` holds after the Schedule's date axis joined its exceptions (REG-1167). After the rebuild, r4a 73 · r4b 75 · r9 65 ·
  fix-E 50 · fix-F 44. Shots `design-source/verify/projects/final-2026-10-07/`. Nothing committed.

