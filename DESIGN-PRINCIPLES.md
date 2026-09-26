# Vicky's Design Principles — OpenMaison 2.0

OpenMaison 2.0 is designed by **Vicky**, product designer. Every screen, word, state and motion in this prototype was decided on
purpose, checked at every screen size, and written down: the design register (`design-source/REGISTER.md`) holds close to
700 decisions (REG-1…698) and the reason for each. Studios have seen it in live demos. It is the product, not a sketch of it.

## The one rule

> **Nothing a user can see changes without Vicky.**
> Before you change layout, spacing, colour, type, copy, an icon, motion, an interaction, a flow, an empty / loading /
> error state, or add a screen — ask Vicky first. If the change is already made, don't merge it: open the pull request and
> ask for her review.

This holds even when the change looks like a fix, a cleanup or "the obvious thing". What looks like a glitch is often a
decision — the register says why. When in doubt, ask. A two-line question costs a minute; an unreviewed change can undo
weeks of work that studios have already signed off on.

### What needs Vicky

- Anything rendered: pages, components, CSS modules, the design tokens, icons, the ghost loaders.
- Anything read: labels, messages, snackbars, errors, empty states, tooltips, dates and number formats.
- Anything felt: motion, timing, focus, keyboard behaviour, what happens after a press, where a flow goes next.
- Any rule a user meets: who may do what, what gets refused and how that is said, what is undoable.
- Removing or hiding anything a user can see, including "Coming soon" affordances.

### What you own

- The data layer, migrations and the port of 1.0's data — within the rules the migration maps set out.
- Server actions' internals, integrations with 1.0 services, authentication, production infrastructure, performance,
  tests and CI.

Even there, a change can reach the screen — a new error, a slower response, a field that is now optional. If it does,
it needs Vicky. `.github/CODEOWNERS` asks for her review on every pull request, so she is always informed.

## The principles

Each principle below comes with what it means in the code and where the details live.

### 1 · The mock wins, and every exception is written down

The Figma file (`JCGkMBFLjeOyXYiEkOxFMO`, "OpenMaison 2.0") is the source of truth. Where the mock is silent, the
prototype designs the smallest thing that fits the module's own patterns and logs it in the register — as a bug fix,
an owner call, invented copy or invented UI. Nothing is invented quietly.

*In the code:* a comment beside a decision names its register entry (`REG-nnn`). *Details:* `design-source/DESIGN.md`
(the mock index with node ids), `design-source/REGISTER.md`.

### 2 · One system, no one-offs

Every colour, space, radius, type size and shadow is a design token (`--om-*`), never a literal. Radii are 4 for fields,
buttons and menus, 8 for cards and panels, 12 for dialogs. Dialogs come in four widths — 400 · 600 · 800 · 1200 — or fluid
with a 48px margin, and share one header (64px, a 20px bold title, a bare close, a divider). Every input, menu, dialog,
picker, sheet, chip group, tooltip and snackbar is a house piece from `components/om/*`, built on the design system
(`@openmaison/react`, vendored in `vendor/`). Icons come from one self-hosted subset.

*In the code:* never hand-roll an input, a menu, a dialog or a picker — reuse the house piece, or ask for a new one.
Import design-system components through `@/components/ds` only. *Details:* `design-source/DESIGN.md` §2–3,
`design-source/context/page-checklist.md`.

### 3 · Plain words for studio people

The people using OpenMaison run interior-design studios; many are not technical. Words are short, concrete and
named the way studios name things. An unfinished feature answers "Coming soon in OpenMaison 2.0". A refused action says
the rule, in the rule's own words: "Couldn't delete the template — only Dane, an Owner or an Admin can delete it".
Validation messages come from one list.

*In the code:* `lib/forms.ts` (`MSG`), `useComingSoon`, `couldnt` / `refusalOf` in `components/leads/tasks/use-run.ts`.
*Details:* `design-source/DESIGN.md` §5 (copy vocabulary).

### 4 · Nothing is lost

Every remove offers Undo. Records delete softly and come back from their Deleted sheet. Edits save themselves, and a
save survives a reload. Discarding unsaved work asks first. A studio should never lose work to a slip.

*In the code:* the snackbar's Undo action, `deleted_at` columns with Restore and Delete forever, `ConfirmDialog`.

### 5 · Say why

A choice that can't be made says why, in the row — never a silent greyed-out control or a native tooltip. An error names
what failed. A narrowed list says it is narrowed (the scope pill's dot, the Filters count). A wait says what it waits for.

*In the code:* a refused action answers `{ error: <the rule> }` and the screen shows that rule; menus carry the reason as
the row's second line.

### 6 · Back returns where you came from

Every link from a list to a record carries where it came from (`?from=`), and Back, Close and Done go back there — to the
same folder, filter and scroll.

*In the code:* `lib/nav.ts` (`withFrom`, `readFrom`), `components/om/use-here.ts`.

### 7 · Every screen is whole

Every page ships the full shell: the rail, the page header, a loading ghost that mirrors the page's own layout and
crossfades into it, tooltips on every icon-only control, the snackbar host and Maison AI.

*In the code:* a `loading.tsx` beside every route, `PageReveal`, `Tooltip`, `AppShell`. *Details:* the page checklist —
every line is ticked before a screen is called done.

### 8 · Every width is designed

Phone (≤767), tablet (768–1024) and desktop (≥1025) are each designed, not squeezed. On a phone, menus, pickers and
panels become bottom sheets, tables become cards, and toolbars stay one row. Touch targets are at least 44px under a
finger. The page never scrolls sideways — wide content scrolls inside its own box. A phone held sideways is designed
too. Desktop stays pixel-identical at 1440.

*In the code:* only two media queries: `(max-width: 767px)` and `(max-width: 1024px)`; touch rules add
`(hover: none) and (max-width: 1024px)`. *Details:* `design-source/context/responsive.md`.

### 9 · Tables follow the leads listing

Every table works like the Leads listing: sticky head, frozen first column (a 1px rule at rest, a shadow only while
scrolled sideways), sideways scroll inside the table, column settings in one shared drawer, the selection column always
visible, the whole column moving when dragged.

*In the code:* `components/om/table-columns.ts`, `components/om/column-settings.tsx`, `components/leads/table.tsx`.

### 10 · Motion with purpose

Motion explains a change and is quick: hover 50ms, toggles 150ms, menus 150/100, dialogs 200/140, sheets 280/180. Reduced
motion is respected everywhere. Every press answers at once — a state change, a spinner or a message.

*In the code:* `lib/motion.ts` tokens only, never ad-hoc durations.

### 11 · Honest data

Every state a screen shows is backed by the records that would produce it — a lead in Contacted has its contact log, a
Quote Sent lead has its quote. The demo data is curated and consistent; mock numbers are never pasted in.

*In the code:* `scripts/repair-demo-data.ts` (repair rules with their own checks), `fixtures/baseline.json`
(rebuilt with `npm run db:baseline`, never edited by hand).

### 12 · Reach for everyone

Everything works from the keyboard. Focus goes back to what opened a menu, dialog or mode. Icon-only controls have names.
Nothing depends on hover alone.

## How to propose a change

1. Open a pull request (or an issue, if you haven't built it yet) that says **what** and **why**.
2. For anything visible, add before and after screenshots at **1440** and **390**, plus **768** when the layout
   changes.
3. Mark it for design review and ask Vicky to review it. `CODEOWNERS` requests her review automatically.
4. Wait for her approval before merging. If she changes the design, she logs it in the register.
5. Found something that doesn't match the mock or the register? Flag it the same way — Vicky confirms the intended
   behaviour before anyone "fixes" it.

## Where the design lives

| What | Where |
| --- | --- |
| The Figma file | `JCGkMBFLjeOyXYiEkOxFMO` — OpenMaison 2.0 |
| Mock index, tokens, component specs, interaction rules, copy | `design-source/DESIGN.md` |
| Every decision and its reason (REG-1…698) | `design-source/REGISTER.md` |
| What every screen must ship | `design-source/context/page-checklist.md` |
| Phone, tablet and desktop rules | `design-source/context/responsive.md` |
| Each module's specs | `design-source/context/<module>/` |
| 1.0 → 2.0 audits and the developers' migration maps | `design-source/context/parity/` |
| The testers' story (UAT) | `design-source/uat/` |
| Screenshots of the checked builds | `design-source/verify/` |
