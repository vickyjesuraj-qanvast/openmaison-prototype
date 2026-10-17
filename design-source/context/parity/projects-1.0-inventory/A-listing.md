# A — 1.0 Projects: the listing

Read from the OpenMaison 1.0 working tree `/Users/vicky/Documents/GitHub/qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`, code only (the app was not run). Read in full: `src/app/(main)/projects/page.tsx` (714 lines), `src/components/projects/workload-view.tsx`, `project-card.tsx`, `project-card-updated.tsx`, `draft-setup-card.tsx`, `setup-progress.tsx`, `src/lib/project-health.ts`, `src/lib/project-progress.ts`, `src/lib/lifecycle-aggregates.ts`, `src/lib/use-table-sort.ts`, `src/components/ui/sortable-header.tsx`, `src/components/ui/primary-page-header.tsx`, `src/lib/hooks/use-shortcut-create.ts`, `src/lib/hooks/use-keyboard-shortcuts.ts`, `src/lib/keyboard-shortcuts.ts`, `src/lib/access-control.ts`, `src/components/layout/app-sidebar.tsx`, `bottom-nav.tsx`, `search-results.tsx`, `quick-action-menu.tsx`, `src/app/(main)/layout.tsx`, `src/components/ui/page-coach-marks.tsx`, `src/app/api/projects/records/route.ts`, `src/app/api/projects/[id]/archive/route.ts`, `…/unarchive/route.ts`, `src/app/api/project-aggregates/contract-values/route.ts`, `src/lib/finance/contract-value.ts`, `docs/rules/projects.md`, `docs/prd/09-projects.md`. Read in the parts the listing touches: `src/context/app-context.tsx` (lines 1–450 + the projects filter and value), `src/lib/queries/projects.ts` (1–420, 995–1060), `src/lib/queries/project-aggregates.ts` (1–135, 240–320, 695–749), `src/lib/transformers.ts` (88–182, 420–587), `src/lib/finance/contract-loader.ts`, `src/lib/lifecycle/transitions.ts`, `src/lib/region-config.ts` (620–696), `src/lib/search.ts`, `src/components/layout/topbar.tsx` (1–330), `src/app/globals.css` (the classes and keyframes the page uses), `src/context/session-context.tsx`, `src/context/page-context.tsx`, the UI primitives (`card`, `badge`, `button`, `skeleton`, `input`, `avatar`, `error-boundary`).

**Citation key:** `page.tsx:N` always means `src/app/(main)/projects/page.tsx:N`. Every other file is cited by its path from the 1.0 repo root. **[inferred]** marks something worked out from the code rather than read as a statement.

---

## Bottom line

- The listing is one client page at `/projects`: a sticky header ("Projects" + count, a view toggle, "New Project"), four KPI tiles, a chip row (All · Draft · Active · Closed · Archived) with a search box, and one collapsible card holding a 5-column table (cards below 1024px). It keeps **no state in the URL**: filter, search, sort, view and collapse are lost on every visit, including Back from a project (A-03).
- **"Active" means three different things on the same screen.** The KPI "Active Projects" counts every project whose *stage* is not Closed (so it includes Drafts), the "Active" chip counts a status-derived group, and the sidebar badge counts three *status* words. The owner's screenshot shows it: "Active Projects 32" beside "Active 21" (A-121, A-122).
- **Two unrelated vocabularies are shown side by side.** Chips use the *stage* (Draft / Active / Closed, moved by setup gates and closure). The Status pill uses the *status* (Planning, In Progress, On Hold, Completed, Cancelled, Hacking), which is set to "Planning" at creation and only ever changes by hand or by the AI agent — so nearly every row reads "Planning", closed projects included (A-81…A-89, A-128).
- **The health KPIs are half-dead on this page.** Budget and Collection are always neutral (no invoices are passed), the Issues part always scores 100 (escalations carry no project id), and Momentum reads a legacy column nothing writes. List health can only move between about 60 and 90, so **"At Risk" can practically never be anything but 0** (A-123…A-125).
- **The Progress column is a stored number that nothing in the UI updates** (0 at creation; only the AI agent tool writes it). The project page computes progress from milestones instead, so list and detail disagree (A-127).
- **The Project column shows the client's name, not the project's name**, yet "Project" sorts by the hidden project name; the Archived list, the workload bars and the global search show the project name instead (A-33, A-131, A-144).
- **Owner-only extras:** the view toggle, the KPI strip and the workload view are gated on the `owner` tag alone. Admins see every project but none of these (A-99, A-136).
- **Designers are filtered in the browser only.** The list API returns every studio project (budgets, phones, quote data, signed contract URLs) to any signed-in member; the Archived list is not filtered at all, and its Unarchive button fails silently for Designers (A-100, A-137, A-176, A-193).
- **The workload view** is a per-member row of project blocks against a hard-coded capacity of 4. It ignores the chips and the search (which stay on screen), never shows unassigned projects, lists every active member including accounts staff, and contradicts the PRD's stated non-goal (A-145…A-174, A-222).
- **No row actions, no bulk actions, no pagination or virtualisation, no error state.** A failed load reads as "0 projects · No projects found · Try a different search or filter" (A-18, A-61, A-68, A-140).
- **Stale and dead pieces:** the rules doc and the first-visit coach mark still describe "Design / Execution / Closed"; `project-card.tsx`, `project-card-updated.tsx`, `SetupProgressIndicator`, `usePortfolioKPIs`, the legacy `sidebar.tsx`, the unreachable Quick Actions menu and the orphan `/projects/new` page are all dead (A-143, A-206, A-209…A-213, A-216).
- "Commission Pending" is stamped on **every** Draft row whatever the real missing setup step is, and only on desktop (A-129).

---

## S1 — The listing page (`/projects`, table view)

### (1) What it is / entry points

- **A-01** The listing is the client component `ProjectsPage` at the route `/projects`, inside the `(main)` layout group (topbar + sidebar + bottom nav). `page.tsx:1`, `page.tsx:115`; `src/app/(main)/layout.tsx:160-211`.
- **A-02** Ways in: the sidebar item "Projects" (`src/components/layout/app-sidebar.tsx:200`), the phone bottom bar's "Projects" (`src/components/layout/bottom-nav.tsx:91`), the keyboard sequence "G then P" (`src/lib/keyboard-shortcuts.ts:14`, `:31`; `src/lib/hooks/use-keyboard-shortcuts.ts:53-61`), the dashboard's Projects widget labelled "View projects" (`src/components/dashboard/home-widgets.tsx:217`), the project page's back link and its "Project not found" state (`src/app/(main)/projects/[projectId]/page.tsx:1616`, `:1634`), after a project is deleted or archived (`src/components/projects/confirm-delete-project-dialog.tsx:51`, `:66`), the lead drawer's fallback when a created project returns no id (`src/components/leads/lead-detail-drawer.tsx:3403`), and "Finalize Quote" in the project quote wizard (`src/app/(main)/projects/[projectId]/quotes/new/page.tsx:156`).
- **A-03** The page reads **no URL parameters**. Search text, stage filter, archived mode, view mode, collapse state and the create drawer are React state, and the sort lives in a hook's state; all reset when the page mounts. `page.tsx:121-129`, `page.tsx:199`; `src/lib/use-table-sort.ts:11-12`.
- **A-04** Route access by tag: `owner`, `admin` and `id` may open `/projects`; an accounting-only member is redirected to their default route. `src/lib/access-control.ts:68`, `:134-169`; `src/app/(main)/layout.tsx:143-145`.
- **A-05** If the platform switches the `projects` page off, the main area shows a tile with "?" and the copy "Coming Soon" / "This feature is not yet available. Check back later!" instead of the page. `src/app/(main)/layout.tsx:121-129`, `:187-196`.
- **A-06** On mount the page registers itself with the assistant's page context: `page: "projects"` with `summaryStats` `{ total, draft, active, closed }`. `page.tsx:170-180`; `src/context/page-context.tsx:23-28`.

### (2) Layout

- **A-07** Page wrapper: side padding 16px, 24px from 640px, 32px from 768px; bottom padding 24px (32px from 768px); regions stacked with 24px gaps. `page.tsx:283`.
- **A-08** Regions, top to bottom: sticky page header → KPI strip (owner, table view only) → filter bar (chips + search) → exactly one of: workload card, archived card, or the grouped list. `page.tsx:284-312`, `:315-341`, `:344-401`, `:404-410`, `:413-463`, `:466-667`.
- **A-09** Header (`PrimaryPageHeader`): a white bar that bleeds to the main area's edges through negative margins, 1px bottom border, 14px vertical padding, `sticky top-0 z-20` inside the scrolling `<main>`. `src/components/ui/primary-page-header.tsx:72-84`.
- **A-10** Header content is one row, space-between, 16px gap: left = title over subtitle; right = actions with 8px gap. Title is 20px / 24px bold in the heading font with tight tracking; subtitle is 12px / 16px in the secondary colour, 2px below. `src/components/ui/primary-page-header.tsx:86-98`; `src/app/globals.css:1069`, `:1083`; `page.tsx:287`.
- **A-11** KPI strip: a grid of 2 columns below 640px and 4 from 640px, gap 10px (12px from 640px). Each tile: 12px radius, 12px padding, white surface, `shadow-sm`, 1px tinted border (primary at 12%, green 15%, yellow 15%, red 12%), `min-w-0`. `page.tsx:316-339`.
- **A-12** Filter bar: a column below 640px (chips row, then a full-width search) with 8px gap; from 640px a row with 12px gap, chips on the left and the search pushed to the far right at 180px wide. `page.tsx:344`, `:392-399`.
- **A-13** Chips row: one line that never wraps, 6px gaps, horizontal scroll with the scrollbar hidden, and a 24px fade-to-transparent mask on its right edge. `page.tsx:349`.
- **A-14** The list is a stack (16px gap) of section cards. A card has a 16px radius, a 1px `surface-variant` border, `shadow-sm`, hidden overflow and no inner gap. `page.tsx:466`, `:472`; `src/components/ui/card.tsx:5-13`.
- **A-15** Section header: a full-width button, 16px side padding (20px from 640px), 12px vertical padding, a faint tinted background (`surface-bg` at 60%), 1px bottom border; its content is a row with 10px gaps. `page.tsx:474-478`.
- **A-16** Desktop table (from 1024px): `table-fixed`, full width with a minimum of 880px inside a horizontally scrolling wrapper, 14px text. Seven columns: 56px · flexible · 190px · 170px · 155px · 140px · 56px. `page.tsx:490-501`.
- **A-17** Table head: white background with a 1px bottom border (`app-table-header`); head cells are 11px semibold uppercase with wide tracking in the disabled grey, 10px vertical padding. Body rows have 14px vertical padding, 1px dividers in `surface-bg`, on a 40%-white background. `page.tsx:503-513`, `:538`; `src/app/globals.css:1544-1547`.
- **A-18** There is **no pagination, no "load more" and no virtualisation**. Every project the member may see arrives in one request and every one becomes a DOM row. `src/app/api/projects/records/route.ts:70-85`; `page.tsx:520`.

### (3) UI elements

**Header**

- **A-19** Title: "Projects". `page.tsx:286`.
- **A-20** Subtitle: "{n} project" when n is 1, otherwise "{n} projects" (so "0 projects", "33 projects"). n is the number of non-archived projects the member can see — it does **not** follow the chips or the search. `page.tsx:287`; `src/context/app-context.tsx:135-143`.
- **A-21** View toggle (owner only): a 2-segment control with a 1px border and a 4px radius. Each segment is a bare 13px icon — `LayoutList` for the table, `Users` for the workload — padded 10px × 6px. Selected = primary fill with a white icon; unselected = secondary-grey icon with a 4% hover wash. There is no text, tooltip, `title` or `aria-label`. `page.tsx:291-306`.
- **A-22** "New Project": the default (filled primary) button at size `sm` — 32px high — with a 13px `Plus` and the label "New Project"; the label is hidden below 640px, leaving a lone "+". Shown to every role. `page.tsx:307-309`; `src/components/ui/button.tsx:44`.

**KPI tiles (owner, table view)**

- **A-23** Each tile is a 10px label in the secondary colour over an 18px (20px from 640px) bold, tabular-number value. Tiles are static: no click, hover, tooltip (bar one, A-25) or drill-down. `page.tsx:317-339`.
- **A-24** Tile 1 — label "Active Projects"; value in the primary colour. `page.tsx:317-320`.
- **A-25** Tile 2 — label "Total Pipeline"; value in green, compact currency with at most one decimal ("S$ 5M", "S$ 480K", "S$ 950"); the tile's native `title` tooltip carries the full figure with cents ("S$ 5,012,345.00"). `page.tsx:321-328`; `src/lib/region-config.ts:654-659`, `:680-696`.
- **A-26** Tile 3 — label "Avg. Health"; value "{n}" followed by a small grey "/100". The number is green at 70 or more, yellow at 50–69, red below 50. `page.tsx:329-334`.
- **A-27** Tile 4 — label "At Risk"; value is a count, red when above 0 and then captioned "health < 50"; grey with no caption at 0. `page.tsx:335-339`.

**Chips and search**

- **A-28** Chips in order: "All", "Draft", "Active", "Closed", then "Archived". Each is a pill at least 36px high with 14px side padding and 12px medium text. `page.tsx:350-390`.
- **A-29** The three stage chips carry a 6px dot before the label — Draft yellow, Active green, Closed grey; "All" has none. A count follows the label in 10px regular type and is omitted when it is 0. `page.tsx:364-372`; `page.tsx:38`, `:50`, `:62`.
- **A-30** Selected stage chip: primary fill, white text, `shadow-sm`, dot turned white at 80%, count at 70% opacity. Unselected: white surface, 1px border at 30%, secondary text; hover tints the border and background with primary. `page.tsx:358-362`, `:365`, `:369`.
- **A-31** "Archived" chip: a 12px `Archive` icon, the label "Archived", and the archived count when above 0. Selected it turns dark (`bg-on-surface-default`) with light text; unselected it matches the other chips with a neutral hover. `page.tsx:375-390`.
- **A-32** Search: an input 36px high with a 14px `Search` icon inside on the left, placeholder "Search projects…" (a real ellipsis character), 14px text, white surface, a primary focus ring. No clear button, no result count. `page.tsx:392-399`.

**Section and table**

- **A-33** The Project cell's main line is the **client name**; it falls back to the project name, then to "Untitled project". 14px semibold, one line, truncated. When a client name exists the project's own name appears nowhere in the row. `page.tsx:523-528`, `:545`.
- **A-34** The Project cell's second line is "{property type} · {property address, else property name}" (for example "HDB 2-Room · Newton"), 11px in the disabled grey, truncated; the line is dropped when both are empty. `page.tsx:529`, `:546`.
- **A-35** Section header content: a 14px grey chevron (`ChevronDown` open, `ChevronRight` collapsed), an 8px dot, the section label in 12px semibold heading font, and a count pill (11px medium, bordered, fully rounded). `page.tsx:480-483`.
- **A-36** With "All" selected the one section is labelled "All Projects" with a primary dot and a primary-tinted pill. With a stage selected the one section takes that stage's label, dot and tint. `page.tsx:225-243`.
- **A-37** Table columns in order: an unlabelled avatar column · "Project" (sortable) · "Type" (sortable) · "Progress" · "Designer" (sortable) · "Status" · an unlabelled action column. `page.tsx:503-511`.
- **A-38** Avatar cell: a 36px square with a 12px radius holding up to two initials in 11px bold. Initials come from the client name (else the project name, else "?"), split on spaces, hyphens and em dashes. The colour is one of four soft gradients chosen by the sum of the name's character codes modulo 4: blue, green, amber or red. `page.tsx:70-84`, `:530`, `:538-542`; `src/app/globals.css:1026-1045`.
- **A-39** Type cell: a chip with the project type ("New-Partial", "Renovation-Full Home", …) — 11px, light grey fill, 1px border, fully rounded, never wraps — or a dash when empty. `page.tsx:549-553`; `src/data/lead-bucket-config.ts:294-301`.
- **A-40** Progress cell: a 6px rounded track with a gradient fill and "{n}%" in 11px semibold, right-aligned in a 32px slot. Fill and number are coloured by the row's stage group: Draft amber (`#F5C85A → #F19E2B`), Active green (`#6AD57A → #469E59`), Closed grey (`#C4BFD0 → #999999`). At 0% there is no fill and the number is grey. `page.tsx:42`, `:54`, `:66`, `:555-562`.
- **A-41** Designer cell: a 24px round neutral-grey avatar with the first letter of the name, then the name in 12px secondary, truncated; a dash when nobody is assigned. Only the first assignee is shown. `page.tsx:531`, `:564-575`; `src/lib/transformers.ts:493`, `:519-520`.
- **A-42** Status cell: an outline badge, 11px, with an 11px icon and the status word. Tones: "Planning" primary tint with a clock; "In Progress" green with an activity line; "Construction", "Renovation", "Hacking" yellow with a hammer; "Installation" yellow with a wrench; "Completed" green with a check; "Handover" green with an arrow; "Delayed" red with a warning triangle; "Cancelled" grey with an X. A status with no entry is drawn in the "In Progress" style with its own word. `page.tsx:102-113`, `:522`, `:577-581`.
- **A-43** Action cell: one 32px icon button (`ArrowRight`, 14px, primary) with the `title` "View project", invisible until the row is hovered. There is no kebab, checkbox or other row control. `page.tsx:590-594`.
- **A-44** Draft-group rows carry a second yellow badge reading "Commission Pending" beside the status. `page.tsx:582-586`.
- **A-45** An empty Type or Designer cell shows "—" in the disabled grey at 40%, not selectable. `page.tsx:687-689`.

### (4) Interactions

- **A-46** Clicking anywhere on a row opens the project (`router.push("/projects/{id}")`); the arrow button does the same and stops the click from firing twice. `page.tsx:536`, `:591`.
- **A-47** Row hover: a 10% primary wash, a 3px primary bar drawn inside the row's left edge, the client name turns primary, the arrow fades in, the cursor is a pointer. `page.tsx:534`, `:545`, `:591`.
- **A-48** Sorting: clicking "Project", "Type" or "Designer" cycles ascending → descending → off. The active head shows a 13px primary up or down arrow; an inactive head shows a faint two-way arrow only on hover. One column at a time. `src/lib/use-table-sort.ts:14-24`; `src/components/ui/sortable-header.tsx:24-45`.
- **A-49** Sort values: "Project" sorts by the project **name**, "Type" by project type, "Designer" by the first assignee's name. Text compares case-insensitively with `localeCompare`; empty values sort last. `page.tsx:191-198`; `src/lib/use-table-sort.ts:39-51`.
- **A-50** With no sort chosen the order is newest-created first, as the server returns it. `src/app/api/projects/records/route.ts:85`; `page.tsx:214-217`.
- **A-51** The sort survives chip changes and searches while the page stays mounted. `page.tsx:199`.
- **A-52** Search filters on every keystroke with no debounce: a case-insensitive "contains" test on the project name and the client name only. `page.tsx:185-188`.
- **A-53** Stage chips are single-select. Clicking one sets the stage filter and switches Archived mode off. `page.tsx:357`.
- **A-54** Clicking "Archived" toggles archived mode without touching the remembered stage; while it is on, no stage chip looks selected, and switching it off returns to the stage that was selected before. `page.tsx:353`, `:376`.
- **A-55** Clicking a section header collapses or expands its table. Collapse is remembered per section id (All, Draft, Active, Closed) for as long as the page stays mounted; sections start expanded. `page.tsx:129`, `:278-280`, `:469`, `:487`.
- **A-56** The section header exposes `aria-expanded` and an `aria-label` of the form "Collapse All Projects section" / "Expand Draft section". `page.tsx:476-477`.
- **A-57** "New Project" opens `ProjectCreateDrawer` over the list. When a project is created the page navigates to `/projects/{newId}`; closing the drawer returns to the list unchanged. `page.tsx:307`, `:670-680`.
- **A-58** Keyboard: pressing "C" (no modifier, focus outside any field, no dialog open) opens the create drawer. `src/lib/hooks/use-keyboard-shortcuts.ts:39-48`, `:81-84`; `src/lib/hooks/use-shortcut-create.ts:9-14`; `page.tsx:128`.
- **A-59** Keyboard: "/" and ⌘K / Ctrl K focus the **topbar's** global search, never this page's "Search projects…" box. `src/lib/hooks/use-keyboard-shortcuts.ts:32-37`, `:77-80`.
- **A-60** Focus styling: chips use a 2px white + 2px primary ring; the section header uses an inset 2px primary ring. Table rows are not focusable. `page.tsx:358`, `:478`; `src/app/globals.css:1768-1781`.
- **A-61** Nothing on the list is optimistic, undoable or confirmed: there is no inline edit, drag, multi-select, bulk bar, context menu, or delete / archive / clone from a row. `page.tsx:520-597`.

### (5) States

- **A-62** Loading: while the app context reports loading, the whole page (header included) is replaced by pulsing ghosts — a 144×32 title and a 256×16 subtitle beside a 128×32 button; four 80px-high tiles in the 2 / 4-column grid; a 256×36 bar followed by four 64×28 pills; two 192px-high rounded blocks. `page.tsx:246-276`; `src/components/ui/skeleton.tsx:7`.
- **A-63** That loading flag is true until leads, projects, escalations, chats **and** studio members have all loaded. `src/context/app-context.tsx:152`.
- **A-64** There is no route-level `loading.tsx` for `/projects`; the only `loading.tsx` files in the app sit under `(marketing)`. (Checked with `find src/app -name loading.tsx`.)
- **A-65** Empty with "All" selected: a 40px grey circle holding a `LayoutList` icon, "No projects found", then "Try a different search or filter". `page.tsx:691-701`.
- **A-66** Empty with a stage selected: a 40px circle in the stage tint with the stage icon (`FileEdit` Draft, `Activity` Active, `CheckCircle2` Closed), "No projects in Draft" / "No projects in Active" / "No projects in Closed", then "Projects will appear here when assigned to this stage". `page.tsx:703-714`, `:517`, `:604`.
- **A-67** The empty block sits inside the table body (the column heads stay) on desktop, and alone on phones. `page.tsx:514-519`, `:603-604`.
- **A-68** Error: the page has no error state of its own. If the projects request fails the list falls back to an empty array, so the page shows "0 projects" and the "No projects found" empty state. `src/context/app-context.tsx:101`; `src/lib/queries/projects.ts:44-47`.
- **A-69** A render crash is caught by the layout's boundary: a red warning icon, "Something went wrong", "An unexpected error occurred. Please try refreshing the page.", and a "Try Again" button. `src/components/ui/error-boundary.tsx:33-52`; `src/app/(main)/layout.tsx:198`.
- **A-70** There are no disabled controls and no "no permission" message on the main list; controls a member may not use are simply not rendered. `page.tsx:291`, `:315`.

### (6) Motion

- **A-71** `animate-fade-up` plays the `fadeUp` keyframe — opacity 0 → 1 and translateY 12px → 0 — over 0.4s, ease-out, fill-mode both. `src/app/globals.css:1222-1225`, `:1654-1656`.
- **A-72** Entrance stagger on load: KPI strip delayed 100ms, filter bar 180ms, section card 240ms, and each row or phone card `min(index, 10) × 40ms` (so the 11th row onward all start at 400ms). `page.tsx:316`, `:344`, `:472`, `:534-535`, `:616-617`.
- **A-73** **[inferred]** The section card is keyed by the section id and rows only mount while expanded, so choosing another stage chip, or expanding a collapsed section, replays the card and row entrances. `page.tsx:472`, `:487`, `:534`.
- **A-74** The sticky header gains a soft two-layer shadow once the main area has scrolled at all, with a 200ms shadow transition. `src/components/ui/primary-page-header.tsx:54-66`, `:81-82`.
- **A-75** Chips transition colour, background, border, shadow and transform over 200ms; an unselected chip scales to 0.95 while pressed. `page.tsx:358-361`, `:377-380`.
- **A-76** Row hover transitions background and box-shadow over 200ms; the name's colour and the arrow's opacity use the default 150ms. `page.tsx:534`, `:545`, `:591`.
- **A-77** The desktop progress fill animates its width over 500ms; the phone card's fill has no transition. `page.tsx:558`, `:639`.
- **A-78** Sortable heads fade a 4% hover wash in over 150ms, and their idle sort icon fades to 40% on hover. `src/components/ui/sortable-header.tsx:29`, `:43`.
- **A-79** Collapse / expand, the table ⇄ workload switch and the list ⇄ archived switch are instant; only the toggle segments' colours transition. `page.tsx:295`, `:487`, `:404`, `:413`, `:466`.
- **A-80** Under `prefers-reduced-motion: reduce` a global rule cuts every animation and transition to 0.01ms. `src/app/globals.css:1331-1338`.

### (7) Rules and logic

**Stage and status — the two vocabularies**

- **A-81** A project has a `stage` — "Draft", "Active" or "Closed" (database check constraint, default "Draft") — and a separate `status` enum: `planning`, `hacking`, `in_progress`, `completed`, `on_hold`, `cancelled`. `supabase/migrations/20260503000002_project_stage_values.sql:15-19`; `supabase/migrations/20240101000001_enums.sql:32`.
- **A-82** On read the stage is normalised: "draft" → Draft, "closed" → Closed, anything else (the legacy "Design" / "Execution", empty, "active") → Active. `src/lib/transformers.ts:457-467`, `:527`.
- **A-83** On read the status becomes a display word: "Planning", "Hacking", "In Progress", "Completed", "On Hold", "Cancelled"; an unknown value is title-cased. `src/lib/transformers.ts:103-108`, `:176-178`, `:500`.
- **A-84** The chip group a row belongs to (`getStage`): stage Draft → **Draft**; stage Closed → **Closed**; otherwise by status — "Completed", "Cancelled" or "Handover" → **Closed**, every other status (including unknown ones) → **Active**. `page.tsx:86-100`, `:47`, `:59`.
- **A-85** Every new project is saved with status `planning`, whatever the caller sent. `src/app/api/projects/records/route.ts:272`.
- **A-86** The status only changes when someone edits it by hand in the project page's Overview card (choices: "Planning", "In Progress", "On Hold", "Completed", "Cancelled") or when the AI agent's update tool sets it. `src/app/(main)/projects/[projectId]/page.tsx:443-445`, `:1466-1477`; `src/lib/agents/executors.ts:2503`.
- **A-87** Stage moves: a new project is Draft unless all setup gates already pass at insert, then Active. `src/app/api/projects/records/route.ts:255-263`.
- **A-88** Stage moves: Draft → Active happens when someone opens the project page with every gate satisfied, finishes the setup wizard, or a commission change request is approved (that last path promotes any Draft project without re-checking the other gates). Until one of these happens the list keeps showing the project under Draft. `src/app/(main)/projects/[projectId]/page.tsx:1570-1576`; `src/components/projects/draft-setup-wizard.tsx:109`; `src/app/api/finance/records/commission-change-requests/route.ts:251-270`.
- **A-89** Stage moves: closure approval sets stage "Closed" and `closed_at`; it does not change the status. `src/app/api/projects/records/[id]/closure/route.ts:71-79`.
- **A-90** The five setup gates behind Draft: "Designer assigned", "Quote added", "Contract uploaded", "Project timeline created", "Commission structure" (the last passes automatically when the studio's commission approval is switched off). The listing imports none of this. `src/components/projects/setup-progress.tsx:23-58`; `page.tsx:1-27`.

**KPI formulas (computed in the browser from the loaded list)**

- **A-91** "Active Projects" = the number of loaded projects whose normalised stage is not "Closed" — that is Draft-stage plus Active-stage projects, whatever their status. `page.tsx:151`, `:154`.
- **A-92** "Total Pipeline" = the sum, over that same set, of each project's contract value in cents; when no contract value has loaded for a project it uses `budget × 100`. `page.tsx:155`.
- **A-93** Contract value (resolved on the server): the latest client-signed quote's total; else the primary quote if it is "sent_for_signature" or "approved"; else the project's budget; plus the net of approved client variation orders; never below 0. Quote totals already include GST and discount. `src/lib/finance/contract-value.ts:65-113`; `src/lib/finance/contract-loader.ts:52-65`, `:89-113`.
- **A-94** Per-project health = Timeline × 0.30 + Budget × 0.25 + Issues × 0.20 + Momentum × 0.15 + Collection × 0.10, rounded and clamped 0–100; any part with no data scores a neutral 80. Labels: "On Track" ≥ 70, "Needs Attention" ≥ 50, "At Risk" < 50. `src/lib/project-health.ts:19`, `:81-94`.
- **A-95** Timeline = the share of milestones that are not overdue × 100 (overdue = not completed and end date before now). `src/lib/project-health.ts:31-39`.
- **A-96** Budget = 100 − 200 × |collected ÷ billed − progress ÷ 100|, floored at 0, only when something is billed and progress is above 0. Collection = collected ÷ billed × 100, capped at 100. `src/lib/project-health.ts:41-50`, `:75-79`.
- **A-97** Issues = 100 minus 20 per critical, 10 per high and 5 per medium escalation that is open or in progress, floored at 0. Momentum = progress updates in the last 14 days ÷ 2 × 100, capped at 100. `src/lib/project-health.ts:52-73`.
- **A-98** The listing calls the health function with the project's timeline, an **empty** invoice list, 0 collected, the escalations whose `projectId` equals the project, and the project row's own `progressUpdates` array. `page.tsx:134-142`.
- **A-99** "Avg. Health" = the rounded mean of those scores across the stage-not-Closed set (80 when the set is empty). "At Risk" = how many of them score below 50. Both tiles, the toggle and the workload view are shown only when the member's tags include `owner`. `page.tsx:118`, `:152-157`, `:291`, `:315`, `:404`.

**Who sees which projects**

- **A-100** A Designer — tag `id` without `admin` or `owner` — sees only projects where they are one of the assignees or the single `assignedTo` member. Everyone else allowed on the page sees all of the studio's non-archived projects. This filter runs in the browser. `src/context/app-context.tsx:135-143`; `src/lib/access-control.ts:48-50`.
- **A-101** If the Designer's own member record has not resolved, the list is empty rather than everything (fail-closed). `src/context/app-context.tsx:112-119`, `:137`.

**Counts**

- **A-102** Chip counts are taken before the search is applied, so they always show studio totals; "All" is the whole visible set. The section's count pill is taken after the search. `page.tsx:207-212`, `:352`, `:483`.
- **A-103** None of the KPIs follow the chips or the search. `page.tsx:150-159`.

**Other**

- **A-104** The Progress number is the stored `projects.progress` column, shown as is. `src/lib/transformers.ts:502`; `page.tsx:532`.
- **A-105** "New Project" has no role check on the page, and the create route checks only that a session exists and a name was sent. `page.tsx:307`; `src/app/api/projects/records/route.ts:171-179`.

### (8) Data

- **A-106** `GET /api/projects/records` reads `projects` (55 columns including `quote_data`, `timeline`, `progress_updates`, phone, email, budget, contract URL) joined to `project_assignees → studio_members → profiles`, filtered to the session's studio and `archived_at IS NULL`, newest first. `src/app/api/projects/records/route.ts:70-85`.
- **A-107** The same route then reads `studio_members` to name the single assigned member, and signs each stored contract URL with a service-role client. `src/app/api/projects/records/route.ts:92-129`.
- **A-108** `POST /api/project-aggregates/contract-values` with `{ projectIds, leadIds }` returns `{ values: { projectId: cents } }`, reading `projects`, `quotes`, approved `variation_orders` and `leads.quote_metadata`. It is cached for 30 seconds under a key that includes every project's id, lead id and budget. `src/lib/queries/project-aggregates.ts:266-295`; `src/app/api/project-aggregates/contract-values/route.ts:36-81`.
- **A-109** Escalations (`GET /api/escalations/records`) and active studio members (`GET /api/identity/members`, `is_active = true`) come through the app context and the page's own members query. `src/lib/queries/escalations.ts:6-18`; `src/lib/queries/leads.ts:122-139`; `src/app/api/identity/members/route.ts:69-75`; `page.tsx:130`.
- **A-110** Query cache: keys `["projects", studioId, "active"]` and `["projects", studioId, "archived"]`; app defaults are a 5-minute stale time, refetch on window focus, one retry. `src/lib/queries/projects.ts:41`; `src/components/providers.tsx:40-43`.
- **A-111** The listing itself writes only through Unarchive (S3) and whatever the create drawer does. `page.tsx:125`, `:453`, `:670-680`.

### (9) Responsive

- **A-112** Breakpoints in play: 640px (KPI grid 2 → 4, filter bar column → row, "New Project" label), 768px (page padding), 1024px (table vs cards, sidebar vs bottom bar), 1280px (the sidebar auto-collapses to 60px below it). `page.tsx:283`, `:308`, `:316`, `:344`, `:490`, `:602`; `src/app/(main)/layout.tsx:68-72`, `:180`, `:205`.
- **A-113** Below 1024px each project is a card in a divided list, 16px padding. Row 1: the 36px initials square, the client name over the property line, the status badge at the right. Row 2 (indented 46px): the type chip, then the progress bar and percentage filling the rest. Row 3 (only when a designer is assigned): a 24px avatar with two initials and the name, and a 13px primary arrow at the right. `page.tsx:602-660`.
- **A-114** Tapping a card opens the project; while pressed it scales to 0.98, and it takes a 20% primary wash on hover. `page.tsx:616`, `:618`.
- **A-115** Below 1024px there is no way to sort, and the "Commission Pending" badge is not drawn. `page.tsx:602-660`.
- **A-116** On phones the topbar and the bottom bar slide away while scrolling down and return on scrolling up (300ms, ease-in-out); the page header stays stuck at the top. `src/lib/hooks/use-scroll-direction.ts:27-44`; `src/components/layout/topbar.tsx:164`; `src/components/layout/bottom-nav.tsx:198`; `src/components/ui/primary-page-header.tsx:80`.
- **A-117** Between 1024px and the table's 880px minimum plus the sidebar, the table scrolls sideways inside its card rather than squeezing the Project column. `page.tsx:490-492`.

### (10) Problems

- **A-118** State is not addressable: no filter, search, sort, view or scroll position survives leaving the page, so opening a project and pressing Back always lands on "All", table view, unsorted, at the top. `page.tsx:121-129`.
- **A-119** The header count ("33 projects") never follows the chips or the search, and leaves archived projects out without saying so. `page.tsx:287`.
- **A-120** Search covers only project name and client name — not the address, property, type, designer, phone or project number — while the topbar's global search matches more fields for the same records. `page.tsx:187`; `src/lib/search.ts:46`.
- **A-121** "Active" is defined three ways on one screen: the KPI counts stage ≠ Closed (Drafts included, `page.tsx:151`), the chip counts the status-derived Active group (`page.tsx:86-100`), and the sidebar badge counts status in Planning / Hacking / In Progress (`src/components/layout/app-sidebar.tsx:115`). The dashboard widget uses a fourth list (`src/components/dashboard/home-widgets.tsx:207`).
- **A-122** A project whose stage is Active but whose status was set to "Completed" or "Cancelled" sits under the "Closed" chip yet still counts in "Active Projects", "Total Pipeline" and "Avg. Health". This matches the owner's screenshot: Closed 2, but 33 − 32 = 1 project closed by stage. `page.tsx:59`, `:93-97` against `page.tsx:151`.
- **A-123** The Issues part of health is dead on this page: the escalation objects have no `projectId` (the type and the transformer omit it), so the filter never matches and Issues is always 100. `page.tsx:137`; `src/types/app.ts:405-427`; `src/lib/transformers.ts:567-587`; `src/app/api/escalations/records/route.ts:43-57`.
- **A-124** The Momentum part reads the legacy `projects.progress_updates` JSON column, which no current code writes (progress updates now live in their own table). Budget and Collection are always the neutral 80 because no invoices are passed. `page.tsx:138`; `src/lib/transformers.ts:530`; `src/app/api/projects/records/route.ts:72`; `src/lib/project-health.ts:43-50`, `:76-79`.
- **A-125** **[inferred]** With A-123 and A-124, list health = 0.3 × Timeline + 20 + 20 + 12 + 8, so it can only range from 60 (every milestone overdue) to 90 (none overdue), and 84 with no milestones. "At Risk" (< 50) is unreachable unless a project still carries old JSON updates. The tile's "0" is structural, and "Avg. Health" only measures overdue milestones.
- **A-126** "Total Pipeline" includes Draft projects and falls back to the typed-in budget when there is no quote, so one figure mixes signed contract values with estimates and gives no hint of the mix. `page.tsx:151`, `:155`; `src/lib/finance/contract-value.ts:107-110`.
- **A-127** The Progress column shows a number nothing in the UI maintains: it is 0 at creation and the only writer is the AI agent's tool. The project page computes progress from milestones instead, and the helper's own comment claims the list uses it too. `src/app/api/projects/records/route.ts:274`; `src/lib/agents/executors.ts:2504`; `src/app/(main)/projects/[projectId]/page.tsx:2010`; `src/lib/project-progress.ts:23-26`.
- **A-128** The Status pill is disconnected from the lifecycle: closing a project leaves its pill at "Planning"; "On Hold" is a selectable status with no style of its own, so it is drawn green like "In Progress"; five styled statuses ("Construction", "Installation", "Renovation", "Handover", "Delayed") cannot exist in the database enum; "Hacking" exists in the enum but cannot be chosen in the UI. `page.tsx:102-113`, `:522`; `supabase/migrations/20240101000001_enums.sql:32`; `src/app/(main)/projects/[projectId]/page.tsx:443-445`.
- **A-129** "Commission Pending" is added to every Draft row whichever setup step is missing, even for a studio whose commission approval is off, and only on desktop. `page.tsx:582-586`; `src/components/projects/setup-progress.tsx:53-56`.
- **A-130** **[inferred]** The Status column is fixed at 140px, yet a Draft row holds two badges ("Planning" + "Commission Pending") on one line, which cannot fit without spilling into the action column. `page.tsx:499`, `:578-587`.
- **A-131** "Project" sorts by the project name while the row displays the client name, so the visible order can look random. `page.tsx:192` against `page.tsx:528`.
- **A-132** Empty-state copy misfires: a search with no hits under a stage chip says "Projects will appear here when assigned to this stage", and a studio with no projects at all is told "Try a different search or filter", with no first-run guidance or create button in the empty state. `page.tsx:517`, `:691-714`.
- **A-133** The ghost does not match the page: it shows four KPI tiles to members who will never get them, puts the search before the chips (the page has it after, on the right), has no header bar, and waits on leads, chats and escalations that the list does not need. `page.tsx:246-276`; `src/context/app-context.tsx:152`.
- **A-134** The view toggle has no accessible name or tooltip, and a people icon is the only clue that the second segment is a workload view. `page.tsx:293-304`.
- **A-135** Rows cannot be reached by keyboard. The only focusable way into a project is the arrow button, which stays at opacity 0 when focused. `page.tsx:534-536`, `:591`.
- **A-136** Admins see every project but get no KPI strip, toggle or workload view, because the gate is the `owner` tag alone. `page.tsx:118`; `src/lib/access-control.ts:23-25`.
- **A-137** The Designer filter is client-side only. `GET /api/projects/records` returns every studio project to any signed-in member, with budgets, phones, emails, quote data and freshly signed contract URLs; the server token is scoped per studio, not per member. `src/app/api/projects/records/route.ts:60-131`; `src/lib/supabase-scoped.ts:5-15`; `src/context/app-context.tsx:135-143`.
- **A-138** "New Project" is offered to Designers although the app's own tag-derived permissions grant `projects.create` to admins only; neither the page nor the route checks. `page.tsx:307`; `src/lib/access-control.ts:329`; `src/app/api/projects/records/route.ts:171-179`.
- **A-139** Work done for nothing: health scores and the contract-value request run for every role although only owners see their results. `page.tsx:134-147`.
- **A-140** A failed load is indistinguishable from an empty studio, and there is no retry. `src/context/app-context.tsx:101`; `page.tsx:691-701`.
- **A-141** Small inconsistencies: the designer avatar shows one initial on desktop and two on phones (`page.tsx:569`, `:650`); a project with several assignees shows only the first (`src/lib/transformers.ts:519-520`); the phone card drops its arrow when no designer is assigned (`page.tsx:645-657`).
- **A-142** **[inferred]** From 640px the chips container is only as wide as its content, so the always-on 24px right-edge fade lands on the "Archived" chip's own right side. `page.tsx:349`.
- **A-143** Dead code in the page: `tasks` is taken from the context and never used (`page.tsx:116`); three sort accessors — `client`, `stage`, `budget` — have no column (`page.tsx:193-196`); `usePortfolioKPIs` duplicates the KPI maths from budget alone and is called nowhere (`src/lib/queries/project-aggregates.ts:711-749`).
- **A-144** The Project column names the client, while the Archived list, the workload bars and the global search name the project, so one record carries different titles across views of the same page. `page.tsx:528`, `:440`; `src/components/projects/workload-view.tsx:107`; `src/lib/search.ts:56`.

---

## S2 — The workload view (the second view)

### (1) What it is / entry points

- **A-145** Shown in place of the grouped list when an owner picks the people icon in the header toggle, and only while Archived mode is off. No URL; the choice resets to the table on every visit. `page.tsx:127`, `:300`, `:404-410`.
- **A-146** It answers "who is carrying how many live projects": one row per studio member with that member's projects as blocks. `src/components/projects/workload-view.tsx:32-58`.

### (2) Layout

- **A-147** One card (16px radius, `shadow-sm`, hidden overflow) of divided rows; there is no heading, legend, column header or totals row. `src/components/projects/workload-view.tsx:69-70`.
- **A-148** A row is a horizontal flex with 12px gaps (16px from 640px), 16px side padding (20px from 640px) and 16px vertical padding: 36px avatar · a fixed 96px name block (112px from 640px) · a flexible bar block · a 40px right-aligned percentage. `src/components/projects/workload-view.tsx:72-129`.
- **A-149** While this view is on, the KPI strip is hidden but the chips and the search box stay. `page.tsx:315`, `:344-401`.

### (3) UI elements

- **A-150** Avatar: 36px round, neutral grey gradient, two initials in 11px semibold. `src/components/projects/workload-view.tsx:74-78`.
- **A-151** Name block: the member's name (12px medium, truncated) over "{n} active project" / "{n} active projects" in 10px grey. `src/components/projects/workload-view.tsx:81-84`.
- **A-152** Bar: a 28px-high grey track (6px radius) holding one block per project with 2px gaps. Each block is 25% of the track wide and shows the project **name** cut to 12 characters plus "…", in 9px (10px from 640px) medium white text. `src/components/projects/workload-view.tsx:89-110`.
- **A-153** Block colours cycle by position through primary, green, yellow, blue, red and the primary hover shade; a project whose health is below 50 is forced red and gets " ⚠" after its name. `src/components/projects/workload-view.tsx:17-24`, `:91-92`, `:100`, `:108`.
- **A-154** A member with no projects gets the empty track with "No projects assigned" centred in 10px grey. `src/components/projects/workload-view.tsx:113-117`.
- **A-155** Under the bar, in 10px grey: "Capacity: {n}%" on the left and a status on the right — "✓ Has availability" (green), "Moderate" (yellow) or "⚠ Near capacity" (red). `src/components/projects/workload-view.tsx:118-123`.
- **A-156** At the right: the capacity percentage again in 14px bold tabular numbers, coloured green, yellow or red. `src/components/projects/workload-view.tsx:126-129`.

### (4) Interactions

- **A-157** Clicking a block opens that project. Hovering it dims it to 90% and shows a native tooltip with the full project name, plus " ⚠ At Risk" when flagged. `src/components/projects/workload-view.tsx:97`, `:99`, `:105`.
- **A-158** Hovering a row gives it a 4% wash. Nothing else is interactive: no reassigning, no drag, no expanding, no filter. `src/components/projects/workload-view.tsx:72`.

### (5) States

- **A-159** With no members: a centred card reading "No team members found". `src/components/projects/workload-view.tsx:60-66`.
- **A-160** No loading state of its own; it appears once the page's ghost clears, and the members list may still be arriving (it is passed as an empty list until then, which shows A-159). `page.tsx:407`.

### (6) Motion

- **A-161** Row hover uses a colour transition and blocks an opacity transition, both at the default 150ms. The view itself appears with no animation. `src/components/projects/workload-view.tsx:72`, `:99`.

### (7) Rules and logic

- **A-162** Projects counted: every loaded project whose stage is not "Closed" — Draft included. `src/components/projects/workload-view.tsx:35-38`.
- **A-163** A project belongs to a member when the member is among its assignees; a project with no assignee list falls back to its single `assignedTo`. A shared project appears under each of its assignees. `src/components/projects/workload-view.tsx:42-46`.
- **A-164** Capacity % = round(project count ÷ 4 × 100). The 4 is a hard-coded constant, the same for every member, and the result is not capped (5 projects = 125%). `src/components/projects/workload-view.tsx:26`, `:47`.
- **A-165** Thresholds: 80 and above → red, "Near capacity"; 60–79 → yellow, "Moderate"; below 60 → green, "Has availability". `src/components/projects/workload-view.tsx:52-54`.
- **A-166** Rows are sorted busiest first. Every member is listed, including those with nothing assigned. `src/components/projects/workload-view.tsx:56-57`.
- **A-167** The members are all active studio members, passed as id + name; the page also passes a `profileId` that the member records do not carry. `page.tsx:407`; `src/types/app.ts:475-497`; `src/app/api/identity/members/route.ts:69-75`.

### (8) Data

- **A-168** No request of its own: it reuses the page's loaded projects, members and health scores. `page.tsx:405-409`.

### (9) Responsive

- **A-169** Only spacing, the name block's width and the block text size change at 640px; the layout stays one row per member on every width. `src/components/projects/workload-view.tsx:72`, `:81`, `:99`.

### (10) Problems

- **A-170** The chips and the search remain on screen but do nothing here: the view is always handed the full unfiltered list. `page.tsx:405-409`.
- **A-171** Projects with no assignee appear nowhere in this view, so the rows do not add up to the studio's project count and unassigned work is invisible. `src/components/projects/workload-view.tsx:42-46`.
- **A-172** **[inferred]** Because capacity moves in steps of 25, the labels misread: 3 of 4 (75%) is only "Moderate", and "Near capacity" first appears at 4 of 4 (100%) and stays for anyone over capacity. `src/components/projects/workload-view.tsx:47-54`.
- **A-173** Every active member is listed — owners, admins and accounts staff as well as designers — each measured against the same capacity of 4. `page.tsx:407`; `src/components/projects/workload-view.tsx:41`.
- **A-174** Leftovers and gaps: a filter that always passes (`|| true`); a `profileId` match that can never hit; the "At Risk" red block depends on the health score that cannot fall below 50 on this page (A-125); no legend explains the colours, which only encode position. `src/components/projects/workload-view.tsx:44`, `:56`, `:92`, `:100`.

---

## S3 — Archived projects

### (1) What it is / entry points

- **A-175** Pressing the "Archived" chip replaces the list (or the workload view) with one card of archived projects. It is offered to every role, with no URL of its own. `page.tsx:376`, `:413-463`.
- **A-176** Archived projects are fetched by a separate request when the page mounts — so the chip can show its count — and are **not** passed through the Designer filter: a Designer sees every archived project in the studio. `page.tsx:124`; `src/lib/queries/projects.ts:33-52`; `src/app/api/projects/records/route.ts:79-83`.
- **A-177** As far as this slice saw, a project becomes archived only from the project page's delete dialog, which offers "Archive instead?" when the project has financial activity: "Archiving hides it from the active projects list — you can unarchive it later." `src/components/projects/confirm-delete-project-dialog.tsx:83-115`; `src/app/(main)/projects/[projectId]/page.tsx:4773`.

### (2) Layout

- **A-178** One card: a header row (12px × 16px padding, bottom border) and a divided list of rows, each 12px × 16px with a flexible text block and a button at the right. `page.tsx:414-421`, `:432-434`.

### (3) UI elements

- **A-179** Header: a 14px `Archive` icon, "Archived projects" in 14px medium, and the count at the far right in 12px grey. `page.tsx:415-421`.
- **A-180** Row: the project **name** as a text button (14px medium, primary on hover) over a 12px grey line "{client or —} · archived {date}", the date in the browser's own locale format. `page.tsx:436-447`.
- **A-181** Row action: an outline button, size `sm`, 12px text, labelled "Unarchive". `page.tsx:449-457`.

### (4) Interactions

- **A-182** Clicking the name opens the project page. `page.tsx:437`.
- **A-183** "Unarchive" posts to `/api/projects/{id}/unarchive` with no confirmation and no toast; on success the active and archived lists are refetched and the project returns to the main list in its former stage. `page.tsx:453`; `src/lib/queries/projects.ts:1045-1059`.
- **A-184** While one unarchive is in flight every row's "Unarchive" button is disabled. `page.tsx:454`.

### (5) States

- **A-185** Loading: two 48px ghost bars. Empty: "No archived projects." centred in 14px grey. `page.tsx:422-430`.
- **A-186** There is no error or permission state: a refused or failed unarchive leaves the row as it was with no message. `page.tsx:453`; `src/lib/queries/projects.ts:1047-1053`.

### (6) Motion

- **A-187** None: the card has no entrance animation and the name only changes colour on hover. `page.tsx:414`, `:438`.

### (7) Rules and logic

- **A-188** The server allows archive and unarchive only for members tagged `owner` or `admin`; others get 403 "Owner or admin role required". `src/app/api/projects/[id]/unarchive/route.ts:29-41`; `src/app/api/projects/[id]/archive/route.ts:41-53`.
- **A-189** Archiving cancels the project's open tasks and their queued reminders; unarchiving does not bring those tasks back. `src/lib/lifecycle/transitions.ts:307-333`, `:335-356`.
- **A-190** Archived projects are left out of the main list, every chip count, the header count and all KPIs; the archived list is ordered by creation date (newest first), not by when it was archived, and ignores the search, the stage chips and the table sort. `src/app/api/projects/records/route.ts:79-85`; `page.tsx:433`.

### (8) Data

- **A-191** Read: `GET /api/projects/records?includeArchived=1` returns only rows whose `archived_at` is set. Write: `projects.archived_at = null`. `src/app/api/projects/records/route.ts:66`, `:79-80`; `src/lib/lifecycle/transitions.ts:345-349`.

### (9) Responsive

- **A-192** The same single list at every width; names and the sub-line truncate. `page.tsx:435-447`.

### (10) Problems

- **A-193** Designers are shown every archived project (name, client, date) and can open them; the "Unarchive" button is drawn for them too but the server refuses it, silently. `page.tsx:124`, `:433-457`; `src/app/api/projects/[id]/unarchive/route.ts:36-41`.
- **A-194** Unarchive has no confirmation, no success message and no failure message, and one pending request locks every row. `page.tsx:449-457`.
- **A-195** In Archived mode the KPI strip, the header count and the search box stay on screen while describing or filtering something else. `page.tsx:287`, `:315`, `:392-399`.

---

## S4 — The shell around the listing

### (1) What it is / entry points, (3) UI elements, (4) Interactions

- **A-196** Sidebar item: label "Projects", a 16px `FolderOpen` icon, fourth after Dashboard, Leads and Chats. It reads as active on `/projects` and on every project page beneath it. `src/components/layout/app-sidebar.tsx:196-204`, `:277`.
- **A-197** Sidebar active state: a primary-tinted fill, primary text and a 6px primary dot at the row's right end (the dot collapses with the sidebar). `src/components/layout/app-sidebar.tsx:55-69`, `:295`.
- **A-198** Sidebar badge: a red 16px pill on the icon's top-right corner, 9px bold white, showing how many visible projects have status "Planning", "Hacking" or "In Progress", capped at "99+". It is hidden whenever the item is active, so it is never visible while on Projects. `src/components/layout/app-sidebar.tsx:115`, `:290-292`.
- **A-199** With the sidebar collapsed (60px, automatic below 1280px), hovering the item shows a small flyout with its label. `src/components/layout/app-sidebar.tsx:97-110`, `:240-244`, `:253`; `src/app/(main)/layout.tsx:68-72`.
- **A-200** Phone bottom bar: "Projects" is the fourth of four items before "More", with a 20px `FolderKanban` icon (a different icon from the sidebar's) and no badge. Active = primary text on a primary-tinted pill with a 16px underline. `src/components/layout/bottom-nav.tsx:87-92`, `:209-223`.
- **A-201** Topbar search has no per-page placeholder: it shows "Search" followed by a word that changes every 3 seconds with a 300ms fade — "leads...", "projects...", "tasks...", "invoices..." — plus a "/" key hint from 1024px. On phones it opens as a full-width bar with the placeholder "Search...". `src/components/layout/topbar.tsx:51`, `:136-145`, `:205-218`, `:240`.
- **A-202** Global search over projects: after a 150ms pause it matches name, client, phone, address, project type and designer name, shows at most 5 under a "Projects (n)" heading (name-prefix matches first), each with the project name, "client · stage" and the status as a small tag, and opens the project. ↑ ↓ Enter Esc work; no hits reads "No results for “{query}”". It searches only the loaded, non-archived, role-filtered list. `src/components/layout/topbar.tsx:93-102`; `src/lib/search.ts:14`, `:44-61`; `src/components/layout/search-results.tsx:42-60`, `:68-75`, `:91-95`.
- **A-203** Keyboard help lists "G then P — Go to Projects" and "C — Create new (context-aware)". `src/lib/keyboard-shortcuts.ts:14`, `:19`.
- **A-204** First-visit coach mark: 1.2 seconds after arriving, a 280px card points at the page header — title "Projects by stage", body "Projects flow through Design, Execution and Closed stages. Create one from a signed lead.", a "Got it" button and "Ask mAIson anytime". It scales in over 0.3s, dismisses itself after 10 seconds, and is remembered in `localStorage` under `om-coach-coachmarks`. `src/components/ui/page-coach-marks.tsx:41-46`, `:203-217`, `:241-259`, `:268-296`; `src/app/globals.css:1659-1665`; `page.tsx:285`.
- **A-205** Dashboard Projects widget (a way in): shows the total and an Active / Completed bar using its own status lists, and opens `/projects`. `src/components/dashboard/home-widgets.tsx:203-217`.

### (10) Problems

- **A-206** The coach mark's copy names stages that no longer exist ("Design, Execution"), and its anchor attribute `projects-filters` sits on the header, not on the filters. `src/components/ui/page-coach-marks.tsx:44`; `page.tsx:285`.
- **A-207** **[inferred]** The coach mark looks for its target once, at 1.2 seconds; if the page is still on its ghost then (the header is not mounted), the tip is skipped for that visit. `src/components/ui/page-coach-marks.tsx:241-259`; `page.tsx:246-276`.
- **A-208** The bottom bar computes an active-projects count and never shows it; the sidebar's badge can only be seen from other pages. `src/components/layout/bottom-nav.tsx:73`, `:91`; `src/components/layout/app-sidebar.tsx:290`.
- **A-209** Unreachable leftovers that point at Projects: the Quick Actions menu ("New Project", "Create Quote" and "Upload File" all just open `/projects`) is never opened by anything; the legacy `sidebar.tsx` is imported nowhere; `/projects/new` ("Start New Project", with a hard-coded 50,000 budget, "Dec 2024" due date and "Initial Deposit" milestone) has no inbound link. `src/components/layout/quick-action-menu.tsx:20-22`; `src/app/(main)/layout.tsx:55`, `:219`; `src/components/layout/sidebar.tsx:9-16`; `src/app/(main)/projects/new/page.tsx:27-46`.

---

## S5 — Components named in the brief that the listing does not use

- **A-210** `project-card.tsx` (a thumbnail card: name, client, status badge, "{n}% completed", "Due {date}", "View Details") is imported nowhere in the app. `src/components/projects/project-card.tsx:26-66`; the only `ProjectCard` imports are the homeowner portal's own component (`src/app/my/page.tsx:8`, `src/app/my/[studioSlug]/page.tsx:5`).
- **A-211** `project-card-updated.tsx` (a card with a play-button thumbnail, an "On Track" / "Delayed" tag, progress, "Due {date}", "$Xk / Yk" budget and a "Timeline Risk: {next milestone}" strip) is also imported nowhere. `src/components/projects/project-card-updated.tsx:8-70`.
- **A-212** `draft-setup-card.tsx` ("Set up this project", "{done} of {total} complete", the five checks, "Complete setup") is used only on the project page. `src/components/projects/draft-setup-card.tsx:25-112`; `src/app/(main)/projects/[projectId]/page.tsx:1994`.
- **A-213** `setup-progress.tsx` exports `getSetupChecks` (used by the project page and the wizard) and `SetupProgressIndicator` — a compact "3/5" with five dots and a "Missing:" tooltip, built for a list row — which is rendered nowhere. `src/components/projects/setup-progress.tsx:61-98`; `src/app/(main)/projects/[projectId]/page.tsx:51`; `src/components/projects/draft-setup-wizard.tsx:14`.
- **A-214** `src/lib/project-progress.ts` (milestone progress: payment-weighted, half credit for in-progress, equal-weight fallback) is not imported by the listing; it feeds the project page and the homeowner route. `src/lib/project-progress.ts:28-57`; `src/app/(main)/projects/[projectId]/page.tsx:154`; `src/app/api/homeowner/projects/[id]/route.ts:4`.
- **A-215** `src/lib/lifecycle-aggregates.ts` (pipeline / committed / realised strips, three margins, category breakdown) belongs to Finance and is not used by the listing; the listing's "Total Pipeline" is unrelated to that file's "pipeline" (draft invoices and POs). `src/lib/lifecycle-aggregates.ts:1-12`, `:45-102`; `page.tsx:155`.

---

## S6 — Where the docs and the code disagree

- **A-216** `docs/rules/projects.md` describes stage groups "Design (blue: Planning, In Progress), Execution (amber: Construction, Installation, Renovation), Closed (gray: Completed, Cancelled)" and chips "All/Design/Execution/Closed". The code has Draft, Active, Closed and an Archived chip. `docs/rules/projects.md:14`, `:16`; `page.tsx:31-68`, `:350-390`.
- **A-217** The rules doc lists "Stage summary cards: Click-to-filter cards showing count per stage". The code has four KPI tiles that are not clickable and are not per stage. `docs/rules/projects.md:15`; `page.tsx:315-341`.
- **A-218** The rules doc says "Collapsible stage sections … each stage group". With "All" the code draws one combined section, and one section per chosen stage — never several at once. `docs/rules/projects.md:17`; `page.tsx:225-244`.
- **A-219** The rules doc says New Project "Opens `ProjectCreateDialog`" and documents `project-create-dialog.tsx`. That file does not exist; the page opens `ProjectCreateDrawer`. `docs/rules/projects.md:18`, `:47`, `:106`; `page.tsx:23`, `:670-680`.
- **A-220** The rules doc calls the page "List-only view" and never mentions the KPI strip, the workload view, the Archived list, sorting or role-based visibility. `docs/rules/projects.md:11-18`; `page.tsx:127`, `:315`, `:404`, `:413`.
- **A-221** The PRD promises list "row enrichment (milestone dueness, progress count, health dot), designer avatars, hover-reveal menus". Only designer avatars exist; a row has no milestone info, no health dot and no menu. `docs/prd/09-projects.md:50`; `page.tsx:520-597`.
- **A-222** The PRD lists "Resource-capacity planning / staffing optimization" as a non-goal, while the page ships a capacity view. `docs/prd/09-projects.md:60`; `src/components/projects/workload-view.tsx:26`, `:47-54`.
- **A-223** The PRD's goal "A scannable project list with at-a-glance health" is met only by two owner-only tiles; no row shows health. `docs/prd/09-projects.md:56`; `page.tsx:329-339`.

---

## Uncertain / not verified

- The app was not run. Everything visual (overflow in the Status column A-130, the chip fade A-142, the replayed entrances A-73, the skipped coach mark A-207) is reasoned from classes and code, hence **[inferred]**.
- A-125's 60–90 range assumes no project still carries rows in the legacy `projects.progress_updates` JSON column. I confirmed that no current code writes it, not what production data holds; old rows would push Momentum to 0 and widen the range to roughly 48–78.
- Whether production data holds project statuses outside the enum's six values, or legacy stages, was not checked; the page handles them (A-82, A-84).
- I did not read the database's row-level-security policies. A-137 rests on the route code and on the scoped token carrying only a studio id.
- The project page was read only where the listing depends on it (status options, auto-promote, the delete / archive dialog, the progress call). Whether it stops a Designer from opening a project they are not assigned to was not established — a quick search found no such check; this belongs to the detail reader.
- `ProjectCreateDrawer` (1,582 lines) was not read beyond its props, role flags and toasts; creation is another reader's slice. A-138 covers only the page and the create route.
- The health shown on the project page may differ from the list's (it has invoices and payments to hand); I did not read that call site.
- `isPageEnabled("projects")` (A-05) comes from a platform config I did not trace.
- The screenshot's numbers ("Active Projects 32", "Active 21", "Closed 2", "Avg. Health 74", "At Risk 0") agree with A-121, A-122 and A-125, but I did not reproduce them against data.
- "Total Pipeline" compact formatting was read from `Intl.NumberFormat` options; exact output for edge values (for example 999,950) was not executed.
