# E — 1.0 Projects: milestones and the Gantt

Reader E of twelve, read on 2026-10-05 from the 1.0 working tree `qanvast-id-tool`, branch `integ/security-non-qanvast` @ `620190192` (read-only, not run). Read in full: `src/components/projects/gantt-chart.tsx` (3,787 lines), `dependency-arrows.tsx`, `gantt/*` (cascade-preview-dialog, blocked-by-popover, gantt-zoom-controls, dependency-arrows, critical-path), every `milestone-*.tsx` (action-menu, block-dialog, completion-status, create-dialog, deps-dialog, payment-structure-dialog, publish-batch, publish-wizard, related-files, reschedule-dialog, revision-resolved-dialog, status-picker, tasks-editor, template-picker), `save-milestone-template-dialog.tsx`, `start-milestone-flow.tsx`, `mobile-milestone-list.tsx`, `homeowner-preview-dialog.tsx`, `template-picker-dialog.tsx`, `quote-source-picker-dialog.tsx`, `homeowner-response-banner.tsx`, `src/components/leads/drawer-sections/drawer-shell.tsx`, `src/lib/projects/*`, `src/lib/milestone-templates.ts`, `src/lib/milestone-payments.ts`, `src/lib/canonical-phases.ts`, `src/lib/project-progress.ts`, `src/lib/queries/projects.ts` (milestone hooks), `src/lib/queries/milestone-templates.ts`, `src/components/finance/MilestoneCompletionDialog.tsx` and `milestone-picker-dialog.tsx`, `src/components/homeowner/milestone-approval.tsx` and `progress-timeline.tsx`, the APIs `src/app/api/projects/plan/**`, `projects/[id]/notify-publish`, `projects/records/[id]` (+ `timeline`, `milestone-approvals`), `projects/[id]/progress-updates/[updateId]/unpublish`, `homeowner/projects/[id]` (milestone part) and `…/milestones/[milestoneId]/approve`, the milestone parts of `src/app/(main)/projects/[projectId]/page.tsx`, the keyframes in `src/app/globals.css`, and the docs `docs/features/project-planner/spec.md` and `docs/rules/projects.md`. `canvas-gesture-math.ts` and `use-canvas-gestures.ts` belong to the Visualizer, not the Gantt (imported only by `visualizer.tsx` and `trial-canvas.tsx`).

**Path shorthand.** All paths are relative to `qanvast-id-tool/`. `GC` = `src/components/projects/gantt-chart.tsx` · `PAGE` = `src/app/(main)/projects/[projectId]/page.tsx` · `MENU` = `src/components/projects/milestone-action-menu.tsx` · `PICK` = `src/components/projects/milestone-status-picker.tsx` · `WIZ` = `src/components/projects/milestone-publish-wizard.tsx` · `BATCH` = `src/components/projects/milestone-publish-batch.tsx` · `MOB` = `src/components/projects/mobile-milestone-list.tsx` · `DONE` = `src/components/finance/MilestoneCompletionDialog.tsx` · `CSS` = `src/app/globals.css`. Any other bare filename lives in `src/components/projects/`. **[inferred]** marks something worked out from the code rather than read as a stated behaviour; nothing here was run.

## Bottom line

- **The timeline is one JSON array saved whole.** Milestones live in `projects.timeline` (JSONB); the Gantt keeps a local copy and autosaves the entire array 1.5 s after any change. Every rule — handover lock, read-only, payment-schedule freeze, the 100% publish gate, one-active-at-a-time, cycle prevention — is enforced in the browser only; the server writes whatever array a signed-in studio member sends. Last write wins (E-308…E-316).
- **The Gantt is a plain week grid.** A resizable name list (220px, 180–400) beside a grid at a fixed 24px per day, 44px rows, 28px bars, a red Today line. There is no zoom (a Day/Week/Month/Quarter control exists but is never mounted), no weekend shading, no progress fill, no baseline, no print or export, no keyboard access, no virtualisation (E-53…E-66, E-109, E-319…E-328).
- **Bars carry the milestone's own colour, not its status.** Status reads only as: 50% opacity = completed, red gradient + pulsing ring = at risk. The "blocked" bar class has no CSS, and the completed stripes are overridden by the inline colour (E-67…E-74, E-110…E-113).
- **Drags are thin.** Move the bar or resize its right edge; it snaps to whole days on release; a "Dependency Cascade" dialog appears only when dependents must shift. No undo, no Escape, no working days, no left-edge resize, no link-by-drag (that code is dead). Clicking a dependency arrow deletes it at once with no confirm (E-82…E-90, E-115…E-118, E-331).
- **The milestone "drawer" is an action list.** Ten actions (Start · Post Update · Adjust Dependencies · View / Edit Tasks · Mark as Blocked · Reschedule · Edit Payment Structure · Mark as Complete / Finalize Completion · Ask mAIson), each opening its own dialog. Status is five states plus a `finalizedAt` stamp; only one milestone may be in progress; a status change publishes itself (E-124…E-158, E-194…E-200).
- **The homeowner sees a snapshot.** Publishing copies name, dates and status into `publishedSnapshot`. First publish is forced through a four-step wizard (the banners call it "3-step"); later publishes use a batch dialog or the drawer's Publish button. There is no unpublish for milestones — the "unpublish gate" is for progress updates. Publishing is blocked unless payment percentages total exactly 100 (E-224…E-242).
- **A timeline with no payment milestones can never be published the first time** — the wizard's first and third steps cannot be passed without them [inferred] (E-243).
- **"Visible to the homeowner" has three definitions.** The eye icon defaults to hidden for non-payment milestones, the wizard labels 0% rows "Internal", yet publishing and the homeowner API treat anything not explicitly hidden as visible. Block reasons, resume dates and payment % reach the homeowner live, without a publish (E-244, E-245).
- **Completing is two phases.** "Mark as Complete" runs a three-step dialog (confirm with an editable invoice preview → draft invoice, send or request approval → post an update); then "Finalize Completion" unlocks only when the homeowner has approved and any internal invoice approval has cleared. The homeowner can Approve or Request Revision (E-208…E-223).
- **Empty state and regeneration are fragile.** "Start from scratch" opens a dialog that is not mounted in the empty branch [inferred]; uploading a quote ignores the "Recommended" hybrid choice; "Generate timeline" replaces every milestone and its id behind a native `confirm()`, orphaning published state, tasks, approvals and invoice links (E-27, E-28, E-272, E-279).
- **Below 1024px it is a different, thinner product.** A card list with Mark Done (skips Start, skips the completion dialog, does not update the snapshot), Add and Reschedule (whose "Publish now" does nothing), reading legacy JSON tasks the desktop no longer writes (E-286…E-304).
- **Much is written but never shown, or built but unreachable.** Milestone comments (reschedule reasons, "Revision addressed" notes) have no UI on either side; the extension request, AI tips and risk warnings, Generate Tasks, zoom, lag-day dependencies and the homeowner-response deep link are dead; `docs/rules/projects.md` still describes several as live (E-329…E-342).

---

## 1. Where it lives: Management › Milestones

### 1.1 What it is / entry points

- **E-01** The project detail page's Management tab has four sub-tabs — "Milestones" (default), "Tasks", "Materials", "Floor Plan" — and the Milestones pane is the Gantt on desktop and a card list below 1024px. `PAGE:2607-2621`, `PAGE:2624-2929`.
- **E-02** The tab and sub-tab are in the URL as `?tab=management&sub=…`; the default sub-tab is omitted so `?tab=management` alone opens Milestones, and old links `?tab=timeline` or `?tab=tasks` are rewritten to Management. `PAGE:647-650`, `PAGE:881-885`, `PAGE:895-908`.
- **E-03** Other ways in: the Overview card "Upcoming Milestones" ("View timeline →", a row press, or "Set timeline →" when empty) all switch to the Management tab. `PAGE:158-241`, `PAGE:2170-2172`.
- **E-04** A homeowner's approval or revision request notifies the studio with the link `/projects/{id}?tab=management&milestone={milestoneId}`, but the page reads only `tab`, `sub`, `focus` and `review` — the `milestone` parameter opens nothing. `src/app/api/homeowner/projects/[id]/milestones/[milestoneId]/approve/route.ts:175-181`, `PAGE:647-650`, `PAGE:710`, `PAGE:1427`.
- **E-05** The Gantt is loaded with `next/dynamic` (`ssr: false`); while its bundle loads the pane shows a centred 32px `ShapeLoader` in a 256px-high box. `PAGE:75-78`.

### 1.2 Layout

- **E-06** Above the sub-tab strip, on every Management sub-tab, sits the Homeowner response banner in a `mb-3` wrapper; the strip itself is an underline tab list with a bottom border and `mb-4`. `PAGE:2596-2600`, `PAGE:2607-2621`.
- **E-07** The sub-tab strip is the shared `SlidingTabList` (`variant="underline"`): 14px medium labels, `px-4 py-2.5`, a 2px primary underline that slides, a hidden scrollbar with an edge fade when it overflows. `src/components/ui/sliding-tabs.tsx:86-122`.
- **E-08** Both renderings are always mounted: the card list in `lg:hidden`, the Gantt in `hidden lg:block`. The hidden Gantt's effects (autosave, automatic owner tasks) therefore still run on a phone [inferred]. `PAGE:2627`, `PAGE:2761`.
- **E-09** Under the Milestones pane only, when the project is `Active` and has no closure in flight, a "Wrap up this project" card closes the page: `mt-6`, rounded-xl, bordered, `p-4`, copy on the left and an outline "Close Project" button on the right (stacked on phones). `PAGE:2963-2982`.

### 1.3 UI elements

- **E-10** Wrap-up card copy, verbatim: title "Wrap up this project"; body "**Close** keeps the project in your archive — quotes, invoices, finance reports, and homeowner portal access stay intact (read-only). The project moves to the **Closed** stage. Use this after handover and final payment."; footnote "Not the same as **Delete**, which removes the project and its records permanently."; button "Close Project" (opens the closure dialog — reader of closure owns it). `PAGE:2966-2980`.
- **E-11** Homeowner response banner, revision state: red card, `AlertCircle`, "Homeowner requested a revision" / "Homeowner requested {n} revisions", "Review the milestone(s) below and respond before continuing.", up to three rows (milestone name + the homeowner's quoted comment, chevron), then "+{n} more — scroll the timeline to see all". `homeowner-response-banner.tsx:79-124`.
- **E-12** Homeowner response banner, approval state (only when no revision is open): green strip, `ThumbsUp`, "Homeowner approved a milestone" / "Homeowner approved {n} milestones — most recent: {name}", an X to dismiss; the dismissal is kept in `localStorage` per project and per latest approval time, so a newer approval shows it again. `homeowner-response-banner.tsx:59-75`, `homeowner-response-banner.tsx:127-145`.

### 1.4 States, rules, problems

- **E-13** Read-only vs locked are two different flags. `readOnly` = the project's stage is `Closed`. `isLocked` = the studio feature "lock project on handover" is on **and** (the project has `handoverLockedAt` or is Closed) **and** the user lacks the `project_override.override_lock` permission. `PAGE:2630-2631`, `PAGE:2772-2773`, `PAGE:809-813`.
- **E-14** When locked, a page-level amber alert reads "This project is handover-locked. Contact a studio admin to unlock for edits." `PAGE:1890-1895`.
- **E-15** **Problem.** The revision rows in the banner are buttons that call `onMilestoneClick`, but the page mounts the banner with `projectId` only, so pressing a row does nothing. `homeowner-response-banner.tsx:96-100`, `PAGE:2598`.
- **E-16** **Problem.** The page comment says the "Close Project" button "stays in the page footer regardless of sub-tab", but the block renders only on Milestones. `PAGE:878-880`, `PAGE:2963`.
- **E-17** **Problem.** The Overview card says "Milestone dates are managed in the Timeline tab." — there is no tab with that name; it is Management › Milestones. `PAGE:2072`.

---

## 2. Empty state: no timeline yet

### 2.1 What it is / entry points

- **E-18** When the project has no milestones the desktop pane shows a single centred card, "Set up your project timeline" / "Choose how you'd like to create milestones for this project", with five stacked choices; the KPI strip, toolbar and chart are not rendered. `GC:1963-2064`.
- **E-19** The Overview card's empty line reads "No timeline set up yet." (or "No upcoming milestones — the timeline is either empty or all complete." when milestones exist but none are open) with the link "Set timeline →". `PAGE:207-221`.
- **E-20** Below 1024px the empty state is the shared `EmptyState`: calendar icon, "No timeline yet", "Add milestones to build the project timeline.", and an "Add milestone" button (hidden when read-only or locked), with `py-16`. `MOB:87-101`.

### 2.2 Layout and UI elements

- **E-21** The card is `max-w-md` centred, `py-10 px-6`, with a 56px gradient tile holding a `CalendarClock`, the title in `text-subheading-xl`, and the choices as full-width rows (`p-3.5`, rounded-xl, a 36px icon tile, a 14px title, a caption) spaced `gap-2.5`. `GC:1974-1982`.
- **E-22** The five choices, in order, verbatim: (1) "Work phases + payment milestones" — "Category phases from your quote, plus Deposit / Progress / Final as their own milestones." — with a "Recommended" tag and a 2px primary border; (2) "Work phases from quote" — "One milestone per work category — no payment milestones."; (3) "Payment schedule only" — "Billing milestones (Deposit / Progress / Final) from your studio's schedule."; (4) "Start from a template" — "Five pre-built timelines for common property types in your region."; (5) "Start from scratch" — "Add milestones one at a time and build the timeline yourself." Icons: `Flag`, `Sparkles`, `DollarSign`, `ListTodo`, `Plus`. `GC:1987-2061`.
- **E-23** While a quote is being parsed or a plan generated, the first row's title becomes "Parsing quote..." or "Generating milestones..." and the first three rows dim to 60% / 50% and stop responding. `GC:1989`, `GC:1997`, `GC:2007`, `GC:2022`.

### 2.3 Interactions and rules

- **E-24** Choices 1 and 2 open "Generate from a quote" (the quote source picker): it offers "This project's quote" ({n} line items · total, with the quote's status badge), or — only when the project has none — "Lead's quote" with the caption "The project doesn't have its own quote yet — using the lead's as a fallback.", plus a dashed row "Upload a new quote" ("PDF, image, or spreadsheet · we'll parse and generate"). Its other states: "Checking for a linked quote…", an error "Couldn't load this lead's quote. Check your connection and try again, or upload a quote below." with "Retry", and "No quote on file for this project. Upload a PDF or image of the contractor quote — we'll parse the line items and generate milestones from them." While generating it keeps the dialog open with "Generating milestones from the project's quote…". `quote-source-picker-dialog.tsx:207-312`, `GC:2067-2084`.
- **E-25** Choice 3 generates at once from the payment schedule with the toast "Timeline generated from payment schedule"; choice 4 opens "Pick a template" (five property-type templates, the closest to the project's property type pre-selected, "Use template"); choice 5 calls the Add-milestone opener. `GC:2021`, `GC:2036`, `GC:2050`, `template-picker-dialog.tsx:45-66`.
- **E-26** The five property-type templates (Singapore set; other regions have their own five) are "HDB BTO" (8 milestones), "HDB Resale" (8), "Condo" (8), "Landed Property" (10) and "Commercial Fit-out" (8); each row shows "{n} milestones · {duration}" and a one-line description, with a round check for the selected one. Applying one lays milestones end to end from today, all "not-started", with no payment percentages and no toast. `src/data/property-type-templates.ts:53-128`, `src/data/property-type-templates.ts:389-394`, `template-picker-dialog.tsx:84-118`, `GC:453-473`, `GC:2090-2092`.

### 2.4 Problems

- **E-27** **Problem [inferred].** "Start from scratch" sets `createDialogOpen`, but `MilestoneCreateDialog` is mounted only inside the "milestones exist" branch, so on desktop the button appears to do nothing while the timeline is empty — and the dialog would then pop open as soon as milestones arrive by another route. `GC:1261`, `GC:2050`, `GC:2095-2097`, `GC:3722-3733`.
- **E-28** **Problem.** Choosing the "Recommended" hybrid and then "Upload a new quote" always runs the work-only generator (toast "Timeline generated from work categories") — the upload handler ignores the chosen strategy. `GC:1988`, `GC:1751`, `GC:1672`.

---

## 3. Above the chart: KPI strip, view toggle, banners, toolbar

### 3.1 Layout

- **E-29** The pane is a `space-y-4` column: KPI strip → view toggle row → up to four stacked banners (each `mb-2`, rounded-xl, `px-3 py-2.5`, a 28px round icon tile, title + caption, action on the right) → toolbar card → chart → payment and commission overlay. `GC:1903-1907`, `GC:1928`, `GC:2099`, `GC:2165-2305`, `GC:2307`, `GC:2558`, `GC:2925`.
- **E-30** KPI strip: four tiles in a `grid-cols-2 lg:grid-cols-4 gap-3` grid, each rounded-xl, bordered, `p-3`, with the `card-inner-glow` shadow, a 28px icon tile, an 11px uppercase label and an 18px bold value. `GC:1929-1958`, `CSS:1571-1576`.
- **E-31** Toolbar: one card (`p-3`, rounded-xl) with three clusters spread left / middle / right that wrap: primary actions, the at-risk badge, the autosave indicator. Buttons are the `compact` size — 28px high, 10px text. `GC:2307-2451`, `src/components/ui/button.tsx:43`.

### 3.2 UI elements

- **E-32** KPI tiles, verbatim labels: "Completed" ({completed}/{total}, `CalendarClock`); "On Track" ({pct}%, `ArrowRight`, green tile at ≥ 80% else yellow); "At Risk" ({count}, `AlertTriangle`, red when > 0); "Duration" ("{n} weeks", `Clock`). `GC:1930-1957`.
- **E-33** View toggle: a two-segment control "Internal View" | "Client-Facing View" (selected = primary tint), followed by grey helper text "Full internal view with all milestones" / "Showing what homeowners will see", whose tooltip is "Toggle between internal planning view and client-facing view". `GC:2099-2129`.
- **E-34** Bulk publish button, right-aligned in the toggle row, appears only when something is unpublished: `Send` icon + "Publish {n} change" / "Publish {n} changes". It opens the wizard before the first publish and the batch dialog after; disabled when locked ("Project is locked") or when payments do not total 100% (the tooltip carries the exact reason). `GC:2134-2157`.
- **E-35** Payment-total banner (yellow when under, red when over): "Payment milestones must total 100%" + the reason, e.g. "Payment milestones add up to 80% — 20% unallocated. Allocate the rest before publishing." or "Payment milestones exceed contract value by 5%. Reduce one milestone before publishing." `GC:2165-2189`, `src/lib/milestone-payments.ts:65-74`.
- **E-36** Variation-order banner (yellow, dismissible for the visit): "Contract total changed by +S$1,200" / "Your payment milestones still sum to 100% of the original. Rebalance against the new contract?" with a yellow "Rebalance" button that opens the wizard at step 3, and an X. Shown when approved variation orders net to non-zero and a published payment milestone exists. `GC:1362-1377`, `GC:2195-2230`.
- **E-37** Dependency-violation banner (red): "{n} dependency violation(s)" / "{B} starts before {A} ends · … · +{n} more" and a "Why?" button (`Sparkles`) that opens the mAIson assistant seeded with every violation and the question "What are my options to fix this? Move dates, shorten phases, or drop dependencies?". `GC:2235-2271`.
- **E-38** First-publish banner (primary tint, until anything has been published): "This timeline isn't visible to your homeowner yet." / "Run a quick 3-step check to make sure it's ready before you share it." and the button "Configure & publish →". `GC:2274-2305`.
- **E-39** Toolbar, left cluster: "Add Milestone" (`Plus`), a divider, a full-screen toggle (`Maximize2` / `Minimize2`, tooltip "Full screen" / "Exit full screen"), and a cog (`Settings`) popover. `GC:2311-2340`.
- **E-40** The cog popover (256px wide, rows of 12px text with a 12px icon) lists: "Preview homeowner view"; "Reconfigure homeowner view" (only after a first publish); "Save as template"; "Manage templates" (a link to `/accounts/milestone-templates`); then a caption "GENERATE TIMELINE" and "From work categories" ("Generating..." while busy), "Hybrid — work + payments", "From payment schedule", "From project template", and — only when the project has no quote — "Upload quote to enable" ("Parsing..." while busy). The two quote-based rows are disabled without a quote, with the native tooltip "Add a quote to this project first". `GC:2341-2425`.
- **E-41** Toolbar, middle: a red badge "{n} At Risk" (`AlertTriangle`) when any milestone is at risk. Right: the autosave indicator — nothing when idle, a spinner + "Saving…", a check + "Saved" (green, clears after 2.5 s), or a triangle + "Save failed — try again" (red). `GC:2438-2449`, `GC:3769-3786`, `GC:522`.

### 3.3 Interactions and states

- **E-42** Full screen is a CSS overlay, not the browser API: the whole pane becomes `fixed inset-0 z-40` on the page background with its own scroll, a header showing the project name (or "Timeline") and an "Exit full screen" button; body scrolling is locked; Escape exits unless a dialog or popover is open, in which case the first Escape closes that. `GC:626-649`, `GC:1904-1925`.
- **E-43** "Client-Facing View" before any publish replaces the chart with a dashed card: "Your homeowner can't see anything yet" / "Run the 3-step setup to confirm payments and scope, then publish your first version." with "Configure & publish" and a ghost "Switch to Internal view". `GC:2455-2486`.
- **E-44** "Client-Facing View" after a publish replaces the chart with a card "What your homeowner sees" / "Read-only preview of the published timeline. Switch to Internal view to make changes.", an "Open as homeowner" button (opens `/api/studio/preview-as-homeowner?projectId=…` in a new tab; native tooltip "Open the live portal in a new tab — read-only, no OTP required."), and the same `ProgressTimeline` component the homeowner portal uses, fed from published snapshots. If nothing is visible: "No milestones are visible to your homeowner yet." / "Publish at least one milestone to populate the homeowner timeline." `GC:2487-2555`.
- **E-45** Read-only (Closed) hides the publish button and all four banners; locked keeps them but disables their buttons with "Project is locked". `GC:2134`, `GC:2165`, `GC:2195`, `GC:2235`, `GC:2274`, `GC:2145`, `GC:2214-2215`.

### 3.4 Motion

- **E-46** The KPI strip and the empty-state card enter with `animate-fade-up`: `fadeUp` 0.4 s ease-out, from 12px lower and transparent. `GC:1929`, `GC:1974`, `CSS:1222-1225`, `CSS:1654-1656`.
- **E-47** The autosave spinner uses `animate-spin`; the toggle segments, popover rows and banner buttons use `transition-colors`. `GC:3782`, `GC:2103`, `GC:2344`.

### 3.5 Rules and problems

- **E-48** "On Track" = (milestones − at-risk milestones) ÷ milestones, rounded; 100% when there are none. `GC:1895-1901`.
- **E-49** **Problem.** "Duration" is the chart's drawn range in weeks — which includes the padding and is never less than twelve — not the project's length; a three-week timeline reads "12 weeks". `GC:1899`, `GC:1006`, `GC:538`.
- **E-50** **Problem.** The banners and the client-view gate say "3-step", but the wizard has four steps ("Step 1 of 4"). `GC:2284`, `GC:2467`, `WIZ:32-37`, `WIZ:229`.
- **E-51** **Problem.** "Save failed — try again" can practically never show: autosave calls the parent's `mutate` without awaiting it, so the indicator turns to "Saved" whether or not the request succeeded [inferred]. `GC:516-526`, `PAGE:2912-2917`.
- **E-52** **Problem.** The toolbar card is not hidden in read-only mode and its buttons check only the lock. On a Closed project in a studio without the handover-lock feature, "Add Milestone" and the whole "Generate timeline" menu still work on screen, but autosave is switched off for read-only — the changes silently never save [inferred]. `GC:2307-2313`, `GC:2386-2415`, `GC:509`, `GC:1261`.

---

## 4. The Gantt chart

### 4.1 What it is

- **E-53** A hand-built chart (no library): a list of milestone names on the left, a horizontally scrolling week grid on the right with one bar per milestone, a Today marker, and dependency arrows drawn in an SVG layer. `GC:2558-2921`, `dependency-arrows.tsx:63-110`.

### 4.2 Layout (anatomy and sizes)

- **E-54** The chart is one rounded-xl bordered card with `overflow-hidden` and `isolate` (so its layers cannot paint over the sticky page header); inside, a flex row of the name list, an 8px resize handle, and the scrolling grid. `GC:2558-2566`, `GC:2723-2724`, `GC:2742`.
- **E-55** Name list: default 220px wide, draggable between 180 and 400px (the width is not remembered); a 36px header reading "MILESTONES" (11px, semibold, uppercase, disabled-grey) with a 32px "+" button (tooltip "Add milestone") at the right. `GC:755-758`, `GC:2568-2587`.
- **E-56** Rows are 44px high in both halves (`h-11`), separated by a hairline. `GC:2600`, `GC:2830`.
- **E-57** A name row, left to right: an eye toggle (12px `Eye` / `EyeOff`), a grip (`GripVertical`, 10px), an 8px status dot, an at-risk triangle (10px, red) when at risk, a `Ban` (10px, yellow) when blocked, a red `AlertCircle` (13px) when an invoice variance is pending, the name (11px, truncated), a yellow chip "S$6,000 · 10%" for payment milestones (just "10%" when no contract value), and a bin (10px) that appears on hover. `GC:2611-2716`.
- **E-58** Resize handle: an 8px column with five 2px grip dots at 40% opacity (100% on hover), `col-resize` cursor, native tooltip "Drag to resize panel", and a wider invisible hit area for touch. `GC:2723-2738`.
- **E-59** Time scale: one day = 24px, fixed; one header cell = one week = 168px. The header row is 36px high, each cell labelled with the week's first day in the studio's locale (short month + day, e.g. "6 Jan"); the label is bold and dark when that Monday falls on the 1st–7th of a month, otherwise grey. `GC:1011`, `GC:1026-1033`, `GC:2762-2776`.
- **E-60** Range: the grid starts on the Monday on or before (earliest start − 3 days) and runs to (latest end + 7 days) or twelve weeks, whichever is longer; with no dated milestones it is twelve weeks from this Monday. `GC:978-1008`.
- **E-61** Today marker: a red 2px vertical line through the full height with a small red tag "TODAY" (9px, bold, white on red, rounded) centred in the header row; it sits on the left edge of today's column and is not drawn when today is outside the range. `GC:1016-1022`, `GC:2745-2759`.
- **E-62** Grid lines: one faint vertical rule per week in every row; alternate weeks are tinted in the header. There is no weekend shading and no day-level rule. `GC:2766-2768`, `GC:2832-2836`.
- **E-63** Bars: 28px high, 8px from the row top, 6px radius, small shadow; left = days from range start × 24; width = (days inclusive × 24) − 2, never less than 24px. The label is the milestone name in 11px white medium, truncated, preceded by a white triangle when at risk and a white-disc alert when an invoice variance is pending. `GC:1037-1047`, `GC:2839-2888`.
- **E-64** Under a payment milestone's bar (at 32px from the row top, so it touches the row below) sit two tiny pills: a yellow "⚑ S$6,000 (10%)" and, when a commission rate is set, a green "Comm: S$300" — 8px text. `GC:2898-2914`.
- **E-65** Dependency arrows: a cubic curve from the predecessor's right edge to the successor's left edge at bar mid-height, 1.5px, grey at 60% opacity with a small arrowhead; red and dashed ("4 2") when the successor starts before the predecessor ends. The SVG layer sits above the bars. `dependency-arrows.tsx:77-108`, `GC:2780-2798`.
- **E-66** The grid scrolls sideways inside the card (`overflow-x-auto`, `overscroll-x-contain` to stop a back-swipe); the name list does not scroll with it. Vertically the chart is as tall as its rows — the header is not sticky and there is no inner vertical scroll. `GC:2742-2743`.

### 4.3 UI elements: how state is drawn

- **E-67** Status colours as declared: not-started = `surface-variant` grey, in-progress = primary purple, completed = green, pending-approval = yellow; "blocked" has no entry and falls back to grey. These drive the 8px dot in the name list. `GC:229-234`, `GC:2589`, `GC:2632`.
- **E-68** The bar's colour is the milestone's own colour (a left-to-right gradient of it) whenever one is set, which overrides the status class; nearly every creation path sets one. `GC:2842`, `GC:2851-2856`, `GC:1271`.
- **E-69** At risk: the bar becomes a 135° gradient from the milestone colour into red `#DB382A`, with a pulsing inset red ring; the row gets a 2px red left border that pulses, a red triangle, and the name in red medium. `GC:2844`, `GC:2852-2853`, `GC:2604`, `GC:2638-2640`, `GC:2682`.
- **E-70** Completed: the bar drops to 50% opacity. In progress: the row gets a 2px left border pulsing between two purples and the dot gets a pulsing halo; the bar itself does not change. `GC:2857`, `GC:2602`, `GC:2633-2635`.
- **E-71** Selected: the row gets a primary tint and a 2px primary left border; the bar gets a 2px primary ring and a soft 4px glow. `GC:2601`, `GC:2843`.
- **E-72** Blocked: the name turns yellow medium and a yellow `Ban` shows in the row. `GC:2641-2644`, `GC:2682`.
- **E-73** Critical path: a milestone on it (and not at risk) gets a 2px red left border on its name row. Nothing marks it on bars or arrows, and there is no legend. `GC:659`, `GC:2603`.
- **E-74** There is no progress fill inside bars, no percentage, no assignee, no dates on or beside the bar, and no baseline (the baseline feature was removed in May 2026; the fields may linger in old data). `GC:654-655`, `GC:2866-2888`.

### 4.4 Interactions

- **E-75** Press a name row or a bar: selects the milestone and opens its drawer; pressing the selected one again deselects. `GC:2608`, `GC:2864`.
- **E-76** Press the name text itself: it is also the trigger of a "Mark as Blocked" popover (see E-176), so the popover opens on the same press that selects the row. Right-click on the name does the same thing; there is no context menu anywhere. `GC:2676-2693`.
- **E-77** Double-click the name: swaps it for an inline text input (underlined, autofocus); Enter or blur saves. `GC:2667-2674`, `GC:2683`.
- **E-78** Eye toggle: flips "visible to client" for that milestone; native tooltip "Visible to client" / "Internal only". `GC:2612-2627`.
- **E-79** Bin: opens the confirm "Delete Milestone" — "Are you sure you want to delete "{name}"? This action cannot be undone." — with a destructive "Delete". `GC:2709-2715`, `GC:3736-3750`.
- **E-80** Variance alert icon: selects the milestone; native tooltip "Billed S$120 over expected — click to resolve" / "… under expected — click to resolve". `GC:2655-2665`.
- **E-81** Hover: a row tints grey, a bar's shadow deepens, the bar's native tooltip is the milestone name, the cursor over a bar is a grab hand and over its right 8px is a horizontal resize. `GC:2600-2601`, `GC:2840-2843`, `GC:2862`, `GC:2892`.
- **E-82** **Move.** Press and drag a bar: it follows the pointer pixel for pixel; under 3px counts as a click. On release the shift is rounded to whole days (`dx ÷ 24`) and both dates move by that many calendar days. `GC:1053-1079`, `GC:1095-1104`.
- **E-83** **Resize.** Drag the right 8px of a bar: the width follows the pointer (never under one day); on release the end date moves by the rounded day count. A resize that would put the end before the start is silently discarded. There is no handle on the left edge. `GC:1105-1114`, `GC:2817-2823`, `GC:2889-2895`.
- **E-84** **Cascade.** After a move or resize, any milestone that depends on the moved one and now starts before its latest predecessor ends is pushed to start the day after, keeping its length; the push ripples down the chain. If anything would be pushed, nothing is applied yet and the "Dependency Cascade" dialog opens. `GC:111-187`, `GC:1116-1155`.
- **E-85** "Dependency Cascade" dialog (`max-w-md`): yellow triangle + title; "Moving "{name}" will shift {n} dependent milestone(s)."; a scrolling list (max 240px) of rows "{name}  {old start} → {new start}"; when the project end moves, a yellow strip "Project end date: 12 Mar → **19 Mar** (+7 days)"; buttons "Cancel" and "Apply Changes". Cancel discards the whole drag, including the moved bar. `gantt/cascade-preview-dialog.tsx:55-101`, `GC:3418-3433`.
- **E-86** **Reorder.** A name row is a native HTML drag source: the dragged row fades to 40%, the row under the pointer shows a 2px primary top border, and dropping inserts the row there and renumbers `order`. `GC:1182-1220`, `GC:2595-2606`.
- **E-87** **Resize the list.** Drag the handle between the list and the grid; clamped to 180–400px. `GC:1224-1255`.
- **E-88** **Arrows.** A 12px invisible band along each arrow is clickable; one click removes that dependency immediately — no confirmation, no toast, no undo. `dependency-arrows.tsx:88-95`, `GC:2799-2805`.
- **E-89** Touch: bar drags use pointer events and work on touch tablets; a tap on a bar toggles selection; a second finger is ignored; a system gesture cancels the drag without applying. Bars set `touch-action: none`, so the grid cannot be scrolled by swiping on a bar. `GC:1051-1056`, `GC:1156-1172`, `GC:2841`.
- **E-90** Keyboard: none. Rows and bars are plain `div`s with no focus stop or key handler; the only keys are Enter in the inline rename and Escape in full screen. `GC:2673`, `GC:635-641`.

### 4.5 States

- **E-91** Read-only (Closed): no "+", no row drag, no eye, no inline rename, no bin, no bar drag or resize handle; bars show a pointer cursor and still open the drawer. `GC:2573`, `GC:2595-2599`, `GC:2611`, `GC:2667`, `GC:2708`, `GC:2860-2863`, `GC:2890`.
- **E-92** Locked: drags, reorder, add, delete and every field update return early; arrow deletion is withheld. `GC:1054`, `GC:1183`, `GC:1197`, `GC:1261`, `GC:1293`, `GC:1299`, `GC:2799`.
- **E-93** Milestones whose dates are missing or invalid are given consecutive seven-day slots from today on load, and a bar with unreadable dates is drawn at the far left, one week wide. `GC:369-393`, `GC:1040-1043`.

### 4.6 Motion

- **E-94** In-progress row: `gantt-pulse-active` — `pulseBorderLeft`, 2 s ease-in-out, infinite (border colour between primary and its light variant). Its dot: `gantt-dot-pulse` — `pulseDot`, 1.5 s ease-in-out, infinite (scale 1 → 1.4, opacity 1 → 0.5). `CSS:1883-1900`.
- **E-95** At-risk row: `gantt-at-risk` — `pulseAtRisk`, 2 s ease-in-out, infinite (red border + a 3px outer ring fading). At-risk bar: `gantt-bar-at-risk` — `pulseAtRiskBar`, 2 s ease-in-out, infinite (inset red ring 1px → 2px). `CSS:1903-1920`.
- **E-96** Bars transition only `box-shadow` (0.2 s ease) and switch transitions off while being dragged; rows transition colours over 150 ms; the bin fades in on hover. After a drop, a cascade or a reorder the bars and rows jump to their new places with no animation. `GC:2859`, `GC:2600`, `GC:2712`.
- **E-97** While a bar or the list handle is being dragged the chart sets `user-select: none`. There is no auto-scroll when dragging near the grid's edge and no scroll-to-today on open. `GC:2564`, `GC:2742`.
- **E-98** A global rule collapses every animation and transition for users who prefer reduced motion. `CSS:1331-1338`.

### 4.7 Rules and logic

- **E-99** All date arithmetic is in calendar days; there is no concept of working days, weekends, public holidays or site hours. `GC:77-86`, `GC:1095-1113`.
- **E-100** Duration is inclusive: a bar from the 1st to the 5th is five days. `GC:1045`, `MENU:596-598`.
- **E-101** At risk = not completed **and** (the end date has passed **or** less than 20% of its length remains). Not-started and blocked milestones count too. It is recomputed on every render and drives the red bar, the "{n} At Risk" badge, the "On Track" figure and the automatic owner task. `GC:189-227`.
- **E-102** A dependency is finish-to-start by id (`dependsOn`); it is "violated" when the successor starts before the predecessor's end date (starting on the same day is allowed). `GC:1387-1401`, `dependency-arrows.tsx:43-45`.
- **E-103** Cascade pushes only forward: moving a predecessor earlier, or dragging a successor to before its predecessor, moves nothing else — the second case just raises the violation banner and a red arrow. `GC:173-182`.
- **E-104** The critical path is computed from durations and dependencies only (not the dates on the chart): forward and backward pass, a milestone is critical when its float is zero. `dependency-arrows.tsx:117-217`.
- **E-105** New milestones get the id `ms-new-{timestamp}`, status "not-started", colour `#5500FF` unless chosen, and are inserted after the chosen milestone or at the end, then every `order` is renumbered and the new one is selected. `GC:1263-1290`.
- **E-106** Deleting removes the milestone from the array and closes its drawer; nothing else is cleaned up. `GC:1292-1296`.

### 4.8 Data

- **E-107** Per milestone the chart reads `id`, `name`, `order`, `startDate`, `endDate`, `status`, `color`, `dependsOn`, `clientVisible`, `blockedBy`, `paymentPercent`, `publishedAt`, `publishedSnapshot`; from invoices it reads `milestoneId`, `status`, `varianceCents`, `varianceResolution`, `totalCents`, `amountPaidCents`. `src/types/app.ts:1376-1479`, `GC:560-601`.

### 4.9 Responsive

- **E-108** The Gantt renders only at ≥ 1024px (`hidden lg:block`); nothing inside it adapts further except the KPI grid (two columns below `lg`, moot) and touch hit areas (`pointer-coarse:` variants on the bin, the handle and the resize edge). `PAGE:2761`, `GC:1929`, `GC:2712`, `GC:2729`, `GC:2892`.

### 4.10 Problems

- **E-109** **Problem.** No zoom and no other scale: `zoomWeeks` is fixed at 12 with no setter in use, and `GanttZoomControls` (Day 48px · Week 24px · Month 6px · Quarter 2px per day, with − / + buttons) is imported nowhere. A long project is a very wide scroll. `GC:538`, `gantt/gantt-zoom-controls.tsx:12-93`.
- **E-110** **Problem.** Status is hard to read on bars: colour is the milestone's, in-progress and pending-approval look the same as not-started, and the docs' "status colours" describe something the bars do not show. `GC:2851-2856`, `docs/rules/projects.md:69`.
- **E-111** **Problem.** `gantt-bar-blocked` is applied to blocked bars but no such class exists in the stylesheet, although the Block dialog promises "The Gantt chart will show a blocked indicator." `GC:2846`, `milestone-block-dialog.tsx:55`.
- **E-112** **Problem [inferred].** `gantt-bar-completed` (diagonal stripes via `background-image`) is overridden by the bar's inline `background`, so the stripes show only on a milestone with no colour. `CSS:1928-1936`, `GC:2852-2856`.
- **E-113** **Problem.** "Blocked" has three colours: grey dot in the list and the drawer header, yellow name and icons, red in the status pill. `GC:2589`, `GC:2682`, `GC:3144-3150`, `PICK:43-48`.
- **E-114** **Problem.** Critical path and at-risk share the same red left border; with no dependencies at all the longest milestone is still marked "critical" [inferred]. `GC:2603-2604`, `dependency-arrows.tsx:149-155`, `dependency-arrows.tsx:209-214`.
- **E-115** **Problem.** Drag gives no date feedback (no tooltip, no snapping until release), cannot be cancelled with Escape, and cannot be undone. `GC:1071-1079`, `GC:1154`.
- **E-116** **Problem.** The cascade's rules disagree with the violation rule (pushes to "end + 1 day" while "start = end day" is not a violation), it ignores status (it will move completed or in-progress milestones), it runs only for drags — not for the Reschedule dialog or the phone — and its Cancel throws the whole move away rather than offering "move just this one". Its dates are hard-coded to `en-SG`. `GC:176-180`, `GC:1395`, `GC:3476-3486`, `gantt/cascade-preview-dialog.tsx:33-37`.
- **E-117** **Problem.** A known gap is written in the code: in a deep graph with two joining branches a grandchild may not be re-pushed. `GC:128-141`.
- **E-118** **Problem.** Arrow deletion is a destructive single click on an invisible 12px band that lies over the bars it crosses; in read-only the band still shows a pointer cursor and does nothing. `dependency-arrows.tsx:88-95`.
- **E-119** **Problem.** Pressing the name opens the block popover and the drawer together; because the drawer's backdrop then covers the chart, a double-click to rename probably cannot land [inferred]. `GC:2676-2693`, `src/components/leads/drawer-sections/drawer-shell.tsx:91-95`.
- **E-120** **Problem.** Row reorder uses native HTML drag-and-drop, which does not fire on touch screens, and the grip icon is decoration — the whole row is the handle [inferred]. `GC:2595-2599`, `GC:2629`.
- **E-121** **Problem.** Deleting leaves dangling ids in other milestones' `dependsOn` (still counted as "1 predecessor"), and nothing stops deleting a milestone that is published, invoiced, or carries a payment % on a frozen schedule. `GC:1292-1296`, `MENU:178`.
- **E-122** **Problem.** The payment pills under a bar are 8px text and overlap the next row; the code comment says "only in commission view" but there is no such view any more. `GC:2898-2904`.
- **E-123** **Problem [inferred].** Dates go through `toISOString()` (UTC); template starts use "now", so before 08:00 Singapore time "today" can come out as yesterday. `GC:92-95`, `GC:454-461`.

---

## 5. The milestone drawer and its action menu

### 5.1 What it is / entry points

- **E-124** Selecting a milestone (row, bar, variance icon, or a newly created one) opens a right-hand drawer titled with a status dot and the milestone's name; it holds an optional variance banner, the name field and the action menu. Every edit other than name, colour and description happens in a dialog opened from the menu. `GC:3140-3415`, `GC:1289`.

### 5.2 Layout

- **E-125** The drawer is the lead drawer's shell: fixed to the right edge, full height, full width on phones and `max-w-md` (448px) from `sm`, heavy shadow; a blurred 20% backdrop covers the rest of the page at one layer below. Header `px-6 py-4` with a 36px close button; body `p-6` on the page-background colour, scrolling; footer `p-4`, sticky, with a shadow while content is hidden beneath it. `src/components/leads/drawer-sections/drawer-shell.tsx:88-157`.
- **E-126** Header: a 10px status dot (red when at risk, purple in progress, green completed, yellow pending approval, grey otherwise), the name in 14px semibold, then a badge — red "At Risk" with a triangle, or primary "Active" when in progress and not at risk — and the close X. `GC:3142-3168`.
- **E-127** Body, top to bottom (`space-y-3` then `space-y-4` inside the menu): variance banner(s) → name input (36px, placeholder "Milestone name…") → summary row → description → conditional strips → the action list → "Related files" → "Publish history". `GC:3181-3413`, `MENU:263-485`.
- **E-128** Footer: "Cancel" (outline) and "Save Changes" (`Save` icon, `px-6`), right-aligned; absent in read-only. `GC:3170-3179`.

### 5.3 UI elements

- **E-129** Summary row (12px grey): a clickable status pill — dot + status word ("not started", "in progress", "completed", "pending approval", "blocked", capitalised by CSS) + a small chevron; then "· 5 Jan → 12 Jan · 8d"; and at the far right a 20px colour swatch (native tooltip "Change milestone color"). `MENU:266-323`, `PICK:155-168`, `MENU:592-602`.
- **E-130** Colour popover: caption "Bar color" and eight 28px swatches in a 4-column grid — Purple `#5500FF`, Green `#469E59`, Amber `#F19E2B`, Red `#DB382A`, Blue `#4E5BB4`, Violet `#9333EA`, Gold `#C17E22`, Slate `#666666`; the current one has a primary ring. One press applies it. `MENU:22-31`, `MENU:301-320`.
- **E-131** Description: a two-row textarea, placeholder "Add a short description (optional)"; it saves on blur or on ⌘/Ctrl + Enter. `MENU:328-340`, `MENU:492-511`.
- **E-132** Missing-dates strip (yellow, a button): "Dates not set — most actions are disabled until you add them" with "Set dates ›" at the right; it opens the Reschedule dialog in set-dates mode. `MENU:344-365`.
- **E-133** Blocked strip (red, only when the status is "blocked"): "Blocked: {reason}" and the details beneath. The reason is the stored key ("vendor", "client", "permit", "other"), not its label. `MENU:368-376`.
- **E-134** Homeowner-approval pill (when the status is "pending-approval", or completed and already finalized): yellow "Awaiting homeowner approval" with a clock; green "Homeowner approved 2h ago" with a thumbs-up; or red "Homeowner requested a revision 2h ago" with the quoted comment. `MENU:383-385`, `MENU:515-554`.
- **E-135** Unpublished strip (yellow): "Unpublished changes — homeowner sees the previous state" with a "Publish" button (`Send`); disabled, with the reason as a tooltip, when payments do not total 100% or the project is locked. `MENU:410-428`.
- **E-136** The action list is one bordered rounded-xl card of full-width rows (`px-4 py-3`): 16px icon, 14px medium label, a 12px grey subtitle, a chevron. "primary" rows are purple, the "danger" row red; a disabled row is 50% opacity, loses its chevron and replaces its subtitle with the reason. `MENU:431-467`.
- **E-137** The rows, in order, with subtitle and disabling rule, verbatim:

  | # | Label (icon) | Subtitle | Disabled when → reason shown |
  |---|---|---|---|
  | 1 | "Start Milestone" (`Play`, primary) | "Mark in-progress, post update, create tasks" | no dates → "Set start & end dates first"; completed → "Already complete"; in progress → "Already in progress" |
  | 2 | "Post Update" (`MessageSquarePlus`) | "Share progress with homeowner" | no dates → "Set dates so the update has context"; completed → "Milestone is complete" |
  | 3 | "Adjust Dependencies" (`GitBranch`) | "{n} predecessor(s)" or "No dependencies" | no dates → "Dates needed to validate finish-to-start"; completed → "Milestone is complete" |
  | 4 | "View / Edit Tasks" (`ListChecks`) | "{done}/{total} complete" or "No tasks yet" | never |
  | 5 | "Mark as Blocked" (`Ban`, danger) | "Pause and record reason" | no dates → "Set dates first"; completed → "Already complete"; blocked → "Already blocked" |
  | 6 | "Reschedule" / "Set dates" (`Calendar`) | "Change start/end dates" / "Add a start and end date" | never |
  | 7 | "Edit Payment Structure" (`DollarSign`) | "Currently {n}% of contract" / "Add a payment percentage" / "Invoice already issued — locked" | an invoice exists → "Invoice already issued — use Variance Resolution to change billing" |
  | 8a | "Mark as Complete" (`CheckCircle2`, primary) — until completed | "Trigger invoice generation" | no dates → "Set dates first"; not in progress → "Start the milestone first" |
  | 8b | "Finalize Completion" (`CheckCircle2`, primary) — completed, not finalized | "All sign-offs received — lock this milestone" / "Pending sign-offs (see checklist above)" | a gate is pending → the pending reasons joined by " · " |
  | 9 | "Ask mAIson" (`Sparkles`) | "AI consultation about this milestone" | never |

  `MENU:155-261`.
- **E-138** "Related files" (only when the milestone has invoices): a card of rows — file icon, invoice number, a status badge ("Pending Approval", "Rejected", "Draft", "Sent", "Partial", "Paid", "Overdue", "Void"), the amount, an eye — each opening a read-only invoice quick view. Purchase orders are not linked to milestones. `milestone-related-files.tsx:33-138`.
- **E-139** "Publish history" (once published): the last three publishes, newest first, each "{2h ago} {changes joined by ·}" — e.g. "First publish", `Renamed: "A" → "B"`, "Dates shifted by +3d", "Duration 5d → 7d", "Status: in-progress → completed", "No homeowner-facing changes"; with no entries it reads "Last published 2h ago". `MENU:556-578`, `GC:1429-1448`.
- **E-140** Invoice-variance banner at the top of the drawer: red, "Invoice variance: +S$120.00", then "Billed above the milestone's expected amount. Resolve via Variation Order, rebalance, or accept." or "Billed below the milestone's expected amount. A reconciliation task was created for the assigned designer.", a row per off-amount invoice (number, a "FLAGGED" tag, the signed amount, a "Know more & fix" button that opens the variance wizard), and a muted "RESOLVED VARIANCES" list. `GC:3188-3273`, `GC:3754-3762`.

### 5.4 Interactions

- **E-141** The status pill opens a 288px popover captioned "Change status" listing only the moves allowed from the current state (see E-195); "Start", "Mark complete" and "Mark as blocked" route to their dialogs, the rest write directly. `PICK:152-215`, `GC:3340-3374`.
- **E-142** Typing in the name field updates the milestone on every keystroke (and so the bar label and the autosave timer). `GC:3281-3288`.
- **E-143** "Ask mAIson" stores a starter prompt — "Help me with the **{name}** milestone on project **{project}** (status: …, start → end). What should I be paying attention to right now?" — and opens the assistant panel. `GC:3389-3402`.
- **E-144** "Publish" in the strip publishes just this milestone, immediately, once the project has been published before; before that it opens the wizard. `GC:3407`.
- **E-145** "Cancel" and the X only close the drawer; "Save Changes" pushes the whole timeline to the server at once (skipping the 1.5 s wait) and closes. Pressing the backdrop or Escape does nothing. `GC:3168-3178`, `src/components/leads/drawer-sections/drawer-shell.tsx:94`, `src/components/leads/drawer-sections/drawer-shell.tsx:105-111`.

### 5.5 States

- **E-146** Locked: every action row is disabled with "Project is locked"; the pill, swatch, description and name field are disabled with the same tooltip; "Mark resolved" is withheld. `MENU:255-259`, `MENU:291-292`, `MENU:497-507`, `MENU:403`, `GC:3284-3285`.
- **E-147** Read-only (Closed): the name field, the whole action menu and the footer are not rendered — the drawer shows only its title, the At Risk / Active badge and any variance banner. `GC:3280`, `GC:3295`, `GC:3170`.

### 5.6 Motion

- **E-148** The drawer slides in from the right over 300 ms (`animate-in slide-in-from-right duration-300`) over a blurred backdrop; header and footer shadows fade with `transition-shadow`; the floating mAIson button is hidden while it is open. `src/components/leads/drawer-sections/drawer-shell.tsx:65-70`, `src/components/leads/drawer-sections/drawer-shell.tsx:92`, `src/components/leads/drawer-sections/drawer-shell.tsx:100`.

### 5.7 Problems

- **E-149** **Problem.** "Cancel" does not cancel: every change made while the drawer was open is already in the timeline and will autosave. "Save Changes" adds nothing but speed. `GC:3172-3176`, `GC:502-532`.
- **E-150** **Problem.** With the drawer open the chart is blurred and unreachable; to look at another milestone the user must close first. Neither the backdrop nor Escape closes it. `src/components/leads/drawer-sections/drawer-shell.tsx:91-95`.
- **E-151** **Problem.** In read-only mode a milestone's dates, status, description, tasks and publish history cannot be seen at all (E-147).
- **E-152** **Problem.** The menu's own comment says "comments live below the actions in the parent", and the Gantt still carries add-comment and reply handlers, but no comment thread is rendered anywhere in the drawer. `MENU:98-101`, `GC:1515-1557`.
- **E-153** **Problem.** A block set from the name popover stores `blockedBy` without changing the status, so the drawer shows no "Blocked" strip and the pill offers no "Unblock" — it can only be cleared from the same popover. `GC:2676-2680`, `MENU:368`, `PICK:99-115`.
- **E-154** **Problem.** "Edit Payment Structure" locks on any invoice at all (draft or void included), while the dialog it opens defines "issued" as neither draft nor void; because the row is disabled first, the dialog's own "Invoice already issued" explanation is unreachable. `GC:3308`, `GC:3531-3533`, `MENU:212-218`.
- **E-155** **Problem.** "Start Milestone" is enabled for a blocked milestone and does not clear the block, leaving an in-progress milestone still flagged blocked [inferred]. `MENU:158-167`, `GC:3463`.
- **E-156** **Problem [inferred].** Reopening a finalized milestone leaves `finalizedAt` set, so while it is back in progress neither "Mark as Complete" nor "Finalize Completion" is offered — completing again is possible only from the status pill. `MENU:230-251`, `GC:3358-3365`.
- **E-157** **Problem.** The unpublished strip says "homeowner sees the previous state" for a milestone that has never been published, and shows for milestones hidden from the client. `GC:1337-1346`, `MENU:410-412`.
- **E-158** **Problem.** Since missing dates are filled in on load and the create dialog requires them, the "Dates not set" strip and every "Set dates first" reason are practically unreachable on desktop [inferred]. `GC:369-393`, `milestone-create-dialog.tsx:121-124`.

---

## 6. Milestone dialogs

All are the shared centred dialog, capped to the viewport height (`max-h-[calc(100dvh-2rem)]`) with an inner scroll, with a 16px icon in the title. Sizes: `max-w-md` (448px) unless noted. Motion: only the shared dialog's own open and close, plus `transition-colors` on rows, swatches and the small switches; nothing bespoke. Responsive: paired date fields stack below `sm`; the create and save-template footers stack their hint above the buttons below `sm`; the wizard's rows stack name above the % box below `sm`. Keyboard: Enter adds a task and submits the block popover; ⌘/Ctrl + Enter commits the description; no dialog submits on Enter otherwise. The same wizard, batch, completion and template dialogs in sections 8, 9 and 11 follow this frame.

### 6.1 New milestone (`max-w-lg`)

- **E-159** Opened by "Add Milestone", the "+" in the list header, and "Start from scratch". Title "New milestone" (`Plus`). `GC:1261`, `milestone-create-dialog.tsx:174-181`.
- **E-160** Fields, in order: "Name *" (placeholder "e.g. Demolition", focused); "Short description" (two rows, "What happens in this phase? Optional."); "Start *" and "End *" (native date inputs, side by side from `sm`, End cannot precede Start); "Position" (a select: "Add at end" or "After {milestone}") beside "Color" (eight 24px swatches); "Depends on (optional)" (a checklist of every existing milestone, max 140px tall); a "Payment trigger" card with a switch; and — only when the project pays commission phase by phase and the switch is on — a "Triggers commission accrual" switch. `milestone-create-dialog.tsx:184-386`, `GC:3727`.
- **E-161** Under the dependency list: "Starts after the selected milestone finishes" / "Starts after all {n} selected milestones finish". `milestone-create-dialog.tsx:289-293`.
- **E-162** With the payment switch on: a number box, "% of contract", and "— S$6,000 from contract total"; then a live strip "Other milestones {x}% / This milestone {y}% / New total {z}%" that is green at 100, yellow under ("{n}% unallocated. You can save, but publish stays blocked until the total hits 100%.") and red over ("Over by {n}%. Save is blocked — reduce this milestone or another one."). `milestone-create-dialog.tsx:297-374`.
- **E-163** When the payment schedule is frozen the switch is disabled with "Payment schedule is locked. Add the milestone first, then set its billing % via Override on an owner/admin account." `milestone-create-dialog.tsx:304-311`, `GC:3730`.
- **E-164** Footer: a yellow hint at the left naming the first unmet rule — "Add a name to save." / "Set both start and end dates." / "End date must be on or after the start date." / "Set a payment % above 0." / "Payment % can't exceed 100." / "Payments would total {n}% — over by {m}%. Lower this or another milestone." — then "Cancel" and "Save milestone" (disabled until valid). `milestone-create-dialog.tsx:126-134`, `milestone-create-dialog.tsx:389-401`.
- **E-165** **Problem.** The "Starts after…" promise is not enforced: the typed dates are kept even if they precede the chosen predecessors, producing an immediate violation. Any milestone may be picked as a predecessor here, whereas the Dependencies dialog allows only earlier rows. `milestone-create-dialog.tsx:145-160`, `milestone-deps-dialog.tsx:61-62`.

### 6.2 Start this milestone

- **E-166** Step 1 — title "Start this milestone?" (`Play`); body "{name} will move to **In Progress**. We'll log today as the actual start date." and "After starting, you can post an update and create tasks — both optional."; buttons "Cancel" and "Start milestone" ("Starting…"). `start-milestone-flow.tsx:71-91`.
- **E-167** Step 2 — title "Started — what next?" (green check); "{name} is in progress. These steps are optional — skip if not needed right now."; two rows, "Post an update — Share that you've started — visible on the homeowner portal" and "Create tasks — Break this milestone down into a to-do list"; a ghost "Skip both". Each row closes this dialog and opens the Post Update dialog or the Tasks editor. `start-milestone-flow.tsx:93-121`, `GC:3466-3467`.
- **E-168** Starting demotes any other in-progress milestone to not-started and says so in a toast: "{A and B} moved back to Not started — only one milestone is active at a time." `GC:3455-3465`, `src/lib/projects/milestone-status.ts:78-85`.
- **E-169** **Problem.** No actual start date is logged — the milestone type has no such field and the handler writes only the status. `GC:3463`, `src/types/app.ts:1376-1479`.

### 6.3 Reschedule / Set dates

- **E-170** Step 1 — "Reschedule milestone" (`Calendar`): "Update the dates for {name}.", "Start Date", "End Date", "Reason (optional)" (two rows, "E.g., Vendor delivery delayed by 5 days"); "Cancel" and "Continue" (disabled while a date is missing or end < start). With nothing changed, Continue simply closes. `milestone-reschedule-dialog.tsx:90-134`, `milestone-reschedule-dialog.tsx:55-59`.
- **E-171** Step 2 — "Publish to homeowner?" (`Send`): "You changed dates for {name}:", a small table Start / End with the old value struck through and "→ new", then "Publishing updates what your homeowner sees on their portal. You can also publish later from the Gantt chart."; buttons "Save without publishing" and "Publish now" ("Publishing…"). `milestone-reschedule-dialog.tsx:136-162`.
- **E-172** Set-dates mode (no dates yet): title "Set milestone dates", "Add a start and end date for {name} to enable scheduling actions.", no reason field, a single "Save dates" and no publish step. `milestone-reschedule-dialog.tsx:34`, `milestone-reschedule-dialog.tsx:60-72`, `milestone-reschedule-dialog.tsx:95-131`.
- **E-173** On save the dates are written, the reason (if any) is stored as a milestone comment "Reschedule: {reason}", and "Publish now" publishes this one milestone. `GC:3476-3486`.
- **E-174** **Problems.** (a) "Publish now" calls the publish routine directly — it skips the first-publish wizard and is not stopped by the 100% payment gate, which only disables buttons elsewhere. (b) Only owners and admins may add milestone comments; for anyone else the reason is dropped with a console error and no message. (c) The comment is written from the cached server copy while the new dates are still waiting for autosave, so one of the two writes can overwrite the other [inferred]. (d) Because the publish runs before the new dates reach the routine's own copy of the list, the "Schedule updated" notice to the homeowner is not posted for this path [inferred]. (e) Rescheduling never cascades to dependents. `GC:3485`, `GC:1403-1405`, `src/lib/queries/projects.ts:400-404`, `src/lib/queries/projects.ts:406-427`, `GC:1411-1424`.

### 6.4 Mark as blocked (dialog) and the name popover

- **E-175** Dialog — "Mark as blocked" (red `Ban`): "Pause {name} and record why. The Gantt chart will show a blocked indicator."; "Reason" select ("Vendor delay", "Waiting on client", "Permit / approval", "Other"); "Details" (three rows, "What's holding this up?", required); "Expected resume date (optional)" (not before today) with "Homeowner sees an age indicator that turns amber once this date passes."; "Cancel" and a red "Mark as blocked" ("Saving…"). It sets the status to blocked and stores reason, details, the time and the resume date. `milestone-block-dialog.tsx:45-101`, `GC:3490-3507`.
- **E-176** Popover on the milestone name (288px): title "Mark as Blocked" or "Edit Block" (red `Ban`); four radio rows with icons — "Vendor delay" (`Truck`), "Client decision pending" (`User`), "Permit / approval pending" (`FileCheck`), "Other" (`HelpCircle`); "Details" input ("E.g., Hafary tiles backordered until Feb 20", Enter submits); "Clear Block" (when editing) and "Mark Blocked" / "Update". It stores the block but leaves the status alone and has no resume date. `gantt/blocked-by-popover.tsx:23-115`, `GC:2676-2680`.
- **E-177** **Problem.** Two block editors with different reason labels, different fields and different effects on status. `milestone-block-dialog.tsx:62-65`, `gantt/blocked-by-popover.tsx:23-28`.

### 6.5 Adjust dependencies

- **E-178** "Adjust dependencies" (`GitBranch`): "Choose which milestones must finish before {name} can start."; a checklist (max 320px) of the milestones that sit earlier in the row order, each with "YYYY-MM-DD → YYYY-MM-DD"; empty text "No earlier milestones available as predecessors."; "Cancel" and "Save ({n})". `milestone-deps-dialog.tsx:109-163`.
- **E-179** On save it walks the graph and refuses a loop with a red strip: "This would create a cycle: A → B → C". Saving changes only the links — no dates move and no cascade runs. `milestone-deps-dialog.tsx:88-107`, `GC:3515-3517`.
- **E-180** Only "all predecessors must finish first" exists: no lag days, no start-to-start or other link types (a richer `dependencies` shape with `lagDays` is typed but unused by the live chart). `src/types/app.ts:1441-1446`, `GC:121`.

### 6.6 Payment Structure

- **E-181** "Payment Structure" (green `DollarSign`), subtitle = the milestone name: "Payment % of contract" (number, step 0.1, a "%" suffix, "≈ S$6,000" beside it, error "Must be between 0 and 100."); "Trigger commission" switch with "Commission accrues when this milestone is finalized."; the same live totals strip as the create dialog ("… You can save, but publish is blocked until the total hits 100%."); "Cancel" and "Save" ("Saving…"). Over 100% blocks Save; under is allowed. `milestone-payment-structure-dialog.tsx:142-306`.
- **E-182** Frozen schedule: a yellow lock strip "Payment schedule locked" with, for a user who may override, "This schedule was agreed at quote stage. Override only after confirming the change with the client — it re-bases future invoices." and a button "Override payment schedule"; for anyone else, "This schedule was agreed at quote stage and can only be changed by a studio owner or admin." After overriding: "Override active — saving updates this project's billing schedule." `milestone-payment-structure-dialog.tsx:174-199`.
- **E-183** Pressing Override immediately writes "Payment schedule unlocked for editing by {name}" to the linked lead's activity log (nothing is logged when the project has no lead, and it is logged even if the user then cancels). `PAGE:2776-2792`, `milestone-payment-structure-dialog.tsx:122-129`.

### 6.7 View / Edit Tasks (`max-w-xl`)

- **E-184** Title "View / Edit Tasks for {name}" (`ListChecks`). A summary line "**{n}** tasks · **{n}** done · ⚠ **{n}** overdue" (overdue = due before today and not done). `milestone-tasks-editor.tsx:266-294`, `milestone-tasks-editor.tsx:260-263`.
- **E-185** Each task row: a checkbox, the title as an inline input (struck through when done), on `sm+` the assignee's name and the due date (red when overdue), a chevron ("Show advanced" / "Hide advanced"), and a bin on hover. Empty text: "No tasks yet. Add one below." `milestone-tasks-editor.tsx:296-348`.
- **E-186** Advanced panel per row: "Assign to" (studio members, the owner marked "(Owner)"; "Homeowner: {name}" when the project has one; "{name} (External)"; "+ Add person not in your studio", which opens a small name-and-phone dialog), "Due date", "Description" ("Notes, context, links…"), "Supporting images". `milestone-tasks-editor.tsx:353-441`, `milestone-tasks-editor.tsx:577-592`.
- **E-187** Add area: an "Assign to" select that sticks between adds, an input "Add a task and press Enter" with an "Add" button once text is typed, and an "Advanced" expander (due date, description, images) that stays open across adds. `milestone-tasks-editor.tsx:450-549`.
- **E-188** "Suggest from quote" (`Sparkles`; "Reading quote…" with a spinner) asks the AI for five to eight tasks scoped to this milestone's phase and appends the new ones as unsaved rows; without a quote the line reads "Attach a quote to the project to enable AI task suggestions." Toasts: "{n} suggestion(s) added — review and edit before saving.", "AI didn't return any suggestions for this milestone.", "All AI suggestions are already in your list.", "Couldn't fetch AI suggestions. Try again or add tasks manually." `milestone-tasks-editor.tsx:125-194`, `milestone-tasks-editor.tsx:551-566`.
- **E-189** "Save tasks" ("Saving…") cancels removed tasks, patches changed ones, and creates new ones as General tasks linked to the milestone, due on the given date or else the milestone's end date; an external assignee can also raise a "Invite {name} to the studio" task for the owner. There is no success toast. Tasks are rows in the studio `tasks` table, so they also appear on the Tasks sub-tab and `/tasks`. `GC:3556-3637`.
- **E-190** **Problem.** When the AI call fails or times out (45 s) the route silently returns canned tasks — "Review scope for {name}", "Procure materials for {name}", "Execute main works — {name}", "Quality check — {name}", "Clean up after {name}" — which arrive looking like real suggestions. `src/app/api/projects/plan/tasks/route.ts:98-104`, `src/app/api/projects/plan/tasks/route.ts:356-374`.

---

## 7. Milestone fields, the status machine and progress

### 7.1 Fields a milestone has

- **E-191** Stored per milestone: `id`, `name`, `order`, `startDate`, `endDate` (ISO dates), `status`, `description`, `color`, `paymentPercent` (0–100), `type` (`percent` default / `fixed`) with `amountCents`, `commissionTrigger`, `milestoneKind` (`work` / `payment`, set by generators), `sourceCategory` (the quote category a work phase came from), `dependsOn` (ids), `clientVisible`, `blockedBy` (`reason`, `details`, `blockedAt`, `expectedResumeDate`), `finalizedAt`, `publishedAt`, `publishedSnapshot` (`name`, `startDate`, `endDate`, `status`), `publishHistory`, `comments`, and deprecated `tasks`, `baselineStartDate`, `baselineEndDate`, `dependencies`. `src/types/app.ts:1376-1479`.
- **E-192** There is **no** assignee, no phase field (phase is inferred from the name when the AI needs it), no percent-complete, no actual start or end date, and no attachments on a milestone; "files" means its invoices. `src/types/app.ts:1376-1479`, `src/lib/canonical-phases.ts:69-79`, `milestone-related-files.tsx:20-24`.
- **E-193** `fixed` milestones (a flat amount that does not move with the contract) are understood by the generators, the quote sync and the completion dialog, but no milestone dialog lets a user create or edit one — the UI edits percentages only. `src/lib/projects/timeline-generators.ts:98-110`, `DONE:186-191`, `milestone-payment-structure-dialog.tsx:203-230`.

### 7.2 The status machine

- **E-194** Five statuses: `not-started`, `in-progress`, `completed`, `pending-approval`, `blocked`. "At risk" and "overdue" are derived, never stored; "finalized" is the separate `finalizedAt` stamp on a completed milestone. `src/types/app.ts:1388`, `GC:208-227`, `src/types/app.ts:1459-1469`.
- **E-195** Allowed moves from the status pill, with their wording:

  | From | Option (subtitle) | Result |
  |---|---|---|
  | not started | "Start" ("Move to in-progress (prompts for update + tasks)") | Start dialog |
  | in progress | "Mark complete" ("Triggers invoice generation") | Completion dialog |
  | in progress | "Mark as blocked" ("Pause and record reason") | Block dialog |
  | in progress | "Reset to not-started" ("Clears progress (rare)") | direct; toast "Milestone reset to not-started." |
  | blocked | "Unblock" ("Resume work — clears the block reason") | direct → in progress, block cleared; toast "Milestone unblocked — back in progress." |
  | blocked | "Mark complete" ("Skip resume and finish — triggers invoice") | Completion dialog |
  | completed | "Reopen" ("Revert to in-progress"), with a yellow warning when an invoice exists: "An invoice was generated for this milestone. Reopening doesn't void it — handle that from Finance manually." | direct; toast "Milestone reopened. Any generated invoice was not voided — handle from Finance if needed." |
  | pending approval | "Withdraw approval request" ("Back to in-progress") | direct, no toast |
  | pending approval | "Mark complete" ("Bypass homeowner approval") | Completion dialog |

  `PICK:62-145`, `GC:3340-3374`.
- **E-196** Every status write goes through one helper: moving a milestone to in-progress demotes every other in-progress milestone to not-started (completed, blocked and pending-approval are left alone), and when the milestone has a published snapshot the new status is copied into it, `publishedAt` is stamped and "Status: a → b" is appended to its history. `src/lib/projects/milestone-status.ts:27-72`, `GC:1298-1328`.
- **E-197** Nothing advances on its own: completing a milestone does not start the next, a passed end date does not change the status, and a homeowner's approval does not move a pending-approval milestone to completed [inferred]. `GC:1298-1328`, `src/app/api/homeowner/projects/[id]/milestones/[milestoneId]/approve/route.ts:99-149`.
- **E-198** Who sets what: any studio member can make any move. The one role rule is at completion — when the studio's "milestone approval required" toggle is on and the user is not the owner, confirming sets `pending-approval` instead of `completed` ("As a non-owner, this will be submitted for approval instead of directly completed."). `DONE:131-136`, `DONE:363-364`, `DONE:593-597`.
- **E-199** Generators never pre-start a bar: every generated or templated milestone begins "not-started" (an earlier seed of "first one in progress" left 69 production projects with two to four active bars). `src/lib/projects/timeline-generators.ts:163-165`, `src/app/api/projects/plan/route.ts:370-373`, `docs/rules/projects.md:70`.
- **E-200** **Problems.** (a) "pending-approval" means two things: the type and the drawer treat it as waiting on the **homeowner** ("Awaiting homeowner approval", "Bypass homeowner approval"), while the only thing that sets it is the **owner**-approval rule at completion. (b) Setting it creates no task or notice for the owner [inferred]. (c) Completing from "blocked" does not clear the block, so a completed milestone can still read "Paused — {reason}" to the homeowner [inferred]. (d) "Unblock" re-activates the milestone and thereby demotes whichever milestone was started in the meantime. `src/types/app.ts:1383-1387`, `MENU:383-385`, `DONE:357-364`, `GC:3349-3352`, `PICK:109-114`.

### 7.3 Overdue and "at risk" wording

- **E-201** The Gantt never prints day counts; it shows the "At Risk" badge, the red bar and the header badge (E-101). `GC:3156-3160`.
- **E-202** The Overview card prints, for the next two open milestones by end date: "{n}d overdue" (red), "due today", "due tomorrow", "due in {n}d" (under a week) or "due in {n}w" — uncapped, hence "108d overdue". `PAGE:169-187`, `PAGE:231-234`.
- **E-203** The phone list prints "· {n}d overdue" in red after the date range, where n is the ceiling of (now − end date) in days, and swaps the status icon for a red triangle with a red left border. `MOB:45-52`, `MOB:128-138`, `MOB:151-155`.
- **E-204** **Problem [inferred].** The two counts use different arithmetic (one rounds from the end date's UTC midnight upward, the other from "now" to the end date) and can differ by a day for the same milestone; neither caps, groups, or stops counting when a milestone is blocked. `PAGE:177-179`, `MOB:153`.

### 7.4 Progress %

- **E-205** Project progress is payment-weighted: each completed milestone counts its full payment %, each in-progress one half of it, everything else zero, divided by the total of the percentages and rounded. With no payment percentages anywhere it falls back to equal weights: (completed + ½ in-progress) ÷ count. `src/lib/project-progress.ts:28-57`.
- **E-206** The same function serves the project list, the detail page's ring and financial card, and the homeowner portal — but the portal feeds it only the visible, published milestones with their snapshot status, so the two sides can show different percentages [inferred]. `src/lib/project-progress.ts:23-26`, `src/app/api/homeowner/projects/[id]/route.ts:255-290`.
- **E-207** A milestone has no progress of its own (no percentage, no roll-up from its tasks); the drawer shows only "{done}/{total} complete" for tasks. `MENU:185`.

---

## 8. Completing, finalizing and the homeowner's approval

### 8.1 Complete Milestone dialog

- **E-208** Opened by "Mark as Complete" or the pill's "Mark complete". Header: a green check tile, "Complete Milestone", the milestone name. A step trail of small labels joined by lines — "Confirm" → "Invoice & Link" → "Update" for a payment milestone with a contract value, "Confirm" → "Update" otherwise; the current step is a green pill, finished steps show a check. `DONE:96-106`, `DONE:419-457`.
- **E-209** Step 1, Confirm: "Mark **{name}** as completed?" and, for a payment milestone, a yellow card "Invoice that will be created" with an "Edit" / "Done" toggle. Collapsed it shows the description ("{name} ({n}%)"), Subtotal, the tax line, Total, Due, and a footnote "Default: {n}% of contract. Click Edit to adjust before creating." (or an explanation of a catch-up / credit against earlier billing). Expanded it offers "Description", "Total (SGD)" and "Due date" inputs with the same split and "{tax name} is split out of the total using this contract's tax treatment." (or "This contract carries no {tax name} — the total is the full amount.") Buttons: green "Confirm Completion" ("Processing...") and "Cancel". `DONE:468-616`.
- **E-210** Confirming writes the status, and for a payment milestone asks the page to create the invoice as a **draft** for (contract total × %) with any edits; a contract value of zero skips the invoice with "Milestone "{name}" completed but no contract value set — skipping invoice."; a Draft-stage project refuses with "Financial actions are restricted while the project is in Draft."; a duplicate reports "Invoice already exists for "{name}"". `DONE:357-393`, `PAGE:2817-2880`.
- **E-211** Step 2, Invoice & Link: a card with the invoice number, total and a badge "Draft" / "Pending Approval" / "Sent"; an explainer ("Invoice created as a **draft**. Click *Send to homeowner* to share it on their portal, or skip ahead to review it later in Finance." — or the approval variant "Approval required before it goes out… Click *Request approval*…"); buttons "Send to homeowner" or "Request approval" ("Submitting…"), "Next: Post Update →", "View Invoice". After sending: "Invoice **sent to homeowner**. They'll see it under Finance and get a bell notification within a few seconds." After an approval hold: "Invoice **awaiting approval**…" with a rate-limited "Remind" button. `DONE:619-746`.
- **E-212** Step 3, Update: "Share a progress update with the team about completing **{name}**.", a textarea (placeholder "e.g. {name} has been completed. All work inspected and approved."), "Preview invoice" link, "Post Update" ("Posting...") and "Skip & Close". Posting creates a progress update titled "Milestone completed: {name}" and toasts "Progress update posted". `DONE:399-414`, `DONE:749-789`.
- **E-213** Toasts in this flow: "Invoice sent — homeowner notified", "Submitted for approval — your studio's approver will review", "Reminder sent to the approver", "Failed to send invoice", "Failed to post update", "Project is locked — milestone changes are disabled", "Failed to auto-generate invoice". `DONE:303`, `DONE:320`, `DONE:341`, `DONE:323`, `DONE:412`, `DONE:359`, `PAGE:2878`.
- **E-214** Completing a payment milestone also sends the homeowner a bell notification "Milestone complete: {name}" / "Your studio has marked this milestone as complete." `PAGE:2836-2841`, `src/lib/homeowner-binding.ts:199-228`.
- **E-215** **Problems.** (a) Step 3 says "with the team" but progress updates are a homeowner-facing feed. (b) On desktop the homeowner bell fires only for payment milestones with a contract value; the phone fires it for every completion. (c) The status is written before the invoice is attempted, so a failed invoice leaves a completed milestone with no invoice and only a toast. (d) Closing the dialog mid-way leaves the milestone completed. `DONE:752`, `PAGE:2828-2841`, `PAGE:2646-2651`, `DONE:364-383`.

### 8.2 Completion checklist and Finalize

- **E-216** While a milestone is completed but not finalized the drawer shows "COMPLETION CHECKLIST": (1) "Homeowner approval — Awaiting response on the portal" (yellow) / "Homeowner approved — 2h ago" (green) / "Revision requested" with the quoted comment and a "Mark resolved" button (red); (2) the invoice row — "{number} · Draft — Not yet shared with homeowner", "{number} · Sent — Visible on the homeowner's portal", or "See internal approval row below" — each with a "View" button; (3) only when the studio requires invoice approval: "Internal approval — Approved — invoice released to homeowner", "Awaiting internal approval — Your studio's approver hasn't acted yet" (with "Remind", or "Open in Finance to act" for an approver), or "Invoice rejected" with the reason. `milestone-completion-status.tsx:139-394`, `MENU:391-405`.
- **E-217** Gate: a non-payment milestone with no invoice can be finalized straight away; otherwise finalizing needs the homeowner's approval and no open revision, and — when invoice approval is on — the invoice neither pending nor rejected. Payment is deliberately not a gate. The disabled row shows the reasons: "Homeowner approval pending", "Revision requested by homeowner", "Internal invoice approval pending", "Invoice was rejected — fix and resubmit". `milestone-completion-status.tsx:46-83`, `milestone-completion-status.tsx:108-110`.
- **E-218** "Finalize Completion" stamps `finalizedAt` with no dialog and toasts "Milestone finalized." (or "Failed to finalize milestone"). After that the row disappears and only the pill's "Reopen" remains. `GC:3378-3388`, `src/lib/queries/projects.ts:604-623`.
- **E-219** "Mark resolved" opens "Resolve revision" (red `RotateCcw`): "Note what you changed so the homeowner sees your response.", a red box "HOMEOWNER ASKED FOR" with the quote, "What did you change?" (three rows, an example placeholder), "Posts to the milestone's comments. The homeowner will be re-prompted for approval the next time you publish."; "Cancel" and "Mark resolved" ("Resolving…"). It clears the homeowner's response and appends a comment "Revision addressed: {note}"; toast "Revision marked resolved. Re-publish when you're ready to re-share." `milestone-revision-resolved-dialog.tsx:50-97`, `src/lib/queries/projects.ts:543-596`, `GC:3314-3328`.
- **E-220** **Problems.** (a) The note is stored as a milestone comment, and comments are shown nowhere — not to the studio, not to the homeowner. (b) The homeowner is re-asked as soon as the response is cleared, not "the next time you publish". (c) What finalizing does is described three ways: "lock this milestone", "Commission accrues when this milestone is finalized", while the commission figures on this page accrue at "completed". (d) Finalize writes the cached server copy of the timeline, racing the Gantt's unsaved local edits [inferred]. `src/components/homeowner/milestone-approval.tsx:28-31`, `MENU:233-234`, `milestone-payment-structure-dialog.tsx:238-240`, `GC:921`, `src/lib/queries/projects.ts:608-614`.

### 8.3 What the homeowner can do (pointer)

- **E-221** On the portal a card "Milestones to Confirm" lists every published milestone whose shown status is pending-approval or completed and has no response yet: name, a "Pending" pill, the dates, and two buttons — green "Approve" and yellow "Request Revision" (which reveals a textarea "Describe the changes needed..." with "Submit" / "Cancel"). One response per milestone; it then leaves the list. `src/components/homeowner/milestone-approval.tsx:23-177`.
- **E-222** The response is saved to the separate `project_milestones` table (`homeowner_approval_status` = `approved` / `revision_requested`, comment, time), and the studio is notified ("milestone.homeowner_approved" / "milestone.homeowner_revision_requested"). The studio reads these back per milestone for the drawer and the banner. `src/app/api/homeowner/projects/[id]/milestones/[milestoneId]/approve/route.ts:99-187`, `src/app/api/projects/records/[id]/milestone-approvals/route.ts:22-56`.
- **E-223** In the studio's own preview the buttons are disabled with "Read-only preview — the real homeowner will see clickable buttons here." `src/components/homeowner/milestone-approval.tsx:160-164`.

---

## 9. Publishing to the homeowner

### 9.1 What it is

- **E-224** The homeowner never sees live milestone edits. They see, for each milestone not explicitly hidden, the snapshot taken at the last publish: name, start, end and status. A milestone "has unpublished changes" when it has no snapshot or any of those four differ. `GC:1330-1346`, `src/app/api/homeowner/projects/[id]/route.ts:255-281`.
- **E-225** Entry points: the first-publish banner and the client-view gate ("Configure & publish"), the "Publish {n} changes" button, the drawer's "Publish", the Reschedule dialog's "Publish now", and the cog's "Reconfigure homeowner view" and "Preview homeowner view". `GC:2292`, `GC:2473`, `GC:2144`, `GC:3407`, `GC:3485`, `GC:2343-2361`.

### 9.2 First publish: the wizard (`max-w-xl`)

- **E-226** Title "Set up homeowner view" (`Sparkles`); four 6px progress segments (filled up to the current step) and the line "Step {n} of 4 — {label}", labels "Tag payments", "Match quote", "Check totals", "Review & publish"; body at least 260px tall; footer with a yellow hint for the unmet rule, "Cancel" / "Back", and "Next →" or "Publish to homeowner" ("Publishing…"). `WIZ:32-37`, `WIZ:204-306`.
- **E-227** Step 1, Tag payments: "Tell us which milestones trigger an invoice. Set **0%** for non-billable steps."; preset buttons "Standard split" (a front-loaded 30/20/15/15/10/5/5 pattern scaled to the count), "Equal across all", "Clear all"; one row per milestone with its name, "S$… due", a 0–100 number box, and a tag — yellow "Pay" or grey "Internal"; a footer "Total payment % {sum}%" that turns green at 100. When percentages already total 100 a green strip says "**Payments detected from quote.** Review and adjust if needed — they already sum to 100%." Needs at least one payment milestone to continue ("Tag at least one milestone with a payment % before continuing."). `WIZ:311-400`, `WIZ:143-179`, `WIZ:84`.
- **E-228** Step 2, Match quote: "Make sure your milestones cover the scope of work you quoted to the homeowner."; a card "Quote on file — {n} line items · Contract total S$…" or "We can't find a quote attached to this project. You can still confirm scope manually."; a checkbox card "These milestones reflect the scope I quoted — Once you publish, the homeowner will see this timeline as the agreed plan." Must be ticked ("Confirm that the milestones cover the scope you quoted."). `WIZ:404-448`, `WIZ:85`.
- **E-229** Step 3, Check totals: "Payment percentages should add up to exactly 100% of the contract."; a big figure, green "Looks good — sums to 100%." or yellow "Currently {n}% short. Add it somewhere." / "Currently {n}% over. Reduce one or more milestones." with repair buttons "Equal across {n}" and "Weighted by duration"; then the list of payment milestones and their %. Blocks until exactly 100 ("Sum is {n}% — should add up to exactly 100%."). `WIZ:452-517`, `WIZ:86`.
- **E-230** Step 4, Review & publish: "Here's what your homeowner will see once you publish." and a list of every milestone not hidden — name, "start → end", and a yellow "{n}%" tag on payment ones (or "No milestones are visible to the client yet."). Publishing snapshots all of them. `WIZ:521-551`, `WIZ:186-198`.
- **E-231** The same wizard reopens from "Reconfigure homeowner view", and from the VO banner's "Rebalance" it opens directly on step 3. `GC:2355`, `GC:2213`, `GC:3668-3679`.

### 9.3 Later publishes: batch and single

- **E-232** "Publish to homeowner" batch dialog (`max-w-xl`): "{n} milestone(s) have unpublished changes." with "Select all" / "Deselect all"; a checklist (max 400px) where each row shows the name, a "FIRST PUBLISH" tag for never-published ones, or the differences — "Name: ~~old~~ → new", "Start date: …", "End date: …", "Status: …" with small icons; "Cancel" and "Publish {n}" ("Publishing…"). With nothing pending: "All caught up" / "The homeowner is seeing the latest milestone state." and "Close". `BATCH:82-153`.
- **E-233** A single milestone publishes from the drawer strip with no confirmation; toast "Published to homeowner" (or "Published {n} milestones to homeowner"). `GC:3407`, `GC:1508-1512`.

### 9.4 What publishing does

- **E-234** For each chosen milestone: stamp `publishedAt`, replace the snapshot, append a history entry describing the change (kept to the last 20). `GC:1425-1460`.
- **E-235** For each already-published milestone whose dates changed, post a homeowner progress update "Schedule updated: {name}" — "Previously {old start} → {old end}. Now {new start} → {new end}." — with structured old/new dates. `GC:1461-1481`.
- **E-236** Fire one notification event, `project.timeline_published` (addressed to the first linked homeowner who has an email, when there is one), carrying the count, up to three milestone names and a summary: "First publish — homeowner can now see the timeline", "{n} schedule change(s)" or "Timeline updated". Failure is ignored. `GC:1487-1507`, `src/app/api/projects/[id]/notify-publish/route.ts:59-97`.
- **E-237** Status changes publish themselves (E-196); name and date edits wait for a publish. `src/lib/projects/milestone-status.ts:17-44`.

### 9.5 What the homeowner sees (pointer)

- **E-238** A "Timeline" card: filter chips with counts — "All", "Payments", "In progress", "Blocked", "Upcoming" (empty groups hidden; "Nothing matches this filter yet.") — and a vertical rail of events in date order: published milestones, sent invoices, and "Project Created". Each milestone row has a coloured dot and icon, the name, a relative time ("3 days ago", "upcoming"), a sub-label ("Completed", "In progress", "Pending approval", "Paused", "Payment received", "Partially paid"), a pill "Payment S$6,000 (10%)" (green with "· Paid" once its invoice is paid), and for a blocked one a box "Paused — {details}" with "Resuming around 12 Mar" / "Expected to resume 12 Mar — checking back in soon" / "Resume date passed (9 days ago)". `src/components/homeowner/progress-timeline.tsx:170-461`.
- **E-239** Exactly one row is marked "Active" (a purple pill, a chevron pointer and a tinted background): the in-progress milestone with the earliest start. `src/components/homeowner/progress-timeline.tsx:288-293`, `src/lib/projects/milestone-status.ts:96-108`.
- **E-240** "Preview homeowner view" in the cog opens a dialog (`max-w-2xl`, max 80vh) titled "Homeowner preview" / "This is what your homeowner sees right now." rendering that same timeline from the snapshots, with "Open as homeowner"; empty text "Your homeowner can't see anything yet — no milestones are published." / "Publish at least one milestone from the timeline to populate this preview." The preview shows milestones only (no invoices or "Project Created"). `homeowner-preview-dialog.tsx:59-120`.

### 9.6 Rules and problems

- **E-241** Publish buttons are disabled when the payment percentages are over or under 100 (within 0.01); a timeline with no payment milestones at all is not blocked by this gate. `src/lib/milestone-payments.ts:36-80`, `GC:1383-1385`.
- **E-242** There is no way to unpublish a milestone. The only ways to remove one from the homeowner's view are the eye toggle (takes effect at once) or deleting it. The "unpublish gate" in the library is for progress updates: an approved update can be pulled back to draft only if no homeowner has opened the portal since it was posted ("The homeowner has already viewed the portal since this was posted — it can't be unpublished."). `src/lib/projects/unpublish-gate.ts:8-15`, `src/app/api/projects/[id]/progress-updates/[updateId]/unpublish/route.ts:56-76`.
- **E-243** **Problem [inferred].** A timeline without payment milestones cannot be first-published: every first-publish entry point opens the wizard, whose step 1 requires a payment milestone and step 3 requires a total of exactly 100. The only escape is the Reschedule dialog's "Publish now" (E-174a). `GC:2144`, `GC:3407`, `WIZ:73-79`.
- **E-244** **Problem.** Three meanings of "visible". The eye icon shows "hidden" for a non-payment milestone that has never been toggled (while its tooltip reads "Visible to client"); the wizard tags 0% rows "Internal"; but the publish count, the wizard's final list, the batch dialog and the homeowner API all treat any milestone not explicitly set to hidden as visible. A studio can publish "internal" milestones without meaning to. `GC:2615-2626`, `WIZ:379-385`, `GC:2135`, `WIZ:189`, `BATCH:36`, `src/app/api/homeowner/projects/[id]/route.ts:258`, `src/types/app.ts:1447-1448`.
- **E-245** **Problem.** Block details, the expected resume date and payment percentages are read live by the homeowner API, not from the snapshot — an internal note typed into either block editor shows on the portal at once, with no publish. `src/app/api/homeowner/projects/[id]/route.ts:263-268`, `GC:2511-2512`.
- **E-246** **Problem [inferred].** The batch dialog computes its ticked set once, when the Gantt mounts; milestones that become pending later are not pre-ticked, and ids ticked earlier can be re-published although they no longer appear in the list. `BATCH:55`, `GC:3657-3662`.
- **E-247** **Problem.** The wizard edits payment percentages directly, ignoring both the frozen-schedule rule and the invoice lock that the Payment Structure dialog enforces; "Clear all" zeroes every percentage in one press. `WIZ:101-105`, `WIZ:181-183`, `GC:3673`.
- **E-248** **Problem.** The wizard's "exactly 100" test is a strict equality on a floating sum, while the gate elsewhere allows 0.01 of drift. `WIZ:71`, `src/lib/milestone-payments.ts:22`, `src/lib/milestone-payments.ts:54`.
- **E-249** **Problem.** Regenerating the timeline gives every milestone a new id and no snapshot, so a published timeline vanishes from the portal until published again; nothing warns about this. `GC:1668`, `GC:1695`, `GC:1719`, `GC:3700`.

---

## 10. Payments tied to milestones

### 10.1 What it is

- **E-250** A milestone is a "payment milestone" when it carries a payment %. Those percentages are the project's billing schedule: they drive the invoice created at completion, the homeowner's payment pills, the progress %, and a payment and commission overlay under the chart. `src/types/app.ts:1396-1400`, `GC:873-875`, `GC:2925`.

### 10.2 Layout and UI elements (the overlay under the chart)

- **E-251** The overlay shows whenever any milestone has a payment % and stacks (`space-y-3`): a "commission not configured" strip, variation-order chips, a four-tile summary, and a ledger table. `GC:2925-3137`.
- **E-252** Strip (yellow, when commission is on for the project but no rate is set): "Commission rate is **not configured** for this project. Payment flags are shown but commission amounts cannot be calculated." with a button "Set Up Rules" (cog icon) that navigates to `/finance/commissions`. `GC:2928-2945`.
- **E-253** VO chips, behind a 2px primary rule: "{n} Approved VO(s): +S$1,200 (+3d)" (primary, flag icon), "{n} Pending VO(s): +S$800" (yellow, triangle), "{n} Submitted VO(s): −S$300" (grey, file icon). `GC:2948-2983`.
- **E-254** Summary tiles: "Contract Total" (with "+VO: S$…" beneath); "Expected Payments" (with "Rcvd: S$…" in green and "Due: S$…" in yellow); "Expected Commission" (green tile, "Accrued: S$…" and the rule summary, e.g. "5.0% of revenue") or "Commission — Not configured"; "Payment Progress" (an 8px purple bar and %, plus a 6px green bar and % for commission accrued). `GC:2986-3062`.
- **E-255** Ledger table (11px): columns "Payment Milestone", "%", "Payment", "Commission" (when a rate exists), "Status"; zebra rows; status "Paid" (green pill, check), "Partial" (yellow pill, clock), "Invoiced" (blue pill, file) or plain grey "Pending"; a "Total" footer with the summed %, amounts and "{n}/{m} paid". `GC:3065-3135`.

### 10.3 Rules

- **E-256** A row's amount = contract total × %; commission = that × rate. Payment status comes from the milestone's invoices — paid in full → "Paid", part-paid → "Partial", issued (not draft) → "Invoiced", else "Pending"; with no invoice at all, a completed milestone counts as "Paid". `GC:886-911`.
- **E-257** "Rcvd" and "Payment Progress" use the project's actual cash collected when the page supplies it; commission "Accrued" counts a milestone when its status is completed. `GC:913-940`, `PAGE:2815`.
- **E-258** The contract total is the financial summary's contract value (signed quote plus approved client variation orders), falling back to the project budget. `PAGE:2793-2805`.
- **E-259** **Freeze.** Once any milestone has a payment %, the schedule is "frozen" for everyone: the create dialog's Payment trigger is disabled and the Payment Structure dialog is read-only until a user with the `payment_schedule.override` permission presses Override. `PAGE:816-826`, `GC:3534-3536`, `GC:3730`.
- **E-260** **Invoice lock.** A milestone with an invoice cannot have its % edited from the drawer (E-137 row 7). `MENU:209-219`.
- **E-261** **Sync to the quote.** Every timeline save mirrors the payment-bearing milestones (id, name, %, or fixed amount) into the linked lead's contract quote `payment_schedule`, so the quote editor, quote PDF and VO drafts follow the timeline. It never touches variation quotes or quotes that are sent for signature or signed, never wipes a schedule when the timeline has no payment milestones, and skips writes that change nothing. `src/lib/projects/sync-timeline-to-quote-schedule.ts:59-124`, `src/app/api/projects/records/[id]/route.ts:131-140`.

### 10.4 Problems

- **E-262** **Problem.** The freeze has several ways round it that need no permission: the publish wizard's percentage boxes and presets, deleting a payment milestone, regenerating the timeline, and the phone's create dialog (which is not told the schedule is frozen). `WIZ:367-376`, `GC:1292-1296`, `GC:2386-2415`, `PAGE:2712-2741`.
- **E-263** **Problem [inferred].** The VO banner's "Rebalance" opens wizard step 3, which only checks that percentages total 100 — which they already do, since percentages scale with the contract. The step reads "Looks good — sums to 100%." and there is nothing to rebalance there. `GC:2204-2218`, `WIZ:466-491`.
- **E-264** **Problem.** A milestone flagged for commission but with 0% appears in the ledger as a S$0 row, and "{n}/{m} paid" counts it. `GC:873-875`, `GC:3128`.

---

## 11. Generating a timeline, and templates

### 11.1 Entry points

- **E-265** A timeline can come from: project creation (seeded server-side from the quote's payment schedule — other readers), the empty-state choices (E-22), or the cog's "Generate timeline" list (E-40) at any later time. `GC:1987-2061`, `GC:2383-2424`.

### 11.2 The generators (rules)

- **E-266** **From work categories.** Sends the quote's line items, project type and name to `POST /api/projects/plan`; gets back phases laid end to end (each starting the day after the last) from the current first milestone's start date, or a week from now; each is tagged as a work phase and, where unambiguous, with its quote category. Toast "Timeline generated from work categories"; failure "Failed to generate plan from the quote." `GC:1624-1676`, `src/app/api/projects/plan/route.ts:334-377`, `src/lib/projects/timeline-generators.ts:272-302`.
- **E-267** The plan route asks Gemini 2.5 Flash (60 s limit) for phases with durations and colours in the order Hacking → Masonry/Tiling → Electrical/Plumbing → Carpentry → Painting → Cleaning/Handover. If the AI fails or returns nothing it builds one milestone per quote category (length = the larger of a minimum and items × a factor, e.g. Carpentry ≥ 7 days) and appends "Cleaning & Handover" (3 days); with no API key it returns a canned seven-phase plan. `src/app/api/projects/plan/route.ts:14`, `src/app/api/projects/plan/route.ts:204-221`, `src/app/api/projects/plan/route.ts:384-467`, `src/app/api/projects/plan/route.ts:241-256`.
- **E-268** **Hybrid — work + payments.** The work phases above, stripped of any money, plus one single-day amber (`#F19E2B`) marker per payment stage, spread evenly from the first start to the last end (first stage on day one, last at handover), merged by date with a payment marker ahead of a phase that shares its day. Toast "Timeline generated — work phases + payment milestones". `GC:1680-1703`, `src/lib/projects/timeline-generators.ts:197-259`.
- **E-269** **From payment schedule.** One amber bar per payment stage, tiled evenly across the current timeline's span (56 days when there is none) from the first milestone's start or today; each flagged as a commission trigger. No AI call. Toast "Timeline generated from payment schedule". `GC:1707-1722`, `src/lib/projects/timeline-generators.ts:145-177`.
- **E-270** Which schedule: the payment milestones already on the timeline, else the quote's agreed schedule (signed quote, else primary, else first; never a variation), else the studio's default, else the platform default — Deposit 10% ("Upon signing"), Commencement 30% ("Works commence"), Mid-Project 30% ("50% completion"), Completion 30% ("Handover"). `src/lib/projects/timeline-generators.ts:30-35`, `src/lib/projects/timeline-generators.ts:126-136`, `GC:410-419`.
- **E-271** **Upload quote.** Accepts `.pdf .jpg .jpeg .png .csv .xlsx .xls`, sends it to `/api/quotes/parse`, saves the items to the project and generates from work categories. Toasts: "Parsed {n} line items — generating plan...", "No line items found in the uploaded quote", "Failed to parse quote file". `GC:1726-1758`, `GC:2431`.
- **E-272** Before the three quote/schedule generators replace an edited timeline the browser's own `confirm()` asks: "Regenerate will replace every milestone on this timeline with a fresh set. Manual date and status edits will be lost.\n\nContinue?" — "edited" meaning any milestone that has left not-started or has dates, which is always true once milestones exist. `GC:1606-1618`.

### 11.3 Templates

- **E-273** **Pick (cog › "From project template").** Dialog "Reset to a template" (`max-w-xl`): "Replaces the current timeline. Pick from your saved templates or built-in defaults."; two groups, "YOUR SAVED TEMPLATES" then "BUILT-IN", of two-column cards (bookmark, name, a "Built-in" tag, description, "{n} milestones · {d}d · {n} payments"); "Loading templates…" / "No templates available yet."; "Cancel" and "Reset timeline" (`Sparkles`). Applying anchors the template at the current first milestone's start, resets every status, and toasts `Reset timeline to "{name}"`. `milestone-template-picker.tsx:59-161`, `GC:3694-3710`.
- **E-274** Built-in templates: one per project type, named "{type} — Standard" (Renovation-Full Home, New-Full Home, Renovation-Partial, New-Partial, Commercial, Others), each with a payment split — e.g. full-home renovation 10 / 25 / 15 / 25 / 10 / 10 / 5. `src/data/system-milestone-templates.ts:25-87`.
- **E-275** **Save (cog › "Save as template").** Dialog "Save as template" (`Bookmark`): "Template name *" (pre-filled "{project type} — Standard", placeholder `e.g. "HDB 4R — Standard"`), "Description (optional)" ("When should you use this template?"), a "Captured" box — "• {n} milestones with order, dates, durations", "• Dependencies, descriptions, colors", "{n} payment trigger(s) + commission flags", "• Total span: {n} days", and "Per-project state (tasks, comments, blocked status, publish history) is not saved."; hints "Add a name to save." / "Add at least one milestone first."; "Cancel" and "Save template" ("Saving…"); toast `Template "{name}" saved`. `save-milestone-template-dialog.tsx:74-145`.
- **E-276** A template stores, per milestone: name, start and end as day offsets from the earliest start, description, colour, payment %, commission flag and dependencies by position. It does not store visibility, status, tasks or fixed amounts. `src/lib/milestone-templates.ts:41-82`.
- **E-277** **Manage (cog › "Manage templates").** A settings page "Milestone Templates" — "Reusable timeline shapes you can apply when creating new projects." — listing saved templates with rename and delete ("Delete this template?" / ""{name}" will be permanently removed. Projects already created from this template won't be affected." / "Delete template"); empty state "No templates yet" with instructions to use "Save as template". Built-in ones cannot be renamed or deleted ("Built-in templates can't be renamed or edited. Save a copy instead."). `src/app/(main)/accounts/milestone-templates/page.tsx:30-99`, `src/lib/queries/milestone-templates.ts:59-64`.

### 11.4 Problems

- **E-278** **Problem.** Three template families that do not meet: the empty state offers five property-type templates (no payments, not editable); the cog offers saved + built-in project-type templates; and a third, per-studio "timeline templates" set is fetched on every Gantt load but feeds only an unused computation. A studio's saved template cannot be chosen from the empty state. `GC:2036`, `GC:2410`, `GC:397`, `GC:422-449`.
- **E-279** **Problem.** Regenerating is the most destructive action on the page and is guarded only by a native confirm (or, for templates, by the picker's own button). It discards statuses, dependencies, visibility and publish state, and — because ids change — detaches the milestone's tasks, invoices and homeowner approvals. Nothing checks for completed, invoiced or published milestones. `GC:1668`, `GC:1695`, `GC:1719`, `GC:3697-3705`.
- **E-280** **Problem.** When the AI fails, the fallback plan arrives with the same success toast; the user cannot tell an AI plan from the mechanical one. `src/app/api/projects/plan/route.ts:286-289`, `src/app/api/projects/plan/route.ts:321-327`, `GC:1672`.
- **E-281** **Problem.** The AI's tips, per-phase tips and risk warnings are still requested, returned and saved to `ai_plan_metadata`, but nothing displays them. `src/app/api/projects/plan/route.ts:311-320`, `GC:616`, `GC:1669`, `PAGE:2918-2925`.

---

## 12. Things the page does on its own

- **E-282** **At-risk task.** While an owner has the page open, each at-risk milestone gets a General task for the owner, due today: "At-risk milestone: {name} ({project})". It is skipped while an open task for that milestone exists. `GC:769-816`.
- **E-283** **Upcoming-milestone task.** When the studio's proactive alerts are on, each incomplete milestone due within the lead time (default 7 days) gets a "ProgressReview" task for the owner: "Review upcoming milestone: {name} (due {date}) — {project}". `GC:818-869`.
- **E-284** **Dependency help.** The red violation banner's "Why?" opens the AI assistant with the violations pre-typed (E-37). `GC:2251-2269`.
- **E-285** **Problem.** Both task creators run in the browser as a side effect of viewing the page (the code notes it "should be a server-side cron job"), so nothing is raised for a project nobody opens; and since the check ignores completed tasks, finishing an "At-risk" task while the milestone is still late raises a new one on the next visit [inferred]. `GC:769-771`, `GC:791-794`.

---

## 13. The phone and tablet list (< 1024px)

### 13.1 What it is

- **E-286** Below `lg` the Gantt is replaced by `MobileMilestoneList`: a card per milestone with three actions — complete, tick tasks, re-date — plus adding a milestone. It reads the saved timeline directly and writes the whole array back on each action. `PAGE:2626-2758`, `MOB:59-262`.

### 13.2 Layout

- **E-287** A right-aligned outline "Add milestone" button (36px) above a grid of cards — one column on phones, two from `sm`, `gap-3`. Each card is `p-4` with a 2px left border: red when overdue, yellow when blocked, blue when in progress. `MOB:107-131`.
- **E-288** Card: an 18px status icon; the name (14px medium, truncated) with a green pill "$ {n}%" on payment milestones; a date line; "Tasks: {done}/{total} done"; a 32px re-date button at the right; an optional yellow "Blocked" strip; then a row of 36px buttons. `MOB:134-212`.

### 13.3 UI elements

- **E-289** Status icons: completed = green check-circle; in progress = blue clock; not started = grey circle; pending approval = yellow clock; blocked = yellow `Ban`; overdue overrides all with a red triangle. `MOB:37-43`, `MOB:136-138`.
- **E-290** Date line: "Completed 12 Mar" (the planned end date), "5 Jan — 12 Jan", "Starts 5 Jan", "Due 12 Jan", or italic "No dates set"; followed by red "· {n}d overdue" when late. Dates are fixed to the `en-SG` format. `MOB:54-57`, `MOB:75-83`, `MOB:149-156`.
- **E-291** Re-date button (`CalendarClock`, hidden on completed milestones): labelled "Set dates" or "Reschedule milestone" for assistive tech. `MOB:165-174`.
- **E-292** Blocked strip: "Blocked: Vendor delay" (the label, unlike the desktop drawer's raw key) and the details. `MOB:178-187`.
- **E-293** Buttons: "View Tasks" / "Hide Tasks" (outline, chevron) when the milestone has tasks; "Mark Done" (check-circle) on not-started and in-progress milestones — solid green only on the first such milestone, outline on the rest. `MOB:67`, `MOB:190-212`.
- **E-294** Expanded tasks: a checklist (rows at least 36px) with struck-through done items. `MOB:215-233`.

### 13.4 Interactions

- **E-295** "Mark Done" on a non-payment milestone completes it at once with the toast ""{name}" marked complete". On a payment milestone it first asks: "Complete "{name}"?" / "This will notify the homeowner and create an invoice for {n}% of the contract value." with "Cancel" and "Complete & invoice". `MOB:69-73`, `MOB:241-259`, `PAGE:2654-2657`.
- **E-296** Completing writes the status, sends the homeowner bell, and for a payment milestone creates the draft invoice; refusals: "Financial actions are restricted while the project is in Draft.", "Milestone "{name}" completed but no contract value set.", "Invoice already exists for "{name}"", "Failed to auto-generate invoice". `PAGE:2632-2693`.
- **E-297** "Add milestone" opens the same "New milestone" dialog as desktop and appends the result with the toast "Milestone "{name}" added"; the re-date button opens the same Reschedule dialog and toasts ""{name}" rescheduled". `PAGE:2712-2757`.

### 13.5 States

- **E-298** Read-only (Closed) or locked: no Add, no re-date, no Mark Done, task boxes disabled. `MOB:93`, `MOB:107`, `MOB:165`, `MOB:202`, `MOB:224`.

### 13.6 Problems

- **E-299** **Problem.** The phone cannot start a milestone, block or unblock, edit dependencies, payment, visibility, name, colour or description, delete, reorder, publish, see the homeowner view, see approvals or finalize. `MOB:16-35`.
- **E-300** **Problem.** "Mark Done" jumps straight from not-started to completed, skips the completion dialog (no invoice preview or edit, no send, no update), ignores the owner-approval rule, and does not copy the new status into the published snapshot — yet it tells the homeowner "Milestone complete" [inferred]. `MOB:122`, `PAGE:2641-2651`, `src/lib/projects/milestone-status.ts:27-44`.
- **E-301** **Problem.** After "Complete & invoice" succeeds the page stores the invoice details in a state that nothing renders — the user gets no confirmation and no link to the draft invoice. `PAGE:2682-2688`, `PAGE:836`, `PAGE:4695`.
- **E-302** **Problem.** The Reschedule dialog's second step still asks "Publish to homeowner?", but the phone's save handler ignores both the reason and the choice — "Publish now" saves the dates and publishes nothing. `PAGE:2747-2755`, `milestone-reschedule-dialog.tsx:155-160`.
- **E-303** **Problem.** The cards list the deprecated JSON tasks stored inside the milestone, while the desktop editor writes tasks to the `tasks` table; tasks made on desktop do not appear here, and ticks made here do not reach the Tasks tab. `MOB:119-120`, `PAGE:2694-2704`, `GC:3296`, `src/types/app.ts:1351-1362`.
- **E-304** **Problem.** The card keys its blocked look off the block record, not the status: a block set from the desktop name popover (status unchanged) shows the yellow strip and border while "Mark Done" stays on offer, and a "blocked" status with no record gets the icon but no strip. `MOB:129`, `MOB:137`, `MOB:178`, `MOB:122`.

---

## 14. Data and APIs

### 14.1 What is read and written

- **E-305** `projects.timeline` (JSONB array) holds every milestone and everything about it (E-191); `projects.timeline_status` is a legacy value still written as "draft"; `projects.ai_plan_metadata` holds the unused AI tips. `src/app/api/projects/records/[id]/route.ts:88-94`, `PAGE:2918-2925`.
- **E-306** `project_milestones` (an older table) is used only as a sparse store of the homeowner's response — `homeowner_approval_status`, `_comment`, `_at` — keyed by the timeline milestone's id. `src/app/api/projects/records/[id]/milestone-approvals/route.ts:33-37`, `src/app/api/homeowner/projects/[id]/milestones/[milestoneId]/approve/route.ts:57-64`.
- **E-307** `tasks.linked_milestone_id` ties studio tasks to a milestone; `project_invoices.milestone_id` / `milestone_key` tie invoices to one; `progress_updates` carries "Schedule updated" and "Milestone completed" posts; `quotes.payment_schedule` receives the mirrored schedule; `homeowner_notifications` receives the completion bell. `GC:3609`, `src/app/api/projects/[id]/invoices/milestone/route.ts:27-31`, `GC:1467-1479`, `src/lib/homeowner-binding.ts:212-228`.

### 14.2 Routes

- **E-308** `PATCH /api/projects/records/[id]` — the autosave path: accepts a whitelisted set of project columns including `timeline`, writes it scoped to the session's studio, then runs the quote sync. `src/app/api/projects/records/[id]/route.ts:96-147`.
- **E-309** `PATCH /api/projects/records/[id]/timeline` — the same whole-array write, used by comments, finalize and the revision note. `src/app/api/projects/records/[id]/timeline/route.ts:22-63`.
- **E-310** `GET` / `PATCH /api/projects/records/[id]/milestone-approvals` — read every homeowner response for the project; clear one. `src/app/api/projects/records/[id]/milestone-approvals/route.ts:22-95`.
- **E-311** `POST /api/projects/[id]/notify-publish` — the publish notification (E-236). `POST /api/projects/plan` and `POST /api/projects/plan/tasks` — the AI plan and task suggestions. `GET/POST /api/studio/milestone-templates` (+ `/[id]`) — saved templates. `POST /api/projects/[id]/invoices/milestone` — the completion invoice (finance reader). `src/app/api/projects/[id]/notify-publish/route.ts:25-104`, `src/app/api/projects/plan/route.ts:226`, `src/app/api/projects/plan/tasks/route.ts:294`, `src/lib/queries/milestone-templates.ts:20-66`.
- **E-312** Homeowner side: `GET /api/homeowner/projects/[id]` (filters and projects milestones) and `POST /api/homeowner/projects/[id]/milestones/[milestoneId]/approve` (allowed only when the shown status is pending-approval or completed; otherwise "Cannot respond to milestone with status "…""). `src/app/api/homeowner/projects/[id]/route.ts:255-281`, `src/app/api/homeowner/projects/[id]/milestones/[milestoneId]/approve/route.ts:92-97`.

### 14.3 How saving works

- **E-313** The Gantt copies the project's milestones into local state. Any change starts a 1.5 s timer; when it fires the whole array goes to the page, which calls the project update. A reference to the last saved JSON stops the saved value from bouncing back over newer local edits; a genuinely different server value replaces local state. `GC:475-532`, `PAGE:2912-2917`.
- **E-314** Autosave is off in read-only and locked modes and on first render. `GC:504-509`.

### 14.4 Problems

- **E-315** **Problem.** The server applies no milestone rule at all: no lock or stage check, no role check beyond "a signed-in member of this studio", no validation of dates, percentages, statuses, dependencies or the single-active rule. Every guard in this document is in the browser. `src/app/api/projects/records/[id]/route.ts:107-124`, `src/app/api/projects/records/[id]/timeline/route.ts:33-43`.
- **E-316** **Problem.** Whole-array writes with no version check: two people editing the same timeline overwrite each other, and the comment, finalize and revision hooks each rebuild the array from the cached server copy, racing the Gantt's 1.5 s buffer [inferred]. `src/lib/queries/projects.ts:406-427`, `src/lib/queries/projects.ts:608-614`.
- **E-317** **Problem.** The two AI routes read the session only to pick a region and do not refuse an unauthenticated call themselves. `src/app/api/projects/plan/route.ts:229-233`, `src/app/api/projects/plan/tasks/route.ts:296-300`.
- **E-318** **Problem.** Milestone ids come in several shapes — `ms-new-{time}`, `ms-ai-{i}-{time}`, `pay-{seed}-{i}`, `ms-tpl-{time}-{i}`, `ms-{template}-{i}-{time}`, and real UUIDs from project creation — while `project_milestones.id`, `tasks.linked_milestone_id` and `project_invoices.milestone_id` are UUID columns in the migrations. See "Uncertain" for what this may break. `GC:1265`, `GC:463`, `src/app/api/projects/plan/route.ts:365`, `src/lib/projects/timeline-generators.ts:158`, `src/lib/milestone-templates.ts:97-100`, `supabase/migrations/20240101000006_projects.sql:60-62`, `supabase/migrations/20260509000004_tasks_linked_milestone.sql:7-8`.

---

## 15. Performance

- **E-319** The Gantt's code is split out and loaded only in the browser (`next/dynamic`, `ssr: false`) with a loader placeholder. `PAGE:75-78`.
- **E-320** Derived values are memoised (`useMemo`): the date range, week markers, today's offset, at-risk list, critical path, dependency violations, payment totals, payout schedule, per-milestone invoice maps, KPI figures. `GC:560`, `GC:588`, `GC:659`, `GC:763`, `GC:880`, `GC:978`, `GC:1016`, `GC:1026`, `GC:1383`, `GC:1388`, `GC:1895`.
- **E-321** There is no virtualisation and no memoised row or bar component: one 3,787-line component renders every row, and every pointer-move during a drag sets state and re-renders all of it. `GC:1071-1079`, `GC:2588`, `GC:2809`.
- **E-322** Each row draws one grid-line element per week, so the grid costs rows × weeks elements; the arrows' position map is rebuilt on every render, which defeats the arrow layer's own memo [inferred]. `GC:2832-2836`, `GC:2782-2798`, `dependency-arrows.tsx:32-59`.
- **E-323** The whole timeline is serialised to JSON on every change (for the autosave comparison) and again whenever the server copy arrives. `GC:488`, `GC:511`.
- **E-324** Selecting a milestone triggers a compliance-checklist fetch whose result is never shown. `GC:1846-1874`.

---

## 16. Not there at all

- **E-325** No print, PDF, image or spreadsheet export of the timeline; the only file inputs are for uploading a quote. `GC:1971`, `GC:2431`.
- **E-326** No keyboard operation of the chart, no focus order through bars, no ARIA roles on rows or bars; the only labelled controls are the full-screen toggle and the banner's Dismiss. `GC:2223`, `GC:2326`.
- **E-327** No zoom, no day or month scale, no "jump to today", no filter, search, sort or grouping of milestones, no phases or sub-milestones, no multi-select or bulk edit, no duplicate, no undo or redo, no baseline-versus-actual, no working calendar, no assignee per milestone. `GC:538`, `GC:654-655`, `src/types/app.ts:1376-1479`.
- **E-328** No loading skeleton of the chart's own shape and no error state: a failed load of approvals, invoices or templates just leaves those parts empty. `PAGE:75-78`, `GC:545-551`.

---

## 17. Dead code, and where the docs disagree with the code

### 17.1 Built but unreachable

- **E-329** Zoom controls (Day / Week / Month / Quarter) — never imported. `gantt/gantt-zoom-controls.tsx:28`.
- **E-330** A second dependency-arrow renderer and critical-path calculator that understand lag days and float — never imported; the live chart uses the simpler pair in `dependency-arrows.tsx`. `gantt/dependency-arrows.tsx:27`, `gantt/critical-path.ts:12`, `GC:34`.
- **E-331** Link-by-drag between bars — state and handlers exist ("Dependency created" / "Dependency removed" toasts) with nothing wired to them. `GC:657-691`.
- **E-332** The milestone comment thread — add and reply handlers with no UI. `GC:536-537`, `GC:1515-1557`.
- **E-333** The extension request ("Extension request: {name} to {date} — "{reason}"", "Extension request submitted for owner approval") — handler and state with no UI; the studio settings that feed it are still passed in. `GC:715-718`, `GC:1559-1602`, `GC:1876-1887`, `GC:316-321`.
- **E-334** "Generate tasks" for a whole milestone, and the owner-approval task it used to raise ("Approve tasks for: {milestone} ({project})") — handler only. `GC:1762-1840`, `PAGE:2881-2911`.
- **E-335** The reset-to-project-type template computation, the per-studio timeline-template fetch behind it, the compliance fetch, the `timelineStatus` prop, the `.gantt-today-marker` and `gantt-bar-blocked` class names. `GC:397`, `GC:422-449`, `GC:1846-1874`, `GC:246-248`, `CSS:1923-1925`, `GC:2846`.

### 17.2 Docs versus code

- **E-336** `docs/rules/projects.md` lists a "Selected milestone panel: Date inputs, status dropdown, comments, "Mark Complete"", a "Task checklist … "Generate Tasks" AI button" and an "AI Tips panel" — none exist; the drawer is the action menu. `docs/rules/projects.md:63-67`, `MENU:97-101`.
- **E-337** It says the settings menu has "Reset to Template, Upload/Regenerate from Quote" — the menu now has four named generators. `docs/rules/projects.md:64`, `GC:2383-2415`.
- **E-338** It gives status colours "not-started (slate), in-progress (blue), completed (green), pending-approval (amber), blocked (yellow)" — the code has in-progress as primary purple, no blocked entry, and bars coloured by milestone, not status. `docs/rules/projects.md:69`, `GC:229-234`.
- **E-339** It says dependencies are the structured `dependencies: { fromMilestoneId, lagDays }` shape "plus" the id list, with critical path, cascade and arrows "under `src/components/projects/gantt/`" — the live chart uses only the id list and the top-level `dependency-arrows.tsx`. `docs/rules/projects.md:72`, `GC:34`, `GC:121`.
- **E-340** It says the lock gates "all 5 mutation choke-points (handleMouseDown, …)" — the handler is now pointer-based (`handleDragPointerDown`). It also lists a "Snags sub-tab", "Approvals" and "Audio milestone completion" under Management that this slice does not contain. `docs/rules/projects.md:74`, `docs/rules/projects.md:27`, `docs/rules/projects.md:40`, `GC:1053`, `PAGE:2613-2618`.
- **E-341** `docs/features/project-planner/spec.md` describes AI-generated tasks inside milestones, a task checklist that "auto-completes milestone when all tasks are done", AI tips, a "Risk Radar" panel, a "Generate from Quote" button and auto-generation at project creation; its "Phase 2 — To Build" list still has "Milestone reordering" (built). The route now tells the AI "Do NOT include tasks", and the tips and radar are gone from the screen. `docs/features/project-planner/spec.md:5-10`, `docs/features/project-planner/spec.md:24-51`, `docs/features/project-planner/spec.md:128-135`, `src/app/api/projects/plan/route.ts:205`.
- **E-342** The milestone type's comment on `clientVisible` says "Default: true for payment milestones, false for others"; the publish and homeowner code default everything to visible. `src/types/app.ts:1447-1448`, `src/app/api/homeowner/projects/[id]/route.ts:258`.

---

## Uncertain / not verified

- Nothing here was run or seen on screen; every layout size is read from Tailwind classes and constants, and every "[inferred]" is a reading of code paths, not an observation.
- **Empty-state "Start from scratch" (E-27).** The create dialog is mounted only in the non-empty branch as far as I can read the JSX nesting (`GC:2095-2097`, `GC:3722-3733`); worth one click on :3001 to confirm.
- **Name press opening the block popover and the drawer together, and double-click rename being unreachable (E-76, E-119).** Follows from Radix's trigger behaviour and the drawer's backdrop; not observed.
- **Milestone id formats versus UUID columns (E-318).** By the migrations in this repo, `project_milestones.id` and `tasks.linked_milestone_id` are UUIDs (the latter with a foreign key to `project_milestones`), and `project_invoices.milestone_id` is a UUID with the raw id kept in `milestone_key`. If the live database matches: (a) the homeowner's Approve / Request Revision would fail for milestones created inside the Gantt (non-UUID ids); (b) saving tasks from the milestone Tasks editor would fail or lose the link; (c) for non-UUID milestones the Gantt — which matches invoices on `milestoneId` — would not see the invoice, so the invoice lock, the completion checklist's invoice row, "Related files", variance icons and the ledger's "Invoiced / Partial / Paid" would not engage. I could not check the live schema; production may have drifted from the migrations.
- **Autosave guard and JSON key order (E-313).** The "skip our own echo" check compares JSON strings; Postgres JSONB does not preserve key order, so the echo may never match and local state may be replaced by the server copy after each save. Harmless unless the user edits during the round trip. Not verified.
- **Autosave failure (E-51).** `mutate` is fire-and-forget, so I believe "Save failed — try again" cannot appear; not observed.
- **Reschedule + "Publish now" not posting the "Schedule updated" update (E-174d)** and **the comment/autosave race (E-174c, E-316)** are timing arguments from the code.
- **Batch dialog's stale selection (E-246)** depends on the dialog staying mounted between opens, which is how it is written (`GC:3657-3662`).
- **Critical path with no dependencies (E-114)** and **completed stripes being overridden (E-112)** are worked out from the algorithm and CSS precedence.
- **Day-count differences (E-204)** and **the UTC date drift (E-123)** are arithmetic readings; Singapore (UTC+8) hides most of the drift.
- **At-risk tasks repeating (E-285)** assumes the owner completes the task while the milestone stays late.
- Whether `/api/projects/plan*` is protected by middleware (E-317) was not checked; the handlers themselves do not return 401.
- I did not read `post-update-dialog.tsx`, `variance-resolution-dialog.tsx`, `InvoiceQuickView`, `ExternalAssigneeDialog`, `TaskImagesField` or the invoice route beyond its header — they belong to other readers; they are named here only as destinations.
