# S29 · AI writing help on quote text — outcome (2026-10-13, lane A)

Card: `api:ai-writing-help-quotes` (recommendation "needs his mocks / decision"; question "Do you want AI rewrite on Terms / Notes (and contracts)?
If yes, at what credit price, or free?" — taken as recommended by the brief: yes, by rule, **free** as 1.0 was). Carried notes taken: **S10**
(drafts stay `lib/maison-ai/drafts.ts`; the box writes no text — the writing help is a proposal behind its own seam, `proposeWriting`; the
editors' Maison AI sheets open it), **S04** (client-safe: only words a client may read reach a proposal — `lib/writing/sources.ts`; never a
cost, mark-up, vendor or rebate; asserted), **S05** (Notes › Refine's pattern — by rule, Undo — here with the proposal first), **S11** (a
quote template's prose fields carry it; `readLayout` untouched), **S12** (My Items' words for a line come through the matcher's own words,
`matchWords`, at its 0.5 bar), **S19** (no credits: 1.0's writing help spent none; not one of the seven Pro features, so no plan lock).

1.0 read: `src/components/leads/quote-document-editor.tsx` (`handleAiAction` 6300–6370, the section's AI popover 4572–4610, the command
palette's "Regenerate selected section (AI)" 8105), `src/app/api/buddy/chat/route.ts` (the route: no credit spend, `skipTools` never read),
`src/lib/agents/loop.ts`, `src/types/app.ts` (`QuoteDocSectionType`), `src/components/leads/quote-digitizer-dialog.tsx` (where the
document editor lives: a quote's Layout tab; `aiExtracted`), `src/lib/credits/*` (no writing price), `src/components/leads/contract-flow-dialog.tsx`
(no AI on contract text in 1.0 — the card asked for it). Register rows: `steps/reg-S29.md` (REG-S29.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s29.cjs` (**88 / 88**; a full `.dump` of the scratch DB before and after: identical); shots in
`design-source/verify/pending-modules/pm2-s29/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Improve · Shorten · Expand · Rewrite · Plain English on a quote's Terms and Notes (the rich editor) and on a contract's text; no quote audit listed it" | **built, by rule — every one a proposal first** (Not now · Use these words, Undo after). **Terms and Notes**: the mock's Write with AI (1263:36257) opens Improve the writing · Shorten · Add what’s missing (Expand: from the quote's own clauses and the studio's templates) · Rewrite from this quote · Plain English; an empty section opens Write from this quote straight away. **A contract's text**: Write with AI in the formatting bar, on your selection, the clause at the caret or the whole contract, Expand / Rewrite from its template; contract templates Improve · Shorten · Plain English. **Also where the same words are written** (the brief's homes): a line's Description and a Section note (My Items' words, the trade's note), the send dialogs' message, the T&Cs & Notes templates, a Price book item's description, a quote template's Introduction / Text, and Maison AI's sheet in the quote and contract editors + the Ask box. **Stand-in, honest:** no model is called — the rules are `lib/writing/*`; the one seam is `proposeWriting` (a model returns the same `Proposal`). **Credits:** free (1.0 charged none). | REG-S29.1…8; `lib/writing/{html,rules,expand,diff,propose,sources}.ts`, `components/writing/writing-help.tsx` (+ css) |

## Found in 1.0, not on a card
- **The AI badge on a section read from an uploaded quote, and "Remove AI flag"** (`extractedFrom === 'ai'`, `aiExtracted`) — the 1.0 menu
  only appeared on sections a model had extracted. **Not carried, on purpose:** in 2.0 nothing is written by a model (S11's `readLayout` reads
  by rule and says so in its own flow) and nothing goes into a document unseen, so there is no "AI-written" text to flag; the help is offered
  on every text, not only on read ones. Recorded here for S41b.
- **The command palette's "Regenerate selected section (AI)"** — **built in 2.0's shape**: Maison AI's sheet in the quote and contract editors
  offers the help when it would do something (REG-S29.8), and the Ask box answers "rewrite / shorten / plain English the …" where no row
  matches (intent `writing`).
- **1.0's toasts "AI {action}… / applied / failed"** — replaced by the proposal and the house snackbar ("Terms and Conditions improved ·
  Undo"); a rule can't fail, so there is no failure path to carry.
- **For the developers (not 2.0 work):** 1.0's writing calls posted `skipTools: true`, but `/api/buddy/chat` never reads it — every "Improve"
  ran the full 66-tool agent loop. A model behind `proposeWriting` should get the section's words and the sources only, no tools.
- The quote document editor's other parts (sections as blocks, conditional visibility, bulk delete / duplicate, page breaks) belong to the
  quote templates (S11's card) — **for S41b** to confirm against S11's outcome; nothing of them is on this card.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **Yes, by rule, and free** (the card's question). 1.0's route spent no AI credits; its price list has no writing entry; so nothing is metered
  and no plan lock (S19's seven Pro features don't include it).
- **A proposal, always** — 1.0 replaced the section at once; 2.0 shows the change marked word by word and puts it in only on Use these words,
  with Undo. *This changes REG-420*: the quote's Write with AI no longer writes after a 900 ms beat — it shows the composed words first
  (**flag for Vicky**: one more press for an empty section; the brief's rule).
- **One piece, many homes** — `WritingHelp` / `useWritingHelp` is the same trigger, menu and proposal everywhere the words are written; no
  writing tool of its own.
- **The card's five, in plain words**: Improve the writing · Shorten · Add what’s missing (Expand) · Rewrite from this quote / Use My Items’
  words / Use the trade’s note / Back to the template’s wording (Rewrite — from whatever record the place has) · Plain English (1.0's
  "Polish for client" / "Translate into clearer English"). A place offers only what it can do (a template has no quote to write from; a
  message has no record to add from); a row that can't act now says why in the row.
- **Shorten keeps the facts** — "about half its length without losing essential meaning" by rule: each paragraph's first sentence and every
  sentence with a figure, date, link, field or chip; headings and list items whole.
- **Home-specific templates feed only their homes** (an HDB template's permitted hours never reach a condo's terms; a BTO is an HDB flat).
- **A line's description is a phrase** — Improve adds no full stop to it.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440 — OM-10001 (Olivia Martinez, HDB 4-Room):** Terms and Conditions › **Write with AI**: five rows — Improve disabled
  ("Nothing to fix — it already reads cleanly"), Shorten "From 339 words to 236", Add what’s missing "Adds working hours", Rewrite from this
  quote, Plain English "9 changes to everyday words". Plain English → the proposal: Changes (struck / tinted words) · Before · After; Not now
  → nothing changed; again → Use these words → "Terms and Conditions in plain English · Undo" → Undo. Additional Notes › Add what’s
  missing → four paragraphs (what it covers, working hours, lead times, exclusions) with Demo Studio's name filled in. Clear the notes →
  Write with AI opens "Write from this quote" straight away. Type "pls note the the qtn is valid abt 3 wks , thx" → Improve.
- **Maison AI on OM-10001:** "Add what the terms leave out — working hours", "Put the terms in plain English", "Add what the notes leave out —
  4 points" → each opens the proposal (the section unfolds). Ask "shorten the terms please" → "Write with AI sits beside the words".
- **Items › Painting, whole unit › Expand description** → Write with AI in the foot: Use My Items’ words; TV console and feature wall: "My
  Items has no words for a line like this".
- **Olivia's contract** (Draft): click in "4. Programme" → Write with AI → "For “4. Programme”" → Plain English → Acts on “4. Programme” /
  The whole contract → Use → Undo. Ryan D'Souza's signed contract: no Write with AI. Company › Templates › Contracts › the agreement: three rows.
- **OM-10006 (Harpreet Kaur) › Send ▾ › Send for confirmation:** Write with AI under the message (the draft reads cleanly); type "hi
  harpreet , pls see the qtn w/ the link below . thx" → Improve → "Hi Harpreet, please see the quotation with the link below. Thanks.", the
  link untouched.
- **Company › Templates › T&Cs & Notes › BTO Works** → Add what’s missing (from the HDB template); **Renovation Works** → nothing to add.
  **Default Quote PDF** → click "We are to submit the following quotation…" → the mark under Insert a field → Plain English ("for your kind
  perusal and consideration" → "for you to read and consider"). **Price book › Painting** → the mark in the description's toolbar.
- **Germaine (Designer)** on OM-10007: the same help. **Priya (Accounting)** — Ask "improve the message": the PO message answer.
- **390 / 320 touch:** the Terms button on its own line; the menu a sheet titled Write with AI; the proposal a bottom sheet; the contract
  bar on two lines, Write with AI the mark alone; no sideways scroll. **768 touch:** the contract editor no longer scrolls sideways.

## Probes run
On fresh copies of the repaired base (`pbuild/base.db` + migrations + repair, R120 unused) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the warnings are older files') · `npm run design:lint` nothing new
(one raw `font-weight` caught and removed) · `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s29.cjs`** (this step, 9 sections) | **88 / 88** — the page error log empty; a full `.dump` before and after: identical |
| `quote-editor-parity/verify-qe-r1…r5` (regression runner) | 34/34 · 33/33 · 21/21 · 14/14 · 21/21 |
| `pending-modules/verify-pm2-s04` · `s05` · `s10` · `s11` · `s19` | 82/82 · 113/113 · 107/107 · 62/62 · 116/116 |
| `pending-modules/verify-pm2-s03` · `s21` | 79/79 · 40/40 |
| `parity-map-build/verify-pm-h.cjs` (the Ask box — the new `writing` intent steals nothing) · `verify-pm-e.cjs` | 50/50 · 58/58 |
| regression runner: `ct-r1…r4` (the contract editor, its bar and send dialog) | 36/36 · 24/24 · 28/28 · 29/29 |
| `xr-r1` · `xr-r3` (X-Ray's Send to client — `MessageField`) · `ux-p4` · `ux-p5` (the send dialogs) | 27/27 · 28/28 · 56/56 · 58/58 |
| `dane-p1` · `dane-p2b` · `dane-p3` · `dane-p4` · `sw-r2` · `sw-r4` (Insert a field, the quote's sections, menus) | 47/47 · 56/56 · 71/71 · 37/37 · 27/27 · 35/35 |
| `pb-r3` (the Price book item dialog) · `tpl-parity` (the Section note dialog on a phone) · `overlays` · `kb-r1` · `kb-r2` · `first-run-full` | 30/30 · 20/20 · 67/67 · 35/35 · 29/29 · 6/6 |
| `ghosts-same` 1440 · `ghosts-same-390` (loader = reveal, every route) | 57/57 · 57/57 |
| ghost against page (a capture: the contract editor, its template, a T&Cs template at 1440 and 390 touch) | the new trigger's bones sit where the page draws it; the phone's two-line bar matches. Seen, not changed: the contract editor's phone ghost draws a one-line title (the shared `EditorHeadGhost`) where a long title wraps — older than this step (S17's note) |
| `npm run design:anatomy` (on the scratch `next start`) | all 1699 measures hold |

## Migration and repair
None — no new record: an accepted proposal is an edit, saved by the editor's own save (REG-420: "No Activity row for the text"); nothing
metered. R120 stays free in lane A.

## Shared pieces changed
- **None of `components/om/*`, the shell or `app/globals.css`.** New: `components/writing/writing-help.tsx` (+ css) — the house Dialog,
  `PortalMenu` + `DropdownItem`, `Chips`, `IconButton`, the DS `Button`.
- **`MessageField`** (`components/contracts/editor/dialogs.tsx`, every WhatsApp send dialog) gained Write with AI beside Reset message and an
  optional `names` prop; **`DocToolbar`** a `writing` slot; **`DocEditor`**'s handle `partAt` · `replaceBlocks` · `replaceAll`; the template
  inspector's **`Txt`** a `help` prop; **`DescriptionDialog`** a `line` prop and `WritingBookContext`.
- **Lanes:** `lib/maison-ai/{intents,answer}.ts` + `answers/work.ts` gained the `writing` intent and `writingAnswer` — merge by hand with lane
  B's intents.

## For the next steps
- **S34 (real services):** a model plugs in at `proposeWriting(input)` (`lib/writing/propose.ts`) — same input (the words, the place, the
  client-safe sources), same `Proposal` out (the new HTML + plain lines); keep the proposal, the marks (`lib/writing/diff.ts`), Use these words
  and Undo. Give it no tools (1.0's `skipTools` was never honoured).
- **S41b:** the "AI" badge / Remove AI flag on read sections — not carried, on purpose (above); the quote document editor's other parts are
  S11's.
- **S42:** the Changes view interleaves a replaced phrase as ~~old~~ new; long contracts past ~2,000 words on both sides show Before / After
  only (the marks would cost the browser too much).
- **For Vicky:** REG-420's Write with AI now proposes first (REG-S29.2); the phone's contract bar is two lines (REG-S29.9); every new word is
  invented copy (REG-S29.1).
- **The orchestrator (UAT):** a step for the quote editor's chapter — "Terms and Conditions › Write with AI › Plain English → read the
  struck / tinted words → Use these words → Undo" — and one for the contract chapter (click in a clause → Write with AI → Acts on).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — the one mocked piece (Write with AI on Terms / Notes, 1263:36257) keeps its look and
   place; its behaviour change from REG-420 is written down and flagged (REG-S29.2); every other surface is unmocked and logged as invented
   copy (REG-S29.1…8).
2. **One system, no one-offs** — one `WritingHelp` for every home; the house Dialog (l 800, bottom sheet on a phone), `PortalMenu` +
   `DropdownItem` (help line, disabled-with-reason), `Chips`, `IconButton`, the DS Button, the snackbar's Undo; tokens only (design:lint holds).
3. **Plain words for studio people** — "Improve the writing", "Add what’s missing", "Plain English", "Use these words", "Not now", "From 339
   words to 236", "Nothing to fix — it already reads cleanly"; never "AI-generated", "model" or "prompt".
4. **Nothing is lost** — nothing goes in unseen; Not now leaves the words; Use these words has Undo (the whole text as it was — a contract's
   too); the Description dialog's Cancel discards; Shorten keeps every fact; chips, fields, links and figures are never touched.
5. **Say why** — every row that can't act says why in the row; the proposal's lines say what changed and from where ("From this quote,
   “Working Hours and Site Access” …").
6. **Back returns where you came from** — no navigation added; the Ask box's rows carry `?from=` (the house `row`).
7. **Every screen is whole** — no new page; the contract editor's and the T&Cs editor's ghosts draw the new trigger (and the phone's two-line
   bar) — the ghost probes run green; the proposal handles an empty text (straight to Write from this quote) and a no-op (the reason).
8. **Every width is designed** — 1440 · 1024 (contract mark alone) · 768 touch (meta row fixed) · 390 · 320 (bar wraps; sheets) checked by
   the probe against `screen.width`.
9. **Tables follow the leads listing** — no table added.
10. **Motion with purpose** — none added: the house Dialog's and sheet's, the snackbar's.
11. **Honest data** — every proposal is worked out from the records on the screen (the quote, its templates, My Items, the contract's template);
    no model claimed; no credits; nothing new stored, so no repair.
12. **Reach for everyone** — the trigger is a named button (`aria-haspopup="menu"`, `aria-expanded`; the mark alone has its name and tooltip);
    the menu walks by arrow keys; the proposal's region is labelled; added / removed are announced, not only coloured; Escape and ⌘↵ as every
    house dialog.
- **How to add a missing thing** — one home per words (where they are written), doors from Maison AI; shown only when it applies (rows
  disabled with reasons; Maison AI's rows only when they'd do something; a template offers no Rewrite); one filled button (Use these words);
  defaults need no set-up (nothing to configure; free).
