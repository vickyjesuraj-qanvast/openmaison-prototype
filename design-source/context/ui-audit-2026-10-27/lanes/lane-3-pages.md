# Lane 3 — Projects and the client portal: screens measured

The shared measure (`ui-audit/measure.cjs`, first screen of the page's main area) at 1440×1024 and at 390×844 touch. Portal pages were measured
signed in as Ryan D’Souza (`lane3/portal.cjs`, the same evaluate). Columns: words · controls · purple text actions · filled buttons · uppercase
texts · font styles · text colours · truncated texts. Finding ids are in `lane-3.json`.

| Route | Words | Controls | Purple | Filled | Upper | Fonts | Colours | Cut | Verdict | Shot |
|---|---|---|---|---|---|---|---|---|---|---|
| /projects | 216 | 37 | 4 | 1 (add New project) | 21 | 10 | 8 | 7 | Five grey CAPS tiles + toolbar before the list; person_add purple on every row; names and reasons cut (3-11, 3-38). | 3-projects.png |
| /projects (390 touch) | 109 | 18 | 3 | 1 (add) | 6 | 9 | 7 | 9 | Tiles fill the first screen; Ryan’s card is six lines of red (3-11). | 3-projects-390.png |
| /projects?view=workload | 169 | 21 | 4 | 1 (add New project) | 11 | 8 | 8 | 0 | “studio default”, CAPS capacity tags, Insights twice (3-15). | 3-projects-workload.png |
| /projects?view=workload (390 touch) | 98 | 20 | 4 | 1 (add) | 7 | 8 | 8 | 5 | Same sentences, names cut on a phone (3-15). | 3-projects-workload-390.png |
| /projects?view=workload&of=contractors | 218 | 30 | 11 | 2 (add New project · Add a contractor) | 14 | 8 | 9 | 2 | Nine tiles, two filled buttons, “Put on a site” on six rows, codes (3-15). | 3-projects-contractors.png |
| /projects?scope=completed | 98 | 29 | 2 | 1 (add New project) | 18 | 10 | 6 | 1 | Tiles still count open projects (3-38). | 3-projects-completed.png |
| /projects/[id] (Ryan, In progress) | 397 | 58 | 27 | 1 (Review the ask for more time) | 10 | 13 | 6 | 0 | The ask shown four times; Needs you · 12 with two verbs a row; activity squeezed into a narrow column (3-01, 3-06, 3-07). | 3-p-overview.png |
| /projects/[id] (390 touch) | 132 | 25 | 10 | 1 (Review the ask for more time) | 3 | 13 | 5 | 2 | Truncated primary, brief before any state, FAB on Decline (3-09). | 3-p-overview-390.png |
| /projects/[id] (Marcus, Setting up) | 317 | 50 | 18 | 1 (Start the project) | 11 | 13 | 4 | 0 | “Start the project” three times; “Setting up” said five times (3-01, 3-31). | 3-p-setup-overview.png |
| /projects/[id] (Aisha, On hold) | 406 | 55 | 20 | 1 (Resume) | 10 | 13 | 6 | 0 | “Resume” three times; the hold reason quoted twice (3-01, 3-31). | 3-p-hold-overview.png |
| /projects/[id] (Shalini, Completed) | 297 | 42 | 8 | 0 | 7 | 13 | 7 | 3 | “Took 293 days” vs “50 days”; margin “over the expected 0%” in red; seven “--” rows (3-16, 3-32). | 3-p-done-overview.png |
| /projects/[id]/money | 290 | 48 | 14 | 4 (Review the ask for more time · Pay · Confirm · Change it) | 18 | 11 | 10 | 2 | The noisiest screen: four filled buttons, ~30 purple verbs, three help paragraphs, “Open” + ⋮ on every row (3-02, 3-05). | 3-p-money.png |
| /projects/[id]/money (390 touch) | 110 | 23 | 5 | 3 (Review the ask for more time · Pay · Confirm) | 1 | 10 | 6 | 2 | Two chip rows, “Next step · Open ⋮” on every card, three filled buttons (3-05, 3-08). | 3-p-money-390.png |
| /projects/[id]/tasks | 91 | 39 | 8 | 1 (Review the ask for more time) | 10 | 10 | 6 | 0 | Calm; “Add Task” Title Case vs the other tabs (3-12). | 3-p-tasks.png |
| /projects/[id]/tasks (390 touch) | 64 | 26 | 3 | 1 (Review the ask for more time) | 0 | 11 | 5 | 2 | Fine; the header’s cut primary repeats here (3-09). | 3-p-tasks-390.png |
| /projects/[id]/compliance | 227 | 38 | 11 | 1 (Review the ask for more time) | 13 | 12 | 8 | 0 | Two chip rows, an “ITEM” head per one-column table, Details on every row (3-08, 3-29). | 3-p-compliance.png |
| /projects/[id]/schedule | 344 | 54 | 9 | 1 (Review the ask for more time) | 6 | 12 | 9 | 3 | Summary + banner + eight toolbar controls + a legend paragraph; statuses cut (3-23). | 3-p-schedule.png |
| /projects/[id]/schedule (390 touch) | 173 | 24 | 5 | 1 (Review the ask for more time) | 0 | 9 | 9 | 5 | “Done” on every unfinished row, even ones not started (3-19). | 3-p-schedule-390.png |
| /projects/[id]/updates | 91 | 29 | 3 | 1 (Review the ask for more time) | 3 | 10 | 6 | 0 | Calm; the view chips look like filters (3-08). | 3-p-updates.png |
| /projects/[id]/updates (390 touch) | 89 | 24 | 2 | 1 (Review the ask for more time) | 1 | 11 | 6 | 2 | Fine. | 3-p-updates-390.png |
| /projects/[id]/messages | 136 | 39 | 1 | 2 (Review the ask for more time · Send) | 4 | 11 | 5 | 0 | Client tab › Messages › Client · Team chips; CLIENT tag on every message (3-13). | 3-p-messages.png |
| /projects/[id]/messages (390 touch) | 131 | 35 | 1 | 2 (Review the ask for more time · Send) | 2 | 12 | 5 | 2 | Views row scrolls cut; FAB over the composer (3-09, 3-13). | 3-p-messages-390.png |
| /projects/[id]/tickets | 115 | 32 | 1 | 2 (Review the ask for more time · add New ticket) | 3 | 8 | 6 | 0 | Filled “New ticket”; “Open (1) · Resolved and closed (0)” (3-12, 3-39). | 3-p-tickets.png |
| /projects/[id]/meetings | 78 | 31 | 3 | 1 (Review the ask for more time) | 8 | 10 | 5 | 0 | “Logged at Met”, “Deal score --” (3-14). | 3-p-meetings.png |
| /projects/[id]/questionnaire | 69 | 28 | 2 | 2 (Review the ask for more time · Add the studio’s questions) | 2 | 9 | 5 | 0 | Disabled Ask Client with no reason; filled empty-state button (3-33). | 3-p-questionnaire.png |
| /projects/[id]/choices | 177 | 34 | 5 | 2 (Review the ask for more time · Share again) | 6 | 13 | 6 | 2 | Three tags, option names cut, filled Share again (3-27). | 3-p-choices.png |
| /projects/[id]/choices (390 touch) | 157 | 29 | 4 | 2 (Review the ask for more time · Share again) | 3 | 12 | 6 | 2 | Same tags; reads better than the desk. | 3-p-choices-390.png |
| /projects/[id]/floor-plan | 215 | 62 | 6 | 1 (Review the ask for more time) | 4 | 13 | 7 | 0 | ~60 controls; four rows of chips and tools (3-28). | 3-p-floor-plan.png |
| /projects/[id]/designs | 79 | 28 | 2 | 1 (Review the ask for more time) | 4 | 9 | 5 | 0 | Calm; “3D LAYOUTS · 0 layouts shared” + “NOT SHARED”. | 3-p-designs.png |
| /projects/[id]/files | 105 | 48 | 3 | 1 (Review the ask for more time) | 2 | 8 | 5 | 0 | Calm; “New File” Title Case (3-12). | 3-p-files.png |
| /projects/[id]/files (390 touch) | 93 | 39 | 1 | 2 (Review the ask for more time · photo_camera) | 0 | 10 | 5 | 2 | Camera-first, fine. | 3-p-files-390.png |
| /projects/[id]/notes | 99 | 33 | 3 | 1 (Review the ask for more time) | 2 | 11 | 5 | 0 | “Added during stage movement — view only”; meeting time 2:00 vs 12:00 PM (3-42, 3-43). | 3-p-notes.png |
| /projects/[id]/activity | 341 | 51 | 1 | 1 (Review the ask for more time) | 2 | 9 | 5 | 0 | Fourteen type chips under the view chips; “System” as an actor (3-08, 3-45). | 3-p-activity.png |
| /projects/[id]/activity (390 touch) | 158 | 37 | 1 | 1 (Review the ask for more time) | 0 | 9 | 5 | 2 | Day groups read well; chips scroll. | 3-p-activity-390.png |
| /invoice/[token] | 142 | 1 | 3 | 0 | 10 | 8 | 4 | 0 | Clean paper; “Total due · Paid · Balance due” (3-03). | 3-invoice-token.png |
| /invoice/[token] (390 touch) | 84 | 1 | 1 | 0 | 6 | 8 | 4 | 0 | Clean. | 3-invoice-token-390.png |
| /receipt/[token] | 103 | 1 | 3 | 0 | 7 | 8 | 4 | 0 | Clean; “Still owed” vs the invoice’s “Balance due” (3-03). | 3-receipt-token.png |
| /receipt/[token] (390 touch) | 90 | 1 | 1 | 0 | 7 | 8 | 4 | 0 | Clean. | 3-receipt-token-390.png |
| /my/[slug] (390 touch) | 105 | 2 | 2 | 0 | 0 | 9 | 4 | 0 | Calm and clear — but the lede says “under way” over a card that says “paused” (3-10). | 3-portal-home-390.png |
| /my/[slug] (1440) | 158 | 4 | 5 | 0 | 0 | 12 | 4 | 0 | Eleven top tabs at a desk (3-36); same contradiction (3-10). | 3-portal-home.png |
| /my/[slug]/schedule (390 touch) | 144 | 10 | 3 | 0 | 1 | 9 | 6 | 0 | “YOU ARE HERE” on the paused step; invoices mixed in; “(n)” counts (3-52). | 3-portal-schedule-390.png |
| /my/[slug]/schedule (1440) | 188 | 10 | 4 | 0 | 1 | 9 | 6 | 0 | Same. | 3-portal-schedule.png |
| /my/[slug]/updates (390 touch) | 47 | 1 | 1 | 0 | 0 | 5 | 3 | 0 | Calm. | 3-portal-updates-390.png |
| /my/[slug]/money (390 touch) | 101 | 5 | 3 | 0 | 0 | 9 | 5 | 0 | Clear; tab name “Money” (3-02); “Mid-project” vs studio “Mid-Project” (3-49). | 3-portal-money-390.png |
| /my/[slug]/money (1440) | 150 | 12 | 6 | 1 (I have paid) | 1 | 9 | 6 | 0 | One filled button, good. | 3-portal-money.png |
| /my/[slug]/choices (390 touch) | 47 | 2 | 0 | 0 | 1 | 6 | 3 | 0 | “has your answers” while waiting; heading = tag (3-48). | 3-portal-choices-390.png |
| /my/[slug]/files (390 touch) | 81 | 6 | 6 | 0 | 5 | 8 | 3 | 0 | “Open” on every row; CAPS group heads (3-50). | 3-portal-files-390.png |
| /my/[slug]/messages (390 touch) | 76 | 7 | 1 | 1 (Send) | 0 | 8 | 4 | 0 | Calm; offers WhatsApp beside in-app messages. | 3-portal-messages-390.png |
| /my/[slug]/issues (390 touch) | 84 | 5 | 1 | 1 (Report an issue) | 1 | 7 | 6 | 1 | “Issues” here, “Tickets” in the studio (3-37). | 3-portal-issues-390.png |
| /my/[slug]/designs (390 touch) | 17 | 0 | 0 | 0 | 0 | 4 | 2 | 0 | Empty state — a section the client can’t use yet still has a tab (3-36). | 3-portal-designs-390.png |
| /my/[slug]/floor-plan (390 touch) | 94 | 20 | 1 | 1 (Confirm this layout) | 0 | 10 | 6 | 0 | Tool chips heavy for a homeowner; marks listed as “Text”, “Box” (3-28). | 3-portal-floor-plan-390.png |
| /my/[slug]/about (390 touch) | 108 | 3 | 0 | 0 | 0 | 4 | 1 | 0 | Calm. | 3-portal-about-390.png |
| /my/[slug] → bell (390 touch) | 109 | 3 | 3 | 0 | 0 | 9 | 4 | 0 | Answered asks still read as asks (3-35). | 3-portal-bell-390.png |

Dialogs, menus and sheets shot by script (no measure row): the project ⋮ (`3-p-kebab.png`, `3-p-kebab-390.png`), Stage ▾ (`3-p-stage-menu.png`,
`3-p-stage-menu-390.png`), Needs you expanded (`3-p-needs-more.png`), Start the project (`3-p-start-sheet.png`), Invite to Portal (`3-p-access-panel.png`,
`3-p-access-panel-ryan.png`), Mark done (`3-p-mark-done.png`), Contractors drawer (`3-p-crew.png`), the milestone panel (`3-p-review-ask.png`), Complete
handover (`3-p-handover-sheet.png`), Put on hold (`3-p-hold-dialog.png`), Money › New ▾ (`3-p-money-new.png`), an invoice panel
(`3-p-money-invoice-panel.png`), the listing's ⋮ · New project · scope menu · Filters · Deleted Projects (`3-projects-kebab.png`, `3-projects-new.png`,
`3-projects-scope.png`, `3-projects-filters.png`, `3-projects-deleted.png`), the portal's sign-in, code step and More sheet (`3-portal-login-390.png`,
`3-portal-code-390.png`, `3-portal-more-390.png`).
