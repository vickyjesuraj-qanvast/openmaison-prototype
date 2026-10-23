# Contracts on the move — the build (2026-10-22, late evening)

The owner (Vicky, he/him, the product designer) marked the review page https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv ("Contracts on the
Move"): **Build on all thirteen proposals P-01…P-13, Build on all ten stand-alone fixes (A-09 · A-13 · A-15 · A-24 · A-25 · B-17 · B-21 · C-06 ·
C-13 · C-26), and the recommended answer on every question** — Q-01 a tablet in portrait gets the phone model · Q-02 Type first, Draw one tap
away · Q-03 the card's status is read-only · Q-04 the photo is the signed copy · Q-05 paper first on the client's page · Q-06 "Save a copy" is a
keepable signed page until the PDF renderer · Q-07 the primary map Draft → Send · Sent → Remind · Signed → Move to Won / Download signed copy ·
Q-08 Leads is the next module. His words: "I have marked everything in the doc please check and built accordingly."

You build ONE package (your prompt names it). Four packages run in two waves; each owns its files; nobody commits.

## Read first (absolute paths; your worktree does not hold the scratchpad)
1. The review page's data — every proposal, finding and question with its words: this folder's `review-page-data.json` in your worktree
   (`design-source/context/responsive/contracts-on-the-move-2026-10-22/review-page-data.json`: `proposals[]` = P-01…P-13 with today / proposed /
   why; `surfaces[].findings[]` = A-/B-/C- ids with what · fix · absorbed-by; `questions[]`). His picks: `picks-2026-10-22.json` beside it.
2. The lane audits behind the findings, with their measurements and the shots they cite: `audit/A-lists-and-the-clients-side.md` ·
   `audit/B-the-contract-editor.md` · `audit/C-templates-and-the-pieces-inside-other-flows.md` (in your worktree). The shots:
   `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rwd-contracts/shots/`
   (+ `A/`, `B/`, `C/` beside it). The drawn screens: `audit/drawn-screens.html` (render it in a browser — the shape to build, with OpenMaison's tokens).
3. **What Quotes built this afternoon — the pieces you reuse (REG-2525…2587; record `../quotes-on-the-move-2026-10-22/`, read its `brief.md`
   § The design and the outcomes of K1 · K3 · K5):** the Quote screen `components/quotes/screen/*` (`QuoteScreen`, `ScreenBar`, `SectionList`,
   the folds, the foot, `screen-context.ts`), `lib/quotes/next-step.ts` (the model for the contract's), the paper viewer
   `components/quotes/confirm/paper-viewer.tsx`, the reading cards `components/quotes/confirm/reading-cards.tsx`, the client page layout
   `components/quotes/confirm/client-layout.ts`, the full-screen text editor (`Dialog phoneFull`, `components/quotes/editor/text/text-section.tsx`),
   the send sheet that fits (`components/contracts/editor/dialogs.tsx` `MessageField`/`RecipientFields`), the picker list
   (`components/contracts/contract-template-picker.tsx`), the table core's tablet default (`components/om/table-columns.ts` `tabletHidden`,
   `useTableColumns(…, tablet)`), the phone card and its words (`components/leads/quotes/quote-card-words.ts`, `use-long-press.ts`), the Create
   Quote phone step (`components/quotes/create-quote-modal.tsx` "Who is this quote for?"), `useSheetFootLift` (`components/om/sheet.tsx`), the
   Dropdown's ≤1024 clamp, the house `CodeBoxes` (`components/om/code-boxes.tsx`), `components/om/signature-pad.tsx`, the ghost kit.
4. In the repo: `CLAUDE.md` (How we work · the Map's Contracts and Quotes entries), `DESIGN-PRINCIPLES.md`, `design-source/context/responsive.md`
   § *On the move* (the rules you extend), `design-source/context/page-checklist.md`, the REG rows named in comments near what you change
   (`design-source/REGISTER.md`; the Contracts decisions are REG-534, REG-629…635, REG-1691…1700, REG-2572…2587), `lib/contracts/*` (`policy.ts`
   `linkState` · `quoteHoldsSigning`, `model.ts` `awaitingLine` · `signingMessage` · `reminderMessage` · `contractLink`, `readiness.ts`,
   `status.ts`, `tokens.ts` `outlineOf` · `signField` · `signFieldsIn`, `snapshot.ts`, `won.ts`, `files.ts`).

## The design (the contract every package follows)
- **Widths.** Phone = `(max-width: 767px)` in CSS and `useSheetLayout()` in render. Touch tablet = `(max-width: 1024px)` and
  `useMediaQuery(TABLET_DOWN)`; a tablet held upright follows the phone (Q-01, `TABLET_PORTRAIT` in `lib/breakpoint.ts`). Desktop ≥1025 is the
  mock and stays **byte-identical** at 1440. Touch rules carry `@media (max-width: 767px), (hover: none) and (max-width: 1024px)` (REG-307).
- **The scale on ≤1024 (P-13).** Text people read: 16 body, 14 secondary, never under 14 for a value, a name or a sentence (a 12 uppercase
  eyebrow may label a group, nothing else). Amounts 18–26 tabular. Every target 44; the foot's and the client's buttons 48; 16 gutters; 12
  inside cards. Inputs type at 16. Apply it in your own stylesheets under the two media queries; never change a desktop value.
- **The Contract screen (P-01, C1).** On ≤1024 `/contracts/<id>` opens the **Contract screen**, not the editor: a 56 bar (← back where you came
  from · the client's name over "Interior Design Service Agreement · from OM-10001" · ⋮ grouped Look · Change · Share · Export, no key hints);
  a hero card (the status chip · From template · the contract date as a pressable row · the quote row "OM-10001 · S$49,838.00 · Confirmed" →
  the quote sheet · the client row: avatar · name · number · Call · WhatsApp · ✎ Edit recipient; Signed adds "Signed 31 Jul ’26 · by Ryan
  D’Souza online / marked by the studio"); **one Next line** from `lib/contracts/next-step.ts` (pure, on `lib/quotes/next-step.ts`'s model;
  `linkState` + `awaitingLine` give the words): Draft → "send it to {first} for signature — the client signature box is in place" or the
  readiness blocker; Sent → "With {first} for signature, sent 20 min ago · not opened yet · link open until 29 Oct" (expired → "the link closed
  on …; send it again"); Signed → "Signed … · the quote is signed through it · the lead is still in Quote Sent"; the clauses as **reading
  cards** split at the headings (`outlineOf`; the first open, the rest folded; `ContractPaper`'s reflowed body, already 16px), the signature
  boxes as the last card "Signatures · Studio · Client — placed"; folded rows (56) Signature fields · Before the client signs · Automation ·
  Files / Signed copy · Activity; a **sticky foot** (48): **Edit** + the state's one primary — Q-07's map: Draft → **Send** · Sent → **Remind**
  (**Send again** once the link expired) · Signed → **Move to Won** while the lead is not Won, else **Download signed copy** (no Edit on Signed —
  the copy is kept, REG-631). "As printed" opens the house paper viewer; the Preview page at ≤767 is the reflowed paper under one bar (← ·
  Preview · Download · ⋮) with **Paper** as a toggle to the viewer (K3's pattern); 768–1024 the paper at 1:1 under the same bar. Signed = the
  reading screen with no toolbar.
- **Edit is a short list (P-02, C1).** `?edit=1` opens the **section list** (K1's `SectionList`): **Details** (title · recipient and number ·
  contract date · the quote · issued by — one form sheet, inputs at 16, the four things that change on site) · **Document** (the paper,
  full-screen — C2's content in C1's frame) · Signature fields · Before the client signs · Automation · Files — each with its one-line summary;
  `?edit=<key>` opens that section as a screen; Back works (REG-465). 1024 landscape: the list as a 300 pane beside the open section; the
  Outline is a pane, never a drawer over the paper. ✕ returns to the Contract screen.
- **The Document screen (P-03, C1 frame + C2 content).** `?edit=document` opens the paper **full-screen** (`Dialog phoneFull` or the section
  screen frame — C1 exports `DocumentFrame` from `components/contracts/screen/document-frame.tsx`: a 56 bar (← · "Document" · the clause as the
  sub-line · Outline ≡ · Done), the body = children). C2 makes `DocToolbar` + `DocEditor` the content at ≤1024: **one 44-pitch tool row** —
  Undo · Text style ▾ · B · I · U · List · **+ ▾** (a sheet: Insert a field with its "prints as" values in one level · Add a signature field › ·
  Link · Image · Highlight · Alignment · Numbered list) — nothing scrolls sideways, nothing hidden; the desk's bar at ≥1025 is untouched. No
  Maison AI button over the paper (the frame hides it as REG-2587 does for a section screen). A tap on a Smart Text chip on touch opens
  "Client name · prints as Harpreet Kaur · Remove" (B-19). The Outline (≡) closes on pick and lands the heading mid-screen (today's, kept).
- **A signature field is placed by choosing where (P-04, C2).** On touch **Add a signature field** asks *which* (Studio · Client · initials,
  with "placed" marks) then *where* — the document's clauses from the Outline ("After 11. Governing law and disputes" · "Under Signatures", picked
  for you when a Signatures heading exists · "At the end") — inserts the field as **its own block after that clause** (pure
  `insertSignFieldAfter(html, afterIndex | 'end', key)` in `lib/contracts/tokens.ts`, never inside a word), closes the sheet, scrolls the box to
  mid-screen with the fresh pulse (`attention()`'s pattern) and says "Client signature added under Signatures · Undo". On touch a placed box has
  its own ✕ (removes with Undo). The eSignatures sheet splits into two folds / section screens: **Signature fields** (placed / not placed · Add)
  and **Before the client signs** (the two switches as full-width label rows — C-13; their help at 14). At 1024 the pane is the placement list
  beside the paper, which slides left (no drawer over the place a field lands). Desk: unchanged.
- **The client's signing page (P-05 · P-06, C3).** `/sign/<token>` (and the bundle, and `/sign/<token>/quote`) on ≤1024 (and a tablet held
  upright): a 64 head (the studio · "Secure signing"); a 3-line hero card (the agreement · "Signs quotation OM-10008 · S$68,176 → As cards" ·
  "Hi Vivien, read it, then sign with a one-time code"); **the paper first**, reflowed at 16 as today; a **sticky bar**: "Read to the end to
  sign · 3 of 11 sections" (a progress hint from the headings as they scroll past) while reading, then **Accept and sign** (48, filled) once
  the end is reached (REG-633's gates stay rules: read to the end, tick to accept); the quote as the confirmation page's `ReadingCards` **in
  place** (a layer, not a new tab; "As printed" → the `PaperViewer`), never a zoomed A4. **Accept and sign** opens a bottom sheet in three
  screens, one filled button each: (1) the words to tick (16) and the CaseTrust box; (2) the **six code boxes** (`CodeBoxes`, `autocomplete=
  "one-time-code"`, `inputmode="numeric"`; the demo's "any six digits" said plainly — `SIGN_CODE_DEMO`); (3) **Type** first (the name
  prefilled, the serif preview) with **Draw** one tap away — a full-width pad at a **fixed 2:1** (`SignaturePad` keeps its 752×140 viewBox with
  `preserveAspectRatio="xMidYMid meet"`, the stored path unchanged in shape — shared with Signature Settings, say so), Clear under it, "Add
  NRIC / FIN" folded; the consent sentence at 16. On Sign the sheet closes and the page lands on the signature box: **Signed · Save a copy ·
  Pay the deposit · Signing record** (the record one tap away, not 3,800px down). **Save a copy** (Q-06, A-24): the signed page itself is the
  copy — a "Save a copy" row that opens the device's share sheet where `navigator.share` exists and otherwise says the page stays at this link,
  with the signing record and the hash; `window.print()` is never the answer on a phone (WhatsApp's browser does nothing) — the desk keeps
  Download. The dead-link notices (`/sign/none`, expired, inactive) carry **Message {studio}** (K4's `notice-message.tsx`, pass the contact —
  A-25). The chat card (`/card/sign/<id>`, C-26): the eyebrow and "For {client}" large enough to survive WhatsApp's ~300px preview (≥ 36 and
  ≥ 48 of 630). 48 buttons and 16 inputs on every client page at ≤1024; the desk's signing page at ≥1025 as it is.
- **The lists (P-07 · P-08, C4).** The phone card (REG-2547's, `components/leads/quotes/*` is the model): the **client's name** 16/700 with the
  **amount** 18 right (the quote it signs; none → the title alone) · "Signs OM-10008 · Interior Design Service Agreement" 14 · a **read-only**
  status chip (Q-03) with its since (`awaitingLine`: "sent 2d ago · not opened" · "link expired" · "signed 12 Sep") and a chevron; the whole
  card opens the contract; a long press selects (`use-long-press.ts`); ⋮ = Open · Send a reminder (Send the link again when expired) · Copy
  link · Mark as signed… · Stop the signing link · Change status › · Share PDF · Archive · Delete; the to-do chips keep their words ("3 awaiting
  signature"). The lead's tab: the same card, the title first. Deleted / Archived sheets' rows = the card. Tablets ≤1024 open the tables
  with a **default set** — Title · Lead · Status (+ since) · Sent — Title and ⋮ frozen, View dropped (the title opens), the rest in Column
  settings remembered for the tablet (`tabletHidden`); the module's `@media (hover: none)` override of the table core's sticky actions goes
  (A-05); no quick-links strip on the lead's Contracts tab at 768 portrait (K4's rule, `quick-links.module.css`). The templates gallery's list
  view takes the same tablet default (C-05).
- **New contract (P-09, C4).** On ≤767 the lead question is the Create Quote phone step: **Who is it for?** — recent leads first, a search
  (`SearchBar`; REG-2585 made it tappable) — then the kind as rows: From the studio agreement · From a template (the picker's list, the suggested
  one picked) · Import from file. The picker's **list goes to ≤1024** (the tablet's cards go, C-20). Import keeps today's sheet; Send together
  keeps REG-2578's sheet with the message growing and the tools row never below the fold (A-15: the count only ≥768, as REG-2578).
- **Templates (P-10, C4 + C2's content).** Company › Templates › Contracts on ≤767 is a **list**: Default and At handover pinned on top, each
  row name 16/600 · "13 headings · used by 5 · edited 14 Aug" 14 · chevron; the row opens the template's **reading screen**
  (`/templates/contracts/<id>` on ≤1024): a 56 bar (← · the name · ⋮), a status row ("Default · used by 5 · fills 10 fields · client signs ✓"),
  the clauses as rows that open **full-screen to edit** (C1's `DocumentFrame` with C2's content), Signatures and **Before the client signs** as
  rows with switches, Save. A standard PDF template keeps its picture with one Open the PDF (48). The row's ⋮ = New contract from this template ·
  Set as default · Use at handover · Rename · Move to folder · Duplicate · Delete. The state chips read as 14 text in the row (the chip stays a
  mark, C-04); help lines 14 (C-14); the + loses its key hint on touch (C-06: `Tooltip shortcut` hidden under the touch query — a house piece,
  say so). Desk ≥1025 unchanged.
- **The contract inside the quote and the project (P-11, C4).** The quote's hero on ≤1024 gets a 44 row **"Contract · Sent to Client ›"** (opens
  the contract) under the client row when a contract exists (`components/quotes/screen/quote-screen.tsx` — K1's file, a small additive change;
  rq-k1 must stay green); the Next line already reads a sent contract (REG-2586). The project Overview gets a **Documents** fold (the signed
  quote · the contract, each a 48 row with its date and ↗ — C-23); the To collect tile shows the contract total at 14 with its source (C-24).
- **The Won step and Import take a photo (P-12, C4; Q-04 photo).** On touch the Won step's "Attach client signed contract" and Import's dropzone
  become two rows — **Take a photo** (`capture="environment"`, images) · **Choose a file** (PDF or image) — the photo kept as the signed copy
  (`lib/contracts/won.ts` `recordWonUpload` + `lib/contracts/files.ts`: an image file in Files › Contract & VOs as the signed copy; the contract
  Signed with `signed_file_id`; no PDF conversion — the S34 renderer is the developers' seam, say so in a comment). The desk keeps "Drop your
  file or browse · PDF".
- **Fixes with their own rows.** A-09 the three module stylesheets' `button::after { inset }` overrides (`contracts-toolbar.module.css`,
  `contracts-table.module.css`, the third the lint names) are deleted — the house box carries the target (the lint `icon-button-overlay`
  ratchets; the orchestrator lowers the baseline). A-13 on touch the row ⋮'s "Download as PDF · Print" become one **Share PDF** (the print sheet
  stand-in, as K3's) — the desk keeps both. B-17 the Send for digital signature sheet fits a phone (the subtitle one line + "How signing works" as
  a fold; deposit help 14; the duplicate "Signed in person? Mark as signed" line dropped on ≤767 — it is in ⋮). B-21 a snackbar never lands on a
  menu sheet's last rows (`useSheetFootLift` for a menu sheet's body bottom, or the snackbar waits while a sheet is open — a house piece, say so).
- **House rules that stand.** Bottom sheets for menus and form modals ≤767 (REG-353); one filled button per screen; every remove answers with
  Undo; a refusal says why; plain words; `data-kb` where a key presses; tokens only (`npm run design:lint` must hold — never raise its baseline;
  **never `button::after { inset … }`** — grow a button by `min-height`); the ghost of every page draws the page as it now looks at that width
  (REG-708: a phone's `loading.tsx` ghost = the Contract screen's shape); empty states on the house `EmptyState`; **a server action never takes a
  long string as a bare argument** (pictures travel in one object); every refusal answers `{ error }`; **nothing a desktop can do is lost; it is
  one tap further.**

## Packages and ownership (edit only your files; name any other change under "Shared pieces changed" in your outcome)
| Pkg | Builds | Owns |
| --- | --- | --- |
| **C1** | P-01 · P-02 · P-13 on its screens · the Preview (B-09 B-10) · B-17 · B-21 · B-24 (+ absorbed B-01 B-02 B-06 B-07 B-08 B-11 B-14 B-15 B-16 B-18 B-22 B-23 C-22) | `app/(editor)/contracts/[id]/**` (+ ghosts), `components/contracts/editor/contract-editor.tsx`, `contract-header.*`, `contract-banner.tsx`, `title-input.tsx`, `dialogs.tsx`, `contract-skeleton.*`, `contract-route-ghost.tsx`, `contract-editor.module.css`, `components/contracts/preview/**`, new `components/contracts/screen/**` (the Contract screen, hero, next line, folds, the section list wiring, `document-frame.tsx`), new `lib/contracts/next-step.ts` (pure + tests); `components/quotes/screen/*` only to **export** what the contract reuses (never a copy of its stylesheet; rq-k1 stays green); shared: `components/om/date-field*` (B-24, 44 calendar cells ≤767), `components/om/sheet.tsx` + `snackbar.module.css` (B-21) |
| **C2** | P-03 (content) · P-04 · C-13 · C-15 · C-16 (+ absorbed B-03 B-04 B-05 B-12 B-13 B-19 B-20 C-08 C-10 C-11 C-17) | `components/contracts/editor/doc-editor.tsx`, `doc-toolbar.tsx`, `esign-panel.tsx`, `outline-pane.tsx`, new `components/contracts/document/**` (the one tool row, the + ▾ sheet, the placement sheet, the chip sheet), `lib/contracts/tokens.ts` (`insertSignFieldAfter`, pure + tests), `components/contracts/render/contract-paper.tsx` only for the box's ✕ on touch; the desk's bar and editor at ≥1025 untouched |
| **C3** | P-05 · P-06 · A-24 · A-25 · C-26 (+ absorbed A-16 A-17 A-18 A-19 A-20 A-21 A-22 A-23 A-26) | `components/contracts/sign/**`, `app/sign/**` (the page, the bundle, `/sign/[id]/quote`, their ghosts), `lib/contracts/link.ts` / `link-server.ts` only additively, `lib/link-cards/*` for the sign card (C-26), shared: `components/om/signature-pad.tsx` (the fixed ratio — Signature Settings uses it too, say so), `components/om/code-boxes.tsx` (autocomplete, if missing — say so), `components/contracts/sign/link-notice.tsx` · `link-gone.tsx` (A-25, pass the contact) |
| **C4** | P-07 · P-08 · P-09 · P-10 · P-11 · P-12 · A-09 · A-13 · A-15 · C-06 (+ absorbed A-01…A-08 A-10 A-12 A-14 C-01 C-02 C-03 C-04 C-05 C-07 C-09 C-12 C-14 C-18 C-20 C-21 C-23 C-24 C-25 C-27) | `components/leads/contracts/**`, `components/contracts/list/**`, `contract-template-picker.*`, `import-contract-dialog.*`, `pick-lead-dialog.tsx`, `send-bundle-dialog.tsx`, `deleted-contracts-sheet.tsx`, `components/company/templates/contract-templates-gallery.tsx` (+ `library-gallery.tsx` only for the list's tablet default — shared, say so), `components/contracts/editor/contract-template-editor.tsx` + `app/(editor)/templates/contracts/**` (the reading screen on ≤1024, mounting C1's `DocumentFrame` with C2's content — wave 2), `components/leads/move-stage/panels.tsx` (the Won step's two rows) + `lib/contracts/won.ts` · `files.ts`, `components/projects/overview/*` (the Documents fold) and `components/projects/money/*` (the tile's contract total) — Projects files, additive and ≤1024 only, say so —, `components/quotes/screen/quote-screen.tsx` (the Contract row, additive), `app/contracts/**` ghosts, shared: `components/om/tooltip.tsx` (C-06) |

Waves: **1** = C1 · C2 · C3 (in parallel) · **2** = C4 (after C1 and C2 land: it mounts `DocumentFrame` and C2's content for a template's
clause). C1 and C2 build in parallel on a contract: **C1's `DocumentFrame`** = the full-screen frame (bar + Done + the address) whose body is
whatever C1 mounts there — today's `DocToolbar` + `DocEditor`; **C2** changes those two components' insides so that at ≤1024 they are the
one tool row + the paper; neither needs the other to land first. If you find you must touch another package's file, stop and write what you
need in your outcome under "For other packages" instead.

## Rules for the package
- **Your worktree is your repo.** Work, build and probe ONLY in your working directory (your cwd, a git worktree). Never edit
  `/Users/vicky/Documents/GitHub/openmaison-prototype` itself; never touch ports 3000 / 3001; never write any `local.db`.
- **Set-up once, from your worktree:**
  `bash /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rc-build/setup-lane.sh <C>`
  — it applies main's **uncommitted** Quotes-on-the-move state to your worktree and commits it on your branch as the lane's "WIP base" (main
  itself holds the same files uncommitted; the base commit is yours alone and never lands), clones `node_modules` in, and copies the base demo
  database to `…/scratchpad/rc-build/<C>/lane.db`. Use that database on EVERY command that needs one (`DATABASE_URL=file:<path>` on the same
  line — a shell `export` does not survive to the next tool call). Your diff for landing is `git diff <WIP base>`.
- **Builds take the lock** (one build at a time on this 18 GB machine):
  `until mkdir /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rc-build/build.lock 2>/dev/null; do sleep 15; done; DATABASE_URL=file:<lane.db> npx next build; rmdir …/build.lock`
  — always release it, also when the build fails. Run the build in the background and wait for its notification.
- **Your port:** C1 3181 · C2 3182 · C3 3183 · C4 3184 (`DATABASE_URL=file:<lane.db> npx next start -p <port>`; kill it by port when done:
  `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`).
- **No schema change is expected.** If one is unavoidable, additive only, and say exactly what it does in the outcome.
- **Checks before you finish:** `npx tsc --noEmit -p .`, `npx eslint app components lib` (3 errors in `components/quotes/editor/quote-editor.tsx`
  pre-date everything — ignore those three only), `npm run design:lint` (never raise its baseline), the production build, YOUR probe green, and
  every existing probe your change could touch, run against your lane (grep `design-source/verify/**/*.cjs` for the ids, addresses, words and
  layouts you change — the Contracts probes `contracts-parity/verify-ct-r1…r4.cjs`, `pending-modules/verify-pm2-s03.cjs` (signing links, PDFs),
  `s02` (client links, the sign card), `s44q` · `s44r`, `uat-dane-2026-10-01/P5a` · `P5b`, `ux-build-2026-09-30/P5`, `responsive-quotes/verify-rq-k1…k5.cjs`
  (the Quote screen and the shared om pieces), `projects/verify-pj-*` for the Overview / Money tile, `consistency/verify-overlays.cjs`; update an
  assertion only for a deliberate change, commented `(contracts on the move, a deliberate change of this rule)`). **1440 must be byte-identical:**
  take the page at 1440×1024 before and after on your lane and compare (a pixel diff); say in the outcome which pages you compared (the editor,
  the preview, the signing page, the list, the templates gallery, a template's editor — the ones you touch).
- **Shots:** 390×844 and 768×1024 with `isMobile: true, hasTouch: true`, 1024×768 touch where your package changes a tablet layout; tablet
  shots viewport-only (a full-page capture drops `(hover: none)` mid-shot); measure overflow against `documentElement.clientWidth` (under touch
  emulation `innerWidth` grows with overflowing content); check 320 too. Shots go in `…/scratchpad/rc-build/<C>/shots/`.
- **Probe:** `design-source/verify/responsive-contracts/verify-rc-<c>.cjs` in the shape of `design-source/verify/responsive-quotes/verify-rq-k5.cjs`
  (args `<scratch.db> [shotDir] [base]`, env `BASE`, sqlite3 with `-cmd ".timeout 30000"`, refuses `local.db`, puts back what it changes, asserts
  rules not another round's counts, real taps for every new press, touch boxes measured with `getBoundingClientRect` + `elementFromPoint` — an
  icon's ligature text is not a button's name, a radio's row is its label, the hit target of a SearchBar is its shell, a Send ▾ is found
  `visible=true`). Every new press is exercised on the production build; the page error log stays empty.
- **Register rows:** stage them in `design-source/context/responsive/contracts-on-the-move-2026-10-22/reg-<c>.md` as
  `| REG-<C>.n | Area | **What** — why (his "please check and built accordingly" 2026-10-22 on the Contracts-on-the-move page; P-xx / A-xx …;
  decisions as recommended) *(invented copy: …)* | user-directed |` (a bug fix row ends `| bug fix |`). Don't edit `design-source/REGISTER.md`
  or `CLAUDE.md` (the orchestrator does; rows are numbered from REG-2588 at landing).
- **Outcome:** `…/contracts-on-the-move-2026-10-22/outcome-<c>.md`: a **ledger** with every id assigned to you (P-, A-, B-, C-), each built
  (where) · kept (why) · not done (why); decisions taken (the ones he should see flagged ▲); **Shared pieces changed**; **For other packages**;
  what to check in the browser (Dane Owner · Hui Min Admin · Germaine Designer; 390 · 768 · 1024 · 1440; the client's page as a client); the
  probes run and their tallies; the 1440 comparison; a **Principles check** (one line per principle of `DESIGN-PRINCIPLES.md`). Final message:
  10 lines + the outcome path + the list of files you changed or added.
- **His bar (2026-10-12, repeated 2026-10-22):** nothing missed, nothing buggy, every pixel checked, the simplest experience that does the
  job — the fewest steps, plain words, one filled button, Undo, the right default. If something is not world-class yet, fix it rather than note it.
