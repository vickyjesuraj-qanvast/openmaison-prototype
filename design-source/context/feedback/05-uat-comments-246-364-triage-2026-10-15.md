# UAT comments, rows 246–364 — triage against 2.0 (2026-10-15)

**The ask (Vicky, 2026-10-15).** Go through the "UAT comments" tab of `1nRylNpelEd8eo5gYXgE7YMI7kzL03qQm7OERjhw8I_k` (gid 434902554)
from row 246 down. Fix every comment in 2.0's shape: no overlaps, no new issues, and nothing already built lost. Use my recommendation
on every question; he reviews this report afterwards.

**Source.** `05-uat-comments-rows-246-364-2026-10-15.csv`, 119 rows: Dyel Design 43 · Spaces Studio 37 · IdesignerLab 28 · General 8 ·
Dwellings 2 · Cite 1. Column H ("Done – Deployed" …) is **1.0's** team status, not 2.0's.

**How it was read.**
- Every row was checked against the **current** 2.0 code (file:line below), the register and the earlier passes:
  - `01-testers-sheet-audit` (rows 1–215, built REG-555…567);
  - `02-tech-requests` (REG-584…597);
  - `04-ai-visualizer-sheets` (REG-679…684);
  - Dane's UAT (REG-822…906).
- 1.0's newer branches in `qanvast-id-tool` were read (read only, `git log/show`) for the job 1.0 solved: `deployment/qanvast` since
  2026-09-26 (the "Done – Deployed" fixes for these very rows), `port/spaces-studio-2026-10-12` (9 commits past `deployment/qanvast`, all
  answers to Spaces Studio rows), `quotes/port`, and `port/urbanhome-ui-2026-10-13`. The last two are 1.0's port of 2.0's editor and
  PLG work, and answer no row here.

**Areas.**
- **T** — the quote template editor and the printed quote.
- **I** — the quote editor's Items table.
- **Q** — the rest of the quote editor: sending, preview, client pages.
- **P** — the price book and trades.
- **O** — everything else.

**Status words.**
- **Already** — 2.0 does the job; nothing to build.
- **Partly** — 2.0 does part of it; the fix names the missing part.
- **Not built** — 2.0 lacks it.
- **N/A** — a 1.0-only bug, a data question or a platform matter, with nothing for 2.0 to change.

**Size and visibility.** Size is S, M or L. **Visible = yes** means it needs Vicky's eye before it ships (AGENTS.md).

**Paths used in the tables.**

| Short | Path |
|---|---|
| `slices` | `components/templates/render/slices.tsx` |
| `canvas` | `components/templates/render/canvas.tsx` |
| `doc` | `components/templates/render/document.tsx` |
| `doc.css` | `components/templates/render/document.module.css` |
| `model` | `lib/templates/model.ts` |
| `fields` | `lib/templates/fields.ts` |
| `data` | `lib/templates/data.ts` |
| `insp` | `components/templates/editor/inspector.tsx` |
| `ictl` | `components/templates/editor/inspector-controls.tsx` |
| `IS` | `components/quotes/editor/items/items-section.tsx` |
| `IT` | `components/quotes/editor/items/items-table.tsx` |
| `IR` | `components/quotes/editor/items/item-row.tsx` |
| `TM` | `components/quotes/editor/items/table-menus.tsx` |
| `CI` | `components/quotes/editor/items/cell-input.tsx` |
| `RD` | `components/quotes/editor/items/row-drag.ts` |
| `IA` | `app/quotes/items-actions.ts` |
| `QA` | `app/quotes/actions.ts` |
| `IM` | `lib/quotes/items-model.ts` |
| `M` | `lib/quotes/math.ts` |
| `RE` | `components/quotes/editor/text/rich-editor.tsx` |
| `PID` | `components/company/price-book/item-dialog.tsx` |
| `PBI` | `components/company/price-book/price-book-items.tsx` |
| `PBA` | `app/company/price-book-actions.ts` |
| `SA` | `app/settings/actions.ts` |
| `SVW` | `app/settings/settings-view.tsx` |
| `PM` | `components/om/portal-menu.tsx` |

## 1. Summary

**119 rows.** Every row has an area, a status, a fix or the reason for no change, a size and a visible flag.

| Area | Already | Partly | Not built | N/A | Total |
|---|---|---|---|---|---|
| **T** template / print | 19 | 16 | 8 | 2 | 45 |
| **I** Items table | 13 | 5 | 7 | 9 | 34 |
| **Q** quote editor, sending, client pages | 2 | 8 | 0 | 2 | 12 |
| **P** price book, trades | 2 | 7 | 0 | 4 | 13 |
| **O** other | 5 | 7 | 1 | 2 | 15 |
| **Total** | **41** | **43** | **16** | **19** | **119** |

Most "N/A" rows are 1.0 bugs inside 1.0-only features: Estimation Direct's own faults, ext:: names, Paged.js row loss, the Sections
modal. Four are data questions.

**What it adds up to.** The 119 rows reduce to about 36 builds, 10 calls for Vicky (§10) and 41 rows with no change: already done, an
answer, or a setting to switch. Duplicates are merged into 18 groups (§7).

- **T — 16 builds.**
  - M1 section spacing (6 rows)
  - M2 money styling
  - M4 headings on the columns (C4)
  - M5 header details (bold per row, boxed cells, Remarks, T&Cs print their lists)
  - M6 payment schedule print
  - M11 template pins
  - section note width (270) · column colour (309) · zero quantity dash (324) · note in the band (329) · `{signed_date}` (331) · lines
    between rows (363)
  - the trade-grouped print sort (284)
  - the kept version's Preview (294)
  - a probe that no line is ever clipped (293)
- **I — 7 builds**, plus the 8 rows the sections prototype answers (§8):
  - M3 descriptions keep their shape
  - M9 the studio's own units
  - M14's case-insensitive labels
  - M17 Print as on a section
  - the add-line refusal says why (335)
  - empty saved sub-sections (316)
  - the description HTML allowlist (§12)
- **Q — 5 builds.** `{gst_rate}` (256) · live fields in T&Cs (311) · an approver's own Send (334) · one quote's view kept (352) · optional
  picks (357).
- **P — 4 builds.** M8 S$0 in the price book · M14 trades (merge on rename, the message names the match, the filter's case variants) ·
  New category in the item dialog (319).
- **O — 4 builds.** The fixed fee carried through three paths (297) · a mobile for sign-in (344) · VO billing default (360) · the email logo
  (developers, 314 · 337).
- **Calls.** C1 Estimation Direct · C2 the words on a line · C3 GST rounding · C4 section headings on the columns · C5 QR beside the
  schedule · C6 a Marketing role · C7 letter of appointment + deposit · C8 approving supplier bills · C9 completion letter · C10 the email's
  look.

**Overlap with earlier passes.** Nothing here rebuilds what REG-555…567, REG-584…597, REG-617…628 or REG-822…906 shipped. Rows those
already answer are marked Already with their REG. The sections prototype (`quote-editor/04-…`) takes 8 rows (§8), so the Items table has
one owner.

**Before building.** The five open Calls that touch these packages — C2, C3, C4, C5 and C1 — need Vicky's answer. Every other fix
defaults to today's look until a studio changes it.

## 2. T — the template editor and the printed quote

| Row | Studio | Ask | 2.0 today | Fix | Size | Visible |
|---|---|---|---|---|---|---|
| 246 | Dyel | Keep the page number off the paper edge; it should follow the top margin. | **Already.** The header canvas is drawn inside the page margins (`doc:214`). The page number is an element placed in mm on that canvas (`canvas:147`), so it never touches the edge. 1.0 needed three fixes for this (5caddc940 · 212d360c9 · fdad081a3). | No change. | — | no |
| 247 | Dyel | Two key-value (Details) blocks in the header. | **Already.** Header › Add to the header › Details adds a second Details element on that canvas (`insp:243-245`, kinds `insp:29`). It is placed in mm and pushes down what's under it (REG-569). 1.0's "it lands in the footer / vanishes on reload" was its own bug (d28ccf17e). | No change. | — | no |
| 248 | Dyel | Bold some labels and some values. | **Partly.** A Details element or block styles all its labels and all its values together (`insp:100`, `insp:306`; drawn at `canvas:130-131`, `slices:491`). 1.0 added per-row B/I/U (3b4bad5a9). | Add a **Bold** toggle for the label and one for the value on each row card (`KvRows`, `insp:366-387`), stored as `KVRow.labelBold` · `valueBold` and honoured at `canvas:130-131` and `slices:491`. → **M5** | S | yes |
| 251 | Dyel | Sub-section numbers left-aligned, not centred. | **Already.** A sub-section's number prints in the # column with that column's alignment (`slices:213`). Each column card sets left, centre or right (`insp:449`). | No change. See 302 for the section's own number. | — | no |
| 252 | Dyel | A shorter section heading row. | **Partly.** The heading band's padding follows Row height, which applies to every row (`components/templates/render/styles.ts:35`, `slices:206-207`). There is no separate heading height. 1.0 added `sections.rowHeightPt` (3b4bad5a9). | **M1**: "Section heading height: Compact · Normal · Roomy" (the band's own padding). | S | yes |
| 253 | Dyel | Totals and the currency sign printed bold; theirs aren't. | **Partly.** In the Totals block, the Lines and Grand total styles set the weight (`insp:122`). Line amounts follow the Rows style. But section sub-total rows are always bold (`doc.css:60`), and the Totals and Payments blocks always print "S$1,234.00" whatever the Items block's Currency says (`slices:345`, `slices:391`). | **M2**: a "Sub-totals" text style in Items › Text styles (default bold, as today); Totals and Payments print money the way the Items block's Currency says (S$ · "$" apart from the figure · figures only). 1.0: 9d61cc370, 4d9b2d120. | S | yes |
| 254 | Dyel | Footer: designer name bold, a long rule under the company name, company lines in Courier. "Does Meta key-value follow the document font?" | **Already.** The footer canvas takes several Text elements, each with its own font and weight (`ictl:152-183`). Courier New is a curated face (`model:39`). The rule is a Line element placed in mm. Every block follows the brand kit's four text styles (Heading · Body · Table · Small print) unless the block sets its own Font, so a document-wide font is set once in Brand. | No change. Ops: build their footer as two Text elements plus a Line. | — | no |
| 257 | Dyel | Match their spacing between a section's description and its lines. | **Not built.** There are no spacing controls inside the Items block; notes are rows at the table's row padding (`slices:211`). Space before / after works on whole blocks only (`insp:201-202`). 1.0: f8df65bbb, 2de5063e5. | **M1** | S | yes |
| 258 | Dyel | Set every column's width; their table is narrower overall. | **Already.** Every printed column takes a width in mm and Item takes the rest (`insp:457`). The table spans the body between the page's side margins (Page setup). | No change. | — | no |
| 265 | Dyel | More gap between a section's last line and the next section. | **Not built.** | **M1**: "Space before a section". | S | yes |
| 266 | Dyel | Fine-tune the gap between a heading and its lines, and under a line's description; almost no gap when a sub-section follows its heading straight away. | **Not built.** | **M1**: "Space under a section heading" and "Space between lines". A sub-section straight after its heading takes no "Space before a sub-section". | S | yes |
| 267 | Dyel | The gap between a section description and a sub-section. | **Not built.** | **M1**: "Space under a section note". | S | yes |
| 270 | Dyel | Keep a section's description to the Item column's width. | **Not built.** A section note spans every column (`slices:211`, `colSpan={span}`). 1.0: 25ea89b7f `descriptionWidth`. | Items › Sections and pages: "Section notes run: Across the table · Under the Item column". | S | yes |
| 271 | Dyel | A deleted Property type row comes back. | **Already.** Removing a Details row is final (`insp:377`), and `parseDesign` never re-adds a row (`model:379-389`). This was 1.0's repair-on-read (c07b16d59). | No change. | — | no |
| 272 | Dyel | Keep the "Ref" label when its value is blank. | **Already.** A Details row prints its label with an empty value (`canvas:131`, `slices:491`). | No change. | — | no |
| 273 | Dyel | If a Details value changes, should the same value update elsewhere? (question) | **Already.** Fields (`{client_name}`, `{project_ref}` …) resolve live wherever they are placed (`doc:93`, `fields`). A value typed into the template is plain words. | Answer in §9. | — | no |
| 275 | Dyel | Spacing between description bullets; a blank line needs two Enters. | **Partly.** Rich descriptions print lists tight (`doc.css:136-139`). Blank lines are lost two ways. Storage keeps the HTML only when it holds lists or emphasis (`IM:233-236`). The plain path then drops empty lines (`slices:218`, `.filter(Boolean)`). 1.0 fixed both (7b0c6b22a). | **M3**: keep blank lines and paragraph breaks as typed, and expose Line height for the Items text styles (`StyleEditor more`, `ictl:182-183`), which spaces bullets too. | S | yes |
| 276 | Dyel | Match their total's styling; can't un-bold the grand total. | **Already** for the grand total: Totals › More options › Grand total → Weight Regular (`insp:122`, drawn `slices:343,370`). The rest is **M2**. | **M2** | — | no |
| 285 | Dyel | The Inclusive word is bold in their quote. | **Already.** Every Print-as word prints bold (`doc.css:69`). | No change. | — | no |
| 286 | Dyel | Arial for the body; SimSun (or near) for the footer and page number. | **Already.** Arial is curated (`model:39`); set it on the kit's text styles. Footer and page-number elements take their own Font. SimSun isn't offered (1.0 removed it too, df739be03); a studio may upload a font it holds a licence for (`model:53-57`, S11). Nearest built-in: Times New Roman or Courier New. | No change. | — | no |
| 294 | IDL | A revision loses the two-column layout (payment terms beside the QR). | **Partly.** A revision keeps the quote's template, version, client view and entity; `reviseQuote` changes only the status and version (`QA:203-226`). So nothing is dropped on revise. But 2.0 can't put the payment terms beside a QR at all: a QR sits only beside the bank rows in Bank details (`insp:137`), and flow blocks stack. Also, a kept version's Preview (`?version=n`) draws with the live quote's template and view, not the snapshot's (`lib/templates/queries.ts:257-294`). 1.0: 9dfa65c38, a Columns block. | → Call C5 (QR beside the schedule). The kept version's Preview draws with the template version and view it was sent with. | S | yes |
| 295 | IDL | An Optional price column; blank, not a dash, on other lines. | **Already.** The Optional price column (REG-617). Every other line's cell is blank (`slices:253`). | No change. | — | no |
| 300 | IDL | The currency apart from the figure in the Optional price column too. | **Already** for the column: with Currency "$ with a space", every money column, Optional price included, prints "$" at the cell's left and the figure at its right (`slices:179-183`, `slices:253`, `doc.css:66-68`). The Totals block doesn't follow (see 253). If "row" meant a total for optional lines: there is none, because optional lines never count. | **M2** | — | no |
| 301 | IDL | Qty and Unit centred. | **Already.** Column alignment per card (`insp:449`). | No change. | — | no |
| 302 | IDL | Sub-section numbers don't line up with the other numbers. | **Partly.** Sub-section and line numbers share the # column's alignment (`slices:213`, `slices:235`). The section's own number prints inside the heading band at the band's left padding (`slices:297`, `slices:202-207`), so with a centred or right-aligned # column it doesn't line up. 1.0: 25ea89b7f. | **M4**: when the # column prints, the heading band puts the section's number in the # column's width and alignment, and its name where the line names start. → Call C4 | S | yes |
| 303 | IDL | Spacing between sub-sections, not only around headings and descriptions. | **Not built.** | **M1**: "Space before a sub-section". | S | yes |
| 304 | IDL | Can't remove the highlight on a sub-section's total row. | **N/A.** 2.0 prints no sub-section total row; a section's sub-total row carries no highlight. Highlight › None clears a line or section (REG-556). | No change. | — | no |
| 305 | IDL | A rule between the column headings and the first section. | **Already.** Column headings › Plain words (`insp:466`, `slices:272`). | No change. | — | no |
| 306 | IDL | The sub-section heading should align with the section's heading and description. | **Partly.** Sub-section names and section notes start at the Item column (`slices:209-213`); the section's own name starts at the band's left edge (`slices:297`). | **M4** (as 302). | S | yes |
| 309 | IDL | Their numbering is gold. (Low) | **Partly.** A printed column can carry a colour (`model:212`, drawn `slices:188`), but the column card doesn't offer it. | A Colour on each column card (`ColorPick`: the kit's colours or any hex, `ictl:125`); the sub-section number takes the # column's colour. | S | yes |
| 312 | General | Template adjustments are lost after bug fixes and releases. | **Partly.** Releases don't touch a studio's templates. R31 fills only empty designs (`scripts/repair-demo-data.ts:876`), no migration writes template rows, `withAllColumns` only adds new columns switched off (`model:320-329`), and a sent quote is pinned to its version (REG-489; `lib/templates/queries.ts:279-288`). A change can still seem lost three ways. An edit left as a draft never prints until it is published (`app/company/templates-actions.ts:117-134`). **A Blank Quote is never pinned**: it prints through the current default's latest design even after it is sent (`app/leads/quotes-actions.ts:77-83`). And repair R37 rewrites stored footers in one case (`scripts/repair-demo-data.ts:966-998`). Reset to base replaces every template (`lib/db/baseline.ts:22`). | **M11**: a Blank Quote pins the default template's version when it is made. No repair or migration writes a template's design (guard R37 to the seeded templates). A new option defaults to today's look — the developers' rule, written into the package's brief. | S | no |
| 321 | Spaces | Header fields editable; adding Project remarks broke the layout; editing T&Cs loses formatting. | **Partly.** The header grows with its content and pushes what's under it (REG-569; `canvas:201-247`, `doc:129-137`), so a long value never breaks the layout. But a Details value comes from the template or a field, and there is no Remarks field. General Info holds: title · property type · Project Ref # · site address · prepared by · valid until · NRIC · customer ID · second client (`components/quotes/editor/general-info.tsx:59-97`; `fields`). T&Cs keep bold, italic, underline and links in print, but **the print drops lists, numbering, alignment and blank lines** (`slices:41-45`, `slices:473-485`). | **M5**: a "Remarks" box in General Info, printed through `{remarks}`. Terms and Notes print their lists and alignment as written (the descriptions' `.rich` rendering); "Number the paragraphs" stays for plain paragraphs. | S | yes |
| 322 | Spaces | Wider value cells for Quotation no. and Project remark, in boxed cells like theirs. | **Partly.** A Details element's width is set in mm (drag or W), its label column has its own width, and values wrap (`insp:303`, `doc.css:38`). Only "Underline the values" is offered (`insp:305`), not boxed cells. 1.0: 9b70a0e18 boxed grid, 9fe1393be. | **M5**: Details (element and block) "Lines: None · Under the values · Boxed". | S | yes |
| 324 | Spaces | "-" in Qty, meaning 0. | **Partly.** The grid takes 0 and shows "0" (`CI:103-113`). The print shows nothing for qty 0 (`slices:247`); Qty · Unit shows the unit only (`slices:249`). 1.0: 9fe1393be. | Items › Amounts: "A zero quantity prints: Nothing · A dash (–)". | S | yes |
| 329 | Spaces | Section descriptions inside the heading's band. | **Not built.** The band colours the heading only (`slices:211`). 1.0: 84e9f4aa1 (spaces branch). | Items › Sections and pages: "Section notes sit in the heading's band". The note takes the band's fill and contrast ink, with no gap between. | S | yes |
| 330 | Spaces | Numbers on sections only, not on lines. | **Already.** "Sections are marked 1 · 2 · 3" plus "Item numbers: None" (`insp:437-438`); switch the # column off to give its width back. 1.0 needed a new mode (52b536355). | No change. Ops: set it for Spaces. → M13 | — | no |
| 331 | Spaces | The signed date filled in automatically in the signature. | **Not built.** The client's column prints the signer's name once signed (`canvas:37-38`, `data:135`). There is no date and no field for it (`fields`). 1.0: 0919c876d `{signed_date}` (spaces branch). | A field **Signed date** `{signed_date}`: empty until signed, then the day the client signed, in the page's date format. Offered in Insert a field; the house Signature block's "Date:" line becomes "Date: {signed_date}". | S | yes |
| 351 | Spaces | A header band switched off before a demo came back on after an update. | **Partly** (as 312). Nothing in 2.0 turns a header band back on. Likely causes: an unpublished draft, a quote pinned to an older version, or a Blank Quote following the default. | → **M11** | — | no |
| 353 | Spaces | With section-only numbering, item names and section notes run into the # column. | **N/A** (a 1.0 bug). 2.0 prints names in their own cells and starts notes after the # column (`slices:209-211`). | No change. → M13 | — | no |
| 354 | Spaces | Payment terms as a table; marks "(a) (b)". | **Partly.** Payment schedule › Shown as Table (`insp:126`). The marks are 1 · 2 · 3, A · B · C or 1st · 2nd (`insp:130`, `slices:384`); there is no "(a)". | **M6**: add "(a) · (b) · (c)" to "Milestones are marked". | S | yes |
| 355 | Spaces | The % is hard-coded; adding "10%" to the title prints it twice. | **Partly.** Table and list always print "10%" before the words (`slices:399`, `slices:421`). | **M6**: a "Show the percentage" switch, with the % in its own cell in the table. | S | yes |
| 356 | Spaces | The intro (logo, email) shows under the body in Layout; it belongs in the header. | **Already.** The outline pins the Header first and its inspector lists its elements (`components/templates/editor/structure-pane.tsx:79`, `insp:230-241`). The logo and studio lines sit on the header canvas in every house style. | No change. | — | no |
| 362 | Spaces | Remove the rules above and below the grand total. | **Already.** Totals › Lines › None (`insp:121`, `doc.css:79-85`). 2.0's own default is "A line above the total" (`model:358`). | No change. Ops: set None for Spaces. | — | no |
| 363 | Spaces | A rule after the items table ends. | **Partly.** "A line under each row" draws under the last row too (`doc.css:59`). | "Lines between rows: None · Between rows · Under every row". Existing templates keep "Under every row"; "Between rows" leaves the table's last row bare. | S | yes |
| 364 | Spaces | Qty and unit in one cell, centred. | **Already.** The "Qty · Unit" column prints "2 sqft" in one cell (`slices:249`, `model:211`), centred by its card. The grid keeps them apart (their option a). | No change. | — | no |

## 3. I — the Items table

| Row | Studio | Ask | 2.0 today | Fix | Size | Visible |
|---|---|---|---|---|---|---|
| 249 | Dyel | A sub-category dropdown from the names already used, because names are case-sensitive. | **Partly.** Sub-sections are real rows: a line joins one by +, drag or Move to section (`IS:592-624`), with no typed sub-category. But the Category and Section label menus drop duplicates only on an exact match (`IS:801`, `IM:88`), so "Carpentry" and "carpentry" can both exist (`IA:74`). | Adding a label that matches one already on the quote, in any case, picks the existing one. → **M14** | S | yes |
| 250 | Dyel | Collapse sub-sections too. | **Already.** Every section row folds at any depth (`IR:294-300`, `IT:99-108`). | No change. Collapse all / Expand all sections → prototype §1. | — | no |
| 259 | Dyel | An X to close the colour menu (Highlight / text colour). | **N/A.** 2.0 has no colour modal. Highlight is a level of the row menu that closes on a press outside, Esc or scroll (`TM:189-200`, `PM:85-119`), and is a sheet with a close on a phone (`PM:122-127`). | No change. | — | no |
| 260 | Dyel | Reordering a sub-section doesn't work. | **Already.** A sub-section drags as a block within its parent or into another top-level section (`RD:76-80`, `RD:212-225`, `IS:657-707`), and Move up / down works in the row menu (`TM:157-162`). | → prototype §9 (drop zones). → **M12** | — | no |
| 261 | Dyel | A new category can't take a sub-category, and has no number. | **Partly.** A new section shows at once with its number (`M:199-212`) and takes lines (`IR:241-245`), but a section has no "Add sub-section" (the server can make one, `IA:134-142`, but no control calls it). | → **prototype §4** (+ Sub-section on the section row and its add row). | S | yes |
| 262 | Dyel | Renaming a category doesn't stick; an empty category is missing from the Sections drawer. | **Already.** Inline rename shows at once (`IR:274`, `CI:44-66`). Empty sections show in the grid; 2.0 has no Sections drawer. | → prototype §4 keeps click-to-rename. | — | no |
| 263 | Dyel | Reordering issues; moving a product into a sub-category works. | **Already** (as 260). | → **M12** | — | no |
| 268 | Dyel | Description edits don't show in the table; bullets show in Preview only. | **Already**, with one bug. The row updates on Save (`IR:330-331`, `IS:344`) and shows bullets as "• " (`IR:302-304`). The bug: an alignment-only or paragraph-only edit loses its HTML on save (`IM:233-236`). | **M3**: keep the HTML whenever it differs from plain lines. | S | no |
| 269 | Dyel | The Sections modal's title should stay put; its X looks like a sub-section's delete ✕. | **N/A.** 2.0 has no Sections modal; sections are rows in the grid. Every house dialog's head stays put (REG-725). | No change. | — | no |
| 277 | Dyel | Estimation Direct: move whole categories, not lines. Its categories list shows the main quote's; an empty category doesn't show. | **Not built.** 2.0 has no second priced part, and a template holds one Items block (`model:280`). | **M7** → Call C1 | L | yes |
| 278 | Dyel | Lump-sum categories don't move fully to Estimation Direct. | **Not built** (a 1.0 bug inside a 1.0 feature). | → **M7** | — | — |
| 280 | Dyel | Estimation Direct as a separate place to edit its layout and items isn't a great experience; involve Vicky. | **Not built.** | → **M7** / Call C1 | — | — |
| 281 | Dyel | Sub-line items broke sections between the quote and Estimation Direct. | **N/A** (1.0, could not be reproduced). 1.0's sub-items (4ac53134e) have no 2.0 twin; Q-5 add-on options are still held. | → **M7** | — | — |
| 284 | Dyel | Sub-sections reordered in the table don't reorder in Preview. | **Already** when the template prints the quote's own sections (`slices:87-102` sort by position). A **bug** when it groups by trade, room or section label: lines are sorted by their position inside their own section (`slices:115`), so lines from different sections can interleave in one bucket. | Sort the bucket's lines in the grid's order (`flattenItems`, `M:215`). → **M12** | S | yes (print order) |
| 287 | Dyel | A font size per item description, for one smaller description. (question) | **Not built.** One Descriptions style per template (`insp:497`), and the rich editor has no size (`RE:16-24`). | No per-line size. → Call C2 | — | — |
| 290 | General | "Add category" always makes a new one; there's no way to add a price-book category as a section without lines. | **Partly.** New section takes any name (`IA:346-368`). The studio's trades reach a new quote as starter sections only through the template (REG-497). | The new section's name box offers the studio's trades (Settings › Trades) as type-ahead; picking one names the section and files its lines under that trade (`tradeOfSection`, `IM:264`). → prototype §4 (rename-in-place box) | S | yes |
| 291 | General | Ticking several lines brings no options. (question) | **Already.** The bulk bar offers Copy · Set value · Section · Print as · Hide from client · Delete, plus Omit / Restore on a variation order (`IS:1109-1123`). | → prototype §8 adds Group into section · Move into · Move out. Answer in §9. | — | no |
| 292 | IDL | An omitted item should show 0 for its new qty and price. | **Already.** A line removed in a revision prints struck in red with its old figures (`slices:225-229`, REG-595). On a variation order an omission is a minus quantity in "Omitted from the contract" (`app/projects/money-actions.ts:830-843`). 1.0: 4d60a8e77. | No change. | — | no |
| 296 | IDL | The vendor name in the items table, internal only. | **Already.** The Vendor/Sub column (REG-623), "Internal — never printed" (`IT:425`, `model:209`). | No change. | — | no |
| 298 | IDL | A coloured description's underline stays black. | **N/A today**: descriptions carry no colour (`RE:16-24`). 1.0: c075af71f. | If Call C2 adds colour: underline and strike take the text's colour. | — | — |
| 307 | IDL | Colouring a word red, then bolding it, turns it black in the editor (Preview right). | **N/A today** (no colour). | If C2: colour survives bold, italic and underline in the editor and the print alike. | — | — |
| 308 | IDL | Two sub-sections numbered 1.2 and 1.3, not 1.1 and 1.2. | **Partly.** The print is right: a sub-section takes the section's next number after its own lines, and empty sub-sections and lines left out are skipped (`slices:305-313`, `slices:100`). The grid numbers empty sub-sections and lines hidden from the client too (`M:199-212`), so it can read 1.2 where the print reads 1.1. | The grid's numbers skip what the print skips. → **prototype §4** (nested numbering) | S | yes |
| 317 | Dyel | A new category in Estimation Direct doesn't appear until it has a product. (Blocker) | **Not built** (1.0 fixed it, 3997b6dc1). | → **M7** | — | — |
| 318 | Dyel | Extension categories show as "ext::Plumbing works". (Blocker) | **N/A** (1.0 bug, 3997b6dc1). | → **M7** | — | — |
| 320 | Cite | Editing Unit Price, Cost or Markup overwrites the other columns. (Blocker) | **Already, by rule.** Unit Price = Cost + Markup. Unit Price moves Markup; Cost keeps Markup; Markup moves the price (`IR:157-167`). With Settings' rounding on, a cost edit re-rounds the markup (REG-584). No path writes every column at once. | No change; ask Cite for steps if it happens in 2.0. | — | no |
| 323 | Spaces | "Complimentary" on a whole category, in the price column, with sub-totals off. (Blocker) | **Partly.** A section's "Label the sub-total…" word (REG-555 T-3, `TM:219-220`) prints only beside a sub-total, so nothing prints with sub-totals off (`slices:301`, `slices:331`). Lines can each print a word, but Spaces says that reads badly. | **M17**: **Print as on a section** (FOC · Inclusive · custom word…) in the section row's menu. The word prints in the heading band's amount place (as `subtotalAt: band` does, `slices:206`), with sub-totals on or off. The section's lines print no amounts and leave the totals; FOC / Inclusive cost still meets the margin (REG-555's rules). → prototype (the section row's menu) + T (band) | M | yes |
| 325 | Spaces | The unit dropdown can't scroll. | **Already.** The unit menu is a `PortalMenu` sized to the viewport with its own scroll (`PM:66-82`, `PM:139`). 1.0 bug: 6591a26e1. | → **M9** | — | no |
| 326 | Spaces | A hex colour (their brand colour) in item, section and sub-section descriptions. (Blocker) | **Not built, by decision.** No colour inside text (REG-557) and kit colours only (REG-556). 1.0 chose a named "brand" entry over free hex for safety (4dd60bc56). | → Call C2 | M | yes |
| 327 | Spaces | Long item names with formatting (breaks, partial colour, bold, italic), or a description with no name. (Blocker) | **Not built.** A name is one line of plain text (`IR:274`); an empty name is stored as "Item" (`IA:83`). 1.0: fe7c9729f, 547fae4ea. | → Call C2 | M | yes |
| 328 | Spaces | Re-import their template once 327 is built. | **N/A** (1.0 data). Follows C2. | Ops after C2. | — | — |
| 335 | Spaces | Adding a custom line (sliding wardrobe) raised a red error banner. (Blocker) | **N/A** (1.0's server error, fixed in 40f8635e2). 2.0 refuses no custom line (`IA:132-179`). But any failure, including a failed autosave flush, reads only "Couldn't add the item — please try again" (`components/leads/tasks/use-run.ts:43-48`). | The snackbar says why, per the house rule ("Couldn't <do what>" plus the reason). | S | no |
| 348 | Spaces | Cost editable in the row. | **Already** (`IR:156-157`, REG-417). | No change. | — | no |
| 349 | Spaces | Markup % editable in the row. | **Already.** Markup is a cell with its % beside it (`IR:158-164`). | No change. | — | no |
| 350 | Spaces | A filled unit cell lists only matching units; a blank one lists all. | **N/A as asked**: 2.0's unit menu always lists all. But it offers only **seven fixed units** (`IM:22`, `TM:32-40`). A unit from a paste or an import shows on its line but can't be picked again, and Spaces uses ten. | **M9**: **the studio's own units** — Settings › Quotes & pricing › Units, seeded with today's seven; add, rename and remove like Trades (REG-561 / REG-647). They feed every unit picker: the grid menu, the phone sheet, Set value, the price-book item and section dialogs, the paste mapping. The menu opens with every unit and filters as you type. | M | yes |

## 4. Q — the rest of the quote editor, sending and the client's pages

| Row | Studio | Ask | 2.0 today | Fix | Size | Visible |
|---|---|---|---|---|---|---|
| 256 | Dyel | What happens if I untick 9% GST on a line? (question) | **Already.** The GST (%) cell takes 0–100 per line (`IR:171`); a 0% line counts in the subtotal and total and adds no GST (`M:148`). The quote-wide GST switch and the entity's registration sit by the totals (`components/quotes/editor/items/items-summary.tsx:70-72,107`). **Bug:** the printed `{gst_rate}` takes the first line's rate (`data:116`), so a quote whose first line is 0% prints "GST 0%". | Answer in §9. `{gst_rate}` prints the quote's rate (the studio's GST in Settings), not the first line's. | S | yes |
| 274 | Dyel | Review the "Inclusive / lump sum" flow: to silence the pricing warning I mark an inclusive category as lump sum. | **Already.** 2.0 never warns on a line that prints a word: there is no unpriced-line check in readiness (`lib/templates/readiness.ts`), and the below-cost tag skips word lines (`M:61-65`). Mark the line Inclusive (Print as). A whole section → 323. | No change. → M17 | — | no |
| 282 | Dyel | Our GST is S$0.10 more than 9% of the subtotal. | **Partly — same cause.** 2.0 rounds GST line by line and adds the pieces (`M:148`), so a long quote can drift by cents from rate × subtotal. | → Call C3 (**M18**) | S | yes (figures) |
| 283 | Dyel | The grand total is S$0.12 over; the three lines don't add up. | **Partly.** 2.0's total is net + GST (`M:149`), so the printed lines always add up. The GST itself is the drift in 282. | → **M18** | — | — |
| 293 | IDL | Section 2 item d is missing from the render. | **N/A** (1.0's Paged.js, fixed in 3659eda38 · e89d078bc). Risk in 2.0's own paginator: a line taller than a whole page body would be clipped (`doc.css:13`, `.body{overflow:hidden}`), since `plan()` never splits a slice (`doc:39-70`). | A probe check that every counted line prints once; a line taller than a page splits its description across pages. | S | no |
| 299 | IDL | The digitiser didn't read their V3 quote. | **N/A** (1.0's digitiser). 2.0's Upload a quote reads .xlsx, .csv and a PDF's text by rule (`lib/quotes/read-upload.ts:14-31`, `lib/quotes/pdf-quote.ts`). A scan or photo gets "It has no words to read …" and the credits come back (`components/quotes/create-quote-modal.tsx:242-246`). | Ask IDL for the V3 file and try it in 2.0. | — | no |
| 310 | IDL | A text label in a milestone's % column (e.g. "Design Fee"). | **Partly.** Only the first milestone may be a fixed amount, and only with Settings › Finance's "May open with a fixed fee" on (`lib/quotes/payments.ts:16-87`, REG-1563). It prints "Fixed fee" where the % goes (`slices:399`, `slices:421`). There is no free word in the % place: `quote_payments` holds name, description, pct, due and fixed_minor. 1.0: 6e7708c4e `percentCellLabel`. | **M6**: a fixed row prints its own word in the % place, typed in the editor's % cell (default "Fixed fee"), e.g. "Design Fee". | S | yes |
| 311 | IDL | T&Cs change by entity (entity name, bank account). | **Partly.** There are no T&Cs per entity, but fields typed into the T&Cs resolve to the quote's entity at print time: `{studio_name}` (the entity's name), address, UEN, GST, bank and PayNow (`fields:36-66`, `data:64-88`, `slices:473-485`). The catch: the T&Cs editor's Insert Token writes "[Studio Name]" as fixed words with the studio's name at insertion (`lib/quotes/text.ts:19-36`), so it never follows the entity. | Insert Token in T&Cs and Notes writes the live field, which prints the quote's entity. Per-entity default T&Cs are not needed: one text with fields covers it. | S | yes |
| 332 | Spaces | The payment schedule on the client's signing view isn't aligned. | **Partly.** /confirm and /sign draw the template's Payments block (`components/quotes/confirm/quote-stage.tsx:58`, `components/contracts/sign/sign-quote-view.tsx:45`). Two faults. In the table with Show amounts off, the Total row has one more cell than the milestones and sits out of line (`slices:426-432`). On a phone, /confirm's reading cards show no schedule until "View as printed" (`components/quotes/confirm/reading-cards.tsx:13-46`). 1.0: c562f1030 (spaces branch). | **M6**: the Total row's cells match the rows. The phone's reading cards end with the schedule: milestone · % · amount on one grid, with tabular figures. | S | yes |
| 334 | Spaces | Submitting a quote for self-approval errors ("Failed to submit"). (Blocker) | **Partly — a dead end.** An approver's own Send skips approval (`QA:134-156`, REG-624). But with approval required, *Send for signature* on their own Draft makes the contract and then refuses to send it: "… is still a Draft — approve and send it first" (`lib/contracts/readiness.ts:18-25`). Approve isn't offered on a Draft. A refused approve reads only "Couldn't approve the quote — please try again" (`components/leads/tasks/use-run.ts:34-48`). | Any Send an approver presses approves their own Draft — signature and confirmation included — stamped as `sendQuote` does. Every refusal says its rule. | S | no |
| 352 | Spaces | A layout change on one quote (removed the Unit price column) came back after reopening. | **Partly.** One quote's print is set in Preview › What your client sees (columns including Unit price, descriptions, amounts …). It is saved per quote (`components/quotes/preview/quote-preview.tsx:82-89`, `app/company/templates-actions.ts:304-312`) and re-read on open. It is lost three ways. Re-picking the template wipes it (`app/company/templates-actions.ts:287`). Leaving within 600 ms drops the save (`quote-preview.tsx:84-88`). And the Items grid's own Columns are the editor's working columns, which never change the print (`IA:667-678`). | The client-view save completes when the page is left. Changing or re-picking the template keeps the choices that still apply. The grid's Column settings drawer says "Your working columns — the print follows What your client sees", with a link there. | S | yes |
| 357 | Spaces | How does the Optional column work — can the client tick optional items when signing? Spaces wants no picking. (question) | **Partly.** On the confirmation link the client ticks optional lines, with a "With your picks" total (`components/quotes/confirm/confirm-page.tsx:50-53,167-181`). There is no read-only choice: the only switch, the client view's "Optional works", hides them entirely (`lib/templates/client-view.ts:34`). **Bug:** with that switch off, confirming still marks every optional line "skip" (`QA:315-317`), so the grid reads "Client said no". | Settings › Quotes & pricing: "Clients may pick optional items on the confirmation link" (on = today). Off, they are listed read-only with "Ask {designer} to add it". Also fix the skip bug: no answer is stored when nothing was offered. | S | yes |

## 5. P — the price book and trades

| Row | Studio | Ask | 2.0 today | Fix | Size | Visible |
|---|---|---|---|---|---|---|
| 255 | Dyel | A price-book item's sub-category comes into the quote. | **Already.** A picked item keeps its Category (`IA:171`) and lands in that trade's section (`IM:251-256`, UX audit Q7). A saved section brings its sub-sections (`IA:576-581`). | No change. | — | no |
| 264 | Dyel | Searching a category in the price book finds nothing, yet adding it says it exists. Where? | **Partly.** The Price book's search matches categories (`PBI:165`). Settings › Trades says "{typed} is already in the list" (`SVW:295`, `SVW:654-655`) but not which entry it matches (a case variant). | The message names the entry ("Already in the list as "Carpentry Works"") and that row lights up. → **M14** | S | yes |
| 279 | Dyel | Are Shannon's quote items not in the price book? (question) | **N/A** (data). The book holds what was imported or saved. A quote's lines get in by Save to My Items, or by Match N lines (S12, REG-1801…). | Answer in §9. | — | no |
| 316 | Dyel | Adding a category from the price book adds empty sub-categories. (High) | **Partly, a different cause.** Saving a section keeps its empty sub-sections (`IA:534`) and inserting brings them all (`IA:576-581`). They show in the grid and never print (`slices:100`). 1.0: 07a06338e. | Save section to My Items leaves empty sub-sections out; inserting skips any already saved. | S | yes |
| 319 | General | Create a new category in the item drawer. | **Partly.** On a quote, the Category menu has Add Category (`IS:1127`). In Company › Price book's item dialog, Category is picked from the trades only (`PID:111-112`, `PID:156`). | "New category…" at the foot of the item dialog's Category list. Owners and Admins add a trade there; others see the trades rule's reason. | S | yes |
| 338 | IDL | Vendor tabs don't scroll in Browse price book. | **N/A.** 2.0's Price book dialog filters by kind and searches vendors (`components/quotes/editor/items/price-book-dialog.tsx:70`, `components/quotes/editor/items/price-book-dialog.tsx:104-107`); it has no vendor tabs. 1.0's per-vendor prices (340cbc74f) are one entry per vendor in 2.0 (REG-594). | No change. | — | no |
| 339 | IDL | "Hacking & Demolition Works" shows 0 items. (Blocker) | **N/A** (1.0 import data). In 2.0 an item counts under its own Category. | Answer in §9. | — | no |
| 340 | IDL | Duplicate categories: Electrical and Electrical Works. (High) | **Partly.** Renaming a trade carries to every line and item (`SA:283-307`), but renaming onto an existing trade is refused (`SA:240`): there is no merge. | **M14**: renaming onto an existing trade asks "Merge Electrical into Electrical Works? n items and n quote lines move", then merges, with Undo. | S | yes |
| 341 | IDL | The All categories filter misses categories the owner entered. (High) | **Partly.** The Filters' Category list shows the categories items use (trades with no items don't show), and a case variant can show twice (`PBI:93`, `PBI:148`). | **M14**: case variants collapse into one entry. | S | yes |
| 342 | IDL | No way to bulk-move items to another category. (High) | **Already.** Bulk bar › Set category, with Undo (`PBI:151-156`, `components/company/price-book/bulk-edit-dialog.tsx:47`, REG-655). | No change. | — | no |
| 345 | Spaces | Sample packages were uploaded that they never gave; delete? | **N/A** (1.0 data). 2.0 has no Packages; My Sections hold what a studio saves, and a new studio starts empty (REG-2016). | Answer in §9. | — | no |
| 346 | Spaces | Can't enter 0 as the sell price or cost in the add-item drawer. | **Partly.** In the quote grid a line may sell at S$0 with a cost (`IR:165-167`, `CI:77`). In the price book's item dialog cost may be 0, but the money field drops a minus (`components/om/text-field.tsx:191`, `lib/format.ts:147-153`), so an item can't sell at S$0 with a cost. | **M8**: the item dialog takes a Unit price (0 allowed) and works out the markup, negative allowed, as the grid does (the server allows it, `PBA:65`). | S | yes |
| 347 | Spaces | A cost on S$0-selling items. | **Partly** (as 346). | → **M8** | — | — |

## 6. O — everything else

| Row | Studio | Ask | 2.0 today | Fix | Size | Visible |
|---|---|---|---|---|---|---|
| 288 | General | A search in Settings / Accounts. | **Already.** There is no search box on Settings, but ⌘K finds every Settings and Company card by name and keyword, with a deep link (`lib/global-search/model.ts:152-221`; REG-709, REG-812). | No change; answer in §9. | — | no |
| 289 | General | A "theme skins" setting set to India — remove? | **N/A.** 2.0 has no theme, skin or region setting. 1.0's old links go to Your profile (`SVW:788-795`); country and currency are Singapore and S$ (DEF-30). | No change. | — | no |
| 297 | IDL | Payment terms break when a project is created from a quote with a fixed design fee (not %). | **Partly.** The Won → project path keeps a fixed design fee: it is billed first at its amount and the shares split the rest (`lib/projects/money-queries.ts:112-124`, `lib/projects/money.ts:354-355`, `lib/projects/invoices.ts:42-56`). Three side paths drop it. Duplicate project copies only the name and % (`app/projects/actions.ts:715`). The Start sheet's "Payments follow the quote" hides 0% rows, the fee among them (`components/projects/schedule/start-schedule.tsx:73-74`). Apply defaults rewrites the quote's schedule as % rows (`app/leads/quotes-actions.ts:162-169`). 1.0: c5d28109e, 6e7708c4e. | Carry `fixed_minor` through all three. | S | yes |
| 313 | IDL | A marketing person sees only lead things: leads, the lead report (to assign) and lead set-up. | **Not built.** There are five roles: Owner · Admin · Manager · Designer · Accounting (`lib/leads/enums.ts:121`). Only Accounting is limited by path (`lib/settings/roles.ts:22-36`, `lib/settings/roles.ts:66`). Reports › Leads is for Owners and Admins (`app/company/reports/[tab]/page.tsx:51`), and the roles editor is held (REG-645). | → Call C6 | M | yes |
| 314 | IDL | Logo issue in emails. | **Partly.** One email layout for every notice (`lib/notifications/email-html.ts:51-83`). The logo is used only when it is a hosted, non-SVG image (`lib/notifications/delivery.ts:122`); uploads are data URLs, so the prototype prints the studio's name. Outlook ignores CSS sizes; 1.0 fixed that (13a1e3d88, 7e92d837b). | Developers: the logo `<img>` carries width and height attributes from its own ratio (cap 160 × 48), and the brand kit keeps a hosted PNG copy for email. The email's look is flagged "FOR VICKY" (REG-2028). → **M15** / Call C10 | S | yes (email) |
| 315 | IDL | WhatsApp notifications for them? (question) | **Already.** See 336. | → **M16** | — | no |
| 333 | Spaces | The homeowner portal preview failed to load from the project. (Blocker) | **Already.** "See it as {first name}" opens a one-hour read-only preview (`app/my/[slug]/preview/route.ts:21-43`). It is reached from the Client access panel (`components/portal/client-access-panel.tsx:150`, `components/portal/client-access-panel.tsx:172`) and Company › Client portal. Paused shows the studio a strip and the client a notice. 1.0's bounce: 886b491ee (spaces branch). | No change. | — | no |
| 336 | Spaces | Automatic WhatsApp alerts for lead assignment and follow-up reminders. (High) | **Already.** Settings › Notifications has In app · Email · WhatsApp per event (`app/settings/notifications-settings.tsx:96-117`, REG-604). "Assigned" goes in-app and by email by default, with WhatsApp a switch; follow-up reminders (`task_due_soon`) go by WhatsApp by default (`lib/notifications/model.ts:215`). They go to the member's phone (`lib/notifications/delivery.ts:134-137`). WhatsApp is a Pro feature (REG-1885), and nothing really sends until a provider is plugged in (REG-2024). | Ops: switch Assigned › WhatsApp on for Spaces. → **M16** | — | no |
| 337 | Spaces | Lead notification emails arrive distorted. (High) | **Partly** (as 314). | → **M15** | — | — |
| 343 | Dwellings | They quote as RO-Well, not Dwellings; can the URL change? (Blocker) | **Partly.** A quote, contract or invoice can go out under an issuing entity named RO-Well, with its own letterhead (`model:71-86`, `data:79`, REG-562 / REG-618). The client portal and emails use Company › Profile's studio name (`lib/portal/queries.ts:76`). The portal address changes on Company › Client portal, and old ones redirect (`app/portal/studio-actions.ts:124-160`). A studio sub-domain is a platform matter (`lib/platform.ts`). | Answer in §9. | — | no |
| 344 | Dwellings | The main user's number is on the account but sign-in says "User not found". (Blocker) | **N/A** (1.0 data). 2.0 says "No account found with this number — If your studio uses OpenMaison, ask its Owner to add you on Company › Members" (`lib/auth/model.ts:80-82`), matching `members.phone` exactly (`lib/auth/session.ts:90-96`). Gap: Members accepts a landline (6…), which can't receive a code. | The Members phone, when it is the member's only sign-in key, says "A mobile (8 or 9) — the code goes there" and refuses a landline. | S | yes |
| 358 | Spaces | Send a letter of appointment (their format) for signing with a deposit request; signing it, not the quote, starts the project. | **Partly.** Company › Templates › Contracts holds the letter as a template (Smart Text fills the records, `lib/contracts/tokens.ts:8-22`). The signing page takes the full name, NRIC (masked) and signature, and fills the signing date itself (`components/contracts/sign/signing-page.tsx:205-211`). Missing: a deposit request with it (a project's Money draft exists only after Won, REG-994), and the agreement starting the project. | → Call C7 | M | yes |
| 359 | Spaces | A letter of completion & warranty after handover, in their format. (Low) | **Partly.** No completion letter is made at handover (`components/projects/ending/handover-dialog.tsx`). A studio can keep one as a contract template (or an uploaded PDF) and send it from Contracts. | → Call C9 | S–M | yes |
| 360 | Spaces | VOs paid up front, not adjusted into later milestones. (Low) | **Already.** Money › the VO's ⋮ › "Bill VO-n on its own" invoices the whole VO now, and later stages keep their shares (`components/projects/money/use-invoices.tsx:313`, `app/projects/money-actions.ts:415-440`, `lib/projects/money.ts:155-159`). | Optional: Settings › Finance › Money in: "Variation orders are billed: Spread over the stages · On their own, up front" so Spaces needn't press it each time. | S | yes |
| 361 | Spaces | A collated view of vendor payments due, and a vendor-invoice approval process. ETA? | **Partly.** Company › Finance › To do lists every unpaid supplier bill by due day, red when late (`lib/finance/todo.ts:1-17`, `lib/finance/todo.ts:212-238`; REG-1484); Money out filters Bills. Bills have no approval by decision (F1-Q10); POs and expenses do. | → Call C8 | M | yes |

## 7. Merged duplicates — one package each

| Id | Rows | What one package builds |
|---|---|---|
| **M1** Section spacing in the print | 252 · 257 · 265 · 266 · 267 · 303 | Items › More options › Sections and pages › **Spacing** (mm, all 0 = today's print): Space before a section · Space under a section heading · Space under a section note · Space before a sub-section (none straight after its parent's heading or note, Dyel's rule) · Space between lines. Plus Section heading height (Compact · Normal · Roomy). In the renderer these are `padTop` / `padBottom` on the band, note, area and line slices (`slices:303-325`); the paginator already counts them (`doc:151-153`). |
| **M2** Money styling | 253 · 276 · 300 | A "Sub-totals" text style (`doc.css:60` becomes the default); Totals and Payments print money as the Items block's Currency says (`slices:345`, `slices:391`). |
| **M3** Descriptions keep their shape | 268 · 275 | Keep the HTML when it carries paragraphs, blank lines or alignment (`IM:233-236`); the plain path keeps blank lines (`slices:218`); Line height on the Items text styles. |
| **M4** Section headings on the columns | 302 · 306 (251 is already) | The heading band prints the section's mark in the # column (its width, alignment and colour) and its name where line names start. → Call C4 |
| **M5** Header details | 248 · 321 · 322 | Bold per row (label · value); Lines: None · Under the values · Boxed; a Remarks box → `{remarks}`; Terms and Notes print their lists and alignment. |
| **M6** Payment schedule print | 310 · 332 · 354 · 355 | "(a) · (b)" marks; Show the percentage; the % in its own cell; a fixed row's own word in the % place (310); the Total row's cells and the phone's schedule (332). |
| **M7** Estimation Direct | 277 · 278 · 280 · 281 · 317 · 318 | → Call C1 |
| **M8** Selling at S$0 in the price book | 346 · 347 | The item dialog takes a Unit price; markup may go negative. |
| **M9** The studio's units | 325 · 350 | Settings › Quotes & pricing › Units feeding every unit picker; a type-ahead menu. |
| **M10** A line's words | 287 · 298 · 307 · 326 · 327 · 328 | → Call C2 |
| **M11** Templates keep the studio's changes | 312 · 351 | A Blank Quote pins its version; no repair writes a template's design; new options default to today's look. |
| **M12** Order follows the grid | 260 · 263 · 284 | The trade / room print sorts lines in grid order (`slices:115` → `flattenItems`). |
| **M13** Section-only numbering | 330 · 353 | Already; ops only. |
| **M14** One name per trade | 249 · 264 · 340 · 341 | Case-insensitive labels on a quote; the Trades message names the match; merge on rename; filters collapse case variants. |
| **M15** Notification email | 314 · 337 | Logo bounds and a hosted copy (developers); the look → Call C10. |
| **M16** WhatsApp | 315 · 336 | Already; ops switch. |
| **M17** A word on a whole section | 323 (+ 274's whole-category Inclusive) | Print as on a section. |
| **M18** GST rounding | 282 · 283 | → Call C3 |

**Already built by an earlier pass** (no new work): Print as words (REG-555) for 274 / 285; Highlight (REG-556) for 304; nested
sections and sub-section folding (REG-558) for 250 / 260; the Optional price column (REG-617) for 295 / 300; Vendor/Sub (REG-623) for 296;
revision marks (REG-595) for 292; payment ordinals and Total line (REG-560 / REG-618) for 354; bulk Set category (REG-655) for 342;
Dane's alignment and column moves (REG-822…906) for 251 / 301.

## 8. → prototype (`design-source/context/quote-editor/04-sections-prototype-2026-10-15.md`) — the Items-table package builds these

| Row | Prototype part | What the row needs from it |
|---|---|---|
| 250 | §1 Collapse all / Expand all sections | Sections already fold one by one; add the toolbar toggle for View by: None (today it folds View-by buckets only, `IS:977`, `IS:1003`). |
| 260 · 263 | §9 Drag and drop | Keep 2.0's rules (a sub-section moves within or between top-level sections, `RD:76-80`) and add the before / into / after zones. |
| 261 | §4 "+ Sub-section" on a section row and its add row | The missing way to start a sub-section in an empty section. |
| 262 | §4 Click to rename | Already inline; keep it. |
| 290 | §4 The rename box | Offer the studio's trades as type-ahead in a new section's name. |
| 291 | §8 Bulk bar | Add Group into section · Move into · Move out to today's bar. |
| 308 | §4 Nested numbering | The grid's numbers skip empty sub-sections and lines left out for the client, so they match the print. |
| 323 | §4 / §6 Row menus | The section row's ⋮ gains Print as (M17); the band part is T. |

Outside the prototype spec but in the same Items package, because they live in its files: M3's storage half, M9 (units) and M14's
quote-label rule. 284's print sort and M3's print half are in `slices`, so they go to the T package. One owner per file: the Items package
owns `components/quotes/editor/items/*`; T owns `components/templates/**` and `lib/templates/**`.

## 9. Answers to the questions (for the sheet)

- **256 — Unticking GST on a line.** Set the line's GST (%) to 0. The line still counts in the subtotal and the total; it just adds no
  GST. The quote-wide GST switch (by the totals) turns GST off for the whole quote, and an issuing entity that isn't GST-registered does the
  same. One fix follows: the printed "GST 9%" label will take the quote's rate, not the first line's.
- **273 — A Details value used elsewhere.** Fields update everywhere at once. `{client_name}`, `{project_ref}`, `{site_address}` and the
  rest resolve from the quote and lead wherever the template places them. A value typed straight into the template is fixed words; use
  Insert a field instead.
- **279 — Shannon's items not in the price book.** The price book holds only what was imported or saved. Save a quote's lines with
  *Save to My Items*, or use *Match N lines* to compare a quote's lines with the book.
- **287 — A font size per description.** Not recommended (Call C2). One Descriptions style keeps the print even. For a note that should
  read smaller, use the section note style or a Text block.
- **291 — Ticking several lines.** The bulk bar slides up with Copy, Set value, Section, Print as, Hide from client and Delete; the
  prototype round adds Group into section, Move into and Move out.
- **339 — 0 items under "Hacking & Demolition Works".** In 2.0 an item counts under its own Category; re-check after the import. A trade
  with no items doesn't appear in the filter.
- **343 — RO-Well.** Add RO-Well as an issuing entity (or rename the studio on Company › Profile if they never use Dwellings with
  clients). Quotes, contracts and invoices then print RO-Well's letterhead. The portal address is changed on Company › Client portal, and
  old links keep working. A sub-domain such as `ro-well.openmaison.ai` is the platform team's.
- **345 — Sample packages.** 2.0 has no Packages and seeds nothing into a studio's book; 1.0's ops can delete them.
- **357 — The Optional column.** Today the client can tick optional items on the confirmation link. With the setting proposed in §4, Spaces
  can list them read-only.
- **315 / 336 — WhatsApp.** Each notice's channels are in Settings › Notifications. Assignment by WhatsApp is a switch (off by default);
  follow-up reminders already go by WhatsApp. It needs the Pro plan and the developers' WhatsApp provider.
- **288 — Search in Settings.** Press ⌘K (Ctrl K) and type the setting's name — "approval", "GST", "trades", "numbering". Every
  Settings and Company card comes up with a link to it.
- **289 — "Theme skins: India".** That was 1.0's. 2.0 has no theme or region setting; it is Singapore and S$ throughout.
- **299 — The digitiser and their V3 quote.** In 2.0, Upload a quote reads spreadsheets and a PDF's text. A scanned or photographed PDF
  has no words to read and says so, and the credits come back. Send us the V3 file to try.
- **312 / 351 — Template settings lost after updates.** A release doesn't change a studio's templates. What looks like a lost change is
  usually one of three things. The change was left as a draft: the template editor says "Not published yet", and quotes print the
  published version. The quote is pinned to the version it was made with: the editor's banner offers the update. Or it is a Blank Quote,
  which follows the default template. The fix in M11 pins Blank Quotes too.
- **352 — One quote's layout.** Use Preview › What your client sees: columns, descriptions and amounts for this quote only. It is saved
  with the quote. The Items table's own Columns are your working columns and never change the print. Re-picking the template resets
  those choices today; the fix keeps them.

## 10. Calls for Vicky (each with my recommendation)

Only real product decisions are here. Everything else in §2–§6 is built as written, on the house pieces, with a REG row each.

**C1 — Estimation Direct (M7: rows 277 · 278 · 280 · 281 · 317 · 318).** Dyel prices some work after the contract. 1.0 built it as an
"Extension" tab with its own grid and its own layout (19acb16f6 · 2510154f1 · 531470dc5 · 3997b6dc1). Dyel's own reviewer called the
separate place "not a great experience" (280), and their team said "will be entered separately … not to be picked up right now".
*Recommendation:* no tab and no second layout. A section's ⋮ gains "Priced after the contract". In the grid, marked sections gather at the
end of the table under a divider with that name. In the print they come after the main Items as their own part: a title, letters
continuing (L → M), their own sub-total, never in the contract total or the payment split. The confirmation and signing pages call them
estimates. If Dyel accepts pricing the work as variation orders after signing (already built), nothing needs building. Size L; build it
after the other quote rows.

**C2 — The words on a line (M10: 287 · 298 · 307 · 326 · 327 · 328).** Spaces calls these blockers: formatted, long item names (327) and
their brand colour in descriptions (326). Today a name is plain text, and descriptions carry no colour (REG-557) — kit colours only, on
whole lines (REG-556).
*Recommendation:*
- (a) A name may carry bold, italic, underline and line breaks, edited in the line's Description dialog (renamed "Words on this line":
  name above, description below). The plain name stays for search, X-Ray and exports. 1.0: fe7c9729f.
- (b) Names and descriptions may take a text colour from the brand kit only. The studio sets Accent to its brand hex, which is Spaces'
  case. There is no free hex box; 1.0 made the same call, 4dd60bc56. This reverses REG-557's "no colour inside text" and keeps REG-556's
  kit-only rule. Underline and strike take the colour, and colour survives bold (298 · 307).
- (c) No per-line font size (287).
- (d) Must ship with (b): every name and description HTML passes the contracts' allowlist on save and in print (§12, item 1).

Size M.

**C3 — GST rounding (M18: 282 · 283).** 2.0 works GST out per line and adds the rounded pieces (`M:148`). 1.0 does the same and chose to
keep it (`quotes/port` 6d74d8aec, phase-9 GST spec, "Rounding"). Dyel's own quote takes 9% of the subtotal once, so long quotes differ by
cents.
*Recommendation:* GST = the rate × that rate's taxable net, rounded once per rate (on-behalf lines stay at 0). This applies to quotes not
yet sent. A quote already sent or signed keeps the figure it went out with: stamp the rule on the quote at its first send, as
`prepared_json` does. The three totals keep adding up (net + GST). Size S. It changes drafts' figures by cents and may differ from 1.0's
figure for the same quote by a cent or two — acceptable, because the studio's own paper is the reference.

**C4 — Section headings on the columns (M4: 302 · 306).** *Recommendation:* yes, for every template whose # column prints. The section's
mark sits in the # column (its alignment and colour) and its name starts where line names start. With the # column off, today's band
stays. This moves the band's words a few mm on every existing print, so the package shows the three house styles before and after.

**C5 — A QR beside the payment schedule (294).** 1.0 answered with a general Columns block (9dfa65c38).
*Recommendation:* the narrower job only — a switch on the Payment schedule block, "PayNow QR beside the schedule", using the issuing
entity's QR as Bank details does. A Columns block runs against the template editor's simplicity rule (REG-542). Size S.

**C6 — A Marketing role (313).** *Recommendation:* a sixth fixed role, Marketing, on Accounting's pattern (`opensPath`, `lib/settings/roles.ts`).
It covers Leads (all, or assigned ones under Who sees leads), assigning any member, Reports › Leads, Settings › Lead management and
Company › Integrations (lead capture). It never sees quotes' money, projects or Finance. No roles editor (still held, REG-645). Size M.

**C7 — Letter of appointment with the deposit (358).** *Recommendation, in two steps:*
1. Now, with no code: build Spaces' letter as a contract template. Smart Text fills the studio's blanks; the signing page already takes
   name, NRIC and signature and dates itself.
2. Build:
   - *Send for digital signature* gains "Ask for the deposit". The signing page then ends on "Pay the deposit", for the quote's first
     milestone, to the entity's PayNow.
   - Settings › Projects gains "A project starts when: The quote is signed · The agreement is signed", so a signed agreement can move
     the lead to Won and draft the deposit invoice.

   Size M. Give an ETA after the quote rows.

**C8 — Approving supplier bills (361).** This reverses F1-Q10 ("bills: no approval"). The collated due list is already Finance › To do.
*Recommendation:* approval only where it earns its place. A bill over the PO approval limit, or one that differs from its PO by more than
the studio's tolerance, waits for an Owner's OK in To do before it can be paid. Every other bill stays as today. Size M.

**C9 — A completion & warranty letter at handover (359).** *Recommendation:* contract templates gain "Use at handover". The Hand over sheet
then offers "Send the completion letter" with that template filled from the project (completion date, defects period), to sign or just
send. Size S–M; after the quote rows, as Spaces said.

**C10 — The notification email's look (314 · 337).** REG-2028 flags the email layout "FOR VICKY: the look is yours to design".
*Recommendation:* approve today's one-column layout as it is: logo or studio name · subject · body · "Open it →" · contact lines. Add the
developers' fix that bounds the logo for Outlook. These rows need no redesign.

**Not calls (decided by the house rules, recorded here so they aren't asked again):**
- 357's setting "Clients may pick optional items" (on = today).
- 360's "Variation orders are billed: Spread · On their own".
- 324's zero-quantity dash.
- 363's "Lines between rows".
- M1's spacing knobs: all default to today's look, so no existing print changes until a studio sets them.

## 11. 1.0's newer branches — what they answer and where 2.0 stands

1.0's `deployment/qanvast` has **105 commits since 2026-09-26**, after 2.0's quote audits of 2026-09-24/25. Most answer these rows: they
are column H's "Done – Deployed". `port/spaces-studio-2026-10-12` adds **9 commits** past it, every one a Spaces Studio row. `quotes/port`
(1.0's port of 2.0's quote editor) and `port/urbanhome-ui-2026-10-13` (2.0's UI layered on 1.0) answer no row here.

**Rows where 1.0 built something 2.0 lacks.** The 2.0 shape of each fix is in §2–§6.

| Rows | 1.0 (commit; all `deployment/qanvast` unless marked "spaces") | The job 1.0 solved | 2.0 |
|---|---|---|---|
| 248 | 3b4bad5a9 | Per-row B/I/U on Meta key-value labels and values | Lacks → M5 |
| 252 | 3b4bad5a9 `sections.rowHeightPt` | A section heading's own height | Lacks → M1 |
| 253 · 276 | 9d61cc370 · 2de5063e5 · 4d9b2d120 | Price and currency text style; un-bold grand total; totals use the currency column | Grand total already; the sub-total style and Totals following Currency are lacking → M2 |
| 257 · 265 · 266 · 267 · 303 | f8df65bbb · 2de5063e5 | Description spacing and table spacing controls | Lacks → M1 |
| 268 · 275 | 531470dc5 · 1d00d997a · 7b0c6b22a | Grid shows description edits; line breaks and blank lines print | Partly → M3 |
| 270 | 25ea89b7f `descriptionWidth` | A section description as wide as the item text | Lacks |
| 251 · 302 · 306 | 25ea89b7f | Section letter aligned with the # column | Lacks → M4 / C4 |
| 277–281 · 317 · 318 | 19acb16f6 · 2510154f1 · 531470dc5 · 3997b6dc1 | Quote extension (Estimation Direct) | Lacks → C1 |
| 287 | 2f2e013bd | Rich-text size and family | Lacks by decision → C2 |
| 294 | 9dfa65c38 | Columns block (T&Cs + milestones · QR) | Lacks → C5 (narrower) |
| 297 · 310 | c5d28109e · 6e7708c4e | A fixed fee carried everywhere; "Design Fee" in the % column | Partly → 297 fix, M6 |
| 316 | 07a06338e | Price-book add doesn't bring empty sub-sections | Partly → 316 fix |
| 321 · 322 | 9b70a0e18 · 9fe1393be (spaces) | Boxed-grid header details, wider value cells | Boxed cells lacking → M5 |
| 323 | b2f34cbeb · cd8256b6b · e8dafc28f | A section's lump sum from its header; Approximate / By Others / Included words | Line words already (custom word); a word on a section lacks → M17 |
| 324 | 9fe1393be (spaces) | A zero Qty prints a dash | Lacks |
| 326 | 4dd60bc56 | The studio's brand colour in the text-colour picker | Lacks → C2 |
| 327 | fe7c9729f · 547fae4ea | Partial name formatting; per-line price colour | Lacks → C2 |
| 329 | 84e9f4aa1 (spaces) | The section band extends over its description | Lacks |
| 331 | 0919c876d (spaces) | `{signed_date}` | Lacks |
| 332 | c562f1030 (spaces) | Payment schedule columns aligned on the signing view | Partly → 332 fix |
| 314 · 337 | 13a1e3d88 · 7e92d837b (spaces) | Email logo bounded on both axes for Outlook | Lacks (developers) → M15 |
| 346 · 347 | f874bd344 · 1c9323f6b | No silent S$0 from an unpriced price-book row; a lone price column is a cost | Partly → M8 |

**Rows 1.0 had to fix that 2.0 already does.**

| Rows | 1.0 (commit) | The job | 2.0 |
|---|---|---|---|
| 246 | 5caddc940 · 212d360c9 · fdad081a3 · 7b0c6b22a | Page number inside the margins | Already — the canvas sits inside the margins |
| 247 | d28ccf17e | A second Meta key-value block | Already |
| 250 | 747abecfb | Collapsible sub-sections | Already |
| 254 · 286 | f8df65bbb · 76e14ae46 · ce5adb0c9 · df739be03 | Footer rich text, document font, Arial, embedded fonts | Already, in 2.0's shape (Text elements, the kit's roles, self-hosted faces S11) |
| 260 · 263 · 284 | 7b0c6b22a · 200c07c52 · f8df65bbb | Order anywhere; Preview follows a reorder | Already for the quote's own sections; one print-sort bug → M12 |
| 261 · 262 | 200c07c52 · ccde04d7c · d75820e18 | Empty sections numbered; rename keeps position | Already; + Sub-section → prototype |
| 271 | c07b16d59 | A deleted Property type row stays deleted | Already |
| 272 | dd4c3e58d | Per-row "When empty" | Already — labels always print |
| 292 | 4d60a8e77 | Omitted lines show no new qty | Already (REG-595) |
| 293 | 3659eda38 · e89d078bc | Rows dropped by Paged.js | N/A; a probe check (§4) |
| 295 · 296 | 8f9d0d34d | Optional Price and internal Vendor columns | Already (REG-617 · REG-623) |
| 325 | 6591a26e1 (spaces) | Unit dropdown scrolls | Already |
| 330 · 353 | 52b536355 (spaces) | Section-only numbering | Already (two settings) |
| 333 | 886b491ee (spaces) | Preview as the homeowner | Already ("See it as …") |
| 336 | b95feffa9 · 4a2774bc5 | Notify the assignee and assigner; reminders respect channels | Already (per-event channels, personal mute) |
| 358 (part) | 3da3ddb66 | Signing links for uploaded documents | Already (Contracts › Import from file, REG-534) — plus C7 |

**1.0 features noticed in the sweep that answer no row here**, for the next parity pass rather than this build:
- per-vendor prices on one price-book item (340cbc74f);
- quote revisions with a superseded lock and a colour legend (ef8a65d8e…9aef06e96) — 2.0 has its own revisions, REG-565 · REG-595;
- signing links for any uploaded lead file (3da3ddb66);
- lead-less "Quote Templates" with items (d9d700c01 · 25a434746) — 2.0's My Sections and starter sections cover the job;
- images inside section notes (91fbb81e9);
- a Subtitle band that repeats (eb1db49b8);
- sub-items made by dropping a row onto a row (4ac53134e) — 2.0's Q-5 add-on options are still held.

## 12. Found on the way

Things outside the rows, found while reading the code for them. Each is folded into the package that owns its file.

1. **Security — description HTML is stored unsanitised.** `quote_items.description_html` is only capped in length (`IA:85`). It is drawn
   with `dangerouslySetInnerHTML` (`slices:242`; section notes `slices:211`), including on the client's public pages. Price-book HTML
   already goes through `sanitizeContractHtml` (`PBA:58`). Fix: the same allowlist on save and in print. Invisible; developers' lane; must
   land before C2.
2. With the client view's "Optional works" off, confirming marks every optional line "skip" (`QA:315-317`), so the grid reads "Client
   said no" (→ 357).
3. A description edit that only aligns text or adds paragraphs is lost on save (`IM:233-236`) (→ M3).
4. A trade- or room-grouped print can interleave lines from different sections (`slices:115`) (→ 284 · M12).
5. The grid numbers empty sub-sections and lines hidden from the client, which the print skips (`M:199-212` vs `slices:305-313`) (→ 308).
6. The section row's "description" menu action does nothing (`IS:638`). On desktop a section's note dialog opens only from a note that
   is already formatted, or from Show Full Content (`IR:302-317`). → the Items package.
7. A kept version's Preview draws with the live quote's template and view (`lib/templates/queries.ts:257-294`) (→ 294).
8. The editor's live Client view pane doesn't show the second client from General Info until a save and reload
   (`components/quotes/editor/quote-editor.tsx:472`).
9. The printed `{gst_rate}` takes the first line's rate (`data:116`) (→ 256).
10. A Blank Quote is never pinned to a template version (`app/leads/quotes-actions.ts:77-83`) (→ M11).
11. The payment schedule's Total row has one cell too many with Show amounts off (`slices:426-432`) (→ 332).
12. The price book's Category filter lists a case variant twice (`PBI:148`) (→ M14).
13. Members accepts a landline as a sign-in phone, which can't receive a code (→ 344).
14. The bulk bar has no Highlight, though a comment implies one (`IS:852`) — Items package, if wanted.
15. Terms and Notes print without their lists, numbering and alignment (`slices:41-45`, `slices:473-485`) (→ 321 · M5).

**Order of work.** One owner per file, as the brief asks:
- **T package**, owning `components/templates/**` and `lib/templates/**`: M1 · M2 · M4 · M5 · M6, plus 270 · 309 · 324 · 329 · 331 · 363,
  284's print sort, 294's kept-version fix and M11's pin.
- **Items package** — the prototype plus §8 — owning `components/quotes/editor/items/*`, `app/quotes/items-actions.ts` and
  `lib/quotes/items-model.ts`: M3's storage half, M9, M14's quote-label rule, 316, 323's menu half, 335's message, and the security fix.
- **Q package**, owning the rest of `components/quotes/**` and `app/quotes/actions.ts`: 334 · 352 · 357, 311's live fields, 256's rate
  and 310's word in the payments editor's % cell (M6's print half is T's).
- **P package**, owning `components/company/price-book/*` and `app/settings/*` trades: M8 · M14 (Trades) · 319 · 264.
- **Finance and Projects**: 297 · 360.
- **Company › Members**: 344.
- **Developers**, outside Vicky's lane: M15's email logo, and §12 item 1 (the allowlist) with the Items package.

The calls C1–C10 wait for Vicky's answers. Each package runs the existing probes (template editor, Items UX, round 1, studio requests,
price book parity, quote editor parity) plus its own, at 1440 / 768 touch / 390 touch.
