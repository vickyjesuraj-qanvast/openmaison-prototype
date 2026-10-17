# K — 1.0 Projects: the UI system and motion

Reader K of twelve, 2026-10-05. Source: OpenMaison 1.0 at `/Users/vicky/Documents/GitHub/qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192`, read only (never run). Every path below is relative to that repo.

**Read in full:** `src/app/globals.css` (2,692 lines), `src/app/layout.tsx`, `src/app/(main)/layout.tsx`, `src/components/layout/{app-sidebar,topbar,bottom-nav,maison-fab,shortcuts-help-modal,sidebar}.tsx`, `src/lib/keyboard-shortcuts.ts`, `src/lib/hooks/{use-keyboard-shortcuts,use-scroll-direction,use-shortcut-create}.ts`, `src/hooks/use-media-query.ts`, `src/context/{theme,skin}-context.tsx`, `src/components/force-light-theme.tsx`, `docs/DESIGN_DNA.md` (555 lines), `docs/rules/design-system.md` (160), `components.json`, `package.json`, the primitives in `src/components/ui/**` (51 files; 31 read line by line, the rest by their class strings), `src/app/(main)/projects/page.tsx` (714 lines, in full), `src/components/leads/drawer-sections/{drawer-shell,drawer-section}.tsx`, `src/components/finance/action-drawer.tsx`, `src/components/projects/project-fabs.tsx`, and the header, loading, tab and bulk-bar parts of `src/app/(main)/projects/[projectId]/page.tsx`.

**Sampled by scripted grep — "the Projects set":** 134 `.tsx` files, 47,935 lines: `src/app/(main)/projects/**` (4 pages), `src/components/projects/**` without its 13 AI-Visualizer files (`visualizer*`, `relight-controls`, `style-transfer-controls`, `auto-furnish-controls`, `render-annotator-studio`, `custom-material-upload-dialog`, `material-catalog-picker`, `shared-render-feedback`, `control-shell`), `src/components/finance/**`, `src/components/tasks/**`. Counts are occurrences of a class or tag in those files; a tag count parses the whole opening tag, a class count is a text match. Features are other readers' work — this file only says what the surfaces are built from and how they move.

## Bottom line

- **The kit.** 1.0 is shadcn/ui ("new-york") on Radix, Tailwind v4, `tw-animate-css`, lucide icons and sonner toasts. There is no design-system package: every token is a CSS variable in one stylesheet, and a lot of what Projects shows is composed inline, not from primitives.
- **The shell.** A full-width top bar (≈60px), a 220px sidebar that collapses to 60px, no max-width container (16 / 24 / 32px gutters), a white sticky page header that bleeds to the edges, a purple AI tab docked to the right edge, and below 1024px a bottom nav with a More sheet.
- **Type is Inter only.** Outfit is loaded but never applied; `font-heading` resolves to Inter. Only weights 400 / 500 / 700 are loaded, so every `font-semibold` title very likely renders bold **[inferred]**.
- **Radii are bigger than they read.** The tokens redefine Tailwind's scale; a `rounded-xl` / `rounded-2xl` card is ≈20px, not 12 / 16 **[inferred]**. Buttons are 4px.
- **Projects' motion is small and mostly entrance.** A 0.4s fade-up with a 40ms row stagger on the listing, a 0.25s fade-rise when one of the detail's five tabs changes, a 300ms sliding tab underline, Radix dialogs (fade + zoom, 200ms) and sheets (slide, 500ms in / 300ms out). Almost everything else is a 150–200ms colour transition.
- **Most of the catalogue never reaches Projects.** `globals.css` defines 58 keyframes; Projects uses ten of them (plus the page background's). No number pop, no list-item stagger, no bar fill, no stroke draw, no donut, no shimmer. The progress ring and every bar are static.
- **`framer-motion` is installed and unused by the app.** All 11 importers are marketing pages.
- **Loading has four looks.** Lilac `Skeleton` blocks, grey hand-rolled pulse bars, the morphing-shape loader, and 56 spinners. No route has a `loading.tsx`.
- **Feedback.** Sonner, top-right, 4 seconds, close button. The Projects set fires 362 toasts; one has an action, none has Undo. Destructive actions are confirmed five different ways, including six browser `confirm()` boxes.
- **Reduced motion** is one global rule that shortens every animation and transition; no component handles it itself.
- **Colour discipline is good, size discipline is not.** ≈5,200 token classes against 40 hex literals — but 11 arbitrary font sizes (698 class strings at 11px or below), 30 hand-rolled pill recipes, 16 dialog-width recipes, 21 dialog-title recipes, 16 local date helpers and 8 money shapes.
- **Primitives are bypassed often.** 271 raw `<button>` beside 340 `<Button>`; 21 raw tables and no `<Table>`; 128 raw labels beside 78 `<Label>`; two hand-rolled drawers with no focus trap; 27 native date inputs because there is no date picker.

---

## 1. The shell

| # | Fact | Where |
|---|---|---|
| K-01 | The app frame is a column: `h-screen overflow-hidden bg-background font-sans`. The top bar spans the full width; under it sit the sidebar and the main area side by side. | `src/app/(main)/layout.tsx:164-185` |
| K-02 | While the session loads, the whole screen is the morphing-shape loader (36px) centred on `surface-bg`; nothing else renders. | `src/app/(main)/layout.tsx:149-155` |
| K-03 | The sidebar exists from 1024px up (`hidden lg:flex`). | `src/app/(main)/layout.tsx:180-182` |
| K-04 | Sidebar width: 220px open, 60px collapsed. Width animates 0.3s `cubic-bezier(0.4, 0, 0.2, 1)`. | `src/components/layout/app-sidebar.tsx:251-255` |
| K-05 | It collapses by itself below 1280px and opens at 1280px and up, until the person presses the toggle; after that their choice holds for the session (not stored). | `src/app/(main)/layout.tsx:56-82` |
| K-06 | Sidebar surface `.sidebar-frosted`: solid white, a right rule at `rgba(230,230,230,.5)`, shadow `1px 0 3px rgba(0,0,0,.04)`. No blur, despite the name. | `src/app/globals.css:1603-1607` |
| K-07 | Top-level items, in order: Dashboard · Leads · Chats · Projects · Tasks · Escalations · Marketplace, filtered by role and by the platform's page switches. | `src/components/layout/app-sidebar.tsx:196-204, 275` |
| K-08 | An item is a button `px-3 py-3 rounded-xl`: 16px lucide icon, 10px gap, `text-sm font-medium` label. ≈44px tall **[inferred]**. Items sit 2px apart; the nav pads `px-2 py-3`. | `src/components/layout/app-sidebar.tsx:55-62, 272, 288-295` |
| K-09 | Active item: a `bg-primary-variant` pill with `text-primary-default`, plus a 6px `bg-primary-default` dot at the right end. At rest `text-on-surface-secondary`; hover `bg-primary-variant/40` + primary text; press `active:scale-[0.97]`. | `src/components/layout/app-sidebar.tsx:57-69` |
| K-10 | Active is "starts with", so `/projects/[id]` keeps Projects lit; the active button carries `aria-current="page"`. | `src/components/layout/app-sidebar.tsx:277, 282` |
| K-11 | Badge: a red pill on the icon's top-right corner, `min-w-4 h-4`, 9px bold white on `tertiary-red`, capped "99+". It hides while its own item is active. | `src/components/layout/app-sidebar.tsx:290-292` |
| K-12 | Projects' badge counts projects whose status is Planning, Hacking or In Progress. | `src/components/layout/app-sidebar.tsx:115, 200` |
| K-13 | Three collapsible groups follow, each under a 1px rule: **FINANCE** (CircleDollarSign), **TOOLS** (Wrench), **QANVAST OPS** (CalendarDays). Header: `text-xs font-semibold uppercase tracking-wider`, a 12px chevron; `text-on-surface-disabled` at rest, `text-primary-default` when a child route is open. | `src/components/layout/app-sidebar.tsx:304-330, 381-409, 454-481` |
| K-14 | Only one group is open at a time. A group opens by itself when one of its routes is active, and scrolls into view 230ms later. | `src/components/layout/app-sidebar.tsx:160-187, 309-311` |
| K-15 | A group opens and closes by animating `grid-template-rows` 0fr ↔ 1fr with opacity, 200ms ease-in-out. | `src/components/layout/app-sidebar.tsx:344-348` |
| K-16 | Sub-items use the same pill, indented `pl-8`. Finance: Operations · Pipeline · Commissions · Reports · Vendors. Tools: 9 entries. Qanvast Ops: 7 entries, only for Qanvast-listed studios. | `src/components/layout/app-sidebar.tsx:19-47, 355-368, 452` |
| K-17 | Collapsed: labels fade and shrink (`opacity`, `max-width`, 300ms), the dot shrinks to nothing, group headers become icon buttons with a faint ⋮, and hovering opens a flyout through a portal at `left: 80px` (`rounded-xl shadow-xl`, min 176px, `animate-in fade-in slide-in-from-left-2 duration-150`, closes 120ms after the pointer leaves). | `src/components/layout/app-sidebar.tsx:51-52, 97-110, 207-247, 331-337` |
| K-18 | The nav hides its scrollbar; when more sits below the fold, the last 24px fade out through a mask. | `src/components/layout/app-sidebar.tsx:142-150, 268-274` |
| K-19 | Top bar: `<header class="topbar-glass">` — solid white, bottom rule, shadow `0 1px 3px rgba(0,0,0,.04)`, `py-2.5`, z-30. Fixed below 1024px, sticky above. | `src/components/layout/topbar.tsx:164`; `src/app/globals.css:1557-1561` |
| K-20 | Height ≈60px **[inferred]**: the tallest child is the profile button (28px avatar + 2×6px) inside 2×10px of padding, plus the rule. The rest of the code assumes 56px (`pt-14`, "h-14 = 3.5rem"). | `src/components/layout/topbar.tsx:164, 457-465`; `src/app/(main)/layout.tsx:186`; `src/app/(main)/projects/[projectId]/page.tsx:271` |
| K-21 | Left block (desktop): a fixed 220px holding the sidebar toggle (16px Menu icon, `p-2.5 rounded-xl`, labelled "Expand / Collapse sidebar") and the logo, 24px tall, which goes to `/dashboard`. On a phone only the logo, 20px tall. | `src/components/layout/topbar.tsx:166-189` |
| K-22 | Search box: up to 448px wide, 36px tall, `rounded-xl`, `bg-surface-bg` with a `surface-variant` border, 14px search icon; focus = primary border + a 1px ring at 20%. Hidden below 640px. | `src/components/layout/topbar.tsx:194-203` |
| K-23 | The placeholder is **not per page**. It is the word "Search" followed by a rotating word — "leads…", "projects…", "tasks…", "invoices…" — swapped every 3s with a 300ms opacity fade. | `src/components/layout/topbar.tsx:51, 135-145, 205-215` |
| K-24 | The "/" hint is a 10px `<kbd>` chip at the field's right end, from 1024px up. | `src/components/layout/topbar.tsx:216-218` |
| K-25 | Search runs in the browser: 150ms debounce, then `searchAll` over the leads, projects, tasks, escalations and chats already in memory. Results drop under the field (`rounded-xl shadow-lg`, up to `min(420px, 60vh)`) and close on a press outside or a route change. | `src/components/layout/topbar.tsx:93-133, 220-226`; `src/components/layout/search-results.tsx:70-81` |
| K-26 | Bell: an icon button; unread shows a red count pill (min 16px, 10px text, capped "9+", 2px white ring). | `src/components/layout/topbar.tsx:272-282` |
| K-27 | The "Open" toggle shows only for members listed as a designer: a Switch scaled to 85% (green when on) with an 11px "Open" / "Closed" label and a tooltip about AI lead recommendation. On a phone it is a UserCheck icon with a status dot. | `src/components/layout/topbar.tsx:85-90, 285-336` |
| K-28 | App grid: a LayoutGrid icon opens a 280px popover of three-column tiles (44px tinted circle + 11px label) under Tools, Finance and Qanvast Ops. | `src/components/layout/topbar.tsx:339-449` |
| K-29 | Profile: the studio's logo (24px, `rounded-lg`, or its initial on primary) beside a 28px avatar; the popover (256px) holds name, studio, a "Pro" badge, Accounts Setup (owners), Settings and Sign out in red. | `src/components/layout/topbar.tsx:455-531` |
| K-30 | `<main>` is the only scroller (`overflow-y-auto overflow-x-hidden`) and carries the `.bg-mesh-subtle` background. | `src/app/(main)/layout.tsx:186` |
| K-31 | There is no page container and no max width. Each page pads itself: the listing `px-4 sm:px-6 md:px-8 pb-6 md:pb-8 space-y-6`, the detail `px-4 sm:px-6 md:px-8 pb-6 space-y-6`. | `src/app/(main)/projects/page.tsx:283`; `src/app/(main)/projects/[projectId]/page.tsx:1628` |
| K-32 | Listing header (`PrimaryPageHeader`): a white bar that bleeds to the edges (`-mx-4 sm:-mx-6 md:-mx-8`), `py-3.5`, bottom rule, `sticky top-0 z-20`; a soft shadow fades in over 200ms once the page has scrolled. Title `text-heading-h3` (20 / 24, bold). | `src/components/ui/primary-page-header.tsx:72-88`; `src/app/(main)/projects/page.tsx:284-312` |
| K-33 | Detail header (`SecondaryPageHeader`): the same bar with a 32px back arrow, the crumb "Projects /" (1024px up only), the title, a subtitle, actions, and the tab row sitting on the bar's bottom rule. | `src/components/ui/secondary-page-header.tsx:98-212`; `src/app/(main)/projects/[projectId]/page.tsx:1630-1885` |
| K-34 | The `(main)` layout renders no breadcrumb strip — only the admin layout does — though both headers still switch a "hide layout breadcrumb" flag. | `src/app/(main)/layout.tsx:161-226`; `src/components/ui/primary-page-header.tsx:37-42`; `src/app/admin/layout.tsx:319` |
| K-35 | The AI button is no longer a round floating button. It is a tab docked to the right edge at mid-height: 56px tall, 36px wide (44px on hover or focus), `rounded-l-2xl`, a gradient from `primary-default` to `#7B2FF2`, an 18px Sparkles icon, a purple glow to its left, z-60. The layout's comment still says "draggable to 4 corners". | `src/components/layout/maison-fab.tsx:17-58`; `src/app/(main)/layout.tsx:213` |
| K-36 | The AI tab hides when a hand-rolled drawer opens (event `maison-fab-visibility`) and on a phone inside a detail page. | `src/components/layout/maison-fab.tsx:24-33`; `src/components/leads/drawer-sections/drawer-shell.tsx:67-70` |
| K-37 | The AI panel slides in from the right, up to 420px wide, 300ms. | `src/components/layout/id-buddy-panel.tsx:899-905` |
| K-38 | Notifications are a hand-rolled right drawer (up to 384px), scrim `bg-black/20 backdrop-blur-sm`, slide-in 300ms. It has no exit animation: it unmounts. | `src/components/layout/notification-drawer.tsx:174-177`; `src/app/(main)/layout.tsx:218` |
| K-39 | Below 1024px the top bar slides away when the page scrolls down more than 8px and returns on scroll up (300ms ease-in-out); `<main>`'s top padding animates with it. | `src/lib/hooks/use-scroll-direction.ts:17-44`; `src/components/layout/topbar.tsx:164`; `src/app/(main)/layout.tsx:186` |
| K-40 | Bottom nav (below 1024px): fixed, `bg-surface-default/95 backdrop-blur-sm`, top rule, safe-area padding. Home · Leads · Chats · Projects + More. An item is a 20px icon over an 11px label; active is primary text on a `primary-variant` pill with a 16×2px bar under it. It hides with the top bar. | `src/components/layout/bottom-nav.tsx:87-92, 198-245` |
| K-41 | In the bottom nav Projects has no badge and a different icon (FolderKanban; the sidebar uses FolderOpen). | `src/components/layout/bottom-nav.tsx:91`; `src/components/layout/app-sidebar.tsx:200` |
| K-42 | More is a hand-rolled bottom sheet: `rounded-t-3xl`, a decorative drag handle, scrim `bg-black/20 backdrop-blur-sm` fading in 200ms, the sheet sliding up 300ms, three-column tiles under Pages (Tasks, Escalations, Marketplace), Tools, Finance, Qanvast Ops. It locks body scroll. | `src/components/layout/bottom-nav.tsx:28-32, 79-85, 163-195` |
| K-43 | "Focus mode": mounting `SecondaryPageHeader` removes the top bar and the bottom nav below 1024px, so a project's own header owns the phone screen. | `src/components/ui/secondary-page-header.tsx:64-67`; `src/app/(main)/layout.tsx:204-208`; `src/components/layout/topbar.tsx:164` |
| K-44 | Other global layers: an offline / syncing banner fixed at the very top, a welcome modal, page coach marks, the shortcuts help modal, and one error boundary per route. | `src/app/(main)/layout.tsx:166, 198, 220-222`; `src/components/ui/offline-indicator.tsx:13-63` |
| K-45 | `src/components/layout/sidebar.tsx` (a 256px "Qanvast AI" sidebar) has no importers. | `src/components/layout/sidebar.tsx:18-57` |

---

## 2. Tokens

### 2.1 Stack

| # | Fact | Where |
|---|---|---|
| K-46 | Tailwind v4 through CSS: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, the typography plugin. No `tailwind.config`; the theme is an `@theme { }` block. shadcn style "new-york", base colour neutral, icon library lucide. | `src/app/globals.css:1-10`; `components.json:3-13`; `postcss.config.mjs` |
| K-47 | Dark is class-based (`.dark *`). One extra variant, `hover-none`, for `(hover: none)`. | `src/app/globals.css:7-8` |

### 2.2 Colour (light / dark)

| # | Token | Light | Dark | Where |
|---|---|---|---|---|
| K-48 | `primary-default` · `-variant` · `-hover` · `-variant-hover` | `#5500FF` · `#EEE5FF` · `#4400CC` · `#DDCCFF` | `#A080FF` · `#271A53` · `#A78BFF` · `#241766` | `src/app/globals.css:55-58, 499-502` |
| K-49 | `on-primary-default` · `-variant` | `#FFFFFF` · `#4400CC` | `#08021C` · `#A78BFF` | `:67-68, 509-510` |
| K-50 | `surface-default` · `-variant` · `-bg` | `#FFFFFF` · `#E6E6E6` · `#F2F2F2` | `#262626` · `#3D3D3D` · `#191919` | `:71-73, 513-515` |
| K-51 | `surface-container-low` · `-high` | both `#FFFFFF` | `#202020` · `#303030` | `:75-76, 516-517` |
| K-52 | `on-surface-default` · `-secondary` · `-disabled` · `-border` | `#1A1A1A` · `#666666` · `#999999` · `#E6E6E6` | `#E0E0E0` · `#B3B3B3` · `#666666` · `#5A5A5A` | `:79-82, 520-523` |
| K-53 | `tertiary-red` · `-variant1` · `-variant2` · `on-…-variant` | `#DB382A` · `#F8D7D4` · `#FBEBEA` · `#AF2D22` | `#FF4A3D` · `#521F1F` · `#3B1A1A` · `#FF9B91` | `:85-89, 526-530` |
| K-54 | `tertiary-green` (same four) | `#469E59` · `#DAECDE` · `#EDF5EE` · `#387E47` | `#6AD57A` · `#2B4430` · `#1F3322` · `#A3F3B3` | `:92-96, 533-537` |
| K-55 | `tertiary-blue` (same four) | `#4E5BB4` · `#DCDEF0` · `#EDEEF7` · `#3E4690` | `#7B8BFF` · `#2A3147` · `#1C2130` · `#AAB6FF` | `:99-103, 540-544` |
| K-56 | `tertiary-yellow` (same four) | `#F19E2B` · `#FCECD5` · `#FEF5EA` · `#C17E22` | `#FFC44D` · `#4A3C1F` · `#362C15` · `#FFD98F` | `:106-110, 547-551` |
| K-57 | `inverse-surface` · `on-inverse-surface` · `on-inverse-surface-primary` | `#333333` · `#F3F3F4` · `#CCB2FF` | `#B0B0B0` · `#191919` · `#2F1F8F` | `:113-116, 554-557` |
| K-58 | `overlay-20p / 40p / 60p`; `hover-04p / 08p / 12p / 16p` | black at 20 / 40 / 60%; black at 4 / 8 / 12 / 16% | overlays unchanged; hovers become white at the same strengths | `:119-127, 560-563` |

| # | Fact | Where |
|---|---|---|
| K-59 | The shadcn aliases point at the same palette: `--background #F2F2F2`, `--foreground #1A1A1A`, `--card #fff`, `--primary #5500FF`, `--secondary` and `--accent` `#EEE5FF`, `--muted #E6E6E6`, `--muted-foreground #666666`, `--destructive #DB382A`, `--border` and `--input` `#E6E6E6`, `--ring #5500FF`. So `bg-accent` — what `Skeleton` and a focused menu row use — is lilac. | `src/app/globals.css:195-229` |
| K-60 | Chart colours: `#5500FF`, `#F19E2B`, `#DB382A`, `#469E59`, `#7744FF`. | `src/app/globals.css:232-240` |
| K-61 | Older palettes are still in the theme: teal 50–900, amber, four "q-" warm neutrals, an onboarding teal set. | `src/app/globals.css:129-157` |
| K-62 | Five avatar gradients (`avatar-gradient-primary / group / escalation / neutral / owner`) are fixed hex pairs with no dark version. Projects' row avatars use four of them, picked by a hash of the name. | `src/app/globals.css:1026-1045`; `src/app/(main)/projects/page.tsx:74-84` |

### 2.3 Radius, spacing, shadow

| # | Fact | Where |
|---|---|---|
| K-63 | `--radius` is 0.75rem. `@theme` derives `sm / md / lg / xl / 2xl / 3xl / 4xl` as radius −4 / −2 / 0 / +4 / +8 / +12 / +16px. A later `:root` block then sets `--radius-xs 4px`, `-sm 8px`, `-md 12px`, `-lg 16px`, `-xl 20px`, `-full 9999px`. | `src/app/globals.css:46-52, 161, 176-182` |
| K-64 | **[inferred]** What renders: `rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 16 · `rounded-xl` 20 · `rounded-2xl` 20 · `rounded-3xl` 24 · bare `rounded` 4 · `rounded-xs` 4. The plain `:root` rule is outside Tailwind's theme layer, so it wins. Comments such as "12px rounded-xl" and the DESIGN_DNA radius table describe Tailwind's defaults, not this. | `src/app/globals.css:161-182`; `docs/DESIGN_DNA.md:165-177` |
| K-65 | A 4px spacing scale (`--space-1 … --space-16`, 4 → 64px) is declared; nothing in `src` references it. Spacing in practice is Tailwind's own scale. | `src/app/globals.css:164-174` |
| K-66 | There are no shadow tokens. Surfaces use Tailwind's `shadow-sm / md / lg / xl` or one of the bespoke classes: `.card-inner-glow` (inset 1px top highlight + two soft shadows), `.app-glass`, `.app-glass-accent`, `.app-glass-static`, `.app-table-card`, `.card-hover`, `.card-hover-lift`. | `src/app/globals.css:1426-1489, 1534-1541, 1571-1600` |
| K-67 | None of the "glass" classes is glass in light mode: all are solid white with a border and layered shadows. Only `.empty-state-glass` (8px blur) and the dark `.glass-card` (24px blur) blur anything. | `src/app/globals.css:1442-1489, 1625-1631, 1959-1965` |
| K-68 | Table helpers: `.app-table-card` (lighter border, two-layer shadow, both `!important`), `.app-table-header` (white, bottom rule), `.app-table-row` (zebra: white / `rgba(243,243,244,.5)`). | `src/app/globals.css:1534-1554` |
| K-69 | Focus helpers: `.focus-ring` (a 2px surface gap then a 2px primary halo on `:focus-visible`), `.focus-ring-inset`, `.focus-ring-dark`. | `src/app/globals.css:1768-1789` |
| K-70 | Base layer: every element gets `border-border` and `outline-ring/50`; buttons, links, tabs and menu items get a pointer cursor, disabled ones `not-allowed`. | `src/app/globals.css:993-1009` |
| K-71 | The page background `.bg-mesh-subtle` is `surface-bg` under three faint radial tints (purple 3%, green 2%, amber 1.5%), with a 30s `meshDrift` animation attached. | `src/app/globals.css:1638-1644, 2111-2120` |
| K-72 | Every native `<select>` without `appearance-none` gets a chevron drawn as a background image. | `src/app/globals.css:1755-1765` |

### 2.4 Type

| # | Fact | Where |
|---|---|---|
| K-73 | Loaded through `next/font/google`, `display: swap`: Outfit (400 / 500 / 700), Inter (400 / 500 / 700), Noto Serif and IBM Plex Mono (marketing). | `src/app/layout.tsx:12-46` |
| K-74 | Applied: `--font-sans`, `--font-heading` and `--font-mono` all point at Inter. `--font-outfit` is never referenced, so the app is Inter throughout and `font-heading` changes nothing. | `src/app/globals.css:14-16`; `src/app/layout.tsx:12-18` |
| K-75 | **[inferred]** No 600 face is loaded, so `font-semibold` falls to 700. Titles written "semibold" render bold. | `src/app/layout.tsx:25` |
| K-76 | The named scale (class → size / line height / weight): `text-hero` 44/52 700 · `heading-h1` 28/36 700 · `h2` 24/32 700 · `h3` 20/24 700 · `h4` 16/24 700 · `h5` 14/20 700 · `h6` 12/16 700 · `subheading-xl / l / m / s` 20/24, 16/24, 14/20, 12/16 at 500 · `body-l / m / s` 16/24, 14/20, 12/16 at 400 · `subtitle-l / m / s / xs` 16/24, 14/20, 12/16, 10/12 at 500 · `caption-s / xs` 12/16, 10/12 at 500. | `src/app/globals.css:184-192, 1064-1093` |
| K-77 | `.tabular-nums` is redefined to switch on both tabular and lining figures. The Projects set uses it 232 times in 63 files. | `src/app/globals.css:1405-1408` |

### 2.5 Skins and dark mode

| # | Fact | Where |
|---|---|---|
| K-78 | Ten "skins" — batman, spiderman, ironman, supercar, crybaby, cny, hari-raya, ramadan, diwali, holi — are set as `data-skin` on `<html>` from `localStorage["qanvast-skin"]`, before paint. | `src/app/globals.css:258-446, 571-758`; `src/context/skin-context.tsx:16-38`; `src/app/layout.tsx:119` |
| K-79 | A skin overrides only the accent: the primary family, `--ring`, `--secondary`, `--accent`, the sidebar's accent, `--chart-1` and `-5`, and the four hover tints (which take the accent's hue). Surfaces, text and status colours stay. | `src/app/globals.css:259-275` (pattern repeats per skin) |
| K-80 | A skin also lays a tiled SVG pattern at 50% over `<main>` and over the sidebar, and puts a 40px mascot at the foot of the open sidebar. The ten `skin-*` keyframes animate only that mascot (`.skin-mascot-animate`). | `src/app/globals.css:771-868, 873-975`; `src/app/(main)/layout.tsx:186`; `src/components/layout/app-sidebar.tsx:258-260, 523-527` |
| K-81 | **Projects is affected by a skin**: every primary-coloured piece recolours (buttons, active tabs, links, the progress ring, the row's left bar on hover); `EmptyState` gains a 120px mascot watermark at 8%; `ShapeLoader` swaps the morphing shape for a pulsing mascot. | `src/components/ui/empty-state.tsx:20-22`; `src/components/ui/shape-loader.tsx:22-25` |
| K-82 | Hard-coded purples do not follow a skin: the default milestone colour `#5500FF`, the selected Gantt bar's glow `rgba(85,0,255,.1)`, the AI tab's `#7B2FF2` and glow. | `src/components/projects/gantt-chart.tsx:1271, 2843`; `src/components/layout/maison-fab.tsx:46-52` |
| K-83 | Skins are picked in Settings; seasonal ones are filtered by month and region. | `src/lib/theme-skins.ts:248-272`; `src/components/settings/theme-skin-selector.tsx` |
| K-84 | Dark mode is real and in the app: Settings › Appearance has Light and Dark, stored in `localStorage["qanvast-theme"]`, applied by an inline script before paint. (The card's copy also promises "follow your system preference"; there is no such option.) | `src/app/(main)/settings/page.tsx:562-589`; `src/context/theme-context.tsx:19-56`; `src/app/layout.tsx:119` |
| K-85 | `ForceLightTheme` removes `.dark` only on public pages (`/sign/[token]`, `/pay`, `/renders/[token]`). It never touches Projects. | `src/components/force-light-theme.tsx:10-24`; `src/app/sign/[token]/layout.tsx:17`; `src/app/pay/layout.tsx:12`; `src/app/renders/[token]/layout.tsx:17` |
| K-86 | The Projects set has no `dark:` variant at all; it leans on the tokens. What does not flip: `bg-white` fields in the create drawer, the listing's progress gradients, the avatar gradients. | `src/components/projects/project-create-drawer.tsx:1183, 1233, 1496, 1532-1533, 1553`; `src/app/(main)/projects/page.tsx:42, 54, 66` |

---

## 3. Primitives

### 3.1 `src/components/ui/**`

"In Projects" = tag count in the Projects set.

| # | Primitive | Wraps | Sizes, radii, anatomy | Built-in motion | Where | In Projects |
|---|---|---|---|---|---|---|
| K-87 | `Button` | Radix `Slot` + cva | 11 variants: `default` (primary fill), `secondary` (grey fill), `destructive`, `success`, `outline` (primary border and text), `outline-secondary` (grey border), `destructive-outline`, `ghost` (primary text), `ghost-secondary`, `link`, `toolbar`. 10 sizes: `default` 36px `px-4`, `xs` 24, `compact` 28 with 10px text, `sm` 32, `lg` 48, `icon` 36, `icon-xs` 24, `icon-compact` 28, `icon-sm` 32, `icon-lg` 40. Radius 4px. `text-sm font-heading font-medium`. Icons 16px. Focus = 3px ring at 50%. Disabled = 50%. | Colour, border, shadow, transform and opacity over 150ms; press `scale(0.98)`. | `src/components/ui/button.tsx:7-58` | 340 |
| K-88 | `Card` (+ Header, Title, Description, Action, Content, Footer) | plain `div` | `rounded-2xl border shadow-sm bg-card`, a flex column. No padding and no gap of its own. Sub-parts pad `px-6`. `CardTitle` = `leading-none font-semibold`. | None. | `src/components/ui/card.tsx:5-83` | 73 `Card`; `CardHeader` 1; `CardContent` 1; `CardTitle` 0 |
| K-89 | `Dialog` | Radix Dialog | Scrim `overlay-40p`. Content centred, `w-full max-w-[calc(100%-2rem)] sm:max-w-lg` (512px), `rounded-xl`, 1px border, `p-6`, `gap-4`, `shadow-lg`, z-50. Close = a bare 16px X at top-right 16px, 70% → 100% opacity. Title `text-lg font-semibold leading-none`. Description 14 / 20 secondary. Footer stacks reversed on a phone, right-aligned row from 640px. | Scrim fades; content fades and zooms 95% ↔ 100%, 200ms, in and out. | `src/components/ui/dialog.tsx:34-145` | 66 |
| K-90 | `AlertDialog` | Radix AlertDialog | Scrim `black/50`, z-60. Content `rounded-lg border p-6 gap-4 shadow-lg`; sizes `default` (512px) and `sm` (320px, two-column footer). Title `text-lg font-semibold`. Cancel is `outline-secondary`. No close X. | Same fade + zoom, 200ms. | `src/components/ui/alert-dialog.tsx:31-181` | 5 |
| K-91 | `ConfirmDialog` | `AlertDialog` | Props: title, description, `confirmLabel` ("Confirm"), `cancelLabel` ("Cancel"), `variant` default / destructive / success. | As above. | `src/components/ui/confirm-dialog.tsx:14-53` | 5 |
| K-92 | `Sheet` | Radix Dialog | Scrim `black/50`. Sides: right and left (`w-3/4`, up to 384px, full height), top and bottom (auto height). `bg-background` (the grey page colour, not white), `shadow-lg`, `gap-4`. Header `p-4`. Title `font-semibold`. Close X as in Dialog. | Slides from its side: 500ms in, 300ms out, ease-in-out. Scrim fades. | `src/components/ui/sheet.tsx:31-131` | 5 |
| K-93 | `Tabs` | Radix Tabs | List 36px, `rounded-lg p-[3px] bg-muted`, or a `line` variant; trigger `rounded-md text-sm font-medium`. | `transition-all` on the trigger. | `src/components/ui/tabs.tsx:28-74` | 0 |
| K-94 | `SlidingTabList` | hand-rolled (`role="tablist"`) | Two looks. **Pill**: track `bg-surface-variant p-1 rounded-xl`, a white `rounded-lg shadow-sm` thumb. **Underline**: a 2px primary bar on the bottom edge. Tab `px-4`, 14px medium, 14px icon, optional badge; active text is primary. | The thumb or bar slides: `left` and `width`, 300ms ease-in-out (off for the first paint). Label colour 200ms. When the strip overflows: hidden scrollbar, a 28px fade on whichever edge hides tabs, and a smooth scroll to the active tab. | `src/components/ui/sliding-tabs.tsx:22-180` | 3, all in the detail page |
| K-95 | `Table` (+ Header, Body, Footer, Row, Head, Cell, Caption) | plain `table` in a scroll wrapper | `th` 40px `px-2` medium; `td` `p-2`; `text-sm`; rows ruled. | Row hover `bg-muted/50` with `transition-colors`. | `src/components/ui/table.tsx:7-104` | **0** (21 raw `<table>` instead) |
| K-96 | `Badge` | `span` / `Slot` + cva | `rounded-full px-2 py-0.5 text-xs font-medium`, a transparent 1px border; variants default, secondary, destructive, outline, ghost, link. | `transition-[color,box-shadow]`. | `src/components/ui/badge.tsx:7-27` | 50 |
| K-97 | `badges.tsx`: `StatusBadge`, `TempBadge`, `SourceChip` | hand-rolled | `StatusBadge`: 11px medium, `px-2 py-0.5 rounded-full border`, about 35 status keys mapped to token trios, or a studio's own hex at 9% / 25% alpha. | None. | `src/components/ui/badges.tsx:13-161` | 2 |
| K-98 | `Tooltip` | `@radix-ui/react-tooltip` | `rounded-lg bg-inverse-surface px-2.5 py-1.5 text-xs shadow-md`, 6px offset, no arrow, 300ms delay by default. | Fade + zoom from 95% + a small slide from the trigger's side; 150ms (the library's default). | `src/components/ui/tooltip.tsx:8-45` | 13, in 5 files |
| K-99 | `Popover` | Radix Popover | 288px, `rounded-md border p-4 shadow-md`, 4px offset, z-70. | Fade + zoom + side slide, 150ms. | `src/components/ui/popover.tsx:21-38` | in 6 files |
| K-100 | `DropdownMenu` | Radix DropdownMenu | Content min 128px, `rounded-md border p-1 shadow-md`, z-70. Item `rounded-sm px-2 py-1.5 text-sm`, focus = lilac `bg-accent`; a `destructive` item variant; checkbox, radio, label, separator, shortcut, sub-menu parts. | Fade + zoom + side slide, 150ms. | `src/components/ui/dropdown-menu.tsx:35-234` | in 9 files |
| K-101 | `Select` | Radix Select | Trigger 36px (`sm` 32px), `rounded-md`, 1px `on-surface-border`, `px-3 text-sm`, chevron at 50%; focus = primary border + 3px ring at 50%; invalid = red. Content `rounded-md border shadow-md`, z-70. Item `rounded-sm py-1.5 pl-2 pr-8`, tick at the right. | Fade + zoom + side slide, 150ms. | `src/components/ui/select.tsx:28-122` | 29 |
| K-102 | `SearchableSelect` | `Popover` + `Input` | Trigger drawn like Select; a search field, a list with optional colour dots, and an "add" row. | Popover's. | `src/components/ui/searchable-select.tsx:134-215` | 6 |
| K-103 | `Input` | plain `input` | 36px, `rounded-md`, 1px `on-surface-border`, `px-3`, 16px text on a phone and 14px from 768px; focus = primary border + 3px ring at 50%; invalid = red border and ring; disabled 50%. | `transition-[color,box-shadow]`. | `src/components/ui/input.tsx:10-14` | 149 |
| K-104 | `Textarea` | plain `textarea` | Min 60px, same border and focus. | Same. | `src/components/ui/textarea.tsx:13` | 39 |
| K-105 | `CurrencyInput` | `Input type="number"` | Right-aligned tabular figures, the region's symbol inside the left edge, select-all on focus, decimal keypad. | — | `src/components/ui/currency-input.tsx:25-47` | 3 |
| K-106 | `Label` | Radix Label | `text-sm font-medium`. | — | `src/components/ui/label.tsx:15-17` | 78 (128 raw `<label>`) |
| K-107 | `Checkbox` | Radix Checkbox | 16px, `rounded-[4px]`, checked = primary fill, 14px tick. | The tick has `transition-none`; only the shadow transitions. | `src/components/ui/checkbox.tsx:16-26` | 9 (7 raw checkboxes) |
| K-108 | `Switch` | `@radix-ui/react-switch` | 36×20px track, 16px thumb; checked = primary. | Track colour and thumb slide, 150ms. | `src/components/ui/switch.tsx:13-23` | 5 |
| K-109 | `Progress` | Radix Progress | 8px track `bg-primary/20`, `rounded-full`; the bar moves by `translateX`. | `transition-[transform,background-color]`. | `src/components/ui/progress.tsx:21-30` | 3 (two of them in components nothing imports) |
| K-110 | `Skeleton` | plain `div` | `bg-accent rounded-md` — a lilac block. | `animate-pulse` (Tailwind's 2s opacity pulse). | `src/components/ui/skeleton.tsx:7` | 23, in 5 files |
| K-111 | `ShapeLoader`, `ShapeSpinner` | plain `div` | A primary-coloured square of the given size (32px default) whose outline morphs; optional pulsing 12px label. `ShapeSpinner` is a 14px inline version in the current text colour. | `animate-morph-loader`: diamond → octagon → squircle → star, 3.2s loop, with a 2s opacity pulse. | `src/components/ui/shape-loader.tsx:16-46` | `ShapeLoader` in 3 files; `ShapeSpinner` 0 |
| K-112 | `Avatar` (+ Image, Fallback, Badge, Group) | Radix Avatar | 32px default, 24px `sm`, 40px `lg`, round; fallback `bg-muted text-sm`. | — | `src/components/ui/avatar.tsx:13-95` | 7 |
| K-113 | `EmptyState` | hand-rolled | Centred, `py-16 px-6`: a 56px `rounded-2xl` tile (purple-to-grey gradient, 8px blur) holding a 22px icon (Inbox by default), a title in `text-subheading-m`, a 12px description up to 320px wide, an action. | None. | `src/components/ui/empty-state.tsx:15-31` | 17 |
| K-114 | `ErrorBoundary` | React class | A 48px red-tinted circle with a warning icon, "Something went wrong", one line, and a small "Try Again" button that just re-renders. | None. | `src/components/ui/error-boundary.tsx:34-52` | via the layout only |
| K-115 | `PrimaryPageHeader`, `SecondaryPageHeader` | hand-rolled | See K-32, K-33. | Shadow fades 200ms on scroll; on a phone the detail header drops its subtitle and actions after 56px of scroll and restores them under 12px. | `src/components/ui/primary-page-header.tsx:54-84`; `src/components/ui/secondary-page-header.tsx:80-95, 186-206` | 1 + 4 |
| K-116 | `SectionHeader` | hand-rolled | An older page title (`heading-h3`, `h2` from 768px) with a sub-line and an action slot. | `animate-fade-up` built in. | `src/components/ui/section-header.tsx:14-26` | 0 |
| K-117 | `FilterChip`, `FilterChipRow` | plain `button` | A pill: `px-3 py-1.5`, 11px medium; active = primary fill, white text, `shadow-sm`; rest = `surface-variant`; optional count bubble. The row scrolls sideways with no scrollbar. | `transition-colors` 150ms. | `src/components/ui/filter-chip.tsx:13-57` | 3, in one file |
| K-118 | `SortableHeader` | plain `th` | Label + a 13px arrow: primary when sorted, a two-way arrow at 40% on hover otherwise. | Hover `bg-hover-04p`, 150ms; the arrow fades in. | `src/components/ui/sortable-header.tsx:16-47` | listing only |
| K-119 | `InlineEditableField` | `Input` / `Select` | A 10px label over a value that shows a dashed underline and a text cursor on hover, then becomes a field. | `transition-colors`. | `src/components/ui/inline-editable-field.tsx:120-135` | — |
| K-120 | Also present: `Breadcrumb`, `EntityTag`, `FilePreview`, `DownloadPicker`, `ImageUpload`, `PhoneNumberInput`, `TagInput`, `NumericSlider`, `CompareSlider`, `PhotoComparison`, `CoachMark` / `PageCoachMarks` (scrim `animate-fade-in`, a `pulse-ring` highlight, the card `animate-scale-in`), `WelcomeModal`, `OfflineIndicator`, `SkinMascot`, `ScrollArea` (0 uses in Projects), `Separator` (1). | — | — | — | `src/components/ui/` | — |
| K-121 | **Missing**: no calendar or date picker, no command palette, no drawer primitive, no toast wrapper (sonner is imported directly), no accordion, radio group, slider or hover card. | — | — | — | `src/components/ui/` (directory listing) | Projects uses 27 native date inputs in 20 files |

### 3.2 Shared composites Projects leans on

| # | Fact | Where |
|---|---|---|
| K-122 | `src/components/shared/**` holds four questionnaire pieces for leads and homeowners. It has no empty state, page header, confirm dialog or status pill; Projects takes nothing from it. | `src/components/shared/` (directory listing) |
| K-123 | **`DrawerShell`** (in the leads folder) is the hand-rolled right drawer behind New Project and the Gantt's milestone panel. Scrim `overlay-20p backdrop-blur-sm` (no fade); panel `shadow-2xl`, full height, widths 448px (default), 672px (wide) or full; header `px-4 sm:px-6 py-3 sm:py-4` with a semibold title and a 36px close button; body `p-4 sm:p-6` on `surface-bg`; a sticky footer. Header and footer gain a shadow only while content is scrolled under them. | `src/components/leads/drawer-sections/drawer-shell.tsx:88-158` |
| K-124 | `DrawerShell` is not a Radix dialog: no `role="dialog"`, no focus trap, no scroll lock. The scrim closes it only if the host passes a handler; Escape works only while focus is inside. | `src/components/leads/drawer-sections/drawer-shell.tsx:10-16, 91-112` |
| K-125 | `DrawerSection`: a 12px uppercase semibold disabled-grey heading with a 12px icon, over a white `rounded-xl` box with a 1px border and `p-4`. | `src/components/leads/drawer-sections/drawer-section.tsx:35-62` |
| K-126 | **`ActionDrawer`** is the finance flows' shell: a right `Sheet` up to 672px, white, a header `px-5 pt-5 pb-3` with a 16px title, a 12px description and a step rail of 10px chips joined by 1px lines. Closing with unsaved edits shows an amber inline bar — "Discard this draft? Your edits haven't been saved." / Keep editing / Discard — not a second dialog. | `src/components/finance/action-drawer.tsx:65-134` |

---

## 4. Motion catalogue

### 4.1 Libraries

| # | Fact | Where |
|---|---|---|
| K-127 | `tw-animate-css` 1.4.0 supplies `animate-in` / `animate-out` with `fade-*`, `zoom-*`, `slide-*`. Default 150ms, `ease`; a `duration-*` class on the same element changes it. | `package.json:164`; `src/app/globals.css:2`; `node_modules/tw-animate-css/dist/tw-animate.css` (default read once to confirm) |
| K-128 | `framer-motion` ^12.34.3 is installed. Its 11 importers are all marketing (`src/components/landing/**`, `src/app/(marketing)/**`, `src/app/uae-get-started`). Nothing in the app shell or the Projects set imports it. | `package.json:101` |
| K-129 | `globals.css` defines 58 `@keyframes`: 10 skin, 3 marketing, 45 app. | `src/app/globals.css` |

### 4.2 Every keyframe and utility

"Projects" = whether the Projects set uses it.

| # | Keyframe → class | What it does | Time · easing · repeat | Delay / stagger | Line | Projects |
|---|---|---|---|---|---|---|
| K-130 | `fadeUp` → `.animate-fade-up` | Opacity 0 → 1, rises 12px | 0.4s ease-out, fill both | Inline `animationDelay` set by the caller | 1222, 1654 | **Yes** |
| K-131 | `tabFadeIn` → `.animate-tab-enter` | Opacity 0 → 1, rises 4px | 0.25s ease-out | — | 1687, 1691 | **Yes** — the only user in the whole app |
| K-132 | `highlight-flash` → `.animate-highlight-flash` | Background holds `primary-variant` for half the run, then fades to clear | 1.5s ease-out, forwards | — | 1240, 1246 | **Yes** |
| K-133 | `shake` (no class) | Slides ±4px then ±3px sideways | Set by the caller | — | 1232 | **Yes**, as `animate-[shake_0.4s_ease-in-out]` |
| K-134 | `morph-shape` + `morph-pulse` → `.animate-morph-loader` | A clip-path morphs through four 8-point shapes; opacity 1 ↔ 0.75 | 3.2s linear + 2s ease-in-out, both endless | — | 1274, 1306, 1311 | **Yes**, through `ShapeLoader` |
| K-135 | `pulseBorderLeft` → `.gantt-pulse-active` | Left border colour, primary ↔ pale primary | 2s ease-in-out, endless | — | 1883, 1888 | **Yes** |
| K-136 | `pulseDot` → `.gantt-dot-pulse` | Opacity 1 ↔ 0.5, scale 1 ↔ 1.4 | 1.5s ease-in-out, endless | — | 1893, 1898 | **Yes** |
| K-137 | `pulseAtRisk` → `.gantt-at-risk` | Border red ↔ pale red with a 3px halo | 2s ease-in-out, endless | — | 1903, 1908 | **Yes** |
| K-138 | `pulseAtRiskBar` → `.gantt-bar-at-risk` | Inset red outline, 1px ↔ 2px | 2s ease-in-out, endless | — | 1913, 1918 | **Yes** |
| K-139 | `meshDrift` → `.bg-mesh-subtle` | Shifts the page background's gradient positions | 30s ease-in-out, endless | — | 2111, 2117-2120 | On `<main>`, so under every page (see K-196) |
| K-140 | `listItemIn` → `.animate-list-item` | Opacity 0 → 1, slides in 8px from the left | 0.3s ease-out, fill both | `--delay` custom property | 1696, 1700 | No (Dashboard, one leads dialog) |
| K-141 | `numberPop` → `.animate-number-pop` | Scale 1 → 1.05 → 1 | 0.3s `cubic-bezier(0.22, 1, 0.36, 1)` | — | 1677, 1682 | No — unused anywhere |
| K-142 | `fillWidth` → `.animate-fill` | `scaleX` 0 → 1 from the left | 0.8s same curve, fill both | — | 1706, 1710 | No (admin pages) |
| K-143 | `fillHeight` → `.animate-fill-vertical` | `scaleY` 0 → 1 from the bottom | 0.6s same curve | — | 1716, 1720 | No (admin pages) |
| K-144 | `strokeDraw` → `.animate-stroke-draw` | `stroke-dashoffset` from `--stroke-length` to 0 | 1s same curve | — | 1726, 1730 | No (Dashboard sparkline) |
| K-145 | `donutSegmentIn` → `.animate-donut-segment` | Opacity 0 → 1, scale 0.6 → 1 from the centre | 0.5s same curve | — | 1735, 1739 | No — unused anywhere |
| K-146 | `skeletonShimmer` → `.skeleton-shimmer` | A light band sweeps a grey block | 1.5s ease-in-out, endless | — | 1745, 1749 | No (Dashboard) |
| K-147 | `row-added-in` → `.animate-row-added-in` | Fades in from 4px above on a green tint that then clears | 900ms ease-out, forwards | — | 1250, 1256 | No (quote rows) |
| K-148 | `scaleIn` → `.animate-scale-in` | Opacity 0 → 1, scale 0.85 → 1 | 0.3s `cubic-bezier(0.22, 1, 0.36, 1)` | — | 1659, 1663 | No (coach marks) |
| K-149 | `slideInRight` → `.animate-slide-right` | Opacity 0 → 1, 16px from the right | 0.3s same curve | — | 1668, 1672 | No — unused |
| K-150 | `slideUp` → `.animate-slide-up` | Opacity 0 → 1, rises 8px | 0.25s ease-out | — | 1411, 1416 | No — unused |
| K-151 | `fadeIn` → `.animate-fade-in` | Opacity 0 → 1 | 0.2s ease-out | — | 1341, 1346 | No |
| K-152 | `numberReveal` → `.animate-number-reveal` | Opacity, 8px rise, scale 0.95 → 1, blur 4px → 0 | 0.6s same curve | — | 2189, 2202 | No (Dashboard) |
| K-153 | `drawLine` → `.animate-draw-line` | Draws an SVG line | 1.2s same curve, forwards | — | 2246, 2251 | No (Dashboard) |
| K-154 | `shimmerSweep` → `.shimmer-sweep`, `.bar-gradient-fill::after` | A highlight crosses once near the end of each loop | 3s ease-in-out, endless | — | 1850, 1857, 2235-2241 | No |
| K-155 | `pulseRing` → `.pulse-ring` | A purple ring expands to 10px and fades | 2s ease-out, endless | — | 1872, 1878 | No (coach marks) |
| K-156 | `flame-wave` → `.animate-flame` | Rocks ±8° | 0.6s ease-in-out, endless | — | 1260, 1266 | No (leads) |
| K-157 | `arrowSwing` → `.animate-arrow-swing` | Nudges 3px right | 1.5s ease-in-out, endless | — | 1938, 1943 | No — unused |
| K-158 | Quote-drafting set: `ledger-sweep`, `ledger-write`, `coin-drop`, `drift-slow`, `quote-pulse` | Sweeps, writes, drops, drifts, pulses | 2.4s · 0.6s · 0.4s · 6s · 2s | — | 1354-1401 | No |
| K-159 | Dashboard and landing set: `gradient-shift`, `marquee`, `borderGlow`, `beamTrace`, `pulseGlow`, `badgeShimmer`, `shimmerBorder`, `name-shimmer`, `aiBadgePulse`, `float-gentle`, `chip-scroll` | Gradients, glows, marquees | 3s – 30s loops | — | 1227, 1316, 1420, 1862, 1973-2087, 2183, 2223, 2263 | No |
| K-160 | Skin set: ten `skin-*` keyframes on `.skin-mascot-animate` | Glow, swing, pulse, streak, float, twinkle, flicker | 1.5s – 8s loops | — | 873-975 | Only the sidebar's mascot |
| K-161 | Marketing set: `om-intro-failsafe`, `mk-border-rotate`, `mk-marquee` | — | — | — | 2587, 2599, 2643 | No |
| K-162 | Non-keyframe motion classes: `.card-hover`, `.card-hover-lift`, `.app-glass`, `.widget-glass` (hover: stronger shadow + rise 1px, 0.2s; `.widget-glass` 0.4s), `.link-underline` (width 0 → 100%, 0.3s) | — | — | — | 1426-1460, 1585-1594, 2091-2106, 2123-2150 | `card-hover-lift` only in a component nothing imports (K-318) |

### 4.3 Where each animation is used in Projects

| # | What | Where it plays | Detail | Where in code |
|---|---|---|---|---|
| K-163 | `animate-tab-enter` | Project detail, when one of the five tabs changes | The whole tab body sits in one wrapper keyed by the active tab, so it fades and rises 4px in 0.25s. There is no exit; the old tab just goes. | `src/app/(main)/projects/[projectId]/page.tsx:1941, 4510` |
| K-164 | — | Detail sub-tabs (Management's four, Finance's seven) | The wrapper's key is the top tab only, so a sub-tab change swaps content with no animation **[inferred]**. The underline still slides. | `src/app/(main)/projects/[projectId]/page.tsx:1941, 2609-2619, 3406-3423` |
| K-165 | Sliding underline | The detail's tab row and both sub-tab rows | `left` and `width`, 300ms ease-in-out. | `src/components/ui/sliding-tabs.tsx:96-101`; `src/app/(main)/projects/[projectId]/page.tsx:1872, 2609, 3406` |
| K-166 | `animate-fade-up`, block stagger | Listing, on load | KPI strip at 100ms, the filter bar at 180ms, the table card at 240ms. The header does not animate. | `src/app/(main)/projects/page.tsx:316, 344, 472` |
| K-167 | `animate-fade-up`, row stagger | Listing rows (desktop) and cards (phone) | Each row waits `min(index, 10) × 40ms`, so the first eleven cascade and the rest arrive together at 400ms. It replays whenever rows re-mount (filter, section collapse). | `src/app/(main)/projects/page.tsx:534-535, 616-617` |
| K-168 | `animate-fade-up`, no delay | Detail › Overview: the Project Info card and the Notes card; the Gantt's KPI strip and its empty-timeline card | Only these; the other Overview cards appear with the tab. | `src/app/(main)/projects/[projectId]/page.tsx:2035, 2457`; `src/components/projects/gantt-chart.tsx:1929, 1974` |
| K-169 | `animate-highlight-flash` | Finance › Invoices and POs, when a deep link names a row | The row (or the phone card) is scrolled to the centre smoothly, then flashes lilac for 1.5s. | `src/components/finance/InvoiceList.tsx:99, 233, 322`; `src/components/finance/POList.tsx:83, 250` |
| K-170 | `shake` | New Project drawer, on Create with errors | The button turns red, reads "Fix Errors to Save" and shakes for 0.4s; it reverts after 600ms. | `src/components/projects/project-create-drawer.tsx:664-665, 719-725` |
| K-171 | `animate-in fade-in duration-300` | A status badge re-keyed by its status, so it fades when the status changes; the Payment Schedule editor's root; the New Project page | — | `src/components/finance/POList.tsx:287`; `src/components/finance/InvoiceList.tsx:252, 336`; `src/components/finance/PaymentScheduleEditor.tsx:151, 162`; `src/app/(main)/projects/new/page.tsx:50` |
| K-172 | `animate-in fade-in duration-200` | Detail › Files & Docs body | — | `src/app/(main)/projects/[projectId]/page.tsx:4062` |
| K-173 | `animate-in fade-in slide-in-from-bottom-2 duration-200` | The floating bulk bar when tasks are selected | Enters from 8px below; leaves instantly. | `src/app/(main)/projects/[projectId]/page.tsx:4729` |
| K-174 | `animate-in slide-in-from-bottom-4 duration-300` | The parsed-quote result on the project's New Quote page | — | `src/app/(main)/projects/[projectId]/quotes/new/page.tsx:93` |
| K-175 | Morph loader | While the Gantt or the Visualizer chunk downloads (32px, in a 256px-tall box); the quotes table's busy dialog (28px); the New Quote page (48px) | — | `src/app/(main)/projects/[projectId]/page.tsx:75-81`; `src/components/finance/quotes-table.tsx:458`; `src/app/(main)/projects/[projectId]/quotes/new/page.tsx:66` |
| K-176 | Gantt pulses | An in-progress row's left border and dot; an at-risk row's border; an at-risk bar's outline | All loop for as long as the state holds. A completed bar has static diagonal stripes at 50% opacity. | `src/components/projects/gantt-chart.tsx:2602, 2604, 2634, 2844-2845, 2857` |
| K-177 | `animate-pulse` | Hand-rolled skeleton bars (13 places) and one icon beside "Checking contract reconciliation…" | See K-202. | `src/components/projects/closure-dialog.tsx:126` and K-202 |
| K-178 | `animate-spin` | 56 `Loader2` spinners in 29 files, inside buttons and inline | — | e.g. `src/app/(main)/projects/[projectId]/page.tsx:3384` |
| K-179 | Listing progress bar | Desktop row | `transition-[width] duration-500` on the fill — it animates when the value changes, not on first paint. The phone card's bar has no transition. | `src/app/(main)/projects/page.tsx:558, 639` |
| K-180 | Progress ring | Detail › Overview › Project Info | An 80px SVG ring, 6px stroke, round cap, drawn by `strokeDasharray`. No transition and no draw-in. | `src/app/(main)/projects/[projectId]/page.tsx:2104-2115` |
| K-181 | **Not used in Projects** | — | `animate-list-item`, `animate-number-pop`, `animate-fill`, `animate-fill-vertical`, `animate-stroke-draw`, `animate-donut-segment`, `skeleton-shimmer`, `animate-row-added-in`, `animate-scale-in`, `animate-number-reveal`, `animate-draw-line`. KPI numbers, bars and the ring all appear at rest. | scripted grep over the Projects set |

### 4.4 Hover and press

| # | Fact | Where |
|---|---|---|
| K-182 | The common transition is `transition-colors` (230 uses), then a bare `transition` (27), `transition-opacity` (15), `transition-transform` (8), named property lists (25). `transition-all` appears once. | scripted grep |
| K-183 | Explicit durations: 200ms (24), 150ms (20), 300ms (9), 500ms (1). Most transitions name none and take Tailwind's 150ms default **[inferred]**. No `ease-*` class is used; easing is the default curve. | scripted grep |
| K-184 | Row hover (listing, finance tables): a 10% primary-variant wash plus a 3px primary bar drawn as an inset shadow on the left edge, 200ms. Half the finance tables have the wash without the bar. | `src/app/(main)/projects/page.tsx:534`; `src/components/finance/quotes-table.tsx:232`; `src/components/finance/bills-table.tsx:162` |
| K-185 | On hover the listing row's title turns primary and a 32px arrow button fades in at the row's end. | `src/app/(main)/projects/page.tsx:545, 591` |
| K-186 | Press feedback outside `Button`: `active:scale-95` (5), `active:scale-[0.97]` (2), `active:scale-[0.98]` (1). `Button` itself always presses to 0.98. | scripted grep; `src/components/ui/button.tsx:8` |
| K-187 | Hover lift is rare: the Finance tiles rise 1px with `shadow-md`; three `hover:shadow-md`. Links mostly use `hover:underline` (38). | `src/components/finance/overview/finance-hero-tiles.tsx:61`; scripted grep |
| K-188 | A card in edit mode gets a 1px primary ring at 20% with `transition-shadow duration-200`. | `src/app/(main)/projects/[projectId]/page.tsx:2035, 2457` |
| K-189 | Reveal on hover (`opacity-0 group-hover:opacity-100`) hides at least 8 controls until the pointer is over the row — unreachable by touch or keyboard. | `src/app/(main)/projects/page.tsx:591`; `src/components/tasks/tasks-table.tsx:351` |

### 4.5 Overlays, toasts, scroll, drag, reduced motion

| # | Fact | Where |
|---|---|---|
| K-190 | Radix overlays animate both ways: Dialog and AlertDialog fade + zoom over 200ms; Sheet slides 500ms in and 300ms out; Popover, DropdownMenu, Select and Tooltip fade + zoom + slide over 150ms. | `src/components/ui/dialog.tsx:42, 64`; `src/components/ui/sheet.tsx:63`; K-98 – K-101 |
| K-191 | Hand-rolled overlays animate in only and vanish on close: `DrawerShell` (slide from right, 300ms; its scrim does not fade), the task bulk bar, the notifications drawer, the More sheet. | `src/components/leads/drawer-sections/drawer-shell.tsx:91-100`; K-38, K-42, K-173 |
| K-192 | Three overlays have no animation at all: the file lightbox (`bg-black/80`), the progress-photo viewer (`bg-black/70`) and the Gantt's full-screen mode (a fixed z-40 layer). | `src/components/projects/file-lightbox.tsx:60`; `src/components/projects/progress-updates.tsx:587`; `src/components/projects/gantt-chart.tsx:1904-1907` |
| K-193 | Toasts: one `<Toaster position="top-right" richColors closeButton duration={4000} />` in the root layout. Entrance, stacking and swipe are sonner's defaults. A rule forces `pointer-events: auto` so a toast's button works over a modal. | `src/app/layout.tsx:130`; `src/app/globals.css:2657-2660` |
| K-194 | Scroll behaviours on Projects pages: the sticky header gains a shadow; below 1024px the detail header drops its subtitle and actions once scrolled; tab strips and the listing's filter chips scroll sideways with hidden scrollbars and edge fades; deep links and the first form error scroll into view smoothly, centred. | `src/components/ui/secondary-page-header.tsx:86-95`; `src/app/(main)/projects/page.tsx:349`; `src/components/projects/project-create-drawer.tsx:672` |
| K-195 | Drag feedback: on the Gantt the bar has a grab cursor (grabbing while held), follows the pointer with its transition switched off, and text selection is off for the page; resize handles show `col-resize` / `ew-resize`; a selected bar has a 2px primary ring and a 4px glow. No ghost, no drop line, no settle animation. Dropzones tint (`border-primary-default bg-primary-variant/30`) while a file is over them — the invoice digitizer's does not. | `src/components/projects/gantt-chart.tsx:2564, 2629, 2724, 2840-2859, 2892`; `src/components/finance/bill-review-dialog.tsx:416-426`; `src/components/finance/invoice-pdf-digitizer-dialog.tsx:195` |
| K-196 | `meshDrift` moves `background-position` on a background sized 100% × 100%, where a percentage position has nothing to move. It very likely shows nothing while still running for 30s loops on every page **[inferred]**. | `src/app/globals.css:2111-2120` |
| K-197 | Reduced motion: one global rule sets every element's animation and transition to 0.01ms, one iteration, and `scroll-behavior: auto`, all `!important`. Nothing in the Projects set uses `motion-reduce:`. | `src/app/globals.css:1331-1338` |
| K-198 | Two things escape that rule **[inferred]**: scripted smooth scrolling (`scrollIntoView({ behavior: "smooth" })`, 3 places) and the 3s placeholder word swap, which is a timer. | `src/components/finance/InvoiceList.tsx:99`; `src/components/finance/POList.tsx:83`; `src/components/projects/project-create-drawer.tsx:672`; `src/components/layout/topbar.tsx:135-145` |

---

## 5. Feedback and state patterns in Projects

### 5.1 Loading

| # | Fact | Where |
|---|---|---|
| K-199 | No route under `(main)` has a `loading.tsx`; the only ones are marketing's. Every wait is drawn by the page itself after it mounts. | `src/app/(marketing)/**/loading.tsx` (17 files); none under `src/app/(main)` |
| K-200 | Listing skeleton: lilac `Skeleton` blocks standing for the header (two lines + a button), four 80px tiles, the search field and four chips, and two 192px cards. It does not match the loaded page: the real header is a white bar, the real list is one card. | `src/app/(main)/projects/page.tsx:246-276` |
| K-201 | Detail skeleton: a crumb line, a title and sub-line, two buttons, one 40px bar for the tabs, four 160px cards in two columns. | `src/app/(main)/projects/[projectId]/page.tsx:1589-1611` |
| K-202 | Section-level waits are hand-rolled pulse bars in three greys: `bg-surface-variant` 48 or 56px `rounded-2xl` bars (finance lists), `bg-surface-bg` 48px `rounded-lg` (activity feed), a 128px blank card (working-capital widget). | `src/components/finance/bills-table.tsx:81`; `src/components/finance/ExpenseList.tsx:104`; `src/components/finance/POList.tsx:135`; `src/components/projects/activity-feed.tsx:176`; `src/components/finance/working-capital-widget.tsx:40` |
| K-203 | Lazy tab bodies (Gantt, Visualizer) show the morph loader centred in a 256px box. | `src/app/(main)/projects/[projectId]/page.tsx:75-81` |
| K-204 | Buttons mid-save swap their label and often add a 12–14px spinner. The label's ellipsis is not one character: "Saving…" 12 times and "Saving..." 5 times; 15 labels use "…" and 13 use "...". | scripted grep, e.g. `src/components/projects/project-create-drawer.tsx:726`; `src/components/projects/confirm-delete-project-dialog.tsx:150` |
| K-205 | Data is cached by React Query for 5 minutes, refetched when the window regains focus, retried once. | `src/components/providers.tsx:37-43` |

### 5.2 Saves, toasts, confirms

| # | Fact | Where |
|---|---|---|
| K-206 | Optimistic writes are the exception. In the Projects set only the team card updates its list before the server answers; the project, task and finance query files have no `onMutate`. Everything else waits, then toasts. | `src/components/projects/project-team-card.tsx:90, 106`; `src/lib/queries/{projects,tasks,finance}.ts` |
| K-207 | Toasts in the Projects set: 362 calls in 54 files — 191 error, 146 success, 18 info, 7 warning. | scripted grep |
| K-208 | Success wording is a short past-tense statement, usually with no full stop ("Task created", "Invoice INV-… sent to client", `"X" added`); 13 end with one. | e.g. `src/components/finance/vendor-picker.tsx:421` |
| K-209 | Error wording has three voices: "Failed to …" (54), "Couldn't …" (19), "Please …" (6); another 43 pass the server's own message through. | scripted grep |
| K-210 | One toast has an action ("Add details →" after adding a vendor). Two carry a description. **No toast in the Projects set offers Undo.** | `src/components/finance/vendor-picker.tsx:421-432`; `src/components/projects/project-create-drawer.tsx:666-669`; `src/app/(main)/projects/[projectId]/page.tsx:1196` |
| K-211 | Destructive actions use five patterns: `ConfirmDialog` (5), a raw `AlertDialog` (5), a custom `Dialog` with a red button (delete project, cancel PO, void invoice), the browser's `confirm()` (6), and an inline "Delete this update? This cannot be undone." row. | `src/components/projects/gantt-chart.tsx:3736`; `src/app/(main)/projects/[projectId]/page.tsx:4590-4642`; `src/components/projects/confirm-delete-project-dialog.tsx:122-152`; `src/components/projects/progress-updates.tsx:427` |
| K-212 | The six native confirms: approving a closure, deleting a draft PO (twice), deleting a payment-schedule template, replacing a milestone's tasks, and one Gantt guard. | `src/app/(main)/projects/[projectId]/page.tsx:1976`; `src/components/finance/POList.tsx:111`; `src/components/finance/PODetail.tsx:203`; `src/components/finance/PaymentScheduleEditor.tsx:136`; `src/components/projects/gantt-chart.tsx:1614, 1773` |
| K-213 | Delete Project is a two-step custom dialog: "Delete project?" with a warning icon, and — when the project has financial records — "Archive instead?". The detail's ⋯ menu explains Close versus Delete in two lines each. | `src/components/projects/confirm-delete-project-dialog.tsx:83-152`; `src/app/(main)/projects/[projectId]/page.tsx:1837-1866` |
| K-214 | Unsaved work is guarded in one place only: `ActionDrawer`'s inline discard bar. Dialogs and `DrawerShell` close without asking. | `src/components/finance/action-drawer.tsx:54-60, 106-130` |

### 5.3 Validation, empty, error

| # | Fact | Where |
|---|---|---|
| K-215 | Inline validation is hand-written per form: on submit an `errors` map is set; a bad field gets `border-tertiary-red`; under it an 11px line in `on-tertiary-red-variant` with a 10px alert icon; the error clears as the person types. Required fields are marked by a "*" typed into the label. | `src/components/projects/project-create-drawer.tsx:771-783` |
| K-216 | The New Project drawer adds a red summary box above its footer ("One thing to fix" / "n things to fix" and a list that shrinks live), an error toast, a scroll to the first bad field, and the shaking red button. | `src/components/projects/project-create-drawer.tsx:660-730` |
| K-217 | Error text size is not fixed: 11px in the drawer, 10px in Record Payment, 14px in Delete Project. | `src/components/projects/project-create-drawer.tsx:780`; `src/components/finance/RecordPaymentDialog.tsx:187`; `src/components/projects/confirm-delete-project-dialog.tsx:136` |
| K-218 | Empty states: the `EmptyState` primitive 17 times, and about 35 hand-rolled ones **[inferred from 52 centred blocks less table cells, dropzones and tiles]** — a dashed `rounded-xl` box on `surface-bg`, a bare centred 12px line, a `Card p-8 text-center`, or an icon-in-a-circle stack. | `src/components/finance/InvoiceList.tsx:148`; `src/components/projects/gantt-chart.tsx:2459, 2540`; `src/components/projects/selection-board.tsx:129`; `src/app/(main)/projects/page.tsx:691-713` |
| K-219 | The listing has its own two: a 40px circle with an 18px icon, "No projects found" / "Try a different search or filter", and "No projects in {stage}" / "Projects will appear here when assigned to this stage". Neither offers a button. | `src/app/(main)/projects/page.tsx:691-713` |
| K-220 | Banners are inline strips, not a component: amber `rounded-lg` 12px strips for a handover lock and a pending signature (`role="alert"` / `role="status"`), and a red `rounded-xl p-4` block for open escalations. | `src/app/(main)/projects/[projectId]/page.tsx:1890-1938` |
| K-221 | Errors: the layout wraps each route in one `ErrorBoundary`, keyed by the path. No route has an `error.tsx`; no Projects component has its own boundary. Three finance tables show a centred "Try again" when their query fails, and two pickers offer Retry; "Project not found" is a bare centred pair of lines under the header. | `src/app/(main)/layout.tsx:198`; `src/components/finance/bills-table.tsx:88-98`; `src/components/finance/receipts-table.tsx:155-166`; `src/components/finance/project-bills-section.tsx:53-62`; `src/components/projects/quote-source-picker-dialog.tsx:267`; `src/app/(main)/projects/[projectId]/page.tsx:1613-1622` |

---

## 6. Responsive system

| # | Fact | Where |
|---|---|---|
| K-222 | Breakpoints are Tailwind's defaults. The app has two real modes: below 1024px (bottom nav, focus mode on detail pages) and 1024px up (sidebar). 1280px only decides whether the sidebar starts open. | `src/app/(main)/layout.tsx:67-77, 180-208` |
| K-223 | In the Projects set: `sm:` 215 times, `lg:` 47, `md:` 21, `max-sm:` 7; no `xl:`, no container queries. Most adaptation happens at 640px, not at the 1024px mode switch. | scripted grep |
| K-224 | Gutters: 16px, 24px from 640px, 32px from 768px. | `src/app/(main)/projects/page.tsx:283` |
| K-225 | Listing: the KPI strip is 2 columns, 4 from 640px; chips and search stack, one row from 640px; the table shows from 1024px (min width 880px, fixed columns, sideways scroll) and below that each project is a three-row card. | `src/app/(main)/projects/page.tsx:316, 344, 490-492, 602-660` |
| K-226 | Listing header on a phone: "New Project" loses its label and becomes a 32px "+" button. | `src/app/(main)/projects/page.tsx:307-309` |
| K-227 | Detail header: from 1024px three outline buttons and a ⋯; below, everything folds into one ⋯ menu and the subtitle becomes two 12px lines. | `src/app/(main)/projects/[projectId]/page.tsx:1660-1703, 1708-1868` |
| K-228 | Detail › Overview is a 12-column grid from 1024px and one column below. | `src/app/(main)/projects/[projectId]/page.tsx:2003` |
| K-229 | Management › Milestones: below 1024px the Gantt is replaced by `MobileMilestoneList` — one column of cards, two from 640px; each card is `p-4` with a 2px left border (red overdue, amber blocked, blue in progress), a status icon, name, payment-percent pill, date line and task count. | `src/app/(main)/projects/[projectId]/page.tsx:2624-2628, 2761`; `src/components/projects/mobile-milestone-list.tsx:112-160` |
| K-230 | Files & Docs: a 248px folder rail from 1024px, a scrolling chip row below; the file list is a grid table from 768px and stacked rows below. | `src/app/(main)/projects/[projectId]/page.tsx:4070, 4104, 4353-4435` |
| K-231 | Floating buttons, below 1024px only: two 48px round buttons at the bottom right — green "Log expense" and primary "Post update" — `shadow-lg`, press scale 0.95, offset `5rem + safe area` from the bottom. They open two small dialogs. | `src/components/projects/project-fabs.tsx:23-37`; `src/app/(main)/projects/[projectId]/page.tsx:4851` |
| K-232 | "Sheets instead of dialogs" is not a system rule. `Dialog` stays a centred box on a phone (16px side margins by default). Only the vendor picker swaps a popover for a bottom sheet below 1024px. The two files named "…-sheet" are dialogs. | `src/components/ui/dialog.tsx:64`; `src/components/finance/vendor-picker.tsx:107-128`; `src/components/projects/post-update-sheet.tsx:94-95`; `src/components/projects/quick-expense-sheet.tsx:105-106` |
| K-233 | Tall dialogs cap their own height in about ten different ways (`calc(100dvh-2rem)` 12 times, `85vh` 6, `90vh` 3, `80vh` 2, `90dvh`, fixed `88 / 90 / 92 / 96vh`); 36 of 66 set no cap. | scripted grep over `DialogContent` |
| K-234 | Touch targets: `Button` defaults are 36 and 32px; raw buttons carry explicit heights from 16px to 64px, most often 32px (29) and 28px (13). `h-11` (44px) appears three times in the whole set. DESIGN_DNA's own rule is 44px. | scripted grep; `docs/DESIGN_DNA.md:483` |
| K-235 | The Gantt's handles set `touch-none`, and its resize edge grows an invisible hit area on coarse pointers. | `src/components/projects/gantt-chart.tsx:2724, 2841, 2892` |

---

## 7. Keyboard and accessibility

| # | Fact | Where |
|---|---|---|
| K-236 | Global keys: `G` then `D / L / I / P / T / E / F` goes to Dashboard, Leads, Inbox, Projects, Tasks, Escalations, Finance (500ms to press the second key); `C` creates; `/` and `⌘K` / `Ctrl K` focus the search; `?` opens the list. | `src/lib/keyboard-shortcuts.ts:9-35`; `src/lib/hooks/use-keyboard-shortcuts.ts:31-85` |
| K-237 | They are off while typing in a field, while any Radix dialog's scrim is on screen, and on the floor-plan tool. `⌘K` works from inside a field. | `src/lib/hooks/use-keyboard-shortcuts.ts:28-48` |
| K-238 | On Projects: `G` `P` reaches the listing from anywhere; `C` on the listing opens New Project. The detail page listens for nothing — `C` does nothing there. | `src/app/(main)/projects/page.tsx:128`; `src/lib/hooks/use-shortcut-create.ts:9-14` |
| K-239 | The help list is a 448px dialog: three groups under 11px uppercase headings, rows with `<kbd>` chips. It shows "⌘K" on every platform. | `src/components/layout/shortcuts-help-modal.tsx:36-70`; `src/lib/keyboard-shortcuts.ts:21` |
| K-240 | Local keys: Enter / Escape on inline rename fields; Enter to add a draft task; arrows and Escape in the file lightbox; Escape leaves the Gantt's full screen (after any open popover); `⌘ / Ctrl + Enter` saves in the milestone menu and the vendor form; arrows in the PO line suggester. | `src/app/(main)/projects/[projectId]/page.tsx:581-582, 4134-4135, 4665-4666`; `src/components/projects/file-lightbox.tsx:44-46`; `src/components/projects/gantt-chart.tsx:633-642`; `src/components/projects/milestone-action-menu.tsx:502`; `src/components/finance/CreatePODialog.tsx:218-224` |
| K-241 | Focus: Radix overlays trap and restore focus; `DrawerShell`, the lightbox, the photo viewer and the More sheet do not. 27 `autoFocus` props place the caret on open. | K-124; scripted grep |
| K-242 | Focus rings come in three forms: the primitives' 3px ring at 50%, `.focus-ring`'s double halo (5 uses in the set), and `focus-visible:ring-2` written by hand. Many raw buttons have none beyond the base 50% outline colour. | `src/components/ui/button.tsx:8`; `src/app/globals.css:995, 1768-1773` |
| K-243 | `SlidingTabList` sets `role="tablist"`, `role="tab"`, `aria-selected` and a roving `tabIndex`, but handles no arrow keys and has no `tabpanel`, so the inactive tabs cannot be reached from the keyboard. | `src/components/ui/sliding-tabs.tsx:104-129` |
| K-244 | Sortable headers are clickable `<th>` elements with no button, `tabIndex` or `aria-sort`. | `src/components/ui/sortable-header.tsx:27-33` |
| K-245 | 38 non-button elements take a click (25 `div`, 4 `tr`, 3 `span`, 2 `td`, 2 `li`, 1 `img`, 1 `Card`); 5 of them also have a role, `tabIndex` or a key handler. The listing's rows are among the 33 that do not. | scripted parse; `src/app/(main)/projects/page.tsx:534-536, 615-618` |
| K-246 | ARIA in the set: `aria-label` 67, `aria-expanded` 5, `aria-pressed` 3, `aria-invalid` 2; roles: alert 6, button 2, status 1, switch 1, link 1, dialog 1; `sr-only` 6. At least nine icon-only raw buttons have neither a label nor a title. | scripted grep; e.g. `src/app/(main)/projects/[projectId]/page.tsx:4517`; `src/components/projects/selection-board.tsx:231` |
| K-247 | Hints are native `title` attributes 192 times against 13 `Tooltip`s (delays 200 or 300ms). | scripted grep; `src/app/(main)/projects/[projectId]/page.tsx:1717` |
| K-248 | Headings: 36 heading tags in 134 files (32 `h3`, 3 `h2`, 1 `h4`); most card titles are `<p>` or `<span>`. Each page has one `h1`, from its header. | scripted parse |
| K-249 | Small text: 698 class strings set 11px or less — 320 × 11px, 323 × 10px, 60 × 9px, 6 × 8px, and 10.5 / 9.5 / 11.5px six times. | scripted grep |
| K-250 | Contrast, worked from the tokens **[inferred]**: `on-surface-disabled` `#999` on white is 2.85:1 and on the page grey 2.54:1 — and it is the colour of 121 ten-pixel and 73 eleven-pixel strings, including every table heading on the listing. `on-surface-secondary` `#666` passes (5.74:1). | `src/app/(main)/projects/page.tsx:505-509`; `src/app/globals.css:79-82` |
| K-251 | More contrast risks **[inferred]**: amber pill text `#C17E22` on `#FEF5EA` is 3.1:1; green `#387E47` on `#EDF5EE` is 4.45:1; white on `tertiary-green` (the Log expense button) is 3.34:1; `text-on-surface-border` `#E6E6E6` used as text is 1.25:1 — the second line of both listing empty states. | `src/app/(main)/projects/page.tsx:698, 711`; `src/components/projects/project-fabs.tsx:26` |
| K-252 | Icons are lucide-react 0.574 only (121 of 134 files import it); no second icon set. Sizes are passed in pixels with no scale: 12 (198), 14 (191), 10 (155), 11 (104), 16 (88), 13 (77), then 18, 9, 20, 8, 22, 15 and eight more. Stroke width is the default 2. | scripted grep; `package.json:105` |
| K-253 | One place uses a glyph as an icon: "⚠" inside the workload bar's label and title. | `src/components/projects/workload-view.tsx:108-111` |

---

## 8. Consistency audit of Projects' UI

All counts are over the Projects set (134 files). A per-component sample of 36 is in 8.9.

### 8.1 Primitive or hand-rolled

| # | Piece | Primitive | Hand-rolled | Note |
|---|---|---|---|---|
| K-254 | Button | 340 `<Button>` | 271 raw `<button>` | Approve / Reject in the tasks table are raw green and red-outline buttons, though `success` and `destructive-outline` variants exist (`src/components/tasks/tasks-table.tsx:322, 328`). |
| K-255 | Table | 0 `<Table>` | 21 raw `<table>` in 20 files | — |
| K-256 | Tabs and filter chips | 3 `SlidingTabList`, 3 `FilterChip` | at least 14 raw pill buttons used as filters or toggles | `FilterChip` is used in one file (`src/components/finance/comparative-analytics.tsx:114-116`); the listing's own chips are raw (`src/app/(main)/projects/page.tsx:355-390`). |
| K-257 | Status pill | 50 `Badge`, 2 `StatusBadge` | 89 raw pill or chip elements | 19 files keep their own status → class map (e.g. `src/components/finance/POList.tsx:23`, `src/components/projects/gantt-chart.tsx:229`, `src/app/(main)/projects/page.tsx:102`). |
| K-258 | Card | 73 `<Card>` | 41+ bordered `div`s drawn as cards | The Finance overview is all `div`s (`src/components/finance/overview/finance-hero-tiles.tsx:61`). |
| K-259 | Drawer / sheet | 5 `Sheet` (one of them is `ActionDrawer`, which four finance drawers use) | 2 `DrawerShell`, 3 fixed overlays | K-123, K-126, K-192. |
| K-260 | Progress | 3 `Progress` | 19 bars with an inline `width: n%`, 1 SVG ring | `src/app/(main)/projects/page.tsx:557-558`; `src/components/projects/workload-view.tsx:104` |
| K-261 | Label, input, select | 78 `Label`, 149 `Input`, 29 `Select`, 39 `Textarea` | 128 raw `<label>`, 35 raw `<input>`, 6 native `<select>`, 4 raw `<textarea>` | — |
| K-262 | Empty state | 17 `EmptyState` | ≈35 | K-218. |
| K-263 | Tooltip | 13 | 192 `title` attributes | K-247. |
| K-264 | Skeleton | 23 `Skeleton` in 5 files | 13 `animate-pulse` blocks in 13 files | K-200 – K-202. |

### 8.2 Cards, radii, padding

| # | Fact | Examples |
|---|---|---|
| K-265 | `Card` radius: `rounded-2xl` 66 (24 restate it), `rounded-xl` 7. Hand-rolled cards: `rounded-xl` 20, `rounded-2xl` 16, `rounded-lg` 5. | `src/components/projects/closure-summary-card.tsx:42` (`xl`); `src/components/projects/selection-board.tsx:121` (`2xl`) |
| K-266 | Padding on the `Card` itself: none 36 (the padding is on an inner `div`), `p-3` 11, `p-5` 9, `p-4` 7, `p-6` 5, `p-8` 3, `p-12` 2 — six values, plus the inner ones. | `src/components/projects/gantt-chart.tsx:2307` (`p-3`); `src/components/finance/ExpenseList.tsx:102` (`p-6`) |
| K-267 | Every padding class in the set: `p-3` 92, `p-4` 53, `p-0` 39, `p-5` 23, `p-2.5` 14, `p-1` 14, `p-8` 13, `p-2` 10, `p-6` 8, `p-1.5` 8, `p-3.5` 7, `p-0.5` 4, `p-12` 2, `p-10` 2. | scripted grep |
| K-268 | 61 of 73 `Card`s restate `border-surface-variant` and 56 restate `shadow-sm`. Both are what `Card` already draws (`--border` is the same `#E6E6E6`). | `src/app/(main)/projects/page.tsx:414, 472` |
| K-269 | The KPI tile exists in four recipes: listing — `rounded-xl p-3 shadow-sm`, a tinted border, a 10px sentence-case label, an 18 / 20px bold value; Gantt — `rounded-xl p-3 card-inner-glow`, a 28px icon tile, an 11px uppercase label, an 18px value; Finance — `rounded-2xl p-4 shadow-sm`, a 10px uppercase semibold label, a 16px bold value; the financial summary card — a 10px uppercase label, a 16px bold value, no box. | `src/app/(main)/projects/page.tsx:317-319`; `src/components/projects/gantt-chart.tsx:1930-1935`; `src/components/finance/overview/finance-hero-tiles.tsx:61-63, 133`; `src/components/projects/financial-summary-card.tsx:43, 77` |
| K-270 | Radius classes across the set: `rounded-lg` 211, `rounded-full` 197, `rounded-xl` 166, `rounded-2xl` 71, `rounded-md` 69, bare `rounded` 68, `rounded-[4px]` 27, `rounded-sm` 9, `rounded-[6px]` 2. | scripted grep |
| K-271 | Shadows: `shadow-sm` 91, an inset left bar 10, `shadow-lg` 6, `shadow-md` 4, `shadow-xl` 1, `card-inner-glow` 16 (in 5 files). | scripted grep |
| K-272 | Spacing: `gap-2` 418, `gap-1` 209, `gap-1.5` 206, `gap-3` 143; `space-y-1.5` 129, `space-y-3` 77. The most common cell padding is `px-4 py-2.5` (98), then `px-3 py-2` (96), `px-4 py-3` (54). | scripted grep |

### 8.3 Type

| # | Fact | Examples |
|---|---|---|
| K-273 | Three vocabularies for size: Tailwind's (`text-xs` 449, `text-sm` 332, `text-base` 30, `text-lg` 23, `text-xl` 5 = 839), the named scale (615) and arbitrary pixels (742). | scripted grep |
| K-274 | 12px is written five ways: `text-xs` 449, `text-caption-s` 268, `text-body-s` 126, `text-subtitle-s` 32, `text-[12px]` 13. 10px two ways: `text-[10px]` 323, `text-caption-xs` 125. | scripted grep |
| K-275 | Eleven arbitrary sizes: 8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14, 15px. | `src/components/finance/overview/billing-timeline-card.tsx` (9.5, 10.5, 11.5) |
| K-276 | Card titles: the usual one is `text-sm font-semibold font-heading` (22 of 60 titled elements). The rest: `text-lg font-bold` 5, `text-heading-h4` 7, `text-xs font-semibold` 3, `text-subtitle-m`, `text-subheading-l / xl / s`, `text-body-m`, `text-[15px]` — 20 recipes in all. | `src/components/projects/selection-board.tsx:96`; `src/components/projects/gantt-chart.tsx:1913, 1979`; `src/app/(main)/projects/[projectId]/page.tsx:4211` |
| K-277 | Uppercase micro-labels: 161, in 26 recipes — 10 or 11px, medium or semibold, disabled or secondary grey. The top three: 10px semibold disabled (27), 10px unweighted disabled (20), 10px semibold secondary (20). | `src/app/(main)/projects/page.tsx:505`; `src/app/(main)/projects/[projectId]/page.tsx:2043` |

### 8.4 Buttons

| # | Fact | Examples |
|---|---|---|
| K-278 | Variants: default 123, `outline-secondary` 105, `outline` 32, `ghost` 27, `secondary` 18, `ghost-secondary` 14, `destructive` 11, `success` 7, `destructive-outline` 3. | scripted parse |
| K-279 | Sizes: `sm` 191, default 98, `compact` 44, `icon-compact` 6, `icon` 1. | scripted parse |
| K-280 | 141 of 340 override the height with a class and 116 the font size. Heights that render: 32px 140, 36px 125, 28px 60, 24px 6, 40px 3. | `src/app/(main)/projects/page.tsx:307` (`size="sm"` + `h-8`) |
| K-281 | 27 are `size="sm"` forced to `h-7` — the pattern DESIGN_DNA forbids in favour of `size="compact"`. | `src/components/finance/action-drawer.tsx:112-124`; `src/components/finance/ExpenseList.tsx:211, 214`; `docs/DESIGN_DNA.md:261` |
| K-282 | Cancel is `outline-secondary` in most footers and `outline` (purple) in others. | `src/app/(main)/projects/[projectId]/page.tsx:2077`; `src/components/projects/confirm-delete-project-dialog.tsx:106-112` |

### 8.5 Status pills

| # | Fact | Examples |
|---|---|---|
| K-283 | `Badge` text size: 10px 20, 9px 17, 11px 10, the default 12px 3. | `src/components/finance/POList.tsx:287`; `src/app/(main)/projects/page.tsx:579` |
| K-284 | Raw pills: 89 in 30 recipes. By shape: `rounded-full` 56, bare `rounded` 23, `rounded-md` 5, `rounded-lg` 5. The commonest: full / 10px / medium / bordered (14); square / 9px / bordered (8); full / 10px / semibold / bordered (8). | `src/components/projects/compliance-checklist.tsx:280`; `src/components/finance/POList.tsx:260`; `src/components/finance/overview/needs-attention-card.tsx:50` |
| K-285 | The colour formula itself holds: tinted fill + darker text + mid-tone border from one family (`bg-…-variant2 text-on-…-variant border-…-variant1`). The drift is size, weight, radius and whether there is a border. | `src/app/(main)/projects/page.tsx:102-113`; `docs/DESIGN_DNA.md:67` |

### 8.6 Dates

| # | Fact | Examples |
|---|---|---|
| K-286 | 16 local date or time helpers in 12 files; eight of them are separate functions all named `formatDate`. Nothing shared is imported for dates except `getDateLocale`. | `src/components/projects/gantt-chart.tsx:88`; `src/components/projects/mobile-milestone-list.tsx:54`; `src/components/finance/quotes-table.tsx:103`; `src/components/finance/POActivityLog.tsx:32` |
| K-287 | 31 `toLocaleDateString` calls choose the locale four ways: the browser's (13), the studio's region (9), fixed `"en-SG"` (6), fixed `"en-US"` (3). | `src/components/finance/InvoiceList.tsx:429` (browser); `src/components/projects/progress-updates.tsx:59` (region); `src/components/projects/mobile-milestone-list.tsx:56` (en-SG); `src/app/(main)/projects/[projectId]/page.tsx:232, 2149` (en-US) |
| K-288 | So one project can show a date as "5 Oct", "5 Oct 2026", "5 October 2026", "Oct 5", "Oct 5, 2026", the browser's numeric form, an ISO slice "2026-10-05", or a relative "2h ago" — eight shapes. | `src/components/projects/closure-summary-card.tsx:50`; `src/app/(main)/projects/page.tsx:445`; `src/components/projects/gantt-chart.tsx:3393`; `src/components/projects/activity-feed.tsx:43` |
| K-289 | A missing date is "--", "—" or "TBD". | `src/app/(main)/projects/[projectId]/page.tsx:2149`; `src/components/finance/verification-queue.tsx:161`; `src/components/projects/gantt-chart.tsx:3393` |

### 8.7 Currency

| # | Fact | Examples |
|---|---|---|
| K-290 | The shared formatter prints the symbol, a space when the symbol is longer than one character, and two decimals: **"S$ 157,770.00"**. (Its own doc comment shows "S$1,500.00" without the space.) | `src/lib/region-config.ts:630-661` |
| K-291 | The compact form — **"S$ 7.2M"** — is used once: the listing's Total Pipeline tile, with the full figure in a `title`. | `src/lib/region-config.ts:680-695`; `src/app/(main)/projects/page.tsx:325-327` |
| K-292 | Calls: `formatStudioCurrency` 123, `formatCurrencyFromCents` 56 (and about 70 `fmt(…)` calls through local closures, most of which wrap it), `formatCurrency` 7, `formatStudioCurrencyWhole` 6 ("S$ 4,944"), `formatSignedCurrencyFromCents` 1 ("−S$ 550.00"). | scripted grep |
| K-293 | Hand-rolled money leaves the house form: symbol glued on with no decimals ("S$157,770") in the Gantt and three milestone dialogs; glued on with two decimals in two finance dialogs; a bare number in the credit note; a bare "$" on the New Quote page. | `src/components/projects/gantt-chart.tsx:2196, 2700`; `src/components/projects/milestone-publish-wizard.tsx:201`; `src/components/projects/milestone-create-dialog.tsx:171`; `src/components/finance/MilestoneCompletionDialog.tsx:228`; `src/components/finance/invoice-editor.tsx:52`; `src/components/finance/credit-note-dialog.tsx:124`; `src/app/(main)/projects/[projectId]/quotes/new/page.tsx:133` |
| K-294 | Eight money shapes can therefore appear: "S$ 157,770.00", "S$ 157,770", "S$ 7.2M", "−S$ 550.00", "S$157,770", "S$157,770.00", "157,770", "$157,770". | K-290 – K-293 |

### 8.8 Dialogs and tables

| # | Fact | Examples |
|---|---|---|
| K-295 | 66 `DialogContent`s use 16 width recipes for 9 intended widths: 384, 448, 512, 576, 672, 768, 896px, near-full (96–98vw) and full screen. | `src/components/projects/quote-source-picker-dialog.tsx:209`; `src/components/finance/RecordGRNDialog.tsx:156`; `src/components/finance/quotes-table.tsx:359`; `src/app/(main)/projects/[projectId]/page.tsx:4515` |
| K-296 | 28 of them write the width without the `sm:` prefix (`max-w-md` 14, `max-w-xl` 4, `max-w-lg` 4, `max-w-2xl` 2, `max-w-3xl` 2, `max-w-4xl` 1, `max-w-sm` 1). The primitive's own `sm:max-w-lg` then wins from 640px, so on a desktop they all render 512px wide, and on a phone they lose the 16px side margin **[inferred]**. Three others had to force it with `!max-w-none`. | `src/components/ui/dialog.tsx:64`; `src/components/finance/variation-orders-section.tsx:317` (`max-w-4xl`); `src/components/finance/invoice-editor.tsx:80` (`max-w-3xl`) |
| K-297 | Dialog padding: the default 24px 49, `p-0` with hand-built header and footer 16, `p-8` 1. | `src/components/finance/invoice-composer-dialog.tsx:627` |
| K-298 | 68 `DialogTitle`s use 21 class recipes and five sizes: 18px 42, 16px 20, 14px 4, 15px 1, 12px 1. 49 are a flex row so an icon can lead the text. | `src/components/projects/milestone-template-picker.tsx:63` (18px); `src/components/projects/post-update-dialog.tsx:199` (16px); `src/components/finance/variation-orders-section.tsx:319` (14px); `src/app/(main)/projects/[projectId]/page.tsx:4652` (15px) |
| K-299 | Dialogs have no fixed header: no rule under the title by default, no set height, the close X floating at 16px. The 16 `p-0` dialogs each build their own ruled header. | `src/components/ui/dialog.tsx:84-92`; `src/components/finance/variation-orders-section.tsx:318-320` |
| K-300 | Table headings: 21 tables, 8 recipes. The usual one is 10px semibold uppercase secondary on white (11); the listing's is 11px semibold uppercase **disabled** grey; Invoices' is 11px secondary; seven set the style on each `th` instead of the row, one of them in 12px sentence case. | `src/components/finance/bills-table.tsx:146`; `src/app/(main)/projects/page.tsx:503-509`; `src/components/finance/InvoiceList.tsx:221`; `src/components/finance/comparative-analytics.tsx:122` |
| K-301 | Cell padding: `px-4 py-2.5` 33, `px-4 py-3` 24, `px-3 py-2` 12, `py-3 px-3` 12, `px-2 py-1.5` 10, and eight more. | scripted parse |

### 8.9 Sample of 36 components

Shell = the outer container's own classes. "px" = arbitrary font sizes and how often.

| # | Component | Shell | Title | Buttons | px sizes | Money | Date locale |
|---|---|---|---|---|---|---|---|
| K-302 | `projects/financial-summary-card` | `Card` 2xl | 14 semibold | — | 10 ×4, 11 ×6 | `fmt` → shared | — |
| K-303 | `projects/project-team-card` | `Card` 2xl | 14 semibold | — | 11 ×2, 12 ×1 | — | — |
| K-304 | `projects/closure-summary-card` | `Card` **xl** `p-5` | `subtitle-m` semibold | `sm` ×4 | — | `fmt` → shared | en-SG |
| K-305 | `projects/meeting-summary-card` | `Card` 2xl `p-5` | 14 semibold | `sm` ×1 | 10 ×4, 11 ×1 | — | browser |
| K-306 | `projects/activity-feed` | `Card` 2xl | 14 semibold | — | 9, 10 ×3, 11 | — | browser |
| K-307 | `projects/activity-summary` | `Card` 2xl `p-5` | 14 semibold | — | 9, 11 | — | browser |
| K-308 | `projects/chat-highlights` | `Card` 2xl `p-5` | 14 semibold | `sm` ×1 | 11 ×3 | — | — |
| K-309 | `projects/compliance-checklist` | `Card` 2xl `p-5` | `subheading-m` | `sm` ×1 | 10 ×15, 9 ×6, 11 ×3 | — | — |
| K-310 | `projects/progress-updates` | `Card` 2xl `p-5` | 14 semibold | `sm` ×4 | 11 ×12, 12 ×1 | — | region |
| K-311 | `projects/selection-board` | `Card` 2xl **`p-4`** | 14 semibold | `sm` ×2 | 11 ×7, 10 ×4 | shared | — |
| K-312 | `projects/key-files-rail` | `Card` 2xl `p-5` | 14 semibold | — | 11 ×1 | — | — |
| K-313 | `projects/financial-attention-block` | `div` **lg** | — | — | 11 ×4, 10 ×5 | — | — |
| K-314 | `projects/milestone-completion-status` | `div` **xl** | — | `sm` ×2 | — | — | — |
| K-315 | `projects/mobile-milestone-list` | `Card` `p-4` | — | `sm` ×4 | 11 ×1 | — | en-SG |
| K-316 | `projects/workload-view` | `Card` 2xl | — | — | 10 ×4, 9, 11 | — | — |
| K-317 | `projects/project-card` (not imported anywhere) | `Card` `shadow-md` | semibold, no size | `icon` ×1 | — | — | — |
| K-318 | `projects/project-card-updated` (not imported anywhere) | `button` xl + `card-hover-lift` | `heading-h4` | — | 11 ×1 | — | — |
| K-319 | `projects/closure-dialog` | `Dialog` `max-w-xl` | 18 | `compact`, `icon-compact` | 9 ×1 | `fmt` → shared | — |
| K-320 | `projects/milestone-create-dialog` | `Dialog` | 18 + icon | `sm` ×2 | — | hand-rolled, no space | — |
| K-321 | `projects/post-update-dialog` | `Dialog` | 16 semibold | `sm` ×8 | 10, 11 ×3 | — | browser |
| K-322 | `projects/clone-project-dialog` | `Dialog` | 18 | default | — | — | — |
| K-323 | `finance/ProjectFinanceSummary` | `div` 2xl `p-4` | `body-m` semibold | — | 11 ×3 | shared | — |
| K-324 | `finance/overview/finance-hero-tiles` | `div` 2xl `p-4` | `heading-h5` | — | 10 ×2, 11 ×7 | `fmt` prop | — |
| K-325 | `finance/overview/needs-attention-card` | `div` 2xl `p-4` | 11 uppercase | — | 11 ×4, 10 ×3 | — | — |
| K-326 | `finance/overview/billing-timeline-card` | `div` 2xl `p-4` | — | — | 9.5, 10 ×3, 10.5, 11 ×3, 11.5 | `fmt` prop | — |
| K-327 | `finance/overview/money-out-card` | `div` 2xl `p-4` | — | — | 10, 10.5, 11 ×3 | `fmt` prop | — |
| K-328 | `finance/InvoiceList` | `Card` **`p-6`** | 12 semibold | `sm` ×4 | 10 ×17, 9 ×2, 11 | shared (+ whole) | browser |
| K-329 | `finance/POList` | `Card` `p-6` | 12 semibold | `sm` ×2 | 10 ×10, 9 ×10 | shared | browser |
| K-330 | `finance/ExpenseList` | `Card` `p-6` | — | `sm` ×9 | 10 ×21 | shared | — |
| K-331 | `finance/variation-orders-section` | section | `subheading-s` semibold | `sm` ×2 | 9 ×2, 11 | signed, shared | browser numeric |
| K-332 | `finance/RecordPaymentDialog` | `Dialog` | 18 | default | 10 ×9 | shared | browser |
| K-333 | `finance/CreatePODialog` | `Dialog` `sm:max-w-2xl` | 18 | `compact` ×2, `sm` | 10 ×9, 9 ×2, 11 | shared | — |
| K-334 | `finance/action-drawer` | `Sheet` 672px `p-0` | 16 + icon | `sm` forced to 28px | 10 | — | — |
| K-335 | `tasks/tasks-table` | raw table | — | raw only | 10 ×5, 11 ×5, 8 ×2, 9 | — | — |
| K-336 | `tasks/task-detail-dialog` | `Dialog` | 18 | `sm` ×6 | 10 ×2, 11 | — | — |
| K-337 | `tasks/task-create-dialog` | `Dialog` | 18 | `sm` ×2 | 10 ×3 | — | — |

### 8.10 Colour

| # | Fact | Examples |
|---|---|---|
| K-338 | Token classes (`bg- / text- / border-` on `primary-`, `on-`, `surface-`, `tertiary-`, `inverse-`, `hover-`, `overlay-`): about 5,190. Hex literals: 40. Tailwind's own palette (`red-500`, `gray-400` …): 0. | scripted grep |
| K-339 | The 40 hex literals: two identical 8-colour milestone swatch lists (one of them `#9333EA`, which is in no token), a `#5500FF` fallback in 6 places, the listing's three progress gradients, `border-[#DDCCFF]` 4 times in the compliance checklist where a token exists, the dependency arrows' `#DB382A` and `#999`, and print CSS. | `src/components/projects/milestone-action-menu.tsx:23-30`; `src/components/projects/milestone-create-dialog.tsx:17-24`; `src/app/(main)/projects/page.tsx:42, 54, 66`; `src/components/projects/compliance-checklist.tsx:71, 280, 317-318`; `src/components/projects/gantt/dependency-arrows.tsx:105, 113` |
| K-340 | Literal white: `text-white` 64 (on filled buttons and dots — fine), `bg-white` 13, of which 6 are form fields in the create drawer that stay white in dark mode. | `src/components/projects/project-create-drawer.tsx:1183, 1233, 1496, 1532-1533, 1553` |
| K-341 | One stage has three colour jobs with no shared source: the chip's dot, the section's count pill and the row's progress gradient are three hand-kept fields per stage. | `src/app/(main)/projects/page.tsx:31-68` |

---

## Problems

| # | Problem | Evidence |
|---|---|---|
| K-342 | **The written design system does not describe the app.** DESIGN_DNA gives purple-tinted neutrals (`#2D243D`, `#736D7E`, `#F3F3F4`) where the stylesheet has pure greys; says headings are Outfit (they are Inter); describes blurred glass (the classes are solid); gives cards `rounded-xl` (the primitive is `rounded-2xl`); gives `secondary`, `outline` and `ghost` button recipes the primitive no longer has; says fade-up is 300ms and 8px (it is 0.4s and 12px); says the app is light-only (it has a Dark setting); gives gutters `px-6 lg:px-8 pt-6` (pages use `px-4 sm:px-6 md:px-8`, no top padding). | `docs/DESIGN_DNA.md:46-57, 102, 148, 170, 198-202, 268-270, 437-438, 489`; `src/app/globals.css:71-82, 14-16, 1442-1489, 1654`; `src/components/ui/button.tsx:13-33`; `src/components/ui/card.tsx:10` |
| K-343 | **Outfit ships to every visitor and is never used**; `font-heading` appears 112 times in the Projects set and does nothing. | K-73 – K-75 |
| K-344 | **Radii are not what the code says.** Two definitions of `--radius-md / lg / xl` compete, so `rounded-xl` and `rounded-2xl` are probably the same 20px and the "12px card" comments are wrong. | K-63, K-64 |
| K-345 | **Dialog widths written without `sm:` are ignored on desktop** (28 dialogs, including two meant to be 768px and one 896px). | K-296 |
| K-346 | **Dead classes that draw nothing**: `text-tertiary-red-default` and `text-tertiary-yellow-default` (4 uses — the Delete Project dialog's warning icons and error text take the default colour); `gantt-bar-blocked` (a blocked bar has no style of its own); `animate-fade-down` on the "All changes synced" banner. Defined and unused: `.gantt-today-marker`, `animate-number-pop`, `animate-donut-segment`, `animate-slide-up`, `animate-slide-right`, `chart-tooltip`, `widget-glass`. | `src/components/projects/confirm-delete-project-dialog.tsx:94, 103, 126, 136`; `src/components/projects/gantt-chart.tsx:2846`; `src/components/ui/offline-indicator.tsx:15`; `src/app/globals.css:1923` |
| K-347 | **Six browser `confirm()` boxes** sit beside styled dialogs, including the one that approves a project's closure. | K-212 |
| K-348 | **No Undo anywhere in Projects**, and optimistic updates in one component only: every change waits for the server and most deletions are final. | K-206, K-210 |
| K-349 | **Skeletons do not match what loads**, come in lilac and three greys, and no route streams a `loading.tsx`. | K-199 – K-202 |
| K-350 | **Hand-rolled overlays lack what Radix gives the others**: no focus trap, no dialog role, no exit animation, and (for the lightbox and photo viewer) no entrance either. | K-124, K-191, K-192 |
| K-351 | **Phone layout seams.** In focus mode the bottom nav is gone, yet the floating buttons and the bulk bar still sit 80px up as if it were there **[inferred]**. The top bar is ≈60px while content is offset 56px **[inferred]**. | `src/components/projects/project-fabs.tsx:23`; `src/app/(main)/projects/[projectId]/page.tsx:4729`; K-20, K-43 |
| K-352 | **The AI tab (z-60) sits above Radix dialogs (z-50)** and only hides for `DrawerShell`; over a modal it is visible but dead **[inferred]**. | `src/components/layout/maison-fab.tsx:41`; `src/components/ui/dialog.tsx:42, 64` |
| K-353 | **Keyboard reach is thin**: listing rows, sortable headings and 33 other click targets are not focusable; inactive tabs are out of the tab order with no arrow keys; hover-only controls cannot be reached at all. | K-189, K-243 – K-245 |
| K-354 | **Small grey text fails contrast** and is the default for headings and meta: `#999` at 10–11px in ≈194 class strings; one empty-state line at 1.25:1. | K-250, K-251 |
| K-355 | **The same thing is drawn many ways**: 4 KPI tiles, 30 pill recipes, 26 micro-label recipes, 20 card-title recipes, 21 dialog-title recipes, 8 table-heading recipes, 8 date shapes, 8 money shapes, two ellipsis characters, three error-text sizes, two Cancel styles. | section 8 |
| K-356 | **Two components are dead code** but still in the folder: `project-card.tsx` and `project-card-updated.tsx` (the only users of `Progress` with a custom indicator and of `card-hover-lift` in Projects). | no importer found for either |
| K-357 | **A background animation that shows nothing** runs on every page. | K-196 |
| K-358 | **Small inconsistencies in the shell**: Projects has two icons (sidebar and bottom nav); the bottom nav drops Projects' badge; the shortcut list shows "⌘K" on Windows; Settings promises a system theme that does not exist; the search placeholder suggests "invoices…" though invoices are not searched. | K-23, K-25, K-41, K-84, K-239 |

---

## Uncertain / not verified

- **Nothing here was measured in a browser.** 1.0 was not run. Every pixel figure marked **[inferred]** is worked out from classes: the top bar's height (K-20), the sidebar item's height (K-08), the effective radii (K-64), the semibold-renders-bold claim (K-75), the dialog-width override (K-296), the contrast ratios (K-250, K-251), the phone offsets (K-351), the AI tab over dialogs (K-352), the no-op background drift (K-196). Each needs one look at the running app on :3001 before the report states it as fact; K-64 and K-296 change how every card and dialog looks, so check those first.
- **Tailwind's defaults** (150ms transitions, the default easing curve, `animate-pulse`, `animate-spin`) are stated from knowledge of Tailwind v4, not read from `node_modules`. `tw-animate-css`'s 150ms default was confirmed by one read of its stylesheet.
- **Sonner's own motion** (entrance, stack, swipe) is the library's default; I did not read its source.
- **Counts are text matches.** Class counts include commented-out code and strings in comments (rare). "Hand-rolled card" and "raw pill" counts come from patterns over static `className` strings; cards and pills built with template strings or `cn()` are under-counted, so the true drift is somewhat larger.
- **The 13 AI-Visualizer files** inside `src/components/projects/` are left out of every count. They add 8 animation classes (4 pulse, 3 spin, 1 `animate-in`).
- **The detail page (5,130 lines) was not read end to end**, only its header, loading, tab wrapper, Overview's first card, sub-tab strips, bulk bar and the lines the greps pointed at. Other readers cover its surfaces.
- **Whether a skin or dark mode is on for any real studio** is a data question; the code allows both.
- **`src/components/ui/coach-mark.tsx` and `page-coach-marks.tsx`**: whether any coach mark targets a Projects element beyond `data-coach="projects-filters"` on the listing header (`src/app/(main)/projects/page.tsx:285`) was not traced.
