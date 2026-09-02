# Responsive system (REG-269, user 2026-09-01: "convert all our screens to mobile and tablet responsive")

No mobile/tablet mocks exist — every rule here is designer-directed (owner request), logged in REGISTER.md.
Desktop (≥1200) is the mocked design and MUST NOT change: 1440×1024 renders pixel-identical to the banked baselines.

## Breakpoints

- **Mobile** ≤ 767px — design/verify at 390×844
- **Tablet** 768–1199px — design/verify at 768×1024
- **Desktop** ≥ 1200px — the existing design, verify at 1440×1024 (zero regression)

CSS literals, always the same two queries (CSS vars cannot parameterise media queries):
`@media (max-width: 767px)` = mobile · `@media (max-width: 1199px)` = tablet-and-down.
Mobile rules layer ON TOP of tablet rules: put shared shrinkage in 1199 and mobile-only restructuring in 767.

## Shell

- **Rail**: unchanged ≥768 (collapsed 52px at tablet; the pin-open 216px state only ≥1200 — a pinned rail
  at 768 starves content). **Mobile: the rail is hidden**; a 56px top app bar appears (logo tile · page
  context · `menu` glyph right) and the hamburger slides in the EXPANDED rail (216px) as an overlay drawer
  from the left — translateX transition on `--motion-modal` (0.2s ease), scrim `--om-color-scrim`/40%,
  Escape and scrim-tap close. The drawer is the same rail component (one nav, two frames).
- **Shell gutters**: 8px → 0 at mobile; the page sheet loses its radius (edge-to-edge).
- **Page headers (L1/L2)**: height goes auto and wraps at mobile; the title truncates single-line; the meta
  chip row becomes its own horizontal scroller (no wrap, `-webkit-overflow-scrolling: touch`); secondary
  header actions fold into the existing kebab; the primary action keeps its place.
- **Tabs row**: horizontal scroller with the om scroll pagers at ≤1199; sticky offsets recomputed per
  breakpoint (mobile: below the 56px app bar).
- **Maison AI FAB**: unchanged; clearance tokens hold.

## Content patterns

- **Tables** (listing, tasks, quotes, contracts, files list, imports, Qanvast): the table KEEPS its columns
  and becomes a touch-scrollable horizontal region at ≤1199 with the first data column sticky (the
  listing's frozen-column treatment, generalised): 1px inner border at rest, shadow only while scrolled.
  No card-stacking in v1 — six tables of invented card layouts need mocks; logged as the follow-up.
- **Kanban**: horizontal snap-scroll columns (`scroll-snap-type: x mandatory`, column 300px) at mobile.
- **Lead Details frame**: tablet keeps the three-part row with the info column at 300px and the quick-links
  strip collapsed-only; the card grid drops to one column below 1200. Mobile stacks: header → tabs → info
  column (its existing collapsible sections, default collapsed except the identity block) → centre content;
  the quick-links strip is hidden (every create lives in its tab; the FAB remains).
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
controls keep their desktop pixel sizes there. Below 768 the app is a touch app:

- **Every interactive control has a ≥40px touch box.** Bare icon buttons, kebabs, table sort buttons, status
  buttons, chips and inline text links grow their box at mobile (padding / min-size), never their glyph or
  type — the mark stays the mocked size, the target around it grows. Desktop is untouched.
- **Nothing is hover-only.** Row actions, chips and affordances revealed on `:hover` are permanently visible
  under `@media (hover: none)`. Anything explained only by a Tooltip needs a second channel on touch (visible
  caption, or the snackbar the app already uses) — tooltips never fire for a touch pointer.
- **Spacing follows the target, not the mock**: where 40px boxes would collide, the row grows or wraps.
- **Scrollable regions announce themselves**: a table that scrolls sideways keeps its frozen first column so
  the reader never loses their place, and the cut-off next column is the affordance.

## Ground rules

- The PAGE never scrolls horizontally — `document.scrollWidth === innerWidth` at every breakpoint is the
  hard gate; wide content scrolls inside its own container.
- Touch targets: see the Touch ergonomics section — every control gets a ≥40px box on a touch pointer,
  including the DS's own 36px `md` controls. Superseded the earlier "36px keeps its size" note (REG-273).
- Type and spacing tokens unchanged; content padding 24 → 16 at mobile.
- Transitions come from lib/motion tokens only; no new curves. Layout reflow is NOT animated.
- Every surface verifies at 390×844, 768×1024 AND 1440×1024 (baseline-identical) before it lands.
