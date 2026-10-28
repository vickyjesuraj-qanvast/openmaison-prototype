# Package K-F — the frame, tab groups, phone chrome, Designs: outcome (2026-10-09)

Her "build everything" (S-03 · S-04 shown · S-06 · S-02 the frame's side · S-14 · Q-01 · Q-02 · Q-04, and Design › Designs). Register rows staged
in `reg-K-F.md` (REG-K-F.1 … 10). `npx tsc --noEmit -p .` is clean for every file below (the errors left are other packages' work in progress:
the money branch's imports in `app/projects/[id]/[tab]/page.tsx` — K-M's expression —, `project-schedule.tsx`, `finance-frame.tsx`);
`npx eslint` clean on every file touched; `npm run design:lint` ✓ (nothing new).

## S-03 · Q-01 · Q-02 — fourteen tabs → seven groups (contract A)

- `lib/projects/tabs.ts` — `PROJECT_TAB_GROUPS` (overview · tasks · schedule · client · design · money · files, labels *Overview · Tasks · Schedule ·
  Client · Design · Money · Files & notes*, views as contract A), `groupOf(slug)` (unknown → the Overview's group), `UNCOUNTED_VIEWS` (`compliance`),
  types `ProjectTabGroup` · `ProjectView` · `ProjectTabGroupKey`; `PROJECT_TABS` keeps every slug + the new `designs` (after `floor-plan`).
- `components/projects/project-frame.tsx` — the strip draws the seven: a group's href = its first view the viewer may open (Money: `d.money`, or on
  its own address — G-37); `activeHref` = the current slug's group's href, so a view lights its group; badge = the sum of its views'
  `d.tabCounts` minus Compliance. Keys 1–7 come from the house `Tabs` (`data-kb-tabs`, `#n` tooltips).
- `components/projects/project-views.tsx` (new) — `ProjectViews({ slug, note? })`: house `Chips` (single) on `ChipRail`, label "View · n" when the
  view has a count (Compliance never), `router.push(href(view))` keeping `?from=` (from the context's `href`), the sibling views prefetched;
  `data-testid="project-views"` / `project-view-chips` / `project-view-note`. `project-views.module.css` — the title's place (flex 1), the rail
  hugging its chips, the grey note (hidden ≤767), and the switch stepping aside while the folded search is open at ≤1024.
- `components/projects/project-views-ghost.tsx` (new, server-safe) — `ProjectViewsGhost({ slug })`.
- The bodies take an optional `views?: ReactNode` replacing ONLY their title (the lead page passes nothing → unchanged):
  `project-updates.tsx` · `messages/project-messages.tsx` · `tickets/project-tickets.tsx` · `choices/project-choices.tsx` (title line only) ·
  `floor-plan/project-floor-plan.tsx` (with views the plans' chips show for one plan too — the name was the title; `openPlan` keeps `?from=`) ·
  `leads/tasks/lead-tasks.tsx` → `tasks-toolbar.tsx` · `leads/files/lead-files.tsx` → `files-toolbar.tsx` (inside a folder the crumbs stay) ·
  `leads/notes/lead-notes.tsx` → `notes-toolbar.tsx` · `leads/questionnaire/lead-questionnaire.tsx` · `leads/activity/lead-activity.tsx`.
  Compliance takes `grouped` (it draws its own switch with its note).
- `app/projects/[id]/[tab]/page.tsx` — every branch but money's passes `views={<ProjectViews slug=… />}`; NEW `designs` branch.

**Check:** Benjamin (P-2026-002) as Dane at 1440: the strip reads Overview · Tasks · Schedule · Client · Design · Money · Files & notes; press 4 →
Client lands on Updates with the chips *Updates · Messages · Tickets · Questionnaire* (Messages · 1); press a chip → its address, the strip stays on
Client; `/projects/<id>/questionnaire?from=/projects` keeps Back to Projects; Floor plan shows its plans as chips. As Germaine (Designer) Money
stays per F-17. 768 / 390: the strip scrolls (Overview · Tasks · Schedule · Client on the first screen), the chips scroll in their rail beside the
glyph tools; open the folded search → the chips step aside. The lead page's tabs (a lead without a project, e.g. Kevin Ng) look exactly as before.

## S-04 (shown) · S-06 — one count rule; Compliance a view of Tasks

- Strip badge = Σ views (Compliance excluded); chips carry their own. K-N computes `tabCounts` per view (contract B).
- `components/projects/compliance/project-compliance.tsx` — `grouped`: the Tasks switch in the title + the grey note `{kind} · {n} items to do this
  phase` (n = the project's phase's open items, the number its phase chip says) or `… · nothing to do this phase`; the no-checklist state keeps the
  switch. `compliance-ghost.tsx` takes `title`.
- `lib/leads/activity.ts` (the compliance / task lines only) — a `task_completed` / `task_reopened` event of a task carrying a compliance item, within
  5 s of that item's `project_compliance_*` event, is folded into the item's line; the derived "The task … was completed" line likewise (60 s). One
  line per tick. **Check:** Benjamin › Tasks › Compliance, Mark done on *HDB_WATER_TEST* → Files & notes › Activity shows ONE line ("… marked … done on
  the compliance checklist"); tick its starter task on All tasks instead → still one line; Undo → none.

## S-02 (the frame's side) — one door (contract B)

- `pressPrimary` → `runAction(d.primary, primaryRef)`: every `PrimaryRun` (start · schedule · share · update · handover · review · resume · invoice ·
  invite · assign · contract · value · dates:start · dates:end — the last six through the Getting started dialogs) and `href` (navigate, `?from=`
  appended when the address is this project's and has none).
- `components/projects/project-context.tsx` (new) — `ProjectContextProvider` wraps the centre (the Overview AND every tab's body):
  `{ projectId, origin, needs: d.needs, counts, viewer, money, href, run, openVisualizer, openPlanner }`; hooks `useProjectNeeds()` ·
  `useProjectCounts()` · `useProjectRun()` · `useProjectContext()`; `ProjectAction = { run?: PrimaryRun; target?; href? }` (a NeedAction fits).
- **Resume's Tell {client}** — after the Undo snackbar, a keyed one "Let {first} know on WhatsApp · Tell {first}" opens
  `waLink(phone, tellClientText('resume', …))` on the press (K-T's `lib/projects/tell-client.ts`). Facts from a new read-only action
  `app/projects/tell-actions.ts` `readClientTell(projectId)` (K-T's `clientTellFacts`; the lead's rule; url only while the client can open their page).
  **Check:** Aisha (P-2026-003, On hold) as Dane → Stage ▾ › Resume → two snackbars; Tell Aisha opens wa.me with "Hi Aisha, good news — …".

## S-14 · Q-04 — Create on a phone; the site bar

- `components/leads/detail/quick-links.tsx` — `QuickLinkItems` (a `DropdownLabel` "Create", one `DropdownItem` per link of the set, a divider),
  sharing the strip's handler (`fireLink`, `QuickLinksHandlers`); the strip itself unchanged.
- Project ⋮ (≤767, `useSheetLayout`): the Create group (seven) then the record rows; `ProjectMenuItems` is no longer passed `phone` (its AI
  Visualizer / 3-D Space Planner rows live in the group; the prop stays for any other host). Lead ⋮ (`app/leads/[id]/overview.tsx`, the kebab
  region + two named handlers `onQuickTask` · `onQuickOther` that the strip now presses too): the Create group (eight) then Edit · Invite to Portal ·
  Return Lead · Copy Link · Delete; its old phone-only AI Visualizer row is in the group.
- **Site bar** (`project-frame.tsx` + `project-frame.module.css` `.siteBar` composing `.dockFrame`, items composing the dock's): shown when
  `stage === 'in_progress' && !hold && d.mayChange`, drawn ≤767 only; `body:has(.siteBar)` sets `--app-mobile-dock-height` (FAB, snackbar,
  Schedule's Add milestone dock, the Notes composer ride above), `.centre` keeps room. Photos: a hidden `<input type="file" accept="image/*" capture
  multiple>` opened on the press → `stashSitePhotos(files)` (K-C) → `updates?compose=1&camera=1` (the coordinator's / K-C's iOS note). Done (K-N's `schedule.running`): one
  running milestone → `schedule?done=<id>`; several → PortalMenu sheet "Which one is done?" with "Mark {milestone} done"; none → snackbar why +
  Open Schedule. Note → `notes?new=note` (in place on Notes). Message → `messages?compose=1`. Test ids `project-site-bar` · `site-photos` ·
  `site-photos-input` · `site-done` · `site-note` · `site-message`.
- `project-updates.tsx` keeps `camera` in the address (the composer drops it once read); a `dropCamera` on close/save is a no-op safety.
  **Check (390 touch):** Benjamin as Dane → the bar under the page; ⋮ → Create group first; Photos → camera, then the composer with the photos;
  Done → Carpentry fabrication's Mark done sheet; Note → Notes' new note; Message → the composer focused; the FAB sits above the bar; on Schedule the
  Add milestone dock sits above the bar. Marcus (Setting up), Aisha (On hold), Shalini (Completed): no bar. Germaine on a project she isn't on: none.

## Design › Designs (new view)

- `lib/projects/designs.ts` (new, server-only) `fetchProjectDesigns(projectId)`: the lead's render share links not ended (`readShareLink`, the portal's
  rule) with favourites, sender, views; the project's layouts with their live share (opened, `rev > sharedRev` = changes not shared); renders filed in
  Files; `leadDesignId`. Who: the lead's rule.
- `components/projects/designs/project-designs.tsx` (+ `designs.module.css`, `designs-ghost.tsx`) — toolbar (switch · AI Visualizer · 3-D Space
  Planner, glyphs on a phone), cards Renders · 3D layouts · Saved to Files (house `Card`, thumb, the layouts dialog's row composed, `PhotoViewer`),
  first run = `EmptyState` with both doors (REG-735). Doors via the context (`openVisualizer` · `openPlanner`). Test ids `project-designs` ·
  `designs-renders` · `designs-share` · `designs-version` · `designs-layouts` · `designs-layout` · `designs-saved` · `designs-saved-render` ·
  `designs-empty` (+ `-visualizer` · `-planner`) · `designs-visualizer` · `designs-planner`. **Check:** Kevin Ng's project if it has one, else any
  project with a shared render; Benjamin → Design › Designs (first run or cards); 390.

## Ghosts (REG-708)

- `project-ghost.tsx` (header / strip region + the tab-body selector line): `GhostTabs` = the seven groups (Money per shape); every grouped view's
  ghost gets `title={<ProjectViewsGhost slug/>}`; `designs` → `DesignsGhost`; the site bar's ghost (`SiteBarGhost`) when the frame says so or this
  browser last saw it (`useRememberSiteBar`, key `om.shape.project.<id>.siteBar`). `ProjectShape` untouched (K-N's).
- `title` slots added to `updates-ghost.tsx` · `choices-ghost.tsx` · `floor-plan-ghost.tsx` (+ its plan chip) · `tickets/thread-ghosts.tsx` (Messages,
  Tickets) · `compliance-ghost.tsx` · `components/leads/detail/tab-ghosts.tsx` (`tabGhost(slug, first, title)`; the lead's own unchanged).

## Probes changed (each marked `(simplify S-xx, a deliberate change of this rule)`)

- `projects/verify-pj-gap-a.cjs` — Questionnaire = Client tab + checked chip; the Tasks badge = the All tasks chip's count, Compliance chip uncounted.
- `projects/verify-pj-r1.cjs` — Activity / Files reached through the Files & notes tab + chip; the phone sheet's first seven rows = the Create group,
  then Edit details.
- `projects/verify-pj-r3.cjs` — a Client tab (Updates its first view).
- `projects/verify-pj-r8.cjs` — the strip starts Overview · Tasks · Schedule · Client · Design; on Choices, Design is lit and Choices checked.
- `projects/verify-pj-gap-g.cjs` — the strip lists Design; the Floor plan chip carries "· 1"; the plan's name in the checked plan chip.
- `projects/verify-pj-gap-h.cjs` — Client on the strip; the view chips (read on Tickets) show Messages · 1, Tickets uncounted.
- `projects/verify-pj-gap-i.cjs` — the HDB flat line; Tasks lit / Compliance checked; no strip count, the grey note's number = the Execution chip's.

## Round 2 — K-N's asks of the frame (orchestrator, 2026-10-09; outcome-K-N.md › Needs from others 1)

All in `components/projects/project-frame.tsx`; tsc / eslint clean on it.
1. The info column's Project info rows carry the documents: `project.documents = projectInfoDocuments(d, { from: href(''), fileHref: (id) =>
   href('files/' + id) })` (`./overview/documents`) — the signed quote · contract · a direct project's other documents (`doc-quote` · `doc-contract` ·
   `doc-contract-file` · `doc-quote-file` · `doc-*-other`).
2. The ghost's shape is `{ ...overviewShapeOf(d), typeChip, customFields }` (`./overview/shape`) — Before work starts only while set up, Coming up,
   Money / Closing, one brief (the old `projectBriefs`/`briefFactsOf` imports are gone from the frame).
3. `runItem('setup')` scrolls to `[data-card="needs"]`.
4. Fix-B B-16: on the Schedule's Start card (`tab === 'schedule' && !d.schedule`, i.e. no milestones) the header's filled button is off whatever
   the top row's run.
5. `useProjectMaison(…, doors: { onSetup, onRunItem: runItem, onNeed: (r) => runAction(r.action) })` — a Needs you row with no address runs the
   frame's own flow.
6. The site bar's Done reads K-N's `ProjectDetail.schedule.running` (every milestone in progress, in the schedule's order).

## Needs from others

1. **K-N** — done (see Round 2). The Overview may also read `useProjectNeeds()` / `useProjectRun()` (the provider wraps it); its renders link →
   `/projects/<id>/designs`. `tabCounts` may keep or drop `compliance` (the strip ignores it).
2. **K-T** — the Schedule must open the Mark done sheet when `?done=<id>` arrives on the Schedule page itself (the site bar pressed while on
   Schedule pushes the same path with a new query — a `useSearchParams` change, not only the first mount). If the Start sheet replaces
   `StartProjectDialog`'s props, the frame's call (`project-frame.tsx`, `<StartProjectDialog …>`) must follow — tell me / the orchestrator.
   `readClientTell` uses `clientTellFacts` from `lib/projects/schedule-moments.ts`; keep its shape.
3. **K-C** — nothing more: Photos uses `stashSitePhotos` + `camera=1`; Message uses `?compose=1`.
4. **Orchestrator** — the money branch's imports in `app/projects/[id]/[tab]/page.tsx` (`ProjectProfit`, `ProjectCosts`) are K-M's in progress.

## Repair text

None — no records move.

## Not done / judgement calls

- The site bar hides during a hold (work paused) and for whoever may not change the project; Done never refuses silently.
- Compliance's grey note counts the phase's open items (the phase chip's own number), not only the mandatory ones the old strip badge counted —
  so the two numbers on screen agree. The note is hidden ≤767 (the phase chips say it there).
- Photos opens the camera (`capture`, images only, per the coordinator); videos and the library stay one press away in the composer's media well.
- Designs lists every layout of the project (shared or not, chipped) — the studio sees what is and isn't with the client; the portal's own
  section switch (Company › Client portal) is not reflected in the view.
