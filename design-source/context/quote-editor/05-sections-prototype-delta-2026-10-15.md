# The team's sections prototype against 2.0's Items table: what to take (2026-10-15)

The spec read: `04-sections-prototype-2026-10-15.md` (the team's HTML prototype, all 12 parts). The code read: `components/quotes/editor/items/*`,
`components/quotes/editor/quote-editor.tsx`, `app/quotes/items-actions.ts`, `lib/quotes/{math,clipboard,items-model}.ts`. The decisions read: REG-405…422,
426…483, 527, 532, 555…576, 621…628, 662, 820…906, the Items UX audit (`03-items-table-ux-audit-2026-09-23.md`) and the memory notes on the Excel
benchmark and the Items UX. The owner's word on 2026-10-15 was "do those changes as well … take your recommendation". This file gives every
behaviour one verdict. It then gives the build list in the order to build, and the few calls where the prototype runs against a decision he made.

**Verdicts.** **Already**: 2.0 does it now (file:line). **Keep 2.0**: 2.0 does it another way and its way is better, or it is the mock's or an
owner's call. **Build**: missing, so build it in 2.0's shape. **Conflict**: the prototype goes against a logged decision. These are listed under
*Calls for Vicky*, each with a recommendation.

**What the prototype adds that 2.0 lacks.** The real gains are a way to add at the end of each section, sub-sections made in one press, adding
several lines at once, a place for the Price book and for pasted lines, bulk moves in and out of sections, dragging several ticked lines and dropping
into a folded section, Enter adding the next line, and lines that show the tree. Most of the rest is 2.0 already, often done better by an earlier
owner call. **Never a second catalogue:** each place the prototype says "catalogue" is 2.0's Price book (REG-662).

## 1. Behaviour by behaviour

| # | Behaviour (spec §) | 2.0 today | Verdict | Build plan (2.0's shape) | Visible |
|---|---|---|---|---|---|
| 1 | "Items (n)" counts item lines, not sections (§1) | `items-section.tsx:291` `lineCount` = `kind === 'item'`; title `:1031` | Already | — | — |
| 2 | Search (icon) (§1) | Find glyph → DS SearchBar, ⌘F, Jump to list `items-section.tsx:873-921` (REG-477 · REG-862) | Already | — | — |
| 3 | New section button (§1) | `items-section.tsx:989` (REG-567), lands centred with its name selected `:851` (REG-573) | Already | — | — |
| 4 | Undo / Redo with key tooltips, disabled when empty, keys anywhere on the card but a text box (§1) | `items-section.tsx:990-993` (`Tooltip keys`), key handler `:549-587` (REG-475). Better: a box with no typing in it still undoes the lines | Already | — | — |
| 5 | **Collapse all / Expand all sections**: one toggle whose label and icon follow the state (§1) | Only for View-by buckets: toolbar `Collapse All` `items-section.tsx:1003` (kebab `:977`), head toggle `items-table.tsx:413-419` (`view !== 'none'`) | **Build** | B2 | Yes |
| 6 | View by · Maison AI · Create ▾ · Preview (§1) | `items-section.tsx:1004-1025` (Preview sits in the header; the expanded layer has its own, REG-859) | Already | — | — |
| 7 | **Template notice strip**: "Default Quote PDF prints lines by trade, so these sections don't show…" + Change template (§2) | `items-section.tsx:1036-1042`, wired at `quote-editor.tsx:482-484, 694` (REG-855). Same words. Shows only while the quote has sections; says "variation order" on a VO | Already | — | — |
| 8 | Gutter: drag handle · + · checkbox (§3, §5) | `item-row.tsx:234-250`, the mock's selection cell (1260:31209) | Already | — | — |
| 9 | Columns incl. Category and Room; ⋮ at the end (§3) | Column settings decide (REG-426 default set; Category on for Default Quote PDF, REG-861); kebab rests faint `item-row.tsx:352-361` (REG-575) | Already | — | — |
| 10 | 1px between cells, a **2px** rule after ITEM and before TOTAL (§3) | The mock's **4px**: `items-table.module.css:66` (ITEM), `:85` (TOTAL) | Keep 2.0 | The mock wins (principle 1) | — |
| 11 | Numbers tabular (§3) | Removed everywhere on the owner's word (REG-426) | **Conflict** | C5: keep REG-426 | — |
| 12 | Markup "S$x (y%)" (§3) | `item-row.tsx:158-164`; a section's sum with its % `:159` | Already | — | — |
| 13 | Two levels at most; a section moves only where it and its children stay within two (§4) | Server `items-actions.ts:141-142, 328-332`; drag `row-drag.ts:70-82`; menu targets `table-menus.tsx:139` (REG-558) | Already | — | — |
| 14 | Nested numbering 1 · 1.1 · 1.1.1 (§4) | `lib/quotes/math.ts:199-212` (REG-558, in position order REG-571) | Already | — | — |
| 15 | Chevron first in the row, turns −90° when folded (§4) | The fold after the name, up / down glyph `item-row.tsx:294-300` (mock 1260:31357) | Keep 2.0 | The mock wins | — |
| 16 | Click the name to rename; Enter commits, Esc cancels, blur commits; a new section opens with its name selected (§4) | The name is always an in-place cell `cell-input.tsx:44-67` (blur commits, Esc drops the draft); Enter commits by moving down (REG-475); new rows take the caret with the words selected `items-section.tsx:385` (REG-573) | Already | "New sub-section" as a sub-section's first name comes with B3 | — |
| 17 | Badge "Section" / "Sub-section" (§4) | `item-row.tsx:275` (REG-567), the DS outlined blue Tag (REG-445). The prototype's neutral badge is its own look | Already | — | — |
| 18 | "n items" on the section row (§4) | `item-row.tsx:283`, shown once the section holds a line (REG-463) | Already | An empty section says so on its foot row (B3) | — |
| 19 | Section row's **+ Item** (§4) | The leading + on a section adds the line first inside it, opening a folded section `items-section.tsx:592-598` (REG-441); the edge + under the section row does the same (REG-527) | Already | — | — |
| 20 | Section row's **+ Sub-section** (top level only) (§4) | No way to start an empty sub-section. Sub-sections only come from *Section with n items* on lines inside a section, or from moving a section into another | **Build** | B3: ⋮ › *Add sub-section* on a top-level section + the foot row's *+ Add sub-section* | Yes |
| 21 | **Ungroup** and **Delete** as hover icons on the section row (§4) | In ⋮: *Ungroup — keep the lines* `table-menus.tsx:226`, *Remove* `:228` with a confirm that counts the lines and points to Ungroup `items-section.tsx:1124-1126` (REG-558) | Keep 2.0 | A remove one hover-press away, with no confirm, breaks principles 4 and 12 (nothing on hover alone). The kebab already rests visible (REG-575) | — |
| 22 | Subtotals **In header**: the section row carries Cost, Markup (S$ + %), Total, also when folded (§4) | `item-row.tsx:157-167, 222` from `groupTotals` (`math.ts:99`): the group row sums its lines in every money column, bold total (REG-415 · REG-440) | Already | It is the team's own pick | — |
| 23 | The prototype's knobs: section style Band · Heading · Tree, subtotals Footer row · Both, accent colour (props) | — | Keep 2.0 | Not built. They were knobs for comparing styles; the team picked Branches + In header. One look, no settings (principle 2) | — |
| 24 | **Branches**: guide lines in the ITEM cell (vertical through the children, rounded tee / elbow to each child, last elbow ends it, a stem under an open section, the selected row's guide in the accent); top-level section tinted, sub-section rows white (§4) | Today a 4px bar on section and child rows (`items-table.module.css:156`), indent 32 / 56 (`:162`, `:374`), section band (`:34`, REG-440), sub-section a lighter band (`:375`, REG-558), **children on a light blue tint** (`:33-35`, REG-457) | **Conflict** | C1. Recommended: build the guides (B11), drop the child tint and the child's bar, keep the section bands | Yes |
| 25 | **The add row at the end of an open section**: "Nothing in {section} yet —" when empty, then + Add item · + Add sub-section (top level) · Catalogue · Paste lines; adds go to the END of that section (§4) | None. The one Add Item row sits at the end of the table `items-table.tsx:452, 521-656`. Inside a section you add with the leading + (top of it) or the edge + under a line | **Build** | B3. Catalogue → *Price book* (REG-662) | Yes |
| 26 | A refused move keeps its place (§4 depth rule) | `row-drag.ts:145` keeps the last good slot; server throws on a bad parent | Already | — | — |
| 27 | **Insert dot on a row's TOP edge**, inserting above that row (§5) | The edge + rides the row's **bottom** edge at the pointer's x and adds below (inside, on a section) `item-row.tsx:230-233` (REG-527: the owner "remove the top one") | **Conflict** | C2: keep REG-527 | — |
| 28 | Drag handle, tooltip "Drag to move" (§5) | `item-row.tsx:235-240` "Drag to reorder" | Already | — | — |
| 29 | The gutter's **+ opens an Add menu** instead of adding (§5) | The + adds at once: below, or first inside a section (mock 1260:31209 "add (insert below)", REG-441) `item-row.tsx:241-245` | **Conflict** | C3. Recommended: keep the one-press +; the menu's rows go into ⋮ › Add Item › (B5) and onto the foot row (B3) | — |
| 30 | Add item above · below · at the top of a section (§5) | ⋮ › Add Item › Above · Below `table-menus.tsx:149-156`; on a section "Below" = first inside (REG-441) | Already | B5 renames the section's "Below" to *At the top of the section* | Yes (words) |
| 31 | **Add several**: stepper 2…50, default 5, Above / Below (section: At the top) (§5) | None | **Build** | B5 (house `CountStepper`) | Yes |
| 32 | **Add from catalogue…** from a row, landing at that row (§5) | ⋮ › Add Item › *From Price book, below…* opens the **Add Item dropdown** with a place line (`items-section.tsx:617-625`, REG-653 · REG-773); the Price book modal has no place and sends items to their trade's section (`items-section.tsx:436-464`, UX audit Q7) | **Build** | B6: the Price book modal takes a place | Yes |
| 33 | **Paste lines…** from a row (§5) | The paste dialog opens only on a clipboard paste of a block (`items-table.tsx:369-375`, REG-476) | **Build** | B5 + B7 | Yes |
| 34 | The menu opens upward near the bottom, Esc closes, focus on the first row (§5) | `PortalMenu` (flips, Esc, outside press, first row focused); in-place drill-downs `useLevelFocus` `table-menus.tsx:22-30` | Already | — | — |
| 35 | Checkbox per line (§5) | `item-row.tsx:247-249`, Shift-click runs (REG-475) | Already | — | — |
| 36 | Thumbnail well (§6) | `item-row.tsx:256-268`, the house square (REG-820); none on sections (REG-856) | Already | — | — |
| 37 | Name, one-line description (§6) | In-place cells; description lines follow density (REG-433 · REG-481) | Already | — | — |
| 38 | "Below cost" tag in red; unit price and total in red (§6) | `item-row.tsx:139, 215, 280, 337` (REG-623 · REG-859). Better: the rule counts the line discount (`math.ts:61-65`) and shows only while the Cost column is on, so a screen turned to the client never says it | Already | — | — |
| 39 | Row menu: Duplicate (§6) | `table-menus.tsx:209`; the copy lands under the original and pulses `items-section.tsx:640` | Already | — | — |
| 40 | Row menu: **Move to section ›** listing sections by path ("Kitchen › Cabinetry"), "No other sections yet", "Move out of section" (§6) | `table-menus.tsx:163-173`: names only (a sub-section has a lighter folder glyph), *No section* to leave, *No sections yet* | **Build** | B9: a sub-section's row names its parent ("in Kitchen", the Jump to list's line, REG-862). *No section* stays (REG-567) | Yes |
| 41 | "Delete line" in red (§6) | *Remove* in red, with a confirm (REG-410 · REG-558) | Keep 2.0 | The house word | — |
| 42 | A new blank line opens with its name focused (placeholder "Name this line") (§7) | New lines are named "Item" with the word selected, so typing replaces it (REG-573); placeholder "Type item name" | Already | Keep 2.0's words | — |
| 43 | **Enter adds another**: on a just-added line Enter commits the name and opens the next line below, carrying Category, Unit and Room; Enter on an empty chained line removes it and stops; hint "Enter adds another · Esc to finish" (§7) | Enter walks down the column (REG-475, `items-table.tsx:388`). The chain exists only in the Add Item field at the table's end (REG-573) | **Conflict** | C4. Recommended: build, only on a line an add press just made (B10) | Yes |
| 44 | New and moved lines flash (§7, §9) | `attention()` `items-section.tsx:371-390`, `data-fresh` `items-table.module.css:50-51` (REG-573) | Already | Every new path must call `attention()` | — |
| 45 | Head checkbox selects every item line and *clears* when any are ticked (§8) | Selects every row, sections too; shows part-ticked; a press on part-ticked ticks all `items-table.tsx:420`, `items-section.tsx:1074` (REG-443, the listing's rule) | Keep 2.0 | C5 | — |
| 46 | Bulk **Group into section / Group into sub-section**, disabled with the reason (§8) | Bulk *Section* `items-section.tsx:1114` → `groupQuoteItems` (`items-actions.ts:346-369`): lines in one top section → a sub-section there, mixed → a top section at the first line's place. **Bug:** lines that sit in a sub-section go to a new top section at the *end of the quote* (`:356-358`; its own comment says "beside") | **Build** | B8: the label says the level; lines in a sub-section are refused with the rule | Yes |
| 47 | Bulk **Move into ▴**: a list of sections by path (§8) | None (only the one-line ⋮ › Move to section) | **Build** | B8: *Move to section* on the bar, with its menu | Yes |
| 48 | Bulk **Move out**: only when every ticked line is in a section; each lands just after its section (§8) | None | **Build** | B8: *Out of the section* at the foot of that same menu | Yes |
| 49 | "n selected", Delete, × clear, the bar slides in and out (§8) | `DetailBulkBar` `items-section.tsx:1109-1123` (count box, `snackbarRise`, scrolls inside itself on a phone) | Already | — | — |
| 50 | Group / ungroup / move / delete / paste / catalogue adds all undo with ⌘Z (§8, §12) | Every structural write snapshots first (`structural()`, `items-section.tsx:361-366`); drag `:685`, Price book adds `:451`, paste `:478` | Already | New paths go through `structural()` too | — |
| 51 | **Drag several**: a ticked line drags every ticked line with it (§9) | One row (its block) per drag `row-drag.ts:212-236` | **Build** | B4 | Yes |
| 52 | On a line: top half = before, bottom half = after, a 2px line marks it (§9) | `row-drag.ts:137-141`; 2.0 shows the slot by sliding rows apart and indenting the lifted row to the slot's depth (REG-571) | Already | — | — |
| 53 | On a section row: top 30% before · middle **into** (outline round the row; lands at the top) · bottom 30% after only when folded (§9) | Upper half before; lower half = first inside if open, **after if folded**: nothing can be dropped into a folded section `row-drag.ts:137-141` | **Build** | B4 | Yes |
| 54 | Drop on a section's add row → the end of that section (§9) | No such row | **Build** | B4 (with B3) | Yes |
| 55 | Refused drops show no mark; dragged rows dim (§9) | The last good slot is kept; the row lifts (elevation 3) and follows (REG-571: "like the payments") | Keep 2.0 | C5 | — |
| 56 | **Paste lines**: a box you type or paste into; bullets and "1." stripped (§10) | The dialog shows a block already pasted; no box to type into; bullets reach the line's name `clipboard.ts:138-178` | **Build** | B7 | Yes |
| 57 | Paste maps tab columns in a fixed order (name · qty · unit · cost); defaults qty 1, unit "Lot", cost 0 (§10) | Each column picks its field, guessed from a header row or the values' shapes `paste-items-dialog.tsx:63-80` (REG-476); qty 1, unit left empty (its "Unit · e.g. sqft" hint, REG-560), cost 0 | Keep 2.0 | 2.0's mapping is stronger; "Lot" would be invented data | — |
| 58 | Live preview: first 6 rows, "+ n more" (§10) | `paste-items-dialog.tsx:14, 126-135` — the same 6 and "+ n more rows" | Already | B7 makes it follow the typing | — |
| 59 | Catalogue panel: search, checkable rows with category and "S$x / unit", tick several, "Add n items" disabled at 0 (§10) | `PriceBookDialog` (REG-662): search, kind chips, folders, My Items + My Sections, tick order kept, price / unit, Add disabled at 0 `price-book-dialog.tsx:89-170` | Already | 2.0's is richer. Never a second catalogue | — |
| 60 | Dialog footer: **where they go**, "Above · Below" (section: "Above · At top of section"), or "Adds to the end of {section}" from a section's add row (§10) | Paste: a select "After “X”" · "At the end" `paste-items-dialog.tsx:136-141`. Price book: none, a fixed subtitle `price-book-dialog.tsx:91` | **Build** | B6 + B7: one place control, the house `Chips` in `FootStart` | Yes |
| 61 | Both panels 600 wide, a bottom sheet ≤640 (§10) | Paste 800 (REG-476, the mapping needs the width); Price book 1200 (REG-662, the Templates modal); sheets ≤767 (REG-353) | Keep 2.0 | C5 | — |
| 62 | Under the table: Subtotal · GST (9%) · Total (§11) | `ItemsSummary` (`items-summary.tsx`): entity, by-category, named discounts, GST by rate, Round Prices; plus the Sum row `items-table.tsx:461-472` | Already | — | — |
| 63 | A help line under the card ("Drag the ⠿ handle… Hover a row's top edge… Tick lines… Click any name…") (§11) | Tooltips on every control at the point of use, the ? shortcuts panel and its tips (REG-711…717) | Keep 2.0 | Not built. It is standing text for daily users, and half of it describes things 2.0 does another way (top edge, click to rename) | — |
| 64 | Touch: no insert dot, row actions always visible, targets ≥ 44 (§12) | Edge + hidden on touch `items-table.module.css:366`; kebab always on `:302-303`; boxes grown (REG-273 · REG-576) | Already | — | — |
| 65 | Menus close on Esc and an outside press (§12) | `PortalMenu` | Already | — | — |
| 66 | Phone: sections as their own cards with count and fold, lines indented (§10, §12) | `item-cards.tsx:31-135` (REG-597): tinted section cards, depth indent, sheet per line, kebab = the shared `RowMenu` as a sheet | Already | — | — |
| 67 | Phone: an add at the end of each section, and the new add rows | No per-section add; the Add Item field at the end `items-table.tsx:401` | **Build** | B3 (the foot as a button after the section's last card); B5's rows reach the phone through the shared `RowMenu` sheet | Yes |
| 68 | Phone: drag | Cards have no handle; ⋮ › Move Item › Up / Down and Move to section | Keep 2.0 | A drag on a scrolling card list fights the scroll | — |
| 69 | Phone: Enter adds another | A line edits in its sheet; the Add Item field already keeps the caret for the next line (REG-573) | Keep 2.0 | Not built | — |

**Counts:** Already 36 · Keep 2.0 12 · Build 16 · Conflict 5 (69 behaviours).

## 2. Build list (in this order)

Each step: what it does, the files, the house piece to reuse, the server change, and the probe checks that prove it. All checks go in one new
probe, `design-source/verify/sections-prototype/verify-sections.cjs` (Playwright at 1440, plus 768 touch and 390 touch where noted), with server rules in
`verify-sections-logic.ts` beside it (the shape of `quote-editor-parity/verify-qe-r1-logic.ts`). Add both to `design-source/verify/regression/probes.cjs`.
Run on a scratch DB (`DATABASE_URL=file:<scratch>/test.db` on the `next start -p 3011` line) against a seeded quote with sections (OM-10008: Kitchen ·
Bathrooms · Bedrooms, REG-415). Each step gets its own REG row, from the next free number at build time (the register ends at REG-2283 today).
Invented copy is flagged as such.

### B1 · Server groundwork (nothing visible)
- `app/quotes/items-actions.ts`
  - `createQuoteItems(quoteId, lines, place)` also takes `place.beforeId` and `place.at: 'start' | 'end'` (start = the first place in `parentId`). Today it takes only `afterId` (`:184-214`).
  - `CreateItemInput` gains `unit` (bounded like `cleanPatch`), so a chained line can carry it (B10).
  - `createQuoteItem` names a new **group inside a section** "New sub-section" instead of "New section" (`:163`). This is invented copy.
  - New `moveQuoteItems(quoteId, ids, to)`. `to` is `{ parentId, beforeId? | afterId? | at? }` or `'out'`, where `'out'` places each line just after its own section, keeping their order. It runs in one transaction and keeps the depth rules of `setQuoteItemParent` (`:322-342`). It drops ids whose ancestor is also given. A line joining a section takes that section's status, and its trade when the section stands for one (REG-855 b, `tradeOfSection` + `fetchTrades`). A refusal answers `{ error: <the rule> }`. It returns `{ updatedAt, amountMinor }`.
  - `groupQuoteItems` refuses lines that all sit in a sub-section with `{ error: 'Sections go two levels deep — these lines are in a sub-section already' }`, instead of sending them to the end of the quote (`:356-358`). Callers (`items-section.tsx:642, 851`) say the refusal through `couldnt` / `refusalOf`.
- `lib/quotes/math.ts` (pure):
  - `groupLevel(items, ids)` → `'section' | 'sub-section' | { refused: string }`, the same rule as the server.
  - `moveTargets(items, ids)` → the sections the ticked rows may join.
  - `carried(items, ids)` → the ids without those under a ticked section.
- **Probe (logic):** create 3 lines `beforeId` X, then they precede X in order. `at: 'start'` in Kitchen puts them first. `moveQuoteItems(…, 'out')` puts each just after its section. A section holding sub-sections is refused when sent into a section. Lines in a sub-section are refused by `groupQuoteItems` with the rule. `groupLevel` matches the server on all four cases (top lines, one section, mixed, sub-section).

### B2 · Collapse All / Expand All for sections (behaviour 5)
- `items-section.tsx`: the toolbar's `Collapse All` (`:1003`) and the folded kebab's row (`:977`) also show in View by: None while the quote has sections. Each is a toggle: *Collapse All* while any section is open, *Expand All* when all are folded. Collapse folds every top-level section; Expand opens every section and sub-section. It is one snapshot plus `patchItem(id, { collapsed }, { snapshot: false })` per section, the fill's pattern (`:518-527`). One ⌘Z undoes it.
- `items-table.tsx:413-419`: the head's fold toggle shows for sections too in View by: None (`expand_all` / `collapse_all`, already in the icon subset).
- House pieces: the existing DS outlined `Button`, `IconButton` + `Tooltip`.
- **Probe:** press *Collapse All*. Every section's fold reads `aria-expanded="false"`, no line row shows, and the button reads *Expand All*. Press again and every line is back. ⌘Z after a collapse restores the open state. The head toggle does the same. At View by › Category the bucket behaviour is unchanged.

### B3 · The section's foot row and Add sub-section (behaviours 18, 20, 25, 67)
- `items-table.tsx` `buildDisplay` (`:99-141`): after the last row shown under an **open** section (or sub-section), add a display row `{ kind: 'foot', sectionId, depth, empty }`. It applies in every view; a folded section has none. While Find has a query, no foot rows show (`shown`, `:268-272`). `columnTexts` (`:53-90`), the drag rows (`:312-315`), the phone mapping (`:398`) and the Jump to list skip `foot`.
- A new `SectionFoot` row in `items-table.tsx` built on the `SumRow` cell skeleton (`:461-472`), so the frozen block and the columns stay aligned. Its content sits in the ITEM cell at the children's indent: "Nothing in {name} yet —" when empty (invented copy) · *+ Add item* · *+ Add sub-section* (top level only) · *Price book* · *Paste lines* (invented copy for the last). Use the Add Item row's link buttons (`styles.link`, `:649-652`) at a 44 height, with no number and `data-section-foot={id}`. It has no `data-item-id`, so the keyboard grid skips it (`grid-keys.ts:18`).
- `items-section.tsx`:
  - *+ Add item* → `create({ parentId: section }, true)`. The line lands last in the section, takes the caret and pulses (REG-573), and starts a chain (B10).
  - *+ Add sub-section* → `createQuoteItem(quoteId, { kind: 'group', parentId: section })` + `attention([id], { focus: true })`.
  - *Price book* → B6 with the fixed place "Adds to the end of {name}".
  - *Paste lines* → B7 with the same place.
- `table-menus.tsx` main level: on a top-level section, *Add sub-section* under *Add Item ›*. It reaches the phone sheet as-is.
- `item-cards.tsx`: after an open section's last card, a DS text `Button` "Add to {name}" (invented copy). It opens a sheet of the foot's four choices: the house `PortalMenu` with `sheetTitle`.
- **Probe:** OM-10008's Kitchen shows `[data-section-foot]` right after its last line, and none while folded. *+ Add item* makes a line that is Kitchen's last child, its name focused with "Item" selected, `data-fresh` set. *+ Add sub-section* makes "New sub-section", tagged Sub-section, with its name selected and its own foot reading "Nothing in New sub-section yet". Find "tile" shows no foot rows. Tab from the last line's last cell skips the foot. At 390 "Add to Kitchen" follows Kitchen's last card and its sheet offers the four. The 1440 column x positions are unchanged (the fit ignores feet).

### B4 · Drag: into a folded section, onto a foot, several ticked lines (behaviours 51, 53, 54)
- `row-drag.ts`:
  - `DragRow` gains `kind: 'foot'` (its `parentId` = the section). The slot on a foot is `{ parentId: section, anchorId: footId, where: 'end' }`, and `targetIndex` places the block just above the foot.
  - Section rows split 30 / 40 / 30. The top band means before. The middle means **into** (first place, open or folded). The bottom band means after when folded, into when open. An into-a-folded-section slot marks the row `data-drop-into`, drawn as a 2px inset `--om-color-primary-default` ring in `items-table.module.css`; nothing slides then.
  - `start(id, e, carried?)`: when the pressed row is ticked and more are ticked, the block stays the pressed row's. The other ticked rows (`carried()`, B1) wear `data-carried` (dimmed with `--om-color-on-surface-disabled` ink, no lift). The lifted row shows a count chip ("3 lines", house `MetaChip`). `valid()` checks every carried row's depth rule.
- `items-section.tsx` `commitDrag` (`:657-707`): `where: 'end'` → `at = sibs.length`. With carried rows the drop calls `moveQuoteItems` (B1) once, after one snapshot. The snackbar reads "3 lines moved into “Kitchen”" with Undo (`restore(before, true)`), and every moved row pulses.
- **Probe:** drag a Bathrooms line onto folded Kitchen's middle: `data-drop-into` shows, on release the line is Kitchen's first child (read after Expand), ⌘Z puts it back. Drag onto Kitchen's foot and the line is Kitchen's last child. Tick 3 lines across two sections, drag one onto Bedrooms' middle: all three land first in Bedrooms in table order, one ⌘Z returns all three. Dragging a section that holds sub-sections onto another section's middle keeps the last good slot. Repeat the folded-section drop with a synthetic touch pointer at 768.

### B5 · ⋮ › Add Item › gains Several, Price book and Paste lines (behaviours 29 → C3, 30, 31, 33)
- `table-menus.tsx` `sub === 'add'` (`:149-156`) becomes:
  - *Above*
  - *Below* (on a section: **At the top of the section**)
  - *Several…* ›
  - divider
  - *From Price book…* (was "From Price book, below…")
  - *Paste lines…*
- *Several…* drills down in place (`useLevelFocus`). It holds a back row, a stepper row (`CountStepper` from `components/credits/count-stepper.tsx`, min 2 · max 50 · default 5, words "Fewer lines" / "More lines"), then *Add {n} above* · *Add {n} below* (on a section: *Add {n} at the top*). Promote `CountStepper` to `components/om/count-stepper.tsx` and re-export it from the credits path, so the stylesheet stays one.
- `lib/quotes/items-model.ts` `RowMenuAction`: + `addSeveral` (with `{ n, where }`), `addFromBookHere`, `pasteHere`.
- `items-section.tsx` `onMenu` (`:626-651`):
  - *Several* → `createQuoteItems(quoteId, n × { name: 'Item' }, place)` through `structural`, then `attention(before, { focus: true })` on the first new line.
  - *From Price book…* → B6 with Above / Below.
  - *Paste lines…* → B7 with Above / Below.
- **Probe:** on Kitchen's 2nd line, ⋮ › Add Item › Several… shows 5. Press + twice for 7, then *Add 7 below*: 7 lines follow that line inside Kitchen, the first's name is focused, all 7 pulse, and one ⌘Z removes the 7. On Kitchen's row, *Add 5 at the top* makes Kitchen's first 5 children. The stepper refuses at 2 and at 50 (disabled +/−). At 390 the same rows show in the row menu's sheet.

### B6 · The Price book modal takes a place (behaviours 32, 60)
- `price-book-dialog.tsx`: an optional `place` prop, either `{ anchorName, options: ('before' | 'after' | 'start')[], value, onChange }` or `{ fixed: 'Adds to the end of Kitchen' }`.
  - The footer's left side (`FootStart`, `components/om/dialog.tsx`) holds the house `Chips` (single) *Above · Below*, or *Above · At the top of the section*, or the fixed line.
  - The subtitle names the place ("…it goes in below “Tiling”, in the order you tick it").
  - Without `place`, everything stays as today (the strip's tile, Create ▾, the table's link).
- `items-section.tsx` `addFromBook` (`:436-464`): when a place is given, items land there in tick order, each after the previous new one. Trade routing (UX audit Q7) applies only without a place. Saved sections land after the place's top-level section (the `afterTop` rule of REG-653 / sweep S5 #13).
- *From Price book…* on a row and *Price book* on a foot open **this modal** (REG-662: a press on "Price book" opens the modal). The Add Item field's typed dropdown stays (REG-662) and loses its place line (`bookPlace`, `items-section.tsx:261, 617-625`; `items-table.tsx:601-606, 630`). That changes REG-653's surface, not its rule: a pick still lands where the row asked.
- Update `design-source/verify/ui-sweep/verify-sw-r5.cjs:195-202` and `price-book-parity/verify-pb-r3.cjs:201-202` to read the modal's place.
- **Probe:** ⋮ › Add Item › From Price book… on "Tiling" opens `[data-testid="price-book-dialog"]` with *Below* on. Tick 2 items, then Add: both follow "Tiling" in tick order, pulse, and ⌘Z removes both. Switch to *Above* and they precede it. From Kitchen's foot the footer reads "Adds to the end of Kitchen" and the items are Kitchen's last two. From the toolbar's Create ▾ › From Price book there is no place control and items still route to their trade's section.

### B7 · Paste lines: a box to type into, bullets stripped, the same place control (behaviours 33, 56, 58, 60)
- `paste-items-dialog.tsx`: when opened from a menu or a foot (`typed`, no clipboard text), a DS `TextArea` (via `@/components/ds`) heads the body. Its label: "Lines: one item per line; columns from a spreadsheet keep their order" (invented copy). The rows are `parseBlock(draft)`, live. The mapping heads and the 6-row preview follow the typing (`:63-80, 126-135` unchanged). *Add n items* is disabled at 0 (`:108`).
- The place: the "Add" select (`:136-141`) becomes B6's `Chips` in `FootStart`: *Above · Below*, *Above · At the top of the section*, the fixed "Adds to the end of {name}", or for a clipboard paste *After “X” · At the end* (today's two). The clipboard paste path (REG-476) stays as is.
- `lib/quotes/clipboard.ts` `toLines` (`:138-178`), the `name` case: strip a leading `•`, `-`, `*`, `·`, `1.` or `1)` and the space after it.
- `items-section.tsx` `addPasted` (`:474-479`): the place maps to `createQuoteItems`' `afterId` / `beforeId` / `at` (B1).
- **Probe:** ⋮ › Add Item › Paste lines… on a Kitchen line opens the dialog with an empty box and Add disabled. Typing "• Hacking\t1\tlot\t1200⏎2. Plastering\t2\tlot\t300" previews 2 rows named "Hacking" and "Plastering". *Below* + Add puts both after that line and one ⌘Z removes them. A clipboard paste of a block still opens the mapping with *After “X” · At the end*. A logic check: `toLines` strips the five bullet forms and leaves "1.5 m skirting" alone.

### B8 · The bulk bar: Group into, Move to section, Out of the section (behaviours 46, 47, 48)
- `items-section.tsx` `DetailBulkBar` actions (`:1111-1121`):
  - *Section* becomes **Group into section** or **Group into sub-section**, by `groupLevel` (B1). A refused level still presses: the snackbar says the rule (principle 5), and the server refuses too.
  - New **Move to section**: its press keeps the bar button as the anchor (the click event's `currentTarget` into a ref) and opens a `PortalMenu` (`sheetTitle` on a phone). The menu lists `moveTargets` (B1), a sub-section with `help="in {parent}"`. When every ticked line sits in a section, a divider and **Out of the section** follow. A pick → `moveQuoteItems` through `structural`, with the snackbar "3 lines moved into “Kitchen”" / "3 lines moved out of their sections" and Undo, and `attention(ids)`.
- `table-menus.tsx:211`: *Section with n items* says *Sub-section with n items* when that is the result. When refused it is disabled with the rule as its `help` line (the house menus' "say why in the row").
- **Probe:**
  - Tick 2 top-level lines: the bar reads *Group into section*; press it and a new section holds them with its name selected.
  - Tick 2 lines in Kitchen: the bar reads *Group into sub-section*.
  - Tick 2 lines in a sub-section: the press answers the rule and nothing moves.
  - *Move to section* › Bedrooms: the ticked lines are Bedrooms' last, and ⌘Z restores.
  - *Out of the section* with lines from Kitchen and Bathrooms: each sits right after its own section.
  - At 390 the bar scrolls inside itself (REG-358) and its menu is a sheet.

### B9 · Move to section names a sub-section's parent (behaviour 40)
- `table-menus.tsx:166-170`: a sub-section's row carries `help={`in ${parent.name}`}`, the Jump to list's line (`items-section.tsx:915`, REG-862). *No section* and *No sections yet* stay.
- **Probe:** with two sub-sections both named "Cabinetry" (in Kitchen and in Bedrooms), ⋮ › Move to section shows "Cabinetry · in Kitchen" and "Cabinetry · in Bedrooms".

### B10 · Enter adds another, on a line an add press just made (behaviour 43; after C4)
- `items-section.tsx`: state `chain: string | null`. It is set when `create(…, true)` runs from an add press: the leading +, the edge +, the foot's *+ Add item*, *Add Item › Above / Below*, or Create ▾ › New Item. Any other focus leaving that name clears it.
- `items-table.tsx` `onGridKey` (`:380-393`): Enter in `input[data-name]` of the chained row calls `h.onChainEnter(id, value)` before the grid's walk. Every other Enter is REG-475's.
- `onChainEnter`:
  - A typed name: blur commits it, then `create({ parentId, afterId: id, category, unit, room }, true)` (B1's `unit`). The new line becomes the chain.
  - An untouched line (still "Item", nothing else edited): it is removed through `structural` with no confirm, the chain ends, and the caret goes back to the line above's name.
- `cell-input.tsx` `TextCell` (`:44-67`) gains an optional `onEscape`. On the chained line Esc keeps the typed name and ends the chain; an untouched chained line goes as with Enter. Elsewhere Esc drops the draft (REG-417).
- `item-row.tsx`: a `chained` prop puts the hint in the description line while the name holds the caret: `Keys spec="enter"` "adds another" · `Keys spec="esc"` "to finish" (house `components/om/keys.tsx`; invented copy). The Expand icon (REG-478) hides then.
- **Probe:**
  - Kitchen's foot *+ Add item*, type "Tiles", Enter: "Tiles" is kept and a new "Item" line follows it inside Kitchen, focused, with Tiles' Category, Unit and Room.
  - Enter on that untouched line removes it, and the caret is in "Tiles".
  - Enter in an existing line's name still moves to the next line's name (REG-475 unchanged).
  - The hint `[data-testid="chain-hint"]` shows only on the chained row.
  - One ⌘Z per added line.

### B11 · Branches: guide lines show the tree (behaviour 24; after C1)
- `items-table.tsx` `buildDisplay`: each row gets `guides: boolean[]` (per ancestor level, whether that ancestor's branch goes on below this row) and `branch: 'tee' | 'elbow'`. A foot row counts as its section's last child, so it ends the branch.
- `item-row.tsx`: on child rows a `<span className={styles.guides} data-branch data-guides aria-hidden>` replaces `.groupBar` (`:253`). Section rows keep the bar and gain the stem under them while open.
- `items-table.module.css`: the lines are 1px `--om-color-on-surface-border`, the elbow's corner `--om-radius-1`, each level at the indent's midpoint (32 / 56, `:162`, `:374`). A ticked row's own guide is `--om-color-primary-default`. Drop `.row[data-child]`'s tint (`:33-35, 92, 281`); keep the section bands (`:34`, `:375`). Guides hide on the lifted block while dragging (REG-571's depth cue already says where it lands).
- Phone: no change; cards keep their indent and the tinted section cards.
- **Probe:** for Kitchen with 3 lines and a foot, the lines show `data-branch="tee"` and the foot `elbow`. A child row's background equals `--om-color-surface-default` and a section row's equals the band. Ticking a line turns its guide to the primary colour. The 1440 column positions are unchanged, and `design:anatomy` passes.

### B12 · Close-out
- REG rows (B1–B11), each with its source (`user-directed` · `invented copy` · `bug fix` for B1's sub-section grouping). Shots banked under `design-source/verify/sections-prototype/` at 1440 · 768 touch · 390 touch.
- `npm run design:lint` (no rise over `design-lint.baseline.json`), `npm run design:anatomy` on the scratch DB, `npx tsc --noEmit`, `npx eslint app components lib`.
- The regression lanes for every probe that opens the Items table: `qe-r1…r5`, `pb-r3`, `pb-modal`, `sw-r5`, `uat-dane-2026-10-01/P3` (it reads `[data-group]`, which stays), and the new `sections`. No data change: no repair rule and no baseline write.

## 3. Calls for Vicky

**C1 · Branches against the children's blue tint (REG-457, REG-440's child half).** On 2026-09-16 you gave a section's lines a lighter blue so
"its child items" show "which group it belongs to". The prototype's guide lines do that job exactly: a line that runs from the section and ends at
its last line, with sub-sections branching inside. With them the lines sit on white and the next section's band stands out more. *Recommendation:*
build the guides (B11). Remove the children's tint and their 4px bar. Keep the section band and the sub-section's lighter band (REG-440 · REG-558: blue
marks the row that sums), and keep the blue Section tag (REG-445).

**C2 · Insert dot on the top edge (prototype) against the bottom edge (REG-527).** You chose "at the bottom only and remove the top one" on
2026-09-18. Each gap between rows is reachable either way: a row's bottom edge is the next row's top. Each choice also leaves one gap. With the
bottom edge you can't add a top-level line between two sections; with the top edge you can't add at the end of a section. B3's foot row now covers
the end of a section. *Recommendation:* keep REG-527. A top-level line between sections stays one press away in ⋮ › Add Item › Above on the next
section.

**C3 · The gutter's + opens a menu (prototype) against + adds at once (mock 1260:31209 "add (insert below)", REG-441).** If the + became a menu,
the same glyph would do two things on one row: the edge + adds and the leading + opens a menu. That is the kind of drift the 2026-09-29 consistency
programme removed. It would also cost the most common add a second press. *Recommendation:* keep the one-press +. The menu's extra rows (Several…,
From Price book…, Paste lines…) go into ⋮ › Add Item › (B5), and a section's foot row (B3) shows them where they're most needed.

**C4 · Enter adds another (prototype) against Enter walks the column (REG-475) and Esc drops the draft (REG-417).** The spreadsheet Enter stays
for every line. Only a line an add press just made keeps chaining, and there Esc keeps what was typed. *Recommendation:* build it with that scope
(B10). It is the fastest way to type a section's lines in. Its hint names both keys, so nobody is surprised.

**C5 · Small look and behaviour differences, all kept as 2.0 has them.**
- Tabular figures: REG-426, your "no tabular figures".
- Dimmed dragged rows and no mark on a refused drop: REG-571's lift, slide and last good slot, "like the payments".
- The chevron first in the row: mock 1260:31357.
- 2px rules: the mock's 4px after ITEM and before TOTAL.
- 600-wide panels: REG-476's 800 for the column mapping and REG-662's 1200 Price book.
- A head checkbox that clears on a partial tick: REG-443, the listing's rule.
- A neutral badge: REG-445.
- Unit "Lot" for pasted lines: REG-560, an empty unit with its hint.
- "Delete line": REG-410's *Remove*, with its confirm.
- The standing help line: tooltips at the point of use and the ? panel, REG-711…717.

*Recommendation:* keep 2.0 on all of them. None of these changes what the team's improvements do.
