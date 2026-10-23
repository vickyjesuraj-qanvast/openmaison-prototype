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

## On the move: a data-heavy record on a phone or a touch tablet (the Quotes module first, 2026-10-22)

The owner's rule after the Quotes audit (`design-source/context/responsive/quotes-on-the-move-2026-10-22/`, his picks on its review page):
**a phone or a touch tablet is not a squeezed desktop; it is an on-the-move screen.** The desktop (≥1025) stays the mock, byte-identical.
On ≤1024:

- **Read first, edit second.** A record with heavy data (a quote) opens as the thing the client gets — a hero (status · amount · validity ·
  the client with Call and WhatsApp), one *Next* line, the document as reading cards, the other parts as folded rows — with a sticky foot
  holding **Edit** and the state's one primary. The editor comes only on Edit (`components/quotes/screen/*`, `lib/quotes/next-step.ts`).
- **One thing at a time.** Edit is a list of sections, each with a one-line summary; a row opens the section as a screen (a 56 bar with ←,
  the title and the section's actions; the body scrolls; one filled button in its foot). The address carries it (`?edit=<key>`), so Back
  works. A landscape tablet holds the list as a 360 pane beside the open section (`SectionCard`'s screen mode, `screen-context.ts`).
- **The scale: 16 · 14 · 44.** Text people read is 16, secondary 14, never under 14 for a value, a name or a sentence (a 12 uppercase eyebrow
  may label a group); amounts 18–26 tabular; every target 44, the foot's buttons 48; 16 gutters, 12 inside cards; inputs type at 16.
- **A table on a touch tablet shows what fits, never twelve columns.** A grid shows the four or five columns a finger edits (Item · Qty ·
  Unit price · Total) with the rest in a pane or Column settings remembered per breakpoint (`om.columns.<table>.tablet`); a list table opens
  with a tablet default set (`tabletHidden`, `useTableColumns(…, tablet)`), its ⋮ frozen, View dropped (the title opens).
- **Paper is a viewer.** An A4 is never scaled to a phone's width (4px type); the client's reflowed quote is the default and the paper opens
  in a viewer (fit to width, pinch, pages) behind "As printed" / "Paper".
- **The icon button's touch box is the house one.** Never `button::after { inset … }` in a module stylesheet (it keeps the house
  translate(−50%, −50%) and moves the 44 box by (−22, −22)); the design-lint rule `icon-button-overlay` ratchets it down. A DS Button grows
  with `min-height` / padding.
- **A client's page is always a phone page** (the confirmation link, the view-only link): the total first, the cards, a sticky bar with the one
  action at 48, the paper only in a tablet's landscape.
- **Nothing runs off the screen and nothing covers a foot.** An anchored menu at ≤1024 measures itself before paint against the document's
  width and shifts inside an 8px edge (`components/leads/dropdown.tsx` `--menu-shift` · `data-align`); a sheet with a pinned foot lifts the
  snackbar above that foot (`useSheetFootLift`, `--sheet-foot`); a Send ▾ mounted in a foot opens upward (`SendButton side · align`). A phone's
  send sheet fits: the message box grows with its words, the link row gives way to Copy link in the foot.
  A floating button (Maison AI) never sits where a pane's or a foot's button is: on a tablet it steps out of a section screen whose toolbar
  carries it (REG-2602); on a phone it slides away on scroll and the pane is a sheet above it.
- **Measure against the device, not the window.** Under touch emulation `innerWidth` and `scrollWidth` grow with overflowing content; a probe
  reads `documentElement.clientWidth` / `screen.width`, takes tablet shots viewport-only, and moves a menu by layout (margin), never by a
  transform, when it asserts the width while the menu is open.

### Contracts on the move (REG-2603…2654, 2026-10-23) — what the second module added to the rule
- **A document is clauses.** A contract (and a contract template) on ≤1024 reads as its clauses as cards split at the headings, the signature
  boxes as the last card; editing the paper is one screen (the Document frame) with ONE row of tools at a 44 pitch and the rest under + ▾.
  Signed reads only — no toolbar, greyed or not.
- **A finger never aims.** Anything placed in a text by a mouse at the caret (a signature field) is placed on touch by choosing *where* from
  the outline, lands as its own block, scrolls into view with the fresh pulse and says so with Undo.
- **The client's page reads first and walks.** Paper first at 16; one sticky bar says how far they are and then does the next thing; the
  rest (ticks, the code, the signature) is a short sheet in steps, one filled button each; the code boxes autofill; a drawn signature keeps
  its shape; a copy is the signed page they can share, never a print dialog on a phone.
- **A photo is a document on site.** Where a phone uploads what a client signed on paper, Take a photo comes first and the photo is kept
  as the copy.
- **A tooltip is a pointer's.** A finger's press leaves no bubble and no key hint (`components/om/tooltip.tsx`).

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
