# S44T · the template editor and the printed quote — outcome (2026-10-15)

Her ask (2026-10-15): "go through the sheet for the UAT comments from row number 246 and below to identify and fix all the UAT comments based on
our 2.0 experience without any overlaps nor any issues without losing what we have already built … If you have any questions please go ahead
based on your recommendations." Package S44T = area T of the triage (`design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md`
§2, §7, §10, §11, §12) plus call C1 and C2's print side. Every call taken **as recommended — her UAT ask 2026-10-15**. Built in lane A
(port 3160; the prompt's ":3185" is lane E's port — not used). Register rows: `steps/reg-S44T.md` (REG-S44T.1…21).

## Ledger — every row S44T owns

| Row(s) | Studio | Status | Where / why |
|---|---|---|---|
| 246 | Dyel | **Already** — no change | The header canvas sits inside the margins; the page number is an element placed in mm on it. |
| 247 | Dyel | **Already** | Header › Add to the header › Details adds a second Details element (REG-569). |
| 248 | Dyel | **Built** (M5) | `KVRow.labelBold · valueBold`; *Label in bold* / *Value in bold* on each Details row card (`inspector.tsx` `KvRows`); printed by the one `KvTable` (`components/templates/render/canvas.tsx`) the block and the header element share. REG-S44T.4 |
| 251 | Dyel | **Already** | The # column's alignment. |
| 252 | Dyel | **Built** (M1) | *Section heading height: As the rows · Compact · Normal · Roomy* (`ItemsBlock.headingHeight`, the band's padding). REG-S44T.1 |
| 253 · 276 · 300 | Dyel · IDL | **Built** (M2) | *Sub-totals* text style (`ItemsBlock.subtotalStyle`, default = today's bold); `TotalsBlock.currency` · `PaymentsBlock.currency`, set together by the Items Currency; "$ with a space" apart from the figure. Grand total's weight was already settable. REG-S44T.2 |
| 254 | Dyel | **Already** — answer: build the footer as two Text elements plus a Line; Courier New is curated; one document font is set in Brand. |
| 257 · 265 · 266 · 267 · 303 | Dyel · IDL | **Built** (M1) | `ItemsBlock.spacing` (beforeSection · underHeading · underNote · beforeSub · betweenLines, mm) as `padTop` / `padBottom` on the band, note, area and line slices (`slices.tsx` `emit` / `pushLine`); Dyel's rule: no space before a sub-section straight after its heading or note. REG-S44T.1 |
| 258 · 271 · 272 · 285 · 286 · 295 · 301 · 305 · 356 · 362 · 364 | various | **Already** | As the triage reads (column widths in mm, removing a Details row is final, labels print with an empty value, Print-as words bold, Arial curated, Optional price column, column alignment, Plain words headings, the header holds the intro, Totals › Lines › None, Qty · Unit in one cell). |
| 273 | Dyel | **Already** — answer §9 (fields resolve everywhere; typed words are fixed). |
| 275 · 268 | Dyel | **Built — print half** (M3) | "Every line" keeps a blank line as a line of space; the Items table's five text styles open with Letter spacing and Line height (spaces bullets). The storage half (keep the HTML of a paragraph- / alignment-only edit, `lib/quotes/items-model.ts` 233-236) is **S44I's**. REG-S44T.20 |
| 284 | Dyel | **Built** (M12) | A trade / room / section-label bucket sorts its lines in the grid's order (`flattenItems`), not by position alone. REG-S44T.14 |
| 287 | Dyel | **Kept** (call C2 (c), as recommended) | No per-line font size. |
| 293 | IDL | **Built** | A line taller than a page's body runs its description on in slices of its own (`document.tsx` measures, `buildSlices(…, split)`); the probe asserts every counted line prints once and no row reaches past its page's body. REG-S44T.16 |
| 294 | IDL | **Built** + **call C5 built** | The kept version's Preview draws with its own template / version / view (`lib/templates/queries.ts` `fetchQuotePreview` — `printed`); *PayNow QR beside the schedule* (`PaymentsBlock.qr · qrWidth`). REG-S44T.15 · .8 |
| 298 · 307 · 326 · 327 | IDL · Spaces | **Built — print side** (call C2 (a)(b)(d)) | `quote_items.name_html` (migration 0111) prints with its emphasis; `<span data-kit="KEY">` prints in the kit's colour in names, descriptions and section notes (`lib/templates/kit-html.ts`); an underline / strike round a coloured run takes its colour; the allowlist keeps `data-kit` (`lib/contracts/sanitize.ts`). **Editor side is S44I's.** REG-S44T.18 |
| 302 · 306 | IDL | **Built** (call C4) | The band's mark in the # column, its name where line names start (`slices.tsx` `bandRow`). REG-S44T.3 |
| 304 · 353 | IDL · Spaces | **N/A** | No sub-section total row in 2.0; 1.0's name / # overlap doesn't exist in 2.0. |
| 309 | IDL | **Built** | *Colour* on each printed column card (`ColorPick`); the # column's colour reaches the sub-section numbers and the band marks. REG-S44T.10 |
| 310 | IDL | **Built** (print + the editor's % cell) | A fixed row prints its own word (`DocPayment.label`, `fixedWord`); typed in the Payment Schedule's % cell (`quote_payments.fixed_label`, `payments-section.tsx` field `word`, `payments-actions.ts`). The triage put the cell in the Q package; S44Q's prompt doesn't carry it, so it is built here. REG-S44T.6 · .7 |
| 312 · 351 | General · Spaces | **Built — my part** (M11) | R37 reads only the three seeded templates; the developers' rule "a new option is unset on a stored template and unset prints as before" is written on `ItemsBlock` in `lib/templates/model.ts` and held by every S44T option. **The Blank Quote's pin is S44Q's** (lane E, `app/leads/quotes-actions.ts`) — not repeated here. Answer §9. REG-S44T.21 |
| 321 | Spaces | **Built — my part** (M5) | General Info › *Remarks* (`quotes.remarks`) → `{remarks}`; the live pane prints it as typed. **The T&Cs' lists / numbering / alignment in print are S44Q's** (lane E, `slices.tsx` `textSourceSlices` + `lib/rich-html.ts` `textPieces`) — not repeated. REG-S44T.5 |
| 322 | Spaces | **Built** (M5) | *Lines: None · A line under each value · Boxed* on the Details block and element (`KvLines`, `detailsLook` reads the old Form lines). REG-S44T.4 |
| 324 | Spaces | **Built** | *A zero quantity prints: Nothing · A dash (–)*. REG-S44T.11 |
| 329 | Spaces | **Built** | *Section notes sit in the heading’s band*. REG-S44T.9 |
| 270 | Dyel | **Built** | *Section notes run: Across the table · Under the Item column*. REG-S44T.9 |
| 330 | Spaces | **Already** — ops: "Sections are marked 1 · 2 · 3" + "Item numbers: None" for Spaces. |
| 331 | Spaces | **Built** | `{signed_date}` (Insert a field › Quote › Signed date); a new Signature block reads "Date: {signed_date}". REG-S44T.12 |
| 332 | Spaces | **Built** (M6) | The table's Total row has a cell under every column; the phone's reading cards end with the schedule (`readingSections` → `ReadingSchedule`, `reading-cards.tsx`). REG-S44T.6 · .19 |
| 354 · 355 | Spaces | **Built** (M6) | *(a) · (b) · (c)* marks (the choice became a select); *The percentage: Before the words · In its own column · Not printed*. REG-S44T.6 |
| 363 | Spaces | **Built** | *Lines between rows: None · Between rows · Under every row*. REG-S44T.13 |
| 277 · 278 · 280 · 281 · 317 · 318 | Dyel | **Built** (call C1) | *Price after the contract* on a top section's ⋮ — `quote_items.priced_after`, `setSectionPricedAfter` (moves it to the end), maths out of total / split / margin, the *Priced after* tag, the print's own part with *Estimated total*, the phone cards' "estimates", Undo keeps it. **The grid's divider row is S44I's** (the prototype's §4 table). REG-S44T.17 |
| 328 | Spaces | **N/A** — ops after C2's editor side (S44I). |

## The sheet's answers for these rows (from triage §9, unchanged)
- **273** Fields update everywhere at once; a value typed straight into the template is fixed words — use Insert a field.
- **312 / 351** A release doesn't change a studio's templates: a draft left unpublished, a quote pinned to its version, or a Blank Quote (now pinned too, S44Q). And no repair writes a studio's own template (R37 guarded).
- **254 · 330 · 362** Ops: the footer as two Text elements + a Line; Spaces' section-only numbering is two settings; Totals › Lines › None.
- **New, for Dyel / Spaces / IDL:** Items › More options › Spacing and Section heading height (252 · 257 · 265 · 266 · 267 · 303); Text styles › Sub-totals (253); Details rows' bold and Lines › Boxed (248 · 322); General Info › Remarks + the Remarks field (321); Payment schedule › (a) · (b) · (c), The percentage, the fixed fee's word typed in the quote's % cell, PayNow QR beside the schedule (354 · 355 · 310 · 294); a section's ⋮ › Price after the contract (Estimation Direct, 277…318).

## Calls taken as recommended
- **C1** no tab and no second layout: a section's ⋮ › Price after the contract; marked sections gather at the end of the table; in print their own part after the items, letters continuing, their own total, never in the contract total or the split; the confirmation link calls them estimates.
- **C2** print side: emphasis and kit colours print; kit colours only (`data-kit`, a kit key — never a hex); underline / strike take the run's colour; the allowlist keeps the mark; no per-line size.
- **C4** yes for every template whose # column prints (shots before / after: `design-source/verify/pending-modules/pm2-s44t/c4-*`).
- **C5** the narrower job — a switch on the Payment schedule block, no Columns block.
- **Not calls** (house rules): 324's dash, 363's lines between rows, M1's knobs — all default to today's look.

## Handed over by S44Q (coordinator, 2026-10-15) — done
- **Rows 310 and 332 whole** — the schedule's print and the editor's % cell word (310), the Total row and the phone's schedule (332): built here (above).
- **Text blocks through the allowlist on save** — `parseDesign` (`lib/templates/model.ts`) now passes every Text block's `html` through the house allowlist on every read, and `saveTemplateDraft` stores the draft as read back (publish already re-parses), so a stray tag, a handler or a script link never reaches the editor, the print or a client page; the probe stores one and finds none, and the saved draft holds none. It uses `sanitizeContractHtml` — the very rules `lib/rich-html.ts` `sanitizeRichHtml` wraps (S44Q's file isn't in lane A yet); the same goes for C2's print side (`slices.tsx`, the name's HTML) — after S44Q lands, either name can be used, the result is identical.
- **Not redone:** the T&Cs' lists / numbering / alignment / blank lines in print, the allowlist itself and `{gst_rate}` — S44Q's; S44T's `slices.tsx` edits stay out of `textSourceSlices` and the `html()` helper (the simulated merge of every shared file is clean).

## For other packages
- **S44I (Items table)** — C1's **divider row** in the grid ("Priced after the contract" above the gathered sections; today they move to the end and wear the *Priced after* tag; the phone's item cards could wear it too). C2's **editor side**: write `quote_items.name_html` (b · i · u · br, and `<span data-kit="KEY">` with a kit key only) through the house allowlist; `name` keeps the plain words; a colour mark ideally wraps its decorations (the print swaps `<u><span data-kit>` anyway). M3's **storage half** (`items-model.ts` 233-236). `RowMenuAction` gained `'pricedAfter'` and `table-menus.tsx` / `item-row.tsx` / `items-section.tsx` each gained one small branch for it (marked `S44T`).
- **S44Q (lane E)** — already owns and built: the T&Cs' lists in print (row 321), the Blank Quote's pin (312), `{gst_rate}`, the allowlist (`lib/rich-html.ts`). S44T only extended the shared allowlist under it (`lib/contracts/sanitize.ts`: `span[data-kit]`, a kit key) so kit colours survive S44Q's clean-on-save and R172. R172 rewrites a template's Text block only when the allowlist changes it — consistent with M11 (a clean template is never written). In `lib/quotes/client-quote.ts` S44T added one line (estimates and a name's emphasis reach client pages); in `quote-editor.tsx` the live Remarks ride a new `remarks` input to `docDataFromRecords`, so S44Q's changed client-data line is untouched. A simulated 3-way merge (S44Q then S44T over main) of every file both lanes changed is clean except `scripts/repair-demo-data.ts` (R126 and R172 side by side before the checks — the landing rule).
- **Orchestrator** — migration **0111 `s44t_print`** (four additive columns: `quote_items.priced_after` · `name_html`, `quote_payments.fixed_label`, `quotes.remarks`), regenerate in main; repair **R126** (checks + mends only; nothing seeded; R37 narrowed). `design-lint.baseline.json` not touched (inline-style now 41 ≤ 42 allowed — may be lowered at landing).

## Shared pieces changed
- `lib/quotes/math.ts` — `countedLines`, `quoteTotals` and `categoryShares` leave out every row under a section with `pricedAfter` (as they leave out a Declined section); new `afterContractIds`. Every total, the quote's stored amount, the payment split, the margin, By category and the grid's Sum follow. Quotes without the mark compute exactly as before.
- `lib/contracts/sanitize.ts` — the house allowlist keeps `span[data-kit]` with a kit colour key.
- `lib/templates/model.ts` `parseDesign` — every Text block's `html` through the allowlist on read; `app/company/templates-actions.ts` `saveTemplateDraft` stores the parsed draft.
- `components/templates/render/*` (renderer — S44T's own), `lib/templates/*` (S44T's own).
- `components/quotes/confirm/reading-cards.*` and `quote-stage.tsx` (the phone cards: estimates + schedule), `components/quotes/editor/payments/*` (the fee's word; the phone card's delete clearance), `general-info.tsx` + `quote-editor.tsx` (Remarks), `app/quotes/{actions,payments-actions,items-actions}.ts` (Remarks, the fee's word, `setSectionPricedAfter` + Undo keeps `pricedAfter` / `nameHtml`).
- Probes updated for deliberate changes: `uat-dane-2026-10-01/P1/verify-p1.cjs` (C4: a band reads across its cells) and `quote-templates-parity/verify-tpl-parity.cjs` (the milestone marks are a select).

## Checks
- `npx tsc --noEmit -p .` clean · `npx eslint` 0 errors (only the existing `<img>` warnings) · `npm run design:lint` green (inline-style 41/42) · production build under the lock: exit 0.
- Probe `design-source/verify/pending-modules/verify-pm2-s44t.cjs` on :3160 against a migrated + repaired copy of `pbuild/base.db`: **69/69** — 1440 + 390 / 320 touch; shots in `design-source/verify/pending-modules/pm2-s44t/` (incl. C4 before / after of the three house styles: `c4-before-*` from main's build, `c4-after-*` from the lane).
- Regression (`design-source/verify/regression/run.cjs`, RUN_DIR + :3160): tpl-parity 20/20 (after the deliberate update — the select needs the inspector to settle first) · qe-r1 34 · qe-r2 33 · qe-r3 21 · qe-r4 14 · qe-r5 21 · dane-p1 47 (C4 update) · ux-p4 56 · ct-r2 24 · sw-r2 27 · pb-r3 30 — all green; tpl-parity · dane-p1 · qe-r1 re-run green on the final build.
- Pending-modules / parity-map probes on the lane (a lane copy of `pbuild/run-env.sh`, :3160): pm2-s04 82/82 · pm2-s11 62/62 · pm2-s02 106/106 · pm2-s03 79/79 · pm2-s41b1 110/110 · pm2-s42b 66/66 · pm-a 47/47.
- 390 / 320 / 768 touch: no sideways overflow on the quote editor, Preview, the confirmation link and the template editor; page error log empty.

## What to check in the browser (Dane · Owner; Hui Min · Admin; Germaine / Michelle · Designers)
1. Company › Templates › any quote template › Items table › More options: Spacing, Section heading height, Lines between rows, A zero quantity prints, Section notes run / sit in the band, Work priced after the contract is headed, Text styles › Sub-totals; each printed column's Colour. Payment schedule: Milestones are marked (a) · (b) · (c), The percentage, Currency, PayNow QR beside the schedule. Quote details: Lines, Label / Value in bold.
2. A quote (OM-10001) › Items › a section's ⋮ › Price after the contract → Preview: the part after the items with Estimated total; the Grand total without it. ⋮ › Price with the contract puts it back.
3. General Info › Remarks → a template whose Details row holds `{remarks}`. Payment Schedule with a fixed fee first → press "Fixed fee" → "Design Fee".
4. A signed quote (OM-10004) through a template whose signature reads "Date: {signed_date}".
5. The confirmation link on a phone (OM-10007): the cards end with the payment schedule.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for these rows; each choice follows the triage's recommendation and is logged with its invented words flagged (REG-S44T.1…21).
2. **One system, no one-offs** — the inspector's own controls (`Sel`, `Num`, `Sw`, `ColorPick`, `StyleEditor`, `IconButton`), the house `PortalMenu` row menu, the house snackbar and refusal (`refuse` → `couldnt`), one `KvTable` for the block and the element, one `payMark` for the print and the phone cards.
3. **Plain words** — "Price after the contract", "Lines between rows", "A zero quantity prints", "The percentage · Before the words", "Section notes run · Under the Item column"; no codes.
4. **Nothing is lost** — every option unset prints as before; the old Form lines layout reads as Lines › A line under each value; Undo (⌘Z) keeps a section's mark and a name's emphasis; R37 no longer touches a studio's template.
5. **Say why** — a refused mark says its rule ("Only a section at the top of the table can be priced after the contract"; a variation order "is priced in full"); the Remarks box says where it prints; the QR switch says when it prints.
6. **Back returns where you came from** — no new page or route; existing Back paths untouched.
7. **Every screen is whole** — no new pages; the Preview, the editors and the client link keep their ghosts; the print never clips a line (293).
8. **Every width is designed** — 1440, 768 touch, 390 / 320 touch checked: no sideways overflow; the phone's payment cards now clear their delete; the phone cards end with the schedule; the milestone marks became a select so they fit the inspector.
9. **Tables follow the leads listing** — the print's tables are documents, not listings; the Items grid only gained a tag and a menu row on its own model.
10. **Motion with purpose** — none added.
11. **Honest data** — no demo state seeded; R126 only mends rows a write could leave wrong (a mark on a line / sub-section / variation order; a fee word without a fee) and checks them; estimates never reach a total.
12. **Reach for everyone** — every new control is a labelled house field or a labelled icon button (*Label in bold* · *Value in bold*); the fee's word is a button with its own label and Enter / Esc; the phone schedule is a labelled `role="table"` with rows and cells.
