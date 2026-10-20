# S44G · a template's Text block takes formatting (row NB-08) — outcome (2026-10-15)

His ask (2026-10-15): "fix all the pending things apart from Still parked" and the UAT comments from row 246 "without any overlaps nor any issues
without losing what we have already built … If you have any questions please go ahead based on your recommendations." Package S44G = row
**NB-08** of `s42/sweep-newer-branches-2026-10-15.md` §5 — S43D's F2-05 one gap: 1.0's rich-text sections held bold, italic, underline, lists
and links; 2.0's quote template **Text block** was plain paragraphs (`htmlToText` / `textToHtml` in `inspector.tsx`). Every call taken **as
recommended — his ask 2026-10-15**. Built in lane E (port 3185) — begun in the first lane E, re-applied after the 16:53 reboot onto the fresh
lane (main as of 17:10, S44O landed: none of S44O's lines are in this package's files). Register rows: `steps/reg-S44G.md` (REG-S44G.1…7).
**No migration, no repair** (R174…R179 unused) — the block's `html` already held HTML; nothing to seed: the 4-Room BTO's Text block (italic +
bold) is the demo's record.

## Ledger — every item this package owns

| Item (the prompt's words) | Status | Where |
|---|---|---|
| Write the block with the house rich editor S44I settled (reuse it; never a second editor) | **Built** | `components/templates/editor/inspector-controls.tsx` `RichTxt` (the Text block's field) on `components/quotes/editor/text/rich-editor.tsx` — the one `RichEditor`, given `dense` and `tools="block"`; `inspector.tsx` uses it for `b.kind === 'text'` and drops its own `htmlToText` / `textToHtml`. REG-S44G.1 · .2 |
| b · i · u · bullets · numbers · link | **Built** | `BLOCK_GROUPS` in `rich-editor.tsx` (Bold · Italic · Underline \| Bulleted list · Numbered list), the house link tool and its Add link dialog. No strikethrough, no per-paragraph alignment (the block's Text style aligns). REG-S44G.1 |
| Brand-kit colours only, as C2 allows (`lib/templates/kit-html.ts`, `span[data-kit]`) | **Built** | `colors={kitTextColors(brand.colors)}` — Ink · Accent · Red · Grey + *The text's own colour*; `kitTextColors` moved from `description-dialog.tsx` to `lib/templates/kit-html.ts` (one list). The editor paints a run in the kit's colour as the kit has it today (`kitHtml` on the shown value). |
| No per-run font size (C2 (c)) | **Kept** | No size tool; one Text style per block (More options › Text styles). |
| *Insert a field* kept and working inside the rich text | **Built** | Insert a field (the house `PortalMenu` + the one field list, now `FieldItems`, shared with every plain box) under the tools; the field lands where the caret last was (`RichEditorHandle.insertField`, a space either side of a word), at the end when the box was never clicked. "Prints as" under the box (REG-569). **Bug fixed on the way:** five money fields had vanished from the menu (REG-S44G.6). |
| The stored block passes the one allowlist on save (S44T's `parseDesign`) and in print | **Already + verified** | `parseDesign` (`lib/templates/model.ts`) cleans every Text block on read and `saveTemplateDraft` stores what it reads back (S44T); every reader of a template (`fetchQuotePreview`, the view link, the editor) goes through it; the print's `html()` in `slices.tsx` runs `sanitizeRichHtml` (S44Q) — the same allowlist (`sanitizeRichHtml` wraps `sanitizeContractHtml`). It keeps every mark the editor makes (`b strong i em u ul ol li a[href] span[data-kit]`); the probe stores a `<script>`, an `onerror` and an `onclick` and finds none on Preview, `/confirm/<token>` or `/quote/<token>`. |
| An existing plain block opens as the same words, unchanged on the page until edited | **Built** | `RichEditor` shows the stored HTML as it is and emits nothing until an edit; the probe opens the 4-Room BTO's block (italic + bold — the old box flattened both on any edit), waits past the autosave and finds no draft written and the page's block byte-identical. REG-S44G.3 |
| Undo in the editor's history covers the edits | **Built** | `onChange` → the inspector's `upd({ html }, 'html')` — a step of the editor's own history (typing folds within 900 ms as in a plain box; Write with AI's words are a step of their own, `onChange(h, true)`). The top bar's Undo / Redo put the box back (the body re-reads its value whenever it isn't focused). Probe: Undo takes a field and then a link back out; Redo brings both back. |
| The print renders the marks exactly as the editor shows (the renderer) | **Built** | `slices.tsx` — the Text block's words through `kitHtml` (a kit run in the kit's colour; the Text block never ran it) and `printedLinks`; `document.module.css` — a Text block's `ul` / `ol` keep their bullets and numbers (the house reset had removed list marks), 4 apart, inside the box; a link underlined in the words' own colour (`.textBlock a, .para a, .rich a`). REG-S44G.4 · .5 |
| Preview and the client's pages show the formatted block through the client projection (`lib/quotes/client-quote.ts`) | **Verified — no change needed** | `clientQuoteOf` → `cleanDesignText` runs the same allowlist, which keeps every mark (`/confirm/<token>`, `/sign/<token>/quote`); the view link reads `fetchQuotePreview`'s parsed design. The probe reads the marks on Preview, `/confirm/<token>`, `/quote/<token>` (1440) and the phone's View as printed (390). |
| Record each choice; every new word is invented copy — flag it | **Done** | `reg-S44G.md` (7 rows; invented copy flagged in REG-S44G.1). |
| Run the template editor probes (verify-template-editor, verify-tpl-audit, tpl-parity via the regression harness), pm2-s11 · s44t · s44f · s44i, plus my own | **Run** (see Checks) | `verify-template-editor.cjs` and `verify-tpl-audit.cjs` **are not in the repo** — never banked (S11 found the same: none under `design-source/verify/`, the scratchpads or the main tree); their ground is covered by `tpl-parity`, `folders-galleries`, `pm2-s10`, `pm2-s11` and this package's probe. |

### Found on the way (fixed)
- **The Insert a field menu had lost Item count · Subtotal · GST amount · GST rate · Grand total** (on main since S44T): the comment S44T added
  to the end of the Quote group's line in `lib/templates/fields.ts` ran on over the five entries. Restored on their own line. REG-S44G.6
- **The Page list's Text row** joined paragraphs ("negotiable.Please") and showed `&amp;` — now `plainOf` (`structure-pane.tsx`). REG-S44G.7
- **A link printed as plain words** (the house reset strips links' underline) and, on a client page, opened in the client's own tab, away from
  the quote; on the template editor's page it would navigate away from the editor. Now underlined, opens beside the quote, and on the editor's
  page only selects its block (`document.tsx` `onClickCapture` in interactive mode). REG-S44G.5

## Calls taken as recommended (his ask 2026-10-15)
- **The tool set** = the row's list (b · i · u · bullets · numbers · link) + the kit's colour; **no strikethrough, no per-paragraph alignment**
  — the block's own Text style already aligns, sizes and weights it; two places for one setting is the load REG-542 took away.
- **Dense form in the 320 pane** — the inspector's 36 tool boxes in one row; Insert a field and Write with AI under them (the house editor
  puts word-adding tools in its toolbar's right slot; a narrow pane puts that slot on its own line, as the phone layout always did) — never a
  third control beside the box (REG-569's rule: at most two beside a text box). Words on the two buttons instead of icons.
- **A field at the caret** (not appended at the end as the plain box did) — the rich text has a place to put it; a space either side of a word.
- **The editor shows the kit's colour as it is today** — the stored key, never a colour, so the editor and the print agree after a kit change.
- **Links open beside the quote** in every printed body (Text block, Terms, Notes, a description) — one rule for the document.
- **No call REVERSES an earlier decision.** The Text block's plain box (REG-486 / REG-569's `Txt`) is replaced for this block only, which is the
  row's ask; every other paragraph field keeps its box.

## Shared pieces changed
- `components/quotes/editor/text/rich-editor.tsx` (+ `.module.css`) — **the house rich editor**: `dense` (CSS under `.editor[data-dense]` only),
  `tools: 'block'`, the handle's `insertField`, and a remembered caret (`lastRange`, set on `selectionchange`). Defaults unchanged: every other
  editor (Terms / Notes, templates modal, description dialog, update composer, About card, Price book dialogs, T&Cs template editor) draws and
  behaves as before.
- `lib/templates/kit-html.ts` — now also exports `kitTextColors` (moved from `components/quotes/editor/items/description-dialog.tsx`, which
  imports it from here).
- `lib/rich-html.ts` — `printedLinks(html)`.
- `components/templates/render/slices.tsx` (`html()` + the Text block + a description's line), `document.tsx` (interactive link guard),
  `document.module.css` (Text block lists; links in printed words).
- `lib/templates/fields.ts` — the five money fields back in `FIELD_GROUPS`.
- `components/templates/editor/{inspector,inspector-controls,structure-pane}.tsx`, `inspector.module.css`.

## For other packages / the orchestrator
- **Landing:** all 13 code files the package changed were equal to main (17:10) when it began: for each, **lane E's copy is main's plus S44G** —
  take the lane's copy. New: the probe, `reg-S44G.md`, this outcome. No migration, no repair, `design-lint.baseline.json` untouched.
- **Any lane that touches `lib/templates/fields.ts`** (lane B's walk might) — the fix is one moved line: the five entries
  `item_count · subtotal · gst_amount · gst_rate · total` back on a line of their own after S44T's `{remarks}` / `{signed_date}` comment.
- `slices.tsx`: S44G's lines are the `html()` helper, the Text block's `case 'text'` and the description's `printedLinks(...)` wrap — three
  single-line edits, easy to carry over another lane's print work.

## Checks
All on the re-applied lane (after the 16:53 reboot), one production build under the lock (`DATABASE_URL` = a migrated + repaired copy of
`pbuild/base.db`): exit 0.
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` **0 errors** (17 warnings, none in this package's files — the existing
  `<img>` / hook-deps ones and an unused directive in `contract-templates-gallery.tsx`) · `npm run design:lint` green (raw-colour 40 / 40,
  raw-type 102 / 102, raw-radius 41 / 41, inline-style 41 / 42; no count raised; the one file under its baseline is not this package's).
- **My probe** `design-source/verify/pending-modules/verify-pm2-s44g.cjs` on :3185: **82 / 82** — 1440 (the editor: tools, an old block
  opening unchanged, each mark, the kit's colours, the link dialog, a field at the caret, the money fields in the menu, Prints as, Write with
  AI, Undo / Redo, the saved draft, the page's lists, a link on the page never opening; Preview, `/confirm/<token>`, `/quote/<token>` each
  drawing every mark and none of a stored script; the print following a changed Accent), 768 and 1024 touch (the Edit drawer: one row of 36
  tools inside the screen, the colour menu and the Add link dialog over it), 390 touch (the template's view and the confirmation page's View
  as printed draw the formatting); no sideways scroll; page error log empty; every record put back (the template row and its versions,
  OM-10008, the brand kit). Shots banked in `design-source/verify/pending-modules/pm2-s44g/` (9).
- Pending-modules probes on the lane build (a lane copy of `pbuild/run-env.sh`, :3185, a fresh migrated + repaired copy each): **pm2-s11
  62 / 62 · pm2-s44t 69 / 69 · pm2-s44f 101 / 101 · pm2-s44i 110 / 110 · pm2-s44q 52 / 52 · pm2-s29 88 / 88 · pm2-s10 107 / 107**. (Before
  the reboot, one pm2-s44i run had stopped at 17 / 27 while another lane's build held the machine at a load of 53 — timing waits on the
  fold's write and the caret; on the same code under normal load it runs 110 / 110, and none of its steps touch this package's files.)
- Regression (`design-source/verify/regression/run.cjs`, RUN_DIR made by hand from `pbuild/base.db` — base · empty · noleads — :3185):
  **tpl-parity 20 / 20 · folders-galleries 44 / 44 · qe-r1 34 / 34 · qe-r3 21 / 21 · qe-r5 21 / 21 · pb-r3 30 / 30 · dane-p1 47 / 47**.
- `verify-template-editor.cjs` / `verify-tpl-audit.cjs`: not in the repo (see the ledger) — covered by the above.
- No existing probe needed a change. :3185 stopped; the build lock released; `local.db` and main untouched.

## What to check in the browser (Dane · Owner)
1. Company › Templates › **4-Room BTO** › press the words under the payment schedule ("* Any default in payment…"): the Edit pane shows them
   italic and bold as printed. Pick words → **B**, **I**, **U**; a new line → **•** list, **1.** list; pick words → **Link** → "example.com".
2. Pick words → the palette → **Accent**; Company › Templates › Brand › change Accent → the words follow on the page.
3. Click inside a line → **Insert a field** → *Client name*: it lands there; *Prints as* under the box. **Write with AI** works on the words.
4. The top bar's **Undo** / **Redo** take the edits back and forth. Publish, then a quote on it → **Preview**, *Copy link* → the client's page.
5. At 768 (iPad): Edit selection → the same tools in one row; the colour menu and the link dialog over the drawer.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for the inspector's rich box; the house editor (mock 1263:36241) in its dense
   form; every choice in REG-S44G.1…7 with the invented words flagged.
2. **One system, no one-offs** — the one `RichEditor` (extended, never copied), the house `PortalMenu` + `DropdownItem` field list (one
   `FieldItems` for every box), the house `Dialog` for links, `WritingHelp`, the DS `Button`; tokens only (design:lint green).
3. **Plain words** — "Insert a field", "Write with AI", "Text colour", "The text's own colour", "Bulleted list", "Numbered list", "Link"; no
   jargon, no hex.
4. **Nothing is lost** — an old block opens with its marks (the plain box dropped them); nothing is written until edited; every edit has the
   editor's Undo / Redo, Write with AI its snackbar Undo; the money fields are back in the menu.
5. **Say why** — Text colour with nothing picked says "Select the words to colour first" (the house editor's); "Prints as" under the box.
6. **Back returns where you came from** — no new route; the editor's Back unchanged; a printed link opens beside the quote, so the client's
   page stays where it was.
7. **Every screen is whole** — no new page; the editor's ghost unchanged (the inspector loads with the page).
8. **Every width is designed** — 1440 (320 pane, one row), 1024 / 768 touch (the Edit drawer, one row, menu and dialog over it), 390 (the
   template's view and the confirmation page's View as printed draw the formatting); no sideways scroll.
9. **Tables follow the leads listing** — no table touched.
10. **Motion with purpose** — none added.
11. **Honest data** — nothing seeded; the probe writes its words into scratch copies and puts every row back.
12. **Reach for everyone** — the toolbar is a labelled `role="toolbar"`, every tool a named 36 button with its keys in the tooltip (⌘B · ⌘I ·
    ⌘U), pressed state mirrored (`aria-pressed`), the box a labelled multi-line textbox, a 44 reach per tool under a finger; Insert a field and
    Write with AI are worded buttons with menus that close on Esc.
