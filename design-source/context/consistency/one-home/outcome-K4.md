# Package K4 — the Won lead hands over to its project · outcome (2026-10-08)

Audit ids: **N-10** (the lead's carried tabs move to the project once it is live) and **N-04** (the 3-D Space Planner quick link).
Register rows staged in `reg-K4.md` (REG-K4.1 · REG-K4.2). No migration, no settings key, no repair block.
`npx tsc --noEmit -p .` — no errors in my files; `npx eslint` on every file below — clean; `npm run design:lint` — nothing new.

## N-10 — once Won, the rest is the project's

**The rule.** A lead with a live project (`projects.lead_id = lead`, `deleted_at IS NULL`) shows **Overview · Quotes · Contracts**. Tasks · Files ·
Notes & Logs · Questionnaire · Activity are the project's alone: their lead addresses redirect to the project's same tab with the whole query.
A lead whose project was deleted keeps all eight tabs (the strip and the routes read the same `deleted_at IS NULL` test). Direct projects keep
their older rule (REG-911, unchanged).

**Files changed**
- `lib/projects/tabs.ts` — additive `carriesLeadTab(slug)` (PROJECT_TABS' `lead` entries: tasks · files · notes · questionnaire · activity).
- `lib/leads/stage-policy.ts` (beside `DETAIL_TABS`) — `leadTabs(onProject)`: the strip a lead shows.
- `lib/leads/detail.ts` — `liveProjectOf(leadId)`: the lead's live project id or null.
- `app/leads/[id]/[tab]/page.tsx` — after the direct check (now read in parallel with `liveProjectOf`): a carried tab on a lead with a live project
  → `redirect(withQuery(projectTabHref(live, tab), sp))`. Quotes · Contracts render as before.
- `app/leads/[id]/files/[fileId]/page.tsx` — `direct ?? live` → `/projects/<pid>/files/<fileId>` with its query.
- `app/leads/[id]/overview.tsx` — `href(slug, query)` maps a carried tab onto the project (`projectTabHref`) with `from` = this lead page
  (`leadHref(tab)`, its own origin kept); `fileHref(id)` for the file viewer (FILES card tiles, the return details' files); the strip is
  `leadTabs(!!project)`; the reveal's ghost gets the strip's labels; `useRememberLeadStrip` stores the shape for the loaders.
  Everything that opens a carried tab goes through `href` / `fileHref`: MY TASKS View all (`goTab`), a task pressed outside the Overview and the
  task panel's *Open in Tasks* (`?open=`), QUESTIONNAIRE View all, LEAD STAGES' Last contact (Notes), FILES View all / folder (`?folder=`) /
  file, RECENT ACTIVITY View all, LEAD RETURNED's arrow (Activity), the Create links Task (`?new=1`), Note (`?new=note`), Contact Log
  (`?new=contact`). On the Overview a task still opens in the panel over the page (Dane's UAT 5.05, unchanged).
- `components/leads/detail/tab-ghost-for.tsx` — `useRememberLeadStrip` + `LeadTabBones` (the strip's bones: the labels when the reveal knows
  them, else the strip this browser saw last on that lead, key `om.shape.lead.<id>.project` — the project ghost's `om.shape.project.<id>.*` rule).
- `components/shell/detail-skeleton.tsx` — the strip's bones come from `LeadTabBones`; new optional `tabs` prop (labels). *(Not in my brief's
  list by name, but it is where the strip's ghost is drawn — `detail-tab-skeleton.tsx` and the Overview's loader both render it.)*
- `components/shell/detail-tab-skeleton.tsx`, `components/leads/detail/tab-ghosts.tsx`, `app/leads/[id]/(overview)/loading.tsx` — no change
  needed: they render `DetailSkeleton`, which now draws the remembered strip.

**Checked: the project's tabs show the lead-days records.** `app/projects/[id]/[tab]/page.tsx` loads the lead's own loaders by the lead id —
`fetchLeadTasks(leadId)`, `fetchLeadFiles(leadId)`, `fetchLeadNotes(leadId)`, `fetchLeadQuestions(leadId)`, `fetchLeadActivity(leadId,
{ projectId })` — and renders the lead's components with `base` = the project. None filters by date or project: the same rows.
`?open=` is honoured on the project's Tasks (`lead-tasks.tsx` `params.get('open')`) and Notes (`lead-notes.tsx`); `?folder=` on Files; `?new=1`
(Tasks) and `?new=note|contact` (Notes) via `useCreateIntent`'s landing `${base}/<tab>`. Questionnaire and Activity take no `?open=` (nor did
the lead's). The file viewer `app/projects/[id]/files/[fileId]` is the lead's `FileViewer` with the project's base.

**Verify in the browser** (scratch DB; Ryan D’Souza `5e8b9c29-54ef-4b56-96a4-2027804c4cd7` → P-2026-001 `e920e218-…`, Benjamin Han
`2b6d6bfc-…` → P-2026-002, Aisha Rahman `9c661403-…` → P-2026-003 are the non-direct Won leads with live projects)
1. `/leads/<Ryan>` at 1440 and 390: the strip reads Overview · Quotes · Contracts (390: the scrolling strip, three tabs). The reveal's ghost draws
   three bones; reload — the loader draws three too (the first visit in a fresh browser draws eight, then remembers).
2. Ryan's Overview: MY TASKS › View all → `/projects/e920…/tasks?from=%2Fleads%2F5e8b…`, Back reads "Back to Ryan D’Souza" and returns;
   a task row → the panel over the Overview; its Open in Tasks → the project's Tasks with the panel open. QUESTIONNAIRE View all → project
   Questionnaire; LEAD STAGES › Last contact → project Notes & Logs; FILES › View all / a folder / a file → project Files / the folder / the
   project's file viewer; RECENT ACTIVITY › View all → project Activity.
3. Create links (expanded strip ≥1200): Task → the project's Tasks with the add row open; Note → a note draft on the project's Notes; Contact
   Log → a contact-log draft; Quote and Contract stay on the lead (Quotes tab / contract editor).
4. Old addresses: `/leads/<Ryan>/tasks?open=<a task id>` → `/projects/<pid>/tasks?open=…` with the panel; `/leads/<Ryan>/files?folder=<id>`,
   `/leads/<Ryan>/notes?open=<note>`, `/leads/<Ryan>/questionnaire`, `/leads/<Ryan>/activity`, `/leads/<Ryan>/files/<fileId>` — each lands on
   the project's. `/leads/<Ryan>/quotes` and `/contracts` stay on the lead. A bell row or ⌘K result that still points at a lead tab lands the same way.
5. A lead with no project (Kevin Ng, Olivia Martinez): eight tabs, every link as before.
6. A deleted project gives the tabs back: in a scratch DB delete Aisha's P-2026-003 (Projects › ⋮ › Delete) → `/leads/<Aisha>` shows all eight
   tabs and `/leads/<Aisha>/tasks` renders on the lead (the header offers *Make the project again*). (Tan Wei Ling is a **direct** project's
   client — the older direct rule still sends her addresses to the project, which lands on `/projects?deleted=…`; unchanged.)
7. Roles: a member who may not see Ryan's lead gets not found on the lead and on the project, as before.

**Probe assertions changed**
- `design-source/verify/projects/verify-pj-fix-F.cjs:144` — read Benjamin's Activity at `/projects/${BEN_P}/activity` (was the lead's address;
  "(one-home N-10, a deliberate change of this rule)").
- Checked and left: `verify-kb-r1.cjs` (“2 opens the lead’s Tasks tab” — the second listing row is Cheryl Lim, Contacted), `verify-kb-r2.cjs`
  (Ryan's `/quotes` — stays), `verify-search.cjs` (its task regex accepts `/projects/…/tasks?open=`), `verify-pj-r1/r2/gap-a/gap-c/gap-d`
  (Marcus is direct; the others use non-Won leads), the ghost probes (Kevin Ng · Olivia Martinez). No probe counted the lead's tabs.

## N-04 — the 3-D Space Planner quick link

**Files changed**
- `components/leads/detail/quick-links.tsx` — the link is "3-D Space Planner" with the Tools tile's `space_dashboard` glyph (was "3D Space
  Planner", `deployed_code`).
- `app/leads/[id]/overview.tsx` — `onOther('3-D Space Planner')` → `openPlanner()`: a lead with a live project opens `ProjectLayoutsDialog`
  (the project ⋮'s *Plan the space in 3D…* — its layouts, *Start a new layout* with the project's floor plans; a layout opens with `from` = the
  lead page); otherwise `NewLayoutDialog` → `createLayout({ …pick, projectId: null })` → `/planner/<id>?from=<the lead page>` (the editor's Back
  reads "Back to the lead"). Both dialogs are the planner's own (read, not edited).

**Why the dialog, not the gallery, before Won.** The audit's recommendation was "a new layout for the lead", and the brief asks that Back
return to the lead: the gallery `/planner` has no Back (an L1 page) and a layout opened from it returns to the gallery. A new layout from the
lead's own *New layout* dialog returns to the lead. Swap to `router.push(withFrom('/planner', here))` if the owner prefers the gallery.

**Verify in the browser** (scratch DB — Start writes `space_layouts`)
1. Kevin Ng at 1440, Create strip collapsed: the glyph is the Tools tile's; tooltip "3-D Space Planner". Press → *New layout*
   ("Start from a Singapore flat, or a blank page"); Cancel stays on the lead; Start → the planner editor, Back "Back to the lead" → Kevin's page.
2. Benjamin Han: press → *Plan the space in 3D* listing "SkyOasis — proposed layout"; the row opens it, Back → Benjamin's lead page.
3. Expanded strip: the tile's label "3-D Space Planner" wraps in the 92px tile like its neighbours.
4. 390: the Create strip is hidden on a phone (unchanged) — no way in from the lead there (as before).

**Probe assertions changed:** none referenced the label or the glyph.

## Needs from others
1. **`components/leads/tasks/use-create-intent.ts`** (no package listed) — a `?new=` landing replaces the address with the bare `${base}/<tab>`,
   dropping `from`: after Task / Note / Contact Log from a Won lead, the project's Back falls back to its default instead of the lead. It already
   does this on the lead's own tabs. Fix: delete only `new` from the query.
2. Links built for a lead tab elsewhere land through the redirect (one hop; the lead's tab ghost shows under the short strip for a moment):
   the listing's task popover (`app/leads/workspace.tsx:745`), the Quotes tab's "Due date set · View" (`components/leads/quotes/lead-quotes.tsx:169`),
   bell rows (`lib/notifications/*`), ⌘K (package K3). Mapping them with `projectTabHref` where the row knows its project saves the hop.
3. `lib/leads/activity.ts:92-94` — the comment says Notes / Questionnaire "still open the lead's"; the code already maps them onto the project
   (`projectTabHref` reads `PROJECT_TABS`). Comment only.

## For Vicky (left as is)
- A layout started from a lead before Won is a personal one (R88: no project, no lead): after Won the link shows the project's layouts, which do
  not include it — it is in the planner's gallery under Personal. Carrying it into the project would need a rule (not built).
- The project's dialog says "Plan the space in 3D" (and the project ⋮ "Plan the space in 3D…") — a verb phrase, not the tool's name; not changed.
- A first visit to a Won lead in a fresh browser: the loader draws the full strip once (it can only remember); the reveal and every later load
  draw the short one — the project ghost's own rule.
- The carried tabs' redirect runs inside the `[tab]` route's loader (a streamed client redirect on a hard load, not a 307 — the direct-project rule's
  existing behaviour). A real 307 would need the carried tabs carved into their own segments without a loader, or a proxy rule.

## Repair text
None — no demo record moves.
