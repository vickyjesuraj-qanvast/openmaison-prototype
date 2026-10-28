# Lane 1 — the shell and the day's work · screens measured (2026-10-27, :3301, Dane · Owner)

Columns: route · words · controls · purple text actions · filled buttons · uppercase · font styles · text colours · truncated · verdict.
Numbers are the shared measure's first screen (viewport). Shots in `ui-audit/shots/`.

| Route | Words | Controls | Purple | Filled | Upper | Fonts | Colours | Trunc | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| /dashboard (1440) | 321 | 47 | 17 | 0 | 4 | 12 | 5 | 0 | Calm frame, but Needs you is a 51-row inbox with ~26 verbs; the count is said three times; Pulse captions in CAPS. |
| /dashboard?scope=mine (1440) | 307 | 47 | 16 | 0 | 4 | 12 | 5 | 0 | Same; the greeting's link becomes a truncated Market Insights article title. |
| /dashboard (390 touch) | 123 | 24 | 11 | 0 | 2 | 10 | 3 | 4 | Rows go to three lines with a verb + ⋮ each; Studio/Mine takes its own row; 11 ⋮ in two screens. |
| /tasks (1440) | 406 | 134 | 63 | 1 (Add Task) | 22 | 12 | 7 | 6 | The noisiest screen in the lane: banner + 9 toolbar controls, OPEN / + Add Tags / Assign on every row, Tags column cut "+ Ad". |
| /tasks?scope=mine (1440) | 453 | 133 | 52 | 1 | 23 | 12 | 7 | 13 | Same; the third chip silently changes to "Upcoming · 13". |
| /tasks (390 touch) | 80 | 22 | 14 | 1 (+) | 0 | 10 | 5 | 0 | Chips lose their words (icon + number); banner eats the top; page is 10,104px of tall cards. |
| /tickets (1440) | 191 | 9 | 0 | 1 (New ticket) | 3 | 7 | 5 | 0 | Simple, but every card leads with T-/P- numbers and an IN PROGRESS tag; "Waiting on Benjamin" under Germaine's avatar reads backwards. |
| /tickets (390 touch) | 189 | 9 | 0 | 1 (+) | 3 | 7 | 5 | 3 | Readable cards; the FAB covers "Waiting on Ryan". |
| /chat (1440) | 194 | 14 | 0 | 1 (New message ▾) | 6 | 11 | 5 | 6 | Five caps kind tags; two rows named "HDB 5-Room — Benjamin Han"; empty pane explains the taxonomy. |
| /chat?c=<project> thread (1440) | 374 | 28 | 0 | 2 (New message ▾, Send) | 9 | 12 | 5 | 6 | Two filled buttons; "… read this on their page" said twice; suggested replies are good. |
| /chat (390 touch) | 167 | 14 | 1 | 0 (outlined +) | 6 | 8 | 6 | 6 | Header + is outlined here but filled on Tasks/Tickets; FAB over the list's times. |
| /profile (1440) | 177 | 10 | 4 | 1 (Save changes) | 0 | 9 | 4 | 0 | Clean structure, but nine explanatory sentences; "Hangout pages", "notices". |
| /profile (390 touch) | 115 | 6 | 0 | 1 | 0 | 8 | 3 | 0 | Fine layout; same paragraphs. |
| /sign-in (1440, signed out) | 67 | 6 | 4 | 1 (Send me a code) | 0 | 7 | 4 | 0 | Good — one field, one button; four lines of small print. |
| /sign-in (390 touch) | 67 | 6 | 4 | 1 | 0 | 7 | 4 | 0 | Good. |
| /qanvast-ops (1440, for the rail label) | 149 | — | — | 1 (Add Lead) | 8+ | — | — | 1 ("CREAT…") | "Qanvast Ops" name; a "Studios" tab on a studio's app; two caps status tags per row. |

## Overlays and states (shot, not measured)

| Surface | Shot | Verdict |
|---|---|---|
| Rail collapsed | 1-dashboard.png | Six red badges at rest, six meanings. |
| Rail expanded | 1-rail-expanded.png | 13 items; badges stay on the icon corner; "Qanvast Ops"; order Projects before Leads (phone is the reverse); studio block "Dane Bruce Lee". |
| Studio block / View as | 1-view-as.png | 20 rows: your profile + sign out buried among demo-only View as and six insider plan states. |
| Tools popover | 1-tools.png, 1-tools-help.png | Quotes/Contracts sit with AI tools; two 3D tiles; product names need the hover help (none on a phone). |
| Company popover | 1-company.png, 1-phone-company.png | Every help line truncated; COMPANY + STUDIO stacked eyebrows; three words for approval counts. |
| ⌘K search | 1-search-empty/-money/-payments/-ben.png | Strong tool; Quotes filed under "Tools"; folders outrank pages; "LEAD" vs Messages' "CLIENT". |
| Bell (Notifications) | 1-bell.png, 1-bell-scrolled.png, 1-phone-bell.png | DUE group duplicates Your day; each row says its date twice; "also by email and WhatsApp" on nearly every row; inline Approve buttons duplicate the Dashboard. |
| Maison AI FAB sheet | 1-maison-sheet.png, 1-phone-maison.png | A different door from the Dashboard's dock; holds a "Keyboard shortcuts" button. |
| Maison AI dock answer | 1-dash-dock-answer.png | Good answer card; its "3 invoices" contradicts Pulse's "2 invoices"; money in a third format. |
| ? shortcuts panel | 1-shortcuts.png | Useful; switch copy is cryptic; usage meter is noise. |
| Dashboard Review pane | 1-dash-review.png, 1-dash-review-390.png | One filled button (fine); amount differs from the row; two-line title; "leaves 23.8% against the quote". |
| Dashboard page ⋮ | 1-dash-pagemenu.png | "Pulse" is a name the page never shows. |
| Dashboard row ⋮ | 1-dash-row-menu.png | Send back · Open · Not today · Ask about this — fine. |
| Dashboard Since popover | 1-dash-since.png | CAPS eyebrows; an article mixed with studio events. |
| Dashboard chips / Show all | 1-dash-chip-*.png, 1-dash-showall.png | Chip counts never add to the head count; Show all unrolls 51 rows in the card. |
| Snackbar | 1-snackbar.png | "On site hidden — only for you · Undo" — on the house snackbar, fine. |
| Tasks scope / kebab / row ⋮ / filters | 1-tasks-scope.png, 1-tasks-kebab.png, 1-tasks-rowmenu.png, 1-tasks-filters.png | Unassigned in pill AND chip; "Delete all" in the page ⋮; Title Case items; Sort lives inside "Filters". |
| Task panel | 1-tasks-panel.png | "Lead" label on a project; due date twice in two formats; "subcontractor or supplier". |
| Messages + / New message | 1-chat-plus.png, 1-chat-new.png | Clear menus with helpers — fine. |
| Ticket drawer | 1-ticket-open.png | Two caps tags, two filled buttons, "Looked after by", "Escalate". |
| New ticket | 1-ticket-new.png | "Which project is this ticket for?" — fine. |
| Phone More / You / Tools / search | 1-phone-more.png, 1-phone-you.png, 1-phone-tools.png, 1-phone-search.png | More sheet clean; You sheet repeats the desk's 20-row View as. |
| L1 / L2 headers | 1-head-*.png | Create verbs and header kits differ per module; L2 meta chips in CAPS. |
| Ghosts (JS off) | 1-ghost-*.png | Dashboard, Tasks, Messages, Profile ghosts match; Tickets ghost has pill chips and one row too many. |
