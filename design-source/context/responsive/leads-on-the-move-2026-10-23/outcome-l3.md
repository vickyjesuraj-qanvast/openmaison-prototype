# Leads on the move — L3's outcome (2026-10-23)

**Package:** L3 — the listing and the ways a lead arrives: the phone card that says who to call now, the stage / Assign / Tasks sheets from a
card, Filters on a phone, the tablet table and a kanban that moves on touch, a new lead as a name and a mobile, Edit details as a short list,
the import that folds what matched and says what won't land, Review, Deleted Leads, Return Lead's late window, the listing's ghost.
**Built:** P-05 · P-06 · P-08 · P-09 and the fixes A-02 · A-11 · A-21 · A-27 · A-29, with every absorbed finding of my row (A-01 · A-03…A-10 ·
A-12…A-20 · A-22…A-26 · A-28 · A-30 · B-21), Q-05 as picked. Nothing committed. Lane: port 3193, `…/scratchpad/rl-build/L3/lane.db` (put back
to `clean.db` between runs); shots `…/scratchpad/rl-build/L3/shots/` (`look/`, `probe/`), the 1440 comparison `…/L3/cmp-1440/{before,after}`.

## 1 · The ledger

| id | state | where |
| --- | --- | --- |
| **P-05** the phone card | built | `components/leads/lead-cards.tsx` + `.module.css`, new pure `components/leads/lead-card-words.ts` (Last · Next · Lost lines, `waHref`, `parked`): the new mark (band + New tag), three items on the info line, WhatsApp beside the number, the two 14 lines, the pill-first foot, Lost / On Hold lines, no Overdue on a parked lead; `LeadRow.parked` (additive, `lib/leads/queries.ts`). The "to call today" pill: `components/leads/toolbar.tsx` (`todo`), the scope `today` (`lib/leads/filters.ts` `isCallTodayLead`, `ATTENTION_LABEL.today`, `lib/leads/listing-url.ts`), the phone pill's To do group (`stage-filter-dropdown.tsx` `phone`). The stage sheet's next move and the locked rows' reasons (`stage-dropdown.tsx` `next` · `NextMove`, `workspace.tsx` `nextMoveFor`, the assign-then-move path `assignThen`), the Assign sheet's subject (`assign-popover.tsx` `subject`), the Tasks sheet's presets (`tasks-popover.tsx`, new pure `lib/leads/quick-due.ts`, `addTask(…, dueAt)` additive in `app/leads/actions.ts`), Deleted Leads as cards (`deleted-sheet.tsx`). |
| **P-06** the tablet listing | built | `components/leads/table.tsx` (`TABLET_COLUMNS`, `TABLET_WIDTHS`, `touchTablet`, `data-tablet`, `data-at-end`) + `.module.css` (12 inside, Edit · ⋮ frozen right with the head's band, the mirrored shadow, one 64 row, the phone 14); `workspace.tsx` (`om.columns.leads.tablet` — Column settings saves and resets the tablet's own set); `components/leads/kanban/board.tsx` + `.module.css` (the touch stage pill, ⋮ › Move to {next} · Move stage…, the grouped number, 14 on touch); `components/om/column-settings.module.css` (44 on touch — house, below). |
| **P-08** a new lead · Edit details | built | `components/leads/lead-form.tsx` + `.module.css`: the fields written once and composed three ways (the desk's DOM unchanged); a phone's name + mobile + two fill rows + More details + the suggested member's line + one Add lead; Paste the WhatsApp message (clipboard, else a box) read by new pure `lib/leads/message-fill.ts` over the document read; a tablet's "Paste a message" link; 16 and the autofill hints; ✕ / Cancel / Esc ask (`requestClose`, every width); the duplicate dialog's filled Open existing lead (every width); Edit details ≤1024 as a short list with section screens (`touchEdit`, `section`, `SECTION_OF`); `assignee-field.tsx` unchanged (its existing `suggestion` card now fed on touch); the new lead opens on its own page ≤1024 (`workspace.tsx` `openAfterCreate`). |
| **P-09** the imports | built | `components/leads/import-wizard.tsx` + `.module.css` (the phone model `(max-width: 767px), (max-width: 1024px) and (orientation: portrait)`: tips fold, a phone's upload row, the matched fold, the preview list with red lines; every width: the skipped rows named before the press, in the routing count and at the end); `components/leads/review-sheet.tsx` + `.module.css` (the queue card at 14/16, grouped phones, the merge's differing fields ≤1024 + Show all, the toolbar away while merging, the 768 portrait window). |
| A-01 no new mark on the phone | built (P-05) | the band + the New tag; supersedes REG-299's "absent: the unseen band" |
| **A-02** the FAB on the pill | built | the card's foot leads with the pill; the probe aligns six cards' feet with the button and finds no press under it |
| A-03 the card can't say who to call | built (P-05) | Last · Next |
| A-04 four items wrap | built (P-05) | three items; the days in the stage left the line |
| A-05 no WhatsApp; boxes overlap | built (P-05) | the glyph's 44 box; the name's box grows up, the number's down (the probe measures no shared pixel) |
| A-06 a refusal with no fix | built (P-05) | the reason in the row and in the sheet's first block, **Assign** as the fix, then the move |
| A-07 the pill says where, not next | built (P-05, Q-05) | the pill stays; its sheet's first row is the next move |
| A-08 the Assign sheet names no lead | built (P-05) | "Chloe Tan · 9331 8842" |
| A-09 Add Task takes no due | built (P-05) | the presets on the card's Tasks sheet (L4 builds the Tasks tab's own; `lib/leads/quick-due.ts` is there to share) |
| A-10 the search at 14, a 20 clear | built (P-13) | 16 on ≤1024 touch, the clear's 44; the placeholder already names what it searches ("Search name, phone, email…") — kept |
| **A-11** Filters as two panes | built | one sheet of chips, "Show n leads" |
| A-12 three of eight columns | built (P-06) | the tablet set; 64 rows (10 a screen at 1024) |
| A-13 Edit · ⋮ 850px away | built (P-06) | frozen right |
| A-14 12 on a tablet | built (P-06) | 14 for the table's phone, the kanban's date and line, the review queue |
| A-15 the kanban can't move a lead | built (P-06) | the touch pill + the ⋮'s Move to / Move stage…; a long-press lift is not built (the brief's contract is the pill and the ⋮; the drag stays a mouse's, REG-379) |
| A-16 ungrouped numbers | built (P-06) | the kanban card and the review queue / merge, at every width (the one deliberate 1440 change, §7) |
| A-17 ✕ throws typed words away | built (P-08) | the house ConfirmDialog, every width |
| A-18 14 · no autofill · 2.8 screens | built (P-08) | 16 on touch, `autocomplete` name / tel / email, `autocapitalize` words; More details folds on a phone |
| A-19 a second card to fill | built (P-08) | two rows in the sheet; Paste reads the clipboard; Choose a file opens the chooser at once. A photo is not offered: the reader has no words in a picture (said by the existing read when a picture is dropped) |
| A-20 the duplicate's default | built (P-08) | Open existing lead filled |
| **A-21** the CSV badge for every file | built | `FileBadge` by extension (every width — a bug fix); a phone's toast is the column's row; tips fold |
| A-22 5.9 screens of matches | built (P-09) | the fold |
| A-23 nothing says what won't land | built (P-09) | the list's red lines, the note, the routing count, the end |
| A-24 8.7 screens to merge one | built (P-09) | only what differs ≤1024 (+ Show all), the toolbar away |
| A-25 the queue card at 10–12; no Undo | built in part | the card at 14/16 and grouped phones (P-09's "the queue card is the listing card"). **Not done:** Undo on Approve All Clean — undoing means hard-deleting the leads it just made and their bell rows, which no additive server change can do safely; the snackbar stays as REG-604 made it. For Vicky (§2). |
| A-26 Deleted Leads as a table | built (P-05) | cards on the phone model |
| **A-27** "4 of 5imported" | built | `white-space: pre` (+ the list at 14) |
| A-28 a Lost card says nothing | built (P-05) | the Lost line, no Overdue; the sheet's first row "Resume at {stage}" |
| **A-29** Return Lead's late window | built | the notice first (every width), "Return it anyway"; the tips fold on a phone |
| A-30 24px handles and pins | built (P-06) | 44 on touch; a Move up / Move down pair is not built (the arrow keys already move a row; the brief's contract is 44) |
| B-21 Edit details is 17 fields | built (P-08) | the short list |

## 2 · Decisions taken (as recommended — ▲ the ones to show him)

- ▲ **Next names the when, the task box the what.** The brief's Next reads "Call back · Thu 10:00"; the card's task box already names the first
  task, which IS the earliest dated follow-up, so the title would print twice. Next is the day and time ("Tomorrow 10:00 AM"); late, it is said by
  its day and how late ("19 Oct · 4 days late") — a bare "Mon" in red read as next Monday.
- ▲ **The foot leads with the pill** (A-02's first fix, over "the FAB steps out of the phone listing"): the right end of every card's foot now
  holds no control, so the button never lands on one, and Maison AI stays one press away on the listing. Reverses the canvas's members-left order.
- ▲ **The new mark is the band and a "New" tag** (blue, REG-1060's word for New).
- ▲ **"to call today"** is a scope like the To do group's (in the address; the pill names it), shown on a phone only, while there is something to
  call; its count is the leads with a follow-up due today or late, parked and Lost leads out (the Overdue rule).
- ▲ **The stage sheet's fix goes straight on**: Assign → tick → Assign opens the Move stage window at the move the person asked for (not back to
  the sheet). A finger's menu prints every locked row's reason in the row and drops the tap-snackbar there.
- ▲ **The Tasks presets** are 10:00 AM on the day; "Next week" is the coming Monday.
- **Filters' Quick filters** show on the phone sheet only while one is on (they repeat the pill's To do scopes — A-11), so a filter set on a desk
  can still be let go.
- ▲ **✕ asks, and the duplicate's default is Open existing lead, at every width** — the desk's form is a state, not its resting page; the right
  default does not change with the screen. The desk at rest is byte-identical.
- ▲ **A pasted message is read by rule** (`lib/leads/message-fill.ts`): the copied chat's sender, a name as it introduces itself, an address from
  the block to the unit inside a sentence, then the document read. Nothing is guessed; what it filled and didn't is said.
- **Edit details' short list keeps one Save** for every section (a section's ← keeps what was typed); a refused Save opens the first error's
  screen. The sections are the brief's; Remarks sits in Budget & source.
- **The import's "what won't land" lines show at every width** (honesty, the end "names what was skipped and why"); the lists, folds and rows are
  the phone model's (a phone, a tablet held upright — Q-01); a tablet held sideways keeps the tables.
- ▲ **Grouped numbers at every width** on the kanban card and in Review (REG-456) — the one deliberate 1440 difference (§7).
- **Return Lead's notice** also covers a lead whose returns are used up ("returned 2 times"), never an appeal; rules stay display-only (REG-609).
- **Deleted Leads' cards** follow the phone model (768 portrait too); Select / Unselect sits in the card's ⋮ beside the hold.
- **Not done, for Vicky:** Undo on Approve All Clean (A-25) — see the ledger.

## 3 · Shared pieces changed (outside L3's own files — all additive)

- `components/om/column-settings.module.css` — **house piece, every list's drawer:** the handle and the pin take a 44 box on a phone and a touch
  tablet (the glyph where it is drawn). Nothing at a mouse's width.
- `components/shell/skeleton.tsx` + `skeleton.module.css` — `LeadsSkeleton` (the listing's ghost only — its other user is `kanban/skeleton.tsx`):
  the phone card's new shape and lines, the to-call pill's line, a touch tablet's five-column table with the frozen band. The desk's table ghost
  keeps its DOM (one extra class name, `deskTable`).
- `lib/leads/queries.ts` — `LeadRow.parked?: { reason, competitor } | null` (the latest On Hold / Lost log's words, set only while the lead is in
  that stage). L1's Next line ("Lost · {reason}") can read it.
- `lib/leads/listing-url.ts` — `'today'` added to the attention scopes the address keeps.
- `app/leads/actions.ts` — `addTask(leadId, title, dueAt?)` (an optional epoch-ms third argument).
- New files: `components/leads/lead-card-words.ts`, `lib/leads/quick-due.ts`, `lib/leads/message-fill.ts`.
- Probes: `design-source/verify/regression/probes.cjs` (one line, `rl-l3`); `ux-build-2026-09-30/P2/verify-p2.cjs` and
  `uat-dane-2026-10-01/P5a/verify-p5a.cjs` updated for deliberate changes (§6).

## 4 · For other packages

- **L1** (the Lead screen): Edit details opens the lead form as today and gets the short list on ≤1024 by itself (`focus` and `?edit=1` land on
  that field's section). After Create on ≤1024 the listing pushes `/leads/<id>?from=…` — the Lead screen. The phone card's Next / Lost words are
  pure in `components/leads/lead-card-words.ts` and `LeadRow.parked` carries the Lost reason — reuse them so the card and the Next line agree. The
  stage sheet's first row uses `stageIntent` / `nextStageOf` / `resumeStageOf` directly; if `lib/leads/next-step.ts` exposes the next move, the
  orchestrator can point `nextMoveFor` (workspace.tsx) at it.
- **L1 · the Maison AI button (maison-fab.module.css is L1's):** on a touch tablet the listing's frozen ⋮ column runs the table's right edge and
  the button (right 24, raised above the review banner) sits over the ⋮ of whichever row is under it at rest — as it does over the Quotes and
  Contracts tablet tables (K4 · C4) and the desk's hover pair. A house rule is wanted (a lane, or the phone's tuck on a touch tablet); I did not
  reach into the button's stylesheet.
- **L4** (Tasks): `lib/leads/quick-due.ts` has the presets (`DUE_PRESETS`, `presetDue`) — use it for Add a task so the two places say the same
  words and mean the same day.
- **L2** (the log sheet): the card's tasks path is unchanged; `lib/leads/message-fill.ts` reads a pasted chat if the log sheet wants one.

## 5 · What to check in the browser

Members: Dane (Owner) · Hui Min (Admin) · Germaine (Designer). Widths: 390 · 768 (touch, portrait) · 1024 (touch, landscape) · 1440.
1. `/leads` at 390: Chloe Tan's band and New tag; every card's Last line; Farah Ahmad's red Next ("… days late"); the WhatsApp glyph; the pill at
   the foot's left; "n to call today" → the scope, the pill names it, Back from a lead keeps it.
2. Olivia Martinez's pill → "Move to Contacted — assign a member first · Assign" → tick a member → Assign → the Move stage window at Contacted
   (Escape out; Germaine sees the reason with no Assign — she assigns nobody). Rahul Menon's pill → Move to Contacted. A Lost card's pill →
   "Resume at …".
3. A card's Add Task → type → Tomorrow 10:00 AM → Save (the task's due on the lead's Tasks tab).
4. Filters at 390: the chip groups, "Show n leads". `?scope=lost`: the Lost lines.
5. + → Create New Lead at 390: Paste the WhatsApp message (paste "Hi, I'm Rachel Ong … Blk 123 Bedok North Ave 1 #08-12 … 9334 1209") → the
   fields fill; ✕ asks; Add lead → the lead's page. A phone of an existing lead → Open existing lead is the filled button.
6. 768 touch: the table's five columns, Edit · ⋮ frozen; Edit → the short list → Contact → ← → Save. Column settings' handles at 44; a change
   is kept for the tablet only. The kanban: the card's pill, its ⋮'s Move to / Move stage….
7. Import a CSV at 390 with a row with no name and a repeated phone: the folds, the list's red lines, the routing's count, the end's "1 row
   skipped — no lead name (row 3)". Lead Import History: "4 of 5 imported".
8. Review imported leads at 390: View & Merge on Olivia's duplicate → three rows, "Show all 15"; the toolbar gone until Back to queue.
9. ⋮ › Deleted Leads at 390: cards, Restore, Empty Trash under the head's ⋮.
10. 768 touch: Gavin See's ⋮ › Return Lead → the notice → Return it anyway.
11. 1440: nothing changed at rest; the kanban's and Review's numbers read grouped.

## 6 · The probes

- `design-source/verify/responsive-leads/verify-rl-l3.cjs` (+ `rl-l3-pure.mts`, 29 pure rules): **131 passed, 0 failed** against the lane's
  final production build (`BASE=http://localhost:3193`, `lane.db`), twice; every new press tapped (390 · 768 · 1024 touch) or clicked (1440), every
  touch box measured (`getBoundingClientRect` + `elementFromPoint`), the page error log empty, every table put back (its last assertion). Registered
  in the regression as `rl-l3` (`design-source/verify/regression/probes.cjs`) — through the harness **102 ok · 0 fail · exit 0** (the harness
  counts the pure file as one line). Shots banked in `design-source/verify/responsive-leads/rl-l3/` (20).
- The Leads set through the regression harness on the lane (base.db = the lane's clean copy of the demo DB), on the final build:
  rl-fixes **22/0** · pm2-s05 **114/0** · ux-p1 **81/0** · ux-p2 **73/0** · ux-p3 **90/1** · dane-p1 **47/0** · dane-p2a **54/0** · dane-p2b
  **56/0** · dane-p3 **70/0** · dane-p5a **59/0** · dane-p5b **56/0** · view-as **23/0** · kb-r1 **35/0** · kb-r2 **29/0** · search **27/0** ·
  overlays **67/0** · ghosts-same (1440) **76/0** · ghosts-same-390 **76/0** · rq-k4 **143/0** · rc-c4 **144/0**; `lead-project-parity/KE/verify-ke.cjs`
  **31/0** (run by hand — it is not in `probes.cjs`).
  - **ux-p3's one failure is pre-existing**: the /tasks loader's to-do chip widths (137 vs 144) — the same line fails on the pristine before
    build (`…/L3/reg-before/lanes/ux-p3/probe.log`); /tasks is not an L3 surface.
  - **Updated for deliberate changes** (each line commented `(leads on the move, a deliberate change of this rule)`): `ux-build-2026-09-30/P2/verify-p2.cjs`
    — the phone card's info line is three items (the days in the stage left it, A-04) and its ghost's info bone the three items' width; the
    import's phone check reads the list's change line (the list's lines carry `data-adjusted`, so the selector holds). `uat-dane-2026-10-01/P5a/verify-p5a.cjs`
    — `b-quickfilters 390`: a phone's Filters is one sheet with no Quick filters tab; the To do scopes are read on the pill's sheet (A-11).
  - **Not found:** the `parity-r1…r7` probes — `design-source/verify/parity-r*/` hold only their shots; no script is in the repo.
- Checks: `npx tsc --noEmit -p .` clean · `npx eslint app components lib` — the three pre-existing errors in `components/quotes/editor/quote-editor.tsx`
  only, no warning in L3's files · `npm run design:lint` "nothing new breaks a house rule" (baseline untouched) · the production build green.

## 7 · The 1440 comparison

`…/scratchpad/rl-build/L3/shots-1440.cjs before|after` + `compare-1440.cjs`: fifteen states at 1440×1024 with a mouse — the listing's table, the
stage menu, the Tasks popover, the Assign popover, Filters, Column settings, Create New Lead (+ Additional info open), Edit Lead, the import's step
1, Deleted Leads, Review imported leads, the kanban (+ a card's ⋮), Lead Import History. The "before" is a pristine copy of the worktree at its
base commit (`…/L3/before`, its own build on its own copy of the base DB). **Byte-identical: 12 of 15.** The three differences are the one
deliberate change (A-16, REG-456 — "numbers grouped everywhere", P-06): **11-review** (7,837 px, x 128–304: the queue cards' numbers now read
"9123 8802"), **12-kanban · 13-kanban-menu** (~122k px across the board: the cards' numbers read "9665 2018", and because each column takes its
cards' widest line, every column is ~4px wider — the board's layout shifts by those pixels; nothing else on the card changed).

## 8 · Principles check (DESIGN-PRINCIPLES.md)

1. The mock wins, exceptions written down — the canvas card kept (name, info, task box, rule, foot), its two departures (the foot's order, the
   new mark) and every invented word listed in reg-l3.md; the desk is the mock, byte-identical at rest.
2. One system, no one-offs — the house ScopePill (to-call pill, the kanban's touch pill), Chips (presets, Filters), ConfirmDialog, SurfaceHead
   (the section screens' back), PortalMenu, Tag, IconButton; tokens only (design lint green, nothing new).
3. Plain words — "Last", "Next", "to call today", "Move to Contacted — assign a member first", "No lead name — won’t import", "Return it anyway".
4. Nothing is lost — ✕ asks; a refused move never loses its path (Assign then the move); the desk's every action is one press further on a
   finger (the kanban's Move stage…, Edit's short list, Deleted's ⋮).
5. Say why — a locked row says why in the row; the import says what won't land before and after; a late return says what it becomes.
6. Back returns where you came from — the to-call scope lives in the address; a new lead opens with `?from=`; a section screen's ← returns to
   the list.
7. Every screen is whole — the listing's ghost redrawn for the card, the to-call line, the tablet table and the kanban's touch pill.
8. Every width is designed — 390 · 768 portrait · 1024 landscape · 1440 measured; 320 with no sideways scroll; 44 targets (the WhatsApp glyph,
   the column settings' handles, the search's clear); inputs at 16 on touch.
9. Tables follow the leads listing — the tablet set through the column prefs (a per-breakpoint key), the frozen block, selection kept.
10. Motion with purpose — the More details fold uses the existing fold motion; no new timings.
11. Honest data — every line from the records (the last contact, the follow-up, the park's reason, the server's own skip rule); a pasted message
    fills only what it plainly says.
12. Reach for everyone — the late line carries a hidden " — late" for a screen reader (not colour alone); the short list is a list of buttons;
    the WhatsApp link names whom it messages.
