# Responsive audit — the Leads module on a phone and a tablet (read-only audit, 2026-10-23)

The owner (Vicky, he/him, the product designer) asked on 2026-10-22: "the responsive mobile and tablet screens are not correct … Honestly the
lead listing is too good but anything with the too heavy data is not pure responsive. Do a deep audit module by module, one at a time …
think a different experience in mobile and tablet which doesn't have to be the same as desktop: on the move, less cognitive load. Relook at
layouts, components, font sizes, everything a world-class responsive design needs." Quotes and Contracts were audited and built (his picks:
Build on everything); on the Contracts page he answered Q-08 "the next module: **Leads**". Nothing is built from this audit until he marks
it. You AUDIT and RECOMMEND; you change no file in the repo.

**His own words set the benchmark:** the lead **listing** is the part of 2.0 he thinks is right on a phone. Audit it honestly anyway (it may
hold small gaps), but the weight of this audit is everything a designer does with a lead after the listing: the lead's page, the moments that
move it (the Move stage window and its steps), the tabs, the forms and the imports — the "too heavy data" he meant.

## What Quotes and Contracts settled (the rules you audit against — read these first)
- `design-source/context/responsive.md` § *On the move* and § *Contracts on the move*: ≤1024 is designed, not squeezed; **read first, edit
  second**; one thing at a time; the scale 16 · 14 · 44 (body 16, secondary 14, never under 14 for a value, a name or a sentence; targets 44;
  foot buttons 48; 16 gutters; 12 inside cards; inputs at 16); a table on a touch tablet shows what fits; paper is a viewer; a client's page is
  always a phone page; nothing runs off the screen and nothing covers a foot; a floating button never sits on a pane's or a foot's button; a
  finger never aims (anything placed at a caret is placed by choosing where); a photo is a document on site; a tooltip is a pointer's;
  measure against the device, not the window.
- The two records: `design-source/context/responsive/quotes-on-the-move-2026-10-22/` and `…/contracts-on-the-move-2026-10-22/` — each
  `README.md` (what was built), `brief.md` (the design contract: the record screen with a hero, one Next line and a sticky foot with Edit + the
  state's one primary; Edit as a short section list with each section a screen; the lists' phone card; tablet column sets; who-first creation;
  the paper viewer; the client's page) and the outcomes. **Leads should land on the same pieces** wherever a lead is the same kind of thing:
  `components/quotes/screen/*` (`QuoteScreen` shape, `ScreenBar`, `SectionList`), `components/contracts/screen/*` (`SectionScreen`, the
  Contract screen's hero and folds), `lib/quotes/next-step.ts` · `lib/contracts/next-step.ts` (one primary per state), the phone card words
  (`components/leads/quotes/quote-card-words.ts`, `components/leads/contracts/contract-card-words.ts`), `use-long-press.ts`, the table core's
  tablet default (`tabletHidden`), `components/contracts/photo-or-file.tsx` (Take a photo · Choose a file), `useSheetFootLift`, the
  Dropdown clamp, `CodeBoxes`, the ghost kit. Say where Leads can reuse and where it genuinely differs (a lead is a person and a pipeline,
  not a document: its moments are calls, visits, logs and stage moves; its Overview is a dashboard of the person, not a paper).
- `DESIGN-PRINCIPLES.md`, `design-source/REGISTER.md` (search the REG-nnn named in a code comment before calling something a defect — if it
  is a decision, say so and still say whether it serves a person on the move; the mobile decisions are REG-298…300 (shell + cards),
  REG-353…355 (the Claude Design mobile canvas: sheets, one-row toolbars, the name owns its line), REG-269 · REG-273 · REG-306 · REG-307 ·
  REG-315 (breakpoints, touch), REG-304 (the info column's collapse), the Leads parity rounds REG-607…613, and the lead-project parity
  REG-1381…1444), `design-source/context/responsive.md` (all of it), `design-source/DESIGN.md` (the mock index — the mobile canvas 1a…3l is the
  source for every surface at ≤767 it draws; where it draws a surface, a finding is "the build departs from the canvas", not "a new design").

## What you have
- A production build of tonight's main (Quotes and Contracts on the move committed as `a6caecb1`) at **http://localhost:3014** on a scratch
  database (`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rwd-leads/audit.db`).
  It is NOT the owner's local.db: you may click through menus, open sheets, type, move a lead's stage, add a log, import a file, delete and
  restore. Never run `npm run db:*`, never touch `local.db`, never start or stop servers (the owner's :3000 / :3001 are his; :3014 is ours
  and stays up; don't use :3011–3013).
- Screenshots already taken: `…/scratchpad/rwd-leads/shots/` — `<width>-<nn>-<surface>.png`, widths `m390` (390×844, touch), `t768`
  (768×1024, touch), `t1024` (1024×768, touch); `log.json` beside them records each page's scrollWidth / clientWidth. Read them with the Read
  tool. `capture-leads.cjs` beside them is the script that took them: copy its pattern for more
  (`NODE_PATH=/Users/vicky/Documents/GitHub/openmaison-prototype/node_modules node yourscript.cjs`), always `isMobile: true, hasTouch: true`
  at 390 and 768, **tablet shots viewport-only**, overflow measured against `documentElement.clientWidth`, into YOUR OWN folder
  `…/scratchpad/rwd-leads/<lane>/`.
- Demo leads (ids on the scratch DB): **Olivia Martinez** `2bc08444-0409-47c3-9675-0750977c5838` (New — 13 files, 5 tasks, 11 questions, 3
  notes, quotes and a contract), **Farah Ahmad** `c9691890-3132-4902-9c2a-d251f6bfda9a` (Contacted), **Gerald Tan**
  `bed4ded0-1ac7-48fd-a7c4-639a7a00f02f` (Met), **Vivien Lee** `bb054aa5-7284-492e-b232-607bd4cfb0f6` (Quote Sent), **Serena Koh**
  `7a805f6e-e0dd-43be-ace5-36e689d08789` (Quote Sent), **Mei Ling Tan** `d925fe8f-276f-4d14-973b-6334e3acba37` (On Hold), **Muthu Vinay**
  `72d56067-21ce-47d1-aa5b-dbbe70d88e0b` (Lost), **Kelvin Goh** `3c1b7221-d4ed-4d1c-aba8-d2549e58f9ff` (New, with a meeting), **Benjamin Han**
  `2b6d6bfc-5d25-48c8-904a-6f7a7c85cec3` (Won — his tabs hand over to the project). Sample files for imports and uploads:
  `/Users/vicky/Documents/GitHub/openmaison-prototype/public/uat-files/` (`new-leads.xlsx`, `homematch-lead-sheet.pdf`, `rachel-ong-enquiry.pdf`,
  `sophia-whatsapp-chat.txt`, `sophia-living-room.jpg`, `sophia-floor-plan.pdf`). Demo Studio › View as switches member (Dane Owner · Hui
  Min Admin · Germaine Designer).
- The code: `app/leads/**` (`(list)/` + `workspace.tsx` the listing, `[id]/(overview)/overview.tsx` the lead page, `[id]/[tab]/` the tabs,
  `actions.ts` and the tab actions), `components/leads/**` (table, kanban, `lead-cards.tsx`, toolbar, filters, `lead-form.tsx`,
  `import-wizard.tsx`, review sheet, `move-stage/*` — wizard, panels, dialogs —, `detail/*` — cards, info column, quick links, AI brief, stages
  card, follow-up dialog —, `tasks/*`, `files/*`, `notes/*`, `questionnaire/*`, `activity/*`, `return/*`, the assign / tasks popovers),
  `components/meetings/lead-meetings.tsx`, `lib/leads/**` (`stage-policy.ts`, `stage-data.ts`, `queries.ts`, `detail.ts`, `tasks.ts`,
  `notes.ts`, `files.ts`), the house pieces `components/om/**`, `components/shell/mobile-nav.tsx`, `components/shell/page-header-l2.tsx`,
  `lib/breakpoint.ts`. CSS modules carry `(max-width: 767px)` and `(max-width: 1024px)`.

## What to produce — ONE file, `…/scratchpad/rwd-leads/<lane>/findings.md`
1. **Findings table** (aim for 15–30, each specific and verifiable; no padding):
   `| id | surface | width | severity | what is wrong (what you saw) | evidence (shot file) | rule it breaks | fix inside today's pattern |`
   - id = `<LANE>-nn`. width = 390 / 768 / 1024 / all. severity = Blocker (can't complete the task at that width) · Major (hard, slow or
     error-prone) · Minor (polish). Say what you measured: a touch box under 44 (getBoundingClientRect + elementFromPoint), text under 14, a
     truncated label, a sideways scroll, a tap that needs hover, a sheet that doesn't fit, a foot covered, something that needs two hands or a
     zoom. An icon's ligature text is not a button's name; a radio's row is its label; a DS SearchBar's hit target is its shell.
   - Don't repeat the shell's known rules (the dock, the top bar) unless a Leads surface breaks them. Where a Quotes / Contracts piece built
     this week already solves it, name the piece. Where the mobile canvas (1a…3l, `design-source/DESIGN.md`) draws the surface, compare
     against it.
2. **"On the move" section** — for each surface in your lane: what a designer on site / in a car / at a client's home needs from it (the 3–5
   jobs: e.g. call the lead back, log the call in ten seconds, see what's next, move the stage after a site visit, snap the site photos,
   assign a colleague), what today's layout makes them do instead, and what the surface should BE on a phone and on a tablet if it did not have
   to look like the desktop — concrete: what is on screen, in what order, the one primary action, what moves behind a tap. Phone and tablet
   may differ (a tablet upright follows the phone, Q-01 of both earlier modules).
3. **Measurements block** — the numbers (font sizes of the key text, touch boxes, column widths, page heights at 390, taps to finish a job).
4. Under ~400 lines. Plain words; no praise, no hedging.

## Lanes
- **Lane A — the listing and the ways a lead arrives:** `/leads` at every width (the phone cards, the tablet table and kanban, the toolbar's
  scope pill / search / Filters / Column settings / Insights door / the Needs-attention and unseen views, the bulk bar, the row ⋮, the stage
  dropdown and the Assign and Tasks popovers from a row), the lead form (Create New Lead, Fill from a document, the duplicate dialog, custom
  fields, the second client), the import wizard (CSV / XLSX / a PDF lead sheet) and Review imported leads (the merge table), Deleted Leads and
  Lost views, the Return Lead wizard for a Qanvast lead (find one: `source = 'Qanvast'`). Shots 01 02 08. Measure the listing against the
  canvas — it is the benchmark; say what is right as well as what is not, briefly.
- **Lane B — the lead's page and the moments that move it:** `/leads/<id>` (Overview) for each stage: the L2 header (Back, the name, ⋮),
  "Stage: X ▾" and the primary "Move to …", the tab strip, the identity block and View Client Info (the info column's sheet), the Maison AI
  brief, the LEAD STAGES card (response time, next follow-up, days in stage), the quick links (Create ▾), the attachment / summary cards, the
  Edit details form (`?edit=1`); the **Move stage window** at every step — New (assign), Contacted (log list: Add Log, Auto Fill from a
  WhatsApp chat or a screenshot, the suggested tasks after Save), Met (logs, meeting documents), Quote Sent (upload / pick a quote), Won (the
  project's creation, the contract, the payment split), On Hold (1 / 3 / 6 month · Custom), Lost (reasons, competitor), Resume; the Assign
  popover; the follow-up dialog; the ⋮ (Delete, Return Lead, Invite to Portal, Edit details); Maison AI on the lead. Shots 03 04 05 07.
- **Lane C — the lead's tabs:** Tasks (`/leads/<id>/tasks`: the table or cards, the task panel, comments, filters, templates, the bulk bar —
  the same component as the rail's /tasks: say when a finding is module-wide), Files (grid / list, folders, upload incl. a photo, the file
  viewer `/leads/<id>/files/<fileId>` with comments and info, share, Deleted Files), Notes & Logs (the list, New ▾, the note editor, the
  contact-log editor, attachments, Auto Fill → Add tasks), Meetings (Kelvin's: the list, a meeting, its brief), Questionnaire (the cards,
  answering, Ask the client), Activity. The Quotes and Contracts tabs were done this week — skip them except where the lead's tab frame around
  them breaks. Shots 06.

Start by reading the shots of your lane at all three widths, then the code behind what you saw, then take any extra captures you need.
