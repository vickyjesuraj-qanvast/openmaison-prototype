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
- [ ] `MaisonFab` present (raised when a bottom dock is shown); `--bottom-dock` respected by
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
- **Numbers are filtered as typed**, never only validated: any field that holds digits (amounts, phone, area, %, counts) uses `TextField numeric="digits"` or `numeric="amount"` (thousands grouping) — letters and symbols must never appear in the box (REG-150).
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
