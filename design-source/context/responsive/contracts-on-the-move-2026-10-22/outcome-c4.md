# Contracts on the move — C4's outcome (P-07 · P-08 · P-09 · P-10 · P-11 · P-12 · A-09 · A-13 · A-15 · C-06, and wave 2's integration), 2026-10-23

His "I have marked everything in the doc please check and built accordingly" on https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv — Build on every
proposal and fix, the recommended answer on every question (Q-01 a tablet held upright follows the phone · Q-03 the card's status is read-only ·
Q-04 the photo is the signed copy). C4 built **the lists on the move**, **New contract who-first**, **the templates as a list and a reading
screen**, **the contract inside the quote and the project**, **the Won step's and Import's photo**, the fixes A-09 · A-13 · A-15 · C-06, and
**the integration of C1's screens with C2's content** — on the lane (worktree `agent-acf41db72f826dadf`, WIP base `f4fd70a4` = main's Quotes
state + wave 1's C1 · C2 · C3; port 3184; `scratchpad/rc-build/C4/lane.db`). The first C4 agent was cut off by a usage limit; its work was
checked against the brief line by line, kept where it held and corrected where it did not (the hold that was missing, the sheets' facts that
stacked on each other, the amount's data, the to-do chip's place). Nothing committed. Register rows staged in `reg-c4.md` (REG-C4.1 … C4.20).

## 1 · Ledger

| id | call | where / why |
| --- | --- | --- |
| **P-07** the phone card | **built** | `components/leads/contracts/contracts-table.tsx` (+ `.module.css`), words in `contract-card-words.ts` (pure, tested): the client 16/700 (the title on the lead's tab) · the amount it signs 20 tabular (▲ the Quotes card's size, §2) · "Signs OM-10008 · Interior Design Service Agreement" 14 · the READ-ONLY chip + its since 14 · chevron; the whole card opens; a hold selects and the bulk bar deletes (▲ §2); ⋮ = Open · Send a reminder / Send the link again · Copy link · Mark as signed… · Stop the signing link · Change status › · Share PDF · Archive · Delete. The amount comes from `namedQuotesOf` (additive: `amountMinor`, the signed amount when there is one). |
| **Q-03** read-only status | **built** | the card draws a `MetaChip`, never the status button; Change status › in the ⋮ opens the status sheet with every rule of a change (REG-631). |
| **P-08** tablets | **built** | `tabletHidden` on Created · Signed Copy · Updated, both hosts pass `useMediaQuery(TOUCH_TABLET) && !phone` to `useTableColumns`; tablet tracks; Title frozen (locked = pinned); the ⋮ a frozen right cell with its head cell and the mirrored shadow; View dropped; the 150px band and the `(hover: none)` re-placement of the core's actions deleted; the since line at 14. The lead's Contracts tab hides the quick-links strip at 768 portrait (`quick-links.module.css`). |
| **P-09** New contract who-first | **built** | `components/contracts/new-contract-sheet.tsx` (`NewContractSheet`, `LeadWhoList`) on the Create Quote step's composed rows; the Tools + on a phone opens it; `PickLeadDialog whoList` (opt-in) gives the contract hosts' other lead questions the same list on a phone; the picker's list to ≤1024 in a 600 frame with 14-word meta (`contract-template-picker.tsx`). |
| **P-10** templates | **built** | the gallery's phone rows (`LibraryGallery` opt-in `move`, `contract-templates-gallery.tsx`), the list view's tablet default (opt-in `tabletColumns`), the reading screen `components/contracts/template-screen/*` in `contract-template-editor.tsx` on ≤1024 (status row, clause rows → C1's `DocumentFrame` with C2's row, Signature fields and Before the client signs as screens with C2's panels, a PDF's one Open the PDF), the ghosts (`template-ghost.tsx`, the gallery's `rows` ghost). Desk editor untouched. |
| **P-11** inside the quote and the project | **built** | the quote hero's 44 "Contract · {status} ›" row (`components/quotes/screen/quote-screen.tsx`, additive; rq-k1's one assertion changed deliberately); the project Overview's **Documents** card ≤1024 (`components/projects/overview/documents-card.tsx`, `documents.ts` `projectDocumentRows`, `lib/projects/queries.ts` `contract.sentAt` additive); the To collect tile's contract line at 14 (`project-money.tsx`, `money.module.css`). |
| **P-12** the photo (Q-04) | **built** | `components/contracts/photo-or-file.tsx` (Take a photo · Choose a file), `read-picture.ts` (HEIC → JPEG ≤2000px + a 480 picture), `lib/contracts/picture.ts` (words, checks), the Won step (`move-stage/panels.tsx`: the rows on touch, Upload first when nothing is in the system), Import (`import-contract-dialog.tsx`), the record (`lib/contracts/won.ts` · `files.ts` `keepContractPicture` · `app/contracts/actions.ts` `createContractDoc` photo branch + Duplicate's refusal), the pages that show a photo (`contract-pdf.tsx` `picture`, the editor / Preview / Contract screen words). The S34 renderer seam is said in `files.ts` and `won.ts`. |
| **A-09** module rings | **fixed** | the three `button::after { inset }` rules deleted (toolbar, table, filters). The lint holds 7 of 10 (`icon-button-overlay`); three files now hold fewer than the baseline — the orchestrator lowers it. |
| **A-13** Share PDF | **built** | one Share PDF on touch (phone and touch tablet); the desk keeps Download as PDF · Print. |
| **A-15** Send together | **built** | two-line rows at 14 (`send-bundle-dialog.module.css`); the message folds to three lines under a fade with Show all (`MessageField fold`, opt-in, `dialogs.tsx`); ▲ §2. |
| **C-06** key hints on touch | **fixed** | `components/om/tooltip.tsx` (a house piece) keeps the pointer type: no bubble from the focus a tap leaves, no keys for a touch pointer. |
| A-01 A-02 A-03 | built (P-07) | the card, its whole-card press, the read-only chip. |
| A-04 A-05 A-06 | built (P-08) | the tablet set, the frozen ⋮, no strip at 768 portrait. |
| A-07 | built (P-07) | the to-do chip keeps its words on a line of its own on a phone and beside the title from 768; it folds to glyph + count only when the row measures it can't hold them (▲ the desk at 1025, §2). |
| A-08 | built (P-13) | the since 14 on the card and the tablet table; Send together's statuses 14; the Archived / Deleted note 14 on touch. |
| A-10 | built (P-09) | the who list. |
| A-12 | built (P-13) | Filters on a phone = one sheet of chips (the Quotes Filters' K4 shape) — `contracts-filters-modal.tsx`. |
| A-14 | built (P-07) | Archived / Deleted rows as the card: named facts that wrap as words (`deleted-contracts-sheet.module.css`, `data-card`, contract sheets only). |
| C-01 C-02 C-03 C-07 | built (P-10) | rows, no thumbnail, no checkbox, folders under the templates. |
| C-04 | built (P-13) | the standing as 14 words on ≤1024 (rows, the 1024 cards, the picker's list); the chip stays the desk's. |
| C-05 | built (P-08) | the gallery list view's tablet default. |
| C-09 C-12 C-18 | built (P-10) | the reading screen; one Open the PDF. |
| C-14 | built in part (P-13) | in C4's surfaces: the Money tab's tile lines, the gallery's lines, Import's sentence, the sheets' note, the since lines, the picker's meta. **Kept**: the house Dialog subtitle (the picker's 12px subtitle), the house Dropdown's 12px help and the Move stage window's subtitle — house pieces K5 already raised as the house head's question; not changed here. |
| C-20 | built (P-09) | the picker's list at ≤1024. |
| C-21 | built (P-11) | the 44 row; the Next line was REG-2601. |
| C-23 C-24 | built (P-11) | Documents; the contract line. |
| C-25 C-27 | built (P-12) | Import's photo and 14 sentence; the Won step's rows. |
| **Integration (a)** | **built** | C1's Signature fields / Before the client signs screens mount C2's `SignatureFieldsPanel` (+ placement) and `BeforeSigningPanel` (`bare`) on `doc.panelCard`; `esign-screens.tsx` deleted; a placed field lands on the Document screen with the pulse and Undo (the contract's and the template's). |
| **Integration (b)** | **holds** | the Document frame's ≡ is an IconButton labelled "Outline" (its accessible name); asserted at 1024 by rc-c4 and by ct-r4 / sw-r2 on the lane. The frame now sets `--doc-tools-top: 0px` so C2's row pins under its bar at 768–1024 (it pinned 132px down). |
| **Integration (c)** | **built** | the template's clauses open in C1's `DocumentFrame` with C2's content. |

## 2 · Decisions taken (as recommended; ▲ = for him to see)

1. ▲ **A hold selects on a phone, the bulk bar deletes** — the brief's "a long press selects"; the desk table keeps no selection column (REG-177), so the hold is the phone's own way to delete several (the Quotes card's bar: Delete through the same confirm). Without a bar the hold would have selected for nothing.
2. ▲ **The amount reads 20, not 18** — the Quotes card's `heading-h3`, so the two lists a designer flicks between read the same (18–26 is the brief's range).
3. ▲ **An expired link's chip says it with its day** ("Link expired 22 Oct ’26", yellow) and its since stays "sent 10d ago · not opened" — the Quotes card's "Expired 21 Sep ’26"; the ⋮ offers Send the link again. No second to-do chip ("1 link expired"): it needs a filter the desk lacks and would change the desk's toolbar; the awaiting chip keeps its words.
4. ▲ **The to-do chip on a desk at 1025–~1100**: where the row can't hold the title, the chip and the tools, the chip folds to its glyph and count (its words its name and tooltip) and the title reads whole — before, the title read "All Cont…". The Quotes toolbar's rule. 1440 is byte-identical; 1025 differs by exactly this (§7).
5. ▲ **Send together's message folds on a phone** to its first three lines under a fade with Show all (a tap in the box opens it whole). With four documents the message itself is under the first screen of a 390×844 sheet — physically nothing keeps a tools row there without hiding documents — so the rule is: once the message is in view, its tools are too. With two documents the sheet fits.
6. ▲ **A field placed from the Signature fields screen is shown landing** — the Document screen opens on it at mid-screen with the pulse and "… added under Signatures · Undo" (← returns to Signature fields for the next one, Done to the contract). Staying on the list would have hidden where it went; the template does the same.
7. ▲ **On touch the Won step opens the contract on Upload when the lead has no contract in the system** — From System could only offer "Create Contract", which leaves the step; the photo is the one thing at hand on site.
8. ▲ **The photo is the contract's file and its signed copy** (`file_id` = `signed_file_id`); one photo per contract (a multi-page signed contract goes in as a PDF through Choose a file); a photo-signed contract can't be duplicated (its file is that signing's copy); its pages show the picture and say "Signed on paper".
9. ▲ **The gallery rows' ⋮ keeps the shared kebab's order** (New contract from this template · Set as default · Use at handover | Duplicate · Move to Folder · Rename | Delete) rather than the brief's (… Rename · Move to folder · Duplicate · Delete) — the desk's cards and the rows read the same menu; no Open (the row is the open).
10. ▲ **The template's signing row is named "Signature fields"** (the brief: "Signatures") — the agreement already has a "Signatures" clause row; one word would have shown twice.
11. **768 upright shows the template rows (Q-01); 1024 sideways keeps the grid** and the list view with its tablet set; the template's reading screen is the phone model up to 1024 with the Outline as a pane at landscape.
12. **The Documents card shows both rows always** ("None yet" for the missing one) and none when neither exists; the 14 help lines are scoped to the Money tab (the house StatTile stays 12 — other modules' tiles are theirs).
13. **`PickLeadDialog whoList` is opt-in** — the contract hosts pass it; Messages, Meetings and the task templates keep their form.
14. **The who list's "Recent"** = the leads with the newest contract activity (the Quotes workspace's rule on its own records).
15. **Words**: every invented word is marked in `reg-c4.md`.

## 3 · Shared pieces changed (and why each is safe)

- `components/om/tooltip.tsx` — C-06: a `touched` ref from the pointer; a mouse and a keyboard behave as before (kb-r1 / kb-r2 untouched paths).
- `components/leads/detail/quick-links.module.css` — the 768-portrait rule names `contracts` beside `quotes`.
- `components/leads/detail/tab-ghosts.tsx` — the Contracts ghost's phone card 104 tall, three lines (REG-708).
- `components/company/templates/library-gallery.tsx` · `.module.css` · `.skeleton.tsx`, `components/company/company-ghosts.tsx` — opt-in `move` (rows, `tabletColumns`), `rows` in the skeleton; only the contract gallery passes them (the other libraries byte-identical: §7 compares the contract gallery; the opt-in classes draw nothing without `move`).
- `components/contracts/editor/dialogs.tsx` + `contract-editor.module.css` — `MessageField fold` (opt-in, a phone only) and its height held at the fold; every other host unchanged (its max-height is `none`).
- C1's files: `components/contracts/editor/contract-editor.tsx` (the panels, the landing, the photo words), `components/contracts/screen/esign-screens.tsx` (deleted — its two bodies replaced by C2's panels), `section-screen.module.css` (`--doc-tools-top: 0px` on the Document frame), `contract-document.tsx` and `components/contracts/preview/contract-preview.tsx` (a photo's words and picture).
- C2's files: `components/contracts/document/before-signing-panel.tsx` (`bare`), `document.module.css` (`.panelCard`, `.gatesBare`).
- `components/contracts/render/contract-pdf.tsx` · `.module.css` — `picture` (a photo in the paper's place); PDFs unchanged.
- `components/contracts/pick-lead-dialog.tsx` — `whoList` opt-in.
- `components/quotes/screen/quote-screen.tsx` · `.module.css` (K1's) — the Contract row in place of the chip.
- Projects (additive, ≤1024): `components/projects/project-overview.tsx`, `project-ghost.tsx`, `overview/*`, `money/*`, `lib/projects/queries.ts` (`contract.sentAt`).
- Data, additive: `lib/contracts/queries.ts` (`NamedQuote.amountMinor`, `KeptPdf.picture`), `lib/leads/contracts.ts` (the type), `lib/contracts/won.ts` · `files.ts`, `app/contracts/actions.ts` (the photo branch, Duplicate's refusal). No schema change.
- C1's `section-screen.module.css` also gives the Document frame **room past the paper's end** (`40dvh` after the column): a field placed under Signatures is the document's last block and could not rise to mid-screen — it sat under the snackbar that named it (rc-c2's B-04 check, centre 751 of 844); the room is the editor's scroll-past-end, ≤1024 only.
- Probes changed deliberately, each line commented `(contracts on the move, a deliberate change of this rule)`: `responsive-quotes/verify-rq-k1.cjs` (the chip → the row), `responsive-contracts/verify-rc-c1.cjs` (the Signature fields / Before the client signs screens are C2's panels; the landing; the snackbar's Undo), `responsive-contracts/verify-rc-c2.cjs` (main's copy taken first, then: the Send step through the Contract screen's foot → Show me → the Signature fields screen → which / where → the box lands on the Document screen; the gate rows on the Before the client signs screen; the template step at `?edit=document`), `ui-sweep/verify-sw-r2.cjs` (768: ⋮ › Automation on the Contract screen opens the Automation screen — C1's P-02; the template's Outline is on a clause's Document screen — C4's P-10), `uat-dane-2026-10-01/P4/verify-p4.cjs` (390: a signed contract opens as the Contract screen, its words in the Next line — C1's P-01, found on the merged lane). `verify-rc-c3.cjs` is main's copy, unchanged.

## 4 · For other packages / the orchestrator

- **C1** (`lib/contracts/next-step.ts`): the Signed line reads "Signed just now marked by the studio" — a "·" (or "—") between the day and who would read better; not changed here (C1's words and probe).
- **The ghost kit**: a touch tablet's table ghost still draws the desk's columns (GhostTable has no tablet set) — the same as the Quotes tables after K4; a kit change if wanted.
- **The house Dialog subtitle / Dropdown help** stay 12 on touch (C-14's remainder) — the house head's question K5 raised.
- **design-lint**: three files hold fewer than the baseline allows (icon-button-overlay 7/10) — lower it with `npm run design:lint -- --update` at landing.
- **The demo has no default contract template and no standard PDF template**: rc-c4 stages both (and puts them back).
- CLAUDE.md map lines: `components/contracts/new-contract-sheet.tsx` · `photo-or-file.tsx` · `read-picture.ts` · `template-screen/*`, `lib/contracts/picture.ts`, `components/leads/contracts/contract-card-words.ts`, `components/projects/overview/documents-card.tsx`; `esign-screens.tsx` is gone.

## 5 · What to check in the browser (Dane Owner · Hui Min Admin · Germaine Designer; 390 · 768 · 1024 · 1440)

- **390, Dane** — Tools › Contracts: the cards (client · amount · Signs … · chip + since); tap a card's empty part → the contract; hold a card →
  the bulk bar → Delete asks; ⋮ (Open · Send a reminder · Copy link · Mark as signed… · Stop the signing link · Change status › · Share PDF ·
  Archive · Delete), Change status › → the status sheet; the to-do chip on its own line; Filters → one sheet of chips; ⋮ › Archived / Deleted
  Contracts → the rows as cards; + → Who is it for? → type "Harp" → Harpreet → the three kinds → From the studio agreement; ⋮ › Send together →
  Serena → two-line documents, the message's first lines and Show all.
- **390, a lead's Contracts tab** — the title leads the card; + › Import from File → Take a photo (the camera) → the switch turns on and holds →
  Import → a Signed contract showing the photo ("Signed on paper · a photo"); its ⋮ › Duplicate refuses with the reason.
- **390, the Won step** — a Quote Sent lead with a signed quote and no contract (Harpreet, once her quote is signed) → Move to Won → the contract
  opens on Upload with Take a photo · Choose a file → the photo's row → Save & Convert to Project → Won, the contract Signed with the photo.
- **390, Templates** — Company › Templates › Contracts as rows (Default / At handover first once set); ⋮ › New contract from this template → Who
  is it for?; a row → the reading screen → a clause → the Document frame on that heading → Done; Signature fields → Add → which / where → the
  field lands on the paper with its pulse → Undo; Before the client signs → tap the words; a standard PDF's one Open the PDF.
- **390, the integration** — a Draft contract › Send with no client field → Show me → Signature fields (C2's panel) → Add under Signatures →
  the Document screen shows it landing mid-screen; Before the client signs has no eyebrow.
- **390, inside the quote and the project** — Olivia's quote: "Contract · Draft ›" under the client; Ryan's project: Documents after Progress
  (both rows, ↗, Back returns); its Money: "Contract S$81,355.42 · OM-10004 + 1 variation order" in To collect.
- **768 portrait** — Tools: Title · Lead · Status · Sent with the ⋮ frozen, no View, the since at 14; the lead's tab without the quick-links strip;
  + › From Template → the list in a 600 frame; Templates as rows; a template's reading screen.
- **1024 landscape** — the same tables; Templates keeps its grid; its list view opens with Template · Used by · Updated and the ⋮ frozen; a
  contract's Document screen's ≡ "Outline" → the pane.
- **Germaine (Designer)** — a card's ⋮ › Delete greyed with its rule; a bulk Delete keeps what is not hers and says so; the template rows' Set as
  default / Rename / Delete greyed with their rule. **Hui Min (Admin)** — live.
- **1440** — every page as before (§7). **As a client** — nothing of C4 changes `/sign/*`.

## 6 · Probes and tallies (port 3184, the lane's build; each on a fresh copy of `lane.db`, put back)

- **`design-source/verify/responsive-contracts/verify-rc-c4.cjs`** (+ `rc-c4-pure.mts`, 33 pure checks) — **177 passed · 0 failed** on the final
  build, page errors 0; after it every table of the copy hashes the same as `lane.db` (checked table by table). Sections: the pure words · 390
  Tools (the card, its press, its ⋮ by a measured 44 box, the rows' order, Change status ›, Share PDF → print, Open, the hold / toggle / bulk
  Delete, the to-do chip, Filters as one sheet, Archived and Deleted as cards, the note at 14, the phone ghost's card = the card) · 390 New
  contract (who → search → kinds → made; a template → the list → made), Send together (who → two-line rows, the fold, Show all, held height),
  the lead's tab, Import's photo (→ a Signed contract with an image signed copy, the photo on its page) · the quote's row, the project's
  Documents, the To collect line · the Won step's photo end to end (→ Won, the photo as the signed copy) · the integration (C2's panels on C1's
  screens, which / where, the landing, Undo; the gate words) · Templates (pinned rows, words at 14, no checkbox, the ⋮'s box, folders under,
  no key hint after the + (C-06), New contract from this template, the reading screen, a clause's Document frame on its heading, Outline,
  Done, Signature fields → the landing → Undo, the gate, the ⋮'s rows, a PDF's one Open) · 320 (four pages) · 768 / 1024 touch (the tablet
  set, the ⋮ in view, no View, the since at 14, Open + Share PDF, the title opens, no strip, the picker's list in ≤600, rows at 768, the
  template list view's set at 1024, the tool row under the frame's bar, "Outline") · 1440 (the desk's table, View, ⋮, the gallery's cards, the
  desk editor, the Won drop box, Import's box, no Documents, no contract line). Shots: `scratchpad/rc-build/C4/shots/01…30`.
- Existing probes, on the lane through the regression runner (`scratchpad/rc-build/C4/reg/`, `base.db` = the lane's clean DB), final build:
  **rc-c1 176/0 · rc-c2 90/0 · rc-c3 110/0 · ct-r1 36/0 · ct-r2 24/0 · ct-r3 28/0 · ct-r4 29/0 · sw-r2 27/0 · rq-k1 116/0 · rq-k4 143/0 ·
  rq-k5 79/0 · pm2-s03 79/0 · pm2-s46d 73/0 · pm2-s44r 82/0 · pm2-s02 107/0 · dane-p4 37/0 · dane-p5a 59/0 · dane-p5b 56/0 · ux-p5 59/0 ·
  overlays 67/0 · pj-r1 98/0 · pj-r5 91/0 · pj-r6 82/0 · pj-fix-D 35/0 · pj-gap-f2 84/0 · sp-r3 13/0 · folders-galleries 44/0 ·
  folders-pickers 15/0**; **pj-gap-a 71/1 · pj-gap-b 71/1** — the projects listing's Needs attention ("her row raises nothing while on hold",
  "the listing raises it as a Needs attention reason"): the same 71/1 and 71/1 on the WIP base's own build (`scratchpad/rc-build/C4/before`,
  run on a fresh copy of `lane.db`), not C4's (the listing is untouched). The ghosts: `ghosts/verify-ghosts-same.cjs` for lead-contracts ·
  contracts · co-tpl-contracts · ed-contract · ed-contract-preview · ed-tpl-contract — **every loader is its reveal at 390 touch, 768 touch
  and 1440** (0.00%).
- The first runs found, and the build fixed: rc-c2's landing (the box under the snackbar — the room past the paper's end and a re-centre once
  the paper settles), sw-r2 and dane-p4's steps that C1's Contract screen and C4's reading screen changed (deliberate changes above), and in
  rc-c4: the sheets' facts that stacked on one another, the 12px since on a tablet (a later rule won), the cards' 100 vs 104 heights.

## 7 · The 1440 comparison

`scratchpad/rc-build/C4/compare-1440.cjs` — the WIP base (`git archive f4fd70a4`, built in `scratchpad/rc-build/C4/before`, served on 3194) against
this lane (3184), each on its own copy of `lane.db` with the same staged rows (`stage-cmp.sql`: two Drafts for Serena, an archived and a
deleted contract, a Sent one for Vivien), PNG pixels at 1440×1024 with a mouse and reduced motion. **35 identical of 41**: the list · its row
hovered (View) · its ⋮ · its status menu · New Contract ▾ · Filters · Archived · Deleted · the lead question · Send together's lead question ·
two lead tabs · the picker · Import · the templates gallery · its list view · its New ▾ · a card's ⋮ · the template editor · with eSignatures ·
the contract editor · with eSignatures · the Preview · the Won step's Upload · the project Overview · Money · the quote editor · the lead
Overview; at 1025: a lead tab · the picker · Import · the gallery · the template editor · the project Overview · Money. **The six that differ**:
- `contract-editor-send` (195 px) and `lead-tab-serena-bundle` (4,436 px) — the signing link inside the message carries the server's port (3194
  vs 3184) and, for a set, a fresh random id per opening: the same words, other characters.
- `won-step` (8 px) and `won-step-upload@1025` (1 px) — a 1-unit anti-alias at the Project type field's rounded right corners; the dialog's
  every box is identical to 0.01px (a DOM-box diff); before against before and after against after are each identical — ▲ flagged, as C3's 3px.
- `list@1025` and `list-menu@1025` (5,858 px) — the deliberate to-do chip (§2.4): the title reads whole and the chip folds to "✎ 1"; at 1440
  the row is identical. Shots in `scratchpad/rc-build/C4/compare/` (`*-before.png` · `*-after.png`, `d-*.png` crops).

## 8 · Checks

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` — 3 errors, the pre-existing three in `components/quotes/editor/quote-editor.tsx`
(256 · 291 · 403) · `npm run design:lint` ✓ nothing new breaks a house rule; the baseline untouched (three files hold fewer — lower it at
landing) · the production build (under the shared lock, eight times) · no schema change · `local.db` never touched · 3184 and 3194 stopped,
no build lock left.

## 9 · Principles check (DESIGN-PRINCIPLES.md)

| Principle | Met how |
| --- | --- |
| 1 · The mock wins, every exception written down | no mock below 1025; the drawn screens and his picks are the source; every departure in §2, every invented word in `reg-c4.md`. |
| 2 · One system, no one-offs | the Quotes card's model, `use-long-press`, the house bulk bar, `PortalMenu` + `DropdownItem`, `Dialog`, the Create Quote rows composed (never copied), `Chips`, the table core's `tabletHidden`, C1's frame and section screens, C2's panels; tokens only; no `::after` inset (three removed). |
| 3 · Plain words | "Who is it for?", "Signs OM-10008", "Link expired 22 Oct ’26", "Take a photo", "A photo is kept as the signed copy — it can’t be sent for signing", "Show all", "None yet". |
| 4 · Nothing is lost | every desk action is one tap further (Preview on the contract, Print as Share PDF, Change status in ⋮); every remove keeps its confirm or Undo; the desk unchanged at 1440. |
| 5 · Say why | a refused Delete / Set as default says its rule in the row; a photo says why it can't go out; Duplicate on a photo says why; the expired chip says when. |
| 6 · Back returns where you came from | every new door carries `?from=` (the Documents rows, the template rows, the reading screen's ←); the section screens ride the history (← to Signature fields after a landing, Done to the contract). |
| 7 · Every screen is whole | the ghosts draw the new shapes (the card, the rows, the reading screen, Documents) — loader = reveal at 390 · 768 · 1440; the snackbar never covers the field it names. |
| 8 · Every width is designed | 320 · 390 · 768 portrait · 1024 landscape asserted; 1440 identical; 1025 the one deliberate change. |
| 9 · Tables follow the leads listing | the table core's tablet default, the frozen Title and ⋮, Column settings remembered per breakpoint. |
| 10 · Motion with purpose | the house sheet rise; the fresh pulse where a field lands; the bulk bar's rise. |
| 11 · Honest data | the amount is the quote's signed amount when there is one; the since is the record's stamps; the photo is kept as it was taken; the contract line names its real source. |
| 12 · Reach for everyone | every press a real button with a name (the card's name, the rows, the ⋮ "More actions for …"), 44 boxes measured, the who list a labelled section with a search, the fold opens on focus. |

