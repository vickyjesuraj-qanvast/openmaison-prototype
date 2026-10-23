# Quotes on the move — K2's outcome (Items: P-03 · P-04 · P-07 · fixes C-03 · C-09 · Q-03)

Built 2026-10-22 in a worktree of `main` (no commit), on his "I have marked it please go ahead" over the review page
https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w — Build on every proposal and fix, the recommended answer on every question. The brief:
`…/scratchpad/rq-build/brief.md`. Staged register rows: `reg-k2.md` (REG-K2.1 … K2.13). Probe: `design-source/verify/responsive-quotes/verify-rq-k2.cjs`.

## 1 · Ledger — every id assigned to K2

| id | What it asked | Built · kept · not done | Where |
| --- | --- | --- | --- |
| **P-03** | The Items cards grow up: bigger names, the kind on the line, a sticky total, a foot with Add | **Built.** Names at 16 that wrap, "44 sqft × S$102 · Purchase" at 14, the total bold at 16; a tinted section card that folds on a tap and holds while its lines scroll; depth as a left bar; "+ Add to {section}" in one press; the pinned foot — Subtotal · GST · Total with Adjust (entity · discounts · GST · Round prices) and Breakdown (By category) — over Add section · + Add item at 48; the row ⋮ five rows + More…; the bulk bar count + Move to section · Delete · More…; no Column settings · Row density · Expand on a phone. | `item-cards.tsx` · `item-cards.module.css` · `items-touch-foot.tsx` · `items-touch-foot.module.css` · `table-menus.tsx` (`compact`) · `items-section.tsx` (the toolbar, the ⋮, the bulk bar, the foot) |
| **P-04** | The line sheet in two layers | **Built.** Item name · Quantity × Unit · Unit price beside the live Total · Kind, then *More: description, cost and markup, discount and GST, room…* that opens in place; number keypads (`inputmode=decimal`); Delete · Done pinned at 48. The same `LineFields` serve the tablet's pane. | `item-cards.tsx` (`LineFields` · `LineSheet` · `LinePane`) |
| **P-07** | Tablet: the grid shows four editable columns, the rest in a pane | **Built.** Held upright (768–1024 portrait): the cards with the 400 line pane — beside the list when the cards keep 320, else the house Drawer (non-modal) over the right edge. Held sideways (1024 landscape): the working grid Item · Qty · Unit · Unit price · Total on the tablet's own set (`TABLET_COLUMNS`, `om.items.tablet-columns` per browser), the Item column fluid, no # / + columns, no resize handles or head drag, 44 cells, a tap on the Total opens the rest in the Drawer, the internal caption under the head. | `items-layout.ts` · `items-table.tsx` · `items-table.module.css` · `item-row.tsx` (`touchGrid`) · `lib/quotes/items-model.ts` |
| **Q-03** | No full grid on a tablet; a keyboard tablet at 1025+ gets desktop | **Built** as answered: `useItemsLayout` — ≥1025 is the desktop grid, 768–1024 the cards or the working grid by orientation. | `items-layout.ts` |
| **C-01** | 768: a 62px slit to edit through | **Built** (absorbed by P-07): the cards + pane; no grid at 768 upright. | |
| **C-02** | 1024: a price edit is a 400–800px pan | **Built** (P-07): the five fit the card with no pan (the probe asserts `scrollWidth === clientWidth`). | |
| **C-03** | Every Items icon button's 44 box displaced by (−22, −22) | **Fixed.** The three module `button::after { inset }` overrides deleted; the house IconButton's centred 44 is measured with `elementFromPoint` on the card kebab, the Items ⋮ and the grid's row kebab. New design-lint rule `icon-button-overlay`. | `item-cards.module.css` · `items-table.module.css` · `items-section.module.css` · `scripts/design-lint.mjs` · `design-lint.baseline.json` |
| **C-04** | A section's chevron and kebab are the smallest targets | **Built** (P-03): the fold is the card's press; the ⋮ is the house 36 kebab. | |
| **C-05** | The sheet asks for cost and markup before the price | **Built** (P-04). | |
| **C-06** | The row ⋮ is 16 rows, Remove below the fold | **Built** (P-03): five rows + More…, on the phone's cards and the tablet's grid. | `table-menus.tsx` |
| **C-07** | The bulk bar is 726px in 372, Delete off-screen | **Built** (P-03): Move to section · Delete · More… (the rest in a sheet) ≤1024; the foot's adds step away and the totals lift above the bar. | `items-section.tsx` · `items-touch-foot.module.css` |
| **C-08** | The total 1,300px below the first card | **Built** (P-03): the pinned strip; the totals card under Adjust, By category under Breakdown; the block below the table is not rendered ≤1024. | `items-touch-foot.tsx` · `items-summary.tsx` |
| **C-09** | The discount box types at 12px in a 44 field | **Fixed.** In the Adjust form the additional and named discounts are the DS `s` field (14; 16 on iOS); the remove is the house 24 icon button. | `items-summary.tsx` (`TotalsCard touch`) |
| **C-10** | Adding a line is two taps plus a scroll under the sticky head | **Built** (P-03): + Add item / Add section / "+ Add to {section}" add in one press and open the sheet on the name; From Price book and Paste lines in the Items ⋮ (and the section's ⋮ › More… › Add Item). | |
| **C-11** | Column settings, Row density and Expand on a phone | **Built** (P-03): none ≤767; Expand nowhere ≤1024; Column settings · Row density only on the tablet's grid. | |
| **C-12** | A nested card indents by a margin and squeezes | **Built** (P-03): a 4px left bar in a full-width card. | |
| **C-13** | Three of five card texts under 14 | **Built** (P-08's scale in the Items files): 16 · 14 · 16 bold; no 12 but the group eyebrows. | |
| **C-14** | The active row's name box renders 24 | **Fixed** (P-07): the touch `:focus` rule; the probe measures 44. | `items-table.module.css` |
| **C-15** | The head's eye explains itself only in a native tooltip | **Built** (P-07): the caption under the head on the touch grid names the on-screen columns that never print, held with the heads and sticky-left under a pan. | `items-table.tsx` · `items-section.module.css` |
| **C-22** | 153px of chrome above the first card, a 166px find box | **Built**: the print note is one 44 row on a phone (the find box already took the row, sweep S1). The title's sub-line "16 lines · S$49,838" is the screen bar's — K1's (see §4). | `items-section.module.css` |
| **C-24** | Expand at 768 hides the way back | **Built**: Expand is gone ≤1024; the re-expand note after a Preview is ignored there. | `items-section.tsx` |
| **P-08** (its application here) | 16 · 14 · 44 | **Built** in every Items touch surface (cards, sheet, pane, foot, caption, print note); the Adjust form's totals card keeps its 14 values (never under 14). | |

Decisions I took (as recommended; flagged for him):
- **The checkbox stays on every card** (the mock draws none): a table's selection column never hides (the consistency audit's rule), and the bulk bar needs a way in that isn't a long-press nobody discovers.
- **Every line card keeps its ⋮** (the mock draws one only on the section): the five row actions are a thumb's reach, not a sheet away.
- **A line draws a thumbnail only when it has a picture**; the kind is a word on the line ("· Purchase"). **No description line on a card** (C-13's "off by default"); it is the sheet's first row under More.
- **"Quantity"** is the sheet's word for the grid's "Qty" — the proposal's own word, plain. Updated in the probes that typed into "Qty".
- **"+ Add to {section}" adds a line in one press**; the sub-section, the Price book and pasted lines moved one level in (⋮ › More… › Add Item). S44I's probe asserted the four-row sheet — updated as a deliberate change.
- **The pane at 768 is inline only when the cards keep 320** (a list ≥ 736 — the section screen's at 768); narrower it is the house Drawer, non-modal, the cards live beside it. Today's editor column at 768 is 646, so it is the Drawer there until K1's screen lands.
- **The tablet's grid pane is `mode="rest"`** (no Quantity · Unit · Unit price — the grid edits them); the upright tablet's and the phone's are `mode="all"`.
- **`TABLET_PORTRAIT`** (orientation) is the one literal added to the breakpoint system (REG-K2.13) — the proposal's own words.
- **The design-lint rule's baseline carries the other 19 modules at their counts** (the brief said "at 0" — the three Items files are at 0; the rule cannot tell an IconButton's `button::after` from a DS Button's in CSS, and 16 of the 19 are other packages' or other modules' files). Each lowers its own; the ones that are the same bug are listed in §4.

## 2 · Shared pieces changed

- `scripts/design-lint.mjs` — one new rule, `icon-button-overlay` (a `button::after` block that sets `inset` / an edge in a module stylesheet), and `design-lint.baseline.json` — the rule's entry: 19 files at 1 each (every one that holds such a block today, outside Items), the three Items files absent (0). `npm run design:lint` is green.
- `lib/quotes/items-model.ts` — `parseColumns(json, base)` takes the set it fills from; `TABLET_COLUMNS` · `TABLET_COLUMNS_KEY`; `RowMenuAction` gains `'edit'` (a card's own; the section never sees it).
- Nothing in `components/om/*`, `section-card.*`, `quote-editor.*` or any other package's file.

## 3 · Probes

| Probe | Where | Tally |
| --- | --- | --- |
| `design-source/verify/responsive-quotes/verify-rq-k2.cjs` (new) | lane · :3172 · `lane.db` | **98 passed · 0 failed**; put back: `quote_items`, `quotes`; no page errors at 390 · 768 · 1024 · 1440 · 320 |
| `pending-modules/verify-pm2-s44i.cjs` (deliberate changes: "Add to Kitchen" is one press; the row ⋮ › More…; the touch drag at 1024×768) | lane · :3172 | **110 ✓ · 0 ✗**, exit 0 |
| `uat-dane-2026-10-01/P3/verify-p3.cjs` (deliberate: Cost under the sheet's More) | lane · :3172 · writes without putting back → the lane DB restored from its backup; its banked pngs restored with git | **71/71 PASS** |
| `ui-sweep/verify-sw-r1.cjs` (deliberate: "Quantity", Cost under More, 768's totals behind Adjust) | a fresh DB copy · :3011 | **35/35 passed** (a back-to-back run on the same copy read "Sum · 0 priced items" once — state from the first run, not the build; the fresh copy passes) |
| `quote-editor-parity/verify-qe-r1.cjs` (deliberate: the sheet's More; the tablet step at 1024×768 on the tablet's own columns) | the same copy · :3011 | **34/34 passed** |
| `npm run design:lint` | | green — `icon-button-overlay 19 (allowed 19)`, nothing new |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` | | clean (the two pre-existing warnings are other modules') |

Shots: `…/scratchpad/rq-build/K2/shots/probe/` (a-01…a-11 at 390 · b-01 at 768 · c-01…c-03 at 1024×768 · e-01 at 320), `…/shots/look/` (the first look at every layout, viewport-only), `…/shots/before` + `…/shots/after` (the 1440 comparison). Banked: `design-source/verify/responsive-quotes/rq-k2/` (the probe's set).

## 4 · For other packages

- **K1 (the section screen):** the Items body renders a `position: sticky; bottom: 0` foot and sticky section cards / head bar; they take their top from `--items-head-top` (else `--editor-sticky` + `--section-top-h`). A screen whose body scrolls itself should set `--items-head-top: 0px` on that body (the full-page Expand already does). The screen bar's sub-line "16 lines · S$49,838" is yours — the editor already receives `onCount` and `onTotal` from the Items card. The phone's `loading.tsx` / `PageReveal` ghost of the Items section = the cards with the pinned foot (`components/leads/detail/tab-ghosts.tsx`-style, from `ghost-kit`), not the grid. The inline pane at 768 needs the cards column ≥ 736 (the brief's full-width screen gives 736). `quote-editor.module.css:36` holds the same C-03 `inset` override on `.anchor > button::after` — delete it (the house box is centred); the lint's ratchet lists it.
- **K5:** `payments-section.module.css:127`, `files-section.module.css:28`, `text-section.module.css:15` hold the same C-03 override — delete them; the rule's ratchet lists each at 1. The bulk bar (`DetailBulkBar`) at ≤767 still assumes the dock (`--app-mobile-dock-height` + 16) on a page that has none — the foot lifts above it, but the bar floats 86px up on the editor page; its own rule, if you touch it.
- **K4:** `quotes-table.module.css:169`, `quotes-toolbar.module.css:28`, `quotes-empty.module.css:20`, `quotes-filters-modal.module.css:30`, `create-quote-modal.module.css:141` — the same `button::after { inset }` (the row kebab's box in the Quotes table is displaced like Items' was). The contracts, questionnaire, meetings and Qanvast modules hold the rest (nobody's in this build).
- **Everyone:** `RowMenu compact` and `LineFields` are reusable if a section wants a five-row menu or a two-layer form on touch.

## 5 · What to check in the browser

As **Dane (Owner)**, **Hui Min (Admin)** and **Germaine (Designer)** — the Designer sees no Cost · Markup in the sheet's More when Settings › Roles & access hides costs (`costs` false), and the owner's margin strip shows only to Dane in Adjust:
- **390 · `/quotes/<OM-10001>`** — the cards; tap Bathrooms (folds), scroll (the section holds); tap a line (the sheet: Quantity · Unit · Unit price · Total · Kind · More); change the quantity and watch the Total; More → Cost etc.; ⋮ on a card (five + More…); tick two cards (the bar: Move to section · Delete · More…; the foot's adds step away, the total lifts above the bar); the Items ⋮ (no Column settings); the foot's Adjust (the totals card) and Breakdown; + Add item (a new line's sheet opens); Add section.
- **768 upright (touch)** — the cards; tap a line (the 400 drawer at the right; the list still scrolls and another card's tap moves it); Maison AI and Create ▾ in the toolbar.
- **1024 sideways (touch)** — the grid: Item · Qty · Unit · Unit price · Total, no pan; tap a Total (the drawer with the words and the cost); ⋮ › Column settings → Cost on (the caption names it; reload — it stays); the row ⋮ (five + More…).
- **1440 (mouse)** — the mocked grid, the # column, the Add Item box, the totals block and By category below, exactly as before.
- **320** — no sideways scroll; the foot fits.

## 6 · The 1440 comparison

Captured before any change (the untouched worktree's build) and after the final build, on `/quotes/<OM-10001>` (Draft, 16 lines, 2 sections) and `/quotes/<OM-10004>` (Signed, 19 lines, 3 sections) at 1440×1024: the Items section's **DOM snapshot** (outerHTML less the volatile ids) and the **cell geometry** of the first 12 rows and of the summary block are **byte-identical** on both pages; the viewport PNGs are byte-identical for OM-10004, and for OM-10001 the only differing pixels sit inside x 701–771, y 42–54 — the header's "Saved 41 mins ago" words, which moved with the clock between the two captures (the section itself is pixel-identical). Scripts: `…/scratchpad/rq-build/K2/capture-1440.cjs`, `compare-1440.cjs`, `pixel-box.cjs`.

## 7 · Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins, every exception written down** — the review page's drawn screens (4 · 5 · 11) are the shape built; every departure is a REG-K2 row with its why; the decisions above are flagged for him.
2. **One system, no one-offs** — every box is the DS `TextField`, every menu `PortalMenu` + `DropdownItem`, the sheet `Sheet`, the pane `SurfaceHead` + `SurfaceFoot`, the drawer `Drawer`, the forms `Dialog`, the buttons DS `Button` (`size="lg"` for the 48s); tokens only (`npm run design:lint` green); radii 4 / 8.
3. **Plain words for studio people** — "Quantity", "Add to Bathrooms", "More: description, cost and markup…", "Totals", "Breakdown", "internal, never printed for the client"; the invented copy is marked in the rows.
4. **Nothing is lost** — every desktop action is one tap further (More…, the Items ⋮, the sheet's More); removes keep their confirm and snackbar; the tablet's column choice is remembered.
5. **Say why** — the caption under the touch grid's head; the refused rows keep their in-row reasons (table-menus unchanged there).
6. **Back returns where you came from** — n/a (no navigation added; the pane and the sheet close in place).
7. **Every screen is whole** — the ghost at ≤767 is K1's call (§4); tooltips on every icon-only control kept; the snackbar host unchanged.
8. **Every width is designed** — phone · upright tablet · sideways tablet · desktop each their own layout; no page sideways scroll at 320 · 390 · 768 · 1024 (asserted); 44 targets measured; the desktop byte-identical.
9. **Tables follow the leads listing** — the touch grid keeps the frozen Item and Total, the selection column, Column settings in the one drawer; the desktop grid untouched.
10. **Motion with purpose** — the sheet, the drawer and the dialogs ride the house variants; layout reflow (the pane) is not animated.
11. **Honest data** — every figure on the strip, the cards and the sheet's Total comes from `lib/quotes/math.ts` over the lines; nothing pasted.
12. **Reach for everyone** — the card press, the fold and the kebab are buttons with names; the sheet and the drawer take focus and give it back; the More row is `aria-expanded`; the Total press on the grid is a named button.
