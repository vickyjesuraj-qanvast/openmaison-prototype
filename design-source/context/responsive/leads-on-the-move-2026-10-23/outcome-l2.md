# Leads on the move — L2's outcome (P-03 · P-04 · Q-02 · Q-03 · B-14 · B-15 + the integration), 2026-10-23, wave 2

His marks on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh — Build on all thirteen proposals and the eleven fixes, the recommended answer on
every question — then "continue the leads". L2 built the moments that move a lead — the log sheet, the Move stage window one step per screen,
Won as a checklist, On Hold and Lost as one sheet, Q-02 and Q-03, one snackbar at a time — and wired the sheet into L1's Log ▾ and prompt and
L4's Notes › New › Contact Log, in its worktree from the WIP base (wave 1 landed); nothing committed. Staged register rows: `reg-l2.md`
(16 rows). Probe: `design-source/verify/responsive-leads/verify-rl-l2.cjs` (+ the pure `rl-l2-pure.mts`), registered as `rl-l2`.

## 1 · Ledger

| id | call | where / why |
| --- | --- | --- |
| **P-03** the log sheet | **built** | `components/leads/log/log-sheet.tsx` (+ `log-fields.tsx` · `log.module.css` · the pure `log-plan.ts` · `use-move-layout.ts`): the house Sheet on a phone and a tablet held upright, a centred 480 Dialog on a tablet held sideways. The channel as chips (Call · WhatsApp · Site visit · Note · More… → Email · SMS · Others) with the press's own set, **When = now** ("Now · 4:12 PM · Change", the house picker, never in the future), the five `OUTCOMES` as chips, the call-back with L4's `DuePresetChips` (open after Callback requested / Meeting scheduled, one "+ Set a …" line after the others, none after Not interested) and How once a day is set, notes, **Take a photo · Choose a file** then "From {first}'s files", one filled Save at 48 with a line above it saying what it does. **3 taps for a call** from the prompt (Log · How it went · Save log), measured. Server: `fetchLogContext` + `logLeadContact` in `app/leads/actions.ts` (additive): on a New lead the first contact AND the move to Contacted through `moveStage` (its role, project, owner and field checks; the stage log holds the call — one record); a site visit on a Contacted lead is "Save & move to Met" (the Met step's meeting log, its photos by id); elsewhere the Notes tab's own `createNote` + `createTask`. The call-back is a dated Follow-up for the lead's members either way (REG-608), titled for the person ("Call Kelvin back", `followUpTitle`). Who sees leads on both reads (`canOpenLead`); Accounting refused. |
| **P-04** the window one step per screen | **built** | `components/leads/move-stage/wizard.tsx` (`screen` = `useOnTheMove()`; `data-move="screen"`): the whole screen, the house `ScreenBar` (← · "Move to Met" over "{lead} · step 3 of 5"; "{Stage} details" + Edit for a completed step), no rail, the step's fields in one column (≤672 centred at 768), **one filled button at 48** (Save & move · Create project · Save changes · Assign · Close). **A refusal stays in the foot and nothing typed is lost** — the hosts (`app/leads/[id]/overview.tsx`, `app/leads/workspace.tsx`) now answer `onSave` / `onUpdate` with the server's sentence and close only once the move has landed (▲ every width, §2). 1024 sideways and the desk keep the centred window with its rail. Panels: `panels.tsx` (screen branches via `screen-context.ts`), `move-fields.tsx` (the logs on the move), `won-checklist.tsx`. |
| **Q-02** a contact log's screenshot optional | **built, every width** | `lib/leads/stage-data.ts` `validateStage` (the server's `stageFieldsRefusal` reads it); the window's Attach row reads "Attach screenshots of your call attempts (optional)" at every width — the one rule of this package that changes the desk (REG-543 reversed in the window; the Notes tab never asked). `lib/forms.ts` needed nothing: `MSG.attach` stays for Quote Sent / Won. |
| **Q-03** a signed quote may be a photo | **built** | on a finger the Quote Sent and Won uploads are C4's Take a photo · Choose a file rows (`AttachTabs touchPick`, `readPickedContractFile`); the photo is kept as a picture — `keepPictureIn` (new, `lib/contracts/files.ts`), `keepQuoteSentUpload` (`lib/contracts/won.ts`), `fileWonQuote` (`lib/projects/create.ts`), `signedQuoteFileName` keeps a picture's extension (`lib/projects/model.ts`, so the project's Key documents still find it). A desk's drop stays a PDF (C4's rule for the contract). |
| **B-14** a refusal's snackbar on the next sheet | **built (house)** | `useSheetFootLift` (`components/om/sheet.tsx` — the house Sheet, a Dialog drawn as a sheet, a Drawer as a sheet) dismisses the `REFUSED_KEY` snackbar as a sheet opens; the window on the move does the same; the lead page's and the listing's stage refusals now carry that key. The lift above a sheet's foot was Quotes' (B-19). Chips at 14 in the On Hold sheet. |
| **B-15** two snackbars, two Undos | **built (house)** | `components/om/snackbar.tsx`: on ≤1024 one snackbar at a time — a new one replaces the one showing, its Undo with it; the desk keeps the mock's stack of three. And the stage moves share one key at every width (`STAGE_MOVE_KEY`, `move-stage/screen-context.ts`) — ▲ a bug fix at the desk too (an older Undo undid a hold already over). |
| B-02 the New step's member row | built (P-04) | on the move the whole 64 row is the checkbox (`role="checkbox"`, the box its mark); a tap on the name ticks it — measured. The desk keeps its row. |
| B-09 a completed log as a greyed form | built (P-04) | on the move a locked log is a summary card ("Logged · WhatsApp · Thu, 3 Sep ’26 · 2:14 PM · Callback requested · Call back … · 1 screenshot", its notes, **Edit**), the foot Close until a log is opened. |
| B-10 13 taps and a mandatory screenshot | built (P-03 · Q-02) | 3 taps from the prompt; 4 from Log ▾; the window's Contacted step on the move has the sheet's fields (now set, chips, presets) — and asks how, as the desk does (nothing chosen for the reader). |
| B-11 a signed quote can't be a photo | built (Q-03) | above. |
| B-12 Won's split at 0% | built (P-04) | on the move an uploaded quote starts at "10 · 30 · 30 · 30 — the studio’s usual"; ▲ the desk keeps REG-149's 0% (§2). |
| B-13 On Hold a sheet, Lost a card | built (P-04) | on the move both are one sheet shape (`ParkSheet` in `dialogs.tsx`): the lead's name, reasons as chips, the follow-up chips or the competitor / restart, one Save & move at 48; Undo from the hosts as before. The desk keeps the two dialogs. |
| B-22 Attach from a log has desk words, no camera | built (P-03) | the log (the sheet and the window's steps on the move) leads with Take a photo · Choose a file; "From {first}'s files" opens the house Attach files modal one tap further — its own feet (36) are a house piece (L4's note C-18: a house round). |
| B-23 the window's and its dialogs' feet 36–44 | built (P-04) | the step screen's one button at 48; Auto Fill's and Suggested tasks' feet 48 on a finger (`touchBtn`); the drop box's sentence and the Suggested tasks' labels 14 there. |
| C-21 a call from Notes takes 8–10 taps | built (P-03) | `components/leads/notes/lead-notes.tsx`: on a phone and a tablet held upright New › Contact Log (the toolbar's New ▾, the list's empty-state New, `?new=contact`, the quick link's event) is the log sheet — read at the press (`logOnTheMove`); an existing log keeps its sheet with Edit; the desk and 1024 sideways keep the pane. Works on a project's Notes too (the log alone, no move). |
| the integration — L1's seam | built | `components/leads/screen/lead-log.tsx`: `LOG_SHEET = true`; `LeadLog` draws the sheet for every Log ▾ press and the prompt's Log (the press's channel set); the page re-reads the lead on save, so the Next line and the foot read the new state ("Move to Met", "Call Kelvin back — tomorrow · 10:00 AM."). |
| REG-2655's owner rule inside the sheets | held | the sheet asks it (REG-L2.2); the window's steps keep `stageIntent`'s refusal before they open; the server's `teamNeededFor` refuses a move with nobody — said in the foot, nothing lost (probed by deleting the members under an open step). |
| REG-2656's nested layer inside the sheets | held | Auto Fill and the lead's files open above the log sheet (`layered`), on the body after it, so **Esc closes them first** (they were inline: Esc closed the sheet behind them — found by the probe, fixed in the sheet). |

Not done, why: nothing assigned to L2 is left. One note: `parity-r1…r7`'s probe scripts are not in the repo (only their shots), as L1 found.

## 2 · Decisions taken (as recommended; ▲ for him)

1. ▲ **An unowned New lead's log sheet asks "Who owns {first}?" first** (REG-L2.2) — a pick assigns them and the save moves the lead; no pick
   logs the call alone and the lead stays in New. This reverses L1's interim "Log ▾ › Call refuses with Assign" (its probe and rl-fixes'
   assertions changed, commented). The call is logged where it happened; the owner rule still decides the move.
2. ▲ **The window never closes on a refused move — at every width** (REG-L2.5). The desk's window also closed before the server answered; one
   path for both. The desk's only visible difference: on a refusal the foot says the server's sentence instead of a snackbar over the page,
   and Save is held for the moment the move travels.
3. ▲ **B-12 on the move only** — the desk keeps REG-149's 0% for an uploaded quote, because the brief keeps the desk byte-identical; one rule
   for every width is his call (the same upload reads differently at 1440 and 390 until then).
4. ▲ **The stage moves share one snackbar key at every width** (REG-L2.13) — B-15's own fix, a bug at the desk too; one-at-a-time stays ≤1024.
5. **Log ▾ › Note is a note in the same sheet** (a few lines and photos, "Save note") — the brief's chips are Call · WhatsApp · Visit · Note;
   the full note editor (title, formatting, Refine) stays the Notes tab's composer.
6. **The sheet's chips are the brief's four + More…** (Email · SMS · Others in place) — nothing a desk logs is lost.
7. **The call-back's task is named for the person and the act** (REG-L2.3) — the Next line read REG-319's sentence with the date twice. The
   window's journey and Notes' Add tasks keep REG-319's title.
8. **The window's Contacted step on the move asks how** (no chip pre-set, as the desk) while the sheet sets the press's channel — the window is
   reached from a move, not from a call.
9. **A picked photo or file goes up at once** (the Files tab's own upload — its bytes kept) and stays the lead's file if the log is cancelled,
   as the Attach files modal already did.
10. **On a New lead the save says "Save log"** with the line "Saving moves {first} to Contacted." above it (the brief's word for the button); a
    visit says the move on the button ("Save & move to Met").

## 3 · Shared pieces changed

- `components/om/snackbar.tsx` — house: one at a time on ≤1024 (B-15).
- `components/om/sheet.tsx` — house: `useSheetFootLift` withdraws the refusal snackbar as a sheet opens (B-14).
- `components/contracts/photo-or-file.tsx` — `fileAccept` · `many` (defaults unchanged for C4's rows).
- `lib/contracts/files.ts` (`keepPictureIn`, new) · `lib/contracts/won.ts` (`keepQuoteSentUpload` takes a photo) · `lib/projects/create.ts`
  (`fileWonQuote` takes a photo) · `lib/projects/model.ts` (`signedQuoteFileName` keeps a picture's extension) — Q-03, additive.
- `app/leads/[id]/overview.tsx` (L1's) — the wizard's `onSave` / `onUpdate` answer the server's refusal; refusals carry `REFUSED_KEY`; the
  stage moves' snackbars `STAGE_MOVE_KEY`; On Hold / Lost get `leadName`.
- `app/leads/workspace.tsx` (L3's) — the same for the listing's window and dialogs.
- `components/leads/screen/lead-log.tsx` (L1's seam) — `LOG_SHEET = true`, `LeadLog` draws the sheet.
- `components/leads/notes/lead-notes.tsx` (L4's) — New › Contact Log on the move opens the log sheet.
- `components/leads/move-stage/fields.module.css` — the drop box's sentence 14 on a finger (every Dropzone on touch).
- Probe assertions changed for a deliberate change, each commented "(leads on the move, a deliberate change of this rule)":
  `responsive-leads/verify-rl-fixes.cjs` (390: Log ▾ › Call on an unowned lead opens the sheet's owner row; Notes' Attach is "From {first}'s
  files") · `responsive-leads/verify-rl-l1.cjs` (Log ▾ › Call and the prompt's Log open the sheet; Olivia's owner row) ·
  `ux-build-2026-09-30/P1/verify-p1.cjs` (Q-02: the Attach row "(optional)", no screenshot error, a filled log goes on to Suggested tasks) ·
  `responsive-contracts/verify-rc-c4.cjs` (on a phone Won is the checklist, its button "Create project") · `pending-modules/verify-pm2-s43b.cjs`
  (the server's refusal in the window's foot; the phone's New › Contact Log is the log sheet) · `pending-modules/verify-pm2-s42g.cjs` (a phone's
  step is the step bar's title — no rail).
- `design-source/verify/regression/probes.cjs` — `rl-l2` registered.

## 4 · For other packages

- **The orchestrator:** CLAUDE.md's Map wants the L2 pieces under "Leads on the move" — `components/leads/log/*` (the sheet, its fields, the pure
  `log-plan.ts`, `use-move-layout.ts`), `app/leads/actions.ts` `fetchLogContext` · `logLeadContact`, the window's `screen` branch
  (`move-stage/screen-context.ts` · `move-fields.tsx` · `won-checklist.tsx`), `STAGE_MOVE_KEY`. `reg-l2.md` numbers from REG-2657 after L1 · L3 · L4.
- **A house round (not a package's file):** the house sheet's 12px subtitle (the lead's name under "Put on hold") — Quotes left it open too;
  the Attach files modal's 36 feet on a phone (L4's C-18 note).
- **L1:** nothing needed — the seam took the sheet as built. (`ctx.today` and `openStep` stay on the context; the sheet doesn't call them.)
- **Stale assertions found on the way (not L2's, identical on the WIP base):** `pm2-s42g` "the press opens Olivia's window at Contacted (she
  has no member yet…)" predates REG-2655 (the window no longer opens on an unowned lead); `pm2-s43e` "/leads/<Kevin>/meetings: the ghost's open
  tab sits where the page's does" looks for the tab strip L1's Q-04 drops on a phone's tab screens; `pm2-s43b` stops at a Hangout chat's Start;
  `pm2-s23` and `pm2-s42e` stop early as before. Worth a line in the landing's regression notes.

## 5 · What to check in the browser

(Dane = Owner · Hui Min = Admin · Germaine = Designer; View as in the studio block.)
- **390:** Kelvin (New) — Call from the hero, switch away and back → "Log the call with Kelvin · Log" → Callback requested → Tomorrow 10:00 →
  Save log → "Call logged — Kelvin is in Contacted…", the foot Move to Met, the Next line "Call Kelvin back — tomorrow · 10:00 AM.". Olivia —
  Log ▾ › Call → "Who owns Olivia?" (Sarah · suggested) → pick → Connected → Save. Farah — Log ▾ › Site visit → Take a photo → Save & move to
  Met. Gerald — Log ▾ › Note. Jasmine — Move to Met → the step screen, Save with nothing (the foot says so), Showroom → Save & move. Priya —
  Stages › Contacted → the summary card, Edit. Vivien — Convert to Project → the checklist: Upload › Take a photo, the amount, the usual split,
  Create project. Priya ⋮ › Move to… › On Hold → the sheet → Undo. Notes › New › Contact Log on any lead.
- **Germaine (Designer)** on an unowned lead: no owner row, the line says why it stays in New. **Hui Min:** as Dane.
- **768 upright:** the log as a bottom sheet; the step screen in its centred column. **1024 sideways:** the window with its rail; the log as a
  centred dialog. **1440:** the window, On Hold, Lost and Notes as they were, the Attach row "(optional)". **320:** the sheet and the step fit.

## 6 · Probes and tallies

All on the production build (`next build` under the shared lock, the final build is the tested one), each probe on a fresh copy of the base
demo DB through the regression harness (`RUN_DIR` with `base.db` copied from `…/rl-build/base.db` — never `prepare.cjs`), port 3192:

- **`responsive-leads/verify-rl-l2.cjs` — 108 passed, 0 failed** (23 pure in `rl-l2-pure.mts`; real taps at 390 · 768 · 1024 touch and 320,
  clicks at 1440; everything written put back; no page errors). Shots banked in `design-source/verify/responsive-leads/rl-l2/` (12) and
  `…/scratchpad/rl-build/L2/shots/`.
- The Leads set (harness counts): `rl-fixes` 22/0 · `rl-l1` 118/0 (162 passed in its own tally) · `rl-l3` 102/0 · `rl-l4` 97/0 · `pm2-s05`
  114/0 · `ux-p1` 81/0 · `ux-p2` 73/0 · `ux-p3` 90/1 · `dane-p1` 47/0 · `dane-p2a` 54/0 · `dane-p2b` 56/0 · `dane-p3` 70/0 · `dane-p5a` 59/0 ·
  `dane-p5b` 56/0 · `ke` 31/0 · `view-as` 23/0 · `kb-r1` 35/0 · `kb-r2` 29/0 · `search` 27/0 · `overlays` 67/0 · `ghosts-same` 76/0 ·
  `ghosts-same-390` 76/0.
- The on-the-move set and the window's other callers: `rq-k1` 116/0 · `rq-k2` 98/0 · `rq-k3` 90/0 · `rq-k4` 143/0 · `rq-k5` 79/0 · `rc-c1`
  176/0 · `rc-c2` 90/0 · `rc-c3` 110/0 · `rc-c4` 145/0 (178 in its own tally) · `pm2-s03` 79/0 · `pj-r1` 98/0 · `ct-r2` 24/0 · `xr-r3` 28/0 ·
  `ux-p4` 56/0.
- Run directly (their paths don't survive the harness copy, or they are not registered), each also run on the **before** build (the WIP base,
  wave 1 landed) the same way: `pm2-s43b` 59 ✓ · 1 ✗ (before: the same ✗ — a Hangout chat's Start, not this package) · `pm2-s42g` 39 · 1 (before:
  the same ✗ — REG-2655 now refuses Olivia's window, the assertion predates it) · `pm2-s43e` 45 · 1 (before: the same — L1's Q-04 drops the tab
  strip on a phone's tab screens; the s43e ghost check looks for it) · `pm2-s23` 33 · 2 (before: the same) · `pm2-s42e` 30 · 1 (before: the same).
- **`ux-p3`'s one ✗ is not L2's** — the /tasks loader's chips (L1 found it identical on the untouched tree).
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three pre-existing errors in `components/quotes/editor/quote-editor.tsx`
  only · `npm run design:lint` at its baseline (nothing raised).
- Probes changed for a deliberate change (each commented): `verify-rl-fixes.cjs`, `verify-rl-l1.cjs`, `ux-build-2026-09-30/P1/verify-p1.cjs`,
  `responsive-contracts/verify-rc-c4.cjs` (on a phone Won is the checklist and its button "Create project"), `pending-modules/verify-pm2-s43b.cjs`
  (the server's refusal in the window's foot; New › Contact Log on a phone is the log sheet), `pending-modules/verify-pm2-s42g.cjs` (the step is
  the step bar's title on a phone — no rail).

## 7 · The 1440 comparison

A pixel diff (`sharp`, raw RGBA) of 1440 shots with a mouse, reduced motion, each side on a fresh copy of the base DB — before = the WIP base's
build (`…/rl-build/L2/before`), after = the final build — 17 pages / states:
- **identical:** the Move stage window at Met · Quote Sent · Won (+ its Upload tab) · New (open, and read only on a completed lead); On Hold;
  Lost; the Lead Overview of Farah and Olivia; the listing; the kanban; Farah's Notes & Logs tab.
- **the one change, Q-02 (expected):** the Contacted step — "Attach screenshots of your call attempts*" → "… (optional)" (468–483 px on that
  row, the step open and read only); the Contacted step after a Save with nothing filled — no screenshot error under the Attach row, so the rows
  below it sit higher (rows 767–990).
- **the clock, not a change:** Notes › New › Contact Log — 123 px on rows 350–359: the draft's time in the list ("2:30 PM" before, "3:20 PM"
  after — the shots were taken an hour apart).

## 8 · Principles check

1. **The mock wins, every exception written down** — drawn screens 3 and 4 are the shape; every word the mock never drew is in `reg-l2.md`
   with its invented copy named; ▲ decisions above (the owner row, the window's refusal at every width, B-12 on the move only, the move key).
2. **One system** — the house Sheet / Dialog / Chips / TextField / DatePicker / `DuePresetChips` / `PhotoOrFile` / `ScreenBar` / AttachFilesModal /
   AutoFillDialog, the window's own panels reused; tokens only (`npm run design:lint` holds at its baseline).
3. **Plain words** — "How did the call with Farah go?", "Saving moves Farah to Contacted.", "Call Kelvin back", "10 · 30 · 30 · 30 — the
   studio’s usual"; refusals keep the rule's words.
4. **Nothing is lost** — a refused save (client or server) keeps the sheet and the step as typed; On Hold / Lost keep their Undo; one snackbar
   never hides an older Undo that still works — the stale one goes.
5. **Say why** — the line above Save says what it does or why the lead stays in New; a locked owner (Designer) hears the hint; a server refusal
   is its own sentence in the foot.
6. **Back returns where you came from** — the sheet and the step close back onto the Lead screen, the tab or the listing they opened from.
7. **Every screen is whole** — the house surfaces, the snackbar above a sheet's foot, Esc layering, no page errors in the probe.
8. **Every width is designed** — 320 · 390 · 768 upright · 1024 sideways · 1440 each checked; the desk byte-identical but for Q-02's label.
9. **Tables follow the leads listing** — no table added.
10. **Motion with purpose** — the house sheet's rise, the step's foot shake on a refusal (the window's own).
11. **Honest data** — every value from the lead's records; the move through `moveStage`, the log one record; nothing seeded.
12. **Reach for everyone** — 44 chips and rows, 48 feet, inputs at 16, `role="checkbox"` member rows, radio groups for every chip set, Esc closes
    the topmost surface first.
