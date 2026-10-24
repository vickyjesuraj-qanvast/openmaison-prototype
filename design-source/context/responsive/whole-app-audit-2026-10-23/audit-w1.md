# W1 — the house pieces, the shell and the public / account pages: the audit (2026-10-23 → 24)

**Lane:** `components/om/**`, `components/ds/**`, `components/shell/**` (not `tools-popover.*`), `app/globals.css`, `app/layout.tsx`,
`lib/breakpoint.ts`, `/profile` (+ `components/profile/**`, unowned), `/sign-in` · `/sign-up` (+ `components/auth/**`, unowned), `/join/*`,
`/site/**` (+ `components/site/**`), not-found, and the routes nobody owns (`app/(editor)/layout.*` — the editors' shared frame; every other
unowned route is a 1.0 old-address redirect).

**How it was read.** The sweep (`rwd-all/out/sweep.json`, 109 routes × 320 · 390 · 768 · 1024 · 1280) for every class a W1 file owns, across
*every* route (a house piece misbehaves on other lanes' pages); a second sweep of my own at **844 × 390 touch** (the phone held sideways the
sweep had no column for) and of the 18 website / account / not-found routes it didn't visit; then real presses at 320 · 390 · 768 · 1024 ·
844 × 390 · 1280 on the shell's every overlay (search, the bell, View as, You, More and what it opens, AI credits, Maison AI, the ? panel),
the house dialog, Filters, Column settings, the scope and row menus, the date picker, the snackbar, Your profile's dialogs, the website's
pages and the held ghosts. Three checks the sweep could not make, made here: **hit tests of a finger's 44** (elementFromPoint at the centre and
±21 — the sweep reads an overlay's computed box, which misses a box clipped by `overflow: hidden` and over-reports centred overlays), **iOS
input zoom emulated** (REG-306's rule only exists inside `@supports (-webkit-touch-callout: none)`, which Chromium never passes — the probe
unwraps the block where it stands and measures after the fields' 80ms transition), and **a notched phone's safe areas** (CDP
`Emulation.setSafeAreaInsetsOverride`, insets 47 · 0 · 47 · 21 — env() is 0 in a plain Chromium).

| id | page · width | what a person sees | severity | the fix |
| --- | --- | --- | --- | --- |
| W1-01 | every level-1 page · ≤767 | The phone bar's avatar (You) is a 36 square under a finger — its 44 overlay is clipped by the button's own `overflow: hidden`; the avatar is 36 inside the 34 the frame leaves, cut 2px at its right and foot, its initial off centre. | major | `mobile-nav.module.css`: the frame clips nothing, the avatar rounds its own corners and fills the 34; the house centred 44. |
| W1-02 | every page · ≤767 | The More sheet's counts (Tasks 1 · Company 5) leave their rows and stack on the sheet's top-right corner, half off the screen; the bar's and the dock's counts sit 2–4px from their rules. Cause: a composed class loses to the class it composes when the bundler emits that sheet last (REG-727's lesson). | major | `mobile-nav.module.css`: each override names its host (`.sheetItem > .rowCount` · `.barIcon > .barBadge` · `.dockIcon > .dockBadge`), so it outweighs `.badge` in any order. |
| W1-03 | every page · 768–1024 touch | The rail's studio block — the only door to Your profile, View as and Sign out on a tablet — is 36 wide under a finger while the items above it take 44. | major | `app-rail.module.css`: the collapsed block takes 44 (margin −4, padding 4 — the avatar does not move). |
| W1-04 | the L2 header (every lead / project page) · 768–1024 · 844 × 390; the money papers' crumbs · 320–1024 | Crumb links are ~15 tall under a finger. | major | `crumbs.module.css`: the house centred 44 overlay on a touch pointer. |
| W1-05 | Files (lead and project) · every library's folders · ≤1024 touch | The folder card's open band (`.folderMain::after`, 12 above and below) lies over the select checkbox: on a phone a tap on the box's lower half opens the folder instead of selecting it. | blocker | `folder-card.module.css`: the checkbox rises above the band on touch. |
| W1-06 | Company › Questionnaire · Custom fields · ≤1024 touch | The definition list's drag handle is 24 × 36. | minor | `definition-list.module.css`: the house centred 44 on touch. |
| W1-07 | every DS SegmentedButton (md) · touch — the website's Monthly · Annual, Tasks' toolbar, the schedule, the planner, X-Ray, Plans … | 36 tall with no 44: the globals' `[class*='segmented'] button` never matched the DS's `_group_` / `_item_` classes. | major | `globals.css`: `[role='radiogroup'][data-size='md'] > button[role='radio']` joins the touch overlay. |
| W1-08 | any multi-line house TextField, DS TextArea, composer, select · ≤767 iOS | The page zooms on focus: REG-306's iOS rule gives `textarea` / `select` a (0,0,1) weight, so any field's module class (0,1,0) kept them at 14 (inputs, at (0,2,1), were fine — verified by emulation). | major | `globals.css`: the same two `:not()`s for textarea and select — one weight for all three. |
| W1-09 | Search · 768–1024 touch | The foot reads "to move · to open · all shortcuts" with nothing before the words — the keys hide on touch (Q-21), the words didn't. | minor | `global-search.module.css`: the foot steps away with the keys and returns when a real keyboard presses one. |
| W1-10 | every house Dialog · 844 × 390 | The centred card kept the tablet's margins (24, and 48 for the tall xl and the fluid xxl): a 390 screen left two fields of body between a 64 head and a 68 foot. | major | `dialog.module.css`: on a phone held sideways (768–1024, landscape, ≤500 tall) 8 above and below, sides kept, off a notch and the home indicator. |
| W1-11 | the website's bar · ≤1024 touch | The wordmark is a 28-tall link; Sign in 40. | minor | `site-shell.module.css`: 44 min-height on touch (both centred, no box drawn — nothing moves). |
| W1-12 | the website's back crumb (Try it, Platform pages) · touch | 20 tall. | minor | `pages.module.css`: 44 min-height, given back as margin. |
| W1-13 | the app, the editors and the website · a notched phone held sideways (844 × 390 = iPhone 12–15 in landscape) | With `viewport-fit=cover` (REG-308) and no inset padding at ≥768, the rail sits in the left 47 (under the sensor housing), the page's right edge in the right 47, the rail's foot, the FAB and the snackbar on the home indicator; the website's wordmark under the notch. Invisible in Chromium (env() = 0) — found by emulating the insets. | blocker | the shell's frame (`app-shell.module.css`), the rail's height, the FAB, the snackbar host, the house Drawer and Sheet, the editors' `.surface`, the website's container · bar · Back to top pad by `env(safe-area-inset-*)` — a no-op on every other screen. |
| W1-14 | the ? panel (Keyboard shortcuts, reached from search) · touch | Rows read "Search the studio · Go to Dashboard…" with no keys beside them. | minor | `keys.tsx` `always` + `keys.module.css`: the panel's rows keep their keys on touch. ▲ |
| W1-15 | the house Filters modal (Leads, Tasks, Quotes, Contracts, Files, Projects, Tickets) and the Move dialog · 844 × 390 | The same 48 above and below: a 294 panel. | major | `filters-modal.module.css` (outside the layer, doubled) · `folders/move-dialog.module.css`: 8 above and below on a phone held sideways. |
| W1-16 | Your profile · Company › Profile ghosts · 320 | The ghost's L1 header ran its title bone under Discard (the ghost's title shrank to nothing where the page's wraps its actions). | minor | `ghost-kit.module.css` ≤767: the title bone keeps its width, so the actions wrap where the page's do. |
| W1-17 | Leads · Tasks · X-Ray · Quotes · Contracts · Meetings · Price book tables · 1280 | The sweep's "covered ⋮" at 1280. **Not a defect:** parked row actions are `opacity: 0; pointer-events: none` until the row is hovered (the sweep reads the button's own opacity, not its parent's); hovered — at rest and scrolled 400px sideways — every ⋮ answers its own click, and the frozen column paints over the scrolled cells. | — | none (verified by hover + hit test) |
| W1-18 | every house TextField / search box · ≤767 | The sweep's "zoom 14px". **Not a defect for inputs:** REG-306 types them at 16 on iOS (the only engine that zooms), verified by emulation; Chromium shows 14 by design. Textareas and selects were the gap → W1-08. | — | none |
| W1-19 | the dock's labels (10) · the DS Tag / MetaChip (10, caption-xs) · the website's phone-bar labels (10), its snapshot illustrations (10–11), category / perk labels (11) | Under 12px. **Kept:** the mobile canvas (1082:23305), the DS Tag (858:24783) and 1.0's site (S35). | — | none |
| W1-20 | the website · 844 × 390 | 1.0's floating bottom bar covers the hero's second button ("See pricing", "Take a photo") at rest; it slides away on the first scroll and the page's end clears it. | minor | **For Vicky** (a behaviour call, below). |
| W1-21 | the side scrollbar (REG-570) · 1024 | The sweep's "covered" on the schedule's last visible row. **Not a defect:** the bar sticks to the viewport's foot over the table by design and rests at the table's end. | — | none |
| W1-22 | sign-in · sign-up · touch | The wordmark's link to the website is 40 tall. | minor | `components/auth/sign-in.module.css`: 44 on touch, the 4 given back as margin (sign-up and its ghost share the class). |
| W1-23 | the website's Contact · touch (found by my second sweep — the round's sweep never opened it) | The email and WhatsApp links are 24-tall lines. | minor | `pages.module.css`: the house centred 44 on touch. |
| W1-24 | the code boxes (sign-in, the portal's sign-in, the signing code) · ≤767 iOS | REG-306's rule types every input at 16 at (0,2,1): the 24 digits — above the zoom floor — shrank to 16 in their 56 boxes on an iPhone (emulated). | minor | `code-boxes.module.css`: the digit keeps its face at a weight above the rule's. |
| W1-25 | every folder card · ≤767 touch (a regression of W1-05's first cut, caught by my post-fix sweep) | Risen above the open band, the checkbox's wrapper — stretched across the column card — lay over the kebab in the top-right corner. | — | the wrapper hugs its box on a phone and the kebab stays above both (same file). |
| W1-26 | the whole app · 1440 (found by my 1440 pixel diff) | **CSS order is not fixed between builds.** Turbopack groups CSS modules into chunks by size; this lane's added bytes moved chunk boundaries, and three same-weight overrides of a composed class flipped at 1440: the project Money tab's *Needs you* rows took template-bar's 24 side padding (W3's `money.module.css` `.banner` composes `template-bar.module.css` `.banner` — one chunk in the base build, two chunks in the wrong order in mine), and Commissions' and Reports › Finance's figures lost their tabular digits (a `font:` shorthand on one class resetting another class's `font-variant-numeric`). A static scan finds **121** such fragile overrides app-wide (`design-source/verify/responsive-all/fragile-composes.cjs`). Every lane's CSS can flip them again at landing. | major | mine fixed (`your-profile.module.css`, and W1-02's badges); the rest **For other lanes / the orchestrator** (below). |
| W1-27 | the website's hero snapshot · 320 · 390 | The sweep's "clipped" (`site.snapshot` 270 < 352). **Not a defect:** the Studio P&L card is a conveyor — the next slide waits clipped in its window by design; the card itself reads whole at 320 (checked on the full page). | — | none |

## For other lanes (the exact fixes; the orchestrator lands them)
- **The orchestrator — before the closing 1440 diff (W1-26):** the landed build will re-chunk the CSS again. Run
  `node design-source/verify/responsive-all/fragile-composes.cjs` (from the repo) and make each listed override order-proof — `.x.x { … }`
  (doubled, the house's own pattern), or the composed source in an `@layer` (REG-727's table core) — starting with the three that flipped in
  W1's build: **W3** `components/projects/money/money.module.css` `.banner` (padding, box-shadow) — or **W5** puts
  `components/quotes/editor/template-bar.module.css`'s base `.banner` in a layer, which fixes the Money and Floor plan banners at once; **W4**
  `components/finance/books/books.module.css` `.strong { font: … }` resets `.num`'s `tabular-nums` (Commissions' totals) — set
  `font-variant-numeric: tabular-nums` after the shorthand in `.strong`, or `.num.num`; **W4** the Reports › Finance table's cells
  (`components/company/plan/plan.module.css` `.cell` / `.num`) the same. Then the 1440 diff on the landed build.
- **W2 · W3 — the quick-links strip on a lead's and a project's Overview, 844 × 390 touch:** the sticky glyph column runs past the viewport's
  foot (its last glyphs are never on screen) and at the page's end the Maison AI button lands on the last one (`[end] Contact Log` · `Update`
  under the FAB). Fix in the strip's stylesheet: on `(hover: none) and (max-width: 1024px)` give the sticky column
  `max-height: calc(100dvh - <its sticky top>); overflow-y: auto` and `padding-bottom: var(--fab-clearance)` (88 at that width).
- **W2 · W4 · W5 — the hand-rolled overlays with the 48 vertical margin, 844 × 390:** `components/leads/{lead-form, deleted-sheet,
  import-wizard, move-stage/wizard, return/return-lead-wizard, return/return-details-modal, files/deleted-files-sheet, tasks/attach-files-modal,
  tasks/template-dialogs, tasks/manage-tags-dialog}.module.css`, `components/company/templates/deleted-templates-sheet.module.css`,
  `components/quotes/create-quote-modal.module.css` — the same rule the house Dialog now carries:
  `@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) and (max-height: 500px) { .overlay { padding: 8px env(safe-area-inset-right, 0px) calc(8px + env(safe-area-inset-bottom, 0px)) env(safe-area-inset-left, 0px); } .panel { max-height: calc(100dvh - 16px - env(safe-area-inset-bottom, 0px)); } }`
  (and a fixed `height` capped the same way). Create New Lead at 844 × 390 shows two fields today.
- **W2 · W5 — contenteditable editors at 14 on an iPhone (the page zooms on focus):** `components/quotes/editor/text/rich-editor.module.css`
  (every description, Terms, Notes, the price book item, Company › Profile's About), `components/leads/notes/note-editor` — under
  `@supports (-webkit-touch-callout: none) { @media (max-width: 767px) { … [contenteditable] { font-size: 16px } } }` in their own sheet (not
  the contract paper's `doc-editor`, which is a scaled A4 — W5 to decide its Document frame).
- **W4 — `components/company/help-link.module.css`:** the page header's "Reports ›" / help links are 61 × 20 under a finger on every Finance page
  (320–1024, 844): give `.link` the house centred 44 on `(hover: none)` (as `crumbs.module.css` now does). `components/company/templates/
  editors/library-editor.module.css .handle` (24 × 36, the source the definition list composes): the same 44 on touch.
- **W4 — `components/company/company-ghost-frame.tsx`:** nothing needed after W1-16 (the frame's `GhostHead` now wraps like the page).
- **W3 — the project's Client · Design views' chip rail at 320:** "Updates · 1" gets ~100px beside "All conversations" and the other views
  scroll out of sight (`project-views` / the threads toolbar): at ≤767 give the rail its own line above the toolbar's actions.
- **W5 — the FAB at a list's end:** on Tools › Quotes (320 · 390 · 844) and Tools › Contracts (844), scrolled to the end, the Maison AI button
  sits on the last row's ⋮ ("More actions for Whole-home renovation" · "…Interior Design Service Agreement"): end the list's content on
  `padding-bottom: var(--fab-clearance)` as the Leads listing does (`app/leads/leads.module.css`). **W5** the Visualizer's stage dots under the
  FAB at 320.
- **W2 — the kanban's `height: calc(100dvh - 16px)` (`app/leads/leads.module.css`)** and the file viewer's `calc(100dvh - 16px - 56px)`: on a
  notched phone held sideways the frame now pads the home indicator, so subtract `env(safe-area-inset-bottom, 0px)` too (a no-op elsewhere) or
  the page scrolls 21px.
- **W2 · W3 — fixed / edge-anchored bars on a notched phone held sideways:** the shell now pads its frame; the review banner, the bulk bars
  and any `position: fixed` foot anchored to `left: var(--rail-w)` or the viewport's edges need `+ env(safe-area-inset-left/right/bottom)`
  (a no-op elsewhere). **W5** the same for the Quote · Contract screens' sticky feet and the editors' own fixed frames; **W3** the client
  portal's `/my` phone bar and the signing / confirm pages are full-bleed too.

## For Vicky
- **W1-20 · the website's floating bottom bar on a phone held sideways** covers the hero's second button at rest (it slides away on scroll, the
  page's end clears it). Options: start it tucked on a short landscape screen and bring it back on the first scroll up, or draw the desk's top
  links there instead of the bottom bar. Not built — a behaviour call.
- ▲ **W1-14** shows the ? panel's keys on a touch screen (Q-21 hides keys there everywhere else); the alternative is to drop "Keyboard
  shortcuts" from search on a touch screen with no keyboard.
- ▲ **W1-02** puts the bar's and the dock's counts where their rules always said (4 · 4 in the bell's 44 box; −2 · −2 on the dock icon's
  corner); the screens until now drew them 2 · 2 inside (a load-order accident) — before / after in the outcome.
