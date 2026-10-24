# Lane W5 — the tools: the outcome (2026-10-24)

The audit is `audit-w5.md` (37 ids: 15 fixed here, 11 checked and kept, 11 for other lanes). Built on the lane's WIP base in its worktree,
verified by real taps / clicks on the production build (:3205, the lane's scratch DB), shots in `scratchpad/rwd-all/W5/shots/`
(`probe/` = the probe's, `before/` · `crawl*/` · `flows*/` · `ghosts/` = the audit's passes, `1440-before/` · `1440-after/` = the diff).

## Ledger
| id | outcome | where |
| --- | --- | --- |
| W5-01 | **built** — the open bar's pair wraps (wrap-reverse; side by side while they fit, the primary on its own line above Ask when not). No sideways scroll at 320 · 360 · 390 · 430; the Approve sheet's foot on screen. A quote's shorter pair stays side by side at 390+. | `components/quotes/confirm/confirm-page.module.css` `.barPair`, `confirm-page.tsx` (the class on the open row) |
| W5-02 | **built** — Tools › Quotes / Contracts end on `--fab-clearance` at ≤767 (the last card 80 clear of the dock, its ⋮ its own). | `components/quotes/list/quotes-workspace.module.css` |
| W5-03 | **built** — ≤540 tall the Items foot does not pin; at 844×390 the lines get the screen and the adds close the section. | `components/quotes/editor/items/items-touch-foot.module.css` |
| W5-04 | **built** — the pinned foot at z 11, over the house SideScrollbar's 10. | `items-touch-foot.module.css` |
| W5-05 | **built** — a marker's touch box is a centred square, `--reach` wide: 44 with room, sized so it never lies on a neighbour's mark, never under the 32 it had. (A first cut at a uniform 44 put one marker's box over the next one's centre at 320 — the probe caught it.) | `components/visualizer/editor/stage.tsx` (`reachOf`), `stage.module.css` |
| W5-06 | **built** — the phone's Items screen raises the FAB and `--bottom-dock` from the foot's own top (the snackbar follows); the list ends 80 above the foot so the last line's ⋮ scrolls clear; the FAB steps out while lines are ticked and where the foot does not pin. | `components/quotes/editor/quote-editor.tsx`, `items-touch-foot.module.css` |
| W5-07 | **built** — the X-Ray ⋮ as a frozen trail cell at `(hover: none)` 768–1024, the head's frozen cell, `data-at-end`. | `components/xray/xray-table.module.css`, `xray-table.tsx` (the onScroll toggles one more attribute) |
| W5-08 | **built** — the X-Ray phone card: no trailing row rule, the bare ⋮. | `xray-table.module.css` |
| W5-09 | **built** — "← Agreement" 44 under the touch list. | `components/contracts/sign/signing-page.module.css` |
| W5-10 | **built** — a confirm file's link takes its row's 44. | `components/quotes/confirm/confirm-page.module.css` |
| W5-11 | **built** — the Visualizer's FAB steps aside on the stage's `low` / `over` fit. | `components/visualizer/editor/editor.module.css` |
| W5-12 | **built** — the Preview bar's Send ▾ `align="right"`. | `components/quotes/preview/quote-preview.tsx` |
| W5-13 | **built** — the editors' ghosts draw the landscape split (360 / 300 pane + the section). | `components/quotes/editor/editor-skeleton.tsx` · `.module.css`, `components/contracts/editor/contract-skeleton.tsx` |
| W5-14 | **built** — the Quote / Contract screen ghost is the screen's height, its foot on the first screen. | `editor-skeleton.module.css` |
| W5-15 | **built** — in a ≤260 Item cell a section's SECTION tag steps aside (the name readable at 844 and 1024). | `components/quotes/editor/items/items-table.module.css` |
| W5-16 … W5-26 | **kept** — each one's reason is in the audit (the whole card is the press · the parked float at the desk · iOS types inputs at 16 · B-13's 40 pitch · K2's grid · the house sheet's 450 ms · the payment handle at the card's edge · inline links · nothing else overflows at 1280 · my own staging · the FAB tucks on a scroll). |
| W5-27 … W5-37 | **for other lanes** — below, with the exact fix. |

## ▲ Decisions for Vicky
- **W5-06** — a phone's Items screen keeps its Maison AI button (REG-2602) but raises it above the foot, so at rest it floats over the list's
  lower right, as it does above the Quote screen's foot (K1); the list ends 80 above the foot so nothing ends under it. The alternative:
  REG-2602's tablet rule on the phone too (the button steps out of a section screen; Maison AI one Back away).
- **W5-11** — on a short phone (iPhone SE, 360×640) the Visualizer's Maison AI button steps aside while the photo fills the stage's top; it
  comes back with the chip row (dismissing the first-visit hint is enough at 375×667). The alternative is a "Maison AI" row in the design's ⋮.
- **W5-03** — a phone held sideways: the Items totals and adds close the list instead of pinning under it.
- **W5-15** — in the touch grid's narrow Item cell (a tablet's split, a phone sideways) a section row drops its SECTION tag; its band, fold
  and bold name carry it (as the phone's cards). One word fewer at that width.
- The Marketplace's deal ribbon (a 20-tall tag button on a brand card's photo) stays 20 under a finger: growing it needs a visible change to
  the gallery's ribbon or giving up its ellipsis' clip (the deal is also a full button on the brand page and in Deals) — his call.

## Shared pieces changed
None of the house pieces (`components/om/**`, `components/shell/**`) — every change is in a W5 file. `editor-skeleton.module.css` (mine) is
the stylesheet the contract's ghost already composes, so `.split` serves both editors.

## For other lanes — the exact fixes
| id | owner · file | the fix |
| --- | --- | --- |
| W5-27 | W1 · `app/globals.css` (the `@media (hover: none)` block) | The DS SegmentedButton's items are `[role='radiogroup'] > button[role='radio']` (classes `_group_…` / `_item_…`), which `[class*='segmented'] button` never matches: add `[role='radiogroup'] > button[role='radio']` to both lists (the `position: relative` one and the centred `::after` 44 one). Reaches X-Ray setup's "For a lead · Upload two quotes", the planner's "Top · 3D · Walk" and every segmented control. |
| W5-28 | W1 · `components/om/scope-pill.module.css` | The pill is 36 with no box: add it to globals' overlay list (`button[class*='scope-pill-module'][class*='__pill']`) or, in the pill's own sheet under `(hover: none)`, `.pill { position: relative } .pill::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 44px; transform: translateY(-50%) }` (a class, not an IconButton — the lint's rule is satisfied). |
| W5-29 | W1 · `app/globals.css` (REG-2600) | The SearchBar's target is its 36 shell since its overlay lets taps through: give the input itself the 44 — `[class*='_searchBar_'] input { block-size: 44px; margin-block: -4px }` under `(hover: none)` with the shell `overflow: visible` (the drawn 36 unchanged). Reaches New contract's "Search leads" and every house menu search (`text-field.menuSearch`). |
| W5-30 | W1 · `components/om/chips.*` — a note | Measured by tap: the selected room chip's ⋮ takes its full 44; an unselected chip's ⋮ box meets the next chip a few px past its edge (chips 8 apart). Each control keeps ≥ 40 of its own; no fix needed unless W1 sets trailing-action chips 12 apart. |
| W5-31 | W1 / W2 · `components/leads/dropdown.tsx` (the house Dropdown) | On a phone held sideways it opens anchored and runs off the screen's bottom (the Contract screen's quote row menu at 844×390 — "No quote" cut; the Visualizer / Planner home's New ▾, entirely below the fold). As PortalMenu (`portal-menu.tsx` line 46): `const sheet = useSheetLayout() \|\| useMediaQuery(PHONE_SIDEWAYS)`, used for the sheet branch and in the layout effect's early return. |
| W5-32 | W1 · `components/shell/page-reveal.module.css` | `.ghost { overflow: clip }` instead of `hidden`: `clip` makes no scroll container, so a ghost's sticky foot sticks to the viewport in the reveal as in the loader (W5-14 works around it for the Quote / Contract screens). |
| W5-33 | W1 · `components/shell/list-ghosts.tsx` (`QuotesListGhost`) | At ≤767 the page has the to-do chip row ("Waiting on client · n") under the toolbar and three-line cards; the ghost has neither, so its cards stand 40 above the page's. |
| W5-34 | W1 · `components/om/sheet.tsx` (`useSheetFootLift`) | It measures the foot at open and once at 450 ms; a snackbar raised with the sheet (Add section → "Section created") rests on the foot until then. Re-measure on the panel's `transitionend` / `animationend`, or each frame until the foot's top stops moving. |
| W5-35 | W1 · `components/om/date-picker*` | 320: the sheet's day cells are 40 (seven 44s need 308 of the 288 there) — W1's call (40 at the floor, or a 4px tighter gutter). 768–1024 touch: the popover's "Today", ‹ › (24) and "Choose a year" (24 tall) take no 44 box. |
| W5-36 | W4 · `components/company/company-popover*` | At 844×390 the rail's Company popover is 728 tall on a 390 screen with no scroll of its own (Materials and below off-screen): cap it at `100dvh − 16` with its own scroll, as the AI credits and View as popovers fit. |
| W5-37 | W2 · `components/leads/quotes/quotes-table.module.css`, `components/leads/contracts/contracts-table.module.css` | 768–1024 touch: the client / lead link and the title (20 tall) sit in a row whose own press opens the quote: `padding-block: 12px; margin-block: -12px` on `.clientLink`, `.leadLink`, `.title` under the touch list. |
For the landing: register `add('rwd-w5', 'responsive-all/verify-rwd-w5.cjs', { args: ['$DB', '$L/shots', '$BASE'] })` in `design-source/verify/regression/probes.cjs`.

## The 1440 comparison
Both builds (the base `next-base` and this lane's) on a fresh restore of the lane DB with the same fixed-time staging, 25 W5 routes × the
page's top and its end + two open states (the Preview's Send ▾, an X-Ray row on hover): **46 of 50 byte-identical**. The four that differ:
`quotes.png` · `quotes--end.png` · `contracts.png` (16 px each, the "/" key badge in the search box — the glyph's antialiasing varies run to
run: a reshoot of the lane's build matched the base byte for byte, a second one did not) and `…preview--send.png` (the deliberate W5-12 — the
menu now inside the screen). Nothing at rest changed at 1440.

## Tallies
- **The audit:** 37 ids — 15 fixed (1 blocker · 9 major · 5 minor), 11 checked and kept, 11 for other lanes (one of them, W5-30, a note).
- **The lane's probe** `design-source/verify/responsive-all/verify-rwd-w5.cjs`: **74 / 74** on the final build (real taps at 320 · 360 · 390 · 430 ·
  768↑ · 1024↔ · 844×390, clicks at 1280 · 1440; it stages a sent agreement on the demo's sent quote and puts every table back).
- **The harness** (`design-source/verify/regression/run.cjs`, RUN_DIR with `base.db` = the lane's clean restore, :3205): the 30 probes these
  files reach — rq-k1…k5 (116 · 98 · 90 · 143 · 79), rc-c1…c4 (176 · 90 · 110 · 145), xr-r1…r4 (27 · 31 · 28 · 16), viz-studio · client · sheets
  (37 · 30 · 14), qe-r1…r5 (34 · 33 · 21 · 14 · 21), ct-r1…r4 (36 · 24 · 28 · 29), pm2-s03 · s04 · s44f · s44i · s44t (79 · 82 · 101 · 110 · 69):
  **1,911 checks, 0 failed, every exit 0**; xr-r1…r4 run again on the final build (the X-Ray head cell scoped to tables with row actions) —
  102 / 102. No existing assertion was changed.
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three known quote-editor errors only · `npm run design:lint` — nothing
  new (icon-button-overlay 2 of the 2 allowed) · the production build green (five builds under the shared lock).

## Principles check
1. The mock wins — no mocked size moved at the desk (1440 byte-identical at rest); every on-the-move change sits inside K1–K4 / C1–C4's layouts and is written here, the decisions flagged ▲.
2. One system — house pieces only (the house offset `--bottom-dock`, `--fab-clearance`, the core's frozen-cell pattern from the Quotes tablet table, REG-312's link rule); no copied stylesheet, no hand-rolled head / menu / table head; design:lint unchanged.
3. Plain words — no new words; one word (SECTION) steps aside in a narrow cell (W5-15, ▲).
4. Nothing is lost — every press still exists at every width; the FAB that steps aside (W5-06 ticking / sideways, W5-11) is one gesture away, flagged ▲.
5. Say why — no refusals touched.
6. Back returns where you came from — "← Agreement" is now a full target; no route changed.
7. Every screen is whole — the editors' ghosts draw the split and the screen's foot (REG-708); the lists end on the house clearance.
8. Every width is designed — 320 · 390 · 768 · 1024 · 844×390 · 1280 checked by tap; no sideways scroll on any W5 route at 320 and 844×390 (the probe).
9. Tables follow the leads listing — the X-Ray tablet table gets the listing's frozen trail cell; the Items grid keeps its frozen block and its sideways bar.
10. Motion — none added.
11. Honest data — nothing faked; the probe stages its records and puts every table back.
12. Reach for everyone — 44 targets for the markers, the client's two links, the foot's adds; the ⋮ stays its own tap everywhere it was covered.
