# Design context — OpenMaison 2.0 prototype

The design counterpart of `/CLAUDE.md`. Everything here was read from the Figma file
`JCGkMBFLjeOyXYiEkOxFMO` (page **Leads - New**) or decided with the designer; decisions that
deviate from a mock are numbered in `REGISTER.md` (REG-nnn) — this file is the map, the register
is the audit trail. Screens proven in the build are banked as screenshots in `verify/`.

## 1 · Mock index (node ids — open as `?node-id=779-19690`)

| Surface | Node | Notes |
|---|---|---|
| Leads listing · table (expanded rail) | 779:19690 | default columns, pinned Lead Name, 64px rows |
| Row hover actions | 606:75167 | Edit (primary outlined) + kebab (primary outlined icon button), 12px apart, level-1 shadow |
| Leads listing · kanban | 779:19733 | viewport-bound board, column head level-1 |
| Page header | 799:23251 | sticky, level-1 shadow, 24/16 |
| Review banner (docked) | 779:26186 · shadow 779:26211 · title 779:26227 | 50px, sticky bottom 16 |
| Review imported leads | 779:26221 · 779:26272 | now an **xxl modal** (REG-141) |
| Deleted Leads | 779:26316 | xl modal |
| Import history | 779:20147 | page |
| Import wizard (4 steps) | 779:20043 … | xl, fixed 928 tall |
| Lead routing dialog | 821:23969 · 821:24010 | s (400) standard dialog, ChoiceCards |
| Delete alert (compact dialog) | 779:24663 | s (400) |
| Export dialog (one-field s-modal) | 784:113420 | "Export Tasks" reference → Export Leads; Dialog `size="form"` |
| Tasks popover | 779:24722 | 400w, radius 4, level-3 |
| Assign member popover | 779:24696 | |
| Stage dropdown (cell) | 780:86452 · with journey meta 836:23422 | check on passed stages, "current" on the lead's stage |
| Stage filter pill dropdown | 780:93630 | live counts |
| No results (table) | 780:95559 | |
| Move stage window | 780:83579 (flow) · error state 780:91593 | l (800), rail 240 |
| Contacted panel · Auto Fill | 780:89150 · icon 780:89214 | title row = Add Log; log card = Log n · Auto Fill · chevron |
| Met panel | 780:90234 | same log-list structure, dividers |
| Attached-file tile | 781:58405 | 146w · 138×105 preview · filled pdf icon · name · delete — every attachment |
| Upload flow (Quote Sent) | empty 780:90940 · uploading 780:91263 · uploaded 780:91468 | dropzone stays above the uploaded file row; Quote amount (S$) only after an upload |
| Upload flow (Won) | 780:92744 | same states for signed quote + contract; uploaded signed quote → milestones 0% |
| Text Field states (error / active) | 836:23125 | DS Text Field / 48px |
| Text Field states (filled / disabled) | 836:23276 | |
| Modal header standard | 779:26016 | 64px, 20/24, title 20 bold, bare 24px close |
| Snackbar | 784:110041 · toast 780:82576 | 344×48, radius 4, Undo = text button #CCB2FF |
| Date picker | 789:84100 | Material desktop, 256×284; time row + Today are invented |
| Tooltip | 789:83369 | |
| Rail hover / expand tile | 795:22541 · full logo 780:75727 | |

DS library components (OpenMaison Components): Text Field set key `35b2a7b3a07d57667ff7b2cf058e210f52871462`
(Height 24/36/48/56 · State Empty/Filled/Active/Error/Disabled · Label · Helper Text · Trailing Icon).

## 2 · Tokens & scales

- Colour, type, spacing, radius and elevation come from `@openmaison/react` as `--om-*` variables (never literals — the two exceptions are logged: snackbar action `#CCB2FF`, merged-column tint fallback).
- Radii: **4** fields/buttons/menus · **8** cards/panels · **12** modals (REG-107). Elevation level-1 headers/column heads · level-3 menus/popovers · level-5 modals.
- Type roles used: heading-h3 (modal titles 20/24), h4 (panel titles), subheading-m/s (labels, buttons, links), body-m/s, caption-s (table headers, uppercase, 12/500).
- **Modal scale:** s 400 · m 600 · l 800 · xl 1200 (`--om-modal-*`); height to content, capped to the viewport; **xxl = fluid, 48px margin every side**. Fixed heights kept where the mock fixes them (Filters 600, Import wizard / Deleted 928).
- **Motion** (`lib/motion.ts`, from the designer's Figma reactions): hover 50ms ease-out; toggles 150ms standard; menus 150/100; modals 200/140; sheets 280/180; springs `settle` (380/30) and `pop` — springs take **two** keyframes max. Ambient: the rail's Upgrade gem turns once every 8s (REG-164).

## 3 · Component specs (as built, mock-faithful)

- **Text field** (`om/text-field`): 48px, 1px `on-surface/border`, radius 4; label rests inside as body-m secondary when empty, floats to the border (12/16, 12px in) on focus/value; active = 2px primary (1px border + 1px inset); error = 1px red, red label, red 12/16 message 4px below; disabled = surface-variant border, on-surface/disabled text; helper text shares the message slot; placeholder only after the label floats. Modes: text · select (PortalMenu, keyboard-operable) · trigger (pickers). `numeric="digits" | "amount"` filters keystrokes and paste to digits (amount groups thousands) — every number field uses it (REG-150). Select chevron flips while open.
- **Date / date-time fields**: read-only triggers over the Material picker; value formats `d/m/yyyy` and `12/8/2026, 3:00 PM`. Picker: month header · Today icon · ‹ › · Mon-first grid · today ring · primary disc selected; with time: 296×340, hour · minute (00–59) · AM/PM · Done.
- **Chips** (choice): 32px, radius 4, subheading-s; selected = primary-variant fill + primary border. Disabled (read-only stage) = disabled colour.
- **Menus / dropdowns**: 200w, radius 4, level-3; group titles 10/500 uppercase with a dot; items 36px; disabled items `aria-disabled` + tooltip; close on any press outside the menu (trigger excepted); Esc consumed in the capture phase by the open menu.
- **Dialogs**: compact (delete alert, radius 12, level-5) and standard (56px head with divider). Confirm dialogs = Cancel + primary/danger action.
- **Snackbar**: 344×48, radius 4, inverse surface; action = DS text button 36px, #CCB2FF; 24px close; bottom-left above the review banner (`--bottom-dock`).
- **Tooltip**: singleton layer, 150ms delay, flips top/bottom, hides on pointerdown/scroll/Esc.
- **Ghost loader**: `GhostSheet` bones with one global sweep, ≥650ms, crossfade into the page (`PageReveal`).
- **Tables**: 56px head, 64px rows; fluid columns via `flex: W 0 Wpx`; Lead Name always pinned (max 3 pinned); **frozen columns show a 1px inner border at rest and a shadow only while scrolled** (REG-144); primary 4px band on a row = new lead nobody has opened yet; lead name heading/h5 (779:24446), phone as eight unbroken digits (REG-162); hover turns the name primary.
- **Kanban**: 320px columns, snap scrolling, card name → data 4px (408:54295), card hover turns the name primary (as a table row), task-less cards show "+ Add task", card kebab flips up near the column bottom, edge pagers, ghost-clone drag with auto-scroll; blocked columns dim to 45%; a drop on an earlier column springs back.
- **Popovers** anchored to cells follow the cell on scroll and close when it leaves the viewport; pressing the open popover's / menu's own trigger toggles it closed; outside presses are `pointerdown` (capture). On Hold leads show "· On hold till: {d Mon ’yy}" after the phone (table) / as the last meta item (kanban).

## 4 · Interaction rules (product)

- Stage movement policy (Linear / Flexible), no moving backwards, owner before leaving New, resume from On Hold/Lost with a confirm — see REG-111…132.
- Move stage window: log-list stages (Contacted, Met) with per-log read-only + Edit; Add Log opens only the new log; delete on extra logs; New never editable; Won captures signed quote · signed contract · payment split (100%). Validation after first Save, inline, live-clearing (`lib/forms.ts` MSG).
- Review imported leads: source chips count what the duplicates toggle shows; queue duplicates show their twin row; merge table = single-line rows, frozen label + frozen merged result, equal data columns.
- From System lists (Quote Sent quote, Won signed quote + contract) open with the first system file selected.
- Upload flow (Quote Sent / Won): any picked or dropped file → "Uploading..." → the mock's file appears as a selected row under the dropzone; **Quote amount (S$)** is asked only in the upload flow (a system quote knows its amount) and is focused as soon as the file lands; in Won the payment split follows the signed quote's source — uploaded file → every milestone 0% (split unknown); system quote → the recorded 10/30/30/30 comes back (also on Reset to default / removing the upload).
- Return Lead only for Qanvast-sourced leads (own flow later) — in **every** lead menu: table row kebab and kanban card kebab alike. A rule on a lead applies wherever that lead has a menu.
- Reset prototype to base (Maison AI sheet) restores `fixtures/baseline.json`.

## 5 · Copy vocabulary (invented, awaiting designer sign-off)

Validation (`lib/forms.ts`): "This field is required" · "Choose a date and time" · "Enter a valid date (d/m/yyyy)" · "Enter a valid email address" · "Enter an 8-digit phone number" · "Enter an amount" · "Enter a number" · "Attach at least one file" · "Choose an option" · "Milestones must add up to 100%" · "Assign at least one member".
Stage flow: "Complete {Stage} first" · "Assign a member first" · "{Stage} is already completed — stages don't move back" · "Resume at {Stage}?" · "{Stage} details" · "Save changes" · "Other reason" · "Moved to {Stage}" + Undo.
Settings: page copy under Leads › Stage movement (`lib/settings/types.ts`). Reset: "Reset prototype to base" / "Reset the prototype?".

## 6 · Designed later (invented placeholders in the build)

Time picker row + Today · Settings page layout · Contacted "Other reason" field · log delete control · stage-move Undo snackbar · review-queue twin comparison · the "stamp card" stage flow (ideation only, not built — see the three claude.ai artifacts noted in `/CLAUDE.md`).

## 7 · Where things live

`REGISTER.md` decisions · `context/page-checklist.md` per-screen must-haves · `context/interaction-states.md` hover/active states from Figma · `context/m2`, `context/m4`, `lead-listing/` captured mock code/specs · `verify/` banked screenshots · `README.md` what the raw Figma captures contain (and don't).
