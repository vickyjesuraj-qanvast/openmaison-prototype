# Leads on the move — L4's outcome: the lead's tabs on a phone and a tablet (2026-10-23)

His marks on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh (Build on P-10 · P-11 · P-12 · P-13 and the fixes C-02 · C-03 · C-08 · C-10; every
question as recommended — Q-01 a tablet upright follows the phone), then "continue the leads". Built in a clean worktree of main `f85e0e94`, on
the lane DB, verified on a production build on :3194. Nothing committed. The staged register rows: `reg-l4.md` (REG-L4.1 … L4.18).

## 1. Ledger — every id assigned to L4

| Id | What | Built where · kept why · not done why |
| --- | --- | --- |
| **P-10** | Tasks on the move (module-wide) | **Built.** Phone cards (`components/leads/tasks/task-card.tsx` · `task-card-words.ts`): the 44 ring, the name whole at 16, the due chip at 14 (its day and hour; late in red with "· late"; "Today", "Tomorrow"), who, the comments' count, a project's milestone, whose task on /tasks; a tap opens, a hold selects. The quick add (`quick-add.tsx`) on a phone and a touch tablet: title + a due preset + who in one docked row, Enter / Add, the chain. The due presets (`due-presets.tsx`). The bar of three. The panel opens on the task (`task-panel.tsx` `compact`). Tablet column sets for Tasks, Meetings, Files with the ⋮ frozen. The rail's /tasks and a project's Tasks get all of it (one `TasksTable` · `LeadTasks`). |
| **P-11** | Files open on the camera | **Built.** `files-toolbar.tsx` phone row: Take a photo (filled; `capture="environment"`) · Search · ⋮ (Choose files · New folder · Filters · Deleted Files · the folder's rows); photos land in the open folder, the snackbar names where and offers Take another (`use-file-upload.tsx` `PhotoRun`); the toast steps away on a phone once everything landed; the empty Files and an empty folder offer Take a photo; a Create from elsewhere opens the camera on a phone. The viewer pinches, pans, double-taps and swipes (`use-pinch-swipe.ts`); Information is a short sheet; Comments name the file. |
| **P-12** | Meetings · Questionnaire · Activity read first | **Built.** Meetings: the whole card opens (`meetings-table.tsx` `phone`), the card at the scale, the meeting page's move in a 48 sticky foot on ≤1024 (`room/meeting-room.tsx` `footed`). Questionnaire: "n to answer · n answered" + To answer · Answered on top (`lead-questionnaire.tsx` `compact`), the by-line in the answer, Ask the client's ticks as full-width rows. Activity: by day, runs folded, rows 44 with a chevron, newest 20 + Show older (`activity-days.ts` pure + `lead-activity.tsx` `feed`). |
| **P-13** | The scale on the tabs | **Built** under the two queries, desk untouched: names 16 (task, note, log, file, folder, question, comment), values 14 (dates, counts, chips, the privacy line, a template's count, the summary's legend), inputs 16, feet 48 where the tab owns the foot (the task sheet's Mark as Completed, the meeting foot, the empty Files buttons). See C-17 · C-18 · C-19 · C-20 · C-22. |
| **C-02** | The Tasks toolbar's hit boxes shifted 22–24px | **Built (bug fix).** The `::after { inset }` overlays on IconButton classes removed — `tasks-toolbar`, `task-panel`, the tasks row kebab, `meetings-toolbar`, the meetings row actions (and the DS-button overlays in the Questionnaire, now `min-height`). The lint rule `icon-button-overlay` extended (`scripts/design-lint.mjs` `iconButtonClasses`): a `::after` with an edge on a class a module hands to `<IconButton className>`. At today's counts it found one more file — `components/templates/editor/structure-pane.module.css:34` — added to the baseline at 1 (not this package's file; see For other packages). Five files' counts went down. |
| **C-03** | A task's checkbox hittable in a 24 band | **Built**, the Quotes card's way: the phone card has no checkbox — a hold selects, then taps toggle; every press on the card is a 44 (ring, name, due, Assign, comments, ⋮). The click a phone fires at the end of a hold is the hold's — swallowed in the capture phase, so a hold on the ring or the name never completes or opens the task (probed with the click a device sends). |
| **C-04** | The bulk bar pushes Delete off | **Built:** a phone's bar is Mark done · Assign · More… (Save as Template · Duplicate · Delete in a sheet); measured inside 390. |
| **C-05** | A task's name cut at 19 characters | **Built:** the name at 16 on up to three lines; the second line is the due chip and who. |
| **C-06** | Create New Task takes a title only | **Built:** the quick add (title + preset + who in one row, Enter saves the chain). |
| **C-07** | Tables keep the desk's width on a tablet | **Built:** `tabletHidden` sets for Tasks (+ the rail's and a project's), Meetings, Files; tablet tracks; the ⋮ frozen right with its head; Edit / Open step out; remembered per breakpoint. |
| **C-08** | Maison AI covers a row's control at rest | **Built — the tabs' half:** the quick add, the Notes composer and the meeting foot keep the button's corner empty, so at rest it sits inside their bar, never on Add / Save / a foot button (REG-381's step-over of the composer reversed: it put the button on the list's last card). **Not mine — the frame's half:** a card's ⋮ mid-list (Files tiles, Questionnaire's pencil, Meetings, Activity) is under the button whenever that card rests at the button's place; that is the tab frame's rule (L1 — see For other packages). |
| **C-09** | No Take a photo | **Built** (P-11). |
| **C-10** | The attachment tile's time runs under its ⋮ | **Built (bug fix, every width):** the day only ("30 Aug ’26"), ellipsised, the time in its tooltip and the tile's label; phone list rows; a tablet's caption clears the 44 box. **The one 1440 change of this package** (see §6). |
| **C-11** | A meeting card opens only from its title | **Built.** |
| **C-12** | Activity a 4,643px flat log | **Built** (P-12). |
| **C-13** | Ask the client's ticks ragged on touch | **Built:** one column of full-width 44 rows, words at 16. |
| **C-14** | Notes upright is master-detail 280 + 268 | **Built:** 768–1024 upright follows the phone (cards, sheets, the docked composer; `TABLET_UPRIGHT` in `lead-notes.tsx`, the notes stylesheets' phone blocks widened); 1024 sideways keeps list + pane. The quick-links strip at 768 upright is the frame's (L1). |
| **C-15** | A folder splits the toolbar into two rows | **Built:** ← and the folder's name, the same three glyphs, one ⋮. |
| **C-16** | The title "A…" at 320 | **Built:** three glyphs; "All Files" whole at 320 (measured). |
| **C-17** | Names, dates, chips at 10–12 | **Built** (P-13), incl. the house folder card's name / count on a finger. |
| **C-18** | The tabs' sheets' feet drawn 36 | **Built where the tab owns the foot** (not in L4's absorbed list, done under P-13): Mark as Completed, the note's and the log's Cancel · Save, the comments' Submit, the meeting foot, the empty Files' buttons — 48 on a phone. The house dialogs' own feet (Filters' Clear All · Done, Ask the client's Send) are one shared piece (`components/om/dialog.module.css` · `sheet` · `drawer`) — left for a house round (For other packages). |
| **C-19** | Sort radios 24 tall | **Built, module-wide:** `components/om/filters-modal.module.css` — on a finger the radio stretches over its 44 row (shared piece). |
| **C-20** | The due picker is a calendar first, its controls 24–32 | **Built:** the presets before the calendar (quick add, the panel's When); the house picker's phone sheet has 44 controls (month, Today, ‹ ›, years, time selects, Done — `components/om/date-picker.module.css`, shared piece). |
| **C-22** | The phone composer types at 14 | **Built:** title and body at 16, 44 tall (phone and tablet upright). |
| **C-23** | The viewer has no pinch and no swipe | **Built** (P-11). |
| **C-24** | The panel opens on Creator; the date twice | **Built** (`compact` order; one date). |
| **C-25** | The Questionnaire summary last; 10px "By Studio" | **Built** (the count line on top; the by-line at 14). |
| **C-26** | The meeting page's Save scrolls away | **Built:** the foot at 48 on ≤1024; the head keeps title, chips, ⋮. |
| **A-09** | Add Task from a card takes no due date | **The piece is built** (`DuePresetChips`, `presetDate`); the listing card's Tasks sheet is L3's file (`components/leads/tasks-popover`) — For other packages. |
| C-01 · C-21 · C-27 | — | C-01 fixed ahead (REG-2656). C-21 is L2's (the log sheet). C-27 is L1's (the tab frame). |

## 2. Decisions taken (▲ for him)
- ▲ **The phone's task card has no checkbox** — a hold selects (the Quotes list card's model, A-20), not Items' (K2 kept its checkbox). C-03's fix offered both; the drawn screen 5 shows none.
- ▲ **"Mark done"** in a phone's bulk bar (the brief's "Done"; "Mark as completed" does not fit 320). Desk keeps "Mark as completed".
- ▲ **No due date is a valid quick add** — no preset is lit until tapped; a second tap on a lit preset takes it off. "Next week" = the coming Monday at 10:00 (a Monday's next week is the Monday after); every preset lands at 10:00.
- ▲ **The quick add is on a touch tablet too** (C-06's evidence was 390 and 768); a desk keeps the inline add row.
- ▲ **Tablet sets:** Tasks = Title · Members · Due date · Status (the rail's: Title · For · Members · Due date — the ring says done); Files = Title · Owner · Updated; Meetings = Meeting · When · Status. A task's attachments' count steps out on a tablet (its panel lists them).
- ▲ **The attachment tile says the day, not the time, at every width** (C-10's own fix) — the time stays in the tooltip and the label. The one 1440 pixel change here.
- ▲ **REG-381 reversed in part:** the Maison AI button no longer steps over the phone's Notes composer; it rests in the composer's tool row, Save to its left (C-08).
- ▲ **Files on a phone: Take a photo is the filled glyph and the ⋮ holds Choose files** (one tap further); "From Google Drive" (Coming soon) is not on the phone's menu.
- ▲ **Activity's run words** fold the same thing by the same person on the same day: "{who} {did} n {things}." — or "… — n times." when every line opens the same record — or "… — and n more like it.".
- ▲ **Questionnaire's chips default to To answer** while anything is open; the summary card stays last for who answered and when the client was asked.
- ▲ **"Deal score 57 · Cool"** on the phone's meeting card (the figure was unexplained).

## 3. Shared pieces changed
- `components/om/filters-modal.module.css` — C-19: on a finger the Sort radio stretches over its 44 row (every Filters modal: listing · Tasks · Quotes · Contracts · Projects).
- `components/om/date-picker.module.css` — C-20: 44 controls in the phone sheet (head, Today, pager, years, time selects, Done).
- `components/om/folders/folder-card.module.css` — C-17: a folder's name 16 / count 14 on a finger (every library's folders).
- `components/leads/tasks/detail-bulk-bar.*` — unchanged; the phone's three actions are the hosts' (`lead-tasks.tsx`).
- `components/leads/files/use-file-upload.tsx` — additive: `upload(list, parentId, photos?)` (`PhotoRun`), and on a phone the toast steps away once all landed (the Overview's FILES card, L1's, uses the same hook).
- `scripts/design-lint.mjs` + `design-lint.baseline.json` — the rule's extension; five counts lowered; `structure-pane.module.css` added at 1.
- `design-source/verify/regression/probes.cjs` — `rl-l4` and `ke` registered.

## 4. For other packages
- **L1 (the frame).** (a) **C-08's frame half:** at ≤767 the Maison AI button at rest still covers a card's right edge mid-list on Files, Questionnaire, Meetings and Activity — the TabScreen should step it out (REG-2602's way, Maison AI in the bar's ⋮) or carry it in the bar; the Tasks quick add, the Notes composer and the meeting foot already keep its corner (`:global(body:has(button[aria-label='Maison AI']))` reserves the slot — if the FAB leaves a tab screen, the slot is just padding). (b) **C-14's last part:** the quick-links strip still stands at 768 upright on Tasks / Files / Notes (`quick-links.module.css` has the rule for two tabs). (c) My bodies keep their tab toolbar's own title (`h2`, the house tab toolbar's `.title`) — inside a TabScreen whose bar already says "Tasks", hide it there (CSS on the frame) or tell me which prop you want. (d) A Create from the Lead screen's Files row: dispatch `CREATE_EVENTS.files` — on a phone the tab now opens the camera; for a Take a photo of your own, `useFileUpload(leadId).upload(files, null, { where: 'All Files', again })` and an `<input type="file" accept="image/*" capture="environment">`. (e) The Overview's task panel (`task-panel-host.tsx`, mine) passes `compact` on a phone / touch tablet already. (f) The meeting page's card
  heads (Summary · Next steps · Message to send) take the house `Card` (`components/leads/detail/card.module.css`, yours): their Edit link reads
  12 on a finger — P-13 would make it 14 there.
- **L2 (wave 2).** Notes › New › Contact Log is intact: on a phone **and on a tablet held upright** (`sheetLayout` now includes `TABLET_UPRIGHT`) the contact log still opens in its Sheet with Auto Fill / Attach layered (REG-2656) — your log sheet replaces that path. The call-back presets can be `DuePresetChips` (`components/leads/tasks/due-presets.tsx`; same words Tomorrow 10:00 · In 3 days · Next week · Pick a day; `presetDate` in `task-card-words.ts`).
- **L3.** A-09: the listing card's Tasks sheet (`components/leads/tasks-popover.*`) can add a task with `<DuePresetChips value onChange now />` and `createTask(leadId, title, { dueAt, assignees })`. C-19's rule is in `components/om/filters-modal.module.css` (`.sortRow > :first-child`), if A-11 reshapes the listing's Filters sheet.
- **A house round (not a package's file):** C-18's 48 feet for the house Sheet / Drawer / Dialog; the template editor's `structure-pane.module.css:34` (a C-02-shaped overlay the extended lint found).

## 5. What to check in the browser
Dane (Owner) · Hui Min (Admin) · Germaine (Designer) — the same on these tabs (no role gate changed). Olivia Martinez (`/leads/2bc08444-…`) has
tasks, files, notes with attachments, an open questionnaire; Kelvin Goh has a meeting.
- **390 (touch):** Tasks — cards, ring + Undo, hold → Mark done · Assign · More…, tap → the panel on the task, a preset; + › Create New Task →
  type, Tomorrow 10:00, Add. /tasks and a project's Tasks — the same cards, the Lead pill. Files — Take a photo (into Kitchen), the ⋮, a
  folder's one row, the viewer (pinch, double-tap, swipe, Information). Notes — an attachment row, the composer at 16, the Maison AI button in
  the composer's corner. Questionnaire — the count line, Answered, Ask Client's rows. Activity — days, a run, Show older. Meetings — tap the card;
  the meeting's foot.
- **768 (touch, upright):** Tasks / Meetings / Files list — the tablet sets, the frozen ⋮; Notes as the phone's.
- **1024 (touch, sideways):** the tablet sets; Notes list + pane with the attachment's day whole.
- **1440 (mouse):** as before, except the Notes attachment tile's day (§6).

## 6. Probes and tallies, and the 1440 comparison
- **`design-source/verify/responsive-leads/verify-rl-l4.cjs`** + `rl-l4-pure.mts`: **126 passed, 0 failed** (29 of them the pure words), on
  the final build through the harness (registered as `rl-l4`); no page errors; everything written put back.
- The Leads set and the on-the-move probes, through the harness on a copy of the clean base (`regression/run.cjs` on :3194, each on its own
  fresh DB): rl-fixes 22/0 · pm2-s05 114/0 · ux-p1 81/0 · ux-p2 73/0 · **ux-p3 90/1** · dane-p1 47/0 · dane-p2a 54/0 · dane-p2b 56/0 · dane-p3 70/0 ·
  dane-p5a 59/0 · **dane-p5b 56/0** (after the update below) · ke 31/0 · view-as 23/0 · kb-r1 35/0 · kb-r2 29/0 · search 27/0 · overlays 67/0 ·
  ghosts-same 76/0 · ghosts-same-390 76/0 · folders-files 16/0 · folder-crumbs 8/0 · rq-k1 116/0 · rq-k2 98/0 · rq-k3 90/0 · rq-k4 143/0 · rq-k5 79/0 ·
  rc-c1 176/0 · rc-c2 90/0 · rc-c3 110/0 · rc-c4 144/0 · pj-r1 98/0.
- **ux-p3's one ✗ is not this package's:** "the /tasks loader draws the three to-do chips …where the page draws them" compares the ghost's fixed
  widths (`TODO_W` 137 · 149 · 167, untouched) with the chips the page draws today — "Overdue · 16" is two digits on the base DB at today's date
  (page 144 · 146 · 167). Nothing here touches the scope pill, the to-do chips or their ghost; the widths follow the demo day's counts.
- Not banked in the repo (not run): the Leads parity rounds r1…r7 (`verify-parity-r*.cjs` were never banked).
- Two assertions updated for a deliberate change, commented `(leads on the move, a deliberate change of this rule)`:
  `folders/verify-folders-files.cjs` › phone — a folder's Move · Rename · Delete now ride in the one ⋮ (C-15), whose sheet is still named for
  the folder; the probe presses that ⋮ where it pressed the crumb's own kebab. `uat-dane-2026-10-01/P5b/verify-p5b.cjs` › phone 390 — /tasks'
  phone tasks are cards whose due is a chip (C-05): the rule it guards (Dane UAT 5.13: the day and its hour, uncut) holds in the chip's words
  ("Today · 10:00 AM", "Thu 22 Oct · 10:00 AM", "Wed 21 Oct · 3:00 PM · late", the year when it is not this one).
- **1440, pixel for pixel** (a mouse, before = the untouched worktree's build, after = this build, same lane DB; `desk-shots.cjs`, two baseline
  captures identical): `/leads/<Olivia>/tasks`, the task panel, `/tasks`, a project's Tasks, Files, a folder, the file viewer, Notes, Notes with a
  note open, Questionnaire, Activity, Kelvin's Meetings, the meeting page, Tools › Meeting Copilot — **identical, except Notes' attachment tile
  (1,184 px in x 1278–1335: the day "30 Aug ’26" where "30 Aug ’26 · 11⋮30 AM" ran under the ⋮ — C-10, a bug fix).**
- `npx tsc --noEmit` clean; `npx eslint app components lib` — only the three known errors in `quote-editor.tsx`; `npm run design:lint` ✓ (the
  baseline lowered in five files, one added by the rule's extension).

## 7. Principles check
1. **The mock wins** — the desk is the mock, byte-identical bar C-10; every touch layout follows the drawn screen 5 and the brief; invented words are listed in `reg-l4.md`.
2. **One system** — the house chips, Sheet, PortalMenu, DatePicker, IconButton's own 44, the table core's frozen column (the Quotes / Contracts tables' rules), `tabletHidden`, `useLongPress`; one `DuePresetChips` for every "add a task" on the move.
3. **Plain words** — "Add a task…", "Mark done", "Take a photo", "Photo saved to Kitchen · Take another", "4 to answer · 7 answered", "James uploaded 10 files.".
4. **Nothing is lost** — every desk action is one tap further (the bulk bar's More…, the ⋮'s Choose files, Column settings on a tablet, the time behind the day); a phone's rename is the panel's name field.
5. **Say why** — a folder's refused rows keep their reason in the row (`help`); nothing new is refused.
6. **Back returns** — the folder's ← goes up one level; the viewer's swipe keeps `?from=`; the panel and sheets close back to the list.
7. **Every screen is whole** — the tabs' ghosts draw the cards, the tablet sets, the quick add, Files' phone row, Activity by day, the Questionnaire's read-first line.
8. **Every width is designed** — 320 · 390 · 768 upright · 1024 sideways · 1440 each checked; no sideways scroll at 320.
9. **Tables follow the leads listing** — the tablet sets keep the listing's model (frozen first block, Column settings, resizable heads) with the ⋮ frozen right.
10. **Motion with purpose** — the pinch draws on the compositor and commits on lift; the fresh pulse after an add; a swipe that goes nowhere springs back.
11. **Honest data** — every word is the record's (the due day, the run's count, the counts); the presets write a real due date; nothing seeded.
12. **Reach for everyone** — 44 targets (ring, chips, pills, rows, picker), 16 inputs, the full stamp in the tile's label, `aria-expanded` on runs, keyboard Enter / Esc on the quick add.
