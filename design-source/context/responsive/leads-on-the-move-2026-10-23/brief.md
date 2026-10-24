# Leads on the move — the build (2026-10-23)

The owner (Vicky, he/him, the product designer) marked the review page https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh ("Leads on the
Move"): **Build on all thirteen proposals P-01…P-13, Build on all eleven stand-alone fixes (A-02 · A-11 · A-21 · A-27 · A-29 · B-14 · B-15 ·
C-02 · C-03 · C-08 · C-10), and the recommended answer on every question** — Q-01 a tablet in portrait gets the phone model · Q-02 a contact
log's screenshot is optional in both places, Take a photo offered first · Q-03 a signed quote may be a photo at Quote Sent and Won · Q-04 a
phone's tab screens drop the stage row (tablets and the desk keep REG-370's) · Q-05 the card keeps its stage pill, its sheet puts the next
move first and says why a locked row is locked, with its fix · Q-06 after a call from the app, a one-line prompt "Log the call with {first} ·
Log", never a sheet that opens by itself · Q-07 the Lead screen's filled button is the next move, Log ▾ beside it · Q-08 Projects next. Then
"continue the leads". The two blockers were fixed ahead (REG-2655 the owner rule on every forward move, REG-2656 the Notes log's dialogs on top).

You build ONE package (your prompt names it). Four packages run in two waves; each owns its files; nobody commits.

## Read first (absolute paths)
1. The review page's data — every proposal, finding and question with its words — in your worktree:
   `design-source/context/responsive/leads-on-the-move-2026-10-23/review-page-data.json` (`proposals[]` P-01…P-13 with today / proposed / why;
   `surfaces[].findings[]` A-/B-/C- with what · fix · absorbed-by; `questions[]`). His picks: `picks-2026-10-23.json` beside it.
2. The lane audits: `audit/A-the-listing-and-arrivals.md` · `audit/B-the-lead-page-and-its-moments.md` · `audit/C-the-lead-tabs.md` (in your
   worktree; each has an "On the move" section that is the most detailed statement of the screens). The shots:
   `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rwd-leads/shots/`
   (+ `A/`, `B/`, `C/` beside it, with each lane's probe scripts). The drawn screens: `audit/drawn-screens.html` (render it — the shape to build).
3. **What Quotes and Contracts built this week — the pieces you reuse:** the records `../quotes-on-the-move-2026-10-22/` and
   `../contracts-on-the-move-2026-10-22/` (each `brief.md` § The design and the outcomes); the screen pieces `components/quotes/screen/*`
   (`ScreenBar`, `SectionList`, the `Fold`, the sticky foot, `screen-context.ts`) and `components/contracts/screen/*` (`SectionScreen`, the
   Contract screen's hero / folds / foot, `DocumentFrame`), the pure next-step models `lib/quotes/next-step.ts` · `lib/contracts/next-step.ts`,
   the phone card words `components/leads/quotes/quote-card-words.ts` · `components/leads/contracts/contract-card-words.ts`, `use-long-press.ts`,
   the table core's tablet default (`components/om/table-columns.ts` `tabletHidden`, `useTableColumns(…, tablet)`), `components/contracts/photo-or-file.tsx`
   + `read-picture.ts` (Take a photo · Choose a file), `components/leads/quotes/…` cards, `useSheetFootLift`, the Dropdown clamp, the house
   `CodeBoxes`, the ghost kit (`components/shell/ghost-kit.tsx`), `components/om/chips.tsx`, `components/om/empty-state.tsx`.
4. In the repo: `CLAUDE.md` (How we work · the Map's Leads, Quotes on the move and Contracts on the move entries), `DESIGN-PRINCIPLES.md`,
   `design-source/context/responsive.md` § *On the move* and § *Contracts on the move* (the rules you extend), `design-source/context/page-checklist.md`,
   `design-source/DESIGN.md` (the mobile canvas 1a…3l — where it draws a surface, it wins), the REG rows named in comments near what you change
   (`design-source/REGISTER.md`; the Leads decisions REG-111…, REG-130, REG-298…300, REG-334, REG-353…355, REG-365, REG-370, REG-377, REG-543,
   REG-599…613, REG-1381…1444, REG-2655 · 2656), `lib/leads/*` (`stage-policy.ts` `stageIntent` · `blockedReason`, `stage-data.ts`
   `validateStage`, `detail.ts` `LeadDetail` — `nextFollowUp` · `lastContact` · `responseTime` · `memberStats` · `tabCounts`, `queries.ts`
   `LeadRow`, `move-link.ts` `moveStageHref`, `enums.ts` `OUTCOMES` · `CONTACT_MODES`, `contact-fill.ts`, `suggest.ts`).

## The design (the contract every package follows)
- **Widths.** Phone = `(max-width: 767px)` in CSS and `useSheetLayout()` in render. Touch tablet = `(max-width: 1024px)` and
  `useMediaQuery(TABLET_DOWN)`; a tablet held upright follows the phone (Q-01, `TABLET_PORTRAIT`); 1024 landscape is `TABLET_LANDSCAPE`
  (`lib/breakpoint.ts`). Desktop ≥1025 is the mock and stays **byte-identical** at 1440. Touch rules carry
  `@media (max-width: 767px), (hover: none) and (max-width: 1024px)` (REG-307).
- **The scale on ≤1024 (P-13).** Text people read 16, secondary 14, never under 14 for a value, a name or a sentence (a 12 uppercase eyebrow
  may label a group, nothing else); amounts 18–26 tabular; every target 44; feet 48; 16 gutters; 12 inside cards; inputs type at 16 (every
  `input`, `textarea` and contenteditable that is typed into — not only on iOS). Your own stylesheets, under the two queries; never a desk value.
- **The Lead screen (P-01, L1).** On ≤1024 portrait (and ≤767) `/leads/<id>` is the **Lead screen**, not the three-column Overview:
  - a 56 bar: ← (back where you came from, REG-465) · the name (16/700) over "Contacted · 4 days" (14) · ⋮ (a sheet: **Create** first — the
    quick links' rows — then Edit details · Invite to Portal · Return Lead (Qanvast) · Copy link · Delete; no key hints on touch). The name shows
    once (B-17).
  - a **hero** card: the stage chip with its days in stage · "HDB 4-Room · S$68K · Instagram" (14) · the address row with Directions ›
    (opens maps) · the client row: avatar · the phone grouped · **Call** and **WhatsApp** as 44 buttons (B-03; REG-365's spacing is a desk
    decision) · the members (Dane · Sarah) with Assign when there is none.
  - **one Next line** from a new pure `lib/leads/next-step.ts` (on the quote / contract models; tests): New without an owner → "Assign a
    member — {suggested} has room" · New → "Call or WhatsApp {first} — new {2 days ago}" · Contacted → the earliest open follow-up ("Call
    back — Thu 10:00, overdue") else "Book the site visit" · Met → "Send the quote" (+ its due when a task has one) · Quote Sent → the latest
    quote's state ("OM-10008 sent 4 days ago · not opened") · On Hold → "Follow up on 22 Nov" · Lost → "Lost · {reason}" · Won → "Project
    P-… is running". The Maison AI brief is ONE line under it, its Show more a sheet (B-18).
  - **Due now:** at most three overdue / due-today tasks, each a row with a 44 ring that completes it (Undo) — then "n more ›" to Tasks.
  - **a row per tab** (56, P-02): Tasks (n · "2 due now") · Notes & Logs (the last contact's line) · Files (n · **Take a photo**) · Quotes
    (n · the latest's chip + amount) · Contracts · Meetings · Questionnaire (7 / 11) · Activity; an empty one is one line with its action (B-19);
    each opens its tab as a screen. The LEAD STAGES card becomes a **Stages** row (five dots · days in pipeline · response time) that opens a
    sheet with today's card.
  - a **sticky foot** (48): **Log ▾** (outlined: Call · WhatsApp · Visit · Note) + **the next move** (Q-07, filled): Move to {next} · Convert to
    Project · Resume at {X}; on an unowned New lead the primary is **Assign** (the move's prerequisite, REG-2655), which becomes Move to
    Contacted once assigned; on a Won lead with a project, Open project. Stage ▾ stays in the bar's ⋮ (Move to… › the stage sheet).
  - **Q-06:** a press on Call or WhatsApp is remembered (per lead, this tab); when the page becomes visible again a one-line prompt sits above
    the foot — "Log the call with {first} · Log" — with ✕; Log opens the log (L1 ships it opening today's path: the Move stage window at
    Contacted on a New lead, else Notes › New › Contact Log; **L2 replaces that with its log sheet**). Never a sheet that opens by itself.
  - The Maison AI button lifts above the foot and never sits on a row's control at rest (B-26 · C-08; REG-2602's rule).
  - **1024 landscape (P-07):** two panes — the left 320–360 holds the hero, Next, Due now and the rows; the right holds the open tab (the
    Overview's cards when none is open); Log ▾ and the next move sit in the bar; **Create lives in ⋮** — no strip of unlabelled glyphs on touch
    (B-08). The desk ≥1025 is the three-column Overview as today.
- **Tabs as screens (P-02, Q-04, L1 frame + L4 bodies).** On ≤1024 portrait `/leads/<id>/<tab>` renders the tab as a screen: a 56 bar
  (← to the lead · "Tasks" over the lead's name · the tab's own + and ⋮ as trailing controls), the tab's body, **no tab strip, no stage row**
  (REG-370 stays on tablets in landscape and the desk). L1 owns the frame (`TabScreen`), exported from `components/leads/screen/tab-screen.tsx`,
  and mounts each tab's component as it is; L4 changes the tab bodies' insides. The address stays the tab's; Back returns to the lead.
- **The moments (P-03 · P-04, L2 — wave 2).**
  - **Log a call (P-03):** a log sheet — the channel (Call · WhatsApp · Visit · Note as chips, the pressed one set), **Now** set (change opens
    the date-time picker), the outcomes as chips (`OUTCOMES`), a call-back with presets (Tomorrow 10:00 · In 3 days · Next week · Pick a day)
    when the outcome asks for one, notes (optional), **Take a photo · Choose a file** (optional, Q-02), one **Save log**. On a New lead Save
    logs it AND moves the lead to Contacted (the move's own path, with its owner rule); a Visit is "Save & move to Met" when the lead is in
    Contacted. The same sheet is Notes › New › Contact Log on a phone and Log ▾ / the prompt on the Lead screen. Auto Fill from a chat stays
    the second way inside it. 3 taps for a call.
  - **The Move stage window (P-04):** on ≤1024 portrait one step per screen — a bar "Move to Met · step 3 of 5" (no rail), only that step's
    fields, one **Save & move** at 48; a refusal stays in the foot and nothing typed is lost (the window never closes on a refused move). New:
    a member row is its label (B-02). A completed log reads as a summary card with Edit (B-09). **Won is a checklist:** Signed quote (From the
    system "OM-10008 · S$68,176 ✓" or **Take a photo · Choose a file**, Q-03, the amount typed) · Signed contract (the same, C4's rows) ·
    Payments ("10 · 30 · 30 · 30 — the studio's usual", not 0%: B-12 reverses REG-149's zeroing for an upload — say so) · Project type chips ·
    **Create project**. On Hold and Lost share one sheet (the studio's reasons as chips, the duration chips or the competitor, Save & move with
    Undo). 1024 landscape keeps the centred modal. **Q-02** makes a contact log's screenshot optional at every width (`validateStage`).
  - **Snackbars (B-14 · B-15):** one snackbar at a time — a new one replaces the one showing (its Undo goes with it); a sheet opening dismisses
    a refusal's snackbar that would sit on it. House piece (`components/om/snackbar*`) — say so.
- **The listing and arrivals (P-05 · P-06 · P-08 · P-09, L3).** The listing card keeps its shape (the benchmark): add **Last** ("Call ·
  callback requested · Mon") and **Next** ("Call back · Thu 10:00", red when late) as one 14 line each (`LeadRow.lastContact` /
  `nextFollowUp`), the **new** mark on the phone (the band + a New chip, `seen_at`), WhatsApp beside the number, the info line at three items,
  a "to call today" chip (leads with an overdue or due-today follow-up); the stage sheet from a card puts the next move first and a locked row
  says why in the row with its fix (Assign); every sheet from a card names the lead; the card's Tasks sheet adds a task with the due presets;
  Lost cards say why and when; Deleted Leads on a phone is the card with Restore (A-26). Tablets: the table's default set Name · Stage · Last
  contact · Next follow-up · Members, Edit and ⋮ frozen right, the rest in Column settings (its handles and pins 44 on touch — house, say so);
  the kanban card carries the stage pill and ⋮ › Move to ›; numbers grouped everywhere. **A new lead (P-08):** name + mobile on one screen
  (`autocomplete` name / tel, 16), "Paste the WhatsApp message to fill the rest" (read by rule through `lib/leads/contact-fill.ts` /
  `DOCUMENT_FILL`) beside Fill from a document, **More details** folded, Assign with the suggested member, one **Add lead**; ✕ asks before it
  discards (A-17); the duplicate dialog's default is **Open existing lead**; the new lead opens on its Lead screen. Edit details on ≤1024 is
  a short list (Contact · Property · Budget & source · People · Custom fields), each a screen (`?edit=1` keeps opening it). **Imports (P-09):**
  matched columns fold to "11 columns matched ✓ · Review"; the preview lists the leads with a red line on a row that won't land; the end names
  what was skipped and why; the merge shows only the fields that differ; the review queue's card is the listing card.
- **The tabs' bodies (P-10 · P-11 · P-12, L4).** Tasks (module-wide: the lead's tab, the rail's `/tasks`, a project's Tasks): a task row reads
  whole (two lines) with its due day as a chip and a 44 ring; **Add a task** = title + a due preset (Tomorrow 10:00 · In 3 days · Next week ·
  Pick a day) + a member in one row; the bulk bar is Done · Assign · ⋯ (the rest under ⋯); the panel opens on the task; tablet column sets
  for Tasks, Meetings and Files (C-07). Files: **Take a photo** first (several in a row, into the open folder) + Choose files; one toolbar row
  in a folder; the title owns its line at 320; the viewer pinches and swipes. Meetings: the whole card opens; the meeting page's one Save in a
  sticky foot on ≤1024. Questionnaire: "4 to answer · 7 answered" on top with To answer · Answered chips; each Ask the client tick a
  full-width row. Activity: grouped by day, repeats folded ("James uploaded 10 files"). Notes upright: a log opens full width (C-14).
- **Fixes with their own rows.** A-02 the FAB never covers a card's stage pill (L3). A-11 Filters on a phone is one sheet of chip groups (the
  Quotes / Contracts pattern, L3). A-21 the import toast shows each file's own badge (L3). A-27 "4 of 5 imported" (L3). A-29 Return Lead on an
  expired window says so first and doesn't run the form (L3). B-14 · B-15 (L2). C-02 the Tasks toolbar's `touchTarget::after { inset }` goes —
  the house box carries the target; extend the lint rule `icon-button-overlay` to any `::after` with `inset` on a control class it misses, at
  the current counts (L4). C-03 a task's checkbox is hittable on its whole 44 (L4). C-08 the FAB never sits on a tab row's control at rest (L4,
  with L1's FAB rule). C-10 the attachment tile's time never runs under its ⋮ (L4).
- **House rules that stand.** Bottom sheets for menus and form modals ≤767 (REG-353); one filled button per screen; every remove answers with
  Undo; a refusal says why (and, where it can, offers the fix); plain words; `data-kb` where a key presses; tokens only (`npm run design:lint`
  must hold — never raise its baseline; **never `button::after { inset … }`**, grow a control by `min-height`); the ghost of every page draws
  the page as it now looks at that width (REG-708); empty states on the house `EmptyState`; **a server action never takes a long string as a
  bare argument** (pictures in one object); every refusal answers `{ error }`; Who sees leads on every read and action; demo data stays
  consistent (REG-343); **nothing a desktop can do is lost; it is one tap further.**

## Packages and ownership (edit only your files; name any other change under "Shared pieces changed" in your outcome)
| Pkg | Builds | Owns |
| --- | --- | --- |
| **L1** | P-01 · P-02 (frame) · P-07 · P-13 on its screens · Q-04 · Q-06 (prompt, interim path) · Q-07 (+ absorbed B-03 B-04 B-06 B-07 B-08 B-16 B-17 B-18 B-19 B-20 B-24 B-25 B-26 C-27) | `app/leads/[id]/(overview)/**`, `app/leads/[id]/overview.tsx` + `overview.module.css`, `app/leads/[id]/[tab]/page.tsx` (the frame only) + `loading.tsx`, `components/leads/detail/**` EXCEPT `tab-ghosts.tsx` and `task-panel-host.*`, `components/shell/detail-tab-skeleton.tsx`, new `components/leads/screen/**` (Lead screen, hero, next line, due now, rows, foot, prompt, `tab-screen.tsx`, the landscape panes), new `lib/leads/next-step.ts` (pure + tests); shared: `components/shell/maison-fab.module.css` (the lift over the foot — say so), `components/shell/page-header-l2.tsx` only if needed (say so) |
| **L3** | P-05 · P-06 · P-08 · P-09 · A-02 · A-11 · A-21 · A-27 · A-29 (+ absorbed A-01 A-03…A-10 A-12…A-20 A-22…A-26 A-28 A-30 B-21) | `app/leads/(list)/**`, `app/leads/workspace.tsx`, `components/leads/{table,kanban/**,lead-cards,toolbar,filters-modal,stage-dropdown,stage-filter-dropdown,tasks-popover,assign-popover,assignee-field,bulk-bar,deleted-sheet,lead-form,import-wizard,review-sheet,review-banner,export-dialog,listing-ghost,search-empty,empty-state}.*`, `components/leads/return/**`, the import history page / sheet, `lib/leads/{filters,import-values,homematch,contact-fill}.ts` additively, `app/leads/actions.ts` additively; shared: `components/om/column-settings.tsx` (44 on touch — say so) |
| **L4** | P-10 · P-11 · P-12 · C-02 · C-03 · C-08 · C-10 · P-13 on the tabs (+ absorbed C-04…C-07 C-09 C-11…C-17 C-19…C-26, A-09's presets in the task field) | `components/leads/tasks/**` (incl. `detail-bulk-bar.*`), `components/tasks/**`, `components/leads/files/**`, `components/leads/notes/**` (C-10 · C-14 · C-22 only — L2 adds the log sheet in wave 2), `components/leads/questionnaire/**`, `components/leads/activity/**`, `components/meetings/**` (≤1024 only), `components/leads/detail/tab-ghosts.tsx` + `task-panel-host.*`, `app/leads/[id]/files/**`, `app/tasks/**`, `scripts/design-lint.mjs` (C-02's rule extension, at the current counts — `design-lint.baseline.json` only to add it) |
| **L2** (wave 2) | P-03 · P-04 · Q-02 · Q-03 · B-14 · B-15 (+ absorbed B-02 B-09 B-10 B-11 B-12 B-13 B-22 B-23 C-21) and the integration: the log sheet into L1's Log ▾ and prompt and into L4's Notes › New › Contact Log | `components/leads/move-stage/**`, new `components/leads/log/**`, `lib/leads/stage-data.ts` + `lib/forms.ts` (Q-02), `app/leads/actions.ts` (the log + move server path, additively), `components/om/snackbar*` (B-14 · B-15 — house, say so), and the integration points in `components/leads/screen/**` (L1's) and `components/leads/notes/**` (L4's) |

Waves: **1** = L1 · L3 · L4 (in parallel; L1's Log ▾ and prompt open today's paths) · **2** = L2 (after wave 1 lands; it wires its sheet in).
If you find you must touch another package's file, stop and write what you need in your outcome under "For other packages" instead.

## Rules for the package
- **Your worktree is your repo** (a clean worktree of main `f85e0e94`). Work, build and probe ONLY in your working directory. Never edit
  `/Users/vicky/Documents/GitHub/openmaison-prototype` itself; never touch ports 3000 / 3001; never write any `local.db`. Nothing to commit.
- **Set-up once, from your worktree:**
  `bash /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rl-build/setup-lane.sh <L>`
  — clones `node_modules`, copies `.env.local`, makes `…/scratchpad/rl-build/<L>/lane.db` (a scratch copy of the base demo DB). Put
  `DATABASE_URL=file:<that path>` on EVERY command that needs a database (a shell `export` does not survive to the next tool call).
- **Builds take the lock** (one build at a time on this 18 GB machine):
  `until mkdir /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rl-build/build.lock 2>/dev/null; do sleep 15; done; DATABASE_URL=file:<lane.db> npx next build; rmdir …/build.lock`
  — always release it, also when the build fails. Run the build in the background and wait for its notification.
- **Your port:** L1 3191 · L2 3192 · L3 3193 · L4 3194 (`DATABASE_URL=file:<lane.db> npx next start -p <port>`; stop it by port:
  `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`).
- **No schema change is expected.** If one is unavoidable, additive only, with its repair rule, and say exactly what it does.
- **Checks before you finish:** `npx tsc --noEmit -p .`, `npx eslint app components lib` (3 errors in `components/quotes/editor/quote-editor.tsx`
  pre-date everything — ignore those three only), `npm run design:lint` (never raise its baseline), the production build, YOUR probe green, and
  every existing probe your change could touch, run against your lane — the Leads set: `responsive-leads/verify-rl-fixes.cjs`,
  `pending-modules/verify-pm2-s05.cjs`, `ux-build-2026-09-30/P1` · `P2` · `P3`, `uat-dane-2026-10-01/P1` · `P2a` · `P2b` · `P3` · `P5a` · `P5b`,
  `parity-r1…r7` probes (find them under `design-source/verify/`), `lead-project-parity/KE/verify-ke.cjs`, `view-as/verify-view-as.cjs`,
  `keyboard/verify-kb-r1.cjs` · `r2`, `global-search/verify-search.cjs`, `consistency/verify-overlays.cjs`, `ghosts/verify-ghosts-same.cjs`
  (1440 and 390), and the Quotes / Contracts on-the-move probes your change reaches (`responsive-quotes/verify-rq-k1…k5.cjs`,
  `responsive-contracts/verify-rc-c1…c4.cjs`); the harness `design-source/verify/regression/run.cjs` runs any id in `probes.cjs` against a
  RUN_DIR whose `base.db` you copy from your lane's clean DB. Update an assertion only for a deliberate change, commented
  `(leads on the move, a deliberate change of this rule)`. **1440 must be byte-identical** on the pages you touch (a pixel diff of before and
  after on your lane; `sharp` is in the repo, `pngjs` is not); say which pages you compared.
- **Shots:** 390×844 and 768×1024 with `isMobile: true, hasTouch: true`, 1024×768 touch where your package changes a tablet layout; tablet shots
  viewport-only; overflow measured against `documentElement.clientWidth`; check 320. Shots in `…/scratchpad/rl-build/<L>/shots/`.
- **Probe:** `design-source/verify/responsive-leads/verify-rl-<l>.cjs` in the shape of `responsive-contracts/verify-rc-c4.cjs` (args
  `<scratch.db> [shotDir] [base]`, env `BASE`, sqlite3 with `-cmd ".timeout 30000"`, refuses `local.db`, puts back what it changes, asserts rules
  not counts, real taps for every new press, touch boxes by `getBoundingClientRect` + `elementFromPoint` — an icon's ligature text is not a
  button's name, a radio's row is its label, a SearchBar's hit target is its shell, a press is found `visible=true`; REPO from `process.cwd()`
  when the harness runs a copy). Every new press exercised on the production build; the page error log stays empty.
- **Register rows:** stage them in `design-source/context/responsive/leads-on-the-move-2026-10-23/reg-<l>.md` as
  `| REG-<L>.n | Area | **What** — why (his marks 2026-10-23 on the Leads-on-the-move page, "continue the leads"; P-xx / A-xx …; decisions as
  recommended) *(invented copy: …)* | user-directed |` (a bug fix ends `| bug fix |`). Don't edit `design-source/REGISTER.md` or `CLAUDE.md`
  (the orchestrator numbers rows from REG-2657).
- **Outcome:** `…/leads-on-the-move-2026-10-23/outcome-<l>.md`: a **ledger** with every id assigned to you (built where · kept why · not done
  why); decisions taken (▲ for him); **Shared pieces changed**; **For other packages**; what to check in the browser (Dane Owner · Hui Min
  Admin · Germaine Designer; 390 · 768 · 1024 · 1440); probes and tallies; the 1440 comparison; a **Principles check** (one line per principle
  of `DESIGN-PRINCIPLES.md`). Final message: 10 lines + the outcome path + the list of files you changed or added.
- **His bar (2026-10-12, repeated 2026-10-22):** nothing missed, nothing buggy, every pixel checked, the simplest experience that does the
  job — the fewest steps, plain words, one filled button, Undo, the right default. If something is not world-class yet, fix it rather than note it.
