# Lane C2 — the held calls, built (Projects · the client portal · Company · Settings) — 2026-10-24

His word: "got it can you please fix all of it and commit and push to all the branches" — the eight calls of `calls-2026-10-24.md` § Lane C2,
each as the orchestrator decided, and a ninth the orchestrator added during the round: **K-10 on a project's page too** (C1 built it for the lead's). Built in a fresh worktree of `06b9485f` (no WIP base), verified on production builds on :3212 over fresh
copies of `rwd-calls/base.db`; the unchanged tree built beside it (`rwd-calls/C2/base-src`) for the before shots and the load-order scan. His
rule kept: a project's page stays one page with its tab strip — nothing here adds a screen, a level or a flow (the paper viewer is the house
overlay the quote and contract papers already open in). Nothing committed; no migration; no `local.db` touched. Working files:
`scratchpad/rwd-calls/C2/` (`work/` the scripts · `shots/before*` · `after*` · `probe*` · `scan/` the order scans · `reg/` the regression).
Rows: `reg-c2.md` (REG-C2.1…9). Probe: `design-source/verify/responsive-all/verify-rwd-c2.cjs` (registered `rwd-c2`), its shots banked in
`design-source/verify/responsive-all/rwd-c2/`.

## Ledger

| call | built where | what a person gets |
| --- | --- | --- |
| **W3-04** the Schedule on an upright tablet | `components/projects/schedule/schedule-phone.tsx` (`SCHEDULE_ROWS` = `(max-width: 767px), (min-width: 768px) and (max-width: 1024px) and (orientation: portrait)` — the leads' / Contracts' Q-01 phone model) · `project-schedule.tsx` (`asRows`) · `schedule-ghost.tsx` | 768 – 1024 held upright: the phone's rows (each with its thin bar, today's line, its Done; a tap opens the milestone in the panel's drawer); the timeline's own tools — Weeks · Months, Today, Full screen, the legend — go with the timeline; the summary's three figures and the toolbar's end (+n days from changes, Contractors, who sees it, Share, Add milestone, ⋮) stay; a tablet turned upright leaves full screen (render-phase adjust); the ghost draws the rows. Sideways (1024 × 768) and the desk keep the timeline. Every milestone's name whole at 768 and 820 (they were "Hack…" in a 70px window) |
| **W3-10** a report's photo | `components/projects/tickets/tickets.module.css` · `components/projects/threads/thread.module.css` — `.photo.photo { 64 × 64 }` at every width | The ticket's panel, a message's photos (the studio's and the portal's threads) draw the 64 at every width, whatever order the build puts the sheets in. **On this build the desk already drew 64** (`06b9485f`'s sheet order let `.photo` win — W3 saw 36 on its own build); the doubled class makes it hold, so the 1440 shots are identical |
| **W3-13** the Floor plan's toolbar at ≤374 | `components/projects/floor-plan/floor-plan.module.css` (`@media (max-width: 374px)`: `.bar[data-views]` wraps, the views take the first line, the tools sit at the second's end) · `project-floor-plan.tsx` + `floor-plan-ghost.tsx` (`data-views` when the group's switch stands in the title's place) | 320 – 374: Choices · Floor plan · Designs whole on the first line (they had a 44px rail), Main plan · + · Download · ⋮ under them at the end; from 375 REG-353's one row |
| **W3-14** the portal's section row | `components/portal/portal-frame.tsx` (the nav in `.navWrap` with the house `ScrollPagers` — ChipRail's fades and pagers, its own words) · `portal.module.css` (`.navWrap`; ≤1024 it shrinks as the row did; ≤767 hidden with the row; a fade stops at the bar's 1px rule) · `portal-ghosts.tsx` | 768 – 1024 (and a phone held sideways): a fade at whichever end has more sections — both while in the middle, none at a desk where the row has room; with a mouse at that width the house 28 pagers too (ChipRail's own behaviour; hidden under a finger). W3-12's centring of the current section kept |
| **W3-15** the floor-plan papers on a phone | `components/projects/floor-plan/plan-print.tsx` (`FitPaper`, the house `PaperViewer`) · `plan-print.module.css` (`.fit` · `.fitInner` · `.fitPress` · `.fitGhost` + the print rules) · `plan-print-ghost.tsx` · **`components/quotes/confirm/paper-viewer.tsx`** (two optional props, below) | ≤767: the plan and its legend are drawn at their size and scaled whole to the stage's width — nothing scrolls sideways; a tap (or Enter / Space) on one opens the house paper viewer **on that page** — fit to width, pinch or double-tap to zoom, a swipe or a dot to the other page, Download; its ← ("Back to the marked plan") comes back to the page, where Include Studio only, Back to the plan and Download stay. Printing draws the papers at their size from either (while the viewer is open, its copy prints, not the page's). The loader draws the two fitted papers. Tablets and the desk: the papers at 1:1 as before |
| **W3-16** `StatTiles` at ≤374 | `components/om/stat-tile.{tsx,module.css}` · Finance's two copies of the rule (`components/finance/finance.module.css` `.tiles3`, `books/books.module.css` `.tiles`) · `components/projects/money/project-money.tsx` + `components/finance/books/project-profit.tsx` (`figure`) | Two across down to 320 on every page with house tiles (the Projects listing's five now 2 + 2 + 1 at 320 — they filled the first screen one a row). Two defects that rule would have brought, fixed in the house piece the same way for every page: **a long figure steps down the type scale to fit its tile** (`data-fit` = its longest word in characters; h3 → h4 (16, the same 24 line) → h5 (14), by the tile's own width — "S$121,087.50" ran 20 – 54px past its tile at 320 – 390 on the Dashboard, a project's Money, Reports › Sales and Finance, Commission; it was already spilling at 360 – 390 before this round), and **a row too narrow for two tiles that each keep ~126 reads one a row** (a container query on the row's own width — inside a card's insets at 320, the Dashboard's Where it stands and Qanvast Ops › Studios, two across broke "CONTRACTO / RS"; by the row's width, so the ghost on the same row reads the same). The desk and tablets unchanged |
| **W4-12** "Used by n quotes" on a touch card | `components/company/templates/quote-templates-gallery.module.css` (≤767 and touch ≤1199) | The link is a 44+ press (46): an inline-block whose 15 above and below are given back as margin (an inline link's padding took no presses above its line in Chromium); the foot line's clip opens 12 upward (given back) and stands over the card's open press (positioned, as that press is), letting presses through except on its link — beside the link the card still opens. A real tap 12 above the words opens that template's quotes; the drawn line (one line, cut with an ellipsis) where it was |
| **K-10** a project's page on a phone held sideways (the orchestrator's addition) | `components/projects/project-frame.module.css` (`.projectPage` under C1's media query: `(min-width: 768px) and (max-width: 1024px) and (orientation: landscape) and (max-height: 500px)`) · `project-frame.tsx` (the class on the page) | 844 × 390: the header (8 + 72) scrolls away with the page and only the tab strip (48) stays pinned, at the screen's top, the Create strip docked under it — they had taken 128 of the 390. The lead page's rule (C1, `app/leads/[id]/overview.module.css` `.leadPage`) on the project's own page: `.projectPage > header` unpinned (more weight than the header's own rule wherever the sheets land), `.projectPage > .stickyTabs.stickyTabs { top: 0 }`, `--detail-pinned: 48px` — **which the Create strip and the info column's jump targets read from C1's `quick-links.module.css` · `info-column.module.css`** (this lane verified on a build with those two C1 files in, as main will have them; without them the Create strip keeps its old 124 offset). 667 × 375 is a phone (≤767): the header already scrolls away there (REG-301) and the strip pins under the phone's bar — checked. The strip stays at every width (REG-2734); the desk unchanged |
| **W6-04** the two `next dev` ≠ production pairs | `components/projects/designs/designs.module.css` (`.list.list`, desk and ≤767) · `app/settings/settings.module.css` (`.gateField.gateField`, desk and ≤767) | Production now draws what the code asks (and `next dev` always drew): the Designs view's layouts list 8 · 20 · 20 (16 on a phone), the Lost reasons' gate field 200 beside its name. **Deliberate desk changes** (below) |

## The load order (the round's rule, kept)

Every build of this lane re-split the CSS chunks, and two of them flipped same-weight overrides outside the eight calls — build 4: the
Schedule's ask band (`.nudge` over the quote banner) and the Money / To do amounts; build 5: the Floor plan's band (`floor-plan.banner` over
`template-bar.banner`: 4px taller, the quote banner's bottom rule back). Found by the 1440 pixel diff and by `css-order-scan.cjs` (its 107 routes
plus 60 of C2's own — four projects' tabs, a ticket's panel, the papers, Workload › Contractors and the portal **signed in** —
`work/scan2.cjs`), at 1440 · 390 · 1024. The fix where a flip lived: `.banner.banner` (+ `.banner.banner[data-tone='changes']`) in
`floor-plan.module.css`, keeping the base build's look. **Builds 6, 7 and the final clean build 9 against the base build: 0 flips, 0 new pairs** at all three widths
(the held ones are W1-02's doubled phone badges and W6's `.bannerActions.bannerActions`). Every override of this lane's that sits over another
file's class is doubled (`.photo.photo`, `.list.list`, `.gateField.gateField`, `.banner.banner`, `.projectPage > .stickyTabs.stickyTabs`); the
StatTile rules are the house file's own (no cross-file pair).

## The 1440 comparison

60 routes and open states (the projects listing and Workload, four projects' Overview · Schedule · Floor plan · Tickets (with a ticket's panel
open, on the project and on the rail's Tickets) · Messages · Designs · Money · Compliance · Choices, the floor-plan papers ×2, /chat, the
Dashboard, Reports × 6, Finance › To do · Xero · Commission · Vendors, the X-Ray reading, Qanvast Ops › Studios · Lead credits · Reviews, a
Hangout's How it went, Templates › Quotes (grid and list) · Contracts, Settings › Lead management · Roles & access, and eleven portal pages
signed in as Benjamin), full page, a mouse at 1440 × 1024, reduced motion, animations frozen (`work/shoot.cjs`); the base build shot twice
(the noise floor: Reports › Meetings' last-90-days line, 36px, differs between its own two runs). **Final build: 57 of 60 identical**; the
3 others (build 6 also showed Reports › Meetings' noise-floor line):
- Projects › a project › Design › Designs (Benjamin, Ryan) — **W6-04, deliberate**: the layouts list takes its 8 · 20 · 20 inset;
- Settings › Lead management — **W6-04, deliberate**: the Lost reasons' gate field stands 200 wide;
`StatTiles`' new attributes (`data-fit`), the portal's `.navWrap`, the papers' builder and the doubled photo change no pixel at 1440 — the
Dashboard, Reports, the Projects listing and the X-Ray reading included.

## Every width the calls touch (before → after, the same scripts, `shots/before` · `shots/after`)

- **320** (touch): the tile pages shorter (two across — the Projects listing −128, Reports › Health −620, Workload › Contractors −248), each read:
  no caption broken inside a word, no figure past its tile; the floor plan +48 (its views' own line); the papers fitted (1789 → 640).
- **360**: only the long figures changed (they fit their tiles now — the Dashboard, Reports › Finance · Sales · Meetings, Ryan's Money); the rest
  identical but a relative date ("26 days" → "27 days").
- **375 · 1280 (mouse)**: identical.
- **390**: identical but the Designs list (W6-04's ≤767 inset) and the papers.
- **768 × 1024 · 820 × 1180 upright**: the Schedule's rows (W3-04); the portal's bar (W3-14). **1024 × 768 · 844 × 390 · 900 (mouse)**: the portal's
  bar only; the Schedule's timeline identical.
- No page the calls touch scrolls sideways at 320 or 844 × 390 (probe §9).

## The probe — `verify-rwd-c2.cjs` (128 checks, real taps)

1 · W3-04 at 768 and 820 upright: the rows, no scale / full screen, the toolbar's end kept, every name whole, no sideways scroll, a tap opens its
milestone; 1024 sideways and 1440 keep the timeline; the held ghost upright draws the rows. 2 · W3-10: the ticket's photo 64 × 64 at 1440 · 1280 ·
390. 3 · W3-13 at 320 and 374: the views on the first line with Floor plan whole, the tools at the second's end; a tap on Designs goes there;
375 one row. 4 · W3-14 at 768 upright signed in: the row scrolls and a fade shows where more waits — only the far end at its start, only the near
end at its end; a tap on the last section (under the fade's edge) goes there; 1440 no fade. 5 · W3-15 at 390 and 320: no sideways scroll, both
papers fitted to the stage; a tap on the legend opens the viewer on page 2, two dots, a page 358 wide, a dot goes to the plan, ← says "Back to
the marked plan" and comes back to the page; 1440 the papers at 1123, no viewer. 6 · W3-16 at 320 and 390 on ten pages: two across where the
row holds two (≥ 264), one a row where it doesn't, no caption broken inside a word, no figure past its tile, no sideways scroll; 1440 every
Dashboard figure at 20. 7 · W4-12 at 390 and 768 touch: the press 46 tall, a press 13 above and below the words lands on the link, the words
under the card's second line, a real tap 12 above opens that template's quotes; beside the link the band still opens the card. 8 · W6-04 at
1440: the Designs list 8 · 20 · 20, the gate field 200. 9 · no sideways scroll at 320 or 844 × 390 on the touched pages (portal signed in).
10 · K-10 at 844 × 390 and 667 × 375 on Benjamin's Schedule scrolled 400: the header has gone with the page, the tab strip alone pinned at the
screen's top, the Create strip docked under it (844), no sideways scroll, a tap on the pinned strip's Money goes there; 1440 the header sticky at
8 with the strip under it. What a visit stamps is put back. **128 / 128** on build 7 (the eight calls + K-10, with C1's two stylesheets in).

## Regression

Through `design-source/verify/regression/run.cjs` (the registered ids) and `work/run-c2.cjs` (the same mechanics, for the Projects and portal
probes the harness doesn't list — every one that reads the Schedule, the floor plan, the tickets or the portal), each on a fresh copy of
`rwd-calls/base.db`, `next start` on :3212 — build 6 (the eight calls):

| probe | | probe | | probe | |
| --- | --- | --- | --- | --- | --- |
| rwd-c2 | 118 / 118 | pm2-s17 | 130 / 130 | pj-r1 | 98 / 98 |
| rwd-w3 | 29 + 1 → **57 / 57** ¹ | pm2-s23 | 148 / 148 | pj-r2 | 87 / 87 |
| rwd-w4 | 38 / 38 | st-r1 · r2 · r3 | 58 · 30 · 30 | pj-r3 | **90 / 90** ² |
| rwd-w6 | 68 / 68 | folders-galleries | 44 / 44 | pj-r4a · r4b | 73 · 75 |
| overlays | 67 / 67 | tpl-parity | 20 / 20 | pj-r5 · r6 | 91 · 82 |
| ghosts-same | 76 / 76 | xr-r1 | 27 / 27 | pj-r7 · r8 · r9 | 67 · 67 · 66 |
| ghosts-same-390 | 76 / 76 | ks | 29 / 29 | pj-fix-B · E · F | 53 · 50 · 44 |
| pj-gap-b | 72 / 72 | pj-gap-c | 104 / 105 ³ | pj-gap-d | 65 / 65 |
| pj-gap-f2 | 84 / 84 | pj-gap-g | **67 / 67** ² | pj-gap-h · i | 80 · 81 |
| pm-f | 60 / 60 | | | | |

¹ rwd-w3 §4 tested the timeline's grip and bars on an upright tablet, where W3-04 now puts the rows — its touch checks moved to a tablet held
sideways (1024 × 768), where the timeline lives under a finger, commented `(held calls 2026-10-24, W3-04 — a deliberate change of this rule)`;
57 / 57 on build 7. ² pj-r3 and pj-gap-g read their sample files from `public/` by a path the harness's lane copy can't climb (`ENOENT …/C2/public/…`
— not a test of the build); run in place on build 7: 90 / 90 and 67 / 67. ³ "390: the outside people on the task cards" fails the same on the
unchanged base build (run side by side, `direct/pj-gap-c-base`) — the lead's task cards (C1's area), below.
Build 7 (+ K-10): rwd-c2 128 / 128, rwd-w3 57 / 57, pj-r3 90 / 90, pj-gap-g 67 / 67; order scan 0 flips; 1440 57 / 60 identical (the three W6-04
shots).
**The final source** (this worktree as left — C1's two stylesheets back to main's), a clean build (`rm -rf .next`, build 9, green): order scan 0 flips
and 0 new pairs at 1440 · 390 · 1024; 1440 57 / 60 identical (the three W6-04 shots); rwd-c2 127 / 128 — the one miss is §10's docked Create strip
(124 without C1's `--detail-pinned`, 48 with it), as expected until both halves land. `npx tsc --noEmit -p .` clean; `npx eslint app components
lib` the three known quote-editor errors (19 warnings, as on main); `npm run design:lint` nothing new (raw-type 102 / 102).

## Shared pieces changed

- **`components/om/stat-tile.{tsx,module.css}`** (mine this round): `StatTile` gains `figure?: string` (the figure's words when `value` is an
  element) and sets `data-fit` from the figure's longest word (8 – 14); the row is a named container (`stat-tiles`) and a fitted tile a
  named container (`stat-tile`) ≤767 only. Every page with house tiles follows (the call).
- **`components/quotes/confirm/paper-viewer.tsx`** (in neither lane's list — the house viewer the call names): two optional props, `backLabel`
  (default "Back to the quote") and `startPage` (default 0). The quote's Preview, the contract's Preview and the client's confirm page pass
  neither, so they are unchanged.
- **`components/finance/**`** (in neither lane's list — Company › Finance is Company's): the two copies of the old ≤359 one-a-row rule
  (`finance.module.css` `.tiles3`, `books/books.module.css` `.tiles`) removed so Finance follows the house tiles; `books/project-profit.tsx`
  passes `figure`.
- `components/projects/threads/thread.module.css` is also the portal's Messages and Issues and the studio's /chat: their photos are the 64
  everywhere (they already were on this build).

## For C1

- **K-10 on a project's page depends on your `--detail-pinned`** in `components/leads/detail/quick-links.module.css` and `info-column.module.css`:
  the project page sets it (48) in the same media query as your `.leadPage`. Land both together; with only this lane's half the Create strip
  keeps its 124 offset on a phone held sideways (the tab strip and header behave either way). My probe's §10 asserts the docked Create strip.
- **pj-gap-c** — "390: the outside people on the task cards" (`[data-testid="outside-badge"]` on the project's Tasks at 390) fails on the
  unchanged base build as well: the lead's task cards (`components/leads/tasks/task-card*`, Leads on the move L4) no longer show the outside
  person's badge that the table rows do. W3 noted it too; not this round's.
- **`components/om/scope-pill.module.css`** — at 320 the Projects listing's "Open projects (4)" pill cannot shrink, so its label runs under
  the folded search glyph (seen on the unchanged base build too; the Leads listing's toolbar is the same row — worth a look at 320 there).
  The fix in the house pill: `.pill { min-width: 0; max-width: 100%; }` and `.label { min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; }` (the toolbar's `.left` / `.pillWrap` already allow it to shrink). Not one of the calls; listed, not built.

## ▲ For Vicky

1. **K-10 on a project's page** (the orchestrator's addition) — the same reading as the lead's: held sideways, the header scrolls away; only the
   tab strip stays.
2. **W3-04** — on an upright tablet the Schedule loses Weeks · Months, Today, Full screen and the legend with the timeline (the rows have no scale).
   To keep a way to the timeline there, the ⋮ could offer it — not built (a new control).
3. **W3-15** — "Back to the marked plan" is the viewer's ← on this page (its tooltip and name only; the quote's says "Back to the quote"): minimal
   invented words, the page's own name for itself (its loader reads "Loading the marked plan"). The press on a paper is named "Open page n of N"
   (screen readers only).
4. **W3-16** — two rules the call didn't spell out, needed so two across never breaks a figure or a caption: long figures step down to h4 / h5 on
   a phone (consistent within a row only when both figures are long); a row narrower than 264 (a card's insets at 320) stays one a row.
5. **W6-04** — the two desk changes (the Designs list's inset, the gate field's 200) are production catching up with the code; to keep the old
   production look instead, the doubled rule goes.

## Principles check

1. The mock wins — every change is one of his eight calls or the orchestrator's ninth (K-10); the two rules W3-16 needed and the two words W3-15 needed are written above (▲).
2. One system — the house `PaperViewer`, `ScrollPagers` (ChipRail's) and `StatTiles` reused, not copied; type steps are type tokens
   (`design:lint` 0 new); every cross-file override order-proof.
3. Plain words — no visible word added but "Back to the marked plan" (a tooltip).
4. Nothing is lost — the Schedule's figures, toolbar and every milestone stay on an upright tablet (the timeline's own scale tools go with it,
   ▲ 2); the papers' switch, Back and Download stay; the floor plan's tools all stay.
5. Say why — unchanged.
6. Back returns where you came from — the viewer's ← returns to the papers' page; the page's Back to the plan unchanged.
7. Every screen is whole — the Schedule's, the floor plan's and the papers' loaders draw the new shapes; the tiles' rules key off the row's own
   width so a ghost reads the same.
8. Every width is designed — 320 · 374 · 375 · 390 · 667 × 375 · 768 / 820 upright · 1024 sideways · 844 × 390 · 900 / 1280 mouse · 1440 checked;
   1440 identical but W6-04's two deliberate changes; a project's page keeps its tab strip at every width (K-10 pins it alone, sideways).
9. Tables follow the leads listing — unchanged.
10. Motion with purpose — no new motion (the viewer's is the house one).
11. Honest data — no data touched; the probe puts back what a visit stamps.
12. Reach for everyone — 44+ presses (Used by, the papers as buttons with keys), the paper press reachable by Enter / Space.
