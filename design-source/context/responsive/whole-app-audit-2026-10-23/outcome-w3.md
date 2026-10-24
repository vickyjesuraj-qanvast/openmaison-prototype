# Lane W3 — outcome (Projects · the client portal · the client's money links)

The audit: `audit-w3.md` (20 findings, W3-01 … W3-20, and what the sweep flagged that is not a defect, read one by one). Staged register rows:
`reg-w3.md` (REG-W3.1 … REG-W3.15). Probe: `design-source/verify/responsive-all/verify-rwd-w3.cjs`. Scripts, sweeps and shots:
`scratchpad/rwd-all/W3/` (`work/` — the sweep · open · portal · ghost passes, the pixel diff, the runner; `sweep0` → `sweep2`; `before1440` ·
`before1440b` · `after1440`; `open0`/`open1`, `portal0`/`portal1`, `ghost1` + `gsheets/`; `shots/` the fixes' own shots; `reg/` the harness
lanes). Nothing committed; no migration; no `local.db` touched (the lane DB and the harness' copies only). His rule kept: a project's page is one
page with its tab strip at every width — nothing here adds a screen, a level or a flow.

## Ledger

| id | where it was built | status |
| --- | --- | --- |
| W3-01 | `components/projects/project-views.tsx` — an effect centres the `[role=radio][aria-checked=true]` chip in the ChipRail's scroller on arrival and on every resize of the rail or its track (ResizeObserver); a rail with room is left alone | **built** — 390: every grouped view's own chip in its rail (13 views measured); 320: all but Floor plan (a 44px rail) and Compliance (86px) → W3-13 ▲ |
| W3-02 | `components/projects/project-overview.module.css` — `@media (max-width: 1439px) { .row[data-two]:not([data-split]):has(> .rowActions) { flex-wrap: wrap } }` | **built** — Ryan's "says they paid" row at 320 from 1,342px to two lines + its buttons; the Dashboard's rows (the same stylesheet) checked at 390 and 1280 |
| W3-03 | `components/projects/money/invoice-paper.module.css` `.headWrap` · `.chipFit` (≤767); used by `public-doc-page.tsx` (page + ghost), `invoice-page.tsx`, `payments-receipt-page.tsx`, `invoice-ghost.tsx`, `payments-receipt-ghost.tsx`; `components/projects/choices/selection-receipt.module.css` composes both for `selection-receipt-page.tsx` (page + ghost) | **built** — 0 sideways at 320 / 390 on every paper (was 4 and 49) |
| W3-04 | — | **not built, ▲** — the trial (a 240 / 280 / 300 name column) traded the timeline for cut names; reverted; recommendation below |
| W3-05 | `components/projects/schedule/schedule.module.css` — `(hover: none) and (max-width: 1024px)`: `.grip` 44 × 44 (margins −16 / −12), `.bar { overflow: visible }` + `.bar::before` (top / bottom −12), `.fill { border-radius: inherit }`; `.sees { min-height: 44px }` | **built** — a real tap 9px above a bar opens its milestone (probe §4); the desk's grip still 20 × 32 |
| W3-06 | `components/projects/workload/workload.module.css` — ≤767 `.captionActions` wraps; `.row` a wrapping flex row (who 160 basis · state beside or next line at the end · bar last); touch ≤1024 `.slot` / `.block` 44 | **built** — 0 sideways at 320, Vendors on screen, every contractor's name whole |
| W3-07 | `components/portal/portal.module.css` — touch ≤1024: `a.link:not(.rowGo)` padding 15 / 2, given back as margin, `.rowGo` min-width 44, `.navLink` min-width 44, `.textButton` min-height 44 (`.legal` links reset); `components/portal/project/project.module.css` the same padding on `.stagePay a` | **built** — Receipt a 47 × 45 press, a press above the word lands on it |
| W3-08 | `components/projects/floor-plan/plan-canvas.module.css` — touch ≤1024 `.zoomLabel` min-height 44 | **built** |
| W3-09 | `components/projects/schedule/schedule.module.css` — `.statusSeg.statusSeg [data-size] button` (over the DS item's `[data-size=md] ._item`): ≤767 padding 4, `height: auto; min-height: 44px; white-space: normal; text-align: center`; touch ≤1024 44 tall | **built** — "Not / started", "In / progress" whole at 320 |
| W3-10 | `components/projects/tickets/tickets.module.css` · `components/projects/threads/thread.module.css` — touch ≤1024 `.photo.photo` 64 × 64 | **built** at touch; the desk's 36 ▲ |
| W3-11 | `components/projects/project-frame.module.css` — ≤767 `.centre.centre[data-tab='overview'] { --fab-clearance: inherit }` | **built** |
| W3-12 | `components/portal/portal-frame.tsx` — the nav's `[aria-current=page]` link centred in the scrolling row on arrival and on resize | **built** — Messages / About / Files in the row at 844 × 390 and 768 |
| W3-13 | — | **not built, ▲** (REG-353 / Principle 8: a phone's toolbar stays one row) |
| W3-14 | — | **not built, ▲** (a new look on the client's page) |
| W3-15 | — | **kept** (sweep S1's rule), ▲ idea |
| W3-16 | — | **For W1** (`StatTiles`) |
| W3-17 | `components/portal/portal.module.css` — ≤767 `.need > .needAction { display: none }` | **built** — the Home loader's cards inside 390 (were 454 wide) |
| W3-18 | `components/projects/money/money.module.css` — ≤1439 `.banner` wraps, `.bannerText` a 260 basis, `.bannerActions` at the row's end | **built** — every Money Needs you row's words ≥ 240 at 768 |
| W3-19 | `components/portal/project/project.module.css` — ≤767 the stage's two answers may take a second line inside their ≥ 48 buttons | **built** |
| W3-20 | `components/projects/updates/updates.module.css` `.band.band` · `components/portal/bell.module.css` `.badge.badge` | **built** — the update band's 20 and the bell's 6 / 6 hold whatever order the build puts the sheets in |

## ▲ Decisions for Vicky

1. **The Schedule on an upright tablet (W3-04).** At 768 the frozen name (360) and actions (140) leave the timeline a 70px window of a 570 frame.
   A narrower name column gives the timeline 2.6 – 4 weeks but cuts every name ("Hack…", "Electr…") — tried at 240 · 280 · 300 and reverted.
   **Recommendation:** a tablet held upright (768 – 1024, not `TABLET_LANDSCAPE`) takes the phone's list (`schedule-phone.tsx`), as Contracts'
   Q-01 gave an upright tablet the phone's model ("held upright, a tablet follows the phone", `lib/breakpoint.ts`). Sideways (1024) is fine as
   it is — a 328px timeline.
2. **A view switch with no room at 320 (W3-13).** The Floor plan tab's one-row toolbar leaves its views 44px (MAIN PLAN + Add a plan + Download +
   ⋮); Compliance 86 for a 95 chip; the lead's Tasks 92 (W2's toolbar). **Recommendation:** ≤ 374 the views take the toolbar's first line — an
   exception to REG-353's one row, only where the row can't hold the chip you are on.
3. **A report's photo on the desk (W3-10).** The ticket and thread sheets draw a 64 photo, but the house thumb's 36 wins the cascade, so the
   desk shows 36. Under a finger it is 64 now; keep the desk's 36, or restore the 64 there too?
4. **The portal's section row at 768 – 1024 (W3-14).** It scrolls (F-02) with no fade or pager to say so; W3-12 now brings the current section
   in. A house ChipRail fade would say "more this way".
5. **Floor-plan papers on a phone (W3-15).** They scroll sideways at 1:1 inside their stage; the quotes' paper viewer (fit to width, pinch)
   could open them on a phone.
6. **The bell's badge on the portal (W3-20)** now sits at the bell's own 6 / 6 on every page — Choices and Files had drawn the rail's 2 / 2 corner
   (a build-order accident); a 4px move on those two pages at 1440.

## Shared pieces changed

None of W1's, W2's, W4's or W5's files. Inside my files, the shared ones:
- `components/projects/project-overview.module.css` (W3-02) is also the Dashboard's row stylesheet (`/dashboard`, W2's page): ≤1439 a two-line
  row with buttons that isn't split may now wrap its buttons when it is short — checked at 390 and 1280; rows that fit keep their line; 1440
  untouched.
- `components/projects/money/invoice-paper.module.css` gained `.headWrap` / `.chipFit` (≤767), composed by the selection receipt.
- `components/projects/money/money.module.css` `.banner` (W3-18) — the Money tab's own Needs you rows and banners only.

## For other lanes and the orchestrator

The exact fixes are in `audit-w3.md` § For other lanes. **W1** — the house TextField / textarea at 14px on phones (iOS zoom; every input on my
pages), the DS SegmentedButton 36 under a finger, the crumbs' 15px links, the folder card's select box under its main press, the ChipRail's
selected chip (centring it in the house piece would let `ProjectViews`' and the portal's effects go), StatTiles at 320, the L2 header + strip
pinned at 844 × 390. **W2** — the info column's Members name broken inside the word at 768 / 1024 ("Germain / e"), the house Card head's right
meta under the ↗ at 1025 – 1439 (the project's Money card at 1280: "19 li↗es"), the lead pieces' targets under 44 (tasks table milestone, task
card name, notes composer tools, meetings title, file viewer strip, info column contact row), the three toolbars that starve the project's view
switch at 320. **W4** — the Costs table's WHAT sub link cut with no ellipsis at 768. **W5** — the 3D viewer's Top · 3D · Walk (36), the render
link's pins (26), the Visualizer stage's zoom label (52 × 36).
**The orchestrator — CSS order (W3-20):** an override of a composed class at equal specificity holds only by the order the build emits the
sheets, and a lane's CSS edit can move that order: this lane's rebuild flipped the update band's padding at 1440 (fixed by doubling the class),
and the portal's bell badge had already differed page to page. Re-diff 1440 on the landed build of all five lanes; a flip is fixed the same way
(`.x.x`), in the file that owns the override.

## The 1440 comparison

Every W3 route (55, full page, a mouse at 1440 × 1024, reduced motion, animations frozen) shot on the unchanged build twice (`before1440` ·
`before1440b` — the noise floor: the views rails' chips 30 – 50px, "Portal opened … ago", an update's "1d ago") and on the final build
(`after1440`), diffed with `sharp` pixel by pixel (`work/pdiff.cjs`): **49 of 55 identical**; the other 6 read box by box — 1 is the noise
floor's own box (the Design views rail's chips, 34px, present between the two unchanged runs too), 3 are relative times that moved with the
clock between the runs (the machine slept 02:55 → 09:45: "2d ago" → "3d ago", "1d ago" → "2d ago" on the Overview, Money and Updates), and 2
are the portal bell's badge on Choices and Files, now at the bell's own 6 / 6 like every other portal page (W3-20, ▲ 6). No layout moved. (An
earlier after-run also showed the listing's "/" key chip 1px off — the run-to-run artifact W5 reports too; gone in the final run.)

Every fix sits in a `(max-width: 767px)`, a `(hover: none) and (max-width: 1024px)` or a `(max-width: 1439px)` query, or (W3-01, W3-12) in an
effect that does nothing when the row has room; W3-20's doubled classes restore the values the unchanged build drew.

## Tallies

- W3's sweep (55 routes × 6 widths = 330 page-widths), before → after: sideways **3 pages → 0** · offscreen **2 → 0** · touch targets < 44
  **711 → 400** (the Schedule's bars count by their drawn 20 — their press is 44, checked by tap; the rest are other lanes' pieces: the crumbs, the info column, the file viewer, the DS segmented, the 3D viewer, the render pins, the lead's task and meeting rows) · covered 375 → 344 (scroll rails and sticky heads, read one by one) · a phone's input < 16px 2 → 2 (the house TextField, W1) · clipped 9 → 8 (scroll rails).
- What a person opens: 32 studio steps + 15 portal steps × 6 widths, twice (before and after) — every sheet, menu, drawer and dialog on screen,
  inside its own scroll, its foot clear; the project Tasks table's ⋮ at 1024 takes its press at rest and at the page's end (7 / 7, 6 / 6).
- Ghosts: 55 routes × 5 touch widths held over their pages (275 pairs) — every route has its reveal ghost; one drew the wrong shape (W3-17, fixed).
- Probes, through the harness' mechanics (`work/run-w3.cjs` = `regression/run.cjs` with W3's probe and the Projects probes `probes.cjs`
  doesn't list; a fresh copy of the lane's clean `base.db` per probe, `next start` on :3203): **`rwd-w3` 57 / 57** · `pj-r1` 98 / 98 · `pj-r5`
  91 / 91 · `pj-r6` 82 / 82 · `pj-gap-d` 65 / 65 · `pj-gap-f2` 84 / 84 · `pm-f` 60 / 60 · `ke` 31 / 31 · `pm2-s46b` 81 / 81 · `pm2-s23`
  148 / 148 · `rc-c4` 145 / 145 · `ks` 29 / 29 · `pj-gap-i` 81 / 81 · `pj-gap-h` 80 / 80 · `pj-r4b` 75 / 75 · `pm2-s45b` 72 / 72 · `pj-gap-c`
  104 / 105 · `pm2-s42e` 30 / 31. The two misses fail the same way on the **unchanged WIP base build** (run side by side, `regbase/`): pj-gap-c's
  "390: the outside people on the task cards" (the lead's task cards, W2's) and pm2-s42e's Hangouts step, which needs the demo Hangout to be
  today — the base was restored on 23 Oct and the event is 23 Oct. A first pass, run before the machine slept and under the other lanes' load,
  had five more misses in pj-gap-c / gap-i / gap-h / r4b / s45b (snackbar and navigation timings); all five pass on the rerun and on the base.

## Principles check

1. The mock wins — no mocked size, word or layout changed; the two layout calls (W3-04, W3-13) are held for Vicky; every rule cites its W3 id.
2. One system — house pieces only; the papers' rule written once (`invoice-paper.module.css`) and composed by the selection receipt; tokens only (`npm run design:lint` 0 new).
3. Plain words — no word added or changed.
4. Nothing is lost — no control removed or hidden; the grip, Mark done and every tool keep their places.
5. Say why — unchanged.
6. Back returns where you came from — unchanged (no navigation touched).
7. Every screen is whole — the paper ghosts take their pages' title-row rule; the portal Home's ghost holds the phone (W3-17); 275 ghost pairs checked.
8. Every width is designed — defects inside the existing layouts fixed from 320 to 1280; 44 under a finger; no page scrolls sideways; a phone held sideways checked; 1440 kept (see the comparison); the two media queries plus the brief's ≤1439 for a 1280 fix; toolbars stay one row (W3-13 held).
9. Tables follow the leads listing — unchanged (the Schedule's frozen columns kept as drawn; W3-04 held).
10. Motion with purpose — the centring is instant; no new motion.
11. Honest data — no data touched; the probe puts back what a visit stamps.
12. Reach for everyone — larger presses only; focus and keys unchanged.
