# S46B · what a 1.0 user can't find, made findable — outcome (2026-10-19, lane B, port 3170)

Her ask (2026-10-19): **"Please go ahead and fix everything and make sure every pixel, feature and functionality is fixed"**, after the findability
audit `design-source/context/parity/31-findability-audit-2026-10-19/` (README + raw N-1 · P-5 · P-6 · P-7 · T-4 · T-6). Plan
`s46/plan-2026-10-19.md`, step **S46B** (M1's doors, count and New ticket · M5 · M6 · M7 · M8 · H3). Her recorded pick stands: **Tickets stays in the
Projects ⋮** (REG-1425). 1.0 read through git only (`qanvast-id-tool`, `origin/deployment/qanvast`: `src/app/(main)/escalations/{page,new/page}.tsx`).
Register rows `steps/reg-S46B.md` (REG-S46B.1…9). Probe `design-source/verify/pending-modules/verify-pm2-s46b.cjs`. **No migration, no repair.**

## Ledger — every finding of the package

| # | Finding (audit words) | Status | Where |
|---|---|---|---|
| M1a | "Decide whether New ticket belongs on the studio list" → **New ticket on Projects › Tickets**: pick the project, then the project tab's compose; `?new=1` opens it | **Built** | `components/projects/tickets/studio-tickets.tsx` (header button / empty card, `PickOneDialog`, `NewTicketDialog`, `?new=1` · `&project=`), `lib/projects/tickets.ts` (`TicketProject` · `TicketRaise` · `ticketRaise`, `StudioTicketsData.raise`) — REG-S46B.1 |
| M1b | "The open count, visible … a Dashboard tile" | **Built** — the Projects ⋮ row's own count | `lib/projects/tickets.ts` (`ticketTally`; `countTicketsToAnswer` reads it), `lib/dashboard/{model,queries}.ts`, `components/dashboard/dashboard-ghost.tsx` — REG-S46B.2 |
| M1c | The stale "Projects' Tickets button" at `studio-tickets.tsx:30` | **Fixed** (+ the listing's prop comment); Back names its origin | `studio-tickets.tsx`, `projects-workspace.tsx` (comment only) — REG-S46B.3 |
| M1 (⌘K, G E) | ⌘K page *Tickets*, Create *New ticket*, G then E | **S46A's** (it points Create at `/projects/tickets?new=1`, served here) | — |
| M6 | "Close project … Complete handover row in ⋮" | **Built** — the Stage menu's Completed row, just before Delete, on every host of the menu | `components/projects/project-menu.tsx` (`stageRow`), `project-frame.tsx` (`'complete'`); the listing already ran `'complete'` — REG-S46B.4 |
| M7 | "Preview as Homeowner … give it its own row" | **Built** on the project page | `project-menu.tsx` (`seeAs`, `'preview'`), `project-frame.tsx` (`d.withClient.portal`) — REG-S46B.5 |
| H3 | "The client's phone in People and files" | **Built** — Call (dials on touch, copies and says so at a desk) and Copy | `components/projects/messages/conversation-details.tsx`, `lib/projects/messages.ts` (`ChatPeople.phone`) — REG-S46B.6 |
| M5 | "An Insights door on Tools › Meeting Copilot" | **Built** | `components/meetings/meetings-workspace.tsx`, `meetings-workspace-ghost.tsx`, `lib/nav.ts` (`fromLabel('/meetings')`) — REG-S46B.7. ⌘K words / Create row are S46A's |
| M8 | "For a project… in New ▾ and a Projects kind" | **Built** | `components/visualizer/home/{visualizer-home,kind-label}.tsx`, `lib/visualizer/queries.ts` (`VisualizerProject`, `DesignCard.project*`, editor `lead.projectNumber`), `components/visualizer/editor/visualizer-editor.tsx` (the chip) — REG-S46B.8 |
| Ghosts | every changed first screen | **Built** | seeds in `lib/ghost-shapes.server.ts` (`tickets.new` · `studio-tickets` · `meetings` · `meetings.save` · `meetings.write`), `studio-tickets-ghost.tsx`, `meetings-workspace-ghost.tsx`, `dashboard-ghost.tsx`; `verify-ghosts-same` covers `/projects/tickets` · `/meetings` — REG-S46B.9 |

### Found in 1.0, not on a finding
- 1.0's New Ticket form held **Priority** and **Assign To** beside Subject · Project · Category · Description. 2.0's compose keeps *Looked after by*;
  Priority stays the drawer's (Normal at start, Escalate → Urgent — gaps build H-Q4). Kept.
- The AI Visualizer's first-visit welcome (canvas direction D, REG-735) offers *Use a lead's photos* but no project start; a project's lead is in
  that picker, and New ▾ carries *For a project…* from the first design on. Kept as her approved canvas.

## Calls taken (her "fix everything" — as recommended, each in the register)
1. **New ticket sits in the header** (REG-466's unpinned-tab shape: the Tasks page's Add Task, Meeting Copilot's New Meeting) and on the empty card,
   never both; a phone's L2 header puts it on the action line (REG-359's house layout, as Messages' + does).
2. **The picker lists every project the member sees**, the ones they may change first, the others refused with the server's rule — the house
   picker's grammar (UX audit V2), so a Designer learns why rather than wondering where Ryan's project went.
3. **The tile's figure = the ⋮ row's** (waiting on the studio), its line open · escalated; for every role that opens projects; no colour.
4. **Complete handover in ⋮ mirrors the Stage menu exactly — including on hold (open).** The plan said "its refusals as the Stage menu's (e.g. On
   hold)"; the Stage menu does **not** refuse a held project (a hold ends with the project — `completeHandover` clears it), so adding a refusal
   here would make the two doors disagree. **Flag for her:** if a held project should not be handed over, that is one change to `stageRow`, and
   both doors follow.
5. **See it as stays on the project page**, where the portal is known (as Commission and Duplicate project); the listing's row keeps Invite to
   Portal, which holds the same press.
6. **Projects in the Visualizer = a lead's design whose lead has a live project**; Leads keeps the rest; the editor's chip says the same.

## Shared pieces changed (the other lanes must know)
- `lib/nav.ts` `fromLabel` — one line: `/meetings` → "Meetings" (exact path only; a meeting's own page is unchanged).
- `lib/ghost-shapes.server.ts` — four seeds (`studio-tickets`, `tickets.new`, `meetings`, `meetings.save`/`.write` via `studioMeetingsSeed`);
  imports `ticketRaise` (`lib/projects/tickets`) and `meetingRows` (`lib/meetings/queries`). **S46C may add seeds here too** (the Leads count,
  Tasks' approvals line): different keys, expect a merge of adjacent lines.
- `lib/projects/messages.ts` — `ChatPeople.phone` (studio-only read).
- `lib/visualizer/queries.ts` — `VisualizerHome.projects`, `DesignCard.projectId · projectName · projectNumber`, `VisualizerEditorData.lead.projectNumber`.
- `components/visualizer/home/kind-label.ts` — `designKindLabel(kind, stage, project?)`.
- `components/projects/projects-workspace.tsx` — a comment only.

## For other packages / the landing
- **Files this step changed** (lane B against `lanes/B.base`): `components/projects/{project-menu,project-frame,projects-workspace}.tsx`,
  `components/projects/tickets/{studio-tickets,studio-tickets-ghost}.tsx`, `components/projects/messages/conversation-details.tsx`,
  `components/meetings/{meetings-workspace,meetings-workspace-ghost}.tsx`, `components/visualizer/home/{visualizer-home.tsx,kind-label.ts}`,
  `components/visualizer/editor/visualizer-editor.tsx`, `components/dashboard/dashboard-ghost.tsx`, `lib/dashboard/{model,queries}.ts`,
  `lib/projects/{tickets,messages}.ts`, `lib/visualizer/queries.ts`, `lib/ghost-shapes.server.ts`, `lib/nav.ts`; the probes above; new
  `verify-pm2-s46b.cjs` + `pm2-s46b/`, `steps/reg-S46B.md`, this file. **Only `lib/ghost-shapes.server.ts` was also changed on main since the
  base** (S46C's `tasks.approvals` seed and its `railBadges` import) — a three-way merge (`diff3 -m lane base main`) is clean: this step's imports
  sit after `listingShape`'s, its seeds after `tickets.new`'s neighbours.
- **S46A (⌘K):** `/projects/tickets?new=1` opens the picker; `&project=<id>` opens that project's compose directly (refused projects fall back to
  the picker). With no project to raise on the page says "There’s no project you can raise a ticket on".
- **Records (the orchestrator's):** REG-1315 / REG-1830's "Tickets button" — a new row at the landing (the code comments are fixed here). FROM-1.0-TO-2.0.md:
  Escalations → Projects › Tickets now has New ticket and the Dashboard's Tickets tile; Close project → ⋮ › Complete handover; Preview as Homeowner →
  ⋮ › See it as {client}; the chat header's phone → People and files' Call; Copilot Analytics → Meeting Copilot's Insights; AI Visualizer From a
  project → New ▾ › For a project….
- **CLAUDE.md Map:** `ticketRaise` / `ticketTally` in `lib/projects/tickets.ts`; the Dashboard's Tickets tile; `ProjectMenuItems` `seeAs` + the
  `'complete'` / `'preview'` actions; `ChatPeople.phone`; Visualizer `VisualizerProject` + `designKindLabel(…, project)`.
- **Probes changed as deliberate changes of their rule** (each commented): `pending-modules/verify-pm2-s22.cjs` and `verify-pm2-s45a.cjs` (the
  tile lists carry Tickets), `verify-pm2-s41b1.cjs` (an Admin without cost sight has eight tiles), `projects/verify-pj-r7.cjs` (the phone card's ⋮
  carries Complete handover just before Delete); `ghosts/verify-ghosts-same.cjs` gains two routes.
- **Not this step's, found running the regression:** `parity-map-build/verify-pm-a.cjs` MI-035 fails 2 on today's base — its sample bill's due
  date (17/10/2026) is fixed while the demo day moves; the app correctly leaves a past due day empty. The probe (or the sample file) needs a
  date-relative assertion — whoever owns the parity-map probes / S42A's moving-day rule.

## Probes run
Every server on :3170 (`next start`, `DATABASE_URL` on the same command) against a fresh copy of `pbuild/base.db` (anchored 19 Oct) per probe;
`local.db`, :3000 and :3001 never touched; :3170 stopped at the end. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the
old `<img>` warnings only, none in a changed file) · `npm run design:lint` nothing new (no baseline raised) · production build green under the lock
(three builds) · `npm run design:anatomy` 89 pages, 315 table heads, 27 dialogs, 41 page menus — all 1974 measures hold.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s46b.cjs`** (M1 · M5 · M6 · M7 · M8 · H3 · ghosts · roles Dane / Germaine / Priya / Nurul · 1440 · 390 touch · 320) | **81 / 81** — page error log empty; the DB put back (stages and stage logs as found) |
| Projects: `pj-r7` · `pj-gap-h` · `pj-r4a` · `pj-r4b` · `pj-r8` · `pj-r9` · `pj-gap-a` · `pj-fix-E` · `pj-gap-e` · `pj-r1` · `pj-r5` · `pj-r6` | 67 · 80 · 73 · 75 · 67 · 66 · 72 · 50 · 55 · 98 · 91 · 82 — 0 fail |
| `simplify-projects-finance/verify-ks` · `lead-project-parity/KE/verify-ke` | 29 · 31 |
| Pending modules: `s22` · `s45a` · `s45b` · `s23` · `s26` · `s17` · `s41b1` · `s07` · `s20` · `s02` · `s03` · `s05` · `s06` · `s10` · `s14` · `s31` · `s35` · `s36` · `s41b2` · `s42b` · `s42c` · `s42e` · `s43a` · `s43b` · `s43c` · `s44z` · `s45c` · `s41` (dev previews on) | 116 · 157 · 72 · 147 · 107 · 130 · 110 (after its deliberate update; 108 / 2 before — the literal "seven tiles", page and ghost both 8) · 89 · 54 · 106 · 79 · 114 · 83 · 107 · 69 · 104 · 138 · 109 · 206 · 66 · 79 · 65 · 43 · 70 · 42 · 106 · 120 · 120 — 0 fail |
| Parity map: `pm-e` · `pm-g` · `pm-b` · `pm-i` · `pm-a` | 58 · 59 · 47 · 54 · **45 / 2** — the two are not this step's: `public/uat-files/printhub-bill-PH-2210.pdf`'s fixed due date (17/10/2026) is behind the demo day once the base is anchored to 19 Oct, so Fill from a PDF rightly leaves a past due day empty (see *For other packages*) |
| Regression harness on :3170 (RUN_DIR by hand: base · empty with `empty.sql` · noleads) | viz-studio 37 · viz-client 30 · ghosts-same 76 (with `/projects/tickets` · `/meetings`) · ghosts-same-390 76 · first-run-ghosts 15 · first-run-empty 89 · first-run-noleads 5 · first-run-full 6 · search 27 · kb-r1 35 · kb-r2 29 · ct-r2 24 · ct-r4 29 · qe-r3 21 · st-r1 58 · thumbs-rest 17 · dane-p6 41 · sw-r1 34 · sw-r2 27 · sw-r3 13 · ux-p4 56 · ux-p5 58 · ux-p7 89 · view-as 23 · xr-r2 31 · xr-r3 28 · xr-r4 16 — 0 fail (ghosts-strips captures frames, no assertions) |
| The loaders against their reveals (verify-ghosts-same's method) on `/dashboard` · `/projects/tickets` · `/meetings` · `/visualizer`, 1440 and 390 touch | 0.00% differ on each (Meetings differed 0.42% / 0.72% before its seeds — REG-S46B.9) |

Shots banked in `design-source/verify/pending-modules/pm2-s46b/` (26: the doors at 1440 and 390, the New ticket flow, the tile, the menu rows,
the call row, the refusals, the empty card, the Visualizer's Projects).

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner):** Projects › ⋮ › Tickets → **New ticket** → pick *HDB 5-Room — Benjamin Han* → Continue → the compose ("For Benjamin Han…") → Add
  ticket → the snackbar and the drawer; `/projects/tickets?new=1`. Dashboard › Where it stands › **Tickets** (pairs with Contractors) → Projects ›
  Tickets, "Back to Dashboard". Ryan D'Souza's project ⋮: **See it as Ryan** (new tab, the preview strip) and **Complete handover** before Delete
  → the Hand over sheet; Marcus Teo's (Setting up) refused "Start the project first"; Shalini Menon's (completed) has none. Messages › Executive
  Condo — Ryan D'Souza › People and files: "Client · 9755 1246", Call (copied + the sentence), Copy. Tools › Meeting Copilot › **Insights** →
  Reports › Meetings, Back to Meetings. AI Visualizer › New ▾ › **For a project…** → Ryan's project → the editor's "PROJECT · P-2026-001"; once it
  has a room, Kind: Projects.
- **Germaine (Designer):** New ticket lists every project, hers first; Ryan's refused with the rule. Ryan's ⋮: See it as / Complete handover refused
  ("the project’s team, Owners or Admins"); Benjamin's open. No Insights on Meeting Copilot. Her Dashboard: My leads · My projects · Tickets · Messages.
- **Priya (Accounting) / Nurul (Marketing):** no Tickets tile; Projects › Tickets is the gate.
- **390:** New ticket's square, the picker and compose as sheets, the Tickets tile, the ⋮ sheet with both rows, Details' Call (dials), Insights'
  square, New ▾'s sheet with For a project…; 320 without sideways scroll.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for any door; each is a piece the page already has (the Tasks page's header button,
   the house picker and the tab's own compose, a StatTile, a DropdownItem row, the info column's call/copy, the listings' Insights, the planner's
   New ▾ row and Kind); every new sentence flagged in REG-S46B.1…8.
2. **One system, no one-offs** — `PickOneDialog`, `NewTicketDialog`, `EmptyState`, `StatTile`, `DropdownItem`, `IconButton` + `Tooltip`, `Button`,
   `PageHeaderL2`, the ghost kit; no new stylesheet; `design:lint` holds every count.
3. **Plain words** — "Which project is this ticket for?", "waiting on you · 3 open", "Complete handover", "See it as Ryan", "Client · 9755 1246",
   "For a project…", "Project · P-2026-001".
4. **Nothing is lost** — no remove added; a ticket is the tab's own record (its Activity line, its bell); the Visualizer opens the lead's own design.
5. **Say why** — a refused project in the picker, a refused See it as / Complete handover in the row's second line, the snackbar when no project
   can take a ticket.
6. **Back returns where you came from** — the tile, Insights, *Open the project* and the drawer's *Open the project* carry `?from=`; Tickets'
   Back now names its origin (REG-S46B.3).
7. **Every screen is whole** — the shell, ghosts that draw the new controls and the first run, the empty card carrying New ticket.
8. **Every width is designed** — 1440 · 390 touch · 320 checked; sheets on a phone; no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — no new table; the Visualizer's Kind column reads the one label.
10. **Motion with purpose** — the house surfaces' own motion only.
11. **Honest data** — every figure is a record's: the tile is the ⋮ row's tally (and the probe checks it against the DB's turn rule); the
    picker's refusals are the server's rule; See it as uses the panel's facts; no demo data seeded.
12. **Reach for everyone** — named buttons and rows, `data-kb="create"` on New ticket (C), menus with roles, refusals in text (not tooltips), a
    tel: press on touch.
