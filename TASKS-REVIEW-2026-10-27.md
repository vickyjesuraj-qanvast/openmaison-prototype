# Tasks review — Dane, 2026-10-27

Dane's review of the Tasks module (the rail's Tasks `/tasks`, a lead's Tasks tab, a project's Tasks). Every change below is visible,
so each waits for Vicky's approval before it merges. Branch `uat-dane-2026-10-01`.

## Changes made

1. **Room between the scope pill and the All · Leads · Projects switch** (the rail's Tasks) — they touched; the switch now sits 8 after
   the pill, as the to-do chips sit after it. The loading ghost follows. Files: `components/leads/tasks/tasks-toolbar.module.css`
   (`.source`, `.sourceGhost`), `components/leads/detail/tab-ghosts.tsx`.
2. **Phone: the search opens the Leads listing's way** (the rail's Tasks, ≤767) — the open box used to drop to a second line under the
   "All Tasks ▾" pill, pushed to the right. Now, as on Leads (REG-375): while the search is open (or holds words) the pill steps aside
   and the box has the first row from the left edge, Filters at the right; the to-do chips already stepped aside. Closing it brings
   the pill back. A lead's and a project's Tasks tab and the desk are unchanged. File: `tasks-toolbar.module.css`.
3. **One search box on touch, app-wide** (reaches past Tasks — Dane's pick of two). On a phone and a touch tablet, only the Leads
   listing's search was made for a finger: 44 tall, typed at 16 (so iOS never zooms in), a 44 clear. Tasks, Tickets and the other
   toolbars kept the desk's 36 box typed at 14/semibold. Those three rules now live in the house piece
   (`components/om/toolbar-search.module.css`) and the Leads toolbar's copy is gone (`components/leads/toolbar.module.css`), so every
   page's search is the Leads one. Checked at 390 and 768 (touch) and 1440 on Leads, Tasks, Tickets, Tools › Quotes, Contracts,
   Projects and a lead's Files · Notes · Quotes tabs: 44 / 16 on touch, 36 / 14 at the desk (unchanged), nothing past the screen's edge.
   The other users of `ToolbarSearch` (Hangouts, Messages, Choices, Updates, Market Insights, Marketplace, Qanvast Ops, the Navigator,
   the template picker, Meetings, Client portal clients, Usage, the library galleries) follow without being opened one by one.
   - For Vicky: an app-wide change to a house piece.
4. **The to-do chips say their words on touch** (the rail's Tasks: Overdue · Due today · Upcoming · Unassigned). On a phone (and a
   tablet) they showed only a glyph and a count, their words in a tooltip a finger can't reach. Now, on a phone and a touch tablet, each
   chip reads "Overdue · 9", and they sit in one row of their own under the pill and the tools that swipes sideways when they don't all
   fit (no scrollbar drawn); the row runs to the screen's edges, so a chip slides off the edge rather than being cut at the content's
   24 margin, and at rest the first chip still lines up with the pill (at the end of a swipe the last one does with the tools). A mouse keeps today's behaviour: the full words at the desk, glyph + count with the tooltip where the row is
   narrow (a 1024 with a mouse, an expanded rail). Dane's pick of two (the other: a To do group in the scope's sheet). Files:
   `tasks-toolbar.tsx` (`spelled`), `tasks-toolbar.module.css` (`.todos[data-spelled]`, the touch tablet's own line, the ghost's chip
   widths on touch), `tab-ghosts.tsx`.
   - For Vicky: reverses part of the responsive audit's W2-04 ("a phone's chips … say only their glyph and count").
5. **Phone: "Add a task…" docked edge to edge** (the rail's Tasks, a lead's and a project's Tasks tab, ≤767). It was a bordered card
   inset by the page's gutter, and the Maison AI button (16 from the screen's edge) sat over its right corner. Now it is a full-width
   plate with its top rule, the way the bar is drawn on a touch tablet (L4's "docked like the bar it replaces"): the + lines up with the
   task cards, and the button rests inside the bar's kept right end, clear of the field (field ends 318, button starts 326 at 390).
   When the list is short the bar sits under the last card as a ruled line rather than a card. The loading ghost follows (same class).
   Touch tablet and desk unchanged. Files: `quick-add.module.css` (≤767 `.quick`, `--quick-gutter`), `lead-tasks.module.css`
   (`.tab[data-studio]` sets the gutter to 24; a lead's / project's page uses 16).
   - For Vicky: reverses L4's phone card (Leads on the move, P-10 · C-06).
6. **Phone: the quick add's chips are no longer cut short** (the same three places, ≤767). While "Add a task…" is in use its chips row
   (Tomorrow 10:00 · In 3 days · Next week · Pick a day · Assign · the lead) stopped at the corner the bar kept empty for the Maison AI
   button, so the third chip was sliced mid-word. Now, while the quick add is open, the Maison AI button slides away (the same slide it
   does on a scroll) and comes back when the field is let go; the chips row runs to the screen's edges and swipes, as the to-do chips do
   (change 4): at rest the first chip lines up with the +, at the end of a swipe the last one sits at the gutter. Files:
   `quick-add.tsx` (`data-hides-fab` while open), `quick-add.module.css` (`.quick[data-open]`, `.opts`),
   `components/shell/maison-fab.module.css` (a phone's button steps away while anything marked `data-hides-fab` is on the page).
   - For Vicky: a house piece (the Maison AI button) gains a rule; only the Tasks quick add uses it. Reverses C-08's "the row's right end
     stays clear for the button" while the row is in use (at rest the bar still keeps the corner).
7. **The quick add's "Studio" pill at its neighbours' size** (the rail's Tasks, phone and touch tablet). The lead picker at the end of the
   chips row was the toolbar select (36 tall, regular weight) beside 44-tall semibold chips. In the quick add it is now 44 tall in the
   chips' 14 semibold, with the larger chevron; it still opens the same Lead list. The desk's add row keeps its table-cell size. Files:
   `tasks-table.tsx` (`LeadPickerCell size`), `lead-tasks.tsx` (`size="m"`), `quick-add.module.css`.
8. **Phone: "Add a task…" rests on the bottom navigation when the list is short** (the rail's Tasks, a lead's and a project's Tasks tab,
   ≤767). With one or two cards (e.g. My Tasks + Overdue) the bar sat right under the last card, halfway down the screen, with empty page
   below. Now the list fills the page's height and the bar sits at its foot: on the dock (rail's Tasks), on the project's site bar
   (Photos · Done · Note · Message), at the screen's foot on a lead (no dock there). Long lists unchanged: the bar stays docked while
   scrolling, and at the very end the last card still clears it by the list's 12 (an overlap of up to 34 found on the way, fixed too).
   On a Tasks tab with the bar, the lead's / project's page drops the band it kept under every tab for the Maison AI button — the bar
   keeps that corner itself. Files: `tasks-table.module.css` (`.phoneList` fills, `--quick-pull`), `quick-add.module.css`
   (`margin-top: auto`), `lead-tasks.module.css` (`.tab[data-studio]`'s pull = its padding against the dock),
   `app/leads/[id]/overview.module.css` (`.centre:has(task-quick-add)` — the band off; a project composes it).
   - For Vicky: touches the lead page's frame (`--fab-clearance`), only while a Tasks tab with the bar is open on a phone.
9. **Phone: the rail's Tasks lines up with its title** (≤767). The page's body sat 24 in while the "Tasks" title above it sits 16 in, as on
   Tickets, Tools › Quotes, Projects and Leads; the toolbar, chips and cards now start at 16 too (measured: title 16, content 16 on all
   five). The edge-to-edge rows follow (the to-do chips of change 4, the quick add of changes 5–8), and the long list's end still clears
   the bar. Tablet and desk unchanged (24 there, as the others). The loading ghost uses the same frame. Files: `lead-tasks.module.css`
   (≤767 `.tab[data-studio]`), `tasks-toolbar.module.css` (the phone's `.todos[data-spelled]` bleed 16), `components/shell/list-ghosts.tsx`
   (comment).
10. **"View all" beside the scope pill, as on Leads** (the rail's Tasks, desk and phone — Dane's ask, after the Leads listing's Dane's UAT
   1.05). While the pill holds a narrower scope (My Tasks · Unassigned · Studio Tasks) a "View all" text button sits 8 after it; one press
   returns to All Tasks — the scope only: search, Filters, the All · Leads · Projects switch and a picked to-do chip stay, as Leads keeps
   search and Filters. Hidden at All Tasks. Where the row has no room for it beside the pill and the tools (a phone at 320 with "My Tasks
   (15)") it folds away, measured, exactly as Leads' does — the pill's sheet still opens on All Tasks. Checked at 1440, 1024 (mouse), 768
   (touch), 390 and 320. Files: `tasks-toolbar.tsx` (`viewAll`, the fold measure), `tasks-toolbar.module.css` (`.viewAll` composes the
   Leads toolbar's).
   - Fixed on the way — **a bug from change 4:** on a touch tablet the scope pill's menu opened ~4,000px down the page (the scope box steps
     aside for the chips' own line, and the menu lost its anchor). The pill and its menu now sit in their own box (`.pillWrap`); the menu
     opens under the pill again.
11. **A divider between "View all" and the All · Leads · Projects switch** (the rail's Tasks, desk and tablet — Dane's ask). The bulk
   bar's vertical rule (1×24, surface-variant, `detail-bulk-bar.module.css .rule`), centred on the row, at an equal gap each side (8 at the
   desk; on a touch tablet the row's own spacing, 24 each side). Only while both stand there: not at All Tasks (no View all), not on a
   phone (the switch lives in the pill's sheet), and it leaves when View all folds. Files: `tasks-toolbar.tsx`, `tasks-toolbar.module.css`
   (`.viewAllRule`).
12. **"View all" sits as close to the pill as on Leads, on a phone and a tablet** (Dane: "too far apart" on mobile). There the scope box
   steps aside for the chips' own line, so the row's 16 gap stacked on the link's 8: the words started 32 after the pill. Now 16 at every
   width, measured against the Leads listing (16 at 390 and 1440). On a touch tablet the rule and the switch follow (8 apart, as at the
   desk, instead of 24). And the fold now reads the pill's full words: at 320 "Studio Tasks (2)" was squeezed to "Studi…" to keep View all
   beside it; now View all folds there and the pill reads whole (390 keeps both). Files: `tasks-toolbar.module.css`, `tasks-toolbar.tsx`
   (the fold measure).
13. **The swipe rows move sideways only** (Dane, on his phone: swiping the to-do chips moved the whole row every way). Each chip's 44 touch
   box stands 4 above and below its 36, so the row held 40 of content in 36 and could also scroll up and down; a real finger's swipe found
   that. Now the row scrolls sideways only, and those 4 are room inside it (given back outside, so nothing moves and no touch target is
   cut): measured, content 44 in 44 at 390 and 768. The quick add's chips row (changes 6–7) gets the same sideways-only rule. Files:
   `tasks-toolbar.module.css` (`.todos[data-spelled]`), `quick-add.module.css` (`.opts`).
   - Not checked on a real device here (Playwright has no finger physics) — worth Dane re-trying on his phone.
14. **Phone: adding a task happens in a bottom sheet** (the rail's Tasks, a lead's and a project's Tasks tab, ≤767 — Dane's ask: the
   inline row grew over the list beside the dock). The docked "+ Add a task…" bar stays (changes 5 and 8) and is now one button; a tap
   opens the house `Sheet` over the dock, titled **"New task"**: the title field focused (the keyboard comes up), the due presets wrapping
   on their own lines, then Assign and (on the rail's page) the lead, and **Add** at the foot — off until there is a title. Add saves and
   closes the sheet; the snackbar says "Task added · due …". The ✕, the scrim and Esc let it go. The header's + › Create New Task opens the
   same sheet. Assign, the lead picker and Pick a day open above it and come back to it. The touch tablet (no dock) keeps the inline row.
   Files: `quick-add.tsx` (`sheet`, the at-rest button, the sheet), `quick-add.module.css` (`.rest`, `.sheetForm`).
   - **Supersedes change 6 on a phone:** the Maison AI button no longer needs to step away (nothing grows in the bar), so that rule is
     gone from `components/shell/maison-fab.module.css` (the house piece is back as it was) and the bar's open-state rules with it.
   - Changed behaviour: the inline row kept the field for the next task after Enter (REG-257's chain); the sheet closes after Add, so a
     second task is a second tap on the bar.
   - For Vicky: **invented copy** — the sheet's title "New task".
15. **The New task sheet's layout** (Dane's follow-up to 14). The due presets are **one row that swipes sideways** (Tomorrow 10:00 · In 3 days
   · Next week · Pick a day), out to the sheet's edges with the first chip on the field's line, sideways only (change 13's rule). **Assign
   and the lead ("Studio") moved into the foot**, on its left, with **Add on its right** — one bar. Below 360 the house foot sends its left
   group to a line of its own (`dialog.module.css`, fix-E · W6); this sheet keeps one bar there and the lead's name shortens instead (at
   320 "Studio" reads "Stu…"). Files: `quick-add.tsx` (`dues` · `who` split, `FootStart`), `quick-add.module.css` (`.sheetForm .opts`,
   `.sheetPicks`, the ≤359 override).
   - For Vicky: overrides the house foot's narrow-phone wrap for this one sheet.
16. **The sheet's Assign and lead pickers at Add's height** (Dane). They stood 44 tall beside the 36 Add; now all three are 36 (measured at 390
   and 320), aligned on one line. A finger still gets 44: an invisible box above and below, as the house select does
   (`select-trigger.module.css`). The inline row on a touch tablet keeps its 44 chips. File: `quick-add.module.css` (`.sheetPicks`).
17. **No grey band between the sheet and the keyboard** (Dane, on his phone). With the keyboard up the phone scrolls the page past its foot
   to keep the field in sight, and the gap showed the page's canvas — the app's grey (`surface-bg`, #F2F2F2). While the New task sheet is
   open the canvas is white (`body:has([data-task-sheet])`), so the gap reads as the sheet; it is grey again once the sheet closes
   (measured: 242 → 255 → 242). Files: `quick-add.tsx` (`data-task-sheet`), `quick-add.module.css`.
   - Not verifiable here (no phone keyboard in the test browser) — Dane to re-check on his device.
   - For Vicky: every house `Sheet` with a text field likely shows the same grey band on a phone; only this one is changed.
18. **A new task's purple band drawn as the Leads card's** (the task cards — the rail's Tasks, a lead's and a project's Tasks tab on a phone).
   The band was an inset shadow inside the card's 1px border, so the grey border showed outside it and its inner edge curved in at the
   corners. Now it is the Leads card's band (`lead-cards.module.css .band`): a straight 4px strip on the card's left edge with the card's
   rounded corners, laid over the border. File: `task-card.module.css` (`.card[data-unseen]::before`).
19. **Phone: the approvals strip is one button** (the rail's Tasks, ≤767 — Dane: "untidy"; his pick of three). The sentence wrapped and
   "Open Dashboard" sat alone at the right on a line of its own. Now the whole strip opens the Dashboard (with the way back to Tasks): the
   glyph, "5 approvals wait for you on the Dashboard" and a › at its end, no separate link; one press anywhere on it. Its screen-reader name
   keeps "— Open Dashboard". Tablet and desk keep the strip with its link. The loading ghost draws the › on a phone. Files:
   `components/tasks/approvals-line.tsx` (`phone`), `approvals-line.module.css` (`.whole`, `.chev`, the ghost's), `components/shell/list-ghosts.tsx`.
   - Rejected options: the link under the words, left; shorter words on one line.
   - Left-aligned words (Dane saw them centred on his phone): the strip's `text-align: left` is now order-proof (`.whole.whole`, plus the
     words' own) against a button's centred text; checked in Chrome and WebKit (Safari's engine) at 390 — both lines start at the same x.

## Notes for Vicky (out of this review's scope)

- **Tickets on a phone: the open search covers the scope pill.** Found while comparing for change 2. Tickets' search box opens over
  "Open (5) ▾" and hides part of it — a side effect of Tickets review change 3 (the phone's scope dropdown). The fix would be Tasks'
  change 2: the pill steps aside while the search is open (`.bar:has([data-om-search-open]) .chips { display: none }` at ≤767 in
  `components/projects/tickets/tickets.module.css`). Dane chose to keep this review to Tasks.

## Merged into main — 2026-10-28 (Vicky's word: "merge and pull them across")

Your review is in `main` and `uat-dane-2026-10-01` (merge `80221c1e`; register REG-3373…3392). It met the calm UI build — Vicky's
whole-app pass for one vocabulary and less noise (`design-source/context/ui-audit-2026-10-27/`). Your behaviour and layout were kept,
the build's words were put on your strings, and where the build had already moved or removed what you changed, the build's structure
stands. Full record: `design-source/context/ui-audit-2026-10-27/build/merge-dane-2026-10-28/M1.md`. Pull `uat-dane-2026-10-01`.

| # | What happened |
|---|---|
| 1 | **Superseded** — the All · Leads · Projects switch now lives inside the scope pill's menu at every width; nothing beside the pill to space |
| 2 | Kept |
| 3 | Kept — the house search is 44 / 16 on touch app-wide |
| 4 | Kept — and it made the calm build's own "a phone's chips keep their words" (1-27) real; the house pill had been hiding them |
| 5 | Kept |
| 6 | Superseded by your own 14 |
| 7 | Kept the size; the pill reads **"General"** (the build's word for a task with no lead), not "Studio" |
| 8 | Kept |
| 9 | Kept |
| 10 | Kept, adapted — the pill also holds whose tasks now, so View all resets the scope and the Leads / Projects choice together (Vicky may ask for scope only) |
| 11 | **Superseded** — nothing stands after View all to divide from (see 1) |
| 12 | Kept for View all; the rule / switch parts went with 11 |
| 13 | Kept — still worth a re-try on your phone |
| 14 | Kept — and arriving with `?add=1` (the Dashboard's add, a log's Add tasks) now opens the sheet |
| 15 | Kept |
| 16 | Kept |
| 17 | Kept — re-check on your phone |
| 18 | Kept |
| 19 | **Superseded** — the build gave approvals one home (the Dashboard); the strip is gone from /tasks and its ghost. Your edits to `approvals-line.*` are in the tree, unused |

Words you'll see that differ from your notes: "issue" for ticket on screen, "General" for Studio, sentence case on menu group titles.
