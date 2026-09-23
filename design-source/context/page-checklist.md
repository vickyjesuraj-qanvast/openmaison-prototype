# Page checklist — generic shell pieces every screen must ship

Standing rule from the designer (2026-08-27): "whenever you build a screen remember these
generic stuffs and never miss." Tick every line before a screen is reported as done.

## Load & refresh
- Every route ships a `loading.tsx` ghost (`LeadsSkeleton`, `ImportsSkeleton`, `SettingsSkeleton`) and wraps its view in `PageReveal`.
- [ ] `loading.tsx` next to the route renders a skeleton from `components/shell/skeleton.tsx`
      that mirrors the screen's own layout (header, toolbar, table/cards — same heights and
      column widths as the real components, so the crossfade lands in place).
- [ ] The page's client view is wrapped in `<PageReveal skeleton={<…Skeleton />}>`
      (`components/shell/page-reveal.tsx`): min hold `GHOST_MIN_MS` then crossfade.
- [ ] The ghost's minimum hold applies ONLY when `loading.tsx` actually painted (`ghostClock.shownAt`): a warm
      client navigation must reveal at once, or every tab click invents a skeleton over content already in hand (REG-217).
- [ ] Routed tab / sub-nav links prefetch in FULL (`prefetch` on the Link — the default fetches only the loading
      boundary), and dynamic routes need `experimental.staleTimes.dynamic` or the router refetches what it prefetched.
- [ ] Verified with Playwright: ghost on hard load, on client navigation, on reload;
      no ghost on `router.refresh()` / server-action revalidation.

## Shell
- [ ] Route lives under `app/leads/layout.tsx` (or an equivalent layout) so it inherits the
      side rail (`AppRail`, two states), the snackbar host and the canvas frame.
- [ ] Maison AI comes with `AppShell` (REG-507) — never mount `MaisonFab` / `AiSheet` on a page in the shell; a page with scripted suggestions calls `useMaisonAi(suggestions, raised)` (raised when a bottom dock is shown); `--bottom-dock` respected by
      bulk bar / snackbar / AI sheet; page content ends with `padding-bottom: var(--fab-clearance)`.
- [ ] Every inert affordance answers with the coming-soon snackbar (`useComingSoon`).
- [ ] The page's search input registers with `useSearchTarget` (`components/shell/search-focus.ts`)
      so the rail search tile and the "/" key focus it.
- [ ] A control whose current value narrows what the page shows says so when it is off its default: a scope
      pill wears `AppliedDot` (`components/om/applied-dot.tsx`), the Filters button its count badge (REG-69, REG-295).
      A narrowed view must never pass for the whole after the user looks away.
      **Which control** (REG-297): one dominant single-choice dimension → a scope pill naming the value + count
      (stage, kind, status); several dimensions or any multi-select → the Filters icon + modal. Never both for the
      same dimension — a pill must not duplicate a modal group. No filter at all → a plain title, no control.

## Tooltips
- [ ] Every icon-only control is wrapped in `<Tooltip label side>` (`components/om/tooltip.tsx`)
      — label reuses the control's existing accessible name (no invented copy).
- [ ] `disabled` passed while the control's own menu/popover is open or its label is visible.
- [ ] Side: rail → `right`; FAB → `left`; everything else → `bottom` (auto-clamped to viewport).

## Surfaces
- Modal widths come from the scale only: s 400 · m 600 · l 800 · xl 1200 (`--om-modal-*`), or xxl = fluid with a 48px margin on every side; height follows content, capped to the viewport; radius 12; centred overlay. Full-page overlays are not used — Review imported leads is an XXL modal.
- [ ] Closing a multi-step flow or discarding edits asks first via the shared `ConfirmDialog` (`components/om/confirm-dialog.tsx`).
- [ ] Modals / sheets / dialogs call `useScrollLock(open)` and their overlays contain overscroll; any table inside a scrolling surface has a sticky header.
- [ ] A modal footer keeps its top rule; its shadow appears only while the body scrolls — attach `useOverflow` (components/om/use-overflow.ts) to the scrolling body and give the footer `data-shadow` (REG-322).

## Rows that can overflow
- Frozen / pinned columns: 1px border on the inner edge at rest; the shadow shows only while scrolled sideways (`data-scrolled` on the scroll container — see table.tsx / review-sheet.tsx).
- [ ] Horizontal chip / tab / pill rows use `ChipRail` (edge fades, chevron pagers, selected chip scrolls into view).
- [ ] **Detail views never truncate a value** — a read-in-full surface (the Lead Details info column, a panel, a summary card) wraps to a second line (`overflow-wrap: anywhere`, no `text-overflow: ellipsis`); only table / list cells, where the column width is the design, keep the ellipsis (REG-212).
- [ ] **A mock FRAME height is not an element height.** 784px cards, 928px sheets: the mock's number is the output of
      "fill the section" at the mock's own padding. Reproduce the rule (`flex: 1; min-height: …`, height to content),
      then check the app's padding differs from the mock's before assuming the number still holds (REG-213).
- [ ] **Menus pick their side by measurement, never by row count** — compare the trigger's bottom against the real
      clipping edge. A row-count threshold copied between tables is wrong on the first short table (REG-213).
- [ ] **Responsive tile / card rows fill the width they actually have** — measure with a ResizeObserver and collapse only the remainder into "+n", never a hard-coded count; the arithmetic must still yield the mock's row at the mocked width (REG-212, `components/leads/detail/files-card.tsx`).

## Fields
- [ ] **A surface opened to enter data opens with the caret in the field** — and when the user pressed "Add" beside ONE
      row, the form opens ON that row: scroll it into view, focus it, expand whatever section hides it. Never make
      someone hunt a field they just asked for. A create form with no such target focuses its first field; a plain
      "Edit" opens unfocused, because nothing was singled out (REG-224, REG-226).
      A selection the user did not make — a fallback after a search, a filter or a delete moved it — never takes
      focus either: autofocus follows intent, not mounting (REG-294). Typing in a search box must never lose the caret.
- Every text input is `TextField` (`components/om/text-field.tsx`) — never a raw `<input>` with a label. Label inside when empty, floats on focus/value; five DS states (empty / active / filled / error / disabled — 836:23125, 836:23276).
- **Numbers are filtered as typed**, never only validated: any field that holds digits (amounts, phone, area, %, counts) uses `TextField numeric="digits"` or `numeric="amount"` (thousands grouping) — letters and symbols must never appear in the box (REG-150). A phone box validates through `isSgPhone` (`lib/format.ts`, REG-547) — never a local length check.
- Dates are `DateField`; dates with time are `DateTimeField` — read-only triggers over the Material picker. No free-typed dates anywhere.
- Every field except notes validates: required + format, computed by a pure `validate(...)`, shown inline only after the first submit attempt, re-computed live so errors clear as fixed. Messages come from `lib/forms.ts` `MSG` — add to that vocabulary, don't inline strings.
- Non-text controls (chip groups, attach rows, tables) show `<FieldError/>` under the control; chip groups pass `error` to `ChoiceChips`.
- Selects: `TextField mode="select"` (chevron flips while open). Pickers/menus portal through `PortalMenu` / the date picker layer (z 130).
- Anything already saved opens **read-only** (`ReadOnlyScope` — DS disabled state, action links hidden) with an explicit Edit; keep the title row / Edit link *outside* the scope or it disables itself.
- Attached files render with `FileTile` (781:58405) everywhere — preview + filled pdf icon + name + delete; never a bare name row (REG-151).
- File uploads use `Dropzone` (`move-stage/fields.tsx`): a real file chooser (any file accepted), an "Uploading..." state, then the mock's file as a selected row *below* the dropzone (780:91468). Amounts a file can't tell us (Quote amount) are asked only in the upload flow.
- Anchored popovers on scrolling pages store their anchor element and re-position on capture-phase `scroll` (see `workspace.tsx` follow effect); menus/pickers inside modals close on scroll instead.

## Parity sweep (run before calling any surface done)
- Table ↔ kanban: menus, empty-state links (Assign / Add task), unseen band, hover name → primary, stage gating, popover anchoring.
- Move stage: Contacted ↔ Met (log lists), Quote Sent ↔ Won (upload flow), read-only hides every delete/attach affordance, tooltips on icon-only controls.
- Every table: frozen-column edge rule (REG-144) + sticky head; every modal: header standard + close tooltip; every fixed bottom element: follows `--rail-w`.
- Every trigger toggles its own menu/popover; every inert affordance answers coming soon; validation copy only from `MSG`.

## Lead menus
- A lead's actions are the same wherever the lead appears (table row, kanban card, details page): Delete · Return Lead (Qanvast only, REG-139). Adding or gating an item in one surface means doing it in all of them — grep every `More actions for` menu.

## Motion & states
- [ ] Surfaces use `lib/motion` tokens; `prefers-reduced-motion` handled (globals collapse it).
- [ ] Hover / focus-visible / active / disabled / empty / error / loading states designed and built.
- [ ] Esc / outside-click layering follows the z-scale (menus 60 · popovers 70 · bulk bar 80 ·
      FAB 90 · modals 100 · nested 110 · snackbar 120 · PortalMenu 130 · tooltip 140).

## Responsive (REG-269 — the system is `design-source/context/responsive.md`)
- [ ] Rules live in `@media (max-width: 767px)` (mobile) / `@media (max-width: 1024px)` (tablet-and-down, REG-315) —
      those two literals only, mobile layering on top of tablet. **Desktop ≥1025 must stay pixel-identical at 1440.**
- [ ] The PAGE never scrolls horizontally: wide content (tables, tab rows, chip rows) scrolls inside its own
      `overflow-x` container, with the first column sticky where a table scrolls.
- [ ] No fixed px width survives below 1025 unclamped — dialogs/drawers clamp (`max-width: 100vw`), fixed
      overlays are not anchored to `--rail-w`, and JS-positioned popovers clamp to the real viewport.
- [ ] Mobile chrome is `MobileChrome` (mock 1082:23305 / 1082:24995 — 60px top bar, 70px bottom dock, More sheet);
      sticky offsets derive from `--app-mobile-bar-height`, bottom-anchored things (FAB, snackbar, page clearance)
      from `--app-mobile-dock-height` — never from the desktop 72px header or a hard-coded 24.
- [ ] The route's ghost mirrors the responsive layout at each breakpoint (the PageReveal crossfade lands in place;
      the listing's card ghost ≤767 is the pattern — both layouts rendered, CSS picks one, REG-309).
- [ ] Touch-growth rules (REG-273) carry `@media (max-width: 767px), (hover: none) and (max-width: 1024px)` so a
      touch tablet gets them too (REG-307); mobile LAYOUT rules stay on the bare 767 query. Bottom-anchored chrome
      reads `--app-mobile-dock-height`, which already includes the safe-area inset (REG-308).
- [ ] **Every anchored surface is a bottom sheet at ≤767 (REG-353)** — a menu, popover, picker, side panel or
      form/modal dialog opts in through `components/om/sheet.tsx` (`useSheetLayout` + `Sheet`, or the grabber +
      `bottomSheet` variant where the surface owns its shell); it comes off the bottom edge over the dock, under
      the scrim, ≤88dvh, and takes a heading naming what it acts on. Confirmation ALERTS stay centred cards and
      multi-step wizards stay full screen with their own top bar. Never anchor a new menu to a cell on a phone.
- [ ] **A section toolbar is ONE row at ≤767 (REG-354)** — the title and the glyphs. The search box folds into a
      glyph (`components/om/toolbar-search.tsx`) and the labelled primary becomes its icon; anything that cannot
      fit leaves the row the way the listing's view toggle did (REG-299), never wraps into a third line.
- [ ] **…and ONE row through the tablet band too (REG-384)** — beside the rail and the info column the centre is
      ~540px at 768, so the search folds there as well and the section title keeps its width.
- [ ] **A hover-revealed control is permanent on a touch pointer (REG-310/391)** — row actions, a copy glyph, a
      grid's tap convention: anything gated on `:hover` needs a `(hover: none)` arm, or it does not exist on a
      phone OR a tablet. Check the tablet arm too: `(hover: none) and (max-width: 1024px)` (REG-307).
- [ ] **A table that becomes a list drops its frozen-column treatment (REG-390)** — the sticky offset, the inner
      border and the scrolled shadow are for a table that scrolls sideways; left standing they draw a rule
      through the middle of a stacked row.
- [ ] **Chrome that auto-hides is opt-in per surface (REG-401)** — mount `AutoHideChrome` from the page that
      wants it, never from the shell, and let anything anchored to the dock (the FAB, a banner) travel with it.
- [ ] **A stacked comparison table repeats its column headings in each cell (REG-397)** — the head row is hidden,
      so without them two records read as unlabelled copies of each other.

## Verification
- [ ] 1440×1024 Playwright pass against the Figma frame; screenshots banked in `design-source/verify/`.
- [ ] **390×844 and 768×1024 passes too** — `scratchpad/verify-responsive.cjs` (route × viewport, fails on any
      page-level horizontal overflow and names the offending elements).
- [ ] Deviations / invented details logged in `design-source/REGISTER.md`.

## Lessons carried from the listing polish (2026-08-27)
- [ ] Body uses `overflow: clip`; sticky header keeps its top radius; bottom docks are in-flow sticky with a stuck-state strip behind them (never a fixed left offset, never a grey strip).
- [ ] Tables: fluid `flex: W 0 Wpx` + inline min-width; pinned columns stack, only the last carries divider + shadow; no multi-select on listings; row hover turns the name primary; empty cells get a visible link affordance.
- [ ] Date fields → shared DatePicker; icon-only controls → shared Tooltip; page ends with `--fab-clearance`.

## Stage movement (Settings › Leads) — every stage-changing surface obeys it
- Route every stage change through `requestStageChange` in `app/leads/workspace.tsx` — never call `moveStage`/`quickMoveStage` from a new surface directly.
- Linear: only the next stage is offered (`blockedReason` → `aria-disabled` + tooltip in menus, `canDrop` dims kanban columns); the wizard opens with one stage editable, done stages editable, later stages locked.
- Flexible: instant move + snackbar **Undo** (`undoStageMove` deletes the log); Won always opens its wizard step; On Hold / Lost always use their dialogs.
- Any new selector of stages (bulk bar, lead details, journey) must reuse the same helpers so the two modes never drift.
- Radio-as-card choices use `ChoiceCard`; page frame comes from `AppShell` — a new route gets `app/<route>/layout.tsx` rendering `<AppShell>` plus a skeleton.

## Quote editor (2026-09-11) — data rules the owner asked us to remember
- [ ] **No mock data (REG-403).** Every value on the screen is produced by a record: the lead (client, site address, property type, NRIC), the studio (issuing entity, GST), the member (prepared by, signature) or the quote's own rows (items → subtotal / GST / total / margin → payment schedule amounts). Figma strings and figures are layout direction only; seeded content that has to exist reads as real studio data and is logged as `invented copy`.
- [ ] Every new record type the editor adds gets its Activity branch (`lib/leads/activity.ts`) and its `db:repair` rule together (REG-343).
- [ ] The status pill lives in the editor HEADER, first before Send (REG-404 → REG-423); the header's title is the quote's, the crumb carries the lead.
- [ ] **Every table is the leads listing's model (REG-430).** Columns never go below the mock's width; the card scrolls sideways past that (`useOverflowX` turns the frame into the scroller only once the tracks run past it, so a short table's row menu still hangs below it); the first block is frozen (the listing's `.pin`: opaque, the row's fill, the shadow only while scrolled); the row's actions park at the visible right edge (a zero-width sticky item, content hanging left); every head cell carries `ColumnResizer` (REG-427) and dragged widths live in memory only (`lib/table-widths.ts`) — never localStorage. Build rules that bit once: the stroke is a real `border` on the scroll container (frozen cells paint over an inset shadow / outline), the fluid column's floor is the mock's px minus that border's 2px, every cell of a grid row is pinned `grid-row: 1` (a zero-size sticky item spanning row 1 otherwise pushes the auto-placed cells into row 2), and the actions' 24px inset sits on the inner box (a sticky `right` only insets while the frame scrolls); phone cards release the actions with `grid-area: auto`; a grid row pins its one track to its own height (`grid-auto-rows: 100%`) with `min-height: 0` cells, and a card that does not clip at rest redraws its stroke over the children with the `::after` ring (REG-431 — check the corners and the bottom edge at 3×). Row hover is `primary-variant` and a selected row hovered `primary-variant-hover` (REG-449); the row's title is the listing's name — bold, primary + underline on row hover, and it opens the record (REG-450); a hover control never covers a value the row exists to show — reserve its room in the column (REG-446 / REG-448). **Column settings (REG-454)**: declare the table's columns once (`TableColumnDef[]`, the identity column `locked`), read them through `useTableColumns(table, defs, phone)` in the orchestrator, let `useColumnLayout` give every head and row cell its `style` / `pin` class / `data-pin-edge` (`data-col` on every cell — the offsets are measured from the head row), put the `tune` button right after Filters (`onColumns`, omitted on a phone) and mount `ColumnSettingsDrawer pinning={{ max: 3 }}` with the hook's `all` / `save` / `reset`; the pin rules are `.head .pin, .row .pin` (0,2,0 — the head cell's own `position: relative` must not win) and a flex row's parked actions need `order: 100`. In the drawer a row reads handle · label · switch · pin; a pinned row has no switch. Head cells spread `useColumnDrag(...).head(key)` so a head can be dragged to reorder (REG-462); the orchestrator passes `onReorder={columnPrefs.reorder}`. Any filters modal or settings drawer that edits a draft applies it live through `useLiveApply` (REG-464) — the page changes as the user ticks, Clear all / Reset empty at once, the primary button is Done, never Apply / Save. A new table gets all of it in the same commit. A gallery that also lists (Files, Templates) puts the Files tab's grid / list toggle at the toolbar's end, remembers it per browser, hides it ≤767 (cards are the one phone view) and shares the kebab's items between the card and the row (REG-505).
- [ ] **Measure before you deviate (REG-423).** Every editor switch is `Switch size="sm"` with its label in ink; menus cap to the viewport (`PortalMenu`); a rest-state text cell is text, not an input; the Maison AI mark is the turned asset (never rotate it again in CSS). When a mock and the build disagree, read the build's computed style (box-shadow for DS strokes — `border` reports currentColor on a border-less button) before changing anything.
- [ ] **A group's answer is its lines' (REG-417).** The status chip sits on the group row and a child's STATUS cell is empty, so a child never carries a status its group does not — the server cascades it, `countedLines` (lib/quotes/math.ts) leaves out everything under a Declined group, and the seed never marks a child Declined on its own.
- [ ] Queued cell writes are settled before any structural write reloads the lines, and forgotten by undo / redo (REG-417) — never reload over a pending patch.
- [ ] Items menus on the phone are bottom sheets through `PortalMenu sheetTitle` (opt-in); the section toolbar folds to three controls at ≤1024 with `useMediaQuery`, never two stylesheet-toggled toolbars.
- [ ] **Payment amounts are derived, never stored (REG-418).** A schedule row holds a share; the amount is the quote's live total × share (`lib/quotes/payments.ts`), and the Won wizard / any later reader computes the same. Every quote has a schedule from creation (`createQuote` + repair R24).
- [ ] A section that owns its toolbar renders its own card through `MovableSection`'s `render` slot (the Payment Schedule, Files); the generic card stays for the coming-soon bodies.
- [ ] **Templates resolve, text derives (REG-420).** A template body carries bracketed tokens that resolve to records on Add; Write with AI composes from the quote's own items, schedule and fields — never a canned paragraph with the mock's figures.
- [ ] **A section's records make its Activity (REG-421).** The editor's Activity derives from stamps at load; a new stamped record type gets a line in `lib/quotes/activity.ts` and, where the lead should see it, in `lib/leads/activity.ts`.
- [ ] **The editor is the `(editor)` route group (REG-422).** Anything at `/quotes/*` that should wear the shell goes under `app/quotes/`; the rail-less editor stays under `app/(editor)/quotes/[quoteId]`.
- [ ] **A quote never owns a file (REG-419).** `quote_files` links the lead's files; Delete unlinks, an upload creates a lead file first. `BASELINE_TABLES` lists a child table AFTER every table it references — a restore inserts in that order.

- [ ] **Mandatory fields are starred** (REG-451): pass `required` to every field a validator or a Save gate demands (chip groups too); never write the asterisk into the label. **Phones display through `phoneLocal`** (REG-452), never raw digits.

- [ ] **A template prints what the document renders (REG-486 / REG-490).** Every template surface — the gallery card, the Create Quote tile, the editor's canvas, the Preview, the printed PDF — draws through `components/templates/render/document.tsx` with the studio's kit and real data; never a placeholder document, never a second renderer. A block's every option lives in `lib/templates/model.ts` and is read by `slices.tsx`; a new option is added to both, and to the inspector.
- [ ] **A quote pins its template version (REG-489).** `createQuote` and Set template stamp `template_version`; a newer publish shows the banner and never rewrites a sent quote. The client-facing switches live on the quote (`client_view_json`) as the difference from the template's own view.
- [ ] **The brand kit is the studio's, the template's brand is an override (REG-487).** Read colours by name (`resolveColor`) and type by role (`textCss`); a template's `design.brand` only ever holds what differs, with Reset to brand beside it.
- [ ] **A Company section is a page with its peers as a tab strip (REG-484 / REG-498).** New sections go through `CompanyShell` and `lib/company/sections.ts`; an unbuilt kind still gets a tab and a page that says "Coming soon in OpenMaison 2.0".
- [ ] **Only published versions reach a quote (REG-501).** Pickers, `createQuote` and the Preview read `status = 'published'` designs; a submission awaiting approval never changes what prints. A new publish path must clear `submitted_*` and honour `template_approval`.
- [ ] **Delete is soft and reads Delete (REG-502).** A template, like a lead or a quote, gets `deleted_at`, an Undo, and a Deleted sheet with Restore; Delete forever only when nothing references it. Never an Archive.
