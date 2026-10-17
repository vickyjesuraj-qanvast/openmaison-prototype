# Area A — outcomes (fix-A, 2026-10-06)

Running file: one row per finding → Fixed (what changed, where) · Not a bug (the rule) · Owned by another package.

| ID | Sev | Outcome | What / where |
|---|---|---|---|
| A-01 | Major | Owned by E | stage rules / a lead with a live project held at Won (package E) |
| A-03 | Major | Owned by D | a direct project's agreed value re-sizing drafts (package D, money) |
| A-09 | Minor | Owned by E | lead Delete on a Won lead with a project (package E) |
| A-12 | Minor | Owned by E | what stays open on a completed project (package E) |
| A-18 | Minor | Owned by D | receipts opening blank (package D, money) |
| A-04 | Major | Fixed | `ExportDialog` takes `defaultScope` + `shownLabel`; the bulk bar's Export opens on "Selected projects (n)" (`components/leads/export-dialog.tsx`, `projects-workspace.tsx`) |
| A-05 | Major | Fixed | `assignMembers` / `addLeadMembers` speak of a lead's live project — "HDB 5-Room — Aisha Rahman is now yours" → `/projects/<id>`, "2 projects are now yours" → `/projects` (`liveProjectsOf`, `app/leads/actions.ts`). The Activity already carries the change from `lead_assignees` (no second event) |
| A-07 | Major | Fixed | Target end counts signed calendar days (`calendarDays` in `lib/projects/attention.ts`, the Schedule's own count — also B-21's): past → "n days late" in the alert tone; new reason `target_passed` ("n days past the target end") when no late milestone says it (both loaders fill `targetEnd`) |
| A-10 | Minor | Fixed | Every Status-card reason and waiting line presses where it is fixed: `ProjectDetail.attentionItems` / `waitingItems` (`StatusItem` with `href` or `run`, `lib/projects/queries.ts`; `attentionItems` in `attention.ts`); milestones → Schedule `?open=`, payment → Money `?open=<invoice>`, update gap → the composer, choice → Choices `?open=`, quote / contract → the record with `from`, invite → Client access, set-up → Getting started; the milestone that raised "Waiting on …" folds its own waiting line into that row's caption (one line per fact) |
| C-17 | Minor | Fixed (with A-10) | Choice overdue → Choices `?open=<the late one>`; No update for n days → Updates with the composer |
| A-11 | Minor | Fixed | `onSetup(run, el)`: the Assign popover anchors to the pressed Getting started row; Team's action reads "--" when nobody is assignable (`project-overview.tsx`, `project-frame.tsx`) |
| A-13 | Minor | Fixed | Row and card menus pass `canRename={row.ends?.mayHandover}` (= `mayChangeProject`, the rename rule) — disabled with the reason in the row, as on the page (also E-18) |
| A-14 | Minor | Fixed | Status head says the stage's fact: "Starts 23 Oct ’26" / "Won 4 days ago" (Setting up), "Started 18 days ago" (In progress), "Completed on 28 Sep ’26" |
| A-21 | Minor | Fixed | `findDuplicateLead` returns the client's live project; the question reads "Benjamin Han · 9773 1968 · Project P-2026-002 · In progress"; Open existing closes the form and routes in place with `from` (`onOpenExisting`) |
| A-22 | Minor | Fixed | `ProjectGhost shape`: Getting started only while setting up, Schedule / Money / Key documents as the page draws them, Money tab only for whoever sees it, chips by the project type; the reveal is told, the loader reads what this browser saw last (`useRememberProjectShape`) |
| A-24 | Minor | Fixed | One sort: a heading press sets Filters › Sort back to the base order and Filters says "Sorted by the X column…"; an order picked there, or Clear All (also the no-results card's), takes the heading's off; Stage sorts by the journey |
| A-25 | Minor | Fixed | ≤1024 (where the header's chips step aside) the stage chip sits in the action row, as the lead's Stage pill does (`.compactStage`) |
| A-27 | Minor | Fixed | Leads' Won snackbar View carries the listing as it was (`app/leads/workspace.tsx`) |
| A-28 | Minor | Fixed | `ProjectDatesDialog focus="end"` from Target end rows |
| A-29 | Polish | Fixed in part · Not a bug in part | Needs my review shows for Owners / Admins (or anyone with something in it — Q-48's designer confirmer). The paragraph help lines are REG-1058's decision ("say everything they count") — kept |
| A-30 | Polish | Fixed | Head "Start date" (and the CSV); cards "Started …" in the past, "Starts …" ahead |
| A-31 | Polish | Fixed | `subLine`: the property alone when the name already names the client (table and cards) |
| A-32 | Polish | Fixed | Tiles one row from 768 up (`--tiles`), the value tile a figure with no fill (full row on a phone), captions wrap (`StatTile wrap`) — page and ghost |
| A-33 | Polish | Fixed | Touch ≤1024: the row kebab is an in-flow cell in the trailing track (REG-310's rule) |
| A-34 | Polish | Fixed | The property-type chip drops when the name already says it (Q-05's default name) — the name keeps its line at 1025 |
| A-35 | Polish | Fixed | Rename with the same name closes without a snackbar |
| A-38 | Polish | Fixed | "1 needs attention" / "2 need attention" on the rail and the dock |
| A-39 | Polish | Fixed | Address row `directions` (no location glyph in the subset); Key documents drops the ↗ to Files; payment-stage rows open their invoice; Getting started's value in `money2` |
| A-40 | Polish | Fixed | "An Owner or an Admin adds teammates." for a Designer with no manager |
| A-41 | Polish | Fixed | On a project the note says "the project’s team" |
| A-02 | Major | Fixed | Direct clients stay pickable (a direct project's quotes and contracts are made through the pickers) but read "Zed Lim · P-2026-007" in Create Quote, New Contract, a contract template's sample lead and X-Ray (`lib/projects/direct-clients.ts` `nameDirectClients`); the project reaches its own documents: Key documents lists a direct project's other quotes and contracts (`ProjectDetail.documents`), each opening with `from`; its Activity's quote lines open the editor (not the redirected lead tab) |
| A-06 | Major | Fixed | A number is given once: `markNumberGiven` keeps the highest running number per prefix (settings `project_numbers_given`), written by `insertProject` and by Delete Forever; `fetchProjectNumbers` reads it with the rows (the Settings preview too). Make the project again passes `remade` — its line reads "made the project … again", not "won the lead". R68b backfills the mark from today's projects |
| A-08 | Minor | Fixed | `withQuery` (lib/nav.ts): the direct-lead redirects keep `open`, `from`, `folder`, `panel` (Overview, tabs, file viewer); ⌘K's task and file results of a lead with a live project open on the project's tab (`lib/global-search/queries.ts`, post-pass) |
| A-15 | Minor | Fixed | The Won step lists the signed quotes, then the ones out with the client not signed yet with "OM-… isn’t signed yet — mark it signed on the quote, or upload the signed copy" (shown when picked, blocks Save as Quote Sent's approval hold — `wonQuoteRows`, wizard `check`); an uploaded signed quote is filed in Files (`fileWonQuote`, "Signed quote — <name>.pdf") and Key documents names and opens it (`ProjectDetail.quoteFile`) |
| A-16 | Minor | Fixed | Project Activity: the lead's own history (how it came in, stage moves, who was put on it, its edits) opens the lead's record with `from` = this tab; quote / contract / X-Ray / Visualizer links and the lead-only tabs carry `from` back here; a direct project's quote lines open the editor (`lib/leads/activity.ts`, the projectId pass) |
| C-20 | Minor | Fixed (with A-16) | The project gets its own chips — All · Schedule · Updates · Money · Choices · Tasks · Files · Stage (`PROJECT_ACTIVITY_CHIPS` in lib/projects/tabs.ts; Money only for whoever sees it); lines take their group from where they open (`ActivityGroup` + schedule · updates · money · choices) |
| A-17 | Minor | Fixed | The task panel has a Milestone select ("In no milestone" first) for a project's tasks; the phone row names the milestone on its second line (none, nothing) |
| A-19 | Minor | Fixed | Payments · Site updates · Choices at a project's root keep their name and place: the folder menus (grid, list, the crumb's) read Move / Rename / Delete disabled with "The project files its receipts here" etc.; the server refuses rename, move, duplicate and trash with `{ error }` (`SYSTEM_FOLDERS` · `systemFolderReason` in lib/leads/file-model.ts; `refuseSystemFolders` in app/leads/files-actions.ts) — found by name still, which now can't drift (no schema change) |
| A-20 | Minor | Fixed | Tasks hub: a task of a project names "Marcus Teo · P-2026-007" and opens the project's Tasks (cell and panel); Filters gains a Project pane (number · name) for the projects listed (`TaskLead.project`, `StudioTasksData.projects`, `TaskFilters.projects`) |
| A-23 | Minor | Fixed | `app/projects/[id]/not-found.tsx` → `ProjectGone`: the shell, "This project isn’t there any more", Back to Projects (invented copy); Delete Forever clears the bell rows that open the project |
| A-26 | Minor | Fixed | The Won brief, once the project exists: "Project P-… is in progress. Its schedule, updates and money live on the project…" with Open project (navigates) (`lib/leads/briefs.ts`, invented copy; `LeadDetail.project` carries stage + name) |
| A-36 | Polish | Fixed | `projectEdits`: "set the start date to 23 Oct ’26", "cleared …", "changed the agreed value from … to …" |
| A-37 | Polish | Fixed | The eye mark: house `Tooltip` + `role="img"` `aria-label="Shown to client"` |
| — | parity | Added | **Open in AI Visualizer** on the project (1.0's Photo Renders): the project's ⋮ (page, row, phone card — `ProjectMenuItems` 'visualizer') and Key documents' text action, opening the lead's design (`openLeadDesign`, made on first open) with Back to the project; nothing metered (Q-30) |
