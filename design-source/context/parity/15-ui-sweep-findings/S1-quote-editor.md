# S1 · The quote editor and the quote lists — the audit's findings (2026-09-25)

| # | kind | where | what a person sees | fix |
|---|---|---|---|---|
| 1 | bug | item-cards.tsx line sheet · text-field · format | on a phone every number box is `amount`: Cost 1500 saves **S$1.00**, 12,500 → S$12; Qty 1.5 → 15, GST 9.5 → 95 | money / decimal + readNumber |
| 2 | bug | confirm-page.tsx · quote-editor.tsx SendContractDialog (no onCopy) | before sending, the confirmation link shows the whole draft quote, prices included; Copy link hands it out without sending; the kebab's snackbar lies | render the document only when open/confirmed/signed; copying sends (REG-631's rule) |
| 3 | bug | items-section bulk hide · item-row eye | bulk "Hide from client" on a top-level line: no mark, no way back, no Undo | eye on every row/card + Undo |
| 4 | bug | cell-input.tsx · arith | Markup under cost opens "-40.00"; typing strips the sign and saves positive | signed money cell |
| 5 | bug | deleted-quotes-sheet · dialog.module.css | 768–1024: 800px of columns in an overflow:hidden table — Delete Forever clipped | scroll or stack |
| 6 | bug | items-section · name-dialog | "Label the sub-total…" can never be removed | a remove row / allow empty |
| 7 | bug | quote-preview ?print=1 zoom | below ~840 the page's left edge is cut and it scrolls sideways after print | zoom 1 only in print |
| 8 | bug | quote-preview Send | only marks Sent to Client — no link, no WhatsApp | reuse Send ▾ or "Mark as sent" |
| 9 | bug | deleted-quotes-sheet | failures silent; a failed load reads "No deleted quotes." | fail() + error row |
| 10 | bug | payments / files / comments optimistic edits | a failed save leaves the new value on screen | roll back |
| 11 | bug | quotes-table Status menu | inline Dropdown in the scroller — clipped on a short table | PortalMenu |
| 12 | bug | quote-editor Maison AI buttons | open an AI sheet with no suggestions (only Reset prototype) | coming soon or suggestions |
| 13 | bug | items-table Find | no "no match" state; the Sum row totals every line | empty row; sum what's shown |
| 14 | bug | row menu Print as › Custom word | opens reset to FOC with the word box hidden and replaces the selection | open on custom for the ids |
| 15 | bug | items-section.module.css below 830 | By category paints under the fixed 434 totals card | stack at ≤1024 |
| 16 | bug | items head at 390 with Find open | the head runs ~60px past the card, the page scrolls sideways | ToolbarSearch / full-width find |
| 17 | bug | quotes-workspace ?template= with none | chip over a bare head, no empty state | empty state |
| 18 | drift | caption-m ×6 | undefined token → 14px | caption-s |
| 19 | drift | client-view-pane in Drawer | two headers, two closes | drop the pane's own head |
| 20 | copy | create-quote-modal Upload | "PDF · XLS · JPG" but only sheets read | say XLSX · CSV |
| 21 | copy | signature-section | "Client signs online" above "Not requested" | title follows the switch |
| 22 | copy | quotes-table Delete vs policy | "creator or Owner" (Admins too); the editor kebab enabled then refuses | DELETE_RULE wording; disable alike |
| 23 | drift/copy | lead-quotes · quotes-workspace · items-section | soft delete snackbar without Undo; failures without an object | Undo; name the object |
| 24 | copy | items-table · create-quote · description-dialog · quotes-toolbar | "View Price Book"/"price book" vs My Items; "Settings › Quotes"; "Copy Link" means three links | one name each |
| 25 | drift | create-quote-modal · quotes-filters-modal | page-local modal shells | Dialog |
| 26 | drift | quote-bars · client-view-pane · preview · payments · item-cards · table-menus | icon-only without Tooltip | Tooltip |
| 27 | drift | preview loading | opening Preview shows the editor's ghost; no PageReveal | preview/loading.tsx |
| 28 | drift | description-dialog 560 | off the scale | 600 |
| 29 | drift | payments-section | heads resize but don't drag; % box lets S $ , in | useColumnDrag; decimalTyped |
| 30 | drift | items-summary named discounts | raw inputs, placeholder as label | TextField s |
| 31 | drift | quotes-filters date chips · signature "Show as" | page-local chips / radios | Chips |
| 32 | drift | signature / items-table / section-card / template-bar CSS | hard-coded type, rgba shadows, `--om-color-on-surface` | tokens |
| 33 | drift | general-info NRIC | any text; isNric unused | validate |
| 34 | bug | create-strip.module.css (+ globals) | `transition: width var(--motion-modal, 0.2s) ease` invalid (two easings) — snaps | `var(--motion-modal)` |

Backlog: **U-01 partly** (kebab through PortalMenu; the Status menu still inline, clipped); **U-03 confirmed** (`pct` "-40%" in Margin, Markup "(x%)", the owner strip, Preview's internal copy); **U-04 confirmed** (`onAddLabel` keeps no line; the phone sheet too); **U-05 confirmed** (delete-dialog "cannot be undone"); **U-06 confirmed, worse** (#2); **U-07 confirmed** (no archived view); **U-08 confirmed** (Deleted Quotes: no selection / bulk / resizer).

## What the round did (REG-657, 2026-09-25)

Fixed: #1–#11, #13–#19, #21–#24, #26–#28, #30–#34, T-01…T-03, U-01 (the Status menu through `PortalMenu`), U-03 (a signed markup, `pct` with −), U-04 (the label added on the line it was asked from, table and phone sheet), U-05 (the delete dialog says where the quote goes), U-06 (#2), U-07 (Archived Quotes; the contracts half is S2's), U-08 (Deleted Quotes' selection and bulk bar). Probe `design-source/verify/ui-sweep/verify-sw-r1.cjs` 33/33, shots `s1-*`.

Left, and why:
- **#12** the Maison AI buttons open the sheet with *Reset prototype* only — the editor's scripted suggestions wait for a mock (inventing AI answers is not a UI fix).
- **#20** *PDF · XLS · JPG* on Upload a quote — the mock's words; what a picked file that can't be read hears is already specific.
- **#25** the Create Quote and filters modals keep the listing's filter-modal shell — the leads, contracts and tasks filters share it (focus trap, Escape layer, sheet on a phone): one family, not page-local.
- **#29 (drag)** the payments table's heads resize but don't drag — the mock's fixed columns, and the table has no Column settings to keep an order in. The % box's filter is fixed.
- **#30 (controls)** a named discount keeps the mock's Additional Discount mini controls; its value box now filters as typed.
