# Responsive system (REG-269, user 2026-09-01: "convert all our screens to mobile and tablet responsive")

Mobile mocks began 2026-09-02 — **1082:23305 Lead Listing** and **1082:24995 More sheet** — and the Shell and the
listing follow them (REG-298 … REG-300). Every other rule here is still designer-directed (owner request), logged in
REGISTER.md; no tablet mock exists yet. Desktop (≥1025) is the mocked design and MUST NOT change: 1440×1024 renders
pixel-identical to the banked baselines.

## Breakpoints

- **Mobile** ≤ 767px — design/verify at 390×844
- **Tablet** 768–1024px — design/verify at 768×1024 (REG-315: the brief's ranges; was 768–1024)
- **Desktop** ≥ 1025px — the existing design, verify at 1440×1024 (zero regression) and at 1025 / 1100 (the narrow end the desktop layout now serves)

CSS literals, always the same two queries (CSS vars cannot parameterise media queries):
`@media (max-width: 767px)` = mobile · `@media (max-width: 1024px)` = tablet-and-down.
Mobile rules layer ON TOP of tablet rules: put shared shrinkage in 1024 and mobile-only restructuring in 767.

## Shell

- **Rail**: unchanged ≥768 (collapsed 52px at tablet; the pin-open 216px state only ≥1025 — a pinned rail
  at 768 starves content). **Mobile (mock 1082:23305, REG-298): the rail is hidden**; `MobileChrome`
  (`components/shell/mobile-nav.tsx`) draws a **60px top bar** (lockup · search · chat · notifications · avatar)
  and a **fixed 70px bottom dock** (Dashboard · Leads · Tools · Projects · More). More opens the **bottom sheet**
  (1082:24995, REG-300: Marketplace · Company · Qanvast Ops · rule · Settings), slide-up on the modal timing,
  scrim / Esc / close dismiss. Constants: `--app-mobile-bar-height` 60 · `--app-mobile-dock-height` 70 — the FAB
  sits 16 above the dock, the snackbar too, and `--fab-clearance` is 150 at mobile. **Safe areas (REG-308)**:
  `viewport-fit: cover`; both chrome tokens carry `env(safe-area-inset-*)`, the bar / dock / More sheet / full-screen
  sheet footers pad themselves out, and `usableViewportHeight` measures the dock element. Nothing moves where the
  inset is 0.
- **Shell gutters**: 8px → 0 at mobile; the page sheet loses its radius (edge-to-edge).
- **Page headers (L1/L2)**: height goes auto and wraps at mobile; the title truncates single-line; the meta
  chip row becomes its own horizontal scroller (no wrap, `-webkit-overflow-scrolling: touch`); secondary
  header actions fold into the existing kebab; the primary action keeps its place.
- **Tabs row**: horizontal scroller with the om scroll pagers at ≤1024; sticky offsets recomputed per
  breakpoint (mobile: below the 56px app bar).
- **Maison AI FAB**: unchanged; clearance tokens hold.

## Content patterns

- **Lead listing at mobile = cards** (mock 1082:23305, REG-299; its ghost mirrors the cards, REG-309): `LeadCards` replaces the table and the kanban
  ≤767 — head (name · age · chevron opens the lead) · phone · S$budget · source · the first task box or "Add Task"
  · rule · members + the stage button; the header is three icon squares (Add Lead filled · Insights · kebab) and
  the toolbar is the pill + the filter glyph, the search box revealed by the bar's search.
- **Other tables** (tasks, quotes, contracts, files list, imports, Qanvast): the table KEEPS its columns
  and becomes a touch-scrollable horizontal region at ≤1024 with the first data column sticky (the
  listing's frozen-column treatment, generalised): 1px inner border at rest, shadow only while scrolled.
  Card layouts for these wait for their mocks.
- **Kanban**: horizontal snap-scroll columns (`scroll-snap-type: x mandatory`, column 300px) at mobile.
- **Lead Details frame**: tablet keeps the three-part row with the info column at 300px and the quick-links
  strip collapsed-only; the card grid drops to one column below 1025. Mobile stacks: header → tabs → info
  column → centre content; the quick-links strip is hidden (every create lives in its tab; the FAB remains).
  **The info column collapses like the Create strip** (REG-304): ≥768 to a 72px glyph strip on the left, ≤767 to
  the identity block alone — remembered per browser, default expanded on desktop/tablet and collapsed on a phone.
- **Modals**: s/m clamp to `min(<size>, 100vw - 32px)`. l/xl/xxl and the Move stage window become
  full-screen sheets at mobile (100dvh, radius 0, slide-up on `spring.settle`); tablet clamps to
  `100vw - 48px` (the xxl rule, generalised).
- **Drawers/side panels** (task panel, comments, file viewer panels, attachments column): full-width
  overlay sheets at mobile; unchanged at tablet.
- **Popovers/menus**: keep their anchor-clamp maths; the clamp bounds are the real viewport (they already
  read window.innerWidth/Height — audit verifies each).
- **Notes tab**: master-detail push at mobile — the list is the screen; selecting slides to the pane with a
  back affordance; tablet: list 280px + pane.
- **File viewer**: panels become full overlays at mobile; the zoom bar compacts.
- **Two-column field rows** (move-stage pairs, forms): single column at mobile.

## Touch ergonomics (REG-273 — the owner's clarification, 2026-09-01)

"Mirror desktop as-is" means the **design language and every feature** carry to mobile and tablet — NOT that
controls keep their desktop pixel sizes there. Below 768, and on any touch pointer up to 1024, the app is a touch app:

- **Every interactive control has a ≥44px touch box** (REG-312; was 40 under REG-273). Bare icon buttons, kebabs, table sort buttons, status
  buttons, chips and inline text links grow their box at mobile (padding / min-size), never their glyph or
  type — the mark stays the mocked size, the target around it grows. Desktop is untouched.
  **(REG-307) The growth also applies on a touch pointer up to 1024**, so an iPad gets the same boxes: touch
  rules carry the media query list `@media (max-width: 767px), (hover: none) and (max-width: 1024px)`, and
  mobile LAYOUT rules (wrapping, stacking, widths, the 24 → 16 inset) stay on the bare 767 query. Verify with
  mobile emulation (`isMobile: true` in Playwright makes `(hover: none)` true) at 768 as well as 390.
- **Nothing is hover-only.** Row actions, chips and affordances revealed on `:hover` are permanently visible
  under `@media (hover: none)`. Anything explained only by a Tooltip needs a second channel on touch (visible
  caption, or the snackbar the app already uses) — tooltips never fire for a touch pointer.
- **Spacing follows the target, not the mock**: where 44px boxes would collide, the row grows or wraps.
- **Scrollable regions announce themselves**: a table that scrolls sideways keeps its frozen first column so
  the reader never loses their place, and the cut-off next column is the affordance.

## Ground rules

- The PAGE never scrolls horizontally — `document.scrollWidth === innerWidth` at every breakpoint is the
  hard gate; wide content scrolls inside its own container.
- Touch targets: see the Touch ergonomics section — every control gets a ≥44px box on a touch pointer,
  including the DS's own 36px `md` controls. Superseded the earlier "36px keeps its size" note (REG-273).
- Type and spacing tokens unchanged — except body/m, which reads 16/24 at ≤767 (REG-314); content padding 24 → 16 at mobile.
- Transitions come from lib/motion tokens only; no new curves. Layout reflow is NOT animated.
- Every surface verifies at 390×844, 768×1024 AND 1440×1024 (baseline-identical) before it lands — and the
  overflow gate also runs at **320 and 360** (REG-306: the brief's floor is 320).

## Brief mapping (owner's responsive brief, 2026-09-02 — REG-306; the readable spec is the "OpenMaison Responsive Spec" page)

| Brief asks | This system | Why / status |
|---|---|---|
| Desktop 1025+, tablet 768–1024, mobile 320–767 | **Adopted (REG-315, owner 2026-09-02)**: desktop ≥1025, tablet 768–1024, mobile ≤767 | Adopted over the audit's advice: the desktop mock's fixed chrome (rail 52 + info column 360 + Create strip 72 + 2×24) leaves 493px for the centre at 1025, so the overview's two card columns run at ~235 there; the rail's pin-open and the Create strip's expanded state are also available from 1025. Verified for overflow at 1025 and 1100; the look at those widths is the owner's call. |
| 12 / 8 / 4 column grid, 24-32 / 16-24 / 16 gutters | Fixed DS chrome + fluid centre; gutters are the DS spacing tokens, 24 → 16 at mobile | The mocks are not drawn on a column grid; a grid would be invention. Column grids exist where the content is a grid (overview cards 2 → 1, files tiles, kanban columns). |
| `clamp()` / rem fluid scaling | Fluid WIDTHS (flex, `min(600px, 100vw − 32px)` on modals); type and spacing are px tokens | The 1440 render must stay pixel-identical to the mock (the hard gate); fluid type breaks that contract and the DS. |
| Sidebar → drawer or bottom nav, profile + CTA reachable | Mocked: 60px top bar (avatar, search) + 70px dock + More sheet; Add Lead is the header's filled square | REG-298 / REG-300 — built from mock 1082:23305 / 1082:24995. |
| Tables → horizontal scroll with sticky first column, or cards | Lead listing → cards (mocked, REG-299); every other table → touch scroller with the first column frozen | Card layouts for the other tables wait for their mocks. Sticky HEADERS are not possible inside an `overflow-x` scroller without making it the vertical scroller too — open. |
| Widgets: 2-col tablet, 1-col mobile | Overview cards: 1 column below 1025 | At tablet the 300px info column stays beside the centre; two card columns there would be ~190 each. |
| Modals → full-screen bottom sheets with sticky actions | l / xl / xxl and the Move stage window are 100dvh sheets at ≤767 with their footers pinned; s / m clamp to `100vw − 32px` | REG-269. |
| Scale H1/H2 down at mobile | Not scaled: the mobile mock keeps heading/h3 (20) for page titles and heading/h4 (16) for card names | Mock wins; the DS scale is 10 / 12 / 14 / 16 / 20 / 24. |
| Body ≥16px at mobile (iOS zoom) | Body stays the DS 14; **form controls type at 16 on iOS only** (REG-306) | The zoom is triggered by inputs, not body text; a 16px body would be a DS change — open for the owner. |
| Padding p-8 → p-4/p-5 | 24 → 16 at mobile everywhere; dialog radius 12 → 0 as sheets | REG-269. |
| 44×44 / 48×48 touch targets on mobile AND tablet | **Adopted (REG-312)**: 44×44 boxes on the mark's mocked size, at ≤767 and on any touch pointer up to 1024 (REG-307) | Verified under mobile emulation at 390 and 768; the one control under the floor is the rail's pin button, inert at tablet. |
| Replace hover with active/focus on touch | Nothing is hover-only; 37 stylesheets carry `(hover: none)` rules; focus-visible rings everywhere | REG-273. |
| Safe areas (not in the brief, found in the audit) | `viewport-fit=cover` + `env(safe-area-inset-*)` on the bar / dock tokens and the FAB clearance; every full-screen sheet pads its pinned footer past the home indicator; the dialog / Move stage / drawer heads and the More sheet take the top / side insets | REG-308 — env() is 0 off-iOS, so the 1440 baselines stand; **verify on a device** (Playwright cannot emulate the insets). |
