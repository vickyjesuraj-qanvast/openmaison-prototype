# W1 — outcome: the house pieces, the shell and the public / account pages (2026-10-23 → 24)

The audit: `audit-w1.md` (27 ids). The rows: `reg-w1.md` (REG-W1.1…20). The probe: `design-source/verify/responsive-all/verify-rwd-w1.cjs`
(59 checks, real taps and hit tests; registered in `design-source/verify/regression/probes.cjs` as `rwd-w1`, with the account and website probes
its files reach — `pm2-s01 · s09 · s30 · s31 · s35`); its shots and the before / after pairs in `design-source/verify/responsive-all/rwd-w1/`.
The CSS-order detector: `design-source/verify/responsive-all/fragile-composes.cjs`. Every fix is CSS inside a touch query, a ≤1024 query, the
phone-held-sideways query, an iOS `@supports` or `env(safe-area-inset-*)` (0 on every screen but a notched phone), or restates today's value at a
higher weight (the code boxes' digit, Your profile's two rows), plus one opt-in prop on the house `Keys` — so no W1 rule changes the desk.
Working files (scripts, sweeps, shots): `scratchpad/rwd-all/W1/`.

## Ledger
| id | status | where |
| --- | --- | --- |
| W1-01 the phone bar's avatar | **built** | `components/shell/mobile-nav.module.css` |
| W1-02 the More sheet's counts · the bar's and dock's | **built** ▲ | `components/shell/mobile-nav.module.css` |
| W1-03 the rail's studio block on a touch tablet | **built** | `components/shell/app-rail.module.css` |
| W1-04 crumbs under a finger | **built** | `components/om/crumbs.module.css` |
| W1-05 the folder card's select box | **built** (+ W1-25, the column card's kebab) | `components/om/folders/folder-card.module.css` |
| W1-06 the definition list's handle | **built** | `components/om/definition-list.module.css` |
| W1-07 every DS SegmentedButton under a finger | **built** | `app/globals.css` |
| W1-08 iOS zoom on textarea / select | **built** | `app/globals.css` |
| W1-09 search's foot on touch | **built** | `components/shell/global-search.module.css` |
| W1-10 the house Dialog on a phone held sideways | **built** | `components/om/dialog.module.css` |
| W1-11 the website's wordmark and Sign in | **built** | `components/site/site-shell.module.css` |
| W1-12 the website's back crumb | **built** | `components/site/pages.module.css` |
| W1-13 a notched phone held sideways | **built** | `components/shell/{app-shell,app-rail,maison-fab}.module.css`, `components/om/{snackbar,drawer,sheet}.module.css`, `app/(editor)/layout.module.css`, `components/site/{site,site-shell}.module.css` |
| W1-14 the ? panel's keys on touch | **built** ▲ | `components/om/keys.tsx` (`always`), `components/om/keys.module.css`, `components/shell/shortcuts/shortcuts-panel.tsx` |
| W1-15 Filters and Move on a phone held sideways | **built** | `components/om/filters-modal.module.css`, `components/om/folders/move-dialog.module.css` |
| W1-16 the ghost's L1 header at 320 | **built** | `components/shell/ghost-kit.module.css` |
| W1-17 the tables' "covered ⋮" at 1280 | **kept — not a defect** (hover + hit test, at rest and scrolled 400px sideways: every ⋮ answers its own click; the frozen column paints over the scrolled cells) | — |
| W1-18 TextField inputs at 14 in Chromium | **kept — not a defect** (REG-306 types them at 16 on iOS; verified by emulation) | — |
| W1-19 10–11px type (dock, DS Tag, the website's 1.0 type) | **kept** — the mobile canvas, the DS Tag, S35 | — |
| W1-20 the website's bottom bar at 844 × 390 | **not built — For Vicky** (a behaviour call) | — |
| W1-21 the side scrollbar over a row | **kept — not a defect** (REG-570's sticky bar) | — |
| W1-22 sign-in · sign-up wordmark link | **built** | `components/auth/sign-in.module.css` |
| W1-23 the website's Contact links | **built** | `components/site/pages.module.css` |
| W1-24 the code boxes on iOS | **built** | `components/om/code-boxes.module.css` |
| W1-25 the folder card's kebab on a phone (my W1-05's first cut) | **built** | `components/om/folders/folder-card.module.css` |
| W1-27 the website's hero snapshot "clipped" | **kept — not a defect** (a conveyor's waiting slide) | — |
| W1-26 CSS order between builds — 121 fragile composed overrides | **mine built** (`components/profile/your-profile.module.css`; W1-02); **the rest For other lanes / the orchestrator** — the detector `design-source/verify/responsive-all/fragile-composes.cjs` | — |

## ▲ Decisions for Vicky
- **W1-02** — the bar's and the dock's counts now sit where their rules always said (the bell's count 4 · 4 in its 44 box, the dock's −2 · −2 on
  the icon's corner); until now the bundler's CSS order drew them 2 · 2 inside. Shots: `rwd-all/W1/shots/probe/02-more-counts-390.png`,
  `rwd-all/W1/mont/more-avatar-prepost.png`. If he prefers the old look, the two lines to change are the `> .barBadge` / `> .dockBadge` values.
- **W1-14** — the ? panel shows its keys on a touch screen (Q-21 hides keys there everywhere else). Alternative: drop "Keyboard shortcuts" from
  search on a touch screen with no keyboard.
- **W1-10 · W1-15** — on a phone held sideways (768–1024 wide, landscape, ≤500 tall) a centred dialog spends 8 above and below instead of 24 / 48;
  the sides keep their margins. The query is new to the house (`lib/breakpoint.ts`'s `PHONE_SIDEWAYS` with a 768 floor, so a ≤767 phone's
  bottom sheets are untouched).
- **W1-13** — the shell pads by the safe-area insets at every width (no-op off a notched phone). The phone's own chrome (≤767) already did.

## Shared pieces changed (backward-compatible)
- `Keys` gained `always?: boolean` (default false — every caller unchanged).
- CSS only everywhere else; no class renamed, no DOM changed.
- Verify: `design-source/verify/regression/probes.cjs` (+ `rwd-w1`, `pm2-s01 · s09 · s30 · s31 · s35`), `design-source/verify/pending-modules/
  verify-pm2-s10.cjs` (the touch tablet's FAB at the page's end — the base's own rule).

## For other lanes
See `audit-w1.md` › *For other lanes* (W2 · W3 the quick-links strip at 844 × 390; W2 · W4 · W5 the hand-rolled overlays' 48 margins; W2 · W5
contenteditable zoom; W4 help-link and the library editor's handle; W3 the Client views' chip rail at 320; W5 the FAB at the Quotes and
Contracts lists' end; W2 the kanban's and the file viewer's 100dvh heights; every lane's fixed bars on a notched phone held sideways).

## The 1440 comparison
Every route the sweep visits + the 18 website / account / not-found routes (128 routes) at 1440 × 1024, a mouse, reduced motion, viewport and
full page, on the lane's scratch DB: the base build shot **twice** (to learn the noise between two runs of the same build), the final build
once; a shot passes when it matches either base run to the byte (`rwd-all/W1/bin/{shots,diff,diff-both}.cjs`).
- **Viewport: 109 / 128 byte-identical.** Of the 19 that differ from both runs, 16 are sub-pixel noise of the kind the two base runs also show
  (the "/" chip's glyph, the rail's credit ring, a relative time, a count) — inspected one by one, nothing moves. **3 are real and are not a rule
  of mine:** the project Money tab's *Needs you* rows (24 side padding instead of 16), Company › Finance › Commissions' totals and Reports ›
  Finance's "--" (their tabular digits). Cause (W1-26): Turbopack groups CSS modules into chunks by size, my added bytes moved two chunk
  boundaries, and those three same-weight overrides of a composed class flipped with the new order — proven on a scratch build of the WIP
  base, where `template-bar.module.css` and `money.module.css` share one chunk (money last), against my build's two chunks in the other order.
  Any lane's CSS can do the same at landing: the order-proof fixes are in *For other lanes* and the closing 1440 diff must run on the landed
  build.
- **Full page:** a full-page capture is not stable between two runs of the same build (67 of 128 differ; 54 of 128 viewports did too — relative
  times, live counts, the credit ring), so a pass is "matches either run"; the full pages that differ from both runs
  were spot-checked at 3× — the same three flips, otherwise identical drawings (anti-aliasing), no layout change.
- Every W1 rule is inside `(hover: none)`, `(max-width: 767px | 1024px)`, the phone-sideways query, an iOS `@supports`, or an `env()` that is 0
  on a desk (the probe's section 10 asserts the frame's 8 · the FAB's 24 · no crumb overlay at 1440).

## Tallies
**The sweep, W1's classes across every route** (the round's sweep at 320 · 390 · 768 · 1024 · 1280 → mine on the final build, same widths;
`rwd-all/W1/bin/sweep-cmp.cjs`, `rwd-all/W1/sweep-final/sweep.json`):

| finding | before | after |
| --- | ---: | ---: |
| target · the phone bar's avatar | 128 | 0 |
| clipped · the phone bar's avatar | 128 | 0 |
| target · the rail's studio block | 93 | 0 |
| target · crumbs | 84 | 0 |
| covered · a folder card's select box (under the open band) | 51 | 0 |
| target · the definition list's handle | 25 | 0 |
| target · the website's wordmark · Sign in · back crumb · Monthly / Annual | 32 | 0 |
| target · the website's Contact links (newly swept) | — | 0 |

Left in the count on purpose: `scope-pill` (86 — the pill's 44 is an `inset: −4px` overlay the sweep cannot read; hit tests land on it,
REG-729), the dock's / DS Tag's / the website's small type (the mocks, S35), `zoom text-field` (Chromium only — REG-306 types it at 16 on iOS),
the covers under sticky heads (scrolling) and the FAB at 844's page end on other lanes' strips and lists (handed off). Sideways: no W1 page at
any width; the one sideways page in the whole sweep is W5's `/confirm` at 390.
**844 × 390** (my sweep — the round's had no phone-held-sideways column): nothing sideways on any route; W1's only remaining findings there are
the same kept ones.

**Probes** (the regression harness on a fresh copy of the round's base DB, the final build, port 3201): **38 probes · 2,472 checks · all green**
— `rwd-w1` 59 · `overlays` 67 · `folders-{files,galleries,pickers}` 16 · 44 · 15 · `folder-crumbs` 8 · `ghosts-same` 76 · `ghosts-same-390` 76 ·
`search` 27 · `kb-r1` 35 · `kb-r2` 29 · `view-as` 23 · `pm2-s17` 130 · `sw-r1…r5` 35 · 27 · 13 · 35 · 33 · `pm2-s01` 80 · `pm2-s09` 79 · `pm2-s30` 109 ·
`pm2-s31` 105 · `pm2-s35` 137 · `pm2-s46d` 73 · `pm2-s10` 107 · `pm2-s43e` 46 · `pm2-s46a` 118 · `rq-k1` 116 · `rq-k2` 98 · `rq-k4` 143 · `rc-c1` 176 ·
`rc-c3` 110 · `rl-l3` 102 · `rl-l4` 97 · `rl-fixes` 22 · `first-run-full` 6 (+ `ghosts-strips` and `panel-order`, capture scripts, exit 0).
One probe corrected: `pm2-s10` tapped the Maison AI button on a 768 touch tablet's /leads at the top, where the base's Leads-on-the-move FAB
rule (2026-10-23) rests it out of sight; it now scrolls to the page's end first, commented `(responsive audit 2026-10-23, a deliberate change of
this rule)` — 104 → 107/107.
**Checks:** `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three known `quote-editor.tsx` errors · `npm run design:lint`
unchanged (no rule rose) · the production build green.

## Principles check
1. **The mock wins** — no mocked size, word or layout changed; the mobile canvas's 10px dock labels and the DS Tag's caption-xs kept; every fix is a REG-W1.n bug-fix row.
2. **One system** — each systemic defect fixed once in its house piece (the globals' touch overlay and iOS rule, Crumbs, Dialog, Filters, Drawer, Sheet, Keys, the ghost kit), tokens only, the house's own doubled-class pattern; `design:lint` unchanged (no new raw-type / raw-radius / icon-button-overlay).
3. **Plain words** — no word added or changed.
4. **Nothing lost** — no flow touched; the one thing taken off a screen (search's key foot on a keyboard-less touch screen) returns the moment a keyboard is used.
5. **Say why** — refusals, tooltips and their reasons untouched.
6. **Back returns where you came from** — untouched; the crumbs that carry it are now reachable by a finger.
7. **Every screen is whole** — the L1 ghost's header wraps where the page's does at 320 (REG-708); the shell's overlays checked at every width.
8. **Every width is designed** — 44 targets, iOS's 16, a phone held sideways, a notched phone's safe areas; the desk untouched by any W1 rule (the three 1440 flips are CSS chunk order, handed off with the fix and the detector).
9. **Tables follow the leads listing** — the table core verified at 1280 (the parked ⋮ answers when hovered, at rest and scrolled sideways; the frozen column paints over the scrolled cells); nothing changed there.
10. **Motion with purpose** — no motion changed.
11. **Honest data** — the probe writes nothing (it asserts so); the demo data untouched.
12. **Reach for everyone** — the ? panel's keys readable on touch; focus, names and keyboard paths untouched.
