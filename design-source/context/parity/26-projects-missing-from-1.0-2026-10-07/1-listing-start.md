# What 2.0's Projects is missing from 1.0 — the listing and how a project starts

Reviewer 1 of 7, 2026-10-07. Read only. **1.0** = `qanvast-id-tool` @ `620190192` (`integ/security-non-qanvast`). **2.0** = the
`openmaison-prototype` working tree, with its uncommitted changes. Inventory rows: `projects-1.0-inventory/A-listing.md` (A-01…A-223) and
`B-how-a-project-starts.md` (B-01…B-345), 568 rows. Every row is in exactly one line below. 2.0 paths are relative to the prototype repo.
Nothing was run. Each status comes from reading the code.

## Bottom line

2.0 has nearly everything a studio could actually use on 1.0's listing and in its creation flow, and most of it works better. The view
stays in the address. The tiles and the Needs-attention reasons replace a health score that could barely move. Who sees a project is
checked on the server. Won creates the project in the same press. New project, Getting started, Start the project, project numbers and the
draft invoices all work. A long list of 1.0 pieces was set aside by accepted calls: the health score (Q-07), the status pill (Q-03),
Archive (Q-25), the Draft gates and the set-up wizard (Q-02), the studio's own project types (leads Q-34) and the workflow switches
(leads Q-26). Others are held for later: the workload view (Q-08), commission at creation (Q-21), compliance tasks (Q-31), AI-written
timelines (Q-12) and the Dashboard widget. The real gaps are around **direct projects** (projects with no lead) and **the first schedule**:
- A direct client's name, phone, email and address can't be corrected once the project exists.
- A direct project can't have a split of its own, and has nowhere at all to keep notes.
- A schedule can only start from the signed quote, a template the studio made itself, or blank. There are no built-in property-type
  templates, no way to pick another quote or an uploaded one, and no restart once milestones exist.

Smaller gaps: rooms in scope, floor area and style, a project-type column and a sort by designer, the team picker's specialty and load,
and a page for when loading fails. Clone, project templates, the `/projects/new` page and the "Add quote" scan page were never reachable
in 1.0, so studios lose nothing there. One side effect of Q-03 the owner may not have weighed: a 2.0 project cannot be marked **on hold**
or **cancelled** at all.

## Features

| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |
|---|---|---|---|---|---|---|
| Correct a direct client's details after New project | B-64 | Partly | New project asks for the client's name, phone and email. Once the project exists, a **direct** project's client name, phone, email, property type, address and district can't be changed anywhere. The project page has no edit for them, and the lead page that holds the edit form redirects to the project. A wrong phone number then blocks the client's portal sign-in and every WhatsApp the studio sends. 1.0 edited these on the project (C-270…C-274 in the C reader's file) and took overseas numbers with a dial code; 2.0 takes 8-digit Singapore numbers only (REG-547). A Won project's details stay editable on its lead. | High | S | `components/projects/new-project-dialog.tsx`; `app/projects/actions.ts` `createDirectProject`; `app/leads/[id]/(overview)/page.tsx:24-26` (redirect); `components/projects/project-overview.tsx:205-221` and `project-menu.tsx` (no edit) |
| A split of the project's own | B-74, B-75, B-91, B-119, B-126, B-167 | Partly | In 1.0, whoever created a project could type its stages (name, %, trigger) and add or remove stages, starting from 10/30/30/30. In 2.0, New project only picks a Payments template. A one-off split means making a template first, and nothing changes a project's split after it is created. The Money tab's help says "Set the contract value on the Overview and pick a split", but no such control exists. Invoices can only be re-sized one at a time, each with a reason. A Won project's split comes from its signed quote (Built). | Medium | S | `new-project-dialog.tsx` (Payment split select); `lib/projects/create.ts` `insertProject` writes `paymentTemplate` once, and no action changes it; `components/projects/money/project-money.tsx:387` |
| Notes on a project | B-84 | Partly | 1.0's create form had Notes, and the project page showed them. 2.0 has no Notes on New project and no Notes tab on a project. A Won project's notes live on its lead's Notes tab, one step away through *Open the lead's record*. A **direct** project has nowhere to write a note at all, because its lead tabs redirect to the project. Map 24 §8 D-13 (where 1.0's notes go) still waits on Vicky. | Medium | S | `lib/projects/tabs.ts` (Overview · Schedule · Updates · Money · Choices · Tasks · Files · Activity); `app/leads/[id]/[tab]/page.tsx` redirect |
| Ready-made schedule templates, and a default for each kind of job | B-251, B-255, B-256, B-258, B-263, B-279, B-281, B-322, B-323 | Partly | 2.0 starts a schedule from the signed quote's stages, from a template the studio made, or from nothing, and Settings › Projects sets one studio-wide default. 1.0 also had: built-in templates every studio got (HDB BTO, HDB Resale, Condo, Landed, Commercial fit-out, and "{project type} — Standard"); a template preselected from the project's property type; and a default template per project type (Accounts' project-type milestone templates). In 2.0, a new studio with a direct project and no signed quote can only start blank. The 2.0 templates in `local.db` are demo data (R69), not built-ins. 1.0's other-country sets don't apply, since 2.0 is Singapore only. | Medium | S | `components/projects/schedule/start-schedule.tsx:32-34, 72-78`; `lib/projects/schedule-phases.ts`; `components/projects/ending/schedule-defaults-setting.tsx` |
| Build the schedule from any quote, or from an uploaded contractor quote | B-253, B-254, B-260, B-261, B-268, B-288, B-290 | Partly | 2.0 reads the signed quote and nothing else. 1.0 let the studio pick the project's quote or the lead's, showed each quote's status and line count, and could take an uploaded PDF, image or spreadsheet quote right there to build the milestones. In 2.0, a direct project quoted outside OpenMaison, or a Won lead whose signed quote was uploaded rather than made in the app, gets "No signed quote yet". | Medium | M | `start-schedule.tsx:72-73` (`s.quote` is the signed quote); Upload a quote is in Create Quote only (`lib/quotes/upload.ts`) |
| Start a schedule over from a template or the quote | B-245, B-257, B-265, B-266, B-289 | Partly | Once a schedule has milestones, 2.0 has no *Reset to a template* and no *Generate again*. The start card comes back only after every milestone is removed. (1.0's regenerate replaced every milestone behind a browser confirm, with no undo.) | Low | S | `components/projects/schedule/project-schedule.tsx:231-237` |
| Rooms in the scope of work | B-67, B-131, B-326 | Missing | 1.0's twelve room chips (Living Room, Kitchen, Master Bedroom…) were saved as the project's scope. A 2.0 project keeps no scope (map 24 §3.1: "`scope` … has no home"). A Won lead's questionnaire and quote sections cover some of this; a direct project has neither. | Low | S | `lib/db/schema.ts` `projects` (no scope column) |
| Floor area and style on a project | B-65, B-130, B-154 | Partly | New project asks for property type, district and address, but not floor area (sqft) or style. A Won project keeps both on its lead page; the project's *Client and property* card shows neither. (1.0 pasted them into Notes as text.) | Low | S | `new-project-dialog.tsx`; `project-overview.tsx:205-221` (`leads.area_sqft` and `leads.style` aren't read) |
| Project type and designer on the listing | A-39, A-49 | Partly | 1.0's table had a sortable Type column and could sort by designer. 2.0 can filter by project type and by team member, but it has no type column, no sort by team, and the export leaves out project type and property type. | Low | S | `components/projects/project-columns.tsx` (no type column; Team has no `sort`); `projects-workspace.tsx` `exportFile` |
| Team picker that shows each designer's specialty and workload | B-70, B-90, B-124, B-169 | Partly | New project's team field lists names only. 1.0 showed "{specialty} · {n} active" so the studio could pick someone with room. The lead's Assign popover suggests a member (REG-612); New project's field does not. A Designer's own project still assigns itself, as in 1.0. | Low | S | `components/leads/assignee-field.tsx`; `new-project-dialog.tsx:112-113` |
| A page that says loading failed | A-68, A-69, A-140 | Missing | 2.0 has no `error.tsx` anywhere. A failed load or a crash shows Next's bare error page, with no *Try again*. 1.0 had a "Something went wrong · Try Again" boundary, though a failed list read as an empty studio. This affects every module, not just Projects. | Low | S | `find app -name error.tsx` → none |
| A contract step when setting up a direct project | B-220 | Partly | 1.0's set-up card included a "Contract uploaded" check. 2.0's Getting started has no contract item, and Key documents just shows "Contract --". This only touches direct projects, because the Won step requires a contract. | Low | S | `lib/projects/getting-started.ts` `GETTING_STARTED` |
| Rename, with a check for duplicate names | B-187, B-209 | Partly | 2.0 renames at any stage (1.0 only while Draft), but it doesn't refuse a name another project already uses (1.0: "A project with this name already exists."). | Low | S | `app/projects/actions.ts` `renameProject` |
| First-visit tip on Projects | A-204, A-206, A-207 | Partly | 2.0's first-run card says "A project begins when a lead is won…". Once a studio has projects, no tip appears. (1.0's tip named stages that no longer exist.) | Low | S | `components/projects/projects-workspace.tsx` (`EmptyState`) |
| Health score, Avg. Health, At Risk | A-26, A-27, A-94…A-98, A-123…A-125, A-223 | Left out on purpose | Q-07: "No health score; the reasons ('2 milestones overdue', … 'Payment overdue')". Needs attention replaces it. | — | — | `lib/projects/attention.ts` |
| Status pill (Planning, In Progress, On Hold, Completed, Cancelled) | A-42, A-83, A-84, A-85, A-86, A-128, B-184 | Left out on purpose | Q-03: stages "Setting up · In progress · Completed … no second status". This also means a project can't be marked on hold or cancelled (see Top gaps). | — | — | `lib/projects/model.ts` `PROJECT_STAGES` |
| Workload view (projects per designer against capacity) | A-21, A-134, A-145…A-174, A-222 | Left out on purpose (later) | Q-08: "Workload view later, with Insights". | — | — | — |
| Archive and the Archived list | A-31, A-54, A-175…A-195 | Left out on purpose | Q-25: "No Archive; the listing hides Completed until asked". Q-26's Deleted Projects sheet takes its place. | — | — | `components/projects/deleted-projects-sheet.tsx` |
| "Commission Pending" badge on set-up rows | A-44, A-129, A-130, B-185, B-239 | Left out on purpose | Commission is held (Q-21), and there are no gates (Q-02). | — | — | — |
| Commission at creation (studio default, custom rate, per-milestone, request, per-designer split) | B-20, B-71, B-76…B-82, B-89, B-92, B-93, B-105, B-118, B-127, B-128, B-133, B-134, B-155, B-156 | Left out on purpose (later) | Q-21: "Commission held for money out". | — | — | — |
| Draft gates, the set-up wizard, and billing blocked while Draft | B-189, B-194…B-200, B-202…B-208, B-211, B-212, B-213, B-217, B-218, B-231, B-233…B-237, B-240…B-243 | Left out on purpose | Q-02: "a *Getting started* card names what is missing, each with its own button". Map 24: "There are no gates." | — | — | `lib/projects/getting-started.ts` |
| Compliance tasks created from the property type | B-135, B-166 | Left out on purpose (later) | Q-31: "Meeting Summary and compliance held". | — | — | — |
| AI-written work phases from the quote | B-249, B-273 | Left out on purpose (later) | Q-12: "AI-written timelines held". The signed quote's stages are worked out by rule instead. | — | — | `lib/projects/schedule-phases.ts` |
| Schedule of payments only, and payment % or colour stored in templates | B-250, B-262, B-277, B-280, B-286 | Left out on purpose | Q-13: "The quote's Payment Schedule is the source of the shares; a payment stage is tied to a milestone". Map 24 §3.3 and §2: payment markers dropped; "Payment % and colour are dropped". | — | — | — |
| The studio's own list of project types | B-321 | Left out on purpose | Leads Q-34: project type stays the Won step's three (Whole-home · Partial · Commercial fit-out). | — | — | `lib/projects/model.ts` `PROJECT_TYPES` |
| Studio switches for what a lead needs before it can be Won | B-27 | Left out on purpose | Leads Q-26: "No — the Won step is the mock". | — | — | `lib/leads/stage-data.ts:139-150` |
| Dashboard's Projects widget | A-205 | Left out on purpose (later) | The Dashboard (L7) is held and not built. Map 24 §1: "Not built (Dashboard L7)". | — | — | — |
| Ways in: rail, phone dock, G P, the ? panel, back links | A-01, A-02, A-196, A-197, A-199, A-200, A-203 | Built | — | — | — | `components/shell/mobile-nav.tsx:31`; `lib/keys/registry.ts:46, 124` |
| Rail and dock count | A-198, A-208 | Built | The count is now projects needing attention, not three status words, and it lands on that scope. | — | — | `mobile-nav.tsx:134-142`; `lib/projects/queries.ts` `countProjectsNeedingAttention` |
| Studio search finds projects | A-59, A-201, A-202 | Built | Search runs on the server, by Who sees leads; "/" focuses the page's own search. | — | — | `lib/global-search/model.ts:32`; `lib/global-search/queries.ts` |
| Page header and project count | A-19, A-20, A-119 | Built | The scope pill carries the count. | — | — | `components/projects/projects-toolbar.tsx` |
| The view stays in the address | A-03, A-51, A-118 | Built | — | — | — | `projects-workspace.tsx` (URL sync) |
| Listing tiles and the contract-value total | A-23, A-24, A-25, A-91, A-92, A-93, A-99, A-103, A-121, A-122, A-126, A-136, A-139 | Built | Per Q-06: In progress · Needs attention · Waiting on client · Completing this month, plus Contract value for Owners and Admins (F-02). | — | — | `projects-workspace.tsx`; `lib/projects/queries.ts` `fetchProjectRows` |
| Stage scopes and search | A-28, A-29, A-30, A-32, A-52, A-53, A-102, A-120 | Built | Scope pill (Open · Setting up · In progress · Completed · All, plus to-do scopes). Search covers name, number, client, property, team and phone. | — | — | `components/projects/scopes.ts`; `projects-toolbar.tsx` |
| The row's name and property line | A-33, A-34, A-131, A-144 | Built | — | — | — | `components/projects/projects-table.tsx` `subLine` |
| Sort by column | A-48, A-50 | Built | — | — | — | `project-columns.tsx` |
| Progress | A-40, A-104, A-127, A-214 | Built | Worked out from the schedule, not a stored number. | — | — | `components/projects/schedule/schedule-cells.tsx` `ProgressCell` |
| Team column | A-41, A-141 | Built | — | — | — | `project-columns.tsx` `TeamCell` |
| Open a row, row menu, select several, keyboard rows | A-43, A-46, A-47, A-61, A-135 | Built | — | — | — | `projects-table.tsx`; `BulkBar` in `projects-workspace.tsx` |
| Who sees projects | A-04, A-100, A-101, A-137 | Built | Checked on the server through the lead's Who sees leads rule (Q-23). | — | — | `lib/projects/queries.ts` (`visibleLeadIds`) |
| Loading ghost | A-62, A-63, A-64, A-133 | Built | — | — | — | `app/projects/(list)/loading.tsx`; `components/projects/projects-ghost.tsx` |
| Empty states | A-65, A-66, A-67, A-132, B-173 | Built | The first-run card offers New project and Open Leads. A search with no results offers Clear All. | — | — | `projects-workspace.tsx` |
| Phone and tablet listing | A-112…A-117 | Built | — | — | — | `components/projects/project-cards.tsx` |
| Stage words; handover only while the project runs | A-81, A-82, A-89, B-129, B-183, B-214 | Built | Q-03. | — | — | `lib/projects/model.ts`; `project-menu.tsx` |
| Setting up → In progress in one press | A-87, A-88, B-144, B-223…B-227 | Built | *Start the project* replaces 1.0's four promotion paths (REG-917). | — | — | `app/projects/actions.ts` `startProject`; `lib/projects/next-step.ts` |
| Getting started (what a new project still needs) | A-90, B-186, B-188, B-190, B-191, B-193, B-215, B-216, B-219, B-221, B-222, B-232 | Built | Q-02 (no contract item, see above). | — | — | `lib/projects/getting-started.ts` |
| Winning a lead creates the project | B-01, B-08…B-12, B-14…B-18, B-21, B-23, B-24, B-26, B-30, B-31, B-33, B-48…B-52, B-63, B-121 | Built | Q-02. The Won step asks for the same four things as 1.0's readiness list (signed quote · contract · 100% split · project type). | — | — | `lib/projects/create.ts` `ensureProjectForLead`; `lib/leads/stage-data.ts:139-150` |
| Told to win the lead after the client signs online | B-06, B-47 | Built | The bell's "A contract is signed", and *Move to Won* on the signed contract. | — | — | `components/contracts/editor/contract-banner.tsx:43`; `lib/notifications/model.ts:43` |
| One project per lead, and links both ways | B-34, B-35 | Built | — | — | — | `lib/db/schema.ts` `projects_lead_uq`; the lead's Open project; `project-menu.tsx` |
| The project shares the lead's files, questionnaire, quotes, portal access and phone | B-36…B-40, B-43, B-44, B-153, B-315 | Built | One record, two chapters (Q-01). | — | — | `lib/projects/queries.ts`; `components/leads/files` (given a `base` path) |
| A contract on file for the project | B-316, B-317, B-318 | Built | The Won step's upload becomes a contract record; Key documents opens it. | — | — | `lib/contracts/won.ts` `recordWonUpload`; `project-overview.tsx` Key documents |
| New project for a client with no lead | A-22, A-57, A-58, A-105, A-138, B-02, B-53, B-54, B-100, B-101, B-138, B-139, B-146, B-147, B-171, B-172, B-182 | Built | Q-04. A `direct` lead row is kept out of the Leads pipeline; "Project P-… created · View"; the team gets a bell. | — | — | `new-project-dialog.tsx`; `app/projects/actions.ts` `createDirectProject` |
| New project's checks, errors and save | B-85, B-86, B-87, B-95…B-99, B-102, B-103, B-104, B-107, B-108, B-117, B-120, B-125, B-157, B-158, B-163, B-164 | Built | House form: errors after the first press; asks before creating a duplicate client. | — | — | `new-project-dialog.tsx` |
| Project name, type and number | B-66, B-122, B-324, B-325, B-327, B-328 | Built | Q-05: "{property type} — {client}"; numbers like `P-{YYYY}-{seq}` from Settings › Projects. | — | — | `lib/projects/model.ts`; `app/settings/projects-settings.tsx` |
| Contract value at creation | B-68, B-69, B-123, B-159 | Built | From the signed quote, else the agreed value (F-02). | — | — | `lib/projects/queries.ts` `valueOf` |
| Start and target end dates | B-72 | Built | Set from Getting started and *Start the project*. | — | — | `components/projects/project-dialogs.tsx` |
| Payment schedule from the signed quote | B-32, B-73, B-228, B-276 | Built | F-03. | — | — | `lib/projects/money.ts` |
| Documents at creation (floor plan, signed contract) | B-83, B-94, B-151, B-152 | Built | 1.0's boxes kept only a file name. 2.0 uploads for real in Files, and the Won step uploads the contract. | — | — | `components/leads/files`; `lib/contracts/won.ts` |
| Draft invoices made with the project | B-106, B-136, B-160, B-161, B-162 | Built | F-04. | — | — | `lib/projects/invoices.ts` `draftInvoicesFor` |
| Setting up the first schedule | B-137, B-244, B-246, B-247, B-248, B-252, B-259, B-264, B-267, B-269, B-270, B-274, B-275, B-278, B-282, B-284, B-285, B-287 | Built | Start from the signed quote's stages (payments tied on), a template, or blank; dated from *Works start on*; Save as template; works on a phone too. | — | — | `start-schedule.tsx`; `app/projects/schedule-actions.ts` `saveScheduleAsTemplate` |
| Listing layout and styling | A-07…A-18, A-35…A-38, A-45, A-55, A-56, A-60, A-70, A-142 | Not a product feature | 1.0's own layout, sizes, sections and focus rings. 2.0 uses its design system. | — | — | — |
| Listing motion | A-71…A-80 | Not a product feature | 1.0's motion. | — | — | — |
| Listing plumbing | A-05, A-06, A-106…A-111 | Not a product feature | Platform page switch, assistant page context, routes, cache. | — | — | — |
| Listing dead code | A-143, A-209…A-213, A-215 | Not a product feature | Unused cards, indicator, quick-action menu, legacy sidebar, finance aggregates. | — | — | — |
| Listing docs that disagree with the code | A-216…A-221 | Not a product feature | — | — | — | — |
| Creation layout and styling | B-13, B-19, B-22, B-25, B-46, B-55…B-62, B-88, B-149, B-150 | Not a product feature | Drawer shell, Full View, stacking, phone layout. | — | — | — |
| Creation motion | B-28, B-29, B-109…B-116, B-271, B-272 | Not a product feature | — | — | — | — |
| Creation internals and data | B-07, B-41, B-42, B-45, B-132, B-140…B-143, B-145, B-148, B-165, B-168, B-170, B-210, B-229, B-230, B-283, B-291, B-319, B-320, B-329, B-330 | Not a product feature | Insert columns, write order, retired routes, sequence gaps, stale comments. | — | — | — |
| Unreachable in 1.0 (Clone, `/projects/new`, the mock "Digitize Quote" page, `project_templates`, the unused indicator) | B-03, B-04, B-174…B-181, B-192, B-201, B-238, B-292…B-302, B-310…B-314, B-331…B-334 | Not a product feature | Nothing opened these in 1.0, so studios lose nothing. Clone and project templates are also not in 2.0 (map 24 §10). | — | — | — |
| The 1.0 assistant's `create_project` tool | B-05, B-303…B-309 | Not a product feature | Probably failed on insert in 1.0 (B-307, inferred). 2.0's Maison AI is scripted everywhere. | — | — | — |
| Creation docs that disagree with the code | B-335…B-345 | Not a product feature | — | — | — | — |

**Counts by line:** Missing 2 · Partly 12 · Left out on purpose 13 (5 of them "later") · Built 33 · Not a product feature 11 groups.

## Top gaps

1. **A direct client's details can't be corrected** after New project: no edit on the project, and the lead page redirects. A wrong phone
   locks the client out of the portal and misdirects every WhatsApp (High).
2. **A direct project can't have a split of its own**, set at creation or changed later, and Money's help points at a "pick a split"
   control that doesn't exist (Medium).
3. **A direct project has nowhere to keep notes.** A Won project's notes are one step away on its lead (Medium).
4. **No built-in schedule templates, and no default by property or project type.** A new studio's direct project with no signed quote can
   only start blank (Medium).
5. **A schedule can't be built from a quote other than the signed one**, or from an uploaded contractor quote. This hurts direct projects
   quoted outside the app (Medium).
6. **No way to mark a project on hold or cancelled.** This is Q-03's side effect, not a missing build, but a studio will reach for it the
   first time a client pauses or walks away. Today only Delete (when no money is recorded) or Complete anyway exist (worth the owner's
   look).
7. **No restart for a schedule** from a template or the quote once milestones exist (Low).
8. **No page for a failed load**, in any module (Low, but cheap).
9. **Rooms in scope, floor area and style are absent** from a project, and New project doesn't ask for them (Low).
10. **No project-type column and no sort by designer** on the listing, and no project type in the export (Low).

## Things the inventory missed

- In 1.0, nothing material for this area. I re-read the listing's logic block (`src/app/(main)/projects/page.tsx:115-245`), every writer of
  a project (`grep "ProjectCreateDrawer|New Project"`: only the listing and the lead drawer; the "New Project" in
  `src/components/id-profile/profile-editor.tsx:108` is a designer-portfolio entry, not a studio project), the project API folders
  (`src/app/api/projects/records/*`, `src/app/api/project-aggregates/*`, which serve the detail page) and the drawer's region and currency
  handling. They match rows A-01…A-223 and B-01…B-345.
- Two 2.0 facts no 1.0 row could record, found while checking these rows:
  - The Money tab's help line ("…and pick a split", `components/projects/money/project-money.tsx:387`) names a control that doesn't
    exist.
  - `createDirectProject` writes the direct lead in a transaction and the project after it (`app/projects/actions.ts`). If the project
    insert fails, a hidden `direct` lead is left behind with no project, the same shape as 1.0's B-168.

## Uncertain

- **The assistant's `create_project` (B-303…B-309).** I classed it as not a product feature because the 1.0 reader inferred that its
  insert fails (no `project_seq_id`). If it does work in production, 2.0 has no equivalent, since Maison AI acts on nothing.
- **Clone.** It is listed as a 1.0 feature in 1.0's own rules doc and PRD, but nothing ever opened it. I classed it as not a product
  feature. If the owner wants it, it would be a new build, not a port.
- **On hold / Cancelled.** Q-03 dropped the second status, but its wording ("no second status") does not discuss pausing or cancelling a
  job. I counted it as left out on purpose and raised it in Top gaps rather than calling it Missing.
- **The error page.** I didn't run a production build to see exactly what Next 16 shows when there is no `error.tsx`. That there is no
  *Try again* comes from reading the code only.
- **Ratings.** Impact and Size are my estimates. "Correct a direct client's details" could be Medium if studios rarely mistype, but the
  portal's phone sign-in raises the cost of a typo.
