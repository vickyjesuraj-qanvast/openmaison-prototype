# Lane W6 — outcome: the hand-offs, a load order that cannot flip the desk, the sweep before → after (2026-10-24)

His ask: "run a overall responsiveness audit and fix all the issues across devices and breakpoints based on your recommendations" — every call
here is the recommendation; nothing committed. His rule kept: a lead's and a project's page stay one page with their tab strip at every width;
nothing here adds a screen, a level or a flow. Built in the lane's worktree from its WIP base (`dc8fe304` = main with W1…W5 landed), verified on
production builds on :3206 over fresh copies of the round's base DB; the pre-audit tree (`dd4ad5ac`, the lanes' own WIP base = f85e0e94 +
wip.patch + wip-untracked) built beside it on :3207, and `next dev` of that tree on :3208 for the load-order question. Working files:
`scratchpad/rwd-all/W6/` (`bin/` the scripts · `x1…x6` the hand-off measures · `notch0/1` the notched-phone sweeps · `order*.json` · `pre1440a…g` ·
`mine1440a…g` · `sweep-after` (build 3) · `sweep-final` (build 5) · `sweep-final6` (the final build) · `reg` · `reg2` (the final regression)). The hand-off ledger: `audit-w6.md`. Rows: `reg-w6.md` (REG-W6.1…16). Probe:
`design-source/verify/responsive-all/verify-rwd-w6.cjs` (registered `rwd-w6`). A new tool for every later landing:
`design-source/verify/responsive-all/css-order-scan.cjs`.

## 1 · The hand-offs (the ledger: `audit-w6.md` §1)

51 items from the five lanes' *For other lanes*: **31 built here**, **11 already fixed by the lane that owned the file** (ledger H-05 · 07 · 08 · 14 ·
17 · 20 · 21 · 22 · 33 · 36 · 42 — W1-01 · 03 · 04 · 05 · 07 · 08, W3-01, W4-06 · 08, W5-02 · 11, the skeleton's 144 at landing — each
re-measured on the landed build), **1 not a defect**
(contenteditable editors type at 16 — measured), **2 not built** (house refactors with no defect left: a standalone-link option, ChipRail
centring), **3 his call** (StatTiles at 320, the sticky header + strip on a phone held sideways, the view switches starved at 320 — each a lane's
▲), **3 nothing to do** (a note, nothing found). Two rows carry a mixed answer (H-28's lead pieces, H-40's card). **All five known blockers
are built**: W4-17 (the definition list), W4-15 (the coaching row), W5-31 (the Dropdown on a phone held sideways), W5-36 (the Company panel),
the quick-links strip under the Maison AI button.

What W6 built, by area (rows REG-W6.1…16):
- **Blockers** — `components/om/definition-list.module.css` (≤360), `components/projects/project-overview.module.css`, `components/leads/dropdown.tsx`,
  `components/company/company-popover.module.css`, `components/leads/detail/quick-links.module.css`.
- **A phone held sideways** — the house Dialog's 8 above and below in the 12 hand-rolled overlays (the ledger, H-03); the house Filters rail
  (`components/om/filters-modal.module.css`, W2's four copies retired); the Tag picker (`components/leads/tasks/tag-picker.module.css`).
- **44 under a finger** — `components/projects/money/money.module.css` (`.nameLink`), `components/leads/{quotes/quotes-table, contracts/contracts-table,
  tasks/tasks-table}.module.css`, `components/om/scope-pill.module.css`, `app/globals.css` (an md search bar's input · a DS Radio),
  `components/visualizer/{editor/stage, share/render-share-page}.module.css`, `components/contracts/editor/contract-editor.module.css`,
  `components/om/date-picker.module.css` (and the card's misfires, W6-03).
- **Words** — `components/leads/detail/{info-column, card}.module.css`, `components/projects/money/money.module.css` (`.sub .inlineLink`),
  `components/om/dialog.module.css` (the foot below 360).
- **A notched phone held sideways** — `components/leads/review-banner.module.css`, `components/leads/tasks/quick-add.module.css`,
  `components/quotes/screen/section-list.module.css`, `components/quotes/editor/section-card.module.css`, `components/contracts/screen/section-screen.module.css`,
  `components/templates/editor/template-editor.module.css`, `components/visualizer/editor/editor.module.css`, `app/leads/leads.module.css`,
  `components/leads/files/file-viewer.module.css`. The notch sweep (`bin/notch.cjs`, 45 routes, CDP insets 47 · 0 · 47 · 21) found **9 pinned bars
  with a control in an unsafe band** on the landed build, **0 after** (one frozen table cell at the fold is left — scrolling content).
- **The house** — `components/shell/shortcuts/{shortcuts-layer.tsx, dom.ts}`; `app/globals.css` (REG-306 on a phone held sideways);
  `components/om/sheet.tsx` (the foot followed every frame of the slide; `lowOnly` for a dialog); `components/om/dialog.tsx` +
  `components/om/snackbar.module.css` (a tall dialog lifts the bar on a tablet); `components/shell/page-reveal.module.css` (`clip`);
  `components/leads/detail/tab-ghosts.tsx` + `lib/ghost-shapes.server.ts` + `components/quotes/list/quotes-workspace.tsx` +
  `components/leads/quotes/lead-quotes.tsx` (the Quotes ghost's to-do line — the server's seed for the loader, the remembered shape for the
  reveal, so REG-708's loader = reveal holds; S42 C-19's Meetings way).
- **Found by the closing sweep** (§4) — `components/leads/detail/info-column.{tsx,module.css}` (a project's document links),
  `components/qanvast/account/account.module.css` (a review's Read more), `components/visualizer/editor/{editor, describe-box,
  versions-strip}.module.css` (Compare · the mic · the client's notes badge).

## 2 · The load order (job 2)

**How it was found.** W1's static scan (`fragile-composes.cjs`) reads the sheets; it cannot see which overrides a build actually flips, nor a
pair handed together without `composes` (the planner's tabs), nor a `font` shorthand on one class over another's digits. W6 wrote a runtime
scan: on every route of the sweep, for every element wearing classes from two CSS modules, every longhand both set in a plain single-class rule
(same weight, unlayered, active at that width) — the pair's winner is the order the build emitted the two sheets. Run on the pre-audit
production build, the landed build, each W6 build and `next dev`, at 1440 · 390 · 1024 (`bin/order-scan.cjs`, 107 routes; ~180 such pairs a
build; the final build at seven sizes). Kept for the developers as `design-source/verify/responsive-all/css-order-scan.cjs` (`scan` · `cmp`: a
pair whose winner moved but whose computed value did not is *held* by a stronger rule; one whose value moved is a *flip* to fix; a pair only
the new build has is listed with its winner to read).

**What flipped, and the fix (each a doubled class in the file that owns the override; never `!important`):**

| pair | flipped on | pre-audit build drew | the fix | 1440 now |
| --- | --- | --- | --- | --- |
| the planner rail's `.tabs3` / `.tabs4` over the Visualizer rail's `.tabs` | the landed build | five slots for three tabs | `.tabs3.tabs3` · `.tabs4.tabs4` — three even tabs (the code's intent, what `next dev` draws) | ▲ W6-01 (changed, recorded) |
| an activity card's `.cardThumb` (48) over the house thumb (36) | the landed build | 36 | `.cardThumb.cardThumb` — 48 (intent, `next dev`) | ▲ W6-02 (changed, recorded) |
| the Choices band's 20 sides over the quote banner's 24 | W6's build 2 | 20 | `.band.band` (desk and phone) | as pre-audit |
| Settings › Finance › Invoice paper preview's 12 over the brand kit well's 24 | W6's build 2 | 12 | `.previewPage.previewPage` | as pre-audit |
| a Money banner's 16 sides, corners, no rule over the quote banner's (W1-26) | W1's build | 16 | `.banner.banner` + `.banner.banner:not([data-tone='changes'])` (a request for changes keeps the quote banner's rule, as it always drew) | as pre-audit |
| Commissions' / Reports › Finance's `.strong` font shorthand over `.num`'s tabular digits (W1-26) | W1's build (and `next dev`) | tabular | `.num.strong { font-variant-numeric: tabular-nums }` | as pre-audit |
| a phone Money banner's buttons at the start over the quote banner's end | W6's build 2 (390) | start | `.bannerActions.bannerActions` (≤767) | phone only |
| the project's site bar on a phone: its items' width and spacing over the dock's | the landed build (390) | the dock's 64 and space-between | `.siteItem.siteItem` · `.siteBar.siteBar` — the bar's own (intent, `next dev`) | ▲ phone only |
| the Quote screen's amounts' tabular digits over the item cards' `font` shorthand | W6's build 2 — and page to page inside one build | page-dependent | `.captionAmount.captionAmount` | ≤1024 only |
| the template structure pane's eye fade over the house icon button's | W6's build 2 | the button's hover fill | `.eye.eye` with both transitions | no static change |
| Company › Profile's About pictures (120 × 90) over the house thumb | `next dev` (production held 120 × 90) | 120 × 90 | `.pic.pic` | as pre-audit |
| **a lane's own new override losing**: W3-18's Money row words (`flex: 1 1 260px`) and row gap under the quote banner's `flex: 1` / `gap` | W6's build 5 (768 · 1024 · 390) — `rwd-w3` caught it: the words back at 86 wide | — (the rule is this round's) | `.banner.banner` · `.bannerText.bannerText` (≤1439) | ≤1439 only |
| W3-03's paper title row gap (4) under the quote preview's `gap` (12) | W6's build 5 (390) | — | `.headWrap.headWrap` (≤767) | phone only |

A pair that only the new build has is a fix this round added — and order decides it too: the scan now lists those *new pairs* with their
winner, and both of W3's above lost on one build. **The final build** (build 6), scanned at **1440 · 1280 · 1024 · 844 × 390 · 768 · 390 · 320**
against the pre-audit build: **0 flips whose value moved, 0 new pairs** — the only moved winners are *held* by a doubled class (the Updates band,
W3-20's `.band.band`; the phone Money buttons) and W1-02's deliberate phone badges (hidden at a desk). The static scan: **121 → 112** fragile
overrides (`fragile-composes.cjs`); the rest have never flipped on any build scanned and are left as they are (doubling one changes nothing
until a build flips it, and the scan says which).

**`next dev` and production disagree** on two more pairs this round did not flip (they hold their pre-audit production look; ▲ W6-04):
- Projects › a project › Design › Designs: the list's padding — production draws the layouts dialog's 0, `next dev` the Designs view's own
  8 · 20 · 20 (`components/projects/designs/designs.module.css .list`);
- Settings › Lead management: the gate field — production lets the house field grow (`flex: 1`), `next dev` holds the 200 the settings sheet
  asks (`app/settings/settings.module.css .gateField`).
The one-line fix for each is the doubled class; recommended (the code's intent), not built — it changes the desk from the approved build.

## 3 · The 1440 comparison (job 2)

The pre-audit build shot twice in the morning (`pre1440a` · `pre1440b` — the noise floor: 17 of 390 differ between them, the rail's credit ring
and a Send ▾ animation frame) and the final build once (`mine1440e`), on fresh copies of the base DB, 1440 × 1024, a mouse, reduced motion, the
caret hidden, animations frozen (`bin/shots1440.cjs`): **126 routes** (the sweep's 109 + the website, account and not-found pages), viewport and
full page, **+ 138 open states** — the first header menu, Filters and Column settings on every route that has them, and 24 named openers (the
rail's Company · Tools · Search · bell · studio block, Add Lead, the stage menu, the task panel, New project, the project ⋮, a Money row ⋮,
Create Quote, the Preview's Send ▾, New contract, New template, New item, New cost, Add member, a Settings dialog, Add question, Plan a meeting,
the Visualizer's New ▾, a hovered row). A shot passes when it matches either morning shot to the byte (`bin/pdiff.cjs`).

| | shots |
| --- | ---: |
| identical to a pre-audit shot | **369 / 390** |
| deliberate, recorded: the planner rail's three tabs (W6-01, ×2), an activity picture's 48 (W6-02, full page), the Preview's Send ▾ opening leftwards (W5-12) | 4 |
| the clock, the run and the port: the Dashboard's "Good morning" → "Good afternoon" (×7 with its rail states), Reports › Meetings' last-90-days counts (×4), Finance › To do's "1d ago" → "2d ago" (full page), the unread-message count a run's earlier visits had read (Updates ⋮, Tickets' Filters), the website hero's entrance animation (full page), Client portal's address (`localhost:3206` vs `:3207`, ×2) | 17 |

Those 9 routes were re-shot on both builds back to back in the afternoon on fresh DBs (`pre1440f` · `mine1440f`, 26 shots with their open
states): **23 of 26 identical** — two are the port's digit in the portal's address, one the website's hero animation (a second pair,
`pre1440g` · `mine1440g`: identical). (The same exercise on build 5: 13 of 14.) Nothing else moved: every layer the round touched at a desk
draws as the pre-audit build did.

## 4 · The sweep, before → after (job 3)

`scratchpad/rwd-all/sweep.cjs` on the final build (545 page-widths: 109 routes × 320 · 390 · 768 · 1024 touch · 1280 mouse), against the round's
`out/sweep-before.json` — counts are the sweep's own (findings per page-width, each list capped at 40). `bin/sweep-cmp.cjs`; the final run in
`W6/sweep-final6/` (shots beside it; build 5's run, `sweep-final/`, reads the same to the finding).

| module | sideways (pages) | offscreen | covered | target < 44 | a phone's input < 16 | clipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| House · public (W1) | 0 → 0 | 0 → 0 | 0 → 0 | 41 → **0** | 6 → 6 | 9 → 3 |
| Leads · work (W2) | 0 → 0 | 0 → 0 | 129 → 119 | 234 → 34 | 4 → 2 | 25 → **0** |
| Projects · portal (W3) | 0 → 0 | 0 → 0 | 139 → 118 | 135 → 29 | 2 → 2 | 6 → **0** |
| Company · Settings · Finance (W4) | 0 → 0 | 1 → **0** | 62 → 32 | 277 → 30 | 11 → 11 | 84 → 7 |
| Tools (W5) | 1 → **0** | 1 → **0** | 29 → 23 | 157 → 36 | 0 → 0 | 16 → **0** |
| **all** | **1 → 0** | **2 → 0** | **359 → 292** | **844 → 129** | **23 → 21** | **140 → 10** |

(After the hand-offs, before the closing sweep's own fixes, build 3 read 139 targets; the five found there — a project's document links, a
review's Read more, the Visualizer's Compare, its mic, the client's notes badge — are built, 129.)

**What is still listed, read one by one — none is a defect left for this round:**
- *target* (129): in-sentence help links (`help-link`, 27 — REG-273's inline exemption) · the info column's copy / WhatsApp glyphs and contact
  rows (24 — REG-365 / REG-379, his) · the Schedule's bars (11 — their press is 44 through `::before`, W3-05, checked by tap; the sweep reads the
  drawn 20) · the phone cards' names on Quotes · Contracts · Meetings · Tasks (30 — the whole card is the press, W5-16 · C-11) · the Marketplace's
  deal ribbon (8 — his call, W5) · the Notes composer's tools at 320 (6 — his call, W2-13) · the Visualizer's markers (6 — W5-05's `--reach`,
  44 where neighbours leave room) · a task card's lead (5 — his call, W2-06) · X-Ray's eyebrow link (4 — fine print, W5-23) · the kanban's rail
  (4 — the mock's, K-5) · *Used by n quotes* (3 — his call, W4-12) · the describe box's line (1 — its field focuses it on any press).
- *covered* (292): rows that scrolled under a sticky head or tab strip at a page's end, a table's hover-parked ⋮ at 1280 (W1-17), chips past the
  edge of their own scrolling rail (W3), rows passing under the sticky quick add / review banner / sideways bar (REG-570), the Visualizer's
  marks on a version tile's corner — scrolling and design, each read by the lanes; at a page's end the Maison AI button now covers nothing it
  can't scroll clear of (4 → 1, the one a hover-parked ⋮ mid-page at 1280).
- *a phone's input < 16* (21): the house TextField's inputs and Finance's searches read 14 in Chromium; on iOS REG-306 types every input at 16
  (W1-18, verified by emulation) — and now on a phone held sideways too (REG-W6.13).
- *clipped* (10): the quote template editor's rotated SAMPLE watermark (W4), the website's hero conveyor (W1-27), the contract templates'
  scaled thumbs (W4).

**Beyond the sweep's columns**, measured by W6's own passes on the final build: a notched phone held sideways (`notch.cjs`, 45 routes) —
9 pinned controls in an unsafe band → 0; the hand-offs' opened layers at 844 × 390 (the Company panel, the Dropdown's sheets, the Tag picker,
Create New Lead, the Filters rails) all on the screen; 320 and 844 × 390 — no page of the probe's 15-module sample scrolls sideways.

## 5 · ▲ Decisions for Vicky

1. **W6-01 · W6-02 — the desk now draws what `next dev` always drew**: the 3D Space Planner's rail shows its three tabs as three even columns
   (the pre-audit production build put them in five slots) and an activity card's picture is 48 (it was 36). The landed build had already
   flipped to these; W6 made them hold (`.tabs3.tabs3`, `.cardThumb.cardThumb`). To keep the old production look instead, the doubled rule goes.
2. **The project's site bar on a phone** (Photos · Done · Note · Message) keeps its own item width and spacing (`next dev`'s), not the dock's 64 /
   space-between that the pre-audit production build drew.
3. **W6-04 — two more `next dev` ≠ production pairs, left as production draws them**: the Designs view's list padding (production 0, the code's
   8 · 20 · 20) and Settings › Lead management's gate field (production fills the row, the code asks 200). Recommendation: make the code's
   value hold (one doubled class each) — a desk change, so it waits for you.
4. **W4-17 at ≤360 only** (W4 proposed ≤767): 320 and 360 stack the name over Required · Active; 375 and 390 keep the drawn three tracks.
5. **W5-31 — the house Dropdown is the phone's bottom sheet on a phone held sideways**, as PortalMenu has been since phone-12. W2 had kept the
   desk's anchored cards there, capped to the screen, and suggested the sheet for a later house round; the Visualizer's and the Planner's New ▾
   opened wholly below the screen, so this is that round. (The stage menu stays anchored and capped — W2-12.)
6. **The quick-links strip on a touch screen ≤1024** ends the Maison AI button's clearance (88) above the screen's foot: on a phone held
   sideways three glyphs show at once instead of five; the rest scroll above the button. A tablet's list fits and shows no change.
7. **The date picker's card on a touch tablet**: each day keeps its own 32 cell and each pager button its own 28 of the row (44 tall) — REG-347's
   40 / 44 boxes reached over their neighbours' drawn edges (a tap on the right of "9" picked the 10th); the month / year switch stands 44.
8. **A dialog foot with a start action below 360**: the start (Reset to the house draft, Send back…) always takes its own line, Cancel · Save under
   it together.
9. **A tall dialog on a tablet lifts the snackbar** 16 above its foot while open (only when its foot reaches the bar's band).
10. **The ? panel's and the tips' words** drop an icon's ligature (a desk-visible fix: "Stage: Met", not "Stage: Metkeyboard_arrow_down");
    tips no longer appear on a touch screen without a keyboard.
11. **Still his, from the lanes** (listed, not built): W1-20 the website's bottom bar on a phone held sideways · W1-14 the ? panel's keys on touch
    (built ▲) · W2-06 a task card's lead link · W2-13 the Notes composer's tools at 320 · B-06 · K-9…K-12 (a sideways phone's desk dialogs, the
    lead's sticky head there, the Reviews title at 320, the tablet table's "all five on 1024") · W3-04 the Schedule on an upright tablet · W3-10
    a report's photo 36 at the desk · W3-13 / W3-14 / W3-15 / W3-16 · W4-12 *Used by* at ~31 · W5's Marketplace ribbon · the ▲ calls W1-02,
    W2-01, W2-04, W2-12, W3-20, W4-01/02/04/07/25, W5-03/06/11/15 (built, to look at).

## 6 · Shared pieces changed (backward-compatible)

- `components/leads/dropdown.tsx` — the house Dropdown (136 callers): a sheet under `PHONE_SIDEWAYS` as well as ≤767; no prop changed.
- `components/om/sheet.tsx` — `useSheetFootLift(on, panel, opts?)`: `opts` is new and optional (`{ query, lowOnly }`); every caller unchanged;
  the foot is now followed frame by frame for the slide's 700 ms.
- `components/om/dialog.tsx` — a second, tablet-only lift (`lowOnly: 72`), no prop changed; `components/om/snackbar.module.css` reads
  `--sheet-foot` at 768–1024 too.
- CSS only in the other house pieces: `components/om/{dialog, date-picker, scope-pill, filters-modal, definition-list}.module.css`,
  `components/shell/page-reveal.module.css`, `app/globals.css`.
- `components/shell/shortcuts/{shortcuts-layer.tsx, dom.ts}` — the tip's device rule and `wordsOf`.
- `lib/ghost-shapes.server.ts` — new seed keys `tools.quotes.{approval, waiting, expiring}` and `lead.<id>.quotes.{…}` (one more read per request:
  the studio's quotes with their sent-to-client dates, the list's own rules); `components/leads/detail/tab-ghosts.tsx` — the Quotes ghost on the
  Quotes toolbar's own classes.
- New: `design-source/verify/responsive-all/css-order-scan.cjs` (the runtime load-order scan), `verify-rwd-w6.cjs`, its line in
  `design-source/verify/regression/probes.cjs`.
- Two stale probes brought to the rules other rounds made (§7): `design-source/verify/thumbs-2026-09-30/verify-thumbs-rest.cjs` (the phone
  Items cards' squares) and `design-source/verify/uat-dane-2026-10-01/P6/verify-p6.cjs` (the late-return step).

## 7 · The regression

On the final build (build 6), the harness (`design-source/verify/regression/run.cjs`) in two lanes (:3206 · :3207), every probe on its own
fresh copy of the round's `base.db` (`scratchpad/rwd-all/W6/reg2/`; reruns in `reg3/` — a copy restored to the baseline today — and `reg4/` —
the round's base again; `bin/tally-final.cjs` reads the three). **129 probes: every area W6 touched and every module's own** — `rwd-w1…w6`,
`ghosts-same`, `ghosts-same-390`, `overlays`, `pm2-s17` and the ghosts' capture tools; Leads (`ux-p1…p7`, `rl-fixes`, `rl-l2…l4`, `pm2-s05`,
`dane-*`, `ke`, `first-run-*`), Projects (`pj-r1 · r5 · r6`, `pj-gap-d · f2`, `pm-f`), Quotes (`rq-k1…k5`, `qe-r1…r5`, `pm2-s04 · s44f · s44i ·
s44q · s44t`, `pb-modal`, `pb-r1…r4`, `tpl-parity`), Contracts (`rc-c1…c4`, `ct-r1…r4`, `pm2-s03 · s11 · s29 · s42b · s44g · s44r`), the
shell (`search`, `kb-r1 · r2`, `view-as`, `panel-order`, `sw-r1…r5`, `fixes720`, `insights-head`), Company · Settings (`st-r1…r3`,
`folders-*`, `thumbs-rest`, `cr-r1 · r3 · r4 · r5`, `pm2-s01 · s09 · s30 · s31 · s35`), Tools (`xr-r1…r4`, `viz-*`, `rooms-menu`, `pm2-s10 ·
s23 · s27 · s42e · s43b · s46a…d`), `pm2-s02 · s42g · s43e`.

| | |
| --- | --- |
| first run | 122 of 129 green · 7,249 checks |
| **final** | **129 of 129 green · 7,498 checks, 0 failed** (the four capture tools — `ghosts-strips` · `ghosts-film` · `ghosts-measure` · `panel-order` — count no checks and exit 0) |

The seven that missed on the first run, each read to its cause — **none is this round's**:
- **The demo's day** — `pm2-s27` (17 / 6), `pm2-s42e` (30 / 1), `pm2-s43b` (59 / 1): the round's `base.db` was restored on 23 Oct and
  the run fell on the 24th, so the demo's "today" Hangout had ended (the probes press its chats). On a copy restored to the baseline
  today: **155 / 0 · 65 / 0 · 70 / 0**.
- **Load** — `pb-r3` (29 / 1, "the card shows the photo" read 600 ms after Save while three servers ran): **30 / 0** on the same base, twice.
- **The harness** — `pm2-s11` (0 / 0, exit 1): its `path.resolve(__dirname, '..', '..', '..')` is a shape `run.cjs`'s rewrite can't reach
  (Contracts' C2 met it too); run in place on a fresh copy: **62 / 0**.
- **Two stale probes, brought to a rule another round made on purpose** (each commented as such in the probe; nothing in the app changed):
  - `thumbs-rest` (16 / 1) counted the phone Items cards' squares, but Quotes on the move (K2, `item-cards.module.css .thumb`) draws the
    square only for a line with a picture; the base quote's lines carry none, so 0 squares — the same on the pre-audit build. The check now
    reads the cards and asserts every square they draw is a picture at 40: **17 / 0** (and with one line given a picture on a scratch copy,
    "1 square — 40 pic").
  - `dane-p6` (40 / 1, x-return): the Return Lead window opens on Leads on the move's late-return step (L3 · A-29) for a lead past Qanvast's
    30 days, and the demo's Gavin See arrived 56 days before the demo day — the same on the pre-audit build. The probe presses *Return it
    anyway* when the step shows: **41 / 0**.

Not run: `fp3d` (the Floorplan session's) and `pm2-s44o` (needs a build with `OPENMAISON_DEV_PREVIEWS=1`; nothing W6 touched is in it).
`design:anatomy` on the final build: §8.

## 8 · Checks

`npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three known `quote-editor.tsx` errors only · `npm run design:lint` — nothing
new (every count at its baseline, icon-button-overlay 2 of 2) · `npm run design:anatomy` on the final build (:3206, a fresh base DB): **90 pages,
315 table heads, 26 dialogs, 41 page menus — all 1,964 measures hold** · the production build green (six builds under the shared lock; the
final is build 6).
The probe `verify-rwd-w6.cjs`: **68 / 68** on the final build (real taps at 320 · 360 · 390 · 768 · 1024 · 844 × 390, clicks at 1280 · 1440;
read-only).

## 9 · Principles check

1. **The mock wins, and every exception is written down** — no mocked size, word or layout changed at the desk but the two load-order
   corrections (W6-01 · 02, ▲) and the ? panel's ligature (a fix); every fix is a REG-W6.n bug-fix row.
2. **One system, no one-offs** — the house pieces fixed once (the Dropdown, the Filters rail, the sheet lift, the scope pill, the date picker,
   the reveal), W2's four copies retired; the sideways-phone rule is the house Dialog's; doubled classes are the house's own order-proofing.
3. **Plain words** — no word added or changed (the ? panel and tips lose a stray icon name).
4. **Nothing is lost** — every control the defects hid (New ▾ below the screen, the Company panel's lower rows, Manage Tags, a glyph under the
   Maison AI button, a dialog's Save) is back on the screen.
5. **Say why** — no refusal touched.
6. **Back returns where you came from** — untouched (the Company panel and the sheets keep their links' `?from=`).
7. **Every screen is whole** — the Quotes ghost draws the page's to-do line and cards, the loader and the reveal alike (REG-708); the reveal's
   ghost layer clips without scrolling; `ghosts-same` and `pm2-s17` in the regression.
8. **Every width is designed** — 320 · 360 · 390 · 768 · 1024 · 844 × 390 (and a notched one) · 1280 measured; fixes inside ≤767 / ≤1024 /
   touch / `PHONE_SIDEWAYS` / ≤1439 queries or `env()`; 1440 diffed against the pre-audit build: 369 / 390 identical to the byte, 4 deliberate and
   recorded, 17 the clock, the run or the port (re-shot back to back: 23 of 26 identical, the 3 left the port's digit and a hero animation).
9. **Tables follow the leads listing** — the tablet tables' links and the project tasks' milestone grow their presses inside their cells; no
   column moved.
10. **Motion with purpose** — no motion added; the snackbar follows a rising sheet instead of jumping after it.
11. **Honest data** — the probe writes nothing; every run on a fresh copy of the base DB; no local.db touched.
12. **Reach for everyone** — 44 targets for every small press the sweep and the hand-offs found; keyboard paths unchanged; iOS's 16 on a phone
    held sideways.
