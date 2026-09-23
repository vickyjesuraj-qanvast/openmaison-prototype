# Items table — UX audit for an aged studio owner (2026-09-23)

Owner's brief (with a screenshot of the Items table): "I still see a lot of UX and UI fixes to be made to simplify for an aged studio owner … while scrolling the item header can be sticky until it reaches the end of the container … drag and drop vertically and horizontally is not visually smooth like it is in the payments … when I add a new section it adds at the bottom and there is no auto scroll … evaluate in depth, find and report before fixing."

Nothing below is built yet. Each finding names what happens today (measured on the production build, 1440×1024, OM-10008), why, and the fix proposed; the ones that change a rule the owner set earlier are marked **needs your word**.

## 1. What was measured

| Fact | Measured |
|---|---|
| Table height for 22 lines | 1,924 px (the page scrolls, not the table) |
| After scrolling 700 px | section head at −51 px, column heads at 17 px — both gone under the sticky tab strip (ends at 124 px) |
| Sideways scrollbar | 1,924 px below the column heads; the table overflows sideways by 235 px |
| Row menu ⋮ and the edge "+" at rest | opacity 0 (hover only) |
| Drag handle | 20 × 20 px, the browser's own HTML5 drag (`draggable`) |
| New section with nothing ticked | appended as the last row, 2,529 px down, out of view; focus stays on the toolbar button; no scroll, no highlight — the snackbar is the only feedback |

Probe: `items-evidence.cjs` (scratchpad); screenshot `verify/items-evidence-after-new-section.png`.

## 2. Findings and proposed fixes

### A · Orientation while scrolling (the owner's first point)

**A1 · The section head and the column heads scroll away.** Cause: the column head sits inside the sideways scroller (`overflow-x: auto`), and CSS `position: sticky` can only stick to the nearest scrolling ancestor — that scroller, which never scrolls vertically. Fix: lift the head row out of the scroller into its own sticky bar under the section head (top = header 76 + tab strip 48 + section head 69), mirror the body's sideways scroll on it (both ways), and keep the frozen ITEM / TOTAL blocks in step. The section head (title + toolbar) sticks at 124 px inside its card; both release when the card's end scrolls past — CSS sticky's own behaviour, no code. In the full-page Expand the head sticks inside the card's own scroller; ≤767 the offsets follow the tab strip at 0.

**A2 · The sideways scrollbar is out of reach.** With 22 lines it sits two screens down; a trackpad swipe or Shift+wheel is the only way across. Fix: a thin sticky scrollbar at the bottom of the viewport while the table is on screen, synced with the body both ways (the sheet-app pattern). Optional: the house edge pagers (`ScrollPagers`) at the viewport's mid-height.

### B · Drag and drop (the owner's second point; "like the payments")

**B1 · Rows.** Today the handle is a native HTML5 drag: the ghost under the pointer is the 20 px handle icon (not the row), a 2 px line marks the slot, nothing slides, and the order re-renders only after the server write — the row "jumps" into place. The Payment Schedule uses motion's `Reorder`: the row lifts with elevation and follows the finger or pointer, the neighbours slide aside, the order lands at once. Fix: a pointer-driven row drag for the Items table (a section drags with its lines as one block; sub-sections nested): lift + follow, siblings slide (160 ms), optimistic commit on release, the write follows, Undo as today; the window auto-scrolls when the pointer nears its edge (long tables); works with a finger. Handle hit area 32 × 44 (no visual change).

**B2 · Columns.** The head follows the pointer and the heads it passes slide, but the body's cells jump only at release. Fix: the whole column moves — every row's cell of the dragged column carries the head's transform, the passed columns slide with their heads.

**B3 · Dropping a line into another section — needs your word.** Today it is refused with a snackbar ("Drop a line beside its own siblings — use Move to section"). Proposal: allow it — dropping a line among another section's lines moves it there (the server has `setQuoteItemParent` + `reorderQuoteItems`); the snackbar goes.

### C · Feedback after an action (the owner's third point)

**C1 · New section lands out of view.** Toolbar "New section" and Create ▾ › New section append at the end; the eye has nothing to look at. Fix: scroll the new row to the centre of the screen, put the caret in its name with the words selected (typing replaces "New section"), and pulse the row for a second.

**C2 · The same for every add.** "Section with n items" (focus + select the name), an inserted saved section and pasted lines (scroll to the first new row + pulse), "Add item below" and the leading "+" (they focus already; add the pulse), Duplicate (scroll to the copy + pulse), Move up / down (pulse the moved row).

### D · What an aged owner would trip on (found on the screen)

**D1 · Two things called Section — needs your word.** The row tag SECTION (a section) and the SECTION column ("Add Section ▾", a free label, the mock's column 1271:41169). View by already says "Section label". Options: (a) the column head reads SECTION LABEL and its empty cell "Add label" — one step from the mock's word; (b) keep as is.

**D2 · The section row's total caption reads as a stray word.** Your screenshot shows "test" under S$13,050.00 — it is the sub-total label (REG-555, T-3) with no cue. Fix: "prints “test”".

**D3 · Hover-only controls — needs your word.** The ⋮ menu and the edge "+" appear only under the pointer (your calls, REG-446 / REG-527). An owner who does not hover finds no menu. Proposal: a faint ⋮ at rest on every row (40 % opacity), full on hover; the edge "+" stays hover-only.

**D4 · Small targets.** The handle (20 px), the edge "+" (22 px), the eye and the fold (20 px) are under the 24 px an older hand needs. Fix: 32 × 44 hit areas around them, no visual change (the touch rule REG-273 already does this ≤1024).

**D5 · Icon-only toolbar buttons — optional.** Search, undo, redo, column settings, row density and expand are icons with tooltips (the mock 1271:41169 draws them so). If you want words: "Columns" and "Rows" labels on the two settings buttons at ≥1280.

**D6 · Two counts.** "Items (24)" counts every line; the sum row's "19 items" counts the priced ones (words, optional and declined lines leave it). Fix: the sum row says "19 priced items".

**D7 · Section rows carry "Add Category ▾ · Add Section ▾"** — labels for the section's bucket, shown as prompts on every section row. Proposal: muted until hover on section rows only. Small; optional.

### E · Consistency with the Payment Schedule
The schedule's rows lift and slide (motion `Reorder`, REG-418); the Items table's rows use the browser's drag. B1 brings the two together; B2 gives the column drag the same feel.

## 3. Proposed order and size

1. A1 sticky section head + column heads, A2 sticky scrollbar — medium (the table's structure changes; frozen columns and five widths to re-verify).
2. B1 row drag with auto-scroll and the 44 px handle, B2 column follow — medium-high (a new drag hook over nested sections). B3 only with your word.
3. C1–C2 scroll · focus · pulse on every add — small.
4. D2, D4, D6 — small. D1, D3, D5, D7 with your word.

Everything ships with a probe (`verify-items-ux.cjs`) at 1440, the drawer widths and 390, and a REG entry per group.

## 4. Status (2026-09-23, the owner's "go ahead" on the recommendations)

| Item | Decision | Built as |
|---|---|---|
| A1 sticky section top + column heads · A2 sticky sideways scrollbar | build | REG-570 (`section-card.tsx sticky`, `.headBar`, `SideScrollbar`, `components/om/use-stuck.ts`) |
| B1 pointer row drag · B3 drop into another section | build · yes | REG-571 (`items/row-drag.ts`, `commitDrag`) |
| B2 column drag's body follow | build | REG-572 (`components/om/column-drag.ts` `--col-dx`) |
| C1 · C2 attention after every add | build | REG-573 (`attention()` in items-section.tsx) |
| D1 SECTION → SECTION LABEL | yes | REG-574 |
| D2 sub-total caption · D4 hit areas · D6 "priced items" | build | REG-576 |
| D3 faint ⋮ at rest | yes | REG-575 |
| D5 word labels on the toolbar icons | not now | — |
| D7 muted label prompts on section rows | not asked | — |

Measured after (the probe, 47 checks green at 1440 / 768 touch / 390 touch): the section top holds at 124 and the heads at 192 after 700 px of scroll and let go at the card's end; the sideways bar sits at the viewport's bottom and its pager pans the body 235 px; a dragged row lifts (`translateY`), the rows it passes slide (−80 px), the order is written and the row pulses; a line dropped under "Bedrooms" joins it first with the snackbar naming the section; a new section lands centred (y 472) with its name selected. Screenshots in `design-source/verify/items-ux/`.
