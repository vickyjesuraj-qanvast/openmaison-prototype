# The team's "Quote items — sections prototype" (received 2026-10-15)

Source: an HTML prototype the owner attached on 2026-10-15 ("shared by the team who made very good improvements and I want you to go
through and do those changes as well"). This file is the written spec of everything it does, read from its template and script — the builder
works from this, in 2.0's design system (`--om-*` tokens, house pieces, the listing's table model), **not** the prototype's own look (Geist,
6px radius, indigo accent are the prototype's; ours are the DS's). Adopt the behaviours and structure; keep what 2.0 already does better.

Its props (the knobs the team exposed): **section style** Band · Heading · Tree · **Branches (default)**; **subtotals** **In header
(default)** · Footer row · Both; accent colour. The team's pick = Branches + In header.

## 1. Toolbar (the Items card's head)
"Items (n)" (n = item lines, not sections) · Search (icon) · **New section** (folder-plus) · **Undo / Redo** (icon buttons, tooltips
"Undo ⌘Z" / "Redo ⇧⌘Z" — Ctrl+Z / Ctrl+Y off Mac — disabled when nothing to undo/redo; ⌘Z / ⇧⌘Z / Ctrl+Y work anywhere on the card
except in a text field) · **Collapse all / Expand all sections** (one toggle, label and icon follow the state) · "View by: None ▾" ·
Maison AI · Create ▾ · Preview.

## 2. The template notice strip (under the toolbar)
"ⓘ Default Quote PDF prints lines by trade, so these sections don't show on the printed quote." + link **Change template** — shown when
the quote's template ignores the editor's sections (prints grouped by trade), so the user isn't surprised by the PDF.

## 3. Columns
[gutter: insert-dot · drag handle · + · checkbox] · # · ITEM · CATEGORY · QTY · UNIT · COST · MARKUP · UNIT PRICE · ROOM · TOTAL · ⋮.
Column rules: 1px between cells, a stronger 2px rule after ITEM and before TOTAL (the identity block and the total stand apart). Numbers
tabular. Markup shows "S$x (y%)".

## 4. Sections (max two levels: Section › Sub-section › items)
- **Numbering** nested: 1, 1.1, 1.1.1 (sections and items share the scheme).
- **Section row**: chevron (collapse/expand, rotates −90° when collapsed) · name as a button (**click to rename inline** — Enter commits,
  Esc cancels, blur commits; a new section opens in rename with "New section" / "New sub-section" selected) · a badge "Section" /
  "Sub-section" · "n items" count · hover/focus actions: **+ Item**, **+ Sub-section** (top level only), **Ungroup** (icon, tooltip
  "Ungroup — keep its lines": the section goes, its lines stay in place), **Delete** (icon, tooltip "Delete section and its lines").
- **Subtotals "In header"**: the section row carries its Cost, Markup (S$ + %), Total; a collapsed section always shows them. ("Footer
  row" = a "<Section> subtotal" row after its lines; "Both" = both.)
- **Branches style** (the pick): tree guide lines in the ITEM cell — a vertical line through the section's children, a tee/elbow connector
  (rounded corner) to each child, the last child's elbow ends the line; a short stem under an open section's chevron; the guide of a
  selected row takes the accent. Top-level section row on a light tint; sub-section rows white; neutral badge.
- **The add row** at the end of an open section: "Nothing in {section} yet —" when empty, then **+ Add item** · **+ Add sub-section**
  (top level only) · | · **Catalogue** · **Paste lines** — adds go to the END of that section.
- Depth rule: an item may sit at depth ≤ 2; a section can only move where it and its children stay within two levels (refuse otherwise).

## 5. Every row's gutter
- **Insert dot**: hovering a row's TOP EDGE shows a small "+" dot and a 2px accent line between rows — one press inserts a blank line
  there (above that row). Hidden on touch.
- **Drag handle** ⠿ (tooltip "Drag to move").
- **+ (Add items) menu**: "Add item above" · "Add item below" (on a section: "Add item at top of section") · — · **Add several** stepper
  (− n + , 2…50, default 5) with **Above** / **Below** (section: **At top**) · — · **Add from catalogue…** · **Paste lines…**. Opens upward
  near the bottom of the list. Esc closes; the first item takes focus.
- **Checkbox** (select the line).

## 6. Item rows
Thumbnail well (dashed square, picture icon) · name (click to rename) · description under it (one line, ellipsis) · "**Below cost**" tag
(red, when markup < 0) and the unit price / total in red · Category · Qty · Unit · Cost · Markup · Unit price · Room · Total · ⋮ menu:
**Duplicate** · **Move to section ›** (a sub-view: "‹ Move to section" back row, every eligible section by its path "Kitchen › Cabinetry",
"No other sections yet" when none, then "Move out of section" when inside one) · — · **Delete line** (red).

## 7. Fast entry
A new blank item opens with its name field focused (placeholder "Name this line") and a hint beside it: "**Enter** adds another · **Esc**
to finish". Enter on a just-added line commits the name AND opens the next blank line below it, carrying the line's Category, Unit and
Room; Enter on an empty chained line removes it and stops. Newly added / moved lines flash (a brief tint fading out).

## 8. Selection and the bulk bar
Header checkbox selects every item line (and clears when any are selected). A dark bar slides up at the bottom (sticky) when lines are
selected: "**n selected**" · **Group into section** (or "Group into sub-section" when the lines sit inside a section) — disabled with a
tooltip saying why: "Pick lines from the same level to group them" / "Sections go two levels deep at most"; grouping makes a new section in
place of the first selected line and opens it in rename · **Move into ▴** (a list of eligible sections by path) · **Move out** (only when
every selected line is inside a section; each goes just after its section) · **Delete** · × Clear selection. The bar slides out when the
selection empties.

## 9. Drag and drop
Drag the handle; if the line is selected, all selected lines move together. Drop targets: on an item row — top half = before, bottom half =
after (a 2px accent line); on a section row — top 30% = before, middle = **into** (outline round the row; adds at the top of the section),
bottom 30% = after (only when collapsed); on a section's add row = to the end of that section. Refused drops (depth, into itself) show no
indicator. Dragged rows dim; moved rows flash.

## 10. The two panels (a 600px dialog; a bottom sheet ≤640px)
- **Paste lines** — "Each line becomes an item. Spreadsheet columns map to item · qty · unit · cost." A textarea (placeholder shows
  examples); each non-empty line = one item; tab-separated columns = name · qty · unit · cost (bullets / "1." stripped; qty defaults 1,
  unit "Lot", cost 0); a live preview table (ITEM · QTY · UNIT · COST, first 6 rows, "+ n more").
- **Add from catalogue** — "Saved items keep their category, unit, cost and markup." A search box ("Search saved items, e.g. tiles"),
  a list of checkable rows (name · description · category chip · "S$x / unit"), multi-select.
- Footer for both: an **insert position** segmented control "Above | Below" (on a section: "Above | At top of section"), or, when opened
  from a section's add row, "Adds to the end of {section}" · Cancel · **Add n items** (disabled at 0).

## 11. Totals and help
Under the table: Subtotal · GST (9%) · **Total**. A help line under the card: "Drag the ⠿ handle to reorder or drop onto a section. Hover
a row's top edge for a quick insert. Tick lines to group them. Click any name to rename."

## 12. Touch and keyboard
On touch (hover: none): no insert dot; row actions always visible; buttons ≥44px. Menus close on Esc and on any press outside. Every action
is undoable (⌘Z), including group / ungroup / move / delete / paste / catalogue adds.
